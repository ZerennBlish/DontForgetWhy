# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off. Includes a full timer system with quick-tap presets, a "Guess Why" memory mini-game, escalating snooze shame, a full theme system with 8 presets + custom color picker, safe area support, and a sarcastic personality throughout.

## Tech Stack

- **Framework**: React Native + Expo (managed workflow, New Architecture enabled)
- **Language**: TypeScript
- **Navigation**: @react-navigation/native + @react-navigation/native-stack (native stack, 7 screens)
- **Persistence**: @react-native-async-storage/async-storage
- **Notifications**: @notifee/react-native (channels, timestamp triggers, alarm manager, DND bypass, full-screen intent)
- **Theming**: React Context + reanimated-color-picker + react-native-reanimated
- **Safe Area**: react-native-safe-area-context (SafeAreaProvider at root, useSafeAreaInsets on every screen)
- **IDs**: uuid (via react-native-get-random-values polyfill)
- **Target Platforms**: Android (primary, edge-to-edge enabled, package `com.zerennblish.DontForgetWhy`), iOS (supportsTablet), Web (favicon only)
- **Build**: EAS Build configured (development APK / preview APK / production profiles)
- **Config Plugin**: Custom Expo plugin (`./plugins/withNotifee.js`) modifies AndroidManifest for alarm permissions and lock-screen activity flags

## Features

1. **Alarm creation** — Set time (12h with AM/PM or 24h based on settings), add a note explaining *why*, optional nickname, optional icon, optional private toggle
2. **Alarm editing** — Tap edit on any alarm card to modify time, nickname, note, icon, and privacy; reschedules notification on save
3. **Alarm list** — Main screen shows all alarms with enable/disable switch, edit button, delete button (with confirmation)
4. **Alarms / Timers tab switcher** — Pill-shaped toggle on the main screen switches between alarm list and timer grid
5. **12/24 hour time format** — Setting in SettingsScreen; affects alarm card display, fire screen display, and time input format on create/edit screen
6. **Icon picker** — 24-emoji grid on create/edit screen; selected icon auto-maps to a category behind the scenes
7. **Category auto-mapping** — Icon selection drives the category field (e.g. 💊 → meds, 🏋️ → self-care); unrecognized icons default to 'general'
8. **Private alarm mode** — Hides note/icon/nickname on the alarm card, shows "🔒 Private Alarm"; tap eye icon to peek for 3 seconds
9. **Motivational quotes** — Random quote from a pool of 12, assigned at alarm creation and shown on the fire screen
10. **App-open quotes** — Snarky rotating quote displayed at the top of the alarm list; refreshes on every screen focus via useFocusEffect
11. **Rotating placeholder text** — The note input field shows a random witty placeholder from a pool of 12
12. **Guess Why mini-game** — When enabled, you must guess why you set the alarm before seeing the answer; 3 attempts via icon grid or free-text input
13. **Unwinnable alarm guard** — Alarms with no icon and a note shorter than 3 characters skip Guess Why entirely (navigation.replace to AlarmFire without recording stats)
14. **Win/loss/skip tracking** — Every Guess Why outcome is recorded with running totals and streak counter
15. **Memory Score screen** — Shows win %, rank title + emoji, current streak, best streak, total games; links to Forget Log
16. **Memory rank tiers** — Five ranks from "Goldfish With Amnesia" (0-29%) to "Memory of an Elephant With a Vendetta" (90-100%), with Math.round to prevent float gaps
17. **"What Did I Forget?" log** — Chronological list of every alarm you failed or skipped in Guess Why, with note, nickname, icon, timestamp, and result badge
18. **Snooze with escalating shame** — 4 tiers of increasingly judgmental messages; snooze button text degrades each tap
19. **Timer system** — 33 labeled presets + 1 custom entry in a 3-column grid; tap to start countdown
20. **Timer custom duration** — Long-press any preset to override its duration (saved per-preset in AsyncStorage)
21. **Timer recently-used sorting** — Used presets float to a "Recent" section at the top; up to 20 tracked
22. **Active timer management** — Live countdown display with pause/resume toggle and dismiss (X) button; persisted across app reloads
23. **Timer background drift correction** — AppState listener recalculates timer remaining seconds when app returns to foreground
24. **Timer completion alerts** — Alert dialog fires when a timer reaches zero in-app
25. **Timer scheduled notifications** — Notifee timestamp trigger scheduled at timer start (fires even when app is killed); cancels on pause, reschedules on resume
26. **Notification scheduling** — Daily repeat alarm notifications via @notifee/react-native with Android alarm manager; permission requested on first alarm save (skipped when editing a disabled alarm)
27. **Notification deep-linking** — Tapping a notification opens GuessWhy (if enabled) or AlarmFire for the matching alarm; timer notifications are cancelled on tap
28. **Aggressive alarm notifications** — DND bypass, loopSound, ongoing, vibrationPattern, lights, fullScreenAction, AndroidCategory.ALARM
29. **Conditional vibration** — AlarmFire and GuessWhy screens only vibrate when opened from a notification (`fromNotification` route param), not when tapped from the alarm list
30. **Background notification handling** — `notifee.onBackgroundEvent` registered in index.ts before app component
31. **Theme system** — 8 preset themes (4 dark, 4 light) + custom color picker; all styles react to theme changes via useMemo
32. **Custom theme generator** — Pick any accent color; extreme colors (luminance < 0.08 or > 0.92) are clamped before generating a full theme
33. **Theme persistence** — Selected theme and custom accent color saved to AsyncStorage, restored on app launch
34. **Safe area support** — SafeAreaProvider wraps the app root; every screen uses useSafeAreaInsets for bottom padding to avoid Android navigation bar overlap
35. **Streak display** — Current streak and best streak shown in the alarm list header when the user has played at least one Guess Why round
36. **Trophy navigation** — Trophy icon in header navigates to Memory Score; only visible after first game played
37. **AsyncStorage validation** — Runtime type guards on all loaded data: alarms require `id`, `time`, `note`, `enabled`, `category`; active timers require `id`, `totalSeconds`, `remainingSeconds`, `startedAt`, `isRunning`; forget log entries require `id`, `timestamp`

