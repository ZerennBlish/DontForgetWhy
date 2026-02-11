# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off. Includes a full timer system with quick-tap presets, a "Guess Why" memory mini-game, escalating snooze shame, and a sarcastic personality throughout.

## Tech Stack

- **Framework**: React Native + Expo (New Architecture enabled)
- **Language**: TypeScript
- **Navigation**: @react-navigation/native + @react-navigation/native-stack
- **Persistence**: @react-native-async-storage/async-storage
- **Notifications**: expo-notifications + expo-device
- **IDs**: uuid v4 (via react-native-get-random-values polyfill)
- **Target Platforms**: Android (primary, edge-to-edge enabled), iOS (supportsTablet), Web (favicon only)

## Features

1. **Alarm creation** — Set time (HH:MM 24h input), add a note explaining *why*, optional nickname, optional icon, optional private toggle
2. **Alarm editing** — Tap edit on any alarm card to modify time, nickname, note, icon, and privacy; reschedules notification on save
3. **Alarm list** — Main screen shows all alarms with enable/disable switch, edit button, delete button (with confirmation)
4. **Alarms / Timers tab switcher** — Pill-shaped toggle on the main screen switches between alarm list and timer grid
5. **Icon picker** — 24-emoji grid on create/edit screen; selected icon auto-maps to a category behind the scenes
6. **Category auto-mapping** — Icon selection drives the category field (e.g. 💊 → meds, 🏋️ → self-care); unrecognized icons default to 'general'
7. **Private alarm mode** — Hides note/icon/nickname on the alarm card, shows "🔒 Private Alarm"; tap eye icon to peek for 3 seconds
8. **Motivational quotes** — Random quote from a pool of 12, assigned at alarm creation and shown on the fire screen
9. **App-open quotes** — Snarky rotating quote displayed at the top of the alarm list on every visit
10. **Rotating placeholder text** — The note input field shows a random witty placeholder from a pool of 12
11. **Guess Why mini-game** — When enabled, you must guess why you set the alarm before seeing the answer; 3 attempts via icon grid or free-text input
12. **Win/loss/skip tracking** — Every Guess Why outcome is recorded with running totals and streak counter
13. **Memory Score screen** — Shows win %, rank title + emoji, current streak, best streak, total games; links to Forget Log
14. **Memory rank tiers** — Five ranks from "Goldfish With Amnesia" (0-29%) to "Memory of an Elephant With a Vendetta" (90-100%)
15. **"What Did I Forget?" log** — Chronological list of every alarm you failed or skipped in Guess Why, with note, nickname, icon, timestamp, and result badge
16. **Snooze with escalating shame** — 4 tiers of increasingly judgmental messages; snooze button text degrades each tap
17. **Timer system** — 33 labeled presets + 1 custom entry in a 3-column grid; tap to start countdown
18. **Timer custom duration** — Long-press any preset to override its duration (saved per-preset in AsyncStorage)
19. **Timer recently-used sorting** — Used presets float to a "Recent" section at the top; up to 20 tracked
20. **Active timer management** — Live countdown display with pause/resume toggle and dismiss (X) button; persisted across app reloads
21. **Timer completion alerts** — Alert dialog fires when a timer reaches zero
22. **Notification scheduling** — Daily repeat notifications via expo-notifications; permission requested on first alarm save
23. **Notification deep-linking** — Tapping a notification opens GuessWhy (if enabled) or AlarmFire for the matching alarm
24. **Dark theme** — Full dark UI across all screens with consistent color palette
25. **Streak display** — Current streak and best streak shown in the alarm list header when the user has played at least one Guess Why round
26. **Trophy navigation** — Trophy icon in header navigates to Memory Score; only visible after first game played

## Data Models

