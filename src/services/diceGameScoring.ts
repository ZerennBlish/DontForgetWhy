import {
  ALL_CATEGORIES,
  UPPER_CATEGORIES,
  DicePlayer,
  FULL_HOUSE_SCORE,
  LARGE_STRAIGHT_SCORE,
  ScoringCategory,
  Scorecard,
  SMALL_STRAIGHT_SCORE,
  StealAttempt,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UpperCategory,
  YAHTZEE_BONUS_VALUE,
  YAHTZEE_SCORE,
} from './diceGameTypes';

// ── Scorecard helpers ────────────────────────────────────────────────────────

export function createEmptyScorecard(): Scorecard {
  const sc = {} as Scorecard;
  for (const cat of ALL_CATEGORIES) {
    sc[cat] = null;
  }
  return sc;
}

// ── Dice analysis helpers (internal) ─────────────────────────────────────────

function countsOf(dice: number[]): number[] {
  // index 1-6 = how many of each face
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  return counts;
}

function hasNOfAKind(dice: number[], n: number): boolean {
  const counts = countsOf(dice);
  for (let i = 1; i <= 6; i++) {
    if (counts[i] >= n) return true;
  }
  return false;
}

function sumDice(dice: number[]): number {
  let s = 0;
  for (const d of dice) s += d;
  return s;
}

function isFullHouse(dice: number[]): boolean {
  const counts = countsOf(dice);
  let hasPair = false;
  let hasTriple = false;
  for (let i = 1; i <= 6; i++) {
    if (counts[i] === 3) hasTriple = true;
    else if (counts[i] === 2) hasPair = true;
  }
  return hasPair && hasTriple;
}

