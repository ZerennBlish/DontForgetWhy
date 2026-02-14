import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { hapticLight } from '../utils/haptics';

interface SwipeableRowProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeRightAnimateOut?: () => void;
  leftColor?: string;
  rightColor?: string;
  leftIcon?: string;
  rightIcon?: string;
  leftIconColor?: string;
  rightIconColor?: string;
  enabled?: boolean;
  borderRadius?: number;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export default function SwipeableRow({
  onSwipeLeft,
  onSwipeRight,
  onSwipeRightAnimateOut,
  leftColor = '#1A2E1A',
  rightColor = '#2E1A1A',
  leftIcon = '\u2705',
  rightIcon = '\u{1F5D1}',
  leftIconColor = '#B0B0CC',
  rightIconColor = '#B0B0CC',
  enabled = true,
  borderRadius = 16,
  children,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;
  const crossedRef = useRef(false);

  const hasRightAction = !!(onSwipeRight || onSwipeRightAnimateOut);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!enabled) return false;
          const { dx, dy } = gestureState;
          // Only respond to horizontal drags
          if (Math.abs(dx) < 10) return false;
          if (Math.abs(dy) > Math.abs(dx)) return false;
          // Only if we have a handler for that direction
          if (dx > 0 && !hasRightAction) return false;
          if (dx < 0 && !onSwipeLeft) return false;
          return true;
        },
        onPanResponderGrant: () => {
          crossedRef.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          const { dx } = gestureState;
          // Clamp direction: only allow if handler exists
          if (dx > 0 && !hasRightAction) return;
          if (dx < 0 && !onSwipeLeft) return;
          translateX.setValue(dx);

          // Haptic on crossing threshold
          if (!crossedRef.current && Math.abs(dx) >= THRESHOLD) {
            crossedRef.current = true;
            try { hapticLight(); } catch {}
          }
          if (crossedRef.current && Math.abs(dx) < THRESHOLD) {
            crossedRef.current = false;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState;

          if (dx >= THRESHOLD && hasRightAction) {
            // Animate out then trigger
            Animated.timing(translateX, {
              toValue: 300,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              if (onSwipeRightAnimateOut) {
                // Collapse card height and fade out, then call handler
                Animated.timing(heightAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: false,
                }).start(() => {
                  onSwipeRightAnimateOut();
                  // Don't reset animation values — the state update will
                  // cause React to re-render/unmount this component naturally
                });
              } else if (onSwipeRight) {
                onSwipeRight();
                translateX.setValue(0);
              }
            });
          } else if (dx <= -THRESHOLD && onSwipeLeft) {
            Animated.timing(translateX, {
              toValue: -300,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onSwipeLeft();
              translateX.setValue(0);
            });
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [enabled, onSwipeLeft, onSwipeRight, onSwipeRightAnimateOut, hasRightAction, translateX, heightAnim],
  );

  const iconOpacity = translateX.interpolate({
    inputRange: [-THRESHOLD, -40, 0, 40, THRESHOLD],
    outputRange: [1, 0.5, 0, 0.5, 1],
    extrapolate: 'clamp',
  });

  // Background is fully invisible when card is at rest (translateX = 0)
  const bgOpacity = translateX.interpolate({
    inputRange: [-5, 0, 5],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  });

  // Only apply collapse animation styles when animate-out is available
  const collapseStyle = onSwipeRightAnimateOut
    ? {
        opacity: heightAnim,
        maxHeight: heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 500],
        }),
        marginBottom: heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12],
        }),
      }
    : undefined;

  return (
    <Animated.View
      style={[
        styles.container,
        { borderRadius },
        collapseStyle,
      ]}
    >
      {/* Background revealed on swipe — invisible at rest */}
      <Animated.View style={[styles.backgroundRow, { borderRadius, opacity: bgOpacity }]}>
        {hasRightAction && (
          <View style={[styles.backgroundAction, styles.leftAction, { backgroundColor: leftColor }]}>
            <Animated.Text style={[styles.actionIcon, { opacity: iconOpacity, color: leftIconColor }]}>
              {leftIcon}
            </Animated.Text>
          </View>
        )}
        {onSwipeLeft && (
          <View style={[styles.backgroundAction, styles.rightAction, { backgroundColor: rightColor }]}>
            <Animated.Text style={[styles.actionIcon, { opacity: iconOpacity, color: rightIconColor }]}>
              {rightIcon}
            </Animated.Text>
          </View>
        )}
      </Animated.View>

      {/* Foreground card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backgroundAction: {
    width: '50%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  leftAction: {
    alignItems: 'flex-start',
  },
  rightAction: {
    alignItems: 'flex-end',
  },
  actionIcon: {
    fontSize: 24,
  },
});
