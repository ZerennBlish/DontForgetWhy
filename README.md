# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off. Includes a full timer system with quick-tap presets, two home screen widgets (compact + detailed) with pinnable presets and alarms, a "Guess Why" memory mini-game that hides alarm details across the entire UI, recurring and one-time alarm scheduling, Memory Match and Sudoku mini-games, escalating snooze shame, a full theme system with 8 presets + custom color picker, and a sarcastic personality throughout.

## 1. Features List

1. **Alarm creation** — Set time (12h with AM/PM or 24h based on settings), add a note explaining *why*, optional nickname, optional icon (25 emojis), optional private toggle
2. **Alarm editing** — Tap edit on any alarm card to modify time, nickname, note, icon, privacy, mode, and schedule; reschedules notifications on save
3. **Recurring alarm mode** — Select specific days of the week (Mon-Sun) with quick-select buttons for Weekdays, Weekends, or All Days; one weekly trigger per selected day
4. **One-time alarm mode** — Select a specific date from an inline calendar picker; rejects past dates and times; no repeat
5. **Alarm list** — Main screen shows all alarms with enable/disable switch, edit button, delete button (with confirmation), and pin-to-widget button
6. **Alarms / Timers tab switcher** — Pill-shaped toggle on the main screen switches between alarm list and timer grid
7. **One-time auto-disable** — One-time alarms are automatically disabled after firing (via `disableAlarm` in App.tsx)
8. **12/24 hour time format** — Setting in SettingsScreen; affects alarm card display, fire screen display, widget display, and time input format on create/edit screen
9. **Icon picker** — 25-emoji grid on create/edit screen; selected icon auto-maps to a category behind the scenes
10. **Category auto-mapping** — Icon selection drives the category field via `iconCategoryMap` (10 mapped icons); unrecognized icons default to `'general'`
11. **Private alarm mode** — Hides note/icon/nickname on the alarm card, shows "Private Alarm"; tap eye icon to peek for 3 seconds
12. **Motivational quotes** — Random quote from a pool of 12, assigned at alarm creation and shown on the fire screen
13. **App-open quotes** — 38 snarky rotating quotes displayed at the top of the alarm list; refreshes on every screen focus via useFocusEffect
14. **Rotating placeholder text** — The note input field shows a random witty placeholder from a pool of 12
15. **Guess Why mini-game** — When enabled (default: ON), you must guess why you set the alarm before seeing the answer; 3 attempts via icon grid or free-text input
16. **Guess Why info hiding** — When Guess Why is enabled, alarm cards show deterministic mystery text, notifications use generic text, widget alarms show "Mystery" — prevents cheating across the entire UI
17. **Unwinnable alarm guard** — Alarms with no icon and a note shorter than 3 characters skip Guess Why entirely (`navigation.replace` to AlarmFire without recording stats)
18. **Win/loss/skip tracking** — Every Guess Why outcome is recorded with running totals and streak counter
19. **Memory Score screen** — Shows win %, rank title + emoji, current streak, best streak, total games; links to Forget Log
20. **Memory rank tiers** — Five ranks from "Goldfish With Amnesia" (0-29%) to "Memory of an Elephant With a Vendetta" (90-100%)
21. **Forget Log** — Chronological list of every alarm you failed or skipped in Guess Why, with note, nickname, icon, timestamp, and result badge
22. **Snooze with escalating shame** — 4 tiers of 3 increasingly judgmental messages; snooze button text degrades each tap
23. **Timer system** — 36 labeled presets (35 standard + 1 custom) in a 3-column grid; tap to start countdown
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
39. **Notification deep-linking** — Tapping a notification opens GuessWhy (if enabled) or AlarmFire; timer notifications are cancelled on tap
40. **Aggressive alarm notifications** — DND bypass, loopSound, ongoing, vibrationPattern, lights, fullScreenAction, AndroidCategory.ALARM
41. **Conditional vibration** — AlarmFire and GuessWhy only vibrate when opened from a notification (`fromNotification` route param)
42. **Notification privacy** — Alarm note (the "why") is never included in the notification body
43. **Memory Match mini-game** — Card-flip matching game with 3 difficulties (3x4, 4x4, 5x4), par scoring, animated card flip (scaleX interpolation), best scores per difficulty
44. **Sudoku mini-game** — Full Sudoku with 3 difficulties, backtracking puzzle generator with unique-solution validation, pencil notes, pause/save/resume, difficulty-scaled assistance, star rating, best scores per difficulty
45. **Games hub** — Central screen with Memory Match card, Sudoku card, and Guess Why toggle; accessible from game controller icon on main screen
46. **Theme system** — 8 preset themes (4 dark, 4 light) + custom color picker; all styles react via useMemo
47. **Custom theme generator** — Pick any accent color; generates full dark or light theme from luminance analysis with color mixing
48. **Theme persistence** — Selected theme and custom accent color saved to AsyncStorage, restored on app launch
49. **Safe area support** — SafeAreaProvider wraps the app root; every screen uses useSafeAreaInsets
50. **Streak display** — Current streak and best streak shown in the alarm list header when the user has played at least one Guess Why round
51. **Trophy navigation** — Trophy icon in header navigates to Memory Score; only visible after first game played
52. **Orphaned timer cleanup** — On app launch, expired timers from when the app was killed are cleaned up and their countdown notifications cancelled
53. **Migration support** — `migrateAlarm()` handles old data formats: single `notificationId` to `notificationIds[]`, boolean `recurring` to `mode` + `days`, numeric day arrays to string-based `AlarmDay[]`
54. **Custom alarm sounds** — Per-alarm sound selection from system ringtones/alarm sounds via reusable SoundPickerModal bottom sheet; react-native-notification-sounds lists available system sounds; preview playback via expo-av with audioModeReady ref pattern; dynamic Notifee channel creation per unique sound URI (`alarm_custom_{mediaId}`); backward compatible with existing default channel
55. **Custom timer sounds** — Default timer completion sound configurable in Settings via SoundPickerModal; saved to AsyncStorage (`defaultTimerSound` key); applied to timer completion notifications via dynamic channel (`timer_custom_{mediaId}` prefix); works for both in-app timer starts and headless widget timer starts; falls back to default alarm channel when no custom sound set

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
  /** @deprecated */ notificationId?: string;
  /** @deprecated */ recurring?: boolean;
}

