import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  runTransaction,
  query,
  where,
  arrayUnion,
} from '@react-native-firebase/firestore';
import { generateGameCode, listenToGame } from './multiplayer';
import { isProUser } from './proStatus';
import {
  MAX_PLAYERS,
  MAX_ROLLS,
  MAX_ROUNDS,
  NUM_DICE,
  STEAL_WINDOW_MS,
  YAHTZEE_SCORE,
  type ScoringCategory,
  type Scorecard,
} from './diceGameTypes';
import {
  calculateCategoryScore,
  calculateTotal,
  canSteal,
  createEmptyScorecard,
  getUnfilledCategories,
  isYahtzee,
} from './diceGameScoring';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiceMultiplayerPlayer {
  uid: string;
  displayName: string;
}

export type DiceMultiplayerStatus = 'waiting' | 'active' | 'finished';

export interface DiceStealClaim {
  stealerUid: string;
  // Firestore serverTimestamp value — opaque blob in tests, FieldValue at runtime.
  claimedAt: unknown;
}

export interface DiceMultiplayerResult {
  winnerUid: string | null;
  rankings: { uid: string; total: number }[];
  isTie: boolean;
}

export interface DiceMultiplayerGame {
  code: string;
  type: 'dice';
  host: DiceMultiplayerPlayer;
  players: string[];
  playerDetails: DiceMultiplayerPlayer[];
  status: DiceMultiplayerStatus;

  // Player game state, keyed by uid.
  scorecards: Record<string, Scorecard>;
  yahtzeeBonuses: Record<string, number>;
  stealUsed: Record<string, boolean>;
  stolenFrom: Record<string, boolean>;

  // Turn state.
  currentPlayerUid: string;
  playerOrder: string[];
  dice: number[];
  held: boolean[];
  rollsRemaining: number;
  round: number;
  playerCount: number;

  // Steal window.
  stealWindowActive: boolean;
  stealWindowEnd: number | null;
  lastScoredCategory: string | null;
  lastScoredPlayerUid: string | null;
  lastScoredValue: number | null;
  stealClaim: DiceStealClaim | null;

  result: DiceMultiplayerResult | null;
  createdAt: string;
  lastActionAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLLECTION = 'games';
const MIN_PLAYERS = 2;
const MAX_ACTIVE_GAMES = 5;
const UNIQUE_RETRIES = 5;

// ── Re-exports ───────────────────────────────────────────────────────────────

export { listenToGame, generateGameCode };

// ── Internal helpers ─────────────────────────────────────────────────────────

function gamesRef() {
  return collection(getFirestore(), COLLECTION);
}

function nowIso(): string {
  return new Date().toISOString();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Runtime guard for a persisted dice-game document. Mirrors the
// field-presence checks in cloudCheckers.isCloudResponse: confirm the
// discriminator plus the array/object fields the service dereferences after
// every snap.data() cast, so a malformed or cross-type doc fails loudly
// instead of throwing a cryptic undefined-deref deeper in a transaction.
function isDiceGame(v: unknown): v is DiceMultiplayerGame {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Partial<DiceMultiplayerGame>;
  if (o.type !== 'dice') return false;
  if (!Array.isArray(o.players)) return false;
  if (!Array.isArray(o.playerDetails)) return false;
  if (!Array.isArray(o.playerOrder)) return false;
  if (!Array.isArray(o.dice)) return false;
  if (!Array.isArray(o.held)) return false;
  if (typeof o.scorecards !== 'object' || o.scorecards === null) return false;
  if (typeof o.host !== 'object' || o.host === null) return false;
  return true;
}

function asDiceGame(v: unknown): DiceMultiplayerGame {
  if (!isDiceGame(v)) throw new Error('Game is not a dice game');
  return v;
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

// ── Public API ───────────────────────────────────────────────────────────────

export async function createDiceGame(
  host: DiceMultiplayerPlayer,
  playerCount: number,
): Promise<{ code: string }> {
  if (!isProUser()) throw new Error('Pro required to create multiplayer games');
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`Player count must be ${MIN_PLAYERS}-${MAX_PLAYERS}`);
  }
  await assertBelowActiveGameLimit(host.uid);

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

  const now = nowIso();
  const gameDoc: DiceMultiplayerGame = {
    code,
    type: 'dice',
    host,
    players: [host.uid],
    playerDetails: [host],
    status: 'waiting',
    scorecards: {},
    yahtzeeBonuses: {},
    stealUsed: {},
    stolenFrom: {},
    currentPlayerUid: '',
    playerOrder: [],
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsRemaining: MAX_ROLLS,
    round: 1,
    playerCount,
    stealWindowActive: false,
    stealWindowEnd: null,
    lastScoredCategory: null,
    lastScoredPlayerUid: null,
    lastScoredValue: null,
    stealClaim: null,
    result: null,
    createdAt: now,
    lastActionAt: now,
  };
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) throw new Error('Could not generate unique game code');
    transaction.set(ref, gameDoc);
  });
  return { code };
}

