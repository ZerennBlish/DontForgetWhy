import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { AlarmDay } from '../types/alarm';
import { hapticLight } from '../utils/haptics';

const DAY_LABELS: { key: AlarmDay; short: string }[] = [
  { key: 'Sun', short: 'S' },
  { key: 'Mon', short: 'M' },
  { key: 'Tue', short: 'T' },
  { key: 'Wed', short: 'W' },
  { key: 'Thu', short: 'T' },
  { key: 'Fri', short: 'F' },
  { key: 'Sat', short: 'S' },
];

interface DayPickerRowProps {
  selectedDays: AlarmDay[];
  onToggleDay: (day: AlarmDay) => void;
  onSelectWeekdays: () => void;
  onSelectWeekends: () => void;
  onSelectEveryday: () => void;
  isWeekdaysSelected: boolean;
  isWeekendsSelected: boolean;
  isEverydaySelected: boolean;
  showQuickDays?: boolean;
  onToggleCalendar?: () => void;
  isCalendarOpen?: boolean;
  colors: {
    accent: string;
    card: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    activeBackground: string;
  };
}

export default function DayPickerRow({
  selectedDays,
  onToggleDay,
  onSelectWeekdays,
  onSelectWeekends,
  onSelectEveryday,
  isWeekdaysSelected,
  isWeekendsSelected,
  isEverydaySelected,
  showQuickDays,
  onToggleCalendar,
  isCalendarOpen,
  colors,
}: DayPickerRowProps) {
  const cardBg = colors.card + 'BF';

  return (
    <>
      <View style={styles.dayRow}>
        {DAY_LABELS.map(({ key, short }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.dayBtn,
              { backgroundColor: colors.border, borderColor: colors.border },
              selectedDays.includes(key) && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => { hapticLight(); onToggleDay(key); }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dayBtnText,
              { color: colors.textTertiary },
              selectedDays.includes(key) && { color: colors.textPrimary },
            ]}>
              {short}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {showQuickDays && (
        <View style={styles.quickDayRow}>
          <TouchableOpacity
            style={[
              styles.quickDayBtn,
              { backgroundColor: cardBg, borderColor: colors.border },
              isWeekdaysSelected && { backgroundColor: colors.activeBackground, borderColor: colors.accent },
            ]}
            onPress={() => { hapticLight(); onSelectWeekdays(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickDayText, { color: colors.textSecondary }]}>Weekdays</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickDayBtn,
              { backgroundColor: cardBg, borderColor: colors.border },
              isWeekendsSelected && { backgroundColor: colors.activeBackground, borderColor: colors.accent },
            ]}
            onPress={() => { hapticLight(); onSelectWeekends(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickDayText, { color: colors.textSecondary }]}>Weekends</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickDayBtn,
              { backgroundColor: cardBg, borderColor: colors.border },
              isEverydaySelected && { backgroundColor: colors.activeBackground, borderColor: colors.accent },
            ]}
            onPress={() => { hapticLight(); onSelectEveryday(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickDayText, { color: colors.textSecondary }]}>Everyday</Text>
          </TouchableOpacity>
          {onToggleCalendar && (
            <TouchableOpacity
              style={[
                styles.quickDayBtn,
                { backgroundColor: cardBg, borderColor: colors.border },
                isCalendarOpen && { backgroundColor: colors.activeBackground, borderColor: colors.accent },
              ]}
              onPress={() => { hapticLight(); onToggleCalendar(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickDayText, { color: colors.textSecondary }]}>{'\u{1F4C5}'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickDayRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickDayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
