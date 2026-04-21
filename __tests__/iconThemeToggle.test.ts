// Tests for the Pro-gated Icon Style toggle (Phase 4).
// Covers the service layer flow driven by the SettingsScreen segmented
// control: default state, persistence for each of the three themes,
// cycling between themes, and the display-name mapping used by the UI.

let kvStore: Record<string, string | null> = {};

jest.mock('../src/services/database', () => ({
  __esModule: true,
  kvGet: jest.fn((key: string) => kvStore[key] ?? null),
  kvSet: jest.fn((key: string, value: string) => {
    kvStore[key] = value;
  }),
}));

import {
  getIconTheme,
  setIconTheme,
  refreshIconThemeCache,
  iconThemeDisplayName,
  type IconTheme,
} from '../src/services/iconTheme';

beforeEach(() => {
  kvStore = {};
  refreshIconThemeCache();
});

// ── Default state ─────────────────────────────────────────────────

describe('iconTheme toggle — default state', () => {
  it('defaults to "mixed" when nothing has been set', () => {
    expect(getIconTheme()).toBe('mixed');
  });

  it('defaults to "mixed" after the cache is cleared and kv is empty', () => {
    refreshIconThemeCache();
    expect(getIconTheme()).toBe('mixed');
  });
});

// ── Selecting each of the three themes ────────────────────────────

describe('iconTheme toggle — changing selection', () => {
  it('persists and returns "chrome" after setIconTheme("chrome")', () => {
    setIconTheme('chrome');
    expect(kvStore.iconTheme).toBe('chrome');
    expect(getIconTheme()).toBe('chrome');
  });

  it('persists and returns "anthropomorphic" after setIconTheme("anthropomorphic")', () => {
    setIconTheme('anthropomorphic');
    expect(kvStore.iconTheme).toBe('anthropomorphic');
    expect(getIconTheme()).toBe('anthropomorphic');
  });

  it('persists and returns "mixed" after explicitly setting it', () => {
    setIconTheme('chrome');
    setIconTheme('mixed');
    expect(kvStore.iconTheme).toBe('mixed');
    expect(getIconTheme()).toBe('mixed');
  });
});

// ── Cycling through themes (user toggling between segments) ───────

describe('iconTheme toggle — cycle through all themes', () => {
  it('mixed → chrome → anthropomorphic → mixed round-trips cleanly', () => {
    expect(getIconTheme()).toBe('mixed');

    setIconTheme('chrome');
    expect(getIconTheme()).toBe('chrome');

    setIconTheme('anthropomorphic');
    expect(getIconTheme()).toBe('anthropomorphic');

    setIconTheme('mixed');
    expect(getIconTheme()).toBe('mixed');
  });

  it('each setIconTheme call writes the new value to kv', () => {
    const themes: IconTheme[] = ['chrome', 'anthropomorphic', 'mixed', 'chrome'];
    for (const t of themes) {
      setIconTheme(t);
      expect(kvStore.iconTheme).toBe(t);
    }
  });
});

// ── Persistence across app restarts (cache refresh simulates relaunch) ──

describe('iconTheme toggle — persistence across app restart', () => {
  it('chrome persists through a cache refresh (simulated relaunch)', () => {
    setIconTheme('chrome');
    refreshIconThemeCache();
    expect(getIconTheme()).toBe('chrome');
  });

  it('anthropomorphic persists through a cache refresh', () => {
    setIconTheme('anthropomorphic');
    refreshIconThemeCache();
    expect(getIconTheme()).toBe('anthropomorphic');
  });

  it('mixed persists through a cache refresh when explicitly set', () => {
    setIconTheme('chrome');
    setIconTheme('mixed');
    refreshIconThemeCache();
    expect(getIconTheme()).toBe('mixed');
  });
});

// ── Display name helper (used for segmented control labels) ───────

describe('iconThemeDisplayName', () => {
  it('maps "mixed" → "Mixed"', () => {
    expect(iconThemeDisplayName('mixed')).toBe('Mixed');
  });

  it('maps "chrome" → "Chrome"', () => {
    expect(iconThemeDisplayName('chrome')).toBe('Chrome');
  });

  it('maps "anthropomorphic" → "Toon" (user-friendly label)', () => {
    expect(iconThemeDisplayName('anthropomorphic')).toBe('Toon');
  });
});
