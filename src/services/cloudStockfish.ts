import { Chess } from 'chess.js';
import { checkConnectivity } from '../utils/connectivity';

const LICHESS_CLOUD_EVAL = 'https://lichess.org/api/cloud-eval';
const CLOUD_TIMEOUT_MS = 5000;
const MULTI_PV = 5;

export interface PickRange {
  minRank: number; // 0-indexed: 0 = best
  maxRank: number; // inclusive
}

interface CloudEvalResponse {
  fen: string;
  knodes: number;
  depth: number;
  pvs: Array<{
    moves: string;
    cp?: number;
    mate?: number;
  }>;
}

function isCloudEvalResponse(v: unknown): v is CloudEvalResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Partial<CloudEvalResponse>;
  if (!Array.isArray(o.pvs) || o.pvs.length === 0) return false;
  const first = o.pvs[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    typeof first.moves === 'string' &&
    first.moves.length >= 4
  );
}

/** Convert a UCI move (e.g. "e2e4", "e7e8q") to SAN on the given position.
 * Mutates game to apply/undo the move; returns the SAN or null if illegal. */
export function uciToSan(game: Chess, uci: string): string | null {
  if (typeof uci !== 'string' || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length >= 5 ? uci.slice(4, 5) : undefined;
  try {
    const applied = game.move({ from, to, promotion });
    if (!applied) return null;
    const san = applied.san;
    game.undo();
    return san;
  } catch {
    return null;
  }
}

/** Query the Lichess cloud eval API for a Stockfish-computed multi-PV move.
 * `pickRange` selects a rank band within the top-5 results (0 = best,
 * 4 = 5th best); if fewer PVs are returned, both bounds clamp to the
 * last available index. A single rank is picked uniformly at random from
 * the clamped range. Returns a SAN string on success, or null for ANY
 * failure (offline, 404, timeout, malformed, illegal move). */
export async function getCloudMove(
  fen: string,
  pickRange: PickRange,
): Promise<string | null> {
  try {
    const online = await checkConnectivity();
    if (!online) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${LICHESS_CLOUD_EVAL}?fen=${encodeURIComponent(fen)}&multiPv=${MULTI_PV}`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!isCloudEvalResponse(data)) return null;

    const maxAvailable = data.pvs.length - 1;
    const effectiveMin = Math.max(0, Math.min(pickRange.minRank, maxAvailable));
    const effectiveMax = Math.max(
      effectiveMin,
      Math.min(pickRange.maxRank, maxAvailable),
    );
    const span = effectiveMax - effectiveMin + 1;
    const rank = effectiveMin + Math.floor(Math.random() * span);

    const picked = data.pvs[rank];
    if (
      !picked ||
      typeof picked.moves !== 'string' ||
      picked.moves.length < 4
    ) {
      return null;
    }
    const uciMove = picked.moves.split(' ')[0];
    if (!uciMove) return null;

    const tempGame = new Chess(fen);
    return uciToSan(tempGame, uciMove);
  } catch {
    return null;
  }
}
