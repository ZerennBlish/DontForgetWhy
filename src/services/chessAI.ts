import { Chess } from 'chess.js';
import { OPENING_BOOK, positionKey } from '../data/openingBook';

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

// ── Tapered-eval phase ────────────────────────────────────────────────────
// Continuous "how middlegame is this position?" value in [0, 1]. Used to
// blend middlegame and endgame evaluations instead of flipping hard at an
// arbitrary threshold. 1.0 = full opening material, 0.0 = bare kings.
// Starting non-pawn/non-king material: 2N(320) + 2B(330) + 2R(500) + Q(900)
// = 3200 per side × 2 = 6400 total. Computed inline in evaluateBoard so we
// don't iterate the board twice per eval.
const TOTAL_PHASE = 6400;

// Passed-pawn bonus by rank from the pawn's own side (0 = 1st rank,
// 7 = promotion square). Bonus grows steeply as the pawn nears promotion
// since passed pawns 1-2 squares from queening are near-decisive.
// prettier-ignore
const PASSED_PAWN_BONUS = [0, 10, 15, 25, 40, 60, 90, 0];

// ── Board evaluation (from White's perspective) ───────────────────────────
export function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    // Player to move is mated.
    return game.turn() === 'w' ? -100000 : 100000;
  }
  if (game.isDraw() || game.isStalemate()) {
    return 0;
  }

  const board = game.board();
  let score = 0;

  // Positional counters collected during the main loop.
  let whiteBishops = 0;
  let blackBishops = 0;
  const whitePawnFiles: number[] = [];
  const blackPawnFiles: number[] = [];
  let whiteKingRow = 0;
  let whiteKingCol = 0;
  let whiteKingIdx = 0;
  let blackKingRow = 0;
  let blackKingCol = 0;
  let blackKingIdx = 0;
  // Accumulate non-pawn/non-king material for the tapered-eval phase.
  let nonPawnMaterial = 0;

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

      if (piece.type === 'k') {
        // King PST is tapered — defer until phase is known. King material
        // cancels between colours (+20000/-20000), so skip adding it.
        if (piece.color === 'w') {
          whiteKingRow = row;
          whiteKingCol = col;
          whiteKingIdx = whiteIdx;
        } else {
          blackKingRow = row;
          blackKingCol = col;
          blackKingIdx = blackIdx;
        }
        continue;
      }

      const positional =
        PIECE_SQUARE_TABLES[piece.type][
          piece.color === 'w' ? whiteIdx : blackIdx
        ];

      if (piece.type === 'b') {
        if (piece.color === 'w') whiteBishops++;
        else blackBishops++;
      }
      if (piece.type === 'p') {
        if (piece.color === 'w') whitePawnFiles.push(col);
        else blackPawnFiles.push(col);
      } else {
        // Non-pawn (and non-king, guarded above) → contributes to phase.
        nonPawnMaterial += material;
      }

      if (piece.color === 'w') {
        score += material + positional;
      } else {
        score -= material + positional;
      }
    }
  }

  // Tapered-eval phase now that we've scanned the whole board once.
  const phase = Math.min(1, nonPawnMaterial / TOTAL_PHASE);

  // Tapered king PST (deferred from the main loop).
  score += Math.round(
    KING_MG_TABLE[whiteKingIdx] * phase +
      KING_EG_TABLE[whiteKingIdx] * (1 - phase),
  );
  score -= Math.round(
    KING_MG_TABLE[blackKingIdx] * phase +
      KING_EG_TABLE[blackKingIdx] * (1 - phase),
  );

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

  // Passed pawns: a pawn with no enemy pawn ahead on the same or adjacent
  // file. Highly valuable, scaled up further in endgames (50% bonus at
  // phase=0). board[0] is rank 8 (white target), board[7] is rank 1.
  const passedEndgameScale = 1 + (1 - phase) * 0.5;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'p') continue;

      let isPassed = true;
      if (piece.color === 'w') {
        // White advances to lower row indices.
        for (let r = row - 1; r >= 0 && isPassed; r--) {
          for (const c of [col - 1, col, col + 1]) {
            if (c < 0 || c > 7) continue;
            const blocker = board[r][c];
            if (blocker && blocker.type === 'p' && blocker.color === 'b') {
              isPassed = false;
              break;
            }
          }
        }
        if (isPassed) {
          const rank = 7 - row;
          score += Math.round(PASSED_PAWN_BONUS[rank] * passedEndgameScale);
        }
      } else {
        for (let r = row + 1; r < 8 && isPassed; r++) {
          for (const c of [col - 1, col, col + 1]) {
            if (c < 0 || c > 7) continue;
            const blocker = board[r][c];
            if (blocker && blocker.type === 'p' && blocker.color === 'w') {
              isPassed = false;
              break;
            }
          }
        }
        if (isPassed) {
          const rank = row;
          score -= Math.round(PASSED_PAWN_BONUS[rank] * passedEndgameScale);
        }
      }
    }
  }

  // Rooks on open / semi-open files. Open = no pawns; semi-open = only
  // enemy pawns on this file.
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'r') continue;
      const friendlyOnFile =
        piece.color === 'w'
          ? whitePawnFiles.includes(col)
          : blackPawnFiles.includes(col);
      const enemyOnFile =
        piece.color === 'w'
          ? blackPawnFiles.includes(col)
          : whitePawnFiles.includes(col);
      if (!friendlyOnFile && !enemyOnFile) {
        score += piece.color === 'w' ? 25 : -25;
      } else if (!friendlyOnFile && enemyOnFile) {
        score += piece.color === 'w' ? 15 : -15;
      }
    }
  }

  // King safety: count friendly pawns within 1 square of the king as a
  // "pawn shield". Scaled by phase so the bonus fades into the endgame.
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
  score += Math.round(whitePawnShield * 15 * phase);
  score -= Math.round(blackPawnShield * 15 * phase);

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

