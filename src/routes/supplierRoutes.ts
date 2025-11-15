import { Router } from 'express';
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierStatus,
  getSupplierStats,
  getAllSupplierStats,
  validateCreateSupplier,
  validateUpdateSupplier,
  validateSupplierId,
  validateStatusUpdate
} from '../controllers/supplierController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete, checkModuleAccess } from '../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all suppliers (with filtering and pagination)
router.get('/', 
  checkModuleAccess('suppliers'),
  requireRead('suppliers'),
  getAllSuppliers
);

// Get all supplier statistics
router.get('/stats',
  checkModuleAccess('suppliers'),
  requireRead('suppliers'),
  getAllSupplierStats
);

// Get single supplier
router.get('/:id',
  validateSupplierId,
  checkModuleAccess('suppliers'),
  requireRead('suppliers'),
  getSupplierById
);

// Get supplier statistics
router.get('/:id/stats',
  validateSupplierId,
  checkModuleAccess('suppliers'),
  requireRead('suppliers'),
  getSupplierStats
);

// Create new supplier
router.post('/',
  validateCreateSupplier,
  checkModuleAccess('suppliers'),
  requireCreate('suppliers'),
  createSupplier
);

// Update supplier
router.put('/:id',
  validateUpdateSupplier,
  checkModuleAccess('suppliers'),
  requireUpdate('suppliers'),
  updateSupplier
);

// Update supplier status
router.patch('/:id/status',
  validateStatusUpdate,
  checkModuleAccess('suppliers'),
  requireUpdate('suppliers'),
  updateSupplierStatus
);

// Delete supplier
router.delete('/:id',
  validateSupplierId,
  checkModuleAccess('suppliers'),
  requireDelete('suppliers'),
  deleteSupplier
);

export default router;
