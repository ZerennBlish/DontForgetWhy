# DFW Project Setup & Version History
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 14 (April 4, 2026)

---

## 1. Project Overview

**App:** Don't Forget Why (DFW)
**Publisher:** Bald Guy & Company Games — "Apps that talk back"
**Developer:** Zerenn (solo developer, age 40, Colorado)
**Package:** com.zerennblish.DontForgetWhy
**Stack:** React Native 0.83.4 + Expo SDK 55 + TypeScript (strict mode)
**Platform:** Android (primary), iOS (secondary/future)
**Monetization:** Free, no ads, no tracking. Potential future Pro features ($1.99 one-time) for online content.
**GitHub:** https://github.com/ZerennBlish/DontForgetWhy
**Contact:** baldguyandcompanygames@gmail.com

**What it is:** An alarm, reminder, timer, and notepad app with built-in mini-games and a personality-driven identity. The hook: every alarm requires a mandatory note explaining WHY it was set. When the alarm fires, the note displays prominently. "Remember why you woke up."

**Store tagline:** "Set alarms. Forget why. Get roasted."
**Brand closer:** "No accounts. No tracking. No ads. Just you and your questionable memory."

**Built from scratch starting February 8, 2026.** First working prototype ran on Zerenn's phone within hours of the first session. The app went from zero to closed testing on Google Play in 10 days.

---

## 2. Hardware & Setup

### Desktop (Primary)
- Windows, AMD Ryzen 5 5600X, RTX 4070, 32GB RAM
- Windows user: `baldy`, WSL user: `zerenn`
- Project: `C:\DontForgetWhy` (WSL: `/mnt/c/DontForgetWhy`)
- Context files: `C:\DFW-Context\`
- Claude Code runs through WSL/Ubuntu
- ADB: `C:\platform-tools\platform-tools\adb.exe`

### Laptop (Backup — Fully Operational)
- Windows, 8GB RAM. Same path structure.
- All three branches available. Claude Code operational.

### Phone
- Samsung Galaxy S23 Ultra, production Play Store build only
- Dev builds cannot install over production (signature mismatch) — test on emulators
- Phone gets updates through Play Store

### Accounts
- **GitHub:** ZerennBlish
- **Expo:** zerennblish (Starter plan — $19/mo, ~$1/build, credits reset 12th)
- **Google Play Console:** Bald Guy & Company Games
- **PrimeTestLab:** Enterprise plan (93 tester emails)

### Terminal Rules
- **PowerShell:** dev server, npm install, EAS builds, ADB, git (daily workflow)
- **WSL:** Claude Code only
- Do NOT run git in PowerShell while Claude Code works in WSL on same repo
- Do NOT run dev server from WSL (gives internal IP phone can't reach)

### Emulator Testing Matrix
- 6 AVDs configured on both desktop and laptop machines
- Devices: Pixel 7 (baseline), Galaxy S25 FE (custom profile, 1080x2340 19.5:9), Pixel 5 (smaller 6.0"), Moto G Power (custom profile, 720x1600 budget), Galaxy S23 Ultra (custom profile, 1440x3088 QHD+), Pixel Tablet (2560x1600)
- All running API 35 (Android 15 VanillaIceCream) x86_64 system images
- EAS build profile "development-emulator" added to eas.json with env `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64`
- Emulator dev build APK stored at `C:\DontForgetWhy\DFW-emulator.apk`
- ARM dev build for physical devices, x86_64 build for emulators — separate APKs
- All emulators connect to same dev server simultaneously for side-by-side testing
- Android Studio Panda 2 (2025.3.2) on both machines
- Windows Hypervisor Platform enabled on both machines for hardware acceleration
- adb path: `$env:LOCALAPPDATA\Android\Sdk\platform-tools` (may need full path in PowerShell: `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"`)

---

## 3. Project Structure

Codebase reorganized during Phase 1 housekeeping. All source files live under `src/` in categorized subfolders. Home is the `initialRouteName` (changed from AlarmList in v1.9.0).

