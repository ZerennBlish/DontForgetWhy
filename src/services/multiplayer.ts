import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
} from '@react-native-firebase/firestore';
import { getCurrentUser } from './firebaseAuth';
import { isProUser } from './proStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameType = 'chess' | 'checkers' | 'trivia';
export type ChessColor = 'w' | 'b';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameResult =
  | 'checkmate'
  | 'stalemate'
  | 'resigned'
  | 'draw'
  | 'complete';

export interface MultiplayerPlayer {
  uid: string;
  displayName: string;
}

export interface MultiplayerGame {
  code: string;
  type: GameType;
  host: MultiplayerPlayer;
  guest: MultiplayerPlayer | null;
  hostColor: ChessColor;
  players: string[];
  status: GameStatus;
  gameState: string;
  moves: string[];
  turn: string;
  result: GameResult | null;
  winner: string | null;
  drawOffer: string | null;
  pauseRequest: string | null;
  createdAt: string;
  lastMoveAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTION = 'games';
const MAX_ACTIVE_GAMES = 5;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const UNIQUE_RETRIES = 5;
const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const CLEANUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function gamesRef() {
  return collection(getFirestore(), COLLECTION);
}

function requireAuthedPlayer(): MultiplayerPlayer {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const displayName = user.displayName || user.email || 'Player';
  return { uid: user.uid, displayName };
}

async function assertBelowActiveGameLimit(uid: string): Promise<void> {
  const q = query(
    gamesRef(),
    where('players', 'array-contains', uid),
    where('status', 'in', ['waiting', 'active']),
  );
  const snap = await getDocs(q);
  if (snap.size >= MAX_ACTIVE_GAMES) {
    throw new Error(
      'Maximum 5 active games. Finish or resign an existing game.',
    );
  }
}

function opponentOf(game: MultiplayerGame, myUid: string): string | null {
  if (game.host.uid === myUid) return game.guest?.uid ?? null;
  if (game.guest?.uid === myUid) return game.host.uid;
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET.charAt(
      Math.floor(Math.random() * CODE_ALPHABET.length),
    );
  }
  return code;
}

