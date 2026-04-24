import { NativeModules, Platform } from 'react-native';
import { loadAlarms } from './storage';
import { loadActiveTimers } from './timerStorage';
import { getDefaultTimerSound, getSilenceAll } from './settings';

/**
 * Plays alarm/timer sounds via native MediaPlayer with AudioAttributes.USAGE_ALARM.
 * Sound plays through the alarm audio stream, independent of ringer mode
 * (works on silent/vibrate). Notifications are visual-only (vibration + full-screen).
 *
 * Sound is started by notification event handlers (DELIVERED) so it plays
 * instantly when the notification fires — not when AlarmFireScreen mounts.
 */

let _playing = false;

export function isAlarmSoundPlaying(): boolean {
  return _playing;
}

export async function playAlarmSound(soundUri: string | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  _playing = true;
  try {
    await NativeModules.AlarmChannelModule.playAlarmSound(soundUri);
  } catch (e) {
    console.warn('[AlarmSound] playAlarmSound failed:', e);
    // Retry with default system alarm if a custom URI failed
    if (soundUri !== null) {
      try {
        await NativeModules.AlarmChannelModule.playAlarmSound(null);
        return;
      } catch (e2) {
        console.warn('[AlarmSound] playAlarmSound default fallback failed:', e2);
      }
    }
    _playing = false;
  }
}

export async function stopAlarmSound(): Promise<void> {
  if (Platform.OS !== 'android') return;
  _playing = false;
  try {
    await NativeModules.AlarmChannelModule.stopAlarmSound();
  } catch (e) {
    console.warn('[AlarmSound] stopAlarmSound failed:', e);
  }
}

/**
 * Resolves the correct sound URI for an alarm or timer and plays it.
 * Called from notification event handlers (DELIVERED) in index.ts and App.tsx.
 */
export async function playAlarmSoundForNotification(
  alarmId?: string,
  timerId?: string,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // Global silence override — skip all sound playback
    const silenced = await getSilenceAll();
    if (silenced) return;

    if (timerId) {
      const timers = await loadActiveTimers();
      const timer = timers.find((t) => t.id === timerId);
      if (timer?.soundId === 'silent' || timer?.soundId === 'true_silent') return;
      const timerSound = await getDefaultTimerSound();
      await playAlarmSound(timerSound.uri);
      return;
    }
    if (alarmId) {
      const alarms = await loadAlarms();
      const alarm = alarms.find((a) => a.id === alarmId);
      if (!alarm) { await playAlarmSound(null); return; }
      if (alarm.soundId === 'silent' || alarm.soundId === 'true_silent') return;
      await playAlarmSound(alarm.soundUri ?? null);
      return;
    }
    await playAlarmSound(null);
  } catch (e) {
    console.warn('[AlarmSound] playAlarmSoundForNotification failed:', e);
  }
}
