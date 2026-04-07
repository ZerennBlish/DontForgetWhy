import { ImageSourcePropType } from 'react-native';
import APP_ICONS from '../data/appIconAssets';

export type SoundMode = 'sound' | 'vibrate' | 'silent';

export function cycleSoundMode(current: SoundMode): SoundMode {
  if (current === 'sound') return 'vibrate';
  if (current === 'vibrate') return 'silent';
  return 'sound';
}

export function soundModeToSoundId(mode: SoundMode): string | undefined {
  if (mode === 'vibrate') return 'silent';
  if (mode === 'silent') return 'true_silent';
  return undefined;
}

export function soundIdToSoundMode(soundId: string | undefined): SoundMode {
  if (soundId === 'silent') return 'vibrate';
  if (soundId === 'true_silent') return 'silent';
  return 'sound';
}

export function getSoundModeIcon(mode: SoundMode): ImageSourcePropType {
  if (mode === 'sound') return APP_ICONS.bell;
  if (mode === 'vibrate') return APP_ICONS.vibrate;
  return APP_ICONS.silent;
}

export function getSoundModeLabel(mode: SoundMode): string {
  if (mode === 'sound') return 'Sound';
  if (mode === 'vibrate') return 'Vibrate';
  return 'Silent';
}
