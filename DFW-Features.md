# DFW Features
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 26 (April 11, 2026)

---

## 1. App Features — Current State

### Core Utility
- **Home Screen** — app entry point (v1.9.0). 2×3 icon grid: Alarms (sectionAlarm), Reminders (sectionReminder), Calendar (sectionCalendar), Notepad (sectionNotepad), Voice (sectionVoice), Games (sectionGames). Section colors defined per theme. Quick Capture row: Quick Note, Quick Record, Quick Timer (one-tap actions, no icons). Personality banner: 63 rotating sarcastic quotes across 7 sections (homeBannerQuotes.ts, section colors resolved via `bannerColorMap` from theme tokens). Today section: scrollable container showing today's alarms and reminders. Settings gear in title bar. All overlay text bgUri-aware (Session 13).
- **Alarms** — standalone AlarmListScreen (AlarmsTab deleted and absorbed, Session 9). Reason field ("why"), 7 sound presets + custom system sounds (listed via native `AlarmChannelModule.getSystemAlarmSounds` using `RingtoneManager.TYPE_ALARM` — replaced third-party `react-native-notification-sounds` in v1.8.1), snooze (1/3/5/10/15 min), recurring (daily/weekly/monthly/yearly) + one-time, emoji icon from keyboard, per-alarm Guess Why toggle, private mode (completely blank card)
  - Notification action buttons: "Snooze" and "Dismiss" buttons on alarm notification banners for in-app dismissal without opening fire screen
- **Reminders** — standalone ReminderScreen with own route (`Reminders`), header, background, nav (Session 9). Due dates, 5 recurring patterns (daily/weekly/monthly/yearly/one-time), 6-hour completion window, date-only mode, completion history, sound mode (sound/vibrate/silent), emoji icon
- **Timers** — standalone TimerScreen (extracted from AlarmListScreen in v1.9.0). 19+ presets + saveable custom timers with name/emoji, recently used (max 3) one-tap quick start, sound mode per timer, pinnable to widget, Timer Sound capsule. Pin redesign (Session 12): small "Pin"/"Pinned" capsule overlay on upper-left of all preset cards — no emoji pins, no modal pin button.
  - Notification action buttons: "Dismiss" button on timer completion notification
