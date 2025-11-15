import { Request, Response } from 'express';
import { AttendanceModel, AttendanceFilters } from '../models/attendanceModel';
import { ActivityModel } from '../models/activityModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/AppError';

/**
 * Mark attendance (create or update)
 * POST /api/v1/attendance
 */
export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const {
    employee_id,
    user_id,
    date,
    check_in_time,
    clock_in,
    check_out_time,
    clock_out,
    status,
    remarks,
    notes
  } = req.body;

  // Support both employee_id and user_id for frontend compatibility
  const empId = employee_id || user_id;
  
  // Validation
  if (!empId || !date) {
    throw new ValidationError('employee_id/user_id and date are required');
  }

  // Validate status if provided
  if (status) {
    const validStatuses = ['Present', 'Absent', 'Late', 'Half Day', 'Leave'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status. Must be: Present, Absent, Late, Half Day, or Leave');
    }
  }

  // Build clock_in and clock_out as full timestamps
  let clockIn: string;
  let clockOut: string | undefined;

  if (clock_in) {
    clockIn = new Date(clock_in).toISOString();
  } else if (check_in_time && date) {
    const dateStr = date.toString().split('T')[0];
    clockIn = new Date(`${dateStr}T${check_in_time}`).toISOString();
  } else if (date) {
    const dateStr = date.toString().split('T')[0];
    clockIn = new Date(`${dateStr}T09:00:00`).toISOString(); // Default to 9 AM
  } else {
    clockIn = new Date().toISOString();
  }

  if (clock_out) {
    clockOut = new Date(clock_out).toISOString();
  } else if (check_out_time && date) {
    const dateStr = date.toString().split('T')[0];
    clockOut = new Date(`${dateStr}T${check_out_time}`).toISOString();
  }

  const attendance = await AttendanceModel.markAttendance({
    user_id: empId.toString(),
    clock_in: clockIn,
    clock_out: clockOut,
    status: status || 'Present',
    notes: remarks || notes || undefined
  });

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: attendance.id,
      activity_type: 'created',
      description: `Attendance marked for ${attendance.employee_name || 'employee'}: ${attendance.status}`,
      performed_by_id: req.user!.userId
    });
  } catch (error) {
    // Don't fail the request if activity logging fails
    console.error('Failed to log activity:', error);
  }

  // Map to frontend format
  const mappedAttendance = {
    ...attendance,
    user_id: attendance.user_id,
    clock_in: attendance.clock_in,
    clock_out: attendance.clock_out,
    notes: attendance.notes
  };

  successResponse(res, mappedAttendance, 'Attendance marked successfully', 201);
});

/**
 * Get attendance records with filters
 * GET /api/v1/attendance
 */
export const getAttendanceRecords = asyncHandler(async (req: Request, res: Response) => {
  const {
    employee_id,
    user_id,
    staff_id,
    date_from,
    date_to,
    status,
    page = 1,
    limit = 50
  } = req.query;

  // Support both employee_id and user_id/staff_id for frontend compatibility
  const employeeId = employee_id || user_id || staff_id;

  const filters: AttendanceFilters = {
    user_id: employeeId as string,
    date_from: date_from as string,
    date_to: date_to as string,
    status: status as string,
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50
  };

  const { records, total } = await AttendanceModel.getAttendanceRecords(filters);

  // Map backend format to frontend format
  const mappedRecords = records.map((record: any) => {
    // Extract date from clock_in for display
    const clockInDate = record.clock_in ? new Date(record.clock_in) : null;
    const dateStr = clockInDate ? clockInDate.toISOString().split('T')[0] : '';
    
    // Extract time from clock_in/clock_out for display
    const checkInTime = clockInDate ? clockInDate.toTimeString().slice(0, 8) : undefined;
    const clockOutDate = record.clock_out ? new Date(record.clock_out) : null;
    const checkOutTime = clockOutDate ? clockOutDate.toTimeString().slice(0, 8) : undefined;

    return {
      id: record.id,
      user_id: record.user_id,
      employee_id: record.user_id, // For compatibility
      employee_name: record.employee_name,
      department: record.department || null,
      date: dateStr,
      clock_in: record.clock_in,
      check_in_time: checkInTime,
      clock_out: record.clock_out,
      check_out_time: checkOutTime,
      status: record.status,
      notes: record.notes,
      remarks: record.notes, // For compatibility
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  });

  paginatedResponse(res, mappedRecords, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50,
    total,
    totalPages: Math.ceil(total / (parseInt(limit as string) || 50))
  });
});

