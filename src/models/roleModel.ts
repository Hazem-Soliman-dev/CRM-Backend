import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

export class RoleModel {
  // Get all roles
  static async getAllRoles(): Promise<Role[]> {
    try {
      const db = getDatabase();
      const query = `SELECT * FROM roles ORDER BY name ASC`;
      return db.prepare(query).all() as Role[];
    } catch (error) {
      throw new AppError('Failed to get roles', 500);
    }
  }

  // Get role by ID
  static async getRoleById(id: string): Promise<Role> {
    try {
      const db = getDatabase();
      const query = `SELECT * FROM roles WHERE id = ?`;
      const role = db.prepare(query).get(id) as Role | undefined;

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      return role;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get role', 500);
    }
  }

  // Create role
  static async createRole(data: CreateRoleData): Promise<Role> {
    try {
      const db = getDatabase();
      const query = `
        INSERT INTO roles (name, description, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `;

      db.prepare(query).run(
        data.name,
        data.description || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.getRoleById(insertId.id.toString());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create role', 500);
    }
  }

  // Update role
  static async updateRole(id: string, data: UpdateRoleData): Promise<Role> {
    try {
      const fields = [];
      const values = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const db = getDatabase();
      const query = `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);

      return await this.getRoleById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update role', 500);
    }
  }

  // Delete role
  static async deleteRole(id: string): Promise<void> {
    try {
      const db = getDatabase();
      // Check if role is in use
      const checkQuery = 'SELECT COUNT(*) as count FROM users WHERE role = ?';
      const result = db.prepare(checkQuery).get(id) as any;

      if ((result?.count || 0) > 0) {
        throw new AppError('Cannot delete role in use', 400);
      }

      const query = 'DELETE FROM roles WHERE id = ?';
      const deleteResult = db.prepare(query).run(id);

      if (deleteResult.changes === 0) {
        throw new NotFoundError('Role not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete role', 500);
    }
  }
}

