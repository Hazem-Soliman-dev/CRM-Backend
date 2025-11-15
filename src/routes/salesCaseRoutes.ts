import { Router } from 'express';
import {
  getAllSalesCases,
  getSalesCaseById,
  createSalesCase,
  updateSalesCase,
  deleteSalesCase,
  updateSalesCaseStatus,
  assignSalesCase,
  getSalesCaseStats,
  validateCreateSalesCase,
  validateUpdateSalesCase,
  validateSalesCaseId,
  validateStatusUpdate,
  validateAssignSalesCase
} from '../controllers/salesCaseController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all sales cases (with filtering and pagination)
router.get('/', 
  checkModuleAccess('sales'),
  requireRead('sales'),
  getAllSalesCases
);

// Get sales case statistics
router.get('/stats',
  checkModuleAccess('sales'),
  requireRead('sales'),
  getSalesCaseStats
);

// Get single sales case
router.get('/:id',
  validateSalesCaseId,
  checkModuleAccess('sales'),
  requireRead('sales'),
  getSalesCaseById
);

// Create new sales case
router.post('/',
  validateCreateSalesCase,
  checkModuleAccess('sales'),
  requireCreate('sales'),
  createSalesCase
);

// Update sales case
router.put('/:id',
  validateUpdateSalesCase,
  checkModuleAccess('sales'),
  requireUpdate('sales'),
  updateSalesCase
);

// Update sales case status
router.patch('/:id/status',
  validateStatusUpdate,
  checkModuleAccess('sales'),
  requireUpdate('sales'),
  updateSalesCaseStatus
);

// Assign sales case
router.patch('/:id/assign',
  validateAssignSalesCase,
  checkModuleAccess('sales'),
  requireUpdate('sales'),
  assignSalesCase
);

// Delete sales case
router.delete('/:id',
  validateSalesCaseId,
  checkModuleAccess('sales'),
  requireDelete('sales'),
  deleteSalesCase
);

export default router;
