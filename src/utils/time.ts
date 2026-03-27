import type { AlarmDay } from '../types/alarm';

const DAY_INDEX: Record<AlarmDay, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Returns the next occurrence of the given weekday (always in the future, 1–7 days out). */
export function getNextDayDate(dayKey: AlarmDay): Date {
  const target = DAY_INDEX[dayKey];
  const now = new Date();
  let daysUntil = target - now.getDay();
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return next;
}

/** Returns the nearest upcoming date among the given days, or null if empty. */
export function getNearestDayDate(days: AlarmDay[]): Date | null {
  if (days.length === 0) return null;
  let nearest: Date | null = null;
  for (const day of days) {
    const next = getNextDayDate(day);
    if (!nearest || next.getTime() < nearest.getTime()) {
      nearest = next;
    }
  }
  return nearest;
}

export function formatTime(time: string, format: '12h' | '24h' = '12h'): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}
