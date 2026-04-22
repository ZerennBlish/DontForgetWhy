import React, { useCallback } from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAppIcon } from '../hooks/useAppIcon';
import { useIconTheme } from '../hooks/useIconTheme';

interface GameNavButtonsProps {
  onBack?: () => void;
  topOffset?: number;
}

export function GameNavButtons({ onBack, topOffset = 12 }: GameNavButtonsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const backArrowIcon = useAppIcon('backArrow');
  const homeIcon = useAppIcon('home');
  const { theme: iconTheme } = useIconTheme();
  const isChrome = iconTheme !== 'anthropomorphic';

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [onBack, navigation]);

  const handleHome = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={handleBack}
        style={styles.touchTarget}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={isChrome ? styles.chromeCircle : styles.toonContainer}>
          <Image
            source={backArrowIcon}
            style={isChrome ? styles.chromeIcon : styles.toonIcon}
            resizeMode="contain"
            accessible={false}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHome}
        style={styles.touchTarget}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go to home screen"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={isChrome ? styles.chromeCircle : styles.toonContainer}>
          <Image
            source={homeIcon}
            style={isChrome ? styles.chromeIcon : styles.toonIcon}
            resizeMode="contain"
            accessible={false}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    zIndex: 10,
  },
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
    backgroundColor: 'rgba(30,30,40,0.8)',
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
