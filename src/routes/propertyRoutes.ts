import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyAvailability,
  updatePropertyAvailability,
  createPropertyAvailability,
  deletePropertyAvailability
} from '../controllers/propertyController';
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

const propertyValidation = [
  body('name').notEmpty().withMessage('Property name is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('type')
    .notEmpty()
    .isIn(['Apartment', 'Villa', 'Commercial', 'Land'])
    .withMessage('Invalid property type'),
  body('status')
    .optional()
    .isIn(['Available', 'Reserved', 'Sold', 'Under Maintenance'])
    .withMessage('Invalid property status'),
  body('nightlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Nightly rate must be positive'),
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be positive'),
  body('occupancy')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Occupancy must be between 0 and 100'),
  body('ownerId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Owner ID must be a positive integer')
];

router.use(authenticate);

router.get('/', checkModuleAccess('properties'), requireRead('properties'), getProperties);
router.get('/:id', checkModuleAccess('properties'), requireRead('properties'), getPropertyById);
router.post(
  '/',
  checkModuleAccess('properties'),
  requireCreate('properties'),
  propertyValidation,
  validate,
  createProperty
);
router.put(
  '/:id',
  checkModuleAccess('properties'),
  requireUpdate('properties'),
  propertyValidation,
  validate,
  updateProperty
);
router.delete('/:id', checkModuleAccess('properties'), requireDelete('properties'), deleteProperty);

// Property Availability Routes
router.get(
  '/:id/availability',
  checkModuleAccess('properties'),
  requireRead('properties'),
  getPropertyAvailability
);

router.put(
  '/:id/availability',
  checkModuleAccess('properties'),
  requireUpdate('properties'),
  body('availability').isArray().withMessage('Availability must be an array'),
  validate,
  updatePropertyAvailability
);

router.post(
  '/:id/availability',
  checkModuleAccess('properties'),
  requireCreate('properties'),
  body('date').isDate().withMessage('Date is required'),
  body('status').isIn(['Available', 'Reserved', 'Unavailable']).withMessage('Invalid status'),
  body('notes').optional(),
  validate,
  createPropertyAvailability
);

router.delete(
  '/:id/availability/:date',
  checkModuleAccess('properties'),
  requireDelete('properties'),
  deletePropertyAvailability
);

export default router;

