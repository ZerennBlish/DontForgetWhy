import { ImageSourcePropType } from 'react-native';

// Keys: 'r' = red piece, 'rk' = red king, 'b' = black piece, 'bk' = black king
const CHECKER_IMAGES: Record<string, ImageSourcePropType> = {
  r: require('../../assets/checkers/checker-red.webp'),
  rk: require('../../assets/checkers/checker-red-king.webp'),
  b: require('../../assets/checkers/checker-black.webp'),
  bk: require('../../assets/checkers/checker-black-king.webp'),
};

export function getCheckerImage(piece: { color: 'r' | 'b'; king: boolean }): ImageSourcePropType | undefined {
  const key = piece.king ? `${piece.color}k` : piece.color;
  return CHECKER_IMAGES[key];
}
