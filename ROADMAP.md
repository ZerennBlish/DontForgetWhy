# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: Session 27 (April 12, 2026)

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.18.0 (versionCode 35) — Session 27 work on `dev`, not yet shipped |
| **Branch** | `dev` |
| **Production Status** | v1.18.0 on Play Store. Session 26 voice-memo-clips work + Session 27 NoteEditorModal redesign + note titles sitting on `dev` ready for device testing then ship. |
| **Current Focus** | Session 27: NoteEditorModal full redesign (1268-line monolith → useNoteEditor hook + 5 sub-components + bottom toolbar), voice recording removed from notes, text limits removed, note title feature added (new DB column + type + UI), icon size consistency pass, attachments panel pattern, audit fixes. |
| **Blocked By** | Nothing |
| **Next Action** | Session 27 polish + audit of title feature, then version bump → ship. Prompt 4 (VoiceMemoDetailScreen layout reorder + share + attachments panel) deferred to Session 28. |
| **EAS Credits** | ~25 remaining (reset April 12) |
| **Firebase Credits** | $300 available — DO NOT activate yet (90-day clock starts on activation) |
| **ElevenLabs** | Subscription active — 68 clips shipped |

---

## PHASE STATUS

| Phase | Name | Status | Build Type |
|-------|------|--------|------------|
| 1 | Housekeeping | ✅ Done | — |
| 2 | Photos + Drawing + Backgrounds | ✅ Done | Dev + Prod |
| 3 | Voice Roasts | ✅ Done | Dev + Prod |
| 3.5 | Voice Memos | ✅ Done | Dev + Prod |
| — | v1.9.0 Home Screen | ✅ Done | Prod only |
| — | Storage Migration (SQLite) | ✅ Done | Dev + Prod |
| — | Visual Overhaul (6 themes) | ✅ Done | Prod only |
| — | Session 14 Onboarding Overhaul | ✅ Done | Prod only |
| 4 | The Vault (Backup & Restore) | ✅ Done | Dev + Prod |
| 4.5 | Stability Sprint | ✅ Done | Prod only |
| 5 | Google Calendar Sync | ⏭️ Deferred | Dev + Prod |
| 5.5 | Premium Foundation | ⬜ Waiting | Prod only |
| 6 | Chess + Checkers + Blunder Roast | ✅ Done | Prod only |
| 6.5 | Voice Content Expansion | ⬜ Waiting | Prod only |
| 7 | Pro Tier + Billing | ⬜ Waiting | Multiple |
| 8 | Firebase Online + Social | ⬜ Waiting | Prod |

---

## COMPLETED PHASES (SUMMARY)

