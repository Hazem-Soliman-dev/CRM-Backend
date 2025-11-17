import getDatabase from "../config/database";
import { AppError, NotFoundError } from "../utils/AppError";

export interface Customer {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: "Individual" | "Corporate";
  status: "Active" | "Inactive" | "Suspended";
  contact_method: "Email" | "Phone" | "SMS";
  assigned_staff_id?: string;
  assigned_staff?: {
    id: string;
    full_name: string;
    email: string;
  };
  total_bookings: number;
  total_value: number;
  last_trip?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: "Individual" | "Corporate";
  contact_method?: "Email" | "Phone" | "SMS";
  assigned_staff_id?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: "Individual" | "Corporate";
  status?: "Active" | "Inactive" | "Suspended";
  contact_method?: "Email" | "Phone" | "SMS";
  assigned_staff_id?: string;
  notes?: string;
}

export interface CustomerFilters {
  status?: string;
  type?: string;
  assigned_staff_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class CustomerModel {
  // Generate unique customer ID
  private static generateCustomerId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `CU-${timestamp}${random}`;
  }

  // Create new customer
  static async createCustomer(
    customerData: CreateCustomerData
  ): Promise<Customer> {
    try {
      const customer_id = this.generateCustomerId();

      const query = `
        INSERT INTO customers (customer_id, name, email, phone, company, type, contact_method, assigned_staff_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        customer_id,
        customerData.name,
        customerData.email,
        customerData.phone,
        customerData.company || null,
        customerData.type,
        customerData.contact_method || "Email",
        customerData.assigned_staff_id || null,
        customerData.notes || null
      );

      const insertId = (
        db.prepare("SELECT last_insert_rowid() as id").get() as any
      ).id;
      return await this.findCustomerById(insertId.toString());
    } catch (error) {
      throw new AppError("Failed to create customer", 500);
    }
  }

  // Find customer by ID
  static async findCustomerById(id: string): Promise<Customer> {
    try {
      const query = `
        SELECT c.*, u.full_name as staff_name, u.email as staff_email
        FROM customers c
        LEFT JOIN users u ON c.assigned_staff_id = u.id
        WHERE c.id = ?
      `;

      const db = getDatabase();
      const customer = db.prepare(query).get(id) as any;

      if (!customer) {
        throw new NotFoundError("Customer not found");
      }
      return {
        id: customer.id,
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        status: customer.status,
        contact_method: customer.contact_method,
        assigned_staff_id: customer.assigned_staff_id,
        assigned_staff: customer.assigned_staff_id
          ? {
              id: customer.assigned_staff_id,
              full_name: customer.staff_name,
              email: customer.staff_email,
            }
          : undefined,
        total_bookings: customer.total_bookings,
        total_value: customer.total_value,
        last_trip: customer.last_trip,
        notes: customer.notes,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to find customer by ID", 500);
    }
  }

  // Get all customers with filtering and role-based access
  static async getAllCustomers(
    filters: CustomerFilters,
    userRole: string,
    userId: string
  ): Promise<{ customers: Customer[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === "customer") {
        whereConditions.push("c.id = ?");
        queryParams.push(userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push("c.status = ?");
        queryParams.push(filters.status);
      }

      if (filters.type) {
        whereConditions.push("c.type = ?");
        queryParams.push(filters.type);
      }

      if (filters.assigned_staff_id) {
        whereConditions.push("c.assigned_staff_id = ?");
        queryParams.push(filters.assigned_staff_id);
      }

      if (filters.search) {
        whereConditions.push(
          "(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        ${whereClause}
      `;
      const db = getDatabase();

      // Filter out undefined values for count query
      const countParams = queryParams.filter((p) => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult.total;

      // Main query - calculate booking counts and values from actual reservations
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          c.*,
          u.full_name as staff_name,
          u.email as staff_email,
          COUNT(DISTINCT r.id) as total_bookings,
          COALESCE((
            SELECT SUM(p2.amount) 
            FROM payments p2 
            INNER JOIN reservations r2 ON p2.booking_id = r2.id 
            WHERE r2.customer_id = c.id AND p2.payment_status = 'Completed'
          ), 0) as total_value,
          MAX(r.created_at) as last_trip
        FROM customers c
        LEFT JOIN users u ON c.assigned_staff_id = u.id
        LEFT JOIN reservations r ON c.id = r.customer_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [
        ...queryParams.filter((p) => p !== undefined),
        limit,
        offset,
      ];
      const customers = db.prepare(query).all(...allParams) as any[];

      const formattedCustomers: Customer[] = customers.map((customer) => ({
        id: customer.id,
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        status: customer.status,
        contact_method: customer.contact_method,
        assigned_staff_id: customer.assigned_staff_id,
        assigned_staff: customer.assigned_staff_id
          ? {
              id: customer.assigned_staff_id,
              full_name: customer.staff_name,
              email: customer.staff_email,
            }
          : undefined,
        total_bookings:
          typeof customer.total_bookings === "number"
            ? customer.total_bookings
            : parseInt(String(customer.total_bookings || 0), 10),
        total_value:
          typeof customer.total_value === "number"
            ? customer.total_value
            : parseFloat(String(customer.total_value || 0)),
        last_trip: customer.last_trip || null,
        notes: customer.notes,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      }));

      return { customers: formattedCustomers, total };
    } catch (error) {
      throw new AppError("Failed to get customers", 500);
    }
  }

  // Update customer
  static async updateCustomer(
    id: string,
    updateData: UpdateCustomerData
  ): Promise<Customer> {
    try {
      const fields = [];
      const values = [];

      // Only process fields that are allowed to be updated
      const allowedFields = [
        "name",
        "email",
        "phone",
        "company",
        "type",
        "status",
        "contact_method",
        "assigned_staff_id",
        "notes",
      ];

      Object.entries(updateData).forEach(([key, value]) => {
        // Only process allowed fields and skip undefined values
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === "assigned_staff_id") {
            // Handle assigned_staff_id: convert to integer or null
            if (value === "" || value === null || value === undefined) {
              fields.push(`${key} = ?`);
              values.push(null);
            } else {
              // Convert number or string to integer
              const staffId =
                typeof value === "number" ? value : parseInt(String(value), 10);
              if (isNaN(staffId)) {
                throw new AppError("Invalid assigned_staff_id", 400);
              }
              fields.push(`${key} = ?`);
              values.push(staffId);
            }
          } else if (key === "contact_method") {
            // Validate and normalize contact_method
            const validMethods = ["Email", "Phone", "SMS"];
            const method = String(value);
            if (method === "WhatsApp") {
              // Convert WhatsApp to SMS
              fields.push(`${key} = ?`);
              values.push("SMS");
            } else if (validMethods.includes(method)) {
              fields.push(`${key} = ?`);
              values.push(method);
            } else {
              throw new AppError(
                `Invalid contact_method. Must be one of: ${validMethods.join(
                  ", "
                )}`,
                400
              );
            }
          } else {
            // For optional string fields, convert empty strings to null
            if ((key === "company" || key === "notes") && value === "") {
              fields.push(`${key} = ?`);
              values.push(null);
            } else {
              fields.push(`${key} = ?`);
              values.push(value);
            }
          }
        }
      });

      if (fields.length === 0) {
        throw new AppError("No fields to update", 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const query = `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`;
      const db = getDatabase();
      const result = db.prepare(query).run(...values);

      if (result.changes === 0) {
        throw new NotFoundError("Customer not found");
      }

      return await this.findCustomerById(id);
    } catch (error) {
      if (error instanceof AppError || error instanceof NotFoundError) {
        throw error;
      }
      // Log the actual error for debugging
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Update customer error:", errorMessage);
      throw new AppError(`Failed to update customer: ${errorMessage}`, 500);
    }
  }

  // Delete customer
  static async deleteCustomer(id: string): Promise<void> {
    try {
      const query = "DELETE FROM customers WHERE id = ?";
      const db = getDatabase();
      const result = db.prepare(query).run(id);

      if (result.changes === 0) {
        throw new NotFoundError("Customer not found");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to delete customer", 500);
    }
  }

  // Get customer statistics
  static async getCustomerStats(customerId: string): Promise<{
    totalBookings: number;
    totalValue: number;
    lastBooking?: string;
    averageBookingValue: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(r.id) as total_bookings,
          COALESCE(SUM(p.amount), 0) as total_value,
          MAX(r.created_at) as last_booking,
          COALESCE(AVG(p.amount), 0) as avg_booking_value
        FROM customers c
        LEFT JOIN reservations r ON c.id = r.customer_id
        LEFT JOIN payments p ON r.id = p.booking_id
        WHERE c.id = ?
      `;

      const db = getDatabase();
      const stat = db.prepare(query).get(customerId) as any;

      return {
        totalBookings: stat?.total_bookings || 0,
        totalValue: stat?.total_value || 0,
        lastBooking: stat?.last_booking,
        averageBookingValue: stat?.avg_booking_value || 0,
      };
    } catch (error) {
      throw new AppError("Failed to get customer statistics", 500);
    }
  }
}
