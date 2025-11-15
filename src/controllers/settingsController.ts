import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import { SettingsModel, UpdateWorkspaceSettings } from '../models/settingsModel';

const DEFAULT_WORKSPACE_ID = 'default';

export const getWorkspaceSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await SettingsModel.getWorkspaceSettings(DEFAULT_WORKSPACE_ID);
  successResponse(res, settings);
});

export const updateWorkspaceSettings = asyncHandler(async (req: Request, res: Response) => {
  const updateData: UpdateWorkspaceSettings = {
    defaultCurrency: req.body.defaultCurrency,
    defaultTimezone: req.body.defaultTimezone,
    defaultLanguage: req.body.defaultLanguage,
    pipelineMode: req.body.pipelineMode,
    pipelineName: req.body.pipelineName,
    leadAlerts: req.body.leadAlerts,
    ticketUpdates: req.body.ticketUpdates,
    dailyDigest: req.body.dailyDigest,
    taskReminders: req.body.taskReminders,
    compactMode: req.body.compactMode,
    highContrast: req.body.highContrast,
    theme: req.body.theme
  };

  const settings = await SettingsModel.updateWorkspaceSettings(DEFAULT_WORKSPACE_ID, updateData);
  successResponse(res, settings, 'Settings updated successfully');
});

