import getDatabase from '../config/database';
import { ReservationModel, ReservationFilters } from '../models/reservationModel';
import { PaymentModel, PaymentFilters } from '../models/paymentModel';

type Filters = Record<string, any>;

// Helper to calculate date range from filter
function getDateRangeFromFilters(filters: Filters): { start?: string; end?: string } {
	if (filters.dateFrom && filters.dateTo) {
		return { start: filters.dateFrom, end: filters.dateTo };
	}
	if (filters.dateRange) {
		if (typeof filters.dateRange === 'object' && filters.dateRange.start && filters.dateRange.end) {
			return { start: filters.dateRange.start, end: filters.dateRange.end };
		}
		if (typeof filters.dateRange === 'string') {
			const now = new Date();
			let start: Date;
			switch (filters.dateRange) {
				case 'This Month':
					start = new Date(now.getFullYear(), now.getMonth(), 1);
					return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
				case 'Last Month':
					start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
					const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
					return { start: start.toISOString().split('T')[0], end: lastMonthEnd.toISOString().split('T')[0] };
				case 'This Quarter':
					const quarter = Math.floor(now.getMonth() / 3);
					start = new Date(now.getFullYear(), quarter * 3, 1);
					return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
				case 'This Year':
					start = new Date(now.getFullYear(), 0, 1);
					return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
			}
		}
	}
	return {};
}

export async function getReportRows(
	reportId: string,
	filters: Filters,
	userRole: string = 'admin',
	userId: string = ''
): Promise<Array<Record<string, any>>> {
	switch (reportId) {
		case "monthly-revenue":
			return buildMonthlyRevenueRows(filters, userRole, userId);
		case "client-analysis":
			return buildClientAnalysisRows(filters, userRole, userId);
		case "supplier-performance":
			return buildSupplierPerformanceRows(filters, userRole, userId);
		default:
			return [
				{ Metric: "Report", Value: reportId },
				{ Metric: "No data available", Value: "N/A" },
			];
	}
}

async function buildMonthlyRevenueRows(
	filters: Filters,
	userRole: string,
	userId: string
): Promise<Array<Record<string, any>>> {
	const db = getDatabase();
	const dateRange = getDateRangeFromFilters(filters);
	
	// Build query to group by month
	let whereClause = '';
	const params: any[] = [];
	
	if (dateRange.start) {
		whereClause += ' AND r.created_at >= ?';
		params.push(dateRange.start);
	}
	if (dateRange.end) {
		whereClause += ' AND r.created_at <= ?';
		params.push(dateRange.end);
	}
	
	// Apply category filter if provided
	if (filters.category && filters.category !== 'All Categories') {
		whereClause += ' AND r.service_type = ?';
		params.push(filters.category);
	}
	
	// Apply agent filter if provided
	if (filters.agent && filters.agent !== 'All Agents') {
		whereClause += ' AND r.created_by = ?';
		params.push(filters.agent);
	}
	
	// Apply source filter if provided (would need to join with leads table)
	// For now, we'll skip this as it requires more complex joins
	
	const query = `
		SELECT 
			strftime('%Y-%m', r.created_at) as month,
			COUNT(DISTINCT r.id) as bookings,
			COALESCE(SUM(r.total_amount), 0) as revenue,
			COALESCE(SUM(r.total_amount) * 0.25, 0) as profit
		FROM reservations r
		WHERE 1=1 ${whereClause}
		GROUP BY strftime('%Y-%m', r.created_at)
		ORDER BY month DESC
		LIMIT 12
	`;
	
	const results = db.prepare(query).all(...params) as any[];
	
	return results.map(row => ({
		Month: row.month,
		Revenue: parseFloat(row.revenue) || 0,
		Bookings: parseInt(row.bookings) || 0,
		Profit: parseFloat(row.profit) || 0
	}));
}

async function buildClientAnalysisRows(
	filters: Filters,
	userRole: string,
	userId: string
): Promise<Array<Record<string, any>>> {
	const db = getDatabase();
	const dateRange = getDateRangeFromFilters(filters);
	
	let whereClause = '';
	const params: any[] = [];
	
	if (dateRange.start) {
		whereClause += ' AND r.created_at >= ?';
		params.push(dateRange.start);
	}
	if (dateRange.end) {
		whereClause += ' AND r.created_at <= ?';
		params.push(dateRange.end);
	}
	
	const query = `
		SELECT 
			c.name as client,
			COUNT(DISTINCT r.id) as bookings,
			COALESCE(SUM(r.total_amount), 0) as revenue
		FROM reservations r
		LEFT JOIN customers c ON r.customer_id = c.id
		WHERE 1=1 ${whereClause}
		GROUP BY c.id, c.name
		ORDER BY revenue DESC
		LIMIT 50
	`;
	
	const results = db.prepare(query).all(...params) as any[];
	
	return results.map(row => ({
		Client: row.client || 'Unknown',
		Bookings: parseInt(row.bookings) || 0,
		Revenue: parseFloat(row.revenue) || 0
	}));
}

async function buildSupplierPerformanceRows(
	filters: Filters,
	userRole: string,
	userId: string
): Promise<Array<Record<string, any>>> {
	const db = getDatabase();
	const dateRange = getDateRangeFromFilters(filters);
	
	let whereClause = '';
	const params: any[] = [];
	
	if (dateRange.start) {
		whereClause += ' AND r.created_at >= ?';
		params.push(dateRange.start);
	}
	if (dateRange.end) {
		whereClause += ' AND r.created_at <= ?';
		params.push(dateRange.end);
	}
	
	const query = `
		SELECT 
			s.name as supplier,
			COUNT(DISTINCT r.id) as bookings,
			COUNT(CASE WHEN r.status = 'Completed' THEN 1 END) as completed,
			COUNT(CASE WHEN r.status = 'Cancelled' THEN 1 END) as cancelled
		FROM reservations r
		LEFT JOIN suppliers s ON r.supplier_id = s.id
		WHERE r.supplier_id IS NOT NULL ${whereClause}
		GROUP BY s.id, s.name
		ORDER BY bookings DESC
		LIMIT 50
	`;
	
	const results = db.prepare(query).all(...params) as any[];
	
	return results.map(row => {
		const total = parseInt(row.bookings) || 0;
		const completed = parseInt(row.completed) || 0;
		const onTimeRate = total > 0 ? ((completed / total) * 100).toFixed(0) : '0';
		
		return {
			Supplier: row.supplier || 'Unknown',
			Bookings: total,
			Completed: completed,
			Cancelled: parseInt(row.cancelled) || 0,
			OnTime: `${onTimeRate}%`,
			Issues: parseInt(row.cancelled) || 0
		};
	});
}


