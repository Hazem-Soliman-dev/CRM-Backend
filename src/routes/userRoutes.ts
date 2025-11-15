import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserPassword,
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateStatusUpdate
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users
router.get('/', 
  checkModuleAccess('users'),
  requireRead('users'),
  getAllUsers
);

// Get single user
router.get('/:id',
  validateUserId,
  checkModuleAccess('users'),
  requireRead('users'),
  getUserById
);

// Create new user
router.post('/',
  validateCreateUser,
  checkModuleAccess('users'),
  requireCreate('users'),
  createUser
);

// Update user
router.put('/:id',
  validateUpdateUser,
  checkModuleAccess('users'),
  requireUpdate('users'),
  updateUser
);

// Update user status
router.patch('/:id/status',
  validateStatusUpdate,
  checkModuleAccess('users'),
  requireUpdate('users'),
  updateUserStatus
);

// Update user password
router.patch('/:id/password',
  validateUserId,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ],
  checkModuleAccess('users'),
  requireUpdate('users'),
  updateUserPassword
);

// Delete user
router.delete('/:id',
  validateUserId,
  checkModuleAccess('users'),
  requireDelete('users'),
  deleteUser
);

export default router;
