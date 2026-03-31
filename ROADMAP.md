# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: March 30, 2026

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.8.0 (versionCode 22) — production build in progress |
| **Branch** | `dev` (synced with main) |
| **Production Status** | ✅ Live on Google Play |
| **Current Focus** | Voice memos — COMPLETE |
| **Blocked By** | Nothing |
| **Next Action** | Play Store publish → Store screenshots update → Home screen / theme refactor planning |
| **EAS Credits** | ~13 remaining (reset April 12) |
| **Firebase Credits** | $300 available — NOT activated yet (90-day clock starts on activation) |
| **ElevenLabs** | Subscription active — voice asset generation ready |

---

## PHASE STATUS

| Phase | Name | Status | Branch | Build Type |
|-------|------|--------|--------|------------|
| 1 | Housekeeping | ✅ Done | main | — |
| 2 | Photos + Drawing + Backgrounds | ✅ Done | dev | Dev + Prod |
| 3 | Voice Roasts | ✅ Done | dev | Dev + Prod |
| 3.5 | Voice Memos | ✅ Done | dev | Dev + Prod |
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

## PHASE 3 — VOICE ROASTS ✅ COMPLETE

**Status:** ✅ Complete
**Branch:** `dev`
**New deps:** `expo-audio` (replaced `expo-av`)
**External tool:** ElevenLabs (subscription active)
**Build cost:** 1 dev build + 1 production build (or share dev build with Phase 2)

### Pre-Work (No Code — Asset Generation)
- [x] Generate alarm fire voice clips in ElevenLabs
- [x] Generate snooze shame voice clips (4 tiers matching existing text tiers)
- [x] Generate wake-up greeting clips ("Hey you" variants)
- [x] Export and organize clips as bundled assets

### Tasks

- [x] **3.1 Alarm fire voice lines**
  - Pre-recorded clips bundled in app assets
  - Played via native AlarmChannelModule when alarm fires

- [x] **3.2 Snooze shame voice escalation**
  - Tier-matched to existing `snoozeTiers` in `snoozeMessages.ts`
  - Escalating sass per snooze count (4 tiers)

- [x] **3.3 Timer voice lines**
  - Voice clips play when timer fires

- [x] **3.4 Guess Why voice lines (before/correct/wrong)**
  - Voice clips for guess why flow stages

- [x] **3.5 Intro line (first alarm only, one-time)**
  - One-time intro clip on first alarm fire, tracked via AsyncStorage

- [x] **3.6 Settings toggle (voice on/off + dismiss voice on/off)**
  - Main voice roasts toggle in Settings
  - Dismiss voice sub-toggle (conditional on main toggle)
  - Dismiss voice off = instant exit, no clip

- [x] **3.7 Native ALARM stream playback (AlarmChannelModule)**
  - Voice clips play on ALARM audio stream via native MediaPlayer
  - Audible regardless of media volume / ringer mode
  - URI scheme handling: HTTP (dev), file:///android_asset/, file://, content://, bare path fallback

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
- Snooze tier 3: 4
- Snooze tier 4: 6
- Guess Why before: 5
- Guess Why correct: 4
- Guess Why wrong: 4
- Dismiss: 10
- Timer: 11
- Total: 68 clips (was 62 — removed 1 snooze3 clip too long, added 5 timer clips, timer category added)

### Blockers
- None anticipated

### Notes
- All clips are pre-recorded and bundled — NO runtime API calls to ElevenLabs
- Voice features are Pro-tier only (Phase 8 gates this)
- Build with `--clear` flag when new audio assets are added
- `expo-av` removed, replaced with `expo-audio` for UI chirp (soundFeedback.ts)
- Voice clips play via native AlarmChannelModule, NOT expo-audio (ALARM stream requirement)
- Silent alarm guard: voice clips still play for silent alarms, but alarm tone doesn't resume after

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 3.5 — VOICE MEMOS ✅ COMPLETE

**Status:** ✅ Complete
**Shipped in:** v1.8.0 (versionCode 22)
**Branch:** `dev`
**New deps:** None (expo-audio already installed from P3)
**Native changes:** RECORD_AUDIO permission, MicWidget registration in app.json

### Features

- [x] **VoiceRecordScreen** — dedicated recording screen, tap-to-record/tap-to-stop, pause/resume, unlimited duration, random personality idle hints, recording indicator text
- [x] **VoiceMemoDetailScreen** — dual mode (new recording via tempUri OR existing memo via memoId), title + note editing, seekable playback with back/forward 5s, explicit Save button with unsaved changes warning, transactional save (temp file preserved until metadata succeeds), soft delete with confirmation
- [x] **VoiceMemoCard** — reusable card component, View-based play/pause icons, inline playback with progress bar, theme-aware colors, capsule pin/delete buttons matching alarm/reminder pattern
- [x] **NotepadScreen integration** — content filter tabs (Voice / All / Notes), combined FlatList with union type ListItem, inline playback via single audio player ref, focus cleanup, pinned items float to top in All view, stale progress reset on memo switch
- [x] **Voice memo pinning** — widgetPins.ts functions (get/toggle/unpin/prune/isPinned), max 4 pins, pin state preserved on undo delete (useRef pattern for stale closure fix), pinned sort in both list and widget
- [x] **MicWidget** — standalone home screen widget, mic icon + "Record" text, tap opens VoiceRecordScreen, registered in app.json (110dp min)
- [x] **NotepadWidget updated** — shows voice memos mixed with notes, pinned-first sort before slice to 4, mic button (left) + notepad button (right) in header, VoiceMemoCell with theme colors
- [x] **CalendarScreen** — voice memos show as purple dots + tappable list items, DOT_VOICE #A29BFE, filter support
- [x] **Card unification** — notes and voice memos use same dark bar style, green left border accent for notes, purple for voice memos, note icon circle uses note's own color
- [x] **Navigation guards** — beforeRemove listeners on VoiceRecordScreen and VoiceMemoDetailScreen, hardware back/gesture back intercepted, save blocking during save operations
- [x] **Storage** — voiceMemoStorage.ts (AsyncStorage CRUD, re-throws on error), voiceMemoFileStorage.ts (.m4a files at ${Paths.document}voice-memos/)
- [x] **Personality** — random idle hints on record screen, random save toasts, random empty state messages, sarcastic delete confirmation

