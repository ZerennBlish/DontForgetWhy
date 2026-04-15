import { kvGet, kvSet, kvRemove } from './database';
import { isProUser } from './proStatus';

export type TrialGame = 'chess' | 'checkers' | 'trivia' | 'sudoku' | 'memoryMatch';

export const TRIAL_LIMIT = 3;

const TRIAL_GAMES: readonly TrialGame[] = [
  'chess',
  'checkers',
  'trivia',
  'sudoku',
  'memoryMatch',
] as const;

function keyFor(game: TrialGame): string {
  return `game_trial_${game}`;
}

export function getTrialCount(game: TrialGame): number {
  const raw = kvGet(keyFor(game));
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function incrementTrial(game: TrialGame): number {
  const next = getTrialCount(game) + 1;
  kvSet(keyFor(game), String(next));
  return next;
}

export function canPlayGame(game: TrialGame): boolean {
  if (isProUser()) return true;
  return getTrialCount(game) < TRIAL_LIMIT;
}

export function getTrialRemaining(game: TrialGame): number {
  if (isProUser()) return Infinity;
  return Math.max(0, TRIAL_LIMIT - getTrialCount(game));
}

export function resetTrials(): void {
  for (const game of TRIAL_GAMES) {
    kvRemove(keyFor(game));
  }
}
