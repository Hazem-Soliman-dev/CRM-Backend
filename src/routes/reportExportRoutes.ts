import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { generatePdfBuffer } from "../services/pdf";
import { getReportRows } from "../services/reportDataset";
import { buildExcelBufferFromJson } from "../services/excel";
import { buildCsvBufferFromJson } from "../services/csv";

const router = Router();

// GET /api/v1/reports/:id/export/pdf
router.get("/:id/export/pdf", authenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const filters = req.query as any;
		// const options = {
		// 	includeCharts: req.query.includeCharts !== 'false',
		// 	includeDetails: req.query.includeDetails !== 'false',
		// 	scope: req.query.scope || 'current'
		// };

		// Get report data
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';
		const rows = await getReportRows(id, filters || {}, userRole, userId);

		// Generate HTML table for PDF
		const html = generateHtmlTable(rows, id);
		const pdfBuffer = await generatePdfBuffer({ html, type: "report" });
		
		// Ensure we have a proper Buffer
		let pdf: Buffer;
		if (Buffer.isBuffer(pdfBuffer)) {
			pdf = pdfBuffer;
		} else if (pdfBuffer instanceof Uint8Array) {
			pdf = Buffer.from(pdfBuffer);
		} else {
			pdf = Buffer.from(pdfBuffer as any);
		}
		
		if (!pdf || pdf.length === 0) {
			throw new Error("Generated PDF buffer is empty");
		}
		
		const filename = `report-${id}-${new Date().toISOString().slice(0, 10)}.pdf`;
		
		// Set headers and send binary PDF data
		res.writeHead(200, {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": pdf.length.toString()
		});
		return res.end(pdf);
	} catch (err: any) {
		console.error("Report PDF export failed:", err);
		return res.status(500).json({ 
			success: false, 
			message: "Failed to generate report PDF",
			error: err?.message || String(err)
		});
	}
});

// POST /api/v1/reports/:id/export/excel
router.post("/:id/export/excel", authenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { filters, options } = req.body || {};
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';
		
		// Apply scope filter
		let finalFilters = { ...filters };
		if (options?.scope === 'all') {
			// Remove date filters to get all data
			delete finalFilters.dateRange;
			delete finalFilters.dateFrom;
			delete finalFilters.dateTo;
		} else if (options?.scope === 'summary') {
			// For summary, we might want to aggregate differently
			// This can be handled in the dataset service if needed
		}

		const rows = await getReportRows(id, finalFilters || {}, userRole, userId);
		const sheetName = getReportName(id);
		const xlsx = await buildExcelBufferFromJson(rows, sheetName);
		const filename = `report-${id}-${new Date().toISOString().slice(0, 10)}.xlsx`;
		
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		);
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(xlsx);
	} catch (err) {
		console.error("Report Excel export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate report Excel" });
	}
});

// POST /api/v1/reports/:id/export/csv
router.post("/:id/export/csv", authenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { filters, options } = req.body || {};
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';
		
		// Apply scope filter
		let finalFilters = { ...filters };
		if (options?.scope === 'all') {
			delete finalFilters.dateRange;
			delete finalFilters.dateFrom;
			delete finalFilters.dateTo;
		}

		const rows = await getReportRows(id, finalFilters || {}, userRole, userId);
		const csv = buildCsvBufferFromJson(rows);
		const filename = `report-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
		
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(csv);
	} catch (err) {
		console.error("Report CSV export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate report CSV" });
	}
});

// Helper function to get report name
function getReportName(reportId: string): string {
	const names: Record<string, string> = {
		'monthly-revenue': 'Monthly Revenue Report',
		'client-analysis': 'Client Analysis Report',
		'supplier-performance': 'Supplier Performance Report'
	};
	return names[reportId] || 'Report';
}

// Helper function to generate HTML table for PDF
function generateHtmlTable(rows: Array<Record<string, any>>, reportId: string): string {
	if (!rows || rows.length === 0) {
		return `
			<!doctype html>
			<html>
			<head>
				<meta charset="utf-8" />
				<style>
					body { font-family: Arial, sans-serif; padding: 24px; }
					h1 { margin: 0 0 8px; }
					.meta { color: #555; font-size: 12px; margin-bottom: 16px; }
				</style>
			</head>
			<body>
				<h1>${getReportName(reportId)}</h1>
				<div class="meta">${new Date().toLocaleString()}</div>
				<p>No data available for export.</p>
			</body>
			</html>
		`;
	}

	const headers = Object.keys(rows[0]);
	const headerRow = headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('');
	const dataRows = rows.map(row => 
		`<tr>${headers.map(h => `<td>${escapeHtml(String(row[h] || ''))}</td>`).join('')}</tr>`
	).join('');

	return `
		<!doctype html>
		<html>
		<head>
			<meta charset="utf-8" />
			<style>
				body { font-family: Arial, sans-serif; padding: 24px; }
				h1 { margin: 0 0 8px; }
				.meta { color: #555; font-size: 12px; margin-bottom: 16px; }
				table { width: 100%; border-collapse: collapse; margin-top: 16px; }
				th { background-color: #f3f4f6; padding: 8px; text-align: left; border: 1px solid #d1d5db; font-weight: bold; }
				td { padding: 8px; border: 1px solid #d1d5db; }
				tr:nth-child(even) { background-color: #f9fafb; }
			</style>
		</head>
		<body>
			<h1>${getReportName(reportId)}</h1>
			<div class="meta">Generated on ${new Date().toLocaleString()}</div>
			<table>
				<thead>
					<tr>${headerRow}</tr>
				</thead>
				<tbody>
					${dataRows}
				</tbody>
			</table>
		</body>
		</html>
	`;
}

function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, m => map[m]);
}

export default router;


