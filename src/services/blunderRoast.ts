import type { BlunderResult } from './chessAI';
import { chessRoasts } from '../data/chessRoasts';

interface RoastResult {
  severity: BlunderResult['severity'];
  roastText: string;
  centipawnLoss: number;
  bestMove: string | null;
}

// Track recently used roasts across all severities to avoid immediate repeats.
const RECENT_LIMIT = 5;
const recentRoasts: string[] = [];

function pickFromPool(pool: string[]): string {
  if (pool.length === 0) return '';
  // Prefer roasts not in the recent list. If all are recent (tiny pool), fall back to full pool.
  const fresh = pool.filter((r) => !recentRoasts.includes(r));
  const source = fresh.length > 0 ? fresh : pool;
  const pick = source[Math.floor(Math.random() * source.length)];
  recentRoasts.push(pick);
  while (recentRoasts.length > RECENT_LIMIT) recentRoasts.shift();
  return pick;
}

/** Get a roast for a player's move based on its analysis. */
export function getRoastForMove(analysis: BlunderResult): RoastResult {
  const pool = chessRoasts[analysis.severity];
  return {
    severity: analysis.severity,
    roastText: pickFromPool(pool),
    centipawnLoss: analysis.centipawnLoss,
    bestMove: analysis.bestMove,
  };
}

/** Get a roast for using the take-back. */
export function getTakeBackRoast(): string {
  return pickFromPool(chessRoasts.takeBack);
}
