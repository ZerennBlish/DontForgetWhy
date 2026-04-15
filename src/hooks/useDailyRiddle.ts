import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { kvGet, kvSet } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';
import { hapticMedium } from '../utils/haptics';
import { checkConnectivity } from '../utils/connectivity';
import {
  RIDDLES,
  getDailyRiddleIndex,
  type RiddleCategory,
  type Riddle,
} from '../data/riddles';
import {
  fetchMultipleOnlineRiddles,
  type OnlineRiddle,
} from '../services/riddleOnline';

type ScreenMode = 'daily' | 'browse';

interface DailyRiddleStats {
  lastPlayedDate: string;
  streak: number;
  longestStreak: number;
  totalPlayed: number;
  totalCorrect: number;
  lastPlayedCorrect: boolean;
  seenRiddleIds: number[];
}

const STATS_KEY = 'dailyRiddleStats';

const CORRECT_MESSAGES = [
  'Look at that brain actually working!',
  'You might not need this app after all.',
  'Memory flex detected.',
  "Impressive. Don't let it go to your head.",
  'One riddle down. Now try remembering your alarms.',
  'Your neurons are high-fiving each other right now.',
  "That's suspiciously good. Did you peek?",
];

const WRONG_MESSAGES = [
  'Classic you.',
  'This is why you need alarm reminders.',
  "Your memory sends its regards... wait, no it doesn't.",
  'The riddle will try not to take it personally.',
  'Even your phone remembers better than this.',
  "Don't worry, tomorrow's riddle will be easier. Probably.",
  'Your brain has left the chat.',
];

export const ALL_CATEGORIES: RiddleCategory[] = ['memory', 'classic', 'logic', 'wordplay', 'quick'];

