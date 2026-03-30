import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetNote {
  id: string;
  text: string;
  color: string;
  icon: string;
  fontColor?: string | null;
  createdAt: string;
}

export interface WidgetTheme {
  background: string;
  cellBg: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
}

export interface WidgetVoiceMemo {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
}

interface NotepadWidgetProps {
  notes: WidgetNote[];
  voiceMemos: WidgetVoiceMemo[];
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
          justifyContent: 'flex-start',
        }}
      >
        <TextWidget
          text={label}
          maxLines={10}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: textColor as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function formatMemoDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VoiceMemoCell({ memo }: { memo: WidgetVoiceMemo }) {
  const label = `\u{1F399}\uFE0F ${memo.title || 'Voice Memo'}`;
  const dur = formatMemoDuration(memo.duration);

  return (
    <FlexWidget
      clickAction={`OPEN_VOICE_MEMO__${memo.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: '#2A2A3E',
        borderRadius: 12,
        padding: 12,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={label}
        maxLines={1}
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#FFFFFF',
        }}
      />
      <TextWidget
        text={dur}
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: '#A29BFE',
          marginLeft: 8,
        }}
      />
    </FlexWidget>
  );
}

export function NotepadWidget({ notes, voiceMemos, theme }: NotepadWidgetProps) {
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
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          clickAction="RECORD_VOICE"
          style={{
            backgroundColor: theme.accent as `#${string}`,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text={'\u{1F399}\uFE0F'}
            style={{
              fontSize: 14,
              color: '#FFFFFF',
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_NOTES"
          style={{ flex: 1, alignItems: 'center' }}
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
            text={'\u{1F4DD}'}
            style={{
              fontSize: 14,
              color: '#FFFFFF',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Content cards — mixed notes + voice memos */}
      {(() => {
        type CombinedItem =
          | { type: 'note'; data: WidgetNote; createdAt: string }
          | { type: 'voiceMemo'; data: WidgetVoiceMemo; createdAt: string };
        const combined: CombinedItem[] = [
          ...notes.map((n) => ({ type: 'note' as const, data: n, createdAt: n.createdAt })),
          ...voiceMemos.map((m) => ({ type: 'voiceMemo' as const, data: m, createdAt: m.createdAt })),
        ];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const items = combined.slice(0, 4);
        return items.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {items.map((item, i) => (
            <FlexWidget
              key={item.type === 'note' ? `note-${item.data.id}` : `voice-${item.data.id}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: i < items.length - 1 ? 4 : 0,
              }}
            >
              {item.type === 'note'
                ? <NoteCell note={item.data} accent={theme.accent} />
                : <VoiceMemoCell memo={item.data} />}
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
      );
      })()}

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
