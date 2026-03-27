import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  BackHandler,
  Animated,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import notifee from '@notifee/react-native';

import { formatTime } from '../utils/time';
import {
  dismissAlarmNotification,
  cancelTimerNotification,
  cancelTimerCountdownNotification,
  scheduleSnooze,
} from '../services/notifications';
import { deleteAlarm, updateSingleAlarm } from '../services/storage';
import { loadActiveTimers, saveActiveTimers } from '../services/timerStorage';
import { loadSettings, getSilenceAll } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticHeavy } from '../utils/haptics';
import { getSnoozeMessage } from '../data/snoozeMessages';
import { refreshWidgets } from '../widget/updateWidget';
import { markNotifHandled, persistNotifHandled } from '../services/pendingAlarm';
import { playAlarmSound, stopAlarmSound, isAlarmSoundPlaying } from '../services/alarmSound';
import { getDefaultTimerSound } from '../services/settings';
import guessWhyIcons from '../data/guessWhyIcons';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmFire'>;

const VIBRATION_PATTERN = [0, 800, 400, 800];
const SNOOZE_COUNT_PREFIX = 'snoozeCount_';

async function getSnoozeCount(alarmId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(`${SNOOZE_COUNT_PREFIX}${alarmId}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function incrementSnoozeCount(alarmId: string): Promise<number> {
  try {
    const current = await getSnoozeCount(alarmId);
    const next = current + 1;
    await AsyncStorage.setItem(`${SNOOZE_COUNT_PREFIX}${alarmId}`, String(next));
    return next;
  } catch {
    return 1;
  }
}

async function resetSnoozeCount(alarmId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SNOOZE_COUNT_PREFIX}${alarmId}`);
  } catch {}
}

