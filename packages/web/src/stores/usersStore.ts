import { create } from 'zustand';
import type {
  PublicUser,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from '@shared/types/auth';
import { showToast } from '@renderer/components/ui/Toast';
import { useAuthStore } from './authStore';

interface UsersState {
  users: PublicUser[];
  isLoading: boolean;
  selectedUser: PublicUser | null;
  error: string | null;

  loadUsers: () => Promise<void>;
  selectUser: (user: PublicUser | null) => void;
  createUser: (input: CreateUserInput) => Promise<PublicUser | null>;
  updateUser: (input: UpdateUserInput) => Promise<boolean>;
  resetPassword: (input: ResetPasswordInput) => Promise<boolean>;
  updateUserPermissions: (userId: number, allowedModules: string[]) => Promise<boolean>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  selectedUser: null,
  error: null,

  loadUsers: async () => {
    if (!window.martpos) return;
    set({ isLoading: true, error: null });
    try {
      const res = await window.martpos.users.list();
      if (res.success) {
        set({ users: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  selectUser: (user) => {
    set({ selectedUser: user });
  },

  createUser: async (input) => {
    if (!window.martpos) return null;
    const res = await window.martpos.users.create(input);
    if (res.success) {
      showToast('success', `Staff user "${res.data.username}" created successfully`);
      void get().loadUsers();
      return res.data;
    }
    showToast('error', res.error);
    return null;
  },

  updateUser: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.users.update(input);
    if (res.success) {
      showToast('success', 'User profile updated successfully');
      void get().loadUsers();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  resetPassword: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.users.resetPassword(input);
    if (res.success) {
      showToast('success', 'Password reset successfully');
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updateUserPermissions: async (userId: number, allowedModules: string[]) => {
    if (!window.martpos) return false;
    const res = await window.martpos.users.updatePermissions(userId, allowedModules);
    if (res.success) {
      const currentAuthUser = useAuthStore.getState().currentUser;
      if (currentAuthUser && currentAuthUser.id === userId) {
        showToast('success', 'Screen access permissions saved successfully');
      } else {
        const targetUser = get().users.find((u) => u.id === userId);
        const name = targetUser ? `@${targetUser.username}` : 'User';
        showToast('success', `Permissions updated. ${name} will see these changes the next time they log in.`);
      }
      void get().loadUsers();
      return true;
    }
    showToast('error', res.error);
    return false;
  },
}));
