import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken, requestCalendarWriteScope } from './firebaseAuth';
import { loadAlarms } from './storage';
import { getReminders } from './reminderStorage';
import { isProUser } from './proStatus';
import { kvGet, kvSet, kvRemove } from './database';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const DFW_CALENDAR_KEY = 'gcal_dfw_calendar_id';
const SYNC_MAP_KEY = 'gcal_sync_map';
const SYNC_ENABLED_KEY = 'gcal_sync_enabled';
const DFW_CALENDAR_SUMMARY = "Don't Forget Why";
const EVENT_DURATION_MIN = 30;

const DAY_TO_RRULE: Record<AlarmDay, string> = {
  Mon: 'MO',
  Tue: 'TU',
  Wed: 'WE',
  Thu: 'TH',
  Fri: 'FR',
  Sat: 'SA',
  Sun: 'SU',
};

const DAY_TO_INDEX: Record<AlarmDay, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface SyncResult {
  synced: number;
  errors: number;
}

// ── sync enabled flag ──────────────────────────────────────────

export function isSyncEnabled(): boolean {
  return kvGet(SYNC_ENABLED_KEY) === 'true';
}

export function setSyncEnabled(enabled: boolean): void {
  kvSet(SYNC_ENABLED_KEY, String(enabled));
}

// ── sync map (dfw item id → google event id) ───────────────────

function getSyncMap(): Record<string, string> {
  const raw = kvGet(SYNC_MAP_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveSyncMap(map: Record<string, string>): void {
  kvSet(SYNC_MAP_KEY, JSON.stringify(map));
}

// ── clear sync data (called on sign-out) ───────────────────────

export function clearSyncData(): void {
  kvRemove(DFW_CALENDAR_KEY);
  kvRemove(SYNC_MAP_KEY);
  kvRemove(SYNC_ENABLED_KEY);
}

// ── authed fetch with 401 retry ────────────────────────────────

async function authedFetch(url: string, options: RequestInit): Promise<Response> {
  let token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const withAuth = (t: string): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
    },
  });

  let res = await fetch(url, withAuth(token));

  if (res.status === 401) {
    try {
      await GoogleSignin.clearCachedAccessToken(token);
    } catch {
      // ignore — proceed to refresh attempt
    }
    token = await getAccessToken();
    if (!token) throw new Error('Token refresh failed');
    res = await fetch(url, withAuth(token));
  }

  return res;
}

// ── date/time helpers ──────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function parseHM(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function parseDate(dateStr: string): { y: number; mo: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  return { y: Number(match[1]), mo: Number(match[2]), d: Number(match[3]) };
}

