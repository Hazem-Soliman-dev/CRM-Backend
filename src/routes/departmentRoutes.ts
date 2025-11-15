import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate, requireDelete } from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const departmentValidation = [
  body('name').notEmpty().trim().withMessage('Department name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('manager_id').optional().isUUID().withMessage('Invalid manager ID')
];

// GET /api/v1/departments - Get all departments
router.get('/', requireRead('departments'), getAllDepartments);

// GET /api/v1/departments/:id - Get single department
router.get('/:id', requireRead('departments'), getDepartmentById);

// POST /api/v1/departments - Create new department
router.post('/', requireCreate('departments'), departmentValidation, validate, createDepartment);

// PUT /api/v1/departments/:id - Update department
router.put('/:id', requireUpdate('departments'), departmentValidation, validate, updateDepartment);

// DELETE /api/v1/departments/:id - Delete department
router.delete('/:id', requireDelete('departments'), deleteDepartment);

export default router;

