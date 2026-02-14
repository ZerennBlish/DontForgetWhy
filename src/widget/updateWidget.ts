import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { TimerWidget } from './TimerWidget';
import { DetailedWidget } from './DetailedWidget';
import { getWidgetAlarms, getWidgetPresets, getDetailedAlarms, getDetailedPresets, getDetailedReminders } from './widgetTaskHandler';

export async function refreshTimerWidget(): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'TimerWidget',
      renderWidget: async () => {
        const alarms = await getWidgetAlarms();
        const presets = await getWidgetPresets();
        return React.createElement(TimerWidget, { alarms, presets });
      },
    });
  } catch (error) {
    // Widget may not be placed on home screen — silently ignore
    console.warn('[refreshTimerWidget]', error);
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
  } catch (error) {
    // Widget may not be placed on home screen — silently ignore
    console.warn('[refreshDetailedWidget]', error);
  }
}
