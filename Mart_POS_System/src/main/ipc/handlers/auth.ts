import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as authRepo from '../../../repositories/auth';
import type {
  PublicUser,
  LoginInput,
  ChangePasswordInput,
} from '@shared/types/auth';

export function registerAuthIpcHandlers(): void {
  // On every fresh application launch, invalidate all persisted sessions
  // so the Login Screen is always the default startup screen.
  try {
    authRepo.invalidateAllSessions();
  } catch (err) {
    logger.error('auth', 'Failed invalidating sessions on startup', err);
  }

  // Ensure default admin user exists
  try {
    authRepo.ensureDefaultAdmin();
  } catch (err) {
    logger.error('auth', 'Failed ensuring default admin', err);
  }

  ipcMain.handle(
    IPC_CHANNELS.AUTH.LOGIN,
    (_, input: LoginInput): Result<PublicUser> => {
      try {
        const user = authRepo.login(input);
        return { success: true, data: user };
      } catch (error) {
        logger.error('auth', 'Login failure', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid credentials',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUTH.LOGOUT,
    (): Result<void> => {
      try {
        authRepo.logout();
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('auth', 'Logout failure', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Logout error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUTH.GET_CURRENT_USER,
    (): Result<PublicUser | null> => {
      try {
        const user = authRepo.restoreActiveSession();
        return { success: true, data: user };
      } catch (error) {
        logger.error('auth', 'Error getting current user', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Session error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUTH.CHANGE_PASSWORD,
    (_, input: ChangePasswordInput): Result<void> => {
      try {
        authRepo.changePassword(input);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('auth', 'Error changing password', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to change password',
        };
      }
    },
  );
}
