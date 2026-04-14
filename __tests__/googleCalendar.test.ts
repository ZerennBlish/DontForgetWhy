jest.mock('../src/services/firebaseAuth', () => ({
  __esModule: true,
  getAccessToken: jest.fn(),
  requestCalendarScope: jest.fn(),
}));

import {
  fetchCalendarEvents,
  getEventsForDate,
  clearCalendarCache,
  type GoogleCalendarEvent,
} from '../src/services/googleCalendar';
import { getAccessToken, requestCalendarScope } from '../src/services/firebaseAuth';

const getAccessTokenMock = getAccessToken as jest.Mock;
const requestCalendarScopeMock = requestCalendarScope as jest.Mock;

const originalFetch = global.fetch;
let fetchMock: jest.Mock;
let nowSpy: jest.SpyInstance;

function mockResponse(
  body: unknown,
  opts: { status?: number; ok?: boolean } = {},
): Response {
  const status = opts.status ?? 200;
  const ok = opts.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const apiItemTimed = {
  id: 'evt-1',
  summary: 'Team sync',
  description: 'weekly',
  location: 'Zoom',
  start: { dateTime: '2026-04-14T15:00:00-07:00' },
  end: { dateTime: '2026-04-14T16:00:00-07:00' },
};

const apiItemAllDay = {
  id: 'evt-2',
  summary: 'Conference',
  start: { date: '2026-04-20' },
  end: { date: '2026-04-23' },
};

beforeEach(() => {
  clearCalendarCache();
  getAccessTokenMock.mockReset();
  requestCalendarScopeMock.mockReset();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
});

afterEach(() => {
  nowSpy.mockRestore();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('fetchCalendarEvents', () => {
  it('returns empty array when user is not signed in (no access token)', async () => {
    getAccessTokenMock.mockResolvedValue(null);
    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls Google Calendar API with correct URL and auth header', async () => {
    getAccessTokenMock.mockResolvedValue('abc-token');
    fetchMock.mockResolvedValue(mockResponse({ items: [] }));

    await fetchCalendarEvents('2026-04-01', '2026-04-30');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('calendars/primary/events');
    expect(url).toContain(encodeURIComponent('2026-04-01T00:00:00Z'));
    expect(url).toContain(encodeURIComponent('2026-04-30T23:59:59Z'));
    expect(url).toContain('singleEvents=true');
    expect(url).toContain('orderBy=startTime');
    expect(url).toContain('maxResults=250');
    expect(init.headers.Authorization).toBe('Bearer abc-token');
  });

  it('parses timed events correctly (isAllDay false)', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [apiItemTimed] }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'evt-1',
      summary: 'Team sync',
      description: 'weekly',
      location: 'Zoom',
      startTime: '2026-04-14T15:00:00-07:00',
      endTime: '2026-04-14T16:00:00-07:00',
      isAllDay: false,
    });
  });

  it('parses all-day events correctly (isAllDay true)', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [apiItemAllDay] }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'evt-2',
      summary: 'Conference',
      startTime: '2026-04-20',
      endTime: '2026-04-23',
      isAllDay: true,
      description: null,
      location: null,
    });
  });

  it('defaults summary to "Untitled" when missing', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(
      mockResponse({ items: [{ id: 'x', start: { dateTime: '2026-04-14T15:00:00Z' }, end: { dateTime: '2026-04-14T16:00:00Z' } }] }),
    );
    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events[0].summary).toBe('Untitled');
  });

  it('returns cached results within TTL without re-fetching', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [apiItemTimed] }));

    const first = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_700_000_000_000 + 60_000); // +1 minute
    const second = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('re-fetches after cache TTL expires', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [] }));

    await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_700_000_000_000 + 6 * 60 * 1000); // +6 minutes
    await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses separate cache entries for different date ranges', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [] }));

    await fetchCalendarEvents('2026-04-01', '2026-04-30');
    await fetchCalendarEvents('2026-05-01', '2026-05-31');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns empty array on non-ok API response', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse(null, { status: 500, ok: false }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockRejectedValue(new Error('network down'));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toEqual([]);
  });

  it('retries once on 401 after requesting calendar scope', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    requestCalendarScopeMock.mockResolvedValue(true);
    fetchMock
      .mockResolvedValueOnce(mockResponse(null, { status: 401, ok: false }))
      .mockResolvedValueOnce(mockResponse({ items: [apiItemTimed] }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(requestCalendarScopeMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(1);
  });

  it('gives up when 401 persists after scope grant', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    requestCalendarScopeMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse(null, { status: 401, ok: false }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toEqual([]);
  });

  it('gives up when scope grant is denied on 401', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    requestCalendarScopeMock.mockResolvedValue(false);
    fetchMock.mockResolvedValue(mockResponse(null, { status: 401, ok: false }));

    const events = await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(events).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('clearCalendarCache', () => {
  it('empties the cache so the next call re-fetches', async () => {
    getAccessTokenMock.mockResolvedValue('t');
    fetchMock.mockResolvedValue(mockResponse({ items: [] }));

    await fetchCalendarEvents('2026-04-01', '2026-04-30');
    clearCalendarCache();
    await fetchCalendarEvents('2026-04-01', '2026-04-30');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('getEventsForDate', () => {
  const timed: GoogleCalendarEvent = {
    id: 't1',
    summary: 'timed',
    description: null,
    startTime: '2026-04-14T15:00:00-00:00',
    endTime: '2026-04-14T16:00:00-00:00',
    isAllDay: false,
    location: null,
    calendarColor: '#000',
  };

  const oneDayAllDay: GoogleCalendarEvent = {
    id: 'a1',
    summary: 'one-day',
    description: null,
    startTime: '2026-04-14',
    endTime: '2026-04-15',
    isAllDay: true,
    location: null,
    calendarColor: '#000',
  };

  const multiDayAllDay: GoogleCalendarEvent = {
    id: 'a2',
    summary: 'conference',
    description: null,
    startTime: '2026-04-20',
    endTime: '2026-04-23',
    isAllDay: true,
    location: null,
    calendarColor: '#000',
  };

  it('includes a timed event on its own date', () => {
    expect(getEventsForDate('2026-04-14', [timed]).map((e) => e.id)).toEqual(['t1']);
  });

  it('excludes a timed event on a different date', () => {
    expect(getEventsForDate('2026-04-13', [timed])).toEqual([]);
    expect(getEventsForDate('2026-04-15', [timed])).toEqual([]);
  });

  it('includes a one-day all-day event on its date only', () => {
    expect(getEventsForDate('2026-04-14', [oneDayAllDay]).map((e) => e.id)).toEqual(['a1']);
    expect(getEventsForDate('2026-04-15', [oneDayAllDay])).toEqual([]);
  });

  it('handles multi-day all-day events spanning the target date', () => {
    expect(getEventsForDate('2026-04-20', [multiDayAllDay]).map((e) => e.id)).toEqual(['a2']);
    expect(getEventsForDate('2026-04-21', [multiDayAllDay]).map((e) => e.id)).toEqual(['a2']);
    expect(getEventsForDate('2026-04-22', [multiDayAllDay]).map((e) => e.id)).toEqual(['a2']);
    expect(getEventsForDate('2026-04-23', [multiDayAllDay])).toEqual([]);
    expect(getEventsForDate('2026-04-19', [multiDayAllDay])).toEqual([]);
  });

  it('returns events in the order they appear', () => {
    const result = getEventsForDate('2026-04-14', [oneDayAllDay, timed]);
    expect(result.map((e) => e.id)).toEqual(['a1', 't1']);
  });
});
