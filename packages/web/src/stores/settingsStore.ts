import { create } from 'zustand';
import { settingsApi } from '@/lib/apiClient';

interface SettingsState {
  settings: Record<string, string>;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  setManySettings: (entries: Record<string, string>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await settingsApi.getAll();
      if (res.success) {
        set({ settings: res.data as Record<string, string> });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setSetting: async (key, value) => {
    await settingsApi.set(key, value);
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },

  setManySettings: async (entries) => {
    await settingsApi.setMany(entries);
    set((state) => ({ settings: { ...state.settings, ...entries } }));
  },
}));

// Helper to read a setting
export const getSetting = (key: string, defaultValue = '') =>
  useSettingsStore.getState().settings[key] ?? defaultValue;
