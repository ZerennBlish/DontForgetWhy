const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
  kvRemove: (key: string) => { kvStore.delete(key); },
}));

import {
  loadSettings, saveSettings,
  getOnboardingComplete, setOnboardingComplete,
  getDefaultTimerSound, saveDefaultTimerSound,
  getSilenceAll, setSilenceAll, getSilenceExpiry,
} from '../src/services/settings';

beforeEach(() => {
  kvStore.clear();
});

// ── loadSettings ────────────────────────────────────────────────

describe('loadSettings', () => {
  it('returns defaults when no stored data', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: false,
      timeFormat: '12h',
      timeInputMode: 'scroll',
    });
  });

  it('returns defaults when stored data is invalid JSON', async () => {
    kvStore.set('appSettings', '{broken');
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: false,
      timeFormat: '12h',
      timeInputMode: 'scroll',
    });
  });

  it('returns stored values when valid JSON', async () => {
    kvStore.set('appSettings', JSON.stringify({
      guessWhyEnabled: true,
      timeFormat: '24h',
      timeInputMode: 'type',
    }));
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: true,
      timeFormat: '24h',
      timeInputMode: 'type',
    });
  });

  it('falls back to defaults for individual invalid fields', async () => {
    kvStore.set('appSettings', JSON.stringify({
      guessWhyEnabled: 'not-a-boolean',
      timeFormat: 'bogus',
      timeInputMode: 42,
    }));
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: false,
      timeFormat: '12h',
      timeInputMode: 'scroll',
    });
  });

  it('falls back to defaults for missing fields', async () => {
    kvStore.set('appSettings', JSON.stringify({}));
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: false,
      timeFormat: '12h',
      timeInputMode: 'scroll',
    });
  });

  it('handles mixed valid/invalid fields', async () => {
    kvStore.set('appSettings', JSON.stringify({
      guessWhyEnabled: true,
      timeFormat: 'invalid',
      timeInputMode: 'type',
    }));
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: true,
      timeFormat: '12h',
      timeInputMode: 'type',
    });
  });
});

// ── saveSettings ────────────────────────────────────────────────

describe('saveSettings', () => {
  it('saves partial update (only changes specified fields)', async () => {
    kvStore.set('appSettings', JSON.stringify({
      guessWhyEnabled: false,
      timeFormat: '12h',
      timeInputMode: 'scroll',
    }));
    await saveSettings({ timeFormat: '24h' });
    const settings = await loadSettings();
    expect(settings.timeFormat).toBe('24h');
    expect(settings.guessWhyEnabled).toBe(false);
    expect(settings.timeInputMode).toBe('scroll');
  });

  it('preserves existing fields not in the partial', async () => {
    kvStore.set('appSettings', JSON.stringify({
      guessWhyEnabled: true,
      timeFormat: '24h',
      timeInputMode: 'type',
    }));
    await saveSettings({ guessWhyEnabled: false });
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: false,
      timeFormat: '24h',
      timeInputMode: 'type',
    });
  });

  it('full overwrite works', async () => {
    await saveSettings({
      guessWhyEnabled: true,
      timeFormat: '24h',
      timeInputMode: 'type',
    });
    const settings = await loadSettings();
    expect(settings).toEqual({
      guessWhyEnabled: true,
      timeFormat: '24h',
      timeInputMode: 'type',
    });
  });
});

// ── Onboarding ──────────────────────────────────────────────────

describe('getOnboardingComplete', () => {
  it('returns false when no stored data', async () => {
    expect(await getOnboardingComplete()).toBe(false);
  });

  it('returns true when stored "true"', async () => {
    kvStore.set('onboardingComplete', 'true');
    expect(await getOnboardingComplete()).toBe(true);
  });

  it('returns false when stored anything else', async () => {
    kvStore.set('onboardingComplete', 'false');
    expect(await getOnboardingComplete()).toBe(false);
    kvStore.set('onboardingComplete', 'yes');
    expect(await getOnboardingComplete()).toBe(false);
  });
});

describe('setOnboardingComplete', () => {
  it('stores "true"', async () => {
    await setOnboardingComplete();
    expect(kvStore.get('onboardingComplete')).toBe('true');
  });
});

// ── Default timer sound ─────────────────────────────────────────

