import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  NotificationModel,
  CreateNotificationData
} from '../models/notificationModel';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const notifications = await NotificationModel.getNotificationsForUser(Number(userId));
  successResponse(res, notifications);
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const payload: CreateNotificationData = {
    userId: req.body.userId || null,
    type: req.body.type,
    title: req.body.title,
    message: req.body.message,
    entityType: req.body.entityType,
    entityId: req.body.entityId
  };

  const notification = await NotificationModel.createNotification(payload);
  successResponse(res, notification, 'Notification created successfully', 201);
});

export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.user!.userId);
  const notification = await NotificationModel.markAsRead(req.params.id, userId);
  successResponse(res, notification, 'Notification marked as read');
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.user!.userId);
  await NotificationModel.markAllAsRead(userId);
  successResponse(res, { success: true }, 'Notifications marked as read');
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.user!.userId);
  await NotificationModel.deleteNotification(req.params.id, userId);
  successResponse(res, null, 'Notification deleted successfully', 204);
});

