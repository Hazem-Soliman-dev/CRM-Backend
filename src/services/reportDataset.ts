type Filters = Record<string, any>;

// Stub implementation mapping report ids to datasets.
// Replace with real queries using your models as needed.
export async function getReportRows(reportId: string, filters: Filters): Promise<Array<Record<string, any>>> {
	// Example branching by report id
	switch (reportId) {
		case "monthly-revenue":
			return buildMonthlyRevenueRows(filters);
		case "client-analysis":
			return buildClientAnalysisRows(filters);
		case "supplier-performance":
			return buildSupplierPerformanceRows(filters);
		default:
			// Generic example dataset
			return [
				{ Metric: "Example", Value: 1 },
				{ Metric: "Example 2", Value: 2 },
			];
	}
}

async function buildMonthlyRevenueRows(filters: Filters) {
	// TODO: Use filters.dateFrom/dateTo to query finance/reservations
	return [
		{ Month: "Aug", Revenue: 245000, Bookings: 156, Profit: 61250 },
		{ Month: "Sep", Revenue: 268000, Bookings: 172, Profit: 67000 },
	];
}

async function buildClientAnalysisRows(_filters: Filters) {
	return [
		{ Client: "ACME Corp", Bookings: 24, Revenue: 54000 },
		{ Client: "Globex", Bookings: 18, Revenue: 41000 },
	];
}

async function buildSupplierPerformanceRows(_filters: Filters) {
	return [
		{ Supplier: "Steigenberger Luxor Hotel", OnTime: "98%", Issues: 1 },
		{ Supplier: "Nile Cruise", OnTime: "96%", Issues: 2 },
	];
}


