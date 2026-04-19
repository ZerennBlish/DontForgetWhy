# DFW Data Models
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 32 (April 16, 2026)

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
  id: string; title: string; text: string; icon: string; color: string;
  fontColor?: string | null; pinned: boolean; createdAt: string;
  updatedAt: string; deletedAt?: string | null;
  images?: string[];  // file:// URIs to locally stored images (max 5 shared, Session 27)
  voiceMemos?: string[];  // file:// URIs to legacy note-attached voice memos (recording removed Session 27, playback only)
}
```

**Title field (Session 27):** `title TEXT NOT NULL DEFAULT ''` — optional display title shown above the body text in both edit and view modes. Added via `ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT ''` migration + NULL backfill. Empty string sentinel means "no title". NoteCard displays title as the primary line when non-empty, body text as a 2-line preview below.

**Voice memo column:** `voiceMemos TEXT` in SQLite (JSON array). Shares the 5-attachment limit with images. Managed by `noteVoiceMemoStorage.ts`. **Note (Session 27):** Voice recording inside notes was removed — no new voice memos can be added. `MemoCard` legacy playback kept for existing notes until the data is fully migrated away.

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

## 5. VoiceMemo (rewritten Session 26)

```typescript
interface VoiceMemo {
  id: string;                  // UUID
  uri: string;                 // LEGACY — empty for memos created Session 26+
  title: string;               // user-editable, can be empty
  note: string;                // user-editable, can be empty
  duration: number;            // LEGACY — 0 for memos created Session 26+
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp, updated on title/note edit
  deletedAt?: string | null;   // soft-delete timestamp, null when active
  noteId?: string | null;      // optional link to a Note (future use)
  images?: string[];           // Session 26: file URIs for attached photos (max 5)
  // --- Populated at read time, not stored ---
  clips?: VoiceClip[];         // hydrated by detail screen via getClipsForMemo
  clipCount?: number;          // hydrated by list screen via getClipSummaries
  totalDuration?: number;      // hydrated by list screen via getClipSummaries
}
```

```typescript
interface VoiceClip {
  id: string;             // UUID
  memoId: string;         // FK → voice_memos.id
  uri: string;            // file:// URI to .m4a clip file
  duration: number;       // clip length in seconds
  position: number;       // sort order within the memo (0-based)
  label: string | null;   // null = render formatted createdAt, string = user override
  createdAt: string;      // ISO timestamp
}
```

- **Memos as containers (Session 26):** A voice memo is now a container holding zero or more `VoiceClip` rows. Audio data lives in `voice_clips`. Legacy `uri`/`duration` columns kept on `voice_memos` for backward compat (set empty/0 for new memos)
- **Storage:** SQLite `voice_memos` + `voice_clips` tables. Services: `src/services/voiceMemoStorage.ts`, `src/services/voiceClipStorage.ts`
- **Soft-delete:** same 30-day pattern as Notes/Alarms — `deletedAt` set on delete, cleared on restore, filtered out by `getVoiceMemos()`, included by `getAllVoiceMemos()`. `permanentlyDeleteVoiceMemo` cascades: deletes attached photo files, deletes all clip rows + audio files, then deletes the memo row
- **Error handling:** mutator functions re-throw after `console.error` (unlike other storage services that swallow errors) — lets callers show error UI instead of false success
- **Audio file storage:** `.m4a` clip files stored at `${Paths.document}voice-memos/`. Filename format: `{clipId}_{timestamp}.m4a`. Service: `src/services/voiceMemoFileStorage.ts` — `saveVoiceClipFile` (copies from cache to permanent, cleans source), `deleteVoiceMemoFile`, `deleteAllVoiceMemoFiles`
- **Photo storage:** `${Paths.document}voice-memo-images/`. Filename: `{memoId}_{timestamp}_{shortId}.{jpg|png}`. Service: `src/services/voiceMemoImageStorage.ts` — `saveVoiceMemoImage`, `deleteVoiceMemoImage`, `deleteAllVoiceMemoImages`. Simpler than `noteImageStorage` — no companion JSON, no drawing
- **`images` JSON validation:** `rowToMemo` parses with try/catch AND `Array.isArray` guard — malformed JSON or non-array values fall back to `[]`

---

## 6. SQLite Storage

All data stored in `dfw.db` via `expo-sqlite`. Entity tables: `alarms`, `reminders`, `notes`, `voice_memos`, `voice_clips` (Session 26), `active_timers`, `user_timers`. KV store (`kv_store` table) for settings, game stats, widget pins, pending actions, and ephemeral flags. See DFW-Architecture.md Section 8 for full table and key listing.

### voice_memos table (Session 26 schema)
```sql
CREATE TABLE IF NOT EXISTS voice_memos (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,                          -- legacy, '' for Session 26+
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,        -- legacy, 0 for Session 26+
  noteId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  images TEXT NOT NULL DEFAULT '[]'           -- Session 26 — JSON array of photo URIs
);
```

### voice_clips table (Session 26)
```sql
CREATE TABLE IF NOT EXISTS voice_clips (
  id TEXT PRIMARY KEY,
  memoId TEXT NOT NULL,
  uri TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (memoId) REFERENCES voice_memos(id) ON DELETE CASCADE
);
```

Migration in `_initSchema` scans `voice_memos` rows with non-empty `uri`, creates a corresponding `voice_clips` row at position 0, then clears `uri`/`duration` on the memo. Idempotent — checks for existing clips before inserting. Foreign-key cascade handled by application code (`permanentlyDeleteVoiceMemo` calls `deleteAllClipsForMemo`) — `PRAGMA foreign_keys` not enabled.

### ThemeColors Interface (Session 9)

```typescript
interface ThemeColors {
  mode: 'dark' | 'light';
  background: string; card: string; cardElevated: string; accent: string;
  textPrimary: string; textSecondary: string; textTertiary: string; border: string;
  red: string; orange: string; activeBackground: string;
  overlayWin: string; overlayLose: string; overlaySkip: string;
  overlayButton: string; overlayText: string; overlaySecondary: string; modalOverlay: string;
  success: string;  // Added Session 24 — green for correct/win states (not derivable from accent which is blue/orange/etc depending on theme)
  // Section colors — every theme defines its own palette
  sectionAlarm: string; sectionReminder: string; sectionCalendar: string;
  sectionNotepad: string; sectionVoice: string; sectionTimer: string; sectionGames: string;
  brandTitle: string;
}
```

**Session 24 additions:**
- `success` — dedicated green for correct-answer / win / positive states. Previously overloaded into `accent` which is theme-dependent (blue in Dark/Light, cyan in HighContrast, neon green in Vivid, orange in Sunset, rose in Ruby) and was producing "correct answer is orange" in Sunset. Values: Dark `#4CAF50`, Light `#16A34A`, HighContrast `#44FF44`, Vivid `#00FF88`, Sunset `#16A34A`, Ruby `#16A34A`.
- `overlaySecondary` — subdued text color for use on top of permanent dark overlays (alarm fire screen, game-over cards). `overlayText` is always white/full-contrast; `overlaySecondary` is the dimmer variant (`rgba(255,255,255,0.7)` to `0.85`) for captions, timestamps, and secondary labels that shouldn't compete with the primary text.

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
| contents.voiceMemoImages | number? | Count of voice-memo photo files (Session 26). **Session 28:** field made optional in `BackupMeta` type and `validateBackup` — treats a missing value as 0 so pre-Session-28 .dfw exports still import. New backups still write the count |

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

