import { NativeModules, Platform } from 'react-native';

/**
 * Plays alarm/timer sounds via native MediaPlayer with AudioAttributes.USAGE_ALARM.
 * Sound plays through the alarm audio stream, independent of ringer mode
 * (works on silent/vibrate). Notifications are visual-only (vibration + full-screen).
 */

export async function playAlarmSound(soundUri: string | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await NativeModules.AlarmChannelModule.playAlarmSound(soundUri);
  } catch (e) {
    console.warn('[AlarmSound] playAlarmSound failed:', e);
  }
}

export async function stopAlarmSound(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await NativeModules.AlarmChannelModule.stopAlarmSound();
  } catch (e) {
    console.warn('[AlarmSound] stopAlarmSound failed:', e);
  }
}
