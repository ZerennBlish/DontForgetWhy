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

export function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(isoDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

export function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Deleted today';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Deleted yesterday';
  if (days < 30) return `Deleted ${days} days ago`;
  return `Deleted ${Math.floor(days / 30)}mo ago`;
}
