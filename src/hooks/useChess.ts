import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';
import {
  getAIMove,
  analyzeMove,
  DIFFICULTY_LEVELS,
  clearTranspositionTable,
} from '../services/chessAI';
import {
  saveChessGame,
  loadChessGame,
  clearChessGame,
} from '../services/chessStorage';
import { getRoastForMove, getTakeBackRoast } from '../services/blunderRoast';
import { recordChessResult } from '../services/memoryScore';
import { hapticLight, hapticHeavy, hapticError } from '../utils/haptics';

type Cell = { square: Square; type: PieceSymbol; color: Color } | null;

const AI_DELAY_MS = 400;
const ROAST_DURATION_MS = 4000;
const ANALYSIS_DEPTH = 2;

export interface UseChessReturn {
  // Game state
  game: Chess | null;
  board: Cell[][];
  playerColor: 'w' | 'b';
  difficulty: number;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  isInCheck: boolean;
  gameResult: string | null;
  winner: 'w' | 'b' | null;
  moveHistory: string[];

  // Selection
  selectedSquare: string | null;
  validMoves: string[];

  // Blunder roast
  currentRoast: string | null;
  roastSeverity: string | null;

  // Take-back
  takeBackAvailable: boolean;

  // AI thinking
  isAIThinking: boolean;
  aiTimeBudget: number;
  aiThinkStart: number;

  // Teaching mode
  teachingMode: boolean;
  setTeachingMode: (enabled: boolean) => void;
  threatenedSquares: Set<string>;
  lastMoveSquares: { from: string; to: string } | null;

  // Review mode
  isReviewing: boolean;
  reviewIndex: number;
  reviewBoard: Cell[][];
  fenHistoryLength: number;
  enterReview: () => void;
  exitReview: () => void;
  reviewStepBack: () => void;
  reviewStepForward: () => void;
  reviewGoToStart: () => void;
  reviewGoToEnd: () => void;

  // Actions
  startGame: (color: 'w' | 'b', difficultyIndex: number) => void;
  selectSquare: (square: string) => void;
  takeBack: () => void;
  resign: () => void;
  newGame: () => void;

  // Loading
  isLoading: boolean;
}

