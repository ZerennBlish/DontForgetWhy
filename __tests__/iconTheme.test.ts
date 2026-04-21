// ── Mock kv storage ─────────────────────────────────────────────────
// Module-level state captured by closure so we can reset between tests.
let kvStore: Record<string, string | null> = {};

jest.mock('../src/services/database', () => ({
  __esModule: true,
  kvGet: jest.fn((key: string) => kvStore[key] ?? null),
  kvSet: jest.fn((key: string, value: string) => {
    kvStore[key] = value;
  }),
}));

// ── Mock Pro status ────────────────────────────────────────────────
// Default: user IS Pro (existing tests don't care about gating). Tests
// that exercise the Pro gate override this via `mockReturnValueOnce` or
// by flipping `proUserMock` below.
let proUserMock = true;
jest.mock('../src/services/proStatus', () => ({
  __esModule: true,
  isProUser: jest.fn(() => proUserMock),
}));

// ── Mock the three icon registries ──────────────────────────────────
// Each key resolves to a distinct marker string so branch assertions
// can verify the correct registry was consulted. (fileMock.js collapses
// every real webp require to the same `'test-file-stub'` string, so we
// cannot rely on require() identity — we need these to differ.)
jest.mock('../src/data/appIconAssets', () => ({
  __esModule: true,
  default: {
    alarm: 'APP.alarm',
    bell: 'APP.bell',
    stopwatch: 'APP.stopwatch',
    notepad: 'APP.notepad',
    microphone: 'APP.microphone',
    calendar: 'APP.calendar',
    gamepad: 'APP.gamepad',
    gear: 'APP.gear',
    hammock: 'APP.hammock',
    house: 'APP.house',
    trash: 'APP.trash',
    camera: 'APP.camera',
    couch: 'APP.couch',
    image: 'APP.image',
    paintbrush: 'APP.paintbrush',
    share: 'APP.share',
    flame: 'APP.flame',
    warning: 'APP.warning',
    backArrow: 'APP.backArrow',
    'beach-chair': 'APP.beach-chair',
    palette: 'APP.palette',
    plus: 'APP.plus',
    printer: 'APP.printer',
    pdf: 'APP.pdf',
    vibrate: 'APP.vibrate',
    silent: 'APP.silent',
    closeX: 'APP.closeX',
    paperclip: 'APP.paperclip',
    search: 'APP.search',
    checkmark: 'APP.checkmark',
    save: 'APP.save',
    edit: 'APP.edit',
  },
}));

jest.mock('../src/utils/chromeGameAssets', () => ({
  __esModule: true,
  default: {
    kingLight: 'CHROME.kingLight',
    kingDark: 'CHROME.kingDark',
    queenLight: 'CHROME.queenLight',
    queenDark: 'CHROME.queenDark',
    rookLight: 'CHROME.rookLight',
    rookDark: 'CHROME.rookDark',
    bishopLight: 'CHROME.bishopLight',
    bishopDark: 'CHROME.bishopDark',
    knightLight: 'CHROME.knightLight',
    knightDark: 'CHROME.knightDark',
    pawnLight: 'CHROME.pawnLight',
    pawnDark: 'CHROME.pawnDark',
    checkerLight: 'CHROME.checkerLight',
    checkerLightKing: 'CHROME.checkerLightKing',
    checkerDark: 'CHROME.checkerDark',
    checkerDarkKing: 'CHROME.checkerDarkKing',
    sudoku: 'CHROME.sudoku',
    chart: 'CHROME.chart',
    globe: 'CHROME.globe',
    offlineGlobe: 'CHROME.offlineGlobe',
    star: 'CHROME.star',
    win: 'CHROME.win',
    loss: 'CHROME.loss',
    hourglass: 'CHROME.hourglass',
    smiley: 'CHROME.smiley',
    party: 'CHROME.party',
    quick: 'CHROME.quick',
    chevronLeft: 'CHROME.chevronLeft',
    chevronRight: 'CHROME.chevronRight',
    erase: 'CHROME.erase',
    refresh: 'CHROME.refresh',
    skip: 'CHROME.skip',
    forwardSkip: 'CHROME.forwardSkip',
    backSkip: 'CHROME.backSkip',
    books: 'CHROME.books',
    lightbulb: 'CHROME.lightbulb',
    phone: 'CHROME.phone',
    puzzle: 'CHROME.puzzle',
    wordplay: 'CHROME.wordplay',
  },
}));

