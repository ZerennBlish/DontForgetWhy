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

const kvStore = new Map<string, string>();
jest.mock('../src/services/database', () => ({
  kvGet: jest.fn((key: string) => kvStore.get(key) ?? null),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GameSoundsModule = typeof import('../src/utils/gameSounds');
type ExpoAudioModule = typeof import('expo-audio');

function loadFreshModule(): { mod: GameSoundsModule; audio: ExpoAudioModule } {
  let mod!: GameSoundsModule;
  let audio!: ExpoAudioModule;
  jest.isolateModules(() => {
    audio = require('expo-audio');
    mod = require('../src/utils/gameSounds');
  });
  return { mod, audio };
}

beforeEach(() => {
  kvStore.clear();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Player pool behavior
// ---------------------------------------------------------------------------

describe('playGameSound — player pool', () => {
  it('creates a player on first call for a sound name', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('reuses the same player on subsequent calls for the same sound name', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    await mod.playGameSound('tap');
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('calls seekTo(0) then play() on every call', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('gameWin');
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;

    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(1);

    // Second call — seekTo and play should each fire again on the same player.
    await mod.playGameSound('gameWin');
    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('seekTo is called before play (replay-from-start ordering)', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    const seekOrder = player.seekTo.mock.invocationCallOrder[0];
    const playOrder = player.play.mock.invocationCallOrder[0];
    expect(seekOrder).toBeLessThan(playOrder);
  });

  it('different sound names get different player instances', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    await mod.playGameSound('gameWin');
    await mod.playGameSound('pickUp');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(3);

    const results = (audio.createAudioPlayer as jest.Mock).mock.results;
    const p1 = results[0].value as MockPlayer;
    const p2 = results[1].value as MockPlayer;
    const p3 = results[2].value as MockPlayer;
    expect(p1).not.toBe(p2);
    expect(p2).not.toBe(p3);
    expect(p1).not.toBe(p3);
  });
});

// ---------------------------------------------------------------------------
// Disabled-state behavior
// ---------------------------------------------------------------------------

describe('playGameSound — disabled', () => {
  it('does nothing when gameSoundsEnabled is false', async () => {
    kvStore.set('gameSoundsEnabled', 'false');
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('plays normally when gameSoundsEnabled key is missing (default = true)', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('plays normally when gameSoundsEnabled is anything other than "false"', async () => {
    kvStore.set('gameSoundsEnabled', 'true');
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Failure modes — must not crash
// ---------------------------------------------------------------------------

describe('playGameSound — failure modes', () => {
  it('createAudioPlayer throwing does not crash', async () => {
    const { mod, audio } = loadFreshModule();
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('codec init failed');
    });
    await expect(mod.playGameSound('tap')).resolves.not.toThrow();
  });

  it('player.play() throwing does not crash', async () => {
    const { mod, audio } = loadFreshModule();
    const broken = makeMockPlayer();
    broken.play.mockImplementationOnce(() => {
      throw new Error('playback failed');
    });
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => broken);
    await expect(mod.playGameSound('tap')).resolves.not.toThrow();
  });

  it('does not cache a null player — next call retries creation', async () => {
    const { mod, audio } = loadFreshModule();
    (audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('transient failure');
    });
    await mod.playGameSound('tap');
    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Volume wiring
// ---------------------------------------------------------------------------

describe('playGameSound — volume', () => {
  it('sets tap volume to 0.4', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('tap');
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    expect(player.volume).toBe(0.4);
  });

  it('sets gameWin volume to 0.5', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('gameWin');
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    expect(player.volume).toBe(0.5);
  });

  it('sets pickUp volume to 0.25', async () => {
    const { mod, audio } = loadFreshModule();
    await mod.playGameSound('pickUp');
    const player = (audio.createAudioPlayer as jest.Mock).mock.results[0].value as MockPlayer;
    expect(player.volume).toBe(0.25);
  });
});

// ---------------------------------------------------------------------------
// refreshGameSoundsSetting
// ---------------------------------------------------------------------------

describe('refreshGameSoundsSetting', () => {
  it('re-reads kv store and enables sounds when stored value changes from "false" to missing', async () => {
    kvStore.set('gameSoundsEnabled', 'false');
    const { mod, audio } = loadFreshModule();

    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();

    kvStore.delete('gameSoundsEnabled');
    await mod.refreshGameSoundsSetting();

    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('re-reads kv store and disables sounds when stored value changes to "false"', async () => {
    const { mod, audio } = loadFreshModule();

    await mod.playGameSound('tap');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);

    kvStore.set('gameSoundsEnabled', 'false');
    await mod.refreshGameSoundsSetting();

    await mod.playGameSound('gameWin');
    // Still only the first call — second was blocked by the refreshed disabled flag.
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });
});
