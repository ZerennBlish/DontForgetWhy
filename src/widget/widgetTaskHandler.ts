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
import { loadSettings } from '../services/settings';
import {
  addActiveTimer,
  loadPresets,
  recordPresetUsage,
} from '../services/timerStorage';
import { getPinnedPresets, getPinnedAlarms, getPinnedReminders } from '../services/widgetPins';
import type { ActiveTimer } from '../types/timer';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import { ALL_DAYS, WEEKDAYS, WEEKENDS } from '../types/alarm';
import { formatTime } from '../utils/time';
import { TimerWidget } from './TimerWidget';
import type { WidgetPreset, WidgetAlarm } from './TimerWidget';
import { DetailedWidget } from './DetailedWidget';
import type { DetailedAlarm, DetailedPreset, DetailedReminder } from './DetailedWidget';

const RECENT_KEY = 'recentPresets';
const ALARMS_KEY = 'alarms';

const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

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
    return parsed.filter(
      (item: unknown): item is Alarm =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).time === 'string' &&
        typeof (item as Record<string, unknown>).enabled === 'boolean',
    );
  } catch {
    return [];
  }
}

// ── Compact widget data ──

export async function getWidgetAlarms(): Promise<WidgetAlarm[]> {
  const result: WidgetAlarm[] = [];
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
        result.push(alarmToCompact(alarm, settings.guessWhyEnabled, settings.timeFormat));
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
      result.push(alarmToCompact(alarm, settings.guessWhyEnabled, settings.timeFormat));
      addedIds.add(alarm.id);
    }
  }

  return result;
}

function alarmToCompact(
  alarm: Alarm,
  guessWhyEnabled: boolean,
  timeFormat: '12h' | '24h',
): WidgetAlarm {
  if (guessWhyEnabled) {
    return {
      id: alarm.id,
      icon: '\u2753',
      time: formatTime(alarm.time, timeFormat),
      label: 'Mystery',
    };
  }
  let label = alarm.nickname || alarm.icon || 'Alarm';
  if (alarm.mode === 'one-time' && alarm.date) {
    const [year, month, day] = alarm.date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return {
    id: alarm.id,
    icon: alarm.icon || '\u23F0',
    time: formatTime(alarm.time, timeFormat),
    label,
  };
}

export async function getWidgetPresets(): Promise<WidgetPreset[]> {
  const nonCustom = defaultPresets.filter((p) => p.id !== 'custom');
  const result: WidgetPreset[] = [];
  const addedIds = new Set<string>();

  try {
    const pinnedIds = await getPinnedPresets();
    for (const id of pinnedIds) {
      if (result.length >= 3) break;
      const preset = nonCustom.find((p) => p.id === id);
      if (preset) {
        result.push({ id: preset.id, icon: preset.icon, label: preset.label, isPinned: true });
        addedIds.add(preset.id);
      }
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
            const preset = nonCustom.find((p) => p.id === id);
            if (preset) {
              result.push({ id: preset.id, icon: preset.icon, label: preset.label });
              addedIds.add(preset.id);
            }
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
        result.push({ id: preset.id, icon: preset.icon, label: preset.label });
        addedIds.add(preset.id);
      }
    }
  }

  return result;
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
        result.push(alarmToDetailed(alarm, settings.guessWhyEnabled, settings.timeFormat));
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
      result.push(alarmToDetailed(alarm, settings.guessWhyEnabled, settings.timeFormat));
      addedIds.add(alarm.id);
    }
  }

  return result;
}

