# DFW Architecture
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 18 (April 5, 2026)

---

## 1. Notification System Architecture

### Why Notifee (not expo-notifications)
expo-notifications couldn't produce full-screen intents, DND bypass, sound looping, or alarm-style behavior. Replaced February 12 with @notifee/react-native.

### Why MediaPlayer (not notification channel audio)
Notifee v9.1.8 strips `audioAttributes` from JS `createChannel()`. Native config plugin approach also failed after 3 builds. Solution: all notification channels set to SILENT. Sound played separately through native `MediaPlayer` with `AudioAttributes.USAGE_ALARM` + `CONTENT_TYPE_MUSIC`.

### Sound Playback Flow
- `DELIVERED` event fires → `playAlarmSoundForNotification()` in both `index.ts` (background) and `App.tsx` (foreground)
- `AlarmFireScreen` mount plays as fallback only if not already playing
- Sound stopped on: dismiss, swipe (DISMISSED event), snooze, unmount, back button
- Sound resolution: check silent → custom URI → default timer sound → system default
- Invalid custom URI: catch block retries with null (system default fallback)

### Foreground DELIVERED Behavior (v1.4.0+)
- DELIVERED in foreground: plays alarm sound via playAlarmSoundForNotification() then returns. No navigation, no setPendingAlarm, no markNotifHandled.
- PRESS in foreground: full navigation to AlarmFireScreen (opt-in by user tapping notification body)
- ACTION_PRESS: unchanged — Dismiss/Snooze handlers with full cleanup
- consumePendingAlarm: no longer scans displayed notifications. Only reads module-level getPendingAlarm() for background/killed app scenarios.

