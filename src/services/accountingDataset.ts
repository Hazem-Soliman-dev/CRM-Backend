import getDatabase from '../config/database';
import { ReservationModel, ReservationFilters } from '../models/reservationModel';
import { PaymentModel, PaymentFilters } from '../models/paymentModel';
import { InvoiceModel, InvoiceFilters } from '../models/invoiceModel';

export interface AccountingFilters {
	dateRange?: string | { start: string; end: string };
	reportType?: string;
	status?: string;
	agent?: string;
	supplier?: string;
	dateFrom?: string;
	dateTo?: string;
	includeFields?: {
		basicInfo?: boolean;
		paymentDetails?: boolean;
		supplierInfo?: boolean;
		profitAnalysis?: boolean;
		invoiceHistory?: boolean;
	};
}

export interface AccountingRow {
	[key: string]: any;
}

// Helper to calculate date range from filter
function getDateRange(filters: AccountingFilters): { start?: string; end?: string } {
	if (typeof filters.dateRange === 'object' && filters.dateRange.start && filters.dateRange.end) {
		return { start: filters.dateRange.start, end: filters.dateRange.end };
	}
	if (filters.dateFrom && filters.dateTo) {
		return { start: filters.dateFrom, end: filters.dateTo };
	}
	if (typeof filters.dateRange === 'string') {
		const now = new Date();
		let start: Date;
		switch (filters.dateRange) {
			case 'today':
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
			case 'week':
				start = new Date(now);
				start.setDate(now.getDate() - 7);
				return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
			case 'month':
				start = new Date(now.getFullYear(), now.getMonth(), 1);
				return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
			case 'quarter':
				const quarter = Math.floor(now.getMonth() / 3);
				start = new Date(now.getFullYear(), quarter * 3, 1);
				return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
			case 'year':
				start = new Date(now.getFullYear(), 0, 1);
				return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
		}
	}
	return {};
}

// Get accounting rows for export
export async function getAccountingRows(
	filters: AccountingFilters,
	userRole: string = 'admin',
	userId: string = ''
): Promise<AccountingRow[]> {
	getDatabase(); // Initialize DB connection
	const dateRange = getDateRange(filters);
	
	// Build reservation filters
	const reservationFilters: ReservationFilters = {
		status: filters.status === 'All Status' ? undefined : filters.status,
		date_from: dateRange.start,
		date_to: dateRange.end,
		created_by: filters.agent === 'All Agents' ? undefined : filters.agent,
		supplier_id: filters.supplier === 'All Suppliers' ? undefined : filters.supplier,
		limit: 10000, // Get all for export
	};

	// Get reservations
	const { reservations } = await ReservationModel.getAllReservations(
		reservationFilters,
		userRole,
		userId
	);

	// Get payments for these reservations
	const bookingIds = reservations.map(r => r.id);
	const paymentFilters: PaymentFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { payments } = bookingIds.length > 0 
		? await PaymentModel.getAllPayments(paymentFilters, userRole, userId)
		: { payments: [] };

	// Get invoices
	const invoiceFilters: InvoiceFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { invoices } = await InvoiceModel.getAllInvoices(invoiceFilters, userRole, userId);

	// Combine data
	const rows: AccountingRow[] = reservations.map(reservation => {
		const reservationPayments = payments.filter(p => p.booking_id === reservation.id);
		const reservationInvoices = invoices.filter(i => i.booking_id === reservation.id);
		
		const totalPaid = reservationPayments
			.filter(p => p.payment_status === 'Completed')
			.reduce((sum, p) => sum + p.amount, 0);
		
		const outstandingBalance = reservation.total_amount - totalPaid;
		const supplierCost = 0; // TODO: Get from supplier_cost field if exists
		const profit = reservation.total_amount - supplierCost;
		const profitMargin = reservation.total_amount > 0 ? (profit / reservation.total_amount) * 100 : 0;

		const row: AccountingRow = {};

		// Basic Info
		if (!filters.includeFields || filters.includeFields.basicInfo !== false) {
			row['Booking ID'] = reservation.reservation_id;
			row['Customer'] = reservation.customer?.name || 'N/A';
			row['Service Type'] = reservation.service_type;
			row['Destination'] = reservation.destination;
			row['Departure Date'] = reservation.departure_date;
			row['Return Date'] = reservation.return_date || 'N/A';
			row['Status'] = reservation.status;
		}

		// Payment Details
		if (!filters.includeFields || filters.includeFields.paymentDetails !== false) {
			row['Total Amount'] = reservation.total_amount;
			row['Paid Amount'] = totalPaid;
			row['Outstanding Balance'] = outstandingBalance;
			row['Payment Status'] = reservation.payment_status;
			row['Payment Count'] = reservationPayments.length;
		}

		// Supplier Info
		if (!filters.includeFields || filters.includeFields.supplierInfo !== false) {
			row['Supplier'] = reservation.supplier?.name || 'N/A';
			row['Supplier Cost'] = supplierCost;
		}

		// Profit Analysis
		if (!filters.includeFields || filters.includeFields.profitAnalysis !== false) {
			row['Profit'] = profit;
			row['Profit Margin %'] = profitMargin.toFixed(2);
		}

		// Invoice History
		if (filters.includeFields?.invoiceHistory) {
			row['Invoice Count'] = reservationInvoices.length;
			row['Invoice Status'] = reservationInvoices.map(i => i.status).join(', ') || 'N/A';
		}

		row['Created At'] = reservation.created_at;
		row['Created By'] = reservation.created_by_user?.full_name || 'N/A';

		return row;
	});

	return rows;
}

