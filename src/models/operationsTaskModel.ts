import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';
import { TripStatus } from './operationsTripModel';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface OperationsTask {
  id: number;
  taskId: string;
  tripId?: number | null;
  title: string;
  tripReference?: string | null;
  customerName?: string | null;
  scheduledAt?: string | null;
  location?: string | null;
  assignedTo?: number | null;
  assignedToName?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskType?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: TaskTripSummary | null;
}

export interface TaskTripSummary {
  id: number;
  tripCode: string;
  bookingReference?: string | null;
  status: TripStatus;
  startDate?: string | null;
  endDate?: string | null;
  customerName: string;
  assignedGuide?: string | null;
  assignedDriver?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus | 'All';
  priority?: TaskPriority | 'All';
  assignedTo?: number;
  dateFrom?: string;
  dateTo?: string;
  tripId?: number;
}

export interface CreateTaskData {
  title: string;
  tripId?: number;
  tripReference?: string;
  customerName?: string;
  scheduledAt?: string;
  location?: string;
  assignedTo?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: string;
  notes?: string;
}

export interface UpdateTaskData {
  title?: string;
  tripId?: number | null;
  tripReference?: string | null;
  customerName?: string | null;
  scheduledAt?: string | null;
  location?: string | null;
  assignedTo?: number | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: string | null;
  notes?: string | null;
}

