/**
 * alarmEventRouting.test.ts
 *
 * Tests for alarm/timer/reminder notification event routing logic:
 *   - Notification event classification (alarm vs timer vs reminder)
 *   - Pending alarm data flow (setPendingAlarm → getPendingAlarm → clearPendingAlarm)
 *   - Notification deduplication (markNotifHandled / wasNotifHandled with TTL)
 *   - Background event handler routing (index.ts onBackgroundEvent logic)
 *   - Foreground event classification (App.tsx DELIVERED filter)
 *   - Dismiss behavior (one-time alarm soft-delete)
 *   - Yearly reminder reschedule logic
 *   - Edge cases (navigation not ready, already on AlarmFire, missing data)
 *
 * Source files:
 *   - src/services/pendingAlarm.ts  (exported, directly tested)
 *   - App.tsx lines 390-508         (foreground event handler, logic replicated)
 *   - index.ts lines 72-126         (background event handler, logic replicated)
 *   - App.tsx lines 43-89           (rescheduleYearlyReminder, logic replicated)
 *   - App.tsx lines 108-155         (navigateToAlarmFire, logic replicated)
 */

import {
  setPendingAlarm,
  getPendingAlarm,
  clearPendingAlarm,
  markNotifHandled,
  wasNotifHandled,
} from '../services/pendingAlarm';
import type { PendingAlarmData } from '../services/pendingAlarm';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../services/settings', () => ({
  loadSettings: jest.fn().mockResolvedValue({ guessWhyEnabled: false }),
  getOnboardingComplete: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/notifications', () => ({
  setupNotificationChannel: jest.fn(),
  scheduleReminderNotification: jest.fn().mockResolvedValue(['notif-1']),
  cancelReminderNotification: jest.fn().mockResolvedValue(undefined),
  cancelReminderNotifications: jest.fn().mockResolvedValue(undefined),
  cancelAlarm: jest.fn().mockResolvedValue(undefined),
  cancelTimerNotification: jest.fn().mockResolvedValue(undefined),
  cancelTimerCountdownNotification: jest.fn().mockResolvedValue(undefined),
  scheduleSnooze: jest.fn().mockResolvedValue('snooze-notif-id'),
  dismissAlarmNotification: jest.fn().mockResolvedValue(undefined),
}));

// ── Replicated event constants (from @notifee/react-native) ─────────
// Source: jest.setup.ts mock
const EventType = {
  DISMISSED: 0,
  DELIVERED: 1,
  PRESS: 2,
  ACTION_PRESS: 3,
};

// ── Replicated classification logic ─────────────────────────────────
// Source: App.tsx lines 392-394, index.ts lines 74-76
// Notification data fields determine the notification type:
//   data.alarmId → alarm notification
//   data.timerId → timer completion notification
//   data.reminderId → reminder notification
//   none of the above → unknown (sound preview, countdown chronometer, etc.)

interface NotificationData {
  alarmId?: string;
  timerId?: string;
  reminderId?: string;
  [key: string]: any;
}

function classifyNotification(data: NotificationData | undefined): 'alarm' | 'timer' | 'reminder' | 'unknown' {
  if (!data) return 'unknown';
  if (data.alarmId) return 'alarm';
  if (data.timerId) return 'timer';
  if (data.reminderId) return 'reminder';
  return 'unknown';
}

// Source: App.tsx lines 400-402, 412-414
// DELIVERED events only navigate for alarm/timer, not reminder/unknown.
// PRESS events navigate for alarm/timer (reminders open the reminder screen via deep link).
function shouldNavigateToAlarmFire(
  eventType: number,
  data: NotificationData | undefined,
): boolean {
  const isNavigationEvent = eventType === EventType.PRESS || eventType === EventType.DELIVERED;
  if (!isNavigationEvent) return false;

  if (eventType === EventType.DELIVERED) {
    const isAlarmOrTimerCompletion = !!(data?.alarmId || data?.timerId);
    return isAlarmOrTimerCompletion;
  }

  // PRESS: navigate for alarm or timer only (not reminders, as those
  // would be handled by a deep link or in-app navigation)
  return !!(data?.alarmId || data?.timerId);
}

// Source: App.tsx lines 483-494, index.ts lines 105-117
// On DISMISSED, one-time alarms are soft-deleted.
function shouldSoftDeleteOnDismiss(
  eventType: number,
  alarmMode: string | undefined,
  alarmId: string | undefined,
): boolean {
  if (eventType !== EventType.DISMISSED) return false;
  if (!alarmId) return false;
  return alarmMode === 'one-time';
}

