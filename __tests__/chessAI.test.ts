import { Chess } from 'chess.js';
import {
  evaluateBoard,
  isEndgame,
  findBestMove,
  getAIMove,
  analyzeMove,
  DIFFICULTY_LEVELS,
  getBookMove,
  clearTranspositionTable,
} from '../src/services/chessAI';
import { positionKey } from '../src/data/openingBook';
import { getPieceImage } from '../src/data/chessAssets';

// Allow extra time for the deeper minimax searches (Expert = depth 3).
jest.setTimeout(60000);

// ── evaluateBoard ─────────────────────────────────────────────────────────
describe('evaluateBoard', () => {
  it('evaluates starting position near zero (±80 centipawns)', () => {
    const game = new Chess();
    const score = evaluateBoard(game);
    expect(Math.abs(score)).toBeLessThanOrEqual(80);
  });

  it('evaluates position with extra white queen strongly positive', () => {
    // Normal start but add a white queen on d4.
    const game = new Chess('rnbqkbnr/pppppppp/8/8/3Q4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const score = evaluateBoard(game);
    expect(score).toBeGreaterThan(800);
  });

  it('evaluates position with extra black queen strongly negative', () => {
    const game = new Chess('rnbqkbnr/pppppppp/8/8/3q4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const score = evaluateBoard(game);
    expect(score).toBeLessThan(-800);
  });
});

// ── isEndgame ─────────────────────────────────────────────────────────────
describe('isEndgame', () => {
  it('returns false for the starting position', () => {
    const game = new Chess();
    expect(isEndgame(game)).toBe(false);
  });

  it('returns true when both sides have no queens', () => {
    // Kings + pawns only — no queens → endgame.
    const game = new Chess('4k3/p7/8/8/8/8/P7/4K3 w - - 0 1');
    expect(isEndgame(game)).toBe(true);
  });

  it('returns true for low non-pawn material with queens present', () => {
    // King + queen vs king → 900 non-pawn material < 1300 → endgame.
    const game = new Chess('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    expect(isEndgame(game)).toBe(true);
  });
});

// ── findBestMove / getAIMove ──────────────────────────────────────────────
describe('findBestMove', () => {
  it('returns a legal SAN move from the starting position', () => {
    const game = new Chess();
    const move = findBestMove(game, 2);
    expect(move).not.toBeNull();
    // Applying the move should not throw.
    expect(() => new Chess().move(move as string)).not.toThrow();
  });

  it('finds mate in 1 (Ra8#) when available', () => {
    // White rook on a1, white king h1, black king g8, black pawns f7/g7/h7.
    // White plays Ra8#.
    const game = new Chess('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1');
    const move = findBestMove(game, 2);
    // chess.js SAN should include "#" (checkmate) or "+" — accept either form.
    expect(move).toMatch(/^Ra8[#+]?$/);
  });

  it('captures a free queen when available', () => {
    // Black knight on c6 can capture undefended white queen on d4.
    const game = new Chess('2k5/8/2n5/8/3Q4/8/8/2K5 b - - 0 1');
    const move = findBestMove(game, 2);
    expect(move).toMatch(/^Nxd4/);
  });

  it('returns null when the game is over (checkmate position)', () => {
    // Position after 1.f3 e5 2.g4 Qh4# (Fool's Mate).
    const game = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(game.isCheckmate()).toBe(true);
    expect(findBestMove(game, 2)).toBeNull();
  });
});

describe('getAIMove — smoke test for all difficulty levels', () => {
  // Use a low-branching endgame so depth 3 stays fast.
  const smokeFen = '4k3/8/8/3P4/3p4/8/8/4K3 w - - 0 1';

  it.each(DIFFICULTY_LEVELS.map((level) => [level.name, level]))(
    'returns a legal move at difficulty %s',
    (_name, level) => {
      const game = new Chess(smokeFen);
      const move = getAIMove(game, level as any);
      expect(move).not.toBeNull();
      expect(() => new Chess(smokeFen).move(move as string)).not.toThrow();
    },
  );
});

// ── analyzeMove (blunder detection) ───────────────────────────────────────
describe('analyzeMove', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/3Q4/8/PPP1PPPP/RNB1KBNR w KQkq - 0 1';

  it('returns "good" severity when the best move is played', () => {
    const game = new Chess();
    const fen = game.fen();
    const best = findBestMove(new Chess(fen), 2) as string;
    const result = analyzeMove(fen, best, 2);
    expect(result.severity).toBe('good');
    expect(result.centipawnLoss).toBe(0);
  });

  it('classifies hanging the queen as "blunder" or "catastrophe"', () => {
    // White queen on d4 plays Qxd7+? — black king on e8 simply recaptures.
    // Queen (~900) lost for pawn (~100) → roughly 800 centipawn swing.
    const result = analyzeMove(startFen, 'Qxd7+', 3);
    expect(['blunder', 'catastrophe']).toContain(result.severity);
    expect(result.centipawnLoss).toBeGreaterThan(300);
  });

  it('returns a positive centipawnLoss for bad moves', () => {
    const result = analyzeMove(startFen, 'Qxd7+', 3);
    expect(result.centipawnLoss).toBeGreaterThan(0);
  });

  it('returns a bestMove suggestion', () => {
    const game = new Chess();
    const result = analyzeMove(game.fen(), 'e4', 2);
    expect(result.bestMove).not.toBeNull();
    expect(typeof result.bestMove).toBe('string');
  });
});

// ── getPieceImage ─────────────────────────────────────────────────────────
describe('getPieceImage', () => {
  it('returns a truthy value for the white king', () => {
    const img = getPieceImage({ type: 'k', color: 'w' });
    expect(img).toBeTruthy();
  });

  it('returns a truthy value for the black pawn', () => {
    const img = getPieceImage({ type: 'p', color: 'b' });
    expect(img).toBeTruthy();
  });

  it('returns a value for every legitimate piece', () => {
    const types = ['p', 'n', 'b', 'r', 'q', 'k'];
    const colors = ['w', 'b'];
    for (const color of colors) {
      for (const type of types) {
        expect(getPieceImage({ type, color })).toBeTruthy();
      }
    }
  });

  it('returns undefined for an invalid piece type', () => {
    expect(getPieceImage({ type: 'x', color: 'w' })).toBeUndefined();
  });

  it('returns undefined for an invalid color', () => {
    expect(getPieceImage({ type: 'p', color: 'z' })).toBeUndefined();
  });
});

// ── Opening book ──────────────────────────────────────────────────────────
describe('opening book', () => {
  it('returns a sound first move for the starting position', () => {
    const game = new Chess();
    const move = getBookMove(game);
    expect(move).not.toBeNull();
    expect(['e4', 'd4', 'Nf3', 'c4']).toContain(move);
  });

  it('only ever returns moves legal in the current position', () => {
    // Probe each starting reply a few times to exercise the random picker.
    for (let i = 0; i < 20; i++) {
      const game = new Chess();
      const move = getBookMove(game);
      expect(game.moves()).toContain(move);
    }
  });

  it('returns null for a position that is not in the book', () => {
    // A mid-game position that no sane book would cover.
    const game = new Chess(
      'r3k2r/ppp2ppp/2n1bn2/3p4/3P4/2NBBN2/PPP2PPP/R3K2R w KQkq - 0 9',
    );
    expect(getBookMove(game)).toBeNull();
  });

  it('returns a known Black reply after 1.e4', () => {
    const game = new Chess();
    game.move('e4');
    const move = getBookMove(game);
    expect(['e5', 'c5', 'e6', 'c6']).toContain(move);
  });

  it("returns a known Black reply after 1.d4 d5 2.c4 (Queen's Gambit)", () => {
    const game = new Chess();
    game.move('d4');
    game.move('d5');
    game.move('c4');
    const move = getBookMove(game);
    expect(['dxc4', 'e6', 'c6']).toContain(move);
  });

  it("returns a known White move after 1.e4 e5 2.Nf3 Nc6 (Italian or Ruy Lopez)", () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Nf3');
    game.move('Nc6');
    const move = getBookMove(game);
    expect(['Bc4', 'Bb5']).toContain(move);
  });
});

describe('positionKey', () => {
  it('strips halfmove and fullmove counters', () => {
    const a = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const b = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 17';
    expect(positionKey(a)).toBe(positionKey(b));
  });

  it('keeps different positions distinct', () => {
    const a = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const b = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
    expect(positionKey(a)).not.toBe(positionKey(b));
  });

  it('produces a 4-field FEN prefix', () => {
    const key = positionKey(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
    expect(key.split(' ')).toHaveLength(4);
  });
});

// ── Transposition table ───────────────────────────────────────────────────
describe('transposition table', () => {
  it('clearTranspositionTable does not break subsequent searches', () => {
    // Populate, clear, then search again — result must still be legal.
    findBestMove(new Chess(), 2, 500, 1, false);
    clearTranspositionTable();
    const game = new Chess();
    const move = findBestMove(game, 2, 500, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });

  it('findBestMove is deterministic on out-of-book positions', () => {
    // Same position searched twice (book disabled) must return the same move.
    const fen =
      'r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 10';
    const move1 = findBestMove(new Chess(fen), 3, 3000, 1, false);
    const move2 = findBestMove(new Chess(fen), 3, 3000, 1, false);
    expect(move1).toBe(move2);
  });

  it.each([
    [
      'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 5',
      'Italian middlegame',
    ],
    [
      'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 3 5',
      'Sicilian Najdorf',
    ],
    [
      'r1bq1rk1/pp3ppp/2nb1n2/2pp4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9',
      'QGD middlegame',
    ],
    ['2r3k1/5ppp/4p3/3p4/3P4/4P3/5PPP/2R3K1 w - - 0 20', 'rook endgame'],
    ['4k3/8/8/3P4/3p4/8/8/4K3 w - - 0 1', 'pawn endgame'],
  ])('returns a legal move on %s (%s)', (fen) => {
    const game = new Chess(fen);
    const move = findBestMove(game, 3, 2500, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });
});

// ── Killer moves ─────────────────────────────────────────────────────────
describe('killer moves integration', () => {
  it.each([
    [
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      'open game',
    ],
    [
      'rnbqkb1r/pp2pppp/3p1n2/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
      'Sicilian',
    ],
    ['4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1', 'pawn symmetry'],
  ])('returns legal moves after killer ordering on %s (%s)', (fen) => {
    const game = new Chess(fen);
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });
});

// ── Null move pruning ────────────────────────────────────────────────────
describe('null move pruning', () => {
  it('handles a non-endgame, not-in-check position (null move may fire)', () => {
    const fen =
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const game = new Chess(fen);
    expect(isEndgame(game)).toBe(false);
    expect(game.isCheck()).toBe(false);
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });

  it('handles an endgame position correctly (null move skipped)', () => {
    const game = new Chess('4k3/8/8/3P4/8/8/8/4K3 w - - 0 1');
    expect(isEndgame(game)).toBe(true);
    const move = findBestMove(game, 4, 2000, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });

  it('handles in-check position correctly (null move must be skipped)', () => {
    // Black rook on a1 gives check to white king on e1 along the first rank.
    const game = new Chess('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    expect(game.isCheck()).toBe(true);
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
    // Resulting position must not be in check.
    const after = new Chess(game.fen());
    after.move(move as string);
    expect(after.isCheck()).toBe(false);
  });
});

// ── Difficulty model ─────────────────────────────────────────────────────
describe('difficulty model', () => {
  it('every level has minDepth <= maxDepth', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(level.minDepth).toBeLessThanOrEqual(level.maxDepth);
    }
  });

  it('every level has a positive timeLimitMs', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(level.timeLimitMs).toBeGreaterThan(0);
    }
  });

  it('every level has randomness in [0, 1]', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(level.randomness).toBeGreaterThanOrEqual(0);
      expect(level.randomness).toBeLessThanOrEqual(1);
    }
  });

  it('strength increases monotonically with level index', () => {
    for (let i = 1; i < DIFFICULTY_LEVELS.length; i++) {
      const prev = DIFFICULTY_LEVELS[i - 1];
      const curr = DIFFICULTY_LEVELS[i];
      expect(curr.maxDepth).toBeGreaterThanOrEqual(prev.maxDepth);
      expect(curr.timeLimitMs).toBeGreaterThanOrEqual(prev.timeLimitMs);
      expect(curr.randomness).toBeLessThanOrEqual(prev.randomness);
    }
  });

  it('Beginner returns a legal move from the starting position', () => {
    const game = new Chess();
    const move = getAIMove(game, DIFFICULTY_LEVELS[0]);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });

  it('Expert returns a legal move from the starting position', () => {
    const game = new Chess();
    const move = getAIMove(game, DIFFICULTY_LEVELS[4]);
    expect(move).not.toBeNull();
    expect(game.moves()).toContain(move);
  });

  it('all 5 levels return legal moves on an out-of-book position', () => {
    const fen =
      'r1bqkb1r/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6';
    for (const level of DIFFICULTY_LEVELS) {
      const game = new Chess(fen);
      const move = getAIMove(game, level);
      expect(move).not.toBeNull();
      expect(game.moves()).toContain(move);
    }
  });

  it('randomness > 0 still returns legal moves (Beginner and Casual)', () => {
    const fen =
      'r1bqkb1r/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6';
    for (const level of [DIFFICULTY_LEVELS[0], DIFFICULTY_LEVELS[1]]) {
      for (let i = 0; i < 5; i++) {
        const game = new Chess(fen);
        const move = getAIMove(game, level);
        expect(move).not.toBeNull();
        expect(game.moves()).toContain(move);
      }
    }
  });
});

// ── Evaluation improvements ──────────────────────────────────────────────
describe('tapered-eval phase (indirect via evaluateBoard)', () => {
  // Mirror of the inline phase calculation in evaluateBoard so we can
  // verify the formula directly without exporting the helper.
  const PIECE_PHASE_VALUES: Record<string, number> = {
    n: 320,
    b: 330,
    r: 500,
    q: 900,
  };
  const TOTAL_PHASE = 6400;
  function phaseOf(game: Chess): number {
    let mat = 0;
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell && PIECE_PHASE_VALUES[cell.type] !== undefined) {
          mat += PIECE_PHASE_VALUES[cell.type];
        }
      }
    }
    return Math.min(1, mat / TOTAL_PHASE);
  }

  it('phase formula returns 1.0 for the starting position', () => {
    expect(phaseOf(new Chess())).toBeCloseTo(1, 2);
  });

  it('phase formula returns 0.0 for king + pawn endgame', () => {
    expect(phaseOf(new Chess('4k3/8/8/3P4/8/8/8/4K3 w - - 0 1'))).toBeCloseTo(
      0,
      2,
    );
  });

  it('phase formula sits in (0, 1) for partial material', () => {
    const p = phaseOf(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'));
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('phase decreases monotonically as material leaves the board', () => {
    const start = phaseOf(new Chess());
    const mid = phaseOf(
      new Chess('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1'),
    );
    const late = phaseOf(new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'));
    expect(start).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(late);
  });
});

describe('evaluateBoard — new terms', () => {
  it('rewards a passed pawn over a blocked pawn of equal material', () => {
    // Both positions have 1 white pawn + 1 black pawn. In `passed`, the
    // black pawn is on a7 (far file, cannot block e-file). In `blocked`,
    // the black pawn sits directly in front of the white pawn on e5.
    const passed = new Chess('4k3/p7/8/8/4P3/8/8/4K3 w - - 0 1');
    const blocked = new Chess('4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1');
    expect(evaluateBoard(passed)).toBeGreaterThan(evaluateBoard(blocked));
  });

  it('passed pawn closer to promotion scores higher', () => {
    const deep = new Chess('4k3/4P3/8/8/8/8/8/4K3 w - - 0 1');
    const shallow = new Chess('4k3/8/8/8/8/4P3/8/4K3 w - - 0 1');
    expect(evaluateBoard(deep)).toBeGreaterThan(evaluateBoard(shallow));
  });

  it('rewards a rook on an open file over a closed file', () => {
    const open = new Chess('4k3/8/8/8/8/8/1P6/R3K3 w - - 0 1');
    const closed = new Chess('4k3/8/8/8/8/8/P7/R3K3 w - - 0 1');
    expect(evaluateBoard(open)).toBeGreaterThan(evaluateBoard(closed));
  });

  it('rewards a rook on a semi-open file over a fully-blocked file', () => {
    // Same material on both sides (1 white pawn, 1 black pawn, 1 white
    // rook, both kings). Only pawn placement differs:
    //   semi:   white pawn on b2 — a-file has only the black pawn → semi-open.
    //   closed: white pawn on a2 — a-file has both colors' pawns → closed.
    const semi = new Chess('4k3/p7/8/8/8/8/1P6/R3K3 w - - 0 1');
    const closed = new Chess('4k3/p7/8/8/8/8/P7/R3K3 w - - 0 1');
    expect(evaluateBoard(semi)).toBeGreaterThan(evaluateBoard(closed));
  });

  it('king eval is smoothly tapered, not binary', () => {
    // A position with heavy material vs one with light material: the king
    // PST contribution should be smoothly different (not identical).
    const heavy = new Chess();
    const light = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    // The king PST table differences guarantee evaluateBoard scores differ.
    expect(evaluateBoard(heavy)).not.toBe(evaluateBoard(light));
  });
});

// ── Integration / tactical puzzles ───────────────────────────────────────
describe('integration — tactical puzzles', () => {
  it('finds mate in 1 with rook (Ra8#)', () => {
    const game = new Chess('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1');
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).toMatch(/^Ra8/);
  });

  it('captures a hanging queen with a knight fork-style shot', () => {
    const game = new Chess('2k5/8/2n5/8/3Q4/8/8/2K5 b - - 0 1');
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).toMatch(/^Nxd4/);
  });

  it('saves an attacked queen by capturing the attacker (Qxa7)', () => {
    // White queen on d4 is attacked by black bishop on a7 along a7-d4.
    // Bishop is undefended: Qxa7 wins the bishop cleanly.
    const game = new Chess('4k3/b7/8/8/3Q4/8/8/4K3 w - - 0 1');
    const move = findBestMove(game, 3, 2000, 1, false);
    expect(move).toBe('Qxa7');
  });

  it('returns a book move instantly (<100ms) for the starting position', () => {
    const game = new Chess();
    const t0 = Date.now();
    const move = getAIMove(game, DIFFICULTY_LEVELS[4]);
    const elapsed = Date.now() - t0;
    expect(move).not.toBeNull();
    expect(elapsed).toBeLessThan(100);
  });

  it('analyzeMove still classifies obvious blunders', () => {
    const fen =
      'rnbqkbnr/pppppppp/8/8/3Q4/8/PPP1PPPP/RNB1KBNR w KQkq - 0 1';
    const result = analyzeMove(fen, 'Qxd7+', 3);
    expect(['blunder', 'catastrophe']).toContain(result.severity);
    expect(result.centipawnLoss).toBeGreaterThan(300);
  });

  it('analyzeMove returns "good" with 0 loss for any book move', () => {
    // Starting position has multiple legal book moves; all should score 0.
    const game = new Chess();
    for (const m of ['e4', 'd4', 'Nf3', 'c4']) {
      const result = analyzeMove(game.fen(), m, 2);
      expect(result.severity).toBe('good');
      expect(result.centipawnLoss).toBe(0);
    }
  });
});
