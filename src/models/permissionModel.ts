import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  created_at: string;
}

export interface ModulePermissions {
  module: string;
  permissions: Permission[];
}

export class PermissionModel {
  // Get all permissions
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const db = getDatabase();
      const query = 'SELECT * FROM permissions ORDER BY module, action';
      return db.prepare(query).all() as Permission[];
    } catch (error) {
      throw new AppError('Failed to get permissions', 500);
    }
  }

  // Get permissions by module
  static async getPermissionsByModule(module: string): Promise<Permission[]> {
    try {
      const db = getDatabase();
      const query = 'SELECT * FROM permissions WHERE module = ? ORDER BY action';
      return db.prepare(query).all(module) as Permission[];
    } catch (error) {
      throw new AppError('Failed to get module permissions', 500);
    }
  }

  // Get permissions by role
  static async getRolePermissions(role: string): Promise<Permission[]> {
    try {
      const db = getDatabase();
      const query = `
        SELECT p.* 
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = ?
        ORDER BY p.module, p.action
      `;
      return db.prepare(query).all(role) as Permission[];
    } catch (error) {
      throw new AppError('Failed to get role permissions', 500);
    }
  }

  // Check if role has specific permission
  static async hasPermission(role: string, module: string, action: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const query = `
        SELECT COUNT(*) as count
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = ? AND p.module = ? AND p.action = ?
      `;
      const result = db.prepare(query).get(role, module, action) as any;
      return (result?.count || 0) > 0;
    } catch (error) {
      throw new AppError('Failed to check permission', 500);
    }
  }

  // Get all modules with their permissions
  static async getModulePermissions(): Promise<ModulePermissions[]> {
    try {
      const db = getDatabase();
      const query = `
        SELECT module, id, name, action, description
        FROM permissions 
        ORDER BY module, action
      `;
      const rows = db.prepare(query).all() as any[];
      
      // Group by module in JavaScript
      const moduleMap = new Map<string, Permission[]>();
      for (const row of rows) {
        if (!moduleMap.has(row.module)) {
          moduleMap.set(row.module, []);
        }
        moduleMap.get(row.module)!.push({
          id: row.id.toString(),
          name: row.name,
          module: row.module,
          action: row.action,
          description: row.description || undefined,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      }
      
      return Array.from(moduleMap.entries()).map(([module, permissions]) => ({
        module,
        permissions
      }));
    } catch (error) {
      throw new AppError('Failed to get module permissions', 500);
    }
  }

  // Create permission
  static async createPermission(permissionData: {
    name: string;
    module: string;
    action: string;
    description?: string;
  }): Promise<Permission> {
    try {
      const db = getDatabase();
      const query = `
        INSERT INTO permissions (name, module, action, description)
        VALUES (?, ?, ?, ?)
      `;
      db.prepare(query).run(
        permissionData.name,
        permissionData.module,
        permissionData.action,
        permissionData.description || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findPermissionById(insertId.id.toString());
    } catch (error) {
      throw new AppError('Failed to create permission', 500);
    }
  }

  // Find permission by ID
  static async findPermissionById(id: string): Promise<Permission> {
    try {
      const db = getDatabase();
      const query = 'SELECT * FROM permissions WHERE id = ?';
      const permission = db.prepare(query).get(id) as Permission | undefined;
      
      if (!permission) {
        throw new NotFoundError('Permission not found');
      }
      
      return permission;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find permission', 500);
    }
  }

  // Assign permission to role
  static async assignPermissionToRole(role: string, permissionId: string): Promise<void> {
    try {
      const db = getDatabase();
      const query = `
        INSERT OR IGNORE INTO role_permissions (role, permission_id)
        VALUES (?, ?)
      `;
      db.prepare(query).run(role, permissionId);
    } catch (error) {
      throw new AppError('Failed to assign permission to role', 500);
    }
  }

  // Remove permission from role
  static async removePermissionFromRole(role: string, permissionId: string): Promise<void> {
    try {
      const db = getDatabase();
      const query = 'DELETE FROM role_permissions WHERE role = ? AND permission_id = ?';
      db.prepare(query).run(role, permissionId);
    } catch (error) {
      throw new AppError('Failed to remove permission from role', 500);
    }
  }

  // Get role permissions summary
  static async getRolePermissionsSummary(): Promise<{ role: string; permissions: string[] }[]> {
    try {
      const db = getDatabase();
      const query = `
        SELECT rp.role, p.module, p.action
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        ORDER BY rp.role, p.module, p.action
      `;
      const rows = db.prepare(query).all() as any[];
      
      // Group by role in JavaScript
      const roleMap = new Map<string, string[]>();
      for (const row of rows) {
        if (!roleMap.has(row.role)) {
          roleMap.set(row.role, []);
        }
        roleMap.get(row.role)!.push(`${row.module}:${row.action}`);
      }
      
      return Array.from(roleMap.entries()).map(([role, permissions]) => ({
        role,
        permissions
      }));
    } catch (error) {
      throw new AppError('Failed to get role permissions summary', 500);
    }
  }
}
