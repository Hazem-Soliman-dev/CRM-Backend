import { createClient, Client } from "@libsql/client";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

dotenv.config();

// Determine if we should use Turso (for Vercel/production) or local SQLite
const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;
const isVercel = process.env.VERCEL === "1";

// For Vercel without Turso configured, we'll use Turso
// For local development without Turso, we'll use better-sqlite3
let tursoClient: Client | null = null;
let sqliteDb: Database.Database | null = null;
let schemaInitialized = false;

// Initialize Turso client
const initializeTursoClient = (): Client => {
  if (tursoClient) return tursoClient;
  
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required for production");
  }
  
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  console.log("✅ Turso database client initialized");
  return tursoClient;
};

// Initialize local SQLite
const initializeSQLite = (): Database.Database => {
  if (sqliteDb) return sqliteDb;
  
  const dbPath = path.join(process.cwd(), "database.db");
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("foreign_keys = ON");
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("synchronous = NORMAL");
  
  console.log("✅ SQLite database initialized (local development)");
  console.log(`   Path: ${dbPath}`);
  
  return sqliteDb;
};

// Generic database interface
interface DatabaseInterface {
  execute(sql: string, params?: any[]): Promise<any>;
  query(sql: string, params?: any[]): Promise<any[]>;
  queryOne(sql: string, params?: any[]): Promise<any | null>;
}

// Create database wrapper
const createDatabaseWrapper = (): DatabaseInterface => {
  if (useTurso || isVercel) {
    // Use Turso for production/Vercel
    const client = initializeTursoClient();
    
    return {
      async execute(sql: string, params: any[] = []) {
        const result = await client.execute({ sql, args: params });
        return result;
      },
      async query(sql: string, params: any[] = []) {
        const result = await client.execute({ sql, args: params });
        return result.rows as any[];
      },
      async queryOne(sql: string, params: any[] = []) {
        const result = await client.execute({ sql, args: params });
        return result.rows[0] || null;
      },
    };
  } else {
    // Use local SQLite for development
    const db = initializeSQLite();
    
    return {
      async execute(sql: string, params: any[] = []) {
        const stmt = db.prepare(sql);
        return stmt.run(...params);
      },
      async query(sql: string, params: any[] = []) {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      },
      async queryOne(sql: string, params: any[] = []) {
        const stmt = db.prepare(sql);
        return stmt.get(...params) || null;
      },
    };
  }
};

let dbWrapper: DatabaseInterface | null = null;

// Get database wrapper
export const getDatabase = (): any => {
  if (useTurso || isVercel) {
    return initializeTursoClient();
  } else {
    return initializeSQLite();
  }
};

// Export database wrapper for queries
export const getDatabaseWrapper = (): DatabaseInterface => {
  if (!dbWrapper) {
    dbWrapper = createDatabaseWrapper();
  }
  return dbWrapper;
};

// Check if a table exists
const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const wrapper = getDatabaseWrapper();
    const result = await wrapper.queryOne(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return !!result;
  } catch {
    return false;
  }
};

// Initialize database schema
export const initializeSchema = async (): Promise<void> => {
  if (schemaInitialized) {
    return;
  }

  try {
    console.log("📋 Checking database schema...");
    
    // Check if users table exists
    if (await tableExists("users")) {
      schemaInitialized = true;
      console.log("ℹ️  Database schema already exists");
      
      // Check and ensure admin user exists
      const wrapper = getDatabaseWrapper();
      const adminExists = await wrapper.queryOne(
        "SELECT COUNT(*) as count FROM users WHERE email = ?",
        ["admin@example.com"]
      );
      
      if (!adminExists || adminExists.count === 0) {
        console.log("👤 Creating default admin user...");
        const hashedPassword = await bcrypt.hash("password", 10);
        await wrapper.execute(
          `INSERT INTO users (email, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)`,
          ["admin@example.com", hashedPassword, "System Administrator", "admin", "active"]
        );
        console.log("✅ Default admin user created");
      }
      
      return;
    }

    console.log("📋 Initializing database schema...");

    // Read schema file
    const possiblePaths = [
      path.join(__dirname, "..", "..", "sqlite_schema.sql"),
      path.join(process.cwd(), "sqlite_schema.sql"),
      path.join(process.cwd(), "backend", "sqlite_schema.sql"),
    ];

    let schemaPath = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        schemaPath = possiblePath;
        console.log(`📄 Found schema file at: ${schemaPath}`);
        break;
      }
    }

    if (!schemaPath) {
      throw new Error(`Schema file not found. Tried: ${possiblePaths.join(", ")}`);
    }

    const schema = fs.readFileSync(schemaPath, "utf-8");
    
    // Execute schema
    if (useTurso || isVercel) {
      // For Turso, execute schema in batches
      const client = initializeTursoClient();
      const statements = schema
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await client.execute(statement);
        } catch (error: any) {
          // Log but continue (some statements might fail if already exist)
          console.warn(`Schema statement warning: ${error.message}`);
        }
      }
    } else {
      // For local SQLite, use exec
      const db = getDatabase() as Database.Database;
      db.exec(schema);
    }
    
    console.log("✅ Database schema created successfully");

    // Create default admin user
    console.log("👤 Creating default admin user...");
    const hashedPassword = await bcrypt.hash("password", 10);
    const wrapper = getDatabaseWrapper();
    
    await wrapper.execute(
      `INSERT INTO users (email, password, full_name, role, status) VALUES (?, ?, ?, ?, ?)`,
      ["admin@example.com", hashedPassword, "System Administrator", "admin", "active"]
    );

    console.log("✅ Default admin user created");
    console.log("   Email: admin@example.com");
    console.log("   Password: password");

    schemaInitialized = true;
  } catch (error: any) {
    console.error("❌ Failed to initialize database schema:", error.message);
    throw error;
  }
};

// Initialize database
export const initializeDatabase = (): any => {
  return getDatabase();
};

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const wrapper = getDatabaseWrapper();
    await wrapper.queryOne("SELECT 1 as test");
    console.log("✅ Database connection successful");
    return true;
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

// Health check
export const healthCheck = async (): Promise<{
  healthy: boolean;
  message: string;
}> => {
  try {
    const wrapper = getDatabaseWrapper();
    await wrapper.queryOne("SELECT 1 as test");
    return { healthy: true, message: "Database connection is healthy" };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Database connection failed: ${error.message || "Unknown error"}`,
    };
  }
};

// Close database (for cleanup)
export const closeDatabase = (): void => {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  // Turso client doesn't need explicit closing
};

// Seed data (import from existing seed function)
export { seedData } from "./database";

// Export default
export default getDatabase;

