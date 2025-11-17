import { Request, Response } from 'express';
import { ReservationNoteModel, CreateReservationNoteData, UpdateReservationNoteData } from '../models/reservationNoteModel';
import { successResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// Get all notes for a reservation
export const getReservationNotes = asyncHandler(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const notes = await ReservationNoteModel.getNotesByReservationId(parseInt(reservationId));
  successResponse(res, notes);
});

// Get single note by ID
export const getReservationNoteById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const note = await ReservationNoteModel.findNoteById(parseInt(id));
  successResponse(res, note);
});

// Create new note
export const createReservationNote = asyncHandler(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const noteData: CreateReservationNoteData = {
    reservation_id: parseInt(reservationId),
    note: req.body.note,
    note_type: req.body.note_type || 'internal',
    target_department: req.body.target_department
  };
  
  const userId = typeof req.user!.userId === 'number' ? req.user!.userId : parseInt(String(req.user!.userId), 10);
  const newNote = await ReservationNoteModel.createNote(noteData, userId);
  successResponse(res, newNote, 'Note created successfully', 201);
});

// Update note
export const updateReservationNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateReservationNoteData = req.body;
  
  const updatedNote = await ReservationNoteModel.updateNote(parseInt(id), updateData);
  successResponse(res, updatedNote, 'Note updated successfully');
});

// Delete note
export const deleteReservationNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ReservationNoteModel.deleteNote(parseInt(id));
  successResponse(res, null, 'Note deleted successfully', 204);
});

