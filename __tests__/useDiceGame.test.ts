import * as React from 'react';
// Inline type declarations — @types/react-test-renderer is not installed and
// per project rules we don't add npm deps. The runtime module is present.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => ReactTestRenderer;
  act: (cb: () => void) => void;
};
const act = TestRenderer.act;
interface ReactTestRenderer {
  unmount: () => void;
  update: (element: React.ReactElement) => void;
}

// React 19 requires this flag for act() to flush effects synchronously.
// Without it, useEffect callbacks don't fire during act() — which breaks the
// CPU kickoff effect and renders all timer-based logic untestable.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
import { useDiceGame, UseDiceGameReturn } from '../src/hooks/useDiceGame';
import {
  ScoringCategory,
  STEAL_WINDOW_MS,
  YAHTZEE_SCORE,
} from '../src/services/diceGameTypes';

// ── Hook host helper ─────────────────────────────────────────────────────────

interface HookHandle<T> {
  result: { current: T };
  unmount: () => void;
}

function renderHook<T>(hookFn: () => T): HookHandle<T> {
  const result: { current: T } = { current: undefined as unknown as T };
  function Host() {
    result.current = hookFn();
    return null;
  }
  let root: ReactTestRenderer | undefined;
  act(() => {
    root = TestRenderer.create(React.createElement(Host));
  });
  return {
    result,
    unmount: () => {
      act(() => {
        root?.unmount();
      });
    },
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

describe('useDiceGame', () => {
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  // With Math.random = 0.99, shuffleArray is a no-op (j === i each iteration),
  // so building players with humanPlayerIndex=0 keeps the human at index 0
  // and the CPU kickoff effect does not schedule anything.
  function setHumanFirst(): void {
    randomSpy.mockReturnValue(0.99);
  }

  // With Math.random = 0, every shuffle swap puts the last element at index 0,
  // so [human, cpu] becomes [cpu, human].
  function setCpuFirst(): void {
    randomSpy.mockReturnValue(0);
  }

  // ── startGame ──────────────────────────────────────────────────────────────

  describe('startGame', () => {
    it('creates correct number of players with correct types', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(4, 0);
      });
      expect(handle.result.current.players).toHaveLength(4);
      const humans = handle.result.current.players.filter(
        (p) => p.type === 'human',
      );
      const cpus = handle.result.current.players.filter(
        (p) => p.type === 'cpu',
      );
      expect(humans).toHaveLength(1);
      expect(cpus).toHaveLength(3);
      handle.unmount();
    });

    it('assigns CPU names without duplicates', () => {
      randomSpy.mockReturnValue(0.5);
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(4, 0);
      });
      const cpuNames = handle.result.current.players
        .filter((p) => p.type === 'cpu')
        .map((p) => p.name);
      expect(new Set(cpuNames).size).toBe(cpuNames.length);
      handle.unmount();
    });

    it('player order is randomized (different shuffles produce different orders)', () => {
      // No shuffle (Math.random=0.99) keeps [human, cpu].
      randomSpy.mockReturnValue(0.99);
      const h1 = renderHook(useDiceGame);
      act(() => {
        h1.result.current.startGame(2, 0);
      });
      const orderNoShuffle = h1.result.current.players.map((p) => p.type);
      h1.unmount();

      // Heavy shuffle (Math.random=0) flips [human, cpu] to [cpu, human].
      randomSpy.mockReturnValue(0);
      const h2 = renderHook(useDiceGame);
      act(() => {
        h2.result.current.startGame(2, 0);
      });
      const orderHeavyShuffle = h2.result.current.players.map((p) => p.type);
      h2.unmount();

      expect(orderNoShuffle).not.toEqual(orderHeavyShuffle);
    });

    it('initial state: phase=rolling, rollsRemaining=3, dice=[0,0,0,0,0]', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      expect(handle.result.current.phase).toBe('rolling');
      expect(handle.result.current.rollsRemaining).toBe(3);
      expect(handle.result.current.dice).toEqual([0, 0, 0, 0, 0]);
      expect(handle.result.current.held).toEqual([
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(handle.result.current.round).toBe(1);
      expect(handle.result.current.currentPlayerIndex).toBe(0);
      handle.unmount();
    });
  });

  // ── rollDice ───────────────────────────────────────────────────────────────

  describe('rollDice', () => {
    it('generates values 1-6 for unheld dice', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      act(() => {
        handle.result.current.rollDice();
      });
      const dice = handle.result.current.dice;
      expect(dice).toHaveLength(5);
      for (const d of dice) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }
      handle.unmount();
    });

    it('preserves held dice values on subsequent rolls', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      // First roll — with Math.random=0.99 all dice land on 6.
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.dice).toEqual([6, 6, 6, 6, 6]);

      // Hold dice 0 and 2.
      act(() => {
        handle.result.current.toggleHold(0);
        handle.result.current.toggleHold(2);
      });

      // Switch random to 0 so unheld dice roll to 1.
      randomSpy.mockReturnValue(0);
      act(() => {
        handle.result.current.rollDice();
      });
      // Held positions (0, 2) stayed at 6, others rolled to 1.
      expect(handle.result.current.dice[0]).toBe(6);
      expect(handle.result.current.dice[2]).toBe(6);
      expect(handle.result.current.dice[1]).toBe(1);
      expect(handle.result.current.dice[3]).toBe(1);
      expect(handle.result.current.dice[4]).toBe(1);
      handle.unmount();
    });

    it('decrements rollsRemaining', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      expect(handle.result.current.rollsRemaining).toBe(3);
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.rollsRemaining).toBe(2);
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.rollsRemaining).toBe(1);
      handle.unmount();
    });

    it('does nothing when rollsRemaining is 0', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      act(() => {
        handle.result.current.rollDice();
        handle.result.current.rollDice();
        handle.result.current.rollDice();
      });
      expect(handle.result.current.rollsRemaining).toBe(0);
      const diceAfter3 = [...handle.result.current.dice];
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.rollsRemaining).toBe(0);
      expect(handle.result.current.dice).toEqual(diceAfter3);
      handle.unmount();
    });

    it("does nothing when it's a CPU's turn", () => {
      setCpuFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      // CPU is at index 0; rollDice is a no-op.
      expect(handle.result.current.players[0].type).toBe('cpu');
      const diceBefore = [...handle.result.current.dice];
      const rollsBefore = handle.result.current.rollsRemaining;
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.dice).toEqual(diceBefore);
      expect(handle.result.current.rollsRemaining).toBe(rollsBefore);
      handle.unmount();
    });
  });

  // ── toggleHold ─────────────────────────────────────────────────────────────

  describe('toggleHold', () => {
    it('flips held state for the given index', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
      });
      expect(handle.result.current.held[2]).toBe(false);
      act(() => {
        handle.result.current.toggleHold(2);
      });
      expect(handle.result.current.held[2]).toBe(true);
      act(() => {
        handle.result.current.toggleHold(2);
      });
      expect(handle.result.current.held[2]).toBe(false);
      handle.unmount();
    });

    it('does nothing before first roll (rollsRemaining === 3)', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      expect(handle.result.current.rollsRemaining).toBe(3);
      act(() => {
        handle.result.current.toggleHold(0);
      });
      expect(handle.result.current.held[0]).toBe(false);
      handle.unmount();
    });

    it('does nothing during CPU turn', () => {
      setCpuFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      // CPU is current; nothing should change.
      act(() => {
        handle.result.current.toggleHold(0);
      });
      expect(handle.result.current.held[0]).toBe(false);
      handle.unmount();
    });
  });

  // ── scoreCategory ──────────────────────────────────────────────────────────

  describe('scoreCategory', () => {
    it("updates the player's scorecard correctly", () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      // Math.random=0.99 → all sixes. Score Chance = 30.
      act(() => {
        handle.result.current.rollDice();
      });
      expect(handle.result.current.dice).toEqual([6, 6, 6, 6, 6]);
      act(() => {
        handle.result.current.scoreCategory('chance');
      });
      const me = handle.result.current.players[0];
      expect(me.scorecard.chance).toBe(30);
      handle.unmount();
    });

    it('transitions to stealWindow phase', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
      });
      act(() => {
        handle.result.current.scoreCategory('chance');
      });
      expect(handle.result.current.phase).toBe('stealWindow');
      expect(handle.result.current.lastScoredCategory).toBe('chance');
      expect(handle.result.current.lastScoredPlayerIndex).toBe(0);
      handle.unmount();
    });

    it('rejects scoring during stealWindow phase', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
        handle.result.current.scoreCategory('chance');
      });
      expect(handle.result.current.phase).toBe('stealWindow');
      expect(handle.result.current.players[0].scorecard.chance).toBe(30);
      // Trying to score another category during the steal window is a no-op.
      act(() => {
        handle.result.current.scoreCategory('ones');
      });
      expect(handle.result.current.players[0].scorecard.ones).toBeNull();
      handle.unmount();
    });

    it('does not change scorecard when scored before any roll', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      // No rolls yet — should be no-op.
      act(() => {
        handle.result.current.scoreCategory('chance');
      });
      expect(handle.result.current.players[0].scorecard.chance).toBeNull();
      expect(handle.result.current.phase).toBe('rolling');
      handle.unmount();
    });

    it('does NOT increment yahtzee bonus when yahtzee category is null', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
      });
      // Five sixes — would be a Yahtzee. Score in chance instead (leaves
      // yahtzee category null).
      act(() => {
        handle.result.current.scoreCategory('chance');
      });
      expect(handle.result.current.players[0].yahtzeeBonusCount).toBe(0);
      handle.unmount();
    });
  });

  // ── attemptSteal ───────────────────────────────────────────────────────────

  describe('attemptSteal', () => {
    it('is a no-op when no human can steal (human is the scorer)', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
        handle.result.current.scoreCategory('chance');
      });
      // Human scored. attemptSteal should not steal from the human itself.
      const beforeChance = handle.result.current.players[0].scorecard.chance;
      act(() => {
        handle.result.current.attemptSteal();
      });
      // Phase still stealWindow OR advanced if endStealWindow ran with null.
      // Either way the scorecard value should be unchanged.
      expect(handle.result.current.players[0].scorecard.chance).toBe(
        beforeChance,
      );
      handle.unmount();
    });
  });

  // ── Turn advancement ───────────────────────────────────────────────────────

  describe('turn advancement', () => {
    it('advances to next player after steal window expires', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
        handle.result.current.scoreCategory('chance');
      });
      expect(handle.result.current.currentPlayerIndex).toBe(0);
      expect(handle.result.current.phase).toBe('stealWindow');

      // CPU steal eval timers use Math.random for delay. Keep 0.99 so they
      // fire near the END of the window, then their probability check
      // (lastScoredValue=30 >= 20 → always steal) WOULD trigger. To prevent
      // that, set lastScoredValue path... actually with 30 they'll steal.
      // Use a 4-player game with humans only? No, we only have 1 human.
      //
      // Simpler: score a low value (0) so CPU steal probability is 30%, and
      // mock Math.random AFTER scoring to keep CPU from stealing. But our
      // current scorecard already shows 30 in chance. Let's reset and try
      // a different category.
      handle.unmount();

      setHumanFirst();
      const h2 = renderHook(useDiceGame);
      act(() => {
        h2.result.current.startGame(2, 0);
        h2.result.current.rollDice();
        // Score yahtzee — five 6s match → score 50 (>= 20, CPU always steals)
        // Pick a category where five 6s score 0: smallStraight. Then value=0.
        h2.result.current.scoreCategory('smallStraight');
      });
      expect(h2.result.current.lastScoredValue).toBe(0);
      // Now random=0.99 → CPU steal probability check: random=0.99 >= 0.3 → no steal.

      // Advance through full steal window.
      act(() => {
        jest.advanceTimersByTime(STEAL_WINDOW_MS + 100);
      });
      expect(h2.result.current.currentPlayerIndex).toBe(1);
      expect(h2.result.current.phase).toBe('rolling');
      h2.unmount();
    });

    it('increments round after all players have taken a turn', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
        handle.result.current.scoreCategory('smallStraight');
      });
      expect(handle.result.current.round).toBe(1);

      // Skip the human's steal window (CPU random=0.99 → no steal).
      act(() => {
        jest.advanceTimersByTime(STEAL_WINDOW_MS + 100);
      });
      // CPU is now playing. CPU turn timing:
      //   800ms before first roll + 1000ms after roll = 1800ms per roll
      //   3 rolls then 1000ms + 600ms + 500ms = ~7000ms total worst case.
      // Then steal window = 7000ms. Total ~14000ms. Advance generously.
      act(() => {
        jest.advanceTimersByTime(20000);
      });
      // After CPU plays, round should advance to 2.
      // The human is queued up next. Don't assume their score state, just
      // verify round counter.
      expect(handle.result.current.round).toBeGreaterThanOrEqual(2);
      handle.unmount();
    });
  });

  // ── CPU automation ─────────────────────────────────────────────────────────

  describe('CPU automation', () => {
    it('CPU turn completes and produces a scored category', () => {
      setCpuFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
      });
      expect(handle.result.current.players[0].type).toBe('cpu');

      // Advance well past the longest possible CPU turn.
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // After the CPU plays, either steal window expired or it's still
      // running — but in either case the CPU's scorecard should have at
      // least one filled category.
      const cpu = handle.result.current.players[0];
      const filledCount = Object.values(cpu.scorecard).filter(
        (v) => v !== null,
      ).length;
      expect(filledCount).toBeGreaterThanOrEqual(1);
      handle.unmount();
    });
  });

  // ── resetGame ──────────────────────────────────────────────────────────────

  describe('resetGame', () => {
    it('returns everything to initial state', () => {
      setHumanFirst();
      const handle = renderHook(useDiceGame);
      act(() => {
        handle.result.current.startGame(2, 0);
        handle.result.current.rollDice();
      });
      act(() => {
        handle.result.current.resetGame();
      });
      expect(handle.result.current.phase).toBe('setup');
      expect(handle.result.current.players).toEqual([]);
      expect(handle.result.current.round).toBe(1);
      expect(handle.result.current.rollsRemaining).toBe(3);
      expect(handle.result.current.dice).toEqual([0, 0, 0, 0, 0]);
      handle.unmount();
    });
  });
});
