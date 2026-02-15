import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_KEY = 'hapticsEnabled';

let _hapticsEnabled: boolean | null = null;

// Load setting on module init
(async () => {
  try {
    const raw = await AsyncStorage.getItem(HAPTICS_KEY);
    if (raw !== null) {
      _hapticsEnabled = raw !== 'false';
    }
  } catch {}
})();

export async function refreshHapticsSetting(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HAPTICS_KEY);
    if (raw !== null) {
      _hapticsEnabled = raw !== 'false';
    } else {
      _hapticsEnabled = true;
    }
  } catch {}
}

export function hapticLight() {
  if (!_hapticsEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function hapticMedium() {
  if (!_hapticsEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

export function hapticHeavy() {
  if (!_hapticsEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

export function hapticSelection() {
  if (!_hapticsEnabled) return;
  try {
    Haptics.selectionAsync();
  } catch {}
}
