jest.mock('../src/utils/connectivity', () => ({
  __esModule: true,
  checkConnectivity: jest.fn(),
}));

import { Chess } from 'chess.js';
import { getCloudMove, uciToSan } from '../src/services/cloudStockfish';
import { checkConnectivity } from '../src/utils/connectivity';

const checkConnectivityMock = checkConnectivity as jest.Mock;

const originalFetch = global.fetch;
let fetchMock: jest.Mock;
let randomSpy: jest.SpyInstance | null;

function mockResponse(
  body: unknown,
  opts: { status?: number; ok?: boolean } = {},
): Response {
  const status = opts.status ?? 200;
  const ok = opts.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  checkConnectivityMock.mockReset();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  randomSpy = null;
});

afterEach(() => {
  if (randomSpy) {
    randomSpy.mockRestore();
    randomSpy = null;
  }
});

afterAll(() => {
  global.fetch = originalFetch;
});

const BEST_ONLY = { minRank: 0, maxRank: 0 };

// ── uciToSan ──────────────────────────────────────────────────────

describe('uciToSan', () => {
  it('converts "e2e4" to "e4" from the starting position', () => {
    const game = new Chess();
    expect(uciToSan(game, 'e2e4')).toBe('e4');
  });

  it('converts a knight move "g1f3" to "Nf3"', () => {
    const game = new Chess();
    expect(uciToSan(game, 'g1f3')).toBe('Nf3');
  });

  it('handles promotion "e7e8q" on a pre-promotion position', () => {
    // White pawn on e7 ready to promote — black king on a8 so e8 is free.
    const game = new Chess('k7/4P3/8/8/8/8/8/4K3 w - - 0 1');
    const san = uciToSan(game, 'e7e8q');
    expect(san).not.toBeNull();
    expect(san).toMatch(/^e8=Q/);
  });

  it('handles kingside castling "e1g1"', () => {
    const game = new Chess(
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    );
    expect(uciToSan(game, 'e1g1')).toBe('O-O');
  });

  it('returns null for invalid UCI (illegal move)', () => {
    const game = new Chess();
    expect(uciToSan(game, 'e2e6')).toBeNull();
  });

  it('returns null for a malformed UCI string', () => {
    const game = new Chess();
    expect(uciToSan(game, 'xx')).toBeNull();
    expect(uciToSan(game, '')).toBeNull();
  });

  it('does not mutate the position after a successful conversion', () => {
    const game = new Chess();
    const fenBefore = game.fen();
    uciToSan(game, 'e2e4');
    expect(game.fen()).toBe(fenBefore);
  });
});

// ── getCloudMove ──────────────────────────────────────────────────

describe('getCloudMove', () => {
  const startingFen =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // 5 distinct first-moves so we can tell which rank was picked.
  // From the starting position:
  //   rank 0: e2e4 → "e4"
  //   rank 1: d2d4 → "d4"
  //   rank 2: g1f3 → "Nf3"
  //   rank 3: c2c4 → "c4"
  //   rank 4: b1c3 → "Nc3"
  const fivePvResponse = {
    fen: startingFen,
    knodes: 13683,
    depth: 40,
    pvs: [
      { moves: 'e2e4 e7e5', cp: 30 },
      { moves: 'd2d4 d7d5', cp: 25 },
      { moves: 'g1f3 g8f6', cp: 20 },
      { moves: 'c2c4 c7c5', cp: 15 },
      { moves: 'b1c3 b8c6', cp: 10 },
    ],
  };

  it('returns null when offline', async () => {
    checkConnectivityMock.mockResolvedValue(false);
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the Lichess cloud-eval endpoint with multiPv=5 and the encoded FEN', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse(fivePvResponse));

    await getCloudMove(startingFen, BEST_ONLY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://lichess.org/api/cloud-eval');
    expect(url).toContain(`fen=${encodeURIComponent(startingFen)}`);
    expect(url).toContain('multiPv=5');
  });

  it('always returns the best move when pickRange is { 0, 0 }', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse(fivePvResponse));
    // Even with Math.random() at its extremes, rank must be 0.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const result = await getCloudMove(startingFen, { minRank: 0, maxRank: 0 });
    expect(result).toBe('e4');
  });

  it('picks the minRank bound when Math.random returns 0 (pickRange 2-4)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse(fivePvResponse));
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await getCloudMove(startingFen, { minRank: 2, maxRank: 4 });
    // rank 2 → g1f3 → "Nf3"
    expect(result).toBe('Nf3');
  });

  it('picks the maxRank bound when Math.random returns 0.9999 (pickRange 2-4)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse(fivePvResponse));
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const result = await getCloudMove(startingFen, { minRank: 2, maxRank: 4 });
    // rank 4 → b1c3 → "Nc3"
    expect(result).toBe('Nc3');
  });

  it('clamps maxRank down when the cloud returns fewer PVs than requested', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    // Only 3 PVs available — rank indices 0..2.
    fetchMock.mockResolvedValue(
      mockResponse({
        fen: startingFen,
        knodes: 0,
        depth: 0,
        pvs: [
          { moves: 'e2e4' },
          { moves: 'd2d4' },
          { moves: 'g1f3' },
        ],
      }),
    );
    // Requested range 2..4 — should clamp to 2..2 → always rank 2.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const result = await getCloudMove(startingFen, { minRank: 2, maxRank: 4 });
    expect(result).toBe('Nf3');
  });

  it('clamps minRank down when it exceeds the available PVs', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    // Only 1 PV — both bounds collapse to 0.
    fetchMock.mockResolvedValue(
      mockResponse({
        fen: startingFen,
        knodes: 0,
        depth: 0,
        pvs: [{ moves: 'e2e4' }],
      }),
    );
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = await getCloudMove(startingFen, { minRank: 3, maxRank: 4 });
    expect(result).toBe('e4');
  });

  it('returns null on HTTP 404 (position not in cloud database)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse({}, { status: 404 }));
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });

  it('returns null on a timeout / aborted fetch', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        }),
    );
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });

  it('returns null when the response body has no pvs', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({ fen: startingFen, knodes: 0, depth: 0 }),
    );
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });

  it('returns null when the response body has an empty pvs array', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({ fen: startingFen, knodes: 0, depth: 0, pvs: [] }),
    );
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });

  it('returns null when json() throws (malformed JSON)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as Response);
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });

  it('returns null when the first PV move is not legal in the supplied FEN', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({
        fen: startingFen,
        knodes: 0,
        depth: 0,
        pvs: [{ moves: 'a8a1' }],
      }),
    );
    const result = await getCloudMove(startingFen, BEST_ONLY);
    expect(result).toBeNull();
  });
});
