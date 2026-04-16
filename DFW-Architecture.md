# DFW Architecture
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 32 (April 16, 2026)

---

## 1. Notification System Architecture

### Why Notifee (not expo-notifications)
expo-notifications couldn't produce full-screen intents, DND bypass, sound looping, or alarm-style behavior. Replaced February 12 with @notifee/react-native.

### Why MediaPlayer (not notification channel audio)
Notifee v9.1.8 strips `audioAttributes` from JS `createChannel()`. Native config plugin approach also failed after 3 builds. Solution: all notification channels set to SILENT. Sound played separately through native `MediaPlayer` with `AudioAttributes.USAGE_ALARM` + `CONTENT_TYPE_MUSIC`.

### Sound Playback Flow
- `DELIVERED` event fires → `playAlarmSoundForNotification()` in both `index.ts` (background) and `App.tsx` (foreground).
- `AlarmFireScreen` mount plays as fallback only if not already playing.
- Sound stopped on: dismiss, swipe (DISMISSED event), snooze, unmount, back button.
- Sound resolution: silent → custom URI → default timer sound → system default. Invalid custom URI catches + retries with null.

### Foreground DELIVERED Behavior
- DELIVERED in foreground: plays alarm sound then returns. No navigation, no setPendingAlarm, no markNotifHandled.
- PRESS in foreground: full navigation to AlarmFireScreen (opt-in by user tapping notification body).
- ACTION_PRESS: Dismiss/Snooze handlers with full cleanup.
- `consumePendingAlarm` only reads module-level `getPendingAlarm()` for background/killed app scenarios — no displayed-notification scan.

