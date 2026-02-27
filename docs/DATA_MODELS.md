# Data Models

> Every type, storage key, channel ID, and constant in the codebase. Updated Feb 2026.

---

## TypeScript Interfaces

### Alarm (`src/types/alarm.ts`)

```typescript
type AlarmDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type AlarmCategory = 'meds' | 'appointment' | 'event' | 'task' | 'self-care' | 'general';

interface Alarm {
  id: string;                    // UUID
  time: string;                  // "HH:MM" (24h format, stored)
  nickname?: string;             // Optional display name (40 char max)
  note: string;                  // Why the alarm was set (200 char max)
  quote: string;                 // Motivational quote from quotes.ts
  enabled: boolean;              // Active/inactive toggle
  mode: 'recurring' | 'one-time';
  days: AlarmDay[];              // Days to repeat (empty = all days for recurring)
  date: string | null;           // "YYYY-MM-DD" for one-time alarms
  category: AlarmCategory;
  icon?: string;                 // Emoji string from guessWhyIcons.ts
  private: boolean;              // Hides note+icon in notifications and GuessWhy
  createdAt: string;             // ISO timestamp
  notificationIds: string[];     // Notifee notification IDs (one per scheduled day)
  soundId?: string;              // Preset sound: 'default'|'gentle'|'urgent'|'classic'|'digital'|'silent'
  soundUri?: string | null;      // Custom system sound content:// URI
  soundName?: string | null;     // Display name of custom sound
  soundID?: number | null;       // Raw Android media ID (legacy)
  deletedAt?: string | null;     // ISO timestamp for soft delete
  notificationId?: string;       // @deprecated — use notificationIds
  recurring?: boolean;           // @deprecated — use mode
}
```

**Constants:**
- `ALL_DAYS: AlarmDay[]` = `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']`
- `WEEKDAYS: AlarmDay[]` = `['Mon', 'Tue', 'Wed', 'Thu', 'Fri']`
- `WEEKENDS: AlarmDay[]` = `['Sat', 'Sun']`

### Reminder (`src/types/reminder.ts`)

```typescript
interface CompletionEntry {
  completedAt: string;           // ISO timestamp
  scheduledFor?: string;         // ISO timestamp of the occurrence this completion covers
}

interface Reminder {
  id: string;                    // UUID
  icon: string;                  // Emoji string
  text: string;                  // Reminder text
  nickname?: string;             // Optional display name
  private: boolean;              // Hides text in notifications
  completed: boolean;            // Current completion status
  createdAt: string;             // ISO timestamp
  completedAt: string | null;    // ISO timestamp of last completion
  dueDate: string | null;        // "YYYY-MM-DD" for yearly or one-time
  dueTime: string | null;        // "HH:MM" for notification scheduling
  notificationId: string | null; // Single Notifee ID (legacy)
  pinned: boolean;               // Pinned to widget
  deletedAt?: string | null;     // ISO timestamp for soft delete
  days?: string[];               // Day indices for weekly: '0'=Sun, '1'=Mon, ..., '6'=Sat
  recurring?: boolean;           // Is recurring (daily, weekly, or yearly)
  notificationIds?: string[];    // Array of Notifee IDs (one per weekly day)
  completionHistory?: CompletionEntry[]; // All completions for recurring reminders
}
```

### Timer (`src/types/timer.ts`)

```typescript
interface TimerPreset {
  id: string;                    // Preset ID ('pizza', 'laundry', etc.)
  icon: string;                  // Emoji
  label: string;                 // Display name
  seconds: number;               // Default duration
  customSeconds?: number;        // User-customized duration (overrides seconds)
}

interface ActiveTimer {
  id: string;                    // Unique instance ID (timestamp + random)
  presetId: string;              // Reference to TimerPreset.id
  label: string;                 // Display label
  icon: string;                  // Emoji
  totalSeconds: number;          // Original duration
  remainingSeconds: number;      // Time left (decremented in UI)
  startedAt: string;             // ISO timestamp when started
  isRunning: boolean;            // Currently counting down
  notificationId?: string;       // Notifee ID for completion notification
}
```

### Trivia (`src/types/trivia.ts`)

