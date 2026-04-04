import React from 'react';
import { View } from 'react-native';

interface IconProps {
  color: string;
  size?: number;
  accessibilityLabel?: string;
}

export function AlarmIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.8, height: s * 0.8, borderRadius: s * 0.4, borderWidth: s * 0.1, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: s * 0.2, borderLeftColor: 'transparent', borderBottomWidth: s * 0.3, borderBottomColor: color, position: 'absolute', top: s * 0.1 }} />
      </View>
    </View>
  );
}

export function TimerIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.7, height: s * 0.7, borderRadius: s * 0.35, borderWidth: s * 0.1, borderColor: color, alignItems: 'center' }}>
        <View style={{ width: s * 0.1, height: s * 0.25, backgroundColor: color, marginTop: s * 0.1 }} />
      </View>
      <View style={{ width: s * 0.3, height: s * 0.1, backgroundColor: color, position: 'absolute', top: s * 0.05, borderRadius: s * 0.05 }} />
    </View>
  );
}

export function BellIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.6, height: s * 0.5, backgroundColor: color, borderTopLeftRadius: s * 0.3, borderTopRightRadius: s * 0.3, marginTop: s * 0.1 }} />
      <View style={{ width: s * 0.8, height: s * 0.1, backgroundColor: color, borderRadius: s * 0.05 }} />
      <View style={{ width: s * 0.2, height: s * 0.15, backgroundColor: color, borderBottomLeftRadius: s * 0.1, borderBottomRightRadius: s * 0.1 }} />
    </View>
  );
}

export function DocIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.65, height: s * 0.8, borderRadius: s * 0.1, borderWidth: s * 0.075, borderColor: color, paddingTop: s * 0.15, paddingLeft: s * 0.1, gap: s * 0.1 }}>
        <View style={{ width: s * 0.35, height: s * 0.075, backgroundColor: color, borderRadius: s * 0.05 }} />
        <View style={{ width: s * 0.25, height: s * 0.075, backgroundColor: color, borderRadius: s * 0.05 }} />
        <View style={{ width: s * 0.35, height: s * 0.075, backgroundColor: color, borderRadius: s * 0.05 }} />
      </View>
    </View>
  );
}

export function MicIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.4, height: s * 0.6, borderRadius: s * 0.2, backgroundColor: color }} />
      <View style={{ width: s * 0.6, height: s * 0.3, borderRadius: s * 0.2, borderWidth: s * 0.075, borderColor: color, borderTopWidth: 0, position: 'absolute', bottom: s * 0.15 }} />
      <View style={{ width: s * 0.1, height: s * 0.15, backgroundColor: color, position: 'absolute', bottom: 0 }} />
    </View>
  );
}

export function CalendarIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.8, height: s * 0.7, borderRadius: s * 0.1, borderWidth: s * 0.075, borderColor: color, marginTop: s * 0.1 }}>
        <View style={{ width: '100%', height: s * 0.15, backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', gap: s * 0.1, position: 'absolute', bottom: s * 0.15 }}>
        <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
        <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
        <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function GamepadIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.9, height: s * 0.55, borderRadius: s * 0.25, borderWidth: s * 0.075, borderColor: color, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s * 0.15 }}>
        <View style={{ width: s * 0.25, height: s * 0.25, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.25, height: s * 0.075, backgroundColor: color, position: 'absolute' }} />
          <View style={{ width: s * 0.075, height: s * 0.25, backgroundColor: color, position: 'absolute' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: s * 0.1 }}>
          <View style={{ width: s * 0.125, height: s * 0.125, borderRadius: s * 0.0625, backgroundColor: color }} />
          <View style={{ width: s * 0.125, height: s * 0.125, borderRadius: s * 0.0625, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}

export function PencilIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.15, height: s * 0.7, backgroundColor: color, borderRadius: s * 0.05, transform: [{ rotate: '-45deg' }] }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.1, borderRightWidth: s * 0.1, borderTopWidth: s * 0.2,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        position: 'absolute', bottom: s * 0.1, left: s * 0.25,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
}

export function GearIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, borderWidth: s * 0.1, borderColor: color }} />
      <View style={{ width: s * 0.7, height: s * 0.7, borderRadius: s * 0.35, borderWidth: s * 0.075, borderColor: color, borderStyle: 'dashed', position: 'absolute' }} />
    </View>
  );
}

export function TrashIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.6, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', top: s * 0.15 }} />
      <View style={{ width: s * 0.2, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', top: s * 0.08 }} />
      <View style={{ width: s * 0.5, height: s * 0.55, borderWidth: s * 0.075, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: s * 0.08, borderBottomRightRadius: s * 0.08, position: 'absolute', bottom: s * 0.1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: s * 0.08 }}>
        <View style={{ width: s * 0.06, height: s * 0.3, backgroundColor: color, borderRadius: s * 0.03 }} />
        <View style={{ width: s * 0.06, height: s * 0.3, backgroundColor: color, borderRadius: s * 0.03 }} />
        <View style={{ width: s * 0.06, height: s * 0.3, backgroundColor: color, borderRadius: s * 0.03 }} />
      </View>
    </View>
  );
}

