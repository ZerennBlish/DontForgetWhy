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
      if (!existing) throw new Error('Doc ' + code + ' not found');
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

const arrayUnionMock = jest.fn((...values: unknown[]) => ({
  __op: 'arrayUnion',
  values,
}));

type WhereTag = { __c: 'where'; field: string; op: string; value: unknown };
type OrderByTag = { __c: 'orderBy'; field: string; direction: 'asc' | 'desc' };
type ConstraintTag = WhereTag | OrderByTag;

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => firestoreInstance),
  collection: jest.fn((_fs: unknown, name: string) =>
    firestoreInstance.collection(name),
  ),
  doc: jest.fn((coll: MockCollection, id: string) => coll.doc(id)),
  getDoc: jest.fn(async (ref: ReturnType<typeof makeDocRef>) => ref.get()),
  getDocs: jest.fn(async (q: MockCollection) => q.get()),
  setDoc: jest.fn(async (
    ref: ReturnType<typeof makeDocRef>,
    payload: DocData,
  ) => ref.set(payload)),
  updateDoc: jest.fn(async (
    ref: ReturnType<typeof makeDocRef>,
    updates: DocData,
  ) => ref.update(updates)),
  query: jest.fn((coll: MockCollection, ...constraints: ConstraintTag[]) => {
    let chain = coll;
    for (const c of constraints) {
      if (c.__c === 'where') chain = chain.where(c.field, c.op, c.value);
      else if (c.__c === 'orderBy') chain = chain.orderBy(c.field, c.direction);
    }
    return chain;
  }),
  where: jest.fn((field: string, op: string, value: unknown): WhereTag => ({
    __c: 'where',
    field,
    op,
    value,
  })),
  orderBy: jest.fn((
    field: string,
    direction: 'asc' | 'desc' = 'asc',
  ): OrderByTag => ({
    __c: 'orderBy',
    field,
    direction,
  })),
  arrayUnion: arrayUnionMock,
  runTransaction: jest.fn(async (_fs: unknown, cb: (t: unknown) => Promise<unknown>) => {
    const transaction = {
      get: jest.fn(async (ref: ReturnType<typeof makeDocRef>) => ref.get()),
      update: jest.fn((ref: ReturnType<typeof makeDocRef>, updates: DocData) => {
        ref.update(updates);
      }),
      set: jest.fn((ref: ReturnType<typeof makeDocRef>, payload: DocData) => {
        ref.set(payload);
      }),
    };
    return cb(transaction);
  }),
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

// ── triviaBank mocks ─────────────────────────────────────────────────

const mockQuestions = [
  { id: 'q1', category: 'general' as const, subcategory: 'generalKnowledge' as const, type: 'multiple' as const, difficulty: 'easy' as const, question: 'Q1?', correctAnswer: 'A', incorrectAnswers: ['B', 'C', 'D'] },
  { id: 'q2', category: 'general' as const, subcategory: 'generalKnowledge' as const, type: 'multiple' as const, difficulty: 'easy' as const, question: 'Q2?', correctAnswer: 'B', incorrectAnswers: ['A', 'C', 'D'] },
  { id: 'q3', category: 'general' as const, subcategory: 'generalKnowledge' as const, type: 'multiple' as const, difficulty: 'easy' as const, question: 'Q3?', correctAnswer: 'C', incorrectAnswers: ['A', 'B', 'D'] },
];

jest.mock('../src/data/triviaBank', () => ({
  __esModule: true,
  getAllQuestions: jest.fn(() => mockQuestions),
  getQuestionsForCategory: jest.fn(() => mockQuestions),
  getQuestionsForSubcategory: jest.fn(() => mockQuestions),
}));

// ── Imports under test ───────────────────────────────────────────────

import {
  createTriviaGame,
  joinTriviaGame,
  startTriviaGame,
  submitAnswer,
  advanceToNextQuestion,
  leaveTriviaGame,
  getTriviaGames,
  type TriviaMultiplayerGame,
} from '../src/services/multiplayerTrivia';

// ── Test fixtures ────────────────────────────────────────────────────

const host: MockUser = { uid: 'host-1', displayName: 'Host', email: 'h@x.com' };
const p2: MockUser = { uid: 'p2', displayName: 'P2', email: 'p2@x.com' };
const p3: MockUser = { uid: 'p3', displayName: 'P3', email: 'p3@x.com' };