// Get financial report data for different report types
export async function getFinancialReportData(
	filters: AccountingFilters,
	reportType: string,
	userRole: string = 'admin',
	userId: string = ''
): Promise<AccountingRow[]> {
	const dateRange = getDateRange(filters);

	switch (reportType) {
		case 'overview':
			return getOverviewReport(filters, dateRange, userRole, userId);
		case 'profit':
			return getProfitAnalysisReport(filters, dateRange, userRole, userId);
		case 'agent':
		case 'agent-performance':
			return getAgentPerformanceReport(filters, dateRange, userRole, userId);
		case 'outstanding':
		case 'outstanding-balances':
			return getOutstandingBalancesReport(filters, dateRange, userRole, userId);
		default:
			return getAccountingRows(filters, userRole, userId);
	}
}

async function getOverviewReport(
	_filters: AccountingFilters,
	dateRange: { start?: string; end?: string },
	userRole: string,
	userId: string
): Promise<AccountingRow[]> {
	const reservationFilters: ReservationFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { reservations } = await ReservationModel.getAllReservations(
		reservationFilters,
		userRole,
		userId
	);

	const { payments } = await PaymentModel.getAllPayments(
		{ date_from: dateRange.start, date_to: dateRange.end, limit: 10000 },
		userRole,
		userId
	);

	const totalRevenue = reservations.reduce((sum, r) => sum + r.total_amount, 0);
	const totalPaid = payments
		.filter(p => p.payment_status === 'Completed')
		.reduce((sum, p) => sum + p.amount, 0);
	const totalOutstanding = totalRevenue - totalPaid;

	return [
		{
			'Metric': 'Total Revenue',
			'Value': totalRevenue,
			'Period': dateRange.start && dateRange.end 
				? `${dateRange.start} to ${dateRange.end}` 
				: 'All Time'
		},
		{
			'Metric': 'Total Paid',
			'Value': totalPaid,
			'Period': dateRange.start && dateRange.end 
				? `${dateRange.start} to ${dateRange.end}` 
				: 'All Time'
		},
		{
			'Metric': 'Outstanding Balance',
			'Value': totalOutstanding,
			'Period': dateRange.start && dateRange.end 
				? `${dateRange.start} to ${dateRange.end}` 
				: 'All Time'
		},
		{
			'Metric': 'Total Bookings',
			'Value': reservations.length,
			'Period': dateRange.start && dateRange.end 
				? `${dateRange.start} to ${dateRange.end}` 
				: 'All Time'
		}
	];
}

