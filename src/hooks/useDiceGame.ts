import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CPU_NAMES,
  DiceGamePhase,
  DiceGameResult,
  DicePlayer,
  MAX_PLAYERS,
  MAX_ROLLS,
  MAX_ROUNDS,
  NUM_DICE,
  ScoringCategory,
  StealAttempt,
  STEAL_WINDOW_MS,
  YAHTZEE_SCORE,
} from '../services/diceGameTypes';
import {
  calculateCategoryScore,
  calculateTotal,
  canSteal,
  cpuDecideHold,
  cpuDecideSteal,
  cpuSelectCategory,
  createEmptyScorecard,
  getAllPossibleScores,
  getStealablePlayers,
  getUnfilledCategories,
  isYahtzee,
} from '../services/diceGameScoring';

// ── Timing constants ─────────────────────────────────────────────────────────

const CPU_TURN_START_DELAY_MS = 800;
const CPU_AFTER_ROLL_MS = 1000;
const CPU_AFTER_HOLD_MS = 600;
const CPU_BEFORE_SCORE_MS = 500;
const STEAL_TICK_MS = 100;
const CPU_STEAL_MIN_DELAY_MS = 1500;
const CPU_STEAL_MAX_DELAY_MS = 4000;

// ── State shape ──────────────────────────────────────────────────────────────

interface DiceGameState {
  players: DicePlayer[];
  currentPlayerIndex: number;
  dice: number[];
  held: boolean[];
  rollsRemaining: number;
  round: number;
  phase: DiceGamePhase;
  stealTimeRemaining: number;
  lastScoredCategory: ScoringCategory | null;
  lastScoredPlayerIndex: number | null;
  lastScoredValue: number | null;
  gameResult: DiceGameResult | null;
  lastSteal: StealAttempt | null;
}

