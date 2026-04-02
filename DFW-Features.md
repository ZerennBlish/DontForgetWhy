# DFW Features
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** April 1, 2026*

---

## 1. App Features — Current State

### Core Utility
- **Home Screen** — app entry point (v1.9.0). 2×3 icon grid: Alarms (sectionAlarm), Reminders (sectionReminder), Calendar (sectionCalendar), Notepad (sectionNotepad), Voice (sectionVoice), Games (sectionGames). Section colors defined per theme. Quick Capture row: New Note, Record Memo, Set Timer (one-tap actions). Personality banner: 63 rotating color-coded sarcastic quotes across 7 sections (homeBannerQuotes.ts). Today section: scrollable container showing today's alarms and reminders. Settings gear in title bar. Forget Log accessible from Settings.
- **Alarms** — standalone AlarmListScreen (AlarmsTab deleted and absorbed, Session 9). Reason field ("why"), 7 sound presets + custom system sounds (listed via native `AlarmChannelModule.getSystemAlarmSounds` using `RingtoneManager.TYPE_ALARM` — replaced third-party `react-native-notification-sounds` in v1.8.1), snooze (1/3/5/10/15 min), recurring (daily/weekly/monthly/yearly) + one-time, emoji icon from keyboard, per-alarm Guess Why toggle, private mode (completely blank card)
  - Notification action buttons: "Snooze" and "Dismiss" buttons on alarm notification banners for in-app dismissal without opening fire screen
- **Reminders** — standalone ReminderScreen with own route (`Reminders`), header, background, nav (Session 9). Due dates, 5 recurring patterns (daily/weekly/monthly/yearly/one-time), 6-hour completion window, date-only mode, completion history, sound mode (sound/vibrate/silent), emoji icon
- **Timers** — standalone TimerScreen (extracted from AlarmListScreen in v1.9.0). 19+ presets + saveable custom timers with name/emoji, recently used (max 3) one-tap quick start, sound mode per timer, pinnable to widget, Timer Sound capsule
  - Notification action buttons: "Dismiss" button on timer completion notification
