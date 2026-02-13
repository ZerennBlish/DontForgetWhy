import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

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
}

const BG = '#121220';
const CELL_BG = '#1E1E2E';
const TEXT = '#EAEAFF';
const TEXT_SEC = '#B0B0CC';
const BORDER = '#2A2A3E';
const PIN_BORDER = '#4A90D9';

function AlarmCell({ alarm }: { alarm: WidgetAlarm }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        backgroundColor: CELL_BG,
        borderRadius: 12,
        borderColor: BORDER,
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
            color: TEXT,
          }}
        />
        <TextWidget
          text={alarm.label}
          style={{
            fontSize: 10,
            color: TEXT_SEC,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function EmptyAlarmCell() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        backgroundColor: CELL_BG,
        borderRadius: 12,
        borderColor: BORDER,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text="\u2014"
        style={{
          fontSize: 14,
          color: BORDER,
        }}
      />
    </FlexWidget>
  );
}

function TimerCell({ preset }: { preset: WidgetPreset }) {
  return (
    <FlexWidget
      clickAction={`START_TIMER__${preset.id}`}
      style={{
        width: 'match_parent',
        backgroundColor: CELL_BG,
        borderRadius: 12,
        borderColor: preset.isPinned ? PIN_BORDER : BORDER,
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
          color: TEXT,
          fontWeight: '600',
        }}
      />
    </FlexWidget>
  );
}

function EmptyTimerCell() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        backgroundColor: CELL_BG,
        borderRadius: 12,
        borderColor: BORDER,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        flex: 1,
      }}
    >
      <TextWidget
        text="\u2014"
        style={{
          fontSize: 14,
          color: BORDER,
        }}
      />
    </FlexWidget>
  );
}

export function TimerWidget({ alarms, presets }: TimerWidgetProps) {
  const alarmSlots = [0, 1, 2];
  const timerSlots = [0, 1, 2];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
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
          color: TEXT,
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
        {/* Left column: Alarms */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            marginRight: 4,
          }}
        >
          <TextWidget
            text="Alarms"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: TEXT_SEC,
              marginBottom: 4,
            }}
          />
          {alarmSlots.map((i) => (
            <FlexWidget
              key={`alarm-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: i < 2 ? 4 : 0,
              }}
            >
              {alarms[i] ? (
                <AlarmCell alarm={alarms[i]} />
              ) : (
                <EmptyAlarmCell />
              )}
            </FlexWidget>
          ))}
        </FlexWidget>

        {/* Right column: Timers */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            marginLeft: 4,
          }}
        >
          <TextWidget
            text="Timers"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: TEXT_SEC,
              marginBottom: 4,
            }}
          />
          {timerSlots.map((i) => (
            <FlexWidget
              key={`timer-${i}`}
              style={{
                width: 'match_parent',
                flex: 1,
                marginBottom: i < 2 ? 4 : 0,
              }}
            >
              {presets[i] ? (
                <TimerCell preset={presets[i]} />
              ) : (
                <EmptyTimerCell />
              )}
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
