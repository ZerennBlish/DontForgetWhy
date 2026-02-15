import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { playCorrect, playWrong, playGameComplete } from '../utils/gameSounds';
import { loadSettings } from '../services/settings';
import { TRIVIA_QUESTIONS, TRIVIA_CATEGORIES } from '../data/triviaQuestions';
import { fetchOnlineQuestions, checkOnlineAvailable } from '../services/triviaAI';
import {
  recordTriviaRound,
  getSeenQuestionIds,
  addSeenQuestionIds,
  resetSeenQuestionsForCategory,
} from '../services/triviaStorage';
import type { TriviaQuestion, TriviaCategory } from '../types/trivia';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Trivia'>;

type Phase = 'category' | 'playing' | 'results';

const QUESTIONS_PER_ROUND = 10;
const TIME_PER_QUESTION = 15;

const CATEGORY_EMOJIS: Record<TriviaCategory, string> = {
  general: '\u{1F9E0}',
  science: '\u{1F52C}',
  history: '\u{1F3DB}',
  pop_culture: '\u{2B50}',
  geography: '\u{1F30D}',
  sports: '\u{1F3C6}',
  technology: '\u{1F4BB}',
  food: '\u{1F37D}',
};

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function selectQuestions(
  category: TriviaCategory,
  seenIds: string[],
): { questions: TriviaQuestion[]; allSeen: boolean } {
  const isGeneral = category === 'general';
  const pool = isGeneral
    ? TRIVIA_QUESTIONS
    : TRIVIA_QUESTIONS.filter((q) => q.category === category);

  const seenSet = new Set(seenIds);
  const unseen = pool.filter((q) => !seenSet.has(q.id));
  let allSeen = false;

  let source = unseen;
  if (unseen.length < QUESTIONS_PER_ROUND) {
    allSeen = true;
    source = pool;
  }

  // Try to get a mix of difficulties: ~4 easy, ~3 medium, ~3 hard
  const easy = shuffle(source.filter((q) => q.difficulty === 'easy'));
  const medium = shuffle(source.filter((q) => q.difficulty === 'medium'));
  const hard = shuffle(source.filter((q) => q.difficulty === 'hard'));

  const selected: TriviaQuestion[] = [];
  selected.push(...easy.slice(0, 4));
  selected.push(...medium.slice(0, 3));
  selected.push(...hard.slice(0, 3));

  // Fill remaining if we don't have enough of any difficulty
  if (selected.length < QUESTIONS_PER_ROUND) {
    const usedIds = new Set(selected.map((q) => q.id));
    const remaining = shuffle(source.filter((q) => !usedIds.has(q.id)));
    selected.push(...remaining.slice(0, QUESTIONS_PER_ROUND - selected.length));
  }

  return { questions: shuffle(selected.slice(0, QUESTIONS_PER_ROUND)), allSeen };
}

function getShuffledAnswers(question: TriviaQuestion): string[] {
  if (question.type === 'boolean') {
    return ['True', 'False'];
  }
  return shuffle([question.correctAnswer, ...question.incorrectAnswers]);
}