## 8.5 Tutorial Dismissal kv_store Keys (Session 28)

Per-screen first-visit tip carousel dismissal state. Written by `useTutorial.dismiss()`, read by the same hook's lazy `useState` initializer, wiped en masse by `resetAllTutorials()` from the Settings "Tutorial Guide" row. Value is the literal string `'true'` when dismissed, absent (null) otherwise — the presence check is `dismissed == null`.

| Key | Screen |
|-----|--------|
| `tutorial_dismissed_alarmList` | AlarmListScreen |
| `tutorial_dismissed_reminders` | ReminderScreen |
| `tutorial_dismissed_notepad` | NotepadScreen |
| `tutorial_dismissed_voiceMemoList` | VoiceMemoListScreen |
| `tutorial_dismissed_calendar` | CalendarScreen |
| `tutorial_dismissed_timers` | TimerScreen |
| `tutorial_dismissed_games` | GamesScreen |

## 8.6 Tutorial Voice Clip Registry (Session 28)

`src/data/tutorialClips.ts` — `Record<string, number>` mapping each `TutorialTip.clipKey` to a `require()`-resolved module ID. 15 entries total, 1-to-1 with the 15 tips in `tutorialTips.ts`.

```typescript
const TUTORIAL_CLIPS: Record<string, number> = {
  tutorial_alarmList_01: require('../../assets/voice/tutorial/tutorial_alarmList_01.mp3'),
  // ... 14 more
};
```

