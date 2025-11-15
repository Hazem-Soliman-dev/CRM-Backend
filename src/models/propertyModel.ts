import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export type PropertyStatus = 'Available' | 'Reserved' | 'Sold' | 'Under Maintenance';
export type PropertyType = 'Apartment' | 'Villa' | 'Commercial' | 'Land';

export interface Property {
  id: number;
  propertyId: string;
  name: string;
  location: string;
  type: PropertyType;
  status: PropertyStatus;
  nightlyRate: number;
  capacity: number;
  occupancy: number;
  description?: string | null;
  owner?: {
    id: number;
    ownerId: string;
    companyName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  status?: PropertyStatus | 'All';
  type?: PropertyType | 'All';
  ownerId?: string;
  search?: string;
}

export interface CreatePropertyData {
  name: string;
  location: string;
  type: PropertyType;
  status?: PropertyStatus;
  nightlyRate?: number;
  capacity?: number;
  occupancy?: number;
  description?: string;
  ownerId?: number;
}

export interface UpdatePropertyData {
  name?: string;
  location?: string;
  type?: PropertyType;
  status?: PropertyStatus;
  nightlyRate?: number;
  capacity?: number;
  occupancy?: number;
  description?: string | null;
  ownerId?: number | null;
}

export type AvailabilityStatus = 'Available' | 'Reserved' | 'Unavailable';

export interface PropertyAvailability {
  id: number;
  propertyId: number;
  date: string;
  status: AvailabilityStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityData {
  date: string;
  status: AvailabilityStatus;
  notes?: string;
}

export interface UpdateAvailabilityData {
  date?: string;
  status?: AvailabilityStatus;
  notes?: string;
}

export class PropertyModel {
  private static generatePropertyId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `PROP-${timestamp}${random}`;
  }

  private static mapRowToProperty(row: any): Property {
    return {
      id: row.id,
      propertyId: row.property_id,
      name: row.name,
      location: row.location,
      type: row.property_type,
      status: row.status,
      nightlyRate: Number(row.nightly_rate || 0),
      capacity: Number(row.capacity || 0),
      occupancy: Number(row.occupancy || 0),
      description: row.description,
      owner: row.owner_id
        ? {
            id: row.owner_id,
            ownerId: row.owner_code,
            companyName: row.owner_company_name
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async getProperties(filters: PropertyFilters = {}): Promise<Property[]> {
    try {
      let query = `
        SELECT 
          p.*,
          o.company_name as owner_company_name,
          o.owner_id as owner_code
        FROM properties p
        LEFT JOIN property_owners o ON p.owner_id = o.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.status && filters.status !== 'All') {
        conditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (filters.type && filters.type !== 'All') {
        conditions.push('p.property_type = ?');
        params.push(filters.type);
      }

      if (filters.ownerId) {
        conditions.push('(o.owner_id = ? OR p.owner_id = ?)');
        params.push(filters.ownerId, filters.ownerId);
      }

      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push('(p.name LIKE ? OR p.location LIKE ?)');
        params.push(term, term);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY p.created_at DESC';

      const db = getDatabase();
      const propertyRows = db.prepare(query).all(...params) as any[];
      return propertyRows.map(this.mapRowToProperty);
    } catch (error) {
      throw new AppError('Failed to fetch properties', 500);
    }
  }

  static async findPropertyById(id: string): Promise<Property> {
    try {
      const query = `
        SELECT 
          p.*,
          o.company_name as owner_company_name,
          o.owner_id as owner_code
        FROM properties p
        LEFT JOIN property_owners o ON p.owner_id = o.id
        WHERE p.id = ?
      `;
      const db = getDatabase();
      const property = db.prepare(query).get(id) as any;

      if (!property) {
        throw new NotFoundError('Property not found');
      }

      return this.mapRowToProperty(property);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load property', 500);
    }
  }

  static async createProperty(data: CreatePropertyData): Promise<Property> {
    try {
      const propertyId = this.generatePropertyId();
      const db = getDatabase();
      const query = `
        INSERT INTO properties
          (property_id, owner_id, name, location, property_type, status, nightly_rate, capacity, occupancy, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        propertyId,
        data.ownerId || null,
        data.name,
        data.location,
        data.type,
        data.status || 'Available',
        data.nightlyRate ?? 0,
        data.capacity ?? 0,
        data.occupancy ?? 0,
        data.description || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findPropertyById(insertId.id.toString());
    } catch (error) {
      throw new AppError('Failed to create property', 500);
    }
  }

  static async updateProperty(id: string, data: UpdatePropertyData): Promise<Property> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name);
      }
      if (data.location !== undefined) {
        fields.push('location = ?');
        params.push(data.location);
      }
      if (data.type !== undefined) {
        fields.push('property_type = ?');
        params.push(data.type);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
      }
      if (data.nightlyRate !== undefined) {
        fields.push('nightly_rate = ?');
        params.push(data.nightlyRate ?? 0);
      }
      if (data.capacity !== undefined) {
        fields.push('capacity = ?');
        params.push(data.capacity ?? 0);
      }
      if (data.occupancy !== undefined) {
        fields.push('occupancy = ?');
        params.push(data.occupancy ?? 0);
      }
      if (data.description !== undefined) {
        fields.push('description = ?');
        params.push(data.description || null);
      }
      if (data.ownerId !== undefined) {
        fields.push('owner_id = ?');
        params.push(data.ownerId || null);
      }

      if (fields.length === 0) {
        return await this.findPropertyById(id);
      }

      params.push(id);

      const db = getDatabase();
      const query = `
        UPDATE properties
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(...params);
      return await this.findPropertyById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update property', 500);
    }
  }

  static async deleteProperty(id: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM properties WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new NotFoundError('Property not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete property', 500);
    }
  }

  // Property Availability Methods
  private static mapRowToAvailability(row: any): PropertyAvailability {
    return {
      id: row.id,
      propertyId: row.property_id,
      date: row.date,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async getPropertyAvailability(propertyId: string): Promise<PropertyAvailability[]> {
    try {
      // Verify property exists
      await this.findPropertyById(propertyId);

      const db = getDatabase();
      const query = `
        SELECT * FROM property_availability
        WHERE property_id = ?
        ORDER BY date ASC
      `;
      const availabilityRows = db.prepare(query).all(propertyId) as any[];
      return availabilityRows.map(this.mapRowToAvailability);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch property availability', 500);
    }
  }

  static async updatePropertyAvailability(
    propertyId: string,
    availabilityData: CreateAvailabilityData[]
  ): Promise<PropertyAvailability[]> {
    try {
      // Verify property exists
      await this.findPropertyById(propertyId);

      const db = getDatabase();
      // Delete existing availability for this property
      db.prepare('DELETE FROM property_availability WHERE property_id = ?').run(propertyId);

      // Insert new availability records
      if (availabilityData.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO property_availability (property_id, date, status, notes)
          VALUES (?, ?, ?, ?)
        `);
        const insertMany = db.transaction((items: CreateAvailabilityData[]) => {
          for (const item of items) {
            insertStmt.run(propertyId, item.date, item.status, item.notes || null);
          }
        });
        insertMany(availabilityData);
      }

