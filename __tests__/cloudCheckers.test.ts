// `virtual: true` lets the mock register before the package is installed
// (the lockfile is regenerated outside this WSL session). After install,
// the flag is harmless — the factory still wins over the real module.
jest.mock('@react-native-firebase/app-check', () => ({
  __esModule: true,
  default: () => ({
    getToken: jest.fn().mockResolvedValue({ token: 'test-appcheck-token' }),
  }),
}), { virtual: true });

import { getCloudCheckersMove } from '../src/services/cloudCheckers';

jest.mock('../src/utils/connectivity', () => ({
  checkConnectivity: jest.fn(),
}));
const { checkConnectivity } = require('../src/utils/connectivity');

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const INITIAL_BOARD = [
  [null,{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false}],
  [{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false},null],
  [null,{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false},null,{color:'b',king:false}],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false},null],
  [null,{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false}],
  [{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false},null,{color:'r',king:false},null],
];

const MOCK_CLOUD_RESPONSE = {
  moves: [
    { move: { from: [5, 0], to: [4, 1], captured: [], crowned: false }, score: 15 },
    { move: { from: [5, 2], to: [4, 1], captured: [], crowned: false }, score: 10 },
    { move: { from: [5, 2], to: [4, 3], captured: [], crowned: false }, score: 8 },
    { move: { from: [5, 4], to: [4, 3], captured: [], crowned: false }, score: 5 },
    { move: { from: [5, 4], to: [4, 5], captured: [], crowned: false }, score: 2 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCloudCheckersMove', () => {
  it('returns null when offline', async () => {
    checkConnectivity.mockResolvedValue(false);
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns a move when online and cloud responds', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_CLOUD_RESPONSE,
    });
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(result).not.toBeNull();
    expect(result!.from).toEqual([5, 0]);
    expect(result!.to).toEqual([4, 1]);
  });

  it('picks from correct rank range', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_CLOUD_RESPONSE,
    });
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 4, maxRank: 4 });
    expect(result).not.toBeNull();
    expect(result!.from).toEqual([5, 4]);
    expect(result!.to).toEqual([4, 5]);
  });

  it('returns null on HTTP error', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(result).toBeNull();
  });

  it('returns null on malformed response', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ moves: [] }),
    });
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(result).toBeNull();
  });

  it('clamps rank range when fewer moves returned', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        moves: [
          { move: { from: [5, 0], to: [4, 1], captured: [], crowned: false }, score: 15 },
          { move: { from: [5, 2], to: [4, 1], captured: [], crowned: false }, score: 10 },
        ],
      }),
    });
    const result = await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 2, maxRank: 4 });
    expect(result).not.toBeNull();
  });

  it('sends correct request body', async () => {
    checkConnectivity.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_CLOUD_RESPONSE,
    });
    await getCloudCheckersMove(INITIAL_BOARD as any, 'r', { minRank: 0, maxRank: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('checkersai');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.turn).toBe('r');
    expect(body.board).toHaveLength(8);
  });
});
