import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, generateCustomTheme, type ThemeColors, type ThemeName } from './colors';

const THEME_KEY = 'appTheme';
const CUSTOM_KEY = 'customTheme';

interface ThemeContextValue {
  colors: ThemeColors;
  themeName: ThemeName;
  customAccent: string | null;
  setTheme: (name: ThemeName) => void;
  setCustomTheme: (accentHex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: themes.midnight,
  themeName: 'midnight',
  customAccent: null,
  setTheme: () => {},
  setCustomTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('midnight');
  const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(CUSTOM_KEY),
    ]).then(([savedName, savedCustom]) => {
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom) as { accent: string };
          setCustomAccent(parsed.accent);
          setCustomColors(generateCustomTheme(parsed.accent));
        } catch {}
      }
      if (savedName === 'custom') {
        setThemeName('custom');
      } else if (savedName && savedName in themes) {
        setThemeName(savedName as ThemeName);
      }
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(THEME_KEY, name);
  }, []);

  const setCustomTheme = useCallback((accentHex: string) => {
    const generated = generateCustomTheme(accentHex);
    setCustomColors(generated);
    setCustomAccent(accentHex);
    setThemeName('custom');
    AsyncStorage.setItem(THEME_KEY, 'custom');
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify({ accent: accentHex }));
  }, []);

  const colors =
    themeName === 'custom' && customColors
      ? customColors
      : themeName !== 'custom'
        ? themes[themeName]
        : themes.midnight;

  return (
    <ThemeContext.Provider value={{ colors, themeName, customAccent, setTheme, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
