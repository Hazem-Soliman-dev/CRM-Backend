import { Router } from 'express';
import { body } from 'express-validator';
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
  getMyTickets
} from '../controllers/supportController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation rules
const ticketValidation = [
  body('customer_id').isInt().withMessage('Valid customer ID is required'),
  body('subject').notEmpty().trim().withMessage('Subject is required'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority'),
  body('assigned_to').optional().isInt().withMessage('Invalid assigned user ID')
];

const updateTicketValidation = [
  body('subject').optional().notEmpty().trim().withMessage('Subject cannot be empty'),
  body('description').optional().notEmpty().trim().withMessage('Description cannot be empty'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority'),
  body('status').optional().isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Invalid status'),
  body('assigned_to').optional().isInt().withMessage('Invalid assigned user ID')
];

// All routes require authentication
router.use(authenticate);

// GET /api/v1/support/tickets - Get all support tickets
router.get('/tickets', authorize('admin', 'manager', 'agent'), getAllTickets);

// GET /api/v1/support/tickets/my - Get my tickets
router.get('/tickets/my', authorize('admin', 'manager', 'agent', 'customer'), getMyTickets);

// GET /api/v1/support/tickets/stats - Get ticket statistics
router.get('/tickets/stats', authorize('admin', 'manager'), getTicketStats);

// GET /api/v1/support/tickets/:id - Get single ticket
router.get('/tickets/:id', authorize('admin', 'manager', 'agent', 'customer'), getTicketById);

// POST /api/v1/support/tickets - Create new ticket
router.post('/tickets', authorize('admin', 'manager', 'agent', 'customer'), ticketValidation, validate, createTicket);

// PUT /api/v1/support/tickets/:id - Update ticket
router.put('/tickets/:id', authorize('admin', 'manager', 'agent'), updateTicketValidation, validate, updateTicket);

// DELETE /api/v1/support/tickets/:id - Delete ticket
router.delete('/tickets/:id', authorize('admin', 'manager'), deleteTicket);

// PATCH /api/v1/support/tickets/:id/status - Update ticket status
router.patch('/tickets/:id/status', authorize('admin', 'manager', 'agent'),
  body('status').isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Invalid status'),
  validate, updateTicketStatus);

// PATCH /api/v1/support/tickets/:id/assign - Assign ticket
router.patch('/tickets/:id/assign', authorize('admin', 'manager'),
  body('assigned_to').isInt().withMessage('Invalid assigned user ID'),
  validate, assignTicket);

// POST /api/v1/support/tickets/:id/notes - Add note to ticket
router.post('/tickets/:id/notes', authorize('admin', 'manager', 'agent'),
  body('note').notEmpty().trim().withMessage('Note is required'),
  validate, addTicketNote);

// GET /api/v1/support/tickets/:id/notes - Get ticket notes
router.get('/tickets/:id/notes', authorize('admin', 'manager', 'agent', 'customer'), getTicketNotes);

export default router;
