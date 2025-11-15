import getDatabase from "../config/database";
import { AppError, NotFoundError } from "../utils/AppError";

export interface SalesCase {
  id: string;
  case_id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  lead_id?: string;
  lead?: {
    id: string;
    name: string;
    email: string;
  };
  title: string;
  description?: string;
  status: "Open" | "In Progress" | "Quoted" | "Won" | "Lost";
  case_type?: "B2C" | "B2B";
  quotation_status?: "Draft" | "Sent" | "Accepted" | "Rejected";
  value?: number;
  probability: number;
  expected_close_date?: string;
  assigned_to?: string;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  linked_items?: Array<{
    id: string;
    name?: string;
    product_name?: string;
  }>;
  assigned_departments?: Array<{
    id: string;
    name: string;
  }>;
  created_by: string;
  created_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateSalesCaseData {
  customer_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  value?: number;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
}

export interface UpdateSalesCaseData {
  title?: string;
  description?: string;
  status?: "Open" | "In Progress" | "Quoted" | "Won" | "Lost";
  case_type?: "B2C" | "B2B";
  quotation_status?: "Draft" | "Sent" | "Accepted" | "Rejected";
  value?: number;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  linked_items?: number[];
  assigned_departments?: number[];
}

export interface SalesCaseFilters {
  status?: string;
  assigned_to?: string;
  customer_id?: string;
  lead_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class SalesCaseModel {
  // Generate unique case ID
  private static generateCaseId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `SC-${timestamp}${random}`;
  }

  // Create new sales case
  static async createSalesCase(
    salesCaseData: CreateSalesCaseData,
    createdBy: string
  ): Promise<SalesCase> {
    try {
      const case_id = this.generateCaseId();

      const query = `
        INSERT INTO sales_cases (case_id, customer_id, lead_id, title, description, value, probability, expected_close_date, assigned_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        case_id,
        salesCaseData.customer_id,
        salesCaseData.lead_id || null,
        salesCaseData.title,
        salesCaseData.description || null,
        salesCaseData.value || null,
        salesCaseData.probability || 0,
        salesCaseData.expected_close_date || null,
        salesCaseData.assigned_to || null,
        createdBy,
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findSalesCaseById(insertId.toString());
    } catch (error: any) {
      console.error("Error creating sales case:", error);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error SQL:", error.sql);
      throw new AppError(`Failed to create sales case: ${error.message}`, 500);
    }
  }

  // Find sales case by ID
  static async findSalesCaseById(id: string): Promise<SalesCase> {
    try {
      const query = `
        SELECT sc.*, 
               c.name as customer_name, c.email as customer_email,
               l.name as lead_name, l.email as lead_email,
               u1.full_name as assigned_user_name, u1.email as assigned_user_email,
               u2.full_name as created_user_name, u2.email as created_user_email
        FROM sales_cases sc
        LEFT JOIN customers c ON sc.customer_id = c.id
        LEFT JOIN leads l ON sc.lead_id = l.id
        LEFT JOIN users u1 ON sc.assigned_to = u1.id
        LEFT JOIN users u2 ON sc.created_by = u2.id
        WHERE sc.id = ?
      `;

      const db = getDatabase();
      const salesCase = db.prepare(query).get(id) as any;

      if (!salesCase) {
        throw new NotFoundError("Sales case not found");
      }

      // Get linked items - gracefully handle if table doesn't exist
      let linkedItems: any[] = [];
      try {
        const itemsRows = db.prepare(
          `SELECT i.id, i.name, i.product_name 
           FROM sales_case_items sci
           JOIN items i ON sci.item_id = i.id
           WHERE sci.sales_case_id = ?`
        ).all(id) as any[];
        linkedItems = itemsRows.map((item) => ({
          id: item.id.toString(),
          name: item.name,
          product_name: item.product_name,
        }));
      } catch (itemsError: any) {
        // Junction table doesn't exist yet - migration not run
        console.warn(
          "sales_case_items table does not exist - returning empty array"
        );
        linkedItems = [];
      }

      // Get assigned departments - gracefully handle if table doesn't exist
      let assignedDepartments: any[] = [];
      try {
        const deptRows = db.prepare(
          `SELECT d.id, d.name
           FROM sales_case_departments scd
           JOIN departments d ON scd.department_id = d.id
           WHERE scd.sales_case_id = ?`
        ).all(id) as any[];
        assignedDepartments = deptRows.map((dept) => ({
          id: dept.id.toString(),
          name: dept.name,
        }));
      } catch (deptError: any) {
        // Junction table doesn't exist yet - migration not run
        console.warn(
          "sales_case_departments table does not exist - returning empty array"
        );
        assignedDepartments = [];
      }

      return {
        id: salesCase.id.toString(),
        case_id: salesCase.case_id,
        customer_id: salesCase.customer_id.toString(),
        customer: {
          id: salesCase.customer_id.toString(),
          name: salesCase.customer_name,
          email: salesCase.customer_email,
        },
        lead_id: salesCase.lead_id?.toString(),
        lead: salesCase.lead_id
          ? {
              id: salesCase.lead_id.toString(),
              name: salesCase.lead_name,
              email: salesCase.lead_email,
            }
          : undefined,
        title: salesCase.title,
        description: salesCase.description,
        status: salesCase.status,
        case_type: salesCase.case_type || "B2C", // Default if column doesn't exist
        quotation_status: salesCase.quotation_status || "Draft", // Default if column doesn't exist
        value: salesCase.value,
        probability: salesCase.probability,
        expected_close_date: salesCase.expected_close_date,
        assigned_to: salesCase.assigned_to?.toString(),
        assigned_user: salesCase.assigned_to
          ? {
              id: salesCase.assigned_to.toString(),
              full_name: salesCase.assigned_user_name,
              email: salesCase.assigned_user_email,
            }
          : undefined,
        linked_items: linkedItems,
        assigned_departments: assignedDepartments,
        created_by: salesCase.created_by.toString(),
        created_user: {
          id: salesCase.created_by.toString(),
          full_name: salesCase.created_user_name,
          email: salesCase.created_user_email,
        },
        created_at: salesCase.created_at,
        updated_at: salesCase.updated_at,
      };
    } catch (error: any) {
      console.error("Error finding sales case by ID:", error);
      console.error("Error message:", error.message);
      console.error("Error SQL:", error.sql);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Failed to find sales case by ID: ${error.message}`,
        500
      );
    }
  }

