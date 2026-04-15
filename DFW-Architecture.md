# DFW Architecture
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 31 (April 15, 2026)

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

### Font System (Sessions 21-22)
- Three-tier system: Satisfy (app title), LilitaOne (game headers), Montserrat Alternates (everything else)
- `FONTS` constant in `src/theme/fonts.ts` — exports `title` (Satisfy), `gameHeader` (LilitaOne), `regular`/`semiBold`/`bold`/`extraBold` (Montserrat Alternates)
- Font loading in App.tsx: `useFonts` hook from `expo-font` loads all families; `expo-splash-screen` held until ready
- Error fallback: if fonts fail, app proceeds with system fonts — `FONTS` values are just font family strings
- Android `fontWeight` restriction: custom `fontFamily` ignores `fontWeight` on Android — must use weight-specific font files. All `fontWeight` properties replaced with `fontFamily` throughout (Phase 2, Session 22)
- Phase 1 (Session 21): fonts applied to screen headers only (Nunito originally, swapped to Montserrat Alternates in Session 22)
- Phase 2 (Session 22): fontFamily applied to ALL body text, labels, buttons, descriptions across 25 screens, 16 components, and buttonStyles.ts. Font size reduction pass applied to compensate for wider letterforms (28+ → -2, 16-27 → -2, 13-15 → -1)
- Font swap: originally Nunito, changed to Montserrat Alternates for more premium, distinctive feel. `@expo-google-fonts/nunito` removed.