function scoreMoveForOrdering(
  move: OrderableMove,
  ttMove: string | null,
  ply: number,
): number {
  // TT best move always searched first.
  if (ttMove && move.san === ttMove) return 100_000;

  let score = 0;
  // chess.js sets `captured` for any capture (including en passant, which
  // uses flag 'e' rather than 'c'). Use the field directly.
  const isCapture = !!move.captured;
  if (isCapture) {
    const victim = move.captured ? PIECE_VALUES[move.captured] || 0 : 0;
    const attacker = PIECE_VALUES[move.piece] || 0;
    score += victim - attacker / 10;
  }
  if (move.san.includes('+')) {
    score += 50;
  }
  // Killer moves (quiet moves that caused a beta cutoff at this ply).
  // Scored above quiet moves (0) but below the MVV-LVA of equal or
  // winning captures so real material gains are still searched first.
  if (!isCapture && ply >= 0 && ply < MAX_PLY) {
    const slot = killerMoves[ply];
    if (slot[0] === move.san) score += 90;
    else if (slot[1] === move.san) score += 80;
  }
  return score;
}

function orderMoves<T extends OrderableMove>(
  moves: T[],
  ttMove: string | null = null,
  ply: number = -1,
): T[] {
  return [...moves].sort(
    (a, b) =>
      scoreMoveForOrdering(b, ttMove, ply) -
      scoreMoveForOrdering(a, ttMove, ply),
  );
}

// ── Search time budget (shared module state) ─────────────────────────────
// findBestMove sets `searchDeadline` before its iterative-deepening loop;
// minimax polls `isTimeUp()` and bails out with the current static eval if
// the deadline has passed. Callers that use minimax outside of findBestMove
// (e.g. analyzeMove's scoring) must reset `searchDeadline` themselves.
// `searchMinDepthActive` relaxes the normal time check while the IDS loop
// is at or below minDepth so we reach the competence floor. `searchSafetyDeadline`
// is a hard ceiling (3× budget) that fires even in that mode — so a
// branch-heavy position can't spiral into a 30s search.
let searchDeadline = 0;
let searchSafetyDeadline = 0;
let searchMinDepthActive = false;

