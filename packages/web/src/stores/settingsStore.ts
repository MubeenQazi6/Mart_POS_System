import { create } from 'zustand';
import type { AppSettings } from '@shared/types/settings';
import { DEFAULT_SETTINGS } from '@shared/types/settings';
import { showToast } from '@renderer/components/ui/Toast';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  saveSettings: () => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,
  isSaving: false,

  loadSettings: async () => {
    if (!window.martpos) return;
    set({ isLoading: true });
    try {
      const res = await window.martpos.settings.getAll();
      if (res.success && res.data) {
        set({
          settings: {
            ...DEFAULT_SETTINGS,
            ...(res.data as unknown as Partial<AppSettings>),
          },
        });
      }
    } catch {
      // Keep defaults
    } finally {
      set({ isLoading: false });
    }
  },

  updateSetting: (key, value) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));
  },

  saveSettings: async () => {
    if (get().isSaving || !window.martpos) return false;
    set({ isSaving: true });
    try {
      const current = get().settings;
      const res = await window.martpos.settings.setMany(current as unknown as Record<string, unknown>);
      if (res.success) {
        showToast('success', 'Settings saved successfully');
        return true;
      }
      showToast('error', res.error ?? 'Failed to save settings');
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Atomically resets all application settings to DEFAULT_SETTINGS, persists them
   * directly to the database in one operation, shows a success toast, and updates local state.
   *
   * NOTE: This action ONLY touches AppSettings keys and NEVER touches licensing
   * (useLicensingStore) or backup schedules/history (useBackupStore).
   */
  resetToDefaults: async () => {
    if (get().isSaving || !window.martpos) return false;
    set({ isSaving: true });
    try {
      const res = await window.martpos.settings.setMany(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
      if (res.success) {
        set({ settings: { ...DEFAULT_SETTINGS } });
        showToast('success', 'Settings reset to factory defaults');
        return true;
      }
      showToast('error', res.error ?? 'Failed to reset settings');
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reset settings');
      return false;
    } finally {
      set({ isSaving: false });
    }
  },
}));
