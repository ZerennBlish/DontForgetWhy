import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetTheme } from './NotepadWidget';

export interface WidgetPreset {
  id: string;
  icon: string;
  label: string;
  isPinned?: boolean;
}

export interface WidgetAlarm {
  id: string;
  icon: string;
  time: string;
  label: string;
}

interface TimerWidgetProps {
  alarms: WidgetAlarm[];
  presets: WidgetPreset[];
  theme: WidgetTheme;
}

function AlarmCell({ alarm, theme }: { alarm: WidgetAlarm; theme: WidgetTheme }) {
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
          text={alarm.label}
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

function TimerCell({ preset, theme }: { preset: WidgetPreset; theme: WidgetTheme }) {
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
        justifyContent: 'center',
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
      <TextWidget
        text={preset.label}
        style={{
          fontSize: 13,
          color: theme.text as `#${string}`,
          fontWeight: '600',
        }}
      />
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text={'\u2014'}
        style={{
          fontSize: 14,
          color: theme.border as `#${string}`,
        }}
      />
    </FlexWidget>
  );
}

export function TimerWidget({ alarms, presets, theme }: TimerWidgetProps) {
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
      {/* Title */}
      <TextWidget
        text="Don't Forget Why"
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.text as `#${string}`,
          marginBottom: 8,
        }}
      />

      {/* Two columns */}
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
                marginBottom: i < 2 ? 4 : 0,
              }}
            >
              {presets[i] ? (
                <TimerCell preset={presets[i]} theme={theme} />
              ) : (
                <EmptyTimerCell theme={theme} />
              )}
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
    </FlexWidget>
  );
}