jest.mock('../src/utils/toonAppIcons', () => ({
  __esModule: true,
  default: {
    alarm: 'TOON.alarm',
    bell: 'TOON.bell',
    stopwatch: 'TOON.stopwatch',
    notepad: 'TOON.notepad',
    microphone: 'TOON.microphone',
    calendar: 'TOON.calendar',
    gamepad: 'TOON.gamepad',
    gear: 'TOON.gear',
    trash: 'TOON.trash',
    camera: 'TOON.camera',
    image: 'TOON.image',
    paintbrush: 'TOON.paintbrush',
    palette: 'TOON.palette',
    share: 'TOON.share',
    flame: 'TOON.flame',
    warning: 'TOON.warning',
    plus: 'TOON.plus',
    printer: 'TOON.printer',
    pdf: 'TOON.pdf',
    vibrate: 'TOON.vibrate',
    silent: 'TOON.silent',
    paperclip: 'TOON.paperclip',
    save: 'TOON.save',
    search: 'TOON.search',
  },
}));

// ── Imports under test ──────────────────────────────────────────────
import {
  getIconTheme,
  setIconTheme,
  subscribeIconTheme,
  refreshIconThemeCache,
} from '../src/services/iconTheme';
import { resolveIconWithTheme, type IconKey } from '../src/utils/iconResolver';

beforeEach(() => {
  kvStore = {};
  proUserMock = true;
  refreshIconThemeCache();
});

// ── getIconTheme / setIconTheme / refresh ───────────────────────────

describe('getIconTheme', () => {
  it('returns "mixed" by default when kv is empty', () => {
    expect(getIconTheme()).toBe('mixed');
  });

  it('returns persisted "chrome" value', () => {
    kvStore.iconTheme = 'chrome';
    expect(getIconTheme()).toBe('chrome');
  });

  it('returns persisted "anthropomorphic" value', () => {
    kvStore.iconTheme = 'anthropomorphic';
    expect(getIconTheme()).toBe('anthropomorphic');
  });

  it('falls back to "mixed" for invalid kv values', () => {
    kvStore.iconTheme = 'chartreuse';
    expect(getIconTheme()).toBe('mixed');
  });

  it('caches the first read — later kv mutations are not observed', () => {
    kvStore.iconTheme = 'chrome';
    expect(getIconTheme()).toBe('chrome');
    kvStore.iconTheme = 'anthropomorphic';
    expect(getIconTheme()).toBe('chrome');
  });
});

describe('setIconTheme', () => {
  it('persists to kv and updates the cached value', () => {
    setIconTheme('chrome');
    expect(kvStore.iconTheme).toBe('chrome');
    expect(getIconTheme()).toBe('chrome');
  });

  it('updates the cache so a subsequent read does not hit kv', () => {
    setIconTheme('anthropomorphic');
    kvStore.iconTheme = 'chrome';
    expect(getIconTheme()).toBe('anthropomorphic');
  });
});

describe('refreshIconThemeCache', () => {
  it('clears the cache so next read re-consults kv', () => {
    setIconTheme('chrome');
    expect(getIconTheme()).toBe('chrome');
    kvStore.iconTheme = 'anthropomorphic';
    refreshIconThemeCache();
    expect(getIconTheme()).toBe('anthropomorphic');
  });
});

// ── resolveIconWithTheme — spot checks per category + theme ─────────

describe('resolveIconWithTheme — decorative (theme-independent)', () => {
  it('hammock resolves to APP_ICONS.hammock at every theme', () => {
    expect(resolveIconWithTheme('hammock', 'mixed')).toBe('APP.hammock');
    expect(resolveIconWithTheme('hammock', 'chrome')).toBe('APP.hammock');
    expect(resolveIconWithTheme('hammock', 'anthropomorphic')).toBe('APP.hammock');
  });

  it('beach-chair resolves to APP_ICONS["beach-chair"] at every theme', () => {
    expect(resolveIconWithTheme('beach-chair', 'mixed')).toBe('APP.beach-chair');
    expect(resolveIconWithTheme('beach-chair', 'chrome')).toBe('APP.beach-chair');
    expect(resolveIconWithTheme('beach-chair', 'anthropomorphic')).toBe('APP.beach-chair');
  });
});

