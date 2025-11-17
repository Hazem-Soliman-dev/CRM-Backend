import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { successResponse } from "../utils/response";
import {
  OperationsTaskModel,
  CreateTaskData,
  UpdateTaskData,
} from "../models/operationsTaskModel";
import { AppError } from "../utils/AppError";

const parseIdParam = (value: string, resource: string): number => {
  const id = Number(value);
  if (Number.isNaN(id) || id <= 0) {
    throw new AppError(`Invalid ${resource} identifier`, 400);
  }
  return id;
};

export const getOperationsTasks = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, priority, assignedTo, dateFrom, dateTo, tripId } =
      req.query;
    const tasks = await OperationsTaskModel.getTasks({
      status: (status as any) || undefined,
      priority: (priority as any) || undefined,
      assignedTo: assignedTo ? Number(assignedTo) : undefined,
      dateFrom: (dateFrom as string) || undefined,
      dateTo: (dateTo as string) || undefined,
      tripId: tripId ? Number(tripId) : undefined,
    });

    successResponse(res, tasks);
  }
);

export const getOperationsTaskById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, "task");
    const task = await OperationsTaskModel.findTaskById(id.toString());
    successResponse(res, task);
  }
);

export const createOperationsTask = asyncHandler(
  async (req: Request, res: Response) => {
    const taskData: CreateTaskData = {
      title: req.body.title,
      tripId: req.body.tripId,
      tripReference: req.body.tripReference,
      customerName: req.body.customerName,
      scheduledAt: req.body.scheduledAt,
      location: req.body.location,
      assignedTo: req.body.assignedTo,
      status: req.body.status,
      priority: req.body.priority,
      taskType: req.body.taskType,
      notes: req.body.notes,
    };

    const task = await OperationsTaskModel.createTask(taskData);
    successResponse(res, task, "Task created successfully", 201);
  }
);

export const updateOperationsTask = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, "task");
    const updateData: UpdateTaskData = {
      title: req.body.title,
      tripId: req.body.tripId,
      tripReference: req.body.tripReference,
      customerName: req.body.customerName,
      scheduledAt: req.body.scheduledAt,
      location: req.body.location,
      assignedTo: req.body.assignedTo,
      status: req.body.status,
      priority: req.body.priority,
      taskType: req.body.taskType,
      notes: req.body.notes,
    };

    const task = await OperationsTaskModel.updateTask(
      id.toString(),
      updateData
    );
    successResponse(res, task, "Task updated successfully");
  }
);

export const updateOperationsTaskStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, "task");
    const { status } = req.body;
    const task = await OperationsTaskModel.updateTaskStatus(
      id.toString(),
      status
    );
    successResponse(res, task, "Task status updated successfully");
  }
);

export const deleteOperationsTask = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseIdParam(req.params.id, "task");
    await OperationsTaskModel.deleteTask(id.toString());
    successResponse(res, null, "Task deleted successfully", 204);
  }
);
