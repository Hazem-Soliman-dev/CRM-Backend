import { Request, Response } from 'express';
import { ReservationDocumentModel, CreateReservationDocumentData, UpdateReservationDocumentData } from '../models/reservationDocumentModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// Get all documents for a reservation
export const getReservationDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const documents = await ReservationDocumentModel.getDocumentsByReservationId(parseInt(reservationId));
  successResponse(res, documents);
});

// Get single document by ID (with file data)
export const getReservationDocumentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await ReservationDocumentModel.findDocumentById(parseInt(id));
  successResponse(res, document);
});

// Get single document metadata by ID (without file data)
export const getReservationDocumentMetadata = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await ReservationDocumentModel.findDocumentByIdWithoutFile(parseInt(id));
  successResponse(res, document);
});

// Create new document
export const createReservationDocument = asyncHandler(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  
  // Validate required fields
  if (!req.body.file_data || !req.body.document_name || !req.body.document_type) {
    return res.status(400).json({
      success: false,
      message: 'file_data, document_name, and document_type are required'
    });
  }

  const documentData: CreateReservationDocumentData = {
    reservation_id: parseInt(reservationId),
    document_name: req.body.document_name,
    document_type: req.body.document_type,
    file_data: req.body.file_data, // Base64 encoded
    file_size: req.body.file_size || 0,
    mime_type: req.body.mime_type || 'application/octet-stream',
    description: req.body.description
  };
  
  const userId = typeof req.user!.userId === 'number' ? req.user!.userId : parseInt(String(req.user!.userId), 10);
  const newDocument = await ReservationDocumentModel.createDocument(documentData, userId);
  return successResponse(res, newDocument, 'Document uploaded successfully', 201);
});

// Update document metadata
export const updateReservationDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateReservationDocumentData = req.body;
  
  const updatedDocument = await ReservationDocumentModel.updateDocument(parseInt(id), updateData);
  successResponse(res, updatedDocument, 'Document updated successfully');
});

// Delete document
export const deleteReservationDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ReservationDocumentModel.deleteDocument(parseInt(id));
  successResponse(res, null, 'Document deleted successfully', 204);
});

// Download document
export const downloadReservationDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await ReservationDocumentModel.findDocumentById(parseInt(id));
  
  // Convert base64 to buffer
  const fileBuffer = Buffer.from(document.file_data, 'base64');
  
  // Set headers for download
  res.setHeader('Content-Type', document.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  
  res.send(fileBuffer);
});

