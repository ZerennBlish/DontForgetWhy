import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  Board,
  PieceColor,
  CheckersMove,
  createInitialBoard,
  generateMoves,
  applyMove,
  serializeBoard,
} from '../services/checkersAI';
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
import { hapticLight, hapticHeavy } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------
// `serializeBoard` in checkersAI produces a 33-char string: 32 chars for the
// 32 dark squares (row-major, skipping light squares) + 1 char for turn.
// Chars: '-' empty, 'r'/'R' red piece/king, 'b'/'B' black piece/king. Turn: 'r' or 'b'.

function deserializeBoard(
  s: string,
): { board: Board; turn: PieceColor } | null {
  if (s.length !== 33) return null;
  const turnChar = s[32];
  if (turnChar !== 'r' && turnChar !== 'b') return null;

  const board: Board = Array.from({ length: 8 }, () =>
    Array<null>(8).fill(null),
  ) as Board;
  let idx = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 !== 1) continue;
      const ch = s[idx++];
      switch (ch) {
        case '-':
          break;
        case 'r':
          board[row][col] = { color: 'r', king: false };
          break;
        case 'R':
          board[row][col] = { color: 'r', king: true };
          break;
        case 'b':
          board[row][col] = { color: 'b', king: false };
          break;
        case 'B':
          board[row][col] = { color: 'b', king: true };
          break;
        default:
          return null;
      }
    }
  }
  return { board, turn: turnChar };
}

function encodeMove(m: CheckersMove): string {
  const base = `${m.from[0]},${m.from[1]}-${m.to[0]},${m.to[1]}`;
  if (m.captured.length === 0) return base;
  return base + m.captured.map((c) => `x${c[0]},${c[1]}`).join('');
}

function hostColorToPc(hc: 'w' | 'b'): PieceColor {
  // Firestore's `hostColor` is shared across game types. 'w' = first mover =
  // red in checkers. 'b' = second mover = black.
  return hc === 'w' ? 'r' : 'b';
}

