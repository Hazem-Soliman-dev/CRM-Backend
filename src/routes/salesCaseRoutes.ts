import { Router } from "express";
import {
  getAllSalesCases,
  getSalesCaseById,
  createSalesCase,
  updateSalesCase,
  deleteSalesCase,
  updateSalesCaseStatus,
  assignSalesCase,
  getSalesCaseStats,
  validateCreateSalesCase,
  validateUpdateSalesCase,
  validateSalesCaseId,
  validateStatusUpdate,
  validateAssignSalesCase,
} from "../controllers/salesCaseController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all sales cases (with filtering and pagination)
router.get("/", authorize("admin", "sales"), getAllSalesCases);

// Get sales case statistics
router.get("/stats", authorize("admin", "sales"), getSalesCaseStats);

// Get single sales case
router.get(
  "/:id",
  validateSalesCaseId,
  authorize("admin", "sales"),
  getSalesCaseById
);

// Create new sales case
router.post(
  "/",
  validateCreateSalesCase,
  authorize("admin", "sales"),
  createSalesCase
);

// Update sales case
router.put(
  "/:id",
  validateUpdateSalesCase,
  authorize("admin", "sales"),
  updateSalesCase
);

// Update sales case status
router.patch(
  "/:id/status",
  validateStatusUpdate,
  authorize("admin", "sales"),
  updateSalesCaseStatus
);

// Assign sales case
router.patch(
  "/:id/assign",
  validateAssignSalesCase,
  authorize("admin", "sales"),
  assignSalesCase
);

// Delete sales case
router.delete(
  "/:id",
  validateSalesCaseId,
  authorize("admin", "sales"),
  deleteSalesCase
);

export default router;
