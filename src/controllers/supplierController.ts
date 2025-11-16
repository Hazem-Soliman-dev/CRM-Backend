import { Request, Response } from 'express';
import { SupplierModel, CreateSupplierData, UpdateSupplierData, SupplierFilters } from '../models/supplierModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import { body, param, query, validationResult } from 'express-validator';

// Validation rules
export const validateCreateSupplier = [
  body('name').notEmpty().withMessage('Supplier name is required'),
  body('contact_person').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('address').optional().isString(),
  body('services').optional().isString()
];

export const validateUpdateSupplier = [
  param('id').isInt().withMessage('Invalid supplier ID'),
  body('name').optional().notEmpty().withMessage('Supplier name cannot be empty'),
  body('contact_person').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('address').optional().isString(),
  body('services').optional().isString(),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

export const validateSupplierId = [
  param('id').isInt().withMessage('Invalid supplier ID')
];

export const validateStatusUpdate = [
  param('id').isInt().withMessage('Invalid supplier ID'),
  body('status').isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

// Get all suppliers
export const getAllSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const filters: SupplierFilters = {
    status: req.query.status as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const result = await SupplierModel.getAllSuppliers(filters);
  
  successResponse(res, {
    suppliers: result.suppliers,
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: result.total,
      totalPages: Math.ceil(result.total / (filters.limit || 10))
    }
  }, 'Suppliers retrieved successfully');
});

// Get single supplier
export const getSupplierById = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const supplier = await SupplierModel.findSupplierById(req.params.id);
  
  successResponse(res, supplier, 'Supplier retrieved successfully');
});

// Create new supplier
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const supplierData: CreateSupplierData = {
    name: req.body.name,
    contact_person: req.body.contact_person,
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
    services: req.body.services
  };

  const supplier = await SupplierModel.createSupplier(supplierData);
  
  successResponse(res, supplier, 'Supplier created successfully', 201);
});

// Update supplier
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const updateData: UpdateSupplierData = {
    name: req.body.name,
    contact_person: req.body.contact_person,
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
    services: req.body.services,
    status: req.body.status
  };

  const supplier = await SupplierModel.updateSupplier(req.params.id, updateData);
  
  successResponse(res, supplier, 'Supplier updated successfully');
});

// Delete supplier
export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  await SupplierModel.deleteSupplier(req.params.id);
  
  successResponse(res, null, 'Supplier deleted successfully');
});

// Update supplier status
export const updateSupplierStatus = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const supplier = await SupplierModel.updateSupplierStatus(req.params.id, req.body.status);
  
  successResponse(res, supplier, 'Supplier status updated successfully');
});

// Get supplier statistics
export const getSupplierStats = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const stats = await SupplierModel.getSupplierStats(req.params.id);
  
  successResponse(res, stats, 'Supplier statistics retrieved successfully');
});

// Get all supplier statistics
export const getAllSupplierStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await SupplierModel.getAllSupplierStats();
  
  successResponse(res, stats, 'Supplier statistics retrieved successfully');
});
