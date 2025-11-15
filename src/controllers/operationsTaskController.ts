import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { successResponse } from "../utils/response";
import {
  OperationsTaskModel,
  CreateTaskData,
  UpdateTaskData,
} from "../models/operationsTaskModel";

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
    const task = await OperationsTaskModel.findTaskById(req.params.id);
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
      req.params.id,
      updateData
    );
    successResponse(res, task, "Task updated successfully");
  }
);

export const updateOperationsTaskStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body;
    const task = await OperationsTaskModel.updateTaskStatus(
      req.params.id,
      status
    );
    successResponse(res, task, "Task status updated successfully");
  }
);

export const deleteOperationsTask = asyncHandler(
  async (req: Request, res: Response) => {
    await OperationsTaskModel.deleteTask(req.params.id);
    successResponse(res, null, "Task deleted successfully", 204);
  }
);
