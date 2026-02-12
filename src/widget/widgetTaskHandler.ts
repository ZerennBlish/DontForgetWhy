import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPresets } from '../data/timerPresets';
import {
  scheduleTimerNotification,
  showTimerCountdownNotification,
} from '../services/notifications';
import {
  addActiveTimer,
  loadPresets,
  recordPresetUsage,
} from '../services/timerStorage';
import type { ActiveTimer } from '../types/timer';
import { TimerWidget } from './TimerWidget';
import type { WidgetPreset } from './TimerWidget';

const RECENT_KEY = 'recentPresets';

export async function getWidgetPresets(): Promise<WidgetPreset[]> {
  const nonCustom = defaultPresets.filter((p) => p.id !== 'custom');

  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const recentIds: string[] = parsed.map(
          (e: { presetId: string }) => e.presetId,
        );
        const result: WidgetPreset[] = [];

        for (const id of recentIds) {
          if (result.length >= 6) break;
          const preset = nonCustom.find((p) => p.id === id);
          if (preset) {
            result.push({ id: preset.id, icon: preset.icon, label: preset.label });
          }
        }

        if (result.length < 6) {
          const recentSet = new Set(recentIds);
          for (const preset of nonCustom) {
            if (result.length >= 6) break;
            if (!recentSet.has(preset.id)) {
              result.push({ id: preset.id, icon: preset.icon, label: preset.label });
            }
          }
        }

        return result;
      }
    }
  } catch {
    // fall through to defaults
  }

  return nonCustom
    .slice(0, 6)
    .map((p) => ({ id: p.id, icon: p.icon, label: p.label }));
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'TimerWidget') {
        const presets = await getWidgetPresets();
        props.renderWidget(React.createElement(TimerWidget, { presets }));
      }
      break;
    case 'WIDGET_CLICK': {
      const action = props.clickAction;
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

        // Schedule completion notification (alarm sound when timer ends)
        let notificationId: string | undefined;
        try {
          notificationId = await scheduleTimerNotification(
            timer.label,
            timer.icon,
            completionTimestamp,
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
              const updatedPresets = await getWidgetPresets();
              return React.createElement(TimerWidget, { presets: updatedPresets });
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
