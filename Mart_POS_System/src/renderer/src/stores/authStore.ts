import { create } from 'zustand';
import type {
  PublicUser,
  LoginInput,
  ChangePasswordInput,
  Permission,
} from '@shared/types/auth';
import { hasPermission as checkRolePermission, MODULE_ACCESS } from '@shared/types/auth';
import { showToast } from '@renderer/components/ui/Toast';

interface AuthState {
  currentUser: PublicUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (input: LoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<boolean>;
  can: (permission: Permission) => boolean;
  canAccessModule: (moduleId: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,

  initAuth: async () => {
    if (!window.martpos) {
      set({ isInitializing: false });
      return;
    }
    try {
      const res = await window.martpos.auth.getCurrentUser();
      if (res.success && res.data) {
        set({ currentUser: res.data, isAuthenticated: true });
      } else {
        set({ currentUser: null, isAuthenticated: false });
      }
    } catch {
      set({ currentUser: null, isAuthenticated: false });
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (input) => {
    if (!window.martpos) return false;
    set({ isLoading: true, error: null });
    try {
      const res = await window.martpos.auth.login(input);
      if (res.success) {
        set({ currentUser: res.data, isAuthenticated: true, error: null });
        showToast('success', `Welcome back, ${res.data.full_name}!`);
        return true;
      } else {
        set({ error: res.error, isAuthenticated: false });
        showToast('error', res.error);
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown authentication error';
      set({ error: msg, isAuthenticated: false });
      showToast('error', msg);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    if (!window.martpos) return;
    set({ isLoading: true });
    try {
      await window.martpos.auth.logout();
      set({ currentUser: null, isAuthenticated: false, error: null });
      showToast('info', 'You have been logged out.');
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (input) => {
    if (!window.martpos) return false;
    set({ isLoading: true });
    try {
      const res = await window.martpos.auth.changePassword(input);
      if (res.success) {
        showToast('success', 'Password changed successfully');
        return true;
      } else {
        showToast('error', res.error);
        return false;
      }
    } finally {
      set({ isLoading: false });
    }
  },

  can: (permission: Permission) => {
    const user = get().currentUser;
    if (!user || !user.is_active) return false;
    return checkRolePermission(user.role, permission);
  },

  canAccessModule: (moduleId: string) => {
    const user = get().currentUser;
    if (!user || !user.is_active) return false;
    if (user.role === 'admin') return true;
    if (Array.isArray(user.allowed_modules)) {
      return user.allowed_modules.includes(moduleId);
    }
    const allowed = MODULE_ACCESS[moduleId];
    if (!allowed) return true; // unknown modules are visible by default
    return allowed.includes(user.role);
  },
}));
