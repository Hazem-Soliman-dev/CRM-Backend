import { Router } from 'express';
import { body } from 'express-validator';
import {
  logActivity,
  getActivities,
  getUserActivities,
  getFilteredActivities
} from '../controllers/activityController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const logActivityValidation = [
  body('entity_type')
    .isIn(['customer', 'lead', 'reservation', 'support_ticket', 'user', 'attendance'])
    .withMessage('Invalid entity_type'),
  body('entity_id').notEmpty().withMessage('entity_id is required'),
  body('activity_type')
    .isIn(['created', 'updated', 'deleted', 'status_changed', 'assigned', 'commented', 'message_sent'])
    .withMessage('Invalid activity_type'),
  body('description').notEmpty().trim().withMessage('description is required'),
  body('details').optional().isObject().withMessage('details must be an object')
];

// POST /api/v1/activities - Log activity
router.post('/', logActivityValidation, validate, logActivity);

// GET /api/v1/activities - Get activities (with filters)
router.get('/', getFilteredActivities);

// GET /api/v1/activities/entity - Get activities for specific entity
router.get('/entity/:entityType/:entityId', getActivities);

// GET /api/v1/activities/user/:id - Get user activities
router.get('/user/:id', getUserActivities);

export default router;

