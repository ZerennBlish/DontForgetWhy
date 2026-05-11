import {
  ALL_CATEGORIES,
  CATEGORY_DISPLAY_NAMES,
  CPU_NAMES,
  DicePlayer,
  LOWER_CATEGORIES,
  Scorecard,
  ScoringCategory,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UPPER_CATEGORIES,
  YAHTZEE_BONUS_VALUE,
} from '../src/services/diceGameTypes';
import {
  calculateCategoryScore,
  calculateTotal,
  canSteal,
  cpuDecideHold,
  cpuDecideSteal,
  cpuSelectCategory,
  createEmptyScorecard,
  getAllPossibleScores,
  getStealablePlayers,
  getUnfilledCategories,
  getUpperSubtotal,
  hasUpperBonus,
  isYahtzee,
} from '../src/services/diceGameScoring';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  overrides: Partial<DicePlayer> = {},
): DicePlayer {
  return {
    id,
    name: id,
    type: 'human',
    scorecard: createEmptyScorecard(),
    stealUsed: false,
    stolenFrom: false,
    yahtzeeBonusCount: 0,
    ...overrides,
  };
}

// ── Constants and types ──────────────────────────────────────────────────────

describe('constants', () => {
  it('ALL_CATEGORIES has 13 entries with upper section first', () => {
    expect(ALL_CATEGORIES).toHaveLength(13);
    expect(UPPER_CATEGORIES).toHaveLength(6);
    expect(LOWER_CATEGORIES).toHaveLength(7);
    expect(ALL_CATEGORIES.slice(0, 6)).toEqual(UPPER_CATEGORIES);
    expect(ALL_CATEGORIES.slice(6)).toEqual(LOWER_CATEGORIES);
  });

  it('display names cover every category', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(typeof CATEGORY_DISPLAY_NAMES[cat]).toBe('string');
      expect(CATEGORY_DISPLAY_NAMES[cat].length).toBeGreaterThan(0);
    }
  });

  it('exports 8-10 CPU names', () => {
    expect(CPU_NAMES.length).toBeGreaterThanOrEqual(8);
    expect(CPU_NAMES.length).toBeLessThanOrEqual(10);
  });
});

// ── calculateCategoryScore — upper section ───────────────────────────────────

describe('calculateCategoryScore upper section', () => {
  it('ones: sums all 1s, 0 when none', () => {
    expect(calculateCategoryScore([1, 1, 3, 4, 1], 'ones')).toBe(3);
    expect(calculateCategoryScore([2, 3, 4, 5, 6], 'ones')).toBe(0);
  });

  it('twos: sums all 2s', () => {
    expect(calculateCategoryScore([2, 2, 2, 4, 5], 'twos')).toBe(6);
    expect(calculateCategoryScore([1, 3, 4, 5, 6], 'twos')).toBe(0);
  });

  it('threes: sums all 3s', () => {
    expect(calculateCategoryScore([3, 3, 3, 3, 6], 'threes')).toBe(12);
    expect(calculateCategoryScore([1, 2, 4, 5, 6], 'threes')).toBe(0);
  });

  it('fours: sums all 4s', () => {
    expect(calculateCategoryScore([4, 4, 4, 4, 4], 'fours')).toBe(20);
    expect(calculateCategoryScore([1, 2, 3, 5, 6], 'fours')).toBe(0);
  });

  it('fives: sums all 5s', () => {
    expect(calculateCategoryScore([5, 5, 1, 2, 3], 'fives')).toBe(10);
    expect(calculateCategoryScore([1, 2, 3, 4, 6], 'fives')).toBe(0);
  });

  it('sixes: sums all 6s', () => {
    expect(calculateCategoryScore([6, 6, 6, 1, 2], 'sixes')).toBe(18);
    expect(calculateCategoryScore([1, 2, 3, 4, 5], 'sixes')).toBe(0);
  });
});

// ── calculateCategoryScore — lower section ───────────────────────────────────

