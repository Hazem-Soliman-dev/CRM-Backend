import { Router } from 'express';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateItemStock,
  updateItemStatus,
  getLowStockItems,
  getItemStats,
  validateCreateItem,
  validateUpdateItem,
  validateItemId,
  validateStockUpdate,
  validateStatusUpdate
} from '../controllers/itemController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all items (with filtering and pagination)
router.get('/', 
  checkModuleAccess('items'),
  requireRead('items'),
  getAllItems
);

// Get low stock items
router.get('/low-stock',
  checkModuleAccess('items'),
  requireRead('items'),
  getLowStockItems
);

// Get item statistics
router.get('/stats',
  checkModuleAccess('items'),
  requireRead('items'),
  getItemStats
);

// Get single item
router.get('/:id',
  validateItemId,
  checkModuleAccess('items'),
  requireRead('items'),
  getItemById
);

// Create new item
router.post('/',
  validateCreateItem,
  checkModuleAccess('items'),
  requireCreate('items'),
  createItem
);

// Update item
router.put('/:id',
  validateUpdateItem,
  checkModuleAccess('items'),
  requireUpdate('items'),
  updateItem
);

// Update item stock
router.patch('/:id/stock',
  validateStockUpdate,
  checkModuleAccess('items'),
  requireUpdate('items'),
  updateItemStock
);

// Update item status
router.patch('/:id/status',
  validateStatusUpdate,
  checkModuleAccess('items'),
  requireUpdate('items'),
  updateItemStatus
);

// Delete item
router.delete('/:id',
  validateItemId,
  checkModuleAccess('items'),
  requireDelete('items'),
  deleteItem
);

export default router;
