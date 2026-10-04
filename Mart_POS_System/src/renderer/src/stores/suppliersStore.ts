import { create } from 'zustand';
import type {
  SupplierRow,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierSearchParams,
  SupplierTransactionRow,
  RecordSupplierPaymentInput,
} from '@shared/types/purchases';
import { showToast } from '@renderer/components/ui/Toast';

interface SuppliersState {
  suppliers: SupplierRow[];
  isLoadingSuppliers: boolean;
  filters: SupplierSearchParams;
  selectedSupplier: SupplierRow | null;
  ledger: SupplierTransactionRow[];
  isLoadingLedger: boolean;
  error: string | null;

  setFilters: (filters: Partial<SupplierSearchParams>) => void;
  loadSuppliers: () => Promise<void>;
  selectSupplier: (supplier: SupplierRow | null) => void;
  loadLedger: (supplierId: number) => Promise<void>;
  createSupplier: (input: CreateSupplierInput) => Promise<SupplierRow | null>;
  updateSupplier: (input: UpdateSupplierInput) => Promise<boolean>;
  recordPayment: (input: RecordSupplierPaymentInput) => Promise<boolean>;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  suppliers: [],
  isLoadingSuppliers: false,
  filters: { is_active: true },
  selectedSupplier: null,
  ledger: [],
  isLoadingLedger: false,
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadSuppliers();
  },

  loadSuppliers: async () => {
    if (!window.martpos) return;
    set({ isLoadingSuppliers: true, error: null });
    try {
      const res = await window.martpos.suppliers.list(get().filters);
      if (res.success) {
        set({ suppliers: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingSuppliers: false });
    }
  },

  selectSupplier: (supplier) => {
    set({ selectedSupplier: supplier });
    if (supplier) {
      void get().loadLedger(supplier.id);
    } else {
      set({ ledger: [] });
    }
  },

  loadLedger: async (supplierId) => {
    if (!window.martpos) return;
    set({ isLoadingLedger: true });
    try {
      const res = await window.martpos.suppliers.getLedger(supplierId);
      if (res.success) {
        set({ ledger: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingLedger: false });
    }
  },

  createSupplier: async (input) => {
    if (!window.martpos) return null;
    const res = await window.martpos.suppliers.create(input);
    if (res.success) {
      showToast('success', `Supplier "${res.data.name}" added successfully`);
      void get().loadSuppliers();
      return res.data;
    }
    showToast('error', res.error);
    return null;
  },

  updateSupplier: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.suppliers.update(input);
    if (res.success) {
      showToast('success', 'Supplier updated successfully');
      void get().loadSuppliers();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  recordPayment: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.suppliers.recordPayment(input);
    if (res.success) {
      showToast('success', 'Supplier payment recorded');
      void get().loadSuppliers();
      if (get().selectedSupplier?.id === input.supplier_id) {
        void get().loadLedger(input.supplier_id);
      }
      return true;
    }
    showToast('error', res.error);
    return false;
  },
}));
