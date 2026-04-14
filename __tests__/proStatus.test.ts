const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
  kvRemove: (key: string) => { kvStore.delete(key); },
}));

import {
  isProUser,
  getProDetails,
  setProStatus,
  clearProStatus,
} from '../src/services/proStatus';
import type { ProDetails } from '../src/services/proStatus';

const STORAGE_KEY = 'pro_status';

const sampleDetails: ProDetails = {
  purchased: true,
  productId: 'dfw_pro_unlock',
  purchaseDate: '2026-04-14T12:00:00.000Z',
  purchaseToken: 'gpa.1234-5678-9012-34567',
};

beforeEach(() => {
  kvStore.clear();
});

// ── isProUser ───────────────────────────────────────────────────

describe('isProUser', () => {
  it('returns false when no stored data', () => {
    expect(isProUser()).toBe(false);
  });

  it('returns true when valid Pro status is stored', () => {
    kvStore.set(STORAGE_KEY, JSON.stringify(sampleDetails));
    expect(isProUser()).toBe(true);
  });

  it('returns false when stored JSON is malformed', () => {
    kvStore.set(STORAGE_KEY, '{not valid json');
    expect(isProUser()).toBe(false);
  });

  it('returns false when purchased field is false', () => {
    kvStore.set(
      STORAGE_KEY,
      JSON.stringify({ ...sampleDetails, purchased: false }),
    );
    expect(isProUser()).toBe(false);
  });
});

// ── getProDetails ───────────────────────────────────────────────

describe('getProDetails', () => {
  it('returns null when no stored data', () => {
    expect(getProDetails()).toBeNull();
  });

  it('returns full ProDetails object when stored', () => {
    kvStore.set(STORAGE_KEY, JSON.stringify(sampleDetails));
    expect(getProDetails()).toEqual(sampleDetails);
  });

  it('returns null when stored JSON is malformed', () => {
    kvStore.set(STORAGE_KEY, '{broken');
    expect(getProDetails()).toBeNull();
  });
});

// ── setProStatus ────────────────────────────────────────────────

describe('setProStatus', () => {
  it('stores valid ProDetails and can be read back with getProDetails', () => {
    setProStatus(sampleDetails);
    expect(getProDetails()).toEqual(sampleDetails);
    expect(isProUser()).toBe(true);
  });

  it('overwrites existing status', () => {
    setProStatus(sampleDetails);
    const updated: ProDetails = {
      ...sampleDetails,
      purchaseDate: '2026-05-01T00:00:00.000Z',
      purchaseToken: 'gpa.updated-token',
    };
    setProStatus(updated);
    expect(getProDetails()).toEqual(updated);
  });
});

// ── clearProStatus ──────────────────────────────────────────────

describe('clearProStatus', () => {
  it('removes stored status so isProUser returns false after clear', () => {
    setProStatus(sampleDetails);
    expect(isProUser()).toBe(true);
    clearProStatus();
    expect(isProUser()).toBe(false);
    expect(getProDetails()).toBeNull();
  });
});

// ── shape validation ────────────────────────────────────────────

describe('shape validation', () => {
  it('isProUser returns false for empty object', () => {
    kvStore.set('pro_status', '{}');
    expect(isProUser()).toBe(false);
  });

  it('isProUser returns false for partial object missing productId', () => {
    kvStore.set('pro_status', '{"purchased":true}');
    expect(isProUser()).toBe(false);
  });

  it('isProUser returns false for wrong type on purchased field', () => {
    kvStore.set('pro_status', '{"purchased":"yes","productId":"x","purchaseDate":"2026-01-01"}');
    expect(isProUser()).toBe(false);
  });

  it('isProUser returns false for JSON null', () => {
    kvStore.set('pro_status', 'null');
    expect(isProUser()).toBe(false);
  });

  it('isProUser returns false for JSON string', () => {
    kvStore.set('pro_status', '"whoops"');
    expect(isProUser()).toBe(false);
  });

  it('getProDetails returns null for empty object', () => {
    kvStore.set('pro_status', '{}');
    expect(getProDetails()).toBeNull();
  });

  it('getProDetails returns null for partial object', () => {
    kvStore.set('pro_status', '{"purchased":true}');
    expect(getProDetails()).toBeNull();
  });

  it('getProDetails returns null for wrong types', () => {
    kvStore.set('pro_status', '{"purchased":"yes","productId":123,"purchaseDate":true}');
    expect(getProDetails()).toBeNull();
  });
});
