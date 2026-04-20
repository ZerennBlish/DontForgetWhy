import firestore from '@react-native-firebase/firestore';
import { generateGameCode, listenToGame } from './multiplayer';
import { getCurrentUser } from './firebaseAuth';
import { isProUser } from './proStatus';
import {
  getAllQuestions,
  getQuestionsForCategory,
  getQuestionsForSubcategory,
} from '../data/triviaBank';
import type {
  TriviaQuestion,
  TriviaParentCategory,
  TriviaSubcategory,
} from '../types/trivia';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriviaPlayer {
  uid: string;
  displayName: string;
  score: number;
}

export interface TriviaLastAnswer {
  uid: string;
  answer: string;
  correct: boolean;
  correctAnswer: string;
}

export type TriviaStatus = 'waiting' | 'active' | 'finished';
export type TriviaPhase = 'lobby' | 'question' | 'result' | 'final';

export interface TriviaMultiplayerGame {
  code: string;
  type: 'trivia';
  host: { uid: string; displayName: string };
  // Flat UID array so existing Firestore rules + queries work unchanged.
  players: string[];
  // Rich player data (scores, names) lives separately.
  triviaPlayers: TriviaPlayer[];
  status: TriviaStatus;
  phase: TriviaPhase;

  category: TriviaParentCategory;
  subcategory: TriviaSubcategory | null;
  questionCount: number;
  questions: TriviaQuestion[];

  currentQuestionIndex: number;
  activePlayerIndex: number;
  attemptsThisQuestion: string[];
  rotationStartIndex: number;

  lastAnswer: TriviaLastAnswer | null;
  winner: string | null;

