import { Request, Response } from 'express';
import { ItemModel, CreateItemData, UpdateItemData, ItemFilters } from '../models/itemModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import { body, param, validationResult } from 'express-validator';

// Validation rules
export const validateCreateItem = [
  body('name').notEmpty().withMessage('Item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional().isString(),
  body('category_id').optional().isInt().withMessage('Category ID must be a valid integer'),
  body('supplier_id').optional().isInt().withMessage('Supplier ID must be a valid integer'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer')
];

export const validateUpdateItem = [
  param('id').isInt().withMessage('Invalid item ID'),
  body('name').optional().notEmpty().withMessage('Item name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional().isString(),
  body('category_id').optional().isInt().withMessage('Category ID must be a valid integer'),
  body('supplier_id').optional().isInt().withMessage('Supplier ID must be a valid integer'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer'),
  body('status').optional().isIn(['Active', 'Inactive', 'Discontinued']).withMessage('Invalid status')
];

export const validateItemId = [
  param('id').isInt().withMessage('Invalid item ID')
];

export const validateStockUpdate = [
  param('id').isInt().withMessage('Invalid item ID'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
];

export const validateStatusUpdate = [
  param('id').isInt().withMessage('Invalid item ID'),
  body('status').isIn(['Active', 'Inactive', 'Discontinued']).withMessage('Invalid status')
];

// Get all items
export const getAllItems = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const filters: ItemFilters = {
    category_id: req.query.category_id as string,
    supplier_id: req.query.supplier_id as string,
    status: req.query.status as string,
    search: req.query.search as string,
    low_stock: req.query.low_stock === 'true',
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const result = await ItemModel.getAllItems(filters);
  
  successResponse(res, {
    items: result.items,
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: result.total,
      totalPages: Math.ceil(result.total / (filters.limit || 10))
    }
  }, 'Items retrieved successfully');
});

// Get single item
export const getItemById = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const item = await ItemModel.findItemById(req.params.id);
  
  successResponse(res, item, 'Item retrieved successfully');
});

// Create new item
export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const itemData: CreateItemData = {
    name: req.body.name,
    description: req.body.description,
    category_id: req.body.category_id,
    supplier_id: req.body.supplier_id,
    price: req.body.price,
    cost: req.body.cost,
    stock_quantity: req.body.stock_quantity,
    min_stock_level: req.body.min_stock_level
  };

  const item = await ItemModel.createItem(itemData);
  
  successResponse(res, item, 'Item created successfully', 201);
});

// Update item
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const updateData: UpdateItemData = {
    name: req.body.name,
    description: req.body.description,
    category_id: req.body.category_id,
    supplier_id: req.body.supplier_id,
    price: req.body.price,
    cost: req.body.cost,
    stock_quantity: req.body.stock_quantity,
    min_stock_level: req.body.min_stock_level,
    status: req.body.status
  };

  const item = await ItemModel.updateItem(req.params.id, updateData);
  
  successResponse(res, item, 'Item updated successfully');
});

// Delete item
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  await ItemModel.deleteItem(req.params.id);
  
  successResponse(res, null, 'Item deleted successfully');
});

// Update item stock
export const updateItemStock = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const item = await ItemModel.updateItemStock(req.params.id, req.body.quantity);
  
  successResponse(res, item, 'Item stock updated successfully');
});

// Update item status
export const updateItemStatus = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors
        .array()
        .map((error: any) => error.msg)
        .join(", ")
    );
  }

  const item = await ItemModel.updateItemStatus(req.params.id, req.body.status);
  
  successResponse(res, item, 'Item status updated successfully');
});

// Get low stock items
export const getLowStockItems = asyncHandler(async (_req: Request, res: Response) => {
  const items = await ItemModel.getLowStockItems();
  
  successResponse(res, items, 'Low stock items retrieved successfully');
});

// Get item statistics
export const getItemStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await ItemModel.getItemStats();
  
  successResponse(res, stats, 'Item statistics retrieved successfully');
});
