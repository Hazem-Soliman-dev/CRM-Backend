import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface TripNote {
  id: number;
  trip_id: number;
  note: string;
  note_type: 'internal' | 'interdepartmental';
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

export interface CreateTripNoteData {
  trip_id: number;
  note: string;
  note_type: 'internal' | 'interdepartmental';
  target_department?: string;
}

export interface UpdateTripNoteData {
  note?: string;
  note_type?: 'internal' | 'interdepartmental';
  target_department?: string;
}

export class OperationsTripNoteModel {
  // Create new note
  static async createNote(noteData: CreateTripNoteData, createdBy: number): Promise<TripNote> {
    try {
      const query = `
        INSERT INTO operations_trip_notes (
          trip_id, note, note_type, target_department, created_by
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        noteData.trip_id,
        noteData.note,
        noteData.note_type || 'internal',
        noteData.target_department || null,
        createdBy
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findNoteById(insertId);
    } catch (error: any) {
      console.error('Error creating trip note:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create trip note', 500);
    }
  }

  // Find note by ID
  static async findNoteById(id: number): Promise<TripNote> {
    try {
      const query = `
        SELECT n.*, 
               u.full_name as created_by_name, u.email as created_by_email,
               u.department as created_by_department, u.role as created_by_role
        FROM operations_trip_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = ?
      `;
      
      const db = getDatabase();
      const note = db.prepare(query).get(id) as any;
      
      if (!note) {
        throw new NotFoundError('Trip note not found');
      }
      
      return {
        id: note.id,
        trip_id: note.trip_id,
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
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find trip note', 500);
    }
  }

  // Get all notes for a trip
  static async getNotesByTripId(tripId: number): Promise<TripNote[]> {
    try {
      const query = `
        SELECT n.*, 
               u.full_name as created_by_name, u.email as created_by_email,
               u.department as created_by_department, u.role as created_by_role
        FROM operations_trip_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.trip_id = ?
        ORDER BY n.created_at DESC
      `;
      
      const db = getDatabase();
      const notes = db.prepare(query).all(tripId) as any[];
      
      return notes.map(note => ({
        id: note.id,
        trip_id: note.trip_id,
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
    } catch (error: any) {
      console.error('Error getting trip notes:', error);
      throw new AppError('Failed to get trip notes', 500);
    }
  }

  // Update note
  static async updateNote(id: number, updateData: UpdateTripNoteData): Promise<TripNote> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.note !== undefined) {
        fields.push('note = ?');
        params.push(updateData.note);
      }
      if (updateData.note_type !== undefined) {
        fields.push('note_type = ?');
        params.push(updateData.note_type);
      }
      if (updateData.target_department !== undefined) {
        fields.push('target_department = ?');
        params.push(updateData.target_department || null);
      }

      if (fields.length === 0) {
        return await this.findNoteById(id);
      }

      fields.push("updated_at = datetime('now')");
      params.push(id);

      const query = `UPDATE operations_trip_notes SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...params);

      return await this.findNoteById(id);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update trip note', 500);
    }
  }

  // Delete note
  static async deleteNote(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM operations_trip_notes WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Trip note not found');
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete trip note', 500);
    }
  }
}

