import { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput, Alert, ToastAndroid } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type { AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import { WEEKDAYS, WEEKENDS } from '../types/alarm';
import { useDaySelection } from './useDaySelection';
import { useCalendar } from './useCalendar';
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
import { refreshWidgets } from '../widget/updateWidget';
import { getNearestDayDate } from '../utils/time';

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface UseReminderFormParams {
  editId?: string;
  initialDate?: string;
}

export function useReminderForm({ editId, initialDate }: UseReminderFormParams) {
  // Time state
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
  const [pickerHours, setPickerHours] = useState<number>(() => new Date().getHours());
  const [pickerMinutes, setPickerMinutes] = useState<number>(() => new Date().getMinutes());
  const [modalHours, setModalHours] = useState(0);
  const [modalMinutes, setModalMinutes] = useState(0);
  const [modalAmpm, setModalAmpm] = useState<'AM' | 'PM'>('AM');
  const prevModalHourRef = useRef(0);
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');

  // Reminder-specific state
  const [existing, setExisting] = useState<Reminder | null>(null);
  const [text, setText] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('\u{1F4DD}');
  const [selectedPrivate, setSelectedPrivate] = useState(false);
  const [privateHint] = useState(() => {
    const hints = [
      "Hides your secrets from the reminder list. You're welcome.",
      "What reminder? Never heard of it.",
      'Your business is your business.',
      'Prying eyes get nothing.',
      'Stealth mode: engaged.',
      'Nobody needs to know you need reminders.',
      'Hidden from the list. Hidden from judgment.',
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const iconInputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<'one-time' | 'recurring'>('one-time');
  const [placeholder] = useState(getRandomPlaceholder);
  const [editReady, setEditReady] = useState(!editId);

  // Day selection
  const {
    selectedDays, setSelectedDays,
    handleToggleDay: rawToggleDay, handleQuickDays: rawQuickDays,
    isWeekdaysSelected, isWeekendsSelected,
  } = useDaySelection([]);

  const updateDateFromDays = (days: AlarmDay[]) => {
    if (days.length === 0) return;
    const nearest = getNearestDayDate(days);
    if (nearest) setSelectedDate(getDateStr(nearest));
  };

  const handleToggleDay = (day: AlarmDay, currentMode: 'one-time' | 'recurring', clearDateFn?: () => void) => {
    rawToggleDay(day, currentMode, clearDateFn);
    let newDays: AlarmDay[];
    if (currentMode === 'one-time') {
      newDays = selectedDays.includes(day) ? [] : [day];
    } else {
      newDays = selectedDays.includes(day)
        ? selectedDays.filter(d => d !== day)
        : [...selectedDays, day];
    }
    updateDateFromDays(newDays);
  };

  const handleQuickDays = (preset: AlarmDay[], clearDateFn?: () => void) => {
    rawQuickDays(preset, clearDateFn);
    const same = selectedDays.length === preset.length && preset.every(d => selectedDays.includes(d));
    const newDays = same ? [] : [...preset];
    updateDateFromDays(newDays);
  };

  const switchMode = (newMode: 'one-time' | 'recurring') => {
    if (newMode === 'one-time' && mode === 'recurring') {
      setSelectedDays([]);
    }
    if (newMode === 'recurring' && mode === 'one-time') {
      setSelectedDate(null);
    }
    setMode(newMode);
  };

  // Calendar
  const {
    calendarMonth: calMonth, calendarYear: calYear,
    showCalendar, handleCalPrev, handleCalNext,
    handleSelectDate, toggleCalendar,
    setCalendarMonth: setCalMonth, setCalendarYear: setCalYear,
    calDays, calFirstDay, MONTH_NAMES,
  } = useCalendar({
    initialMonth: initialDate ? initialDate.split('-').map(Number)[1] - 1 : undefined,
    initialYear: initialDate ? initialDate.split('-').map(Number)[0] : undefined,
    onSelectDate: (dateStr) => {
      setSelectedDate(dateStr);
      if (mode === 'recurring') {
        setSelectedDays([]);
      }
    },
  });

  // Time input handlers
  const handleHourChange = useCallback((t: string) => {
    const digits = t.replace(/[^0-9]/g, '');
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

  const handleMinuteChange = useCallback((t: string) => {
    const digits = t.replace(/[^0-9]/g, '');
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

  const handleModalHoursChange = useCallback((h: number) => {
    const prev = prevModalHourRef.current;
    if (timeFormat === '12h') {
      const crossedBoundary = (prev <= 11 && h >= 12) || (prev >= 12 && h <= 11);
      if (crossedBoundary) setModalAmpm((a) => a === 'AM' ? 'PM' : 'AM');
    }
    prevModalHourRef.current = h;
    setModalHours(h);
  }, [timeFormat]);

  const handleModalMinutesChange = useCallback((m: number) => {
    setModalMinutes(m);
  }, []);

  const prepareTimeModal = () => {
    setModalHours(pickerHours);
    setModalMinutes(pickerMinutes);
    setModalAmpm(ampm);
    prevModalHourRef.current = pickerHours;
  };

  const confirmTimeModal = () => {
    const h = modalHours || (timeFormat === '12h' ? 12 : 0);
    const m = modalMinutes;
    setPickerHours(h);
    setPickerMinutes(m);
    setAmpm(modalAmpm);
    setHourText(String(h));
    setMinuteText(String(m).padStart(2, '0'));
  };

  // Load settings
  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      setTimeInputMode(s.timeInputMode);
      if (s.timeFormat === '12h') {
        setHourText((prev) => {
          const h24 = parseInt(prev, 10) || 0;
          const h12 = h24 % 12 || 12;
          return String(h12);
        });
        setPickerHours((prev) => prev % 12 || 12);
      }
    });
  }, []);

  // Load existing reminder when editing
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
          setPickerHours(h12);
        } else {
          setHourText(String(h));
          setPickerHours(h);
        }
        setMinuteText(m.toString().padStart(2, '0'));
        setPickerMinutes(m);
      }
      if (found.days && found.days.length > 0) {
        setSelectedDays(found.days as AlarmDay[]);
      }
      if (found.recurring) {
        setMode('recurring');
      }
      setEditReady(true);
    });
  }, [editId, timeFormat]);

  const clearDate = () => setSelectedDate(null);

  const hasContent = (): boolean => {
    return !!(nickname.trim() || text.trim() || (selectedIcon && selectedIcon !== '\u{1F4DD}'));
  };

  const doSave = async (dueDate: string | null, dueTime: string | null, onSuccess: () => void) => {
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
          icon: selectedIcon || '\u{1F4DD}',
          text: text.trim(),
          nickname: nickname.trim() || undefined,
          private: selectedPrivate,
          dueDate,
          dueTime,
          days: selectedDays,
          recurring,
          notificationId: null,
          notificationIds: [],
          soundId: existing?.soundId,
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
          icon: selectedIcon || '\u{1F4DD}',
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
          soundId: undefined,
        };

        if (dueTime) {
          const notifIds = await scheduleReminderNotification(reminder).catch(() => [] as string[]);
          reminder.notificationId = notifIds[0] || null;
          reminder.notificationIds = notifIds;
        }

        await addReminder(reminder);
      }

      // Show time-until toast
      try {
        if (dueDate && dueTime) {
          let fireTime: Date | null = null;
          if (mode === 'one-time') {
            const [py, pm, pd] = dueDate.split('-').map(Number);
            const [th, tm] = dueTime.split(':').map(Number);
            fireTime = new Date(py, pm - 1, pd, th, tm, 0, 0);
          } else if (mode === 'recurring' && selectedDays.length > 0) {
            const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
            const dayNums = selectedDays.map(d => dayMap[d]);
            const [th, tm] = dueTime.split(':').map(Number);
            const now = new Date();
            for (let offset = 0; offset <= 7; offset++) {
              const candidate = new Date(now);
              candidate.setDate(candidate.getDate() + offset);
              candidate.setHours(th, tm, 0, 0);
              if (dayNums.includes(candidate.getDay()) && candidate.getTime() > Date.now()) {
                fireTime = candidate;
                break;
              }
            }
          }
          if (fireTime) {
            const diffMs = fireTime.getTime() - Date.now();
            if (diffMs > 0) {
              const totalMin = Math.floor(diffMs / 60000);
              let msg: string;
              if (totalMin < 1) {
                msg = 'Reminder in less than a minute';
              } else if (totalMin < 60) {
                msg = `Reminder in ${totalMin} minute${totalMin === 1 ? '' : 's'}`;
              } else {
                const hrs = Math.floor(totalMin / 60);
                const mins = totalMin % 60;
                if (hrs < 24) {
                  msg = `Reminder in ${hrs} hour${hrs === 1 ? '' : 's'}${mins ? ` ${mins} min` : ''}`;
                } else {
                  const days = Math.floor(hrs / 24);
                  const remHrs = hrs % 24;
                  msg = `Reminder in ${days} day${days === 1 ? '' : 's'}${remHrs ? ` ${remHrs} hour${remHrs === 1 ? '' : 's'}` : ''}`;
                }
              }
              ToastAndroid.show(msg, ToastAndroid.SHORT);
            }
          }
        }
      } catch {}

      refreshWidgets();
      onSuccess();
    } catch (error: any) {
      console.error('[SAVE REMINDER ERROR]', error);
      Alert.alert('Error', 'Failed to save reminder: ' + error.message);
    }
  };

  const save = async (onSuccess: () => void) => {
    let rawH: number, rawM: number;
    if (timeInputMode === 'type') {
      rawH = parseInt(hourText, 10);
      rawM = parseInt(minuteText, 10);
      if (isNaN(rawH)) rawH = pickerHours;
      if (isNaN(rawM)) rawM = pickerMinutes;
      if (timeFormat === '12h') { rawH = Math.max(1, Math.min(12, rawH)); } else { rawH = Math.max(0, Math.min(23, rawH)); }
      rawM = Math.max(0, Math.min(59, rawM));
    } else {
      rawH = pickerHours;
      rawM = pickerMinutes;
    }
    const hasTime = true;
    let dueTime: string | null = null;

    if (hasTime) {
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
      } else if (selectedDays.length === 1) {
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const targetDayIdx = dayMap[selectedDays[0]];
        const now = new Date();
        let daysUntil = (targetDayIdx - now.getDay() + 7) % 7;
        if (daysUntil === 0 && dueTime) {
          const [ph, pmin] = dueTime.split(':').map(Number);
          const selectedMinutes = ph * 60 + pmin;
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          if (selectedMinutes <= currentMinutes) {
            daysUntil = 7;
          }
        }
        const target = new Date(now);
        target.setDate(target.getDate() + daysUntil);
        dueDate = getDateStr(target);
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
            { text: 'Save Anyway', onPress: () => doSave(dueDate, dueTime, onSuccess) },
          ],
        );
        return;
      }
    }

    await doSave(dueDate, dueTime, onSuccess);
  };

  return {
    // Time state
    timeFormat, hourText, setHourText, minuteText, setMinuteText,
    ampm, setAmpm, pickerHours, pickerMinutes, timeInputMode,
    modalHours, modalMinutes, modalAmpm, setModalAmpm,
    hourRef, minuteRef,
    // Time handlers
    handleHourChange, handleMinuteChange, handleMinuteKeyPress,
    handleModalHoursChange, handleModalMinutesChange,
    prepareTimeModal, confirmTimeModal,
    // Form state
    existing, text, setText, nickname, setNickname, placeholder,
    selectedIcon, setSelectedIcon,
    selectedPrivate, setSelectedPrivate, privateHint,
    mode, setMode,
    selectedDate, setSelectedDate,
    iconInputRef, editReady,
    // Day selection
    selectedDays, setSelectedDays,
    handleToggleDay, handleQuickDays,
    isWeekdaysSelected, isWeekendsSelected,
    // Calendar
    calMonth, calYear,
    showCalendar, handleCalPrev, handleCalNext,
    handleSelectDate, toggleCalendar,
    calDays, calFirstDay, MONTH_NAMES,
    // Actions
    clearDate, hasContent, save, switchMode,
    // Computed
    isEditing: !!existing,
  };
}
