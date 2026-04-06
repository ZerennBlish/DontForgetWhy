// ── Types ────────────────────────────────────────────────────────────────────

export type PieceColor = 'r' | 'b'; // red or black

export interface Piece {
  color: PieceColor;
  king: boolean;
}

export type Board = (Piece | null)[][];

export interface CheckersMove {
  from: [number, number];           // [row, col]
  to: [number, number];             // final destination [row, col]
  captured: [number, number][];     // positions of captured pieces (in order)
  crowned: boolean;                 // whether the piece becomes a king this move
}

// ── Initial board ────────────────────────────────────────────────────────────
// Red starts on rows 5-7 (bottom), black on rows 0-2 (top).
// Only dark squares ((row + col) % 2 === 1) hold pieces.

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = { color: 'b', king: false };
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = { color: 'r', king: false };
    }
  }
  return board;
}

// ── Board helpers ────────────────────────────────────────────────────────────

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function applyMove(board: Board, move: CheckersMove): Board {
  const b = cloneBoard(board);
  const piece = b[move.from[0]][move.from[1]];
  if (!piece) return b;

  // Remove captured pieces
  for (const [cr, cc] of move.captured) {
    b[cr][cc] = null;
  }

  // Move piece
  b[move.from[0]][move.from[1]] = null;
  const movedPiece = { ...piece };
  if (move.crowned) movedPiece.king = true;
  b[move.to[0]][move.to[1]] = movedPiece;

  return b;
}

export function serializeBoard(board: Board, turn: PieceColor): string {
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
  // Red moves toward row 0 (up), black toward row 7 (down)
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

// Recursive DFS for multi-jump chains.
// When a non-king piece lands on its promotion rank, the chain STOPS — the
// piece is crowned but does NOT continue jumping as a king on that turn.
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

    // Can't jump a piece already captured in this chain
    if (captured.some(([cr, cc]) => cr === midR && cc === midC)) continue;

    // Landing square must be empty
    if (tempBoard[landR][landC] !== null) continue;

    const newCaptured: [number, number][] = [...captured, [midR, midC]];

    // Promotion stops the jump chain
    if (!piece.king && isPromotionRow(piece.color, landR)) {
      results.push({
        from: origin,
        to: [landR, landC],
        captured: newCaptured,
        crowned: true,
      });
      continue;
    }

    // Execute the jump on a temp board and recurse
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
      // Terminal jump (no further jumps available)
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

export function generateMoves(board: Board, color: PieceColor): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const simpleMoves: CheckersMove[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      // Try jumps
      const pieceJumps = findJumpChains(
        board, row, col, piece, [], [row, col],
      );
      jumps.push(...pieceJumps);

      // Try simple moves (only used if no jumps exist)
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

  // Forced capture: if any jumps exist, only jumps are legal
  return jumps.length > 0 ? jumps : simpleMoves;
}

// ── Evaluation ───────────────────────────────────────────────────────────────
// Score from Red's perspective (positive = good for red).
// Pure material + positional — no generateMoves calls (those belong in minimax).

// Advancement bonus for non-king pieces (indexed by row)
// Red moves toward row 0: closer to 0 = higher bonus (except row 0 itself = promoted)
// prettier-ignore
const RED_ADVANCE_BONUS   = [0, 40, 28, 18, 10, 5, 2, 0];
// Black moves toward row 7: closer to 7 = higher bonus
// prettier-ignore
const BLACK_ADVANCE_BONUS = [0, 2, 5, 10, 18, 28, 40, 0];

function isKingCenterSquare(row: number, col: number): boolean {
  return row >= 3 && row <= 4 && col >= 2 && col <= 5;
}

export function evaluateBoard(board: Board): number {
  let redPieces = 0;
  let blackPieces = 0;
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const material = piece.king ? 160 : 100;

      if (piece.color === 'r') {
        redPieces++;
        score += material;
        if (!piece.king) {
          score += RED_ADVANCE_BONUS[row];
          // Back rank bonus: red's back rank is row 7
          if (row === 7) score += 8;
        } else {
          if (isKingCenterSquare(row, col)) score += 8;
        }
      } else {
        blackPieces++;
        score -= material;
        if (!piece.king) {
          score -= BLACK_ADVANCE_BONUS[row];
          // Back rank bonus: black's back rank is row 0
          if (row === 0) score -= 8;
        } else {
          if (isKingCenterSquare(row, col)) score -= 8;
        }
      }
    }
  }

  // No pieces = decisive result
  if (redPieces === 0) return -100000;
  if (blackPieces === 0) return 100000;

  return score;
}

// ── Game status ──────────────────────────────────────────────────────────────

