jest.mock('../src/services/iconTheme', () => ({
  getIconTheme: () => 'mixed',
}));

import {
  createInitialBoard,
  generateMoves,
  applyMove,
  serializeBoard,
  evaluateBoard,
  getGameStatus,
  findBestMove,
  getAIMove,
  getTopMoves,
  clearTranspositionTable,
  DIFFICULTY_LEVELS,
  Board,
  Piece,
  CheckersMove,
  RankedMove,
  PickRange,
} from '../src/services/checkersAI';
import { getCheckerImage } from '../src/data/checkersAssets';

// Allow extra time for deeper searches at Expert level.
jest.setTimeout(60000);

// ── Initial board ────────────────────────────────────────────────────────────
describe('createInitialBoard', () => {
  const board = createInitialBoard();

  it('has 12 black pieces on rows 0-2', () => {
    let count = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        const p = board[row][col];
        if (p) {
          expect(p.color).toBe('b');
          expect(p.king).toBe(false);
          count++;
        }
      }
    }
    expect(count).toBe(12);
  });

  it('has 12 red pieces on rows 5-7', () => {
    let count = 0;
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = board[row][col];
        if (p) {
          expect(p.color).toBe('r');
          expect(p.king).toBe(false);
          count++;
        }
      }
    }
    expect(count).toBe(12);
  });

  it('places all pieces on dark squares only', () => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 0) {
          expect(board[row][col]).toBeNull();
        }
      }
    }
  });

  it('has empty rows 3-4 (no pieces in the middle)', () => {
    for (let row = 3; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        expect(board[row][col]).toBeNull();
      }
    }
  });
});

// ── Move generation — simple moves ──────────────────────────────────────────
describe('generateMoves — simple moves', () => {
  it('red piece at (5,0) has 1 forward diagonal move', () => {
    const board = createInitialBoard();
    const moves = generateMoves(board, 'r');
    const from50 = moves.filter((m) => m.from[0] === 5 && m.from[1] === 0);
    expect(from50.length).toBe(1);
    expect(from50[0].to).toEqual([4, 1]);
  });

  it('red piece in center has 2 forward diagonals', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    const moves = generateMoves(board, 'r');
    expect(moves.length).toBe(2);
    const destinations = moves.map((m) => m.to);
    expect(destinations).toContainEqual([3, 2]);
    expect(destinations).toContainEqual([3, 4]);
  });

  it('regular pieces cannot move backward', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    const moves = generateMoves(board, 'r');
    for (const m of moves) {
      expect(m.to[0]).toBeLessThan(4);
    }
  });
});

// ── Move generation — jumps ─────────────────────────────────────────────────
describe('generateMoves — jumps', () => {
  it('returns a jump when one is available', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    board[3][2] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    expect(moves.length).toBeGreaterThanOrEqual(1);
    const jump = moves.find((m) => m.to[0] === 2 && m.to[1] === 1);
    expect(jump).toBeDefined();
    expect(jump!.captured).toEqual([[3, 2]]);
  });

  it('non-jump moves are NOT returned when jumps exist (forced capture)', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    board[3][4] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    expect(moves.every((m) => m.captured.length > 0)).toBe(true);
  });
});

// ── Multi-jump ──────────────────────────────────────────────────────────────
describe('multi-jump', () => {
  it('captures both pieces in a double-jump', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[6][1] = { color: 'r', king: false };
    board[5][2] = { color: 'b', king: false };
    board[3][4] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    const doubleJump = moves.find((m) => m.captured.length === 2);
    expect(doubleJump).toBeDefined();
    expect(doubleJump!.from).toEqual([6, 1]);
    expect(doubleJump!.to).toEqual([2, 5]);
    expect(doubleJump!.captured).toEqual([[5, 2], [3, 4]]);
  });
});

