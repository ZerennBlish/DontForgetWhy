import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  BackHandler,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import notifee from '@notifee/react-native';

import { formatTime } from '../utils/time';
import {
  dismissAlarmNotification,
  cancelTimerCountdownNotification,
  scheduleSnooze,
} from '../services/notifications';
import { disableAlarm } from '../services/storage';
import { loadSettings } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticHeavy } from '../utils/haptics';
import { getSnoozeMessage } from '../data/snoozeMessages';
import { refreshTimerWidget } from '../widget/updateWidget';
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
    timerNotificationId,
    notificationId,
    guessWhyEnabled,
    postGuessWhy,
  } = route.params;

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [snoozeShameMessage, setSnoozeShameMessage] = useState<string | null>(null);
  const snoozeShameOpacity = useRef(new Animated.Value(0)).current;
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings().then((s) => setTimeFormat(s.timeFormat)).catch(() => {});
  }, []);

  // DO NOT cancel notifications on mount — the alarm sound plays FROM the
  // notification. Cancelling it kills the sound. Notifications are only
  // cancelled when the user taps Dismiss or Snooze (in cancelAllNotifications).
  // The heads-up popup auto-dismisses after a few seconds on most devices.
  useEffect(() => {
    console.log('[AlarmFire] mounted — notificationId:', notificationId, 'timerId:', timerId, 'timerNotificationId:', timerNotificationId, 'fromNotification:', fromNotification, 'postGuessWhy:', postGuessWhy, 'alarmId:', alarm?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start vibration when screen shows from notification (not when returning from GuessWhy)
  useEffect(() => {
    if (fromNotification && !postGuessWhy) {
      hapticHeavy();
      Vibration.vibrate(VIBRATION_PATTERN, true);
      return () => Vibration.cancel();
    }
  }, [fromNotification, postGuessWhy]);

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

  const cancelAllNotifications = useCallback(() => {
    Vibration.cancel();
    if (isTimer) {
      if (timerNotificationId) {
        dismissAlarmNotification(timerNotificationId).catch(() => {});
      }
      if (timerId) {
        cancelTimerCountdownNotification(timerId).catch(() => {});
      }
    } else if (alarm) {
      if (alarm.notificationIds?.length) {
        for (const id of alarm.notificationIds) {
          dismissAlarmNotification(id).catch(() => {});
        }
      }
      if (alarm.notificationId) {
        dismissAlarmNotification(alarm.notificationId).catch(() => {});
      }
    }
    // Also cancel the specific pressed/triggered notification
    if (notificationId) {
      notifee.cancelNotification(notificationId).catch(() => {});
    }
  }, [alarm, isTimer, timerNotificationId, timerId, notificationId]);

  const exitToLockScreen = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'AlarmList' }] });
    setTimeout(() => BackHandler.exitApp(), 100);
  }, [navigation]);

  const handleDismiss = useCallback(async () => {
    try {
      cancelAllNotifications();
      // Disable one-time alarms after firing
      if (!isTimer && alarm?.mode === 'one-time') {
        try {
          await disableAlarm(alarm.id);
          refreshTimerWidget();
        } catch {}
      }
      // Reset snooze count on dismiss
      if (alarm?.id) {
        await resetSnoozeCount(alarm.id);
      }
    } catch {}
    exitToLockScreen();
  }, [cancelAllNotifications, exitToLockScreen, alarm, isTimer]);

  const handleSnooze = useCallback(async () => {
    cancelAllNotifications();
    if (!alarm) {
      exitToLockScreen();
      return;
    }

    let newCount = 1;
    try {
      await scheduleSnooze(alarm);
      newCount = await incrementSnoozeCount(alarm.id);
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

    // Exit after showing shame message
    exitTimerRef.current = setTimeout(() => {
      exitToLockScreen();
    }, 2500);
  }, [cancelAllNotifications, exitToLockScreen, alarm, snoozeShameOpacity]);

  const handleGuessWhy = useCallback(() => {
    if (!alarm) return;
    // Stop sound + vibration BEFORE navigating — game plays in silence
    cancelAllNotifications();
    navigation.navigate('GuessWhy', {
      alarm,
      fromNotification: true,
      notificationId,
    });
  }, [alarm, navigation, notificationId, cancelAllNotifications]);

  // Determine if Guess Why button should show
  const canPlayGuessWhy = useMemo(() => {
    if (isTimer || !alarm || !guessWhyEnabled || postGuessWhy) return false;
    const hasIcon = Boolean(alarm.icon) && guessWhyIcons.some((i) => i.emoji === alarm.icon);
    return hasIcon || (alarm.note?.length ?? 0) >= 3;
  }, [isTimer, alarm, guessWhyEnabled, postGuessWhy]);

  // Display values
  const displayTime = isTimer
    ? 'Timer Complete'
    : formatTime(alarm?.time || '', timeFormat);
  const displayIcon = isTimer
    ? (timerIcon || '\u23F1\uFE0F')
    : (alarm?.icon || '\u{1F514}');
  const displayLabel = isTimer
    ? (timerLabel || 'Timer')
    : (alarm?.nickname || 'Alarm');
  const displaySoundName = !isTimer && alarm?.soundName ? alarm.soundName : null;

  // Button visibility
  const showSnooze = !isTimer && !postGuessWhy && !!alarm;
  const showGuessWhy = canPlayGuessWhy;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
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
      backgroundColor: colors.background,
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
  }), [colors, insets.bottom]);

  // Snooze shame overlay
  if (snoozeShameMessage) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.shameOverlay, { opacity: snoozeShameOpacity }]}>
          <Text style={styles.shameEmoji}>{'\u{1F634}'}</Text>
          <Text style={styles.shameMessage}>{snoozeShameMessage}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.time}>{displayTime}</Text>
        <Text style={styles.emoji}>{displayIcon}</Text>
        <Text style={styles.label}>{displayLabel}</Text>
        {displaySoundName && (
          <Text style={styles.soundName}>{'\u266A'} {displaySoundName}</Text>
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
            style={styles.snoozeBtn}
            onPress={handleSnooze}
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
  );
}
