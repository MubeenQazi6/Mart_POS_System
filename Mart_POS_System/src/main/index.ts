import { app, BrowserWindow, shell, dialog } from 'electron';
import { registerAppIpcHandlers } from '@main/ipc/handlers/app';
import { registerCatalogIpcHandlers } from '@main/ipc/handlers/catalog';
import { registerBarcodeJobsIpcHandlers } from '@main/ipc/handlers/barcode-jobs';
import { registerSalesIpcHandlers } from '@main/ipc/handlers/sales';
import { registerInventoryIpcHandlers } from '@main/ipc/handlers/inventory';
import { registerSuppliersIpcHandlers } from '@main/ipc/handlers/suppliers';
import { registerPurchasesIpcHandlers } from '@main/ipc/handlers/purchases';
import { registerCustomersIpcHandlers } from '@main/ipc/handlers/customers';
import { registerAuthIpcHandlers } from '@main/ipc/handlers/auth';
import { registerUsersIpcHandlers } from '@main/ipc/handlers/users';
import { registerAuditIpcHandlers } from '@main/ipc/handlers/audit';
import { registerReportsIpcHandlers } from '@main/ipc/handlers/reports';
import { registerDashboardIpcHandlers } from '@main/ipc/handlers/dashboard';
import { registerExpenseIpcHandlers } from '@main/ipc/handlers/expenses';
import { registerCashIpcHandlers } from '@main/ipc/handlers/cash';
import { registerReturnsIpcHandlers } from '@main/ipc/handlers/returns';
import { registerSettingsIpcHandlers } from '@main/ipc/handlers/settings';
import { registerNotificationsIpcHandlers } from '@main/ipc/handlers/notifications';
import { registerLicensingIpcHandlers } from '@main/ipc/handlers/licensing';
import { registerBackupIpcHandlers } from '@main/ipc/handlers/backup';
import { registerHardwareIpcHandlers } from '@main/ipc/handlers/hardware';
import { createMainWindow } from '@main/windows/main-window';
import { logger } from '@main/logger';
import { initDatabase } from '../database/client/index';
import { runMigrations } from '../database/migrator';
import { seedDefaultSettingsIfEmpty } from '../repositories/settings';
import { invalidateAllSessions } from '../repositories/auth';

// Initialize structured logger
logger.init();

/** Prevent multiple instances — important for SQLite single-writer safety. */
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  logger.warn('lifecycle', 'Another instance is already running. Quitting.');
  app.quit();
} else {
  logger.info('lifecycle', 'Single instance lock acquired.');

  app.on('second-instance', () => {
    logger.info('lifecycle', 'Second instance attempt detected; focusing existing window.');
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(() => {
      logger.info('lifecycle', 'App ready. Initializing database and running migrations.');
      
      try {
        initDatabase();
        runMigrations();
        seedDefaultSettingsIfEmpty();
        invalidateAllSessions();
        logger.info('lifecycle', 'Database initialized and migrations applied.');
      } catch (err) {
        logger.error('database', 'Failed to initialize database or run migrations', err);
        dialog.showErrorBox(
          'Database Initialization Error',
          'Could not initialize the local database or run migrations. The application will now close.\n\n' +
            String(err),
        );
        app.quit();
        return;
      }

      logger.info('lifecycle', 'Registering IPC handlers.');
      registerAppIpcHandlers();
      registerCatalogIpcHandlers();
      registerBarcodeJobsIpcHandlers();
      registerSalesIpcHandlers();
      registerInventoryIpcHandlers();
      registerSuppliersIpcHandlers();
      registerPurchasesIpcHandlers();
      registerCustomersIpcHandlers();
      registerAuthIpcHandlers();
      registerUsersIpcHandlers();
      registerDashboardIpcHandlers();
      registerExpenseIpcHandlers();
      registerCashIpcHandlers();
      registerReturnsIpcHandlers();
      registerAuditIpcHandlers();
      registerReportsIpcHandlers();
      registerSettingsIpcHandlers();
      registerNotificationsIpcHandlers();
      registerLicensingIpcHandlers();
      registerBackupIpcHandlers();
      registerHardwareIpcHandlers();
      
      createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    })
    .catch((error: unknown) => {
      logger.error('lifecycle', 'Failed to start application:', error);
      app.quit();
    });

  app.on('window-all-closed', () => {
    logger.info('lifecycle', 'All windows closed.');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  /** Open external links in the system browser — never inside Electron. */
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        logger.info('navigation', `Opening external URL: ${url}`);
        void shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });
}
