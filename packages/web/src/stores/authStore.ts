/**
 * Auth Store — MartPOS Cloud
 *
 * Priority Auth Flow:
 * 1. Supabase Auth (if configured) — Cloud email/password + Google OAuth
 * 2. Local offline accounts (admin/manager/cashier) — Always available
 * 3. Registered users in localStorage — Offline-first registration
 */

import { create } from 'zustand';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { authApi } from '@/lib/apiClient';

export interface WebUser {
  id: number | string;
  username: string;
  fullName?: string;
  storeName?: string;
  role: string;
  trialEndsAt?: string;
  plan?: string;
  // Supabase-specific
  supabaseId?: string;
  orgId?: string;
}

interface RegisterInput {
  fullName: string;
  storeName: string;
  username: string; // email
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

// Built-in default accounts for instant offline / demo capability
const DEFAULT_ACCOUNTS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    fullName: 'Super Admin',
    storeName: 'Al-Madina Super Mart',
  },
  {
    username: 'manager',
    password: 'manager123',
    role: 'manager',
    fullName: 'Store Manager',
    storeName: 'Al-Madina Super Mart',
  },
  {
    username: 'cashier',
    password: 'cashier123',
    role: 'cashier',
    fullName: 'POS Cashier 1',
    storeName: 'Al-Madina Super Mart',
  },
];

