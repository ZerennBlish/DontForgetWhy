import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, generateCustomTheme, generateCustomThemeDual, type ThemeColors, type ThemeName } from './colors';
import { refreshWidgets } from '../widget/updateWidget';

const THEME_KEY = 'appTheme';
const CUSTOM_KEY = 'customTheme';

interface ThemeContextValue {
  colors: ThemeColors;
  themeName: ThemeName;
  customAccent: string | null;
  customBackground: string | null;
  setTheme: (name: ThemeName) => void;
  setCustomTheme: (accentHex: string, bgHex?: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: themes.midnight,
  themeName: 'midnight',
  customAccent: null,
  customBackground: null,
  setTheme: () => {},
  setCustomTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('midnight');
  const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(CUSTOM_KEY),
    ]).then(([savedName, savedCustom]) => {
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (typeof parsed === 'string') {
            setCustomAccent(parsed);
            setCustomColors(generateCustomTheme(parsed));
          } else {
            const obj = parsed as { accent: string; background?: string | null };
            setCustomAccent(obj.accent);
            if (obj.background) {
              setCustomBackground(obj.background);
              setCustomColors(generateCustomThemeDual(obj.background, obj.accent));
            } else {
              setCustomColors(generateCustomTheme(obj.accent));
            }
          }
        } catch {}
      }
      // Migrate old theme names to new ones
      const migrationMap: Record<string, string> = {
        obsidian: 'void',
        forest: 'neon',
        royal: 'ember',
        bubblegum: 'frost',
        sunshine: 'sand',
        ocean: 'frost',
        mint: 'frost',
        charcoal: 'void',
        amoled: 'void',
        slate: 'neon',
        paper: 'frost',
        cream: 'sand',
        arctic: 'frost',
      };
      if (savedName && savedName in migrationMap) {
        const newName = migrationMap[savedName];
        setThemeName(newName as ThemeName);
        AsyncStorage.setItem(THEME_KEY, newName);
      } else if (savedName === 'custom') {
        setThemeName('custom');
      } else if (savedName && savedName in themes) {
        setThemeName(savedName as ThemeName);
      }
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(THEME_KEY, name).then(() => {
      refreshWidgets().catch(() => {});
    });
  }, []);

  const setCustomTheme = useCallback((accentHex: string, bgHex?: string) => {
    const generated = bgHex
      ? generateCustomThemeDual(bgHex, accentHex)
      : generateCustomTheme(accentHex);
    setCustomColors(generated);
    setCustomAccent(accentHex);
    setCustomBackground(bgHex || null);
    setThemeName('custom');
    Promise.all([
      AsyncStorage.setItem(THEME_KEY, 'custom'),
      AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify({ accent: accentHex, background: bgHex || null })),
    ]).then(() => {
      refreshWidgets().catch(() => {});
    });
  }, []);

  const colors =
    themeName === 'custom' && customColors
      ? customColors
      : themeName !== 'custom'
        ? themes[themeName]
        : themes.midnight;

  return (
    <ThemeContext.Provider value={{ colors, themeName, customAccent, customBackground, setTheme, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
