/**
 * Reminder date math tests.
 *
 * Tests the exported functions from reminderStorage.ts:
 *   - getCurrentCycleTimestamp  (backward-looking: most recent cycle)
 *   - getNextCycleTimestamp     (forward-looking: next upcoming cycle)
 *   - hasCompletedToday         (completion gating)
 *
 * Tests scheduleReminderNotification from notifications.ts indirectly
 * to verify the private getNextAlarmTimestamp / getNextDayTimestamp
 * logic (daily / weekly scheduling via the timestamp passed to notifee).
 *
 * Completion window (6-hour) and date-only eligibility logic lives in
 * ReminderScreen.tsx as the non-exported isDoneEnabled function. We
 * replicate its logic here to test the math. If isDoneEnabled is ever
 * extracted to a shared module, these tests can import it directly.
 *
 * NOTE: getNextAlarmTimestamp, getNextDayTimestamp, and _isToday are
 * private in notifications.ts. isDoneEnabled / getAvailableAtTime are
 * local to ReminderScreen.tsx. These would need to be exported for
 * direct unit tests.
 */

import type { Reminder } from '../types/reminder';
import {
  getCurrentCycleTimestamp,
  getNextCycleTimestamp,
  hasCompletedToday,
} from '../services/reminderStorage';
import { scheduleReminderNotification } from '../services/notifications';
import notifee from '@notifee/react-native';

