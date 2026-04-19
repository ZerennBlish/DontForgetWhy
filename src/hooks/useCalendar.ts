import React, { useState } from 'react';

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

interface UseCalendarOptions {
  initialMonth?: number;
  initialYear?: number;
  onSelectDate: (dateStr: string) => void;
}

interface UseCalendarResult {
  calendarMonth: number;
  calendarYear: number;
  showCalendar: boolean;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  handleCalPrev: () => void;
  handleCalNext: () => void;
  handleSelectDate: (day: number) => void;
  toggleCalendar: () => void;
  calDays: number;
  calFirstDay: number;
  MONTH_NAMES: string[];
}

export function useCalendar({ initialMonth, initialYear, onSelectDate }: UseCalendarOptions): UseCalendarResult {
  const [calendarMonth, setCalendarMonth] = useState(initialMonth ?? new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(initialYear ?? new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  const handleCalPrev = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleCalNext = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(calendarYear, calendarMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onSelectDate(`${yyyy}-${mm}-${dd}`);
  };

  const toggleCalendar = () => {
    setShowCalendar((prev) => !prev);
  };

  const calDays = getDaysInMonth(calendarYear, calendarMonth);
  const calFirstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  return {
    calendarMonth,
    calendarYear,
    showCalendar,
    setCalendarMonth,
    setCalendarYear,
    handleCalPrev,
    handleCalNext,
    handleSelectDate,
    toggleCalendar,
    calDays,
    calFirstDay,
    MONTH_NAMES,
  };
}