### Haptics (Session 21)
- `hapticLight()` — standard UI feedback (button taps, player's turn notification)
- `hapticMedium()` — medium emphasis
- `hapticHeavy()` — strong feedback (check detected after a move)
- `hapticError()` — `Haptics.notificationAsync(NotificationFeedbackType.Error)` — long error vibration (checkmate)
- `hapticSelection()` — selection change feedback
- All gated by `_hapticsEnabled` from kv_store, with try/catch fallback

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

### Widget Navigation Stacks (cold start)
`App.tsx` builds an `initialNavState` for cold-start widget entries so Back lands on the correct parent:
- VoiceRecord widget entry: initial stack is `Home → VoiceMemoList → VoiceRecord` (Session 25)
- VoiceMemoDetail widget entry: initial stack is `Home → VoiceMemoList → VoiceMemoDetail` (Session 25)
- Notepad widget entry: `Home → Notepad` (NotepadScreen IS the parent list, no intermediate)
- Calendar widget entry: `Home → Calendar`
- AlarmFire (notification cold start): `Home → AlarmList → AlarmFire`
- CreateAlarm/CreateReminder: `Home → AlarmList → CreateAlarm` / `Home → Reminders → CreateReminder`
- Note: warm-app widget paths still navigate directly via `navigation.navigate(...)` in most cases. The Quick Record button on `HomeScreen` was switched to `navigation.reset({ routes: [Home, VoiceMemoList, VoiceRecord] })` in Session 25 to match the cold-start back behavior. Other warm-app widget paths are a known limitation, deferred to Session 26.

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

### New/Modified Files in Session 23

| File | Status | Purpose |
|------|--------|---------|
| `src/utils/gameSounds.ts` | NEW | Game sound effect service (cached toggle + VOLUMES map, fire-and-forget expo-audio) |
| `src/assets/mediaIcons.ts` | NEW | Media control icon registry (5 WebP assets) + GlowIcon component (colored glow shadow) |
| `metro.config.js` | MODIFIED | Added wav to assetExts for sound file bundling |
| `assets/sounds/` | NEW | 11 wav sound files (chess, checkers, memory match, tap) |
| `assets/icons/game-play.webp` | NEW | Green anthropomorphic play character for game contexts |
| `assets/icons/play-app.webp` | NEW | Chrome play icon for app controls |
| `assets/icons/pause.webp` | NEW | Chrome pause icon |
| `assets/icons/record.webp` | NEW | Chrome record icon |
| `assets/icons/stop.webp` | NEW | Chrome stop icon |
| `assets/app-icons/close-x.webp` | NEW | Chrome close/dismiss icon (512×512, transparent bg) |

### Dependencies (Session 23)
- `expo-audio` used by both `soundFeedback.ts` (alarm chirp) and `gameSounds.ts` (game SFX)
- `metro.config.js` required for wav asset bundling (added `wav` to `resolver.assetExts`)

### New/Modified Files in Session 24

| File | Status | Purpose |
|------|--------|---------|
| `src/utils/safeParse.ts` | NEW | `safeParse<T>(json, fallback)` + `safeParseArray<T>(json)` — guards every `JSON.parse` call site from malformed storage rows |
| `src/utils/asyncMutex.ts` | NEW | `withLock(key, fn)` — per-key async mutex. Serializes concurrent storage mutations on the same entity (e.g., two renames racing on the same note id) |
| `src/utils/audioCompat.ts` | NEW | `PlayerWithEvents` intersection type. Patches expo-audio 55.x type drift where `AudioPlayer extends SharedObject<AudioEvents>` loses inherited `addListener`/`release`. Created but not yet imported by consumers — `gameSounds.ts` + `soundFeedback.ts` + `VoiceMemoListScreen.tsx` still throw TS errors on the raw `AudioPlayer` type |
| `src/components/GameNavButtons.tsx` | NEW (stranded) | Character-style back/home button pair for game screens. References `APP_ICONS.gameBack` + `APP_ICONS.gameHome` which were not added to the icon registry after the FINAL-prompt revert. Not imported anywhere. TypeScript errors on lines 68 + 79. Must be wired or deleted before ship |
| `src/utils/alarmSounds.ts` | DELETED | Dead file left over from pre-v1.18 sound architecture |
| `src/theme/colors.ts` | MODIFIED | Added `success: string` + `overlaySecondary: string` to `ThemeColors`. Values defined for all 6 themes (Dark #4CAF50, Light #16A34A, HighContrast #44FF44, Vivid #00FF88, Sunset #16A34A, Ruby #16A34A) |
| 13 storage files | MODIFIED | Wrapped all `JSON.parse` calls with `safeParse`/`safeParseArray`; wrapped mutation paths with `withLock` where concurrent writes could race |
| `CreateAlarmScreen.tsx` + `CreateReminderScreen.tsx` | MODIFIED | `beforeRemove` guard with `savedRef` bypass pattern — confirmation prompt on back while editing, but save-then-navigate doesn't trip the guard |
| 4 list screens (AlarmList, Notepad, Reminder, VoiceMemoList) | MODIFIED | FAB chrome circle matching `BackButton`/`HomeButton` (theme-aware rgba fill + 1px border, no elevation/shadow — fixes Android hex hole). Plus icon renders without `tintColor` to show natural silver |
| `NoteCard.tsx` + `DeletedNoteCard.tsx` | MODIFIED | Silver-metallic `APP_ICONS.notepad` fallback when `note.icon` is empty (replaces `📝` emoji) |
| `assets/sounds/pencil.wav` | NEW (unwired) | Sudoku number placement SFX — on disk, not in `gameSounds.ts` registry |
| `assets/sounds/Eraser.wav` | NEW (unwired) | Sudoku cell clear SFX |
| `assets/sounds/Triva-tap.wav` | NEW (unwired) | Trivia button tap SFX |
| `assets/sounds/right-answer-Triva.wav` | NEW (unwired) | Trivia correct answer SFX |
| `assets/sounds/wrong-answer-trivia.wav` | NEW (unwired) | Trivia wrong answer SFX |
| `assets/icons/icon-hourglass.webp` | NEW (unexported) | Game character icon — tired hourglass face |
| `assets/icons/icon-pencil.webp` | NEW (unexported) | Game character icon — pencil (Sudoku/notes) |
| `assets/icons/icon-erase.webp` | NEW (unexported) | Game character icon — eraser |
| `assets/icons/icon-chevron-left.webp` | NEW (unexported) | Game chevron (pagination/navigation) |
| `assets/icons/icon-chevron-right.webp` | NEW (unexported) | Game chevron |
| `assets/icons/icon-game-back.webp` | NEW (unexported) | Character back button for GameNavButtons |
| `assets/icons/icon-game-home.webp` | NEW (unexported) | Character home button for GameNavButtons |
| `assets/icons/icon-smiley.webp` | NEW (unexported) | Game character smiley (generic positive feedback) |
| `assets/app-icons/lock.webp` | NEW (unexported) | Chrome lock icon — deferred until PIN system ships |
| `assets/app-icons/checkmark.webp` | NEW (unexported) | Chrome checkmark icon |

### New/Modified Files in Session 26

| File | Status | Purpose |
|------|--------|---------|
| `src/types/voiceClip.ts` | NEW | `VoiceClip` interface — id, memoId, uri, duration, position, label, createdAt |
| `src/services/voiceClipStorage.ts` | NEW | CRUD for `voice_clips` table — `getClipsForMemo`, `getClipSummaries` (batch), `addClip`, `deleteClip`, `updateClipLabel`, `getNextClipPosition`, `deleteAllClipsForMemo` |
| `src/services/voiceMemoFileStorage.ts` | NEW | Per-clip audio file persistence — `saveVoiceClipFile` (cache → permanent copy), `deleteVoiceMemoFile`, `deleteAllVoiceMemoFiles`. Permanent files at `${Paths.document}voice-memos/{clipId}_{timestamp}.m4a` |
| `src/services/voiceMemoImageStorage.ts` | NEW | Photo persistence for voice memos — `saveVoiceMemoImage(memoId, sourceUri)`, `deleteVoiceMemoImage`, `deleteAllVoiceMemoImages`. Files at `${Paths.document}voice-memo-images/{memoId}_{timestamp}_{shortId}.{jpg\|png}`. No companion JSON, no drawing support |
| `src/services/database.ts` | MODIFIED | Added `voice_clips` `CREATE TABLE`, `images` column migration on `voice_memos` (`PRAGMA table_info` check + `ALTER TABLE`), legacy `voice_memos.uri → voice_clips` migration block, `images` added to `_insertVoiceMemos` migration inserter |
| `src/services/voiceMemoStorage.ts` | MODIFIED | `images` added to `VoiceMemoRow`, `rowToMemo` parses with try/catch + `Array.isArray` guard, `addVoiceMemo`/`updateVoiceMemo` write `JSON.stringify(images ?? [])`, `permanentlyDeleteVoiceMemo` deletes images via `deleteAllVoiceMemoImages` before the row delete |
| `src/types/voiceMemo.ts` | MODIFIED | Added optional `images?: string[]`, `clips?: VoiceClip[]`, `clipCount?: number`, `totalDuration?: number` (clips/clipCount/totalDuration populated at read time by `getVoiceMemos`/`getClipSummaries`) |
| `src/services/backupRestore.ts` | MODIFIED | `voice-memo-images` added to `MEDIA_FOLDERS`, `voiceMemoImages: number` added to `BackupMeta.contents`, exportBackup populates the count via `countFilesInDir` |
| `src/screens/VoiceRecordScreen.tsx` | REWRITTEN | New flow: creates memo + first clip directly via `saveAndNavigate`. Two modes (new memo / add-clip). Camera button bottom-right corner, always visible. Photo thumbnail strip, `capturedPhotos` state + `capturedPhotosRef` mirror for background-handler closures. Atomic rollback on clip insert failure |
| `src/screens/VoiceMemoDetailScreen.tsx` | REWRITTEN | Accepts `{ memoId }` only (`tempUri` path removed). Title/note edit + Clips list with playback controls + photo strip + ImageLightbox. Edit/Save circle icon buttons in header. `useFocusEffect` reloads BOTH memo and clips. Playback mode pills (Stop/Play All/Repeat) persisted via kv `clipPlaybackMode` |
| `src/hooks/useTimerScreen.ts` | MODIFIED | Added `handleSaveCustomOnly`, `handleSaveNewTimerOnly`, `handleSaveEditTimerOnly`, dispatcher `handleModalSaveOnly`. Mirrors save handlers minus the start/`handleAddTimer` step. Toast feedback on success |
| `src/screens/TimerScreen.tsx` | MODIFIED | Modal redesigned with 3 circle action buttons (red cancel / accent save-only / success start), 48×48 sound mode + emoji circles, hint text restructured to "Tap [+] to set [😊]", emoji-circle default shows silver `+` instead of `😊` until user picks |
| `src/screens/CreateAlarmScreen.tsx` | MODIFIED | Header text Save → 40×40 accent-border circle with floppy-disk icon, sound mode button gets standard 40×40 chrome circle, calendar inline icons restructured into proper flex `<View>` rows, icon-picker fallback shows silver `+` |
| `src/screens/CreateReminderScreen.tsx` | MODIFIED | Header text Save → 40×40 accent-border circle with floppy-disk icon (with `editReady` opacity/disabled), calendar inline icons restructured into flex rows, icon-picker fallback shows silver `+` (treating notepad emoji `\u{1F4DD}` sentinel as "no choice") |
| `src/components/NoteEditorModal.tsx` | MODIFIED | Edit/Save text capsules in topBar replaced with 40×40 circle icon buttons, moved from `topBarCenter` into `topBarRight`. `editorTrashBtn` upsized to 40×40 with red border |
| `src/components/VoiceMemoCard.tsx` | MODIFIED | Accessibility label conditional on `memo.uri` — `'Open memo'` when uri empty (clips-based), `'Play memo'`/`'Pause memo'` otherwise |
| `assets/icons/floppy-disk.webp` | NEW | Chrome save icon (`APP_ICONS.save`) — replaces all "Save" text buttons |
| `assets/icons/pencil.webp` | NEW | Chrome edit icon (`APP_ICONS.edit`) — replaces all "Edit" text buttons |
| `src/data/appIconAssets.ts` | MODIFIED | Added `save` (floppy-disk) and `edit` (pencil) entries |

### New/Modified Files in Session 27

| File | Status | Purpose |
|------|--------|---------|
| `src/hooks/useNoteEditor.ts` | NEW | NoteEditorModal state + logic (Session 27). All state (editorTitle, editorText, color, font, images, voice memos, panel toggles), effects (visibility/load, dirty tracking, player watchers), and handlers (confirmClose, handleSave, handleShare, handleDraw, toggleAttachments, toggleColorPicker, pickImage, takePhoto, dismissColorPicker, dismissAttachments). Legacy voice-memo playback via `useAudioPlayer` preserved; recording removed. Mutual-exclusion panel toggles (attachments vs color picker) |
| `src/components/NoteEditorTopBar.tsx` | NEW | Editor top bar — view/edit mode variants (Session 27). View mode: Back, Home, Edit, Share, Delete. Edit mode: Back, Home, Save (conditional), Delete. Absolute positioning, `rgba(0,0,0,0.3)` overlay bg, self-contained 40×40 circle button styles |
| `src/components/NoteEditorToolbar.tsx` | NEW | Editor bottom toolbar — Camera, Gallery, Draw, Colors, Attached (Session 27). Persistent row replacing the old dropdown menu. Paperclip icon with active state and count badge. Edit mode only. Icon sizes: paperclip 34, camera 24, gallery 24, draw 28, palette 38 |
| `src/components/NoteColorPicker.tsx` | NEW | Editor color picker overlay — bg + font colors (Session 27). Extracted from inline JSX: background color row (presets + custom slot + picker button), font color row (presets + auto option + custom slot + picker button). Self-contained styles |
| `src/components/NoteImageStrip.tsx` | NEW | Editor image thumbnail strip — horizontal scrollable (Session 27). 120×120 thumbnails, red X delete with white border + 16px hitSlop. Centered via `flexGrow: 1, justifyContent: 'center'`. Used in both view-mode scroll and edit-mode attachments panel. View-mode suppresses drawing Edit and photo Draw-On alerts |
| `src/components/NoteEditorModal.tsx` | REWRITTEN | Thin render shell (~250 lines, was 1268). Calls `useNoteEditor(props)` for all state and handlers. JSX composes TopBar + body area + AttachmentsPanel + ColorPicker + Toolbar + sub-modals. View-mode ScrollView uses `justifyContent: 'space-between'` to push images to bottom. Edit-mode TextInput caps at `maxHeight: 300` when attachments exist. Hardware back peels attachments panel → color picker → confirm close |
| `src/hooks/useNotepad.ts` | MODIFIED | `EditorSaveData` extended with `title: string`. `handleEditorSave` writes `title` on both add and update paths. Welcome note constructor updated with `title: ''` |
| `src/types/note.ts` | MODIFIED | Added `title: string` (required) to `Note` type |
| `src/services/database.ts` | MODIFIED | Added `title TEXT NOT NULL DEFAULT ''` to notes CREATE TABLE. Migration: `ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT ''` + `UPDATE notes SET title = '' WHERE title IS NULL` backfill for any prior nullable columns |
| `src/services/noteStorage.ts` | MODIFIED | `NoteRow.title` + `rowToNote` normalizes `row.title ?? ''`. `addNote`/`updateNote` write `title || ''` |
| `src/components/NoteCard.tsx` | MODIFIED | Title-first render: `note.title` as primary line (15pt semiBold), `note.text` as 2-line preview (13pt regular, 60% opacity). Falls back to truncated first line when title is empty. Accessibility label prefers title |
| `src/components/DeletedNoteCard.tsx` | MODIFIED | Same title-first treatment as NoteCard. 15pt cardTitle + cardPreview at 0.7 opacity to match dimmed deleted-card look |
| `src/components/NoteVoiceMemo.tsx` | MODIFIED | Dead `RecordingControls` component and its styles removed — recording no longer exists in notes. `MemoCard` + `voiceMemoStyles` retained for legacy playback |
| `src/components/ShareNoteModal.tsx` | MODIFIED | Added `noteTitle: string` prop. `buildNoteHtml` renders title as `<h2>` above the body `<pre>`. Text-share prepends title + newline separator. Share eligibility check and Print fallback include title |
| `src/components/HomeButton.tsx` | MODIFIED | Icon 20 → 24 (Session 27 icon consistency pass) |
| `src/components/BackButton.tsx` | MODIFIED | Icon 20 → 22 (Session 27 icon consistency pass) |
| `src/screens/VoiceMemoDetailScreen.tsx` | MODIFIED | Removed `maxLength={200}` from note TextInput. Added share button + per-clip share icon. Title/clips header/photos header all centered. Photo delete button inset with `top:4, right:4` red with white border + 16px hitSlop |
| `src/screens/CreateAlarmScreen.tsx` | MODIFIED | Save icon 18 → 24, sound mode icon 18 → 24 + shifted left with `marginLeft: -8` (Session 27) |
| `src/screens/CreateReminderScreen.tsx` | MODIFIED | Save icon 18 → 24 (Session 27) |
| `src/screens/TimerScreen.tsx` | MODIFIED | Save icon 22 → 24, play icon 24 → 26, Timer Sound selector + Emoji Circle accessibility labels added (Session 27) |
| `assets/app-icons/paperclip.webp` | NEW | Chrome paperclip icon (`APP_ICONS.paperclip`) — toolbar Attached button |
| `assets/icons/paperclip.png` | DELETED | Legacy PNG removed after webp conversion |

### New/Modified Files in Session 28

| File | Status | Purpose |
|------|--------|---------|
| `src/hooks/useTutorial.ts` | NEW | Tutorial system hook — per-screen dismissal via `kv_store`, lazy `useState` initializer (synchronous `kvGet`, no flash), exports `resetAllTutorials()` utility |
| `src/components/TutorialOverlay.tsx` | NEW | Tutorial overlay — wrapper View with backdrop/card sibling structure (Session 28 TalkBack fix), section-colored left accent + thin border, dot indicators (hidden for single-tip screens), nav buttons with `hapticLight()`, `importantForAccessibility="no-hide-descendants"` on backdrop + `accessibilityViewIsModal={true}` on card. Voice playback via `expo-audio` MEDIA stream: `Asset.fromModule + downloadAsync`, `PlayerWithEvents` cast, `cancelled`-flag race protection, `AppState` listener pauses on background, `stopClip()` called on tip advance/dismiss/unmount/background |
| `src/data/tutorialTips.ts` | NEW | Tutorial tip data for 7 screens (alarmList:3, reminders:2, notepad:3, voiceMemoList:3, calendar:1, timers:2, games:1). Every tip has a `clipKey` matching its MP3 filename in `assets/voice/tutorial/` |
| `src/data/tutorialClips.ts` | NEW | Voice clip registry — `Record<string, number>` mapping each `clipKey` to a `require('../../assets/voice/tutorial/tutorial_{screenKey}_{NN}.mp3')` module ID. 15 entries, one per tip |
| `assets/voice/tutorial/` | NEW | 15 ElevenLabs v3 MP3 tutorial voice clips (same male early-30s character as existing fire/snooze/timer clips, sarcastic tone, v3 audio tags for emotional direction). Filename pattern `tutorial_{screenKey}_{NN}.mp3` |
| `__tests__/tutorialTips.test.ts` | NEW | Jest data validation — ≥7 screen keys, non-empty title/body, letter-only keys, optional `clipKey` typecheck |
| `src/utils/audioCompat.ts` | MODIFIED | `PlayerWithEvents` adopted across `src/utils/gameSounds.ts`, `src/utils/soundFeedback.ts`, `src/screens/VoiceMemoListScreen.tsx`, and `src/components/TutorialOverlay.tsx` (4 files). All `as any` casts on `addListener`/`release` eliminated. `.release()` → `.remove()` everywhere |
| `src/services/backupRestore.ts` | MODIFIED | `validateBackup` treats missing `voiceMemoImages` field as 0 (old .dfw backward compat). `BackupMeta.contents.voiceMemoImages` changed from required to optional `number?`. Export side still writes the count for new backups |
| `src/screens/VoiceMemoDetailScreen.tsx` | MODIFIED | Layout reorder (clips-first), bottom toolbar (Attached/Camera/Gallery), photos in attachments panel, share button + per-clip share via scrollable Modal (replaced `Alert.alert` 3-button Android limit), bigger 120px thumbnails. `useFocusEffect` only reloads clips/images on re-focus, `firstLoadRef` gates title/note seed so user edits aren't clobbered. Back button peels attachments panel before unsaved-changes dialog. Attachments panel dismisses on title/note focus + empty-photo guard. Toolbar/panel uses theme colors instead of hardcoded dark rgba. Share picker modal backdrop uses `colors.modalOverlay`, count badge text + photo delete border are mode-aware |
| `src/screens/VoiceRecordScreen.tsx` | MODIFIED | `beforeRemove` guard now also fires on `capturedPhotosRef.current.length > 0` — photos taken before starting a recording no longer vanish silently. Alert message/title/cancel label adapt to recording-only vs photos-only vs both |
| `src/screens/AlarmListScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('alarmList')`, `colors.sectionAlarm`) |
| `src/screens/ReminderScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('reminders')`, `colors.sectionReminder`) |
| `src/screens/NotepadScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('notepad')`, `colors.sectionNotepad`) |
| `src/screens/VoiceMemoListScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('voiceMemoList')`, `colors.sectionVoice`) + `PlayerWithEvents` adoption |
| `src/screens/CalendarScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('calendar')`, `colors.sectionCalendar`) |
| `src/screens/TimerScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('timers')`, `colors.sectionTimer`) |
| `src/screens/GamesScreen.tsx` | MODIFIED | Tutorial overlay wired (`useTutorial('games')`, `colors.sectionGames`) |
| `src/screens/SettingsScreen.tsx` | MODIFIED | New "Tutorial Guide" card row in General section above Send Feedback. `onPress={handleResetTutorials}`, subtitle "Show feature tips again", chevron-right indicator |
| `src/hooks/useSettings.ts` | MODIFIED | Added `handleResetTutorials` — calls `resetAllTutorials()` from `useTutorial.ts`, toasts "Tutorials reset — visit any screen to see tips again", fires `hapticLight()`. Returned from `UseSettingsResult` for SettingsScreen |

### New/Modified Files in Session 29

