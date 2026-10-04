import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import type { AppNotification, NotificationFilter } from '@shared/types/notifications';
import * as notifRepo from '../../../repositories/notifications';
import { logger } from '../../logger';

export function registerNotificationsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.LIST, (_, filter?: NotificationFilter): Result<AppNotification[]> => {
    try {
      const data = notifRepo.listNotifications(filter);
      return { success: true, data };
    } catch (error) {
      logger.error('notifications', 'Error listing notifications', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.GET_UNREAD_COUNT, (): Result<number> => {
    try {
      const data = notifRepo.getUnreadNotificationCount();
      return { success: true, data };
    } catch (error) {
      logger.error('notifications', 'Error getting unread count', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.MARK_AS_READ, (_, id: string): Result<void> => {
    try {
      if (!id) throw new Error('Notification ID is required');
      notifRepo.markNotificationAsRead(id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('notifications', `Error marking notification as read: ${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.MARK_ALL_AS_READ, (): Result<void> => {
    try {
      notifRepo.markAllNotificationsAsRead();
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('notifications', 'Error marking all notifications as read', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.DISMISS, (_, id: string): Result<void> => {
    try {
      if (!id) throw new Error('Notification ID is required');
      notifRepo.dismissNotification(id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('notifications', `Error dismissing notification: ${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.UNDISMISS, (_, id: string): Result<void> => {
    try {
      if (!id) throw new Error('Notification ID is required');
      notifRepo.undismissNotification(id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('notifications', `Error un-dismissing notification: ${id}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
