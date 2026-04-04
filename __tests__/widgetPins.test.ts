const kvStore = new Map<string, string>();

jest.mock('../src/services/database', () => ({
  kvGet: (key: string) => kvStore.get(key) ?? null,
  kvSet: (key: string, value: string) => { kvStore.set(key, value); },
  kvRemove: (key: string) => { kvStore.delete(key); },
}));

jest.mock('../src/services/timerStorage', () => ({
  loadUserTimers: jest.fn().mockResolvedValue([]),
}));

import {
  isAlarmPinned, isNotePinned, isReminderPinned, isVoiceMemoPinned, isPinned,
  getPinnedAlarms, togglePinAlarm, unpinAlarm, pruneAlarmPins,
  getPinnedNotes, togglePinNote, unpinNote, pruneNotePins,
  getPinnedReminders, togglePinReminder, unpinReminder, pruneReminderPins,
  getPinnedVoiceMemos, togglePinVoiceMemo, unpinVoiceMemo, pruneVoiceMemoPins,
} from '../src/services/widgetPins';

beforeEach(() => {
  kvStore.clear();
});

// ── Pure functions ──────────────────────────────────────────────

describe('isAlarmPinned', () => {
  it('returns true when ID is in list', () => {
    expect(isAlarmPinned('id1', ['id1', 'id2'])).toBe(true);
  });
  it('returns false when ID is not in list', () => {
    expect(isAlarmPinned('id3', ['id1', 'id2'])).toBe(false);
  });
  it('returns false for empty list', () => {
    expect(isAlarmPinned('id1', [])).toBe(false);
  });
});

describe('isNotePinned', () => {
  it('returns true when ID is in list', () => {
    expect(isNotePinned('n1', ['n1', 'n2'])).toBe(true);
  });
  it('returns false when ID is not in list', () => {
    expect(isNotePinned('n3', ['n1'])).toBe(false);
  });
  it('returns false for empty list', () => {
    expect(isNotePinned('n1', [])).toBe(false);
  });
});

describe('isReminderPinned', () => {
  it('returns true when ID is in list', () => {
    expect(isReminderPinned('r1', ['r1'])).toBe(true);
  });
  it('returns false when ID is not in list', () => {
    expect(isReminderPinned('r2', ['r1'])).toBe(false);
  });
  it('returns false for empty list', () => {
    expect(isReminderPinned('r1', [])).toBe(false);
  });
});

describe('isVoiceMemoPinned', () => {
  it('returns true when ID is in list', () => {
    expect(isVoiceMemoPinned('v1', ['v1', 'v2'])).toBe(true);
  });
  it('returns false when ID is not in list', () => {
    expect(isVoiceMemoPinned('v3', ['v1'])).toBe(false);
  });
  it('returns false for empty list', () => {
    expect(isVoiceMemoPinned('v1', [])).toBe(false);
  });
});

describe('isPinned (generic preset)', () => {
  it('returns true when ID is in list', () => {
    expect(isPinned('p1', ['p1', 'p2'])).toBe(true);
  });
  it('returns false when ID is not in list', () => {
    expect(isPinned('p3', ['p1'])).toBe(false);
  });
});

// ── Alarm pins ──────────────────────────────────────────────────

describe('Alarm pins', () => {
  describe('getPinnedAlarms', () => {
    it('returns empty array when no data stored', async () => {
      expect(await getPinnedAlarms()).toEqual([]);
    });
    it('returns stored IDs', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2']));
      expect(await getPinnedAlarms()).toEqual(['a1', 'a2']);
    });
    it('handles corrupted JSON gracefully', async () => {
      kvStore.set('widgetPinnedAlarms', '{broken');
      expect(await getPinnedAlarms()).toEqual([]);
    });
    it('filters out non-string values', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 42, null, 'a2']));
      expect(await getPinnedAlarms()).toEqual(['a1', 'a2']);
    });
  });

  describe('togglePinAlarm', () => {
    it('pins an alarm', async () => {
      const result = await togglePinAlarm('a1');
      expect(result).toEqual(['a1']);
    });
    it('unpins an already-pinned alarm', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2']));
      const result = await togglePinAlarm('a1');
      expect(result).toEqual(['a2']);
    });
    it('respects MAX_ALARM_PINS (3)', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2', 'a3']));
      const result = await togglePinAlarm('a4');
      expect(result).toEqual(['a1', 'a2', 'a3']);
    });
  });

  describe('unpinAlarm', () => {
    it('removes specific ID', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2']));
      await unpinAlarm('a1');
      expect(await getPinnedAlarms()).toEqual(['a2']);
    });
    it('no-op when ID not in list', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1']));
      await unpinAlarm('a99');
      expect(await getPinnedAlarms()).toEqual(['a1']);
    });
  });

  describe('pruneAlarmPins', () => {
    it('removes IDs not in valid set', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2', 'a3']));
      const result = await pruneAlarmPins(['a2']);
      expect(result).toEqual(['a2']);
    });
    it('keeps IDs that are in valid set', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2']));
      const result = await pruneAlarmPins(['a1', 'a2', 'a3']);
      expect(result).toEqual(['a1', 'a2']);
    });
    it('returns empty when all IDs are invalid', async () => {
      kvStore.set('widgetPinnedAlarms', JSON.stringify(['a1', 'a2']));
      const result = await pruneAlarmPins(['a99']);
      expect(result).toEqual([]);
    });
  });
});

// ── Note pins ───────────────────────────────────────────────────

