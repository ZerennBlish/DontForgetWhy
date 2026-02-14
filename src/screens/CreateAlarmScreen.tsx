import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import type { AlarmCategory, AlarmDay } from '../types/alarm';
import { ALL_DAYS, WEEKDAYS, WEEKENDS } from '../types/alarm';
import { addAlarm, updateAlarm } from '../services/storage';
import { scheduleAlarm, requestPermissions } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { getRandomQuote } from '../services/quotes';
import { getRandomPlaceholder } from '../data/placeholders';
import guessWhyIcons from '../data/guessWhyIcons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refreshTimerWidget } from '../widget/updateWidget';
import type { RootStackParamList } from '../navigation/types';

const DAY_LABELS: { key: AlarmDay; short: string }[] = [
  { key: 'Mon', short: 'M' },
  { key: 'Tue', short: 'T' },
  { key: 'Wed', short: 'W' },
  { key: 'Thu', short: 'T' },
  { key: 'Fri', short: 'F' },
  { key: 'Sat', short: 'S' },
  { key: 'Sun', short: 'S' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sun, 1=Mon ... 6=Sat — shift to Mon-start: (day + 6) % 7
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

const iconCategoryMap: Record<string, AlarmCategory> = {
  '\u{1F48A}': 'meds',
  '\u{1FA7A}': 'appointment',
  '\u2695\uFE0F': 'meds',
  '\u{1F4C5}': 'appointment',
  '\u{1F465}': 'task',
  '\u{1F4BC}': 'task',
  '\u{1F389}': 'task',
  '\u{1F3CB}\uFE0F': 'self-care',
  '\u{1F634}': 'self-care',
  '\u{1F6BF}': 'self-care',
};

function categoryFromIcon(emoji: string | null): AlarmCategory {
  if (!emoji) return 'general';
  return iconCategoryMap[emoji] || 'general';
}

export default function CreateAlarmScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const existingAlarm = route.params?.alarm;
  const isEditing = !!existingAlarm;

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [hours, setHours] = useState(
    existingAlarm ? existingAlarm.time.split(':')[0] : '08'
  );
  const [minutes, setMinutes] = useState(
    existingAlarm ? existingAlarm.time.split(':')[1] : '00'
  );
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => {
    if (!existingAlarm) return 'AM';
    const h = parseInt(existingAlarm.time.split(':')[0], 10);
    return h >= 12 ? 'PM' : 'AM';
  });
  const [nickname, setNickname] = useState(existingAlarm?.nickname || '');

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      if (s.timeFormat === '12h') {
        setHours((prev) => {
          const h24 = parseInt(prev, 10) || 0;
          const h12 = h24 % 12 || 12;
          return h12.toString();
        });
      }
    });
  }, []);
  const [note, setNote] = useState(existingAlarm?.note || '');
  const [placeholder] = useState(getRandomPlaceholder);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    existingAlarm?.icon || null
  );
  const [selectedPrivate, setSelectedPrivate] = useState(
    existingAlarm?.private || false
  );
  const [mode, setMode] = useState<'recurring' | 'one-time'>(
    existingAlarm?.mode || 'recurring'
  );
  const [selectedDays, setSelectedDays] = useState<AlarmDay[]>(
    existingAlarm?.days?.length ? existingAlarm.days as AlarmDay[] : [...ALL_DAYS]
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    existingAlarm?.date || null
  );
  const [calMonth, setCalMonth] = useState(() => {
    if (existingAlarm?.date) {
      const [, mo] = existingAlarm.date.split('-').map(Number);
      return mo - 1;
    }
    return new Date().getMonth();
  });
  const [calYear, setCalYear] = useState(() => {
    if (existingAlarm?.date) {
      const [yr] = existingAlarm.date.split('-').map(Number);
      return yr;
    }
    return new Date().getFullYear();
  });

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 60 + insets.bottom,
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 32,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    timeInput: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: 16,
      width: 110,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeSeparator: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.accent,
      marginHorizontal: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    nicknameInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    noteInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    charCount: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 24,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    iconCell: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCellActive: {
      backgroundColor: colors.activeBackground,
      borderColor: colors.accent,
    },
    iconEmoji: {
      fontSize: 22,
    },
    toggleCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    toggleDescription: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 12,
      lineHeight: 20,
    },
    ampmContainer: {
      flexDirection: 'column',
      marginLeft: 12,
      gap: 4,
    },
    ampmBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ampmBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    ampmText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    ampmTextActive: {
      color: colors.textPrimary,
    },
    modeContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 2,
      marginBottom: 16,
    },
    modeBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeBtnActive: {
      backgroundColor: colors.accent,
    },
    modeBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    modeBtnTextActive: {
      color: colors.textPrimary,
    },
    dayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dayBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    dayBtnTextActive: {
      color: colors.textPrimary,
    },
    quickDayRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    quickDayBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickDayBtnActive: {
      backgroundColor: colors.activeBackground,
      borderColor: colors.accent,
    },
    quickDayText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    calHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    calNav: {
      padding: 8,
    },
    calNavText: {
      fontSize: 20,
      color: colors.accent,
    },
    calTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    calWeekRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    calWeekDay: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCell: {
      width: '14.28%' as unknown as number,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calDay: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calDaySelected: {
      backgroundColor: colors.accent,
    },
    calDayText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    calDayTextDisabled: {
      color: colors.textTertiary,
      opacity: 0.4,
    },
    calDayTextSelected: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    selectedDateText: {
      fontSize: 14,
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '600',
    },
    scheduleSection: {
      marginBottom: 24,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  }), [colors, insets.bottom]);

  const handleIconPress = (emoji: string) => {
    setSelectedIcon(selectedIcon === emoji ? null : emoji);
  };

  const handleToggleDay = (day: AlarmDay) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        // Don't allow deselecting the last day
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const handleQuickDays = (preset: AlarmDay[]) => {
    setSelectedDays((prev) => {
      const same = prev.length === preset.length && preset.every((d) => prev.includes(d));
      if (same) return [...ALL_DAYS];
      return [...preset];
    });
  };

  const isWeekdaysSelected = selectedDays.length === 5 && WEEKDAYS.every((d) => selectedDays.includes(d));
  const isWeekendsSelected = selectedDays.length === 2 && WEEKENDS.every((d) => selectedDays.includes(d));

  const calDays = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleCalPrev = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleCalNext = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSave = async () => {
    try {
      if (!note.trim() && !selectedIcon) {
        Alert.alert('Hold Up', "Hold up \u2014 give this alarm at least a note or an icon so you'll know what it's for.");
        return;
      }

      if (mode === 'one-time' && !selectedDate) {
        Alert.alert('Pick a Date', 'Select a date for your one-time alarm.');
        return;
      }

      let h: number;
      if (timeFormat === '12h') {
        let h12 = parseInt(hours, 10) || 12;
        h12 = Math.min(12, Math.max(1, h12));
        if (ampm === 'AM') {
          h = h12 === 12 ? 0 : h12;
        } else {
          h = h12 === 12 ? 12 : h12 + 12;
        }
      } else {
        h = Math.min(23, Math.max(0, parseInt(hours, 10) || 0));
      }
      const m = Math.min(59, Math.max(0, parseInt(minutes, 10) || 0));
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (mode === 'one-time' && selectedDate) {
        const [py, pm, pd] = selectedDate.split('-').map(Number);
        const alarmDateTime = new Date(py, pm - 1, pd, h, m, 0, 0);
        if (alarmDateTime.getTime() <= Date.now()) {
          Alert.alert('Time Passed', 'Selected time has already passed. Choose a future time or date.');
          return;
        }
      }

      if (!isEditing || existingAlarm!.enabled) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Permissions Needed', 'Enable notifications to use alarms.');
          return;
        }
      }

      if (isEditing) {
        const updated = {
          ...existingAlarm!,
          time,
          nickname: nickname.trim() || undefined,
          note: note.trim(),
          category: categoryFromIcon(selectedIcon),
          icon: selectedIcon || undefined,
          private: selectedPrivate,
          mode,
          days: mode === 'recurring' ? selectedDays : [...ALL_DAYS],
          date: mode === 'one-time' ? selectedDate : null,
        };
        await updateAlarm(updated);
      } else {
        const alarm = {
          id: uuidv4(),
          time,
          nickname: nickname.trim() || undefined,
          note: note.trim(),
          quote: getRandomQuote(),
          enabled: true,
          mode,
          days: mode === 'recurring' ? selectedDays : [...ALL_DAYS],
          date: mode === 'one-time' ? selectedDate : null,
          category: categoryFromIcon(selectedIcon),
          icon: selectedIcon || undefined,
          private: selectedPrivate,
          createdAt: new Date().toISOString(),
          notificationIds: [],
        };

        let notificationIds: string[] = [];
        let alarmEnabled = true;
        try {
          notificationIds = await scheduleAlarm(alarm);
        } catch (scheduleError) {
          console.error('[SAVE] scheduleAlarm failed:', scheduleError);
          alarmEnabled = false;
          Alert.alert(
            'Alarm Saved',
            "Alarm saved but couldn't schedule notifications. Check notification permissions.",
          );
        }
        await addAlarm({ ...alarm, enabled: alarmEnabled, notificationIds });
      }

      refreshTimerWidget();
      navigation.goBack();
    } catch (error: any) {
      console.error('[SAVE ERROR]', error);
      Alert.alert('Error', 'Failed to save alarm: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>

      <View style={styles.timeContainer}>
        <TextInput
          style={styles.timeInput}
          value={hours}
          onChangeText={(t) => setHours(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={minutes}
          onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor={colors.textTertiary}
        />
        {timeFormat === '12h' && (
          <View style={styles.ampmContainer}>
            <TouchableOpacity
              style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
              onPress={() => setAmpm('AM')}
              activeOpacity={0.7}
            >
              <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
              onPress={() => setAmpm('PM')}
              activeOpacity={0.7}
            >
              <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.label}>Schedule</Text>
      <View style={styles.scheduleSection}>
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'recurring' && styles.modeBtnActive]}
            onPress={() => setMode('recurring')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, mode === 'recurring' && styles.modeBtnTextActive]}>
              Recurring
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'one-time' && styles.modeBtnActive]}
            onPress={() => setMode('one-time')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, mode === 'one-time' && styles.modeBtnTextActive]}>
              One-time
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'recurring' && (
          <>
            <View style={styles.dayRow}>
              {DAY_LABELS.map(({ key, short }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.dayBtn, selectedDays.includes(key) && styles.dayBtnActive]}
                  onPress={() => handleToggleDay(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayBtnText, selectedDays.includes(key) && styles.dayBtnTextActive]}>
                    {short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.quickDayRow}>
              <TouchableOpacity
                style={[styles.quickDayBtn, isWeekdaysSelected && styles.quickDayBtnActive]}
                onPress={() => handleQuickDays([...WEEKDAYS])}
                activeOpacity={0.7}
              >
                <Text style={styles.quickDayText}>Weekdays</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDayBtn, isWeekendsSelected && styles.quickDayBtnActive]}
                onPress={() => handleQuickDays([...WEEKENDS])}
                activeOpacity={0.7}
              >
                <Text style={styles.quickDayText}>Weekends</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {mode === 'one-time' && (
          <>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={handleCalPrev} style={styles.calNav}>
                <Text style={styles.calNavText}>{'\u2039'}</Text>
              </TouchableOpacity>
              <Text style={styles.calTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={handleCalNext} style={styles.calNav}>
                <Text style={styles.calNavText}>{'\u203A'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calWeekRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <Text key={i} style={styles.calWeekDay}>{d}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {Array.from({ length: calFirstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calCell} />
              ))}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(calYear, calMonth, day);
                dateObj.setHours(0, 0, 0, 0);
                const isPast = dateObj.getTime() < today.getTime();
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                return (
                  <View key={day} style={styles.calCell}>
                    <TouchableOpacity
                      style={[styles.calDay, isSelected && styles.calDaySelected]}
                      onPress={() => handleSelectDate(day)}
                      disabled={isPast}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.calDayText,
                        isPast && styles.calDayTextDisabled,
                        isSelected && styles.calDayTextSelected,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            {selectedDate && (
              <Text style={styles.selectedDateText}>{formatDateDisplay(selectedDate)}</Text>
            )}
          </>
        )}
      </View>

      <Text style={styles.label}>Nickname (shows on lock screen)</Text>
      <TextInput
        style={styles.nicknameInput}
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Pill O'Clock, Dog Time, Morning Stuff"
        placeholderTextColor={colors.textTertiary}
        maxLength={40}
      />

      <Text style={styles.label}>Why are you setting this alarm?</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{note.length}/200</Text>

      <Text style={styles.label}>What's it for?</Text>
      <View style={styles.iconGrid}>
        {guessWhyIcons.map((icon) => (
          <TouchableOpacity
            key={icon.id}
            style={[
              styles.iconCell,
              selectedIcon === icon.emoji && styles.iconCellActive,
            ]}
            onPress={() => handleIconPress(icon.emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.iconEmoji}>{icon.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Private Alarm</Text>
          <Switch
            value={selectedPrivate}
            onValueChange={setSelectedPrivate}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={selectedPrivate ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.toggleDescription}>
          Hides details on the alarm list. Tap the eye icon to peek.
        </Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>
          {isEditing ? 'Update Alarm' : 'Save Alarm'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
