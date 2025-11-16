import { Request, Response } from 'express';
import { CategoryModel, CreateCategoryData, UpdateCategoryData, CategoryFilters } from '../models/categoryModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import { body, param, validationResult } from 'express-validator';

// Validation rules
export const validateCreateCategory = [
  body('name').notEmpty().withMessage('Category name is required'),
  body('description').optional().isString(),
  body('parent_id').optional().isInt().withMessage('Parent ID must be a valid integer')
];

export const validateUpdateCategory = [
  param('id').isInt().withMessage('Invalid category ID'),
  body('name').optional().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().isString(),
  body('parent_id').optional().isInt().withMessage('Parent ID must be a valid integer')
];

export const validateCategoryId = [
  param('id').isInt().withMessage('Invalid category ID')
];

// Get all categories
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const filters: CategoryFilters = {
    parent_id: req.query.parent_id as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const result = await CategoryModel.getAllCategories(filters);
  
  successResponse(res, {
    categories: result.categories,
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: result.total,
      totalPages: Math.ceil(result.total / (filters.limit || 10))
    }
  }, 'Categories retrieved successfully');
});

// Get category tree
export const getCategoryTree = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await CategoryModel.getCategoryTree();
  
  successResponse(res, categories, 'Category tree retrieved successfully');
});

// Get single category
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const category = await CategoryModel.findCategoryById(req.params.id);
  
  successResponse(res, category, 'Category retrieved successfully');
});

// Create new category
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const categoryData: CreateCategoryData = {
    name: req.body.name,
    description: req.body.description,
    parent_id: req.body.parent_id
  };

  const category = await CategoryModel.createCategory(categoryData);
  
  successResponse(res, category, 'Category created successfully', 201);
});

// Update category
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const updateData: UpdateCategoryData = {
    name: req.body.name,
    description: req.body.description,
    parent_id: req.body.parent_id
  };

  const category = await CategoryModel.updateCategory(req.params.id, updateData);
  
  successResponse(res, category, 'Category updated successfully');
});

// Delete category
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  await CategoryModel.deleteCategory(req.params.id);
  
  successResponse(res, null, 'Category deleted successfully');
});

// Get category statistics
export const getCategoryStats = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const stats = await CategoryModel.getCategoryStats(req.params.id);
  
  successResponse(res, stats, 'Category statistics retrieved successfully');
});
