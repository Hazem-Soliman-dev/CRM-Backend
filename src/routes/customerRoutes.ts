	import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCustomerBookings,
  getCustomerPayments,
  updateCustomerStatus,
  assignCustomerToStaff
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

// Validation rules
const customerValidation = [
  body('name').notEmpty().trim().withMessage('Customer name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('type').isIn(['Individual', 'Corporate']).withMessage('Type must be Individual or Corporate'),
  body('contact_method').optional().isIn(['Email', 'Phone', 'SMS']).withMessage('Invalid contact method'),
  body('assigned_staff_id').optional().isInt().withMessage('Invalid staff ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const updateCustomerValidation = [
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
  body('type').optional().isIn(['Individual', 'Corporate']).withMessage('Type must be Individual or Corporate'),
  body('status').optional().isIn(['Active', 'Inactive', 'Suspended']).withMessage('Invalid status'),
  body('contact_method').optional().isIn(['Email', 'Phone', 'SMS']).withMessage('Invalid contact method'),
  body('assigned_staff_id').optional().isInt().withMessage('Invalid staff ID'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/customers - Get all customers
router.get('/', checkModuleAccess('customers'), requireRead('customers'), getAllCustomers);

// GET /api/v1/customers/:id - Get single customer
router.get('/:id', checkModuleAccess('customers'), requireRead('customers'), getCustomerById);

// POST /api/v1/customers - Create new customer
router.post('/', checkModuleAccess('customers'), requireCreate('customers'), customerValidation, validate, createCustomer);

// PUT /api/v1/customers/:id - Update customer
router.put('/:id', checkModuleAccess('customers'), requireUpdate('customers'), updateCustomerValidation, validate, updateCustomer);

// DELETE /api/v1/customers/:id - Delete customer
router.delete('/:id', checkModuleAccess('customers'), requireDelete('customers'), deleteCustomer);

// GET /api/v1/customers/:id/stats - Get customer statistics
router.get('/:id/stats', checkModuleAccess('customers'), requireRead('customers'), getCustomerStats);

// GET /api/v1/customers/:id/bookings - Get customer bookings
router.get('/:id/bookings', checkModuleAccess('customers'), requireRead('customers'), getCustomerBookings);

// GET /api/v1/customers/:id/payments - Get customer payments
router.get('/:id/payments', checkModuleAccess('customers'), requireRead('customers'), getCustomerPayments);

// PATCH /api/v1/customers/:id/status - Update customer status
router.patch('/:id/status', checkModuleAccess('customers'), requireUpdate('customers'), 
  body('status').isIn(['Active', 'Inactive', 'Suspended']).withMessage('Invalid status'),
  validate, updateCustomerStatus);

// PATCH /api/v1/customers/:id/assign - Assign customer to staff
router.patch('/:id/assign', checkModuleAccess('customers'), requireUpdate('customers'),
  body('assigned_staff_id').isInt().withMessage('Invalid staff ID'),
  validate, assignCustomerToStaff);

export default router;
