# DFW Bug History
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 36 (April 18, 2026)

**For Sessions 1-28 bug history, see DFW-Bug-History-Archive.md.**

---

## 1. Summary Statistics

- **~115+ unique bugs** found and fixed across the project lifetime
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

### Session 31 — P7 Pro Tier + Calendar Write-Back Audit Findings

Triple audit (Codex + Claude + Gemini) on the Session 31 P7 Pro Tier scope found 3 P1 + 13 P2. All fixed.

**Bug: Double `useEntitlement()` on SettingsScreen (P1 — double `finishTransaction()`)**
- Found: Session 31 audit (Codex)
- Cause: ProGate originally owned its own `useEntitlement()` hook AND was rendered unconditionally inside SettingsScreen, which already owned one hook instance for the inline DFW Pro card. Two hook instances meant two `useIAP()` registrations, and `onPurchaseSuccess` → `finishTransaction()` fired twice on a single purchase. Google Play Billing logs a duplicate-finish error, and on a worst-case kernel-preempt the second finish could theoretically race the first across the IAP native bridge
- Fix: Two complementary changes. (a) ProGate is now mounted conditionally via `{proGateVisible && <ProGate.../>}` on both SettingsScreen and GamesScreen — a hidden modal no longer keeps a stale hook subscription alive. (b) ProGate was rewritten to accept entitlement values as props (`isPro`, `loading`, `error`, `productPrice`, `onPurchase`, `onRestore`) instead of calling `useEntitlement()` internally. Each parent screen now owns exactly one hook instance and passes the values down

**Bug: `deleteEvent` ignored HTTP failures, dropped sync mapping anyway (P1 — calendar dupes)**
- Found: Session 31 audit (Codex)
- Cause: `calendarSync.deleteEvent` awaited `authedFetch` but never inspected the response status. `syncItem` then called `delete syncMap[itemId]` unconditionally on the assumption "we tried, it's done either way". A 500 response from Google would still drop the sync-map mapping, and the next sync would create a **duplicate event** because the service no longer remembered the old one had already been created
- Fix: `deleteEvent` checks the response status and throws on non-2xx/non-404 (404 = already gone server-side, counted as success). `syncItem` wraps the delete call in a try/catch — only removes the sync-map entry on success, logs a warning + counts an error + **preserves the mapping** on failure so the next sync retries idempotently. Retries hit the same map entry, call DELETE again, and either succeed (event gone, mapping cleared) or fail again (mapping still there, error counted again, no duplicate created)

**Bug: Founding badge skipped for already-Pro users (P1 — missing badge)**
- Found: Session 31 audit (Claude)
- Cause: The initial `runFoundingMigration()` short-circuited with `if (isProUser()) return` at the top, on the theory that an already-Pro user doesn't need a Pro grant. But this also skipped the `founding_status` write — meaning an existing user who somehow already had Pro (via a test purchase, a Play Store license-tester account, or a restored backup from a Pro install) would never get the founding badge written to kv_store. The Settings screen's "Founding User" card would never render for them
- Fix: Removed the early return. Restructured so the `founding_status` write is **always** performed for any user with `kvGet(ONBOARDING_KEY) === 'true'`, independent of the Pro-status check. `setProStatus({ productId: 'founding_user', ... })` is still gated on `!isProUser()` to avoid double-granting Pro to someone who already has it. Two independent operations, two independent guards. Also added the strict-equality check on `ONBOARDING_KEY` — a corrupted value like `'false'`, `'yes'`, or anything truthy-but-wrong no longer grants Pro to a fresh install

