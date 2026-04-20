import { useMemo } from 'react';
import { ImageSourcePropType } from 'react-native';
import { resolveIconWithTheme, type IconKey } from '../utils/iconResolver';
import { useIconTheme } from './useIconTheme';

export function useAppIcon(key: IconKey): ImageSourcePropType {
  const { theme } = useIconTheme();
  return useMemo(() => resolveIconWithTheme(key, theme), [key, theme]);
}
