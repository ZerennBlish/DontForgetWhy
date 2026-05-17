import { getApp } from '@react-native-firebase/app';
import { getToken as getAppCheckToken } from '@react-native-firebase/app-check';
import { checkConnectivity } from '../utils/connectivity';
import type { Board, PieceColor, CheckersMove } from './checkersAI';

const CLOUD_CHECKERS_URL = 'https://checkersai-kte3lby5vq-uc.a.run.app';
const CLOUD_TIMEOUT_MS = 8000;

export interface PickRange {
  minRank: number; // 0-indexed: 0 = best
  maxRank: number; // inclusive
}

interface RankedMoveResponse {
  move: {
    from: [number, number];
    to: [number, number];
    captured: [number, number][];
    crowned: boolean;
  };
  score: number;
}

interface CloudResponse {
  moves: RankedMoveResponse[];
}

function isCloudResponse(v: unknown): v is CloudResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Partial<CloudResponse>;
  if (!Array.isArray(o.moves) || o.moves.length === 0) return false;
  for (const entry of o.moves) {
    if (typeof entry !== 'object' || entry === null) return false;
    if (typeof entry.score !== 'number') return false;
    const m = entry.move;
    if (typeof m !== 'object' || m === null) return false;
    if (
      !Array.isArray(m.from) ||
      m.from.length !== 2 ||
      typeof m.from[0] !== 'number' ||
      typeof m.from[1] !== 'number'
    ) return false;
    if (
      !Array.isArray(m.to) ||
      m.to.length !== 2 ||
      typeof m.to[0] !== 'number' ||
      typeof m.to[1] !== 'number'
    ) return false;
    if (!Array.isArray(m.captured)) return false;
    for (const c of m.captured) {
      if (!Array.isArray(c) || c.length !== 2 || typeof c[0] !== 'number' || typeof c[1] !== 'number') return false;
    }
    if (typeof m.crowned !== 'boolean') return false;
  }
  return true;
}

/** Query the Cloud Function for a ranked checkers move.
 * `pickRange` selects a rank band within the returned results (0 = best,
 * 4 = 5th best); if fewer moves are returned, both bounds clamp to the
 * last available index. Returns a CheckersMove on success, or null for
 * ANY failure (offline, timeout, malformed response, HTTP error). */
export async function getCloudCheckersMove(
  board: Board,
  turn: PieceColor,
  pickRange: PickRange,
): Promise<CheckersMove | null> {
  try {
    const online = await checkConnectivity();
    if (!online) return null;

    // Cloud Function is App Check-protected. Get a token if we can; if it
    // fails, fall through with no header — the function will reject with
    // 401 and the outer caller falls back to the local engine, which is
    // the existing behavior for any cloud failure (so no new failure mode).
    let appCheckToken = '';
    try {
      const { token } = await getAppCheckToken(getApp().appCheck());
      appCheckToken = token;
    } catch {
      // Token fetch failed — proceed without header.
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(CLOUD_CHECKERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify({ board, turn }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!isCloudResponse(data)) return null;

    const maxAvailable = data.moves.length - 1;
    const effectiveMin = Math.max(0, Math.min(pickRange.minRank, maxAvailable));
    const effectiveMax = Math.max(
      effectiveMin,
      Math.min(pickRange.maxRank, maxAvailable),
    );
    const span = effectiveMax - effectiveMin + 1;
    const rank = effectiveMin + Math.floor(Math.random() * span);

    const picked = data.moves[rank];
    if (!picked || !picked.move) return null;

    return {
      from: picked.move.from as [number, number],
      to: picked.move.to as [number, number],
      captured: picked.move.captured as [number, number][],
      crowned: picked.move.crowned,
    };
  } catch {
    return null;
  }
}