      return await this.getPropertyAvailability(propertyId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update property availability', 500);
    }
  }

  static async createPropertyAvailability(
    propertyId: string,
    availabilityData: CreateAvailabilityData
  ): Promise<PropertyAvailability> {
    try {
      // Verify property exists
      await this.findPropertyById(propertyId);

      const db = getDatabase();
      // Check if record exists
      const existing = db.prepare(
        'SELECT * FROM property_availability WHERE property_id = ? AND date = ?'
      ).get(propertyId, availabilityData.date) as any;

      if (existing) {
        // Update existing
        db.prepare(`
          UPDATE property_availability
          SET status = ?, notes = ?, updated_at = datetime('now')
          WHERE property_id = ? AND date = ?
        `).run(
          availabilityData.status,
          availabilityData.notes || null,
          propertyId,
          availabilityData.date
        );
      } else {
        // Insert new
        db.prepare(`
          INSERT INTO property_availability (property_id, date, status, notes)
          VALUES (?, ?, ?, ?)
        `).run(
          propertyId,
          availabilityData.date,
          availabilityData.status,
          availabilityData.notes || null
        );
      }

      // Get the created/updated record
      const record = db.prepare(
        'SELECT * FROM property_availability WHERE property_id = ? AND date = ?'
      ).get(propertyId, availabilityData.date) as any;
      if (!record) {
        throw new AppError('Failed to retrieve created availability', 500);
      }
      return this.mapRowToAvailability(record);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create property availability', 500);
    }
  }

  static async deletePropertyAvailability(propertyId: string, date: string): Promise<void> {
    try {
      // Verify property exists
      await this.findPropertyById(propertyId);

      const db = getDatabase();
      const result = db.prepare(
        'DELETE FROM property_availability WHERE property_id = ? AND date = ?'
      ).run(propertyId, date);
      if (result.changes === 0) {
        throw new NotFoundError('Availability record not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete property availability', 500);
    }
  }
}