type AlarmCategory = 'meds' | 'appointment' | 'task' | 'self-care' | 'general';
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

## 4. Screen Flow

### Navigation Stack (`RootStackParamList`)
```typescript
type RootStackParamList = {
  AlarmList: undefined;
  CreateAlarm: { alarm?: Alarm } | undefined;
  AlarmFire: { alarm: Alarm; fromNotification?: boolean };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean };
  Settings: undefined;
  MemoryScore: undefined;
  MemoryMatch: undefined;
  Games: undefined;
  Sudoku: undefined;
  ForgetLog: undefined;
};
```

10 navigation routes + 1 inline screen (TimerScreen rendered as a tab inside AlarmListScreen).

### AlarmList (`AlarmListScreen.tsx`)
Main hub. Header shows app title, active alarm count, game controller button, trophy button (if games played), gear button. Pill-shaped Alarms/Timers tab switcher. Alarms tab shows a random app-open quote card (refreshes on each screen focus), FlatList of AlarmCards (with `guessWhyEnabled` prop for info hiding + pin button), and a FAB (+) to create. If Guess Why stats exist, a streak row displays below the tabs. Timers tab renders TimerScreen inline. Timer management (start, pause/resume, dismiss, notifications) is handled here and passed to TimerScreen via props. AppState listener reloads active timers when the app returns to foreground (picks up widget-started timers and auto-switches to Timers tab if new ones found).

### CreateAlarm (`CreateAlarmScreen.tsx`)
Slide-from-bottom modal. Two large number inputs for hours/minutes. In 12h mode: hours accept 1-12, AM/PM toggle buttons appear. In 24h mode: hours accept 0-23, no AM/PM. Schedule section with Recurring/One-time mode toggle. Recurring: day-of-week selector (7 circle buttons) + Weekdays/Weekends quick-select. One-time: inline calendar picker with month navigation, past dates disabled, past-time validation on save. Nickname field (shows on lock screen). Note field with random placeholder and character counter (200 max). 25-icon picker grid. Sound picker row (between icon picker and privacy toggle) opens SoundPickerModal to select a system ringtone/alarm sound; shows current selection name or "Default". Private alarm toggle card. Save button. In edit mode, pre-fills all fields and button says "Update Alarm". Requires at least a note or an icon. Notification permission only requested when scheduling is needed. Save wrapped in try/catch with user-facing Alert on failure. Refreshes widgets on save.

