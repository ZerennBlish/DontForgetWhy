import { Chess } from 'chess.js';
import { findBestMove } from '../src/services/chessAI';

// Modify findBestMove temporarily: we need to know what depth it reached.
// Instead, we'll wrap it and measure externally by timing.

const POSITIONS = [
  { name: 'Opening', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
  { name: 'Midgame', fen: 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7' },
  { name: 'Complex', fen: 'r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 10' },
];

const TIME_BUDGETS = [500, 1000, 2000, 3000, 5000, 7000, 10000];

test('Depth reached at different time budgets', () => {
  for (const pos of POSITIONS) {
    console.log(`\n=== ${pos.name} ===`);
    console.log(`FEN: ${pos.fen}\n`);

    for (const budget of TIME_BUDGETS) {
      const game = new Chess(pos.fen);
      const start = Date.now();
      const move = findBestMove(game, 10, budget);
      const elapsed = Date.now() - start;

      console.log(`${(budget / 1000).toFixed(1)}s budget → ${move} in ${elapsed}ms ${elapsed < budget - 100 ? '(finished early!)' : ''}`);
    }
  }

  expect(true).toBe(true);
}, 300000);
