import { Router } from 'express';
import { body } from 'express-validator';
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
  getReservationStats
} from '../controllers/reservationController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation rules
const reservationValidation = [
  body('customer_id').isInt().withMessage('Valid customer ID is required'),
  body('service_type').isIn(['Flight', 'Hotel', 'Car Rental', 'Tour', 'Package', 'Other']).withMessage('Invalid service type'),
  body('destination').notEmpty().trim().withMessage('Destination is required'),
  body('departure_date').isISO8601().toDate().withMessage('Valid departure date is required'),
  body('return_date').optional().isISO8601().toDate().withMessage('Valid return date is required'),
  body('adults').isInt({ min: 1 }).withMessage('At least 1 adult is required'),
  body('children').optional().isInt({ min: 0 }).withMessage('Children must be a non-negative integer'),
  body('infants').optional().isInt({ min: 0 }).withMessage('Infants must be a non-negative integer'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('supplier_id').optional().isUUID().withMessage('Invalid supplier ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const updateReservationValidation = [
  body('service_type').optional().isIn(['Flight', 'Hotel', 'Car Rental', 'Tour', 'Package', 'Other']).withMessage('Invalid service type'),
  body('destination').optional().notEmpty().trim().withMessage('Destination cannot be empty'),
  body('departure_date').optional().isISO8601().toDate().withMessage('Valid departure date is required'),
  body('return_date').optional().isISO8601().toDate().withMessage('Valid return date is required'),
  body('adults').optional().isInt({ min: 1 }).withMessage('At least 1 adult is required'),
  body('children').optional().isInt({ min: 0 }).withMessage('Children must be a non-negative integer'),
  body('infants').optional().isInt({ min: 0 }).withMessage('Infants must be a non-negative integer'),
  body('total_amount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('status').optional().isIn(['Pending', 'Confirmed', 'Cancelled', 'Completed']).withMessage('Invalid status'),
  body('payment_status').optional().isIn(['Pending', 'Partial', 'Paid', 'Refunded']).withMessage('Invalid payment status'),
  body('supplier_id').optional().isUUID().withMessage('Invalid supplier ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/reservations - Get all reservations
router.get('/', authorize('admin', 'manager', 'agent'), getAllReservations);

// GET /api/v1/reservations/today-schedule - Get today's schedule
router.get('/today-schedule', authorize('admin', 'manager', 'agent'), getTodaySchedule);

// GET /api/v1/reservations/stats - Get reservation statistics
router.get('/stats', authorize('admin', 'manager'), getReservationStats);

// GET /api/v1/reservations/:id - Get single reservation
router.get('/:id', authorize('admin', 'manager', 'agent'), getReservationById);

// POST /api/v1/reservations - Create new reservation
router.post('/', authorize('admin', 'manager', 'agent'), reservationValidation, validate, createReservation);

// PUT /api/v1/reservations/:id - Update reservation
router.put('/:id', authorize('admin', 'manager', 'agent'), updateReservationValidation, validate, updateReservation);

// DELETE /api/v1/reservations/:id - Delete reservation
router.delete('/:id', authorize('admin', 'manager'), deleteReservation);

// PATCH /api/v1/reservations/:id/status - Update reservation status
router.patch('/:id/status', authorize('admin', 'manager', 'agent'),
  body('status').isIn(['Pending', 'Confirmed', 'Cancelled', 'Completed']).withMessage('Invalid status'),
  validate, updateReservationStatus);

// PATCH /api/v1/reservations/:id/payment-status - Update payment status
router.patch('/:id/payment-status', authorize('admin', 'manager', 'agent'),
  body('payment_status').isIn(['Pending', 'Partial', 'Paid', 'Refunded']).withMessage('Invalid payment status'),
  validate, updatePaymentStatus);

// GET /api/v1/reservations/customer/:customerId - Get customer reservations
router.get('/customer/:customerId', authorize('admin', 'manager', 'agent'), getCustomerReservations);

export default router;
