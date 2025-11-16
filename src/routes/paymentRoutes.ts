import { Router } from "express";
import { body } from "express-validator";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
  getCustomerPayments,
  updatePaymentStatus,
  processRefund,
  getPaymentsByBooking,
} from "../controllers/paymentController";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
// Switched to role-based authorize to ensure finance role works immediately

const router = Router();

// Validation rules
const paymentValidation = [
  body("booking_id").isInt().withMessage("Valid booking ID is required"),
  body("customer_id").isInt().withMessage("Valid customer ID is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("payment_method")
    .isIn(["Cash", "Credit Card", "Bank Transfer", "Check", "Other"])
    .withMessage("Invalid payment method"),
  body("payment_status")
    .optional()
    .isIn(["Pending", "Completed", "Failed", "Refunded", "Partially Refunded"])
    .withMessage("Invalid payment status"),
  body("transaction_id")
    .optional()
    .isString()
    .withMessage("Transaction ID must be a string"),
  body("payment_date")
    .isISO8601()
    .toDate()
    .withMessage("Valid payment date is required"),
  body("due_date")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Valid due date is required"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const updatePaymentValidation = [
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("payment_method")
    .optional()
    .isIn(["Cash", "Credit Card", "Bank Transfer", "Check", "Other"])
    .withMessage("Invalid payment method"),
  body("payment_status")
    .optional()
    .isIn(["Pending", "Completed", "Failed", "Refunded", "Partially Refunded"])
    .withMessage("Invalid payment status"),
  body("transaction_id")
    .optional()
    .isString()
    .withMessage("Transaction ID must be a string"),
  body("payment_date")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Valid payment date is required"),
  body("due_date")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Valid due date is required"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/payments - Get all payments
router.get("/", authorize("admin", "finance"), getAllPayments);

// GET /api/v1/payments/stats - Get payment statistics
router.get("/stats", authorize("admin", "finance"), getPaymentStats);

// GET /api/v1/payments/:id - Get single payment
router.get("/:id", authorize("admin", "finance"), getPaymentById);

// POST /api/v1/payments - Create new payment
router.post(
  "/",
  authorize("admin", "finance"),
  paymentValidation,
  validate,
  createPayment
);

// PUT /api/v1/payments/:id - Update payment
router.put(
  "/:id",
  authorize("admin", "finance"),
  updatePaymentValidation,
  validate,
  updatePayment
);

// DELETE /api/v1/payments/:id - Delete payment
router.delete("/:id", authorize("admin", "finance"), deletePayment);

// PATCH /api/v1/payments/:id/status - Update payment status
router.patch(
  "/:id/status",
  authorize("admin", "finance"),
  body("payment_status")
    .isIn(["Pending", "Completed", "Failed", "Refunded", "Partially Refunded"])
    .withMessage("Invalid payment status"),
  validate,
  updatePaymentStatus
);

// POST /api/v1/payments/:id/refund - Process refund
router.post(
  "/:id/refund",
  authorize("admin", "finance"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be greater than 0"),
  body("reason").optional().isString().withMessage("Reason must be a string"),
  validate,
  processRefund
);

// GET /api/v1/payments/customer/:customerId - Get customer payments
router.get(
  "/customer/:customerId",
  authorize("admin", "finance"),
  getCustomerPayments
);

// GET /api/v1/payments/booking/:bookingId - Get payments by booking
router.get(
  "/booking/:bookingId",
  authorize("admin", "finance"),
  getPaymentsByBooking
);

export default router;
