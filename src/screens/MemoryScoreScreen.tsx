import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import { getRankFromScore } from '../data/memoryRanks';
import { RIDDLES } from '../data/riddles';
import { TRIVIA_CATEGORIES } from '../data/triviaQuestions';
import { getTriviaStats } from '../services/triviaStorage';
import {
  calculateCompositeScore,
  resetAllScores,
  type CompositeScore,
} from '../services/memoryScore';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticHeavy } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import type { TriviaStats, TriviaCategory } from '../types/trivia';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryScore'>;

// --- Data shapes matching each game's AsyncStorage format ---

interface MemoryMatchDiffBest {
  bestMoves: number;
  bestTime: number;
}
interface MemoryMatchScores {
  easy?: MemoryMatchDiffBest;
  medium?: MemoryMatchDiffBest;
  hard?: MemoryMatchDiffBest;
}

interface SudokuDiffBest {
  bestTime: number;
  bestMistakes: number;
}
interface SudokuScores {
  easy?: SudokuDiffBest;
  medium?: SudokuDiffBest;
  hard?: SudokuDiffBest;
}

interface DailyRiddleStats {
  lastPlayedDate: string;
  streak: number;
  longestStreak: number;
  totalPlayed: number;
  totalCorrect: number;
  seenRiddleIds: number[];
}

// Par values matching MemoryMatchScreen
const MM_PAR: Record<string, number> = { easy: 8, medium: 12, hard: 16 };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function mmStars(moves: number, diff: string): number {
  const par = MM_PAR[diff] || 12;
  return moves < par ? 3 : moves === par ? 2 : 1;
}

function sudokuStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 3) return 2;
  return 1;
}

const defaultTriviaStats: TriviaStats = {
  totalRoundsPlayed: 0,
  totalQuestionsAnswered: 0,
  totalCorrect: 0,
  bestRoundScore: 0,
  bestRoundCategory: null,
  longestStreak: 0,
  categoryStats: {
    general: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    science: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    history: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    music: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    movies_tv: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    geography: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    sports: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    technology: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
    food: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
  },
};

