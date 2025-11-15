import { Router } from 'express';
import { body } from 'express-validator';
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsRead,
  deleteNotification
} from '../controllers/notificationController';
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

const notificationValidation = [
  body('type')
    .notEmpty()
    .isIn(['lead', 'customer', 'booking', 'payment', 'support', 'system', 'task'])
    .withMessage('Invalid notification type'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('userId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
];

router.use(authenticate);

router.get('/', checkModuleAccess('notifications'), requireRead('notifications'), getNotifications);
router.post(
  '/',
  checkModuleAccess('notifications'),
  requireCreate('notifications'),
  notificationValidation,
  validate,
  createNotification
);
router.patch(
  '/:id/read',
  checkModuleAccess('notifications'),
  requireUpdate('notifications'),
  markNotificationAsRead
);
router.post(
  '/mark-all-read',
  checkModuleAccess('notifications'),
  requireUpdate('notifications'),
  markAllNotificationsRead
);
router.delete(
  '/:id',
  checkModuleAccess('notifications'),
  requireDelete('notifications'),
  deleteNotification
);

export default router;

