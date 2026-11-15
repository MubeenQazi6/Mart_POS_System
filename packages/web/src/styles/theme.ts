import type { ThemeAccent, ThemeMode } from '@shared/types/settings';

export interface ThemeColors {
  name: string;
  accent: ThemeAccent;
  previewColor: string;
  palette: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  variables: {
    '--color-primary': string;
    '--color-primary-hover': string;
    '--color-primary-active': string;
    '--color-primary-soft': string;
    '--color-primary-soft-text': string;
    '--color-primary-border': string;
    '--color-primary-ring': string;
    '--color-primary-gradient': string;
    '--color-primary-contrast': string;
  };
}

export const THEME_ACCENTS: Record<ThemeAccent, ThemeColors> = {
  emerald: {
    name: 'Emerald (Default)',
    accent: 'emerald',
    previewColor: '#059669',
    palette: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
    },
    variables: {
      '--color-primary': '#059669',
      '--color-primary-hover': '#047857',
      '--color-primary-active': '#065f46',
      '--color-primary-soft': '#ecfdf5',
      '--color-primary-soft-text': '#065f46',
      '--color-primary-border': '#a7f3d0',
      '--color-primary-ring': '#10b981',
      '--color-primary-gradient': 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
  blue: {
    name: 'Ocean Blue',
    accent: 'blue',
    previewColor: '#2563eb',
    palette: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    variables: {
      '--color-primary': '#2563eb',
      '--color-primary-hover': '#1d4ed8',
      '--color-primary-active': '#1e40af',
      '--color-primary-soft': '#eff6ff',
      '--color-primary-soft-text': '#1e40af',
      '--color-primary-border': '#bfdbfe',
      '--color-primary-ring': '#3b82f6',
      '--color-primary-gradient': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
  violet: {
    name: 'Royal Violet',
    accent: 'violet',
    previewColor: '#7c3aed',
    palette: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065',
    },
    variables: {
      '--color-primary': '#7c3aed',
      '--color-primary-hover': '#6d28d9',
      '--color-primary-active': '#5b21b6',
      '--color-primary-soft': '#f5f3ff',
      '--color-primary-soft-text': '#5b21b6',
      '--color-primary-border': '#ddd6fe',
      '--color-primary-ring': '#8b5cf6',
      '--color-primary-gradient': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
  orange: {
    name: 'Vibrant Orange',
    accent: 'orange',
    previewColor: '#ea580c',
    palette: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
    },
    variables: {
      '--color-primary': '#ea580c',
      '--color-primary-hover': '#c2410c',
      '--color-primary-active': '#9a3412',
      '--color-primary-soft': '#fff7ed',
      '--color-primary-soft-text': '#9a3412',
      '--color-primary-border': '#fed7aa',
      '--color-primary-ring': '#f97316',
      '--color-primary-gradient': 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
  rose: {
    name: 'Ruby Rose',
    accent: 'rose',
    previewColor: '#e11d48',
    palette: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519',
    },
    variables: {
      '--color-primary': '#e11d48',
      '--color-primary-hover': '#be123c',
      '--color-primary-active': '#9f1239',
      '--color-primary-soft': '#fff1f2',
      '--color-primary-soft-text': '#9f1239',
      '--color-primary-border': '#fecdd3',
      '--color-primary-ring': '#f43f5e',
      '--color-primary-gradient': 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
  cyan: {
    name: 'Tech Cyan',
    accent: 'cyan',
    previewColor: '#0891b2',
    palette: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      950: '#083344',
    },
    variables: {
      '--color-primary': '#0891b2',
      '--color-primary-hover': '#0e7490',
      '--color-primary-active': '#155e75',
      '--color-primary-soft': '#ecfeff',
      '--color-primary-soft-text': '#155e75',
      '--color-primary-border': '#a5f3fc',
      '--color-primary-ring': '#06b6d4',
      '--color-primary-gradient': 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      '--color-primary-contrast': '#ffffff',
    },
  },
};

/**
 * Apply theme variables to document root element
 */
export function applyThemeToDOM(accent: ThemeAccent, mode: ThemeMode): void {
  const root = document.documentElement;
  const theme = THEME_ACCENTS[accent] ?? THEME_ACCENTS.emerald;

  // Set CSS variables for brand/primary tokens
  Object.entries(theme.variables).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set full 50-950 palette CSS variables for brand
  Object.entries(theme.palette).forEach(([step, colorHex]) => {
    root.style.setProperty(`--color-brand-${step}`, colorHex);
  });

  // Set data-theme and data-mode attributes
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-mode', mode);

  // Handle dark mode class on <html>
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    // System mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
