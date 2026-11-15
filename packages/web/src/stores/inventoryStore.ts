import { create } from 'zustand';
import type {
  StockSummaryRow,
  StockMovementRow,
  CreateMovementInput,
  StockSummaryFilters,
  MovementListParams,
  InventoryKpis,
} from '@shared/types/inventory';
import { showToast } from '@renderer/components/ui/Toast';

interface InventoryState {
  // Stock summary
  stockSummary: StockSummaryRow[];
  isLoadingStockSummary: boolean;

  // Filters
  filters: StockSummaryFilters;

  // Movements
  movements: StockMovementRow[];
  isLoadingMovements: boolean;

  // KPIs
  kpis: InventoryKpis | null;
  isLoadingKpis: boolean;

  // Error
  error: string | null;

  // Actions
  setFilters: (filters: Partial<StockSummaryFilters>) => void;
  resetFilters: () => void;

  loadStockSummary: () => Promise<void>;
  loadMovements: (params?: MovementListParams) => Promise<void>;
  loadKpis: () => Promise<void>;

  createAdjustment: (input: CreateMovementInput) => Promise<boolean>;

  clearError: () => void;
}

const DEFAULT_FILTERS: StockSummaryFilters = {
  is_active: true,
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  stockSummary: [],
  isLoadingStockSummary: false,

  filters: { ...DEFAULT_FILTERS },

  movements: [],
  isLoadingMovements: false,

  kpis: null,
  isLoadingKpis: false,

  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadStockSummary();
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    void get().loadStockSummary();
  },

  loadStockSummary: async () => {
    if (!window.martpos) return;
    set({ isLoadingStockSummary: true, error: null });
    try {
      const res = await window.martpos.inventory.listStockSummary(get().filters);
      if (res.success) {
        set({ stockSummary: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingStockSummary: false });
    }
  },

  loadMovements: async (params = {}) => {
    if (!window.martpos) return;
    set({ isLoadingMovements: true, error: null });
    try {
      const res = await window.martpos.inventory.listMovements(params);
      if (res.success) {
        set({ movements: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingMovements: false });
    }
  },

  loadKpis: async () => {
    if (!window.martpos) return;
    set({ isLoadingKpis: true, error: null });
    try {
      const res = await window.martpos.inventory.getKpis();
      if (res.success) {
        set({ kpis: res.data });
      } else {
        set({ error: res.error });
      }
    } finally {
      set({ isLoadingKpis: false });
    }
  },

  createAdjustment: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.inventory.adjust(input);
    if (res.success) {
      showToast('success', 'Stock adjustment saved successfully');
      // Refresh data after adjustment
      void get().loadStockSummary();
      void get().loadKpis();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  clearError: () => {
    set({ error: null });
  },
}));
