import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export type NotificationType = 'lead' | 'customer' | 'booking' | 'payment' | 'support' | 'system' | 'task';

export interface NotificationRecord {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface CreateNotificationData {
  userId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export class NotificationModel {
  private static mapRow(row: any): NotificationRecord {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
      readAt: row.read_at
    };
  }

  static async getNotificationsForUser(userId: number, limit = 50): Promise<NotificationRecord[]> {
    try {
      const db = getDatabase();
      const query = `
        SELECT *
        FROM notifications
        WHERE user_id IS NULL OR user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const notifications = db.prepare(query).all(userId, limit) as any[];
      return notifications.map(this.mapRow);
    } catch (error) {
      throw new AppError('Failed to fetch notifications', 500);
    }
  }

  static async createNotification(data: CreateNotificationData): Promise<NotificationRecord> {
    try {
      const db = getDatabase();
      const query = `
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        data.userId || null,
        data.type,
        data.title,
        data.message,
        data.entityType || null,
        data.entityId || null,
        0
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findNotificationById(insertId.id.toString());
    } catch (error) {
      throw new AppError('Failed to create notification', 500);
    }
  }

  static async findNotificationById(id: string): Promise<NotificationRecord> {
    try {
      const db = getDatabase();
      const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as any;
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }
      return this.mapRow(notification);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load notification', 500);
    }
  }

  static async markAsRead(id: string, userId: number): Promise<NotificationRecord> {
    try {
      const db = getDatabase();
      const query = `
        UPDATE notifications
        SET is_read = 1,
            read_at = datetime('now')
        WHERE id = ? AND (user_id IS NULL OR user_id = ?)
      `;

      const result = db.prepare(query).run(id, userId);
      if (result.changes === 0) {
        throw new NotFoundError('Notification not found or access denied');
      }

      return await this.findNotificationById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to mark notification as read', 500);
    }
  }

  static async markAllAsRead(userId: number): Promise<void> {
    try {
      const db = getDatabase();
      const query = `
        UPDATE notifications
        SET is_read = 1,
            read_at = datetime('now')
        WHERE user_id IS NULL OR user_id = ?
      `;
      db.prepare(query).run(userId);
    } catch (error) {
      throw new AppError('Failed to mark notifications as read', 500);
    }
  }

  static async deleteNotification(id: string, userId: number): Promise<void> {
    try {
      const db = getDatabase();
      const query = `
        DELETE FROM notifications
        WHERE id = ? AND (user_id IS NULL OR user_id = ?)
      `;
      const result = db.prepare(query).run(id, userId);
      if (result.changes === 0) {
        throw new NotFoundError('Notification not found or access denied');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete notification', 500);
    }
  }
}

