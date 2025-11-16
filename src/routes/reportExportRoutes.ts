import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { generatePdfBuffer } from "../services/pdf";
import { getReportRows } from "../services/reportDataset";
import { buildExcelBufferFromJson } from "../services/excel";

const router = Router();

// GET /api/v1/reports/:id/export/pdf
router.get("/:id/export/pdf", authenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const pdf = await generatePdfBuffer({ type: "report", id });
		const filename = `report-${id}-${new Date().toISOString().slice(0, 10)}.pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		return res.status(200).send(pdf);
	} catch (err) {
		console.error("Report PDF export failed:", err);
		return res.status(500).json({ success: false, message: "Failed to generate report PDF" });
	}
});

// POST /api/v1/reports/:id/export/excel
router.post("/:id/export/excel", authenticate, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { filters } = req.body || {};
		const rows = await getReportRows(id, filters || {});
		const xlsx = await buildExcelBufferFromJson(rows, "Report");
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

export default router;


