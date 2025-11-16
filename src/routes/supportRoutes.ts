import { Router } from "express";
import { body } from "express-validator";
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  addTicketNote,
  getTicketNotes,
  updateTicketStatus,
  assignTicket,
  getMyTickets,
} from "../controllers/supportController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Validation rules
const ticketValidation = [
  body("customer_id").isInt().withMessage("Valid customer ID is required"),
  body("subject").notEmpty().trim().withMessage("Subject is required"),
  body("description").notEmpty().trim().withMessage("Description is required"),
  body("priority")
    .optional()
    .isIn(["Low", "Medium", "High", "Urgent"])
    .withMessage("Invalid priority"),
  body("assigned_to")
    .optional()
    .isInt()
    .withMessage("Invalid assigned user ID"),
];

const updateTicketValidation = [
  body("subject")
    .optional()
    .notEmpty()
    .trim()
    .withMessage("Subject cannot be empty"),
  body("description")
    .optional()
    .notEmpty()
    .trim()
    .withMessage("Description cannot be empty"),
  body("priority")
    .optional()
    .isIn(["Low", "Medium", "High", "Urgent"])
    .withMessage("Invalid priority"),
  body("status")
    .optional()
    .isIn(["Open", "In Progress", "Resolved", "Closed"])
    .withMessage("Invalid status"),
  body("assigned_to")
    .optional()
    .isInt()
    .withMessage("Invalid assigned user ID"),
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/support/tickets - Get all support tickets
router.get(
  "/tickets",
  authorize("admin", "operations", "reservation", "sales", "finance"),
  getAllTickets
);

// GET /api/v1/support/tickets/my - Get my tickets
router.get(
  "/tickets/my",
  authorize(
    "admin",
    "operations",
    "reservation",
    "sales",
    "finance",
    "customer"
  ),
  getMyTickets
);

// GET /api/v1/support/tickets/stats - Get ticket statistics
router.get("/tickets/stats", authorize("admin", "operations"), getTicketStats);

// GET /api/v1/support/tickets/:id - Get single ticket
router.get(
  "/tickets/:id",
  authorize(
    "admin",
    "operations",
    "reservation",
    "sales",
    "finance",
    "customer"
  ),
  getTicketById
);

// POST /api/v1/support/tickets - Create new ticket
router.post(
  "/tickets",
  authorize(
    "admin",
    "operations",
    "reservation",
    "sales",
    "finance",
    "customer"
  ),
  ticketValidation,
  validate,
  createTicket
);

// PUT /api/v1/support/tickets/:id - Update ticket
router.put(
  "/tickets/:id",
  authorize("admin", "operations", "reservation", "sales", "finance"),
  updateTicketValidation,
  validate,
  updateTicket
);

// DELETE /api/v1/support/tickets/:id - Delete ticket
router.delete("/tickets/:id", authorize("admin", "operations"), deleteTicket);

// PATCH /api/v1/support/tickets/:id/status - Update ticket status
router.patch(
  "/tickets/:id/status",
  authorize("admin", "operations", "reservation", "sales", "finance"),
  body("status")
    .isIn(["Open", "In Progress", "Resolved", "Closed"])
    .withMessage("Invalid status"),
  validate,
  updateTicketStatus
);

// PATCH /api/v1/support/tickets/:id/assign - Assign ticket
router.patch(
  "/tickets/:id/assign",
  authorize("admin", "operations"),
  body("assigned_to").isInt().withMessage("Invalid assigned user ID"),
  validate,
  assignTicket
);

// POST /api/v1/support/tickets/:id/notes - Add note to ticket
router.post(
  "/tickets/:id/notes",
  authorize("admin", "operations", "reservation", "sales", "finance"),
  body("note").notEmpty().trim().withMessage("Note is required"),
  validate,
  addTicketNote
);

// GET /api/v1/support/tickets/:id/notes - Get ticket notes
router.get(
  "/tickets/:id/notes",
  authorize(
    "admin",
    "operations",
    "reservation",
    "sales",
    "finance",
    "customer"
  ),
  getTicketNotes
);

export default router;
