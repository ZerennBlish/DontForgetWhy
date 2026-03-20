# Don't Forget Why — Complete Technical Handoff
## Compiled: March 19, 2026
## Covers: February 8 – March 19, 2026 (entire project history)

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
- Samsung Galaxy S23 Ultra, dev build + closed testing build installed

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
└── src/
    ├── components/
    │   ├── AlarmCard.tsx
    │   ├── BackButton.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── SoundPickerModal.tsx
    │   ├── TimePicker.tsx
    │   └── UndoToast.tsx
    ├── data/
    │   ├── alarmSounds.ts
    │   ├── appOpenQuotes.ts
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
    │   ├── useCalendar.ts          # accepts initialDate + onSelectDate callback
    │   └── useDaySelection.ts
    ├── navigation/
    │   └── types.ts                # navigation param types
    ├── screens/
    │   ├── AboutScreen.tsx
    │   ├── AlarmFireScreen.tsx
    │   ├── AlarmListScreen.tsx
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
    │   ├── alarmSound.ts
    │   ├── forgetLog.ts
    │   ├── guessWhyStats.ts
    │   ├── memoryScore.ts
    │   ├── noteStorage.ts
    │   ├── notifications.ts
    │   ├── pendingAlarm.ts
    │   ├── quotes.ts
    │   ├── reminderStorage.ts
    │   ├── riddleOnline.ts
    │   ├── settings.ts
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
    │   ├── soundFeedback.ts
    │   ├── soundModeUtils.ts
    │   ├── sudoku.ts
    │   └── time.ts                 # utils are pure/side-effect free
    └── widget/
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

---

## 6. APP FEATURES — CURRENT STATE

### Core Utility
- **Alarms** — reason field ("why"), 7 sound presets + custom system sounds, snooze (1/3/5/10/15 min), recurring (daily/weekly/monthly/yearly) + one-time, emoji icon from keyboard, per-alarm Guess Why toggle, private mode (completely blank card)
- **Reminders** — due dates, 5 recurring patterns (daily/weekly/monthly/yearly/one-time), 6-hour completion window, date-only mode, completion history, sound mode (sound/vibrate/silent), emoji icon
- **Timers** — 19+ presets + saveable custom timers with name/emoji, recently used (max 3) one-tap quick start, sound mode per timer, pinnable to widget, Timer Sound capsule
- **Notepad** — 500-char notes, 10 bg colors + custom, font color presets + custom (reanimated-color-picker), keyboard emoji picker, hyperlinks (email/phone/URL), view mode with tappable links, share + print, soft delete with undo, pin to widget (max 4)
- **DND bypass** — Notifee full-screen intent + Samsung onboarding
- **Full-screen alarm fire** — lightbulb background, snooze shame (4 tiers × 7 messages), shows 🔇 when silenced
- **Native MediaPlayer sound** — plays through STREAM_ALARM regardless of ringer mode. Notification channels are SILENT. MediaPlayer handles all audio.

### Guess Why System (Per-Alarm)
- Per-alarm toggle on CreateAlarmScreen (between note and Private)
- Eligibility: requires nickname OR note ≥ 3 chars OR icon
- Runtime: AlarmFireScreen checks `alarm.guessWhy`, validates clue exists
- Pre-game: icon and note hidden until game played. Nickname always visible.
- Not on reminders — reminders don't fire through AlarmFireScreen

### Sound Mode System
- Single cycling icon: 🔔 Sound → 📳 Vibrate → 🔇 Silent
- Sound chirp via expo-av on Sound transition (with `Audio.setAudioModeAsync` for reliability)
- Global Silence All in Settings with duration picker
- Two-layer enforcement: schedule-time channel swap + fire-time MediaPlayer skip

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
- Main tabs: app icon watermark at 0.07 opacity

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
  soundName?: string | null; soundID?: number | null; deletedAt?: string | null;
}
```

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
}
```

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
`'alarms'`, `'reminders'`, `'activeTimers'`, `'notes'`, `'userTimers'`, `'appSettings'`, `'silenceAllAlarms'`, `'appTheme'`, `'customTheme'`, `'hapticsEnabled'`, `'onboardingComplete'`, `'defaultTimerSound'`, plus game stats (guessWhyStats, forgetLog, memoryMatchScores, sudokuBestScores, dailyRiddleStats, triviaStats), widget pins (widgetPinnedPresets, widgetPinnedAlarms, widgetPinnedReminders, widgetPinnedNotes), per-alarm (`snoozeCount_{alarmId}`, `snoozing_{alarmId}`), pending actions (pendingTabAction, pendingAlarmAction, pendingReminderAction, pendingNoteAction), notification dedupe (`_handledNotifs` in-memory + `handled_notifs` persistent in AsyncStorage)

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

