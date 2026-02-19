import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder } from '../types/reminder';
import type { AlarmDay } from '../types/alarm';
import { WEEKDAYS, WEEKENDS } from '../types/alarm';
import {
  getReminders,
  addReminder,
  updateReminder,
} from '../services/reminderStorage';
import {
  scheduleReminderNotification,
  cancelReminderNotification,
  cancelReminderNotifications,
  requestPermissions,
} from '../services/notifications';
import { loadSettings } from '../services/settings';
import { getRandomPlaceholder } from '../data/placeholders';
import guessWhyIcons from '../data/guessWhyIcons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refreshTimerWidget } from '../widget/updateWidget';
import { hapticLight, hapticMedium } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/types';

const DAY_LABELS: { key: AlarmDay; short: string }[] = [
  { key: 'Sun', short: 'S' },
  { key: 'Mon', short: 'M' },
  { key: 'Tue', short: 'T' },
  { key: 'Wed', short: 'W' },
  { key: 'Thu', short: 'T' },
  { key: 'Fri', short: 'F' },
  { key: 'Sat', short: 'S' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

export default function CreateReminderScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const editId = route.params?.reminderId;

  // Time-related state — mirrors CreateAlarmScreen order exactly
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [hourText, setHourText] = useState<string>(() => String(new Date().getHours()));
  const [minuteText, setMinuteText] = useState<string>(
    () => String(new Date().getMinutes()).padStart(2, '0')
  );
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(
    () => new Date().getHours() >= 12 ? 'PM' : 'AM'
  );
  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  // Reminder-specific state
  const [existing, setExisting] = useState<Reminder | null>(null);
  const [text, setText] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('\u{1F4DD}');
  const [selectedPrivate, setSelectedPrivate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDays, setSelectedDays] = useState<AlarmDay[]>([]);
  const [mode, setMode] = useState<'one-time' | 'recurring'>('one-time');
  const [placeholder] = useState(getRandomPlaceholder);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Time input handlers — identical to CreateAlarmScreen
  const handleHourChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') { setHourText(''); return; }
    if (timeFormat === '12h') {
      if (digits.length === 1) {
        const d = parseInt(digits, 10);
        if (d >= 2 && d <= 9) {
          setHourText(digits);
          minuteRef.current?.focus();
        } else if (d <= 1) {
          setHourText(digits);
        }
      } else {
        const val = parseInt(digits.slice(0, 2), 10);
        if (val >= 1 && val <= 12) {
          setHourText(digits.slice(0, 2));
          minuteRef.current?.focus();
        }
      }
    } else {
      if (digits.length === 1) {
        const d = parseInt(digits, 10);
        if (d >= 3) {
          setHourText(digits);
          minuteRef.current?.focus();
        } else {
          setHourText(digits);
        }
      } else {
        const val = parseInt(digits.slice(0, 2), 10);
        if (val <= 23) {
          setHourText(digits.slice(0, 2));
          minuteRef.current?.focus();
        }
      }
    }
  }, [timeFormat]);

  const handleMinuteChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') { setMinuteText(''); return; }
    if (digits.length === 1) {
      if (parseInt(digits, 10) <= 5) {
        setMinuteText(digits);
      }
    } else {
      const val = parseInt(digits.slice(0, 2), 10);
      if (val <= 59) {
        setMinuteText(digits.slice(0, 2));
      }
    }
  }, []);

  const handleMinuteKeyPress = useCallback(({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Backspace' && minuteText === '') {
      hourRef.current?.focus();
    }
  }, [minuteText]);

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      if (s.timeFormat === '12h') {
        setHourText((prev) => {
          const h24 = parseInt(prev, 10) || 0;
          const h12 = h24 % 12 || 12;
          return String(h12);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!editId) return;
    getReminders().then((reminders) => {
      const found = reminders.find((r) => r.id === editId);
      if (!found) return;
      setExisting(found);
      setText(found.text);
      setNickname(found.nickname || '');
      setSelectedIcon(found.icon);
      setSelectedPrivate(found.private);
      if (found.dueDate) {
        setSelectedDate(found.dueDate);
        const [yr, mo] = found.dueDate.split('-').map(Number);
        setCalMonth(mo - 1);
        setCalYear(yr);
      }
      if (found.dueTime) {
        const [h, m] = found.dueTime.split(':').map(Number);
        if (timeFormat === '12h') {
          setAmpm(h >= 12 ? 'PM' : 'AM');
          const h12 = h % 12 || 12;
          setHourText(String(h12));
        } else {
          setHourText(String(h));
        }
        setMinuteText(m.toString().padStart(2, '0'));
      }
      if (found.days && found.days.length > 0) {
        setSelectedDays(found.days as AlarmDay[]);
      }
      if (found.recurring) {
        setMode('recurring');
      }
    });
  }, [editId, timeFormat]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calDays = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);

  const handleToggleDay = (day: AlarmDay) => {
    if (mode === 'one-time') {
      setSelectedDays((prev) => prev.includes(day) ? [] : [day]);
    } else {
      setSelectedDate(null);
      setSelectedDays((prev) => {
        if (prev.includes(day)) return prev.filter((d) => d !== day);
        return [...prev, day];
      });
    }
  };

  const handleQuickDays = (preset: AlarmDay[]) => {
    setSelectedDate(null);
    setSelectedDays((prev) => {
      const same = prev.length === preset.length && preset.every((d) => prev.includes(d));
      if (same) return [];
      return [...preset];
    });
  };

  const isWeekdaysSelected = selectedDays.length === 5 && WEEKDAYS.every((d) => selectedDays.includes(d));
  const isWeekendsSelected = selectedDays.length === 2 && WEEKENDS.every((d) => selectedDays.includes(d));

  const cardBg = colors.card + 'BF';

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
    hourInput: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: cardBg,
      borderRadius: 16,
      width: 90,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeColon: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      marginHorizontal: 4,
    },
    minuteInput: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: cardBg,
      borderRadius: 16,
      width: 90,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: cardBg,
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
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    scheduleSection: {
      marginBottom: 24,
    },
    modeContainer: {
      flexDirection: 'row',
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
    setDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      marginBottom: 16,
      gap: 6,
    },
    setDateText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    setDateChevron: {
      fontSize: 11,
      color: colors.textTertiary,
      marginLeft: 2,
    },
    clearDateBtn: {
      padding: 8,
    },
    clearDateText: {
      fontSize: 16,
      color: colors.textTertiary,
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
    textInput: {
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
    nicknameInput: {
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    toggleCard: {
      backgroundColor: cardBg,
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
  }), [colors, cardBg, insets.bottom]);

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
    if (mode === 'recurring') {
      setSelectedDays([]);
    }
  };

  const doSave = async (dueDate: string | null, dueTime: string | null) => {
    try {
      if (dueTime) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Permissions Needed', 'Enable notifications to schedule reminder nudges.');
          return;
        }
      }

      const recurring = mode === 'recurring';

      if (existing) {
        if (existing.notificationIds?.length) {
          await cancelReminderNotifications(existing.notificationIds).catch(() => {});
        } else if (existing.notificationId) {
          await cancelReminderNotification(existing.notificationId).catch(() => {});
        }

        const updated: Reminder = {
          ...existing,
          icon: selectedIcon,
          text: text.trim(),
          nickname: nickname.trim() || undefined,
          private: selectedPrivate,
          dueDate,
          dueTime,
          days: selectedDays,
          recurring,
          notificationId: null,
          notificationIds: [],
        };

        if (dueTime && !updated.completed) {
          const notifIds = await scheduleReminderNotification(updated).catch(() => [] as string[]);
          updated.notificationId = notifIds[0] || null;
          updated.notificationIds = notifIds;
        }

        await updateReminder(updated);
      } else {
        const reminder: Reminder = {
          id: uuidv4(),
          icon: selectedIcon,
          text: text.trim(),
          nickname: nickname.trim() || undefined,
          private: selectedPrivate,
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate,
          dueTime,
          days: selectedDays,
          recurring,
          notificationId: null,
          notificationIds: [],
          pinned: false,
          completionHistory: [],
        };

        if (dueTime) {
          const notifIds = await scheduleReminderNotification(reminder).catch(() => [] as string[]);
          reminder.notificationId = notifIds[0] || null;
          reminder.notificationIds = notifIds;
        }

        await addReminder(reminder);
      }

      refreshTimerWidget();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AlarmList');
      }
    } catch (error: any) {
      console.error('[SAVE REMINDER ERROR]', error);
      Alert.alert('Error', 'Failed to save reminder: ' + error.message);
    }
  };

  const handleSave = async () => {
    hapticMedium();
    if (!text.trim() && !selectedIcon) {
      Alert.alert('Hold Up', 'Add some text or pick an icon so you know what to remember.');
      return;
    }

    const rawH = parseInt(hourText, 10);
    const rawM = parseInt(minuteText, 10);
    let dueTime: string | null = null;

    if (!isNaN(rawH) && (rawH > 0 || rawM > 0 || hourText !== '')) {
      let h: number;
      if (timeFormat === '12h') {
        let h12 = Math.min(12, Math.max(1, rawH || 12));
        if (ampm === 'AM') {
          h = h12 === 12 ? 0 : h12;
        } else {
          h = h12 === 12 ? 12 : h12 + 12;
        }
      } else {
        h = Math.min(23, Math.max(0, rawH || 0));
      }
      const m = Math.min(59, Math.max(0, rawM || 0));
      dueTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    let dueDate: string | null = null;
    if (mode === 'one-time') {
      if (selectedDate) {
        dueDate = selectedDate;
      } else if (dueTime) {
        const now = new Date();
        const [ph, pmin] = dueTime.split(':').map(Number);
        const selectedMinutes = ph * 60 + pmin;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (selectedMinutes > currentMinutes) {
          dueDate = getDateStr(now);
        } else {
          const tmrw = new Date(now);
          tmrw.setDate(tmrw.getDate() + 1);
          dueDate = getDateStr(tmrw);
        }
      }
    } else if (mode === 'recurring') {
      dueDate = selectedDate;
    }

    if (dueTime && dueDate) {
      const [py, pm, pd] = dueDate.split('-').map(Number);
      const [ph, pmin] = dueTime.split(':').map(Number);
      const combined = new Date(py, pm - 1, pd, ph, pmin, 0, 0);
      if (combined.getTime() <= Date.now()) {
        Alert.alert(
          'Time Already Passed',
          'The selected date and time are in the past. Save anyway?',
          [
            { text: 'Change Time', style: 'cancel' },
            { text: 'Save Anyway', onPress: () => doSave(dueDate, dueTime) },
          ],
        );
        return;
      }
    }

    await doSave(dueDate, dueTime);
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/fullscreenicon.png')}
          style={{ width: '100%', height: '100%', opacity: 0.07 }}
          resizeMode="cover"
        />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>
          {existing ? 'Edit Reminder' : 'New Reminder'}
        </Text>

        <View style={styles.timeContainer}>
          <TextInput
            ref={hourRef}
            style={styles.hourInput}
            value={hourText}
            onChangeText={handleHourChange}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder={timeFormat === '12h' ? '12' : '0'}
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.timeColon}>:</Text>
          <TextInput
            ref={minuteRef}
            style={styles.minuteInput}
            value={minuteText}
            onChangeText={handleMinuteChange}
            onKeyPress={handleMinuteKeyPress}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder="00"
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
              style={[styles.modeBtn, mode === 'one-time' && styles.modeBtnActive]}
              onPress={() => setMode('one-time')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === 'one-time' && styles.modeBtnTextActive]}>
                One-time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'recurring' && styles.modeBtnActive]}
              onPress={() => setMode('recurring')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === 'recurring' && styles.modeBtnTextActive]}>
                Recurring
              </Text>
            </TouchableOpacity>
          </View>

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
          {mode === 'recurring' && (
            <>
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
                <TouchableOpacity
                  style={[styles.quickDayBtn, showCalendar && styles.quickDayBtnActive]}
                  onPress={() => { hapticLight(); setShowCalendar((prev) => !prev); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDayText}>{'\u{1F4C5}'}</Text>
                </TouchableOpacity>
              </View>
              {selectedDate && (
                <View style={styles.setDateRow}>
                  <Text style={styles.setDateText}>
                    {'\u{1F4C5}'} {formatDateDisplay(selectedDate)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { hapticLight(); setSelectedDate(null); }}
                    style={styles.clearDateBtn}
                  >
                    <Text style={styles.clearDateText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {mode === 'one-time' && (
            <View style={styles.setDateRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => { hapticLight(); setShowCalendar((prev) => !prev); }}
                activeOpacity={0.6}
              >
                <Text style={styles.setDateText}>
                  {'\u{1F4C5}'} {selectedDate ? formatDateDisplay(selectedDate) : 'No date set'}
                </Text>
              </TouchableOpacity>
              {selectedDate ? (
                <TouchableOpacity
                  onPress={() => { hapticLight(); setSelectedDate(null); }}
                  style={styles.clearDateBtn}
                >
                  <Text style={styles.clearDateText}>{'\u2715'}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.setDateChevron}>{showCalendar ? '\u25B4' : '\u25BE'}</Text>
              )}
            </View>
          )}

          {showCalendar && (
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

        <Text style={styles.label}>Nickname (optional, for privacy)</Text>
        <TextInput
          style={styles.nicknameInput}
          value={nickname}
          onChangeText={setNickname}
          placeholder="e.g. Important thing, Weekly task"
          placeholderTextColor={colors.textTertiary}
          maxLength={40}
        />

        <Text style={styles.label}>What do you need to remember?</Text>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={200}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{text.length}/200</Text>

        <Text style={styles.label}>What's it for?</Text>
        <View style={styles.iconGrid}>
          {guessWhyIcons.map((icon) => (
            <TouchableOpacity
              key={icon.id}
              style={[
                styles.iconCell,
                selectedIcon === icon.emoji && styles.iconCellActive,
              ]}
              onPress={() => { hapticLight(); setSelectedIcon(selectedIcon === icon.emoji ? '' : icon.emoji); }}
              activeOpacity={0.7}
            >
              <Text style={styles.iconEmoji}>{icon.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Private</Text>
            <Switch
              value={selectedPrivate}
              onValueChange={(v) => { hapticLight(); setSelectedPrivate(v); }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={selectedPrivate ? colors.textPrimary : colors.textTertiary}
            />
          </View>
          <Text style={styles.toggleDescription}>
            Hides details on the reminder card and widget.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>
            {existing ? 'Update Reminder' : 'Save Reminder'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
