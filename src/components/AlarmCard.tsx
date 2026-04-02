import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
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
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionAlarm + '15',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionAlarm,
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionAlarm,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    left: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 10,
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
    pinDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginLeft: 6,
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
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    pinBtnActive: {
      borderColor: colors.accent,
    },
    pinBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    deleteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
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
      <Switch
        value={alarm.enabled}
        onValueChange={() => onToggle(alarm.id)}
        trackColor={{ false: colors.border, true: colors.sectionAlarm }}
        thumbColor={alarm.enabled ? colors.textPrimary : colors.textTertiary}
      />
      <View style={styles.left}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, !alarm.enabled && styles.textDisabled]}>
            {formatTime(alarm.time, timeFormat)}
          </Text>
          {isPinned && <View style={styles.pinDot} />}
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
        <View style={styles.btnRow}>
          <TouchableOpacity
            onPress={() => onTogglePin(alarm.id)}
            style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
            activeOpacity={0.6}
          >
            <Text style={[styles.pinBtnText, isPinned && { color: colors.accent }]}>
              {isPinned ? 'Pinned' : 'Pin'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(alarm.id)}
            style={styles.deleteBtn}
            activeOpacity={0.6}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
