import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import SoundPickerModal from '../components/SoundPickerModal';
import type { SystemSound } from '../components/SoundPickerModal';
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
  // 0=Sun, 1=Mon ... 6=Sat — shift to Mon-start: (day + 6) % 7
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

function formatDateShort(dateStr: string): string {
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const tomorrowObj = new Date(todayObj);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setHours(0, 0, 0, 0);

  if (dateObj.getTime() === todayObj.getTime()) return 'Today';
  if (dateObj.getTime() === tomorrowObj.getTime()) return 'Tomorrow';
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

const iconCategoryMap: Record<string, AlarmCategory> = {
  // Health & Medical
  '\u{1F48A}': 'meds',          // 💊 meds
  '\u2695\uFE0F': 'meds',       // ⚕️ medical
  '\u{1FA7A}': 'appointment',   // 🩺 doctor
  '\u{1F9B7}': 'appointment',   // 🦷 dentist
  '\u{1F4C5}': 'appointment',   // 📅 appointment
  '\u{1F487}': 'appointment',   // 💇 haircut
  // Events & Social
  '\u{1F48D}': 'event',         // 💍 anniversary
  '\u{1F382}': 'event',         // 🎂 birthday
  '\u2764\uFE0F': 'event',      // ❤️ date
  '\u{1F64F}': 'event',         // 🙏 church
  '\u{1F389}': 'event',         // 🎉 celebration
  // Work & Tasks
  '\u{1F465}': 'task',          // 👥 meeting
  '\u{1F4BC}': 'task',          // 💼 work
  '\u{1F4B2}': 'task',          // 💲 bills
  '\u{1F4DD}': 'task',          // 📝 homework
  '\u{1F4C4}': 'task',          // 📄 documents
  '\u{1F4E6}': 'task',          // 📦 delivery
  // Self-Care & Wellness
  '\u{1F3CB}\uFE0F': 'self-care', // 🏋️ dumbbell
  '\u{1F9D8}': 'self-care',     // 🧘 yoga
  '\u{1F4A7}': 'self-care',     // 💧 hydrate
  '\u{1F6BF}': 'self-care',     // 🚿 shower
  '\u{1F6CF}\uFE0F': 'self-care', // 🛏️ bedtime
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
  const [hourText, setHourText] = useState<string>(() => {
    if (existingAlarm) {
      const h24 = parseInt(existingAlarm.time.split(':')[0], 10);
      return String(h24);
    }
    return String(new Date().getHours());
  });
  const [minuteText, setMinuteText] = useState<string>(() => {
    if (existingAlarm) {
      return existingAlarm.time.split(':')[1];
    }
    return String(new Date().getMinutes()).padStart(2, '0');
  });
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => {
    if (existingAlarm) {
      const h = parseInt(existingAlarm.time.split(':')[0], 10);
      return h >= 12 ? 'PM' : 'AM';
    }
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  });
  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);
  const [nickname, setNickname] = useState(existingAlarm?.nickname || '');

  const [systemSoundPickerVisible, setSystemSoundPickerVisible] = useState(false);
  const [selectedSoundUri, setSelectedSoundUri] = useState<string | null>(
    existingAlarm?.soundUri || null
  );
  const [selectedSoundName, setSelectedSoundName] = useState<string | null>(
    existingAlarm?.soundName || null
  );
  const [selectedSystemSoundID, setSelectedSystemSoundID] = useState<number | null>(
    existingAlarm?.soundID ?? null
  );

  const handleHourChange = (text: string) => {
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
  };

  const handleMinuteChange = (text: string) => {
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
  };

  const handleMinuteKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Backspace' && minuteText === '') {
      hourRef.current?.focus();
    }
  };

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
  const [note, setNote] = useState(existingAlarm?.note || '');
  const [placeholder] = useState(getRandomPlaceholder);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    existingAlarm?.icon || null
  );
  const [selectedPrivate, setSelectedPrivate] = useState(
    existingAlarm?.private || false
  );
  const [mode, setMode] = useState<'recurring' | 'one-time'>(
    existingAlarm?.mode || 'one-time'
  );
  const [selectedDays, setSelectedDays] = useState<AlarmDay[]>(
    existingAlarm?.days?.length ? existingAlarm.days as AlarmDay[] : [...ALL_DAYS]
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    existingAlarm?.date || null
  );
  const [userPickedDate, setUserPickedDate] = useState(!!existingAlarm?.date);
  const [showCalendar, setShowCalendar] = useState(false);
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

  const effectiveDate = useMemo(() => {
    if (userPickedDate && selectedDate) return selectedDate;
    const rawH = parseInt(hourText, 10) || 0;
    const rawM = parseInt(minuteText, 10) || 0;
    let h24: number;
    if (timeFormat === '12h') {
      const h12 = Math.min(12, Math.max(1, rawH || 12));
      h24 = ampm === 'AM' ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
    } else {
      h24 = Math.min(23, Math.max(0, rawH));
    }
    const m = Math.min(59, Math.max(0, rawM));
    const now = new Date();
    const alarmToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h24, m, 0, 0);
    if (alarmToday.getTime() <= now.getTime()) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return getDateStr(tomorrow);
    }
    return getDateStr(now);
  }, [hourText, minuteText, ampm, timeFormat, userPickedDate, selectedDate]);

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
      backgroundColor: colors.card,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      width: 90,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
    soundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    soundLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    soundPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    soundPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    systemSoundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    systemSoundValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    systemSoundValueText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
      maxWidth: 160,
    },
    systemSoundChevron: {
      fontSize: 16,
      color: colors.textTertiary,
    },
  }), [colors, insets.bottom]);

  const handleIconPress = (emoji: string) => {
    hapticLight();
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

  const handleSystemSoundSelect = (sound: SystemSound | null) => {
    hapticLight();
    if (sound) {
      setSelectedSoundUri(sound.url);
      setSelectedSoundName(sound.title);
      setSelectedSystemSoundID(sound.soundID);
    } else {
      setSelectedSoundUri(null);
      setSelectedSoundName(null);
      setSelectedSystemSoundID(null);
    }
    setSystemSoundPickerVisible(false);
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
    setUserPickedDate(true);
  };

  const handleSave = async () => {
    hapticMedium();
    try {
      if (!note.trim() && !selectedIcon) {
        Alert.alert('Hold Up', "Hold up \u2014 give this alarm at least a note or an icon so you'll know what it's for.");
        return;
      }

      if (mode === 'one-time' && !effectiveDate) {
        Alert.alert('Pick a Date', 'Select a date for your one-time alarm.');
        return;
      }

      const rawH = parseInt(hourText, 10) || 0;
      const rawM = parseInt(minuteText, 10) || 0;
      let h: number;
      if (timeFormat === '12h') {
        let h12 = Math.min(12, Math.max(1, rawH || 12));
        if (ampm === 'AM') {
          h = h12 === 12 ? 0 : h12;
        } else {
          h = h12 === 12 ? 12 : h12 + 12;
        }
      } else {
        h = Math.min(23, Math.max(0, rawH));
      }
      const m = Math.min(59, Math.max(0, rawM));
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (mode === 'one-time' && effectiveDate) {
        const [py, pm, pd] = effectiveDate.split('-').map(Number);
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
          days: selectedDays,
          date: mode === 'one-time' ? effectiveDate : null,
          soundId: undefined,
          soundUri: selectedSoundUri || undefined,
          soundName: selectedSoundName || undefined,
          soundID: selectedSystemSoundID ?? undefined,
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
          days: selectedDays,
          date: mode === 'one-time' ? effectiveDate : null,
          category: categoryFromIcon(selectedIcon),
          icon: selectedIcon || undefined,
          private: selectedPrivate,
          createdAt: new Date().toISOString(),
          notificationIds: [],
          soundUri: selectedSoundUri || undefined,
          soundName: selectedSoundName || undefined,
          soundID: selectedSystemSoundID ?? undefined,
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
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AlarmList');
      }
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

        {mode === 'one-time' && (
          <>
            <TouchableOpacity
              style={styles.setDateRow}
              onPress={() => { hapticLight(); setShowCalendar((prev) => !prev); }}
              activeOpacity={0.6}
            >
              <Text style={styles.setDateText}>
                {'\u{1F4C5}'} {formatDateShort(effectiveDate)}
              </Text>
              <Text style={styles.setDateChevron}>{showCalendar ? '\u25B4' : '\u25BE'}</Text>
            </TouchableOpacity>

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
                    const isSelected = effectiveDate === dateStr;
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
                {effectiveDate && (
                  <Text style={styles.selectedDateText}>{formatDateDisplay(effectiveDate)}</Text>
                )}
              </>
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

      <Text style={styles.label}>Alarm Sound</Text>
      <TouchableOpacity
        style={styles.systemSoundRow}
        onPress={() => setSystemSoundPickerVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.soundLabel}>
          {selectedSoundUri ? '\u{1F3B5}' : '\u{1F514}'} {selectedSoundName || 'Default'}
        </Text>
        <View style={styles.systemSoundValue}>
          <Text style={styles.systemSoundValueText} numberOfLines={1}>
            {selectedSoundUri ? 'System sound' : 'Tap to change'}
          </Text>
          <Text style={styles.systemSoundChevron}>{'\u203A'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Private Alarm</Text>
          <Switch
            value={selectedPrivate}
            onValueChange={(v) => { hapticLight(); setSelectedPrivate(v); }}
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

      <SoundPickerModal
        visible={systemSoundPickerVisible}
        onSelect={handleSystemSoundSelect}
        onClose={() => setSystemSoundPickerVisible(false)}
        currentSoundID={selectedSystemSoundID}
      />
    </ScrollView>
  );
}
