import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function TimerWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121220',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'flex_start',
        alignItems: 'flex_start',
      }}
    >
      <TextWidget
        text="Don't Forget Why"
        style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#EAEAFF',
        }}
      />
      <TextWidget
        text="Timer Presets"
        style={{
          fontSize: 14,
          color: '#B0B0CC',
          marginTop: 4,
        }}
      />
      <TextWidget
        text="Coming soon..."
        style={{
          fontSize: 13,
          color: '#B0B0CC',
          marginTop: 12,
        }}
      />
    </FlexWidget>
  );
}
