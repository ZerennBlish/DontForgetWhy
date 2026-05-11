import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  advanceTurn as advanceTurnService,
  claimSteal as claimStealService,
  leaveDiceGame as leaveService,
  rollDiceMultiplayer as rollService,
  scoreCategoryMultiplayer as scoreService,
  toggleHoldMultiplayer as toggleService,
  listenToGame,
  type DiceMultiplayerGame,
  type DiceMultiplayerPlayer,
} from '../services/multiplayerDice';
import {
  calculateTotal,
  canSteal,
  createEmptyScorecard,
  getAllPossibleScores,
} from '../services/diceGameScoring';
import { MAX_ROLLS, type Scorecard, type ScoringCategory } from '../services/diceGameTypes';
import { getCurrentUser } from '../services/firebaseAuth';
import type { MultiplayerGame } from '../services/multiplayer';

interface UseMultiplayerDiceGameParams {
  gameCode: string;
  onGameEnd?: () => void;
}

export interface UseMultiplayerDiceGameReturn {
  game: DiceMultiplayerGame | null;
  isConnected: boolean;
  isHost: boolean;
  myUid: string;
  isMyTurn: boolean;
  myScorecard: Scorecard;
  myYahtzeeBonus: number;
  myTotal: number;
  currentPlayerName: string;
  possibleScores: { category: ScoringCategory; score: number }[];
  canRoll: boolean;
  canScore: boolean;
  canHumanSteal: boolean;
  stealTimeRemaining: number;
  opponents: DiceMultiplayerPlayer[];

  roll: () => void;
  toggleHold: (index: number) => void;
  score: (category: ScoringCategory) => void;
  steal: () => void;
  advance: () => void;
  leave: () => void;
}

