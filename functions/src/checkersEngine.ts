// Checkers engine for Firebase Cloud Function.
// Adapted from src/services/checkersAI.ts — pure TypeScript, zero dependencies.

// ── Types ────────────────────────────────────────────────────────────────────

export type PieceColor = 'r' | 'b';

export interface Piece {
  color: PieceColor;
  king: boolean;
}

export type Board = (Piece | null)[][];

export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  captured: [number, number][];
  crowned: boolean;
}

export interface RankedMove {
  move: CheckersMove;
  score: number;
}

// ── Board helpers ────────────────────────────────────────────────────────────

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function applyMove(board: Board, move: CheckersMove): Board {
  const b = cloneBoard(board);
  const piece = b[move.from[0]][move.from[1]];
  if (!piece) return b;

  for (const [cr, cc] of move.captured) {
    b[cr][cc] = null;
  }

  b[move.from[0]][move.from[1]] = null;
  const movedPiece = { ...piece };
  if (move.crowned) movedPiece.king = true;
  b[move.to[0]][move.to[1]] = movedPiece;

  return b;
}

function serializeBoard(board: Board, turn: PieceColor): string {
  let s = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 !== 1) continue;
      const piece = board[row][col];
      if (!piece) {
        s += '-';
      } else if (piece.color === 'r') {
        s += piece.king ? 'R' : 'r';
      } else {
        s += piece.king ? 'B' : 'b';
      }
    }
  }
  s += turn;
  return s;
}

// ── Move generation ──────────────────────────────────────────────────────────

function getForwardDirs(color: PieceColor): [number, number][] {
  return color === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

const ALL_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function getDirs(piece: Piece): [number, number][] {
  return piece.king ? ALL_DIRS : getForwardDirs(piece.color);
}

function isPromotionRow(color: PieceColor, row: number): boolean {
  return (color === 'r' && row === 0) || (color === 'b' && row === 7);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r <= 7 && c >= 0 && c <= 7;
}

function findJumpChains(
  tempBoard: Board,
  row: number,
  col: number,
  piece: Piece,
  captured: [number, number][],
  origin: [number, number],
): CheckersMove[] {
  const dirs = getDirs(piece);
  const results: CheckersMove[] = [];

  for (const [dr, dc] of dirs) {
    const midR = row + dr;
    const midC = col + dc;
    const landR = row + 2 * dr;
    const landC = col + 2 * dc;

    if (!inBounds(landR, landC)) continue;

    const midPiece = tempBoard[midR][midC];
    if (!midPiece || midPiece.color === piece.color) continue;

    if (captured.some(([cr, cc]) => cr === midR && cc === midC)) continue;

    if (tempBoard[landR][landC] !== null) continue;

    const newCaptured: [number, number][] = [...captured, [midR, midC]];

    if (!piece.king && isPromotionRow(piece.color, landR)) {
      results.push({
        from: origin,
        to: [landR, landC],
        captured: newCaptured,
        crowned: true,
      });
      continue;
    }

    const nextBoard = cloneBoard(tempBoard);
    nextBoard[row][col] = null;
    nextBoard[midR][midC] = null;
    nextBoard[landR][landC] = piece;

    const continuations = findJumpChains(
      nextBoard, landR, landC, piece, newCaptured, origin,
    );

    if (continuations.length > 0) {
      results.push(...continuations);
    } else {
      results.push({
        from: origin,
        to: [landR, landC],
        captured: newCaptured,
        crowned: false,
      });
    }
  }

  return results;
}

function generateMoves(board: Board, color: PieceColor): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const simpleMoves: CheckersMove[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      const pieceJumps = findJumpChains(
        board, row, col, piece, [], [row, col],
      );
      jumps.push(...pieceJumps);

      const dirs = getDirs(piece);
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        if (board[nr][nc] !== null) continue;
        const crowned = !piece.king && isPromotionRow(piece.color, nr);
        simpleMoves.push({
          from: [row, col],
          to: [nr, nc],
          captured: [],
          crowned,
        });
      }
    }
  }

  return jumps.length > 0 ? jumps : simpleMoves;
}

// ── Evaluation ───────────────────────────────────────────────────────────────

// prettier-ignore
const RED_ADVANCE_BONUS   = [0, 40, 28, 18, 10, 5, 2, 0];
// prettier-ignore
const BLACK_ADVANCE_BONUS = [0, 2, 5, 10, 18, 28, 40, 0];

function isKingCenterSquare(row: number, col: number): boolean {
  return row >= 3 && row <= 4 && col >= 2 && col <= 5;
}

function isSupported(
  board: Board,
  row: number,
  col: number,
  piece: Piece,
): boolean {
  const dirs: [number, number][] = piece.king
    ? ALL_DIRS
    : piece.color === 'r'
      ? [[1, -1], [1, 1]]
      : [[-1, -1], [-1, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    const p = board[nr][nc];
    if (p && p.color === piece.color) return true;
  }
  return false;
}

function hasConnectedFriend(
  board: Board,
  row: number,
  col: number,
  color: PieceColor,
): boolean {
  for (const [dr, dc] of ALL_DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    const p = board[nr][nc];
    if (p && p.color === color) return true;
  }
  return false;
}

function mobilityScore(
  board: Board,
  row: number,
  col: number,
  piece: Piece,
): number {
  const dirs = piece.king ? ALL_DIRS : getForwardDirs(piece.color);
  let open = 0;
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    if (board[nr][nc] === null) open++;
  }
  if (open === 0) return -8;
  return open * 4;
}