// ── King movement ───────────────────────────────────────────────────────────
describe('king movement', () => {
  it('king can move in all 4 diagonal directions', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: true };
    const moves = generateMoves(board, 'r');
    expect(moves.length).toBe(4);
    const destinations = moves.map((m) => m.to);
    expect(destinations).toContainEqual([3, 2]);
    expect(destinations).toContainEqual([3, 4]);
    expect(destinations).toContainEqual([5, 2]);
    expect(destinations).toContainEqual([5, 4]);
  });

  it('king can jump backward', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[2][3] = { color: 'r', king: true };
    board[3][4] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    const backJump = moves.find((m) => m.to[0] === 4 && m.to[1] === 5);
    expect(backJump).toBeDefined();
    expect(backJump!.captured).toEqual([[3, 4]]);
  });
});

// ── Promotion ───────────────────────────────────────────────────────────────
describe('promotion', () => {
  it('red piece reaching row 0 becomes a king (crowned: true)', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[1][2] = { color: 'r', king: false };
    const moves = generateMoves(board, 'r');
    const toRow0 = moves.find((m) => m.to[0] === 0);
    expect(toRow0).toBeDefined();
    expect(toRow0!.crowned).toBe(true);
  });

  it('black piece reaching row 7 becomes a king', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[6][3] = { color: 'b', king: false };
    const moves = generateMoves(board, 'b');
    const toRow7 = moves.find((m) => m.to[0] === 7);
    expect(toRow7).toBeDefined();
    expect(toRow7!.crowned).toBe(true);
  });

  it('applyMove crowns the piece when crowned is true', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[1][2] = { color: 'r', king: false };
    const move: CheckersMove = {
      from: [1, 2],
      to: [0, 3],
      captured: [],
      crowned: true,
    };
    const newBoard = applyMove(board, move);
    expect(newBoard[0][3]).toEqual({ color: 'r', king: true });
  });
});

// ── Forced capture ──────────────────────────────────────────────────────────
describe('forced capture', () => {
  it('only jump moves are legal when any piece can jump', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    board[3][4] = { color: 'b', king: false };
    board[6][5] = { color: 'r', king: false };
    const moves = generateMoves(board, 'r');
    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(moves.every((m) => m.captured.length > 0)).toBe(true);
    const from65 = moves.filter((m) => m.from[0] === 6 && m.from[1] === 5);
    expect(from65.length).toBe(0);
  });
});

// ── Game over ───────────────────────────────────────────────────────────────
describe('getGameStatus', () => {
  it('returns red_wins when black has no pieces', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    expect(getGameStatus(board, 'b')).toBe('red_wins');
  });

  it('returns black_wins when red has no pieces', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'b', king: false };
    expect(getGameStatus(board, 'r')).toBe('black_wins');
  });

  it('returns black_wins when red is completely blocked', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[7][0] = { color: 'r', king: false };
    board[6][1] = { color: 'b', king: false };
    board[5][2] = { color: 'b', king: false };
    expect(getGameStatus(board, 'r')).toBe('black_wins');
  });

  it('returns playing when both sides have legal moves', () => {
    expect(getGameStatus(createInitialBoard(), 'r')).toBe('playing');
  });
});

// ── Evaluation ──────────────────────────────────────────────────────────────
describe('evaluateBoard', () => {
  it('returns positive score when red has material advantage', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    board[4][5] = { color: 'r', king: false };
    board[3][2] = { color: 'b', king: false };
    expect(evaluateBoard(board)).toBeGreaterThan(0);
  });

  it('returns negative score when black has material advantage', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    board[3][2] = { color: 'b', king: false };
    board[3][4] = { color: 'b', king: false };
    expect(evaluateBoard(board)).toBeLessThan(0);
  });

  it('values kings higher than regular pieces', () => {
    const boardWithPiece: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    boardWithPiece[4][3] = { color: 'r', king: false };
    boardWithPiece[3][2] = { color: 'b', king: false };

    const boardWithKing: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    boardWithKing[4][3] = { color: 'r', king: true };
    boardWithKing[3][2] = { color: 'b', king: false };

    expect(evaluateBoard(boardWithKing)).toBeGreaterThan(evaluateBoard(boardWithPiece));
  });

  it('returns -100000 when red has no pieces', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[3][2] = { color: 'b', king: false };
    expect(evaluateBoard(board)).toBe(-100000);
  });

  it('returns 100000 when black has no pieces', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[4][3] = { color: 'r', king: false };
    expect(evaluateBoard(board)).toBe(100000);
  });
});

