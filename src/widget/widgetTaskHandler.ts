import React from 'react';
import { Linking } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPresets } from '../data/timerPresets';
import {
  setupNotificationChannel,
  scheduleTimerNotification,
  showTimerCountdownNotification,
} from '../services/notifications';
import { loadSettings, getDefaultTimerSound } from '../services/settings';
import {
  addActiveTimer,
  loadPresets,
  recordPresetUsage,
  loadUserTimers,
} from '../services/timerStorage';
import { getPinnedPresets, getPinnedAlarms } from '../services/widgetPins';
import type { ActiveTimer, UserTimer } from '../types/timer';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import { ALL_DAYS, WEEKDAYS, WEEKENDS } from '../types/alarm';
import { formatTime } from '../utils/time';
import { DetailedWidget } from './DetailedWidget';
import type { DetailedAlarm, DetailedPreset, DetailedReminder } from './DetailedWidget';
import { NotepadWidget } from './NotepadWidget';
import { MicWidget } from './MicWidget';
import type { WidgetNote, WidgetVoiceMemo, WidgetTheme } from './NotepadWidget';
import { CalendarWidget } from './CalendarWidget';
import type { CalendarDayData } from './CalendarWidget';
import { themes, generateCustomThemeDual } from '../theme/colors';
import { getNotes } from '../services/noteStorage';
import { getPinnedNotes } from '../services/widgetPins';
import { setPendingNoteAction } from '../services/noteStorage';

const RECENT_KEY = 'recentPresets';
const ALARMS_KEY = 'alarms';

const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const CALENDAR_WEEKDAY: Record<number, AlarmDay> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

function toWidgetDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Helpers ──

function getNextAlarmTimestamp(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hours, minutes, 0, 0);
  if (alarmDate.getTime() <= now.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }
  return alarmDate.getTime();
}

function getNextFireTime(alarm: Alarm): number {
  const mode = alarm.mode || 'recurring';

  if (mode === 'one-time' && alarm.date) {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const [year, month, day] = alarm.date.split('-').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return d.getTime();
  }

  const days: string[] = alarm.days?.length ? alarm.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (days.length === 7) {
    return getNextAlarmTimestamp(alarm.time);
  }

  const [hours, minutes] = alarm.time.split(':').map(Number);
  const now = new Date();
  let earliest = Infinity;
  for (const day of days) {
    const target = DAY_INDEX[day];
    if (target === undefined) continue;
    const todayDow = now.getDay();
    let daysUntil = (target - todayDow + 7) % 7;
    if (daysUntil === 0) {
      const todayAtTime = new Date();
      todayAtTime.setHours(hours, minutes, 0, 0);
      if (todayAtTime.getTime() <= now.getTime()) daysUntil = 7;
    }
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + daysUntil);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() < earliest) earliest = candidate.getTime();
  }
  return earliest;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (mins === 0) return hrs === 1 ? '1 hr' : `${hrs} hrs`;
  return `${hrs}h ${mins}m`;
}

function formatSchedule(alarm: Alarm): string {
  const mode = alarm.mode || 'recurring';
  if (mode === 'one-time' && alarm.date) {
    const [year, month, day] = alarm.date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const now = new Date();
    if (d.getFullYear() !== now.getFullYear()) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const days: AlarmDay[] = (alarm.days?.length ? alarm.days : [...ALL_DAYS]) as AlarmDay[];
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) return 'Weekends';
  return days.join(', ');
}

// ── Load alarms from AsyncStorage ──