```typescript
type TriviaCategory = 'general' | 'science' | 'history' | 'music' | 'movies_tv'
                    | 'geography' | 'sports' | 'technology' | 'food' | 'kids';

interface TriviaQuestion {
  id: string;                    // Format: "{category}_{XXX}"
  category: TriviaCategory;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

interface TriviaRoundResult {
  category: TriviaCategory;
  totalQuestions: number;
  correctAnswers: number;
  longestStreak: number;
  averageTimeMs: number;
  date: string;                  // ISO date
}

interface TriviaCategoryStats {
  roundsPlayed: number;
  questionsAnswered: number;
  correct: number;
  bestScore: number;
}

interface TriviaStats {
  totalRoundsPlayed: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  bestRoundScore: number;
  bestRoundCategory: TriviaCategory | null;
  longestStreak: number;
  categoryStats: Record<TriviaCategory, TriviaCategoryStats>;
}
```

### Theme (`src/theme/colors.ts`)

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

### Pending Alarm (`src/services/pendingAlarm.ts`)

```typescript
interface PendingAlarmData {
  alarmId?: string;
  timerId?: string;
  notificationId?: string;
  timerLabel?: string;
  timerIcon?: string;
}
```

### Navigation Params (`src/navigation/types.ts`)

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

### Forget Log (`src/services/forgetLog.ts`)

```typescript
interface ForgetEntry {
  id: string;                    // UUID
  alarmNote: string;             // The alarm's note
  alarmNickname?: string;        // The alarm's nickname
  alarmIcon?: string;            // The alarm's icon
  alarmCategory: string;         // The alarm's category
  result: 'loss' | 'skip';      // What happened
  timestamp: string;             // ISO timestamp
}
```

### Guess Why Stats (`src/services/guessWhyStats.ts`)

```typescript
interface GuessWhyStats {
  wins: number;
  losses: number;
  skips: number;
  streak: number;                // Current consecutive wins
  bestStreak: number;            // Highest ever
}
// Default: { wins: 0, losses: 0, skips: 0, streak: 0, bestStreak: 0 }
```

### Memory Score (`src/services/memoryScore.ts`)

```typescript
interface ScoreBreakdown {
  guessWhy: number;              // 0-20
  memoryMatch: number;           // 0-20
  sudoku: number;                // 0-20
  dailyRiddle: number;           // 0-20
  trivia: number;                // 0-20
}

interface CompositeScore {
  total: number;                 // 0-100
  breakdown: ScoreBreakdown;
}
```

### Alarm Sound (`src/data/alarmSounds.ts`)

```typescript
interface AlarmSound {
  id: string;                    // 'default' | 'gentle' | 'urgent' | 'classic' | 'digital' | 'silent'
  label: string;
  icon: string;                  // Emoji
  channelId: string;             // Notification channel to use
  description: string;
}
```

### Riddle (`src/data/riddles.ts`)

```typescript
type RiddleCategory = 'memory' | 'classic' | 'wordplay' | 'logic' | 'quick';
type RiddleDifficulty = 'easy' | 'medium' | 'hard';

interface Riddle {
  id: number;
  question: string;
  answer: string;
  difficulty: RiddleDifficulty;
  category: RiddleCategory;
}
```

### Memory Rank (`src/data/memoryRanks.ts`)

```typescript
interface RankTier {
  min: number;
  max: number;
  title: string;
  emoji: string;
}
```

### App Settings (`src/services/settings.ts`)

```typescript
interface AppSettings {
  guessWhyEnabled: boolean;      // Default: true
  timeFormat: '12h' | '24h';    // Default: '12h'
}

interface TimerSoundSetting {
  uri: string | null;
  name: string | null;
  soundID: number | null;
}
```

---

## AsyncStorage Keys

### Core Data

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'alarms'` | `Alarm[]` | `storage.ts` | `[]` | All alarms including soft-deleted |
| `'reminders'` | `Reminder[]` | `reminderStorage.ts` | `[]` | All reminders including soft-deleted |
| `'activeTimers'` | `ActiveTimer[]` | `timerStorage.ts` | `[]` | Currently running/paused timers |

### Settings

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'appSettings'` | `AppSettings` | `settings.ts` | `{guessWhyEnabled:true, timeFormat:'12h'}` | App-wide settings |
| `'onboardingComplete'` | `string` | `settings.ts` | `undefined` (falsy) | `'true'` when onboarding done |
| `'defaultTimerSound'` | `TimerSoundSetting` | `settings.ts` | `{uri:null, name:null, soundID:null}` | Timer completion sound |
| `'hapticsEnabled'` | `string` | `haptics.ts` | `undefined` (defaults to enabled) | `'true'` or `'false'` |