export default function TriviaScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Phase state
  const [phase, setPhase] = useState<Phase>('category');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineMode, setOnlineMode] = useState(false);
  const [allSeenMessage, setAllSeenMessage] = useState<string | null>(null);

  // Game state
  const [selectedCategory, setSelectedCategory] = useState<TriviaCategory>('general');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [isOnlineRound, setIsOnlineRound] = useState(false);

  const [gameSoundsEnabled, setGameSoundsEnabled] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerWidth = useRef(new Animated.Value(1)).current;
  const answerLocked = useRef(false);
  const gameSoundsRef = useRef(false);

  // Check online availability and load settings on mount
  useEffect(() => {
    checkOnlineAvailable().then((available) => {
      setIsOnline(available);
      setOnlineMode(available);
    });
    loadSettings().then((s) => {
      setGameSoundsEnabled(s.gameSoundsEnabled);
      gameSoundsRef.current = s.gameSoundsEnabled;
    });
  }, []);

  // Timer logic
  useEffect(() => {
    if (phase !== 'playing' || selectedAnswer !== null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Animated bar
    Animated.timing(timerWidth, {
      toValue: 0,
      duration: timeLeft * 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerWidth.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, selectedAnswer]);

  const handleTimeout = useCallback(() => {
    if (answerLocked.current) return;
    answerLocked.current = true;
    hapticHeavy();
    setSelectedAnswer('__timeout__');
    setIsCorrect(false);
    setCurrentStreak(0);
    const elapsed = Date.now() - questionStartTime;
    setQuestionTimes((prev) => [...prev, elapsed]);

    setTimeout(() => advanceQuestion(), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionStartTime, currentIndex]);

  const advanceQuestion = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      finishRound();
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeLeft(TIME_PER_QUESTION);
      timerWidth.setValue(1);
      answerLocked.current = false;
      setQuestionStartTime(Date.now());
      setShuffledAnswers(getShuffledAnswers(questions[nextIndex]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  const finishRound = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('results');
    hapticMedium();
    if (gameSoundsRef.current) playGameComplete();

    // Record the round if using offline questions
    if (!isOnlineRound) {
      const ids = questions.map((q) => q.id);
      await addSeenQuestionIds(selectedCategory, ids);
    }

    const avgTime = questionTimes.length > 0
      ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
      : 0;

    await recordTriviaRound({
      category: selectedCategory,
      totalQuestions: questions.length,
      correctAnswers: score,
      longestStreak,
      averageTimeMs: Math.round(avgTime),
      date: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, score, questionTimes, selectedCategory, isOnlineRound]);

  const startRound = useCallback(async (category: TriviaCategory) => {
    setSelectedCategory(category);
    setAllSeenMessage(null);

    let roundQuestions: TriviaQuestion[] | null = null;
    let usingOnline = false;

    // Try online first if enabled and category is available
    if (onlineMode && category !== 'food') {
      const onlineQs = await fetchOnlineQuestions(category, QUESTIONS_PER_ROUND);
      if (onlineQs && onlineQs.length >= QUESTIONS_PER_ROUND) {
        roundQuestions = onlineQs;
        usingOnline = true;
      }
    }

    // Fall back to offline bank
    if (!roundQuestions) {
      const seenIds = await getSeenQuestionIds(category);
      const { questions: offlineQs, allSeen } = selectQuestions(category, seenIds);
      roundQuestions = offlineQs;
      if (allSeen) {
        const catLabel = TRIVIA_CATEGORIES.find((c) => c.id === category)?.label || category;
        setAllSeenMessage(`You've seen all ${catLabel} questions! Replaying from the start.`);
        await resetSeenQuestionsForCategory(category);
      }
    }

    setIsOnlineRound(usingOnline);
    setQuestions(roundQuestions);
    setCurrentIndex(0);
    setScore(0);
    setCurrentStreak(0);
    setLongestStreak(0);
    setQuestionTimes([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimeLeft(TIME_PER_QUESTION);
    timerWidth.setValue(1);
    answerLocked.current = false;
    setQuestionStartTime(Date.now());
    setShuffledAnswers(getShuffledAnswers(roundQuestions[0]));
    setPhase('playing');
    hapticLight();
  }, [onlineMode, timerWidth]);

  const handleAnswer = useCallback((answer: string) => {
    if (answerLocked.current || selectedAnswer !== null) return;
    answerLocked.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    timerWidth.stopAnimation();

    const question = questions[currentIndex];
    const correct = answer === question.correctAnswer;
    const elapsed = Date.now() - questionStartTime;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setQuestionTimes((prev) => [...prev, elapsed]);

    if (correct) {
      hapticMedium();
      if (gameSoundsRef.current) playCorrect();
      setScore((prev) => prev + 1);
      setCurrentStreak((prev) => {
        const newStreak = prev + 1;
        setLongestStreak((best) => Math.max(best, newStreak));
        return newStreak;
      });
      setTimeout(() => advanceQuestion(), 800);
    } else {
      hapticHeavy();
      if (gameSoundsRef.current) playWrong();
      setCurrentStreak(0);
      setTimeout(() => advanceQuestion(), 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, questionStartTime, selectedAnswer]);

  const getStarRating = (s: number): number => {
    if (s >= 9) return 3;
    if (s >= 6) return 2;
    if (s >= 3) return 1;
    return 0;
  };

  const stars = getStarRating(score);
  const avgTimeMs = questionTimes.length > 0
    ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
    : 0;
  const avgTimeSec = (avgTimeMs / 1000).toFixed(1);

  const currentQuestion = questions[currentIndex];

  const styles = useMemo(() => makeStyles(colors, insets), [colors, insets]);

  // ─── Category Select ───
  if (phase === 'category') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Trivia Time</Text>
        </View>

        {/* Online/Offline toggle */}
        <TouchableOpacity
          style={styles.modeToggle}
          onPress={() => {
            hapticLight();
            setOnlineMode((prev) => !prev);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.modeIcon}>{onlineMode ? '\u{1F310}' : '\u{1F4F1}'}</Text>
          <Text style={styles.modeText}>
            {onlineMode ? 'Online' : 'Offline'}{' '}
            {!isOnline && onlineMode ? '(no connection)' : ''}
          </Text>
        </TouchableOpacity>

        {allSeenMessage && (
          <Text style={styles.seenNote}>{allSeenMessage}</Text>
        )}

        <View style={styles.categoryGrid}>
          {TRIVIA_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => startRound(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[cat.id]}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ─── Results ───
  if (phase === 'results') {
    const catInfo = TRIVIA_CATEGORIES.find((c) => c.id === selectedCategory);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Round Complete</Text>

          <Text style={styles.resultsScore}>{score}/{questions.length}</Text>
          <Text style={styles.resultsStars}>
            {stars > 0 ? '\u2B50'.repeat(stars) : '\u2014'}
          </Text>

          <View style={styles.resultsBadge}>
            <Text style={styles.resultsBadgeEmoji}>
              {CATEGORY_EMOJIS[selectedCategory]}
            </Text>
            <Text style={styles.resultsBadgeText}>{catInfo?.label}</Text>
          </View>

          <View style={styles.resultsStatsCard}>
            <View style={styles.resultsStat}>
              <Text style={styles.resultsStatValue}>{score}</Text>
              <Text style={styles.resultsStatLabel}>Correct</Text>
            </View>
            <View style={styles.resultsStatDivider} />
            <View style={styles.resultsStat}>
              <Text style={styles.resultsStatValue}>{avgTimeSec}s</Text>
              <Text style={styles.resultsStatLabel}>Avg Time</Text>
            </View>
            <View style={styles.resultsStatDivider} />
            <View style={styles.resultsStat}>
              <Text style={styles.resultsStatValue}>{longestStreak}</Text>
              <Text style={styles.resultsStatLabel}>Best Streak</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => startRound(selectedCategory)}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setPhase('category');
              setAllSeenMessage(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Change Category</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Back to Games</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Gameplay ───
  if (!currentQuestion) return null;

  const timerColor = timeLeft <= 5 ? colors.red : colors.accent;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarEmoji}>{CATEGORY_EMOJIS[selectedCategory]}</Text>
          <Text style={styles.topBarCategory}>
            {TRIVIA_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <Text style={styles.topBarCounter}>{currentIndex + 1}/{questions.length}</Text>
          {currentStreak > 1 && (
            <Text style={styles.topBarStreak}>{'\u{1F525}'}{currentStreak}</Text>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      {/* Timer bar */}
      <View style={styles.timerBarContainer}>
        <Animated.View
          style={[
            styles.timerBarFill,
            {
              backgroundColor: timerColor,
              width: timerWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      {/* Answers */}
      <View style={currentQuestion.type === 'boolean' ? styles.booleanGrid : styles.answerGrid}>
        {shuffledAnswers.map((answer, idx) => {
          let btnStyle = styles.answerBtn;
          let textStyle = styles.answerText;

          if (selectedAnswer !== null) {
            if (answer === currentQuestion.correctAnswer) {
              btnStyle = { ...styles.answerBtn, ...styles.correctBtn };
              textStyle = { ...styles.answerText, ...styles.correctText };
            } else if (answer === selectedAnswer) {
              btnStyle = { ...styles.answerBtn, ...styles.incorrectBtn };
              textStyle = { ...styles.answerText, ...styles.incorrectText };
            } else {
              btnStyle = { ...styles.answerBtn, ...styles.dimmedBtn };
            }
          }

          return (
            <TouchableOpacity
              key={`${currentIndex}-${idx}`}
              style={btnStyle}
              onPress={() => handleAnswer(answer)}
              activeOpacity={0.7}
              disabled={selectedAnswer !== null}
            >
              <Text style={textStyle}>{answer}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedAnswer === '__timeout__' && (
        <Text style={styles.timeoutText}>Time's up!</Text>
      )}
    </View>
  );
}

function makeStyles(colors: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 40 + insets.bottom,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 16,
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
      color: colors.textPrimary,
    },

    // Mode toggle
    modeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    modeIcon: {
      fontSize: 16,
    },
    modeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    seenNote: {
      fontSize: 13,
      color: colors.orange,
      fontStyle: 'italic',
      marginHorizontal: 20,
      marginBottom: 12,
    },

    // Category grid
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      gap: 12,
    },
    categoryCard: {
      width: '46%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    categoryEmoji: {
      fontSize: 36,
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },

    // Top bar
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: insets.top + 12,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topBarEmoji: {
      fontSize: 20,
    },
    topBarCategory: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    topBarCounter: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    topBarStreak: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.orange,
    },

    // Progress bar
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.accent,
      borderRadius: 2,
    },

    // Timer
    timerBarContainer: {
      height: 6,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginTop: 12,
      borderRadius: 3,
      overflow: 'hidden',
    },
    timerBarFill: {
      height: 6,
      borderRadius: 3,
    },
    timerText: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 6,
    },

    // Question
    questionContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    questionText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 32,
    },

    // Answer grids
    answerGrid: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 24,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    booleanGrid: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 24,
      flexDirection: 'row',
      gap: 12,
    },
    answerBtn: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      minHeight: 64,
    },
    answerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    correctBtn: {
      backgroundColor: '#4CAF50',
      borderColor: '#4CAF50',
    },
    correctText: {
      color: '#FFFFFF',
    },
    incorrectBtn: {
      backgroundColor: colors.red,
      borderColor: colors.red,
    },
    incorrectText: {
      color: '#FFFFFF',
    },
    dimmedBtn: {
      opacity: 0.3,
    },
    timeoutText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.red,
      textAlign: 'center',
      marginBottom: insets.bottom + 16,
    },

    // Results
    resultsContainer: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 24,
    },
    resultsTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    resultsScore: {
      fontSize: 56,
      fontWeight: '800',
      color: colors.accent,
    },
    resultsStars: {
      fontSize: 32,
      marginTop: 8,
      marginBottom: 24,
    },
    resultsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    resultsBadgeEmoji: {
      fontSize: 20,
    },
    resultsBadgeText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    resultsStatsCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 32,
      width: '100%',
    },
    resultsStat: {
      flex: 1,
      alignItems: 'center',
    },
    resultsStatValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    resultsStatLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textTertiary,
      marginTop: 4,
    },
    resultsStatDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryBtnText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    secondaryBtn: {
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 16,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
