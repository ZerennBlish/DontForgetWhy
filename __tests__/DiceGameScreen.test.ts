import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => ReactTestRenderer;
  act: (cb: () => void | Promise<void>) => void;
};
const act = TestRenderer.act;
interface ReactTestRenderer {
  unmount: () => void;
  update: (element: React.ReactElement) => void;
  root: TestInstance;
}
interface TestInstance {
  find: (predicate: (node: TestInstance) => boolean) => TestInstance;
  findAll: (predicate: (node: TestInstance) => boolean) => TestInstance[];
  findAllByType: (type: string | React.ComponentType) => TestInstance[];
  findByProps: (props: object) => TestInstance;
  props: Record<string, unknown> & {
    accessibilityLabel?: string;
    onPress?: (...args: unknown[]) => void;
    children?: unknown;
  };
  type: string | React.ComponentType;
}

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// ── Mocks ────────────────────────────────────────────────────────────────────

// react-native ships with Flow types in its main entry, so Node can't parse
// it. Mock the surface our screen uses with plain pass-through stubs that
// react-test-renderer can render. Props are preserved so we can search for
// onPress / accessibilityLabel from tests.
jest.mock('react-native', () => {
  const ReactLib = jest.requireActual('react') as typeof import('react');
  const stub = (displayName: string) => {
    const C = (props: Record<string, unknown>) =>
      ReactLib.createElement(displayName, props, props.children as React.ReactNode);
    C.displayName = displayName;
    return C;
  };
  return {
    View: stub('View'),
    Text: stub('Text'),
    Image: stub('Image'),
    ImageBackground: stub('ImageBackground'),
    TouchableOpacity: stub('TouchableOpacity'),
    TouchableWithoutFeedback: stub('TouchableWithoutFeedback'),
    Modal: stub('Modal'),
    ScrollView: stub('ScrollView'),
    TextInput: stub('TextInput'),
    ActivityIndicator: stub('ActivityIndicator'),
    Animated: {
      View: stub('Animated.View'),
      Text: stub('Animated.Text'),
      Value: class {
        constructor(public v: number) {}
        setValue() {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        interpolate() {return this as any;}
      },
      timing: () => ({ start: () => {} }),
      sequence: () => ({ start: () => {} }),
      loop: () => ({ start: () => {}, stop: () => {} }),
    },
    Alert: { alert: jest.fn() },
    StyleSheet: {
      create: <T>(s: T): T => s,
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
  };
});

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5B9EE6',
      red: '#FF6B6B',
      orange: '#FF9F43',
      card: '#1A1A1A',
      background: '#000000',
      border: '#333333',
      textPrimary: '#FFFFFF',
      textSecondary: '#CCCCCC',
      textTertiary: '#999999',
      overlayText: '#FFFFFF',
      overlaySecondary: '#CCCCCC',
      modalOverlay: 'rgba(0,0,0,0.6)',
      sectionGames: '#A8E06C',
      mode: 'dark',
    },
  }),
}));

jest.mock('../src/components/GameNavButtons', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GameNavButtons: () => require('react').createElement('GameNavButtons'),
}));

jest.mock('../src/components/ProGate', () => ({
  __esModule: true,
  default: (props: { accessibilityLabel?: string; onClose: () => void }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('ProGate', {
      ...props,
      accessibilityLabel: 'Unlock Pro paywall',
    }),
}));

// The screen imports the multiplayer service transitively via
// MultiplayerDiceGame. Stub it to keep Firebase modules out of the test path.
jest.mock('../src/services/multiplayerDice', () => ({
  __esModule: true,
  createDiceGame: jest.fn(),
  joinDiceGame: jest.fn(),
  startDiceGame: jest.fn(),
  listenToGame: jest.fn(() => () => {}),
  generateGameCode: jest.fn(() => 'ABC123'),
}));

jest.mock('../src/components/MultiplayerDiceGame', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: () => require('react').createElement('MultiplayerDiceGame'),
}));

jest.mock('../src/services/firebaseAuth', () => ({
  __esModule: true,
  getCurrentUser: jest.fn(() => null),
}));

let mockIsPro = true;
jest.mock('../src/services/proStatus', () => ({
  isProUser: () => mockIsPro,
}));

jest.mock('../src/services/iconTheme', () => ({
  getIconTheme: () => 'mixed',
}));

jest.mock('../src/utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
  hapticError: jest.fn(),
}));