function toLocalDateTime(dateStr: string, timeStr: string, addMinutes = 0): string | null {
  const dt = parseDate(dateStr);
  const hm = parseHM(timeStr);
  if (!dt || !hm) return null;
  const date = new Date(dt.y, dt.mo - 1, dt.d, hm.h, hm.m + addMinutes);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function addDaysToDate(dateStr: string, days: number): string | null {
  const dt = parseDate(dateStr);
  if (!dt) return null;
  const date = new Date(dt.y, dt.mo - 1, dt.d + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextOccurrenceDate(days: AlarmDay[], time: string): string | null {
  const hm = parseHM(time);
  if (!hm || days.length === 0) return null;
  const targets = new Set(days.map((d) => DAY_TO_INDEX[d]));
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hm.h, hm.m);
    if (targets.has(candidate.getDay())) {
      if (i === 0 && candidate.getTime() < now.getTime()) continue;
      return `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}`;
    }
  }
  return null;
}

function buildRRule(days: AlarmDay[]): string {
  const byday = days.map((d) => DAY_TO_RRULE[d]).join(',');
  return `RRULE:FREQ=WEEKLY;BYDAY=${byday}`;
}

// ── item → event body ──────────────────────────────────────────

interface EventBody {
  summary: string;
  description: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
}

function alarmToEvent(alarm: Alarm): EventBody | null {
  if (!alarm.enabled || alarm.deletedAt) return null;

  const title = alarm.nickname || alarm.note || 'DFW Alarm';
  const description = `Category: ${alarm.category}\n${alarm.note ?? ''}`.trim();
  const tz = getUserTimeZone();

  if (alarm.mode === 'one-time') {
    if (!alarm.date) return null;
    const start = toLocalDateTime(alarm.date, alarm.time, 0);
    const end = toLocalDateTime(alarm.date, alarm.time, EVENT_DURATION_MIN);
    if (!start || !end) return null;
    return {
      summary: title,
      description,
      start: { dateTime: start, timeZone: tz },
      end: { dateTime: end, timeZone: tz },
    };
  }

  // recurring
  if (!alarm.days || alarm.days.length === 0) return null;
  const firstDate = nextOccurrenceDate(alarm.days, alarm.time);
  if (!firstDate) return null;
  const start = toLocalDateTime(firstDate, alarm.time, 0);
  const end = toLocalDateTime(firstDate, alarm.time, EVENT_DURATION_MIN);
  if (!start || !end) return null;
  return {
    summary: title,
    description,
    start: { dateTime: start, timeZone: tz },
    end: { dateTime: end, timeZone: tz },
    recurrence: [buildRRule(alarm.days)],
  };
}

function reminderToEvent(reminder: Reminder): EventBody | null {
  if (reminder.completed || reminder.deletedAt) return null;
  if (!reminder.dueDate) return null;

  const title = reminder.nickname || reminder.text || 'DFW Reminder';
  const description = reminder.text ?? '';
  const tz = getUserTimeZone();

  let event: EventBody;
  if (reminder.dueTime) {
    const start = toLocalDateTime(reminder.dueDate, reminder.dueTime, 0);
    const end = toLocalDateTime(reminder.dueDate, reminder.dueTime, EVENT_DURATION_MIN);
    if (!start || !end) return null;
    event = {
      summary: title,
      description,
      start: { dateTime: start, timeZone: tz },
      end: { dateTime: end, timeZone: tz },
    };
  } else {
    const endDate = addDaysToDate(reminder.dueDate, 1);
    if (!endDate) return null;
    event = {
      summary: title,
      description,
      start: { date: reminder.dueDate },
      end: { date: endDate },
    };
  }

  if (reminder.recurring && reminder.days && reminder.days.length > 0) {
    event.recurrence = [buildRRule(reminder.days)];
  }

  return event;
}

// ── find / create DFW calendar ────────────────────────────────

interface CalendarListItem {
  id?: string;
  summary?: string;
}

async function findOrCreateDfwCalendar(): Promise<string> {
  const stored = kvGet(DFW_CALENDAR_KEY);
  if (stored) {
    const res = await authedFetch(`${CALENDAR_API}/calendars/${encodeURIComponent(stored)}`, {
      method: 'GET',
    });
    if (res.ok) return stored;
    if (res.status === 404) {
      kvRemove(DFW_CALENDAR_KEY);
    } else {
      throw new Error(`Failed to verify DFW calendar (${res.status})`);
    }
  }

  const listRes = await authedFetch(
    `${CALENDAR_API}/users/me/calendarList?minAccessRole=owner`,
    { method: 'GET' },
  );
  if (!listRes.ok) throw new Error(`Failed to list calendars (${listRes.status})`);
  const listBody = (await listRes.json()) as { items?: CalendarListItem[] };
  const existing = (listBody.items || []).find((i) => i.summary === DFW_CALENDAR_SUMMARY && i.id);
  if (existing && existing.id) {
    kvSet(DFW_CALENDAR_KEY, existing.id);
    return existing.id;
  }

  const createRes = await authedFetch(`${CALENDAR_API}/calendars`, {
    method: 'POST',
    body: JSON.stringify({
      summary: DFW_CALENDAR_SUMMARY,
      description: "Synced from Don't Forget Why app",
      timeZone: getUserTimeZone(),
    }),
  });
  if (!createRes.ok) throw new Error(`Failed to create DFW calendar (${createRes.status})`);
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) throw new Error('DFW calendar creation returned no id');
  kvSet(DFW_CALENDAR_KEY, created.id);
  return created.id;
}

// ── per-item sync helpers ──────────────────────────────────────

async function deleteEvent(calId: string, eventId: string): Promise<void> {
  await authedFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  );
}

async function putEvent(calId: string, eventId: string, body: EventBody): Promise<Response> {
  return authedFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

async function postEvent(calId: string, body: EventBody): Promise<{ id: string } | null> {
  const res = await authedFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

async function syncItem(
  calId: string,
  itemId: string,
  body: EventBody | null,
  syncMap: Record<string, string>,
): Promise<'synced' | 'skipped' | 'error'> {
  const existingEventId = syncMap[itemId];

  if (!body) {
    // Item is no longer syncable (disabled/completed). If previously synced, delete.
    if (existingEventId) {
      try {
        await deleteEvent(calId, existingEventId);
      } catch {
        // ignore
      }
      delete syncMap[itemId];
    }
    return 'skipped';
  }

  if (existingEventId) {
    try {
      const res = await putEvent(calId, existingEventId, body);
      if (res.ok) return 'synced';
      if (res.status === 404) {
        // Event was deleted server-side; fall through to recreate
        delete syncMap[itemId];
      } else {
        return 'error';
      }
    } catch {
      return 'error';
    }
  }

  try {
    const created = await postEvent(calId, body);
    if (!created) return 'error';
    syncMap[itemId] = created.id;
    return 'synced';
  } catch {
    return 'error';
  }
}

// ── main entry point ──────────────────────────────────────────

export async function syncToGoogleCalendar(): Promise<SyncResult> {
  if (!isProUser()) {
    throw new Error('Pro required for calendar sync');
  }

  const granted = await requestCalendarWriteScope();
  if (!granted) {
    throw new Error('Calendar write permission denied');
  }

  const calId = await findOrCreateDfwCalendar();
  const alarms = await loadAlarms(false);
  const reminders = await getReminders(false);
  const syncMap = getSyncMap();

  let synced = 0;
  let errors = 0;

  for (const alarm of alarms) {
    const body = alarmToEvent(alarm);
    const outcome = await syncItem(calId, alarm.id, body, syncMap);
    if (outcome === 'synced') synced += 1;
    else if (outcome === 'error') errors += 1;
  }

  for (const reminder of reminders) {
    const body = reminderToEvent(reminder);
    const outcome = await syncItem(calId, reminder.id, body, syncMap);
    if (outcome === 'synced') synced += 1;
    else if (outcome === 'error') errors += 1;
  }

  saveSyncMap(syncMap);

  return { synced, errors };
}
