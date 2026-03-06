import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetNote {
  id: string;
  text: string;
  color: string;
  icon: string;
  fontColor?: string | null;
}

export interface WidgetTheme {
  background: string;
  text: string;
  border: string;
  accent: string;
}

interface NotepadWidgetProps {
  notes: WidgetNote[];
  theme: WidgetTheme;
}

const EMPTY_MESSAGES = [
  'Your brain is suspiciously empty.',
  'Nothing here. Suspicious.',
  'Tap + before you forget why you opened this.',
  'A blank widget. How zen.',
  'No notes? Living dangerously.',
  'Your future self is judging you.',
];

function getTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1A1A2E' : '#FFFFFF';
}

function NoteCell({ note, accent }: { note: WidgetNote; accent: string }) {
  const label = note.icon ? `${note.icon} ${note.text}` : note.text;
  const cardBg = note.color || accent;
  const textColor = note.fontColor || getTextColor(cardBg);

  return (
    <FlexWidget
      clickAction={`OPEN_NOTE__${note.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: cardBg as `#${string}`,
        borderRadius: 12,
        padding: 12,
        flex: 1,
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={label}
          maxLines={10}
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: textColor as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function NotepadWidget({ notes, theme }: NotepadWidgetProps) {
  const emptyMsg = EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)];
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: theme.background as `#${string}`,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          clickAction="OPEN_NOTES"
          style={{ flex: 1 }}
        >
          <TextWidget
            text={'\u{1F4DD} Notes'}
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: theme.text as `#${string}`,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="ADD_NOTE"
          style={{
            backgroundColor: theme.accent as `#${string}`,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Note cards */}
      {notes.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {notes.slice(0, 4).map((note, i) => (
            <FlexWidget
              key={`note-${note.id}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: i < Math.min(notes.length, 4) - 1 ? 4 : 0,
              }}
            >
              <NoteCell note={note} accent={theme.accent} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          clickAction="ADD_NOTE"
          style={{
            width: 'match_parent',
            flex: 1,
            borderRadius: 12,
            borderColor: theme.border as `#${string}`,
            borderWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 12,
          }}
        >
          <TextWidget
            text={emptyMsg}
            style={{
              fontSize: 13,
              color: theme.border as `#${string}`,
            }}
          />
        </FlexWidget>
      )}

      {/* Footer */}
      <FlexWidget
        clickAction="OPEN_NOTES"
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
