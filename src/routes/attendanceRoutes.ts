import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import {
  markAttendance,
  getAttendanceRecords,
  getEmployeeAttendance,
  getAttendanceByDate,
  getEmployeeReport,
  getCompanySummary,
  updateAttendance,
  clockIn,
  clockOut,
  getTodayAttendance
} from '../controllers/attendanceController';
import {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest
} from '../controllers/leaveRequestController';
import { authenticate } from '../middleware/auth';
import { requireRead, requireCreate, requireUpdate } from '../middleware/permission';
import { validate } from '../middleware/validate';

const router = Router();

// Allow employees (non-customers) to self-service clock in/out even without full create permission
const allowEmployeeSelfService = (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role?.toLowerCase?.() || '';
    // Auth middleware already required above; just gate customers
    if (role && role !== 'customer') {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access denied. Employees only.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Permission check failed.',
    });
  }
};

// All routes require authentication
router.use(authenticate);

// Validation rules for attendance
const markAttendanceValidation = [
  body('employee_id').optional().isInt().withMessage('employee_id must be an integer'),
  body('user_id').optional().isInt().withMessage('user_id must be an integer'),
  body('date').custom((value) => {
    if (!value) return false;
    // Accept both ISO8601 format and YYYY-MM-DD format
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return iso8601Regex.test(value) || dateRegex.test(value);
  }).withMessage('date must be in ISO8601 or YYYY-MM-DD format'),
  body('status').optional().isIn(['Present', 'Absent', 'Late', 'Half Day', 'Leave']).withMessage('Invalid status'),
  body('check_in_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('check_in_time must be in HH:MM:SS format'),
  body('clock_in').optional().isISO8601().withMessage('clock_in must be in ISO8601 format'),
  body('check_out_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('check_out_time must be in HH:MM:SS format'),
  body('clock_out').optional().isISO8601().withMessage('clock_out must be in ISO8601 format'),
  body('remarks').optional().isString().trim().withMessage('remarks must be a string'),
  body('notes').optional().isString().trim().withMessage('notes must be a string')
];

// Validation for leave requests
const createLeaveRequestValidation = [
  body('leave_type').isIn(['Sick', 'Vacation', 'Personal', 'Emergency', 'Other']).withMessage('Invalid leave_type'),
  body('start_date').custom((value) => {
    if (!value) return false;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return iso8601Regex.test(value) || dateRegex.test(value);
  }).withMessage('start_date must be in ISO8601 or YYYY-MM-DD format'),
  body('end_date').custom((value) => {
    if (!value) return false;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return iso8601Regex.test(value) || dateRegex.test(value);
  }).withMessage('end_date must be in ISO8601 or YYYY-MM-DD format'),
  body('reason').optional().isString().trim().withMessage('reason must be a string')
];

// Attendance Routes
// GET /api/v1/attendance - Get all attendance records
router.get('/', requireRead('attendance'), getAttendanceRecords);

// POST /api/v1/attendance - Mark attendance
router.post('/', requireCreate('attendance'), markAttendanceValidation, validate, markAttendance);

// POST /api/v1/attendance/clock-in - Clock in for today
router.post('/clock-in', allowEmployeeSelfService, clockIn);

// POST /api/v1/attendance/clock-out - Clock out for today
router.post('/clock-out', allowEmployeeSelfService, clockOut);

// GET /api/v1/attendance/today - Get today's attendance for current user
router.get('/today', requireRead('attendance'), getTodayAttendance);

// GET /api/v1/attendance/employee/:id - Get employee attendance
router.get('/employee/:id', requireRead('attendance'), getEmployeeAttendance);

// GET /api/v1/attendance/date/:date - Get attendance by date
router.get('/date/:date', requireRead('attendance'), getAttendanceByDate);

// GET /api/v1/attendance/report/employee/:id - Get employee report
router.get('/report/employee/:id', requireRead('attendance'), getEmployeeReport);

// GET /api/v1/attendance/report/company/:date - Get company summary
router.get('/report/company/:date', requireRead('attendance'), getCompanySummary);

// PUT /api/v1/attendance - Update attendance
router.put('/', requireUpdate('attendance'), markAttendanceValidation, validate, updateAttendance);

// Leave Request Routes
// GET /api/v1/attendance/leave-requests - Get all leave requests
router.get('/leave-requests', requireRead('attendance'), getLeaveRequests);

// GET /api/v1/attendance/leave-requests/:id - Get leave request by ID
router.get('/leave-requests/:id', requireRead('attendance'), getLeaveRequestById);

// POST /api/v1/attendance/leave-requests - Create leave request
router.post('/leave-requests', requireCreate('attendance'), createLeaveRequestValidation, validate, createLeaveRequest);

// PATCH /api/v1/attendance/leave-requests/:id/approve - Approve leave request
router.patch('/leave-requests/:id/approve', requireUpdate('attendance'), approveLeaveRequest);

// PATCH /api/v1/attendance/leave-requests/:id/reject - Reject leave request
router.patch('/leave-requests/:id/reject', requireUpdate('attendance'), rejectLeaveRequest);

export default router;
