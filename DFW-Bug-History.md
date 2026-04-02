# DFW Bug History
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** April 1, 2026*

---

## 1. Summary Statistics

- **~105+ unique bugs** found and fixed across the project lifetime
- **Found by Zerenn:** ~30 (manual testing, device observation)
- **Found by auditors (Codex/Gemini):** ~60
- **Found by Opus/TypeScript:** ~10

---

## 2. Critical Architecture Bugs (Most Important to Understand)

**Notification channel audio doesn't work (Feb 26):** Notifee strips audioAttributes. 3 native plugin builds failed. Solution: MediaPlayer with USAGE_ALARM. All channels SILENT. This is why the app has a custom native module.

**Recurring alarms stop re-firing after first dismiss (Mar 19):** `cancelNotification()` kills both display AND trigger. Fix: recurring alarms use `cancelDisplayedNotification()` (display only).

**Fire screen re-triggers on next app open (Mar 19):** `getInitialNotification()` persists across process restarts. Module-level dedupe Map doesn't survive process death. Fix: persistent AsyncStorage dedupe.

**Snooze deletes one-time alarms (Feb 26):** Snooze cancel triggers DISMISSED → soft-deletes alarm. Fix: `snoozing_{alarmId}` AsyncStorage flag set BEFORE cancel, consumed by DISMISSED handler.

**TimePicker infinite re-render loop (Mar 11):** onScroll called parent onChange → setState → prop change → scrollToOffset → onScroll → loop. Fix: parent callbacks only in onMomentumScrollEnd.

**Widget renders transparent (Feb 12):** registerWidgetTaskHandler inside App.tsx instead of module-level entry point. Fix: created index.ts.

**Alarms silent on silent/vibrate mode (Feb 26):** Entire MediaPlayer architecture change (see Architecture doc section 1).

---

## 3. Bug Categories (Grouped)

**Notification/Alarm Lifecycle (~20 bugs):** notificationId not stored, cancel uses wrong ID, one-time alarm ghost after dismiss, yearly reminders don't reschedule, weekly early completion duplicates, snooze doesn't bypass lock screen, snooze leaks alarm.note, snooze double-tap, snooze ID pruning removes recurring triggers, dismiss cancels ALL notifications, no sound when screen on, swipe doesn't stop sound, foreground DELIVERED blocks yearly reschedule, double-play race, invalid custom URI silent failure, AlarmFireScreen appears twice, fire screen re-trigger on reopen

**Widget (~8 bugs):** transparent render, Linking.openURL syntax, deep link fails headless, no notification after widget timer start, presets don't refresh, countdown notification wrong channel, stale preset pins, ghost user timer pin

**Theme/Display (~10 bugs):** widget theme uses nonexistent names, updateWidget missing theme prop, ThemeContext no widget refresh, widget refresh before AsyncStorage write, legacy custom theme string crash, widget theme loader missing migration, custom theme unreadable with extreme colors, hardcoded colors surviving refactor, NotepadWidget header not centered

**Input/Validation (~10 bugs):** time input allows 88:77, minute accepts invalid first digits, AM/PM untappable in typing mode, AM/PM auto-flip misses fast scroll, TimePicker stale state on reopen, time defaults to static value, smart date shows "Today" for past times, one-time day chip doesn't schedule

**Privacy (~5 bugs):** private alarm content leaks in Deleted view, private icons leak to widgets, snooze privacy leak (alarm.private not checked), Guess Why note not revealed after game, private alarm regression after GW fix

**Emoji (~4 bugs):** empty string renders blank icons, ZWJ truncation via chars[0], grapheme segmentation broken (spread operator), setSelectedIcon null vs string

**Data/Storage (~8 bugs):** loose AsyncStorage validation (progressively tightened across 3 audits), welcome note race condition, custom color key rename without migration, edit race condition (save before load), settings validation missing, timer drift in background