### Theme

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'appTheme'` | `ThemeName` | `ThemeContext.tsx` | `'midnight'` | Selected theme name |
| `'customTheme'` | `{ accent: string }` | `ThemeContext.tsx` | `undefined` | Custom accent hex color |

### Game Stats

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'guessWhyStats'` | `GuessWhyStats` | `guessWhyStats.ts` | `{wins:0, losses:0, skips:0, streak:0, bestStreak:0}` | Guess Why game stats |
| `'forgetLog'` | `ForgetEntry[]` | `forgetLog.ts` | `[]` | Failed/skipped guess attempts |
| `'memoryMatchScores'` | `{easy?, medium?, hard?}` | MemoryMatchScreen | `{}` | Best moves per difficulty |
| `'sudokuBestScores'` | `{easy?, medium?, hard?}` | SudokuScreen | `{}` | Best time/mistakes per difficulty |
| `'sudokuCurrentGame'` | game state object | SudokuScreen | `undefined` | In-progress Sudoku save |
| `'dailyRiddleStats'` | stats object | DailyRiddleScreen | `{streak:0, longestStreak:0, totalPlayed:0, totalCorrect:0, seenRiddleIds:[]}` | Daily riddle tracking |
| `'triviaStats'` | `TriviaStats` | `triviaStorage.ts` | zeroed stats | Trivia game stats |
| `'triviaSeenQuestions'` | `Record<category, string[]>` | `triviaStorage.ts` | `{}` | Seen question IDs per category |

### Timer

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'timerPresets'` | `Record<presetId, seconds>` | `timerStorage.ts` | `{}` | Custom durations for presets |
| `'recentPresets'` | `{presetId, timestamp}[]` | `timerStorage.ts` | `[]` | Recently used presets (max 20) |

### Widget Pins

| Key | Type | Stored By | Default | Description |
|-----|------|-----------|---------|-------------|
| `'widgetPinnedPresets'` | `string[]` | `widgetPins.ts` | `[]` | Pinned timer preset IDs (max 3) |
| `'widgetPinnedAlarms'` | `string[]` | `widgetPins.ts` | `[]` | Pinned alarm IDs (max 3) |
| `'widgetPinnedReminders'` | `string[]` | `widgetPins.ts` | `[]` | Pinned reminder IDs (max 3) |

### Per-Alarm Dynamic Keys

| Key Pattern | Type | Stored By | Description |
|-------------|------|-----------|-------------|
| `'snoozeCount_{alarmId}'` | `string` (number) | `AlarmFireScreen.tsx` | Snooze count for escalating shame messages. Reset on dismiss. |

---

## Notification Channel IDs

### Preset Alarm Channels (created in `AlarmChannelHelper.createPresetChannels()` and `notifications.setupNotificationChannel()`)

All alarm channels are **SILENT** (no sound property). Audio plays via native MediaPlayer with `USAGE_ALARM`.

| Channel ID | Name | Importance | Vibration Pattern | Light Color | DND Bypass |
|-----------|------|-----------|-------------------|-------------|------------|
| `alarms_v5` | Alarms | HIGH | [300, 300] | #FF0000 | YES |
| `alarms_gentle_v4` | Alarms (Gentle) | DEFAULT | [100, 200] | #FFD700 | YES |
| `alarms_urgent_v4` | Alarms (Urgent) | HIGH | [250, 250, 250, 250, 250, 250] | #FF0000 | YES |
| `alarms_classic_v4` | Alarms (Classic) | HIGH | [300, 300, 300, 300] | #FF6600 | YES |
| `alarms_digital_v4` | Alarms (Digital) | HIGH | [100, 100, 100, 100] | #00FF00 | YES |
| `alarms_silent_v4` | Alarms (Silent) | LOW | [500, 500] | #808080 | YES |

### Utility Channels

| Channel ID | Name | Importance | Sound | Vibration | DND Bypass |
|-----------|------|-----------|-------|-----------|------------|
| `timer-progress` | Timer Progress | DEFAULT | none | NO | NO |
| `reminders` | Reminders | DEFAULT | `'default'` (system) | YES | NO |

### Dynamic Channels (created at runtime via `getOrCreateSoundChannel()`)

| Channel ID Pattern | Purpose | Created When |
|-------------------|---------|-------------|
| `alarm_v2_custom_{mediaId}` | Custom alarm sound channel | Alarm saved with system sound |
| `timer_v2_custom_{mediaId}` | Custom timer sound channel | Timer uses custom sound |
| `preview_{mediaId}` | Sound preview channel | User previews a sound in SoundPickerModal |

`mediaId` is extracted from the sound URI (`content://media/internal/audio/media/1234` → `1234`) or a hash of the URI string.

