import { Request, Response } from "express";
import { successResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import getDatabase from "../config/database";

// Get dashboard statistics
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const role = req.user?.role?.toLowerCase() || "";
      const userId = req.user?.userId;

      // Helper to apply role/user filters
      const isAdmin = role === "admin";
      // For admin, return global, unfiltered stats (preserve previous behavior)
      if (isAdmin) {
        const usersResult = db
          .prepare(
            "SELECT COUNT(*) as total FROM users WHERE role != 'customer'"
          )
          .get() as any;
        const customersResult = db
          .prepare("SELECT COUNT(*) as total FROM customers")
          .get() as any;
        const leadsResult = db
          .prepare("SELECT COUNT(*) as total FROM leads")
          .get() as any;
        const reservationsResult = db
          .prepare("SELECT COUNT(*) as total FROM reservations")
          .get() as any;
        const paymentsResult = db
          .prepare("SELECT COUNT(*) as total FROM payments")
          .get() as any;
        const ticketsResult = db
          .prepare("SELECT COUNT(*) as total FROM support_tickets")
          .get() as any;
        const revenueResult = db
          .prepare(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'Completed'"
          )
          .get() as any;
        const todayLeadsResult = db
          .prepare(
            `
          SELECT COUNT(*) as total 
          FROM leads 
          WHERE date(created_at) = date('now')
        `
          )
          .get() as any;
        const recentLeads = db
          .prepare(
            `
          SELECT l.*, u.full_name as agent_name 
          FROM leads l 
          LEFT JOIN users u ON l.agent_id = u.id 
          ORDER BY l.created_at DESC 
          LIMIT 5
        `
          )
          .all() as any[];
        const recentReservations = db
          .prepare(
            `
          SELECT r.*, c.name as customer_name 
          FROM reservations r 
          LEFT JOIN customers c ON r.customer_id = c.id 
          ORDER BY r.created_at DESC 
          LIMIT 5
        `
          )
          .all() as any[];
        successResponse(res, {
          overview: {
            totalUsers: usersResult.total,
            totalCustomers: customersResult.total,
            totalLeads: leadsResult.total,
            totalReservations: reservationsResult.total,
            totalPayments: paymentsResult.total,
            totalTickets: ticketsResult.total,
            totalRevenue: revenueResult.total,
            newLeadsToday: todayLeadsResult.total,
          },
          recentActivity: {
            recentLeads,
            recentReservations,
          },
        });
        return;
      }
      const whereByRole = (table: string): string => {
        if (isAdmin) return "";
        switch (role) {
          case "sales":
            if (table === "leads") return " WHERE agent_id = ?";
            if (table === "customers") return " WHERE assigned_staff_id = ?";
            if (table === "reservations") return " WHERE created_by = ?";
            if (table === "payments") return " WHERE created_by = ?";
            return "";
          case "reservation":
            if (table === "reservations") return " WHERE created_by = ?";
            return "";
          case "finance":
            // Finance sees global finance data
            return "";
          case "operations":
            // counts for operations rely more on tasks; keep global for entities
            return "";
          case "customer":
            // best effort: reservations created_by as proxy for customer's own actions
            if (table === "reservations") return " WHERE created_by = ?";
            if (table === "payments") return " WHERE created_by = ?";
            return "";
          default:
            return "";
        }
      };

      // Get basic counts with role scoping
      const usersResult = db
        .prepare("SELECT COUNT(*) as total FROM users WHERE role != 'customer'")
        .get() as any;
      const customersResult = db
        .prepare(
          "SELECT COUNT(*) as total FROM customers" + whereByRole("customers")
        )
        .get(!isAdmin && whereByRole("customers") ? userId : undefined) as any;
      const leadsResult = db
        .prepare("SELECT COUNT(*) as total FROM leads" + whereByRole("leads"))
        .get(!isAdmin && whereByRole("leads") ? userId : undefined) as any;
      const reservationsResult = db
        .prepare(
          "SELECT COUNT(*) as total FROM reservations" +
            whereByRole("reservations")
        )
        .get(
          !isAdmin && whereByRole("reservations") ? userId : undefined
        ) as any;
      const paymentsResult = db
        .prepare(
          "SELECT COUNT(*) as total FROM payments" + whereByRole("payments")
        )
        .get(!isAdmin && whereByRole("payments") ? userId : undefined) as any;
      const ticketsResult = db
        .prepare("SELECT COUNT(*) as total FROM support_tickets")
        .get() as any;

      // Get revenue data
      const revenueResult = db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'Completed'" +
            (isAdmin || role !== "sales" ? "" : " AND created_by = ?")
        )
        .get(!isAdmin && role === "sales" ? userId : undefined) as any;

      // Get today's leads count
      const todayLeadsResult = db
        .prepare(
          `
      SELECT COUNT(*) as total 
      FROM leads 
      WHERE date(created_at) = date('now') ${
        !isAdmin && role === "sales" ? " AND agent_id = ?" : ""
      }
    `
        )
        .get(!isAdmin && role === "sales" ? userId : undefined) as any;

      // Get recent activity
      const recentLeads = db
        .prepare(
          `
      SELECT l.*, u.full_name as agent_name 
      FROM leads l 
      LEFT JOIN users u ON l.agent_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 5
    `
        )
        .all() as any[];

      const recentReservations = db
        .prepare(
          `
      SELECT r.*, c.name as customer_name 
      FROM reservations r 
      LEFT JOIN customers c ON r.customer_id = c.id 
      ORDER BY r.created_at DESC 
      LIMIT 5
    `
        )
        .all() as any[];

      const stats = {
        overview: {
          totalUsers: usersResult.total,
          totalCustomers: customersResult.total,
          totalLeads: leadsResult.total,
          totalReservations: reservationsResult.total,
          totalPayments: paymentsResult.total,
          totalTickets: ticketsResult.total,
          totalRevenue: revenueResult.total,
          newLeadsToday: todayLeadsResult.total,
        },
        recentActivity: {
          recentLeads: recentLeads,
          recentReservations: recentReservations,
        },
      };

      successResponse(res, stats);
    } catch (error: any) {
      console.error("Error getting dashboard stats:", error);
      throw new Error(`Failed to get dashboard statistics: ${error.message}`);
    }
  }
);