### AlarmFire (`AlarmFireScreen.tsx`)
Full-screen fade-in, gesture disabled. Only vibrates if `fromNotification` is true (with cleanup on unmount). Cancels all notification IDs (array format + legacy single ID). Top: category emoji + formatted time + category label. Middle: the alarm note (the "why") + divider + the assigned quote. Snooze button with 4 escalating labels and a random shame message per tier. Dismiss button says "I'm On It".

### GuessWhy (`GuessWhyScreen.tsx`)
Full-screen fade-in, gesture disabled. Only vibrates if `fromNotification` and `canPlay` are true. If the alarm has no icon and a note shorter than 3 characters, immediately replaces itself with AlarmFire (no stats recorded). Top: alarm icon/category emoji + time + category label. Game area card with Icons/Type It mode toggle (Icons mode disabled if alarm has no icon). Icons mode: scrollable 4-column grid of 25 icons with labels; match is exact emoji equality. Type It mode: text input with Guess button (min 3 chars); match checks substring in note, or icon ID for icon-only alarms. 3 attempts. Shake animation on wrong guess. Result overlay (green win / red lose / amber skip) with snarky message. Continue navigates to AlarmFire via `navigation.replace`. Losses and skips logged to Forget Log.

### Settings (`SettingsScreen.tsx`)
Back button + title. Toggle for "24-Hour Time". Toggle for "Vibration" (haptic feedback). Timer Sound row opens SoundPickerModal to pick the default timer completion sound (shows current selection name or "Default"). Theme picker: 8 preset theme circles in a grid + 9th "Custom" circle. Custom opens a reanimated-color-picker modal with Panel1 + HueSlider + Preview. Permissions card with Setup Guide button (re-opens onboarding at permissions slide). About card links to AboutScreen.

### Games (`GamesScreen.tsx`)
Hub screen with Memory Match card, Sudoku card, and Guess Why toggle switch. Game controller icon on main screen navigates here.

### MemoryScore (`MemoryScoreScreen.tsx`)
Rank emoji + rank title (colored) + win percentage + subtitle. Stats card with wins, losses, skips, streak, best streak, total games. "What Did I Forget?" button links to ForgetLog. Red "Reset Stats" button with confirmation.

### MemoryMatch (`MemoryMatchScreen.tsx`)
Difficulty select: Easy (3x4, 6 pairs, par 8), Medium (4x4, 8 pairs, par 12), Hard (5x4, 10 pairs, par 16). Each shows best score. Game board with animated card flips (Animated scaleX interpolation, 300ms). Timer starts on first card flip. Win screen with star rating (below par = 3 stars, at par = 2, above = 1), snarky message, play again button. Best scores saved per difficulty.

### Sudoku (`SudokuScreen.tsx`)
Difficulty select: Easy (46-51 clues), Medium (36-41 clues), Hard (26-31 clues). Each shows best score. Continue button if saved game exists. Full 9x9 grid with tap-to-select, number pad, pencil notes toggle, erase button. Difficulty-scaled assistance: Easy shows errors + highlighting + remaining counts; Medium shows errors + highlighting; Hard shows nothing during play, reveals on win. Pause saves game to AsyncStorage. Win screen with star rating (0 mistakes = 3 stars, 1-3 = 2, 4+ = 1), "Let's see how you actually did..." text on hard mode, snarky message. Best scores saved per difficulty.

### ForgetLog (`ForgetLogScreen.tsx`)
FlatList of ForgetEntry cards with emoji, note, nickname, result badge (Forgot/Skipped), timestamp. Empty state message. "Clear Log" button with confirmation.

### TimerScreen (`TimerScreen.tsx`)
Rendered inline as a tab in AlarmListScreen. Active timers section with countdown display (H:MM:SS or MM:SS), pause/play toggle, dismiss (X). "Recent" section with recently used presets. Main grid with remaining presets + Custom button at end. 3-column grid. Long-press to set custom duration and pin to widget. Pinned presets show a pin indicator. Custom preset opens duration modal on tap.

## 5. File Structure