function alarmToDetailed(
  alarm: Alarm,
  guessWhyEnabled: boolean,
  timeFormat: '12h' | '24h',
): DetailedAlarm {
  if (guessWhyEnabled) {
    return {
      id: alarm.id,
      icon: '\u2753',
      time: formatTime(alarm.time, timeFormat),
      schedule: 'Mystery',
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
  const result: DetailedPreset[] = [];
  const addedIds = new Set<string>();

  function resolvePreset(id: string, isPinned?: boolean): DetailedPreset | null {
    const base = nonCustom.find((p) => p.id === id);
    if (!base) return null;
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
    );
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

function formatReminderDueInfo(reminder: Reminder, timeFormat: '12h' | '24h'): string {
  const hasDate = !!reminder.dueDate;
  const hasTime = !!reminder.dueTime;

  if (!hasDate && !hasTime) return '';

  let timePart = '';
  if (hasTime) {
    timePart = formatTime(reminder.dueTime!, timeFormat);
  }

  let datePart = '';
  if (hasDate) {
    const [year, month, day] = reminder.dueDate!.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (hasTime && hasDate) {
    return `${timePart} \u00B7 ${datePart}`;
  }

  if (hasTime) {
    const now = new Date();
    const [hours, minutes] = reminder.dueTime!.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    const label = target.getTime() <= now.getTime() ? 'tomorrow' : 'today';
    return `${timePart} ${label}`;
  }

  return datePart;
}

function reminderToDetailed(reminder: Reminder, timeFormat: '12h' | '24h'): DetailedReminder {
  return {
    id: reminder.id,
    icon: reminder.private ? '\u{1F4DD}' : reminder.icon,
    text: reminder.private ? 'Something to do...' : reminder.text,
    completed: reminder.completed,
    dueInfo: formatReminderDueInfo(reminder, timeFormat),
  };
}

export async function getDetailedReminders(): Promise<DetailedReminder[]> {
  const allReminders = await loadWidgetReminders();
  const incomplete = allReminders.filter((r) => !r.completed);

  if (incomplete.length === 0) return [];

  const settings = await loadSettings();
  const timeFormat = settings.timeFormat;

  const result: DetailedReminder[] = [];
  const addedIds = new Set<string>();

  // Pinned reminders first (only incomplete ones)
  try {
    const pinnedIds = await getPinnedReminders();
    for (const id of pinnedIds) {
      if (result.length >= 3) break;
      const reminder = incomplete.find((r) => r.id === id);
      if (reminder) {
        result.push(reminderToDetailed(reminder, timeFormat));
        addedIds.add(reminder.id);
      }
    }
  } catch {
    // fall through
  }

  // Fill remaining slots with soonest unpinned reminders
  if (result.length < 3) {
    const unpinned = incomplete
      .filter((r) => !addedIds.has(r.id))
      .sort((a, b) => getReminderSortTimestamp(a) - getReminderSortTimestamp(b));

    for (const reminder of unpinned) {
      if (result.length >= 3) break;
      result.push(reminderToDetailed(reminder, timeFormat));
    }
  }

  return result;
}

// ── Rendering ──

async function renderCompactWidget(props: WidgetTaskHandlerProps) {
  const alarms = await getWidgetAlarms();
  const presets = await getWidgetPresets();
  props.renderWidget(React.createElement(TimerWidget, { alarms, presets }));
}

async function renderDetailedWidget(props: WidgetTaskHandlerProps) {
  const alarms = await getDetailedAlarms();
  const presets = await getDetailedPresets();
  const reminders = await getDetailedReminders();
  props.renderWidget(React.createElement(DetailedWidget, { alarms, presets, reminders }));
}

// ── Refresh both widgets (called after timer start from widget) ──

async function refreshAllWidgets(): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'TimerWidget',
      renderWidget: async () => {
        const alarms = await getWidgetAlarms();
        const presets = await getWidgetPresets();
        return React.createElement(TimerWidget, { alarms, presets });
      },
    });
  } catch {
    // compact widget may not be placed
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'DetailedWidget',
      renderWidget: async () => {
        const alarms = await getDetailedAlarms();
        const presets = await getDetailedPresets();
        const reminders = await getDetailedReminders();
        return React.createElement(DetailedWidget, { alarms, presets, reminders });
      },
    });
  } catch {
    // detailed widget may not be placed
  }
}

// ── Task handler ──

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'TimerWidget') {
        await renderCompactWidget(props);
      } else if (widgetInfo.widgetName === 'DetailedWidget') {
        await renderDetailedWidget(props);
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

      if (action?.startsWith('START_TIMER__')) {
        const presetId = action.replace('START_TIMER__', '');

        const allPresets = await loadPresets();
        const preset = allPresets.find((p) => p.id === presetId);
        if (!preset) break;

        const duration = preset.customSeconds || preset.seconds;
        if (duration <= 0) break;

        const timerId = Date.now().toString() + Math.random().toString(36).slice(2);

        const timer: ActiveTimer = {
          id: timerId,
          presetId: preset.id,
          label: preset.label,
          icon: preset.icon,
          totalSeconds: duration,
          remainingSeconds: duration,
          startedAt: new Date().toISOString(),
          isRunning: true,
        };

        const completionTimestamp = Date.now() + duration * 1000;

        await setupNotificationChannel();

        let notificationId: string | undefined;
        try {
          notificationId = await scheduleTimerNotification(
            timer.label,
            timer.icon,
            completionTimestamp,
            timer.id,
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
        await recordPresetUsage(preset.id);
        await refreshAllWidgets();
      }
      break;
    }
    default:
      break;
  }
}
