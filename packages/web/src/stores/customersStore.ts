import { create } from 'zustand';
import type {
  CustomerRow,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchParams,
  CustomerTransactionRow,
  RecordCustomerPaymentInput,
  CustomerKpis,
} from '@shared/types/customers';
import { showToast } from '@renderer/components/ui/Toast';

interface CustomersState {
  customers: CustomerRow[];
  isLoadingCustomers: boolean;
  filters: CustomerSearchParams;
  selectedCustomer: CustomerRow | null;
  ledger: CustomerTransactionRow[];
  isLoadingLedger: boolean;
  kpis: CustomerKpis | null;
  isLoadingKpis: boolean;
  error: string | null;

  setFilters: (filters: Partial<CustomerSearchParams>) => void;
  loadCustomers: () => Promise<void>;
  selectCustomer: (customer: CustomerRow | null) => void;
  loadLedger: (customerId: number) => Promise<void>;
  loadKpis: () => Promise<void>;
  createCustomer: (input: CreateCustomerInput) => Promise<CustomerRow | null>;
  updateCustomer: (input: UpdateCustomerInput) => Promise<boolean>;
  recordPayment: (input: RecordCustomerPaymentInput) => Promise<boolean>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoadingCustomers: false,
  filters: { is_active: true },
  selectedCustomer: null,
  ledger: [],
  isLoadingLedger: false,
  kpis: null,
  isLoadingKpis: false,
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadCustomers();
  },

  loadCustomers: async () => {
    if (!window.martpos) return;
    set({ isLoadingCustomers: true, error: null });
    try {
      const res = await window.martpos.customers.list(get().filters);
      if (res.success) {
        set({ customers: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingCustomers: false });
    }
  },

  selectCustomer: (customer) => {
    set({ selectedCustomer: customer });
    if (customer) {
      void get().loadLedger(customer.id);
    } else {
      set({ ledger: [] });
    }
  },

  loadLedger: async (customerId) => {
    if (!window.martpos) return;
    set({ isLoadingLedger: true });
    try {
      const res = await window.martpos.customers.getLedger(customerId);
      if (res.success) {
        set({ ledger: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingLedger: false });
    }
  },

  loadKpis: async () => {
    if (!window.martpos) return;
    set({ isLoadingKpis: true });
    try {
      const res = await window.martpos.customers.getKpis();
      if (res.success) {
        set({ kpis: res.data });
      }
    } finally {
      set({ isLoadingKpis: false });
    }
  },

  createCustomer: async (input) => {
    if (!window.martpos) return null;
    const res = await window.martpos.customers.create(input);
    if (res.success) {
      showToast('success', `Customer "${res.data.name}" registered successfully`);
      void get().loadCustomers();
      void get().loadKpis();
      return res.data;
    }
    showToast('error', res.error);
    return null;
  },

  updateCustomer: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.customers.update(input);
    if (res.success) {
      showToast('success', 'Customer profile updated');
      void get().loadCustomers();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  recordPayment: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.customers.recordPayment(input);
    if (res.success) {
      showToast('success', 'Khata payment collected and credited');
      void get().loadCustomers();
      void get().loadKpis();
      if (get().selectedCustomer?.id === input.customer_id) {
        void get().loadLedger(input.customer_id);
      }
      return true;
    }
    showToast('error', res.error);
    return false;
  },
}));
