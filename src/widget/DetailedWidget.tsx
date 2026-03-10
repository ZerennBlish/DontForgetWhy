import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetTheme } from './NotepadWidget';

export interface DetailedAlarm {
  id: string;
  icon: string;
  time: string;
  schedule: string;
}

export interface DetailedPreset {
  id: string;
  icon: string;
  label: string;
  duration: string;
  isPinned?: boolean;
}

export interface DetailedReminder {
  id: string;
  icon: string;
  text: string;
  completed: boolean;
  dueInfo: string;
}

interface DetailedWidgetProps {
  alarms: DetailedAlarm[];
  presets: DetailedPreset[];
  reminders: DetailedReminder[];
  theme: WidgetTheme;
}

function AlarmCell({ alarm, theme }: { alarm: DetailedAlarm; theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction={`OPEN_ALARM__${alarm.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: theme.border as `#${string}`,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text={alarm.icon}
        style={{
          fontSize: 16,
          marginRight: 6,
        }}
      />
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={alarm.time}
          style={{
            fontSize: 13,
            fontWeight: 'bold',
            color: theme.text as `#${string}`,
          }}
        />
        <TextWidget
          text={alarm.schedule}
          style={{
            fontSize: 10,
            color: theme.textSecondary as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function EmptyAlarmCell({ theme }: { theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction="CREATE_ALARM"
      style={{
        width: 'match_parent',
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: theme.border as `#${string}`,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text={'\uFF0B Set Alarm'}
        style={{
          fontSize: 11,
          color: theme.textSecondary as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}

function TimerCell({ preset, theme }: { preset: DetailedPreset; theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction={`START_TIMER__${preset.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: (preset.isPinned ? theme.accent : theme.border) as `#${string}`,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text={preset.icon}
        style={{
          fontSize: 16,
          marginRight: 6,
        }}
      />
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={preset.label}
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: theme.text as `#${string}`,
          }}
        />
        <TextWidget
          text={preset.duration}
          style={{
            fontSize: 10,
            color: theme.textSecondary as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function EmptyTimerCell({ theme }: { theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction="OPEN_TIMERS"
      style={{
        width: 'match_parent',
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: theme.border as `#${string}`,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text={'\uFF0B Set Timer'}
        style={{
          fontSize: 11,
          color: theme.textSecondary as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}

function ReminderCell({ reminder, theme }: { reminder: DetailedReminder; theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction={`OPEN_REMINDER__${reminder.id}`}
      style={{
        flex: 1,
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: theme.border as `#${string}`,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        marginRight: 4,
      }}
    >
      <TextWidget
        text={reminder.icon}
        style={{
          fontSize: 14,
          marginRight: 6,
        }}
      />
      {(reminder.text || reminder.dueInfo) ? (
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {reminder.text ? (
            <TextWidget
              text={reminder.text}
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: (reminder.completed ? theme.border : theme.text) as `#${string}`,
              }}
            />
          ) : null}
          {reminder.dueInfo ? (
            <TextWidget
              text={reminder.dueInfo}
              style={{
                fontSize: 9,
                color: theme.textSecondary as `#${string}`,
              }}
            />
          ) : null}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export function DetailedWidget({ alarms, presets, reminders, theme }: DetailedWidgetProps) {
  const slots = [0, 1, 2];

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
      <TextWidget
        text="Don't Forget Why"
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.text as `#${string}`,
          marginBottom: 8,
        }}
      />

      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          flexDirection: 'row',
        }}
      >
        {/* Left column: Timers */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            marginRight: 4,
          }}
        >
          <TextWidget
            text="Timers"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary as `#${string}`,
              marginBottom: 4,
            }}
          />
          {slots.map((i) => (
            <FlexWidget
              key={`timer-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: 4,
              }}
            >
              {presets[i] ? (
                <TimerCell preset={presets[i]} theme={theme} />
              ) : (
                <EmptyTimerCell theme={theme} />
              )}
            </FlexWidget>
          ))}
          <FlexWidget
            key="timer-add"
            style={{
              width: 'match_parent',
              flex: 1,
            }}
          >
            <EmptyTimerCell theme={theme} />
          </FlexWidget>
        </FlexWidget>

        {/* Right column: Alarms */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            marginLeft: 4,
          }}
        >
          <TextWidget
            text="Alarms"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary as `#${string}`,
              marginBottom: 4,
            }}
          />
          {slots.map((i) => (
            <FlexWidget
              key={`alarm-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: 4,
              }}
            >
              {alarms[i] ? (
                <AlarmCell alarm={alarms[i]} theme={theme} />
              ) : (
                <EmptyAlarmCell theme={theme} />
              )}
            </FlexWidget>
          ))}
          <FlexWidget
            key="alarm-add"
            style={{
              width: 'match_parent',
              flex: 1,
            }}
          >
            <EmptyAlarmCell theme={theme} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* Full-width Reminders section */}
      <FlexWidget
        style={{
          width: 'match_parent',
          marginTop: 6,
          flexDirection: 'column',
        }}
      >
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <TextWidget
            text="Reminders"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary as `#${string}`,
            }}
          />
          <FlexWidget
            clickAction="CREATE_REMINDER"
            style={{
              backgroundColor: theme.cellBg as `#${string}`,
              borderRadius: 8,
              borderColor: theme.border as `#${string}`,
              borderWidth: 1,
              borderStyle: 'dashed',
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <TextWidget
              text={'\uFF0B Set Reminder'}
              style={{
                fontSize: 10,
                color: theme.textSecondary as `#${string}`,
              }}
            />
          </FlexWidget>
        </FlexWidget>
        {reminders.length > 0 ? (
          <FlexWidget
            style={{
              width: 'match_parent',
              flexDirection: 'row',
            }}
          >
            {reminders.map((r, i) => (
              <ReminderCell key={`rem-${i}`} reminder={r} theme={theme} />
            ))}
          </FlexWidget>
        ) : (
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              width: 'match_parent',
              backgroundColor: theme.cellBg as `#${string}`,
              borderRadius: 12,
              borderColor: theme.border as `#${string}`,
              borderWidth: 1,
              padding: 8,
              alignItems: 'center',
            }}
          >
            <TextWidget
              text="No reminders"
              style={{
                fontSize: 11,
                color: theme.border as `#${string}`,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
