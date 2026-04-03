import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { kvGet, kvSet, kvRemove } from '../services/database';
import { themes, type ThemeColors, type ThemeName } from './colors';
import { refreshWidgets } from '../widget/updateWidget';

const THEME_KEY = 'appTheme';

interface ThemeContextValue {
  colors: ThemeColors;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: themes.dark,
  themeName: 'dark',
  setTheme: () => {},
});

// Migration map: all old theme names → new theme names
const MIGRATION: Record<string, ThemeName> = {
  midnight: 'dark',
  ember: 'dark',
  neon: 'dark',
  void: 'dark',
  frost: 'light',
  sand: 'light',
  custom: 'dark',
  // Legacy names from before the 6-theme era
  obsidian: 'dark',
  forest: 'dark',
  royal: 'dark',
  bubblegum: 'light',
  sunshine: 'light',
  mint: 'light',
  charcoal: 'dark',
  amoled: 'dark',
  slate: 'dark',
  paper: 'light',
  cream: 'light',
  arctic: 'light',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('dark');

  useEffect(() => {
    const saved = kvGet(THEME_KEY);
    if (!saved) return;
    if (saved in themes) {
      setThemeName(saved as ThemeName);
    } else if (saved in MIGRATION) {
      const migrated = MIGRATION[saved];
      setThemeName(migrated);
      kvSet(THEME_KEY, migrated);
      if (saved === 'custom') {
        kvRemove('customTheme');
      }
    }
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    kvSet(THEME_KEY, name);
    refreshWidgets().catch(() => {});
  }, []);

  const colors = themes[themeName];

  return (
    <ThemeContext.Provider value={{ colors, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
