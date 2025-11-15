import getDatabase from "../config/database";
import { AppError, NotFoundError } from "../utils/AppError";

export interface SupportTicket {
  id: string;
  ticket_id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  subject: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  assigned_to?: string;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by: string;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportTicketData {
  customer_id: string;
  subject: string;
  description: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  assigned_to?: string;
}

export interface UpdateSupportTicketData {
  subject?: string;
  description?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  assigned_to?: string;
}

export interface SupportTicketFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  customer_id?: string;
  created_by?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class SupportTicketModel {
  // Generate unique ticket ID
  private static generateTicketId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `TKT-${timestamp}${random}`;
  }

  // Create new support ticket
  static async createTicket(
    ticketData: CreateSupportTicketData,
    createdBy: string
  ): Promise<SupportTicket> {
    try {
      const ticket_id = this.generateTicketId();

      const query = `
        INSERT INTO support_tickets (ticket_id, customer_id, subject, description, priority, assigned_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        ticket_id,
        ticketData.customer_id,
        ticketData.subject,
        ticketData.description,
        ticketData.priority || "Medium",
        ticketData.assigned_to || null,
        createdBy,
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findTicketById(insertId.toString());
    } catch (error) {
      throw new AppError("Failed to create support ticket", 500);
    }
  }

  // Find ticket by ID
  static async findTicketById(id: string): Promise<SupportTicket> {
    try {
      const query = `
        SELECT t.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u1.full_name as assigned_user_name, u1.email as assigned_user_email,
               u2.full_name as created_by_name, u2.email as created_by_email
        FROM support_tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.id = ?
      `;

      const db = getDatabase();
      const ticket = db.prepare(query).get(id) as any;

      if (!ticket) {
        throw new NotFoundError("Support ticket not found");
      }
      return {
        id: ticket.id.toString(),
        ticket_id: ticket.ticket_id,
        customer_id: ticket.customer_id.toString(),
        customer: {
          id: ticket.customer_id.toString(),
          name: ticket.customer_name,
          email: ticket.customer_email,
          phone: ticket.customer_phone,
        },
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        assigned_to: ticket.assigned_to
          ? ticket.assigned_to.toString()
          : undefined,
        assigned_user: ticket.assigned_to
          ? {
              id: ticket.assigned_to.toString(),
              full_name: ticket.assigned_user_name,
              email: ticket.assigned_user_email,
            }
          : undefined,
        created_by: ticket.created_by.toString(),
        created_by_user: {
          id: ticket.created_by.toString(),
          full_name: ticket.created_by_name,
          email: ticket.created_by_email,
        },
        resolved_at: ticket.resolved_at,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to find support ticket by ID", 500);
    }
  }

  // Get all support tickets with filtering
  static async getAllTickets(
    filters: SupportTicketFilters,
    userRole: string,
    userId: string
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === "customer") {
        whereConditions.push("t.customer_id = ?");
        queryParams.push(userId);
      } else if (userRole === "agent") {
        whereConditions.push("(t.assigned_to = ? OR t.created_by = ?)");
        queryParams.push(userId, userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push("t.status = ?");
        queryParams.push(filters.status);
      }

      if (filters.priority) {
        whereConditions.push("t.priority = ?");
        queryParams.push(filters.priority);
      }

      if (filters.assigned_to) {
        whereConditions.push("t.assigned_to = ?");
        queryParams.push(filters.assigned_to);
      }

      if (filters.customer_id) {
        whereConditions.push("t.customer_id = ?");
        queryParams.push(filters.customer_id);
      }

      if (filters.created_by) {
        whereConditions.push("t.created_by = ?");
        queryParams.push(filters.created_by);
      }

      if (filters.search) {
        whereConditions.push(
          "(t.subject LIKE ? OR t.description LIKE ? OR c.name LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM support_tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
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
        SELECT t.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               u1.full_name as assigned_user_name, u1.email as assigned_user_email,
               u2.full_name as created_by_name, u2.email as created_by_email
        FROM support_tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const tickets = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedTickets: SupportTicket[] = tickets.map((ticket) => ({
        id: ticket.id.toString(),
        ticket_id: ticket.ticket_id,
        customer_id: ticket.customer_id.toString(),
        customer: {
          id: ticket.customer_id.toString(),
          name: ticket.customer_name,
          email: ticket.customer_email,
          phone: ticket.customer_phone,
        },
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        assigned_to: ticket.assigned_to
          ? ticket.assigned_to.toString()
          : undefined,
        assigned_user: ticket.assigned_to
          ? {
              id: ticket.assigned_to.toString(),
              full_name: ticket.assigned_user_name,
              email: ticket.assigned_user_email,
            }
          : undefined,
        created_by: ticket.created_by.toString(),
        created_by_user: {
          id: ticket.created_by.toString(),
          full_name: ticket.created_by_name,
          email: ticket.created_by_email,
        },
        resolved_at: ticket.resolved_at,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));

      return { tickets: formattedTickets, total };
    } catch (error) {
      throw new AppError("Failed to get support tickets", 500);
    }
  }

  // Update support ticket
  static async updateTicket(
    id: string,
    updateData: UpdateSupportTicketData
  ): Promise<SupportTicket> {
    try {
      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== "status") {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      // Handle status update separately to manage resolved_at
      if (updateData.status !== undefined) {
        fields.push("status = ?");
        values.push(updateData.status);

        // If status is being updated to 'Resolved' or 'Closed', set resolved_at
        if (
          updateData.status === "Resolved" ||
          updateData.status === "Closed"
        ) {
          fields.push("resolved_at = datetime('now')");
        } else {
          // If status is changed back to 'Open' or 'In Progress', clear resolved_at
          fields.push("resolved_at = NULL");
        }
      }

      if (fields.length === 0) {
        throw new AppError("No fields to update", 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const query = `UPDATE support_tickets SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findTicketById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update support ticket", 500);
    }
  }