describe('calculateCategoryScore lower section', () => {
  it('threeOfAKind: sum of all dice when valid, else 0', () => {
    expect(calculateCategoryScore([3, 3, 3, 4, 5], 'threeOfAKind')).toBe(18);
    expect(calculateCategoryScore([5, 5, 5, 5, 1], 'threeOfAKind')).toBe(21);
    expect(calculateCategoryScore([1, 2, 3, 4, 5], 'threeOfAKind')).toBe(0);
    expect(calculateCategoryScore([2, 2, 3, 3, 4], 'threeOfAKind')).toBe(0);
  });

  it('fourOfAKind: sum of all dice when valid, else 0', () => {
    expect(calculateCategoryScore([4, 4, 4, 4, 2], 'fourOfAKind')).toBe(18);
    expect(calculateCategoryScore([6, 6, 6, 6, 6], 'fourOfAKind')).toBe(30);
    expect(calculateCategoryScore([4, 4, 4, 2, 1], 'fourOfAKind')).toBe(0);
  });

  it('fullHouse: 25 for pair+triple, 0 otherwise', () => {
    expect(calculateCategoryScore([3, 3, 5, 5, 5], 'fullHouse')).toBe(25);
    expect(calculateCategoryScore([2, 2, 2, 6, 6], 'fullHouse')).toBe(25);
    expect(calculateCategoryScore([2, 2, 3, 4, 5], 'fullHouse')).toBe(0);
    // 5-of-a-kind is NOT a full house
    expect(calculateCategoryScore([4, 4, 4, 4, 4], 'fullHouse')).toBe(0);
  });

  it('smallStraight: 30 for 4 consecutive, else 0', () => {
    expect(calculateCategoryScore([1, 2, 3, 4, 6], 'smallStraight')).toBe(30);
    expect(calculateCategoryScore([2, 3, 4, 5, 5], 'smallStraight')).toBe(30);
    expect(calculateCategoryScore([1, 3, 4, 5, 6], 'smallStraight')).toBe(30);
    expect(calculateCategoryScore([1, 2, 3, 4, 5], 'smallStraight')).toBe(30);
    expect(calculateCategoryScore([1, 2, 3, 5, 6], 'smallStraight')).toBe(0);
    expect(calculateCategoryScore([1, 1, 2, 3, 6], 'smallStraight')).toBe(0);
  });

  it('largeStraight: 40 for 5 consecutive, else 0', () => {
    expect(calculateCategoryScore([1, 2, 3, 4, 5], 'largeStraight')).toBe(40);
    expect(calculateCategoryScore([2, 3, 4, 5, 6], 'largeStraight')).toBe(40);
    expect(calculateCategoryScore([1, 2, 3, 4, 6], 'largeStraight')).toBe(0);
    expect(calculateCategoryScore([1, 1, 2, 3, 4], 'largeStraight')).toBe(0);
  });

  it('yahtzee: 50 for all-same, 0 otherwise', () => {
    expect(calculateCategoryScore([3, 3, 3, 3, 3], 'yahtzee')).toBe(50);
    expect(calculateCategoryScore([6, 6, 6, 6, 6], 'yahtzee')).toBe(50);
    expect(calculateCategoryScore([1, 1, 1, 1, 2], 'yahtzee')).toBe(0);
  });

  it('chance: always sum of dice', () => {
    expect(calculateCategoryScore([1, 2, 3, 4, 5], 'chance')).toBe(15);
    expect(calculateCategoryScore([6, 6, 6, 6, 6], 'chance')).toBe(30);
    expect(calculateCategoryScore([1, 1, 1, 1, 1], 'chance')).toBe(5);
  });
});

// ── Utilities ────────────────────────────────────────────────────────────────

describe('createEmptyScorecard', () => {
  it('returns a card with every category null', () => {
    const sc = createEmptyScorecard();
    for (const cat of ALL_CATEGORIES) {
      expect(sc[cat]).toBeNull();
    }
  });
});

describe('isYahtzee', () => {
  it('true for five-of-a-kind', () => {
    expect(isYahtzee([4, 4, 4, 4, 4])).toBe(true);
  });
  it('false otherwise', () => {
    expect(isYahtzee([4, 4, 4, 4, 5])).toBe(false);
    expect(isYahtzee([1, 2, 3, 4, 5])).toBe(false);
  });
});