## Data Models

### Alarm (`src/types/alarm.ts`)
```typescript
interface Alarm {
  id: string;               // uuid v4
  time: string;             // "HH:MM" 24-hour format (internal storage)
  nickname?: string;        // Public name (shows on lock screen notification + alarm card)
  note: string;             // The "why" — private, only shown in-app on AlarmFireScreen
  quote: string;            // Random motivational quote assigned at creation
  enabled: boolean;
  recurring: boolean;
  days: number[];           // Currently unused (reserved for day-of-week recurring)
  category: AlarmCategory;  // Derived from selected icon
  icon?: string;            // Emoji from icon picker
  private: boolean;         // Hides details on alarm card
  createdAt: string;        // ISO 8601 timestamp
  notificationId?: string;  // Notifee notification identifier
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
  id: string;               // uuid v4
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
  guessWhyEnabled: boolean; // Default: false
  timeFormat: '12h' | '24h'; // Default: '12h'
}
```
`saveSettings` accepts `Partial<AppSettings>` and merges with current settings before saving.

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
  id: string;               // Keyword used for matching (e.g. 'meds', 'dog')
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

### RecentEntry (`src/services/timerStorage.ts`, internal)
```typescript
interface RecentEntry {
  presetId: string;
  timestamp: number;        // Date.now() at time of use
}
```

## AsyncStorage Keys

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

## Screen Flow

### Navigation Stack (`RootStackParamList`)
```typescript
type RootStackParamList = {
  AlarmList: undefined;
  CreateAlarm: { alarm?: Alarm } | undefined;
  AlarmFire: { alarm: Alarm; fromNotification?: boolean };
  GuessWhy: { alarm: Alarm; fromNotification?: boolean };
  Settings: undefined;
  MemoryScore: undefined;
  ForgetLog: undefined;
};
```

