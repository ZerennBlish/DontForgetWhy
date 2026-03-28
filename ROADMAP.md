# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: March 28, 2026

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.6.1 (versionCode 20) live on Play Store |
| **Branch** | `dev` (synced with main) |
| **Production Status** | ✅ Live on Google Play |
| **Current Focus** | P3 voice roasts — implementation |
| **Blocked By** | Nothing |
| **Next Action** | Bundle voice clips as assets → wire audio playback → 2.0.0 release |
| **EAS Credits** | ~21 remaining (reset April 12) |
| **Firebase Credits** | $300 available — NOT activated yet (90-day clock starts on activation) |
| **ElevenLabs** | Subscription active — voice asset generation ready |

---

## PHASE STATUS

| Phase | Name | Status | Branch | Build Type |
|-------|------|--------|--------|------------|
| 1 | Housekeeping | ✅ Done | main | — |
| 2 | Photos + Drawing + Backgrounds | ✅ Done | dev | Dev + Prod |
| 3 | Voice Roasts | ⬜ Next | dev | Dev + Prod |
| 4 | Chess + Checkers | ⬜ Waiting | dev | Prod only |
| 5 | Google Calendar Sync | ⬜ Waiting | dev | Dev + Prod |
| 6 | Memory Score Expansion | ⬜ Waiting | dev | Prod only |
| 7 | Online + Social (Firebase) | ⬜ Waiting | dev | Prod |
| 8 | Pro Tier + Platform | ⬜ Waiting | dev | Multiple |

---

## PRODUCTION LAUNCH SEQUENCE

**Status: ✅ COMPLETE**

- [x] Closed testing published (v1.3.0 through v1.3.5)
- [x] 48 installs confirmed (12 minimum required)
- [x] 14-day testing window started
- [x] 14-day testing window ends (~March 20, 6:39 PM)
- [x] Apply for production in Play Console
- [x] Answer Google's review questions
- [x] Wait for Google review (~7 days) — **DO NOT touch store listing**
- [x] Production approved
- [x] Update Play Store screenshots (8 professional graphics uploaded)
- [x] Update feature graphic if needed
- [x] Review/update app description and what's-new text
- [x] Announce to testers that app is live
- [x] Merge `main` into `dev` branch
- [x] Begin Phase 2
- [x] v1.4.0 hotfix shipped (timer dismiss race condition)
- [x] v1.5.0 in progress on dev (calendar, refactors, polish)

---

## PHASE 1 — HOUSEKEEPING ✅ COMPLETE

**Shipped in:** v1.3.4 (versionCode 11)
**Audited:** Audit 28 — Codex clean, Gemini clean

- [x] 1.1 Extract shared utility functions → `soundModeUtils.ts`, `useCalendar.ts`, `useDaySelection.ts`
- [x] 1.2 Reconcile `testing-setup` branch with `main` → 222/222 tests passing
- [x] 1.3 Rename `refreshTimerWidget` → `refreshWidgets` → 14 files updated
- [x] 1.4 Timer storage async mutex → `withLock` on write operations

---

## PHASE 2 — PHOTOS + DRAWING + BACKGROUNDS ✅ COMPLETE

**Shipped in:** v1.6.1 (production) — v1.6.0 initial ship, v1.6.1 added draw-on-photos
**Branch:** `dev`
**New deps:** `expo-image-picker`, `@shopify/react-native-skia`, `expo-file-system`
**Existing dep:** `reanimated-color-picker` (already installed)

### Free Features

- [x] **2.0 In-app Calendar** (CalendarScreen.tsx — DONE in v1.5.0)
  - Full month/week/day views with react-native-calendars (JS-only, no native dep)
  - Colored dot indicators: red=alarms, blue=reminders, green=notes
  - Filter capsules, create buttons with initialDate prefill
  - Accessible via nav card on AlarmListScreen
- [x] **2.0a AlarmListScreen refactor** — extracted AlarmsTab.tsx (DONE)
- [x] **2.0b NotepadScreen refactor** — extracted NoteEditorModal.tsx (DONE)
- [x] **2.0c UI polish** — dark capsule BackButton, floating headers on Settings/DailyRiddle/NoteEditorModal (DONE)
- [x] **2.0d Audit 33** — all findings resolved (DONE)
- [x] **2.6 Calendar widget** — CalendarWidget with dot indicators (DONE in v1.5.0)
- [x] **2.7 Tablet responsive pass** — Onboarding, Sudoku, MemoryMatch, MemoryScore (DONE in v1.5.0)

