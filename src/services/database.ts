import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('dfw.db');
    _initSchema(_db);
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Schema v1
// ---------------------------------------------------------------------------

function _initSchema(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alarms (
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
      private INTEGER NOT NULL DEFAULT 0,
      soundId TEXT DEFAULT 'default',
      soundUri TEXT,
      soundName TEXT,
      soundID INTEGER,
      photoUri TEXT,
      notificationIds TEXT,
      createdAt TEXT NOT NULL,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      icon TEXT NOT NULL,
      nickname TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completedAt TEXT,
      private INTEGER NOT NULL DEFAULT 0,
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
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#FFFFFF',
      icon TEXT DEFAULT '',
      fontColor TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      images TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS voice_memos (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL DEFAULT 0,
      noteId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS active_timers (
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
    );

    CREATE TABLE IF NOT EXISTS user_timers (
      id TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      label TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      soundId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forget_log (
      id TEXT PRIMARY KEY,
      alarmNote TEXT NOT NULL,
      alarmNickname TEXT,
      alarmIcon TEXT,
      alarmCategory TEXT NOT NULL,
      result TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
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
  'voiceEnabled',
  'introPlayed',
  'bg_main',
  'bg_overlay_opacity',
  'timerPresets',
  'recentPresets',
  'notepad_customBgColor',
  'notepad_customFontColor',
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
  'activeTimers',
  'userTimers',
  'forgetLog',
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

function _insertAlarms(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const a of items) {
    db.runSync(
      `INSERT OR IGNORE INTO alarms
        (id, time, note, quote, enabled, mode, days, date, category, icon,
         nickname, guessWhy, private, soundId, soundUri, soundName, soundID,
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
  }
}

function _insertReminders(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const r of items) {
    db.runSync(
      `INSERT OR IGNORE INTO reminders
        (id, text, icon, nickname, completed, completedAt, private, recurring,
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
  }
}

function _insertNotes(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const n of items) {
    db.runSync(
      `INSERT OR IGNORE INTO notes
        (id, text, color, icon, fontColor, pinned, images,
         createdAt, updatedAt, deletedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        n.id,
        n.text,
        n.color ?? '#FFFFFF',
        n.icon ?? '',
        n.fontColor ?? null,
        boolInt(n.pinned),
        jsonOrNull(n.images),
        n.createdAt,
        n.updatedAt,
        n.deletedAt ?? null,
      ],
    );
  }
}

function _insertVoiceMemos(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const v of items) {
    db.runSync(
      `INSERT OR IGNORE INTO voice_memos
        (id, uri, title, note, duration, noteId,
         createdAt, updatedAt, deletedAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
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
      ],
    );
  }
}

function _insertActiveTimers(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const t of items) {
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
  }
}

function _insertUserTimers(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const t of items) {
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
  }
}

function _insertForgetLog(db: SQLite.SQLiteDatabase, items: any[]): void {
  for (const f of items) {
    db.runSync(
      `INSERT OR IGNORE INTO forget_log
        (id, alarmNote, alarmNickname, alarmIcon, alarmCategory, result, timestamp)
       VALUES (?,?,?,?,?,?,?)`,
      [
        f.id,
        f.alarmNote,
        f.alarmNickname ?? null,
        f.alarmIcon ?? null,
        f.alarmCategory,
        f.result,
        f.timestamp,
      ],
    );
  }
}

// ---- Entity inserter dispatch --------------------------------------------

const ENTITY_INSERTERS: Record<
  (typeof ENTITY_KEYS)[number],
  (db: SQLite.SQLiteDatabase, items: any[]) => void
> = {
  alarms: _insertAlarms,
  reminders: _insertReminders,
  notes: _insertNotes,
  voiceMemos: _insertVoiceMemos,
  activeTimers: _insertActiveTimers,
  userTimers: _insertUserTimers,
  forgetLog: _insertForgetLog,
};

// ---- Public migration entry point ----------------------------------------

export async function migrateFromAsyncStorage(): Promise<void> {
  const db = getDb();

  // Already migrated?
  const migrated = db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?',
    ['_migrated'],
  );
  if (migrated) return;

  try {
    // Read all keys we care about from AsyncStorage (async)
    const allKeys = [...ENTITY_KEYS, ...KV_KEYS];
    const pairs = await AsyncStorage.multiGet(allKeys);

    // Build lookup: key → raw string value
    const data = new Map<string, string>();
    for (const [key, value] of pairs) {
      if (value != null) data.set(key, value);
    }

    // Write everything inside a single transaction (sync)
    db.withTransactionSync(() => {
      // Entity tables
      for (const key of ENTITY_KEYS) {
        const raw = data.get(key);
        if (!raw) continue;
        try {
          const items = JSON.parse(raw);
          if (Array.isArray(items) && items.length > 0) {
            ENTITY_INSERTERS[key](db, items);
          }
        } catch {
          console.warn(`[migration] Failed to parse entity key "${key}"`);
        }
      }

      // KV keys
      for (const key of KV_KEYS) {
        const raw = data.get(key);
        if (raw != null) {
          db.runSync(
            'INSERT OR IGNORE INTO kv_store (key, value) VALUES (?, ?)',
            [key, raw],
          );
        }
      }

      // Mark migration complete
      db.runSync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['_migrated', '1'],
      );
    });

    console.log('[migration] AsyncStorage → SQLite migration complete');
  } catch (e) {
    console.error('[migration] Migration failed:', e);
    // Do NOT set _migrated — will retry on next launch
  }
}