### AlarmList (`AlarmListScreen.tsx`)
Main hub. Header shows app title, active alarm count, trophy button (if games played), gear button. Pill-shaped Alarms/Timers tab switcher. Alarms tab shows a random app-open quote card (refreshes on each screen focus), FlatList of AlarmCards, and a FAB (+) to create. If Guess Why stats exist, a streak row displays below the tabs. Timers tab renders TimerScreen inline. Bottom padding accounts for safe area insets.

### CreateAlarm (`CreateAlarmScreen.tsx`)
Slide-from-bottom modal. Two large number inputs for hours/minutes. In 12h mode: hours accept 1-12, AM/PM toggle buttons appear. In 24h mode: hours accept 0-23, no AM/PM. Nickname field (shows on lock screen). Note field with random placeholder ("Why are you setting this alarm?") and character counter (200 max). 24-icon picker grid. Private alarm toggle card. Save button. In edit mode, pre-fills all fields from the existing alarm and button says "Update Alarm". Requires at least a note or an icon to save. Notification permission is only requested when scheduling is needed (new alarm, or editing an enabled alarm). Save is wrapped in try/catch with console.error and user-facing Alert on failure.

### AlarmFire (`AlarmFireScreen.tsx`)
Full-screen fade-in, gesture disabled. Only vibrates if `fromNotification` is true (with cleanup on unmount). Top: category emoji + formatted time (respects timeFormat setting) + category label. Middle: the alarm note (the "why") + divider + the assigned quote. Snooze button with 4 escalating labels ("Snooze 5 min" → "Snooze Again" → "...Snooze Again" → "Fine, Snooze") and a random shame message per tier. Dismiss button says "I'm On It".

### GuessWhy (`GuessWhyScreen.tsx`)
Full-screen fade-in, gesture disabled. Only vibrates if `fromNotification` is true (with cleanup on unmount). If the alarm has no icon and a note shorter than 3 characters, the screen immediately replaces itself with AlarmFire (no stats recorded). Top: alarm icon/category emoji + time (respects timeFormat) + category label. Game area card with Icons/Type It mode toggle (Icons mode disabled if alarm has no icon). Icons mode: scrollable 4-column grid of 24 icons with labels; match is exact emoji equality only. Type It mode: text input with Guess button (min 3 chars); match checks if typed text appears in the alarm note, or for icon-only alarms, matches the icon's ID. 3 attempts. Shake animation on wrong guess. Result overlay (green win / red lose / amber skip) with snarky message and continue button that navigates to AlarmFire via `navigation.replace` (passes `fromNotification` through). Skip button at bottom. Losses and skips are logged to the Forget Log.

### Settings (`SettingsScreen.tsx`)
Back button + title. Toggle switch for "Guess Why Mini-Game" with description text. Toggle switch for "24-Hour Time" format. Theme picker: 8 preset theme circles in a grid (inner circle shows accent color, outer border shows active state), plus a 9th "Custom" circle. Custom circle shows a 🎨 emoji if no custom color saved, or the saved accent color. Tapping Custom opens a color picker modal (reanimated-color-picker with Panel1 + HueSlider + Preview) where the user picks a color and taps Apply.

### MemoryScore (`MemoryScoreScreen.tsx`)
Back button + title. Large rank emoji + rank title (colored) + win percentage + subtitle ("Wall of Remembrance" if >= 50%, "Hall of Shame" if < 50%, "No games yet" if 0). Stats card with wins, losses, skips, divider, current streak, best streak, total games. "What Did I Forget?" button links to ForgetLog. Red "Reset Stats" button with confirmation alert.

### ForgetLog (`ForgetLogScreen.tsx`)
Back button + title + subtitle. FlatList of ForgetEntry cards showing emoji, note, nickname, result badge (❌ Forgot or ⏭️ Skipped), and formatted timestamp. Empty state message if no entries. "Clear Log" button at bottom with confirmation alert.