async function loadWidgetAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const DAY_NAMES: AlarmDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return parsed.filter(
      (item: unknown): item is Alarm =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).time === 'string' &&
        typeof (item as Record<string, unknown>).enabled === 'boolean',
    ).filter((a) => !a.deletedAt).map((alarm) => {
      // Normalize legacy alarms (mirrors storage.ts migrateAlarm)
      let mode: Alarm['mode'] = alarm.mode || 'recurring';
      if (!alarm.mode && (alarm as unknown as { recurring?: boolean }).recurring === false) {
        mode = 'one-time';
      }
      let days: AlarmDay[];
      if (!Array.isArray(alarm.days)) {
        days = [];
      } else if (alarm.days.length > 0 && typeof alarm.days[0] === 'number') {
        days = (alarm.days as unknown as number[])
          .map((n) => DAY_NAMES[n])
          .filter((d): d is AlarmDay => d !== undefined);
      } else {
        days = alarm.days;
      }
      return { ...alarm, mode, days, date: alarm.date ?? null };
    });
  } catch {
    return [];
  }
}

// ── Widget reminders ──

export async function getCompactReminders(): Promise<DetailedReminder[]> {
  const allReminders = await loadWidgetReminders();
  const incomplete = allReminders.filter((r) => !r.completed);
  if (incomplete.length === 0) return [];

  const sorted = incomplete.sort(
    (a, b) => getReminderSortTimestamp(a) - getReminderSortTimestamp(b),
  );

  return sorted.slice(0, 2).map((r) => ({
    id: r.id,
    icon: r.private ? '\u{1F4DD}' : r.icon,
    text: r.private ? 'Something to do...' : (r.nickname || r.text || 'Reminder'),
  }));
}

// ── Detailed widget data ──

export async function getDetailedAlarms(): Promise<DetailedAlarm[]> {
  const result: DetailedAlarm[] = [];
  const addedIds = new Set<string>();

  const allAlarms = await loadWidgetAlarms();
  const enabledAlarms = allAlarms.filter((a) => a.enabled);
  const settings = await loadSettings();

  try {
    const pinnedIds = await getPinnedAlarms();
    for (const id of pinnedIds) {
      if (result.length >= 3) break;
      const alarm = enabledAlarms.find((a) => a.id === id);
      if (alarm) {
        result.push(alarmToDetailed(alarm, settings.timeFormat));
        addedIds.add(alarm.id);
      }
    }
  } catch {
    // fall through
  }

  if (result.length < 3) {
    const remaining = enabledAlarms
      .filter((a) => !addedIds.has(a.id))
      .sort((a, b) => getNextFireTime(a) - getNextFireTime(b));

    for (const alarm of remaining) {
      if (result.length >= 3) break;
      result.push(alarmToDetailed(alarm, settings.timeFormat));
      addedIds.add(alarm.id);
    }
  }

  return result;
}

function alarmToDetailed(
  alarm: Alarm,
  timeFormat: '12h' | '24h',
): DetailedAlarm {
  if (alarm.guessWhy) {
    return {
      id: alarm.id,
      icon: '\u2753',
      time: formatTime(alarm.time, timeFormat),
      schedule: 'Mystery',
    };
  }
  if (alarm.private) {
    return {
      id: alarm.id,
      icon: '\u23F0',
      time: formatTime(alarm.time, timeFormat),
      schedule: formatSchedule(alarm),
    };
  }
  return {
    id: alarm.id,
    icon: alarm.icon || '\u23F0',
    time: formatTime(alarm.time, timeFormat),
    schedule: formatSchedule(alarm),
  };
}

