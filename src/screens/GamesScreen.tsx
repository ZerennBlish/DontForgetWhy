import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Image } from 'react-native';
import { kvGet } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameNavButtons } from '../components/GameNavButtons';
import TutorialOverlay from '../components/TutorialOverlay';
import ProGate from '../components/ProGate';
import { useTutorial } from '../hooks/useTutorial';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { ChevronRightIcon } from '../components/Icons';
import {
  canPlayGame,
  incrementTrial,
  getTrialRemaining,
  TRIAL_LIMIT,
  type TrialGame,
} from '../services/gameTrialStorage';
import { isProUser } from '../services/proStatus';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Games'>;

const GATED_GAMES: TrialGame[] = ['chess', 'checkers', 'trivia', 'sudoku', 'memoryMatch'];

export default function GamesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [riddleStreak, setRiddleStreak] = useState(0);
  const tutorial = useTutorial('games');

  const [proGateVisible, setProGateVisible] = useState(false);
  const [gateGame, setGateGame] = useState<TrialGame | undefined>(undefined);
  const [isPro, setIsPro] = useState(() => isProUser());
  const [trialCounts, setTrialCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    GATED_GAMES.forEach((g) => { counts[g] = getTrialRemaining(g); });
    return counts;
  });

  useFocusEffect(
    useCallback(() => {
      try {
        const data = kvGet('dailyRiddleStats');
        if (data) {
          const stats = JSON.parse(data);
          setRiddleStreak(stats.streak || 0);
        } else {
          setRiddleStreak(0);
        }
      } catch {
        setRiddleStreak(0);
      }
      setIsPro(isProUser());
      const counts: Record<string, number> = {};
      GATED_GAMES.forEach((g) => { counts[g] = getTrialRemaining(g); });
      setTrialCounts(counts);
    }, []),
  );

  const handleGamePress = useCallback(
    (screen: keyof RootStackParamList, game?: TrialGame) => {
      hapticLight();
      playGameSound('tap');
      if (game && !canPlayGame(game)) {
        setGateGame(game);
        setProGateVisible(true);
        return;
      }
      if (game && !isPro) {
        incrementTrial(game);
        setTrialCounts((prev) => ({ ...prev, [game]: getTrialRemaining(game) }));
      }
      navigation.navigate(screen as any);
    },
    [navigation, isPro],
  );

  const handleGateClose = useCallback(() => {
    setProGateVisible(false);
    setIsPro(isProUser());
    const counts: Record<string, number> = {};
    GATED_GAMES.forEach((g) => { counts[g] = getTrialRemaining(g); });
    setTrialCounts(counts);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        content: {
          paddingBottom: 60 + insets.bottom,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
        },
        title: {
          fontSize: 28,
          color: colors.overlayText,
          fontFamily: FONTS.gameHeader,
        },
        subtitle: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.overlaySecondary,
          marginTop: 6,
          fontStyle: 'italic',
        },
        gameCard: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.card + 'F0',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.sectionGames,
          borderLeftWidth: 3,
          flexDirection: 'row',
          elevation: 2,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          alignItems: 'center',
          gap: 16,
        },
        gameInfo: {
          flex: 1,
        },
        gameName: {
          fontSize: 18,
          color: colors.textPrimary,
          textAlign: 'center',
          fontFamily: FONTS.gameHeader,
        },
        gameDesc: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 4,
          lineHeight: 20,
          textAlign: 'center',
        },
        streakText: {
          fontSize: 12,
          color: colors.orange,
          fontFamily: FONTS.bold,
        },
        trialBadge: {
          marginTop: 4,
          alignItems: 'center',
        },
        trialTextPro: {
          fontSize: 11,
          fontFamily: FONTS.bold,
          color: colors.accent,
        },
        trialTextRemaining: {
          fontSize: 11,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
        },
        trialTextLocked: {
          fontSize: 11,
          fontFamily: FONTS.bold,
          color: colors.red,
        },
      }),
    [colors, insets.bottom],
  );

  const renderTrialIndicator = (game: TrialGame) => {
    if (isPro) {
      return (
        <View style={styles.trialBadge}>
          <Text style={styles.trialTextPro}>PRO</Text>
        </View>
      );
    }
    const remaining = trialCounts[game] ?? TRIAL_LIMIT;
    if (remaining === 0) {
      return (
        <View style={styles.trialBadge}>
          <Text style={styles.trialTextLocked}>Pro required</Text>
        </View>
      );
    }
    return (
      <View style={styles.trialBadge}>
        <Text style={styles.trialTextRemaining}>
          {remaining} free round{remaining === 1 ? '' : 's'} left
        </Text>
      </View>
    );
  };

  return (
    <ImageBackground source={require('../../assets/brain.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <GameNavButtons topOffset={insets.top + 10} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../../assets/icons/icon-controller.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Brain Games</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 20 }]}>Exercise that forgetful brain of yours</Text>

      {/* Daily Riddle */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('DailyRiddle')}
        activeOpacity={0.7}
        accessibilityLabel="Daily Riddle"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/icons/icon-lightbulb.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Daily Riddle</Text>
          <Text style={styles.gameDesc}>
            A new brain teaser every day. Can you keep your streak?
          </Text>
          {riddleStreak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'center' }}>
              <Image source={require('../../assets/icons/icon-fire.webp')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.streakText}>{riddleStreak} day streak</Text>
            </View>
          )}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Chess */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('Chess', 'chess')}
        activeOpacity={0.7}
        accessibilityLabel="Play Chess"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/icons/icon-chess.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Chess</Text>
          <Text style={styles.gameDesc}>vs CPU • 5 difficulties</Text>
          {renderTrialIndicator('chess')}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Checkers */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('Checkers', 'checkers')}
        activeOpacity={0.7}
        accessibilityLabel="Play Checkers"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/icons/icon-checkers.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Checkers</Text>
          <Text style={styles.gameDesc}>vs CPU • 5 difficulties</Text>
          {renderTrialIndicator('checkers')}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Trivia */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('Trivia', 'trivia')}
        activeOpacity={0.7}
        accessibilityLabel="Play Trivia"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/trivia/trivia-general.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Trivia</Text>
          <Text style={styles.gameDesc}>
            10 categories. 370+ questions offline.
          </Text>
          {renderTrialIndicator('trivia')}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Sudoku */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('Sudoku', 'sudoku')}
        activeOpacity={0.7}
        accessibilityLabel="Play Sudoku"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/icons/icon-sudoku.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Sudoku</Text>
          <Text style={styles.gameDesc}>Classic number puzzle. No forgetting allowed.</Text>
          {renderTrialIndicator('sudoku')}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Memory Guy Match */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('MemoryMatch', 'memoryMatch')}
        activeOpacity={0.7}
        accessibilityLabel="Play Memory Match"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/memory-match/card-back.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Memory Guy Match</Text>
          <Text style={styles.gameDesc}>Flip cards and find matching pairs</Text>
          {renderTrialIndicator('memoryMatch')}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>

      {/* Trophies */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress('MemoryScore')}
        activeOpacity={0.7}
        accessibilityLabel="Memory Score"
        accessibilityRole="button"
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <Image source={require('../../assets/icons/icon-chart.webp')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Trophies</Text>
          <Text style={styles.gameDesc}>Track your brain training progress</Text>
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color={colors.sectionGames} size={16} />
        </View>
      </TouchableOpacity>
    </ScrollView>

    {tutorial.showTutorial && (
      <TutorialOverlay
        tips={tutorial.tips}
        currentIndex={tutorial.currentIndex}
        onNext={tutorial.nextTip}
        onPrev={tutorial.prevTip}
        onDismiss={tutorial.dismiss}
        sectionColor={colors.sectionGames}
      />
    )}
    {proGateVisible && <ProGate visible={proGateVisible} onClose={handleGateClose} game={gateGame} />}
    </View>
    </ImageBackground>
  );
}