export function getGameStatus(
  board: Board,
  turn: PieceColor,
): 'playing' | 'red_wins' | 'black_wins' {
  const moves = generateMoves(board, turn);
  if (moves.length > 0) return 'playing';
  // No legal moves — the side to move loses
  return turn === 'r' ? 'black_wins' : 'red_wins';
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

const enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  bestMoveIdx: number; // index into the move list (or -1)
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

export function clearTranspositionTable(): void {
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
// Captures first (sorted by number of pieces captured desc), then killers, then rest.

function scoreMoveForOrdering(
  move: CheckersMove,
  ttMoveIdx: number,
  moveIdx: number,
  ply: number,
): number {
  // TT best move always searched first
  if (ttMoveIdx >= 0 && moveIdx === ttMoveIdx) return 100_000;

  let score = 0;
  if (move.captured.length > 0) {
    score += 1000 + move.captured.length * 100;
  }

  // Killer moves
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

  // Game over: no legal moves means the current side loses.
  // Include ply penalty so the AI prefers faster mates.
  if (moves.length === 0) {
    return maximizingRed ? -100000 + ply : 100000 - ply;
  }

  if (depth === 0) {
    return evaluateBoard(board);
  }

  const origAlpha = alpha;
  const origBeta = beta;

  // TT lookup
  const key = serializeBoard(board, turn);
  const ttEntry = ttLookup(key);
  let ttMoveIdx = -1;
  if (ttEntry && ttEntry.depth >= depth) {
    const ttScore = adjustMateScoreFromTT(ttEntry.score, ply);
    if (ttEntry.flag === TTFlag.EXACT) return ttScore;
    if (ttEntry.flag === TTFlag.LOWERBOUND && ttScore > alpha) alpha = ttScore;
    else if (ttEntry.flag === TTFlag.UPPERBOUND && ttScore < beta) beta = ttScore;
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

  // Store in TT (skip if time expired — partial results unreliable)
  if (!isTimeUp()) {
    let flag: TTFlag;
    if (best <= origAlpha) flag = TTFlag.UPPERBOUND;
    else if (best >= origBeta) flag = TTFlag.LOWERBOUND;
    else flag = TTFlag.EXACT;
    ttStore(key, depth, adjustMateScoreForTT(best, ply), flag, depthBestIdx);
  }

  return best;
}

// ── Iterative-deepening search ───────────────────────────────────────────────

export function findBestMove(
  board: Board,
  turn: PieceColor,
  maxDepth: number,
  timeLimitMs: number = 1500,
  minDepth: number = 1,
): CheckersMove | null {
  const moves = generateMoves(board, turn);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  clearTranspositionTable();
  clearKillers();

  const maximizing = turn === 'r';
  let bestMove: CheckersMove = moves[0];
  const now = Date.now();
  searchDeadline = now + timeLimitMs;
  searchSafetyDeadline = now + timeLimitMs * 3;

  // Track move ordering across IDS iterations
  let orderedMoves = orderMoves(moves);

  for (let depth = 1; depth <= maxDepth; depth++) {
    searchMinDepthActive = depth <= minDepth;
    if (!searchMinDepthActive && isTimeUp()) break;

    let bestScore = maximizing ? -Infinity : Infinity;
    let depthBest: CheckersMove | null = null;
    let depthBestOrderIdx = -1;
    let completed = true;
    let alpha = -Infinity;
    let beta = Infinity;

    for (let i = 0; i < orderedMoves.length; i++) {
      const { move } = orderedMoves[i];
      if (isTimeUp()) {
        completed = false;
        break;
      }

      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, !maximizing, 1);

      if (isTimeUp()) {
        completed = false;
        break;
      }

      if (maximizing) {
        if (score > bestScore) {
          bestScore = score;
          depthBest = move;
          depthBestOrderIdx = i;
        }
        if (score > alpha) alpha = score;
      } else {
        if (score < bestScore) {
          bestScore = score;
          depthBest = move;
          depthBestOrderIdx = i;
        }
        if (score < beta) beta = score;
      }
    }

    if (completed && depthBest) {
      bestMove = depthBest;
      // Move PV to front for next iteration
      if (depthBestOrderIdx > 0) {
        const [pvEntry] = orderedMoves.splice(depthBestOrderIdx, 1);
        orderedMoves.unshift(pvEntry);
      }
    }
  }

  searchMinDepthActive = false;
  return bestMove;
}

// ── Difficulty levels ────────────────────────────────────────────────────────

export interface DifficultyLevel {
  name: string;
  minDepth: number;
  maxDepth: number;
  timeLimitMs: number;
  randomness: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: 'Beginner',     minDepth: 2,  maxDepth: 4,  timeLimitMs: 500,  randomness: 0.4 },
  { name: 'Casual',       minDepth: 3,  maxDepth: 6,  timeLimitMs: 800,  randomness: 0.2 },
  { name: 'Intermediate', minDepth: 4,  maxDepth: 8,  timeLimitMs: 1500, randomness: 0.05 },
  { name: 'Advanced',     minDepth: 5,  maxDepth: 10, timeLimitMs: 3000, randomness: 0 },
  { name: 'Expert',       minDepth: 6,  maxDepth: 14, timeLimitMs: 5000, randomness: 0 },
];

// ── AI move selection ────────────────────────────────────────────────────────

export function getAIMove(
  board: Board,
  turn: PieceColor,
  level: DifficultyLevel,
): CheckersMove | null {
  const moves = generateMoves(board, turn);
  if (moves.length === 0) return null;

  if (level.randomness <= 0) {
    return findBestMove(board, turn, level.maxDepth, level.timeLimitMs, level.minDepth);
  }

  // Find best move as anchor
  const best = findBestMove(board, turn, level.maxDepth, level.timeLimitMs, level.minDepth);
  if (!best) return moves[0];

  const maximizing = turn === 'r';
  const threshold = level.randomness * 100;

  // Evaluate all moves with static eval for candidate filtering
  const scored: Array<{ move: CheckersMove; score: number }> = [];
  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const score = evaluateBoard(newBoard);
    scored.push({ move, score });
  }

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  const topScore = scored[0].score;
  const candidates = scored.filter((m) => {
    const diff = maximizing ? topScore - m.score : m.score - topScore;
    return diff <= threshold;
  });

  return candidates[Math.floor(Math.random() * candidates.length)].move;
}
