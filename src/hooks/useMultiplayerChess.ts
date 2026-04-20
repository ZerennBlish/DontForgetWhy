import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';

import {
  listenToGame,
  makeMove as mpMakeMove,
  endGame as mpEndGame,
  resign as mpResign,
  offerDraw as mpOfferDraw,
  respondToDraw as mpRespondToDraw,
  requestBreak as mpRequestBreak,
  respondToBreak as mpRespondToBreak,
  type MultiplayerGame,
} from '../services/multiplayer';
import { getCurrentUser } from '../services/firebaseAuth';
import { hapticLight, hapticHeavy, hapticError } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';

type Cell = { square: Square; type: PieceSymbol; color: Color } | null;
type BoardIndex = { row: number; col: number };

interface UseMultiplayerChessParams {
  gameCode: string;
  onGameEnd?: () => void;
}

interface UseMultiplayerChessReturn {
  board: Cell[][];
  playerColor: 'w' | 'b';
  isPlayerTurn: boolean;
  isGameOver: boolean;
  gameResult: string | null;
  winner: 'w' | 'b' | null;
  selectedSquare: BoardIndex | null;
  legalMoves: BoardIndex[];
  lastMove: { from: BoardIndex; to: BoardIndex } | null;
  isInCheck: boolean;
  moveHistory: string[];

  opponentName: string;
  opponentUid: string;
  isConnected: boolean;
  drawOfferPending: boolean;
  drawOfferSent: boolean;
  breakRequestPending: boolean;
  breakRequestSent: boolean;

  handleSquarePress: (row: number, col: number) => void;
  handleResign: () => void;
  handleOfferDraw: () => void;
  handleRespondToDraw: (accept: boolean) => void;
  handleRequestBreak: () => void;
  handleRespondToBreak: (accept: boolean) => void;

  reviewIndex: number | null;
  reviewBoard: Cell[][] | null;
  startReview: () => void;
  reviewFirst: () => void;
  reviewPrev: () => void;
  reviewNext: () => void;
  reviewLast: () => void;
  exitReview: () => void;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

const FILES = 'abcdefgh';

function indexToSquare(
  row: number,
  col: number,
  playerColor: 'w' | 'b',
): Square {
  if (playerColor === 'w') {
    return (FILES[col] + (8 - row)) as Square;
  }
  return (FILES[7 - col] + (row + 1)) as Square;
}

function squareToIndex(sq: string, playerColor: 'w' | 'b'): BoardIndex {
  const file = FILES.indexOf(sq[0]);
  const rank = parseInt(sq.slice(1), 10);
  if (playerColor === 'w') return { row: 8 - rank, col: file };
  return { row: rank - 1, col: 7 - file };
}

function boardFromChess(game: Chess, playerColor: 'w' | 'b'): Cell[][] {
  const raw = game.board();
  if (playerColor === 'b') {
    return raw.map((row) => [...row].reverse()).reverse();
  }
  return raw.map((row) => [...row]);
}

function replayMoves(moves: string[]): { chess: Chess; fens: string[] } {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  for (const san of moves) {
    try {
      chess.move(san);
      fens.push(chess.fen());
    } catch {
      break;
    }
  }
  return { chess, fens };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMultiplayerChess({
  gameCode,
  onGameEnd,
}: UseMultiplayerChessParams): UseMultiplayerChessReturn {
  // Chess.js instance (mutated via replace on snapshot; player's own moves
  // mutate it in place). Reactivity comes from `version`.
  const chessRef = useRef<Chess>(new Chess());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const myUidRef = useRef<string>('');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const playerColorRef = useRef<'w' | 'b'>('w');

  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [opponentUid, setOpponentUid] = useState<string>('');

  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winner, setWinner] = useState<'w' | 'b' | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<BoardIndex | null>(null);
  const [legalMoves, setLegalMoves] = useState<BoardIndex[]>([]);
  const [lastMove, setLastMove] = useState<
    { from: BoardIndex; to: BoardIndex } | null
  >(null);

  const [isConnected, setIsConnected] = useState(false);
  const [drawOfferPending, setDrawOfferPending] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [breakRequestPending, setBreakRequestPending] = useState(false);
  const [breakRequestSent, setBreakRequestSent] = useState(false);

  // Review mode
  const fenHistoryRef = useRef<string[]>([new Chess().fen()]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  // Latest onGameEnd without re-subscribing
  const onGameEndRef = useRef<typeof onGameEnd>(onGameEnd);
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const endedRef = useRef(false);

  // ── Subscribe to Firestore ────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    myUidRef.current = user.uid;

    const handleSnapshot = (game: MultiplayerGame | null): void => {
      if (!game) {
        setIsConnected(false);
        return;
      }
      setIsConnected(true);

      // Derive player color
      const pc: 'w' | 'b' =
        game.host.uid === user.uid
          ? game.hostColor
          : game.hostColor === 'w'
            ? 'b'
            : 'w';
      playerColorRef.current = pc;
      setPlayerColor(pc);

      // Opponent info
      if (game.host.uid === user.uid) {
        setOpponentName(game.guest?.displayName ?? 'Opponent');
        setOpponentUid(game.guest?.uid ?? '');
      } else {
        setOpponentName(game.host.displayName);
        setOpponentUid(game.host.uid);
      }

      // Sync chess.js state when the server FEN differs from ours
      const localFen = chessRef.current.fen();
      if (game.gameState && game.gameState !== localFen) {
        const { chess, fens } = replayMoves(game.moves);
        if (chess.fen() === game.gameState) {
          chessRef.current = chess;
          fenHistoryRef.current = fens;
        } else {
          // Replay drifted — fall back to FEN-only (history lost).
          try {
            const fresh = new Chess();
            fresh.load(game.gameState);
            chessRef.current = fresh;
            fenHistoryRef.current = [game.gameState];
          } catch (e) {
            console.warn('[useMultiplayerChess] Failed to load FEN:', e);
          }
        }

        // Opponent just moved: play the appropriate sound/haptic.
        const hist = chessRef.current.history({ verbose: true });
        const lastMv = hist[hist.length - 1];
        if (lastMv) {
          if (lastMv.captured) playGameSound('capture');
          else if (lastMv.flags.includes('p')) playGameSound('promote');
          else playGameSound('chessPlace');
          if (chessRef.current.isCheck() && !chessRef.current.isCheckmate()) {
            hapticHeavy();
          }
          setLastMove({
            from: squareToIndex(lastMv.from, pc),
            to: squareToIndex(lastMv.to, pc),
          });
        } else {
          setLastMove(null);
        }
      }

      // Turn + offer flags (authoritative from server)
      setIsPlayerTurn(game.turn === user.uid && game.status === 'active');

      setDrawOfferPending(!!game.drawOffer && game.drawOffer !== user.uid);
      setDrawOfferSent(game.drawOffer === user.uid);
      setBreakRequestPending(
        !!game.pauseRequest && game.pauseRequest !== user.uid,
      );
      setBreakRequestSent(game.pauseRequest === user.uid);

      // Finished
      if (game.status === 'finished' && !endedRef.current) {
        endedRef.current = true;
        setIsGameOver(true);
        setGameResult(game.result);
        if (game.winner) {
          const iWon = game.winner === user.uid;
          setWinner(iWon ? pc : pc === 'w' ? 'b' : 'w');
          if (game.result === 'checkmate') hapticError();
          playGameSound(iWon ? 'gameWin' : 'gameLoss');
        } else {
          setWinner(null);
        }
        onGameEndRef.current?.();
      }

      bump();
    };

    const unsub = listenToGame(gameCode, handleSnapshot, () => {
      setIsConnected(false);
    });
    return () => {
      unsub();
    };
  }, [gameCode, bump]);

