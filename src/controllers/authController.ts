import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { successResponse } from '../utils/response';
import { AuthenticationError, ValidationError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

// Generate JWT token
const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: '7d' });
};

// Generate refresh token
const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: '30d' });
};

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, full_name, phone, role, department } = req.body;

  // Validation
  if (!email || !password || !full_name || !role) {
    throw new ValidationError('Email, password, full name, and role are required');
  }

  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters long');
  }

  const validRoles = ['admin', 'manager', 'agent', 'customer'];
  if (!validRoles.includes(role)) {
    throw new ValidationError('Invalid role. Must be one of: admin, manager, agent, customer');
  }

  const user = await UserModel.createUser({
    email,
    password,
    full_name,
    phone,
    role,
    department
  });

  // Generate tokens
  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Update last login
  await UserModel.updateLastLogin(user.id);

  successResponse(res, {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      department: user.department,
      avatar_url: user.avatar_url,
      status: user.status
    },
    token,
    refreshToken
  }, 'User registered successfully', 201);
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await UserModel.verifyPassword(email, password);
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new AuthenticationError('Account is inactive');
  }

  // Generate tokens
  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Update last login
  await UserModel.updateLastLogin(user.id);

  successResponse(res, {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      department: user.department,
      avatar_url: user.avatar_url,
      status: user.status
    },
    token,
    refreshToken
  }, 'Login successful');
});

// Get current user
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findUserById(req.user!.userId);
  
  successResponse(res, {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    department: user.department,
    avatar_url: user.avatar_url,
    status: user.status,
    last_login: user.last_login,
    created_at: user.created_at
  }, 'User profile retrieved successfully');
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.secret) as JWTPayload;
    const user = await UserModel.findUserById(decoded.userId);

    if (user.status !== 'active') {
      throw new AuthenticationError('Account is inactive');
    }

    // Generate new tokens
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    successResponse(res, {
      token: newToken,
      refreshToken: newRefreshToken
    }, 'Token refreshed successfully');
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
});

// Logout (client-side token removal)
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, null, 'Logout successful');
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  const user = await UserModel.findUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists or not
    successResponse(res, null, 'If the email exists, a password reset link has been sent');
    return;
  }

  // In a real application, you would:
  // 1. Generate a password reset token
  // 2. Send an email with the reset link
  // 3. Store the token in database with expiration

  successResponse(res, null, 'If the email exists, a password reset link has been sent');
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError('Token and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('Password must be at least 6 characters long');
  }

  // In a real application, you would:
  // 1. Verify the reset token
  // 2. Check if token is expired
  // 3. Update the password

  successResponse(res, null, 'Password reset successfully');
});