```
src/
├── components/
│   ├── AlarmCard.tsx              Alarm list item card with peek, toggle, edit, delete, pin, Guess Why hiding
│   └── SoundPickerModal.tsx       Reusable bottom sheet for picking system sounds; search filter, expo-av preview, selection
├── data/
│   ├── appOpenQuotes.ts           38 snarky quotes shown when opening the app
│   ├── guessWhyIcons.ts           25-icon array for icon picker + Guess Why game grid
│   ├── guessWhyMessages.ts        Win (7), lose (6), skip (4) messages for Guess Why
│   ├── memoryRanks.ts             5 rank tiers + unranked, with emoji and color
│   ├── placeholders.ts            12 rotating placeholder strings for note input
│   ├── snoozeMessages.ts          4 tiers of 3 escalating snooze shame messages
│   └── timerPresets.ts            35 default timer presets + 1 custom entry (36 total)
├── navigation/
│   └── types.ts                   RootStackParamList with all 10 screen route params
├── screens/
│   ├── AlarmFireScreen.tsx        Alarm dismiss screen with note, quote, snooze shame
│   ├── AlarmListScreen.tsx        Main screen with alarm list, timer tab, FAB, timer management
│   ├── CreateAlarmScreen.tsx      Create/edit alarm with time, schedule, nickname, note, icon, sound, privacy
│   ├── ForgetLogScreen.tsx        Chronological log of forgotten/skipped alarms
│   ├── GamesScreen.tsx            Games hub with Memory Match, Sudoku, Guess Why toggle
│   ├── GuessWhyScreen.tsx         Mini-game: guess the alarm reason in 3 attempts
│   ├── MemoryMatchScreen.tsx      Card-flip matching game with 3 difficulties and best scores
│   ├── MemoryScoreScreen.tsx      Stats dashboard with rank, streak, win/loss totals
│   ├── SettingsScreen.tsx         Time format, vibration, timer sound, theme picker, permissions, about
│   ├── SudokuScreen.tsx           Full Sudoku with 3 difficulties, notes, pause, best scores
│   └── TimerScreen.tsx            Timer preset grid + active countdown timers + pin-to-widget
├── services/
│   ├── forgetLog.ts               CRUD for ForgetEntry[] with runtime validation
│   ├── guessWhyStats.ts           Win/loss/skip/streak tracking with per-field numeric validation
│   ├── notifications.ts           @notifee scheduling, channels (static + dynamic per-sound), triggers, countdown, cancellation
│   ├── quotes.ts                  12 motivational quotes assigned to alarms at creation
│   ├── settings.ts                AppSettings load/save, getDefaultTimerSound/saveDefaultTimerSound
│   ├── storage.ts                 Alarm CRUD with migration, runtime type guards, try/catch on scheduling
│   ├── timerStorage.ts            Timer presets, active timers (validated), recent tracking
│   └── widgetPins.ts              Pin/unpin timer presets (max 3) and alarms (max 3) for widget priority
├── theme/
│   ├── colors.ts                  ThemeColors interface, 8 presets, clampAccent(), generateCustomTheme()
│   └── ThemeContext.tsx            ThemeProvider + useTheme hook, persists to AsyncStorage
├── types/
│   ├── alarm.ts                   Alarm interface + AlarmCategory + AlarmDay types + day constants
│   └── timer.ts                   TimerPreset + ActiveTimer interfaces
├── utils/
│   ├── sudoku.ts                  Sudoku puzzle generator with backtracking, unique-solution validation
│   └── time.ts                    formatTime (12h/24h display) + getCurrentTime (24h string)
└── widget/
    ├── DetailedWidget.tsx         Detailed widget UI (FlexWidget + TextWidget, 2-column with schedule/duration)
    ├── TimerWidget.tsx            Compact widget UI (FlexWidget + TextWidget, 2-column)
    ├── updateWidget.ts            refreshTimerWidget() — triggers both widget re-renders
    └── widgetTaskHandler.ts       Headless JS handler for widget events + data loading logic
```

Root files:
- `App.tsx` — SafeAreaProvider + ThemeProvider wrapper, navigation stack (10 screens), notifee foreground + cold-start event handlers, notification channel setup, orphaned timer cleanup, one-time alarm auto-disable, StatusBar mode switching
- `index.ts` — Registers `notifee.onBackgroundEvent` handler, `registerRootComponent`, and `registerWidgetTaskHandler`
- `app.json` — Expo config (v1.0.0, portrait, new arch, edge-to-edge Android, `dontforgetwhy://` scheme, 2 widget definitions, permissions)
- `eas.json` — EAS Build profiles (development APK / preview APK / production)
- `plugins/withNotifee.js` — Custom Expo config plugin: adds permissions + lock-screen activity flags

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
| Widget: `#121220` bg, `#1E1E2E` cell bg, `#EAEAFF` text, `#B0B0CC` secondary text, `#2A2A3E` border, `#4A90D9` pinned border | — | TimerWidget.tsx + DetailedWidget.tsx (hardcoded midnight theme) |
| Rank colors: `#FFD700`, `#4A90D9`, `#B0B0CC`, `#FF9F43`, `#FF6B6B`, `#7A7A9E` | — | memoryRanks.ts (data-driven) |

