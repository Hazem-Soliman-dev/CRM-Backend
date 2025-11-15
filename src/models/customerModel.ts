import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Customer {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: 'Individual' | 'Corporate';
  status: 'Active' | 'Inactive' | 'Suspended';
  contact_method: 'Email' | 'Phone' | 'SMS';
  assigned_staff_id?: string;
  assigned_staff?: {
    id: string;
    full_name: string;
    email: string;
  };
  total_bookings: number;
  total_value: number;
  last_trip?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: 'Individual' | 'Corporate';
  contact_method?: 'Email' | 'Phone' | 'SMS';
  assigned_staff_id?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: 'Individual' | 'Corporate';
  status?: 'Active' | 'Inactive' | 'Suspended';
  contact_method?: 'Email' | 'Phone' | 'SMS';
  assigned_staff_id?: string;
  notes?: string;
}

export interface CustomerFilters {
  status?: string;
  type?: string;
  assigned_staff_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class CustomerModel {
  // Generate unique customer ID
  private static generateCustomerId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CU-${timestamp}${random}`;
  }

  // Create new customer
  static async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    try {
      const customer_id = this.generateCustomerId();
      
      const query = `
        INSERT INTO customers (customer_id, name, email, phone, company, type, contact_method, assigned_staff_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        customer_id,
        customerData.name,
        customerData.email,
        customerData.phone,
        customerData.company || null,
        customerData.type,
        customerData.contact_method || 'Email',
        customerData.assigned_staff_id || null,
        customerData.notes || null
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findCustomerById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create customer', 500);
    }
  }

  // Find customer by ID
  static async findCustomerById(id: string): Promise<Customer> {
    try {
      const query = `
        SELECT c.*, u.full_name as staff_name, u.email as staff_email
        FROM customers c
        LEFT JOIN users u ON c.assigned_staff_id = u.id
        WHERE c.id = ?
      `;
      
      const db = getDatabase();
      const customer = db.prepare(query).get(id) as any;
      
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
      return {
        id: customer.id,
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        status: customer.status,
        contact_method: customer.contact_method,
        assigned_staff_id: customer.assigned_staff_id,
        assigned_staff: customer.assigned_staff_id ? {
          id: customer.assigned_staff_id,
          full_name: customer.staff_name,
          email: customer.staff_email
        } : undefined,
        total_bookings: customer.total_bookings,
        total_value: customer.total_value,
        last_trip: customer.last_trip,
        notes: customer.notes,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find customer by ID', 500);
    }
  }

  // Get all customers with filtering and role-based access
  static async getAllCustomers(filters: CustomerFilters, userRole: string, userId: string): Promise<{ customers: Customer[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'customer') {
        whereConditions.push('c.id = ?');
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push('c.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.type) {
        whereConditions.push('c.type = ?');
        queryParams.push(filters.type);
      }

      if (filters.assigned_staff_id) {
        whereConditions.push('c.assigned_staff_id = ?');
        queryParams.push(filters.assigned_staff_id);
      }

      if (filters.search) {
        whereConditions.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
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
        SELECT c.*, u.full_name as staff_name, u.email as staff_email
        FROM customers c
        LEFT JOIN users u ON c.assigned_staff_id = u.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const customers = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedCustomers: Customer[] = customers.map(customer => ({
        id: customer.id,
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        status: customer.status,
        contact_method: customer.contact_method,
        assigned_staff_id: customer.assigned_staff_id,
        assigned_staff: customer.assigned_staff_id ? {
          id: customer.assigned_staff_id,
          full_name: customer.staff_name,
          email: customer.staff_email
        } : undefined,
        total_bookings: customer.total_bookings,
        total_value: customer.total_value,
        last_trip: customer.last_trip,
        notes: customer.notes,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }));

      return { customers: formattedCustomers, total };
    } catch (error) {
      throw new AppError('Failed to get customers', 500);
    }
  }

  // Update customer
  static async updateCustomer(id: string, updateData: UpdateCustomerData): Promise<Customer> {
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

      const query = `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findCustomerById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update customer', 500);
    }
  }

  // Delete customer
  static async deleteCustomer(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM customers WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Customer not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete customer', 500);
    }
  }

  // Get customer statistics
  static async getCustomerStats(customerId: string): Promise<{
    totalBookings: number;
    totalValue: number;
    lastBooking?: string;
    averageBookingValue: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(r.id) as total_bookings,
          COALESCE(SUM(p.amount), 0) as total_value,
          MAX(r.created_at) as last_booking,
          COALESCE(AVG(p.amount), 0) as avg_booking_value
        FROM customers c
        LEFT JOIN reservations r ON c.id = r.customer_id
        LEFT JOIN payments p ON r.id = p.booking_id
        WHERE c.id = ?
      `;
      
      const db = getDatabase();
      const stat = db.prepare(query).get(customerId) as any;
      
      return {
        totalBookings: stat?.total_bookings || 0,
        totalValue: stat?.total_value || 0,
        lastBooking: stat?.last_booking,
        averageBookingValue: stat?.avg_booking_value || 0
      };
    } catch (error) {
      throw new AppError('Failed to get customer statistics', 500);
    }
  }
}
