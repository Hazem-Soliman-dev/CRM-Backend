import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  manager_id?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  manager_id?: string;
}

export class DepartmentModel {
  // Get all departments
  static async getAllDepartments(): Promise<Department[]> {
    try {
      const db = getDatabase();
      const query = `SELECT * FROM departments ORDER BY name ASC`;
      return db.prepare(query).all() as Department[];
    } catch (error) {
      throw new AppError('Failed to get departments', 500);
    }
  }

  // Get department by ID
  static async getDepartmentById(id: string): Promise<Department> {
    try {
      const db = getDatabase();
      const query = `SELECT * FROM departments WHERE id = ?`;
      const department = db.prepare(query).get(id) as Department | undefined;

      if (!department) {
        throw new NotFoundError('Department not found');
      }

      return department;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get department', 500);
    }
  }

  // Create department
  static async createDepartment(data: CreateDepartmentData): Promise<Department> {
    try {
      const db = getDatabase();
      const query = `
        INSERT INTO departments (name, description, manager_id, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `;

      db.prepare(query).run(
        data.name,
        data.description || null,
        data.manager_id || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.getDepartmentById(insertId.id.toString());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create department', 500);
    }
  }

  // Update department
  static async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department> {
    try {
      const fields = [];
      const values = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
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
      const query = `UPDATE departments SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);

      return await this.getDepartmentById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update department', 500);
    }
  }

  // Delete department
  static async deleteDepartment(id: string): Promise<void> {
    try {
      const db = getDatabase();
      const query = 'DELETE FROM departments WHERE id = ?';
      const result = db.prepare(query).run(id);

      if (result.changes === 0) {
        throw new NotFoundError('Department not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete department', 500);
    }
  }
}

