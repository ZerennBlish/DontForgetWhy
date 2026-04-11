import React, { useCallback } from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import APP_ICONS from '../data/appIconAssets';

interface GameNavButtonsProps {
  /**
   * Custom back handler. When set, taps on the back button call this
   * function instead of the default navigation behavior. Used by active
   * gameplay screens to bounce the user back to the in-game menu phase
   * (e.g. Sudoku/Trivia/MemoryMatch handleBackFromGame). Leave undefined
   * on menu/result screens so the button just pops the stack.
   */
  onBack?: () => void;
  /**
   * Vertical offset from the top of the screen. Defaults to 12, but
   * callers should pass `insets.top + 10` to clear the device safe area.
   */
  topOffset?: number;
}

/**
 * Character-style back + home button pair for game screens. Replaces
 * the productivity-side BackButton/HomeButton chrome with the
 * full-color game icon set so the games section reads as its own world.
 *
 * Renders as an absolutely-positioned row in the top-left corner. Each
 * game screen previously had two separately-positioned wrapper Views
 * for BackButton and HomeButton; replace both with one of these.
 */
export function GameNavButtons({ onBack, topOffset = 12 }: GameNavButtonsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Cold-start / deep-link entry — no parent screen to pop to.
      navigation.navigate('Home');
    }
  }, [onBack, navigation]);

  const handleHome = useCallback(() => {
    // popToTop fires beforeRemove so games can save state on the way out.
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
        style={styles.button}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image source={APP_ICONS.gameBack} style={styles.icon} resizeMode="contain" accessible={false} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHome}
        style={styles.button}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go to home screen"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image source={APP_ICONS.gameHome} style={styles.icon} resizeMode="contain" accessible={false} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  button: {
    padding: 4,
  },
  icon: {
    width: 40,
    height: 40,
  },
});
