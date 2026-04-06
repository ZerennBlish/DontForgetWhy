// Keys: 'r' = red piece, 'rk' = red king, 'b' = black piece, 'bk' = black king
const CHECKER_IMAGES: Record<string, any> = {
  r: require('../../assets/checkers/red.png'),
  rk: require('../../assets/checkers/red-king.png'),
  b: require('../../assets/checkers/black.png'),
  bk: require('../../assets/checkers/black-king.png'),
};

export function getCheckerImage(piece: { color: 'r' | 'b'; king: boolean }): any {
  const key = piece.king ? `${piece.color}k` : piece.color;
  return CHECKER_IMAGES[key] ?? null;
}