function seedTriviaGame(
  code: string,
  overrides: Partial<TriviaMultiplayerGame> = {},
): TriviaMultiplayerGame {
  const now = '2026-01-01T00:00:00.000Z';
  const game: TriviaMultiplayerGame = {
    code,
    type: 'trivia',
    host: { uid: host.uid, displayName: 'Host' },
    players: [host.uid],
    triviaPlayers: [{ uid: host.uid, displayName: 'Host', score: 0 }],
    status: 'waiting',
    phase: 'lobby',
    category: 'general',
    subcategory: null,
    questionCount: 3,
    questions: [],
    currentQuestionIndex: 0,
    activePlayerIndex: 0,
    attemptsThisQuestion: [],
    rotationStartIndex: 0,
    lastAnswer: null,
    winner: null,
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
  arrayUnionMock.mockClear();
});

// ── createTriviaGame ─────────────────────────────────────────────────

describe('createTriviaGame', () => {
  it('throws if not signed in', async () => {
    currentUser = null;
    await expect(createTriviaGame('general')).rejects.toThrow(/not signed in/i);
  });

  it('throws if not Pro', async () => {
    currentUser = host;
    proStatus = false;
    await expect(createTriviaGame('general')).rejects.toThrow(/pro required/i);
  });

  it('throws if 5 or more active games', async () => {
    currentUser = host;
    proStatus = true;
    for (let i = 0; i < 5; i++) {
      seedTriviaGame('G0' + i, { players: [host.uid], status: 'active' });
    }
    await expect(createTriviaGame('general')).rejects.toThrow(/maximum 5/i);
  });

  it('writes a doc with the correct shape', async () => {
    currentUser = host;
    proStatus = true;
    const { code } = await createTriviaGame('general', null, 10);
    const stored = docs.get(code) as unknown as TriviaMultiplayerGame;
    expect(stored.type).toBe('trivia');
    expect(stored.host.uid).toBe(host.uid);
    expect(stored.players).toEqual([host.uid]);
    expect(stored.triviaPlayers).toHaveLength(1);
    expect(stored.triviaPlayers[0].score).toBe(0);
    expect(stored.status).toBe('waiting');
    expect(stored.phase).toBe('lobby');
    expect(stored.category).toBe('general');
    expect(stored.subcategory).toBeNull();
    expect(stored.questionCount).toBe(10);
    expect(stored.questions).toEqual([]);
  });
});

// ── joinTriviaGame ───────────────────────────────────────────────────

describe('joinTriviaGame', () => {
  it('throws if not signed in', async () => {
    currentUser = null;
    proStatus = true;
    seedTriviaGame('ABC234');
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/not signed in/i);
  });

  it('throws if not Pro', async () => {
    currentUser = p2;
    proStatus = false;
    seedTriviaGame('ABC234');
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/pro required/i);
  });

  it('throws if joiner already has 5 active games', async () => {
    currentUser = p2;
    proStatus = true;
    for (let i = 0; i < 5; i++) {
      seedTriviaGame('HAVE0' + i, {
        players: [p2.uid],
        status: 'active',
      });
    }
    seedTriviaGame('ABC234');
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/maximum 5/i);
  });

  it('throws for invalid code', async () => {
    currentUser = p2;
    proStatus = true;
    await expect(joinTriviaGame('NOPEXX')).rejects.toThrow(/not found/i);
  });

  it('throws if not a trivia game', async () => {
    currentUser = p2;
    proStatus = true;
    seedTriviaGame('ABC234', { type: 'chess' as unknown as 'trivia' });
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/not a trivia game/i);
  });

  it('throws if game already started', async () => {
    currentUser = p2;
    proStatus = true;
    seedTriviaGame('ABC234', { status: 'active' });
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/already started/i);
  });

  it('throws if game is full', async () => {
    currentUser = p2;
    proStatus = true;
    seedTriviaGame('ABC234', {
      triviaPlayers: [
        { uid: 'a', displayName: 'A', score: 0 },
        { uid: 'b', displayName: 'B', score: 0 },
        { uid: 'c', displayName: 'C', score: 0 },
        { uid: 'd', displayName: 'D', score: 0 },
      ],
      players: ['a', 'b', 'c', 'd'],
    });
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/game is full/i);
  });

  it('throws if already in game', async () => {
    currentUser = host;
    proStatus = true;
    seedTriviaGame('ABC234');
    await expect(joinTriviaGame('ABC234')).rejects.toThrow(/already in this game/i);
  });

  it('adds player to triviaPlayers and players array', async () => {
    currentUser = p2;
    proStatus = true;
    seedTriviaGame('ABC234');
    const result = await joinTriviaGame('ABC234');
    expect(result.players).toEqual([host.uid, p2.uid]);
    expect(result.triviaPlayers).toHaveLength(2);
    expect(result.triviaPlayers[1].uid).toBe(p2.uid);
    expect(result.triviaPlayers[1].score).toBe(0);
  });

  it('normalizes the code (trim + uppercase)', async () => {
    currentUser = p2;
    proStatus = true;
    seedTriviaGame('ABC234');
    await expect(joinTriviaGame('  abc234 ')).resolves.toBeDefined();
  });
});

