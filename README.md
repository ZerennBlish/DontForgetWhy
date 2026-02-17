# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off. Includes a full timer system with quick-tap presets, two home screen widgets (compact + detailed) with pinnable presets and alarms, a "Guess Why" memory mini-game that hides alarm details across the entire UI, recurring and one-time alarm scheduling, Memory Match, Sudoku, Trivia, and Daily Riddle mini-games, escalating snooze shame, a full theme system with 8 presets + custom color picker, full-screen alarm wake over lock screen, per-alarm custom sounds from system ringtones, background images with dark overlays on all game screens, a full-screen app icon watermark behind the main tabs, and a sarcastic personality throughout.

**Publisher:** Bald Guy & Company Games
**Feedback:** baldguyandcompanygames@gmail.com

## 1. Features List

1. **Alarm creation** — Set time via single auto-formatting input (type "630" to get "6:30"), 12h with AM/PM or 24h based on settings, add a note explaining *why*, optional nickname, optional icon (38 emojis + custom), optional private toggle, optional custom sound
2. **Alarm editing** — Tap any alarm card to edit time, nickname, note, icon, privacy, mode, sound, and schedule; reschedules notifications on save
3. **Recurring alarm mode** — Select specific days of the week (Mon-Sun) with quick-select buttons for Weekdays, Weekends, or All Days; one weekly trigger per selected day
4. **One-time alarm mode** — Select a specific date from an inline calendar picker; rejects past dates and times; no repeat
5. **Alarm list** — Main screen shows all alarms with enable/disable switch, tap-to-edit, delete button with confirmation, and pin-to-widget button
6. **Alarms / Timers / Reminders tab switcher** — Pill-shaped 3-tab toggle on the main screen switches between alarm list, timer grid, and reminders list; also supports horizontal swipe between tabs via `react-native-tab-view`
7. **One-time auto-disable** — One-time alarms are automatically disabled after firing (via `disableAlarm` in App.tsx); `disableAlarm` also cancels all scheduled notifications for the alarm
8. **12/24 hour time format** — Setting in SettingsScreen; affects alarm card display, fire screen display, widget display, and time input format on create/edit screen
9. **Icon picker** — 38-emoji grid (+ custom) on create/edit screen organized into 6 categories (Health & Medical, Events & Social, Work & Tasks, Home & Errands, Self-Care & Wellness, Travel & Other); selected icon auto-maps to a category behind the scenes
10. **Category auto-mapping** — Icon selection drives the category field via `iconCategoryMap` (22 mapped icons across 4 categories); unrecognized icons default to `'general'`
11. **Private alarm mode** — Hides note/icon/nickname on the alarm card, shows "Private Alarm"; tap eye icon to peek for 3 seconds
12. **Motivational quotes** — Random quote from a pool of 12, assigned at alarm creation and shown on the fire screen
13. **App-open quotes** — 38 snarky rotating quotes displayed as a compact italic line (no card background, smaller font) under the tabs; moves to empty-state center when no items exist; refreshes on every screen focus via useFocusEffect; shared quote pool also used on the Reminders tab (see Feature 65)
14. **Rotating placeholder text** — The note input field shows a random witty placeholder from a pool of 12
15. **Guess Why mini-game** — When enabled (default: ON), you must guess why you set the alarm before seeing the answer; 3 attempts via icon grid or free-text input
16. **Guess Why info hiding** — When Guess Why is enabled, alarm cards show deterministic mystery text, notifications use generic text, widget alarms show "Mystery" — prevents cheating across the entire UI
17. **Unwinnable alarm guard** — Alarms with no icon and a note shorter than 3 characters skip Guess Why entirely (`navigation.replace` to AlarmFire without recording stats)
18. **Win/loss/skip tracking** — Every Guess Why outcome is recorded with running totals and streak counter
19. **Memory Score screen** — Shows win %, rank title + emoji, current streak, best streak, total games; links to Forget Log
20. **Memory rank tiers** — Five ranks from "Goldfish With Amnesia" (0-29%) to "Memory of an Elephant With a Vendetta" (90-100%)
21. **Forget Log** — Chronological list of every alarm you failed or skipped in Guess Why, with note, nickname, icon, timestamp, and result badge
22. **Snooze with escalating shame** — 4 tiers of 3 increasingly judgmental messages; snooze count tracked per-alarm in AsyncStorage (`snoozeCount_{alarmId}`); shame overlay shown briefly before exiting to lock screen
23. **Timer system** — 46 labeled presets (45 standard + 1 custom) in a 3-column grid; tap to start countdown
24. **Timer custom duration** — Long-press any preset to override its duration via modal with hours/minutes/seconds inputs (saved per-preset in AsyncStorage)
25. **Timer recently-used sorting** — Used presets float to a "Recent" section at the top; up to 20 tracked
26. **Active timer management** — Live countdown display with pause/resume toggle and dismiss (X) button; persisted across app reloads
27. **Timer background drift correction** — AppState listener recalculates timer remaining seconds when app returns to foreground
28. **Timer completion alerts** — Alert dialog fires when a timer reaches zero in-app
29. **Timer scheduled notifications** — Notifee timestamp trigger scheduled at timer start; cancels on pause, reschedules on resume
30. **Timer countdown notifications** — Ongoing notification with Android chronometer showing live countdown
31. **Compact home screen widget** — Android widget (180x110dp) showing a 2-column grid: 3 timer presets (left) + 3 alarms (right); tap preset to start timer, tap alarm to open app
32. **Detailed home screen widget** — Android widget (180x170dp) showing 2-column grid with schedule/duration details on each cell
33. **Widget alarm display** — Shows up to 3 enabled alarms sorted by next fire time; pinned alarms get priority; respects Guess Why privacy
34. **Widget pin-to-widget (presets)** — Pin up to 3 timer presets to appear first in widget; pinned cells get accent-colored border
35. **Widget pin-to-widget (alarms)** — Pin up to 3 alarms to appear first in widget; managed via pin button on alarm cards
36. **Widget headless timer start** — Widget taps start timers via headless JS without launching the app; schedules notifications and saves to AsyncStorage
37. **Widget foreground sync** — AppState listener reloads active timers when app returns to foreground, picking up widget-started timers
38. **Notification scheduling** — Recurring (daily or per-day weekly) and one-time alarm notifications via @notifee with alarm manager
39. **Notification deep-linking** — Alarm/timer notifications navigate to AlarmFireScreen (or GuessWhy if enabled) via a three-layer system: `initialState` for cold start, foreground event handler for warm resume (PRESS + DELIVERED events), and AppState fallback; pending data bridged from headless background handler to React tree via module-level variable (`pendingAlarm.ts`)
40. **Aggressive alarm notifications** — DND bypass, loopSound, ongoing, vibrationPattern, lights, fullScreenAction with launchActivity, AndroidCategory.ALARM
41. **Conditional vibration** — AlarmFireScreen starts vibration only when opened from a notification (not when returning from GuessWhy via `postGuessWhy`); vibration and alarm sound cancelled on Dismiss, Snooze, or Guess Why button press via `cancelAllNotifications()`; `Vibration.cancel()` as defensive fallback when returning from GuessWhy; sound plays FROM the notification — cancelling the notification stops the sound
42. **Notification privacy** — Alarm note (the "why") is never included in the notification body
43. **Memory Match mini-game** — Card-flip matching game with 3 difficulties (3x4, 4x4, 5x4), par scoring, animated card flip (scaleX interpolation), best scores per difficulty
44. **Sudoku mini-game** — Full Sudoku with 3 difficulties, backtracking puzzle generator with unique-solution validation, pencil notes, pause/save/resume, difficulty-scaled assistance, star rating, best scores per difficulty
45. **Games hub** — Central screen with Daily Riddle, Memory Match, Trivia, Sudoku cards, Guess Why toggle, and Your Stats link; brain background image with semi-transparent glass-style cards
46. **Theme system** — 8 preset themes (4 dark, 4 light) + custom color picker; all styles react via useMemo
47. **Custom theme generator** — Pick any accent color; generates full dark or light theme from luminance analysis with color mixing
48. **Theme persistence** — Selected theme and custom accent color saved to AsyncStorage, restored on app launch
49. **Safe area support** — SafeAreaProvider wraps the app root; every screen uses useSafeAreaInsets
50. **Streak display** — Current streak and best streak shown in the alarm list header only when streak > 0 (no "streak broken" message); format: "🔥 X in a row" with best streak
51. **Trophy navigation** — Trophy icon in header navigates to Memory Score; only visible after first game played
52. **Orphaned timer cleanup** — On app launch, expired timers from when the app was killed are cleaned up and their countdown notifications cancelled
53. **Migration support** — `migrateAlarm()` handles old data formats: single `notificationId` to `notificationIds[]`, boolean `recurring` to `mode` + `days`, numeric day arrays to string-based `AlarmDay[]`
54. **Custom alarm sounds** — Per-alarm sound selection from system ringtones/alarm sounds via reusable SoundPickerModal bottom sheet; react-native-notification-sounds lists available system sounds; preview playback via expo-av with audioModeReady ref pattern; dynamic Notifee channel creation per unique sound URI (`alarm_custom_{mediaId}`); backward compatible with existing default channel
55. **Custom timer sounds** — Default timer completion sound configurable in Settings via SoundPickerModal; saved to AsyncStorage (`defaultTimerSound` key); applied to timer completion notifications via dynamic channel (`timer_custom_{mediaId}` prefix); works for both in-app timer starts and headless widget timer starts; falls back to default alarm channel when no custom sound set
56. **Sort & Filter collapsible** — Sort and filter controls collapsed behind a right-aligned "Sort & Filter ▼" toggle button, default collapsed; active filter dot indicator appears when non-default sort/filter is applied; same collapsible pattern applied across Alarms, Timers, and Reminders tabs; toggle button always visible even on empty states so users can access "Deleted" filter to restore trashed items
57. **Live subtitle counts** — Header subtitle dynamically shows "X alarms · Y timers · Z reminders" with live updates as items are added, removed, or toggled
58. **Trivia game** — Category-based trivia with online (OpenTDB API) and offline (370+ built-in questions) modes; 10 categories: Science & Nature (🔬), History (🏛️), Music (🎵), Movies & TV (🎬), Geography (🌍), Sports (🏆), Technology (💻), Food & Drink (🍽️), General Knowledge (🧠), Kids (🧒); difficulty filter (Easy/Medium/Hard/All); timer speed (Relaxed 25s / Normal 15s / Blitz 8s); 2-column category grid with General Knowledge centered alone on bottom row; per-category stats tracking; guard for empty question array when category + difficulty yields no results; online mode disabled with "Coming soon" alert
59. **Full-screen alarm wake** — Screen wakes and shows AlarmFireScreen over lock screen via custom Expo config plugin (`plugins/withAlarmWake.js`); injects `setShowWhenLocked(true)`, `setTurnScreenOn(true)`, `FLAG_KEEP_SCREEN_ON`, and `KeyguardManager.requestDismissKeyguard()`; works for both alarms and timers; Samsung requires Settings > Apps > Special app access > Full screen notifications enabled; runtime check via `canUseFullScreenIntent` in `fullScreenPermission.ts`; onboarding slide guides users through permission setup
60. **AlarmFireScreen redesign** — Dedicated full-screen alarm UI with large touch targets for half-asleep use; shows time (or "Timer Complete"), icon emoji, and label (nickname or "Alarm"/"Timer"); optional sound name display for custom sounds; three action buttons: Dismiss (red, cancels everything + exits to lock screen), Snooze 5 min (cancels + reschedules + shows shame message overlay + exits), and Guess Why (cancels alarm sound/vibration, navigates to game in silence); Dismiss/Snooze return to lock screen via `BackHandler.exitApp()`; also handles timer completions with timer-specific display
61. **Single-field time input** — Replaced two-field hour:minute picker with single auto-formatting TextInput; type raw digits and colon is inserted automatically ("6" → "6", "63" → "6:3", "630" → "6:30", "0630" → "06:30"); `rawDigits` state stores just digits, `formatTimeDisplay()` adds colon for display, `parseRawDigits()` extracts hours/minutes for saving; AM/PM toggle preserved for 12h mode; applied to both CreateAlarmScreen and CreateReminderScreen
62. **Swipe between tabs** — Horizontal swipe navigation between Alarms, Timers, and Reminders tabs using `react-native-tab-view` + `react-native-pager-view`; native Android ViewPager2 handles page swiping; custom pill tab bar remains in the header above TabView (`renderTabBar={() => null}` suppresses default); `lazy` rendering with `lazyPreloadDistance={0}` for deferred tab initialization; haptic feedback on both pill tap and swipe completion; pills stay synced with swipe index; timer countdown continues across tab switches since timer state lives in parent AlarmListScreen; requires new EAS build (native module)
63. **Soft delete / Trash system** — Alarms and reminders are soft-deleted via a Delete button with confirmation Alert instead of permanently removed; `deletedAt` timestamp field marks soft-deleted items; "Deleted" filter in Sort & Filter shows trash items sorted newest-first with "X min/hours/days ago" labels via `formatDeletedAgo()`; restore and permanent delete available in trash view; notifications cancelled on soft-delete, rescheduled on restore; `loadAlarms(true)` and `getReminders(true)` load all items including soft-deleted for trash view; UndoToast triggers on soft-delete
64. **Reminder icon-only save** — Reminders can be saved with just an icon and no text; validation on CreateReminderScreen accepts either text or icon (`!text.trim() && !selectedIcon` triggers error)
65. **Reminder quotes** — Snarky rotating quotes on the Reminders tab matching the alarm quote pattern from `appOpenQuotes.ts`; centered in empty state; compact italic line above the sort/filter row when reminders exist; refreshes on screen focus via `useFocusEffect` calling `getRandomAppOpenQuote()`
66. **Icon reorganization** — 38 alarm/reminder icons (up from 25) organized into 6 categories (Health & Medical, Events & Social, Work & Tasks, Home & Errands, Self-Care & Wellness, Travel & Other); 13 new icons: 🦷 dentist, 💍 anniversary, 🎂 birthday, ❤️ date, 🙏 church, 💲 bills, 📝 homework, 📦 delivery, 🚌 transit, 🔒 door, 🧘 yoga, 💧 hydrate, 🛏️ bedtime, 💇 haircut, ✈️ travel, 🔨 auction; `iconCategoryMap` expanded to 22 entries with new `event` category; timer presets expanded to 46 (45 standard + custom)
67. **Tap-to-edit** — Alarm and reminder cards open the edit screen on tap (removed pencil icon); alarm cards use `onEdit` callback, reminder cards use `onNavigateCreate` callback
68. **Send Feedback** — Settings screen includes a "Send Feedback" card that opens a `mailto:baldguyandcompanygames@gmail.com` link pre-filled with app version and device info
69. **Trivia difficulty filter** — Pill selectors for All, Easy, Medium, Hard on the trivia category screen; filters the offline question pool by difficulty; online mode passes difficulty to the API
70. **Trivia timer speed** — Three speed options: Relaxed (25s), Normal (15s), Blitz (8s); pill selectors on the trivia category screen; controls the per-question countdown timer
71. **Kids trivia category** — 45 age-appropriate trivia questions across easy/medium/hard difficulty; offline only (excluded from OpenTDB online mode); 🧒 emoji in category grid
72. **Music and Movies & TV trivia categories** — Split from a former "Pop Culture" category; now 10 total trivia categories; old Pop Culture seen-question tracking cleared for a fresh start
73. **Online mode disabled** — Trivia online mode shows "Coming soon" alert and button is dimmed (`opacity: 0.4`); Daily Riddle "Fresh Riddles" (online) tab is disabled with "Online riddles coming soon" text
74. **Background images on game screens** — Eight screens use `ImageBackground` with dark overlays and semi-transparent glass-style cards: Games Hub (`brain.png`, 0.55 overlay), Settings (`gear.png`, 0.6 overlay), Trivia (`questionmark.png`, 0.55 overlay), Daily Riddle (`door.png`, 0.55 overlay), Memory Match (`oakbackground.png`, 0.6 overlay), Sudoku (`newspaper.png`, 0.65 overlay), Guess Why (`gameclock.png`, 0.55 overlay), Memory Score / Stats (`library.png`, dark overlay)
75. **Semi-transparent cards** — Games Hub, Settings, Memory Score / Stats, and all game difficulty-select screens (Sudoku, Memory Match, Trivia) use glass-style cards with `backgroundColor: 'rgba(255,255,255,0.15)'` and `borderColor: 'rgba(255,255,255,0.2)'` on card elements, replacing opaque `colors.card` backgrounds; background images visible through cards on all game screens
76. **App icon watermark** — Full-screen `fullscreenicon.png` watermark rendered as first child of the root container in AlarmListScreen, positioned absolutely to fill edge to edge (`position: absolute, top/left/right/bottom: 0, width/height: 100%`); `resizeMode="cover"`, `opacity: 0.07`, `pointerEvents="none"`; sits behind the header, tab pills, and all tab content (Alarms, Timers, Reminders) as a single shared watermark

