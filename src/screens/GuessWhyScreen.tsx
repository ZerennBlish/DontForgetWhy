import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatTime } from '../utils/time';
import guessWhyIcons from '../data/guessWhyIcons';
import {
  getRandomWinMessage,
  getRandomLoseMessage,
  getRandomSkipMessage,
} from '../data/guessWhyMessages';
import { recordWin, recordLoss, recordSkip } from '../services/guessWhyStats';
import { addForgetEntry } from '../services/forgetLog';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GuessWhy'>;

const categoryEmoji: Record<string, string> = {
  meds: '\u{1F48A}',
  appointment: '\u{1F4C5}',
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
  const { alarm } = route.params;
  const hasIcon = Boolean(alarm.icon);
  const [mode, setMode] = useState<'icons' | 'type'>(hasIcon ? 'icons' : 'type');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [typedGuess, setTypedGuess] = useState('');
  const [result, setResult] = useState<ResultState>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const canPlay = hasIcon || alarm.note.length >= 3;

  useEffect(() => {
    if (!canPlay) {
      navigation.replace('AlarmFire', { alarm });
    }
  }, [canPlay, alarm, navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      fontSize: 56,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -2,
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: '600',
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
      fontSize: 14,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    modeBtnTextActive: {
      color: colors.textPrimary,
    },
    prompt: {
      fontSize: 16,
      fontWeight: '600',
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
      fontSize: 16,
      fontWeight: '700',
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
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: 24,
    },
    overlayBtn: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 40,
    },
    overlayBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    bottom: {
      alignItems: 'center',
      marginTop: 16,
      gap: 10,
    },
    attemptsText: {
      fontSize: 14,
      fontWeight: '600',
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
    skipBtnText: {
      fontSize: 15,
      fontWeight: '600',
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

    // For icon-only alarms (no note), check if typed text matches the icon id
    if (!alarm.note && alarm.icon) {
      const matchedIcon = guessWhyIcons.find((i) => i.emoji === alarm.icon);
      if (matchedIcon && matchedIcon.id.toLowerCase().includes(guessLower)) return true;
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

  const logForget = (resultType: 'loss' | 'skip') => {
    addForgetEntry({
      alarmNote: alarm.note,
      alarmNickname: alarm.nickname,
      alarmIcon: alarm.icon,
      alarmCategory: alarm.category,
      result: resultType,
    });
  };

  const handleIconGuess = (iconId: string, iconEmoji: string) => {
    if (result) return;

    if (checkIconGuess(iconId, iconEmoji)) {
      recordWin();
      setResult({ type: 'win', message: getRandomWinMessage() });
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        recordLoss();
        logForget('loss');
        setResult({ type: 'lose', message: getRandomLoseMessage() });
      } else {
        triggerShake();
      }
    }
  };

  const handleTypeGuess = () => {
    if (result) return;
    const trimmed = typedGuess.trim();
    if (trimmed.length < 3) return;

    if (checkTypeGuess(trimmed)) {
      recordWin();
      setResult({ type: 'win', message: getRandomWinMessage() });
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setTypedGuess('');
      if (remaining <= 0) {
        recordLoss();
        logForget('loss');
        setResult({ type: 'lose', message: getRandomLoseMessage() });
      } else {
        triggerShake();
      }
    }
  };

  const handleSkip = () => {
    if (result) return;
    recordSkip();
    logForget('skip');
    setResult({ type: 'skip', message: getRandomSkipMessage() });
  };

  const handleContinue = () => {
    navigation.replace('AlarmFire', { alarm });
  };

  const overlayColor =
    result?.type === 'win'
      ? 'rgba(34, 139, 34, 0.85)'
      : result?.type === 'lose'
        ? 'rgba(180, 40, 40, 0.85)'
        : 'rgba(180, 150, 30, 0.85)';

  const continueLabel =
    result?.type === 'win'
      ? 'Nice!'
      : result?.type === 'lose'
        ? 'Show Me'
        : 'Yeah Yeah...';

  const displayEmoji = alarm.icon || categoryEmoji[alarm.category] || '\u{1F514}';

  return (
    <View style={styles.container}>
      {/* Top section */}
      <View style={styles.top}>
        <Text style={styles.emoji}>{displayEmoji}</Text>
        <Text style={styles.time}>{formatTime(alarm.time)}</Text>
        <Text style={styles.categoryLabel}>{alarm.category.toUpperCase()}</Text>
      </View>

      {/* Game area */}
      <Animated.View style={[styles.gameArea, { transform: [{ translateX: shakeAnim }] }]}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'icons' && styles.modeBtnActive, !hasIcon && styles.modeBtnDisabled]}
            onPress={() => hasIcon && setMode('icons')}
            activeOpacity={hasIcon ? 0.7 : 1}
          >
            <Text style={[styles.modeBtnText, mode === 'icons' && styles.modeBtnTextActive]}>
              Icons
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'type' && styles.modeBtnActive]}
            onPress={() => setMode('type')}
            activeOpacity={0.7}
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
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                typedGuess.trim().length < 3 && styles.submitBtnDisabled,
              ]}
              onPress={handleTypeGuess}
              activeOpacity={0.7}
              disabled={typedGuess.trim().length < 3}
            >
              <Text style={styles.submitBtnText}>Guess</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result overlay */}
        {result && (
          <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
            <Text style={styles.overlayMessage}>{result.message}</Text>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.overlayBtnText}>{continueLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <Text style={styles.attemptsText}>
          {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
        </Text>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
