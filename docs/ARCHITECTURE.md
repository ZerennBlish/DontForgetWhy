# Architecture

> Living reference for Don't Forget Why. Updated Feb 2026. Only documents what exists in code.

## Project Overview

**Don't Forget Why** is a React Native alarm/reminder app that tests memory by asking users to recall why they set an alarm. Built around brain games (Guess Why, Memory Match, Sudoku, Trivia, Daily Riddles) with a composite memory score.

| Key | Value |
|-----|-------|
| Framework | React Native 0.81.5 + Expo 54 |
| Language | TypeScript (strict mode) |
| Target | Android-first (no iOS-specific code) |
| Package | `com.zerennblish.DontForgetWhy` |
| Notifications | `@notifee/react-native` ^9.1.8 |
| Navigation | `@react-navigation/native-stack` |
| Persistence | `@react-native-async-storage/async-storage` |
| Widgets | `react-native-android-widget` ^0.20.1 |
| Haptics | `expo-haptics` |

---

## File Tree

```
DontForgetWhy/
├── App.tsx                          Root component: init, foreground events, navigation
├── index.ts                         Entry point: background events, widget handler registration
├── app.json                         Expo config: permissions, plugins, widgets
├── package.json                     Dependencies and scripts
├── tsconfig.json                    TypeScript config (strict, extends expo base)
├── eas.json                         EAS Build profiles (dev/preview/production)
├── assets/
│   └── lightbulb.png                AlarmFireScreen background image
├── docs/
│   ├── ARCHITECTURE.md              This file
│   ├── DATA_MODELS.md               Types, storage keys, channels, constants
│   ├── NOTIFICATIONS.md             Complete notification lifecycle reference
│   ├── CHANGELOG.md                 Version history
│   ├── AUDIT_HISTORY.md             Bug audit log
│   ├── index.html                   Docs landing page
│   └── privacy-policy.html          Privacy policy
├── plugins/
│   ├── withAlarmChannel.js          Native alarm channels + MediaPlayer sound bridge
│   ├── withAlarmWake.js             Lock screen wake + keyguard dismiss
│   └── withNotifee.js               Notifee permissions + manifest attributes
└── src/
    ├── components/
    │   ├── AlarmCard.tsx             Alarm list item: time, schedule, icon, controls
    │   ├── ErrorBoundary.tsx         React error boundary with fallback UI
    │   ├── SoundPickerModal.tsx      System sound browser + preview playback
    │   └── UndoToast.tsx             Bottom toast with undo/dismiss (3-4s auto-dismiss)
    ├── data/
    │   ├── alarmSounds.ts           6 preset alarm sounds (maps id → channelId)
    │   ├── appOpenQuotes.ts         64 sarcastic quotes shown on app open
    │   ├── guessWhyIcons.ts         45 emoji icons grouped by category
    │   ├── guessWhyMessages.ts      Win/lose/skip/prompt message arrays
    │   ├── memoryRanks.ts           9-tier rank system (0-100 score → title + emoji)
    │   ├── placeholders.ts          29 placeholder texts for alarm note input
    │   ├── reminderQuotes.ts        16 quotes for reminder screen
    │   ├── riddles.ts               145 riddles across 5 categories, 3 difficulties
    │   ├── snoozeMessages.ts        4-tier escalating snooze shame messages
    │   ├── timerPresets.ts          48 timer presets (pizza, laundry, nap, etc.)
    │   └── triviaQuestions.ts       320 trivia questions across 10 categories
    ├── navigation/
    │   └── types.ts                 RootStackParamList: 15 screen param definitions
    ├── screens/
    │   ├── AboutScreen.tsx          App info and credits
    │   ├── AlarmFireScreen.tsx      Full-screen alarm UI: dismiss, snooze, guess why
    │   ├── AlarmListScreen.tsx      Main screen: 3 tabs (alarms, timers, reminders)
    │   ├── CreateAlarmScreen.tsx    Alarm editor: time, schedule, note, icon, sound
    │   ├── CreateReminderScreen.tsx Reminder editor: recurring, weekly, yearly
    │   ├── DailyRiddleScreen.tsx    Daily riddle game with streak tracking
    │   ├── ForgetLogScreen.tsx      History of failed/skipped Guess Why attempts
    │   ├── GamesScreen.tsx          Game hub: cards for each brain game
    │   ├── GuessWhyScreen.tsx       Guess Why game: icon grid or text input
    │   ├── MemoryMatchScreen.tsx    Card matching game (easy/medium/hard)
    │   ├── MemoryScoreScreen.tsx    Composite score across all 5 games
    │   ├── OnboardingScreen.tsx     Permission setup flow (6 permission slides)
    │   ├── ReminderScreen.tsx       Reminder list with completion tracking
    │   ├── SettingsScreen.tsx       Settings: time format, haptics, theme, sounds
    │   ├── SudokuScreen.tsx         Sudoku game (easy/medium/hard)
    │   ├── TimerScreen.tsx          Timer with preset grid and active timer list
    │   └── TriviaScreen.tsx         Trivia rounds with 10 categories
    ├── services/
    │   ├── alarmSound.ts            Native MediaPlayer bridge (play/stop via AlarmChannelModule)
    │   ├── forgetLog.ts             Forget log CRUD (AsyncStorage: 'forgetLog')
    │   ├── guessWhyStats.ts         Guess Why stats: wins/losses/skips/streak
    │   ├── memoryScore.ts           Composite score calculation (5 games × 20 pts)
    │   ├── notifications.ts         All notification scheduling, channels, cancellation
    │   ├── pendingAlarm.ts          Module-level data bridge + notification dedupe
    │   ├── quotes.ts                12 motivational quotes for alarms
    │   ├── reminderStorage.ts       Reminder CRUD with completion cycles
    │   ├── riddleOnline.ts          Online riddle API fetching
    │   ├── settings.ts              App settings, onboarding flag, default timer sound
    │   ├── storage.ts               Alarm CRUD with migration logic
    │   ├── timerStorage.ts          Timer presets, active timers, recent usage
    │   ├── triviaAI.ts              OpenTDB trivia fetching + HTML entity decoding
    │   ├── triviaStorage.ts         Trivia stats + seen question tracking
    │   └── widgetPins.ts            Widget pin management (presets, alarms, reminders)
    ├── theme/
    │   ├── ThemeContext.tsx          React context: load/save theme, useTheme hook
    │   └── colors.ts                8 preset themes + custom theme generator
    ├── types/
    │   ├── alarm.ts                 Alarm, AlarmDay, AlarmCategory interfaces
    │   ├── reminder.ts              Reminder, CompletionEntry interfaces
    │   ├── timer.ts                 TimerPreset, ActiveTimer interfaces
    │   └── trivia.ts                TriviaQuestion, TriviaStats, etc.
    ├── utils/
    │   ├── connectivity.ts          Network check (pings google.com, 3s timeout)
    │   ├── fullScreenPermission.ts  Full-screen intent permission check + settings link
    │   ├── haptics.ts               Haptic feedback wrappers (light/medium/heavy/selection)
    │   ├── sudoku.ts                Sudoku puzzle generator with unique-solution validation
    │   └── time.ts                  formatTime (12h/24h) and getCurrentTime
    └── widget/
        ├── DetailedWidget.tsx       Large widget: alarms, timers, reminders
        ├── TimerWidget.tsx          Compact widget: timer presets + alarm cards
        ├── updateWidget.ts          refreshTimerWidget() — updates both widgets
        └── widgetTaskHandler.ts     Background widget handler: render, click, timer start
```

