# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: March 25, 2026

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.5.0 (versionCode 18) on dev branch, v1.4.0 (versionCode 17) live on Play Store |
| **Branch** | `dev` (v1.5.0 not yet merged to main or built) |
| **Production Status** | ✅ Live on Google Play |
| **Current Focus** | Finishing P2 free features before starting P2 paid features |
| **Blocked By** | Nothing |
| **Next Action** | Calendar widget + drawing (Skia) dev build (batch native deps) |
| **EAS Credits** | ~33 remaining (reset April 12) |
| **Firebase Credits** | $300 available — NOT activated yet (90-day clock starts on activation) |
| **ElevenLabs** | Subscription active — voice asset generation ready |

---

## PHASE STATUS

| Phase | Name | Status | Branch | Build Type |
|-------|------|--------|--------|------------|
| 1 | Housekeeping | ✅ Done | main | — |
| 2 | Photos + Drawing + Backgrounds | 🔧 In Progress (free features) | dev | Dev + Prod |
| 3 | Voice Roasts | ⬜ Waiting | dev | Dev + Prod |
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

## PHASE 2 — PHOTOS + DRAWING + BACKGROUNDS

**Status:** 🔧 In Progress (free features)
**Branch:** `dev`
**New deps:** `expo-image-picker`, `@shopify/react-native-skia`
**Existing dep:** `reanimated-color-picker` (already installed)
**Build cost:** 1 dev build + 1 production build minimum
**Note:** Consider bundling Phase 3 native deps (`expo-av`) into the same dev build to save a credit

### Free Features (Current Sprint)

- [x] **2.0 In-app Calendar** (CalendarScreen.tsx — DONE in v1.5.0)
  - Full month/week/day views with react-native-calendars (JS-only, no native dep)
  - Colored dot indicators: red=alarms, blue=reminders, green=notes
  - Filter capsules, create buttons with initialDate prefill
  - Accessible via nav card on AlarmListScreen
- [x] **2.0a AlarmListScreen refactor** — extracted AlarmsTab.tsx (DONE)
- [x] **2.0b NotepadScreen refactor** — extracted NoteEditorModal.tsx (DONE)
- [x] **2.0c UI polish** — dark capsule BackButton, floating headers on Settings/DailyRiddle/NoteEditorModal (DONE)
- [x] **2.0d Audit 33** — all findings resolved (DONE)
- [ ] **2.6 Calendar widget** — native dep, batch with Skia dev build
- [ ] **2.7 Tablet responsive pass** — Onboarding, Sudoku, Trivia screens

### Pro Features

- [ ] **2.1 Note image attachments**
  - Photos attached to notes (license plates, parking spots, receipts)
  - Text above or below image
  - `expo-image-picker`

- [ ] **2.2 Notepad drawing/sketch mode**
  - `@shopify/react-native-skia`
  - S Pen pressure sensitivity + finger drawing
  - Canvas overlay on note editor

- [ ] **2.3 Custom photo background underlay on main screens**
  - Alarms, Timers, Reminders screens
  - `expo-image-picker` (shared with 2.1 — no additional dep cost)

- [ ] **2.4 Full-bleed per-alarm photo on Alarm Fire screen**
  - Per-alarm photo selection in alarm creation
  - Photo-aware sarcastic snooze lines (content adjusts to acknowledge the photo)

### Removed from Phase 2

- ~~2.5 App text color picker~~ — REMOVED. The dark capsule pattern (semi-transparent dark backgrounds with white text/borders) solves readability on all backgrounds without user configuration. For photo backgrounds (2.3, 2.4), use dark overlays or frosted-glass strips behind text regions with automatic black/white text selection based on background luminance. This is more reliable, zero-config, and preserves visual consistency across themes.

### Blockers
- None anticipated — all deps are well-documented Expo packages

### Notes
- `useCalendar` hook accepts `initialDate` and `onSelectDate` callback (handoff doc Section G needs update)
- 2.3 and 2.4 share `expo-image-picker` — install once, use in both
- Readability strategy: dark capsules + auto-contrast overlays. No user-facing text color picker.
- `reanimated-color-picker` remains installed for custom theme builder but is NOT used for a global text color setting.

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment `expo.version` and `expo.android.versionCode` in `app.json`

---

## PHASE 3 — VOICE ROASTS

**Status:** ⬜ Not started
**Branch:** `dev`
**New deps:** `expo-av`
**External tool:** ElevenLabs (subscription active)
**Build cost:** 1 dev build + 1 production build (or share dev build with Phase 2)

### Pre-Work (No Code — Asset Generation)
- [ ] Generate alarm fire voice clips in ElevenLabs
- [ ] Generate snooze shame voice clips (4 tiers matching existing text tiers)
- [ ] Generate wake-up greeting clips ("Hey you" variants)
- [ ] Export and organize clips as bundled assets

### Tasks

- [ ] **3.1 Alarm fire voice lines**
  - Pre-recorded clips bundled in app assets
  - Played via `expo-av` when alarm fires

- [ ] **3.2 Snooze shame voice escalation**
  - Tier-matched to existing `snoozeTiers` in `snoozeMessages.ts`
  - Escalating sass per snooze count (4 tiers)

- [ ] **3.3 Wake-up greeting ("Hey you")**
  - Plays on alarm fire before/alongside main content

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

- Past-time alarm toggle: should warn user or auto-advance date when toggling on an alarm whose time has passed
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
