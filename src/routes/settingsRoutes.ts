import { Router } from 'express';
import { body } from 'express-validator';
import {
  getWorkspaceSettings,
  updateWorkspaceSettings
} from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { checkModuleAccess, requireRead, requireUpdate } from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

const updateValidation = [
  body('defaultCurrency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 5 })
    .withMessage('defaultCurrency must be a valid currency code'),
  body('defaultTimezone').optional().isString().withMessage('defaultTimezone must be a string'),
  body('defaultLanguage')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('defaultLanguage must be a valid locale'),
  body('pipelineMode')
    .optional()
    .isIn(['standard', 'enterprise', 'custom'])
    .withMessage('pipelineMode must be standard, enterprise, or custom'),
  body('pipelineName')
    .optional({ nullable: true })
    .isString()
    .withMessage('pipelineName must be a string'),
  body('leadAlerts').optional().isBoolean().withMessage('leadAlerts must be boolean'),
  body('ticketUpdates').optional().isBoolean().withMessage('ticketUpdates must be boolean'),
  body('dailyDigest').optional().isBoolean().withMessage('dailyDigest must be boolean'),
  body('taskReminders').optional().isBoolean().withMessage('taskReminders must be boolean'),
  body('compactMode').optional().isBoolean().withMessage('compactMode must be boolean'),
  body('highContrast').optional().isBoolean().withMessage('highContrast must be boolean'),
  body('theme').optional().isIn(['light', 'dark']).withMessage('theme must be light or dark')
];

router.use(authenticate);

router.get('/', checkModuleAccess('settings'), requireRead('settings'), getWorkspaceSettings);
router.put(
  '/',
  checkModuleAccess('settings'),
  requireUpdate('settings'),
  updateValidation,
  validate,
  updateWorkspaceSettings
);

export default router;

