# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: Session 17 (April 5, 2026)

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.12.0 (versionCode 29) — P4.5 Stability Sprint |
| **Branch** | `dev` |
| **Production Status** | ✅ v1.12.0 submitted to Google Play |
| **Current Focus** | P6 Chess engine hardened (Session 17 upgrades + 2 audit rounds). Ready for dev build + device testing, then v1.13.0 chess-only ship. Checkers still deferred. |
| **Blocked By** | Nothing |
| **Next Action** | Dev build → physical-device test → v1.13.0 production ship (chess only). Delete `__tests__/chessAISelfPlay.test.ts` before production build. |
| **EAS Credits** | ~35 remaining (reset April 12) |
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
| 6 | Chess + Checkers + Blunder Roast | 🚧 In Progress | Prod only |
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

**Version Target:** v1.13.0
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build only

### Tasks

- [ ] **5.5.1 Entitlement storage** — local entitlement in kv_store with tier, date, reason
- [ ] **5.5.2 Grandfather / founder logic** — detect existing users, grant named tier
- [ ] **5.5.3 Backup entitlement flag** — export/import entitlement with .dfw backup
- [ ] **5.5.4 Billing plumbing (hidden)** — Google Play Billing built but not user-facing
- [ ] **5.5.5 Pro feature gate scaffold** — useEntitlement() hook, apply gates
- [x] **5.5.6 Emoji picker overhaul** ✅ Shipped early in Session 16. 11 categories, 105 labeled emojis (Health, Routine, Food, Fitness, Home, Work/School, Finance, People, Travel, Pets, More). EmojiPickerModal: horizontal capsule category tabs + 5-column labeled grid, container height 45%. Quick emoji differentiated per context: alarms get 8 wake-up emojis, reminders get 8 recurring-event emojis.

### Founding Tiers
- **Founding Tester** — closed testing participants
- **Founding User** — first 90 days of production
- **Early Supporter** — first year of production

### Audit Gate
- [ ] Full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 6 — CHESS + CHECKERS + BLUNDER ROAST 🚧 IN PROGRESS

**Version Target:** v1.14.0
**Branch:** `dev`
**New deps:** `chess.js` (JS only)
**Build cost:** 1 production build only

### Tasks

- [x] **6.1 Chess vs CPU** ✅ Session 16. chess.js, 5 difficulty levels, custom AI-generated Staunton piece PNGs, Memory Score integrated. Iterative-deepening minimax with alpha-beta, MVV-LVA move ordering, quiescence search, time-budgeted search (300ms → 5s per difficulty). Full hook (useChess.ts) + screen (ChessScreen.tsx). Game state persists to SQLite across app close.
- [x] **6.1.1 Chess engine upgrades** ✅ Session 17. Opening book (104 hardcoded positions, 6-10 plies of theory), transposition table (100K FEN-keyed entries with mate-score ply adjustment), killer-move heuristic, null-move pruning, min-depth + max-time difficulty model with 3× safety deadline, tapered evaluation (continuous material-phase blending), passed-pawn bonus (rank-scaled + endgame-scaled), rook on open/semi-open file. 2 audit rounds completed (6 findings, all fixed). 69 chessAI tests (232 total across the suite) passing.
- [x] **6.2 Blunder Roast (text)** ✅ Session 16. 5 severity tiers + take-back pool, 58 roast lines, analyzeMove runs depth-2 shallow check per player move, fires toast with fade in/out. Voice clips deferred to P6.5.
- [ ] **6.3 Checkers vs CPU** — pure JS, 2+ difficulty levels, Memory Score integration. Deferred past v1.13.0 — chess ships solo.
- [x] **6.4 Memory Score Expansion (Chess)** ✅ Session 16. Chess scoring integrated: 5/8/12/18/25 pts per win by difficulty, half points for draw, -2 per blunder, min 0 per game. Checkers scoring deferred until Checkers ships.

