import { Request, Response } from 'express';
import { ReservationModel, CreateReservationData, UpdateReservationData, ReservationFilters } from '../models/reservationModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, AppError } from '../utils/AppError';
import getDatabase from '../config/database';

// Get all reservations
export const getAllReservations = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    payment_status,
    service_type,
    supplier_id,
    customer_id,
    created_by,
    date_from,
    date_to,
    search,
    page = '1',
    limit = '10'
  } = req.query;

  const filters: ReservationFilters = {
    status: status as string,
    payment_status: payment_status as string,
    service_type: service_type as string,
    supplier_id: supplier_id as string,
    customer_id: customer_id as string,
    created_by: created_by as string,
    date_from: date_from as string,
    date_to: date_to as string,
    search: search as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { reservations, total } = await ReservationModel.getAllReservations(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    reservations,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get single reservation by ID
export const getReservationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const reservation = await ReservationModel.findReservationById(id);
  successResponse(res, reservation);
});

// Create new reservation
export const createReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservationData: CreateReservationData = req.body;
  const newReservation = await ReservationModel.createReservation(reservationData, req.user!.userId);
  successResponse(res, newReservation, 'Reservation created successfully', 201);
});

// Update reservation
export const updateReservation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateReservationData = req.body;
  
  const updatedReservation = await ReservationModel.updateReservation(id, updateData);
  successResponse(res, updatedReservation, 'Reservation updated successfully');
});

// Delete reservation
export const deleteReservation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ReservationModel.deleteReservation(id);
  successResponse(res, null, 'Reservation deleted successfully', 204);
});

// Get today's schedule
export const getTodaySchedule = asyncHandler(async (_req: Request, res: Response) => {
  const schedule = await ReservationModel.getTodaySchedule();
  successResponse(res, schedule);
});

// Update reservation status
export const updateReservationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) {
    throw new ValidationError('Invalid status. Must be Pending, Confirmed, Cancelled, or Completed');
  }
  
  const updatedReservation = await ReservationModel.updateReservation(id, { status });
  successResponse(res, updatedReservation, 'Reservation status updated successfully');
});

// Update payment status
export const updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  
  if (!['Pending', 'Partial', 'Paid', 'Refunded'].includes(payment_status)) {
    throw new ValidationError('Invalid payment status. Must be Pending, Partial, Paid, or Refunded');
  }
  
  const updatedReservation = await ReservationModel.updateReservation(id, { payment_status });
  successResponse(res, updatedReservation, 'Payment status updated successfully');
});

// Get customer reservations
export const getCustomerReservations = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  
  const filters: ReservationFilters = {
    customer_id: customerId,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { reservations, total } = await ReservationModel.getAllReservations(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    reservations,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get reservation statistics
export const getReservationStats = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as totalReservations,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingReservations,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmedReservations,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledReservations,
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(AVG(total_amount), 0) as averageReservationValue,
        SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as paidReservations,
        SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as unpaidReservations
      FROM reservations
    `;
    
    const db = getDatabase();
    const stats = db.prepare(query).get() as any;
    
    successResponse(res, {
      totalReservations: stats.totalReservations || 0,
      pendingReservations: stats.pendingReservations || 0,
      confirmedReservations: stats.confirmedReservations || 0,
      cancelledReservations: stats.cancelledReservations || 0,
      totalRevenue: stats.totalRevenue || 0,
      averageReservationValue: stats.averageReservationValue || 0,
      paidReservations: stats.paidReservations || 0,
      unpaidReservations: stats.unpaidReservations || 0
    });
  } catch (error) {
    throw new AppError('Failed to calculate reservation statistics', 500);
  }
});