---

## Data Flow

```
┌────────────────────────────────────────────────────────────┐
│                        USER                                │
│  Creates alarm/timer/reminder → Interacts with fire screen │
└─────────┬──────────────────────────────────────┬───────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────┐                    ┌──────────────────┐
│    Screens      │                    │  AlarmFireScreen  │
│ (CreateAlarm,   │                    │ (dismiss, snooze, │
│  TimerScreen,   │                    │  guess why)       │
│  Reminders)     │                    └────────┬─────────┘
└────────┬────────┘                             │
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌──────────────────┐
│   Services      │                    │  alarmSound.ts   │
│ (storage.ts,    │◄───────────────────│  (NativeModule   │
│  timerStorage,  │                    │   MediaPlayer)   │
│  reminderStore) │                    └──────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  AsyncStorage   │     │ notifications.ts │
│ (alarms, timers,│     │ (schedule, cancel│
│  reminders,     │     │  channels, snooze│
│  settings, etc.)│     │  via Notifee)    │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Android System  │
                        │ (AlarmManager,   │
                        │  NotificationMgr,│
                        │  MediaPlayer)    │
                        └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
     ┌────────────┐    ┌────────────────┐   ┌──────────────┐
     │  index.ts  │    │   App.tsx      │   │  AppState    │
     │ (background│    │ (foreground    │   │ (warm resume │
     │  handler)  │    │  handler)      │   │  fallback)   │
     └─────┬──────┘    └───────┬────────┘   └──────┬───────┘
           │                   │                    │
           ▼                   ▼                    ▼
     ┌─────────────────────────────────────────────────┐
     │              pendingAlarm.ts                     │
     │  (module-level bridge + dedupe Map)              │
     └──────────────────────┬──────────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ AlarmFireScreen  │
                   └──────────────────┘
```

### Key data paths:

1. **Alarm creation**: CreateAlarmScreen → `storage.addAlarm()` → `notifications.scheduleAlarm()` → Notifee trigger
2. **Alarm fires**: Android system → Notifee DELIVERED event → `index.ts` (background) OR `App.tsx` (foreground) → `pendingAlarm.setPendingAlarm()` → AlarmFireScreen
3. **Sound playback**: Event handler → `alarmSound.playAlarmSoundForNotification()` → NativeModules.AlarmChannelModule.playAlarmSound → Java MediaPlayer with USAGE_ALARM
4. **Widget updates**: Any alarm/timer state change → `updateWidget.refreshTimerWidget()` → `requestWidgetUpdate()` → re-render both widgets

---

## Navigation Structure

Stack navigator with 15 screens. No tabs at the navigator level — `AlarmListScreen` implements its own TabView internally.

```
Stack.Navigator (initialRouteName = 'AlarmList' or 'Onboarding')
├── Onboarding       fade animation, gesture disabled
├── AlarmList        default animation (main screen)
├── CreateAlarm      slide_from_bottom
├── AlarmFire        fade animation, gesture disabled
├── GuessWhy         fade animation, gesture disabled
├── Settings         slide_from_right
├── MemoryScore      slide_from_right
├── MemoryMatch      slide_from_right
├── Games            slide_from_right
├── Sudoku           slide_from_right
├── DailyRiddle      slide_from_right
├── CreateReminder   slide_from_bottom
├── ForgetLog        slide_from_right
├── Trivia           slide_from_right
└── About            slide_from_right
```

### Initial route logic (`App.tsx`):

1. Check `getOnboardingComplete()` — if false, start at Onboarding
2. Check `getPendingAlarm()` — if set (cold start from notification), create nav state with AlarmList at index 0 and AlarmFire at index 1
3. Fallback: check `notifee.getInitialNotification()` for cold-start PRESS/fullScreenAction
4. Normal launch: start at AlarmList

### AlarmListScreen internal tabs:

Three tabs implemented via react-native-tab-view:
- **Alarms**: alarm list with sort (time/created/name), filter (all/active/one-time/recurring/deleted), CRUD
- **Timers**: preset grid + active timer list with countdown
- **Reminders**: reminder list with completion tracking

---

## Key Patterns

### Soft Deletes with 30-Day Purge
Alarms and reminders set `deletedAt: string` (ISO timestamp) instead of hard deleting. `purgeDeletedAlarms()` and `purgeDeletedReminders()` run on app launch and remove items older than 30 days. Soft-deleted items are hidden by default but accessible via the "deleted" filter.

### Module-Level Pending Alarm Data
`pendingAlarm.ts` uses a module-level variable (`_pending`) to pass data from the headless background event handler (`index.ts`) to the React tree (`App.tsx`). This is synchronous — the background handler writes before React mounts, and the init phase reads during the first render cycle.

### Notification Dedupe Map
`pendingAlarm.ts` maintains `_handledNotifs: Map<string, number>` (10-minute TTL) to prevent duplicate AlarmFireScreen navigation. A single notification can trigger events in multiple places (background handler, foreground handler, getInitialNotification, AppState listener). The map ensures only the first handler navigates.

### Yearly Reminder Reschedule
Notifee has no YEARLY repeat frequency. Yearly reminders use a one-time trigger. Both `index.ts` and `App.tsx` contain `rescheduleYearlyReminder()` which bumps the `dueDate` to next year and schedules a new trigger on DELIVERED or DISMISSED events.

### Widget Sync
`refreshTimerWidget()` in `updateWidget.ts` is called after any alarm/timer/reminder state change. It calls `requestWidgetUpdate()` for both `TimerWidget` (compact) and `DetailedWidget` (large), re-rendering them with fresh data from AsyncStorage.

### Migration on Load
`storage.loadAlarms()` detects old data formats and migrates:
- Numeric day indices → AlarmDay strings ('Mon', 'Tue', etc.)
- Single `notificationId` → array `notificationIds`
- Boolean `recurring` → mode enum ('recurring' | 'one-time')
- Missing `soundId` → default 'default'

---

## Native Modules & Config Plugins

Three Expo config plugins generate native Android code at build time:

### `plugins/withAlarmChannel.js`
Generates 3 Java files into the Android project:

| File | Purpose |
|------|---------|
| `AlarmChannelHelper.java` | Creates 6 preset notification channels with `AudioAttributes.USAGE_ALARM`, plays/stops alarm sounds via `MediaPlayer` |
| `AlarmChannelModule.java` | React Native bridge: `createSoundChannel()`, `playAlarmSound()`, `stopAlarmSound()` |
| `AlarmChannelPackage.java` | Standard `ReactPackage` registration |