export function FireIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.5, height: s * 0.7, backgroundColor: color, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.15, borderBottomLeftRadius: s * 0.15, borderBottomRightRadius: s * 0.25, transform: [{ rotate: '-5deg' }], position: 'absolute', bottom: s * 0.05 }} />
      <View style={{ width: s * 0.25, height: s * 0.35, backgroundColor: color, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.12, borderBottomLeftRadius: s * 0.08, borderBottomRightRadius: s * 0.08, opacity: 0.6, position: 'absolute', top: s * 0.05, left: s * 0.35 }} />
    </View>
  );
}

export function ChevronRightIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.35, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, transform: [{ rotate: '45deg' }], position: 'absolute', top: s * 0.3 }} />
      <View style={{ width: s * 0.35, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, transform: [{ rotate: '-45deg' }], position: 'absolute', bottom: s * 0.3 }} />
    </View>
  );
}

export function CheckIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.25, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, transform: [{ rotate: '45deg' }], position: 'absolute', left: s * 0.15, bottom: s * 0.35 }} />
      <View style={{ width: s * 0.45, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, transform: [{ rotate: '-45deg' }], position: 'absolute', right: s * 0.15, bottom: s * 0.4 }} />
    </View>
  );
}

export function PlusIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.6, height: s * 0.1, backgroundColor: color, borderRadius: s * 0.05, position: 'absolute' }} />
      <View style={{ width: s * 0.1, height: s * 0.6, backgroundColor: color, borderRadius: s * 0.05, position: 'absolute' }} />
    </View>
  );
}

export function CloseIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.6, height: s * 0.1, backgroundColor: color, borderRadius: s * 0.05, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
      <View style={{ width: s * 0.6, height: s * 0.1, backgroundColor: color, borderRadius: s * 0.05, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
    </View>
  );
}

export function LightbulbIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.5, height: s * 0.55, backgroundColor: color, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.25, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05, position: 'absolute', top: s * 0.05 }} />
      <View style={{ width: s * 0.3, height: s * 0.15, borderWidth: s * 0.06, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05, position: 'absolute', bottom: s * 0.08 }} />
      <View style={{ width: s * 0.15, height: s * 0.06, backgroundColor: color, borderRadius: s * 0.03, position: 'absolute', top: s * 0.3 }} />
    </View>
  );
}

export function BrainIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.4, height: s * 0.65, backgroundColor: color, borderTopLeftRadius: s * 0.25, borderBottomLeftRadius: s * 0.15, position: 'absolute', left: s * 0.1, top: s * 0.15 }} />
      <View style={{ width: s * 0.4, height: s * 0.65, backgroundColor: color, borderTopRightRadius: s * 0.25, borderBottomRightRadius: s * 0.15, position: 'absolute', right: s * 0.1, top: s * 0.15 }} />
      <View style={{ width: s * 0.06, height: s * 0.55, backgroundColor: color, opacity: 0.3, position: 'absolute', top: s * 0.2 }} />
      <View style={{ width: s * 0.2, height: s * 0.06, backgroundColor: color, opacity: 0.3, position: 'absolute', left: s * 0.12, top: s * 0.35, borderRadius: s * 0.03 }} />
      <View style={{ width: s * 0.2, height: s * 0.06, backgroundColor: color, opacity: 0.3, position: 'absolute', right: s * 0.12, top: s * 0.45, borderRadius: s * 0.03 }} />
    </View>
  );
}

export function NumbersIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  const cellSize = s * 0.3;
  const gap = s * 0.1;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cellSize * 2 + gap, gap }}>
        <View style={{ width: cellSize, height: cellSize, borderRadius: s * 0.06, backgroundColor: color }} />
        <View style={{ width: cellSize, height: cellSize, borderRadius: s * 0.06, backgroundColor: color }} />
        <View style={{ width: cellSize, height: cellSize, borderRadius: s * 0.06, backgroundColor: color }} />
        <View style={{ width: cellSize, height: cellSize, borderRadius: s * 0.06, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function PuzzleIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.55, height: s * 0.55, borderWidth: s * 0.075, borderColor: color, borderRadius: s * 0.08, position: 'absolute' }} />
      <View style={{ width: s * 0.2, height: s * 0.2, backgroundColor: color, borderRadius: s * 0.1, position: 'absolute', top: s * 0.12, right: s * 0.12 }} />
      <View style={{ width: s * 0.2, height: s * 0.2, backgroundColor: color, borderRadius: s * 0.1, position: 'absolute', bottom: s * 0.12, left: s * 0.12 }} />
    </View>
  );
}

