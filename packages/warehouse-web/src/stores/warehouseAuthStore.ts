import { create } from 'zustand';
import { getWarehouseSupabase, isWarehouseSupabaseConfigured } from '@/lib/warehouseSupabase';
import { WAREHOUSE_ENV_CONFIG } from '@/config/env';

export interface WarehouseUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'warehouse_director' | 'inbound_supervisor' | 'picker_packer' | 'dispatch_officer';
  shift: 'Morning' | 'Evening' | 'Night';
  assignedZone: string;
  isCloudUser?: boolean;
}

interface WarehouseAuthState {
  user: WarehouseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (emailOrUser: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: WarehouseUser['role']
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const LOCAL_FALLBACK_USER: WarehouseUser = {
  id: 'wh_u1',
  email: 'supervisor@warehouse.zenthropic.com',
  username: 'wh.supervisor',
  fullName: 'Tariq Mehmood',
  role: 'inbound_supervisor',
  shift: 'Morning',
  assignedZone: 'Zone A & B (Central Hub)',
  isCloudUser: false,
};

export const useWarehouseAuthStore = create<WarehouseAuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    const supabase = getWarehouseSupabase();
    if (!supabase || !isWarehouseSupabaseConfigured) {
      // Check local storage for existing session
      const saved = localStorage.getItem(WAREHOUSE_ENV_CONFIG.sessionStorageKey);
      if (saved) {
        try {
          const user = JSON.parse(saved) as WarehouseUser;
          set({ user, isAuthenticated: true, isLoading: false });
          return;
        } catch {
          // invalid json
        }
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const role = (u.user_metadata?.role as WarehouseUser['role']) || 'inbound_supervisor';
        const fullName = (u.user_metadata?.full_name as string) || u.email?.split('@')[0] || 'Logistics Officer';

        const cloudUser: WarehouseUser = {
          id: u.id,
          email: u.email || '',
          username: u.email?.split('@')[0] || 'warehouse_user',
          fullName,
          role,
          shift: 'Morning',
          assignedZone: 'Zone A & B (Main Hub)',
          isCloudUser: true,
        };

        set({ user: cloudUser, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // session lookup failed
    }

    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  login: async (emailOrUser: string, password = '') => {
    set({ isLoading: true, error: null });
    const supabase = getWarehouseSupabase();

    // If Supabase is available and password provided, authenticate via Supabase Auth
    if (supabase && isWarehouseSupabaseConfigured && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrUser,
          password,
        });

        if (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }

        if (data.user) {
          const u = data.user;
          const role = (u.user_metadata?.role as WarehouseUser['role']) || 'inbound_supervisor';
          const fullName = (u.user_metadata?.full_name as string) || u.email?.split('@')[0] || 'Logistics Officer';

          const cloudUser: WarehouseUser = {
            id: u.id,
            email: u.email || '',
            username: u.email?.split('@')[0] || 'warehouse_user',
            fullName,
            role,
            shift: 'Morning',
            assignedZone: 'Zone A & B (Main Hub)',
            isCloudUser: true,
          };

          set({ user: cloudUser, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Supabase authentication failed';
        set({ isLoading: false, error: msg });
        return { success: false, error: msg };
      }
    }

    // Offline / Demo Fallback Mode
    const user: WarehouseUser = {
      ...LOCAL_FALLBACK_USER,
      email: emailOrUser.includes('@') ? emailOrUser : `${emailOrUser}@warehouse.zenthropic.com`,
      username: emailOrUser.split('@')[0],
      fullName: emailOrUser.toLowerCase().includes('admin') ? 'Warehouse Director' : 'Tariq Mehmood',
      role: emailOrUser.toLowerCase().includes('admin') ? 'warehouse_director' : 'inbound_supervisor',
    };

    localStorage.setItem(WAREHOUSE_ENV_CONFIG.sessionStorageKey, JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false, error: null });
    return { success: true };
  },

  register: async (email: string, password: string, fullName: string, role: WarehouseUser['role']) => {
    set({ isLoading: true, error: null });
    const supabase = getWarehouseSupabase();

    if (supabase && isWarehouseSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });

        if (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }

        if (data.user) {
          const cloudUser: WarehouseUser = {
            id: data.user.id,
            email,
            username: email.split('@')[0],
            fullName,
            role,
            shift: 'Morning',
            assignedZone: 'Zone A & B (Main Hub)',
            isCloudUser: true,
          };

          set({ user: cloudUser, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        set({ isLoading: false, error: msg });
        return { success: false, error: msg };
      }
    }

    // Fallback Registration
    const newUser: WarehouseUser = {
      id: `wh_${Date.now()}`,
      email,
      username: email.split('@')[0],
      fullName,
      role,
      shift: 'Morning',
      assignedZone: 'Zone A (Main Hub)',
      isCloudUser: false,
    };

    localStorage.setItem(WAREHOUSE_ENV_CONFIG.sessionStorageKey, JSON.stringify(newUser));
    set({ user: newUser, isAuthenticated: true, isLoading: false, error: null });
    return { success: true };
  },

  logout: async () => {
    const supabase = getWarehouseSupabase();
    if (supabase && isWarehouseSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(WAREHOUSE_ENV_CONFIG.sessionStorageKey);
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },
}));
