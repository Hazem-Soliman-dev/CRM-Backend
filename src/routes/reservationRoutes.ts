import { Router } from "express";
import { body } from "express-validator";
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
  getTodaySchedule,
  updateReservationStatus,
  updatePaymentStatus,
  getCustomerReservations,
  getReservationStats,
} from "../controllers/reservationController";
import {
  getReservationNotes,
  getReservationNoteById,
  createReservationNote,
  updateReservationNote,
  deleteReservationNote,
} from "../controllers/reservationNoteController";
import {
  getReservationDocuments,
  // getReservationDocumentById,
  getReservationDocumentMetadata,
  createReservationDocument,
  updateReservationDocument,
  deleteReservationDocument,
  downloadReservationDocument,
} from "../controllers/reservationDocumentController";
import { getInvoicesByBooking } from "../controllers/invoiceController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Validation rules
const reservationValidation = [
  body("customer_id")
    .custom((value) => {
      // Accept both string and number, but must be convertible to integer
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage("Valid customer ID is required"),
  body("service_type")
    .isIn(["Flight", "Hotel", "Car Rental", "Tour", "Package", "Other"])
    .withMessage("Invalid service type"),
  body("destination").notEmpty().trim().withMessage("Destination is required"),
  body("departure_date")
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
    .withMessage("Valid departure date is required (YYYY-MM-DD or ISO8601 format)"),
  body("return_date")
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const dateStr = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      }
      const isoDate = new Date(dateStr);
      return !isNaN(isoDate.getTime());
    })
    .withMessage("Valid return date is required (YYYY-MM-DD or ISO8601 format)"),
  body("adults")
    .custom((value) => {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    })
    .withMessage("At least 1 adult is required"),
  body("children")
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num >= 0;
    })
    .withMessage("Children must be a non-negative integer"),
  body("infants")
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num >= 0;
    })
    .withMessage("Infants must be a non-negative integer"),
  body("total_amount")
    .custom((value) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return !isNaN(num) && num >= 0;
    })
    .withMessage("Total amount must be a positive number"),
  body("supplier_id")
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage("Invalid supplier ID"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const updateReservationValidation = [
  body("service_type")
    .optional()
    .isIn(["Flight", "Hotel", "Car Rental", "Tour", "Package", "Other"])
    .withMessage("Invalid service type"),
  body("destination")
    .optional()
    .notEmpty()
    .trim()
    .withMessage("Destination cannot be empty"),
  body("departure_date")
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
    .withMessage("Valid departure date is required (YYYY-MM-DD or ISO8601 format)"),
  body("return_date")
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
    .withMessage("Valid return date is required (YYYY-MM-DD or ISO8601 format)"),
  body("adults")
    .optional()
    .isInt({ min: 1 })
    .withMessage("At least 1 adult is required"),
  body("children")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Children must be a non-negative integer"),
  body("infants")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Infants must be a non-negative integer"),
  body("total_amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total amount must be a positive number"),
  body("status")
    .optional()
    .isIn(["Pending", "Confirmed", "Cancelled", "Completed"])
    .withMessage("Invalid status"),
  body("payment_status")
    .optional()
    .isIn(["Pending", "Partial", "Paid", "Refunded"])
    .withMessage("Invalid payment status"),
  body("supplier_id").optional().isInt().withMessage("Invalid supplier ID"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/reservations - Get all reservations
router.get(
  "/",
  authorize("admin", "reservation", "sales", "operations"),
  getAllReservations
);

// GET /api/v1/reservations/today-schedule - Get today's schedule
router.get(
  "/today-schedule",
  authorize("admin", "reservation", "operations", "sales"),
  getTodaySchedule
);

// GET /api/v1/reservations/stats - Get reservation statistics
router.get("/stats", authorize("admin", "reservation"), getReservationStats);

// Reservation Notes Routes (must come before /:id route)
// GET /api/v1/reservations/notes/:id - Get single note by ID
router.get(
  "/notes/:id",
  authorize("admin", "reservation", "sales", "operations"),
  getReservationNoteById
);

// Reservation Documents Routes (must come before /:id route)
// GET /api/v1/reservations/documents/:id - Get document metadata
router.get(
  "/documents/:id",
  authorize("admin", "reservation", "sales", "operations"),
  getReservationDocumentMetadata
);

// GET /api/v1/reservations/documents/:id/download - Download document
router.get(
  "/documents/:id/download",
  authorize("admin", "reservation", "sales", "operations"),
  downloadReservationDocument
);

// GET /api/v1/reservations/:id - Get single reservation
router.get(
  "/:id",
  authorize("admin", "reservation", "sales", "operations"),
  getReservationById
);

// POST /api/v1/reservations - Create new reservation
router.post(
  "/",
  authorize("admin", "reservation", "sales"),
  reservationValidation,
  validate,
  createReservation
);

// PUT /api/v1/reservations/:id - Update reservation
router.put(
  "/:id",
  authorize("admin", "reservation", "sales"),
  updateReservationValidation,
  validate,
  updateReservation
);

// DELETE /api/v1/reservations/:id - Delete reservation
router.delete("/:id", authorize("admin", "reservation"), deleteReservation);

// PATCH /api/v1/reservations/:id/status - Update reservation status
router.patch(
  "/:id/status",
  authorize("admin", "reservation", "sales"),
  body("status")
    .isIn(["Pending", "Confirmed", "Cancelled", "Completed"])
    .withMessage("Invalid status"),
  validate,
  updateReservationStatus
);

// PATCH /api/v1/reservations/:id/payment-status - Update payment status
router.patch(
  "/:id/payment-status",
  authorize("admin", "reservation", "finance"),
  body("payment_status")
    .isIn(["Pending", "Partial", "Paid", "Refunded"])
    .withMessage("Invalid payment status"),
  validate,
  updatePaymentStatus
);

// GET /api/v1/reservations/customer/:customerId - Get customer reservations
router.get(
  "/customer/:customerId",
  authorize("admin", "reservation", "sales"),
  getCustomerReservations
);

// Reservation Notes Routes
// GET /api/v1/reservations/:reservationId/notes - Get all notes for a reservation
router.get(
  "/:reservationId/notes",
  authorize("admin", "reservation", "sales", "operations"),
  getReservationNotes
);

// POST /api/v1/reservations/:reservationId/notes - Create new note
router.post(
  "/:reservationId/notes",
  authorize("admin", "reservation", "sales", "operations"),
  body("note").notEmpty().trim().withMessage("Note content is required"),
  body("note_type")
    .optional()
    .isIn(["internal", "interdepartmental", "supplier_update"])
    .withMessage("Invalid note type"),
  validate,
  createReservationNote
);

// PUT /api/v1/reservations/notes/:id - Update note
router.put(
  "/notes/:id",
  authorize("admin", "reservation", "sales", "operations"),
  body("note").optional().notEmpty().trim().withMessage("Note content cannot be empty"),
  body("note_type")
    .optional()
    .isIn(["internal", "interdepartmental", "supplier_update"])
    .withMessage("Invalid note type"),
  validate,
  updateReservationNote
);

// DELETE /api/v1/reservations/notes/:id - Delete note
router.delete(
  "/notes/:id",
  authorize("admin", "reservation", "sales"),
  deleteReservationNote
);

// Reservation Documents Routes
// GET /api/v1/reservations/:reservationId/documents - Get all documents for a reservation
router.get(
  "/:reservationId/documents",
  authorize("admin", "reservation", "sales", "operations"),
  getReservationDocuments
);

// POST /api/v1/reservations/:reservationId/documents - Upload new document
router.post(
  "/:reservationId/documents",
  authorize("admin", "reservation", "sales", "operations"),
  body("document_name").notEmpty().trim().withMessage("Document name is required"),
  body("document_type").notEmpty().trim().withMessage("Document type is required"),
  body("file_data").notEmpty().withMessage("File data is required"),
  body("file_size").isInt({ min: 1 }).withMessage("File size is required"),
  body("mime_type").optional().isString().withMessage("MIME type must be a string"),
  validate,
  createReservationDocument
);

// PUT /api/v1/reservations/documents/:id - Update document metadata
router.put(
  "/documents/:id",
  authorize("admin", "reservation", "sales", "operations"),
  body("document_name").optional().notEmpty().trim().withMessage("Document name cannot be empty"),
  body("document_type").optional().notEmpty().trim().withMessage("Document type cannot be empty"),
  body("description").optional().isString().withMessage("Description must be a string"),
  validate,
  updateReservationDocument
);

// DELETE /api/v1/reservations/documents/:id - Delete document
router.delete(
  "/documents/:id",
  authorize("admin", "reservation", "sales"),
  deleteReservationDocument
);

// Invoice Routes (nested under reservations/bookings)
// GET /api/v1/reservations/:bookingId/invoices - Get all invoices for a reservation
router.get(
  "/:bookingId/invoices",
  authorize("admin", "finance", "reservation"),
  getInvoicesByBooking
);

export default router;
