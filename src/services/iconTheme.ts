import { kvGet, kvSet } from './database';
import { isProUser } from './proStatus';

export type IconTheme = 'mixed' | 'chrome' | 'anthropomorphic';

const KEY = 'iconTheme';
const DEFAULT: IconTheme = 'mixed';

let cached: IconTheme | null = null;

type Listener = (theme: IconTheme) => void;
const listeners: Set<Listener> = new Set();

export function getIconTheme(): IconTheme {
  if (cached !== null) {
    if (cached !== 'mixed' && !isProUser()) return 'mixed';
    return cached;
  }
  try {
    const raw = kvGet(KEY);
    const value: IconTheme =
      raw === 'chrome' ? 'chrome' :
      raw === 'anthropomorphic' ? 'anthropomorphic' :
      DEFAULT;
    cached = value;
    if (value !== 'mixed' && !isProUser()) return 'mixed';
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
  listeners.forEach((fn) => fn(theme));
}

export function subscribeIconTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function refreshIconThemeCache(): void {
  cached = null;
}

export function iconThemeDisplayName(theme: IconTheme): string {
  if (theme === 'chrome') return 'Chrome';
  if (theme === 'anthropomorphic') return 'Toon';
  return 'Mixed';
}