describe('Note pins', () => {
  describe('getPinnedNotes', () => {
    it('returns empty array when no data stored', async () => {
      expect(await getPinnedNotes()).toEqual([]);
    });
    it('returns stored IDs', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2']));
      expect(await getPinnedNotes()).toEqual(['n1', 'n2']);
    });
    it('handles corrupted JSON gracefully', async () => {
      kvStore.set('widgetPinnedNotes', 'not-json');
      expect(await getPinnedNotes()).toEqual([]);
    });
  });

  describe('togglePinNote', () => {
    it('pins a note', async () => {
      const result = await togglePinNote('n1');
      expect(result).toContain('n1');
    });
    it('unpins an already-pinned note', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2']));
      const result = await togglePinNote('n1');
      expect(result).toEqual(['n2']);
    });
    it('respects MAX_NOTE_PINS (4)', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2', 'n3', 'n4']));
      const result = await togglePinNote('n5');
      expect(result).toEqual(['n1', 'n2', 'n3', 'n4']);
    });
  });

  describe('unpinNote', () => {
    it('removes specific ID', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2']));
      await unpinNote('n1');
      expect(await getPinnedNotes()).toEqual(['n2']);
    });
    it('no-op when ID not in list', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1']));
      await unpinNote('n99');
      expect(await getPinnedNotes()).toEqual(['n1']);
    });
  });

  describe('pruneNotePins', () => {
    it('prunes invalid IDs', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2', 'n3']));
      const result = await pruneNotePins(['n2']);
      expect(result).toEqual(['n2']);
    });
    it('keeps valid IDs', async () => {
      kvStore.set('widgetPinnedNotes', JSON.stringify(['n1', 'n2']));
      const result = await pruneNotePins(['n1', 'n2']);
      expect(result).toEqual(['n1', 'n2']);
    });
  });
});

// ── Reminder pins ───────────────────────────────────────────────

describe('Reminder pins', () => {
  describe('getPinnedReminders', () => {
    it('returns empty array when no data stored', async () => {
      expect(await getPinnedReminders()).toEqual([]);
    });
    it('returns stored IDs', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1']));
      expect(await getPinnedReminders()).toEqual(['r1']);
    });
    it('handles corrupted JSON gracefully', async () => {
      kvStore.set('widgetPinnedReminders', '{{bad');
      expect(await getPinnedReminders()).toEqual([]);
    });
  });

  describe('togglePinReminder', () => {
    it('returns true when pinned', async () => {
      const result = await togglePinReminder('r1');
      expect(result).toBe(true);
    });
    it('returns false when unpinned', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1']));
      const result = await togglePinReminder('r1');
      expect(result).toBe(false);
    });
    it('returns true (still pinned) when at MAX_REMINDER_PINS (3)', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1', 'r2', 'r3']));
      const result = await togglePinReminder('r4');
      expect(result).toBe(true);
    });
  });

  describe('unpinReminder', () => {
    it('removes specific ID', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1', 'r2']));
      await unpinReminder('r1');
      expect(await getPinnedReminders()).toEqual(['r2']);
    });
    it('no-op when ID not in list', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1']));
      await unpinReminder('r99');
      expect(await getPinnedReminders()).toEqual(['r1']);
    });
  });

  describe('pruneReminderPins', () => {
    it('prunes invalid IDs', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1', 'r2']));
      const result = await pruneReminderPins(['r2', 'r3']);
      expect(result).toEqual(['r2']);
    });
    it('keeps valid IDs', async () => {
      kvStore.set('widgetPinnedReminders', JSON.stringify(['r1']));
      const result = await pruneReminderPins(['r1']);
      expect(result).toEqual(['r1']);
    });
  });
});

// ── Voice memo pins ─────────────────────────────────────────────

describe('Voice memo pins', () => {
  describe('getPinnedVoiceMemos', () => {
    it('returns empty array when no data stored', async () => {
      expect(await getPinnedVoiceMemos()).toEqual([]);
    });
    it('returns stored IDs', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2']));
      expect(await getPinnedVoiceMemos()).toEqual(['v1', 'v2']);
    });
    it('handles corrupted JSON gracefully', async () => {
      kvStore.set('widgetPinnedVoiceMemos', 'nope');
      expect(await getPinnedVoiceMemos()).toEqual([]);
    });
  });

  describe('togglePinVoiceMemo', () => {
    it('pins a voice memo', async () => {
      const result = await togglePinVoiceMemo('v1');
      expect(result).toEqual(['v1']);
    });
    it('unpins an already-pinned voice memo', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2']));
      const result = await togglePinVoiceMemo('v1');
      expect(result).toEqual(['v2']);
    });
    it('respects MAX_VOICE_MEMO_PINS (4)', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2', 'v3', 'v4']));
      const result = await togglePinVoiceMemo('v5');
      expect(result).toEqual(['v1', 'v2', 'v3', 'v4']);
    });
  });

  describe('unpinVoiceMemo', () => {
    it('removes specific ID', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2']));
      await unpinVoiceMemo('v1');
      expect(await getPinnedVoiceMemos()).toEqual(['v2']);
    });
    it('no-op when ID not in list', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1']));
      await unpinVoiceMemo('v99');
      expect(await getPinnedVoiceMemos()).toEqual(['v1']);
    });
  });

  describe('pruneVoiceMemoPins', () => {
    it('prunes invalid IDs', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2']));
      const result = await pruneVoiceMemoPins(['v1']);
      expect(result).toEqual(['v1']);
    });
    it('keeps valid IDs', async () => {
      kvStore.set('widgetPinnedVoiceMemos', JSON.stringify(['v1', 'v2']));
      const result = await pruneVoiceMemoPins(['v1', 'v2', 'v3']);
      expect(result).toEqual(['v1', 'v2']);
    });
  });
});