### Pro Features

- [x] **2.1 Note image attachments** ✅ COMPLETE (March 26, 2026)
  - Photo attachments via gallery (expo-image-picker, max 3 per note, JPEG quality 0.7)
  - Image-only notes supported (no text required)
  - Thumbnail display in editor (edit + view mode) with lightbox viewer
  - Share: text-only or photos via Sharing.shareAsync
  - Print: base64 data URIs via buildNoteHtml helper, white background for ink efficiency
  - Transactional save with rollback on failure
  - Image files managed by noteImageStorage service (expo-file-system v19)
  - Note cards show camera count indicator
  - Emoji picker removed from NoteEditorModal (keyboard emoji sufficient)
  - Audit 36: all findings resolved (transaction order, duplicate keys, print base64, resizeMethod)

- [x] **2.2 Notepad drawing/sketch mode** ✅ COMPLETE (March 26, 2026)
  - Full-screen Skia canvas (DrawingCanvas.tsx) with PanResponder touch handling
  - Strokes stored as serializable StrokeData (SVG path strings) — memoized SkPaths for 60fps performance
  - Tools: pen, eraser (draws in BG color), undo, clear (with confirmation), cancel (with discard prompt)
  - 4 stroke widths: XS(1), S(3), M(6), L(12) — default S
  - 8-color palette + custom color picker + custom canvas background color picker
  - S Pen pressure: sampled on touch start, modulates stroke width
  - Drawings save as PNG + companion JSON (stroke data for re-editing)
  - Edit flow: thumbnail tap offers View/Edit for drawings, new filename on edit (cache bust), old files deleted
  - saveNoteImage detects .png, copies companion .json through save pipeline
  - loadDrawingData early-returns null for .jpg (no reading photos as text)
  - Share modal: custom dark modal (replaced Alert.alert). Options: Share Text, Share Photos, Share as PDF, Print, Cancel
  - Share as PDF: buildNoteHtml → Print.printToFileAsync → Sharing.shareAsync
  - buildNoteHtml detects .png/.jpg for correct MIME type in base64 data URIs
  - Empty canvas save blocked, cancel prompts when strokes exist
  - Audit 37: 3 HIGH, 2 MEDIUM, 2 LOW — all resolved

- [x] **2.3 Custom photo background underlay** ✅ COMPLETE (March 27, 2026)
  - One user-selected photo shared across AlarmListScreen, NotepadScreen, CalendarScreen
  - backgroundStorage.ts: atomic save (copy first, persist key, delete old), ${Paths.document}backgrounds/
  - Settings: "Screen Background" section with photo picker, thumbnail preview, clear, opacity presets (30-80%)
  - Screens: conditional render — photo + dark overlay when set, fullscreenicon.png watermark when not
  - onError fallback: setBgUri(null) if image fails to load

- [x] **2.4 Per-alarm photo on fire screen** ✅ COMPLETE (March 27, 2026)
  - Optional photoUri field on Alarm type
  - alarmPhotoStorage.ts: saves to ${Paths.document}alarm-photos/, cleanup on purge/permanentDelete
  - Deferred save pattern: photo stays in ImagePicker cache until alarm save succeeds
  - CreateAlarmScreen: "Wake-up Photo" section with placeholder/thumbnail/clear
  - AlarmFireScreen: conditional ImageBackground — alarm.photoUri if set, lightbulb.png fallback, onError recovery
  - Timers always use lightbulb.png (no photo support)

- [x] **2.8 Draw on photos** ✅ COMPLETE (March 28, 2026)
  - Tap any photo attachment in notepad to annotate with full drawing tools
  - DrawingCanvas: backgroundImageUri prop, Skia SkImage rendering behind strokes
  - Source photo copied to durable storage for re-editing
  - Eraser disabled on photo backgrounds (undo covers use case)
  - Done button gated on canvas readiness (layout + image loaded)
  - loadDrawingData derives JSON path from URI (works in any directory)
  - Calendar tap-to-navigate on event cards, week view shows next 7 days

### Removed from Phase 2