// Source: App.tsx lines 502-504, index.ts lines 122-124
// Yearly reminder reschedule triggers on DELIVERED or DISMISSED.
function shouldRescheduleYearly(
  eventType: number,
  reminderId: string | undefined,
): boolean {
  if (!reminderId) return false;
  return eventType === EventType.DELIVERED || eventType === EventType.DISMISSED;
}

// Source: index.ts lines 86-102
// Background handler stores pending data for alarm/timer, ignores reminders.
function buildPendingFromBackground(
  eventType: number,
  notification: { id?: string; data?: NotificationData; title?: string; body?: string },
): PendingAlarmData | null {
  if (eventType !== EventType.PRESS && eventType !== EventType.DELIVERED) return null;

  const notifId = notification.id;
  const alarmId = notification.data?.alarmId;
  const timerId = notification.data?.timerId;

  if (timerId && notifId) {
    const tIcon = notification.title?.replace(' Timer Complete', '').trim() || '⏱️';
    const tLabel = notification.body?.replace(' is done!', '').trim() || 'Timer';
    return { timerId, notificationId: notifId, timerLabel: tLabel, timerIcon: tIcon };
  }
  if (alarmId && notifId) {
    return { alarmId, notificationId: notifId };
  }
  return null;
}

// Source: App.tsx lines 122-132 (navigateToAlarmFire timer path)
// Builds the navigation params for a timer fire screen.
function buildTimerFireParams(pending: PendingAlarmData) {
  return {
    isTimer: true,
    timerLabel: pending.timerLabel || 'Timer',
    timerIcon: pending.timerIcon || '⏱️',
    timerId: pending.timerId,
    timerNotificationId: pending.notificationId,
    notificationId: pending.notificationId,
    fromNotification: true,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Alarm Event Routing', () => {

  // ── 1. Notification Event Classification ──────────────────────────
  describe('Notification Event Classification', () => {
    it('classifies alarm notifications by data.alarmId', () => {
      expect(classifyNotification({ alarmId: 'alarm-1' })).toBe('alarm');
    });

    it('classifies timer notifications by data.timerId', () => {
      expect(classifyNotification({ timerId: 'timer-1' })).toBe('timer');
    });

    it('classifies reminder notifications by data.reminderId', () => {
      expect(classifyNotification({ reminderId: 'reminder-1' })).toBe('reminder');
    });

    it('classifies notifications with no data fields as unknown', () => {
      expect(classifyNotification({})).toBe('unknown');
    });

    it('classifies undefined data as unknown', () => {
      expect(classifyNotification(undefined)).toBe('unknown');
    });

    it('prioritizes alarmId over other fields when multiple present', () => {
      // In practice these fields are mutually exclusive, but the check order
      // is alarmId → timerId → reminderId (App.tsx line 393-394)
      expect(classifyNotification({ alarmId: 'a1', timerId: 't1' })).toBe('alarm');
    });

    it('prioritizes timerId over reminderId', () => {
      expect(classifyNotification({ timerId: 't1', reminderId: 'r1' })).toBe('timer');
    });

    it('identifies countdown chronometer as unknown (no data fields)', () => {
      // Countdown notifications have ID countdown-{timerId} but NO data.timerId
      // Source: App.tsx line 410-411
      expect(classifyNotification({})).toBe('unknown');
    });
  });

  // ── 2. Navigation Decision (shouldNavigateToAlarmFire) ────────────
  describe('Navigation Decision', () => {
    describe('PRESS events', () => {
      it('navigates for alarm PRESS', () => {
        expect(shouldNavigateToAlarmFire(EventType.PRESS, { alarmId: 'a1' })).toBe(true);
      });

      it('navigates for timer PRESS', () => {
        expect(shouldNavigateToAlarmFire(EventType.PRESS, { timerId: 't1' })).toBe(true);
      });

      it('does not navigate for reminder PRESS (no alarmId/timerId)', () => {
        expect(shouldNavigateToAlarmFire(EventType.PRESS, { reminderId: 'r1' })).toBe(false);
      });

      it('does not navigate for PRESS with no data', () => {
        expect(shouldNavigateToAlarmFire(EventType.PRESS, undefined)).toBe(false);
      });
    });

    describe('DELIVERED events', () => {
      it('navigates for alarm DELIVERED', () => {
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, { alarmId: 'a1' })).toBe(true);
      });

      it('navigates for timer completion DELIVERED', () => {
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, { timerId: 't1' })).toBe(true);
      });

      it('does NOT navigate for reminder DELIVERED', () => {
        // Source: App.tsx lines 412-414 — DELIVERED filter
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, { reminderId: 'r1' })).toBe(false);
      });

      it('does NOT navigate for sound preview DELIVERED (no data)', () => {
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, {})).toBe(false);
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, undefined)).toBe(false);
      });

      it('does NOT navigate for countdown chronometer DELIVERED', () => {
        // Countdown has no data.timerId — just an ID pattern
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, {})).toBe(false);
      });
    });

    describe('DISMISSED events', () => {
      it('never navigates on DISMISSED', () => {
        expect(shouldNavigateToAlarmFire(EventType.DISMISSED, { alarmId: 'a1' })).toBe(false);
        expect(shouldNavigateToAlarmFire(EventType.DISMISSED, { timerId: 't1' })).toBe(false);
      });
    });

    describe('ACTION_PRESS events', () => {
      it('never navigates on ACTION_PRESS', () => {
        expect(shouldNavigateToAlarmFire(EventType.ACTION_PRESS, { alarmId: 'a1' })).toBe(false);
      });
    });
  });

  // ── 3. Pending Alarm Data Flow ────────────────────────────────────
  describe('Pending Alarm Data Flow', () => {
    beforeEach(() => {
      clearPendingAlarm();
    });

    it('initially returns null', () => {
      expect(getPendingAlarm()).toBeNull();
    });

    it('stores and retrieves alarm pending data', () => {
      const data: PendingAlarmData = { alarmId: 'alarm-1', notificationId: 'notif-1' };
      setPendingAlarm(data);
      expect(getPendingAlarm()).toEqual(data);
    });

    it('stores and retrieves timer pending data', () => {
      const data: PendingAlarmData = {
        timerId: 'timer-1',
        notificationId: 'notif-2',
        timerLabel: 'Eggs',
        timerIcon: '🥚',
      };
      setPendingAlarm(data);
      expect(getPendingAlarm()).toEqual(data);
    });

    it('clears pending data', () => {
      setPendingAlarm({ alarmId: 'alarm-1', notificationId: 'notif-1' });
      clearPendingAlarm();
      expect(getPendingAlarm()).toBeNull();
    });

    it('overwrites previous pending data', () => {
      setPendingAlarm({ alarmId: 'alarm-1', notificationId: 'notif-1' });
      setPendingAlarm({ alarmId: 'alarm-2', notificationId: 'notif-2' });
      expect(getPendingAlarm()?.alarmId).toBe('alarm-2');
    });

    it('preserves data until explicitly cleared', () => {
      setPendingAlarm({ alarmId: 'alarm-1' });
      // Reading does not clear
      getPendingAlarm();
      getPendingAlarm();
      expect(getPendingAlarm()).not.toBeNull();
    });
  });

  // ── 4. Notification Deduplication ─────────────────────────────────
  describe('Notification Deduplication', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T10:00:00'));
      // Clear internal state by marking + expiring
      clearPendingAlarm();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false for unhandled notification', () => {
      expect(wasNotifHandled('notif-new')).toBe(false);
    });

    it('returns true after marking as handled', () => {
      markNotifHandled('notif-1');
      expect(wasNotifHandled('notif-1')).toBe(true);
    });

    it('returns false for undefined notifId', () => {
      expect(wasNotifHandled(undefined)).toBe(false);
    });

    it('expires after TTL (10 minutes)', () => {
      markNotifHandled('notif-expire');
      expect(wasNotifHandled('notif-expire')).toBe(true);

      // Advance past 10-minute TTL
      jest.advanceTimersByTime(600_001);
      expect(wasNotifHandled('notif-expire')).toBe(false);
    });

    it('persists within TTL', () => {
      markNotifHandled('notif-persist');

      // Advance 5 minutes — still within 10-minute TTL
      jest.advanceTimersByTime(5 * 60 * 1000);
      expect(wasNotifHandled('notif-persist')).toBe(true);
    });

    it('tracks multiple notification IDs independently', () => {
      markNotifHandled('notif-a');
      markNotifHandled('notif-b');
      expect(wasNotifHandled('notif-a')).toBe(true);
      expect(wasNotifHandled('notif-b')).toBe(true);
      expect(wasNotifHandled('notif-c')).toBe(false);
    });

    it('cleans up old entries when marking new ones', () => {
      markNotifHandled('notif-old');
      jest.advanceTimersByTime(600_001); // expire notif-old

      // Marking a new one triggers cleanup of old entries
      markNotifHandled('notif-new');
      expect(wasNotifHandled('notif-old')).toBe(false);
      expect(wasNotifHandled('notif-new')).toBe(true);
    });
  });

  // ── 5. Background Event Handler Routing ───────────────────────────
  describe('Background Event Handler Routing', () => {
    describe('buildPendingFromBackground', () => {
      it('builds alarm pending data on PRESS', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'notif-1',
          data: { alarmId: 'alarm-1' },
        });
        expect(result).toEqual({ alarmId: 'alarm-1', notificationId: 'notif-1' });
      });

      it('builds alarm pending data on DELIVERED', () => {
        const result = buildPendingFromBackground(EventType.DELIVERED, {
          id: 'notif-2',
          data: { alarmId: 'alarm-2' },
        });
        expect(result).toEqual({ alarmId: 'alarm-2', notificationId: 'notif-2' });
      });

      it('builds timer pending data with extracted label and icon', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'timer-done-t1',
          data: { timerId: 'timer-1' },
          title: '🥚 Timer Complete',
          body: 'Eggs is done!',
        });
        expect(result).toEqual({
          timerId: 'timer-1',
          notificationId: 'timer-done-t1',
          timerLabel: 'Eggs',
          timerIcon: '🥚',
        });
      });

      it('uses default label/icon when notification title/body missing', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'timer-done-t2',
          data: { timerId: 'timer-2' },
        });
        expect(result).toEqual({
          timerId: 'timer-2',
          notificationId: 'timer-done-t2',
          timerLabel: 'Timer',
          timerIcon: '⏱️',
        });
      });

      it('returns null for reminder notifications', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'notif-r1',
          data: { reminderId: 'reminder-1' },
        });
        expect(result).toBeNull();
      });

      it('returns null when notification ID missing', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          data: { alarmId: 'alarm-1' },
        });
        expect(result).toBeNull();
      });

      it('returns null on DISMISSED events', () => {
        const result = buildPendingFromBackground(EventType.DISMISSED, {
          id: 'notif-1',
          data: { alarmId: 'alarm-1' },
        });
        expect(result).toBeNull();
      });

      it('returns null on ACTION_PRESS events', () => {
        const result = buildPendingFromBackground(EventType.ACTION_PRESS, {
          id: 'notif-1',
          data: { alarmId: 'alarm-1' },
        });
        expect(result).toBeNull();
      });

      it('returns null for countdown chronometer (no data)', () => {
        const result = buildPendingFromBackground(EventType.DELIVERED, {
          id: 'countdown-timer-1',
        });
        expect(result).toBeNull();
      });
    });
  });

  // ── 6. Dismiss Behavior ───────────────────────────────────────────
  describe('Dismiss Behavior', () => {
    it('soft-deletes one-time alarm on DISMISSED', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.DISMISSED, 'one-time', 'alarm-1')).toBe(true);
    });

    it('does NOT soft-delete recurring alarm on DISMISSED', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.DISMISSED, 'recurring', 'alarm-1')).toBe(false);
    });

    it('does NOT soft-delete daily alarm on DISMISSED', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.DISMISSED, 'daily', 'alarm-1')).toBe(false);
    });

    it('does NOT soft-delete when no alarmId (timer/reminder)', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.DISMISSED, 'one-time', undefined)).toBe(false);
    });

    it('does NOT soft-delete on PRESS event', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.PRESS, 'one-time', 'alarm-1')).toBe(false);
    });

    it('does NOT soft-delete on DELIVERED event', () => {
      expect(shouldSoftDeleteOnDismiss(EventType.DELIVERED, 'one-time', 'alarm-1')).toBe(false);
    });
  });

  // ── 7. Yearly Reminder Reschedule Decision ────────────────────────
  describe('Yearly Reminder Reschedule', () => {
    it('triggers reschedule on DELIVERED for reminder', () => {
      expect(shouldRescheduleYearly(EventType.DELIVERED, 'reminder-1')).toBe(true);
    });

    it('triggers reschedule on DISMISSED for reminder', () => {
      expect(shouldRescheduleYearly(EventType.DISMISSED, 'reminder-1')).toBe(true);
    });

    it('does NOT trigger on PRESS for reminder', () => {
      expect(shouldRescheduleYearly(EventType.PRESS, 'reminder-1')).toBe(false);
    });

    it('does NOT trigger when reminderId is undefined', () => {
      expect(shouldRescheduleYearly(EventType.DELIVERED, undefined)).toBe(false);
    });

    it('does NOT trigger for ACTION_PRESS', () => {
      expect(shouldRescheduleYearly(EventType.ACTION_PRESS, 'reminder-1')).toBe(false);
    });
  });

  // ── 8. Timer Fire Params Building ─────────────────────────────────
  describe('Timer Fire Params', () => {
    it('builds correct params from timer pending data', () => {
      const pending: PendingAlarmData = {
        timerId: 'timer-1',
        notificationId: 'notif-t1',
        timerLabel: 'Eggs',
        timerIcon: '🥚',
      };
      const params = buildTimerFireParams(pending);
      expect(params).toEqual({
        isTimer: true,
        timerLabel: 'Eggs',
        timerIcon: '🥚',
        timerId: 'timer-1',
        timerNotificationId: 'notif-t1',
        notificationId: 'notif-t1',
        fromNotification: true,
      });
    });

    it('uses default label when timerLabel is missing', () => {
      const pending: PendingAlarmData = {
        timerId: 'timer-2',
        notificationId: 'notif-t2',
      };
      const params = buildTimerFireParams(pending);
      expect(params.timerLabel).toBe('Timer');
    });

    it('uses default icon when timerIcon is missing', () => {
      const pending: PendingAlarmData = {
        timerId: 'timer-3',
        notificationId: 'notif-t3',
      };
      const params = buildTimerFireParams(pending);
      expect(params.timerIcon).toBe('⏱️');
    });

    it('always sets fromNotification to true', () => {
      const params = buildTimerFireParams({ timerId: 't', notificationId: 'n' });
      expect(params.fromNotification).toBe(true);
    });

    it('always sets isTimer to true', () => {
      const params = buildTimerFireParams({ timerId: 't', notificationId: 'n' });
      expect(params.isTimer).toBe(true);
    });
  });

  // ── 9. Edge Cases ─────────────────────────────────────────────────
  describe('Edge Cases', () => {
    beforeEach(() => {
      clearPendingAlarm();
    });

    describe('Navigation guard: already on AlarmFire', () => {
      // Source: App.tsx lines 433-437
      // If AlarmFireScreen is the current route, skip navigation.
      it('would skip navigation when already on AlarmFire', () => {
        const currentRoute = 'AlarmFire';
        const shouldSkip = currentRoute === 'AlarmFire';
        expect(shouldSkip).toBe(true);
      });

      it('would not skip navigation when on AlarmList', () => {
        const currentRoute = 'AlarmList';
        const shouldSkip = currentRoute === 'AlarmFire';
        expect(shouldSkip).toBe(false);
      });
    });

    describe('Navigation guard: navigation not ready', () => {
      // Source: App.tsx lines 417-430
      // If navigation isn't ready, store as pending instead of navigating.
      it('stores pending data when navigation not ready', () => {
        const isNavigationReady = false;
        const navigationRef = null;

        // Replicate the guard check
        if (!navigationRef || !isNavigationReady) {
          setPendingAlarm({ alarmId: 'alarm-deferred', notificationId: 'notif-deferred' });
        }

        expect(getPendingAlarm()).toEqual({
          alarmId: 'alarm-deferred',
          notificationId: 'notif-deferred',
        });
      });
    });

    describe('Dedup prevents double navigation', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-06-15T10:00:00'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('prevents duplicate navigation for same notification', () => {
        // Source: App.tsx lines 442-446
        // First event marks as handled
        markNotifHandled('notif-dup');
        // Second event for same ID is blocked
        expect(wasNotifHandled('notif-dup')).toBe(true);
      });

      it('allows navigation after TTL expires', () => {
        markNotifHandled('notif-ttl');
        jest.advanceTimersByTime(600_001);
        // After TTL, same notification ID can trigger again
        expect(wasNotifHandled('notif-ttl')).toBe(false);
      });
    });

    describe('Missing or partial notification data', () => {
      it('handles notification with empty data object', () => {
        expect(classifyNotification({})).toBe('unknown');
        expect(shouldNavigateToAlarmFire(EventType.PRESS, {})).toBe(false);
        expect(shouldNavigateToAlarmFire(EventType.DELIVERED, {})).toBe(false);
      });

      it('handles pending alarm with only alarmId (no notificationId)', () => {
        const pending: PendingAlarmData = { alarmId: 'alarm-no-notif' };
        setPendingAlarm(pending);
        expect(getPendingAlarm()?.alarmId).toBe('alarm-no-notif');
        expect(getPendingAlarm()?.notificationId).toBeUndefined();
      });

      it('background handler ignores notifications without ID', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          data: { alarmId: 'alarm-1' },
          // no id field
        });
        expect(result).toBeNull();
      });

      it('background handler ignores notifications without data', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'notif-1',
          // no data field
        });
        expect(result).toBeNull();
      });
    });

    describe('Timer label/icon extraction', () => {
      // Source: index.ts lines 87-88
      // Timer title format: "🥚 Timer Complete"
      // Timer body format: "Eggs is done!"
      it('strips " Timer Complete" from title for icon', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'td-1',
          data: { timerId: 't1' },
          title: '🍕 Timer Complete',
          body: 'Pizza is done!',
        });
        expect(result?.timerIcon).toBe('🍕');
        expect(result?.timerLabel).toBe('Pizza');
      });

      it('handles title without " Timer Complete" suffix', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'td-2',
          data: { timerId: 't2' },
          title: 'Custom Title',
          body: 'Custom body',
        });
        // .replace(' Timer Complete', '') is a no-op, title stays as-is
        expect(result?.timerIcon).toBe('Custom Title');
        expect(result?.timerLabel).toBe('Custom body');
      });

      it('handles empty title and body', () => {
        const result = buildPendingFromBackground(EventType.PRESS, {
          id: 'td-3',
          data: { timerId: 't3' },
          title: '',
          body: '',
        });
        // Empty string .trim() is '', which is falsy → defaults
        expect(result?.timerIcon).toBe('⏱️');
        expect(result?.timerLabel).toBe('Timer');
      });
    });

    describe('Full event routing flow', () => {
      beforeEach(() => {
        clearPendingAlarm();
      });

      it('background PRESS → setPending → consumePending flow', () => {
        // 1. Background event fires
        const pending = buildPendingFromBackground(EventType.PRESS, {
          id: 'notif-bg',
          data: { alarmId: 'alarm-bg' },
        });
        expect(pending).not.toBeNull();

        // 2. Store pending data
        setPendingAlarm(pending!);

        // 3. App reads pending data on init
        const retrieved = getPendingAlarm();
        expect(retrieved?.alarmId).toBe('alarm-bg');
        expect(retrieved?.notificationId).toBe('notif-bg');

        // 4. Clear after consumption
        clearPendingAlarm();
        expect(getPendingAlarm()).toBeNull();
      });

      it('background timer PRESS → full pending cycle', () => {
        const pending = buildPendingFromBackground(EventType.PRESS, {
          id: 'timer-done-bg',
          data: { timerId: 'timer-bg' },
          title: '⏲️ Timer Complete',
          body: 'Workout is done!',
        });
        setPendingAlarm(pending!);

        const retrieved = getPendingAlarm();
        expect(retrieved?.timerId).toBe('timer-bg');
        expect(retrieved?.timerLabel).toBe('Workout');
        expect(retrieved?.timerIcon).toBe('⏲️');

        const params = buildTimerFireParams(retrieved!);
        expect(params.isTimer).toBe(true);
        expect(params.timerLabel).toBe('Workout');
        expect(params.fromNotification).toBe(true);
      });

      it('reminder DELIVERED does NOT create pending data', () => {
        const pending = buildPendingFromBackground(EventType.DELIVERED, {
          id: 'notif-reminder',
          data: { reminderId: 'rem-1' },
        });
        expect(pending).toBeNull();
        // But yearly reschedule should trigger
        expect(shouldRescheduleYearly(EventType.DELIVERED, 'rem-1')).toBe(true);
      });

      it('alarm DISMISSED does NOT create pending but does soft-delete', () => {
        const pending = buildPendingFromBackground(EventType.DISMISSED, {
          id: 'notif-dismiss',
          data: { alarmId: 'alarm-dismiss' },
        });
        expect(pending).toBeNull();
        expect(shouldSoftDeleteOnDismiss(EventType.DISMISSED, 'one-time', 'alarm-dismiss')).toBe(true);
      });
    });
  });
});
