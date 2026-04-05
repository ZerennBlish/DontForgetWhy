// Map of piece key (e.g. "wK", "bP") to the required image source.
// chess.js uses lowercase type letters: p, n, b, r, q, k
// and single-character colors: 'w' (white) | 'b' (black).
const PIECE_IMAGES: Record<string, any> = {
  wK: require('../../assets/chess/wK.png'),
  wQ: require('../../assets/chess/wQ.png'),
  wR: require('../../assets/chess/wR.png'),
  wB: require('../../assets/chess/wB.png'),
  wN: require('../../assets/chess/wN.png'),
  wP: require('../../assets/chess/wP.png'),
  bK: require('../../assets/chess/bK.png'),
  bQ: require('../../assets/chess/bQ.png'),
  bR: require('../../assets/chess/bR.png'),
  bB: require('../../assets/chess/bB.png'),
  bN: require('../../assets/chess/bN.png'),
  bP: require('../../assets/chess/bP.png'),
};

export function getPieceImage(piece: { type: string; color: string }): any {
  if (!piece || !piece.type || !piece.color) return null;
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  return PIECE_IMAGES[key] ?? null;
}
