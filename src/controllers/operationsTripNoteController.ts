import { Request, Response } from 'express';
import { OperationsTripNoteModel, CreateTripNoteData, UpdateTripNoteData } from '../models/operationsTripNoteModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const parseIdParam = (value: string, resource: string): number => {
  const id = Number(value);
  if (Number.isNaN(id) || id <= 0) {
    throw new AppError(`Invalid ${resource} identifier`, 400);
  }
  return id;
};

// Get all notes for a trip
export const getTripNotes = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const notes = await OperationsTripNoteModel.getNotesByTripId(tripId);
  successResponse(res, notes);
});

// Get single note by ID
export const getTripNoteById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'note');
  const note = await OperationsTripNoteModel.findNoteById(id);
  successResponse(res, note);
});

// Create new note
export const createTripNote = asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseIdParam(req.params.id, 'trip');
  const noteData: CreateTripNoteData = {
    trip_id: tripId,
    note: req.body.note,
    note_type: req.body.note_type || 'internal',
    target_department: req.body.target_department
  };
  
  const userId = typeof req.user!.userId === 'number' ? req.user!.userId : parseInt(String(req.user!.userId), 10);
  const newNote = await OperationsTripNoteModel.createNote(noteData, userId);
  successResponse(res, newNote, 'Note created successfully', 201);
});

// Update note
export const updateTripNote = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'note');
  const updateData: UpdateTripNoteData = req.body;
  
  const updatedNote = await OperationsTripNoteModel.updateNote(id, updateData);
  successResponse(res, updatedNote, 'Note updated successfully');
});

// Delete note
export const deleteTripNote = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id, 'note');
  await OperationsTripNoteModel.deleteNote(id);
  successResponse(res, null, 'Note deleted successfully', 204);
});

