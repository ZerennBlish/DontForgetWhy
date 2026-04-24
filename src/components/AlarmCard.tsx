import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Alarm, ALL_DAYS, WEEKDAYS, WEEKENDS, AlarmDay } from '../types/alarm';
import { formatTime } from '../utils/time';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';

const GUESS_WHY_RED = require('../../assets/icons/guess-why-red.webp');

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
  'Can you remember?',
  'Mystery Alarm',
  'Think hard...',
  'What was this for?',
  '???',
  'Brain check incoming',
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
  onTogglePin: (id: string) => void;
}

function getDetailLine(alarm: Alarm): string {
  if (alarm.icon && alarm.nickname) return `${alarm.icon} ${alarm.nickname}`;
  if (alarm.icon) return alarm.icon;
  if (alarm.nickname) return alarm.nickname;
  return alarm.note;
}

function AlarmCard({ alarm, timeFormat, isPinned, onToggle, onEdit, onTogglePin }: AlarmCardProps) {
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
      fontSize: 26,
      fontFamily: FONTS.bold,
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
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 3,
    },
    mysteryText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.accent,
      marginTop: 3,
      fontStyle: 'italic',
    },
    schedule: {
      fontSize: 12,
      fontFamily: FONTS.regular,
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
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    pinBtnActive: {
      borderColor: colors.accent,
    },
    pinBtnText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
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
      accessibilityLabel={`${formatTime(alarm.time, timeFormat)} alarm${alarm.nickname ? `, ${alarm.nickname}` : ''}${alarm.enabled ? '' : ', disabled'}`}
      accessibilityRole="button"
      accessibilityHint="Tap to edit"
    >
      <Switch
        value={alarm.enabled}
        onValueChange={() => onToggle(alarm.id)}
        trackColor={{ false: colors.border, true: colors.sectionAlarm }}
        thumbColor={alarm.enabled ? colors.textPrimary : colors.textTertiary}
        accessibilityLabel={alarm.enabled ? 'Alarm enabled' : 'Alarm disabled'}
      />
      <View style={styles.left}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, !alarm.enabled && styles.textDisabled]}>
            {formatTime(alarm.time, timeFormat)}
          </Text>
          {isPinned && <View style={styles.pinDot} />}
        </View>
        {!hideDetail && detailText !== '' && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {guessWhy && (
              <Image source={GUESS_WHY_RED} style={{ width: 32, height: 32, marginRight: 4, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
            )}
            <Text
              style={[detailStyle, !alarm.enabled && styles.textDisabled]}
              numberOfLines={1}
            >
              {detailText}
            </Text>
            {guessWhy && (
              <Image source={GUESS_WHY_RED} style={{ width: 32, height: 32, marginLeft: 4 }} resizeMode="contain" />
            )}
          </View>
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
            accessibilityLabel={isPinned ? 'Unpin alarm' : 'Pin alarm'}
            accessibilityRole="button"
          >
            <Text style={[styles.pinBtnText, isPinned && { color: colors.accent }]}>
              {isPinned ? 'Pinned' : 'Pin'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(AlarmCard);
