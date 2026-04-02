import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetTheme } from './NotepadWidget';

interface MicWidgetProps {
  theme: WidgetTheme;
}

export function MicWidget({ theme }: MicWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: theme.background as `#${string}`,
        borderRadius: 16,
        padding: 6,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FlexWidget
        clickAction="RECORD_VOICE"
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.red as `#${string}`,
          width: 48,
          height: 48,
          borderRadius: 24,
        }}
      >
        <TextWidget
          text={'\u{1F399}\uFE0F'}
          style={{
            fontSize: 20,
          }}
        />
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_VOICE_MEMOS"
        style={{
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <TextWidget
          text="DFW"
          style={{
            fontSize: 8,
            color: theme.border as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