// ── startTriviaGame ──────────────────────────────────────────────────

describe('startTriviaGame', () => {
  it('throws if not host', async () => {
    currentUser = p2;
    seedTriviaGame('ABC234', {
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
    });
    await expect(startTriviaGame('ABC234')).rejects.toThrow(/only the host/i);
  });

  it('throws if fewer than 2 players', async () => {
    currentUser = host;
    seedTriviaGame('ABC234');
    await expect(startTriviaGame('ABC234')).rejects.toThrow(/at least 2/i);
  });

  it('throws if game already started', async () => {
    currentUser = host;
    seedTriviaGame('ABC234', {
      status: 'active',
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
    });
    await expect(startTriviaGame('ABC234')).rejects.toThrow(/already started/i);
  });

  it('sets status active, phase question, loads questions', async () => {
    currentUser = host;
    seedTriviaGame('ABC234', {
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
      questionCount: 3,
    });
    await startTriviaGame('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.status).toBe('active');
    expect(stored.phase).toBe('question');
    expect(stored.questions.length).toBeGreaterThan(0);
    expect(stored.currentQuestionIndex).toBe(0);
    expect(stored.activePlayerIndex).toBe(0);
  });
});

// ── submitAnswer ─────────────────────────────────────────────────────

describe('submitAnswer', () => {
  function seedActiveGame(): TriviaMultiplayerGame {
    return seedTriviaGame('ABC234', {
      status: 'active',
      phase: 'question',
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
      questions: [mockQuestions[0]],
      currentQuestionIndex: 0,
      activePlayerIndex: 0,
    });
  }

  it('throws if not your turn', async () => {
    currentUser = p2;
    seedActiveGame();
    await expect(submitAnswer('ABC234', 'A')).rejects.toThrow(/not your turn/i);
  });

  it('increments score on correct answer and moves to result phase', async () => {
    currentUser = host;
    seedActiveGame();
    await submitAnswer('ABC234', 'A');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.phase).toBe('result');
    expect(stored.lastAnswer?.correct).toBe(true);
    expect(stored.triviaPlayers[0].score).toBe(1);
  });

  it('on wrong answer, advances activePlayerIndex to a player who has not attempted', async () => {
    currentUser = host;
    seedActiveGame();
    await submitAnswer('ABC234', 'WRONG');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.phase).toBe('result');
    expect(stored.lastAnswer?.correct).toBe(false);
    expect(stored.activePlayerIndex).toBe(1);
    expect(stored.attemptsThisQuestion).toContain(host.uid);
  });
});

// ── advanceToNextQuestion ────────────────────────────────────────────

