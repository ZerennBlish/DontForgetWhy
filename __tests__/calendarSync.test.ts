const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
  kvRemove: (key: string) => { kvStore.delete(key); },
}));

jest.mock('../src/services/proStatus', () => ({
  isProUser: jest.fn(() => true),
}));

jest.mock('../src/services/storage', () => ({
  loadAlarms: jest.fn(async () => []),
}));

jest.mock('../src/services/reminderStorage', () => ({
  getReminders: jest.fn(async () => []),
}));

jest.mock('../src/services/firebaseAuth', () => ({
  __esModule: true,
  getAccessToken: jest.fn(),
  requestCalendarWriteScope: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    clearCachedAccessToken: jest.fn(),
  },
}));

import {
  syncToGoogleCalendar,
  isSyncEnabled,
  setSyncEnabled,
  clearSyncData,
} from '../src/services/calendarSync';
import { isProUser } from '../src/services/proStatus';
import { loadAlarms } from '../src/services/storage';
import { getReminders } from '../src/services/reminderStorage';
import { getAccessToken, requestCalendarWriteScope } from '../src/services/firebaseAuth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { Alarm } from '../src/types/alarm';
import type { Reminder } from '../src/types/reminder';

const mockedIsProUser = isProUser as jest.MockedFunction<typeof isProUser>;
const mockedLoadAlarms = loadAlarms as jest.MockedFunction<typeof loadAlarms>;
const mockedGetReminders = getReminders as jest.MockedFunction<typeof getReminders>;
const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockedRequestCalendarWriteScope = requestCalendarWriteScope as jest.MockedFunction<typeof requestCalendarWriteScope>;
const mockedClearCachedAccessToken = GoogleSignin.clearCachedAccessToken as jest.Mock;

function mockRes(body: unknown, opts: { status?: number; ok?: boolean } = {}): Response {
  const status = opts.status ?? 200;
  const ok = opts.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-1',
    time: '08:30',
    nickname: 'Morning pills',
    note: 'Take meds',
    quote: '',
    enabled: true,
    mode: 'one-time',
    days: [],
    date: '2026-05-01',
    category: 'meds',
    private: false,
    createdAt: '2026-04-15T00:00:00Z',
    notificationIds: [],
    ...overrides,
  };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    icon: 'list',
    text: 'Buy groceries',
    private: false,
    completed: false,
    createdAt: '2026-04-15T00:00:00Z',
    completedAt: null,
    dueDate: '2026-05-02',
    dueTime: '14:00',
    notificationId: null,
    pinned: false,
    ...overrides,
  };
}