**Game (~6 bugs):** Guess Why icon substring matching (fixed 3 times), short notes unwinnable, memory rank float gaps, Sudoku shows wrong answers in red, trivia crash (Kids+Hard=0 questions), Sudoku stats display wrong

---

## 4. Individual Bug Reports

### TimePicker columns clip on narrow screens (S25 FE)
- Found: Mar 21 by Zerenn's son on Samsung Galaxy S25 FE (1080x2340, 19.5:9)
- Cause: Hardcoded colWidth (80/90px) and itemHeight (56px) didn't scale for lower pixel density screens
- Fix: Full TimePicker.tsx rewrite — responsive colWidth from useWindowDimensions, font scaling via fontScale = colWidth/90, itemHeight increased to 96px for all devices
- Version: v1.3.7

### Day chip doesn't clear calendar date in one-time mode
- Found: Mar 21 by Zerenn during testing
- Cause: useDaySelection.ts handleToggleDay only called clearDate in recurring mode, not one-time mode
- Fix: Added clearDate?.() call in one-time branch of handleToggleDay
- Version: v1.3.7

### Reminder one-time day chip silently misschedules
- Found: Mar 21 by Audit 30 (Codex)
- Cause: CreateReminderScreen save logic only read selectedDate, ignored selectedDays. When clearDate fired from day chip tap, selectedDate became null and reminder fell back to today/tomorrow instead of the selected day
- Fix: Added same three-tier scheduling logic from CreateAlarmScreen to CreateReminderScreen: (1) selectedDate, (2) selectedDays one-day-of-week calculation, (3) today/tomorrow fallback
- Version: v1.3.7

### v1.3.8 Bug Fixes (found via emulator testing matrix)

**Bug: NotepadScreen emoji crash (CRITICAL)**
- Found: Mar 22 via emulator testing
- Cause: `Intl.Segmenter` does not exist in Hermes. The emoji icon picker's `onChangeText` handler crashed with "Cannot read property 'prototype' of undefined" on every phone when selecting an emoji.
- Fix: Replaced `Intl.Segmenter` with spread syntax `[...t]`
- Known limitation: compound ZWJ emoji (flags, families) may save only the last code point — accepted as edge case for note icon picker
- Version: v1.3.8

**Bug: TriviaScreen category grid off-center (all devices)**
- Found: Mar 22 via emulator testing
- Cause: `categoryGrid` style had no `justifyContent`, defaulting to flex-start
- Fix: Added `justifyContent: 'center'`
- Version: v1.3.8

**Bug: TimerScreen intermittent preset layout**
- Found: Mar 22 via emulator testing
- Cause: `SCREEN_WIDTH` and `PRESET_CARD_WIDTH` calculated at module load time via static `Dimensions.get('window').width`. Same class of bug as the v1.3.7 TimePicker fix.
- Fix: Replaced with `useWindowDimensions()` hook inside the component
- Version: v1.3.8

**Bug: CreateReminderScreen dead sound picker removed**
- Found: Mar 22 during audit/testing
- Cause: Sound mode picker (silent/vibrate/sound) did nothing — reminders always use default notification sound
- Fix: Removed `soundMode` state, UI, styles, and unused imports. Save logic changed to `soundId: undefined` for new reminders, preserved existing `soundId` on edit (audit fix — prevents overwriting legacy silent/vibrate reminders)
- Version: v1.3.8

**Bug: Note card full background color**
- Found: Mar 22 via emulator testing
- Cause: Cards used theme card color with 4px stripe — didn't match NotepadWidget behavior (which already used note color as card background)
- Fix: Cards now use the note's chosen color as full background. Removed `cardStripe`. Auto-picks white or dark font via `getTextColor()` when user hasn't set a font color. Timestamp color adjusts for readability.
- Version: v1.3.8

**Bug: Capsule buttons (all screens)**
- Found: Mar 22 via emulator testing
- Cause: Delete and Pin buttons disappeared on colored backgrounds or matching themes
- Fix: All Delete and Pin buttons wrapped in dark gray capsule (`rgba(30,30,40,0.7)`) with subtle white border. Applied uniformly to NotepadScreen, AlarmCard, and ReminderScreen. Restore and Forever buttons on deleted notes also updated.
- Version: v1.3.8