function longestConsecutiveRun(dice: number[]): number {
  const present = new Set(dice);
  let longest = 0;
  let current = 0;
  for (let i = 1; i <= 6; i++) {
    if (present.has(i)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

// ── Score calculation ────────────────────────────────────────────────────────

export function calculateCategoryScore(
  dice: number[],
  category: ScoringCategory,
): number {
  switch (category) {
    case 'ones':
      return dice.filter((d) => d === 1).length * 1;
    case 'twos':
      return dice.filter((d) => d === 2).length * 2;
    case 'threes':
      return dice.filter((d) => d === 3).length * 3;
    case 'fours':
      return dice.filter((d) => d === 4).length * 4;
    case 'fives':
      return dice.filter((d) => d === 5).length * 5;
    case 'sixes':
      return dice.filter((d) => d === 6).length * 6;
    case 'threeOfAKind':
      return hasNOfAKind(dice, 3) ? sumDice(dice) : 0;
    case 'fourOfAKind':
      return hasNOfAKind(dice, 4) ? sumDice(dice) : 0;
    case 'fullHouse':
      return isFullHouse(dice) ? FULL_HOUSE_SCORE : 0;
    case 'smallStraight':
      return longestConsecutiveRun(dice) >= 4 ? SMALL_STRAIGHT_SCORE : 0;
    case 'largeStraight':
      return longestConsecutiveRun(dice) >= 5 ? LARGE_STRAIGHT_SCORE : 0;
    case 'yahtzee':
      return isYahtzee(dice) ? YAHTZEE_SCORE : 0;
    case 'chance':
      return sumDice(dice);
  }
}

export function isYahtzee(dice: number[]): boolean {
  if (dice.length === 0) return false;
  const first = dice[0];
  for (const d of dice) {
    if (d !== first) return false;
  }
  return true;
}

// ── Subtotals and totals ─────────────────────────────────────────────────────

export function getUpperSubtotal(scorecard: Scorecard): number {
  let sum = 0;
  for (const cat of UPPER_CATEGORIES) {
    const v = scorecard[cat];
    if (v !== null) sum += v;
  }
  return sum;
}

export function hasUpperBonus(scorecard: Scorecard): boolean {
  return getUpperSubtotal(scorecard) >= UPPER_BONUS_THRESHOLD;
}

export function calculateTotal(
  scorecard: Scorecard,
  yahtzeeBonusCount: number,
): number {
  let total = 0;
  for (const cat of ALL_CATEGORIES) {
    const v = scorecard[cat];
    if (v !== null) total += v;
  }
  if (hasUpperBonus(scorecard)) total += UPPER_BONUS_VALUE;
  total += yahtzeeBonusCount * YAHTZEE_BONUS_VALUE;
  return total;
}

export function getUnfilledCategories(scorecard: Scorecard): ScoringCategory[] {
  return ALL_CATEGORIES.filter((cat) => scorecard[cat] === null);
}

// ── Steal logic ──────────────────────────────────────────────────────────────

export function canSteal(
  stealer: DicePlayer,
  victim: DicePlayer,
  category: ScoringCategory,
): boolean {
  if (stealer.id === victim.id) return false;
  if (stealer.stealUsed) return false;
  if (victim.stolenFrom) return false;
  if (stealer.scorecard[category] !== null) return false;
  if (victim.scorecard[category] === null) return false;
  return true;
}

export function getStealablePlayers(
  stealerIndex: number,
  players: DicePlayer[],
  lastScoredCategory: ScoringCategory,
  lastScoredPlayerIndex: number,
): { playerIndex: number; category: ScoringCategory; points: number }[] {
  if (stealerIndex < 0 || stealerIndex >= players.length) return [];
  if (lastScoredPlayerIndex < 0 || lastScoredPlayerIndex >= players.length) {
    return [];
  }
  if (lastScoredPlayerIndex === stealerIndex) return [];

  const stealer = players[stealerIndex];
  const victim = players[lastScoredPlayerIndex];
  if (!canSteal(stealer, victim, lastScoredCategory)) return [];

  const points = victim.scorecard[lastScoredCategory];
  if (points === null) return [];

  return [
    {
      playerIndex: lastScoredPlayerIndex,
      category: lastScoredCategory,
      points,
    },
  ];
}

// ── All possible scores ──────────────────────────────────────────────────────

export function getAllPossibleScores(
  dice: number[],
  scorecard: Scorecard,
): { category: ScoringCategory; score: number }[] {
  const out: { category: ScoringCategory; score: number }[] = [];
  for (const cat of ALL_CATEGORIES) {
    if (scorecard[cat] !== null) continue;
    out.push({ category: cat, score: calculateCategoryScore(dice, cat) });
  }
  return out;
}

// ── CPU decision logic ───────────────────────────────────────────────────────

// Upper-section "average" expected sum if a player rolls roughly the bonus
// pace: 3 of each face × value. Used to decide whether the current dice are
// "good enough" to fill that upper category.
const UPPER_AVERAGE_FOR_BONUS: Record<UpperCategory, number> = {
  ones: 3,
  twos: 6,
  threes: 9,
  fours: 12,
  fives: 15,
  sixes: 18,
};

function isUpperCategory(cat: ScoringCategory): cat is UpperCategory {
  return (
    cat === 'ones' ||
    cat === 'twos' ||
    cat === 'threes' ||
    cat === 'fours' ||
    cat === 'fives' ||
    cat === 'sixes'
  );
}

export function cpuSelectCategory(
  dice: number[],
  scorecard: Scorecard,
): ScoringCategory {
  const possible = getAllPossibleScores(dice, scorecard);
  if (possible.length === 0) {
    // Defensive — every category is filled. Shouldn't happen during play.
    return ALL_CATEGORIES[0];
  }

  // 1. Yahtzee if available
  const yahtzeeOpt = possible.find(
    (p) => p.category === 'yahtzee' && p.score > 0,
  );
  if (yahtzeeOpt) return yahtzeeOpt.category;

  // 2. Large straight (40), small straight (30), full house (25) — non-zero only
  const preferredLower: ScoringCategory[] = [
    'largeStraight',
    'smallStraight',
    'fullHouse',
  ];
  for (const cat of preferredLower) {
    const opt = possible.find((p) => p.category === cat && p.score > 0);
    if (opt) return opt.category;
  }

  // 3. Upper section at-or-above average toward the 63 bonus
  const upperGood = possible
    .filter(
      (p) =>
        isUpperCategory(p.category) &&
        p.score >= UPPER_AVERAGE_FOR_BONUS[p.category as UpperCategory],
    )
    .sort((a, b) => b.score - a.score);
  if (upperGood.length > 0) return upperGood[0].category;

  // 4. Highest-scoring non-zero option overall
  const nonZero = possible
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
  if (nonZero.length > 0) return nonZero[0].category;

  // 5. All options score 0 — sacrifice cheapest. Order: ones, twos, ...,
  // sixes, then lower-section non-bonus categories (chance is last because
  // it still hands out points).
  const sacrificeOrder: ScoringCategory[] = [
    'ones',
    'twos',
    'threes',
    'fours',
    'fives',
    'sixes',
    'yahtzee',
    'largeStraight',
    'smallStraight',
    'fullHouse',
    'fourOfAKind',
    'threeOfAKind',
    'chance',
  ];
  for (const cat of sacrificeOrder) {
    if (scorecard[cat] === null) return cat;
  }
  return possible[0].category;
}

export function cpuDecideHold(
  dice: number[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rollsRemaining: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scorecard: Scorecard,
): boolean[] {
  const holds: boolean[] = [false, false, false, false, false];
  if (dice.length !== 5) return holds;

  // 1. Yahtzee — hold all 5
  if (isYahtzee(dice)) return [true, true, true, true, true];

  const counts = countsOf(dice);

  // 2. Four of a kind
  for (let face = 6; face >= 1; face--) {
    if (counts[face] >= 4) {
      for (let i = 0; i < 5; i++) holds[i] = dice[i] === face;
      return holds;
    }
  }

  // 3. Three of a kind (prefer higher faces)
  for (let face = 6; face >= 1; face--) {
    if (counts[face] >= 3) {
      for (let i = 0; i < 5; i++) holds[i] = dice[i] === face;
      return holds;
    }
  }

  // 4. Working toward a straight — 4 consecutive present
  if (longestConsecutiveRun(dice) >= 4) {
    // Find the longest consecutive run and hold those dice (one die per face
    // to avoid holding duplicates that don't help the straight).
    let bestStart = 0;
    let bestLen = 0;
    let curStart = 0;
    let curLen = 0;
    for (let i = 1; i <= 6; i++) {
      if (counts[i] > 0) {
        if (curLen === 0) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestLen = curLen;
          bestStart = curStart;
        }
      } else {
        curLen = 0;
      }
    }
    const inRun = new Set<number>();
    for (let f = bestStart; f < bestStart + bestLen; f++) inRun.add(f);
    const taken = new Set<number>();
    for (let i = 0; i < 5; i++) {
      if (inRun.has(dice[i]) && !taken.has(dice[i])) {
        holds[i] = true;
        taken.add(dice[i]);
      }
    }
    return holds;
  }

  // 5. Pair of high numbers (4+)
  for (let face = 6; face >= 4; face--) {
    if (counts[face] >= 2) {
      let held = 0;
      for (let i = 0; i < 5; i++) {
        if (dice[i] === face && held < 2) {
          holds[i] = true;
          held++;
        }
      }
      return holds;
    }
  }

  // 6. Junk — full reroll
  return holds;
}

export function cpuDecideSteal(
  cpu: DicePlayer,
  cpuIndex: number,
  allPlayers: DicePlayer[],
  lastScoredCategory: ScoringCategory,
  lastScoredPlayerIndex: number,
  lastScoredValue: number,
): StealAttempt | null {
  if (cpuIndex === lastScoredPlayerIndex) return null;
  if (lastScoredPlayerIndex < 0 || lastScoredPlayerIndex >= allPlayers.length) {
    return null;
  }
  const victim = allPlayers[lastScoredPlayerIndex];
  if (!canSteal(cpu, victim, lastScoredCategory)) return null;

  let probability: number;
  if (lastScoredValue >= 20) probability = 1;
  else if (lastScoredValue >= 10) probability = 0.7;
  else probability = 0.3;

  if (Math.random() >= probability) return null;

  return {
    stealerIndex: cpuIndex,
    victimIndex: lastScoredPlayerIndex,
    category: lastScoredCategory,
    points: lastScoredValue,
  };
}
