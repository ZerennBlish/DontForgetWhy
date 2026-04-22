# DFW Project Setup & Version History
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 41 (April 22, 2026) — **v2.0.0 (versionCode 44) uploaded to Play Store, awaiting review**. v1.24.0 (versionCode 43) remains the installed baseline until review clears.

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
│   └── voice/                     # 68 original MP3 clips + tutorial/ (15 MP3 tutorial clips, Session 28)
└── src/
    ├── components/
    │   ├── AlarmCard.tsx
    │   ├── BackButton.tsx
    │   ├── DayPickerRow.tsx
    │   ├── DrawingCanvas.tsx
    │   ├── DeletedAlarmCard.tsx        # Extracted from AlarmListScreen (Session 15)
    │   ├── DeletedNoteCard.tsx         # Extracted from NotepadScreen (Session 15)
    │   ├── DrawingPickerModal.tsx       # Extracted drawing tool modals (Session 10)
    │   ├── EmojiPickerModal.tsx         # Bottom sheet emoji picker (~128 curated emoji, Session 10)
    │   ├── ErrorBoundary.tsx
    │   ├── HomeButton.tsx              # Home navigation button for all screens
    │   ├── Icons.tsx                  # 29+ View-based icons, a11y labels optional (Session 9/15)
    │   ├── ImageLightbox.tsx
    │   ├── NoteCard.tsx               # Extracted from NotepadScreen (Session 15)
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
    │   ├── checkersAssets.ts         # Checker piece image map (4 PNGs: r, rk, b, bk)
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
    │   ├── useAlarmList.ts         # AlarmListScreen state + sort/filter + handlers (Session 15)
    │   ├── useCalendar.ts          # accepts initialDate + onSelectDate callback
    │   ├── useCheckers.ts          # Checkers game state + AI + persistence (Session 18)
    │   ├── useChess.ts             # Chess game state + AI + persistence (Session 16)
    │   ├── useDaySelection.ts
    │   ├── useNotepad.ts           # NotepadScreen state + effects + handlers (Session 15)
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
    │   ├── CheckersScreen.tsx        # Checkers vs CPU (Session 18)
    │   ├── ChessScreen.tsx           # Chess vs CPU (Session 16)
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
    │   ├── blunderRoast.ts         # Chess blunder → roast text (Session 16)
    │   ├── checkersAI.ts           # Checkers engine: minimax, TT, killers, IDS (Session 18)
    │   ├── checkersStorage.ts      # Checkers game save/load/clear (Session 18)
    │   ├── chessAI.ts              # Chess engine: minimax, quiescence, TT, killers, null-move (Session 16-17)
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
| Apr 5 | 1.13.0 | 30 | Chess engine hardened (Session 17): opening book, transposition table, killer moves, null-move pruning, tapered eval, min-depth/max-time difficulty model. 2 audit rounds, 6 findings fixed. Benchmark test removed for production. | Production |
| Apr 5 | 1.14.0 | 31 | Checkers (Session 18): pure JS engine, 5 difficulty levels, American rules, Memory Score integration. Scoring overhaul: max 140 (7 games × 20), chess blunder penalty removed, chess+checkers stat sections. UI: emoji removal from headers, GamesScreen reordered. 52 checkers tests. | Production |
| Apr 22 | 2.0.0 | 44 | **v2.0.0 major release.** Pro tier activated (paywall live, founding gate reverted to `onboardingComplete`, ProGate benefits updated — Multiplayer Games + Icon Themes). App Check enforced — `@react-native-firebase/app-check` client with Play Integrity / debug provider + Cloud Function `verifyToken` + Firestore enforcement via Console. Multiplayer chess/checkers/trivia (Session 39). Dual-theme icon system complete (chrome/mixed/anthropomorphic via `iconResolver.ts`, Sessions 32 + 33 + 40). Pre-ship triple audit: P1 backup restore founding bypass fixed (`founding_check_done` written post-restore in `importBackup`); P2 restore race fixed (synchronous purchase processing in `useEntitlement.restore()` via top-level `getAvailablePurchases`). 28 suites / 614 tests passing. | Uploaded — awaiting Play Store review |

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
| `lightbulb.webp` | AlarmFireScreen | AI-generated |
| `oakbackground.webp` | MemoryMatchScreen | Gemini AI |
| `questionmark.webp` | TriviaScreen | Gemini AI |
| `newspaper.webp` | SudokuScreen | Gemini AI |
| `door.webp` | DailyRiddleScreen | ChatGPT DALL-E |
| `gameclock.webp` | GuessWhyScreen | ChatGPT DALL-E |
| `brain.webp` | GamesScreen | ChatGPT DALL-E |
| `gear.webp` | SettingsScreen | AI-generated (floating cogs, Session 15) |
| `library.webp` | MemoryScoreScreen | AI-generated |
| `fullscreenicon.webp` | Watermark (all main screens) | Custom |
| `chirp.mp3` | Sound feedback (3KB, 150ms) | Python numpy |
| `checkers-bg.webp` | CheckersScreen | AI-generated (weathered wood table) |
| `red.png` | Checker piece (red) | AI-generated (400×400 transparent) |
| `red-king.png` | Checker piece (red king) | AI-generated (400×400 transparent) |
| `black.png` | Checker piece (black) | AI-generated (400×400 transparent) |
| `black-king.png` | Checker piece (black king) | AI-generated (400×400 transparent) |