### Key Distinctions
- `cancelNotification(id)` — kills display AND recurring trigger.
- `cancelDisplayedNotification(id)` — kills display only, trigger survives (used for recurring alarms).
- `snoozing_{alarmId}` kv_store flag — prevents DISMISSED handler from deleting one-time alarms during snooze.
- Persistent notification dedupe via kv_store for cold-start `getInitialNotification()` (module-level Map doesn't survive process death).

### Notification Action Buttons
- Alarm actions: Snooze + Dismiss. Timer actions: Dismiss.
- Handled via `EventType.ACTION_PRESS` in both `index.ts` (background) and `App.tsx` (foreground).
- Snooze flag enforcement: try/catch with early return (not `.catch(() => {})`) — matches AlarmFireScreen pattern to protect one-time alarms.
- Snooze notification ID persisted back to `alarm.notificationIds` via `updateSingleAlarm`.
- Timer dismiss also cancels countdown chronometer via `cancelTimerCountdownNotification(timerId)`.

### Android Full-Screen Intent Behavior
`fullScreenAction` only launches full-screen activity when screen is OFF or on lock screen. When screen is ON, Android downgrades to heads-up banner (Android 10+ behavior, not a bug). Action buttons solve the UX — users dismiss/snooze from the banner.

### Safety Net — Stale AlarmFire Screen
When app resumes on AlarmFire with no pending alarm data AND no displayed alarm/timer notifications, resets to Home. Uses `notifee.getDisplayedNotifications()` with channel ID prefix matching (`startsWith('alarm')` / `startsWith('timer')` excluding `'timer-progress'`). Prevents stale fire screen after `exitApp` didn't kill the process.

### Notification Channel IDs
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

### 6 Themes (3 dark + 3 light)
| Theme | Mode | Background | Card | Accent |
|-------|------|-----------|------|--------|
| Dark | dark | #0A0A12 | #1A1A28 | #5B9EE6 |
| Light (Ocean) | light | #EFF4FB | #FFFFFF | #2563EB |
| High Contrast | dark | #000000 | #1A1A1A | #00D4FF |
| Vivid | dark | #080D08 | #0E1A0E | #00FF88 |
| Sunset | light | #FFF8F0 | #FFFFFF | #E8690A |
| Ruby | light | #FDF2F4 | #FFFFFF | #E11D48 |

3 dark + 3 light covers blue, green, cyan, orange, red, black.

### Section Colors in Theme
ThemeColors interface includes per-section color tokens: `sectionAlarm`, `sectionReminder`, `sectionCalendar`, `sectionNotepad`, `sectionVoice`, `sectionTimer`, `sectionGames`. Each theme defines its own palette (e.g., Vivid uses completely different section colors than Dark). All hardcoded section hex values throughout the app replaced with `colors.section*` references.

### Mode-Aware Rendering
Capsule buttons use mode-aware rgba; watermark opacity adapts (0.15 dark / 0.06 light). Card backgrounds use section-colored tint in both modes — dark `sectionColor + '20'`, light `sectionColor + '15'`. Photo overlay always uses dark dim regardless of mode. HomeScreen grid cells/today container/banner increase opacity when a background photo is set.

### Overlay Text Strategy
Two patterns for text on dark overlays:
- **Permanent overlays** (game sub-screens, GamesScreen, SettingsScreen): `colors.overlayText` + hardcoded light rgba directly in styles. BackButton/HomeButton use unconditional `forceDark`.
- **Conditional overlays** (8 user-photo screens): base styles use theme tokens, JSX overrides add `bgUri && { color: colors.overlayText }`. BackButton/HomeButton use `forceDark={!!bgUri}`.

### View/Edit Mode Pattern
VoiceMemoDetailScreen and NoteEditorModal use `isViewMode` state for existing items. View mode: read-only Text, "Edit" pill in header. Edit mode: TextInput fields, "Save" pill (only when `hasUnsavedChanges`). New items go straight to edit mode.

### Brand Title Token
`brandTitle` field in ThemeColors — per-theme title color for "Don't Forget Why" on HomeScreen: Dark `#2563EB`, Light `#1E3A8A`, High Contrast `#00D4FF`, Vivid `#00FF88`, Sunset `#9A3412`, Ruby `#9F1239`.

### Font System
- Three-tier: Satisfy (app title), LilitaOne (game headers), Montserrat Alternates (everything else).
- `FONTS` constant in `src/theme/fonts.ts` — `title`, `gameHeader`, `regular`/`semiBold`/`bold`/`extraBold`.
- `useFonts` from `expo-font` in App.tsx; `expo-splash-screen` held until ready. Fallback to system fonts if load fails.
- Android `fontWeight` restriction: custom `fontFamily` ignores `fontWeight` — must use weight-specific font files. All `fontWeight` properties replaced with `fontFamily` app-wide.

### Haptics
- `hapticLight` / `hapticMedium` / `hapticHeavy` / `hapticError` (notification Error, long vibration — checkmate) / `hapticSelection`.
- All gated by `_hapticsEnabled` from kv_store with try/catch fallback.

### Migration
All old theme names migrate to current 6: midnight/ember/neon/void→dark, frost/sand→light, custom→dark. Legacy names from pre-6-theme era also mapped. Applied in both ThemeContext.tsx and widget theme loader.

---

## 4. Widget System

### Architecture
- `index.ts` at project root: `registerWidgetTaskHandler(widgetTaskHandler)` + `registerRootComponent(App)` (Expo's AppEntry.js doesn't support headless JS task registration).
- Widgets run bundled JS from APK, NOT from metro dev server — any JS widget change needs a new EAS build.
- Headless JS context: no RN bridge, no Activity, no Linking. CAN access SQLite (expo-sqlite), Notifee, JS modules.
- `flex: 1` must be at EVERY level of widget hierarchy. No `position: 'absolute'`.

### Timer Start from Widget
Headless timer start (all app-opening approaches failed — Linking.openURL, OPEN_URI, deep links). `START_TIMER__{presetId}` → handler creates ActiveTimer, saves to `active_timers`, schedules notifications. User sees countdown notification immediately; app loads the running timer from SQLite when opened later.

### Widget Navigation Stacks (cold start)
`App.tsx` builds `initialNavState` for cold-start widget entries so Back lands on the correct parent:
- VoiceRecord: `Home → VoiceMemoList → VoiceRecord`
- VoiceMemoDetail: `Home → VoiceMemoList → VoiceMemoDetail`
- Notepad: `Home → Notepad` (NotepadScreen IS the parent)
- Calendar: `Home → Calendar`
- AlarmFire: `Home → AlarmList → AlarmFire`
- CreateAlarm/CreateReminder: `Home → AlarmList → CreateAlarm` / `Home → Reminders → CreateReminder`

Warm-app widget paths still navigate directly in most cases. Quick Record on HomeScreen uses `navigation.reset(...)` to match the cold-start back behavior.

### Widget Theming
`getWidgetTheme()` reads theme from `kv_store` with migration map, returns `WidgetTheme`. `refreshWidgets()` triggered after theme changes and data changes.

### Widgets Shipped
- **DetailedWidget** (Memory's Timeline) — alarms, reminders, notes, voice memos
- **NotepadWidget** (Forget Me Notes) — notes + voice memos, pinned-first sort. Header: mic button left (OPEN_VOICE_MEMOS), title center (OPEN_NOTES), notepad right (ADD_NOTE). Combined items sorted pinned-first then `createdAt` desc, sliced to 4. Click actions: `OPEN_VOICE_MEMO__{id}`, `RECORD_VOICE`. Widget task handler stores `pendingVoiceAction` routed by `useNotificationRouting`.
- **CalendarWidget** (Misplaced Thoughts) — mini monthly calendar grid
- **MicWidget** (Memory's Voice) — standalone 110dp record-voice shortcut. Single click action: `RECORD_VOICE`.
- Footers on all widgets: "Don't Forget Why"

### CalendarWidget (Misplaced Thoughts)
- Mini month grid: 7 columns × 5-6 rows, weekday header, month/year label.
- Colored dots per day (up to 3): red `#FF6B6B` alarms, blue `#4A90D9` reminders, green `#55EFC4` notes.
- Today: accent background highlight. Past + adjacent-month days: textSecondary.
- Root FlexWidget `clickAction="OPEN_CALENDAR"`. `minWidth: 250dp, minHeight: 280dp`.
- `getCalendarWidgetData()` loads alarms/reminders/notes and computes dot presence per day.
- Widget alarm loader inlines legacy-payload normalization (mode, days array, numeric weekday format) — doesn't import `loadAlarms()` to stay headless-safe.

---

## 5. Voice Roast System

### Architecture
Voice clips play through the native AlarmChannelModule on Android's ALARM audio stream (USAGE_ALARM), bypassing media volume. This ensures clips are always audible when an alarm fires, regardless of ringer mode or media volume setting.

Two separate MediaPlayers in AlarmChannelHelper.java (embedded in plugins/withAlarmChannel.js):
- sPlayer: alarm/timer sounds (looping)
- sVoicePlayer: voice clips (non-looping, completion callback resolves JS promise)

Also exposes `getSystemAlarmSounds()` — lists system alarm sounds via `RingtoneManager.TYPE_ALARM`. Returns array of `{title, url, soundID}`. Uses fully qualified class names inline (no added imports).

JS service (src/services/voicePlayback.ts) uses expo-asset (Asset.fromModule + downloadAsync) to resolve bundled require() assets to local file:// URIs, then passes URIs to the native module. No expo-av involved.

### Audio Sequencing (AlarmFireScreen)
1. Alarm sound plays for 1.5s
2. `stopVoice()` kills any lingering clip from previous fire
3. Alarm sound stops
4. Intro clip plays if first alarm ever (one-time flag in kv_store) — alarms only, not timers
5. Random fire/timer clip plays (await `playRandomClip`)
6. Alarm sound resumes (unless silent/true_silent alarm)

True silent alarms skip voice entirely; regular silent alarms play voice but don't resume the alarm tone.

### Double-Tap Skip (AlarmFireScreen)
- **Dismiss:** First tap plays dismiss clip, button text → "Tap to skip". Second tap stops voice + exits immediately.
- **Snooze:** First tap schedules snooze, shows shame overlay, plays snooze clip, exits on finish. Button stays tappable; text → "Tap to skip". Second tap stops voice + exits immediately.

### Voice Categories (src/data/voiceClips.ts)
- fire (16), snooze1-4 (4/6/4/6, tier-matched shame), timer (11), guess_before/correct/wrong (4/3/3), dismiss (10), intro (1). Total 63 MP3s in `assets/voice/`.

### Settings
- Voice Roasts toggle: `voiceRoastsEnabled` (default true, opt-out)
- Dismiss Voice toggle: `dismissVoiceEnabled` (default true, only shown when roasts on)

### Native URI Handling (plugins/withAlarmChannel.js)
`playVoiceClip` handles http/https (Metro), `file:///android_asset/` (bundled), `file://` (cached), `content://`, and bare resource name fallback.

### Safety
- `playId` counter prevents zombie playback after cancellation (incremented in `stopVoice` + play functions)
- `sPendingVoiceCallback` guarantees JS promise resolves on stop/error — grab-and-null pattern prevents double-fire
- `stopVoice()` called in all exit paths (dismiss, snooze, guess why, unmount); increments `_playId` to invalidate in-flight downloads
- Voice errors never crash alarm flow — all caught and logged
- `markIntroPlayed()` only called after successful playback (inner try/catch)

### Voice Character
Male, early 30s, American accent. Tired, sarcastic, self-aware app personality. Has coworkers (Denise), a life, opinions about being stuck in a phone. Clean — no profanity. Generated via ElevenLabs v3.

### Audio Dependencies

- `expo-av` removed; `expo-audio` used for chirp, game SFX, tutorial overlay MEDIA-stream playback (`createAudioPlayer`).
- `expo-asset` resolves bundled `require()` audio to `file://` URIs via `Asset.fromModule + downloadAsync`.
- Voice clips use native AlarmChannelModule, NOT expo-audio (ALARM stream requirement).
- `metro.config.js` adds `wav` to `resolver.assetExts`.

### SDK 55 Dependency Baseline

Expo SDK 55, React Native 0.83.4, React 19.2.0, react-native-reanimated ~4.2.x, react-native-worklets 0.7.2, @shopify/react-native-skia 2.4.18, react-native-screens ~4.23.x, react-native-gesture-handler ~2.30.x, react-native-pager-view 8.0.0.

- `react-native-notification-sounds` removed — native `getSystemAlarmSounds` in AlarmChannelModule replaces it.
- `newArchEnabled` / `edgeToEdgeEnabled` flags removed from app.json — both are defaults in SDK 55.
- `GestureHandlerRootView` wraps the entire app in `App.tsx` (required for SwipeableRow).

### Online-First Trivia

`TriviaScreen.onlineMode` defaults to **true** and is flipped to false on mount only if `checkOnlineAvailable()` reports the device is offline (HEAD request to OpenTDB with a short timeout). `startRound` tries the online fetch first whenever `onlineMode` is on and the category has an OpenTDB mapping. `fetchOnlineQuestions(category, QUESTIONS_PER_ROUND, difficultyFilter)` returns a full round's worth of OpenTDB questions with HTML entities decoded and synthetic ids in the `online_{timestamp}_{idx}` space. `isOnlineRound` state drives the results screen copy and skips the `addSeenQuestionIds` persistence on finish — online questions don't contribute to the offline "seen" cycle.

Any online failure returns `null`, and `startRound` falls through to the offline bank via `selectQuestions` with its seen-id cycling. Users never see an error.

### Trivia — Parent + Subcategory System

Two-level taxonomy: 8 **parent categories** for the main tile grid, each containing 1–4 **subcategories** for a second-level picker.

- **`TriviaParentCategory`** (8 values): `general, popCulture, scienceTech, historyPolitics, geography, sportsLeisure, gamingGeek, mythFiction`.
- **`TriviaSubcategory`** (19 values) mapped via `PARENT_TO_SUBS`. Parents with a single sub (`general`, `geography`, `mythFiction`) skip the modal — treated as instant "All {parent}" selections. Parents with >1 subs open `SubcategoryPickerModal`.
- **`SUBCATEGORY_LABELS`** keeps display text out of the taxonomy.

**1,623 questions in 8 data files.** Each parent has its own `src/data/triviaBank_{parent}.ts` exporting a `TriviaQuestion[]`. `src/data/triviaBank.ts` barrel exposes `getAllQuestions`, `getQuestionsForCategory`, `getQuestionsForSubcategory`, `getQuestionCount`, `getSubcategoryCount`. Question ids follow `category_NNN`.

**`selectQuestions` branch table** (offline rounds):
1. `subcategory !== 'all'` → `getQuestionsForSubcategory(sub)` — strict sub filter.
2. `category === 'general'` → `getAllQuestions()` — "grab bag" across the whole bank.
3. otherwise → `getQuestionsForCategory(category)` — all subs under this parent.

**Seen-question composite keys.** `TriviaScreen` composes `'{category}_{subcategory}'` when a specific sub is selected, and `'{category}'` alone when 'all'. Preserves per-view recycling at the cost of some cross-view dedup.

**Online trivia remapped.** `triviaAI.ts`'s `CATEGORY_MAP` covers all 8 parents; food + kids questions were remapped into `general` so every parent has an OpenTDB online backing. Online questions get a default `subcategory` (first entry in `PARENT_TO_SUBS[parent]`) because OpenTDB doesn't expose subcategory-level queries.

### 366-Riddle Daily Bank

- **`src/data/dfw_yearly_riddles.ts`** is a manually-authored `DailyRiddleEntry[]` with one entry per day-of-year (1-indexed), 366 entries total. Each entry carries `id`, `dayOfYear`, `category` (one of 12 plain-English strings like "Home & Objects"), `difficulty`, `question`, `answer`. No shuffle, no seed, no randomness — "today's riddle" is literally a lookup by day-of-year.
- **`getDailyRiddleForDate(dateStr)`** (in `riddles.ts`) parses the date as `new Date(dateStr + 'T12:00:00Z')` and computes `dayOfYear` via `Date.UTC(year, 0, 1)` → subtraction → `Math.floor(ms / 86400000) + 1`. Noon-UTC anchor eliminates DST edge cases; UTC arithmetic eliminates cross-timezone divergence. Every device in every timezone resolves the same `YYYY-MM-DD` to the same `YEARLY_RIDDLES` entry.
- **Daily card is strictly offline.** Deterministic lookup = no online fetch needed, no `daily_riddle_{todayStr}` kv cache.
- **Bonus Riddles tab** is Pro-gated. Non-Pro users see the tab with a lock badge; tapping it opens ProGate. Pro users tap through to fresh online riddles via `fetchMultipleOnlineRiddles(5)`.

### Pro Tier — Architecture Notes

- **Single `useEntitlement()` instance per screen.** ProGate mounted conditionally (`{proGateVisible && <ProGate.../>}`) and accepts entitlement values as props. Parents (SettingsScreen, GamesScreen) call the hook once each. Prevents double `finishTransaction()`.
- **Trial gate at the GamesScreen level.** `canPlayGame(game)` in `GamesScreen.handleGamePress` — one branch point for all five gated games. Increment gated on `!isPro`.
- **Founding migration in its own try/catch in `App.tsx`.** Called on both success path and kv `_migrated` recovery path. Throw logs a warning, never trips "Something went wrong".
- **Sync map preserved on sign-out (intentional).** `clearSyncData()` only clears `gcal_dfw_calendar_id` + `gcal_sync_enabled`. Re-signing same account picks up existing mapping → no duplicate events.
- **Stable recurring DTSTART from `alarm.createdAt`.** `stableFirstDate(days, createdAt)` — first matching weekday on or after creation. Deterministic; prevents Google Calendar from dropping past occurrences.
- **Calendar write scope requested on enable, not on configure.** Least privilege. 403 branch in `authedFetch` re-requests write scope mid-flight and retries once.
- **Manual "Sync Now" v1.** No auto-sync. User taps Sync Now in Settings, result renders inline.

### Online/Offline Globe Indicators

`GamesScreen` and `TriviaScreen` poll `checkConnectivity()` on focus and every 30s while focused. Globe badge renders top-right of each game card:

- **Online-capable** (Daily Riddle, Chess, Checkers, Trivia): tired wifi globe (`icon-globe.webp`) vs dead X globe (`offline_globe.webp`).
- **Offline-only** (Sudoku, Memory Match): static offline globe.
- **Trophies:** no globe.
- **`TriviaScreen`** uses the same polling with an absolute-positioned top-right badge during the category phase.
- **Accessibility:** globe `<View>` has no own `accessibilityLabel` — state is merged into the parent `TouchableOpacity`'s `accessibilityLabel` since RN grouping ignores inner child labels.
- Both globes are DFW-style original art.

### IAP Retry — Cold-Start Fix

On cold app-start users sometimes saw `[Expo-IAP] Error fetching products: Billing client not ready`. The `useEntitlement` effect fires `fetchProducts` as soon as `connected` flips true, but Play Billing sometimes hasn't finished its handshake.

The `fetchProducts` effect runs a retry-with-backoff loop: initial attempt + up to 3 retries, 1s/2s/4s exponential delays, retries only on error messages containing "Billing client not ready" or "not ready". All other errors fail fast. A `cancelled` flag in the cleanup function prevents state updates after unmount.

### Two-Tier Icon System

The app has two distinct visual languages for icons:

1. **Chrome icons** (`assets/app-icons/`) — silver/brushed metallic WebP, 512×512, transparent bg. Clean utility language for productivity surfaces (alarms, reminders, notes, calendar, settings). No faces, no personality. Examples: `alarm-clock`, `bell`, `notepad`, `plus`, `close-x`, `back-arrow`.
2. **Game character icons** (`assets/icons/`) — anthropomorphic full-color WebP with weathered expressions. Gameplay surfaces only (Chess, Checkers, Sudoku, Trivia, Memory Match, Daily Riddle). Examples: `game-play`, `icon-smiley`, `icon-hourglass`, 22 Memory Guy Match card images, 12 chess piece characters, 10 trivia category icons, 9 rank tier images.

**Navigation mirror:** non-game screens use `BackButton`/`HomeButton` (chrome). Game screens were intended to use `GameNavButtons` (character art via `icon-game-back`/`icon-game-home`) to keep the game/app boundary visually clean — but the component is currently stranded.

### Data Layer Safety

- **`safeParse<T>(json, fallback): T`** — wraps `JSON.parse` with try/catch; returns `fallback` on SyntaxError or null/undefined result.
- **`safeParseArray<T>(json): T[]`** — same contract, returns `[]` on any failure. Used in 13 storage services.
- **`withLock(key, fn): Promise<T>`** — per-key async mutex. Each key gets its own promise chain; concurrent calls serialize. `await withLock('note:' + id, async () => { ... })`.
- **Restore mutex:** `restoreInProgress` flag set at start of `restoreFromBackup()`, cleared in `finally`.
- **Migration safety:** per-row try/catch — a single malformed row logs and skips rather than aborting the whole migration.
- **`autoExportBackup` never throws** — background backup errors swallowed/logged. Stale SAF URI or permission drop can't crash the app.

### Navigation Guards

- **`beforeRemove` guards** on `CreateAlarmScreen`/`CreateReminderScreen`. Dirty form + back → "Discard changes?" confirm. `savedRef` set true before `navigation.goBack()` on save so the save-then-navigate path bypasses.
- **`isDirty`** uses `JSON.stringify(currentForm) !== JSON.stringify(initialForm)` — catches "edited then reverted" cases that a boolean flag misses.
- **`VoiceRecordScreen`** — recording in progress triggers confirm-before-leave prompt.
- **Game screens** intercept hardware back and bounce to pre-game menu phase instead of exiting.
- **`HomeButton.popToTop()`** — ensures `beforeRemove` guards fire from modal/nested routes (vs. `navigate('Home')` which skips them).
- **Deep-link existence checks** — deep links from widgets/notifications validate target entity exists before routing.

---

## 6. Voice Memo Audio System

### Recording (expo-audio, NOT native AlarmChannelModule)
- Voice memos record and play through the **MEDIA stream** via expo-audio — user-initiated, not alarm-stream audio
- `useAudioRecorder` hook with `RecordingPresets.HIGH_QUALITY` — AAC codec, `.m4a` output
- `requestRecordingPermissionsAsync()` gates recording; `android.permission.RECORD_AUDIO` added to app.json
- Transition guard (`transitionRef`) prevents rapid-tap race conditions on record/stop toggle; pause/resume uses `isPausedRef` for synchronous state so duplicate intervals can't be created
- `recorder.stop()` always `await`ed before reading status/URI/duration — non-awaited stop reads stale data
- AppState listener stops recording on app background, navigates to detail with partial recording
- **Recording flow:** VoiceRecordScreen creates the memo + first clip directly via `saveAndNavigate`, then navigates to detail with `{ memoId }`. Two modes: new memo (creates memo row + clip + photos atomically with rollback via `permanentlyDeleteVoiceMemo`) and add-clip mode (`route.params.addToMemoId` appends clip + photos to existing memo). VoiceRecordScreen has no post-recording UI — only idle and recording states
- `beforeRemove` listener intercepts hardware back/gesture back/custom back. During recording: stops, discards temp file, dispatches original action. `navigatedRef` allows programmatic `replace` through.
- **`capturedPhotosRef`:** mirror ref kept in sync with `capturedPhotos` state via useEffect so the AppState background handler's `saveAndNavigate` closure reads fresh photo URIs

### Voice Memo Clips
- **Memos as containers:** A voice memo holds zero or more `VoiceClip` rows. Legacy `voice_memos.uri`/`duration` columns kept for backward compat (empty/0 for new memos); all audio data lives in `voice_clips`.
- **`voice_clips` table:** `id TEXT PK, memoId TEXT FK→voice_memos(id) ON DELETE CASCADE, uri TEXT, duration INTEGER, position INTEGER, label TEXT NULL, createdAt TEXT`.
- **`voiceClipStorage.ts`:** `getClipsForMemo`, `getClipSummaries` (batch clipCount + totalDuration), `addClip`, `deleteClip` (also deletes audio file), `updateClipLabel`, `getNextClipPosition`, `deleteAllClipsForMemo` (cascade).
- **Legacy migration:** `_initSchema` scans `voice_memos` with non-empty `uri`, inserts a `voice_clips` row at position 0, then clears `uri`/`duration`. Idempotent.
- **Clip labels:** `null` renders as formatted `createdAt` ("Apr 11, 4:18 PM"). Editable inline; empty or matching-default reverts to `null`.
- **Playback modes:** Stop / Play All (auto-advance) / Repeat. Persisted in kv `clipPlaybackMode`.

### Voice Memo Photos
- **`voice_memos.images TEXT NOT NULL DEFAULT '[]'`:** JSON array of file URIs. `PRAGMA table_info` check + `ALTER TABLE` migration in `_initSchema`.
- **Storage:** `voice-memo-images/` under `Paths.document`. Filename: `${memoId}_${Date.now()}_${shortId}.{jpg|png}`.
- **`voiceMemoImageStorage.ts`:** `saveVoiceMemoImage(memoId, sourceUri)`, `deleteVoiceMemoImage(uri)`, `deleteAllVoiceMemoImages(uris[])`. Simpler than `noteImageStorage.ts` — no companion JSON, no drawing support.
- **Cleanup:** `permanentlyDeleteVoiceMemo` reads images from the row before delete and calls `deleteAllVoiceMemoImages`.
- **Backup:** `voice-memo-images` in `MEDIA_FOLDERS` (`backupRestore.ts`); `BackupMeta.contents.voiceMemoImages` optional count in manifest.
- **JSON validation:** `rowToMemo` parses with try/catch + `Array.isArray` guard — falls back to `[]`.
- **5-photo cap:** enforced in `VoiceRecordScreen.takePhoto` and `VoiceMemoDetailScreen.handleTakePhoto`/`handlePickImage`. Toast on overflow.

### VoiceMemoDetailScreen — View/Edit Mode
- Accepts `{ memoId: string }` only. `isViewMode` state defaults true; tap header edit-circle to enter edit mode.
- **View mode:** read-only Text for title/note, edit circle icon (silver pencil) in headerRight next to trash.
- **Edit mode:** TextInput with bgUri-aware placeholder colors, save circle icon (silver floppy disk) in headerRight.
- Header layout: headerLeft (Back + Home), headerRight (edit-or-save circle + trash circle with red border).
- `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating away.
- `useFocusEffect` reloads BOTH memo and clips on focus so photos saved during add-clip aren't clobbered by stale state.
- **Photos UI:** "PHOTOS" strip between title/note and clips header, 80×80 thumbnails, tap opens `ImageLightbox`. Edit mode adds red X delete badges + camera + gallery 40×40 button row.
- `beforeRemove`: unsaved changes → "Unsaved changes" alert (Cancel/Discard/Save & Exit). `exitingRef` prevents re-triggering on intentional exits.

### Playback
- **VoiceMemoDetailScreen:** seekable progress bar (44px touch target, 6px visual bar), back/forward 5s, `useFocusEffect` cleanup pauses on blur. `Number.isFinite` validation on seek values with try/catch on `seekTo`. Play button color: #4CAF50.
- **NotepadScreen (inline):** single player instance in `useRef` via `createAudioPlayer`. `addListener('playbackStatusUpdate')` for finish detection, cleaned up before `player.release()` in `stopPlayback`. `useFocusEffect` stops playback on blur. Switching memos resets previous memo's progress to 0.
- **NoteEditorModal (note-attached):** `useAudioPlayer`/`useAudioPlayerStatus` hooks for per-note voice memo playback (legacy — recording removed, playback kept for existing notes). Shared 5-attachment limit (images + legacy voice memos).

### Key distinction from Voice Roasts
Voice roasts use the native `AlarmChannelModule` on ALARM stream because they play during alarm fires and must be audible regardless of ringer mode. Voice memos are user-initiated — MEDIA stream via expo-audio is correct.

---

## 7. Navigation & Screen Architecture

### Home as Entry Point
- Home is `initialRouteName`. Flow: Home → sections (AlarmList, Reminders, Timers, Notepad, VoiceMemoList, Calendar, Games). Chess route reached via GamesScreen.
- AlarmListScreen is alarms-only; ReminderScreen is standalone; TimerScreen owns all timer state/notification logic; VoiceMemoListScreen is standalone; NotepadScreen is notes-only.
- HomeButton on all screens for direct Home navigation.
- Widget deep links: `pendingAlarmListAction` and `pendingReminderListAction` (split from `pendingTabAction`). All deep links route through Home as base.

### Screen → Hook Extraction Pattern
Large screens decomposed into thin render shells + state/logic hooks: AlarmListScreen, NotepadScreen, ChessScreen, CheckersScreen, SudokuScreen, TimerScreen, DailyRiddleScreen, SettingsScreen.

NoteEditorModal is a thin render shell (~250 lines, down from 1268). Logic in `useNoteEditor`. Sub-components: `NoteEditorTopBar` (view/edit top bar), `NoteEditorToolbar` (bottom action bar, edit mode only), `NoteColorPicker` (overlay panel), `NoteImageStrip` (horizontal thumbnails). Persistent bottom toolbar replaces the old dropdown plus button. Voice recording removed; legacy playback via `MemoCard` kept for existing notes. Images display inline in view mode, move behind "Attached" panel in edit mode. Hardware back peels panels (attachments → color picker → confirmClose).

Shared extractions: `src/components/linkedText.tsx` (link detection + rendering), `NoteVoiceMemo.tsx` (legacy voice memo playback cards), `ColorPickerModal.tsx` (reusable color picker).

### Icon System
- `src/components/Icons.tsx`: 29+ View-based icons replacing emoji throughout app
- All icons: `{ color: string; size?: number }` props, default size 20, proportionally scaled inner shapes
- Includes: AlarmIcon, TimerIcon, BellIcon, DocIcon, MicIcon, CalendarIcon, GamepadIcon, PencilIcon, GearIcon, PinIcon, TrashIcon, FireIcon, ChevronRightIcon, CheckIcon, PlusIcon, CloseIcon, LightbulbIcon, BrainIcon, NumbersIcon, PuzzleIcon, TrophyIcon, WarningIcon, SearchIcon, SortIcon, HomeIcon, ImageIcon, CameraIcon, PaintBrushIcon, ShareIcon, LockIcon
- Theme-colorable, scalable, consistent stroke weight. Replaces device-dependent emoji rendering.

### ExpoKeepAwake
- `useKeepAwake()` hook replaced with imperative `activateKeepAwakeAsync()` in try-catch useEffect — fixes SDK 55 promise rejection during activity transitions

### Reminder Scheduling — Yearly from createdAt
- Recurring reminders with no days + no dueDate treated as yearly from createdAt (not daily)
- Affects: scheduling, calendar dots, Today section, widget, completion logic

---

## 7.5 Tutorial Overlay System

Per-screen first-visit tip carousel. Each wired screen remembers its own dismissal in `kv_store` under `tutorial_dismissed_{screenKey}`. Settings has a "Tutorial Guide" reset row that wipes every dismissal key so all overlays re-appear on next screen visit.

### Hook — `useTutorial(screenKey)` (`src/hooks/useTutorial.ts`)
- Pure logic, no UI imports. Matches the hook rules from the screen-decomposition pattern.
- Reads `kvGet('tutorial_dismissed_' + screenKey)` via a **lazy `useState` initializer** — synchronous, no effect round-trip, no one-frame flash. `kvGet` is synchronous via `expo-sqlite`.
- Returns `{ showTutorial, tips, currentIndex, nextTip, prevTip, dismiss }`. `nextTip`/`prevTip` cap at last tip / floor at 0. `dismiss` writes `kvSet('tutorial_dismissed_' + screenKey, 'true')`. Unknown keys return `showTutorial=false` silently.
- Module also exports `resetAllTutorials()`: iterates `Object.keys(TUTORIAL_TIPS)` and calls `kvRemove('tutorial_dismissed_' + key)` for each.

### Component — `TutorialOverlay` (`src/components/TutorialOverlay.tsx`)
- Absolute overlay, `zIndex: 999`, rendered as the last child of each wired screen's outermost `<View>`.
- **TalkBack structural fix:** wrapper `<View>` contains backdrop `TouchableOpacity` + card `View` as **siblings** so `importantForAccessibility="no-hide-descendants"` on the backdrop doesn't hide the card.
- Backdrop: `rgba(0,0,0,0.85)` dim, `onPress={onDismiss}`, `importantForAccessibility="no-hide-descendants"` (touch still works).
- Card: `colors.card` bg, `borderRadius: 16`, `padding: 24`, 85% width / 320 max. `sectionColor + '40'` full border + 3px `sectionColor` left accent. `accessibilityViewIsModal={true}`. No `accessibilityLabel` on card (would collapse title/body/buttons into one announcement).
- Title: `FONTS.bold` 18pt. Body: `FONTS.regular` 14pt `lineHeight: 22`.
- Dot indicators: only when `tips.length > 1`. Active `width: 24, sectionColor`, inactive `width: 8, colors.border`. Row `importantForAccessibility="no"`.
- Nav: Back + Next/Got it, `FONTS.semiBold` 15pt, all fire `hapticLight()` + carry `accessibilityRole="button"` + `accessibilityLabel`. Haptics import lives in `TutorialOverlay.tsx`, NOT `useTutorial.ts` (pure logic hook rule).
- **Audio:** `createAudioPlayer` from `expo-audio` on the MEDIA stream (tutorials are user-initiated, not alarm fires). Asset resolution via `Asset.fromModule(require(...)).downloadAsync()` → `createAudioPlayer({ uri })`. Player cast to `PlayerWithEvents` from `audioCompat.ts`.
- **Lifecycle:** single `useEffect` on `[currentIndex, tips, stopClip]` calls `stopClip()` then kicks an async IIFE to download + create + play. `playerRef.current = player` assigned **before** `player.play()` so cleanup between assign + play still finds the player. Second `useEffect` subscribes to `AppState` and calls `stopClip()` on non-`'active'`. `handleNext`/`handlePrev`/`handleGotIt`/`handleBackdropPress` all call `stopClip()` before their primary action.
- **Race protection:** async IIFE closes over a local `cancelled` flag, re-checked after `await asset.downloadAsync()` before `createAudioPlayer`.
- **`stopClip()`:** `useCallback([])` — `pause()` then `remove()` on `playerRef.current` (each try/catch), nulls ref. Audio errors never propagate.

### Data — `src/data/tutorialTips.ts`
- `TutorialTip { title: string; body: string; clipKey?: string }`
- `TUTORIAL_TIPS: Record<string, TutorialTip[]>` — 7 screens: `alarmList` (3), `reminders` (2), `notepad` (3), `voiceMemoList` (3), `calendar` (1), `timers` (2), `games` (1). 15 tips total.
- Each tip's `clipKey` matches its filename in `assets/voice/tutorial/` (e.g. `tutorial_alarmList_01`). Falsy `clipKey` skips audio.
- Copy is in the sarcastic DFW personality voice.

### Voice clip registry — `src/data/tutorialClips.ts`
- `Record<string, number>` mapping `clipKey` → `require(...)` module ID. 15 entries, 1-to-1 with the tips. Assets at `assets/voice/tutorial/tutorial_{screenKey}_{NN}.mp3`.
- Voice talent: ElevenLabs v3, same character as `assets/voice/` fire/snooze/timer clips (male, early 30s, American, tired/sarcastic). Scripts use v3 audio tags for emotional direction.
- Clips are independent from the tip body text — they add personality rather than narrating the visible copy verbatim.

### Screen wiring (7 screens)
Each screen imports `useTutorial` + `TutorialOverlay`, calls the hook once, renders overlay at end of outermost `<View>`:

- `AlarmListScreen` — `alarmList` / `colors.sectionAlarm`
- `ReminderScreen` — `reminders` / `colors.sectionReminder`
- `NotepadScreen` — `notepad` / `colors.sectionNotepad`
- `VoiceMemoListScreen` — `voiceMemoList` / `colors.sectionVoice`
- `CalendarScreen` — `calendar` / `colors.sectionCalendar`
- `TimerScreen` — `timers` / `colors.sectionTimer`
- `GamesScreen` — `games` / `colors.sectionGames`

### Settings reset
`useSettings.handleResetTutorials` calls `resetAllTutorials()`, toasts "Tutorials reset — visit any screen to see tips again", fires `hapticLight()`. "Tutorial Guide" card row in Settings General section above Send Feedback.

### kv_store keys
`tutorial_dismissed_{alarmList|reminders|notepad|voiceMemoList|calendar|timers|games}` — value `'true'` when dismissed, absent otherwise.

### Tests — `__tests__/tutorialTips.test.ts`
Data-validation only. Asserts ≥7 screen keys, every screen has ≥1 tip, non-empty title + body, lowercase alphanumeric keys, `clipKey` is undefined or non-empty string.

---

## 8. Storage Layer (SQLite)

### Migration from AsyncStorage
All persistent storage migrated from `@react-native-async-storage/async-storage` to `expo-sqlite` (synchronous API). AsyncStorage kept temporarily in `database.ts` only — the one-time migration runner reads old AsyncStorage data and writes it to SQLite on first launch post-update.

### Database file
`dfw.db` — singleton via `getDb()` in `src/services/database.ts`. Schema initialized on every launch via `CREATE TABLE IF NOT EXISTS`.

### Tables
| Table | Purpose |
|-------|---------|
| `alarms` | Alarm entities — `nativeSoundId` INTEGER (renamed from `soundID` due to SQLite case-insensitive collision with `soundId` TEXT) |
| `reminders` | Reminder entities |
| `notes` | Note entities (soft-delete via `deletedAt`). Includes `voiceMemos TEXT` (JSON array) and `title TEXT NOT NULL DEFAULT ''` |
| `voice_memos` | Voice memo metadata — `images TEXT` holds JSON array of photo URIs |
| `voice_clips` | Per-memo audio clips — `id TEXT PK, memoId TEXT FK→voice_memos(id) ON DELETE CASCADE, uri, duration, position, label, createdAt` |
| `active_timers` | Currently running timers |
| `user_timers` | User-created custom timer presets |
| `chess_game` | Single-row (CHECK id=1) in-progress chess — fen, playerColor, difficulty, moveHistory (JSON), takeBackUsed, blunderCount, startedAt, updatedAt |
| `checkers_game` | Single-row (CHECK id=1) in-progress checkers — board (JSON), turn, playerColor, difficulty, rules, moveCount, startedAt, updatedAt |
| `kv_store` | Key-value pairs for settings, game stats, widget pins, pending actions, flags |

### KV store keys (partial list)
Settings: `appSettings`, `appTheme`, `onboardingComplete`, `hapticsEnabled`, `voiceRoastsEnabled`, `voiceIntroPlayed`, `silenceAllAlarms`, `defaultTimerSound`, `bg_main`, `bg_overlay_opacity`, `note_custom_bg_color`, `note_custom_font_color`, `clipPlaybackMode`
Game stats: `guessWhyStats`, `memoryMatchScores`, `sudokuBestScores`, `sudokuCurrentGame`, `dailyRiddleStats`, `triviaStats`, `triviaSeenQuestions`, `chessStats`, `checkersStats`
Trial + Pro: `game_trial_{game}`, `pro_status`, `founding_status`, `founding_check_done`, `openingClipPlayed`
Calendar sync: `gcal_dfw_calendar_id`, `gcal_sync_map`, `gcal_sync_enabled`
Widget pins: `widgetPinnedPresets`, `widgetPinnedAlarms`, `widgetPinnedReminders`, `widgetPinnedNotes`, `widgetPinnedVoiceMemos`
Pending actions: `pendingNoteAction`, `pendingAlarmAction`, `pendingReminderAction`, `pendingTimerAction`, `pendingCalendarAction`, `pendingVoiceAction`, `pendingAlarmListAction`, `pendingReminderListAction`
Tutorial dismissals: `tutorial_dismissed_{alarmList|reminders|notepad|voiceMemoList|calendar|timers|games}` — value `'true'` when dismissed. Wiped en masse by `resetAllTutorials()`.
Ephemeral: `snoozing_{alarmId}`, `snoozeCount_{alarmId}`, `handledNotifIds`

### Key API
- `kvGet(key)` / `kvSet(key, value)` / `kvRemove(key)` — synchronous KV helpers
- `getDb()` — returns singleton `SQLiteDatabase`, initializes schema on first call
- `migrateFromAsyncStorage()` — async one-time migration, called in App.tsx before render. On failure, logs error but doesn't set `_migrated` flag — retries on next launch.

### Schema notes
- `execSync` multi-statement DDL only executes the first statement — split into individual `execSync` calls per table
- `soundId` (TEXT) and `soundID` (INTEGER) column collision — SQLite column names are case-insensitive. INTEGER column renamed to `nativeSoundId`
- `voiceMemos` column was missing from notes schema originally — caused data loss for note-attached voice memos. `voiceMemos TEXT` column added
- `private` is a SQLite reserved word — must be quoted as `"private"` in DDL and DML

### Pattern
Individual SQL `INSERT`/`UPDATE`/`DELETE` per entity. `SELECT` queries replace `JSON.parse` of full arrays. Notification scheduling logic unchanged from AsyncStorage days — only the storage calls changed.

---

## 9. Testing Infrastructure

### Jest Setup
- **Preset:** `ts-jest` with `node` test environment (not `jest-expo` — jest-expo crashes parsing expo-modules-core TypeScript)
- **Test location:** `__tests__/` at project root
- **Run:** `npm test` or `npx jest`
- **Config:** in `package.json` `"jest"` section — `moduleNameMapper` maps `../utils/*`, `../types/*`, etc. to `<rootDir>/src/` paths
- **Scope:** Pure utility functions + services only (no React Native UI, no native modules). SQLite services are tested by mocking the kv module.
- **jest-expo** stays in devDependencies for future component testing

### Test Suites
Coverage spans time/sound utilities, safe parsing, async mutex, game AIs (chess, checkers), storage services (firebase auth, firestore, calendar sync, voice clips, game trials, pro status, founding status, widget pins), trivia bank validation, tutorial tip data, note colors, settings, and backup/restore. See `__tests__/` for the full list.

### Branch
- `testing-setup` branch used for Jest work, merged into `dev`

---

## 10. Backup & Restore System

### backupRestore.ts
- Export Memories: close DB → copy dfw.db + media folders to staging → generate backup-meta.json with content counts → zip to .dfw → share via system sheet
- Import Memories: validate manifest → cancel notifications → close DB → unzip to temp → move live data to rollback → move restored data to document → reopen DB → reschedule notifications → rollback on failure
- Auto-export: SAF folder picker → persist URI → check frequency on app open → create file in SAF dir via base64
- Transactional restore: rollback pattern with liveDataMoved flag, always reopens DB in finally
- `MEDIA_FOLDERS` includes `voice-memo-images` so the photo directory is zipped/restored. `BackupMeta.contents.voiceMemoImages` is optional — older backups (pre-photo feature) treated as 0 on validate.

### Dependencies
- `react-native-zip-archive` — native zip/unzip for backup files
- `expo-document-picker` — file picker for .dfw import

---

## 11. Screen Decomposition Pattern

### Thin shell + hook + card components
Large list screens are split into three layers:
1. **Screen (thin render shell)** — layout only: background, header, filters, FlatList, FAB, toast/modal. Reads state from hook, delegates rendering to card components.
2. **Custom hook (`src/hooks/useX.ts`)** — all state, effects, callbacks, memos. No UI imports (no `useTheme`, no safe-area-context, no components).
3. **Card components** — reusable, `React.memo`-wrapped, own their styles, own their haptics. Get data + handlers via props.

### Decomposed screens

**NotepadScreen** (896 → 232 lines):
- `useNotepad.ts` — state, effects (editor visibility, undo toast, pin logic, custom color migration, welcome-note, widget pending-action routing, AppState refresh)
- `NoteCard.tsx` — active note card (swipe-to-delete, clipboard long-press, pin toggle, relative time)
- `DeletedNoteCard.tsx` — restore + forever buttons

**AlarmListScreen** (556 → 278 lines):
- `useAlarmList.ts` — state + sort/filter memoization (time/created/name; all/active/one-time/recurring/deleted; undo toast with pin restoration)
- `DeletedAlarmCard.tsx` — deleted alarm card; uses existing `AlarmCard.tsx` for active alarms

### Shared utilities
`src/utils/time.ts` provides `getRelativeTime()` and `formatDeletedAgo()`.

### Decomposition rules
- Hook must NOT import RN UI modules, theme context, safe-area-context, or any `src/components/*`.
- Hook exposes state setters only when screen needs them (e.g., `setBgUri` so screen's `<Image onError>` can null it).
- Cards own their own `useMemo(StyleSheet.create)` — not forwarded from parent.
- Cards wrapped with `React.memo` for FlatList performance.

---

## 12. FlatList OOM Prevention

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

## 13. Chess Engine Architecture

### Files
| File | Purpose |
|------|---------|
| `src/services/chessAI.ts` | Local engine: minimax + alpha-beta, IDS, quiescence, move ordering, eval, time budget, difficulty levels |
| `src/services/cloudStockfish.ts` | Lichess cloud eval client — primary move source for all difficulties |
| `src/services/chessStorage.ts` | SQLite persistence for `chess_game` table |
| `src/services/blunderRoast.ts` | Bridges `analyzeMove` to roast text selection with recent-roast dedupe |
| `src/data/chessRoasts.ts` | 5-tier roast pool + take-back pool, 58 total lines |
| `src/data/chessAssets.ts` | Piece → image mapping, 12 Staunton PNGs (`assets/chess/{w,b}{P,N,B,R,Q,K}.png`) |
| `src/data/openingBook.ts` | 104 FEN→SAN positions + `positionKey()`. ~6-10 plies of Italian, Ruy Lopez, QG, London, English, Sicilian, French, Caro-Kann, KID, Slav theory. Generated by `scripts/gen-opening-book.js` |
| `src/hooks/useChess.ts` | Game state + AI scheduling + moves + persistence + roast + take-back + resign |
| `src/screens/ChessScreen.tsx` | Thin render shell |

### Search Pipeline
- **minimax** (recursive, alpha-beta): iterates ordered legal moves, passes down tightened alpha/beta.
- **quiescence** (at depth 0): stand-pat + only search captures until position is quiet. Delta pruning skips captures whose best gain can't reach alpha. Prevents horizon-effect.
- **findBestMove** (iterative deepening): searches depth 1 → maxDepth. After each completed depth, moves PV to front of `ordered` so next depth searches it first. Carries alpha/beta across root siblings.
- **Time budget**: module-level `searchDeadline` polled by `isTimeUp()` at top of every minimax call. Partial depth discarded on timeout; previous completed depth's best move returned.
- **Move ordering**: `orderMoves` sorts by MVV-LVA + check bonus. Applied at root AND inside minimax.

### Evaluation Terms
1. Material (P 100, N 320, B 330, R 500, Q 900, K 20000)
2. Piece-square tables (Chess Programming Wiki values; middlegame + endgame king tables)
3. Bishop pair (±50cp)
4. Doubled pawns (−15cp per extra pawn on same file)
5. Isolated pawns (−10cp)
6. King safety (middlegame only): pawn shield within 1 square, +15cp per shield pawn
7. Mobility: 3cp per legal move for side to move

### Difficulty Levels
Single source of truth in `chessAI.ts`: `DIFFICULTY_LEVELS` with `minDepth`/`maxDepth`/`timeLimitMs`/`randomness` (local) and `cloudPickRange` (cloud). `useChess.ts` imports `TIME_LIMITS_MS` — no parallel constants.

| Idx | Name | Min | Max | Time | Rand | Cloud |
|-----|------|-----|-----|------|------|-------|
| 0 | Easy | 1 | 2 | 300ms | 0.4 | 2-4 |
| 1 | Intermediate | 1 | 3 | 500ms | 0.15 | 1-3 |
| 2 | Hard | 2 | 4 | 1000ms | 0.05 | 0-2 |
| 3 | Expert | 3 | 5 | 2000ms | 0 | 0-1 |
| 4 | Master | 3 | 6 | 3000ms | 0 | 0 |

Randomness path: find best move with deep search, then score all moves with static eval and pick randomly from candidates within threshold.

### useChess Hook — Key Patterns
- Chess instance in a ref, re-render triggered by a version counter (`bump()`). Avoids expensive clone-on-every-move.
- `sessionIdRef` incremented on startGame, newGame, resign, unmount. Deferred callbacks check session before mutating state → prevents stale AI moves after the user left/resigned/restarted.
- Refs mirror state for sync access inside closures (`playerColorRef`, `difficultyRef`, `takeBackUsedRef`, `blunderCountRef`, `startedAtRef`) — setState is async.
- AI scheduling: 400ms pre-delay → `InteractionManager.runAfterInteractions` → `setIsAIThinking(true)` → 400ms think → inner `setTimeout(0)` yield → book/cloud/local resolves move → apply.
- Difficulty clamp on restore: `Math.min(Math.max(saved.difficulty, 0), 4)` in both `loadChessGame` and `chessStorage.rowToGame`.
- Restore from saved game: replays all saved SAN moves on a fresh `new Chess()` to rebuild `_history` (raw FEN load produces empty history, breaks take-back + move count).

### Blunder Analysis
`setTimeout(0)` after every player move so the board renders first. `analyzeMove(fenBefore, playedSan, 2)` runs `findBestMove` at depth 2, then scores both the best move and the played move via shallow minimax (depth 1). Severity by centipawn loss: good <50, inaccuracy <150, mistake <300, blunder <600, catastrophe ≥600. Blunder + catastrophe increment `blunderCountRef`. Take-back has its own roast pool.

---

## 14. Checkers Engine Architecture

### Files
| File | Purpose |
|------|---------|
| `src/services/checkersAI.ts` | Local engine: minimax + alpha-beta, TT, killer moves, IDS, forced capture, multi-jump, king promotion. Exports `getAIMove`, `getTopMoves` (cloud parity), `DIFFICULTY_LEVELS` (with `cloudPickRange`) |
| `src/services/cloudCheckers.ts` | Firebase Cloud Function client — primary move source for all difficulties |
| `functions/src/checkersEngine.ts` | Server copy of the engine — exports `getTopMoves` only |
| `functions/src/index.ts` | `checkersAI` onRequest HTTPS function — 512MiB, 30s timeout, `cors: true` |
| `src/services/checkersStorage.ts` | SQLite persistence for `checkers_game` table |
| `src/data/checkersAssets.ts` | 4 checker PNGs (red, red-king, black, black-king) |
| `src/hooks/useCheckers.ts` | Game state + AI scheduling + moves + persistence + resign |
| `src/screens/CheckersScreen.tsx` | Thin render shell |
| `__tests__/checkersAI.test.ts` | Engine tests — setup, move gen, jumps, multi-jumps, kings, promotion, forced capture, game over, evaluation, all difficulties, serialization, TT, mate ply, eval perf, `getTopMoves` ranking, `cloudPickRange` model |

### Board Representation
8×8 `(Piece | null)[][]`. Only dark squares `((row + col) % 2 === 1)` hold pieces. Red rows 5-7 (bottom), black rows 0-2 (top). Red moves toward row 0, black toward row 7. Red moves first.

### Move Generation (American Rules)
1. All jumps via recursive DFS (`findJumpChains`). Multi-jumps are single moves with multiple captures.
2. If any jumps exist for any piece, return ONLY jumps (forced capture rule).
3. No jumps → simple diagonal moves (forward only for regular pieces, all 4 for kings).
4. **Promotion stops the chain:** non-king landing on back rank during multi-jump ends there (crowned, no continue-as-king). Kings unaffected.

### Evaluation
Pure material + positional — no `generateMoves` calls in the hot path. Terms: material (piece=100, king=160; scales to 200 in endgame when `totalPieces <= 8`), advancement bonus (×1.5 for non-kings in endgame), king center preference (+8 rows 3-4 cols 2-5; +18 in endgame), back rank bonus (+8 for non-kings on own back rank), mobility (`mobilityScore` — open adjacent squares, −8 if trapped), piece support (`isSupported` — backward-diagonal friend, plus all-diagonals for kings), connected formation (`hasConnectedFriend`), king edge penalty (−5), double-corner penalty (−3). No pieces: ±100000.

### Search
Same patterns as chess (minimax, alpha-beta, TT, killers, IDS) but simpler:
- No quiescence search (forced captures make positions naturally quiescent)
- No opening book, no null-move pruning
- Mate scores include ply penalty (`-100000 + ply` / `100000 - ply`)
- TT: 100K entries, board serialized as 33-char string (32 dark squares + turn)

### Difficulty Levels
| Idx | Name | Min | Max | Time | Rand | Cloud |
|-----|------|-----|-----|------|------|-------|
| 0 | Beginner | 2 | 4 | 500ms | 0.4 | 2-4 |
| 1 | Casual | 3 | 6 | 800ms | 0.2 | 1-3 |
| 2 | Intermediate | 4 | 8 | 1.5s | 0.05 | 0-2 |
| 3 | Advanced | 5 | 10 | 3s | 0 | 0-1 |
| 4 | Expert | 6 | 14 | 5s | 0 | 0 |

Deeper than chess due to lower branching factor (~7-10 moves vs ~30-35). The Cloud Function searches deeper still (`maxDepth=20, timeLimitMs=6000`) because server CPU is affordable.

### Key Differences from Chess Engine
- No external library (chess has chess.js). Board is a raw 2D array.
- `applyMove` returns a new board (immutable), not in-place mutation.
- No quiescence search, no opening book, no null-move pruning, no blunder analysis.
- No take-back, no roasts.
- Board flipped 180° for black player (same as chess).
