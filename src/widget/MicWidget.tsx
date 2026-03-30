import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetTheme } from './NotepadWidget';

interface MicWidgetProps {
  theme: WidgetTheme;
}

export function MicWidget({ theme }: MicWidgetProps) {
  return (
    <FlexWidget
      clickAction="RECORD_VOICE"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: theme.background as `#${string}`,
        borderRadius: 16,
        padding: 8,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text={'\u{1F399}\uFE0F'}
          style={{
            fontSize: 36,
          }}
        />
        <TextWidget
          text="Record"
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: theme.text as `#${string}`,
            marginTop: 4,
          }}
        />
      </FlexWidget>
      <TextWidget
        text="Don't Forget Why"
        style={{
          fontSize: 10,
          color: theme.border as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}
