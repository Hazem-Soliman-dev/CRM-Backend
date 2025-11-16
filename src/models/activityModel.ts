import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Activity {
  id: string;
  activity_id: string;
  entity_type: 'customer' | 'lead' | 'reservation' | 'support_ticket' | 'user' | 'attendance';
  entity_id: string;
  activity_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'commented' | 'message_sent';
  description: string;
  details?: Record<string, any>;
  performed_by_id: string;
  performed_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
}

export interface LogActivityData {
  entity_type: 'customer' | 'lead' | 'reservation' | 'support_ticket' | 'user' | 'attendance';
  entity_id: string;
  activity_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'commented' | 'message_sent';
  description: string;
  details?: Record<string, any>;
  performed_by_id: string;
}

export interface ActivityFilters {
  entity_type?: string;
  entity_id?: string;
  activity_type?: string;
  performed_by_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export class ActivityModel {
  // Generate unique activity ID
  private static generateActivityId(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ACT-${timestamp}${random}`;
  }

  // Log activity
  static async logActivity(data: LogActivityData): Promise<Activity> {
    try {
      const activity_id = this.generateActivityId();

      const db = getDatabase();
      const query = `
        INSERT INTO activities (
          activity_id, entity_type, entity_id, activity_type,
          description, details, performed_by_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.prepare(query).run(
        activity_id,
        data.entity_type,
        data.entity_id,
        data.activity_type,
        data.description,
        data.details ? JSON.stringify(data.details) : null,
        data.performed_by_id
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findActivityById(insertId.id.toString());
    } catch (error) {
      console.error('Error logging activity:', error);
      throw new AppError('Failed to log activity', 500);
    }
  }

  // Find activity by ID
  static async findActivityById(id: string): Promise<Activity> {
    try {
      const db = getDatabase();
      const query = `
        SELECT a.*, u.full_name as performed_by_name, u.email as performed_by_email
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        WHERE a.id = ?
      `;

      const activity = db.prepare(query).get(id) as any;

      if (!activity) {
        throw new NotFoundError('Activity not found');
      }

      return this.formatActivity(activity);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find activity', 500);
    }
  }

  // Get activities for entity
  static async getActivities(
    entityType: string,
    entityId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{ activities: Activity[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const db = getDatabase();
      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM activities
        WHERE entity_type = ? AND entity_id = ?
      `;
      const countResult = db.prepare(countQuery).get(entityType, entityId) as any;
      const total = countResult?.total || 0;

      // Main query
      const query = `
        SELECT a.*, u.full_name as performed_by_name, u.email as performed_by_email
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        WHERE a.entity_type = ? AND a.entity_id = ?
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const activities = db.prepare(query).all(entityType, entityId, limit, offset).map((row: any) => this.formatActivity(row));

      return { activities, total };
    } catch (error) {
      throw new AppError('Failed to get activities', 500);
    }
  }

  // Get user activities
  static async getUserActivities(
    userId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{ activities: Activity[]; total: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const db = getDatabase();
      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM activities
        WHERE performed_by_id = ?
      `;
      const countResult = db.prepare(countQuery).get(userId) as any;
      const total = countResult?.total || 0;

      // Main query
      const query = `
        SELECT a.*, u.full_name as performed_by_name, u.email as performed_by_email
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        WHERE a.performed_by_id = ?
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const activities = db.prepare(query).all(userId, limit, offset).map((row: any) => this.formatActivity(row));

      return { activities, total };
    } catch (error) {
      throw new AppError('Failed to get user activities', 500);
    }
  }

  // Get filtered activities
  static async getFilteredActivities(
    filters: ActivityFilters
  ): Promise<{ activities: Activity[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      if (filters.entity_type) {
        whereConditions.push('a.entity_type = ?');
        queryParams.push(filters.entity_type);
      }

      if (filters.entity_id) {
        whereConditions.push('a.entity_id = ?');
        queryParams.push(filters.entity_id);
      }

      if (filters.activity_type) {
        whereConditions.push('a.activity_type = ?');
        queryParams.push(filters.activity_type);
      }

      if (filters.performed_by_id) {
        whereConditions.push('a.performed_by_id = ?');
        queryParams.push(filters.performed_by_id);
      }

      if (filters.date_from) {
        whereConditions.push('date(a.created_at) >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('date(a.created_at) <= ?');
        queryParams.push(filters.date_to);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const db = getDatabase();
      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM activities a
        ${whereClause}
      `;
      
      // Filter out undefined values for count query
      const countParams = queryParams.filter(p => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult?.total || 0;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const query = `
        SELECT a.*, u.full_name as performed_by_name, u.email as performed_by_email
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [...queryParams.filter(p => p !== undefined), limit, offset];
      const activities = db.prepare(query).all(...allParams).map((row: any) => this.formatActivity(row));

      return { activities, total };
    } catch (error) {
      throw new AppError('Failed to get activities', 500);
    }
  }

  // Format activity response
  private static formatActivity(row: any): Activity {
    return {
      id: row.id,
      activity_id: row.activity_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      activity_type: row.activity_type,
      description: row.description,
      details: row.details ? JSON.parse(row.details) : undefined,
      performed_by_id: row.performed_by_id,
      performed_by_user: {
        id: row.performed_by_id,
        full_name: row.performed_by_name,
        email: row.performed_by_email
      },
      created_at: row.created_at
    };
  }
}