| File | Status | Purpose |
|------|--------|---------|
| `src/data/timerPresetAssets.ts` | NEW | Timer preset WebP registry — `Record<string, number>` mapping preset id → `require('../../assets/timer-presets/{preset}.webp')` module ID. 21 entries, one per built-in preset. TimerScreen resolves preset rendering to `<Image>` via this registry; user-created timers fall through to the emoji path. |
| `assets/timer-presets/` | NEW | 20 WebP art files shared across the 21 built-in timer presets (one preset falls through to the shared/emoji path — registry is sparse by design). Includes the 2 new Session 29 presets (`crying.webp` @ 2700s, `revenge.webp` @ 14400s). Style matches the two-tier chrome/character system: weathered character-driven art sits in the timer grid. |
| `src/data/timerPresets.ts` | MODIFIED | Added Crying (2700s / 45min) and Revenge (14400s / 4hr) preset entries. List now 21 items. |
| `src/screens/HomeScreen.tsx` | MODIFIED | Opening.mp3 wired: on first mount, reads `kvGet('openingClipPlayed')`; if missing, plays `assets/voice/Opening.mp3` via `expo-audio` MEDIA stream (same `Asset.fromModule + downloadAsync` + `PlayerWithEvents` pattern as tutorial clips), then calls `kvSet('openingClipPlayed', '1')`. `AppState.addEventListener('change', ...)` pauses on background. `cancelled`-flag race protection on the async IIFE. Duplicate Opening playback from `OnboardingScreen.tsx` removed as part of the wiring — the home-screen first-mount is now the single source of truth. |
| `src/screens/OnboardingScreen.tsx` | MODIFIED | Duplicate Opening.mp3 playback removed (moved to HomeScreen, gated on first mount). |
| `assets/voice/Opening.mp3` | NEW | ElevenLabs v3 MP3, same male early-30s Alarm Guy character as existing fire/snooze/timer/tutorial clips. First-launch greeting, plays once. Brings total bundled voice clips to 84 (68 original + 15 tutorial + 1 opening). |
| `src/screens/TimerScreen.tsx` | MODIFIED | Preset cell rendering branches on `timerPresetAssets[preset.id]` — renders `<Image>` when the asset exists, otherwise falls through to the emoji fallback for user-created timers. |
| `src/services/proStatus.ts` | NEW | Synchronous Pro entitlement cache backed by `kv_store['pro_status']`. Exports `isProUser()`, `getProDetails()`, `setProStatus(details)`, `clearProStatus()`. Uses `safeParse` + `isValidProDetails` type guard so malformed / partial / wrong-shape JSON can never fake entitlement. `ProDetails` shape: `{ purchased: boolean, productId: string, purchaseDate: string, purchaseToken?: string }`. No async/await — kvGet/kvSet/kvRemove are already synchronous. |
| `src/hooks/useEntitlement.ts` | NEW | React hook wrapping expo-iap's `useIAP`. Exposes `{ isPro, loading, error, productPrice, purchase, restore }`. Local cache init via `isProUser()` (works offline). `fetchProducts` with `.catch()` for network flakes. Price via `products.find(p => p.id === PRODUCT_ID).displayPrice`. Real restore via `restorePurchases` + `availablePurchases` scan + `finishTransaction` acknowledge (critical — unacknowledged Android purchases auto-refund after 3 days). 60s `setTimeout` fallback for stuck `loading`, cleared in both callbacks and in an unmount effect. User-cancel handled via `ErrorCode.UserCancelled` (async error path) + legacy `E_USER_CANCELLED` + `message.includes('cancel')` (sync catch path). `PRODUCT_ID = 'dfw_pro_unlock'`. |
| `src/components/ProGate.tsx` | NEW | `{ feature: string, children: ReactNode }` pass-through wrapper. Renders `<>{children}</>` unconditionally. Screen wrapping deferred to P7 — see DFW-Decisions.md. |
| `__tests__/proStatus.test.ts` | NEW | 18 Jest tests covering `isProUser` / `getProDetails` / `setProStatus` / `clearProStatus` + `shape validation` block (empty object, partial object, wrong-type fields, JSON `null`, JSON string, wrong-type composites). Same `Map`-backed kv mock pattern as `settings.test.ts`. |
| `app.json` | MODIFIED | Added `expo-iap` to the `expo.plugins` array. Bumped `expo.version` `1.20.0 → 1.21.0` and `expo.android.versionCode` `37 → 38 → 39` (38 was the first Session 29 build before the P5.5 work landed; 39 is the one that shipped to both production and internal testing tracks). |
| `package.json` | MODIFIED | Added `"expo-iap": "^4.0.2"` to dependencies. |

### Session 29 Native Dependencies

- **`expo-iap@^4.0.2`** — Expo-native Google Play Billing 8.x wrapper. Native module, **requires a dev/production build** (cannot run in Expo Go or a dev client without the module). Registered in `app.json` `expo.plugins`. First Session 29 dev build bumps vCode from 37 → 38 → 39 to reflect the native-surface change.
- TypeScript-first, re-exports `ErrorCode` enum (kebab-case values like `'user-cancelled'`, NOT the legacy `'E_USER_CANCELLED'`) via `export * from './types'`.
- `useIAP` hook provides: `connected`, `products`, `availablePurchases`, `fetchProducts`, `requestPurchase`, `finishTransaction`, `restorePurchases`, + `onPurchaseSuccess` / `onPurchaseError` callbacks. All callbacks captured via an `optionsRef` pattern inside the library so the latest callback fires on every event (no stale closure concerns).
- `Product.displayPrice` is the cross-platform standardized formatted price string (e.g. `"$1.99"`). `Product.price` is `number | null` and should not be rendered directly.
- `Product.id` (not `productId`) is the SKU field; `Purchase.productId` is the SKU field on the purchase side — the asymmetry is worth knowing when writing `.find()` lookups.

### Session 29 Audit Fixes

- **AppState background listener** — HomeScreen opening-clip effect and other one-shot audio playback now subscribe to `AppState.addEventListener('change', ...)` and call `stopClip()` on any non-`'active'` state. Prevents a backgrounded app from continuing to pipe audio into the system sink.
- **Dead code removal** — unused imports/locals cleaned up in the Session 29 touched files (HomeScreen, TimerScreen, timerPresets).
- **Double-lookup collapse** — TimerScreen preset rendering used to resolve the asset twice per cell (once for existence check, once for the `<Image source>`). Collapsed to a single `const asset = timerPresetAssets[id]` destructure + conditional render.
- **Accessibility pass** — new preset Image elements carry `accessibilityLabel` (preset name) and `accessibilityRole="image"`. User-created emoji path untouched.

### New/Modified Files in Session 30

| File | Status | Purpose |
|------|--------|---------|
| `src/services/firebaseAuth.ts` | NEW | Google Sign-In + Firebase Auth service. Exports `signInWithGoogle()`, `signOutGoogle()`, `getCurrentUser()`, `onAuthStateChanged()`, `getAccessToken()`, `requestCalendarScope()`. `ensureConfigured()` lazy-initializes `GoogleSignin.configure({ webClientId, scopes: [CALENDAR_SCOPE] })` on first use. `signInWithGoogle` runs `GoogleSignin.hasPlayServices` → `GoogleSignin.signIn` → `GoogleAuthProvider.credential(idToken)` → `signInWithCredential` → fire-and-forget `createOrUpdateUserProfile(user)` (catches + `console.warn` so profile write never blocks the sign-in UX). Both `signInWithGoogle` and `signOutGoogle` call `clearCalendarCache()` before doing anything else — belt-and-suspenders against cross-user cache leaks. `getAccessToken()` wraps `GoogleSignin.getTokens` with a try/catch-returns-null contract. `requestCalendarScope()` wraps `GoogleSignin.addScopes([CALENDAR_SCOPE])` with a try/catch-returns-boolean contract. `WEB_CLIENT_ID` is the OAuth 2.0 client ID with `client_type: 3` from `google-services.json`, hardcoded as a const (public identifier, not a secret). |
| `src/services/firestore.ts` | NEW | Typed Firestore CRUD for the `users` collection. Exports `UserProfile` type (`uid`, `email`, `displayName`, `photoURL`, `createdAt: Timestamp`, `lastSignIn: Timestamp`), `createOrUpdateUserProfile(user)`, `getUserProfile(uid)`, `deleteUserProfile(uid)`, `firestoreTimestamp()`. Uses the modular API via `firestore()` + `firestore.Timestamp.now()`. `createOrUpdateUserProfile` reads the doc first, only writes `createdAt` on the first save (keyed off `snap.exists()`), then calls `set(payload, { merge: true })`. `getUserProfile` validates the snapshot data via `isUserProfile` type guard (checks every field including `isTimestamp(seconds, nanoseconds)`) and returns `null` on shape mismatch — Firestore data is never trusted blindly. `USERS_COLLECTION` hardcoded as `'users'`. |
| `src/services/googleCalendar.ts` | NEW | Google Calendar REST API client + in-memory cache. Exports `GoogleCalendarEvent` interface (id, summary, description, startTime, endTime, isAllDay, location), `fetchCalendarEvents(startDate, endDate)`, `getEventsForDate(date, events)`, `clearCalendarCache()`. Cache is a module-level `Map<string, CacheEntry>` with 5-minute TTL, keyed by `${startDate}_${endDate}` (the single-user mobile cache model — cleared on sign-in AND sign-out so cross-user leaks are impossible). Query window built via `toLocalISOStart`/`toLocalISOEnd` helpers that construct local `Date` objects and convert through `.toISOString()` — correct for any device timezone, unlike a hardcoded `...Z` suffix. REST endpoint is `calendar/v3/calendars/primary/events?timeMin=&timeMax=&singleEvents=true&orderBy=startTime&maxResults=250`, Bearer header from `getAccessToken()`. Error recovery: on `401` calls `GoogleSignin.clearCachedAccessToken(token)` + `getAccessToken()` refresh + retry once; on `403` calls `requestCalendarScope()` + retry once; any other non-ok response returns `[]`. `getEventsForDate` is a pure filter — all-day events use inclusive-start/exclusive-end date-string comparison, timed events use local-date bracket comparison. Single native-import surface: `@react-native-google-signin/google-signin` (for `GoogleSignin.clearCachedAccessToken`). |
| `src/hooks/useSettings.ts` | MODIFIED | Added `googleUser` state + `handleGoogleSignIn`/`handleGoogleSignOut` handlers. Subscribes to `onAuthStateChanged` via `useEffect(() => { const unsub = onAuthStateChanged((u) => setGoogleUser(toGoogleUserSummary(u))); return unsub; }, [])` so the Settings screen reflects auth changes live. Sign-in catches `'-5'` + `'SIGN_IN_CANCELLED'` silently (user cancel); other errors surface via toast. Sign-out wraps the call in a two-step `Alert.alert` confirmation. Both use `hapticMedium`/`hapticLight` on success. |
| `src/screens/SettingsScreen.tsx` | MODIFIED | New "Google Account" card between the About and Permissions cards. Two visual states: connected shows profile photo (36×36 circle) + display name (bold) + email (secondary) + "Disconnect" secondary button; disconnected shows a "Connect Google Account" primary button. Explanation text below reads "Optional. Enables calendar sync and future connected features. Your local data stays on your phone either way." |
| `src/screens/CalendarScreen.tsx` | MODIFIED | Google Calendar integration. New imports: `fetchCalendarEvents`, `getEventsForDate`, `GoogleCalendarEvent`, `getCurrentUser`, `onAuthStateChanged`. New state: `authUser` (initialized from `getCurrentUser()`, updated via `onAuthStateChanged` subscription) + `googleEvents: GoogleCalendarEvent[]`. `isSignedIn` is now a derived const (`!!authUser`), not useState. Google fetch lives in a dedicated `useEffect([currentMonth, authUser])` — `useFocusEffect` deps reverted to `[]` so month navigation no longer re-reads alarms/reminders/notes/voiceMemos/settings from disk. `ListRow` extended with `dateStr` on event rows; `rowKeyExtractor` prefixes `googleCal` keys with `dateStr` so a multi-day Google event appearing on multiple dates in week/month view gets unique keys. `DayItem` union extended with `{ type: 'googleCal'; data: GoogleCalendarEvent }`. `FilterType` extended with `'google'`. `getItemsForDate` takes googleEvents as a 6th arg and appends google events via `getEventsForDate`. `getItemSortTime` handles googleCal (all-day → `'00:00'`, timed → local HH:MM). `applyFilter` handles `'google'`. `renderEventCard` has a new googleCal branch rendering a plain `View` (no tap navigation — these are external events) with calendar icon, summary + time/All-Day + location, and a "Google" badge styled with `DOT_GOOGLE_CAL` (`colors.sectionCalendar`). New `getEventDateStrings(event, year, month)` helper expands multi-day all-day events across their overlapping dates within the visible month. Markup: legend row uses `flexWrap: 'wrap'` + shortened "Voice" label to fit 5 dot types. Legend + filter capsule for Google are conditional on `isSignedIn`. |
| `src/screens/HomeScreen.tsx` | MODIFIED | Google Calendar integration for the Today section. New imports: `fetchCalendarEvents`, `getEventsForDate`, `GoogleCalendarEvent`, `getCurrentUser`, `onAuthStateChanged`. New state: `authUser` + `googleEvents`. `onAuthStateChanged` subscription in a dedicated `useEffect`. Google fetch moved out of `useFocusEffect` and into a dedicated `useEffect([authUser])` (fetches today's events as a single-day range). `useEffect([alarms, reminders, googleEvents])` recomputes `todayEvents` via `getTodayEvents` (which now takes googleEvents as a 3rd param). `TodayEvent` type extended with `type: 'googleCal'` and `data: ... \| GoogleCalendarEvent`. Today row render switches dot color to `colors.sectionCalendar` for googleCal, shows "Google" label + "All Day" suffix for `isAllDay` events, and `handleEventPress` early-returns for googleCal so tapping is a no-op (no navigation — they're external). |
| `__tests__/firebaseAuth.test.ts` | NEW | Mocks `@react-native-firebase/auth`, `@react-native-google-signin/google-signin`, and `../src/services/firestore`. Covers `getCurrentUser` (null + user cases), `signInWithGoogle` (happy path, SIGN_IN_CANCELLED on non-success, missing idToken, fires `createOrUpdateUserProfile`, still resolves when profile write rejects), `signOutGoogle` (calls both Firebase + Google, resolves even if either throws), `onAuthStateChanged` (subscribe + return unsubscribe). |
| `__tests__/firestore.test.ts` | NEW | Mocks `@react-native-firebase/firestore` default export with a `firestoreFn` that is both callable (returns a fake instance) and has `Timestamp.now`. Covers `firestoreTimestamp`, `createOrUpdateUserProfile` (first write includes `createdAt`, subsequent write omits it, null email coerces to `''`), `getUserProfile` (null when doc missing, typed UserProfile when valid, null on malformed data, null on missing timestamps), `deleteUserProfile` (calls delete on `users/{uid}`). |
| `__tests__/googleCalendar.test.ts` | NEW | Mocks `../src/services/firebaseAuth` + `@react-native-google-signin/google-signin` + global `fetch` + `Date.now`. Covers: not-signed-in returns `[]`, URL/auth header shape (with TZ-robust `new Date(...).toISOString()` expected values), timed + all-day parsing, summary default to `'Untitled'`, cache hit within TTL (no network), re-fetch after TTL, separate cache entries per date range, non-ok + network error return `[]`, 401 → `clearCachedAccessToken` + refresh + retry (no scope request), 401 gives up when refresh retry also fails, 401 gives up when refreshed token is null, 403 → `requestCalendarScope` + retry (no token clear), 403 gives up when scope denied. `getEventsForDate` tests cover timed event inclusion/exclusion, one-day all-day event, multi-day all-day event spanning the target date, event order preservation. `clearCalendarCache` test verifies the next call re-fetches. |
| `app.json` | MODIFIED | Added `@react-native-firebase/app`, `@react-native-firebase/auth`, and `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.PLACEHOLDER" }]` to `expo.plugins`. Added `android.googleServicesFile: "./google-services.json"` so EAS prebuild can locate the config on the build server (auto-detect only works for local builds). |
| `package.json` | MODIFIED | Added `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`, `@react-native-google-signin/google-signin` to dependencies. |
| `google-services.json` | NEW (root) | Firebase config file downloaded from Firebase Console. Contains project id (`dont-forget-why`), project number, Android package name (`com.zerennblish.DontForgetWhy`), SHA-1-bound OAuth client id (`client_type: 1`), and web OAuth client id (`client_type: 3`) used as `WEB_CLIENT_ID` in `firebaseAuth.ts`. API key is a public identifier for client-side discovery — not a secret. |

