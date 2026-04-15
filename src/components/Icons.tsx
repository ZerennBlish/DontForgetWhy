import React from 'react';
import { View } from 'react-native';

interface IconProps {
  color: string;
  size?: number;
  accessibilityLabel?: string;
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

export function LockIcon({ color, size = 20, accessibilityLabel }: IconProps) {
  const s = size;
  return (
    <View
      style={{
        width: s,
        height: s,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: s * 0.05,
      }}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <View
        style={{
          width: s * 0.4,
          height: s * 0.4,
          borderWidth: s * 0.08,
          borderColor: color,
          borderRadius: s * 0.2,
          borderBottomWidth: 0,
        }}
      />
      <View
        style={{
          width: s * 0.6,
          height: s * 0.45,
          backgroundColor: color,
          borderRadius: s * 0.08,
        }}
      />
    </View>
  );
}
