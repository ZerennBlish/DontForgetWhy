import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Alarm, AlarmCategory, ALL_DAYS, WEEKDAYS, WEEKENDS, AlarmDay } from '../types/alarm';
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

const categoryLabels: Record<AlarmCategory, string> = {
  meds: '\u{1F48A} Meds',
  appointment: '\u{1F4C5} Appt',
  event: '\u{1F389} Event',
  task: '\u2705 Task',
  'self-care': '\u{1F9D8} Self-Care',
  general: '\u{1F514} General',
};

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
  guessWhyEnabled: boolean;
  isPinned: boolean;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function getDetailLine(alarm: Alarm): string {
  if (alarm.icon && alarm.nickname) return `${alarm.icon} ${alarm.nickname}`;
  if (alarm.icon) return alarm.icon;
  if (alarm.nickname) return `${alarm.nickname} \u{1F512}`;
  return alarm.note;
}

export default function AlarmCard({ alarm, timeFormat, guessWhyEnabled, isPinned, onToggle, onEdit, onDelete, onTogglePin }: AlarmCardProps) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card + 'BF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
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
      marginRight: 12,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    time: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    pinIcon: {
      fontSize: 12,
      marginLeft: 6,
      color: colors.accent,
    },
    detail: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    privateText: {
      fontSize: 15,
      color: colors.textTertiary,
      marginTop: 4,
    },
    mysteryText: {
      fontSize: 15,
      color: colors.accent,
      marginTop: 4,
      fontStyle: 'italic',
    },
    schedule: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    category: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 4,
    },
    textDisabled: {
      color: colors.textTertiary,
    },
    right: {
      alignItems: 'center',
      gap: 10,
    },
    peekBtn: {
      padding: 4,
    },
    peekIcon: {
      fontSize: 18,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 6,
    },
    pinBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    pinBtnActive: {
      backgroundColor: colors.activeBackground,
    },
    pinBtnText: {
      fontSize: 13,
    },
    deleteBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    deleteText: {
      fontSize: 12,
      color: colors.red,
    },
  }), [colors]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePeek = () => {
    setRevealed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 3000);
  };

  const isPrivateHidden = !guessWhyEnabled && alarm.private && !revealed;

  let detailText: string;
  let detailStyle;
  if (guessWhyEnabled) {
    detailText = getMysteryText(alarm.id);
    detailStyle = styles.mysteryText;
  } else if (isPrivateHidden) {
    detailText = '\u{1F512} Private Alarm';
    detailStyle = styles.privateText;
  } else {
    detailText = getDetailLine(alarm);
    detailStyle = styles.detail;
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
        <Text
          style={[detailStyle, !alarm.enabled && styles.textDisabled]}
          numberOfLines={1}
        >
          {detailText}
        </Text>
        <Text style={[styles.category, !alarm.enabled && styles.textDisabled]}>
          {guessWhyEnabled ? '\u2753 ???' : categoryLabels[alarm.category]}
        </Text>
        {!guessWhyEnabled && (
          <Text style={[styles.schedule, !alarm.enabled && styles.textDisabled]}>
            {getScheduleLabel(alarm)}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        {!guessWhyEnabled && alarm.private && (
          <TouchableOpacity onPress={handlePeek} style={styles.peekBtn} activeOpacity={0.6}>
            <Text style={styles.peekIcon}>{'\u{1F441}'}</Text>
          </TouchableOpacity>
        )}
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
