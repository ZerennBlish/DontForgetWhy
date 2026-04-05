import { Chess } from 'chess.js';

// ── Piece values (centipawns) ─────────────────────────────────────────────
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// ── Piece-square tables (from Chess Programming Wiki, simplified eval) ────
// Indexed a1..h1, a2..h2, ..., a8..h8 (i.e. index 0 = a1, index 63 = h8).
// All tables are from White's perspective. For black pieces, we mirror
// vertically (flip rank).

// prettier-ignore
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10,-20,-20, 10, 10,  5,
   5, -5,-10,  0,  0,-10, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0,
];

// prettier-ignore
const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

// prettier-ignore
const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

// prettier-ignore
const ROOK_TABLE = [
   0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   5, 10, 10, 10, 10, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

// prettier-ignore
const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -10,  5,  5,  5,  5,  5,  0,-10,
    0,  0,  5,  5,  5,  5,  0, -5,
   -5,  0,  5,  5,  5,  5,  0, -5,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

// prettier-ignore
const KING_MG_TABLE = [
   20, 30, 10,  0,  0, 10, 30, 20,
   20, 20,  0,  0,  0,  0, 20, 20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
];

// prettier-ignore
const KING_EG_TABLE = [
  -50,-30,-30,-30,-30,-30,-30,-50,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -50,-40,-30,-20,-20,-30,-40,-50,
];

const PIECE_SQUARE_TABLES: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
};

// ── Endgame detection ─────────────────────────────────────────────────────
// Simple heuristic: endgame if no queens on the board OR total non-pawn,
// non-king material is below 1300 centipawns.
export function isEndgame(game: Chess): boolean {
  const board = game.board();
  let hasQueen = false;
  let nonPawnMaterial = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.type === 'q') hasQueen = true;
      if (cell.type !== 'p' && cell.type !== 'k') {
        nonPawnMaterial += PIECE_VALUES[cell.type];
      }
    }
  }
  return !hasQueen || nonPawnMaterial < 1300;
}