export async function getDetailedPresets(): Promise<DetailedPreset[]> {
  const nonCustom = defaultPresets.filter((p) => p.id !== 'custom');
  const allPresets = await loadPresets();
  const userTimers = await loadUserTimers();
  const result: DetailedPreset[] = [];
  const addedIds = new Set<string>();

  function resolvePreset(id: string, isPinned?: boolean): DetailedPreset | null {
    const base = nonCustom.find((p) => p.id === id);
    if (base) {
      const custom = allPresets.find((p) => p.id === id);
      const seconds = custom?.customSeconds || base.seconds;
      return {
        id: base.id,
        icon: base.icon,
        label: base.label,
        duration: formatDuration(seconds),
        isPinned,
      };
    }
    const userTimer = userTimers.find((t) => t.id === id);
    if (userTimer) {
      return {
        id: userTimer.id,
        icon: userTimer.icon,
        label: userTimer.label,
        duration: formatDuration(userTimer.seconds),
        isPinned,
      };
    }
    return null;
  }

  try {
    const pinnedIds = await getPinnedPresets();
    for (const id of pinnedIds) {
      if (result.length >= 3) break;
      const p = resolvePreset(id, true);
      if (p) { result.push(p); addedIds.add(id); }
    }
  } catch {
    // fall through
  }

  if (result.length < 3) {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const recentIds: string[] = parsed.map(
            (e: { presetId: string }) => e.presetId,
          );
          for (const id of recentIds) {
            if (result.length >= 3) break;
            if (addedIds.has(id)) continue;
            const p = resolvePreset(id);
            if (p) { result.push(p); addedIds.add(id); }
          }
        }
      }
    } catch {
      // fall through
    }
  }

  if (result.length < 3) {
    for (const preset of nonCustom) {
      if (result.length >= 3) break;
      if (!addedIds.has(preset.id)) {
        const p = resolvePreset(preset.id);
        if (p) { result.push(p); addedIds.add(preset.id); }
      }
    }
  }

  return result;
}

// ── Detailed widget reminders ──

const REMINDERS_KEY = 'reminders';

async function loadWidgetReminders(): Promise<Reminder[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is Reminder =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).text === 'string' &&
        typeof (item as Record<string, unknown>).icon === 'string',
    ).filter((r) => !r.deletedAt);
  } catch {
    return [];
  }
}

