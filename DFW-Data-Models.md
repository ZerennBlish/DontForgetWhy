# DFW Data Models
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 16 (April 5, 2026)

---

## 1. Alarm

```typescript
interface Alarm {
  id: string; time: string; nickname?: string; note: string; quote: string;
  enabled: boolean; mode: 'recurring' | 'one-time'; days: AlarmDay[];
  date: string | null; category: AlarmCategory; icon?: string;
  private: boolean; guessWhy?: boolean; createdAt: string;
  notificationIds: string[]; soundId?: string; soundUri?: string | null;
  soundName?: string | null; soundID?: number | null;  // maps to `nativeSoundId` column in SQLite (renamed from soundID due to case-insensitive collision with soundId)
  photoUri?: string | null;  // per-alarm wake-up photo (P2 2.4)
  deletedAt?: string | null;
}
```

**Alarm photo storage:** Photos stored at `${Paths.document}alarm-photos/`. Filename: `alarm_${alarmId}_${timestamp}.jpg`. Service: `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto`, `deleteAlarmPhoto`, `alarmPhotoExists`. Deferred save pattern: photo stays in ImagePicker temp cache during form editing, only copied to permanent storage when alarm save succeeds. Old photo deleted only after new one confirmed. Cancel never touches filesystem. Photo cleanup: `permanentlyDeleteAlarm` and `purgeDeletedAlarms` (30-day) both delete photo files. Soft-delete keeps photo on disk.

---

## 2. Reminder

```typescript
interface Reminder {
  id: string; icon: string; text: string; nickname?: string;
  private: boolean; completed: boolean; createdAt: string;
  completedAt: string | null; dueDate: string | null; dueTime: string | null;
  notificationId: string | null; pinned: boolean; deletedAt?: string | null;
  days?: string[]; recurring?: boolean; notificationIds?: string[];
  completionHistory?: CompletionEntry[]; soundId?: string;
}
```

---

## 3. Note

```typescript
interface Note {
  id: string; text: string; icon: string; color: string;
  fontColor?: string | null; pinned: boolean; createdAt: string;
  updatedAt: string; deletedAt?: string | null;
  images?: string[];  // file:// URIs to locally stored images (max 3)
  voiceMemos?: string[];  // file:// URIs to note-attached voice memos (max 3 shared with images)
}
```

**Voice memo column:** `voiceMemos TEXT` in SQLite (JSON array). Shares the 3-attachment limit with images. Managed by `noteVoiceMemoStorage.ts`.

**Image storage:** Images stored on filesystem at `${FileSystem.documentDirectory}note-images/`. Photos: `${noteId}_${timestamp}_${uuid8}.jpg`. Drawings: `${noteId}_${timestamp}_${uuid8}.png` + companion `.json` (stroke data for re-editing). Service: `src/services/noteImageStorage.ts` — `saveNoteImage` detects .png/.jpg extension, copies companion .json alongside PNGs. `deleteNoteImage` also deletes companion .json. `loadDrawingData` reads companion .json (early-returns null for .jpg). `getDrawingJsonUri` derives .json path from .png path. All use directory-based File constructors (`new File(dir, filename)`) for reliability. `noteStorage.ts` auto-cleans images on permanent delete and 30-day purge.

---

## 4. ActiveTimer / UserTimer

```typescript
interface ActiveTimer {
  id: string; presetId: string; label: string; icon: string;
  totalSeconds: number; remainingSeconds: number; startedAt: string;
  isRunning: boolean; notificationId?: string; soundId?: string;
}
interface UserTimer {
  id: string; icon: string; label: string; seconds: number;
  createdAt: string; soundId?: string;
}
```

---

## 5. VoiceMemo

```typescript
interface VoiceMemo {
  id: string;          // UUID
  uri: string;         // file:// URI to .m4a file in permanent storage
  title: string;       // user-editable, can be empty
  note: string;        // user-editable, can be empty
  duration: number;    // recording length in seconds
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp, updated on title/note edit
  deletedAt?: string | null;  // soft-delete timestamp, null when active
  noteId?: string | null;     // optional link to a Note (future use)
}
```

- **Storage:** SQLite `voice_memos` table. Service: `src/services/voiceMemoStorage.ts`
- **Soft-delete:** same 30-day pattern as Notes/Alarms — `deletedAt` set on delete, cleared on restore, filtered out by `getVoiceMemos()`, included by `getAllVoiceMemos()`
- **Error handling:** all mutator functions re-throw after `console.error` (unlike other storage services that swallow errors) — lets callers show error UI instead of false success
- **File storage:** `.m4a` files stored at `${Paths.document}voice-memos/`. Filename format: `{memoId}_{timestamp}.m4a`. Service: `src/services/voiceMemoFileStorage.ts` — `saveVoiceMemoFile` (copies from cache to permanent, cleans source), `deleteVoiceMemoFile`, `deleteAllVoiceMemoFiles`. Same pattern as `noteImageStorage` but simpler (no companion JSON files)

---

## 6. SQLite Storage

All data stored in `dfw.db` via `expo-sqlite`. Entity tables: `alarms`, `reminders`, `notes`, `voice_memos`, `active_timers`, `user_timers`. KV store (`kv_store` table) for settings, game stats, widget pins, pending actions, and ephemeral flags. See DFW-Architecture.md Section 8 for full table and key listing.

### ThemeColors Interface (Session 9)

