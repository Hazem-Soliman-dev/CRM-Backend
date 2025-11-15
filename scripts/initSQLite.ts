import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

// Determine database path - use /tmp for Vercel serverless, local file for development
const isVercel = process.env.VERCEL === "1";
const dbPath = isVercel
  ? "/tmp/database.db"
  : path.join(process.cwd(), "database.db");

// Read SQL schema file
const schemaPath = path.join(__dirname, "..", "sqlite_schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

// Initialize database
const initDatabase = async () => {
  let db: Database.Database | null = null;

  try {
    console.log("🚀 Initializing SQLite database...");

    // Ensure directory exists for local development
    if (!isVercel) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Open database connection (synchronous operation)
    db = new Database(dbPath);

    // Enable foreign keys (synchronous operations)
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    console.log(`📁 Database path: ${dbPath}`);

    // Execute schema (synchronous operation)
    console.log("📋 Creating tables...");
    db.exec(schema);
    console.log("✅ Tables created successfully");

    // Check if admin user exists (synchronous operation)
    const adminExists = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE email = ?")
      .get("admin@example.com") as any;

    if (adminExists.count === 0) {
      console.log("👤 Creating default admin user...");

      // Hash password for admin user (password: 'password')
      // Note: bcrypt.hash() is async, so we await it before using with synchronous DB operations
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash("password", saltRounds);

      // Insert default admin user (synchronous operation after async hash completes)
      db.prepare(
        `
        INSERT INTO users (email, password, full_name, role, status) 
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(
        "admin@example.com",
        hashedPassword,
        "System Administrator",
        "admin",
        "active"
      );

      console.log("✅ Default admin user created");
      console.log("   Email: admin@example.com");
      console.log("   Password: password");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // Check if workspace settings exist (synchronous operation)
    const settingsExists = db
      .prepare(
        "SELECT COUNT(*) as count FROM system_settings WHERE workspace_id = ?"
      )
      .get("default") as any;

    if (settingsExists.count === 0) {
      console.log("⚙️  Creating default workspace settings...");

      db.prepare(
        `
        INSERT INTO system_settings (
          workspace_id, default_currency, default_timezone, default_language,
          pipeline_mode, lead_alerts, ticket_updates, daily_digest,
          task_reminders, compact_mode, high_contrast, theme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
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

    db.close();
    db = null;
    console.log("✅ Database initialization complete!");
  } catch (error: any) {
    console.error("❌ Database initialization failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (db) {
      try {
        db.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    process.exit(1);
  }
};

// Run initialization and handle promise rejection
initDatabase().catch((error) => {
  console.error("❌ Unhandled error during database initialization:", error);
  process.exit(1);
});
