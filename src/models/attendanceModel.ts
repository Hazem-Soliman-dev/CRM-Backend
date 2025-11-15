import getDatabase from "../config/database";
import { AppError, NotFoundError } from "../utils/AppError";

export interface Attendance {
  id: string;
  user_id: string;
  employee_name?: string;
  department?: string;
  clock_in: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_hours: number;
  status: "Present" | "Absent" | "Late" | "Half Day" | "Leave";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarkAttendanceData {
  user_id: string;
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  status: "Present" | "Absent" | "Late" | "Half Day" | "Leave";
  notes?: string;
}

export interface AttendanceFilters {
  user_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class AttendanceModel {
  /**
   * Mark or update attendance for an employee
   * Uses UPSERT pattern based on user_id and date extracted from clock_in
   */
  static async markAttendance(data: MarkAttendanceData): Promise<Attendance> {
    try {
      // Validate required fields
      if (!data.user_id) {
        throw new AppError("user_id is required", 400);
      }

      // If clock_in is provided, use it; otherwise use current timestamp
      const clockInTime = data.clock_in ? new Date(data.clock_in) : new Date();

      // Extract date from clock_in for checking existing records
      const dateStr = clockInTime.toISOString().split("T")[0]; // YYYY-MM-DD

      // Check if record already exists for this user and date
      const db = getDatabase();
      const checkQuery = `
        SELECT id FROM attendance
        WHERE user_id = ? AND date(clock_in) = ?
      `;
      const existingRecord = db
        .prepare(checkQuery)
        .get(data.user_id, dateStr) as any;

      if (existingRecord) {
        // Update existing record
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (data.clock_in !== undefined) {
          updateFields.push("clock_in = ?");
          updateValues.push(clockInTime.toISOString());
        }
        if (data.clock_out !== undefined) {
          updateFields.push("clock_out = ?");
          updateValues.push(
            data.clock_out ? new Date(data.clock_out).toISOString() : null
          );
        }
        if (data.break_start !== undefined) {
          updateFields.push("break_start = ?");
          updateValues.push(
            data.break_start ? new Date(data.break_start).toISOString() : null
          );
        }
        if (data.break_end !== undefined) {
          updateFields.push("break_end = ?");
          updateValues.push(
            data.break_end ? new Date(data.break_end).toISOString() : null
          );
        }
        if (data.status !== undefined) {
          updateFields.push("status = ?");
          updateValues.push(data.status);
        }
        if (data.notes !== undefined) {
          updateFields.push("notes = ?");
          updateValues.push(data.notes || null);
        }

        // Calculate total_hours if both clock_in and clock_out are present or updated
        // Use the incoming values or get from existing record
        const calculateTotalHours = (
          clockIn: Date,
          clockOut: Date,
          breakStart?: Date | null,
          breakEnd?: Date | null
        ): number => {
          let diffMs = clockOut.getTime() - clockIn.getTime();
          // Subtract break duration if break times are provided
          if (breakStart && breakEnd) {
            const breakMs = breakEnd.getTime() - breakStart.getTime();
            diffMs -= breakMs;
          }
          return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        };

        if (data.clock_out) {
          // If clock_out is provided, calculate total_hours
          const clockIn = data.clock_in ? new Date(data.clock_in) : clockInTime;
          const clockOut = new Date(data.clock_out);
          const breakStart = data.break_start
            ? new Date(data.break_start)
            : null;
          const breakEnd = data.break_end ? new Date(data.break_end) : null;
          const totalHours = calculateTotalHours(
            clockIn,
            clockOut,
            breakStart,
            breakEnd
          );
          updateFields.push("total_hours = ?");
          updateValues.push(totalHours);
        } else if (existingRecord && data.clock_in) {
          // If only clock_in is updated, check if there's existing clock_out
          const existing = db
            .prepare(
              "SELECT clock_out, break_start, break_end FROM attendance WHERE id = ?"
            )
            .get(existingRecord.id) as any;
          if (existing?.clock_out) {
            const clockIn = clockInTime;
            const clockOut = new Date(existing.clock_out);
            const breakStart = existing.break_start
              ? new Date(existing.break_start)
              : null;
            const breakEnd = existing.break_end
              ? new Date(existing.break_end)
              : null;
            const totalHours = calculateTotalHours(
              clockIn,
              clockOut,
              breakStart,
              breakEnd
            );
            updateFields.push("total_hours = ?");
            updateValues.push(totalHours);
          }
        } else if (existingRecord && (data.break_start || data.break_end)) {
          // If break times are updated, recalculate total_hours if clock_out exists
          const existing = db
            .prepare(
              "SELECT clock_in, clock_out, break_start, break_end FROM attendance WHERE id = ?"
            )
            .get(existingRecord.id) as any;
          if (existing?.clock_in && existing?.clock_out) {
            const clockIn = new Date(existing.clock_in);
            const clockOut = new Date(existing.clock_out);
            const breakStart = data.break_start
              ? new Date(data.break_start)
              : existing.break_start
              ? new Date(existing.break_start)
              : null;
            const breakEnd = data.break_end
              ? new Date(data.break_end)
              : existing.break_end
              ? new Date(existing.break_end)
              : null;
            const totalHours = calculateTotalHours(
              clockIn,
              clockOut,
              breakStart,
              breakEnd
            );
            updateFields.push("total_hours = ?");
            updateValues.push(totalHours);
          }
        }

        // Always update updated_at
        updateFields.push("updated_at = datetime('now')");

        // Add WHERE clause parameters
        updateValues.push(data.user_id, dateStr);

        const updateQuery = `
          UPDATE attendance SET
            ${updateFields.join(", ")}
          WHERE user_id = ? AND date(clock_in) = ?
        `;

        db.prepare(updateQuery).run(...updateValues);
      } else {
        // Insert new record
        const clockOut = data.clock_out ? new Date(data.clock_out) : null;
        const breakStart = data.break_start ? new Date(data.break_start) : null;
        const breakEnd = data.break_end ? new Date(data.break_end) : null;

        // Calculate total_hours if both clock_in and clock_out are present
        let totalHours = 0;
        if (data.clock_in && data.clock_out) {
          const clockIn = new Date(data.clock_in);
          const clockOut = new Date(data.clock_out);
          let diffMs = clockOut.getTime() - clockIn.getTime();
          // Subtract break duration if break times are provided
          if (breakStart && breakEnd) {
            const breakMs = breakEnd.getTime() - breakStart.getTime();
            diffMs -= breakMs;
          }
          totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        }

        // Convert Date objects to ISO strings for storage
        const clockInStr = clockInTime.toISOString();
        const clockOutStr = clockOut ? clockOut.toISOString() : null;
        const breakStartStr = breakStart ? breakStart.toISOString() : null;
        const breakEndStr = breakEnd ? breakEnd.toISOString() : null;

        const insertQuery = `
          INSERT INTO attendance (
            user_id, clock_in, clock_out, break_start, break_end,
            total_hours, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        db.prepare(insertQuery).run(
          data.user_id,
          clockInStr,
          clockOutStr,
          breakStartStr,
          breakEndStr,
          totalHours,
          data.status || "Present",
          data.notes || null
        );
      }

      // Return the updated/created record
      const dateStr2 = clockInTime.toISOString().split("T")[0];
      return await this.getAttendanceByDate(data.user_id, dateStr2);
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to mark attendance: ${error.message}`, 500);
    }
  }

  /**
   * Get attendance record for a specific user and date
   */
  static async getAttendanceByDate(
    userId: string,
    date: string
  ): Promise<Attendance> {
    try {
      const query = `
        SELECT 
          a.*,
          u.full_name as employee_name,
          u.department
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ? AND date(a.clock_in) = ?
        ORDER BY a.clock_in DESC
        LIMIT 1
      `;

      const db = getDatabase();
      const attendance = db.prepare(query).get(userId, date) as any;

      if (!attendance) {
        throw new NotFoundError("Attendance record not found");
      }

      return this.formatAttendance(attendance);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get attendance: ${error.message}`, 500);
    }
  }

  /**
   * Get attendance records with filters and pagination
   */
  static async getAttendanceRecords(
    filters: AttendanceFilters
  ): Promise<{ records: Attendance[]; total: number }> {
    try {
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      // Build WHERE clause
      const userId = filters.user_id || filters.employee_id;
      if (userId) {
        whereConditions.push("a.user_id = ?");
        queryParams.push(userId);
      }

      if (filters.date_from) {
        whereConditions.push("date(a.clock_in) >= ?");
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push("date(a.clock_in) <= ?");
        queryParams.push(filters.date_to);
      }

      if (filters.status) {
        whereConditions.push("a.status = ?");
        queryParams.push(filters.status);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM attendance a
        ${whereClause}
      `;
      const db = getDatabase();
      const countResult = db.prepare(countQuery).get(...queryParams) as any;
      const total = countResult?.total || 0;

      // Get paginated records
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          a.*,
          u.full_name as employee_name,
          u.department
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.clock_in DESC
        LIMIT ? OFFSET ?
      `;

      const records = db
        .prepare(query)
        .all(...queryParams, limit, offset)
        .map((row: any) => this.formatAttendance(row));

      return { records, total };
    } catch (error: any) {
      console.error("Error getting attendance records:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Failed to get attendance records: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get employee attendance report (statistics)
   */
  static async getEmployeeAttendanceReport(
    employeeId: string,
    filters: { month?: string; year?: string } = {}
  ): Promise<{
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    total: number;
    attendancePercentage: number;
  }> {
    try {
      const whereConditions: string[] = ["a.user_id = ?"];
      const queryParams: any[] = [employeeId];

      if (filters.month && filters.year) {
        whereConditions.push("strftime('%m', a.clock_in) = ?");
        whereConditions.push("strftime('%Y', a.clock_in) = ?");
        queryParams.push(String(filters.month).padStart(2, "0"), filters.year);
      } else if (filters.year) {
        whereConditions.push("strftime('%Y', a.clock_in) = ?");
        queryParams.push(filters.year);
      }

      const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

      const query = `
        SELECT
          SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) as half_day,
          SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END) as leave,
          COUNT(*) as total
        FROM attendance a
        ${whereClause}
      `;

      const db = getDatabase();
      const report = (db.prepare(query).get(...queryParams) as any) || {};

      const present = report.present || 0;
      const total = report.total || 0;
      const attendancePercentage =
        total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        present,
        absent: report.absent || 0,
        late: report.late || 0,
        halfDay: report.half_day || 0,
        leave: report.leave || 0,
        total,
        attendancePercentage,
      };
    } catch (error: any) {
      console.error("Error getting employee attendance report:", error);
      throw new AppError(
        `Failed to get attendance report: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get company attendance summary for a specific date
   */
  static async getCompanyAttendanceSummary(date: string): Promise<{
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    attendancePercentage: number;
  }> {
    try {
      // Get total active employees (excluding customers)
      const employeeQuery = `
        SELECT COUNT(*) as total
        FROM users
        WHERE role != 'customer' AND status = 'active'
      `;
      const db = getDatabase();
      const employeeResult = db.prepare(employeeQuery).get() as any;
      const totalEmployees = employeeResult?.total || 0;

      // Get attendance summary for the date
      const query = `
        SELECT
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_day,
          SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as leave
        FROM attendance
        WHERE date(clock_in) = ?
      `;

      const summary = (db.prepare(query).get(date) as any) || {};

      const present = summary.present || 0;
      const attendancePercentage =
        totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

      return {
        totalEmployees,
        present,
        absent: summary.absent || 0,
        late: summary.late || 0,
        halfDay: summary.half_day || 0,
        leave: summary.leave || 0,
        attendancePercentage,
      };
    } catch (error: any) {
      console.error("Error getting company attendance summary:", error);
      throw new AppError(
        `Failed to get company attendance summary: ${error.message}`,
        500
      );
    }
  }

  /**
   * Format attendance record from database row
   */
  private static formatAttendance(row: any): Attendance {
    return {
      id: row.id ? row.id.toString() : "",
      user_id: row.user_id ? row.user_id.toString() : "",
      employee_name: row.employee_name || undefined,
      department: row.department || undefined,
      clock_in: row.clock_in ? new Date(row.clock_in).toISOString() : "",
      clock_out: row.clock_out
        ? new Date(row.clock_out).toISOString()
        : undefined,
      break_start: row.break_start
        ? new Date(row.break_start).toISOString()
        : undefined,
      break_end: row.break_end
        ? new Date(row.break_end).toISOString()
        : undefined,
      total_hours: row.total_hours || 0,
      status: row.status || "Present",
      notes: row.notes || undefined,
      created_at: row.created_at
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString(),
      updated_at: row.updated_at
        ? new Date(row.updated_at).toISOString()
        : new Date().toISOString(),
    };
  }
}
