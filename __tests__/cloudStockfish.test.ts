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
});

afterAll(() => {
  global.fetch = originalFetch;
});

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
    // Position where white can castle kingside.
    const game = new Chess(
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    );
    expect(uciToSan(game, 'e1g1')).toBe('O-O');
  });

  it('returns null for invalid UCI (illegal move)', () => {
    const game = new Chess();
    // Jumping a pawn off the board isn't legal.
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

  it('returns null when offline', async () => {
    checkConnectivityMock.mockResolvedValue(false);
    const result = await getCloudMove(startingFen);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the Lichess cloud-eval endpoint with the encoded FEN', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({
        fen: startingFen,
        knodes: 13683,
        depth: 40,
        pvs: [{ moves: 'e2e4 e7e5 g1f3', cp: 23 }],
      }),
    );

    await getCloudMove(startingFen);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://lichess.org/api/cloud-eval');
    expect(url).toContain(`fen=${encodeURIComponent(startingFen)}`);
    expect(url).toContain('multiPv=1');
  });

  it('returns the SAN of the first PV move when the API returns a valid response', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({
        fen: startingFen,
        knodes: 13683,
        depth: 40,
        pvs: [{ moves: 'e2e4 e7e5 g1f3', cp: 23 }],
      }),
    );
    const result = await getCloudMove(startingFen);
    expect(result).toBe('e4');
  });

  it('returns null on HTTP 404 (position not in cloud database)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(mockResponse({}, { status: 404 }));
    const result = await getCloudMove(startingFen);
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
    const result = await getCloudMove(startingFen);
    expect(result).toBeNull();
  });

  it('returns null when the response body has no pvs', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({ fen: startingFen, knodes: 0, depth: 0 }),
    );
    const result = await getCloudMove(startingFen);
    expect(result).toBeNull();
  });

  it('returns null when the response body has an empty pvs array', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(
      mockResponse({ fen: startingFen, knodes: 0, depth: 0, pvs: [] }),
    );
    const result = await getCloudMove(startingFen);
    expect(result).toBeNull();
  });

  it('returns null when json() throws (malformed JSON)', async () => {
    checkConnectivityMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as Response);
    const result = await getCloudMove(startingFen);
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
    const result = await getCloudMove(startingFen);
    expect(result).toBeNull();
  });
});