### TimerScreen (`TimerScreen.tsx`)
Rendered inline as a tab in AlarmListScreen (not a navigation screen). Active timers section at top with countdown display (MM:SS), pause/play toggle, and dismiss (✕). Completed timers show "⏰ Done!" in red. "Recent" section shows recently used presets. Main grid shows remaining presets + ➕ Custom button at end. 3-column grid layout. Tap to start timer. Long-press to set custom duration via modal (minutes + seconds inputs). Custom preset (seconds = 0) opens the duration modal on tap. Active timers are recalculated from `startedAt` when the app returns from background via an AppState listener.

## File Structure

```
src/
├── components/
│   └── AlarmCard.tsx              Alarm list item card with peek, toggle, edit, delete
├── data/
│   ├── appOpenQuotes.ts           12 snarky quotes shown when opening the app
│   ├── guessWhyIcons.ts           24-icon array for icon picker + Guess Why game grid
│   ├── guessWhyMessages.ts        Win (7), lose (6), skip (4) messages for Guess Why
│   ├── memoryRanks.ts             5 rank tiers + unranked, with emoji and color
│   ├── placeholders.ts            12 rotating placeholder strings for note input
│   ├── snoozeMessages.ts          4 tiers of 3 escalating snooze shame messages
│   └── timerPresets.ts            33 default timer presets + 1 custom entry
├── navigation/
│   └── types.ts                   RootStackParamList with all 7 screen route params
├── screens/
│   ├── AlarmFireScreen.tsx        Alarm dismiss screen with note, quote, snooze shame
│   ├── AlarmListScreen.tsx        Main screen with alarm list, timer tab, FAB, timer management
│   ├── CreateAlarmScreen.tsx      Create/edit alarm with time, nickname, note, icon, privacy
│   ├── ForgetLogScreen.tsx        Chronological log of forgotten/skipped alarms
│   ├── GuessWhyScreen.tsx         Mini-game: guess the alarm reason in 3 attempts
│   ├── MemoryScoreScreen.tsx      Stats dashboard with rank, streak, win/loss totals
│   ├── SettingsScreen.tsx         Guess Why toggle + time format toggle + theme picker
│   └── TimerScreen.tsx            Timer preset grid + active countdown timers
├── services/
│   ├── forgetLog.ts               CRUD for ForgetEntry[] with runtime validation
│   ├── guessWhyStats.ts           Win/loss/skip/streak tracking with per-field numeric validation
│   ├── notifications.ts           @notifee/react-native scheduling, channels, triggers, cancellation
│   ├── quotes.ts                  12 motivational quotes assigned to alarms at creation
│   ├── settings.ts                AppSettings load/save (guessWhyEnabled + timeFormat)
│   ├── storage.ts                 Alarm CRUD with runtime type guards and try/catch on scheduling
│   └── timerStorage.ts            Timer presets, active timers (validated), recent tracking
├── theme/
│   ├── colors.ts                  ThemeColors interface, 8 presets, clampAccent(), generateCustomTheme()
│   └── ThemeContext.tsx            ThemeProvider + useTheme hook, persists to AsyncStorage
├── types/
│   ├── alarm.ts                   Alarm interface + AlarmCategory type
│   └── timer.ts                   TimerPreset + ActiveTimer interfaces
└── utils/
    └── time.ts                    formatTime (12h/24h display) + getCurrentTime (24h string)
```

Root files:
- `App.tsx` — SafeAreaProvider + ThemeProvider wrapper, navigation stack setup, notifee foreground + cold-start event handlers, notification channel setup, StatusBar mode switching
- `index.ts` — Registers `notifee.onBackgroundEvent` handler (cancels timer notifications on press), then `registerRootComponent`
- `app.json` — Expo config (v1.0.0, portrait, new arch, edge-to-edge Android, permissions for full-screen intent / exact alarm / vibrate / wake lock / boot completed / foreground service)
- `eas.json` — EAS Build profiles (development APK / preview APK / production)
- `plugins/withNotifee.js` — Custom Expo config plugin: adds USE_FULL_SCREEN_INTENT, SCHEDULE_EXACT_ALARM, VIBRATE, WAKE_LOCK permissions; sets showWhenLocked + turnScreenOn on MainActivity

## Notification System

