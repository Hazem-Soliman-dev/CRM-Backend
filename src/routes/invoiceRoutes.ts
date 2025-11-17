import { Router } from "express";
import { body } from "express-validator";
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicesByBooking,
} from "../controllers/invoiceController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Validation rules
const invoiceValidation = [
  body("booking_id")
    .custom((value) => {
      // Accept both string and number, but must be convertible to integer
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage("Valid booking ID is required"),
  body("customer_id")
    .custom((value) => {
      // Accept both string and number, but must be convertible to integer
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage("Valid customer ID is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("due_date")
    .custom((value) => {
      // Accept YYYY-MM-DD format or ISO8601
      if (!value) return false;
      const dateStr = String(value);
      // Check if it's YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      }
      // Check if it's ISO8601 format
      const isoDate = new Date(dateStr);
      return !isNaN(isoDate.getTime());
    })
    .withMessage("Valid due date is required (YYYY-MM-DD or ISO8601 format)"),
  body("payment_terms")
    .optional()
    .isString()
    .withMessage("Payment terms must be a string"),
  body("status")
    .optional()
    .isIn(["Draft", "Issued", "Sent", "Paid", "Overdue", "Cancelled"])
    .withMessage("Invalid invoice status"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const updateInvoiceValidation = [
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("due_date")
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const dateStr = String(value);
      // Check if it's YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      }
      // Check if it's ISO8601 format
      const isoDate = new Date(dateStr);
      return !isNaN(isoDate.getTime());
    })
    .withMessage("Valid due date is required (YYYY-MM-DD or ISO8601 format)"),
  body("payment_terms")
    .optional()
    .isString()
    .withMessage("Payment terms must be a string"),
  body("status")
    .optional()
    .isIn(["Draft", "Issued", "Sent", "Paid", "Overdue", "Cancelled"])
    .withMessage("Invalid invoice status"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/invoices - Get all invoices
router.get("/", authorize("admin", "finance"), getAllInvoices);

// GET /api/v1/invoices/:id - Get single invoice
router.get("/:id", authorize("admin", "finance"), getInvoiceById);

// POST /api/v1/invoices - Create new invoice
router.post(
  "/",
  authorize("admin", "finance"),
  invoiceValidation,
  validate,
  createInvoice
);

// PUT /api/v1/invoices/:id - Update invoice
router.put(
  "/:id",
  authorize("admin", "finance"),
  updateInvoiceValidation,
  validate,
  updateInvoice
);

// DELETE /api/v1/invoices/:id - Delete invoice
router.delete("/:id", authorize("admin", "finance"), deleteInvoice);

// GET /api/v1/invoices/bookings/:bookingId - Get invoices by booking
router.get(
  "/bookings/:bookingId",
  authorize("admin", "finance"),
  getInvoicesByBooking
);

export default router;