- **Notepad** — 999-char notes, 10 bg colors + custom, font color presets + custom (reanimated-color-picker), keyboard emoji input, hyperlinks (email/phone/URL), view mode with tappable links, share + print, soft delete with undo, pin to widget (max 4), image attachments (max 3 per note, gallery pick via expo-image-picker, JPEG quality 0.7). Notes-only (voice memos have own screen since v1.9.0). Card style with green section-colored border. Note icon circle uses the note's own color. Text capsule pin/delete buttons. Note editor dropdown: consolidated draw/photo/record/color into single "+" dropdown menu with labeled rows and View-based icons. NoteEditorModal: view/edit mode with centered accent pills — "Edit" in view mode (moved from topBarRight to topBarCenter, Session 13), "Save" only when `hasUnsavedChanges()`. Recording controls (Session 12): proper pause (green) + stop (red) button row. Home button in modal with unsaved changes guard. Voice memos stored as `voiceMemos TEXT` column in notes table (JSON array).
- **Voice Memos** — standalone VoiceMemoListScreen (separated from Notepad in v1.9.0). VoiceRecordScreen (tap-to-record/stop, pause/resume; Session 26: camera button bottom-right corner for in-flow photo capture), VoiceMemoDetailScreen (view/edit mode with circle Edit/Save icon buttons in headerRight matching NoteEditorModal pattern), VoiceMemoCard (View-based play/pause icons, inline progress, capsule pin/delete). Pinning (max 4), soft delete with undo, dark bar card style with purple left border accent (#A29BFE). Calendar shows voice memos as purple dots. Note-attached voice memos share a 3-attachment limit with images.
  - **Voice memo clips (Session 26):** A memo is a container holding multiple audio clips. Each clip has its own audio file, duration, position ordering, and optional label (default shows formatted createdAt timestamp, tappable in edit mode to rename). "Add Clip" button on detail screen navigates to VoiceRecordScreen in `addToMemoId` mode to append a clip. Clip rows show play/pause icon + label + duration + delete X (edit mode). Legacy single-uri memos auto-migrate to clip rows on first launch
  - **Clip playback modes (Session 26):** Stop (selected clip plays once and stops), Play All (auto-advances to next clip when current finishes), Repeat (loops the current clip). Toggle pills below the playback controls in detail screen. Persisted globally in kv `clipPlaybackMode` — most users pick one mode and leave it
  - **Voice memo photos (Session 26):** Camera button on VoiceRecordScreen for in-flow capture (always visible, blocked during recording), camera + gallery buttons on VoiceMemoDetailScreen edit mode for picker workflows. Photo strip (80×80 thumbnails) sits between title/note and the Clips list. Tap any photo to open `ImageLightbox`. Edit mode shows red X delete badges on each thumbnail. 5-photo cap per memo (counts existing + newly captured in add-clip flow). Photos stored in `voice-memo-images/`, included in backup/restore
- **Calendar** — In-app calendar view (CalendarScreen) accessible from main screen nav card. Uses react-native-calendars (JS-only). Month view with colored dot indicators: red=alarms, blue=reminders, green=notes. Custom dayComponent dims past dates. Three view modes (Day/Week/Month) with capsule tabs. Filter by type (All/Alarms/Reminders/Notes) in Week and Month views. Create buttons (+Alarm/+Reminder) prefill selected date via initialDate param. Handles one-time alarms, recurring weekly, recurring daily (empty days), reminders (all patterns), notes (local timezone bucketing). Week view locked to current week (always shows Sunday–Saturday containing today). Tapping a date outside current week while in week view auto-switches to day view. Supports initialDate route param for deep-linking from widget or other screens.
  - **Calendar empty state art (Session 21):** Three color cartoon illustrations replacing emoji — hammock (day view), beach chair (week view), couch (month view). Calendar chrome icon refresh: grid-based calendar replacing "15" number icon.
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
- **Trivia** (912+ questions, 10 categories incl. Kids/Music/Movies&TV, difficulty filter, speed selector, online mode toggle in header — disabled, coming soon)
- **Memory Match** (3 difficulties, card flip animation, star rating). Header text-only (emoji stripped Session 12).
- **Sudoku** (pure JS generator, difficulty = assistance level, no lose condition, pencil notes, save/resume)
- **Daily Riddle** (146 riddles, deterministic daily, streak tracking, browse all)
- **Chess** (Session 16, engine hardened Session 17) — vs CPU, 5 difficulty levels, iterative-deepening minimax with quiescence search. Engine extras (Session 17): opening book of 104 hardcoded positions for instant play through the first 6-10 plies, 100K-entry FEN-keyed transposition table with mate-score ply adjustment, killer-move ordering, null-move pruning, tapered evaluation (continuous material phase blending MG/EG king PSTs), passed-pawn bonus, rook on open/semi-open file bonus, and a min-depth + max-time difficulty model with a 3× safety-deadline ceiling. Player picks color + difficulty before each game. In-game roasts when you blunder (depth-2 sanity check after each move, 58-line roast pool across 5 severity tiers). One take-back per game with its own roast pool. Game state persists to SQLite across app close. Memory Score: 5/8/12/18/25 win points per difficulty, half for draw.
- **Checkers** (Session 18) — vs CPU, 5 difficulty levels (Beginner through Expert), American rules (forced captures, promotion ends turn). Pure JS engine: minimax with alpha-beta, transposition table, killer moves, iterative deepening. No external deps. Checker piece PNGs (red, red-king, black, black-king) + weathered wood table background (WebP). Player picks color + difficulty. No blunder roasts, no take-back. Game state persists to SQLite. Memory Score: same point scale as chess.
- **Memory Score** (now 7 games — Chess added Session 16, Checkers added Session 18. Max 140 points. Ranks from "Who Are You Again?" to "The One Who Remembers"). Header text-only (emoji stripped Session 12). Breakdown bars and detailed stat sections for all 7 games ordered: Guess Why, Daily Riddle, Chess, Checkers, Trivia, Sudoku, Memory Match.

### Game Sound Effects (Session 23)
- 11 sound files in `assets/sounds/` (wav format, bundled via metro.config.js assetExts)
- `gameSounds.ts` — cached toggle pattern matching haptics.ts, fire-and-forget via `createAudioPlayer` (expo-audio)
- `VOLUMES: Record<SoundName, number>` map for per-sound volume control
- Settings toggle: "Game Sounds" (default ON, stored in kv as `gameSoundsEnabled`)
- Sound mapping:
  - Chess: pickUp (select piece), chessPlace (move), capture, promote, gameWin, gameLoss
  - Checkers: pickUp (select piece), checkersMove, capture (shared), promote (shared for king), gameWin (shared), gameLoss (shared)
  - Memory Match: cardFlip, flipBack (mismatch), memoryWin
  - Sudoku (Session 25): pencil sound on number placement, eraser sound on cell clear
  - Trivia (Session 25): dedicated trivia-tap sound (replaces generic tap), correct/wrong answer sounds
  - Daily Riddle (Session 25): triviaCorrect/triviaWrong on Got it/Nope buttons
  - UI: tap (game UI buttons only — not gameplay interactions like sudoku cells, trivia answers, card flips)

### Media Control Icons (Session 23)
- 5 WebP assets (512×512, transparent bg) in `assets/icons/`: game-play.webp (green character), play-app.webp, pause.webp, record.webp, stop.webp (chrome set)
- `src/assets/mediaIcons.ts` — asset registry + GlowIcon component
- GlowIcon: colored shadow spotlight, centered offset `{0,0}`, translucent fill (`glowColor + '20'`) for Android shadow hole fix, `borderRadius: size`
- Replaces all CSS border-triangle play/pause/stop icons and emoji characters (\u25B6, \u23F8, \u23F9, \u25A0)
- VoiceMemoCard playBtn intentionally keeps sectionVoice background (colored circle is intentional there)

### Close-X Chrome Icon (Session 23)
- `close-x.webp` (512×512, transparent bg) in `assets/app-icons/`
- Added to `appIconAssets.ts` as `APP_ICONS.closeX`
- Replaces all 15 `\u2715` unicode characters across 9 files
- Dead `CloseIcon` function removed from `Icons.tsx`

### FAB Buttons (Session 23 → Session 24 revision)
- **Session 23:** Colored backgrounds removed, glow shadow with `colors.accent`, centered, translucent fill, plus icon from `APP_ICONS.plus` at 40×40, standardized 56×56 / right: 24 / borderRadius 28 across all 4 FABs (AlarmList, Notepad, Reminder, VoiceMemoList).
- **Session 24:** Glow-shadow variant caused a visible Android hex-hole artifact inside the accent halo (polygon outline from elevation + translucent fill at low alpha). Replaced with the chrome-circle pattern used by `BackButton`/`HomeButton`: theme-aware `rgba(30, 30, 40, 0.8)` dark fill + 1px white-rgba border, **no elevation, no shadow**. Plus icon now renders with no `tintColor` so the natural silver-metallic `plus.webp` shows through. Same consistent chrome as the nav buttons.

### FAB / Nav Chrome Circle Pattern (Session 24)
Shared visual language for all circular chrome buttons (back, home, FAB):
```
backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)'
borderWidth: 1
borderColor:    colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
```
40×40 for nav buttons, 56×56 (borderRadius 28) for FABs. No elevation, no shadow — opaque-enough rgba fills the circle cleanly on Android without the polygon outline bug.

### NoteCard Silver Fallback (Session 24)
- `NoteCard.tsx` + `DeletedNoteCard.tsx` iconCircle: when `note.icon` is set, renders it as `<Text>`. When empty, falls back to `<Image source={APP_ICONS.notepad} size=22 />` — natural silver-metallic notepad (no `tintColor`) instead of the `📝` emoji
- `DeletedNoteCard.tsx` gained `Image` import + `APP_ICONS` import

### Voice Memo Clips (Session 26)
- Memos act as containers holding multiple audio clips. Each clip has its own audio file, position, duration, and optional label
- Default label = formatted createdAt timestamp (`Apr 11, 4:18 PM`); tap in edit mode to rename via inline TextInput. Empty submission reverts to the default
- "Add Clip" button on detail screen navigates to VoiceRecordScreen in `addToMemoId` mode — append a clip without creating a new memo
- Clip rows: play/pause icon · label · duration · delete X (edit mode only)
- Clips persist across the app close — no in-memory state, all reads via `voiceClipStorage.getClipsForMemo(memoId)`

### Clip Playback Modes (Session 26)
- **Stop:** plays the selected clip, then stops
- **Play All:** auto-advances to the next clip when the current finishes (does not loop back at end)
- **Repeat:** loops the current clip forever
- Three toggle pills below the playback controls in detail screen
- Persisted globally in kv `clipPlaybackMode` — most users pick one mode and leave it

### Voice Memo Photos (Session 26)
- Camera button on VoiceRecordScreen (bottom-right corner, always visible — even during recording, where it shows a "Stop recording first" toast)
- Camera + gallery 40×40 button row on VoiceMemoDetailScreen edit mode
- Photo strip (80×80 thumbnails) sits between title/note and the Clips list, both view and edit modes
- Tap any photo to view it in `ImageLightbox` (full-screen modal)
- Edit mode shows red X delete badges on each thumbnail with Alert confirmation
- 5 photos max per memo (counts existing + newly captured in add-clip flow)
- Stored in `voice-memo-images/`, included in backup/restore round-trip

### Timer Save vs Start (Session 26)
- Timer modal redesigned with three circle action buttons: red **cancel** (`closeX` icon), accent **save-only** (`save` floppy-disk icon), success **start** (`MEDIA_ICONS.play` icon)
- New `handleModalSaveOnly` saves the user timer preset (or updates an existing one, or sets a custom duration on a built-in preset) without auto-starting it. Three internal variants: `handleSaveCustomOnly`, `handleSaveNewTimerOnly`, `handleSaveEditTimerOnly`
- Toast feedback on success ("Saved", "Timer saved", "Timer updated")

### Icon Overhaul (Session 26)
- Two new chrome icons: `APP_ICONS.save` (floppy-disk) and `APP_ICONS.edit` (pencil), both 512×512 WebP. Stored in `assets/icons/` (next to existing chrome utility icons)
- Edit/Save text capsule buttons replaced with 40×40 circle icon buttons across **VoiceMemoDetailScreen**, **NoteEditorModal**, **CreateAlarmScreen**, **CreateReminderScreen**. Save circles use accent border to signal action; trash buttons use red border on those screens that gained the new pattern
- Sound mode + emoji circles in TimerScreen + CreateAlarmScreen got the standard tappable chrome circle treatment (mode-aware dark fill + 1.5px border, 40-48px depending on context)
- Reminder + Timer + Alarm icon-picker fallback shows silver `+` instead of the default emoji until the user picks one (Reminder treats the notepad emoji `\u{1F4DD}` sentinel as "no choice")
- Calendar inline icons next to "Set date" restructured into proper flex `<View>` rows with the Image and Text as siblings (was inline `<Image>` inside `<Text>` with broken Android baseline alignment)

### Notes Redesign (Session 27)
- Notes now have an **optional title field** displayed above the body text in both edit and view modes. Stored as `title TEXT NOT NULL DEFAULT ''` on the notes table; empty string means no title. NoteCard and DeletedNoteCard show the title as the primary line when non-empty, body text as a 2-line preview below (15pt semiBold title, 13pt regular preview at 60% opacity).
- **Text length is unlimited** (previously capped at 999 characters). `MAX_NOTE_LENGTH` constant removed. `renderLinkedText` regex parser is memoized, so long text in view mode remains performant.
- **Voice recording removed** — notes are text + images + drawings only. Existing notes with voice memos retain read-only playback via `MemoCard`. All recording-related state (`isRecording`, `isPaused`, `useAudioRecorder`, `handleMicPress`, AppState listener, `newVoiceMemosRef` cleanup loop) was deleted from the hook. `RecordingControls` component removed from `NoteVoiceMemo.tsx`.
- **Bottom toolbar** replaces the old dropdown menu. Edit mode only. Five persistent action buttons: **Attached** (paperclip, shows count badge), **Camera**, **Gallery**, **Draw**, **Colors**. Colors and Attached buttons show active-state borders when their panels are open.
- **Attachments panel pattern** — images hidden behind the paperclip button in edit mode, shown inline in view mode. The panel sits between the body content and the toolbar. Attachments and color picker are mutually exclusive (only one panel open at a time). Hardware back button peels overlays in order: attachments panel → color picker → confirm close.
- **Scrollable image strip** — horizontal `ScrollView` wrapped, 120×120 thumbnails centered via `flexGrow: 1, justifyContent: 'center'`. Supports up to **5 attachments** (previously 3). Red X delete button inside the photo bounds with white border + 16px `hitSlop` for reliable tapping.
- **Color picker dismissal** — auto-dismisses on: hardware back, text input focus, Camera/Gallery/Draw actions. The toggle itself swaps state.
- **Icon size consistency pass** — save/edit bumped from 18 → 24, trash → 20 (circle buttons), toolbar icons unified (paperclip 34, camera/gallery 24, draw 28, palette 38), HomeButton 20 → 24, BackButton 20 → 22 across 10+ files.
- **Share integration** — title wired through `handleShare` eligibility check, passed to `ShareNoteModal` as `noteTitle` prop, rendered as `<h2>` in the HTML PDF/Print export, prepended with a newline separator in the text share option.

### Play Store Listing (Session 22)
- 8 screenshots: Home, Alarms/Reminders/Calendar, Chess/Checkers/Memory, Notes, Timers, Settings, Widgets, Alarm Fire
- Description updated with Chess, backup section, corrected theme count to 6

### Home Screen Widgets (4)
- **Memory's Timeline (DetailedWidget):** Header "Memory's Timeline", two-column timers/alarms, reminder bars, nav capsules colored per section (sectionAlarm/sectionTimer/sectionReminder), footer "Don't Forget Why". Themed with section colors (Session 11).
- **Forget Me Notes (NotepadWidget):** Header redesigned (Session 9): mic icon (RECORD_VOICE), "Voice" capsule (OPEN_VOICE_MEMOS, sectionVoice), centered title "Forget Me Notes" (OPEN_NOTES), "Notes" capsule (OPEN_NOTES, sectionNotepad), note icon (ADD_NOTE). Size increased from 180×180dp to 300×280dp. Mixed notes + voice memos with pinned-first sort (`isPinned` field), sliced to 4. VoiceMemoCell uses theme colors. Footer "Don't Forget Why". Deep-link click actions for notes, voice memos, and recording. Header capsules use section colors (Session 11).
- **Misplaced Thoughts (CalendarWidget):** Header "Misplaced Thoughts", mini monthly calendar grid with colored dot indicators, shows current month. Month label uses sectionCalendar (Session 11). Footer "Don't Forget Why".
- **Memory's Voice (MicWidget):** Standalone 1×1 widget (70dp min, Session 11 resize). Red record circle + footer "Don't Forget Why", tap opens VoiceRecordScreen (RECORD_VOICE). Uses sectionVoice + theme.red for record button.
- All: resizable, deep-link to app sections, privacy guards on private alarms
- **WidgetTheme** expanded with `red` property for theme-aware red across widgets (Session 11)

### Theme System (Session 9 overhaul, Session 13 expansion)
- 6 themes (3 dark + 3 light): Dark, Light (Ocean), High Contrast, Vivid, Sunset, Ruby
  - **Dark:** Blue accent (#5B9EE6), midnight background — daily driver
  - **Light (Ocean):** Blue accent (#2563EB), blue-gray background — clean and modern
  - **High Contrast:** Cyan accent (#00D4FF), pure black — accessibility
  - **Vivid:** Neon green accent (#00FF88), green-tinted blacks — cyberpunk terminal
  - **Sunset:** Orange accent (#E8690A), warm cream background — earthy warmth
  - **Ruby:** Rose accent (#E11D48), pink-tinted background — bold and feminine
- Custom theme picker removed (personalization via background images)
- ThemeColors includes section color tokens (`sectionAlarm`, `sectionReminder`, etc.) — all hardcoded hex values replaced with theme references
- Mode-aware rendering: capsule buttons, watermark opacity branch on `colors.mode`. Photo overlay always dark dim regardless of mode.
- Light mode card tinting: cards use `sectionColor + '15'` background
- Photo-aware alphas on HomeScreen: grid/quick capture/today/banner increase opacity when background photo is set
- Card depth: elevation/shadow added to all card types
- Brand title: `colors.brandTitle` — per-theme title color on HomeScreen
- SettingsScreen theme grid: 3×2 layout with centered justification
- Migration from all old theme names (midnight→dark, frost→light, etc.)

### Font System (Sessions 21-22)
- Three-tier font system: Satisfy (app title "Don't Forget Why"), LilitaOne (game screen headers), Montserrat Alternates (everything else)
- Phase 1 (Session 21, headers): Satisfy for app title, LilitaOne for game headers, Montserrat Alternates ExtraBold for core screen headers
- Phase 2 (Session 22, body): Montserrat Alternates Regular/SemiBold/Bold/ExtraBold for all body text, labels, buttons, descriptions across 25 screens + 16 components + buttonStyles.ts
- Font swap (Session 22): originally Nunito, changed to Montserrat Alternates for more premium feel
- `fontWeight` replaced with `fontFamily` throughout — required for Android custom font rendering
- Font size reduction pass applied after swap to compensate for wider letterforms

### Swipe-to-Delete (Session 10)
- SwipeableRow component: swipe both directions (left or right) to reveal delete action
- Integrated on all 4 list screens: AlarmListScreen, ReminderScreen, NotepadScreen, VoiceMemoListScreen
- Delete buttons removed from cards — swipe replaces them, Pin stays as capsule button
- GestureHandlerRootView wraps App.tsx for gesture support

### Emoji Picker Modal (Sessions 10, 12, 16)
- EmojiPickerModal: bottom sheet modal with 11 categories × ~10 emojis each = 105 labeled emojis (Session 16 overhaul)
- Categories: Health, Routine, Food, Fitness, Home, Work/School, Finance, People, Travel, Pets, More
- Layout: horizontal capsule category tabs + 5-column labeled grid (emoji + label per cell). Container height 45%. Replaces the flat 133-emoji grid.
- Quick emoji rows are now context-specific (Session 16):
  - CreateAlarmScreen: 8 wake-up/alarm-specific emojis
  - CreateReminderScreen: 8 recurring-event emojis
- Replaces fragile TextInput keyboard emoji hack (broke 3 times during filter attempts)
- AlarmCard emoji made optional: no default fallback emoji, shows AlarmIcon when none selected

### Button Hierarchy (Sessions 10-11 — COMPLETE)
- Shared `buttonStyles.ts` with `getButtonStyles(colors)` returning 4 types × 2 sizes:
  - primary (accent background), secondary (capsule/outlined), destructive (red text), ghost (minimal)
  - Each type has large and small variants
- Applied to: CreateAlarmScreen, CreateReminderScreen, deleted card Restore/Forever buttons, SettingsScreen (silence modal, setup guide, background buttons), NoteEditorModal (color picker modals), DrawingPickerModal

### DrawingCanvas Refactor (Session 10)
- Modals extracted to DrawingPickerModal.tsx for safer editing and theming
- DrawingCanvas fully themed (was partially hardcoded)
- forceDark prop added to BackButton and HomeButton for contexts requiring dark appearance

### Section-Color Card Tinting (Session 10)
- Dark mode cards now use `sectionColor + '20'` background (was plain card color)
- Light mode uses `sectionColor + '15'` (established Session 9)
- Gives each section visual identity in both modes

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
Dual mode: accepts `{ tempUri, duration }` for new recordings OR `{ memoId }` for existing memos. **New recordings:** Save/Discard buttons at bottom. Save is transactional — `saveVoiceMemoFile` copies temp to permanent, `addVoiceMemo` writes metadata. If metadata fails, permanent copy deleted, temp file preserved for retry. `savingRef` blocks exit during save. **Existing memos:** explicit Save capsule in header (visible only when title/note differ from initial refs). `handleSaveExisting` returns `Promise<boolean>` — false on failure prevents "Save & Exit" from navigating. Seekable playback: 44px touch target wrapping 6px progress bar, View-based play/pause icons (#4CAF50 green, 64x64), back/forward 5s skip buttons. `beforeRemove` listener: blocks during save, new recordings get "Discard recording?" alert, existing with changes get "Unsaved changes" alert (Cancel/Discard/Save & Exit). `exitingRef` prevents re-triggering. Soft delete with 30-day pattern and sassy confirmation dialog. **Session 27:** note text length limit removed (was `maxLength={200}`, now unlimited); title retains `maxLength={100}`.

### VoiceMemoCard
Reusable list card component (`React.memo` wrapped, theme-aware via `useTheme`). View-based play/pause icons (CSS border triangle / dual bars) in #4CAF50 green circle (36x36). Center column: title (fallback "Voice Memo"), subtitle (formatted duration · relative time), mini progress bar (3px, visible when progress > 0). Capsule pin/delete buttons matching alarm/reminder pattern (dark pill, borderRadius 20, rgba(30,30,40,0.7)). Left purple border accent (#A29BFE). Card uses `colors.card + 'CC'` background and `colors.border`.

### VoiceMemoListScreen (v1.9.0)
Standalone voice memo list screen (separated from NotepadScreen). Accessed via Home screen Voice icon or widget deep links. Dark bar cards with purple accent borders (#A29BFE). Voice memo pinning: max 4 via `widgetPins.ts` functions, pin state preserved on undo delete via `deletedVoiceMemoPinnedRef` (useRef, not useState — fixes stale closure from same-render key increment). Voice memo undo toast with random personality messages. NotepadScreen is now notes-only.

### Storage
- `voiceMemoStorage.ts`: SQLite `voice_memos` table CRUD with soft-delete. All mutator functions re-throw after console.error (audit 44 finding)
- `voiceMemoFileStorage.ts`: expo-file-system new API (File, Directory, Paths). Files at `${Paths.document}voice-memos/{memoId}_{timestamp}.m4a`
- `noteVoiceMemoStorage.ts`: separate service for note-attached voice memos (different from standalone)
- `widgetPins.ts`: voice memo pin functions (get/toggle/unpin/prune/isPinned) using `'widgetPinnedVoiceMemos'` kv_store key, max 4 pins

### Permission
`android.permission.RECORD_AUDIO` added to app.json android.permissions array.

### Widget
NotepadWidget renders mixed notes + voice memos with pinned-first sort (`isPinned` field), sliced to 4. `VoiceMemoCell` uses `theme.cellBg` and `theme.text`. MicWidget: standalone 110dp widget for quick recording. Click actions route through `pendingVoiceAction` in kv_store.

### Audits
- Audit 44 (Mar 30): 8 findings fixed (race conditions, stale closures, seek validation, widget sort, error swallowing)
- Audit 45 (Mar 30): 10 findings fixed (nav guards, transactional save, pin ordering, pause race, undo pin restore, theme colors, stale progress)

---

## 4. Backup & Restore (v1.11.0)

### Backup & Restore
- Export Memories: .dfw file containing dfw.db + all media folders + manifest
- Import Memories: file picker, manifest validation, two-step confirmation, transactional restore with rollback
- Auto-export: SAF folder picker, daily/weekly/monthly frequency, silent export on app open
- Settings section: "Your Memories" with privacy messaging, export/import buttons, auto-export toggle, 30-day nudge
- Privacy: "We don't have servers. We don't want your data."

---

## 5. Onboarding Overhaul (v1.10.1, Session 14)

### Onboarding Overhaul
- Full rewrite with sarcastic personality copy
- View-based icons (no emoji)
- Mic + camera permission slides
- Theme cycling preview (all 6 themes cycle on swipe, local state only)
- Watermark background (fullscreenicon.webp)
- Sarcastic skip warnings on every permission
- Dynamic final slide based on skip count

---

## 6. Accessibility (v1.12.0, Session 15)

### Accessibility Pass
- All interactive elements across HomeScreen, NotepadScreen, AlarmListScreen, ReminderScreen, GamesScreen, AlarmCard, NoteCard, DeletedNoteCard, DeletedAlarmCard have `accessibilityLabel`, `accessibilityRole`, `accessibilityState` (for pills), and `accessibilityHint` (where clarifying)
- Filter/sort pills use `accessibilityState={{ selected }}` so TalkBack announces selection
- Cards get descriptive labels: alarm card reads time + nickname + enabled state; note card reads truncated first line
- Edit targets include "Tap to edit" hint; note cards include "Long press to copy" hint
- Switches get dynamic labels ("Enable alarm" / "Disable alarm")
- Pin buttons get contextual labels ("Pin to widget" / "Unpin from widget")
- Restore/Forever buttons explicitly labeled ("Restore alarm" / "Permanently delete note")

### Icon Accessibility
- `IconProps` interface now has optional `accessibilityLabel`
- Icons default to `importantForAccessibility="no-hide-descendants"` when no label (TalkBack skips decorative icons)
- When `accessibilityLabel` provided, becomes focusable with `accessible={true}` and `importantForAccessibility="yes"`
- Pattern: icons wrapped inside labeled TouchableOpacity stay decorative; standalone icons get labels

---

## 7. Asset Formats (v1.12.0, Session 15)

### WebP Backgrounds
- All 10 PNG game/screen backgrounds converted to WebP: oakbackground, questionmark, newspaper, lightbulb, brain, door, fullscreenicon, gear, library, gameclock
- Resized to 1440px max dimension (1080px for fullscreenicon watermark), quality 80 (quality 70 for watermark)
- Total size: 31.8 MB → 1.5 MB (95.4% reduction)
- All 28 `require()` references updated across 21 source files

### Protected PNGs
- `assets/icon.png` (app icon), `assets/adaptive-icon.png` (Android adaptive icon), `assets/splash-icon.png`, `assets/favicon.png` — unchanged (dimensions required by stores/platforms)

---

## 8. Keyboard-Aware Done Button (v1.12.0, Session 15)

### CreateAlarmScreen + CreateReminderScreen
When user is in "type" time-input mode, the small "Done" button under the TextInputs (which calls `Keyboard.dismiss()`) only renders when the soft keyboard is visible.

Both screens:
- Add `keyboardVisible` state with `Keyboard.addListener('keyboardDidShow'/'keyboardDidHide')`
- Wrap the Done button in `{keyboardVisible && (...)}`
- Bottom time-modal Done button (paired with Cancel) is NOT affected

---

## 9. Chess (Session 16; engine hardened Session 17)

### AI Engine
- **Opening book** — 104 hardcoded FEN-keyed positions (first 6-10 plies of theory across Italian, Ruy Lopez, Queen's Gambit, London, English as White, and Sicilian, French, Caro-Kann, KID, Slav as Black). Instant move selection, zero search cost, random pick among 1-3 sound moves per position for variety. Book check sits at the top of both `findBestMove` and `getAIMove`; `analyzeMove` skips the book so blunder analysis always compares against a search result.
- **Transposition table** — 100,000-entry FEN-keyed cache (first 5 FEN fields so halfmove-clock differences don't collide). Stores `{depth, score, flag, bestMove}` with EXACT / LOWERBOUND / UPPERBOUND bounds. Depth-preferred replacement + FIFO eviction at capacity. Cleared at the start of each `findBestMove` call (within iterative deepening, not across moves). TT's best-move hint is the top move-ordering signal (+100,000).
- **Killer-move heuristic** — per-ply (up to ply 32), two slots, stores quiet moves that caused a beta cutoff. Slot 0 gets +90 and slot 1 gets +80 in move ordering — above quiet moves, below equal/winning captures.
- **Null-move pruning** — R=2 reduction. Skipped in check (illegal) and in endgame (zugzwang risk). Implemented by flipping side-to-move in a FEN and constructing a throwaway `Chess` instance (chess.js has no null-move API).
- **Min-depth + max-time difficulty model** — each `DifficultyLevel` has `minDepth`, `maxDepth`, `timeLimitMs`. Depths up to `minDepth` complete unconditionally (module `searchMinDepthActive` flag forces `isTimeUp()` false); depths above `minDepth` respect `searchDeadline`. A safety ceiling `searchSafetyDeadline = now + timeLimitMs × 3` caps even mandatory-depth searches so a branch-heavy position can't spiral. Worst-case search time: 3× budget (≈15 s for Expert).
- **Tapered evaluation** — continuous material-phase value in [0, 1] computed inline during the single board scan. King PSTs blend MG and EG tables by phase (`MG*phase + EG*(1-phase)`). Pawn-shield bonus scaled by phase so it fades into the endgame. Passed-pawn bonuses [0,10,15,25,40,60,90,0] by rank, scaled by `1 + (1-phase)*0.5` (up to +50% in endgames). Rook on open file: +25. Rook on semi-open file: +15.
- **Difficulty levels:** Beginner (min 1 / max 2 / 300 ms / randomness 0.4), Casual (min 1 / max 3 / 500 ms / 0.2), Intermediate (min 2 / max 4 / 1 s / 0.05), Advanced (min 2 / max 5 / 2 s / 0), Expert (min 3 / max 6 / 5 s / 0; safety cap 15 s).

### Pre-Game Setup
Card modal appears when no game is in progress. User picks:
- **Color** — tap white king or black king (large piece image + label, selected gets accent border)
- **Difficulty** — 5 capsule pills (Beginner/Casual/Mid/Advanced/Expert), default Intermediate (index 2)
- **Play** button — full-width accent, starts the game. If player picked black, AI moves first.

### Active Game Screen
Top-to-bottom layout: header (difficulty name + move number) → "Thinking…" indicator (fixed-height container reserves the space, text only shows while AI computes) → opponent's captured pieces row → board → player's captured pieces row → action bar (Take Back + Resign pills) → roast toast (absolute, above safe-area bottom).

### Board
8×8 nested Views. Square size = `(screenWidth − 32) / 8`. Light/dark squares use accent color at different opacities. Selected square highlighted with `colors.accent + '90'`. Valid destination squares show a small dot (empty) or a full-border ring (enemy piece). Rank labels (1-8) inside col 0 squares, file labels (a-h) inside row 7 squares — both respect board orientation (when playing black the board is rotated 180° so the player's pieces are at the bottom).

Pieces: custom AI-generated Staunton PNGs from `assets/chess/` (wK, wQ, wR, wB, wN, wP, bK, bQ, bR, bB, bN, bP). Pawn promotion hardcoded to queen.

### Captured Pieces
Derived from `game.history({ verbose: true })` — iterates moves with `captured` set and groups by color. Correct under promotion (doesn't flag a promoted pawn as "captured"). Opponent captures shown above the board, player captures below, rendered as 18×18 piece images.

### Take-Back
One per game. Pill text changes "Take Back" → "Used" and opacity drops to 0.4 when spent. Guarded by `!takeBackUsed && isPlayerTurn && history.length >= 2` — undoes player's last move + AI's response (two plies). Pending AI timers are cancelled. Fires a dedicated take-back roast.

### Resign
Red-tinted pill with `Alert.alert` confirmation. Sets `gameResult='resigned'`, `winner=opposite`, clears saved game, records a loss in chessStats.

### Check / Checkmate Indication (Session 21)
- Red king square (`rgba(220, 38, 38, 0.6)`) highlights the checked king on the board
- Pulsing "CHECK!" text (red, fontSize 18) in the status bar — pulses when it's the player's turn, solid during AI turn
- Red board border (`#EF4444`) replaces accent border when in check
- `hapticHeavy()` fires on check (both player and AI moves)
- `hapticError()` (notification error pattern — long vibration) fires on checkmate
- Red king square persists on the final checkmate board (isInCheck not gated by isGameOver)

### Training Mode (Session 21)
- Toggle in pre-game screen for difficulty 0-2 (Beginner/Casual/Mid)
- Threatened pieces: player's pieces under attack highlighted with red overlay (`rgba(220, 38, 38, 0.35)`)
- Last move: AI's previous from/to squares highlighted gold (`rgba(250, 204, 21, 0.4)`)
- Both highlights persist through game-over (guarded by `!isAIThinking`, not `isPlayerTurn`)
- Training games don't record results to Memory Score (`teachingModeRef` skips `recordChessResult`)
- Accessibility labels append ", threatened" and ", last move" when applicable
- Teaching pill toggle in game header when active

### Turn Indicator (Session 21)
- Pulsing "Your Move" text (accent color, fontSize 20, fontWeight '800', opacity 0.4→1.0 800ms loop)
- Accent board border when it's the player's turn (2px, always present to avoid layout shift)
- Status bar priority: CHECK! (red) > Thinking… (white) > Your Move (accent) > nothing
- `hapticLight()` fires when AI finishes and it becomes the player's turn (suppressed during check)

### Post-Game Move Review (Session 21)
- FEN history tracked in `fenHistoryRef` — pushed after every player/AI move, sliced on take-back, rebuilt from moveHistory on restore
- Game-over overlay shows "Review Game" (accent) + "New Game" (secondary) buttons
- Review mode: non-interactive board rendered from `reviewBoard` (derived from FEN at current index)
- Navigation controls: « (start) ‹ (back) [counter] › (forward) » (end) — 36px circular buttons
- Move counter: "Start of N" at index 0, "Move X of N" otherwise
- Nav buttons disabled (opacity 0.3) at bounds with `accessibilityState={{ disabled: true }}`
- Captures hidden in review mode (missing pieces visible on the board itself)
- "New Game" button below nav controls returns to pre-game screen

### Chess Pieces (Session 21)
- 12 anthropomorphic WebP pieces (512×512, transparent bg) replacing stock Staunton PNGs
- White set: cream/gold tones. Black set: charcoal/silver tones. Thick outlines, personality per piece type.
- Mapped in `chessAssets.ts` via `getPieceImage({ type, color })`

### Game-Over Overlay
Full-screen backdrop + centered card with title ("Checkmate!" / "Stalemate" / "Draw" / "You Resigned"), contextual subtitle ("You won!" / "You lost" / "It's a draw"), "Review Game" button (accent) + "New Game" button (secondary). Review Game enters move review mode; New Game clears state and returns to pre-game modal.

### Roast Toast
Severity-tinted background (good=accent+30, inaccuracy=amber, mistake=orange, blunder=red, catastrophe=deep red, takeBack=accent). Animated fade in/out via native-driver opacity, 4-second hold, auto-clears.

### Persistence
Every move triggers `saveCurrentGame()` which writes to `chess_game` (single-row table). On app relaunch, `loadChessGame()` reads the row, replays moveHistory on a fresh `new Chess()` (rebuilds chess.js internal history so take-back still works), and if it's the AI's turn in the restored position it automatically triggers the AI. Game row cleared on checkmate/stalemate/draw/resign/newGame.

Prevents an orphaned "Done" button from lingering after keyboard dismissal via elsewhere-tap.

### Chess Fixes (Session 23)
- Checkmate banner: "CHECKMATE!" displays on checkmate (checked before isInCheck), "CHECK!" on regular check
- Take Back label: uses `takeBackUsed` boolean for label text ("Take Back" / "Used"), `takeBackAvailable` for disabled/opacity state
- Light mode: pre-game and game-over card text uses `colors.textPrimary`/`colors.textSecondary` (not overlayText) since cards use `colors.card` background

---

## Fonts (Session 21)

### Three-Font System
- **Satisfy** — cursive script for the app title "Don't Forget Why" on HomeScreen
- **Lilita One** — bold display for game screen headers (GamesScreen, Chess, Checkers, Sudoku, Trivia, MemoryMatch, GuessWhy, DailyRiddle)
- **Nunito** — rounded sans-serif for core screen headers (AlarmList, Reminders, Timer, Notes, VoiceMemos, Calendar, Settings)

### Font Loading
- `expo-font` + `expo-splash-screen` in App.tsx
- `useFonts` hook loads all three families; splash screen held until fonts ready
- Error fallback: if fonts fail to load, app proceeds with system fonts (no crash)
- `FONTS` constant exported from `src/theme/fonts.ts` with `appTitle`, `gameHeader`, `screenHeader` keys

### Phase Rollout
- **Phase 1 (Session 21):** headers only — title, game headers, core screen headers
- **Phase 2 (planned):** Nunito to all body text, labels, buttons, pills, cards

### Android Restriction
- Android ignores `fontWeight` when a custom `fontFamily` is set — must use weight-specific font files
- Styles using custom fonts must remove `fontWeight` property to avoid silent rendering issues