- **P1 · Housekeeping** — Shipped v1.3.4. Utility extraction, test reconciliation, timer mutex.
- **P2 · Photos + Drawing + Backgrounds** — Shipped v1.6.1. Note image attachments, Skia drawing canvas, S Pen pressure, draw-on-photos, custom photo backgrounds, per-alarm fire photos.
- **P3 · Voice Roasts** — Shipped v1.7.0. 68 ElevenLabs clips, native ALARM stream playback, snooze shame escalation, timer roasts, dismiss voice toggle.
- **P3.5 · Voice Memos** — Shipped v1.8.0. VoiceRecordScreen, VoiceMemoDetailScreen, NotepadScreen integration, MicWidget, CalendarScreen dots, card unification.
- **v1.9.0 · Home Screen** — Shipped v1.9.0. Entry point with icon grid, Quick Capture, personality banner, Today section. TimerScreen + VoiceMemoListScreen extracted as standalone screens.
- **SQLite Migration** — Shipped v1.10.0. expo-sqlite, 7 entity tables + kv_store, full AsyncStorage removal, ForgetLog removed.
- **Visual Overhaul** — Shipped v1.10.1. 6 themes (Dark, Light, High Contrast, Vivid, Sunset, Ruby), GamesScreen + SettingsScreen fully themed, bgUri-aware overrides on 8 screens, VoiceMemoDetailScreen + NoteEditorModal redesign.
- **Session 14 · Onboarding** — Shipped v1.10.1. Full rewrite with sarcastic copy, View-based icons, mic/camera permission slides, theme cycling preview, watermark, skip warnings, dynamic final slide.
- **P4 · The Vault** — Shipped v1.11.0. Export/Import Memories (.dfw backup), auto-export via SAF to Google Drive/external folders, transactional restore with rollback, manifest-first architecture, strict validation, notification rescheduling, Jest tests.
- **P4.5 · Stability Sprint** — Shipped v1.12.0. NotepadScreen + AlarmListScreen decomposed into thin shells + hooks + card components, full accessibility pass, PNG→WebP compression (31.8 MB → 1.5 MB), FlatList OOM prevention, Jest resurrection (162 tests), clean package audit.
- **P6 · Chess + Checkers + Blunder Roast** — Shipped v1.13.0 (chess) + v1.14.0 (checkers + scoring overhaul). Chess: chess.js, iterative-deepening minimax, opening book, TT, killer moves, null-move pruning, tapered eval, 5 difficulties, blunder roasts. Checkers: pure JS engine, American rules, 5 difficulties, forced capture, promotion-stops-chain. Scoring: max 140 (7 games × 20), rank thresholds scaled, chess/checkers stat sections in Memory Score.
- **Session 19 · Visual Art Overhaul** — Memory Match → Memory Guy Match (22 custom cards + card back + felt bg). 10 trivia category icons + library bg. 9 rank tier images with new titles. GamesScreen + score screen emoji → custom art.
- **Session 20 · Silver Metallic Icon Set + Guess Why Art** — 25+ silver/chrome utility icons replacing View-based CSS geometry. Two-tier visual language (silver core, anthropomorphic games). Screen header icons on 7 core screens. Sound mode icons. ShareNoteModal icons. FAB plus buttons. Guess Why art. Checker pieces (4 WebP). Icons.tsx pruned. Jest webp moduleNameMapper.
- **Session 21 · Chess Overhaul + Custom Fonts (v1.16.0)** — Chess: post-game move review (FEN history, step-through board), check/checkmate indication (red king square, CHECK! banner, red board border), training mode (threatened pieces, last move highlight, toggle for difficulty 0-2), haptic tiers (light=turn, heavy=check, error=checkmate). Art: 12 anthropomorphic chess pieces (6 white cream/gold, 6 black charcoal/silver), 3 calendar empty state illustrations (hammock, beach chair, couch), calendar icon refresh. Visual: plus icon sizes increased across 8 files, color picker circles aligned in NoteEditorModal. Fonts: Satisfy (app title), Lilita One (game headers), Nunito (core UI headers). Phase 1 font rollout — headers only, body text Phase 2.
- **Session 22 · Montserrat Alternates + Hook Extractions** — Font Phase 2: Montserrat Alternates to all ~40 files, fontWeight→fontFamily pattern, systematic font size reduction. Hook extractions: useSudoku, useTimerScreen, useDailyRiddle, useSettings. NoteEditorModal cleanup: linkedText.tsx, NoteVoiceMemo.tsx, ColorPickerModal.tsx. Quick Capture simplification. Splash dark bg prep. Play Store refresh (8 screenshots, updated description). Dual audit, 11 fixes.
- **Session 23 · Game Sounds + Media Control Icons + Close-X (v1.18.0)** — Game sound effects: 11 wav files (chess place/capture/promote/pickUp, checkers move, game win/loss, card flip/flipBack, memory win, tap), gameSounds.ts service with VOLUMES map (cached toggle, fire-and-forget expo-audio), settings toggle, wired to useChess/useCheckers/MemoryMatchScreen. Tap SFX on game UI buttons across 8 screens. Media control icon replacement: 5 WebP assets (game-play character, chrome play/pause/stop/record) replacing all CSS border-triangle and emoji play/pause/stop icons. GlowIcon component with colored shadow spotlight (Android translucent fill fix). FAB + buttons: colored backgrounds removed, glow shadow added across 4 screens. Close-X chrome icon: 15 replacements across 9 files, dead CloseIcon removed from Icons.tsx. Checkmate banner (CHECK! vs CHECKMATE!). Take back label fix (fresh game shows "Take Back" not "Used"). Chess light mode card text fix. metro.config.js wav asset extension. 3 audit rounds, 6 total fixes.
- **Session 24 · Full Codebase Audit Sweep** — 8-category dual audit (Codex + Gemini): dead code, theme compliance, accessibility, performance, type safety, UI patterns, data/storage, navigation. **Dead code:** removed `alarmSounds.ts` (dead file), 26 dead icon exports, orphaned styles across 13 files, unused imports/variables across 14 files, unexported dead exports across 27 files. **Theme:** added `success` + `overlaySecondary` tokens (all 6 themes), fixed 5 light-theme broken screens, hardcoded color cleanup across 15+ files, capsule pill opacity fix. **Accessibility:** BackButton/HomeButton hitSlop + labels (foundation), AlarmFire/VoiceRecord/Timer/VoiceMemoDetail critical-screen pass, card components, modals, form screens, game screens, complex components, live regions. **Performance:** FlatList configs (removeClippedSubviews, windowSize 5, maxToRenderPerBatch 8, initialNumToRender 8), React.memo wraps, useCallback in hooks + screens. **Data safety:** restore mutex (`restoreInProgress` flag), notification cancellation timing, per-row migration error handling, `safeParse` utility, `asyncMutex` utility wired across 13 storage files, safe JSON parsing everywhere. **Navigation:** `beforeRemove` guards on CreateAlarm/CreateReminder with `savedRef` bypass, VoiceRecord confirmation dialog, game screen hardware-back intercept, HomeButton popToTop, deep-link existence checks, note pending TTL, NoteEditor widget protection. **Type safety:** migration entity types, storage validation, alarm form non-null fixes, useSudoku validation, hook return types. **UI patterns (partially reverted):** `GameNavButtons.tsx` component created but wiring + icon exports reverted (file stranded with broken `APP_ICONS.gameBack`/`gameHome` references — must be wired or deleted before ship). Emoji-chrome sweep in secondary screens also reverted. **Custom icons (assets present, exports reverted):** 8 game character icons on disk (hourglass, pencil, erase, chevron-left/right, game-back, game-home, smiley), 2 chrome icons (lock, checkmark) — all in `assets/` but not exported from `appIconAssets.ts`. **Game sounds (assets present, registry reverted):** 5 new wav files on disk (pencil, Eraser, Triva-tap, right-answer-Triva, wrong-answer-trivia) but `gameSounds.ts` SOUNDS registry has no pencil/eraser/trivia entries. **Audio compat layer:** `audioCompat.ts` created to patch expo-audio 55.x type drift (missing `addListener`/`release` inheritance), but not yet imported — `gameSounds.ts` and `soundFeedback.ts` still throw the TS errors. **Bug fixes shipped:** FAB glow styling (hex hole → chrome circle matching BackButton/HomeButton on 4 list screens), VoiceRecord navigation, autoBackup SAF error handling (never-throw contract), NoteCard/DeletedNoteCard silver notepad fallback when `note.icon` is empty, expo-audio type compatibility scaffolding. Gemini audit violation: created 6 unauthorized files during read-only audit phase (ESLint config + scripts) — deleted, read-only warnings escalated in auditor prompts. **Audit work from 3e94a28 is intact. "FINAL prompt" wiring from 3ae389f was reverted in 4820f36 after laptop instability.**
- **Session 25 · Audit Fix Redo + Sound/Icon Wiring + Nav Fixes** — Re-applied reverted Session 24 work: game sound wiring (Sudoku + Trivia), icon registry expansion, chrome icon replacements. Added DailyRiddle answer sounds (`triviaCorrect`/`triviaWrong`). Fixed timer progress notification: countdown taps navigate to TimerScreen, completion taps to AlarmFire. Background handler skips alarm sound for countdown notifications (distinguished by notification ID prefix `countdown-` vs `timer-done-`). Fixed VoiceMemoDetailScreen: Save button always visible in edit mode, removed bottom save/discard row, sarcastic no-title warning. Fixed CreateAlarmScreen/CreateReminderScreen: `savedRef` bypasses `beforeRemove` only after successful save (moved into `navigateBack` callback). Fixed quick note infinite editor reopen (`handledActionRef` not cleared in `closeEditor`). Fixed widget voice record/detail back navigation (`VoiceMemoList` in initial stack, including warm-app `Quick Record` from HomeScreen via `navigation.reset`). Fixed AlarmFireScreen KeepAwake crash (async IIFE wrapper). expo-audio type casts (`as any`) for `addListener`/`release` across `gameSounds`, `soundFeedback`, `VoiceMemoListScreen`. Silver-icon tint cleanup across CalendarScreen event cards, ReminderScreen completion checkmark, DeletedAlarmCard bell, SettingsScreen active-theme checkmark, SoundPickerModal selected-sound checkmarks, DayPickerRow calendar toggle, CalendarScreen quick-create plus capsules. DailyRiddle Got it/Nope buttons use `win`/`loss` character icons. Dual audit (Codex + Gemini) — scoped to Session 25 changes. 3 fixes applied. **Shipped as v1.18.0 (versionCode 35).**
- **Session 26 · Voice Memo Clips + Photos + Icon Overhaul** — Voice memo clips: memos are containers holding multiple audio clips. New `voice_clips` DB table with FK to voice_memos (id, memoId, uri, duration, position, label, createdAt), `VoiceClip` type, `voiceClipStorage.ts` service (`getClipsForMemo`, `getClipSummaries` batch, `addClip`, `deleteClip`, `updateClipLabel`, `getNextClipPosition`, `deleteAllClipsForMemo`). DB migration in `_initSchema` converts existing single-uri memos to clip rows. Clips have position ordering and optional labels (default shows formatted createdAt timestamp, tappable to rename in edit mode). `voice_memos.uri` and `voice_memos.duration` columns kept for backward compat, set empty/0 for new memos. Clip playback modes: Stop (single clip), Play All (auto-advance through clips), Repeat (loop current). Persisted globally via kv_store key `clipPlaybackMode`. Voice memo photos: camera capture on VoiceRecordScreen (corner button), gallery picker on VoiceMemoDetailScreen (edit mode), photo strip on detail screen with ImageLightbox view, 5-photo cap. New `voice-memo-images/` storage folder, `voiceMemoImageStorage.ts` service, `images TEXT NOT NULL DEFAULT '[]'` column on voice_memos. Added to `MEDIA_FOLDERS` in backupRestore.ts and `BackupMeta.contents.voiceMemoImages` count. Recording flow rewrite: `VoiceRecordScreen.saveAndNavigate` creates memo + first clip directly, navigates to detail with `{ memoId }`. Eliminated `isNewRecording`/`tempUri` handoff path entirely. Two modes: new memo (creates memo row + clip + photos atomically with rollback on clip failure) and add-clip (appends clip + photos to existing memo). Camera button on bottom-right corner, always visible. Icon overhaul: 7 new icons (`save`/floppy-disk, `edit`/pencil, plus the existing repeat/play-all/play-stop/skip-back/skip-forward from Session 23). Replaced text Edit/Save buttons with circle icon buttons across VoiceMemoDetailScreen, NoteEditorModal, CreateAlarmScreen, CreateReminderScreen. Timer modal redesigned with 3 circle action buttons (red cancel / accent save-only / success start). New `handleModalSaveOnly` separates Save from Start so users can save timer presets without auto-starting. Sound/bell buttons (sound mode toggle in timer + alarm) and emoji circles got tappable circle treatment. Reminder + Timer + Alarm icon-picker fallback shows silver `+` instead of default emoji. Calendar inline icons next to "Set date" restructured into proper flex `<View>` rows (was inline image-in-Text with broken Android baseline). Dual audit (Codex + Gemini) on Session 26 work — 8 findings fixed: HIGH (focus reload missed memo, non-atomic save, stale capturedPhotos closure), MEDIUM (5-photo cap ignored existing, backup meta missing voiceMemoImages, migration inserter missing images column), LOW (VoiceMemoCard accessibility label, Array.isArray validation on parsed images). Re-audit clean. `npx tsc --noEmit` 0 errors, 315 tests passing.

