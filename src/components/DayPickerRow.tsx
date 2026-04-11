import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import type { AlarmDay } from '../types/alarm';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import APP_ICONS from '../data/appIconAssets';

const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 } as const;

const DAY_LABELS: { key: AlarmDay; short: string; full: string }[] = [
  { key: 'Sun', short: 'S', full: 'Sunday' },
  { key: 'Mon', short: 'M', full: 'Monday' },
  { key: 'Tue', short: 'T', full: 'Tuesday' },
  { key: 'Wed', short: 'W', full: 'Wednesday' },
  { key: 'Thu', short: 'T', full: 'Thursday' },
  { key: 'Fri', short: 'F', full: 'Friday' },
  { key: 'Sat', short: 'S', full: 'Saturday' },
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
        {DAY_LABELS.map(({ key, short, full }) => {
          const isSelected = selectedDays.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.dayBtn,
                { backgroundColor: colors.border, borderColor: colors.border },
                isSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => { hapticLight(); onToggleDay(key); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={full}
              accessibilityState={{ selected: isSelected }}
              hitSlop={HIT_SLOP}
            >
              <Text style={[
                styles.dayBtnText,
                { color: colors.textTertiary },
                isSelected && { color: colors.textPrimary },
              ]}>
                {short}
              </Text>
            </TouchableOpacity>
          );
        })}
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
            accessibilityRole="button"
            accessibilityLabel="Select weekdays"
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
            accessibilityRole="button"
            accessibilityLabel="Select weekends"
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
            accessibilityRole="button"
            accessibilityLabel="Select every day"
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
              accessibilityRole="button"
              accessibilityLabel="Open date picker"
            >
              <Image source={APP_ICONS.calendar} style={{ width: 20, height: 20 }} resizeMode="contain" />
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
    fontSize: 13,
    fontFamily: FONTS.bold,
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
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
});
