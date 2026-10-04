import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as backupRepo from '../../../repositories/backup';
import type {
  BackupMetadata,
  BackupValidationResult,
  RestoreResult,
  DatabaseStats,
} from '@shared/types/backup';
import { assertPermission } from '../utils/authGuard';
import { getSqliteClient } from '../../../database/client/index';

export function registerBackupIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.BACKUP.CREATE,
    async (_, notes?: string): Promise<Result<BackupMetadata>> => {
      try {
        assertPermission('settings.manage');
        const data = await backupRepo.createBackup(notes);
        return { success: true, data };
      } catch (error) {
        logger.error('backup', 'Failed to create database backup', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.LIST,
    (): Result<BackupMetadata[]> => {
      try {
        assertPermission('settings.manage');
        const data = backupRepo.listBackups();
        return { success: true, data };
      } catch (error) {
        logger.error('backup', 'Failed to list backups', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.GET_STATS,
    (): Result<DatabaseStats> => {
      try {
        assertPermission('settings.manage');
        const data = backupRepo.getDatabaseStats();
        return { success: true, data };
      } catch (error) {
        logger.error('backup', 'Failed to retrieve database stats', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.VALIDATE,
    (_, filePath: string): Result<BackupValidationResult> => {
      try {
        assertPermission('settings.manage');
        const data = backupRepo.validateBackup(filePath);
        return { success: true, data };
      } catch (error) {
        logger.error('backup', 'Failed to validate backup file', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.RESTORE,
    async (_, filePath: string): Promise<Result<RestoreResult>> => {
      try {
        assertPermission('settings.manage');
        const data = await backupRepo.restoreBackup(filePath);
        return { success: true, data };
      } catch (error) {
        logger.error('backup', 'Failed to restore database from backup', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.SELECT_FILE,
    async (): Promise<Result<string | null>> => {
      try {
        assertPermission('settings.manage');
        if (!dialog) {
          return { success: true, data: null };
        }
        const res = await dialog.showOpenDialog({
          title: 'Select Kings Mart Database Backup',
          filters: [
            { name: 'SQLite Database Backup', extensions: ['db', 'sqlite', 'sqlite3'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });

        if (res.canceled || res.filePaths.length === 0) {
          return { success: true, data: null };
        }

        return { success: true, data: res.filePaths[0] ?? null };
      } catch (error) {
        logger.error('backup', 'Failed to open file picker for backup', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP.DOWNLOAD_DB,
    async (): Promise<Result<string | null>> => {
      try {
        assertPermission('settings.manage');

        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const defaultFilename = `martpos_backup_${stamp}.db`;

        const saveRes = await dialog.showSaveDialog({
          title: 'Download Database Backup',
          defaultPath: defaultFilename,
          filters: [
            { name: 'SQLite Database', extensions: ['db'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (saveRes.canceled || !saveRes.filePath) {
          return { success: true, data: null };
        }

        // Use SQLite's native online backup API — safe for WAL mode
        const sqlite = getSqliteClient();
        sqlite.backup(saveRes.filePath);

        logger.info('backup', `Database downloaded to: ${saveRes.filePath}`);
        return { success: true, data: saveRes.filePath };
      } catch (error) {
        logger.error('backup', 'Failed to download database', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );
}
