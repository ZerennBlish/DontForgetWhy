import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ImageBackground,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatTime } from '../utils/time';
import { loadSettings } from '../services/settings';
import guessWhyIcons from '../data/guessWhyIcons';
import {
  getRandomWinMessage,
  getRandomLoseMessage,
  getRandomSkipMessage,
} from '../data/guessWhyMessages';
import { recordWin, recordLoss, recordSkip } from '../services/guessWhyStats';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { GameNavButtons } from '../components/GameNavButtons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { playRandomClip, stopVoice } from '../services/voicePlayback';
import type { RootStackParamList } from '../navigation/types';

const GUESS_RIGHT = require('../../assets/icons/guess-right.webp');
const GUESS_WRONG = require('../../assets/icons/guess-wrong.webp');

type Props = NativeStackScreenProps<RootStackParamList, 'GuessWhy'>;

const categoryEmoji: Record<string, string> = {
  meds: '\u{1F48A}',
  appointment: '\u{1F4C5}',
  event: '\u{1F389}',
  task: '\u2705',
  'self-care': '\u{1F9D8}',
  general: '\u{1F514}',
};

type ResultState =
  | { type: 'win'; message: string }
  | { type: 'lose'; message: string }
  | { type: 'skip'; message: string }
  | null;

export default function GuessWhyScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alarm, notificationId } = route.params;
  const hasIcon = Boolean(alarm.icon) && guessWhyIcons.some((i) => i.emoji === alarm.icon);
  const [mode, setMode] = useState<'icons' | 'type'>(hasIcon ? 'icons' : 'type');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [typedGuess, setTypedGuess] = useState('');
  const [result, setResult] = useState<ResultState>(null);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const resolvedRef = useRef(false);

  const canPlay = hasIcon || alarm.note.length >= 3;

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
    });
  }, []);

  // Sound + vibration are already stopped before we get here.
  // AlarmFireScreen's handleGuessWhy cancels everything before navigating.

  useEffect(() => {
    playRandomClip('guess_before');
    return () => {
      stopVoice();
    };
  }, []);

  useEffect(() => {
    if (!canPlay) {
      // Defensive fallback: if GuessWhy can't play, go to AlarmFire
      navigation.replace('AlarmFire', { alarm, postGuessWhy: true, fromNotification: false, notificationId });
    }
  }, [canPlay, alarm, navigation, notificationId]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingTop: 60,
      paddingBottom: 60 + insets.bottom,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
    },
    top: {
      alignItems: 'center',
      marginTop: 20,
    },
    emoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    time: {
      fontSize: 54,
      fontFamily: FONTS.extraBold,
      color: '#FFFFFF',
      letterSpacing: -2,
    },
    categoryLabel: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.accent,
      letterSpacing: 2,
      marginTop: 8,
    },
    gameArea: {
      flex: 1,
      marginTop: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      overflow: 'hidden',
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 3,
      marginBottom: 12,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    modeBtnActive: {
      backgroundColor: colors.accent,
    },
    modeBtnDisabled: {
      opacity: 0.35,
    },
    modeBtnText: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    modeBtnTextActive: {
      color: colors.textPrimary,
    },
    prompt: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    iconScroll: {
      flex: 1,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingBottom: 8,
    },
    iconCell: {
      width: '23%',
      aspectRatio: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    iconEmoji: {
      fontSize: 28,
    },
    iconLabel: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 4,
    },
    typeArea: {
      flex: 1,
      justifyContent: 'center',
      gap: 12,
    },
    textInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    overlayMessage: {
      fontSize: 17,
      fontFamily: FONTS.semiBold,
      color: colors.overlayText,
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: 24,
    },
    overlayBtn: {
      backgroundColor: colors.overlayButton,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 40,
    },
    overlayBtnText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.overlayText,
    },
    bottom: {
      alignItems: 'center',
      marginTop: 16,
      gap: 10,
    },
    attemptsText: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    skipBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    skipBtnDisabled: {
      opacity: 0.4,
    },
    skipBtnText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textSecondary,
    },
  }), [colors, insets.bottom]);

  if (!canPlay) return null;

  const checkIconGuess = (_iconId: string, iconEmoji: string): boolean => {
    if (!alarm.icon) return false;
    return alarm.icon === iconEmoji;
  };

  const checkTypeGuess = (guess: string): boolean => {
    const guessLower = guess.toLowerCase().trim();

    // Check if typed text appears in the alarm note
    if (alarm.note && alarm.note.toLowerCase().includes(guessLower)) return true;

    // For icon-only alarms (no note), check if typed text matches the icon id exactly
    if (!alarm.note && alarm.icon) {
      const matchedIcon = guessWhyIcons.find((i) => i.emoji === alarm.icon);
      if (matchedIcon && matchedIcon.id.toLowerCase() === guessLower) return true;
    }

    return false;
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleIconGuess = async (iconId: string, iconEmoji: string) => {
    if (result || resolvedRef.current) return;
    hapticMedium();

    if (checkIconGuess(iconId, iconEmoji)) {
      resolvedRef.current = true;
      setResult({ type: 'win', message: getRandomWinMessage() });
      playRandomClip('guess_correct');
      try { await recordWin(); } catch {}
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        resolvedRef.current = true;
        setResult({ type: 'lose', message: getRandomLoseMessage() });
        playRandomClip('guess_wrong');
        try { await recordLoss(); } catch {}
      } else {
        triggerShake();
      }
    }
  };

  const handleTypeGuess = async () => {
    if (result || resolvedRef.current) return;
    const trimmed = typedGuess.trim();
    if (trimmed.length < 3) return;
    hapticMedium();

    if (checkTypeGuess(trimmed)) {
      resolvedRef.current = true;
      setResult({ type: 'win', message: getRandomWinMessage() });
      playRandomClip('guess_correct');
      try { await recordWin(); } catch {}
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setTypedGuess('');
      if (remaining <= 0) {
        resolvedRef.current = true;
        setResult({ type: 'lose', message: getRandomLoseMessage() });
        playRandomClip('guess_wrong');
        try { await recordLoss(); } catch {}
      } else {
        triggerShake();
      }
    }
  };

  const handleSkip = async () => {
    if (result || resolvedRef.current) return;
    hapticLight();
    resolvedRef.current = true;
    setResult({ type: 'skip', message: getRandomSkipMessage() });
    playRandomClip('guess_wrong');
    try { await recordSkip(); } catch {}
  };

  const handleContinue = () => {
    hapticLight();
    stopVoice();
    // Navigate to AlarmFire with postGuessWhy — it will cancel notifications + vibration
    navigation.replace('AlarmFire', { alarm, postGuessWhy: true, fromNotification: false, notificationId });
  };

  const overlayColor =
    result?.type === 'win'
      ? colors.overlayWin
      : result?.type === 'lose'
        ? colors.overlayLose
        : colors.overlaySkip;

  const continueLabel =
    result?.type === 'win'
      ? 'Nice!'
      : result?.type === 'lose'
        ? 'Show Me'
        : 'Yeah Yeah...';

  const displayEmoji = alarm.icon || categoryEmoji[alarm.category] || '\u{1F514}';

  return (
    <ImageBackground source={require('../../assets/gameclock.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <View style={styles.container}>
      <GameNavButtons topOffset={insets.top + 10} />
      {/* Top section */}
      <View style={styles.top}>
        <Text style={styles.emoji}>{displayEmoji}</Text>
        <Text style={styles.time}>{formatTime(alarm.time, timeFormat)}</Text>
        <Text style={styles.categoryLabel}>{alarm.category.toUpperCase()}</Text>
      </View>

      {/* Game area */}
      <Animated.View style={[styles.gameArea, { transform: [{ translateX: shakeAnim }] }]}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'icons' && styles.modeBtnActive, !hasIcon && styles.modeBtnDisabled]}
            onPress={() => { if (hasIcon) { hapticLight(); setMode('icons'); } }}
            activeOpacity={hasIcon ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel="Icon mode"
            accessibilityState={{ selected: mode === 'icons' }}
          >
            <Text style={[styles.modeBtnText, mode === 'icons' && styles.modeBtnTextActive]}>
              Icons
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'type' && styles.modeBtnActive]}
            onPress={() => { hapticLight(); setMode('type'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Type answer mode"
            accessibilityState={{ selected: mode === 'type' }}
          >
            <Text style={[styles.modeBtnText, mode === 'type' && styles.modeBtnTextActive]}>
              Type It
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.prompt}>Why did you set this alarm?</Text>

        {mode === 'icons' ? (
          <ScrollView
            style={styles.iconScroll}
            contentContainerStyle={styles.iconGrid}
            showsVerticalScrollIndicator={false}
          >
            {guessWhyIcons.map((icon) => (
              <TouchableOpacity
                key={icon.id}
                style={styles.iconCell}
                onPress={() => handleIconGuess(icon.id, icon.emoji)}
                activeOpacity={0.6}
                disabled={resolvedRef.current}
              >
                <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                <Text style={styles.iconLabel}>{icon.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.typeArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your guess..."
              placeholderTextColor={colors.textTertiary}
              value={typedGuess}
              onChangeText={setTypedGuess}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleTypeGuess}
              editable={!resolvedRef.current}
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                typedGuess.trim().length < 3 && styles.submitBtnDisabled,
              ]}
              onPress={handleTypeGuess}
              activeOpacity={0.7}
              disabled={typedGuess.trim().length < 3 || resolvedRef.current}
              accessibilityRole="button"
              accessibilityLabel="Submit answer"
            >
              <Text style={styles.submitBtnText}>Guess</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result overlay */}
        {result && (
          <View style={[styles.overlay, { backgroundColor: overlayColor }]} accessibilityLiveRegion="assertive">
            <Image
              source={result.type === 'win' ? GUESS_RIGHT : GUESS_WRONG}
              style={{ width: 80, height: 80, marginBottom: 12 }}
              resizeMode="contain"
            />
            <Text style={styles.overlayMessage}>{result.message}</Text>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={handleContinue}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.overlayBtnText}>{continueLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <Text style={styles.attemptsText} accessibilityLiveRegion="polite">
          {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
        </Text>
        <TouchableOpacity
          style={[styles.skipBtn, resolvedRef.current && styles.skipBtnDisabled]}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={resolvedRef.current}
          accessibilityRole="button"
          accessibilityLabel="Skip question"
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
    </View>
    </ImageBackground>
  );
}