```
DontForgetWhy/
├── App.tsx
├── index.ts
├── app.json
├── package.json
├── ROADMAP.md
├── DFW-Architecture.md
├── DFW-Data-Models.md
├── DFW-Features.md
├── DFW-Bug-History.md
├── DFW-Decisions.md
├── DFW-Project-Setup.md
├── assets/
│   └── voice/                     # 63 bundled MP3 voice clips
└── src/
    ├── components/
    │   ├── AlarmCard.tsx
    │   ├── BackButton.tsx
    │   ├── DayPickerRow.tsx
    │   ├── DrawingCanvas.tsx
    │   ├── DrawingPickerModal.tsx       # Extracted drawing tool modals (Session 10)
    │   ├── EmojiPickerModal.tsx         # Bottom sheet emoji picker (~128 curated emoji, Session 10)
    │   ├── ErrorBoundary.tsx
    │   ├── HomeButton.tsx              # Home navigation button for all screens
    │   ├── Icons.tsx                  # 29+ View-based icons (Session 9)
    │   ├── ImageLightbox.tsx
    │   ├── NoteEditorModal.tsx
    │   ├── ShareNoteModal.tsx
    │   ├── SoundPickerModal.tsx
    │   ├── SwipeableRow.tsx             # Swipe-to-delete (both directions, Session 10)
    │   ├── TimePicker.tsx
    │   ├── UndoToast.tsx
    │   └── VoiceMemoCard.tsx         # Reusable voice memo list card with inline play/pause
    ├── data/
    │   ├── alarmSounds.ts
    │   ├── appOpenQuotes.ts
    │   ├── emojiData.ts              # Curated emoji dataset for picker modal (Session 10)
    │   ├── voiceClips.ts          # voice clip registry (10 categories, 63 clips)
    │   ├── guessWhyIcons.ts
    │   ├── guessWhyMessages.ts
    │   ├── homeBannerQuotes.ts       # 63 color-coded personality quotes across 7 sections
    │   ├── memoryRanks.ts
    │   ├── placeholders.ts
    │   ├── reminderQuotes.ts
    │   ├── riddles.ts
    │   ├── snoozeMessages.ts
    │   ├── timerPresets.ts
    │   └── triviaQuestions.ts
    ├── hooks/
    │   ├── useAlarmForm.ts         # alarm create/edit form state + deferred photo save
    │   ├── useCalendar.ts          # accepts initialDate + onSelectDate callback
    │   ├── useDaySelection.ts
    │   ├── useNotificationRouting.ts # notification event handlers extracted from App.tsx
    │   └── useReminderForm.ts      # reminder create/edit form state
    ├── navigation/
    │   └── types.ts                # navigation param types
    ├── screens/
    │   ├── AboutScreen.tsx
    │   ├── AlarmFireScreen.tsx
    │   ├── AlarmListScreen.tsx
    │   ├── AlarmsTab.tsx              # DELETED Session 9 — absorbed into AlarmListScreen
    │   ├── CalendarScreen.tsx
    │   ├── CreateAlarmScreen.tsx
    │   ├── CreateReminderScreen.tsx
    │   ├── DailyRiddleScreen.tsx
    │   ├── ForgetLogScreen.tsx        # DELETED Session 12 — ForgetLog feature removed
    │   ├── GamesScreen.tsx
    │   ├── GuessWhyScreen.tsx
    │   ├── HomeScreen.tsx              # Home screen — icon grid, Quick Capture, personality banner
    │   ├── MemoryMatchScreen.tsx
    │   ├── MemoryScoreScreen.tsx
    │   ├── NotepadScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── ReminderScreen.tsx
    │   ├── SettingsScreen.tsx
    │   ├── SudokuScreen.tsx
    │   ├── TimerScreen.tsx
    │   ├── TriviaScreen.tsx
    │   ├── VoiceMemoDetailScreen.tsx # Voice memo detail/edit/playback screen
    │   ├── VoiceMemoListScreen.tsx   # Standalone voice memo list screen
    │   └── VoiceRecordScreen.tsx     # Dedicated voice recording screen
    ├── services/
    │   ├── alarmPhotoStorage.ts    # per-alarm photo save/delete/exists
    │   ├── alarmSound.ts
    │   ├── backgroundStorage.ts    # shared screen background photo
    │   ├── forgetLog.ts                # DELETED Session 12 — ForgetLog feature removed
    │   ├── guessWhyStats.ts
    │   ├── memoryScore.ts
    │   ├── noteImageStorage.ts      # note image save/delete/drawing data
    │   ├── noteStorage.ts
    │   ├── notifications.ts
    │   ├── pendingAlarm.ts
    │   ├── quotes.ts
    │   ├── reminderStorage.ts
    │   ├── riddleOnline.ts
    │   ├── settings.ts
    │   ├── voicePlayback.ts        # voice playback service (native module bridge)
    │   ├── voiceMemoFileStorage.ts   # Voice memo .m4a file management (expo-file-system)
    │   ├── database.ts              # SQLite singleton, schema, KV helpers, AsyncStorage migration
    │   ├── voiceMemoStorage.ts       # Voice memo SQLite CRUD with soft-delete
    │   ├── storage.ts
    │   ├── timerStorage.ts
    │   ├── triviaAI.ts
    │   ├── triviaStorage.ts
    │   └── widgetPins.ts
    ├── theme/
    │   ├── buttonStyles.ts            # Shared button hierarchy: 4 types × 2 sizes (Session 10)
    │   ├── colors.ts               # 4 theme definitions + section colors (custom generator removed)
    │   └── ThemeContext.tsx         # theme provider + useTheme hook
    ├── types/
    │   ├── alarm.ts
    │   ├── note.ts
    │   ├── reminder.ts
    │   ├── timer.ts
    │   ├── trivia.ts
    │   └── voiceMemo.ts              # VoiceMemo interface
    ├── utils/
    │   ├── connectivity.ts
    │   ├── fullScreenPermission.ts
    │   ├── haptics.ts
    │   ├── noteColors.ts           # getTextColor() — contrast-based text color
    │   ├── soundFeedback.ts
    │   ├── soundModeUtils.ts
    │   ├── sudoku.ts
    │   └── time.ts                 # utils are pure/side-effect free
    └── widget/
        ├── CalendarWidget.tsx
        ├── DetailedWidget.tsx
        ├── MicWidget.tsx
        ├── NotepadWidget.tsx
        ├── updateWidget.ts
        └── widgetTaskHandler.ts
```