  // Delete support ticket
  static async deleteTicket(id: string): Promise<void> {
    try {
      const query = "DELETE FROM support_tickets WHERE id = ?";
      const db = getDatabase();
      const result = db.prepare(query).run(id);

      if (result.changes === 0) {
        throw new NotFoundError("Support ticket not found");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to delete support ticket", 500);
    }
  }

  // Add note to ticket
  static async addTicketNote(
    ticketId: string,
    note: string,
    createdBy: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO support_ticket_notes (ticket_id, note, created_by)
        VALUES (?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(ticketId, note, createdBy);
    } catch (error) {
      throw new AppError("Failed to add ticket note", 500);
    }
  }

  // Get ticket notes
  static async getTicketNotes(ticketId: string): Promise<any[]> {
    try {
      const query = `
        SELECT n.*, u.full_name as created_by_name
        FROM support_ticket_notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.ticket_id = ?
        ORDER BY n.created_at ASC
      `;

      const db = getDatabase();
      const notes = db.prepare(query).all(ticketId) as any[];

      // Format notes to ensure consistent data structure
      return notes.map((note) => ({
        id: note.id.toString(),
        ticket_id: note.ticket_id.toString(),
        note: note.note,
        created_by: note.created_by.toString(),
        created_by_name: note.created_by_name,
        created_at: note.created_at,
      }));
    } catch (error) {
      throw new AppError("Failed to get ticket notes", 500);
    }
  }

  // Get ticket statistics
  static async getTicketStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    urgentTickets: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_tickets,
          SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_tickets,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tickets,
          SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tickets,
          SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_tickets,
          SUM(CASE WHEN priority = 'Urgent' THEN 1 ELSE 0 END) as urgent_tickets
        FROM support_tickets
      `;

      const db = getDatabase();
      const stat = db.prepare(query).get() as any;

      return {
        totalTickets: stat?.total_tickets || 0,
        openTickets: stat?.open_tickets || 0,
        inProgressTickets: stat?.in_progress_tickets || 0,
        resolvedTickets: stat?.resolved_tickets || 0,
        closedTickets: stat?.closed_tickets || 0,
        urgentTickets: stat?.urgent_tickets || 0,
      };
    } catch (error) {
      throw new AppError("Failed to get ticket statistics", 500);
    }
  }
}
