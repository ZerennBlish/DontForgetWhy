# DFW Features
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 32 (April 16, 2026)

---

## 1. App Features — Current State

### Core Utility
- **Home Screen** — 2×3 icon grid: Alarms, Reminders, Calendar, Notepad, Voice, Games. Section colors per theme. Quick Capture row: Quick Note, Quick Record, Quick Timer. Personality banner: 63 rotating sarcastic quotes across 7 sections (`homeBannerQuotes.ts`, colors via `bannerColorMap`). Today section shows today's alarms + reminders. Settings gear in title bar. All overlay text bgUri-aware.
- **Alarms** — standalone AlarmListScreen. Reason field, 7 sound presets + custom system sounds (listed via native `AlarmChannelModule.getSystemAlarmSounds` using `RingtoneManager.TYPE_ALARM`), snooze (1/3/5/10/15 min), recurring (daily/weekly/monthly/yearly) + one-time, emoji icon, per-alarm Guess Why toggle, private mode (blank card). Notification action buttons: Snooze + Dismiss.
- **Reminders** — standalone ReminderScreen. Due dates, 5 recurring patterns, 6-hour completion window, date-only mode, completion history, sound mode (sound/vibrate/silent), emoji icon.
- **Timers** — standalone TimerScreen. **21 built-in presets** + saveable custom timers, recently used quick-start (max 3), sound mode per timer, pinnable to widget. "Pin"/"Pinned" capsule overlay on preset cards. Built-in presets render custom WebP icons via `timerPresetAssets.ts` registry; user-created timers use emoji. Notification action: Dismiss only.
- **Notepad** — notes with optional **title field** (stored as `title TEXT NOT NULL DEFAULT ''`), unlimited text length (memoized `renderLinkedText` parser), 10 bg colors + custom, font color presets + custom (reanimated-color-picker), keyboard emoji input, hyperlinks (email/phone/URL), share + print (HTML PDF/Print), soft delete with undo, pin to widget (max 4), up to **5 image attachments per note** (expo-image-picker, JPEG quality 0.7). Notes are text + images + drawings only. Legacy `voiceMemos` column retained for read-only playback on old notes.
- **Voice Memos** — standalone VoiceMemoListScreen. VoiceRecordScreen (tap-to-record/stop, pause/resume, camera button). VoiceMemoDetailScreen dual-mode (view/edit, circle Edit/Save icon buttons). VoiceMemoCard (View-based play/pause, inline progress, capsule pin/delete). Pinning max 4, soft delete with undo. Purple left-border accent (#A29BFE). Calendar shows voice memos as purple dots.
  - **Clips:** memos are containers holding multiple audio clips. Each clip: audio file, position, duration, optional label (default = formatted createdAt; tap in edit mode to rename). "Add Clip" navigates to VoiceRecordScreen in `addToMemoId` mode. Legacy single-uri memos auto-migrate to clip rows on first launch.
  - **Clip playback modes:** Stop / Play All (auto-advances) / Repeat (loops current). Persisted in kv `clipPlaybackMode`.
  - **Photos:** camera + gallery on detail screen edit, camera on record screen. 80×80 thumbnail strip between title/note and clips. Tap opens `ImageLightbox`. 5 photos max. Stored in `voice-memo-images/`, included in backup/restore.
- **Calendar** — CalendarScreen using react-native-calendars. Month view with dot indicators: red=alarms, blue=reminders, green=notes. Three view modes (Day/Week/Month). Filter by type in Week/Month. Create buttons prefill selected date. Week view locked to current week. Tapping a date outside current week in week view auto-switches to day view. Supports `initialDate` route param. Empty-state art: hammock (day), beach chair (week), couch (month). Tappable event cards → edit screens.
- **Calendar Widget** — mini month grid with dots. Tap day → CalendarScreen focused on that date. Today highlighted with accent. 250×280dp min.
- **DND bypass** — Notifee full-screen intent + Samsung onboarding.
- **Full-screen alarm fire** — lightbulb background or per-alarm photo, snooze shame (4 tiers × 7 messages).
- **Native MediaPlayer sound** — plays through STREAM_ALARM regardless of ringer. Notification channels are SILENT.

### Notification Action Buttons
Alarm: Snooze + Dismiss; Timer-done: Dismiss only. NOT on timer countdown, reminder, or preview notifications. Handlers in `index.ts` (background) and `App.tsx` (foreground) process ACTION_PRESS. Dismiss: stops sound, cancels notification + countdown, soft-deletes one-time alarms, cleans up timer state. Snooze: stops sound, sets snoozing flag (enforced — aborts on failure), cancels, schedules snooze, persists snooze notification ID via `updateSingleAlarm`. Foreground DELIVERED events play sound only — no auto-nav to AlarmFireScreen. Eliminates timer-dismiss race.

### Time Input System
Global Scroll vs Type preference. Scroll: 3-row rolodex modal, AM/PM auto-flip. Type: inline TextInputs with per-keystroke validation, auto-advance. TimePicker parent callbacks only in `onMomentumScrollEnd`.

### Guess Why System (Per-Alarm)
Toggle on CreateAlarmScreen. Eligibility: nickname OR note ≥ 3 chars OR icon. Runtime: AlarmFireScreen validates clue exists. Pre-game: icon + note hidden until game played. Nickname always visible. Not on reminders.

### Sound Mode System
Cycling icon: Sound → Vibrate → Silent. Chirp via `createAudioPlayer` on Sound transition (volume 0.3, auto-release). Global Silence All in Settings with duration picker. Two-layer enforcement: schedule-time channel swap + fire-time MediaPlayer skip.

### Mini-Games
- **Guess Why** — per-alarm, icon + type modes, 3 attempts.
- **Trivia** — 1,623 offline questions across **8 parent categories** and **19 subcategories**: General Knowledge; Pop Culture (Film, Music, Television, Celebrities); Science & Tech (Science & Nature, Computers, Gadgets, Mathematics); History & Politics (History, Politics, Art); Geography; Sports & Leisure (Sports, Board Games, Vehicles); Gaming & Geek (Video Games, Comics/Anime); Myth & Fiction (Mythology & Books). Category grid; multi-sub parents open `SubcategoryPickerModal` with live counts + difficulty breakdown. Single-sub parents skip the modal. Difficulty filter + speed selector. 11 custom DFW-style icons in `assets/trivia/`. **Online-first** — `onlineMode` defaults true, pulls fresh round from OpenTDB at `startRound` time when online; all 8 parents have OpenTDB backing. Online questions get default subcategory (first sub of their parent) since OpenTDB doesn't expose subcategory-level queries. Online rounds don't touch `seenQuestionIds`. Failure silently falls through to offline bank.
- **Memory Match** — 3 difficulties, card flip animation, star rating.
- **Sudoku** — pure JS generator, difficulty = assistance level, no lose condition, pencil notes, save/resume.
- **Daily Riddle** — **366-riddle yearly bank** at `src/data/dfw_yearly_riddles.ts`. One riddle per day-of-year, pre-assigned across 12 categories × 3 difficulties. `getDailyRiddleForDate(dateStr)` computes `dayOfYear` via UTC so every device in every timezone resolves the same `YYYY-MM-DD` to the same entry — no shuffle, no seed, no DST edge cases. Daily card is **strictly offline**. Streak tracking. **"Bonus Riddles" tab is Pro-gated** — non-Pro see PRO badge → ProGate; Pro users see a grid of fresh online riddles via `fetchMultipleOnlineRiddles(5)`.
- **Chess** — vs CPU, 5 difficulty levels **Easy / Intermediate / Hard / Expert / Master**. **Move priority: opening book → Lichess cloud eval → local minimax.** 104-entry curated opening book (Italian, Ruy Lopez, Queen's Gambit, London, English / Sicilian, French, Caro-Kann, KID, Slav) returns instantly for first 6-10 plies with random pick across 1-3 equivalent moves. Non-book positions query Lichess cloud eval API (`multiPv=5`); client picks from difficulty-specific rank band into top-5 PVs — Easy 2-4, Intermediate 1-3, Hard 0-2, Expert 0-1, Master 0. Every cloud move is Stockfish-strong; difficulty is *move quality*, not search depth. **Offline fallback** runs the local engine (iterative-deepening minimax, quiescence, 100K-entry FEN-keyed TT with mate-score ply adjustment, killer-move ordering, null-move pruning, tapered eval, passed-pawn bonuses, rook on open/semi-open file, min-depth + max-time difficulty with 3× safety ceiling). Free tier gets cloud for every move; **Pro unlocks unlimited rounds** (free gets 3 trial rounds). Defensive `Math.min(Math.max(saved.difficulty, 0), 4)` clamp on restore. In-game roasts via depth-2 sanity check (58-line pool, 5 severity tiers). One take-back per game. State persists to SQLite. Memory Score: 5/8/12/18/25 win points, half for draw.
- **Checkers** — vs CPU, 5 difficulty levels (Beginner–Expert), American rules (forced captures, promotion ends turn). **Move priority: Firebase Cloud Function → local minimax.** Cloud Function (`checkersai-kte3lby5vq-uc.a.run.app`) runs the TypeScript engine server-side with deeper search (maxDepth 20, timeLimit 6s) and returns top-5 ranked moves; client picks from `cloudPickRange` (Beginner 2-4, Casual 1-3, Intermediate 0-2, Advanced 0-1, Expert 0-0). **Offline fallback**: local minimax (alpha-beta + TT + killers + iterative deepening) with evaluation covering mobility, piece support, connected formation, endgame scaling (scales king value + center bonus + non-king advancement when total pieces ≤ 8), king edge + double-corner penalty. Piece PNGs (red, red-king, black, black-king) + weathered wood table background. No blunder roasts, no take-back. State persists to SQLite. Same Memory Score scale.
- **Memory Score** — 7 games, max 140 points. Ranks from "Who Are You Again?" to "The One Who Remembers". Breakdown bars + detailed stats ordered: Guess Why, Daily Riddle, Chess, Checkers, Trivia, Sudoku, Memory Match.

### Online/Offline Globe Indicators
- GamesScreen polls `checkConnectivity()` on focus and every 30s. Each game card renders a globe badge top-right.
- **Online-capable** (Daily Riddle, Chess, Checkers, Trivia) toggle live — tired wifi globe online, dead X globe offline. **Offline-only** (Sudoku, Memory Match) render the static offline globe. Trophies has no globe.
- TriviaScreen uses same 30s polling.
- **Accessibility:** globe View doesn't carry its own `accessibilityLabel` — online/offline status is merged into the parent's label (e.g. "Play Chess, cloud features active").
- Custom DFW art — original wifi and X globe assets.

### IAP Billing-Ready Retry
`useEntitlement.fetchProducts` wrapped in retry loop: initial + up to 3 retries with 1s/2s/4s exponential backoff, retries **only** on "Billing client not ready" errors (other failures fail fast). `cancelled` flag in cleanup prevents state updates after unmount. Solves cold-start races.

### Game Sound Effects
- 11 WAV files in `assets/sounds/` (bundled via `metro.config.js` assetExts).
- `gameSounds.ts` — cached toggle pattern, fire-and-forget via `createAudioPlayer`.
- `PlayerWithEvents` from `src/utils/audioCompat.ts` used across `gameSounds.ts`, `soundFeedback.ts`, `VoiceMemoListScreen.tsx`, `TutorialOverlay.tsx`. No `as any` casts on `addListener`/`release`. `.remove()` everywhere.
- `VOLUMES: Record<SoundName, number>` for per-sound volume. Settings toggle "Game Sounds" (default ON, `gameSoundsEnabled` kv).
- Mapping — Chess: pickUp, chessPlace, capture, promote, gameWin, gameLoss. Checkers: pickUp, checkersMove, capture/promote/gameWin/gameLoss shared. Memory Match: cardFlip, flipBack, memoryWin. Sudoku: pencil (placement), eraser (clear). Trivia: dedicated trivia-tap, correct/wrong. Daily Riddle: triviaCorrect/triviaWrong. UI: tap (buttons only).

### Media Control Icons
5 WebP chrome icons (512×512) in `assets/icons/`: game-play, play-app, pause, record, stop. `src/assets/mediaIcons.ts` — registry + GlowIcon component (colored shadow spotlight, centered `{0,0}`, translucent fill `glowColor + '20'` for Android shadow hole fix, `borderRadius: size`).

### Close-X Chrome Icon
`close-x.webp` in `assets/app-icons/`, exposed as `APP_ICONS.closeX`. Replaces unicode × across 9 files.

### FAB / Nav Chrome Circle Pattern
Shared visual language for back, home, FAB buttons:
```
backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)'
borderWidth: 1
borderColor:    colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
```
40×40 for nav buttons, 56×56 (borderRadius 28) for FABs. No elevation, no shadow — opaque rgba fills cleanly on Android without the polygon outline bug. FAB plus icon renders with no `tintColor`.

### NoteCard Silver Fallback
`NoteCard.tsx` + `DeletedNoteCard.tsx`: when `note.icon` set, renders as `<Text>`. When empty, falls back to `<Image source={APP_ICONS.notepad} size=22 />` (silver notepad, no tint).

### Timer Save vs Start
Modal has three circle action buttons: red **cancel** (`closeX`), accent **save-only** (`save`), success **start** (`MEDIA_ICONS.play`). `handleModalSaveOnly` saves without starting (three variants: `handleSaveCustomOnly`, `handleSaveNewTimerOnly`, `handleSaveEditTimerOnly`). Toast feedback.

### Icon System
- Chrome icons: `APP_ICONS.save` (floppy-disk), `APP_ICONS.edit` (pencil), 512×512 WebP.
- Edit/Save circle icon buttons (40×40) across VoiceMemoDetailScreen, NoteEditorModal, CreateAlarmScreen, CreateReminderScreen. Save circles use accent border; trash uses red border.
- Sound mode + emoji circles in TimerScreen + CreateAlarmScreen use the standard chrome circle.
- Icon-picker fallback shows silver `+` instead of default emoji until the user picks one.
- `src/components/Icons.tsx`: 29+ View-based icons. Default size 20. Pin indicator: small accent dot + "Pin"/"Pinned" text capsule.

### Notes Bottom Toolbar
Edit mode: 5 persistent action buttons — **Attached** (paperclip with count badge), **Camera**, **Gallery**, **Draw**, **Colors**. Colors + Attached show active-state borders when panels open. Attachments panel sits between body and toolbar. Attachments and color picker mutually exclusive. Hardware back peels overlays in order: attachments → color picker → confirm close. Scrollable image strip (horizontal `ScrollView`, 120×120 thumbs centered). Red X delete inside photo bounds with white border + 16px `hitSlop`. Color picker auto-dismisses on hardware back, text input focus, Camera/Gallery/Draw. Share integration: title wired to `handleShare`, rendered as `<h2>` in HTML export, prepended with newline in text share.

### Tutorial Overlay System
- Per-screen first-visit tip carousel across 7 screens: **alarmList** (3 tips), **reminders** (2), **notepad** (3), **voiceMemoList** (3), **calendar** (1), **timers** (2), **games** (1). Dismissal per-screen via `kv_store['tutorial_dismissed_{screenKey}']`.
- **Settings reset:** "Tutorial Guide" row in General calls `resetAllTutorials()` which wipes every `tutorial_dismissed_*` key.
- **Sarcastic DFW voice copy** — same personality voice as `snoozeMessages.ts`, `homeBannerQuotes.ts`, `chessRoasts.ts`.
- **15 voice clips** in `assets/voice/tutorial/`. Alarm Guy character (ElevenLabs v3, male early-30s) fires a one-liner per tip. Scripts use v3 audio tags (`[sighs]`, `[sarcastic]`, `[deadpan]`, etc.). Clips riff independently from body text. Playback via **MEDIA stream** (`Asset.fromModule + downloadAsync` + `PlayerWithEvents` cast).
- **Cancelled-flag race protection** — async IIFE closes over local `cancelled` flag re-checked after `await asset.downloadAsync()`. `stopClip()` called at start of `handleNext` / `handlePrev`. `playerRef.current = player` set **before** `player.play()`.
- **AppState background pause** — `AppState.addEventListener('change', ...)` calls `stopClip()` on any non-'active' state.
- **Hook** `src/hooks/useTutorial.ts` — pure logic (no UI/audio imports). Lazy `useState` initializer reads `kvGet` synchronously so overlay paints with the rest of the screen. Returns `{ showTutorial, tips, currentIndex, nextTip, prevTip, dismiss }` + `resetAllTutorials()`.
- **Component** `src/components/TutorialOverlay.tsx` — section-colored card (`sectionColor + '40'` border + 3px `sectionColor` left accent, `colors.card` bg, 85% width, 320px max). Dot indicators only render when `tips.length > 1`. Next becomes "Got it" on last tip.
- **Backdrop/card sibling structure** — siblings in a wrapper View, not parent/child. Lets backdrop stay hidden from TalkBack while card stays traversable.
- **TalkBack** — backdrop `importantForAccessibility="no-hide-descendants"`. Card `accessibilityViewIsModal={true}` but **no** `accessibilityLabel`. Decorative dot row `importantForAccessibility="no"`.

### Premium Foundation (Plumbing)
- **`expo-iap@^4.0.2`** — Expo-native Google Play Billing 8.x wrapper. Registered in `app.json` plugins.
- **Google Play product** — `dfw_pro_unlock`, **$1.99 USD, one-time (non-consumable), active**. License testers configured.
- **`src/services/proStatus.ts`** — synchronous kv-backed entitlement cache. `isProUser()`, `getProDetails()`, `setProStatus(details)`, `clearProStatus()`. Reads/writes `kv_store['pro_status']` as JSON, with `safeParse` + `isValidProDetails` type guard. Shape: `{ purchased, productId, purchaseDate, purchaseToken? }`.
- **`src/hooks/useEntitlement.ts`** — wraps `useIAP`. Exposes `{ isPro, loading, error, productPrice, purchase, restore }`. Initializes `isPro` from `isProUser()` so offline cases still reflect local cache. `fetchProducts` fires when `connected` flips true with `.catch()`. `purchase()` has `isPro`/`connected` guards and 60s `setTimeout` clearing stuck `loading`. `restore()` uses `try/finally` for loading clear. `availablePurchases` effect acknowledges via `finishTransaction({ purchase, isConsumable: false })` — unacknowledged Android purchases auto-refund after 3 days. Success path calls `finishTransaction`, persists `ProDetails` with `purchaseToken`, flips `setIsPro(true)`. Error path recognizes cancels via `ErrorCode.UserCancelled` + `message.includes('cancel')` fallback.
- **Backup coverage** — `pro_status` is a standard kv row archived in `dfw.db` snapshot. Pro survives .dfw round-trips.

### Pro Tier

**Core:** 3 free rounds per game for Chess, Checkers, Trivia, Sudoku, Memory Match (the 5 `GATED_GAMES`). Daily Riddle, Guess Why, Trophies stay **free forever**.

**Game trials (`src/services/gameTrialStorage.ts`):** per-game counter persisted in `kv_store['game_trial_{game}']`. `incrementTrial` only fires for non-Pro. `GamesScreen.handleGamePress` checks `canPlayGame(game)` before navigation — false sets `gateGame` and opens ProGate with `game={gateGame}`. Single check point. `getTrialRemaining` returns `Infinity` for Pro users. Counters not reset on disk.

**Badge UI** per gated card: Pro user → "PRO" (accent), trials remaining → "{n} free rounds left" (textTertiary), exhausted → "Pro required" (red).

**Theme gating:** `PRO_THEMES = new Set(['vivid', 'sunset', 'ruby'])`. Theme picker renders `<LockIcon>` inside the inner circle of locked themes for non-Pro users, outer ring at 0.5 opacity + "PRO" caption. Tapping a locked theme closes the picker and opens ProGate (no `game` prop → generic header pool).

**ProGate paywall modal (`src/components/ProGate.tsx`)** — presentational. Props `{ visible, onClose, game?, isPro, loading, error, productPrice, onPurchase, onRestore }`. Each parent screen calls `useEntitlement()` once and passes values down → single IAP hook instance per screen. Conditional mount (`{proGateVisible && <ProGate.../>}`) prevents stale subscriptions.
- **Two header pools** selected once on mount:
  - Game: "Your free rounds are up. Impressed? We thought so." / "3 rounds wasn't enough, huh? We're flattered." / "Look who wants more. Can't say we blame you."
  - Generic: "You've got taste. This one's for Pro members." / "Upgrade your experience. You know you want to." / "The good stuff is right behind this button."
- Accent: `colors.sectionGames` when `game` set, `colors.accent` otherwise.
- Benefits: "Unlimited Brain Games", "Premium Themes (Vivid, Sunset, Ruby)", "Google Calendar Sync", "Multiplayer Chess (coming soon)".
- Auto-close on purchase via `wasProRef` effect detecting `isPro` false→true. Game flow plays `gameWin` SFX. Errors auto-clear after 3s.

**Founding user system (`src/services/foundingStatus.ts`):** existing users get Pro forever. `runFoundingMigration()` detects onboarding-before-v1.23.0 via strict `kvGet('onboardingComplete') === 'true'` check, auto-grants Pro with `productId: 'founding_user'` and writes `founding_status` JSON `{ isFoundingUser: true, grantedAt: ISO }`. Idempotent via `founding_check_done` flag. `setProStatus` gated on `!isProUser()` to avoid double-grant. Only literal `'true'` qualifies. Called from `App.tsx` in its own try/catch on both success and `_migrated` recovery paths.

**Settings DFW Pro section** — three render variants: Founding User card (gold-tinted, highest priority), Pro card (with formatted purchase date if available), or Free user card (Upgrade header + benefits + `Unlock Pro — {productPrice}` accent button + Restore secondary link + inline `purchaseError`).

**Restore Purchases row** in Support section visible to all states. `restoreLoading` + `restoreResult` state; result text auto-clears after 3s.

**Purchase flow:** all paths flow through `entitlement.purchase()` → `useIAP.requestPurchase` → `onPurchaseSuccess` → `finishTransaction({ isConsumable: false })` → `setProStatus` → entitlement flip. **Restore flow:** `entitlement.restore()` → `useIAP.restorePurchases` → `availablePurchases` scan → `finishTransaction` → `setProStatus`. Local cache survives reinstalls via .dfw backup.

### Google Calendar Write-Back (Pro-gated)
Free tier gets read sync; Pro tier adds write that pushes DFW alarms + reminders to a dedicated calendar.
- **Manual "Sync Now"** — no auto-sync, no background scheduling.
- **Dedicated calendar** named "Don't Forget Why" created on first sync (or reused if same summary found via `users/me/calendarList?minAccessRole=owner`). Calendar id persisted in `kv_store['gcal_dfw_calendar_id']`. 404 falls through to list-and-create.
- **Sync map prevents duplicates.** Every synced item id mapped to its Google event id in `kv_store['gcal_sync_map']`. Re-syncs PUT existing events.
- **Recurring alarms** emit `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR` rules. DTSTART derived from `alarm.createdAt` via `stableFirstDate(days, createdAt)` — first matching weekday on or after creation date — so DTSTART stays **stable for the alarm's lifetime** and re-syncs don't drift forward (the previous `nextOccurrenceDate` approach advances daily and made Google drop past occurrences).
- **One-time alarms + reminders** sync as `dateTime`/`date` events in local timezone. Reminders without `dueTime` → all-day; with time → 30-min timed.
- **Soft-deleted / disabled / completed items** trigger DELETE on the mapped event. `deleteEvent` treats 2xx + 404 as success. `syncItem` catches throws, counts errors, and preserves mapping so next sync retries idempotently.
- **Auth recovery:** `authedFetch` handles 401 (token refresh + retry) AND 403 (re-request write scope via `requestCalendarWriteScope` + retry).
- **Write scope requested on enable** — not up front in `GoogleSignin.configure()`. Principle of least privilege.
- **Sync map preserved on sign-out.** `firebaseAuth.signOutGoogle` clears `gcal_dfw_calendar_id` + `gcal_sync_enabled` but intentionally does NOT touch `gcal_sync_map`. Same-account sign back in picks up existing mapping → no duplicates.
- **Settings UI:** "Google Calendar Sync" card under Google Account, visible only when signed in AND Pro. Toggle + Sync Now + last-sync result ("Synced N items" / "(M failed)"). Free / non-signed-in users see nothing; signed-in non-Pro see helper "Calendar sync available with Pro".

### HomeScreen Opening Clip
`Opening.mp3` plays once on first HomeScreen mount after onboarding. Same MEDIA-stream expo-audio pattern as tutorial clips. One-time gate via `kvGet('openingClipPlayed')` flag in kv. AppState background pause. **Total 84 voice clips: 68 original + 15 tutorial + Opening.mp3.**

### Firebase Auth
- **Optional Google Sign-In** from Settings. Uses `@react-native-google-signin/google-signin` + `@react-native-firebase/auth`. Entirely voluntary.
- **Settings Google Account card.** Connected: 36×36 profile photo + name + email + Disconnect (two-step Alert). Disconnected: "Connect Google Account" button. Explanation: "Optional. Enables calendar sync and future connected features. Your local data stays on your phone either way."
- **Sign-in:** `hasPlayServices` → `GoogleSignin.signIn` → `GoogleAuthProvider.credential(idToken)` → `signInWithCredential`. Background `createOrUpdateUserProfile(user)` write to Firestore `users/{uid}` (never blocks UX).
- **Sign-out:** clears calendar cache, signs out of both Firebase Auth and Google Sign-In.
- **Cancel detection** — native `signIn()` returns `{ type: 'cancelled' }`. Re-thrown as synthetic Error with `code: 'SIGN_IN_CANCELLED'`; handler silently returns. Tolerates legacy iOS `'-5'`.
- **User profile** — `users/{uid}` carries `{ uid, email, displayName, photoURL, createdAt, lastSignIn }`. `createdAt` only on first sign-in (guarded by `snap.exists()`); subsequent updates use `set(payload, { merge: true })`. Shape validated via `isUserProfile`.
- **Firestore rules:** `match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`.
- **Scopes up front** — `calendar.readonly` in `GoogleSignin.configure()`. Legacy sign-ins upgraded lazily via `requestCalendarScope()` on 403.
- **Auth state subscription** — Settings/Home/Calendar subscribe to `onAuthStateChanged`.

### Google Calendar Sync (Read)
Reads primary Google Calendar via REST (`/calendar/v3/calendars/primary/events`). No SDK — `fetch` + Bearer token. Read-only (`calendar.readonly`).
- **Where events render:**
  - HomeScreen Today — today's events alongside alarms/reminders. Color `sectionCalendar`, label "Google". "All Day" for all-day events. Tap is no-op. "G" visual cue.
  - CalendarScreen month grid — `sectionCalendar` dots on each day. Multi-day all-day events expand via `getEventDateStrings(event, year, month)`. Legend entry "Google" when signed in.
  - CalendarScreen day/week/month list — cards with "Google" badge. Not tappable.
  - Filter capsule "Google" (week/month only) when signed in.
- **Fetching:** HomeScreen fetches single-day in `useEffect([authUser])`. CalendarScreen fetches month range in `useEffect([currentMonth, authUser])`. Query window built via local-timezone `toISOString`.
- **Caching:** 5-min in-memory (module-level `Map` keyed `${startDate}_${endDate}`). Cleared on sign-in/out. No local persistence.
- **Error recovery:** no token / network / non-OK → silent empty. **401** → `clearCachedAccessToken` + refresh + retry once. **403** → `requestCalendarScope()` + retry once. Retry-after-retry → silent empty.
- **Silent when absent** — no legend, filter, dots, Today rows, or prompts until user signs in.

### SettingsScreen Structure
6 sections with uppercase accent headers: **General** → **Appearance** → **Sound & Haptics** → **Google Account** → **Data** → **Support**.
- **General** — 24-Hour Time, Time Input Style, Silence All Alarms + duration picker, Tutorial Guide reset.
- **Appearance** — Theme picker card, Screen Background photo + overlay slider.
- **Sound & Haptics** — Voice Roasts, Haptic Feedback, Game Sounds toggles.
- **Google Account** — Connect/Disconnect card.
- **Data** — Privacy blurb + Your Memories card (Export/Import/Auto-Export, folder, frequency).
- **Support** — Send Feedback, About, Permissions / Setup Guide, Restore Purchases row.

**Theme picker** — compact card (accent dot + theme name + chevron). Tap opens bottom-sheet modal with 3×2 theme grid. Selecting applies theme, fires light haptic, auto-closes.

### Home Screen Widgets (4)
- **Memory's Timeline (DetailedWidget):** two-column timers/alarms, reminder bars, section-colored nav capsules, "Don't Forget Why" footer.
- **Forget Me Notes (NotepadWidget):** 300×280dp. Mic (RECORD_VOICE), "Voice" capsule, centered "Forget Me Notes" title (OPEN_NOTES), "Notes" capsule, note icon (ADD_NOTE). Mixed notes + voice memos with pinned-first sort, sliced to 4.
- **Misplaced Thoughts (CalendarWidget):** mini month grid with dot indicators.
- **Memory's Voice (MicWidget):** standalone 1×1 (70dp min). Red record circle, tap opens VoiceRecordScreen.
- All: resizable, deep-link, privacy guards on private alarms. `WidgetTheme` includes `red` property.

### Theme System
6 themes (3 dark + 3 light):
- **Dark** — Blue (#5B9EE6), midnight — daily driver
- **Light (Ocean)** — Blue (#2563EB), blue-gray
- **High Contrast** — Cyan (#00D4FF), pure black — accessibility
- **Vivid** — Neon green (#00FF88) — **Pro**
- **Sunset** — Orange (#E8690A), cream — **Pro**
- **Ruby** — Rose (#E11D48), pink-tinted — **Pro**

`ThemeColors` includes section tokens (`sectionAlarm`, etc.). Mode-aware rendering. Photo overlay always dark regardless of mode. Light mode cards use `sectionColor + '15'`; dark mode `sectionColor + '20'`. Photo-aware alphas on HomeScreen. Card depth via elevation/shadow. `colors.brandTitle` per-theme for HomeScreen title.

### Font System
Three-tier: **Satisfy** (app title), **LilitaOne** (game screen headers), **Montserrat Alternates** (everything else — Regular/SemiBold/Bold/ExtraBold). `fontWeight` replaced with `fontFamily` throughout (Android ignores `fontWeight` with a custom `fontFamily`). `useFonts` holds splash until fonts ready; system-font fallback if loading fails. `FONTS` exported from `src/theme/fonts.ts`.

### Swipe-to-Delete
SwipeableRow component — swipe both directions to reveal delete. Integrated on AlarmListScreen, ReminderScreen, NotepadScreen, VoiceMemoListScreen. Delete removed from cards; Pin stays as capsule. GestureHandlerRootView wraps App.tsx.

### Emoji Picker Modal
EmojiPickerModal: bottom sheet with 11 categories × ~10 emojis = 105 labeled emojis. Categories: Health, Routine, Food, Fitness, Home, Work/School, Finance, People, Travel, Pets, More. Horizontal capsule tabs + 5-column labeled grid. Container height 45%. Quick emoji rows context-specific (alarm: 8 wake-up; reminder: 8 recurring-event). AlarmCard emoji optional — AlarmIcon when none selected.

### Button Hierarchy
Shared `buttonStyles.ts` with `getButtonStyles(colors)`: 4 types × 2 sizes — primary (accent bg), secondary (capsule), destructive (red text), ghost (minimal). Applied across CreateAlarmScreen, CreateReminderScreen, deleted card Restore/Forever, SettingsScreen (silence modal, setup guide, background), NoteEditorModal color picker, DrawingPickerModal.

### DrawingCanvas
`src/components/DrawingCanvas.tsx` — full-screen Skia canvas modal with PanResponder. Modals extracted to `DrawingPickerModal.tsx`. DrawingCanvas fully themed. `forceDark` prop on BackButton + HomeButton for contexts requiring dark appearance.

### Privacy System
Private alarms/reminders: completely blank cards. Content only in edit screen. Widgets show generic icon and "Alarm".

### Background Images
- Game screens: AI-generated themed backgrounds with dark overlays (0.55-0.7 opacity).
- Games Hub + Settings: semi-transparent cards over background images.
- Main tabs: user photo with configurable overlay (dark in dark mode, white in light mode, 30-80% opacity) or app icon watermark (0.15 dark / 0.06 light) when no photo set.
- Alarm fire: per-alarm photo (if set) with 0.7 overlay, or lightbulb.png default.

### Sorting, Filtering, Soft Delete
- Alarms: sort by Time/Created/Name, filter by All/Active/One-time/Recurring (default All).
- Reminders: sort by Due Date/Created/Name, filter by Active/Completed/Has Date.
- Soft delete with UndoToast (5s, key-based reset), 30-day auto-purge.

---

## 2. P2 Implementation Details

### 2.1 Note Image Attachments
Images stored under `note-images/`. Save flow: copy images first, save note in inner try/catch, rollback newly copied files on failure. Removed images deleted only after `updateNote` succeeds. Thumbnail keys use `${uri}-${idx}`. Image-only notes supported. Print: `buildNoteHtml` converts file:// to base64 via `FileSystem.File.base64()`. Thumbnails use `resizeMethod="resize"`. Share: "Share Text" + "Share Photos" (per-image `Sharing.shareAsync`) when images present. Print uses white bg (#FFFFFF) + dark text (#1A1A2E).

### 2.2 Notepad Drawing/Sketch Mode
`src/components/DrawingCanvas.tsx` — full-screen Skia canvas with PanResponder.

**Architecture:** Strokes stored as serializable `StrokeData` (`pathSvg` SVG string, `color`, `strokeWidth`) — no native SkPath in React state (avoids "Invalid prop value for SkPath" crash). SkPath memoized via `useMemo` keyed on strokes — rebuilt only on release/undo/clear, not during 60fps touch moves. In-progress stroke tracked as `{x,y}[]` in a ref; fresh SkPath built each render via `buildPathFromPoints`. Canvas bg via `<Fill color={canvasBgColor}>` — captured in PNG snapshot.

**Tools:** Pen (round caps/joins), Eraser (draws in current bg color), color palette (8 presets + custom via reanimated-color-picker), BG color picker, stroke widths XS(1)/S(3 default)/M(6)/L(12), Undo, Clear (Alert), Cancel (prompts "Discard Drawing?" if strokes exist), Done (blocks empty with toast).

**S Pen pressure:** `nativeEvent.force` sampled on `onPanResponderGrant`. Formula: `baseWidth * pressure * 2`. Falls back to base width without force.

**Save flow:** `makeImageSnapshot()` → `encodeToBytes(ImageFormat.PNG)` → `File.write(bytes)`. Companion JSON `{ strokes, bgColor }` saved alongside PNG. Naming: `drawing_${Date.now()}_${uuid8}.png` + `.json`.

**Edit flow:** `loadDrawingData(imageUri)` checks for companion `.json`, returns `{strokes, bgColor}` or null. Early-returns null for `.jpg`. Editing generates new filename (cache bust), deletes old PNG + JSON. `saveNoteImage` detects `.png`, copies companion `.json`.

**Share modal:** custom dark modal replacing `Alert.alert` (Android 3-button limit). Options: Share Text, Share Photos (correct MIME per file), Share as PDF, Print, Cancel.

### 2.3 Custom Photo Background Underlay
One user-selected photo shared across AlarmListScreen, NotepadScreen, CalendarScreen.

**Service:** `src/services/backgroundStorage.ts` — atomic save (copy new → persist AsyncStorage key → best-effort delete old). Dir: `${Paths.document}backgrounds/`.

**Keys:** `bg_main` (URI string), `bg_overlay_opacity` (0.3–0.8, default 0.5).

**Settings UI:** "Screen Background" section — photo picker, thumbnail preview, Change Photo, Clear Background (Alert), opacity presets (30-80%) as pill row.

**Screen integration:** photo set → `ImageBackground` + dark overlay. Not set → `fullscreenicon.png` watermark at 0.07. `onError` sets `bgUri` null.

### 2.4 Per-Alarm Photo on Fire Screen
Optional photo per alarm as full-bleed background on AlarmFireScreen.

**Type:** `photoUri?: string | null` on Alarm.

**Service:** `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto(alarmId, sourceUri)` copies to `${Paths.document}alarm-photos/` as `alarm_${alarmId}_${timestamp}.jpg`. `deleteAlarmPhoto(uri)` best-effort. `alarmPhotoExists(uri)` sync check.

**Deferred save pattern (useAlarmForm.ts):**
- `pickPhoto()` stores temp cache URI in state — no file copy.
- `clearPhoto()` clears state — no delete.
- `originalPhotoRef` tracks existing URI, `photoChangedRef` tracks modification.
- On save: if `photoChangedRef`, copy temp → permanent, best-effort delete old.
- Alarm ID pre-generated via `useState(() => existingAlarm?.id || uuidv4())` so filename uses correct ID.

**CreateAlarmScreen:** "Wake-up Photo" section between note char count and Guess Why.

**AlarmFireScreen:** conditional `ImageBackground` — `photoFailed` state for fallback. `hasAlarmPhoto = !isTimer && !!alarm?.photoUri && !photoFailed`. Dark overlay 0.7. Timers always lightbulb.png.

**Cleanup:** `permanentlyDeleteAlarm` + `purgeDeletedAlarms` delete photo files. Soft-delete keeps photo.

### 2.5 File Splits
- **NoteEditorModal.tsx** → `ShareNoteModal.tsx`, `ImageLightbox.tsx`, `noteColors.ts`.
- **CreateAlarmScreen/CreateReminderScreen** → `DayPickerRow.tsx`, `useAlarmForm.ts`, `useReminderForm.ts`.
- **App.tsx** → `useNotificationRouting.ts`.

### 2.6 Back Button Header Consistency
All screens with back buttons use the Notepad pattern: fixed header above scroll, centered title, absolute `BackButton` at `left: 20, top: insets.top + 10`.

**Applied:** Settings, Calendar, About, MemoryScore, Games, DailyRiddle, ForgetLog, Trivia, MemoryMatch, Sudoku.

**Excluded:** in-game views (Trivia gameplay, MemoryMatch gameplay, Sudoku active play) use custom top bars with score/timer/streak.

### 2.7 Phase 2 Files
| File | Purpose |
|------|---------|
| `src/services/backgroundStorage.ts` | Shared screen background photo storage |
| `src/services/alarmPhotoStorage.ts` | Per-alarm photo save/delete/exists |
| `src/components/ShareNoteModal.tsx` | Share/print note modal |
| `src/components/ImageLightbox.tsx` | Fullscreen image viewer |
| `src/components/DayPickerRow.tsx` | Day-of-week picker row |
| `src/utils/noteColors.ts` | getTextColor contrast utility |
| `src/hooks/useAlarmForm.ts` | Alarm form state + deferred photo save |
| `src/hooks/useReminderForm.ts` | Reminder form state |
| `src/hooks/useNotificationRouting.ts` | Notification event handlers |

---

## 3. Voice Memo Implementation Details

### VoiceRecordScreen
Accessed via NotepadScreen mic FAB or widget RECORD_VOICE. Tap large circle to start (requests RECORD_AUDIO on first use). Pause/resume (green) + stop (red) during recording. `isPausedRef` prevents rapid-tap duplicate intervals. After `stopRecording`, immediately `navigation.replace('VoiceMemoDetail', { tempUri, duration })`. `transitionRef` prevents rapid-tap races. AppState listener navigates to detail with partial recording on background. `beforeRemove` intercepts all back methods — stops + discards during recording, allows programmatic nav via `navigatedRef`.

### VoiceMemoDetailScreen
Dual mode: `{ tempUri, duration }` for new recordings, `{ memoId }` for existing. **New recordings:** Save/Discard at bottom. Save is transactional — `saveVoiceMemoFile` copies temp to permanent, `addVoiceMemo` writes metadata. If metadata fails, permanent copy deleted, temp preserved for retry. `savingRef` blocks exit during save. **Existing memos:** explicit Save capsule in header (visible only when title/note differ from initial refs). `handleSaveExisting` returns `Promise<boolean>` — false prevents "Save & Exit" from navigating. Seekable playback (44px touch target wrapping 6px bar, play/pause #4CAF50 64x64, back/forward 5s). `beforeRemove`: blocks during save, new recordings get "Discard recording?", existing with changes get "Unsaved changes" (Cancel/Discard/Save & Exit). Soft delete with 30-day pattern. Note text unlimited; title `maxLength={100}`.

### VoiceMemoCard
`React.memo` wrapped, theme-aware. View-based play/pause in #4CAF50 circle (36x36). Title (fallback "Voice Memo"), subtitle (duration · relative time), mini progress bar (3px, visible when progress > 0). Capsule pin/delete matching alarm/reminder. Purple border accent (#A29BFE). `colors.card + 'CC'` bg.

### VoiceMemoListScreen
Standalone, separated from NotepadScreen. Pinning max 4 via `widgetPins.ts`. Pin state preserved on undo delete via `deletedVoiceMemoPinnedRef` (useRef, not useState — avoids stale closure from same-render key increment). Random personality undo messages.

### Storage
- `voiceMemoStorage.ts`: SQLite `voice_memos` CRUD with soft-delete. All mutators re-throw after `console.error`.
- `voiceMemoFileStorage.ts`: expo-file-system new API. Files at `${Paths.document}voice-memos/{memoId}_{timestamp}.m4a`.
- `noteVoiceMemoStorage.ts`: separate service for note-attached memos (legacy).
- `widgetPins.ts`: pin functions using `'widgetPinnedVoiceMemos'` kv key, max 4.

### Permission
`android.permission.RECORD_AUDIO` in `app.json`.

### Widget
NotepadWidget renders mixed notes + voice memos with pinned-first sort, sliced to 4. `VoiceMemoCell` uses `theme.cellBg` + `theme.text`. MicWidget: standalone 110dp for quick recording.

---

## 4. Backup & Restore
- Export: .dfw file containing `dfw.db` + all media folders + manifest.
- Import: file picker, manifest validation, two-step confirmation, transactional restore with rollback.
- Auto-export: SAF folder picker, daily/weekly/monthly frequency, silent export on app open.
- Settings: "Your Memories" section with privacy messaging, export/import buttons, auto-export toggle, 30-day nudge.
- Privacy: "We don't have servers. We don't want your data."

---

## 5. Onboarding
Full rewrite with sarcastic personality copy. View-based icons (no emoji). Mic + camera permission slides. Theme cycling preview (all 6 themes cycle on swipe, local state). Watermark background (`fullscreenicon.webp`). Sarcastic skip warnings on every permission. Dynamic final slide based on skip count.

---

## 6. Accessibility

### Pass
All interactive elements across HomeScreen, NotepadScreen, AlarmListScreen, ReminderScreen, GamesScreen, AlarmCard, NoteCard, DeletedNoteCard, DeletedAlarmCard have `accessibilityLabel`, `accessibilityRole`, `accessibilityState` (for pills), `accessibilityHint`. Filter/sort pills use `accessibilityState={{ selected }}`. Cards get descriptive labels. Edit targets include "Tap to edit"; note cards include "Long press to copy". Switches get dynamic labels. Pin buttons contextual. Restore/Forever explicitly labeled.

### Icon Accessibility
`IconProps` has optional `accessibilityLabel`. Icons default to `importantForAccessibility="no-hide-descendants"` when no label. When label provided, becomes focusable with `accessible={true}`. Icons wrapped inside labeled TouchableOpacity stay decorative; standalone icons get labels.

---

## 7. Asset Formats

### WebP Backgrounds
10 game/screen backgrounds: `oakbackground`, `questionmark`, `newspaper`, `lightbulb`, `brain`, `door`, `fullscreenicon`, `gear`, `library`, `gameclock`. Resized to 1440px max (1080px for watermark), quality 80 (70 for watermark). 31.8 MB → 1.5 MB (95.4% reduction).

### Protected PNGs
`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png` — unchanged (store/platform dimension requirements).

---

## 8. Keyboard-Aware Done Button

In "type" time-input mode, the small Done button under the TextInputs (which calls `Keyboard.dismiss()`) only renders when the soft keyboard is visible. Both CreateAlarmScreen and CreateReminderScreen: `keyboardVisible` state via `Keyboard.addListener('keyboardDidShow'/'keyboardDidHide')`, Done wrapped in `{keyboardVisible && (...)}`. Bottom time-modal Done (paired with Cancel) NOT affected. Prevents an orphaned Done lingering after elsewhere-tap dismissal.

---

## 9. Chess Implementation Details

### Pre-Game Setup
Card modal when no game in progress. Pick color (tap white/black king image, selected gets accent border), difficulty (5 capsule pills, default Intermediate), Play (full-width accent). Player black → AI moves first.

### Active Game Screen
Top-to-bottom: header (difficulty name + move number) → "Thinking…" indicator (fixed-height container reserves space) → opponent captures → board → player captures → action bar (Take Back + Resign) → roast toast (absolute, above safe-area bottom).

### Board
8×8 nested Views. Square size `(screenWidth − 32) / 8`. Selected square `colors.accent + '90'`. Valid destinations show dot (empty) or ring (enemy). Rank + file labels respect orientation (board rotates 180° for black). Pieces: 12 anthropomorphic WebP (512×512, transparent) in `assets/chess/`. White cream/gold, black charcoal/silver. Mapped in `chessAssets.ts` via `getPieceImage({ type, color })`. Pawn promotion hardcoded to queen.

### Captured Pieces
Derived from `game.history({ verbose: true })` — iterates moves with `captured` set, groups by color. Correct under promotion. Opponent above, player below. 18×18 piece images.

### Take-Back
One per game. Pill text "Take Back" → "Used" + opacity 0.4 when spent. Guarded by `!takeBackUsed && isPlayerTurn && history.length >= 2` — undoes player's last + AI's response. Pending AI timers cancelled. Dedicated take-back roast.

### Resign
Red-tinted pill with Alert.alert. Sets `gameResult='resigned'`, `winner=opposite`, clears saved game, records loss.

### Check / Checkmate
- Red king square (`rgba(220, 38, 38, 0.6)`) highlights checked king.
- "CHECK!" pulsing status text (18pt red) — pulses on player turn, solid during AI turn.
- "CHECKMATE!" banner on checkmate (checked before isInCheck).
- Red board border `#EF4444` replaces accent border on check.
- `hapticHeavy()` on check. `hapticError()` on checkmate.

### Training Mode
Toggle on pre-game for difficulty 0-2. Threatened pieces (player's under attack) highlighted red `rgba(220, 38, 38, 0.35)`. Last move (AI's from/to) gold `rgba(250, 204, 21, 0.4)`. Both persist through game-over (guarded by `!isAIThinking`). Training games skip Memory Score (`teachingModeRef` skips `recordChessResult`). Teaching pill in game header when active.

### Turn Indicator
Pulsing "Your Move" (accent, 20pt, weight '800', opacity 0.4→1.0 800ms loop). Accent board border on player turn (2px, always present — avoids layout shift). Status bar priority: CHECK! (red) > Thinking… (white) > Your Move (accent) > nothing. `hapticLight()` when AI finishes.

### Post-Game Move Review
FEN history in `fenHistoryRef` — pushed after every move, sliced on take-back, rebuilt from moveHistory on restore. Game-over overlay shows Review Game (accent) + New Game (secondary). Review: non-interactive board from `reviewBoard` (derived from FEN at current index). Nav controls: « ‹ [counter] › » (36px circular). Buttons disabled at bounds (opacity 0.3 + `accessibilityState={{ disabled: true }}`). Captures hidden in review.

### Game-Over Overlay
Full-screen backdrop + centered card. Title (Checkmate! / Stalemate / Draw / You Resigned), contextual subtitle, Review Game (accent) + New Game (secondary).

### Roast Toast
Severity-tinted bg (good=accent+30, inaccuracy=amber, mistake=orange, blunder=red, catastrophe=deep red, takeBack=accent). Native-driver opacity fade, 4s hold, auto-clears.

### Persistence
Every move → `saveCurrentGame()` → `chess_game` (single-row table). On relaunch, `loadChessGame()` reads the row, replays `moveHistory` on a fresh `new Chess()` (rebuilds chess.js internal history so take-back still works). If it's the AI's turn in the restored position, triggers AI automatically. Row cleared on checkmate/stalemate/draw/resign/newGame.

### Local Engine (Offline Fallback)
- **Opening book** — 104 hardcoded FEN-keyed positions (first 6-10 plies). Instant, random pick among 1-3 sound moves. Sits at top of `findBestMove` and `getAIMove`; `analyzeMove` skips the book.
- **Transposition table** — 100K-entry FEN-keyed cache (first 5 FEN fields so halfmove-clock doesn't collide). Stores `{depth, score, flag, bestMove}` with EXACT/LOWERBOUND/UPPERBOUND. Depth-preferred replacement + FIFO eviction. Cleared at start of each `findBestMove`. TT best-move hint is top move-ordering signal (+100,000).
- **Killer moves** — per-ply (up to 32), two slots. Slot 0 +90, slot 1 +80.
- **Null-move pruning** — R=2. Skipped in check (illegal) and endgame (zugzwang). Implemented by flipping side-to-move in a FEN + throwaway `Chess` instance.
- **Min-depth + max-time difficulty** — each level has `minDepth`, `maxDepth`, `timeLimitMs`. Depths ≤ `minDepth` complete unconditionally (`searchMinDepthActive` forces `isTimeUp()` false); above respect `searchDeadline`. Safety ceiling `searchSafetyDeadline = now + timeLimitMs × 3`. Worst case 3× budget.
- **Tapered eval** — continuous material-phase [0,1] computed inline in single board scan. King PSTs blend MG/EG. Pawn shield fades in endgame. Passed-pawn [0,10,15,25,40,60,90,0] by rank, scaled `1 + (1-phase)*0.5`. Rook on open file +25, semi-open +15.

---

## 10. Tests

Jest test suites:
- **52 checkers tests** — `__tests__/checkersAI.test.ts`
- **69 chess tests** — `__tests__/chessAI.test.ts`
- Additional coverage: `asyncMutex`, `backupRestore`, `calendarSync`, `firebaseAuth`, `firestore`, `foundingStatus`, `gameTrialStorage`, `googleCalendar`, `noteColors`, `proStatus`, `safeParse`, `settings`, `soundModeUtils`, `time`, `timeUtils`, `tutorialTips`, `voiceClipStorage`, `widgetPins`.
