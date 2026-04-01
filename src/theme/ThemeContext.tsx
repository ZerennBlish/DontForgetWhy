import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ocean: 'light',
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
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (!saved) return;
      if (saved in themes) {
        setThemeName(saved as ThemeName);
      } else if (saved in MIGRATION) {
        const migrated = MIGRATION[saved];
        setThemeName(migrated);
        AsyncStorage.setItem(THEME_KEY, migrated);
        // Clean up old custom theme data
        if (saved === 'custom') {
          AsyncStorage.removeItem('customTheme').catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(THEME_KEY, name).then(() => {
      refreshWidgets().catch(() => {});
    });
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