  // ── Derived values ────────────────────────────────────────────────
  const board = useMemo<Cell[][]>(
    () => boardFromChess(chessRef.current, playerColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerColor, version],
  );

  const isInCheck = useMemo<boolean>(
    () => chessRef.current.isCheck(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const moveHistory = useMemo<string[]>(
    () => chessRef.current.history(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  // ── Board interaction ─────────────────────────────────────────────
  const handleSquarePress = useCallback(
    (row: number, col: number) => {
      if (!isPlayerTurn) return;
      if (isGameOver) return;
      const game = chessRef.current;
      if (game.isGameOver()) return;
      if (game.turn() !== playerColor) return;

      const square = indexToSquare(row, col, playerColor);

      // Nothing selected — try to pick up one of my pieces.
      if (!selectedSquare) {
        const piece = game.get(square);
        if (piece && piece.color === playerColor) {
          hapticLight();
          playGameSound('pickUp');
          setSelectedSquare({ row, col });
          const moves = game.moves({ square, verbose: true });
          setLegalMoves(moves.map((m) => squareToIndex(m.to, playerColor)));
        }
        return;
      }

      // Tap on a legal target → execute the move.
      if (legalMoves.some((m) => m.row === row && m.col === col)) {
        const fromSquare = indexToSquare(
          selectedSquare.row,
          selectedSquare.col,
          playerColor,
        );
        let applied;
        try {
          applied = game.move({
            from: fromSquare,
            to: square,
            promotion: 'q',
          });
        } catch {
          applied = null;
        }
        if (!applied) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        if (applied.captured) playGameSound('capture');
        else if (applied.flags.includes('p')) playGameSound('promote');
        else playGameSound('chessPlace');
        hapticLight();

        const newFen = game.fen();
        fenHistoryRef.current.push(newFen);

        setLastMove({
          from: { row: selectedSquare.row, col: selectedSquare.col },
          to: { row, col },
        });
        setSelectedSquare(null);
        setLegalMoves([]);
        setIsPlayerTurn(false);
        bump();

        const finishMove = mpMakeMove(gameCode, applied.san, newFen);

        if (game.isCheckmate()) {
          hapticError();
          finishMove
            .then(() => mpEndGame(gameCode, 'checkmate', myUidRef.current))
            .catch((e) =>
              console.warn('[useMultiplayerChess] makeMove/endGame failed:', e),
            );
        } else if (game.isStalemate()) {
          finishMove
            .then(() => mpEndGame(gameCode, 'stalemate', null))
            .catch((e) =>
              console.warn('[useMultiplayerChess] makeMove/endGame failed:', e),
            );
        } else {
          if (game.isCheck()) hapticHeavy();
          finishMove.catch((e) =>
            console.warn('[useMultiplayerChess] makeMove failed:', e),
          );
        }
        return;
      }

      // Tap on another of my pieces — switch selection.
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        hapticLight();
        playGameSound('pickUp');
        setSelectedSquare({ row, col });
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => squareToIndex(m.to, playerColor)));
        return;
      }

      // Invalid tap — deselect.
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [
      isPlayerTurn,
      isGameOver,
      playerColor,
      selectedSquare,
      legalMoves,
      gameCode,
      bump,
    ],
  );

  // ── Game-level actions ────────────────────────────────────────────
  const handleResign = useCallback(() => {
    Alert.alert(
      'Resign this game?',
      'Your opponent will be awarded the win. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: () => {
            mpResign(gameCode).catch((e) =>
              console.warn('[useMultiplayerChess] resign failed:', e),
            );
          },
        },
      ],
    );
  }, [gameCode]);

  const handleOfferDraw = useCallback(() => {
    setDrawOfferSent(true);
    mpOfferDraw(gameCode).catch((e) => {
      console.warn('[useMultiplayerChess] offerDraw failed:', e);
      setDrawOfferSent(false);
    });
  }, [gameCode]);

  const handleRespondToDraw = useCallback(
    (accept: boolean) => {
      setDrawOfferPending(false);
      mpRespondToDraw(gameCode, accept).catch((e) =>
        console.warn('[useMultiplayerChess] respondToDraw failed:', e),
      );
    },
    [gameCode],
  );

  const handleRequestBreak = useCallback(() => {
    setBreakRequestSent(true);
    mpRequestBreak(gameCode).catch((e) => {
      console.warn('[useMultiplayerChess] requestBreak failed:', e);
      setBreakRequestSent(false);
    });
  }, [gameCode]);

  const handleRespondToBreak = useCallback(
    (accept: boolean) => {
      setBreakRequestPending(false);
      mpRespondToBreak(gameCode, accept).catch((e) =>
        console.warn('[useMultiplayerChess] respondToBreak failed:', e),
      );
    },
    [gameCode],
  );

  // ── Review mode ───────────────────────────────────────────────────
  const startReview = useCallback(() => {
    if (!isGameOver) return;
    setReviewIndex(Math.max(0, fenHistoryRef.current.length - 1));
  }, [isGameOver]);

  const reviewFirst = useCallback(() => setReviewIndex(0), []);
  const reviewPrev = useCallback(
    () =>
      setReviewIndex((i) => (i === null ? null : Math.max(0, i - 1))),
    [],
  );
  const reviewNext = useCallback(
    () =>
      setReviewIndex((i) =>
        i === null
          ? null
          : Math.min(fenHistoryRef.current.length - 1, i + 1),
      ),
    [],
  );
  const reviewLast = useCallback(
    () => setReviewIndex(fenHistoryRef.current.length - 1),
    [],
  );
  const exitReview = useCallback(() => setReviewIndex(null), []);

  const reviewBoard = useMemo<Cell[][] | null>(() => {
    if (reviewIndex === null) return null;
    const fen = fenHistoryRef.current[reviewIndex];
    if (!fen) return null;
    try {
      const temp = new Chess(fen);
      return boardFromChess(temp, playerColor);
    } catch {
      return null;
    }
  }, [reviewIndex, playerColor]);

  return {
    board,
    playerColor,
    isPlayerTurn,
    isGameOver,
    gameResult,
    winner,
    selectedSquare,
    legalMoves,
    lastMove,
    isInCheck,
    moveHistory,
    opponentName,
    opponentUid,
    isConnected,
    drawOfferPending,
    drawOfferSent,
    breakRequestPending,
    breakRequestSent,
    handleSquarePress,
    handleResign,
    handleOfferDraw,
    handleRespondToDraw,
    handleRequestBreak,
    handleRespondToBreak,
    reviewIndex,
    reviewBoard,
    startReview,
    reviewFirst,
    reviewPrev,
    reviewNext,
    reviewLast,
    exitReview,
  };
}
