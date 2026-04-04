# DFW Design Decisions & Environment Knowledge
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 14 (April 4, 2026)

---

## 1. Design Decisions

### Core Philosophy
- **"Always the better way, even if harder."** Simple and better is fine. Simple and worse is never acceptable. (Zerenn, emphatically)
- **"Don't ship dead features."** If it doesn't produce a meaningfully different experience, remove it. Applied to: alarm sound picker (6 channels all sounded identical), game sounds (haptic patterns indistinguishable), category system (redundant with icon picker), SwipeableRow (gesture conflicts).
- **"A potential problem is a problem."** (Zerenn)
- **Documentation is infrastructure, not a feature.** Feature freeze doesn't apply to docs.

### Privacy
- Private alarms = completely blank cards. No icon, no nickname, no lock icon. Indistinguishable from empty alarm. Lock icon screams "secret here." (Zerenn: "just leave it blank")
- Note is NEVER public — never in notifications, never on card if private
- Widgets show generic ⏰ and "Alarm" for private alarms

### Guess Why
- Per-alarm toggle (not global) — users shouldn't be surprised by a game they never asked for
- Nickname is valid clue — "no one wants to type the whole reason but a short nickname or icon is better" (Zerenn)
- Removed from reminders — dead code, reminders don't fire through AlarmFireScreen. Deferred to Phase 8.

### UI/UX
- Tap-to-edit on alarm/reminder cards (universal UX pattern). Pencil icon removed.
- Save button in header (only location visible regardless of keyboard/scroll). Three other positions failed.
- Cancel button removed (redundant with BackButton).
- Identical setup flow for alarms and reminders. "Learn it once."
- One-time as default alarm mode (most usage is one-time).
- Day-of-week circles always visible (useful in both modes).
- Calendar as subtle "📅 Today ▾" text row (scheduling weeks out is rare).
- Default alarm filter changed from 'active' to 'all' (users thought disabled alarms were deleted).
- Trivia controls fixed at bottom (always reachable regardless of scroll).
- Emojis from keyboard, not hardcoded grid (infinite set vs curated list).
- "Coming soon" text removed from disabled online toggle (made entire game look unfinished).
- Icon orders matter — reordered by frequency/importance. "The devil is in the details."
- Notification action buttons: "Dismiss" and "Snooze" directly on alarm notification banners. Timer notifications get "Dismiss" only (snooze on a timer is nonsensical). Solves the "COD problem" — users in online games can handle alerts without being pulled out of their app.
- Android renders notification action buttons left-aligned with OS-controlled spacing. Not customizable — text labels are what we control.