---

## 7. Testing Status

| Item | Value |
|------|-------|
| Current version | **v2.0.0 (versionCode 44)** uploaded to Play Store — awaiting review. v1.24.0 (versionCode 43) is the installed baseline until review clears. |
| Production status | v2.0.0 uploaded; awaiting review. Pro tier paywall live, App Check enforced, multiplayer + dual-theme icons shipped. |
| Install count | 48+ |
| Phase 1 housekeeping | COMPLETE |
| Phase 2 | COMPLETE |
| Phase 3 (Voice Roasts) | COMPLETE |
| Phase 3.5 (Voice Memos) | COMPLETE |
| Phase 4 (The Vault) | COMPLETE |
| Phase 4.5 (Stability Sprint) | COMPLETE |
| Phase 5 (Google Calendar Sync) | COMPLETE (unshipped — Session 30) |
| Phase 5.5 (Premium Foundation) | COMPLETE |
| Phase 6 (Chess + Checkers) | COMPLETE |
| Phase 8 (Firebase Auth + Firestore foundation) | COMPLETE (unshipped — Session 30) |
| Audit status | Session 30 triple audit (Codex + Claude + Gemini) complete — 2 P1 (Firestore test-mode rules, calendar cache leak on sign-out) + 6 P2 (UTC timezone, 401 vs 403 recovery, duplicate fetch regression, auth hydration race, duplicate React keys, dead `calendarColor` field) all fixed. Rules published before ship. |
| Jest tests | **24 suites / 511 tests passing**: time, timeUtils, noteColors, soundModeUtils, safeParse, asyncMutex, backupRestore, widgetPins, settings, voiceClipStorage, proStatus, chessAI (69), checkersAI (52 + Session 32 eval/getTopMoves additions), tutorialTips, firebaseAuth, firestore, googleCalendar, gameTrialStorage (Session 31), foundingStatus (Session 31), calendarSync (Session 31), cloudStockfish (Session 31, 17 tests), cloudCheckers (Session 32, 8 tests), triviaBank (Session 32, 14 tests), **gameSounds (Session 35, 9 tests)** — ts-jest, node env |
| Voice clips | 84 total (68 original fire/snooze/timer/guess/dismiss/intro + 15 tutorial + Opening.mp3). ElevenLabs v3, same voice character throughout. `assets/voice/*.mp3` + `assets/voice/tutorial/*.mp3` |
| EAS build credits | ~19 available |
| ElevenLabs | Subscription active — 84 clips shipped (68 original + 15 tutorial + Opening.mp3) |
| Firebase | Project `dont-forget-why` on Blaze plan. **$300 credit activated April 14, 2026 — expires July 14, 2026.** Firestore rules published (`users/{uid}` self-only). Google Calendar API enabled in Google Cloud Console. `google-services.json` at project root, referenced via `android.googleServicesFile` in `app.json` for EAS prebuild. **App Check enabled (v2.0.0)** — Play Integrity provider on the client, `verifyToken` enforcement on the Cloud Function, Firestore enforcement via Console. **Node 20 runtime deprecation:** `functions/package.json` engines still `"node": "20"`; deprecated April 30, 2026, decommissioned October 30, 2026 — upgrade to Node 22 required before then. |

