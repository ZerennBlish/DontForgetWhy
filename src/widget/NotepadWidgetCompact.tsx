import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetNote, WidgetTheme } from './NotepadWidget';

interface Props {
  notes: WidgetNote[];
  theme: WidgetTheme;
}

const ACCENT = '#4A90D9';

const EMPTY_MESSAGES = [
  'Nothing here yet.',
  'Tap + to jot something.',
  'Brain empty? Same.',
  'No notes. Bold move.',
];

function getTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1A1A2E' : '#FFFFFF';
}

function CompactNoteRow({ note }: { note: WidgetNote }) {
  const flat = note.text.replace(/\n/g, ' ');
  const label = note.icon ? `${note.icon} ${flat}` : flat;
  const cardBg = note.color || ACCENT;
  const textColor = note.fontColor || getTextColor(cardBg);

  return (
    <FlexWidget
      clickAction={`OPEN_NOTE__${note.id}`}
      style={{
        width: 'match_parent',
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: cardBg as `#${string}`,
        borderRadius: 8,
        paddingHorizontal: 8,
      }}
    >
      <TextWidget
        text={label}
        maxLines={1}
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: textColor as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}

function EmptyCompactRow({ theme }: { theme: WidgetTheme }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
      }}
    >
      <FlexWidget
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.border as `#${string}`,
          marginRight: 8,
        }}
      />
      <TextWidget
        text={'\u2014'}
        style={{
          fontSize: 12,
          color: theme.border as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}

export function NotepadWidgetCompact({ notes, theme }: Props) {
  const slots = [0, 1, 2];
  const emptyMsg = EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)];
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: theme.background as `#${string}`,
        borderRadius: 16,
        padding: 10,
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
          marginBottom: 4,
        }}
      >
        <FlexWidget
          clickAction="OPEN_NOTES"
          style={{ flex: 1 }}
        >
          <TextWidget
            text={'\u{1F4DD} Notes'}
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: theme.text as `#${string}`,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="ADD_NOTE"
          style={{
            backgroundColor: ACCENT,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Note rows or empty message */}
      {notes.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {slots.map((i) => (
            <FlexWidget
              key={`note-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: i < 2 ? 2 : 0,
              }}
            >
              {notes[i] ? <CompactNoteRow note={notes[i]} /> : <EmptyCompactRow theme={theme} />}
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          clickAction="ADD_NOTE"
          style={{
            width: 'match_parent',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={emptyMsg}
            style={{
              fontSize: 11,
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
          marginTop: 2,
        }}
      >
        <TextWidget
          text="Don't Forget Why"
          style={{
            fontSize: 9,
            color: theme.border as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
