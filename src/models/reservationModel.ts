import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Reservation {
  id: string;
  reservation_id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  supplier_id?: string;
  supplier?: {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email: string;
  };
  service_type: 'Flight' | 'Hotel' | 'Car Rental' | 'Tour' | 'Package' | 'Other';
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  total_amount: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  payment_status: 'Pending' | 'Partial' | 'Paid' | 'Refunded';
  notes?: string;
  created_by: string;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateReservationData {
  customer_id: string;
  supplier_id?: string;
  service_type: 'Flight' | 'Hotel' | 'Car Rental' | 'Tour' | 'Package' | 'Other';
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children?: number;
  infants?: number;
  total_amount: number;
  notes?: string;
}

export interface UpdateReservationData {
  supplier_id?: string;
  service_type?: 'Flight' | 'Hotel' | 'Car Rental' | 'Tour' | 'Package' | 'Other';
  destination?: string;
  departure_date?: string;
  return_date?: string;
  adults?: number;
  children?: number;
  infants?: number;
  total_amount?: number;
  status?: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  payment_status?: 'Pending' | 'Partial' | 'Paid' | 'Refunded';
  notes?: string;
}

export interface ReservationFilters {
  status?: string;
  payment_status?: string;
  service_type?: string;
  supplier_id?: string;
  customer_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ReservationModel {
  // Generate unique reservation ID
  private static generateReservationId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RS-${timestamp}${random}`;
  }

  // Create new reservation
  static async createReservation(reservationData: CreateReservationData, createdBy: string): Promise<Reservation> {
    try {
      const reservation_id = this.generateReservationId();
      
      // Convert IDs to integers (database expects INTEGER)
      const customerId = typeof reservationData.customer_id === 'number' 
        ? reservationData.customer_id 
        : parseInt(String(reservationData.customer_id), 10);
      
      if (isNaN(customerId)) {
        throw new AppError('Invalid customer_id', 400);
      }

      const supplierId = reservationData.supplier_id 
        ? (typeof reservationData.supplier_id === 'number' 
            ? reservationData.supplier_id 
            : parseInt(String(reservationData.supplier_id), 10))
        : null;
      
      if (supplierId !== null && isNaN(supplierId)) {
        throw new AppError('Invalid supplier_id', 400);
      }

      const createdById = typeof createdBy === 'number' 
        ? createdBy 
        : parseInt(String(createdBy), 10);
      
      if (isNaN(createdById)) {
        throw new AppError('Invalid created_by user ID', 400);
      }

      // Validate required fields
      if (!reservationData.service_type || !reservationData.destination || !reservationData.departure_date) {
        throw new AppError('service_type, destination, and departure_date are required', 400);
      }

      // Validate service_type
      const validServiceTypes = ['Flight', 'Hotel', 'Car Rental', 'Tour', 'Package', 'Other'];
      if (!validServiceTypes.includes(reservationData.service_type)) {
        throw new AppError(`Invalid service_type. Must be one of: ${validServiceTypes.join(', ')}`, 400);
      }

      // Ensure numeric fields are numbers
      const adults = typeof reservationData.adults === 'number' 
        ? reservationData.adults 
        : parseInt(String(reservationData.adults || 1), 10);
      
      const children = typeof reservationData.children === 'number' 
        ? reservationData.children 
        : parseInt(String(reservationData.children || 0), 10);
      
      const infants = typeof reservationData.infants === 'number' 
        ? reservationData.infants 
        : parseInt(String(reservationData.infants || 0), 10);
      
      const totalAmount = typeof reservationData.total_amount === 'number' 
        ? reservationData.total_amount 
        : parseFloat(String(reservationData.total_amount || 0));

      if (isNaN(adults) || adults < 0) {
        throw new AppError('Invalid adults count', 400);
      }
      if (isNaN(children) || children < 0) {
        throw new AppError('Invalid children count', 400);
      }
      if (isNaN(infants) || infants < 0) {
        throw new AppError('Invalid infants count', 400);
      }
      if (isNaN(totalAmount) || totalAmount < 0) {
        throw new AppError('Invalid total_amount', 400);
      }
      
      const query = `
        INSERT INTO reservations (
          reservation_id, customer_id, supplier_id, service_type, destination,
          departure_date, return_date, adults, children, infants, total_amount,
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        reservation_id,
        customerId,
        supplierId,
        reservationData.service_type,
        reservationData.destination,
        reservationData.departure_date,
        reservationData.return_date || null,
        adults,
        children,
        infants,
        totalAmount,
        reservationData.notes || null,
        createdById
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findReservationById(insertId.toString());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      // Log the actual error for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Create reservation error:', errorMessage);
      console.error('Create reservation error details:', error);
      throw new AppError(`Failed to create reservation: ${errorMessage}`, 500);
    }
  }

  // Find reservation by ID
  static async findReservationById(id: string): Promise<Reservation> {
    try {
      const query = `
        SELECT r.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email,
               u.full_name as created_by_name, u.email as created_by_email
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `;
      
      const db = getDatabase();
      const reservation = db.prepare(query).get(id) as any;
      
      if (!reservation) {
        throw new NotFoundError('Reservation not found');
      }
      return {
        id: reservation.id,
        reservation_id: reservation.reservation_id,
        customer_id: reservation.customer_id,
        customer: {
          id: reservation.customer_id,
          name: reservation.customer_name,
          email: reservation.customer_email,
          phone: reservation.customer_phone
        },
        supplier_id: reservation.supplier_id,
        supplier: reservation.supplier_id ? {
          id: reservation.supplier_id,
          name: reservation.supplier_name,
          contact_person: reservation.contact_person,
          phone: reservation.supplier_phone,
          email: reservation.supplier_email
        } : undefined,
        service_type: reservation.service_type,
        destination: reservation.destination,
        departure_date: reservation.departure_date,
        return_date: reservation.return_date,
        adults: reservation.adults,
        children: reservation.children,
        infants: reservation.infants,
        total_amount: reservation.total_amount,
        status: reservation.status,
        payment_status: reservation.payment_status,
        notes: reservation.notes,
        created_by: reservation.created_by,
        created_by_user: {
          id: reservation.created_by,
          full_name: reservation.created_by_name,
          email: reservation.created_by_email
        },
        created_at: reservation.created_at,
        updated_at: reservation.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find reservation by ID', 500);
    }
  }

  // Get all reservations with filtering
  static async getAllReservations(filters: ReservationFilters, userRole: string, userId: string): Promise<{ reservations: Reservation[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === 'customer') {
        whereConditions.push('r.customer_id = ?');
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push('r.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.payment_status) {
        whereConditions.push('r.payment_status = ?');
        queryParams.push(filters.payment_status);
      }

      if (filters.service_type) {
        whereConditions.push('r.service_type = ?');
        queryParams.push(filters.service_type);
      }

      if (filters.supplier_id) {
        whereConditions.push('r.supplier_id = ?');
        queryParams.push(filters.supplier_id);
      }

      if (filters.customer_id) {
        whereConditions.push('r.customer_id = ?');
        queryParams.push(filters.customer_id);
      }

      if (filters.created_by) {
        whereConditions.push('r.created_by = ?');
        queryParams.push(filters.created_by);
      }

      if (filters.date_from) {
        whereConditions.push('r.departure_date >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('r.departure_date <= ?');
        queryParams.push(filters.date_to);
      }

      if (filters.search) {
        whereConditions.push('(r.destination LIKE ? OR c.name LIKE ? OR c.email LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        ${whereClause}
      `;
      const db = getDatabase();
      
      // Filter out undefined values for count query
      const countParams = queryParams.filter(p => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult.total;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT r.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email,
               u.full_name as created_by_name, u.email as created_by_email
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN users u ON r.created_by = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [...queryParams.filter(p => p !== undefined), limit, offset];
      const reservations = db.prepare(query).all(...allParams) as any[];

      const formattedReservations: Reservation[] = reservations.map(reservation => ({
        id: reservation.id,
        reservation_id: reservation.reservation_id,
        customer_id: reservation.customer_id,
        customer: {
          id: reservation.customer_id,
          name: reservation.customer_name,
          email: reservation.customer_email,
          phone: reservation.customer_phone
        },
        supplier_id: reservation.supplier_id,
        supplier: reservation.supplier_id ? {
          id: reservation.supplier_id,
          name: reservation.supplier_name,
          contact_person: reservation.contact_person,
          phone: reservation.supplier_phone,
          email: reservation.supplier_email
        } : undefined,
        service_type: reservation.service_type,
        destination: reservation.destination,
        departure_date: reservation.departure_date,
        return_date: reservation.return_date,
        adults: reservation.adults,
        children: reservation.children,
        infants: reservation.infants,
        total_amount: reservation.total_amount,
        status: reservation.status,
        payment_status: reservation.payment_status,
        notes: reservation.notes,
        created_by: reservation.created_by,
        created_by_user: {
          id: reservation.created_by,
          full_name: reservation.created_by_name,
          email: reservation.created_by_email
        },
        created_at: reservation.created_at,
        updated_at: reservation.updated_at
      }));

      return { reservations: formattedReservations, total };
    } catch (error) {
      throw new AppError('Failed to get reservations', 500);
    }
  }

  // Update reservation
  static async updateReservation(id: string, updateData: UpdateReservationData): Promise<Reservation> {
    try {
      // Prevent updating customer_id - it's not allowed
      if ('customer_id' in updateData && updateData.customer_id !== undefined) {
        throw new AppError('customer_id cannot be updated', 400);
      }

      // Validate and convert supplier_id if provided
      if (updateData.supplier_id !== undefined) {
        const supplierId = typeof updateData.supplier_id === 'number' 
          ? updateData.supplier_id 
          : parseInt(String(updateData.supplier_id), 10);
        
        if (isNaN(supplierId) || supplierId <= 0) {
          throw new AppError('Invalid supplier_id', 400);
        }
        updateData.supplier_id = String(supplierId);
      }

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

      const query = `UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findReservationById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update reservation', 500);
    }
  }

  // Delete reservation
  static async deleteReservation(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM reservations WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Reservation not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete reservation', 500);
    }
  }

  // Get today's schedule
  static async getTodaySchedule(): Promise<Reservation[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT r.*, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        WHERE DATE(r.departure_date) = ?
        ORDER BY r.departure_date ASC
      `;
      
      const db = getDatabase();
      const reservations = db.prepare(query).all(today) as any[];

      return reservations.map(reservation => ({
        id: reservation.id,
        reservation_id: reservation.reservation_id,
        customer_id: reservation.customer_id,
        customer: {
          id: reservation.customer_id,
          name: reservation.customer_name,
          email: reservation.customer_email,
          phone: reservation.customer_phone
        },
        supplier_id: reservation.supplier_id,
        supplier: reservation.supplier_id ? {
          id: reservation.supplier_id,
          name: reservation.supplier_name,
          contact_person: reservation.contact_person,
          phone: reservation.supplier_phone,
          email: reservation.supplier_email
        } : undefined,
        service_type: reservation.service_type,
        destination: reservation.destination,
        departure_date: reservation.departure_date,
        return_date: reservation.return_date,
        adults: reservation.adults,
        children: reservation.children,
        infants: reservation.infants,
        total_amount: reservation.total_amount,
        status: reservation.status,
        payment_status: reservation.payment_status,
        notes: reservation.notes,
        created_by: reservation.created_by,
        created_at: reservation.created_at,
        updated_at: reservation.updated_at
      }));
    } catch (error) {
      throw new AppError('Failed to get today\'s schedule', 500);
    }
  }
}
