import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface LeaveRequest {
  id: string;
  user_id: string;
  employee_name?: string;
  leave_type: 'Sick' | 'Vacation' | 'Personal' | 'Emergency' | 'Other';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestData {
  user_id: string;
  leave_type: 'Sick' | 'Vacation' | 'Personal' | 'Emergency' | 'Other';
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveRequestFilters {
  user_id?: string;
  status?: string;
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export class LeaveRequestModel {
  /**
   * Create a new leave request
   */
  static async createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
    try {
      // Validate required fields
      if (!data.user_id || !data.leave_type || !data.start_date || !data.end_date) {
        throw new AppError('user_id, leave_type, start_date, and end_date are required', 400);
      }

      // Calculate days requested (inclusive of both start and end dates)
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate < startDate) {
        throw new AppError('end_date must be after or equal to start_date', 400);
      }

      const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const db = getDatabase();
      const query = `
        INSERT INTO leave_requests (
          user_id, leave_type, start_date, end_date, days_requested, reason
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        data.user_id,
        data.leave_type,
        data.start_date.split('T')[0], // Ensure YYYY-MM-DD format
        data.end_date.split('T')[0], // Ensure YYYY-MM-DD format
        daysRequested,
        data.reason || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.getLeaveRequestById(insertId.id.toString());
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to create leave request: ${error.message}`, 500);
    }
  }

  /**
   * Get leave request by ID
   */
  static async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    try {
      const db = getDatabase();
      const query = `
        SELECT 
          lr.*,
          u.full_name as employee_name,
          approver.full_name as approved_by_name
        FROM leave_requests lr
        LEFT JOIN users u ON lr.user_id = u.id
        LEFT JOIN users approver ON lr.approved_by = approver.id
        WHERE lr.id = ?
      `;

      const request = db.prepare(query).get(id) as any;

      if (!request) {
        throw new NotFoundError('Leave request not found');
      }

      return this.formatLeaveRequest(request);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get leave request: ${error.message}`, 500);
    }
  }

  /**
   * Get all leave requests with filters and pagination
   */
  static async getLeaveRequests(
    filters: LeaveRequestFilters
  ): Promise<{ requests: LeaveRequest[]; total: number }> {
    try {
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      // Build WHERE clause
      if (filters.user_id) {
        whereConditions.push('lr.user_id = ?');
        queryParams.push(filters.user_id);
      }

      if (filters.status) {
        whereConditions.push('lr.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.leave_type) {
        whereConditions.push('lr.leave_type = ?');
        queryParams.push(filters.leave_type);
      }

      if (filters.start_date) {
        whereConditions.push('lr.start_date >= ?');
        queryParams.push(filters.start_date);
      }

      if (filters.end_date) {
        whereConditions.push('lr.end_date <= ?');
        queryParams.push(filters.end_date);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Count total records
      const db = getDatabase();
      const countQuery = `
        SELECT COUNT(*) as total
        FROM leave_requests lr
        ${whereClause}
      `;
      
      // Filter out undefined values for count query
      const countParams = queryParams.filter(p => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult?.total || 0;

      // Get paginated records
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          lr.*,
          u.full_name as employee_name,
          approver.full_name as approved_by_name
        FROM leave_requests lr
        LEFT JOIN users u ON lr.user_id = u.id
        LEFT JOIN users approver ON lr.approved_by = approver.id
        ${whereClause}
        ORDER BY lr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [...queryParams.filter(p => p !== undefined), limit, offset];
      const requests = db.prepare(query).all(...allParams).map((row: any) => this.formatLeaveRequest(row));

      return { requests, total };
    } catch (error: any) {
      console.error('Error getting leave requests:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get leave requests: ${error.message}`, 500);
    }
  }

  /**
   * Approve leave request
   */
  static async approveLeaveRequest(id: string, approvedBy: string): Promise<LeaveRequest> {
    try {
      const db = getDatabase();
      const query = `
        UPDATE leave_requests
        SET status = 'Approved',
            approved_by = ?,
            approved_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(approvedBy, id);
      return await this.getLeaveRequestById(id);
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to approve leave request: ${error.message}`, 500);
    }
  }

  /**
   * Reject leave request
   */
  static async rejectLeaveRequest(id: string, approvedBy: string, reason?: string): Promise<LeaveRequest> {
    try {
      const db = getDatabase();
      const query = `
        UPDATE leave_requests
        SET status = 'Rejected',
            approved_by = ?,
            approved_at = datetime('now'),
            reason = COALESCE(?, reason),
            updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(approvedBy, reason || null, id);
      return await this.getLeaveRequestById(id);
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to reject leave request: ${error.message}`, 500);
    }
  }

  /**
   * Format leave request from database row
   */
  private static formatLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id ? row.id.toString() : '',
      user_id: row.user_id ? row.user_id.toString() : '',
      employee_name: row.employee_name || undefined,
      leave_type: row.leave_type,
      start_date: row.start_date ? row.start_date.toString() : '',
      end_date: row.end_date ? row.end_date.toString() : '',
      days_requested: row.days_requested || 0,
      reason: row.reason || undefined,
      status: row.status || 'Pending',
      approved_by: row.approved_by ? row.approved_by.toString() : undefined,
      approved_by_name: row.approved_by_name || undefined,
      approved_at: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }
}
