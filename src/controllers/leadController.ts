import { Request, Response } from 'express';
import { LeadModel, LeadFilters } from '../models/leadModel';
import { successResponse, paginatedResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/AppError';

// Get all leads
export const getAllLeads = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    source,
    type,
    agent_id,
    search,
    page = 1,
    limit = 10
  } = req.query;

  const filters: LeadFilters = {
    status: status as string,
    source: source as string,
    type: type as string,
    agent_id: agent_id as string,
    search: search as string,
    page: Number(page),
    limit: Number(limit)
  };

  const { leads, total } = await LeadModel.getAllLeads(
    filters,
    req.user!.role,
    req.user!.userId
  );

  const totalPages = Math.ceil(total / Number(limit));

  paginatedResponse(res, leads, {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages
  }, 'Leads retrieved successfully');
});

// Get single lead
export const getLeadById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = await LeadModel.findLeadById(id);
  successResponse(res, lead, 'Lead retrieved successfully');
});

// Create new lead
export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    company,
    source,
    type,
    agent_id,
    value,
    notes,
    next_followup
  } = req.body;

  // Validation
  if (!name || !email || !phone || !source || !type) {
    throw new ValidationError('Name, email, phone, source, and type are required');
  }

  const validSources = ['Website', 'Social Media', 'Email', 'Walk-in', 'Referral'];
  if (!validSources.includes(source)) {
    throw new ValidationError('Invalid source. Must be one of: Website, Social Media, Email, Walk-in, Referral');
  }

  const validTypes = ['B2B', 'B2C'];
  if (!validTypes.includes(type)) {
    throw new ValidationError('Invalid type. Must be B2B or B2C');
  }

  // If no agent_id provided, assign to current user if they are an agent/sales
  const assignedAgentId = agent_id || (req.user!.role === 'agent' || req.user!.role === 'sales' ? req.user!.userId : undefined);

  const lead = await LeadModel.createLead({
    name,
    email,
    phone,
    company,
    source,
    type,
    agent_id: assignedAgentId,
    value,
    notes,
    next_followup
  });

  successResponse(res, lead, 'Lead created successfully', 201);
});

// Update lead
export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validation for status updates
  if (updateData.status) {
    const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    if (!validStatuses.includes(updateData.status)) {
      throw new ValidationError('Invalid status');
    }
  }

  // Validation for source updates
  if (updateData.source) {
    const validSources = ['Website', 'Social Media', 'Email', 'Walk-in', 'Referral'];
    if (!validSources.includes(updateData.source)) {
      throw new ValidationError('Invalid source');
    }
  }

  // Validation for type updates
  if (updateData.type) {
    const validTypes = ['B2B', 'B2C'];
    if (!validTypes.includes(updateData.type)) {
      throw new ValidationError('Invalid type');
    }
  }

  const lead = await LeadModel.updateLead(id, updateData);
  successResponse(res, lead, 'Lead updated successfully');
});

// Delete lead
export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await LeadModel.deleteLead(id);
  successResponse(res, null, 'Lead deleted successfully');
});

// Get overdue leads
export const getOverdueLeads = asyncHandler(async (req: Request, res: Response) => {
  const leads = await LeadModel.getOverdueLeads(req.user!.role, req.user!.userId);
  successResponse(res, leads, 'Overdue leads retrieved successfully');
});

// Convert lead to customer
export const convertToCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadModel.convertToCustomer(id);
  successResponse(res, result, 'Lead converted to customer successfully');
});

// Update lead status
export const updateLeadStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ValidationError('Status is required');
  }

  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const lead = await LeadModel.updateLead(id, { status });
  successResponse(res, lead, 'Lead status updated successfully');
});

// Schedule follow-up
export const scheduleFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { next_followup, notes } = req.body;

  if (!next_followup) {
    throw new ValidationError('Next follow-up date is required');
  }

  const followUpDate = new Date(next_followup);
  if (isNaN(followUpDate.getTime())) {
    throw new ValidationError('Invalid follow-up date');
  }

  const lead = await LeadModel.updateLead(id, { 
    next_followup: followUpDate.toISOString(),
    notes: notes || undefined
  });

  successResponse(res, lead, 'Follow-up scheduled successfully');
});
