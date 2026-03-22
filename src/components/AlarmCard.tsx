import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Alarm, ALL_DAYS, WEEKDAYS, WEEKENDS, AlarmDay } from '../types/alarm';
import { formatTime } from '../utils/time';
import { useTheme } from '../theme/ThemeContext';

function getScheduleLabel(alarm: Alarm): string {
  const mode = alarm.mode || 'recurring';
  if (mode === 'one-time' && alarm.date) {
    const [y, mo, da] = alarm.date.split('-').map(Number);
    const d = new Date(y, mo - 1, da);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const days: AlarmDay[] = alarm.days?.length ? alarm.days as AlarmDay[] : [...ALL_DAYS];
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) return 'Weekends';
  return days.join(', ');
}

const mysteryTexts = [
  '\u2753 Can you remember?',
  '\u2753 Mystery Alarm',
  '\u2753 Think hard...',
  '\u2753 What was this for?',
  '\u{1F914} ???',
  '\u{1F9E0} Brain check incoming',
];

function getMysteryText(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return mysteryTexts[Math.abs(hash) % mysteryTexts.length];
}

interface AlarmCardProps {
  alarm: Alarm;
  timeFormat: '12h' | '24h';
  isPinned: boolean;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function getDetailLine(alarm: Alarm): string {
  if (alarm.icon && alarm.nickname) return `${alarm.icon} ${alarm.nickname}`;
  if (alarm.icon) return alarm.icon;
  if (alarm.nickname) return alarm.nickname;
  return alarm.note;
}

export default function AlarmCard({ alarm, timeFormat, isPinned, onToggle, onEdit, onDelete, onTogglePin }: AlarmCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card + 'BF',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    left: {
      flex: 1,
      marginRight: 10,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    time: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    pinIcon: {
      fontSize: 10,
      marginLeft: 5,
      color: colors.accent,
    },
    detail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 3,
    },
    mysteryText: {
      fontSize: 14,
      color: colors.accent,
      marginTop: 3,
      fontStyle: 'italic',
    },
    schedule: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    textDisabled: {
      color: colors.textTertiary,
    },
    right: {
      alignItems: 'center',
      gap: 8,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 6,
    },
    pinBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    pinBtnActive: {
      backgroundColor: 'rgba(30, 30, 40, 0.85)',
    },
    pinBtnText: {
      fontSize: 12,
    },
    deleteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    deleteText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#EF4444',
    },
  }), [colors]);

  const guessWhy = alarm.guessWhy ?? false;
  const hideDetail = !guessWhy && alarm.private;
  let detailText: string = '';
  let detailStyle = styles.detail;
  if (guessWhy) {
    detailText = getMysteryText(alarm.id);
    detailStyle = styles.mysteryText;
  } else if (!hideDetail) {
    detailText = getDetailLine(alarm);
  }

  return (
    <TouchableOpacity
      style={[styles.card, !alarm.enabled && styles.cardDisabled]}
      onPress={() => onEdit(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, !alarm.enabled && styles.textDisabled]}>
            {formatTime(alarm.time, timeFormat)}
          </Text>
          {isPinned && <Text style={styles.pinIcon}>{'\u{1F4CC}'}</Text>}
        </View>
        {!hideDetail && detailText !== '' && (
          <Text
            style={[detailStyle, !alarm.enabled && styles.textDisabled]}
            numberOfLines={1}
          >
            {detailText}
          </Text>
        )}
        <Text style={[styles.schedule, !alarm.enabled && styles.textDisabled]}>
          {getScheduleLabel(alarm)}
        </Text>
      </View>
      <View style={styles.right}>
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={alarm.enabled ? colors.textPrimary : colors.textTertiary}
        />
        <View style={styles.btnRow}>
          <TouchableOpacity
            onPress={() => onTogglePin(alarm.id)}
            style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
            activeOpacity={0.6}
          >
            <Text style={[styles.pinBtnText, { opacity: isPinned ? 1 : 0.3 }]}>{'\u{1F4CC}'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Delete this alarm?', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(alarm.id) },
          ])}
          style={styles.deleteBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