const INITIAL_STATE: DiceGameState = {
  players: [],
  currentPlayerIndex: 0,
  dice: [0, 0, 0, 0, 0],
  held: [false, false, false, false, false],
  rollsRemaining: MAX_ROLLS,
  round: 1,
  phase: 'setup',
  stealTimeRemaining: 0,
  lastScoredCategory: null,
  lastScoredPlayerIndex: null,
  lastScoredValue: null,
  gameResult: null,
  lastSteal: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayers(
  playerCount: number,
  humanPlayerIndex: number,
): DicePlayer[] {
  const namePool = shuffleArray(CPU_NAMES);
  const players: DicePlayer[] = [];
  let cpuPick = 0;
  let cpuId = 1;
  for (let i = 0; i < playerCount; i++) {
    if (i === humanPlayerIndex) {
      players.push({
        id: 'human-0',
        name: 'You',
        type: 'human',
        scorecard: createEmptyScorecard(),
        stealUsed: false,
        stolenFrom: false,
        yahtzeeBonusCount: 0,
      });
    } else {
      players.push({
        id: `cpu-${cpuId}`,
        name: namePool[cpuPick] ?? `CPU ${cpuId}`,
        type: 'cpu',
        scorecard: createEmptyScorecard(),
        stealUsed: false,
        stolenFrom: false,
        yahtzeeBonusCount: 0,
      });
      cpuPick++;
      cpuId++;
    }
  }
  return players;
}

function cpuShouldStopRolling(
  dice: number[],
  scorecard: DicePlayer['scorecard'],
): boolean {
  if (isYahtzee(dice)) return true;
  if (calculateCategoryScore(dice, 'largeStraight') > 0) return true;
  if (
    scorecard.fullHouse === null &&
    calculateCategoryScore(dice, 'fullHouse') > 0
  ) {
    return true;
  }
  return false;
}

// ── Pure state transitions ───────────────────────────────────────────────────

function applyRoll(prev: DiceGameState): DiceGameState {
  if (prev.phase !== 'rolling') return prev;
  if (prev.rollsRemaining <= 0) return prev;
  const respectHeld = prev.rollsRemaining < MAX_ROLLS;
  const newDice = prev.dice.map((d, i) =>
    respectHeld && prev.held[i] ? d : rollSingleDie(),
  );
  return {
    ...prev,
    dice: newDice,
    rollsRemaining: prev.rollsRemaining - 1,
  };
}

function applyScore(
  prev: DiceGameState,
  category: ScoringCategory,
): DiceGameState {
  if (prev.phase !== 'rolling') return prev;
  if (prev.rollsRemaining === MAX_ROLLS) return prev;
  const player = prev.players[prev.currentPlayerIndex];
  if (!player) return prev;
  if (player.scorecard[category] !== null) return prev;

  const score = calculateCategoryScore(prev.dice, category);
  let yahtzeeBonus = player.yahtzeeBonusCount;
  if (
    isYahtzee(prev.dice) &&
    player.scorecard.yahtzee === YAHTZEE_SCORE &&
    category !== 'yahtzee'
  ) {
    yahtzeeBonus++;
  }

  const newPlayers = prev.players.map((p, i) =>
    i === prev.currentPlayerIndex
      ? {
          ...p,
          scorecard: { ...p.scorecard, [category]: score },
          yahtzeeBonusCount: yahtzeeBonus,
        }
      : p,
  );

  return {
    ...prev,
    players: newPlayers,
    phase: 'stealWindow',
    stealTimeRemaining: STEAL_WINDOW_MS,
    lastScoredCategory: category,
    lastScoredPlayerIndex: prev.currentPlayerIndex,
    lastScoredValue: score,
    lastSteal: null,
  };
}

function applyEndStealWindow(
  prev: DiceGameState,
  attempt: StealAttempt | null,
): DiceGameState {
  if (prev.phase !== 'stealWindow') return prev;

  let newPlayers = prev.players;
  if (attempt) {
    newPlayers = prev.players.map((p, i) => {
      if (i === attempt.stealerIndex) {
        return {
          ...p,
          scorecard: { ...p.scorecard, [attempt.category]: attempt.points },
          stealUsed: true,
        };
      }
      if (i === attempt.victimIndex) {
        return {
          ...p,
          scorecard: { ...p.scorecard, [attempt.category]: null },
          stolenFrom: true,
        };
      }
      return p;
    });
  }

  // Advance to the next player, skipping anyone whose scorecard is fully
  // filled. A steal can complete a player's card before round 13 ends, which
  // would otherwise soft-lock the game on their next turn (no category to
  // score). MAX_PLAYERS-bounded so a fully-full table falls through to the
  // game-over branch.
  let nextIndex = prev.currentPlayerIndex;
  let nextRound = prev.round;
  let foundScorer = false;
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const wrapping = nextIndex === newPlayers.length - 1;
    nextIndex = (nextIndex + 1) % newPlayers.length;
    if (wrapping) nextRound++;
    if (nextRound > MAX_ROUNDS) break;
    if (getUnfilledCategories(newPlayers[nextIndex].scorecard).length > 0) {
      foundScorer = true;
      break;
    }
  }

  if (nextRound > MAX_ROUNDS || !foundScorer) {
    const totals = newPlayers.map((p, i) => ({
      playerIndex: i,
      total: calculateTotal(p.scorecard, p.yahtzeeBonusCount),
    }));
    const rankings = [...totals].sort((a, b) => b.total - a.total);
    const topScore = rankings[0]?.total ?? 0;
    const winners = rankings.filter((r) => r.total === topScore);
    const isTie = winners.length > 1;
    const result: DiceGameResult = {
      winnerIndex: isTie ? -1 : rankings[0].playerIndex,
      rankings,
      isTie,
    };
    return {
      ...prev,
      players: newPlayers,
      phase: 'gameOver',
      gameResult: result,
      lastSteal: attempt,
      stealTimeRemaining: 0,
    };
  }

  return {
    ...prev,
    players: newPlayers,
    currentPlayerIndex: nextIndex,
    round: nextRound,
    phase: 'rolling',
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsRemaining: MAX_ROLLS,
    stealTimeRemaining: 0,
    lastScoredCategory: null,
    lastScoredPlayerIndex: null,
    lastScoredValue: null,
    lastSteal: attempt,
  };
}

