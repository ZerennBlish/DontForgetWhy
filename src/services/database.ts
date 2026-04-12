import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _db: SQLite.SQLiteDatabase | null = null;
let _restoreInProgress = false;

export function setRestoreInProgress(active: boolean): void {
  _restoreInProgress = active;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (_restoreInProgress) {
    throw new Error('Database unavailable during restore');
  }
  if (!_db) {
    const db = SQLite.openDatabaseSync('dfw.db');
    _initSchema(db);
    _db = db;
  }
  return _db;
}

/**
 * Close the database connection. Required before replacing the DB file
 * during backup restore. After calling this, the next getDb() call will
 * reopen and reinitialize the connection.
 */
export function closeDb(): void {
  if (_db) {
    try {
      _db.closeSync();
    } catch (e) {
      console.warn('[DB] Error closing database:', e);
    }
    _db = null;
  }
}

/**
 * Force reopen the database. Use after replacing the DB file during restore.
 * Returns the new database instance.
 */
export function reopenDb(): SQLite.SQLiteDatabase {
  closeDb();
  return getDb();
}

// ---------------------------------------------------------------------------
// Schema v1
// ---------------------------------------------------------------------------

function _initSchema(db: SQLite.SQLiteDatabase): void {
  console.log('[DB] _initSchema starting...');

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      note TEXT NOT NULL,
      quote TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      mode TEXT NOT NULL DEFAULT 'recurring',
      days TEXT,
      date TEXT,
      category TEXT NOT NULL,
      icon TEXT,
      nickname TEXT,
      guessWhy INTEGER NOT NULL DEFAULT 0,
      "private" INTEGER NOT NULL DEFAULT 0,
      soundId TEXT DEFAULT 'default',
      soundUri TEXT,
      soundName TEXT,
      nativeSoundId INTEGER,
      photoUri TEXT,
      notificationIds TEXT,
      createdAt TEXT NOT NULL,
      deletedAt TEXT
    )`);
  } catch (e) {
    console.error('[DB] Failed to create alarms table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      icon TEXT NOT NULL,
      nickname TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completedAt TEXT,
      "private" INTEGER NOT NULL DEFAULT 0,
      recurring INTEGER NOT NULL DEFAULT 0,
      dueDate TEXT,
      dueTime TEXT,
      days TEXT,
      soundId TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      notificationId TEXT,
      notificationIds TEXT,
      completionHistory TEXT,
      createdAt TEXT NOT NULL,
      deletedAt TEXT
    )`);
  } catch (e) {
    console.error('[DB] Failed to create reminders table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#FFFFFF',
      icon TEXT DEFAULT '',
      fontColor TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      images TEXT,
      voiceMemos TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    )`);
  } catch (e) {
    console.error('[DB] Failed to create notes table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS voice_memos (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL DEFAULT 0,
      noteId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    )`);
  } catch (e) {
    console.error('[DB] Failed to create voice_memos table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS voice_clips (
      id TEXT PRIMARY KEY,
      memoId TEXT NOT NULL,
      uri TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memoId) REFERENCES voice_memos(id) ON DELETE CASCADE
    )`);
  } catch (e) {
    console.error('[DB] Failed to create voice_clips table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS active_timers (
      id TEXT PRIMARY KEY,
      presetId TEXT NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      totalSeconds INTEGER NOT NULL,
      remainingSeconds INTEGER NOT NULL,
      startedAt TEXT NOT NULL,
      isRunning INTEGER NOT NULL DEFAULT 1,
      notificationId TEXT,
      soundId TEXT
    )`);
  } catch (e) {
    console.error('[DB] Failed to create active_timers table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS user_timers (
      id TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      label TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      soundId TEXT,
      createdAt TEXT NOT NULL
    )`);
  } catch (e) {
    console.error('[DB] Failed to create user_timers table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
  } catch (e) {
    console.error('[DB] Failed to create kv_store table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS chess_game (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      fen TEXT NOT NULL,
      playerColor TEXT NOT NULL CHECK (playerColor IN ('w', 'b')),
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4),
      moveHistory TEXT NOT NULL DEFAULT '[]',
      takeBackUsed INTEGER NOT NULL DEFAULT 0,
      blunderCount INTEGER NOT NULL DEFAULT 0,
      startedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);
  } catch (e) {
    console.error('[DB] Failed to create chess_game table:', e);
  }

  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS checkers_game (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      board TEXT NOT NULL,
      turn TEXT NOT NULL CHECK (turn IN ('r', 'b')),
      playerColor TEXT NOT NULL CHECK (playerColor IN ('r', 'b')),
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4),
      rules TEXT NOT NULL DEFAULT 'american' CHECK (rules IN ('american', 'freestyle')),
      moveCount INTEGER NOT NULL DEFAULT 0,
      startedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);
  } catch (e) {
    console.error('[DB] Failed to create checkers_game table:', e);
  }

  // --- Migrate legacy voice memos (single uri) → voice_clips rows ---
  try {
    const legacyMemos = db.getAllSync<{ id: string; uri: string; duration: number; createdAt: string }>(
      `SELECT id, uri, duration, createdAt FROM voice_memos WHERE uri != '' AND uri IS NOT NULL`,
    );
    for (const m of legacyMemos) {
      const existing = db.getFirstSync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM voice_clips WHERE memoId = ?',
        [m.id],
      );
      if (!existing || existing.cnt === 0) {
        const clipId = `${m.id}_clip0`;
        db.runSync(
          `INSERT INTO voice_clips (id, memoId, uri, duration, position, label, createdAt)
           VALUES (?, ?, ?, ?, 0, NULL, ?)`,
          [clipId, m.id, m.uri, m.duration, m.createdAt],
        );
      }
      db.runSync(
        `UPDATE voice_memos SET uri = '', duration = 0 WHERE id = ?`,
        [m.id],
      );
    }
    if (legacyMemos.length > 0) {
      console.log(`[DB] Migrated ${legacyMemos.length} voice memo(s) to clips`);
    }
  } catch (e) {
    console.error('[DB] Voice clip migration failed:', e);
  }

  // --- Add images column to voice_memos if missing ---
  try {
    const cols = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(voice_memos)`
    );
    const hasImages = cols.some((c) => c.name === 'images');
    if (!hasImages) {
      db.execSync(`ALTER TABLE voice_memos ADD COLUMN images TEXT NOT NULL DEFAULT '[]'`);
      console.log('[DB] Added images column to voice_memos');
    }
  } catch (e) {
    console.error('[DB] voice_memos images migration failed:', e);
  }

  console.log('[DB] _initSchema complete');
}

