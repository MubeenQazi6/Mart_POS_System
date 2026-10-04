import { create } from 'zustand';
import { authApi } from '@/lib/apiClient';

export interface WebUser {
  id: number | string;
  username: string;
  fullName?: string;
  storeName?: string;
  role: string;
  trialEndsAt?: string;
  plan?: string;
}

interface RegisterInput {
  fullName: string;
  storeName: string;
  username: string;
  password: string;
}

interface AuthState {
  user: WebUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  initAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

// Built-in default users for instant offline / demo capability
const DEFAULT_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'admin', fullName: 'Super Admin', storeName: 'Al-Madina Super Mart' },
  { username: 'manager', password: 'manager123', role: 'manager', fullName: 'Store Manager', storeName: 'Al-Madina Super Mart' },
  { username: 'cashier', password: 'cashier123', role: 'cashier', fullName: 'POS Cashier 1', storeName: 'Al-Madina Super Mart' },
];

function getStoredUsers(): typeof DEFAULT_ACCOUNTS {
  try {
    const raw = localStorage.getItem('martpos_registered_users');
    if (!raw) return DEFAULT_ACCOUNTS;
    const custom = JSON.parse(raw);
    return [...DEFAULT_ACCOUNTS, ...custom];
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('martpos_token'),
  isAuthenticated: false,
  isInitializing: true,

  initAuth: async () => {
    set({ isInitializing: true });
    const storedToken = localStorage.getItem('martpos_token');
    const storedUserRaw = localStorage.getItem('martpos_user');

    if (!storedToken) {
      set({ isAuthenticated: false, isInitializing: false });
      return;
    }

    // Try backend check first
    try {
      const res = await authApi.getCurrentUser();
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, token: storedToken });
        set({ isInitializing: false });
        return;
      }
    } catch {
      // Backend offline, fallback to cached user
    }

    if (storedUserRaw) {
      try {
        const cachedUser = JSON.parse(storedUserRaw);
        set({ user: cachedUser, isAuthenticated: true, token: storedToken });
      } catch {
        localStorage.removeItem('martpos_token');
        localStorage.removeItem('martpos_user');
        set({ user: null, isAuthenticated: false, token: null });
      }
    } else {
      set({ isAuthenticated: false, user: null, token: null });
    }

    set({ isInitializing: false });
  },

  login: async (username, password) => {
    const cleanUsername = username.trim().toLowerCase();

    // 1. Try remote API first if backend is running
    try {
      const res = await authApi.login(cleanUsername, password);
      if (res.success) {
        localStorage.setItem('martpos_token', res.data.token);
        localStorage.setItem('martpos_user', JSON.stringify(res.data.user));
        set({ user: res.data.user, token: res.data.token, isAuthenticated: true });
        return true;
      }
    } catch {
      // Backend offline or proxy error, fallback to offline accounts
    }

    // 2. Offline / Local Storage authentication fallback
    const allUsers = getStoredUsers();
    const match = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === password,
    );

    if (match) {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);

      const localUser: WebUser = {
        id: Math.floor(Math.random() * 100000),
        username: match.username,
        fullName: match.fullName,
        storeName: match.storeName,
        role: match.role,
        plan: 'trial',
        trialEndsAt: trialEndDate.toISOString(),
      };
      const token = `martpos_jwt_${Date.now()}_${match.username}`;

      localStorage.setItem('martpos_token', token);
      localStorage.setItem('martpos_user', JSON.stringify(localUser));

      set({ user: localUser, token, isAuthenticated: true });
      return true;
    }

    return false;
  },

  register: async ({ fullName, storeName, username, password }) => {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const allUsers = getStoredUsers();
    if (allUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'An account with this email/username already exists.' };
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    const newUser = {
      username: cleanUsername,
      password,
      role: 'owner',
      fullName: fullName.trim() || 'Mart Owner',
      storeName: storeName.trim() || 'My Mart POS',
    };

    // Save locally
    try {
      const raw = localStorage.getItem('martpos_registered_users');
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(newUser);
      localStorage.setItem('martpos_registered_users', JSON.stringify(existing));
    } catch (e) {
      console.error('Could not save user locally', e);
    }

    const webUser: WebUser = {
      id: Date.now(),
      username: newUser.username,
      fullName: newUser.fullName,
      storeName: newUser.storeName,
      role: 'owner',
      plan: 'trial',
      trialEndsAt: trialEndDate.toISOString(),
    };
    const token = `martpos_jwt_${Date.now()}_${newUser.username}`;

    localStorage.setItem('martpos_token', token);
    localStorage.setItem('martpos_user', JSON.stringify(webUser));

    set({ user: webUser, token, isAuthenticated: true });
    return { success: true };
  },

  loginWithGoogle: async () => {
    // Generate Google user profile
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    const googleUser: WebUser = {
      id: 'g_' + Date.now(),
      username: 'user@gmail.com',
      fullName: 'Google User',
      storeName: 'Cloud Mart Express',
      role: 'owner',
      plan: 'trial',
      trialEndsAt: trialEndDate.toISOString(),
    };
    const token = `martpos_google_oauth_${Date.now()}`;

    localStorage.setItem('martpos_token', token);
    localStorage.setItem('martpos_user', JSON.stringify(googleUser));

    set({ user: googleUser, token, isAuthenticated: true });
    return true;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('martpos_token');
    localStorage.removeItem('martpos_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