export async function joinDiceGame(
  code: string,
  player: DiceMultiplayerPlayer,
): Promise<DiceMultiplayerGame> {
  if (!isProUser()) throw new Error('Pro required to join multiplayer games');
  const normalized = code.trim().toUpperCase();
  const ref = doc(gamesRef(), normalized);

  await assertBelowActiveGameLimit(player.uid);

  return runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');

    const game = asDiceGame(snap.data());
    if (game.status !== 'waiting') throw new Error('Game already started');
    if (game.players.includes(player.uid)) {
      throw new Error('Already in this game');
    }
    if (game.playerDetails.length >= game.playerCount) {
      throw new Error('Game is full');
    }

    const now = nowIso();
    const updatedDetails = [...game.playerDetails, player];
    transaction.update(ref, {
      players: arrayUnion(player.uid),
      playerDetails: updatedDetails,
      lastActionAt: now,
    });

    return {
      ...game,
      players: [...game.players, player.uid],
      playerDetails: updatedDetails,
      lastActionAt: now,
    };
  });
}

export async function startDiceGame(
  code: string,
  hostUid: string,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const game = asDiceGame(snap.data());
    if (game.host.uid !== hostUid) throw new Error('Only the host can start');
    if (game.playerDetails.length < MIN_PLAYERS) {
      throw new Error('Need at least 2 players');
    }
    if (game.status !== 'waiting') throw new Error('Game already started');

    const playerOrder = shuffle(game.playerDetails.map((p) => p.uid));
    const scorecards: Record<string, Scorecard> = {};
    const yahtzeeBonuses: Record<string, number> = {};
    const stealUsed: Record<string, boolean> = {};
    const stolenFrom: Record<string, boolean> = {};
    for (const uid of playerOrder) {
      scorecards[uid] = createEmptyScorecard();
      yahtzeeBonuses[uid] = 0;
      stealUsed[uid] = false;
      stolenFrom[uid] = false;
    }

    transaction.update(ref, {
      status: 'active',
      playerOrder,
      currentPlayerUid: playerOrder[0],
      scorecards,
      yahtzeeBonuses,
      stealUsed,
      stolenFrom,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsRemaining: MAX_ROLLS,
      round: 1,
      stealWindowActive: false,
      stealWindowEnd: null,
      lastScoredCategory: null,
      lastScoredPlayerUid: null,
      lastScoredValue: null,
      stealClaim: null,
      lastActionAt: nowIso(),
    });
  });
}

export async function rollDiceMultiplayer(
  code: string,
  callerUid: string,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const game = asDiceGame(snap.data());
    if (game.status !== 'active') throw new Error('Game not active');
    if (game.currentPlayerUid !== callerUid) throw new Error('Not your turn');
    if (game.rollsRemaining <= 0) throw new Error('No rolls remaining');
    if (game.stealWindowActive) throw new Error('Steal window is active');

    const respectHeld = game.rollsRemaining < MAX_ROLLS;
    const newDice = game.dice.map((d, i) =>
      respectHeld && game.held[i] ? d : rollSingleDie(),
    );
    transaction.update(ref, {
      dice: newDice,
      rollsRemaining: game.rollsRemaining - 1,
      lastActionAt: nowIso(),
    });
  });
}

export async function toggleHoldMultiplayer(
  code: string,
  callerUid: string,
  dieIndex: number,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const game = asDiceGame(snap.data());
    if (game.status !== 'active') throw new Error('Game not active');
    if (game.currentPlayerUid !== callerUid) throw new Error('Not your turn');
    if (game.rollsRemaining === MAX_ROLLS) {
      throw new Error('Must roll at least once before holding');
    }
    if (dieIndex < 0 || dieIndex >= NUM_DICE) {
      throw new Error('Invalid die index');
    }
    const held = game.held.map((h, i) => (i === dieIndex ? !h : h));
    transaction.update(ref, { held, lastActionAt: nowIso() });
  });
}

