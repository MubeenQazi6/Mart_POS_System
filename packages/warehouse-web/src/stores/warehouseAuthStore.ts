import { create } from 'zustand';

export interface WarehouseUser {
  id: string;
  username: string;
  fullName: string;
  role: 'warehouse_director' | 'inbound_supervisor' | 'picker_packer' | 'dispatch_officer';
  shift: 'Morning' | 'Evening' | 'Night';
  assignedZone: string;
}

interface WarehouseAuthState {
  user: WarehouseUser | null;
  isAuthenticated: boolean;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
}

const DEFAULT_WAREHOUSE_USER: WarehouseUser = {
  id: 'wh_u1',
  username: 'wh.supervisor',
  fullName: 'Tariq Mehmood',
  role: 'inbound_supervisor',
  shift: 'Morning',
  assignedZone: 'Zone A & B (Central Hub)',
};

export const useWarehouseAuthStore = create<WarehouseAuthState>((set) => ({
  user: DEFAULT_WAREHOUSE_USER,
  isAuthenticated: true,

  login: async (username: string) => {
    set({
      user: {
        ...DEFAULT_WAREHOUSE_USER,
        username,
        fullName: username === 'admin' ? 'Warehouse Director' : 'Warehouse Officer',
      },
      isAuthenticated: true,
    });
    return true;
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
