import { Request, Response } from 'express';
import { InvoiceModel, CreateInvoiceData, UpdateInvoiceData, InvoiceFilters } from '../models/invoiceModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
// import { ValidationError } from '../utils/AppError';

// Get all invoices
export const getAllInvoices = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    customer_id,
    booking_id,
    created_by,
    date_from,
    date_to,
    search,
    page = '1',
    limit = '10'
  } = req.query;

  const filters: InvoiceFilters = {
    status: status as string,
    customer_id: customer_id as string,
    booking_id: booking_id as string,
    created_by: created_by as string,
    date_from: date_from as string,
    date_to: date_to as string,
    search: search as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { invoices, total } = await InvoiceModel.getAllInvoices(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    invoices,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get single invoice by ID
export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await InvoiceModel.findInvoiceById(id);
  successResponse(res, invoice);
});

// Create new invoice
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoiceData: CreateInvoiceData = req.body;
  const newInvoice = await InvoiceModel.createInvoice(invoiceData, req.user!.userId);
  successResponse(res, newInvoice, 'Invoice created successfully', 201);
});

// Update invoice
export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateInvoiceData = req.body;
  
  const updatedInvoice = await InvoiceModel.updateInvoice(id, updateData);
  successResponse(res, updatedInvoice, 'Invoice updated successfully');
});

// Delete invoice
export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await InvoiceModel.deleteInvoice(id);
  successResponse(res, null, 'Invoice deleted successfully', 204);
});

// Get invoices by booking
export const getInvoicesByBooking = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  
  const filters: InvoiceFilters = {
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { invoices, total } = await InvoiceModel.getInvoicesByBooking(bookingId, filters);

  paginatedResponse(
    res,
    invoices,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

