# Changelog

All notable changes to Don't Forget Why, organized by date.

## March 6, 2026

### New Feature: Notepad + Home Screen Widgets

**Notepad Screen:**
- Quick-capture notes accessible via 📝 header icon from main screen
- Sticky-note editor: note's color IS the background, auto text color via luminance detection
- 10 preset background colors + custom color picker (reanimated-color-picker)
- True base font colors (white, black, red, blue, green, orange, purple, pink) + custom font color picker
- Last-used custom color saved to a reusable slot for one-tap access
- 24 emoji icons across 4 categories (Ideas & Work, Daily Life, Health & People, Fun & Other)
- 500-character limit with color-changing counter (normal → orange at 450 → red at 490)
- Hyperlink detection: phone numbers, emails, URLs tappable in note cards (opens dialer/mail/browser)
- Long-press note card to copy text to clipboard
- Soft delete with UndoToast, deleted notes filter with restore/permanent delete
- Unsaved changes warning with on-brand copy ("You've got unsaved changes. Walk away and they're gone forever. Just like your memory.")
- Sassy save toasts ("Got it. Try not to forget this one too.", "Stored safely. Unlike your car keys.", etc.)
- Witty editor placeholders ("Type something before you forget... again.", "Your brain called. It wants backup.", etc.)
- Default pinned welcome note on first launch (yellow, 👋 icon)
- Note count badge on 📝 header icon

**Home Screen Widgets:**
- NotepadWidget (full): up to 4 notes as colored sticky-note cards, text expands with widget resize
- NotepadWidgetCompact: up to 3 notes as single-line previews
- Both widgets follow user's theme for background, note color as card background
- Auto text color (luminance detection) + custom font color support
- Witty rotating messages when empty ("Your memory isn't THAT good. Add a note.", "Even goldfish write things down.", etc.)
- Widget tap actions: tap note → opens that note's editor, tap + → blank editor, tap title → note list

**Widget Deep-Link:**
- Widget stores pending action in AsyncStorage, app reads on foreground/navigation ready
- Three actions: open note list, open specific note editor, open blank editor

**Integration:**
- purgeDeletedNotes() runs on app startup (30-day cycle, same as alarms/reminders)
- Note pins: max 4, managed via widgetPins.ts
- refreshTimerWidget() updated to also refresh both notepad widgets

### Production Resubmission Plan
- First production application rejected: "More testing required" — only 5/14 testers downloaded
- New strategy: notepad feature for daily engagement + paid tester service for 14-day requirement
- 25 verified testers via PrimeTestLab + organic Reddit recruitment

## February 20, 2026

### Bug Fixes

- One-time alarms no longer ghost on the active list after dismissal — they fully disappear and only appear in deleted view
- Sudoku difficulty tabs: removed incorrect clue count display, now shows only difficulty name and games played count
- Sudoku stats now properly track and persist game completions across sessions

### Audit 19 Fixes

- **CRITICAL**: Weekly multi-day early completion no longer creates duplicate triggers — now reschedules same day +7 instead of shifting to next day
- **IMPORTANT**: One-time alarms fully soft-deleted on notification swipe dismiss (was only disabling, causing ghost)
- **IMPORTANT**: Alarm Sort & Filter collapse now resets to Active (was resetting to All, inconsistent with reminders)
- **MINOR**: Date-only recurring completion window expanded to +/- 1 day (was early-only)
- **MINOR**: CreateAlarmScreen now clears selectedDate on One-time → Recurring switch (was already fixed on reminder screen)

## February 19, 2026

### Audit 17: Recurring Reminders, Layout Rework, Time Input & Game Navigation

**New Features:**
- Split hour:minute time input replacing single auto-formatting field on CreateAlarmScreen and CreateReminderScreen
- Recurring reminder support: daily, weekly (by day), yearly (by date), one-time; 5 scheduling scenarios in notifications.ts
- Completion history array replacing single completedAt; one-per-day guard; backward compat migration
- 6-hour early completion window with dimmed Done button outside window
- Deleting recurring from Completed filter clears history only (does not soft-delete the active reminder)
- Yearly reminder reschedule handler in App.tsx