describe('getUpperSubtotal', () => {
  it('sums filled upper categories, treats null as 0', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.twos = 6;
    sc.threes = 9;
    expect(getUpperSubtotal(sc)).toBe(18);
  });

  it('returns 0 when no upper categories filled', () => {
    const sc = createEmptyScorecard();
    sc.yahtzee = 50;
    expect(getUpperSubtotal(sc)).toBe(0);
  });
});

describe('hasUpperBonus', () => {
  it('true when upper subtotal >= 63', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.twos = 6;
    sc.threes = 9;
    sc.fours = 12;
    sc.fives = 15;
    sc.sixes = 18;
    expect(getUpperSubtotal(sc)).toBe(UPPER_BONUS_THRESHOLD);
    expect(hasUpperBonus(sc)).toBe(true);
  });

  it('false when below threshold', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.twos = 6;
    expect(hasUpperBonus(sc)).toBe(false);
  });
});

describe('calculateTotal', () => {
  it('sums filled categories without bonuses', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.chance = 20;
    expect(calculateTotal(sc, 0)).toBe(23);
  });

  it('adds upper bonus when threshold met', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.twos = 6;
    sc.threes = 9;
    sc.fours = 12;
    sc.fives = 15;
    sc.sixes = 18;
    expect(calculateTotal(sc, 0)).toBe(63 + UPPER_BONUS_VALUE);
  });

  it('adds yahtzee bonuses', () => {
    const sc = createEmptyScorecard();
    sc.yahtzee = 50;
    expect(calculateTotal(sc, 2)).toBe(50 + 2 * YAHTZEE_BONUS_VALUE);
  });
});

describe('getUnfilledCategories', () => {
  it('returns only null categories', () => {
    const sc = createEmptyScorecard();
    sc.ones = 3;
    sc.yahtzee = 0;
    const unfilled = getUnfilledCategories(sc);
    expect(unfilled).not.toContain('ones');
    expect(unfilled).not.toContain('yahtzee');
    expect(unfilled).toHaveLength(11);
  });
});

describe('getAllPossibleScores', () => {
  it('returns one entry per unfilled category with correct score', () => {
    const sc = createEmptyScorecard();
    sc.chance = 20; // filled — should be skipped
    const scores = getAllPossibleScores([1, 2, 3, 4, 5], sc);
    expect(scores).toHaveLength(12);
    const largeStraight = scores.find((s) => s.category === 'largeStraight');
    expect(largeStraight?.score).toBe(40);
    const ones = scores.find((s) => s.category === 'ones');
    expect(ones?.score).toBe(1);
    expect(scores.find((s) => s.category === 'chance')).toBeUndefined();
  });
});

// ── Steal logic ──────────────────────────────────────────────────────────────

describe('canSteal', () => {
  it('true when all 5 conditions met', () => {
    const stealer = makePlayer('a');
    const victim = makePlayer('b', {
      scorecard: { ...createEmptyScorecard(), chance: 20 },
    });
    expect(canSteal(stealer, victim, 'chance')).toBe(true);
  });

  it('false when stealer already used steal', () => {
    const stealer = makePlayer('a', { stealUsed: true });
    const victim = makePlayer('b', {
      scorecard: { ...createEmptyScorecard(), chance: 20 },
    });
    expect(canSteal(stealer, victim, 'chance')).toBe(false);
  });

  it('false when victim already stolen from', () => {
    const stealer = makePlayer('a');
    const victim = makePlayer('b', {
      stolenFrom: true,
      scorecard: { ...createEmptyScorecard(), chance: 20 },
    });
    expect(canSteal(stealer, victim, 'chance')).toBe(false);
  });

  it('false when stealer already filled that category', () => {
    const stealer = makePlayer('a', {
      scorecard: { ...createEmptyScorecard(), chance: 10 },
    });
    const victim = makePlayer('b', {
      scorecard: { ...createEmptyScorecard(), chance: 20 },
    });
    expect(canSteal(stealer, victim, 'chance')).toBe(false);
  });

  it('false when victim has not scored in that category', () => {
    const stealer = makePlayer('a');
    const victim = makePlayer('b');
    expect(canSteal(stealer, victim, 'chance')).toBe(false);
  });

  it('false when stealer and victim are the same player', () => {
    const player = makePlayer('a', {
      scorecard: { ...createEmptyScorecard(), chance: 20 },
    });
    expect(canSteal(player, player, 'chance')).toBe(false);
  });
});

