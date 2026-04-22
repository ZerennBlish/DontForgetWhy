import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { hapticLight } from '../utils/haptics';
import { useAppIcon } from '../hooks/useAppIcon';

interface BackButtonProps {
  onPress: () => void;
  forceDark?: boolean;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const backIcon = useAppIcon('backArrow');
  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => { hapticLight(); onPress(); }}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Image source={backIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