### Packages Added (Session 12)
- `expo-sqlite` — synchronous SQLite database (replaced AsyncStorage for all persistent storage)
- Note: `@react-native-async-storage/async-storage` kept temporarily — only used in `database.ts` for one-time migration runner

### Packages Added (Session 14)
- `react-native-zip-archive` — native ZIP/unzip for backup files. Installed via npm, requires dev build.
- `expo-document-picker` — file picker for .dfw import. Added to app.json plugins.

### Packages Added (Session 16)
- `chess.js` — JS-only chess library (move generation, FEN, game state). No native modules, no build required.

### Packages Added (Session 29)
- `expo-iap` — Expo-native Google Play Billing 8.x wrapper for the $1.99 `dfw_pro_unlock` IAP (P5.5 Premium Foundation). Native, requires a dev/production build. Registered in `app.json` `expo.plugins`.

### Packages Added (Session 32)
- No new client packages. Cloud Functions sub-project (`functions/`) has its own dependency tree — `firebase-admin ^13.8.0` + `firebase-functions ^7.2.5` + `typescript ^5.4.0` + `eslint ^8.57.0` + `firebase-functions-test ^3.0.0`, Node 20. Client app continues on RN 0.83.4 + Expo SDK 55 + TypeScript strict unchanged.

### Firebase Cloud Functions Setup (Session 32)

**Subproject location:** `functions/` at repo root. Separate Node 20 project with its own `package.json`, `tsconfig.json`, and `src/` directory. Compiled output goes to `functions/lib/` via `tsc`. `firebase.json` points at the `functions` codebase with `predeploy: npm --prefix $RESOURCE_DIR run build` so `firebase deploy --only functions` always runs `tsc` before pushing.

**Files:**
- `functions/src/index.ts` — `onRequest` HTTPS function `checkersAI`. Region `us-central1`, 512MiB, 30s timeout, maxInstances 10, `cors: true`. Validates `{ board, turn }` shape, calls `getTopMoves(board, turn, 20, 6000, 5)`, returns `{ moves: RankedMove[] }`.
- `functions/src/checkersEngine.ts` — copy of `src/services/checkersAI.ts` minus client-specific exports (`getAIMove`, `DIFFICULTY_LEVELS`, `findBestMove`). Same types, same move generation, same evaluation heuristics, same minimax + TT + killers.
- `functions/package.json` — Node 20 engines, `firebase-admin` + `firebase-functions` deps, `build` / `serve` / `deploy` / `logs` scripts.
- `firebase.json` — single codebase `functions` config with `disallowLegacyRuntimeConfig: true`, `predeploy: npm --prefix $RESOURCE_DIR run build`, ignore list for build artifacts. Lint predeploy intentionally omitted — `tsc` build catches the errors that matter.

**Deployed endpoint:** `https://checkersai-kte3lby5vq-uc.a.run.app`. Public unauth for now — App Check deferred to pre-Pro launch.

**Deploy command:** `firebase deploy --only functions` from the repo root. Takes ~60-90s for a cold deploy. `firebase functions:log` tails the live logs for debugging.