---

## 4. Complete Version History

| Date | Version | vCode | Summary | Status |
|------|---------|-------|---------|--------|
| Feb 8 | — | — | App created from scratch. 3 screens, services, dark theme | Running in Expo Go |
| Feb 9–10 | — | — | 13 features: Guess Why, timers, privacy, Memory Score, quotes, ForgetLog | Expo Go |
| Feb 11 | — | — | EAS dev build, theme system, safe area, Audits 1-2 | Dev build on S23 Ultra |
| Feb 12 | — | — | Notifee migration, timer bg notifications, 12/24h format, widgets, Audit 3 | Dev build |
| Feb 13 | — | — | Day/date scheduling, DetailedWidget, alarm pinning | Dev build |
| Feb 14 | — | — | Games hub, Memory Match, Sudoku, Daily Riddle, Audit 5 | Dev/preview build |
| Feb 14–15 | — | — | Trivia, sorting/filtering, swipe/undo, haptics, Audits 7-8, Play Store prep | Production AAB built |
| Feb 16–17 | — | — | Audit 14-15 fixes, SwipeableRow deleted, expo-av removed, personality expansion (80+ lines), Audit 16 | Preview build to testers |
| Feb 18 | 1.0.0 | — | First closed testing. Snooze fixes, lightbulb bg, Audit 16 fixes | Closed testing live |
| Feb 19 | 1.0.0 | 1 | Audit 18 fixes, feedback email, alarm ghost fix, Sudoku stats | Wasted — vCode conflict |
| Feb 20 | 1.0.0 | 2 | Same code, vCode bump only | Submitted to closed testing |
| Feb 22 | 1.3.2 | 9 | Audit 19 fixes (pre-session). Jest 222 tests. Store screenshots. | Production AAB on testing |
| Feb 26 | — | — | Native MediaPlayer alarm sound system, Audit 20, project docs | Code on main, no build |
| Mar 6 | — | — | **Production application REJECTED** — insufficient tester engagement (5/12+) | — |
| Mar 6 | — | — | Notepad feature complete, widget system, color system, auditor docs compiled | On GitHub main |
| Mar 6 | 1.1.0 | 4 | Notepad, UI overhaul, all audit fixes | Uploaded to closed testing |
| Mar 10 | 1.2.0 | 5 | Update 1: share/print, sound modes, TimePicker | Closed testing |
| Mar 10–11 | 1.3.0 | 6 | Update 2: themes, widgets, custom timers, emoji, sound mode | Upload interrupted — vCode consumed |
| Mar 11 | 1.3.0 | 7 | Same as vCode 6, vCode bump | Closed testing |
| Mar 11–12 | 1.3.1 | 8 | TimePicker infinite re-render crash fix | Approved, live |
| Mar 12 | 1.3.2 | 9 | Update 3: per-alarm Guess Why, widget redesign, games/settings polish | Pending review |
| Mar 19 | 1.3.3 | 10 | Recurring alarm fix + chirp fix | Published |
| Mar 19 | 1.3.4 | 11 | Phase 1 housekeeping complete | Published |
| Mar 19 | 1.3.5 | 12 | Alarm filter fix, fire screen re-trigger fix, day chip fix, dedupe fix | Shipping |
| Mar 21 | 1.3.6 | 13 | TimePicker responsive rewrite. Day chip clears calendar date (useDaySelection fix). | Pulled from review — superseded by 1.3.7 |
| Mar 21 | 1.3.7 | 14 | TimePicker responsive rewrite. Day chip clears date. Reminder one-time day chip scheduling (three-tier logic). | Submitted to production review |
| Mar 22 | 1.3.8 | 15 | Emoji crash fix, trivia centering, timer layout, note card colors, capsule buttons, reminder UX, dead sound picker removed. Emulator testing matrix. | Built and ready to upload |
| Mar 24 | 1.3.9 | 16 | Notification action buttons (Dismiss/Snooze on alarm, Dismiss on timer), dismiss flash fix, note card borders, reminder two-line layout, safety net fix. Store screenshots updated (8 professional graphics). App live in production on Google Play. | Production |
| Mar 25 | 1.4.0 | 17 | Timer dismiss race condition hotfix: foreground DELIVERED now sound-only (no auto-navigation), timer cleanup in handleDismiss. | Production (live) |
| Mar 25 | 1.5.0 | 18 | Calendar feature (CalendarScreen), CalendarWidget (home screen mini calendar with dot indicators), AlarmListScreen refactor (AlarmsTab extraction), NotepadScreen refactor (NoteEditorModal extraction), dark capsule button uniformity, floating headers (editor/settings/riddle/calendar/memoryscore), BackButton visibility fix, 999 char note limit, initialDate prefill for create screens, daily recurring calendar mapping, timezone bucketing fix, widget alarm normalization, note sort UTC fix, week view locked to current week, tablet responsive (Onboarding/Sudoku/MemoryMatch/MemoryScore). Audits 33-35 complete. | Dev branch — ready to ship |
| Mar 28 | 1.6.0 | 19 | Full Phase 2 production ship. Audit 38: 2 critical + 2 high fixed (Codex found, Gemini missed) — DrawingCanvas temp dir for drawings (no premature deletion), NotepadScreen sequential image save with rollback, useAlarmForm deferred photo deletion with rollback on failure. Play Store listing updated: 8 screenshots, full description rewrite. All P2 features shipped free (no Pro gate). | Production (live) |
| Mar 28 | 1.6.1 | 20 | Draw on photos: annotate photo attachments with full drawing tools. DrawingCanvas backgroundImageUri, SkImage, onLayout sizing, durable source copy. NoteEditorModal "Draw On" option for photos. noteImageStorage URI-based JSON lookup, source photo persistence. Calendar tap-to-navigate on event cards, week view = next 7 days. Audit 39: 1 critical + 1 high + 2 medium fixed — durable source photo storage, eraser disabled on photos, canvas readiness gate. | Production (live) |
| Mar 29 | 1.7.0 | 21 | P3 Voice Roasts: 63 voice clips across 10 categories, native ALARM stream playback via AlarmChannelModule, expo-av removed, expo-audio chirp, expo-asset for URI resolution, dismiss voice toggle, double-tap dismiss/snooze to skip clips, true_silent guard, production URI handling (HTTP/asset/file/content) | Production (live) |
| Mar 30 | 1.8.0 | 22 | Voice memos (recording, pause/resume, dual-mode detail screen, inline playback, pinning), MicWidget, card unification (dark bars with accent borders), View-based play icons, capsule buttons, calendar voice memo dots, navigation guards (beforeRemove), transactional save, personality text. Audits 44-45 complete. | Production (pending review) |
| Mar 31 | 1.8.1 | 23 | SDK 55 upgrade: Expo 54→55, RN 0.81→0.83, React 19.1→19.2. `react-native-notification-sounds` removed (jcenter/Gradle 9.0 incompatible), replaced with native `getSystemAlarmSounds` in AlarmChannelModule. `newArchEnabled`/`edgeToEdgeEnabled` removed from app.json (always-on in SDK 55). worklets 0.5.1→0.7.2, Skia→2.4.18, screens→4.23, pager-view→8.0. Android 15 foreground service warning resolved. | Build in progress |
| Apr 1 | 1.9.0 | 24 | Home screen (icon grid, Quick Capture, personality banner, Today section), TimerScreen standalone, VoiceMemoListScreen standalone, AlarmListScreen 2-tab, HomeButton on all screens, widget rebranding (Memory's Timeline, Forget Me Notes, Misplaced Thoughts, Memory's Voice), Forget Log moved to Settings. Audit 47 complete. | Dev branch — build pending |