### Chess Design (shipped in Session 16)
- 5 difficulty levels: Beginner (300ms), Casual (500ms), Intermediate (1s), Advanced (2s), Expert (5s)
- Time-limited iterative deepening — AI searches as deep as it can within budget, gracefully falls back to best move from previous completed depth
- Quiescence search at depth 0 prevents horizon-effect blunders (AI no longer stops mid-capture thinking it's up material)
- Evaluation: material + PST + mobility (3cp/move) + bishop pair (50cp) + doubled/isolated pawns + king safety pawn shield
- One take-back per game, dedicated roast pool
- Player chooses color (w/b) and difficulty before each game
- Custom AI-generated Staunton piece assets (ChatGPT) — 12 PNGs, not emoji/unicode

### Still to do (Chess polish)
- Testing pass on physical device at each difficulty (minDepth/maxDepth + safety-deadline behaviour on real hardware)
- Delete `__tests__/chessAISelfPlay.test.ts` before production build (benchmark-only, slow)
- Checkers implementation (deferred past v1.13.0)
- Blunder Roast voice clips (deferred to P6.5)

### Audit Gate
- [x] **Session 16 Audit Round 1 (Codex)** — findings fixed (see DFW-Bug-History.md)
- [x] **Session 16 Audit Round 2 (Gemini)** — findings fixed
- [x] **Session 17 Audit Round 1 (Codex + Gemini)** — 6 findings (min-depth guarantee, en-passant flag, killer scores, TT key, mate-score TT, unbounded min-depth) — all fixed
- [ ] Final full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

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

### Features
- Timer notification buttons: "Go Away" + "Start me?"
- Add holidays to calendar
- Theme-responsive icon colors
- Expanded alarm icon picker
- Guess Why Personal Edition
- Trivia/riddle wake-up mode
- Pin toggle inside edit/detail screens
- iOS port (P9+)
- Optional AES-256 backup encryption
- NoteEditorModal voiceMemoStyles theming
- DrawingCanvas dark rgba values

### Store / Marketing
- Play Store listing update for home screen, voice memos, backup
- Widget preview screenshots
- App size audit

### Recurring
- Home screen title centering — verify applied
- Daily Riddle scoring design review

---

## PRO vs FREE BREAKDOWN

### Free Tier — Keeps Everything Current, Forever
- All alarms, reminders, timers, notepad
- In-app calendar (day/week/month views)
- All 6 themes (Dark, Light, High Contrast, Vivid, Sunset, Ruby)
- All 5 games (Guess Why, Memory Match, Trivia offline, Sudoku, Daily Riddle)
- Memory Score tracking
- Home screen + 4 widgets
- All personality content (text quotes, roasts, snooze messages, placeholders)
- Sound picker + custom alarm sounds
- Privacy mode, Silence All mode

### Pro Tier — ~$1.99 One-Time Unlock
- Voice roasts + voice memos + voice on alarms
- Custom photo backgrounds + note images + drawing
- Backup & Restore (.dfw export/import + auto-export)
- Google Calendar sync
- Chess + Checkers + Blunder Roast
- Online trivia + riddles (unlimited)
- Leaderboards

### Founding Tiers — Automatic, Named, Permanent
- Founding Tester / Founding User / Early Supporter
- All Pro features forever, no charge
- Named badge in Settings
- Survives backup/restore

---

## CREDIT BUDGET

| Phase | Dev Builds | Prod Builds | Est. Credits |
|-------|-----------|-------------|-------------|
| ~~P4.5 Stability~~ | ~~0~~ | ~~1~~ | ✅ Done |
| P5 Calendar | 1 | 1 | ~2 |
| P5.5 Premium | 0 | 1 | ~1 |
| P6 Games | 0 | 1 | ~1 |
| P6.5 Voice | 0 | 1 | ~1 |
| P7 Pro Tier | 0 | 2 | ~2 |
| P8 Firebase | 0 | 1+ | ~1+ |
| **Total** | **1** | **8+** | **~9–11** |

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