jest.mock('../src/utils/gameSounds', () => ({
  playGameSound: jest.fn(() => Promise.resolve()),
}));

// useEntitlement is consulted only when the paywall is shown; stub it.
jest.mock('../src/hooks/useEntitlement', () => ({
  __esModule: true,
  default: () => ({
    isPro: false,
    loading: false,
    error: null,
    productPrice: null,
    purchase: jest.fn(),
    restore: jest.fn(),
  }),
}));

// Provide a controllable mock for the hook so each test can shape the screen.
import {
  createEmptyScorecard,
} from '../src/services/diceGameScoring';
import type {
  DicePlayer,
  ScoringCategory,
} from '../src/services/diceGameTypes';
import type { UseDiceGameReturn } from '../src/hooks/useDiceGame';

const mockHook = {
  state: undefined as UseDiceGameReturn | undefined,
};

jest.mock('../src/hooks/useDiceGame', () => ({
  useDiceGame: () => mockHook.state,
}));

import DiceGameScreen from '../src/screens/DiceGameScreen';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(id: string, type: 'human' | 'cpu' = 'human'): DicePlayer {
  return {
    id,
    name: type === 'human' ? 'You' : `CPU ${id}`,
    type,
    scorecard: createEmptyScorecard(),
    stealUsed: false,
    stolenFrom: false,
    yahtzeeBonusCount: 0,
  };
}

function makeHookState(
  overrides: Partial<UseDiceGameReturn> = {},
): UseDiceGameReturn {
  const human = makePlayer('human-0', 'human');
  const cpu = makePlayer('cpu-1', 'cpu');
  const players = overrides.players ?? [human, cpu];
  const currentPlayerIndex = overrides.currentPlayerIndex ?? 0;
  const currentPlayer = players[currentPlayerIndex] ?? null;
  return {
    players,
    currentPlayerIndex,
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsRemaining: 3,
    round: 1,
    phase: 'setup',
    stealTimeRemaining: 0,
    lastScoredCategory: null,
    lastScoredPlayerIndex: null,
    lastScoredValue: null,
    gameResult: null,
    lastSteal: null,
    currentPlayer,
    isCurrentPlayerHuman: currentPlayer?.type === 'human',
    possibleScores: [],
    canRoll: false,
    canScore: false,
    canHumanSteal: false,
    stealableTargets: [],
    startGame: jest.fn(),
    rollDice: jest.fn(),
    toggleHold: jest.fn(),
    scoreCategory: jest.fn(),
    attemptSteal: jest.fn(),
    resetGame: jest.fn(),
    ...overrides,
  };
}

function renderScreen() {
  const mockNav = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
  const mockRoute = { key: 'k', name: 'DiceGame', params: undefined };
  let root: ReactTestRenderer | undefined;
  act(() => {
    root = TestRenderer.create(
      React.createElement(DiceGameScreen, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation: mockNav as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        route: mockRoute as any,
      }),
    );
  });
  return { root: root!, nav: mockNav };
}