// ---------------------------------------------------------------------------
// KV helpers
// ---------------------------------------------------------------------------

export function kvGet(key: string): string | null {
  const db = getDb();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export function kvSet(key: string, value: string): void {
  const db = getDb();
  db.runSync(
    'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export function kvRemove(key: string): void {
  const db = getDb();
  db.runSync('DELETE FROM kv_store WHERE key = ?', [key]);
}

// ---------------------------------------------------------------------------
// AsyncStorage → SQLite migration
// ---------------------------------------------------------------------------

const KV_KEYS = [
  'appSettings',
  'appTheme',
  'onboardingComplete',
  'defaultTimerSound',
  'silenceAllAlarms',
  'hapticsEnabled',
  'voiceRoastsEnabled',
  'voiceIntroPlayed',
  'bg_main',
  'bg_overlay_opacity',
  'timerPresets',
  'recentPresets',
  'note_custom_bg_color',
  'note_custom_font_color',
  'noteCustomBgColor',
  'noteCustomFontColor',
  'notepadOnboarded',
  'guessWhyStats',
  'memoryMatchScores',
  'sudokuBestScores',
  'sudokuCurrentGame',
  'dailyRiddleStats',
  'triviaStats',
  'triviaSeenQuestions',
  'widgetPinnedPresets',
  'widgetPinnedAlarms',
  'widgetPinnedReminders',
  'widgetPinnedNotes',
  'widgetPinnedVoiceMemos',
  'handledNotifIds',
  'pendingNoteAction',
  'pendingAlarmAction',
  'pendingReminderAction',
  'pendingAlarmListAction',
  'pendingReminderListAction',
  'pendingTimerAction',
  'pendingCalendarAction',
  'pendingVoiceAction',
  'streakCount',
];

const ENTITY_KEYS = [
  'alarms',
  'reminders',
  'notes',
  'voiceMemos',
  'voiceClips',
  'activeTimers',
  'userTimers',
] as const;

/** Convert a JS value to 0/1 for SQLite INTEGER columns. */
function boolInt(v: unknown): number {
  return v ? 1 : 0;
}

/** JSON.stringify if value is non-null, otherwise null. */
function jsonOrNull(v: unknown): string | null {
  if (v == null) return null;
  return JSON.stringify(v);
}

// ---- Per-entity insert helpers -------------------------------------------

function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

function _insertAlarms(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const a = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO alarms
          (id, time, note, quote, enabled, mode, days, date, category, icon,
           nickname, guessWhy, "private", soundId, soundUri, soundName, nativeSoundId,
           photoUri, notificationIds, createdAt, deletedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          a.id,
          a.time,
          a.note,
          a.quote ?? '',
          boolInt(a.enabled),
          a.mode ?? 'recurring',
          jsonOrNull(a.days),
          a.date ?? null,
          a.category,
          a.icon ?? null,
          a.nickname ?? null,
          boolInt(a.guessWhy),
          boolInt(a.private),
          a.soundId ?? 'default',
          a.soundUri ?? null,
          a.soundName ?? null,
          a.soundID ?? null,
          a.photoUri ?? null,
          jsonOrNull(a.notificationIds),
          a.createdAt,
          a.deletedAt ?? null,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed alarm row:', e);
    }
  }
}

function _insertReminders(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const r = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO reminders
          (id, text, icon, nickname, completed, completedAt, "private", recurring,
           dueDate, dueTime, days, soundId, pinned, notificationId,
           notificationIds, completionHistory, createdAt, deletedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          r.id,
          r.text,
          r.icon,
          r.nickname ?? null,
          boolInt(r.completed),
          r.completedAt ?? null,
          boolInt(r.private),
          boolInt(r.recurring),
          r.dueDate ?? null,
          r.dueTime ?? null,
          jsonOrNull(r.days),
          r.soundId ?? null,
          boolInt(r.pinned),
          r.notificationId ?? null,
          jsonOrNull(r.notificationIds),
          jsonOrNull(r.completionHistory),
          r.createdAt,
          r.deletedAt ?? null,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed reminder row:', e);
    }
  }
}

