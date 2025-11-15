import { Router } from 'express';
import { body } from 'express-validator';
import {
  getOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  deleteOwner,
  assignManager
} from '../controllers/ownerController';
import { authenticate } from '../middleware/auth';
import {
  checkModuleAccess,
  requireRead,
  requireCreate,
  requireUpdate,
  requireDelete
} from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

const ownerValidation = [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email must be valid'),
  body('phone')
    .optional({ nullable: true })
    .matches(/^[\d+\-\s()]+$/)
    .withMessage('Phone number is invalid'),
  body('status')
    .optional()
    .isIn(['Active', 'Onboarding', 'Dormant'])
    .withMessage('Invalid status'),
  body('portfolioSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Portfolio size must be a positive integer'),
  body('locations')
    .optional()
    .isArray()
    .withMessage('Locations must be an array of strings')
];

router.use(authenticate);

router.get('/', checkModuleAccess('owners'), requireRead('owners'), getOwners);
router.get('/:id', checkModuleAccess('owners'), requireRead('owners'), getOwnerById);
router.post(
  '/',
  checkModuleAccess('owners'),
  requireCreate('owners'),
  ownerValidation,
  validate,
  createOwner
);
router.put(
  '/:id',
  checkModuleAccess('owners'),
  requireUpdate('owners'),
  ownerValidation,
  validate,
  updateOwner
);
router.delete('/:id', checkModuleAccess('owners'), requireDelete('owners'), deleteOwner);
router.post(
  '/:id/assign-manager',
  checkModuleAccess('owners'),
  requireUpdate('owners'),
  body('managerId').optional({ nullable: true }).isString().withMessage('Manager ID must be a string'),
  validate,
  assignManager
);

export default router;