### Channel
Single notification channel `alarms` created on app startup via `setupNotificationChannel()`:
- `importance`: HIGH
- `sound`: default
- `vibration`: true
- `vibrationPattern`: [1000, 500, 1000, 500]
- `lights`: true, `lightColor`: #FF0000
- `bypassDnd`: true

### Alarm Notifications
Scheduled via `notifee.createTriggerNotification` with:
- **Trigger**: `TriggerType.TIMESTAMP` at the alarm's next occurrence + `RepeatFrequency.DAILY`
- **alarmManager**: `{ allowWhileIdle: true }` (fires even in Doze mode)
- **Android config**: fullScreenAction (launches default activity), importance HIGH, loopSound, ongoing, autoCancel false, vibrationPattern [1000, 500, 1000, 500], lights, category ALARM
- **Privacy**: Note is never in the notification (see Notification Privacy Rules)

### Timer Notifications
Scheduled via `scheduleTimerNotification` with:
- **Trigger**: `TriggerType.TIMESTAMP` at exact completion time (no repeat)
- **alarmManager**: `{ allowWhileIdle: true }`
- **Android config**: Same alarm-style settings (fullScreenAction, loopSound, ongoing, autoCancel false, category ALARM)
- **Data**: `{ timerId: 'true' }` to distinguish from alarm notifications
- **Lifecycle**: Scheduled on start, cancelled on pause (notificationId cleared), rescheduled on resume (new notificationId saved async), cancelled on dismiss

### Event Handling
- **Cold start** (`notifee.getInitialNotification`): Timer notifications are cancelled; alarm notifications navigate to GuessWhy/AlarmFire
- **Foreground** (`notifee.onForegroundEvent`): Same logic — timer taps cancel, alarm taps navigate with `fromNotification: true`
- **Background** (`notifee.onBackgroundEvent` in `index.ts`): Timer notifications cancelled on PRESS

### Permissions
`requestPermissions()` calls `notifee.requestPermission()` — only invoked from CreateAlarmScreen when saving a new alarm or editing an enabled alarm. Never called on app startup.

### Android Manifest (via withNotifee.js plugin)
- `USE_FULL_SCREEN_INTENT`
- `SCHEDULE_EXACT_ALARM`
- `VIBRATE`
- `WAKE_LOCK`
- MainActivity: `showWhenLocked="true"`, `turnScreenOn="true"`

## Theme System

All 8 preset themes plus a custom theme generator. Every screen and component uses `useTheme()` and wraps styles in `useMemo(() => StyleSheet.create({...}), [colors, insets.bottom])` so the entire UI reacts to theme changes and safe area updates.

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

1. **Clamp extreme colors** via `clampAccent()`: if luminance < 0.08, mix 25% toward white; if luminance > 0.92, mix 25% toward black. This prevents unreadable themes from pure black/white inputs.
2. Compute luminance: `(0.299*R + 0.587*G + 0.114*B) / 255`
3. If luminance < 0.5 → **dark theme**: mixes accent toward black for backgrounds, toward white for text
4. If luminance >= 0.5 → **light theme**: mixes accent toward white for backgrounds, toward black for text

Dark theme mix ratios:
- background: accent → black at 85%
- card: accent → black at 72%
- textPrimary: accent → white at 88%
- textSecondary: accent → white at 60%
- textTertiary: accent → white at 35%
- border: accent → black at 60%
- activeBackground: accent → black at 65%
- red: `#FF6B6B`, orange: `#FF9F43`

Light theme mix ratios:
- background: accent → white at 90%
- card: accent → white at 78%
- textPrimary: accent → black at 88%
- textSecondary: accent → black at 62%
- textTertiary: accent → black at 40%
- border: accent → white at 60%
- activeBackground: accent → white at 68%
- red: `#D32F2F`, orange: `#E67E22`

### Hardcoded Colors (not themed)

All overlay colors are part of ThemeColors and identical across all presets:

