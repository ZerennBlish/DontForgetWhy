import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScoreBreakdown {
  guessWhy: number;
  memoryMatch: number;
  sudoku: number;
  dailyRiddle: number;
  trivia: number;
}

export interface CompositeScore {
  total: number;
  breakdown: ScoreBreakdown;
}

// --- Helpers ---

function safeParseJSON(data: string | null): Record<string, unknown> | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {}
  return null;
}

function num(value: unknown): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function cap(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

// --- Per-game scoring (5 games x 0-20 = 100 total) ---

// Memory Match par values (same as MemoryMatchScreen)
const MM_PAR: Record<string, number> = { easy: 8, medium: 12, hard: 16 };

function mmStars(moves: number, diff: string): number {
  const par = MM_PAR[diff] || 12;
  return moves < par ? 3 : moves === par ? 2 : 1;
}

function sudokuStars(mistakes: number, hints: number = 0): number {
  let stars: number;
  if (mistakes === 0) stars = 3;
  else if (mistakes <= 3) stars = 2;
  else stars = 1;

  // Hint penalty (matches SudokuScreen logic)
  if (hints >= 3) stars = Math.max(1, stars - 1);
  else if (hints >= 1) stars = Math.max(1, Math.floor(stars - 0.5));

  return stars;
}

function scoreGuessWhy(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const wins = num(data.wins);
  const losses = num(data.losses);
  const skips = num(data.skips);
  const streak = num(data.streak);
  const totalGames = wins + losses + skips;
  if (totalGames === 0) return 0;

  const winRate = (wins / totalGames) * 12;
  const streakPts = Math.min(streak, 8) * 1.0;
  return cap(winRate + streakPts, 20);
}

function scoreMemoryMatch(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const multipliers: Record<string, number> = { easy: 1.5, medium: 2.5, hard: 3 };
  let pts = 0;
  for (const diff of ['easy', 'medium', 'hard']) {
    const entry = data[diff] as Record<string, unknown> | undefined;
    if (entry && typeof entry === 'object') {
      const bestMoves = num(entry.bestMoves);
      if (bestMoves > 0) {
        pts += mmStars(bestMoves, diff) * multipliers[diff];
      }
    }
  }
  return cap(pts, 20);
}

function scoreSudoku(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const multipliers: Record<string, number> = { easy: 1.5, medium: 2.5, hard: 3 };
  let pts = 0;
  for (const diff of ['easy', 'medium', 'hard']) {
    const entry = data[diff] as Record<string, unknown> | undefined;
    if (entry && typeof entry === 'object') {
      const bestMistakes = num(entry.bestMistakes);
      const bestHints = num(entry.bestHints);
      pts += sudokuStars(bestMistakes, bestHints) * multipliers[diff];
    }
  }
  return cap(pts, 20);
}

function scoreDailyRiddle(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const totalPlayed = num(data.totalPlayed);
  const totalCorrect = num(data.totalCorrect);
  const longestStreak = num(data.longestStreak);
  if (totalPlayed === 0) return 0;

  const accuracy = (totalCorrect / totalPlayed) * 10;
  const streakPts = Math.min(longestStreak, 10) * 1.0;
  return cap(accuracy + streakPts, 20);
}

function scoreTrivia(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const totalQuestionsAnswered = num(data.totalQuestionsAnswered);
  const totalCorrect = num(data.totalCorrect);
  const bestRoundScore = num(data.bestRoundScore);
  if (totalQuestionsAnswered === 0) return 0;

  // Accuracy: up to 10 pts
  const accuracy = (totalCorrect / totalQuestionsAnswered) * 10;

  // Best round bonus: up to 5 pts (bestRoundScore max 10 * 0.5)
  const bestRoundPts = bestRoundScore * 0.5;

  // Category breadth: up to 5 pts (8 categories * 0.625)
  let categoriesPlayed = 0;
  const catStats = data.categoryStats as Record<string, unknown> | undefined;
  if (catStats && typeof catStats === 'object') {
    for (const key of Object.keys(catStats)) {
      const cat = catStats[key] as Record<string, unknown> | undefined;
      if (cat && typeof cat === 'object' && num(cat.roundsPlayed) > 0) {
        categoriesPlayed++;
      }
    }
  }
  const breadthPts = categoriesPlayed * 0.625;

  return cap(accuracy + bestRoundPts + breadthPts, 20);
}

// --- Main ---

export async function calculateCompositeScore(): Promise<CompositeScore> {
  const [gwRaw, mmRaw, sudRaw, ridRaw, trivRaw] = await Promise.all([
    AsyncStorage.getItem('guessWhyStats').catch(() => null),
    AsyncStorage.getItem('memoryMatchScores').catch(() => null),
    AsyncStorage.getItem('sudokuBestScores').catch(() => null),
    AsyncStorage.getItem('dailyRiddleStats').catch(() => null),
    AsyncStorage.getItem('triviaStats').catch(() => null),
  ]);

  const gw = scoreGuessWhy(safeParseJSON(gwRaw));
  const mm = scoreMemoryMatch(safeParseJSON(mmRaw));
  const sud = scoreSudoku(safeParseJSON(sudRaw));
  const rid = scoreDailyRiddle(safeParseJSON(ridRaw));
  const triv = scoreTrivia(safeParseJSON(trivRaw));

  return {
    total: Math.round(gw + mm + sud + triv + rid),
    breakdown: {
      guessWhy: Math.round(gw),
      memoryMatch: Math.round(mm),
      sudoku: Math.round(sud),
      dailyRiddle: Math.round(rid),
      trivia: Math.round(triv),
    },
  };
}

export const ALL_STATS_KEYS = [
  'guessWhyStats',
  'streakCount',
  'memoryMatchScores',
  'sudokuBestScores',
  'sudokuCurrentGame',
  'dailyRiddleStats',
  'forgetLog',
  'triviaStats',
  'triviaSeenQuestions',
];

export async function resetAllScores(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_STATS_KEYS);
}
