import { Request, Response } from 'express';
import { PaymentModel, CreatePaymentData, UpdatePaymentData, PaymentFilters } from '../models/paymentModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all payments
export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const {
    payment_status,
    payment_method,
    customer_id,
    booking_id,
    created_by,
    date_from,
    date_to,
    search,
    page = '1',
    limit = '10'
  } = req.query;

  const filters: PaymentFilters = {
    payment_status: payment_status as string,
    payment_method: payment_method as string,
    customer_id: customer_id as string,
    booking_id: booking_id as string,
    created_by: created_by as string,
    date_from: date_from as string,
    date_to: date_to as string,
    search: search as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { payments, total } = await PaymentModel.getAllPayments(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    payments,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get single payment by ID
export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await PaymentModel.findPaymentById(id);
  successResponse(res, payment);
});

// Create new payment
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentData: CreatePaymentData = req.body;
  const newPayment = await PaymentModel.createPayment(paymentData, req.user!.userId);
  successResponse(res, newPayment, 'Payment created successfully', 201);
});

// Update payment
export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdatePaymentData = req.body;
  
  const updatedPayment = await PaymentModel.updatePayment(id, updateData);
  successResponse(res, updatedPayment, 'Payment updated successfully');
});

// Delete payment
export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await PaymentModel.deletePayment(id);
  successResponse(res, null, 'Payment deleted successfully', 204);
});

// Get payment statistics
export const getPaymentStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await PaymentModel.getPaymentStats();
  successResponse(res, stats);
});

// Get customer payments
export const getCustomerPayments = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  
  const filters: PaymentFilters = {
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { payments, total } = await PaymentModel.getCustomerPayments(customerId, filters);

  paginatedResponse(
    res,
    payments,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Update payment status
export const updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  
  if (!['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded'].includes(payment_status)) {
    throw new ValidationError('Invalid payment status');
  }
  
  const updatedPayment = await PaymentModel.updatePayment(id, { payment_status });
  successResponse(res, updatedPayment, 'Payment status updated successfully');
});

// Process refund
export const processRefund = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  
  if (!amount || amount <= 0) {
    throw new ValidationError('Valid refund amount is required');
  }
  
  // Update payment status to refunded
  const updatedPayment = await PaymentModel.updatePayment(id, { 
    payment_status: 'Refunded',
    notes: `Refund processed: ${reason || 'No reason provided'}`
  });
  
  successResponse(res, updatedPayment, 'Refund processed successfully');
});

// Get payment by booking
export const getPaymentsByBooking = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  
  const filters: PaymentFilters = {
    booking_id: bookingId,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { payments, total } = await PaymentModel.getAllPayments(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    payments,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});