### Session 30 Native Dependencies

- **`@react-native-firebase/app`** — Core Firebase module, required by every other `@react-native-firebase/*` package. Native, requires a dev/production build. Registered in `app.json` `expo.plugins`.
- **`@react-native-firebase/auth`** — Firebase Authentication (email/password, phone, Google, Apple, etc.). Uses the modular API surface (`getAuth`, `signInWithCredential`, `signOut`, `onAuthStateChanged`, `GoogleAuthProvider.credential`). Exports `FirebaseAuthTypes.User` / `.UserCredential` — we re-export `User` via `ReturnType<typeof getCurrentUser>` on screens to avoid import churn.
- **`@react-native-firebase/firestore`** — Firestore client. Uses the namespaced default export (`import firestore from '@react-native-firebase/firestore'`) because `firestore.Timestamp.now()` is the cleanest way to get a Timestamp statically. Re-exports `FirebaseFirestoreTypes.Timestamp` for type usage.
- **`@react-native-google-signin/google-signin`** — Google Sign-In native library. Provides the `GoogleSignin` namespace with `configure`, `hasPlayServices`, `signIn`, `signOut`, `getTokens`, `addScopes`, `clearCachedAccessToken`. `signIn()` returns a typed `{ type: 'success' \| 'cancelled'; data?: {...} }` union as of v13+, no longer throws on user-cancel. `GetTokensResponse` = `{ idToken, accessToken }`. Native, requires a dev/production build.
- **All four together** = ~1 dev build (bundled) — each is registered as an Expo config plugin, and the native scaffolding is set up by the Firebase App plugin first.

### Session 30 Audit Fixes

Triple audit (Codex + Claude + Gemini) on Session 30 scope found 2 P1 + 6 P2 + ~12 P3. All P1 + P2 fixed in a follow-up pass.

- **P1 — Firestore test-mode rules** (Codex + Claude + Gemini) — Fixed pre-ship by publishing real rules: `match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`. Ruled out the "any authenticated user can scrape any other user's profile" failure mode.
- **P1 — Calendar cache not cleared on sign-out** (all three auditors) — Fixed by importing `clearCalendarCache` in `firebaseAuth.ts` and calling it at the top of **both** `signInWithGoogle` and `signOutGoogle`. The import is intentionally circular (firebaseAuth ↔ googleCalendar), but works because neither module touches the other's exports at init time — only inside function bodies, which ES module live bindings resolve lazily.
- **P2 — UTC timezone on API query window** (all three auditors) — Fixed by replacing hardcoded `T00:00:00Z` / `T23:59:59Z` with `toLocalISOStart(dateStr)` / `toLocalISOEnd(dateStr)` helpers that construct local `Date` instances and convert via `.toISOString()`. Users in non-UTC zones now get the correct window for their local day boundaries.
- **P2 — 401 handler unconditionally popped the consent sheet** (Codex + Claude) — Split into two branches: `401` calls `GoogleSignin.clearCachedAccessToken(token)` + `getAccessToken()` + retry; `403` calls `requestCalendarScope()` + retry. A routine hourly token expiry no longer shows a confusing "Choose account" sheet.
- **P2 — CalendarScreen re-loaded all local data on every month navigation** (Claude + Gemini) — Fixed by reverting the `useFocusEffect` deps back to `[]` and removing the Google fetch from inside it. Google fetch now lives only in the dedicated `useEffect([currentMonth, authUser])`. Month navigation no longer re-reads alarms/reminders/notes/voiceMemos/settings from disk.
- **P2 — Auth hydration race on cold start** (Claude) — Fixed by adding an `onAuthStateChanged` subscription to both HomeScreen and CalendarScreen (previously only useSettings subscribed). Cold-start `getCurrentUser()` can return null before Firebase hydrates from persistence; the subscription fires with the real user shortly after, which drives a second fetch via `useEffect([authUser])`. Single fetch path per screen — no ref needed for dedup.
- **P2 — Duplicate React keys for multi-day Google events** (Claude) — Fixed by extending `ListRow` event rows with `dateStr` and updating `rowKeyExtractor` to emit `${dateStr}-googleCal-${id}` for googleCal items. A 3-day all-day event in a week/month view no longer collides with itself across dates.
- **P2 — Dead `calendarColor` field on `GoogleCalendarEvent`** (Claude) — Removed from the type, `parseItems`, and all test fixtures. Rendering uses `colors.sectionCalendar` directly from the theme, so the field was carrying no signal.

### New/Modified Files in Session 31

