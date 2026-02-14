import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appSettings';

export interface AppSettings {
  guessWhyEnabled: boolean;
  timeFormat: '12h' | '24h';
  gameSoundsEnabled: boolean;
}

const defaultSettings: AppSettings = {
  guessWhyEnabled: true,
  timeFormat: '12h',
  gameSoundsEnabled: true,
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
      gameSoundsEnabled:
        typeof parsed.gameSoundsEnabled === 'boolean'
          ? parsed.gameSoundsEnabled
          : defaultSettings.gameSoundsEnabled,
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