beforeEach(() => {
  kvStore.clear();
  mockedIsProUser.mockReset().mockReturnValue(true);
  mockedLoadAlarms.mockReset().mockResolvedValue([]);
  mockedGetReminders.mockReset().mockResolvedValue([]);
  mockedGetAccessToken.mockReset().mockResolvedValue('tok-1');
  mockedRequestCalendarWriteScope.mockReset().mockResolvedValue(true);
  mockedClearCachedAccessToken.mockReset().mockResolvedValue(null);
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

// ── sync enabled flag ──────────────────────────────────────────

describe('isSyncEnabled / setSyncEnabled', () => {
  it('returns false when nothing stored', () => {
    expect(isSyncEnabled()).toBe(false);
  });

  it('returns true after setSyncEnabled(true)', () => {
    setSyncEnabled(true);
    expect(isSyncEnabled()).toBe(true);
    expect(kvStore.get('gcal_sync_enabled')).toBe('true');
  });

  it('returns false after setSyncEnabled(false)', () => {
    setSyncEnabled(true);
    setSyncEnabled(false);
    expect(isSyncEnabled()).toBe(false);
    expect(kvStore.get('gcal_sync_enabled')).toBe('false');
  });
});

// ── clearSyncData ──────────────────────────────────────────────

describe('clearSyncData', () => {
  it('removes the calendar id and sync enabled keys but preserves the sync map', () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-xyz');
    kvStore.set('gcal_sync_map', '{"a":"e"}');
    kvStore.set('gcal_sync_enabled', 'true');
    kvStore.set('unrelated', 'keep');

    clearSyncData();

    expect(kvStore.get('gcal_dfw_calendar_id')).toBeUndefined();
    expect(kvStore.get('gcal_sync_enabled')).toBeUndefined();
    // Sync map intentionally preserved so re-sign-in to the same account
    // doesn't create duplicate events.
    expect(kvStore.get('gcal_sync_map')).toBe('{"a":"e"}');
    expect(kvStore.get('unrelated')).toBe('keep');
  });
});

// ── syncToGoogleCalendar ───────────────────────────────────────

describe('syncToGoogleCalendar — preconditions', () => {
  it('throws when the user is not Pro', async () => {
    mockedIsProUser.mockReturnValue(false);
    await expect(syncToGoogleCalendar()).rejects.toThrow(/Pro required/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the write scope request is denied', async () => {
    mockedRequestCalendarWriteScope.mockResolvedValue(false);
    await expect(syncToGoogleCalendar()).rejects.toThrow(/permission denied/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('syncToGoogleCalendar — calendar discovery', () => {
  it('creates a new DFW calendar when none exists and stores its id', async () => {
    fetchMock
      .mockResolvedValueOnce(mockRes({ items: [] })) // calendarList
      .mockResolvedValueOnce(mockRes({ id: 'cal-new' })); // POST /calendars

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const listCall = fetchMock.mock.calls[0];
    expect(listCall[0]).toContain('/users/me/calendarList');
    expect(listCall[0]).toContain('minAccessRole=owner');
    expect(listCall[1].method).toBe('GET');
    expect(listCall[1].headers.Authorization).toBe('Bearer tok-1');

    const createCall = fetchMock.mock.calls[1];
    expect(createCall[0]).toBe('https://www.googleapis.com/calendar/v3/calendars');
    expect(createCall[1].method).toBe('POST');
    const createdBody = JSON.parse(createCall[1].body);
    expect(createdBody.summary).toBe("Don't Forget Why");
    expect(typeof createdBody.timeZone).toBe('string');

    expect(kvStore.get('gcal_dfw_calendar_id')).toBe('cal-new');
  });

  it('reuses an existing DFW calendar found in calendarList', async () => {
    fetchMock.mockResolvedValueOnce(
      mockRes({
        items: [
          { id: 'cal-other', summary: 'Work' },
          { id: 'cal-dfw', summary: "Don't Forget Why" },
        ],
      }),
    );

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(kvStore.get('gcal_dfw_calendar_id')).toBe('cal-dfw');
  });

  it('uses the stored calendar id without listing if verify GET returns 200', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-stored');
    fetchMock.mockResolvedValueOnce(mockRes({ id: 'cal-stored' }));

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/calendars/cal-stored');
  });

  it('falls through to create when stored calendar id 404s', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-stale');
    fetchMock
      .mockResolvedValueOnce(mockRes({}, { status: 404 })) // verify GET
      .mockResolvedValueOnce(mockRes({ items: [] })) // list
      .mockResolvedValueOnce(mockRes({ id: 'cal-fresh' })); // create

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(kvStore.get('gcal_dfw_calendar_id')).toBe('cal-fresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('syncToGoogleCalendar — syncing items', () => {
  it('creates events on first sync and updates them on second sync', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    mockedLoadAlarms.mockResolvedValue([
      makeAlarm({ id: 'alarm-1', nickname: 'Morning pills' }),
    ]);
    mockedGetReminders.mockResolvedValue([
      makeReminder({ id: 'reminder-1', text: 'Buy groceries' }),
    ]);

    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })) // verify GET
      .mockResolvedValueOnce(mockRes({ id: 'evt-alarm' })) // POST alarm
      .mockResolvedValueOnce(mockRes({ id: 'evt-reminder' })); // POST reminder

    const first = await syncToGoogleCalendar();
    expect(first).toEqual({ synced: 2, errors: 0 });

    const storedMap = JSON.parse(kvStore.get('gcal_sync_map')!);
    expect(storedMap['alarm-1']).toBe('evt-alarm');
    expect(storedMap['reminder-1']).toBe('evt-reminder');

    // Verify the first POST actually carried the alarm's title in its body.
    const alarmPostCall = fetchMock.mock.calls[1];
    expect(alarmPostCall[0]).toBe('https://www.googleapis.com/calendar/v3/calendars/cal-id/events');
    expect(alarmPostCall[1].method).toBe('POST');
    const alarmBody = JSON.parse(alarmPostCall[1].body);
    expect(alarmBody.summary).toBe('Morning pills');

    // Second sync — both items already mapped → PUT, not POST.
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })) // verify GET
      .mockResolvedValueOnce(mockRes({ id: 'evt-alarm' })) // PUT alarm
      .mockResolvedValueOnce(mockRes({ id: 'evt-reminder' })); // PUT reminder

    const second = await syncToGoogleCalendar();
    expect(second).toEqual({ synced: 2, errors: 0 });

    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[1][0]).toContain('/calendars/cal-id/events/evt-alarm');
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[2][0]).toContain('/calendars/cal-id/events/evt-reminder');
  });

  it('skips disabled alarms and deletes any previously synced event', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    kvStore.set('gcal_sync_map', JSON.stringify({ 'alarm-disabled': 'evt-existing' }));
    mockedLoadAlarms.mockResolvedValue([
      makeAlarm({ id: 'alarm-disabled', enabled: false }),
    ]);

    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })) // verify GET
      .mockResolvedValueOnce(mockRes({})); // DELETE existing event

    const result = await syncToGoogleCalendar();
    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
    expect(fetchMock.mock.calls[1][0]).toContain('/events/evt-existing');

    const updatedMap = JSON.parse(kvStore.get('gcal_sync_map')!);
    expect(updatedMap['alarm-disabled']).toBeUndefined();
  });

  it('skips reminders with no dueDate entirely (no fetch calls for them)', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    mockedGetReminders.mockResolvedValue([
      makeReminder({ id: 'no-date', dueDate: null, dueTime: null }),
    ]);

    fetchMock.mockResolvedValueOnce(mockRes({ id: 'cal-id' })); // verify GET only

    const result = await syncToGoogleCalendar();
    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('syncToGoogleCalendar — 401 retry', () => {
  it('retries the request once after a 401 with a refreshed token', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    mockedGetAccessToken
      .mockResolvedValueOnce('tok-stale')
      .mockResolvedValueOnce('tok-fresh');

    fetchMock
      .mockResolvedValueOnce(mockRes({}, { status: 401 })) // verify GET → 401
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })); // retry → 200

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedClearCachedAccessToken).toHaveBeenCalledWith('tok-stale');

    const firstAuth = fetchMock.mock.calls[0][1].headers.Authorization;
    const secondAuth = fetchMock.mock.calls[1][1].headers.Authorization;
    expect(firstAuth).toBe('Bearer tok-stale');
    expect(secondAuth).toBe('Bearer tok-fresh');
  });
});