## 2. Data Models

### Alarm (`src/types/alarm.ts`)
```typescript
type AlarmDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface Alarm {
  id: string;               // uuid v4
  time: string;             // "HH:MM" 24-hour format (internal storage)
  nickname?: string;        // Public name (shows on lock screen notification + alarm card)
  note: string;             // The "why" — private, only shown in-app on AlarmFireScreen
  quote: string;            // Random motivational quote assigned at creation
  enabled: boolean;
  mode: 'recurring' | 'one-time';
  days: AlarmDay[];         // Selected days for recurring (e.g. ['Mon', 'Wed', 'Fri'])
  date: string | null;      // "YYYY-MM-DD" for one-time alarms, null for recurring
  category: AlarmCategory;  // Derived from selected icon
  icon?: string;            // Emoji from icon picker
  private: boolean;         // Hides details on alarm card
  createdAt: string;        // ISO 8601 timestamp
  notificationIds: string[];// Array of notifee notification identifiers (one per scheduled day)
  soundUri?: string;       // content:// URI from system sound picker (for custom notification channel)
  soundName?: string;      // Display name of selected system sound
  soundID?: number;        // Numeric ID from react-native-notification-sounds (for picker checkmark state)
  deletedAt?: string;      // ISO 8601 timestamp of soft-delete (null/undefined = not deleted)
  /** @deprecated */ notificationId?: string;
  /** @deprecated */ recurring?: boolean;
}

type AlarmCategory = 'meds' | 'appointment' | 'event' | 'task' | 'self-care' | 'general';
```

### Reminder (`src/types/reminder.ts`)
```typescript
interface Reminder {
  id: string;               // uuid v4
  icon: string;             // Emoji from icon picker
  text: string;             // What to remember
  nickname?: string;        // Public name (for privacy on cards/widgets)
  private: boolean;         // Hides details on reminder card
  completed: boolean;
  createdAt: string;        // ISO 8601 timestamp
  completedAt: string | null;
  dueDate: string | null;   // "YYYY-MM-DD" or null
  dueTime: string | null;   // "HH:MM" 24h format or null (drives notifications)
  notificationId: string | null; // Notifee notification ID
  pinned: boolean;
  deletedAt?: string;      // ISO 8601 timestamp of soft-delete (null/undefined = not deleted)
}
```

### TimerPreset (`src/types/timer.ts`)
```typescript
interface TimerPreset {
  id: string;               // Unique preset slug (e.g. 'pizza', 'laundry', 'custom')
  icon: string;             // Emoji
  label: string;            // Display name
  seconds: number;          // Default duration (0 for custom)
  customSeconds?: number;   // User-overridden duration via long-press
}
```

### ActiveTimer (`src/types/timer.ts`)
```typescript
interface ActiveTimer {
  id: string;               // uuid v4 (or Date.now()+random for widget-started timers)
  presetId: string;         // Which preset started this timer
  label: string;            // Copied from preset at start time
  icon: string;             // Copied from preset at start time
  totalSeconds: number;     // Original duration
  remainingSeconds: number; // Countdown state
  startedAt: string;        // ISO 8601 timestamp (reset on resume to recalculate elapsed)
  isRunning: boolean;       // false when paused or completed
  notificationId?: string;  // Notifee scheduled notification ID (for cancel on pause/dismiss)
}
```

### PendingAlarmData (`src/services/pendingAlarm.ts`)
```typescript
interface PendingAlarmData {
  alarmId?: string;         // For alarm notifications
  timerId?: string;         // For timer notifications
  notificationId: string;   // The notifee notification ID that triggered this
  timerLabel?: string;      // Display label for timer completions
  timerIcon?: string;       // Display icon for timer completions
}
```

### GuessWhyStats (`src/services/guessWhyStats.ts`)
```typescript
interface GuessWhyStats {
  wins: number;
  losses: number;
  skips: number;
  streak: number;           // Current consecutive wins (resets on loss or skip)
  bestStreak: number;       // All-time best
}
```

### ForgetEntry (`src/services/forgetLog.ts`)
```typescript
interface ForgetEntry {
  id: string;               // uuid v4
  alarmNote: string;
  alarmNickname?: string;
  alarmIcon?: string;
  alarmCategory: string;
  result: 'loss' | 'skip';
  timestamp: string;        // ISO 8601
}
```

### AppSettings (`src/services/settings.ts`)
```typescript
interface AppSettings {
  guessWhyEnabled: boolean; // Default: true
  timeFormat: '12h' | '24h'; // Default: '12h'
}
```

### TimerSoundSetting (`src/services/settings.ts`)
```typescript
interface TimerSoundSetting {
  uri: string | null;      // content:// URI from system sound picker, null = default
  name: string | null;     // Display name of selected system sound
  soundID: number | null;  // Numeric ID from react-native-notification-sounds
}
```

### ThemeColors (`src/theme/colors.ts`)
```typescript
interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  card: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  red: string;
  orange: string;
  activeBackground: string;
  overlayWin: string;
  overlayLose: string;
  overlaySkip: string;
  overlayButton: string;
  overlayText: string;
  modalOverlay: string;
}

type ThemeName = 'midnight' | 'obsidian' | 'forest' | 'royal'
              | 'bubblegum' | 'sunshine' | 'ocean' | 'mint' | 'custom';
```

