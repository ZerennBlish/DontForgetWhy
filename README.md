# Don't Forget Why

A mobile alarm app that forces you to remember *why* you set each alarm — not just when it goes off.

**Publisher:** Bald Guy & Company Games
**Feedback:** baldguyandcompanygames@gmail.com

## What It Does

- Alarms with notes explaining *why* you set them
- "Guess Why" memory game — guess the reason before seeing the answer
- Recurring and one-time alarms + reminders with flexible scheduling
- Full timer system with 46 presets and two home screen widgets
- Mini-games: Memory Match, Sudoku, Trivia (370+ questions), Daily Riddle
- 8 themes (4 dark, 4 light) + custom color picker
- Full-screen alarm wake over lock screen with snooze shame
- Per-alarm custom sounds from system ringtones
- Soft delete with trash and restore
- Sarcastic personality throughout

## Tech Stack

- **React Native + Expo** — Managed workflow with custom native plugins
- **TypeScript** — Full type coverage
- **@notifee/react-native** — Notifications, alarm scheduling, sound playback, DND bypass
- **react-native-android-widget** — Two home screen widgets (compact + detailed)
- **react-native-tab-view + react-native-pager-view** — Swipeable tab navigation
- **AsyncStorage** — All data persistence
- **EAS Build** — Development / preview / production profiles

## Setup

```bash
# Clone
git clone https://github.com/your-repo/DontForgetWhy.git
cd DontForgetWhy

# Install dependencies
npm install

# Start development
npx expo start

# Build (requires EAS CLI)
eas build --profile development --platform android
```

> **Note:** Widget and alarm wake features require a native build (not Expo Go).

## Development Team

Four-AI team:
- **Opus** (Claude) — Architecture decisions, system design
- **Claude Code** (CLI) — Implementation, code generation, file editing
- **Codex** (OpenAI) — Primary code auditor
- **Gemini CLI** (Google) — Second-opinion auditor

## Documentation

| Document | Contents |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | File structure, navigation, services, notification system, widgets, themes, mini-games, key patterns, full feature reference |
| [Data Models](docs/DATA_MODELS.md) | TypeScript interfaces, AsyncStorage keys, icon reference tables, category mappings |
| [Changelog](docs/CHANGELOG.md) | Session-by-session feature additions, bug fixes, and changes |
| [Audit History](docs/AUDIT_HISTORY.md) | Code audit findings (Audits 9-19) with severity ratings and resolution status |