// ── Board evaluation (from White's perspective) ───────────────────────────
export function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    // Player to move is mated.
    return game.turn() === 'w' ? -100000 : 100000;
  }
  if (game.isDraw() || game.isStalemate()) {
    return 0;
  }

  const endgame = isEndgame(game);
  const board = game.board();
  let score = 0;

  // Positional counters collected during the main loop.
  let whiteBishops = 0;
  let blackBishops = 0;
  const whitePawnFiles: number[] = [];
  const blackPawnFiles: number[] = [];
  let whiteKingRow = 0;
  let whiteKingCol = 0;
  let blackKingRow = 0;
  let blackKingCol = 0;

  // chess.js board()[0] = rank 8, board()[7] = rank 1.
  // Our PSQTs are indexed a1..h8 (index 0 = a1).
  // For board[row][col]: psqtIndex = (7 - row) * 8 + col (white)
  // For black pieces, mirror vertically: psqtIndex = row * 8 + col
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const material = PIECE_VALUES[piece.type];
      const whiteIdx = (7 - row) * 8 + col;
      const blackIdx = row * 8 + col;

      let positional: number;
      if (piece.type === 'k') {
        const kingTable = endgame ? KING_EG_TABLE : KING_MG_TABLE;
        positional = kingTable[piece.color === 'w' ? whiteIdx : blackIdx];
        if (piece.color === 'w') {
          whiteKingRow = row;
          whiteKingCol = col;
        } else {
          blackKingRow = row;
          blackKingCol = col;
        }
      } else {
        const table = PIECE_SQUARE_TABLES[piece.type];
        positional = table[piece.color === 'w' ? whiteIdx : blackIdx];
      }

      if (piece.type === 'b') {
        if (piece.color === 'w') whiteBishops++;
        else blackBishops++;
      }
      if (piece.type === 'p') {
        if (piece.color === 'w') whitePawnFiles.push(col);
        else blackPawnFiles.push(col);
      }

      if (piece.color === 'w') {
        score += material + positional;
      } else {
        score -= material + positional;
      }
    }
  }

  // Bishop pair bonus (~50 cp in open positions)
  if (whiteBishops >= 2) score += 50;
  if (blackBishops >= 2) score -= 50;

  // Doubled pawns: -15 per extra pawn on the same file
  for (let f = 0; f < 8; f++) {
    const wCount = whitePawnFiles.filter((c) => c === f).length;
    const bCount = blackPawnFiles.filter((c) => c === f).length;
    if (wCount > 1) score -= 15 * (wCount - 1);
    if (bCount > 1) score += 15 * (bCount - 1);
  }

  // Isolated pawns: -10 per pawn with no friendly pawn on adjacent files
  for (const file of whitePawnFiles) {
    const hasNeighbor = whitePawnFiles.some(
      (f) => f === file - 1 || f === file + 1,
    );
    if (!hasNeighbor) score -= 10;
  }
  for (const file of blackPawnFiles) {
    const hasNeighbor = blackPawnFiles.some(
      (f) => f === file - 1 || f === file + 1,
    );
    if (!hasNeighbor) score += 10;
  }

  // King safety (middlegame only): count friendly pawns within 1 square
  // of the king as a "pawn shield".
  if (!endgame) {
    let whitePawnShield = 0;
    let blackPawnShield = 0;
    for (const r of [whiteKingRow - 1, whiteKingRow, whiteKingRow + 1]) {
      for (const c of [whiteKingCol - 1, whiteKingCol, whiteKingCol + 1]) {
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const p = board[r][c];
        if (p && p.type === 'p' && p.color === 'w') whitePawnShield++;
      }
    }
    for (const r of [blackKingRow - 1, blackKingRow, blackKingRow + 1]) {
      for (const c of [blackKingCol - 1, blackKingCol, blackKingCol + 1]) {
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const p = board[r][c];
        if (p && p.type === 'p' && p.color === 'b') blackPawnShield++;
      }
    }
    score += whitePawnShield * 15;
    score -= blackPawnShield * 15;
  }

  // Mobility: 3 cp per legal move for the side to move.
  const currentMoves = game.moves().length;
  const mobilityBonus = currentMoves * 3;
  if (game.turn() === 'w') {
    score += mobilityBonus;
  } else {
    score -= mobilityBonus;
  }

  return score;
}

// ── Move ordering (MVV-LVA + checks) for alpha-beta pruning ──────────────
// Score each move so the best-looking candidates are searched first.
// Captures score by MVV-LVA: victim value minus a fraction of attacker value.
// Checks add a bonus so they rank above quiet moves.
interface OrderableMove {
  san: string;
  piece: string;
  captured?: string;
  flags: string;
}

function scoreMoveForOrdering(move: OrderableMove): number {
  let score = 0;
  if (move.flags.includes('c')) {
    const victim = move.captured ? PIECE_VALUES[move.captured] || 0 : 0;
    const attacker = PIECE_VALUES[move.piece] || 0;
    score += victim - attacker / 10;
  }
  if (move.san.includes('+')) {
    score += 50;
  }
  return score;
}

function orderMoves<T extends OrderableMove>(moves: T[]): T[] {
  return [...moves].sort(
    (a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a),
  );
}

// ── Search time budget (shared module state) ─────────────────────────────
// findBestMove sets `searchDeadline` before its iterative-deepening loop;
// minimax polls `isTimeUp()` and bails out with the current static eval if
// the deadline has passed. Callers that use minimax outside of findBestMove
// (e.g. analyzeMove's scoring) must reset `searchDeadline` themselves.
let searchDeadline = 0;

function isTimeUp(): boolean {
  return Date.now() >= searchDeadline;
}