// react-native-safe-area-context defaults to zero insets in test env, which is
// fine for our purposes.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DiceGameScreen', () => {
  beforeEach(() => {
    mockIsPro = true;
    mockHook.state = makeHookState();
  });

  it('renders ProGate for non-Pro users', () => {
    mockIsPro = false;
    const { root } = renderScreen();
    // ProGate uses the "Unlock Pro" purchase button label.
    const purchase = root.root.findAll(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Unlock Pro'),
    );
    expect(purchase.length).toBeGreaterThan(0);
  });

  it('renders setup screen when phase is setup', () => {
    mockHook.state = makeHookState({ phase: 'setup' });
    const { root } = renderScreen();
    const startBtn = root.root.find(
      (n) => n.props.accessibilityLabel === 'Start game versus CPU',
    );
    expect(startBtn).toBeDefined();
  });

  it('start button calls startGame with selected player count', () => {
    const startGame = jest.fn();
    mockHook.state = makeHookState({ phase: 'setup', startGame });
    const { root } = renderScreen();
    const startBtn = root.root.find(
      (n) => n.props.accessibilityLabel === 'Start game versus CPU',
    );
    act(() => {
      (startBtn.props.onPress as () => void)();
    });
    expect(startGame).toHaveBeenCalledWith(2, 0);
  });

  it('renders dice area when phase is rolling', () => {
    mockHook.state = makeHookState({ phase: 'rolling', canRoll: true });
    const { root } = renderScreen();
    const rollBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Roll dice'),
    );
    expect(rollBtn).toBeDefined();
  });

  it('Roll button calls rollDice from hook', () => {
    const rollDice = jest.fn();
    mockHook.state = makeHookState({
      phase: 'rolling',
      canRoll: true,
      rollDice,
    });
    const { root } = renderScreen();
    const rollBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Roll dice'),
    );
    act(() => {
      (rollBtn.props.onPress as () => void)();
    });
    expect(rollDice).toHaveBeenCalled();
  });

  it('tapping a die calls toggleHold with correct index', () => {
    const toggleHold = jest.fn();
    mockHook.state = makeHookState({
      phase: 'rolling',
      dice: [3, 4, 5, 6, 2],
      rollsRemaining: 2, // <MAX_ROLLS, hold is enabled
      canRoll: true,
      toggleHold,
    });
    const { root } = renderScreen();
    const dieBtn = root.root.find(
      (n) => n.props.accessibilityLabel === 'Die 3, value 5, not held',
    );
    act(() => {
      (dieBtn.props.onPress as () => void)();
    });
    expect(toggleHold).toHaveBeenCalledWith(2);
  });

  it('tapping an unfilled category calls scoreCategory', () => {
    const scoreCategory = jest.fn();
    mockHook.state = makeHookState({
      phase: 'rolling',
      dice: [1, 1, 1, 1, 1],
      rollsRemaining: 2,
      canRoll: true,
      canScore: true,
      possibleScores: [{ category: 'ones', score: 5 }],
      scoreCategory,
    });
    const { root } = renderScreen();
    const onesBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Ones, would score 5'),
    );
    act(() => {
      (onesBtn.props.onPress as () => void)();
    });
    expect(scoreCategory).toHaveBeenCalledWith('ones');
  });

  it('steal button appears during stealWindow phase', () => {
    const human = makePlayer('human-0', 'human');
    const cpu = makePlayer('cpu-1', 'cpu');
    cpu.scorecard.chance = 18;
    const players = [human, cpu];
    mockHook.state = makeHookState({
      players,
      currentPlayerIndex: 1,
      phase: 'stealWindow',
      stealTimeRemaining: 5500,
      lastScoredCategory: 'chance' as ScoringCategory,
      lastScoredPlayerIndex: 1,
      lastScoredValue: 18,
      canHumanSteal: true,
      stealableTargets: [
        { playerIndex: 1, category: 'chance', points: 18 },
      ],
    });
    const { root } = renderScreen();
    const stealBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('STEAL'),
    );
    expect(stealBtn).toBeDefined();
  });

  it('game over screen shows rankings and play again button', () => {
    mockHook.state = makeHookState({
      phase: 'gameOver',
      gameResult: {
        winnerIndex: 0,
        rankings: [
          { playerIndex: 0, total: 250 },
          { playerIndex: 1, total: 180 },
        ],
        isTie: false,
      },
    });
    const { root } = renderScreen();
    const playAgain = root.root.find(
      (n) => n.props.accessibilityLabel === 'Play again',
    );
    expect(playAgain).toBeDefined();
  });

  it('Play Again calls resetGame', () => {
    const resetGame = jest.fn();
    mockHook.state = makeHookState({
      phase: 'gameOver',
      gameResult: {
        winnerIndex: 0,
        rankings: [{ playerIndex: 0, total: 100 }],
        isTie: false,
      },
      resetGame,
    });
    const { root } = renderScreen();
    const playAgain = root.root.find(
      (n) => n.props.accessibilityLabel === 'Play again',
    );
    act(() => {
      (playAgain.props.onPress as () => void)();
    });
    expect(resetGame).toHaveBeenCalled();
  });

  it('mini opponent cards render for non-current players', () => {
    const human = makePlayer('human-0', 'human');
    const cpu1 = makePlayer('cpu-1', 'cpu');
    const cpu2 = makePlayer('cpu-2', 'cpu');
    mockHook.state = makeHookState({
      players: [human, cpu1, cpu2],
      currentPlayerIndex: 0,
      phase: 'rolling',
      canRoll: true,
    });
    const { root } = renderScreen();
    const cards = root.root.findAll(
      (n) =>
        n.type === 'TouchableOpacity' &&
        typeof n.props.accessibilityLabel === 'string' &&
        /^CPU cpu-[12], score \d+$/.test(n.props.accessibilityLabel),
    );
    expect(cards.length).toBe(2);
  });
});
