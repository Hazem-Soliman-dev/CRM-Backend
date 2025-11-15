import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getOverdueLeads,
  convertToCustomer,
  updateLeadStatus,
  scheduleFollowUp
} from '../controllers/leadController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createLeadValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().trim().withMessage('Phone is required'),
  body('source').isIn(['Website', 'Social Media', 'Email', 'Walk-in', 'Referral']).withMessage('Invalid source'),
  body('type').isIn(['B2B', 'B2C']).withMessage('Invalid type'),
  body('company').optional().trim(),
  body('agent_id').optional().isUUID().withMessage('Invalid agent ID'),
  body('value').optional().isNumeric().withMessage('Value must be a number'),
  body('notes').optional().trim(),
  body('next_followup').optional().isISO8601().withMessage('Invalid follow-up date')
];

const updateLeadValidation = [
  body('name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('source').optional().isIn(['Website', 'Social Media', 'Email', 'Walk-in', 'Referral']),
  body('type').optional().isIn(['B2B', 'B2C']),
  body('company').optional().trim(),
  body('agent_id').optional().isUUID(),
  body('value').optional().isNumeric(),
  body('notes').optional().trim(),
  body('last_contact').optional().isISO8601(),
  body('next_followup').optional().isISO8601()
];

const statusValidation = [
  body('status').isIn(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'])
    .withMessage('Invalid status')
];

const followUpValidation = [
  body('next_followup').isISO8601().withMessage('Valid follow-up date is required'),
  body('notes').optional().trim()
];

const queryValidation = [
  query('status').optional().isIn(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
  query('source').optional().isIn(['Website', 'Social Media', 'Email', 'Walk-in', 'Referral']),
  query('type').optional().isIn(['B2B', 'B2C']),
  query('agent_id').optional().isUUID(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

// Routes
router.get('/', 
  checkModuleAccess('leads'),
  requireRead('leads'),
  queryValidation, 
  asyncHandler(getAllLeads)
);
router.get('/overdue', 
  checkModuleAccess('leads'),
  requireRead('leads'),
  asyncHandler(getOverdueLeads)
);
router.get('/:id', 
  checkModuleAccess('leads'),
  requireRead('leads'),
  asyncHandler(getLeadById)
);
router.post('/', 
  checkModuleAccess('leads'),
  requireCreate('leads'),
  createLeadValidation, 
  asyncHandler(createLead)
);
router.put('/:id', 
  checkModuleAccess('leads'),
  requireUpdate('leads'),
  updateLeadValidation, 
  asyncHandler(updateLead)
);
router.delete('/:id', 
  checkModuleAccess('leads'),
  requireDelete('leads'),
  asyncHandler(deleteLead)
);
router.post('/:id/convert', 
  checkModuleAccess('leads'),
  requireUpdate('leads'),
  asyncHandler(convertToCustomer)
);
router.patch('/:id/status', 
  checkModuleAccess('leads'),
  requireUpdate('leads'),
  statusValidation, 
  asyncHandler(updateLeadStatus)
);
router.patch('/:id/follow-up', 
  checkModuleAccess('leads'),
  requireUpdate('leads'),
  followUpValidation, 
  asyncHandler(scheduleFollowUp)
);

export default router;