// Today Tasks - role/user scoped
export const getTodayTasks = asyncHandler(
  async (req: Request, res: Response) => {
    const db = getDatabase();
    const role = req.user?.role?.toLowerCase() || "";
    const userId = req.user?.userId;

    // Today boundaries
    const todayISO = new Date().toISOString().split("T")[0];

    const tasks: any[] = [];

    const pushRows = (
      rows: any[],
      type: string,
      titleFn: (r: any) => string,
      dueField: string
    ) => {
      for (const r of rows) {
        tasks.push({
          id: `${type}-${r.id}`,
          type,
          title: titleFn(r),
          due: r[dueField] || todayISO,
        });
      }
    };

    // Sales
    if (role === "admin" || role === "sales") {
      // Important: don't pass undefined params when query has no placeholders.
      // Call .all() with no args if there is no ? in the SQL.
      const leadsStmt = db.prepare(
        `
        SELECT id, lead_id as code, name, next_followup 
        FROM leads 
        WHERE date(next_followup) = date('now') ${
          role === "sales" ? "AND agent_id = ?" : ""
        }
      `
      );

      const leadsDue = (
        role === "sales" ? leadsStmt.all(userId) : leadsStmt.all()
      ) as any[];
      pushRows(
        leadsDue,
        "lead_followup",
        (r) => `Follow up: ${r.name || r.code}`,
        "next_followup"
      );
    }

    // Reservation
    if (role === "admin" || role === "reservation") {
      const bookingsStmt = db.prepare(
        `
        SELECT id, reservation_id as code, destination, departure_date 
        FROM reservations 
        WHERE date(departure_date) = date('now') ${
          role === "reservation" ? "AND created_by = ?" : ""
        }
      `
      );

      const bookingsToday = (
        role === "reservation" ? bookingsStmt.all(userId) : bookingsStmt.all()
      ) as any[];
      pushRows(
        bookingsToday,
        "reservation_departure",
        (r) => `Departure: ${r.code} → ${r.destination}`,
        "departure_date"
      );
    }

    // Finance
    if (role === "admin" || role === "finance") {
      const paymentsDue = db
        .prepare(
          `
        SELECT id, payment_id as code, amount, due_date 
        FROM payments 
        WHERE date(due_date) = date('now') AND payment_status IN ('Pending','Partially Refunded')
      `
        )
        .all() as any[];
      pushRows(
        paymentsDue,
        "payment_due",
        (r) => `Payment due: ${r.code} ($${r.amount})`,
        "due_date"
      );
    }

    // Operations
    if (role === "admin" || role === "operations") {
      const opsStmt = db.prepare(
        `
        SELECT id, task_id as code, title, scheduled_at 
        FROM operations_tasks 
        WHERE date(scheduled_at) = date('now') ${
          role === "operations" ? "AND assigned_to = ?" : ""
        }
      `
      );

      const opsTasks = (
        role === "operations" ? opsStmt.all(userId) : opsStmt.all()
      ) as any[];
      pushRows(
        opsTasks,
        "operations_task",
        (r) => `Task: ${r.title}`,
        "scheduled_at"
      );
    }

    // Customer - show their reservations today (best-effort: created_by)
    if (role === "customer") {
      const myTrips = db
        .prepare(
          `
        SELECT id, reservation_id as code, destination, departure_date 
        FROM reservations 
        WHERE date(departure_date) = date('now') AND created_by = ?
      `
        )
        .all(userId) as any[];
      pushRows(
        myTrips,
        "my_trip",
        (r) => `Your trip: ${r.destination}`,
        "departure_date"
      );
    }

    // Checklist suggestions by role
    const checklistMap: Record<string, any[]> = {
      sales: [
        { id: "daily-sync", label: "Daily pipeline review" },
        { id: "follow-ups", label: "Call top 5 leads" },
      ],
      reservation: [
        {
          id: "confirm-suppliers",
          label: "Confirm suppliers for today's trips",
        },
      ],
      finance: [{ id: "reconcile", label: "Reconcile yesterday payments" }],
      operations: [{ id: "brief-team", label: "Brief field team for trips" }],
      customer: [{ id: "check-itinerary", label: "Review your itinerary" }],
      admin: [{ id: "review-metrics", label: "Review global KPIs" }],
    };

    successResponse(res, {
      tasks,
      checklist: checklistMap[role] || [],
    });
  }
);
// Get revenue trend - format for chart
export const getRevenueTrend = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { period = "30" } = req.query;
      const days = parseInt(period as string) || 30;

      // Get revenue by day for the last N days
      const query = `
      SELECT 
        date(payment_date) as date,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments 
      WHERE payment_status = 'Completed' 
        AND payment_date >= date('now', '-' || ? || ' days')
      GROUP BY date(payment_date)
      ORDER BY date ASC
    `;

      const db = getDatabase();
      const rawData = db.prepare(query).all(days) as any[];

      // Format data for chart - group by month if period is long, otherwise by day
      let chartData: any[] = [];

      if (days > 90) {
        // Group by month
        const monthlyData: Record<string, number> = {};
        rawData.forEach((row: any) => {
          const date = new Date(row.date);
          const monthKey = date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          monthlyData[monthKey] =
            (monthlyData[monthKey] || 0) + parseFloat(row.revenue);
        });

        chartData = Object.entries(monthlyData).map(([month, revenue]) => ({
          month,
          revenue: Math.round(revenue * 100) / 100,
        }));
      } else if (days > 30) {
        // Group by week
        const weeklyData: Record<string, number> = {};
        rawData.forEach((row: any) => {
          const date = new Date(row.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week
          const weekKey = weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          weeklyData[weekKey] =
            (weeklyData[weekKey] || 0) + parseFloat(row.revenue);
        });

        chartData = Object.entries(weeklyData).map(([month, revenue]) => ({
          month,
          revenue: Math.round(revenue * 100) / 100,
        }));
      } else {
        // Daily data - format as month/day
        chartData = rawData.map((row: any) => {
          const date = new Date(row.date);
          return {
            month: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
          };
        });
      }

      // If no data, return sample data for demonstration
      if (chartData.length === 0) {
        // Generate sample data for the last 7 days
        const sampleData = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          sampleData.push({
            month: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            revenue: 0,
          });
        }
        chartData = sampleData;
      }

      successResponse(res, chartData);
    } catch (error: any) {
      console.error("Error getting revenue trend:", error);
      throw new Error(`Failed to get revenue trend: ${error.message}`);
    }
  }
);

