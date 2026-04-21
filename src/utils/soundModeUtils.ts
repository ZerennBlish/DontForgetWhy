import { ImageSourcePropType } from 'react-native';
import { resolveIcon } from './iconResolver';

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
  if (mode === 'sound') return resolveIcon('bell');
  if (mode === 'vibrate') return resolveIcon('vibrate');
  return resolveIcon('silent');
}

export function getSoundModeLabel(mode: SoundMode): string {
  if (mode === 'sound') return 'Sound';
  if (mode === 'vibrate') return 'Vibrate';
  return 'Silent';
}
