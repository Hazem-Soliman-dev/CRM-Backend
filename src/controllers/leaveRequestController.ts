import { Request, Response } from 'express';
import { LeaveRequestModel, LeaveRequestFilters } from '../models/leaveRequestModel';
import { ActivityModel } from '../models/activityModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all leave requests
export const getLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
  const {
    user_id,
    status,
    leave_type,
    start_date,
    end_date,
    page = 1,
    limit = 50
  } = req.query;

  const filters: LeaveRequestFilters = {
    user_id: user_id as string,
    status: status as string,
    leave_type: leave_type as string,
    start_date: start_date as string,
    end_date: end_date as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { requests, total } = await LeaveRequestModel.getLeaveRequests(filters);

  paginatedResponse(res, requests, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50,
    total,
    totalPages: Math.ceil(total / (parseInt(limit as string) || 50))
  });
});

// Get leave request by ID
export const getLeaveRequestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await LeaveRequestModel.getLeaveRequestById(id);
  successResponse(res, request);
});

// Create leave request
export const createLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const {
    leave_type,
    start_date,
    end_date,
    reason
  } = req.body;

  // Validation
  if (!leave_type || !start_date || !end_date) {
    throw new ValidationError('leave_type, start_date, and end_date are required');
  }

  const validLeaveTypes = ['Sick', 'Vacation', 'Personal', 'Emergency', 'Other'];
  if (!validLeaveTypes.includes(leave_type)) {
    throw new ValidationError('Invalid leave_type. Must be: Sick, Vacation, Personal, Emergency, or Other');
  }

  // Use authenticated user's ID
  const userId = req.user!.userId;

  const request = await LeaveRequestModel.createLeaveRequest({
    user_id: userId.toString(),
    leave_type,
    start_date,
    end_date,
    reason
  });

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: request.id,
      activity_type: 'created',
      description: `Leave request created: ${leave_type} from ${start_date} to ${end_date}`,
      performed_by_id: userId
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  successResponse(res, request, 'Leave request created successfully', 201);
});

// Approve leave request
export const approveLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.userId;

  const request = await LeaveRequestModel.approveLeaveRequest(id, approvedBy.toString());

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: request.id,
      activity_type: 'updated',
      description: `Leave request approved: ${request.leave_type} from ${request.start_date} to ${request.end_date}`,
      performed_by_id: approvedBy
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  successResponse(res, request, 'Leave request approved successfully');
});

// Reject leave request
export const rejectLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const approvedBy = req.user!.userId;

  const request = await LeaveRequestModel.rejectLeaveRequest(id, approvedBy.toString(), reason);

  // Log activity
  try {
    await ActivityModel.logActivity({
      entity_type: 'attendance',
      entity_id: request.id,
      activity_type: 'updated',
      description: `Leave request rejected: ${request.leave_type} from ${request.start_date} to ${request.end_date}`,
      performed_by_id: approvedBy
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }

  successResponse(res, request, 'Leave request rejected successfully');
});