### Themes
- 6 distinct themes beats 8 similar ones. Each in different hue family.
- 60-30-10 accent reduction. Accent only on interactive elements.
- Note color as full background (not tint) — feels like real sticky note.
- True base font colors (#FF0000 real red, not off-base). "RED red." (Zerenn)

- Onboarding: no emoji anywhere — View-based icons as accent (48px, accent-colored). Personality carried by sarcastic headlines, not decoration.
- Onboarding theme cycling: local preview state cycles all 6 themes as user swipes. Does NOT call setTheme() — no persistence, no widget refresh, no side effects. Fresh installs default to 'dark' after onboarding. Settings → Setup Guide uses real theme (no cycling).
- Onboarding skip warnings: every permission gets a sarcastic Alert on skip. Battery keeps destructive style ("This one actually matters"). Mic/camera get softer warnings (feature permissions, not core). Final slide roasts proportionally based on skip count.
- skippedPermissions: deduplicated on insert + auto-cleaned via useEffect when permission becomes granted. Prevents count inflation if user skips → goes back → grants.

### Removed Features (With Reasons)
- **Alarm sound picker:** 6 channels all used `sound: 'default'`. Indistinguishable.
- **Game sounds:** Enhanced haptic patterns not distinct from regular haptics.
- **~~SwipeableRow:~~** Originally removed due to gesture conflicts with react-native-tab-view. Reinstated in Session 10 after tab-view removed and screens separated — no more gesture conflicts.
- **expo-av for sound preview:** Failed silently in release builds. Replaced with Notifee.
- **Category system:** Redundant after icon picker added.
- **Compact widgets (TimerWidget, NotepadWidgetCompact):** Structurally identical to detailed after redesign. Both remaining widgets resizable.

### Responsive Layout

**TimePicker Responsive Design (v1.3.7)**
- Column width: responsive via useWindowDimensions, capped at 80px (3-col) / 90px (2-col)
- Font scaling: proportional via fontScale = colWidth / 90, applied to all getItemStyle sizes
- Row height: 96px universal (increased from original 56px to prevent scroll drift on lower density screens)
- Lesson learned: proportional scaling (continuous formula) beats breakpoints (conditional branching) for cross-device compatibility
- Samsung FE line has known React Native layout issues due to lower pixel density at similar dp width as flagships

### Day Chip / Calendar Date Mutual Exclusivity
- Tapping a day chip in one-time mode clears selectedDate (via clearDate callback)
- Both CreateAlarmScreen and CreateReminderScreen now have identical three-tier one-time scheduling: (1) selectedDate, (2) selectedDays single day calculation, (3) today/tomorrow fallback
- Same UI = same behavior = same logic across both screens

### Process
- PrimeTestLab: provides install numbers, not real QA. All real bugs found by Zerenn and his buddy.
- Firebase over Azure for backend ($300 credits, simpler DX, Google ecosystem alignment).
- Pro tier ($1.99 one-time): "pay to add premium stuff" not "pay to remove annoyances." Free tier keeps everything permanently.
- Store screenshots: professional graphics created with ChatGPT image generation, composited with real app screenshots in Canva to avoid AI text reproduction errors. 8 images with personality-driven taglines matching app's sarcastic brand.
- Google Play App Information Request: standard vetting for new developer accounts. Requires SDK description, permission justifications, and video demo. Not a rejection — approval follows within days.

### Dated Decisions

**Calendar as separate screen, not tab (Mar 25):** AlarmListScreen was already 1000+ lines with 3 tabs. Adding a 4th tab with all the calendar logic would push it past 1300 lines and create editing risk. Calendar nav card on main screen provides one-tap access with clean code separation.

**Floating headers limited to 3 screens (Mar 25):** Initially planned app-wide FloatingHeader component for all 15 screens with BackButton. Reverted after realizing only 3 screens (NoteEditorModal, SettingsScreen, DailyRiddleScreen) have content that actually scrolls past the header. Applied position: 'absolute' directly in those 3 screens instead. Avoids unnecessary visual noise (semi-transparent bar) on non-scrolling screens.

**Calendar is free, not Pro (Mar 25):** Calendar visualizes existing alarms/reminders/notes — it's the universal mental model for "what did I forget." Paywalling it would undermine the app's core "don't forget" promise. Pro tier reserved for enhancements (voice, photos, online features), not core functionality.

**Dark capsule button uniformity (Mar 25):** All tappable buttons use rgba(30,30,40,0.7) background with rgba(255,255,255,0.15) border. Ensures visibility on any background (light notes, dark notes, any theme). Applied to BackButton, NoteEditorModal toolbar, note card actions. Eliminates mixed styling where some buttons used translucent theme colors.

**Text color picker removed from roadmap (Mar 25):** The dark capsule pattern (semi-transparent dark backgrounds with white text/borders) solves readability on all backgrounds without user configuration. For future photo backgrounds (P2 Pro), dark overlays or frosted-glass strips behind text regions with automatic black/white text selection based on background luminance. More reliable, zero-config, preserves visual consistency. reanimated-color-picker stays installed for NoteEditorModal and DrawingCanvas (custom theme picker removed from SettingsScreen in Session 9).

**CalendarWidget as mini month grid, not agenda list (Mar 25):** Initial design was "Today's Agenda" list widget. Switched to mini calendar with dots because: (1) month-at-a-glance is more useful than duplicating DetailedWidget's item list, (2) dots answer "do I have anything on X day?" which is the core calendar question, (3) tapping any day deep-links to CalendarScreen for details. Widget can't navigate months (click-only interaction model) — always shows current month.

**Week view locked to current week (Mar 25):** Week view previously showed whatever week contained selectedDate. Changed to always show the current week because: "What's on my plate this week?" is the useful question. Browsing other weeks is what month view is for. Tapping a date outside current week while in week mode auto-switches to day view so it doesn't feel stuck.

**Floating back buttons — selective, not global (Mar 25):** Only applied to screens with scrollable content that hides the back button: CalendarScreen, SettingsScreen, DailyRiddleScreen, NoteEditorModal, MemoryScoreScreen. Not app-wide — screens without scrolling or with fixed headers don't need it. Back button only floats (compact dark pill), title stays in scroll flow. Started with full-width FloatingHeader component, reverted — direct styles on individual screens is simpler.

**Tablet responsive — scale, don't redesign (Mar 25):** Used responsive maxWidth constants (CONTENT_MAX_WIDTH) capped at 500-600px rather than redesigning layouts. Phone experience unchanged. Tablet gets wider content that still looks intentional. Applied to: Onboarding (maxWidth 500), Sudoku (grid 540, pad 600), MemoryMatch (content 500, grid 600), MemoryScore (floating back button).

**Dismiss Voice toggle removed, double-tap is sufficient (Mar 29):** Removed the per-category "Dismiss Voice" setting toggle. Two controls is the right amount: master Voice Roasts on/off for people who want no voice ever, and double-tap to skip any individual clip. Per-category toggles create settings bloat and set a precedent for snooze toggle, timer toggle, etc. In an app where simplicity is brand, fewer options is better.

### Voice memos as standalone items, not note attachments (Mar 30)
Initially planned voice memos as a field on the Note type (like images). Changed to standalone VoiceMemo type with own storage because: (1) voice memo users want quick capture — tap widget, record, done. Attaching to a note adds friction. (2) NotepadScreen filter tabs let users switch between notes and voice memos cleanly. (3) Optional `noteId` field allows future linking without coupling the data models. (4) Standalone items show in widget feed naturally without loading parent notes.

### Voice memo shared 3-attachment limit (Mar 30)
Images and voice memos share a 3-attachment limit per note (when attached via NoteEditorModal). Keeps storage per-note bounded without separate limits to explain. Matches the existing image-only limit users are already familiar with.

### NotepadScreen content filter tabs, not a separate screen (Mar 30)
Voice memos could have been a separate VoiceMemoListScreen. Instead, integrated into NotepadScreen with filter tabs (All/Notes/Voice) because: the notepad IS the quick-capture hub. Switching screens adds friction. Widget deep-links use `initialFilter` route param to jump straight to the right view. The existing active/deleted filter composes cleanly with the content filter — both work independently.

### voiceMemoStorage re-throws errors (Mar 30)
Unlike other storage services that swallow errors (catch → log → return void), voice memo storage re-throws after logging. This lets callers show error UI instead of false success. Audit 44 finding. Other storage services could be migrated to this pattern in the future but aren't worth the churn now.

### Voice memos play through MEDIA stream, not ALARM stream (Mar 30)
Voice roasts use the native AlarmChannelModule on ALARM stream because they play during alarm fires and must be audible regardless of ringer mode. Voice memos are user-initiated playback — MEDIA stream via expo-audio is correct. No native module needed.

### Card unification — dark bar style with accent borders (Mar 30)
Replaced full-color note cards with dark bar style matching voice memo cards. Green left border (#55EFC4) for notes, purple (#A29BFE) for voice memos. Note's own color shows in icon circle only. Ensures consistent look across all content types and visibility on all theme backgrounds.

### View-based play/pause icons, not emoji (Mar 30)
Emoji play symbols (▶️⏸️) render differently across devices and look like placeholders. Replaced with CSS border triangle (play) and dual bars (pause) rendered as Views. Small change, massive visual improvement. Applied to VoiceMemoCard, VoiceMemoDetailScreen, VoiceRecordScreen.

### Play button green #4CAF50, not purple (Mar 30)
Play buttons use Material Design green — the universal "go/play" color. Purple (#A29BFE) reserved for voice memo accent borders and branding. Green for action, purple for identity.

### VoiceRecord → VoiceMemoDetail flow, not inline save (Mar 30)
Initially tried adding title/note inputs directly to VoiceRecordScreen after recording. Didn't work — centered layout pushed inputs off screen, and ScrollView solutions fought with the recording UI. Solution: VoiceRecordScreen stays clean (record only), then navigation.replace to VoiceMemoDetailScreen which handles title, note, playback, and save. Detail screen's dual-mode (tempUri vs memoId) handles both new and existing memos.

### Explicit Save button, not auto-save (Mar 30)
VoiceMemoDetailScreen originally auto-saved title/note changes on back press. Changed to explicit Save capsule in header (visible only when changes exist) + unsaved changes warning on exit. Matches user expectations — auto-save is invisible and users don't trust it.

### SDK 55 upgrade timing (Mar 31)
Done while codebase was stable and freshly audited (post v1.8.0). Avoided accumulating more drift between Expo SDK versions. SDK 55 was the primary driver for resolving Google Play's Android 15 foreground service warning on `expo-audio`'s `AudioRecordingService`.

### react-native-notification-sounds removal (Mar 31)
Library was unmaintained, used `jcenter()` (removed in Gradle 9.0) and deprecated `destinationDir` API. First attempted patching with patch-package — second build failed on `destinationDir`. Rather than endlessly patching a dead dependency, added `getSystemAlarmSounds` to existing `AlarmChannelModule` using `RingtoneManager.TYPE_ALARM`. Same response format (`{title, url, soundID}`) so `SoundPickerModal.tsx` needed only minimal changes (swap the import and call site). Uses fully qualified class names inline to avoid modifying the existing import block.

### Skia version — Expo recommended over latest (Mar 31)
Expo SDK 55 recommends `@shopify/react-native-skia` 2.4.x, not latest (2.5.x). Initially installed `@latest` (2.5.5) which caused expo-doctor version mismatch warnings. Downgraded to Expo's recommended 2.4.18 for stability — the minor version gap isn't worth the risk.

### ExpoKeepAwake — fixed (Session 9)
Replaced `useKeepAwake()` hook with imperative `activateKeepAwakeAsync()` in try-catch useEffect. Fixes SDK 55 promise rejection during activity transitions.

### useRef for undo pin state, not useState (Mar 30)
Voice memo delete captures wasPinned for undo restore. useState caused stale closure because setDeletedVoiceMemoPinned and setVoiceUndoKey happen in same render — the undo handler captures the old false value. useRef updates synchronously. Same pattern that fixed globalSilenced and isSnoozing in P3.

### Home screen as new entry point (Apr 1)
Home screen compartmentalizes navigation — every future feature gets a grid icon instead of cramming into one screen. AlarmListScreen was becoming a catch-all with 3 tabs and growing navigation elements.

### Timer extraction to standalone screen (Apr 1)
Timers run differently than alarms/reminders (countdown vs scheduled). Standalone screen lets them own their state and notification logic. AlarmListScreen drops to 2 tabs (Alarms, Reminders).

### Voice memo separation from Notepad (Apr 1)
With a home screen, voice memos deserve their own front door instead of filter tabs inside Notepad. VoiceMemoListScreen is standalone. NotepadScreen becomes notes-only.

### Personality banner over generic quotes (Apr 1)
Color-coded section quotes serve as sarcastic tutorials, teaching features while roasting the user. 63 quotes across 7 sections in homeBannerQuotes.ts. More useful than random generic motivational quotes.

### 2×3 grid over 3×3 (Apr 1)
Removed Forget Log and Settings from grid (utility, not primary features). Forget Log moved into Settings. Settings accessible via gear icon in title bar. Cleaner layout — 6 primary sections only.

### Quick Capture row (Apr 1)
One-tap actions for the 3 most common "capture something now" tasks: New Note, Record Memo, Set Timer. These are time-sensitive actions where speed matters — grid navigation adds friction.

### Widget headers as personality names (Apr 1)
Memory's Timeline (DetailedWidget), Forget Me Notes (NotepadWidget), Misplaced Thoughts (CalendarWidget), Memory's Voice (MicWidget). Each widget has character. All footers say "Don't Forget Why".

### Section color assignments locked (Apr 1)
Alarms #FF6B6B, Reminders #4A90D9, Calendar #E17055, Notepad #55EFC4, Voice #A29BFE, Timers #FDCB6E, Games #A8E06C. Used in home grid icons and personality banner backgrounds. Locked to maintain visual consistency across all surfaces.

### Alarm/reminder separation into own screens (Session 9)
AlarmListScreen is alarms-only (AlarmsTab absorbed). ReminderScreen is standalone with own route. Enables future swipe-to-delete (no tab swiping conflict), compartmentalizes navigation, and each section owns its own header/background/filtering.

### No-date recurring reminders are yearly from createdAt (Session 9)
Recurring + no days + no dueDate = yearly from createdAt (creation anniversary). Not daily — daily makes no sense without explicit day selection. Affects scheduling, calendar dots, Today section, widget, completion logic.

### Custom theme picker removed (Session 9)
Users pick colors that fight their own backgrounds. Personal photo + 4 well-designed themes serves better. The 4th theme (Vivid) uses a completely different color palette — proves the section color system works when themes define their own section colors.

### Emoji → View-based icons (Session 9)
Emoji render differently per device, can't be theme-colored, and signal "hobby project." View-based icons in Icons.tsx are theme-colorable, scalable, and consistent. 29+ icons covering all UI needs. Extracted from HomeScreen and added new ones for all common actions.

### Pin redesign — dot + text capsule (Session 9)
Pushpin emoji/icon is cartoonish. Small accent dot as pinned indicator + "Pin"/"Pinned" text capsule as toggle button is modern and clean. Applied to alarms, reminders, notes, voice memos.

### Note editor dropdown consolidation (Session 9)
4 action buttons (draw/photo/record/color) consolidated into single "+" dropdown menu with labeled rows and View-based icons. Cleaner toolbar, room for centered Save button. Added "Take Photo" option alongside "Photo Library."

### DayPickerRow "Everyday" button (Session 9)
Quick-select button that toggles all 7 days on/off. Common use case — saves 7 taps.

### Light mode card tinting, not plain white (Session 9)
Light mode cards use `sectionColor + '15'` (very light tint) instead of `colors.card` (plain white). Alarm cards are light red, reminder light blue, note light green, voice light purple. Gives each section visual identity in light mode. Timer presets and calendar event cards also tinted per-type.

### Photo overlay always dark, not mode-switched (Session 9)
Initially switched overlay to white in light mode (`rgba(255,255,255,opacity)`). Reverted — photos look best with a dark dim. Light mode is expressed through cards, text, and UI elements, not by bleaching the user's photo. All 10 screens unified to `rgba(0,0,0,opacity)`.

### Photo-aware alpha values on HomeScreen (Session 9)
Grid cells, quick capture buttons, today container, and banner all increase opacity when a background photo is set (e.g., grid `90` with photo, `40` without). Nearly solid tint over photo keeps text readable. Lighter tint without photo lets the watermark breathe.

### Brand title as theme token (Session 9)
HomeScreen "Don't Forget Why" title uses `colors.brandTitle` — a per-theme color. Dark: midnight navy (`#1E3A5F`, subtle/hiding), Light: bold blue (`#2563EB`), HC: cyan (`#00D4FF`), Vivid: pink (`#FF6B9D`). Each theme gives the title its own personality.

### HomeScreen grid: no borders, no icon box (Session 9)
Removed borderWidth, borderColor, elevation, and shadow from grid cells. Removed iconCircle background. Tinted section-color background is enough — borders on top of tint on top of photo is too many layers. One layer, clean.

### Vivid theme: cyberpunk terminal aesthetic (Session 10)
Overhauled Vivid from purple (#7C5CFC accent, #0C0C18 bg) to neon green cyberpunk (#39FF14 accent, #0A0F0A green-tinted blacks). All 3 dark themes are now visually distinct: Dark (blue/navy), High Contrast (cyan/black), Vivid (neon green/terminal). Previously Dark and Vivid were too similar.

### Section-color card tinting in dark mode (Session 10)
Dark mode cards now use `sectionColor + '20'` background. Light mode uses `sectionColor + '15'` (from Session 9). Gives each section visual identity in both modes without sacrificing readability. Alarm cards are tinted red, reminder blue, etc.

### Swipe-to-delete both directions (Session 10)
SwipeableRow supports swiping left OR right — both reveal the same delete action. Only one swipe action (delete). Let users do what feels natural rather than forcing a direction. Originally removed (gesture conflicts with tab-view), reinstated after tab-view removed.

### Delete buttons removed from cards (Session 10)
Swipe-to-delete replaces on-card delete buttons. Pin stays as capsule button on cards. Cleaner card layout — fewer buttons, less visual noise.

### Emoji picker rebuilt as modal (Session 10)
TextInput keyboard emoji hack was fragile — broke 3 times during attempts to add filtering. Rebuilt as EmojiPickerModal with ~128 curated emoji in flat grid, bottom sheet presentation. Controlled surface, no keyboard dependency, searchable in future.

### Button hierarchy: 4 types shared via getButtonStyles() (Session 10)
`buttonStyles.ts` exports `getButtonStyles(colors)` returning primary (accent bg), secondary (capsule/outlined), destructive (red text), ghost (minimal) — each in large and small. Applied to create screens and trash items first. Modals and Settings next. Eliminates ad-hoc inline button styles.

### AlarmCard emoji made optional (Session 10)
No default fallback emoji — when no emoji selected, shows AlarmIcon component instead. Clear button (✕) added to quick emoji row on both alarm and reminder create screens. Users shouldn't have a random emoji assigned they didn't choose.

### DrawingCanvas refactor before theming (Session 10)
Extracted color/background picker modals to DrawingPickerModal.tsx before applying theme changes. Safer to theme smaller, focused files than one monolith. Modals needed their own theme-aware styling anyway.

### Storage migration moved before P4 (Session 11)
AsyncStorage → SQLite migration scheduled before Chess/Checkers (P4). Rationale: fewer service files to migrate now than after adding more features. Every future feature (games, calendar sync, Firebase) builds on the storage layer — get it right early, avoid retrofitting a growing service layer later.

### Jest uses ts-jest instead of jest-expo (Session 11)
`jest-expo` preset crashes parsing expo-modules-core TypeScript files. Since we're only testing pure utility functions (no React Native, no Expo imports), `ts-jest` with `node` environment works perfectly. `jest-expo` kept in devDependencies for future component testing when needed.

### AsyncStorage → SQLite migration (Session 12)
All persistent storage moved from `@react-native-async-storage/async-storage` to `expo-sqlite`. 7 entity tables + kv_store. Proper tables for entities (row-level CRUD), kv_store for settings/stats/pins/flags. Rationale: (1) AsyncStorage serializes entire arrays — a single alarm edit re-serialized every alarm. SQLite updates individual rows. (2) Synchronous reads via `expo-sqlite`'s sync API (`getFirstSync`, `getAllSync`, `runSync`) eliminate `.then()` chains and race conditions from the old async read-modify-write pattern. (3) Every future feature (P4 games, P5 calendar sync, P7 Firebase) builds on storage — migrating now prevents retrofitting a growing service layer later. (4) The old async mutex (`withLock`) on timer storage is replaced by SQLite's built-in transaction support. Migration runs once on first launch, all services read SQLite only. AsyncStorage kept temporarily in `database.ts` for the migration runner.

### ForgetLog removed (Session 12)
Dead feature — not appreciated by users. ForgetLogScreen, forgetLog.ts service, forget_log database table, navigation route, and all references deleted. Removed from Settings screen, MemoryScoreScreen, and Home screen feature text.

### Timer pin redesign (Session 12)
Pushpin emoji removed from timer preset cards. Replaced with small "Pin"/"Pinned" text capsule overlay in upper-left corner of all preset cards (`cardPinOverlay` style). Modal pin button removed — pin directly from the card. Consistent with alarm/reminder/note pin pattern (capsule, not emoji).

### NoteEditorModal recording controls (Session 12)
Proper pause (green) + stop (red) button row replaces the old tap-to-stop banner during in-note voice recording. Prevents accidental recording loss from careless taps. Home button added to modal with unsaved changes guard.

### Migration failure handling (Session 12, audit fix)
App shows retry/renders null instead of rendering with empty data when migration fails. Checks `_migrated` kv_store flag before allowing render. If migration fails, flag is not set — retries on next launch. App still renders on failure since AsyncStorage code was in place during initial migration period.

### nativeSoundId rename (Session 12)
SQLite column names are case-insensitive. `soundId` (TEXT) and `soundID` (INTEGER) on the Alarm type collided when mapped to SQLite columns. INTEGER column renamed to `nativeSoundId` in schema, migration runner, and all row converters. TypeScript `Alarm.soundID` property kept for compatibility; mapped via `rowToAlarm`.

### MicWidget 1×1 (Session 11)
Stripped to essentials: red record circle + "Don't Forget Why" footer. 70dp minimum size (was 110dp). A record button doesn't need a header or descriptive text — the red circle is universally understood.

### WidgetTheme expanded with red property (Session 11)
Added `red: string` to WidgetTheme interface so widgets can use theme-aware red (e.g., MicWidget record circle, destructive actions) instead of hardcoded hex values.

### Overlay text strategy (Session 13)
Permanent dark overlay screens (game sub-screens, GamesScreen, SettingsScreen) use hardcoded overlay-safe colors (`colors.overlayText`, `rgba(255,255,255,0.7)`, `rgba(255,255,255,0.5)`) directly in styles. Conditional photo screens (8 user-photo screens) use `bgUri && { color: colors.overlayText }` JSX overrides so base theme colors work without a photo. Two distinct patterns — never mixed on the same screen.

### forceDark split (Session 13)
`forceDark` (unconditional) for BackButton/HomeButton on permanent dark overlays. `forceDark={!!bgUri}` (conditional) for user-photo screens where the overlay only exists when a photo is set. Never both on the same screen.

### View/edit mode for detail screens (Session 13)
VoiceMemoDetailScreen and NoteEditorModal both default to view mode for existing items. Centered accent pill toggles: "Edit" in view mode, "Save" in edit mode (only when changes exist). Header layout: headerLeft (Back + Home), headerCenter (Edit/Save pill), headerRight (Trash/Share). New items go straight to edit mode. Prevents accidental edits and gives a cleaner read-only experience.

### 6 themes — 3 dark + 3 light (Session 13)
Replaced original light theme with blue-tinted Ocean. Added Sunset (orange) and Ruby (red). Covers top favorite colors: blue (Dark/Light), green (Vivid), cyan (HC), orange (Sunset), red (Ruby), black (HC). Each theme in a different hue family — no two themes look similar.

### Backup & Restore
- .dfw format: ZIP containing dfw.db + media folders + backup-meta.json
- Manifest-first: every backup includes schema version from day one. Future migrations check version.
- Transactional restore: live data moved to rollback dir, not deleted. Swap in restored data. Rollback on failure.
- SAF for auto-export: user picks destination via Android folder picker. Could be Google Drive, Downloads, anywhere. We never touch their data — OS handles sync.
- No encryption at launch: passphrase problem (forgotten = backup permanently gone). Clean ZIP first, optional encryption later if requested.
- Privacy messaging: "Everything stays on your phone. We don't have servers. We don't want your data."
- Branding: "Export Memories" / "Import Memories" instead of "Backup / Restore"
- 30-day nudge: only shows when lastBackup exists AND is 30+ days old. Never-exported = no nudge.
- Auto-export frequency: daily/weekly/monthly. Check runs on HomeScreen mount, silent unless successful.
- Base64 SAF writes: known memory limitation for very large backups (100MB+). Acceptable for v1.

### `light` theme is Ocean (Session 13)
Rather than adding Ocean as a 7th theme, replaced the original Light theme entirely. Ocean has better contrast (darker slate text vs gray), more distinctive personality (blue-tinted background vs neutral gray), and stronger section colors. The old Light was generic — Ocean has character.

### homeBannerQuotes color field removed (Session 13)
Dead field. HomeScreen resolves section colors via `bannerColorMap` from theme tokens. Hardcoded hex on each quote object was never used when the map had a match (which was always — all 7 sections mapped). Removed `color` from `BannerQuote` interface and all ~60 quote objects.

---

## 2. Environment & Setup Knowledge Base

### Android & Native
- Samsung full-screen intent permission resets on fresh install (Play Store preserves it)
- Google Play pre-grants full-screen intent at install for declared alarm clock apps
- Notifee vibration patterns: even-length arrays, strictly positive values
- `cancelNotification` kills display + trigger. `cancelDisplayedNotification` kills display only.
- `getInitialNotification()` persists across process restarts — need persistent dedupe
- Android widgets: no position:absolute, no double-tap/long-press/swipe, no dialogs, headless JS only
- 180dp ≈ 3 cells on S23 Ultra
- Android full-screen intent only fires when screen is OFF or on lock screen. Screen ON = heads-up banner only (Android 10+). Not a bug.
- Dev builds and production builds have different signing keys (signature mismatch). Cannot install dev build over Play Store production build without uninstalling. Test on emulators for dev, phone gets updates through Play Store.
- expo-av removed (P3) — was only used for chirp. Replaced by expo-audio. Voice clips use native AlarmChannelModule.
- expo-clipboard is pure JS (no build needed)
- Native module changes require uninstall/reinstall (OTA doesn't replace native binaries)
- EAS build cache can use stale native code — use `--clear-cache`

### Google Play Console
- New accounts (post-2023): closed testing required (12 testers, 14 days) before production
- Two-step tester onboarding: Google Group membership + Play Store opt-in link
- versionCode consumed even on partial uploads
- Release notes require language tags: `<en-US>...</en-US>`
- Every closed testing upload goes through review (not instant)
- Don't modify store listing during review
- Deobfuscation file warning is standard for Expo/RN (non-blocking)

### WSL / Git
- WSL has separate git credentials from Windows. GitHub requires PAT.
- Set git identity manually in WSL or commits show as "zerenn@Zerenn.localdomain"
- CRLF vs LF: `git config --global core.autocrlf input`
- Switching branches can leave orphaned node_modules symlinks → delete and reinstall
- `git config --global pull.rebase true` — rebase as default pull strategy
- If `git pull` says "Aborting," immediately `git stash` then `git pull`

### Development
- `npx expo start --dev-client` (not plain `npx expo start`) — required since Feb 11
- Phone must be on WiFi for dev server (5G/carrier NAT can't reach local network)
- `--tunnel` flag works across networks but slower
- Dev and preview builds can't coexist on phone (same package name)
- ADB: `C:\platform-tools\platform-tools\adb.exe`. `adb logcat | findstr "Term"` for native debugging.
- Metro cache causes stale JS bundle → `npx expo start --dev-client --clear`
- react-native-worklets at 0.7.2 (Expo-managed since SDK 55 — no manual pinning needed)
- adb may not be in PATH. Full path: `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices`. Set permanent: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")`
- Download dev builds from expo.dev on phone browser to skip adb install
- JS-only changes don't require new builds — dev server hot-reloads. Only native dependency changes need new APK.

### EAS Build
- Starter plan: $19/month, ~$1/build. Credits reset on 12th.
- Can't queue new build while one running — must cancel first
- `npm ci` lock file sync: WSL package install → run `npm install` from PowerShell → commit package-lock.json
- Builds on Expo cloud — local specs don't affect build speed
- `development-emulator` profile in eas.json: `developmentClient: true`, `distribution: "internal"`, `buildType: "apk"`, env `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64`. Used for emulator-only dev builds (x86_64 arch, separate from ARM physical device builds).