export function useChess(): UseChessReturn {
  // ── Chess instance (mutated in place) + version counter for reactivity ──
  const gameRef = useRef<Chess | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Session ID — incremented whenever the game context changes (startGame,
  // newGame, resign, unmount). Lets deferred callbacks (inner setTimeout(0)
  // inside triggerAIMove, blunder analysis) bail out if the user has moved
  // on, since those aren't tracked by clearTimers.
  const sessionIdRef = useRef(0);

  // ── FEN history for post-game review ──
  const fenHistoryRef = useRef<string[]>([]);

  // ── Review mode state ──
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  // ── Persisted state: refs for sync access, state for React rendering ──
  const playerColorRef = useRef<'w' | 'b'>('w');
  const [playerColor, setPlayerColorState] = useState<'w' | 'b'>('w');
  const difficultyRef = useRef(1);
  const [difficulty, setDifficultyState] = useState(1);
  const takeBackUsedRef = useRef(false);
  const [takeBackUsed, setTakeBackUsedState] = useState(false);
  const blunderCountRef = useRef(0);
  const startedAtRef = useRef('');

  const setPlayerColor = (c: 'w' | 'b') => {
    playerColorRef.current = c;
    setPlayerColorState(c);
  };
  const setDifficulty = (d: number) => {
    difficultyRef.current = d;
    setDifficultyState(d);
  };
  const setTakeBackUsed = (u: boolean) => {
    takeBackUsedRef.current = u;
    setTakeBackUsedState(u);
  };

  // ── Teaching mode ──
  const [teachingMode, setTeachingMode] = useState(false);
  const teachingModeRef = useRef(false);

  const setTeachingModeWrapped = useCallback((enabled: boolean) => {
    teachingModeRef.current = enabled;
    setTeachingMode(enabled);
  }, []);

  // ── UI state ──
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const [roastSeverity, setRoastSeverity] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiTimeBudget, setAiTimeBudget] = useState(0);
  const [aiThinkStart, setAiThinkStart] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winner, setWinner] = useState<'w' | 'b' | null>(null);

  // ── Timers ──
  const roastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiThinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (roastTimeoutRef.current) {
      clearTimeout(roastTimeoutRef.current);
      roastTimeoutRef.current = null;
    }
    if (aiDelayRef.current) {
      clearTimeout(aiDelayRef.current);
      aiDelayRef.current = null;
    }
    if (aiThinkRef.current) {
      clearTimeout(aiThinkRef.current);
      aiThinkRef.current = null;
    }
  }, []);

  // ── Persistence ──
  const saveCurrentGame = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    void saveChessGame({
      fen: g.fen(),
      playerColor: playerColorRef.current,
      difficulty: difficultyRef.current,
      moveHistory: g.history(),
      takeBackUsed: takeBackUsedRef.current,
      blunderCount: blunderCountRef.current,
      startedAt: startedAtRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // ── Game-over detection ──
  const checkGameOver = useCallback((g: Chess): boolean => {
    if (!g.isGameOver()) return false;
    let result: string;
    let win: 'w' | 'b' | null = null;
    let outcome: 'win' | 'loss' | 'draw';
    if (g.isCheckmate()) {
      result = 'checkmate';
      // The side to move is mated; the other side wins.
      win = g.turn() === 'w' ? 'b' : 'w';
      outcome = win === playerColorRef.current ? 'win' : 'loss';
      hapticError();
    } else if (g.isStalemate()) {
      result = 'stalemate';
      outcome = 'draw';
    } else {
      result = 'draw';
      outcome = 'draw';
    }
    setGameResult(result);
    setWinner(win);
    void clearChessGame();
    if (!teachingModeRef.current) {
      void recordChessResult(outcome, difficultyRef.current);
    }
    return true;
  }, []);

  // ── Roast display with auto-clear ──
  const showRoast = useCallback((text: string, severity: string) => {
    setCurrentRoast(text);
    setRoastSeverity(severity);
    if (roastTimeoutRef.current) clearTimeout(roastTimeoutRef.current);
    roastTimeoutRef.current = setTimeout(() => {
      roastTimeoutRef.current = null;
      setCurrentRoast(null);
      setRoastSeverity(null);
    }, ROAST_DURATION_MS);
  }, []);

  // ── AI move (setIsAIThinking + 400ms delay + compute + execute) ──
  const triggerAIMove = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.isGameOver()) return;
    const currentSession = sessionIdRef.current;
    setIsAIThinking(true);
    if (aiThinkRef.current) clearTimeout(aiThinkRef.current);
    aiThinkRef.current = setTimeout(() => {
      aiThinkRef.current = null;
      if (sessionIdRef.current !== currentSession) {
        setIsAIThinking(false);
        setAiTimeBudget(0);
        setAiThinkStart(0);
        return;
      }
      const current = gameRef.current;
      if (!current || current.isGameOver()) {
        setIsAIThinking(false);
        setAiTimeBudget(0);
        setAiThinkStart(0);
        return;
      }
      const level =
        DIFFICULTY_LEVELS[difficultyRef.current] ?? DIFFICULTY_LEVELS[1];
      const budget = level.timeLimitMs;

      // Publish the budget/start so the UI can start its progress bar
      // animation BEFORE getAIMove blocks the JS thread. The setTimeout(0)
      // yields to React so the state commits and the native animation
      // registers before the search begins.
      setAiThinkStart(Date.now());
      setAiTimeBudget(budget);
      setTimeout(() => {
        // Bail if the user resigned / started a new game / unmounted
        // while we were yielding to React.
        if (sessionIdRef.current !== currentSession) {
          setIsAIThinking(false);
          setAiTimeBudget(0);
          setAiThinkStart(0);
          return;
        }
        const c2 = gameRef.current;
        if (!c2 || c2.isGameOver()) {
          setIsAIThinking(false);
          setAiTimeBudget(0);
          setAiThinkStart(0);
          return;
        }
        const t2 = Date.now();
        const aiSan = getAIMove(c2, level);
        console.log('AI move took:', Date.now() - t2, 'ms');
        if (aiSan) {
          try {
            c2.move(aiSan);
            fenHistoryRef.current.push(c2.fen());
            if (c2.isCheck() && !c2.isCheckmate()) {
              hapticHeavy();
            }
          } catch {
            // ignore malformed AI move
          }
        }
        setIsAIThinking(false);
        setAiTimeBudget(0);
        setAiThinkStart(0);
        bump();
        saveCurrentGame();
        checkGameOver(c2);
        if (!c2.isGameOver() && c2.turn() === playerColorRef.current && !c2.isCheck()) {
          hapticLight();
        }
      }, 0);
    }, AI_DELAY_MS);
  }, [bump, saveCurrentGame, checkGameOver]);

  // ── Player move execution ──
  const makePlayerMove = useCallback(
    (from: string, to: string) => {
      const g = gameRef.current;
      if (!g) return;
      const fenBefore = g.fen();
      let applied;
      try {
        applied = g.move({ from, to, promotion: 'q' });
      } catch {
        return;
      }
      if (!applied) return;
      const moveSan = applied.san;
      fenHistoryRef.current.push(g.fen());
      if (g.isCheck() && !g.isCheckmate()) {
        hapticHeavy();
      }

      // Move applied. Render the new position immediately, then schedule the
      // AI move. runAfterInteractions ensures the board re-render completes
      // before the AI starts computing.
      bump();
      saveCurrentGame();
      const gameEnded = checkGameOver(g);

      if (!gameEnded) {
        if (aiDelayRef.current) clearTimeout(aiDelayRef.current);
        aiDelayRef.current = setTimeout(() => {
          aiDelayRef.current = null;
          InteractionManager.runAfterInteractions(() => {
            triggerAIMove();
          });
        }, AI_DELAY_MS);
      }

      // Quick blunder sanity check (shallow — runs async, doesn't block AI).
      const analysisSession = sessionIdRef.current;
      setTimeout(() => {
        if (sessionIdRef.current !== analysisSession) return;
        if (gameRef.current !== g) return;
        const analysis = analyzeMove(fenBefore, moveSan, ANALYSIS_DEPTH);
        if (
          analysis.severity === 'blunder' ||
          analysis.severity === 'catastrophe'
        ) {
          blunderCountRef.current += 1;
        }
        const roast = getRoastForMove(analysis);
        showRoast(roast.roastText, roast.severity);
        saveCurrentGame();
      }, 0);
    },
    [bump, saveCurrentGame, checkGameOver, triggerAIMove, showRoast],
  );

  // ── Tap a square ──
  const selectSquare = useCallback(
    (square: string) => {
      const g = gameRef.current;
      if (!g) return;
      if (gameResult) return;
      if (g.isGameOver()) return;
      if (isAIThinking) return;
      if (g.turn() !== playerColorRef.current) return;

      const sq = square as Square;

      // No piece selected yet.
      if (!selectedSquare) {
        const piece = g.get(sq);
        if (piece && piece.color === playerColorRef.current) {
          setSelectedSquare(square);
          const moves = g.moves({ square: sq, verbose: true });
          setValidMoves(moves.map((m) => m.to));
        }
        return;
      }

      // Tapped a valid target: execute the move.
      if (validMoves.includes(square)) {
        const from = selectedSquare;
        setSelectedSquare(null);
        setValidMoves([]);
        makePlayerMove(from, square);
        return;
      }

      // Tapped another of own pieces: switch selection.
      const piece = g.get(sq);
      if (piece && piece.color === playerColorRef.current) {
        setSelectedSquare(square);
        const moves = g.moves({ square: sq, verbose: true });
        setValidMoves(moves.map((m) => m.to));
        return;
      }

      // Tapped invalid square: deselect.
      setSelectedSquare(null);
      setValidMoves([]);
    },
    [selectedSquare, validMoves, makePlayerMove, gameResult, isAIThinking],
  );

  // ── Take-back (one per game) ──
  const takeBack = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    if (takeBackUsedRef.current) return;
    if (gameResult) return;
    if (g.isGameOver()) return;
    if (isAIThinking) return;
    if (g.turn() !== playerColorRef.current) return;
    if (g.history().length < 2) return;

    // Undo AI's last response + player's last move.
    g.undo();
    g.undo();
    // Remove the last 2 FEN entries (AI response + player move)
    if (fenHistoryRef.current.length >= 2) {
      fenHistoryRef.current = fenHistoryRef.current.slice(0, -2);
    }
    setTakeBackUsed(true);
    setSelectedSquare(null);
    setValidMoves([]);

    // Cancel any pending AI move that hasn't fired yet.
    if (aiDelayRef.current) {
      clearTimeout(aiDelayRef.current);
      aiDelayRef.current = null;
    }
    if (aiThinkRef.current) {
      clearTimeout(aiThinkRef.current);
      aiThinkRef.current = null;
    }
    setIsAIThinking(false);
    setAiTimeBudget(0);
    setAiThinkStart(0);

    showRoast(getTakeBackRoast(), 'takeBack');

    bump();
    saveCurrentGame();
  }, [bump, saveCurrentGame, showRoast, gameResult, isAIThinking]);

  // ── Resign ──
  const resign = useCallback(() => {
    if (gameResult) return;
    const g = gameRef.current;
    if (g) {
      const currentFen = g.fen();
      const lastFen = fenHistoryRef.current[fenHistoryRef.current.length - 1];
      if (currentFen !== lastFen) {
        fenHistoryRef.current.push(currentFen);
      }
    }
    sessionIdRef.current += 1;
    clearTimers();
    setIsAIThinking(false);
    setAiTimeBudget(0);
    setAiThinkStart(0);
    setGameResult('resigned');
    setWinner(playerColorRef.current === 'w' ? 'b' : 'w');
    void clearChessGame();
    if (!teachingModeRef.current) {
      void recordChessResult('loss', difficultyRef.current);
    }
  }, [gameResult, clearTimers]);

  // ── New game (returns to pre-game modal) ──
  const newGame = useCallback(() => {
    sessionIdRef.current += 1;
    clearTimers();
    gameRef.current = null;
    fenHistoryRef.current = [];
    setIsReviewing(false);
    setReviewIndex(0);
    setPlayerColor('w');
    setDifficulty(1);
    setTakeBackUsed(false);
    setTeachingModeWrapped(false);
    blunderCountRef.current = 0;
    startedAtRef.current = '';
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentRoast(null);
    setRoastSeverity(null);
    setIsAIThinking(false);
    setAiTimeBudget(0);
    setAiThinkStart(0);
    setGameResult(null);
    setWinner(null);
    bump();
    void clearChessGame();
  }, [bump, clearTimers, setTeachingModeWrapped]);

  // ── Start a new game with chosen color + difficulty ──
  const startGame = useCallback(
    (color: 'w' | 'b', difficultyIndex: number) => {
      sessionIdRef.current += 1;
      clearTimers();
      const newChess = new Chess();
      gameRef.current = newChess;
      fenHistoryRef.current = [newChess.fen()];
      const now = new Date().toISOString();
      setPlayerColor(color);
      setDifficulty(difficultyIndex);
      setTakeBackUsed(false);
      const teachingEligible = difficultyIndex <= 2;
      setTeachingModeWrapped(teachingEligible);
      blunderCountRef.current = 0;
      startedAtRef.current = now;
      setSelectedSquare(null);
      setValidMoves([]);
      setCurrentRoast(null);
      setRoastSeverity(null);
      setIsAIThinking(false);
      setAiTimeBudget(0);
      setAiThinkStart(0);
      setGameResult(null);
      setWinner(null);
      bump();

      // Persist the fresh game immediately with its known values.
      void saveChessGame({
        fen: newChess.fen(),
        playerColor: color,
        difficulty: difficultyIndex,
        moveHistory: [],
        takeBackUsed: false,
        blunderCount: 0,
        startedAt: now,
        updatedAt: now,
      });

      // Drop stale TT entries from the previous game before the AI thinks.
      clearTranspositionTable();

      // If player is black, the AI (white) moves first.
      if (color === 'b') {
        triggerAIMove();
      }
    },
    [bump, clearTimers, triggerAIMove, setTeachingModeWrapped],
  );

  // ── Review mode actions ──
  const enterReview = useCallback(() => {
    if (!gameResult) return;
    setIsReviewing(true);
    setReviewIndex(fenHistoryRef.current.length - 1);
  }, [gameResult]);

  const exitReview = useCallback(() => {
    setIsReviewing(false);
    setReviewIndex(0);
  }, []);

  const reviewStepBack = useCallback(() => {
    setReviewIndex((i) => Math.max(0, i - 1));
  }, []);

  const reviewStepForward = useCallback(() => {
    setReviewIndex((i) => Math.min(fenHistoryRef.current.length - 1, i + 1));
  }, []);

  const reviewGoToStart = useCallback(() => {
    setReviewIndex(0);
  }, []);

  const reviewGoToEnd = useCallback(() => {
    setReviewIndex(fenHistoryRef.current.length - 1);
  }, []);

  // ── Load saved game on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadChessGame();
        if (cancelled) return;
        if (saved) {
          // Replay saved SAN moves onto a fresh Chess instance so chess.js's
          // internal history is rebuilt (FEN alone doesn't carry history, and
          // we need it for move count + undo/takeback).
          let restored: Chess;
          try {
            restored = new Chess();
            const fens: string[] = [restored.fen()];
            for (const san of saved.moveHistory) {
              restored.move(san);
              fens.push(restored.fen());
            }
            // If replay drifted from the saved FEN, fall back to FEN-only.
            if (restored.fen() !== saved.fen) {
              console.warn(
                '[useChess] Move replay drifted from saved FEN, using FEN fallback',
              );
              restored = new Chess(saved.fen);
              fenHistoryRef.current = [saved.fen];
            } else {
              fenHistoryRef.current = fens;
            }
          } catch (e) {
            console.warn(
              '[useChess] Move replay failed, using FEN fallback:',
              e,
            );
            restored = new Chess(saved.fen);
            fenHistoryRef.current = [saved.fen];
          }
          gameRef.current = restored;
          setPlayerColor(saved.playerColor);
          setDifficulty(saved.difficulty);
          setTakeBackUsed(saved.takeBackUsed);
          const teachingEligible = saved.difficulty <= 2;
          setTeachingModeWrapped(teachingEligible);
          blunderCountRef.current = saved.blunderCount;
          startedAtRef.current = saved.startedAt;
          bump();
          // If it's the AI's turn in the restored position, run it.
          if (!restored.isGameOver() && restored.turn() !== saved.playerColor) {
            triggerAIMove();
          }
        }
      } catch (e) {
        console.warn('[useChess] Failed to load saved game:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unmount cleanup ──
  useEffect(
    () => () => {
      sessionIdRef.current += 1;
      clearTimers();
    },
    [clearTimers],
  );

  // ── Derived values ──
  const game = gameRef.current;

  const board = useMemo<Cell[][]>(() => {
    if (!game) return [];
    const raw = game.board();
    // For black, rotate the board 180° (reverse rows and columns) so the
    // player's pieces are on the bottom from their perspective.
    if (playerColor === 'b') {
      return raw.map((row) => [...row].reverse()).reverse();
    }
    return raw.map((row) => [...row]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, version, playerColor]);

  const reviewBoard = useMemo<Cell[][]>(() => {
    if (!isReviewing) return [];
    const fen = fenHistoryRef.current[reviewIndex];
    if (!fen) return [];
    try {
      const temp = new Chess(fen);
      const raw = temp.board();
      if (playerColor === 'b') {
        return raw.map((row) => [...row].reverse()).reverse();
      }
      return raw.map((row) => [...row]);
    } catch {
      return [];
    }
  }, [isReviewing, reviewIndex, playerColor]);

  const moveHistory = useMemo<string[]>(
    () => (game ? game.history() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, version],
  );

  const isGameOver =
    gameResult !== null || (game ? game.isGameOver() : false);
  const isInCheck = !!game && game.isCheck();
  const isPlayerTurn =
    !!game && !isAIThinking && !isGameOver && game.turn() === playerColor;
  const takeBackAvailable =
    !takeBackUsed &&
    isPlayerTurn &&
    (game ? game.history().length >= 2 : false);

  // ── Teaching mode derived data ──
  const threatenedSquares = useMemo<Set<string>>(() => {
    if (!teachingMode || !game || isAIThinking) return new Set();
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    const squares = new Set<string>();
    const b = game.board();
    for (const row of b) {
      for (const cell of row) {
        if (cell && cell.color === playerColor) {
          if (game.isAttacked(cell.square, opponentColor)) {
            squares.add(cell.square);
          }
        }
      }
    }
    return squares;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachingMode, game, version, isAIThinking, playerColor]);

  const lastMoveSquares = useMemo<{ from: string; to: string } | null>(() => {
    if (!teachingMode || !game || isAIThinking) return null;
    const history = game.history({ verbose: true });
    if (history.length === 0) return null;
    const lastMove = history[history.length - 1];
    if (lastMove.color === playerColor) return null;
    return { from: lastMove.from, to: lastMove.to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachingMode, game, version, isAIThinking, playerColor]);

  return {
    game,
    board,
    playerColor,
    difficulty,
    isPlayerTurn,
    isGameOver,
    isInCheck,
    gameResult,
    winner,
    moveHistory,
    selectedSquare,
    validMoves,
    currentRoast,
    roastSeverity,
    takeBackAvailable,
    isAIThinking,
    aiTimeBudget,
    aiThinkStart,
    teachingMode,
    setTeachingMode: setTeachingModeWrapped,
    threatenedSquares,
    lastMoveSquares,
    isReviewing,
    reviewIndex,
    reviewBoard,
    fenHistoryLength: fenHistoryRef.current.length,
    enterReview,
    exitReview,
    reviewStepBack,
    reviewStepForward,
    reviewGoToStart,
    reviewGoToEnd,
    startGame,
    selectSquare,
    takeBack,
    resign,
    newGame,
    isLoading,
  };
}
