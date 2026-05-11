// ── In-memory Firestore mock (mirrors __tests__/multiplayer.test.ts) ────────

type DocData = Record<string, unknown>;
const docs = new Map<string, DocData>();

type FilterTuple = [string, string, unknown];

function matchesFilter(
  data: DocData,
  field: string,
  op: string,
  value: unknown,
): boolean {
  const fv = data[field];
  switch (op) {
    case '==':
      return fv === value;
    case '!=':
      return fv !== value;
    case 'array-contains':
      return Array.isArray(fv) && fv.includes(value);
    case 'in':
      return Array.isArray(value) && (value as unknown[]).includes(fv);
    default:
      return true;
  }
}

function isArrayUnion(
  v: unknown,
): v is { __op: 'arrayUnion'; values: unknown[] } {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { __op?: unknown }).__op === 'arrayUnion'
  );
}

function setNested(obj: DocData, dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function makeDocRef(code: string) {
  const ref = {
    id: code,
    get: jest.fn(async () => {
      const data = docs.get(code);
      return {
        id: code,
        exists: () => data !== undefined,
        data: () => data,
      };
    }),
    set: jest.fn(async (payload: DocData) => {
      docs.set(code, { ...payload });
    }),
    update: jest.fn(async (updates: DocData) => {
      const existing = docs.get(code);
      if (!existing) throw new Error(`Doc ${code} not found`);
      const merged: DocData = { ...existing };
      for (const [key, value] of Object.entries(updates)) {
        if (isArrayUnion(value)) {
          const current = Array.isArray(merged[key])
            ? (merged[key] as unknown[])
            : [];
          const next = [...current];
          for (const item of value.values) {
            if (!next.includes(item)) next.push(item);
          }
          merged[key] = next;
        } else if (key.includes('.')) {
          setNested(merged, key, value);
        } else {
          merged[key] = value;
        }
      }
      docs.set(code, merged);
    }),
    delete: jest.fn(async () => {
      docs.delete(code);
    }),
    onSnapshot: jest.fn(() => () => {}),
  };
  return ref;
}

type MockCollection = {
  where: jest.Mock;
  orderBy: jest.Mock;
  get: jest.Mock;
  doc: jest.Mock;
};

function makeCollection(name: string): MockCollection {
  const filters: FilterTuple[] = [];

  const chain: MockCollection = {
    where: jest.fn((field: string, op: string, value: unknown) => {
      filters.push([field, op, value]);
      return chain;
    }),
    orderBy: jest.fn(() => chain),
    get: jest.fn(async () => {
      if (name !== 'games') return { size: 0, docs: [] };
      const matched: Array<[string, DocData]> = [];
      for (const [code, data] of docs.entries()) {
        if (filters.every(([f, op, v]) => matchesFilter(data, f, op, v))) {
          matched.push([code, data]);
        }
      }
      return {
        size: matched.length,
        docs: matched.map(([code, data]) => ({
          id: code,
          data: () => data,
          ref: makeDocRef(code),
        })),
      };
    }),
    doc: jest.fn((code: string) => makeDocRef(code)),
  };
  return chain;
}

const firestoreInstance = {
  collection: jest.fn((name: string) => makeCollection(name)),
};

const arrayUnionMock = jest.fn((...values: unknown[]) => ({
  __op: 'arrayUnion',
  values,
}));

type ConstraintTag =
  | { __c: 'where'; field: string; op: string; value: unknown }
  | { __c: 'orderBy'; field: string; direction: 'asc' | 'desc' };

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => firestoreInstance),
  collection: jest.fn((_fs: unknown, name: string) =>
    firestoreInstance.collection(name),
  ),
  doc: jest.fn((coll: MockCollection, id: string) => coll.doc(id)),
  getDoc: jest.fn(async (ref: ReturnType<typeof makeDocRef>) => ref.get()),
  getDocs: jest.fn(async (q: MockCollection) => q.get()),
  setDoc: jest.fn(
    async (ref: ReturnType<typeof makeDocRef>, payload: DocData) =>
      ref.set(payload),
  ),
  updateDoc: jest.fn(
    async (ref: ReturnType<typeof makeDocRef>, updates: DocData) =>
      ref.update(updates),
  ),
  deleteDoc: jest.fn(async (ref: ReturnType<typeof makeDocRef>) => ref.delete()),
  query: jest.fn((coll: MockCollection, ...constraints: ConstraintTag[]) => {
    let chain = coll;
    for (const c of constraints) {
      if (c.__c === 'where') chain = chain.where(c.field, c.op, c.value);
      else if (c.__c === 'orderBy') chain = chain.orderBy(c.field, c.direction);
    }
    return chain;
  }),
  where: jest.fn((field: string, op: string, value: unknown) => ({
    __c: 'where',
    field,
    op,
    value,
  })),
  orderBy: jest.fn((field: string, direction: 'asc' | 'desc' = 'asc') => ({
    __c: 'orderBy',
    field,
    direction,
  })),
  onSnapshot: jest.fn(() => () => {}),
  arrayUnion: arrayUnionMock,
}));