### Legacy Channel IDs (deleted on every startup)

These are deleted in both native `AlarmChannelHelper.createPresetChannels()` and JS `_createChannels()`:

```
alarms, alarms_v2, alarms_v3, alarms_v4
alarms_gentle, alarms_gentle_v2, alarms_gentle_v3
alarms_urgent, alarms_urgent_v2, alarms_urgent_v3
alarms_classic, alarms_classic_v2, alarms_classic_v3
alarms_digital, alarms_digital_v2, alarms_digital_v3
alarms_silent, alarms_silent_v2, alarms_silent_v3
```

---

## Module-Level In-Memory State

These are NOT persisted in AsyncStorage. They live in JS module scope and reset on app restart.

| Variable | File | Type | Purpose |
|----------|------|------|---------|
| `_pending` | `pendingAlarm.ts` | `PendingAlarmData \| null` | Data bridge from background handler to React init |
| `_handledNotifs` | `pendingAlarm.ts` | `Map<string, number>` | Dedupe map: notification ID → timestamp (10-min TTL) |
| `_playing` | `alarmSound.ts` | `boolean` | Whether MediaPlayer is currently playing |
| `_hapticsEnabled` | `haptics.ts` | `boolean` | Cached haptics setting (loaded from AsyncStorage on init) |
| `_channelPromise` | `notifications.ts` | `Promise<void> \| null` | Singleton: ensures channels created only once |
| `_previewTimer` | `notifications.ts` | `timeout \| null` | Auto-cancel timer for sound preview (3s) |
| `_previewCallId` | `notifications.ts` | `number` | Counter to handle rapid preview taps |

---

## Alarm Sound Presets (`src/data/alarmSounds.ts`)

| ID | Label | Icon | Channel ID | Description |
|----|-------|------|-----------|-------------|
| `default` | Default | `🔔` | `alarms_v5` | Standard alarm tone |
| `gentle` | Gentle | `🌅` | `alarms_gentle_v4` | Soft wake-up chime |
| `urgent` | Urgent | `🚨` | `alarms_urgent_v4` | Can't ignore this one |
| `classic` | Classic | `⏰` | `alarms_classic_v4` | Old school alarm clock |
| `digital` | Digital | `📟` | `alarms_digital_v4` | Modern digital beep |
| `silent` | Silent | `🔇` | `alarms_silent_v4` | Vibration only, no sound |

---

## Timer Presets (`src/data/timerPresets.ts`)

48 presets. Key entries:

| ID | Label | Icon | Default Seconds |
|----|-------|------|----------------|
| `pizza` | Pizza | 🍕 | 720 (12 min) |
| `laundry` | Laundry | 👕 | 2700 (45 min) |
| `stove` | Stove | 🔥 | 1200 (20 min) |
| `break` | Break | ☕ | 900 (15 min) |
| `lunch` | Meal | 🍽️ | 3600 (1 hr) |
| `nap` | Nap | 😴 | 1800 (30 min) |
| `workout` | Workout | 🏃‍♀️ | 2700 (45 min) |
| `meds` | Meds | 💊 | 300 (5 min) |
| `custom` | Custom | ➕ | 60 (1 min) |

Users can customize durations; stored in AsyncStorage `'timerPresets'` as `Record<presetId, seconds>`.

---

## Memory Rank Tiers (`src/data/memoryRanks.ts`)

| Score Range | Title | Emoji |
|------------|-------|-------|
| 98–100 | The One Who Remembers | 👑 |
| 89–97 | Steel Trap | 🧠 |
| 76–88 | Annoyingly Good | 😏 |
| 61–75 | Borderline Impressive | 🤩 |
| 46–60 | Surprisingly Sharp | 🧠 |
| 31–45 | Getting Suspicious | 🤔 |
| 16–30 | Occasionally Aware | 😑 |
| 6–15 | Sticky Note Dependent | 📝 |
| 0–5 | Who Are You Again? | 🐟 |