export default function AlarmFireScreen({ route, navigation }: Props) {
  useKeepAwake();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    alarm,
    fromNotification,
    isTimer,
    timerLabel,
    timerIcon,
    timerId,
    timerSoundId,
    timerNotificationId,
    notificationId,
    postGuessWhy,
  } = route.params;

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [globalSilenced, setGlobalSilenced] = useState(false);
  const [silenceLoaded, setSilenceLoaded] = useState(false);
  const [snoozeShameMessage, setSnoozeShameMessage] = useState<string | null>(null);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const snoozeShameOpacity = useRef(new Animated.Value(0)).current;
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings().then((s) => setTimeFormat(s.timeFormat)).catch(() => {});
    getSilenceAll().then((v) => { setGlobalSilenced(v); setSilenceLoaded(true); }).catch(() => { setSilenceLoaded(true); });
  }, []);

  // DO NOT cancel notifications on mount — the alarm sound plays FROM the
  // notification. Cancelling it kills the sound. Notifications are only
  // cancelled when the user taps Dismiss or Snooze (in cancelAllNotifications).
  // The heads-up popup auto-dismisses after a few seconds on most devices.
  //
  // Mark this notification as handled in the module-level dedupe Map so
  // App.tsx won't navigate here a second time for the same notification
  // (e.g., DELIVERED showed full-screen, then PRESS fires when user opens app).
  useEffect(() => {
    console.log('[AlarmFire] mounted — notificationId:', notificationId, 'timerId:', timerId, 'timerNotificationId:', timerNotificationId, 'fromNotification:', fromNotification, 'postGuessWhy:', postGuessWhy, 'alarmId:', alarm?.id);
    if (notificationId) {
      markNotifHandled(notificationId);
    }
    // Clean up any stale snoozing flag from a previous session that
    // was never consumed by a DISMISSED handler (e.g., app was killed).
    if (alarm?.id) {
      AsyncStorage.removeItem(`snoozing_${alarm.id}`).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: play alarm sound if event handlers didn't start it
  // (e.g., cold start where background JS context is separate).
  // Sound is normally started on DELIVERED in index.ts / App.tsx.
  // Waits for silenceLoaded so we don't play before getSilenceAll() resolves.
  useEffect(() => {
    if (!fromNotification || postGuessWhy) return;
    if (!isTimer && (alarm?.soundId === 'silent' || alarm?.soundId === 'true_silent')) return;
    if (isTimer && (timerSoundId === 'silent' || timerSoundId === 'true_silent')) return;
    if (!silenceLoaded) return;
    if (globalSilenced) return;

    // If sound is already playing (started by DELIVERED event handler),
    // just register cleanup — don't start a second playback.
    if (isAlarmSoundPlaying()) {
      return () => {
        stopAlarmSound();
      };
    }

    let cancelled = false;
    (async () => {
      let soundUri: string | null = null;
      if (isTimer) {
        try {
          const timerSound = await getDefaultTimerSound();
          soundUri = timerSound.uri;
        } catch {}
      } else {
        soundUri = alarm?.soundUri ?? null;
      }
      if (cancelled) return;
      playAlarmSound(soundUri);
    })();
    return () => {
      cancelled = true;
      stopAlarmSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silenceLoaded]);

  // Start vibration when screen shows from notification (not when returning from GuessWhy)
  // Skip vibration for true_silent alarms/timers and when global silence is active
  useEffect(() => {
    if (fromNotification && !postGuessWhy) {
      const isTrueSilent = isTimer ? timerSoundId === 'true_silent' : alarm?.soundId === 'true_silent';
      if (!isTrueSilent && !globalSilenced) {
        hapticHeavy();
        Vibration.vibrate(VIBRATION_PATTERN, true);
        return () => Vibration.cancel();
      }
    }
  }, [fromNotification, postGuessWhy, isTimer, alarm?.soundId, timerSoundId, globalSilenced]);

  // When returning from GuessWhy, notifications + vibration are already
  // cancelled (handleGuessWhy does it before navigating). This is a
  // defensive fallback in case anything slipped through.
  useEffect(() => {
    if (postGuessWhy) {
      Vibration.cancel();
    }
  }, [postGuessWhy]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    Vibration.cancel();
    stopAlarmSound();
    console.log('[AlarmFire] cancelAllNotifications — isTimer:', isTimer,
      'timerNotificationId:', timerNotificationId, 'timerId:', timerId,
      'notificationId:', notificationId);
    const promises: Promise<void>[] = [];
    if (isTimer) {
      if (timerNotificationId) {
        console.log('[AlarmFire] cancelling timer-done notification:', timerNotificationId);
        promises.push(cancelTimerNotification(timerNotificationId).catch(() => {}));
      }
      if (timerId) {
        console.log('[AlarmFire] cancelling timer countdown:', timerId);
        promises.push(cancelTimerCountdownNotification(timerId).catch(() => {}));
      }
    } else if (alarm) {
      const isRecurring = alarm.mode !== 'one-time';
      if (alarm.notificationIds?.length) {
        for (const id of alarm.notificationIds) {
          promises.push(
            isRecurring
              ? notifee.cancelDisplayedNotification(id).catch(() => {})
              : dismissAlarmNotification(id).catch(() => {}),
          );
        }
      }
      if (alarm.notificationId) {
        promises.push(
          isRecurring
            ? notifee.cancelDisplayedNotification(alarm.notificationId).catch(() => {})
            : dismissAlarmNotification(alarm.notificationId).catch(() => {}),
        );
      }
    }
    // Also cancel the specific pressed/triggered notification
    if (notificationId) {
      const isRecurring = alarm?.mode !== 'one-time' && !isTimer;
      promises.push(
        isRecurring
          ? notifee.cancelDisplayedNotification(notificationId).catch(() => {})
          : notifee.cancelNotification(notificationId).catch(() => {}),
      );
    }
    await Promise.all(promises);
    console.log('[AlarmFire] cancelAllNotifications — done');
  }, [alarm, isTimer, timerNotificationId, timerId, notificationId]);

  const exitToLockScreen = useCallback(() => {
    BackHandler.exitApp();
  }, []);

  const handleDismiss = useCallback(async () => {
    console.log('[AlarmFire] handleDismiss — isTimer:', isTimer, 'alarmId:', alarm?.id);
    try {
      await cancelAllNotifications();
      // Persist the notification ID so cold-start dedupe survives process death
      if (notificationId) {
        await persistNotifHandled(notificationId);
      }
      // Timer cleanup: remove from active timers storage so it doesn't
      // linger in the timer list after dismissal from AlarmFireScreen.
      if (isTimer && timerId) {
        try {
          const timers = await loadActiveTimers();
          const updated = timers.filter((t) => t.id !== timerId);
          await saveActiveTimers(updated);
          refreshWidgets();
        } catch {}
      }
      // Soft-delete one-time alarms after firing so they disappear from
      // the active list and move to the deleted/history view.
      if (!isTimer && alarm?.mode === 'one-time') {
        try {
          await deleteAlarm(alarm.id);
          refreshWidgets();
        } catch {}
      }
      // Reset snooze count on dismiss
      if (alarm?.id) {
        await resetSnoozeCount(alarm.id);
      }
    } catch {}
    console.log('[AlarmFire] handleDismiss — complete, exiting');
    exitToLockScreen();
  }, [cancelAllNotifications, exitToLockScreen, alarm, isTimer, timerId]);

  // Intercept hardware back button — treat as Dismiss to stop sound/vibration
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [handleDismiss]);

  const handleSnooze = useCallback(async () => {
    setIsSnoozing(true);
    if (!alarm) {
      await cancelAllNotifications();
      exitToLockScreen();
      return;
    }

    // Set snoozing flag BEFORE cancelling notifications.
    // DISMISSED fires immediately on cancel; without the flag it would
    // delete the one-time alarm before the snooze is scheduled.
    // If the flag fails to set, bail out — a failed snooze is better
    // than a deleted alarm.
    let newCount = 1;
    try {
      await AsyncStorage.setItem(`snoozing_${alarm.id}`, '1');
    } catch (e) {
      console.error('[AlarmFire] snooze flag failed, aborting snooze:', e);
      setIsSnoozing(false);
      return;
    }
    try {
      newCount = await incrementSnoozeCount(alarm.id);
    } catch {}

    await cancelAllNotifications();

    try {
      const snoozeNotifId = await scheduleSnooze(alarm);
      // Persist the snooze notification ID so it can be cancelled if the
      // alarm is deleted or disabled while snoozed.
      // Uses updateSingleAlarm to load ALL alarms (including soft-deleted)
      // and save the full array back — prevents wiping the trash.
      try {
        await updateSingleAlarm(alarm.id, (a) => ({
          ...a,
          notificationIds: [
            ...(a.notificationIds || []),
            snoozeNotifId,
          ],
        }));
      } catch {}
    } catch (e) {
      console.error('[AlarmFire] snooze failed:', e);
    }

    // Show escalating snooze shame message briefly before closing
    const message = getSnoozeMessage(newCount);
    setSnoozeShameMessage(message);
    Animated.timing(snoozeShameOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Exit after showing shame message (extra 1s so user can read the roast)
    exitTimerRef.current = setTimeout(() => {
      exitToLockScreen();
    }, 3500);
  }, [cancelAllNotifications, exitToLockScreen, alarm, snoozeShameOpacity]);

  const handleGuessWhy = useCallback(async () => {
    if (!alarm) return;
    // Stop sound + vibration BEFORE navigating — game plays in silence
    await cancelAllNotifications();
    navigation.navigate('GuessWhy', {
      alarm,
      fromNotification: true,
      notificationId,
    });
  }, [alarm, navigation, notificationId, cancelAllNotifications]);

  // Determine if Guess Why button should show
  const canPlayGuessWhy = useMemo(() => {
    if (isTimer || !alarm || !alarm.guessWhy || postGuessWhy) return false;
    const hasIcon = Boolean(alarm.icon) && guessWhyIcons.some((i) => i.emoji === alarm.icon);
    const hasNickname = (alarm.nickname?.trim().length ?? 0) >= 1;
    return hasIcon || hasNickname || (alarm.note?.length ?? 0) >= 3;
  }, [isTimer, alarm, postGuessWhy]);

  // ── Display values ──────────────────────────────────────────────
  //
  // Privacy & Guess Why visibility rules:
  //   private=F, GuessWhy=OFF → show icon + note immediately
  //   private=F, GuessWhy=ON  → hide icon + note pre-game, reveal after
  //   private=T, GuessWhy=OFF → hide icon + note always
  //   private=T, GuessWhy=ON  → hide icon + note always (even post-game)
  //
  // Nickname is always safe — the user chose it as a non-revealing label.

  const displayTime = isTimer
    ? 'Timer Complete'
    : formatTime(alarm?.time || '', timeFormat);

  const isPrivate = !isTimer && !!alarm?.private;
  const isPreGame = !!alarm?.guessWhy && !postGuessWhy;

  // Icon: private alarms and pre-game always show generic bell.
  // Non-private post-game or no-GuessWhy shows the real icon.
  const displayIcon = isTimer
    ? (timerIcon || '\u23F1\uFE0F')
    : (isPrivate || isPreGame) ? '\u{1F514}' : (alarm?.icon || '\u{1F514}');

  // Label: nickname is always safe to show; falls back to generic "Alarm"
  const displayLabel = isTimer
    ? (timerLabel || 'Timer')
    : (alarm?.nickname || 'Alarm');

  const displaySoundName = !isTimer && alarm?.soundName ? alarm.soundName : null;

  // Note: NEVER shown for private alarms. For non-private, only shown
  // when Guess Why is off or the game has been played (postGuessWhy).
  const displayNote = !isTimer && !isPrivate && alarm?.note
    && (!alarm?.guessWhy || postGuessWhy)
    ? alarm.note : null;

  // Button visibility
  const showSnooze = !isTimer && !postGuessWhy && !!alarm;
  const showGuessWhy = canPlayGuessWhy;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'space-between',
      paddingTop: 80,
      paddingBottom: 40 + insets.bottom,
      paddingHorizontal: 24,
    },
    top: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    time: {
      fontSize: 64,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -2,
    },
    emoji: {
      fontSize: 72,
      marginTop: 16,
      marginBottom: 8,
    },
    label: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 16,
      lineHeight: 34,
    },
    soundName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
    noteText: {
      fontSize: 18,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      paddingHorizontal: 16,
      lineHeight: 26,
    },
    bottom: {
      gap: 12,
    },
    guessWhyBtn: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
      minHeight: 68,
      justifyContent: 'center',
    },
    guessWhyBtnText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.accent,
    },
    snoozeBtn: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 68,
      justifyContent: 'center',
    },
    snoozeBtnText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dismissBtn: {
      backgroundColor: colors.red,
      borderRadius: 20,
      paddingVertical: 24,
      alignItems: 'center',
      minHeight: 72,
      justifyContent: 'center',
    },
    dismissBtnText: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    shameOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    shameMessage: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 32,
    },
    shameEmoji: {
      fontSize: 48,
      marginBottom: 20,
    },
    silencedIndicator: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFA500',
      textAlign: 'center',
      marginBottom: 12,
    },
  }), [colors, insets.bottom]);

  const hasAlarmPhoto = !isTimer && !!alarm?.photoUri && !photoFailed;
  const bgSource = hasAlarmPhoto
    ? { uri: alarm!.photoUri! }
    : require('../../assets/lightbulb.png');

  // Snooze shame overlay
  if (snoozeShameMessage) {
    return (
      <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover" onError={hasAlarmPhoto ? () => setPhotoFailed(true) : undefined}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={styles.container}>
            <Animated.View style={[styles.shameOverlay, { opacity: snoozeShameOpacity }]}>
              <Text style={styles.shameEmoji}>{'\u{1F634}'}</Text>
              <Text style={styles.shameMessage}>{snoozeShameMessage}</Text>
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover" onError={hasAlarmPhoto ? () => setPhotoFailed(true) : undefined}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={styles.container}>
          <View style={styles.top}>
            {globalSilenced && (
              <Text style={styles.silencedIndicator}>{'\u{1F507}'} All alarms silenced</Text>
            )}
            <Text style={styles.time}>{displayTime}</Text>
            <Text style={styles.emoji}>{displayIcon}</Text>
            <Text style={styles.label}>{displayLabel}</Text>
            {displaySoundName && (
              <Text style={styles.soundName}>{'\u266A'} {displaySoundName}</Text>
            )}
            {displayNote && (
              <Text style={styles.noteText}>{displayNote}</Text>
            )}
          </View>

          <View style={styles.bottom}>
            {showGuessWhy && (
              <TouchableOpacity
                style={styles.guessWhyBtn}
                onPress={handleGuessWhy}
                activeOpacity={0.8}
              >
                <Text style={styles.guessWhyBtnText}>{'\u{1F9E0}'} Guess Why</Text>
              </TouchableOpacity>
            )}

            {showSnooze && (
              <TouchableOpacity
                style={[styles.snoozeBtn, isSnoozing && { opacity: 0.5 }]}
                onPress={handleSnooze}
                disabled={isSnoozing}
                activeOpacity={0.8}
              >
                <Text style={styles.snoozeBtnText}>Snooze 5 min</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
