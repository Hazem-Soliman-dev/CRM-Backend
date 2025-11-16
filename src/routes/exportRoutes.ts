import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { generatePdfBuffer } from "../services/pdf";
import { buildExcelBufferFromJson } from "../services/excel";
import { buildCsvBufferFromJson } from "../services/csv";

const router = Router();

// GET /api/v1/export/pdf?type=invoice|report&id=...
router.get("/pdf", authenticate, async (req: Request, res: Response) => {
	try {
		const { type, id } = req.query as { type?: string; id?: string };
		if (!type || (type !== "invoice" && type !== "report")) {
			return res.status(400).json({ success: false, message: "Invalid type" });
		}

		const buffer = await generatePdfBuffer({
			type: type as "invoice" | "report",
			id,
		});

		const filename = `${type}-${id || "export"}-${new Date()
			.toISOString()
			.slice(0, 10)}.pdf`;

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(buffer);
	} catch (err: any) {
		console.error("PDF export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate PDF" });
	}
});

// POST /api/v1/export/excel
// Body: { rows: Array<Record<string, any>>, sheetName?: string, filename?: string }
router.post("/excel", authenticate, async (req: Request, res: Response) => {
	try {
		const { rows, sheetName, filename } = req.body || {};
		if (!Array.isArray(rows)) {
			return res.status(400).json({ success: false, message: "rows must be an array" });
		}
		const buffer = await buildExcelBufferFromJson(rows, sheetName || "Data");

		const outName =
			filename ||
			`export-${new Date()
				.toISOString()
				.slice(0, 10)}.xlsx`;

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		);
		res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
		return res.status(200).send(buffer);
	} catch (err: any) {
		console.error("Excel export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate Excel" });
	}
});

// POST /api/v1/export/csv
// Body: { rows: Array<Record<string, any>>, filename?: string }
router.post("/csv", authenticate, async (req: Request, res: Response) => {
	try {
		const { rows, filename } = req.body || {};
		if (!Array.isArray(rows)) {
			return res.status(400).json({ success: false, message: "rows must be an array" });
		}
		const buffer = buildCsvBufferFromJson(rows);

		const outName =
			filename ||
			`export-${new Date()
				.toISOString()
				.slice(0, 10)}.csv`;
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
		return res.status(200).send(buffer);
	} catch (err: any) {
		console.error("CSV export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate CSV" });
	}
});

export default router;


