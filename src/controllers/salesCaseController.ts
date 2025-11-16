import { Request, Response } from 'express';
import { SalesCaseModel, CreateSalesCaseData, UpdateSalesCaseData, SalesCaseFilters } from '../models/salesCaseModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import { body, param, validationResult } from 'express-validator';

// Validation rules
export const validateCreateSalesCase = [
  body('customer_id').isInt().withMessage('Customer ID must be a valid integer'),
  body('lead_id').optional().isInt().withMessage('Lead ID must be a valid integer'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
  body('expected_close_date').optional().isISO8601().withMessage('Expected close date must be a valid date'),
  body('assigned_to').optional().isInt().withMessage('Assigned to must be a valid integer')
];

export const validateUpdateSalesCase = [
  param('id').isInt().withMessage('Invalid sales case ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().isString(),
  body('status').optional().isIn(['Open', 'In Progress', 'Quoted', 'Won', 'Lost']).withMessage('Invalid status'),
  body('case_type').optional().isIn(['B2C', 'B2B']).withMessage('Invalid case type'),
  body('quotation_status').optional().isIn(['Draft', 'Sent', 'Accepted', 'Rejected']).withMessage('Invalid quotation status'),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
  body('expected_close_date').optional().isISO8601().withMessage('Expected close date must be a valid date'),
  body('assigned_to').optional().isInt().withMessage('Assigned to must be a valid integer'),
  body('linked_items').optional().isArray().withMessage('Linked items must be an array'),
  body('linked_items.*').optional().isInt().withMessage('Each linked item must be an integer'),
  body('assigned_departments').optional().isArray().withMessage('Assigned departments must be an array'),
  body('assigned_departments.*').optional().isInt().withMessage('Each department must be an integer')
];

export const validateSalesCaseId = [
  param('id').isInt().withMessage('Invalid sales case ID')
];

export const validateStatusUpdate = [
  param('id').isInt().withMessage('Invalid sales case ID'),
  body('status').isIn(['Open', 'In Progress', 'Quoted', 'Won', 'Lost']).withMessage('Invalid status')
];

export const validateAssignSalesCase = [
  param('id').isInt().withMessage('Invalid sales case ID'),
  body('assigned_to').isInt().withMessage('Assigned to must be a valid integer')
];

// Get all sales cases
export const getAllSalesCases = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  const filters: SalesCaseFilters = {
    status: req.query.status as string,
    assigned_to: req.query.assigned_to as string,
    customer_id: req.query.customer_id as string,
    lead_id: req.query.lead_id as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const result = await SalesCaseModel.getAllSalesCases(filters, req.user!.role, req.user!.userId);
  
  successResponse(res, {
    salesCases: result.salesCases,
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: result.total,
      totalPages: Math.ceil(result.total / (filters.limit || 10))
    }
  }, 'Sales cases retrieved successfully');
});

// Get single sales case
export const getSalesCaseById = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  const salesCase = await SalesCaseModel.findSalesCaseById(req.params.id);
  
  successResponse(res, salesCase, 'Sales case retrieved successfully');
});

// Create new sales case
export const createSalesCase = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  const salesCaseData: CreateSalesCaseData = {
    customer_id: req.body.customer_id,
    lead_id: req.body.lead_id,
    title: req.body.title,
    description: req.body.description,
    value: req.body.value,
    probability: req.body.probability,
    expected_close_date: req.body.expected_close_date,
    assigned_to: req.body.assigned_to
  };

  const salesCase = await SalesCaseModel.createSalesCase(salesCaseData, req.user!.userId);
  
  successResponse(res, salesCase, 'Sales case created successfully', 201);
});

// Update sales case
export const updateSalesCase = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  // Only include fields that are actually provided (not undefined)
  const updateData: UpdateSalesCaseData = {};
  
  if (req.body.title !== undefined) {
    updateData.title = req.body.title;
  }
  if (req.body.description !== undefined) {
    updateData.description = req.body.description;
  }
  if (req.body.status !== undefined) {
    updateData.status = req.body.status;
  }
  if (req.body.case_type !== undefined) {
    updateData.case_type = req.body.case_type;
  }
  if (req.body.quotation_status !== undefined) {
    updateData.quotation_status = req.body.quotation_status;
  }
  if (req.body.value !== undefined) {
    updateData.value = req.body.value;
  }
  if (req.body.probability !== undefined) {
    updateData.probability = req.body.probability;
  }
  if (req.body.expected_close_date !== undefined) {
    updateData.expected_close_date = req.body.expected_close_date;
  }
  if (req.body.assigned_to !== undefined) {
    updateData.assigned_to = req.body.assigned_to;
  }
  if (req.body.linked_items !== undefined) {
    updateData.linked_items = req.body.linked_items;
  }
  if (req.body.assigned_departments !== undefined) {
    updateData.assigned_departments = req.body.assigned_departments;
  }

  // Check if we have any fields to update
  if (Object.keys(updateData).length === 0) {
    throw new ValidationError('No fields provided to update');
  }

  const salesCase = await SalesCaseModel.updateSalesCase(req.params.id, updateData);
  
  successResponse(res, salesCase, 'Sales case updated successfully');
});

// Delete sales case
export const deleteSalesCase = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  await SalesCaseModel.deleteSalesCase(req.params.id);
  
  successResponse(res, null, 'Sales case deleted successfully');
});

// Update sales case status
export const updateSalesCaseStatus = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  const salesCase = await SalesCaseModel.updateSalesCaseStatus(req.params.id, req.body.status);
  
  successResponse(res, salesCase, 'Sales case status updated successfully');
});

// Assign sales case
export const assignSalesCase = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((error: any) => error.msg).join(', '));
  }

  const salesCase = await SalesCaseModel.assignSalesCase(req.params.id, req.body.assigned_to);
  
  successResponse(res, salesCase, 'Sales case assigned successfully');
});

// Get sales case statistics
export const getSalesCaseStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await SalesCaseModel.getSalesCaseStats(req.user!.role, req.user!.userId);
  
  successResponse(res, stats, 'Sales case statistics retrieved successfully');
});