### ThemeContextValue (`src/theme/ThemeContext.tsx`)
```typescript
interface ThemeContextValue {
  colors: ThemeColors;
  themeName: ThemeName;
  customAccent: string | null;
  setTheme: (name: ThemeName) => void;
  setCustomTheme: (accentHex: string) => void;
}
```

### GuessIcon (`src/data/guessWhyIcons.ts`)
```typescript
interface GuessIcon {
  id: string;               // Keyword used for matching (e.g. 'meds', 'pet')
  emoji: string;
}
```

### MemoryRank (`src/data/memoryRanks.ts`)
```typescript
interface MemoryRank {
  title: string;
  emoji: string;
  color: string;            // Hex color for rank title display
}
```

### Widget Interfaces (`src/widget/TimerWidget.tsx`, `src/widget/DetailedWidget.tsx`)
```typescript
// Compact widget
interface WidgetPreset { id: string; icon: string; label: string; isPinned?: boolean; }
interface WidgetAlarm  { id: string; icon: string; time: string; label: string; }

// Detailed widget
interface DetailedPreset { id: string; icon: string; label: string; duration: string; isPinned?: boolean; }
interface DetailedAlarm  { id: string; icon: string; time: string; schedule: string; }
```

### RecentEntry (`src/services/timerStorage.ts`, internal)
```typescript
interface RecentEntry {
  presetId: string;
  timestamp: number;        // Date.now() at time of use
}
```

## 3. AsyncStorage Keys

| Key | Type | Location | Description |
|---|---|---|---|
| `alarms` | `Alarm[]` | `storage.ts` | All alarm objects |
| `guessWhyStats` | `GuessWhyStats` | `guessWhyStats.ts` | Lifetime Guess Why win/loss/skip/streak counters |
| `appSettings` | `AppSettings` | `settings.ts` | App-wide settings (guessWhyEnabled + timeFormat) |
| `forgetLog` | `ForgetEntry[]` | `forgetLog.ts` | Log of alarms the user forgot or skipped (newest first) |
| `timerPresets` | `Record<string, number>` | `timerStorage.ts` | Map of preset ID to custom duration override in seconds |
| `activeTimers` | `ActiveTimer[]` | `timerStorage.ts` | Currently running/paused timers (persisted for app reload) |
| `recentPresets` | `RecentEntry[]` | `timerStorage.ts` | Recently used timer presets sorted by last-used (max 20) |
| `appTheme` | `string` | `ThemeContext.tsx` | Selected theme name (e.g. `'midnight'`, `'forest'`, `'custom'`) |
| `customTheme` | `{ accent: string }` | `ThemeContext.tsx` | User-picked custom accent hex color (JSON object) |
| `widgetPinnedPresets` | `string[]` | `widgetPins.ts` | Ordered list of pinned timer preset IDs (max 3) |
| `widgetPinnedAlarms` | `string[]` | `widgetPins.ts` | Ordered list of pinned alarm IDs (max 3) |
| `memoryMatchScores` | `BestScores` | `MemoryMatchScreen.tsx` | Best moves + time per difficulty (easy/medium/hard) |
| `sudokuCurrentGame` | `SavedGame` | `SudokuScreen.tsx` | Current in-progress Sudoku puzzle state (for resume) |
| `sudokuBestScores` | `BestScores` | `SudokuScreen.tsx` | Best time + mistakes per difficulty (easy/medium/hard) |
| `defaultTimerSound` | `TimerSoundSetting` | `settings.ts` | Default timer completion sound (uri, name, soundID); null values = system default |
| `hapticsEnabled` | `string` | `SettingsScreen.tsx` | `'true'` or `'false'` — controls haptic feedback globally |
| `snoozeCount_{alarmId}` | `string` | `AlarmFireScreen.tsx` | Per-alarm snooze count (incremented on each snooze, reset on dismiss); drives escalating shame messages |
| `reminders` | `Reminder[]` | `reminderStorage.ts` | All reminder objects |

## 4. Screen Flow

### Navigation Stack (`RootStackParamList`)
```typescript
type RootStackParamList = {
  Onboarding: { startSlide?: number } | undefined;
  AlarmList: undefined;
  CreateAlarm: { alarm?: Alarm } | undefined;
  CreateReminder: { reminderId?: string } | undefined;
  AlarmFire: {
    alarm?: Alarm;
    fromNotification?: boolean;
    isTimer?: boolean;
    timerLabel?: string;
    timerIcon?: string;
    timerId?: string;
    timerNotificationId?: string;
    notificationId?: string;
    guessWhyEnabled?: boolean;
    postGuessWhy?: boolean;
  };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean; notificationId?: string };
  Settings: undefined;
  MemoryScore: undefined;
  MemoryMatch: undefined;
  Games: undefined;
  Sudoku: undefined;
  DailyRiddle: undefined;
  ForgetLog: undefined;
  About: undefined;
  Trivia: undefined;
};
```

15 navigation routes + 2 inline screens (TimerScreen and ReminderScreen rendered as tabs inside AlarmListScreen).

### AlarmList (`AlarmListScreen.tsx`)
Main hub. A full-screen `fullscreenicon.png` watermark is rendered as the first child of the root container (absolutely positioned, 100% width/height, `resizeMode="cover"`, opacity 0.07, `pointerEvents="none"`) — it sits behind everything: header, pills, and all tab content. Header shows app title, subtitle with live counts ("X alarms · Y timers · Z reminders"), game controller button, trophy button (if games played), gear button. Pill-shaped 3-tab switcher (Alarms / Timers / Reminders) synced with `react-native-tab-view` TabView for horizontal swipe navigation. A compact italic quote line appears under the tabs (no card background); moves to empty-state center when no items exist. Streak row ("🔥 X in a row") displays only when streak > 0. Sort & Filter controls are collapsed behind a right-aligned "Sort & Filter ▼" toggle (default collapsed) with an active-filter dot indicator; same collapsible pattern applied across all three tabs. Alarms tab shows FlatList of AlarmCards (with `guessWhyEnabled` prop for info hiding + pin button + delete button), and a FAB (+) to create; empty state shows text only (no icon/image) when no non-deleted alarms exist; "No matches" fallback when filter/sort yields empty results. Timers tab renders TimerScreen inline. Reminders tab renders ReminderScreen inline. Timer management (start, pause/resume, dismiss, notifications) is handled here and passed to TimerScreen via props. AppState listener reloads active timers when the app returns to foreground (picks up widget-started timers and auto-switches to Timers tab if new ones found). Tab state uses `index` (0/1/2) with derived `tab` for backward compatibility; `routes` array drives both TabView and pill buttons.

### CreateAlarm (`CreateAlarmScreen.tsx`)
Slide-from-bottom modal. Single auto-formatting time input: type raw digits and colon is inserted automatically ("630" → "6:30"); `rawDigits` state stores just digits, max 4 chars. In 12h mode: AM/PM toggle buttons appear beside the input. In 24h mode: no AM/PM. Schedule section with Recurring/One-time mode toggle. Recurring: day-of-week selector (7 circle buttons) + Weekdays/Weekends quick-select. One-time: inline calendar picker with month navigation, past dates disabled, past-time validation on save. Nickname field (shows on lock screen). Note field with random placeholder and character counter (200 max). 38-icon picker grid (+ custom) organized into 6 categories. Sound picker row opens SoundPickerModal to select a system ringtone/alarm sound; shows current selection name or "Default". Private alarm toggle card. Save button. In edit mode, pre-fills all fields and button says "Update Alarm". Requires at least a note or an icon. Notification permission only requested when scheduling is needed. Save wrapped in try/catch with user-facing Alert on failure. Refreshes widgets on save.

### CreateReminder (`CreateReminderScreen.tsx`)
Slide-from-bottom modal. Text field with random placeholder and character counter (200 max). Nickname field (optional, for privacy). 38-icon picker grid (+ custom) organized into 6 categories. Private toggle card. Due Time toggle with single auto-formatting time input (same pattern as CreateAlarm — `rawDigits` state, `formatTimeDisplay()`, `parseRawDigits()`); drives notification scheduling. Due Date toggle with inline calendar picker. Save button. In edit mode, loads existing reminder and button says "Update Reminder". Requires text or icon (either one is sufficient). Warns if combined date+time is in the past (with "Save Anyway" option). Refreshes widgets on save.

### AlarmFire (`AlarmFireScreen.tsx`)
Full-screen alarm UI with large touch targets for half-asleep use. Keeps screen awake via `useKeepAwake()`. Top section: formatted time (or "Timer Complete" for timers), icon emoji, label (nickname or "Alarm"/"Timer"), optional sound name. Bottom section: up to 3 action buttons stacked vertically.

**Guess Why button** (accent-bordered): Only shown for non-timer alarms when `guessWhyEnabled` is true, `postGuessWhy` is false, and alarm has a playable icon or note >= 3 chars. Calls `cancelAllNotifications()` (stops sound + vibration) then navigates to GuessWhy screen. Game plays in silence.

