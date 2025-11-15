import getDatabase from '../config/database';
import { AppError } from '../utils/AppError';

export interface WorkspaceSettings {
  workspaceId: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultLanguage: string;
  pipelineMode: 'standard' | 'enterprise' | 'custom';
  pipelineName?: string | null;
  leadAlerts: boolean;
  ticketUpdates: boolean;
  dailyDigest: boolean;
  taskReminders: boolean;
  compactMode: boolean;
  highContrast: boolean;
  theme: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkspaceSettings {
  defaultCurrency?: string;
  defaultTimezone?: string;
  defaultLanguage?: string;
  pipelineMode?: 'standard' | 'enterprise' | 'custom';
  pipelineName?: string | null;
  leadAlerts?: boolean;
  ticketUpdates?: boolean;
  dailyDigest?: boolean;
  taskReminders?: boolean;
  compactMode?: boolean;
  highContrast?: boolean;
  theme?: 'light' | 'dark';
}

export class SettingsModel {
  private static mapRow(row: any): WorkspaceSettings {
    return {
      workspaceId: row.workspace_id,
      defaultCurrency: row.default_currency,
      defaultTimezone: row.default_timezone,
      defaultLanguage: row.default_language,
      pipelineMode: row.pipeline_mode,
      pipelineName: row.pipeline_name,
      leadAlerts: Boolean(row.lead_alerts),
      ticketUpdates: Boolean(row.ticket_updates),
      dailyDigest: Boolean(row.daily_digest),
      taskReminders: Boolean(row.task_reminders),
      compactMode: Boolean(row.compact_mode),
      highContrast: Boolean(row.high_contrast),
      theme: row.theme,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async getWorkspaceSettings(workspaceId = 'default'): Promise<WorkspaceSettings> {
    try {
      const db = getDatabase();
      const settings = db.prepare('SELECT * FROM system_settings WHERE workspace_id = ?').get(workspaceId) as any;

      if (!settings) {
        db.prepare('INSERT OR IGNORE INTO system_settings (workspace_id) VALUES (?)').run(workspaceId);
        return await this.getWorkspaceSettings(workspaceId);
      }

      return this.mapRow(settings);
    } catch (error) {
      throw new AppError('Failed to load workspace settings', 500);
    }
  }

  static async updateWorkspaceSettings(workspaceId: string, data: UpdateWorkspaceSettings): Promise<WorkspaceSettings> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.defaultCurrency !== undefined) {
        fields.push('default_currency = ?');
        params.push(data.defaultCurrency);
      }
      if (data.defaultTimezone !== undefined) {
        fields.push('default_timezone = ?');
        params.push(data.defaultTimezone);
      }
      if (data.defaultLanguage !== undefined) {
        fields.push('default_language = ?');
        params.push(data.defaultLanguage);
      }
      if (data.pipelineMode !== undefined) {
        fields.push('pipeline_mode = ?');
        params.push(data.pipelineMode);
      }
      if (data.pipelineName !== undefined) {
        fields.push('pipeline_name = ?');
        params.push(data.pipelineName || null);
      }
      if (data.leadAlerts !== undefined) {
        fields.push('lead_alerts = ?');
        params.push(data.leadAlerts ? 1 : 0);
      }
      if (data.ticketUpdates !== undefined) {
        fields.push('ticket_updates = ?');
        params.push(data.ticketUpdates ? 1 : 0);
      }
      if (data.dailyDigest !== undefined) {
        fields.push('daily_digest = ?');
        params.push(data.dailyDigest ? 1 : 0);
      }
      if (data.taskReminders !== undefined) {
        fields.push('task_reminders = ?');
        params.push(data.taskReminders ? 1 : 0);
      }
      if (data.compactMode !== undefined) {
        fields.push('compact_mode = ?');
        params.push(data.compactMode ? 1 : 0);
      }
      if (data.highContrast !== undefined) {
        fields.push('high_contrast = ?');
        params.push(data.highContrast ? 1 : 0);
      }
      if (data.theme !== undefined) {
        fields.push('theme = ?');
        params.push(data.theme);
      }

      if (fields.length === 0) {
        return await this.getWorkspaceSettings(workspaceId);
      }

      params.push(workspaceId);

      const db = getDatabase();
      const query = `
        UPDATE system_settings
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE workspace_id = ?
      `;

      db.prepare(query).run(...params);
      return await this.getWorkspaceSettings(workspaceId);
    } catch (error) {
      throw new AppError('Failed to update workspace settings', 500);
    }
  }
}

