const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
}));

jest.mock('../src/services/proStatus', () => ({
  isProUser: jest.fn(() => false),
  setProStatus: jest.fn(),
}));

import {
  runFoundingMigration,
  isFoundingUser,
  getFoundingDetails,
} from '../src/services/foundingStatus';
import { isProUser, setProStatus } from '../src/services/proStatus';
import type { FoundingDetails } from '../src/services/foundingStatus';
import * as fs from 'fs';
import * as path from 'path';

const mockedIsProUser = isProUser as jest.MockedFunction<typeof isProUser>;
const mockedSetProStatus = setProStatus as jest.MockedFunction<typeof setProStatus>;

beforeEach(() => {
  kvStore.clear();
  mockedIsProUser.mockReset().mockReturnValue(false);
  mockedSetProStatus.mockReset();
});

// ── runFoundingMigration ────────────────────────────────────────

describe('runFoundingMigration', () => {
  it('on fresh install (no onboardingComplete), DOES NOT grant founding but marks check done', () => {
    runFoundingMigration();

    // v2.0.0 paywall flip: fresh installs no longer get auto-Pro.
    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');
    expect(kvStore.get('founding_status')).toBeUndefined();
    expect(isFoundingUser()).toBe(false);
  });

  it('grants founding on first run when onboardingComplete is already set (upgrade path)', () => {
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();

    expect(mockedSetProStatus).toHaveBeenCalledTimes(1);
    const arg = mockedSetProStatus.mock.calls[0][0];
    expect(arg.purchased).toBe(true);
    expect(arg.productId).toBe('founding_user');
    expect(typeof arg.purchaseDate).toBe('string');
    expect(() => new Date(arg.purchaseDate).toISOString()).not.toThrow();

    expect(kvStore.get('founding_check_done')).toBe('true');
    const rawStatus = kvStore.get('founding_status');
    expect(rawStatus).toBeDefined();
    const parsed = JSON.parse(rawStatus!) as FoundingDetails;
    expect(parsed.isFoundingUser).toBe(true);
    expect(typeof parsed.grantedAt).toBe('string');
  });

  it('does not re-grant Pro when the user is already Pro, but still records the founding badge', () => {
    mockedIsProUser.mockReturnValue(true);
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();

    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');

    const rawStatus = kvStore.get('founding_status');
    expect(rawStatus).toBeDefined();
    const parsed = JSON.parse(rawStatus!) as FoundingDetails;
    expect(parsed.isFoundingUser).toBe(true);
    expect(typeof parsed.grantedAt).toBe('string');
  });

  it('does NOT grant founding when onboardingComplete is anything other than the literal string "true"', () => {
    kvStore.set('onboardingComplete', 'false');
    runFoundingMigration();

    // v2.0.0: only the exact value 'true' qualifies. Truthy-but-wrong
    // values like 'false', 'yes', '1' must not grant founding.
    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');
    expect(kvStore.get('founding_status')).toBeUndefined();
  });

  it('is idempotent: a second run does not re-grant or re-write anything', () => {
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();

    mockedSetProStatus.mockClear();
    const statusBefore = kvStore.get('founding_status');

    runFoundingMigration();

    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_status')).toBe(statusBefore);
  });

  it('skips immediately when founding_check_done is already set, even if onboardingComplete exists', () => {
    kvStore.set('founding_check_done', 'true');
    kvStore.set('onboardingComplete', 'true');

    runFoundingMigration();

    expect(mockedIsProUser).not.toHaveBeenCalled();
    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_status')).toBeUndefined();
  });

  it('on completely fresh install (empty kv store), DOES NOT grant founding (v2.0.0 paywall)', () => {
    expect(kvStore.size).toBe(0);
    runFoundingMigration();

    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');
    expect(kvStore.get('founding_status')).toBeUndefined();
    expect(isFoundingUser()).toBe(false);
  });

  it('is idempotent on repeat invocations (existing user upgrade path)', () => {
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();
    runFoundingMigration();

    expect(mockedSetProStatus).toHaveBeenCalledTimes(1);
  });
});

// ── isFoundingUser ──────────────────────────────────────────────

describe('isFoundingUser', () => {
  it('returns false when no founding status is stored', () => {
    expect(isFoundingUser()).toBe(false);
  });

  it('returns true after a founding grant for an existing user', () => {
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();
    expect(isFoundingUser()).toBe(true);
  });

  it('returns false when the stored JSON is malformed', () => {
    kvStore.set('founding_status', '{not valid json');
    expect(isFoundingUser()).toBe(false);
  });

  it('returns false when isFoundingUser field is not a boolean', () => {
    kvStore.set('founding_status', JSON.stringify({ isFoundingUser: 'yes', grantedAt: '2026-01-01' }));
    expect(isFoundingUser()).toBe(false);
  });
});

// ── getFoundingDetails ──────────────────────────────────────────

describe('getFoundingDetails', () => {
  it('returns null when no founding status is stored', () => {
    expect(getFoundingDetails()).toBeNull();
  });

  it('returns full FoundingDetails after grant', () => {
    kvStore.set('onboardingComplete', 'true');
    runFoundingMigration();

    const details = getFoundingDetails();
    expect(details).not.toBeNull();
    expect(details!.isFoundingUser).toBe(true);
    expect(typeof details!.grantedAt).toBe('string');
    expect(() => new Date(details!.grantedAt).toISOString()).not.toThrow();
  });

  it('returns null on malformed JSON', () => {
    kvStore.set('founding_status', '{broken');
    expect(getFoundingDetails()).toBeNull();
  });

  it('returns null on missing grantedAt field', () => {
    kvStore.set('founding_status', JSON.stringify({ isFoundingUser: true }));
    expect(getFoundingDetails()).toBeNull();
  });
});

// ── v2.0.0 paywall gate (post-revert regression guard) ──────────

describe('v2.0.0 paywall gate', () => {
  it('source contains the onboarding gate that blocks fresh-install founding grants', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'services', 'foundingStatus.ts'),
      'utf-8',
    );

    // Regression guard: if someone deletes the gate, every fresh v2.0.0
    // install would silently get founding Pro again — paywall bypass.
    expect(source).toMatch(
      /kvGet\(ONBOARDING_KEY\)\s*!==\s*['"]true['"]/,
    );
    expect(source).toMatch(
      /const\s+ONBOARDING_KEY\s*=\s*['"]onboardingComplete['"]/,
    );
  });
});
