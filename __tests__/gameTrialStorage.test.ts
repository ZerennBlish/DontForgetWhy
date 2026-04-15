const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
  kvRemove: (key: string) => { kvStore.delete(key); },
}));

jest.mock('../src/services/proStatus', () => ({
  isProUser: jest.fn(() => false),
}));

import {
  getTrialCount,
  incrementTrial,
  canPlayGame,
  getTrialRemaining,
  resetTrials,
  TRIAL_LIMIT,
  TrialGame,
} from '../src/services/gameTrialStorage';
import { isProUser } from '../src/services/proStatus';

const mockedIsProUser = isProUser as jest.MockedFunction<typeof isProUser>;

const ALL_GAMES: TrialGame[] = ['chess', 'checkers', 'trivia', 'sudoku', 'memoryMatch'];

beforeEach(() => {
  kvStore.clear();
  mockedIsProUser.mockReturnValue(false);
});

// ── TRIAL_LIMIT ─────────────────────────────────────────────────

describe('TRIAL_LIMIT', () => {
  it('is 3', () => {
    expect(TRIAL_LIMIT).toBe(3);
  });
});

// ── getTrialCount ───────────────────────────────────────────────

describe('getTrialCount', () => {
  it('returns 0 for a fresh game with no stored data', () => {
    expect(getTrialCount('chess')).toBe(0);
    expect(getTrialCount('checkers')).toBe(0);
    expect(getTrialCount('trivia')).toBe(0);
    expect(getTrialCount('sudoku')).toBe(0);
    expect(getTrialCount('memoryMatch')).toBe(0);
  });

  it('returns the stored count for a game', () => {
    kvStore.set('game_trial_chess', '2');
    expect(getTrialCount('chess')).toBe(2);
  });

  it('returns 0 when stored value is not a valid number', () => {
    kvStore.set('game_trial_chess', 'abc');
    expect(getTrialCount('chess')).toBe(0);
  });

  it('returns 0 when stored value is negative', () => {
    kvStore.set('game_trial_chess', '-1');
    expect(getTrialCount('chess')).toBe(0);
  });

  it('tracks counts independently per game', () => {
    kvStore.set('game_trial_chess', '1');
    kvStore.set('game_trial_sudoku', '3');
    expect(getTrialCount('chess')).toBe(1);
    expect(getTrialCount('sudoku')).toBe(3);
    expect(getTrialCount('trivia')).toBe(0);
  });
});

// ── incrementTrial ──────────────────────────────────────────────

describe('incrementTrial', () => {
  it('increments from 0 to 1 on a fresh game', () => {
    expect(incrementTrial('chess')).toBe(1);
    expect(getTrialCount('chess')).toBe(1);
  });

  it('increments sequentially across multiple calls', () => {
    expect(incrementTrial('trivia')).toBe(1);
    expect(incrementTrial('trivia')).toBe(2);
    expect(incrementTrial('trivia')).toBe(3);
    expect(incrementTrial('trivia')).toBe(4);
    expect(getTrialCount('trivia')).toBe(4);
  });

  it('only increments the specified game', () => {
    incrementTrial('chess');
    incrementTrial('chess');
    expect(getTrialCount('chess')).toBe(2);
    expect(getTrialCount('checkers')).toBe(0);
  });
});

// ── canPlayGame ─────────────────────────────────────────────────

describe('canPlayGame', () => {
  it('returns true when trial count is 0', () => {
    expect(canPlayGame('chess')).toBe(true);
  });

  it('returns true for counts 1 and 2 (under the limit)', () => {
    kvStore.set('game_trial_chess', '1');
    expect(canPlayGame('chess')).toBe(true);
    kvStore.set('game_trial_chess', '2');
    expect(canPlayGame('chess')).toBe(true);
  });

  it('returns false once count reaches the limit', () => {
    kvStore.set('game_trial_chess', '3');
    expect(canPlayGame('chess')).toBe(false);
  });

  it('returns false above the limit', () => {
    kvStore.set('game_trial_chess', '5');
    expect(canPlayGame('chess')).toBe(false);
  });

  it('always returns true when user is Pro, even at or above the limit', () => {
    mockedIsProUser.mockReturnValue(true);
    kvStore.set('game_trial_chess', '99');
    expect(canPlayGame('chess')).toBe(true);
    expect(canPlayGame('sudoku')).toBe(true);
  });
});

// ── getTrialRemaining ───────────────────────────────────────────

describe('getTrialRemaining', () => {
  it('returns 3 for a fresh game', () => {
    expect(getTrialRemaining('chess')).toBe(3);
  });

  it('returns 3 - count for partial plays', () => {
    kvStore.set('game_trial_chess', '1');
    expect(getTrialRemaining('chess')).toBe(2);
    kvStore.set('game_trial_chess', '2');
    expect(getTrialRemaining('chess')).toBe(1);
  });

  it('returns 0 when count equals the limit', () => {
    kvStore.set('game_trial_chess', '3');
    expect(getTrialRemaining('chess')).toBe(0);
  });

  it('returns 0 when count exceeds the limit (no negatives)', () => {
    kvStore.set('game_trial_chess', '10');
    expect(getTrialRemaining('chess')).toBe(0);
  });

  it('returns Infinity for Pro users', () => {
    mockedIsProUser.mockReturnValue(true);
    kvStore.set('game_trial_chess', '2');
    expect(getTrialRemaining('chess')).toBe(Infinity);
  });
});

// ── resetTrials ─────────────────────────────────────────────────

describe('resetTrials', () => {
  it('clears trial counts for every game', () => {
    for (const g of ALL_GAMES) kvStore.set(`game_trial_${g}`, '3');
    for (const g of ALL_GAMES) expect(getTrialCount(g)).toBe(3);

    resetTrials();

    for (const g of ALL_GAMES) expect(getTrialCount(g)).toBe(0);
  });

  it('leaves unrelated kv keys untouched', () => {
    kvStore.set('game_trial_chess', '3');
    kvStore.set('unrelated_key', 'hello');
    resetTrials();
    expect(kvStore.get('unrelated_key')).toBe('hello');
    expect(kvStore.get('game_trial_chess')).toBeUndefined();
  });
});
