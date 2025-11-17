import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface ReservationNote {
  id: number;
  reservation_id: number;
  note: string;
  note_type: 'internal' | 'interdepartmental' | 'supplier_update';
  target_department?: string;
  created_by: number;
        created_by_user?: {
          id: number;
          full_name: string;
          email: string;
          department?: string;
          role?: string;
        };
  created_at: string;
  updated_at: string;
}

export interface CreateReservationNoteData {
  reservation_id: number;
  note: string;
  note_type: 'internal' | 'interdepartmental' | 'supplier_update';
  target_department?: string;
}

export interface UpdateReservationNoteData {
  note?: string;
  note_type?: 'internal' | 'interdepartmental' | 'supplier_update';
  target_department?: string;
}

export class ReservationNoteModel {
  // Create new note
  static async createNote(noteData: CreateReservationNoteData, createdBy: number): Promise<ReservationNote> {
    try {
      const query = `
        INSERT INTO reservation_notes (
          reservation_id, note, note_type, target_department, created_by
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        noteData.reservation_id,
        noteData.note,
        noteData.note_type || 'internal',
        noteData.target_department || null,
        createdBy
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findNoteById(insertId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create reservation note', 500);
    }
  }

  // Find note by ID
  static async findNoteById(id: number): Promise<ReservationNote> {
    try {
      const query = `
        SELECT n.*, 
               u.full_name as created_by_name, u.email as created_by_email
        FROM reservation_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = ?
      `;
      
      const db = getDatabase();
      const note = db.prepare(query).get(id) as any;
      
      if (!note) {
        throw new NotFoundError('Reservation note not found');
      }
      
      return {
        id: note.id,
        reservation_id: note.reservation_id,
        note: note.note,
        note_type: note.note_type,
        target_department: note.target_department,
        created_by: note.created_by,
        created_by_user: {
          id: note.created_by,
          full_name: note.created_by_name,
          email: note.created_by_email,
          department: note.created_by_department,
          role: note.created_by_role
        },
        created_at: note.created_at,
        updated_at: note.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find reservation note', 500);
    }
  }

  // Get all notes for a reservation
  static async getNotesByReservationId(reservationId: number): Promise<ReservationNote[]> {
    try {
      const query = `
        SELECT n.*, 
               u.full_name as created_by_name, u.email as created_by_email, u.department as created_by_department, u.role as created_by_role
        FROM reservation_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.reservation_id = ?
        ORDER BY n.created_at DESC
      `;
      
      const db = getDatabase();
      const notes = db.prepare(query).all(reservationId) as any[];
      
      return notes.map(note => ({
        id: note.id,
        reservation_id: note.reservation_id,
        note: note.note,
        note_type: note.note_type,
        target_department: note.target_department,
        created_by: note.created_by,
        created_by_user: {
          id: note.created_by,
          full_name: note.created_by_name,
          email: note.created_by_email,
          department: note.created_by_department,
          role: note.created_by_role
        },
        created_at: note.created_at,
        updated_at: note.updated_at
      }));
    } catch (error) {
      throw new AppError('Failed to get reservation notes', 500);
    }
  }

  // Update note
  static async updateNote(id: number, updateData: UpdateReservationNoteData): Promise<ReservationNote> {
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

      const query = `UPDATE reservation_notes SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findNoteById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update reservation note', 500);
    }
  }

  // Delete note
  static async deleteNote(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM reservation_notes WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Reservation note not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete reservation note', 500);
    }
  }
}

