# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off.

## Tech Stack
- React Native + Expo + TypeScript
- AsyncStorage for local persistence
- expo-notifications for alarms (requires development build for full functionality)
- Target: Android (primary), iOS (secondary)

## Project Structure
src/
├── components/
│   └── AlarmCard.tsx          # Alarm list item with nickname/icon display
├── data/
│   ├── guessWhyIcons.ts       # Ordered icon array (24 icons) for icon picker + Guess Why game
│   ├── guessWhyMessages.ts    # Win/lose/skip messages for Guess Why mini-game
│   ├── placeholders.ts        # Rotating witty placeholder text for note field
│   └── snoozeMessages.ts      # Escalating snooze shame messages (4 tiers)
├── navigation/
│   └── types.ts               # RootStackParamList type definitions
├── screens/
│   ├── AlarmFireScreen.tsx     # Alarm dismiss screen (shows why + quote + snooze shame)
│   ├── AlarmListScreen.tsx     # Main screen — alarm list, streak display, settings nav
│   ├── CreateAlarmScreen.tsx   # Create alarm with nickname, note, icon picker
│   ├── GuessWhyScreen.tsx      # Mini-game: guess why you set the alarm (3 attempts)
│   └── SettingsScreen.tsx      # Toggle Guess Why on/off
├── services/
│   ├── guessWhyStats.ts       # AsyncStorage stats: wins, losses, skips, streak, bestStreak
│   ├── notifications.ts       # expo-notifications scheduling and permissions
│   ├── quotes.ts              # Motivational quotes attached to alarms
│   ├── settings.ts            # AsyncStorage app settings (guessWhyEnabled)
│   └── storage.ts             # AsyncStorage alarm CRUD operations
├── types/
│   └── alarm.ts               # Alarm interface and AlarmCategory type
└── utils/
    └── time.ts                # Time formatting utilities

## Data Model

### Alarm
```typescript
interface Alarm {
  id: string;
  time: string;              // "HH:MM" 24-hour format
  note: string;              // The "why" — private, shown only in-app
  quote: string;             // Random motivational quote assigned at creation
  enabled: boolean;
  recurring: boolean;
  days: number[];
  category: AlarmCategory;   // 'meds' | 'appointment' | 'task' | 'self-care' | 'general'
  createdAt: string;         // ISO date string
  notificationId?: string;   // expo-notifications identifier
  nickname?: string;         // Public display name (shows on lock screen + alarm card)
  icon?: string;             // Emoji from icon picker (shows on alarm card + notifications)
}
```

### GuessWhyStats
```typescript
interface GuessWhyStats {
  wins: number;
  losses: number;
  skips: number;
  streak: number;        // Current consecutive wins
  bestStreak: number;    // All-time best streak
}
```

### AppSettings
```typescript
interface AppSettings {
  guessWhyEnabled: boolean;  // Default: false
}
```

## Screen Flow

1. **AlarmListScreen** — Main hub. Shows all alarms with nickname/icon, streak counter, settings gear.
2. **CreateAlarmScreen** — Set time, add nickname (optional), add note/why, pick icon. Need at least a note or icon to save.
3. **GuessWhyScreen** (if enabled) — 3 attempts to guess why via icon grid or text input. Tracks stats.
4. **AlarmFireScreen** — Shows the full alarm: time, note/why, motivational quote, snooze with escalating shame.
5. **SettingsScreen** — Toggle Guess Why mini-game on/off.

## Key Behaviors

- **Nickname privacy**: Nickname shows on lock screen notifications and alarm cards. The "why" note stays private, only visible on AlarmFireScreen inside the app.
- **Icon picker**: Replaces category chips. Selected icon auto-maps to a category behind the scenes (e.g., 💊→meds, 🏋️→self-care, 📅→appointment). No icon = 'general'.
- **Guess Why matching**: Icon mode checks icon id against category + alarm note keywords. Type mode checks if typed text appears in the note. Case-insensitive.
- **Snooze shame**: 4 tiers of escalating messages. Tier 1 (gentle) → Tier 4+ (giving up). Button text changes each snooze.
- **Streak**: Consecutive Guess Why wins. Resets on loss or skip. Displayed on AlarmListScreen header.

## Current Limitations

- Notifications only work in development builds (not Expo Go)
- Snooze does not actually reschedule (needs development build)
- Alarms cannot be edited after creation (planned)
- No home screen widget yet (planned, needs development build)

## Planned Features

- Edit existing alarms
- Memory Score screen (Wall of Remembrance / Hall of Shame with rank tiers)
- Random app-open quotes
- Timer system with quick-tap presets
- Forced alarm notifications (bypass DND)
- Home screen widget for timers
- "What Did I Forget?" screen (log of lost/skipped guesses)
