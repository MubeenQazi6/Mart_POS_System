import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import * as settingsRepo from '../../../repositories/settings';
import { assertPermission } from '../utils/authGuard';
import { logger } from '../../logger';

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, (): Result<Record<string, unknown>> => {
    try {
      const data = settingsRepo.getAllSettings();
      return { success: true, data: data as unknown as Record<string, unknown> };
    } catch (error) {
      logger.error('settings', 'Error getting all settings', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, (_, key: string): Result<unknown> => {
    try {
      if (!key) throw new Error('Setting key is required');
      const data = settingsRepo.getSetting(key as any);
      return { success: true, data };
    } catch (error) {
      logger.error('settings', `Error getting setting ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, (_, key: string, value: unknown): Result<void> => {
    try {
      assertPermission('settings.manage');
      if (!key) throw new Error('Setting key is required');
      settingsRepo.setSetting(key, value);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('settings', `Error setting ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET_MANY, (_, newSettings: Record<string, unknown>): Result<void> => {
    try {
      assertPermission('settings.manage');
      if (!newSettings || typeof newSettings !== 'object') {
        throw new Error('Valid settings object is required');
      }
      settingsRepo.setManySettings(newSettings);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('settings', 'Error setting many settings', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
