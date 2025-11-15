import { Request, Response } from 'express';
import { CustomerModel, CreateCustomerData, UpdateCustomerData, CustomerFilters } from '../models/customerModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';
import getDatabase from '../config/database';

// Get all customers
export const getAllCustomers = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    type,
    assigned_staff_id,
    search,
    page = '1',
    limit = '10'
  } = req.query;

  const filters: CustomerFilters = {
    status: status as string,
    type: type as string,
    assigned_staff_id: assigned_staff_id as string,
    search: search as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { customers, total } = await CustomerModel.getAllCustomers(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    customers,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get single customer by ID
export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await CustomerModel.findCustomerById(id);
  successResponse(res, customer);
});

// Create new customer
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customerData: CreateCustomerData = req.body;
  const newCustomer = await CustomerModel.createCustomer(customerData);
  successResponse(res, newCustomer, 'Customer created successfully', 201);
});

// Update customer
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateCustomerData = req.body;
  
  const updatedCustomer = await CustomerModel.updateCustomer(id, updateData);
  successResponse(res, updatedCustomer, 'Customer updated successfully');
});

// Delete customer
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await CustomerModel.deleteCustomer(id);
  successResponse(res, null, 'Customer deleted successfully', 204);
});

// Get customer statistics
export const getCustomerStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const stats = await CustomerModel.getCustomerStats(id);
  successResponse(res, stats);
});

// Get customer bookings
export const getCustomerBookings = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = '1', limit = '10' } = req.query;

  // Query bookings/reservations for customer
  const countQuery = `
    SELECT COUNT(*) as total
    FROM reservations
    WHERE customer_id = ?
  `;
  const db = getDatabase();
  const countResult = db.prepare(countQuery).get(id) as any;
  const total = countResult.total;

  const query = `
    SELECT r.*, 
           c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
           s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email,
           u.full_name as created_by_name, u.email as created_by_email
    FROM reservations r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN suppliers s ON r.supplier_id = s.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.customer_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  const rows = db.prepare(query).all(id, limitNum, offset) as any[];

  paginatedResponse(res, rows, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum)
  });
});

// Get customer payments
export const getCustomerPayments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = '1', limit = '10' } = req.query;

  // Query payments for customer
  const countQuery = `
    SELECT COUNT(*) as total
    FROM payments p
    WHERE p.customer_id = ?
  `;
  const db = getDatabase();
  const countResult = db.prepare(countQuery).get(id) as any;
  const total = countResult.total;

  const query = `
    SELECT p.*, 
           c.name as customer_name, c.email as customer_email,
           r.destination, r.status as reservation_status,
           u.full_name as processed_by_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN reservations r ON p.booking_id = r.id
    LEFT JOIN users u ON p.processed_by = u.id
    WHERE p.customer_id = ?
    ORDER BY p.payment_date DESC
    LIMIT ? OFFSET ?
  `;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  const rows = db.prepare(query).all(id, limitNum, offset) as any[];

  paginatedResponse(res, rows, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum)
  });
});

// Update customer status
export const updateCustomerStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
    throw new ValidationError('Invalid status. Must be Active, Inactive, or Suspended');
  }
  
  const updatedCustomer = await CustomerModel.updateCustomer(id, { status });
  successResponse(res, updatedCustomer, 'Customer status updated successfully');
});

// Assign customer to staff
export const assignCustomerToStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assigned_staff_id } = req.body;
  
  const updatedCustomer = await CustomerModel.updateCustomer(id, { assigned_staff_id });
  successResponse(res, updatedCustomer, 'Customer assigned to staff successfully');
});