| clipKey pattern | Screen | Count |
|-----------------|--------|-------|
| `tutorial_alarmList_{01..03}` | AlarmListScreen | 3 |
| `tutorial_reminders_{01..02}` | ReminderScreen | 2 |
| `tutorial_notepad_{01..03}` | NotepadScreen | 3 |
| `tutorial_voiceMemoList_{01..03}` | VoiceMemoListScreen | 3 |
| `tutorial_calendar_01` | CalendarScreen | 1 |
| `tutorial_timers_{01..02}` | TimerScreen | 2 |
| `tutorial_games_01` | GamesScreen | 1 |

Assets live at `assets/voice/tutorial/tutorial_{screenKey}_{NN}.mp3`. Resolution pipeline: `Asset.fromModule(TUTORIAL_CLIPS[clipKey]).downloadAsync()` → `asset.localUri` → `createAudioPlayer({ uri })`. Matches the `voicePlayback.ts` URI pattern for dev + production compatibility. Unlike voice roasts, tutorial clips play through the **MEDIA stream** (expo-audio, not the native `AlarmChannelModule`).

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

### DifficultyLevel (Session 17 shape, Session 31 cloud redesign)

```typescript
interface PickRange {
  minRank: number; // 0-indexed: 0 = Stockfish's top PV
  maxRank: number; // inclusive upper bound
}

interface DifficultyLevel {
  name: string;        // 'Easy' | 'Intermediate' | 'Hard' | 'Expert' | 'Master' (renamed S31)
  minDepth: number;    // depths 1..minDepth complete unconditionally (competence floor, local engine)
  maxDepth: number;    // hard cap on iterative deepening (local engine)
  timeLimitMs: number; // normal time budget (local engine); a 3× safety deadline caps mandatory depths
  randomness: number;  // 0 = always best (local engine); higher = static-eval noise threshold (cp/100)
  cloudPickRange: PickRange; // Session 31 — band into Lichess cloud eval's top-5 PVs
}
```

**Session 31 current values** (all five levels cloud-first, difficulty = move quality, not search depth):

| Level | minDepth | maxDepth | timeLimitMs | randomness | cloudPickRange |
|-------|---------:|---------:|------------:|-----------:|:---------------|
| Easy | 1 | 2 | 300 | 0.4 | `{ 2, 4 }` (3rd-5th best) |
| Intermediate | 1 | 3 | 500 | 0.15 | `{ 1, 3 }` (2nd-4th best) |
| Hard | 2 | 4 | 1000 | 0.05 | `{ 0, 2 }` (best-3rd best) |
| Expert | 3 | 5 | 2000 | 0 | `{ 0, 1 }` (best-2nd best) |
| Master | 3 | 6 | 3000 | 0 | `{ 0, 0 }` (always best) |