function getReminderSortTimestamp(reminder: Reminder): number {
  const now = new Date();

  if (reminder.dueDate && reminder.dueTime) {
    const [year, month, day] = reminder.dueDate.split('-').map(Number);
    const [hours, minutes] = reminder.dueTime.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  }

  if (reminder.dueTime) {
    const [hours, minutes] = reminder.dueTime.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  if (reminder.dueDate) {
    const [year, month, day] = reminder.dueDate.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  }

  return Infinity;
}

// ── Widget theme ──

export async function getWidgetTheme(): Promise<WidgetTheme> {
  try {
    const themeName = await AsyncStorage.getItem('appTheme');
    let key = themeName || 'midnight';
    const themeMigration: Record<string, string> = {
      obsidian: 'void', forest: 'neon', royal: 'ember',
      bubblegum: 'frost', sunshine: 'sand', ocean: 'frost',
      mint: 'frost', charcoal: 'void', amoled: 'void',
      slate: 'neon', paper: 'frost', cream: 'sand', arctic: 'frost',
    };
    if (themeMigration[key]) key = themeMigration[key];
    if (key === 'custom') {
      const customRaw = await AsyncStorage.getItem('customTheme');
      if (customRaw) {
        const parsed = JSON.parse(customRaw);
        if (typeof parsed === 'string') {
          const generated = generateCustomThemeDual(parsed, parsed);
          return { background: generated.background, cellBg: generated.card, text: generated.textPrimary, textSecondary: generated.textSecondary, border: generated.border, accent: generated.accent };
        }
        const obj = parsed as { accent: string; background?: string };
        const bgHex = obj.background || obj.accent;
        const generated = generateCustomThemeDual(bgHex, obj.accent);
        return { background: generated.background, cellBg: generated.card, text: generated.textPrimary, textSecondary: generated.textSecondary, border: generated.border, accent: generated.accent };
      }
    }
    const theme = themes[key as keyof typeof themes] || themes.midnight;
    return { background: theme.background, cellBg: theme.card, text: theme.textPrimary, textSecondary: theme.textSecondary, border: theme.border, accent: theme.accent };
  } catch {
    const fallback = themes.midnight;
    return { background: fallback.background, cellBg: fallback.card, text: fallback.textPrimary, textSecondary: fallback.textSecondary, border: fallback.border, accent: fallback.accent };
  }
}

// ── Notepad widget data ──

export async function getWidgetNotes(): Promise<WidgetNote[]> {
  const result: WidgetNote[] = [];
  const allNotes = await getNotes();

  try {
    const pinnedIds = await getPinnedNotes();
    for (const id of pinnedIds) {
      if (result.length >= 4) break;
      const note = allNotes.find((n) => n.id === id);
      if (note) {
        result.push({ id: note.id, text: note.text, color: note.color, icon: note.icon, fontColor: note.fontColor, createdAt: note.createdAt, isPinned: true });
      }
    }
  } catch {
    // fall through
  }

  // Fill remaining slots with most recent notes
  if (result.length < 4) {
    const addedIds = new Set(result.map((n) => n.id));
    const sorted = allNotes
      .filter((n) => !addedIds.has(n.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    for (const note of sorted) {
      if (result.length >= 4) break;
      result.push({ id: note.id, text: note.text, color: note.color, icon: note.icon, fontColor: note.fontColor, createdAt: note.createdAt, isPinned: false });
    }
  }

  return result;
}

// ── Voice memo widget data ──

export async function getWidgetVoiceMemos(): Promise<{ id: string; title: string; duration: number; createdAt: string; isPinned: boolean }[]> {
  try {
    const raw = await AsyncStorage.getItem('voiceMemos');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const active = parsed.filter((m: any) => m && typeof m.id === 'string' && !m.deletedAt);

    let pinnedIds: string[] = [];
    try {
      const pinnedRaw = await AsyncStorage.getItem('widgetPinnedVoiceMemos');
      if (pinnedRaw) {
        const pinnedParsed = JSON.parse(pinnedRaw);
        if (Array.isArray(pinnedParsed)) pinnedIds = pinnedParsed;
      }
    } catch { /* */ }
    const pinnedSet = new Set(pinnedIds);

    const pinned = active.filter((m: any) => pinnedSet.has(m.id));
    const unpinned = active.filter((m: any) => !pinnedSet.has(m.id));
    pinned.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    unpinned.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return [...pinned, ...unpinned]
      .slice(0, 4)
      .map((m: any) => ({ id: m.id, title: m.title || '', duration: m.duration || 0, createdAt: m.createdAt, isPinned: pinnedSet.has(m.id) }));
  } catch {
    return [];
  }
}

// ── Calendar widget data ──

export async function getCalendarWidgetData(): Promise<{
  monthLabel: string;
  weeks: CalendarDayData[][];
}> {
  let alarmList: Alarm[] = [];
  let reminderList: Reminder[] = [];
  let noteList: { createdAt: string }[] = [];

  try { alarmList = await loadWidgetAlarms(); } catch {}
  try { reminderList = await loadWidgetReminders(); } catch {}
  try {
    const allNotes = await getNotes();
    noteList = allNotes.filter((n) => !n.deletedAt);
  } catch {}

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayStr = toWidgetDateString(now);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const days: CalendarDayData[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 + (i - startDow));
    const dateStr = toWidgetDateString(d);
    const isCurrentMonth = d.getMonth() === month && d.getFullYear() === year;
    const weekday = CALENDAR_WEEKDAY[d.getDay()];

    let hasAlarm = false;
    for (const alarm of alarmList) {
      if (!alarm.enabled) continue;
      if (alarm.mode === 'one-time' && alarm.date === dateStr) { hasAlarm = true; break; }
      if (alarm.mode === 'recurring' && (alarm.days.length === 0 || alarm.days.includes(weekday))) { hasAlarm = true; break; }
    }

    let hasReminder = false;
    for (const reminder of reminderList) {
      if (reminder.completed) continue;
      if (reminder.recurring) {
        if (!reminder.days || reminder.days.length === 0) { hasReminder = true; break; }
        if (reminder.days.includes(weekday)) { hasReminder = true; break; }
      } else if (reminder.dueDate && reminder.dueDate.slice(0, 10) === dateStr) { hasReminder = true; break; }
    }

    let hasNote = false;
    for (const note of noteList) {
      const nd = new Date(note.createdAt);
      const noteDate = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
      if (noteDate === dateStr) { hasNote = true; break; }
    }

    days.push({
      date: dateStr,
      day: d.getDate(),
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      hasAlarm,
      hasReminder,
      hasNote,
    });
  }

  const weeks: CalendarDayData[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return { monthLabel, weeks };
}

// ── Rendering ──

async function renderDetailedWidget(props: WidgetTaskHandlerProps) {
  const alarms = await getDetailedAlarms();
  const presets = await getDetailedPresets();
  const reminders = await getCompactReminders();
  const theme = await getWidgetTheme();
  props.renderWidget(React.createElement(DetailedWidget, { alarms, presets, reminders, theme }));
}

async function renderNotepadWidget(props: WidgetTaskHandlerProps): Promise<void> {
  const notes = await getWidgetNotes();
  const voiceMemos = await getWidgetVoiceMemos();
  const theme = await getWidgetTheme();
  props.renderWidget(React.createElement(NotepadWidget, { notes, voiceMemos, theme }));
}

async function renderCalendarWidget(props: WidgetTaskHandlerProps): Promise<void> {
  const data = await getCalendarWidgetData();
  const theme = await getWidgetTheme();
  props.renderWidget(React.createElement(CalendarWidget, { ...data, theme }));
}

async function renderMicWidget(props: WidgetTaskHandlerProps): Promise<void> {
  const theme = await getWidgetTheme();
  props.renderWidget(React.createElement(MicWidget, { theme }));
}

// ── Refresh all widgets (called after timer start from widget) ──

async function refreshAllWidgets(): Promise<void> {
  const theme = await getWidgetTheme();
  try {
    await requestWidgetUpdate({
      widgetName: 'DetailedWidget',
      renderWidget: async () => {
        const alarms = await getDetailedAlarms();
        const presets = await getDetailedPresets();
        const reminders = await getCompactReminders();
        return React.createElement(DetailedWidget, { alarms, presets, reminders, theme });
      },
    });
  } catch {
    // detailed widget may not be placed
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'NotepadWidget',
      renderWidget: async () => {
        const notes = await getWidgetNotes();
        const voiceMemos = await getWidgetVoiceMemos();
        return React.createElement(NotepadWidget, { notes, voiceMemos, theme });
      },
    });
  } catch {
    // notepad widget may not be placed
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'CalendarWidget',
      renderWidget: async () => {
        const data = await getCalendarWidgetData();
        return React.createElement(CalendarWidget, { ...data, theme });
      },
    });
  } catch {
    // calendar widget may not be placed
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'MicWidget',
      renderWidget: async () => {
        return React.createElement(MicWidget, { theme });
      },
    });
  } catch {
    // mic widget may not be placed
  }
}

