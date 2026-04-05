import { Chess } from 'chess.js';
import {
  evaluateBoard,
  isEndgame,
  findBestMove,
  getAIMove,
  analyzeMove,
  DIFFICULTY_LEVELS,
} from '../src/services/chessAI';
import { getPieceImage } from '../src/data/chessAssets';

// Allow extra time for the deeper minimax searches (Expert = depth 3).
jest.setTimeout(60000);

// ── evaluateBoard ─────────────────────────────────────────────────────────
describe('evaluateBoard', () => {
  it('evaluates starting position near zero (±50 centipawns)', () => {
    const game = new Chess();
    const score = evaluateBoard(game);
    expect(Math.abs(score)).toBeLessThanOrEqual(50);
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

  it('returns null for an invalid piece type', () => {
    expect(getPieceImage({ type: 'x', color: 'w' })).toBeNull();
  });

  it('returns null for an invalid color', () => {
    expect(getPieceImage({ type: 'p', color: 'z' })).toBeNull();
  });
});