describe('resolveIconWithTheme — utility keys', () => {
  it('utility at mixed returns APP_ICONS value', () => {
    expect(resolveIconWithTheme('alarm', 'mixed')).toBe('APP.alarm');
    expect(resolveIconWithTheme('gear', 'mixed')).toBe('APP.gear');
    expect(resolveIconWithTheme('flame', 'mixed')).toBe('APP.flame');
    expect(resolveIconWithTheme('search', 'mixed')).toBe('APP.search');
  });

  it('utility at chrome returns APP_ICONS value (same as mixed)', () => {
    expect(resolveIconWithTheme('alarm', 'chrome')).toBe('APP.alarm');
    expect(resolveIconWithTheme('gear', 'chrome')).toBe('APP.gear');
    expect(resolveIconWithTheme('search', 'chrome')).toBe('APP.search');
  });

  it('utility at anthropomorphic returns TOON_APP_ICONS value', () => {
    expect(resolveIconWithTheme('alarm', 'anthropomorphic')).toBe('TOON.alarm');
    expect(resolveIconWithTheme('gear', 'anthropomorphic')).toBe('TOON.gear');
    expect(resolveIconWithTheme('flame', 'anthropomorphic')).toBe('TOON.flame');
    expect(resolveIconWithTheme('search', 'anthropomorphic')).toBe('TOON.search');
  });
});

describe('resolveIconWithTheme — abstract / structural keys', () => {
  it('abstract at mixed returns APP_ICONS value', () => {
    expect(resolveIconWithTheme('closeX', 'mixed')).toBe('APP.closeX');
    expect(resolveIconWithTheme('checkmark', 'mixed')).toBe('APP.checkmark');
    expect(resolveIconWithTheme('backArrow', 'mixed')).toBe('APP.backArrow');
    expect(resolveIconWithTheme('home', 'mixed')).toBe('APP.house');
  });

  it('abstract at chrome returns APP_ICONS value (same as mixed)', () => {
    expect(resolveIconWithTheme('closeX', 'chrome')).toBe('APP.closeX');
    expect(resolveIconWithTheme('home', 'chrome')).toBe('APP.house');
  });

  it('abstract at anthropomorphic returns a character-art sibling', () => {
    // Siblings are direct require()s — fileMock collapses every webp to
    // the same stub string, so we can only assert the stub was returned
    // (confirming the require() resolved through fileMock, not through
    // APP_ICONS).
    expect(resolveIconWithTheme('closeX', 'anthropomorphic')).toBe('test-file-stub');
    expect(resolveIconWithTheme('closeX', 'anthropomorphic')).not.toBe('APP.closeX');
    expect(resolveIconWithTheme('checkmark', 'anthropomorphic')).toBe('test-file-stub');
    expect(resolveIconWithTheme('checkmark', 'anthropomorphic')).not.toBe('APP.checkmark');
    expect(resolveIconWithTheme('backArrow', 'anthropomorphic')).toBe('test-file-stub');
    expect(resolveIconWithTheme('home', 'anthropomorphic')).toBe('test-file-stub');
  });
});

describe('resolveIconWithTheme — chess pieces', () => {
  it('chess piece at mixed returns anthropomorphic art (fileMock stub)', () => {
    // Direct require() of assets/chess/*.webp → fileMock stub.
    expect(resolveIconWithTheme('chess.king.light', 'mixed')).toBe('test-file-stub');
    expect(resolveIconWithTheme('chess.pawn.dark', 'mixed')).toBe('test-file-stub');
  });

  it('chess piece at chrome returns CHROME_GAME_ICONS value', () => {
    expect(resolveIconWithTheme('chess.king.light', 'chrome')).toBe('CHROME.kingLight');
    expect(resolveIconWithTheme('chess.queen.dark', 'chrome')).toBe('CHROME.queenDark');
    expect(resolveIconWithTheme('chess.pawn.light', 'chrome')).toBe('CHROME.pawnLight');
  });

  it('chess piece at anthropomorphic falls through to mixed (fileMock stub)', () => {
    // Anthropomorphic branch has no chess cases → falls through to mixed.
    expect(resolveIconWithTheme('chess.king.light', 'anthropomorphic')).toBe('test-file-stub');
    expect(resolveIconWithTheme('chess.knight.dark', 'anthropomorphic')).toBe('test-file-stub');
  });
});