// Get lead sources - format for chart
export const getLeadSources = asyncHandler(
  async (_req: Request, res: Response) => {
    try {
      const query = `
      SELECT 
        source,
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value
      FROM leads 
      GROUP BY source
      ORDER BY count DESC
    `;

      const db = getDatabase();
      const rawData = db.prepare(query).all() as any[];

      // Calculate total for percentage
      const total = rawData.reduce((sum, row) => sum + row.count, 0);

      // Color mapping for sources
      const colorMap: Record<string, string> = {
        Website: "#3B82F6",
        "Social Media": "#10B981",
        Email: "#F59E0B",
        "Walk-in": "#EF4444",
        Referral: "#8B5CF6",
        Other: "#6B7280",
      };

      // Format data for chart with percentages
      let chartData = rawData.map((row: any) => ({
        source: row.source,
        value: total > 0 ? Math.round((row.count / total) * 100) : 0,
        count: row.count,
        total_value: parseFloat(row.total_value),
        color: colorMap[row.source] || "#6B7280",
      }));

      // If no data, return sample data for demonstration
      if (chartData.length === 0) {
        chartData = [
          {
            source: "Website",
            value: 0,
            count: 0,
            total_value: 0,
            color: "#3B82F6",
          },
          {
            source: "Social Media",
            value: 0,
            count: 0,
            total_value: 0,
            color: "#10B981",
          },
          {
            source: "Email",
            value: 0,
            count: 0,
            total_value: 0,
            color: "#F59E0B",
          },
          {
            source: "Walk-in",
            value: 0,
            count: 0,
            total_value: 0,
            color: "#EF4444",
          },
        ];
      }

      successResponse(res, chartData);
    } catch (error: any) {
      console.error("Error getting lead sources:", error);
      throw new Error(`Failed to get lead sources: ${error.message}`);
    }
  }
);