**Priority order** (per move): opening book → Lichess cloud eval (picks from the level's `cloudPickRange` band) → local minimax. The `minDepth` / `maxDepth` / `timeLimitMs` / `randomness` fields govern **only the local engine fallback path**; the cloud path ignores them entirely and uses `cloudPickRange` instead. Levels were renamed from the Session 16 labels (Beginner/Casual/Intermediate/Advanced/Expert) to the Session 31 labels (Easy/Intermediate/Hard/Expert/Master) to match the new semantic — every level produces Stockfish-strength play from a rank band, not graduated search depth.

Replaces the Session 16 `{ name, depth, randomness }` shape plus the separate `TIME_LIMITS_MS` array. The Session 17 shape (without `cloudPickRange`) lives on in the local-engine code path; Session 31 adds the new field as a pure extension — all existing local-engine logic still reads the same fields it always did.

### chessStats (kv_store)

```typescript
interface ChessStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;  // cumulative across all games (wins + half-draw, weighted by difficulty)
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

No blunder penalty (removed Session 18). Resignation counts as a loss (0 points).

---

## 10. Checkers (Session 18)

### SavedCheckersGame

```typescript
interface SavedCheckersGame {
  board: string;           // JSON stringified Board (8×8 array)
  turn: 'r' | 'b';
  playerColor: 'r' | 'b';
  difficulty: number;      // 0..4 index into DIFFICULTY_LEVELS
  moveCount: number;
  startedAt: string;       // ISO
  updatedAt: string;       // ISO
}
```

### checkers_game table

```sql
CREATE TABLE IF NOT EXISTS checkers_game (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  board TEXT NOT NULL,
  turn TEXT NOT NULL CHECK (turn IN ('r', 'b')),
  playerColor TEXT NOT NULL CHECK (playerColor IN ('r', 'b')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4),
  rules TEXT NOT NULL DEFAULT 'american' CHECK (rules IN ('american', 'freestyle')),
  moveCount INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
```

Single-row table (id=1 enforced via CHECK). `board` stored as JSON string of the 8×8 array. `rules` column present in schema (DEFAULT 'american') but ignored in code — American rules hardcoded. One active game at a time; cleared on win/loss/resign/newGame.

### checkersStats (kv_store)

```typescript
interface CheckersStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalPoints: number;  // cumulative (wins weighted by difficulty, no draws in checkers)
}
```

Stored as JSON string under kv_store key `checkersStats`. Composite Memory Score derived via `scoreCheckers`: `cap(totalPoints / 5, 20)`.

### Checkers Scoring by Difficulty

| Difficulty | Win points |
|------------|-----------|
| Beginner | 5 |
| Casual | 8 |
| Intermediate | 12 |
| Advanced | 18 |
| Expert | 25 |

No draws in American checkers. Loss = 0 points. Resignation counts as a loss.

### Checkers DifficultyLevel (Session 18 shape, Session 32 cloud redesign)

```typescript
interface PickRange {
  minRank: number; // 0-indexed: 0 = best
  maxRank: number; // inclusive upper bound
}

interface DifficultyLevel {
  name: string;
  minDepth: number;      // local engine — depths 1..minDepth complete unconditionally
  maxDepth: number;      // local engine hard cap
  timeLimitMs: number;   // local engine normal time budget (3× safety deadline on mandatory depths)
  randomness: number;    // local engine — 0 = best-move, higher = static-eval noise threshold (cp)
  cloudPickRange: PickRange; // Session 32 — band into the cloud's top-5 ranked moves
}

interface RankedMove {
  move: CheckersMove;
  score: number;
}
```

**Session 32 current values** (all five levels cloud-first; difficulty = move quality, not search depth):

| Level | minDepth | maxDepth | timeLimitMs | randomness | cloudPickRange |
|-------|---------:|---------:|------------:|-----------:|:---------------|
| Beginner | 2 | 4 | 500 | 0.4 | `{ 2, 4 }` (3rd-5th best) |
| Casual | 3 | 6 | 800 | 0.2 | `{ 1, 3 }` (2nd-4th best) |
| Intermediate | 4 | 8 | 1500 | 0.05 | `{ 0, 2 }` (best-3rd best) |
| Advanced | 5 | 10 | 3000 | 0 | `{ 0, 1 }` (best-2nd best) |
| Expert | 6 | 14 | 5000 | 0 | `{ 0, 0 }` (always best) |

**Priority order** (per move): Cloud Function → local minimax. Checkers has no opening book. The `minDepth` / `maxDepth` / `timeLimitMs` / `randomness` fields govern **only the local fallback** path; the cloud path ignores them entirely and uses `cloudPickRange` instead.

### Cloud Checkers Function (Session 32)

Firebase Cloud Function at `https://checkersai-kte3lby5vq-uc.a.run.app` — public unauth HTTPS endpoint (App Check deferred to pre-Pro launch). Region `us-central1`, 512MiB, 30s timeout, maxInstances 10, `cors: true`.

**Request shape:**
```typescript
POST / HTTP/1.1
Content-Type: application/json

{ board: Board; turn: PieceColor }   // Board is (Piece | null)[8][8]; PieceColor is 'r' | 'b'
```

**Response shape (200 OK):**
```typescript
{
  moves: Array<{
    move: {
      from: [number, number];
      to: [number, number];
      captured: [number, number][];
      crowned: boolean;
    };
    score: number;
  }>;
}
```

Server runs `getTopMoves(board, turn, 20, 6000, 5)` on the cloud copy of the engine (`functions/src/checkersEngine.ts`). Returns up to 5 ranked moves sorted best-first for the side to move. Error responses: 400 on invalid board/turn, 405 non-POST, 500 internal, all with `{ error: string }` body. Client treats any non-2xx, malformed shape, empty moves, or network/timeout failure as `null` and falls through to the local engine.

### Memory Score System (Session 18 overhaul)

Max score: 140 (7 games × 20). Rank thresholds scaled from 0-100 to 0-140.

| Game | Max Points | Scoring |
|------|-----------|---------|
| Guess Why | 20 | Win rate × 12 + streak (max 8) |
| Memory Match | 20 | Star ratings by difficulty |
| Sudoku | 20 | Star ratings by difficulty |
| Daily Riddle | 20 | Accuracy × 10 + longest streak (max 10) |
| Trivia | 20 | Accuracy × 10 + best round + category breadth |
| Chess | 20 | totalPoints / 5 (wins/draws weighted by difficulty) |
| Checkers | 20 | totalPoints / 5 (wins weighted by difficulty) |

---

## 11. Shared Utilities (Session 24)

### `safeParse<T>(json, fallback): T`
```typescript
// src/utils/safeParse.ts
function safeParse<T>(json: string | null | undefined, fallback: T): T
function safeParseArray<T>(json: string | null | undefined): T[]
```
- Replaces the `JSON.parse(raw) ?? fallback` pattern which crashes on malformed JSON
- `safeParse`: try-catch around `JSON.parse`; returns `fallback` on SyntaxError or when the parsed value is `null`/`undefined`
- `safeParseArray<T>`: same contract, always returns `[]` on any failure
- Used by the 13 storage services that read list-valued kv entries (`alarms_list`, `notes_list`, etc.)

### `withLock(key, fn): Promise<T>`
```typescript
// src/utils/asyncMutex.ts
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T>
```
- Per-key async mutex. Each key gets its own promise chain; subsequent calls queue behind the current in-flight operation
- Serializes concurrent storage mutations on the same entity so two renames on the same note id don't race
- Usage: `await withLock('note:' + id, async () => { ... })`
- Keys are not persisted — mutex state is in-memory, module-level

### `PlayerWithEvents` (expo-audio compat layer)
```typescript
// src/utils/audioCompat.ts
type PlayerWithEvents = AudioPlayer & {
  addListener(
    eventName: 'playbackStatusUpdate',
    listener: (status: AudioStatus) => void,
  ): { remove: () => void };
};
```
- Patches expo-audio 55.x type drift. `AudioPlayer extends SharedObject<AudioEvents>`, but the re-export chain prevents TypeScript from inheriting `addListener` and `release` onto `AudioPlayer`. Runtime methods still work — only the type is broken
- Call sites cast `createAudioPlayer(...) as PlayerWithEvents` and prefer `player.remove()` (declared directly on `AudioPlayer`) over `player.release()`
- **Adopted in Session 28** — `gameSounds.ts`, `soundFeedback.ts`, and `VoiceMemoListScreen.tsx` now import `PlayerWithEvents` and cast at the createAudioPlayer call sites. All `as any` casts on `addListener`/`release` eliminated, all `.release()` swapped to `.remove()`. `npx tsc --noEmit` clean across the three files

---

## 12. Pro Tier (Sessions 29 + 31)

### `ProDetails` interface

```typescript
// src/services/proStatus.ts
export interface ProDetails {
  purchased: boolean;
  productId: string;       // 'dfw_pro_unlock' for purchases, 'founding_user' for migrated existing users
  purchaseDate: string;    // ISO timestamp
  purchaseToken?: string;  // Google Play purchase token, present on real purchases (absent for founding grants)
}
```

- Stored as JSON under `kv_store['pro_status']`
- Read via `getProDetails()` / `isProUser()` (both apply `safeParse` + `isValidProDetails` type guard so malformed JSON cannot fake entitlement)
- Written via `setProStatus(details)` from the entitlement hook on purchase success and from `runFoundingMigration()` on first-launch migration
- Cleared via `clearProStatus()` (used in tests; not currently called from UI code)

### `EntitlementState` interface

```typescript
// src/hooks/useEntitlement.ts
export interface EntitlementState {
  isPro: boolean;
  loading: boolean;
  error: string | null;
  productPrice: string | null;   // 'product.displayPrice' from useIAP, e.g. '$1.99'
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
}
```

- `useEntitlement()` is the single owner of the IAP hook surface for any screen that needs entitlement state. **Each screen calls it at most once** — ProGate accepts these values via props rather than calling the hook itself, so opening the modal from a screen that already owns an instance never doubles up
- Initial `isPro` value seeded from `isProUser()` so offline / Play-Store-unavailable cases still reflect the local cache
- `purchase` / `restore` both go through `useIAP`'s `requestPurchase` / `restorePurchases`. `onPurchaseSuccess` callback handles `finishTransaction({ isConsumable: false })` + `setProStatus({...})` + `setIsPro(true)`. `availablePurchases` effect handles the restore-side acknowledgment so reinstalled users get re-flipped to Pro the moment Play returns the existing purchase

### `TrialGame` type and trial storage keys

```typescript
// src/services/gameTrialStorage.ts
export type TrialGame = 'chess' | 'checkers' | 'trivia' | 'sudoku' | 'memoryMatch';
export const TRIAL_LIMIT = 3;
```

- Kv key pattern: `game_trial_{game}` — five keys total, one per gated game. Value is a stringified non-negative integer (the count of plays so far). Missing key = 0
- `canPlayGame(game)` — `true` if `isProUser()` OR the count is `< TRIAL_LIMIT`
- `incrementTrial(game)` — bumps the counter and returns the new value. Caller is responsible for gating on `!isPro` to avoid wasted writes for Pro users
- `getTrialRemaining(game)` — `Infinity` for Pro users, `max(0, TRIAL_LIMIT - count)` otherwise. Used to render the badge on the Games screen
- `resetTrials()` — wipes all five keys. Currently only used in tests; could become a debug action in a future session

### `FoundingDetails` interface

```typescript
// src/services/foundingStatus.ts
export interface FoundingDetails {
  isFoundingUser: boolean;  // always true when present
  grantedAt: string;        // ISO timestamp from when the migration ran
}
```

- Stored as JSON under `kv_store['founding_status']`
- Read via `isFoundingUser()` / `getFoundingDetails()` with `safeParse` + `isValidFoundingDetails` type guard
- Written by `runFoundingMigration()` on first launch for any user with `kvGet('onboardingComplete') === 'true'` — strict equality, corrupted truthy values rejected
- Migration is idempotent via `kv_store['founding_check_done'] = 'true'` flag, set after the first run completes
- Independent of `pro_status` — an already-Pro user still gets the founding badge written; a non-Pro existing user gets BOTH a `pro_status` entry (with `productId: 'founding_user'`) and a `founding_status` entry

### Pro-related kv_store keys

| Key | Type | Description |
|-----|------|-------------|
| `pro_status` | string (JSON) | Serialized `ProDetails`. Presence + `purchased: true` is the canonical "is this user Pro?" signal |
| `founding_status` | string (JSON) | Serialized `FoundingDetails`. Independent of pro_status — used to render the Founding User card in Settings |
| `founding_check_done` | string | `'true'` once `runFoundingMigration()` has executed. Idempotency flag |
| `game_trial_chess` | string | Stringified integer trial count for Chess |
| `game_trial_checkers` | string | Stringified integer trial count for Checkers |
| `game_trial_trivia` | string | Stringified integer trial count for Trivia |
| `game_trial_sudoku` | string | Stringified integer trial count for Sudoku |
| `game_trial_memoryMatch` | string | Stringified integer trial count for Memory Match |

### Calendar sync kv_store keys (Session 31)

| Key | Type | Description |
|-----|------|-------------|
| `gcal_dfw_calendar_id` | string | Google Calendar id of the dedicated "Don't Forget Why" calendar created (or reused) on first sync. Cleared on sign-out via direct `kvRemove` call in `firebaseAuth.signOutGoogle` |
| `gcal_sync_enabled` | string | `'true'` / `'false'`. User-facing toggle in Settings. Cleared on sign-out |
| `gcal_sync_map` | string (JSON) | `Record<string, string>` mapping DFW item id (alarm or reminder id) → Google Calendar event id. Used by `syncToGoogleCalendar` to PUT existing events instead of POSTing duplicates on re-sync. **Intentionally preserved on sign-out** so re-signing the same Google account doesn't recreate every event. Mutations only on successful POST/PUT/DELETE — failed deletes preserve the mapping for idempotent retry |

---

## 13. Daily Riddle (Session 31 rewrite)

### `DailyRiddleEntry` interface

```typescript
// src/data/dfw_yearly_riddles.ts
export type RiddleDifficulty = 'easy' | 'medium' | 'hard';

export interface DailyRiddleEntry {
  id: number;                    // 1..366, matches dayOfYear for the canonical bank
  dayOfYear: number;             // 1..366, primary lookup key
  category: string;              // 12 display strings (see authoring comment in dfw_yearly_riddles.ts)
  difficulty: RiddleDifficulty;
  question: string;
  answer: string;
}

export const YEARLY_RIDDLES: DailyRiddleEntry[] = [ /* 366 entries */ ];
```

- **366 entries, one per `dayOfYear`.** Manually curated, not generated, not shuffled. Every entry is pre-assigned to a specific day of the year (1 = January 1, 366 = December 31 in a leap year).
- **Category is a display string, not a type-level enum.** The Session 22 shape used a `RiddleCategory` union (`'memory' | 'classic' | 'wordplay' | 'logic' | 'quick'`) which meant the screen had to map keys to labels via `CATEGORY_LABELS`. Session 31's `category: string` is already a display-ready label — the screen renders `dailyRiddle.category` directly. Extra type safety is traded for a simpler render path and zero bookkeeping when adding new categories.
- **Difficulty and id are still typed.** `RiddleDifficulty` remains a union so the difficulty badge color mapping stays exhaustive; `id` is `number` so dedup works against `seenRiddleIds: number[]` without coercion.

### Lookup function

```typescript
// src/data/riddles.ts
export function getDailyRiddleForDate(dateStr: string): DailyRiddleEntry {
  const date = new Date(dateStr + 'T12:00:00Z');
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;
  const match = YEARLY_RIDDLES.find((r) => r.dayOfYear === dayOfYear);
  return match ?? YEARLY_RIDDLES[(dayOfYear - 1) % YEARLY_RIDDLES.length];
}
```

- **Noon UTC anchor.** `new Date(dateStr + 'T12:00:00Z')` parses the `YYYY-MM-DD` date at exactly 12:00 UTC, 12 hours away from any timezone's midnight. Eliminates DST fencepost edge cases that plagued the Session 22 seeded-shuffle implementation (where `new Date(dateStr + 'T00:00:00')` was interpreted in local time and produced different `dayOfYear` values across DST-observing devices).
- **UTC arithmetic.** `Date.UTC(year, 0, 1)` builds the January-1-midnight-UTC timestamp without any local-time offset. Subtracting in UTC guarantees every device computes the same delta.
- **`+ 1` to match 1-indexed `dayOfYear`.** January 1 → delta 0 days → `dayOfYear = 1`. December 31 in a leap year → delta 365 days → `dayOfYear = 366`. Matches the `YEARLY_RIDDLES` primary key.
- **Defensive fallback.** `(dayOfYear - 1) % YEARLY_RIDDLES.length` wraps if the bank ever ships fewer than 366 entries or if the date math produces an out-of-range `dayOfYear` for any reason. Should never fire in practice — the fallback is a belt-and-suspenders safety net against a future refactor that leaves the bank partially populated.

### Legacy `getDailyRiddleIndex` (removed Session 36)

Removed Session 36 — Session 31 Phase 2 replaced it with `getDailyRiddleForDate` (DST-safe day-of-year computation); Session 36 dead-code audit then confirmed zero callers.

### Old `RIDDLES` array (kept for backward compat)

The Session 22 `RIDDLES: Riddle[]` export (355 riddles with the old `RiddleCategory` union shape) is **kept** because users' existing `dailyRiddleStats.seenRiddleIds` may contain ids from the old id space. Removing the array would orphan those entries. The array is no longer read by any daily-riddle code path — `useDailyRiddle` reads exclusively from `YEARLY_RIDDLES` via `getDailyRiddleForDate`. The old `Riddle` type and `RiddleCategory` union are also kept for the same reason.

---

## 14. Trivia (Session 32 overhaul)

### Type system

```typescript
// src/types/trivia.ts

export type TriviaParentCategory =
  | 'general'
  | 'popCulture'
  | 'scienceTech'
  | 'historyPolitics'
  | 'geography'
  | 'sportsLeisure'
  | 'gamingGeek'
  | 'mythFiction';

export type TriviaSubcategory =
  | 'generalKnowledge'
  | 'film' | 'music' | 'television' | 'celebrities'
  | 'scienceNature' | 'computers' | 'gadgets' | 'mathematics'
  | 'history' | 'politics' | 'art'
  | 'geography'
  | 'sports' | 'boardGames' | 'vehicles'
  | 'videoGames' | 'comicsAnime'
  | 'mythologyBooks';

export const PARENT_TO_SUBS: Record<TriviaParentCategory, TriviaSubcategory[]> = {
  general: ['generalKnowledge'],
  popCulture: ['film', 'music', 'television', 'celebrities'],
  scienceTech: ['scienceNature', 'computers', 'gadgets', 'mathematics'],
  historyPolitics: ['history', 'politics', 'art'],
  geography: ['geography'],
  sportsLeisure: ['sports', 'boardGames', 'vehicles'],
  gamingGeek: ['videoGames', 'comicsAnime'],
  mythFiction: ['mythologyBooks'],
};

export const SUBCATEGORY_LABELS: Record<TriviaSubcategory, string> = { /* display strings */ };

export interface TriviaQuestion {
  id: string;                         // 'category_NNN' pattern
  category: TriviaParentCategory;
  subcategory: TriviaSubcategory;     // NEW in Session 32
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

// Legacy alias — kept for any lingering imports
export type TriviaCategory = TriviaParentCategory;
```

- **8 parent categories, 19 subcategories.** Parents with a single sub (`general`, `geography`, `mythFiction`) bypass the subcategory picker modal — tapping them in the TriviaScreen grid treats them as "All {parent}" selections immediately. Parents with 2+ subs open `SubcategoryPickerModal` for a second-level pick.
- **Subcategory labels are separate from the taxonomy.** The union values are camelCase identifiers (`scienceNature`, `comicsAnime`); `SUBCATEGORY_LABELS` maps each to its display string ("Science & Nature", "Comics, Anime & Cartoons", etc.).
- **`TriviaQuestion.subcategory` is required.** Every entry in every `triviaBank_*.ts` file has a non-null subcategory. The test suite (`__tests__/triviaBank.test.ts`) asserts this + that each question's subcategory is valid for its parent via `PARENT_TO_SUBS`.
- **Legacy alias preserved.** `TriviaCategory = TriviaParentCategory` so any pre-Session-32 imports still compile.

### Question bank layout

```
src/data/triviaBank.ts                    // barrel + helpers + TRIVIA_CATEGORIES display list
src/data/triviaBank_general.ts            // default export: TriviaQuestion[]
src/data/triviaBank_popCulture.ts
src/data/triviaBank_scienceTech.ts
src/data/triviaBank_historyPolitics.ts
src/data/triviaBank_geography.ts
src/data/triviaBank_sportsLeisure.ts
src/data/triviaBank_gamingGeek.ts
src/data/triviaBank_mythFiction.ts
```

**Total: 1,623 questions.** `triviaBank.ts` imports each file, concatenates into `ALL_QUESTIONS`, and exposes:

```typescript
export function getAllQuestions(): TriviaQuestion[];
export function getQuestionsForCategory(cat: TriviaParentCategory): TriviaQuestion[];
export function getQuestionsForSubcategory(sub: TriviaSubcategory): TriviaQuestion[];
export const TRIVIA_CATEGORIES: { id: TriviaParentCategory; label: string }[];
```

Legacy `src/data/triviaQuestions.ts` (the Session 22 flat-category file) was **deleted** in Session 32; `TRIVIA_CATEGORIES` moved to the new barrel.

### Seen-question composite keys

`getSeenQuestionIds(key)` / `addSeenQuestionIds(key, ids)` / `resetSeenQuestionsForCategory(key)` in `triviaStorage.ts` all accept **opaque string keys**. `TriviaScreen` composes them at call sites:

| Selection | Key format | Example |
|-----------|-----------|---------|
| "All {parent}" (`selectedSubcategory === 'all'`) | `{category}` | `'popCulture'` |
| Specific sub | `{category}_{subcategory}` | `'popCulture_film'` |

This preserves granular per-view recycling (each "view" has its own seen cycle) at the cost of some cross-view dedup — a question seen via "All Pop Culture" isn't marked as seen when the user next plays Film-only. Flagged as a known P2 in Session 32 audit; intentional for now.

### Online trivia (Session 32 expansion of Session 31)

`src/services/triviaAI.ts` `CATEGORY_MAP` now covers all 8 parent categories:

```typescript
const CATEGORY_MAP: Record<TriviaParentCategory, number | number[]> = {
  general: 9,
  popCulture: [11, 12, 14, 26],       // Film, Music, Television, Celebrities
  scienceTech: [17, 18, 30, 19],      // Science & Nature, Computers, Gadgets, Mathematics
  historyPolitics: [23, 24, 25],      // History, Politics, Art
  geography: 22,
  sportsLeisure: [21, 16, 28],        // Sports, Board Games, Vehicles
  gamingGeek: [15, 29, 31],           // Video Games, Comics, Anime & Manga
  mythFiction: [20],                  // Mythology
};
```

Multi-ID categories pick a random OpenTDB category per fetch. Food + Kids (pre-Session-32 categories without OpenTDB coverage) are gone — those questions were remapped into `general` on Session 32. No dead categories remain.

**Online question synthesis.** `fetchOnlineQuestions(category, count, difficulty)` returns questions with:
- `id: 'online_{category}_{timestamp}_{index}'` — synthetic id, won't collide with offline `category_NNN` pattern.
- `category: <the requested parent>`.
- `subcategory: PARENT_TO_SUBS[category][0]` — default first sub, since OpenTDB doesn't expose subcategory-level queries.
- Decoded HTML entities in question + answers.

Online rounds don't write to `seenQuestionIds`, so they don't affect the offline seen cycle.

### Stats keyed by parent only

`TriviaStats.categoryStats` is keyed by `TriviaParentCategory` — no per-subcategory stats tracking. Subcategory granularity lives only in the seen-question cycling; aggregate stats ("best round", "total correct per category") are parent-level.

Migration is silent: old stats entries for deleted categories (food, kids) drop on first load — `validateStats` rebuilds `categoryStats` keyed by the current `ALL_CATEGORIES` list in `triviaStorage.ts`.