describe('getDefaultTimerSound', () => {
  it('returns nulls when no data', async () => {
    expect(await getDefaultTimerSound()).toEqual({ uri: null, name: null, soundID: null });
  });

  it('returns stored values when valid', async () => {
    kvStore.set('defaultTimerSound', JSON.stringify({ uri: 'file://a.mp3', name: 'Bell', soundID: 5 }));
    expect(await getDefaultTimerSound()).toEqual({ uri: 'file://a.mp3', name: 'Bell', soundID: 5 });
  });

  it('returns null for individual fields with wrong types', async () => {
    kvStore.set('defaultTimerSound', JSON.stringify({ uri: 42, name: true, soundID: 'nope' }));
    expect(await getDefaultTimerSound()).toEqual({ uri: null, name: null, soundID: null });
  });
});

describe('saveDefaultTimerSound', () => {
  it('stores the sound object as JSON', async () => {
    await saveDefaultTimerSound({ uri: 'file://b.mp3', name: 'Chime', soundID: 3 });
    const stored = JSON.parse(kvStore.get('defaultTimerSound')!);
    expect(stored).toEqual({ uri: 'file://b.mp3', name: 'Chime', soundID: 3 });
  });
});

// ── Silence All ─────────────────────────────────────────────────

describe('getSilenceAll', () => {
  it('returns false when no stored data', async () => {
    expect(await getSilenceAll()).toBe(false);
  });

  it('returns true when enabled without expiry', async () => {
    kvStore.set('silenceAllAlarms', JSON.stringify({ enabled: true, expiresAt: null }));
    expect(await getSilenceAll()).toBe(true);
  });

  it('returns false when enabled but expired', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-04T12:00:00Z'));
    kvStore.set('silenceAllAlarms', JSON.stringify({
      enabled: true,
      expiresAt: '2026-04-04T11:00:00.000Z', // 1 hour ago
    }));
    expect(await getSilenceAll()).toBe(false);
    // Should have cleaned up the key
    expect(kvStore.has('silenceAllAlarms')).toBe(false);
    jest.useRealTimers();
  });

  it('returns true when enabled with future expiry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-04T12:00:00Z'));
    kvStore.set('silenceAllAlarms', JSON.stringify({
      enabled: true,
      expiresAt: '2026-04-04T13:00:00.000Z', // 1 hour from now
    }));
    expect(await getSilenceAll()).toBe(true);
    jest.useRealTimers();
  });

  it('returns false when not enabled', async () => {
    kvStore.set('silenceAllAlarms', JSON.stringify({ enabled: false, expiresAt: null }));
    expect(await getSilenceAll()).toBe(false);
  });
});

describe('setSilenceAll', () => {
  it('stores enabled with duration', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-04T12:00:00Z'));
    await setSilenceAll(true, 30);
    const stored = JSON.parse(kvStore.get('silenceAllAlarms')!);
    expect(stored.enabled).toBe(true);
    expect(stored.expiresAt).toBe('2026-04-04T12:30:00.000Z');
    jest.useRealTimers();
  });

  it('stores enabled without duration (expiresAt null)', async () => {
    await setSilenceAll(true);
    const stored = JSON.parse(kvStore.get('silenceAllAlarms')!);
    expect(stored.enabled).toBe(true);
    expect(stored.expiresAt).toBeNull();
  });

  it('removes key when disabled', async () => {
    kvStore.set('silenceAllAlarms', JSON.stringify({ enabled: true, expiresAt: null }));
    await setSilenceAll(false);
    expect(kvStore.has('silenceAllAlarms')).toBe(false);
  });
});

describe('getSilenceExpiry', () => {
  it('returns null when no data', async () => {
    expect(await getSilenceExpiry()).toBeNull();
  });

  it('returns null when not enabled', async () => {
    kvStore.set('silenceAllAlarms', JSON.stringify({ enabled: false, expiresAt: null }));
    expect(await getSilenceExpiry()).toBeNull();
  });

  it('returns remaining minutes when enabled with future expiry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-04T12:00:00Z'));
    kvStore.set('silenceAllAlarms', JSON.stringify({
      enabled: true,
      expiresAt: '2026-04-04T12:45:00.000Z', // 45 min from now
    }));
    expect(await getSilenceExpiry()).toBe(45);
    jest.useRealTimers();
  });

  it('returns null and cleans up when expired', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-04T12:00:00Z'));
    kvStore.set('silenceAllAlarms', JSON.stringify({
      enabled: true,
      expiresAt: '2026-04-04T11:00:00.000Z', // 1 hour ago
    }));
    expect(await getSilenceExpiry()).toBeNull();
    expect(kvStore.has('silenceAllAlarms')).toBe(false);
    jest.useRealTimers();
  });

  it('returns null when enabled without expiry', async () => {
    kvStore.set('silenceAllAlarms', JSON.stringify({ enabled: true, expiresAt: null }));
    expect(await getSilenceExpiry()).toBeNull();
  });
});
