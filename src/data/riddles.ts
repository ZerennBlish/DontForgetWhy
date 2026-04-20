import { YEARLY_RIDDLES, type DailyRiddleEntry } from './dfw_yearly_riddles';

export { YEARLY_RIDDLES };
export type { DailyRiddleEntry };

/**
 * Look up the daily riddle entry for a given `YYYY-MM-DD` date. Uses noon
 * UTC as the anchor so DST transitions on the caller's device can't shift
 * the computed day-of-year: every device anywhere in the world resolves the
 * same `dateStr` to the same entry in YEARLY_RIDDLES.
 */
export function getDailyRiddleForDate(dateStr: string): DailyRiddleEntry {
  const date = new Date(dateStr + 'T12:00:00Z');
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear =
    Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const match = YEARLY_RIDDLES.find((r) => r.dayOfYear === dayOfYear);
  return match ?? YEARLY_RIDDLES[(dayOfYear - 1) % YEARLY_RIDDLES.length];
}
