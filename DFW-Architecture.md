# DFW Architecture
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** March 31, 2026

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
- `snoozing_{alarmId}` AsyncStorage flag — prevents DISMISSED handler from deleting one-time alarms during snooze
- Persistent notification dedupe via AsyncStorage for cold-start `getInitialNotification()` path (module-level Map doesn't survive process death)

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
- When app resumes on AlarmFire with no pending alarm data AND no displayed alarm/timer notifications, resets to AlarmList
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

### 6 Preset Themes (WCAG AA Verified)
| Theme | Mode | Background | Card | Accent |
|-------|------|-----------|------|--------|
| Midnight | dark | #0F0F1A | #1A1A2E | #4A90D9 |
| Ember | dark | #1A1008 | #2C1E10 | #E8913A |
| Neon | dark | #0A0A14 | #141420 | #00E5CC |
| Void | dark | #000000 | #121212 | #FF3B7A |
| Frost | light | #F5F7FA | #FFFFFF | #2563EB |
| Sand | light | #F5F0E6 | #FFFBF4 | #A8521E |

### Evolution
Feb 11: 8 themes (Midnight, Obsidian, Forest, Royal, Bubblegum, Sunshine, Ocean, Mint) + custom. Mar 10-11: Replaced with current 6 — "the dark themes are all the same... 6 really distinct ones beats 8 okay ones." (Zerenn)

### Custom Theme
`generateCustomThemeDual(bgHex, accentHex)` — auto-detects dark/light from background luminance. Two pickers in Settings with live preview. Legacy guard: if stored as raw hex string instead of JSON object, auto-converts.

### Migration
charcoal→void, amoled→void, slate→neon, paper→frost, cream→sand, arctic→frost. Applied in both ThemeContext.tsx and widget theme loader.

---

## 4. Widget System

### Architecture
- `index.ts` at project root: `registerWidgetTaskHandler(widgetTaskHandler)` + `registerRootComponent(App)`. Required because Expo's AppEntry.js doesn't support headless JS task registration.
- Widgets run bundled JS from APK, NOT from metro dev server. Any JS widget change requires new EAS build.
- Headless JS context: no React Native bridge, no Activity, no Linking. CAN access AsyncStorage, Notifee, JS modules.
- `flex: 1` must be at EVERY level of widget hierarchy. No `position: 'absolute'`.

### Timer Start from Widget
All app-opening approaches failed (Linking.openURL, OPEN_URI, deep links). Solution: headless timer start. `START_TIMER__{presetId}` clickAction → handler creates ActiveTimer, saves to AsyncStorage, schedules notifications. User sees countdown notification immediately. App loads running timer from AsyncStorage when opened later.

### Widget Theming
`getWidgetTheme()` reads theme from AsyncStorage with migration map, returns `WidgetTheme` object. `refreshWidgets()` (renamed from `refreshTimerWidget`) triggered after theme changes, data changes.

### Evolution
Feb 12: TimerWidget (compact) + DetailedWidget. Mar 6: NotepadWidget + NotepadWidgetCompact added. Mar 12: Trimmed to 2 — DetailedWidget redesigned, compacts deleted. Mar 25: CalendarWidget added — mini monthly calendar grid with colored dot indicators. Third widget alongside DetailedWidget and NotepadWidget. Uses getCalendarWidgetData() in widgetTaskHandler.ts for data loading. Click actions: OPEN_CALENDAR (opens CalendarScreen) and OPEN_CALENDAR_DAY__YYYY-MM-DD (opens CalendarScreen with date). pendingCalendarAction consumed in App.tsx on cold start and app resume. Widget alarm loader includes normalization for legacy alarm payloads (mode, days array, numeric weekday format) — does not import loadAlarms() to stay headless-safe, duplicates normalization inline.

**NotepadWidget voice memo integration:** Widget shows voice memos alongside notes. Header layout: mic button (left, RECORD_VOICE), title center (OPEN_NOTES), notepad button (right, ADD_NOTE). Combined items sorted pinned-first (`isPinned` field on WidgetNote and WidgetVoiceMemo), then by `createdAt` descending, sliced to 4. `VoiceMemoCell` uses `theme.cellBg` and `theme.text` (not hardcoded colors). Click actions: `OPEN_VOICE_MEMO__{id}` opens VoiceMemoDetailScreen, `RECORD_VOICE` opens VoiceRecordScreen. Widget task handler stores `pendingVoiceAction` in AsyncStorage, routed by `useNotificationRouting`.

**MicWidget:** Standalone 110dp home screen widget (MicWidget.tsx). Mic icon + "Record" text on themed background. Single click action: `RECORD_VOICE` opens VoiceRecordScreen. Registered in app.json alongside other widgets.

### CalendarWidget
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
4. Intro clip plays if first alarm ever (one-time, stored in AsyncStorage) — alarms only, not timers
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
- Voice Roasts toggle: AsyncStorage key 'voiceRoastsEnabled', defaults to true (opt-out)
- Dismiss Voice toggle: AsyncStorage key 'dismissVoiceEnabled', defaults to true, only shown when voice roasts is on
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

### VoiceMemoDetailScreen — Dual Mode
- Accepts `{ tempUri: string; duration: number }` for new recordings OR `{ memoId: string }` for existing memos. Mode detected via `'tempUri' in params`
- **New recordings:** Save/Discard buttons at bottom. Save: transactional — `saveVoiceMemoFile` copies temp to permanent, then `addVoiceMemo` writes metadata. If metadata fails, permanent copy deleted, temp file preserved for retry. On success, temp file deleted (best-effort). `savingRef` blocks exit during save
- **Existing memos:** explicit Save capsule in header (only visible when title/note differ from `initialTitleRef`/`initialNoteRef`). `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating away
- `beforeRemove` navigation listener: blocks during save (`savingRef`), new recordings get "Discard recording?" alert, existing with unsaved changes get "Unsaved changes" alert with Cancel/Discard/Save & Exit. `exitingRef` prevents re-triggering on intentional exits. Alert callbacks use `navigation.dispatch(e.data.action)` to proceed

### Playback
- **VoiceMemoDetailScreen:** seekable progress bar (44px touch target, 6px visual bar), back/forward 5s, `useFocusEffect` cleanup pauses on screen blur. `Number.isFinite` validation on all seek values with try/catch on `seekTo`. View-based play/pause icons (CSS border triangle for play, dual bars for pause). Play button color: #4CAF50 (Material Design green)
- **NotepadScreen (inline):** single player instance in `useRef` via `createAudioPlayer` (imperative, not hooks). `addListener('playbackStatusUpdate')` for finish detection. Listener ref (`playerListenerRef`) cleaned up before `player.release()` in `stopPlayback`. Focus cleanup via `useFocusEffect` stops playback when screen loses focus. Stale progress reset: when switching memos, previous memo's progress set to 0 before starting new playback
- **NoteEditorModal (note-attached):** `useAudioPlayer`/`useAudioPlayerStatus` hooks for per-note voice memo playback. Seekable via touch responders. Shared 3-attachment limit (images + voice memos)

### Key distinction from Voice Roasts
Voice roasts use the native `AlarmChannelModule` on ALARM stream because they play during alarm fires and must be audible regardless of ringer mode. Voice memos are user-initiated — MEDIA stream via expo-audio is correct.
