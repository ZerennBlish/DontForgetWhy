// ── In-memory Firestore mock ─────────────────────────────────────────

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
        } else {
          merged[key] = value;
        }
      }
      docs.set(code, merged);
    }),
    delete: jest.fn(async () => {
      docs.delete(code);
    }),
    onSnapshot: jest.fn((cb: (snap: unknown) => void) => {
      const data = docs.get(code);
      cb({
        id: code,
        exists: () => data !== undefined,
        data: () => data,
      });
      return () => {};
    }),
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
  let orderBy: [string, 'asc' | 'desc'] | null = null;

  const chain: MockCollection = {
    where: jest.fn((field: string, op: string, value: unknown) => {
      filters.push([field, op, value]);
      return chain;
    }),
    orderBy: jest.fn((field: string, dir: 'asc' | 'desc' = 'asc') => {
      orderBy = [field, dir];
      return chain;
    }),
    get: jest.fn(async () => {
      if (name !== 'games') return { size: 0, docs: [] };
      const matched: Array<[string, DocData]> = [];
      for (const [code, data] of docs.entries()) {
        if (filters.every(([f, op, v]) => matchesFilter(data, f, op, v))) {
          matched.push([code, data]);
        }
      }
      if (orderBy) {
        const [f, d] = orderBy;
        matched.sort(([, a], [, b]) => {
          const av = String(a[f] ?? '');
          const bv = String(b[f] ?? '');
          return d === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        });
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

type FirestoreMockFn = jest.Mock & {
  FieldValue: { arrayUnion: jest.Mock };
  Timestamp: { now: jest.Mock };
};

const firestoreFn = jest.fn(() => firestoreInstance) as FirestoreMockFn;
firestoreFn.FieldValue = {
  arrayUnion: jest.fn((...values: unknown[]) => ({
    __op: 'arrayUnion',
    values,
  })),
};
firestoreFn.Timestamp = {
  now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
};

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: firestoreFn,
}));

// ── Auth + Pro mocks ─────────────────────────────────────────────────

type MockUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

let currentUser: MockUser | null = null;
let proStatus = false;

jest.mock('../src/services/firebaseAuth', () => ({
  __esModule: true,
  getCurrentUser: jest.fn(() => currentUser),
}));

jest.mock('../src/services/proStatus', () => ({
  __esModule: true,
  isProUser: jest.fn(() => proStatus),
}));

// ── Imports under test ───────────────────────────────────────────────

import {
  generateGameCode,
  createGame,
  joinGame,
  makeMove,
  resign,
  offerDraw,
  respondToDraw,
  requestBreak,
  respondToBreak,
  listenToGame,
  getMyGames,
  cleanupFinishedGames,
  getOpponentUid,
  isMyTurn,
  type MultiplayerGame,
} from '../src/services/multiplayer';

// ── Test fixtures ────────────────────────────────────────────────────

const host: MockUser = {
  uid: 'host-1',
  displayName: 'Host',
  email: 'h@x.com',
};
const guest: MockUser = {
  uid: 'guest-1',
  displayName: 'Guest',
  email: 'g@x.com',
};

function seedGame(
  code: string,
  overrides: Partial<MultiplayerGame> = {},
): MultiplayerGame {
  const now = '2026-01-01T00:00:00.000Z';
  const game: MultiplayerGame = {
    code,
    type: 'chess',
    host: { uid: host.uid, displayName: 'Host' },
    guest: { uid: guest.uid, displayName: 'Guest' },
    hostColor: 'w',
    players: [host.uid, guest.uid],
    status: 'active',
    gameState:
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    turn: host.uid,
    result: null,
    winner: null,
    drawOffer: null,
    pauseRequest: null,
    createdAt: now,
    lastMoveAt: now,
    ...overrides,
  };
  docs.set(code, { ...game });
  return game;
}

beforeEach(() => {
  docs.clear();
  currentUser = null;
  proStatus = false;
  firestoreInstance.collection.mockClear();
  firestoreFn.FieldValue.arrayUnion.mockClear();
});

// ── generateGameCode ─────────────────────────────────────────────────

describe('generateGameCode', () => {
  const VALID_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const AMBIGUOUS_CHARS = ['O', '0', 'I', '1', 'L'];

  it('returns a 6-character string', () => {
    expect(generateGameCode()).toHaveLength(6);
  });

  it('uses only characters from the unambiguous charset', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateGameCode();
      for (const ch of code) {
        expect(VALID_CHARSET).toContain(ch);
      }
    }
  });

  it('never contains ambiguous characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateGameCode();
      for (const ambig of AMBIGUOUS_CHARS) {
        expect(code.includes(ambig)).toBe(false);
      }
    }
  });
});