  createdAt: string;
  lastMoveAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTION = 'games';
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const MAX_ACTIVE_GAMES = 5;
const UNIQUE_RETRIES = 5;
const DEFAULT_QUESTION_COUNT = 10;

// ---------------------------------------------------------------------------
// Re-exports (shared helpers from multiplayer.ts)
// ---------------------------------------------------------------------------

export { listenToGame, generateGameCode };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function gamesCollection() {
  return firestore().collection(COLLECTION);
}

function requireAuthedPlayer(): { uid: string; displayName: string } {
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createTriviaGame(
  category: TriviaParentCategory,
  subcategory: TriviaSubcategory | null = null,
  questionCount: number = DEFAULT_QUESTION_COUNT,
): Promise<{ code: string }> {
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

  const now = nowIso();
  const hostPlayer: TriviaPlayer = {
    uid: me.uid,
    displayName: me.displayName,
    score: 0,
  };

  const doc: TriviaMultiplayerGame = {
    code,
    type: 'trivia',
    host: { uid: me.uid, displayName: me.displayName },
    players: [me.uid],
    triviaPlayers: [hostPlayer],
    status: 'waiting',
    phase: 'lobby',
    category,
    subcategory,
    questionCount,
    questions: [],
    currentQuestionIndex: 0,
    activePlayerIndex: 0,
    attemptsThisQuestion: [],
    rotationStartIndex: 0,
    lastAnswer: null,
    winner: null,
    createdAt: now,
    lastMoveAt: now,
  };

  await gamesCollection().doc(code).set(doc);
  return { code };
}

export async function joinTriviaGame(
  code: string,
): Promise<TriviaMultiplayerGame> {
  const me = requireAuthedPlayer();
  if (!isProUser()) throw new Error('Pro required to join multiplayer games');

  const normalized = code.trim().toUpperCase();
  const ref = gamesCollection().doc(normalized);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as TriviaMultiplayerGame | undefined;
  if (!game) throw new Error('Game not found');
  if (game.type !== 'trivia') throw new Error('Game is not a trivia game');
  if (game.status !== 'waiting') throw new Error('Game already started');
  if (game.triviaPlayers.length >= MAX_PLAYERS) throw new Error('Game is full');
  if (game.players.includes(me.uid)) throw new Error('Already in this game');

  await assertBelowActiveGameLimit(me.uid);

  const now = nowIso();
  const newPlayer: TriviaPlayer = {
    uid: me.uid,
    displayName: me.displayName,
    score: 0,
  };
  const updatedTriviaPlayers = [...game.triviaPlayers, newPlayer];

  await ref.update({
    players: firestore.FieldValue.arrayUnion(me.uid),
    triviaPlayers: updatedTriviaPlayers,
    lastMoveAt: now,
  });

  const updated = await ref.get();
  return updated.data() as TriviaMultiplayerGame;
}

export async function startTriviaGame(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = gamesCollection().doc(code);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as TriviaMultiplayerGame;
  if (game.host.uid !== me.uid) throw new Error('Only the host can start the game');
  if (game.triviaPlayers.length < MIN_PLAYERS) throw new Error('Need at least 2 players');
  if (game.status !== 'waiting') throw new Error('Game already started');

  // Load questions from the local bank.
  let pool: TriviaQuestion[];
  if (game.subcategory) {
    pool = getQuestionsForSubcategory(game.subcategory);
  } else if (game.category) {
    pool = getQuestionsForCategory(game.category);
  } else {
    pool = getAllQuestions();
  }

  const selected = shuffle(pool).slice(0, game.questionCount);
  if (selected.length === 0) throw new Error('No questions available');

  const now = nowIso();
  await ref.update({
    questions: selected,
    status: 'active',
    phase: 'question',
    currentQuestionIndex: 0,
    activePlayerIndex: 0,
    rotationStartIndex: 0,
    attemptsThisQuestion: [],
    lastAnswer: null,
    lastMoveAt: now,
  });
}

export async function submitAnswer(
  code: string,
  answer: string,
): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = gamesCollection().doc(code);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as TriviaMultiplayerGame;
  if (game.status !== 'active') throw new Error('Game not active');
  if (game.phase !== 'question') throw new Error('Not in question phase');

  const activePlayer = game.triviaPlayers[game.activePlayerIndex];
  if (!activePlayer || activePlayer.uid !== me.uid) {
    throw new Error('Not your turn');
  }

  const question = game.questions[game.currentQuestionIndex];
  if (!question) throw new Error('Question not found');

  const correctAnswer = question.correctAnswer;
  const correct = answer === correctAnswer;

  const newAttempts = game.attemptsThisQuestion.includes(me.uid)
    ? game.attemptsThisQuestion
    : [...game.attemptsThisQuestion, me.uid];

  const lastAnswer: TriviaLastAnswer = {
    uid: me.uid,
    answer,
    correct,
    correctAnswer,
  };

  const updates: Record<string, unknown> = {
    attemptsThisQuestion: newAttempts,
    lastAnswer,
    phase: 'result',
    lastMoveAt: nowIso(),
  };

  if (correct) {
    const newPlayers = game.triviaPlayers.map((p, i) =>
      i === game.activePlayerIndex ? { ...p, score: p.score + 1 } : p,
    );
    updates.triviaPlayers = newPlayers;
  } else {
    // Find next player who hasn't attempted this question, for steal.
    const n = game.triviaPlayers.length;
    let stealIdx = -1;
    for (let i = 1; i <= n; i++) {
      const candidate = (game.activePlayerIndex + i) % n;
      if (!newAttempts.includes(game.triviaPlayers[candidate].uid)) {
        stealIdx = candidate;
        break;
      }
    }
    if (stealIdx !== -1) {
      updates.activePlayerIndex = stealIdx;
    }
    // If no untried player remains, leave activePlayerIndex as-is;
    // advanceToNextQuestion handles moving on.
  }

  await ref.update(updates);
}

export async function advanceToNextQuestion(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = gamesCollection().doc(code);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as TriviaMultiplayerGame;
  if (game.host.uid !== me.uid) throw new Error('Only the host can advance');
  if (game.phase !== 'result') throw new Error('Not in result phase');

  const correct = game.lastAnswer?.correct ?? false;
  const allTried =
    game.attemptsThisQuestion.length >= game.triviaPlayers.length;
  const now = nowIso();

  if (correct || allTried) {
    const nextIdx = game.currentQuestionIndex + 1;
    if (nextIdx >= game.questions.length) {
      // Game over — determine winner.
      const maxScore = Math.max(...game.triviaPlayers.map((p) => p.score));
      const top = game.triviaPlayers.filter((p) => p.score === maxScore);
      const winner = top.length === 1 ? top[0].uid : null;
      await ref.update({
        phase: 'final',
        status: 'finished',
        winner,
        lastMoveAt: now,
      });
    } else {
      // Rotate to next player for the new question.
      const n = game.triviaPlayers.length;
      const newRotationStart = (game.rotationStartIndex + 1) % n;
      await ref.update({
        currentQuestionIndex: nextIdx,
        activePlayerIndex: newRotationStart,
        rotationStartIndex: newRotationStart,
        attemptsThisQuestion: [],
        lastAnswer: null,
        phase: 'question',
        lastMoveAt: now,
      });
    }
  } else {
    // Wrong + someone hasn't tried yet — activePlayerIndex was set in submitAnswer.
    await ref.update({
      lastAnswer: null,
      phase: 'question',
      lastMoveAt: now,
    });
  }
}

export async function leaveTriviaGame(code: string): Promise<void> {
  const me = requireAuthedPlayer();
  const ref = gamesCollection().doc(code);
  const snap = await ref.get();
  if (!snap.exists()) return;

  const game = snap.data() as TriviaMultiplayerGame;
  if (!game.players.includes(me.uid)) throw new Error('Not a participant');

  const now = nowIso();

  if (game.status === 'waiting') {
    if (game.host.uid === me.uid) {
      // Host aborting the lobby — mark finished (client-side deletes are blocked).
      await ref.update({
        status: 'finished',
        phase: 'final',
        winner: null,
        lastMoveAt: now,
      });
      return;
    }
    const newTriviaPlayers = game.triviaPlayers.filter(
      (p) => p.uid !== me.uid,
    );
    const newPlayers = game.players.filter((uid) => uid !== me.uid);
    await ref.update({
      triviaPlayers: newTriviaPlayers,
      players: newPlayers,
      lastMoveAt: now,
    });
    return;
  }

  if (game.status === 'active') {
    const remaining = game.triviaPlayers.filter((p) => p.uid !== me.uid);
    if (remaining.length <= 1) {
      const winner = remaining[0]?.uid ?? null;
      await ref.update({
        status: 'finished',
        phase: 'final',
        winner,
        lastMoveAt: now,
      });
      return;
    }
    // Remove from rotation and adjust indexes.
    const myIdx = game.triviaPlayers.findIndex((p) => p.uid === me.uid);
    const newPlayers = game.players.filter((uid) => uid !== me.uid);

    let newActiveIdx = game.activePlayerIndex;
    if (myIdx < game.activePlayerIndex) newActiveIdx -= 1;
    else if (myIdx === game.activePlayerIndex) {
      newActiveIdx = game.activePlayerIndex % remaining.length;
    }
    if (newActiveIdx >= remaining.length) newActiveIdx = 0;

    let newRotationIdx = game.rotationStartIndex;
    if (myIdx < game.rotationStartIndex) newRotationIdx -= 1;
    else if (myIdx === game.rotationStartIndex) {
      newRotationIdx = game.rotationStartIndex % remaining.length;
    }
    if (newRotationIdx >= remaining.length) newRotationIdx = 0;

    await ref.update({
      triviaPlayers: remaining,
      players: newPlayers,
      activePlayerIndex: newActiveIdx,
      rotationStartIndex: newRotationIdx,
      attemptsThisQuestion: game.attemptsThisQuestion.filter(
        (u) => u !== me.uid,
      ),
      lastMoveAt: now,
    });
  }
}

export async function getTriviaGames(
  uid: string,
): Promise<TriviaMultiplayerGame[]> {
  const snap = await gamesCollection()
    .where('players', 'array-contains', uid)
    .where('status', 'in', ['waiting', 'active'])
    .get();
  const all = snap.docs.map((d) => d.data() as TriviaMultiplayerGame);
  return all.filter((g) => g.type === 'trivia');
}
