import { Router } from 'express';
import { body } from 'express-validator';
import {
  getOperationsTasks,
  getOperationsTaskById,
  createOperationsTask,
  updateOperationsTask,
  updateOperationsTaskStatus,
  deleteOperationsTask
} from '../controllers/operationsTaskController';
import { authenticate } from '../middleware/auth';
import {
  checkModuleAccess,
  requireRead,
  requireCreate,
  requireUpdate,
  requireDelete
} from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

const baseValidation = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('tripId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Trip identifier must be a positive integer'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Delayed'])
    .withMessage('Invalid task status'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority level'),
  body('assignedTo')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Assigned user must be a positive integer'),
  body('scheduledAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('scheduledAt must be a valid ISO date string')
];

router.use(authenticate);

router.get('/', checkModuleAccess('operations'), requireRead('operations'), getOperationsTasks);
router.get('/:id', checkModuleAccess('operations'), requireRead('operations'), getOperationsTaskById);
router.post(
  '/',
  checkModuleAccess('operations'),
  requireCreate('operations'),
  baseValidation,
  validate,
  createOperationsTask
);
router.put(
  '/:id',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  baseValidation,
  validate,
  updateOperationsTask
);
router.patch(
  '/:id/status',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  body('status')
    .isIn(['Pending', 'In Progress', 'Completed', 'Delayed'])
    .withMessage('Invalid task status'),
  validate,
  updateOperationsTaskStatus
);
router.delete('/:id', checkModuleAccess('operations'), requireDelete('operations'), deleteOperationsTask);

export default router;