/**
 * Get attendance by employee ID
 * GET /api/v1/attendance/employee/:id
 */
export const getEmployeeAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date_from, date_to, page = 1, limit = 50 } = req.query;

  const { records, total } = await AttendanceModel.getAttendanceRecords({
    user_id: id,
    date_from: date_from as string,
    date_to: date_to as string,
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50
  });

  // Map backend format to frontend format
  const mappedRecords = records.map((record: any) => {
    const clockInDate = record.clock_in ? new Date(record.clock_in) : null;
    const dateStr = clockInDate ? clockInDate.toISOString().split('T')[0] : '';
    const checkInTime = clockInDate ? clockInDate.toTimeString().slice(0, 8) : undefined;
    const clockOutDate = record.clock_out ? new Date(record.clock_out) : null;
    const checkOutTime = clockOutDate ? clockOutDate.toTimeString().slice(0, 8) : undefined;

    return {
      id: record.id,
      user_id: record.user_id,
      employee_id: record.user_id,
      employee_name: record.employee_name,
      department: record.department || null,
      date: dateStr,
      clock_in: record.clock_in,
      check_in_time: checkInTime,
      clock_out: record.clock_out,
      check_out_time: checkOutTime,
      status: record.status,
      notes: record.notes,
      remarks: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  });

  paginatedResponse(res, mappedRecords, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50,
    total,
    totalPages: Math.ceil(total / (parseInt(limit as string) || 50))
  });
});

/**
 * Get attendance by date
 * GET /api/v1/attendance/date/:date
 */
export const getAttendanceByDate = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params;

  const { records, total } = await AttendanceModel.getAttendanceRecords({
    date_from: date,
    date_to: date
  });

  // Map backend format to frontend format
  const mappedRecords = records.map((record: any) => {
    const clockInDate = record.clock_in ? new Date(record.clock_in) : null;
    const dateStr = clockInDate ? clockInDate.toISOString().split('T')[0] : '';
    const checkInTime = clockInDate ? clockInDate.toTimeString().slice(0, 8) : undefined;
    const clockOutDate = record.clock_out ? new Date(record.clock_out) : null;
    const checkOutTime = clockOutDate ? clockOutDate.toTimeString().slice(0, 8) : undefined;

    return {
      id: record.id,
      user_id: record.user_id,
      employee_id: record.user_id,
      employee_name: record.employee_name,
      department: record.department || null,
      date: dateStr,
      clock_in: record.clock_in,
      check_in_time: checkInTime,
      clock_out: record.clock_out,
      check_out_time: checkOutTime,
      status: record.status,
      notes: record.notes,
      remarks: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  });

  successResponse(res, {
    date,
    records: mappedRecords,
    total
  });
});

/**
 * Get employee attendance report
 * GET /api/v1/attendance/report/employee/:id
 */
export const getEmployeeReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { month, year } = req.query;

  const report = await AttendanceModel.getEmployeeAttendanceReport(id, {
    month: month as string,
    year: year as string
  });

  successResponse(res, report);
});

/**
 * Get company attendance summary
 * GET /api/v1/attendance/report/company/:date
 */
export const getCompanySummary = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params;

  const summary = await AttendanceModel.getCompanyAttendanceSummary(date);

  successResponse(res, summary);
});

/**
 * Update attendance
 * PUT /api/v1/attendance
 */
