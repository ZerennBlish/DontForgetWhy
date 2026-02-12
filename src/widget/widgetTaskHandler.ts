import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPresets } from '../data/timerPresets';
import { TimerWidget } from './TimerWidget';
import type { WidgetPreset } from './TimerWidget';

const RECENT_KEY = 'recentPresets';

async function getWidgetPresets(): Promise<WidgetPreset[]> {
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
            result.push({ icon: preset.icon, label: preset.label });
          }
        }

        if (result.length < 6) {
          const recentSet = new Set(recentIds);
          for (const preset of nonCustom) {
            if (result.length >= 6) break;
            if (!recentSet.has(preset.id)) {
              result.push({ icon: preset.icon, label: preset.label });
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
    .map((p) => ({ icon: p.icon, label: p.label }));
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
    default:
      break;
  }
}