export function useMultiplayerDiceGame({
  gameCode,
  onGameEnd,
}: UseMultiplayerDiceGameParams): UseMultiplayerDiceGameReturn {
  const myUid = useMemo(() => getCurrentUser()?.uid ?? '', []);

  const [game, setGame] = useState<DiceMultiplayerGame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stealTimeRemaining, setStealTimeRemaining] = useState(0);

  const onGameEndRef = useRef(onGameEnd);
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);
  const endedRef = useRef(false);

  const gameRef = useRef<DiceMultiplayerGame | null>(null);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // ── Firestore subscription ─────────────────────────────────────────────────

  useEffect(() => {
    const unsub = listenToGame(
      gameCode,
      (mp: MultiplayerGame | null) => {
        if (!mp) {
          setIsConnected(false);
          return;
        }
        const dice = mp as unknown as DiceMultiplayerGame;
        if (dice.type !== 'dice') {
          setIsConnected(false);
          return;
        }
        setIsConnected(true);
        setGame(dice);
        if (dice.status === 'finished' && !endedRef.current) {
          endedRef.current = true;
          onGameEndRef.current?.();
        }
      },
      () => {
        setIsConnected(false);
      },
    );
    return () => unsub();
  }, [gameCode]);

  // ── Steal window countdown + auto-advance ──────────────────────────────────
  //
  // Authority model: the scorer is the primary client that calls advanceTurn.
  // The host is a delayed fallback that fires HOST_FALLBACK_EXTRA_MS later in
  // case the scorer disconnected. The advanceTurn service is idempotent, so a
  // double-fire is harmless — but the staggered timing keeps it from happening
  // in the common case where both clients are online.

  const HOST_FALLBACK_EXTRA_MS = 3000;
  const POST_STEAL_ADVANCE_MS = 1500;

  const stealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearLocal = () => {
      if (stealIntervalRef.current) {
        clearInterval(stealIntervalRef.current);
        stealIntervalRef.current = null;
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };

    if (!game) {
      clearLocal();
      setStealTimeRemaining(0);
      return clearLocal;
    }
    if (!game.stealWindowActive || game.stealWindowEnd === null) {
      clearLocal();
      setStealTimeRemaining(0);
      return clearLocal;
    }

    // Helper: schedule advanceTurn at the given delay (ms from now) if this
    // client is one of the responsible advancers.
    const armAdvance = (baseDelayMs: number) => {
      const isScorer = myUid === game.lastScoredPlayerUid;
      const isHostFallback =
        !isScorer && myUid === game.host.uid;
      if (!isScorer && !isHostFallback) return;
      const delay = Math.max(
        0,
        baseDelayMs + (isHostFallback ? HOST_FALLBACK_EXTRA_MS : 0),
      );
      advanceTimeoutRef.current = setTimeout(() => {
        advanceTimeoutRef.current = null;
        advanceTurnService(gameCode, myUid).catch((e) => {
          console.warn('[useMultiplayerDiceGame] advanceTurn failed:', e);
        });
      }, delay);
    };

    // A steal already landed — close the local countdown and schedule the
    // turn advance after a short feedback delay so players can see the steal.
    if (game.stealClaim !== null) {
      clearLocal();
      setStealTimeRemaining(0);
      armAdvance(POST_STEAL_ADVANCE_MS);
      return clearLocal;
    }

    const end = game.stealWindowEnd;
    const update = () => {
      const left = Math.max(0, end - Date.now());
      setStealTimeRemaining(left);
      if (left <= 0 && stealIntervalRef.current) {
        clearInterval(stealIntervalRef.current);
        stealIntervalRef.current = null;
      }
    };
    update();
    stealIntervalRef.current = setInterval(update, 100);

    // Schedule advance at the natural window expiry. +50ms cushion so the
    // server's stealWindowEnd has provably elapsed by the time we call.
    armAdvance(end - Date.now() + 50);

    return clearLocal;
  }, [
    game,
    game?.stealWindowActive,
    game?.stealWindowEnd,
    game?.stealClaim,
    game?.lastScoredPlayerUid,
    game?.host.uid,
    gameCode,
    myUid,
  ]);

  // ── Lobby-cleanup on unmount ──────────────────────────────────────────────

  const lobbyRef = useRef(false);
  useEffect(() => {
    lobbyRef.current = !!game && game.status === 'waiting';
  });

  const exitedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (lobbyRef.current && !exitedRef.current) {
        exitedRef.current = true;
        leaveService(gameCode, myUid).catch(() => {});
      }
    };
  }, [gameCode, myUid]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const isHost = !!game && !!myUid && game.host.uid === myUid;
  const isMyTurn = !!game && game.currentPlayerUid === myUid;
  const myScorecard: Scorecard =
    game?.scorecards[myUid] ?? createEmptyScorecard();
  const myYahtzeeBonus = game?.yahtzeeBonuses[myUid] ?? 0;
  const myTotal = calculateTotal(myScorecard, myYahtzeeBonus);
  const currentPlayerName = useMemo(() => {
    if (!game) return '';
    const cp = game.playerDetails.find((p) => p.uid === game.currentPlayerUid);
    return cp?.displayName ?? '';
  }, [game]);
  const possibleScores =
    game &&
    game.status === 'active' &&
    isMyTurn &&
    !game.stealWindowActive &&
    game.rollsRemaining < MAX_ROLLS
      ? getAllPossibleScores(game.dice, myScorecard)
      : [];

  const canRoll =
    !!game &&
    game.status === 'active' &&
    isMyTurn &&
    !game.stealWindowActive &&
    game.rollsRemaining > 0;
  const canScore =
    !!game &&
    game.status === 'active' &&
    isMyTurn &&
    !game.stealWindowActive &&
    game.rollsRemaining < MAX_ROLLS;

  let canHumanSteal = false;
  if (
    game &&
    game.stealWindowActive &&
    game.stealClaim === null &&
    game.lastScoredCategory !== null &&
    game.lastScoredPlayerUid !== null &&
    game.lastScoredPlayerUid !== myUid
  ) {
    const stealerCard = game.scorecards[myUid];
    const victimCard = game.scorecards[game.lastScoredPlayerUid];
    if (stealerCard && victimCard) {
      const stealerView = {
        id: myUid,
        name: myUid,
        type: 'human' as const,
        scorecard: stealerCard,
        stealUsed: !!game.stealUsed[myUid],
        stolenFrom: !!game.stolenFrom[myUid],
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
      canHumanSteal = canSteal(
        stealerView,
        victimView,
        game.lastScoredCategory as ScoringCategory,
      );
    }
  }

  const opponents = useMemo<DiceMultiplayerPlayer[]>(() => {
    if (!game) return [];
    return game.playerDetails.filter((p) => p.uid !== myUid);
  }, [game, myUid]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const roll = useCallback(() => {
    rollService(gameCode, myUid).catch((e) =>
      console.warn('[useMultiplayerDiceGame] roll failed:', e),
    );
  }, [gameCode, myUid]);

  const toggleHold = useCallback(
    (index: number) => {
      toggleService(gameCode, myUid, index).catch((e) =>
        console.warn('[useMultiplayerDiceGame] toggleHold failed:', e),
      );
    },
    [gameCode, myUid],
  );

  const score = useCallback(
    (category: ScoringCategory) => {
      scoreService(gameCode, myUid, category).catch((e) =>
        console.warn('[useMultiplayerDiceGame] score failed:', e),
      );
    },
    [gameCode, myUid],
  );

  const steal = useCallback(() => {
    claimStealService(gameCode, myUid).catch((e) =>
      console.warn('[useMultiplayerDiceGame] steal failed:', e),
    );
  }, [gameCode, myUid]);

  const advance = useCallback(() => {
    advanceTurnService(gameCode, myUid).catch((e) =>
      console.warn('[useMultiplayerDiceGame] advance failed:', e),
    );
  }, [gameCode, myUid]);

  const leave = useCallback(() => {
    exitedRef.current = true;
    leaveService(gameCode, myUid).catch((e) =>
      console.warn('[useMultiplayerDiceGame] leave failed:', e),
    );
  }, [gameCode, myUid]);

  return {
    game,
    isConnected,
    isHost,
    myUid,
    isMyTurn,
    myScorecard,
    myYahtzeeBonus,
    myTotal,
    currentPlayerName,
    possibleScores,
    canRoll,
    canScore,
    canHumanSteal,
    stealTimeRemaining,
    opponents,
    roll,
    toggleHold,
    score,
    steal,
    advance,
    leave,
  };
}