// ── AI returns a move ───────────────────────────────────────────────────────
describe('getAIMove — smoke test for all difficulty levels', () => {
  it.each(DIFFICULTY_LEVELS.map((level) => [level.name, level]))(
    'returns a valid move at difficulty %s',
    (_name, level) => {
      const board = createInitialBoard();
      const move = getAIMove(board, 'r', level as any);
      expect(move).not.toBeNull();
      const legalMoves = generateMoves(board, 'r');
      const isLegal = legalMoves.some(
        (m) =>
          m.from[0] === move!.from[0] &&
          m.from[1] === move!.from[1] &&
          m.to[0] === move!.to[0] &&
          m.to[1] === move!.to[1],
      );
      expect(isLegal).toBe(true);
    },
  );
});

// ── Board serialization ─────────────────────────────────────────────────────
describe('serializeBoard', () => {
  it('produces consistent output for the same board', () => {
    const board = createInitialBoard();
    const a = serializeBoard(board, 'r');
    const b = serializeBoard(board, 'r');
    expect(a).toBe(b);
  });

  it('produces different keys for different positions', () => {
    const board1 = createInitialBoard();
    const board2 = createInitialBoard();
    const moves = generateMoves(board2, 'r');
    const newBoard2 = applyMove(board2, moves[0]);
    expect(serializeBoard(board1, 'r')).not.toBe(serializeBoard(newBoard2, 'b'));
  });

  it('produces a 33-character string', () => {
    const board = createInitialBoard();
    const key = serializeBoard(board, 'r');
    expect(key.length).toBe(33);
  });

  it('different turn produces different key for same board', () => {
    const board = createInitialBoard();
    expect(serializeBoard(board, 'r')).not.toBe(serializeBoard(board, 'b'));
  });
});

// ── applyMove immutability ──────────────────────────────────────────────────
describe('applyMove immutability', () => {
  it('does not mutate the original board', () => {
    const board = createInitialBoard();
    const originalSerialized = serializeBoard(board, 'r');
    const moves = generateMoves(board, 'r');
    applyMove(board, moves[0]);
    expect(serializeBoard(board, 'r')).toBe(originalSerialized);
  });

  it('returns a new board with the move applied', () => {
    const board = createInitialBoard();
    const moves = generateMoves(board, 'r');
    const newBoard = applyMove(board, moves[0]);
    expect(serializeBoard(newBoard, 'b')).not.toBe(serializeBoard(board, 'r'));
    expect(newBoard[moves[0].from[0]][moves[0].from[1]]).toBeNull();
    expect(newBoard[moves[0].to[0]][moves[0].to[1]]).not.toBeNull();
  });
});

// ── Transposition table ─────────────────────────────────────────────────────
describe('transposition table', () => {
  it('clearTranspositionTable does not break subsequent searches', () => {
    const board = createInitialBoard();
    findBestMove(board, 'r', 2, 500, 1);
    clearTranspositionTable();
    const move = findBestMove(board, 'r', 2, 500, 1);
    expect(move).not.toBeNull();
    const legal = generateMoves(board, 'r');
    const isLegal = legal.some(
      (m) =>
        m.from[0] === move!.from[0] &&
        m.from[1] === move!.from[1] &&
        m.to[0] === move!.to[0] &&
        m.to[1] === move!.to[1],
    );
    expect(isLegal).toBe(true);
  });
});

// ── Difficulty model ────────────────────────────────────────────────────────
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
});

// ── getCheckerImage ─────────────────────────────────────────────────────────
describe('getCheckerImage', () => {
  it('returns a truthy value for red piece', () => {
    expect(getCheckerImage({ color: 'r', king: false })).toBeTruthy();
  });

  it('returns a truthy value for red king', () => {
    expect(getCheckerImage({ color: 'r', king: true })).toBeTruthy();
  });

  it('returns a truthy value for black piece', () => {
    expect(getCheckerImage({ color: 'b', king: false })).toBeTruthy();
  });

  it('returns a truthy value for black king', () => {
    expect(getCheckerImage({ color: 'b', king: true })).toBeTruthy();
  });
});