describe('resolveIconWithTheme — checker pieces', () => {
  it('checker piece at mixed returns anthropomorphic art (fileMock stub)', () => {
    expect(resolveIconWithTheme('checker.regular.light', 'mixed')).toBe('test-file-stub');
    expect(resolveIconWithTheme('checker.king.dark', 'mixed')).toBe('test-file-stub');
  });

  it('checker piece at chrome returns CHROME_GAME_ICONS value', () => {
    expect(resolveIconWithTheme('checker.regular.light', 'chrome')).toBe('CHROME.checkerLight');
    expect(resolveIconWithTheme('checker.king.light', 'chrome')).toBe('CHROME.checkerLightKing');
    expect(resolveIconWithTheme('checker.regular.dark', 'chrome')).toBe('CHROME.checkerDark');
    expect(resolveIconWithTheme('checker.king.dark', 'chrome')).toBe('CHROME.checkerDarkKing');
  });
});

describe('resolveIconWithTheme — cards / status / ui / trivia', () => {
  it('card keys at chrome use CHROME_GAME_ICONS', () => {
    expect(resolveIconWithTheme('card.sudoku', 'chrome')).toBe('CHROME.sudoku');
    expect(resolveIconWithTheme('card.chart', 'chrome')).toBe('CHROME.chart');
    expect(resolveIconWithTheme('card.globe', 'chrome')).toBe('CHROME.globe');
    expect(resolveIconWithTheme('card.offlineGlobe', 'chrome')).toBe('CHROME.offlineGlobe');
  });

  it('status keys at chrome use CHROME_GAME_ICONS', () => {
    expect(resolveIconWithTheme('status.star', 'chrome')).toBe('CHROME.star');
    expect(resolveIconWithTheme('status.party', 'chrome')).toBe('CHROME.party');
    expect(resolveIconWithTheme('status.quick', 'chrome')).toBe('CHROME.quick');
  });

  it('status.quick at mixed resolves to APP_ICONS.stopwatch (known alias)', () => {
    expect(resolveIconWithTheme('status.quick', 'mixed')).toBe('APP.stopwatch');
  });

  it('ui keys at chrome use CHROME_GAME_ICONS', () => {
    expect(resolveIconWithTheme('ui.chevronLeft', 'chrome')).toBe('CHROME.chevronLeft');
    expect(resolveIconWithTheme('ui.refresh', 'chrome')).toBe('CHROME.refresh');
    expect(resolveIconWithTheme('ui.forwardSkip', 'chrome')).toBe('CHROME.forwardSkip');
    expect(resolveIconWithTheme('ui.backSkip', 'chrome')).toBe('CHROME.backSkip');
  });

  it('trivia keys at chrome use CHROME_GAME_ICONS', () => {
    expect(resolveIconWithTheme('trivia.books', 'chrome')).toBe('CHROME.books');
    expect(resolveIconWithTheme('trivia.lightbulb', 'chrome')).toBe('CHROME.lightbulb');
    expect(resolveIconWithTheme('trivia.phone', 'chrome')).toBe('CHROME.phone');
    expect(resolveIconWithTheme('trivia.puzzle', 'chrome')).toBe('CHROME.puzzle');
    expect(resolveIconWithTheme('trivia.wordplay', 'chrome')).toBe('CHROME.wordplay');
  });

  it('trivia keys at mixed fall through to anthropomorphic fallbacks (fileMock stub)', () => {
    // mixed + trivia.* uses direct require() of icon-books / icon-lightbulb.
    expect(resolveIconWithTheme('trivia.books', 'mixed')).toBe('test-file-stub');
    expect(resolveIconWithTheme('trivia.lightbulb', 'mixed')).toBe('test-file-stub');
    expect(resolveIconWithTheme('trivia.phone', 'mixed')).toBe('test-file-stub');
  });

  it('status.quick at anthropomorphic uses TOON_APP_ICONS.stopwatch (P2 fix)', () => {
    // Previously fell through to mixed and returned APP_ICONS.stopwatch,
    // which is inconsistent with the rest of toon utility mapping.
    expect(resolveIconWithTheme('status.quick', 'anthropomorphic')).toBe('TOON.stopwatch');
  });
});

// ── Pro-gate enforcement ────────────────────────────────────────────

