import { existsSync } from 'node:fs';
import { app, BrowserWindow } from 'electron';
import { RENDERER_URL, PRELOAD_PATH } from '@main/paths';
import { WINDOW_CONFIG, isDev } from '@main/config';
import { logger } from '@main/logger';
import type { AppInfo } from '@shared/types/app';

let mainWindow: BrowserWindow | null = null;

async function verifyPreloadApi(window: BrowserWindow): Promise<void> {
  try {
    const hasMartpos = (await window.webContents.executeJavaScript(
      'typeof window.martpos !== "undefined"',
    )) as boolean;

    if (!hasMartpos) {
      logger.error('verify', 'window.martpos=missing');
      app.exit(1);
      return;
    }

    const appInfo = (await window.webContents.executeJavaScript(
      'window.martpos.app.getInfo()',
    )) as AppInfo;
    logger.info('verify', 'window.martpos=available appInfo=', appInfo);
    app.exit(0);
  } catch (error) {
    logger.error('verify', 'preload verification failed:', error);
    app.exit(1);
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): BrowserWindow {
  const preloadExists = existsSync(PRELOAD_PATH);

  if (isDev) {
    logger.debug('main', `Preload path: ${PRELOAD_PATH}`);
    logger.debug('main', `Preload file exists: ${String(preloadExists)}`);
    logger.debug('main', `Renderer target: ${process.env.ELECTRON_RENDERER_URL ?? RENDERER_URL}`);
  }

  if (!preloadExists) {
    logger.error('main', `Preload script not found at: ${PRELOAD_PATH}`);
  }

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.defaultWidth,
    height: WINDOW_CONFIG.defaultHeight,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    show: false,
    autoHideMenuBar: true,
    title: WINDOW_CONFIG.title,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('main', `Preload error: ${preloadPath}`, { error: error.message });
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    logger.info('window', 'Main window displayed');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(RENDERER_URL);
  }

  if (process.env.MARTPOS_VERIFY_PRELOAD === '1') {
    mainWindow.webContents.once('did-finish-load', () => {
      void verifyPreloadApi(mainWindow as BrowserWindow);
    });
  }

  return mainWindow;
}
