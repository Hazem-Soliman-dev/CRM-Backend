import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, refreshToken, logout, forgotPassword, resetPassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().trim().withMessage('Full name is required'),
  body('role').isIn(['admin', 'customer', 'sales', 'reservation', 'finance', 'operations']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('department').optional().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Routes
router.post('/register', authRateLimiter, registerValidation, asyncHandler(register));
router.post('/login', authRateLimiter, loginValidation, asyncHandler(login));
router.get('/me', authenticate, asyncHandler(getMe));
router.post('/refresh', asyncHandler(refreshToken));
router.post('/logout', authenticate, asyncHandler(logout));
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(forgotPassword));
router.post('/reset-password', resetPasswordValidation, asyncHandler(resetPassword));

export default router;