function isTimeUp(): boolean {
  if (searchMinDepthActive) {
    return Date.now() >= searchSafetyDeadline;
  }
  return Date.now() >= searchDeadline;
}

// ── Transposition table ──────────────────────────────────────────────────
// Caches previously-searched positions so that iterative deepening (and
// move-ordering transpositions within a single depth) don't re-search them.
// Entries are keyed by position-only FEN and store (depth, score, bound,
// bestMove). A bound of EXACT means the score is accurate; LOWERBOUND means
// true score >= stored; UPPERBOUND means true score <= stored.
const enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove: string | null;
}

const TT_MAX_SIZE = 100_000;
const transpositionTable = new Map<string, TTEntry>();

function ttKey(game: Chess): string {
  // Include the halfmove clock (field 5) so positions with different
  // 50-move-rule runway don't collide: a value proven safe with 50
  // halfmoves of runway isn't necessarily safe with 5.
  return game.fen().split(' ').slice(0, 5).join(' ');
}

function ttLookup(game: Chess): TTEntry | undefined {
  return transpositionTable.get(ttKey(game));
}

function ttStore(
  game: Chess,
  depth: number,
  score: number,
  flag: TTFlag,
  bestMove: string | null,
): void {
  const key = ttKey(game);
  const existing = transpositionTable.get(key);
  // Replace only if new entry searched at least as deep as existing one.
  if (existing && depth < existing.depth) return;
  // Evict oldest entry (Map preserves insertion order) if we're at capacity
  // and this is a brand-new key.
  if (!existing && transpositionTable.size >= TT_MAX_SIZE) {
    const firstKey = transpositionTable.keys().next().value;
    if (firstKey !== undefined) transpositionTable.delete(firstKey);
  }
  transpositionTable.set(key, { depth, score, flag, bestMove });
}

/** Clear the TT between games to drop stale entries. findBestMove() also
 * clears at the start of each search. */
export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

// ── Mate-score ply adjustment ────────────────────────────────────────────
// Mate scores are stored relative to the current node (not root) so that
// a TT entry captured at ply 5 can be meaningfully compared to a fresh
// search at ply 2. ±90000 is the threshold for "this is a mate score".
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

// ── Killer move heuristic ────────────────────────────────────────────────
// Track up to 2 quiet moves per ply that caused a beta cutoff. These are
// re-ordered to the front of sibling searches at the same ply, dramatically
// improving alpha-beta pruning on tactical positions.
const MAX_PLY = 32;
const killerMoves: Array<[string | null, string | null]> = Array.from(
  { length: MAX_PLY },
  () => [null, null] as [string | null, string | null],
);

function storeKiller(ply: number, moveSan: string): void {
  if (ply < 0 || ply >= MAX_PLY) return;
  const slot = killerMoves[ply];
  if (slot[0] === moveSan) return;
  slot[1] = slot[0];
  slot[0] = moveSan;
}

function clearKillers(): void {
  for (let i = 0; i < MAX_PLY; i++) {
    killerMoves[i] = [null, null];
  }
}

// ── Opening book lookup ──────────────────────────────────────────────────
/** Returns a book move if the current position is known, or null if we're
 * out of book. Picks randomly from the list for variety. */
