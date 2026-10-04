import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import { logger } from '@main/logger';
import * as usersRepo from '../../../repositories/users';
import type {
  PublicUser,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from '@shared/types/auth';

import { assertPermission } from '../utils/authGuard';

export function registerUsersIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.USERS.LIST,
    (): Result<PublicUser[]> => {
      try {
        assertPermission('users.view');
        const data = usersRepo.listUsers();
        return { success: true, data };
      } catch (error) {
        logger.error('users', 'Error listing users', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.GET_BY_ID,
    (_, id: number): Result<PublicUser> => {
      try {
        assertPermission('users.view');
        const data = usersRepo.getUserById(id);
        return { success: true, data };
      } catch (error) {
        logger.error('users', `Error fetching user ${String(id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.CREATE,
    (_, input: CreateUserInput): Result<PublicUser> => {
      try {
        assertPermission('users.manage');
        const data = usersRepo.createUser(input);
        return { success: true, data };
      } catch (error) {
        logger.error('users', 'Error creating user', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.UPDATE,
    (_, input: UpdateUserInput): Result<PublicUser> => {
      try {
        assertPermission('users.manage');
        const data = usersRepo.updateUser(input);
        return { success: true, data };
      } catch (error) {
        logger.error('users', `Error updating user ${String(input.id)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.RESET_PASSWORD,
    (_, input: ResetPasswordInput): Result<void> => {
      try {
        assertPermission('users.manage');
        usersRepo.resetUserPassword(input);
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('users', `Error resetting password for user ${String(input.userId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.GET_PERMISSIONS,
    (_, userId: number): Result<string[]> => {
      try {
        assertPermission('users.view');
        const data = usersRepo.getUserPermissions(userId);
        return { success: true, data };
      } catch (error) {
        logger.error('users', `Error fetching permissions for user ${String(userId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS.UPDATE_PERMISSIONS,
    (_, userId: number, allowedModules: string[]): Result<PublicUser> => {
      try {
        assertPermission('users.manage');
        const data = usersRepo.updateUserPermissions(userId, allowedModules);
        return { success: true, data };
      } catch (error) {
        logger.error('users', `Error updating permissions for user ${String(userId)}`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
