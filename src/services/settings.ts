import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appSettings';

export interface AppSettings {
  guessWhyEnabled: boolean;
  timeFormat: '12h' | '24h';
}

const defaultSettings: AppSettings = {
  guessWhyEnabled: true,
  timeFormat: '12h',
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultSettings };
  try {
    const parsed = JSON.parse(raw);
    return {
      guessWhyEnabled:
        typeof parsed.guessWhyEnabled === 'boolean'
          ? parsed.guessWhyEnabled
          : defaultSettings.guessWhyEnabled,
      timeFormat:
        parsed.timeFormat === '12h' || parsed.timeFormat === '24h'
          ? parsed.timeFormat
          : defaultSettings.timeFormat,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

const ONBOARDING_KEY = 'onboardingComplete';

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

// --- Default timer sound ---

const DEFAULT_TIMER_SOUND_KEY = 'defaultTimerSound';

export interface TimerSoundSetting {
  uri: string | null;
  name: string | null;
  soundID: number | null;
}

export async function getDefaultTimerSound(): Promise<TimerSoundSetting> {
  try {
    const raw = await AsyncStorage.getItem(DEFAULT_TIMER_SOUND_KEY);
    if (!raw) return { uri: null, name: null, soundID: null };
    const parsed = JSON.parse(raw);
    return {
      uri: typeof parsed.uri === 'string' ? parsed.uri : null,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      soundID: typeof parsed.soundID === 'number' ? parsed.soundID : null,
    };
  } catch {
    return { uri: null, name: null, soundID: null };
  }
}

export async function saveDefaultTimerSound(sound: TimerSoundSetting): Promise<void> {
  await AsyncStorage.setItem(DEFAULT_TIMER_SOUND_KEY, JSON.stringify(sound));
}