export async function createGame(
  type: GameType,
  hostColor: ChessColor = 'w',
): Promise<{ code: string; gameId: string }> {
  const me = requireAuthedPlayer();
  if (!isProUser()) throw new Error('Pro required to create multiplayer games');
  await assertBelowActiveGameLimit(me.uid);

  let code = '';
  for (let attempt = 0; attempt < UNIQUE_RETRIES; attempt++) {
    const candidate = generateGameCode();
    const existing = await getDoc(doc(gamesRef(), candidate));
    if (!existing.exists()) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error('Could not generate unique game code');

  const effectiveHostColor: ChessColor = type === 'trivia' ? 'w' : hostColor;
  const gameState = type === 'chess' ? STARTING_FEN : '';
  const now = new Date().toISOString();
  const turn = effectiveHostColor === 'w' ? me.uid : '';

  const gameDoc: MultiplayerGame = {
    code,
    type,
    host: me,
    guest: null,
    hostColor: effectiveHostColor,
    players: [me.uid],
    status: 'waiting',
    gameState,
    moves: [],
    turn,
    result: null,
    winner: null,
    drawOffer: null,
    pauseRequest: null,
    createdAt: now,
    lastMoveAt: now,
  };

  await setDoc(doc(gamesRef(), code), gameDoc);
  return { code, gameId: code };
}

export async function joinGame(
  code: string,
  expectedType: 'chess' | 'checkers',
): Promise<MultiplayerGame> {
  const me = requireAuthedPlayer();
  if (!isProUser()) throw new Error('Pro required to join multiplayer games');
  await assertBelowActiveGameLimit(me.uid);

  const normalized = code.trim().toUpperCase();
  const ref = doc(gamesRef(), normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame | undefined;
  if (!game) throw new Error('Game not found');
  if (game.type !== expectedType) {
    throw new Error(`This is a ${game.type} game, not ${expectedType}`);
  }
  if (game.status !== 'waiting') throw new Error('Game already started');
  if (game.host.uid === me.uid) throw new Error('Cannot join your own game');

  const now = new Date().toISOString();
  const turn = game.hostColor === 'w' ? game.host.uid : me.uid;

  await updateDoc(ref, {
    guest: me,
    players: arrayUnion(me.uid),
    status: 'active',
    turn,
    lastMoveAt: now,
  });

  const updated = await getDoc(ref);
  return updated.data() as MultiplayerGame;
}

export async function makeMove(
  code: string,
  moveSan: string,
  newGameState: string,
): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = doc(gamesRef(), code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame;
  if (game.status !== 'active') throw new Error('Game not active');
  if (game.turn !== me.uid) throw new Error('Not your turn');

  const opponent = opponentOf(game, me.uid);
  if (!opponent) throw new Error('Opponent not found');

  await updateDoc(ref, {
    gameState: newGameState,
    moves: [...game.moves, moveSan],
    turn: opponent,
    lastMoveAt: new Date().toISOString(),
    drawOffer: null,
    pauseRequest: null,
  });
}

export async function endGame(
  code: string,
  result: GameResult,
  winnerUid: string | null = null,
): Promise<void> {
  await updateDoc(doc(gamesRef(), code), {
    status: 'finished',
    result,
    winner: winnerUid,
    lastMoveAt: new Date().toISOString(),
  });
}

export async function resign(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  const snap = await getDoc(doc(gamesRef(), code));
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame;
  if (!game.players.includes(me.uid)) throw new Error('Not a participant');

  const opponent = opponentOf(game, me.uid);
  if (!opponent) throw new Error('Opponent not found');

  await endGame(code, 'resigned', opponent);
}

export async function offerDraw(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  await updateDoc(doc(gamesRef(), code), { drawOffer: me.uid });
}

export async function respondToDraw(
  code: string,
  accept: boolean,
): Promise<void> {
  if (accept) {
    await endGame(code, 'draw', null);
  } else {
    await updateDoc(doc(gamesRef(), code), { drawOffer: null });
  }
}

export async function requestBreak(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  await updateDoc(doc(gamesRef(), code), { pauseRequest: me.uid });
}

export async function respondToBreak(
  code: string,
  accept: boolean,
): Promise<void> {
  if (accept) {
    await updateDoc(doc(gamesRef(), code), { pauseRequest: null });
    return;
  }
  // Decline = responder forfeits (chose not to wait).
  await resign(code);
}

export function listenToGame(
  code: string,
  callback: (game: MultiplayerGame | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(gamesRef(), code),
    (snapshot) => {
      if (snapshot && snapshot.exists()) {
        callback(snapshot.data() as MultiplayerGame);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('[listenToGame] onSnapshot error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  );
}

export async function getMyGames(uid: string): Promise<MultiplayerGame[]> {
  const q = query(
    gamesRef(),
    where('players', 'array-contains', uid),
    where('status', 'in', ['waiting', 'active']),
    orderBy('lastMoveAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MultiplayerGame);
}

export async function cleanupFinishedGames(uid: string): Promise<void> {
  try {
    const q = query(
      gamesRef(),
      where('players', 'array-contains', uid),
      where('status', '==', 'finished'),
    );
    const snap = await getDocs(q);
    const cutoff = Date.now() - CLEANUP_MAX_AGE_MS;
    const deletions: Promise<void>[] = [];
    for (const d of snap.docs) {
      const game = d.data() as MultiplayerGame;
      const last = Date.parse(game.lastMoveAt);
      if (Number.isFinite(last) && last < cutoff) {
        deletions.push(deleteDoc(d.ref));
      }
    }
    await Promise.all(deletions);
  } catch {
    // Fire-and-forget — client deletes are blocked by rules in prod,
    // actual cleanup runs via Cloud Function.
  }
}

export function getOpponentUid(game: MultiplayerGame, myUid: string): string {
  return opponentOf(game, myUid) ?? '';
}

export function isMyTurn(game: MultiplayerGame, myUid: string): boolean {
  return game.turn === myUid;
}
