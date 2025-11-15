import { Request, Response } from 'express';
import { RoleModel, CreateRoleData, UpdateRoleData } from '../models/roleModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all roles
export const getAllRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await RoleModel.getAllRoles();
  successResponse(res, roles);
});

// Get single role by ID
export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = await RoleModel.getRoleById(id);
  successResponse(res, role);
});

// Create new role
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || name.trim().length === 0) {
    throw new ValidationError('Role name is required');
  }

  const roleData: CreateRoleData = {
    name,
    description
  };

  const role = await RoleModel.createRole(roleData);
  successResponse(res, role, 'Role created successfully', 201);
});

// Update role
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (name && name.trim().length === 0) {
    throw new ValidationError('Role name cannot be empty');
  }

  const updateData: UpdateRoleData = {
    name,
    description
  };

  const role = await RoleModel.updateRole(id, updateData);
  successResponse(res, role, 'Role updated successfully');
});

// Delete role
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RoleModel.deleteRole(id);
  successResponse(res, null, 'Role deleted successfully', 204);
});