let proStatus = true;
jest.mock('../src/services/proStatus', () => ({
  __esModule: true,
  isProUser: jest.fn(() => proStatus),
}));

jest.mock('../src/services/firebaseAuth', () => ({
  __esModule: true,
  getCurrentUser: jest.fn(() => null),
}));

import {
  createDiceGame,
  joinDiceGame,
  startDiceGame,
  rollDiceMultiplayer,
  toggleHoldMultiplayer,
  scoreCategoryMultiplayer,
  claimSteal,
  advanceTurn,
  leaveDiceGame,
  type DiceMultiplayerGame,
} from '../src/services/multiplayerDice';
import { createEmptyScorecard } from '../src/services/diceGameScoring';
import { YAHTZEE_SCORE } from '../src/services/diceGameTypes';

// ── Test helpers ─────────────────────────────────────────────────────────────

const host = { uid: 'host-1', displayName: 'Host' };
const guest = { uid: 'guest-1', displayName: 'Guest' };
const guest2 = { uid: 'guest-2', displayName: 'Guest2' };

function getGame(code: string): DiceMultiplayerGame {
  const g = docs.get(code);
  if (!g) throw new Error(`No game ${code}`);
  return g as unknown as DiceMultiplayerGame;
}

beforeEach(() => {
  docs.clear();
  proStatus = true;
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createDiceGame', () => {
  it('creates a doc with correct shape', async () => {
    const { code } = await createDiceGame(host, 2);
    const g = getGame(code);
    expect(g.type).toBe('dice');
    expect(g.host).toEqual(host);
    expect(g.players).toEqual(['host-1']);
    expect(g.playerDetails).toEqual([host]);
    expect(g.status).toBe('waiting');
    expect(g.playerCount).toBe(2);
    expect(g.dice).toEqual([0, 0, 0, 0, 0]);
    expect(g.rollsRemaining).toBe(3);
    expect(g.round).toBe(1);
  });

  it('rejects non-Pro users', async () => {
    proStatus = false;
    await expect(createDiceGame(host, 2)).rejects.toThrow('Pro required');
  });

  it('rejects bad player counts', async () => {
    await expect(createDiceGame(host, 1)).rejects.toThrow('Player count');
    await expect(createDiceGame(host, 5)).rejects.toThrow('Player count');
  });
});

describe('joinDiceGame', () => {
  it('adds player to arrays', async () => {
    const { code } = await createDiceGame(host, 3);
    await joinDiceGame(code, guest);
    const g = getGame(code);
    expect(g.players).toContain('guest-1');
    expect(g.playerDetails).toContainEqual(guest);
  });

  it('rejects wrong game type', async () => {
    docs.set('FAKE01', {
      type: 'trivia',
      status: 'waiting',
      players: [],
      playerDetails: [],
      playerCount: 2,
    });
    await expect(joinDiceGame('FAKE01', guest)).rejects.toThrow(
      'not a dice game',
    );
  });

  it('rejects when game is full', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await expect(joinDiceGame(code, guest2)).rejects.toThrow('full');
  });
});

describe('startDiceGame', () => {
  it('randomizes order and initializes state', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g = getGame(code);
    expect(g.status).toBe('active');
    expect(g.playerOrder).toHaveLength(2);
    expect(new Set(g.playerOrder)).toEqual(new Set(['host-1', 'guest-1']));
    expect(g.currentPlayerUid).toBe(g.playerOrder[0]);
    expect(g.scorecards['host-1']).toEqual(createEmptyScorecard());
    expect(g.scorecards['guest-1']).toEqual(createEmptyScorecard());
    expect(g.yahtzeeBonuses['host-1']).toBe(0);
    expect(g.stealUsed['guest-1']).toBe(false);
    expect(g.rollsRemaining).toBe(3);
  });

  it('rejects non-host start', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await expect(startDiceGame(code, guest.uid)).rejects.toThrow(
      'Only the host',
    );
  });
});

describe('rollDiceMultiplayer', () => {
  it('validates caller is current player', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g = getGame(code);
    const currentUid = g.currentPlayerUid;
    const otherUid = currentUid === 'host-1' ? 'guest-1' : 'host-1';
    await expect(rollDiceMultiplayer(code, otherUid)).rejects.toThrow(
      'Not your turn',
    );
    await rollDiceMultiplayer(code, currentUid);
    const g2 = getGame(code);
    expect(g2.rollsRemaining).toBe(2);
    expect(g2.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
  });
});

describe('scoreCategoryMultiplayer', () => {
  it('updates scorecard and opens steal window', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g0 = getGame(code);
    const me = g0.currentPlayerUid;
    await rollDiceMultiplayer(code, me);
    await scoreCategoryMultiplayer(code, me, 'chance');
    const g = getGame(code);
    expect(g.stealWindowActive).toBe(true);
    expect(g.lastScoredCategory).toBe('chance');
    expect(g.lastScoredPlayerUid).toBe(me);
    expect(g.scorecards[me].chance).not.toBeNull();
    expect(g.stealClaim).toBeNull();
  });
});