**P2 sweep (13 findings, all fixed)**
- Context-aware ProGate headers — the header text pool is now selected on mount based on whether `game` is set. Game pool references free rounds being up; generic pool references Pro membership in general. Keeps the theme-picker paywall from saying "your free rounds are up"
- Outer `TouchableWithoutFeedback` accessibility cleanup — removed `accessibilityRole="button"` + `accessibilityLabel="Close paywall"` from the outer backdrop wrapper (was incorrectly making TalkBack announce the entire modal as one button). Only the inner close-X carries the button role
- `gameWin` sound gated on `game` prop — the paywall auto-close effect now only plays `gameWin` SFX when `game` is set, so the theme/calendar flow doesn't fire a game-win SFX on a successful theme unlock
- `incrementTrial` gated on `!isPro` — Pro users don't accumulate meaningless kv writes every time they open a game
- Restore row loading + result feedback on the Settings restore row — `ActivityIndicator` while loading, "Purchase restored!" / "No purchases found" text below the row, auto-clears after 3s, row disabled during the restore call to prevent tap-spam
- `purchaseError` rendered in the Support section — was previously only inside the free-user DFW Pro card, so Pro and founding users couldn't see errors that bubbled up from the entitlement hook during a restore attempt
- `calSyncEnabled` refreshed on auth state change — the `onAuthStateChanged` listener in `useSettings` now re-reads `isSyncEnabled()` so signing out resets the toggle in real time
- `setTimeout` cleanup with `useRef` in `useSettings` — the sync-result timeout + restore-result timeout are stored in refs and cleared on unmount so the hook can't leak timers across mounts
- 403 handling in `authedFetch` — `calendarSync` now branches on 401 (token refresh) vs 403 (re-request write scope) instead of treating both the same. Routine hourly token expiry no longer pops a consent sheet
- Stable DTSTART for recurring alarms — `stableFirstDate(days, createdAt)` replaces `nextOccurrenceDate(days, time)` for recurring alarm DTSTART computation. The old implementation advanced daily (because "next occurrence" is always moving forward), so re-syncs moved DTSTART forward and Google Calendar dropped past occurrences. The fix derives DTSTART from `alarm.createdAt` — deterministic for the alarm's lifetime, regardless of when the sync runs
- Circular dep `firebaseAuth ↔ calendarSync` broken — `firebaseAuth.signOutGoogle` no longer imports `clearSyncData` from `calendarSync`. Uses direct `kvRemove` calls for sync state cleanup instead, and **intentionally preserves `gcal_sync_map`** so re-signing the same Google account doesn't recreate duplicate events
- `runFoundingMigration` in its own try/catch in `App.tsx` — moved out of the DB migration try/catch and called on both the success path (after `setDbReady(true)`) AND the kv `_migrated` recovery path. A throw from founding migration is now a warning, not a "Something went wrong" error screen
- Strict `ONBOARDING_KEY === 'true'` equality — corrupted truthy values no longer grant Pro to a fresh install

### Session 31 Phase 2 — Chess AI Redesign + Riddles Audit Findings

A secondary audit ran after the Session 31 P7 ship on the Phase 2 work: chess AI redesign (all 5 levels cloud-first), online trivia, 366 daily riddle bank, and the Bonus Riddles tab. Found 1 P1 + 4 P2. All fixed.