---

## PHASE 4 — THE VAULT (Backup & Restore) ✅ COMPLETE

**Shipped in:** v1.11.0 (versionCode 28)
**Branch:** `dev`
**New deps:** `react-native-zip-archive`, `expo-document-picker`
**Build cost:** 1 dev build + 1 production build

### Completed

- [x] Export Memories — zip dfw.db + voice-memos/ + note-images/ + backgrounds/ + alarm-photos/ into .dfw file, share via system sheet
- [x] Import Memories — file picker, dry-run validation, two-step overwrite warning, transactional restore with rollback
- [x] Auto-export via SAF — user picks folder (Google Drive, Downloads, etc.), silently backs up on app open based on frequency (daily/weekly/monthly)
- [x] Manifest-first architecture — backup-meta.json with appVersion, backupVersion, createdAt, content counts
- [x] Strict validation — rejects unknown versions, malformed manifests, missing DB
- [x] Transactional restore — live data moved to rollback dir, swap in restored data, rollback on failure
- [x] Notification rescheduling — cancel all, reload alarms/reminders, reschedule with new IDs
- [x] "Your Memories" Settings section — privacy text, export/import buttons, last backup date, 30-day nudge
- [x] "Back up now?" prompt on initial SAF folder selection
- [x] Jest tests for backup logic (shouldAutoBackup, getAutoBackupSettings, manifest validation)
- [x] Play Store screenshots refreshed (8 new screenshots)

### Design Decisions

- No encryption at launch — passphrase problem (forgotten = backup gone). Ship clean ZIP first.
- Manifest-first from day one — every .dfw includes backup-meta.json with schema version
- Transactional restore with rollback — never delete live data until replacement is verified
- SAF for auto-export — user controls where backups go, not us
- Privacy messaging: "We don't have servers. We don't want your data."

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 2 rounds
- [x] Round 1: P0 (non-transactional restore), P1 (SAF not implemented, weak validation), P2 (nudge, missing tests) — all fixed
- [x] Round 2: P1 (manifest field validation, test coverage gaps) — fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 4 suites, 56+ tests passing

---

## PHASE 4.5 — STABILITY SPRINT ✅ COMPLETE

**Shipped in:** v1.12.0 (versionCode 29)
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build

### Completed

- [x] **4.5.1 NotepadScreen decomposition** — 896 → 232 lines. Extracted `useNotepad` hook, `NoteCard`, `DeletedNoteCard` components
- [x] **4.5.2 AlarmListScreen decomposition** — 556 → 278 lines. Extracted `useAlarmList` hook, `DeletedAlarmCard` component
- [x] **4.5.3 Accessibility pass** — accessibilityLabel/Role/State/Hint added to all interactive elements across 10 files. Icons decorative by default via `importantForAccessibility="no-hide-descendants"`
- [x] **4.5.4 App size + storage audit** — 10 PNG backgrounds → WebP (31.8 MB → 1.5 MB, 95.4% savings). Resize to 1440px max, quality 80
- [x] **4.5.5 OOM prevention** — `removeClippedSubviews`, `windowSize={5}`, `maxToRenderPerBatch={8}`, `initialNumToRender={8}` on 5 main FlatLists
- [x] **4.5.6 Jest resurrection** — 7 suites, 162 tests (was 4 suites, 56+). Added `widgetPins.test.ts` (50 tests), `settings.test.ts` (36 tests), `timeUtils.test.ts` (14 tests)
- [x] **4.5.7 R8 deobfuscation mapping** — pending upload at build time
- [x] **4.5.8 Full abandoned package audit** — depcheck clean. All flagged deps (expo-dev-client, expo-notifications, react-native-screens, react-native-worklets) required implicitly

### Audit Gate
- [x] Dual audit (Codex + Gemini) — findings fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 7 suites, 162 tests passing
- [x] Version bump v1.11.0 → v1.12.0, versionCode 28 → 29

---

## PHASE 5 — GOOGLE CALENDAR SYNC ⏭️ DEFERRED

**Deferred Session 16.** Requires Google sign-in (Firebase Auth + OAuth), which conflicts with the "no accounts, we don't want your data" brand promise. Revisit only when user base justifies the complexity AND a flow exists that keeps sign-in optional/local-feeling. Until then, users keep using the in-app calendar.