### Key Distinctions
- `cancelNotification(id)` — kills display AND recurring trigger
- `cancelDisplayedNotification(id)` — kills display only, trigger survives (used for recurring alarms)
- `snoozing_{alarmId}` AsyncStorage flag — prevents DISMISSED handler from deleting one-time alarms during snooze
- Persistent notification dedupe via AsyncStorage for cold-start `getInitialNotification()` path (module-level Map doesn't survive process death)

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
Feb 12: TimerWidget (compact) + DetailedWidget. Mar 6: NotepadWidget + NotepadWidgetCompact added. Mar 12: Trimmed to 2 — DetailedWidget redesigned, compacts deleted.

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

**29 audits total.** Every ship preceded by at least one audit. v1.3.3 shipped without audit due to urgency (recurring alarm critical fix) — acknowledged as exception.

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

### Process
- PrimeTestLab: provides install numbers, not real QA. All real bugs found by Zerenn and his buddy.
- Firebase over Azure for backend ($300 credits, simpler DX, Google ecosystem alignment).
- Pro tier ($1.99 one-time): "pay to add premium stuff" not "pay to remove annoyances." Free tier keeps everything permanently.

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
- expo-av can't play `content://` URIs — needs bundled `require()` assets
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

### EAS Build
- Starter plan: $19/month, ~$1/build. Credits reset on 12th.
- Can't queue new build while one running — must cancel first
- `npm ci` lock file sync: WSL package install → run `npm install` from PowerShell → commit package-lock.json
- Builds on Expo cloud — local specs don't affect build speed

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
- 2.1 Note image attachments
- 2.2 Notepad drawing/sketch mode (Skia, S Pen pressure + finger)
- 2.3 Custom photo background underlay on main screens
- 2.4 Full-bleed per-alarm photo on Alarm Fire screen with photo-aware roasts
- 2.5 App text color picker in Settings (global readability solution)

**Phase 3 — Voice Roasts** (ElevenLabs pre-recorded, bundled via expo-av)
- 3.1 Alarm fire voice lines
- 3.2 Snooze shame voice escalation (tier-matched)
- 3.3 Wake-up greeting ("Hey you")

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

**Roadmap Tracking**
- `ROADMAP.md` in repo root — living roadmap, source of truth
- `DFW-Roadmap.html` — standalone interactive HTML tracker (localStorage, runs locally in Chrome)
- Google Drive copy — backup for cross-session Opus access
- Claude Code prompts include ROADMAP.md updates alongside code changes

---

## 17. STORE LISTING

| Field | Value |
|-------|-------|
| App name | Don't Forget Why |
| Category | Productivity |
| Short description | "Set alarms. Forget why. Get roasted. A memory app with attitude." |
| Full description | Feature overview + "Built by Bald Guy & Company Games" |
| App icon | Clock icon, 512×512 |
| Feature graphic | 1024×500, clock + lightbulb + neon elements, Midnight palette |
| Screenshots | 8 images, Midnight theme, device mockups, benefit-driven captions |
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

## 20. TESTING STATUS (As of March 19, 2026)

| Item | Value |
|------|-------|
| Latest version shipping | v1.3.5 (versionCode 12) |
| Install count | 48 (12 minimum — 4x exceeded) |
| 14-day window | Started ~March 6, ends ~March 20 |
| Updates during window | 6 (v1.3.0 through v1.3.5) |
| Phase 1 housekeeping | ✅ COMPLETE |
| Jest tests | 222 passing on testing-setup branch |
| EAS build credits | ~43 remaining |
| Next step | Apply for production access when window ends |
| Estimated production unlock | ~March 27 |

### Git Branches
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production. All current work. | Active, clean |
| `dev` | Post-launch features only. | Untouched — do not touch until production approved |
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
