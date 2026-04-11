// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

interface ClipRow {
  id: string;
  memoId: string;
  uri: string;
  duration: number;
  position: number;
  label: string | null;
  createdAt: string;
}

const clipStore: ClipRow[] = [];

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

const mockDb = {
  getAllSync: jest.fn((sql: string, params?: any[]) => {
    const s = normalize(sql);

    if (s === 'SELECT * FROM voice_clips WHERE memoId = ? ORDER BY position ASC') {
      return clipStore
        .filter((c) => c.memoId === params![0])
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ ...c }));
    }

    if (s.startsWith('SELECT memoId, COUNT(*) as cnt, COALESCE(SUM(duration), 0) as total FROM voice_clips WHERE memoId IN')) {
      const ids = params!;
      const grouped = new Map<string, { memoId: string; cnt: number; total: number }>();
      for (const c of clipStore) {
        if (!ids.includes(c.memoId)) continue;
        const g = grouped.get(c.memoId) ?? { memoId: c.memoId, cnt: 0, total: 0 };
        g.cnt += 1;
        g.total += c.duration;
        grouped.set(c.memoId, g);
      }
      return Array.from(grouped.values());
    }

    if (s === 'SELECT uri FROM voice_clips WHERE memoId = ?') {
      return clipStore.filter((c) => c.memoId === params![0]).map((c) => ({ uri: c.uri }));
    }

    if (s === 'SELECT * FROM voice_clips') {
      return clipStore.map((c) => ({ ...c }));
    }

    throw new Error(`Unhandled getAllSync query: ${s}`);
  }),

  getFirstSync: jest.fn((sql: string, params?: any[]) => {
    const s = normalize(sql);

    if (s === 'SELECT * FROM voice_clips WHERE id = ?') {
      const row = clipStore.find((c) => c.id === params![0]);
      return row ? { ...row } : null;
    }

    if (s === 'SELECT COUNT(*) as cnt, COALESCE(SUM(duration), 0) as total FROM voice_clips WHERE memoId = ?') {
      const matches = clipStore.filter((c) => c.memoId === params![0]);
      return {
        cnt: matches.length,
        total: matches.reduce((acc, c) => acc + c.duration, 0),
      };
    }

    if (s === 'SELECT MAX(position) as maxPos FROM voice_clips WHERE memoId = ?') {
      const matches = clipStore.filter((c) => c.memoId === params![0]);
      if (matches.length === 0) return { maxPos: null };
      return { maxPos: Math.max(...matches.map((c) => c.position)) };
    }

    if (s === 'SELECT uri FROM voice_clips WHERE id = ?') {
      const row = clipStore.find((c) => c.id === params![0]);
      return row ? { uri: row.uri } : null;
    }

    throw new Error(`Unhandled getFirstSync query: ${s}`);
  }),

  runSync: jest.fn((sql: string, params?: any[]) => {
    const s = normalize(sql);

    if (s.startsWith('INSERT INTO voice_clips')) {
      const [id, memoId, uri, duration, position, label, createdAt] = params!;
      clipStore.push({ id, memoId, uri, duration, position, label, createdAt });
      return;
    }

    if (s === 'UPDATE voice_clips SET label = ? WHERE id = ?') {
      const [label, id] = params!;
      const row = clipStore.find((c) => c.id === id);
      if (row) row.label = label;
      return;
    }

    if (s === 'DELETE FROM voice_clips WHERE id = ?') {
      const id = params![0];
      const idx = clipStore.findIndex((c) => c.id === id);
      if (idx >= 0) clipStore.splice(idx, 1);
      return;
    }

    if (s === 'DELETE FROM voice_clips WHERE memoId = ?') {
      const memoId = params![0];
      for (let i = clipStore.length - 1; i >= 0; i--) {
        if (clipStore[i].memoId === memoId) clipStore.splice(i, 1);
      }
      return;
    }

    throw new Error(`Unhandled runSync query: ${s}`);
  }),
};

jest.mock('../src/services/database', () => ({
  getDb: jest.fn(() => mockDb),
}));