function evaluateBoard(board: Board): number {
  let redPieces = 0;
  let blackPieces = 0;
  let score = 0;

  let totalPieces = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col]) totalPieces++;
    }
  }
  const endgame = totalPieces <= 8;
  const kingValue = endgame ? 200 : 160;
  const kingCenterBonus = endgame ? 18 : 10;
  const advanceScale = endgame ? 1.5 : 1;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const sign = piece.color === 'r' ? 1 : -1;
      if (piece.color === 'r') redPieces++;
      else blackPieces++;

      score += (piece.king ? kingValue : 100) * sign;

      if (!piece.king) {
        const bonus =
          piece.color === 'r'
            ? RED_ADVANCE_BONUS[row]
            : BLACK_ADVANCE_BONUS[row];
        score += Math.round(bonus * advanceScale) * sign;

        if (
          (piece.color === 'r' && row === 7) ||
          (piece.color === 'b' && row === 0)
        ) {
          score += 15 * sign;
        }

        if (hasConnectedFriend(board, row, col, piece.color)) {
          score += 3 * sign;
        }
      } else {
        if (isKingCenterSquare(row, col)) {
          score += kingCenterBonus * sign;
        }
        if (row === 0 || row === 7 || col === 0 || col === 7) {
          score -= 5 * sign;
        }
        if (
          (row === 0 && (col === 1 || col === 7)) ||
          (row === 7 && (col === 0 || col === 6))
        ) {
          score -= 3 * sign;
        }
      }

      if (isSupported(board, row, col, piece)) {
        score += 6 * sign;
      }

      score += mobilityScore(board, row, col, piece) * sign;
    }
  }

  if (redPieces === 0) return -100000;
  if (blackPieces === 0) return 100000;

  return score;
}

// ── Search time budget ───────────────────────────────────────────────────────

let searchDeadline = 0;
let searchSafetyDeadline = 0;
let searchMinDepthActive = false;

function isTimeUp(): boolean {
  if (searchMinDepthActive) return Date.now() >= searchSafetyDeadline;
  return Date.now() >= searchDeadline;
}

// ── Transposition table ──────────────────────────────────────────────────────

enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  bestMoveIdx: number;
}

const TT_MAX_SIZE = 100_000;
const transpositionTable = new Map<string, TTEntry>();

function ttLookup(key: string): TTEntry | undefined {
  return transpositionTable.get(key);
}

function ttStore(
  key: string,
  depth: number,
  score: number,
  flag: TTFlag,
  bestMoveIdx: number,
): void {
  const existing = transpositionTable.get(key);
  if (existing && depth < existing.depth) return;
  if (!existing && transpositionTable.size >= TT_MAX_SIZE) {
    const firstKey = transpositionTable.keys().next().value;
    if (firstKey !== undefined) transpositionTable.delete(firstKey);
  }
  transpositionTable.set(key, { depth, score, flag, bestMoveIdx });
}

function clearTranspositionTable(): void {
  transpositionTable.clear();
}

// ── Mate-score ply adjustment ────────────────────────────────────────────────

function adjustMateScoreForTT(score: number, ply: number): number {
  if (score > 90000) return score + ply;
  if (score < -90000) return score - ply;
  return score;
}

function adjustMateScoreFromTT(score: number, ply: number): number {
  if (score > 90000) return score - ply;
  if (score < -90000) return score + ply;
  return score;
}

// ── Killer move heuristic ────────────────────────────────────────────────────

const MAX_PLY = 32;
const killerMoves: Array<[string | null, string | null]> = Array.from(
  { length: MAX_PLY },
  () => [null, null] as [string | null, string | null],
);

function moveKey(move: CheckersMove): string {
  return `${move.from[0]},${move.from[1]}-${move.to[0]},${move.to[1]}`;
}

function storeKiller(ply: number, key: string): void {
  if (ply < 0 || ply >= MAX_PLY) return;
  const slot = killerMoves[ply];
  if (slot[0] === key) return;
  slot[1] = slot[0];
  slot[0] = key;
}

function clearKillers(): void {
  for (let i = 0; i < MAX_PLY; i++) {
    killerMoves[i] = [null, null];
  }
}

// ── Move ordering ────────────────────────────────────────────────────────────

function scoreMoveForOrdering(
  move: CheckersMove,
  ttMoveIdx: number,
  moveIdx: number,
  ply: number,
): number {
  if (ttMoveIdx >= 0 && moveIdx === ttMoveIdx) return 100_000;

  let score = 0;
  if (move.captured.length > 0) {
    score += 1000 + move.captured.length * 100;
  }

  if (move.captured.length === 0 && ply >= 0 && ply < MAX_PLY) {
    const key = moveKey(move);
    const slot = killerMoves[ply];
    if (slot[0] === key) score += 90;
    else if (slot[1] === key) score += 80;
  }

  return score;
}

