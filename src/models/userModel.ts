import getDatabase from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError, NotFoundError, ConflictError } from '../utils/AppError';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'customer' | 'sales' | 'reservation' | 'finance' | 'operations';
  department?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'customer' | 'sales' | 'reservation' | 'finance' | 'operations';
  department?: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  full_name?: string;
  phone?: string;
  role?: 'admin' | 'customer' | 'sales' | 'reservation' | 'finance' | 'operations';
  department?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive';
}

export class UserModel {
  // Create new user
  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const query = `
        INSERT INTO users (email, password, full_name, phone, role, department, avatar_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `;

      const db = getDatabase();
      db.prepare(query).run(
        userData.email,
        hashedPassword,
        userData.full_name,
        userData.phone || null,
        userData.role,
        userData.department || null,
        userData.avatar_url || null
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findUserById(insertId.toString());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create user', 500);
    }
  }

  // Find user by email
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, full_name, phone, role, department, avatar_url, status, 
               last_login, created_at, updated_at
        FROM users 
        WHERE email = ?
      `;
      
      const db = getDatabase();
      const user = db.prepare(query).get(email) as User | undefined;
      
      return user || null;
    } catch (error) {
      throw new AppError('Failed to find user by email', 500);
    }
  }

  // Find user by ID
  static async findUserById(id: string): Promise<User> {
    try {
      const query = `
        SELECT id, email, full_name, phone, role, department, avatar_url, status, 
               last_login, created_at, updated_at
        FROM users 
        WHERE id = ?
      `;
      
      const db = getDatabase();
      const user = db.prepare(query).get(id) as User | undefined;
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find user by ID', 500);
    }
  }

  // Get all users with role-based filtering
  static async getAllUsers(userRole: string, userId: string): Promise<User[]> {
    try {
      let query = `
        SELECT id, email, full_name, phone, role, department, avatar_url, status, 
               last_login, created_at, updated_at
        FROM users
      `;

      const db = getDatabase();
      // Role-based filtering
      if (userRole !== 'admin') {
        query += ' WHERE id = ?';
        const users = db.prepare(query).all(userId) as User[];
        return users;
      }

      const users = db.prepare(query).all() as User[];
      return users;
    } catch (error) {
      throw new AppError('Failed to get users', 500);
    }
  }

  // Update user
  static async updateUser(id: string, updateData: UpdateUserData): Promise<User> {
    try {
      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
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

      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findUserById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update user', 500);
    }
  }

  // Delete user
  static async deleteUser(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('User not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete user', 500);
    }
  }

  // Verify password
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password, full_name, phone, role, department, avatar_url, status FROM users WHERE email = ?';
      const db = getDatabase();
      const user = db.prepare(query).get(email) as any;

      if (!user) {
        return null;
      }

      // Check if password field exists and is valid
      if (!user.password) {
        console.error('Password field is missing for user:', email);
        return null;
      }

      // Compare password with stored hash
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return null;
      }

      // Remove password from returned user
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error: any) {
      console.error('Error in verifyPassword:', error.message);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        email: email
      });
      throw new AppError(`Failed to verify password: ${error.message || 'Unknown error'}`, 500);
    }
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    try {
      const query = "UPDATE users SET last_login = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(id);
    } catch (error) {
      throw new AppError('Failed to update last login', 500);
    }
  }

  // Update password
  static async updatePassword(id: string, newPassword: string): Promise<void> {
    try {
      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const query = "UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(hashedPassword, id);
    } catch (error) {
      throw new AppError('Failed to update password', 500);
    }
  }
}