| File | Status | Purpose |
|------|--------|---------|
| `src/services/gameTrialStorage.ts` | NEW | Per-game trial counter backed by `kv_store['game_trial_{game}']`. Exports `TrialGame` type (`'chess' \| 'checkers' \| 'trivia' \| 'sudoku' \| 'memoryMatch'`), `TRIAL_LIMIT = 3`, `getTrialCount`, `incrementTrial`, `canPlayGame` (Pro short-circuits to true), `getTrialRemaining` (Pro returns `Infinity`), `resetTrials`. Synchronous (kv is sync). Pro check inlined via `isProUser()` so the trial system is always self-aware about the entitlement state. |
| `src/services/foundingStatus.ts` | NEW | First-launch migration that grants Pro to existing users + records a founding badge. `runFoundingMigration()` runs once on app startup (idempotent via `kv_store['founding_check_done']` flag). For any user with `kvGet('onboardingComplete') === 'true'` (strict equality — corrupted values like `'false'` / `'yes'` don't qualify): always writes `founding_status` JSON `{ isFoundingUser: true, grantedAt: ISO }`, and additionally calls `setProStatus({ purchased: true, productId: 'founding_user', purchaseDate: ISO })` if the user isn't already Pro. Exports `isFoundingUser()` + `getFoundingDetails()` with `safeParse` + `isValidFoundingDetails` type guard. |
| `src/services/calendarSync.ts` | NEW | Pro-gated Google Calendar **write-back** sync. Creates / reuses a dedicated "Don't Forget Why" calendar in the user's Google account via the REST API, pushes active alarms + reminders as events, persists a `gcal_sync_map` (item id → event id) to update existing events on re-sync rather than duplicating. Recurring alarms emit `RRULE:FREQ=WEEKLY;BYDAY=...` with a stable DTSTART derived from `alarm.createdAt` via `stableFirstDate(days, createdAt)` (deterministic for the alarm's lifetime, falls back to `nextOccurrenceDate` for one-time-style alarms). `authedFetch` handles 401 (token refresh via `clearCachedAccessToken` + retry) AND 403 (re-request `calendar` write scope via `requestCalendarWriteScope` + retry). `deleteEvent` checks the response status — 2xx and 404 are success (404 = already gone), anything else throws. `syncItem` only removes the sync-map entry on successful delete; failures log a warning, count an error, and preserve the mapping for idempotent retry. Exports `syncToGoogleCalendar()`, `isSyncEnabled()` / `setSyncEnabled()`, `clearSyncData()` (only clears `gcal_dfw_calendar_id` + `gcal_sync_enabled` — sync map preserved so re-signing the same Google account doesn't dupe events). Throws `'Pro required for calendar sync'` for non-Pro callers. |
| `src/components/ProGate.tsx` | REWRITTEN | Was a `{ feature, children }` pass-through wrapper (Session 29). Now a presentational paywall **modal** that accepts entitlement values via props: `{ visible, onClose, game?, isPro, loading, error, productPrice, onPurchase, onRestore }`. Zero internal `useEntitlement()` instances — parent screens own exactly one. Two header pools selected via `useState(() => ...)` based on whether `game` is set: `GAME_HEADERS` (3 lines about free rounds being up) vs `GENERIC_HEADERS` (3 lines about Pro membership) — keeps copy from referencing "free rounds" when launched from the theme picker. Accent color follows context (`colors.sectionGames` for game flow, `colors.accent` for theme/calendar flow). Auto-clear error after 3s via `errorTimerRef`. `wasProRef` effect plays `gameWin` sound + auto-closes once `isPro` flips true (sound only when `game` is set, so the theme/settings flow doesn't fire a game-win SFX on a successful theme unlock). Outer `TouchableWithoutFeedback` has no accessibility role/label (was incorrectly announcing the entire modal as one button); only the inner close-X carries the button role. Loading overlay covers the card while a purchase is in flight. |
| `src/screens/GamesScreen.tsx` | MODIFIED | Owns one `useEntitlement()` instance. Local `isPro` state for the trial-badge UI (refreshed via `useFocusEffect` and `handleGateClose` from `isProUser()`). New `GATED_GAMES = ['chess','checkers','trivia','sudoku','memoryMatch']` and `gateGame` state for which game triggered the paywall. `handleGamePress` checks `canPlayGame(game)` first and opens ProGate if false; otherwise calls `incrementTrial(game)` **only when `!isPro`** so Pro users don't accumulate meaningless kv writes. `renderTrialIndicator(game)` shows "PRO" badge for Pro users, "{n} free rounds left" for non-Pro with trials remaining, "Pro required" once exhausted. ProGate render is conditionally mounted (`{proGateVisible && <ProGate.../>}`) and receives the parent's entitlement values via props. |
| `src/screens/SettingsScreen.tsx` | MODIFIED | Owns one `useEntitlement()` instance (already had it for the inline DFW Pro card; now also passed to ProGate via props). New "DFW Pro" section header at the top of the screen with three render variants: Founding User card (badge + "Founding User" copy), Pro card (purchase date + PRO badge), or free card (Unlock Pro `$1.99` button + Restore Purchase row + inline `purchaseError`). Theme picker modal renders `LockIcon` over Vivid/Sunset/Ruby for non-Pro users; tapping a locked theme closes the picker and opens ProGate. `PRO_THEMES = new Set(['vivid','sunset','ruby'])`. Restore Purchases row in the Support section gained: `restoreLoading` + `restoreResult` state, `ActivityIndicator` while loading, success/failure result text below the row (`colors.success` for "Purchase restored!", `colors.textTertiary` for "No purchases found", auto-clears after 3s via `restoreResultTimerRef`), row disabled while loading. `purchaseError` rendered in Support section so it's visible to Pro and founding users — not just the free DFW Pro card. ProGate render conditionally mounted (`{proGateVisible && <ProGate.../>}`) so a hidden modal doesn't keep a stale entitlement instance alive. |
| `src/hooks/useSettings.ts` | MODIFIED | Added Google Calendar **write-back** state + handlers: `calSyncEnabled` / `isSyncing` / `syncResult` / `syncError`. `handleCalSyncToggle` flips the kv flag and triggers an immediate `runSync()` if enabling. `handleSyncNow` is a manual trigger. `runSync()` clears prior result/error timeout via `syncTimeoutRef` (typed `useRef<ReturnType<typeof setTimeout>>`), calls `syncToGoogleCalendar()`, surfaces success result and errors with auto-clear after 4s, demotes `calSyncEnabled` back to false on permission-denied errors. Unmount cleanup effect clears `syncTimeoutRef`. `onAuthStateChanged` listener now also re-reads `isSyncEnabled()` so signing out resets the toggle in real time. |
| `src/components/Icons.tsx` | MODIFIED | Added `LockIcon` — chrome lock glyph used to render over locked Pro themes in the SettingsScreen theme picker. |
| `src/services/firebaseAuth.ts` | MODIFIED | Circular dependency `firebaseAuth ↔ calendarSync` broken — `clearSyncData` is no longer imported from `calendarSync`. `signOutGoogle` now uses direct `kvRemove('gcal_dfw_calendar_id')` + `kvRemove('gcal_sync_enabled')` calls instead. Sync map (`gcal_sync_map`) is **intentionally preserved** on sign-out so re-signing the same Google account doesn't recreate duplicate events for items that were already synced. Added `requestCalendarWriteScope()` (`https://www.googleapis.com/auth/calendar`) for the write surface — separate from the read-only `requestCalendarScope()` used by `googleCalendar.ts`. |
| `App.tsx` | MODIFIED | `runFoundingMigration()` moved out of the DB migration try/catch into its own guarded block. Called on **both** the success path (after `migrateFromAsyncStorage` resolves and `setDbReady(true)`) AND the recovery path (after the kv `_migrated` fallback that lets a partially-migrated DB still boot). A throw from founding migration logs a warning and never trips the "Something went wrong" error screen. |
| `__tests__/gameTrialStorage.test.ts` | NEW | Coverage for the trial counter: zero-state, increment, `canPlayGame` false at limit, `canPlayGame` true for Pro regardless of count, `getTrialRemaining` returns `Infinity` for Pro, `resetTrials` clears all five game keys. `Map`-backed kv mock + `isProUser` jest mock. |
| `__tests__/foundingStatus.test.ts` | NEW | Coverage for the founding migration: fresh install (no `onboardingComplete`) doesn't grant or write founding_status, existing user with `'true'` grants Pro + writes founding badge, **already-Pro user with `'true'` skips `setProStatus` but still records the founding badge** (P1.3 fix), strict equality rejects `'false'` and `'yes'`, idempotent on second run, skip immediately when `founding_check_done` already set, `isFoundingUser` / `getFoundingDetails` shape validation including malformed JSON and missing fields. |
| `__tests__/calendarSync.test.ts` | NEW | Coverage for the write-back sync service. Suites: `isSyncEnabled` / `setSyncEnabled` round-trip, `clearSyncData` removes calendar id + enabled flag but **preserves the sync map**, preconditions (Pro-required throw, write-scope-denied throw), calendar discovery (creates new, reuses existing by summary, verifies stored id, falls through on stored 404), syncing items (POST→PUT pattern, sync map persistence, alarm/reminder body shape), DELETE error handling (500 preserves mapping + counts error, 404 removes mapping + no error, P1.2 fix), 401 retry with token refresh, 403 retry with `requestCalendarWriteScope`, 403 give-up when scope denied, recurring DTSTART stability across re-syncs. |
| `app.json` | MODIFIED | Bumped `expo.version` `1.22.0 → 1.23.0` and `expo.android.versionCode` `40 → 41`. |
| `src/services/cloudStockfish.ts` | NEW | Lichess cloud eval API client. `getCloudMove(fen, pickRange)` queries `https://lichess.org/api/cloud-eval?fen=&multiPv=5` with a 5-second `AbortController` timeout, validates the response shape (`pvs` non-empty array of `{ moves, cp?, mate? }`), clamps `pickRange` to the available PV count, picks one rank uniformly at random in the clamped band, and converts the UCI prefix of that PV to SAN via a fresh `new Chess(fen)`. Returns `null` on **any** failure — offline, 404 (position not in cloud db), abort, malformed JSON, illegal UCI — so the caller can cleanly fall through to the local engine. Also exports `uciToSan(game, uci)` which mutates + undoes the move on the caller's game to get the SAN (used by the shared Chess instance in tests). `checkConnectivity()` gate short-circuits the fetch when offline. |
| `__tests__/cloudStockfish.test.ts` | NEW | 17 Jest tests covering `uciToSan` (starting position e2e4, knight moves, promotion, kingside castling, illegal / malformed UCI, no position mutation) and `getCloudMove` (offline → null, correct URL + `multiPv=5` + encoded FEN, `pickRange {0,0}` always returns best, `pickRange {2,4}` min/max bounds via `Math.random` spy, clamping when fewer PVs returned, HTTP 404, AbortError timeout, empty/missing `pvs`, malformed JSON, illegal first-PV move). Mocks `global.fetch` + `checkConnectivity`. |
| `src/data/dfw_yearly_riddles.ts` | NEW | 366-day riddle bank. `RiddleDifficulty` (`'easy' \| 'medium' \| 'hard'`), `DailyRiddleEntry` (`id, dayOfYear, category, difficulty, question, answer`), `RIDDLE_CATEGORIES` (12 categories: Home & Objects, Nature & Weather, Food & Kitchen, Animals, Body & Health, School & Work, Travel & Places, Technology, Science & Space, Time & Calendar, Fantasy & Fun, Logic & Wordplay), and `YEARLY_RIDDLES: DailyRiddleEntry[]` — one entry per day-of-year, 366 total (covers leap years). Each entry's `dayOfYear` (1-indexed) is the canonical lookup key; no shuffle, no randomness, no device-specific computation beyond "what day of the year is today?". |
| `src/data/riddles.ts` | MODIFIED | Re-exports `YEARLY_RIDDLES` and `DailyRiddleEntry` from `./dfw_yearly_riddles`. Adds `getDailyRiddleForDate(dateStr)` — parses the `YYYY-MM-DD` date string as `new Date(dateStr + 'T12:00:00Z')` (noon UTC, avoids DST fencepost issues on the caller's device), computes `dayOfYear` via UTC arithmetic (`Date.UTC(year, 0, 1)` → subtraction → `Math.floor(ms / 86400000) + 1`), and returns the matching `YEARLY_RIDDLES` entry. Every device in every timezone resolves the same `dateStr` to the same entry. Old `getDailyRiddleIndex(dateStr)` kept as `@deprecated` pointing at `getDailyRiddleForDate`. Old `RIDDLES` array (145 Session 22 riddles) kept for backward compatibility with `seenRiddleIds` entries that may still reference the old id space, but it is no longer the daily-riddle source. |
| `src/services/chessAI.ts` | MODIFIED | Difficulty levels rebalanced + renamed. `DifficultyLevel` interface gained a new field `cloudPickRange: { minRank: number; maxRank: number }` — a closed band `[minRank, maxRank]` into the top-5 Stockfish PVs returned by the Lichess cloud eval API. `DIFFICULTY_LEVELS` now: **Easy** (minDepth 1 / maxDepth 2 / 300ms / randomness 0.4 / cloudPickRange 2-4), **Intermediate** (1/3/500ms/0.15/1-3), **Hard** (2/4/1000ms/0.05/0-2), **Expert** (3/5/2000ms/0/0-1), **Master** (3/6/3000ms/0/0-0). Local minimax, opening book, quiescence, TT, killers, null-move pruning all unchanged — the cloud path sits in front of them as the primary move source (see `useChess` flow). |
| `src/hooks/useChess.ts` | MODIFIED | AI move pipeline now **opening book → cloud Stockfish → local minimax**. `triggerAIMove`'s inner setTimeout: calls `getBookMove(c2)` first (synchronous, curated 1-3 move variety for known positions). If no book move, awaits `getCloudMove(c2.fen(), level.cloudPickRange)` — Lichess returns a SAN from the rank band that matches the difficulty. After the await, re-checks `sessionIdRef.current === currentSession` and `gameRef.current === c2 && !c2.isGameOver()` so a resign/newGame/unmount during the cloud request can't apply a stale move. If the cloud returns null (offline, not-in-db, timeout, malformed), falls through to `getAIMove(c2, level)` which runs the local minimax engine. Also adds a defensive `Math.min(Math.max(saved.difficulty, 0), 4)` clamp on the restored-game path (`loadChessGame`) so a saved game with a stale out-of-range difficulty index (e.g. a legacy Cloud-level=5 row) can't crash the DIFFICULTY_LEVELS lookup; `teachingEligible` is derived from the clamped value. |
| `src/services/chessStorage.ts` | MODIFIED | `rowToGame` clamps `row.difficulty` to `[0, 4]` via `Math.min(Math.max(row.difficulty ?? 1, 0), 4)` before returning the `SavedChessGame`. Second line of defense against legacy rows from a build that shipped a 6th difficulty level — such games now resolve to Master instead of producing blank labels or crashing. |
| `src/screens/ChessScreen.tsx` | MODIFIED | `DIFFICULTY_LABELS` updated to match the new engine labels (`['Easy', 'Intermediate', 'Hard', 'Expert', 'Master']`). Default selected difficulty on pre-game card kept at index 2 (Hard). Pre-game pills, game header, and game-over overlay all read the same labels. |
| `src/screens/TriviaScreen.tsx` | MODIFIED | Online-first flow: `onlineMode` defaults to `true`, flipped to `false` on mount only if `checkOnlineAvailable()` reports the device is offline. `startRound` tries `fetchOnlineQuestions(category, QUESTIONS_PER_ROUND, difficultyFilter)` first when `onlineMode` is on AND the category has an OpenTDB mapping (food + kids remain offline-only — OpenTDB has no matching category). If the online fetch returns a full round, the questions are used directly (not written back to `seenQuestionIds` — online rounds don't contribute to the "seen" cycle). Otherwise falls through to `selectQuestions` against the offline bank with the existing seen-id cycling + "all seen, reshuffling" toast. `isOnlineRound` state drives the result-screen copy + skips `addSeenQuestionIds` on finish so online rounds don't pollute the offline seen set. |
| `src/services/triviaAI.ts` | NEW | OpenTDB API client. `fetchOnlineQuestions(category, count, difficulty)` maps DFW's internal `TriviaCategory` to OpenTDB category ids, maps difficulty filter to the OpenTDB `difficulty` query param, fetches via `https://opentdb.com/api.php?amount=&category=&difficulty=&type=`, validates the response code (`0` = success, anything else returns `null`), decodes HTML entities in question + answer strings, synthesizes `id`s as `online_${timestamp}_${idx}` so they can be tracked within a single round without colliding with the offline id space. `checkOnlineAvailable()` wraps a HEAD request to the OpenTDB root with a short timeout — used by TriviaScreen's mount-time check to short-circuit the online path when obviously offline. Every failure (network error, non-2xx, `response_code != 0`, parse error) returns `null` so the caller falls through to the offline bank. |
| `src/hooks/useDailyRiddle.ts` | MODIFIED | Today's riddle seeded from `getDailyRiddleForDate(getTodayString())` — a direct, deterministic lookup into `YEARLY_RIDDLES`. Removed the `fetchMultipleOnlineRiddles(1)` override that would replace the daily card with an online riddle on focus (Session 22 behavior). Removed the day-scoped `daily_riddle_{todayStr}` cache — a deterministic function of `dateStr` has nothing to cache. `useFocusEffect` now reloads stats and also re-calls `getDailyRiddleForDate(todayStr)` on focus so a midnight rollover while the screen is mounted picks up the new day's riddle. Simplified the `seenRiddleIds` dedupe in `handleAnswer` — no more `id >= 1_000_000` filter because online-sourced fake ids are gone from the daily flow. The Bonus Riddles tab still uses `fetchMultipleOnlineRiddles(5)` to pull fresh online riddles, but that path is now gated behind the Pro check on the screen side. |
| `src/screens/DailyRiddleScreen.tsx` | MODIFIED | `DailyRiddleEntry.category` is now a plain display string (e.g. "Home & Objects") — the screen reads `dailyRiddle.category` directly in the badge instead of looking it up via the old `CATEGORY_LABELS['memory' \| 'classic' \| ...]` map. `RIDDLE_CATEGORY_IMAGES` map deleted — the old keys (memory/classic/wordplay/logic/quick) no longer match the 12 new categories, and the category badge now renders as a plain pill without an icon. Imports changed from `{ RIDDLES, CATEGORY_LABELS }` to `{ YEARLY_RIDDLES }`. The "Seen: X/Y" counter denominator uses `YEARLY_RIDDLES.length` (366). Bonus Riddles tab (the former offline-bank browse) is now Pro-gated — tapping it calls `isProUser()` and opens the screen-owned `ProGate` modal if false. |

### Session 31 Chess AI Redesign — Cloud-First Pipeline

The Session 16/17 local engine still ships in full (opening book + minimax + quiescence + TT + killers + null-move + tapered eval), but the cloud path now sits in front of it as the primary move source for all five difficulty levels.

**Priority order** (per move): **opening book → Lichess cloud eval → local minimax**.

1. **Opening book first.** `getBookMove(c2)` is synchronous and runs before any network call. Positions in the curated 104-entry book (first 6-10 plies of Italian, Ruy Lopez, Queen's Gambit, London, English, Sicilian, French, Caro-Kann, KID, Slav theory) return instantly with a randomized pick from the 1-3 equivalent moves per position — preserves opening variety across the five levels and gives the AI an instant first move without any search or network latency.
2. **Lichess cloud eval next.** For non-book positions, `getCloudMove(fen, level.cloudPickRange)` fetches the top-5 Stockfish PVs from `https://lichess.org/api/cloud-eval?multiPv=5` with a 5-second abort timeout. Each difficulty level has its own `cloudPickRange` band into the sorted PVs — Easy picks from ranks 2-4 (3rd-5th best), Intermediate 1-3, Hard 0-2, Expert 0-1, Master 0 (always best). The picked rank is chosen uniformly at random within the band via `Math.floor(Math.random() * span)`. A single rank → a single UCI move → SAN via `uciToSan(tempGame, uci)`. Difficulty is **move quality**, not search depth — every cloud move is Stockfish-strong, just ranked differently.
3. **Local minimax fallback.** If `getCloudMove` returns null (offline, 404 "position not in cloud database", abort, malformed response, illegal UCI), `useChess.triggerAIMove` falls through to `getAIMove(c2, level)` which runs the local iterative-deepening minimax with the level's `minDepth`/`maxDepth`/`timeLimitMs`/`randomness`. This is the Session 16/17 engine untouched — offline users get the exact same experience as before.

**Async gap handling.** The cloud fetch is the only async step in the AI move pipeline. After `await getCloudMove(...)`, `useChess.triggerAIMove` re-checks **both** `sessionIdRef.current === currentSession` (guards against resign / newGame / unmount / user starting a different game) AND `gameRef.current === c2 && !c2.isGameOver()` (guards against the game instance being swapped). If either check fails, the state cleanup bails early — no stale AI move applied.

**Free for everyone.** The Lichess cloud eval endpoint is a public API — no auth, no rate limits per user. Cloud Stockfish is **part of the free tier**, not a Pro upgrade. Free tier still works offline via the local engine; Pro tier's benefits are Unlimited Brain Games (trial-free), Premium Themes, and Google Calendar Write-Back, not AI quality.

### Session 31 Online-First Trivia

`TriviaScreen.onlineMode` defaults to **true** and is flipped to false on mount only if `checkOnlineAvailable()` reports the device is offline (HEAD request to OpenTDB with a short timeout). `startRound` tries the online fetch first whenever `onlineMode` is on and the category has an OpenTDB mapping; food + kids are the only offline-only categories (OpenTDB has no matching category for either).

**Online round contract.** `fetchOnlineQuestions(category, QUESTIONS_PER_ROUND, difficultyFilter)` returns a full round's worth of OpenTDB questions with HTML entities decoded and synthetic ids in the `online_{timestamp}_{idx}` space. Questions are used directly for the round without writing to `seenQuestionIds` — online questions don't contribute to the "seen all offline questions, reshuffling" cycle. `isOnlineRound` state drives the results screen copy and skips the `addSeenQuestionIds` persistence on finish.

**Fallback.** Any online failure (network error, offline after the initial check, OpenTDB rate limit, parse error, `response_code != 0`, missing category) returns `null`, and `startRound` falls through to the existing `selectQuestions` offline bank path with its seen-id cycling. Users never see an error — the worst case is an offline round from the bundled bank.

### Session 31 366-Riddle Daily Bank

Session 22's random-shuffle daily riddle pipeline has been replaced with a pre-assigned 366-day bank.

- **`src/data/dfw_yearly_riddles.ts`** is a manually-authored `DailyRiddleEntry[]` with one entry per day-of-year (1-indexed), 366 entries total. Each entry carries `id`, `dayOfYear`, `category` (one of 12 plain-English strings like "Home & Objects"), `difficulty`, `question`, `answer`. No shuffle, no seed, no randomness — "today's riddle" is literally a lookup by day-of-year.
- **`getDailyRiddleForDate(dateStr)`** (in `riddles.ts`) parses the date as `new Date(dateStr + 'T12:00:00Z')` and computes `dayOfYear` via `Date.UTC(year, 0, 1)` → subtraction → `Math.floor(ms / 86400000) + 1`. Noon-UTC anchor eliminates DST edge cases on the caller's device; UTC arithmetic eliminates cross-timezone divergence that plagued the Session 22 seeded-shuffle implementation. Every device in every timezone resolves the same `YYYY-MM-DD` to the same `YEARLY_RIDDLES` entry.
- **Daily card is strictly offline.** `useDailyRiddle` no longer calls `fetchMultipleOnlineRiddles(1)` to override the daily card — the online fetch that used to run in `useFocusEffect` has been deleted, along with the `daily_riddle_{todayStr}` kv cache that protected it from re-fetching across app opens (deterministic lookup = no cache needed).
- **Bonus Riddles tab** (the former "browse offline bank" mode) is now Pro-gated. Non-Pro users see the tab with a lock badge; tapping it opens ProGate. Pro users tap through to a grid that fetches fresh riddles from the online riddle API via `fetchMultipleOnlineRiddles(5)` — the online riddle fetch that used to silently replace the daily card has been repurposed as the Pro upsell surface.

### Session 31 P7 Pro Tier — Architecture Notes

**Single hook instance per screen.** ProGate originally owned its own `useEntitlement()` and was rendered unconditionally on SettingsScreen, which already owned one. Two hook instances meant two `useIAP()` registrations and `finishTransaction()` would have fired twice on a successful purchase. Fixed in two complementary ways: (a) ProGate is now mounted conditionally (`{proGateVisible && <ProGate.../>}`) so it doesn't even instantiate when hidden, and (b) ProGate was rewritten to accept entitlement values as props instead of calling `useEntitlement()` itself. Each parent (SettingsScreen, GamesScreen) calls the hook exactly once and passes the values down.

**Trial gate at the GamesScreen level, not per-game-screen.** The check (`canPlayGame(game)`) lives in `GamesScreen.handleGamePress` — one branch point that intercepts navigation to any of the five gated games. Per-game-screen checks would have meant five copies of the same gate logic (and five places to forget to wire it). Increment also lives there, gated on `!isPro` so Pro users don't accumulate meaningless kv writes.

**Founding migration in its own try/catch in `App.tsx`.** The first cut had `runFoundingMigration()` inside the same try/catch that wraps `migrateFromAsyncStorage()`. A throw from founding migration would have been caught and triggered the "Something went wrong" error screen — losing the user to a recoverable migration that couldn't actually recover (the DB itself was fine). The fix isolates founding migration in its own guarded block, called on both the success path and the kv `_migrated` recovery path. A founding migration throw is now a warning, not a crash.

**Sync map preserved on sign-out (intentional).** `clearSyncData()` was originally going to clear all three keys (`gcal_dfw_calendar_id`, `gcal_sync_map`, `gcal_sync_enabled`) on sign-out. Audit caught the dupe risk: a user who signs out, signs back in to the **same** Google account, and triggers a sync would create a second copy of every alarm/reminder event because the sync map was wiped. Fix: preserve `gcal_sync_map`, only clear the calendar id and enabled flag. Re-signing the same account picks up the existing mapping and PUTs the same event ids.

**Stable recurring DTSTART derived from `alarm.createdAt`.** The first cut computed DTSTART from `nextOccurrenceDate()`, which returns the next matching weekday on or after **today**. Re-syncing on a later day moved DTSTART forward, and Google Calendar dropped past occurrences from the recurrence series. The fix derives DTSTART from `alarm.createdAt` via `stableFirstDate(days, createdAt)` — the first matching weekday on or after the alarm's creation date, deterministic for the alarm's lifetime regardless of when the sync runs.

**Calendar write scope requested on enable, not on configure.** Read scope (`calendar.readonly`) is requested up front in `GoogleSignin.configure()` from Session 30. The write scope (`calendar`) is only requested when the user enables sync — principle of least privilege. The 403 branch in `authedFetch` re-requests the write scope if a sync hits a 403 mid-flight (e.g., user revoked write access between syncs), then retries the original request once with the refreshed token.

**Calendar sync is manual "Sync Now" v1.** No auto-sync, no background scheduling. The user taps Sync Now in Settings, the sync runs, success/error renders inline. Auto-sync (push on alarm save, push on schedule, etc.) is deferred to a future session — the v1 manual flow validates the data shape and the dupe-prevention sync map before committing to background machinery.

### Two-Tier Icon System (established Session 20, expanded Session 24)

The app has two distinct visual languages for icons:

1. **Chrome icons** (`assets/app-icons/`) — silver/brushed metallic WebP, 512×512, transparent bg. Clean utility language for productivity surfaces (alarms, reminders, notes, calendar, settings). No faces, no personality. Examples: `alarm-clock`, `bell`, `notepad`, `plus`, `close-x`, `back-arrow`.
2. **Game character icons** (`assets/icons/`) — anthropomorphic full-color WebP with weathered expressions. Gameplay surfaces only (Chess, Checkers, Sudoku, Trivia, Memory Match, Daily Riddle). Examples: `game-play`, `icon-smiley`, `icon-hourglass`, 22 Memory Guy Match card images, 12 chess piece characters, 10 trivia category icons, 9 rank tier images.

**Navigation mirror:** non-game screens use `BackButton`/`HomeButton` (chrome). Game screens were intended to use `GameNavButtons` (character art via `icon-game-back`/`icon-game-home`) to keep the game/app boundary visually clean — but the component is currently stranded (see Session 24 files above).

### Data Layer Safety (Session 24)

- **`safeParse<T>(json, fallback): T`** — wraps `JSON.parse` with try/catch; returns `fallback` on SyntaxError or when parse result is `null`/`undefined`. Replaces the pattern `JSON.parse(raw) ?? fallback` which would still crash on malformed JSON
- **`safeParseArray<T>(json): T[]`** — same contract, returns `[]` on any failure. Used in the 13 storage services for list-valued kv entries (`alarms_list`, `notes_list`, `reminders_list`, etc.)
- **`withLock(key, fn): Promise<T>`** — per-key async mutex. Each key gets its own promise chain; subsequent calls queue behind the current in-flight operation. Use case: two simultaneous note-rename operations on the same note id should serialize, not race. Usage: `await withLock('note:' + id, async () => { ... })`
- **Restore mutex** — `restoreInProgress` boolean flag set at start of `restoreFromBackup()`, cleared in `finally`. Prevents concurrent restore attempts from corrupting the transactional rollback state
- **Migration safety** — per-row try/catch in data migrations. A single malformed row logs and skips rather than aborting the entire migration
- **`autoExportBackup` never throws** — background backup operations swallow and log errors. A stale SAF URI or permission drop can't crash the app

### Navigation Guards (Session 24)

- **`beforeRemove` guards** on `CreateAlarmScreen` and `CreateReminderScreen`. When the form is dirty and the user hits back, a confirmation dialog asks "Discard changes?". The `savedRef` ref is flipped to `true` before calling `navigation.goBack()` after a successful save, so the normal save-then-navigate path bypasses the guard
- **`isDirty` comparison** uses `JSON.stringify(currentForm) !== JSON.stringify(initialForm)` instead of a simple boolean flag. A flag gets out of sync when the user edits then reverts a field; the stringify comparison catches that the form is back to clean state
- **`VoiceRecordScreen` confirmation** — recording in progress triggers a confirm-before-leave prompt
- **Game screens intercept hardware back** — Chess/Checkers/Sudoku/Trivia/MemoryMatch/DailyRiddle listen for hardware back and bounce the user back to the pre-game menu phase instead of exiting the screen
- **`HomeButton.popToTop()`** — ensures the `beforeRemove` guards fire when the user taps Home from a modal/nested route (vs. `navigate('Home')` which would skip them)
- **Deep-link existence checks** — deep links from widgets/notifications validate the target entity still exists before routing. A deleted note's widget tile no longer opens a blank editor

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
- **Session 26 recording flow rewrite:** VoiceRecordScreen creates the memo + first clip directly via `saveAndNavigate`, then navigates to detail with `{ memoId }`. Eliminated the `tempUri`/`isNewRecording` handoff path entirely. Two modes: new memo (creates memo row + clip + photos atomically with rollback on clip insert failure via `permanentlyDeleteVoiceMemo`) and add-clip mode (`route.params.addToMemoId` — appends clip + photos to existing memo). VoiceRecordScreen has no post-recording UI — only idle and recording states
- `beforeRemove` navigation listener intercepts hardware back, gesture back, and custom back button. During recording: stops, discards temp file, dispatches original action. Uses `navigatedRef` to allow programmatic `replace` navigation through
- **`capturedPhotosRef` (Session 26):** mirror ref kept in sync with `capturedPhotos` state via useEffect, so the AppState background handler's `saveAndNavigate` closure can read fresh photo URIs instead of the stale captured-at-mount value

### Voice Memo Clips (Session 26)
- **Memos as containers:** A voice memo is now a container holding zero or more `VoiceClip` rows. Legacy `voice_memos.uri`/`duration` columns kept for backward compat (set empty/0 for new memos), all audio data lives in `voice_clips`
- **`voice_clips` table:** `id TEXT PK, memoId TEXT FK→voice_memos(id) ON DELETE CASCADE, uri TEXT, duration INTEGER, position INTEGER, label TEXT NULL, createdAt TEXT`
- **`voiceClipStorage.ts`:** `getClipsForMemo(memoId)` (ORDER BY position), `getClipSummaries(memoIds)` (batch — clipCount + totalDuration per memo for the list screen), `addClip(clip)`, `deleteClip(id)` (also deletes the clip's audio file), `updateClipLabel(id, label)`, `getNextClipPosition(memoId)` (max+1), `deleteAllClipsForMemo(memoId)` (cascade)
- **Legacy migration:** `_initSchema` scans `voice_memos` rows with non-empty `uri`, creates a corresponding `voice_clips` row at position 0, then clears `uri`/`duration` on the memo. Idempotent — checks for existing clips before inserting
- **Clip labels:** `null` displays as formatted `createdAt` timestamp ("Apr 11, 4:18 PM"). Tappable in edit mode to rename via inline TextInput. Empty submission or matching the formatted-default reverts to `null`
- **Playback modes:** Stop (selected clip plays once), Play All (auto-advances to next clip on `didJustFinish`), Repeat (loops current). Persisted globally in `kv_store` under `clipPlaybackMode`. Toggle pills below the playback controls in detail screen

### Voice Memo Photos (Session 26)
- **`voice_memos.images TEXT NOT NULL DEFAULT '[]'`:** JSON array of file URIs. Migration in `_initSchema` checks `PRAGMA table_info(voice_memos)` for the column and `ALTER TABLE` adds it if missing
- **Storage:** `voice-memo-images/` directory under `Paths.document`. Filename: `${memoId}_${Date.now()}_${shortId}.{jpg|png}`
- **`voiceMemoImageStorage.ts`:** `saveVoiceMemoImage(memoId, sourceUri)` (copy from camera/picker temp), `deleteVoiceMemoImage(uri)`, `deleteAllVoiceMemoImages(uris[])`. Simpler than `noteImageStorage.ts` — no companion JSON, no drawing support
- **Cleanup:** `permanentlyDeleteVoiceMemo` reads images from the row before delete and calls `deleteAllVoiceMemoImages` so the files are removed alongside the audio + DB row
- **Backup:** `voice-memo-images` added to `MEDIA_FOLDERS` in `backupRestore.ts` so the folder is zipped/restored. `BackupMeta.contents.voiceMemoImages` count added to the manifest
- **JSON validation:** `rowToMemo` parses with try/catch AND `Array.isArray` guard so a malformed `images` cell can't crash callers — falls back to `[]`
- **5-photo cap:** enforced in both VoiceRecordScreen `takePhoto` (counts captured + existing memo images in add-clip mode) and VoiceMemoDetailScreen `handleTakePhoto`/`handlePickImage`. UI shows toast on overflow

### VoiceMemoDetailScreen — View/Edit Mode (Session 13 redesign + Session 26 updates)
- Accepts `{ memoId: string }` only (Session 26: `{ tempUri }` path removed)
- `isViewMode` state: defaults true; users tap the header edit-circle to enter edit mode
- **View mode:** read-only Text for title/note, edit circle icon (silver pencil) in headerRight next to trash. Tap → enters edit mode
- **Edit mode:** TextInput fields with bgUri-aware placeholder colors, save circle icon (silver floppy disk) in headerRight. Save returns to view mode
- Header: headerLeft (Back + Home), headerCenter (empty flex spacer), headerRight (edit-or-save circle + trash circle with red border)
- `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating away
- `useFocusEffect` (Session 26 fix): reloads BOTH the memo and its clips on focus, not just clips. Without the memo reload, photos saved during the add-clip flow could be overwritten by stale `memo.images` state on the next photo edit
- **Photos UI:** "PHOTOS" strip between title/note and the Clips header, 80×80 thumbnails with rounded corners. Tap opens `ImageLightbox`. Edit mode shows red X delete badges and a camera + gallery 40×40 button row below the strip
- `beforeRemove` navigation listener: existing with unsaved changes get "Unsaved changes" alert with Cancel/Discard/Save & Exit. `exitingRef` prevents re-triggering on intentional exits

### Playback
- **VoiceMemoDetailScreen:** seekable progress bar (44px touch target, 6px visual bar), back/forward 5s, `useFocusEffect` cleanup pauses on screen blur. `Number.isFinite` validation on all seek values with try/catch on `seekTo`. View-based play/pause icons (CSS border triangle for play, dual bars for pause). Play button color: #4CAF50 (Material Design green)
- **NotepadScreen (inline):** single player instance in `useRef` via `createAudioPlayer` (imperative, not hooks). `addListener('playbackStatusUpdate')` for finish detection. Listener ref (`playerListenerRef`) cleaned up before `player.release()` in `stopPlayback`. Focus cleanup via `useFocusEffect` stops playback when screen loses focus. Stale progress reset: when switching memos, previous memo's progress set to 0 before starting new playback
- **NoteEditorModal (note-attached):** `useAudioPlayer`/`useAudioPlayerStatus` hooks for per-note voice memo playback (legacy — recording removed in Session 27, playback kept for existing notes). Seekable via touch responders. Shared 5-attachment limit (images + legacy voice memos) — raised from 3 in Session 27

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

### Screen → Hook Extraction Pattern (Sessions 15, 22)
Large screens decomposed into thin render shells + state/logic hooks:
- AlarmListScreen → useAlarmList (Session 15)
- NotepadScreen → useNotepad (Session 15)
- ChessScreen → useChess (Session 16)
- CheckersScreen → useCheckers (Session 18)
- SudokuScreen → useSudoku (Session 22)
- TimerScreen → useTimerScreen (Session 22)
- DailyRiddleScreen → useDailyRiddle (Session 22)
- SettingsScreen → useSettings (Session 22, navigation passed as parameter for handleImport)

NoteEditorModal cleanup (Session 22): extracted linkedText.tsx (link detection + rendering), NoteVoiceMemo.tsx (recording controls + playback cards + voiceMemoStyles), ColorPickerModal.tsx (reusable color picker modal).

NoteEditorModal full redesign (Session 27): NoteEditorModal is a thin render shell (~250 lines, down from 1268). All state and logic lives in `useNoteEditor` hook. Sub-components: `NoteEditorTopBar` (view/edit mode top bar), `NoteEditorToolbar` (bottom action bar, edit mode only), `NoteColorPicker` (color picker overlay panel), `NoteImageStrip` (horizontal scrollable image thumbnails). The old dropdown menu (plus button → Colors/Photo Library/Take Photo/Draw/Record) was replaced by the persistent bottom toolbar. Voice recording was removed — legacy playback via `MemoCard` kept for existing notes. Images display inline in view mode but move behind an "Attached" panel (paperclip button) in edit mode. Hardware back button peels panels (attachments → color picker → confirmClose).

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

## 7.5 Tutorial Overlay System (Session 28)

Per-screen first-visit tip carousel. Each wired screen remembers its own dismissal in `kv_store` under `tutorial_dismissed_{screenKey}`. Settings has a "Tutorial Guide" reset row that wipes every dismissal key so all overlays re-appear on next screen visit.

### Hook — `useTutorial(screenKey)` (`src/hooks/useTutorial.ts`)
- Pure logic. No UI imports (no `View`, `Text`, `TouchableOpacity`, no `useTheme`, no `useSafeAreaInsets`). Matches the hook rules from Session 15's decomposition pattern.
- Reads `kvGet('tutorial_dismissed_' + screenKey)` via a **lazy `useState` initializer** — synchronous, no effect round-trip, no one-frame flash between first paint and overlay mount. `kvGet` is synchronous (`expo-sqlite`), so the initializer can read storage inline.
- Returns `{ showTutorial, tips, currentIndex, nextTip, prevTip, dismiss }`. `nextTip` / `prevTip` are stable `useCallback`s. `tips` comes from `TUTORIAL_TIPS[screenKey]` and falls back to `[]` if the key is unknown — unknown keys return `showTutorial=false` silently (no crash, no render).
- `nextTip` increments `currentIndex` with a cap at the last tip (no wrap). `prevTip` decrements with a floor at 0. `dismiss` writes `kvSet('tutorial_dismissed_' + screenKey, 'true')` and flips `showTutorial` to `false`.
- Module also exports `resetAllTutorials()`: iterates `Object.keys(TUTORIAL_TIPS)` and calls `kvRemove('tutorial_dismissed_' + key)` for each. Called by `useSettings.handleResetTutorials` from the "Tutorial Guide" row.

### Component — `TutorialOverlay` (`src/components/TutorialOverlay.tsx`)
- Absolute overlay, `zIndex: 999`, rendered as the last child of each wired screen's outermost `<View>` so it draws above the FlatList/ScrollView content.
- **Structural layout (Session 28 TalkBack fix, iteration 3):** wrapper `<View>` contains the backdrop `TouchableOpacity` and the card `View` as **siblings**, not parent/child. The earlier nested-child approach meant `importantForAccessibility="no-hide-descendants"` on the backdrop also hid the card from TalkBack. Siblings let the backdrop stay hidden from TalkBack while the card remains traversable.
- **Backdrop** `<TouchableOpacity>`: fills the wrapper, `rgba(0,0,0,0.85)` dim, self-closing with `onPress={onDismiss}` and `importantForAccessibility="no-hide-descendants"`. Touch input still works — `no-hide-descendants` only affects the accessibility tree.
- **Card** `<View>`: `colors.card` background, `borderRadius: 16`, `padding: 24`, `width: '85%'`, `maxWidth: 320`. Thin `sectionColor + '40'` full border + 3px `sectionColor` left accent matching the rest of the app's card pattern. `elevation: 4`, shadow offset `{0, 4}`, opacity `0.3`, radius `8`. Has `accessibilityViewIsModal={true}` so TalkBack focus stays within the card; **no** `accessibilityLabel` on the card itself (that collapses title + body + buttons into a single announced element). Card has no onPress — as a sibling of the backdrop, card-area taps don't propagate to the backdrop naturally.
- **Title**: `FONTS.bold` 18pt, `colors.textPrimary`. **Body**: `FONTS.regular` 14pt, `colors.textSecondary`, `lineHeight: 22`.
- **Dot indicators**: only rendered when `tips.length > 1` (single-tip screens get no row). Active dot `width: 24, sectionColor`; inactive dots `width: 8, colors.border`; height 8, `marginHorizontal: 4`. Row has `importantForAccessibility="no"` so TalkBack skips the decorative dots.
- **Nav row**: `Back` (`colors.textTertiary`, hidden on first tip via `navSpacer`) + `Next`/`Got it` (`sectionColor`, `Got it` fires `onDismiss`). `FONTS.semiBold` 15pt, `paddingVertical: 8, paddingHorizontal: 16`. All three buttons fire `hapticLight()`. Buttons carry `accessibilityRole="button"` + `accessibilityLabel`.
- Haptics import lives in `TutorialOverlay.tsx`, **not** `useTutorial.ts` (pure logic hook rule).
- **Audio playback (Session 28):** Uses `createAudioPlayer` from `expo-audio` on the **MEDIA stream** — not routed through the native `AlarmChannelModule` (ALARM stream) because tutorials are user-initiated, not alarm fires. Asset resolution via `Asset.fromModule(require(...)).downloadAsync()` → `localUri` → `createAudioPlayer({ uri })` — same production URI pattern as `voicePlayback.ts`. Player cast to `PlayerWithEvents` from `audioCompat.ts`, stored in a `useRef<PlayerWithEvents | null>`, `volume: 1.0` (system volume controls loudness).
- **Lifecycle:** a single `useEffect` keyed on `[currentIndex, tips, stopClip]` stops the current clip via `stopClip()`, then kicks off an async IIFE that downloads + creates + plays the clip for the current tip. `playerRef.current = player` is assigned **before** `player.play()` so any unmount or tip-change cleanup between assignment and play still finds the player. Effect cleanup flips a `cancelled` flag and calls `stopClip()`. Second `useEffect` subscribes to `AppState.addEventListener('change', ...)` and calls `stopClip()` on any state other than `'active'` (pause on app background). `handleNext` / `handlePrev` call `stopClip()` explicitly before `hapticLight()` so audio stops on user tap, not on the effect-cleanup tick. `handleGotIt` and `handleBackdropPress` also call `stopClip()` before `onDismiss()`.
- **Race protection:** the effect's async IIFE closes over a local `cancelled` flag. After `await asset.downloadAsync()`, the flag is re-checked before `createAudioPlayer` runs. If the effect cleans up mid-download, the async resumes, sees `cancelled = true`, and returns without creating a player — so rapid tip advancement never leaks players or double-plays clips.
- **`stopClip()`**: `useCallback([])` that calls `pause()` then `remove()` on `playerRef.current` (each wrapped in its own try/catch), then nulls the ref. Safe as a no-op when the ref is already null. Audio errors never propagate — a failed `play()`, `pause()`, or `remove()` can't prevent dismissal.

### Data — `src/data/tutorialTips.ts`
- `export interface TutorialTip { title: string; body: string; clipKey?: string }`
- `export const TUTORIAL_TIPS: Record<string, TutorialTip[]>` keyed by screen. Session 28 ships 7 screens:
  - `alarmList` (3 tips)
  - `reminders` (2 tips)
  - `notepad` (3 tips)
  - `voiceMemoList` (3 tips)
  - `calendar` (1 tip)
  - `timers` (2 tips)
  - `games` (1 tip)
- `clipKey` field now wired (Session 28): each of the 15 tips has a `clipKey` matching its filename in `assets/voice/tutorial/` (e.g. `tutorial_alarmList_01`). Empty tips can still set `clipKey: undefined` to skip audio — the overlay's play logic short-circuits on falsy `clipKey`.
- Copy is written in the sarcastic DFW personality voice from day one (matches `snoozeMessages.ts`, `homeBannerQuotes.ts`, `chessRoasts.ts`), not neutral placeholder text — rewriting to voice later would mean rewriting every string.

### Voice clip registry — `src/data/tutorialClips.ts`
- `Record<string, number>` mapping `clipKey` → `require('../../assets/voice/tutorial/...')` module ID. 15 entries, 1-to-1 with the tips.
- Asset files live at `assets/voice/tutorial/tutorial_{screenKey}_{NN}.mp3` (e.g. `tutorial_alarmList_01.mp3`, `tutorial_games_01.mp3`). 15 MP3s total.
- Voice talent: ElevenLabs v3, same voice character as `assets/voice/` fire/snooze/timer clips (male, early 30s, American, tired/sarcastic). Scripts use v3 audio tags for emotional direction: `[sighs]`, `[sarcastic]`, `[deadpan]`, `[annoyed]`, `[tired]`, `[resigned]`, `[exhausted]`, `[matter of fact]`, `[under his breath]`, `[condescending baby talk]`, `[like reading instructions]`, `[like someone who's heard too much]`, `[disturbed]`, `[like being honest for the first time]`, `[catching himself]`.
- Clips are independent from the tip body text — they add extra personality and humor rather than narrating the visible copy verbatim.

### Screen wiring (7 screens)
Each screen imports `useTutorial` + `TutorialOverlay`, calls the hook once at the top of the component, and renders the overlay at the end of the outermost `<View>`:

| Screen file | screenKey | sectionColor |
|---|---|---|
| `src/screens/AlarmListScreen.tsx` | `alarmList` | `colors.sectionAlarm` |
| `src/screens/ReminderScreen.tsx` | `reminders` | `colors.sectionReminder` |
| `src/screens/NotepadScreen.tsx` | `notepad` | `colors.sectionNotepad` |
| `src/screens/VoiceMemoListScreen.tsx` | `voiceMemoList` | `colors.sectionVoice` |
| `src/screens/CalendarScreen.tsx` | `calendar` | `colors.sectionCalendar` |
| `src/screens/TimerScreen.tsx` | `timers` | `colors.sectionTimer` |
| `src/screens/GamesScreen.tsx` | `games` | `colors.sectionGames` |

### Settings reset
`useSettings.handleResetTutorials` calls `resetAllTutorials()` from `useTutorial.ts`, then `ToastAndroid.show('Tutorials reset — visit any screen to see tips again', SHORT)`, then `hapticLight()`. `SettingsScreen` renders a "Tutorial Guide" card row (subtitle "Show feature tips again") in the General section above Send Feedback, styled like the existing clickable cards.

### kv_store keys (Session 28)
- `tutorial_dismissed_alarmList`
- `tutorial_dismissed_reminders`
- `tutorial_dismissed_notepad`
- `tutorial_dismissed_voiceMemoList`
- `tutorial_dismissed_calendar`
- `tutorial_dismissed_timers`
- `tutorial_dismissed_games`

Value is the literal string `'true'` when dismissed, absent otherwise. Lazy init reads `kvGet(...)` and treats any non-null return as dismissed.

### Tests — `__tests__/tutorialTips.test.ts`
Data-validation only (no React/UI). Asserts: ≥7 screen keys, every screen has ≥1 tip, every tip has non-empty title + body, keys are lowercase alphanumeric (`/^[a-zA-Z]+$/`), `clipKey` is either undefined or a non-empty string.

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
Settings: `appSettings`, `appTheme`, `onboardingComplete`, `hapticsEnabled`, `voiceRoastsEnabled`, `voiceIntroPlayed`, `silenceAllAlarms`, `defaultTimerSound`, `bg_main`, `bg_overlay_opacity`, `note_custom_bg_color`, `note_custom_font_color`, `clipPlaybackMode` (Session 26)
Game stats: `guessWhyStats`, `memoryMatchScores`, `sudokuBestScores`, `sudokuCurrentGame`, `dailyRiddleStats`, `triviaStats`, `triviaSeenQuestions`, `chessStats` (Session 16: `{gamesPlayed, wins, losses, draws, totalPoints}`), `checkersStats` (Session 18: `{gamesPlayed, wins, losses, totalPoints}`)
Widget pins: `widgetPinnedPresets`, `widgetPinnedAlarms`, `widgetPinnedReminders`, `widgetPinnedNotes`, `widgetPinnedVoiceMemos`
Pending actions: `pendingNoteAction`, `pendingAlarmAction`, `pendingReminderAction`, `pendingTimerAction`, `pendingCalendarAction`, `pendingVoiceAction`, `pendingAlarmListAction`, `pendingReminderListAction`
Tutorial dismissals (Session 28): `tutorial_dismissed_alarmList`, `tutorial_dismissed_reminders`, `tutorial_dismissed_notepad`, `tutorial_dismissed_voiceMemoList`, `tutorial_dismissed_calendar`, `tutorial_dismissed_timers`, `tutorial_dismissed_games` — value is `'true'` when dismissed, absent otherwise. Wiped en masse by `resetAllTutorials()` from the Settings "Tutorial Guide" row.
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
