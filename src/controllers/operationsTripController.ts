import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import {
  OperationsTripModel,
  CreateTripData,
  UpdateTripData,
  AssignStaffData,
  CreateOptionalServiceData,
  UpdateOptionalServiceData,
  TripStatus
} from '../models/operationsTripModel';
import { AppError } from '../utils/AppError';

const parseIdParam = (value: string, resource: string): number => {
  const id = Number(value);
  if (Number.isNaN(id) || id <= 0) {
    throw new AppError(`Invalid ${resource} identifier`, 400);
  }
  return id;
};

export const getOperationsTrips = asyncHandler(async (req: Request, res: Response) => {
  const { status, search, startDateFrom, startDateTo } = req.query;
  const trips = await OperationsTripModel.getTrips({
    status: (status as TripStatus | 'All') || undefined,
    search: (search as string) || undefined,
    startDateFrom: (startDateFrom as string) || undefined,
    startDateTo: (startDateTo as string) || undefined
  });

  successResponse(res, trips);
});

export const getOperationsTrip = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'trip');
  const trip = await OperationsTripModel.findTripById(id);
  successResponse(res, trip);
});

export const createOperationsTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripData: CreateTripData = {
    bookingReference: req.body.bookingReference,
    customerName: req.body.customerName,
    customerCount: req.body.customerCount,
    itinerary: req.body.itinerary,
    duration: req.body.duration,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    destinations: req.body.destinations,
    assignedGuide: req.body.assignedGuide,
    assignedDriver: req.body.assignedDriver,
    transport: req.body.transport,
    transportDetails: req.body.transportDetails,
    status: req.body.status,
    specialRequests: req.body.specialRequests,
    notes: req.body.notes
  };

  const trip = await OperationsTripModel.createTrip(tripData);
  successResponse(res, trip, 'Trip created successfully', 201);
});

export const updateOperationsTrip = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'trip');
  const updateData: UpdateTripData = {
    bookingReference: req.body.bookingReference,
    customerName: req.body.customerName,
    customerCount: req.body.customerCount,
    itinerary: req.body.itinerary,
    duration: req.body.duration,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    destinations: req.body.destinations,
    assignedGuide: req.body.assignedGuide,
    assignedDriver: req.body.assignedDriver,
    transport: req.body.transport,
    transportDetails: req.body.transportDetails,
    status: req.body.status,
    specialRequests: req.body.specialRequests,
    notes: req.body.notes
  };

  const trip = await OperationsTripModel.updateTrip(id, updateData);
  successResponse(res, trip, 'Trip updated successfully');
});

export const updateOperationsTripStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'trip');
  const { status } = req.body;
  const trip = await OperationsTripModel.updateTripStatus(id, status);
  successResponse(res, trip, 'Trip status updated successfully');
});

export const assignOperationsTripStaff = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'trip');
  const staffData: AssignStaffData = {
    assignedGuide: req.body.assignedGuide,
    assignedDriver: req.body.assignedDriver,
    transport: req.body.transport,
    transportDetails: req.body.transportDetails
  };

  const trip = await OperationsTripModel.assignStaff(id, staffData);
  successResponse(res, trip, 'Trip staff updated successfully');
});

export const deleteOperationsTrip = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'trip');
  await OperationsTripModel.deleteTrip(id);
  successResponse(res, null, 'Trip deleted successfully', 204);
});

export const getTripOptionalServices = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const services = await OperationsTripModel.getOptionalServices(tripId);
  successResponse(res, services);
});

export const createTripOptionalService = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const serviceData: CreateOptionalServiceData = {
    tripId,
    serviceName: req.body.serviceName,
    category: req.body.category,
    price: req.body.price,
    addedBy: req.body.addedBy,
    addedDate: req.body.addedDate,
    status: req.body.status,
    invoiced: req.body.invoiced
  };

  const service = await OperationsTripModel.createOptionalService(serviceData);
  successResponse(res, service, 'Optional service created successfully', 201);
});

export const updateTripOptionalService = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const serviceId = parseIdParam(req.params.serviceId, 'service');

  const updateData: UpdateOptionalServiceData = {
    serviceName: req.body.serviceName,
    category: req.body.category,
    price: req.body.price,
    addedBy: req.body.addedBy,
    addedDate: req.body.addedDate,
    status: req.body.status,
    invoiced: req.body.invoiced
  };

  const service = await OperationsTripModel.updateOptionalService(tripId, serviceId, updateData);
  successResponse(res, service, 'Optional service updated successfully');
});

export const deleteTripOptionalService = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const serviceId = parseIdParam(req.params.serviceId, 'service');
  await OperationsTripModel.deleteOptionalService(tripId, serviceId);
  successResponse(res, null, 'Optional service deleted successfully', 204);
});


