import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { TimerWidget } from './TimerWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'TimerWidget') {
        props.renderWidget(React.createElement(TimerWidget));
      }
      break;
    default:
      break;
  }
}
