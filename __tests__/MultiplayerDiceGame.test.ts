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
  props: Record<string, unknown> & {
    accessibilityLabel?: string;
    onPress?: (...args: unknown[]) => void;
    children?: unknown;
  };
  type: string | React.ComponentType;
}

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// ── react-native stubs (same pattern as DiceGameScreen.test.ts) ─────────────

jest.mock('react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    Alert: { alert: jest.fn() },
    StyleSheet: {
      create: <T>(s: T): T => s,
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavRef: { current: { addListener: jest.Mock; dispatch: jest.Mock } } = {
  current: { addListener: jest.fn(() => () => {}), dispatch: jest.fn() },
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavRef.current,
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
      mode: 'dark',
    },
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
}));
jest.mock('../src/utils/gameSounds', () => ({
  playGameSound: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/services/multiplayerDice', () => ({
  leaveDiceGame: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/services/iconTheme', () => ({
  getIconTheme: () => 'mixed',
}));
jest.mock('../src/services/proStatus', () => ({
  isProUser: () => true,
}));

import { createEmptyScorecard } from '../src/services/diceGameScoring';
import type {
  DiceMultiplayerGame,
  DiceMultiplayerPlayer,
} from '../src/services/multiplayerDice';
import type { UseMultiplayerDiceGameReturn } from '../src/hooks/useMultiplayerDiceGame';

const mockHook: { state: UseMultiplayerDiceGameReturn | undefined } = {
  state: undefined,
};
jest.mock('../src/hooks/useMultiplayerDiceGame', () => ({
  useMultiplayerDiceGame: () => mockHook.state,
}));

import MultiplayerDiceGame from '../src/components/MultiplayerDiceGame';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<DiceMultiplayerGame> = {}): DiceMultiplayerGame {
  const players: DiceMultiplayerPlayer[] = [
    { uid: 'me', displayName: 'You' },
    { uid: 'opp1', displayName: 'Opp One' },
  ];
  return {
    code: 'ABC123',
    type: 'dice',
    host: players[0],
    players: ['me', 'opp1'],
    playerDetails: players,
    status: 'active',
    scorecards: {
      me: createEmptyScorecard(),
      opp1: createEmptyScorecard(),
    },
    yahtzeeBonuses: { me: 0, opp1: 0 },
    stealUsed: { me: false, opp1: false },
    stolenFrom: { me: false, opp1: false },
    currentPlayerUid: 'me',
    playerOrder: ['me', 'opp1'],
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsRemaining: 3,
    round: 1,
    playerCount: 2,
    stealWindowActive: false,
    stealWindowEnd: null,
    lastScoredCategory: null,
    lastScoredPlayerUid: null,
    lastScoredValue: null,
    stealClaim: null,
    result: null,
    createdAt: '2026-01-01T00:00:00Z',
    lastActionAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeState(
  overrides: Partial<UseMultiplayerDiceGameReturn> = {},
): UseMultiplayerDiceGameReturn {
  const game = overrides.game ?? makeGame();
  const myScorecard = game ? game.scorecards.me : createEmptyScorecard();
  return {
    game,
    isConnected: true,
    isHost: true,
    myUid: 'me',
    isMyTurn: game?.currentPlayerUid === 'me',
    myScorecard,
    myYahtzeeBonus: 0,
    myTotal: 0,
    currentPlayerName: game
      ? game.playerDetails.find((p) => p.uid === game.currentPlayerUid)
          ?.displayName ?? ''
      : '',
    possibleScores: [],
    canRoll: false,
    canScore: false,
    canHumanSteal: false,
    stealTimeRemaining: 0,
    opponents: game ? game.playerDetails.filter((p) => p.uid !== 'me') : [],
    roll: jest.fn(),
    toggleHold: jest.fn(),
    score: jest.fn(),
    steal: jest.fn(),
    advance: jest.fn(),
    leave: jest.fn(),
    ...overrides,
  };
}

function renderComponent() {
  let root: ReactTestRenderer | undefined;
  act(() => {
    root = TestRenderer.create(
      React.createElement(MultiplayerDiceGame, {
        code: 'ABC123',
        onExit: jest.fn(),
      }),
    );
  });
  return root!;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MultiplayerDiceGame', () => {
  beforeEach(() => {
    mockHook.state = makeState();
    mockNavRef.current = {
      addListener: jest.fn(() => () => {}),
      dispatch: jest.fn(),
    };
  });

  it('renders dice and scorecard from snapshot data', () => {
    mockHook.state = makeState({
      game: makeGame({ dice: [3, 4, 5, 6, 2], rollsRemaining: 2 }),
      canRoll: true,
      isMyTurn: true,
    });
    const root = renderComponent();
    const rollBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Roll dice'),
    );
    expect(rollBtn).toBeDefined();
    // Die accessibility labels include values.
    const dieBtns = root.root.findAll(
      (n) =>
        n.type === 'TouchableOpacity' &&
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Die '),
    );
    expect(dieBtns.length).toBe(5);
  });

  it('shows opponent mini cards for non-self players', () => {
    mockHook.state = makeState();
    const root = renderComponent();
    const cards = root.root.findAll(
      (n) =>
        n.type === 'TouchableOpacity' &&
        typeof n.props.accessibilityLabel === 'string' &&
        /^Opp One, score \d+$/.test(n.props.accessibilityLabel),
    );
    expect(cards.length).toBe(1);
  });

  it('steal button appears during steal window', () => {
    mockHook.state = makeState({
      game: makeGame({
        stealWindowActive: true,
        stealWindowEnd: Date.now() + 5000,
        lastScoredCategory: 'chance',
        lastScoredPlayerUid: 'opp1',
        lastScoredValue: 18,
        scorecards: {
          me: createEmptyScorecard(),
          opp1: { ...createEmptyScorecard(), chance: 18 },
        },
      }),
      stealTimeRemaining: 5000,
      canHumanSteal: true,
    });
    const root = renderComponent();
    const stealBtn = root.root.find(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('STEAL'),
    );
    expect(stealBtn).toBeDefined();
  });

  it('exit guard registers a beforeRemove listener while active', () => {
    mockHook.state = makeState();
    renderComponent();
    expect(mockNavRef.current.addListener).toHaveBeenCalledWith(
      'beforeRemove',
      expect.any(Function),
    );
  });
});