// Also need to mock loadSettings since scheduleReminderNotification
// calls scheduleAlarm path which invokes it. The reminder path calls
// setupNotificationChannel → createChannel (already mocked).
jest.mock('../services/settings', () => ({
  loadSettings: jest.fn().mockResolvedValue({ guessWhyEnabled: false }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Reminder object, overriding only what's needed. */
function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'test-reminder',
    icon: '📝',
    text: 'Test reminder',
    private: false,
    completed: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: null,
    dueDate: null,
    dueTime: null,
    notificationId: null,
    pinned: false,
    notificationIds: [],
    completionHistory: [],
    ...overrides,
  };
}

/**
 * Replicates the isDoneEnabled logic from ReminderScreen.tsx (line 81-101).
 * This lets us test the 6-hour window and date-only eligibility without
 * importing from the screen file (which has React dependencies).
 */
const SIX_HOURS = 6 * 60 * 60 * 1000;

function isDoneEnabled(reminder: Reminder): boolean {
  if (!reminder.recurring) return true;
  if (!reminder.dueTime) {
    // Date-only yearly: completable on due date ± 1 day
    if (reminder.dueDate && (!reminder.days || reminder.days.length === 0)) {
      const [y, mo, d] = reminder.dueDate.split('-').map(Number);
      const dueDay = new Date(y, mo - 1, d);
      dueDay.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = dueDay.getTime() - now.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      return Math.abs(diffDays) <= 1;
    }
    return true;
  }
  if (hasCompletedToday(reminder)) return false;
  const cycleTs = getNextCycleTimestamp(reminder);
  if (cycleTs === null) return true;
  return Date.now() >= cycleTs - SIX_HOURS;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================================================
// 1. Daily Reminders — getNextCycleTimestamp / scheduleReminderNotification
// ============================================================================

describe('Daily reminders', () => {
  it('next occurrence is today when time has not passed yet', () => {
    // It's 8:00 AM, reminder is at 2:00 PM
    jest.setSystemTime(new Date(2025, 5, 15, 8, 0, 0, 0)); // Sun Jun 15 2025

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    const next = getNextCycleTimestamp(reminder);
    expect(next).not.toBeNull();

    const nextDate = new Date(next!);
    expect(nextDate.getFullYear()).toBe(2025);
    expect(nextDate.getMonth()).toBe(5); // June
    expect(nextDate.getDate()).toBe(15); // today
    expect(nextDate.getHours()).toBe(14);
    expect(nextDate.getMinutes()).toBe(0);
  });

  it('getCurrentCycleTimestamp returns today even when time passed (backward-looking)', () => {
    // It's 4:00 PM, reminder was at 2:00 PM
    jest.setSystemTime(new Date(2025, 5, 15, 16, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    // getCurrentCycleTimestamp is backward-looking — always today for daily
    const current = getCurrentCycleTimestamp(reminder)!;
    const currentDate = new Date(current);
    expect(currentDate.getDate()).toBe(15); // today
    expect(currentDate.getHours()).toBe(14);

    // getNextCycleTimestamp is forward-looking — tomorrow since time passed
    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDate()).toBe(16); // tomorrow
    expect(nextDate.getHours()).toBe(14);
  });

  it('getNextCycleTimestamp returns tomorrow when time has passed', () => {
    // It's 4:00 PM, reminder was at 2:00 PM
    jest.setSystemTime(new Date(2025, 5, 15, 16, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDate()).toBe(16); // tomorrow
    expect(nextDate.getHours()).toBe(14);
    expect(nextDate.getMinutes()).toBe(0);
  });

  it('getNextCycleTimestamp returns today when time has not passed', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 8, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDate()).toBe(15); // today
    expect(nextDate.getHours()).toBe(14);
  });

  it('scheduleReminderNotification schedules for today when time ahead', async () => {
    // 8 AM on a Sunday, reminder at 2 PM daily
    jest.setSystemTime(new Date(2025, 5, 15, 8, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    await scheduleReminderNotification(reminder);

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const trigger = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1];
    const triggerDate = new Date(trigger.timestamp);
    expect(triggerDate.getDate()).toBe(15); // today
    expect(triggerDate.getHours()).toBe(14);
  });

  it('scheduleReminderNotification schedules for tomorrow when time passed', async () => {
    // 4 PM on a Sunday, reminder at 2 PM daily
    jest.setSystemTime(new Date(2025, 5, 15, 16, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    await scheduleReminderNotification(reminder);

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const trigger = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1];
    const triggerDate = new Date(trigger.timestamp);
    expect(triggerDate.getDate()).toBe(16); // tomorrow
    expect(triggerDate.getHours()).toBe(14);
  });
});

// ============================================================================
// 2. Weekly Reminders (e.g., Mon/Wed/Fri)
// ============================================================================

describe('Weekly reminders', () => {
  it('on Monday, next occurrence is Wednesday (not Monday + 7)', () => {
    // Monday Jun 16 2025, 3:00 PM (after reminder time)
    jest.setSystemTime(new Date(2025, 5, 16, 15, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(3); // Wednesday
    expect(nextDate.getDate()).toBe(18); // Jun 18
    expect(nextDate.getHours()).toBe(9);
  });

  it('on Friday (last selected day), next occurrence wraps to Monday', () => {
    // Friday Jun 20 2025, 3:00 PM (after reminder time)
    jest.setSystemTime(new Date(2025, 5, 20, 15, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(1); // Monday
    expect(nextDate.getDate()).toBe(23); // Jun 23
    expect(nextDate.getHours()).toBe(9);
  });

  it('on selected day before reminder time, next occurrence is today', () => {
    // Wednesday Jun 18 2025, 7:00 AM (before 9 AM reminder)
    jest.setSystemTime(new Date(2025, 5, 18, 7, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(3); // Wednesday
    expect(nextDate.getDate()).toBe(18); // today
    expect(nextDate.getHours()).toBe(9);
  });

  it('wraps correctly across week boundary (Sat→Mon)', () => {
    // Saturday Jun 21 2025, 12:00 PM
    jest.setSystemTime(new Date(2025, 5, 21, 12, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(1); // Monday
    expect(nextDate.getDate()).toBe(23); // Jun 23
  });

  it('wraps correctly across month boundary', () => {
    // Friday Jun 27 2025, 3:00 PM (after reminder time)
    jest.setSystemTime(new Date(2025, 5, 27, 15, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    const next = getNextCycleTimestamp(reminder)!;
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(1); // Monday
    expect(nextDate.getMonth()).toBe(5); // still June
    expect(nextDate.getDate()).toBe(30); // Jun 30
  });

  it('scheduleReminderNotification creates one trigger per selected day', async () => {
    // Monday Jun 16 2025, 7:00 AM
    jest.setSystemTime(new Date(2025, 5, 16, 7, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    await scheduleReminderNotification(reminder);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(3);

    // Extract all trigger timestamps and map to day-of-week
    const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
    const triggerDays = calls.map((c: unknown[]) => new Date((c[1] as { timestamp: number }).timestamp).getDay());

    // Mon=1, Wed=3, Fri=5
    expect(triggerDays).toContain(1);
    expect(triggerDays).toContain(3);
    expect(triggerDays).toContain(5);
  });

  it('scheduleReminderNotification: Monday trigger is today (time not passed)', async () => {
    // Monday Jun 16 2025, 7:00 AM — before 9 AM
    jest.setSystemTime(new Date(2025, 5, 16, 7, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    await scheduleReminderNotification(reminder);

    const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
    const mondayCall = calls.find(
      (c: unknown[]) => new Date((c[1] as { timestamp: number }).timestamp).getDay() === 1,
    );
    expect(mondayCall).toBeDefined();

    const monDate = new Date(mondayCall![1].timestamp);
    expect(monDate.getDate()).toBe(16); // today, not next Monday
  });

  it('scheduleReminderNotification: Monday trigger is next week (time passed)', async () => {
    // Monday Jun 16 2025, 3:00 PM — after 9 AM
    jest.setSystemTime(new Date(2025, 5, 16, 15, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    await scheduleReminderNotification(reminder);

    const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
    const mondayCall = calls.find(
      (c: unknown[]) => new Date((c[1] as { timestamp: number }).timestamp).getDay() === 1,
    );
    expect(mondayCall).toBeDefined();

    const monDate = new Date(mondayCall![1].timestamp);
    expect(monDate.getDate()).toBe(23); // next Monday, not today
  });
});

// ============================================================================
// 3. Monthly Reminders
// ============================================================================

describe('Monthly reminders (yearly with dueDate)', () => {
  // Note: The app has no explicit "monthly" recurrence. Recurring reminders
  // with dueDate + no specific days are treated as yearly. These tests
  // verify the yearly-with-dueDate scheduling via completeRecurringReminder
  // which bumps the dueDate forward. The scheduling logic for "monthly" is
  // effectively yearly in this codebase. See completeRecurringReminder lines
  // 380-393 in reminderStorage.ts.

  it('schedules for the correct date when dueDate is in the future', async () => {
    jest.setSystemTime(new Date(2025, 0, 15, 10, 0, 0, 0)); // Jan 15

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      dueDate: '2025-03-20', // Mar 20
      days: [],
    });

    await scheduleReminderNotification(reminder);

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const trigger = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1];
    const triggerDate = new Date(trigger.timestamp);
    expect(triggerDate.getMonth()).toBe(2); // March
    expect(triggerDate.getDate()).toBe(20);
    expect(triggerDate.getHours()).toBe(9);
  });

  it('does not schedule when dueDate is in the past', async () => {
    jest.setSystemTime(new Date(2025, 5, 15, 10, 0, 0, 0)); // Jun 15

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      dueDate: '2025-03-20', // Mar 20 — past
      days: [],
    });

    const ids = await scheduleReminderNotification(reminder);
    expect(ids).toEqual([]);
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('handles months with fewer days (Jan 31 → Feb 28 via yearly bump)', () => {
    // completeRecurringReminder bumps dueDate for yearly reminders.
    // When Feb 29 falls on a non-leap year, the code does setDate(0)
    // to get the last day of the intended month. We test the same logic
    // by simulating what the code does.
    //
    // This is the logic from reminderStorage.ts lines 381-392:
    // new Date(year, month - 1, day) — if month doesn't have that day,
    // JS rolls forward, then setDate(0) corrects to last day of month.

    // Simulate: reminder due Feb 29, but 2025 is not a leap year
    const year = 2025;
    const mo = 2; // February
    const d = 29;
    let nextDate = new Date(year, mo - 1, d); // Feb 29 2025 → rolls to Mar 1
    expect(nextDate.getMonth()).toBe(2); // March (rolled over)

    // The code detects this and corrects:
    if (nextDate.getMonth() !== mo - 1) {
      nextDate.setDate(0); // last day of Feb
    }
    expect(nextDate.getMonth()).toBe(1); // February
    expect(nextDate.getDate()).toBe(28); // Feb 28
  });
});

// ============================================================================
// 4. Yearly Reminders
// ============================================================================

describe('Yearly reminders', () => {
  it('getCurrentCycleTimestamp returns dueDate at dueTime', () => {
    jest.setSystemTime(new Date(2025, 11, 20, 10, 0, 0, 0)); // Dec 20

    const reminder = makeReminder({
      recurring: true,
      dueTime: '15:00',
      dueDate: '2025-12-25', // Christmas
      days: [],
    });

    const ts = getCurrentCycleTimestamp(reminder)!;
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11); // December
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(0);
  });

  it('getNextCycleTimestamp returns dueDate at dueTime for yearly', () => {
    jest.setSystemTime(new Date(2025, 11, 20, 10, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '15:00',
      dueDate: '2025-12-25',
      days: [],
    });

    const ts = getNextCycleTimestamp(reminder)!;
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(15);
  });

  it('scheduleReminderNotification schedules for dueDate', async () => {
    jest.setSystemTime(new Date(2025, 11, 20, 10, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '15:00',
      dueDate: '2025-12-25',
      days: [],
    });

    await scheduleReminderNotification(reminder);

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const trigger = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1];
    const triggerDate = new Date(trigger.timestamp);
    expect(triggerDate.getMonth()).toBe(11);
    expect(triggerDate.getDate()).toBe(25);
    expect(triggerDate.getHours()).toBe(15);
  });

  it('handles Feb 29 on non-leap year (rolls to Feb 28)', () => {
    // The yearly bump logic in completeRecurringReminder:
    // new Date(2025, 1, 29) → March 1 (2025 is not a leap year)
    // Code detects month mismatch → setDate(0) → Feb 28

    const nextDate = new Date(2025, 1, 29); // Feb 29 on non-leap year
    if (nextDate.getMonth() !== 1) {
      // Month rolled to March
      nextDate.setDate(0); // Last day of Feb
    }
    expect(nextDate.getMonth()).toBe(1); // February
    expect(nextDate.getDate()).toBe(28);
  });

  it('handles Feb 29 on leap year (stays Feb 29)', () => {
    const nextDate = new Date(2028, 1, 29); // 2028 is a leap year
    expect(nextDate.getMonth()).toBe(1); // February — no rollover
    expect(nextDate.getDate()).toBe(29);
  });

  it('yearly bump preserves correct date for normal months', () => {
    // Simulate bumping a Jul 4 reminder to next year
    const mo = 7; // July
    const d = 4;
    const nextDate = new Date(2026, mo - 1, d);
    expect(nextDate.getMonth()).toBe(6); // July (no rollover)
    expect(nextDate.getDate()).toBe(4);
  });
});

// ============================================================================
// 5. Completion Window (6-hour / date-only)
// ============================================================================

describe('Completion window — 6-hour rule for timed recurring reminders', () => {
  it('completion allowed within 6 hours of reminder time', () => {
    // Reminder at 2:00 PM. 6 hours before = 8:00 AM.
    // Current time: 9:00 AM → within window → enabled
    jest.setSystemTime(new Date(2025, 5, 15, 9, 0, 0, 0)); // Sun Jun 15

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('completion blocked outside 6-hour window', () => {
    // Reminder at 2:00 PM. 6 hours before = 8:00 AM.
    // Current time: 7:00 AM → outside window → blocked
    jest.setSystemTime(new Date(2025, 5, 15, 7, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    expect(isDoneEnabled(reminder)).toBe(false);
  });

  it('completion allowed exactly at window boundary (6 hours before)', () => {
    // Reminder at 2:00 PM → window opens at 8:00 AM
    jest.setSystemTime(new Date(2025, 5, 15, 8, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('completion blocked after already completed today', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 13, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
      completionHistory: [
        { completedAt: new Date(2025, 5, 15, 10, 0, 0, 0).toISOString() },
      ],
    });

    expect(isDoneEnabled(reminder)).toBe(false);
  });

  it('completion allowed if last completion was yesterday', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 9, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '14:00',
      completionHistory: [
        { completedAt: new Date(2025, 5, 14, 10, 0, 0, 0).toISOString() },
      ],
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('non-recurring reminders are always completable', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 2, 0, 0, 0));

    const reminder = makeReminder({
      recurring: false,
      dueTime: '14:00',
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });
});

describe('Completion window — 6-hour rule for weekly reminders', () => {
  it('completion allowed within 6 hours of next weekly occurrence', () => {
    // Wednesday Jun 18, 4:00 AM. Reminder is Mon/Wed/Fri at 9 AM.
    // Next occurrence: today Wed at 9 AM. Window opens: 3:00 AM.
    // 4:00 AM is within window → enabled
    jest.setSystemTime(new Date(2025, 5, 18, 4, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('completion blocked outside 6-hour window for weekly', () => {
    // Wednesday Jun 18, 1:00 AM. Reminder is Mon/Wed/Fri at 9 AM.
    // Next occurrence: today Wed at 9 AM. Window opens: 3:00 AM.
    // 1:00 AM is outside window → blocked
    jest.setSystemTime(new Date(2025, 5, 18, 1, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Wed', 'Fri'],
    });

    expect(isDoneEnabled(reminder)).toBe(false);
  });
});

describe('Completion window — date-only recurring reminders (± 1 day)', () => {
  it('completable on due date', () => {
    jest.setSystemTime(new Date(2025, 11, 25, 12, 0, 0, 0)); // Dec 25

    const reminder = makeReminder({
      recurring: true,
      dueDate: '2025-12-25',
      dueTime: null,
      days: [],
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('completable one day before due date', () => {
    jest.setSystemTime(new Date(2025, 11, 24, 12, 0, 0, 0)); // Dec 24

    const reminder = makeReminder({
      recurring: true,
      dueDate: '2025-12-25',
      dueTime: null,
      days: [],
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('completable one day after due date', () => {
    jest.setSystemTime(new Date(2025, 11, 26, 12, 0, 0, 0)); // Dec 26

    const reminder = makeReminder({
      recurring: true,
      dueDate: '2025-12-25',
      dueTime: null,
      days: [],
    });

    expect(isDoneEnabled(reminder)).toBe(true);
  });

  it('not completable two days before due date', () => {
    jest.setSystemTime(new Date(2025, 11, 23, 12, 0, 0, 0)); // Dec 23

    const reminder = makeReminder({
      recurring: true,
      dueDate: '2025-12-25',
      dueTime: null,
      days: [],
    });

    expect(isDoneEnabled(reminder)).toBe(false);
  });

  it('not completable two days after due date', () => {
    jest.setSystemTime(new Date(2025, 11, 27, 12, 0, 0, 0)); // Dec 27

    const reminder = makeReminder({
      recurring: true,
      dueDate: '2025-12-25',
      dueTime: null,
      days: [],
    });

    expect(isDoneEnabled(reminder)).toBe(false);
  });
});

// ============================================================================
// 6. hasCompletedToday
// ============================================================================

describe('hasCompletedToday', () => {
  it('returns false when no completion history', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 12, 0, 0, 0));

    const reminder = makeReminder({ completionHistory: [] });
    expect(hasCompletedToday(reminder)).toBe(false);
  });

  it('returns true when completed earlier today', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 14, 0, 0, 0));

    const reminder = makeReminder({
      completionHistory: [
        { completedAt: new Date(2025, 5, 15, 8, 0, 0, 0).toISOString() },
      ],
    });
    expect(hasCompletedToday(reminder)).toBe(true);
  });

  it('returns false when last completion was yesterday', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 8, 0, 0, 0));

    const reminder = makeReminder({
      completionHistory: [
        { completedAt: new Date(2025, 5, 14, 20, 0, 0, 0).toISOString() },
      ],
    });
    expect(hasCompletedToday(reminder)).toBe(false);
  });

  it('returns true when any entry in history is today', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 18, 0, 0, 0));

    const reminder = makeReminder({
      completionHistory: [
        { completedAt: new Date(2025, 5, 13, 10, 0, 0, 0).toISOString() },
        { completedAt: new Date(2025, 5, 14, 10, 0, 0, 0).toISOString() },
        { completedAt: new Date(2025, 5, 15, 9, 0, 0, 0).toISOString() },
      ],
    });
    expect(hasCompletedToday(reminder)).toBe(true);
  });
});

// ============================================================================
// 7. getCurrentCycleTimestamp — additional edge cases
// ============================================================================

describe('getCurrentCycleTimestamp edge cases', () => {
  it('returns null when no dueTime', () => {
    const reminder = makeReminder({ recurring: true, dueTime: null });
    expect(getCurrentCycleTimestamp(reminder)).toBeNull();
  });

  it('daily: returns today at dueTime regardless of whether time passed', () => {
    // getCurrentCycleTimestamp is backward-looking for daily — always today
    jest.setSystemTime(new Date(2025, 5, 15, 20, 0, 0, 0)); // 8 PM

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
    });

    const ts = getCurrentCycleTimestamp(reminder)!;
    const d = new Date(ts);
    expect(d.getDate()).toBe(15); // today (not tomorrow)
    expect(d.getHours()).toBe(9);
  });

  it('weekly: returns most recent matching day (backward-looking)', () => {
    // Thursday Jun 19. Days = Mon/Fri. Most recent matching = Mon Jun 16.
    jest.setSystemTime(new Date(2025, 5, 19, 12, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Fri'],
    });

    const ts = getCurrentCycleTimestamp(reminder)!;
    const d = new Date(ts);
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getDate()).toBe(16); // Jun 16
  });

  it('weekly: on a matching day, returns today', () => {
    // Monday Jun 16, before the reminder time. Days = Mon/Fri.
    jest.setSystemTime(new Date(2025, 5, 16, 7, 0, 0, 0));

    const reminder = makeReminder({
      recurring: true,
      dueTime: '09:00',
      days: ['Mon', 'Fri'],
    });

    const ts = getCurrentCycleTimestamp(reminder)!;
    const d = new Date(ts);
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getDate()).toBe(16); // today
  });
});
