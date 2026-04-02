import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { hapticLight } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';

interface BackButtonProps {
  onPress: () => void;
  forceDark?: boolean;
}

export default function BackButton({ onPress, forceDark }: BackButtonProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: (forceDark || colors.mode === 'dark') ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: (forceDark || colors.mode === 'dark') ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    arrow: {
      fontSize: 22,
      marginTop: -2,
      color: colors.textPrimary,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => { hapticLight(); onPress(); }}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={styles.arrow}>{'\u2039'}</Text>
    </TouchableOpacity>
  );
}
