import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import APP_ICONS from '../data/appIconAssets';

export default function HomeButton({ forceDark }: { forceDark?: boolean }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.circle, {
        backgroundColor: (forceDark || colors.mode === 'dark') ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
        borderColor: (forceDark || colors.mode === 'dark') ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      }]}
      onPress={() => {
        hapticLight();
        navigation.navigate('Home');
      }}
      activeOpacity={0.7}
      accessibilityLabel="Go home"
      accessibilityRole="button"
    >
      <Image source={APP_ICONS.house} style={{ width: 20, height: 20 }} resizeMode="contain" />
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
    borderWidth: 1,
  },
});
