import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { buildExcelBufferFromJson } from "../services/excel";
import { buildCsvBufferFromJson } from "../services/csv";
import { generatePdfBuffer } from "../services/pdf";
import { getAccountingRows, getFinancialReportData, AccountingFilters, AccountingRow } from "../services/accountingDataset";

const router = Router();

// POST /api/v1/accounting/export/excel
router.post("/export/excel", authenticate, async (req: Request, res: Response) => {
	try {
		const filters: AccountingFilters = req.body.filters || {};
		const reportType = filters.reportType || 'default';
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';

		let rows;
		if (reportType && reportType !== 'default') {
			rows = await getFinancialReportData(filters, reportType, userRole, userId);
		} else {
			rows = await getAccountingRows(filters, userRole, userId);
		}

		const sheetName = reportType && reportType !== 'default' 
			? getReportTypeName(reportType)
			: "Accounting Data";
		
		const xlsx = await buildExcelBufferFromJson(rows, sheetName);
		const filename = `accounting-${reportType || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
		
		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		);
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(xlsx);
	} catch (err) {
		console.error("Accounting Excel export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate accounting Excel export" });
	}
});

// POST /api/v1/accounting/export/csv
router.post("/export/csv", authenticate, async (req: Request, res: Response) => {
	try {
		const filters: AccountingFilters = req.body.filters || {};
		const reportType = filters.reportType || 'default';
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';

		let rows;
		if (reportType && reportType !== 'default') {
			rows = await getFinancialReportData(filters, reportType, userRole, userId);
		} else {
			rows = await getAccountingRows(filters, userRole, userId);
		}

		const csv = buildCsvBufferFromJson(rows);
		const filename = `accounting-${reportType || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
		
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(csv);
	} catch (err) {
		console.error("Accounting CSV export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate accounting CSV export" });
	}
});

// POST /api/v1/accounting/export/pdf
router.post("/export/pdf", authenticate, async (req: Request, res: Response) => {
	try {
		const filters: AccountingFilters = req.body.filters || {};
		const reportType = filters.reportType || 'default';
		const userRole = req.user?.role || 'admin';
		const userId = req.user?.userId || '';

		// For PDF, we'll generate HTML content and convert to PDF
		let rows;
		if (reportType && reportType !== 'default') {
			rows = await getFinancialReportData(filters, reportType, userRole, userId);
		} else {
			rows = await getAccountingRows(filters, userRole, userId);
		}

		// Generate HTML table for PDF
		const html = generateHtmlTable(rows, reportType);
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
		
		const filename = `accounting-${reportType || 'export'}-${new Date().toISOString().slice(0, 10)}.pdf`;
		
		// Set headers and send binary PDF data
		res.writeHead(200, {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": pdf.length.toString()
		});
		return res.end(pdf);
	} catch (err: any) {
		console.error("Accounting PDF export failed:", err);
		return res.status(500).json({ 
			success: false, 
			message: "Failed to generate accounting PDF export",
			error: err?.message || String(err)
		});
	}
});

// Helper function to get report type name
function getReportTypeName(reportType: string): string {
	const names: Record<string, string> = {
		'overview': 'Financial Overview',
		'profit': 'Profit Analysis',
		'agent': 'Agent Performance',
		'agent-performance': 'Agent Performance',
		'outstanding': 'Outstanding Balances',
		'outstanding-balances': 'Outstanding Balances'
	};
	return names[reportType] || 'Accounting Report';
}

// Helper function to generate HTML table for PDF
function generateHtmlTable(rows: AccountingRow[], reportType: string): string {
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
				<h1>${getReportTypeName(reportType)}</h1>
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
			<h1>${getReportTypeName(reportType)}</h1>
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