- ~~2.5 App text color picker~~ — REMOVED. Dark capsule pattern solved readability without user configuration. Dark overlays with auto-contrast text selection on photo backgrounds. Zero-config, visually consistent.

### Notes
- Tablet responsive pass deferred to standalone task for remaining screens (not part of P2 scope)
- No new native dependencies in 2.3/2.4 (expo-image-picker and expo-file-system already installed from 2.1/2.2)
- `useCalendar` hook accepts `initialDate` and `onSelectDate` callback
- `reanimated-color-picker` remains installed for custom theme builder

### Audit Gate
- [x] Full dual audit (Codex + Gemini) before production build
- [x] `npx tsc --noEmit` — 0 errors
- [x] Increment `expo.version` and `expo.android.versionCode` in `app.json`

---

## PHASE 3 — VOICE ROASTS

**Status:** ⬜ Pre-work complete — voice clips generated, implementation next
**Branch:** `dev`
**New deps:** `expo-av`
**External tool:** ElevenLabs (subscription active)
**Build cost:** 1 dev build + 1 production build (or share dev build with Phase 2)

### Pre-Work (No Code — Asset Generation)
- [x] Generate alarm fire voice clips in ElevenLabs
- [x] Generate snooze shame voice clips (4 tiers matching existing text tiers)
- [x] Generate wake-up greeting clips ("Hey you" variants)
- [x] Export and organize clips as bundled assets

### Tasks

- [ ] **3.1 Alarm fire voice lines**
  - Pre-recorded clips bundled in app assets
  - Played via `expo-av` when alarm fires

- [ ] **3.2 Snooze shame voice escalation**
  - Tier-matched to existing `snoozeTiers` in `snoozeMessages.ts`
  - Escalating sass per snooze count (4 tiers)

- [ ] **3.3 Wake-up greeting ("Hey you")**
  - Plays on alarm fire before/alongside main content

### Voice Character
- Male, early 30s, American accent
- Personality: tired, sarcastic, self-aware app with his own life (coworkers, dates, opinions)
- Not mean — just over it. Competent but would rather be anywhere else
- Clean language — no profanity (competitive advantage, keeps E rating)
- Designed and generated in ElevenLabs v3 with audio tags
- Female character (girlfriend) planned as future user-selectable voice

### Clip Counts
- Intro: 1
- Alarm fire: 17
- Snooze tier 1: 4
- Snooze tier 2: 6
- Snooze tier 3: 5
- Snooze tier 4: 6
- Guess Why before: 5
- Guess Why correct: 4
- Guess Why wrong: 4
- Dismiss: 10
- Total: 62 clips

### Blockers
- None anticipated

### Notes
- All clips are pre-recorded and bundled — NO runtime API calls to ElevenLabs
- Voice features are Pro-tier only (Phase 8 gates this)
- Build with `--clear` flag when new audio assets are added

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 4 — NEW GAMES

**Status:** ⬜ Not started
**Branch:** `dev`
**New deps:** `chess.js` (JS only — no native modules)
**Build cost:** 1 production build only (no dev build needed)

### Tasks

- [ ] **4.1 Chess vs CPU**
  - `chess.js` for move validation and game state
  - AI opponent (difficulty TBD)
  - Integration with Memory Score system

- [ ] **4.2 Checkers vs CPU**
  - Pure JS implementation (no library needed)
  - AI opponent (difficulty TBD)
  - Integration with Memory Score system

### Blockers
- None anticipated — pure JS, no native deps

### Notes
- These are Pro-tier features (Phase 8 gates this)
- Need to design difficulty levels during planning phase
- Background images needed (same pattern as existing game screens)

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 5 — GOOGLE CALENDAR SYNC

**Status:** ⬜ Not started
**Branch:** `dev`
**New deps:** `expo-auth-session` + related auth deps
**Build cost:** 1 dev build + 1 production build minimum

### Tasks

- [ ] Google OAuth via Firebase Auth
- [ ] Calendar sync implementation (direction TBD — push alarms/reminders to calendar, pull events, or both)
- [ ] Sync settings UI in Settings screen

### Blockers
- Firebase Auth must be set up first (may overlap with Phase 7 backend work)

### Notes
- Pro-tier feature (Phase 8 gates this)
- Requires Firebase Auth — consider whether to activate Firebase earlier to align with this phase
- Scope needs full design discussion before prompts are written

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 6 — MEMORY SCORE EXPANSION

