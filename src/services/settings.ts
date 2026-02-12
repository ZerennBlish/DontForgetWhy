import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appSettings';

export interface AppSettings {
  guessWhyEnabled: boolean;
  timeFormat: '12h' | '24h';
}

const defaultSettings: AppSettings = {
  guessWhyEnabled: false,
  timeFormat: '12h',
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultSettings };
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
