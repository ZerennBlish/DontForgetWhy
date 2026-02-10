import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appSettings';

export interface AppSettings {
  guessWhyEnabled: boolean;
}

const defaultSettings: AppSettings = {
  guessWhyEnabled: false,
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

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