### Alarm (`src/types/alarm.ts`)
```typescript
interface Alarm {
  id: string;               // uuid v4
  time: string;             // "HH:MM" 24-hour format
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
  notificationId?: string;  // expo-notifications identifier
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
| `appSettings` | `AppSettings` | `settings.ts` | App-wide settings (currently just guessWhyEnabled) |
| `forgetLog` | `ForgetEntry[]` | `forgetLog.ts` | Log of alarms the user forgot or skipped (newest first) |
| `timerPresets` | `Record<string, number>` | `timerStorage.ts` | Map of preset ID to custom duration override in seconds |
| `activeTimers` | `ActiveTimer[]` | `timerStorage.ts` | Currently running/paused timers (persisted for app reload) |
| `recentPresets` | `RecentEntry[]` | `timerStorage.ts` | Recently used timer presets sorted by last-used (max 20) |

## Screen Flow

### AlarmList (`AlarmListScreen.tsx`)
Main hub. Header shows app title, active alarm count, trophy button (if games played), gear button. Pill-shaped Alarms/Timers tab switcher. Alarms tab shows a random app-open quote card, FlatList of AlarmCards, and a FAB (+) to create. If Guess Why stats exist, a streak row displays below the tabs. Timers tab renders TimerScreen inline.

### CreateAlarm (`CreateAlarmScreen.tsx`)
Slide-from-bottom modal. Two large number inputs for hours/minutes. Nickname field (shows on lock screen). Note field with random placeholder ("Why are you setting this alarm?") and character counter (200 max). 24-icon picker grid. Private alarm toggle card. Save button. In edit mode, pre-fills all fields from the existing alarm and button says "Update Alarm". Requires at least a note or an icon to save.

### AlarmFire (`AlarmFireScreen.tsx`)
Full-screen fade-in, gesture disabled. Top: category emoji + formatted time + category label. Middle: the alarm note (the "why") + divider + the assigned quote. Snooze button with 4 escalating labels ("Snooze 5 min" → "Snooze Again" → "...Snooze Again" → "Fine, Snooze") and a random shame message per tier. Dismiss button says "I'm On It".

### GuessWhy (`GuessWhyScreen.tsx`)
Full-screen fade-in, gesture disabled. Top: alarm icon/category emoji + time + category label. Game area card with Icons/Type It mode toggle. Icons mode: scrollable 4-column grid of 24 icons with labels. Type It mode: text input with Guess button (min 3 chars). 3 attempts. Shake animation on wrong guess. Result overlay (green win / red lose / amber skip) with snarky message and continue button that navigates to AlarmFire. Skip button at bottom. Losses and skips are logged to the Forget Log.

### Settings (`SettingsScreen.tsx`)
Back button + title. Single card with a toggle switch for "Guess Why Mini-Game" and description text.

### MemoryScore (`MemoryScoreScreen.tsx`)
Back button + title. Large rank emoji + rank title (colored) + win percentage + subtitle ("Wall of Remembrance" if >= 50%, "Hall of Shame" if < 50%, "No games yet" if 0). Stats card with wins, losses, skips, divider, current streak, best streak, total games. "What Did I Forget?" button links to ForgetLog. Red "Reset Stats" button with confirmation alert.

### ForgetLog (`ForgetLogScreen.tsx`)
Back button + title + subtitle. FlatList of ForgetEntry cards showing emoji, note, nickname, result badge (❌ Forgot or ⏭️ Skipped), and formatted timestamp. Empty state message if no entries. "Clear Log" button at bottom with confirmation alert.

### TimerScreen (`TimerScreen.tsx`)
Rendered inline as a tab in AlarmListScreen (not a navigation screen). Active timers section at top with countdown display (MM:SS), pause/play toggle, and dismiss (✕). "Recent" section shows recently used presets. Main grid shows remaining presets + ➕ Custom button at end. 3-column grid layout. Tap to start timer. Long-press to set custom duration via modal (minutes input). Custom preset (seconds = 0) opens the duration modal on tap.

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
│   └── types.ts                   RootStackParamList with all screen route params
├── screens/
│   ├── AlarmFireScreen.tsx        Alarm dismiss screen with note, quote, snooze shame
│   ├── AlarmListScreen.tsx        Main screen with alarm list, tab switcher, FAB
│   ├── CreateAlarmScreen.tsx      Create/edit alarm with time, nickname, note, icon, privacy
│   ├── ForgetLogScreen.tsx        Chronological log of forgotten/skipped alarms
│   ├── GuessWhyScreen.tsx         Mini-game: guess the alarm reason in 3 attempts
│   ├── MemoryScoreScreen.tsx      Stats dashboard with rank, streak, win/loss totals
│   ├── SettingsScreen.tsx         Toggle Guess Why on/off
│   └── TimerScreen.tsx            Timer preset grid + active countdown timers
├── services/
│   ├── forgetLog.ts               CRUD for ForgetEntry[] in AsyncStorage
│   ├── guessWhyStats.ts           Win/loss/skip/streak tracking with validation
│   ├── notifications.ts           expo-notifications scheduling, permissions, cancellation
│   ├── quotes.ts                  12 motivational quotes assigned to alarms at creation
│   ├── settings.ts                AppSettings load/save (guessWhyEnabled)
│   ├── storage.ts                 Alarm CRUD: load, save, add, update, delete, toggle
│   └── timerStorage.ts            Timer preset custom durations, active timers, recent tracking
├── types/
│   ├── alarm.ts                   Alarm interface + AlarmCategory type
│   └── timer.ts                   TimerPreset + ActiveTimer interfaces
└── utils/
    └── time.ts                    formatTime (12h display) + getCurrentTime (24h string)
```

