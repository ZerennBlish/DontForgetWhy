import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { DetailedWidget } from './DetailedWidget';
import { NotepadWidget } from './NotepadWidget';
import { CalendarWidget } from './CalendarWidget';
import { MicWidget } from './MicWidget';
import { getDetailedAlarms, getDetailedPresets, getCompactReminders, getWidgetNotes, getWidgetVoiceMemos, getCalendarWidgetData, getWidgetTheme } from './widgetTaskHandler';

export async function refreshWidgets(): Promise<void> {
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
        const voiceMemos = await getWidgetVoiceMemos();
        return React.createElement(NotepadWidget, { notes, voiceMemos, theme });
      },
    });
  } catch (error) {
    console.warn('[refreshNotepadWidget]', error);
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'CalendarWidget',
      renderWidget: async () => {
        const data = await getCalendarWidgetData();
        return React.createElement(CalendarWidget, { ...data, theme });
      },
    });
  } catch (error) {
    console.warn('[refreshCalendarWidget]', error);
  }
  try {
    await requestWidgetUpdate({
      widgetName: 'MicWidget',
      renderWidget: async () => {
        return React.createElement(MicWidget, { theme });
      },
    });
  } catch (error) {
    console.warn('[refreshMicWidget]', error);
  }
}
