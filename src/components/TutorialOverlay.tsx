import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import TUTORIAL_CLIPS from '../data/tutorialClips';
import type { PlayerWithEvents } from '../utils/audioCompat';
import type { TutorialTip } from '../data/tutorialTips';

interface TutorialOverlayProps {
  tips: TutorialTip[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  sectionColor: string;
}

export default function TutorialOverlay({
  tips,
  currentIndex,
  onNext,
  onPrev,
  onDismiss,
  sectionColor,
}: TutorialOverlayProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      maxWidth: 320,
      width: '85%',
      borderWidth: 1,
      borderColor: sectionColor + '40',
      borderLeftWidth: 3,
      borderLeftColor: sectionColor,
      elevation: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    title: {
      fontFamily: FONTS.bold,
      fontSize: 18,
      color: colors.textPrimary,
    },
    body: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 22,
    },
    dotRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    dotActive: {
      width: 24,
      backgroundColor: sectionColor,
    },
    dotInactive: {
      width: 8,
      backgroundColor: colors.border,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    navSpacer: {
      minWidth: 48,
    },
    navButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    backText: {
      fontFamily: FONTS.semiBold,
      fontSize: 15,
      color: colors.textTertiary,
    },
    primaryText: {
      fontFamily: FONTS.semiBold,
      fontSize: 15,
      color: sectionColor,
    },
  }), [colors, sectionColor]);

  const playerRef = useRef<PlayerWithEvents | null>(null);

  const stopClip = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch { /* */ }
      try { playerRef.current.remove(); } catch { /* */ }
      playerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    stopClip();

    const idx = Math.min(currentIndex, tips.length - 1);
    const clipKey = tips[idx]?.clipKey;
    if (!clipKey) return;

    (async () => {
      try {
        const source = TUTORIAL_CLIPS[clipKey];
        if (source == null) return;
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();
        if (cancelled) return;
        const uri = asset.localUri;
        if (!uri) return;
        const player = createAudioPlayer({ uri }) as PlayerWithEvents;
        playerRef.current = player;
        player.volume = 1.0;
        if (cancelled) {
          try { player.remove(); } catch { /* */ }
          playerRef.current = null;
          return;
        }
        player.play();
      } catch (e) {
        console.warn('[TutorialOverlay] playClip error:', e);
      }
    })();

    return () => {
      cancelled = true;
      stopClip();
    };
  }, [currentIndex, tips, stopClip]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        stopClip();
      }
    });
    return () => sub.remove();
  }, [stopClip]);

  if (tips.length === 0) return null;

  const safeIndex = Math.min(currentIndex, tips.length - 1);
  const tip = tips[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex >= tips.length - 1;

  const handleNext = () => {
    stopClip();
    hapticLight();
    onNext();
  };

  const handlePrev = () => {
    stopClip();
    hapticLight();
    onPrev();
  };

  const handleGotIt = () => {
    hapticLight();
    stopClip();
    onDismiss();
  };

  const handleBackdropPress = () => {
    stopClip();
    onDismiss();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
        importantForAccessibility="no-hide-descendants"
      />
      <View
        style={styles.card}
        accessibilityViewIsModal={true}
      >
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.body}>{tip.body}</Text>

        {tips.length > 1 && (
          <View style={styles.dotRow} importantForAccessibility="no">
            {tips.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === safeIndex ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        )}

        <View style={styles.navRow}>
          {isFirst ? (
            <View style={styles.navSpacer} />
          ) : (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrev}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Previous tip"
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          {isLast ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleGotIt}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Dismiss tutorial"
            >
              <Text style={styles.primaryText}>Got it</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNext}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Next tip"
            >
              <Text style={styles.primaryText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
