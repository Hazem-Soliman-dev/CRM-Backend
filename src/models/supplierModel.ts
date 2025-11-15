import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  services?: string;
  status: 'Active' | 'Inactive';
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  services?: string;
}

export interface UpdateSupplierData {
  name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  services?: string;
  status?: 'Active' | 'Inactive';
}

export interface SupplierFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class SupplierModel {
  // Create new supplier
  static async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    try {
      const query = `
        INSERT INTO suppliers (name, contact_person, phone, email, address, services)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        supplierData.name,
        supplierData.contact_person || null,
        supplierData.phone || null,
        supplierData.email || null,
        supplierData.address || null,
        supplierData.services || null
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findSupplierById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create supplier', 500);
    }
  }

  // Find supplier by ID
  static async findSupplierById(id: string): Promise<Supplier> {
    try {
      const query = `
        SELECT s.*, COUNT(i.id) as total_items
        FROM suppliers s
        LEFT JOIN items i ON s.id = i.supplier_id
        WHERE s.id = ?
        GROUP BY s.id
      `;
      
      const db = getDatabase();
      const supplier = db.prepare(query).get(id) as any;
      
      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }
      return {
        id: supplier.id.toString(),
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        services: supplier.services,
        status: supplier.status,
        total_items: supplier.total_items || 0,
        created_at: supplier.created_at,
        updated_at: supplier.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find supplier by ID', 500);
    }
  }

  // Get all suppliers with filtering
  static async getAllSuppliers(filters: SupplierFilters = {}): Promise<{ suppliers: Supplier[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Apply filters
      if (filters.status) {
        whereConditions.push('s.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.search) {
        whereConditions.push('(s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ? OR s.services LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM suppliers s
        ${whereClause}
      `;
      const db = getDatabase();
      const countResult = db.prepare(countQuery).get(...queryParams) as any;
      const total = countResult.total;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT s.*, COUNT(i.id) as total_items
        FROM suppliers s
        LEFT JOIN items i ON s.id = i.supplier_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.name ASC
        LIMIT ? OFFSET ?
      `;

      const suppliers = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedSuppliers: Supplier[] = suppliers.map(supplier => ({
        id: supplier.id.toString(),
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        services: supplier.services,
        status: supplier.status,
        total_items: supplier.total_items || 0,
        created_at: supplier.created_at,
        updated_at: supplier.updated_at
      }));

      return { suppliers: formattedSuppliers, total };
    } catch (error) {
      throw new AppError('Failed to get suppliers', 500);
    }
  }

  // Update supplier
  static async updateSupplier(id: string, updateData: UpdateSupplierData): Promise<Supplier> {
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

      const query = `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findSupplierById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update supplier', 500);
    }
  }

  // Delete supplier
  static async deleteSupplier(id: string): Promise<void> {
    try {
      // Check if supplier is used by items
      const db = getDatabase();
      const itemsQuery = 'SELECT COUNT(*) as count FROM items WHERE supplier_id = ?';
      const itemsResult = db.prepare(itemsQuery).get(id) as any;
      const itemsCount = itemsResult.count;

      if (itemsCount > 0) {
        throw new AppError('Cannot delete supplier that is used by items', 400);
      }

      const query = 'DELETE FROM suppliers WHERE id = ?';
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Supplier not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete supplier', 500);
    }
  }

  // Update supplier status
  static async updateSupplierStatus(id: string, status: 'Active' | 'Inactive'): Promise<Supplier> {
    try {
      const query = "UPDATE suppliers SET status = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(status, id);

      return await this.findSupplierById(id);
    } catch (error) {
      throw new AppError('Failed to update supplier status', 500);
    }
  }

  // Get supplier statistics
  static async getSupplierStats(supplierId: string): Promise<{
    totalItems: number;
    activeItems: number;
    totalValue: number;
    averageItemPrice: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(i.id) as total_items,
          COUNT(CASE WHEN i.status = 'Active' THEN 1 END) as active_items,
          COALESCE(SUM(i.price * i.stock_quantity), 0) as total_value,
          COALESCE(AVG(i.price), 0) as avg_item_price
        FROM suppliers s
        LEFT JOIN items i ON s.id = i.supplier_id
        WHERE s.id = ?
      `;
      
      const db = getDatabase();
      const stat = db.prepare(query).get(supplierId) as any;
      
      return {
        totalItems: stat?.total_items || 0,
        activeItems: stat?.active_items || 0,
        totalValue: stat?.total_value || 0,
        averageItemPrice: stat?.avg_item_price || 0
      };
    } catch (error) {
      throw new AppError('Failed to get supplier statistics', 500);
    }
  }

  // Get all supplier statistics
  static async getAllSupplierStats(): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    inactiveSuppliers: number;
    totalItems: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(s.id) as total_suppliers,
          COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active_suppliers,
          COUNT(CASE WHEN s.status = 'Inactive' THEN 1 END) as inactive_suppliers,
          COUNT(i.id) as total_items
        FROM suppliers s
        LEFT JOIN items i ON s.id = i.supplier_id
      `;
      
      const db = getDatabase();
      const stat = db.prepare(query).get() as any;
      
      return {
        totalSuppliers: stat?.total_suppliers || 0,
        activeSuppliers: stat?.active_suppliers || 0,
        inactiveSuppliers: stat?.inactive_suppliers || 0,
        totalItems: stat?.total_items || 0
      };
    } catch (error) {
      throw new AppError('Failed to get supplier statistics', 500);
    }
  }
}