export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { employee_id, user_id, date } = req.body;
  const {
    check_in_time,
    clock_in,
    check_out_time,
    clock_out,
    status,
    remarks,
    notes
  } = req.body;

  // Support both employee_id and user_id for frontend compatibility
  const empId = employee_id || user_id;
  
  if (!empId || !date) {
    throw new ValidationError('employee_id/user_id and date are required');
  }

  // Extract time from clock_in/clock_out if provided
  let checkInTime = check_in_time;
  let checkOutTime = check_out_time;
  
  if (clock_in) {
    try {
      const clockInDate = new Date(clock_in);
      checkInTime = clockInDate.toTimeString().slice(0, 8); // HH:MM:SS
    } catch (error) {
      throw new ValidationError('Invalid clock_in format');
    }
  }
  
  if (clock_out) {
    try {
      const clockOutDate = new Date(clock_out);
      checkOutTime = clockOutDate.toTimeString().slice(0, 8); // HH:MM:SS
    } catch (error) {
      throw new ValidationError('Invalid clock_out format');
    }
  }

  // Build clock_in and clock_out as full timestamps
  const dateStr = date.toString().split('T')[0]; // YYYY-MM-DD
  const clockIn = checkInTime ? `${dateStr} ${checkInTime}` : new Date().toISOString();
  const clockOut = checkOutTime ? `${dateStr} ${checkOutTime}` : undefined;

  const attendance = await AttendanceModel.markAttendance({
    user_id: empId.toString(),
    clock_in: clockIn,
    clock_out: clockOut,
    status: status || 'Present',
    notes: remarks || notes || undefined
  });

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: attendance.id,
      activity_type: 'updated',
      description: `Attendance updated for ${attendance.employee_name || 'employee'}`,
      performed_by_id: req.user!.userId
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  // Map to frontend format (already in correct format)
  const mappedAttendance = {
    ...attendance,
    notes: attendance.notes
  };

  successResponse(res, mappedAttendance, 'Attendance updated successfully');
});

/**
 * Clock in - mark attendance for today
 * POST /api/v1/attendance/clock-in
 */
export const clockIn = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  const attendance = await AttendanceModel.markAttendance({
    user_id: req.user!.userId.toString(),
    clock_in: now.toISOString(),
    status: 'Present'
  });

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: attendance.id,
      activity_type: 'created',
      description: `Clocked in at ${now.toLocaleTimeString()}`,
      performed_by_id: req.user!.userId
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  // Map to frontend format
  const mappedAttendance = {
    ...attendance,
    notes: attendance.notes
  };

  successResponse(res, mappedAttendance, 'Clocked in successfully', 201);
});

/**
 * Clock out - update today's attendance
 * POST /api/v1/attendance/clock-out
 */
export const clockOut = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date();

  // Get today's attendance first
  let attendance;
  try {
    attendance = await AttendanceModel.getAttendanceByDate(req.user!.userId.toString(), today);
  } catch (error) {
    throw new ValidationError('No clock-in record found for today. Please clock in first.');
  }

  // Update with clock out time
  attendance = await AttendanceModel.markAttendance({
    user_id: req.user!.userId.toString(),
    clock_in: attendance.clock_in,
    clock_out: now.toISOString(),
    status: attendance.status || 'Present',
    notes: attendance.notes
  });

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: attendance.id,
      activity_type: 'updated',
      description: `Clocked out at ${now.toLocaleTimeString()}`,
      performed_by_id: req.user!.userId
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  // Map to frontend format
  const mappedAttendance = {
    ...attendance,
    notes: attendance.notes
  };

  successResponse(res, mappedAttendance, 'Clocked out successfully');
});

/**
 * Get today's attendance for current user
 * GET /api/v1/attendance/today
 */
export const getTodayAttendance = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const attendance = await AttendanceModel.getAttendanceByDate(req.user!.userId.toString(), today);
    
    // Map to frontend format (already in correct format)
    const mappedAttendance = {
      ...attendance,
      notes: attendance.notes
    };

    successResponse(res, mappedAttendance);
  } catch (error: any) {
    // Return null if no attendance record for today (not an error)
    if (error instanceof NotFoundError) {
      successResponse(res, null);
    } else {
      throw error;
    }
  }
});