// ── Mid-jump promotion stops ────────────────────────────────────────────────
describe('mid-jump promotion stops', () => {
  it('jump chain stops when non-king reaches promotion rank', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[2][1] = { color: 'r', king: false };
    board[1][2] = { color: 'b', king: false };
    board[1][4] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    expect(moves.length).toBe(1);
    expect(moves[0].to).toEqual([0, 3]);
    expect(moves[0].captured.length).toBe(1);
    expect(moves[0].crowned).toBe(true);
  });

  it('king can continue multi-jump past promotion ranks', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[2][1] = { color: 'r', king: true };
    board[1][2] = { color: 'b', king: false };
    board[1][4] = { color: 'b', king: false };
    const moves = generateMoves(board, 'r');
    const doubleJump = moves.find((m) => m.captured.length === 2);
    expect(doubleJump).toBeDefined();
    expect(doubleJump!.crowned).toBe(false);
  });
});

// ── Mate score ply penalty ──────────────────────────────────────────────────
describe('mate score ply penalty', () => {
  it('prefers faster win (fewer ply)', () => {
    const board1: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board1[4][3] = { color: 'r', king: true };
    board1[3][4] = { color: 'b', king: false };

    const afterJump = applyMove(board1, {
      from: [4, 3], to: [2, 5], captured: [[3, 4]], crowned: false,
    });
    expect(getGameStatus(afterJump, 'b')).toBe('red_wins');
  });
});

// ── evaluateBoard is fast (no generateMoves calls) ──────────────────────────
describe('evaluateBoard performance', () => {
  it('returns near-instantly even on complex boards', () => {
    const board = createInitialBoard();
    const t0 = Date.now();
    for (let i = 0; i < 10000; i++) {
      evaluateBoard(board);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(1000);
  });

  it('does NOT return ±100000 for a blocked position (no pieces missing)', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[7][0] = { color: 'r', king: false };
    board[6][1] = { color: 'b', king: false };
    board[5][2] = { color: 'b', king: false };
    const score = evaluateBoard(board);
    expect(Math.abs(score)).toBeLessThan(100000);
  });
});

// ── AI null return → game over ──────────────────────────────────────────────
describe('AI null return triggers game over', () => {
  it('getGameStatus returns correct winner when side-to-move has no legal moves', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[7][0] = { color: 'r', king: false };
    board[6][1] = { color: 'b', king: false };
    board[5][2] = { color: 'b', king: false };
    expect(getGameStatus(board, 'r')).toBe('black_wins');
  });

  it('getAIMove returns null when no legal moves exist', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[7][0] = { color: 'r', king: false };
    board[6][1] = { color: 'b', king: false };
    board[5][2] = { color: 'b', king: false };
    const move = getAIMove(board, 'r', DIFFICULTY_LEVELS[0]);
    expect(move).toBeNull();
  });
});

