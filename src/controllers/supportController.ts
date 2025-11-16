import { Request, Response } from 'express';
import { SupportTicketModel, CreateSupportTicketData, UpdateSupportTicketData, SupportTicketFilters } from '../models/supportTicketModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all support tickets
export const getAllTickets = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    priority,
    assigned_to,
    customer_id,
    created_by,
    search,
    page = '1',
    limit = '10'
  } = req.query;

  const filters: SupportTicketFilters = {
    status: status as string,
    priority: priority as string,
    assigned_to: assigned_to as string,
    customer_id: customer_id as string,
    created_by: created_by as string,
    search: search as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  const { tickets, total } = await SupportTicketModel.getAllTickets(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    tickets,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});

// Get single support ticket by ID
export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const ticket = await SupportTicketModel.findTicketById(id);
  successResponse(res, ticket);
});

// Create new support ticket
export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticketData: CreateSupportTicketData = req.body;
  const newTicket = await SupportTicketModel.createTicket(ticketData, req.user!.userId);
  successResponse(res, newTicket, 'Support ticket created successfully', 201);
});

// Update support ticket
export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateSupportTicketData = req.body;
  
  const updatedTicket = await SupportTicketModel.updateTicket(id, updateData);
  successResponse(res, updatedTicket, 'Support ticket updated successfully');
});

// Delete support ticket
export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await SupportTicketModel.deleteTicket(id);
  successResponse(res, null, 'Support ticket deleted successfully', 204);
});

// Get support ticket statistics
export const getTicketStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await SupportTicketModel.getTicketStats();
  successResponse(res, stats);
});

// Add note to support ticket
export const addTicketNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  
  if (!note || note.trim().length === 0) {
    throw new ValidationError('Note is required');
  }
  
  await SupportTicketModel.addTicketNote(id, note, req.user!.userId);
  successResponse(res, null, 'Note added successfully');
});

// Get support ticket notes
export const getTicketNotes = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notes = await SupportTicketModel.getTicketNotes(id);
  successResponse(res, notes);
});

// Update ticket status
export const updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    throw new ValidationError('Invalid status. Must be Open, In Progress, Resolved, or Closed');
  }
  
  const updatedTicket = await SupportTicketModel.updateTicket(id, { status });
  successResponse(res, updatedTicket, 'Ticket status updated successfully');
});

// Assign ticket to user
export const assignTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assigned_to } = req.body;
  
  const updatedTicket = await SupportTicketModel.updateTicket(id, { assigned_to });
  successResponse(res, updatedTicket, 'Ticket assigned successfully');
});

// Get my tickets (for agents/customers)
export const getMyTickets = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  
  const filters: SupportTicketFilters = {
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  };

  // Add role-based filtering
  if (req.user!.role === 'customer') {
    filters.customer_id = req.user!.userId;
  } else if (req.user!.role === 'sales') {
    filters.assigned_to = req.user!.userId;
  }

  const { tickets, total } = await SupportTicketModel.getAllTickets(
    filters,
    req.user!.role,
    req.user!.userId
  );

  paginatedResponse(
    res,
    tickets,
    {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  );
});