**Bug: Reminder Done UX cleanup**
- Found: Mar 22 via emulator testing
- Cause: Redundant `renderDoneButton` and "Done" text button alongside circle checkbox
- Fix: Removed redundant done button. Circle checkbox on left is now the only done toggle. Checkbox turns green (#22C55E) when completed. White checkmark on green. Completed one-time reminders stay visible but faded (opacity 0.45) on active list until 12am the next day. Recurring reminders show green checkbox when completed today.
- Version: v1.3.8

### v1.3.9 Bug Fixes (found via emulator testing and P2 polish)

**Bug: AlarmFireScreen dismiss flash**
- Found: Mar 22 (deferred), fixed Mar 24
- Cause: `exitToLockScreen()` did `navigation.reset({ index: 0, routes: [{ name: 'AlarmList' }] })` then `setTimeout(() => BackHandler.exitApp(), 100)` — AlarmList rendered and flashed on screen for ~100ms before exit. Disrupted users in other apps (e.g., disconnected from online games).
- Fix: `exitToLockScreen()` now calls `BackHandler.exitApp()` immediately with no navigation reset and no setTimeout. Safety net in App.tsx handles stale fire screen on next app open.
- Version: v1.3.9

**Bug: Note card borders invisible on dark themes**
- Found: Mar 24 during store screenshot creation
- Cause: Note cards used `borderColor: item.color + '80'` (semi-transparent version of note's own color). Black/dark notes on dark themes had invisible borders, cards blended into background.
- Fix: Contrast-based border using `getTextColor()` — dark notes get light border (`rgba(255, 255, 255, 0.25)`), light notes get dark border (`rgba(0, 0, 0, 0.2)`). Applied to both active and deleted card renders.
- Version: v1.3.9

**Bug: Reminder cards don't show nickname**
- Found: Mar 24 during store screenshot creation
- Cause: Reminder cards only showed `${item.icon} ${item.text}` on one line. Nickname field was ignored in card display.
- Fix: Two-line layout — if nickname exists, shows `icon nickname` as primary line and `text` as secondary line underneath (13px, textTertiary color). Falls back to single line when no nickname. Applied to both active and deleted renders. New style: `reminderSecondaryText`.
- Version: v1.3.9

**Bug: Safety net kills live alarm screens (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: Initial safety net only checked `getPendingAlarm()` which is a transient buffer consumed after first navigation. Any AppState 'active' trigger (notification shade, app switch) during a live alarm would see no pending data and reset to AlarmList, killing the alarm.
- Fix: Now also checks `notifee.getDisplayedNotifications()` for active alarm/timer notifications before resetting. Only resets if BOTH no pending data AND no displayed notifications.
- Version: v1.3.9

**Bug: Timer notification action dismiss doesn't cancel countdown (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: ACTION_PRESS dismiss handler only cancelled the timer-done notification, leaving the countdown chronometer notification in the shade.
- Fix: Added `cancelTimerCountdownNotification(timerId)` call in both background and foreground ACTION_PRESS handlers.
- Version: v1.3.9

**Bug: Notification snooze doesn't enforce flag write (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: Snooze action handlers used `.catch(() => {})` for the snoozing flag AsyncStorage write and continued regardless. If write failed, DISMISSED handler would soft-delete one-time alarms during snooze.
- Fix: Changed to try/catch with early return on failure, matching AlarmFireScreen pattern.
- Version: v1.3.9

**Bug: Notification snooze doesn't persist snooze notification ID (Audit 32 finding)**
- Found: Mar 24 by Codex Audit 32
- Cause: ACTION_PRESS snooze handlers didn't save the returned snooze notification ID back to alarm.notificationIds. Later delete/disable flows wouldn't cancel the snoozed notification.
- Fix: Added `updateSingleAlarm()` call to persist snooze notification ID, matching AlarmFireScreen pattern.
- Version: v1.3.9

### v1.5.0 Bug Fixes (found via Audits 34-35)

**Bug: Note sort uses UTC time instead of local**
- Found: Mar 25 by Codex Audit 34
- Cause: getItemSortTime in CalendarScreen used `createdAt.slice(11, 16)` which extracts UTC time. Alarms/reminders use local time strings, causing notes to sort out of order in non-UTC timezones.
- Fix: Parse Date object, extract local hours/minutes via getHours()/getMinutes().

**Bug: Widget alarm loader bypasses canonical migration**
- Found: Mar 25 by Gemini Audit 34
- Cause: loadWidgetAlarms() in widgetTaskHandler did raw JSON parse without normalizing missing mode, missing days array, or legacy numeric weekday values. Could crash or show wrong dots.
- Fix: Added inline normalization matching loadAlarms() logic — defaults mode to 'recurring', days to [], maps numeric weekday arrays to string format.

**Bug: CalendarWidget minHeight too small for 6-row months**
- Found: Mar 25 by Gemini Audit 34
- Cause: 220dp minimum left ~25dp per row after chrome. Day cells need ~30dp+ for number + dot row.
- Fix: Bumped to 280dp in app.json.

**Bug: Widget deep-links don't update already-mounted CalendarScreen**
- Found: Mar 25 by Gemini Audit 34
- Cause: useState initializers only run on first mount. If CalendarScreen was already in the nav stack, route.params.initialDate changes were ignored.
- Fix: Added useEffect watching route.params?.initialDate to update selectedDate and currentMonth on re-navigation.

**Bug: Floating BackButton overlaps scrolling content on CalendarScreen**
- Found: Mar 25 by Codex Audit 34
- Cause: Floating back button container had no background, scrolling content showed through.
- Fix: Added semi-transparent dark background pill (rgba(18, 18, 32, 0.85), borderRadius 20).

**Bug: Sudoku paused/won screens not width-capped on tablet**
- Found: Mar 25 by Codex Audit 35
- Cause: centeredContent and winContent styles had no maxWidth. Action buttons stretched full tablet width.
- Fix: Added maxWidth: 500, alignSelf: 'center', width: '100%' to both.

---

## 5. Bug Fixes (P2 Session)

**Timer/alarm dismiss clearing pending data:**
- `clearPendingAlarm()` added to ACTION_PRESS dismiss and snooze handlers in both `index.ts` and `useNotificationRouting.ts`
- DISMISSED handler now cleans up timers (previously only alarms)
- `consumePendingAlarm` checks `wasNotifHandled` before navigating

**One-time alarm toggle with past date:**
- `toggleAlarm` in storage.ts auto-updates date to today/tomorrow when re-enabling a one-time alarm whose date has passed
- Uses constructor-based date parsing (`new Date(y, mo - 1, d, h, m, 0, 0)`) to avoid engine-dependent string parsing
- Handles: restored-from-trash alarms, old alarms toggled back on, any lapsed one-time alarm

**Day picker mutual exclusivity:**
- Switching from recurring to one-time clears selected days
- Selecting a day updates the date field to next occurrence via `getNearestDayDate`

---

## 6. Complete Audit History

| # | Date | Scope | Key Findings |
|---|------|-------|-------------|
| — | Feb 9 | First ever | notificationId not stored (C), UUID crash (C), JSON.parse unguarded (M) |
| — | Feb 9-10 | Post-13-features | Icon-only unwinnable (I), type mode false positive (I), notification note leak (I) |
| 1 | Feb 10 | Pre-theming | updateAlarm when disabled (C), wrong cancel ID (I), timer mount-only (I), GuessWhy substring (I) |
| 2 | Feb 11 | Post-theming | rank float gaps (I), custom theme extremes (I), edit permission block (I), hardcoded colors (m) |
| 3 | Feb 12 | Post-Notifee | dismiss cancels ALL (I), settings validation (m), timer creation unhandled (I) |
| 4 | Pre-Feb 12 | Post-widgets | Channel race, paused timer leak, countdown orphans, legacy icons |
| 5 | Feb 14 | Day/date + widgets | Stuck notifications (C), ghost alarms (C), date off-by-one (I), past timestamps (I) |
| 7 | Feb 15 | Full repo | Samsung DND (I), trivia seen scope (I), reminder sort (I), widget label (I), Sudoku hint (I) |
| 8 | Feb 15 | Full repo | Battery API (I), swipe bypass (I), undo timer (I), General Knowledge reset (I) |
| 14 | Feb 16 | Full codebase | Trivia crash (C), snooze privacy leak (C), trash inaccessible (I), AlarmFire double-fire (I) |
| 15 | Feb 17 | Post-fix | Guess Why note reveal (I), empty state (m), Sudoku contrast (m) |
| 16 | Feb 17 | expo-av removal | Clean. Dead function + async race found and fixed. |
| 17 | Feb 18-19 | Time input, recurring reminders | Yearly dueDate null (C), yearly no reschedule (C), timeFormat race (m). **Gemini violated READ-ONLY.** |
| 18 | Feb 19 | Full codebase | Yearly reschedule failure (C), weekly skip logic (C), checkbox bypass (I) |
| 19 | Feb 20 | Verification of 18 | Weekly duplicate trigger — Audit 18 fix was wrong (C), incomplete alarm ghost (I) |
| 20 | Feb 26 | Alarm sound system | Snooze race/flag mechanism (H), trim crash (H), double-play (M), URI fallback (M) |
| — | Feb 26 | Channel investigation | Both auditors contributed to MediaPlayer decision |
| 23 | Mar 10 | TypeScript check | 1 error: null not assignable to string |
| 24 | Mar 11 | Full dual (Update 2) | Legacy theme crash (C), widget refresh race (H), ghost pin (H), stale soundId (H) |
| 25 | Mar 11 | UI polish | Private leak in deleted view (H), private icon leak to widgets (M), stale pins (H) |
| 26 | Mar 12 | Pre-build (Update 3) | Grapheme segmentation, dead compact widget code, orphaned noteIcons.ts |
| 27 | Mar 12 | Final pre-production | Global guessWhyEnabled rendering (C), eligibility mismatch (W), reminder dead code (W) |
| 28 | Mar 19 | Phase 1 housekeeping | **0 findings.** All clean. |
| 29 | Mar 19 | Bug fixes v1.3.5 | Duplicate notification IDs in dedupe (valid warning, fixed) |
| 30 | Mar 21 | TimePicker rewrite + useDaySelection fix | Codex: 1 HIGH (reminder day chip regression — CreateReminderScreen save logic ignores selectedDays), 1 MEDIUM (fontScale not in render deps — portrait-locked so safe), 2 LOW (stale props on remount, label missing textAlignVertical). Gemini: PASS. |
| 30b | Mar 21 | CreateReminderScreen three-tier fix | Codex: MEDIUM (Save Anyway still allows past dates — pre-existing, not regression). Gemini: PASS. |
| 31 | Mar 22 | v1.3.8 full (emulator testing fixes) | Codex: soundId regression on edit (fixed), midnight stale state (accepted — reload on focus), emoji ZWJ limitation (accepted), dead code getAvailableAtTime/getAvailableAtDate (removed). Gemini: deleted note text unreadable (fixed), Clear button dark-on-dark (fixed), checkmark color (fixed), Restore/Forever buttons missing capsules (fixed), emoji ZWJ (accepted). |
| 32 | Mar 24 | P2 polish (3 fixes) | Codex: 2 HIGH (safety net too aggressive — kills live alarms, early return blocks displayed-notification fallback), 1 LOW (completed reminders hide secondary text — design choice). Gemini: All PASS. |
| 32b | Mar 24 | Notification actions + safety net fix | Codex: 3 HIGH (timer countdown not cancelled on dismiss, snooze flag not enforced, snooze notif ID not persisted), 1 MEDIUM (safety net async race — accepted), 2 LOW (redundant cleanup, unused imports). Gemini: All PASS with 1 LOW redundant stopAlarmSound. All HIGH findings fixed. |
| 34 | Mar 25 | CalendarWidget + calendar fixes | Codex: 1 HIGH (note sort UTC slice), 1 MEDIUM (floating back button overlap), 1 LOW (root widget missing clickAction). Gemini: 2 HIGH (widget deep-link doesn't drive month — useState stale, widget alarm loader no normalization), 1 MEDIUM (widget minHeight too small for 6-row months). All fixed. Re-audit: Codex all PASS. Gemini: 4 PASS, 1 partial (widget alarm normalization functionally equivalent but not identical to loadAlarms — accepted, daily behavior same). |
| 35 | Mar 25 | Tablet responsive (Onboarding + Sudoku) | Codex: 1 MEDIUM (Sudoku paused/won not width-capped). Fixed. Gemini: All PASS. |
| 36 | Mar 26 | Note image attachments (P2 2.1) | Self-audit during implementation. 1 HIGH (transaction order), 2 MEDIUM (duplicate keys, image-only notes blocked), 2 MEDIUM (print broken images), 1 LOW (thumbnail memory). All resolved. Emoji picker removed. |
| 37 | Mar 26 | Drawing canvas (P2 2.2) | 3 HIGH (drawing persistence — saveNoteImage .png extension + companion .json copy, performance — memoize parsedStrokes, loadDrawingData reads JPGs as text), 2 MEDIUM (image cache after edit — new filename cache bust, print/share MIME detection), 2 LOW (empty canvas save block, cancel confirmation). All resolved. |
| 44 | Mar 30 | Voice memo feature (full) | Codex: 3 HIGH (VoiceRecordScreen rapid-tap race, recorder.stop not awaited, NotepadScreen listener leak), 2 MEDIUM (audio listener stale ref, AsyncStorage race). Gemini: 3 HIGH (rapid-tap race + save exit paths active during save + voiceMemoStorage swallows errors), 3 MEDIUM (detail screen no focus cleanup, seek validation, widget sort order). 8 findings fixed. voiceMemoFileStorage.ts false positive from Codex (File.copy is sync in new expo-file-system API). |
| 45 | Mar 30 | Voice memo UI polish + integration | Codex: 4 HIGH (hardware back bypasses cleanup on both screens, non-transactional save, widget pin order destroyed), 3 MEDIUM (Save & Exit pops on failure, pause/resume race, undo doesn't restore pin). Gemini: 3 HIGH (same pin ordering, pause race, pin sort in All view), 2 MEDIUM (VoiceMemoCell hardcoded colors, stale playback progress). 10 findings fixed. |
| 47 | Apr 1 | v1.9.0 Home screen (full) | Codex: 0 P0, 2 P1 (pre-existing timer/note behaviors), 3 P2. Gemini: 0 P0, 2 P1 (widget warm-start nav, notification routing missing Home base), 3 P2 (dead appQuote code, quote count, duplicate reminder reads). Both Gemini P1s fixed before build. |

### Audit 33 — March 25, 2026 (Codex + Gemini)
**Scope:** Foreground notification refactor, calendar feature, AlarmsTab extraction, NoteEditorModal extraction, UI polish (dark capsules, floating headers, BackButton)

**Findings:**
- HIGH: Daily recurring alarms/reminders (empty days array) missing from Calendar — recurring items with no days = daily, needed mapping to every day of month. Fixed.
- HIGH: Calendar create buttons navigated with initialDate but CreateAlarmScreen/CreateReminderScreen never consumed it. Fixed — CreateAlarm reads initialDate, sets one-time mode + date; CreateReminder reads initialDate, sets dueDate.
- HIGH: Floating header overlap on Settings (vertically stacked header exceeded 58px padding) and DailyRiddle (multi-line header with stats). Fixed — Settings made single-row, DailyRiddle stats moved into scrollable content.
- MEDIUM: Notes timezone bucketing used UTC slice (createdAt.slice(0,10)) instead of local date. Fixed — parses Date object, extracts local YYYY-MM-DD.
- LOW: New note unsaved changes detection only checked text, missed icon/color/font-only edits. Fixed — checks all fields against defaults.

**Passed:** Foreground notification refactor (both auditors), consumePendingAlarm cleanup, timer dismissal state management, refactor integrity (AlarmsTab + NoteEditorModal), calendar date mapping (after fix).

**Bug: Silent/true-silent alarm and timer channels use LOW importance — fullScreenAction never fires**
- Found: Mar 29 by Zerenn during testing
- Cause: alarms_silent_v4, alarms_true_silent_v1, and timer_silent_v1 channels created with AndroidImportance.LOW. Android requires HIGH importance for fullScreenAction to trigger screen wake and fire screen display. Also affected "Silence All" toggle which routes to true_silent channels.
- Fix: Version-bumped all three channels (alarms_silent_v5, alarms_true_silent_v2, timer_silent_v2) with AndroidImportance.HIGH. Old channels deleted on startup.
- Version: v1.7.0

**Bug: Snooze shame overlay not tappable — can't skip voice clip**
- Found: Mar 29 by Zerenn during testing
- Cause: Shame overlay renders as a separate return path that replaces the snooze button. User has no way to tap to skip the voice clip while the overlay is showing.
- Fix: Wrapped shame overlay in TouchableOpacity with stopVoice + exitToLockScreen. Added "Tap anywhere to skip" hint text.
- Version: v1.7.0

### Bug: Calendar annual/date-specific recurring reminders show on every day
- **Found:** Mar 30, 2026 by Zerenn
- **Cause:** `getItemsForDate` and `markedDates` in CalendarScreen treated `recurring: true` + empty `days` array as "daily recurring" without checking `dueDate`. Annual reminders saved with `recurring: true, days: [], dueDate: set` — calendar showed them on every day
- **Fix:** When recurring + empty days + dueDate exists, match only month/day of dueDate (annual pattern). Only fall through to "every day" push when no dueDate. Fixed in both `getItemsForDate` and `markedDates` useMemo
- **Version:** pre-v1.8.0 (dev)

### Bug: Calendar event cards not tappable
- **Found:** Mar 30, 2026 by Zerenn
- **Cause:** All three card types in `renderEventCard` used plain `<View>` wrappers with no `onPress` handler
- **Fix:** Wrapped each card type in `<TouchableOpacity>` with `activeOpacity={0.7}` and `hapticLight()`. Alarm → `CreateAlarm`, Reminder → `CreateReminder`, Note → `Notepad`. Added `navigation` to `renderEventCard` dependency array
- **Version:** pre-v1.8.0 (dev)

### Bug: AlarmFireScreen merge conflict markers committed to repo
- **Found:** Mar 30, 2026 by Zerenn
- **Cause:** Merge conflict markers (`<<<<<<< / ======= / >>>>>>>`) accidentally committed during laptop-to-desktop sync. `git status` showed clean because markers were part of the committed content
- **Fix:** Resolved conflict blocks manually, keeping correct code
- **Version:** pre-v1.8.0 (dev)

### Build 46 (v1.8.1) — SDK 55 Upgrade Build Failures
- **Build 1 failure:** `react-native-notification-sounds` used `jcenter()` repository, removed in Gradle 9.0 (SDK 55). Patched with patch-package (replaced `jcenter()` with `mavenCentral()`).
- **Build 2 failure:** Same library used deprecated `destinationDir` property in its build.gradle (removed in Gradle 9.0). patch-package could not fix this — property used deep in Android build pipeline.
- **Decision:** Remove `react-native-notification-sounds` entirely. Added native `getSystemAlarmSounds` method to existing `AlarmChannelModule` using `RingtoneManager.TYPE_ALARM`. Same response format (`{title, url, soundID}`), so `SoundPickerModal.tsx` needed only a call site change.
- **Build 3:** Succeeded.

### Pre-existing bugs found during v1.8.1 testing
- **Guess Why shows answer immediately:** Game screen shows the answer without presenting a guess screen first. Pre-existing, needs investigation.
- **Yearly recurring reminder reschedules without firing:** Reminder reschedules for next year without the current-year notification firing first. Pre-existing, needs investigation.

### Bug: Widget warm-start navigation not consumed on app resume (Audit 47)
- **Found:** April 1, 2026 by Gemini Audit 47
- **Cause:** `pendingTabAction` written to AsyncStorage by widget click actions but not consumed on app resume (warm start). Only consumed on cold start.
- **Fix:** Added consumption in `useNotificationRouting` for warm-start path.
- **Version:** v1.9.0

### Bug: Notification routing rebuilds stack without Home base route (Audit 47)
- **Found:** April 1, 2026 by Gemini Audit 47
- **Cause:** Two notification routing paths rebuilt the navigation stack without including Home as the base route (initial route changed from AlarmList to Home in v1.9.0).
- **Fix:** Updated both paths to include Home as base route in rebuilt stack.
- **Version:** v1.9.0

### Session 9 Bug Fixes (April 1, 2026)

**Bug: Guess Why shows answer immediately for nickname-only alarms**
- Found: Session 9 investigation of pre-existing bug
- Cause: `canPlayGuessWhy` included `hasNickname` as eligible — but nickname is always visible on the card, so showing it as a "guess" reveals the answer immediately
- Fix: Removed `hasNickname` from `canPlayGuessWhy`. Now requires icon OR note ≥ 3 chars (hidden clues only)

**Bug: Yearly recurring reminder rescheduled same date on early completion**
- Found: Session 9 investigation of pre-existing bug
- Cause: Reschedule logic used current date + 1 year when completed before due date. If completed early (e.g., day before), next occurrence would be the same date
- Fix: Always advance from stored dueDate year + 1, not current date

**Bug: Calendar widget showed reminder dots on every day for yearly reminders**
- Found: Session 9 (pre-existing)
- Cause: Widget calendar data treated `recurring: true` + empty `days` without checking `dueDate` — yearly reminders appeared on every day
- Fix: Added dueDate vs daily distinction in widget calendar dot logic

**Bug: No-date recurring reminders treated as daily instead of yearly**
- Found: Session 9
- Cause: Recurring reminders with no days + no dueDate were treated as "every day". Should be yearly from createdAt (creation anniversary pattern)
- Fix: Updated scheduling, calendar dots, Today section, widget, and completion logic to use createdAt month/day match

**Bug: ExpoKeepAwake promise rejection (SDK 55)**
- Found: Session 9 (pre-existing dev-mode warning)
- Cause: `useKeepAwake()` hook throws unhandled promise rejection during activity transitions in SDK 55's stricter error handling
- Fix: Replaced with imperative `activateKeepAwakeAsync()` wrapped in try-catch inside useEffect

**Bug: Light mode — dark overlays on personal photos**
- Found: Session 9 light mode testing
- Cause: Background photo overlay used `rgba(0,0,0,opacity)` regardless of theme mode — dark overlay on light mode made photos look muddy
- Fix: Mode-aware overlay — `rgba(255,255,255,opacity)` in light mode, `rgba(0,0,0,opacity)` in dark mode

**Bug: Light mode — dark capsule buttons on white cards**
- Found: Session 9 light mode testing
- Cause: Capsule buttons used `rgba(30,30,40,0.7)` background and `rgba(255,255,255,0.15)` border — invisible/ugly on light backgrounds
- Fix: Mode-aware rgba values — light mode uses `rgba(0,0,0,0.06)` background and `rgba(0,0,0,0.12)` border

**45 audits total.** Every ship preceded by at least one audit. v1.3.3 shipped without audit due to urgency (recurring alarm critical fix) — acknowledged as exception.
