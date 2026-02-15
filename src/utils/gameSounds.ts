import { hapticLight, hapticMedium, hapticHeavy } from './haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

let _gameSoundsEnabled = true;

// Load setting on module init
(async () => {
  try {
    const raw = await AsyncStorage.getItem('appSettings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.gameSoundsEnabled === 'boolean') {
        _gameSoundsEnabled = parsed.gameSoundsEnabled;
      }
    }
  } catch {}
})();

export function refreshGameSoundsSetting(enabled: boolean) {
  _gameSoundsEnabled = enabled;
}

export function playCorrect() {
  if (!_gameSoundsEnabled) return;
  try {
    // Three rapid light taps — bright, ascending feel
    hapticLight();
    setTimeout(() => hapticLight(), 50);
    setTimeout(() => hapticLight(), 100);
  } catch {}
}

export function playWrong() {
  if (!_gameSoundsEnabled) return;
  try {
    // One long heavy vibration
    hapticHeavy();
    setTimeout(() => hapticHeavy(), 80);
  } catch {}
}

export function playCardFlip() {
  if (!_gameSoundsEnabled) return;
  try {
    // Single crisp light tap
    hapticLight();
  } catch {}
}

export function playGameComplete() {
  if (!_gameSoundsEnabled) return;
  try {
    // Celebration rhythm: medium-light-medium-light-heavy
    hapticMedium();
    setTimeout(() => hapticLight(), 100);
    setTimeout(() => hapticMedium(), 200);
    setTimeout(() => hapticLight(), 300);
    setTimeout(() => hapticHeavy(), 400);
  } catch {}
}

export function playTimerComplete() {
  if (!_gameSoundsEnabled) return;
  try {
    // Strong alert: heavy-heavy with pause
    hapticHeavy();
    setTimeout(() => hapticHeavy(), 200);
    setTimeout(() => hapticMedium(), 400);
  } catch {}
}