### Key Distinctions
- `cancelNotification(id)` — kills display AND recurring trigger
- `cancelDisplayedNotification(id)` — kills display only, trigger survives (used for recurring alarms)
- `snoozing_{alarmId}` kv_store flag — prevents DISMISSED handler from deleting one-time alarms during snooze
- Persistent notification dedupe via kv_store for cold-start `getInitialNotification()` path (module-level Map doesn't survive process death)

### Notification Action Buttons
- Added in v1.3.9 to alarm and timer-done notification payloads
- Alarm actions: `[{ title: 'Snooze', pressAction: { id: 'snooze' } }, { title: 'Dismiss', pressAction: { id: 'dismiss' } }]`
- Timer actions: `[{ title: 'Dismiss', pressAction: { id: 'dismiss' } }]`
- Handled via `EventType.ACTION_PRESS` in both `index.ts` (background) and `App.tsx` (foreground)
- Snooze flag enforcement: uses try/catch with early return (not .catch(() => {})) — matches AlarmFireScreen pattern to protect one-time alarms
- Snooze notification ID persisted back to alarm.notificationIds via updateSingleAlarm — matches AlarmFireScreen pattern
- Timer dismiss also cancels countdown chronometer notification via cancelTimerCountdownNotification(timerId)

### Android Full-Screen Intent Behavior
- fullScreenAction only launches full-screen activity when screen is OFF or on lock screen
- When screen is ON (home screen or inside another app), Android downgrades to heads-up notification banner
- This is Android design (starting Android 10), not a bug
- Notification action buttons solve the UX problem — users dismiss/snooze from the banner

### Safety Net — Stale AlarmFire Screen
- Added in v1.3.9 to App.tsx AppState 'active' handler
- When app resumes on AlarmFire with no pending alarm data AND no displayed alarm/timer notifications, resets to Home
- Uses notifee.getDisplayedNotifications() with channel ID prefix matching (startsWith('alarm') || startsWith('timer') excluding 'timer-progress')
- Prevents stale fire screen after exitApp didn't kill the process
- Initial version was too aggressive (only checked getPendingAlarm) — fixed after Audit 32 found it would kill live alarm screens

### Notification Channel IDs (Current)
| Channel | ID |
|---------|----|
| Default alarm | `alarms_v5` |
| Gentle/Urgent/Classic/Digital | `alarms_*_v4` |
| Vibrate Only | `alarms_silent_v5` |
| True Silent | `alarms_true_silent_v2` |
| Timer progress | `timer-progress` |
| Timer Vibrate/Silent | `timer_vibrate_v1` / `timer_silent_v2` |
| Reminders / Vibrate / Silent | `reminders` / `reminders_vibrate_v1` / `reminders_silent_v1` |
| Custom alarm/timer | `alarm_v2_custom_{mediaId}` / `timer_v2_custom_{mediaId}` |

All prior channel versions deleted on every app startup.

---

## 2. Sound Architecture

- MediaPlayer with STREAM_ALARM over notification channel audio (stock Android pattern)
- CONTENT_TYPE_MUSIC over SONIFICATION (Samsung OEM may silence SONIFICATION)
- Append-only snooze ID storage (simpler than separate activeSnoozeId field)
- Timer notifications use alarm channel — "the timer is just as important" (Zerenn)

---

## 3. Theme System

### 6 Themes (Session 13: 3 dark + 3 light)
| Theme | Mode | Background | Card | Accent |
|-------|------|-----------|------|--------|
| Dark | dark | #0A0A12 | #1A1A28 | #5B9EE6 |
| Light (Ocean) | light | #EFF4FB | #FFFFFF | #2563EB |
| High Contrast | dark | #000000 | #1A1A1A | #00D4FF |
| Vivid | dark | #080D08 | #0E1A0E | #00FF88 |
| Sunset | light | #FFF8F0 | #FFFFFF | #E8690A |
| Ruby | light | #FDF2F4 | #FFFFFF | #E11D48 |

Session 13: Original light theme replaced with blue-tinted Ocean palette. Added Sunset (orange/amber) and Ruby (red/rose). 3 dark + 3 light covers blue, green, cyan, orange, red, black.

### Section Colors in Theme
ThemeColors interface includes per-section color tokens: `sectionAlarm`, `sectionReminder`, `sectionCalendar`, `sectionNotepad`, `sectionVoice`, `sectionTimer`, `sectionGames`. Each theme defines its own palette (e.g., Vivid uses completely different section colors than Dark). All hardcoded section hex values throughout the app replaced with `colors.section*` references.

### Evolution
Feb 11: 8 themes + custom. Mar 10-11: Consolidated to 6 presets. Apr 1 (Session 9): Consolidated to 4 — Dark, Light, High Contrast, Vivid. Custom theme generator removed. Apr 3 (Session 13): Expanded to 6 — replaced Light with Ocean, added Sunset and Ruby. 3 dark + 3 light covers top favorite colors.

### Mode-Aware Rendering
Light mode overhaul in Session 9: capsule buttons use mode-aware rgba values, watermark opacity adapts (0.15 dark / 0.06 light). Card backgrounds use section-colored tint in both modes — dark mode uses `sectionColor + '20'`, light mode uses `sectionColor + '15'` (Session 10). Photo overlay always uses dark dim (`rgba(0,0,0,opacity)`) regardless of mode — photos look best dimmed, not bleached. Photo-aware alpha values on HomeScreen: grid cells, quick capture buttons, today container, and banner all increase opacity when a background photo is set (e.g., grid `90` with photo, `40` without).

### Overlay Text Strategy (Session 13)
Two patterns for text on dark overlays:
- **Permanent overlays** (game sub-screens, GamesScreen, SettingsScreen): use `colors.overlayText` and hardcoded light rgba (`'rgba(255,255,255,0.7)'`, `'rgba(255,255,255,0.5)'`) directly in styles. BackButton/HomeButton use unconditional `forceDark`.
- **Conditional overlays** (8 user-photo screens): base styles use theme tokens (`colors.textPrimary` etc.), JSX overrides add `bgUri && { color: colors.overlayText }` for when photo overlay is active. BackButton/HomeButton use `forceDark={!!bgUri}`.

### View/Edit Mode Pattern (Session 13)
VoiceMemoDetailScreen and NoteEditorModal both use `isViewMode` state for existing items. View mode: read-only Text, centered "Edit" accent pill in header. Edit mode: TextInput fields, centered "Save" accent pill (only when `hasUnsavedChanges`). Header layout: headerLeft (Back + Home), headerCenter (Edit/Save pill), headerRight (Trash/Share). New items go straight to edit mode.

### Brand Title Token
`brandTitle` field in ThemeColors: per-theme title color for "Don't Forget Why" on HomeScreen. Dark: `#2563EB` (blue), Light: `#1E3A8A` (navy), High Contrast: `#00D4FF` (cyan), Vivid: `#00FF88` (green), Sunset: `#9A3412` (brown), Ruby: `#9F1239` (deep red).

### Migration
All old theme names migrate to current 6: midnight/ember/neon/void→dark, frost/sand→light, custom→dark. Legacy names from pre-6-theme era also mapped. Applied in both ThemeContext.tsx and widget theme loader.

---

## 4. Widget System

### Architecture
- `index.ts` at project root: `registerWidgetTaskHandler(widgetTaskHandler)` + `registerRootComponent(App)`. Required because Expo's AppEntry.js doesn't support headless JS task registration.
- Widgets run bundled JS from APK, NOT from metro dev server. Any JS widget change requires new EAS build.
- Headless JS context: no React Native bridge, no Activity, no Linking. CAN access SQLite (expo-sqlite), Notifee, JS modules.
- `flex: 1` must be at EVERY level of widget hierarchy. No `position: 'absolute'`.

### Timer Start from Widget
All app-opening approaches failed (Linking.openURL, OPEN_URI, deep links). Solution: headless timer start. `START_TIMER__{presetId}` clickAction → handler creates ActiveTimer, saves to SQLite `active_timers` table, schedules notifications. User sees countdown notification immediately. App loads running timer from SQLite when opened later.

### Widget Theming
`getWidgetTheme()` reads theme from SQLite `kv_store` with migration map, returns `WidgetTheme` object. `refreshWidgets()` (renamed from `refreshTimerWidget`) triggered after theme changes, data changes.

### Evolution
Feb 12: TimerWidget (compact) + DetailedWidget. Mar 6: NotepadWidget + NotepadWidgetCompact added. Mar 12: Trimmed to 2 — DetailedWidget redesigned, compacts deleted. Mar 25: CalendarWidget added — mini monthly calendar grid with colored dot indicators. Third widget alongside DetailedWidget and NotepadWidget. Uses getCalendarWidgetData() in widgetTaskHandler.ts for data loading. Click actions: OPEN_CALENDAR (opens CalendarScreen) and OPEN_CALENDAR_DAY__YYYY-MM-DD (opens CalendarScreen with date). pendingCalendarAction consumed in App.tsx on cold start and app resume. Widget alarm loader includes normalization for legacy alarm payloads (mode, days array, numeric weekday format) — does not import loadAlarms() to stay headless-safe, duplicates normalization inline. Apr 1: Widget rebranding — all widgets got personality headers: Memory's Timeline (DetailedWidget), Forget Me Notes (NotepadWidget), Misplaced Thoughts (CalendarWidget), Memory's Voice (MicWidget). All footers say "Don't Forget Why".

**NotepadWidget (Forget Me Notes) voice memo integration:** Widget shows voice memos alongside notes. Header "Forget Me Notes" layout: mic button (left, OPEN_VOICE_MEMOS), title center (OPEN_NOTES), notepad button (right, ADD_NOTE). Footer: "Don't Forget Why". Combined items sorted pinned-first (`isPinned` field on WidgetNote and WidgetVoiceMemo), then by `createdAt` descending, sliced to 4. `VoiceMemoCell` uses `theme.cellBg` and `theme.text` (not hardcoded colors). Click actions: `OPEN_VOICE_MEMO__{id}` opens VoiceMemoDetailScreen, `RECORD_VOICE` opens VoiceRecordScreen. Widget task handler stores `pendingVoiceAction` in SQLite `kv_store`, routed by `useNotificationRouting`.

**MicWidget (Memory's Voice):** Standalone 110dp home screen widget (MicWidget.tsx). Header "Memory's Voice" with `OPEN_VOICE_MEMOS` click action. Mic icon + "Record" text on themed background. Footer: "Don't Forget Why". Single click action: `RECORD_VOICE` opens VoiceRecordScreen. Registered in app.json alongside other widgets.

### CalendarWidget (Misplaced Thoughts)
- Header: "Misplaced Thoughts"
- Mini month grid: 7 columns × 5-6 rows, weekday header, month/year label
- Colored dots: red (#FF6B6B) alarms, blue (#4A90D9) reminders, green (#55EFC4) notes — up to 3 per day
- Today: accent background highlight
- Past days: textSecondary color (dimmed)
- Adjacent month padding days: textSecondary color with actual date click actions
- Root FlexWidget has clickAction="OPEN_CALENDAR" (dead space opens app)
- Footer: "Don't Forget Why" branding
- minWidth: 250dp, minHeight: 280dp (bumped from 220dp after Audit 34 finding — 6-row months need more height)
- Data: getCalendarWidgetData() loads alarms/reminders/notes, computes dot presence per day for entire current month
- Refresh: included in refreshWidgets() and refreshAllWidgets()

---

## 5. Voice Roast System

### Architecture
Voice clips play through the native AlarmChannelModule on Android's ALARM audio stream (USAGE_ALARM), bypassing media volume. This ensures clips are always audible when an alarm fires, regardless of ringer mode or media volume setting.

Two separate MediaPlayers in AlarmChannelHelper.java (embedded in plugins/withAlarmChannel.js):
- sPlayer: alarm/timer sounds (looping)
- sVoicePlayer: voice clips (non-looping, completion callback resolves JS promise)

Also exposes `getSystemAlarmSounds()` — lists system alarm sounds via `RingtoneManager.TYPE_ALARM`. Returns array of `{title, url, soundID}`. Replaced the third-party `react-native-notification-sounds` library (removed in v1.8.1 — unmaintained, incompatible with Gradle 9.0). Uses fully qualified class names inline (no added imports).

JS service (src/services/voicePlayback.ts) uses expo-asset (Asset.fromModule + downloadAsync) to resolve bundled require() assets to local file:// URIs, then passes URIs to the native module. No expo-av involved.

### Audio Sequencing (AlarmFireScreen)
1. Alarm sound plays for 1.5 seconds
2. stopVoice() kills any lingering clip from previous fire
3. Alarm sound stops (stopAlarmSound)
4. Intro clip plays if first alarm ever (one-time, stored in SQLite kv_store) — alarms only, not timers
5. Random fire/timer clip plays (await playRandomClip)
6. Alarm sound resumes (unless silent/true_silent alarm)
- True silent alarms skip voice entirely (guard before voicePlayedRef)
- Regular silent alarms play voice but don't resume alarm tone

### Double-Tap Skip (AlarmFireScreen)
- **Dismiss:** First tap starts dismiss flow (plays dismiss clip). isDismissingRef tracks state, button text changes to "Tap to skip". Second tap calls stopVoice() + exitToLockScreen() immediately.
- **Snooze:** First tap starts snooze flow (schedules snooze, shows shame message, plays snooze clip, exits when clip finishes). isSnoozing state tracks, button stays tappable, text changes to "Tap to skip". Second tap calls stopVoice() + exitToLockScreen() immediately.
- Snooze shame overlay animates in while clip plays, exits when clip finishes (await playRandomClip → exitToLockScreen). No more 5-second setTimeout.

### Voice Categories (src/data/voiceClips.ts)
- fire (16 clips): alarm fire lines
- snooze1-4 (4/6/4/6 clips): tier-matched snooze shame
- timer (11 clips): timer completion lines
- guess_before (4 clips): before Guess Why question
- guess_correct (3 clips): correct answer
- guess_wrong (3 clips): wrong answer/skip
- dismiss (10 clips): plays full clip before app exit
- intro (1 clip): one-time first alarm greeting
Total: 63 bundled MP3 files in assets/voice/

### Settings
- Voice Roasts toggle: kv_store key 'voiceRoastsEnabled', defaults to true (opt-out)
- Dismiss Voice toggle: kv_store key 'dismissVoiceEnabled', defaults to true, only shown when voice roasts is on
- Settings UI in SettingsScreen.tsx, read by voicePlayback.ts

### Native URI Handling (plugins/withAlarmChannel.js)
playVoiceClip handles multiple URI schemes for dev/production compatibility:
- http/https (Metro dev server)
- file:///android_asset/ (production bundled assets)
- file:// (cached assets)
- content:// (content provider URIs)
- Bare resource name fallback (tries AssetManager then Uri.parse)

### Safety
- playId counter prevents zombie playback after cancellation (incremented in stopVoice + play functions)
- sPendingVoiceCallback ensures JS promise always resolves (even on stop/error) — grab-and-null pattern prevents double-fire
- stopVoice() called in all exit paths (dismiss, snooze, guess why, unmount cleanup)
- stopVoice() increments _playId to invalidate in-flight downloads
- Voice errors never crash the alarm flow — all caught and logged
- markIntroPlayed() only called after successful playback (inner try/catch), not on error

### Voice Character
Male, early 30s, American accent. Tired, sarcastic, self-aware app personality. Has coworkers (Denise), a life, opinions about being stuck in a phone. Clean — no profanity. Generated via ElevenLabs v3.

### Dependencies (P3)

- `expo-av` removed (was only used for chirp sound feedback)
- `expo-audio` added (chirp/UI sound feedback via createAudioPlayer)
- `expo-asset` added (voice clip URI resolution: Asset.fromModule + downloadAsync → file:// URI)
- Voice clips use native AlarmChannelModule, NOT expo-audio (ALARM stream requirement)

### SDK 55 Dependency Updates (v1.8.1)

| Package | Before | After |
|---------|--------|-------|
| Expo SDK | 54 | 55 |
| React Native | 0.81.5 | 0.83.4 |
| React | 19.1.0 | 19.2.0 |
| react-native-reanimated | ~4.1.x | ~4.2.x |
| react-native-worklets | ^0.5.1 (manual pin) | 0.7.2 (Expo-managed) |
| @shopify/react-native-skia | 2.2.12 | 2.4.18 |
| react-native-screens | ~4.16.x | ~4.23.x |
| react-native-gesture-handler | ~2.28.x | ~2.30.x |
| react-native-pager-view | 6.9.1 | 8.0.0 |

- `react-native-notification-sounds` REMOVED — replaced by native `getSystemAlarmSounds` in AlarmChannelModule
- `newArchEnabled` flag removed from app.json — New Architecture is always on in SDK 55
- `edgeToEdgeEnabled` flag removed from app.json — edge-to-edge is default in SDK 55

### Package Cleanup (Session 10)
- `react-native-tab-view` REMOVED — tabs replaced by standalone screens (Session 9 separation)
- `react-native-pager-view` REMOVED — was only a dependency of tab-view
- `date-fns` REMOVED — unused after prior refactors

### GestureHandlerRootView (Session 10)
- `GestureHandlerRootView` wraps the entire app in `App.tsx` — required for SwipeableRow gesture handling via react-native-gesture-handler

### New/Modified Files in Phase 3

| File | Status | Purpose |
|------|--------|---------|
| `src/data/voiceClips.ts` | NEW | Voice clip registry (10 categories, 63 clips) |
| `src/services/voicePlayback.ts` | NEW | Voice playback service (native module bridge, playId cancellation) |
| `assets/voice/` | NEW | 63 bundled MP3 voice clip files |
| `plugins/withAlarmChannel.js` | MODIFIED | Added playVoiceClip, stopVoiceClip, sPendingVoiceCallback, production URI branches |
| `src/screens/AlarmFireScreen.tsx` | MODIFIED | Voice sequence useEffect, dismiss/snooze double-tap, true_silent guard |
| `src/screens/GuessWhyScreen.tsx` | MODIFIED | Voice clips on game events (before/correct/wrong) |
| `src/screens/SettingsScreen.tsx` | MODIFIED | Voice roasts toggle, dismiss voice toggle |
| `src/services/settings.ts` | MODIFIED | Removed ghost voiceRoasts field |
| `src/utils/soundFeedback.ts` | MODIFIED | expo-av → expo-audio migration |
| `package.json` | MODIFIED | expo-av removed, expo-audio + expo-asset added |

---

## 6. Voice Memo Audio System

### Recording (expo-audio, NOT native AlarmChannelModule)
- Voice memos record and play through the **MEDIA stream** via expo-audio — they are user-initiated playback, not alarm-stream audio
- Recording uses expo-audio's `useAudioRecorder` hook with `RecordingPresets.HIGH_QUALITY` — AAC codec, `.m4a` output
- `requestRecordingPermissionsAsync()` gates recording; `android.permission.RECORD_AUDIO` added to app.json
- Transition guard pattern (`transitionRef`) prevents rapid-tap race conditions on record/stop toggle — if `transitionRef.current` is true, `handleRecordPress` returns immediately. Both `startRecording` and `stopRecording` set it true at entry, false in `finally`
- Pause/resume: `isPausedRef` (useRef) for synchronous state — prevents rapid-tap race creating duplicate intervals. `recorder.pause()` / `recorder.record()` toggle. Existing interval always cleared before creating new one on resume
- `recorder.stop()` is `await`ed everywhere before reading status/URI/duration — non-awaited stop reads stale data
- AppState listener stops recording on app background, navigates to VoiceMemoDetailScreen with partial recording (same as normal stop)
- VoiceRecordScreen has NO post-recording UI — after `stopRecording` completes, immediately calls `navigation.replace('VoiceMemoDetail', { tempUri, duration })`. Screen only shows idle state and recording state
- `beforeRemove` navigation listener intercepts hardware back, gesture back, and custom back button. During recording: stops, discards temp file, dispatches original action. Uses `navigatedRef` to allow programmatic `replace` navigation through

### VoiceMemoDetailScreen — View/Edit Mode (Session 13 redesign)
- Accepts `{ tempUri: string; duration: number }` for new recordings OR `{ memoId: string }` for existing memos. Mode detected via `'tempUri' in params`
- `isViewMode` state: defaults true for existing memos, false for new recordings
- **View mode:** read-only Text for title/note, centered "Edit" accent pill in headerCenter. Tap Edit → enters edit mode
- **Edit mode:** TextInput fields with bgUri-aware placeholder colors, centered "Save" accent pill (only when `hasUnsavedChanges`). Save returns to view mode
- Header: headerLeft (Back + Home), headerCenter (Edit/Save pill), headerRight (Trash). No title text — redundant
- **New recordings:** always edit mode, Save/Discard buttons at bottom. Save: transactional — `saveVoiceMemoFile` copies temp to permanent, then `addVoiceMemo` writes metadata. If metadata fails, permanent copy deleted, temp file preserved for retry. `savingRef` blocks exit during save
- `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating away
- `beforeRemove` navigation listener: blocks during save (`savingRef`), new recordings get "Discard recording?" alert, existing with unsaved changes get "Unsaved changes" alert with Cancel/Discard/Save & Exit. `exitingRef` prevents re-triggering on intentional exits

### Playback
- **VoiceMemoDetailScreen:** seekable progress bar (44px touch target, 6px visual bar), back/forward 5s, `useFocusEffect` cleanup pauses on screen blur. `Number.isFinite` validation on all seek values with try/catch on `seekTo`. View-based play/pause icons (CSS border triangle for play, dual bars for pause). Play button color: #4CAF50 (Material Design green)
- **NotepadScreen (inline):** single player instance in `useRef` via `createAudioPlayer` (imperative, not hooks). `addListener('playbackStatusUpdate')` for finish detection. Listener ref (`playerListenerRef`) cleaned up before `player.release()` in `stopPlayback`. Focus cleanup via `useFocusEffect` stops playback when screen loses focus. Stale progress reset: when switching memos, previous memo's progress set to 0 before starting new playback
- **NoteEditorModal (note-attached):** `useAudioPlayer`/`useAudioPlayerStatus` hooks for per-note voice memo playback. Seekable via touch responders. Shared 3-attachment limit (images + voice memos)

### Key distinction from Voice Roasts
Voice roasts use the native `AlarmChannelModule` on ALARM stream because they play during alarm fires and must be audible regardless of ringer mode. Voice memos are user-initiated — MEDIA stream via expo-audio is correct.

---

## 7. Navigation & Screen Architecture

### Home as Entry Point (v1.9.0)
- Home is the `initialRouteName` (was AlarmList)
- Navigation flow: Home → sections (AlarmList, Reminders, Timers, Notepad, VoiceMemoList, Calendar, Games). `Chess` route added to `RootStackParamList` in Session 16 — reached via GamesScreen.
- AlarmListScreen is alarms-only (AlarmsTab.tsx deleted and absorbed in Session 9)
- ReminderScreen is standalone screen with own `Reminders` route, header, background, nav
- TimerScreen is standalone, owns all timer state/notification logic
- VoiceMemoListScreen is standalone, NotepadScreen is notes-only
- HomeButton component on all screens for direct Home navigation
- Widget deep links: `pendingAlarmListAction` and `pendingReminderListAction` (split from `pendingTabAction`)
- Deep links all route through Home as base

### Icon System (Session 9)
- `src/components/Icons.tsx`: 29+ View-based icons replacing emoji throughout app
- All icons: `{ color: string; size?: number }` props, default size 20, proportionally scaled inner shapes
- Includes: AlarmIcon, TimerIcon, BellIcon, DocIcon, MicIcon, CalendarIcon, GamepadIcon, PencilIcon, GearIcon, PinIcon, TrashIcon, FireIcon, ChevronRightIcon, CheckIcon, PlusIcon, CloseIcon, LightbulbIcon, BrainIcon, NumbersIcon, PuzzleIcon, TrophyIcon, WarningIcon, SearchIcon, SortIcon, HomeIcon, ImageIcon, CameraIcon, PaintBrushIcon, ShareIcon
- Theme-colorable, scalable, consistent stroke weight. Replaces device-dependent emoji rendering.

### ExpoKeepAwake (Session 9)
- `useKeepAwake()` hook replaced with imperative `activateKeepAwakeAsync()` in try-catch useEffect — fixes SDK 55 promise rejection during activity transitions

### Reminder Scheduling — Yearly from createdAt (Session 9)
- Recurring reminders with no days + no dueDate now treated as yearly from createdAt (not daily)
- Affects: scheduling, calendar dots, Today section, widget, completion logic

### New/Modified Files in v1.9.0

| File | Status | Purpose |
|------|--------|---------|
| `src/screens/HomeScreen.tsx` | NEW | Home screen — icon grid, Quick Capture, personality banner, Today section |
| `src/screens/VoiceMemoListScreen.tsx` | NEW | Standalone voice memo list (separated from NotepadScreen) |
| `src/components/HomeButton.tsx` | NEW | Home navigation button added to all screens |
| `src/components/Icons.tsx` | NEW | 29+ View-based icons replacing emoji app-wide |
| `src/data/homeBannerQuotes.ts` | NEW | 63 color-coded personality quotes across 7 sections |

### New/Modified Files in Session 10

| File | Status | Purpose |
|------|--------|---------|
| `src/components/SwipeableRow.tsx` | NEW | Swipe-to-delete component (both directions), used on all 4 list screens |
| `src/components/EmojiPickerModal.tsx` | NEW | Bottom sheet emoji picker modal (~128 curated emoji, flat grid) |
| `src/components/DrawingPickerModal.tsx` | NEW | Extracted drawing tool modals from DrawingCanvas |
| `src/data/emojiData.ts` | NEW | Curated emoji dataset for picker modal |
| `src/theme/buttonStyles.ts` | NEW | Shared button hierarchy: getButtonStyles() returns 4 types × 2 sizes |
| `App.tsx` | MODIFIED | GestureHandlerRootView wrapper added |
| `src/components/DrawingCanvas.tsx` | MODIFIED | Modals extracted, fully themed |
| `src/components/BackButton.tsx` | MODIFIED | forceDark prop added |
| `src/components/HomeButton.tsx` | MODIFIED | forceDark prop added |

---

## 8. Storage Layer (SQLite)

### Migration from AsyncStorage (Session 12)
All persistent storage migrated from `@react-native-async-storage/async-storage` to `expo-sqlite` (synchronous API). AsyncStorage kept temporarily in `database.ts` only — the one-time migration runner reads old AsyncStorage data and writes it to SQLite on first launch post-update.

### Database file
`dfw.db` — singleton via `getDb()` in `src/services/database.ts`. Schema initialized on every launch via `CREATE TABLE IF NOT EXISTS`.

### Tables (7 total)
| Table | Purpose |
|-------|---------|
| `alarms` | Alarm entities — `nativeSoundId` INTEGER column (renamed from `soundID` due to SQLite case-insensitive collision with `soundId` TEXT) |
| `reminders` | Reminder entities |
| `notes` | Note entities (soft-delete via `deletedAt`). Includes `voiceMemos TEXT` column (JSON array of file URIs) |
| `voice_memos` | Voice memo metadata |
| `active_timers` | Currently running timers |
| `user_timers` | User-created custom timer presets |
| `chess_game` | Session 16: single-row table (CHECK id=1) holding in-progress chess game — fen, playerColor, difficulty, moveHistory (JSON), takeBackUsed, blunderCount, startedAt, updatedAt |
| `checkers_game` | Session 18: single-row table (CHECK id=1) holding in-progress checkers game — board (JSON), turn, playerColor, difficulty, rules (DEFAULT 'american'), moveCount, startedAt, updatedAt |
| `kv_store` | Key-value pairs for settings, game stats, widget pins, pending actions, flags |

Note: `forget_log` table removed in Session 12 (ForgetLog feature deleted).

### KV store keys (partial list)
Settings: `appSettings`, `appTheme`, `onboardingComplete`, `hapticsEnabled`, `voiceRoastsEnabled`, `voiceIntroPlayed`, `silenceAllAlarms`, `defaultTimerSound`, `bg_main`, `bg_overlay_opacity`, `note_custom_bg_color`, `note_custom_font_color`
Game stats: `guessWhyStats`, `memoryMatchScores`, `sudokuBestScores`, `sudokuCurrentGame`, `dailyRiddleStats`, `triviaStats`, `triviaSeenQuestions`, `chessStats` (Session 16: `{gamesPlayed, wins, losses, draws, totalPoints}`), `checkersStats` (Session 18: `{gamesPlayed, wins, losses, totalPoints}`)
Widget pins: `widgetPinnedPresets`, `widgetPinnedAlarms`, `widgetPinnedReminders`, `widgetPinnedNotes`, `widgetPinnedVoiceMemos`
Pending actions: `pendingNoteAction`, `pendingAlarmAction`, `pendingReminderAction`, `pendingTimerAction`, `pendingCalendarAction`, `pendingVoiceAction`, `pendingAlarmListAction`, `pendingReminderListAction`
Ephemeral: `snoozing_{alarmId}`, `snoozeCount_{alarmId}`, `handledNotifIds`

### Key API
- `kvGet(key)` / `kvSet(key, value)` / `kvRemove(key)` — synchronous KV helpers
- `getDb()` — returns singleton `SQLiteDatabase`, initializes schema on first call
- `migrateFromAsyncStorage()` — async one-time migration, called in App.tsx before render. On failure, logs error but doesn't set `_migrated` flag — retries on next launch. App still renders (AsyncStorage code was in place during migration period)

### Schema bugs found during migration
- `execSync` multi-statement DDL only executes the first statement — split into individual `execSync` calls per table
- `soundId` (TEXT) and `soundID` (INTEGER) column collision — SQLite column names are case-insensitive. Renamed INTEGER column to `nativeSoundId`
- `voiceMemos` column missing from notes schema — caused data loss for note-attached voice memos. Added `voiceMemos TEXT` column
- `private` is a SQLite reserved word — must be quoted as `"private"` in DDL and DML

### Pattern change
Old: load entire JSON array → mutate in memory → serialize entire array back.
New: individual SQL `INSERT`/`UPDATE`/`DELETE` per entity. `SELECT` queries replace `JSON.parse` of full arrays. Notification scheduling logic unchanged — only the storage calls changed.

---

## 9. Testing Infrastructure

### Jest Setup (Session 11)
- **Preset:** `ts-jest` with `node` test environment (not `jest-expo` — jest-expo crashes parsing expo-modules-core TypeScript)
- **Test location:** `__tests__/` at project root
- **Run:** `npm test` or `npx jest`
- **Config:** in `package.json` `"jest"` section — `moduleNameMapper` maps `../utils/*`, `../types/*`, etc. to `<rootDir>/src/` paths
- **Scope:** Pure utility functions only (no React Native, no SQLite, no native modules)
- **jest-expo** stays in devDependencies for future component testing

### Test Suites (35 tests)
| Suite | File | Tests | Coverage |
|-------|------|-------|----------|
| `time.test.ts` | `src/utils/time.ts` | 7 | `formatTime` — 12h/24h format, edge cases (midnight, noon, 23:59) |
| `noteColors.test.ts` | `src/utils/noteColors.ts` | 8 | `getTextColor` — dark/light/medium backgrounds, invalid input |
| `soundModeUtils.test.ts` | `src/utils/soundModeUtils.ts` | 20 | All 5 pure functions: `cycleSoundMode`, `soundModeToSoundId`, `soundIdToSoundMode`, `getSoundModeIcon`, `getSoundModeLabel` |

### Branch
- `testing-setup` branch used for Jest work, merged into `dev`

---

## 10. Backup & Restore System

### backupRestore.ts
- Export Memories: close DB → copy dfw.db + 4 media folders to staging → generate backup-meta.json with content counts → zip to .dfw → share via system sheet
- Import Memories: validate manifest → cancel notifications → close DB → unzip to temp → move live data to rollback → move restored data to document → reopen DB → reschedule notifications → rollback on failure
- Auto-export: SAF folder picker → persist URI → check frequency on app open → create file in SAF dir via base64
- Transactional restore: rollback pattern with liveDataMoved flag, always reopens DB in finally

### Dependencies (P4)
- `react-native-zip-archive` — native zip/unzip for backup files
- `expo-document-picker` — file picker for .dfw import

---

## 11. Screen Decomposition Pattern (Session 15)

### Thin shell + hook + card components
Large list screens are split into three layers:
1. **Screen (thin render shell)** — layout only: background, header, filters, FlatList, FAB, toast/modal. Reads state from hook, delegates rendering to card components.
2. **Custom hook (`src/hooks/useX.ts`)** — all state, effects, callbacks, memos. No UI imports (no `useTheme`, no safe-area-context, no components).
3. **Card components** — reusable, `React.memo`-wrapped, own their styles, own their haptics. Get data + handlers via props.

### Decomposed screens

**NotepadScreen** (Session 15): 896 → 232 lines
- `src/hooks/useNotepad.ts` — all state + handlers + effects (editor visibility, undo toast, pin logic, custom bg/font color migration, welcome note creation, route params + widget pending-action routing, AppState foreground refresh)
- `src/components/NoteCard.tsx` — active note card (swipe-to-delete, clipboard long-press, pin toggle, relative time)
- `src/components/DeletedNoteCard.tsx` — deleted note card (restore + forever buttons)

**AlarmListScreen** (Session 15): 556 → 278 lines
- `src/hooks/useAlarmList.ts` — all state + handlers + sort/filter memoization (time/created/name sort, all/active/one-time/recurring/deleted filter, undo toast with pin restoration)
- `src/components/DeletedAlarmCard.tsx` — deleted alarm card
- Uses existing `AlarmCard.tsx` for active alarms

### Shared utilities
`src/utils/time.ts` added `getRelativeTime()` and `formatDeletedAgo()` — eliminated duplicate `formatDeletedAgo` that existed in both NotepadScreen and AlarmListScreen.

### Decomposition rules
- Hook must NOT import React Native UI modules, theme context, safe-area-context, or any `src/components/*`
- Hook exposes state setters only when the screen genuinely needs them (e.g., `setBgUri` exposed so screen's `<Image onError>` can null it)
- Cards own their own `useMemo(StyleSheet.create)` — not forwarded from parent
- Cards wrapped with `React.memo` for FlatList performance

---

## 12. FlatList OOM Prevention (Session 15)

All main list screens use these props to prevent out-of-memory kills on budget devices:

```tsx
removeClippedSubviews={true}
windowSize={5}
maxToRenderPerBatch={8}
initialNumToRender={8}
```

Applied to: NotepadScreen, AlarmListScreen, ReminderScreen, VoiceMemoListScreen, CalendarScreen.

- `removeClippedSubviews` — detaches off-screen views from native hierarchy
- `windowSize={5}` — 2 screens above + current + 2 below rendered (default is 21)
- `maxToRenderPerBatch={8}` — limits items rendered per JS frame
- `initialNumToRender={8}` — only 8 items on first mount

---

## 13. Chess Engine Architecture (Session 16)

### Files
| File | Purpose |
|------|---------|
| `src/services/chessAI.ts` | Pure search/eval engine: minimax + alpha-beta, iterative deepening, quiescence, move ordering, board evaluation, time budget, difficulty levels |
| `src/services/chessStorage.ts` | SQLite persistence — save/load/clear single in-progress game in `chess_game` table |
| `src/services/blunderRoast.ts` | Bridges `analyzeMove` result to roast text selection with recent-roast deduping |
| `src/data/chessRoasts.ts` | 5-tier roast pool (good/inaccuracy/mistake/blunder/catastrophe) + take-back pool, 58 total lines |
| `src/data/chessAssets.ts` | Piece → image mapping, 12 custom Staunton PNGs (assets/chess/{w,b}{P,N,B,R,Q,K}.png) |
| `src/data/openingBook.ts` | (Session 17) 104 hardcoded FEN→SAN book positions + `positionKey()` helper. Covers ~6-10 plies of mainline theory across Italian, Ruy Lopez, QG, London, English, Sicilian, French, Caro-Kann, KID, Slav. Generated by `scripts/gen-opening-book.js` and validated against chess.js |
| `src/hooks/useChess.ts` | All game state + AI scheduling + move handling + persistence + roast + take-back + resign |
| `src/screens/ChessScreen.tsx` | Thin render shell — pre-game modal, board grid, captures, action bar, game-over overlay |

### Search Pipeline
- **minimax** (recursive, alpha-beta): at depth > 0 iterates ordered legal moves, passes down tightened alpha/beta.
- **quiescence** (at depth 0): stand-pat + only search captures until position is quiet. Delta pruning skips captures whose best gain can't reach alpha. Prevents horizon-effect — AI no longer returns "up a knight" at the top of a trade it's about to lose.
- **findBestMove** (iterative deepening): searches depth 1, then 2, …, up to maxDepth. After each completed depth, moves the PV to front of `ordered` so next depth searches it first. Carries alpha/beta across root siblings (pruning info from earlier siblings tightens searches for later ones — biggest single perf win in the audit).
- **Time budget**: module-level `searchDeadline` set by findBestMove. minimax polls `isTimeUp()` at top of every call. When time runs out mid-depth, the partial depth is discarded and the previous completed depth's best move is returned. Guarantees the AI always responds within budget even if nominal depth would take longer.
- **Move ordering**: `orderMoves` sorts by MVV-LVA (captures of high-value pieces by low-value attackers first) + check bonus. Applied at root AND inside minimax.

### Evaluation Terms
1. Material (pawn 100, knight 320, bishop 330, rook 500, queen 900, king 20000)
2. Piece-square tables (standard Chess Programming Wiki values; middlegame + endgame king tables)
3. Bishop pair (±50cp)
4. Doubled pawns (−15cp per extra pawn on same file)
5. Isolated pawns (−10cp per pawn with no neighbor file)
6. King safety (middlegame only): pawn shield within 1 square of king, +15cp per shield pawn
7. Mobility: 3cp per legal move for side to move

### Difficulty Levels & Time Budgets
Single source of truth in `chessAI.ts`: `DIFFICULTY_LEVELS` + `TIME_LIMITS_MS` (exported). `useChess.ts` imports `TIME_LIMITS_MS` to publish the progress budget — no parallel constants.

| Index | Name | Max Depth | Time Budget | Randomness |
|-------|------|-----------|-------------|------------|
| 0 | Beginner | 2 | 300ms | 0.4 |
| 1 | Casual | 3 | 500ms | 0.2 |
| 2 | Intermediate | 4 | 1000ms | 0.05 |
| 3 | Advanced | 5 | 2000ms | 0 |
| 4 | Expert | 6 | 5000ms | 0 |

Randomness path: find best move with deep search, then score ALL moves with static eval and pick randomly from candidates within threshold. Static-only comparison prevents mixing deep-search scores with static-eval scores (audit finding — deep vs static mixup surfaced tactical blunders as "equal to best").

### useChess Hook — Key Patterns
- **Chess instance in a ref**, re-render triggered by a version counter (`bump()`). Avoids expensive clone-on-every-move.
- **Session ID** (`sessionIdRef`) — incremented on startGame, newGame, resign, unmount. Deferred callbacks (inner `setTimeout(0)` before getAIMove, blunder analysis timer) check session before mutating state → prevents stale AI moves firing after the user left/resigned/restarted.
- **Refs mirror state** for sync access inside closures (`playerColorRef`, `difficultyRef`, `takeBackUsedRef`, `blunderCountRef`, `startedAtRef`) — setState is async and closures would see stale values in `saveCurrentGame`.
- **AI scheduling**: 400ms pre-delay (feels less instant) → `InteractionManager.runAfterInteractions` → `setIsAIThinking(true)` → 400ms think delay → yield via inner `setTimeout(0)` (lets React commit progress-bar state + native animations start before JS blocks) → `getAIMove` runs synchronously → move applied + state updates.
- **Restore from saved game**: replays all saved SAN moves on a fresh `new Chess()` to rebuild chess.js's internal `_history` (a raw FEN load produces an empty history, which silently breaks take-back AND move count).

### Blunder Analysis
Runs in a `setTimeout(0)` after every player move so the board renders first. Calls `analyzeMove(fenBefore, playedSan, 2)` which runs `findBestMove` at depth 2, then scores both the best move and the played move via shallow minimax (depth 1) — static eval alone misses tactical blunders like hanging a piece to a one-move recapture. Severity bucketed by centipawn loss: `good` <50, `inaccuracy` <150, `mistake` <300, `blunder` <600, `catastrophe` ≥600. Blunder + catastrophe increment `blunderCountRef`. Toast fades in/out via native-driver opacity; take-back has its own dedicated roast pool.

---

## 14. Checkers Engine Architecture (Session 18)

### Files
| File | Purpose |
|------|---------|
| `src/services/checkersAI.ts` | Pure search/eval engine: minimax + alpha-beta, TT, killer moves, IDS, forced capture, multi-jump, king promotion. No external deps. |
| `src/services/checkersStorage.ts` | SQLite persistence — save/load/clear single in-progress game in `checkers_game` table |
| `src/data/checkersAssets.ts` | Piece → image mapping: 4 checker PNGs (red, red-king, black, black-king) |
| `src/hooks/useCheckers.ts` | All game state + AI scheduling + move handling + persistence + resign |
| `src/screens/CheckersScreen.tsx` | Thin render shell — pre-game modal (color + difficulty), board grid, piece counts, resign, game-over overlay |
| `__tests__/checkersAI.test.ts` | 52 tests: board setup, move generation, jumps, multi-jumps, kings, promotion, forced capture, game over, evaluation, AI at all difficulties, serialization, immutability, TT, mate ply, eval perf, AI null |

### Board Representation
8×8 array of `(Piece | null)[][]`. Only dark squares `((row + col) % 2 === 1)` hold pieces. Red starts rows 5-7 (bottom), black rows 0-2 (top). Red moves toward row 0, black toward row 7. Red moves first.

### Move Generation (American Rules)
1. Generate all jumps via recursive DFS (`findJumpChains`). Multi-jumps are single moves with multiple captured pieces.
2. If any jumps exist for any piece, return ONLY jumps (forced capture rule).
3. If no jumps, generate simple diagonal moves (forward only for regular pieces, all 4 for kings).
4. **Promotion stops the chain:** when a non-king lands on the back rank during a multi-jump, the chain ends there (crowned but no continuing as king that turn). Kings are unaffected.

### Evaluation
Pure material + positional — no `generateMoves` calls (critical perf fix from audit). Material: piece=100, king=160. Position: advancement bonus table (red toward row 0, black toward row 7). King center preference (+8 for rows 3-4, cols 2-5). Back rank bonus (+8 for non-kings on own back rank). No pieces: ±100000.

### Search
Same patterns as chess (minimax, alpha-beta, TT, killers, IDS) but simpler:
- No quiescence search (forced captures make positions naturally quiescent)
- No opening book, no null-move pruning
- Mate scores include ply penalty (`-100000 + ply` / `100000 - ply`) for faster-mate preference and TT consistency
- TT: 100K entries, board serialized as 33-char string (32 dark squares + turn)

### Difficulty Levels
| Index | Name | Min Depth | Max Depth | Time | Randomness |
|-------|------|-----------|-----------|------|------------|
| 0 | Beginner | 2 | 4 | 500ms | 0.4 |
| 1 | Casual | 3 | 6 | 800ms | 0.2 |
| 2 | Intermediate | 4 | 8 | 1.5s | 0.05 |
| 3 | Advanced | 5 | 10 | 3s | 0 |
| 4 | Expert | 6 | 14 | 5s | 0 |

Deeper than chess due to lower branching factor (~7-10 moves vs ~30-35 in chess).

### Key Differences from Chess Engine
- No external library (chess has chess.js). Board is a raw 2D array.
- `applyMove` returns a new board (immutable), not in-place mutation.
- No quiescence search, no opening book, no null-move pruning, no blunder analysis.
- No take-back, no roasts.
- Board flipped 180° for black player (same as chess).