// Get recent activity - format for frontend
export const getRecentActivity = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { limit = "10" } = req.query;
      const limitNum = parseInt(limit as string) || 10;

      // Get recent activities from activities table if it exists, otherwise combine leads and reservations
      let activities: any[] = [];

      try {
        // Try to get from activities table first
        const db = getDatabase();
        const activityRows = db
          .prepare(
            `
        SELECT 
          a.*,
          u.full_name as user_name
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
      `
          )
          .all(limitNum) as any[];

        activities = activityRows.map((row: any) => ({
          id: row.id,
          type: row.entity_type,
          description: row.description,
          user: {
            full_name: row.user_name || "System",
          },
          created_at: row.created_at,
        }));
      } catch (error) {
        // Fallback to combining leads and reservations
        const db = getDatabase();
        const recentLeads = db
          .prepare(
            `
        SELECT 
          'lead' as type,
          l.id,
          ('New lead: ' || l.name) as description,
          l.created_at,
          u.full_name as created_by
        FROM leads l
        LEFT JOIN users u ON l.agent_id = u.id
        ORDER BY l.created_at DESC
        LIMIT ?
      `
          )
          .all(Math.ceil(limitNum / 2)) as any[];

        const recentReservations = db
          .prepare(
            `
        SELECT 
          'reservation' as type,
          r.id,
          ('New reservation: ' || r.destination) as description,
          r.created_at,
          c.name as customer_name
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        ORDER BY r.created_at DESC
        LIMIT ?
      `
          )
          .all(Math.ceil(limitNum / 2)) as any[];

        // Combine and format
        activities = [
          ...recentLeads.map((row: any) => ({
            id: row.id,
            type: row.type,
            description: row.description,
            user: {
              full_name: row.created_by || "System",
            },
            created_at: row.created_at,
          })),
          ...recentReservations.map((row: any) => ({
            id: row.id,
            type: row.type,
            description: row.description,
            user: {
              full_name: row.customer_name || "System",
            },
            created_at: row.created_at,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, limitNum);
      }

      successResponse(res, activities);
    } catch (error: any) {
      console.error("Error getting recent activity:", error);
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
  }
);

// Get performance metrics
export const getPerformanceMetrics = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { userId, role: userRole } = req.user!;

      let metrics: any = {};

      const db = getDatabase();

      if (userRole === "agent") {
        // Agent-specific metrics
        const leadsCount = db
          .prepare("SELECT COUNT(*) as count FROM leads WHERE agent_id = ?")
          .get(userId) as any;

        const leadsValue = db
          .prepare(
            "SELECT COALESCE(SUM(value), 0) as total FROM leads WHERE agent_id = ?"
          )
          .get(userId) as any;

        const conversionRate = db
          .prepare(
            `
        SELECT 
          (COUNT(CASE WHEN status = 'Closed Won' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as rate
        FROM leads 
        WHERE agent_id = ?
      `
          )
          .get(userId) as any;

        metrics = {
          totalLeads: leadsCount.count,
          totalValue: leadsValue.total,
          conversionRate: conversionRate.rate || 0,
        };
      } else if (userRole === "manager" || userRole === "admin") {
        // Manager/Admin metrics
        const teamPerformance = db
          .prepare(
            `
        SELECT 
          u.full_name,
          COUNT(l.id) as leads_count,
          COALESCE(SUM(l.value), 0) as total_value,
          (COUNT(CASE WHEN l.status = 'Closed Won' THEN 1 END) * 100.0 / NULLIF(COUNT(l.id), 0)) as conversion_rate
        FROM users u
        LEFT JOIN leads l ON u.id = l.agent_id
        WHERE u.role = 'sales'
        GROUP BY u.id, u.full_name
        ORDER BY total_value DESC
      `
          )
          .all() as any[];

        metrics = {
          teamPerformance: teamPerformance,
        };
      }

      successResponse(res, metrics);
    } catch (error: any) {
      console.error("Error getting performance metrics:", error);
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }
);
