import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ImageBackground, Image, ImageSourcePropType } from 'react-native';
import { kvGet } from '../services/database';
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
import { hapticLight, hapticHeavy } from '../utils/haptics';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import type { TriviaStats, TriviaCategory } from '../types/trivia';

const SECTION_ICONS: Record<string, ImageSourcePropType> = {
  chart: require('../../assets/icons/icon-chart.webp'),
  guessWhy: require('../../assets/icons/guess-why.webp'),
  dailyRiddle: require('../../assets/icons/icon-lightbulb.webp'),
  chess: require('../../assets/icons/icon-chess.webp'),
  checkers: require('../../assets/icons/icon-checkers.webp'),
  win: require('../../assets/icons/icon-win.webp'),
  loss: require('../../assets/icons/icon-loss.webp'),
  skip: require('../../assets/icons/icon-skip.webp'),
  star: require('../../assets/icons/icon-star.webp'),
  trivia: require('../../assets/trivia/trivia-general.webp'),
  sudoku: require('../../assets/icons/icon-sudoku.webp'),
  memoryMatch: require('../../assets/memory-match/card-back.webp'),
};

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
    kids: { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 },
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
  interface BoardGameStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  }
  const [chessStats, setChessStats] = useState<BoardGameStats>({
    gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
  });
  const [checkersStats, setCheckersStats] = useState<BoardGameStats>({
    gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
  });
  const [triviaStats, setTriviaStats] = useState<TriviaStats>(defaultTriviaStats);
  const [compositeScore, setCompositeScore] = useState<CompositeScore>({
    total: 0,
    breakdown: { guessWhy: 0, memoryMatch: 0, sudoku: 0, dailyRiddle: 0, trivia: 0, chess: 0, checkers: 0 },
  });

  const loadAllStats = useCallback(async () => {
    const score = await calculateCompositeScore();
    setCompositeScore(score);

    loadStats().then(setGuessWhyStats);
    getTriviaStats().then(setTriviaStats);

    const mmData = kvGet('memoryMatchScores');
    if (mmData) { try { setMmScores(JSON.parse(mmData)); } catch {} }
    else { setMmScores({}); }

    const sudData = kvGet('sudokuBestScores');
    if (sudData) { try { setSudokuScores(JSON.parse(sudData)); } catch {} }
    else { setSudokuScores({}); }

    const ridData = kvGet('dailyRiddleStats');
    if (ridData) {
      try {
        const parsed = JSON.parse(ridData);
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

    const chessData = kvGet('chessStats');
    if (chessData) {
      try {
        const parsed = JSON.parse(chessData);
        setChessStats({
          gamesPlayed: parsed.gamesPlayed || 0,
          wins: parsed.wins || 0,
          losses: parsed.losses || 0,
          draws: parsed.draws || 0,
        });
      } catch {}
    } else {
      setChessStats({ gamesPlayed: 0, wins: 0, losses: 0, draws: 0 });
    }

    const checkersData = kvGet('checkersStats');
    if (checkersData) {
      try {
        const parsed = JSON.parse(checkersData);
        setCheckersStats({
          gamesPlayed: parsed.gamesPlayed || 0,
          wins: parsed.wins || 0,
          losses: parsed.losses || 0,
          draws: 0,
        });
      } catch {}
    } else {
      setCheckersStats({ gamesPlayed: 0, wins: 0, losses: 0, draws: 0 });
    }
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

  const styles = useMemo(() => makeStyles(colors, insets.bottom, insets.top), [colors, insets.bottom, insets.top]);

  const diffLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

  const bestCatLabel = triviaStats.bestRoundCategory
    ? TRIVIA_CATEGORIES.find((c) => c.id === triviaStats.bestRoundCategory)?.label || triviaStats.bestRoundCategory
    : null;

  // Categories that have been played
  const playedCategories = (Object.keys(triviaStats.categoryStats) as TriviaCategory[]).filter(
    (cat) => triviaStats.categoryStats[cat].roundsPlayed > 0
  );

  return (
    <ImageBackground source={require('../../assets/library.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <View style={styles.headerBack}>
      <BackButton onPress={() => navigation.goBack()} forceDark />
    </View>
    <View style={styles.headerHome}>
      <HomeButton forceDark />
    </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../../assets/icons/icon-chart.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Memory Score</Text>

      {/* Overall Summary — composite rank */}
      <View style={styles.summaryCard}>
        <Image source={rank.imageSource} style={styles.summaryImage} resizeMode="contain" />
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryRank}>{rank.title}</Text>
          <Text style={styles.summaryScore}>
            Score: {compositeScore.total} / 140
          </Text>
        </View>
      </View>

      {/* Score Breakdown */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.chart} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.guessWhy} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Guess Why</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.guessWhy} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.guessWhy / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.dailyRiddle} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Daily Riddle</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.dailyRiddle} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.dailyRiddle / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.chess} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Chess</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.chess} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.chess / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.checkers} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Checkers</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.checkers} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.checkers / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.trivia} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Trivia</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.trivia} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.trivia / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.sudoku} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Sudoku</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.sudoku} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.sudoku / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Image source={SECTION_ICONS.memoryMatch} style={styles.breakdownIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Memory Guy Match</Text>
          </View>
          <Text style={styles.statValue}>{breakdown.memoryMatch} / 20</Text>
        </View>
        <View style={styles.breakdownBar}>
          <View style={[styles.breakdownFill, { width: `${(breakdown.memoryMatch / 20) * 100}%`, backgroundColor: colors.accent }]} />
        </View>
      </View>

      {/* Section: Guess Why */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.guessWhy} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Guess Why</Text>
        </View>

        <View style={styles.rankRow}>
          <Text style={styles.bigValue}>{gwTotal > 0 ? `${gwPercentage}%` : '--'}</Text>
          <Text style={styles.rankLabel}>
            {gwTotal === 0 ? 'No games yet' : 'Win Rate'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Image source={SECTION_ICONS.win} style={styles.statIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <Text style={styles.statValue}>{guessWhyStats.wins}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Image source={SECTION_ICONS.loss} style={styles.statIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <Text style={styles.statValue}>{guessWhyStats.losses}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Image source={SECTION_ICONS.skip} style={styles.statIcon} resizeMode="contain" />
            <Text style={styles.statLabel}>Skips</Text>
          </View>
          <Text style={styles.statValue}>{guessWhyStats.skips}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Current Streak</Text>
          <Text style={styles.statValue}>{guessWhyStats.streak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Best Streak</Text>
          <Text style={styles.statValue}>{guessWhyStats.bestStreak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Games</Text>
          <Text style={styles.statValue}>{gwTotal}</Text>
        </View>

      </View>

      {/* Section: Daily Riddle */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.dailyRiddle} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Daily Riddle</Text>
        </View>

        {riddleStats.totalPlayed > 0 ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>
                Current Streak
              </Text>
              <Text style={styles.statValue}>
                {riddleStats.streak} day{riddleStats.streak !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Longest Streak</Text>
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

      {/* Section: Chess */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.chess} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Chess</Text>
        </View>

        {chessStats.gamesPlayed > 0 ? (
          <>
            <View style={styles.rankRow}>
              <Text style={styles.bigValue}>
                {Math.round((chessStats.wins / chessStats.gamesPlayed) * 100)}%
              </Text>
              <Text style={styles.rankLabel}>Win Rate</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statLabelRow}>
                <Image source={SECTION_ICONS.win} style={styles.statIcon} resizeMode="contain" />
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <Text style={styles.statValue}>{chessStats.wins}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statLabelRow}>
                <Image source={SECTION_ICONS.loss} style={styles.statIcon} resizeMode="contain" />
                <Text style={styles.statLabel}>Losses</Text>
              </View>
              <Text style={styles.statValue}>{chessStats.losses}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Draws</Text>
              <Text style={styles.statValue}>{chessStats.draws}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Games Played</Text>
              <Text style={styles.statValue}>{chessStats.gamesPlayed}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.notPlayed}>No chess games played yet</Text>
        )}
      </View>

      {/* Section: Checkers */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.checkers} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Checkers</Text>
        </View>

        {checkersStats.gamesPlayed > 0 ? (
          <>
            <View style={styles.rankRow}>
              <Text style={styles.bigValue}>
                {Math.round((checkersStats.wins / checkersStats.gamesPlayed) * 100)}%
              </Text>
              <Text style={styles.rankLabel}>Win Rate</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statLabelRow}>
                <Image source={SECTION_ICONS.win} style={styles.statIcon} resizeMode="contain" />
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <Text style={styles.statValue}>{checkersStats.wins}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statLabelRow}>
                <Image source={SECTION_ICONS.loss} style={styles.statIcon} resizeMode="contain" />
                <Text style={styles.statLabel}>Losses</Text>
              </View>
              <Text style={styles.statValue}>{checkersStats.losses}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Games Played</Text>
              <Text style={styles.statValue}>{checkersStats.gamesPlayed}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.notPlayed}>No checkers games played yet</Text>
        )}
      </View>

      {/* Section: Trivia */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.trivia} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Trivia</Text>
        </View>

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
              <Text style={styles.statLabel}>Best Round</Text>
              <Text style={styles.statValue}>
                {triviaStats.bestRoundScore}/10
                {bestCatLabel ? ` (${bestCatLabel})` : ''}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Longest Streak</Text>
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
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.sudoku} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Sudoku</Text>
        </View>

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
                    <View style={styles.starRow}>
                      {Array.from({ length: sudokuStars(best.bestMistakes) }).map((_, i) => (
                        <Image key={i} source={SECTION_ICONS.star} style={styles.starIcon} resizeMode="contain" />
                      ))}
                    </View>
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

      {/* Section: Memory Match */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Image source={SECTION_ICONS.memoryMatch} style={styles.sectionIcon} resizeMode="contain" />
          <Text style={styles.sectionTitle}>Memory Guy Match</Text>
        </View>

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
                    <View style={styles.starRow}>
                      {Array.from({ length: mmStars(best.bestMoves, diff) }).map((_, i) => (
                        <Image key={i} source={SECTION_ICONS.star} style={styles.starIcon} resizeMode="contain" />
                      ))}
                    </View>
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

      {/* Reset All Scores */}
      <TouchableOpacity
        style={styles.resetAllBtn}
        onPress={() => { hapticLight(); handleResetAll(); }}
        activeOpacity={0.7}
      >
        <Text style={styles.resetAllBtnText}>Reset All Scores</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
    </ImageBackground>
  );
}

function makeStyles(colors: ThemeColors, bottomInset: number, topInset: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingBottom: 60 + bottomInset,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: topInset + 10,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: topInset + 10,
      zIndex: 10,
    },
    headerHome: {
      position: 'absolute',
      left: 64,
      top: topInset + 10,
      zIndex: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.overlayText,
      textAlign: 'center',
      marginTop: 8,
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
    summaryImage: {
      width: 100,
      height: 100,
    },
    summaryInfo: {
      flex: 1,
    },
    summaryRank: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.overlayText,
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    sectionIcon: {
      width: 28,
      height: 28,
      marginRight: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.overlayText,
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
    breakdownLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    breakdownIcon: {
      width: 20,
      height: 20,
      marginRight: 8,
    },

    // Guess Why rank row
    rankRow: {
      alignItems: 'center',
      marginBottom: 8,
    },
    bigValue: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.overlayText,
    },
    rankLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 2,
    },

    // Stat rows
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    statLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statIcon: {
      width: 20,
      height: 20,
      marginRight: 8,
    },
    starRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    starIcon: {
      width: 24,
      height: 24,
      marginRight: 2,
    },
    statLabel: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.7)',
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.overlayText,
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
      color: 'rgba(255,255,255,0.5)',
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
