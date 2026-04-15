import { Chess } from 'chess.js';
import { checkConnectivity } from '../utils/connectivity';

const LICHESS_CLOUD_EVAL = 'https://lichess.org/api/cloud-eval';
const CLOUD_TIMEOUT_MS = 5000;

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

/** Query the Lichess cloud eval API for a Stockfish-computed best move.
 * Returns a SAN string on success, or null for ANY failure (offline, 404,
 * timeout, malformed response, etc.) — callers should fall back locally. */
export async function getCloudMove(fen: string): Promise<string | null> {
  try {
    const online = await checkConnectivity();
    if (!online) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${LICHESS_CLOUD_EVAL}?fen=${encodeURIComponent(fen)}&multiPv=1`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!isCloudEvalResponse(data)) return null;

    const uciMove = data.pvs[0].moves.split(' ')[0];
    if (!uciMove) return null;

    const tempGame = new Chess(fen);
    return uciToSan(tempGame, uciMove);
  } catch {
    return null;
  }
}
