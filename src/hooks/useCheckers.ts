import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import {
  Board,
  PieceColor,
  CheckersMove,
  createInitialBoard,
  generateMoves,
  applyMove,
  getGameStatus,
  getAIMove,
  clearTranspositionTable,
  DIFFICULTY_LEVELS,
} from '../services/checkersAI';
import {
  saveCheckersGame,
  loadCheckersGame,
  clearCheckersGame,
} from '../services/checkersStorage';
import { recordCheckersResult } from '../services/memoryScore';
import { getCloudCheckersMove } from '../services/cloudCheckers';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';

const AI_DELAY_MS = 400;

interface UseCheckersReturn {
  // Game state
  board: Board;
  playerColor: PieceColor;
  turn: PieceColor;
  difficulty: number;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  gameResult: 'red_wins' | 'black_wins' | 'resigned' | null;
  winner: PieceColor | null;
  moveCount: number;

  // Selection
  selectedSquare: [number, number] | null;
  validMoveTargets: [number, number][];

  // AI thinking
  isAIThinking: boolean;

  // Piece counts
  redCount: number;
  blackCount: number;
  redKings: number;
  blackKings: number;

  // Actions
  startGame: (color: PieceColor, difficultyIndex: number) => void;
  selectSquare: (row: number, col: number) => void;
  resign: () => void;
  newGame: () => void;

  // Loading
  isLoading: boolean;
}

