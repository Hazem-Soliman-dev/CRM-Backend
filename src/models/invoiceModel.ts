import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Invoice {
  id: string;
  invoice_id: string;
  booking_id: string;
  booking?: {
    id: string;
    reservation_id: string;
    customer_id: string;
    customer_name: string;
    destination: string;
    total_amount: number;
  };
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  amount: number;
  due_date: string;
  payment_terms?: string;
  status: 'Draft' | 'Issued' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
  created_by: string;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceData {
  booking_id: string;
  customer_id: string;
  amount: number;
  due_date: string;
  payment_terms?: string;
  status?: 'Draft' | 'Issued' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
}

export interface UpdateInvoiceData {
  amount?: number;
  due_date?: string;
  payment_terms?: string;
  status?: 'Draft' | 'Issued' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
}

export interface InvoiceFilters {
  status?: string;
  customer_id?: string;
  booking_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class InvoiceModel {
  // Generate unique invoice ID
  private static generateInvoiceId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}${random}`;
  }

  // Create new invoice
  static async createInvoice(invoiceData: CreateInvoiceData, createdBy: string): Promise<Invoice> {
    try {
      const invoice_id = this.generateInvoiceId();
      
      const query = `
        INSERT INTO invoices (
          invoice_id, booking_id, customer_id, amount, due_date,
          payment_terms, status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        invoice_id,
        invoiceData.booking_id,
        invoiceData.customer_id,
        invoiceData.amount,
        invoiceData.due_date,
        invoiceData.payment_terms || null,
        invoiceData.status || 'Draft',
        invoiceData.notes || null,
        createdBy
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findInvoiceById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create invoice', 500);
    }
  }

  // Find invoice by ID
  static async findInvoiceById(id: string): Promise<Invoice> {
    try {
      const query = `
        SELECT i.*, 
               r.reservation_id, r.destination, r.total_amount as booking_total,
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u.full_name as created_by_name, u.email as created_by_email
        FROM invoices i
        LEFT JOIN reservations r ON i.booking_id = r.id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.id = ?
      `;
      
      const db = getDatabase();
      const invoice = db.prepare(query).get(id) as any;
      
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }
      return {
        id: invoice.id.toString(),
        invoice_id: invoice.invoice_id,
        booking_id: invoice.booking_id.toString(),
        booking: {
          id: invoice.booking_id,
          reservation_id: invoice.reservation_id,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          destination: invoice.destination,
          total_amount: invoice.booking_total
        },
        customer_id: invoice.customer_id,
        customer: {
          id: invoice.customer_id,
          name: invoice.customer_name,
          email: invoice.customer_email,
          phone: invoice.customer_phone
        },
        amount: invoice.amount,
        due_date: invoice.due_date,
        payment_terms: invoice.payment_terms,
        status: invoice.status,
        notes: invoice.notes,
        created_by: invoice.created_by,
        created_by_user: {
          id: invoice.created_by,
          full_name: invoice.created_by_name,
          email: invoice.created_by_email
        },
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find invoice by ID', 500);
    }
  }

  // Get all invoices with filtering
  static async getAllInvoices(filters: InvoiceFilters, userRole: string, userId: string): Promise<{ invoices: Invoice[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'customer') {
        whereConditions.push('i.customer_id = ?');
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push('i.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.customer_id) {
        whereConditions.push('i.customer_id = ?');
        queryParams.push(filters.customer_id);
      }

      if (filters.booking_id) {
        whereConditions.push('i.booking_id = ?');
        queryParams.push(filters.booking_id);
      }

      if (filters.created_by) {
        whereConditions.push('i.created_by = ?');
        queryParams.push(filters.created_by);
      }

      if (filters.date_from) {
        whereConditions.push('i.created_at >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('i.created_at <= ?');
        queryParams.push(filters.date_to);
      }

      if (filters.search) {
        whereConditions.push('(c.name LIKE ? OR c.email LIKE ? OR i.invoice_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ${whereClause}
      `;
      const db = getDatabase();
      
      // Filter out undefined values for count query
      const countParams = queryParams.filter(p => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult.total;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT i.*, 
               r.reservation_id, r.destination, r.total_amount as booking_total,
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u.full_name as created_by_name, u.email as created_by_email
        FROM invoices i
        LEFT JOIN reservations r ON i.booking_id = r.id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.created_by = u.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [...queryParams.filter(p => p !== undefined), limit, offset];
      const invoices = db.prepare(query).all(...allParams) as any[];

      const formattedInvoices: Invoice[] = invoices.map(invoice => ({
        id: invoice.id.toString(),
        invoice_id: invoice.invoice_id,
        booking_id: invoice.booking_id.toString(),
        booking: {
          id: invoice.booking_id,
          reservation_id: invoice.reservation_id,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          destination: invoice.destination,
          total_amount: invoice.booking_total
        },
        customer_id: invoice.customer_id,
        customer: {
          id: invoice.customer_id,
          name: invoice.customer_name,
          email: invoice.customer_email,
          phone: invoice.customer_phone
        },
        amount: invoice.amount,
        due_date: invoice.due_date,
        payment_terms: invoice.payment_terms,
        status: invoice.status,
        notes: invoice.notes,
        created_by: invoice.created_by,
        created_by_user: {
          id: invoice.created_by,
          full_name: invoice.created_by_name,
          email: invoice.created_by_email
        },
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      }));

      return { invoices: formattedInvoices, total };
    } catch (error) {
      throw new AppError('Failed to get invoices', 500);
    }
  }

  // Update invoice
  static async updateInvoice(id: string, updateData: UpdateInvoiceData): Promise<Invoice> {
    try {
      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert snake_case to snake_case for database columns
          const dbKey = key; // status, amount, etc. are already in correct format
          fields.push(`${dbKey} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const query = `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      const result = db.prepare(query).run(...values);
      
      console.log(`Updated invoice ${id}:`, { changes: result.changes, updateData });
      
      if (result.changes === 0) {
        throw new NotFoundError('Invoice not found');
      }

      return await this.findInvoiceById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update invoice', 500);
    }
  }

  // Delete invoice
  static async deleteInvoice(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM invoices WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Invoice not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete invoice', 500);
    }
  }

  // Get invoices by booking
  static async getInvoicesByBooking(bookingId: string, filters: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }> {
    const bookingFilters = { ...filters, booking_id: bookingId };
    return await this.getAllInvoices(bookingFilters, 'admin', '');
  }
}