function orderMoves(
  moves: CheckersMove[],
  ttMoveIdx: number = -1,
  ply: number = -1,
): { move: CheckersMove; origIdx: number }[] {
  const indexed = moves.map((move, origIdx) => ({ move, origIdx }));
  indexed.sort(
    (a, b) =>
      scoreMoveForOrdering(b.move, ttMoveIdx, b.origIdx, ply) -
      scoreMoveForOrdering(a.move, ttMoveIdx, a.origIdx, ply),
  );
  return indexed;
}

// ── Minimax with alpha-beta pruning + TT + killers ───────────────────────────

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingRed: boolean,
  ply: number,
): number {
  if (isTimeUp()) return evaluateBoard(board);

  const turn: PieceColor = maximizingRed ? 'r' : 'b';
  const moves = generateMoves(board, turn);

  if (moves.length === 0) {
    return maximizingRed ? -100000 + ply : 100000 - ply;
  }

  if (depth === 0) {
    return evaluateBoard(board);
  }

  const origAlpha = alpha;
  const origBeta = beta;

  const key = serializeBoard(board, turn);
  const ttEntry = ttLookup(key);
  let ttMoveIdx = -1;
  if (ttEntry && ttEntry.depth >= depth) {
    const ttScore = adjustMateScoreFromTT(ttEntry.score, ply);
    if (ttEntry.flag === TTFlag.EXACT) return ttScore;
    if (ttEntry.flag === TTFlag.LOWERBOUND && ttScore > alpha) alpha = ttScore;
    else if (ttEntry.flag === TTFlag.UPPERBOUND && ttScore < beta)
      beta = ttScore;
    if (alpha >= beta) return ttScore;
  }
  if (ttEntry) ttMoveIdx = ttEntry.bestMoveIdx;

  const ordered = orderMoves(moves, ttMoveIdx, ply);
  let depthBestIdx = -1;
  let best: number;

  if (maximizingRed) {
    best = -Infinity;
    for (const { move, origIdx } of ordered) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, false, ply + 1);
      if (score > best) {
        best = score;
        depthBestIdx = origIdx;
      }
      if (best > alpha) alpha = best;
      if (beta <= alpha) {
        if (move.captured.length === 0) storeKiller(ply, moveKey(move));
        break;
      }
    }
  } else {
    best = Infinity;
    for (const { move, origIdx } of ordered) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, true, ply + 1);
      if (score < best) {
        best = score;
        depthBestIdx = origIdx;
      }
      if (best < beta) beta = best;
      if (beta <= alpha) {
        if (move.captured.length === 0) storeKiller(ply, moveKey(move));
        break;
      }
    }
  }

  if (!isTimeUp()) {
    let flag: TTFlag;
    if (best <= origAlpha) flag = TTFlag.UPPERBOUND;
    else if (best >= origBeta) flag = TTFlag.LOWERBOUND;
    else flag = TTFlag.EXACT;
    ttStore(key, depth, adjustMateScoreForTT(best, ply), flag, depthBestIdx);
  }

  return best;
}

// ── Top-N move ranking ───────────────────────────────────────────────────────

export function getTopMoves(
  board: Board,
  turn: PieceColor,
  maxDepth: number = 20,
  timeLimitMs: number = 6000,
  count: number = 5,
): RankedMove[] {
  const moves = generateMoves(board, turn);
  if (moves.length === 0) return [];
  if (moves.length === 1) return [{ move: moves[0], score: 0 }];

  clearTranspositionTable();
  clearKillers();

  const maximizing = turn === 'r';
  const now = Date.now();
  searchDeadline = now + timeLimitMs;
  searchSafetyDeadline = now + timeLimitMs * 3;

  const scored: Array<{ move: CheckersMove; score: number }> = moves.map(
    (m) => ({
      move: m,
      score: maximizing ? -Infinity : Infinity,
    }),
  );

  for (let depth = 1; depth <= maxDepth; depth++) {
    searchMinDepthActive = depth <= 1;
    if (!searchMinDepthActive && isTimeUp()) break;

    const depthScores: number[] = new Array(scored.length);
    let completed = true;
    for (let i = 0; i < scored.length; i++) {
      if (isTimeUp()) {
        completed = false;
        break;
      }
      const newBoard = applyMove(board, scored[i].move);
      const s = minimax(
        newBoard,
        depth - 1,
        -Infinity,
        Infinity,
        !maximizing,
        1,
      );
      if (isTimeUp()) {
        completed = false;
        break;
      }
      depthScores[i] = s;
    }

    if (completed) {
      for (let i = 0; i < scored.length; i++) {
        scored[i].score = depthScores[i];
      }
    } else {
      break;
    }
  }

  searchMinDepthActive = false;

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  return scored.slice(0, count);
}
