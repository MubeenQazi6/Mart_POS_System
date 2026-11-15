import { create } from 'zustand';
import type { AppNotification } from '@shared/types/notifications';

interface NotificationsState {
  notifications: AppNotification[];
  dismissedNotifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  loadNotifications: () => Promise<void>;
  loadDismissedNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  undismiss: (id: string) => Promise<void>;
  togglePanel: () => void;
  closePanel: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  dismissedNotifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,

  loadNotifications: async () => {
    if (!window.martpos) return;
    set({ isLoading: true });
    try {
      const [activeRes, dismissedRes] = await Promise.all([
        window.martpos.notifications.list({ dismissed: false }),
        window.martpos.notifications.list({ dismissed: true }),
      ]);

      if (activeRes.success && activeRes.data) {
        const unread = activeRes.data.filter((n) => !n.is_read).length;
        set({ notifications: activeRes.data, unreadCount: unread });
      }
      if (dismissedRes.success && dismissedRes.data) {
        set({ dismissedNotifications: dismissedRes.data });
      }
    } catch {
      // Non-blocking
    } finally {
      set({ isLoading: false });
    }
  },

  loadDismissedNotifications: async () => {
    if (!window.martpos) return;
    try {
      const res = await window.martpos.notifications.list({ dismissed: true });
      if (res.success && res.data) {
        set({ dismissedNotifications: res.data });
      }
    } catch {
      // Non-blocking
    }
  },

  markAsRead: async (id: string) => {
    if (!window.martpos) return;
    try {
      await window.martpos.notifications.markAsRead(id);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });
    } catch {
      // Non-blocking
    }
  },

  markAllAsRead: async () => {
    if (!window.martpos) return;
    try {
      await window.martpos.notifications.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // Non-blocking
    }
  },

  dismiss: async (id: string) => {
    if (!window.martpos) return;
    try {
      await window.martpos.notifications.dismiss(id);
      void get().loadNotifications();
    } catch {
      // Non-blocking
    }
  },

  undismiss: async (id: string) => {
    if (!window.martpos) return;
    try {
      await window.martpos.notifications.undismiss(id);
      void get().loadNotifications();
    } catch {
      // Non-blocking
    }
  },

  togglePanel: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    if (next) {
      void get().loadNotifications();
    }
  },

  closePanel: () => {
    set({ isOpen: false });
  },
}));
