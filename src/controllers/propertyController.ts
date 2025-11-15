import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  PropertyModel,
  CreatePropertyData,
  UpdatePropertyData,
  CreateAvailabilityData
} from '../models/propertyModel';

export const getProperties = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, ownerId, search } = req.query;
  const properties = await PropertyModel.getProperties({
    status: (status as any) || undefined,
    type: (type as any) || undefined,
    ownerId: (ownerId as string) || undefined,
    search: (search as string) || undefined
  });
  successResponse(res, properties);
});

export const getPropertyById = asyncHandler(async (req: Request, res: Response) => {
  const property = await PropertyModel.findPropertyById(req.params.id);
  successResponse(res, property);
});

export const createProperty = asyncHandler(async (req: Request, res: Response) => {
  const propertyData: CreatePropertyData = {
    name: req.body.name,
    location: req.body.location,
    type: req.body.type,
    status: req.body.status,
    nightlyRate: req.body.nightlyRate,
    capacity: req.body.capacity,
    occupancy: req.body.occupancy,
    description: req.body.description,
    ownerId: req.body.ownerId
  };

  const property = await PropertyModel.createProperty(propertyData);
  successResponse(res, property, 'Property created successfully', 201);
});

export const updateProperty = asyncHandler(async (req: Request, res: Response) => {
  const updateData: UpdatePropertyData = {
    name: req.body.name,
    location: req.body.location,
    type: req.body.type,
    status: req.body.status,
    nightlyRate: req.body.nightlyRate,
    capacity: req.body.capacity,
    occupancy: req.body.occupancy,
    description: req.body.description,
    ownerId: req.body.ownerId
  };

  const property = await PropertyModel.updateProperty(req.params.id, updateData);
  successResponse(res, property, 'Property updated successfully');
});

export const deleteProperty = asyncHandler(async (req: Request, res: Response) => {
  await PropertyModel.deleteProperty(req.params.id);
  successResponse(res, null, 'Property deleted successfully', 204);
});

// Property Availability Controllers
export const getPropertyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const availability = await PropertyModel.getPropertyAvailability(req.params.id);
  successResponse(res, { availability });
});

export const updatePropertyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { availability } = req.body;
  const result = await PropertyModel.updatePropertyAvailability(req.params.id, availability);
  successResponse(res, { availability: result }, 'Property availability updated successfully');
});

export const createPropertyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const availabilityData: CreateAvailabilityData = {
    date: req.body.date,
    status: req.body.status,
    notes: req.body.notes
  };
  const availability = await PropertyModel.createPropertyAvailability(req.params.id, availabilityData);
  successResponse(res, availability, 'Property availability created successfully', 201);
});

export const deletePropertyAvailability = asyncHandler(async (req: Request, res: Response) => {
  await PropertyModel.deletePropertyAvailability(req.params.id, req.params.date);
  successResponse(res, null, 'Property availability deleted successfully', 204);
});