**Snooze 5 min button** (card-colored): Only shown for non-timer alarms when not returning from GuessWhy (intentional: after playing Guess Why, the user has committed to waking up — snooze would undermine the game's purpose). Calls `cancelAllNotifications()`, schedules a new snooze notification via `scheduleSnooze()`, increments per-alarm snooze count, shows an escalating shame message overlay (4 tiers of 3 messages driven by snooze count), then exits to lock screen after 2.5 seconds via `BackHandler.exitApp()`. Snooze notification body hides the note when `alarm.private` is true OR `guessWhyEnabled` is true (privacy-safe).

**Dismiss button** (red): Always shown. Calls `cancelAllNotifications()`, disables one-time alarms, resets snooze count, exits to lock screen via `BackHandler.exitApp()`.

**Vibration**: Starts on mount only when `fromNotification` is true and `postGuessWhy` is false. Defensive `Vibration.cancel()` when `postGuessWhy` is true. Sound plays FROM the notification — cancelling the notification stops the sound.

**cancelAllNotifications()**: Cancels vibration + dismisses all notification IDs (array format + legacy single ID) + cancels timer countdown notification + cancels the specific triggered notification via `notifee.cancelNotification()`.

### GuessWhy (`GuessWhyScreen.tsx`)
Full-screen fade-in with `gameclock.png` background image (`rgba(0,0,0,0.55)` overlay), gesture disabled. Sound and vibration are already stopped before arrival (AlarmFireScreen's handleGuessWhy cancels everything before navigating). If the alarm has no icon and a note shorter than 3 characters, immediately replaces itself with AlarmFire (no stats recorded). Top: alarm icon/category emoji + time + category label. Game area card with Icons/Type It mode toggle (Icons mode disabled if alarm has no icon). Icons mode: scrollable 4-column grid of 38 icons (+ custom) with labels; match is exact emoji equality. Type It mode: text input with Guess button (min 3 chars); match checks substring in note, or icon ID for icon-only alarms. 3 attempts. Shake animation on wrong guess. Result overlay (green win / red lose / amber skip) with snarky message. Continue navigates to AlarmFire via `navigation.replace` with `postGuessWhy: true`. Losses and skips logged to Forget Log.

### Settings (`SettingsScreen.tsx`)
Back button + title. `gear.png` background image with `rgba(0,0,0,0.6)` dark overlay. Semi-transparent glass-style cards (`rgba(255,255,255,0.15)` background, `rgba(255,255,255,0.2)` border). Toggle for "24-Hour Time". Toggle for "Vibration" (haptic feedback). Timer Sound row opens SoundPickerModal to pick the default timer completion sound (shows current selection name or "Default"). Theme picker: 8 preset theme circles in a grid + 9th "Custom" circle. Custom opens a reanimated-color-picker modal with Panel1 + HueSlider + Preview. Send Feedback card opens `mailto:baldguyandcompanygames@gmail.com` with app version and device info pre-filled. Permissions card with Setup Guide button (re-opens onboarding at permissions slide). About card links to AboutScreen.

### Onboarding (`OnboardingScreen.tsx`)
Multi-slide onboarding flow. Includes a full-screen alarm permission slide that guides users through enabling `canUseFullScreenIntent` (required on Android 14+ and Samsung devices). Uses `fullScreenPermission.ts` to check permission status and open system settings.

### Games (`GamesScreen.tsx`)
Hub screen with `brain.png` background image (`rgba(0,0,0,0.55)` overlay). Semi-transparent glass-style cards. Five game cards: Daily Riddle (with streak display), Memory Match, Trivia ("10 categories. 370+ questions offline."), Sudoku, and Guess Why (toggle switch, not navigable). Your Stats card links to MemoryScore. Game controller icon on main screen navigates here.

### MemoryScore (`MemoryScoreScreen.tsx`)
`library.png` background image with dark overlay; semi-transparent glass-style cards so library shows through. Rank emoji + rank title (colored) + win percentage + subtitle. Stats card with wins, losses, skips, streak, best streak, total games. "What Did I Forget?" button links to ForgetLog. Red "Reset Stats" button with confirmation.

### MemoryMatch (`MemoryMatchScreen.tsx`)
`oakbackground.png` background image with `rgba(0,0,0,0.6)` dark overlay on all phases. Difficulty select with semi-transparent glass-style cards: Easy (3x4, 6 pairs, par 8), Medium (4x4, 8 pairs, par 12), Hard (5x4, 10 pairs, par 16). Each shows best score. Game board with animated card flips (Animated scaleX interpolation, 300ms). Timer starts on first card flip. Win screen with star rating (below par = 3 stars, at par = 2, above = 1), snarky message, play again button. Best scores saved per difficulty.

### Sudoku (`SudokuScreen.tsx`)
`newspaper.png` background image with `rgba(0,0,0,0.65)` dark overlay on all phases. Difficulty select with semi-transparent glass-style cards: Easy (46-51 clues), Medium (36-41 clues), Hard (26-31 clues). Each shows best score. Continue button if saved game exists. Full 9x9 grid styled as a newspaper Sudoku puzzle: fully transparent grid background (newspaper image shows through), given numbers in black/dark bold, player-entered numbers in dark gray/blue, visible border around outer edge, inner grid lines visible with thicker borders on 3x3 box boundaries. Tap-to-select, number pad, pencil notes toggle, erase button. Difficulty-scaled assistance: Easy shows errors + highlighting + remaining counts; Medium shows errors + highlighting; Hard shows nothing during play, reveals on win. Pause saves game to AsyncStorage. Win screen with star rating (0 mistakes = 3 stars, 1-3 = 2, 4+ = 1), "Let's see how you actually did..." text on hard mode, snarky message. Best scores saved per difficulty.

### DailyRiddle (`DailyRiddleScreen.tsx`)
`door.png` background image with `rgba(0,0,0,0.55)` dark overlay. Daily mode vs Browse mode toggle. Offline riddle bank with search and category filters (memory, classic, logic, wordplay, quick). Streak tracking and hint system. "Fresh Riddles" (online) tab disabled with `pointerEvents="none"`, `opacity: 0.4`, and "Online riddles coming soon" text.

### Trivia (`TriviaScreen.tsx`)
`questionmark.png` background image with `rgba(0,0,0,0.55)` dark overlay. Semi-transparent glass-style category cards. 10-category grid with emoji icons. Difficulty filter pills (All/Easy/Medium/Hard). Timer speed pills (Relaxed 25s / Normal 15s / Blitz 8s). Online mode button dimmed (`opacity: 0.4`) with "Coming soon" alert. Kids and Food categories excluded from online mode. Per-category stats tracking with seen-question deduplication. Guard for empty question array when category + difficulty combination yields no results (e.g. Kids + Hard).

### ForgetLog (`ForgetLogScreen.tsx`)
FlatList of ForgetEntry cards with emoji, note, nickname, result badge (Forgot/Skipped), timestamp. Empty state message. "Clear Log" button with confirmation.

### TimerScreen (`TimerScreen.tsx`)
Rendered inline as a tab in AlarmListScreen. Active timers section with countdown display (H:MM:SS or MM:SS), pause/play toggle, dismiss (X). "Recent" section with recently used presets. Main grid with remaining presets + Custom button at end. 3-column grid. Long-press to set custom duration and pin to widget. Pinned presets show a pin indicator. Custom preset opens duration modal on tap.

## 5. File Structure

```
assets/
├── adaptive-icon.png          App icon (adaptive)
├── brain.png                  Games Hub background image
├── door.png                   Daily Riddle background image
├── favicon.png                Web favicon
├── fullscreenicon.png         Full-screen watermark for main tabs
├── gameclock.png              Guess Why background image
├── gear.png                   Settings background image
├── icon.png                   App icon (standard)
├── library.png                Memory Score / Stats screen background (old library study wall)
├── newspaper.png              Sudoku background image
├── oakbackground.png          Memory Match background image
├── old.png                    Legacy asset
├── questionmark.png           Trivia background image
└── splash-icon.png            Splash screen icon

src/
├── components/
│   ├── AlarmCard.tsx              Alarm list item card with peek, toggle, tap-to-edit, delete button, pin, Guess Why hiding
│   ├── ErrorBoundary.tsx          Error boundary with fallback UI
│   ├── SoundPickerModal.tsx       Reusable bottom sheet for picking system sounds; search filter, expo-av preview, selection
│   ├── SwipeableRow.tsx           Swipeable row component (no longer used on alarm/reminder cards due to tab-view gesture conflict)
│   └── UndoToast.tsx              Undo toast notification component
├── data/
│   ├── alarmSounds.ts             Legacy preset alarm sound definitions (backward compat)
│   ├── appOpenQuotes.ts           38 snarky quotes shown when opening the app
│   ├── guessWhyIcons.ts           38-icon array (+ custom) for icon picker + Guess Why game grid, organized into 6 categories
│   ├── guessWhyMessages.ts        Win (7), lose (6), skip (4) messages for Guess Why
│   ├── memoryRanks.ts             5 rank tiers + unranked, with emoji and color
│   ├── placeholders.ts            12 rotating placeholder strings for note input
│   ├── riddles.ts                 Daily riddle data
│   ├── snoozeMessages.ts          4 tiers of 3 escalating snooze shame messages
│   ├── timerPresets.ts            45 default timer presets + 1 custom entry (46 total)
│   └── triviaQuestions.ts         370+ built-in trivia questions across 10 categories (including 45 Kids questions)
├── navigation/
│   └── types.ts                   RootStackParamList with all screen route params
├── screens/
│   ├── AboutScreen.tsx            About page with app info
│   ├── AlarmFireScreen.tsx        Full-screen alarm UI with Dismiss, Snooze, Guess Why buttons
│   ├── AlarmListScreen.tsx        Main screen with fullscreenicon watermark, alarm list, timer tab, reminders tab, FAB, timer management
│   ├── CreateAlarmScreen.tsx      Create/edit alarm with single-field time input, schedule, nickname, note, 38 icons, sound, privacy
│   ├── CreateReminderScreen.tsx   Create/edit reminder with single-field time input, due date/time, 38 icons, privacy
│   ├── DailyRiddleScreen.tsx      Daily riddle mini-game; door.png background; online mode disabled
│   ├── ForgetLogScreen.tsx        Chronological log of forgotten/skipped alarms
│   ├── GamesScreen.tsx            Games hub with 5 game cards + stats; brain.png background; semi-transparent cards
│   ├── GuessWhyScreen.tsx         Mini-game: guess the alarm reason in 3 attempts; gameclock.png background
│   ├── MemoryMatchScreen.tsx      Card-flip matching game with 3 difficulties; oakbackground.png background
│   ├── MemoryScoreScreen.tsx      Stats dashboard with rank, streak, win/loss totals; library.png background; semi-transparent cards
│   ├── OnboardingScreen.tsx       Multi-slide onboarding with full-screen alarm permission slide
│   ├── ReminderScreen.tsx         Reminder list rendered as tab in AlarmListScreen; quotes, soft-delete, delete/done buttons, empty state text only
│   ├── SettingsScreen.tsx         Time format, vibration, timer sound, theme picker, send feedback, permissions, about; gear.png background; semi-transparent cards
│   ├── SudokuScreen.tsx           Full Sudoku with 3 difficulties, notes, pause, best scores; newspaper.png background
│   ├── TimerScreen.tsx            Timer preset grid + active countdown timers + pin-to-widget
│   └── TriviaScreen.tsx           Category-based trivia with 10 categories, difficulty filter, timer speed, online/offline modes; questionmark.png background
├── services/
│   ├── connectivity.ts            Network connectivity check utility
│   ├── forgetLog.ts               CRUD for ForgetEntry[] with runtime validation
│   ├── guessWhyStats.ts           Win/loss/skip/streak tracking with per-field numeric validation
│   ├── memoryScore.ts             Memory score utilities
│   ├── notifications.ts           @notifee scheduling, channels (static + dynamic per-sound), triggers, countdown, cancellation, fullScreenAction
│   ├── pendingAlarm.ts            Module-level bridge between headless background handler and React navigation tree
│   ├── quotes.ts                  12 motivational quotes assigned to alarms at creation
│   ├── reminderStorage.ts         Reminder CRUD operations
│   ├── riddleOnline.ts            Online riddle fetching service
│   ├── settings.ts                AppSettings load/save, getDefaultTimerSound/saveDefaultTimerSound
│   ├── storage.ts                 Alarm CRUD with migration, runtime type guards, disableAlarm cancels notifications
│   ├── timerStorage.ts            Timer presets, active timers (validated), recent tracking
│   ├── triviaAI.ts                Online trivia fetching from OpenTDB API
│   ├── triviaStorage.ts           Per-category trivia stats and seen-question tracking
│   └── widgetPins.ts              Pin/unpin timer presets (max 3) and alarms (max 3) for widget priority
├── theme/
│   ├── colors.ts                  ThemeColors interface, 8 presets, clampAccent(), generateCustomTheme()
│   └── ThemeContext.tsx            ThemeProvider + useTheme hook, persists to AsyncStorage
├── types/
│   ├── alarm.ts                   Alarm interface + AlarmCategory + AlarmDay types + day constants
│   ├── reminder.ts                Reminder interface
│   ├── timer.ts                   TimerPreset + ActiveTimer interfaces
│   └── trivia.ts                  Trivia question and stats types
├── utils/
│   ├── connectivity.ts            Network reachability check
│   ├── fullScreenPermission.ts    Runtime check for canUseFullScreenIntent + open system settings
│   ├── haptics.ts                 Haptic feedback utilities (light, medium, heavy)
│   ├── sudoku.ts                  Sudoku puzzle generator with backtracking, unique-solution validation
│   └── time.ts                    formatTime (12h/24h display) + getCurrentTime (24h string)
└── widget/
    ├── DetailedWidget.tsx         Detailed widget UI (FlexWidget + TextWidget, 2-column with schedule/duration)
    ├── TimerWidget.tsx            Compact widget UI (FlexWidget + TextWidget, 2-column)
    ├── updateWidget.ts            refreshTimerWidget() — triggers both widget re-renders
    └── widgetTaskHandler.ts       Headless JS handler for widget events + data loading logic; loads default timer sound for headless starts
```

Root files:
- `App.tsx` — SafeAreaProvider + ThemeProvider wrapper, navigation stack, three-layer notification navigation (initialState for cold start, foreground PRESS+DELIVERED handler, AppState fallback), `navigateToAlarmFire()` shared helper, `consumePendingAlarm()` for pending data, notification channel setup, orphaned timer cleanup, one-time alarm auto-disable, StatusBar mode switching
- `index.ts` — Registers `notifee.onBackgroundEvent` handler (stores pending alarm/timer data via `setPendingAlarm` for PRESS + DELIVERED events, handles DISMISSED for one-time auto-disable), `registerRootComponent`, and `registerWidgetTaskHandler`
- `app.json` — Expo config (v1.0.0, portrait, new arch, edge-to-edge Android, `dontforgetwhy://` scheme, 2 widget definitions, permissions, withAlarmWake + withNotifee plugins)
- `eas.json` — EAS Build profiles (development APK / preview APK / production)
- `plugins/withNotifee.js` — Custom Expo config plugin: adds permissions + lock-screen activity flags
- `plugins/withAlarmWake.js` — Custom Expo config plugin: injects `setShowWhenLocked(true)`, `setTurnScreenOn(true)`, `FLAG_KEEP_SCREEN_ON`, and `KeyguardManager.requestDismissKeyguard()` into MainActivity

## 6. Theme System

All 8 preset themes plus a custom theme generator. Every screen and component uses `useTheme()` and wraps styles in `useMemo(() => StyleSheet.create({...}), [colors, ...])` so the entire UI reacts to theme changes.

### Preset Themes

#### Dark Themes

**Midnight** (default)
| Property | Value |
|---|---|
| background | `#121220` |
| card | `#1E1E2E` |
| accent | `#4A90D9` |
| textPrimary | `#EAEAFF` |
| textSecondary | `#B0B0CC` |
| textTertiary | `#7A7A9E` |
| border | `#2A2A3E` |
| red | `#FF6B6B` |
| orange | `#FF9F43` |
| activeBackground | `#1A2A44` |

**Obsidian**
| Property | Value |
|---|---|
| background | `#1A1A1E` |
| card | `#28282E` |
| accent | `#A0A0B0` |
| textPrimary | `#E5E5EA` |
| textSecondary | `#AEAEB4` |
| textTertiary | `#6C6C72` |
| border | `#3A3A40` |
| red | `#FF6B6B` |
| orange | `#FF9F43` |
| activeBackground | `#36363C` |

**Forest**
| Property | Value |
|---|---|
| background | `#0E1A12` |
| card | `#1A2C1F` |
| accent | `#4CAF50` |
| textPrimary | `#E0F0E2` |
| textSecondary | `#A5C8A8` |
| textTertiary | `#6B8F6E` |
| border | `#2A3E2D` |
| red | `#FF6B6B` |
| orange | `#FF9F43` |
| activeBackground | `#1C3A22` |

**Royal**
| Property | Value |
|---|---|
| background | `#14101E` |
| card | `#211A30` |
| accent | `#9C6ADE` |
| textPrimary | `#EDE0FF` |
| textSecondary | `#B8A3D4` |
| textTertiary | `#7A6B94` |
| border | `#322642` |
| red | `#FF6B6B` |
| orange | `#FF9F43` |
| activeBackground | `#2C1C42` |

#### Light Themes

**Bubblegum**
| Property | Value |
|---|---|
| background | `#FFF0F5` |
| card | `#FFE0EB` |
| accent | `#E0389A` |
| textPrimary | `#2A0A18` |
| textSecondary | `#6B3050` |
| textTertiary | `#9E708A` |
| border | `#F0C0D5` |
| red | `#D32F2F` |
| orange | `#E67E22` |
| activeBackground | `#FFD0E0` |

**Sunshine**
| Property | Value |
|---|---|
| background | `#FFFDE7` |
| card | `#FFF8C4` |
| accent | `#E6A817` |
| textPrimary | `#1A1400` |
| textSecondary | `#6B5A20` |
| textTertiary | `#998755` |
| border | `#EFE0A0` |
| red | `#D32F2F` |
| orange | `#E67E22` |
| activeBackground | `#FFEEAA` |

**Ocean**
| Property | Value |
|---|---|
| background | `#F0F7FF` |
| card | `#E0EEFF` |
| accent | `#0077CC` |
| textPrimary | `#0A1520` |
| textSecondary | `#3A5570` |
| textTertiary | `#6A8090` |
| border | `#B8D4F0` |
| red | `#D32F2F` |
| orange | `#E67E22` |
| activeBackground | `#CCE2FF` |

**Mint**
| Property | Value |
|---|---|
| background | `#F0FFF4` |
| card | `#E0F5E8` |
| accent | `#10B981` |
| textPrimary | `#0A1A10` |
| textSecondary | `#305040` |
| textTertiary | `#608070` |
| border | `#B8E0C8` |
| red | `#D32F2F` |
| orange | `#E67E22` |
| activeBackground | `#C4ECD0` |

### Custom Theme Generator

`generateCustomTheme(accentHex)` in `colors.ts` generates a full `ThemeColors` from a single accent color:

1. **Clamp extreme colors** via `clampAccent()`: if luminance < 0.08, mix 25% toward white; if luminance > 0.92, mix 25% toward black
2. Compute luminance: `(0.299*R + 0.587*G + 0.114*B) / 255`
3. If luminance < 0.5 -> **dark theme**: mixes accent toward black for backgrounds, toward white for text
4. If luminance >= 0.5 -> **light theme**: mixes accent toward white for backgrounds, toward black for text

Dark theme mix ratios: background 85% black, card 72% black, textPrimary 88% white, textSecondary 60% white, textTertiary 35% white, border 60% black, activeBackground 65% black, red `#FF6B6B`, orange `#FF9F43`

Light theme mix ratios: background 90% white, card 78% white, textPrimary 88% black, textSecondary 62% black, textTertiary 40% black, border 60% white, activeBackground 68% white, red `#D32F2F`, orange `#E67E22`

### Hardcoded Colors (identical across all themes)

| Color | Property | Where |
|---|---|---|
| `rgba(34,139,34,0.85)` | overlayWin | GuessWhyScreen win overlay |
| `rgba(180,40,40,0.85)` | overlayLose | GuessWhyScreen lose overlay |
| `rgba(180,150,30,0.85)` | overlaySkip | GuessWhyScreen skip overlay |
| `rgba(0,0,0,0.7)` | modalOverlay | TimerScreen, SettingsScreen modal backdrop |
| `rgba(255,255,255,0.25)` | overlayButton | GuessWhyScreen overlay continue button |
| `#FFFFFF` | overlayText | Overlay text (always on colored bg) |
| `rgba(255,255,255,0.15)` | glass card bg | GamesScreen, SettingsScreen, MemoryScoreScreen, and game difficulty-select screens semi-transparent card backgrounds |
| `rgba(255,255,255,0.2)` | glass card border | GamesScreen, SettingsScreen, MemoryScoreScreen, and game difficulty-select screens semi-transparent card borders |
| Widget: `#121220` bg, `#1E1E2E` cell bg, `#EAEAFF` text, `#B0B0CC` secondary text, `#2A2A3E` border, `#4A90D9` pinned border | — | TimerWidget.tsx + DetailedWidget.tsx (hardcoded midnight theme) |
| Rank colors: `#FFD700`, `#4A90D9`, `#B0B0CC`, `#FF9F43`, `#FF6B6B`, `#7A7A9E` | — | memoryRanks.ts (data-driven) |

## 7. Icon Orders

### Alarm/Reminder Icons (38 icons + custom, `guessWhyIcons.ts`)

| # | Category | ID | Emoji |
|---|---|---|---|
| 1 | Health & Medical | meds | 💊 |
| 2 | Health & Medical | doctor | 🩺 |
| 3 | Health & Medical | medical | ⚕️ |
| 4 | Health & Medical | dentist | 🦷 |
| 5 | Events & Social | appointment | 📅 |
| 6 | Events & Social | meeting | 👥 |
| 7 | Events & Social | anniversary | 💍 |
| 8 | Events & Social | birthday | 🎂 |
| 9 | Events & Social | date | ❤️ |
| 10 | Events & Social | church | 🙏 |
| 11 | Events & Social | celebration | 🎉 |
| 12 | Work & Tasks | work | 💼 |
| 13 | Work & Tasks | bills | 💲 |
| 14 | Work & Tasks | homework | 📝 |
| 15 | Work & Tasks | documents | 📄 |
| 16 | Work & Tasks | computer | 💻 |
| 17 | Work & Tasks | phone | 📱 |
| 18 | Work & Tasks | mail | 📬 |
| 19 | Work & Tasks | school | 🏫 |
| 20 | Home & Errands | kids | 👶 |
| 21 | Home & Errands | pet | 🐾 |
| 22 | Home & Errands | meal | 🍽️ |
| 23 | Home & Errands | shopping | 🛒 |
| 24 | Home & Errands | delivery | 📦 |
| 25 | Home & Errands | car | 🚗 |
| 26 | Home & Errands | transit | 🚌 |
| 27 | Home & Errands | cleaning | 🧹 |
| 28 | Home & Errands | laundry | 👕 |
| 29 | Home & Errands | trash | 🗑 |
| 30 | Home & Errands | door | 🔒 |
| 31 | Home & Errands | plant | 🌱 |
| 32 | Self-Care & Wellness | dumbbell | 🏋️ |
| 33 | Self-Care & Wellness | yoga | 🧘 |
| 34 | Self-Care & Wellness | hydrate | 💧 |
| 35 | Self-Care & Wellness | shower | 🚿 |
| 36 | Self-Care & Wellness | bedtime | 🛏️ |
| 37 | Self-Care & Wellness | haircut | 💇 |
| 38 | Travel & Other | travel | ✈️ |
| 39 | Travel & Other | auction | 🔨 |
| 40 | Travel & Other | book | 📖 |
| — | — | custom | ➕ |

### Timer Presets (46 presets, `timerPresets.ts`)

| # | ID | Icon | Label | Default Duration |
|---|---|---|---|---|
| 1 | pizza | 🍕 | Pizza | 12 min |
| 2 | laundry | 👕 | Laundry | 45 min |
| 3 | stove | 🔥 | Stove | 20 min |
| 4 | break | ☕ | Break | 15 min |
| 5 | lunch | 🍽️ | Meal | 1 h |
| 6 | nap | 😴 | Nap | 30 min |
| 7 | workout | 🏋️ | Workout | 45 min |
| 8 | yoga | 🧘 | Yoga | 20 min |
| 9 | meds | 💊 | Meds | 5 min |
| 10 | doctor | 🩺 | Doctor | 30 min |
| 11 | medical | ⚕️ | Medical | 4 h |
| 12 | hydrate | 💧 | Hydrate | 30 min |
| 13 | shopping | 🛒 | Shopping | 1 h |
| 14 | tea | 🫖 | Tea | 4 min |
| 15 | eggs | 🥚 | Eggs | 10 min |
| 16 | microwave | ♨️ | Microwave | 2 min |
| 17 | pet | 🐾 | Pet | 15 min |
| 18 | kids | 👶 | Kids | 30 min |
| 19 | parking | 🅿️ | Parking | 1 h |
| 20 | delivery | 📦 | Delivery | 30 min |
| 21 | grill | 🥩 | Grill | 15 min |
| 22 | bath | 🛁 | Bath | 20 min |
| 23 | charge | 🔋 | Charge | 45 min |
| 24 | game | 🎮 | Game | 1 h |
| 25 | meeting | 👥 | Meeting | 30 min |
| 26 | work | 💼 | Work | 1 h |
| 27 | homework | 📝 | Homework | 30 min |
| 28 | book | 📖 | Book | 30 min |
| 29 | celebration | 🎉 | Celebration | 1 h |
| 30 | cleaning | 🧹 | Cleaning | 30 min |
| 31 | dishwasher | 🫧 | Dishes | 1 h |
| 32 | plant | 🌱 | Plant | 15 min |
| 33 | heater | 🌡 | Heater | 30 min |
| 34 | water | 🚰 | Water | 10 min |
| 35 | door | 🔒 | Door | 1 min |
| 36 | garage | 🚗 | Garage | 1 min |
| 37 | trash | 🗑 | Trash | 5 min |
| 38 | school | 🏫 | School | 1 h |
| 39 | computer | 💻 | Computer | 30 min |
| 40 | documents | 📄 | Docs | 5 min |
| 41 | auction | 🔨 | Auction | 10 min |
| 42 | car | 🚗 | Car | 30 min |
| 43 | transit | 🚌 | Transit | 15 min |
| — | custom | ➕ | Custom | 0 (prompts modal) |

## 8. Icon-to-Category Mapping

Defined in `CreateAlarmScreen.tsx` via `iconCategoryMap`. When a user selects an icon, the alarm's category is set automatically. Icons not in this map default to `'general'`.

| Icon | ID | Category |
|---|---|---|
| 💊 | meds | `meds` |
| ⚕️ | medical | `meds` |
| 🩺 | doctor | `appointment` |
| 🦷 | dentist | `appointment` |
| 📅 | appointment | `appointment` |
| 💇 | haircut | `appointment` |
| 💍 | anniversary | `event` |
| 🎂 | birthday | `event` |
| ❤️ | date | `event` |
| 🙏 | church | `event` |
| 🎉 | celebration | `event` |
| 👥 | meeting | `task` |
| 💼 | work | `task` |
| 💲 | bills | `task` |
| 📝 | homework | `task` |
| 📄 | documents | `task` |
| 📦 | delivery | `task` |
| 🏋️ | dumbbell | `self-care` |
| 🧘 | yoga | `self-care` |
| 💧 | hydrate | `self-care` |
| 🚿 | shower | `self-care` |
| 🛏️ | bedtime | `self-care` |
| *(all others)* | — | `general` |

Category display labels on alarm cards:
- meds -> "💊 Meds"
- appointment -> "📅 Appt"
- event -> "🎉 Event"
- task -> "✅ Task"
- self-care -> "🧘 Self-Care"
- general -> "🔔 General"

## 9. Alarm Card Display Logic

`AlarmCard.tsx` determines what to display based on three states: Guess Why mode, private mode, and normal mode.

### When Guess Why is enabled (`guessWhyEnabled` prop is true)
- **Detail text**: Deterministic mystery text from a pool of 6 witty messages, selected by hashing the alarm ID (`hash = (hash * 31 + charCode) | 0`). Same alarm always shows the same mystery text.
- **Category label**: Shows "❓ ???" instead of the real category
- **Schedule label**: Hidden entirely
- **Private peek button**: Hidden
- **Mystery text pool**: "❓ Can you remember?", "❓ Mystery Alarm", "❓ Think hard...", "❓ What was this for?", "🤔 ???", "🧠 Brain check incoming"

### When Guess Why is disabled — normal mode
Uses `getDetailLine(alarm)` to determine the detail text:
1. **Icon + nickname** -> `"${icon} ${nickname}"`
2. **Icon only** -> just the emoji
3. **Nickname only** -> `"${nickname} 🔒"` (lock indicates no icon set)
4. **Neither** -> the alarm note text

**Private alarm behavior** (when `alarm.private` is true and not revealed):
- Detail line shows "🔒 Private Alarm" in muted style
- Eye icon button appears for private alarms only
- Tapping the eye reveals the real detail line for 3 seconds, then auto-hides

**Schedule label** (shown below category):
- One-time with date -> formatted date (e.g. "Jan 15, 2026")
- All 7 days -> "Daily"
- Mon-Fri -> "Weekdays"
- Sat-Sun -> "Weekends"
- Other -> comma-separated day names (e.g. "Mon, Wed, Fri")

### Always visible regardless of mode
- **Time display**: `formatTime(alarm.time, timeFormat)` — respects 12h/24h setting
- **Pin icon**: Shows 📌 next to time when alarm is pinned to widget
- **Enable/disable switch**
- **Pin button**: Toggle pin to widget
- **Tap-to-edit**: Tapping the card opens CreateAlarmScreen in edit mode (pencil icon removed)
- **Delete button**: Red "Delete" text button; tapping shows confirmation Alert before soft-deleting

**Disabled state**: Entire card at `opacity: 0.5` when `alarm.enabled` is false.

## 10. Notification Privacy Rules

Defined in `notifications.ts`. The alarm note (the "why") is **never** included in the notification. This is the core privacy contract.

### When Guess Why is enabled
- **Title**: "⏰ Alarm!"
- **Body**: "🧠 Can you remember why?"

### When Guess Why is disabled
**Title**: `"${icon} ${CATEGORY}"` if the alarm has an icon, otherwise `"⏰ ${CATEGORY}"`

**Body** (priority order):
1. If `alarm.private`:
   - Nickname -> show nickname
   - No nickname but icon -> show icon emoji
   - Neither -> `"Alarm"`
2. If not private:
   - Nickname -> show nickname
   - No nickname but icon -> show icon emoji
   - Neither -> `"Time to do the thing!"`

### Notification Channels

**Static channels** (created once at startup):

**Alarms v2** (`alarms_v2`): importance HIGH, sound `'alarm'` (system alarm sound), vibration [300, 300], lights red, bypassDnd true. Default channel for all alarm and timer completion notifications.

**Alarms Legacy** (`alarms`): importance HIGH, sound default. Kept for backward compatibility with older notification IDs.

**Alarms Gentle/Urgent/Classic/Digital/Silent**: Preset alarm style channels with varying vibration patterns and importance levels, selectable per-alarm via sound preset ID.

**Timer Progress** (`timer-progress`): importance DEFAULT, vibration false. Used for ongoing countdown chronometer.

**Reminders** (`reminders`): importance DEFAULT, sound default, vibration true.

**Dynamic channels** (created on demand):

**Custom alarm sound** (`alarm_custom_{mediaId}`): Created by `getOrCreateSoundChannel()` when an alarm has a `soundUri`. Channel ID derived deterministically from the content:// URI's numeric media ID via `extractMediaId()`. importance HIGH, bypassDnd, vibration [300, 300, 300, 300], sound set to the content:// URI.

**Custom timer sound** (`timer_custom_{mediaId}`): Same as above but with `timer_custom_` prefix. Created when the user has selected a default timer sound in Settings.

Android notification channels are **immutable after creation** (Android 8+). Changing a channel's sound requires creating a new channel with a different ID. Old channels are left in place. Channel IDs are deterministic so the same sound URI always maps to the same channel.

### Alarm Notification Settings
fullScreenAction with `launchActivity` (wakes screen over lock screen), importance HIGH, loopSound, ongoing, autoCancel false, vibrationPattern [300, 300, 300, 300], lights, category ALARM. Channel resolved in order: (1) custom system sound via `soundUri` -> dynamic `alarm_custom_` channel, (2) preset sound ID -> static channel from `alarmSounds.ts`, (3) default -> `alarms_v2` channel.

### Timer Notifications (two per timer)
1. **Completion notification**: Timestamp trigger at exact completion time, alarm-style settings with fullScreenAction. Data: `{ timerId }`. Uses custom timer sound channel (`timer_custom_{mediaId}`) if configured in Settings, otherwise falls back to `alarms_v2` channel. Sound loaded via `getDefaultTimerSound()` at timer start and on resume.
2. **Countdown notification**: Ongoing display with Android chronometer counting down. ID: `countdown-${timerId}`. Uses `timer-progress` channel.

### Alarm Scheduling

**Recurring — all 7 days**: Single `TIMESTAMP` trigger with `RepeatFrequency.DAILY` + `alarmManager.allowWhileIdle`. Returns 1 notification ID.

**Recurring — specific days**: One `TIMESTAMP` trigger per selected day with `RepeatFrequency.WEEKLY`. Each calculates next occurrence of that weekday. Returns N notification IDs (one per day).

**One-time**: Single `TIMESTAMP` trigger at exact date+time, no repeat. `getOneTimeTimestamp` throws if time is in the past. Returns 1 notification ID.

### Event Handling

**Three-layer navigation system** ensures AlarmFireScreen is shown regardless of app state:

**Layer 1 — Cold start** (`initialState` in App.tsx): During app initialization, checks `getPendingAlarm()` (module-level variable set by background handler) and `notifee.getInitialNotification()`. If pending alarm/timer data exists, sets `initialState` to navigate directly to AlarmFireScreen. This avoids any flash of AlarmListScreen.

**Layer 2 — Foreground handler** (`notifee.onForegroundEvent` in App.tsx): Handles `EventType.PRESS` (user tapped notification) and `EventType.DELIVERED` (notification displayed, e.g. fullScreenAction wake). Filters out non-alarm notifications (countdown, reminders). Clears pending data, then navigates via `navigation.reset()` to AlarmFireScreen. Does NOT cancel notifications in the handler — sound plays from the notification.

**Layer 3 — AppState fallback** (App.tsx): `AppState` listener checks for pending alarm data when app transitions to `'active'` state. Catches edge cases where background handler stored data but foreground handler didn't fire.

**Background handler** (`notifee.onBackgroundEvent` in `index.ts`): Registered before app component. Stores pending alarm/timer data via `setPendingAlarm()` for PRESS and DELIVERED events. Also handles DISMISSED events to auto-disable one-time alarms.

**IMPORTANT**: `EventType.TRIGGER_NOTIFICATION_CREATED` (type 7) fires when a notification is SCHEDULED, not when it fires. It is NOT used for navigation — only PRESS (1) and DELIVERED (3) trigger AlarmFireScreen.

### Android Manifest

**Via `plugins/withNotifee.js`**:
- `USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`
- MainActivity: `showWhenLocked="true"`, `turnScreenOn="true"`

**Via `plugins/withAlarmWake.js`**:
- MainActivity `onCreate`: `setShowWhenLocked(true)`, `setTurnScreenOn(true)`, `FLAG_KEEP_SCREEN_ON`
- `KeyguardManager.requestDismissKeyguard()` to dismiss lock screen when alarm fires

## 11. Widget System

Two Android home screen widgets built with `react-native-android-widget`.

### Compact Widget (`TimerWidget`, 180x110dp)
Two-column layout: Timers (left, 3 cells) + Alarms (right, 3 cells). Timer cells have `clickAction: START_TIMER__${presetId}`. Alarm cells have `clickAction: OPEN_APP`. Empty cells show "—".

### Detailed Widget (`DetailedWidget`, 180x170dp)
Same two-column layout but cells include extra detail: timer cells show duration string, alarm cells show schedule string (Daily, Weekdays, date, etc.).

### Widget Data Loading

**Preset loading** (`getWidgetPresets` / `getDetailedPresets`): Returns up to 3 presets in priority order:
1. Pinned presets (from `widgetPinnedPresets`, marked `isPinned: true`)
2. Recently-used presets (from `recentPresets` key)
3. Default presets (from `timerPresets.ts`, excluding custom)

**Alarm loading** (`getWidgetAlarms` / `getDetailedAlarms`): Returns up to 3 enabled alarms:
1. Pinned alarms (from `widgetPinnedAlarms`)
2. Remaining enabled alarms sorted by next fire time (computed via `getNextFireTime`)
3. When Guess Why is enabled, alarm labels show "Mystery" and icons show "❓"

### Widget Click -> Timer Start Flow
1. User taps a preset cell on the widget
2. `widgetTaskHandler` receives `WIDGET_CLICK` with `clickAction: 'START_TIMER__${presetId}'`
3. Loads preset data (respects custom durations) via `loadPresets()`
4. Generates unique timer ID: `Date.now().toString() + Math.random().toString(36).slice(2)`
5. Loads default timer sound via `getDefaultTimerSound()` (for custom notification channel)
6. Schedules completion notification (with custom sound if configured) + countdown notification
7. Saves timer to AsyncStorage via `addActiveTimer`
8. Records preset usage via `recordPresetUsage`
9. Refreshes both widgets with updated data

### Widget Colors (hardcoded midnight theme)
- Background: `#121220`
- Cell background: `#1E1E2E`
- Text: `#EAEAFF`
- Secondary text: `#B0B0CC`
- Border: `#2A2A3E`
- Pinned border: `#4A90D9`

### Pin Limits
- Timer presets: max 3 pins (`widgetPinnedPresets`)
- Alarms: max 3 pins (`widgetPinnedAlarms`)
- `ToastAndroid` feedback: "Pinned to widget" / "Unpinned from widget" / "Widget full — unpin one first"

### Widget Actions
- `WIDGET_ADDED` / `WIDGET_UPDATE` / `WIDGET_RESIZED`: Re-render the widget with fresh data
- `WIDGET_CLICK` with `OPEN_APP`: Opens app via `dontforgetwhy://` deep link
- `WIDGET_CLICK` with `START_TIMER__${id}`: Starts timer headlessly

## 12. Alarm Scheduling Details

### Scheduling Logic (`notifications.ts`)

```
scheduleAlarm(alarm) -> string[] (notification IDs)

if mode === 'one-time' && date:
  -> single TIMESTAMP trigger at exact date+time, no repeat
  -> throws if timestamp is in the past

if days.length === 7:
  -> single TIMESTAMP trigger with RepeatFrequency.DAILY
  -> uses getNextAlarmTimestamp (if today's time passed, schedule for tomorrow)

if days.length < 7:
  -> one TIMESTAMP trigger per selected day with RepeatFrequency.WEEKLY
  -> uses getNextDayTimestamp (calculates next occurrence of each weekday)
```

### Notification Lifecycle
- **Create**: `scheduleAlarm` called on alarm save (new or edit), toggle on
- **Cancel**: `cancelAlarmNotifications(ids)` called on alarm toggle off, delete, or edit (before reschedule); `disableAlarm()` also cancels all notifications
- **Auto-disable**: One-time alarms call `disableAlarm(id)` in App.tsx after navigating to fire screen
- **All notification IDs** stored in `alarm.notificationIds[]` (one per scheduled trigger)

### Migration (`storage.ts`)
`migrateAlarm()` handles legacy formats:
- Old single `notificationId` string -> `notificationIds` array
- Missing `mode` -> defaults to `'recurring'`
- Empty or numeric `days` -> defaults to all days
- Missing `date` -> defaults to null

## 13. Mini-Games

### Memory Match (`MemoryMatchScreen.tsx`)

Card-flip matching game with `oakbackground.png` background image (`rgba(0,0,0,0.6)` overlay). Find all matching pairs of emoji cards.

**Difficulties**:
| Level | Grid | Pairs | Par |
|---|---|---|---|
| Easy | 3x4 | 6 | 8 moves |
| Medium | 4x4 | 8 | 12 moves |
| Hard | 5x4 | 10 | 16 moves |

**Emoji pool**: 22 unique emojis (🍕, 🎸, 🚀, 🌈, 🎯, 🧩, 🎪, 🦊, 🌺, 🎭, 🍩, 🦋, 🎨, 🔮, 🎲, 🌙, 🦄, 🎵, 🍀, 🐙, 🎈, 🏆), randomly selected per game.

**Mechanics**:
- Timer starts on first card flip
- Cards animate via `Animated.timing` on `scaleX` (0 -> 1 for flip, 300ms duration)
- Mismatched cards flip back after 800ms delay
- Matched cards stay face-up with accent border and 0.7 opacity
- Processing lock prevents tapping during flip-back animation

**Star rating**: Below par = 3 stars, at par = 2 stars, above par = 1 star.

**Win messages**: 3 tiers of 6 messages each (great/ok/bad), selected based on moves vs par.

**Best scores**: Stored per difficulty in `memoryMatchScores` AsyncStorage key. Tracked by best moves (primary) and best time (tiebreaker).

### Sudoku (`SudokuScreen.tsx` + `utils/sudoku.ts`)

Full 9x9 Sudoku with `newspaper.png` background image (`rgba(0,0,0,0.65)` overlay), newspaper-style visual design, puzzle generation, pencil notes, and difficulty-scaled assistance. Grid has fully transparent background (newspaper image shows through), given numbers in black/dark bold, player-entered numbers in dark gray/blue, visible border around outer edge, inner grid lines with thicker 3x3 box borders — styled like a real Sudoku puzzle printed on newspaper.

**Puzzle Generator** (`generatePuzzle(difficulty)`):
- Generates a complete solution via `solveFull()` (backtracking with randomized number order)
- Removes cells symmetrically with unique-solution validation via `countSolutions(grid, 2)`
- Removal targets: easy 30-35, medium 40-45, hard 50-55 cells removed
- 500ms timeout with fallback (simple 30-cell removal without uniqueness check)

**Difficulties**:
| Level | Clues | Cells Removed |
|---|---|---|
| Easy | 46-51 | 30-35 |
| Medium | 36-41 | 40-45 |
| Hard | 26-31 | 50-55 |

**Difficulty-Scaled Assistance**:
| Feature | Easy | Medium | Hard |
|---|---|---|---|
| Show wrong numbers (red) | Yes | Yes | No |
| Highlight row/col/box | Yes | Yes | No |
| Remaining number counts | Yes | No | No |
| Show mistakes during play | Yes | Yes | No |

**Game phases**: select -> playing -> paused -> won

**Features**:
- Pencil notes: Toggle notes mode, tap numbers to add/remove candidates per cell
- Auto-clear notes: When a number is placed, that number is removed from notes in the same row, column, and box
- Erase: Clear cell value and notes
- Pause: Stops timer, saves game to AsyncStorage, hides board
- Save/resume: Game state (puzzle, solution, player grid, notes, mistakes, elapsed) saved to `sudokuCurrentGame` key
- New game confirmation: Alert when starting new game with progress in progress

**Star rating**: 0 mistakes = 3 stars, 1-3 mistakes = 2 stars, 4+ mistakes = 1 star.

**Hard mode reveal**: On win, shows "Let's see how you actually did..." before revealing star rating (since errors weren't shown during play).

**Win messages**: 6 snarky messages randomly selected.

**Best scores**: Stored per difficulty in `sudokuBestScores` key. Tracked by best time (primary) and best mistakes (tiebreaker).

### Trivia (`TriviaScreen.tsx` + `triviaAI.ts` + `triviaQuestions.ts`)

Category-based trivia with `questionmark.png` background image (`rgba(0,0,0,0.55)` overlay) and dual question sources.

**10 Categories**:
| Category | Emoji | OpenTDB ID | Notes |
|---|---|---|---|
| Science & Nature | 🔬 | 17 | |
| History | 🏛️ | 23 | |
| Music | 🎵 | 12 | |
| Movies & TV | 🎬 | 11 or 14 (random) | |
| Geography | 🌍 | 22 | |
| Sports | 🏆 | 21 | |
| Technology | 💻 | 18 | |
| Food & Drink | 🍽️ | — | Offline only |
| General Knowledge | 🧠 | 9 | |
| Kids | 🧒 | — | Offline only, 45 age-appropriate questions |

Music and Movies & TV were split from a former "Pop Culture" category. Old Pop Culture seen-question tracking was cleared for a fresh start on the new categories.

**Difficulty filter**: Pill selectors for All, Easy, Medium, Hard. Filters offline question pool by difficulty; passes difficulty to OpenTDB API for online mode.

**Timer speed**: Three options — Relaxed (25s), Normal (15s), Blitz (8s). Pill selectors control the per-question countdown timer.

**Category grid layout**: 10 categories; 2-column grid with General Knowledge centered alone on a bottom row. Kids shown in grid.

**Question sources**:
- **Online**: Fetches from OpenTDB API by category ID. Movies & TV randomly picks between OpenTDB categories 11 (Film) and 14 (Television). **Currently disabled** — button dimmed with "Coming soon" alert. Food and Kids categories excluded from online mode.
- **Offline**: 370+ built-in questions in `triviaQuestions.ts` (including 45 Kids questions), used as fallback or when offline.

**General Knowledge**: Pulls from ALL categories (grab bag design) in addition to its own dedicated questions. Seen-question reset fires at 0 remaining (not < 10).

**Stats**: Per-category tracking of games played, correct answers, and streaks.

### Daily Riddle (`DailyRiddleScreen.tsx`)

Daily riddle mini-game with `door.png` background image (`rgba(0,0,0,0.55)` overlay). Daily mode vs Browse mode toggle. Offline riddle bank with search and category filters (memory, classic, logic, wordplay, quick). Streak tracking and hint system. Seen/unseen tracking. "Fresh Riddles" (online) tab disabled with `pointerEvents="none"`, `opacity: 0.4`, and "Online riddles coming soon" text.

## 14. Background Images & Visual Effects

### Game Screen Backgrounds
Eight screens use `ImageBackground` with semi-transparent dark overlays:

| Screen | Asset | Overlay |
|---|---|---|
| Games Hub | `brain.png` | `rgba(0,0,0,0.55)` |
| Settings | `gear.png` | `rgba(0,0,0,0.6)` |
| Trivia | `questionmark.png` | `rgba(0,0,0,0.55)` |
| Daily Riddle | `door.png` | `rgba(0,0,0,0.55)` |
| Memory Match | `oakbackground.png` | `rgba(0,0,0,0.6)` |
| Sudoku | `newspaper.png` | `rgba(0,0,0,0.65)` |
| Guess Why | `gameclock.png` | `rgba(0,0,0,0.55)` |
| Memory Score / Stats | `library.png` | dark overlay |

### Semi-Transparent Glass Cards
Games Hub, Settings, Memory Score / Stats, and game difficulty-select screens (Sudoku, Memory Match, Trivia) use glass-style cards:
- Background: `rgba(255,255,255,0.15)`
- Border: `rgba(255,255,255,0.2)`
- Replaces opaque `colors.card` backgrounds; background images visible through cards

### App Icon Watermark
AlarmListScreen renders `fullscreenicon.png` as a full-screen watermark:
- First child of root container (behind header, tabs, and all tab content)
- `position: absolute`, `top/left/right/bottom: 0`, `width/height: 100%`
- `resizeMode="cover"`, `opacity: 0.07`, `pointerEvents="none"`
- Single shared watermark visible across all three tabs (Alarms, Timers, Reminders)

## 15. Remaining / Planned Features

- **Widget theme matching** — Widgets currently use hardcoded midnight theme colors; could match the user's selected theme
- **Online mode** — Trivia and Daily Riddle online modes are built but disabled with "Coming soon" messaging
- **Play Store publication** — App is configured for production builds via EAS but not yet published

## 16. Features Explored and Removed

- **Preset alarm sound picker** — An early version had 6 preset alarm sounds (`alarmSounds.ts`: Default, Gentle, Urgent, Classic, Digital, Silent) with static Notifee channels per preset. These all used `sound: 'default'` and sounded identical on most devices. Replaced by the real system ringtone picker (Feature 54) using `react-native-notification-sounds` + dynamic channels with actual content:// URIs. The preset channel definitions remain in `notifications.ts` for backward compatibility but the picker UI was removed from Settings.
- **Swipe between tabs (PanResponder version)** — Initial attempt using a manual PanResponder on the tab content area; removed due to gesture conflicts with SwipeableRow swipe-to-delete/complete actions on alarm cards and reminder items. **Re-implemented successfully** in Feature 62 using `react-native-tab-view` + `react-native-pager-view`, which resolve gesture conflicts at the native level (Android ViewPager2 defers to child gesture handlers).
- **SwipeableRow swipe-to-delete/complete on alarm and reminder cards** — Horizontal swipe gestures on alarm cards (swipe-to-delete) and reminder cards (swipe-to-delete + swipe-to-complete) conflicted with `react-native-tab-view` horizontal tab swiping. Native ViewPager2 gesture priority couldn't reliably disambiguate same-axis swipes. Replaced with tap-based buttons: red "Delete" text button (with confirmation Alert) on alarm and reminder cards, green "Done" text button on reminder cards. SwipeableRow component may still exist but is no longer used on main list cards.

## 17. Key Implementation Patterns

### Android Notification Channel Immutability
Channels cannot be modified after creation on Android 8+. Changing a sound means creating a new channel with a new ID. `getOrCreateSoundChannel()` derives channel IDs deterministically from the content:// URI's numeric media ID (`extractMediaId()`), so the same sound always maps to the same channel. Old channels accumulate but are harmless.

### expo-av Audio Mode Initialization
expo-av 16.x requires `Audio.setAudioModeAsync()` to complete before `playAsync()` can acquire audio focus. SoundPickerModal uses `ensureAudioMode()` as the single awaited path for audio configuration — no fire-and-forget `setAudioModeAsync` in useEffect. The `audioModeReady` ref tracks whether setup has completed; `ensureAudioMode()` returns immediately if true, otherwise awaits a fresh `setAudioModeAsync` call. An `isActiveRef` guard prevents race conditions: if the modal closes during an async `createAsync`, the newly created sound is immediately unloaded. `handlePlay` checks `isActiveRef` at multiple async boundaries. This prevents both the "AudioFocusNotAcquiredException" and leaked audio resources.

### Pending Alarm Bridge (`pendingAlarm.ts`)
Background notification events fire in a headless JS context before the React tree is mounted. `pendingAlarm.ts` provides a module-level variable bridge: `setPendingAlarm()` stores alarm/timer data synchronously, `getPendingAlarm()` retrieves it, `clearPendingAlarm()` clears it. App.tsx reads this during initialization to set `initialState` for the NavigationContainer, ensuring AlarmFireScreen is the first screen shown on cold start — no flash of AlarmListScreen.

### Alarm Sound Lifecycle
Sound plays FROM the notification via Notifee's `loopSound` setting. Cancelling the notification stops the sound. Therefore:
- AlarmFireScreen does NOT cancel notifications on mount (would kill the sound)
- Notifications are only cancelled when the user takes action: Dismiss, Snooze, or Guess Why
- `cancelAllNotifications()` in AlarmFireScreen handles all notification cleanup
- GuessWhy button: cancels everything BEFORE navigating — game plays in silence
- When returning from GuessWhy (`postGuessWhy: true`), only defensive `Vibration.cancel()` runs

### Single-Field Time Input Pattern
Both CreateAlarmScreen and CreateReminderScreen use the same auto-formatting time input:
- `rawDigits` state: stores only numeric characters (max 4)
- `formatTimeDisplay(digits)`: inserts colon for display — "630" → "6:30", "0630" → "06:30"
- `parseRawDigits(digits)`: extracts hours/minutes — last 2 digits are minutes, rest is hours
- `handleTimeInput(text)`: strips non-digits from input, caps at 4 chars
- On save: `parseRawDigits` → clamp hours/minutes → convert 12h→24h if needed → format as "HH:MM"

### Dependencies
- `react-native-notification-sounds` — Lists system ringtones/alarm/notification sounds on Android. Returns `{ title, url, soundID }[]` where `url` is a `content://media/internal/audio/media/{id}` URI.
- `expo-av` (~16.0.8) — Audio preview playback in SoundPickerModal. Deprecated in SDK 54 (replaced by `expo-audio`/`expo-video`) but functional.
- `expo-keep-awake` — Keeps screen awake on AlarmFireScreen via `useKeepAwake()`.
- `react-native-tab-view` (^4.2.2) — Tab view component with swipe gesture support; provides `TabView` with `lazy` rendering, custom `renderTabBar`, and `onIndexChange`. Used for horizontal swipe navigation between Alarms/Timers/Reminders tabs.
- `react-native-pager-view` (6.9.1) — Native Android ViewPager2 backend for `react-native-tab-view`. Handles horizontal swipe page navigation at the native level. **Requires a new EAS build** (native module). Note: SwipeableRow swipe gestures on alarm/reminder cards conflicted with page swiping (same-axis), leading to their replacement with tap buttons.
- `react-native-android-widget` (~0.20.1) — Android home screen widget support with FlexWidget/TextWidget components.
- `reanimated-color-picker` (^4.2.0) — Color picker for custom theme accent selection, built on react-native-reanimated.

## 18. Development Workflow

### Four-AI Team
- **Opus** (Claude Opus) — Architecture decisions, system design, complex problem-solving
- **Claude Code** (CLI) — Implementation, code generation, file editing, TypeScript compilation checks
- **Codex** (OpenAI) — Primary code auditor, finds bugs and edge cases
- **Gemini CLI** (Google) — Fast second-opinion auditor, confirms or challenges Codex findings

### Completed Audits

**Audit 9: Custom Sound System**
- Notification-level sound override via dynamic channels
- Sound leak prevention in SoundPickerModal
- Timer resume state with custom sound channels
- expo-av AudioFocusNotAcquiredException fix

**Audit 10: Trivia & Bug Fixes**
- Trivia seen-question reset fires at 0 remaining (not < 10)
- General Knowledge pulls from ALL categories (grab bag design)
- Vibration paths verified across background, foreground, cold start
- `disableAlarm` now cancels all scheduled notifications
- `soundID` persisted for picker checkmark state
- Stale reminder count in subtitle fixed

**Audit 11: Swipe Tabs, Soft Delete & Empty States**
- Swipe between tabs via `react-native-tab-view` + `react-native-pager-view` — gesture conflict with SwipeableRow initially resolved at native level (later replaced with tap buttons in Audit 13)
- Soft delete / trash system for alarms and reminders with restore and permanent delete
- Empty state rendering fixed: `loadAlarms(true)` / `getReminders(true)` load soft-deleted items; empty state condition now checks `hasNonDeletedAlarms` / `totalActiveReminders` instead of raw array length
- Reminder empty state correctly distinguishes between "zero active reminders" (show text-only empty state) and "filter yields no results" (show "No matches" fallback)
- Timer empty state removed (preset grid IS the content)
- App icon (120x120, opacity 0.35) initially replaced all emoji-based empty state icons (later removed from Alarms and Reminders tabs in Audit 13; text only)
- Reminder quotes added using shared `appOpenQuotes.ts` pool
- Reminder icon-only save validation fixed (accepts text or icon)

**Audit 12: Icon Reorganization, Trivia Expansion & UI Polish**
- Icon set expanded from 25 to 38 with 6 organized categories
- Timer presets expanded from 36 to 46
- `iconCategoryMap` expanded to 22 entries with new `event` category (6 categories total: meds, appointment, event, task, self-care, general)
- Tap-to-edit on alarm and reminder cards (pencil icon removed)
- Send Feedback email card in Settings (baldguyandcompanygames@gmail.com)
- Trivia difficulty filter (Easy/Medium/Hard/All)
- Trivia timer speed (Relaxed 25s / Normal 15s / Blitz 8s)
- Kids trivia category (45 age-appropriate questions, offline only)
- Music and Movies & TV trivia categories (10 total, split from Pop Culture)
- Online mode disabled with "Coming soon" for Trivia and Daily Riddle
- Background images on 7 game screens with dark overlays
- Semi-transparent glass-style cards on Games Hub and Settings
- Full-screen app icon watermark on main alarm/timer/reminder tabs

**Audit 13: Delete Mechanism, Visual Polish & Privacy Fixes**
- SwipeableRow swipe-to-delete/complete removed from alarm and reminder cards (gesture conflict with react-native-tab-view tab swiping)
- Replaced with tap-based buttons: red "Delete" text button with confirmation Alert on alarm and reminder cards, green "Done" button on reminder cards
- UndoToast still triggers on soft-delete
- Sort & Filter toggle button always visible on empty states (access "Deleted" filter to restore trashed items)
- Sudoku grid restyled as newspaper puzzle: transparent background, bold given numbers, styled grid lines with thicker 3x3 box borders
- Memory Score / Stats screen: `library.png` background image with dark overlay and semi-transparent cards
- Semi-transparent glass-style cards extended to Sudoku, Memory Match, and Trivia difficulty-select screens
- Empty state icon/image removed from Alarms and Reminders tabs (text only)
- Trivia crash fix: guard for empty question array when category + difficulty yields no results (e.g. Kids + Hard)
- Snooze privacy fix: notification body hides note when `alarm.private` is true OR `guessWhyEnabled` is true (was only checking `guessWhyEnabled`)
- Games Hub Trivia description updated to "10 categories. 370+ questions offline."