export async function scoreCategoryMultiplayer(
  code: string,
  callerUid: string,
  category: ScoringCategory,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const game = asDiceGame(snap.data());
    if (game.status !== 'active') throw new Error('Game not active');
    if (game.currentPlayerUid !== callerUid) throw new Error('Not your turn');
    if (game.rollsRemaining === MAX_ROLLS) {
      throw new Error('Must roll at least once before scoring');
    }
    const scorecard = game.scorecards[callerUid];
    if (!scorecard) throw new Error('Scorecard missing for caller');
    if (scorecard[category] !== null) {
      throw new Error('Category already filled');
    }

    const score = calculateCategoryScore(game.dice, category);
    const newScorecard: Scorecard = { ...scorecard, [category]: score };
    let bonus = game.yahtzeeBonuses[callerUid] ?? 0;
    if (
      isYahtzee(game.dice) &&
      scorecard.yahtzee === YAHTZEE_SCORE &&
      category !== 'yahtzee'
    ) {
      bonus += 1;
    }

    transaction.update(ref, {
      [`scorecards.${callerUid}`]: newScorecard,
      [`yahtzeeBonuses.${callerUid}`]: bonus,
      stealWindowActive: true,
      stealWindowEnd: Date.now() + STEAL_WINDOW_MS,
      lastScoredCategory: category,
      lastScoredPlayerUid: callerUid,
      lastScoredValue: score,
      stealClaim: null,
      lastActionAt: nowIso(),
    });
  });
}

export async function claimSteal(
  code: string,
  stealerUid: string,
): Promise<boolean> {
  // Wrap the whole claim in a Firestore transaction so two clients can't both
  // read stealClaim === null and both write. The transaction's read-then-write
  // is atomic at the document level; the second client will conflict and
  // either retry (and see the existing claim) or fail. We also re-check the
  // server clock against stealWindowEnd inside the transaction so a late
  // claim from a laggy client can't sneak in after the window closed.
  const firestore = getFirestore();
  const ref = doc(gamesRef(), code);
  return runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return false;
    const game = snap.data() as DiceMultiplayerGame;
    if (game.status !== 'active') return false;
    if (!game.stealWindowActive) return false;
    if (game.stealClaim !== null) return false; // someone else already claimed
    if (game.lastScoredCategory === null || game.lastScoredPlayerUid === null) {
      return false;
    }
    if (game.lastScoredValue === null) return false;
    if (stealerUid === game.lastScoredPlayerUid) return false;
    if (
      game.stealWindowEnd !== null &&
      Date.now() > game.stealWindowEnd
    ) {
      return false; // window already closed server-side
    }

    const category = game.lastScoredCategory as ScoringCategory;
    const stealerCard = game.scorecards[stealerUid];
    const victimCard = game.scorecards[game.lastScoredPlayerUid];
    if (!stealerCard || !victimCard) return false;

    const stealerView = {
      id: stealerUid,
      name: stealerUid,
      type: 'human' as const,
      scorecard: stealerCard,
      stealUsed: !!game.stealUsed[stealerUid],
      stolenFrom: !!game.stolenFrom[stealerUid],
      yahtzeeBonusCount: 0,
    };
    const victimView = {
      id: game.lastScoredPlayerUid,
      name: game.lastScoredPlayerUid,
      type: 'human' as const,
      scorecard: victimCard,
      stealUsed: !!game.stealUsed[game.lastScoredPlayerUid],
      stolenFrom: !!game.stolenFrom[game.lastScoredPlayerUid],
      yahtzeeBonusCount: 0,
    };
    if (!canSteal(stealerView, victimView, category)) return false;

    const points = game.lastScoredValue;
    const newStealerCard: Scorecard = { ...stealerCard, [category]: points };
    const newVictimCard: Scorecard = { ...victimCard, [category]: null };

    transaction.update(ref, {
      [`scorecards.${stealerUid}`]: newStealerCard,
      [`scorecards.${game.lastScoredPlayerUid}`]: newVictimCard,
      [`stealUsed.${stealerUid}`]: true,
      [`stolenFrom.${game.lastScoredPlayerUid}`]: true,
      stealClaim: { stealerUid, claimedAt: new Date().toISOString() },
      lastActionAt: nowIso(),
    });
    return true;
  });
}

