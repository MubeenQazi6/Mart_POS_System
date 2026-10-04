import { ipcMain, app } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { AppInfo, DBHealth } from '@shared/types/app';
import { getDb } from '../../../database/client/index';
import { sql } from 'drizzle-orm';

export function registerAppIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP.GET_INFO, (): AppInfo => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      isPackaged: app.isPackaged,
      userDataPath: app.getPath('userData'),
    };
  });

  ipcMain.handle(IPC_CHANNELS.APP.DB_HEALTH, (): DBHealth => {
    try {
      const db = getDb();
      db.get(sql`SELECT 1`);
      return { status: 'ok', message: 'Database connection is active.' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  });
}
