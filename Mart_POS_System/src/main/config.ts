import * as electron from 'electron';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const electronApp = (electron as unknown as { app?: Electron.App }).app;

export const isDev = process.env.NODE_ENV !== 'production' || (electronApp ? !electronApp.isPackaged : true);
export const isProd = !isDev;

export const WINDOW_CONFIG = {
  defaultWidth: 1280,
  defaultHeight: 800,
  minWidth: 1024,
  minHeight: 640,
  title: 'MARTPOS',
} as const;

export interface AppPaths {
  userData: string;
  logs: string;
  backups: string;
  database: string;
}

export function getAppPaths(): AppPaths {
  const userData = electronApp?.getPath
    ? electronApp.getPath('userData')
    : join(tmpdir(), 'martpos');
  return {
    userData,
    logs: join(userData, 'logs'),
    backups: join(userData, 'backups'),
    database: join(userData, 'martpos.db'),
  };
}
