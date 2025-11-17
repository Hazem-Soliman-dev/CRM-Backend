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
import {
  getTripNotes,
  getTripNoteById,
  createTripNote,
  updateTripNote,
  deleteTripNote
} from '../controllers/operationsTripNoteController';
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
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Array.isArray(value)) return false;
      // Allow empty arrays
      return value.every(item => typeof item === 'string');
    })
    .withMessage('destinations must be an array of strings'),
  body('status')
    .optional()
    .isIn(['Planned', 'In Progress', 'Issue', 'Completed'])
    .withMessage('Invalid trip status')
];

const tripUpdateValidation = [
  body('customerName')
    .optional()
    .notEmpty()
    .withMessage('Customer name cannot be empty if provided'),
  body('customerCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Customer count must be a positive integer'),
  body('startDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      // Accept both ISO8601 full format and YYYY-MM-DD format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return iso8601Regex.test(value);
    })
    .withMessage('startDate must be a valid date (YYYY-MM-DD or ISO8601 format)'),
  body('endDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      // Accept both ISO8601 full format and YYYY-MM-DD format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return iso8601Regex.test(value);
    })
    .withMessage('endDate must be a valid date (YYYY-MM-DD or ISO8601 format)'),
  body('destinations')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Array.isArray(value)) return false;
      // Allow empty arrays
      return value.every(item => typeof item === 'string');
    })
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
    .custom((value) => {
      if (!value) return true;
      // Accept both ISO8601 full format and YYYY-MM-DD format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return iso8601Regex.test(value);
    })
    .withMessage('addedDate must be a valid date (YYYY-MM-DD or ISO8601 format)'),
  body('status')
    .optional()
    .isIn(['Added', 'Confirmed', 'Cancelled'])
    .withMessage('Invalid optional service status'),
  body('invoiced')
    .optional()
    .isBoolean()
    .withMessage('Invoiced must be a boolean')
];

const optionalServiceUpdateValidation = [
  body('serviceName')
    .optional()
    .notEmpty()
    .withMessage('Service name cannot be empty if provided'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be zero or greater'),
  body('addedDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value) return true;
      // Accept both ISO8601 full format and YYYY-MM-DD format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return iso8601Regex.test(value);
    })
    .withMessage('addedDate must be a valid date (YYYY-MM-DD or ISO8601 format)'),
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
  tripUpdateValidation,
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
  optionalServiceUpdateValidation,
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

// Trip Notes Routes (must come before /:id route to avoid route conflicts)
router.get(
  '/notes/:id',
  checkModuleAccess('operations'),
  requireRead('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid note identifier'),
  validate,
  getTripNoteById
);

router.put(
  '/notes/:id',
  checkModuleAccess('operations'),
  requireUpdate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid note identifier'),
  body('note').optional().notEmpty().trim().withMessage('Note content cannot be empty'),
  body('note_type')
    .optional()
    .isIn(['internal', 'interdepartmental'])
    .withMessage('Invalid note type'),
  validate,
  updateTripNote
);

router.delete(
  '/notes/:id',
  checkModuleAccess('operations'),
  requireDelete('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid note identifier'),
  validate,
  deleteTripNote
);

// Trip Notes Routes
router.get(
  '/:id/notes',
  checkModuleAccess('operations'),
  requireRead('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  validate,
  getTripNotes
);

router.post(
  '/:id/notes',
  checkModuleAccess('operations'),
  requireCreate('operations'),
  param('id').isInt({ min: 1 }).withMessage('Invalid trip identifier'),
  body('note').notEmpty().trim().withMessage('Note content is required'),
  body('note_type')
    .optional()
    .isIn(['internal', 'interdepartmental'])
    .withMessage('Invalid note type'),
  validate,
  createTripNote
);

export default router;