jest.mock('../src/services/voiceMemoFileStorage', () => ({
  deleteVoiceMemoFile: jest.fn(async () => { /* no-op */ }),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  addClip,
  getClipsForMemo,
  getClipById,
  getClipSummary,
  getClipSummaries,
  updateClipLabel,
  deleteClip,
  deleteAllClipsForMemo,
  getAllClips,
  getNextClipPosition,
} from '../src/services/voiceClipStorage';
import type { VoiceClip } from '../src/types/voiceClip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClip(overrides: Partial<VoiceClip> = {}): VoiceClip {
  return {
    id: 'clip-1',
    memoId: 'memo-1',
    uri: 'file:///mock/voice-memos/clip-1.m4a',
    duration: 10,
    position: 0,
    label: null,
    createdAt: '2026-04-11T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  clipStore.length = 0;
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('voiceClipStorage', () => {
  describe('getClipsForMemo', () => {
    it('returns empty array for unknown memoId', () => {
      expect(getClipsForMemo('nope')).toEqual([]);
    });

    it('returns clips sorted by position ASC', () => {
      addClip(makeClip({ id: 'c2', position: 1 }));
      addClip(makeClip({ id: 'c1', position: 0 }));
      addClip(makeClip({ id: 'c3', position: 2 }));
      const clips = getClipsForMemo('memo-1');
      expect(clips.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('does not return clips from other memos', () => {
      addClip(makeClip({ id: 'c1', memoId: 'memo-1' }));
      addClip(makeClip({ id: 'c2', memoId: 'memo-2' }));
      expect(getClipsForMemo('memo-1').map((c) => c.id)).toEqual(['c1']);
    });
  });

  describe('addClip + getClipById round-trip', () => {
    it('stores and retrieves a clip by id', () => {
      const clip = makeClip({ id: 'abc', duration: 42, label: 'intro' });
      addClip(clip);
      const fetched = getClipById('abc');
      expect(fetched).toEqual(clip);
    });

    it('returns null for unknown id', () => {
      expect(getClipById('missing')).toBeNull();
    });
  });

  describe('getClipSummary', () => {
    it('returns zero counts for memo with no clips', () => {
      expect(getClipSummary('memo-empty')).toEqual({ clipCount: 0, totalDuration: 0 });
    });

    it('returns correct count and total duration', () => {
      addClip(makeClip({ id: 'c1', duration: 10 }));
      addClip(makeClip({ id: 'c2', duration: 25, position: 1 }));
      addClip(makeClip({ id: 'c3', duration: 5, position: 2 }));
      expect(getClipSummary('memo-1')).toEqual({ clipCount: 3, totalDuration: 40 });
    });
  });

  describe('getClipSummaries (batch)', () => {
    it('returns empty map for empty input', () => {
      expect(getClipSummaries([]).size).toBe(0);
    });

    it('returns all requested IDs including zero-clip memos', () => {
      addClip(makeClip({ id: 'c1', memoId: 'memo-1', duration: 10 }));
      addClip(makeClip({ id: 'c2', memoId: 'memo-1', duration: 5, position: 1 }));
      addClip(makeClip({ id: 'c3', memoId: 'memo-2', duration: 30 }));
      const summaries = getClipSummaries(['memo-1', 'memo-2', 'memo-empty']);
      expect(summaries.get('memo-1')).toEqual({ clipCount: 2, totalDuration: 15 });
      expect(summaries.get('memo-2')).toEqual({ clipCount: 1, totalDuration: 30 });
      expect(summaries.get('memo-empty')).toEqual({ clipCount: 0, totalDuration: 0 });
    });
  });

  describe('updateClipLabel', () => {
    it('updates the label on an existing clip', () => {
      addClip(makeClip({ id: 'c1', label: null }));
      updateClipLabel('c1', 'Lecture 1');
      expect(getClipById('c1')?.label).toBe('Lecture 1');
    });

    it('can revert to null', () => {
      addClip(makeClip({ id: 'c1', label: 'Initial' }));
      updateClipLabel('c1', null);
      expect(getClipById('c1')?.label).toBeNull();
    });
  });

  describe('deleteClip', () => {
    it('removes the row', async () => {
      addClip(makeClip({ id: 'c1' }));
      addClip(makeClip({ id: 'c2', position: 1 }));
      await deleteClip('c1');
      expect(getClipById('c1')).toBeNull();
      expect(getClipById('c2')).not.toBeNull();
    });

    it('does not throw for unknown id', async () => {
      await expect(deleteClip('missing')).resolves.not.toThrow();
    });
  });

  describe('getNextClipPosition', () => {
    it('returns 0 for empty memo', () => {
      expect(getNextClipPosition('memo-1')).toBe(0);
    });

    it('increments from max existing position', () => {
      addClip(makeClip({ id: 'c1', position: 0 }));
      addClip(makeClip({ id: 'c2', position: 1 }));
      addClip(makeClip({ id: 'c3', position: 2 }));
      expect(getNextClipPosition('memo-1')).toBe(3);
    });

    it('is per-memo', () => {
      addClip(makeClip({ id: 'c1', memoId: 'memo-1', position: 5 }));
      addClip(makeClip({ id: 'c2', memoId: 'memo-2', position: 0 }));
      expect(getNextClipPosition('memo-1')).toBe(6);
      expect(getNextClipPosition('memo-2')).toBe(1);
    });
  });

  describe('deleteAllClipsForMemo', () => {
    it('removes all clips for the memo only', async () => {
      addClip(makeClip({ id: 'c1', memoId: 'memo-1' }));
      addClip(makeClip({ id: 'c2', memoId: 'memo-1', position: 1 }));
      addClip(makeClip({ id: 'c3', memoId: 'memo-2' }));
      await deleteAllClipsForMemo('memo-1');
      expect(getClipsForMemo('memo-1')).toEqual([]);
      expect(getClipsForMemo('memo-2').map((c) => c.id)).toEqual(['c3']);
    });
  });

  describe('getAllClips', () => {
    it('returns clips across multiple memos', () => {
      addClip(makeClip({ id: 'c1', memoId: 'memo-1' }));
      addClip(makeClip({ id: 'c2', memoId: 'memo-2' }));
      addClip(makeClip({ id: 'c3', memoId: 'memo-3' }));
      const all = getAllClips();
      expect(all.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    });

    it('returns empty array when no clips exist', () => {
      expect(getAllClips()).toEqual([]);
    });
  });
});