export function getBookMove(game: Chess): string | null {
  const key = positionKey(game.fen());
  const moves = OPENING_BOOK[key];
  if (!moves || moves.length === 0) return null;
  const legal = new Set(game.moves());
  const valid = moves.filter((m) => legal.has(m));
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
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
  ply: number,
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
      const score = quiescence(game, alpha, beta, false, ply + 1);
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
      const score = quiescence(game, alpha, beta, true, ply + 1);
      game.undo();

      if (isTimeUp()) return best;
      if (score < best) best = score;
      if (score < beta) beta = score;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// ── Minimax with alpha-beta pruning + TT + null move + killers ───────────
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  ply: number,
): number {
  if (isTimeUp()) return evaluateBoard(game);
  if (game.isGameOver()) {
    return evaluateBoard(game);
  }
  if (depth === 0) {
    return quiescence(game, alpha, beta, maximizing, ply);
  }

  const origAlpha = alpha;
  const origBeta = beta;

  // ── Transposition table lookup ──
  const ttEntry = ttLookup(game);
  if (ttEntry && ttEntry.depth >= depth) {
    const ttScore = adjustMateScoreFromTT(ttEntry.score, ply);
    if (ttEntry.flag === TTFlag.EXACT) return ttScore;
    if (ttEntry.flag === TTFlag.LOWERBOUND && ttScore > alpha) alpha = ttScore;
    else if (ttEntry.flag === TTFlag.UPPERBOUND && ttScore < beta)
      beta = ttScore;
    if (alpha >= beta) return ttScore;
  }
  const ttBestMove = ttEntry?.bestMove ?? null;

  // ── Null move pruning ──
  // If we can "pass" and still cause a beta cutoff, the position is so
  // winning we can prune. Skipped in check (illegal) and in endgame
  // (zugzwang: positions where any move is worse than standing still).
  const R = 2;
  if (depth >= R + 1 && !game.isCheck() && !isEndgame(game)) {
    const fen = game.fen();
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-'; // en passant is invalid after skipping a turn
    // chess.js requires halfmove/fullmove fields to construct from FEN.
    if (parts.length < 6) {
      parts[4] = parts[4] ?? '0';
      parts[5] = parts[5] ?? '1';
    }
    let nullGame: Chess | null = null;
    try {
      nullGame = new Chess(parts.join(' '));
    } catch {
      nullGame = null;
    }
    if (nullGame) {
      const nullScore = minimax(
        nullGame,
        depth - 1 - R,
        alpha,
        beta,
        !maximizing,
        ply + 1,
      );
      if (!isTimeUp()) {
        if (maximizing && nullScore >= beta) return nullScore;
        if (!maximizing && nullScore <= alpha) return nullScore;
      }
    }
  }

  const moves = orderMoves(
    game.moves({ verbose: true }),
    ttBestMove,
    ply,
  );

  let depthBestMove: string | null = null;
  let best: number;

  if (maximizing) {
    best = -Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, false, ply + 1);
      game.undo();
      if (score > best) {
        best = score;
        depthBestMove = move.san;
      }
      if (best > alpha) alpha = best;
      if (beta <= alpha) {
        // Beta cutoff: remember quiet moves that cause cutoffs.
        if (!move.captured) storeKiller(ply, move.san);
        break;
      }
    }
  } else {
    best = Infinity;
    for (const move of moves) {
      game.move(move.san);
      const score = minimax(game, depth - 1, alpha, beta, true, ply + 1);
      game.undo();
      if (score < best) {
        best = score;
        depthBestMove = move.san;
      }
      if (best < beta) beta = best;
      if (beta <= alpha) {
        if (!move.captured) storeKiller(ply, move.san);
        break;
      }
    }
  }

  // ── Transposition table store ──
  // Don't cache partial results when the search was aborted by time-out —
  // those scores may be arbitrary static evals from deep in the tree.
  if (!isTimeUp()) {
    let flag: TTFlag;
    if (best <= origAlpha) flag = TTFlag.UPPERBOUND;
    else if (best >= origBeta) flag = TTFlag.LOWERBOUND;
    else flag = TTFlag.EXACT;
    ttStore(
      game,
      depth,
      adjustMateScoreForTT(best, ply),
      flag,
      depthBestMove,
    );
  }

  return best;
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
  minDepth: number = 1,
  useBook: boolean = true,
): string | null {
  if (game.isGameOver()) return null;

  // Opening book: if we know this position, skip search entirely. Analysis
  // callers (e.g. analyzeMove) pass useBook=false so they always get a
  // deterministic search-based recommendation to compare against.
  if (useBook) {
    const book = getBookMove(game);
    if (book) return book;
  }

  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0].san;

  // Reset search state for this move. TT is per-search so stale evals from
  // previous positions don't leak in.
  clearTranspositionTable();
  clearKillers();

  const maximizing = game.turn() === 'w';
  const ordered = orderMoves(moves);
  let bestMove: string = ordered[0].san;
  const now = Date.now();
  searchDeadline = now + timeLimitMs;
  searchSafetyDeadline = now + timeLimitMs * 3;

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Disable the time-cutoff entirely while we're at or below minDepth so
    // every minimax/quiescence node completes its search. Above minDepth
    // the budget applies normally.
    searchMinDepthActive = depth <= minDepth;
    if (!searchMinDepthActive && isTimeUp()) break;

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
      const score = minimax(game, depth - 1, alpha, beta, !maximizing, 1);
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

  // Always clear the min-depth override so callers outside findBestMove
  // (e.g. analyzeMove's direct minimax calls) see a normal time budget.
  searchMinDepthActive = false;
  return bestMove;
}

