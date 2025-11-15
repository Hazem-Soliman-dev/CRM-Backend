import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // SQLite duplicate key error (UNIQUE constraint)
  if ((err as any).code === 'SQLITE_CONSTRAINT_UNIQUE' || 
      ((err as any).message && (err as any).message.includes('UNIQUE constraint'))) {
    const message = 'Duplicate field value entered. This record already exists.';
    error = new AppError(message, 400);
  }

  // SQLite foreign key constraint error
  if ((err as any).code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || 
      ((err as any).message && (err as any).message.includes('FOREIGN KEY constraint'))) {
    const message = 'Referenced record does not exist.';
    error = new AppError(message, 400);
  }

  // SQLite constraint errors (general)
  if ((err as any).code === 'SQLITE_CONSTRAINT') {
    const message = 'Database constraint violation. Please check your input.';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  errorResponse(
    res,
    error.message || 'Server Error',
    error.statusCode || 500,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  );
};
