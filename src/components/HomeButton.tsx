import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { useAppIcon } from '../hooks/useAppIcon';

export default function HomeButton({ forceDark }: { forceDark?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const homeIcon = useAppIcon('home');
  return (
    <TouchableOpacity
      style={[styles.circle, {
        backgroundColor: (forceDark || colors.mode === 'dark') ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
        borderColor: (forceDark || colors.mode === 'dark') ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      }]}
      onPress={() => {
        hapticLight();
        if (navigation.canGoBack()) {
          navigation.popToTop();
        } else {
          navigation.navigate('Home');
        }
      }}
      activeOpacity={0.7}
      accessibilityLabel="Go home"
      accessibilityRole="button"
    >
      <Image source={homeIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