**Layout Changes:**
- Alarm screen layout rework: One-time default, subtle date row, day circles always visible, smart date defaulting
- Reminder screen layout rework: new field order, removed Due Time / Due Date toggles, nickname above note
- Smart date defaulting: exact-to-the-minute comparison, dynamic updates on time field changes

**UI/UX:**
- Unified "< Back" buttons on all game screens (MemoryMatch, Sudoku, Trivia, DailyRiddle) including completion screens
- Trivia fixed floating bottom panel for difficulty, speed, and Start Round
- Sudoku: real-time error highlighting removed, board more transparent
- `fullscreenicon.png` watermark added to CreateAlarmScreen and CreateReminderScreen
- Sort & Filter panel defaults back to Active filter on collapse

**Cleanup:**
- Pop Culture trivia category fully removed (remaining references cleaned from types, data, screens, storage)

## Earlier Sessions (undated)

### Audit 13: Delete Mechanism, Visual Polish & Privacy

- SwipeableRow swipe-to-delete/complete removed from alarm and reminder cards (gesture conflict with react-native-tab-view)
- Replaced with tap-based buttons: red "Delete" text button with confirmation, green "Done" button on reminders
- UndoToast still triggers on soft-delete
- Sort & Filter toggle button always visible on empty states (access "Deleted" filter for restore)
- Sudoku grid restyled as newspaper puzzle: transparent background, bold given numbers, styled grid lines
- Memory Score / Stats screen: `library.png` background image with dark overlay and semi-transparent cards
- Semi-transparent glass-style cards extended to Sudoku, Memory Match, and Trivia difficulty-select screens
- Empty state icon/image removed from Alarms and Reminders tabs (text only)
- Trivia crash fix: guard for empty question array when category + difficulty yields no results
- Snooze privacy fix: notification body hides note when `alarm.private` OR `guessWhyEnabled` (was only checking `guessWhyEnabled`)
- Games Hub Trivia description updated to "10 categories. 370+ questions offline."

### Audit 12: Icon Reorganization, Trivia Expansion & UI Polish

- Icon set expanded from 25 to 38 with 6 organized categories
- Timer presets expanded from 36 to 46
- `iconCategoryMap` expanded to 22 entries with new `event` category
- Tap-to-edit on alarm and reminder cards (pencil icon removed)
- Send Feedback email card in Settings
- Trivia difficulty filter (Easy/Medium/Hard/All)
- Trivia timer speed (Relaxed 25s / Normal 15s / Blitz 8s)
- Kids trivia category (45 age-appropriate questions, offline only)
- Music and Movies & TV trivia categories (10 total, split from Pop Culture)
- Online mode disabled with "Coming soon" for Trivia and Daily Riddle
- Background images on 7 game screens with dark overlays
- Semi-transparent glass-style cards on Games Hub and Settings
- Full-screen app icon watermark on main alarm/timer/reminder tabs

### Audit 11: Swipe Tabs, Soft Delete & Empty States

- Swipe between tabs via `react-native-tab-view` + `react-native-pager-view`
- Soft delete / trash system for alarms and reminders with restore and permanent delete
- Empty state rendering fixed: proper checks for non-deleted items vs raw array length
- Reminder empty state correctly distinguishes between "zero active" and "filter yields no results"
- Timer empty state removed (preset grid IS the content)
- Reminder quotes added using shared `appOpenQuotes.ts` pool
- Reminder icon-only save validation fixed (accepts text or icon)

### Audit 10: Trivia & Bug Fixes

- Trivia seen-question reset fires at 0 remaining (not < 10)
- General Knowledge pulls from ALL categories (grab bag design)
- Vibration paths verified across background, foreground, cold start
- `disableAlarm` now cancels all scheduled notifications
- `soundID` persisted for picker checkmark state
- Stale reminder count in subtitle fixed

### Audit 9: Custom Sound System

- Notification-level sound override via dynamic channels
- Sound leak prevention in SoundPickerModal
- Timer resume state with custom sound channels
- expo-av AudioFocusNotAcquiredException fix (expo-av later removed entirely — replaced by Notifee-based sound preview)
