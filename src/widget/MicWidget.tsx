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
        padding: 8,
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header */}
      <FlexWidget
        clickAction="OPEN_VOICE_MEMOS"
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text={"\u{1F399}\uFE0F Memory's Voice"}
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text as `#${string}`,
          }}
        />
      </FlexWidget>

      {/* Body */}
      <FlexWidget
        clickAction="RECORD_VOICE"
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

      {/* Footer */}
      <FlexWidget
        clickAction="OPEN_VOICE_MEMOS"
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <TextWidget
          text="Don't Forget Why"
          style={{
            fontSize: 10,
            color: theme.border as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