  // Get all sales cases with filtering and role-based access
  static async getAllSalesCases(
    filters: SalesCaseFilters,
    userRole: string,
    userId: string
  ): Promise<{ salesCases: SalesCase[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === "agent" || userRole === "sales") {
        whereConditions.push("(sc.assigned_to = ? OR sc.created_by = ?)");
        queryParams.push(userId, userId);
      }

      // Apply filters
      if (filters.status) {
        whereConditions.push("sc.status = ?");
        queryParams.push(filters.status);
      }

      if (filters.assigned_to) {
        whereConditions.push("sc.assigned_to = ?");
        queryParams.push(filters.assigned_to);
      }

      if (filters.customer_id) {
        whereConditions.push("sc.customer_id = ?");
        queryParams.push(filters.customer_id);
      }

      if (filters.lead_id) {
        whereConditions.push("sc.lead_id = ?");
        queryParams.push(filters.lead_id);
      }

      if (filters.search) {
        whereConditions.push(
          "(sc.title LIKE ? OR sc.description LIKE ? OR c.name LIKE ? OR l.name LIKE ?)"
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
        FROM sales_cases sc
        LEFT JOIN customers c ON sc.customer_id = c.id
        LEFT JOIN leads l ON sc.lead_id = l.id
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
        SELECT sc.*, 
               c.name as customer_name, c.email as customer_email,
               l.name as lead_name, l.email as lead_email,
               u1.full_name as assigned_user_name, u1.email as assigned_user_email,
               u2.full_name as created_user_name, u2.email as created_user_email
        FROM sales_cases sc
        LEFT JOIN customers c ON sc.customer_id = c.id
        LEFT JOIN leads l ON sc.lead_id = l.id
        LEFT JOIN users u1 ON sc.assigned_to = u1.id
        LEFT JOIN users u2 ON sc.created_by = u2.id
        ${whereClause}
        ORDER BY sc.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const salesCases = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedSalesCases: SalesCase[] = salesCases.map((salesCase) => ({
        id: salesCase.id.toString(),
        case_id: salesCase.case_id,
        customer_id: salesCase.customer_id.toString(),
        customer: {
          id: salesCase.customer_id.toString(),
          name: salesCase.customer_name,
          email: salesCase.customer_email,
        },
        lead_id: salesCase.lead_id?.toString(),
        lead: salesCase.lead_id
          ? {
              id: salesCase.lead_id.toString(),
              name: salesCase.lead_name,
              email: salesCase.lead_email,
            }
          : undefined,
        title: salesCase.title,
        description: salesCase.description,
        status: salesCase.status,
        case_type: salesCase.case_type,
        quotation_status: salesCase.quotation_status,
        value: salesCase.value,
        probability: salesCase.probability,
        expected_close_date: salesCase.expected_close_date,
        assigned_to: salesCase.assigned_to?.toString(),
        assigned_user: salesCase.assigned_to
          ? {
              id: salesCase.assigned_to.toString(),
              full_name: salesCase.assigned_user_name,
              email: salesCase.assigned_user_email,
            }
          : undefined,
        // Note: linked_items and assigned_departments are not included in list view for performance
        // They are only loaded when fetching a single case by ID
        created_by: salesCase.created_by.toString(),
        created_user: {
          id: salesCase.created_by.toString(),
          full_name: salesCase.created_user_name,
          email: salesCase.created_user_email,
        },
        created_at: salesCase.created_at,
        updated_at: salesCase.updated_at,
      }));

      return { salesCases: formattedSalesCases, total };
    } catch (error) {
      throw new AppError("Failed to get sales cases", 500);
    }
  }

  // Update sales case
  static async updateSalesCase(
    id: string,
    updateData: UpdateSalesCaseData
  ): Promise<SalesCase> {
    const db = getDatabase();
    
    // Extract junction table data before updating main table
    const linkedItems = updateData.linked_items;
    const assignedDepartments = updateData.assigned_departments;

    // Create a copy without junction table fields
    const {
      linked_items: _,
      assigned_departments: __,
      ...mainUpdateData
    } = updateData;

    // Check which columns exist in the database (for backward compatibility)
    let hasCaseType = false;
    let hasQuotationStatus = false;
    try {
      // SQLite doesn't have INFORMATION_SCHEMA, use PRAGMA instead
      const columns = db.prepare(`PRAGMA table_info(sales_cases)`).all() as any[];
      const columnNames = columns.map(col => col.name);
      hasCaseType = columnNames.includes("case_type");
      hasQuotationStatus = columnNames.includes("quotation_status");
    } catch (colCheckError: any) {
      console.warn(
        "Could not check column existence:",
        colCheckError.message
      );
    }

    // SQLite transaction - better-sqlite3 uses transaction wrapper
    try {
      const transaction = db.transaction(() => {
        // Update main sales_case fields - only include defined values and existing columns
        const fields: string[] = [];
        const values: any[] = [];

        // Handle each field explicitly to ensure proper type conversion
        if (mainUpdateData.title !== undefined) {
          fields.push("title = ?");
          values.push(mainUpdateData.title);
        }
        if (mainUpdateData.description !== undefined) {
          fields.push("description = ?");
          values.push(mainUpdateData.description || null);
        }
        if (mainUpdateData.status !== undefined) {
          fields.push("status = ?");
          values.push(mainUpdateData.status);
        }
        // Only update case_type if column exists
        if (mainUpdateData.case_type !== undefined && hasCaseType) {
          fields.push("case_type = ?");
          values.push(mainUpdateData.case_type);
        } else if (mainUpdateData.case_type !== undefined) {
          console.warn("case_type column does not exist - skipping update");
        }
        // Only update quotation_status if column exists
        if (mainUpdateData.quotation_status !== undefined && hasQuotationStatus) {
          fields.push("quotation_status = ?");
          values.push(mainUpdateData.quotation_status);
        } else if (mainUpdateData.quotation_status !== undefined) {
          console.warn(
            "quotation_status column does not exist - skipping update"
          );
        }
        if (mainUpdateData.value !== undefined) {
          fields.push("value = ?");
          values.push(mainUpdateData.value);
        }
        if (mainUpdateData.probability !== undefined) {
          fields.push("probability = ?");
          values.push(mainUpdateData.probability);
        }
        if (mainUpdateData.expected_close_date !== undefined) {
          fields.push("expected_close_date = ?");
          values.push(mainUpdateData.expected_close_date || null);
        }
        if (mainUpdateData.assigned_to !== undefined) {
          fields.push("assigned_to = ?");
          values.push(mainUpdateData.assigned_to || null);
        }

        // Always update the updated_at timestamp
        if (fields.length > 0) {
          fields.push("updated_at = datetime('now')");
          values.push(id);
          const updateQuery = `UPDATE sales_cases SET ${fields.join(
            ", "
          )} WHERE id = ?`;
          console.log("Update query:", updateQuery);
          console.log("Update values:", values);
          db.prepare(updateQuery).run(...values);
        }

        // Update linked items (replace existing) - gracefully handle if table doesn't exist
        if (linkedItems !== undefined) {
          try {
            db.prepare("DELETE FROM sales_case_items WHERE sales_case_id = ?").run(id);
            if (linkedItems.length > 0) {
              const insertItemStmt = db.prepare("INSERT INTO sales_case_items (sales_case_id, item_id) VALUES (?, ?)");
              for (const itemId of linkedItems) {
                insertItemStmt.run(id, itemId);
              }
            }
          } catch (junctionError: any) {
            console.warn(
              "Error updating linked items (table may not exist):",
              junctionError.message
            );
            // Continue if junction table doesn't exist - migration not run yet
          }
        }

        // Update assigned departments (replace existing) - gracefully handle if table doesn't exist
        if (assignedDepartments !== undefined) {
          try {
            db.prepare("DELETE FROM sales_case_departments WHERE sales_case_id = ?").run(id);
            if (assignedDepartments.length > 0) {
              const insertDeptStmt = db.prepare("INSERT INTO sales_case_departments (sales_case_id, department_id) VALUES (?, ?)");
              for (const deptId of assignedDepartments) {
                insertDeptStmt.run(id, deptId);
              }
            }
          } catch (junctionError: any) {
            console.warn(
              "Error updating assigned departments (table may not exist):",
              junctionError.message
            );
            // Continue if junction table doesn't exist - migration not run yet
          }
        }
      });
      
      // Execute transaction
      transaction();
      return await this.findSalesCaseById(id);
    } catch (error: any) {
      console.error("Update sales case error:", error);
      console.error("Error message:", error.message);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to update sales case: ${error.message}`, 500);
    }
  }

  // Delete sales case
  static async deleteSalesCase(id: string): Promise<void> {
    try {
      const query = "DELETE FROM sales_cases WHERE id = ?";
      const db = getDatabase();
      const result = db.prepare(query).run(id);

      if (result.changes === 0) {
        throw new NotFoundError("Sales case not found");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to delete sales case", 500);
    }
  }

  // Update sales case status
  static async updateSalesCaseStatus(
    id: string,
    status: "Open" | "In Progress" | "Quoted" | "Won" | "Lost"
  ): Promise<SalesCase> {
    try {
      const query =
        "UPDATE sales_cases SET status = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(status, id);

      return await this.findSalesCaseById(id);
    } catch (error) {
      throw new AppError("Failed to update sales case status", 500);
    }
  }

  // Assign sales case
  static async assignSalesCase(
    id: string,
    assignedTo: string
  ): Promise<SalesCase> {
    try {
      const query =
        "UPDATE sales_cases SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(assignedTo, id);

      return await this.findSalesCaseById(id);
    } catch (error) {
      throw new AppError("Failed to assign sales case", 500);
    }
  }

  // Get sales case statistics
  static async getSalesCaseStats(
    userRole: string,
    userId: string
  ): Promise<{
    totalCases: number;
    openCases: number;
    wonCases: number;
    lostCases: number;
    totalValue: number;
    wonValue: number;
    averageValue: number;
  }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Role-based filtering
      if (userRole === "agent" || userRole === "sales") {
        whereConditions.push("(sc.assigned_to = ? OR sc.created_by = ?)");
        queryParams.push(userId, userId);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      const query = `
        SELECT 
          COUNT(*) as total_cases,
          COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_cases,
          COUNT(CASE WHEN status = 'Won' THEN 1 END) as won_cases,
          COUNT(CASE WHEN status = 'Lost' THEN 1 END) as lost_cases,
          COALESCE(SUM(value), 0) as total_value,
          COALESCE(SUM(CASE WHEN status = 'Won' THEN value ELSE 0 END), 0) as won_value,
          COALESCE(AVG(value), 0) as avg_value
        FROM sales_cases sc
        ${whereClause}
      `;

      const db = getDatabase();
      const stat = db.prepare(query).get(...queryParams) as any;

      return {
        totalCases: stat?.total_cases || 0,
        openCases: stat?.open_cases || 0,
        wonCases: stat?.won_cases || 0,
        lostCases: stat?.lost_cases || 0,
        totalValue: stat?.total_value || 0,
        wonValue: stat?.won_value || 0,
        averageValue: stat?.avg_value || 0,
      };
    } catch (error) {
      throw new AppError("Failed to get sales case statistics", 500);
    }
  }
}
