import { TUTORIAL_TIPS } from '../src/data/tutorialTips';

describe('tutorialTips', () => {
  const entries = Object.entries(TUTORIAL_TIPS);

  test('has at least 7 screen keys', () => {
    expect(entries.length).toBeGreaterThanOrEqual(7);
  });

  test('every screen has at least 1 tip', () => {
    for (const [, tips] of entries) {
      expect(tips.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('every tip has non-empty title and body', () => {
    for (const [, tips] of entries) {
      for (const tip of tips) {
        expect(tip.title.trim().length).toBeGreaterThan(0);
        expect(tip.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('screen keys are lowercase alphanumeric', () => {
    for (const key of Object.keys(TUTORIAL_TIPS)) {
      expect(key).toMatch(/^[a-zA-Z]+$/);
    }
  });

  test('clipKey is undefined or non-empty string', () => {
    for (const [, tips] of entries) {
      for (const tip of tips) {
        if (tip.clipKey !== undefined) {
          expect(typeof tip.clipKey).toBe('string');
          expect(tip.clipKey.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
