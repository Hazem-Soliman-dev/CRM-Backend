import { Request, Response } from 'express';
import { UserModel, CreateUserData, UpdateUserData } from '../models/userModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import { body, param, query, validationResult } from 'express-validator';

// Validation rules
export const validateCreateUser = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('phone').optional().isString(),
  body('role').isIn(['admin', 'manager', 'agent', 'customer']).withMessage('Invalid role'),
  body('department').optional().isString()
];

export const validateUpdateUser = [
  param('id').isInt().withMessage('Invalid user ID'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().isString(),
  body('role').optional().isIn(['admin', 'manager', 'agent', 'customer']).withMessage('Invalid role'),
  body('department').optional().isString(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

export const validateUserId = [
  param('id').isInt().withMessage('Invalid user ID')
];

export const validateStatusUpdate = [
  param('id').isInt().withMessage('Invalid user ID'),
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
];

// Get all users
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const users = await UserModel.getAllUsers(req.user!.role, req.user!.userId);
  
  successResponse(res, users, 'Users retrieved successfully');
});

// Get single user
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const user = await UserModel.findUserById(req.params.id);
  
  successResponse(res, user, 'User retrieved successfully');
});

// Create new user
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const userData: CreateUserData = {
    email: req.body.email,
    password: req.body.password,
    full_name: req.body.full_name,
    phone: req.body.phone,
    role: req.body.role,
    department: req.body.department
  };

  const user = await UserModel.createUser(userData);
  
  successResponse(res, user, 'User created successfully', 201);
});

// Update user
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const updateData: UpdateUserData = {
    full_name: req.body.full_name,
    phone: req.body.phone,
    role: req.body.role,
    department: req.body.department,
    status: req.body.status
  };

  const user = await UserModel.updateUser(req.params.id, updateData);
  
  successResponse(res, user, 'User updated successfully');
});

// Delete user
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  await UserModel.deleteUser(req.params.id);
  
  successResponse(res, null, 'User deleted successfully');
});

// Update user status
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const user = await UserModel.updateUser(req.params.id, { status: req.body.status });
  
  successResponse(res, user, 'User status updated successfully');
});

// Update user password
export const updateUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('New password must be at least 6 characters long');
  }

  // Verify current password
  const user = await UserModel.verifyPassword(req.user!.email, currentPassword);
  if (!user) {
    throw new ValidationError('Current password is incorrect');
  }

  await UserModel.updatePassword(req.params.id, newPassword);
  
  successResponse(res, null, 'Password updated successfully');
});