function getStoredUsers(): typeof DEFAULT_ACCOUNTS {
  try {
    const raw = localStorage.getItem('martpos_registered_users');
    if (!raw) return DEFAULT_ACCOUNTS;
    const custom = JSON.parse(raw) as typeof DEFAULT_ACCOUNTS;
    return [...DEFAULT_ACCOUNTS, ...custom];
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function makeTrialDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('martpos_token'),
  isAuthenticated: false,
  isInitializing: true,

  initAuth: async () => {
    set({ isInitializing: true });

    // 1. Try Supabase session restore
    const sb = getSupabase();
    if (sb) {
      try {
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData.session) {
          const sbUser = sessionData.session.user;
          // Try to load org/profile data
          const { data: orgData } = await sb
            .from('organizations')
            .select('id, name')
            .eq('owner_id', sbUser.id)
            .maybeSingle();

          const webUser: WebUser = {
            id: sbUser.id,
            supabaseId: sbUser.id,
            username: sbUser.email ?? 'user@supabase.io',
            fullName: sbUser.user_metadata?.full_name as string | undefined,
            storeName: (orgData?.name as string | undefined) ?? 'My Mart POS',
            role: 'owner',
            plan: 'trial',
            trialEndsAt: makeTrialDate(),
            orgId: (orgData?.id as string | undefined) ?? undefined,
          };

          localStorage.setItem('martpos_user', JSON.stringify(webUser));
          set({
            user: webUser,
            token: sessionData.session.access_token,
            isAuthenticated: true,
            isInitializing: false,
          });
          return;
        }
      } catch (err) {
        console.warn('[Auth] Supabase session restore failed:', err);
      }
    }

    // 2. Try local token/user cache
    const storedToken = localStorage.getItem('martpos_token');
    const storedUserRaw = localStorage.getItem('martpos_user');

    if (!storedToken) {
      set({ isAuthenticated: false, isInitializing: false });
      return;
    }

    // 3. Try backend verification
    try {
      const res = await authApi.getCurrentUser();
      if (res.success && res.data) {
        set({ user: res.data as WebUser, isAuthenticated: true, token: storedToken });
        set({ isInitializing: false });
        return;
      }
    } catch {
      // Backend offline, continue to local fallback
    }

    // 4. Restore from localStorage cache (fully offline)
    if (storedUserRaw) {
      try {
        const cachedUser = JSON.parse(storedUserRaw) as WebUser;
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

    // 1. Try Supabase Auth (email/password)
    const sb = getSupabase();
    if (sb && cleanUsername.includes('@')) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({
          email: cleanUsername,
          password,
        });

        if (!error && data.user && data.session) {
          const sbUser = data.user;

          // Load or create org profile
          const { data: orgData } = await sb
            .from('organizations')
            .select('id, name')
            .eq('owner_id', sbUser.id)
            .maybeSingle();

          const webUser: WebUser = {
            id: sbUser.id,
            supabaseId: sbUser.id,
            username: sbUser.email ?? cleanUsername,
            fullName:
              (sbUser.user_metadata?.full_name as string | undefined) ??
              sbUser.email?.split('@')[0],
            storeName: (orgData?.name as string | undefined) ?? 'My Mart POS',
            role: 'owner',
            plan: 'trial',
            trialEndsAt: makeTrialDate(),
            orgId: (orgData?.id as string | undefined) ?? undefined,
          };

          localStorage.setItem('martpos_token', data.session.access_token);
          localStorage.setItem('martpos_user', JSON.stringify(webUser));
          set({ user: webUser, token: data.session.access_token, isAuthenticated: true });
          return true;
        }
      } catch (err) {
        console.warn('[Auth] Supabase login failed, trying offline:', err);
      }
    }

    // 2. Try backend API
    try {
      const res = await authApi.login(cleanUsername, password);
      if (res.success) {
        localStorage.setItem('martpos_token', res.data.token);
        localStorage.setItem('martpos_user', JSON.stringify(res.data.user));
        set({ user: res.data.user as WebUser, token: res.data.token, isAuthenticated: true });
        return true;
      }
    } catch {
      // Backend offline, fallback to offline accounts
    }

    // 3. Offline / Local Storage fallback
    const allUsers = getStoredUsers();
    const match = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === password,
    );

    if (match) {
      const localUser: WebUser = {
        id: Math.floor(Math.random() * 100000),
        username: match.username,
        fullName: match.fullName,
        storeName: match.storeName,
        role: match.role,
        plan: 'trial',
        trialEndsAt: makeTrialDate(),
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
    const cleanEmail = username.trim().toLowerCase();

    if (!cleanEmail || !password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // 1. Try Supabase Auth registration (if Supabase is configured)
    const sb = getSupabase();
    if (sb && isSupabaseConfigured) {
      try {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              store_name: storeName.trim(),
            },
          },
        });

        if (error) {
          // If email already exists, give friendly message
          if (error.message.includes('already registered')) {
            return { success: false, error: 'This email is already registered. Please sign in.' };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Create organization record
          const { data: orgData, error: orgError } = await sb
            .from('organizations')
            .insert({
              name: storeName.trim() || 'My Mart POS',
              owner_id: data.user.id,
            })
            .select('id, name')
            .single();

          if (orgError) {
            console.warn('[Auth] Could not create org:', orgError.message);
          }

          // Auto sign in if session returned
          if (data.session) {
            const webUser: WebUser = {
              id: data.user.id,
              supabaseId: data.user.id,
              username: cleanEmail,
              fullName: fullName.trim(),
              storeName: storeName.trim() || 'My Mart POS',
              role: 'owner',
              plan: 'trial',
              trialEndsAt: makeTrialDate(),
              orgId: (orgData?.id as string | undefined) ?? undefined,
            };

            localStorage.setItem('martpos_token', data.session.access_token);
            localStorage.setItem('martpos_user', JSON.stringify(webUser));
            set({ user: webUser, token: data.session.access_token, isAuthenticated: true });
            return { success: true };
          } else {
            // Email confirmation required
            return {
              success: false,
              error:
                '✅ Account created! Please check your email to confirm, then sign in.',
            };
          }
        }
      } catch (err) {
        console.warn('[Auth] Supabase register failed, using local fallback:', err);
      }
    }

    // 2. Local offline registration fallback
    const allUsers = getStoredUsers();
    if (allUsers.some((u) => u.username.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email/username already exists.' };
    }

    const newUser = {
      username: cleanEmail,
      password,
      role: 'owner',
      fullName: fullName.trim() || 'Mart Owner',
      storeName: storeName.trim() || 'My Mart POS',
    };

    try {
      const raw = localStorage.getItem('martpos_registered_users');
      const existing = raw ? (JSON.parse(raw) as typeof DEFAULT_ACCOUNTS) : [];
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
      trialEndsAt: makeTrialDate(),
    };
    const token = `martpos_jwt_${Date.now()}_${newUser.username}`;

    localStorage.setItem('martpos_token', token);
    localStorage.setItem('martpos_user', JSON.stringify(webUser));
    set({ user: webUser, token, isAuthenticated: true });
    return { success: true };
  },

  loginWithGoogle: async () => {
    // 1. Try real Supabase Google OAuth
    const sb = getSupabase();
    if (sb && isSupabaseConfigured) {
      try {
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          console.warn('[Auth] Google OAuth error:', error.message);
        } else {
          // OAuth redirects the page, so we won't reach here in a normal flow
          return true;
        }
      } catch (err) {
        console.warn('[Auth] Google OAuth failed:', err);
      }
    }

    // 2. Demo Google login (if Supabase not configured)
    const googleUser: WebUser = {
      id: 'g_' + Date.now(),
      username: 'demo@gmail.com',
      fullName: 'Demo Google User',
      storeName: 'Cloud Demo Mart',
      role: 'owner',
      plan: 'trial',
      trialEndsAt: makeTrialDate(),
    };
    const token = `martpos_google_oauth_${Date.now()}`;

    localStorage.setItem('martpos_token', token);
    localStorage.setItem('martpos_user', JSON.stringify(googleUser));
    set({ user: googleUser, token, isAuthenticated: true });
    return true;
  },

  logout: async () => {
    // Sign out from Supabase if configured
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {
        // ignore
      }
    }

    // Also try backend logout
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
