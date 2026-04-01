import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { hapticLight } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';

export default function HomeButton() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    roof: {
      width: 0,
      height: 0,
      borderLeftWidth: 9,
      borderRightWidth: 9,
      borderBottomWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: colors.textPrimary,
      marginBottom: 1,
    },
    body: {
      width: 12,
      height: 8,
      backgroundColor: colors.textPrimary,
      borderRadius: 1,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => {
        hapticLight();
        navigation.navigate('Home');
      }}
      activeOpacity={0.7}
      accessibilityLabel="Go home"
      accessibilityRole="button"
    >
      <View style={styles.roof} />
      <View style={styles.body} />
    </TouchableOpacity>
  );
}
