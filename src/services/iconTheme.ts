import { kvGet, kvSet } from './database';

export type IconTheme = 'mixed' | 'chrome' | 'anthropomorphic';

const KEY = 'iconTheme';
const DEFAULT: IconTheme = 'mixed';

let cached: IconTheme | null = null;

export function getIconTheme(): IconTheme {
  if (cached !== null) return cached;
  try {
    const raw = kvGet(KEY);
    const value: IconTheme =
      raw === 'chrome' ? 'chrome' :
      raw === 'anthropomorphic' ? 'anthropomorphic' :
      DEFAULT;
    cached = value;
    return value;
  } catch {
    return DEFAULT;
  }
}

export function setIconTheme(theme: IconTheme): void {
  cached = theme;
  try {
    kvSet(KEY, theme);
  } catch (e) {
    console.error('[iconTheme] Failed to persist:', e);
  }
}

export function refreshIconThemeCache(): void {
  cached = null;
}

export function iconThemeDisplayName(theme: IconTheme): string {
  if (theme === 'chrome') return 'Chrome';
  if (theme === 'anthropomorphic') return 'Toon';
  return 'Mixed';
}