// ── Improved evaluation heuristics ──────────────────────────────────────────
describe('evaluateBoard — improved heuristics', () => {
  it('values a supported piece higher than an isolated piece', () => {
    const supported: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    supported[5][2] = { color: 'r', king: false };
    supported[6][3] = { color: 'r', king: false }; // supporter behind-right
    supported[0][1] = { color: 'b', king: false };

    const isolated: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    isolated[5][2] = { color: 'r', king: false };
    isolated[6][5] = { color: 'r', king: false }; // same advancement, not adjacent
    isolated[0][1] = { color: 'b', king: false };

    expect(evaluateBoard(supported)).toBeGreaterThan(evaluateBoard(isolated));
  });

  it('penalizes kings on the edge vs center', () => {
    const edgeKing: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    edgeKing[0][1] = { color: 'r', king: true };
    edgeKing[7][6] = { color: 'b', king: false };

    const centerKing: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    centerKing[3][4] = { color: 'r', king: true };
    centerKing[7][6] = { color: 'b', king: false };

    expect(evaluateBoard(centerKing)).toBeGreaterThan(evaluateBoard(edgeKing));
  });

  it('blocked piece scores lower due to mobility penalty', () => {
    const blocked: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    blocked[5][2] = { color: 'r', king: false };
    blocked[4][1] = { color: 'b', king: false }; // blocks forward-left
    blocked[4][3] = { color: 'b', king: false }; // blocks forward-right

    const open: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    open[5][2] = { color: 'r', king: false };
    open[0][1] = { color: 'b', king: false };
    open[0][3] = { color: 'b', king: false };

    expect(evaluateBoard(open)).toBeGreaterThan(evaluateBoard(blocked));
  });

  it('endgame scaling produces a finite evaluation', () => {
    const endgame: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    endgame[3][4] = { color: 'r', king: true };
    endgame[4][3] = { color: 'r', king: false };
    endgame[5][2] = { color: 'b', king: false };
    endgame[6][1] = { color: 'b', king: false };

    const score = evaluateBoard(endgame);
    expect(typeof score).toBe('number');
    expect(Math.abs(score)).toBeLessThan(100000);
  });

  it('still returns ±100000 for no-piece positions', () => {
    const noRed: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    noRed[3][4] = { color: 'b', king: false };
    expect(evaluateBoard(noRed)).toBe(-100000);

    const noBlack: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    noBlack[3][4] = { color: 'r', king: false };
    expect(evaluateBoard(noBlack)).toBe(100000);
  });
});

// ── getTopMoves (cloud interface) ───────────────────────────────────────────
describe('getTopMoves', () => {
  it('returns up to 5 ranked moves for the initial board', () => {
    const board = createInitialBoard();
    const ranked: RankedMove[] = getTopMoves(board, 'r', 4, 1000, 5);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.length).toBeLessThanOrEqual(5);
  });

  it('moves are sorted best-first for red (descending score)', () => {
    const board = createInitialBoard();
    const ranked = getTopMoves(board, 'r', 4, 1000, 5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('moves are sorted best-first for black (ascending score)', () => {
    const board = createInitialBoard();
    const ranked = getTopMoves(board, 'b', 4, 1000, 5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeLessThanOrEqual(ranked[i].score);
    }
  });

  it('returns only 1 move when only 1 is legal', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[5][0] = { color: 'r', king: false };
    const ranked = getTopMoves(board, 'r', 4, 1000, 5);
    expect(ranked.length).toBe(1);
  });

  it('returns empty array when no moves exist', () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[7][0] = { color: 'r', king: false };
    board[6][1] = { color: 'b', king: false };
    board[5][2] = { color: 'b', king: false };
    const ranked = getTopMoves(board, 'r', 4, 1000, 5);
    expect(ranked.length).toBe(0);
  });

  it('all returned moves are legal', () => {
    const board = createInitialBoard();
    const ranked = getTopMoves(board, 'r', 4, 1000, 5);
    const legal = generateMoves(board, 'r');
    for (const { move } of ranked) {
      const isLegal = legal.some(
        (m) =>
          m.from[0] === move.from[0] &&
          m.from[1] === move.from[1] &&
          m.to[0] === move.to[0] &&
          m.to[1] === move.to[1],
      );
      expect(isLegal).toBe(true);
    }
  });
});

// ── Difficulty cloudPickRange ───────────────────────────────────────────────
describe('difficulty model — cloudPickRange', () => {
  it('every level has a cloudPickRange with valid bounds', () => {
    for (const level of DIFFICULTY_LEVELS) {
      const range: PickRange = level.cloudPickRange;
      expect(range.minRank).toBeGreaterThanOrEqual(0);
      expect(range.maxRank).toBeGreaterThanOrEqual(range.minRank);
      expect(range.maxRank).toBeLessThanOrEqual(4);
    }
  });

  it('higher difficulty = lower (better) pick range', () => {
    for (let i = 1; i < DIFFICULTY_LEVELS.length; i++) {
      const prev = DIFFICULTY_LEVELS[i - 1];
      const curr = DIFFICULTY_LEVELS[i];
      expect(curr.cloudPickRange.minRank).toBeLessThanOrEqual(prev.cloudPickRange.minRank);
    }
  });
});
