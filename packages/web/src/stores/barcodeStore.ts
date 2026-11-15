import { create } from 'zustand';
import type {
  PrintJobRow,
  CreatePrintJobInput,
  PrintJobSearchParams,
  PrintJobStatus,
  BarcodeRow,
} from '@shared/types/catalog';
import { showToast } from '@renderer/components/ui/Toast';

interface BarcodeState {
  printJobs: PrintJobRow[];
  isLoadingJobs: boolean;
  isGeneratingBarcode: boolean;
  statusFilter: PrintJobStatus | 'all';
  searchQuery: string;

  // Actions
  setStatusFilter: (status: PrintJobStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  loadPrintJobs: (params?: PrintJobSearchParams) => Promise<void>;
  createPrintJob: (input: CreatePrintJobInput) => Promise<boolean>;
  updatePrintJobStatus: (id: number, status: PrintJobStatus) => Promise<boolean>;
  retryPrintJob: (id: number) => Promise<boolean>;
  clearPrintedJobs: () => Promise<boolean>;
  generateInternalBarcode: (variantId: number) => Promise<BarcodeRow | null>;
}

export const useBarcodeStore = create<BarcodeState>((set, get) => ({
  printJobs: [],
  isLoadingJobs: false,
  isGeneratingBarcode: false,
  statusFilter: 'all',
  searchQuery: '',

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    void get().loadPrintJobs();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    void get().loadPrintJobs();
  },

  loadPrintJobs: async (params) => {
    if (!window.martpos) return;
    set({ isLoadingJobs: true });
    try {
      const filter = get().statusFilter;
      const search = get().searchQuery;
      const searchParams: PrintJobSearchParams = {
        ...(filter !== 'all' && { status: filter }),
        ...(search.trim() && { search: search.trim() }),
        ...params,
      };

      const res = await window.martpos.printJobs.list(searchParams);
      if (res.success) {
        set({ printJobs: res.data });
      } else {
        showToast('error', res.error);
      }
    } finally {
      set({ isLoadingJobs: false });
    }
  },

  createPrintJob: async (input) => {
    if (!window.martpos) return false;
    const res = await window.martpos.printJobs.create(input);
    if (res.success) {
      showToast('success', `Added ${String(input.quantity)} label(s) to print queue`);
      void get().loadPrintJobs();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  updatePrintJobStatus: async (id, status) => {
    if (!window.martpos) return false;
    const res = await window.martpos.printJobs.updateStatus(id, status);
    if (res.success) {
      showToast('info', `Job marked as ${status}`);
      void get().loadPrintJobs();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  retryPrintJob: async (id) => {
    if (!window.martpos) return false;
    const res = await window.martpos.printJobs.retry(id);
    if (res.success) {
      showToast('success', 'Job queued for retry');
      void get().loadPrintJobs();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  clearPrintedJobs: async () => {
    if (!window.martpos) return false;
    const res = await window.martpos.printJobs.clearPrinted();
    if (res.success) {
      showToast('info', `Cleared ${String(res.data.clearedCount)} printed job(s)`);
      void get().loadPrintJobs();
      return true;
    }
    showToast('error', res.error);
    return false;
  },

  generateInternalBarcode: async (variantId) => {
    if (!window.martpos) return null;
    set({ isGeneratingBarcode: true });
    try {
      const res = await window.martpos.barcodes.generateInternal(variantId);
      if (res.success) {
        showToast('success', `Generated internal barcode ${res.data.barcode}`);
        return res.data;
      }
      showToast('error', res.error);
      return null;
    } finally {
      set({ isGeneratingBarcode: false });
    }
  },
}));
