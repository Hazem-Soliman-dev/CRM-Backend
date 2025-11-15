import { Request, Response } from "express";
import { successResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import getDatabase from "../config/database";

// Get dashboard statistics
export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response) => {
    try {
      const db = getDatabase();
      
      // Get basic counts
      const usersResult = db.prepare("SELECT COUNT(*) as total FROM users WHERE role != 'customer'").get() as any;
      const customersResult = db.prepare("SELECT COUNT(*) as total FROM customers").get() as any;
      const leadsResult = db.prepare("SELECT COUNT(*) as total FROM leads").get() as any;
      const reservationsResult = db.prepare("SELECT COUNT(*) as total FROM reservations").get() as any;
      const paymentsResult = db.prepare("SELECT COUNT(*) as total FROM payments").get() as any;
      const ticketsResult = db.prepare("SELECT COUNT(*) as total FROM support_tickets").get() as any;

      // Get revenue data
      const revenueResult = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'Completed'").get() as any;

      // Get today's leads count
      const todayLeadsResult = db.prepare(`
      SELECT COUNT(*) as total 
      FROM leads 
      WHERE date(created_at) = date('now')
    `).get() as any;

      // Get recent activity
      const recentLeads = db.prepare(`
      SELECT l.*, u.full_name as agent_name 
      FROM leads l 
      LEFT JOIN users u ON l.agent_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 5
    `).all() as any[];

      const recentReservations = db.prepare(`
      SELECT r.*, c.name as customer_name 
      FROM reservations r 
      LEFT JOIN customers c ON r.customer_id = c.id 
      ORDER BY r.created_at DESC 
      LIMIT 5
    `).all() as any[];

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
        const activityRows = db.prepare(`
        SELECT 
          a.*,
          u.full_name as user_name
        FROM activities a
        LEFT JOIN users u ON a.performed_by_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
      `).all(limitNum) as any[];

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
        const recentLeads = db.prepare(`
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
      `).all(Math.ceil(limitNum / 2)) as any[];

        const recentReservations = db.prepare(`
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
      `).all(Math.ceil(limitNum / 2)) as any[];

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
        const leadsCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE agent_id = ?").get(userId) as any;

        const leadsValue = db.prepare("SELECT COALESCE(SUM(value), 0) as total FROM leads WHERE agent_id = ?").get(userId) as any;

        const conversionRate = db.prepare(`
        SELECT 
          (COUNT(CASE WHEN status = 'Closed Won' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as rate
        FROM leads 
        WHERE agent_id = ?
      `).get(userId) as any;

        metrics = {
          totalLeads: leadsCount.count,
          totalValue: leadsValue.total,
          conversionRate: conversionRate.rate || 0,
        };
      } else if (userRole === "manager" || userRole === "admin") {
        // Manager/Admin metrics
        const teamPerformance = db.prepare(`
        SELECT 
          u.full_name,
          COUNT(l.id) as leads_count,
          COALESCE(SUM(l.value), 0) as total_value,
          (COUNT(CASE WHEN l.status = 'Closed Won' THEN 1 END) * 100.0 / NULLIF(COUNT(l.id), 0)) as conversion_rate
        FROM users u
        LEFT JOIN leads l ON u.id = l.agent_id
        WHERE u.role = 'agent'
        GROUP BY u.id, u.full_name
        ORDER BY total_value DESC
      `).all() as any[];

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
