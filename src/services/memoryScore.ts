import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScoreBreakdown {
  guessWhy: number;
  memoryMatch: number;
  sudoku: number;
  dailyRiddle: number;
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

// --- Per-game scoring ---

// Memory Match par values (same as MemoryMatchScreen)
const MM_PAR: Record<string, number> = { easy: 8, medium: 12, hard: 16 };

function mmStars(moves: number, diff: string): number {
  const par = MM_PAR[diff] || 12;
  return moves < par ? 3 : moves === par ? 2 : 1;
}

function sudokuStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 3) return 2;
  return 1;
}

function scoreGuessWhy(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const wins = num(data.wins);
  const losses = num(data.losses);
  const skips = num(data.skips);
  const streak = num(data.streak);
  const totalGames = wins + losses + skips;
  if (totalGames === 0) return 0;

  const winRate = (wins / totalGames) * 15;
  const streakPts = Math.min(streak, 10) * 1.0;
  return cap(winRate + streakPts, 25);
}

function scoreMemoryMatch(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const multipliers: Record<string, number> = { easy: 2, medium: 3, hard: 4 };
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
  return cap(pts, 25);
}

function scoreSudoku(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const multipliers: Record<string, number> = { easy: 2, medium: 3, hard: 4 };
  let pts = 0;
  for (const diff of ['easy', 'medium', 'hard']) {
    const entry = data[diff] as Record<string, unknown> | undefined;
    if (entry && typeof entry === 'object') {
      const bestMistakes = num(entry.bestMistakes);
      // Only count if the entry exists (bestMistakes of 0 is valid — it means perfect)
      pts += sudokuStars(bestMistakes) * multipliers[diff];
    }
  }
  return cap(pts, 25);
}

function scoreDailyRiddle(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  const totalPlayed = num(data.totalPlayed);
  const totalCorrect = num(data.totalCorrect);
  const longestStreak = num(data.longestStreak);
  if (totalPlayed === 0) return 0;

  const accuracy = (totalCorrect / totalPlayed) * 12;
  const streakPts = Math.min(longestStreak, 13) * 1.0;
  return cap(accuracy + streakPts, 25);
}

// --- Main ---

export async function calculateCompositeScore(): Promise<CompositeScore> {
  const [gwRaw, mmRaw, sudRaw, ridRaw] = await Promise.all([
    AsyncStorage.getItem('guessWhyStats').catch(() => null),
    AsyncStorage.getItem('memoryMatchScores').catch(() => null),
    AsyncStorage.getItem('sudokuBestScores').catch(() => null),
    AsyncStorage.getItem('dailyRiddleStats').catch(() => null),
  ]);

  const gw = scoreGuessWhy(safeParseJSON(gwRaw));
  const mm = scoreMemoryMatch(safeParseJSON(mmRaw));
  const sud = scoreSudoku(safeParseJSON(sudRaw));
  const rid = scoreDailyRiddle(safeParseJSON(ridRaw));

  return {
    total: Math.round(gw + mm + sud + rid),
    breakdown: {
      guessWhy: Math.round(gw),
      memoryMatch: Math.round(mm),
      sudoku: Math.round(sud),
      dailyRiddle: Math.round(rid),
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
];

export async function resetAllScores(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_STATS_KEYS);
}
