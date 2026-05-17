// ── Scoring categories ───────────────────────────────────────────────────────

export type UpperCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes';

export type LowerCategory =
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'yahtzee'
  | 'chance';

export type ScoringCategory = UpperCategory | LowerCategory;

export const UPPER_CATEGORIES: UpperCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
];

export const LOWER_CATEGORIES: LowerCategory[] = [
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
];

export const ALL_CATEGORIES: ScoringCategory[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
];

// ── Scoring constants ────────────────────────────────────────────────────────

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;
export const YAHTZEE_SCORE = 50;
export const YAHTZEE_BONUS_VALUE = 100;
export const FULL_HOUSE_SCORE = 25;
export const SMALL_STRAIGHT_SCORE = 30;
export const LARGE_STRAIGHT_SCORE = 40;
export const MAX_ROLLS = 3;
export const NUM_DICE = 5;
export const MAX_ROUNDS = 13;
export const MAX_PLAYERS = 4;
export const STEAL_WINDOW_MS = 7000;

// ── Display names ────────────────────────────────────────────────────────────

export const CATEGORY_DISPLAY_NAMES: Record<ScoringCategory, string> = {
  ones: 'Ones',
  twos: 'Twos',
  threes: 'Threes',
  fours: 'Fours',
  fives: 'Fives',
  sixes: 'Sixes',
  threeOfAKind: 'Three of a Kind',
  fourOfAKind: 'Four of a Kind',
  fullHouse: 'Full House',
  smallStraight: 'Small Straight',
  largeStraight: 'Large Straight',
  yahtzee: 'Steal Me!',
  chance: 'Chance',
};

// ── Scorecard ────────────────────────────────────────────────────────────────

export type Scorecard = Record<ScoringCategory, number | null>;

// ── Player ───────────────────────────────────────────────────────────────────

export interface DicePlayer {
  id: string;
  name: string;
  type: 'human' | 'cpu';
  scorecard: Scorecard;
  stealUsed: boolean;
  stolenFrom: boolean;
  yahtzeeBonusCount: number;
}

// ── Game phase ───────────────────────────────────────────────────────────────

export type DiceGamePhase =
  | 'setup'
  | 'rolling'
  | 'scoring'
  | 'stealWindow'
  | 'gameOver';

// ── Steal ────────────────────────────────────────────────────────────────────

export interface StealAttempt {
  stealerIndex: number;
  victimIndex: number;
  category: ScoringCategory;
  points: number;
}

// ── Result ───────────────────────────────────────────────────────────────────

export interface DiceGameResult {
  winnerIndex: number;
  rankings: { playerIndex: number; total: number }[];
  isTie: boolean;
}

// ── CPU names ────────────────────────────────────────────────────────────────
// Sarcastic, tired, mean-side-of-friendly DFW voice.

export const CPU_NAMES: string[] = [
  'Alarm Guy',
  'Snooze Lord',
  'The Roaster',
  'Captain Forget',
  'Sir Slaps-a-Lot',
  'Dice Gremlin',
  'Lady Luck-Not',
  'The Mumbler',
  'Coach Crankypants',
  'Doctor Whatever',
];