Root files:
- `App.tsx` — Navigation stack setup, dark theme, notification response listener
- `app.json` — Expo config (v1.0.0, portrait, new arch, edge-to-edge Android)

## Theme Colors

| Hex | Purpose |
|---|---|
| `#121220` | Screen background, input backgrounds, deep surfaces |
| `#1E1E2E` | Card/surface background (alarm cards, timer tiles, modals, tabs) |
| `#2A2A3E` | Borders, dividers, input outlines |
| `#EAEAFF` | Primary text (titles, times, labels, alarm notes) |
| `#B0B0CC` | Secondary text (detail lines, quotes, snooze button text) |
| `#7A7A9E` | Tertiary text (muted labels, descriptions, category tags, disabled) |
| `#555` | Disabled text, character counts, hints, timestamps |
| `#4A90D9` | Accent blue (buttons, active tabs, links, positive streak, switch track) |
| `#1A2A44` | Blue tinted background (active icon cells, pause button bg) |
| `#FF6B6B` | Error/danger red (delete text, timer done, streak broken, loss badge) |
| `#3A1A1A` | Red tinted background (delete/cancel/reset buttons) |
| `#FF9F43` | Warning orange (skip badge, Forgetful Squirrel rank) |
| `#FFD700` | Gold (Elephant rank) |
| `#999` | Disabled switch thumb |
| `#fff` | Button text on accent backgrounds |
| `rgba(34,139,34,0.85)` | Guess Why win overlay (green) |
| `rgba(180,40,40,0.85)` | Guess Why lose overlay (red) |
| `rgba(180,150,30,0.85)` | Guess Why skip overlay (amber) |
| `rgba(0,0,0,0.7)` | Modal backdrop |
| `rgba(255,255,255,0.25)` | Overlay continue button |

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

## Notification Privacy Rules

Defined in `notifications.ts`. The alarm note (the "why") is **never** included in the notification. This is the core privacy contract.

**Title**: `"${icon} ${CATEGORY}"` if the alarm has an icon, otherwise `"⏰ ${CATEGORY}"`

**Body** (priority order):
1. If alarm has a **nickname** → show the nickname
2. If no nickname but has an **icon** → show just the icon emoji
3. If neither → `"Time to do the thing!"`

**Trigger**: `SchedulableTriggerInputTypes.DAILY` at the alarm's hour and minute.

## Memory Rank Tiers

Based on win percentage = `wins / (wins + losses + skips) * 100`:

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

- **Development build (EAS)** — Required for full notification functionality (Expo Go has limited notification support)
- **Forced alarm notifications** — Bypass DND / silent mode for critical alarms
- **Home screen widget** — Quick-access timer widget (requires native module / development build)
- **Actual snooze rescheduling** — Currently snooze shows shame messages but does not reschedule the notification
- **Day-of-week recurring** — `recurring` and `days` fields exist on the Alarm model but are not yet exposed in the UI
