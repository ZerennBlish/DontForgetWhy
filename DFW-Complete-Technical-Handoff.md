# Don't Forget Why — Complete Technical Handoff
## Compiled: March 29, 2026
## Covers: February 8 – March 29, 2026 (entire project history)

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Team & Workflow](#2-team--workflow)
3. [Hardware & Setup](#3-hardware--setup)
4. [Project Structure](#4-project-structure)
5. [Complete Version History](#5-complete-version-history)
6. [App Features — Current State](#6-app-features--current-state)
7. [Data Models — Current State](#7-data-models--current-state)
8. [Notification System Architecture](#8-notification-system-architecture)
9. [Theme System](#9-theme-system)
10. [Widget System](#10-widget-system)
11. [Complete Bug History](#11-complete-bug-history)
12. [Complete Audit History](#12-complete-audit-history)
13. [Design Decisions](#13-design-decisions)
14. [Environment & Setup Knowledge Base](#14-environment--setup-knowledge-base)
15. [Workflow Rules](#15-workflow-rules)
16. [Post-Launch Roadmap](#16-post-launch-roadmap)
17. [Store Listing](#17-store-listing)
18. [Image Assets](#18-image-assets)
19. [File Transfer Script](#19-file-transfer-script)
20. [Testing Status](#20-testing-status)
21. [Key Commands](#21-key-commands)

---

## 1. PROJECT OVERVIEW

**App:** Don't Forget Why (DFW)
**Publisher:** Bald Guy & Company Games — "Apps that talk back"
**Developer:** Zerenn (solo developer, age 40, Colorado)
**Package:** com.zerennblish.DontForgetWhy
**Stack:** React Native 0.81.5 + Expo SDK 54 + TypeScript (strict mode)
**Platform:** Android (primary), iOS (secondary/future)
**Monetization:** Free, no ads, no tracking. Potential future Pro features ($1.99 one-time) for online content.
**GitHub:** https://github.com/ZerennBlish/DontForgetWhy
**Contact:** baldguyandcompanygames@gmail.com

**What it is:** An alarm, reminder, timer, and notepad app with built-in mini-games and a personality-driven identity. The hook: every alarm requires a mandatory note explaining WHY it was set. When the alarm fires, the note displays prominently. "Remember why you woke up."

**Store tagline:** "Set alarms. Forget why. Get roasted."
**Brand closer:** "No accounts. No tracking. No ads. Just you and your questionable memory."

**Built from scratch starting February 8, 2026.** First working prototype ran on Zerenn's phone within hours of the first session. The app went from zero to closed testing on Google Play in 10 days.

---

## 2. TEAM & WORKFLOW

| Role | Tool | What It Does |
|------|------|-------------|
| **Project lead** | Zerenn | Decides what gets built, how it looks, what ships. Final say on everything. |
| **Head developer / architect** | Opus (Claude) | Planning, architecture, prompt writing, troubleshooting |
| **Implementation** | Claude Code (WSL/Ubuntu) | Actual coding via terminal |
| **Primary auditor** | Codex (ChatGPT) | Code review, bug finding. Has filesystem access. Full audit depth. |
| **Primary auditor** | Gemini | Code review, bug finding. Same audit depth as Codex. **REPORT ONLY — never edits files** |

**Evolution:** Gemini was initially excluded (Zerenn: "worthless for code work"). Later promoted to equal auditor after proving valuable. On Feb 17, Gemini violated READ-ONLY by editing a file — was reverted and reprimanded. Has complied since.

### Workflow
1. Zerenn describes → Opus plans + writes prompts → Claude Code implements → TypeScript check → dual audit (Codex + Gemini) → Opus interprets findings → fixes applied → test on phone → push to GitHub → EAS build → closed testing

### Prompt Rules
- Full file replacements for features, surgical edits for fixes
- Prompts in copyable code blocks, one at a time
- "think hard" or "ultrathink" for complex prompts
- Never nest code blocks inside code blocks
- Confirm design scope with Zerenn before writing long prompts

---

## 3. HARDWARE & SETUP

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

## 4. PROJECT STRUCTURE

Codebase reorganized during Phase 1 housekeeping. All source files live under `src/` in categorized subfolders.

```
DontForgetWhy/
├── App.tsx
├── index.ts
├── app.json
├── package.json
├── ROADMAP.md
├── DFW-Complete-Technical-Handoff.md
├── assets/
│   └── voice/                     # 63 bundled MP3 voice clips
└── src/
    ├── components/
    │   ├── AlarmCard.tsx
    │   ├── BackButton.tsx
    │   ├── DayPickerRow.tsx
    │   ├── DrawingCanvas.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── ImageLightbox.tsx
    │   ├── NoteEditorModal.tsx
    │   ├── ShareNoteModal.tsx
    │   ├── SoundPickerModal.tsx
    │   ├── TimePicker.tsx
    │   └── UndoToast.tsx
    ├── data/
    │   ├── alarmSounds.ts
    │   ├── appOpenQuotes.ts
    │   ├── voiceClips.ts          # voice clip registry (10 categories, 63 clips)
    │   ├── guessWhyIcons.ts
    │   ├── guessWhyMessages.ts
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
    │   ├── AlarmsTab.tsx
    │   ├── CalendarScreen.tsx
    │   ├── CreateAlarmScreen.tsx
    │   ├── CreateReminderScreen.tsx
    │   ├── DailyRiddleScreen.tsx
    │   ├── ForgetLogScreen.tsx
    │   ├── GamesScreen.tsx
    │   ├── GuessWhyScreen.tsx
    │   ├── MemoryMatchScreen.tsx
    │   ├── MemoryScoreScreen.tsx
    │   ├── NotepadScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── ReminderScreen.tsx
    │   ├── SettingsScreen.tsx
    │   ├── SudokuScreen.tsx
    │   ├── TimerScreen.tsx
    │   └── TriviaScreen.tsx
    ├── services/
    │   ├── alarmPhotoStorage.ts    # per-alarm photo save/delete/exists
    │   ├── alarmSound.ts
    │   ├── backgroundStorage.ts    # shared screen background photo
    │   ├── forgetLog.ts
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
    │   ├── storage.ts
    │   ├── timerStorage.ts
    │   ├── triviaAI.ts
    │   ├── triviaStorage.ts
    │   └── widgetPins.ts
    ├── theme/
    │   ├── colors.ts               # theme definitions + custom theme generator
    │   └── ThemeContext.tsx         # theme provider + useTheme hook
    ├── types/
    │   ├── alarm.ts
    │   ├── note.ts
    │   ├── reminder.ts
    │   ├── timer.ts
    │   └── trivia.ts
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
        ├── NotepadWidget.tsx
        ├── updateWidget.ts
        └── widgetTaskHandler.ts
```

---

## 5. COMPLETE VERSION HISTORY

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
| Mar 29 | 2.0.0 | 21 | P3 Voice Roasts: 63 voice clips, native ALARM stream playback, expo-av removed, expo-audio chirp, dismiss voice toggle, silent alarm guard, production URI handling | Pending production |

---

## 6. APP FEATURES — CURRENT STATE

### Core Utility
- **Alarms** — reason field ("why"), 7 sound presets + custom system sounds, snooze (1/3/5/10/15 min), recurring (daily/weekly/monthly/yearly) + one-time, emoji icon from keyboard, per-alarm Guess Why toggle, private mode (completely blank card)
  - Notification action buttons: "Snooze" and "Dismiss" buttons on alarm notification banners for in-app dismissal without opening fire screen
- **Reminders** — due dates, 5 recurring patterns (daily/weekly/monthly/yearly/one-time), 6-hour completion window, date-only mode, completion history, sound mode (sound/vibrate/silent), emoji icon
- **Timers** — 19+ presets + saveable custom timers with name/emoji, recently used (max 3) one-tap quick start, sound mode per timer, pinnable to widget, Timer Sound capsule
  - Notification action buttons: "Dismiss" button on timer completion notification
- **Notepad** — 999-char notes, 10 bg colors + custom, font color presets + custom (reanimated-color-picker), keyboard emoji input, hyperlinks (email/phone/URL), view mode with tappable links, share + print, soft delete with undo, pin to widget (max 4), image attachments (max 3 per note, gallery pick via expo-image-picker, JPEG quality 0.7)
- **Calendar** — In-app calendar view (CalendarScreen) accessible from main screen nav card. Uses react-native-calendars (JS-only). Month view with colored dot indicators: red=alarms, blue=reminders, green=notes. Custom dayComponent dims past dates. Three view modes (Day/Week/Month) with capsule tabs. Filter by type (All/Alarms/Reminders/Notes) in Week and Month views. Create buttons (+Alarm/+Reminder) prefill selected date via initialDate param. Handles one-time alarms, recurring weekly, recurring daily (empty days), reminders (all patterns), notes (local timezone bucketing). Week view locked to current week (always shows Sunday–Saturday containing today). Tapping a date outside current week while in week view auto-switches to day view. Supports initialDate route param for deep-linking from widget or other screens.
- **Calendar Widget** — Home screen widget showing current month as a mini grid. Colored dots per day: red=alarms, blue=reminders, green=notes. Tap any day → opens CalendarScreen focused on that date. Today highlighted with accent background. Past days dimmed. Adjacent month days shown in secondary color. Registered as third widget in app.json (minWidth 250dp, minHeight 280dp).
- **DND bypass** — Notifee full-screen intent + Samsung onboarding
- **Full-screen alarm fire** — lightbulb background (or per-alarm photo if set), snooze shame (4 tiers × 7 messages), shows 🔇 when silenced
- **Native MediaPlayer sound** — plays through STREAM_ALARM regardless of ringer mode. Notification channels are SILENT. MediaPlayer handles all audio.

### Guess Why System (Per-Alarm)
- Per-alarm toggle on CreateAlarmScreen (between note and Private)
- Eligibility: requires nickname OR note ≥ 3 chars OR icon
- Runtime: AlarmFireScreen checks `alarm.guessWhy`, validates clue exists
- Pre-game: icon and note hidden until game played. Nickname always visible.
- Not on reminders — reminders don't fire through AlarmFireScreen

### Sound Mode System
- Single cycling icon: 🔔 Sound → 📳 Vibrate → 🔇 Silent
- Sound chirp via expo-audio on Sound transition (createAudioPlayer, volume 0.3, auto-release on completion)
- Global Silence All in Settings with duration picker
- Two-layer enforcement: schedule-time channel swap + fire-time MediaPlayer skip

### Notification Action Buttons (v1.3.9)
- Alarm notifications display "Snooze" and "Dismiss" inline action buttons
- Timer-done notifications display "Dismiss" only (no snooze for timers)
- NOT added to: timer countdown, reminder, or preview notifications
- Handlers in both index.ts (background) and App.tsx (foreground) process ACTION_PRESS events
- Dismiss: stops sound, cancels notification + countdown, soft-deletes one-time alarms, cleans up timer state, marks notification as handled
- Snooze: stops sound, sets snoozing flag (enforced — aborts on failure), cancels notification, schedules snooze, persists snooze notification ID via updateSingleAlarm, marks as handled
- Solves "pulled out of app" problem — users handle alarms/timers from notification banner without leaving current app
- **v1.4.0 behavior change:** Foreground DELIVERED events now play sound only — no auto-navigation to AlarmFireScreen. Users interact via notification action buttons or tap notification body to optionally open fire screen. Eliminates race condition where timer dismiss failed due to competing DELIVERED navigation.

### Voice Roasts System

#### Architecture
Voice clips play through the native AlarmChannelModule on Android's ALARM audio stream (USAGE_ALARM), bypassing media volume. This ensures clips are always audible when an alarm fires, regardless of ringer mode or media volume setting.

Two separate MediaPlayers in AlarmChannelHelper.java (embedded in plugins/withAlarmChannel.js):
- sPlayer: alarm/timer sounds (looping)
- sVoicePlayer: voice clips (non-looping, completion callback resolves JS promise)

JS service (src/services/voicePlayback.ts) uses Image.resolveAssetSource to get URIs from bundled require() assets, then passes URIs to the native module. No expo-av involved.

#### Audio Sequencing (AlarmFireScreen)
1. Alarm sound plays for 1.5 seconds
2. Alarm sound stops (stopAlarmSound)
3. Intro clip plays if first alarm ever (one-time, stored in AsyncStorage)
4. Random fire/timer clip plays (await playRandomClip)
5. Alarm sound resumes (unless silent/true_silent alarm)

#### Voice Categories (src/data/voiceClips.ts)
- fire (16 clips): alarm fire lines
- snooze1-4 (4/6/4/6 clips): tier-matched snooze shame
- timer (11 clips): timer completion lines
- guess_before (4 clips): before Guess Why question
- guess_correct (3 clips): correct answer
- guess_wrong (3 clips): wrong answer/skip
- dismiss (10 clips): plays full clip before app exit
- intro (1 clip): one-time first alarm greeting
Total: 63 bundled MP3 files in assets/voice/

#### Settings
- Voice Roasts toggle: AsyncStorage key 'voiceRoastsEnabled', defaults to true (opt-out)
- Dismiss Voice toggle: AsyncStorage key 'dismissVoiceEnabled', defaults to true, only shown when voice roasts is on
- Settings UI in SettingsScreen.tsx, read by voicePlayback.ts

#### Native URI Handling (plugins/withAlarmChannel.js)
playVoiceClip handles multiple URI schemes for dev/production compatibility:
- http/https (Metro dev server)
- file:///android_asset/ (production bundled assets)
- file:// (cached assets)
- content:// (content provider URIs)
- Bare resource name fallback (tries AssetManager then Uri.parse)

#### Safety
- playId counter prevents zombie playback after cancellation
- sPendingVoiceCallback ensures JS promise always resolves (even on stop/error)
- stopVoice() called in all exit paths (dismiss, snooze, guess why, unmount cleanup)
- Voice errors never crash the alarm flow — all caught and logged

#### Voice Character
Male, early 30s, American accent. Tired, sarcastic, self-aware app personality. Has coworkers (Denise), a life, opinions about being stuck in a phone. Clean — no profanity. Generated via ElevenLabs v3.

### Time Input System
- Global preference: Scroll (rolodex) vs Type (text inputs) in Settings
- Scroll: 3-row rolodex modal, AM/PM auto-flip on boundary crossing
- Type: inline TextInputs with per-keystroke validation, auto-advance
- TimePicker fix: parent callbacks only in onMomentumScrollEnd (not onScroll) — prevents infinite re-render

### Mini-Games
- **Guess Why** (per-alarm, icon + type modes, 3 attempts)
- **Trivia** (912+ questions, 10 categories incl. Kids/Music/Movies&TV, difficulty filter, speed selector, online mode placeholder)
- **Memory Match** (3 difficulties, card flip animation, star rating)
- **Sudoku** (pure JS generator, difficulty = assistance level, no lose condition, pencil notes, save/resume)
- **Daily Riddle** (146 riddles, deterministic daily, streak tracking, browse all)
- **Memory Score** (5 games × 20 pts = 100. Ranks from "Who Are You Again? 🐟" to "The One Who Remembers 👑")

### Home Screen Widgets (2)
- **DFW (DetailedWidget):** Title, two-column timers/alarms, reminder bars, nav capsules. Themed.
- **DFW Notes (NotepadWidget):** Header with balanced centering, up to 4 pinned notes, footer. Themed.
- Both: 180dp min, resizable, deep-link to app sections, privacy guards on private alarms

### Theme System
- 6 presets: Midnight, Ember, Neon, Void, Frost, Sand — all WCAG AA verified
- Dual-color custom theme with live preview
- 60-30-10 rule: Background 60%, card 30%, accent 10%
- Migration map from old names: charcoal→void, amoled→void, slate→neon, paper→frost, cream→sand, arctic→frost

### Privacy System
- Private alarms/reminders: completely blank cards (no icon, no nickname, no lock icon)
- Content only visible in edit screen. Widgets show generic ⏰ and "Alarm"

### Background Images
- Game screens: AI-generated themed backgrounds with dark overlays (0.55-0.7 opacity)
- Games Hub + Settings: semi-transparent cards over background images
- Main tabs: user photo background with configurable dark overlay (30-80% opacity), or app icon watermark at 0.07 opacity when no photo set
- Alarm fire: per-alarm photo background (if set) with 0.7 opacity overlay, or lightbulb.png default

### Sorting, Filtering, Soft Delete
- Alarms: sort by Time/Created/Name, filter by All/Active/One-time/Recurring. Default: All
- Reminders: sort by Due Date/Created/Name, filter by Active/Completed/Has Date
- Soft delete with UndoToast (5-second, key-based reset), 30-day auto-purge

---

## 7. DATA MODELS — CURRENT STATE

### Alarm
```typescript
interface Alarm {
  id: string; time: string; nickname?: string; note: string; quote: string;
  enabled: boolean; mode: 'recurring' | 'one-time'; days: AlarmDay[];
  date: string | null; category: AlarmCategory; icon?: string;
  private: boolean; guessWhy?: boolean; createdAt: string;
  notificationIds: string[]; soundId?: string; soundUri?: string | null;
  soundName?: string | null; soundID?: number | null;
  photoUri?: string | null;  // per-alarm wake-up photo (P2 2.4)
  deletedAt?: string | null;
}
```

**Alarm photo storage:** Photos stored at `${Paths.document}alarm-photos/`. Filename: `alarm_${alarmId}_${timestamp}.jpg`. Service: `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto`, `deleteAlarmPhoto`, `alarmPhotoExists`. Deferred save pattern: photo stays in ImagePicker temp cache during form editing, only copied to permanent storage when alarm save succeeds. Old photo deleted only after new one confirmed. Cancel never touches filesystem. Photo cleanup: `permanentlyDeleteAlarm` and `purgeDeletedAlarms` (30-day) both delete photo files. Soft-delete keeps photo on disk.

### Reminder
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

### Note
```typescript
interface Note {
  id: string; text: string; icon: string; color: string;
  fontColor: string; pinned: boolean; createdAt: string;
  updatedAt: string; deletedAt: string | null;
  images?: string[];  // file:// URIs to locally stored images (max 3)
}
```

**Image storage:** Images stored on filesystem at `${FileSystem.documentDirectory}note-images/`. Photos: `${noteId}_${timestamp}_${uuid8}.jpg`. Drawings: `${noteId}_${timestamp}_${uuid8}.png` + companion `.json` (stroke data for re-editing). Service: `src/services/noteImageStorage.ts` — `saveNoteImage` detects .png/.jpg extension, copies companion .json alongside PNGs. `deleteNoteImage` also deletes companion .json. `loadDrawingData` reads companion .json (early-returns null for .jpg). `getDrawingJsonUri` derives .json path from .png path. All use directory-based File constructors (`new File(dir, filename)`) for reliability. `noteStorage.ts` auto-cleans images on permanent delete and 30-day purge.

### ActiveTimer / UserTimer
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

### Key AsyncStorage Keys
`'alarms'`, `'reminders'`, `'activeTimers'`, `'notes'`, `'userTimers'`, `'appSettings'`, `'silenceAllAlarms'`, `'appTheme'`, `'customTheme'`, `'hapticsEnabled'`, `'onboardingComplete'`, `'defaultTimerSound'`, `'bg_main'` (background photo URI), `'bg_overlay_opacity'` (background overlay 0.3-0.8), plus game stats (guessWhyStats, forgetLog, memoryMatchScores, sudokuBestScores, dailyRiddleStats, triviaStats), widget pins (widgetPinnedPresets, widgetPinnedAlarms, widgetPinnedReminders, widgetPinnedNotes), per-alarm (`snoozeCount_{alarmId}`, `snoozing_{alarmId}`), pending actions (pendingTabAction, pendingAlarmAction, pendingReminderAction, pendingNoteAction), notification dedupe (`_handledNotifs` in-memory + `handled_notifs` persistent in AsyncStorage)

---

## 8. NOTIFICATION SYSTEM ARCHITECTURE

### Why Notifee (not expo-notifications)
expo-notifications couldn't produce full-screen intents, DND bypass, sound looping, or alarm-style behavior. Replaced February 12 with @notifee/react-native.

### Why MediaPlayer (not notification channel audio)
Notifee v9.1.8 strips `audioAttributes` from JS `createChannel()`. Native config plugin approach also failed after 3 builds. Solution: all notification channels set to SILENT. Sound played separately through native `MediaPlayer` with `AudioAttributes.USAGE_ALARM` + `CONTENT_TYPE_MUSIC`.

### Sound Playback Flow
- `DELIVERED` event fires → `playAlarmSoundForNotification()` in both `index.ts` (background) and `App.tsx` (foreground)
- `AlarmFireScreen` mount plays as fallback only if not already playing
- Sound stopped on: dismiss, swipe (DISMISSED event), snooze, unmount, back button
- Sound resolution: check silent → custom URI → default timer sound → system default
- Invalid custom URI: catch block retries with null (system default fallback)

### Foreground DELIVERED Behavior (v1.4.0+)
- DELIVERED in foreground: plays alarm sound via playAlarmSoundForNotification() then returns. No navigation, no setPendingAlarm, no markNotifHandled.
- PRESS in foreground: full navigation to AlarmFireScreen (opt-in by user tapping notification body)
- ACTION_PRESS: unchanged — Dismiss/Snooze handlers with full cleanup
- consumePendingAlarm: no longer scans displayed notifications. Only reads module-level getPendingAlarm() for background/killed app scenarios.

### Key Distinctions
- `cancelNotification(id)` — kills display AND recurring trigger
- `cancelDisplayedNotification(id)` — kills display only, trigger survives (used for recurring alarms)
- `snoozing_{alarmId}` AsyncStorage flag — prevents DISMISSED handler from deleting one-time alarms during snooze
- Persistent notification dedupe via AsyncStorage for cold-start `getInitialNotification()` path (module-level Map doesn't survive process death)

### Notification Action Buttons
- Added in v1.3.9 to alarm and timer-done notification payloads
- Alarm actions: `[{ title: 'Snooze', pressAction: { id: 'snooze' } }, { title: 'Dismiss', pressAction: { id: 'dismiss' } }]`
- Timer actions: `[{ title: 'Dismiss', pressAction: { id: 'dismiss' } }]`
- Handled via `EventType.ACTION_PRESS` in both `index.ts` (background) and `App.tsx` (foreground)
- Snooze flag enforcement: uses try/catch with early return (not .catch(() => {})) — matches AlarmFireScreen pattern to protect one-time alarms
- Snooze notification ID persisted back to alarm.notificationIds via updateSingleAlarm — matches AlarmFireScreen pattern
- Timer dismiss also cancels countdown chronometer notification via cancelTimerCountdownNotification(timerId)

### Android Full-Screen Intent Behavior
- fullScreenAction only launches full-screen activity when screen is OFF or on lock screen
- When screen is ON (home screen or inside another app), Android downgrades to heads-up notification banner
- This is Android design (starting Android 10), not a bug
- Notification action buttons solve the UX problem — users dismiss/snooze from the banner

### Safety Net — Stale AlarmFire Screen
- Added in v1.3.9 to App.tsx AppState 'active' handler
- When app resumes on AlarmFire with no pending alarm data AND no displayed alarm/timer notifications, resets to AlarmList
- Uses notifee.getDisplayedNotifications() with channel ID prefix matching (startsWith('alarm') || startsWith('timer') excluding 'timer-progress')
- Prevents stale fire screen after exitApp didn't kill the process
- Initial version was too aggressive (only checked getPendingAlarm) — fixed after Audit 32 found it would kill live alarm screens

### Notification Channel IDs (Current)
| Channel | ID |
|---------|----|
| Default alarm | `alarms_v5` |
| Gentle/Urgent/Classic/Digital | `alarms_*_v4` |
| Vibrate Only | `alarms_silent_v4` |
| True Silent | `alarms_true_silent_v1` |
| Timer progress | `timer-progress` |
| Timer Vibrate/Silent | `timer_vibrate_v1` / `timer_silent_v1` |
| Reminders / Vibrate / Silent | `reminders` / `reminders_vibrate_v1` / `reminders_silent_v1` |
| Custom alarm/timer | `alarm_v2_custom_{mediaId}` / `timer_v2_custom_{mediaId}` |

All prior channel versions deleted on every app startup.

---

## 9. THEME SYSTEM

### 6 Preset Themes (WCAG AA Verified)
| Theme | Mode | Background | Card | Accent |
|-------|------|-----------|------|--------|
| Midnight | dark | #0F0F1A | #1A1A2E | #4A90D9 |
| Ember | dark | #1A1008 | #2C1E10 | #E8913A |
| Neon | dark | #0A0A14 | #141420 | #00E5CC |
| Void | dark | #000000 | #121212 | #FF3B7A |
| Frost | light | #F5F7FA | #FFFFFF | #2563EB |
| Sand | light | #F5F0E6 | #FFFBF4 | #A8521E |

### Evolution
Feb 11: 8 themes (Midnight, Obsidian, Forest, Royal, Bubblegum, Sunshine, Ocean, Mint) + custom. Mar 10-11: Replaced with current 6 — "the dark themes are all the same... 6 really distinct ones beats 8 okay ones." (Zerenn)

### Custom Theme
`generateCustomThemeDual(bgHex, accentHex)` — auto-detects dark/light from background luminance. Two pickers in Settings with live preview. Legacy guard: if stored as raw hex string instead of JSON object, auto-converts.

### Migration
charcoal→void, amoled→void, slate→neon, paper→frost, cream→sand, arctic→frost. Applied in both ThemeContext.tsx and widget theme loader.

---

## 10. WIDGET SYSTEM

### Architecture
- `index.ts` at project root: `registerWidgetTaskHandler(widgetTaskHandler)` + `registerRootComponent(App)`. Required because Expo's AppEntry.js doesn't support headless JS task registration.
- Widgets run bundled JS from APK, NOT from metro dev server. Any JS widget change requires new EAS build.
- Headless JS context: no React Native bridge, no Activity, no Linking. CAN access AsyncStorage, Notifee, JS modules.
- `flex: 1` must be at EVERY level of widget hierarchy. No `position: 'absolute'`.

### Timer Start from Widget
All app-opening approaches failed (Linking.openURL, OPEN_URI, deep links). Solution: headless timer start. `START_TIMER__{presetId}` clickAction → handler creates ActiveTimer, saves to AsyncStorage, schedules notifications. User sees countdown notification immediately. App loads running timer from AsyncStorage when opened later.

### Widget Theming
`getWidgetTheme()` reads theme from AsyncStorage with migration map, returns `WidgetTheme` object. `refreshWidgets()` (renamed from `refreshTimerWidget`) triggered after theme changes, data changes.

### Evolution
Feb 12: TimerWidget (compact) + DetailedWidget. Mar 6: NotepadWidget + NotepadWidgetCompact added. Mar 12: Trimmed to 2 — DetailedWidget redesigned, compacts deleted. Mar 25: CalendarWidget added — mini monthly calendar grid with colored dot indicators. Third widget alongside DetailedWidget and NotepadWidget. Uses getCalendarWidgetData() in widgetTaskHandler.ts for data loading. Click actions: OPEN_CALENDAR (opens CalendarScreen) and OPEN_CALENDAR_DAY__YYYY-MM-DD (opens CalendarScreen with date). pendingCalendarAction consumed in App.tsx on cold start and app resume. Widget alarm loader includes normalization for legacy alarm payloads (mode, days array, numeric weekday format) — does not import loadAlarms() to stay headless-safe, duplicates normalization inline.

### CalendarWidget
- Mini month grid: 7 columns × 5-6 rows, weekday header, month/year label
- Colored dots: red (#FF6B6B) alarms, blue (#4A90D9) reminders, green (#55EFC4) notes — up to 3 per day
- Today: accent background highlight
- Past days: textSecondary color (dimmed)
- Adjacent month padding days: textSecondary color with actual date click actions
- Root FlexWidget has clickAction="OPEN_CALENDAR" (dead space opens app)
- Footer: "Don't Forget Why" branding
- minWidth: 250dp, minHeight: 280dp (bumped from 220dp after Audit 34 finding — 6-row months need more height)
- Data: getCalendarWidgetData() loads alarms/reminders/notes, computes dot presence per day for entire current month
- Refresh: included in refreshWidgets() and refreshAllWidgets()

---

## 11. COMPLETE BUG HISTORY

### Summary Statistics
- **~90+ unique bugs** found and fixed across the project lifetime
- **Found by Zerenn:** ~30 (manual testing, device observation)
- **Found by auditors (Codex/Gemini):** ~50
- **Found by Opus/TypeScript:** ~10

### Critical Architecture Bugs (Most Important to Understand)

**Notification channel audio doesn't work (Feb 26):** Notifee strips audioAttributes. 3 native plugin builds failed. Solution: MediaPlayer with USAGE_ALARM. All channels SILENT. This is why the app has a custom native module.

**Recurring alarms stop re-firing after first dismiss (Mar 19):** `cancelNotification()` kills both display AND trigger. Fix: recurring alarms use `cancelDisplayedNotification()` (display only).

**Fire screen re-triggers on next app open (Mar 19):** `getInitialNotification()` persists across process restarts. Module-level dedupe Map doesn't survive process death. Fix: persistent AsyncStorage dedupe.

**Snooze deletes one-time alarms (Feb 26):** Snooze cancel triggers DISMISSED → soft-deletes alarm. Fix: `snoozing_{alarmId}` AsyncStorage flag set BEFORE cancel, consumed by DISMISSED handler.

**TimePicker infinite re-render loop (Mar 11):** onScroll called parent onChange → setState → prop change → scrollToOffset → onScroll → loop. Fix: parent callbacks only in onMomentumScrollEnd.

**Widget renders transparent (Feb 12):** registerWidgetTaskHandler inside App.tsx instead of module-level entry point. Fix: created index.ts.

**Alarms silent on silent/vibrate mode (Feb 26):** Entire MediaPlayer architecture change (see section 8).

### Bug Categories (Grouped)

**Notification/Alarm Lifecycle (~20 bugs):** notificationId not stored, cancel uses wrong ID, one-time alarm ghost after dismiss, yearly reminders don't reschedule, weekly early completion duplicates, snooze doesn't bypass lock screen, snooze leaks alarm.note, snooze double-tap, snooze ID pruning removes recurring triggers, dismiss cancels ALL notifications, no sound when screen on, swipe doesn't stop sound, foreground DELIVERED blocks yearly reschedule, double-play race, invalid custom URI silent failure, AlarmFireScreen appears twice, fire screen re-trigger on reopen

**Widget (~8 bugs):** transparent render, Linking.openURL syntax, deep link fails headless, no notification after widget timer start, presets don't refresh, countdown notification wrong channel, stale preset pins, ghost user timer pin

**Theme/Display (~10 bugs):** widget theme uses nonexistent names, updateWidget missing theme prop, ThemeContext no widget refresh, widget refresh before AsyncStorage write, legacy custom theme string crash, widget theme loader missing migration, custom theme unreadable with extreme colors, hardcoded colors surviving refactor, NotepadWidget header not centered

**Input/Validation (~10 bugs):** time input allows 88:77, minute accepts invalid first digits, AM/PM untappable in typing mode, AM/PM auto-flip misses fast scroll, TimePicker stale state on reopen, time defaults to static value, smart date shows "Today" for past times, one-time day chip doesn't schedule

**Privacy (~5 bugs):** private alarm content leaks in Deleted view, private icons leak to widgets, snooze privacy leak (alarm.private not checked), Guess Why note not revealed after game, private alarm regression after GW fix

**Emoji (~4 bugs):** empty string renders blank icons, ZWJ truncation via chars[0], grapheme segmentation broken (spread operator), setSelectedIcon null vs string

**Data/Storage (~8 bugs):** loose AsyncStorage validation (progressively tightened across 3 audits), welcome note race condition, custom color key rename without migration, edit race condition (save before load), settings validation missing, timer drift in background

**Game (~6 bugs):** Guess Why icon substring matching (fixed 3 times), short notes unwinnable, memory rank float gaps, Sudoku shows wrong answers in red, trivia crash (Kids+Hard=0 questions), Sudoku stats display wrong

**Bug: TimePicker columns clip on narrow screens (S25 FE)**
- Found: Mar 21 by Zerenn's son on Samsung Galaxy S25 FE (1080x2340, 19.5:9)
- Cause: Hardcoded colWidth (80/90px) and itemHeight (56px) didn't scale for lower pixel density screens
- Fix: Full TimePicker.tsx rewrite — responsive colWidth from useWindowDimensions, font scaling via fontScale = colWidth/90, itemHeight increased to 96px for all devices
- Version: v1.3.7

**Bug: Day chip doesn't clear calendar date in one-time mode**
- Found: Mar 21 by Zerenn during testing
- Cause: useDaySelection.ts handleToggleDay only called clearDate in recurring mode, not one-time mode
- Fix: Added clearDate?.() call in one-time branch of handleToggleDay
- Version: v1.3.7

**Bug: Reminder one-time day chip silently misschedules**
- Found: Mar 21 by Audit 30 (Codex)
- Cause: CreateReminderScreen save logic only read selectedDate, ignored selectedDays. When clearDate fired from day chip tap, selectedDate became null and reminder fell back to today/tomorrow instead of the selected day
- Fix: Added same three-tier scheduling logic from CreateAlarmScreen to CreateReminderScreen: (1) selectedDate, (2) selectedDays one-day-of-week calculation, (3) today/tomorrow fallback
- Version: v1.3.7

### v1.3.9 Bug Fixes (found via emulator testing and P2 polish)

**Bug: AlarmFireScreen dismiss flash**
- Found: Mar 22 (deferred), fixed Mar 24
- Cause: `exitToLockScreen()` did `navigation.reset({ index: 0, routes: [{ name: 'AlarmList' }] })` then `setTimeout(() => BackHandler.exitApp(), 100)` — AlarmList rendered and flashed on screen for ~100ms before exit. Disrupted users in other apps (e.g., disconnected from online games).
- Fix: `exitToLockScreen()` now calls `BackHandler.exitApp()` immediately with no navigation reset and no setTimeout. Safety net in App.tsx handles stale fire screen on next app open.
- Version: v1.3.9

**Bug: Note card borders invisible on dark themes**
- Found: Mar 24 during store screenshot creation
- Cause: Note cards used `borderColor: item.color + '80'` (semi-transparent version of note's own color). Black/dark notes on dark themes had invisible borders, cards blended into background.
- Fix: Contrast-based border using `getTextColor()` — dark notes get light border (`rgba(255, 255, 255, 0.25)`), light notes get dark border (`rgba(0, 0, 0, 0.2)`). Applied to both active and deleted card renders.
- Version: v1.3.9

**Bug: Reminder cards don't show nickname**
- Found: Mar 24 during store screenshot creation
- Cause: Reminder cards only showed `${item.icon} ${item.text}` on one line. Nickname field was ignored in card display.
- Fix: Two-line layout — if nickname exists, shows `icon nickname` as primary line and `text` as secondary line underneath (13px, textTertiary color). Falls back to single line when no nickname. Applied to both active and deleted renders. New style: `reminderSecondaryText`.
- Version: v1.3.9

**Bug: Safety net kills live alarm screens (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: Initial safety net only checked `getPendingAlarm()` which is a transient buffer consumed after first navigation. Any AppState 'active' trigger (notification shade, app switch) during a live alarm would see no pending data and reset to AlarmList, killing the alarm.
- Fix: Now also checks `notifee.getDisplayedNotifications()` for active alarm/timer notifications before resetting. Only resets if BOTH no pending data AND no displayed notifications.
- Version: v1.3.9

**Bug: Timer notification action dismiss doesn't cancel countdown (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: ACTION_PRESS dismiss handler only cancelled the timer-done notification, leaving the countdown chronometer notification in the shade.
- Fix: Added `cancelTimerCountdownNotification(timerId)` call in both background and foreground ACTION_PRESS handlers.
- Version: v1.3.9

**Bug: Notification snooze doesn't enforce flag write (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: Snooze action handlers used `.catch(() => {})` for the snoozing flag AsyncStorage write and continued regardless. If write failed, DISMISSED handler would soft-delete one-time alarms during snooze.
- Fix: Changed to try/catch with early return on failure, matching AlarmFireScreen pattern.
- Version: v1.3.9

**Bug: Notification snooze doesn't persist snooze notification ID (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: ACTION_PRESS snooze handlers didn't save the returned snooze notification ID back to alarm.notificationIds. Later delete/disable flows wouldn't cancel the snoozed notification.
- Fix: Added `updateSingleAlarm()` call to persist snooze notification ID, matching AlarmFireScreen pattern.
- Version: v1.3.9

### v1.5.0 Bug Fixes (found via Audits 34-35)

**Bug: Note sort uses UTC time instead of local**
- Found: Mar 25 by Codex Audit 34
- Cause: getItemSortTime in CalendarScreen used `createdAt.slice(11, 16)` which extracts UTC time. Alarms/reminders use local time strings, causing notes to sort out of order in non-UTC timezones.
- Fix: Parse Date object, extract local hours/minutes via getHours()/getMinutes().

**Bug: Widget alarm loader bypasses canonical migration**
- Found: Mar 25 by Gemini Audit 34
- Cause: loadWidgetAlarms() in widgetTaskHandler did raw JSON parse without normalizing missing mode, missing days array, or legacy numeric weekday values. Could crash or show wrong dots.
- Fix: Added inline normalization matching loadAlarms() logic — defaults mode to 'recurring', days to [], maps numeric weekday arrays to string format.

**Bug: CalendarWidget minHeight too small for 6-row months**
- Found: Mar 25 by Gemini Audit 34
- Cause: 220dp minimum left ~25dp per row after chrome. Day cells need ~30dp+ for number + dot row.
- Fix: Bumped to 280dp in app.json.

**Bug: Widget deep-links don't update already-mounted CalendarScreen**
- Found: Mar 25 by Gemini Audit 34
- Cause: useState initializers only run on first mount. If CalendarScreen was already in the nav stack, route.params.initialDate changes were ignored.
- Fix: Added useEffect watching route.params?.initialDate to update selectedDate and currentMonth on re-navigation.

**Bug: Floating BackButton overlaps scrolling content on CalendarScreen**
- Found: Mar 25 by Codex Audit 34
- Cause: Floating back button container had no background, scrolling content showed through.
- Fix: Added semi-transparent dark background pill (rgba(18, 18, 32, 0.85), borderRadius 20).

**Bug: Sudoku paused/won screens not width-capped on tablet**
- Found: Mar 25 by Codex Audit 35
- Cause: centeredContent and winContent styles had no maxWidth. Action buttons stretched full tablet width.
- Fix: Added maxWidth: 500, alignSelf: 'center', width: '100%' to both.

---

## 12. COMPLETE AUDIT HISTORY

| # | Date | Scope | Key Findings |
|---|------|-------|-------------|
| — | Feb 9 | First ever | notificationId not stored (C), UUID crash (C), JSON.parse unguarded (M) |
| — | Feb 9-10 | Post-13-features | Icon-only unwinnable (I), type mode false positive (I), notification note leak (I) |
| 1 | Feb 10 | Pre-theming | updateAlarm when disabled (C), wrong cancel ID (I), timer mount-only (I), GuessWhy substring (I) |
| 2 | Feb 11 | Post-theming | rank float gaps (I), custom theme extremes (I), edit permission block (I), hardcoded colors (m) |
| 3 | Feb 12 | Post-Notifee | dismiss cancels ALL (I), settings validation (m), timer creation unhandled (I) |
| 4 | Pre-Feb 12 | Post-widgets | Channel race, paused timer leak, countdown orphans, legacy icons |
| 5 | Feb 14 | Day/date + widgets | Stuck notifications (C), ghost alarms (C), date off-by-one (I), past timestamps (I) |
| 7 | Feb 15 | Full repo | Samsung DND (I), trivia seen scope (I), reminder sort (I), widget label (I), Sudoku hint (I) |
| 8 | Feb 15 | Full repo | Battery API (I), swipe bypass (I), undo timer (I), General Knowledge reset (I) |
| 14 | Feb 16 | Full codebase | Trivia crash (C), snooze privacy leak (C), trash inaccessible (I), AlarmFire double-fire (I) |
| 15 | Feb 17 | Post-fix | Guess Why note reveal (I), empty state (m), Sudoku contrast (m) |
| 16 | Feb 17 | expo-av removal | Clean. Dead function + async race found and fixed. |
| 17 | Feb 18-19 | Time input, recurring reminders | Yearly dueDate null (C), yearly no reschedule (C), timeFormat race (m). **Gemini violated READ-ONLY.** |
| 18 | Feb 19 | Full codebase | Yearly reschedule failure (C), weekly skip logic (C), checkbox bypass (I) |
| 19 | Feb 20 | Verification of 18 | Weekly duplicate trigger — Audit 18 fix was wrong (C), incomplete alarm ghost (I) |
| 20 | Feb 26 | Alarm sound system | Snooze race/flag mechanism (H), trim crash (H), double-play (M), URI fallback (M) |
| — | Feb 26 | Channel investigation | Both auditors contributed to MediaPlayer decision |
| 23 | Mar 10 | TypeScript check | 1 error: null not assignable to string |
| 24 | Mar 11 | Full dual (Update 2) | Legacy theme crash (C), widget refresh race (H), ghost pin (H), stale soundId (H) |
| 25 | Mar 11 | UI polish | Private leak in deleted view (H), private icon leak to widgets (M), stale pins (H) |
| 26 | Mar 12 | Pre-build (Update 3) | Grapheme segmentation, dead compact widget code, orphaned noteIcons.ts |
| 27 | Mar 12 | Final pre-production | Global guessWhyEnabled rendering (C), eligibility mismatch (W), reminder dead code (W) |
| 28 | Mar 19 | Phase 1 housekeeping | **0 findings.** All clean. |
| 29 | Mar 19 | Bug fixes v1.3.5 | Duplicate notification IDs in dedupe (valid warning, fixed) |

| 30 | Mar 21 | TimePicker rewrite + useDaySelection fix | Codex: 1 HIGH (reminder day chip regression — CreateReminderScreen save logic ignores selectedDays), 1 MEDIUM (fontScale not in render deps — portrait-locked so safe), 2 LOW (stale props on remount, label missing textAlignVertical). Gemini: PASS. |
| 30b | Mar 21 | CreateReminderScreen three-tier fix | Codex: MEDIUM (Save Anyway still allows past dates — pre-existing, not regression). Gemini: PASS. |

| 31 | Mar 22 | v1.3.8 full (emulator testing fixes) | Codex: soundId regression on edit (fixed), midnight stale state (accepted — reload on focus), emoji ZWJ limitation (accepted), dead code getAvailableAtTime/getAvailableAtDate (removed). Gemini: deleted note text unreadable (fixed), Clear button dark-on-dark (fixed), checkmark color (fixed), Restore/Forever buttons missing capsules (fixed), emoji ZWJ (accepted). |

| 32 | Mar 24 | P2 polish (3 fixes) | Codex: 2 HIGH (safety net too aggressive — kills live alarms, early return blocks displayed-notification fallback), 1 LOW (completed reminders hide secondary text — design choice). Gemini: All PASS. |
| 32b | Mar 24 | Notification actions + safety net fix | Codex: 3 HIGH (timer countdown not cancelled on dismiss, snooze flag not enforced, snooze notif ID not persisted), 1 MEDIUM (safety net async race — accepted), 2 LOW (redundant cleanup, unused imports). Gemini: All PASS with 1 LOW redundant stopAlarmSound. All HIGH findings fixed. |

| 34 | Mar 25 | CalendarWidget + calendar fixes | Codex: 1 HIGH (note sort UTC slice), 1 MEDIUM (floating back button overlap), 1 LOW (root widget missing clickAction). Gemini: 2 HIGH (widget deep-link doesn't drive month — useState stale, widget alarm loader no normalization), 1 MEDIUM (widget minHeight too small for 6-row months). All fixed. Re-audit: Codex all PASS. Gemini: 4 PASS, 1 partial (widget alarm normalization functionally equivalent but not identical to loadAlarms — accepted, daily behavior same). |
| 35 | Mar 25 | Tablet responsive (Onboarding + Sudoku) | Codex: 1 MEDIUM (Sudoku paused/won not width-capped). Fixed. Gemini: All PASS. |
| 36 | Mar 26 | Note image attachments (P2 2.1) | Self-audit during implementation. 1 HIGH (transaction order), 2 MEDIUM (duplicate keys, image-only notes blocked), 2 MEDIUM (print broken images), 1 LOW (thumbnail memory). All resolved. Emoji picker removed. |
| 37 | Mar 26 | Drawing canvas (P2 2.2) | 3 HIGH (drawing persistence — saveNoteImage .png extension + companion .json copy, performance — memoize parsedStrokes, loadDrawingData reads JPGs as text), 2 MEDIUM (image cache after edit — new filename cache bust, print/share MIME detection), 2 LOW (empty canvas save block, cancel confirmation). All resolved. |

### Audit 33 — March 25, 2026 (Codex + Gemini)
**Scope:** Foreground notification refactor, calendar feature, AlarmsTab extraction, NoteEditorModal extraction, UI polish (dark capsules, floating headers, BackButton)

**Findings:**
- HIGH: Daily recurring alarms/reminders (empty days array) missing from Calendar — recurring items with no days = daily, needed mapping to every day of month. Fixed.
- HIGH: Calendar create buttons navigated with initialDate but CreateAlarmScreen/CreateReminderScreen never consumed it. Fixed — CreateAlarm reads initialDate, sets one-time mode + date; CreateReminder reads initialDate, sets dueDate.
- HIGH: Floating header overlap on Settings (vertically stacked header exceeded 58px padding) and DailyRiddle (multi-line header with stats). Fixed — Settings made single-row, DailyRiddle stats moved into scrollable content.
- MEDIUM: Notes timezone bucketing used UTC slice (createdAt.slice(0,10)) instead of local date. Fixed — parses Date object, extracts local YYYY-MM-DD.
- LOW: New note unsaved changes detection only checked text, missed icon/color/font-only edits. Fixed — checks all fields against defaults.

**Passed:** Foreground notification refactor (both auditors), consumePendingAlarm cleanup, timer dismissal state management, refactor integrity (AlarmsTab + NoteEditorModal), calendar date mapping (after fix).

### Audit 36 — March 26, 2026 (Self-audit during implementation)
**Scope:** Note image attachments (P2 2.1) — full feature implementation + audit fixes

**Findings (all resolved inline):**
- HIGH: Transaction order — save flow copied images before saving note, risking orphaned files on failure. Fixed — copy images first, save note in inner try/catch, rollback newly copied files on failure. Removed images deleted only after updateNote succeeds.
- MEDIUM: Duplicate React keys — thumbnail `key={uri}` breaks if same image picked twice. Fixed — `key={\`${uri}-${idx}\`}`.
- MEDIUM: Image-only notes blocked — validation rejected empty text even with images. Fixed — allow save if text OR images present.
- MEDIUM: Print broken images — file:// URIs in HTML img tags blocked by Android WebView. Fixed — `buildNoteHtml` helper converts to base64 data URIs via `FileSystem.File.base64()`.
- LOW: Thumbnail memory — full-size bitmaps decoded for 80x80 thumbnails. Fixed — `resizeMethod="resize"` on Image components.
- LOW: Share logic — upgraded to "Share Text" + "Share Photos" (Sharing.shareAsync per image) when images present. Print always uses white background (#FFFFFF) with dark text (#1A1A2E) for ink efficiency.

**Also completed:** Removed dedicated emoji picker from NoteEditorModal (keyboard emoji sufficient). Iterative thumbnail styling (border, spacing, positioning, safe area insets).

### P2 2.2 — Notepad Drawing/Sketch Mode (March 26, 2026)

**Component:** `src/components/DrawingCanvas.tsx` — full-screen Skia canvas modal with PanResponder touch handling.

**Architecture:**
- Strokes stored as serializable `StrokeData` objects (`pathSvg` SVG string, `color`, `strokeWidth`) — no native SkPath objects in React state (avoids "Invalid prop value for SkPath" crash)
- SkPath objects memoized via `useMemo` keyed on strokes array — only rebuilt on stroke release/undo/clear, not during 60fps touch moves
- In-progress stroke tracked as `{x,y}[]` coordinate array in a ref, fresh SkPath built each render via `buildPathFromPoints`
- Canvas background rendered via `<Fill color={canvasBgColor}>` — captured in PNG snapshot

**Drawing tools (bottom toolbar):**
- Pen (default) — draws colored strokes with round caps/joins
- Eraser — draws in current background color (works on any background, not just white)
- Color palette — 8 preset colors + custom color via reanimated-color-picker
- Canvas background color — BG button opens separate color picker modal
- Stroke widths — XS(1), S(3 default), M(6), L(12)
- Undo — removes last completed stroke
- Clear — Alert confirmation, then clears all strokes
- Cancel — prompts "Discard Drawing?" if strokes exist
- Done — blocks empty canvas save with toast

**S Pen pressure:** `nativeEvent.force` sampled once per stroke on `onPanResponderGrant`. Formula: `baseWidth * pressure * 2`. Falls back to base width when force unavailable (finger input).

**Save flow:**
- `canvasRef.makeImageSnapshot()` → `encodeToBytes(ImageFormat.PNG)` → `File.write(bytes)`
- Companion JSON: `{ strokes: StrokeData[], bgColor: string }` saved alongside PNG (same basename, `.json` extension)
- File naming: `drawing_${Date.now()}_${uuid8}.png` + `.json`

**Edit flow:**
- `loadDrawingData(imageUri)` checks for companion `.json` — returns `{strokes, bgColor}` or null (photos)
- Thumbnail tap in NoteEditorModal shows View/Edit alert for drawings, direct lightbox for photos
- Editing generates new filename (cache bust for React Native Image), deletes old PNG + JSON
- `saveNoteImage` detects `.png` extension, copies companion `.json` alongside through the save pipeline

**Share modal:** Custom dark modal (`shareModalStyles`) replacing `Alert.alert` (Android 3-button limit workaround). Options: Share Text (always), Share Photos (when images, correct MIME per file), Share as PDF (`buildNoteHtml` → `Print.printToFileAsync` → `Sharing.shareAsync`), Print, Cancel.

**Print/share fixes:** `buildNoteHtml` detects `.png`/`.jpg` for correct MIME type (`image/png` vs `image/jpeg`) in base64 data URIs.

**Audit 37 findings (all resolved):**
- HIGH: Drawing persistence — `saveNoteImage` now detects .png extension, copies companion .json
- HIGH: Performance — `parsedStrokes` memoized via `useMemo`, eliminates per-frame `MakeFromSVGString`
- HIGH: `loadDrawingData` early-returns null for .jpg files (no reading multi-MB photos as text)
- MEDIUM: Image cache after edit — new filename on edit (cache bust), deletes old files, replaces URI in editorImages
- MEDIUM: Print/share — MIME type detection for .png vs .jpg in buildNoteHtml and share handlers
- LOW: Empty canvas save blocked with toast
- LOW: Cancel confirmation when strokes exist

### P2 2.3 — Custom Photo Background Underlay (March 27, 2026)

One user-selected photo shared across AlarmListScreen, NotepadScreen, CalendarScreen as a background underlay.

**Service:** `src/services/backgroundStorage.ts` — atomic save pattern (copy new file first, persist AsyncStorage key, then best-effort delete old file). Storage directory: `${Paths.document}backgrounds/`. Uses expo-file-system `File/Directory/Paths` API (same as noteImageStorage).

**AsyncStorage keys:** `bg_main` (file URI string), `bg_overlay_opacity` (number 0.3–0.8, default 0.5).

**Settings UI:** "Screen Background" section in SettingsScreen with:
- Photo picker (expo-image-picker, JPEG quality 0.7)
- Thumbnail preview of current background
- "Change Photo" button (checks saveBackground return for null/error)
- "Clear Background" button with Alert confirmation
- Opacity presets (30%–80%) as pill row

**Screen integration:** Conditional render pattern — when photo set: `ImageBackground` with photo + dark overlay at configured opacity. When not set: `fullscreenicon.png` watermark at 0.07 opacity. `onError` handler: `setBgUri(null)` if image fails to load (file deleted, corrupted).

### P2 2.4 — Per-Alarm Photo on Fire Screen (March 27, 2026)

Optional photo per alarm that displays as full-bleed background on AlarmFireScreen when the alarm fires.

**Type change:** `photoUri?: string | null` added to Alarm interface.

**Service:** `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto(alarmId, sourceUri)` copies to `${Paths.document}alarm-photos/` as `alarm_${alarmId}_${timestamp}.jpg`. `deleteAlarmPhoto(uri)` best-effort delete. `alarmPhotoExists(uri)` synchronous existence check.

**Deferred save pattern (useAlarmForm.ts):**
- `pickPhoto()` stores ImagePicker's temporary cache URI in state — NO file copy
- `clearPhoto()` clears state — NO file delete
- `originalPhotoRef` tracks existing alarm's photo URI, `photoChangedRef` tracks if photo was modified
- On save: if `photoChangedRef` is true, copies temp file to permanent storage via `saveAlarmPhoto`, then best-effort deletes old photo via `originalPhotoRef`
- On cancel/unmount: no file mutations — temp cache managed by OS
- Alarm ID pre-generated via `useState(() => existingAlarm?.id || uuidv4())` so photo filename uses correct ID

**CreateAlarmScreen:** "Wake-up Photo" section between note char count and Guess Why toggle:
- Empty: dashed-border placeholder (120px, camera emoji, "Tap to add photo")
- Set: full-width thumbnail (160px, cover), tap to change, X button with Alert confirmation to clear

**AlarmFireScreen:** Conditional `ImageBackground` source:
- `photoFailed` state for fallback. `hasAlarmPhoto = !isTimer && !!alarm?.photoUri && !photoFailed`
- Both return paths (main view + snooze shame) use `bgSource` with `onError` handler
- Dark overlay stays at 0.7 opacity for readability
- Timers always use lightbulb.png (no photo support)

**Photo cleanup:** `permanentlyDeleteAlarm` and `purgeDeletedAlarms` (30-day) delete photo files. Soft-delete keeps photo on disk.

**Edit form validation:** `alarmPhotoExists(uri)` check on init — if file gone, initializes photoUri as null (prevents broken preview).

### File Splits Completed (P2 Session)

- **NoteEditorModal.tsx** split into: `ShareNoteModal.tsx` (share/print modal), `ImageLightbox.tsx` (fullscreen image viewer), `noteColors.ts` (getTextColor utility)
- **CreateAlarmScreen/CreateReminderScreen:** extracted `DayPickerRow.tsx` component, `useAlarmForm.ts` hook (form state + photo + save logic), `useReminderForm.ts` hook
- **App.tsx:** extracted `useNotificationRouting.ts` hook (notification event handlers)

### Back Button Header Consistency (P2 Session)

All screens with back buttons unified to Notepad pattern: fixed header above scroll content, centered title, absolute `BackButton` at `left: 20, top: insets.top + 10`.

**Screens updated:** Settings, Calendar, About, MemoryScore, Games, DailyRiddle, ForgetLog, Trivia, MemoryMatch, Sudoku.

**Intentionally excluded:** In-game views (Trivia gameplay, MemoryMatch gameplay, Sudoku active play) — these have custom top bars with game-specific info (score, timer, streak).

### Bug Fixes (P2 Session)

**Timer/alarm dismiss clearing pending data:**
- `clearPendingAlarm()` added to ACTION_PRESS dismiss and snooze handlers in both `index.ts` and `useNotificationRouting.ts`
- DISMISSED handler now cleans up timers (previously only alarms)
- `consumePendingAlarm` checks `wasNotifHandled` before navigating

**One-time alarm toggle with past date:**
- `toggleAlarm` in storage.ts auto-updates date to today/tomorrow when re-enabling a one-time alarm whose date has passed
- Uses constructor-based date parsing (`new Date(y, mo - 1, d, h, m, 0, 0)`) to avoid engine-dependent string parsing
- Handles: restored-from-trash alarms, old alarms toggled back on, any lapsed one-time alarm

**Day picker mutual exclusivity:**
- Switching from recurring to one-time clears selected days
- Selecting a day updates the date field to next occurrence via `getNearestDayDate`

### New Files Added in Phase 2

| File | Purpose |
|------|---------|
| `src/services/backgroundStorage.ts` | Shared screen background photo storage |
| `src/services/alarmPhotoStorage.ts` | Per-alarm photo save/delete/exists |
| `src/components/ShareNoteModal.tsx` | Share/print note modal (split from NoteEditorModal) |
| `src/components/ImageLightbox.tsx` | Fullscreen image viewer (split from NoteEditorModal) |
| `src/components/DayPickerRow.tsx` | Day-of-week picker row (split from CreateAlarmScreen) |
| `src/utils/noteColors.ts` | getTextColor contrast utility (split from NotepadScreen) |
| `src/hooks/useAlarmForm.ts` | Alarm form state + deferred photo save |
| `src/hooks/useReminderForm.ts` | Reminder form state |
| `src/hooks/useNotificationRouting.ts` | Notification event handlers (split from App.tsx) |

### Dependencies (P2 2.3/2.4)

No new native dependencies — expo-image-picker and expo-file-system already installed from P2 2.1/2.2.

### Dependencies (P3)

- `expo-av` removed (was only used for chirp sound feedback)
- `expo-audio` added (chirp/UI sound feedback via createAudioPlayer)
- Voice clips use native AlarmChannelModule, NOT expo-audio (ALARM stream requirement)

**38 audits total.** Every ship preceded by at least one audit. v1.3.3 shipped without audit due to urgency (recurring alarm critical fix) — acknowledged as exception.

---

## 13. DESIGN DECISIONS

### Core Philosophy
- **"Always the better way, even if harder."** Simple and better is fine. Simple and worse is never acceptable. (Zerenn, emphatically)
- **"Don't ship dead features."** If it doesn't produce a meaningfully different experience, remove it. Applied to: alarm sound picker (6 channels all sounded identical), game sounds (haptic patterns indistinguishable), category system (redundant with icon picker), SwipeableRow (gesture conflicts).
- **"A potential problem is a problem."** (Zerenn)
- **Documentation is infrastructure, not a feature.** Feature freeze doesn't apply to docs.

### Privacy
- Private alarms = completely blank cards. No icon, no nickname, no lock icon. Indistinguishable from empty alarm. Lock icon screams "secret here." (Zerenn: "just leave it blank")
- Note is NEVER public — never in notifications, never on card if private
- Widgets show generic ⏰ and "Alarm" for private alarms

### Guess Why
- Per-alarm toggle (not global) — users shouldn't be surprised by a game they never asked for
- Nickname is valid clue — "no one wants to type the whole reason but a short nickname or icon is better" (Zerenn)
- Removed from reminders — dead code, reminders don't fire through AlarmFireScreen. Deferred to Phase 8.

### UI/UX
- Tap-to-edit on alarm/reminder cards (universal UX pattern). Pencil icon removed.
- Save button in header (only location visible regardless of keyboard/scroll). Three other positions failed.
- Cancel button removed (redundant with BackButton).
- Identical setup flow for alarms and reminders. "Learn it once."
- One-time as default alarm mode (most usage is one-time).
- Day-of-week circles always visible (useful in both modes).
- Calendar as subtle "📅 Today ▾" text row (scheduling weeks out is rare).
- Default alarm filter changed from 'active' to 'all' (users thought disabled alarms were deleted).
- Trivia controls fixed at bottom (always reachable regardless of scroll).
- Emojis from keyboard, not hardcoded grid (infinite set vs curated list).
- "Coming soon" text removed from disabled online toggle (made entire game look unfinished).
- Icon orders matter — reordered by frequency/importance. "The devil is in the details."
- Notification action buttons: "Dismiss" and "Snooze" directly on alarm notification banners. Timer notifications get "Dismiss" only (snooze on a timer is nonsensical). Solves the "COD problem" — users in online games can handle alerts without being pulled out of their app.
- Android renders notification action buttons left-aligned with OS-controlled spacing. Not customizable — text labels are what we control.

### Themes
- 6 distinct themes beats 8 similar ones. Each in different hue family.
- 60-30-10 accent reduction. Accent only on interactive elements.
- Note color as full background (not tint) — feels like real sticky note.
- True base font colors (#FF0000 real red, not off-base). "RED red." (Zerenn)

### Sound Architecture
- MediaPlayer with STREAM_ALARM over notification channel audio (stock Android pattern)
- CONTENT_TYPE_MUSIC over SONIFICATION (Samsung OEM may silence SONIFICATION)
- Append-only snooze ID storage (simpler than separate activeSnoozeId field)
- Timer notifications use alarm channel — "the timer is just as important" (Zerenn)

### Removed Features (With Reasons)
- **Alarm sound picker:** 6 channels all used `sound: 'default'`. Indistinguishable.
- **Game sounds:** Enhanced haptic patterns not distinct from regular haptics.
- **SwipeableRow:** Gesture conflicts with react-native-tab-view. Buttons more reliable.
- **expo-av for sound preview:** Failed silently in release builds. Replaced with Notifee.
- **Category system:** Redundant after icon picker added.
- **Compact widgets (TimerWidget, NotepadWidgetCompact):** Structurally identical to detailed after redesign. Both remaining widgets resizable.

### Responsive Layout

**TimePicker Responsive Design (v1.3.7)**
- Column width: responsive via useWindowDimensions, capped at 80px (3-col) / 90px (2-col)
- Font scaling: proportional via fontScale = colWidth / 90, applied to all getItemStyle sizes
- Row height: 96px universal (increased from original 56px to prevent scroll drift on lower density screens)
- Lesson learned: proportional scaling (continuous formula) beats breakpoints (conditional branching) for cross-device compatibility
- Samsung FE line has known React Native layout issues due to lower pixel density at similar dp width as flagships

### Day Chip / Calendar Date Mutual Exclusivity
- Tapping a day chip in one-time mode clears selectedDate (via clearDate callback)
- Both CreateAlarmScreen and CreateReminderScreen now have identical three-tier one-time scheduling: (1) selectedDate, (2) selectedDays single day calculation, (3) today/tomorrow fallback
- Same UI = same behavior = same logic across both screens

### v1.3.8 Bug Fixes (found via emulator testing matrix)

**Bug: NotepadScreen emoji crash (CRITICAL)**
- Found: Mar 22 via emulator testing
- Cause: `Intl.Segmenter` does not exist in Hermes. The emoji icon picker's `onChangeText` handler crashed with "Cannot read property 'prototype' of undefined" on every phone when selecting an emoji.
- Fix: Replaced `Intl.Segmenter` with spread syntax `[...t]`
- Known limitation: compound ZWJ emoji (flags, families) may save only the last code point — accepted as edge case for note icon picker
- Version: v1.3.8

**Bug: TriviaScreen category grid off-center (all devices)**
- Found: Mar 22 via emulator testing
- Cause: `categoryGrid` style had no `justifyContent`, defaulting to flex-start
- Fix: Added `justifyContent: 'center'`
- Version: v1.3.8

**Bug: TimerScreen intermittent preset layout**
- Found: Mar 22 via emulator testing
- Cause: `SCREEN_WIDTH` and `PRESET_CARD_WIDTH` calculated at module load time via static `Dimensions.get('window').width`. Same class of bug as the v1.3.7 TimePicker fix.
- Fix: Replaced with `useWindowDimensions()` hook inside the component
- Version: v1.3.8

**Bug: CreateReminderScreen dead sound picker removed**
- Found: Mar 22 during audit/testing
- Cause: Sound mode picker (silent/vibrate/sound) did nothing — reminders always use default notification sound
- Fix: Removed `soundMode` state, UI, styles, and unused imports. Save logic changed to `soundId: undefined` for new reminders, preserved existing `soundId` on edit (audit fix — prevents overwriting legacy silent/vibrate reminders)
- Version: v1.3.8

**Bug: Note card full background color**
- Found: Mar 22 via emulator testing
- Cause: Cards used theme card color with 4px stripe — didn't match NotepadWidget behavior (which already used note color as card background)
- Fix: Cards now use the note's chosen color as full background. Removed `cardStripe`. Auto-picks white or dark font via `getTextColor()` when user hasn't set a font color. Timestamp color adjusts for readability.
- Version: v1.3.8

**Bug: Capsule buttons (all screens)**
- Found: Mar 22 via emulator testing
- Cause: Delete and Pin buttons disappeared on colored backgrounds or matching themes
- Fix: All Delete and Pin buttons wrapped in dark gray capsule (`rgba(30,30,40,0.7)`) with subtle white border. Applied uniformly to NotepadScreen, AlarmCard, and ReminderScreen. Restore and Forever buttons on deleted notes also updated.
- Version: v1.3.8

**Bug: Reminder Done UX cleanup**
- Found: Mar 22 via emulator testing
- Cause: Redundant `renderDoneButton` and "Done" text button alongside circle checkbox
- Fix: Removed redundant done button. Circle checkbox on left is now the only done toggle. Checkbox turns green (#22C55E) when completed. White checkmark on green. Completed one-time reminders stay visible but faded (opacity 0.45) on active list until 12am the next day. Recurring reminders show green checkbox when completed today.
- Version: v1.3.8

### Process
- PrimeTestLab: provides install numbers, not real QA. All real bugs found by Zerenn and his buddy.
- Firebase over Azure for backend ($300 credits, simpler DX, Google ecosystem alignment).
- Pro tier ($1.99 one-time): "pay to add premium stuff" not "pay to remove annoyances." Free tier keeps everything permanently.
- Store screenshots: professional graphics created with ChatGPT image generation, composited with real app screenshots in Canva to avoid AI text reproduction errors. 8 images with personality-driven taglines matching app's sarcastic brand.
- Google Play App Information Request: standard vetting for new developer accounts. Requires SDK description, permission justifications, and video demo. Not a rejection — approval follows within days.

**Calendar as separate screen, not tab (Mar 25):** AlarmListScreen was already 1000+ lines with 3 tabs. Adding a 4th tab with all the calendar logic would push it past 1300 lines and create editing risk. Calendar nav card on main screen provides one-tap access with clean code separation.

**Floating headers limited to 3 screens (Mar 25):** Initially planned app-wide FloatingHeader component for all 15 screens with BackButton. Reverted after realizing only 3 screens (NoteEditorModal, SettingsScreen, DailyRiddleScreen) have content that actually scrolls past the header. Applied position: 'absolute' directly in those 3 screens instead. Avoids unnecessary visual noise (semi-transparent bar) on non-scrolling screens.

**Calendar is free, not Pro (Mar 25):** Calendar visualizes existing alarms/reminders/notes — it's the universal mental model for "what did I forget." Paywalling it would undermine the app's core "don't forget" promise. Pro tier reserved for enhancements (voice, photos, online features), not core functionality.

**Dark capsule button uniformity (Mar 25):** All tappable buttons use rgba(30,30,40,0.7) background with rgba(255,255,255,0.15) border. Ensures visibility on any background (light notes, dark notes, any theme). Applied to BackButton, NoteEditorModal toolbar, note card actions. Eliminates mixed styling where some buttons used translucent theme colors.

**Text color picker removed from roadmap (Mar 25):** The dark capsule pattern (semi-transparent dark backgrounds with white text/borders) solves readability on all backgrounds without user configuration. For future photo backgrounds (P2 Pro), dark overlays or frosted-glass strips behind text regions with automatic black/white text selection based on background luminance. More reliable, zero-config, preserves visual consistency. reanimated-color-picker stays installed for custom theme builder but is NOT used for a global text color setting.

**CalendarWidget as mini month grid, not agenda list (Mar 25):** Initial design was "Today's Agenda" list widget. Switched to mini calendar with dots because: (1) month-at-a-glance is more useful than duplicating DetailedWidget's item list, (2) dots answer "do I have anything on X day?" which is the core calendar question, (3) tapping any day deep-links to CalendarScreen for details. Widget can't navigate months (click-only interaction model) — always shows current month.

**Week view locked to current week (Mar 25):** Week view previously showed whatever week contained selectedDate. Changed to always show the current week because: "What's on my plate this week?" is the useful question. Browsing other weeks is what month view is for. Tapping a date outside current week while in week mode auto-switches to day view so it doesn't feel stuck.

**Floating back buttons — selective, not global (Mar 25):** Only applied to screens with scrollable content that hides the back button: CalendarScreen, SettingsScreen, DailyRiddleScreen, NoteEditorModal, MemoryScoreScreen. Not app-wide — screens without scrolling or with fixed headers don't need it. Back button only floats (compact dark pill), title stays in scroll flow. Started with full-width FloatingHeader component, reverted — direct styles on individual screens is simpler.

**Tablet responsive — scale, don't redesign (Mar 25):** Used responsive maxWidth constants (CONTENT_MAX_WIDTH) capped at 500-600px rather than redesigning layouts. Phone experience unchanged. Tablet gets wider content that still looks intentional. Applied to: Onboarding (maxWidth 500), Sudoku (grid 540, pad 600), MemoryMatch (content 500, grid 600), MemoryScore (floating back button).

---

## 14. ENVIRONMENT & SETUP KNOWLEDGE BASE

### Android & Native
- Samsung full-screen intent permission resets on fresh install (Play Store preserves it)
- Google Play pre-grants full-screen intent at install for declared alarm clock apps
- Notifee vibration patterns: even-length arrays, strictly positive values
- `cancelNotification` kills display + trigger. `cancelDisplayedNotification` kills display only.
- `getInitialNotification()` persists across process restarts — need persistent dedupe
- Android widgets: no position:absolute, no double-tap/long-press/swipe, no dialogs, headless JS only
- 180dp ≈ 3 cells on S23 Ultra
- Android full-screen intent only fires when screen is OFF or on lock screen. Screen ON = heads-up banner only (Android 10+). Not a bug.
- Dev builds and production builds have different signing keys (signature mismatch). Cannot install dev build over Play Store production build without uninstalling. Test on emulators for dev, phone gets updates through Play Store.
- expo-av removed (P3) — was only used for chirp. Replaced by expo-audio. Voice clips use native AlarmChannelModule.
- expo-clipboard is pure JS (no build needed)
- Native module changes require uninstall/reinstall (OTA doesn't replace native binaries)
- EAS build cache can use stale native code — use `--clear-cache`

### Google Play Console
- New accounts (post-2023): closed testing required (12 testers, 14 days) before production
- Two-step tester onboarding: Google Group membership + Play Store opt-in link
- versionCode consumed even on partial uploads
- Release notes require language tags: `<en-US>...</en-US>`
- Every closed testing upload goes through review (not instant)
- Don't modify store listing during review
- Deobfuscation file warning is standard for Expo/RN (non-blocking)

### WSL / Git
- WSL has separate git credentials from Windows. GitHub requires PAT.
- Set git identity manually in WSL or commits show as "zerenn@Zerenn.localdomain"
- CRLF vs LF: `git config --global core.autocrlf input`
- Switching branches can leave orphaned node_modules symlinks → delete and reinstall
- `git config --global pull.rebase true` — rebase as default pull strategy
- If `git pull` says "Aborting," immediately `git stash` then `git pull`

### Development
- `npx expo start --dev-client` (not plain `npx expo start`) — required since Feb 11
- Phone must be on WiFi for dev server (5G/carrier NAT can't reach local network)
- `--tunnel` flag works across networks but slower
- Dev and preview builds can't coexist on phone (same package name)
- ADB: `C:\platform-tools\platform-tools\adb.exe`. `adb logcat | findstr "Term"` for native debugging.
- Metro cache causes stale JS bundle → `npx expo start --dev-client --clear`
- react-native-worklets MUST stay at 0.5.1
- adb may not be in PATH. Full path: `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices`. Set permanent: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")`
- Download dev builds from expo.dev on phone browser to skip adb install
- JS-only changes don't require new builds — dev server hot-reloads. Only native dependency changes need new APK.

### EAS Build
- Starter plan: $19/month, ~$1/build. Credits reset on 12th.
- Can't queue new build while one running — must cancel first
- `npm ci` lock file sync: WSL package install → run `npm install` from PowerShell → commit package-lock.json
- Builds on Expo cloud — local specs don't affect build speed
- `development-emulator` profile in eas.json: `developmentClient: true`, `distribution: "internal"`, `buildType: "apk"`, env `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64`. Used for emulator-only dev builds (x86_64 arch, separate from ARM physical device builds).

---

## 15. WORKFLOW RULES

### Build & Deploy
1. Increment versionCode before every production build
2. Batch native-dependency changes into one build
3. Widgets require native build for JS changes
4. `--clear` for new assets: `npx expo start --dev-client --clear`
5. `npx tsc --noEmit` before any production build
6. Don't build until audit findings fixed
7. Dev for iteration, preview for verification, production for store
8. Native module changes → uninstall/reinstall required. Communicate in release notes with data loss warning.

### Git & Machines
9. Verify branch before every prompt: `git branch`
10. `git pull` when switching machines. Push first, then pull on other machine.
11. PowerShell: one command at a time, no `&&`
12. `npm install` from PowerShell after WSL package installs
13. `npm install react-native-worklets@0.5.1` after Claude Code touches deps
14. Don't run git in PowerShell while Claude Code works in WSL

### Prompts & Audits
15. Surgical edits for fixes, full replacements for features
16. Prompts in code blocks, one at a time. "think hard" for complex ones.
17. READ-ONLY warning at TOP and BOTTOM of audit prompts
18. Same depth for Codex and Gemini — Gemini still "REPORT ONLY"
19. Never nest code blocks inside code blocks
20. Be explicit about what NOT to render
21. Break large prompts into 3-4 items max
22. Confirm design scope before writing prompts
23. Verification audit after applying fixes
24. Revert prompts must be specific (not "revert the last prompt")

### Testing & Quality
25. Test on real device before auditing
26. Cache clear before code investigation when notifications regress
27. Feature freeze during testing windows
28. Ideas go in a list first — discuss before building
29. Expect 2-3 failures when positioning UI elements — document what failed
30. ADB for native debugging when JS logs don't explain behavior
31. Phone a friend — when stuck, send files to auditors instead of burning builds

### Branch Management
32. testing-setup: merge main INTO it only, never reverse
33. Do branch reconciliation entirely in WSL, not separate PowerShell window

### Content & Brand
34. Personality touches matter — the brand is "apps that talk back"
35. Trivia questions must be accuracy-reviewed by ChatGPT and Gemini
36. AI-generated images are commercially free (Gemini and DALL-E)
37. "We" language in all user-facing text (studio identity)

---

## 16. POST-LAUNCH ROADMAP

**Phase 1 — Housekeeping: ✅ COMPLETE**
- [x] 1.1 Extract shared utility functions (soundModeUtils, useCalendar, useDaySelection)
  - useCalendar hook accepts initialDate and onSelectDate callback parameters
- [x] 1.2 Reconcile testing-setup branch (222/222 tests passing)
- [x] 1.3 Rename refreshTimerWidget → refreshWidgets (14 files)
- [x] 1.4 Timer storage race condition (async mutex)

**Phase 2 — Note Enhancements + Custom Backgrounds** (Build: expo-image-picker + @shopify/react-native-skia)
- [x] 2.0a Note card borders — contrast-based, visible on all themes (v1.3.9)
- [x] 2.0b Reminder two-line layout — nickname primary, reason-why secondary (v1.3.9)
- [x] 2.0c AlarmFireScreen dismiss flash fix (v1.3.9)
- [x] 2.0d Notification action buttons — Dismiss/Snooze on alarms, Dismiss on timers (v1.3.9)
- [x] 2.0e Safety net for stale AlarmFire screen (v1.3.9)
- [x] 2.0f Calendar feature — month view with dot indicators, Day/Week/Month tabs, type filters, create buttons with date prefill (v1.5.0)
- [x] 2.0g AlarmListScreen split — AlarmsTab extraction (v1.5.0)
- [x] 2.0h NotepadScreen split — NoteEditorModal extraction (v1.5.0)
- [x] 2.0i UI polish — dark capsule buttons, floating headers (editor/settings/riddle), BackButton visibility (v1.5.0)
- [x] 2.1 Note image attachments (gallery photos, max 3, thumbnails, lightbox, share/print, transactional save)
- [x] 2.2 Notepad drawing/sketch mode (Skia canvas, pen/eraser/undo/clear, custom colors, BG color, editable drawings, S Pen pressure, share modal with PDF)
- [x] 2.3 Custom photo background underlay on main screens (backgroundStorage.ts, Settings photo picker, opacity presets)
- [x] 2.4 Per-alarm photo on fire screen (alarmPhotoStorage.ts, deferred save pattern, conditional ImageBackground)
- ~~2.5 App text color picker in Settings~~ — REMOVED (readability solved by dark capsule pattern + auto-contrast overlays)
- [x] 2.6 Tablet responsive pass (Onboarding, Sudoku, MemoryMatch, MemoryScore)
- [x] 2.7 Calendar widget (CalendarWidget — mini month grid with colored dot indicators)

**Phase 3 — Voice Roasts** ✅ COMPLETE (March 29, 2026)
- 63 voice clips across 10 categories, native ALARM stream playback via AlarmChannelModule
- expo-av removed, expo-audio added for chirp. Voice clips use native module, not expo-audio.
- [x] 3.1 Alarm fire voice lines
- [x] 3.2 Snooze shame voice escalation (tier-matched, 4 tiers)
- [x] 3.3 Timer voice lines
- [x] 3.4 Guess Why voice lines (before/correct/wrong)
- [x] 3.5 Intro line (first alarm only, one-time)
- [x] 3.6 Settings toggle (voice on/off + dismiss voice on/off)
- [x] 3.7 Native ALARM stream playback (AlarmChannelModule)

**Phase 4 — New Games** (No Build — pure JS)
- 4.1 Chess vs CPU (chess.js)
- 4.2 Checkers vs CPU

**Phase 5 — Google Calendar Sync** (Build: expo-auth-session + deps)

**Phase 6 — Memory Score Expansion** (Update scoring for 7 games)

**Phase 7 — Online & Social** (Firebase $300 credit — Firestore + Cloud Functions + Auth)
- Online trivia, online riddles, multiplayer, leaderboards

**Phase 8 — Monetization & Platform**
- 8.1 Pro tier ($1.99 one-time unlock)
- 8.2 Edge-to-edge (Android 15)
- 8.3 Orientation restrictions (Android 16)
- 8.4 iOS port
- 8.5 Reminder-fire flow with Guess Why support

**Deferred — Expo SDK 55 Upgrade (after P3)**
- expo-av already removed in P3 → expo-audio in place (no migration needed for SDK 55)
- New Architecture mandatory → verify react-native-worklets 0.5.1 compatibility
- Verify Notifee New Architecture support
- expo-clipboard content property removed → use getStringAsync()
- Edge-to-edge resolved automatically (fixes current Play Store warning)
- React Native 0.83 + React 19.2 included
- Expo recommends: enable New Arch on SDK 54 first to isolate bugs before upgrading

**Roadmap Tracking**
- `ROADMAP.md` in repo root — living roadmap, source of truth
- `DFW-Roadmap.html` — standalone interactive HTML tracker (localStorage, runs locally in Chrome)
- Google Drive copy — backup for cross-session Opus access
- Claude Code prompts include ROADMAP.md updates alongside code changes

**Standalone HTML Tools (localStorage + JSON save/load for cross-machine sync):**
- `DFW-Roadmap-v2.html` — interactive roadmap with phase tracking, feature ideas backlog, changelog, Pro vs Free breakdown. Tasks can be added to any phase. Save/Load JSON for transfer between machines.
- `DFW-Testing-Checklist.html` — 10 sections, 75 test cases across 6 device profiles (450 total checkboxes). Filter by status or device. Export text report. Save/Load JSON.

---

## 17. STORE LISTING

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

## 18. IMAGE ASSETS

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

## 19. FILE TRANSFER SCRIPT

PowerShell script for copying all project files flat into `C:\Users\baldy\OneDrive\Desktop\DFW\DFWFiles` for project knowledge uploads (82 files):

```powershell
$dest = "C:\Users\baldy\OneDrive\Desktop\DFW\DFWFiles"
$root = "C:\DontForgetWhy"

New-Item -ItemType Directory -Force -Path $dest
Remove-Item "$dest\*" -Force -ErrorAction SilentlyContinue

# Root files (6)
Copy-Item "$root\app.json" "$dest\app.json"
Copy-Item "$root\package.json" "$dest\package.json"
Copy-Item "$root\index.ts" "$dest\index.ts"
Copy-Item "$root\App.tsx" "$dest\App.tsx"
Copy-Item "$root\DFW-Complete-Technical-Handoff.md" "$dest\DFW-Complete-Technical-Handoff.md"
Copy-Item "$root\ROADMAP.md" "$dest\ROADMAP.md"

# Components (6)
Copy-Item "$root\src\components\AlarmCard.tsx" "$dest\AlarmCard.tsx"
Copy-Item "$root\src\components\BackButton.tsx" "$dest\BackButton.tsx"
Copy-Item "$root\src\components\ErrorBoundary.tsx" "$dest\ErrorBoundary.tsx"
Copy-Item "$root\src\components\SoundPickerModal.tsx" "$dest\SoundPickerModal.tsx"
Copy-Item "$root\src\components\TimePicker.tsx" "$dest\TimePicker.tsx"
Copy-Item "$root\src\components\UndoToast.tsx" "$dest\UndoToast.tsx"

# Data (11)
Copy-Item "$root\src\data\alarmSounds.ts" "$dest\alarmSounds.ts"
Copy-Item "$root\src\data\appOpenQuotes.ts" "$dest\appOpenQuotes.ts"
Copy-Item "$root\src\data\guessWhyIcons.ts" "$dest\guessWhyIcons.ts"
Copy-Item "$root\src\data\guessWhyMessages.ts" "$dest\guessWhyMessages.ts"
Copy-Item "$root\src\data\memoryRanks.ts" "$dest\memoryRanks.ts"
Copy-Item "$root\src\data\placeholders.ts" "$dest\placeholders.ts"
Copy-Item "$root\src\data\reminderQuotes.ts" "$dest\reminderQuotes.ts"
Copy-Item "$root\src\data\riddles.ts" "$dest\riddles.ts"
Copy-Item "$root\src\data\snoozeMessages.ts" "$dest\snoozeMessages.ts"
Copy-Item "$root\src\data\timerPresets.ts" "$dest\timerPresets.ts"
Copy-Item "$root\src\data\triviaQuestions.ts" "$dest\triviaQuestions.ts"

# Hooks (2)
Copy-Item "$root\src\hooks\useCalendar.ts" "$dest\useCalendar.ts"
Copy-Item "$root\src\hooks\useDaySelection.ts" "$dest\useDaySelection.ts"

# Navigation (1 — renamed to avoid collision)
Copy-Item "$root\src\navigation\types.ts" "$dest\navTypes.ts"

# Screens (18)
Copy-Item "$root\src\screens\AboutScreen.tsx" "$dest\AboutScreen.tsx"
Copy-Item "$root\src\screens\AlarmFireScreen.tsx" "$dest\AlarmFireScreen.tsx"
Copy-Item "$root\src\screens\AlarmListScreen.tsx" "$dest\AlarmListScreen.tsx"
Copy-Item "$root\src\screens\CreateAlarmScreen.tsx" "$dest\CreateAlarmScreen.tsx"
Copy-Item "$root\src\screens\CreateReminderScreen.tsx" "$dest\CreateReminderScreen.tsx"
Copy-Item "$root\src\screens\DailyRiddleScreen.tsx" "$dest\DailyRiddleScreen.tsx"
Copy-Item "$root\src\screens\ForgetLogScreen.tsx" "$dest\ForgetLogScreen.tsx"
Copy-Item "$root\src\screens\GamesScreen.tsx" "$dest\GamesScreen.tsx"
Copy-Item "$root\src\screens\GuessWhyScreen.tsx" "$dest\GuessWhyScreen.tsx"
Copy-Item "$root\src\screens\MemoryMatchScreen.tsx" "$dest\MemoryMatchScreen.tsx"
Copy-Item "$root\src\screens\MemoryScoreScreen.tsx" "$dest\MemoryScoreScreen.tsx"
Copy-Item "$root\src\screens\NotepadScreen.tsx" "$dest\NotepadScreen.tsx"
Copy-Item "$root\src\screens\OnboardingScreen.tsx" "$dest\OnboardingScreen.tsx"
Copy-Item "$root\src\screens\ReminderScreen.tsx" "$dest\ReminderScreen.tsx"
Copy-Item "$root\src\screens\SettingsScreen.tsx" "$dest\SettingsScreen.tsx"
Copy-Item "$root\src\screens\SudokuScreen.tsx" "$dest\SudokuScreen.tsx"
Copy-Item "$root\src\screens\TimerScreen.tsx" "$dest\TimerScreen.tsx"
Copy-Item "$root\src\screens\TriviaScreen.tsx" "$dest\TriviaScreen.tsx"

# Services (16)
Copy-Item "$root\src\services\alarmSound.ts" "$dest\alarmSound.ts"
Copy-Item "$root\src\services\forgetLog.ts" "$dest\forgetLog.ts"
Copy-Item "$root\src\services\guessWhyStats.ts" "$dest\guessWhyStats.ts"
Copy-Item "$root\src\services\memoryScore.ts" "$dest\memoryScore.ts"
Copy-Item "$root\src\services\noteStorage.ts" "$dest\noteStorage.ts"
Copy-Item "$root\src\services\notifications.ts" "$dest\notifications.ts"
Copy-Item "$root\src\services\pendingAlarm.ts" "$dest\pendingAlarm.ts"
Copy-Item "$root\src\services\quotes.ts" "$dest\quotes.ts"
Copy-Item "$root\src\services\reminderStorage.ts" "$dest\reminderStorage.ts"
Copy-Item "$root\src\services\riddleOnline.ts" "$dest\riddleOnline.ts"
Copy-Item "$root\src\services\settings.ts" "$dest\settings.ts"
Copy-Item "$root\src\services\storage.ts" "$dest\storage.ts"
Copy-Item "$root\src\services\timerStorage.ts" "$dest\timerStorage.ts"
Copy-Item "$root\src\services\triviaAI.ts" "$dest\triviaAI.ts"
Copy-Item "$root\src\services\triviaStorage.ts" "$dest\triviaStorage.ts"
Copy-Item "$root\src\services\widgetPins.ts" "$dest\widgetPins.ts"

# Theme (2)
Copy-Item "$root\src\theme\colors.ts" "$dest\colors.ts"
Copy-Item "$root\src\theme\ThemeContext.tsx" "$dest\ThemeContext.tsx"

# Types (5)
Copy-Item "$root\src\types\alarm.ts" "$dest\alarm.ts"
Copy-Item "$root\src\types\note.ts" "$dest\note.ts"
Copy-Item "$root\src\types\reminder.ts" "$dest\reminder.ts"
Copy-Item "$root\src\types\timer.ts" "$dest\timer.ts"
Copy-Item "$root\src\types\trivia.ts" "$dest\trivia.ts"

# Utils (7)
Copy-Item "$root\src\utils\connectivity.ts" "$dest\connectivity.ts"
Copy-Item "$root\src\utils\fullScreenPermission.ts" "$dest\fullScreenPermission.ts"
Copy-Item "$root\src\utils\haptics.ts" "$dest\haptics.ts"
Copy-Item "$root\src\utils\soundFeedback.ts" "$dest\soundFeedback.ts"
Copy-Item "$root\src\utils\soundModeUtils.ts" "$dest\soundModeUtils.ts"
Copy-Item "$root\src\utils\sudoku.ts" "$dest\sudoku.ts"
Copy-Item "$root\src\utils\time.ts" "$dest\time.ts"

# Widget (4)
Copy-Item "$root\src\widget\DetailedWidget.tsx" "$dest\DetailedWidget.tsx"
Copy-Item "$root\src\widget\NotepadWidget.tsx" "$dest\NotepadWidget.tsx"
Copy-Item "$root\src\widget\updateWidget.ts" "$dest\updateWidget.ts"
Copy-Item "$root\src\widget\widgetTaskHandler.ts" "$dest\widgetTaskHandler.ts"
```

---

## 20. TESTING STATUS (As of March 24, 2026)

| Item | Value |
|------|-------|
| Current version | v1.6.1 (versionCode 20) |
| Production status | v1.6.1 live on Google Play |
| Install count | 48+ |
| Phase 1 housekeeping | ✅ COMPLETE |
| Phase 2 polish | 5/11 items complete (v1.3.9) |
| Audit status | Audit 33 complete, all findings resolved |
| Jest tests | 222 passing on testing-setup branch |
| EAS build credits | ~34 remaining (reset April 12) |

### P2 Polish Status
- ✅ Note card borders (v1.3.9)
- ✅ Reminder two-line layout (v1.3.9)
- ✅ AlarmFireScreen dismiss flash (v1.3.9)
- ✅ Notification action buttons (v1.3.9)
- ✅ Safety net for stale AlarmFire (v1.3.9)
- **Remaining:** Tablet responsive pass (Onboarding, Sudoku, Trivia), photos, drawing, backgrounds, text color picker

### Git Branches
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production. v1.3.9. | Active, clean |
| `dev` | P2 feature work. Merged from main after v1.3.9. | Active — all new work goes here |
| `testing-setup` | Jest suite (222 tests). | Reconciled with main (Phase 1.2) |

---

## 21. KEY COMMANDS

```powershell
# Dev server
npx expo start --dev-client --clear

# Builds
npx eas build --profile development --platform android
npx eas build --profile production --platform android

# Git
git pull
git add -A
git commit -m "message"
git push
git branch

# TypeScript check
npx tsc --noEmit

# Tests (on testing-setup branch)
git checkout testing-setup
npm test
git checkout main

# ADB
cd C:\platform-tools\platform-tools
.\adb.exe logcat | findstr "SearchTerm"
```
