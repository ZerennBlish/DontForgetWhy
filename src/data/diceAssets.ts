import type { ImageSourcePropType } from 'react-native';
import { isProUser } from '../services/proStatus';
import { getIconTheme } from '../services/iconTheme';

export type DiceTheme = 'toon' | 'chrome';

// Asset files placed manually before build:
//   assets/dice/toon/dice_face_1.webp ... dice_face_6.webp
//   assets/dice/chrome/silver_1.webp ... silver_6.webp
//   assets/dice/red_felt_gaming_table.webp
//
// All require()s are resolved at bundle time by Metro; the test runner maps
// .webp to a stub via jest moduleNameMapper, so these are also safe to call
// from unit tests.

const TOON_FACES: ImageSourcePropType[] = [
  require('../../assets/dice/toon/dice_face_1.webp'),
  require('../../assets/dice/toon/dice_face_2.webp'),
  require('../../assets/dice/toon/dice_face_3.webp'),
  require('../../assets/dice/toon/dice_face_4.webp'),
  require('../../assets/dice/toon/dice_face_5.webp'),
  require('../../assets/dice/toon/dice_face_6.webp'),
];

const CHROME_FACES: ImageSourcePropType[] = [
  require('../../assets/dice/chrome/silver_1.webp'),
  require('../../assets/dice/chrome/silver_2.webp'),
  require('../../assets/dice/chrome/silver_3.webp'),
  require('../../assets/dice/chrome/silver_4.webp'),
  require('../../assets/dice/chrome/silver_5.webp'),
  require('../../assets/dice/chrome/silver_6.webp'),
];

export const DICE_BACKGROUND: ImageSourcePropType = require('../../assets/dice/red_felt_gaming_table.webp');

// Game-grid card icon: reuse the toon die-6.
export const DICE_CARD_ICON: ImageSourcePropType = TOON_FACES[5];

export function getDieFace(
  value: number,
  theme: DiceTheme,
): ImageSourcePropType {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`getDieFace: value must be 1-6, got ${value}`);
  }
  const faces = theme === 'chrome' ? CHROME_FACES : TOON_FACES;
  return faces[value - 1];
}

export function getDiceTheme(): DiceTheme {
  if (isProUser() && getIconTheme() === 'chrome') return 'chrome';
  return 'toon';
}
