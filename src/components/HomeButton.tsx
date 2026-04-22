import React from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptics';
import { useAppIcon } from '../hooks/useAppIcon';
import { useTheme } from '../theme/ThemeContext';
import { useIconTheme } from '../hooks/useIconTheme';

export default function HomeButton({ forceDark }: { forceDark?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const homeIcon = useAppIcon('home');
  const { colors } = useTheme();
  const { theme: iconTheme } = useIconTheme();
  const isChrome = iconTheme !== 'anthropomorphic';
  const isDark = forceDark || colors.mode === 'dark';

  return (
    <TouchableOpacity
      style={styles.touchTarget}
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
      <View
        style={[
          isChrome ? styles.chromeCircle : styles.toonContainer,
          isChrome && {
            backgroundColor: isDark
              ? 'rgba(30,30,40,0.8)'
              : 'rgba(0,0,0,0.15)',
          },
        ]}
      >
        <Image
          source={homeIcon}
          style={isChrome ? styles.chromeIcon : styles.toonIcon}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeIcon: {
    width: 22,
    height: 22,
  },
  toonIcon: {
    width: 40,
    height: 40,
  },
});
