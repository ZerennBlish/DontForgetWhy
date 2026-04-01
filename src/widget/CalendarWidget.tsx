import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetTheme } from './NotepadWidget';

export interface CalendarDayData {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  hasAlarm: boolean;
  hasReminder: boolean;
  hasNote: boolean;
}

export interface CalendarWidgetProps {
  monthLabel: string;
  weeks: CalendarDayData[][];
  theme: WidgetTheme;
}

const DOT_ALARM = '#FF6B6B';
const DOT_REMINDER = '#4A90D9';
const DOT_NOTE = '#55EFC4';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DayCell({ day, theme }: { day: CalendarDayData; theme: WidgetTheme }) {
  const textColor = day.isToday
    ? theme.background
    : !day.isCurrentMonth || day.isPast
      ? theme.textSecondary
      : theme.text;

  const dots: string[] = [];
  if (day.hasAlarm) dots.push(DOT_ALARM);
  if (day.hasReminder) dots.push(DOT_REMINDER);
  if (day.hasNote) dots.push(DOT_NOTE);

  return (
    <FlexWidget
      clickAction={`OPEN_CALENDAR_DAY__${day.date}`}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 2,
      }}
    >
      <FlexWidget
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (day.isToday ? theme.accent : theme.background) as `#${string}`,
        }}
      >
        <TextWidget
          text={String(day.day)}
          style={{
            fontSize: 11,
            fontWeight: day.isToday ? 'bold' : '400',
            color: textColor as `#${string}`,
          }}
        />
      </FlexWidget>
      {dots.length > 0 ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 7,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {dots.map((color, i) => (
            <TextWidget
              key={`d${i}`}
              text={'\u25CF'}
              style={{
                fontSize: 5,
                color: color as `#${string}`,
              }}
            />
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ height: 7 }} />
      )}
    </FlexWidget>
  );
}

export function CalendarWidget({ monthLabel, weeks, theme }: CalendarWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_CALENDAR"
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
        clickAction="OPEN_CALENDAR"
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <TextWidget
          text="Misplaced Thoughts"
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: theme.text as `#${string}`,
          }}
        />
        <TextWidget
          text={monthLabel}
          style={{
            fontSize: 12,
            color: theme.textSecondary as `#${string}`,
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {/* Weekday header row */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          marginBottom: 2,
        }}
      >
        {WEEKDAY_LABELS.map((label, i) => (
          <FlexWidget
            key={`wk${i}`}
            style={{
              flex: 1,
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={label}
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: theme.textSecondary as `#${string}`,
              }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Day grid */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          flexDirection: 'column',
        }}
      >
        {weeks.map((week, wi) => (
          <FlexWidget
            key={`w${wi}`}
            style={{
              width: 'match_parent',
              flex: 1,
              flexDirection: 'row',
            }}
          >
            {week.map((day, di) => (
              <DayCell key={`d${wi}${di}`} day={day} theme={theme} />
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Footer */}
      <FlexWidget
        clickAction="OPEN_CALENDAR"
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginTop: 4,
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
