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
  
  if (req.body.title !== undefined && req.body.title !== null && req.body.title !== '') {
    updateData.title = req.body.title;
  }
  if (req.body.description !== undefined) {
    // Allow empty strings for description (for clearing notes)
    updateData.description = req.body.description !== null ? req.body.description : null;
  }
  if (req.body.status !== undefined && req.body.status !== null && req.body.status !== '') {
    updateData.status = req.body.status;
  }
  if (req.body.case_type !== undefined && req.body.case_type !== null && req.body.case_type !== '') {
    updateData.case_type = req.body.case_type;
  }
  if (req.body.quotation_status !== undefined && req.body.quotation_status !== null && req.body.quotation_status !== '') {
    updateData.quotation_status = req.body.quotation_status;
  }
  if (req.body.value !== undefined && req.body.value !== null) {
    updateData.value = typeof req.body.value === 'string' ? parseFloat(req.body.value) : req.body.value;
  }
  if (req.body.probability !== undefined && req.body.probability !== null) {
    updateData.probability = typeof req.body.probability === 'string' ? parseInt(req.body.probability) : req.body.probability;
  }
  if (req.body.expected_close_date !== undefined && req.body.expected_close_date !== null && req.body.expected_close_date !== '') {
    updateData.expected_close_date = req.body.expected_close_date;
  }
  if (req.body.assigned_to !== undefined && req.body.assigned_to !== null && req.body.assigned_to !== '') {
    updateData.assigned_to = typeof req.body.assigned_to === 'string' ? parseInt(req.body.assigned_to) : req.body.assigned_to;
  }
  if (req.body.linked_items !== undefined && req.body.linked_items !== null) {
    updateData.linked_items = Array.isArray(req.body.linked_items) ? req.body.linked_items.map((item: any) => typeof item === 'string' ? parseInt(item) : item) : [];
  }
  if (req.body.assigned_departments !== undefined && req.body.assigned_departments !== null) {
    updateData.assigned_departments = Array.isArray(req.body.assigned_departments) ? req.body.assigned_departments.map((dept: any) => typeof dept === 'string' ? parseInt(dept) : dept) : [];
  }

  // Check if we have any fields to update
  if (Object.keys(updateData).length === 0) {
    throw new ValidationError('No fields provided to update');
  }

  // Ensure ID is converted to string for consistency
  const caseId = String(req.params.id);
  
  console.log('Updating sales case with ID:', caseId);
  console.log('Update data:', JSON.stringify(updateData, null, 2));
  
  const salesCase = await SalesCaseModel.updateSalesCase(caseId, updateData);
  
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
