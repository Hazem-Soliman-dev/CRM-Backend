import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import { OwnerModel, CreateOwnerData, UpdateOwnerData } from '../models/ownerModel';

export const getOwners = asyncHandler(async (req: Request, res: Response) => {
  const { status, search } = req.query;
  const owners = await OwnerModel.getOwners({
    status: (status as any) || undefined,
    search: (search as string) || undefined
  });
  successResponse(res, owners);
});

export const getOwnerById = asyncHandler(async (req: Request, res: Response) => {
  const owner = await OwnerModel.findOwnerById(req.params.id);
  successResponse(res, owner);
});

export const createOwner = asyncHandler(async (req: Request, res: Response) => {
  const ownerData: CreateOwnerData = {
    companyName: req.body.companyName,
    primaryContact: req.body.primaryContact,
    email: req.body.email,
    phone: req.body.phone,
    status: req.body.status,
    portfolioSize: req.body.portfolioSize,
    locations: req.body.locations,
    notes: req.body.notes
  };

  const owner = await OwnerModel.createOwner(ownerData);
  successResponse(res, owner, 'Owner created successfully', 201);
});

export const updateOwner = asyncHandler(async (req: Request, res: Response) => {
  const updateData: UpdateOwnerData = {
    companyName: req.body.companyName,
    primaryContact: req.body.primaryContact,
    email: req.body.email,
    phone: req.body.phone,
    status: req.body.status,
    portfolioSize: req.body.portfolioSize,
    locations: req.body.locations,
    notes: req.body.notes
  };

  const owner = await OwnerModel.updateOwner(req.params.id, updateData);
  successResponse(res, owner, 'Owner updated successfully');
});

export const deleteOwner = asyncHandler(async (req: Request, res: Response) => {
  await OwnerModel.deleteOwner(req.params.id);
  successResponse(res, null, 'Owner deleted successfully', 204);
});

export const assignManager = asyncHandler(async (req: Request, res: Response) => {
  const { managerId } = req.body;
  const owner = await OwnerModel.assignManager(req.params.id, managerId || null);
  successResponse(res, owner, 'Manager assigned successfully');
});