## 7. Icon Orders

### Alarm Icons (25 icons, `guessWhyIcons.ts`)

| # | ID | Emoji |
|---|---|---|
| 1 | meds | 💊 |
| 2 | doctor | 🩺 |
| 3 | medical | ⚕️ |
| 4 | appointment | 📅 |
| 5 | meeting | 👥 |
| 6 | work | 💼 |
| 7 | kids | 👶 |
| 8 | phone | 📱 |
| 9 | meal | 🍽️ |
| 10 | shopping | 🛒 |
| 11 | pet | 🐾 |
| 12 | car | 🚗 |
| 13 | money | 💰 |
| 14 | cleaning | 🧹 |
| 15 | laundry | 👕 |
| 16 | trash | 🗑 |
| 17 | dumbbell | 🏋️ |
| 18 | sleep | 😴 |
| 19 | shower | 🚿 |
| 20 | computer | 💻 |
| 21 | book | 📖 |
| 22 | mail | 📬 |
| 23 | plant | 🌱 |
| 24 | celebration | 🎉 |
| 25 | school | 🏫 |

### Timer Presets (36 presets, `timerPresets.ts`)

| # | ID | Icon | Label | Default Duration |
|---|---|---|---|---|
| 1 | pizza | 🍕 | Pizza | 12 min |
| 2 | laundry | 👕 | Laundry | 45 min |
| 3 | stove | 🔥 | Stove | 20 min |
| 4 | break | ☕ | Break | 15 min |
| 5 | lunch | 🍽️ | Meal | 1 h |
| 6 | nap | 😴 | Nap | 30 min |
| 7 | workout | 🏋️ | Workout | 45 min |
| 8 | meds | 💊 | Meds | 5 min |
| 9 | doctor | 🩺 | Doctor | 30 min |
| 10 | medical | ⚕️ | Medical | 4 h |
| 11 | shopping | 🛒 | Shopping | 1 h |
| 12 | tea | 🫖 | Tea | 4 min |
| 13 | eggs | 🥚 | Eggs | 10 min |
| 14 | microwave | ♨️ | Microwave | 2 min |
| 15 | pet | 🐾 | Pet | 15 min |
| 16 | kids | 👶 | Kids | 30 min |
| 17 | parking | 🅿️ | Parking | 1 h |
| 18 | delivery | 📦 | Delivery | 30 min |
| 19 | grill | 🥩 | Grill | 15 min |
| 20 | bath | 🛁 | Bath | 20 min |
| 21 | charge | 🔋 | Charge | 45 min |
| 22 | game | 🎮 | Game | 1 h |
| 23 | meeting | 👥 | Meeting | 30 min |
| 24 | work | 💼 | Work | 1 h |
| 25 | celebration | 🎉 | Celebration | 1 h |
| 26 | dishwasher | 🫧 | Dishes | 1 h |
| 27 | heater | 🌡 | Heater | 30 min |
| 28 | water | 🚰 | Water | 10 min |
| 29 | door | 🔒 | Door | 1 min |
| 30 | garage | 🚗 | Garage | 1 min |
| 31 | trash | 🗑 | Trash | 5 min |
| 32 | school | 🏫 | School | 1 h |
| 33 | computer | 💻 | Computer | 30 min |
| 34 | documents | 📄 | Docs | 5 min |
| 35 | car | 🚗 | Car | 30 min |
| 36 | transit | 🚌 | Transit | 15 min |
| — | custom | ➕ | Custom | 0 (prompts modal) |

## 8. Icon-to-Category Mapping

Defined in `CreateAlarmScreen.tsx` via `iconCategoryMap`. When a user selects an icon, the alarm's category is set automatically. Icons not in this map default to `'general'`.

| Icon | Category |
|---|---|
| 💊 | `meds` |
| 🩺 | `appointment` |
| ⚕️ | `meds` |
| 📅 | `appointment` |
| 👥 | `task` |
| 💼 | `task` |
| 🎉 | `task` |
| 🏋️ | `self-care` |
| 😴 | `self-care` |
| 🚿 | `self-care` |
| *(all others)* | `general` |