// ── createGame ───────────────────────────────────────────────────────

describe('createGame', () => {
  it('throws if not signed in', async () => {
    currentUser = null;
    await expect(createGame('chess')).rejects.toThrow(/not signed in/i);
  });

  it('throws if not Pro', async () => {
    currentUser = host;
    proStatus = false;
    await expect(createGame('chess')).rejects.toThrow(/pro required/i);
  });

  it('throws if 5 or more active games', async () => {
    currentUser = host;
    proStatus = true;
    for (let i = 0; i < 5; i++) {
      seedGame(`GAME0${i}`, {
        host: { uid: host.uid, displayName: 'H' },
        guest: null,
        players: [host.uid],
        status: 'active',
      });
    }
    await expect(createGame('chess')).rejects.toThrow(/maximum 5/i);
  });

  it('allows creating when at 4 active games', async () => {
    currentUser = host;
    proStatus = true;
    for (let i = 0; i < 4; i++) {
      seedGame(`GAME0${i}`, {
        host: { uid: host.uid, displayName: 'H' },
        guest: null,
        players: [host.uid],
        status: 'active',
      });
    }
    await expect(createGame('chess')).resolves.toMatchObject({
      code: expect.any(String),
    });
  });

  it('writes a doc with the correct shape and returns code + gameId', async () => {
    currentUser = host;
    proStatus = true;
    const { code, gameId } = await createGame('chess', 'w');
    expect(code).toHaveLength(6);
    expect(gameId).toBe(code);

    const stored = docs.get(code) as unknown as MultiplayerGame;
    expect(stored).toBeDefined();
    expect(stored.code).toBe(code);
    expect(stored.type).toBe('chess');
    expect(stored.host).toEqual({
      uid: host.uid,
      displayName: host.displayName,
    });
    expect(stored.guest).toBeNull();
    expect(stored.hostColor).toBe('w');
    expect(stored.players).toEqual([host.uid]);
    expect(stored.status).toBe('waiting');
    expect(stored.gameState).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
    expect(stored.moves).toEqual([]);
    expect(stored.turn).toBe(host.uid);
    expect(stored.result).toBeNull();
    expect(stored.winner).toBeNull();
    expect(stored.drawOffer).toBeNull();
    expect(stored.pauseRequest).toBeNull();
    expect(typeof stored.createdAt).toBe('string');
    expect(typeof stored.lastMoveAt).toBe('string');
  });

  it('sets turn to empty when host chose black', async () => {
    currentUser = host;
    proStatus = true;
    const { code } = await createGame('chess', 'b');
    const stored = docs.get(code) as unknown as MultiplayerGame;
    expect(stored.hostColor).toBe('b');
    expect(stored.turn).toBe('');
  });

  it('uses empty gameState for checkers and trivia', async () => {
    currentUser = host;
    proStatus = true;
    const { code: ck } = await createGame('checkers');
    expect((docs.get(ck) as unknown as MultiplayerGame).gameState).toBe('');
    const { code: tv } = await createGame('trivia');
    expect((docs.get(tv) as unknown as MultiplayerGame).gameState).toBe('');
  });

  it('falls back to email for displayName when user has none', async () => {
    currentUser = { uid: 'x', displayName: null, email: 'x@x.com' };
    proStatus = true;
    const { code } = await createGame('chess');
    const stored = docs.get(code) as unknown as MultiplayerGame;
    expect(stored.host.displayName).toBe('x@x.com');
  });
});

// ── joinGame ─────────────────────────────────────────────────────────