export class OperationsTaskModel {
  private static generateTaskId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `TASK-${timestamp}${random}`;
  }

  private static mapRowToTask(row: any): OperationsTask {
    const task: OperationsTask = {
      id: row.id,
      taskId: row.task_id,
      tripId: row.trip_id ?? null,
      title: row.title,
      tripReference: row.trip_reference,
      customerName: row.customer_name,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
      location: row.location,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      status: row.status,
      priority: row.priority,
      taskType: row.task_type,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (row.trip_join_id) {
      task.trip = {
        id: row.trip_join_id,
        tripCode: row.trip_code,
        bookingReference: row.trip_booking_reference,
        status: row.trip_status,
        startDate: row.trip_start_date ? new Date(row.trip_start_date).toISOString().split('T')[0] : null,
        endDate: row.trip_end_date ? new Date(row.trip_end_date).toISOString().split('T')[0] : null,
        customerName: row.trip_customer_name,
        assignedGuide: row.trip_assigned_guide,
        assignedDriver: row.trip_assigned_driver
      };
    } else {
      task.trip = null;
    }

    return task;
  }

  static async getTasks(filters: TaskFilters = {}): Promise<OperationsTask[]> {
    try {
      let query = `
        SELECT 
          t.*,
          u.full_name AS assigned_to_name,
          tr.id AS trip_join_id,
          tr.trip_code,
          tr.booking_reference AS trip_booking_reference,
          tr.status AS trip_status,
          tr.start_date AS trip_start_date,
          tr.end_date AS trip_end_date,
          tr.customer_name AS trip_customer_name,
          tr.assigned_guide AS trip_assigned_guide,
          tr.assigned_driver AS trip_assigned_driver
        FROM operations_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN operations_trips tr ON t.trip_id = tr.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.status && filters.status !== 'All') {
        conditions.push('t.status = ?');
        params.push(filters.status);
      }

      if (filters.priority && filters.priority !== 'All') {
        conditions.push('t.priority = ?');
        params.push(filters.priority);
      }

      if (filters.assignedTo) {
        conditions.push('t.assigned_to = ?');
        params.push(filters.assignedTo);
      }

      if (filters.tripId) {
        conditions.push('t.trip_id = ?');
        params.push(filters.tripId);
      }

      if (filters.dateFrom) {
        conditions.push('t.scheduled_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        conditions.push('t.scheduled_at <= ?');
        params.push(filters.dateTo);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY t.scheduled_at IS NULL, t.scheduled_at ASC, t.created_at DESC';

      const db = getDatabase();
      const taskRows = db.prepare(query).all(...params) as any[];
      return taskRows.map(this.mapRowToTask);
    } catch (error) {
      throw new AppError('Failed to fetch operations tasks', 500);
    }
  }

  static async findTaskById(id: string): Promise<OperationsTask> {
    try {
      const query = `
        SELECT 
          t.*,
          u.full_name AS assigned_to_name,
          tr.id AS trip_join_id,
          tr.trip_code,
          tr.booking_reference AS trip_booking_reference,
          tr.status AS trip_status,
          tr.start_date AS trip_start_date,
          tr.end_date AS trip_end_date,
          tr.customer_name AS trip_customer_name,
          tr.assigned_guide AS trip_assigned_guide,
          tr.assigned_driver AS trip_assigned_driver
        FROM operations_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN operations_trips tr ON t.trip_id = tr.id
        WHERE t.id = ?
      `;
      const db = getDatabase();
      const task = db.prepare(query).get(id) as any;

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      return this.mapRowToTask(task);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load task', 500);
    }
  }

  static async createTask(data: CreateTaskData): Promise<OperationsTask> {
    try {
      const taskId = this.generateTaskId();
      const db = getDatabase();
      const query = `
        INSERT INTO operations_tasks
          (task_id, trip_id, title, trip_reference, customer_name, scheduled_at, location, assigned_to, status, priority, task_type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Ensure scheduledAt is a string or null (SQLite TEXT field accepts ISO8601 strings)
      const scheduledAtValue = data.scheduledAt && data.scheduledAt.trim() ? data.scheduledAt : null;

      db.prepare(query).run(
        taskId,
        data.tripId || null,
        data.title,
        data.tripReference || null,
        data.customerName || null,
        scheduledAtValue,
        data.location || null,
        data.assignedTo || null,
        data.status || 'Pending',
        data.priority || 'Medium',
        data.taskType || null,
        data.notes || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findTaskById(insertId.id.toString());
    } catch (error) {
      throw new AppError('Failed to create task', 500);
    }
  }

  static async updateTask(id: string, data: UpdateTaskData): Promise<OperationsTask> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.title !== undefined) {
        fields.push('title = ?');
        params.push(data.title);
      }
      if (data.tripId !== undefined) {
        fields.push('trip_id = ?');
        params.push(data.tripId || null);
      }
      if (data.tripReference !== undefined) {
        fields.push('trip_reference = ?');
        params.push(data.tripReference || null);
      }
      if (data.customerName !== undefined) {
        fields.push('customer_name = ?');
        params.push(data.customerName || null);
      }
      if (data.scheduledAt !== undefined) {
        // Ensure scheduledAt is a string or null (SQLite TEXT field accepts ISO8601 strings)
        const scheduledAtValue = data.scheduledAt && data.scheduledAt.trim() ? data.scheduledAt : null;
        fields.push('scheduled_at = ?');
        params.push(scheduledAtValue);
      }
      if (data.location !== undefined) {
        fields.push('location = ?');
        params.push(data.location || null);
      }
      if (data.assignedTo !== undefined) {
        fields.push('assigned_to = ?');
        params.push(data.assignedTo || null);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
      }
      if (data.priority !== undefined) {
        fields.push('priority = ?');
        params.push(data.priority);
      }
      if (data.taskType !== undefined) {
        fields.push('task_type = ?');
        params.push(data.taskType || null);
      }
      if (data.notes !== undefined) {
        fields.push('notes = ?');
        params.push(data.notes || null);
      }

      if (fields.length === 0) {
        return await this.findTaskById(id);
      }

      params.push(id);

      const db = getDatabase();
      const query = `
        UPDATE operations_tasks
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(...params);
      return await this.findTaskById(id);
    } catch (error: any) {
      // Log the actual error for debugging
      console.error('Error updating task:', error);
      if (error instanceof AppError) {
        throw error;
      }
      // Provide more detailed error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new AppError(`Failed to update task: ${errorMessage}`, 500);
    }
  }

  static async updateTaskStatus(id: string, status: TaskStatus): Promise<OperationsTask> {
    try {
      const db = getDatabase();
      db.prepare(
        `
          UPDATE operations_tasks
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `
      ).run(status, id);
      return await this.findTaskById(id);
    } catch (error) {
      throw new AppError('Failed to update task status', 500);
    }
  }

  static async deleteTask(id: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM operations_tasks WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new NotFoundError('Task not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete task', 500);
    }
  }
}

