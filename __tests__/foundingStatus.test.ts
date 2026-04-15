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

const mockedIsProUser = isProUser as jest.MockedFunction<typeof isProUser>;
const mockedSetProStatus = setProStatus as jest.MockedFunction<typeof setProStatus>;

beforeEach(() => {
  kvStore.clear();
  mockedIsProUser.mockReset().mockReturnValue(false);
  mockedSetProStatus.mockReset();
});

// ── runFoundingMigration ────────────────────────────────────────

describe('runFoundingMigration', () => {
  it('on fresh install (no onboardingComplete), does not grant founding but marks check done', () => {
    runFoundingMigration();
    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');
    expect(kvStore.get('founding_status')).toBeUndefined();
    expect(isFoundingUser()).toBe(false);
  });

  it('on existing user (onboardingComplete present), grants Pro with founding_user productId and stores founding status', () => {
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

  it("does not grant founding when onboardingComplete is the string 'false'", () => {
    kvStore.set('onboardingComplete', 'false');
    runFoundingMigration();

    expect(mockedSetProStatus).not.toHaveBeenCalled();
    expect(kvStore.get('founding_check_done')).toBe('true');
    expect(kvStore.get('founding_status')).toBeUndefined();
  });

  it("does not grant founding when onboardingComplete is a corrupted truthy value like 'yes'", () => {
    kvStore.set('onboardingComplete', 'yes');
    runFoundingMigration();

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