**Original scope (preserved):**
- Firebase project setup (Auth only)
- Google OAuth via expo-auth-session
- Pull Google Calendar events into Today section + CalendarScreen dots
- Sync settings UI in SettingsScreen
- Optional: push DFW alarms/reminders to Google Calendar

---

## PHASE 5.5 — PREMIUM FOUNDATION

**Version Target:** v1.15.0
**Branch:** `dev`
**New deps:** `expo-iap`
**Build cost:** 1 dev build + 1 production build

### Tasks

- [ ] **5.5.1 Entitlement storage** — `proStatus.ts` service: checks Pro entitlement, caches in `kv_store` (tier, purchaseDate, productId). Single source of truth for "is this user Pro?"
- [ ] **5.5.2 Install expo-iap** — Expo Module for Google Play Billing. `npx expo install expo-iap`. Native dep = requires dev build. Create in-app product in Play Console (one-time, $1.99, dormant — not surfaced to users yet).
- [ ] **5.5.3 ProGate component** — wrapper that checks `proStatus`. Currently always unlocked (no paywall until P7). Apply gates to: Chess, Checkers, Sudoku, voice memos, photo backgrounds, note images, drawing, backup/restore, full voice pack.
- [ ] **5.5.4 useEntitlement() hook** — React hook exposing Pro status to screens. Drives ProGate and future Pro UI.
- [ ] **5.5.5 Backup entitlement flag** — export/import entitlement state with .dfw backup so Pro status survives restore.
- [ ] **5.5.6 License testing setup** — configure Google Play license testers for test purchases without real charges.
- [ ] **5.5.7 Jest tests** — proStatus service, entitlement logic, ProGate behavior (locked/unlocked).
- [x] **5.5.8 Emoji picker overhaul** ✅ Shipped early in Session 16. 11 categories, 105 labeled emojis. EmojiPickerModal: horizontal capsule category tabs + 5-column labeled grid.

### Audit Gate
- [ ] Full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 6 — CHESS + CHECKERS + BLUNDER ROAST ✅ COMPLETE

**Shipped in:** v1.13.0 (Chess) + v1.14.0 (Checkers + scoring overhaul)
**Branch:** `dev`
**New deps:** `chess.js` (JS only)
**Build cost:** 2 production builds

### Tasks

- [x] **6.1 Chess vs CPU** ✅ Session 16. chess.js, 5 difficulty levels, custom AI-generated Staunton piece PNGs, Memory Score integrated. Iterative-deepening minimax with alpha-beta, MVV-LVA move ordering, quiescence search, time-budgeted search (300ms → 5s per difficulty). Full hook (useChess.ts) + screen (ChessScreen.tsx). Game state persists to SQLite across app close.
- [x] **6.1.1 Chess engine upgrades** ✅ Session 17. Opening book (104 hardcoded positions, 6-10 plies of theory), transposition table (100K FEN-keyed entries with mate-score ply adjustment), killer-move heuristic, null-move pruning, min-depth + max-time difficulty model with 3× safety deadline, tapered evaluation (continuous material-phase blending), passed-pawn bonus (rank-scaled + endgame-scaled), rook on open/semi-open file. 2 audit rounds completed (6 findings, all fixed). 69 chessAI tests (232 total across the suite) passing.
- [x] **6.2 Blunder Roast (text)** ✅ Session 16. 5 severity tiers + take-back pool, 58 roast lines, analyzeMove runs depth-2 shallow check per player move, fires toast with fade in/out. Voice clips deferred to P6.5.
- [x] **6.3 Checkers vs CPU** ✅ Session 18. Pure JS engine (no external deps), 5 difficulty levels (deeper than chess — lower branching factor), American rules (forced capture, turn ends on promotion), minimax with alpha-beta + TT + killers + IDS. checkersAI.ts, checkersStorage.ts, checkersAssets.ts, useCheckers.ts, CheckersScreen.tsx. 52 tests. 2 audit rounds (Codex + Gemini), 3 bug fixes. No blunder roasts, no take-back.
- [x] **6.4 Memory Score Expansion** ✅ Sessions 16+18. Chess: 5/8/12/18/25 pts per win by difficulty, half for draw. Checkers: same point scale. Max score 140 (7 games × 20). Rank thresholds scaled. Chess + checkers breakdown bars and detailed stat sections added to MemoryScoreScreen.

