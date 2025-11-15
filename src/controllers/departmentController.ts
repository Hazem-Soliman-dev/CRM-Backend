import { Request, Response } from 'express';
import { DepartmentModel, CreateDepartmentData, UpdateDepartmentData } from '../models/departmentModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all departments
export const getAllDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await DepartmentModel.getAllDepartments();
  successResponse(res, departments);
});

// Get single department by ID
export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const department = await DepartmentModel.getDepartmentById(id);
  successResponse(res, department);
});

// Create new department
export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, manager_id } = req.body;

  if (!name || name.trim().length === 0) {
    throw new ValidationError('Department name is required');
  }

  const departmentData: CreateDepartmentData = {
    name,
    description,
    manager_id
  };

  const department = await DepartmentModel.createDepartment(departmentData);
  successResponse(res, department, 'Department created successfully', 201);
});

// Update department
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, manager_id } = req.body;

  if (name && name.trim().length === 0) {
    throw new ValidationError('Department name cannot be empty');
  }

  const updateData: UpdateDepartmentData = {
    name,
    description,
    manager_id
  };

  const department = await DepartmentModel.updateDepartment(id, updateData);
  successResponse(res, department, 'Department updated successfully');
});

// Delete department
export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await DepartmentModel.deleteDepartment(id);
  successResponse(res, null, 'Department deleted successfully', 204);
});

