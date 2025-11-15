import { Request, Response } from 'express';
import { ActivityModel, ActivityFilters } from '../models/activityModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Log activity
export const logActivity = asyncHandler(async (req: Request, res: Response) => {
  const {
    entity_type,
    entity_id,
    activity_type,
    description,
    details
  } = req.body;

  // Validation
  if (!entity_type || !entity_id || !activity_type || !description) {
    throw new ValidationError('entity_type, entity_id, activity_type, and description are required');
  }

  const validEntityTypes = ['customer', 'lead', 'reservation', 'support_ticket', 'user', 'attendance'];
  if (!validEntityTypes.includes(entity_type)) {
    throw new ValidationError('Invalid entity_type');
  }

  const validActivityTypes = ['created', 'updated', 'deleted', 'status_changed', 'assigned', 'commented', 'message_sent'];
  if (!validActivityTypes.includes(activity_type)) {
    throw new ValidationError('Invalid activity_type');
  }

  const activity = await ActivityModel.logActivity({
    entity_type,
    entity_id,
    activity_type,
    description,
    details: details || undefined,
    performed_by_id: req.user!.userId
  });

  successResponse(res, activity, 'Activity logged successfully', 201);
});

// Get activities for entity
export const getActivities = asyncHandler(async (req: Request, res: Response) => {
  const {
    entity_type,
    entity_id,
    page = 1,
    limit = 50
  } = req.query;

  if (!entity_type || !entity_id) {
    throw new ValidationError('entity_type and entity_id query parameters are required');
  }

  const { activities, total } = await ActivityModel.getActivities(
    entity_type as string,
    entity_id as string,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    }
  );

  paginatedResponse(res, activities, {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    total,
    totalPages: Math.ceil(total / parseInt(limit as string))
  });
});

// Get user activities
export const getUserActivities = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const { activities, total } = await ActivityModel.getUserActivities(
    id,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    }
  );

  paginatedResponse(res, activities, {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    total,
    totalPages: Math.ceil(total / parseInt(limit as string))
  });
});

// Get filtered activities
export const getFilteredActivities = asyncHandler(async (req: Request, res: Response) => {
  const {
    entity_type,
    entity_id,
    activity_type,
    performed_by_id,
    date_from,
    date_to,
    page = 1,
    limit = 50
  } = req.query;

  const filters: ActivityFilters = {
    entity_type: entity_type as string,
    entity_id: entity_id as string,
    activity_type: activity_type as string,
    performed_by_id: performed_by_id as string,
    date_from: date_from as string,
    date_to: date_to as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { activities, total } = await ActivityModel.getFilteredActivities(filters);

  paginatedResponse(res, activities, {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    total,
    totalPages: Math.ceil(total / parseInt(limit as string))
  });
});

