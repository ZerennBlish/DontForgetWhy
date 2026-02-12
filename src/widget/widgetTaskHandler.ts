import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { defaultPresets } from '../data/timerPresets';
import { TimerWidget } from './TimerWidget';
import type { WidgetPreset } from './TimerWidget';

const RECENT_KEY = 'recentPresets';
const PENDING_WIDGET_TIMER_KEY = 'pendingWidgetTimer';

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
        const presetId = action.slice('START_TIMER__'.length);
        await AsyncStorage.setItem(PENDING_WIDGET_TIMER_KEY, presetId);
        try {
          await Linking.openURL(`dontforgetwhy://start-timer/${presetId}`);
        } catch {
          try {
            await Linking.openURL('dontforgetwhy://');
          } catch {
            // unable to open app
          }
        }
      }
      break;
    }
    default:
      break;
  }
}