describe('syncToGoogleCalendar — 403 scope retry', () => {
  it('re-requests the calendar write scope and retries after a 403 response', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    mockedGetAccessToken
      .mockResolvedValueOnce('tok-old')
      .mockResolvedValueOnce('tok-rescoped');

    fetchMock
      .mockResolvedValueOnce(mockRes({}, { status: 403 })) // verify GET → 403
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })); // retry → 200

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    // requestCalendarWriteScope is called once at the top of syncToGoogleCalendar
    // and once more inside authedFetch when the 403 fires.
    expect(mockedRequestCalendarWriteScope).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstAuth = fetchMock.mock.calls[0][1].headers.Authorization;
    const secondAuth = fetchMock.mock.calls[1][1].headers.Authorization;
    expect(firstAuth).toBe('Bearer tok-old');
    expect(secondAuth).toBe('Bearer tok-rescoped');
  });

  it('throws when the 403 retry path can no longer obtain the write scope', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    mockedRequestCalendarWriteScope
      .mockResolvedValueOnce(true) // initial syncToGoogleCalendar() check
      .mockResolvedValueOnce(false); // re-request from authedFetch

    fetchMock.mockResolvedValueOnce(mockRes({}, { status: 403 }));

    await expect(syncToGoogleCalendar()).rejects.toThrow(/permission denied/);
  });
});

describe('syncToGoogleCalendar — delete error handling', () => {
  it('preserves the sync-map entry and counts an error when DELETE returns 500', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    kvStore.set('gcal_sync_map', JSON.stringify({ 'alarm-disabled': 'evt-existing' }));
    mockedLoadAlarms.mockResolvedValue([
      makeAlarm({ id: 'alarm-disabled', enabled: false }),
    ]);

    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })) // verify GET
      .mockResolvedValueOnce(mockRes({}, { status: 500 })); // DELETE → 500

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 1 });
    const updatedMap = JSON.parse(kvStore.get('gcal_sync_map')!);
    expect(updatedMap['alarm-disabled']).toBe('evt-existing');
  });

  it('treats a 404 DELETE as success — removes the sync-map entry without counting an error', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    kvStore.set('gcal_sync_map', JSON.stringify({ 'alarm-disabled': 'evt-gone' }));
    mockedLoadAlarms.mockResolvedValue([
      makeAlarm({ id: 'alarm-disabled', enabled: false }),
    ]);

    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' })) // verify GET
      .mockResolvedValueOnce(mockRes({}, { status: 404 })); // DELETE → 404

    const result = await syncToGoogleCalendar();

    expect(result).toEqual({ synced: 0, errors: 0 });
    const updatedMap = JSON.parse(kvStore.get('gcal_sync_map')!);
    expect(updatedMap['alarm-disabled']).toBeUndefined();
  });
});

describe('syncToGoogleCalendar — recurring DTSTART stability', () => {
  it('produces the same DTSTART across re-syncs for the same recurring alarm', async () => {
    kvStore.set('gcal_dfw_calendar_id', 'cal-id');
    const recurringAlarm = makeAlarm({
      id: 'rec-alarm',
      mode: 'recurring',
      days: ['Mon', 'Wed', 'Fri'],
      date: null,
      time: '07:00',
      createdAt: '2026-01-10T12:00:00Z',
    });
    mockedLoadAlarms.mockResolvedValue([recurringAlarm]);

    // First sync: verify GET + POST.
    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' }))
      .mockResolvedValueOnce(mockRes({ id: 'evt-rec' }));

    await syncToGoogleCalendar();
    const firstPostBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const firstStart = firstPostBody.start.dateTime;

    // Second sync: verify GET + PUT (item already mapped).
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(mockRes({ id: 'cal-id' }))
      .mockResolvedValueOnce(mockRes({ id: 'evt-rec' }));

    await syncToGoogleCalendar();
    const secondPutBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const secondStart = secondPutBody.start.dateTime;

    expect(firstStart).toBe(secondStart);
    // Sanity: the recurrence rule uses the alarm's days.
    expect(firstPostBody.recurrence).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR']);
  });
});
