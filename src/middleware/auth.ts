import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig, JWTPayload } from '../config/jwt';
import { AuthenticationError } from '../utils/AppError';
import { errorResponse } from '../utils/response';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      errorResponse(res, 'Invalid token', 401);
    } else if (error instanceof jwt.TokenExpiredError) {
      errorResponse(res, 'Token expired', 401);
    } else {
      errorResponse(res, 'Authentication failed', 401);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, 'Access denied. Insufficient permissions.', 403);
      return;
    }

    next();
  };
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Optional auth - continue without user
    next();
  }
};
