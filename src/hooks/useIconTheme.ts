import { useState, useCallback } from 'react';
import {
  getIconTheme,
  setIconTheme,
  type IconTheme,
} from '../services/iconTheme';

export function useIconTheme(): {
  theme: IconTheme;
  setTheme: (t: IconTheme) => void;
} {
  const [theme, setThemeState] = useState<IconTheme>(() => getIconTheme());

  const setTheme = useCallback((t: IconTheme) => {
    setIconTheme(t);
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
