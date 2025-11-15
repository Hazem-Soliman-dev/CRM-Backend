import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getOperationsTrips,
  getOperationsTrip,
  createOperationsTrip,
  updateOperationsTrip,
  updateOperationsTripStatus,
  assignOperationsTripStaff,
  deleteOperationsTrip,
  getTripOptionalServices,
  createTripOptionalService,
  updateTripOptionalService,
  deleteTripOptionalService
} from '../controllers/operationsTripController';
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

const tripBaseValidation = [
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Customer count must be a positive integer'),
  body('startDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('endDate must be a valid ISO date'),
  body('destinations')
    .optional({ nullable: true })
    .isArray({ min: 1 })
    .withMessage('destinations must be an array of strings'),
  body('status')
    .optional()
    .isIn(['Planned', 'In Progress', 'Issue', 'Completed'])
    .withMessage('Invalid trip status')
];

const optionalServiceValidation = [
  body('serviceName').notEmpty().withMessage('Service name is required'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be zero or greater'),
  body('addedDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('addedDate must be a valid ISO date'),
  body('status')
    .optional()
    .isIn(['Added', 'Confirmed', 'Cancelled'])
    .withMessage('Invalid optional service status'),
  body('invoiced')
    .optional()
    .isBoolean()
    .withMessage('Invoiced must be a boolean')
];

const staffValidation = [
  body('assignedGuide').notEmpty().withMessage('Guide assignment is required'),
  body('assignedDriver').notEmpty().withMessage('Driver assignment is required'),
  body('transport').notEmpty().withMessage('Transport selection is required'),
  body('transportDetails')
    .optional({ nullable: true })
    .isString()
    .withMessage('Transport details must be a string')
];

router.use(authenticate);

router.get('/', checkModuleAccess('operations'), requireRead('operations'), getOperationsTrips);
router.get(
  '/:id',
  checkModuleAccess('operations'),
  requireRead('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  validate,
  getOperationsTrip
);

router.post(
  '/',
  checkModuleAccess('operations'),
  requireCreate('operations'),
  tripBaseValidation,
  validate,
  createOperationsTrip
);

router.put(
  '/:id',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  tripBaseValidation,
  validate,
  updateOperationsTrip
);

router.patch(
  '/:id/status',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  body('status')
    .isIn(['Planned', 'In Progress', 'Issue', 'Completed'])
    .withMessage('Invalid trip status'),
  validate,
  updateOperationsTripStatus
);

router.patch(
  '/:id/staff',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  staffValidation,
  validate,
  assignOperationsTripStaff
);

router.delete(
  '/:id',
  checkModuleAccess('operations'),
  requireDelete('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  validate,
  deleteOperationsTrip
);

router.get(
  '/:id/services',
  checkModuleAccess('operations'),
  requireRead('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  validate,
  getTripOptionalServices
);

router.post(
  '/:id/services',
  checkModuleAccess('operations'),
  requireCreate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  optionalServiceValidation,
  validate,
  createTripOptionalService
);

router.put(
  '/:id/services/:serviceId',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  param('serviceId').isInt({ min: 1 }).withMessage('Invalid service identifier'),
  optionalServiceValidation,
  validate,
  updateTripOptionalService
);

router.delete(
  '/:id/services/:serviceId',
  checkModuleAccess('operations'),
  requireDelete('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  param('serviceId').isInt({ min: 1 }).withMessage('Invalid service identifier'),
  validate,
  deleteTripOptionalService
);

export default router;