function _insertNotes(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const n = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO notes
          (id, text, color, icon, fontColor, pinned, images, voiceMemos,
           createdAt, updatedAt, deletedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          n.id,
          n.text,
          n.color ?? '#FFFFFF',
          n.icon ?? '',
          n.fontColor ?? null,
          boolInt(n.pinned),
          jsonOrNull(n.images),
          jsonOrNull(n.voiceMemos),
          n.createdAt,
          n.updatedAt,
          n.deletedAt ?? null,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed note row:', e);
    }
  }
}

function _insertVoiceMemos(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const v = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO voice_memos
          (id, uri, title, note, duration, noteId,
           createdAt, updatedAt, deletedAt, images)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          v.id,
          v.uri,
          v.title,
          v.note ?? '',
          v.duration ?? 0,
          v.noteId ?? null,
          v.createdAt,
          v.updatedAt,
          v.deletedAt ?? null,
          jsonOrNull(v.images) ?? '[]',
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed voice memo row:', e);
    }
  }
}

function _insertVoiceClips(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const c = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO voice_clips
          (id, memoId, uri, duration, position, label, createdAt)
         VALUES (?,?,?,?,?,?,?)`,
        [
          c.id,
          c.memoId,
          c.uri,
          c.duration ?? 0,
          c.position ?? 0,
          c.label ?? null,
          c.createdAt,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed voice clip row:', e);
    }
  }
}

function _insertActiveTimers(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const t = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO active_timers
          (id, presetId, label, icon, totalSeconds, remainingSeconds,
           startedAt, isRunning, notificationId, soundId)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          t.id,
          t.presetId,
          t.label,
          t.icon,
          t.totalSeconds,
          t.remainingSeconds,
          t.startedAt,
          boolInt(t.isRunning),
          t.notificationId ?? null,
          t.soundId ?? null,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed active timer row:', e);
    }
  }
}

function _insertUserTimers(db: SQLite.SQLiteDatabase, items: unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    const t = item as Record<string, any>;
    try {
      db.runSync(
        `INSERT OR IGNORE INTO user_timers
          (id, icon, label, seconds, soundId, createdAt)
         VALUES (?,?,?,?,?,?)`,
        [
          t.id,
          t.icon,
          t.label,
          t.seconds,
          t.soundId ?? null,
          t.createdAt,
        ],
      );
    } catch (e) {
      console.warn('[migration] Skipping malformed user timer row:', e);
    }
  }
}

// ---- Entity inserter dispatch --------------------------------------------

const ENTITY_INSERTERS: Record<
  (typeof ENTITY_KEYS)[number],
  (db: SQLite.SQLiteDatabase, items: unknown[]) => void
> = {
  alarms: _insertAlarms,
  reminders: _insertReminders,
  notes: _insertNotes,
  voiceMemos: _insertVoiceMemos,
  voiceClips: _insertVoiceClips,
  activeTimers: _insertActiveTimers,
  userTimers: _insertUserTimers,
};

// ---- Public migration entry point ----------------------------------------

export async function migrateFromAsyncStorage(): Promise<void> {
  const db = getDb();

  // Already fully migrated?
  const migrated = db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?',
    ['_migrated'],
  );
  if (migrated) return;

  // Detect previous partial-failure retry list. If present, we only retry
  // the entities that failed last time; entities that succeeded are skipped.
  const partialFailed = db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?',
    ['_migrated_failed'],
  );
  let retryKeys: Set<string> | null = null;
  if (partialFailed) {
    try {
      const parsed = JSON.parse(partialFailed.value);
      if (Array.isArray(parsed)) {
        retryKeys = new Set(parsed.filter((k): k is string => typeof k === 'string'));
      }
    } catch {
      retryKeys = null;
    }
  }

  try {
    // Read all keys we care about from AsyncStorage (async)
    const allKeys = [...ENTITY_KEYS, ...KV_KEYS];
    const pairs = await AsyncStorage.multiGet(allKeys);

    // Build lookup: key → raw string value
    const data = new Map<string, string>();
    for (const [key, value] of pairs) {
      if (value != null) data.set(key, value);
    }

    const failedKeys: string[] = [];

    // Write everything inside a single transaction (sync)
    db.withTransactionSync(() => {
      // Entity tables
      for (const key of ENTITY_KEYS) {
        // On retry, skip entities that succeeded last time
        if (retryKeys && !retryKeys.has(key)) continue;
        const raw = data.get(key);
        if (!raw) continue;
        try {
          const items = JSON.parse(raw);
          if (Array.isArray(items) && items.length > 0) {
            ENTITY_INSERTERS[key](db, items);
          }
        } catch {
          console.warn(`[migration] Failed to parse entity key "${key}"`);
          failedKeys.push(key);
        }
      }

      // KV keys — idempotent via INSERT OR IGNORE, safe to re-run on retry
      for (const key of KV_KEYS) {
        const raw = data.get(key);
        if (raw != null) {
          db.runSync(
            'INSERT OR IGNORE INTO kv_store (key, value) VALUES (?, ?)',
            [key, raw],
          );
        }
      }

      // Completion tracking: only mark _migrated=1 if all entities succeeded.
      // Otherwise record the failed keys so next launch retries only those.
      if (failedKeys.length === 0) {
        db.runSync(
          'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
          ['_migrated', '1'],
        );
        db.runSync('DELETE FROM kv_store WHERE key = ?', ['_migrated_failed']);
      } else {
        db.runSync(
          'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
          ['_migrated_failed', JSON.stringify(failedKeys)],
        );
      }
    });

    if (failedKeys.length === 0) {
      console.log('[migration] AsyncStorage → SQLite migration complete');
    } else {
      console.warn('[migration] Migration partially complete. Failed keys:', failedKeys);
    }
  } catch (e) {
    console.error('[migration] Migration failed:', e);
    // Do NOT set _migrated — will retry on next launch
  }
}
