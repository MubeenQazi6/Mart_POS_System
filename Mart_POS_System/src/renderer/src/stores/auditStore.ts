import { create } from 'zustand';
import type { AuditLogRow, AuditLogFilters } from '@shared/types/auth';
import { showToast } from '@renderer/components/ui/Toast';

interface AuditState {
  logs: AuditLogRow[];
  isLoading: boolean;
  filters: AuditLogFilters;
  error: string | null;

  setFilters: (filters: Partial<AuditLogFilters>) => void;
  loadLogs: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  isLoading: false,
  filters: {},
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadLogs();
  },

  loadLogs: async () => {
    if (!window.martpos) return;
    set({ isLoading: true, error: null });
    try {
      const res = await window.martpos.audit.list(get().filters);
      if (res.success) {
        set({ logs: res.data });
      } else {
        set({ error: res.error });
        showToast('error', res.error);
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