function findHumanStealer(prev: DiceGameState): StealAttempt | null {
  if (prev.phase !== 'stealWindow') return null;
  if (
    prev.lastScoredCategory === null ||
    prev.lastScoredPlayerIndex === null ||
    prev.lastScoredValue === null
  ) {
    return null;
  }
  const victim = prev.players[prev.lastScoredPlayerIndex];
  if (!victim) return null;
  for (let i = 0; i < prev.players.length; i++) {
    if (i === prev.lastScoredPlayerIndex) continue;
    const p = prev.players[i];
    if (p.type !== 'human') continue;
    if (!canSteal(p, victim, prev.lastScoredCategory)) continue;
    return {
      stealerIndex: i,
      victimIndex: prev.lastScoredPlayerIndex,
      category: prev.lastScoredCategory,
      points: prev.lastScoredValue,
    };
  }
  return null;
}

// CPU plan ────────────────────────────────────────────────────────────────────

type CpuPlanStep =
  | { kind: 'roll'; newDice: number[] }
  | { kind: 'hold'; holds: boolean[] }
  | { kind: 'score'; category: ScoringCategory };

function planCpuTurn(
  snapshot: DiceGameState,
): { step: CpuPlanStep; at: number }[] {
  const cp = snapshot.players[snapshot.currentPlayerIndex];
  if (!cp) return [];
  const plan: { step: CpuPlanStep; at: number }[] = [];
  let cursor = 0;

  let dice = [
    rollSingleDie(),
    rollSingleDie(),
    rollSingleDie(),
    rollSingleDie(),
    rollSingleDie(),
  ];
  let rolls = MAX_ROLLS - 1;
  cursor += CPU_TURN_START_DELAY_MS;
  plan.push({ step: { kind: 'roll', newDice: dice }, at: cursor });

  while (true) {
    const holds = cpuDecideHold(dice, rolls, cp.scorecard);
    cursor += CPU_AFTER_ROLL_MS;
    plan.push({ step: { kind: 'hold', holds }, at: cursor });

    const shouldStop =
      rolls === 0 || cpuShouldStopRolling(dice, cp.scorecard);
    if (shouldStop) {
      const cat = cpuSelectCategory(dice, cp.scorecard);
      cursor += CPU_BEFORE_SCORE_MS;
      plan.push({ step: { kind: 'score', category: cat }, at: cursor });
      break;
    }

    dice = dice.map((d, i) => (holds[i] ? d : rollSingleDie()));
    rolls--;
    cursor += CPU_AFTER_HOLD_MS;
    plan.push({ step: { kind: 'roll', newDice: dice }, at: cursor });
  }

  return plan;
}

// ── Hook return type ─────────────────────────────────────────────────────────

export interface UseDiceGameReturn {
  players: DicePlayer[];
  currentPlayerIndex: number;
  dice: number[];
  held: boolean[];
  rollsRemaining: number;
  round: number;
  phase: DiceGamePhase;
  stealTimeRemaining: number;
  lastScoredCategory: ScoringCategory | null;
  lastScoredPlayerIndex: number | null;
  lastScoredValue: number | null;
  gameResult: DiceGameResult | null;
  lastSteal: StealAttempt | null;

  currentPlayer: DicePlayer | null;
  isCurrentPlayerHuman: boolean;
  possibleScores: { category: ScoringCategory; score: number }[];
  canRoll: boolean;
  canScore: boolean;
  canHumanSteal: boolean;
  stealableTargets: {
    playerIndex: number;
    category: ScoringCategory;
    points: number;
  }[];

