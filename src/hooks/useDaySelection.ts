import React, { useState } from 'react';
import type { AlarmDay } from '../types/alarm';
import { WEEKDAYS, WEEKENDS, ALL_DAYS } from '../types/alarm';

interface UseDaySelectionResult {
  selectedDays: AlarmDay[];
  setSelectedDays: React.Dispatch<React.SetStateAction<AlarmDay[]>>;
  handleToggleDay: (day: AlarmDay, mode: 'one-time' | 'recurring', clearDate?: () => void) => void;
  handleQuickDays: (preset: AlarmDay[], clearDate?: () => void) => void;
  isWeekdaysSelected: boolean;
  isWeekendsSelected: boolean;
  isEverydaySelected: boolean;
}

export function useDaySelection(initialDays: AlarmDay[]): UseDaySelectionResult {
  const [selectedDays, setSelectedDays] = useState<AlarmDay[]>(initialDays);

  const handleToggleDay = (day: AlarmDay, mode: 'one-time' | 'recurring', clearDate?: () => void) => {
    if (mode === 'one-time') {
      clearDate?.();
      setSelectedDays((prev) => prev.includes(day) ? [] : [day]);
    } else {
      clearDate?.();
      setSelectedDays((prev) => {
        if (prev.includes(day)) return prev.filter((d) => d !== day);
        return [...prev, day];
      });
    }
  };

  const handleQuickDays = (preset: AlarmDay[], clearDate?: () => void) => {
    clearDate?.();
    setSelectedDays((prev) => {
      const same = prev.length === preset.length && preset.every((d) => prev.includes(d));
      if (same) return [];
      return [...preset];
    });
  };

  const isWeekdaysSelected = selectedDays.length === 5 && WEEKDAYS.every((d) => selectedDays.includes(d));
  const isWeekendsSelected = selectedDays.length === 2 && WEEKENDS.every((d) => selectedDays.includes(d));
  const isEverydaySelected = selectedDays.length === 7 && ALL_DAYS.every((d) => selectedDays.includes(d));

  return {
    selectedDays,
    setSelectedDays,
    handleToggleDay,
    handleQuickDays,
    isWeekdaysSelected,
    isWeekendsSelected,
    isEverydaySelected,
  };
}
