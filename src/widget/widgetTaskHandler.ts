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
import { getPinnedPresets, getPinnedAlarms } from '../services/widgetPins';
import type { ActiveTimer } from '../types/timer';
import type { Alarm, AlarmDay } from '../types/alarm';
import { formatTime } from '../utils/time';
import { TimerWidget } from './TimerWidget';
import type { WidgetPreset, WidgetAlarm } from './TimerWidget';

const RECENT_KEY = 'recentPresets';
const ALARMS_KEY = 'alarms';

const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

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

  // One-time alarm with a specific date
  if (mode === 'one-time' && alarm.date) {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const d = new Date(alarm.date);
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }

  // Recurring with specific days
  const days: string[] = alarm.days?.length ? alarm.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (days.length === 7) {
    return getNextAlarmTimestamp(alarm.time);
  }

  // Find the nearest day
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

export async function getWidgetAlarms(): Promise<WidgetAlarm[]> {
  const result: WidgetAlarm[] = [];
  const addedIds = new Set<string>();

  // Load alarms from AsyncStorage
  let allAlarms: Alarm[] = [];
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        allAlarms = parsed.filter(
          (item: unknown): item is Alarm =>
            item !== null &&
            typeof item === 'object' &&
            typeof (item as Record<string, unknown>).id === 'string' &&
            typeof (item as Record<string, unknown>).time === 'string' &&
            typeof (item as Record<string, unknown>).enabled === 'boolean',
        );
      }
    }
  } catch {
    return [];
  }

  const enabledAlarms = allAlarms.filter((a) => a.enabled);

  // Load settings for Guess Why + time format
  const settings = await loadSettings();

  // 1. Pinned alarms first (enabled only, in pinned order)
  try {
    const pinnedIds = await getPinnedAlarms();
    for (const id of pinnedIds) {
      if (result.length >= 3) break;
      const alarm = enabledAlarms.find((a) => a.id === id);
      if (alarm) {
        result.push(alarmToWidget(alarm, settings.guessWhyEnabled, settings.timeFormat));
        addedIds.add(alarm.id);
      }
    }
  } catch {
    // fall through
  }

  // 2. Fill remaining with next upcoming enabled alarms by time
  if (result.length < 3) {
    const remaining = enabledAlarms
      .filter((a) => !addedIds.has(a.id))
      .sort((a, b) => getNextFireTime(a) - getNextFireTime(b));

    for (const alarm of remaining) {
      if (result.length >= 3) break;
      result.push(alarmToWidget(alarm, settings.guessWhyEnabled, settings.timeFormat));
      addedIds.add(alarm.id);
    }
  }

  return result;
}

function alarmToWidget(
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
    const d = new Date(alarm.date);
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

  // 1. Pinned presets first (in pinned order)
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

  // 2. Fill remaining with recently-used presets
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

  // 3. Fill remaining with defaults
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

async function renderWidget(props: WidgetTaskHandlerProps) {
  const alarms = await getWidgetAlarms();
  const presets = await getWidgetPresets();
  props.renderWidget(React.createElement(TimerWidget, { alarms, presets }));
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'TimerWidget') {
        await renderWidget(props);
      }
      break;
    case 'WIDGET_CLICK': {
      const action = props.clickAction;

      if (action === 'OPEN_APP') {
        // Open the app's main activity
        try {
          await Linking.openURL('dontforgetwhy://');
        } catch {
          // Silently ignore if scheme not available
        }
        break;
      }

      if (action?.startsWith('START_TIMER__')) {
        const presetId = action.replace('START_TIMER__', '');

        // Load preset data (respects custom durations)
        const allPresets = await loadPresets();
        const preset = allPresets.find((p) => p.id === presetId);
        if (!preset) break;

        const duration = preset.customSeconds || preset.seconds;
        if (duration <= 0) break;

        // Generate unique timer ID (uuid not available in headless JS)
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

        // Ensure notification channels exist (headless JS has no App.tsx init)
        await setupNotificationChannel();

        // Schedule completion notification (alarm sound when timer ends)
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

        // Show ongoing countdown notification (chronometer)
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

        // Save timer to AsyncStorage (same 'activeTimers' key AlarmListScreen reads)
        await addActiveTimer({ ...timer, notificationId });

        // Record preset usage (updates recently-used order)
        await recordPresetUsage(preset.id);

        // Refresh all widget instances with updated preset order
        try {
          await requestWidgetUpdate({
            widgetName: 'TimerWidget',
            renderWidget: async () => {
              const updatedAlarms = await getWidgetAlarms();
              const updatedPresets = await getWidgetPresets();
              return React.createElement(TimerWidget, { alarms: updatedAlarms, presets: updatedPresets });
            },
          });
        } catch {
          // Widget update failed — silently ignore
        }
      }
      break;
    }
    default:
      break;
  }
}
