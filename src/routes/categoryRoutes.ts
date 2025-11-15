import { Router } from 'express';
import {
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryId
} from '../controllers/categoryController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all categories (with filtering and pagination)
router.get('/', 
  checkModuleAccess('categories'),
  requireRead('categories'),
  getAllCategories
);

// Get category tree (hierarchical structure)
router.get('/tree',
  checkModuleAccess('categories'),
  requireRead('categories'),
  getCategoryTree
);

// Get single category
router.get('/:id',
  validateCategoryId,
  checkModuleAccess('categories'),
  requireRead('categories'),
  getCategoryById
);

// Get category statistics
router.get('/:id/stats',
  validateCategoryId,
  checkModuleAccess('categories'),
  requireRead('categories'),
  getCategoryStats
);

// Create new category
router.post('/',
  validateCreateCategory,
  checkModuleAccess('categories'),
  requireCreate('categories'),
  createCategory
);

// Update category
router.put('/:id',
  validateUpdateCategory,
  checkModuleAccess('categories'),
  requireUpdate('categories'),
  updateCategory
);

// Delete category
router.delete('/:id',
  validateCategoryId,
  checkModuleAccess('categories'),
  requireDelete('categories'),
  deleteCategory
);

export default router;