describe('advanceToNextQuestion', () => {
  function seedResultPhase(overrides: Partial<TriviaMultiplayerGame> = {}): TriviaMultiplayerGame {
    return seedTriviaGame('ABC234', {
      status: 'active',
      phase: 'result',
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 1 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
      questions: [mockQuestions[0], mockQuestions[1]],
      currentQuestionIndex: 0,
      lastAnswer: { uid: host.uid, answer: 'A', correct: true, correctAnswer: 'A' },
      attemptsThisQuestion: [host.uid],
      rotationStartIndex: 0,
      ...overrides,
    });
  }

  it('throws if not host', async () => {
    currentUser = p2;
    seedResultPhase();
    await expect(advanceToNextQuestion('ABC234')).rejects.toThrow(/only the host/i);
  });

  it('advances to next question and rotates active player', async () => {
    currentUser = host;
    seedResultPhase();
    await advanceToNextQuestion('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.currentQuestionIndex).toBe(1);
    expect(stored.phase).toBe('question');
    expect(stored.activePlayerIndex).toBe(1);
    expect(stored.rotationStartIndex).toBe(1);
    expect(stored.attemptsThisQuestion).toEqual([]);
    expect(stored.lastAnswer).toBeNull();
  });

  it('ends game when last question completes', async () => {
    currentUser = host;
    seedResultPhase({
      currentQuestionIndex: 1,
      questions: [mockQuestions[0], mockQuestions[1]],
    });
    await advanceToNextQuestion('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.phase).toBe('final');
    expect(stored.winner).toBe(host.uid);
  });

  it('returns to question phase without advancing on wrong + someone untried', async () => {
    currentUser = host;
    seedResultPhase({
      lastAnswer: { uid: host.uid, answer: 'X', correct: false, correctAnswer: 'A' },
      attemptsThisQuestion: [host.uid],
    });
    await advanceToNextQuestion('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.phase).toBe('question');
    expect(stored.currentQuestionIndex).toBe(0);
    expect(stored.lastAnswer).toBeNull();
  });
});

// ── leaveTriviaGame ──────────────────────────────────────────────────

describe('leaveTriviaGame', () => {
  it('throws if not a participant', async () => {
    currentUser = { uid: 'stranger', displayName: null, email: null };
    seedTriviaGame('ABC234');
    await expect(leaveTriviaGame('ABC234')).rejects.toThrow(/participant/i);
  });

  it('host aborting a waiting lobby marks game finished', async () => {
    currentUser = host;
    seedTriviaGame('ABC234');
    await leaveTriviaGame('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.winner).toBeNull();
  });

  it('non-host leaving a waiting lobby removes them from rosters', async () => {
    currentUser = p2;
    seedTriviaGame('ABC234', {
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
    });
    await leaveTriviaGame('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.players).toEqual([host.uid]);
    expect(stored.triviaPlayers).toHaveLength(1);
    expect(stored.status).toBe('waiting');
  });

  it('active game with only one remaining ends as that player winning', async () => {
    currentUser = p2;
    seedTriviaGame('ABC234', {
      status: 'active',
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
      ],
      players: [host.uid, p2.uid],
    });
    await leaveTriviaGame('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.status).toBe('finished');
    expect(stored.winner).toBe(host.uid);
  });

  it('host leaving an active 3-player game promotes a new host', async () => {
    currentUser = host;
    seedTriviaGame('ABC234', {
      status: 'active',
      phase: 'question',
      triviaPlayers: [
        { uid: host.uid, displayName: 'Host', score: 0 },
        { uid: p2.uid, displayName: 'P2', score: 0 },
        { uid: p3.uid, displayName: 'P3', score: 0 },
      ],
      players: [host.uid, p2.uid, p3.uid],
    });
    await leaveTriviaGame('ABC234');
    const stored = docs.get('ABC234') as unknown as TriviaMultiplayerGame;
    expect(stored.status).toBe('active');
    expect(stored.host.uid).toBe(p2.uid);
    expect(stored.triviaPlayers).toHaveLength(2);
  });
});

// ── getTriviaGames ───────────────────────────────────────────────────

describe('getTriviaGames', () => {
  it('returns only trivia games for the user', async () => {
    seedTriviaGame('TRI001', { players: [host.uid], status: 'waiting' });
    seedTriviaGame('TRI002', {
      players: [host.uid],
      status: 'active',
      type: 'chess' as unknown as 'trivia',
    });
    const result = await getTriviaGames(host.uid);
    const codes = result.map((g) => g.code);
    expect(codes).toContain('TRI001');
    expect(codes).not.toContain('TRI002');
  });

  it('returns empty list when user has no games', async () => {
    const result = await getTriviaGames('nobody');
    expect(result).toEqual([]);
  });
});