export async function advanceTurn(
  code: string,
  callerUid: string,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const game = asDiceGame(snap.data());
    if (game.status !== 'active') return;

    // Authorized callers: the player who just scored, or the host as fallback.
    const allowed =
      callerUid === game.lastScoredPlayerUid || callerUid === game.host.uid;
    if (!allowed) throw new Error('Not authorized to advance turn');

    // Idempotency: if the turn already advanced (lastScoredPlayerUid was reset
    // to null) or the current player no longer matches the player whose turn
    // ended, another client beat us to it — bail without writing again.
    if (game.lastScoredPlayerUid === null) return;
    if (game.currentPlayerUid !== game.lastScoredPlayerUid) return;

    const order = game.playerOrder;
    if (order.length === 0) throw new Error('No player order');
    const currentIdx = order.indexOf(game.currentPlayerUid);

    // Advance to the next player, skipping anyone whose scorecard is fully
    // filled. Mirrors the single-player skip in useDiceGame.applyEndStealWindow
    // so a steal that completes a card pre-round-13 doesn't soft-lock the game.
    let nextIdx = currentIdx;
    let nextRound = game.round;
    let foundScorer = false;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const wrapping = nextIdx === order.length - 1;
      nextIdx = (nextIdx + 1) % order.length;
      if (wrapping) nextRound++;
      if (nextRound > MAX_ROUNDS) break;
      const candidateUid = order[nextIdx];
      const candidateCard =
        game.scorecards[candidateUid] ?? createEmptyScorecard();
      if (getUnfilledCategories(candidateCard).length > 0) {
        foundScorer = true;
        break;
      }
    }

    if (nextRound > MAX_ROUNDS || !foundScorer) {
      const rankings = order
        .map((uid) => ({
          uid,
          total: calculateTotal(
            game.scorecards[uid] ?? createEmptyScorecard(),
            game.yahtzeeBonuses[uid] ?? 0,
          ),
        }))
        .sort((a, b) => b.total - a.total);
      const topScore = rankings[0]?.total ?? 0;
      const winners = rankings.filter((r) => r.total === topScore);
      const isTie = winners.length > 1;
      const result: DiceMultiplayerResult = {
        winnerUid: isTie ? null : rankings[0]?.uid ?? null,
        rankings,
        isTie,
      };
      transaction.update(ref, {
        status: 'finished',
        result,
        stealWindowActive: false,
        stealWindowEnd: null,
        lastScoredCategory: null,
        lastScoredPlayerUid: null,
        lastScoredValue: null,
        stealClaim: null,
        lastActionAt: nowIso(),
      });
      return;
    }

    transaction.update(ref, {
      currentPlayerUid: order[nextIdx],
      round: nextRound,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsRemaining: MAX_ROLLS,
      stealWindowActive: false,
      stealWindowEnd: null,
      lastScoredCategory: null,
      lastScoredPlayerUid: null,
      lastScoredValue: null,
      stealClaim: null,
      lastActionAt: nowIso(),
    });
  });
}

export async function leaveDiceGame(
  code: string,
  leaverUid: string,
): Promise<void> {
  const ref = doc(gamesRef(), code);
  await runTransaction(getFirestore(), async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const game = asDiceGame(snap.data());
    if (!game.players.includes(leaverUid)) return;

    const now = nowIso();

    if (game.status === 'waiting') {
      const remainingDetails = game.playerDetails.filter(
        (p) => p.uid !== leaverUid,
      );
      const remainingPlayers = game.players.filter((u) => u !== leaverUid);

      if (remainingDetails.length === 0) {
        transaction.update(ref, {
          status: 'finished',
          playerDetails: [],
          players: [],
          lastActionAt: now,
        });
        return;
      }

      // Promote a new host if the host left.
      const updates: Record<string, unknown> = {
        playerDetails: remainingDetails,
        players: remainingPlayers,
        lastActionAt: now,
      };
      if (game.host.uid === leaverUid) {
        updates.host = remainingDetails[0];
      }
      transaction.update(ref, updates);
      return;
    }

    if (game.status === 'active') {
      // Mid-game leave = forfeit. Pick the highest-scoring remaining player.
      const remaining = game.playerOrder.filter((u) => u !== leaverUid);
      if (remaining.length === 0) {
        transaction.update(ref, { status: 'finished', lastActionAt: now });
        return;
      }
      const rankings = remaining
        .map((uid) => ({
          uid,
          total: calculateTotal(
            game.scorecards[uid] ?? createEmptyScorecard(),
            game.yahtzeeBonuses[uid] ?? 0,
          ),
        }))
        .sort((a, b) => b.total - a.total);
      const winner = rankings[0]?.uid ?? null;
      const isTie =
        rankings.length > 1 && rankings[0].total === rankings[1].total;
      const result: DiceMultiplayerResult = {
        winnerUid: isTie ? null : winner,
        rankings,
        isTie,
      };
      transaction.update(ref, {
        status: 'finished',
        result,
        lastActionAt: now,
      });
    }
  });
}