**`metro.config.js` (new in Session 32):**
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wav');
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /functions\/.*/,
];
module.exports = config;
```

The `blockList` entry for `/functions\/.*/` stops the Metro bundler from trying to include the Cloud Functions sub-project in the React Native bundle — `functions/` has its own Node dependency tree that would otherwise confuse Metro's module resolution. The `Array.isArray` spread preserves Expo's default `blockList` (whatever shape that is in any given Expo SDK version) before appending. `wav` asset extension retained from Session 23 for game sound files.

### New `assets/trivia/` icons (Session 32)

**11 new custom DFW-style trivia icons** added alongside the trivia overhaul — used by the new parent category tiles and `SubcategoryPickerModal`. Each is a 512×512 WebP with DFW's anthropomorphic game-character art style (matching Session 19/20 treatment, not the chrome icon set):

- `popcorn_bucket.webp` — Pop Culture parent
- `d20_die.webp` — Gaming & Geek parent
- `scroll_icon.webp` — Myth & Fiction parent + Mythology & Books subcategory
- `crt_tv_icon.webp` — Television subcategory
- `walk_of_fame_star.webp` — Celebrities subcategory
- `lightbulb_icon.webp` — Gadgets subcategory
- `chalkboard_icon.webp` — Mathematics subcategory
- `gavel_icon.webp` — Politics subcategory
- `paint_palette.webp` — Art subcategory
- `recliner_512.webp` — Sports & Leisure parent (replaced earlier `trivia-sports.webp` reference)
- `board_game_pawn_monocle.webp` — Board Games subcategory
- `beat_up_car.webp` — Vehicles subcategory
- `game_controller.webp` — Video Games subcategory
- `explosion_speech_bubble.webp` — Comics & Anime subcategory

(Some existing trivia assets retained: `trivia-general.webp`, `trivia-science.webp`, `trivia-history.webp`, `trivia-geography.webp`, `trivia-movies.webp`, `trivia-music.webp`, `trivia-sports.webp` still referenced for older subcategory slots.)

### Packages Added (Session 41 — v2.0.0)
- `@react-native-firebase/app-check` — Firebase App Check with Play Integrity attestation (production) / debug provider (dev). Native, requires a dev/production build. Registered in `app.json` `expo.plugins`. Initialized at module scope in `App.tsx` before any other Firebase service call. Provides the attestation token attached to `cloudCheckers.ts` fetches and every Firestore read/write. Debug tokens registered in the Firebase Console for local dev.

### Packages Added (Session 35/36)
- `patch-package` — dev dependency, auto-applies patches via `postinstall` hook. Used for the `react-native-zip-archive` JDK 21 fix (casts `double` → `int` in `RNZipArchiveModule.java` switch selector). Patch file lives at `patches/react-native-zip-archive+7.1.0.patch`. `react-native-zip-archive` pinned exactly to `"7.1.0"` (no tilde) so a future 7.1.1 can't silently break the patch by filename mismatch.
- `react-native-worklets` bumped `0.7.2 → ~0.7.4` — required by `expo-modules-core@55.0.22` peer tightening. Caught via EAS build failure (`npx expo install --check` does not flag worklets since it is not Expo-owned).
- 17 Expo SDK 55 packages bumped to latest patch versions via `npx expo install --check` (expo, expo-asset, expo-clipboard, expo-constants, expo-dev-client, expo-device, expo-document-picker, expo-file-system, expo-haptics, expo-image-picker, expo-keep-awake, expo-notifications, expo-print, expo-sharing, expo-splash-screen, expo-sqlite, expo-status-bar). `expo-audio` intentionally pinned at `55.0.13` from Session 33; `expo-font` already at latest-resolvable.

### Packages Added (Session 30)
- `@react-native-firebase/app` — Firebase core module. Required by every other `@react-native-firebase/*` package. Native, requires a dev/production build. Registered in `app.json` `expo.plugins`.
- `@react-native-firebase/auth` — Firebase Authentication. Uses the modular API (`getAuth`, `signInWithCredential`, `signOut`, `onAuthStateChanged`, `GoogleAuthProvider.credential`). Native. Registered in `app.json` `expo.plugins`.
- `@react-native-firebase/firestore` — Firestore client. Uses the namespaced default export (`import firestore from '@react-native-firebase/firestore'`) so `firestore.Timestamp.now()` is available statically. Native (same dev-build requirement as the rest of the Firebase suite).
- `@react-native-google-signin/google-signin` — Native Google Sign-In sheet + `getTokens` / `addScopes` / `clearCachedAccessToken` helpers. The native dep that owns the consent UI; hands an `idToken` to `@react-native-firebase/auth` via `GoogleAuthProvider.credential(idToken)`. Registered in `app.json` `expo.plugins` with `iosUrlScheme: "com.googleusercontent.apps.PLACEHOLDER"` (iOS is secondary/future — the placeholder needs replacing with the reversed iOS OAuth client ID before any iOS build).

### Firebase Setup (Session 30)

**Project:** `dont-forget-why` on Blaze plan (required for Cloud Functions — even though P8 Cloud Stockfish hasn't shipped yet, Blaze was activated to start the $300 credit clock).

**Credit:** $300 activated April 14, 2026 — **expires July 14, 2026** (90-day consumption window). Sessions that consume Firebase resources (multiplayer chess, cloud Stockfish, online riddles, global leaderboards) need to land inside that window to benefit.

**Registered app:** Android `com.zerennblish.DontForgetWhy` with SHA-1 fingerprint from the production keystore. `google-services.json` downloaded from the Firebase Console and committed at the project root. Referenced via `android.googleServicesFile: "./google-services.json"` in `app.json` — required for EAS prebuild, which runs on the build server and can't auto-detect the file the way a local build can.

**Auth providers:** Google Sign-In enabled via the Firebase Console. Web client ID (`client_type: 3`) from `google-services.json` is hardcoded as `WEB_CLIENT_ID` in `src/services/firebaseAuth.ts` and passed to `GoogleSignin.configure()` along with the `calendar.readonly` scope.

**Firestore:** Database created, rules published on day one (no test-mode window exposed to real users):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
A future session should commit these rules to a `firestore.rules` file at the repo root and wire a deploy script so they live alongside the client code, not only in the Firebase Console.

**Google Calendar API:** Enabled in Google Cloud Console (separate from the Firebase Console) so the Bearer token from `GoogleSignin.getTokens()` can hit `https://www.googleapis.com/calendar/v3/calendars/primary/events`. Required once per project; no per-user consent beyond the `calendar.readonly` scope in the Google Sign-In sheet.

### Config Plugins Added to `app.json` (Session 30)

```json
"plugins": [
  ...
  "@react-native-firebase/app",
  "@react-native-firebase/auth",
  ["@react-native-google-signin/google-signin", {
    "iosUrlScheme": "com.googleusercontent.apps.PLACEHOLDER"
  }]
]
```

Plus the Android-specific `googleServicesFile` setting:

```json
"android": {
  ...
  "googleServicesFile": "./google-services.json",
  ...
}
```

### Package Audit (Session 15)
- Ran `depcheck` — no abandoned packages. Flagged as "unused" but actually required implicitly: `expo-dev-client`, `expo-notifications`, `react-native-screens`, `react-native-worklets`.
- `sharp` temporarily installed then removed during WebP conversion (one-time asset operation).

### Asset Format Changes (Session 15)
- All 10 background images converted from PNG → WebP: `oakbackground.webp`, `questionmark.webp`, `newspaper.webp`, `lightbulb.webp`, `brain.webp`, `door.webp`, `fullscreenicon.webp`, `gear.webp`, `library.webp`, `gameclock.webp`
- Size: 31.8 MB → 1.5 MB (95.4% reduction)
- Protected PNGs (unchanged): `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`

### Packages Removed (Session 10)
- `react-native-tab-view` — tabs replaced by standalone screens (Session 9 separation)
- `react-native-pager-view` — was only a dependency of tab-view
- `date-fns` — unused after prior refactors

### App.tsx Changes (Session 10)
- `GestureHandlerRootView` wraps the entire app — required for SwipeableRow gesture handling

### App.tsx Changes (Session 12)
- `migrateFromAsyncStorage()` gate: migration runs before any screens render, App returns null until `dbReady` is true

### Jest Setup (Session 11, expanded Session 15, 24, 28)
- **Preset:** `ts-jest` with `node` test environment
- **Tests:** `__tests__/` at project root — 13 suites, 320 tests total:
  - `time.test.ts` — formatTime (12h/24h)
  - `timeUtils.test.ts` — getRelativeTime, formatDeletedAgo (with fake timers)
  - `noteColors.test.ts` — getTextColor contrast
  - `soundModeUtils.test.ts` — 5 pure sound mode functions
  - `safeParse.test.ts` — `safeParse<T>` + `safeParseArray<T>` (Session 24)
  - `asyncMutex.test.ts` — `withLock` per-key async mutex (Session 24)
  - `backupRestore.test.ts` — backup validation, auto-backup settings
  - `widgetPins.test.ts` — all 4 pin categories (alarm, note, reminder, voice memo) with in-memory kv mock
  - `settings.test.ts` — settings CRUD, onboarding, silence-all, timer sound (with fake timers)
  - `voiceClipStorage.test.ts` — clip CRUD, ordering, summaries (Session 26)
  - `chessAI.test.ts` — 69 tests
  - `checkersAI.test.ts` — 52 tests
  - `tutorialTips.test.ts` — data validation for `TUTORIAL_TIPS` (Session 28): ≥7 screen keys, ≥1 tip per screen, non-empty title/body, letter-only keys, `clipKey` is undefined or non-empty string
- **Run:** `npm test` or `npx jest`
- **Config:** `package.json` `"jest"` section with `moduleNameMapper` for `src/` paths
- **Scope:** Pure utility functions AND pure service files (those whose only side-effect is `kvGet`/`kvSet`/`kvRemove`, mocked with in-memory Map). No React Native, no SQLite, no native modules. Game engines (chessAI, checkersAI) tested directly (pure JS, no native deps).
- **Mock pattern:** `jest.mock('../src/services/database', () => ({ kvGet, kvSet, kvRemove }))` backed by `new Map<string, string>()` cleared in `beforeEach`
- `jest-expo` in devDependencies for future component testing (not used as preset — crashes on expo-modules-core)

### Git Branches
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production. Synced with dev at v1.8.0. | Active, clean |
| `dev` | v1.10.0 — Visual overhaul, swipe-to-delete, emoji picker, button hierarchy, widget section colors, Jest. | Active — all new work goes here |
| `testing-setup` | Jest work branch. Merge main INTO testing-setup only. | Merged to dev (Session 11) |

---

## 8. Weekly Maintenance Cadence

Lightweight dependency drift check run weekly. Keeps `dev` from accumulating small SDK/patch drift between shipped versions so that larger bumps don't blindside a ship.

- **Scheduled via DFW alarm** — the app's own recurring alarm is the reminder (dogfood the product).
- **Branch off `dev`** — short-lived maintenance branch from current `dev`, not `main`.
- **Run `npx expo install --check`** — Expo's SDK compatibility check. Surfaces Expo-owned packages that have drifted from the current matrix.
- **Narrow-bump if drifted** — patch/minor bumps only for what the check flags. Nothing speculative, nothing outside the Expo matrix.
- **Close branch if nothing changed** — clean check → delete the branch. No empty commits, no drift-session churn.
- **Dedicated dep-alignment sessions scheduled separately for larger work** — SDK upgrades, worklets/Skia/reanimated family bumps, or anything that needs its own EAS build + audit land in their own sessions. The weekly check is a drift guard, not a vehicle for major version jumps.

---

## 9. Audit Workflow (Session 37)

### Audit Confidence Tiers

Audit prompts must use these three tiers — the previous `safe-delete` tier is retired (it assumed certainty that wasn't earned; initial Pass 1 used it and produced 70%+ false positives).

- **`verified-dead`** — Auditor shows specific grep commands + results with zero matches across production code AND tests. Exhaustive verification. Safe to delete without further review.
- **`likely-dead-low-confidence`** — Appears unused but the auditor couldn't fully verify (dynamic references, string-keyed lookups, external consumers that couldn't be enumerated). Flag for human review; don't delete automatically.
- **`pending-verification`** — Suspicious but not investigated. Next-session candidate for a deeper sweep.

Auditors report findings with the tier inline. Fix prompts act on `verified-dead` only; `likely-dead-low-confidence` flows to human triage.

### Claude Code Tool-Use Watches

Standing rules for reviewing Claude Code's actions before approving permissions or accepting changes:

- **Watch for `/tmp` writes** — Deny if Claude Code (or any sub-auditor) asks to write scripts to `/tmp/` or any path outside the project tree. All bash in audit + fix prompts must be inline. Scripts hide logic from the user reviewing the tool-use stream.
- **Watch for files outside the prompt's explicit file list in `git status`** — Deny extra changes. A prompt scoped to `@fileA @fileB` should only modify `fileA` and `fileB`; anything else is out-of-scope drift.
- **Rely on PowerShell `git status` for verification, not Claude Code's own summary** — Tool-use summaries can omit edits (especially subtle whitespace changes or unrelated file touches). PowerShell is the ground truth.
- **Verify branch with `git branch --show-current` before every prompt** — Session 37 discovered work had been landing on `main` instead of `dev` due to an unfinished merge. If not on `dev`, switch first.