export function useCheckers(): UseCheckersReturn {
  // ── Board ref + version counter for reactivity ──
  const boardRef = useRef<Board | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Session ID — deferred callbacks bail if session changed.
  const sessionIdRef = useRef(0);

  // ── Persisted state: refs for sync access, state for rendering ──
  const playerColorRef = useRef<PieceColor>('r');
  const [playerColor, setPlayerColorState] = useState<PieceColor>('r');
  const turnRef = useRef<PieceColor>('r');
  const [turn, setTurnState] = useState<PieceColor>('r');
  const difficultyRef = useRef(1);
  const [difficulty, setDifficultyState] = useState(1);
  const moveCountRef = useRef(0);
  const [moveCount, setMoveCountState] = useState(0);
  const startedAtRef = useRef('');

  const setPlayerColor = (c: PieceColor) => {
    playerColorRef.current = c;
    setPlayerColorState(c);
  };
  const setTurn = (t: PieceColor) => {
    turnRef.current = t;
    setTurnState(t);
  };
  const setDifficulty = (d: number) => {
    difficultyRef.current = d;
    setDifficultyState(d);
  };
  const setMoveCount = (n: number) => {
    moveCountRef.current = n;
    setMoveCountState(n);
  };

  // ── UI state ──
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoveTargets, setValidMoveTargets] = useState<[number, number][]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gameResult, setGameResult] = useState<'red_wins' | 'black_wins' | 'resigned' | null>(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);

  // ── Timers ──
  const aiDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiThinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
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
    const b = boardRef.current;
    if (!b) return;
    void saveCheckersGame({
      board: JSON.stringify(b),
      turn: turnRef.current,
      playerColor: playerColorRef.current,
      difficulty: difficultyRef.current,
      moveCount: moveCountRef.current,
      startedAt: startedAtRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // ── Game-over detection ──
  const checkGameOver = useCallback((b: Board, nextTurn: PieceColor): boolean => {
    const status = getGameStatus(b, nextTurn);
    if (status === 'playing') return false;
    setGameResult(status);
    setWinner(status === 'red_wins' ? 'r' : 'b');
    void clearCheckersGame();
    const win = status === 'red_wins' ? 'r' : 'b';
    const outcome = win === playerColorRef.current ? 'win' : 'loss';
    playGameSound(outcome === 'win' ? 'gameWin' : 'gameLoss');
    void recordCheckersResult(outcome, difficultyRef.current);
    return true;
  }, []);

  // ── AI move ──
  const triggerAIMove = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    const currentSession = sessionIdRef.current;
    setIsAIThinking(true);
    if (aiThinkRef.current) clearTimeout(aiThinkRef.current);
    aiThinkRef.current = setTimeout(() => {
      aiThinkRef.current = null;
      if (sessionIdRef.current !== currentSession) {
        setIsAIThinking(false);
        return;
      }
      const board = boardRef.current;
      if (!board) {
        setIsAIThinking(false);
        return;
      }
      const level = DIFFICULTY_LEVELS[difficultyRef.current] ?? DIFFICULTY_LEVELS[1];

      // Yield to React, then cloud-first → local fallback
      setTimeout(async () => {
        if (sessionIdRef.current !== currentSession) {
          setIsAIThinking(false);
          return;
        }
        const b2 = boardRef.current;
        if (!b2) {
          setIsAIThinking(false);
          return;
        }
        const aiTurn = turnRef.current;
        const t0 = Date.now();

        let aiMove: CheckersMove | null = null;
        try {
          aiMove = await getCloudCheckersMove(b2, aiTurn, level.cloudPickRange);
        } catch {
          aiMove = null;
        }

        if (sessionIdRef.current !== currentSession) {
          setIsAIThinking(false);
          return;
        }
        if (!boardRef.current || boardRef.current !== b2) {
          setIsAIThinking(false);
          return;
        }

        if (!aiMove) {
          aiMove = getAIMove(b2, aiTurn, level);
        }

        if (__DEV__) console.log('Checkers AI move took:', Date.now() - t0, 'ms');
        if (aiMove) {
          boardRef.current = applyMove(b2, aiMove);
          if (aiMove.captured.length > 0) playGameSound('capture');
          else if (aiMove.crowned) playGameSound('promote');
          else playGameSound('checkersMove');
          const nextTurn: PieceColor = aiTurn === 'r' ? 'b' : 'r';
          setTurn(nextTurn);
          setMoveCount(moveCountRef.current + 1);
        }
        setIsAIThinking(false);
        bump();
        saveCurrentGame();
        checkGameOver(boardRef.current!, turnRef.current);
      }, 0);
    }, AI_DELAY_MS);
  }, [bump, saveCurrentGame, checkGameOver]);

  // ── Player move execution ──
  const makePlayerMove = useCallback(
    (move: CheckersMove) => {
      const b = boardRef.current;
      if (!b) return;
      boardRef.current = applyMove(b, move);
      if (move.captured.length > 0) playGameSound('capture');
      else if (move.crowned) playGameSound('promote');
      else playGameSound('checkersMove');
      const nextTurn: PieceColor = turnRef.current === 'r' ? 'b' : 'r';
      setTurn(nextTurn);
      setMoveCount(moveCountRef.current + 1);

      bump();
      saveCurrentGame();
      const gameEnded = checkGameOver(boardRef.current!, nextTurn);

      if (!gameEnded) {
        if (aiDelayRef.current) clearTimeout(aiDelayRef.current);
        aiDelayRef.current = setTimeout(() => {
          aiDelayRef.current = null;
          InteractionManager.runAfterInteractions(() => {
            triggerAIMove();
          });
        }, AI_DELAY_MS);
      }
    },
    [bump, saveCurrentGame, checkGameOver, triggerAIMove],
  );

  // ── Tap a square ──
  const selectSquare = useCallback(
    (row: number, col: number) => {
      const b = boardRef.current;
      if (!b) return;
      if (gameResult) return;
      if (isAIThinking) return;
      if (turnRef.current !== playerColorRef.current) return;

      // Check if tapped a valid move target
      if (selectedSquare) {
        const isTarget = validMoveTargets.some(([r, c]) => r === row && c === col);
        if (isTarget) {
          const allMoves = generateMoves(b, playerColorRef.current);
          const matchingMove = allMoves.find(
            (m) =>
              m.from[0] === selectedSquare[0] &&
              m.from[1] === selectedSquare[1] &&
              m.to[0] === row &&
              m.to[1] === col,
          );
          if (matchingMove) {
            setSelectedSquare(null);
            setValidMoveTargets([]);
            hapticLight();
            makePlayerMove(matchingMove);
            return;
          }
        }
      }

      // Check if tapped own piece
      const piece = b[row][col];
      if (piece && piece.color === playerColorRef.current) {
        playGameSound('pickUp');
        setSelectedSquare([row, col]);
        const allMoves = generateMoves(b, playerColorRef.current);
        const pieceMoves = allMoves.filter(
          (m) => m.from[0] === row && m.from[1] === col,
        );
        setValidMoveTargets(pieceMoves.map((m) => m.to));
        return;
      }

      // Tapped invalid square: deselect
      setSelectedSquare(null);
      setValidMoveTargets([]);
    },
    [selectedSquare, validMoveTargets, makePlayerMove, gameResult, isAIThinking],
  );

  // ── Resign ──
  const resign = useCallback(() => {
    if (gameResult) return;
    sessionIdRef.current += 1;
    clearTimers();
    setIsAIThinking(false);
    setGameResult('resigned');
    setWinner(playerColorRef.current === 'r' ? 'b' : 'r');
    playGameSound('gameLoss');
    void clearCheckersGame();
    void recordCheckersResult('loss', difficultyRef.current);
  }, [gameResult, clearTimers]);

  // ── New game (returns to pre-game modal) ──
  const newGame = useCallback(() => {
    sessionIdRef.current += 1;
    clearTimers();
    boardRef.current = null;
    setPlayerColor('r');
    setTurn('r');
    setDifficulty(1);
    setMoveCount(0);
    startedAtRef.current = '';
    setSelectedSquare(null);
    setValidMoveTargets([]);
    setIsAIThinking(false);
    setGameResult(null);
    setWinner(null);
    bump();
    void clearCheckersGame();
  }, [bump, clearTimers]);

  // ── Start a new game ──
  const startGame = useCallback(
    (color: PieceColor, difficultyIndex: number) => {
      sessionIdRef.current += 1;
      clearTimers();
      const newBoard = createInitialBoard();
      boardRef.current = newBoard;
      const now = new Date().toISOString();
      setPlayerColor(color);
      setTurn('r'); // Red always moves first
      setDifficulty(difficultyIndex);
      setMoveCount(0);
      startedAtRef.current = now;
      setSelectedSquare(null);
      setValidMoveTargets([]);
      setIsAIThinking(false);
      setGameResult(null);
      setWinner(null);
      bump();

      void saveCheckersGame({
        board: JSON.stringify(newBoard),
        turn: 'r',
        playerColor: color,
        difficulty: difficultyIndex,
        moveCount: 0,
        startedAt: now,
        updatedAt: now,
      });

      clearTranspositionTable();

      // If player is black, AI (red) moves first
      if (color === 'b') {
        triggerAIMove();
      }
    },
    [bump, clearTimers, triggerAIMove],
  );

  // ── Load saved game on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadCheckersGame();
        if (cancelled) return;
        if (saved) {
          let restored: Board;
          try {
            restored = JSON.parse(saved.board);
          } catch {
            console.warn('[useCheckers] Failed to parse saved board');
            setIsLoading(false);
            return;
          }
          boardRef.current = restored;
          setPlayerColor(saved.playerColor);
          setTurn(saved.turn);
          setDifficulty(saved.difficulty);
          setMoveCount(saved.moveCount);
          startedAtRef.current = saved.startedAt;
          bump();
          // If it's the AI's turn, trigger AI move
          if (saved.turn !== saved.playerColor) {
            triggerAIMove();
          }
        }
      } catch (e) {
        console.warn('[useCheckers] Failed to load saved game:', e);
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
  const hasBoard = boardRef.current !== null;

  const board = useMemo<Board>(() => {
    const b = boardRef.current;
    if (!b) return [];
    // For black player, flip 180° so their pieces are on the bottom
    if (playerColor === 'b') {
      return b.map((row) => [...row].reverse()).reverse();
    }
    return b.map((row) => [...row]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBoard, version, playerColor]);

  const isGameOver = gameResult !== null;
  const isPlayerTurn =
    hasBoard && !isAIThinking && !isGameOver && turn === playerColor;

  const { redCount, blackCount, redKings, blackKings } = useMemo(() => {
    const b = boardRef.current;
    if (!b) return { redCount: 0, blackCount: 0, redKings: 0, blackKings: 0 };
    let rc = 0, bc = 0, rk = 0, bk = 0;
    for (const row of b) {
      for (const cell of row) {
        if (!cell) continue;
        if (cell.color === 'r') {
          rc++;
          if (cell.king) rk++;
        } else {
          bc++;
          if (cell.king) bk++;
        }
      }
    }
    return { redCount: rc, blackCount: bc, redKings: rk, blackKings: bk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBoard, version]);

  return {
    board,
    playerColor,
    turn,
    difficulty,
    isPlayerTurn,
    isGameOver,
    gameResult,
    winner,
    moveCount,
    selectedSquare,
    validMoveTargets,
    isAIThinking,
    redCount,
    blackCount,
    redKings,
    blackKings,
    startGame,
    selectSquare,
    resign,
    newGame,
    isLoading,
  };
}