| Color | Property | Where |
|---|---|---|
| `rgba(34,139,34,0.85)` | overlayWin | GuessWhyScreen win overlay |
| `rgba(180,40,40,0.85)` | overlayLose | GuessWhyScreen lose overlay |
| `rgba(180,150,30,0.85)` | overlaySkip | GuessWhyScreen skip overlay |
| `rgba(0,0,0,0.7)` | modalOverlay | TimerScreen, SettingsScreen modal backdrop |
| `rgba(255,255,255,0.25)` | overlayButton | GuessWhyScreen overlay continue button |
| `#FFFFFF` | overlayText | Overlay text (always on colored bg) |
| Rank colors (`#FFD700`, `#4A90D9`, `#B0B0CC`, `#FF9F43`, `#FF6B6B`, `#7A7A9E`) | — | MemoryScoreScreen rank title colors (data-driven from `memoryRanks.ts`) |

## Icon Orders

### Alarm Icons (guessWhyIcons.ts) — 24 icons
Used in CreateAlarmScreen icon picker and GuessWhyScreen icon grid.

| # | ID | Emoji |
|---|---|---|
| 1 | meds | 💊 |
| 2 | doctor | 🩺 |
| 3 | appointment | 📅 |
| 4 | meeting | 👥 |
| 5 | kids | 👶 |
| 6 | phone | 📱 |
| 7 | food | 🍽️ |
| 8 | shopping | 🛒 |
| 9 | dog | 🐕 |
| 10 | cat | 🐈 |
| 11 | car | 🚗 |
| 12 | money | 💰 |
| 13 | cleaning | 🧹 |
| 14 | laundry | 👕 |
| 15 | dumbbell | 🏋️ |
| 16 | sports | ⚽ |
| 17 | sleep | 😴 |
| 18 | shower | 🚿 |
| 19 | computer | 💻 |
| 20 | book | 📖 |
| 21 | mail | 📬 |
| 22 | music | 🎵 |
| 23 | plant | 🌱 |
| 24 | fish | 🐟 |

### Timer Presets (timerPresets.ts) — 34 entries
Displayed in 3-column grid on TimerScreen. Last entry is the ➕ Custom button.

| # | ID | Icon | Label | Default Duration |
|---|---|---|---|---|
| 1 | pizza | 🍕 | Pizza | 12 min |
| 2 | laundry | 👕 | Laundry | 45 min |
| 3 | stove | 🔥 | Stove | 20 min |
| 4 | break | ☕ | Break | 15 min |
| 5 | lunch | 🍽️ | Lunch | 1 h |
| 6 | nap | 😴 | Nap | 30 min |
| 7 | workout | 🏋️ | Workout | 45 min |
| 8 | meds | 💊 | Meds | 5 min |
| 9 | tea | 🫖 | Tea | 4 min |
| 10 | eggs | 🥚 | Eggs | 10 min |
| 11 | dog | 🐕 | Dog | 15 min |
| 12 | cat | 🐈 | Cat | 20 min |
| 13 | kids | 👶 | Kids | 30 min |
| 14 | parking | 🅿️ | Parking | 1 h |
| 15 | delivery | 📦 | Delivery | 30 min |
| 16 | grill | 🥩 | Grill | 15 min |
| 17 | bath | 🛁 | Bath | 20 min |
| 18 | charge | 🔋 | Charge | 45 min |
| 19 | game | 🎮 | Game | 1 h |
| 20 | meeting | 👥 | Meeting | 30 min |
| 21 | iron | ♨️ | Iron | 15 min |
| 22 | dishwasher | 🍽 | Dishes | 1 h |
| 23 | heater | 🌡 | Heater | 30 min |
| 24 | water | 🚰 | Water | 10 min |
| 25 | door | 🔒 | Door | 1 min |
| 26 | garage | 🚗 | Garage | 1 min |
| 27 | trash | 🗑 | Trash | 5 min |
| 28 | school | 🏫 | School | 1 h |
| 29 | keys | 🔑 | Keys | 1 min |
| 30 | wallet | 👛 | Wallet | 1 min |
| 31 | documents | 📄 | Docs | 5 min |
| 32 | car | 🚗 | Car | 30 min |
| 33 | transit | 🚌 | Transit | 15 min |
| 34 | custom | ➕ | Custom | 0 (prompts modal) |

