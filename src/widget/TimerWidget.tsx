import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetPreset {
  id: string;
  icon: string;
  label: string;
}

interface TimerWidgetProps {
  presets: WidgetPreset[];
}

export function TimerWidget({ presets }: TimerWidgetProps) {
  const rows: WidgetPreset[][] = [];
  for (let i = 0; i < presets.length; i += 2) {
    rows.push(presets.slice(i, i + 2));
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121220',
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
          color: '#EAEAFF',
          marginBottom: 8,
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          flexDirection: 'column',
        }}
      >
        {rows.map((row, rowIndex) => (
          <FlexWidget
            key={`row-${rowIndex}`}
            style={{
              width: 'match_parent',
              flexDirection: 'row',
              flex: 1,
              marginBottom: rowIndex < rows.length - 1 ? 6 : 0,
            }}
          >
            {row.map((preset, colIndex) => (
              <FlexWidget
                key={`cell-${rowIndex}-${colIndex}`}
                clickAction={`START_TIMER__${preset.id}`}
                style={{
                  flex: 1,
                  backgroundColor: '#1E1E2E',
                  borderRadius: 12,
                  borderColor: '#2A2A3E',
                  borderWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  marginRight: colIndex === 0 ? 3 : 0,
                  marginLeft: colIndex === 1 ? 3 : 0,
                }}
              >
                <TextWidget
                  text={preset.icon}
                  style={{
                    fontSize: 18,
                    marginRight: 6,
                  }}
                />
                <TextWidget
                  text={preset.label}
                  style={{
                    fontSize: 13,
                    color: '#EAEAFF',
                    fontWeight: '600',
                  }}
                />
              </FlexWidget>
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
