import { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput, Alert, ToastAndroid } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type { AlarmCategory, AlarmDay } from '../types/alarm';
import type { Alarm } from '../types/alarm';
import type { SoundMode } from '../utils/soundModeUtils';
import { soundModeToSoundId, soundIdToSoundMode } from '../utils/soundModeUtils';
import { useDaySelection } from './useDaySelection';
import { useCalendar } from './useCalendar';
import { addAlarm, updateAlarm } from '../services/storage';
import { scheduleAlarm, requestPermissions } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { getRandomQuote } from '../services/quotes';
import { getRandomPlaceholder } from '../data/placeholders';
import { refreshWidgets } from '../widget/updateWidget';
import { getNearestDayDate } from '../utils/time';
import type { SystemSound } from '../components/SoundPickerModal';

function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface UseAlarmFormParams {
  existingAlarm?: Alarm;
  initialDate?: string;
}

export function useAlarmForm({ existingAlarm, initialDate }: UseAlarmFormParams) {
  const isEditing = !!existingAlarm;

  // Time state
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
  const [pickerHours, setPickerHours] = useState<number>(() => {
    if (existingAlarm) {
      return parseInt(existingAlarm.time.split(':')[0], 10);
    }
    return new Date().getHours();
  });
  const [pickerMinutes, setPickerMinutes] = useState<number>(() => {
    if (existingAlarm) {
      return parseInt(existingAlarm.time.split(':')[1], 10);
    }
    return new Date().getMinutes();
  });
  const [modalHours, setModalHours] = useState(0);
  const [modalMinutes, setModalMinutes] = useState(0);
  const [modalAmpm, setModalAmpm] = useState<'AM' | 'PM'>('AM');
  const prevModalHourRef = useRef(0);
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');

  // Form state
  const [nickname, setNickname] = useState(existingAlarm?.nickname || '');
  const [note, setNote] = useState(existingAlarm?.note || '');
  const [placeholder] = useState(getRandomPlaceholder);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    existingAlarm?.icon || null
  );
  const [guessWhy, setGuessWhy] = useState(existingAlarm?.guessWhy ?? false);
  const [selectedPrivate, setSelectedPrivate] = useState(
    existingAlarm?.private || false
  );
  const [privateHint] = useState(() => {
    const hints = [
      "Hides your secrets from the alarm list. You're welcome.",
      "What alarm? I don't see an alarm.",
      'Your business is your business.',
      'Prying eyes get nothing.',
      'Stealth mode: engaged.',
      'Nobody needs to know about your 3 AM alarm.',
      'Hidden from the list. Hidden from judgment.',
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  });
  const [mode, setMode] = useState<'recurring' | 'one-time'>(
    existingAlarm?.mode || (initialDate ? 'one-time' : 'one-time')
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    existingAlarm?.date || initialDate || null
  );
  const iconInputRef = useRef<TextInput>(null);

  // Sound state
  const [soundMode, setSoundMode] = useState<SoundMode>(() => soundIdToSoundMode(existingAlarm?.soundId));
  const [selectedSoundUri, setSelectedSoundUri] = useState<string | null>(
    existingAlarm?.soundUri || null
  );
  const [selectedSoundName, setSelectedSoundName] = useState<string | null>(
    existingAlarm?.soundName || null
  );
  const [selectedSystemSoundID, setSelectedSystemSoundID] = useState<number | null>(
    existingAlarm?.soundID ?? null
  );

  // Day selection
  const {
    selectedDays, setSelectedDays,
    handleToggleDay: rawToggleDay, handleQuickDays: rawQuickDays,
    isWeekdaysSelected, isWeekendsSelected,
  } = useDaySelection(
    existingAlarm?.days?.length ? existingAlarm.days as AlarmDay[] : []
  );

  const updateDateFromDays = (days: AlarmDay[]) => {
    if (days.length === 0) return;
    const nearest = getNearestDayDate(days);
    if (nearest) setSelectedDate(getDateStr(nearest));
  };

  const handleToggleDay = (day: AlarmDay, currentMode: 'one-time' | 'recurring', clearDateFn?: () => void) => {
    rawToggleDay(day, currentMode, clearDateFn);
    // Compute resulting days (mirrors useDaySelection logic)
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
    // Compute resulting days (mirrors useDaySelection logic)
    const same = selectedDays.length === preset.length && preset.every(d => selectedDays.includes(d));
    const newDays = same ? [] : [...preset];
    updateDateFromDays(newDays);
  };

  const switchMode = (newMode: 'recurring' | 'one-time') => {
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
    calDays, calFirstDay, MONTH_NAMES,
  } = useCalendar({
    initialMonth: (existingAlarm?.date || initialDate) ? (existingAlarm?.date || initialDate)!.split('-').map(Number)[1] - 1 : undefined,
    initialYear: (existingAlarm?.date || initialDate) ? (existingAlarm?.date || initialDate)!.split('-').map(Number)[0] : undefined,
    onSelectDate: (dateStr) => {
      setSelectedDate(dateStr);
      if (mode === 'recurring') {
        setSelectedDays([]);
      }
    },
  });

  // Time input handlers
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

  // Auto-clear guessWhy when eligibility is lost
  useEffect(() => {
    if (guessWhy && !nickname.trim() && note.trim().length < 3 && !selectedIcon) {
      setGuessWhy(false);
    }
  }, [nickname, note, selectedIcon, guessWhy]);

  const clearDate = () => setSelectedDate(null);

  const applySystemSound = (sound: SystemSound | null) => {
    if (sound) {
      setSelectedSoundUri(sound.url);
      setSelectedSoundName(sound.title);
      setSelectedSystemSoundID(sound.soundID);
    } else {
      setSelectedSoundUri(null);
      setSelectedSoundName(null);
      setSelectedSystemSoundID(null);
    }
  };

  const hasContent = (): boolean => {
    return !!(nickname.trim() || note.trim() || (selectedIcon && selectedIcon !== '\u{1F60A}'));
  };

  const save = async (onSuccess: () => void) => {
    try {
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

      let alarmDate: string | null = null;
      if (mode === 'one-time') {
        if (selectedDate) {
          alarmDate = selectedDate;
          const [py, pm, pd] = alarmDate.split('-').map(Number);
          const alarmDateTime = new Date(py, pm - 1, pd, h, m, 0, 0);
          if (alarmDateTime.getTime() <= Date.now()) {
            Alert.alert('Time Passed', 'Selected time has already passed. Choose a future time or date.');
            return;
          }
        } else if (selectedDays.length === 1) {
          const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          const targetDayIdx = dayMap[selectedDays[0]];
          const now = new Date();
          let daysUntil = (targetDayIdx - now.getDay() + 7) % 7;
          if (daysUntil === 0) {
            const selectedMinutes = h * 60 + m;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (selectedMinutes <= currentMinutes) {
              daysUntil = 7;
            }
          }
          const target = new Date(now);
          target.setDate(target.getDate() + daysUntil);
          alarmDate = getDateStr(target);
          const [py, pm, pd] = alarmDate.split('-').map(Number);
          const alarmDateTime = new Date(py, pm - 1, pd, h, m, 0, 0);
          if (alarmDateTime.getTime() <= Date.now()) {
            Alert.alert('Time Passed', 'Selected time has already passed. Choose a future time or date.');
            return;
          }
        } else {
          const now = new Date();
          const selectedMinutes = h * 60 + m;
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          if (selectedMinutes > currentMinutes) {
            alarmDate = getDateStr(now);
          } else {
            const tmrw = new Date(now);
            tmrw.setDate(tmrw.getDate() + 1);
            alarmDate = getDateStr(tmrw);
          }
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
          category: 'general' as AlarmCategory,
          icon: selectedIcon || undefined,
          guessWhy,
          private: selectedPrivate,
          mode,
          days: selectedDays,
          date: mode === 'one-time' ? alarmDate : null,
          soundId: soundModeToSoundId(soundMode) ?? (selectedSoundUri ? undefined : (existingAlarm!.soundId === 'silent' || existingAlarm!.soundId === 'true_silent' ? undefined : existingAlarm!.soundId)),
          soundUri: soundMode === 'sound' ? (selectedSoundUri || undefined) : undefined,
          soundName: soundMode === 'sound' ? (selectedSoundName || undefined) : undefined,
          soundID: soundMode === 'sound' ? (selectedSystemSoundID ?? undefined) : undefined,
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
          date: mode === 'one-time' ? alarmDate : null,
          category: 'general' as AlarmCategory,
          icon: selectedIcon || undefined,
          guessWhy,
          private: selectedPrivate,
          createdAt: new Date().toISOString(),
          notificationIds: [],
          soundId: soundModeToSoundId(soundMode),
          soundUri: soundMode === 'sound' ? (selectedSoundUri || undefined) : undefined,
          soundName: soundMode === 'sound' ? (selectedSoundName || undefined) : undefined,
          soundID: soundMode === 'sound' ? (selectedSystemSoundID ?? undefined) : undefined,
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

      // Show time-until toast
      try {
        let fireTime: Date | null = null;
        if (mode === 'one-time' && alarmDate) {
          const [py, pm, pd] = alarmDate.split('-').map(Number);
          fireTime = new Date(py, pm - 1, pd, h, m, 0, 0);
        } else if (mode === 'recurring' && selectedDays.length > 0) {
          const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          const dayNums = selectedDays.map(d => dayMap[d]);
          const now = new Date();
          for (let offset = 0; offset <= 7; offset++) {
            const candidate = new Date(now);
            candidate.setDate(candidate.getDate() + offset);
            candidate.setHours(h, m, 0, 0);
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
              msg = 'Alarm in less than a minute';
            } else if (totalMin < 60) {
              msg = `Alarm in ${totalMin} minute${totalMin === 1 ? '' : 's'}`;
            } else {
              const hrs = Math.floor(totalMin / 60);
              const mins = totalMin % 60;
              if (hrs < 24) {
                msg = `Alarm in ${hrs} hour${hrs === 1 ? '' : 's'}${mins ? ` ${mins} min` : ''}`;
              } else {
                const days = Math.floor(hrs / 24);
                const remHrs = hrs % 24;
                msg = `Alarm in ${days} day${days === 1 ? '' : 's'}${remHrs ? ` ${remHrs} hour${remHrs === 1 ? '' : 's'}` : ''}`;
              }
            }
            ToastAndroid.show(msg, ToastAndroid.SHORT);
          }
        }
      } catch {}

      refreshWidgets();
      onSuccess();
    } catch (error: unknown) {
      console.error('[SAVE ERROR]', error);
      Alert.alert('Error', 'Failed to save alarm: ' + (error instanceof Error ? error.message : String(error)));
    }
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
    nickname, setNickname, note, setNote, placeholder,
    selectedIcon, setSelectedIcon,
    guessWhy, setGuessWhy,
    selectedPrivate, setSelectedPrivate, privateHint,
    mode, setMode,
    selectedDate, setSelectedDate,
    iconInputRef,
    // Sound state
    soundMode, setSoundMode,
    selectedSoundUri, setSelectedSoundUri,
    selectedSoundName, setSelectedSoundName,
    selectedSystemSoundID, setSelectedSystemSoundID,
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
    clearDate, applySystemSound, hasContent, save, switchMode,
    // Computed
    isEditing,
  };
}