// ── Quiescence search ────────────────────────────────────────────────────
// At depth 0, instead of returning a static eval (which can be wildly
// misleading mid-capture sequence), search captures until the position is
// "quiet". This avoids the horizon effect: the engine no longer thinks
// "I'm up a knight!" at the top of a trade where it's about to be
// recaptured for free.
function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (isTimeUp()) return evaluateBoard(game);

  const standPat = evaluateBoard(game);

  if (maximizing) {
    if (standPat >= beta) return standPat;
    if (standPat > alpha) alpha = standPat;

    const captures = game
      .moves({ verbose: true })
      .filter((m) => m.captured);
    if (captures.length === 0) return standPat;

    const ordered = orderMoves(captures);
    let best = standPat;
    for (const move of ordered) {
      // Delta pruning: if capturing this piece (+ margin) still can't
      // reach alpha, skip.
      const victimValue = PIECE_VALUES[move.captured!] || 0;
      if (standPat + victimValue + 200 < alpha) continue;

      game.move(move.san);
      const score = quiescence(game, alpha, beta, false);
      game.undo();

      if (isTimeUp()) return best;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    if (standPat <= alpha) return standPat;
    if (standPat < beta) beta = standPat;

    const captures = game
      .moves({ verbose: true })
      .filter((m) => m.captured);
    if (captures.length === 0) return standPat;

    const ordered = orderMoves(captures);
    let best = standPat;
    for (const move of ordered) {
      const victimValue = PIECE_VALUES[move.captured!] || 0;
      if (standPat - victimValue - 200 > beta) continue;

      game.move(move.san);
      const score = quiescence(game, alpha, beta, true);
      game.undo();

      if (isTimeUp()) return best;
      if (score < best) best = score;
      if (score < beta) beta = score;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// ── Minimax with alpha-beta pruning ───────────────────────────────────────
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (isTimeUp()) return evaluateBoard(game);
  if (game.isGameOver()) {
    return evaluateBoard(game);
  }
  if (depth === 0) {
    return quiescence(game, alpha, beta, maximizing);
  }

  const moves = orderMoves(game.moves({ verbose: true }));

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── Iterative-deepening search with time budget ─────────────────────────
// Searches depth 1, then 2, …, up to maxDepth. Each completed depth
// overwrites the best move; a partial depth is discarded (the previous
// completed depth's result is kept). Guarantees a legal move even under
// a tight time budget.
export function findBestMove(
  game: Chess,
  maxDepth: number,
  timeLimitMs: number = 1500,
): string | null {
  if (game.isGameOver()) return null;
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0].san;

  const maximizing = game.turn() === 'w';
  const ordered = orderMoves(moves);
  let bestMove: string = ordered[0].san;
  searchDeadline = Date.now() + timeLimitMs;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (isTimeUp()) break;

    let bestScore = maximizing ? -Infinity : Infinity;
    let depthBestMove: string | null = null;
    let completed = true;
    // Carry alpha/beta across root siblings so tightening from one move
    // helps prune the subtrees of subsequent moves.
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of ordered) {
      if (isTimeUp()) {
        completed = false;
        break;
      }

      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, !maximizing);
      game.undo();

      if (isTimeUp()) {
        completed = false;
        break;
      }

      if (maximizing) {
        if (score > bestScore) {
          bestScore = score;
          depthBestMove = move.san;
        }
        if (score > alpha) alpha = score;
      } else {
        if (score < bestScore) {
          bestScore = score;
          depthBestMove = move.san;
        }
        if (score < beta) beta = score;
      }
    }

    if (completed && depthBestMove) {
      bestMove = depthBestMove;
      // Move the PV to the front of `ordered` so the next (deeper)
      // iteration searches it first — that's the whole point of IDS.
      const pvIndex = ordered.findIndex((m) => m.san === depthBestMove);
      if (pvIndex > 0) {
        const [pvMove] = ordered.splice(pvIndex, 1);
        ordered.unshift(pvMove);
      }
    }
  }

  return bestMove;
}

