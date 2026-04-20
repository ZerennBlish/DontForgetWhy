import firestore from '@react-native-firebase/firestore';
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

function gamesCollection() {
  return firestore().collection(COLLECTION);
}

function requireAuthedPlayer(): MultiplayerPlayer {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const displayName = user.displayName || user.email || 'Player';
  return { uid: user.uid, displayName };
}

async function assertBelowActiveGameLimit(uid: string): Promise<void> {
  const snap = await gamesCollection()
    .where('players', 'array-contains', uid)
    .where('status', 'in', ['waiting', 'active'])
    .get();
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
    const existing = await gamesCollection().doc(candidate).get();
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

  const doc: MultiplayerGame = {
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

  await gamesCollection().doc(code).set(doc);
  return { code, gameId: code };
}

export async function joinGame(code: string): Promise<MultiplayerGame> {
  const me = requireAuthedPlayer();
  if (!isProUser()) throw new Error('Pro required to join multiplayer games');
  await assertBelowActiveGameLimit(me.uid);

  const normalized = code.trim().toUpperCase();
  const ref = gamesCollection().doc(normalized);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame | undefined;
  if (!game) throw new Error('Game not found');
  if (game.status !== 'waiting') throw new Error('Game already started');
  if (game.host.uid === me.uid) throw new Error('Cannot join your own game');

  const now = new Date().toISOString();
  const whiteUid = game.hostColor === 'w' ? game.host.uid : me.uid;
  const turn = game.type === 'trivia' ? game.host.uid : whiteUid;

  await ref.update({
    guest: me,
    players: firestore.FieldValue.arrayUnion(me.uid),
    status: 'active',
    turn,
    lastMoveAt: now,
  });

  const updated = await ref.get();
  return updated.data() as MultiplayerGame;
}

export async function makeMove(
  code: string,
  moveSan: string,
  newGameState: string,
): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = gamesCollection().doc(code);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame;
  if (game.status !== 'active') throw new Error('Game not active');
  if (game.turn !== me.uid) throw new Error('Not your turn');

  const opponent = opponentOf(game, me.uid);
  if (!opponent) throw new Error('Opponent not found');

  await ref.update({
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
  await gamesCollection().doc(code).update({
    status: 'finished',
    result,
    winner: winnerUid,
    lastMoveAt: new Date().toISOString(),
  });
}

export async function resign(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  const snap = await gamesCollection().doc(code).get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as MultiplayerGame;
  if (!game.players.includes(me.uid)) throw new Error('Not a participant');

  const opponent = opponentOf(game, me.uid);
  if (!opponent) throw new Error('Opponent not found');

  await endGame(code, 'resigned', opponent);
}

export async function offerDraw(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  await gamesCollection().doc(code).update({ drawOffer: me.uid });
}

export async function respondToDraw(
  code: string,
  accept: boolean,
): Promise<void> {
  if (accept) {
    await endGame(code, 'draw', null);
  } else {
    await gamesCollection().doc(code).update({ drawOffer: null });
  }
}

export async function requestBreak(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  await gamesCollection().doc(code).update({ pauseRequest: me.uid });
}

export async function respondToBreak(
  code: string,
  accept: boolean,
): Promise<void> {
  if (accept) {
    await gamesCollection().doc(code).update({ pauseRequest: null });
    return;
  }
  // Decline = responder forfeits (chose not to wait).
  await resign(code);
}

export function listenToGame(
  code: string,
  callback: (game: MultiplayerGame | null) => void,
): () => void {
  return gamesCollection()
    .doc(code)
    .onSnapshot((snapshot) => {
      if (snapshot && snapshot.exists()) {
        callback(snapshot.data() as MultiplayerGame);
      } else {
        callback(null);
      }
    });
}

export async function getMyGames(uid: string): Promise<MultiplayerGame[]> {
  const snap = await gamesCollection()
    .where('players', 'array-contains', uid)
    .where('status', 'in', ['waiting', 'active'])
    .orderBy('lastMoveAt', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as MultiplayerGame);
}

export async function cleanupFinishedGames(uid: string): Promise<void> {
  try {
    const snap = await gamesCollection()
      .where('players', 'array-contains', uid)
      .where('status', '==', 'finished')
      .get();
    const cutoff = Date.now() - CLEANUP_MAX_AGE_MS;
    const deletions: Promise<void>[] = [];
    for (const d of snap.docs) {
      const game = d.data() as MultiplayerGame;
      const last = Date.parse(game.lastMoveAt);
      if (Number.isFinite(last) && last < cutoff) {
        deletions.push(d.ref.delete());
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