describe('claimSteal', () => {
  async function setupScoredGame(): Promise<{ code: string; scorer: string; stealer: string; points: number }> {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g = getGame(code);
    const scorer = g.currentPlayerUid;
    const stealer = scorer === 'host-1' ? 'guest-1' : 'host-1';
    await rollDiceMultiplayer(code, scorer);
    await scoreCategoryMultiplayer(code, scorer, 'chance');
    const after = getGame(code);
    return { code, scorer, stealer, points: after.lastScoredValue ?? 0 };
  }

  it('succeeds for the first claimer and fails for the second', async () => {
    const { code, scorer, stealer, points } = await setupScoredGame();
    const first = await claimSteal(code, stealer);
    expect(first).toBe(true);
    const g = getGame(code);
    expect(g.scorecards[stealer].chance).toBe(points);
    expect(g.scorecards[scorer].chance).toBeNull();
    expect(g.stealUsed[stealer]).toBe(true);
    expect(g.stolenFrom[scorer]).toBe(true);

    // Second claim should bail because stealClaim is already set.
    const second = await claimSteal(code, stealer);
    expect(second).toBe(false);
  });

  it('rejects scorer trying to steal from themselves', async () => {
    const { code, scorer } = await setupScoredGame();
    const ok = await claimSteal(code, scorer);
    expect(ok).toBe(false);
  });
});

describe('advanceTurn', () => {
  it('advances player and increments round on wrap', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g0 = getGame(code);
    const first = g0.currentPlayerUid;

    // Player 1 plays.
    await rollDiceMultiplayer(code, first);
    await scoreCategoryMultiplayer(code, first, 'chance');
    await advanceTurn(code, first);
    const g1 = getGame(code);
    expect(g1.currentPlayerUid).toBe(g1.playerOrder[1]);
    expect(g1.round).toBe(1);
    expect(g1.stealWindowActive).toBe(false);

    // Player 2 plays — wrap, round increments.
    const second = g1.currentPlayerUid;
    await rollDiceMultiplayer(code, second);
    await scoreCategoryMultiplayer(code, second, 'ones');
    await advanceTurn(code, second);
    const g2 = getGame(code);
    expect(g2.round).toBe(2);
    expect(g2.currentPlayerUid).toBe(g2.playerOrder[0]);
  });

  it('rejects unauthorized callers', async () => {
    const { code } = await createDiceGame(host, 3);
    await joinDiceGame(code, guest);
    await joinDiceGame(code, guest2);
    await startDiceGame(code, host.uid);
    const g0 = getGame(code);
    const first = g0.currentPlayerUid;
    await rollDiceMultiplayer(code, first);
    await scoreCategoryMultiplayer(code, first, 'chance');
    // Pick a caller that is neither the scorer nor the host.
    const candidates = ['host-1', 'guest-1', 'guest-2'].filter(
      (u) => u !== first && u !== host.uid,
    );
    if (candidates.length > 0) {
      await expect(advanceTurn(code, candidates[0])).rejects.toThrow(
        'Not authorized',
      );
    }
  });
});

describe('leaveDiceGame', () => {
  it('promotes new host if host leaves the lobby', async () => {
    const { code } = await createDiceGame(host, 3);
    await joinDiceGame(code, guest);
    await joinDiceGame(code, guest2);
    await leaveDiceGame(code, host.uid);
    const g = getGame(code);
    expect(g.host.uid).toBe('guest-1');
    expect(g.players).not.toContain('host-1');
    expect(g.playerDetails.find((p) => p.uid === 'host-1')).toBeUndefined();
  });

  it('forfeits an active game on leave', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    await leaveDiceGame(code, host.uid);
    const g = getGame(code);
    expect(g.status).toBe('finished');
    expect(g.result).not.toBeNull();
  });
});

describe('yahtzee bonus', () => {
  it('increments when a second yahtzee is scored after the first', async () => {
    const { code } = await createDiceGame(host, 2);
    await joinDiceGame(code, guest);
    await startDiceGame(code, host.uid);
    const g = getGame(code);
    // Seed: pre-fill yahtzee with 50 for the current player and force their
    // dice to be a yahtzee. Then score another category — bonus should bump.
    const me = g.currentPlayerUid;
    const seedCard = createEmptyScorecard();
    seedCard.yahtzee = YAHTZEE_SCORE;
    const seededGame = {
      ...g,
      scorecards: { ...g.scorecards, [me]: seedCard },
      dice: [4, 4, 4, 4, 4],
      rollsRemaining: 2,
    };
    docs.set(code, seededGame as unknown as DocData);
    await scoreCategoryMultiplayer(code, me, 'fours');
    const after = getGame(code);
    expect(after.yahtzeeBonuses[me]).toBe(1);
  });
});
