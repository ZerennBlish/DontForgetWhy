import { useState, useEffect, useCallback } from 'react';
import {
  getIconTheme,
  setIconTheme,
  subscribeIconTheme,
  type IconTheme,
} from '../services/iconTheme';

export function useIconTheme(): {
  theme: IconTheme;
  setTheme: (t: IconTheme) => void;
} {
  const [theme, setThemeState] = useState<IconTheme>(() => getIconTheme());

  useEffect(() => {
    const current = getIconTheme();
    if (current !== theme) setThemeState(current);

    return subscribeIconTheme((newTheme) => {
      setThemeState(newTheme);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: IconTheme) => {
    setIconTheme(t);
  }, []);

  return { theme, setTheme };
}