describe('joinGame', () => {
  it('throws for invalid code', async () => {
    currentUser = guest;
    proStatus = true;
    await expect(joinGame('NOPEXX', 'chess')).rejects.toThrow(/game not found/i);
  });

  it('throws if game already started', async () => {
    currentUser = guest;
    proStatus = true;
    seedGame('ABC234', { status: 'active' });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(/already started/i);
  });

  it('throws if not Pro', async () => {
    currentUser = guest;
    proStatus = false;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(/pro required/i);
  });

  it('throws if not signed in', async () => {
    currentUser = null;
    proStatus = true;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(/not signed in/i);
  });

  it('throws if joining own game', async () => {
    currentUser = host;
    proStatus = true;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(/cannot join your own/i);
  });

  it('throws if game type does not match expected type', async () => {
    currentUser = guest;
    proStatus = true;
    seedGame('ABC234', {
      type: 'checkers',
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(
      /checkers game, not chess/i,
    );
  });

  it('updates guest, players, status, and turn (host=white)', async () => {
    currentUser = guest;
    proStatus = true;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
      hostColor: 'w',
      turn: host.uid,
    });

    const updated = await joinGame('ABC234', 'chess');
    expect(updated.status).toBe('active');
    expect(updated.guest).toEqual({
      uid: guest.uid,
      displayName: guest.displayName,
    });
    expect(updated.players).toEqual([host.uid, guest.uid]);
    expect(updated.turn).toBe(host.uid);
  });

  it('sets turn to joining guest when host chose black', async () => {
    currentUser = guest;
    proStatus = true;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
      hostColor: 'b',
      turn: '',
    });
    const updated = await joinGame('ABC234', 'chess');
    expect(updated.turn).toBe(guest.uid);
  });

  it('normalizes the code (trim + uppercase)', async () => {
    currentUser = guest;
    proStatus = true;
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('  abc234 ', 'chess')).resolves.toBeDefined();
  });

  it('throws if joiner already has 5 active games', async () => {
    currentUser = guest;
    proStatus = true;
    for (let i = 0; i < 5; i++) {
      seedGame(`HAVE0${i}`, {
        host: { uid: 'other', displayName: 'O' },
        guest: { uid: guest.uid, displayName: 'G' },
        players: ['other', guest.uid],
        status: 'active',
      });
    }
    seedGame('ABC234', {
      status: 'waiting',
      guest: null,
      players: [host.uid],
    });
    await expect(joinGame('ABC234', 'chess')).rejects.toThrow(/maximum 5/i);
  });
});

// ── makeMove ─────────────────────────────────────────────────────────

describe('makeMove', () => {
  it('throws if not your turn', async () => {
    currentUser = guest;
    seedGame('ABC234', { turn: host.uid });
    await expect(makeMove('ABC234', 'e4', 'new-state')).rejects.toThrow(
      /not your turn/i,
    );
  });

  it('throws if game not active', async () => {
    currentUser = host;
    seedGame('ABC234', { status: 'waiting', turn: host.uid });
    await expect(makeMove('ABC234', 'e4', 'new-state')).rejects.toThrow(
      /not active/i,
    );
  });

  it('updates gameState, moves, turn and clears drawOffer/pauseRequest', async () => {
    currentUser = host;
    seedGame('ABC234', {
      turn: host.uid,
      moves: ['d4'],
      drawOffer: guest.uid,
      pauseRequest: guest.uid,
    });

    await makeMove('ABC234', 'e4', 'new-fen');

    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.gameState).toBe('new-fen');
    expect(stored.moves).toEqual(['d4', 'e4']);
    expect(stored.turn).toBe(guest.uid);
    expect(stored.drawOffer).toBeNull();
    expect(stored.pauseRequest).toBeNull();
    expect(typeof stored.lastMoveAt).toBe('string');
  });
});

// ── resign ───────────────────────────────────────────────────────────

describe('resign', () => {
  it('winner = opponent when host resigns', async () => {
    currentUser = host;
    seedGame('ABC234');
    await resign('ABC234');
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.result).toBe('resigned');
    expect(stored.winner).toBe(guest.uid);
  });

  it('winner = opponent when guest resigns', async () => {
    currentUser = guest;
    seedGame('ABC234');
    await resign('ABC234');
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.winner).toBe(host.uid);
  });

  it('throws if not a participant', async () => {
    currentUser = { uid: 'stranger', displayName: null, email: null };
    seedGame('ABC234');
    await expect(resign('ABC234')).rejects.toThrow(/participant/i);
  });
});

// ── draw offers ──────────────────────────────────────────────────────

describe('draw offers', () => {
  it('offerDraw sets drawOffer to current user', async () => {
    currentUser = host;
    seedGame('ABC234');
    await offerDraw('ABC234');
    expect((docs.get('ABC234') as unknown as MultiplayerGame).drawOffer).toBe(host.uid);
  });

  it('respondToDraw(accept=true) ends game as draw with null winner', async () => {
    currentUser = guest;
    seedGame('ABC234', { drawOffer: host.uid });
    await respondToDraw('ABC234', true);
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.result).toBe('draw');
    expect(stored.winner).toBeNull();
  });

  it('respondToDraw(accept=false) clears drawOffer but keeps game active', async () => {
    currentUser = guest;
    seedGame('ABC234', { drawOffer: host.uid });
    await respondToDraw('ABC234', false);
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.drawOffer).toBeNull();
    expect(stored.status).toBe('active');
  });
});

