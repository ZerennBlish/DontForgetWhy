import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BG_KEY = 'bg_main';
const OPACITY_KEY = 'bg_overlay_opacity';

function ensureBgDir(): Directory {
  const dir = new Directory(Paths.document, 'backgrounds/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveBackground(sourceUri: string): Promise<string | null> {
  try {
    const dir = ensureBgDir();
    const oldUri = await AsyncStorage.getItem(BG_KEY);

    // 1. Copy new file first
    const filename = `bg_main_${Date.now()}.jpg`;
    const destFile = new File(dir, filename);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);

    // 2. Persist new URI only after copy succeeds
    await AsyncStorage.setItem(BG_KEY, destFile.uri);

    // 3. Best-effort delete old file
    if (oldUri) {
      try {
        const oldFile = new File(oldUri);
        if (oldFile.exists) oldFile.delete();
      } catch { /* best-effort */ }
    }

    return destFile.uri;
  } catch {
    return null;
  }
}

export async function loadBackground(): Promise<string | null> {
  const uri = await AsyncStorage.getItem(BG_KEY);
  if (!uri) return null;
  try {
    const file = new File(uri);
    if (file.exists) return uri;
  } catch { /* fall through */ }
  await AsyncStorage.removeItem(BG_KEY);
  return null;
}

export async function clearBackground(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(BG_KEY);
    if (uri) {
      try {
        const file = new File(uri);
        if (file.exists) file.delete();
      } catch { /* best-effort */ }
    }
    await AsyncStorage.removeItem(BG_KEY);
  } catch { /* best-effort */ }
}

export async function getOverlayOpacity(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(OPACITY_KEY);
    if (raw !== null) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0.3 && val <= 0.8) return val;
    }
  } catch { /* fall through */ }
  return 0.5;
}

export async function setOverlayOpacity(value: number): Promise<void> {
  await AsyncStorage.setItem(OPACITY_KEY, String(value));
}
