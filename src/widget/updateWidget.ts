import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { DetailedWidget } from './DetailedWidget';
import { NotepadWidget } from './NotepadWidget';
import { getDetailedAlarms, getDetailedPresets, getCompactReminders, getWidgetNotes, getWidgetTheme } from './widgetTaskHandler';

export async function refreshTimerWidget(): Promise<void> {
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
  } catch (error) {
    // Widget may not be placed on home screen — silently ignore
    console.warn('[refreshDetailedWidget]', error);
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'NotepadWidget',
      renderWidget: async () => {
        const notes = await getWidgetNotes();
        return React.createElement(NotepadWidget, { notes, theme });
      },
    });
  } catch (error) {
    console.warn('[refreshNotepadWidget]', error);
  }
}