// ── Difficulty levels ─────────────────────────────────────────────────────
export interface DifficultyLevel {
  name: string;
  depth: number;
  randomness: number; // 0 = always best move, higher = more random
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: 'Beginner', depth: 2, randomness: 0.4 },
  { name: 'Casual', depth: 3, randomness: 0.2 },
  { name: 'Intermediate', depth: 4, randomness: 0.05 },
  { name: 'Advanced', depth: 5, randomness: 0 },
  { name: 'Expert', depth: 6, randomness: 0 },
];

// ── AI move with difficulty-based randomness ──────────────────────────────
// Time budget per difficulty (ms). Iterative deepening uses whatever search
// depth it can fit within this budget, up to level.depth.
export const TIME_LIMITS_MS = [300, 500, 1000, 2000, 5000];

export function getAIMove(game: Chess, level: DifficultyLevel): string | null {
  if (game.isGameOver()) return null;
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const timeLimit =
    TIME_LIMITS_MS[DIFFICULTY_LEVELS.indexOf(level)] ?? 1500;

  if (level.randomness <= 0) {
    return findBestMove(game, level.depth, timeLimit);
  }

  // Anchor the search (also validates game state).
  const bestSan = findBestMove(game, level.depth, timeLimit);
  if (!bestSan) return moves[0].san;

  const maximizing = game.turn() === 'w';
  const threshold = level.randomness * 100;

  // Evaluate ALL moves with static eval (including the anchor) so the
  // candidate filter compares like-to-like. Mixing deep-search scores
  // with static scores can surface tactical blunders as "equal".
  const scored: Array<{ san: string; score: number }> = [];
  for (const move of moves) {
    game.move(move.san);
    const score = evaluateBoard(game);
    game.undo();
    scored.push({ san: move.san, score });
  }

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  const topScore = scored[0].score;
  const candidates = scored.filter((m) => {
    const diff = maximizing ? topScore - m.score : m.score - topScore;
    return diff <= threshold;
  });

  return candidates[Math.floor(Math.random() * candidates.length)].san;
}

// ── Blunder detection ─────────────────────────────────────────────────────
export interface BlunderResult {
  severity: 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'catastrophe';
  centipawnLoss: number;
  bestMove: string | null;
}

export function analyzeMove(
  gameBefore: string,
  movePlayedSan: string,
  depth: number,
): BlunderResult {
  const game = new Chess(gameBefore);
  const playerColor = game.turn();
  const maximizing = playerColor === 'w';

  // 1. Find the best move using alpha-beta (fast — a single deep search).
  const bestMoveSan = findBestMove(game, depth);
  if (!bestMoveSan) {
    return { severity: 'good', centipawnLoss: 0, bestMove: null };
  }

  // 2. Score both resulting positions via a shallow minimax so tactical
  //    losses (e.g. hanging a piece) aren't missed by pure static eval.
  //    findBestMove may have expired the shared deadline — give scoring
  //    its own budget.
  const scoreDepth = Math.max(1, depth - 1);
  searchDeadline = Date.now() + 2000;

  game.move(bestMoveSan);
  const bestScore = minimax(
    game,
    scoreDepth,
    -Infinity,
    Infinity,
    !maximizing,
  );
  game.undo();

  let playedScore: number;
  try {
    game.move(movePlayedSan);
    playedScore = minimax(
      game,
      scoreDepth,
      -Infinity,
      Infinity,
      !maximizing,
    );
    game.undo();
  } catch {
    return { severity: 'good', centipawnLoss: 0, bestMove: bestMoveSan };
  }

  // 3. Centipawn loss from the player's perspective (always >= 0).
  const rawLoss = maximizing
    ? bestScore - playedScore
    : playedScore - bestScore;
  const centipawnLoss = Math.max(0, rawLoss);

  let severity: BlunderResult['severity'];
  if (centipawnLoss < 50) severity = 'good';
  else if (centipawnLoss < 150) severity = 'inaccuracy';
  else if (centipawnLoss < 300) severity = 'mistake';
  else if (centipawnLoss < 600) severity = 'blunder';
  else severity = 'catastrophe';

  return { severity, centipawnLoss, bestMove: bestMoveSan };
}
