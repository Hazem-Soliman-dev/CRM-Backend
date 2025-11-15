import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export type OwnerStatus = 'Active' | 'Onboarding' | 'Dormant';

export interface Owner {
  id: number;
  ownerId: string;
  companyName: string;
  primaryContact?: string | null;
  email?: string | null;
  phone?: string | null;
  status: OwnerStatus;
  portfolioSize: number;
  locations: string[];
  managerId?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerFilters {
  status?: OwnerStatus | 'All';
  search?: string;
}

export interface CreateOwnerData {
  companyName: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  status?: OwnerStatus;
  portfolioSize?: number;
  locations?: string[];
  notes?: string;
}

export interface UpdateOwnerData {
  companyName?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  status?: OwnerStatus;
  portfolioSize?: number;
  locations?: string[];
  managerId?: number | null;
  notes?: string;
}

export class OwnerModel {
  private static generateOwnerId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `OWN-${timestamp}${random}`;
  }

  private static mapRowToOwner(row: any): Owner {
    return {
      id: row.id,
      ownerId: row.owner_id,
      companyName: row.company_name,
      primaryContact: row.primary_contact,
      email: row.email,
      phone: row.phone,
      status: row.status,
      portfolioSize: Number(row.portfolio_size || 0),
      locations: row.locations ? String(row.locations).split(',').map((loc: string) => loc.trim()).filter(Boolean) : [],
      managerId: row.manager_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async getOwners(filters: OwnerFilters = {}): Promise<Owner[]> {
    try {
      let query = 'SELECT * FROM property_owners';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.status && filters.status !== 'All') {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.search) {
        conditions.push('(company_name LIKE ? OR primary_contact LIKE ?)');
        const term = `%${filters.search}%`;
        params.push(term, term);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY created_at DESC';

      const db = getDatabase();
      const ownerRows = db.prepare(query).all(...params) as any[];
      return ownerRows.map(this.mapRowToOwner);
    } catch (error) {
      throw new AppError('Failed to fetch property owners', 500);
    }
  }

  static async findOwnerById(id: string): Promise<Owner> {
    try {
      const db = getDatabase();
      const owner = db.prepare('SELECT * FROM property_owners WHERE id = ?').get(id) as any;

      if (!owner) {
        throw new NotFoundError('Owner not found');
      }

      return this.mapRowToOwner(owner);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load property owner', 500);
    }
  }

  static async createOwner(data: CreateOwnerData): Promise<Owner> {
    try {
      const ownerId = this.generateOwnerId();
      const db = getDatabase();
      const query = `
        INSERT INTO property_owners
          (owner_id, company_name, primary_contact, email, phone, status, portfolio_size, locations, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        ownerId,
        data.companyName,
        data.primaryContact || null,
        data.email || null,
        data.phone || null,
        data.status || 'Active',
        data.portfolioSize ?? 0,
        data.locations ? data.locations.join(',') : null,
        data.notes || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findOwnerById(insertId.id.toString());
    } catch (error) {
      throw new AppError('Failed to create property owner', 500);
    }
  }

  static async updateOwner(id: string, data: UpdateOwnerData): Promise<Owner> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.companyName !== undefined) {
        fields.push('company_name = ?');
        params.push(data.companyName);
      }
      if (data.primaryContact !== undefined) {
        fields.push('primary_contact = ?');
        params.push(data.primaryContact || null);
      }
      if (data.email !== undefined) {
        fields.push('email = ?');
        params.push(data.email || null);
      }
      if (data.phone !== undefined) {
        fields.push('phone = ?');
        params.push(data.phone || null);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
      }
      if (data.portfolioSize !== undefined) {
        fields.push('portfolio_size = ?');
        params.push(data.portfolioSize ?? 0);
      }
      if (data.locations !== undefined) {
        fields.push('locations = ?');
        params.push(data.locations ? data.locations.join(',') : null);
      }
      if (data.managerId !== undefined) {
        fields.push('manager_id = ?');
        params.push(data.managerId || null);
      }
      if (data.notes !== undefined) {
        fields.push('notes = ?');
        params.push(data.notes || null);
      }

      if (fields.length === 0) {
        return await this.findOwnerById(id);
      }

      params.push(id);

      const db = getDatabase();
      const query = `
        UPDATE property_owners
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(...params);
      return await this.findOwnerById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update property owner', 500);
    }
  }

  static async deleteOwner(id: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM property_owners WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new NotFoundError('Owner not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete property owner', 500);
    }
  }

  static async assignManager(ownerId: string, managerId: string | null): Promise<Owner> {
    try {
      // Verify owner exists
      await this.findOwnerById(ownerId);
      
      const db = getDatabase();
      // If managerId is provided, verify the user exists and has appropriate role
      if (managerId) {
        const user = db.prepare(
          'SELECT id, role FROM users WHERE id = ? AND status = ?'
        ).get(managerId, 'active') as any;
        if (!user) {
          throw new NotFoundError('Manager not found or inactive');
        }
        if (user.role !== 'manager' && user.role !== 'admin') {
          throw new AppError('User must have manager or admin role', 400);
        }
      }

      // Update owner with manager_id
      const query = `
        UPDATE property_owners
        SET manager_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      db.prepare(query).run(managerId || null, ownerId);

      return await this.findOwnerById(ownerId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to assign manager to owner', 500);
    }
  }
}

