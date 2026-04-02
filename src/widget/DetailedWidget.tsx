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
        borderColor: theme.sectionAlarm as `#${string}`,
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


function TimerCell({ preset, theme }: { preset: DetailedPreset; theme: WidgetTheme }) {
  return (
    <FlexWidget
      clickAction={`START_TIMER__${preset.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: theme.cellBg as `#${string}`,
        borderRadius: 12,
        borderColor: theme.sectionTimer as `#${string}`,
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


export function DetailedWidget({ alarms, presets, reminders, theme }: DetailedWidgetProps) {
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
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="Memory's Timeline"
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text as `#${string}`,
          }}
        />
      </FlexWidget>

      {/* Two-column area */}
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
              color: theme.sectionTimer as `#${string}`,
              marginBottom: 4,
            }}
          />
          {presets.slice(0, 3).map((preset, i) => (
            <FlexWidget
              key={`timer-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: 4,
              }}
            >
              <TimerCell preset={preset} theme={theme} />
            </FlexWidget>
          ))}
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
              color: theme.sectionAlarm as `#${string}`,
              marginBottom: 4,
            }}
          />
          {alarms.slice(0, 3).map((alarm, i) => (
            <FlexWidget
              key={`alarm-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: 4,
              }}
            >
              <AlarmCell alarm={alarm} theme={theme} />
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>

      {/* Reminders section */}
      {reminders.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'column',
            marginTop: 4,
          }}
        >
          {reminders.slice(0, 2).map((reminder, i) => (
            <FlexWidget
              key={`rem-${i}`}
              clickAction={`OPEN_REMINDER__${reminder.id}`}
              style={{
                width: 'match_parent',
                height: 28,
                backgroundColor: theme.cellBg as `#${string}`,
                borderRadius: 8,
                borderColor: theme.sectionReminder as `#${string}`,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                marginBottom: 2,
              }}
            >
              <TextWidget
                text={reminder.icon}
                style={{
                  fontSize: 12,
                  marginRight: 4,
                }}
              />
              <TextWidget
                text={reminder.text}
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: theme.text as `#${string}`,
                }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : null}

      {/* Bottom navigation capsules */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          marginTop: 6,
        }}
      >
        <FlexWidget
          clickAction="OPEN_ALARMS"
          style={{
            flex: 1,
            marginHorizontal: 2,
            backgroundColor: theme.cellBg as `#${string}`,
            borderColor: theme.sectionAlarm as `#${string}`,
            borderWidth: 1,
            borderRadius: 16,
            paddingVertical: 6,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Alarms"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.sectionAlarm as `#${string}`,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_TIMERS"
          style={{
            flex: 1,
            marginHorizontal: 2,
            backgroundColor: theme.cellBg as `#${string}`,
            borderColor: theme.sectionTimer as `#${string}`,
            borderWidth: 1,
            borderRadius: 16,
            paddingVertical: 6,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Timers"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.sectionTimer as `#${string}`,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_REMINDERS"
          style={{
            flex: 1,
            marginHorizontal: 2,
            backgroundColor: theme.cellBg as `#${string}`,
            borderColor: theme.sectionReminder as `#${string}`,
            borderWidth: 1,
            borderRadius: 16,
            paddingVertical: 6,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Reminders"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.sectionReminder as `#${string}`,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
