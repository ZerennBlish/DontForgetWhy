// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

type MockPlayer = {
  volume: number;
  play: jest.Mock;
  seekTo: jest.Mock;
  addListener: jest.Mock;
};

function makeMockPlayer(): MockPlayer {
  return {
    volume: 0,
    play: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

jest.mock('expo-audio', () => {
  const createAudioPlayer = jest.fn(() => makeMockPlayer());
  return {
    __esModule: true,
    createAudioPlayer,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SoundFeedbackModule = typeof import('../src/utils/soundFeedback');
type ExpoAudioModule = typeof import('expo-audio');

function loadFreshModule(): { mod: SoundFeedbackModule; audio: ExpoAudioModule } {
  let mod!: SoundFeedbackModule;
  let audio!: ExpoAudioModule;
  jest.isolateModules(() => {
    audio = require('expo-audio');
    mod = require('../src/utils/soundFeedback');
  });
  return { mod, audio };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Player pool behavior
// ---------------------------------------------------------------------------

describe('playChirp — player pool', () => {
  it('creates a player on first call', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playChirp();
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('reuses the same player on subsequent calls', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playChirp();
    await mod.playChirp();
    await mod.playChirp();
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('calls seekTo(0) then play() on every call', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playChirp();
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;

    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(1);

    await mod.playChirp();
    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('seekTo is called before play (replay-from-start ordering)', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playChirp();
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    const seekOrder = player.seekTo.mock.invocationCallOrder[0];
    const playOrder = player.play.mock.invocationCallOrder[0];
    expect(seekOrder).toBeLessThan(playOrder);
  });

  it('awaits seekTo before calling play', async () => {
    const { mod, audio } = loadFreshModule();

    let resolveSeek!: () => void;
    const seekPromise = new Promise<void>((resolve) => {
      resolveSeek = resolve;
    });

    const player = makeMockPlayer();
    player.seekTo.mockImplementationOnce(() => seekPromise);
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => player);

    const chirpPromise = mod.playChirp();

    // Yield microtasks. If seekTo weren't awaited, play() would fire synchronously
    // right after seekTo() — so at this point play should not yet have been called.
    await Promise.resolve();
    await Promise.resolve();
    expect(player.play).not.toHaveBeenCalled();

    resolveSeek();
    await chirpPromise;
    expect(player.play).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Volume wiring
// ---------------------------------------------------------------------------

describe('playChirp — volume', () => {
  it('sets chirp volume to 0.3', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playChirp();
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    expect(player.volume).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// Failure modes — must not crash
// ---------------------------------------------------------------------------

describe('playChirp — failure modes', () => {
  it('createAudioPlayer throwing does not crash', async () => {
    const { mod, audio } = loadFreshModule();
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('codec init failed');
    });
    await expect(mod.playChirp()).resolves.not.toThrow();
  });

  it('player.play() throwing does not crash', async () => {
    const { mod, audio } = loadFreshModule();
    const broken = makeMockPlayer();
    broken.play.mockImplementationOnce(() => {
      throw new Error('playback failed');
    });
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => broken);
    await expect(mod.playChirp()).resolves.not.toThrow();
  });

  it('does not cache a null player — next call retries creation', async () => {
    const { mod, audio } = loadFreshModule();
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('transient failure');
    });
    await mod.playChirp();
    await mod.playChirp();
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
  });
});
