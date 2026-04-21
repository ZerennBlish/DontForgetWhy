import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useAppIcon } from '../hooks/useAppIcon';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import type { TrialGame } from '../services/gameTrialStorage';

const GAME_HEADERS: readonly string[] = [
  'Your free rounds are up. Impressed? We thought so.',
  "3 rounds wasn't enough, huh? We're flattered.",
  "Look who wants more. Can't say we blame you.",
];

const GENERIC_HEADERS: readonly string[] = [
  "You've got taste. This one's for Pro members.",
  'Upgrade your experience. You know you want to.',
  'The good stuff is right behind this button.',
];

const BENEFITS: readonly string[] = [
  'Unlimited Brain Games',
  'Premium Themes (Vivid, Sunset, Ruby)',
  'Google Calendar Sync',
  'Multiplayer Chess (coming soon)',
];

interface ProGateProps {
  visible: boolean;
  onClose: () => void;
  game?: TrialGame;
  isPro: boolean;
  loading: boolean;
  error: string | null;
  productPrice: string | null;
  onPurchase: () => Promise<void>;
  onRestore: () => Promise<void>;
}

export default function ProGate({
  visible,
  onClose,
  game,
  isPro,
  loading,
  error,
  productPrice,
  onPurchase,
  onRestore,
}: ProGateProps) {
  const { colors } = useTheme();
  const closeXIcon = useAppIcon('closeX');

  const [headerText] = useState(() => {
    const pool = game ? GAME_HEADERS : GENERIC_HEADERS;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const accentColor = game ? colors.sectionGames : colors.accent;

  // Auto-clear error after 3 seconds.
  const [displayError, setDisplayError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setDisplayError(error);
    if (error) {
      errorTimerRef.current = setTimeout(() => {
        setDisplayError(null);
      }, 3000);
    }
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [error]);

  // Play win sound + auto-close once the purchase lands.
  const wasProRef = useRef(isPro);
  useEffect(() => {
    if (!wasProRef.current && isPro) {
      if (game) playGameSound('gameWin');
      onClose();
    }
    wasProRef.current = isPro;
  }, [isPro, onClose, game]);

  const handlePurchase = useCallback(() => {
    hapticLight();
    onPurchase();
  }, [onPurchase]);

  const handleRestore = useCallback(() => {
    hapticLight();
    onRestore();
  }, [onRestore]);

  const handleClose = useCallback(() => {
    hapticLight();
    onClose();
  }, [onClose]);

  const priceLabel = productPrice ?? '$1.99';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.modalOverlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        card: {
          width: '100%',
          maxWidth: 440,
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
        },
        closeBtn: {
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2,
        },
        header: {
          fontSize: 19,
          lineHeight: 26,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 20,
          paddingHorizontal: 20,
        },
        benefitsWrap: {
          marginBottom: 24,
        },
        benefitRow: {
          fontSize: 15,
          lineHeight: 24,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: 6,
        },
        purchaseBtn: {
          backgroundColor: accentColor,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        },
        purchaseBtnDisabled: {
          opacity: 0.6,
        },
        purchaseText: {
          fontSize: 16,
          fontFamily: FONTS.bold,
          color: '#FFFFFF',
        },
        restoreBtn: {
          marginTop: 14,
          paddingVertical: 8,
          alignItems: 'center',
        },
        restoreText: {
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: accentColor,
        },
        errorText: {
          marginTop: 12,
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.red,
          textAlign: 'center',
        },
        loadingOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.modalOverlay,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors, accentColor],
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} accessibilityViewIsModal={true}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close paywall"
              >
                <Image
                  source={closeXIcon}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <Text style={styles.header}>{headerText}</Text>

              <View style={styles.benefitsWrap}>
                {BENEFITS.map((benefit) => (
                  <Text key={benefit} style={styles.benefitRow}>
                    {benefit}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.purchaseBtn, loading && styles.purchaseBtnDisabled]}
                onPress={handlePurchase}
                disabled={loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Unlock Pro for ${priceLabel}`}
              >
                <Text style={styles.purchaseText}>{`Unlock Pro — ${priceLabel}`}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={handleRestore}
                disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Restore previous purchase"
              >
                <Text style={styles.restoreText}>Already purchased? Restore</Text>
              </TouchableOpacity>

              {displayError ? (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {displayError}
                </Text>
              ) : null}

              {loading ? (
                <View style={styles.loadingOverlay} pointerEvents="auto">
                  <ActivityIndicator size="large" color={accentColor} />
                </View>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