function countPiecesOnBoard(b: Board): number {
  let n = 0;
  for (const row of b) {
    for (const cell of row) {
      if (cell) n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseMultiplayerCheckersParams {
  gameCode: string;
  onGameEnd?: () => void;
}

interface UseMultiplayerCheckersReturn {
  board: Board;
  playerColor: PieceColor;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  gameResult: 'red_wins' | 'black_wins' | 'resigned' | 'draw' | null;
  winner: PieceColor | null;
  selectedSquare: [number, number] | null;
  legalMoves: [number, number][];
  moveCount: number;
  redCount: number;
  blackCount: number;
  redKings: number;
  blackKings: number;

  opponentName: string;
  opponentUid: string;
  isConnected: boolean;
  drawOfferPending: boolean;
  drawOfferSent: boolean;
  breakRequestPending: boolean;
  breakRequestSent: boolean;

  selectSquare: (row: number, col: number) => void;
  handleResign: () => void;
  handleOfferDraw: () => void;
  handleRespondToDraw: (accept: boolean) => void;
  handleRequestBreak: () => void;
  handleRespondToBreak: (accept: boolean) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMultiplayerCheckers({
  gameCode,
  onGameEnd,
}: UseMultiplayerCheckersParams): UseMultiplayerCheckersReturn {
  const boardRef = useRef<Board>(createInitialBoard());
  const turnRef = useRef<PieceColor>('r');
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const myUidRef = useRef<string>('');
  const [playerColor, setPlayerColor] = useState<PieceColor>('r');
  const playerColorRef = useRef<PieceColor>('r');

  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [opponentUid, setOpponentUid] = useState<string>('');

  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<
    'red_wins' | 'black_wins' | 'resigned' | 'draw' | null
  >(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(
    null,
  );
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);

  const [moveCount, setMoveCount] = useState(0);

  const [isConnected, setIsConnected] = useState(false);
  const [drawOfferPending, setDrawOfferPending] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [breakRequestPending, setBreakRequestPending] = useState(false);
  const [breakRequestSent, setBreakRequestSent] = useState(false);

  const onGameEndRef = useRef<typeof onGameEnd>(onGameEnd);
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const endedRef = useRef(false);

  // ── Firestore subscription ───────────────────────────────────────
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
      const hostPc = hostColorToPc(game.hostColor);
      const pc: PieceColor =
        game.host.uid === user.uid ? hostPc : hostPc === 'r' ? 'b' : 'r';
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

      // Sync board state if the server has a newer serialized board.
      if (game.gameState) {
        const localSerialized = serializeBoard(boardRef.current, turnRef.current);
        if (game.gameState !== localSerialized) {
          const parsed = deserializeBoard(game.gameState);
          if (parsed) {
            const oldCount = countPiecesOnBoard(boardRef.current);
            boardRef.current = parsed.board;
            turnRef.current = parsed.turn;
            const newCount = countPiecesOnBoard(parsed.board);
            if (newCount < oldCount) playGameSound('capture');
            else playGameSound('checkersMove');
          }
        }
      }

      setMoveCount(game.moves.length);
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

        const redUid =
          game.hostColor === 'w' ? game.host.uid : game.guest?.uid ?? '';
        const blackUid =
          game.hostColor === 'w' ? game.guest?.uid ?? '' : game.host.uid;

        if (game.result === 'resigned') {
          setGameResult('resigned');
        } else if (game.result === 'draw') {
          setGameResult('draw');
        } else if (game.winner === redUid) {
          setGameResult('red_wins');
        } else if (game.winner === blackUid) {
          setGameResult('black_wins');
        } else {
          setGameResult('draw');
        }

        if (game.winner) {
          setWinner(game.winner === redUid ? 'r' : 'b');
          const iWon = game.winner === user.uid;
          playGameSound(iWon ? 'gameWin' : 'gameLoss');
        } else {
          setWinner(null);
        }
        hapticHeavy();
        onGameEndRef.current?.();
      }

      bump();
    };

    const unsub = listenToGame(gameCode, handleSnapshot);
    return () => {
      unsub();
    };
  }, [gameCode, bump]);

  // ── Derived values ───────────────────────────────────────────────
  const board = useMemo<Board>(() => {
    const b = boardRef.current;
    if (playerColor === 'b') {
      return b.map((row) => [...row].reverse()).reverse();
    }
    return b.map((row) => [...row]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, playerColor]);

  const counts = useMemo(() => {
    const b = boardRef.current;
    let rc = 0,
      bc = 0,
      rk = 0,
      bk = 0;
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
  }, [version]);

  // ── Board interaction ────────────────────────────────────────────
  const selectSquare = useCallback(
    (row: number, col: number) => {
      if (!isPlayerTurn) return;
      if (isGameOver) return;
      if (turnRef.current !== playerColor) return;

      const b = boardRef.current;

      // If a piece is already selected and the tap is on a legal target, play.
      if (selectedSquare) {
        const isTarget = legalMoves.some(
          ([r, c]) => r === row && c === col,
        );
        if (isTarget) {
          const allMoves = generateMoves(b, playerColor);
          const matching = allMoves.find(
            (m) =>
              m.from[0] === selectedSquare[0] &&
              m.from[1] === selectedSquare[1] &&
              m.to[0] === row &&
              m.to[1] === col,
          );
          if (matching) {
            // Apply locally (atomic — includes full multi-jump chain).
            boardRef.current = applyMove(b, matching);
            const nextTurn: PieceColor = playerColor === 'r' ? 'b' : 'r';
            turnRef.current = nextTurn;

            if (matching.captured.length > 0) playGameSound('capture');
            else if (matching.crowned) playGameSound('promote');
            else playGameSound('checkersMove');
            hapticLight();

            setSelectedSquare(null);
            setLegalMoves([]);
            setIsPlayerTurn(false);
            bump();

            // Send to Firestore.
            const serialized = serializeBoard(boardRef.current, nextTurn);
            const notation = encodeMove(matching);
            const opponentHasMoves =
              generateMoves(boardRef.current, nextTurn).length > 0;

            mpMakeMove(gameCode, notation, serialized)
              .then(() => {
                if (!opponentHasMoves) {
                  return mpEndGame(gameCode, 'complete', myUidRef.current);
                }
                return undefined;
              })
              .catch((e) =>
                console.warn(
                  '[useMultiplayerCheckers] makeMove/endGame failed:',
                  e,
                ),
              );

            return;
          }
        }
      }

      // Otherwise, try to pick up one of my pieces.
      const piece = b[row]?.[col] ?? null;
      if (piece && piece.color === playerColor) {
        hapticLight();
        playGameSound('pickUp');
        setSelectedSquare([row, col]);
        const allMoves = generateMoves(b, playerColor);
        const pieceMoves = allMoves.filter(
          (m) => m.from[0] === row && m.from[1] === col,
        );
        setLegalMoves(pieceMoves.map((m) => m.to));
        return;
      }

      // Invalid tap — deselect.
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [isPlayerTurn, isGameOver, playerColor, selectedSquare, legalMoves, gameCode, bump],
  );

  // ── Game actions ─────────────────────────────────────────────────
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
              console.warn('[useMultiplayerCheckers] resign failed:', e),
            );
          },
        },
      ],
    );
  }, [gameCode]);

  const handleOfferDraw = useCallback(() => {
    setDrawOfferSent(true);
    mpOfferDraw(gameCode).catch((e) => {
      console.warn('[useMultiplayerCheckers] offerDraw failed:', e);
      setDrawOfferSent(false);
    });
  }, [gameCode]);

  const handleRespondToDraw = useCallback(
    (accept: boolean) => {
      setDrawOfferPending(false);
      mpRespondToDraw(gameCode, accept).catch((e) =>
        console.warn('[useMultiplayerCheckers] respondToDraw failed:', e),
      );
    },
    [gameCode],
  );

  const handleRequestBreak = useCallback(() => {
    setBreakRequestSent(true);
    mpRequestBreak(gameCode).catch((e) => {
      console.warn('[useMultiplayerCheckers] requestBreak failed:', e);
      setBreakRequestSent(false);
    });
  }, [gameCode]);

  const handleRespondToBreak = useCallback(
    (accept: boolean) => {
      setBreakRequestPending(false);
      mpRespondToBreak(gameCode, accept).catch((e) =>
        console.warn('[useMultiplayerCheckers] respondToBreak failed:', e),
      );
    },
    [gameCode],
  );

  return {
    board,
    playerColor,
    isPlayerTurn,
    isGameOver,
    gameResult,
    winner,
    selectedSquare,
    legalMoves,
    moveCount,
    ...counts,
    opponentName,
    opponentUid,
    isConnected,
    drawOfferPending,
    drawOfferSent,
    breakRequestPending,
    breakRequestSent,
    selectSquare,
    handleResign,
    handleOfferDraw,
    handleRespondToDraw,
    handleRequestBreak,
    handleRespondToBreak,
  };
}
