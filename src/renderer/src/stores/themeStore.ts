import { create } from 'zustand';
import type { ThemeAccent, ThemeMode } from '@shared/types/settings';
import { applyThemeToDOM } from '@renderer/styles/theme';
import { useSettingsStore } from './settingsStore';

interface ThemeState {
  accent: ThemeAccent;
  mode: ThemeMode;
  setAccent: (accent: ThemeAccent) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  initTheme: (accent?: ThemeAccent, mode?: ThemeMode) => void;
}

// Initial reading from local storage / memory fallback
const savedAccent = (localStorage.getItem('martpos_theme_accent') as ThemeAccent) || 'emerald';
const savedMode = (localStorage.getItem('martpos_theme_mode') as ThemeMode) || 'light';

// Immediately apply to DOM on script evaluation to prevent any flash of unstyled content
applyThemeToDOM(savedAccent, savedMode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  accent: savedAccent,
  mode: savedMode,

  initTheme: (accent?: ThemeAccent, mode?: ThemeMode) => {
    const nextAccent = accent || get().accent;
    const nextMode = mode || get().mode;

    localStorage.setItem('martpos_theme_accent', nextAccent);
    localStorage.setItem('martpos_theme_mode', nextMode);

    applyThemeToDOM(nextAccent, nextMode);
    set({ accent: nextAccent, mode: nextMode });
  },

  setAccent: async (accent: ThemeAccent) => {
    // 1. Immediately apply to DOM for zero-latency UI response
    applyThemeToDOM(accent, get().mode);
    localStorage.setItem('martpos_theme_accent', accent);
    set({ accent });

    // 2. Persist in settings store and SQLite
    const settingsStore = useSettingsStore.getState();
    settingsStore.updateSetting('theme.accent', accent);
    await settingsStore.saveSettings();
  },

  setMode: async (mode: ThemeMode) => {
    // 1. Immediately apply to DOM
    applyThemeToDOM(get().accent, mode);
    localStorage.setItem('martpos_theme_mode', mode);
    set({ mode });

    // 2. Persist in settings store and SQLite
    const settingsStore = useSettingsStore.getState();
    settingsStore.updateSetting('theme.mode', mode);
    await settingsStore.saveSettings();
  },
}));