export default function MemoryScoreScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [guessWhyStats, setGuessWhyStats] = useState<GuessWhyStats>({
    wins: 0, losses: 0, skips: 0, streak: 0, bestStreak: 0,
  });
  const [mmScores, setMmScores] = useState<MemoryMatchScores>({});
  const [sudokuScores, setSudokuScores] = useState<SudokuScores>({});
  const [riddleStats, setRiddleStats] = useState<DailyRiddleStats>({
    lastPlayedDate: '', streak: 0, longestStreak: 0,
    totalPlayed: 0, totalCorrect: 0, seenRiddleIds: [],
  });
  const [triviaStats, setTriviaStats] = useState<TriviaStats>(defaultTriviaStats);
  const [compositeScore, setCompositeScore] = useState<CompositeScore>({
    total: 0,
    breakdown: { guessWhy: 0, memoryMatch: 0, sudoku: 0, dailyRiddle: 0, trivia: 0 },
  });

  const loadAllStats = useCallback(async () => {
    const score = await calculateCompositeScore();
    setCompositeScore(score);

    loadStats().then(setGuessWhyStats);
    getTriviaStats().then(setTriviaStats);

    AsyncStorage.getItem('memoryMatchScores').then((data) => {
      if (data) { try { setMmScores(JSON.parse(data)); } catch {} }
      else { setMmScores({}); }
    });
    AsyncStorage.getItem('sudokuBestScores').then((data) => {
      if (data) { try { setSudokuScores(JSON.parse(data)); } catch {} }
      else { setSudokuScores({}); }
    });
    AsyncStorage.getItem('dailyRiddleStats').then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setRiddleStats({
            lastPlayedDate: parsed.lastPlayedDate || '',
            streak: parsed.streak || 0,
            longestStreak: parsed.longestStreak ?? parsed.streak ?? 0,
            totalPlayed: parsed.totalPlayed || 0,
            totalCorrect: parsed.totalCorrect || 0,
            seenRiddleIds: parsed.seenRiddleIds || [],
          });
        } catch {}
      } else {
        setRiddleStats({
          lastPlayedDate: '', streak: 0, longestStreak: 0,
          totalPlayed: 0, totalCorrect: 0, seenRiddleIds: [],
        });
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllStats();
    }, [loadAllStats])
  );

  // Derived values
  const gwTotal = guessWhyStats.wins + guessWhyStats.losses + guessWhyStats.skips;
  const gwPercentage = gwTotal > 0 ? Math.round((guessWhyStats.wins / gwTotal) * 100) : 0;
  const rank = getRankFromScore(compositeScore.total);
  const { breakdown } = compositeScore;

  const riddleAccuracy = riddleStats.totalPlayed > 0
    ? Math.round((riddleStats.totalCorrect / riddleStats.totalPlayed) * 100)
    : 0;

  const triviaAccuracy = triviaStats.totalQuestionsAnswered > 0
    ? Math.round((triviaStats.totalCorrect / triviaStats.totalQuestionsAnswered) * 100)
    : 0;

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Scores?',
      'This will erase ALL game stats across every game. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            hapticHeavy();
            await resetAllScores();
            await loadAllStats();
          },
        },
      ],
    );
  };

  const styles = useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);

  const diffLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

  const bestCatLabel = triviaStats.bestRoundCategory
    ? TRIVIA_CATEGORIES.find((c) => c.id === triviaStats.bestRoundCategory)?.label || triviaStats.bestRoundCategory
    : null;

  // Categories that have been played
  const playedCategories = (Object.keys(triviaStats.categoryStats) as TriviaCategory[]).filter(
    (cat) => triviaStats.categoryStats[cat].roundsPlayed > 0
  );

  return (
    <ImageBackground source={require('../../assets/library.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{'\u{1F3C6}'} Brain Training Stats</Text>
      </View>

      {/* Overall Summary — composite rank */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEmoji}>{rank.emoji}</Text>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryRank}>{rank.title}</Text>
          <Text style={styles.summaryScore}>
            Score: {compositeScore.total} / 100
          </Text>
        </View>
      </View>

      {/* Score Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F4CA}'} Score Breakdown</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.statLabel}>{'\u{1F9E0}'} Guess Why</Text>
          <Text style={styles.statValue}>{breakdown.guessWhy} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.guessWhy / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.statLabel}>{'\u{1F9E9}'} Memory Match</Text>
          <Text style={styles.statValue}>{breakdown.memoryMatch} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.memoryMatch / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.statLabel}>{'\u{1F522}'} Sudoku</Text>
          <Text style={styles.statValue}>{breakdown.sudoku} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.sudoku / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.statLabel}>{'\u{1F4A1}'} Daily Riddle</Text>
          <Text style={styles.statValue}>{breakdown.dailyRiddle} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.dailyRiddle / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.statLabel}>{'\u{1F9E0}'} Trivia</Text>
          <Text style={styles.statValue}>{breakdown.trivia} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.trivia / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>
      </View>

      {/* Section: Guess Why */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F9E0}'} Guess Why</Text>

        <View style={styles.rankRow}>
          <Text style={styles.bigValue}>{gwTotal > 0 ? `${gwPercentage}%` : '--'}</Text>
          <Text style={styles.rankLabel}>
            {gwTotal === 0 ? 'No games yet' : 'Win Rate'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u2705'} Wins</Text>
          <Text style={styles.statValue}>{guessWhyStats.wins}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u274C'} Losses</Text>
          <Text style={styles.statValue}>{guessWhyStats.losses}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u23ED\uFE0F'} Skips</Text>
          <Text style={styles.statValue}>{guessWhyStats.skips}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F525}'} Current Streak</Text>
          <Text style={styles.statValue}>{guessWhyStats.streak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F3C6}'} Best Streak</Text>
          <Text style={styles.statValue}>{guessWhyStats.bestStreak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F3AE}'} Total Games</Text>
          <Text style={styles.statValue}>{gwTotal}</Text>
        </View>

        <TouchableOpacity
          style={styles.sectionBtn}
          onPress={() => navigation.navigate('ForgetLog')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionBtnText}>{'\u{1F4DC}'} What Did I Forget?</Text>
        </TouchableOpacity>
      </View>

      {/* Section: Memory Match */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F9E9}'} Memory Match</Text>

        {(['easy', 'medium', 'hard'] as const).map((diff) => {
          const best = mmScores[diff];
          return (
            <View key={diff}>
              <Text style={styles.diffLabel}>{diffLabels[diff]}</Text>
              {best ? (
                <>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Best Moves</Text>
                    <Text style={styles.statValue}>{best.bestMoves}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Best Time</Text>
                    <Text style={styles.statValue}>{formatTime(best.bestTime)}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statValue}>
                      {'\u2B50'.repeat(mmStars(best.bestMoves, diff))}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.notPlayed}>Not played yet</Text>
              )}
              {diff !== 'hard' && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Section: Trivia */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F9E0}'} Trivia</Text>

        {triviaStats.totalRoundsPlayed > 0 ? (
          <>
            <View style={styles.rankRow}>
              <Text style={styles.bigValue}>{triviaAccuracy}%</Text>
              <Text style={styles.rankLabel}>Accuracy</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Rounds Played</Text>
              <Text style={styles.statValue}>{triviaStats.totalRoundsPlayed}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Questions Answered</Text>
              <Text style={styles.statValue}>{triviaStats.totalQuestionsAnswered}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Correct</Text>
              <Text style={styles.statValue}>{triviaStats.totalCorrect}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{'\u{1F3C6}'} Best Round</Text>
              <Text style={styles.statValue}>
                {triviaStats.bestRoundScore}/10
                {bestCatLabel ? ` (${bestCatLabel})` : ''}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{'\u{1F525}'} Longest Streak</Text>
              <Text style={styles.statValue}>{triviaStats.longestStreak}</Text>
            </View>

            {playedCategories.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.diffLabel}>Per Category</Text>
                {playedCategories.map((cat) => {
                  const catStats = triviaStats.categoryStats[cat];
                  const catLabel = TRIVIA_CATEGORIES.find((c) => c.id === cat)?.label || cat;
                  const catAcc = catStats.questionsAnswered > 0
                    ? Math.round((catStats.correct / catStats.questionsAnswered) * 100)
                    : 0;
                  return (
                    <View key={cat} style={styles.statRow}>
                      <Text style={styles.statLabel}>{catLabel}</Text>
                      <Text style={styles.statValue}>
                        {catStats.roundsPlayed} round{catStats.roundsPlayed !== 1 ? 's' : ''} ({catAcc}%)
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <Text style={styles.notPlayed}>No trivia rounds played yet</Text>
        )}
      </View>

      {/* Section: Sudoku */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F522}'} Sudoku</Text>

        {(['easy', 'medium', 'hard'] as const).map((diff) => {
          const best = sudokuScores[diff];
          return (
            <View key={diff}>
              <Text style={styles.diffLabel}>{diffLabels[diff]}</Text>
              {best ? (
                <>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Best Time</Text>
                    <Text style={styles.statValue}>{formatTime(best.bestTime)}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Fewest Mistakes</Text>
                    <Text style={styles.statValue}>{best.bestMistakes}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statValue}>
                      {'\u2B50'.repeat(sudokuStars(best.bestMistakes))}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.notPlayed}>Not played yet</Text>
              )}
              {diff !== 'hard' && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Section: Daily Riddle */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'\u{1F4A1}'} Daily Riddle</Text>

        {riddleStats.totalPlayed > 0 ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>
                {riddleStats.streak > 0 ? '\u{1F525} ' : ''}Current Streak
              </Text>
              <Text style={styles.statValue}>
                {riddleStats.streak} day{riddleStats.streak !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{'\u{1F3C6}'} Longest Streak</Text>
              <Text style={styles.statValue}>
                {riddleStats.longestStreak} day{riddleStats.longestStreak !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Attempted</Text>
              <Text style={styles.statValue}>{riddleStats.totalPlayed}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Correct</Text>
              <Text style={styles.statValue}>{riddleStats.totalCorrect}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValue}>{riddleAccuracy}%</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Riddles Seen</Text>
              <Text style={styles.statValue}>
                {riddleStats.seenRiddleIds.length} / {RIDDLES.length}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.notPlayed}>No riddles attempted yet</Text>
        )}
      </View>

      {/* Reset All Scores */}
      <TouchableOpacity
        style={styles.resetAllBtn}
        onPress={handleResetAll}
        activeOpacity={0.7}
      >
        <Text style={styles.resetAllBtnText}>Reset All Scores</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
    </ImageBackground>
  );
}

function makeStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingBottom: 60 + bottomInset,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    backBtn: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // Overall summary
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    summaryEmoji: {
      fontSize: 48,
    },
    summaryInfo: {
      flex: 1,
    },
    summaryRank: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 24,
    },
    summaryScore: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 4,
    },

    // Section cards
    sectionCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },

    // Score breakdown bars
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    breakdownBar: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 3,
      marginBottom: 14,
      overflow: 'hidden',
    },
    breakdownFill: {
      height: 6,
      borderRadius: 3,
    },

    // Guess Why rank row
    rankRow: {
      alignItems: 'center',
      marginBottom: 8,
    },
    bigValue: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    rankLabel: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 2,
    },

    // Stat rows
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    statLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      marginVertical: 6,
    },

    // Difficulty labels
    diffLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 4,
      marginBottom: 4,
    },

    // Not played
    notPlayed: {
      fontSize: 14,
      color: colors.textTertiary,
      fontStyle: 'italic',
      paddingVertical: 6,
    },

    // Buttons inside sections
    sectionBtn: {
      marginTop: 16,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    sectionBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },

    // Reset All Scores
    resetAllBtn: {
      marginHorizontal: 16,
      marginTop: 24,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    resetAllBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.red,
    },
  });
}
