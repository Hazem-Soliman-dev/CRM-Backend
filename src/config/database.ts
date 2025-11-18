import Database from "better-sqlite3";
import { createClient, Client } from "@libsql/client";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

dotenv.config();

// Determine if we should use Turso (for Vercel) or local SQLite
// Only use Turso when actually on Vercel, not just when env vars are set
// This ensures local dev always uses SQLite
const isVercel = process.env.VERCEL === "1";
const useTurso =
  isVercel &&
  !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

// Database instances
let db: Database.Database | null = null;
let tursoClient: Client | null = null;
let schemaInitialized = false;

// Check if a table exists
const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    if (useTurso && tursoClient) {
      const result = await tursoClient.execute({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        args: [tableName],
      });
      return result.rows.length > 0;
    } else if (db) {
      const result = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName) as any;
      return !!result;
    }
    return false;
  } catch {
    return false;
  }
};

// Initialize database schema and seed data (async because of bcrypt)
export const initializeSchema = async (): Promise<void> => {
  if (schemaInitialized) {
    return;
  }

  try {
    // Ensure database is initialized before proceeding
    initializeDatabase();
    const database = getDatabase();

    if (!database) {
      throw new Error("Database not initialized");
    }

    // Check if users table exists (indicates schema is initialized)
    if (await tableExists("users")) {
      schemaInitialized = true;
      console.log("ℹ️  Database schema already exists");

      // Check and create new tables if they don't exist (migration)
      if (!(await tableExists("reservation_notes"))) {
        console.log("🛠  Creating reservation_notes table...");
        database
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS reservation_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reservation_id INTEGER NOT NULL,
            note TEXT NOT NULL,
            note_type TEXT CHECK(note_type IN ('internal', 'interdepartmental', 'supplier_update')) DEFAULT 'internal',
            target_department TEXT,
            created_by INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
          )
        `
          )
          .run();
        console.log("✅ reservation_notes table created");
      }

      if (!(await tableExists("reservation_documents"))) {
        console.log("🛠  Creating reservation_documents table...");
        database
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS reservation_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reservation_id INTEGER NOT NULL,
            document_name TEXT NOT NULL,
            document_type TEXT NOT NULL,
            file_data TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT NOT NULL,
            description TEXT,
            uploaded_by INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
          )
        `
          )
          .run();
        console.log("✅ reservation_documents table created");
      }

      if (!(await tableExists("invoices"))) {
        console.log("🛠  Creating invoices table...");
        database
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id TEXT UNIQUE NOT NULL,
            booking_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            payment_terms TEXT,
            status TEXT CHECK(status IN ('Draft', 'Issued', 'Sent', 'Paid', 'Overdue', 'Cancelled')) DEFAULT 'Draft',
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (booking_id) REFERENCES reservations(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
          )
        `
          )
          .run();
        console.log("✅ invoices table created");
      }

      if (!(await tableExists("operations_trip_notes"))) {
        console.log("🛠  Creating operations_trip_notes table...");
        database
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS operations_trip_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            note TEXT NOT NULL,
            note_type TEXT CHECK(note_type IN ('internal', 'interdepartmental')) DEFAULT 'internal',
            target_department TEXT,
            created_by INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
          )
        `
          )
          .run();
        console.log("✅ operations_trip_notes table created");
      }

      // Lightweight migration: expand users.role and role_permissions.role enum values if old constraint is present
      try {
        const usersSchema = database
          .prepare(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`
          )
          .get() as any;
        const rolePermSchema = database
          .prepare(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='role_permissions'`
          )
          .get() as any;

        const oldUsersCheck =
          usersSchema?.sql &&
          usersSchema.sql.includes(
            "role IN ('admin', 'manager', 'agent', 'customer')"
          );
        const oldRolePermCheck =
          rolePermSchema?.sql &&
          rolePermSchema.sql.includes(
            "role IN ('admin', 'manager', 'agent', 'customer')"
          );

        if (oldUsersCheck) {
          console.log("🛠  Migrating users.role constraint to new roles...");
          database.prepare("BEGIN").run();
          try {
            database
              .prepare(
                `
              CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                role TEXT CHECK(role IN ('admin','customer','sales','reservation','finance','operations')) NOT NULL DEFAULT 'customer',
                department TEXT,
                avatar_url TEXT,
                status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
                last_login TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
              )
            `
              )
              .run();
            // Move data; map old roles to new roles
            database
              .prepare(
                `
              INSERT INTO users_new (
                id, email, password, full_name, phone, role, department, avatar_url, status, last_login, created_at, updated_at
              )
              SELECT
                id, email, password, full_name, phone,
                CASE 
                  WHEN role='manager' THEN 'admin'
                  WHEN role='agent' THEN 'sales'
                  ELSE role
                END as role,
                department, avatar_url, status, last_login, created_at, updated_at
              FROM users
            `
              )
              .run();
            database.prepare(`DROP TABLE users`).run();
            database.prepare(`ALTER TABLE users_new RENAME TO users`).run();
            database.prepare("COMMIT").run();
            console.log("✅ users table migrated");
          } catch (e) {
            database.prepare("ROLLBACK").run();
            console.error(
              "❌ Failed migrating users table:",
              (e as any)?.message
            );
          }
        }

        if (oldRolePermCheck) {
          console.log(
            "🛠  Migrating role_permissions.role constraint to new roles..."
          );
          database.prepare("BEGIN").run();
          try {
            database
              .prepare(
                `
              CREATE TABLE role_permissions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT CHECK(role IN ('admin','customer','sales','reservation','finance','operations')) NOT NULL,
                permission_id INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
                UNIQUE (role, permission_id)
              )
            `
              )
              .run();
            // Map old roles to new roles
            database
              .prepare(
                `
              INSERT OR IGNORE INTO role_permissions_new (id, role, permission_id, created_at)
              SELECT id,
                CASE 
                  WHEN role='manager' THEN 'admin'
                  WHEN role='agent' THEN 'sales'
                  ELSE role
                END as role,
                permission_id,
                created_at
              FROM role_permissions
            `
              )
              .run();
            database.prepare(`DROP TABLE role_permissions`).run();
            database
              .prepare(
                `ALTER TABLE role_permissions_new RENAME TO role_permissions`
              )
              .run();
            database.prepare("COMMIT").run();
            console.log("✅ role_permissions table migrated");
          } catch (e) {
            database.prepare("ROLLBACK").run();
            console.error(
              "❌ Failed migrating role_permissions table:",
              (e as any)?.message
            );
          }
        }
      } catch (e) {
        console.warn(
          "⚠️  Role constraint migration check failed:",
          (e as any)?.message
        );
      }

      // Check if admin user exists
      const adminExists = database
        .prepare("SELECT COUNT(*) as count FROM users WHERE email = ?")
        .get("admin@example.com") as any;

      if (adminExists.count === 0) {
        console.log("👤 Creating default admin user...");

        // Hash password for admin user (password: 'password')
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash("password", saltRounds);

        // Insert default admin user
        database
          .prepare(
            `
          INSERT INTO users (email, password, full_name, role, status) 
          VALUES (?, ?, ?, ?, ?)
        `
          )
          .run(
            "admin@example.com",
            hashedPassword,
            "System Administrator",
            "admin",
            "active"
          );

        console.log("✅ Default admin user created");
        console.log("   Email: admin@example.com");
        console.log("   Password: password");
      }

      // Ensure module permissions exist and are assigned to roles even on existing DBs
      try {
        const ensurePermission = database.prepare(`
          INSERT OR IGNORE INTO permissions (name, module, action, description)
          VALUES (?, ?, ?, ?)
        `);
        const getPermissionId = database.prepare(`
          SELECT id FROM permissions WHERE module = ? AND action = ?
        `);
        const insertRolePerm = database.prepare(`
          INSERT OR IGNORE INTO role_permissions (role, permission_id)
          VALUES (?, ?)
        `);

        const ensureModuleCrud = (module: string, role: string) => {
          const actions = ["read", "create", "update", "delete"];
          for (const action of actions) {
            const pretty = module.charAt(0).toUpperCase() + module.slice(1);
            const name = `${
              action.charAt(0).toUpperCase() + action.slice(1)
            } ${pretty}`;
            const description = `Permission to ${action} ${module}`;
            ensurePermission.run(name, module, action, description);
            const permRow = getPermissionId.get(module, action) as any;
            if (permRow?.id) {
              insertRolePerm.run(role, permRow.id);
            }
          }
        };

        ensureModuleCrud("sales", "sales");
        ensureModuleCrud("reservations", "reservation");
        ensureModuleCrud("accounting", "finance");
        console.log(
          "✅ Verified CRUD permissions for sales/reservations/accounting and assigned to roles"
        );
      } catch (e) {
        console.warn(
          "⚠️  Could not verify module permissions on existing DB:",
          (e as any)?.message
        );
      }

      return;
    }

    console.log("📋 Initializing database schema...");

    // Read and execute schema
    // Try multiple possible paths (for both development and compiled code)
    const possiblePaths = [
      path.join(__dirname, "..", "..", "sqlite_schema.sql"), // From compiled dist folder
      path.join(process.cwd(), "sqlite_schema.sql"), // From project root
      path.join(process.cwd(), "backend", "sqlite_schema.sql"), // If running from project root
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
      console.error("❌ Schema file not found. Tried paths:");
      possiblePaths.forEach((p) => console.error(`   - ${p}`));
      throw new Error(
        `Schema file not found. Tried: ${possiblePaths.join(", ")}`
      );
    }

    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Check if we're using SQLite (better-sqlite3) or Turso
    if (useTurso && tursoClient) {
      // For Turso, split schema into individual statements and execute them
      const statements = schema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await tursoClient.execute(statement);
          } catch (error: any) {
            // Ignore errors for statements that might already exist (like PRAGMA)
            if (
              !error.message?.includes("already exists") &&
              !error.message?.includes("duplicate")
            ) {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
          }
        }
      }
    } else if (database && typeof database.exec === "function") {
      // For better-sqlite3, use exec method
      database.exec(schema);
    } else {
      throw new Error(
        "Database not properly initialized or unsupported database type. Expected SQLite database with exec method."
      );
    }

    console.log("✅ Database schema created successfully");

    // Create default admin user
    console.log("👤 Creating default admin user...");

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash("password", saltRounds);

    database
      .prepare(
        `
      INSERT INTO users (email, password, full_name, role, status) 
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(
        "admin@example.com",
        hashedPassword,
        "System Administrator",
        "admin",
        "active"
      );

    console.log("✅ Default admin user created");
    console.log("   Email: admin@example.com");
    console.log("   Password: password");

    // Create default workspace settings
    const settingsExists = database
      .prepare(
        "SELECT COUNT(*) as count FROM system_settings WHERE workspace_id = ?"
      )
      .get("default") as any;

    if (settingsExists.count === 0) {
      console.log("⚙️  Creating default workspace settings...");

      database
        .prepare(
          `
        INSERT INTO system_settings (
          workspace_id, default_currency, default_timezone, default_language,
          pipeline_mode, lead_alerts, ticket_updates, daily_digest,
          task_reminders, compact_mode, high_contrast, theme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          "default",
          "USD",
          "UTC",
          "en",
          "standard",
          1,
          0,
          1,
          1,
          0,
          0,
          "light"
        );

      console.log("✅ Default workspace settings created");
    }

    // Seed permissions and role_permissions if empty
    const permissionsCount = database
      .prepare("SELECT COUNT(*) as count FROM permissions")
      .get() as any;
    if (permissionsCount.count === 0) {
      console.log("🔐 Seeding permissions...");

      // Define all modules and their permissions
      const modules = [
        "leads",
        "customers",
        "reservations",
        "support",
        "attendance",
        "properties",
        "owners",
        "operations",
        "notifications",
        "settings",
        "categories",
        "items",
        "suppliers",
        "sales", // Ensure 'sales' module exists for permission checks
        "sales-cases",
        "accounting", // Ensure accounting module exists for permission checks
        "departments",
        "roles",
        "activities",
      ];

      const actions = ["read", "create", "update", "delete", "manage"];

      // Insert permissions
      const insertPermission = database.prepare(`
        INSERT INTO permissions (name, module, action, description)
        VALUES (?, ?, ?, ?)
      `);

      const permissionMap: { [key: string]: number } = {};

      for (const module of modules) {
        for (const action of actions) {
          const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${
            module.charAt(0).toUpperCase() + module.slice(1)
          }`;
          const description = `Permission to ${action} ${module}`;

          insertPermission.run(name, module, action, description);
          const permId = (
            database.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          permissionMap[`${module}:${action}`] = permId;
        }
      }

      console.log(
        `   Created ${Object.keys(permissionMap).length} permissions`
      );

      // Assign permissions to roles
      const insertRolePerm = database.prepare(`
        INSERT OR IGNORE INTO role_permissions (role, permission_id)
        VALUES (?, ?)
      `);

      // Assign all permissions to admin role
      let adminCount = 0;
      for (const permId of Object.values(permissionMap)) {
        insertRolePerm.run("admin", permId);
        adminCount++;
      }
      console.log(`   Assigned ${adminCount} permissions to admin role`);

      // Assign read permissions to manager, agent, and customer roles
      const readPermissions = Object.entries(permissionMap)
        .filter(([key]) => key.endsWith(":read"))
        .map(([, id]) => id);

      for (const role of ["manager", "agent", "customer"]) {
        let roleCount = 0;
        for (const permId of readPermissions) {
          insertRolePerm.run(role, permId);
          roleCount++;
        }
        console.log(
          `   Assigned ${roleCount} read permissions to ${role} role`
        );
      }

      console.log("✅ Permissions seeded successfully");
    }

    // Ensure module permissions exist and assign to roles (idempotent)
    try {
      const ensurePermission = database.prepare(`
        INSERT OR IGNORE INTO permissions (name, module, action, description)
        VALUES (?, ?, ?, ?)
      `);
      const getPermissionId = database.prepare(`
        SELECT id FROM permissions WHERE module = ? AND action = ?
      `);
      const insertRolePerm = database.prepare(`
        INSERT OR IGNORE INTO role_permissions (role, permission_id)
        VALUES (?, ?)
      `);

      const ensureModuleCrud = (module: string, role: string) => {
        const actions = ["read", "create", "update", "delete"];
        for (const action of actions) {
          const pretty = module.charAt(0).toUpperCase() + module.slice(1);
          const name = `${
            action.charAt(0).toUpperCase() + action.slice(1)
          } ${pretty}`;
          const description = `Permission to ${action} ${module}`;
          ensurePermission.run(name, module, action, description);
          const permRow = getPermissionId.get(module, action) as any;
          if (permRow?.id) {
            insertRolePerm.run(role, permRow.id);
          }
        }
      };

      ensureModuleCrud("sales", "sales");
      ensureModuleCrud("reservations", "reservation");
      ensureModuleCrud("accounting", "finance");
      console.log(
        "✅ Ensured CRUD permissions for sales/reservations/accounting and assigned to roles"
      );
    } catch (e) {
      console.warn(
        "⚠️  Could not ensure module permissions:",
        (e as any)?.message
      );
    }

    schemaInitialized = true;
  } catch (error: any) {
    console.error("❌ Failed to initialize database schema:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
};

// Initialize Turso client
const initializeTurso = (): Client => {
  if (tursoClient) {
    return tursoClient;
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error(
      "Turso configuration required for Vercel deployment. " +
        "Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables. " +
        "See TURSO_QUICKSTART.md for setup instructions."
    );
  }

  try {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log("✅ Turso database client initialized");
    console.log(`   URL: ${process.env.TURSO_DATABASE_URL}`);

    return tursoClient;
  } catch (error: any) {
    console.error("❌ Failed to initialize Turso client:", error.message);
    throw error;
  }
};

// Initialize local SQLite
const initializeSQLite = (): Database.Database => {
  if (db) {
    return db;
  }

  try {
    const dbPath = path.join(process.cwd(), "database.db");
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    console.log("✅ SQLite database initialized (local)");
    console.log(`   Path: ${dbPath}`);

    return db;
  } catch (error: any) {
    console.error("❌ Failed to initialize SQLite:", error.message);
    throw error;
  }
};

// Initialize database connection
export const initializeDatabase = (): any => {
  if (useTurso) {
    return initializeTurso();
  } else {
    return initializeSQLite();
  }
};

// Get database instance
export const getDatabase = (): any => {
  if (useTurso) {
    if (!tursoClient) {
      return initializeTurso();
    }
    return tursoClient;
  } else {
    if (!db) {
      return initializeSQLite();
    }
    return db;
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    // Test with a simple query
    database.prepare("SELECT 1 as test").get();
    console.log("✅ Database connection successful");
    return true;
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

// Health check for periodic monitoring
export const healthCheck = async (): Promise<{
  healthy: boolean;
  message: string;
}> => {
  try {
    const database = getDatabase();
    database.prepare("SELECT 1 as test").get();
    return { healthy: true, message: "Database connection is healthy" };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Database connection failed: ${
        error.message || "Unknown error"
      }`,
    };
  }
};