export function TrophyIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.5, height: s * 0.45, borderWidth: s * 0.075, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: s * 0.25, borderBottomRightRadius: s * 0.25, position: 'absolute', top: s * 0.1 }} />
      <View style={{ width: s * 0.7, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', top: s * 0.1 }} />
      <View style={{ width: s * 0.25, height: s * 0.2, borderWidth: s * 0.06, borderColor: color, borderRadius: s * 0.06, borderLeftWidth: 0, position: 'absolute', right: s * 0.08, top: s * 0.18 }} />
      <View style={{ width: s * 0.25, height: s * 0.2, borderWidth: s * 0.06, borderColor: color, borderRadius: s * 0.06, borderRightWidth: 0, position: 'absolute', left: s * 0.08, top: s * 0.18 }} />
      <View style={{ width: s * 0.08, height: s * 0.15, backgroundColor: color, position: 'absolute', bottom: s * 0.15 }} />
      <View style={{ width: s * 0.35, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', bottom: s * 0.08 }} />
    </View>
  );
}

export function WarningIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.4, borderRightWidth: s * 0.4, borderBottomWidth: s * 0.7,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
        position: 'absolute', top: s * 0.1,
      }} />
      <View style={{ width: s * 0.08, height: s * 0.22, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', top: s * 0.4, opacity: 0.3 }} />
      <View style={{ width: s * 0.08, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, position: 'absolute', bottom: s * 0.18, opacity: 0.3 }} />
    </View>
  );
}

export function SearchIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, borderWidth: s * 0.08, borderColor: color, position: 'absolute', top: s * 0.1, left: s * 0.12 }} />
      <View style={{ width: s * 0.08, height: s * 0.3, backgroundColor: color, borderRadius: s * 0.04, transform: [{ rotate: '45deg' }], position: 'absolute', bottom: s * 0.08, right: s * 0.15 }} />
    </View>
  );
}

export function ImageIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.8, height: s * 0.6, borderRadius: 2, borderWidth: 1.5, borderColor: color, justifyContent: 'flex-end', overflow: 'hidden' }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: s * 0.25, borderRightWidth: s * 0.25, borderBottomWidth: s * 0.3, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, alignSelf: 'flex-start', marginLeft: s * 0.05 }} />
      </View>
      <View style={{ width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: color, position: 'absolute', top: s * 0.15, right: s * 0.2 }} />
    </View>
  );
}

export function CameraIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.8, height: s * 0.55, borderRadius: 3, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s * 0.3, height: s * 0.3, borderRadius: s * 0.15, borderWidth: 1.5, borderColor: color }} />
      </View>
      <View style={{ width: s * 0.25, height: s * 0.1, backgroundColor: color, borderRadius: 1, position: 'absolute', top: s * 0.15 }} />
    </View>
  );
}

export function PaintBrushIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.15, height: s * 0.55, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-35deg' }], position: 'absolute', top: s * 0.05 }} />
      <View style={{ width: s * 0.25, height: s * 0.25, backgroundColor: color, borderRadius: s * 0.06, transform: [{ rotate: '-35deg' }], position: 'absolute', bottom: s * 0.1, left: s * 0.22 }} />
    </View>
  );
}

export function SortIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-start', paddingTop: s * 0.2 }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.7, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, marginBottom: s * 0.12 }} />
      <View style={{ width: s * 0.5, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04, marginBottom: s * 0.12 }} />
      <View style={{ width: s * 0.3, height: s * 0.08, backgroundColor: color, borderRadius: s * 0.04 }} />
    </View>
  );
}

export function ShareIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <View style={{ width: s * 0.6, height: s * 0.45, borderWidth: 1.5, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, position: 'absolute', bottom: s * 0.1 }} />
      <View style={{ width: 1.5, height: s * 0.5, backgroundColor: color, position: 'absolute', top: s * 0.08 }} />
      <View style={{ width: 0, height: 0, borderLeftWidth: s * 0.15, borderRightWidth: s * 0.15, borderBottomWidth: s * 0.15, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, position: 'absolute', top: s * 0.02 }} />
    </View>
  );
}

export function HomeIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {/* Roof — pointed triangle outline */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.45, borderRightWidth: s * 0.45,
        borderBottomWidth: s * 0.35,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: color,
        marginBottom: -1,
      }} />
      {/* House body — outlined rectangle */}
      <View style={{
        width: s * 0.65, height: s * 0.4,
        borderWidth: 1.5, borderColor: color, borderTopWidth: 0,
        alignItems: 'center', justifyContent: 'flex-end',
      }}>
        {/* Door cutout */}
        <View style={{
          width: s * 0.2, height: s * 0.22,
          backgroundColor: color, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1,
        }} />
      </View>
    </View>
  );
}