// ── break requests ───────────────────────────────────────────────────

describe('break requests', () => {
  it('requestBreak sets pauseRequest to current user', async () => {
    currentUser = host;
    seedGame('ABC234');
    await requestBreak('ABC234');
    expect((docs.get('ABC234') as unknown as MultiplayerGame).pauseRequest).toBe(
      host.uid,
    );
  });

  it('respondToBreak(accept=true) clears pauseRequest, game stays active', async () => {
    currentUser = guest;
    seedGame('ABC234', { pauseRequest: host.uid });
    await respondToBreak('ABC234', true);
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.pauseRequest).toBeNull();
    expect(stored.status).toBe('active');
  });

  it('respondToBreak(accept=false) forfeits the responder', async () => {
    currentUser = guest;
    seedGame('ABC234', { pauseRequest: host.uid });
    await respondToBreak('ABC234', false);
    const stored = docs.get('ABC234') as unknown as MultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.result).toBe('resigned');
    expect(stored.winner).toBe(host.uid);
  });
});

// ── listenToGame ─────────────────────────────────────────────────────

describe('listenToGame', () => {
  it('invokes the callback with the current doc and returns an unsubscribe function', () => {
    seedGame('ABC234');
    const cb = jest.fn();
    const unsub = listenToGame('ABC234', cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ code: 'ABC234' });
    expect(typeof unsub).toBe('function');
  });

  it('invokes the callback with null when the doc does not exist', () => {
    const cb = jest.fn();
    listenToGame('MISSNG', cb);
    expect(cb).toHaveBeenCalledWith(null);
  });
});

// ── getMyGames ───────────────────────────────────────────────────────

describe('getMyGames', () => {
  it('returns waiting + active games ordered by lastMoveAt desc', async () => {
    seedGame('OLD111', {
      players: [host.uid],
      status: 'active',
      lastMoveAt: '2026-01-01T00:00:00.000Z',
    });
    seedGame('NEW222', {
      players: [host.uid],
      status: 'waiting',
      lastMoveAt: '2026-03-01T00:00:00.000Z',
    });
    seedGame('DONE33', {
      players: [host.uid],
      status: 'finished',
      lastMoveAt: '2026-04-01T00:00:00.000Z',
    });

    const result = await getMyGames(host.uid);
    expect(result.map((g) => g.code)).toEqual(['NEW222', 'OLD111']);
  });

  it('returns empty list when user has no games', async () => {
    const result = await getMyGames('nobody');
    expect(result).toEqual([]);
  });
});

// ── cleanupFinishedGames ─────────────────────────────────────────────

describe('cleanupFinishedGames', () => {
  it('deletes finished games older than 30 days', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    seedGame('OLD111', {
      players: [host.uid],
      status: 'finished',
      lastMoveAt: oldDate,
    });
    seedGame('NEW222', {
      players: [host.uid],
      status: 'finished',
      lastMoveAt: recentDate,
    });

    await cleanupFinishedGames(host.uid);

    expect(docs.has('OLD111')).toBe(false);
    expect(docs.has('NEW222')).toBe(true);
  });

  it('never throws even when Firestore errors', async () => {
    firestoreInstance.collection.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(cleanupFinishedGames(host.uid)).resolves.toBeUndefined();
  });
});

// ── helpers ──────────────────────────────────────────────────────────

describe('getOpponentUid', () => {
  const makeGame = (hUid: string, gUid: string | null): MultiplayerGame =>
    ({
      host: { uid: hUid, displayName: 'H' },
      guest: gUid ? { uid: gUid, displayName: 'G' } : null,
    } as unknown as MultiplayerGame);

  it('returns guest uid when called with host uid', () => {
    expect(getOpponentUid(makeGame('a', 'b'), 'a')).toBe('b');
  });

  it('returns host uid when called with guest uid', () => {
    expect(getOpponentUid(makeGame('a', 'b'), 'b')).toBe('a');
  });

  it('returns empty string when there is no guest yet', () => {
    expect(getOpponentUid(makeGame('a', null), 'a')).toBe('');
  });
});

describe('isMyTurn', () => {
  it('returns true when game.turn matches my uid', () => {
    expect(isMyTurn({ turn: 'a' } as unknown as MultiplayerGame, 'a')).toBe(true);
  });

  it('returns false when game.turn differs', () => {
    expect(isMyTurn({ turn: 'b' } as unknown as MultiplayerGame, 'a')).toBe(false);
  });
});
