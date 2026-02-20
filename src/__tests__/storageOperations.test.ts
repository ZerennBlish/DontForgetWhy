/**
 * Storage operations tests for reminder and alarm CRUD, completion
 * history, and data integrity.
 *
 * Uses a functional in-memory Map behind the AsyncStorage mock so
 * getItem returns what setItem stored — enabling true round-trip tests.
 *
 * Notification side-effects (scheduling, cancelling) are mocked at the
 * module level so these tests focus purely on storage behaviour.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock notifications module — all functions become no-op jest.fn()s.
// This prevents scheduleAlarm / cancelAlarmNotifications / etc. from
// actually touching notifee during storage tests.
jest.mock('../services/notifications', () => ({
  scheduleAlarm: jest.fn().mockResolvedValue(['mock-notif-id']),
  cancelAlarm: jest.fn().mockResolvedValue(undefined),
  cancelAlarmNotifications: jest.fn().mockResolvedValue(undefined),
  scheduleReminderNotification: jest.fn().mockResolvedValue(['mock-reminder-notif']),
  cancelReminderNotification: jest.fn().mockResolvedValue(undefined),
  cancelReminderNotifications: jest.fn().mockResolvedValue(undefined),
  setupNotificationChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/settings', () => ({
  loadSettings: jest.fn().mockResolvedValue({ guessWhyEnabled: false }),
}));

import type { Reminder } from '../types/reminder';
import type { Alarm } from '../types/alarm';
import {
  addReminder,
  getReminders,
  saveReminders,
  updateReminder,
  deleteReminder,
  permanentlyDeleteReminder,
  toggleReminderComplete,
  completeRecurringReminder,
  hasCompletedToday,
} from '../services/reminderStorage';
import {
  addAlarm,
  loadAlarms,
  saveAlarms,
  updateAlarm,
  deleteAlarm,
  permanentlyDeleteAlarm,
} from '../services/storage';

// ---------------------------------------------------------------------------
// Functional AsyncStorage mock (in-memory Map)
// ---------------------------------------------------------------------------

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2025, 5, 15, 10, 0, 0, 0)); // Sun Jun 15 2025

  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    (key: string) => Promise.resolve(store.get(key) ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(
    (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  );
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(() =>
    Promise.resolve([...store.keys()]),
  );
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-1',
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

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-1',
    time: '08:00',
    note: 'Wake up',
    quote: 'Rise and shine',
    enabled: false,
    mode: 'recurring' as const,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    date: null,
    category: 'general' as const,
    private: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    notificationIds: [],
    soundId: 'default',
    ...overrides,
  };
}

// ============================================================================
// 1. Reminder CRUD
// ============================================================================

describe('Reminder CRUD', () => {
  it('saves a reminder and reads it back with matching data', async () => {
    const reminder = makeReminder();
    await addReminder(reminder);

    const loaded = await getReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('rem-1');
    expect(loaded[0].text).toBe('Test reminder');
    expect(loaded[0].icon).toBe('📝');
    expect(loaded[0].completed).toBe(false);
    expect(loaded[0].pinned).toBe(false);
  });

  it('saves multiple reminders and retrieves all', async () => {
    await addReminder(makeReminder({ id: 'rem-1', text: 'First' }));
    await addReminder(makeReminder({ id: 'rem-2', text: 'Second' }));
    await addReminder(makeReminder({ id: 'rem-3', text: 'Third' }));

    const loaded = await getReminders();
    expect(loaded).toHaveLength(3);

    const ids = loaded.map((r) => r.id);
    expect(ids).toContain('rem-1');
    expect(ids).toContain('rem-2');
    expect(ids).toContain('rem-3');
  });

  it('updates a reminder and confirms changes persist', async () => {
    await addReminder(makeReminder({ id: 'rem-1', text: 'Original' }));

    const updated = makeReminder({ id: 'rem-1', text: 'Updated', pinned: true });
    await updateReminder(updated);

    const loaded = await getReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].text).toBe('Updated');
    expect(loaded[0].pinned).toBe(true);
  });

  it('soft-deletes a reminder — gone from getReminders(), visible with includeDeleted', async () => {
    await addReminder(makeReminder({ id: 'rem-1' }));
    await addReminder(makeReminder({ id: 'rem-2' }));

    await deleteReminder('rem-1');

    // Default: excludes soft-deleted
    const active = await getReminders();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('rem-2');

    // includeDeleted: shows all
    const all = await getReminders(true);
    expect(all).toHaveLength(2);
    const deleted = all.find((r) => r.id === 'rem-1');
    expect(deleted).toBeDefined();
    expect(deleted!.deletedAt).toBeTruthy();
  });

  it('permanently deletes a reminder — removed from storage entirely', async () => {
    await addReminder(makeReminder({ id: 'rem-1' }));
    await addReminder(makeReminder({ id: 'rem-2' }));

    await permanentlyDeleteReminder('rem-1');

    const all = await getReminders(true);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('rem-2');
  });

  it('deleting a non-existent reminder does not throw', async () => {
    await addReminder(makeReminder({ id: 'rem-1' }));

    await expect(deleteReminder('nonexistent-id')).resolves.not.toThrow();

    // Original data untouched
    const loaded = await getReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('rem-1');
  });

  it('permanently deleting a non-existent reminder does not throw', async () => {
    await addReminder(makeReminder({ id: 'rem-1' }));

    await expect(permanentlyDeleteReminder('nonexistent-id')).resolves.not.toThrow();

    const loaded = await getReminders();
    expect(loaded).toHaveLength(1);
  });
});

// ============================================================================
// 2. Alarm CRUD
// ============================================================================

describe('Alarm CRUD', () => {
  it('saves an alarm and reads it back with matching data', async () => {
    const alarm = makeAlarm();
    await addAlarm(alarm);

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('alarm-1');
    expect(loaded[0].time).toBe('08:00');
    expect(loaded[0].note).toBe('Wake up');
    expect(loaded[0].enabled).toBe(false);
    expect(loaded[0].category).toBe('general');
  });

  it('saves multiple alarms and retrieves all', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1', note: 'First' }));
    await addAlarm(makeAlarm({ id: 'alarm-2', note: 'Second' }));
    await addAlarm(makeAlarm({ id: 'alarm-3', note: 'Third' }));

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(3);

    const ids = loaded.map((a) => a.id);
    expect(ids).toContain('alarm-1');
    expect(ids).toContain('alarm-2');
    expect(ids).toContain('alarm-3');
  });

  it('updates an alarm and confirms changes persist', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1', note: 'Original' }));

    const updated = makeAlarm({ id: 'alarm-1', note: 'Changed', time: '09:30' });
    await updateAlarm(updated);

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].note).toBe('Changed');
    expect(loaded[0].time).toBe('09:30');
  });

  it('soft-deletes an alarm — gone from loadAlarms(), visible with includeDeleted', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1' }));
    await addAlarm(makeAlarm({ id: 'alarm-2' }));

    await deleteAlarm('alarm-1');

    const active = await loadAlarms();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('alarm-2');

    const all = await loadAlarms(true);
    expect(all).toHaveLength(2);
    const deleted = all.find((a) => a.id === 'alarm-1');
    expect(deleted).toBeDefined();
    expect(deleted!.deletedAt).toBeTruthy();
  });

  it('permanently deletes an alarm — removed from storage entirely', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1' }));
    await addAlarm(makeAlarm({ id: 'alarm-2' }));

    await permanentlyDeleteAlarm('alarm-1');

    const all = await loadAlarms(true);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('alarm-2');
  });

  it('deleting a non-existent alarm does not throw', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1' }));

    await expect(deleteAlarm('nonexistent-id')).resolves.not.toThrow();

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('alarm-1');
  });

  it('permanently deleting a non-existent alarm does not throw', async () => {
    await addAlarm(makeAlarm({ id: 'alarm-1' }));

    await expect(permanentlyDeleteAlarm('nonexistent-id')).resolves.not.toThrow();

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(1);
  });
});

// ============================================================================
// 3. Completion History
// ============================================================================

describe('Completion History', () => {
  it('toggleReminderComplete marks a reminder as completed with history entry', async () => {
    await addReminder(makeReminder({ id: 'rem-1', completed: false }));

    const toggled = await toggleReminderComplete('rem-1');
    expect(toggled).not.toBeNull();
    expect(toggled!.completed).toBe(true);
    expect(toggled!.completedAt).toBeTruthy();
    expect(toggled!.completionHistory).toHaveLength(1);
    expect(toggled!.completionHistory![0].completedAt).toBeTruthy();

    // Persisted
    const loaded = await getReminders();
    expect(loaded[0].completed).toBe(true);
    expect(loaded[0].completionHistory).toHaveLength(1);
  });

  it('toggleReminderComplete un-marks and pops history entry', async () => {
    await addReminder(makeReminder({
      id: 'rem-1',
      completed: true,
      completedAt: '2025-06-15T08:00:00.000Z',
      completionHistory: [{ completedAt: '2025-06-15T08:00:00.000Z' }],
    }));

    const toggled = await toggleReminderComplete('rem-1');
    expect(toggled!.completed).toBe(false);
    expect(toggled!.completedAt).toBeNull();
    expect(toggled!.completionHistory).toHaveLength(0);
  });

  it('completeRecurringReminder records completion in history', async () => {
    await addReminder(makeReminder({
      id: 'rem-1',
      recurring: true,
      dueTime: '14:00',
      completionHistory: [],
    }));

    const result = await completeRecurringReminder('rem-1');
    expect(result).not.toBeNull();
    expect(result!.completionHistory).toHaveLength(1);
    expect(result!.completionHistory![0].completedAt).toBeTruthy();
    // Should NOT set completed = true (recurring stays active)
    expect(result!.completed).toBe(false);
  });

  it('one-per-day guard: second completion same day returns unchanged', async () => {
    // First completion at 10 AM
    await addReminder(makeReminder({
      id: 'rem-1',
      recurring: true,
      dueTime: '14:00',
      completionHistory: [],
    }));

    const first = await completeRecurringReminder('rem-1');
    expect(first!.completionHistory).toHaveLength(1);

    // Second attempt at 2 PM same day
    jest.setSystemTime(new Date(2025, 5, 15, 14, 0, 0, 0));

    const second = await completeRecurringReminder('rem-1');
    // Should return the reminder unchanged — no new history entry
    expect(second!.completionHistory).toHaveLength(1);
  });

  it('completing on different days records both entries', async () => {
    // Day 1: Jun 15
    jest.setSystemTime(new Date(2025, 5, 15, 10, 0, 0, 0));

    await addReminder(makeReminder({
      id: 'rem-1',
      recurring: true,
      dueTime: '14:00',
      completionHistory: [],
    }));

    await completeRecurringReminder('rem-1');

    // Day 2: Jun 16
    jest.setSystemTime(new Date(2025, 5, 16, 10, 0, 0, 0));

    const result = await completeRecurringReminder('rem-1');
    expect(result!.completionHistory).toHaveLength(2);

    // Verify dates are different
    const dates = result!.completionHistory!.map(
      (e) => new Date(e.completedAt).getDate(),
    );
    expect(dates).toContain(15);
    expect(dates).toContain(16);
  });

  it('completion history survives save/load cycle', async () => {
    const reminder = makeReminder({
      id: 'rem-1',
      recurring: true,
      dueTime: '14:00',
      completionHistory: [
        { completedAt: '2025-06-13T10:00:00.000Z' },
        { completedAt: '2025-06-14T10:00:00.000Z' },
      ],
    });

    await addReminder(reminder);

    // Load from storage (round-trip through JSON serialisation)
    const loaded = await getReminders();
    expect(loaded[0].completionHistory).toHaveLength(2);
    expect(loaded[0].completionHistory![0].completedAt).toBe('2025-06-13T10:00:00.000Z');
    expect(loaded[0].completionHistory![1].completedAt).toBe('2025-06-14T10:00:00.000Z');
  });

  it('hasCompletedToday integrates with storage round-trip', async () => {
    await addReminder(makeReminder({
      id: 'rem-1',
      recurring: true,
      dueTime: '14:00',
    }));

    // Before completion
    let loaded = await getReminders();
    expect(hasCompletedToday(loaded[0])).toBe(false);

    // After completion
    await completeRecurringReminder('rem-1');
    loaded = await getReminders();
    expect(hasCompletedToday(loaded[0])).toBe(true);

    // Next day: no longer "completed today"
    jest.setSystemTime(new Date(2025, 5, 16, 10, 0, 0, 0));
    loaded = await getReminders();
    expect(hasCompletedToday(loaded[0])).toBe(false);
  });
});

// ============================================================================
// 4. Data Integrity
// ============================================================================

describe('Data Integrity', () => {
  it('reminder with missing optional fields does not corrupt storage', async () => {
    // Only required fields — no nickname, dueDate, dueTime, days, etc.
    const minimal: Reminder = {
      id: 'rem-minimal',
      icon: '📝',
      text: 'Minimal',
      private: false,
      completed: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      completedAt: null,
      dueDate: null,
      dueTime: null,
      notificationId: null,
      pinned: false,
      // Intentionally omit: days, recurring, notificationIds, completionHistory
    };

    await addReminder(minimal);

    // Should load without error, migration fills in completionHistory
    const loaded = await getReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('rem-minimal');
    expect(loaded[0].text).toBe('Minimal');
    // Migration adds empty completionHistory
    expect(loaded[0].completionHistory).toEqual([]);

    // Adding another reminder after shouldn't corrupt the first
    await addReminder(makeReminder({ id: 'rem-2', text: 'Second' }));
    const all = await getReminders();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('rem-minimal');
    expect(all[1].id).toBe('rem-2');
  });

  it('alarm with missing optional fields does not corrupt storage', async () => {
    // All required fields present, optional ones omitted
    const minimal = makeAlarm({
      id: 'alarm-minimal',
      // Omit: nickname, icon, soundUri, soundName, soundID, deletedAt
    });
    // Remove optional fields to simulate legacy data
    delete (minimal as Record<string, unknown>).nickname;
    delete (minimal as Record<string, unknown>).icon;
    delete (minimal as Record<string, unknown>).soundUri;
    delete (minimal as Record<string, unknown>).soundName;

    await addAlarm(minimal);

    const loaded = await loadAlarms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('alarm-minimal');
    expect(loaded[0].time).toBe('08:00');
  });

  it('loading reminders from empty storage returns empty array', async () => {
    const loaded = await getReminders();
    expect(loaded).toEqual([]);
    expect(Array.isArray(loaded)).toBe(true);
  });

  it('loading alarms from empty storage returns empty array', async () => {
    const loaded = await loadAlarms();
    expect(loaded).toEqual([]);
    expect(Array.isArray(loaded)).toBe(true);
  });

  it('storage keys do not collide between alarms and reminders', async () => {
    // Save both an alarm and a reminder
    await addAlarm(makeAlarm({ id: 'shared-id-1', note: 'Alarm note' }));
    await addReminder(makeReminder({ id: 'shared-id-1', text: 'Reminder text' }));

    // Load each — they should be independent
    const alarms = await loadAlarms();
    const reminders = await getReminders();

    expect(alarms).toHaveLength(1);
    expect(reminders).toHaveLength(1);

    expect(alarms[0].note).toBe('Alarm note');
    expect(reminders[0].text).toBe('Reminder text');

    // Verify different storage keys used
    expect(store.has('alarms')).toBe(true);
    expect(store.has('reminders')).toBe(true);

    // Deleting a reminder doesn't affect alarms
    await permanentlyDeleteReminder('shared-id-1');
    const alarmsAfter = await loadAlarms();
    expect(alarmsAfter).toHaveLength(1);
  });

  it('invalid JSON in storage returns empty array without throwing', async () => {
    store.set('reminders', 'not valid json {{{');
    const loaded = await getReminders();
    expect(loaded).toEqual([]);

    store.set('alarms', '%%%invalid%%%');
    const alarms = await loadAlarms();
    expect(alarms).toEqual([]);
  });

  it('non-array JSON in storage returns empty array', async () => {
    store.set('reminders', JSON.stringify({ not: 'an array' }));
    const loaded = await getReminders();
    expect(loaded).toEqual([]);

    store.set('alarms', JSON.stringify('just a string'));
    const alarms = await loadAlarms();
    expect(alarms).toEqual([]);
  });

  it('malformed items are filtered out, valid ones preserved', async () => {
    // Mix of valid and invalid reminder data
    const raw = [
      makeReminder({ id: 'valid-1', text: 'Good' }),
      { id: 'bad-1' }, // missing required fields
      null,
      makeReminder({ id: 'valid-2', text: 'Also good' }),
      { id: 'bad-2', text: 123, icon: '🔴', completed: false, private: false, createdAt: 'x' }, // text is wrong type
    ];
    store.set('reminders', JSON.stringify(raw));

    const loaded = await getReminders();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('valid-1');
    expect(loaded[1].id).toBe('valid-2');
  });
});
