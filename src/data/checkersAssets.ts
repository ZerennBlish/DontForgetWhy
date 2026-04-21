import { ImageSourcePropType } from 'react-native';
import { resolveIcon, type IconKey } from '../utils/iconResolver';

// Keys: 'r' = red piece, 'rk' = red king, 'b' = black piece, 'bk' = black king.
const CHECKER_KEY_MAP: Record<string, IconKey> = {
  r: 'checker.regular.light',
  rk: 'checker.king.light',
  b: 'checker.regular.dark',
  bk: 'checker.king.dark',
};

export function getCheckerImage(piece: { color: 'r' | 'b'; king: boolean }): ImageSourcePropType | undefined {
  const key = piece.king ? `${piece.color}k` : piece.color;
  const iconKey = CHECKER_KEY_MAP[key];
  if (!iconKey) return undefined;
  return resolveIcon(iconKey);
}
