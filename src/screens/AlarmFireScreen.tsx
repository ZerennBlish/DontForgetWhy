import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { formatTime } from '../utils/time';
import { getSnoozeMessage } from '../data/snoozeMessages';
import { dismissAlarmNotification } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmFire'>;

const categoryEmoji: Record<string, string> = {
  meds: '\u{1F48A}',
  appointment: '\u{1F4C5}',
  task: '\u2705',
  'self-care': '\u{1F9D8}',
  general: '\u{1F514}',
};

const snoozeButtonLabels = [
  'Snooze 5 min',
  'Snooze Again',
  '...Snooze Again',
  'Fine, Snooze',
];

const VIBRATION_PATTERN = [0, 800, 400, 800];

export default function AlarmFireScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alarm, fromNotification } = route.params;
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [snoozeMessage, setSnoozeMessage] = useState<string | null>(null);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  useEffect(() => {
    loadSettings().then((s) => setTimeFormat(s.timeFormat));
  }, []);

  useEffect(() => {
    if (fromNotification) {
      Vibration.vibrate(VIBRATION_PATTERN, true);
      return () => {
        Vibration.cancel();
      };
    }
  }, [fromNotification]);

  const stopAlarm = () => {
    Vibration.cancel();
    // Cancel all notification IDs (new array format)
    if (alarm.notificationIds?.length) {
      for (const id of alarm.notificationIds) {
        dismissAlarmNotification(id);
      }
    }
    // Cancel legacy single ID for backward compat
    if (alarm.notificationId) {
      dismissAlarmNotification(alarm.notificationId);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
      paddingTop: 60,
      paddingBottom: 60 + insets.bottom,
      paddingHorizontal: 24,
    },
    top: {
      alignItems: 'center',
      marginTop: 20,
    },
    emoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    time: {
      fontSize: 56,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -2,
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
      letterSpacing: 2,
      marginTop: 8,
    },
    middle: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    note: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 38,
    },
    divider: {
      width: 60,
      height: 2,
      backgroundColor: colors.border,
      marginVertical: 24,
      borderRadius: 1,
    },
    quote: {
      fontSize: 17,
      color: colors.textTertiary,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 26,
      paddingHorizontal: 12,
    },
    snoozeMessage: {
      fontSize: 15,
      color: colors.red,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 22,
      marginTop: 16,
      paddingHorizontal: 16,
    },
    bottom: {
      gap: 12,
    },
    snoozeBtn: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    snoozeBtnText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dismissBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    dismissBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  }), [colors, insets.bottom]);

  const handleDismiss = () => {
    stopAlarm();
    navigation.goBack();
  };

  const handleSnooze = () => {
    stopAlarm();
    const newCount = snoozeCount + 1;
    setSnoozeCount(newCount);
    setSnoozeMessage(getSnoozeMessage(newCount));
  };

  const snoozeLabel =
    snoozeButtonLabels[Math.min(snoozeCount, snoozeButtonLabels.length - 1)];

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.emoji}>{categoryEmoji[alarm.category] ?? '\u{1F514}'}</Text>
        <Text style={styles.time}>{formatTime(alarm.time, timeFormat)}</Text>
        <Text style={styles.categoryLabel}>{alarm.category.toUpperCase()}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.note}>{alarm.note}</Text>
        <View style={styles.divider} />
        <Text style={styles.quote}>"{alarm.quote}"</Text>
        {snoozeMessage && (
          <Text style={styles.snoozeMessage}>{snoozeMessage}</Text>
        )}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.snoozeBtn}
          onPress={handleSnooze}
          activeOpacity={0.8}
        >
          <Text style={styles.snoozeBtnText}>{snoozeLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissBtnText}>I'm On It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