**Status:** ⬜ Not started
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build only

### Tasks

- [ ] Update Memory Score system to track all 7 games
  - Currently tracks: Memory Match, Trivia, Sudoku, Daily Riddle, Guess Why
  - Adding: Chess, Checkers
- [ ] Scoring criteria design for Chess and Checkers

### Blockers
- Phase 4 must be complete (Chess + Checkers need to exist first)

### Notes
- Depends on Phase 4 — cannot start until games are built
- Scoring design needs discussion before implementation

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 7 — ONLINE + SOCIAL (FIREBASE)

**Status:** ⬜ Not started
**Branch:** `dev`
**Backend:** Firebase — Firestore + Cloud Functions + Auth
**Credits:** $300 Firebase credit available (90-day clock starts on activation)
**Build cost:** 1+ production builds

### Tasks

- [ ] Firebase project setup
  - Firestore database
  - Cloud Functions
  - Firebase Auth (may already exist from Phase 5)
- [ ] Online trivia — unlimited questions for Pro users
- [ ] Online riddles — unlimited riddles for Pro users
- [ ] Leaderboards
- [ ] Multiplayer (scope TBD)

### Blockers
- Firebase credit 90-day timer — need to time activation strategically
- If Phase 5 activates Firebase Auth first, coordinate to avoid wasted setup

### Notes
- Solves the finite offline question pool problem for trivia and riddles
- All online features are Pro-tier (Phase 8 gates this)
- $300 Firebase credit + $200 Azure credit held as backup
- Full design discussion needed before implementation

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before every production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 8 — MONETIZATION + PLATFORM

**Status:** ⬜ Not started
**Branch:** `dev`
**Build cost:** Multiple builds across sub-tasks

### Tasks

- [ ] **8.1 Pro tier (~$1 one-time unlock)**
  - Google Play Billing integration
  - Pro gate on: voice, photos, drawing, online content, calendar sync, Chess, Checkers
  - **Free tier keeps ALL current features permanently**
  - Philosophy: "Pay to add premium stuff" — NOT "pay to remove annoyances"

- [ ] **8.2 Edge-to-edge layout (Android 15)**
  - Required for Android 15 compliance

- [ ] **8.3 Orientation restrictions (Android 16)**
  - Required for Android 16 compliance

- [ ] **8.4 iOS port**
  - Scope TBD — full design discussion needed

- [ ] **8.5 Reminder-fire flow with Guess Why support**
  - Deferred from earlier development — reminders don't currently fire through AlarmFireScreen

### Blockers
- 8.1 should come after most Pro features are built (Phases 2–7)
- 8.2 and 8.3 depend on Android release timelines
- 8.4 requires Apple Developer account + significant scoping

### Notes
- Pro tier pricing: ~$1 one-time purchase
- 8.5 was specifically deferred — reminders use a different notification flow than alarms

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before every production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## BACKLOG (Not Scheduled)

- Recurring reminder UX: annual recurring set for today when time passed should auto-schedule next year; completing recurring should gray out + reappear at next occurrence
- Daily Riddle scoring: needs design review — unclear if point values are well-tuned
- Expo SDK 55 upgrade: deferred until after Phase 3
- AlarmListScreen further decomposition (~600 lines — not urgent)
- NotepadScreen list-side extraction (~800 lines — not urgent)

---

## PRO vs FREE BREAKDOWN

### Free Tier — Keeps Everything Current, Forever
- All alarms, reminders, timers, notepad
- In-app calendar (day/week/month views)
- All current themes + custom theme builder
- Guess Why, Memory Match, Trivia (offline), Sudoku, Daily Riddle
- Memory Score tracking
- Home screen widgets (both widget types)
- All personality content (sarcastic text — quotes, roasts, snooze messages, placeholders)
- Sound picker + custom alarm sounds
- Privacy mode, Silence All mode

### Pro Tier — ~$1 One-Time Unlock
- Voice roasts (alarm fire + snooze escalation + wake-up greeting)
- Custom photo backgrounds (main screens + per-alarm fire screen)
- Note image attachments
- Notepad drawing/sketch (Skia + S Pen)
- Google Calendar sync
- Chess vs CPU
- Checkers vs CPU
- Online trivia (unlimited via Firebase)
- Online riddles (unlimited via Firebase)
- Leaderboards