---

## 5. Store Listing

| Field | Value |
|-------|-------|
| App name | Don't Forget Why |
| Category | Productivity |
| Short description | "Set alarms. Forget why. Get roasted. A memory app with attitude." |
| Full description | Updated for all P2 features including calendar, notepad photos/drawing, photo backgrounds. "Built by Bald Guy & Company Games" |
| App icon | Clock icon, 512×512 |
| Feature graphic | 1024×500, clock + lightbulb + neon elements, Midnight palette |
| Screenshots | 8 total (5 original personality-driven + calendar + games + photo background). Created Mar 24 via ChatGPT image gen + Canva compositing. Updated for all P2 features including calendar, notepad photos/drawing, photo backgrounds. |
| Privacy policy | https://zerennblish.github.io/DontForgetWhy/privacy-policy.html |
| Countries | All |
| Content rating | 13+ |
| Monetization | Free, no ads |

### Testing Links
- Group: https://groups.google.com/g/dontforgetwhy-testing
- Play testing: https://play.google.com/apps/testing/com.zerennblish.DontForgetWhy
- Store page: https://play.google.com/store/apps/details?id=com.zerennblish.DontForgetWhy

---

## 6. Image Assets

| File | Screen | Source |
|------|--------|--------|
| `lightbulb.png` | AlarmFireScreen | AI-generated |
| `oakbackground.png` | MemoryMatchScreen | Gemini AI |
| `questionmark.png` | TriviaScreen | Gemini AI |
| `newspaper.png` | SudokuScreen | Gemini AI |
| `door.png` | DailyRiddleScreen | ChatGPT DALL-E |
| `gameclock.png` | GuessWhyScreen | ChatGPT DALL-E |
| `brain.png` | GamesScreen | ChatGPT DALL-E |
| `gear.png` | SettingsScreen | AI-generated |
| `fullscreenicon.png` | AlarmListScreen watermark | Custom |
| `chirp.mp3` | Sound feedback (3KB, 150ms) | Python numpy |

