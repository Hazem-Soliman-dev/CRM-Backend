import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface ReservationDocument {
  id: number;
  reservation_id: number;
  document_name: string;
  document_type: string;
  file_data: string; // Base64 encoded
  file_size: number;
  mime_type: string;
  description?: string;
  uploaded_by: number;
  uploaded_by_user?: {
    id: number;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateReservationDocumentData {
  reservation_id: number;
  document_name: string;
  document_type: string;
  file_data: string; // Base64 encoded
  file_size: number;
  mime_type: string;
  description?: string;
}

export interface UpdateReservationDocumentData {
  document_name?: string;
  document_type?: string;
  description?: string;
}

export class ReservationDocumentModel {
  // Create new document
  static async createDocument(documentData: CreateReservationDocumentData, uploadedBy: number): Promise<ReservationDocument> {
    try {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (documentData.file_size > maxSize) {
        throw new AppError('File size exceeds maximum limit of 10MB', 400);
      }

      const query = `
        INSERT INTO reservation_documents (
          reservation_id, document_name, document_type, file_data, file_size, mime_type, description, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        documentData.reservation_id,
        documentData.document_name,
        documentData.document_type,
        documentData.file_data,
        documentData.file_size,
        documentData.mime_type,
        documentData.description || null,
        uploadedBy
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findDocumentById(insertId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create reservation document', 500);
    }
  }

  // Find document by ID
  static async findDocumentById(id: number): Promise<ReservationDocument> {
    try {
      const query = `
        SELECT d.*, 
               u.full_name as uploaded_by_name, u.email as uploaded_by_email
        FROM reservation_documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = ?
      `;
      
      const db = getDatabase();
      const document = db.prepare(query).get(id) as any;
      
      if (!document) {
        throw new NotFoundError('Reservation document not found');
      }
      
      return {
        id: document.id,
        reservation_id: document.reservation_id,
        document_name: document.document_name,
        document_type: document.document_type,
        file_data: document.file_data,
        file_size: document.file_size,
        mime_type: document.mime_type,
        description: document.description,
        uploaded_by: document.uploaded_by,
        uploaded_by_user: {
          id: document.uploaded_by,
          full_name: document.uploaded_by_name,
          email: document.uploaded_by_email
        },
        created_at: document.created_at,
        updated_at: document.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find reservation document', 500);
    }
  }

  // Get document without file data (for listing)
  static async findDocumentByIdWithoutFile(id: number): Promise<Omit<ReservationDocument, 'file_data'>> {
    try {
      const query = `
        SELECT d.id, d.reservation_id, d.document_name, d.document_type, 
               d.file_size, d.mime_type, d.description, d.uploaded_by,
               d.created_at, d.updated_at,
               u.full_name as uploaded_by_name, u.email as uploaded_by_email
        FROM reservation_documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = ?
      `;
      
      const db = getDatabase();
      const document = db.prepare(query).get(id) as any;
      
      if (!document) {
        throw new NotFoundError('Reservation document not found');
      }
      
      return {
        id: document.id,
        reservation_id: document.reservation_id,
        document_name: document.document_name,
        document_type: document.document_type,
        file_size: document.file_size,
        mime_type: document.mime_type,
        description: document.description,
        uploaded_by: document.uploaded_by,
        uploaded_by_user: {
          id: document.uploaded_by,
          full_name: document.uploaded_by_name,
          email: document.uploaded_by_email
        },
        created_at: document.created_at,
        updated_at: document.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find reservation document', 500);
    }
  }

  // Get all documents for a reservation (without file data)
  static async getDocumentsByReservationId(reservationId: number): Promise<Omit<ReservationDocument, 'file_data'>[]> {
    try {
      const query = `
        SELECT d.id, d.reservation_id, d.document_name, d.document_type, 
               d.file_size, d.mime_type, d.description, d.uploaded_by,
               d.created_at, d.updated_at,
               u.full_name as uploaded_by_name, u.email as uploaded_by_email
        FROM reservation_documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.reservation_id = ?
        ORDER BY d.created_at DESC
      `;
      
      const db = getDatabase();
      const documents = db.prepare(query).all(reservationId) as any[];
      
      return documents.map(doc => ({
        id: doc.id,
        reservation_id: doc.reservation_id,
        document_name: doc.document_name,
        document_type: doc.document_type,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        description: doc.description,
        uploaded_by: doc.uploaded_by,
        uploaded_by_user: {
          id: doc.uploaded_by,
          full_name: doc.uploaded_by_name,
          email: doc.uploaded_by_email
        },
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }));
    } catch (error) {
      throw new AppError('Failed to get reservation documents', 500);
    }
  }

  // Update document metadata
  static async updateDocument(id: number, updateData: UpdateReservationDocumentData): Promise<ReservationDocument> {
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

      const query = `UPDATE reservation_documents SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findDocumentById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update reservation document', 500);
    }
  }

  // Delete document
  static async deleteDocument(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM reservation_documents WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Reservation document not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete reservation document', 500);
    }
  }
}