describe('getStealablePlayers', () => {
  it('returns the victim/category/points when valid', () => {
    const players = [
      makePlayer('a'),
      makePlayer('b', {
        scorecard: { ...createEmptyScorecard(), chance: 22 },
      }),
    ];
    const result = getStealablePlayers(0, players, 'chance', 1);
    expect(result).toHaveLength(1);
    expect(result[0].playerIndex).toBe(1);
    expect(result[0].category).toBe('chance');
    expect(result[0].points).toBe(22);
  });

  it('returns empty when stealer is the one who just scored', () => {
    const players = [
      makePlayer('a', {
        scorecard: { ...createEmptyScorecard(), chance: 22 },
      }),
      makePlayer('b'),
    ];
    const result = getStealablePlayers(0, players, 'chance', 0);
    expect(result).toEqual([]);
  });

  it('returns empty when canSteal fails', () => {
    const players = [
      makePlayer('a', { stealUsed: true }),
      makePlayer('b', {
        scorecard: { ...createEmptyScorecard(), chance: 22 },
      }),
    ];
    const result = getStealablePlayers(0, players, 'chance', 1);
    expect(result).toEqual([]);
  });
});

// ── CPU decisions ────────────────────────────────────────────────────────────

describe('cpuSelectCategory', () => {
  it('picks Yahtzee when available', () => {
    const sc = createEmptyScorecard();
    expect(cpuSelectCategory([4, 4, 4, 4, 4], sc)).toBe('yahtzee');
  });

  it('picks large straight on [1,2,3,4,5]', () => {
    const sc = createEmptyScorecard();
    expect(cpuSelectCategory([1, 2, 3, 4, 5], sc)).toBe('largeStraight');
  });

  it('picks full house when no straight or yahtzee', () => {
    const sc = createEmptyScorecard();
    sc.largeStraight = 0;
    sc.smallStraight = 0;
    expect(cpuSelectCategory([3, 3, 5, 5, 5], sc)).toBe('fullHouse');
  });

  it('picks highest-scoring upper when above-average', () => {
    const sc = createEmptyScorecard();
    sc.yahtzee = 0;
    sc.largeStraight = 0;
    sc.smallStraight = 0;
    sc.fullHouse = 0;
    // four 6s = 24 in sixes (well above 18 average), and threeOfAKind = 25
    // but 25 > 24 so it should pick threeOfAKind (highest scoring) once the
    // upper "good enough" check has been considered. Actually upper-section
    // takes priority when at-or-above average — so 'sixes' wins here.
    const choice = cpuSelectCategory([6, 6, 6, 6, 1], sc);
    expect(choice).toBe('sixes');
  });

  it('zeros out cheapest unfilled when all options score 0', () => {
    const sc = createEmptyScorecard();
    // Fill everything except ones and twos with 0.
    sc.threes = 0;
    sc.fours = 0;
    sc.fives = 0;
    sc.sixes = 0;
    sc.threeOfAKind = 0;
    sc.fourOfAKind = 0;
    sc.fullHouse = 0;
    sc.smallStraight = 0;
    sc.largeStraight = 0;
    sc.yahtzee = 0;
    sc.chance = 0;
    // Dice with no 1s and no 2s — both unfilled options score 0.
    // Sacrifice order prefers 'ones' (cheapest).
    expect(cpuSelectCategory([3, 4, 5, 6, 6], sc)).toBe('ones');
  });
});

