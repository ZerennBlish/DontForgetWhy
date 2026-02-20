# Audit History

Code audits performed by the four-AI team. Auditors: Codex (OpenAI) as primary auditor, Gemini CLI (Google) as second-opinion auditor.

> **Note:** Only audits 9-13, 17, and 19 are documented here. Audits 1-8, 14-16, and 18 pre-date the documentation system.

## Audit 19 (February 20, 2026)

### Findings

- **[CRITICAL]** Weekly multi-day early completion creates duplicate triggers — reschedules same day +7 instead of shifting to next day. **RESOLVED.**
- **[IMPORTANT]** One-time alarms ghost on active list after notification swipe dismiss — was only disabling, not soft-deleting. Background handler now fully soft-deletes one-time alarms on DISMISSED event. **RESOLVED.**
- **[IMPORTANT]** Alarm Sort & Filter collapse resets to All instead of Active — inconsistent with reminder tab behavior. Now resets to Active on both tabs. **RESOLVED.**
- **[MINOR]** Date-only recurring completion window was early-only — expanded to +/- 1 day. **RESOLVED.**
- **[MINOR]** CreateAlarmScreen does not clear selectedDate on One-time → Recurring switch — was already fixed on reminder screen, now fixed on alarm screen too. **RESOLVED.**

### Verified Clean

- Sudoku stats persistence
- Feedback email device info
- Pop Culture removal complete
- Yearly reminder reschedule
- Recurring alarms not affected by one-time ghost fix

## Audit 17 (February 19, 2026)

### Scope

Recurring reminders, layout rework, time input, and game navigation.

### Changes Implemented

- Split hour:minute time input replacing single auto-formatting field on CreateAlarmScreen and CreateReminderScreen
- Alarm screen layout rework: One-time default, subtle date row, day circles always visible, smart date defaulting
- Reminder screen layout rework: new field order, removed Due Time / Due Date toggles, nickname above note
- Recurring reminder support: daily, weekly (by day), yearly (by date), one-time; 5 scheduling scenarios in notifications.ts
- Completion history array replacing single completedAt; one-per-day guard; backward compat migration
- 6-hour early completion window with dimmed Done button outside window
- Deleting recurring from Completed filter clears history only (does not soft-delete the active reminder)
- Smart date defaulting: exact-to-the-minute comparison, dynamic updates on time field changes
- Unified "< Back" buttons on all game screens (MemoryMatch, Sudoku, Trivia, DailyRiddle) including completion screens
- Trivia fixed floating bottom panel for difficulty, speed, and Start Round
- Sudoku: real-time error highlighting removed, board more transparent
- fullscreenicon.png watermark added to CreateAlarmScreen and CreateReminderScreen
- Sort & Filter panel defaults back to Active filter on collapse
- Pop Culture trivia category fully removed (remaining references cleaned from types, data, screens, storage)
- Yearly reminder reschedule handler in App.tsx

## Audit 13

### Scope

Delete mechanism, visual polish, and privacy fixes.

### Findings & Changes

- **[IMPORTANT]** SwipeableRow swipe-to-delete/complete conflicts with react-native-tab-view horizontal swiping — removed and replaced with tap-based Delete/Done buttons. **RESOLVED.**
- **[IMPORTANT]** Snooze notification body only checked `guessWhyEnabled` for hiding note — now also checks `alarm.private`. **RESOLVED.**
- **[MINOR]** Trivia crashes when category + difficulty yields empty question array (e.g. Kids + Hard) — guard added. **RESOLVED.**
- Sort & Filter toggle button made always visible on empty states (access "Deleted" filter for restoring trashed items)
- Sudoku grid restyled as newspaper puzzle: transparent background, bold given numbers, styled grid lines with thicker 3x3 box borders
- Memory Score / Stats screen: `library.png` background with dark overlay and semi-transparent cards
- Semi-transparent glass-style cards extended to Sudoku, Memory Match, and Trivia difficulty-select screens
- Empty state icon/image removed from Alarms and Reminders tabs (text only)
- Games Hub Trivia description updated to "10 categories. 370+ questions offline."

## Audit 12

### Scope

Icon reorganization, trivia expansion, and UI polish.

### Changes Implemented

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

## Audit 11

### Scope

Swipe tabs, soft delete, and empty states.

### Findings & Changes

- Swipe between tabs via `react-native-tab-view` + `react-native-pager-view` — gesture conflict with SwipeableRow initially resolved at native level (later replaced with tap buttons in Audit 13)
- Soft delete / trash system for alarms and reminders with restore and permanent delete
- **[IMPORTANT]** Empty state rendering broken: `loadAlarms(true)` / `getReminders(true)` load soft-deleted items; empty state condition checked raw array length instead of `hasNonDeletedAlarms` / `totalActiveReminders`. **RESOLVED.**
- **[MINOR]** Reminder empty state didn't distinguish between "zero active reminders" and "filter yields no results". **RESOLVED.**
- Timer empty state removed (preset grid IS the content)
- Reminder quotes added using shared `appOpenQuotes.ts` pool
- **[MINOR]** Reminder icon-only save validation rejected valid icon-only saves (`!text.trim() && !selectedIcon` check added). **RESOLVED.**

## Audit 10

### Scope

Trivia system and general bug fixes.

### Findings & Changes

- **[IMPORTANT]** Trivia seen-question reset fires at < 10 remaining instead of 0 — changed to 0 remaining for proper depletion. **RESOLVED.**
- **[IMPORTANT]** General Knowledge should pull from ALL categories (grab bag design), not just its own. **RESOLVED.**
- Vibration paths verified across background, foreground, cold start — all correct
- **[IMPORTANT]** `disableAlarm` did not cancel scheduled notifications — now cancels all. **RESOLVED.**
- **[MINOR]** `soundID` not persisted, causing picker to lose checkmark state. **RESOLVED.**
- **[MINOR]** Stale reminder count in subtitle — fixed. **RESOLVED.**

## Audit 9

### Scope

Custom sound system.

### Findings & Changes

- Notification-level sound override via dynamic channels — implemented
- **[IMPORTANT]** Sound leak in SoundPickerModal — preview sound continued playing after modal close. `isActiveRef` guard and `cancelSoundPreview()` on unmount added. **RESOLVED.**
- Timer resume state with custom sound channels — verified
- **[MINOR]** expo-av `AudioFocusNotAcquiredException` in release builds — fixed initially, then expo-av removed entirely in favor of Notifee-based sound preview. **RESOLVED.**
