import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  TriviaStats,
  TriviaCategory,
  TriviaRoundResult,
  TriviaCategoryStats,
} from '../types/trivia';

const STATS_KEY = 'triviaStats';
const SEEN_KEY = 'triviaSeenQuestions';

const ALL_CATEGORIES: TriviaCategory[] = [
  'general',
  'science',
  'history',
  'pop_culture',
  'geography',
  'sports',
  'technology',
  'food',
];

function defaultCategoryStats(): TriviaCategoryStats {
  return { roundsPlayed: 0, questionsAnswered: 0, correct: 0, bestScore: 0 };
}

function defaultStats(): TriviaStats {
  const categoryStats = {} as Record<TriviaCategory, TriviaCategoryStats>;
  for (const cat of ALL_CATEGORIES) {
    categoryStats[cat] = defaultCategoryStats();
  }
  return {
    totalRoundsPlayed: 0,
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    bestRoundScore: 0,
    bestRoundCategory: null,
    longestStreak: 0,
    categoryStats,
  };
}

function ensureNumber(value: unknown): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function validateCategoryStats(raw: unknown): TriviaCategoryStats {
  if (!raw || typeof raw !== 'object') return defaultCategoryStats();
  const obj = raw as Record<string, unknown>;
  return {
    roundsPlayed: ensureNumber(obj.roundsPlayed),
    questionsAnswered: ensureNumber(obj.questionsAnswered),
    correct: ensureNumber(obj.correct),
    bestScore: ensureNumber(obj.bestScore),
  };
}

function validateStats(parsed: Record<string, unknown>): TriviaStats {
  const catStatsRaw = parsed.categoryStats as Record<string, unknown> | undefined;
  const categoryStats = {} as Record<TriviaCategory, TriviaCategoryStats>;
  for (const cat of ALL_CATEGORIES) {
    categoryStats[cat] = catStatsRaw
      ? validateCategoryStats(catStatsRaw[cat])
      : defaultCategoryStats();
  }

  const bestCat = parsed.bestRoundCategory;
  const validCat = typeof bestCat === 'string' && ALL_CATEGORIES.includes(bestCat as TriviaCategory)
    ? (bestCat as TriviaCategory)
    : null;

  return {
    totalRoundsPlayed: ensureNumber(parsed.totalRoundsPlayed),
    totalQuestionsAnswered: ensureNumber(parsed.totalQuestionsAnswered),
    totalCorrect: ensureNumber(parsed.totalCorrect),
    bestRoundScore: ensureNumber(parsed.bestRoundScore),
    bestRoundCategory: validCat,
    longestStreak: ensureNumber(parsed.longestStreak),
    categoryStats,
  };
}

export async function getTriviaStats(): Promise<TriviaStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return validateStats(JSON.parse(raw));
  } catch {
    return defaultStats();
  }
}

export async function saveTriviaStats(stats: TriviaStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export async function recordTriviaRound(result: TriviaRoundResult): Promise<TriviaStats> {
  const stats = await getTriviaStats();

  stats.totalRoundsPlayed += 1;
  stats.totalQuestionsAnswered += result.totalQuestions;
  stats.totalCorrect += result.correctAnswers;

  if (result.correctAnswers > stats.bestRoundScore) {
    stats.bestRoundScore = result.correctAnswers;
    stats.bestRoundCategory = result.category;
  }

  if (result.longestStreak > stats.longestStreak) {
    stats.longestStreak = result.longestStreak;
  }

  // Update category stats
  const cat = stats.categoryStats[result.category];
  cat.roundsPlayed += 1;
  cat.questionsAnswered += result.totalQuestions;
  cat.correct += result.correctAnswers;
  if (result.correctAnswers > cat.bestScore) {
    cat.bestScore = result.correctAnswers;
  }

  await saveTriviaStats(stats);
  return stats;
}

type SeenData = Record<string, string[]>;

async function loadSeenData(): Promise<SeenData> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Migration: old format was a flat string array — treat as 'general'
    if (Array.isArray(parsed)) {
      const migrated: SeenData = { general: parsed.filter((id) => typeof id === 'string') };
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (parsed && typeof parsed === 'object') return parsed as SeenData;
    return {};
  } catch {
    return {};
  }
}

async function saveSeenData(data: SeenData): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(data));
  } catch {}
}

export async function getSeenQuestionIds(category: string): Promise<string[]> {
  const data = await loadSeenData();
  const ids = data[category];
  if (!Array.isArray(ids)) return [];
  return ids.filter((id) => typeof id === 'string');
}

export async function addSeenQuestionIds(category: string, ids: string[]): Promise<void> {
  try {
    const data = await loadSeenData();
    const current = Array.isArray(data[category]) ? data[category] : [];
    const set = new Set(current);
    for (const id of ids) set.add(id);
    data[category] = [...set];
    await saveSeenData(data);
  } catch {}
}

export async function resetSeenQuestions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY);
  } catch {}
}

export async function resetSeenQuestionsForCategory(category: string): Promise<void> {
  try {
    const data = await loadSeenData();
    delete data[category];
    if (Object.keys(data).length === 0) {
      await AsyncStorage.removeItem(SEEN_KEY);
    } else {
      await saveSeenData(data);
    }
  } catch {}
}