  startGame: (playerCount: number, humanPlayerIndex: number) => void;
  rollDice: () => void;
  toggleHold: (dieIndex: number) => void;
  scoreCategory: (category: ScoringCategory) => void;
  attemptSteal: () => void;
  resetGame: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
// Source-of-truth state lives in a ref (liveStateRef) updated synchronously
// by every transition. React state is a mirror used only for rendering. This
// keeps timer callbacks deterministic even when many timers fire inside a
// single jest.advanceTimersByTime() call, where React would otherwise batch
// updates and run updater functions after the fake clock has already moved.

export function useDiceGame(): UseDiceGameReturn {
  const [reactState, setReactState] = useState<DiceGameState>(INITIAL_STATE);
  const liveStateRef = useRef<DiceGameState>(INITIAL_STATE);

  const sessionIdRef = useRef(0);
  const cpuTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stealEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stealEvalTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stealResolvedRef = useRef(false);

  const clearCpuTimeouts = useCallback(() => {
    for (const t of cpuTimeoutsRef.current) clearTimeout(t);
    cpuTimeoutsRef.current = [];
  }, []);

  const clearStealTimers = useCallback(() => {
    if (stealIntervalRef.current) {
      clearInterval(stealIntervalRef.current);
      stealIntervalRef.current = null;
    }
    if (stealEndTimeoutRef.current) {
      clearTimeout(stealEndTimeoutRef.current);
      stealEndTimeoutRef.current = null;
    }
    for (const t of stealEvalTimeoutsRef.current) clearTimeout(t);
    stealEvalTimeoutsRef.current = [];
  }, []);

  const clearAllTimers = useCallback(() => {
    clearCpuTimeouts();
    clearStealTimers();
  }, [clearCpuTimeouts, clearStealTimers]);

  // Commits a new state synchronously: updates the live ref and tells React
  // about it. Callers can immediately read the latest state via the ref.
  const commit = useCallback((next: DiceGameState) => {
    liveStateRef.current = next;
    setReactState(next);
  }, []);

  // ── Mutually-recursive schedulers (use refs to avoid TDZ on first render).

  const scheduleCpuPlanRef = useRef<
    ((snap: DiceGameState, sessionId: number) => void) | null
  >(null);
  const scheduleStealWindowRef = useRef<
    ((snap: DiceGameState, sessionId: number) => void) | null
  >(null);

  scheduleStealWindowRef.current = (
    snap: DiceGameState,
    sessionId: number,
  ) => {
    if (sessionIdRef.current !== sessionId) return;
    if (stealEndTimeoutRef.current !== null) return; // already scheduled
    stealResolvedRef.current = false;

    stealIntervalRef.current = setInterval(() => {
      if (sessionIdRef.current !== sessionId) return;
      const cur = liveStateRef.current;
      if (cur.phase !== 'stealWindow') return;
      const remaining = Math.max(0, cur.stealTimeRemaining - STEAL_TICK_MS);
      commit({ ...cur, stealTimeRemaining: remaining });
    }, STEAL_TICK_MS);

    stealEndTimeoutRef.current = setTimeout(() => {
      if (sessionIdRef.current !== sessionId) return;
      if (stealResolvedRef.current) return;
      stealResolvedRef.current = true;
      const cur = liveStateRef.current;
      if (cur.phase !== 'stealWindow') {
        clearStealTimers();
        return;
      }
      const next = applyEndStealWindow(cur, null);
      clearStealTimers();
      commit(next);
      if (next.phase === 'rolling') {
        const cp = next.players[next.currentPlayerIndex];
        if (cp?.type === 'cpu' && scheduleCpuPlanRef.current) {
          scheduleCpuPlanRef.current(next, sessionId);
        }
      }
    }, STEAL_WINDOW_MS);

    if (
      snap.lastScoredCategory !== null &&
      snap.lastScoredPlayerIndex !== null &&
      snap.lastScoredValue !== null
    ) {
      for (let i = 0; i < snap.players.length; i++) {
        if (i === snap.lastScoredPlayerIndex) continue;
        if (snap.players[i].type !== 'cpu') continue;
        const cpuIdx = i;
        const delay =
          CPU_STEAL_MIN_DELAY_MS +
          Math.random() * (CPU_STEAL_MAX_DELAY_MS - CPU_STEAL_MIN_DELAY_MS);
        const t = setTimeout(() => {
          if (sessionIdRef.current !== sessionId) return;
          if (stealResolvedRef.current) return;
          const cur = liveStateRef.current;
          if (cur.phase !== 'stealWindow') return;
          if (
            cur.lastScoredCategory === null ||
            cur.lastScoredPlayerIndex === null ||
            cur.lastScoredValue === null
          ) {
            return;
          }
          const attempt = cpuDecideSteal(
            cur.players[cpuIdx],
            cpuIdx,
            cur.players,
            cur.lastScoredCategory,
            cur.lastScoredPlayerIndex,
            cur.lastScoredValue,
          );
          if (!attempt) return;
          stealResolvedRef.current = true;
          const next = applyEndStealWindow(cur, attempt);
          clearStealTimers();
          commit(next);
          if (next.phase === 'rolling') {
            const cp = next.players[next.currentPlayerIndex];
            if (cp?.type === 'cpu' && scheduleCpuPlanRef.current) {
              scheduleCpuPlanRef.current(next, sessionId);
            }
          }
        }, delay);
        stealEvalTimeoutsRef.current.push(t);
      }
    }
  };

  scheduleCpuPlanRef.current = (
    snap: DiceGameState,
    sessionId: number,
  ) => {
    if (sessionIdRef.current !== sessionId) return;
    const cp = snap.players[snap.currentPlayerIndex];
    if (cp && getUnfilledCategories(cp.scorecard).length === 0) return;
    const plan = planCpuTurn(snap);
    for (const item of plan) {
      const step = item.step;
      const t = setTimeout(() => {
        if (sessionIdRef.current !== sessionId) return;
        const cur = liveStateRef.current;
        if (cur.phase !== 'rolling') return;
        const player = cur.players[cur.currentPlayerIndex];
        if (!player || player.type !== 'cpu') return;

        if (step.kind === 'roll') {
          if (cur.rollsRemaining <= 0) return;
          commit({
            ...cur,
            dice: step.newDice,
            rollsRemaining: cur.rollsRemaining - 1,
          });
          return;
        }
        if (step.kind === 'hold') {
          commit({ ...cur, held: step.holds });
          return;
        }
        // score
        const next = applyScore(cur, step.category);
        commit(next);
        if (
          next.phase === 'stealWindow' &&
          scheduleStealWindowRef.current
        ) {
          scheduleStealWindowRef.current(next, sessionId);
        }
      }, item.at);
      cpuTimeoutsRef.current.push(t);
    }
  };

  // ── Unmount cleanup ────────────────────────────────────────────────────────

  useEffect(
    () => () => {
      sessionIdRef.current += 1;
      clearAllTimers();
    },
    [clearAllTimers],
  );

  // ── Public actions ─────────────────────────────────────────────────────────

  const startGame = useCallback(
    (playerCount: number, humanPlayerIndex: number) => {
      sessionIdRef.current += 1;
      clearAllTimers();
      stealResolvedRef.current = false;
      const sessionId = sessionIdRef.current;
      const built = createPlayers(playerCount, humanPlayerIndex);
      const shuffled = shuffleArray(built);
      const newState: DiceGameState = {
        ...INITIAL_STATE,
        players: shuffled,
        phase: 'rolling',
        currentPlayerIndex: 0,
        round: 1,
        rollsRemaining: MAX_ROLLS,
        dice: [0, 0, 0, 0, 0],
        held: [false, false, false, false, false],
      };
      commit(newState);
      const cp = shuffled[0];
      if (cp && cp.type === 'cpu' && scheduleCpuPlanRef.current) {
        scheduleCpuPlanRef.current(newState, sessionId);
      }
    },
    [clearAllTimers, commit],
  );

  const rollDice = useCallback(() => {
    const prev = liveStateRef.current;
    const cp = prev.players[prev.currentPlayerIndex];
    if (!cp || cp.type !== 'human') return;
    const next = applyRoll(prev);
    if (next === prev) return;
    commit(next);
  }, [commit]);

  const toggleHold = useCallback(
    (dieIndex: number) => {
      const prev = liveStateRef.current;
      if (prev.phase !== 'rolling') return;
      if (prev.rollsRemaining === MAX_ROLLS) return;
      const cp = prev.players[prev.currentPlayerIndex];
      if (!cp || cp.type !== 'human') return;
      if (dieIndex < 0 || dieIndex >= NUM_DICE) return;
      const held = prev.held.map((h, i) => (i === dieIndex ? !h : h));
      commit({ ...prev, held });
    },
    [commit],
  );

  const scoreCategory = useCallback(
    (category: ScoringCategory) => {
      const prev = liveStateRef.current;
      const cp = prev.players[prev.currentPlayerIndex];
      if (!cp || cp.type !== 'human') return;
      const next = applyScore(prev, category);
      if (next === prev) return;
      commit(next);
      if (next.phase === 'stealWindow' && scheduleStealWindowRef.current) {
        scheduleStealWindowRef.current(next, sessionIdRef.current);
      }
    },
    [commit],
  );

  const attemptSteal = useCallback(() => {
    const prev = liveStateRef.current;
    const attempt = findHumanStealer(prev);
    if (!attempt) return;
    stealResolvedRef.current = true;
    const next = applyEndStealWindow(prev, attempt);
    clearStealTimers();
    commit(next);
    if (next.phase === 'rolling') {
      const cp = next.players[next.currentPlayerIndex];
      if (cp?.type === 'cpu' && scheduleCpuPlanRef.current) {
        scheduleCpuPlanRef.current(next, sessionIdRef.current);
      }
    }
  }, [clearStealTimers, commit]);

  const resetGame = useCallback(() => {
    sessionIdRef.current += 1;
    clearAllTimers();
    stealResolvedRef.current = false;
    commit(INITIAL_STATE);
  }, [clearAllTimers, commit]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentPlayer = reactState.players[reactState.currentPlayerIndex] ?? null;
  const isCurrentPlayerHuman = currentPlayer?.type === 'human';
  const possibleScores =
    reactState.phase === 'rolling' &&
    reactState.rollsRemaining < MAX_ROLLS &&
    currentPlayer
      ? getAllPossibleScores(reactState.dice, currentPlayer.scorecard)
      : [];
  const canRoll =
    reactState.phase === 'rolling' &&
    reactState.rollsRemaining > 0 &&
    isCurrentPlayerHuman;
  const canScore =
    reactState.phase === 'rolling' &&
    reactState.rollsRemaining < MAX_ROLLS &&
    isCurrentPlayerHuman;

  let canHumanSteal = false;
  let stealableTargets: {
    playerIndex: number;
    category: ScoringCategory;
    points: number;
  }[] = [];
  if (
    reactState.phase === 'stealWindow' &&
    reactState.lastScoredCategory !== null &&
    reactState.lastScoredPlayerIndex !== null
  ) {
    for (let i = 0; i < reactState.players.length; i++) {
      if (reactState.players[i].type !== 'human') continue;
      const found = getStealablePlayers(
        i,
        reactState.players,
        reactState.lastScoredCategory,
        reactState.lastScoredPlayerIndex,
      );
      if (found.length > 0) {
        canHumanSteal = true;
        stealableTargets = found;
        break;
      }
    }
  }

  return {
    players: reactState.players,
    currentPlayerIndex: reactState.currentPlayerIndex,
    dice: reactState.dice,
    held: reactState.held,
    rollsRemaining: reactState.rollsRemaining,
    round: reactState.round,
    phase: reactState.phase,
    stealTimeRemaining: reactState.stealTimeRemaining,
    lastScoredCategory: reactState.lastScoredCategory,
    lastScoredPlayerIndex: reactState.lastScoredPlayerIndex,
    lastScoredValue: reactState.lastScoredValue,
    gameResult: reactState.gameResult,
    lastSteal: reactState.lastSteal,
    currentPlayer,
    isCurrentPlayerHuman,
    possibleScores,
    canRoll,
    canScore,
    canHumanSteal,
    stealableTargets,
    startGame,
    rollDice,
    toggleHold,
    scoreCategory,
    attemptSteal,
    resetGame,
  };
}