---

## BUILD CREDIT BUDGET

| Phase | Dev Builds | Prod Builds | Est. Credits |
|-------|-----------|-------------|-------------|
| 2 | 1 | 1 | ~2 |
| 3 | 1 (or shared w/ P2) | 1 | ~1–2 |
| 4 | 0 | 1 | ~1 |
| 5 | 1 | 1 | ~2 |
| 6 | 0 | 1 | ~1 |
| 7 | 0 | 1+ | ~1+ |
| 8 | 1+ | 2+ | ~3+ |
| **Total** | **3–4** | **8+** | **~11–14** |

Credits reset on the **12th of each month** (~30 credits/month on Starter plan).
Batch native deps within phases to minimize dev builds.
**Optimization:** Install Phase 2 + Phase 3 native deps in one dev build → saves 1 credit.

---

## STANDING RULES

- `react-native-worklets` pinned at `0.5.1` — do not upgrade
- `npm install` from PowerShell after every WSL package install
- `npx tsc --noEmit` before every production build — must be 0 errors
- Increment `expo.version` + `expo.android.versionCode` before every production build
- Audit before every ship — no exceptions
- Don't ship dead features — if it does nothing, remove it
- Build with `--clear` flag when new assets are added
- Merge `main` into `dev` before starting post-launch work (never reverse)
- `testing-setup` branch: merge `main` into it periodically, never reverse
- Four backups: desktop + laptop + GitHub + USB
- Never put repos in OneDrive

---

## CHANGE LOG

| Date | Change |
|------|--------|
| Mar 19, 2026 | Document created. Phase 1 complete. Production launch sequence in progress. |
| Mar 20, 2026 | Production approved. App live on Google Play. |
| Mar 22, 2026 | v1.4.0 shipped — timer dismiss race condition hotfix. Store screenshots updated. |
| Mar 25, 2026 | v1.5.0 on dev — Calendar feature, AlarmListScreen/NotepadScreen refactors, UI polish, Audit 33 complete. |
| Mar 25, 2026 | Removed 2.5 (text color picker) from roadmap. Readability solved by dark capsule pattern + auto-contrast overlays. |
| Mar 26, 2026 | P2 2.1 (Note image attachments) complete. Deps installed: expo-image-picker, @shopify/react-native-skia, expo-file-system. Emoji picker removed. Audit 36 all resolved. |
| Mar 26, 2026 | P2 2.2 (Drawing canvas) complete. Skia canvas, pen/eraser/undo, custom colors, S Pen pressure, PNG+JSON save, share modal with PDF. Audit 37 all resolved. |
| Mar 27, 2026 | P2 2.3 (Custom photo backgrounds) complete. backgroundStorage.ts, Settings photo picker, opacity presets, 3 screens updated. |
| Mar 27, 2026 | P2 2.4 (Per-alarm photo) complete. alarmPhotoStorage.ts, deferred save pattern, CreateAlarmScreen photo picker, AlarmFireScreen conditional background. |
| Mar 27, 2026 | P2 fully COMPLETE. File splits (ShareNoteModal, ImageLightbox, DayPickerRow, useAlarmForm, useReminderForm, useNotificationRouting), header consistency, toggleAlarm past-date fix, audit cleanup. |
| Mar 27, 2026 | v1.6.0 production build. Merged dev → main. Full P2 shipped: image attachments, drawing/Skia, photo backgrounds, per-alarm photos, file splits, header consistency, dismiss fix. |
| Mar 28, 2026 | v1.6.0 shipped to Play Store. Full P2: image attachments, drawing/Skia, photo backgrounds, per-alarm photos, file splits, header consistency, dismiss fix. Audit 38 fixes: deferred drawing/photo saves, rollback on failure. Store listing updated with 8 new screenshots and full description rewrite. |
| Mar 28, 2026 | v1.6.1 shipped. Draw on photos (annotate photo attachments with drawing tools), calendar tap-to-navigate, week view next 7 days. Audit 39 fixes: durable source photo, eraser disabled on photos, canvas readiness gate, loadDrawingData path fix. |
| Mar 28, 2026 | P3 voice roasts pre-work complete. Custom ElevenLabs v3 voice designed. 62 voice clips generated across all categories: fire, snooze (4 tiers), guess why (before/correct/wrong), dismiss, intro. |
