import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';

interface BackButtonProps {
  onPress: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.circle, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => { hapticLight(); onPress(); }}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={[styles.arrow, { color: colors.textPrimary }]}>{'\u2039'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  arrow: {
    fontSize: 22,
    marginTop: -2,
  },
});