// ── Difficulty levels ─────────────────────────────────────────────────────
// Each level has a MIN depth (must complete before time can stop search),
// a MAX depth (hard cap on iterative deepening), and a time budget (hard
// cutoff). This makes strength device-independent: fast devices don't
// accidentally overplay the weak levels, and slow devices still reach a
// usable depth at Expert.
export interface DifficultyLevel {
  name: string;
  minDepth: number;
  maxDepth: number;
  timeLimitMs: number;
  randomness: number; // 0 = always best move, higher = more random
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: 'Beginner',     minDepth: 1, maxDepth: 2, timeLimitMs: 300,  randomness: 0.4 },
  { name: 'Casual',       minDepth: 1, maxDepth: 3, timeLimitMs: 500,  randomness: 0.2 },
  { name: 'Intermediate', minDepth: 2, maxDepth: 4, timeLimitMs: 1000, randomness: 0.05 },
  { name: 'Advanced',     minDepth: 2, maxDepth: 5, timeLimitMs: 2000, randomness: 0 },
  { name: 'Expert',       minDepth: 3, maxDepth: 6, timeLimitMs: 5000, randomness: 0 },
];

export function getAIMove(game: Chess, level: DifficultyLevel): string | null {
  if (game.isGameOver()) return null;
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Opening book: bypass search for known positions. The book already
  // provides variety (random pick from several sound moves).
  const book = getBookMove(game);
  if (book) return book;

  if (level.randomness <= 0) {
    return findBestMove(
      game,
      level.maxDepth,
      level.timeLimitMs,
      level.minDepth,
    );
  }

  // Anchor the search (also validates game state).
  const bestSan = findBestMove(
    game,
    level.maxDepth,
    level.timeLimitMs,
    level.minDepth,
  );
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

  // Book moves are sound by definition — never flag them as blunders.
  // (Book lists equivalent-strength mainline moves; picking any of them
  // is always correct.)
  const bookMoves = OPENING_BOOK[positionKey(game.fen())];
  if (bookMoves && bookMoves.includes(movePlayedSan)) {
    return { severity: 'good', centipawnLoss: 0, bestMove: movePlayedSan };
  }

  // 1. Find the best move using alpha-beta (fast — a single deep search).
  // Skip the opening book: blunder analysis must compare against the
  // engine's actual search result, not a randomly-picked book move.
  const bestMoveSan = findBestMove(game, depth, 1500, 1, false);
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
    1,
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
      1,
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