### Audits
- [x] Audit 44: 8 findings fixed (race conditions, stale closures, seek validation, widget sort, error swallowing)
- [x] Audit 45: 10 findings fixed (nav guards, transactional save, pin ordering, pause race, undo pin restore, theme colors, stale progress)

### Audit Gate
- [x] `npx tsc --noEmit` — 0 errors
- [x] Increment version + versionCode

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

### Architecture / Infrastructure
- Home screen (main menu) — changes navigation for entire app, compartmentalizes features
- Expo SDK 55 upgrade — the longer it waits the harder it gets
- Light / Dark / High Contrast themes (replacing 6 color themes) — simplifies all styling decisions
- AsyncStorage → SQLite migration (when scale demands it)
- Cloud backup / export (.dfw backup file — no accounts, zip AsyncStorage + voice-memos/ + note-images/)
- Jest suite resurrection — 222 tests on testing-setup branch, massively outdated
- NotepadScreen further decomposition (~1240 lines — getting unwieldy)

### Visual Unification
- All bars/cards across app match new dark bar style with accent borders
- All buttons match capsule pattern (pin, delete, actions) — already done for notes/voice memos/alarms/reminders
- All icons checked for consistency across screens
- Pin toggle inside edit/detail screens (alarms, reminders, notes, voice memos)

### Voice Expansion
- Voice memos attachable to alarms (hear your own voice when alarm fires — "viral-worthy UX")
- Voice memos attachable to reminders and timers
- More voice roast clips throughout app (navigation, actions, idle moments)
- Female voice character (alarm guy's girlfriend) — future user-selectable option

### Store / Marketing
- Play Store listing update for v1.8.0 (voice memos, mic widget, calendar improvements)
- Play Store screenshots refresh (add voice memo screenshot with waveform background)
- Onboarding screen update (voice memos not mentioned)
- Widget preview screenshots for store listing
- App size audit (63 voice clips + Skia + voice memo recordings)

### Recurring / Existing
- Recurring reminder UX: annual set for today when time passed should auto-schedule next year
- Daily Riddle scoring design review
- AlarmListScreen further decomposition (~600 lines)
- Accessibility pass (screen reader labels on View-based icons)
- OOM prevention: FlatList windowSize/removeClippedSubviews for image-heavy note lists

---

## PRO vs FREE BREAKDOWN

### Free Tier — Keeps Everything Current, Forever
- All alarms, reminders, timers, notepad
- In-app calendar (day/week/month views)
- Calendar voice memo dots and list items
- Voice/All/Notes filter tabs in notepad
- All current themes + custom theme builder
- Guess Why, Memory Match, Trivia (offline), Sudoku, Daily Riddle
- Memory Score tracking
- Home screen widgets (both widget types)
- All personality content (sarcastic text — quotes, roasts, snooze messages, placeholders)
- Sound picker + custom alarm sounds
- Privacy mode, Silence All mode

### Pro Tier — ~$1 One-Time Unlock
- Voice memos (recording, playback, detail editing, pinning)
- Mic home screen widget
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
| 3.5 | 2 | 1 | ~3 |
| 4 | 0 | 1 | ~1 |
| 5 | 1 | 1 | ~2 |
| 6 | 0 | 1 | ~1 |
| 7 | 0 | 1+ | ~1+ |
| 8 | 1+ | 2+ | ~3+ |
| **Total** | **5–6** | **9+** | **~14–17** |

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
| Mar 29, 2026 | P3 Voice Roasts complete. 63 voice clips across 10 categories (fire, snooze 1-4, timer, guess before/correct/wrong, dismiss, intro). Native ALARM stream playback via AlarmChannelModule. expo-av removed, replaced with expo-audio for UI chirp. Dismiss voice toggle for faster exits. Double-tap dismiss/snooze to skip voice clips. Silent alarm guard. Production URI handling via expo-asset. |
| Mar 30, 2026 | Calendar fixes: annual recurring reminders showing daily (month/day match), calendar event cards now tappable (navigate to edit screens). AlarmFireScreen merge conflict markers resolved. |
| Mar 30, 2026 | Voice memos complete (Phase 3.5). VoiceRecordScreen, VoiceMemoDetailScreen, VoiceMemoCard, NotepadScreen integration (filter tabs, inline playback, pinning), MicWidget, NotepadWidget voice memo support, CalendarScreen voice memo dots. Card unification: dark bar style with accent borders. Capsule pin/delete buttons. View-based play/pause icons. Navigation guards (beforeRemove). Transactional save. Audits 44-45 complete, all findings resolved. |
| Mar 30, 2026 | v1.8.0 production build. Voice memos, mic widget, card unification, calendar fixes, 2 full audits. |