describe('getIconTheme — Pro gate', () => {
  it('returns "mixed" for non-Pro users even if cached is "chrome"', () => {
    setIconTheme('chrome');
    expect(getIconTheme()).toBe('chrome');
    proUserMock = false;
    expect(getIconTheme()).toBe('mixed');
  });

  it('returns "mixed" for non-Pro users even if kv has "anthropomorphic"', () => {
    kvStore.iconTheme = 'anthropomorphic';
    proUserMock = false;
    expect(getIconTheme()).toBe('mixed');
  });

  it('preserves the user preference when Pro status is restored', () => {
    kvStore.iconTheme = 'chrome';
    proUserMock = false;
    expect(getIconTheme()).toBe('mixed');
    proUserMock = true;
    expect(getIconTheme()).toBe('chrome');
  });

  it('does not gate "mixed" itself', () => {
    setIconTheme('mixed');
    proUserMock = false;
    expect(getIconTheme()).toBe('mixed');
  });
});

// ── subscribeIconTheme — listener plumbing ─────────────────────────

describe('subscribeIconTheme', () => {
  it('notifies subscribers on setIconTheme', () => {
    const listener = jest.fn();
    subscribeIconTheme(listener);
    setIconTheme('chrome');
    expect(listener).toHaveBeenCalledWith('chrome');
    setIconTheme('anthropomorphic');
    expect(listener).toHaveBeenCalledWith('anthropomorphic');
  });

  it('notifies multiple subscribers', () => {
    const a = jest.fn();
    const b = jest.fn();
    subscribeIconTheme(a);
    subscribeIconTheme(b);
    setIconTheme('chrome');
    expect(a).toHaveBeenCalledWith('chrome');
    expect(b).toHaveBeenCalledWith('chrome');
  });

  it('unsubscribe stops further notifications', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeIconTheme(listener);
    setIconTheme('chrome');
    unsubscribe();
    setIconTheme('anthropomorphic');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('chrome');
  });
});

// ── Exhaustive: every IconKey resolves at every theme ──────────────
// Single source of truth for the key list. If a new IconKey is added to
// iconResolver without being added here, TypeScript will flag the union
// mismatch (the `satisfies` keeps this list aligned with IconKey).
const ALL_ICON_KEYS = [
  // Utility glyphs
  'alarm', 'bell', 'stopwatch', 'notepad', 'microphone', 'calendar',
  'gamepad', 'gear', 'trash', 'camera', 'image', 'paintbrush',
  'palette', 'share', 'flame', 'warning', 'plus', 'printer', 'pdf',
  'vibrate', 'silent', 'paperclip', 'save', 'edit', 'search',
  // Abstract / structural
  'closeX', 'checkmark', 'backArrow', 'home',
  // Decorative
  'hammock', 'house', 'couch', 'beach-chair',
  // Chess pieces
  'chess.king.light', 'chess.king.dark',
  'chess.queen.light', 'chess.queen.dark',
  'chess.rook.light', 'chess.rook.dark',
  'chess.bishop.light', 'chess.bishop.dark',
  'chess.knight.light', 'chess.knight.dark',
  'chess.pawn.light', 'chess.pawn.dark',
  // Checker pieces
  'checker.regular.light', 'checker.king.light',
  'checker.regular.dark', 'checker.king.dark',
  // Game cards
  'card.sudoku', 'card.chart', 'card.globe', 'card.offlineGlobe',
  // Status
  'status.star', 'status.win', 'status.loss', 'status.hourglass',
  'status.smiley', 'status.party', 'status.quick',
  // UI controls
  'ui.chevronLeft', 'ui.chevronRight', 'ui.erase', 'ui.refresh',
  'ui.skip', 'ui.forwardSkip', 'ui.backSkip',
  // Trivia
  'trivia.books', 'trivia.lightbulb', 'trivia.phone',
  'trivia.puzzle', 'trivia.wordplay',
] as const satisfies readonly IconKey[];

describe('resolveIconWithTheme — exhaustive smoke', () => {
  const THEMES = ['mixed', 'chrome', 'anthropomorphic'] as const;

  for (const theme of THEMES) {
    it(`every IconKey resolves to a truthy value at theme=${theme}`, () => {
      for (const key of ALL_ICON_KEYS) {
        expect(() => resolveIconWithTheme(key, theme)).not.toThrow();
        expect(resolveIconWithTheme(key, theme)).toBeTruthy();
      }
    });
  }
});
