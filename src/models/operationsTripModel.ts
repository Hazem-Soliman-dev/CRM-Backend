import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export type TripStatus = 'Planned' | 'In Progress' | 'Issue' | 'Completed';

export interface OptionalService {
  id: number;
  serviceCode: string;
  tripId: number;
  serviceName: string;
  category?: string | null;
  price: number;
  addedBy?: string | null;
  addedDate?: string | null;
  status: 'Added' | 'Confirmed' | 'Cancelled';
  invoiced: boolean;
}

export interface OperationsTrip {
  id: number;
  tripCode: string;
  bookingReference?: string | null;
  customerName: string;
  customerCount: number;
  itinerary?: string | null;
  duration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  destinations: string[];
  assignedGuide?: string | null;
  assignedDriver?: string | null;
  transport?: string | null;
  transportDetails?: string | null;
  status: TripStatus;
  specialRequests?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  optionalServices: OptionalService[];
}

export interface TripFilters {
  status?: TripStatus | 'All';
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface CreateTripData {
  bookingReference?: string | null;
  customerName: string;
  customerCount?: number;
  itinerary?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  destinations?: string[];
  assignedGuide?: string;
  assignedDriver?: string;
  transport?: string;
  transportDetails?: string;
  status?: TripStatus;
  specialRequests?: string;
  notes?: string;
}

export interface UpdateTripData extends CreateTripData {}

export interface AssignStaffData {
  assignedGuide: string;
  assignedDriver: string;
  transport: string;
  transportDetails?: string;
}

export interface CreateOptionalServiceData {
  tripId: number;
  serviceName: string;
  category?: string;
  price?: number;
  addedBy?: string;
  addedDate?: string;
  status?: 'Added' | 'Confirmed' | 'Cancelled';
  invoiced?: boolean;
}

export interface UpdateOptionalServiceData extends Omit<CreateOptionalServiceData, 'tripId' | 'serviceName'> {
  serviceName?: string;
}

export class OperationsTripModel {
  private static generateTripCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `OP-${timestamp}${random}`;
  }