Injects into `MainApplication`:
- `AlarmChannelHelper.createPresetChannels(this)` in `onCreate()` — creates channels before any JS runs
- `AlarmChannelPackage()` in `getPackages()` — registers the native module

### `plugins/withAlarmWake.js`
Modifies `AndroidManifest.xml` and `MainActivity`:

**Manifest**: Adds `USE_FULL_SCREEN_INTENT`, `WAKE_LOCK`, `DISABLE_KEYGUARD` permissions. Sets `showWhenLocked="true"` and `turnScreenOn="true"` on MainActivity.

**MainActivity.onCreate**: Injects code to:
- `setShowWhenLocked(true)` / `setTurnScreenOn(true)` (API 27+)
- `FLAG_KEEP_SCREEN_ON` window flag
- `requestDismissKeyguard()` (API 26+) to dismiss lock pattern/PIN

### `plugins/withNotifee.js`
Modifies `AndroidManifest.xml` only:

Adds `USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`, `WAKE_LOCK` permissions. Sets `showWhenLocked="true"` and `turnScreenOn="true"` on MainActivity.

---

## Android Permissions

Declared in `app.json` and config plugins:

| Permission | Source | Purpose |
|-----------|--------|---------|
| `POST_NOTIFICATIONS` | app.json | Show notifications |
| `USE_FULL_SCREEN_INTENT` | app.json + plugins | Launch alarm over lock screen |
| `SCHEDULE_EXACT_ALARM` | app.json + withNotifee | Precise alarm timing |
| `VIBRATE` | app.json + withNotifee | Vibration patterns |
| `WAKE_LOCK` | app.json + plugins | Keep screen on during alarm |
| `RECEIVE_BOOT_COMPLETED` | app.json | Reschedule alarms after reboot |
| `FOREGROUND_SERVICE` | app.json | Background notification handling |
| `DISABLE_KEYGUARD` | withAlarmWake | Dismiss lock screen for alarm |

### Onboarding Permission Flow

`OnboardingScreen.tsx` guides users through permissions in order:
1. **Welcome** + **Feature intro** (2 info slides)
2. **Notification permission** — `notifee.requestPermission()`
3. **Exact alarm permission** — links to Android alarm settings (API 31+)
4. **Battery optimization** — `notifee.openBatteryOptimizationSettings()`
5. **Full-screen intent** — links to full-screen notification settings (API 34+, Android only)
6. **Samsung DND** — Samsung-only slide: instructions to allow app in DND settings
7. **Display over apps** — `MANAGE_OVERLAY_PERMISSION` intent
8. **Done** — marks onboarding complete via `setOnboardingComplete()`

---

## Theme System

8 preset themes (4 dark, 4 light) + custom accent color generator in `src/theme/colors.ts`:

| Theme | Mode | Accent |
|-------|------|--------|
| midnight (default) | dark | #4A90D9 (blue) |
| obsidian | dark | #A0A0B0 (gray) |
| forest | dark | #4CAF50 (green) |
| royal | dark | #9C6ADE (purple) |
| bubblegum | light | #E0389A (pink) |
| sunshine | light | #E6A817 (gold) |
| ocean | light | #0077CC (blue) |
| mint | light | #10B981 (green) |

Custom themes: `generateCustomTheme(accentHex)` derives all 18 `ThemeColors` properties from a single accent color, auto-detecting dark/light mode from luminance.

Persisted in AsyncStorage: `'appTheme'` (theme name) and `'customTheme'` (accent hex for custom).

---

## Home Screen Widgets

Two Android home screen widgets registered in `app.json`:

| Widget | Name | Content |
|--------|------|---------|
| Compact | `TimerWidget` | 3 timer presets + 3 upcoming alarms |
| Detailed | `DetailedWidget` | Timer presets with durations, alarms with schedules, reminders |

Both rendered via `react-native-android-widget`. Widget clicks can open the app (`OPEN_APP` action) or start a timer directly (`START_TIMER__{presetId}` action) without opening the app UI.

Pin limits: max 3 pinned items each for presets, alarms, and reminders. Unpinned slots filled by recent usage (timers) or soonest fire time (alarms).

---

## Scoring System

Composite memory score calculated in `src/services/memoryScore.ts`: 5 games × 20 points = 100 max.

| Game | Max | Scoring |
|------|-----|---------|
| Guess Why | 20 | Win rate × 12 + streak bonus (max 8) |
| Memory Match | 20 | Stars per difficulty × difficulty multiplier |
| Sudoku | 20 | Stars per difficulty × difficulty multiplier |
| Daily Riddle | 20 | Accuracy × 10 + streak bonus (max 10) |
| Trivia | 20 | Accuracy × 10 + best round + breadth |

9-tier rank system from "Who Are You Again?" (0-5) to "The One Who Remembers" (98-100). Defined in `src/data/memoryRanks.ts`.
