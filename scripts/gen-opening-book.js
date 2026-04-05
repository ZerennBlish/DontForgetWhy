// Generates the opening book by playing each line with chess.js and
// recording the position key (first 4 FEN fields) → legal book moves.
// Run: node scripts/gen-opening-book.js

const { Chess } = require('chess.js');

// [moveSequence, candidateBookMoves]
const lines = [
  // Starting position — White's first move
  [[], ['e4', 'd4', 'Nf3', 'c4']],

  // Responses to White's first move
  [['e4'], ['e5', 'c5', 'e6', 'c6']],
  [['d4'], ['d5', 'Nf6']],
  [['Nf3'], ['d5', 'Nf6']],
  [['c4'], ['e5', 'Nf6', 'c5', 'e6']],

  // ── Open Games (1.e4 e5) ──────────────────────────────────────────────
  [['e4', 'e5'], ['Nf3']],
  [['e4', 'e5', 'Nf3'], ['Nc6']],
  [['e4', 'e5', 'Nf3', 'Nc6'], ['Bb5', 'Bc4']],

  // Italian Game — Giuoco Piano
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], ['Bc5', 'Nf6']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], ['c3', 'd3']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'], ['Nf6']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'], ['d3']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3'], ['d6', 'Nf6']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6'], ['Nc3', 'O-O']],
  // Italian Game — Two Knights
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], ['d3']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3'], ['Bc5', 'd6', 'Be7']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5'], ['c3', 'O-O']],

  // Ruy Lopez — Morphy Defense
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ['a6']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], ['Ba4']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'], ['Nf6']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'], ['O-O']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'], ['Be7', 'Bc5']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], ['Re1']],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1'], ['b5']],

  // ── Sicilian Defense (1.e4 c5) ────────────────────────────────────────
  [['e4', 'c5'], ['Nf3']],
  [['e4', 'c5', 'Nf3'], ['d6', 'Nc6', 'e6']],
  [['e4', 'c5', 'Nf3', 'd6'], ['d4']],
  [['e4', 'c5', 'Nf3', 'd6', 'd4'], ['cxd4']],
  [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'], ['Nxd4']],
  [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'], ['Nf6']],
  [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'], ['Nc3']],
  [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'], ['a6', 'g6', 'Nc6']],
  // Sicilian — Nc6 branch
  [['e4', 'c5', 'Nf3', 'Nc6'], ['d4']],
  [['e4', 'c5', 'Nf3', 'Nc6', 'd4'], ['cxd4']],
  [['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4'], ['Nxd4']],
  [['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4'], ['Nf6', 'g6']],
  // Sicilian — e6 branch
  [['e4', 'c5', 'Nf3', 'e6'], ['d4']],
  [['e4', 'c5', 'Nf3', 'e6', 'd4'], ['cxd4']],
  [['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4'], ['Nxd4']],
  [['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4'], ['Nf6', 'a6', 'Nc6']],

  // ── French Defense (1.e4 e6) ──────────────────────────────────────────
  [['e4', 'e6'], ['d4']],
  [['e4', 'e6', 'd4'], ['d5']],
  [['e4', 'e6', 'd4', 'd5'], ['Nc3', 'e5', 'exd5']],
  [['e4', 'e6', 'd4', 'd5', 'Nc3'], ['Nf6', 'Bb4']],
  [['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'], ['Bg5', 'e5']],
  [['e4', 'e6', 'd4', 'd5', 'e5'], ['c5']],
  [['e4', 'e6', 'd4', 'd5', 'e5', 'c5'], ['c3']],
  [['e4', 'e6', 'd4', 'd5', 'exd5'], ['exd5']],
  [['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5'], ['Nf3', 'Bd3']],

  // ── Caro-Kann (1.e4 c6) ───────────────────────────────────────────────
  [['e4', 'c6'], ['d4']],
  [['e4', 'c6', 'd4'], ['d5']],
  [['e4', 'c6', 'd4', 'd5'], ['Nc3', 'e5', 'exd5']],
  [['e4', 'c6', 'd4', 'd5', 'Nc3'], ['dxe4']],
  [['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'], ['Nxe4']],
  [['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4'], ['Bf5', 'Nf6', 'Nd7']],
  [['e4', 'c6', 'd4', 'd5', 'e5'], ['Bf5']],
  [['e4', 'c6', 'd4', 'd5', 'exd5'], ['cxd5']],
  [['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5'], ['c4', 'Bd3']],

  // ── Queen's Gambit (1.d4 d5) ──────────────────────────────────────────
  [['d4', 'd5'], ['c4', 'Bf4', 'Nf3']],
  [['d4', 'd5', 'c4'], ['dxc4', 'e6', 'c6']],
  // QGA
  [['d4', 'd5', 'c4', 'dxc4'], ['e3', 'Nf3']],
  [['d4', 'd5', 'c4', 'dxc4', 'e3'], ['e5', 'Nf6']],
  [['d4', 'd5', 'c4', 'dxc4', 'Nf3'], ['Nf6']],
  [['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6'], ['e3']],
  // QGD
  [['d4', 'd5', 'c4', 'e6'], ['Nc3', 'Nf3']],
  [['d4', 'd5', 'c4', 'e6', 'Nc3'], ['Nf6']],
  [['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'], ['Bg5', 'cxd5', 'Nf3']],
  [['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'], ['Be7']],
  [['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'], ['e3', 'Nf3']],
  [['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5'], ['exd5']],
  [['d4', 'd5', 'c4', 'e6', 'Nf3'], ['Nf6']],

  // ── Slav Defense (1.d4 d5 2.c4 c6) ────────────────────────────────────
  [['d4', 'd5', 'c4', 'c6'], ['Nf3', 'Nc3']],
  [['d4', 'd5', 'c4', 'c6', 'Nf3'], ['Nf6']],
  [['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6'], ['Nc3']],
  [['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3'], ['dxc4', 'e6']],
  [['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'], ['a4']],
  [['d4', 'd5', 'c4', 'c6', 'Nc3'], ['Nf6']],

  // ── London System (1.d4 d5 2.Bf4) ─────────────────────────────────────
  [['d4', 'd5', 'Bf4'], ['Nf6', 'c5']],
  [['d4', 'd5', 'Bf4', 'Nf6'], ['e3']],
  [['d4', 'd5', 'Bf4', 'Nf6', 'e3'], ['e6', 'c5']],
  [['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6'], ['Nf3']],
  [['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3'], ['Bd6', 'c5', 'Be7']],
  [['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5'], ['Nf3', 'c3']],

  // ── King's Indian Defense (1.d4 Nf6 2.c4 g6) ──────────────────────────
  [['d4', 'Nf6'], ['c4', 'Nf3']],
  [['d4', 'Nf6', 'c4'], ['g6', 'e6']],
  [['d4', 'Nf6', 'c4', 'g6'], ['Nc3', 'Nf3']],
  [['d4', 'Nf6', 'c4', 'g6', 'Nc3'], ['Bg7']],
  [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], ['e4']],
  [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4'], ['d6']],
  [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], ['Nf3', 'f3']],
  [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3'], ['O-O']],
  // Nimzo-Indian / QID
  [['d4', 'Nf6', 'c4', 'e6'], ['Nc3', 'Nf3']],
  [['d4', 'Nf6', 'c4', 'e6', 'Nc3'], ['Bb4']],
  [['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], ['e3', 'Qc2']],
  [['d4', 'Nf6', 'c4', 'e6', 'Nf3'], ['b6', 'Bb4+']],

  // ── English Opening (1.c4) ────────────────────────────────────────────
  [['c4', 'e5'], ['Nc3']],
  [['c4', 'e5', 'Nc3'], ['Nf6', 'Nc6']],
  [['c4', 'e5', 'Nc3', 'Nf6'], ['Nf3', 'g3']],
  [['c4', 'Nf6'], ['Nc3', 'Nf3']],
  [['c4', 'Nf6', 'Nc3'], ['e5', 'g6', 'e6']],
  [['c4', 'Nf6', 'Nc3', 'g6'], ['e4', 'g3']],
  [['c4', 'c5'], ['Nc3', 'Nf3']],
  [['c4', 'e6'], ['Nc3', 'Nf3']],

  // ── 1.Nf3 transpositions ──────────────────────────────────────────────
  [['Nf3', 'd5'], ['d4', 'c4', 'g3']],
  [['Nf3', 'Nf6'], ['c4', 'd4', 'g3']],
];

const book = {};
let skipped = 0;
for (const [seq, moves] of lines) {
  const game = new Chess();
  let ok = true;
  for (const m of seq) {
    try {
      game.move(m);
    } catch {
      ok = false;
      break;
    }
  }
  if (!ok) {
    console.error('SEQ FAIL:', seq.join(' '));
    skipped++;
    continue;
  }
  const legal = new Set(game.moves());
  const valid = moves.filter((m) => legal.has(m));
  if (valid.length === 0) {
    console.error(
      'NO VALID:',
      seq.join(' '),
      'wanted:',
      moves,
      'legal sample:',
      [...legal].slice(0, 8),
    );
    skipped++;
    continue;
  }
  if (valid.length !== moves.length) {
    const dropped = moves.filter((m) => !legal.has(m));
    console.error(
      'DROPPED:',
      seq.join(' '),
      'dropped:',
      dropped,
      'kept:',
      valid,
    );
  }
  const key = game.fen().split(' ').slice(0, 4).join(' ');
  book[key] = valid;
}

console.error('Entries:', Object.keys(book).length, 'Skipped:', skipped);

// Emit as a JS object literal
const entries = Object.entries(book).map(
  ([k, v]) => `  '${k}': [${v.map((m) => `'${m}'`).join(', ')}],`,
);
console.log(entries.join('\n'));
