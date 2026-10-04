import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import type { LicenseStatus, ActivationResult } from '@shared/types/licensing';
import * as licensingService from '../../licensing/index';
import { getMachineFingerprint } from '../../licensing/machine';
import { assertPermission } from '../utils/authGuard';
import { logger } from '../../logger';

export function registerLicensingIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LICENSING.GET_STATUS, (): Result<LicenseStatus> => {
    try {
      const data = licensingService.getSystemLicenseStatus();
      return { success: true, data };
    } catch (error) {
      logger.error('licensing', 'Error getting license status', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LICENSING.GET_MACHINE_CODE, (): Result<string> => {
    try {
      const data = getMachineFingerprint();
      return { success: true, data };
    } catch (error) {
      logger.error('licensing', 'Error getting machine code', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LICENSING.ACTIVATE, (_, keyOrJson: string): Result<ActivationResult> => {
    try {
      assertPermission('settings.manage');
      if (!keyOrJson || typeof keyOrJson !== 'string') {
        throw new Error('Valid license string or file content is required');
      }
      const result = licensingService.activateSystemLicense(keyOrJson);
      return { success: true, data: result };
    } catch (error) {
      logger.error('licensing', 'Error activating license', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LICENSING.DEACTIVATE, (): Result<void> => {
    try {
      assertPermission('settings.manage');
      licensingService.deactivateSystemLicense();
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('licensing', 'Error deactivating license', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