---

## 7. Testing Status

| Item | Value |
|------|-------|
| Current version | v1.10.0 (versionCode 26) — SQLite migration + visual polish |
| Production status | v1.10.0 build pending |
| Install count | 48+ |
| Phase 1 housekeeping | COMPLETE |
| Phase 2 | COMPLETE |
| Phase 3 (Voice Roasts) | COMPLETE |
| Phase 3.5 (Voice Memos) | COMPLETE |
| Audit status | Audits 44-45 complete, all findings resolved |
| Jest tests | 35 passing (3 suites: time, noteColors, soundModeUtils) — ts-jest, node env |
| EAS build credits | ~13 remaining (reset April 12) |

### Packages Added (Session 12)
- `expo-sqlite` — synchronous SQLite database (replaced AsyncStorage for all persistent storage)
- Note: `@react-native-async-storage/async-storage` kept temporarily — only used in `database.ts` for one-time migration runner

### Packages Added (Session 14)
- `react-native-zip-archive` — native ZIP/unzip for backup files. Installed via npm, requires dev build.
- `expo-document-picker` — file picker for .dfw import. Added to app.json plugins.

### Packages Removed (Session 10)
- `react-native-tab-view` — tabs replaced by standalone screens (Session 9 separation)
- `react-native-pager-view` — was only a dependency of tab-view
- `date-fns` — unused after prior refactors

### App.tsx Changes (Session 10)
- `GestureHandlerRootView` wraps the entire app — required for SwipeableRow gesture handling

### App.tsx Changes (Session 12)
- `migrateFromAsyncStorage()` gate: migration runs before any screens render, App returns null until `dbReady` is true

### Jest Setup (Session 11)
- **Preset:** `ts-jest` with `node` test environment
- **Tests:** `__tests__/` at project root — `time.test.ts`, `noteColors.test.ts`, `soundModeUtils.test.ts`
- **Run:** `npm test` or `npx jest`
- **Config:** `package.json` `"jest"` section with `moduleNameMapper` for `src/` paths
- **Scope:** Pure utility functions only — no native modules, no storage mocking
- `jest-expo` in devDependencies for future component testing (not used as preset — crashes on expo-modules-core)

### Git Branches
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production. Synced with dev at v1.8.0. | Active, clean |
| `dev` | v1.10.0 — Visual overhaul, swipe-to-delete, emoji picker, button hierarchy, widget section colors, Jest. | Active — all new work goes here |
| `testing-setup` | Jest work branch. Merge main INTO testing-setup only. | Merged to dev (Session 11) |
