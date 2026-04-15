import { getAccessToken, requestCalendarScope } from './firebaseAuth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string | null;
}

interface CacheEntry {
  events: GoogleCalendarEvent[];
  fetchedAt: number;
}

interface GoogleCalendarApiItem {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CALENDAR_API_BASE =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function buildCacheKey(start: string, end: string): string {
  return `${start}_${end}`;
}

function toLocalISOStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toISOString();
}

function toLocalISOEnd(dateStr: string): string {
  const d = new Date(dateStr + 'T23:59:59');
  return d.toISOString();
}

function parseItems(items: GoogleCalendarApiItem[]): GoogleCalendarEvent[] {
  const out: GoogleCalendarEvent[] = [];
  for (const item of items) {
    if (!item.id || !item.start || !item.end) continue;
    const isAllDay = !!item.start.date;
    const startTime = item.start.dateTime || item.start.date;
    const endTime = item.end.dateTime || item.end.date;
    if (!startTime || !endTime) continue;
    out.push({
      id: item.id,
      summary: item.summary || 'Untitled',
      description: item.description || null,
      startTime,
      endTime,
      isAllDay,
      location: item.location || null,
    });
  }
  return out;
}

async function callCalendarApi(
  startDate: string,
  endDate: string,
  accessToken: string,
): Promise<Response> {
  const timeMin = encodeURIComponent(toLocalISOStart(startDate));
  const timeMax = encodeURIComponent(toLocalISOEnd(endDate));
  const url = `${CALENDAR_API_BASE}?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function fetchCalendarEvents(
  startDate: string,
  endDate: string,
): Promise<GoogleCalendarEvent[]> {
  const cacheKey = buildCacheKey(startDate, endDate);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.events;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  let response: Response;
  try {
    response = await callCalendarApi(startDate, endDate, accessToken);
  } catch {
    return [];
  }

  if (response.status === 401) {
    try {
      await GoogleSignin.clearCachedAccessToken(accessToken);
    } catch {
      // Ignore — proceed to refresh attempt regardless.
    }
    const freshToken = await getAccessToken();
    if (!freshToken) return [];
    try {
      response = await callCalendarApi(startDate, endDate, freshToken);
    } catch {
      return [];
    }
  } else if (response.status === 403) {
    const granted = await requestCalendarScope();
    if (!granted) return [];
    const retryToken = await getAccessToken();
    if (!retryToken) return [];
    try {
      response = await callCalendarApi(startDate, endDate, retryToken);
    } catch {
      return [];
    }
  }

  if (!response.ok) return [];

  let data: { items?: GoogleCalendarApiItem[] };
  try {
    data = await response.json();
  } catch {
    return [];
  }

  const events = parseItems(data.items || []);
  cache.set(cacheKey, { events, fetchedAt: Date.now() });
  return events;
}

export function clearCalendarCache(): void {
  cache.clear();
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getEventsForDate(
  date: string,
  events: GoogleCalendarEvent[],
): GoogleCalendarEvent[] {
  const out: GoogleCalendarEvent[] = [];
  for (const event of events) {
    if (event.isAllDay) {
      const startDate = event.startTime.slice(0, 10);
      const endDate = event.endTime.slice(0, 10);
      if (startDate <= date && date < endDate) {
        out.push(event);
      }
    } else {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const startLocal = localDateString(start);
      const endLocal = localDateString(end);
      if (startLocal <= date && date <= endLocal) {
        out.push(event);
      }
    }
  }
  return out;
}