const DEFAULT_STATS: DailyRiddleStats = {
  lastPlayedDate: '',
  streak: 0,
  longestStreak: 0,
  totalPlayed: 0,
  totalCorrect: 0,
  lastPlayedCorrect: false,
  seenRiddleIds: [],
};

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getFormattedDate(): string {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

async function loadStats(): Promise<DailyRiddleStats> {
  try {
    const data = kvGet(STATS_KEY);
    if (data) return { ...DEFAULT_STATS, ...JSON.parse(data) };
  } catch {}
  return { ...DEFAULT_STATS };
}

async function saveStats(stats: DailyRiddleStats): Promise<void> {
  kvSet(STATS_KEY, JSON.stringify(stats));
}

export function difficultyColor(diff: string) {
  if (diff === 'easy') return '#4CAF50';
  if (diff === 'medium') return '#FF9800';
  return '#F44336';
}

interface UseDailyRiddleResult {
  // Mode
  mode: ScreenMode;
  setMode: React.Dispatch<React.SetStateAction<ScreenMode>>;

  // Daily riddle
  dailyRiddle: Riddle;
  stats: DailyRiddleStats;
  revealed: boolean;
  answered: boolean;
  resultMessage: string;
  gotIt: boolean;
  alreadyPlayedToday: boolean;
  revealAnim: Animated.Value;

  // Browse
  selectedCategory: RiddleCategory | 'all';
  setSelectedCategory: React.Dispatch<React.SetStateAction<RiddleCategory | 'all'>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  expandedRiddleId: number | null;
  setExpandedRiddleId: React.Dispatch<React.SetStateAction<number | null>>;
  filteredRiddles: Riddle[];

  // Online browse
  onlineRiddles: OnlineRiddle[];
  onlineLoading: boolean;
  onlineError: boolean;
  expandedOnlineId: string | null;
  setExpandedOnlineId: React.Dispatch<React.SetStateAction<string | null>>;
  isOnlineAvailable: boolean;

  // Callbacks
  handleReveal: () => void;
  handleAnswer: (correct: boolean) => Promise<void>;
  handleFetchOnlineRiddles: () => Promise<void>;
}

export function useDailyRiddle(): UseDailyRiddleResult {
  const [mode, setMode] = useState<ScreenMode>('daily');
  const [stats, setStats] = useState<DailyRiddleStats>(DEFAULT_STATS);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [gotIt, setGotIt] = useState(false);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(false);

  // Browse mode state
  const [selectedCategory, setSelectedCategory] = useState<RiddleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRiddleId, setExpandedRiddleId] = useState<number | null>(null);

  // Online browse state
  const [onlineRiddles, setOnlineRiddles] = useState<OnlineRiddle[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState(false);
  const [expandedOnlineId, setExpandedOnlineId] = useState<string | null>(null);
  const [isOnlineAvailable, setIsOnlineAvailable] = useState(true);

  // Reveal animation
  const revealAnim = useRef(new Animated.Value(0)).current;

  // Today's riddle. Offline is the synchronous default so the UI never
  // flashes empty; a successful online fetch swaps it in (once, cached for
  // the day). Online-sourced riddles use fake ids ≥ 1,000,000 so we can
  // tell them apart from offline ids (1..RIDDLES.length) later.
  const todayStr = getTodayString();
  const [dailyRiddle, setDailyRiddle] = useState<Riddle>(
    () => RIDDLES[getDailyRiddleIndex(getTodayString())],
  );

  // Check internet connectivity on mount
  useEffect(() => {
    checkConnectivity().then(setIsOnlineAvailable);
  }, []);

  // Load stats on focus, then try online riddle (day-scoped cache).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadStats().then(async (s) => {
        if (cancelled) return;
        setStats(s);
        const playedToday = s.lastPlayedDate === todayStr;
        if (playedToday) {
          setAlreadyPlayedToday(true);
          setRevealed(true);
          setAnswered(true);
          setGotIt(s.lastPlayedCorrect);
        } else {
          setAlreadyPlayedToday(false);
          setRevealed(false);
          setAnswered(false);
          setResultMessage('');
          revealAnim.setValue(0);
        }

        // Day-scoped cache keeps the riddle stable across app opens.
        const cacheKey = `daily_riddle_${todayStr}`;
        const cachedRaw = kvGet(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (
              !cancelled &&
              cached &&
              typeof cached.question === 'string' &&
              typeof cached.answer === 'string'
            ) {
              setDailyRiddle(cached);
            }
            return;
          } catch {
            // corrupt cache — fall through and refetch
          }
        }
        // Already answered today's offline riddle before the cache existed?
        // Don't swap the riddle out from under them.
        if (playedToday) return;
        try {
          const results = await fetchMultipleOnlineRiddles(1);
          if (cancelled || results.length === 0) return;
          const o = results[0];
          const riddle: Riddle = {
            id: 1_000_000 + (Date.now() % 1_000_000),
            question: o.question,
            answer: o.answer,
            difficulty: 'medium',
            category: 'classic',
          };
          kvSet(cacheKey, JSON.stringify(riddle));
          setDailyRiddle(riddle);
        } catch {
          // Offline or API down — keep the offline default.
        }
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayStr]),
  );

  const handleReveal = useCallback(() => {
    setRevealed(true);
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  const handleAnswer = useCallback(
    async (correct: boolean) => {
      hapticMedium();
      setAnswered(true);
      setGotIt(correct);

      const msgs = correct ? CORRECT_MESSAGES : WRONG_MESSAGES;
      setResultMessage(msgs[Math.floor(Math.random() * msgs.length)]);

      const current = await loadStats();
      const yesterday = getYesterdayString();
      const newStreak =
        current.lastPlayedDate === yesterday ? current.streak + 1 :
        current.lastPlayedDate === todayStr ? current.streak :
        1;

      const prevLongest = current.longestStreak ?? current.streak ?? 0;
      const newStats: DailyRiddleStats = {
        lastPlayedDate: todayStr,
        streak: newStreak,
        longestStreak: Math.max(newStreak, prevLongest),
        totalPlayed: current.totalPlayed + 1,
        totalCorrect: current.totalCorrect + (correct ? 1 : 0),
        lastPlayedCorrect: correct,
        // Online-sourced riddles use fake ids ≥ 1,000,000; skip them so
        // the "Seen: X/RIDDLES.length" counter stays accurate.
        seenRiddleIds:
          dailyRiddle.id >= 1_000_000 ||
          current.seenRiddleIds.includes(dailyRiddle.id)
            ? current.seenRiddleIds
            : [...current.seenRiddleIds, dailyRiddle.id],
      };
      setStats(newStats);
      setAlreadyPlayedToday(true);
      await saveStats(newStats);
    },
    [todayStr, dailyRiddle.id],
  );

  const handleFetchOnlineRiddles = useCallback(async () => {
    setOnlineLoading(true);
    setOnlineError(false);
    const riddles = await fetchMultipleOnlineRiddles(5);
    if (riddles.length === 0) {
      setOnlineError(true);
    } else {
      setOnlineRiddles((prev) => [...prev, ...riddles]);
    }
    setOnlineLoading(false);
  }, []);

  // Auto-fetch fresh riddles the first time the user enters Browse mode
  // (and whenever they re-enter after it was emptied).
  useEffect(() => {
    if (mode === 'browse' && onlineRiddles.length === 0 && !onlineLoading) {
      void handleFetchOnlineRiddles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filteredRiddles = useMemo(() => {
    let list = RIDDLES;
    if (selectedCategory !== 'all') {
      list = list.filter((r) => r.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.question.toLowerCase().includes(q) ||
          r.answer.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  return {
    // Mode
    mode,
    setMode,

    // Daily riddle
    dailyRiddle,
    stats,
    revealed,
    answered,
    resultMessage,
    gotIt,
    alreadyPlayedToday,
    revealAnim,

    // Browse
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    expandedRiddleId,
    setExpandedRiddleId,
    filteredRiddles,

    // Online browse
    onlineRiddles,
    onlineLoading,
    onlineError,
    expandedOnlineId,
    setExpandedOnlineId,
    isOnlineAvailable,

    // Callbacks
    handleReveal,
    handleAnswer,
    handleFetchOnlineRiddles,
  };
}
