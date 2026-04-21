import type { ImageSourcePropType } from 'react-native';
import { resolveIcon, type IconKey } from '../utils/iconResolver';

// Map chess.js piece key (e.g. "wK", "bP") to the resolver's IconKey.
// chess.js uses lowercase type letters: p, n, b, r, q, k
// and single-character colors: 'w' (white) | 'b' (black).
const PIECE_KEY_MAP: Record<string, IconKey> = {
  wK: 'chess.king.light',
  wQ: 'chess.queen.light',
  wR: 'chess.rook.light',
  wB: 'chess.bishop.light',
  wN: 'chess.knight.light',
  wP: 'chess.pawn.light',
  bK: 'chess.king.dark',
  bQ: 'chess.queen.dark',
  bR: 'chess.rook.dark',
  bB: 'chess.bishop.dark',
  bN: 'chess.knight.dark',
  bP: 'chess.pawn.dark',
};

export function getPieceImage(piece: { type: string; color: string }): ImageSourcePropType | undefined {
  if (!piece || !piece.type || !piece.color) return undefined;
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  const iconKey = PIECE_KEY_MAP[key];
  if (!iconKey) return undefined;
  return resolveIcon(iconKey);
}