describe('cpuDecideHold', () => {
  it('holds all 5 dice on a Yahtzee', () => {
    expect(cpuDecideHold([3, 3, 3, 3, 3], 2, createEmptyScorecard())).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it('holds 4-of-a-kind dice only', () => {
    const holds = cpuDecideHold([5, 5, 5, 5, 2], 2, createEmptyScorecard());
    expect(holds).toEqual([true, true, true, true, false]);
  });

  it('holds 3-of-a-kind dice', () => {
    const holds = cpuDecideHold([6, 6, 6, 1, 2], 2, createEmptyScorecard());
    expect(holds).toEqual([true, true, true, false, false]);
  });

  it('holds straight dice on a 4-run', () => {
    // [1,2,3,4,6] — straight 1-4 present, hold those
    const holds = cpuDecideHold([1, 2, 3, 4, 6], 2, createEmptyScorecard());
    expect(holds[0]).toBe(true);
    expect(holds[1]).toBe(true);
    expect(holds[2]).toBe(true);
    expect(holds[3]).toBe(true);
    expect(holds[4]).toBe(false);
  });

  it('holds a high pair (>=4)', () => {
    const holds = cpuDecideHold([6, 6, 1, 2, 3], 2, createEmptyScorecard());
    expect(holds).toEqual([true, true, false, false, false]);
  });

  it('holds nothing on junk', () => {
    const holds = cpuDecideHold([1, 2, 3, 5, 6], 2, createEmptyScorecard());
    // straight 1-3 + isolated 5-6 has longest run of 3 — no 4-run, no pair
    // of 4+, no triple. Should be all false.
    expect(holds).toEqual([false, false, false, false, false]);
  });
});

describe('cpuDecideSteal', () => {
  const baseCpu = makePlayer('cpu', { type: 'cpu' });
  const baseVictim = makePlayer('victim', {
    scorecard: { ...createEmptyScorecard(), chance: 25 },
  });

  it('returns null when not eligible (stealUsed)', () => {
    const cpu = { ...baseCpu, stealUsed: true };
    const players: DicePlayer[] = [cpu, baseVictim];
    expect(cpuDecideSteal(cpu, 0, players, 'chance', 1, 25)).toBeNull();
  });

  it('returns null when cpu is the scorer', () => {
    const players: DicePlayer[] = [baseVictim, baseCpu];
    expect(cpuDecideSteal(baseCpu, 0, players, 'chance', 0, 25)).toBeNull();
  });

  it('always steals high-value (>=20) scores', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.999);
    const players: DicePlayer[] = [baseCpu, baseVictim];
    const attempt = cpuDecideSteal(baseCpu, 0, players, 'chance', 1, 25);
    expect(attempt).not.toBeNull();
    expect(attempt?.points).toBe(25);
    expect(attempt?.victimIndex).toBe(1);
    spy.mockRestore();
  });

  it('steals at 70% for mid-value (10-19)', () => {
    const victim = makePlayer('victim', {
      scorecard: { ...createEmptyScorecard(), chance: 15 },
    });
    const players: DicePlayer[] = [baseCpu, victim];

    // 0.5 < 0.7 → steal
    const a = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(cpuDecideSteal(baseCpu, 0, players, 'chance', 1, 15)).not.toBeNull();
    a.mockRestore();

    // 0.8 >= 0.7 → no steal
    const b = jest.spyOn(Math, 'random').mockReturnValue(0.8);
    expect(cpuDecideSteal(baseCpu, 0, players, 'chance', 1, 15)).toBeNull();
    b.mockRestore();
  });

  it('steals at 30% for low-value (<10)', () => {
    const victim = makePlayer('victim', {
      scorecard: { ...createEmptyScorecard(), chance: 5 },
    });
    const players: DicePlayer[] = [baseCpu, victim];

    // 0.1 < 0.3 → steal
    const a = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(cpuDecideSteal(baseCpu, 0, players, 'chance', 1, 5)).not.toBeNull();
    a.mockRestore();

    // 0.5 >= 0.3 → no steal
    const b = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(cpuDecideSteal(baseCpu, 0, players, 'chance', 1, 5)).toBeNull();
    b.mockRestore();
  });
});

// ── Sanity types check ───────────────────────────────────────────────────────

describe('type integrity', () => {
  it('Scorecard satisfies ScoringCategory keys', () => {
    const sc: Scorecard = createEmptyScorecard();
    const cat: ScoringCategory = 'yahtzee';
    sc[cat] = 50;
    expect(sc.yahtzee).toBe(50);
  });
});