// Close database connection
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = undefined as any;
  }
};

// Helper function to check if a table is empty (Turso-compatible)
const checkTableEmptyTurso = async (tableName: string): Promise<boolean> => {
  if (!useTurso || !tursoClient) {
    return false;
  }
  try {
    const result = await tursoClient.execute({
      sql: `SELECT COUNT(*) as count FROM ${tableName}`,
      args: [],
    });
    const count = (result.rows[0] as any)?.count || 0;
    return count === 0;
  } catch (error: any) {
    // Table might not exist yet, treat as empty
    if (error.message?.includes("no such table")) {
      return true;
    }
    console.warn(`⚠️  Warning checking table ${tableName}:`, error.message);
    return false;
  }
};

// Helper function to get last insert ID (Turso-compatible)
const getLastInsertIdTurso = async (): Promise<number> => {
  if (!useTurso || !tursoClient) {
    throw new Error("Turso client not available");
  }
  try {
    const result = await tursoClient.execute({
      sql: "SELECT last_insert_rowid() as id",
      args: [],
    });
    return (result.rows[0] as any)?.id || 0;
  } catch (error: any) {
    console.warn("⚠️  Warning getting last insert ID:", error.message);
    return 0;
  }
};

// Seed minimal essential data for Turso (Vercel deployment)
export const seedMinimalDataForTurso = async (): Promise<void> => {
  // Only run on Turso
  if (!useTurso || !tursoClient) {
    return;
  }

  try {
    console.log("🌱 Checking and seeding minimal data for Turso...");

    // Check if we need to seed at all
    const usersEmpty = await checkTableEmptyTurso("users");
    const customersEmpty = await checkTableEmptyTurso("customers");
    const leadsEmpty = await checkTableEmptyTurso("leads");
    const suppliersEmpty = await checkTableEmptyTurso("suppliers");
    const reservationsEmpty = await checkTableEmptyTurso("reservations");
    const departmentsEmpty = await checkTableEmptyTurso("departments");
    const salesCasesEmpty = await checkTableEmptyTurso("sales_cases");
    const propertiesEmpty = await checkTableEmptyTurso("properties");
    const propertyOwnersEmpty = await checkTableEmptyTurso("property_owners");
    const operationsTripsEmpty = await checkTableEmptyTurso("operations_trips");
    const categoriesEmpty = await checkTableEmptyTurso("categories");
    const itemsEmpty = await checkTableEmptyTurso("items");
    const supportTicketsEmpty = await checkTableEmptyTurso("support_tickets");
    const notificationsEmpty = await checkTableEmptyTurso("notifications");

    const needsSeeding =
      usersEmpty ||
      customersEmpty ||
      leadsEmpty ||
      suppliersEmpty ||
      reservationsEmpty ||
      departmentsEmpty ||
      salesCasesEmpty ||
      propertiesEmpty ||
      propertyOwnersEmpty ||
      operationsTripsEmpty ||
      categoriesEmpty ||
      itemsEmpty ||
      supportTicketsEmpty ||
      notificationsEmpty;

    if (!needsSeeding) {
      console.log("ℹ️  All tables already have data, skipping seed");
      return;
    }

    let adminUserId: number | null = null;

    // 1. Seed admin user if users table is empty
    if (usersEmpty) {
      console.log("   Creating admin user...");
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash("password", saltRounds);

      await tursoClient.execute({
        sql: `INSERT INTO users (email, password, full_name, role, status) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          "admin@example.com",
          hashedPassword,
          "System Administrator",
          "admin",
          "active",
        ],
      });

      adminUserId = await getLastInsertIdTurso();
      console.log("✅ Admin user created");
    } else {
      // Get existing admin user ID
      const result = await tursoClient.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: ["admin@example.com"],
      });
      if (result.rows.length > 0) {
        adminUserId = (result.rows[0] as any).id;
      }
    }

    if (!adminUserId) {
      console.log("⚠️  Admin user not found, skipping seed data");
      return;
    }

    // 2. Seed departments (3 records)
    if (departmentsEmpty) {
      console.log("   Creating departments...");
      const departments = [
        ["Sales", "Sales and customer acquisition"],
        ["Operations", "Operations and logistics"],
        ["Support", "Customer support and service"],
      ];

      for (const [name, description] of departments) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO departments (name, description, manager_id) 
                VALUES (?, ?, ?)`,
          args: [name, description, null],
        });
      }
      console.log("✅ Departments created");
    }

    // 3. Seed suppliers (3 records)
    const supplierIds: number[] = [];
    if (suppliersEmpty) {
      console.log("   Creating suppliers...");
      const suppliers = [
        [
          "Airline Express",
          "John Smith",
          "+1234567890",
          "contact@airline.com",
          "123 Airport Rd",
          "Flight booking, Tickets",
          "Active",
        ],
        [
          "Hotel Grand",
          "Sarah Johnson",
          "+1234567891",
          "sales@hotel.com",
          "456 Main St",
          "Hotel booking, Accommodation",
          "Active",
        ],
        [
          "Car Rental Pro",
          "Mike Brown",
          "+1234567892",
          "info@carrental.com",
          "789 Auto Ave",
          "Car rental, Transportation",
          "Active",
        ],
      ];

      for (const [
        name,
        contact,
        phone,
        email,
        address,
        services,
        status,
      ] of suppliers) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO suppliers (name, contact_person, phone, email, address, services, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [name, contact, phone, email, address, services, status],
        });
        const supplierId = await getLastInsertIdTurso();
        if (supplierId) supplierIds.push(supplierId);
      }
      console.log("✅ Suppliers created");
    } else {
      // Get existing supplier IDs
      const result = await tursoClient.execute({
        sql: "SELECT id FROM suppliers LIMIT 3",
        args: [],
      });
      supplierIds.push(...result.rows.map((row: any) => row.id));
    }

    // 4. Seed customers (3 records)
    const customerIds: number[] = [];
    if (customersEmpty) {
      console.log("   Creating customers...");
      const timestamp = Date.now().toString().slice(-8);
      const customers = [
        [
          `CU-${timestamp}1`,
          "Alice Johnson",
          "alice@example.com",
          "+1987654321",
          null,
          "Individual",
          "Active",
          "Email",
          null,
        ],
        [
          `CU-${timestamp}2`,
          "Tech Corp",
          "info@techcorp.com",
          "+1987654322",
          "Tech Corp Inc",
          "Corporate",
          "Active",
          "Phone",
          null,
        ],
        [
          `CU-${timestamp}3`,
          "Bob Williams",
          "bob@example.com",
          "+1987654323",
          null,
          "Individual",
          "Active",
          "SMS",
          null,
        ],
      ];

      for (const [
        customerId,
        name,
        email,
        phone,
        company,
        type,
        status,
        contactMethod,
        assignedStaff,
      ] of customers) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO customers (customer_id, name, email, phone, company, type, status, contact_method, assigned_staff_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            customerId,
            name,
            email,
            phone,
            company,
            type,
            status,
            contactMethod,
            assignedStaff,
          ],
        });
        const customerIdNum = await getLastInsertIdTurso();
        if (customerIdNum) customerIds.push(customerIdNum);
      }
      console.log("✅ Customers created");
    } else {
      // Get existing customer IDs
      const result = await tursoClient.execute({
        sql: "SELECT id FROM customers LIMIT 3",
        args: [],
      });
      customerIds.push(...result.rows.map((row: any) => row.id));
    }

    // 5. Seed leads (3 records)
    if (leadsEmpty && customerIds.length > 0) {
      console.log("   Creating leads...");
      const timestamp = Date.now().toString().slice(-8);
      const leads = [
        [
          `LD-${timestamp}1`,
          "David Lee",
          "david@example.com",
          "+1122334455",
          null,
          "Website",
          "B2C",
          "New",
          null,
          5000,
        ],
        [
          `LD-${timestamp}2`,
          "Enterprise Solutions",
          "sales@enterprise.com",
          "+1122334456",
          "Enterprise Solutions",
          "Social Media",
          "B2B",
          "Qualified",
          null,
          25000,
        ],
        [
          `LD-${timestamp}3`,
          "Emma Davis",
          "emma@example.com",
          "+1122334457",
          null,
          "Referral",
          "B2C",
          "Contacted",
          null,
          3000,
        ],
      ];

      for (const [
        leadId,
        name,
        email,
        phone,
        company,
        source,
        type,
        status,
        agentId,
        value,
      ] of leads) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO leads (lead_id, name, email, phone, company, source, type, status, agent_id, value) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            leadId,
            name,
            email,
            phone,
            company,
            source,
            type,
            status,
            agentId,
            value,
          ],
        });
      }
      console.log("✅ Leads created");
    }

    // 6. Seed reservations (3 records)
    if (reservationsEmpty && customerIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating reservations...");
      const timestamp = Date.now().toString().slice(-8);
      const futureDate1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate2 = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate3 = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate4 = new Date(Date.now() + 52 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const reservations = [
        [
          `RES-${timestamp}1`,
          customerIds[0],
          supplierIds[0],
          "Flight",
          "Paris, France",
          futureDate1,
          futureDate2,
          2,
          0,
          0,
          2500.0,
          "Confirmed",
          "Paid",
          adminUserId,
        ],
        [
          `RES-${timestamp}2`,
          customerIds[1] || customerIds[0],
          supplierIds[1] || supplierIds[0],
          "Hotel",
          "Tokyo, Japan",
          futureDate3,
          futureDate4,
          4,
          2,
          0,
          4500.0,
          "Pending",
          "Partial",
          adminUserId,
        ],
        [
          `RES-${timestamp}3`,
          customerIds[2] || customerIds[0],
          supplierIds[2] || supplierIds[0],
          "Car Rental",
          "Dubai, UAE",
          futureDate1,
          futureDate2,
          2,
          0,
          0,
          300.0,
          "Pending",
          "Pending",
          adminUserId,
        ],
      ];

      for (const [
        reservationId,
        customerId,
        supplierId,
        serviceType,
        destination,
        departureDate,
        returnDate,
        adults,
        children,
        infants,
        totalAmount,
        status,
        paymentStatus,
        createdBy,
      ] of reservations) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO reservations (reservation_id, customer_id, supplier_id, service_type, destination, departure_date, return_date, adults, children, infants, total_amount, status, payment_status, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            reservationId,
            customerId,
            supplierId,
            serviceType,
            destination,
            departureDate,
            returnDate,
            adults,
            children,
            infants,
            totalAmount,
            status,
            paymentStatus,
            createdBy,
          ],
        });
      }
      console.log("✅ Reservations created");
    }

    // 7. Seed sales cases (3 records)
    if (salesCasesEmpty && customerIds.length > 0) {
      console.log("   Creating sales cases...");
      const timestamp = Date.now().toString().slice(-8);
      const futureDate1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate2 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate3 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const salesCases = [
        [
          `SC-${timestamp}1`,
          customerIds[0],
          null,
          "Premium Travel Package",
          "Corporate travel package for 20 employees",
          "Quoted",
          "B2B",
          "Sent",
          50000.0,
          75,
          futureDate1,
          null,
          adminUserId,
        ],
        [
          `SC-${timestamp}2`,
          customerIds[1] || customerIds[0],
          null,
          "Family Vacation Package",
          "All-inclusive family vacation to Maldives",
          "In Progress",
          "B2C",
          "Draft",
          15000.0,
          60,
          futureDate2,
          null,
          adminUserId,
        ],
        [
          `SC-${timestamp}3`,
          customerIds[2] || customerIds[0],
          null,
          "Weekend Getaway Package",
          "City break for two with spa access",
          "Open",
          "B2C",
          "Draft",
          1200.0,
          40,
          futureDate3,
          null,
          adminUserId,
        ],
      ];

      for (const [
        caseId,
        customerId,
        leadId,
        title,
        description,
        status,
        caseType,
        quotationStatus,
        value,
        probability,
        expectedCloseDate,
        assignedTo,
        createdBy,
      ] of salesCases) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO sales_cases (case_id, customer_id, lead_id, title, description, status, case_type, quotation_status, value, probability, expected_close_date, assigned_to, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            caseId,
            customerId,
            leadId,
            title,
            description,
            status,
            caseType,
            quotationStatus,
            value,
            probability,
            expectedCloseDate,
            assignedTo,
            createdBy,
          ],
        });
      }
      console.log("✅ Sales cases created");
    }

    // 8. Seed property owners (3 records)
    const ownerIds: number[] = [];
    if (propertyOwnersEmpty) {
      console.log("   Creating property owners...");
      const timestamp = Date.now().toString().slice(-8);
      const owners = [
        [
          `PO-${timestamp}1`,
          "Luxury Properties LLC",
          "Robert Chen",
          "robert@luxuryprops.com",
          "+1987654325",
          "Active",
          15,
          "Dubai, Paris, Tokyo",
          null,
        ],
        [
          `PO-${timestamp}2`,
          "Beachfront Realty",
          "Maria Garcia",
          "maria@beachfront.com",
          "+1987654326",
          "Active",
          8,
          "Maldives, Bali, Phuket",
          null,
        ],
        [
          `PO-${timestamp}3`,
          "City Apartments Inc",
          "James Wilson",
          "james@cityapts.com",
          "+1987654327",
          "Active",
          12,
          "New York, London, Tokyo",
          null,
        ],
      ];

      for (const [
        ownerId,
        companyName,
        primaryContact,
        email,
        phone,
        status,
        portfolioSize,
        locations,
        managerId,
      ] of owners) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO property_owners (owner_id, company_name, primary_contact, email, phone, status, portfolio_size, locations, manager_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            ownerId,
            companyName,
            primaryContact,
            email,
            phone,
            status,
            portfolioSize,
            locations,
            managerId,
          ],
        });
        const ownerIdNum = await getLastInsertIdTurso();
        if (ownerIdNum) ownerIds.push(ownerIdNum);
      }
      console.log("✅ Property owners created");
    } else {
      // Get existing owner IDs
      const result = await tursoClient.execute({
        sql: "SELECT id FROM property_owners LIMIT 3",
        args: [],
      });
      ownerIds.push(...result.rows.map((row: any) => row.id));
    }

    // 9. Seed properties (3 records)
    if (propertiesEmpty && ownerIds.length > 0) {
      console.log("   Creating properties...");
      const timestamp = Date.now().toString().slice(-8);
      const properties = [
        [
          `PROP-${timestamp}1`,
          ownerIds[0],
          "Luxury Villa Dubai Marina",
          "Dubai, UAE",
          "Villa",
          "Available",
          500.0,
          8,
          0,
          "Spacious 4-bedroom villa with private pool",
        ],
        [
          `PROP-${timestamp}2`,
          ownerIds[1] || ownerIds[0],
          "Paris Apartment Champs-Élysées",
          "Paris, France",
          "Apartment",
          "Reserved",
          300.0,
          4,
          2,
          "Elegant 2-bedroom apartment in city center",
        ],
        [
          `PROP-${timestamp}3`,
          ownerIds[2] || ownerIds[0],
          "Beachfront Villa Maldives",
          "Maldives",
          "Villa",
          "Available",
          800.0,
          6,
          0,
          "Private beachfront villa with ocean view",
        ],
      ];

      for (const [
        propertyId,
        ownerId,
        name,
        location,
        propertyType,
        status,
        nightlyRate,
        capacity,
        occupancy,
        description,
      ] of properties) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO properties (property_id, owner_id, name, location, property_type, status, nightly_rate, capacity, occupancy, description) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            propertyId,
            ownerId,
            name,
            location,
            propertyType,
            status,
            nightlyRate,
            capacity,
            occupancy,
            description,
          ],
        });
      }
      console.log("✅ Properties created");
    }

    // 10. Seed operations trips (3 records)
    if (operationsTripsEmpty) {
      console.log("   Creating operations trips...");
      const timestamp = Date.now().toString().slice(-8);
      const futureDate1 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate2 = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate3 = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const futureDate4 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const trips = [
        [
          `TRIP-${timestamp}1`,
          `BR-${timestamp}1`,
          "Alice Johnson",
          2,
          "Day 1: Arrival, Day 2-3: City Tour, Day 4: Departure",
          "3 days",
          futureDate1,
          futureDate2,
          "Paris, France",
          "Jean Pierre",
          "Marc Dubois",
          "Van",
          "Mercedes Sprinter",
          "Planned",
          "Vegetarian meals required",
        ],
        [
          `TRIP-${timestamp}2`,
          `BR-${timestamp}2`,
          "Tech Corp Group",
          15,
          "Corporate team building trip",
          "5 days",
          futureDate3,
          futureDate4,
          "Tokyo, Japan",
          "Yuki Tanaka",
          "Hiroshi Yamamoto",
          "Bus",
          "50-seater coach",
          "In Progress",
          "Business class flights",
        ],
        [
          `TRIP-${timestamp}3`,
          `BR-${timestamp}3`,
          "Family Group",
          4,
          "Family vacation package",
          "7 days",
          futureDate1,
          futureDate2,
          "Maldives",
          "Ahmed Hassan",
          "Mohammed Ali",
          "Van",
          "Toyota Hiace",
          "Planned",
          "Child-friendly activities",
        ],
      ];

      for (const [
        tripCode,
        bookingRef,
        customerName,
        customerCount,
        itinerary,
        duration,
        startDate,
        endDate,
        destinations,
        assignedGuide,
        assignedDriver,
        transport,
        transportDetails,
        status,
        specialRequests,
      ] of trips) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO operations_trips (trip_code, booking_reference, customer_name, customer_count, itinerary, duration, start_date, end_date, destinations, assigned_guide, assigned_driver, transport, transport_details, status, special_requests) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            tripCode,
            bookingRef,
            customerName,
            customerCount,
            itinerary,
            duration,
            startDate,
            endDate,
            destinations,
            assignedGuide,
            assignedDriver,
            transport,
            transportDetails,
            status,
            specialRequests,
          ],
        });
      }
      console.log("✅ Operations trips created");
    }

    // 11. Seed categories (3 records)
    const categoryIds: number[] = [];
    if (categoriesEmpty) {
      console.log("   Creating categories...");
      const categories = [
        ["Accommodation", "Hotels, Resorts, Apartments"],
        ["Transportation", "Flights, Car Rentals, Transfers"],
        ["Tours", "City Tours, Excursions, Activities"],
      ];

      for (const [name, description] of categories) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO categories (name, description) 
                VALUES (?, ?)`,
          args: [name, description],
        });
        const categoryId = await getLastInsertIdTurso();
        if (categoryId) categoryIds.push(categoryId);
      }
      console.log("✅ Categories created");
    } else {
      // Get existing category IDs
      const result = await tursoClient.execute({
        sql: "SELECT id FROM categories LIMIT 3",
        args: [],
      });
      categoryIds.push(...result.rows.map((row: any) => row.id));
    }

    // 12. Seed items (3 records)
    if (itemsEmpty && categoryIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating items...");
      const timestamp = Date.now().toString().slice(-8);
      const items = [
        [
          `ITEM-${timestamp}1`,
          "Standard Hotel Room",
          "Comfortable room with basic amenities",
          categoryIds[0],
          supplierIds[0],
          150.0,
          100.0,
          50,
          10,
          "Active",
        ],
        [
          `ITEM-${timestamp}2`,
          "Economy Flight Ticket",
          "One-way economy class flight",
          categoryIds[1] || categoryIds[0],
          supplierIds[0],
          500.0,
          350.0,
          100,
          20,
          "Active",
        ],
        [
          `ITEM-${timestamp}3`,
          "City Tour Package",
          "Half-day guided city tour",
          categoryIds[2] || categoryIds[0],
          supplierIds[0],
          75.0,
          50.0,
          200,
          30,
          "Active",
        ],
      ];

      for (const [
        itemId,
        name,
        description,
        categoryId,
        supplierId,
        price,
        cost,
        stockQuantity,
        minStockLevel,
        status,
      ] of items) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO items (item_id, name, description, category_id, supplier_id, price, cost, stock_quantity, min_stock_level, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            itemId,
            name,
            description,
            categoryId,
            supplierId,
            price,
            cost,
            stockQuantity,
            minStockLevel,
            status,
          ],
        });
      }
      console.log("✅ Items created");
    }

    // 13. Seed support tickets (3 records)
    if (supportTicketsEmpty && customerIds.length > 0) {
      console.log("   Creating support tickets...");
      const tickets = [
        [
          customerIds[0],
          "Need help with booking modification",
          "I would like to change my travel dates for the Paris trip.",
          "Medium",
          "Open",
          null,
        ],
        [
          customerIds[1] || customerIds[0],
          "Payment issue",
          "There seems to be an issue with my payment transaction.",
          "High",
          "In Progress",
          null,
        ],
        [
          customerIds[2] || customerIds[0],
          "General inquiry",
          "I have questions about your services.",
          "Low",
          "Open",
          null,
        ],
      ];

      for (const [
        customerId,
        subject,
        description,
        priority,
        status,
        assignedTo,
      ] of tickets) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO support_tickets (customer_id, subject, description, priority, status, assigned_to) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            customerId,
            subject,
            description,
            priority,
            status,
            assignedTo,
          ],
        });
      }
      console.log("✅ Support tickets created");
    }

    // 14. Seed notifications (3 records)
    if (notificationsEmpty && adminUserId) {
      console.log("   Creating notifications...");
      const notifications = [
        [
          adminUserId,
          "lead",
          "New Lead Assigned",
          "You have been assigned a new lead",
          "lead",
          "1",
          0,
          null,
        ],
        [
          adminUserId,
          "customer",
          "Customer Update",
          "A customer has updated their profile",
          "customer",
          "1",
          1,
          new Date().toISOString(),
        ],
        [
          adminUserId,
          "system",
          "Weekly Report Ready",
          "Your weekly sales report is ready for review",
          "system",
          null,
          0,
          null,
        ],
      ];

      for (const [
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
        isRead,
        readAt,
      ] of notifications) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read, read_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            type,
            title,
            message,
            entityType,
            entityId,
            isRead,
            readAt,
          ],
        });
      }
      console.log("✅ Notifications created");
    }

    // 15. Seed permissions/role_permissions if empty
    const permissionsEmpty = await checkTableEmptyTurso("permissions");
    if (permissionsEmpty) {
      console.log("   Creating essential permissions...");
      // Create a few essential permissions
      const essentialPermissions = [
        ["Read Customers", "customers", "read", "Permission to read customers"],
        [
          "Create Customers",
          "customers",
          "create",
          "Permission to create customers",
        ],
        [
          "Read Reservations",
          "reservations",
          "read",
          "Permission to read reservations",
        ],
        [
          "Create Reservations",
          "reservations",
          "create",
          "Permission to create reservations",
        ],
      ];

      const permissionIds: number[] = [];
      for (const [name, module, action, description] of essentialPermissions) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO permissions (name, module, action, description) 
                VALUES (?, ?, ?, ?)`,
          args: [name, module, action, description],
        });
        const permId = await getLastInsertIdTurso();
        if (permId) permissionIds.push(permId);
      }

      // Assign permissions to admin role
      for (const permId of permissionIds) {
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO role_permissions (role, permission_id) 
                VALUES (?, ?)`,
          args: ["admin", permId],
        });
      }
      console.log("✅ Essential permissions created");
    }

    console.log("✅ Minimal seed data for Turso completed successfully");
  } catch (error: any) {
    console.error("❌ Failed to seed minimal data for Turso:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    // Don't throw - allow app to continue even if seeding fails
  }
};

export const seedData = async (): Promise<void> => {
  try {
    const database = getDatabase();
    const forceSeed = (process.env.FORCE_DEMO_SEED || "").trim() === "1";

    // If not forcing reseed, short-circuit when core business data already exists.
    // This makes seedData safe to call on each request or cold start in any env.
    if (!forceSeed) {
      const existingCounts = database
        .prepare(
          `
          SELECT
            (SELECT COUNT(*) FROM customers)      AS customers,
            (SELECT COUNT(*) FROM reservations)   AS reservations,
            (SELECT COUNT(*) FROM leads)          AS leads,
            (SELECT COUNT(*) FROM sales_cases)    AS sales_cases
        `
        )
        .get() as any;

      if (
        existingCounts &&
        (existingCounts.customers > 0 ||
          existingCounts.reservations > 0 ||
          existingCounts.leads > 0 ||
          existingCounts.sales_cases > 0)
      ) {
        console.log(
          "ℹ️  Demo data already present (set FORCE_DEMO_SEED=1 to reseed)"
        );
        return;
      }
    } else {
      console.log(
        "🛠  FORCE_DEMO_SEED=1 detected — reseeding demo data even if records exist"
      );
    }

    console.log("🌱 Seeding test data...");

    // Get admin user ID for created_by fields
    const adminUser = database
      .prepare("SELECT id FROM users WHERE email = ?")
      .get("admin@example.com") as any;
    if (!adminUser) {
      console.log("⚠️  Admin user not found, skipping seed data");
      return;
    }
    const adminId = adminUser.id;

    // Seed departments
    console.log("   Creating departments...");
    const departments = [
      { name: "Sales", description: "Sales and customer acquisition" },
      { name: "Operations", description: "Operations and logistics" },
      { name: "Support", description: "Customer support and service" },
      { name: "Marketing", description: "Marketing and promotions" },
    ];

    const insertDept = database.prepare(`
      INSERT OR IGNORE INTO departments (name, description, manager_id)
      VALUES (?, ?, ?)
    `);

    const deptIds: number[] = [];
    for (const dept of departments) {
      try {
        insertDept.run(dept.name, dept.description, null);
        const deptId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (deptId) deptIds.push(deptId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM departments WHERE name = ?")
          .get(dept.name) as any;
        if (existing) deptIds.push(existing.id);
      }
    }

    // Seed test users
    console.log("   Creating test users...");
    const testUsers = [
      {
        email: "manager1@example.com",
        password: "password",
        full_name: "John Manager",
        role: "manager",
        department: "Sales",
      },
      {
        email: "agent1@example.com",
        password: "password",
        full_name: "Jane Agent",
        role: "agent",
        department: "Sales",
      },
      {
        email: "agent2@example.com",
        password: "password",
        full_name: "Bob Agent",
        role: "agent",
        department: "Operations",
      },
      {
        email: "customer1@example.com",
        password: "password",
        full_name: "Alice Customer",
        role: "customer",
        department: null,
      },
    ];

    const saltRounds = 10;
    const insertUser = database.prepare(`
      INSERT OR IGNORE INTO users (email, password, full_name, role, department, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const userIds: { [key: string]: number } = {};
    for (const user of testUsers) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        insertUser.run(
          user.email,
          hashedPassword,
          user.full_name,
          user.role,
          user.department,
          "active"
        );
        const userId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (userId) userIds[user.email] = userId;
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM users WHERE email = ?")
          .get(user.email) as any;
        if (existing) userIds[user.email] = existing.id;
      }
    }

    // Seed suppliers
    console.log("   Creating suppliers...");
    const suppliers = [
      {
        name: "Airline Express",
        contact_person: "John Smith",
        phone: "+1234567890",
        email: "contact@airline.com",
        address: "123 Airport Rd",
        services: "Flight booking, Tickets",
        status: "Active",
      },
      {
        name: "Hotel Grand",
        contact_person: "Sarah Johnson",
        phone: "+1234567891",
        email: "sales@hotel.com",
        address: "456 Main St",
        services: "Hotel booking, Accommodation",
        status: "Active",
      },
      {
        name: "Car Rental Pro",
        contact_person: "Mike Brown",
        phone: "+1234567892",
        email: "info@carrental.com",
        address: "789 Auto Ave",
        services: "Car rental, Transportation",
        status: "Active",
      },
    ];

    const insertSupplier = database.prepare(`
      INSERT OR IGNORE INTO suppliers (name, contact_person, phone, email, address, services, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const supplierIds: number[] = [];
    for (const supplier of suppliers) {
      try {
        insertSupplier.run(
          supplier.name,
          supplier.contact_person,
          supplier.phone,
          supplier.email,
          supplier.address,
          supplier.services,
          supplier.status
        );
        const supplierId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (supplierId) supplierIds.push(supplierId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM suppliers WHERE name = ?")
          .get(supplier.name) as any;
        if (existing) supplierIds.push(existing.id);
      }
    }

    // Seed customers
    console.log("   Creating customers...");
    const customerTimestamp = Date.now().toString().slice(-8);
    const customers = [
      {
        customer_id: `CU-${customerTimestamp}1`,
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "+1987654321",
        company: null,
        type: "Individual",
        status: "Active",
        contact_method: "Email",
        assigned_staff_id: userIds["agent1@example.com"] || null,
      },
      {
        customer_id: `CU-${customerTimestamp}2`,
        name: "Tech Corp",
        email: "info@techcorp.com",
        phone: "+1987654322",
        company: "Tech Corp Inc",
        type: "Corporate",
        status: "Active",
        contact_method: "Phone",
        assigned_staff_id: userIds["agent1@example.com"] || null,
      },
      {
        customer_id: `CU-${customerTimestamp}3`,
        name: "Bob Williams",
        email: "bob@example.com",
        phone: "+1987654323",
        company: null,
        type: "Individual",
        status: "Active",
        contact_method: "SMS",
        assigned_staff_id: userIds["agent2@example.com"] || null,
      },
    ];

    const insertCustomer = database.prepare(`
      INSERT OR IGNORE INTO customers (customer_id, name, email, phone, company, type, status, contact_method, assigned_staff_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customerIds: number[] = [];
    for (const customer of customers) {
      try {
        insertCustomer.run(
          customer.customer_id,
          customer.name,
          customer.email,
          customer.phone,
          customer.company,
          customer.type,
          customer.status,
          customer.contact_method,
          customer.assigned_staff_id
        );
        const customerId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (customerId) customerIds.push(customerId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM customers WHERE customer_id = ?")
          .get(customer.customer_id) as any;
        if (existing) customerIds.push(existing.id);
      }
    }

    // Seed leads
    console.log("   Creating leads...");
    const leads = [
      {
        lead_id: `LD-${customerTimestamp}1`,
        name: "David Lee",
        email: "david@example.com",
        phone: "+1122334455",
        company: null,
        source: "Website",
        type: "B2C",
        status: "New",
        agent_id: userIds["agent1@example.com"] || null,
        value: 5000,
      },
      {
        lead_id: `LD-${customerTimestamp}2`,
        name: "Enterprise Solutions",
        email: "sales@enterprise.com",
        phone: "+1122334456",
        company: "Enterprise Solutions",
        source: "Social Media",
        type: "B2B",
        status: "Qualified",
        agent_id: userIds["agent1@example.com"] || null,
        value: 25000,
      },
      {
        lead_id: `LD-${customerTimestamp}3`,
        name: "Emma Davis",
        email: "emma@example.com",
        phone: "+1122334457",
        company: null,
        source: "Referral",
        type: "B2C",
        status: "Contacted",
        agent_id: userIds["agent2@example.com"] || null,
        value: 3000,
      },
    ];

    const insertLead = database.prepare(`
      INSERT OR IGNORE INTO leads (lead_id, name, email, phone, company, source, type, status, agent_id, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lead of leads) {
      try {
        insertLead.run(
          lead.lead_id,
          lead.name,
          lead.email,
          lead.phone,
          lead.company,
          lead.source,
          lead.type,
          lead.status,
          lead.agent_id,
          lead.value
        );
      } catch (e) {
        // Lead might already exist
      }
    }

    // Seed reservations (only if we have customers and suppliers)
    if (customerIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating reservations...");
      const reservations = [
        {
          reservation_id: `RES-${customerTimestamp}1`,
          customer_id: customerIds[0],
          supplier_id: supplierIds[0],
          service_type: "Flight",
          destination: "Paris, France",
          departure_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          return_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          adults: 2,
          children: 0,
          infants: 0,
          total_amount: 2500.0,
          status: "Confirmed",
          payment_status: "Paid",
          created_by: adminId,
        },
        {
          reservation_id: `RES-${customerTimestamp}2`,
          customer_id: customerIds[1],
          supplier_id: supplierIds[1],
          service_type: "Hotel",
          destination: "Tokyo, Japan",
          departure_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          return_date: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          adults: 4,
          children: 2,
          infants: 0,
          total_amount: 4500.0,
          status: "Pending",
          payment_status: "Partial",
          created_by: adminId,
        },
      ];

      const insertReservation = database.prepare(`
        INSERT OR IGNORE INTO reservations (
          reservation_id, customer_id, supplier_id, service_type, destination,
          departure_date, return_date, adults, children, infants, total_amount,
          status, payment_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const reservation of reservations) {
        try {
          insertReservation.run(
            reservation.reservation_id,
            reservation.customer_id,
            reservation.supplier_id,
            reservation.service_type,
            reservation.destination,
            reservation.departure_date,
            reservation.return_date,
            reservation.adults,
            reservation.children,
            reservation.infants,
            reservation.total_amount,
            reservation.status,
            reservation.payment_status,
            reservation.created_by
          );
        } catch (e) {
          // Reservation might already exist
        }
      }
    }

    // Seed support tickets (only if we have customers)
    if (customerIds.length > 0) {
      console.log("   Creating support tickets...");
      const supportTickets = [
        {
          customer_id: customerIds[0],
          subject: "Need help with booking modification",
          description:
            "I would like to change my travel dates for the Paris trip.",
          priority: "Medium",
          status: "Open",
          assigned_to: userIds["agent1@example.com"] || null,
        },
        {
          customer_id: customerIds[1],
          subject: "Payment issue",
          description:
            "There seems to be an issue with my payment transaction.",
          priority: "High",
          status: "In Progress",
          assigned_to: userIds["agent1@example.com"] || null,
        },
      ];

      const insertTicket = database.prepare(`
        INSERT OR IGNORE INTO support_tickets (
          customer_id, subject, description, priority, status, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const ticket of supportTickets) {
        try {
          insertTicket.run(
            ticket.customer_id,
            ticket.subject,
            ticket.description,
            ticket.priority,
            ticket.status,
            ticket.assigned_to
          );
        } catch (e) {
          // Ticket might already exist
        }
      }
    }

    // Add additional demo reservations if table is still sparse
    try {
      const existingReservationsCount = (
        database
          .prepare("SELECT COUNT(*) as count FROM reservations")
          .get() as any
      ).count;
      if (existingReservationsCount < 5 && customerIds.length > 1) {
        const extraTimestamp = Date.now().toString().slice(-6);
        const extraReservations = [
          {
            reservation_id: `RES-${extraTimestamp}3`,
            customer_id: customerIds[0],
            supplier_id: supplierIds[2] || supplierIds[0],
            service_type: "Car Rental",
            destination: "Dubai, UAE",
            departure_date: new Date(Date.now() + 10 * 86400000)
              .toISOString()
              .split("T")[0],
            return_date: new Date(Date.now() + 12 * 86400000)
              .toISOString()
              .split("T")[0],
            adults: 2,
            children: 0,
            infants: 0,
            total_amount: 300.0,
            status: "Pending",
            payment_status: "Pending",
            created_by: adminId,
          },
          {
            reservation_id: `RES-${extraTimestamp}4`,
            customer_id: customerIds[1],
            supplier_id: supplierIds[1] || supplierIds[0],
            service_type: "Tour",
            destination: "Tokyo City Tour",
            departure_date: new Date(Date.now() + 20 * 86400000)
              .toISOString()
              .split("T")[0],
            return_date: null,
            adults: 4,
            children: 1,
            infants: 0,
            total_amount: 800.0,
            status: "Confirmed",
            payment_status: "Partial",
            created_by: adminId,
          },
        ];
        const insertReservationExtra = database.prepare(`
          INSERT OR IGNORE INTO reservations (
            reservation_id, customer_id, supplier_id, service_type, destination,
            departure_date, return_date, adults, children, infants, total_amount,
            status, payment_status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of extraReservations) {
          try {
            insertReservationExtra.run(
              r.reservation_id,
              r.customer_id,
              r.supplier_id,
              r.service_type,
              r.destination,
              r.departure_date,
              r.return_date,
              r.adults,
              r.children,
              r.infants,
              r.total_amount,
              r.status,
              r.payment_status,
              r.created_by
            );
          } catch {}
        }
      }
    } catch {}

    // Seed payments (only if we have reservations)
    if (customerIds.length > 0) {
      console.log("   Creating payments...");
      const reservationIds = database
        .prepare("SELECT id FROM reservations LIMIT 2")
        .all() as any[];

      if (reservationIds.length > 0) {
        const paymentTimestamp = Date.now().toString().slice(-8);
        const payments = [
          {
            payment_id: `PAY-${paymentTimestamp}1`,
            booking_id: reservationIds[0].id,
            customer_id: customerIds[0],
            amount: 2500.0,
            payment_method: "Credit Card",
            payment_status: "Completed",
            transaction_id: `TXN-${paymentTimestamp}1`,
            payment_date: new Date().toISOString().split("T")[0],
            created_by: adminId,
          },
          {
            payment_id: `PAY-${paymentTimestamp}2`,
            booking_id: reservationIds[0].id,
            customer_id: customerIds[0],
            amount: 1000.0,
            payment_method: "Bank Transfer",
            payment_status: "Completed",
            transaction_id: `TXN-${paymentTimestamp}2`,
            payment_date: new Date().toISOString().split("T")[0],
            created_by: adminId,
          },
        ];

        const insertPayment = database.prepare(`
          INSERT OR IGNORE INTO payments (
            payment_id, booking_id, customer_id, amount, payment_method,
            payment_status, transaction_id, payment_date, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const payment of payments) {
          try {
            insertPayment.run(
              payment.payment_id,
              payment.booking_id,
              payment.customer_id,
              payment.amount,
              payment.payment_method,
              payment.payment_status,
              payment.transaction_id,
              payment.payment_date,
              payment.created_by
            );
          } catch (e) {
            // Payment might already exist
          }
        }
      }
    }

    // Add additional demo payments if table is sparse
    try {
      const paymentsCount = (
        database.prepare("SELECT COUNT(*) as count FROM payments").get() as any
      ).count;
      if (paymentsCount < 4) {
        const anyReservation = database
          .prepare("SELECT id FROM reservations ORDER BY id DESC LIMIT 1")
          .get() as any;
        if (anyReservation && customerIds.length > 0) {
          const payTs = Date.now().toString().slice(-7);
          const extraPayments = [
            {
              payment_id: `PAY-${payTs}3`,
              booking_id: anyReservation.id,
              customer_id: customerIds[0],
              amount: 200.0,
              payment_method: "Cash",
              payment_status: "Completed",
              transaction_id: `TXN-${payTs}3`,
              payment_date: new Date().toISOString().split("T")[0],
              created_by: adminId,
            },
            {
              payment_id: `PAY-${payTs}4`,
              booking_id: anyReservation.id,
              customer_id: customerIds[0],
              amount: 150.0,
              payment_method: "Check",
              payment_status: "Pending",
              transaction_id: `TXN-${payTs}4`,
              payment_date: new Date().toISOString().split("T")[0],
              created_by: adminId,
            },
          ];
          const insertPaymentExtra = database.prepare(`
            INSERT OR IGNORE INTO payments (
              payment_id, booking_id, customer_id, amount, payment_method,
              payment_status, transaction_id, payment_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const p of extraPayments) {
            try {
              insertPaymentExtra.run(
                p.payment_id,
                p.booking_id,
                p.customer_id,
                p.amount,
                p.payment_method,
                p.payment_status,
                p.transaction_id,
                p.payment_date,
                p.created_by
              );
            } catch {}
          }
        }
      }
    } catch {}

    // Seed support ticket notes (only if we have tickets)
    const ticketIds = database
      .prepare("SELECT id, ticket_id FROM support_tickets LIMIT 2")
      .all() as any[];

    if (ticketIds.length > 0) {
      console.log("   Creating support ticket notes...");
      const insertNote = database.prepare(`
        INSERT OR IGNORE INTO support_ticket_notes (ticket_id, note, created_by)
        VALUES (?, ?, ?)
      `);

      for (const ticket of ticketIds) {
        try {
          insertNote.run(
            ticket.id,
            "Following up on customer request. Will provide update soon.",
            adminId
          );
        } catch (e) {
          // Note might already exist
        }
      }
    }

    // Seed sales cases (only if we have customers)
    if (customerIds.length > 0) {
      console.log("   Creating sales cases...");
      const leadIds = database
        .prepare("SELECT id FROM leads LIMIT 2")
        .all() as any[];

      const salesCaseTimestamp = Date.now().toString().slice(-8);
      const salesCases = [
        {
          case_id: `SC-${salesCaseTimestamp}1`,
          customer_id: customerIds[0],
          lead_id: leadIds.length > 0 ? leadIds[0].id : null,
          title: "Premium Travel Package",
          description: "Corporate travel package for 20 employees",
          status: "Quoted",
          case_type: "B2B",
          quotation_status: "Sent",
          value: 50000.0,
          probability: 75,
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          assigned_to: userIds["agent1@example.com"] || null,
          created_by: adminId,
        },
        {
          case_id: `SC-${salesCaseTimestamp}2`,
          customer_id: customerIds[1],
          lead_id: leadIds.length > 1 ? leadIds[1].id : null,
          title: "Family Vacation Package",
          description: "All-inclusive family vacation to Maldives",
          status: "In Progress",
          case_type: "B2C",
          quotation_status: "Draft",
          value: 15000.0,
          probability: 60,
          expected_close_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          assigned_to: userIds["agent2@example.com"] || null,
          created_by: adminId,
        },
      ];

      const insertSalesCase = database.prepare(`
        INSERT OR IGNORE INTO sales_cases (
          case_id, customer_id, lead_id, title, description, status,
          case_type, quotation_status, value, probability, expected_close_date,
          assigned_to, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const salesCaseIds: number[] = [];
      for (const salesCase of salesCases) {
        try {
          insertSalesCase.run(
            salesCase.case_id,
            salesCase.customer_id,
            salesCase.lead_id,
            salesCase.title,
            salesCase.description,
            salesCase.status,
            salesCase.case_type,
            salesCase.quotation_status,
            salesCase.value,
            salesCase.probability,
            salesCase.expected_close_date,
            salesCase.assigned_to,
            salesCase.created_by
          );
          const caseId = (
            database.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (caseId) salesCaseIds.push(caseId);
        } catch (e) {
          const existing = database
            .prepare("SELECT id FROM sales_cases WHERE case_id = ?")
            .get(salesCase.case_id) as any;
          if (existing) salesCaseIds.push(existing.id);
        }
      }
    }

    // Add additional demo sales cases if table is sparse
    try {
      const casesCount = (
        database
          .prepare("SELECT COUNT(*) as count FROM sales_cases")
          .get() as any
      ).count;
      if (casesCount < 4 && customerIds.length > 1) {
        const ts = Date.now().toString().slice(-7);
        const moreCases = [
          {
            case_id: `SC-${ts}3`,
            customer_id: customerIds[0],
            lead_id: null,
            title: "Weekend Getaway Package",
            description: "City break for two with spa access",
            status: "Open",
            case_type: "B2C",
            quotation_status: "Draft",
            value: 1200.0,
            probability: 40,
            expected_close_date: new Date(Date.now() + 14 * 86400000)
              .toISOString()
              .split("T")[0],
            assigned_to: null,
            created_by: adminId,
          },
          {
            case_id: `SC-${ts}4`,
            customer_id: customerIds[1],
            lead_id: null,
            title: "Quarterly Corporate Retreat",
            description: "Retreat planning for 35 staff",
            status: "Open",
            case_type: "B2B",
            quotation_status: "Sent",
            value: 32000.0,
            probability: 55,
            expected_close_date: new Date(Date.now() + 25 * 86400000)
              .toISOString()
              .split("T")[0],
            assigned_to: null,
            created_by: adminId,
          },
        ];
        const insertCaseExtra = database.prepare(`
          INSERT OR IGNORE INTO sales_cases (
            case_id, customer_id, lead_id, title, description, status,
            case_type, quotation_status, value, probability, expected_close_date,
            assigned_to, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of moreCases) {
          try {
            insertCaseExtra.run(
              c.case_id,
              c.customer_id,
              c.lead_id,
              c.title,
              c.description,
              c.status,
              c.case_type,
              c.quotation_status,
              c.value,
              c.probability,
              c.expected_close_date,
              c.assigned_to,
              c.created_by
            );
          } catch {}
        }
      }
    } catch {}

    // Seed property owners
    console.log("   Creating property owners...");
    const propertyTimestamp = Date.now().toString().slice(-8);
    const propertyOwners = [
      {
        owner_id: `PO-${propertyTimestamp}1`,
        company_name: "Luxury Properties LLC",
        primary_contact: "Robert Chen",
        email: "robert@luxuryprops.com",
        phone: "+1987654325",
        status: "Active",
        portfolio_size: 15,
        locations: "Dubai, Paris, Tokyo",
        manager_id: userIds["manager1@example.com"] || null,
      },
      {
        owner_id: `PO-${propertyTimestamp}2`,
        company_name: "Beachfront Realty",
        primary_contact: "Maria Garcia",
        email: "maria@beachfront.com",
        phone: "+1987654326",
        status: "Active",
        portfolio_size: 8,
        locations: "Maldives, Bali, Phuket",
        manager_id: userIds["manager1@example.com"] || null,
      },
    ];

    const insertOwner = database.prepare(`
      INSERT OR IGNORE INTO property_owners (
        owner_id, company_name, primary_contact, email, phone, status,
        portfolio_size, locations, manager_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ownerIds: number[] = [];
    for (const owner of propertyOwners) {
      try {
        insertOwner.run(
          owner.owner_id,
          owner.company_name,
          owner.primary_contact,
          owner.email,
          owner.phone,
          owner.status,
          owner.portfolio_size,
          owner.locations,
          owner.manager_id
        );
        const ownerId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (ownerId) ownerIds.push(ownerId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM property_owners WHERE owner_id = ?")
          .get(owner.owner_id) as any;
        if (existing) ownerIds.push(existing.id);
      }
    }

    // Seed properties (only if we have owners)
    if (ownerIds.length > 0) {
      console.log("   Creating properties...");
      const properties = [
        {
          property_id: `PROP-${propertyTimestamp}1`,
          owner_id: ownerIds[0],
          name: "Luxury Villa Dubai Marina",
          location: "Dubai, UAE",
          property_type: "Villa",
          status: "Available",
          nightly_rate: 500.0,
          capacity: 8,
          occupancy: 0,
          description: "Spacious 4-bedroom villa with private pool",
        },
        {
          property_id: `PROP-${propertyTimestamp}2`,
          owner_id: ownerIds[0],
          name: "Paris Apartment Champs-Élysées",
          location: "Paris, France",
          property_type: "Apartment",
          status: "Reserved",
          nightly_rate: 300.0,
          capacity: 4,
          occupancy: 2,
          description: "Elegant 2-bedroom apartment in city center",
        },
        {
          property_id: `PROP-${propertyTimestamp}3`,
          owner_id: ownerIds[1],
          name: "Beachfront Villa Maldives",
          location: "Maldives",
          property_type: "Villa",
          status: "Available",
          nightly_rate: 800.0,
          capacity: 6,
          occupancy: 0,
          description: "Private beachfront villa with ocean view",
        },
      ];

      const insertProperty = database.prepare(`
        INSERT OR IGNORE INTO properties (
          property_id, owner_id, name, location, property_type, status,
          nightly_rate, capacity, occupancy, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const propertyIds: number[] = [];
      for (const property of properties) {
        try {
          insertProperty.run(
            property.property_id,
            property.owner_id,
            property.name,
            property.location,
            property.property_type,
            property.status,
            property.nightly_rate,
            property.capacity,
            property.occupancy,
            property.description
          );
          const propId = (
            database.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (propId) propertyIds.push(propId);
        } catch (e) {
          const existing = database
            .prepare("SELECT id FROM properties WHERE property_id = ?")
            .get(property.property_id) as any;
          if (existing) propertyIds.push(existing.id);
        }
      }

      // Seed property availability (only if we have properties)
      if (propertyIds.length > 0) {
        console.log("   Creating property availability...");
        const insertAvailability = database.prepare(`
          INSERT OR IGNORE INTO property_availability (property_id, date, status)
          VALUES (?, ?, ?)
        `);

        for (const propId of propertyIds.slice(0, 2)) {
          // Add availability for next 30 days
          for (let i = 0; i < 30; i++) {
            const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
            const status = i % 7 === 0 ? "Reserved" : "Available";
            try {
              insertAvailability.run(propId, date, status);
            } catch (e) {
              // Availability might already exist
            }
          }
        }
      }
    }

    // Seed operations trips
    console.log("   Creating operations trips...");
    const timestamp2 = Date.now().toString().slice(-8);
    const operationsTrips = [
      {
        trip_code: `TRIP-${timestamp2}1`,
        booking_reference: `BR-${timestamp2}1`,
        customer_name: "Alice Johnson",
        customer_count: 2,
        itinerary: "Day 1: Arrival, Day 2-3: City Tour, Day 4: Departure",
        duration: "3 days",
        start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        destinations: "Paris, France",
        assigned_guide: "Jean Pierre",
        assigned_driver: "Marc Dubois",
        transport: "Van",
        transport_details: "Mercedes Sprinter",
        status: "Planned",
        special_requests: "Vegetarian meals required",
      },
      {
        trip_code: `TRIP-${timestamp2}2`,
        booking_reference: `BR-${timestamp2}2`,
        customer_name: "Tech Corp Group",
        customer_count: 15,
        itinerary: "Corporate team building trip",
        duration: "5 days",
        start_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        destinations: "Tokyo, Japan",
        assigned_guide: "Yuki Tanaka",
        assigned_driver: "Hiroshi Yamamoto",
        transport: "Bus",
        transport_details: "50-seater coach",
        status: "In Progress",
        special_requests: "Business class flights",
      },
    ];

    const insertTrip = database.prepare(`
      INSERT OR IGNORE INTO operations_trips (
        trip_code, booking_reference, customer_name, customer_count, itinerary,
        duration, start_date, end_date, destinations, assigned_guide,
        assigned_driver, transport, transport_details, status, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tripIds: number[] = [];
    for (const trip of operationsTrips) {
      try {
        insertTrip.run(
          trip.trip_code,
          trip.booking_reference,
          trip.customer_name,
          trip.customer_count,
          trip.itinerary,
          trip.duration,
          trip.start_date,
          trip.end_date,
          trip.destinations,
          trip.assigned_guide,
          trip.assigned_driver,
          trip.transport,
          trip.transport_details,
          trip.status,
          trip.special_requests
        );
        const tripId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (tripId) tripIds.push(tripId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM operations_trips WHERE trip_code = ?")
          .get(trip.trip_code) as any;
        if (existing) tripIds.push(existing.id);
      }
    }

    // Seed operations optional services (only if we have trips)
    if (tripIds.length > 0) {
      console.log("   Creating operations optional services...");
      const optionalServices = [
        {
          service_code: `SVC-${timestamp2}1`,
          trip_id: tripIds[0],
          service_name: "Airport Transfer",
          category: "Transportation",
          price: 150.0,
          added_by: "agent1@example.com",
          added_date: new Date().toISOString().split("T")[0],
          status: "Confirmed",
          invoiced: 1,
        },
        {
          service_code: `SVC-${timestamp2}2`,
          trip_id: tripIds[0],
          service_name: "City Tour Guide",
          category: "Tour",
          price: 200.0,
          added_by: "agent1@example.com",
          added_date: new Date().toISOString().split("T")[0],
          status: "Added",
          invoiced: 0,
        },
      ];

      const insertService = database.prepare(`
        INSERT OR IGNORE INTO operations_optional_services (
          service_code, trip_id, service_name, category, price,
          added_by, added_date, status, invoiced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const service of optionalServices) {
        try {
          insertService.run(
            service.service_code,
            service.trip_id,
            service.service_name,
            service.category,
            service.price,
            service.added_by,
            service.added_date,
            service.status,
            service.invoiced
          );
        } catch (e) {
          // Service might already exist
        }
      }
    }

    // Seed operations tasks (only if we have trips)
    if (tripIds.length > 0) {
      console.log("   Creating operations tasks...");
      const timestamp3 = Date.now().toString().slice(-8);
      const operationsTasks = [
        {
          task_id: `TASK-${timestamp3}1`,
          trip_id: tripIds[0],
          title: "Confirm hotel booking",
          trip_reference: operationsTrips[0].trip_code,
          customer_name: operationsTrips[0].customer_name,
          scheduled_at: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          location: "Paris",
          assigned_to: userIds["agent1@example.com"] || null,
          status: "Pending",
          priority: "High",
          task_type: "Booking",
        },
        {
          task_id: `TASK-${timestamp3}2`,
          trip_id: tripIds[1],
          title: "Arrange group transportation",
          trip_reference: operationsTrips[1].trip_code,
          customer_name: operationsTrips[1].customer_name,
          scheduled_at: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          location: "Tokyo",
          assigned_to: userIds["agent2@example.com"] || null,
          status: "In Progress",
          priority: "Medium",
          task_type: "Logistics",
        },
      ];

      const insertTask = database.prepare(`
        INSERT OR IGNORE INTO operations_tasks (
          task_id, trip_id, title, trip_reference, customer_name,
          scheduled_at, location, assigned_to, status, priority, task_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const task of operationsTasks) {
        try {
          insertTask.run(
            task.task_id,
            task.trip_id,
            task.title,
            task.trip_reference,
            task.customer_name,
            task.scheduled_at,
            task.location,
            task.assigned_to,
            task.status,
            task.priority,
            task.task_type
          );
        } catch (e) {
          // Task might already exist
        }
      }
    }

    // Seed categories
    console.log("   Creating categories...");
    const categories = [
      { name: "Accommodation", description: "Hotels, Resorts, Apartments" },
      {
        name: "Transportation",
        description: "Flights, Car Rentals, Transfers",
      },
      { name: "Tours", description: "City Tours, Excursions, Activities" },
      { name: "Services", description: "Visa, Insurance, Other Services" },
    ];

    const insertCategory = database.prepare(`
      INSERT OR IGNORE INTO categories (name, description)
      VALUES (?, ?)
    `);

    const categoryIds: number[] = [];
    for (const category of categories) {
      try {
        insertCategory.run(category.name, category.description);
        const catId = (
          database.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (catId) categoryIds.push(catId);
      } catch (e) {
        const existing = database
          .prepare("SELECT id FROM categories WHERE name = ?")
          .get(category.name) as any;
        if (existing) categoryIds.push(existing.id);
      }
    }

    // Seed items (only if we have categories and suppliers)
    if (categoryIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating items...");
      const timestamp4 = Date.now().toString().slice(-8);
      const items = [
        {
          item_id: `ITEM-${timestamp4}1`,
          name: "Standard Hotel Room",
          description: "Comfortable room with basic amenities",
          category_id: categoryIds[0],
          supplier_id: supplierIds[1],
          price: 150.0,
          cost: 100.0,
          stock_quantity: 50,
          min_stock_level: 10,
          status: "Active",
        },
        {
          item_id: `ITEM-${timestamp4}2`,
          name: "Economy Flight Ticket",
          description: "One-way economy class flight",
          category_id: categoryIds[1],
          supplier_id: supplierIds[0],
          price: 500.0,
          cost: 350.0,
          stock_quantity: 100,
          min_stock_level: 20,
          status: "Active",
        },
        {
          item_id: `ITEM-${timestamp4}3`,
          name: "City Tour Package",
          description: "Half-day guided city tour",
          category_id: categoryIds[2],
          supplier_id: supplierIds[0],
          price: 75.0,
          cost: 50.0,
          stock_quantity: 200,
          min_stock_level: 30,
          status: "Active",
        },
      ];

      const insertItem = database.prepare(`
        INSERT OR IGNORE INTO items (
          item_id, name, description, category_id, supplier_id,
          price, cost, stock_quantity, min_stock_level, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const itemIds: number[] = [];
      for (const item of items) {
        try {
          insertItem.run(
            item.item_id,
            item.name,
            item.description,
            item.category_id,
            item.supplier_id,
            item.price,
            item.cost,
            item.stock_quantity,
            item.min_stock_level,
            item.status
          );
          const itemId = (
            database.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (itemId) itemIds.push(itemId);
        } catch (e) {
          const existing = database
            .prepare("SELECT id FROM items WHERE item_id = ?")
            .get(item.item_id) as any;
          if (existing) itemIds.push(existing.id);
        }
      }
    }

    // Seed attendance (only if we have users)
    if (Object.keys(userIds).length > 0) {
      console.log("   Creating attendance records...");
      const insertAttendance = database.prepare(`
        INSERT OR IGNORE INTO attendance (
          user_id, clock_in, clock_out, total_hours, status
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0, 0);
        const clockOut = new Date(date);
        clockOut.setHours(17, 30, 0, 0);
        const totalHours = 8.5;

        for (const userId of Object.values(userIds).slice(0, 2)) {
          try {
            insertAttendance.run(
              userId,
              clockIn.toISOString(),
              clockOut.toISOString(),
              totalHours,
              i === 0 ? "Late" : "Present"
            );
          } catch (e) {
            // Attendance might already exist
          }
        }
      }
    }

    // Seed leave requests (only if we have users)
    if (Object.keys(userIds).length > 0) {
      console.log("   Creating leave requests...");
      const leaveRequests = [
        {
          user_id: userIds["agent1@example.com"],
          leave_type: "Vacation",
          start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          days_requested: 5,
          reason: "Family vacation",
          status: "Pending",
        },
        {
          user_id: userIds["agent2@example.com"],
          leave_type: "Sick",
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          days_requested: 3,
          reason: "Medical leave",
          status: "Approved",
          approved_by: userIds["manager1@example.com"] || null,
          approved_at: new Date().toISOString(),
        },
      ];

      const insertLeave = database.prepare(`
        INSERT OR IGNORE INTO leave_requests (
          user_id, leave_type, start_date, end_date, days_requested,
          reason, status, approved_by, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const leave of leaveRequests) {
        try {
          insertLeave.run(
            leave.user_id,
            leave.leave_type,
            leave.start_date,
            leave.end_date,
            leave.days_requested,
            leave.reason,
            leave.status,
            leave.approved_by || null,
            leave.approved_at || null
          );
        } catch (e) {
          // Leave request might already exist
        }
      }
    }

    // Seed roles
    console.log("   Creating roles...");
    const roles = [
      { name: "Super Admin", description: "Full system access" },
      { name: "Department Head", description: "Department management" },
      { name: "Team Lead", description: "Team leadership role" },
    ];

    const insertRole = database.prepare(`
      INSERT OR IGNORE INTO roles (name, description)
      VALUES (?, ?)
    `);

    for (const role of roles) {
      try {
        insertRole.run(role.name, role.description);
      } catch (e) {
        // Role might already exist
      }
    }

    // Seed notifications
    console.log("   Creating notifications...");
    const notifications = [
      {
        user_id: userIds["agent1@example.com"],
        type: "lead",
        title: "New Lead Assigned",
        message: "You have been assigned a new lead: David Lee",
        entity_type: "lead",
        entity_id: "1",
        is_read: 0,
      },
      {
        user_id: userIds["agent2@example.com"],
        type: "customer",
        title: "Customer Update",
        message: "Bob Williams updated their profile",
        entity_type: "customer",
        entity_id: "1",
        is_read: 1,
        read_at: new Date().toISOString(),
      },
      {
        user_id: userIds["manager1@example.com"],
        type: "system",
        title: "Weekly Report Ready",
        message: "Your weekly sales report is ready for review",
        entity_type: "system",
        entity_id: null,
        is_read: 0,
      },
    ];

    const insertNotification = database.prepare(`
      INSERT OR IGNORE INTO notifications (
        user_id, type, title, message, entity_type, entity_id, is_read, read_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const notification of notifications) {
      try {
        insertNotification.run(
          notification.user_id,
          notification.type,
          notification.title,
          notification.message,
          notification.entity_type,
          notification.entity_id,
          notification.is_read,
          notification.read_at || null
        );
      } catch (e) {
        // Notification might already exist
      }
    }

    // Seed activities
    console.log("   Creating activities...");
    const timestamp5 = Date.now().toString().slice(-8);
    const activities = [
      {
        activity_id: `ACT-${timestamp5}1`,
        entity_type: "customer",
        entity_id: customerIds[0]?.toString() || "1",
        activity_type: "created",
        description: "Customer created",
        details: JSON.stringify({ name: "Alice Johnson" }),
        performed_by_id: adminId,
      },
      {
        activity_id: `ACT-${timestamp5}2`,
        entity_type: "lead",
        entity_id: "1",
        activity_type: "status_changed",
        description: "Lead status changed from New to Qualified",
        details: JSON.stringify({ old_status: "New", new_status: "Qualified" }),
        performed_by_id: userIds["agent1@example.com"] || adminId,
      },
      {
        activity_id: `ACT-${timestamp5}3`,
        entity_type: "reservation",
        entity_id: "1",
        activity_type: "updated",
        description: "Reservation details updated",
        details: JSON.stringify({ field: "status", value: "Confirmed" }),
        performed_by_id: adminId,
      },
    ];

    const insertActivity = database.prepare(`
      INSERT OR IGNORE INTO activities (
        activity_id, entity_type, entity_id, activity_type, description,
        details, performed_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const activity of activities) {
      try {
        insertActivity.run(
          activity.activity_id,
          activity.entity_type,
          activity.entity_id,
          activity.activity_type,
          activity.description,
          activity.details,
          activity.performed_by_id
        );
      } catch (e) {
        // Activity might already exist
      }
    }

    console.log("✅ Test data seeded successfully");
    console.log("🔑 Test user credentials:");
    console.log("   - manager1@example.com / password");
    console.log("   - agent1@example.com / password");
    console.log("   - agent2@example.com / password");
    console.log("   - customer1@example.com / password");
  } catch (error: any) {
    console.error("❌ Failed to seed data:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    // Don't throw - allow app to continue even if seeding fails
  }
};

// Initialize database and schema with seed data
export const initializeDatabaseWithSeed = async (): Promise<void> => {
  try {
    // Initialize database connection
    initializeDatabase();

    // Initialize schema
    await initializeSchema();

    // Seed data
    await seedData();

    console.log("✅ Database fully initialized with schema and seed data");
  } catch (error: any) {
    console.error("❌ Failed to initialize database:", error.message);
    throw error;
  }
};

// Initialize on import
initializeDatabase();

// Export the function as default (not the result of calling it)
export default getDatabase;