  private static mapDestinations(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  private static mapOptionalService(row: any): OptionalService {
    return {
      id: row.id,
      serviceCode: row.service_code,
      tripId: row.trip_id,
      serviceName: row.service_name,
      category: row.category,
      price: Number(row.price ?? 0),
      addedBy: row.added_by,
      addedDate: row.added_date ? new Date(row.added_date).toISOString().split('T')[0] : null,
      status: row.status,
      invoiced: Boolean(row.invoiced)
    };
  }

  private static mapTrip(row: any, optionalServices: OptionalService[] = []): OperationsTrip {
    return {
      id: row.id,
      tripCode: row.trip_code,
      bookingReference: row.booking_reference,
      customerName: row.customer_name,
      customerCount: row.customer_count ?? 0,
      itinerary: row.itinerary,
      duration: row.duration,
      startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : null,
      endDate: row.end_date ? new Date(row.end_date).toISOString().split('T')[0] : null,
      destinations: this.mapDestinations(row.destinations),
      assignedGuide: row.assigned_guide,
      assignedDriver: row.assigned_driver,
      transport: row.transport,
      transportDetails: row.transport_details,
      status: row.status,
      specialRequests: row.special_requests,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      optionalServices
    };
  }

  static async getTrips(filters: TripFilters = {}): Promise<OperationsTrip[]> {
    try {
      let query = `
        SELECT
          t.*
        FROM operations_trips t
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.status && filters.status !== 'All') {
        conditions.push('t.status = ?');
        params.push(filters.status);
      }

      if (filters.search) {
        conditions.push(`(
          t.trip_code LIKE ? OR
          t.customer_name LIKE ? OR
          t.booking_reference LIKE ?
        )`);
        const term = `%${filters.search}%`;
        params.push(term, term, term);
      }

      if (filters.startDateFrom) {
        conditions.push('t.start_date >= ?');
        params.push(filters.startDateFrom);
      }

      if (filters.startDateTo) {
        conditions.push('t.start_date <= ?');
        params.push(filters.startDateTo);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY t.start_date IS NULL, t.start_date ASC, t.created_at DESC';

      const db = getDatabase();
      const tripRows = db.prepare(query).all(...params) as any[];

      if (tripRows.length === 0) {
        return [];
      }

      const tripIds = tripRows.map(row => row.id);
      let serviceRows: any[] = [];
      
      if (tripIds.length > 0) {
        try {
          const serviceQuery = `
            SELECT *
            FROM operations_optional_services
            WHERE trip_id IN (${tripIds.map(() => '?').join(',')})
            ORDER BY added_date DESC, created_at DESC
          `;
          serviceRows = db.prepare(serviceQuery).all(...tripIds) as any[];
        } catch (serviceError) {
          // If optional services table doesn't exist or has issues, continue without services
          console.warn('Error fetching optional services:', serviceError);
          serviceRows = [];
        }
      }

      const servicesByTrip = new Map<number, OptionalService[]>();
      (serviceRows as any[]).forEach(row => {
        try {
          const service = this.mapOptionalService(row);
          if (!servicesByTrip.has(service.tripId)) {
            servicesByTrip.set(service.tripId, []);
          }
          servicesByTrip.get(service.tripId)!.push(service);
        } catch (error) {
          console.warn('Error mapping optional service:', error);
        }
      });

      return tripRows.map(row => {
        try {
          return this.mapTrip(row, servicesByTrip.get(row.id) || []);
        } catch (error) {
          console.error('Error mapping trip:', error, row);
          throw error;
        }
      });
    } catch (error: any) {
      console.error('Error fetching operations trips:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
        sql: error?.sql
      });
      if (error instanceof AppError) {
        throw error;
      }
      // Provide more detailed error message
      const errorMessage = error?.sqlMessage || error?.message || 'Unknown database error';
      throw new AppError(`Failed to fetch operations trips: ${errorMessage}`, 500);
    }
  }

  static async findTripById(id: number): Promise<OperationsTrip> {
    try {
      const db = getDatabase();
      const trip = db.prepare('SELECT * FROM operations_trips WHERE id = ?').get(id) as any;

      if (!trip) {
        throw new NotFoundError('Trip not found');
      }

      const serviceRows = db.prepare(
        'SELECT * FROM operations_optional_services WHERE trip_id = ? ORDER BY added_date DESC, created_at DESC'
      ).all(id) as any[];
      const optionalServices = serviceRows.map(this.mapOptionalService);

      return this.mapTrip(trip, optionalServices);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load trip', 500);
    }
  }

  static async createTrip(data: CreateTripData): Promise<OperationsTrip> {
    try {
      const tripCode = this.generateTripCode();
      const destinations = data.destinations ? JSON.stringify(data.destinations) : null;

      const db = getDatabase();
      const query = `
        INSERT INTO operations_trips
          (trip_code, booking_reference, customer_name, customer_count, itinerary, duration, start_date, end_date, destinations, assigned_guide, assigned_driver, transport, transport_details, status, special_requests, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        tripCode,
        data.bookingReference || null,
        data.customerName,
        data.customerCount ?? 1,
        data.itinerary || null,
        data.duration || null,
        data.startDate ? new Date(data.startDate) : null,
        data.endDate ? new Date(data.endDate) : null,
        destinations,
        data.assignedGuide || null,
        data.assignedDriver || null,
        data.transport || null,
        data.transportDetails || null,
        data.status || 'Planned',
        data.specialRequests || null,
        data.notes || null
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findTripById(insertId.id);
    } catch (error) {
      throw new AppError('Failed to create trip', 500);
    }
  }

  static async updateTrip(id: number, data: UpdateTripData): Promise<OperationsTrip> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.bookingReference !== undefined) {
        fields.push('booking_reference = ?');
        params.push(data.bookingReference || null);
      }
      if (data.customerName !== undefined) {
        fields.push('customer_name = ?');
        params.push(data.customerName);
      }
      if (data.customerCount !== undefined) {
        fields.push('customer_count = ?');
        params.push(data.customerCount ?? 1);
      }
      if (data.itinerary !== undefined) {
        fields.push('itinerary = ?');
        params.push(data.itinerary || null);
      }
      if (data.duration !== undefined) {
        fields.push('duration = ?');
        params.push(data.duration || null);
      }
      if (data.startDate !== undefined) {
        fields.push('start_date = ?');
        params.push(data.startDate ? new Date(data.startDate) : null);
      }
      if (data.endDate !== undefined) {
        fields.push('end_date = ?');
        params.push(data.endDate ? new Date(data.endDate) : null);
      }
      if (data.destinations !== undefined) {
        fields.push('destinations = ?');
        params.push(data.destinations ? JSON.stringify(data.destinations) : null);
      }
      if (data.assignedGuide !== undefined) {
        fields.push('assigned_guide = ?');
        params.push(data.assignedGuide || null);
      }
      if (data.assignedDriver !== undefined) {
        fields.push('assigned_driver = ?');
        params.push(data.assignedDriver || null);
      }
      if (data.transport !== undefined) {
        fields.push('transport = ?');
        params.push(data.transport || null);
      }
      if (data.transportDetails !== undefined) {
        fields.push('transport_details = ?');
        params.push(data.transportDetails || null);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
      }
      if (data.specialRequests !== undefined) {
        fields.push('special_requests = ?');
        params.push(data.specialRequests || null);
      }
      if (data.notes !== undefined) {
        fields.push('notes = ?');
        params.push(data.notes || null);
      }

      if (fields.length === 0) {
        return await this.findTripById(id);
      }

      params.push(id);

      const db = getDatabase();
      const query = `
        UPDATE operations_trips
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `;

      db.prepare(query).run(...params);
      return await this.findTripById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update trip', 500);
    }
  }

  static async updateTripStatus(id: number, status: TripStatus): Promise<OperationsTrip> {
    try {
      const db = getDatabase();
      db.prepare(
        `
          UPDATE operations_trips
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `
      ).run(status, id);

      return await this.findTripById(id);
    } catch (error) {
      throw new AppError('Failed to update trip status', 500);
    }
  }

  static async assignStaff(id: number, data: AssignStaffData): Promise<OperationsTrip> {
    try {
      const db = getDatabase();
      db.prepare(
        `
          UPDATE operations_trips
          SET assigned_guide = ?, assigned_driver = ?, transport = ?, transport_details = ?, updated_at = datetime('now')
          WHERE id = ?
        `
      ).run(data.assignedGuide, data.assignedDriver, data.transport, data.transportDetails || null, id);

      return await this.findTripById(id);
    } catch (error) {
      throw new AppError('Failed to assign staff', 500);
    }
  }

  static async deleteTrip(id: number): Promise<void> {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM operations_trips WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new NotFoundError('Trip not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete trip', 500);
    }
  }

  static async getOptionalServices(tripId: number): Promise<OptionalService[]> {
    try {
      const db = getDatabase();
      const rows = db.prepare(
        'SELECT * FROM operations_optional_services WHERE trip_id = ? ORDER BY added_date DESC, created_at DESC'
      ).all(tripId) as any[];
      return rows.map(this.mapOptionalService);
    } catch (error) {
      throw new AppError('Failed to fetch optional services', 500);
    }
  }

  static async findOptionalService(tripId: number, serviceId: number): Promise<OptionalService> {
    try {
      const db = getDatabase();
      const service = db.prepare(
        'SELECT * FROM operations_optional_services WHERE trip_id = ? AND id = ?'
      ).get(tripId, serviceId) as any;
      if (!service) {
        throw new NotFoundError('Optional service not found');
      }
      return this.mapOptionalService(service);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to load optional service', 500);
    }
  }

  static async createOptionalService(data: CreateOptionalServiceData): Promise<OptionalService> {
    try {
      const serviceCode = `OPT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      const db = getDatabase();
      const query = `
        INSERT INTO operations_optional_services
          (service_code, trip_id, service_name, category, price, added_by, added_date, status, invoiced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(query).run(
        serviceCode,
        data.tripId,
        data.serviceName,
        data.category || null,
        data.price ?? 0,
        data.addedBy || null,
        data.addedDate ? new Date(data.addedDate) : null,
        data.status || 'Added',
        data.invoiced ? 1 : 0
      );

      const insertId = db.prepare("SELECT last_insert_rowid() as id").get() as any;
      return await this.findOptionalService(data.tripId, insertId.id);
    } catch (error) {
      throw new AppError('Failed to create optional service', 500);
    }
  }

  static async updateOptionalService(
    tripId: number,
    serviceId: number,
    data: UpdateOptionalServiceData
  ): Promise<OptionalService> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.serviceName !== undefined) {
        fields.push('service_name = ?');
        params.push(data.serviceName);
      }
      if (data.category !== undefined) {
        fields.push('category = ?');
        params.push(data.category || null);
      }
      if (data.price !== undefined) {
        fields.push('price = ?');
        params.push(data.price ?? 0);
      }
      if (data.addedBy !== undefined) {
        fields.push('added_by = ?');
        params.push(data.addedBy || null);
      }
      if (data.addedDate !== undefined) {
        fields.push('added_date = ?');
        params.push(data.addedDate ? new Date(data.addedDate) : null);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
      }
      if (data.invoiced !== undefined) {
        fields.push('invoiced = ?');
        params.push(data.invoiced ? 1 : 0);
      }

      if (fields.length === 0) {
        return await this.findOptionalService(tripId, serviceId);
      }

      params.push(tripId, serviceId);

      const db = getDatabase();
      const query = `
        UPDATE operations_optional_services
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE trip_id = ? AND id = ?
      `;

      db.prepare(query).run(...params);
      return await this.findOptionalService(tripId, serviceId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update optional service', 500);
    }
  }

  static async deleteOptionalService(tripId: number, serviceId: number): Promise<void> {
    try {
      const db = getDatabase();
      const result = db.prepare(
        'DELETE FROM operations_optional_services WHERE trip_id = ? AND id = ?'
      ).run(tripId, serviceId);
      if (result.changes === 0) {
        throw new NotFoundError('Optional service not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete optional service', 500);
    }
  }
}



