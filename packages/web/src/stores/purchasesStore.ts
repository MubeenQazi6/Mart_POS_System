import { create } from 'zustand';
import type {
  PurchaseRow,
  CreatePurchaseInput,
  PurchaseSearchParams,
  PurchaseKpis,
} from '@shared/types/purchases';
import { showToast } from '@renderer/components/ui/Toast';

interface PurchasesState {
  purchases: PurchaseRow[];
  isLoadingPurchases: boolean;
  filters: PurchaseSearchParams;
  selectedPurchase: PurchaseRow | null;
  isLoadingSelected: boolean;
  kpis: PurchaseKpis | null;
  isLoadingKpis: boolean;
  error: string | null;

  setFilters: (filters: Partial<PurchaseSearchParams>) => void;
  loadPurchases: () => Promise<void>;
  loadPurchaseById: (id: number) => Promise<void>;
  loadKpis: () => Promise<void>;
  createPurchase: (input: CreatePurchaseInput) => Promise<PurchaseRow | null>;
  clearSelected: () => void;
}

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  purchases: [],
  isLoadingPurchases: false,
  filters: {},
  selectedPurchase: null,
  isLoadingSelected: false,
  kpis: null,
  isLoadingKpis: false,
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadPurchases();
  },

  loadPurchases: async () => {
    if (!window.martpos) return;
    set({ isLoadingPurchases: true, error: null });
    try {
      const res = await window.martpos.purchases.list(get().filters);
      if (res.success) {
        set({ purchases: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingPurchases: false });
    }
  },

  loadPurchaseById: async (id) => {
    if (!window.martpos) return;
    set({ isLoadingSelected: true });
    try {
      const res = await window.martpos.purchases.getById(id);
      if (res.success) {
        set({ selectedPurchase: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingSelected: false });
    }
  },

  loadKpis: async () => {
    if (!window.martpos) return;
    set({ isLoadingKpis: true });
    try {
      const res = await window.martpos.purchases.getKpis();
      if (res.success) {
        set({ kpis: res.data });
      }
    } finally {
      set({ isLoadingKpis: false });
    }
  },

  createPurchase: async (input) => {
    if (!window.martpos) return null;
    const res = await window.martpos.purchases.create(input);
    if (res.success) {
      showToast('success', `Purchase order ${res.data.purchase_number} recorded successfully`);
      void get().loadPurchases();
      void get().loadKpis();
      return res.data;
    }
    showToast('error', res.error);
    return null;
  },

  clearSelected: () => {
    set({ selectedPurchase: null });
  },
}));
