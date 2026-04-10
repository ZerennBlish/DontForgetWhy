import type { ImageSourcePropType } from 'react-native';

// Map of piece key (e.g. "wK", "bP") to the required image source.
// chess.js uses lowercase type letters: p, n, b, r, q, k
// and single-character colors: 'w' (white) | 'b' (black).
const PIECE_IMAGES: Record<string, ImageSourcePropType> = {
  wK: require('../../assets/chess/wK.webp'),
  wQ: require('../../assets/chess/wQ.webp'),
  wR: require('../../assets/chess/wR.webp'),
  wB: require('../../assets/chess/wB.webp'),
  wN: require('../../assets/chess/wN.webp'),
  wP: require('../../assets/chess/wP.webp'),
  bK: require('../../assets/chess/bK.webp'),
  bQ: require('../../assets/chess/bQ.webp'),
  bR: require('../../assets/chess/bR.webp'),
  bB: require('../../assets/chess/bB.webp'),
  bN: require('../../assets/chess/bN.webp'),
  bP: require('../../assets/chess/bP.webp'),
};

export function getPieceImage(piece: { type: string; color: string }): ImageSourcePropType | undefined {
  if (!piece || !piece.type || !piece.color) return undefined;
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  return PIECE_IMAGES[key];
}