async function getProfitAnalysisReport(
	_filters: AccountingFilters,
	dateRange: { start?: string; end?: string },
	userRole: string,
	userId: string
): Promise<AccountingRow[]> {
	const reservationFilters: ReservationFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { reservations } = await ReservationModel.getAllReservations(
		reservationFilters,
		userRole,
		userId
	);

	// Group by service type
	const byServiceType: Record<string, { revenue: number; count: number }> = {};
	reservations.forEach(r => {
		if (!byServiceType[r.service_type]) {
			byServiceType[r.service_type] = { revenue: 0, count: 0 };
		}
		byServiceType[r.service_type].revenue += r.total_amount;
		byServiceType[r.service_type].count += 1;
	});

	return Object.entries(byServiceType).map(([serviceType, data]) => ({
		'Service Type': serviceType,
		'Revenue': data.revenue,
		'Bookings': data.count,
		'Average Booking Value': data.count > 0 ? (data.revenue / data.count).toFixed(2) : 0
	}));
}

async function getAgentPerformanceReport(
	_filters: AccountingFilters,
	dateRange: { start?: string; end?: string },
	userRole: string,
	userId: string
): Promise<AccountingRow[]> {
	getDatabase(); // Initialize DB connection
	const reservationFilters: ReservationFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { reservations } = await ReservationModel.getAllReservations(
		reservationFilters,
		userRole,
		userId
	);

	// Group by agent
	const byAgent: Record<string, { bookings: number; revenue: number }> = {};
	reservations.forEach(r => {
		const agentId = r.created_by;
		// const agentName = r.created_by_user?.full_name || 'Unknown';
		if (!byAgent[agentId]) {
			byAgent[agentId] = { bookings: 0, revenue: 0 };
		}
		byAgent[agentId].bookings += 1;
		byAgent[agentId].revenue += r.total_amount;
	});

	return Object.entries(byAgent).map(([agentId, data]) => {
		const agent = reservations.find(r => r.created_by === agentId)?.created_by_user;
		return {
			'Agent': agent?.full_name || 'Unknown',
			'Bookings': data.bookings,
			'Revenue': data.revenue,
			'Average Booking Value': data.bookings > 0 ? (data.revenue / data.bookings).toFixed(2) : 0
		};
	});
}

async function getOutstandingBalancesReport(
	_filters: AccountingFilters,
	dateRange: { start?: string; end?: string },
	userRole: string,
	userId: string
): Promise<AccountingRow[]> {
	const reservationFilters: ReservationFilters = {
		date_from: dateRange.start,
		date_to: dateRange.end,
		limit: 10000,
	};
	const { reservations } = await ReservationModel.getAllReservations(
		reservationFilters,
		userRole,
		userId
	);

	const { payments } = await PaymentModel.getAllPayments(
		{ date_from: dateRange.start, date_to: dateRange.end, limit: 10000 },
		userRole,
		userId
	);

	const { invoices } = await InvoiceModel.getAllInvoices(
		{ date_from: dateRange.start, date_to: dateRange.end, limit: 10000 },
		userRole,
		userId
	);

	return reservations
		.map(reservation => {
			const reservationPayments = payments.filter(p => p.booking_id === reservation.id);
			const reservationInvoice = invoices.find(i => i.booking_id === reservation.id);
			
			const totalPaid = reservationPayments
				.filter(p => p.payment_status === 'Completed')
				.reduce((sum, p) => sum + p.amount, 0);
			
			const outstandingBalance = reservation.total_amount - totalPaid;
			
			if (outstandingBalance <= 0) return null;

			const dueDate = reservationInvoice?.due_date || reservation.created_at;
			const daysOverdue = Math.max(0, Math.floor(
				(new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
			));

			return {
				'Customer': reservation.customer?.name || 'N/A',
				'Booking ID': reservation.reservation_id,
				'Outstanding Balance': outstandingBalance,
				'Total Amount': reservation.total_amount,
				'Paid Amount': totalPaid,
				'Due Date': dueDate,
				'Days Overdue': daysOverdue > 0 ? daysOverdue : 0,
				'Status': daysOverdue > 0 ? 'Overdue' : 'Pending'
			};
		})
		.filter(row => row !== null) as AccountingRow[];
}