// ── Task handler ──

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'DetailedWidget') {
        await renderDetailedWidget(props);
      } else if (widgetInfo.widgetName === 'NotepadWidget') {
        await renderNotepadWidget(props);
      } else if (widgetInfo.widgetName === 'CalendarWidget') {
        await renderCalendarWidget(props);
      } else if (widgetInfo.widgetName === 'MicWidget') {
        await renderMicWidget(props);
      }
      break;
    case 'WIDGET_CLICK': {
      const action = props.clickAction;

      if (action === 'OPEN_APP') {
        try {
          await Linking.openURL('dontforgetwhy://');
        } catch {
          // Silently ignore if scheme not available
        }
        break;
      }

      if (action === 'OPEN_ALARMS' || action === 'OPEN_TIMERS' || action === 'OPEN_REMINDERS') {
        const tab = action === 'OPEN_ALARMS' ? 0 : action === 'OPEN_TIMERS' ? 1 : 2;
        await AsyncStorage.setItem('pendingTabAction', JSON.stringify({ tab, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('OPEN_ALARM__')) {
        const alarmId = action.replace('OPEN_ALARM__', '');
        await AsyncStorage.setItem('pendingAlarmAction', JSON.stringify({ action: 'editAlarm', alarmId, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('OPEN_REMINDER__')) {
        const reminderId = action.replace('OPEN_REMINDER__', '');
        await AsyncStorage.setItem('pendingReminderAction', JSON.stringify({ action: 'editReminder', reminderId, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action === 'ADD_NOTE') {
        await setPendingNoteAction({ type: 'new' });
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action === 'OPEN_NOTES') {
        await setPendingNoteAction({ type: 'open' });
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('OPEN_NOTE__')) {
        const noteId = action.replace('OPEN_NOTE__', '');
        await setPendingNoteAction({ type: 'edit', noteId });
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action === 'RECORD_VOICE') {
        await AsyncStorage.setItem('pendingVoiceAction', JSON.stringify({ type: 'record', timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('OPEN_VOICE_MEMO__')) {
        const memoId = action.replace('OPEN_VOICE_MEMO__', '');
        await AsyncStorage.setItem('pendingVoiceAction', JSON.stringify({ type: 'detail', memoId, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action === 'OPEN_CALENDAR') {
        await AsyncStorage.setItem('pendingCalendarAction', JSON.stringify({ date: null, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('OPEN_CALENDAR_DAY__')) {
        const date = action.replace('OPEN_CALENDAR_DAY__', '');
        await AsyncStorage.setItem('pendingCalendarAction', JSON.stringify({ date, timestamp: Date.now() }));
        try { await Linking.openURL('dontforgetwhy://'); } catch {}
        break;
      }

      if (action?.startsWith('START_TIMER__')) {
        const presetId = action.replace('START_TIMER__', '');

        const allPresets = await loadPresets();
        const preset = allPresets.find((p) => p.id === presetId);

        let duration: number;
        let timerLabel: string;
        let timerIcon: string;
        let timerSoundId: string | undefined;

        if (preset) {
          duration = preset.customSeconds || preset.seconds;
          timerLabel = preset.label;
          timerIcon = preset.icon;
        } else {
          const userTimers = await loadUserTimers();
          const userTimer = userTimers.find((t) => t.id === presetId);
          if (!userTimer) break;
          duration = userTimer.seconds;
          timerLabel = userTimer.label;
          timerIcon = userTimer.icon;
          timerSoundId = userTimer.soundId;
        }

        if (duration <= 0) break;

        const timerId = Date.now().toString() + Math.random().toString(36).slice(2);

        const timer: ActiveTimer = {
          id: timerId,
          presetId,
          label: timerLabel,
          icon: timerIcon,
          totalSeconds: duration,
          remainingSeconds: duration,
          startedAt: new Date().toISOString(),
          isRunning: true,
          soundId: timerSoundId,
        };

        const completionTimestamp = Date.now() + duration * 1000;

        await setupNotificationChannel();

        // Load default timer sound
        let soundUri: string | undefined;
        let soundName: string | undefined;
        try {
          const defaultSound = await getDefaultTimerSound();
          if (defaultSound.uri) {
            soundUri = defaultSound.uri;
            soundName = defaultSound.name || 'Custom';
          }
        } catch {}

        let notificationId: string | undefined;
        try {
          notificationId = await scheduleTimerNotification(
            timer.label,
            timer.icon,
            completionTimestamp,
            timer.id,
            soundUri,
            soundName,
            timer.soundId,
          );
        } catch (error) {
          console.error('[widgetTaskHandler] scheduleTimerNotification failed:', error);
        }

        try {
          await showTimerCountdownNotification(
            timer.label,
            timer.icon,
            completionTimestamp,
            timer.id,
          );
        } catch (error) {
          console.error('[widgetTaskHandler] showTimerCountdownNotification failed:', error);
        }

        await addActiveTimer({ ...timer, notificationId });
        await recordPresetUsage(presetId);
        await refreshAllWidgets();
      }
      break;
    }
    default:
      break;
  }
}