**Bug: `getDailyRiddleIndex` DST non-determinism across timezones (P1)**
- Found: Phase 2 audit
- Cause: Session 22's `getDailyRiddleIndex(dateStr)` used `new Date(dateStr + 'T00:00:00')` (LOCAL time) and `new Date(year, 0, 1)` (LOCAL time) to compute `dayOfYear`. Subtracting two local-time dates across a DST boundary produces a delta that's one hour short of the nominal local-day delta — the UTC offsets shift between January 1 (standard time) and any date after DST spring-forward. `Math.floor` of the short delta rounded down to one less full day, so a user in LA computed `dayOfYear = 103` for `2026-04-15` while a user in Tokyo (no DST) computed `dayOfYear = 104`. Two different riddles for the same `dateStr`, indexed into different slots of the year-seeded shuffle
- Fix: Replaced the entire pipeline with a 366-entry pre-assigned yearly bank (`src/data/dfw_yearly_riddles.ts`) keyed by explicit `dayOfYear`. New `getDailyRiddleForDate(dateStr)` parses the date as `new Date(dateStr + 'T12:00:00Z')` (noon UTC anchor — 12 hours away from any timezone's midnight, eliminates DST fencepost rounding), computes `dayOfYear` via `Date.UTC(year, 0, 1)` subtraction (UTC math = same result on every device), adds 1 to match the 1-indexed bank, and returns `YEARLY_RIDDLES.find(r => r.dayOfYear === dayOfYear)`. Every device in every timezone resolves the same `YYYY-MM-DD` to the same entry. Old `getDailyRiddleIndex` kept with `@deprecated` so any stale import still compiles

**Bug: Dead state in `useDailyRiddle` from removed offline-bank browse (P2)**
- Found: Phase 2 audit
- Cause: Session 22's daily riddle screen had an offline-bank browse mode with its own `selectedCategory` / `setSelectedCategory` / `searchQuery` / `setSearchQuery` / `expandedRiddleId` / `setExpandedRiddleId` / `filteredRiddles` (expensive `useMemo`) / `isOnlineAvailable` (`checkConnectivity` useEffect) state. When the browse mode was repurposed into the online-fresh "Bonus Riddles" tab (Session 31 Phase 2), the state and exports weren't cleaned up. `filteredRiddles` was still running the `RIDDLES.filter(...)` pass on every render, `isOnlineAvailable` was still firing a connectivity check on mount, and none of the state was destructured by `DailyRiddleScreen`
- Fix: Deleted the unused state, effects, and exports from `useDailyRiddle`. Trimmed `UseDailyRiddleResult` interface accordingly. `filteredRiddles` `useMemo` removed along with `RIDDLES`/`RiddleCategory` imports that only it referenced

**Bug: Pro-status source inconsistency on the Bonus tab press (P2)**
- Found: Phase 2 audit
- Cause: `DailyRiddleScreen.handleBonusTabPress` read `isProUser()` (sync kv cache) to decide whether to open ProGate, but the ProGate modal itself received `isPro` from `entitlement.isPro` (the hook-backed reactive state). Two different sources of truth for "is this user Pro?" — if the user purchased Pro in-session via the ProGate, `entitlement.isPro` would flip immediately but `isProUser()` would lag until `kvSet` flushed, briefly showing the paywall again on the next tap. Violates the single-source-of-truth principle the P1.1 Session 31 refactor established
- Fix: Handler now uses `entitlement.isPro` for the gate-open decision, matching the source of truth that ProGate already uses for its own rendering. `isProUser()` import removed from the screen

**Bug: Cloud-eval timeout desyncs the AI "thinking" progress bar (P2)**
- Found: Phase 2 audit
- Cause: `useChess.triggerAIMove` publishes `aiTimeBudget = level.timeLimitMs` (300ms for Easy, up to 3000ms for Master) to the UI and kicks off the progress bar animation before calling `getCloudMove`, which has its own 5000ms abort timeout baked in. On Easy (300ms budget), the UI progress bar drains to zero while the cloud request is still in flight — "Thinking…" hangs on screen for up to 4.7 extra seconds on a slow network. On Master (3000ms budget), the budget is still exceeded on stalls. The "strength budget" semantic from the Session 16/17 local engine ("weak levels move fast, strong levels move slow") is broken on the cloud path
- Fix: Recorded as a known UX mismatch. Not hot-fixed in Phase 2 — the cloud path is reliably fast in practice (typical response time ~100-300ms for positions in the Lichess database), and the cases where the 5s timeout actually fires are rare enough to wait for a proper fix in the next iteration. Future options: clamp the cloud abort to `min(level.timeLimitMs * N, CLOUD_TIMEOUT_MS)`, extend `aiTimeBudget` to cover the worst-case cloud wait, or publish a separate "waiting for cloud" UI state distinct from the budget-bar animation

**Bug: Opening book bypassed by cloud eval on known positions (P2)**
- Found: Phase 2 audit
- Cause: The initial Session 31 Phase 2 wiring had the priority order as *cloud → local → book*. `useChess.triggerAIMove` called `getCloudMove` first, and only fell through to `getAIMove` (which checks the opening book via `getBookMove` before running minimax) if the cloud returned null. For opening positions in the curated 104-entry book, the Lichess cloud always returned a PV first, so `getAIMove`'s book check was unreachable — the book's "1-3 equivalent variety moves per position" was effectively dead code. Easy through Master all played the exact same Stockfish top-choice for every book position instead of picking randomly among the book's sound alternatives
- Fix: Inverted the priority order to **opening book → cloud → local**. `getBookMove(c2)` now runs synchronously first, before any network call. If it returns a move, we use it directly and skip the cloud fetch entirely. If it returns null (position not in book), we fall through to the cloud path as before. Opening variety is preserved at every level; cloud strength takes over the instant we're out of book; local fallback stays unchanged. Added a defensive comment explaining the priority order inside `triggerAIMove`

**Bug: Legacy chess save with out-of-range difficulty index (P2 defensive)**
- Found: Phase 2 audit (preemptive — no user-reported crash yet)
- Cause: The `chess_game` SQLite table has `difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4)`, but SQLite CHECK constraints only apply to new writes — they don't retroactively validate existing rows. A legacy save from a build that shipped a 6th Cloud-difficulty level (index 5) could still exist in the wild, and reading it via `loadChessGame` would return a `SavedChessGame` with `difficulty = 5`. That value would then index into `DIFFICULTY_LEVELS[5]` (undefined) and either crash the game or produce blank labels
- Fix: Added a `Math.min(Math.max(row.difficulty ?? 1, 0), 4)` clamp in **two places**: (a) `chessStorage.rowToGame` as the primary read-side clamp — every caller now gets a safe value; (b) `useChess`'s saved-game-restore path as a belt-and-suspenders second line of defense against any future refactor that bypasses `rowToGame`. Stale index 5 now resolves to Master (index 4) rather than undefined. `teachingEligible` is derived from the clamped value as well

### Session 32 — Cloud Checkers + Trivia Overhaul + Globe Indicators Audit Findings

Triple audit (Codex + Claude + Gemini) on the Session 32 scope (Cloud Checkers AI, trivia overhaul, globe indicators, IAP retry) found 1 P1 + 3 P2. All fixed.

**Bug: Stale `selectedSubcategory` on parent-category switch corrupts seen-question keys + stats (P1)**
- Found: Session 32 audit (Claude)
- Cause: `TriviaScreen.handleCategoryTap` only reset `selectedSubcategory` to `'all'` when the tapped parent had exactly one subcategory. For multi-sub parents it opened `SubcategoryPickerModal` without pre-resetting. If the user had previously picked a specific sub in a different parent (e.g. "Film" under Pop Culture) and then tapped a new multi-sub parent (e.g. Science & Tech) and **dismissed the picker without making a selection** (backdrop tap or close-X), the state ended up mismatched: `selectedCategory = 'scienceTech'` + `selectedSubcategory = 'film'`. Starting the round then pulled questions via `getQuestionsForSubcategory('film')` (pop-culture questions), recorded stats under `category: 'scienceTech'`, and wrote seen-question IDs under the orphan composite key `'scienceTech_film'`. Silent data corruption — users saw film questions labeled as science & tech in results, and category stats drifted over time
- Fix: `handleCategoryTap` now calls `setSelectedSubcategory('all')` unconditionally, **before** the subcategory-count branch. Every parent tap resets the sub to 'all'; single-sub parents pass through the unconditional reset as a no-op; multi-sub parents open the picker with 'all' already set as the default — so dismissing the picker yields the "All {new parent}" behavior instead of leaving stale state from a different parent. Verified `tsc --noEmit` clean, jest suite green

**Bug: IAP retry off-by-one (P2)**
- Found: Session 32 audit (Claude)
- Cause: The Session 32 `fetchProducts` retry loop in `useEntitlement.ts` was introduced with `MAX_RETRIES = 3` under the expectation of 3 retries at 1s / 2s / 4s delays. The actual behavior: initial attempt fails → attempt=1 → delay 1s → attempt fails → attempt=2 → delay 2s → attempt fails → attempt=3 → `attempt < MAX_RETRIES` is false, loop exits. Total: 3 attempts (initial + 2 retries), delays 1s + 2s. The promised 4s retry never fired
- Fix: Bumped `MAX_RETRIES = 4` so the loop actually runs the full initial attempt + 3 retries with exponential backoff at 1s / 2s / 4s. Behavior now matches the intended "give Play Billing up to ~7 seconds of backoff before giving up" contract

**Bug: `metro.config.js` blockList overwrote Expo defaults (P2)**
- Found: Session 32 audit (Claude)
- Cause: The Session 32 `metro.config.js` addition assigned `config.resolver.blockList = [/functions\/.*/]` directly, replacing whatever Expo's `getDefaultConfig(__dirname)` had put there. Expo's default blockList can include internal exclusions (e.g. test directories, `.git`, platform-specific overrides); overwriting it could silently reintroduce unwanted bundling
- Fix: Changed to spread the existing value via `[...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []), /functions\/.*/]`. `Array.isArray` guard handles the `undefined` case cleanly (empty array spread + our regex) without assuming the default is always an array

**Bug: Globe accessibility labels on inner `<View>` ignored by parent `TouchableOpacity` (P2)**
- Found: Session 32 audit (Claude)
- Cause: Each game card on `GamesScreen` rendered the globe badge as a `<View>` with its own `accessibilityLabel={isOnline ? 'Cloud features active' : 'Offline mode'}` inside the parent `<TouchableOpacity accessibilityRole="button" accessibilityLabel="Play Chess">`. React Native groups accessibility of touchable children by default — the parent's `accessibilityLabel` absorbs the card contents into a single focus target, but the inner `<View>`'s own label is **not** appended to the parent label. Screen reader users never heard the globe state
- Fix: Merged the globe state into each card's parent `accessibilityLabel` via template literal (e.g. `` `Play Chess, ${isOnline ? 'cloud features active' : 'offline mode'}` ``). Six cards updated (Daily Riddle, Chess, Checkers, Trivia = live toggle; Sudoku, Memory Match = static "offline game"; Trophies has no globe). The now-redundant `accessibilityLabel` prop was removed from every inner globe `<View>` using two `replace_all` Edit passes (one for the 4 live-toggle cards with identical `<View>` JSX, one for the 2 static offline cards)

**Note on legacy stats migration (downgraded from flagged):** Old trivia stats from pre-Session-32 category names (food, kids) are silently dropped on first load — `validateStats` rebuilds `categoryStats` keyed by the current `ALL_CATEGORIES` list. This was flagged during audit as a potential data-loss concern but downgraded: the Session 32 scope is pre-2.0 testers only (no production build shipped this session), the old stats were never user-facing in a way that exposed the dropped category names, and the per-category aggregate values (round counts, accuracy) weren't meaningful across the taxonomy change. Documented here for the record — if a future migration ever needs to round-trip pre-Session-32 stats, this note is the starting point

### Session 34 — Voice Memo Orphan-State Cleanup

**Bug: Untitled voice memos persist as empty shells after recording (UX, Zerenn-found)**
- Found: Session 34 manual testing
- Cause: `VoiceRecordScreen.saveAndNavigate` writes a memo row with `title: ''` and `note: ''` plus one clip, then `navigation.replace('VoiceMemoDetail', { memoId })`. `VoiceMemoDetailScreen` defaulted `isViewMode` to `true`, and view mode renders the title only if it's non-empty — so a fresh user saw a blank-looking screen with no indication that a title field existed. Hitting back exited silently, leaving an untitled memo with just the clip in the DB. Accumulated over use as a growing pile of silent orphans in the list
- Fix: On mount, if the loaded memo has empty title AND empty note, `VoiceMemoDetailScreen` flips to edit mode (`setIsViewMode(false)`) so the "Add a title…" / "Add a note…" TextInput placeholders are visible. Titles remain optional — see the discard guard entry below

**Bug: No exit path preserved untitled-memo-as-valid-state (UX, Zerenn-found)**
- Found: Session 34 manual testing (pushback on the initial 2-button discard guard design)
- Cause: Initial implementation of the back-nav discard guard in `VoiceMemoDetailScreen`'s `beforeRemove` used a 2-button Alert (Cancel / Discard). This effectively forced the user to either title the memo or delete it — there was no way to exit with the memo untitled. But DFW's design treats titles as optional for voice memos; the 2-button prompt imposed a hidden "title is mandatory" constraint
- Fix: Expanded the Alert to 3 buttons (Cancel / Toss / Keep). Keep dispatches the original nav action without deletion, preserving the untitled memo as a valid state. Matches the existing 3-button pattern used by this file's "Unsaved changes" Alert. **Audit followup:** the initial `isDisposable` check looked at title + note only, so a memo with photos captured via VoiceRecordScreen's camera would still flag as "Unlabeled mystery?" and Toss would silently delete the photos — all three audit reports (Codex / Claude / Gemini) flagged this as a P2 data-loss window. Post-audit commit extends `isDisposable` with `(!memo.images || memo.images.length === 0)` so photos count as content and keep a memo off the Toss path

**Bug: Memos could reach fully-empty persisted state via clip deletion (data-integrity, Zerenn-found)**
- Found: Session 34 manual testing
- Cause: `handleDeleteClip` called `deleteClip(clipId)` and filtered local state, but did not check whether the clip was the last one in an otherwise-empty memo. Deleting the only clip of a memo with empty title, empty note, and zero photos left a content-free DB row — a memo existing only as an ID with no meaningful data. Memos always have a clip at birth (`saveAndNavigate` rolls back the memo if clip save fails), so this was the only code path to a truly-empty state
- Fix: `handleDeleteClip` computes `shouldDeleteMemo = isLastClip && memoOtherwiseEmpty`. When true, the Alert re-titles to "Goodbye, whole memo?" and routes confirm to `permanentlyDeleteVoiceMemo(memoId)` + `refreshWidgets()` + `navigation.goBack()`. Non-cascade branch (clip-only delete) behavior unchanged. Single enforcement point at the state transition, not a sweep-later cleanup. **Audit followup:** the initial `memoOtherwiseEmpty` check read live `title` / `note` TextInput state. Gemini's P2 caught the regression path — a user who opens a saved titled memo, clears the title TextInput without saving, and deletes the last clip would cascade-wipe the persisted title they didn't actually discard. Post-audit commit switches the check to `initialTitleRef.current === '' && initialNoteRef.current === ''` (saved state) so transient unsaved edits never license a destructive cascade

**Bug: Metro file watcher crashed on orphaned npm temp file (environmental, Zerenn-found)**
- Found: Session 34 — attempted `npx expo start --dev-client --clear` after ordinary dev workflow
- Cause: A stale `.browserslist-jm1poh2E` temp file existed in `functions/node_modules/.bin/` with restricted permissions. These are npm's atomic-rename temp files that can be orphaned when `npm install` is interrupted (Ctrl+C, antivirus, OS restart, etc.). Metro's `FallbackWatcher` (used on Windows when `watchman` isn't installed) crawls everything under the project root on `--clear` and calls `lstat` on every file. `lstat` returned `EACCES`, the watcher emitted an `error` event, `@expo/cli/build/src/utils/errors.js:130` rethrew, and the dev server died. `metro.config.js` `resolver.blockList` doesn't stop the file watcher — it's a resolver-level filter, not a crawl filter
- Fix: Two levels. (a) Immediate: delete the orphaned temp file with `Remove-Item`. (b) Workaround when permissions resisted: purge `functions/node_modules` entirely (regeneratable via `cd functions && npm install`). Caveat learned mid-session: root `tsc` walks `functions/src/` for type-checking and resolves `firebase-functions` via `functions/node_modules` (TS module resolution walks up from the importing file's directory), so deleting `functions/node_modules` breaks root `npx tsc --noEmit` until reinstall. Future architectural fix queued (not done this session): add `"exclude": ["functions", "dist"]` to root `tsconfig.json` so root tsc treats `functions/` as out-of-scope — this would also make orphaned temp files in `functions/node_modules` impossible to block Metro on the root watch tree going forward

**Process lesson: state-space mapping before prompt-writing.** Session 34 landed with four iterative prompts on a single one-file feature (voice memo discard guard) because the initial prompt implemented the handoff's spec literally without mapping the full state space: {fresh recording, memo with clip but no metadata, memo with title but no clip, truly empty, existing titled memo} × {user action: back, delete-last-clip, edit-title, ignore}. A 10-minute state-space pass upfront would have produced one coherent prompt instead of four. Recorded here so future sessions treat "simple one-file fix" as a cue to *still* map the state space before writing the prompt

### Session 34 — Triple-Audit Findings on Voice Memo Work

Triple audit (Codex + Claude + Gemini) on the Session 34 voice memo changes in `src/screens/VoiceMemoDetailScreen.tsx` found 3 P2. No P1. All fixed in a follow-up commit on the same branch.

**Bug: `isDisposable` ignored photos (P2 — consensus across all three auditors)**
- Found: Session 34 triple audit (Codex, Claude, Gemini all flagged)
- Cause: The new back-nav discard guard's `isDisposable` check looked at title + note + initial refs only. Photos captured via VoiceRecordScreen's camera are saved into `memo.images` by `saveAndNavigate`, but the guard ignored them. A fresh recording with photos still triggered "Unlabeled mystery?"; Toss cascaded `permanentlyDeleteVoiceMemo` which silently wiped the photos. Sister logic in `handleDeleteClip`'s cascade (`memoOtherwiseEmpty`) already required `memo.images` to be empty — the two empty-content checks had drifted apart
- Fix: Extended `isDisposable` with `(!memo.images || memo.images.length === 0)`. Photos now count as content, match the cascade check, keep an otherwise-empty-but-photographed memo off the Toss path. Confirmed by re-diff

**Bug: Cascade used live TextInput state instead of saved DB state (P2 — Gemini-found)**
- Found: Session 34 triple audit (Gemini only)
- Cause: `handleDeleteClip`'s `memoOtherwiseEmpty` check read `title` and `note` directly — the live React TextInput state. A user who opens a saved titled memo, temporarily clears the title TextInput without saving, and deletes the last clip would cascade-escalate to `permanentlyDeleteVoiceMemo` — wiping the persisted title they never actually discarded. The inverse is also possible: unsaved text in a previously-empty memo could suppress the cascade when it should have fired
- Fix: Switched the check to `initialTitleRef.current === '' && initialNoteRef.current === ''`. These refs are seeded from the DB on mount / first focus and represent the persisted state regardless of transient input edits. Transient unsaved edits no longer license destructive cascades; the regular clip-only "Delete this clip?" path handles them

**Bug: Async race + silent delete-failure swallowing on destructive paths (P2 — Claude race + Codex/Gemini failure handling)**
- Found: Session 34 triple audit (Claude flagged the race; Codex and Gemini independently flagged the failure-swallowing)
- Cause: Both new destructive paths (`isDisposable` → Toss, `handleDeleteClip` → cascade) `await permanentlyDeleteVoiceMemo(memoId)` before setting `exitingRef.current = true`. During the await, a second back-press could re-enter `beforeRemove` (or a second button tap could re-fire) because `exitingRef` hadn't latched yet. Separately, both paths caught delete failures with `console.error` and unconditionally navigated away — hiding data-integrity issues from the user. The existing `handleSaveExisting` path in the same file uses "failure → `ToastAndroid` + stay"; the new paths broke that convention
- Fix: Set `exitingRef.current = true` *before* each `await` (closes the race window — any re-entry into `beforeRemove` during the delete now early-returns on the ref check). On success, `navigation.dispatch` / `navigation.goBack` fires inside the `try`. On failure, the catch block resets `exitingRef.current = false` (lets the user retry) and surfaces `ToastAndroid.show('Delete failed — try again', ToastAndroid.SHORT)`. Matches the precedent set by `handleSaveExisting`

**Skipped findings (documented for traceability):**
- *Claude P3 — `player` missing from `beforeRemove` useEffect dep array.* Preexisting pattern, predates Session 34, under existing `eslint-disable-next-line`. Adding `player` to the deps would cause the effect to re-register on every clip source change, which is worse. Skipped as out-of-Session-34-scope
- *Codex P3 — extract an `isMemoContentEmpty` helper to unify `isDisposable` and `memoOtherwiseEmpty`.* The two checks have deliberately different semantics (one includes the user's live-input state for "has the user touched anything yet", the other doesn't) so a single helper would paper over real differences. Skipped as premature abstraction

### Session 35 — Game Audio Pool Refactor + Win/Loss Sound Fix

**Bug: Game audio MediaCodec leak over long sessions (UX, Zerenn-found)**
- Found: Friend report on Galaxy S23 Ultra, reproducible across v1.22.0 and v1.23.0
- Symptom: Game sounds degrade over long play sessions — weird sound → right sound → silent. `expo-audio` 55.0.13 bump (Session 33) did not fix
- Cause: `playGameSound` created a fresh `AudioPlayer` per call, cleaned up only on `didJustFinish`. When that event didn't fire (errors, backgrounding, interruption, rapid-fire overlap), the player leaked an ExoPlayer/MediaCodec instance. Android's codec pool exhausted over time
- Fix: Lazy-initialized player pool in `gameSounds.ts` — one persistent player per sound name, reused via `seekTo(0) + play()`. Players live for app lifetime. Audit P2 fix: `seekTo` now awaited before `play()` to prevent race on rapid retriggers
- Files: `src/utils/gameSounds.ts`, `__tests__/gameSounds.test.ts` (9 tests)

**Bug: `gameWin` sound silent in chess/checkers due to ampersand in filename**
- Symptom: `gameWin` sound did not play in chess/checkers (but worked in Memory Match via `memoryWin`)
- Cause: `Chess&Checkers-Win-Round.wav` had an ampersand in the filename. Metro's `require()` resolver failed silently on the require call
- Fix: Renamed to `Chess-Checkers-Win-Round.wav`. Also fixed typo `Loseing` → `Losing` in the loss sound filename. Updated `require()` paths in `gameSounds.ts`
