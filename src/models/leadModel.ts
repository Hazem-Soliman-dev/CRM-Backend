import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Lead {
  id: string;
  lead_id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: 'Website' | 'Social Media' | 'Email' | 'Walk-in' | 'Referral';
  type: 'B2B' | 'B2C';
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  agent_id?: string;
  agent?: {
    id: string;
    full_name: string;
    email: string;
  } | undefined;
  value?: number;
  notes?: string;
  last_contact?: string;
  next_followup?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: 'Website' | 'Social Media' | 'Email' | 'Walk-in' | 'Referral';
  type: 'B2B' | 'B2C';
  agent_id?: string;
  value?: number;
  notes?: string;
  next_followup?: string;
}

export interface UpdateLeadData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: 'Website' | 'Social Media' | 'Email' | 'Walk-in' | 'Referral';
  type?: 'B2B' | 'B2C';
  status?: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  agent_id?: string;
  value?: number;
  notes?: string;
  last_contact?: string;
  next_followup?: string;
}

export interface LeadFilters {
  status?: string;
  source?: string;
  type?: string;
  agent_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class LeadModel {
  // Generate unique lead ID
  private static generateLeadId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LD-${timestamp}${random}`;
  }

  // Create new lead
  static async createLead(leadData: CreateLeadData): Promise<Lead> {
    try {
      const lead_id = this.generateLeadId();
      
      const query = `
        INSERT INTO leads (lead_id, name, email, phone, company, source, type, agent_id, value, notes, next_followup)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        lead_id,
        leadData.name,
        leadData.email,
        leadData.phone,
        leadData.company || null,
        leadData.source,
        leadData.type,
        leadData.agent_id || null,
        leadData.value || 0,
        leadData.notes || null,
        leadData.next_followup || null
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findLeadById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create lead', 500);
    }
  }

  // Find lead by ID
  static async findLeadById(id: string): Promise<Lead> {
    try {
      const query = `
        SELECT l.*, u.full_name as agent_name, u.email as agent_email
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        WHERE l.id = ?
      `;
      
      const db = getDatabase();
      const lead = db.prepare(query).get(id) as any;
      
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }
      return {
        id: lead.id,
        lead_id: lead.lead_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        type: lead.type,
        status: lead.status,
        agent_id: lead.agent_id,
        agent: lead.agent_id ? {
          id: lead.agent_id,
          full_name: lead.agent_name,
          email: lead.agent_email
        } : undefined,
        value: lead.value,
        notes: lead.notes,
        last_contact: lead.last_contact,
        next_followup: lead.next_followup,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find lead by ID', 500);
    }
  }

  // Get all leads with filtering and role-based access
  static async getAllLeads(filters: LeadFilters, userRole: string, userId: string): Promise<{ leads: Lead[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'agent' || userRole === 'sales') {
        whereConditions.push('l.agent_id = ?');
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push('l.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.source) {
        whereConditions.push('l.source = ?');
        queryParams.push(filters.source);
      }

      if (filters.type) {
        whereConditions.push('l.type = ?');
        queryParams.push(filters.type);
      }

      if (filters.agent_id) {
        whereConditions.push('l.agent_id = ?');
        queryParams.push(filters.agent_id);
      }

      if (filters.search) {
        whereConditions.push('(l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM leads l
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
        SELECT l.*, u.full_name as agent_name, u.email as agent_email
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const leads = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedLeads: Lead[] = leads.map(lead => ({
        id: lead.id,
        lead_id: lead.lead_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        type: lead.type,
        status: lead.status,
        agent_id: lead.agent_id,
        agent: lead.agent_id ? {
          id: lead.agent_id,
          full_name: lead.agent_name,
          email: lead.agent_email
        } : undefined,
        value: lead.value,
        notes: lead.notes,
        last_contact: lead.last_contact,
        next_followup: lead.next_followup,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }));

      return { leads: formattedLeads, total };
    } catch (error) {
      throw new AppError('Failed to get leads', 500);
    }
  }

  // Update lead
  static async updateLead(id: string, updateData: UpdateLeadData): Promise<Lead> {
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

      const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findLeadById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update lead', 500);
    }
  }

  // Delete lead
  static async deleteLead(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM leads WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Lead not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete lead', 500);
    }
  }

  // Get overdue leads
  static async getOverdueLeads(userRole: string, userId: string): Promise<Lead[]> {
    try {
      let whereConditions = ["l.next_followup < datetime('now')", 'l.status NOT IN ("Closed Won", "Closed Lost")'];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'agent' || userRole === 'sales') {
        whereConditions.push('l.agent_id = ?');
        queryParams.push(userId);
      }

      const query = `
        SELECT l.*, u.full_name as agent_name, u.email as agent_email
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY l.next_followup ASC
      `;

      const db = getDatabase();
      const leads = db.prepare(query).all(...queryParams) as any[];

      return leads.map(lead => ({
        id: lead.id,
        lead_id: lead.lead_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        type: lead.type,
        status: lead.status,
        agent_id: lead.agent_id,
        agent: lead.agent_id ? {
          id: lead.agent_id,
          full_name: lead.agent_name,
          email: lead.agent_email
        } : undefined,
        value: lead.value,
        notes: lead.notes,
        last_contact: lead.last_contact,
        next_followup: lead.next_followup,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }));
    } catch (error) {
      throw new AppError('Failed to get overdue leads', 500);
    }
  }

  // Convert lead to customer
  static async convertToCustomer(leadId: string): Promise<{ lead: Lead; customerId: string }> {
    try {
      const lead = await this.findLeadById(leadId);
      
      if (lead.status === 'Closed Won') {
        throw new AppError('Lead is already converted', 400);
      }

      // Create customer from lead
      const customer_id = `CU-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const customerQuery = `
        INSERT INTO customers (customer_id, name, email, phone, company, type, contact_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const customerType = lead.type === 'B2B' ? 'Corporate' : 'Individual';
      
      const db = getDatabase();
      db.prepare(customerQuery).run(
        customer_id,
        lead.name,
        lead.email,
        lead.phone,
        lead.company || null,
        customerType,
        'Email',
        `Converted from lead: ${lead.lead_id}. Original notes: ${lead.notes || 'N/A'}`
      );

      const customerId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id.toString();

      // Update lead status
      await this.updateLead(leadId, { status: 'Closed Won' });

      return { 
        lead: await this.findLeadById(leadId),
        customerId 
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to convert lead to customer', 500);
    }
  }
}
