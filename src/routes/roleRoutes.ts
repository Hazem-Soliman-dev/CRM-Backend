import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/roleController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete } from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const roleValidation = [
  body('name').notEmpty().trim().withMessage('Role name is required'),
  body('description').optional().isString().withMessage('Description must be a string')
];

// GET /api/v1/roles - Get all roles
router.get('/', requireRead('roles'), getAllRoles);

// GET /api/v1/roles/:id - Get single role
router.get('/:id', requireRead('roles'), getRoleById);

// POST /api/v1/roles - Create new role
router.post('/', requireCreate('roles'), roleValidation, validate, createRole);

// PUT /api/v1/roles/:id - Update role
router.put('/:id', requireUpdate('roles'), roleValidation, validate, updateRole);

// DELETE /api/v1/roles/:id - Delete role
router.delete('/:id', requireDelete('roles'), deleteRole);

export default router;