## Icon-to-Category Mapping

Defined in `CreateAlarmScreen.tsx`. When a user selects an icon, the alarm's category is set automatically. Icons not in this map default to `'general'`.

| Icon | Category |
|---|---|
| 💊 | `meds` |
| 🩺 | `appointment` |
| 📅 | `appointment` |
| 👥 | `task` |
| 👶 | `general` |
| ⚽ | `self-care` |
| 🏋️ | `self-care` |
| 😴 | `self-care` |
| 🚿 | `self-care` |
| *(all others)* | `general` |

## Alarm Card Display Logic

`AlarmCard.tsx` uses `getDetailLine(alarm)` to determine the detail text:

1. **Icon + nickname** → `"${icon} ${nickname}"` (e.g. "💊 Pill O'Clock")
2. **Icon only** → just the emoji (e.g. "💊")
3. **Nickname only** → `"${nickname} 🔒"` (lock indicates no icon set)
4. **Neither** → the alarm note text

**Private alarm behavior**:
- When `alarm.private` is true and not revealed: detail line shows "🔒 Private Alarm" in muted style
- Eye icon (👁) button appears in the right column for private alarms only
- Tapping the eye reveals the real detail line for 3 seconds, then auto-hides

**Disabled state**: Entire card renders at `opacity: 0.5` when `alarm.enabled` is false.

**Category label**: Always shown below the detail line using a `categoryLabels` map:
- meds → "💊 Meds"
- appointment → "📅 Appt"
- task → "✅ Task"
- self-care → "🧘 Self-Care"
- general → "🔔 General"

**Time display**: Uses `formatTime(alarm.time, timeFormat)` — respects the user's 12h/24h setting.

## Notification Privacy Rules

Defined in `notifications.ts`. The alarm note (the "why") is **never** included in the notification. This is the core privacy contract.

**Title**: `"${icon} ${CATEGORY}"` if the alarm has an icon, otherwise `"⏰ ${CATEGORY}"`

**Body** (priority order):
1. If `alarm.private` is true:
   - If alarm has a **nickname** → show the nickname
   - If no nickname but has an **icon** → show just the icon emoji
   - If neither → `"Alarm"`
2. If not private:
   - If alarm has a **nickname** → show the nickname
   - If no nickname but has an **icon** → show just the icon emoji
   - If neither → `"Time to do the thing!"`

**Trigger**: `TriggerType.TIMESTAMP` at the alarm's next occurrence + `RepeatFrequency.DAILY`, with `alarmManager.allowWhileIdle`.

## Memory Rank Tiers

Based on win percentage = `Math.round(wins / (wins + losses + skips) * 100)`:

| Range | Emoji | Title | Color |
|---|---|---|---|
| 90-100% | 🐘 | Memory of an Elephant With a Vendetta | `#FFD700` |
| 70-89% | 🧠 | Surprisingly Functional | `#4A90D9` |
| 50-69% | 😐 | Average Human (Low Bar) | `#B0B0CC` |
| 30-49% | 🐿️ | Forgetful Squirrel | `#FF9F43` |
| 0-29% | 🐟 | Goldfish With Amnesia | `#FF6B6B` |
| No games | ❓ | Unranked | `#7A7A9E` |

MemoryScoreScreen shows "Wall of Remembrance" if >= 50%, "Hall of Shame" if < 50%.

## Snooze Tiers

4 tiers, 3 messages each. Tier selected by `min(snoozeCount - 1, 3)`. Button labels escalate:
1. "Snooze 5 min"
2. "Snooze Again"
3. "...Snooze Again"
4. "Fine, Snooze"

## Remaining / Planned Features

- **Actual snooze rescheduling** — Currently snooze shows shame messages but does not reschedule the notification
- **Day-of-week recurring** — `recurring` and `days` fields exist on the Alarm model but are not yet exposed in the UI
- **Home screen widget** — Quick-access timer widget (requires native module / development build)
- **Alarm sound customization** — Currently uses system default sound only
