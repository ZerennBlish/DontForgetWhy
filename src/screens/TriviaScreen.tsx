import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ImageBackground,
  Image,
  ImageSourcePropType,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import type { ThemeColors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { checkConnectivity } from '../utils/connectivity';
import { getAllQuestions, getQuestionsForCategory, getQuestionsForSubcategory } from '../data/triviaBank';
import { fetchOnlineQuestions, checkOnlineAvailable } from '../services/triviaAI';
import {
  recordTriviaRound,
  getSeenQuestionIds,
  addSeenQuestionIds,
  resetSeenQuestionsForCategory,
} from '../services/triviaStorage';
import type { TriviaQuestion, TriviaParentCategory, TriviaSubcategory } from '../types/trivia';
import { PARENT_TO_SUBS, SUBCATEGORY_LABELS } from '../types/trivia';
import { GameNavButtons } from '../components/GameNavButtons';
import SubcategoryPickerModal from '../components/SubcategoryPickerModal';
import MultiplayerTriviaGame from '../components/MultiplayerTriviaGame';
import {
  createTriviaGame,
  joinTriviaGame,
  getTriviaGames,
  type TriviaMultiplayerGame,
} from '../services/multiplayerTrivia';
import { getCurrentUser } from '../services/firebaseAuth';
import { isProUser } from '../services/proStatus';
import ProGate from '../components/ProGate';
import useEntitlement from '../hooks/useEntitlement';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Trivia'>;

type Phase = 'category' | 'playing' | 'results';
type TriviaMode = 'cpu' | 'multiplayer' | null;
type MpPhase = 'menu' | 'create' | 'join' | 'playing';

const QUESTIONS_PER_ROUND = 10;

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type SpeedOption = 'relaxed' | 'normal' | 'blitz';
const SPEED_SECONDS: Record<SpeedOption, number> = { relaxed: 25, normal: 15, blitz: 8 };

const CATEGORY_IMAGES: Record<TriviaParentCategory, ImageSourcePropType> = {
  general: require('../../assets/trivia/trivia-general.webp'),
  popCulture: require('../../assets/trivia/popcorn_bucket.webp'),
  scienceTech: require('../../assets/trivia/trivia-science.webp'),
  historyPolitics: require('../../assets/trivia/trivia-history.webp'),
  geography: require('../../assets/trivia/trivia-geography.webp'),
  sportsLeisure: require('../../assets/trivia/recliner_512.webp'),
  gamingGeek: require('../../assets/trivia/d20_die.webp'),
  mythFiction: require('../../assets/trivia/scroll_icon.webp'),
};

const TRIVIA_CATEGORIES: { id: TriviaParentCategory; label: string }[] = [
  { id: 'general', label: 'General Knowledge' },
  { id: 'popCulture', label: 'Pop Culture' },
  { id: 'scienceTech', label: 'Science & Tech' },
  { id: 'historyPolitics', label: 'History & Politics' },
  { id: 'geography', label: 'Geography' },
  { id: 'sportsLeisure', label: 'Sports & Leisure' },
  { id: 'gamingGeek', label: 'Gaming & Geek' },
  { id: 'mythFiction', label: 'Myth & Fiction' },
];

const MP_QUESTION_COUNTS = [10, 15, 20];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function selectFromPool(source: TriviaQuestion[], count: number, difficulty: DifficultyFilter): TriviaQuestion[] {
  if (difficulty !== 'all') {
    return shuffle(source.filter((q) => q.difficulty === difficulty)).slice(0, count);
  }
  const easy = shuffle(source.filter((q) => q.difficulty === 'easy'));
  const medium = shuffle(source.filter((q) => q.difficulty === 'medium'));
  const hard = shuffle(source.filter((q) => q.difficulty === 'hard'));
  const selected: TriviaQuestion[] = [];
  selected.push(...easy.slice(0, 4));
  selected.push(...medium.slice(0, 3));
  selected.push(...hard.slice(0, 3));
  if (selected.length < count) {
    const usedIds = new Set(selected.map((q) => q.id));
    const remaining = shuffle(source.filter((q) => !usedIds.has(q.id)));
    selected.push(...remaining.slice(0, count - selected.length));
  }
  return shuffle(selected.slice(0, count));
}

function selectQuestions(
  category: TriviaParentCategory,
  subcategory: TriviaSubcategory | 'all',
  seenIds: string[],
  difficulty: DifficultyFilter,
): { questions: TriviaQuestion[]; allSeen: boolean } {
  let pool: TriviaQuestion[];
  if (subcategory !== 'all') {
    pool = getQuestionsForSubcategory(subcategory);
  } else if (category === 'general') {
    pool = getAllQuestions();
  } else {
    pool = getQuestionsForCategory(category);
  }
  if (difficulty !== 'all') {
    pool = pool.filter((q) => q.difficulty === difficulty);
  }
  const seenSet = new Set(seenIds);
  const unseen = pool.filter((q) => !seenSet.has(q.id));
  if (unseen.length === 0) {
    return { questions: selectFromPool(pool, QUESTIONS_PER_ROUND, difficulty), allSeen: true };
  }
  if (unseen.length >= QUESTIONS_PER_ROUND) {
    return { questions: selectFromPool(unseen, QUESTIONS_PER_ROUND, difficulty), allSeen: false };
  }
  const seen = shuffle(pool.filter((q) => seenSet.has(q.id)));
  const padded = [...unseen, ...seen.slice(0, QUESTIONS_PER_ROUND - unseen.length)];
  return { questions: shuffle(padded), allSeen: false };
}

function getShuffledAnswers(question: TriviaQuestion): string[] {
  if (question.type === 'boolean') {
    return ['True', 'False'];
  }
  return shuffle([question.correctAnswer, ...question.incorrectAnswers]);
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TriviaScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entitlement = useEntitlement();

  // Phase state (CPU)
  const [phase, setPhase] = useState<Phase>('category');
  const [onlineMode, setOnlineMode] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [allSeenMessage, setAllSeenMessage] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [speedOption, setSpeedOption] = useState<SpeedOption>('normal');

  // Game state (CPU)
  const [selectedCategory, setSelectedCategory] = useState<TriviaParentCategory>('general');
  const [selectedSubcategory, setSelectedSubcategory] = useState<TriviaSubcategory | 'all'>('all');
  const [subPickerVisible, setSubPickerVisible] = useState(false);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPEED_SECONDS.normal);
  const [isOnlineRound, setIsOnlineRound] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerWidth = useRef(new Animated.Value(1)).current;
  const answerLocked = useRef(false);
  const roundTimePerQuestion = useRef(SPEED_SECONDS.normal);

  // ── Multiplayer state ────────────────────────────────────────
  const initialMpCode = route.params?.multiplayerCode ?? null;
  const [triviaMode, setTriviaMode] = useState<TriviaMode>(
    initialMpCode ? 'multiplayer' : null,
  );
  const [mpPhase, setMpPhase] = useState<MpPhase>(
    initialMpCode ? 'playing' : 'menu',
  );
  const [multiplayerCode, setMultiplayerCode] = useState<string | null>(
    initialMpCode,
  );
  const [mpCategory, setMpCategory] = useState<TriviaParentCategory>('general');
  const [mpSubcategory, setMpSubcategory] = useState<TriviaSubcategory | 'all'>('all');
  const [mpSubPickerVisible, setMpSubPickerVisible] = useState(false);
  const [mpQuestionCount, setMpQuestionCount] = useState(10);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeMpGames, setActiveMpGames] = useState<TriviaMultiplayerGame[]>([]);
  const [proGateVisible, setProGateVisible] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [joiningGame, setJoiningGame] = useState(false);

  // Online by default — auto-disable if the OpenTDB API is unreachable.
  useEffect(() => {
    checkOnlineAvailable().then((available) => {
      setOnlineMode(available);
    });
  }, []);

  // Live connectivity poll for globe indicator
  useEffect(() => {
    let cancelled = false;
    checkConnectivity().then((result) => {
      if (!cancelled) setIsOnline(result);
    });
    const interval = setInterval(() => {
      checkConnectivity().then((result) => {
        if (!cancelled) setIsOnline(result);
      });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Timer logic (CPU gameplay)
  useEffect(() => {
    if (phase !== 'playing' || selectedAnswer !== null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

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
      setTimeLeft(roundTimePerQuestion.current);
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

    if (!isOnlineRound) {
      const seenKey = selectedSubcategory !== 'all' ? `${selectedCategory}_${selectedSubcategory}` : selectedCategory;
      const ids = questions.map((q) => q.id);
      await addSeenQuestionIds(seenKey, ids);
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
  }, [questions, score, questionTimes, selectedCategory, selectedSubcategory, isOnlineRound]);

  const startRound = useCallback(async (category: TriviaParentCategory) => {
    setSelectedCategory(category);
    setAllSeenMessage(null);

    const timePerQ = SPEED_SECONDS[speedOption];
    roundTimePerQuestion.current = timePerQ;

    let roundQuestions: TriviaQuestion[] | null = null;
    let usingOnline = false;

    if (onlineMode) {
      const onlineQs = await fetchOnlineQuestions(category, QUESTIONS_PER_ROUND, difficultyFilter);
      if (onlineQs && onlineQs.length >= QUESTIONS_PER_ROUND) {
        roundQuestions = onlineQs;
        usingOnline = true;
      }
    }

    if (!roundQuestions) {
      const seenKey = selectedSubcategory !== 'all' ? `${category}_${selectedSubcategory}` : category;
      const seenIds = await getSeenQuestionIds(seenKey);
      const { questions: offlineQs, allSeen } = selectQuestions(category, selectedSubcategory, seenIds, difficultyFilter);
      roundQuestions = offlineQs;
      if (allSeen) {
        const catLabel = TRIVIA_CATEGORIES.find((c) => c.id === category)?.label || category;
        const subLabel = selectedSubcategory !== 'all' ? ` (${SUBCATEGORY_LABELS[selectedSubcategory as TriviaSubcategory]})` : '';
        setAllSeenMessage(`You've seen all ${catLabel}${subLabel} questions! Replaying from the start.`);
        await resetSeenQuestionsForCategory(seenKey);
      }
    }

    if (roundQuestions.length === 0) {
      Alert.alert(
        'No Questions Available',
        'No questions available for this category and difficulty. Try a different combination.',
      );
      return;
    }

    setIsOnlineRound(usingOnline);
    setQuestions(roundQuestions);
    setCurrentIndex(0);
    setScore(0);
    setCurrentStreak(0);
    setLongestStreak(0);
    setQuestionTimes([]);
    setSelectedAnswer(null);
    setTimeLeft(timePerQ);
    timerWidth.setValue(1);
    answerLocked.current = false;
    setQuestionStartTime(Date.now());
    setShuffledAnswers(getShuffledAnswers(roundQuestions[0]));
    setPhase('playing');
    hapticLight();
  }, [onlineMode, timerWidth, difficultyFilter, speedOption, selectedSubcategory]);

  const handleAnswer = useCallback((answer: string) => {
    if (answerLocked.current || selectedAnswer !== null) return;
    answerLocked.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    timerWidth.stopAnimation();

    const question = questions[currentIndex];
    const correct = answer === question.correctAnswer;
    const elapsed = Date.now() - questionStartTime;

    setSelectedAnswer(answer);
    setQuestionTimes((prev) => [...prev, elapsed]);

    if (correct) {
      playGameSound('triviaCorrect');
      hapticMedium();
      setScore((prev) => prev + 1);
      setCurrentStreak((prev) => {
        const newStreak = prev + 1;
        setLongestStreak((best) => Math.max(best, newStreak));
        return newStreak;
      });
      setTimeout(() => advanceQuestion(), 800);
    } else {
      playGameSound('triviaWrong');
      hapticHeavy();
      setCurrentStreak(0);
      setTimeout(() => advanceQuestion(), 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, questionStartTime, selectedAnswer]);

  const handleBackFromGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerWidth.stopAnimation();
    answerLocked.current = true;
    setPhase('category');
  }, [timerWidth]);

  const handleCategoryTap = useCallback((catId: TriviaParentCategory) => {
    hapticLight();
    playGameSound('triviaTap');
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    const subs = PARENT_TO_SUBS[catId];
    if (subs.length === 1) {
      setSelectedSubcategory('all');
    } else {
      setSubPickerVisible(true);
    }
  }, []);

  const handleSubcategorySelect = useCallback((sub: TriviaSubcategory | 'all') => {
    setSelectedSubcategory(sub);
    setSubPickerVisible(false);
  }, []);

  // Intercept hardware back during CPU active gameplay only.
  useEffect(() => {
    if (triviaMode !== 'cpu') return;
    if (phase !== 'playing') return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType === 'POP_TO_TOP' || actionType === 'RESET') {
        return;
      }
      e.preventDefault();
      handleBackFromGame();
    });
    return unsubscribe;
  }, [navigation, phase, handleBackFromGame, triviaMode]);

  // ── Multiplayer handlers ─────────────────────────────────────
  const refreshActiveGames = useCallback(() => {
    const user = getCurrentUser();
    if (!user) {
      setActiveMpGames([]);
      return;
    }
    getTriviaGames(user.uid)
      .then((games) => setActiveMpGames(games))
      .catch(() => setActiveMpGames([]));
  }, []);

  useEffect(() => {
    if (triviaMode === 'multiplayer' && mpPhase === 'menu') {
      refreshActiveGames();
    }
  }, [triviaMode, mpPhase, refreshActiveGames]);

  useFocusEffect(
    useCallback(() => {
      if (triviaMode === 'multiplayer' && mpPhase === 'menu') {
        refreshActiveGames();
      }
    }, [triviaMode, mpPhase, refreshActiveGames]),
  );

  const handlePickCpuMode = useCallback(() => {
    hapticLight();
    playGameSound('tap');
    setTriviaMode('cpu');
  }, []);

  const handlePickMpMode = useCallback(() => {
    if (!isProUser()) {
      setProGateVisible(true);
      return;
    }
    if (!getCurrentUser()) {
      Alert.alert(
        'Sign in required',
        'Sign in with Google to play multiplayer trivia.',
      );
      return;
    }
    hapticLight();
    playGameSound('tap');
    setTriviaMode('multiplayer');
    setMpPhase('menu');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setMultiplayerCode(null);
    setMpPhase('menu');
    setJoinCode('');
    setJoinError(null);
    refreshActiveGames();
  }, [refreshActiveGames]);

  const handleBackToModeSelect = useCallback(() => {
    hapticLight();
    playGameSound('tap');
    setTriviaMode(null);
    setMpPhase('menu');
    setMultiplayerCode(null);
    setJoinCode('');
    setJoinError(null);
  }, []);

  const handleMpCategoryTap = useCallback((catId: TriviaParentCategory) => {
    hapticLight();
    playGameSound('triviaTap');
    setMpCategory(catId);
    setMpSubcategory('all');
    const subs = PARENT_TO_SUBS[catId];
    if (subs.length > 1) {
      setMpSubPickerVisible(true);
    }
  }, []);

  const handleMpSubcategorySelect = useCallback((sub: TriviaSubcategory | 'all') => {
    setMpSubcategory(sub);
    setMpSubPickerVisible(false);
  }, []);

  const handleCreateMpGame = useCallback(async () => {
    if (creatingGame) return;
    setCreatingGame(true);
    try {
      const subcat = mpSubcategory === 'all' ? null : mpSubcategory;
      const { code } = await createTriviaGame(mpCategory, subcat, mpQuestionCount);
      setMultiplayerCode(code);
      setMpPhase('playing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      Alert.alert('Could not create game', msg);
    } finally {
      setCreatingGame(false);
    }
  }, [mpCategory, mpSubcategory, mpQuestionCount, creatingGame]);

  const handleJoinMpGame = useCallback(async () => {
    if (joiningGame) return;
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length !== 6) {
      setJoinError('Enter the full 6-character code.');
      return;
    }
    setJoinError(null);
    setJoiningGame(true);
    try {
      await joinTriviaGame(normalized);
      setMultiplayerCode(normalized);
      setMpPhase('playing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join';
      setJoinError(msg);
    } finally {
      setJoiningGame(false);
    }
  }, [joinCode, joiningGame]);

  const handleSelectActiveGame = useCallback((g: TriviaMultiplayerGame) => {
    hapticLight();
    playGameSound('tap');
    setMultiplayerCode(g.code);
    setMpPhase('playing');
  }, []);

  // ── Results / styling ────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Chrome wrapper: shared background + nav buttons for all phases.
  // ────────────────────────────────────────────────────────────
  const renderChrome = (body: React.ReactNode, title = 'Trivia Time') => (
    <ImageBackground source={require('../../assets/trivia-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <GameNavButtons topOffset={insets.top + 10} />
        <View style={styles.globeBadge}>
          <Image
            source={isOnline ? require('../../assets/icons/icon-globe.webp') : require('../../assets/icons/offline_globe.webp')}
            style={styles.globeImage}
            resizeMode="contain"
            accessibilityLabel={isOnline ? 'Cloud features active' : 'Offline mode'}
          />
        </View>
        <View style={styles.header} />
        <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>{title}</Text>
        {body}
        {proGateVisible && (
          <ProGate
            visible={proGateVisible}
            onClose={() => setProGateVisible(false)}
            game="trivia"
            isPro={entitlement.isPro}
            loading={entitlement.loading}
            error={entitlement.error}
            productPrice={entitlement.productPrice}
            onPurchase={entitlement.purchase}
            onRestore={entitlement.restore}
          />
        )}
      </View>
    </ImageBackground>
  );

  // ─── Mode select ────────────────────────────────────────────
  if (triviaMode === null) {
    return renderChrome(
      <View style={styles.modeBody}>
        <TouchableOpacity
          style={styles.modeCard}
          onPress={handlePickCpuMode}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Play solo trivia"
        >
          <Image
            source={require('../../assets/trivia/trivia-general.webp')}
            style={styles.modeCardIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeCardTitle}>vs CPU</Text>
            <Text style={styles.modeCardSubtitle}>Solo trivia rounds — offline or online</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modeCard}
          onPress={handlePickMpMode}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Play trivia with friends"
        >
          <Image
            source={require('../../assets/trivia/d20_die.webp')}
            style={styles.modeCardIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeCardTitle}>vs Players</Text>
            <Text style={styles.modeCardSubtitle}>2-4 players take turns — steal on wrong answers</Text>
          </View>
        </TouchableOpacity>
      </View>,
    );
  }

  // ─── Multiplayer playing ─────────────────────────────────────
  if (triviaMode === 'multiplayer' && mpPhase === 'playing' && multiplayerCode) {
    return renderChrome(
      <MultiplayerTriviaGame
        code={multiplayerCode}
        onExit={handleBackToMenu}
      />,
    );
  }

  // ─── Multiplayer menu ────────────────────────────────────────
  if (triviaMode === 'multiplayer' && mpPhase === 'menu') {
    return renderChrome(
      <ScrollView style={styles.mpBody} contentContainerStyle={{ paddingBottom: 60 }}>
        <TouchableOpacity
          style={[styles.mpPrimaryButton, { marginTop: 12 }]}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            setMpPhase('create');
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create a new game"
        >
          <Text style={styles.mpPrimaryButtonText}>Create Game</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mpSecondaryButton}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            setJoinCode('');
            setJoinError(null);
            setMpPhase('join');
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Join a game by code"
        >
          <Text style={styles.mpSecondaryButtonText}>Join with Code</Text>
        </TouchableOpacity>

        <Text style={styles.activeGamesHeader}>ACTIVE GAMES</Text>
        {activeMpGames.length === 0 ? (
          <Text style={styles.emptyText}>No active games.</Text>
        ) : (
          activeMpGames.map((g) => {
            const myUid = getCurrentUser()?.uid ?? '';
            const myTurn = g.players[0] === myUid; // placeholder — real turn check uses triviaPlayers[activePlayerIndex]
            const activeName =
              g.triviaPlayers?.[g.activePlayerIndex]?.displayName ?? 'Someone';
            const isMyTurn =
              g.triviaPlayers?.[g.activePlayerIndex]?.uid === myUid;
            const status =
              g.status === 'waiting'
                ? 'In Lobby'
                : g.phase === 'final'
                  ? 'Finished'
                  : isMyTurn
                    ? 'Your turn'
                    : `${activeName}'s turn`;
            const catLabel =
              TRIVIA_CATEGORIES.find((c) => c.id === g.category)?.label ?? g.category;
            const playerCount = g.triviaPlayers?.length ?? g.players.length;
            return (
              <TouchableOpacity
                key={g.code}
                style={styles.activeGameRow}
                onPress={() => handleSelectActiveGame(g)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Resume game ${g.code}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeGameTitle}>
                    {catLabel} · {playerCount}/4
                  </Text>
                  <Text style={styles.activeGameMeta}>
                    {status} · {relativeTime(g.lastMoveAt)}
                  </Text>
                </View>
                <Text style={styles.activeGameArrow}>›</Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.backPill}
          onPress={handleBackToModeSelect}
          accessibilityRole="button"
          accessibilityLabel="Back to mode select"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>,
    );
  }

  // ─── Multiplayer create ──────────────────────────────────────
  if (triviaMode === 'multiplayer' && mpPhase === 'create') {
    const subLabel =
      mpSubcategory !== 'all' ? SUBCATEGORY_LABELS[mpSubcategory] : null;
    return renderChrome(
      <ScrollView style={styles.mpBody} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.mpCard}>
          <Text style={styles.mpCardTitle}>Create Trivia Game</Text>

          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.mpCategoryGrid}>
            {TRIVIA_CATEGORIES.map((cat) => {
              const active = mpCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.mpCategoryCard, active && styles.mpCategoryCardActive]}
                  onPress={() => handleMpCategoryTap(cat.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  accessibilityState={{ selected: active }}
                >
                  <Image source={CATEGORY_IMAGES[cat.id]} style={styles.mpCategoryIcon} resizeMode="contain" />
                  <Text
                    style={[styles.mpCategoryLabel, active && styles.mpCategoryLabelActive]}
                    numberOfLines={2}
                  >
                    {cat.label}
                  </Text>
                  {active && subLabel && (
                    <Text style={styles.mpCategorySubLabel}>{subLabel}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Questions</Text>
          <View style={styles.countRow}>
            {MP_QUESTION_COUNTS.map((n) => {
              const active = mpQuestionCount === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.countPill, active && styles.countPillActive]}
                  onPress={() => { hapticLight(); playGameSound('triviaTap'); setMpQuestionCount(n); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} questions`}
                >
                  <Text style={[styles.countPillText, active && styles.countPillTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.mpPrimaryButton, { marginTop: 16 }, creatingGame && { opacity: 0.5 }]}
            onPress={handleCreateMpGame}
            disabled={creatingGame}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create game"
          >
            <Text style={styles.mpPrimaryButtonText}>
              {creatingGame ? 'Creating…' : 'Create Game'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backPill}
          onPress={() => { hapticLight(); playGameSound('tap'); setMpPhase('menu'); }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
        <SubcategoryPickerModal
          visible={mpSubPickerVisible}
          category={mpCategory}
          onSelect={handleMpSubcategorySelect}
          onClose={() => setMpSubPickerVisible(false)}
        />
      </ScrollView>,
    );
  }

  // ─── Multiplayer join ────────────────────────────────────────
  if (triviaMode === 'multiplayer' && mpPhase === 'join') {
    return renderChrome(
      <View style={styles.mpBody}>
        <View style={styles.mpCard}>
          <Text style={styles.mpCardTitle}>Join Trivia Game</Text>
          <Text style={styles.joinHint}>Enter the 6-character code</Text>
          <TextInput
            value={joinCode}
            onChangeText={(t) => {
              setJoinError(null);
              setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="______"
            placeholderTextColor={colors.textTertiary}
            style={[styles.joinInput, joinError ? styles.joinInputError : null]}
            accessibilityLabel="Game code"
          />
          {joinError && <Text style={styles.joinErrorText}>{joinError}</Text>}
          <TouchableOpacity
            style={[styles.mpPrimaryButton, { marginTop: 20 }, joiningGame && { opacity: 0.5 }]}
            onPress={handleJoinMpGame}
            disabled={joiningGame}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Join game"
          >
            <Text style={styles.mpPrimaryButtonText}>
              {joiningGame ? 'Joining…' : 'Join Game'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backPill}
          onPress={() => { hapticLight(); playGameSound('tap'); setMpPhase('menu'); }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
      </View>,
    );
  }

  // ─── CPU Category Select ─────────────────────────────────────
  if (phase === 'category') {
    return (
      <ImageBackground source={require('../../assets/trivia-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <GameNavButtons topOffset={insets.top + 10} />
      <View style={styles.globeBadge}>
        <Image
          source={isOnline ? require('../../assets/icons/icon-globe.webp') : require('../../assets/icons/offline_globe.webp')}
          style={styles.globeImage}
          resizeMode="contain"
          accessibilityLabel={isOnline ? 'Cloud features active' : 'Offline mode'}
        />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
        <View style={styles.header} />
        <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Trivia Time</Text>
        {allSeenMessage && (
          <Text style={styles.seenNote}>{allSeenMessage}</Text>
        )}

        <View style={styles.categoryGrid}>
          {TRIVIA_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardActive]}
              onPress={() => handleCategoryTap(cat.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Play ${cat.label} trivia`}
            >
              <Image source={CATEGORY_IMAGES[cat.id]} style={styles.categoryImage} resizeMode="contain" />
              <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelActive]}>{cat.label}</Text>
              {selectedCategory === cat.id && selectedSubcategory !== 'all' && (
                <Text style={styles.subcategoryLabel}>
                  {SUBCATEGORY_LABELS[selectedSubcategory as TriviaSubcategory]}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomPanel}>
        <View style={styles.panelRow}>
          <Text style={styles.panelLabel}>Difficulty</Text>
          <View style={styles.panelPills}>
            {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pill, difficultyFilter === d && styles.pillActive]}
                onPress={() => { hapticLight(); playGameSound('triviaTap'); setDifficultyFilter(d); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={d === 'all' ? 'All difficulties' : `${d.charAt(0).toUpperCase() + d.slice(1)} difficulty`}
                accessibilityState={{ selected: difficultyFilter === d }}
              >
                <Text style={[styles.pillText, difficultyFilter === d && styles.pillTextActive]}>
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.panelRow}>
          <Text style={styles.panelLabel}>Speed</Text>
          <View style={styles.panelPills}>
            {(['relaxed', 'normal', 'blitz'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, speedOption === s && styles.pillActive]}
                onPress={() => { hapticLight(); playGameSound('triviaTap'); setSpeedOption(s); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${s.charAt(0).toUpperCase() + s.slice(1)} speed`}
                accessibilityState={{ selected: speedOption === s }}
              >
                <Text style={[styles.pillText, speedOption === s && styles.pillTextActive]}>
                  {s === 'relaxed' ? 'Relaxed' : s === 'normal' ? 'Normal' : 'Blitz'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => { hapticLight(); playGameSound('triviaTap'); startRound(selectedCategory); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Start trivia game"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={CATEGORY_IMAGES[selectedCategory]} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <Text style={styles.startBtnText}>Start Round</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backPill, { marginTop: 10 }]}
          onPress={handleBackToModeSelect}
          accessibilityRole="button"
          accessibilityLabel="Change mode"
        >
          <Text style={styles.backPillText}>← Change Mode</Text>
        </TouchableOpacity>
      </View>
      <SubcategoryPickerModal
        visible={subPickerVisible}
        category={selectedCategory}
        onSelect={handleSubcategorySelect}
        onClose={() => setSubPickerVisible(false)}
      />
      </View>
      </ImageBackground>
    );
  }

  // ─── CPU Results ─────────────────────────────────────────────
  if (phase === 'results') {
    const catInfo = TRIVIA_CATEGORIES.find((c) => c.id === selectedCategory);
    return (
      <ImageBackground source={require('../../assets/trivia-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <GameNavButtons topOffset={insets.top + 10} />
      <View style={styles.globeBadge}>
        <Image
          source={isOnline ? require('../../assets/icons/icon-globe.webp') : require('../../assets/icons/offline_globe.webp')}
          style={styles.globeImage}
          resizeMode="contain"
          accessibilityLabel={isOnline ? 'Cloud features active' : 'Offline mode'}
        />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header} />
        <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Trivia Time</Text>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Round Complete</Text>

          <Text style={styles.resultsScore}>{score}/{questions.length}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginVertical: 8 }}>
            {stars > 0 ? Array.from({ length: stars }).map((_, i) => (
              <Image key={i} source={require('../../assets/icons/icon-star.webp')} style={{ width: 24, height: 24 }} resizeMode="contain" />
            )) : <Text style={styles.resultsStars}>{'\u2014'}</Text>}
          </View>

          <View style={styles.resultsBadge}>
            <Image source={CATEGORY_IMAGES[selectedCategory]} style={{ width: 40, height: 40 }} resizeMode="contain" />
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
            onPress={() => { hapticLight(); playGameSound('triviaTap'); startRound(selectedCategory); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Play again"
          >
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              hapticLight();
              playGameSound('triviaTap');
              setPhase('category');
              setAllSeenMessage(null);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Change category"
          >
            <Text style={styles.secondaryBtnText}>Change Category</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
      </ImageBackground>
    );
  }

  // ─── CPU Gameplay ────────────────────────────────────────────
  if (!currentQuestion) return null;

  const timerColor = timeLeft <= 5 ? colors.red : colors.accent;

  return (
    <ImageBackground source={require('../../assets/trivia-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
    <GameNavButtons topOffset={insets.top + 10} onBack={handleBackFromGame} />
    <View style={styles.globeBadge}>
      <Image
        source={isOnline ? require('../../assets/icons/icon-globe.webp') : require('../../assets/icons/offline_globe.webp')}
        style={styles.globeImage}
        resizeMode="contain"
        accessibilityLabel={isOnline ? 'Cloud features active' : 'Offline mode'}
      />
    </View>
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft} />
        <View style={styles.topBarRight}>
          <Text style={styles.topBarCounter} accessibilityLiveRegion="polite">{currentIndex + 1}/{questions.length}</Text>
          {currentStreak > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Image source={require('../../assets/icons/icon-fire.webp')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.topBarStreak}>{currentStreak} streak</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

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
      <Text style={[styles.timerText, { color: timerColor }]} accessibilityLiveRegion="polite">{timeLeft}s</Text>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

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
              accessibilityRole="button"
              accessibilityLabel={answer}
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
    </View>
    </ImageBackground>
  );
}

function makeStyles(colors: ThemeColors, insets: EdgeInsets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 60,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    title: {
      fontSize: 28,
      color: colors.overlayText,
      fontFamily: FONTS.gameHeader,
    },

    seenNote: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.orange,
      fontStyle: 'italic',
      marginHorizontal: 20,
      marginBottom: 12,
    },

    globeBadge: {
      position: 'absolute',
      top: insets.top + 10,
      right: 16,
      padding: 4,
      zIndex: 10,
    },
    globeImage: {
      width: 40,
      height: 40,
    },

    // Category grid (CPU)
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 12,
      marginTop: 12,
    },
    categoryCard: {
      width: '46%',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      gap: 8,
    },
    categoryImage: {
      width: 56,
      height: 56,
    },
    categoryLabel: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.overlayText,
      textAlign: 'center',
    },
    categoryCardActive: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    categoryLabelActive: {
      color: colors.accent,
    },
    subcategoryLabel: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.accent,
      marginTop: 2,
      textAlign: 'center',
    },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: insets.bottom + 12,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.2)',
      gap: 8,
    },
    panelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    panelLabel: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.textTertiary,
      width: 62,
    },
    panelPills: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      flex: 1,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    startBtn: {
      marginTop: 4,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    startBtnText: {
      fontSize: 17,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: insets.top + 60,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    topBarCounter: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.overlayText,
    },
    topBarStreak: {
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.orange,
    },

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
      fontSize: 13,
      fontFamily: FONTS.bold,
      textAlign: 'center',
      marginTop: 6,
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

    questionContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    questionText: {
      fontSize: 20,
      fontFamily: FONTS.bold,
      color: colors.overlayText,
      textAlign: 'center',
      lineHeight: 32,
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    correctBtn: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    correctText: {
      color: colors.overlayText,
    },
    incorrectBtn: {
      backgroundColor: colors.red,
      borderColor: colors.red,
    },
    incorrectText: {
      color: colors.overlayText,
    },
    dimmedBtn: {
      opacity: 0.3,
    },
    timeoutText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.red,
      textAlign: 'center',
      marginBottom: insets.bottom + 16,
    },

    // Results
    resultsContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    resultsTitle: {
      fontSize: 26,
      fontFamily: FONTS.extraBold,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    resultsScore: {
      fontSize: 54,
      fontFamily: FONTS.extraBold,
      color: colors.accent,
    },
    resultsStars: {
      fontSize: 30,
      fontFamily: FONTS.regular,
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
    resultsBadgeText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
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
      fontSize: 20,
      fontFamily: FONTS.extraBold,
      color: colors.textPrimary,
    },
    resultsStatLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
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
      fontSize: 16,
      fontFamily: FONTS.bold,
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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textSecondary,
    },

    // Mode select
    modeBody: {
      flex: 1,
      paddingHorizontal: 16,
      gap: 12,
    },
    modeCard: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      marginTop: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    modeCardIcon: {
      width: 48,
      height: 48,
    },
    modeCardTitle: {
      fontSize: 18,
      fontFamily: FONTS.gameHeader,
      color: colors.overlayText,
    },
    modeCardSubtitle: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.overlayText + 'CC',
      marginTop: 4,
    },

    // Multiplayer shared
    mpBody: {
      flex: 1,
      paddingHorizontal: 16,
    },
    mpCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
    },
    mpCardTitle: {
      fontSize: 20,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 18,
      fontFamily: FONTS.gameHeader,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textSecondary,
      marginBottom: 10,
      opacity: 0.8,
    },
    mpPrimaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    mpPrimaryButtonText: {
      color: '#FFFFFF',
      fontFamily: FONTS.bold,
      fontSize: 15,
    },
    mpSecondaryButton: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mpSecondaryButtonText: {
      color: colors.textPrimary,
      fontFamily: FONTS.bold,
      fontSize: 15,
    },

    // MP category grid
    mpCategoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mpCategoryCard: {
      width: '48%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    mpCategoryCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '20',
    },
    mpCategoryIcon: { width: 40, height: 40 },
    mpCategoryLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    mpCategoryLabelActive: { color: colors.accent },
    mpCategorySubLabel: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.accent,
      textAlign: 'center',
    },

    // MP question count
    countRow: {
      flexDirection: 'row',
      gap: 8,
    },
    countPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    countPillActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '20',
    },
    countPillText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontFamily: FONTS.bold,
    },
    countPillTextActive: { color: colors.accent },

    // Active games list
    activeGamesHeader: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.overlayText + 'CC',
      marginTop: 20,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.overlayText + '99',
      textAlign: 'center',
      marginVertical: 12,
      fontStyle: 'italic',
    },
    activeGameRow: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    activeGameTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    activeGameMeta: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    activeGameArrow: {
      fontSize: 18,
      color: colors.textSecondary,
    },

    // Join input
    joinHint: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      textAlign: 'center',
      marginBottom: 10,
    },
    joinInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 24,
      fontFamily: FONTS.extraBold,
      letterSpacing: 4,
      textAlign: 'center',
      color: colors.textPrimary,
      borderWidth: 2,
      borderColor: colors.border,
    },
    joinInputError: { borderColor: colors.red },
    joinErrorText: {
      color: colors.red,
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      textAlign: 'center',
      marginTop: 8,
    },
    backPill: {
      alignSelf: 'center',
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    backPillText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontFamily: FONTS.semiBold,
    },
  });
}
