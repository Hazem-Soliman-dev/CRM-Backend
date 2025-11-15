import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config();

// Determine database path - use /tmp for Vercel serverless, local file for development
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel 
  ? '/tmp/database.db'
  : path.join(process.cwd(), 'database.db');

// Create database instance
let db: Database.Database;
let schemaInitialized = false;

// Check if a table exists
const tableExists = (database: Database.Database, tableName: string): boolean => {
  try {
    const result = database.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName) as any;
    return !!result;
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
    const database = getDatabase();
    
    // Check if users table exists (indicates schema is initialized)
    if (tableExists(database, 'users')) {
      schemaInitialized = true;
      console.log('ℹ️  Database schema already exists');
      
      // Check if admin user exists
      const adminExists = database.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@example.com') as any;
      
      if (adminExists.count === 0) {
        console.log('👤 Creating default admin user...');
        
        // Hash password for admin user (password: 'password')
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('password', saltRounds);
        
        // Insert default admin user
        database.prepare(`
          INSERT INTO users (email, password, full_name, role, status) 
          VALUES (?, ?, ?, ?, ?)
        `).run('admin@example.com', hashedPassword, 'System Administrator', 'admin', 'active');
        
        console.log('✅ Default admin user created');
        console.log('   Email: admin@example.com');
        console.log('   Password: password');
      }
      
      return;
    }

    console.log('📋 Initializing database schema...');
    
    // Read and execute schema
    // Try multiple possible paths (for both development and compiled code)
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'sqlite_schema.sql'), // From compiled dist folder
      path.join(process.cwd(), 'sqlite_schema.sql'), // From project root
      path.join(process.cwd(), 'backend', 'sqlite_schema.sql'), // If running from project root
    ];
    
    let schemaPath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        schemaPath = possiblePath;
        console.log(`📄 Found schema file at: ${schemaPath}`);
        break;
      }
    }
    
    if (!schemaPath) {
      console.error('❌ Schema file not found. Tried paths:');
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      throw new Error(`Schema file not found. Tried: ${possiblePaths.join(', ')}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    database.exec(schema);
    console.log('✅ Database schema created successfully');
    
    // Create default admin user
    console.log('👤 Creating default admin user...');
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password', saltRounds);
    
    database.prepare(`
      INSERT INTO users (email, password, full_name, role, status) 
      VALUES (?, ?, ?, ?, ?)
    `).run('admin@example.com', hashedPassword, 'System Administrator', 'admin', 'active');
    
    console.log('✅ Default admin user created');
    console.log('   Email: admin@example.com');
    console.log('   Password: password');
    
    // Create default workspace settings
    const settingsExists = database.prepare('SELECT COUNT(*) as count FROM system_settings WHERE workspace_id = ?').get('default') as any;
    
    if (settingsExists.count === 0) {
      console.log('⚙️  Creating default workspace settings...');
      
      database.prepare(`
        INSERT INTO system_settings (
          workspace_id, default_currency, default_timezone, default_language,
          pipeline_mode, lead_alerts, ticket_updates, daily_digest,
          task_reminders, compact_mode, high_contrast, theme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'default', 'USD', 'UTC', 'en', 'standard', 1, 0, 1, 1, 0, 0, 'light'
      );
      
      console.log('✅ Default workspace settings created');
    }
    
    // Seed permissions and role_permissions if empty
    const permissionsCount = database.prepare('SELECT COUNT(*) as count FROM permissions').get() as any;
    if (permissionsCount.count === 0) {
      console.log('🔐 Seeding permissions...');
      
      // Define all modules and their permissions
      const modules = [
        'leads', 'customers', 'reservations', 'support', 'attendance',
        'properties', 'owners', 'operations', 'notifications', 'settings',
        'categories', 'items', 'suppliers', 'sales-cases', 'departments',
        'roles', 'activities'
      ];
      
      const actions = ['read', 'create', 'update', 'delete', 'manage'];
      
      // Insert permissions
      const insertPermission = database.prepare(`
        INSERT INTO permissions (name, module, action, description)
        VALUES (?, ?, ?, ?)
      `);
      
      const permissionMap: { [key: string]: number } = {};
      
      for (const module of modules) {
        for (const action of actions) {
          const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`;
          const description = `Permission to ${action} ${module}`;
          
          insertPermission.run(name, module, action, description);
          const permId = (database.prepare('SELECT last_insert_rowid() as id').get() as any).id;
          permissionMap[`${module}:${action}`] = permId;
        }
      }
      
      console.log(`   Created ${Object.keys(permissionMap).length} permissions`);
      
      // Assign permissions to roles
      const insertRolePerm = database.prepare(`
        INSERT OR IGNORE INTO role_permissions (role, permission_id)
        VALUES (?, ?)
      `);
      
      // Assign all permissions to admin role
      let adminCount = 0;
      for (const permId of Object.values(permissionMap)) {
        insertRolePerm.run('admin', permId);
        adminCount++;
      }
      console.log(`   Assigned ${adminCount} permissions to admin role`);
      
      // Assign read permissions to manager, agent, and customer roles
      const readPermissions = Object.entries(permissionMap)
        .filter(([key]) => key.endsWith(':read'))
        .map(([, id]) => id);
      
      for (const role of ['manager', 'agent', 'customer']) {
        let roleCount = 0;
        for (const permId of readPermissions) {
          insertRolePerm.run(role, permId);
          roleCount++;
        }
        console.log(`   Assigned ${roleCount} read permissions to ${role} role`);
      }
      
      console.log('✅ Permissions seeded successfully');
    }
    
    schemaInitialized = true;
  } catch (error: any) {
    console.error('❌ Failed to initialize database schema:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
};

// Initialize database connection
export const initializeDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  try {
    // Ensure directory exists for local development
    if (!isVercel) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Optimize for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    
    console.log('✅ SQLite database initialized');
    console.log(`   Path: ${dbPath}`);
    
    return db;
  } catch (error: any) {
    console.error('❌ Failed to initialize database:', error.message);
    throw error;
  }
};

// Get database instance
export const getDatabase = (): Database.Database => {
  if (!db) {
    return initializeDatabase();
  }
  return db;
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    // Test with a simple query
    database.prepare('SELECT 1 as test').get();
    console.log('✅ Database connection successful');
    console.log(`   Path: ${dbPath}`);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Health check for periodic monitoring
export const healthCheck = async (): Promise<{ healthy: boolean; message: string }> => {
  try {
    const database = getDatabase();
    database.prepare('SELECT 1 as test').get();
    return { healthy: true, message: 'Database connection is healthy' };
  } catch (error: any) {
    return { 
      healthy: false, 
      message: `Database connection failed: ${error.message || 'Unknown error'}` 
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

// Initialize on import
initializeDatabase();

// Export the function as default (not the result of calling it)
export default getDatabase;
