import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Payment {
  id: string;
  payment_id: string;
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
  payment_method: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Check' | 'Other';
  payment_status: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'Partially Refunded';
  transaction_id?: string;
  payment_date: string;
  due_date?: string;
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

export interface CreatePaymentData {
  booking_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Check' | 'Other';
  payment_status?: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'Partially Refunded';
  transaction_id?: string;
  payment_date: string;
  due_date?: string;
  notes?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  payment_method?: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Check' | 'Other';
  payment_status?: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'Partially Refunded';
  transaction_id?: string;
  payment_date?: string;
  due_date?: string;
  notes?: string;
}

export interface PaymentFilters {
  payment_status?: string;
  payment_method?: string;
  customer_id?: string;
  booking_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PaymentModel {
  // Generate unique payment ID
  private static generatePaymentId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY-${timestamp}${random}`;
  }

  // Create new payment
  static async createPayment(paymentData: CreatePaymentData, createdBy: string): Promise<Payment> {
    try {
      const payment_id = this.generatePaymentId();
      
      const query = `
        INSERT INTO payments (
          payment_id, booking_id, customer_id, amount, payment_method,
          payment_status, transaction_id, payment_date, due_date, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        payment_id,
        paymentData.booking_id,
        paymentData.customer_id,
        paymentData.amount,
        paymentData.payment_method,
        paymentData.payment_status || 'Pending',
        paymentData.transaction_id || null,
        paymentData.payment_date,
        paymentData.due_date || null,
        paymentData.notes || null,
        createdBy
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findPaymentById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create payment', 500);
    }
  }

  // Find payment by ID
  static async findPaymentById(id: string): Promise<Payment> {
    try {
      const query = `
        SELECT p.*, 
               r.reservation_id, r.destination, r.total_amount as booking_total,
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u.full_name as created_by_name, u.email as created_by_email
        FROM payments p
        LEFT JOIN reservations r ON p.booking_id = r.id
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ?
      `;
      
      const db = getDatabase();
      const payment = db.prepare(query).get(id) as any;
      
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }
      return {
        id: payment.id,
        payment_id: payment.payment_id,
        booking_id: payment.booking_id,
        booking: {
          id: payment.booking_id,
          reservation_id: payment.reservation_id,
          customer_id: payment.customer_id,
          customer_name: payment.customer_name,
          destination: payment.destination,
          total_amount: payment.booking_total
        },
        customer_id: payment.customer_id,
        customer: {
          id: payment.customer_id,
          name: payment.customer_name,
          email: payment.customer_email,
          phone: payment.customer_phone
        },
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
        transaction_id: payment.transaction_id,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        notes: payment.notes,
        created_by: payment.created_by,
        created_by_user: {
          id: payment.created_by,
          full_name: payment.created_by_name,
          email: payment.created_by_email
        },
        created_at: payment.created_at,
        updated_at: payment.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find payment by ID', 500);
    }
  }

  // Get all payments with filtering
  static async getAllPayments(filters: PaymentFilters, userRole: string, userId: string): Promise<{ payments: Payment[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'customer') {
        whereConditions.push('p.customer_id = ?');
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.payment_status) {
        whereConditions.push('p.payment_status = ?');
        queryParams.push(filters.payment_status);
      }

      if (filters.payment_method) {
        whereConditions.push('p.payment_method = ?');
        queryParams.push(filters.payment_method);
      }

      if (filters.customer_id) {
        whereConditions.push('p.customer_id = ?');
        queryParams.push(filters.customer_id);
      }

      if (filters.booking_id) {
        whereConditions.push('p.booking_id = ?');
        queryParams.push(filters.booking_id);
      }

      if (filters.created_by) {
        whereConditions.push('p.created_by = ?');
        queryParams.push(filters.created_by);
      }

      if (filters.date_from) {
        whereConditions.push('p.payment_date >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('p.payment_date <= ?');
        queryParams.push(filters.date_to);
      }

      if (filters.search) {
        whereConditions.push('(c.name LIKE ? OR c.email LIKE ? OR p.transaction_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
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
        SELECT p.*, 
               r.reservation_id, r.destination, r.total_amount as booking_total,
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u.full_name as created_by_name, u.email as created_by_email
        FROM payments p
        LEFT JOIN reservations r ON p.booking_id = r.id
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON p.created_by = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [...queryParams.filter(p => p !== undefined), limit, offset];
      const payments = db.prepare(query).all(...allParams) as any[];

      const formattedPayments: Payment[] = payments.map(payment => ({
        id: payment.id,
        payment_id: payment.payment_id,
        booking_id: payment.booking_id,
        booking: {
          id: payment.booking_id,
          reservation_id: payment.reservation_id,
          customer_id: payment.customer_id,
          customer_name: payment.customer_name,
          destination: payment.destination,
          total_amount: payment.booking_total
        },
        customer_id: payment.customer_id,
        customer: {
          id: payment.customer_id,
          name: payment.customer_name,
          email: payment.customer_email,
          phone: payment.customer_phone
        },
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
        transaction_id: payment.transaction_id,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        notes: payment.notes,
        created_by: payment.created_by,
        created_by_user: {
          id: payment.created_by,
          full_name: payment.created_by_name,
          email: payment.created_by_email
        },
        created_at: payment.created_at,
        updated_at: payment.updated_at
      }));

      return { payments: formattedPayments, total };
    } catch (error) {
      throw new AppError('Failed to get payments', 500);
    }
  }

  // Update payment
  static async updatePayment(id: string, updateData: UpdatePaymentData): Promise<Payment> {
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

      const query = `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findPaymentById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update payment', 500);
    }
  }

  // Delete payment
  static async deletePayment(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM payments WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Payment not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete payment', 500);
    }
  }

  // Get payment statistics
  static async getPaymentStats(): Promise<{
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
    refundedPayments: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as pending_payments,
          SUM(CASE WHEN payment_status = 'Completed' THEN 1 ELSE 0 END) as completed_payments,
          SUM(CASE WHEN payment_status = 'Failed' THEN 1 ELSE 0 END) as failed_payments,
          SUM(CASE WHEN payment_status = 'Refunded' OR payment_status = 'Partially Refunded' THEN 1 ELSE 0 END) as refunded_payments
        FROM payments
      `;
      
      const db = getDatabase();
      const stat = db.prepare(query).get() as any;
      
      return {
        totalPayments: stat?.total_payments || 0,
        totalAmount: stat?.total_amount || 0,
        pendingPayments: stat?.pending_payments || 0,
        completedPayments: stat?.completed_payments || 0,
        failedPayments: stat?.failed_payments || 0,
        refundedPayments: stat?.refunded_payments || 0
      };
    } catch (error) {
      throw new AppError('Failed to get payment statistics', 500);
    }
  }

  // Get customer payments
  static async getCustomerPayments(customerId: string, filters: PaymentFilters): Promise<{ payments: Payment[]; total: number }> {
    const customerFilters = { ...filters, customer_id: customerId };
    return await this.getAllPayments(customerFilters, 'admin', '');
  }
}