---

## Guess Why Icons (`src/data/guessWhyIcons.ts`)

45 icons grouped by category:

| Category | Icons |
|----------|-------|
| Health & Medical | 💊 meds, 🏥 doctor, ⚕️ medical, 🪷 dentist |
| Events & Social | 📅 appointment, 👥 meeting, 💍 anniversary, 🎂 birthday, ❤️ date, 🙏 church, 🎉 celebration |
| Work & Tasks | 💼 work, 💲 bills, 📝 homework, 📄 documents, 💻 computer, 📱 phone, 📬 mail, 🏫 school |
| Home & Errands | 👶 kids, 🐾 pet, 🍽️ meal, 🛒 shopping, 📦 delivery, 🚗 car, 🚌 transit, 🧹 cleaning, 👕 laundry, 🗑️ trash, 🔒 door, 🌱 plant |
| Self-Care | 🏃 dumbbell, 🧘 yoga, 💧 hydrate, 🚿 shower, 🛏️ bedtime, 💇 haircut |
| Other | ✈️ travel, 🔨 auction, 📖 book, ➕ custom |

---

## Snooze Message Tiers (`src/data/snoozeMessages.ts`)

| Tier | Snooze # | Example |
|------|----------|---------|
| 0 | 1st | "Okay, 5 more minutes. But I'm watching you." |
| 1 | 2nd | "Again? Really? This is snooze #2." |
| 2 | 3rd | "This is snooze #3. At this point I'm just talking to myself." |
| 3 | 4th+ | "I'm not even surprised anymore." |

7 messages per tier, randomly selected. Tier determined by `getSnoozeMessage(count)`.

---

## Migration Logic

### Alarm Migration (`src/services/storage.ts`)

On `loadAlarms()`, old data is detected and migrated:

| Old Format | New Format | Migration |
|-----------|-----------|-----------|
| `days: number[]` (0-6) | `days: AlarmDay[]` ('Mon'-'Sun') | Map indices to day names |
| `notificationId: string` | `notificationIds: string[]` | Wrap in array |
| `recurring: boolean` | `mode: 'recurring' \| 'one-time'` | `true` → 'recurring', `false` → 'one-time' |
| Missing `soundId` | `soundId: 'default'` | Set default |

### Reminder Migration (`src/services/reminderStorage.ts`)

On `getReminders()`:
- If `completedAt` exists but `completionHistory` is empty → creates `[{ completedAt }]`
- Ensures `completionHistory` array always exists

### Trivia Migration (`src/services/triviaStorage.ts`)

- Old flat `string[]` of seen IDs → `Record<category, string[]>` (migrated under `'general'` key)

---

## Score Calculation Details (`src/services/memoryScore.ts`)

### Keys Read (ALL_STATS_KEYS)

```typescript
const ALL_STATS_KEYS = [
  'guessWhyStats', 'streakCount', 'memoryMatchScores',
  'sudokuBestScores', 'sudokuCurrentGame', 'dailyRiddleStats',
  'forgetLog', 'triviaStats', 'triviaSeenQuestions'
];
```

These are all cleared by `resetAllScores()`.

### Scoring Formulas

**Guess Why (0-20):**
- `winRate = wins / (wins + losses + skips)` → × 12 points
- `streakBonus = min(streak, 8)` → × 1 point

**Memory Match (0-20):**
- Per difficulty: compare moves to par → 1-3 stars → × multiplier
- Easy par=8, multiplier=1.5x | Medium par=12, multiplier=2.5x | Hard par=16, multiplier=3x

**Sudoku (0-20):**
- Per difficulty: time-based stars with hint penalty → × multiplier
- Easy multiplier=1.5x | Medium multiplier=2.5x | Hard multiplier=3x

**Daily Riddle (0-20):**
- Accuracy: `(correct / totalPlayed) × 10`
- Streak: `min(longestStreak, 10) × 1`

**Trivia (0-20):**
- Accuracy: `(totalCorrect / totalQuestionsAnswered) × 10`
- Best round: `bestRoundScore × 0.5` (max 5)
- Breadth: `categoriesPlayed × 0.625` (max 5 for 8+ categories)