Category display labels on alarm cards:
- meds -> "💊 Meds"
- appointment -> "📅 Appt"
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
- **Edit button**: Opens CreateAlarmScreen in edit mode
- **Delete button**: Triggers confirmation dialog

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
fullScreenAction, importance HIGH, loopSound, ongoing, autoCancel false, vibrationPattern [300, 300, 300, 300], lights, category ALARM. Channel resolved in order: (1) custom system sound via `soundUri` -> dynamic `alarm_custom_` channel, (2) preset sound ID -> static channel from `alarmSounds.ts`, (3) default -> `alarms_v2` channel.

### Timer Notifications (two per timer)
1. **Completion notification**: Timestamp trigger at exact completion time, alarm-style settings. Data: `{ timerId }`. Uses custom timer sound channel (`timer_custom_{mediaId}`) if configured in Settings, otherwise falls back to `alarms_v2` channel. Sound loaded via `getDefaultTimerSound()` at timer start and on resume.
2. **Countdown notification**: Ongoing display with Android chronometer counting down. ID: `countdown-${timerId}`. Uses `timer-progress` channel.

### Alarm Scheduling

**Recurring — all 7 days**: Single `TIMESTAMP` trigger with `RepeatFrequency.DAILY` + `alarmManager.allowWhileIdle`. Returns 1 notification ID.

**Recurring — specific days**: One `TIMESTAMP` trigger per selected day with `RepeatFrequency.WEEKLY`. Each calculates next occurrence of that weekday. Returns N notification IDs (one per day).

**One-time**: Single `TIMESTAMP` trigger at exact date+time, no repeat. `getOneTimeTimestamp` throws if time is in the past. Returns 1 notification ID.

### Event Handling
- **Cold start** (`notifee.getInitialNotification`): Timer notifications cancelled; alarm notifications navigate to GuessWhy/AlarmFire
- **Foreground** (`notifee.onForegroundEvent`): Same logic — timer taps cancel, alarm taps navigate with `fromNotification: true`
- **Background** (`notifee.onBackgroundEvent` in `index.ts`): Registered before app component; no-ops (app launch handles navigation)

### Android Manifest (via `plugins/withNotifee.js`)
- `USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`
- MainActivity: `showWhenLocked="true"`, `turnScreenOn="true"`

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
- **Cancel**: `cancelAlarmNotifications(ids)` called on alarm toggle off, delete, or edit (before reschedule)
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

Card-flip matching game. Find all matching pairs of emoji cards.

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

Full 9x9 Sudoku with puzzle generation, pencil notes, and difficulty-scaled assistance.

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

## 14. Remaining / Planned Features

- **Actual snooze rescheduling** — Currently snooze shows shame messages but does not reschedule the notification
- **Widget theme matching** — Widgets currently use hardcoded midnight theme colors; could match the user's selected theme
- **Play Store publication** — App is configured for production builds via EAS but not yet published

## 15. Features Explored and Removed

- **Preset alarm sound picker** — An early version had 6 preset alarm sounds (`alarmSounds.ts`: Default, Gentle, Urgent, Classic, Digital, Silent) with static Notifee channels per preset. These all used `sound: 'default'` and sounded identical on most devices. Replaced by the real system ringtone picker (Feature 54) using `react-native-notification-sounds` + dynamic channels with actual content:// URIs. The preset channel definitions remain in `notifications.ts` for backward compatibility but the picker UI was removed from Settings.

## 16. Key Implementation Patterns

### Android Notification Channel Immutability
Channels cannot be modified after creation on Android 8+. Changing a sound means creating a new channel with a new ID. `getOrCreateSoundChannel()` derives channel IDs deterministically from the content:// URI's numeric media ID (`extractMediaId()`), so the same sound always maps to the same channel. Old channels accumulate but are harmless.

### expo-av Audio Mode Initialization
expo-av 16.x requires `Audio.setAudioModeAsync()` to complete before `playAsync()` can acquire audio focus. SoundPickerModal uses an `audioModeReady` ref pattern: `setAudioModeAsync` is called when the modal opens (fire-and-forget with `.then()` setting the ref), and `handlePlay` calls `ensureAudioMode()` which either returns immediately (ref is true) or awaits a fresh `setAudioModeAsync` call. This prevents the "AudioFocusNotAcquiredException" race condition.

### New Dependencies
- `react-native-notification-sounds` — Lists system ringtones/alarm/notification sounds on Android. Returns `{ title, url, soundID }[]` where `url` is a `content://media/internal/audio/media/{id}` URI.
- `expo-av` (~16.0.8) — Audio preview playback in SoundPickerModal. Deprecated in SDK 54 (replaced by `expo-audio`/`expo-video`) but functional.