```typescript
interface ThemeColors {
  mode: 'dark' | 'light';
  background: string; card: string; cardElevated: string; accent: string;
  textPrimary: string; textSecondary: string; textTertiary: string; border: string;
  red: string; orange: string; activeBackground: string;
  overlayWin: string; overlayLose: string; overlaySkip: string;
  overlayButton: string; overlayText: string; modalOverlay: string;
  // Section colors — every theme defines its own palette
  sectionAlarm: string; sectionReminder: string; sectionCalendar: string;
  sectionNotepad: string; sectionVoice: string; sectionTimer: string; sectionGames: string;
  brandTitle: string;
}
```

**ThemeName:** `'dark' | 'light' | 'highContrast' | 'vivid'` — custom theme removed. `customTheme` kv_store key cleaned up on migration.

---

## 7. Backup Manifest (backup-meta.json)
Included in every .dfw backup file.

| Field | Type | Description |
|-------|------|-------------|
| appVersion | string | App version at export time (e.g. "1.11.0") |
| backupVersion | number | Schema version. Currently 1. Must match exactly on import. |
| createdAt | string | ISO timestamp of export |
| contents.database | boolean | Whether dfw.db is included |
| contents.voiceMemos | number | Count of voice memo files |
| contents.noteImages | number | Count of note image files |
| contents.alarmPhotos | number | Count of alarm photo files |
| contents.backgrounds | number | Count of background image files |

---

## 8. Backup-Related kv_store Keys

| Key | Type | Description |
|-----|------|-------------|
| lastBackupDate | string | ISO string, updated on manual export |
| lastAutoBackupDate | string | ISO string, updated on auto-export |
| autoBackupEnabled | string | 'true'/'false' |
| autoBackupFolderUri | string | SAF directory URI |
| autoBackupFolderName | string | Human-readable folder name |
| autoBackupFrequency | string | 'daily'/'weekly'/'monthly' |

### WidgetTheme Interface (Session 11)

```typescript
interface WidgetTheme {
  bg: string; cellBg: string; text: string; textSecondary: string;
  accent: string; border: string; red: string;  // Session 11: theme-aware red for record button, destructive actions
  // Section colors
  sectionAlarm: string; sectionReminder: string; sectionCalendar: string;
  sectionNotepad: string; sectionVoice: string; sectionTimer: string; sectionGames: string;
}
```

---

## 9. Chess (Session 16)

### SavedChessGame

```typescript
interface SavedChessGame {
  fen: string;              // chess.js FEN — current position only
  playerColor: 'w' | 'b';
  difficulty: number;       // 0..4 index into DIFFICULTY_LEVELS
  moveHistory: string[];    // SAN moves in order — replayed on load
  takeBackUsed: boolean;
  blunderCount: number;     // player's blunders + catastrophes this game
  startedAt: string;        // ISO
  updatedAt: string;        // ISO
}
```

### chess_game table

```sql
CREATE TABLE IF NOT EXISTS chess_game (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fen TEXT NOT NULL,
  playerColor TEXT NOT NULL CHECK (playerColor IN ('w', 'b')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4),
  moveHistory TEXT NOT NULL DEFAULT '[]',
  takeBackUsed INTEGER NOT NULL DEFAULT 0,
  blunderCount INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
```

Single-row table (id=1 enforced via CHECK). `moveHistory` stored as JSON string, `takeBackUsed` as 0/1. One active game at a time; cleared on win/loss/draw/resign/newGame. FEN is stored for quick restore check, but history replay is canonical — loading via FEN alone produces an empty chess.js history and silently breaks take-back + move counter.

### BlunderResult (analyzeMove output)

```typescript
interface BlunderResult {
  severity: 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'catastrophe';
  centipawnLoss: number;  // always >= 0, player's perspective
  bestMove: string | null;  // SAN of best move at given depth
}
```

Severity bucketing: `good` <50cp, `inaccuracy` <150cp, `mistake` <300cp, `blunder` <600cp, `catastrophe` ≥600cp.

### DifficultyLevel

```typescript
interface DifficultyLevel {
  name: string;       // 'Beginner' | 'Casual' | 'Intermediate' | 'Advanced' | 'Expert'
  depth: number;      // max iterative-deepening depth (2..6)
  randomness: number; // 0 = always best; higher = static-eval noise threshold (cp/100)
}
```

Paired with module-level `TIME_LIMITS_MS = [300, 500, 1000, 2000, 5000]` (ms per difficulty). This array is the single source of truth — `useChess` imports it for the thinking indicator budget, `getAIMove` uses it to cap iterative deepening.

### chessStats (kv_store)

```typescript
interface ChessStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;  // cumulative across all games (wins + half-draw − 2 × blunders, floor 0 per game)
}
```

Stored as JSON string under kv_store key `chessStats`. Composite Memory Score derived via `scoreChess`: `cap(totalPoints / 5, 20)` — scales cumulative chess points into the 0-20 per-game Memory Score band.

### Chess Scoring by Difficulty

| Difficulty | Win points | Draw points |
|------------|-----------|-------------|
| Beginner | 5 | 2.5 |
| Casual | 8 | 4 |
| Intermediate | 12 | 6 |
| Advanced | 18 | 9 |
| Expert | 25 | 12.5 |

Blunder penalty: −2 cp per blunder/catastrophe committed during the game. Per-game minimum: 0 (never goes negative). Resignation counts as a loss (0 points).