- **Notepad** — 999-char notes, 10 bg colors + custom, font color presets + custom (reanimated-color-picker), keyboard emoji input, hyperlinks (email/phone/URL), view mode with tappable links, share + print, soft delete with undo, pin to widget (max 4), image attachments (max 3 per note, gallery pick via expo-image-picker, JPEG quality 0.7). Notes-only (voice memos have own screen since v1.9.0). Card style with green section-colored border. Note icon circle uses the note's own color. Text capsule pin/delete buttons. Note editor dropdown: consolidated draw/photo/record/color into single "+" dropdown menu with labeled rows and View-based icons. Added "Take Photo" option (camera) alongside "Photo Library" (Session 9). "Edit" text button in view mode (replaced pencil emoji). Share button uses ShareIcon, trash uses TrashIcon.
- **Voice Memos** — standalone VoiceMemoListScreen (separated from Notepad in v1.9.0). VoiceRecordScreen (tap-to-record/stop, pause/resume), VoiceMemoDetailScreen (dual-mode: new via tempUri, existing via memoId, seekable playback, explicit Save), VoiceMemoCard (View-based play/pause icons, inline progress, capsule pin/delete). Pinning (max 4), soft delete with undo, dark bar card style with purple left border accent (#A29BFE). Calendar shows voice memos as purple dots. Note-attached voice memos share a 3-attachment limit with images.
- **Calendar** — In-app calendar view (CalendarScreen) accessible from main screen nav card. Uses react-native-calendars (JS-only). Month view with colored dot indicators: red=alarms, blue=reminders, green=notes. Custom dayComponent dims past dates. Three view modes (Day/Week/Month) with capsule tabs. Filter by type (All/Alarms/Reminders/Notes) in Week and Month views. Create buttons (+Alarm/+Reminder) prefill selected date via initialDate param. Handles one-time alarms, recurring weekly, recurring daily (empty days), reminders (all patterns), notes (local timezone bucketing). Week view locked to current week (always shows Sunday–Saturday containing today). Tapping a date outside current week while in week view auto-switches to day view. Supports initialDate route param for deep-linking from widget or other screens.
  - **Calendar fixes (dev):** Tappable event cards — alarm cards navigate to CreateAlarm, reminder cards to CreateReminder, note cards to Notepad. Annual/date-specific recurring reminders now correctly show only on matching month/day (previously showed on every day due to missing dueDate check).
- **Calendar Widget** — Home screen widget showing current month as a mini grid. Colored dots per day: red=alarms, blue=reminders, green=notes. Tap any day → opens CalendarScreen focused on that date. Today highlighted with accent background. Past days dimmed. Adjacent month days shown in secondary color. Registered as third widget in app.json (minWidth 250dp, minHeight 280dp).
- **DND bypass** — Notifee full-screen intent + Samsung onboarding
- **Full-screen alarm fire** — lightbulb background (or per-alarm photo if set), snooze shame (4 tiers × 7 messages), shows 🔇 when silenced
- **Native MediaPlayer sound** — plays through STREAM_ALARM regardless of ringer mode. Notification channels are SILENT. MediaPlayer handles all audio.

### Notification Action Buttons (v1.3.9)
- Alarm notifications display "Snooze" and "Dismiss" inline action buttons
- Timer-done notifications display "Dismiss" only (no snooze for timers)
- NOT added to: timer countdown, reminder, or preview notifications
- Handlers in both index.ts (background) and App.tsx (foreground) process ACTION_PRESS events
- Dismiss: stops sound, cancels notification + countdown, soft-deletes one-time alarms, cleans up timer state, marks notification as handled
- Snooze: stops sound, sets snoozing flag (enforced — aborts on failure), cancels notification, schedules snooze, persists snooze notification ID via updateSingleAlarm, marks as handled
- Solves "pulled out of app" problem — users handle alarms/timers from notification banner without leaving current app
- **v1.4.0 behavior change:** Foreground DELIVERED events now play sound only — no auto-navigation to AlarmFireScreen. Users interact via notification action buttons or tap notification body to optionally open fire screen. Eliminates race condition where timer dismiss failed due to competing DELIVERED navigation.

### Time Input System
- Global preference: Scroll (rolodex) vs Type (text inputs) in Settings
- Scroll: 3-row rolodex modal, AM/PM auto-flip on boundary crossing
- Type: inline TextInputs with per-keystroke validation, auto-advance
- TimePicker fix: parent callbacks only in onMomentumScrollEnd (not onScroll) — prevents infinite re-render

### Guess Why System (Per-Alarm)
- Per-alarm toggle on CreateAlarmScreen (between note and Private)
- Eligibility: requires nickname OR note ≥ 3 chars OR icon
- Runtime: AlarmFireScreen checks `alarm.guessWhy`, validates clue exists
- Pre-game: icon and note hidden until game played. Nickname always visible.
- Not on reminders — reminders don't fire through AlarmFireScreen

### Sound Mode System
- Single cycling icon: 🔔 Sound → 📳 Vibrate → 🔇 Silent
- Sound chirp via expo-audio on Sound transition (createAudioPlayer, volume 0.3, auto-release on completion)
- Global Silence All in Settings with duration picker
- Two-layer enforcement: schedule-time channel swap + fire-time MediaPlayer skip

### Mini-Games
- **Guess Why** (per-alarm, icon + type modes, 3 attempts)
- **Trivia** (912+ questions, 10 categories incl. Kids/Music/Movies&TV, difficulty filter, speed selector, online mode placeholder)
- **Memory Match** (3 difficulties, card flip animation, star rating)
- **Sudoku** (pure JS generator, difficulty = assistance level, no lose condition, pencil notes, save/resume)
- **Daily Riddle** (146 riddles, deterministic daily, streak tracking, browse all)
- **Memory Score** (5 games × 20 pts = 100. Ranks from "Who Are You Again? 🐟" to "The One Who Remembers 👑")

### Home Screen Widgets (4)
- **Memory's Timeline (DetailedWidget):** Header "Memory's Timeline", two-column timers/alarms, reminder bars, nav capsules, footer "Don't Forget Why". Themed.
- **Forget Me Notes (NotepadWidget):** Header redesigned (Session 9): mic icon (RECORD_VOICE), "Voice" capsule (OPEN_VOICE_MEMOS), centered title "Forget Me Notes" (OPEN_NOTES), "Notes" capsule (OPEN_NOTES), note icon (ADD_NOTE). Size increased from 180×180dp to 300×280dp. Mixed notes + voice memos with pinned-first sort (`isPinned` field), sliced to 4. VoiceMemoCell uses theme colors. Footer "Don't Forget Why". Deep-link click actions for notes, voice memos, and recording.
- **Misplaced Thoughts (CalendarWidget):** Header "Misplaced Thoughts", mini monthly calendar grid with colored dot indicators, shows current month. Footer "Don't Forget Why".
- **Memory's Voice (MicWidget):** Header "Memory's Voice" with OPEN_VOICE_MEMOS action. Standalone 110dp widget, mic icon + "Record" text, footer "Don't Forget Why", tap opens VoiceRecordScreen (RECORD_VOICE).
- All: resizable, deep-link to app sections, privacy guards on private alarms

### Theme System (Session 9 overhaul)
- 4 themes: Dark, Light, High Contrast, Vivid — each with section-specific color palettes
- Custom theme picker removed (personalization via background images)
- ThemeColors includes section color tokens (`sectionAlarm`, `sectionReminder`, etc.) — all hardcoded hex values replaced with theme references
- Mode-aware rendering: background overlays, capsule buttons, watermark opacity, card backgrounds all branch on `colors.mode`
- Card depth: elevation/shadow added to all card types for visual separation
- Migration from all old theme names (midnight→dark, frost→light, etc.)

### Icon System (Session 9)
- `src/components/Icons.tsx`: 29+ View-based icons replacing emoji throughout app
- All icons take `{ color: string; size?: number }`, default size 20, scale proportionally
- Used in: HomeScreen grid, SettingsScreen (warning, chevrons), AlarmListScreen (fire streak), NoteEditorModal (share, trash), VoiceMemoDetailScreen (trash), HomeButton (house)
- Pin redesign: emoji pushpin → small accent dot as indicator, "Pin"/"Pinned" text capsule as button

### Privacy System
- Private alarms/reminders: completely blank cards (no icon, no nickname, no lock icon)
- Content only visible in edit screen. Widgets show generic ⏰ and "Alarm"

### Background Images
- Game screens: AI-generated themed backgrounds with dark overlays (0.55-0.7 opacity)
- Games Hub + Settings: semi-transparent cards over background images
- Main tabs: user photo background with configurable overlay (dark in dark mode, white in light mode, 30-80% opacity), or app icon watermark (0.15 dark / 0.06 light opacity) when no photo set
- Alarm fire: per-alarm photo background (if set) with 0.7 opacity overlay, or lightbulb.png default

### Sorting, Filtering, Soft Delete
- Alarms: sort by Time/Created/Name, filter by All/Active/One-time/Recurring. Default: All
- Reminders: sort by Due Date/Created/Name, filter by Active/Completed/Has Date
- Soft delete with UndoToast (5-second, key-based reset), 30-day auto-purge

---

## 2. P2 Implementation Details

### 2.1 Note Image Attachments (Audit 36 — Self-Audit)

**Scope:** Note image attachments (P2 2.1) — full feature implementation + audit fixes

**Findings (all resolved inline):**
- HIGH: Transaction order — save flow copied images before saving note, risking orphaned files on failure. Fixed — copy images first, save note in inner try/catch, rollback newly copied files on failure. Removed images deleted only after updateNote succeeds.
- MEDIUM: Duplicate React keys — thumbnail `key={uri}` breaks if same image picked twice. Fixed — `key={\`${uri}-${idx}\`}`.
- MEDIUM: Image-only notes blocked — validation rejected empty text even with images. Fixed — allow save if text OR images present.
- MEDIUM: Print broken images — file:// URIs in HTML img tags blocked by Android WebView. Fixed — `buildNoteHtml` helper converts to base64 data URIs via `FileSystem.File.base64()`.
- LOW: Thumbnail memory — full-size bitmaps decoded for 80x80 thumbnails. Fixed — `resizeMethod="resize"` on Image components.
- LOW: Share logic — upgraded to "Share Text" + "Share Photos" (Sharing.shareAsync per image) when images present. Print always uses white background (#FFFFFF) with dark text (#1A1A2E) for ink efficiency.

**Also completed:** Removed dedicated emoji picker from NoteEditorModal (keyboard emoji sufficient). Iterative thumbnail styling (border, spacing, positioning, safe area insets).

### 2.2 Notepad Drawing/Sketch Mode (March 26, 2026)

**Component:** `src/components/DrawingCanvas.tsx` — full-screen Skia canvas modal with PanResponder touch handling.

**Architecture:**
- Strokes stored as serializable `StrokeData` objects (`pathSvg` SVG string, `color`, `strokeWidth`) — no native SkPath objects in React state (avoids "Invalid prop value for SkPath" crash)
- SkPath objects memoized via `useMemo` keyed on strokes array — only rebuilt on stroke release/undo/clear, not during 60fps touch moves
- In-progress stroke tracked as `{x,y}[]` coordinate array in a ref, fresh SkPath built each render via `buildPathFromPoints`
- Canvas background rendered via `<Fill color={canvasBgColor}>` — captured in PNG snapshot

**Drawing tools (bottom toolbar):**
- Pen (default) — draws colored strokes with round caps/joins
- Eraser — draws in current background color (works on any background, not just white)
- Color palette — 8 preset colors + custom color via reanimated-color-picker
- Canvas background color — BG button opens separate color picker modal
- Stroke widths — XS(1), S(3 default), M(6), L(12)
- Undo — removes last completed stroke
- Clear — Alert confirmation, then clears all strokes
- Cancel — prompts "Discard Drawing?" if strokes exist
- Done — blocks empty canvas save with toast

**S Pen pressure:** `nativeEvent.force` sampled once per stroke on `onPanResponderGrant`. Formula: `baseWidth * pressure * 2`. Falls back to base width when force unavailable (finger input).

**Save flow:**
- `canvasRef.makeImageSnapshot()` → `encodeToBytes(ImageFormat.PNG)` → `File.write(bytes)`
- Companion JSON: `{ strokes: StrokeData[], bgColor: string }` saved alongside PNG (same basename, `.json` extension)
- File naming: `drawing_${Date.now()}_${uuid8}.png` + `.json`

**Edit flow:**
- `loadDrawingData(imageUri)` checks for companion `.json` — returns `{strokes, bgColor}` or null (photos)
- Thumbnail tap in NoteEditorModal shows View/Edit alert for drawings, direct lightbox for photos
- Editing generates new filename (cache bust for React Native Image), deletes old PNG + JSON
- `saveNoteImage` detects `.png` extension, copies companion `.json` alongside through the save pipeline

**Share modal:** Custom dark modal (`shareModalStyles`) replacing `Alert.alert` (Android 3-button limit workaround). Options: Share Text (always), Share Photos (when images, correct MIME per file), Share as PDF (`buildNoteHtml` → `Print.printToFileAsync` → `Sharing.shareAsync`), Print, Cancel.

**Print/share fixes:** `buildNoteHtml` detects `.png`/`.jpg` for correct MIME type (`image/png` vs `image/jpeg`) in base64 data URIs.

**Audit 37 findings (all resolved):**
- HIGH: Drawing persistence — `saveNoteImage` now detects .png extension, copies companion .json
- HIGH: Performance — `parsedStrokes` memoized via `useMemo`, eliminates per-frame `MakeFromSVGString`
- HIGH: `loadDrawingData` early-returns null for .jpg files (no reading multi-MB photos as text)
- MEDIUM: Image cache after edit — new filename on edit (cache bust), deletes old files, replaces URI in editorImages
- MEDIUM: Print/share — MIME type detection for .png vs .jpg in buildNoteHtml and share handlers
- LOW: Empty canvas save blocked with toast
- LOW: Cancel confirmation when strokes exist

### 2.3 Custom Photo Background Underlay (March 27, 2026)

One user-selected photo shared across AlarmListScreen, NotepadScreen, CalendarScreen as a background underlay.

**Service:** `src/services/backgroundStorage.ts` — atomic save pattern (copy new file first, persist AsyncStorage key, then best-effort delete old file). Storage directory: `${Paths.document}backgrounds/`. Uses expo-file-system `File/Directory/Paths` API (same as noteImageStorage).

**AsyncStorage keys:** `bg_main` (file URI string), `bg_overlay_opacity` (number 0.3–0.8, default 0.5).

**Settings UI:** "Screen Background" section in SettingsScreen with:
- Photo picker (expo-image-picker, JPEG quality 0.7)
- Thumbnail preview of current background
- "Change Photo" button (checks saveBackground return for null/error)
- "Clear Background" button with Alert confirmation
- Opacity presets (30%–80%) as pill row

**Screen integration:** Conditional render pattern — when photo set: `ImageBackground` with photo + dark overlay at configured opacity. When not set: `fullscreenicon.png` watermark at 0.07 opacity. `onError` handler: `setBgUri(null)` if image fails to load (file deleted, corrupted).

### 2.4 Per-Alarm Photo on Fire Screen (March 27, 2026)

Optional photo per alarm that displays as full-bleed background on AlarmFireScreen when the alarm fires.

**Type change:** `photoUri?: string | null` added to Alarm interface.

**Service:** `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto(alarmId, sourceUri)` copies to `${Paths.document}alarm-photos/` as `alarm_${alarmId}_${timestamp}.jpg`. `deleteAlarmPhoto(uri)` best-effort delete. `alarmPhotoExists(uri)` synchronous existence check.

**Deferred save pattern (useAlarmForm.ts):**
- `pickPhoto()` stores ImagePicker's temporary cache URI in state — NO file copy
- `clearPhoto()` clears state — NO file delete
- `originalPhotoRef` tracks existing alarm's photo URI, `photoChangedRef` tracks if photo was modified
- On save: if `photoChangedRef` is true, copies temp file to permanent storage via `saveAlarmPhoto`, then best-effort deletes old photo via `originalPhotoRef`
- On cancel/unmount: no file mutations — temp cache managed by OS
- Alarm ID pre-generated via `useState(() => existingAlarm?.id || uuidv4())` so photo filename uses correct ID

**CreateAlarmScreen:** "Wake-up Photo" section between note char count and Guess Why toggle:
- Empty: dashed-border placeholder (120px, camera emoji, "Tap to add photo")
- Set: full-width thumbnail (160px, cover), tap to change, X button with Alert confirmation to clear

**AlarmFireScreen:** Conditional `ImageBackground` source:
- `photoFailed` state for fallback. `hasAlarmPhoto = !isTimer && !!alarm?.photoUri && !photoFailed`
- Both return paths (main view + snooze shame) use `bgSource` with `onError` handler
- Dark overlay stays at 0.7 opacity for readability
- Timers always use lightbulb.png (no photo support)

**Photo cleanup:** `permanentlyDeleteAlarm` and `purgeDeletedAlarms` (30-day) delete photo files. Soft-delete keeps photo on disk.

**Edit form validation:** `alarmPhotoExists(uri)` check on init — if file gone, initializes photoUri as null (prevents broken preview).

### 2.5 File Splits Completed (P2 Session)

- **NoteEditorModal.tsx** split into: `ShareNoteModal.tsx` (share/print modal), `ImageLightbox.tsx` (fullscreen image viewer), `noteColors.ts` (getTextColor utility)
- **CreateAlarmScreen/CreateReminderScreen:** extracted `DayPickerRow.tsx` component, `useAlarmForm.ts` hook (form state + photo + save logic), `useReminderForm.ts` hook
- **App.tsx:** extracted `useNotificationRouting.ts` hook (notification event handlers)

### 2.6 Back Button Header Consistency (P2 Session)

All screens with back buttons unified to Notepad pattern: fixed header above scroll content, centered title, absolute `BackButton` at `left: 20, top: insets.top + 10`.

**Screens updated:** Settings, Calendar, About, MemoryScore, Games, DailyRiddle, ForgetLog, Trivia, MemoryMatch, Sudoku.

**Intentionally excluded:** In-game views (Trivia gameplay, MemoryMatch gameplay, Sudoku active play) — these have custom top bars with game-specific info (score, timer, streak).

### 2.7 New Files Added in Phase 2

| File | Purpose |
|------|---------|
| `src/services/backgroundStorage.ts` | Shared screen background photo storage |
| `src/services/alarmPhotoStorage.ts` | Per-alarm photo save/delete/exists |
| `src/components/ShareNoteModal.tsx` | Share/print note modal (split from NoteEditorModal) |
| `src/components/ImageLightbox.tsx` | Fullscreen image viewer (split from NoteEditorModal) |
| `src/components/DayPickerRow.tsx` | Day-of-week picker row (split from CreateAlarmScreen) |
| `src/utils/noteColors.ts` | getTextColor contrast utility (split from NotepadScreen) |
| `src/hooks/useAlarmForm.ts` | Alarm form state + deferred photo save |
| `src/hooks/useReminderForm.ts` | Reminder form state |
| `src/hooks/useNotificationRouting.ts` | Notification event handlers (split from App.tsx) |

### 2.8 Dependencies (P2 2.3/2.4)

No new native dependencies — expo-image-picker and expo-file-system already installed from P2 2.1/2.2.

## 3. Voice Memo Implementation Details

### VoiceRecordScreen
Dedicated recording screen accessed via NotepadScreen mic FAB (bottom-left) or widget RECORD_VOICE action. Tap large circle to start recording (requests RECORD_AUDIO permission on first use). During recording: pause/resume button (left, #4CAF50 green) + stop button (right, red) in a row. `isPausedRef` (useRef) prevents rapid-tap race creating duplicate intervals. Random personality idle hints on idle state, "Recording..." / "Paused" indicator during recording. No post-recording UI — after `stopRecording` completes, immediately `navigation.replace('VoiceMemoDetail', { tempUri, duration })`. Transition guard (`transitionRef`) prevents rapid-tap races. AppState listener navigates to detail with partial recording on background. `beforeRemove` listener intercepts all back methods (hardware, gesture, custom) — stops recording and discards during recording, allows programmatic navigation via `navigatedRef`.

### VoiceMemoDetailScreen
Dual mode: accepts `{ tempUri, duration }` for new recordings OR `{ memoId }` for existing memos. **New recordings:** Save/Discard buttons at bottom. Save is transactional — `saveVoiceMemoFile` copies temp to permanent, `addVoiceMemo` writes metadata. If metadata fails, permanent copy deleted, temp file preserved for retry. `savingRef` blocks exit during save. **Existing memos:** explicit Save capsule in header (visible only when title/note differ from initial refs). `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating. Seekable playback: 44px touch target wrapping 6px progress bar, View-based play/pause icons (#4CAF50 green, 64x64), back/forward 5s skip buttons. `beforeRemove` listener: blocks during save, new recordings get "Discard recording?" alert, existing with changes get "Unsaved changes" alert (Cancel/Discard/Save & Exit). `exitingRef` prevents re-triggering. Soft delete with 30-day pattern and sassy confirmation dialog.

### VoiceMemoCard
Reusable list card component (`React.memo` wrapped, theme-aware via `useTheme`). View-based play/pause icons (CSS border triangle / dual bars) in #4CAF50 green circle (36x36). Center column: title (fallback "Voice Memo"), subtitle (formatted duration · relative time), mini progress bar (3px, visible when progress > 0). Capsule pin/delete buttons matching alarm/reminder pattern (dark pill, borderRadius 20, rgba(30,30,40,0.7)). Left purple border accent (#A29BFE). Card uses `colors.card + 'CC'` background and `colors.border`.

### VoiceMemoListScreen (v1.9.0)
Standalone voice memo list screen (separated from NotepadScreen). Accessed via Home screen Voice icon or widget deep links. Dark bar cards with purple accent borders (#A29BFE). Voice memo pinning: max 4 via `widgetPins.ts` functions, pin state preserved on undo delete via `deletedVoiceMemoPinnedRef` (useRef, not useState — fixes stale closure from same-render key increment). Voice memo undo toast with random personality messages. NotepadScreen is now notes-only.

### Storage
- `voiceMemoStorage.ts`: AsyncStorage CRUD with soft-delete. All mutator functions re-throw after console.error (audit 44 finding)
- `voiceMemoFileStorage.ts`: expo-file-system new API (File, Directory, Paths). Files at `${Paths.document}voice-memos/{memoId}_{timestamp}.m4a`
- `noteVoiceMemoStorage.ts`: separate service for note-attached voice memos (different from standalone)
- `widgetPins.ts`: voice memo pin functions (get/toggle/unpin/prune/isPinned) using `'widgetPinnedVoiceMemos'` AsyncStorage key, max 4 pins

### Permission
`android.permission.RECORD_AUDIO` added to app.json android.permissions array.

### Widget
NotepadWidget renders mixed notes + voice memos with pinned-first sort (`isPinned` field), sliced to 4. `VoiceMemoCell` uses `theme.cellBg` and `theme.text`. MicWidget: standalone 110dp widget for quick recording. Click actions route through `pendingVoiceAction` in AsyncStorage.

### Audits
- Audit 44 (Mar 30): 8 findings fixed (race conditions, stale closures, seek validation, widget sort, error swallowing)
- Audit 45 (Mar 30): 10 findings fixed (nav guards, transactional save, pin ordering, pause race, undo pin restore, theme colors, stale progress)
