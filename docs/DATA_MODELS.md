# Data Models

## TypeScript Interfaces

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
  completed: boolean;       // true for completed one-time reminders; recurring reminders stay false
  createdAt: string;        // ISO 8601 timestamp
  completedAt?: string;     // Legacy, migrated to completionHistory on read
  completionHistory?: { completedAt: string; scheduledFor?: string }[]; // Per-occurrence completion log
  dueDate: string | null;   // "YYYY-MM-DD" or null
  dueTime: string | null;   // "HH:MM" 24h format or null (drives notifications)
  days?: string[];           // ['Mon','Tue',...] for recurring weekly reminders
  recurring?: boolean;       // true = recurring schedule, false/undefined = one-time
  notificationId: string;    // Legacy compat (single notification ID)
  notificationIds?: string[];// For recurring reminders (one notification per scheduled day)
  pinned: boolean;
  deletedAt?: string | null; // ISO 8601 timestamp of soft-delete (null/undefined = not deleted)
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
| `widgetPinnedPresets` | `string[]` | `widgetPins.ts` | Ordered list of pinned timer preset IDs (max 3) |
| `widgetPinnedAlarms` | `string[]` | `widgetPins.ts` | Ordered list of pinned alarm IDs (max 3) |
| `memoryMatchScores` | `BestScores` | `MemoryMatchScreen.tsx` | Best moves + time per difficulty (easy/medium/hard) |
| `sudokuCurrentGame` | `SavedGame` | `SudokuScreen.tsx` | Current in-progress Sudoku puzzle state (for resume) |
| `sudokuBestScores` | `BestScores` | `SudokuScreen.tsx` | Best time + mistakes per difficulty (easy/medium/hard) |
| `defaultTimerSound` | `TimerSoundSetting` | `settings.ts` | Default timer completion sound (uri, name, soundID); null values = system default |
| `hapticsEnabled` | `string` | `SettingsScreen.tsx` | `'true'` or `'false'` — controls haptic feedback globally |
| `snoozeCount_{alarmId}` | `string` | `AlarmFireScreen.tsx` | Per-alarm snooze count (incremented on each snooze, reset on dismiss); drives escalating shame messages |
| `reminders` | `Reminder[]` | `reminderStorage.ts` | All reminder objects |

## Icon Reference

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

## Icon-to-Category Mapping

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

### Category Display Labels

| Category | Display |
|---|---|
| meds | 💊 Meds |
| appointment | 📅 Appt |
| event | 🎉 Event |
| task | ✅ Task |
| self-care | 🧘 Self-Care |
| general | 🔔 General |
