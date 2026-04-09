import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

export default function SwipeableRow({ children, onDelete, enabled = true }: SwipeableRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
      });
      return (
        <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
          <View style={[styles.deleteBox, styles.deleteBoxRight, { backgroundColor: colors.red }]}>
            <Text style={styles.deleteText}>Delete</Text>
          </View>
        </Animated.View>
      );
    },
    [colors.red],
  );

  const renderLeftActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-80, 0],
      });
      return (
        <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
          <View style={[styles.deleteBox, styles.deleteBoxLeft, { backgroundColor: colors.red }]}>
            <Text style={styles.deleteText}>Delete</Text>
          </View>
        </Animated.View>
      );
    },
    [colors.red],
  );

  const handleSwipeOpen = useCallback(
    () => {
      onDelete();
      swipeableRef.current?.close();
    },
    [onDelete],
  );

  if (!enabled) return <>{children}</>;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      rightThreshold={60}
      leftThreshold={60}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBox: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBoxRight: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteBoxLeft: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