### Chess Design (shipped in Session 16)
- 5 difficulty levels: Beginner (300ms), Casual (500ms), Intermediate (1s), Advanced (2s), Expert (5s)
- Time-limited iterative deepening — AI searches as deep as it can within budget, gracefully falls back to best move from previous completed depth
- Quiescence search at depth 0 prevents horizon-effect blunders (AI no longer stops mid-capture thinking it's up material)
- Evaluation: material + PST + mobility (3cp/move) + bishop pair (50cp) + doubled/isolated pawns + king safety pawn shield
- One take-back per game, dedicated roast pool
- Player chooses color (w/b) and difficulty before each game
- Custom AI-generated Staunton piece assets (ChatGPT) — 12 PNGs, replaced with 12 anthropomorphic WebP pieces in Session 21

### Checkers Design (shipped in Session 18)
- 5 difficulty levels: Beginner (500ms/depth 4), Casual (800ms/6), Intermediate (1.5s/8), Advanced (3s/10), Expert (5s/14)
- American rules only (forced captures, turn ends on promotion). Freestyle mode built and removed (scope creep).
- Pure material + positional evaluation (no generateMoves in eval — critical perf fix from audit)
- Mate scores include ply penalty for TT consistency
- No blunder roasts, no take-back (simpler than chess)
- Checker piece PNGs (red, red-king, black, black-king) + weathered wood table background (WebP)

### Scoring System (Session 18 overhaul)
- Removed blunder penalty from chess scoring (recordChessResult lost blunderCount param)
- Score max: 140 (7 games × 20), up from 100 (5 games × 20)
- Rank thresholds in memoryRanks.ts scaled to 0–140
- Chess + checkers detailed stat sections added to MemoryScoreScreen
- Missing chess breakdown bar bug fixed

### UI Cleanup (Session 18)
- Emojis removed from SudokuScreen and DailyRiddleScreen headers
- GamesScreen reordered: Daily Riddle first (daily engagement hook), then Chess, Checkers, Trivia, Sudoku, Memory Match, Trophies
- MemoryScoreScreen breakdown bars and detail sections reordered to match

### Audit Gate
- [x] **Session 16 Audit Round 1 (Codex)** — findings fixed (see DFW-Bug-History.md)
- [x] **Session 16 Audit Round 2 (Gemini)** — findings fixed
- [x] **Session 17 Audit Round 1 (Codex + Gemini)** — 6 findings (min-depth guarantee, en-passant flag, killer scores, TT key, mate-score TT, unbounded min-depth) — all fixed
- [x] **Session 18 Checkers Audit Round 1 (Codex + Gemini)** — 3 findings (evaluateBoard perf, mate ply penalty, AI null game-over) — all fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 52 checkers tests + 69 chess tests + existing suites passing
- [x] v1.14.0 (versionCode 31)

---

## SESSION 21 — CHESS OVERHAUL + CUSTOM FONTS (v1.16.0)

**Shipped in:** v1.16.0 (versionCode 33)
**Branch:** `dev`
**New deps:** `expo-font`, `expo-splash-screen`, `@expo-google-fonts/satisfy`, `@expo-google-fonts/lilita-one`
**Build cost:** 1 production build

### Chess Features
- [x] Post-game move review — FEN history tracked per move, step-through with « ‹ › » controls, non-interactive review board, "Review Game" button on game-over overlay
- [x] Check/checkmate indication — red king square, pulsing "CHECK!" text, red board border, hapticHeavy on check, hapticError (notification error pattern) on checkmate
- [x] Turn indicator — pulsing "Your Move" text (accent color, fontSize 20), accent board border when player's turn
- [x] Training mode — threatened pieces highlighted red, AI's last move highlighted gold, toggle in pre-game screen for difficulty 0-2, training games don't record results
- [x] Haptic tiers — light tap on player's turn (suppressed during check), heavy impact on check, long error vibration on checkmate
- [x] hapticError() function added to haptics.ts

### Art
- [x] 12 anthropomorphic chess pieces replacing stock PNGs — cream/gold (white) + charcoal/silver (black), thick outlines, personality per piece type (tired pawn, smug knight, judgmental bishop, etc.)
- [x] 3 calendar empty state illustrations — hammock (day), beach chair (week), couch (month) replacing emoji
- [x] Calendar chrome icon refresh — grid-based calendar replacing "15" number icon
- [x] Plus icon sizes increased across 8 files (FABs 28→34, inline 18→22, etc.)
- [x] NoteEditorModal color picker + circles aligned to match sibling dot sizes

### Fonts
- [x] Satisfy — app title "Don't Forget Why" on HomeScreen
- [x] Lilita One — game screen headers (GamesScreen, Chess, Checkers, Sudoku, Trivia, MemoryMatch, GuessWhy, DailyRiddle)
- [x] Nunito — core screen headers (AlarmList, Reminders, Timer, Notes, VoiceMemos, Calendar, Settings)
- [x] Font loading with expo-font + expo-splash-screen, error fallback to system fonts
- [x] Phase 2: Montserrat Alternates applied to all body text, labels, buttons, descriptions (Session 22)

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 3 rounds
- [x] Round 1 (chess features): P1 isInCheck false on checkmate, duplicate FEN on resign, double haptic. P2 review captures, CHECK! priority. All fixed.
- [x] Round 2 (polish): accessibility on review squares, live regions on CHECK!/Your Move, "Move 0"→"Start", threatened/lastMove in labels, training data persist through game-over. All fixed.
- [x] Round 3 (production): P1 font loading hang, P2 double AI delay, P2 accessibility on color picker buttons, P3 console.log cleanup. All fixed.
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 9 suites, 283 tests passing

---

## SESSION 22 — FONT ROLLOUT + HOOK EXTRACTIONS (v1.17.0)

**Version:** v1.17.0 (versionCode 34)
**Branch:** `dev`
**New deps:** `@expo-google-fonts/montserrat-alternates` (replaced `@expo-google-fonts/nunito`)
**Build cost:** 0 (no native changes — font swap is JS-only)

### File Cleanup
- [x] NoteEditorModal extraction — linkedText.tsx (link detection), NoteVoiceMemo.tsx (recording/playback cards), ColorPickerModal.tsx (reusable color picker)
- [x] SudokuScreen → useSudoku.ts hook (1232 → 753 lines)
- [x] TimerScreen → useTimerScreen.ts hook (1270 → 728 lines)
- [x] DailyRiddleScreen → useDailyRiddle.ts hook (1201 → 983 lines)
- [x] SettingsScreen → useSettings.ts hook (1054 → 673 lines), background picker deduplicated, handleSendFeedback extracted

### Font Rollout
- [x] Phase 2 Part 1: fontFamily applied to all 25 screen files + buttonStyles.ts (fontWeight replaced with fontFamily throughout)
- [x] Phase 2 Part 2: fontFamily applied to all 16 component/modal files
- [x] Font swap: Nunito → Montserrat Alternates (wider, more premium feel)
- [x] Font size reduction pass: 28+ → -2, 16-27 → -2, 13-15 → -1, 12 and below unchanged
- [x] Three-tier font system complete: Satisfy (app title), LilitaOne (game headers), Montserrat Alternates (everything else)

### Visual / Store
- [x] HomeScreen Quick Capture: removed section title and icons, renamed to Quick Note / Quick Record / Quick Timer
- [x] Splash screen backgroundColor → #121220 (dark, eliminates white flash)
- [x] Play Store refresh: 8 new screenshots, updated description (Chess, backup section, corrected theme count to 6)

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 11 findings, all fixed
- [x] Dead solutionGrid state, ColorPickerModal stale ref, dead MemoCard uri prop, fontWeight leftovers, dead styles, stale comments, unused dependency
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 9 suites, 283 tests passing

---

## SESSION 24 — FULL CODEBASE AUDIT SWEEP

**Version:** v1.18.0 (no bump — audit sits on `dev` unshipped)
**Branch:** `dev`
**Build cost:** 0 (no new native deps)
**Commits:** `3e94a28` audit work, `3ae389f` FINAL prompt (reverted by `1991813`), `4820f36` revert cleanup keeping audit intact

### Audit Categories (8)

- [x] **Dead code** — Removed `src/utils/alarmSounds.ts` (dead file), 26 dead icon exports from `Icons.tsx`, orphaned `StyleSheet.create` entries across 13 screens/components, unused imports + locals across 14 files, unexported dead exports across 27 files
- [x] **Theme compliance** — Added `success: string` and `overlaySecondary: string` tokens to `ThemeColors` interface and all 6 themes, fixed 5 light-theme broken screens (text/chrome invisible on card surfaces), hardcoded hex cleanup across 15+ files, capsule pill opacity fix
- [x] **Accessibility** — Foundation layer (`BackButton`/`HomeButton` hitSlop + accessibilityLabel/Role), critical screens (AlarmFire, VoiceRecord, Timer, VoiceMemoDetail), card components, modal dialogs, form screens, game screens, complex components, live regions (accessibilityLiveRegion="polite")
- [x] **Performance** — `removeClippedSubviews`, `windowSize={5}`, `maxToRenderPerBatch={8}`, `initialNumToRender={8}` on all FlatLists. `React.memo` wraps on `NoteCard`, `DeletedNoteCard`, `AlarmCard`, `DeletedAlarmCard`, other list items. `useCallback` stabilization in hooks and list screens to prevent memo bailout
- [x] **Data safety** — `restoreInProgress` mutex flag in backup service, notification cancellation timing fixes, per-row try/catch in migrations (bad row can't tank the whole migration), new `safeParse<T>` + `safeParseArray<T>` utility (src/utils/safeParse.ts), new `withLock` per-key async mutex (src/utils/asyncMutex.ts) wired across 13 storage files, `autoExportBackup` must never throw (background operation)
- [x] **Navigation guards** — `beforeRemove` guards on `CreateAlarmScreen` + `CreateReminderScreen` with `savedRef` bypass pattern (save-then-navigate doesn't trip the guard), `VoiceRecordScreen` confirmation dialog, game screens intercept hardware back, `HomeButton` uses `popToTop()` so guards fire, deep-link paths validate target exists before navigating, note pending TTL, NoteEditor widget protection
- [x] **Type safety** — Migration entity types, storage validation, alarm form non-null fixes, `useSudoku` validation, hook return types
- [~] **UI patterns** — `GameNavButtons.tsx` component created (game-style back/home pair using character icon set) + emoji-chrome sweep plan. **Both reverted in FINAL cleanup.** File remains on disk but references non-exported `APP_ICONS.gameBack`/`gameHome` — stranded.

### Visual Fixes (applied separately, post-audit)
- [x] **FAB chrome circle** — All 4 list screens (`AlarmListScreen`, `NotepadScreen`, `ReminderScreen`, `VoiceMemoListScreen`) now use the same chrome circle pattern as `BackButton`/`HomeButton` (theme-aware `rgba(30, 30, 40, 0.8)` dark fill + 1px white-rgba border). Elevation + shadow removed (fixed the Android hex hole bug). Plus icon renders without `tintColor` so natural silver webp shows through
- [x] **NoteCard silver fallback** — `NoteCard.tsx` + `DeletedNoteCard.tsx` now render `APP_ICONS.notepad` (22×22 natural silver) when `note.icon` is empty, instead of the `📝` emoji fallback

### Stranded Work (reverted, not yet deleted)
- [ ] **Prompt 4 deferred (Session 27)** — VoiceMemoDetailScreen layout reorder (clips-first), bottom toolbar (Attached/Camera/Gallery), share button + per-clip share, photos in attachments panel. Prompt file written and ready.
- [ ] **GameNavButtons component** — file at `src/components/GameNavButtons.tsx` exists but `APP_ICONS.gameBack`/`gameHome` were not added to `appIconAssets.ts`. TypeScript errors. Not imported anywhere. Either wire it or delete it.
- [ ] **Game icon exports** — 8 character icons on disk in `assets/icons/` (icon-hourglass, icon-pencil, icon-erase, icon-chevron-left, icon-chevron-right, icon-game-back, icon-game-home, icon-smiley) but none exported from `appIconAssets.ts`
- [ ] **Chrome icon exports** — `lock.webp` + `checkmark.webp` in `assets/app-icons/` but not in `appIconAssets.ts`
- [ ] **Trivia + Sudoku game sounds** — 5 wav files on disk (`pencil.wav`, `Eraser.wav`, `Triva-tap.wav`, `right-answer-Triva.wav`, `wrong-answer-trivia.wav`) but `gameSounds.ts` SOUNDS registry has no entries for them, and no call sites in `useSudoku` or trivia
- [ ] **audioCompat.ts adoption** — `src/utils/audioCompat.ts` exports `PlayerWithEvents` intersection type to patch expo-audio 55.x type drift, but `gameSounds.ts` and `soundFeedback.ts` still use raw `AudioPlayer` and throw TS errors on `addListener` + `release`. Need to cast via `PlayerWithEvents` and use `.remove()` instead of `.release()`
- [ ] **VoiceMemoListScreen audio TS errors** — same expo-audio type drift at lines 118, 147

### Audit Gate
- [x] Dead code categorical pass
- [x] Theme compliance pass
- [x] Accessibility pass
- [x] Performance pass
- [x] Data safety pass
- [x] Navigation guards pass
- [x] Type safety pass
- [~] UI patterns pass (partially reverted)
- [ ] `npx tsc --noEmit` — **10 errors** in stranded files (`GameNavButtons.tsx` missing icon refs, `gameSounds.ts` + `soundFeedback.ts` + `VoiceMemoListScreen.tsx` audio types). Pre-existing on this branch, introduced when wiring was reverted but orphan files kept.
- [ ] `npx jest` — not re-run since the revert
- [ ] Version bump — deferred until stranded work is resolved

---

## PHASE 6.5 — VOICE CONTENT EXPANSION

**Version Target:** v1.15.0
**Build cost:** 1 production build (--clear flag for new audio assets)

### Tasks

- [ ] **6.5.1 Onboarding voice intro** — Alarm Guy clip on first launch
- [ ] **6.5.2 Voice memos attachable to alarms** — hear your own voice when alarm fires
- [ ] **6.5.3 More in-app roast moments** — navigation, idle, trivia/riddle
- [ ] **6.5.4 Female voice character design pass** — concept only, not shipping yet

---

## PHASE 7 — PRO TIER + BILLING

**Version Target:** v2.0.0

### Tasks

- [ ] **7.1 Pro tier** — ~$1.99 one-time, expose billing UI from P5.5
- [ ] **7.2 Pro gates (enforce)** — voice, photos, drawing, backup, calendar, chess, checkers, online content
- [ ] **7.3 Founding user display** — named badge in Settings
- [ ] **7.4 Android compliance** — edge-to-edge (15), orientation (16)
- [ ] **7.5 Reminder fire → Guess Why** — reminders through AlarmFireScreen
- [ ] **7.6 Master difficulty tier (chess)** — Pro-gated. ~15-20s think time, min-depth 8-10. Strongest local engine level.
- [ ] **7.7 Master difficulty tier (checkers)** — Pro-gated. ~10-15s think time, min-depth 10-12. Strongest local engine level.

---

## PHASE 8 — FIREBASE ONLINE + SOCIAL

**Version Target:** v2.1.0+
**Backend:** Firestore + Cloud Functions (Auth already active from P5)

### Tasks

- [ ] Activate Firestore
- [ ] Online trivia + riddles (unlimited for Pro)
- [ ] Global leaderboards (anonymous)
- [ ] Multiplayer (scope TBD) — chess multiplayer targeted here
- [ ] Cloud Stockfish AI for chess (2000+ ELO via Firebase Cloud Function) — Pro-tier alternative to the local engine. Free tier keeps offline engine; Pro gets cloud Stockfish. Same app, two tiers.

---

## BACKLOG (Not Scheduled)

### Deferred from Session 24
- **Board memoization** — Sudoku 81-cell rebuild on every render, Chess/Checkers 64-cell rebuild. Audited, prompts written, not applied (scope + risk of breaking stable game UX).
- **DrawingCanvas render-tick refactor** — audited, prompt written, not applied
- **ReminderCard extraction** — inline cards in ReminderScreen should move to a component (noted by auditors)
- **Widget emoji cleanup** — needs a new ImageWidget wrapper before emoji can be fully swept from widget layouts
- **Timer preset emoji → icon conversion** — design decision pending (what icon language for presets?)
- **PIN system** — for private alarms/reminders. Once shipped, wire the `lock.webp` chrome icon (currently on disk but unexported)
- **Dual brand identity** — Personality Mode / Clean Mode — concept only

### Features
- Memory Match custom card art — replace emoji with custom-designed images (ChatGPT-generated, DFW-themed). ~20-22 unique cards + custom card back. Polish pass for free tier storefront quality.
- DailyRiddleScreen emoji → custom art pass (category emoji, button label emoji)
- SudokuScreen emoji → custom art pass (win emoji, hint button, new game button)
- Timer notification buttons: "Go Away" + "Start me?"
- Add holidays to calendar
- Theme-responsive icon colors
- Expanded alarm icon picker
- Guess Why Personal Edition
- Trivia/riddle wake-up mode
- Pin toggle inside edit/detail screens
- iOS port (P9+)
- Optional AES-256 backup encryption
- DrawingCanvas dark rgba values

### Store / Marketing
- Widget preview screenshots
- App size audit

### Recurring
- Home screen title centering — verify applied
- Daily Riddle scoring design review

---

## PRO vs FREE BREAKDOWN

### Free Tier — Polished, Fully Functional Core
- All alarms, reminders, timers, notepad
- In-app calendar (day/week/month views)
- All 6 themes (Dark, Light, High Contrast, Vivid, Sunset, Ruby)
- Home screen + 4 widgets
- All personality content (text quotes, roasts, snooze messages, placeholders)
- Sound picker + custom alarm sounds
- Privacy mode, Silence All mode
- Guess Why (built into alarm dismissal)
- Memory Score tracking
- Daily Riddle (daily engagement hook — free forever)
- Trivia (limited offline question pool)
- Memory Match (with custom card art)
- Starter voice roast pack (limited lines)

### Pro Tier — $1.99 One-Time Unlock
- Chess + Checkers (all difficulties including Master tier)
- Sudoku
- Trivia unlimited question pool + online questions (P8)
- Voice memos
- Full voice roast pack + female voice character (P6.5+)
- Custom photo backgrounds + note images
- Drawing canvas
- Backup & Restore (.dfw export/import + auto-export)
- Cloud Stockfish AI for chess (P8)
- Multiplayer chess (P8)
- Online riddles + leaderboards (P8)

---

## CREDIT BUDGET

| Phase | Dev Builds | Prod Builds | Est. Credits |
|-------|-----------|-------------|-------------|
| ~~P4.5 Stability~~ | ~~0~~ | ~~1~~ | ✅ Done |
| P5 Calendar | 1 | 1 | ~2 |
| P5.5 Premium | 1 | 1 | ~2 |
| P6 Games | 0 | 1 | ~1 |
| P6.5 Voice | 0 | 1 | ~1 |
| P7 Pro Tier | 0 | 2 | ~2 |
| P8 Firebase | 0 | 1+ | ~1+ |
| **Total** | **2** | **8+** | **~10–12** |

---

## STANDING RULES

- `react-native-worklets` managed by Expo — no manual pinning
- `npm install` from PowerShell after every WSL package install
- `npx tsc --noEmit` before every production build — 0 errors
- `npx jest` before every production build — all tests pass
- Increment version + versionCode before every production build
- Dual audit (Codex + Gemini) before every ship
- Don't ship dead features
- Build with `--clear` when new assets added
- Always include Jest tests for new services/features
- Four backups: desktop + laptop + GitHub + USB
- Never put repos in OneDrive

---

## 6 THEMES

| Theme | Mode | Accent | Vibe |
|-------|------|--------|------|
| Dark | dark | #5B9EE6 | Blue daily driver |
| Light | light | #2563EB | Blue-tinted ocean |
| High Contrast | dark | #00D4FF | Cyan accessibility |
| Vivid | dark | #00FF88 | Cyberpunk terminal |
| Sunset | light | #E8690A | Orange/amber warmth |
| Ruby | light | #E11D48 | Red/rose bold |

---

## CHANGE LOG

| Date | Change |
|------|--------|
| Mar 19 | Document created. P1 complete. |
| Mar 20 | Production approved. App live. |
| Mar 22 | v1.4.0 — timer dismiss hotfix. |
| Mar 25 | v1.5.0 — calendar, refactors, polish. |
| Mar 26 | P2 complete — images, drawing, Skia. |
| Mar 27 | P2 complete — backgrounds, per-alarm photo. |
| Mar 28 | v1.6.0 + v1.6.1 shipped. P3 voice roasts pre-work. |
| Mar 29 | P3 complete — 68 clips, ALARM stream. |
| Mar 30 | P3.5 complete — voice memos, MicWidget. v1.8.0 shipped. |
| Mar 31 | v1.8.1 SDK 55 upgrade. |
| Apr 1 | v1.9.0 Home screen. Session 9 visual overhaul. |
| Apr 3 | Session 13 visual overhaul shipped as v1.10.1. 6 themes, 15+ screens themed. |
| Apr 3 | Session 14 onboarding overhaul. Theme cycling, mic/camera permissions, sarcastic skip warnings. |
| Apr 4 | Session 14 P4 Vault complete. Export/Import Memories, SAF auto-export, transactional restore, manifest validation. 2 audit rounds, all findings fixed. |
| Apr 4 | Roadmap restructured. P4.5 Stability Sprint, P5.5 Premium Foundation, P6.5 Voice Expansion added. Named founding tiers. Blunder Roast. |
| Apr 4 | Session 15 P4.5 Stability Sprint complete. v1.12.0 shipped. NotepadScreen + AlarmListScreen decomposed. Full a11y pass. 10 PNGs → WebP (30 MB saved). OOM prevention on 5 FlatLists. Jest: 162 tests across 7 suites. Package audit clean. |
| Apr 5 | Session 16 P6 Chess in progress. chess.js + custom Staunton piece assets, iterative-deepening minimax w/ quiescence search, 5 difficulties (300ms → 5s), full game hook + screen, SQLite persistence, 58 blunder-roast lines, Memory Score integration. Emoji picker overhaul shipped: 11 categories, 105 labeled emojis, context-specific quick-picker rows. P5 Google Calendar deferred (conflicts with no-accounts brand). Two audit rounds (Codex + Gemini), all findings fixed. Checkers not started. |
| Apr 5 | Session 17 P6 Chess engine hardened. Opening book (104 positions), transposition table with halfmove-aware key + mate-score ply adjustment, killer moves, null-move pruning, min-depth/max-time difficulty model with 3× safety deadline, tapered eval, passed-pawn bonus, rook on open file. 2 audit rounds completed (6 findings, all fixed). 232 tests passing across 9 suites. Chess targeted to ship as v1.13.0 solo; Checkers + Premium Foundation pushed back. P8 Firebase scope now includes chess multiplayer + Pro-tier cloud Stockfish. |
| Apr 5 | Session 18 P6 complete. Checkers shipped: pure JS engine (minimax, alpha-beta, TT, killers, IDS, forced captures, multi-jump, king promotion), 5 difficulty levels, American rules only (freestyle built and removed). 3 audit bug fixes (evaluateBoard perf, mate ply penalty, AI null game-over). Scoring system overhauled: max 140 (7×20), rank thresholds scaled, chess blunder penalty removed, chess+checkers stat sections added to MemoryScoreScreen. UI cleanup: emoji removal from headers, GamesScreen reordered (Daily Riddle first). v1.14.0 (versionCode 31). |
| Apr 6 | Session 19 visual art overhaul. Memory Match → Memory Guy Match with 22 custom card images + card back + felt background. 10 trivia category icons + library background. 9 rank tier images with new titles (The Rock → The Elephant). Score screen emoji → custom art. GamesScreen icons → custom art. P5.5 roadmap revised: no grandfathering, expo-iap, revised Pro/Free split. Dual audit clean (0 P0/P1). |
| Apr 7 | Session 20 silver metallic icon set. 25+ silver/chrome utility icons replacing View-based CSS geometry + emoji. Two-tier visual language (silver core, anthropomorphic games). Screen headers on 7 core screens. Sound mode icons. ShareNoteModal icons. FAB plus buttons. Guess Why art. Checker pieces (4 WebP). Icons.tsx pruned. Jest webp moduleNameMapper. Accessibility labels. TimerScreen header absolute positioning. |
| Apr 7 | Session 21 chess overhaul + custom fonts. v1.16.0 (versionCode 33). Chess: post-game move review (FEN history, step-through), check/checkmate indication (red king, CHECK! banner, red border, haptic tiers), training mode (threatened red, last move gold, toggle for difficulty 0-2). 12 anthropomorphic chess pieces. 3 calendar empty state illustrations. Calendar icon refresh. Plus icon sizes. Color picker alignment. Fonts: Satisfy (title), Lilita One (games), Nunito (core headers). 3 audit rounds (9 findings, all fixed). 283 tests passing. |
| Apr 8 | Session 22 font rollout + hook extractions. v1.17.0 (versionCode 34). Phase 2 font: Montserrat Alternates applied to all body text across 25 screens + 16 components + buttonStyles. Font swap Nunito→Montserrat Alternates. Font size reduction pass. Hook extractions: useSudoku, useTimerScreen, useDailyRiddle, useSettings. NoteEditorModal cleanup: linkedText, NoteVoiceMemo, ColorPickerModal extracted. Quick Capture renamed. Splash bg dark. Play Store refresh. Dual audit (11 fixes). |
| Apr 9 | Session 23 game sounds + media control icons + close-x. v1.18.0 (versionCode 35). 11 wav files wired via gameSounds.ts, 5 media control WebP assets, GlowIcon component, FAB glow, close-x chrome icon (15 replacements), checkmate banner, take back label fix, chess light mode fix. 3 audit rounds, 6 fixes. |
| Apr 10 | Session 24 full codebase audit sweep. 8-category dual audit (Codex + Gemini). Dead code removed (alarmSounds.ts + 26 icon exports + orphan styles across 13 files + dead exports across 27 files). Theme tokens added (success + overlaySecondary). Accessibility pass across critical screens/cards/modals/forms/games. FlatList perf configs. Data safety: safeParse + asyncMutex utilities wired across 13 storage files, restore mutex, never-throw autoBackup. Navigation beforeRemove guards with savedRef bypass. Type safety in migrations/forms/hooks. `audioCompat.ts` type-compat layer scaffolded (not yet imported). `GameNavButtons.tsx` + 8 game icons + 5 new trivia/sudoku sounds + lock/checkmark chrome icons on disk but wiring was reverted after laptop issues (stranded files: broken icon refs in GameNavButtons). Visual fixes: FAB chrome circle on 4 list screens, silver notepad fallback on NoteCard/DeletedNoteCard. No version bump — audit sits on dev unshipped. |
| Apr 12 | Session 27 NoteEditorModal redesign + note titles. NoteEditorModal rewritten: useNoteEditor hook extraction (all state + logic), 5 sub-components (NoteEditorTopBar, NoteEditorToolbar, NoteColorPicker, NoteImageStrip), bottom toolbar (Camera, Gallery, Draw, Colors, Attached), dropdown menu eliminated. Voice recording removed from notes (legacy playback kept via MemoCard). Text limits removed (notes unlimited, voice memo notes unlimited, titles stay 100). Note title feature: new `title` column on notes table, Note type updated, wired through useNoteEditor + useNotepad + NoteEditorModal save flow, title UI in editor. Attachments panel: images behind paperclip button in edit mode, inline in view mode. Scrollable image strip (horizontal ScrollView). Icon size consistency pass across 10+ files (save=24, edit=24, trash=20, toolbar circles ~56, icons ~28, HomeButton=24, BackButton=22). New asset: paperclip.webp. Dual audit (Codex + Gemini) — 6 findings fixed. Visual polish: image positioning, centering, title layout. |
| Apr 11 | Session 26 voice memo clips + photos + icon overhaul. Memos are now containers holding multiple audio clips (`voice_clips` table, `VoiceClip` type, `voiceClipStorage` service, automatic legacy migration). Clip playback modes (Stop/Play All/Repeat). Voice memo photos via camera (record screen) + gallery (detail screen), 5-photo cap, ImageLightbox view, new `voice-memo-images/` folder + `images TEXT` column on voice_memos. Recording flow rewrite: VoiceRecordScreen creates memo + first clip directly, eliminates `tempUri` handoff path entirely, atomic save with rollback on clip failure. Icon overhaul: floppy-disk (save) + pencil (edit) icons, replaced text Edit/Save buttons with circle icon buttons across VoiceMemoDetail/NoteEditorModal/CreateAlarm/CreateReminder, timer modal redesigned (3 circle action buttons: red cancel / accent save-only / success start with new `handleModalSaveOnly`), sound/bell + emoji circles got tappable treatment, reminder/timer/alarm icon-picker fallbacks show silver `+`, calendar inline icons restructured into proper flex rows. Dual audit (Codex + Gemini) — 8 findings fixed (HIGH: focus reload missed memo, non-atomic save, stale capturedPhotos closure; MEDIUM: 5-photo cap, backup meta count, migration inserter; LOW: a11y label, Array.isArray). Re-audit clean. 315 tests passing, tsc clean. Ready for device testing then ship. |
