import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { TimerWidget } from './TimerWidget';
import { getWidgetPresets } from './widgetTaskHandler';

export async function refreshTimerWidget(): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'TimerWidget',
      renderWidget: async () => {
        const presets = await getWidgetPresets();
        return React.createElement(TimerWidget, { presets });
      },
    });
  } catch (error) {
    // Widget may not be placed on home screen — silently ignore
    console.warn('[refreshTimerWidget]', error);
  }
}
