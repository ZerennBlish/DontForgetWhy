# DFW Design Decisions & Environment Knowledge
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** Session 31 (April 15, 2026)

### Session 31 Additions

- **Cloud Stockfish for all five chess difficulty levels, free tier included** — The original Session 16/17 local engine shipped with five difficulty levels each running a minimax search of increasing depth — the "better" the level, the more CPU it spent. Session 31 redesigns this: every level now queries the Lichess cloud eval API (`multiPv=5`) first and picks from a rank band into the top-5 Stockfish PVs. Easy picks ranks 2-4 (3rd-5th best), Intermediate 1-3, Hard 0-2, Expert 0-1, Master 0 (always best). **Difficulty is now move quality, not search depth.** Every cloud move is Stockfish-strong; weaker levels just pick a deliberately worse move out of the top-5. The decision to make this free-tier (rather than a Pro upgrade) is because (1) Lichess's cloud eval endpoint is a free public API with no auth and no per-user rate limits, (2) paywalling AI quality would undermine the free-tier promise that the games work well out of the box, and (3) the Pro tier's differentiation is *unlimited rounds* (the trial counter), not AI strength. The local minimax engine still ships in full as the offline fallback — a user with no internet, a device behind a restrictive firewall, or a 404 from a position Stockfish hasn't analyzed yet gets the exact same engine they had in Session 16/17. Cloud is never a hard requirement.
- **Opening book runs before the cloud, not after** — The first cut had the priority order as *cloud → book → local*. Audit caught the subtle loss: Lichess's cloud eval always returns the single top PV for a position (then the multi-PV band for the difficulty), so opening-phase moves always collapse to Stockfish's top pick regardless of the difficulty level — the curated book's "1-3 sound variety moves per position" variety disappeared. Fix: run `getBookMove(c2)` synchronously *before* the cloud fetch. For the first 6-10 plies of mainline theory, the book wins and the AI plays one of its curated variety moves instantly without any network call. The cloud takes over the instant we're out of book, and the local engine is still the offline fallback. Net effect: **opening variety preserved at every level, cloud strength once out of book, local fallback always.**
- **`cloudStockfish.ts` returns null on any failure so the caller can cleanly fall through** — The cloud wrapper catches every possible failure mode (network error, `AbortError` timeout, non-ok HTTP, 404 "position not in cloud database", malformed JSON, empty `pvs` array, illegal UCI move that can't be applied to the FEN, or any unexpected throw) and returns `null` uniformly. The caller (`useChess.triggerAIMove`) treats `null` as a single-case fallback path: "try the local engine." Alternative designs considered: throw a typed error, return a `{ok: false, reason: ...}` tagged union, return a `Result<string, Error>`. All rejected as over-engineering for a surface with exactly one caller — the caller doesn't care *why* the cloud failed, just whether to fall through. Null keeps the call site short (`if (!aiSan) aiSan = getAIMove(...)`) and keeps the error-handling logic inside `cloudStockfish.ts` where the failure modes are close to the fetch code.
- **Cloud move async gap — double-check session + game reference, not just session** — `triggerAIMove` awaits `getCloudMove(...)` and then needs to verify that the move is still safe to apply. Three things could have changed during the ~100ms-5s cloud fetch: (a) the user resigned / started a new game / unmounted the screen (session changed), (b) the user hit take-back but that's blocked during `isAIThinking`, (c) the chess-instance pointer has been swapped even within the same session (defensive, not currently possible — but the check costs nothing). The post-await guard checks both `sessionIdRef.current === currentSession` AND `gameRef.current === c2 && !c2.isGameOver()` before applying the move. Either fails → bail the callback, reset the thinking UI, don't apply anything. Belt and suspenders — the session check alone would be sufficient in the current code, but the game-reference check future-proofs against any refactor that might decouple "new game" from "new session."
- **Difficulty-level clamp in two places: storage read + hook restore** — The saved chess game row carries `difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 4)`, so new writes are safe. But a legacy row from a build that shipped a 6th Cloud-difficulty level (index 5) could exist in the wild — the CHECK constraint was added later, and SQLite doesn't enforce CHECK on existing rows. Session 31 adds a defensive `Math.min(Math.max(row.difficulty ?? 1, 0), 4)` clamp in **both** `chessStorage.rowToGame` (primary — so every caller gets a safe value) AND `useChess`'s saved-game-restore path (belt-and-suspenders — protects against any future refactor that bypasses `rowToGame`). Stale index 5 resolves to Master (index 4) rather than indexing past `DIFFICULTY_LEVELS` and producing a blank label or a crash. Two checkpoints because the blast radius of an out-of-bounds index is the whole chess screen.
- **Online trivia opt-in at the round level, not the settings level** — Considered a global "Use online trivia questions" toggle in Settings. Rejected because (1) users would forget it exists and get confused when the questions suddenly change, (2) it puts the decision far from the context where it matters (you're picking a category and about to start a round), and (3) online-first is obviously better when connectivity is available — there's no reason to make the user consent to it. Final shape: `onlineMode` defaults to `true`, auto-flips to `false` on mount if `checkOnlineAvailable()` reports offline, and silently falls through to the offline bank if the online fetch fails for any reason. The user never sees an online/offline toggle; they just get fresh questions when they can and the bundled bank when they can't.
- **Online trivia rounds don't write to `seenQuestionIds`** — The offline bank uses a "seen" set to cycle through every question at least once before repeating. Online rounds come from OpenTDB with synthetic `online_{timestamp}_{idx}` ids that would pollute the offline set — either by making future offline rounds skip those ids (they'd never match) or by inflating the "seen X of Y" counter with ids that have no meaning in the bank. Cleanest fix: `isOnlineRound` state drives the results screen copy AND skips the `addSeenQuestionIds` persistence on `finishRound`. Online and offline are two distinct progress surfaces that never touch.
- **366 pre-assigned daily riddles, not a random shuffle** — Session 22 used an LCG PRNG seeded on the year to shuffle the riddle bank each year, then walked `dayOfYear` through the shuffled list. Two problems caught in the Session 31 audit: (1) different devices in different DST-observing timezones computed different `dayOfYear` values for the same `dateStr` due to a `new Date(dateStr + 'T00:00:00')` fencepost (LOCAL midnight vs. UTC midnight differs by the DST offset between two dates in the same year), so a user in LA and a user in Tokyo would see *different* "April 15, 2026" riddles; (2) the bank had only 355 riddles after duplicate removal, leaving 10 days of the year (if non-leap) or 11 days (leap year) rolling over to the top. Session 31 replaces the whole pipeline with a manually-curated 366-entry `dfw_yearly_riddles.ts` file where every `DailyRiddleEntry` carries an explicit `dayOfYear: number`. `getDailyRiddleForDate(dateStr)` computes `dayOfYear` in **UTC** via `new Date(dateStr + 'T12:00:00Z')` (noon-UTC anchor = no DST edge case regardless of the caller's timezone) + `Date.UTC(year, 0, 1)` subtraction + `Math.floor(ms / 86400000) + 1`. Every device in every timezone resolves the same `YYYY-MM-DD` to the same entry. No shuffle, no seed, no randomness, no repeats within a year.
- **Daily riddle is strictly offline; Bonus Riddles is strictly online** — Session 22 had the daily riddle silently prefer an online riddle when available (via `fetchMultipleOnlineRiddles(1)` in `useFocusEffect`) and fall back to the offline bank if the fetch failed. Two problems: (1) the feature became non-deterministic — the "daily" riddle could change between app opens if the online fetch succeeded the second time, (2) users who wanted to compare their daily with a friend could see different riddles depending on which one got the online path first. Session 31 splits the two surfaces cleanly: **daily riddle = offline 366 bank, always**. Deterministic, shareable, same for everyone on a given calendar day. The online-riddle fetch has been repurposed as the **Bonus Riddles** tab — Pro-gated, refreshes on tap, explicitly framed as "bonus content, not today's riddle." Two different data sources for two different purposes, no cross-contamination.
- **Noon UTC anchor for `getDailyRiddleForDate`** — An earlier draft used `new Date(dateStr + 'T00:00:00Z')` (midnight UTC). That works correctly for every timezone at every time-of-day *except* on DST transition days, where a fencepost rounding error could sneak in when `Math.floor`ing the subtracted millisecond delta (23-hour day → 23/24 = 0.958, floor = 0, right answer; 25-hour day → 25/24 = 1.041, floor = 1, right answer — so the edge cases actually work out). But "noon UTC" is safer because it sits exactly 12 hours away from any timezone's midnight — the subtraction always produces a value that's at least 0.5 days past any fencepost, so `Math.floor + 1` is guaranteed to land on the correct `dayOfYear` even if a future implementation change introduces a subtraction error. Defense in depth for a function that's called every time the Daily Riddle screen mounts.
- **ProGate as a presentational modal accepting entitlement via props, not as a wrapper that owns its own hook** — The Session 29 ProGate was a `{ feature, children }` pass-through wrapper that called `useEntitlement()` internally (dormant, never read). When P7 turned it into the real paywall, the original instinct was to keep `useEntitlement()` inside the component — feels self-contained, parents don't need to know about IAP. The Codex audit caught the failure mode: SettingsScreen already owns one `useEntitlement()` for the inline DFW Pro card, and rendering ProGate from Settings means **two `useIAP()` registrations active simultaneously**. Both register `onPurchaseSuccess` callbacks, both fire `finishTransaction()` on the same purchase, and Google Play Billing logs a duplicate-finish error. Fixed in two complementary ways: (a) ProGate is conditionally mounted (`{proGateVisible && <ProGate.../>}`) so it doesn't even instantiate when hidden, and (b) ProGate was rewritten to accept entitlement values as props (`isPro`, `loading`, `error`, `productPrice`, `onPurchase`, `onRestore`) — zero internal hook. Each parent screen owns exactly one `useEntitlement()` instance and passes the values down. ProGate is now a pure presentational component with the same testability properties as any other paywall view.
- **Trial gate at the GamesScreen level, not per-game-screen** — Considered putting `canPlayGame()` inside each game's screen (ChessScreen, CheckersScreen, etc.) so each game owns its own entitlement check. Rejected because (1) it duplicates the gate logic across five screens, (2) it puts a check point inside surfaces that should stay focused on gameplay, and (3) it makes adding a sixth game require remembering to wire the gate. The single check point in `GamesScreen.handleGamePress` intercepts navigation to any of the five gated games, increments the trial counter (only for non-Pro), and opens ProGate when trials are exhausted. One branch point, one place to update when a new game is added.
- **Founding detection via `onboardingComplete === 'true'` (strict equality)** — Considered alternatives: a dedicated `installFingerprint` kv entry written on first launch (would have to backfill from existing data), parsing the install date from app metadata (not reliably available across Android updates), or comparing `Constants.expoConfig.version` to a hardcoded threshold (fragile, breaks on local installs). Settled on `onboardingComplete` because (1) every existing user who completed onboarding has the key set, (2) it's a stable kv flag that survives upgrades, (3) no new infrastructure required. Strict equality (`=== 'true'`) was added after the audit caught that a corrupted value (`'false'`, `'yes'`, anything truthy-but-wrong) could grant Pro to a fresh install. The literal string `'true'` is the only qualifying value.
- **Founding badge written for already-Pro users too** — The first cut short-circuited the migration with `if (isProUser()) return` before writing `founding_status`, on the theory that an already-Pro user doesn't need a Pro grant. Audit caught the failure: an existing user who somehow already had Pro (via a test purchase, a Play Store license-tester account, or a future restored backup) would never get the founding badge. Fix: removed the early return, restructured so the founding badge is **always** written for any onboarded user, and `setProStatus` is gated on `!isProUser()` to avoid re-granting Pro to someone who already has it. Two independent operations, two independent guards.
- **Calendar write scope requested on sync enable, not on configure** — `GoogleSignin.configure()` requests `calendar.readonly` up front in Session 30 because read sync is wired to Home + Calendar screens for any signed-in user. The write scope (`calendar`) is more invasive — Google's consent screen says "Don't Forget Why wants to **see, edit, share, and permanently delete** all the calendars you can access using Google Calendar". Asking for that at sign-in for users who'll never touch write sync is a UX cost (consent friction) and a privacy cost (broader access than needed). Decision: write scope is requested only when the user enables sync (or implicitly via the 403 branch in `authedFetch` if they revoked write access mid-session). Principle of least privilege — read users don't pay the write consent cost.
- **Sync map preserved on sign-out** — The first cut had `clearSyncData()` wipe all three keys (`gcal_dfw_calendar_id`, `gcal_sync_map`, `gcal_sync_enabled`) on sign-out. Audit caught the dupe risk: a user who signs out, signs back into the **same** Google account, and triggers a sync would create a second copy of every alarm/reminder event because the sync map was wiped and the service has no way to recognize the existing events as "already mine". Fix: preserve `gcal_sync_map`, only clear the calendar id and enabled flag. Re-signing the same account picks up the existing mapping and PUTs the same event ids. This is intentional asymmetry: sign-out clears the user-facing state (toggle off, calendar id forgotten) but preserves the recovery key. A user who signs into a **different** Google account on the same device would still see duplicates from the first account's events on a fresh sync — but that's a niche scenario worth tolerating, and a future "really forget everything" Settings action could clear the map explicitly.
- **Calendar sync is manual "Sync Now" v1 — auto-sync deferred** — Considered shipping with auto-sync from day one (push on alarm save, push on schedule, push on background sync timer). Rejected because (1) auto-sync requires a background scheduling layer the app doesn't currently have, (2) the dupe-prevention sync map and the recurring DTSTART stability are the load-bearing pieces — getting those right matters more than how often the sync runs, (3) a manual button gives users explicit control over when their data leaves the device, which fits the privacy brand. v2 will add auto-sync once the manual flow has been validated against real user data.
- **Recurring alarm DTSTART derived from `createdAt`, not `nextOccurrenceDate`** — The first cut used `nextOccurrenceDate(days, time)` to compute DTSTART for recurring alarms, which returns the next matching weekday on or after **today**. This worked on the first sync but every subsequent sync moved DTSTART forward (today is always advancing), and Google Calendar dropped past occurrences from the recurrence series — a user who synced their alarms for the first time on Monday and then re-synced on Wednesday would lose Tuesday's occurrence from history. Fix: `stableFirstDate(days, createdAt)` derives DTSTART from `alarm.createdAt` — the first matching weekday on or after the alarm's creation date — which is **deterministic for the alarm's lifetime** regardless of when the sync runs. `nextOccurrenceDate` is kept as a fallback for any edge case where `createdAt` parsing fails.
- **`deleteEvent` checks status; `syncItem` preserves mapping on failure** — The first cut had `deleteEvent` await `authedFetch` but never inspect the response, then `syncItem` removed the mapping unconditionally on the assumption that "we tried, it's done either way." Audit caught the dupe risk: a 500 response from Google would still drop the mapping, and the next sync would create a duplicate event because the service no longer remembered the old one. Fix: `deleteEvent` throws on non-2xx/non-404 (404 = already gone server-side, still success); `syncItem` only removes the mapping inside the try block after `deleteEvent` succeeds. On failure: log a warning, count an error, **preserve the mapping** so the next sync retries idempotently. The retry hits the same map entry, calls DELETE again, and either succeeds (event gone, mapping cleared) or fails again (mapping still there, error counted again, no duplicate created).

### Session 30 Additions

- **Firebase Auth via `@react-native-firebase/auth` + `@react-native-google-signin/google-signin`** — Three realistic options: (a) `expo-auth-session` + manual Google OAuth web flow + `firebase/auth` JS SDK, (b) `@react-native-firebase/auth` with its built-in Google Sign-In provider but no native Google button, (c) this combo where `@react-native-google-signin/google-signin` owns the native Google Sign-In sheet and hands an `idToken` to `@react-native-firebase/auth` via `GoogleAuthProvider.credential(idToken)`. Option (c) wins because it gets the native one-tap Google sheet (better UX than a web browser hop), it's the path Expo's own docs recommend for production Firebase apps, and `@react-native-firebase/*` is Expo-native + TypeScript-first + actively maintained. Downside: two native deps instead of one, but both are config-plugin-registered and bundle cleanly into a single EAS build. `google-services.json` sits in the project root and is referenced via `android.googleServicesFile: "./google-services.json"` in `app.json` so EAS prebuild can locate it on the build server (auto-detect only works for local builds).
- **Google Calendar via REST API, not a Calendar SDK** — There's no first-party Expo-friendly Google Calendar SDK. The options were (a) pull in a general-purpose `googleapis` Node package (heavy, Node-specific, doesn't play well with React Native), or (b) hand-roll REST calls to `https://www.googleapis.com/calendar/v3/calendars/primary/events` with the `Authorization: Bearer ${accessToken}` header from `GoogleSignin.getTokens()`. Option (b) is ~50 lines of `fetch` + parsing and adds zero native/JS deps for read-only sync. A future write-side (push DFW alarms to Google Calendar) would stay REST-based as well — the API surface is small and stable.
- **In-memory cache with no local persistence for Google Calendar events** — Two reasons. (1) The "your data stays yours" philosophy — we don't want Google Calendar data written to SQLite where a `.dfw` backup would then include events the user didn't explicitly choose to archive with DFW. (2) A 5-minute TTL is plenty for a tab-back-to-Home refresh pattern; real-time freshness would need a push channel we don't have anyway. Module-level `Map` is cleared on every sign-in and sign-out so a device passed between users never leaks cached calendar data across accounts.
- **Cache keyed by date range with per-account clear on sign-in/out** — Considered keying by `${uid}_${startDate}_${endDate}` to make cross-account collisions structurally impossible, but chose the simpler `${startDate}_${endDate}` keying + explicit `clearCalendarCache()` call inside both `signInWithGoogle` and `signOutGoogle` (belt-and-suspenders). Simpler cache key, smaller surface for bugs, same end result as long as the two call sites stay wired. The audit caught an earlier version that only cleared on sign-out — shipping with both entry points set is defensive against any future "user A signed in while user B's session was still hydrating" edge case.
- **401 = token refresh, 403 = scope request** — The original naive recovery path called `requestCalendarScope()` on any 401, which popped the Google consent sheet on routine hourly token expiries. Google actually uses 401 for expired-token AND 403 for missing-scope, so the fix is to branch: `401` calls `GoogleSignin.clearCachedAccessToken(token)` + `getAccessToken()` refresh + retry once; `403` calls `requestCalendarScope()` + retry once. A backgrounded-for-two-hours user now gets a transparent token refresh on return instead of a "sign in to Google" interruption, and a legacy sign-in without the calendar scope still gets the one-time upgrade prompt on first 403.
- **Firestore `users/{uid}` locked to `request.auth.uid` from day one** — Test-mode rules (`allow read, write: if request.time < ...;`) were published by the Firebase Console wizard on project creation. The triple audit flagged this as P1 before any real user touched it. Fixed by publishing proper rules (`match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`) as part of the same session. Each user can only read/write their own profile; nobody can scrape emails across the collection. The rules file is kept in the Firebase Console only (not committed to the repo) — a future session should add `firestore.rules` + a deploy script so the rules are source-controlled alongside the client code.
- **`onAuthStateChanged` subscription in every auth-aware screen, not just `useSettings`** — `getAuth().currentUser` is a synchronous read, but Firebase hydrates the persisted auth state asynchronously from native storage on cold start. A screen that reads `getCurrentUser()` during `useFocusEffect` on first mount will see `null` even for a user who's still signed in, and won't know the real user arrived until it re-focuses. The fix is to treat auth as a subscription: each screen that depends on auth state subscribes to `onAuthStateChanged` in a `useEffect`, stores the user in local state, and uses that state as the gate for fetches (Google Calendar) or UI visibility (Settings Google Account card). The subscription fires on the initial callback with the current state, fires again on any change, and returns an unsubscribe function for cleanup.
- **Optional sign-in philosophy confirmed: brand evolves from "no accounts ever" to "your data stays yours, even when you sign in"** — The Session 29 Decisions doc raised this as a hypothesis; Session 30 shipped it for real. The app still works 100% offline always. Sign-in is voluntary and unlocks **only** the connected features (Google Calendar today; multiplayer chess, cloud Stockfish, online riddles, global leaderboards in P8). A user who never touches the Google Account card gets the full offline experience — every alarm, reminder, note, voice memo, calendar, game, theme, widget, backup — with zero network calls. A user who opts in consents to Google OAuth + scoped read of their calendar and nothing more. The brand copy on the Settings card reinforces this: "Optional. Enables calendar sync and future connected features. Your local data stays on your phone either way."

### Session 29 Additions

- **`expo-iap` over `expo-in-app-purchases` and RevenueCat** — Three viable options for Google Play Billing on an Expo app. `expo-in-app-purchases` is effectively deprecated — stuck on Play Billing Library 4.x, no Expo SDK 55 support path, maintainers have gone quiet. RevenueCat is the industry-standard managed billing SDK but it's overkill for DFW's single $1.99 one-time unlock — no subscriptions, no multi-tier, no A/B testing of paywalls, no cross-platform receipt aggregation to justify the ~20 MB SDK footprint and the $0-but-watch-the-terms pricing. `expo-iap@^4.0.2` is Expo-native, TypeScript-first, wraps Play Billing 8.x directly (the version Google requires for new submissions), exposes a React hook API (`useIAP`) that matches how the rest of the codebase is written, and the maintainer (hyochan) actively tracks both OpenIAP spec changes and Expo SDK releases. Downside: smaller ecosystem than RevenueCat, no server-side verification helpers out of the box — acceptable given the decision below.
- **No server-side receipt validation for a $1.99 indie app** — Google Play's on-device purchase verification (signature check + acknowledgment) is cryptographically sound; client-side bypass requires rooted devices + modified Play Services + a mitm billing library patch, which is a lot of effort for a $1.99 unlock. Server-side revalidation would mean standing up a Firebase Function + service account + receipt storage + refund webhook handling + rate limiting — a full afternoon of work plus ongoing Firebase billing for an attack surface that nobody will bother exploiting. If piracy becomes measurable (Play Console revenue divergence from install count in a way that can't be explained by free-tier usage), revisit. Until then, `useEntitlement` trusts `onPurchaseSuccess` + `finishTransaction` + the local `proStatus` cache. The .dfw backup archives the cache so reinstalls via the user's own backup round-trip survive even if Play restore fails.
- **`ProGate` screen wrapping deferred from P5.5 to P7** — The original P5.5 task list had a bullet for "apply gates to Chess, Checkers, Sudoku, voice memos, photo backgrounds, note images, drawing, backup/restore, full voice pack". That would touch 8-10 files to add a `<ProGate feature="..."><>{children}</></ProGate>` wrapper that renders children unconditionally — churn with no user-visible effect, cluttering diffs, and a risk of touching stable screens that might need light-vs-dark retheming when the locked state actually lands. Better to wait until P7 designs the locked-state UX (blurred preview? darkened overlay? upsell modal?) and place the gates alongside the real locked visuals in a single consolidated change. `ProGate.tsx` exists as a pass-through so P7 can flip one file to implement the gate logic and then wrap screens in one motion. The `feature: string` prop is part of the public API even though the component ignores it today — future locked-state copy and analytics will key off it.
- **Optional sign-in philosophy — the brand evolves** — The original brand was "No accounts. No tracking. No ads. Just you and your questionable memory." That's still the free-tier promise and still true at the app level (no analytics, no telemetry, no backend pings, no logging outside local console). But P5 (Google Calendar sync) and P8 (multiplayer chess, cloud Stockfish, online riddles, global leaderboards) all require sign-in by the nature of the feature. Rather than ship those as separate apps or drop them from the roadmap, the brand evolves: **the app works 100% offline always. Sign-in is voluntary and unlocks optional connected features only.** A user who never touches the sign-in button still gets the full local app (alarms, reminders, calendar, notepad, voice memos, games, backup, themes, widgets) with zero network calls. A user who opts into calendar sync consents to Google OAuth + scoped read of their calendar. A user who opts into multiplayer consents to Firestore + Firebase Auth. Each feature asks for its own sign-in moment with a clear reason — no "sign in to use the app" cold-start wall. This preserves the brand promise (no forced accounts, no surveillance) while unlocking the Pro-tier connected features that P8 needs to justify the paywall.

### Session 28 Additions

- **Tutorial overlay: backdrop/card as siblings, not parent/child** — The first cut nested the card inside the backdrop `TouchableOpacity` because it matched "backdrop wraps content" intuition. On Android TalkBack, setting `importantForAccessibility="no-hide-descendants"` on the backdrop (the fix for "whole overlay reads as one button") also propagated down and hid the card content. The fallback attempt of `importantForAccessibility="yes"` on the card can't override an ancestor's `no-hide-descendants` — Android's accessibility tree rule is one-way. The structural fix restructures the JSX so the backdrop and the card are **siblings** inside a wrapper `<View>`. The backdrop stays hidden from TalkBack (still handles touch `onPress` for dismissal), and the card is independently traversable. Card-area taps don't propagate to the backdrop because siblings don't share a parent/child touch path — no `onStartShouldSetResponder` hack needed. **Also removed** `accessibilityLabel` from the card itself — giving a container a label collapses all its children into one focusable element, which defeated the purpose. TalkBack now walks title → body → Back (if visible) → Next/Got it.
- **Tutorial lazy `useState` initializer over `useEffect`** — `kvGet` is synchronous (`expo-sqlite`), so reading it inside a lazy initializer `useState(() => !kvGet(...))` sets the correct initial state on the first render with zero flash. The alternative (`useState(false)` + `useEffect(() => { setShowTutorial(!kvGet(...)) }, [])`) renders the screen once with the overlay absent, then the effect fires after commit and schedules a second render with the overlay mounted — visible as a one-frame flash. Async concerns would push this toward the effect pattern, but expo-sqlite's sync API makes the lazy-init path both simpler and flash-free.
- **Tutorial voice clips: per-tip, not per-screen** — With ~80K ElevenLabs credits available per month, per-tip clips (15 total) were chosen over per-screen clips (7 total). Each tip advance gets its own voice line so rapid tappers hear variety and slow readers get a matching piece of audio. The clips are written to riff independently from the body text — they add personality and humor rather than narrating the visible copy verbatim. The text teaches; the voice roasts.
- **Tutorial audio on MEDIA stream, not ALARM** — Tutorial clips are user-initiated (the user chose to open this screen and see the overlay). ALARM stream is reserved for alarm fires that must bypass ringer mode and be audible regardless of user context. Tutorial audio respects system volume via the standard MEDIA stream through `expo-audio` — no native module, no USAGE_ALARM, no audibility override. Volume is set to `1.0` and the user controls loudness via the physical volume rocker.
- **Tutorial tips: sarcastic tone matches brand voice from day one** — Tutorial body text is written in the DFW personality voice from the first commit (matches `snoozeMessages.ts`, `homeBannerQuotes.ts`, `chessRoasts.ts`). The voice clips (Session 28) were recorded to match — each screen has its own flavor of irritation, the character is annoyed he got pulled away from what he was doing to explain things. Writing neutral strings first would have meant rewriting every tip AND re-recording every clip when the personality layer shipped; writing in voice from the start cost zero extra effort and keeps the brand tight.
- **Backup backward compat: missing fields default to 0, not version bump** — Session 26 added `voiceMemoImages` to the `BackupMeta.contents` manifest. Session 28 found that older `.dfw` exports (which don't have the field) failed validation with "malformed contents" and couldn't restore. The instinct was to bump `BACKUP_VERSION` from 1 to 2 and version-branch the validator, but that's overkill — the data is still valid, the missing count just wasn't tracked yet. Instead, the field is now optional (`voiceMemoImages?: number`) and validation only fails if it's present and not a number. New backups still write the count. Cheaper than a version branch, and keeps the manifest version single-source-of-truth at 1.
- **`audioCompat.ts` adoption over continued `as any`** — Session 24 scaffolded the `PlayerWithEvents` intersection type to paper over expo-audio 55.x's broken `addListener`/`release` inheritance, but never imported it — `gameSounds.ts`, `soundFeedback.ts`, and `VoiceMemoListScreen.tsx` kept using `as any` casts. Session 28 finally adopted it across `gameSounds.ts`, `soundFeedback.ts`, `VoiceMemoListScreen.tsx`, **and `TutorialOverlay.tsx`** (4 consumer files), eliminating the raw `as any` casts at call sites. Single source of truth for the type, survives future expo-audio updates, and `npx tsc --noEmit` stays clean without suppressions.
- **`stopClip()` before `playerRef` assignment, and explicit stop on nav tap** — Two subtle concerns with the tutorial audio effect. (1) `playerRef.current = player` must be assigned **before** `player.play()` so that any cleanup firing between the two sync lines (theoretically possible under React 18 concurrent mode) still finds the player to pause + remove. (2) `stopClip()` is called explicitly at the top of `handleNext`/`handlePrev` (before `hapticLight()` + `onNext/onPrev`) rather than relying on the `useEffect` cleanup cycle to stop the previous clip. The effect-cleanup approach works but leaves a ~16ms gap where the outgoing clip's tail overlaps the incoming clip's start — audible as muddy audio on rapid advances. Explicit synchronous stop on tap eliminates the tail entirely.

### Session 27 Additions

- **NoteEditorModal decomposition over incremental fixes** — At 1268 lines, NoteEditorModal was the app's largest file and growing. Rather than patching it further, extracted all state/logic into `useNoteEditor` hook and broke the JSX into 5 focused components. The thin-shell pattern matches the rest of the app (useCheckers, useChess, useSudoku, etc.) and makes future changes surgical.
- **Voice recording removed from notes** — Voice memos have their own dedicated system (VoiceRecordScreen, VoiceMemoDetailScreen, clips, playback modes, photos) built in Session 26. Keeping a lesser recording feature inside notes created confusion — two places to record audio, one clearly better. Removed recording; kept `MemoCard` for legacy playback of existing note voice memos. Plan to remove legacy playback entirely in ~1 month when existing recordings are obsolete.
- **Text limits removed** — Notes were capped at 999 characters, voice memo notes at 200. With SQLite TEXT columns (no practical size limit) and `TextInput` handling thousands of characters fine, there's no technical reason to restrict. Users may want to write long notes for school, journaling, etc. The app's purpose has evolved beyond alarms/timers into a full memory/productivity tool. `renderLinkedText` regex parser is memoized, so long text in view mode is not a performance concern.
- **Bottom toolbar over dropdown menu** — The old dropdown (plus button → 5 menu items) hid capabilities behind an extra tap. A persistent bottom toolbar makes Camera, Gallery, Draw, Colors, and Attached discoverable at a glance. Same pattern every good note app uses — tools live where the thumb already is.
- **Attachments panel pattern** — Images in the main content area compete with text for screen space. Moving them behind an "Attached" button (paperclip icon) in edit mode keeps the writing area clean while still showing count/access. View mode displays images inline since the user is reading, not writing. Same pattern planned for VoiceMemoDetailScreen.
- **Note titles** — Notes previously had only a body text field. Adding an optional title gives users a way to label and scan their notes quickly in the list view. Title column added to the notes table with `NOT NULL DEFAULT ''` so existing notes are unaffected. Stored as empty-string sentinel rather than nullable — simpler type (required `string`) and no `?? ''` branching in rendering paths beyond the defensive normalization in `rowToNote`.

### Session 26 Additions

- **Voice memo clips: separate `voice_clips` table, not embedded JSON** — A `clips JSON TEXT` column on `voice_memos` would have been simpler to ship, but a separate relational table gives proper query flexibility (batch summaries via `getClipSummaries`, FK cascade, position ordering via SQL `ORDER BY`, label updates without rewriting the entire array). The cost (one extra `CREATE TABLE` + a migration) is small relative to the read-pattern benefits
- **Legacy `uri`/`duration` columns kept on `voice_memos`** — Could have dropped them after the migration, but a destructive `ALTER TABLE` on a real-user database is a foot-gun. Migration sets them to `''`/`0` for migrated memos and Session 26+ memos. They're harmless and the size cost is negligible
- **Default clip label = formatted createdAt timestamp** — Requiring users to title every clip would kill the rapid-capture use case (which is the entire point of multi-clip memos — "I'm walking, I think of three things, I want them in one container"). Showing the timestamp by default with optional rename matches how voicemail apps handle the same problem
- **Playback mode stored globally, not per-memo** — Most users will pick one mode and leave it (Stop is the conservative default). Per-memo state would clutter the data model for a setting users barely interact with after first encounter
- **Recording flow rewrite — VoiceRecordScreen creates the memo directly** — The old flow handed `tempUri` + `duration` to `VoiceMemoDetailScreen`, which then either rendered "new recording" UI or "existing memo" UI based on which params were present. Two code paths in one screen, awkward param-shape detection, and a transactional save spread across two screens. New flow: VoiceRecordScreen owns memo creation end-to-end (`addVoiceMemo` + `addClip` + photo persist + atomic rollback), then navigates to detail with `{ memoId }`. Detail screen only handles existing memos. One state machine per screen
- **Camera on record screen, gallery on detail screen** — Record screen is the rapid-capture surface: the camera button is tucked in the bottom-right corner so it doesn't compete with the mic. Gallery browsing is an edit-time activity (you're already settled in, picking through photos), which belongs on the detail screen with the title/note edit context
- **5-photo cap per voice memo** — Same cap as note images. The cap exists to keep the photo strip scrollable-but-not-overwhelming and to prevent abuse via the camera-then-camera-then-camera loop. The detail screen counts existing photos in the cap; the record screen counts captured + (in add-clip mode) existing
- **Timer save vs start, separated** — Auto-starting on save was annoying when users wanted to set up a timer for future use ("save this 25-min Pomodoro preset for next time"). Three buttons in the timer modal — cancel/save/start — make the intent explicit. The visual language (red/blue/green border colors) maps directly to user intent without text labels
- **Icon overhaul: text → circle icon buttons across all create/edit screens** — Edit/Save text capsule buttons varied in alignment, vertical position, and styling across screens because every screen reinvented them. Standardized to 40×40 circle icon buttons with consistent border color semantics (accent = save action, red = destructive, subtle = neutral). Visual consistency is the entire reason — readability of the icon was the obvious tradeoff and the chrome icons are clear enough at 18px
- **Silver `+` as the icon-picker default fallback** — A grayed-out preview of the default emoji confused users into thinking they had already picked an icon. The silver `+` reads unambiguously as "tap to pick" — same affordance pattern used everywhere else in the app for adding new things
- **Calendar inline icons restructured into flex rows** — `<Image>` inside `<Text>` is the cleanest way to write inline icons in JSX, but Android baseline alignment for inline images is unreliable across font sizes and densities — we burned three iterations trying to nudge them into place with `marginTop`/`marginBottom` hacks. Flex `<View>` row with `alignItems: 'center'` and Image + Text as siblings works in one shot

### Session 25 Additions

- **Timer notification ID convention** — Progress notifications use ID `countdown-{timerId}` with NO `data` field. Completion notifications use ID `timer-done-{timerId}` with `data: { timerId }`. Background and foreground handlers distinguish by ID prefix, not by data fields. This avoids the "alarm fires immediately" bug caused by adding a `timerId` data field to the progress notification (which made the background DELIVERED handler treat the progress display as a completion and play the alarm sound the instant the timer started).
- **`savedRef` timing** — `savedRef` must only flip to `true` INSIDE the success callback (`navigateBack`), never before `form.save()`. `form.save()` has multiple early-return and failure paths (validation bailouts, confirmation dialogs), and an eager flag flip permanently disarms the `beforeRemove` dirty-form guard for the rest of the screen's lifetime.
- **`handledActionRef` persistence** — `closeEditor` in `useNotepad` must NOT clear `handledActionRef`. The ref prevents the route-params effect from re-triggering the editor when the screen was opened with widget params (`newNote: true`) that persist after the editor closes. Clearing the ref creates an infinite reopen loop on widget cold start.

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
- **~~Game sounds:~~** Originally removed (enhanced haptic patterns not distinct). Reinstated in Session 23 with actual wav sound effects (11 files), per-sound volume map, and expo-audio fire-and-forget playback. Previous attempt was haptic-only; new version uses real audio.
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

### Screen decomposition: thin shell + hook + cards (Session 15)
Pattern for large list screens (>500 lines): extract all state + effects + handlers into a custom hook in `src/hooks/`, extract card rendering into reusable `React.memo`-wrapped components in `src/components/`, leave the screen as a thin render shell holding only layout styles + background + header + FlatList + FAB. Hook must NOT import UI modules (no `useTheme`, no safe-area-context, no components) — hook is state/logic only. Each card owns its own `useMemo(StyleSheet.create)` and haptics. Applied first to NotepadScreen (896 → 232 lines) and AlarmListScreen (556 → 278 lines) with `useNotepad`/`useAlarmList` hooks and `NoteCard`/`DeletedNoteCard`/`DeletedAlarmCard` components. `AlarmCard` already existed and was reused.

### WebP over PNG for background images (Session 15)
All 10 backgrounds (oakbackground, questionmark, newspaper, lightbulb, brain, door, fullscreenicon, gear, library, gameclock) converted to WebP. Resized to 1440px max dimension (1080px for watermark), quality 80 (70 for watermark). Total reduction 31.8 MB → 1.5 MB (95.4%). Dramatic APK size improvement at zero visual cost for fullscreen backgrounds with heavy overlays. Protected: icon.png, adaptive-icon.png, splash-icon.png, favicon.png — store/platform requirements. Used `sharp` temporarily, removed after conversion.

### FlatList OOM prevention on all list screens (Session 15)
All 5 main list screens (NotepadScreen, AlarmListScreen, ReminderScreen, VoiceMemoListScreen, CalendarScreen) use `removeClippedSubviews={true}`, `windowSize={5}`, `maxToRenderPerBatch={8}`, `initialNumToRender={8}`. Default `windowSize` is 21 — way too memory-hungry for image-attached notes or long alarm lists on budget devices. `windowSize=5` keeps 2 screens above + current + 2 below, massive memory reduction. Chose 8 for `maxToRenderPerBatch` and `initialNumToRender` as a balance between perceived speed and memory.

### Icons decorative by default, labeled on demand (Session 15)
`IconProps` has optional `accessibilityLabel`. When present: `accessible={true}`, `importantForAccessibility="yes"`. When absent: `importantForAccessibility="no-hide-descendants"` (TalkBack skips entirely). Rationale: icons wrapped inside a labeled TouchableOpacity are decorative and should be invisible to screen readers; standalone icons used as the only label for an interactive element (e.g., a FAB) need their own label. Pattern avoids TalkBack announcing "view" for every decorative icon.

### Accessibility labels reflect what user sees, not internal state (Session 15)
Card labels describe visual state (e.g., AlarmCard reads "7:00 AM alarm, Wake up, disabled" — time + nickname + visible state). Cards don't include all possible state — just what's on screen. Hint used for secondary actions ("Long press to copy", "Tap to edit"). Toggle labels are contextual ("Pin to widget" when unpinned, "Unpin from widget" when pinned).

### Keyboard-visible Done button (Session 15)
CreateAlarmScreen + CreateReminderScreen's small "Done" button under type-in TextInputs only renders when `Keyboard` listeners report the soft keyboard visible. When keyboard dismisses via scroll/tap-elsewhere, the Done button disappears too. Bottom time-modal Done button (paired with Cancel) is unaffected — it's the modal's own confirm action. Prevents orphaned UI.

### P5 Google Calendar deferred (Session 16)
Google Calendar Sync requires Firebase Auth + Google OAuth sign-in. That directly conflicts with the "no accounts, everything stays on your phone, we don't want your data" brand promise surfaced in onboarding, Settings, and the Vault privacy text. Ripping that promise out for a sync feature most users won't touch is a bad trade while the app is still pre-monetization. Revisit only when (a) user base justifies the complexity AND (b) a flow exists that keeps sign-in feeling optional/local. Until then, users keep using the in-app calendar.

### Chess AI: time-budgeted iterative deepening (Session 16)
AI searches depth 1 first, then 2, then 3, etc., aborting the moment a module-level `searchDeadline` passes. Each completed depth overwrites the best move; a partial depth is discarded. The previous completed depth's PV (best move) is moved to the front of the root move list for the next iteration — that's the whole point of IDS. Guarantees the AI always responds within its difficulty's time budget (300ms/500ms/1s/2s/5s) regardless of position complexity. Alternative approach (fixed depth) was tested and produced wildly variable response times — 50ms on endgame positions, 15+ seconds on tactical middlegames at depth 5.

### Chess AI: quiescence search at depth 0 (Session 16)
At depth 0, instead of returning `evaluateBoard(game)` directly, run `quiescence()` — a capture-only search that continues until the position is "quiet". Prevents the horizon effect where the AI stops mid-trade thinking "I'm up a knight!" right before the recapture that actually loses material. Delta pruning skips captures whose best possible gain can't reach alpha (saves work on clearly bad captures). Added in Session 16 after self-play benchmarks showed the AI repeatedly hanging pieces in forced trades. Measurable improvement in move quality at the same nominal search depth.

### Chess AI: root alpha-beta carries across siblings (Session 16)
Initial `findBestMove` called `minimax(…, -Infinity, Infinity, …)` fresh for every root move, meaning pruning info from one root move never helped narrow the search for the next. Audit finding — the biggest single performance fix. Now the root loop tightens alpha (for max) or beta (for min) as it finds better moves, passing the tightened bounds to subsequent root siblings' minimax calls. Roughly 2-3× speedup across all depths without changing move quality. Tests confirmed same mates/captures found.

### Chess AI: static-eval consistency in randomness path (Session 16)
Old `getAIMove` randomness path scored candidates with deep minimax and compared them to the anchor move's static eval — different scales, tactical blunders surfaced as "equal" to the deep-searched best and got randomly selected. Audit fix: evaluate ALL moves (including the anchor) with static eval, sort, then pick randomly from candidates within threshold. Randomness is meant to introduce human-like noise, not to accidentally pick tactical blunders.

### Chess AI: evaluation terms tuned for cheap correctness (Session 16)
`evaluateBoard` adds mobility (3cp/move for side to move), bishop pair (±50cp), doubled pawns (−15cp each), isolated pawns (−10cp each), king-safety pawn shield (+15cp/pawn within 1 square of king, middlegame only) on top of material + piece-square tables. All terms collected in a single pass through the board via in-loop counters (no second scan). Mobility IS a second `game.moves()` call per eval — acceptable trade for meaningful positional awareness. Test threshold for starting-position eval widened from ±50 to ±80 to account for mobility's one-sided contribution (the side to move gets the bonus, so starting position scores ~60 when white is to move).

### Chess: custom Staunton piece assets, not emoji/unicode (Session 16)
Unicode chess symbols (♔♕♖♗♘♙) render inconsistently across Android devices and themes. Emoji chess pieces look toyish and don't respect the app's visual language. ChatGPT-generated Staunton-style PNGs (12 files, 6 per color) give us consistent, readable, theme-neutral pieces across all devices. Same decision pattern as the Icons.tsx View-based replacements for emoji on HomeScreen/Settings.

### Chess: one take-back per game (Session 16)
Dedicated take-back roast pool. "One" is enough to forgive a single fat-finger, not enough to undo an entire losing plan. Matches the app's forgiving-but-judging personality. Used take-back toggles the button to "Used" at 0.4 opacity — visible, not hidden (user should see they've already spent their mulligan).

### Chess: SQLite persistence replays moves, doesn't just load FEN (Session 16)
Saved chess games restore via replaying every SAN move from `moveHistory` onto a fresh `new Chess()`, NOT by loading the FEN directly. Reason: a FEN string encodes only the current position. chess.js's internal `_history` array is what powers `undo()`, and loading a FEN alone leaves that array empty. Without replay, take-back silently breaks AND `game.history()` returns `[]` (so the move counter shows "Move 0" after resume). Fallback path loads FEN alone if replay throws — degraded state but playable.

### Chess progress bar: simple text, not animated bar (Session 16)
Initially built an animated progress bar for AI thinking. Four attempts:
1. Width interpolation + `useNativeDriver: false` → animation runs on JS thread, freezes for the full duration of `getAIMove` (up to 5s on Expert) since that's exactly when JS is blocked.
2. Width + native driver → not supported; native driver can only animate transform/opacity.
3. `translateX` on a fill bar clipped by `overflow: hidden` parent, `useNativeDriver: true` → works, keeps ticking during JS block, but complex markup and interpolate math.
4. `scaleX` with `transformOrigin: '0% 50%'` → simpler, also native.

All approaches had rough edges during audit (timing misalignment, layout shift when toggling visibility). Final decision: strip the animation entirely, replace with a fixed-height 24px container that shows plain "Thinking…" text via opacity toggle. Revisit after P6 ships. Lesson: don't ship an animation that visibly breaks on the most common code path (long AI thinks).

### Opening book over computed openings (Session 17)
Hardcoded FEN→move map covering the first 6-10 plies of mainline theory (Italian, Ruy Lopez, Queen's Gambit, London, English, Sicilian, French, Caro-Kann, KID, Slav). 104 entries, random selection from 1-3 book moves per position for variety. Instant move selection, zero CPU cost, theory-correct by construction. Book sits at the top of both `findBestMove` and `getAIMove` — if the position is in book, no search runs at all. `analyzeMove` passes `useBook=false` so blunder analysis is always search-based. analyzeMove also returns `{severity: 'good', centipawnLoss: 0}` if the *played* move is itself a book move, since any book move is sound by definition.

### FEN-keyed TT over Zobrist hashing (Session 17)
The TT key is the position-only FEN string (first 5 fields, including halfmove clock). Simpler than maintaining a Zobrist incremental hash, no xor bugs to chase, no need to mirror chess.js's internal move/undo logic. GC pressure is negligible relative to chess.js overhead. 100,000-entry cap with depth-preferred replacement + FIFO eviction. Cleared at the start of each `findBestMove` call — the TT lives within one search (across iterative-deepening depths), never persists across moves. Halfmove clock included so positions with different 50-move-rule runway don't share entries (a value safe with 50 halfmoves isn't safe with 5).

### Safety deadline for min-depth (Session 17)
`searchMinDepthActive` disables the normal `isTimeUp()` check during depths at or below `minDepth` so the engine actually reaches its competence floor. Without it, every minimax/quiescence node inside the mandatory depth still polled `isTimeUp()` and bailed out to static eval once the budget expired — so the floor was a lie. But unconditionally disabling the clock caused 25-30 second searches on complex positions at depth 4. Solution: add a `searchSafetyDeadline = now + timeLimitMs × 3` hard ceiling that fires even in min-depth mode. Competence floor is guaranteed; worst-case is capped at ~15 s for Expert instead of unbounded.

### Null move via new Chess instance (Session 17)
chess.js has no null-move API (the library doesn't expose a "pass the turn" operation). Null-move pruning is implemented by splitting the current game's FEN, flipping the side-to-move field, clearing the en-passant square (invalid after a skipped turn), and constructing a throwaway `Chess` object from the modified FEN. More expensive than a proper null-move toggle, but correct and contained. Guarded by the standard safety conditions: skipped when the side to move is in check (illegal) and in the endgame (zugzwang risk).

### Checkers: American rules only, no freestyle (Session 18)
Freestyle mode (no forced captures) was built, tested, and removed in the same session. Two rule variants doubled the API surface across engine, hook, storage, screen, database, and tests for marginal gameplay value. American checkers is the standard most players expect. One set of rules, fully tested, fully hardcoded. The `rules` column remains in the DB schema with DEFAULT 'american' — harmless to leave, risky to drop (SQLite column drops require table recreation).

### Checkers: no blunder roasts, no take-back (Session 18)
Checkers is simpler than chess — forced captures mean fewer truly "bad" moves, and the game tree is narrower. Blunder analysis would add complexity without meaningfully changing the experience. Take-back was also skipped because checkers games are shorter and less investment per move. These features remain chess-exclusive.

### Checkers: evaluateBoard must not call generateMoves (Session 18)
The initial checkers evaluateBoard called `generateMoves` for both colors to compute mobility bonuses and detect blocked-piece game-over. This was catastrophically slow — full recursive DFS at every leaf node of the search tree. The fix: evaluateBoard is pure material + positional only. `minimax` already handles "no legal moves = game over" at the top of each node. Mobility detection belongs in the search, not the eval.

### Checkers: deeper search depths than chess (Session 18)
Checkers has a branching factor of ~7-10 moves vs ~30-35 in chess. The same time budget supports much deeper searches. Expert checkers goes to depth 14 (vs depth 6 in chess). Beginner starts at depth 4 (vs depth 2 in chess). This compensates for checkers having no quiescence search, opening book, or null-move pruning.

### Chess scoring: blunder penalty removed (Session 18)
`recordChessResult` originally took a `blunderCount` parameter and subtracted 2 points per blunder from the game's score. Removed because scoring should reflect outcome (wins/draws/losses weighted by difficulty), not penalize process. A player who blunders but recovers to win shouldn't score less than a clean win.

### Memory Score: 140 max, 7 games (Session 18)
Score ceiling raised from 100 (5 games × 20) to 140 (7 games × 20) with the addition of chess and checkers. Rank thresholds scaled proportionally (each threshold × 1.4, rounded). The 20-per-game cap prevents any single game from dominating.

### Free local AI vs Pro cloud AI (Session 17)
Local chess engine is part of the free tier — works offline, no login, no data leaves the device, keeps the "we don't want your data" brand promise intact. Pro tier (P8) will add cloud Stockfish (2000+ ELO) as an *additional* opponent via Firebase Cloud Function, not a replacement. Same app, two tiers: free players get a respectable local opponent; Pro players get world-class analysis on demand. Chess multiplayer also lives in P8.

### `light` theme is Ocean (Session 13)
Rather than adding Ocean as a 7th theme, replaced the original Light theme entirely. Ocean has better contrast (darker slate text vs gray), more distinctive personality (blue-tinted background vs neutral gray), and stronger section colors. The old Light was generic — Ocean has character.

### homeBannerQuotes color field removed (Session 13)
Dead field. HomeScreen resolves section colors via `bannerColorMap` from theme tokens. Hardcoded hex on each quote object was never used when the map had a match (which was always — all 7 sections mapped). Removed `color` from `BannerQuote` interface and all ~60 quote objects.

### Montserrat Alternates over Nunito (Session 22)
Nunito felt generic and soft — rounded sans-serif used by thousands of apps. Montserrat Alternates has alternate letterforms (especially 'a', 'g', 'l') that give it personality without being gimmicky. Premium feel that matches the app's "polished but not corporate" identity. Wider letterforms required a font size reduction pass.

### Font size reduction after swap (Session 22)
Montserrat Alternates renders wider than Nunito at same font sizes. Applied systematic reduction: fontSize 28+ → -2, 16-27 → -2, 13-15 → -1, 12 and below unchanged. Mechanical pass across all files rather than case-by-case fixes ensures consistency and prevents missed overflow spots.

### fontWeight replaced with fontFamily (Session 22)
On Android, setting both `fontWeight` and `fontFamily` causes double-bolding or crashes. The correct pattern is `fontFamily` only (e.g. `FONTS.bold` instead of `fontWeight: '700'`), with the weight encoded in the font file name. Exception: TextInput styles keep `fontWeight` because custom `fontFamily` renders inconsistently on Android TextInput components.

### Quick Capture simplification (Session 22)
Removed section title and icons from quick capture buttons. Wider font made them crowded. Renamed to Quick Note / Quick Record / Quick Timer for clarity. Buttons are pure text now — icon + text was redundant when the label is already descriptive.

### Splash screen dark background (Session 22)
Changed splash backgroundColor from white `#ffffff` to dark `#121220` to eliminate the jarring white flash between splash and app load. Matches the app's dark default theme. Needs EAS build to take effect (splash config is compile-time).

### Dual brand identity concept (Session 22, noted)
"Personality Mode" (character art, sarcastic roasts) as default, "Clean Mode" (silver chrome, helpful phrases) as toggle. Not scheduled yet — revisit after Pro tier. Would allow the app to appeal to both personality-loving and professional-use audiences.

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

### Session 21 Decisions
- Chess pieces are anthropomorphic (matching game section art style), not silver chrome (which is core app only). Games use playful cartoon art; core utilities use silver metallic icons.
- Training mode re-derives from difficulty on restore rather than persisting — simpler, acceptable default (always ON for eligible difficulties, which is the right default for beginners).
- Font rollout in phases: Phase 1 headers only, Phase 2 body text — prevents massive single-prompt scope and lets us validate the look before committing everywhere.
- App icon kept as-is (alarm + glowing ?) — silver chrome version didn't meaningfully improve on existing.
- Calendar empty states use color cartoon art (not silver chrome) since they're decorative illustrations, not utility icons.
- CHECK! shows whenever isInCheck is true regardless of whose turn — both players should see the check state. Pulses only when it's the player's turn (they need to act); solid during AI turn.
- isInCheck not gated by isGameOver — king highlight persists on checkmate so the player can see why the game ended.

### Session 23 Decisions
- **GlowIcon over colored circles** — Accidental discovery. Removing colored button backgrounds revealed shadow glow that looked intentional and premium. Created GlowIcon component to standardize. Android requires translucent `backgroundColor` fill (`glowColor + '20'`) to avoid hollow ring shadow. Centered shadow offset `{0,0}`.
- **Two-tier media icon styles** — Green anthropomorphic character (game-play.webp) for game contexts, brushed chrome set for app controls. Matches existing two-tier visual language from Session 20 (silver core, anthropomorphic games).
- **Sound mapping: shared vs dedicated** — Chess capture/promote sounds shared with checkers. Win/loss shared. Saves bundle size, sounds are generic enough. Tap sound only on UI buttons, not gameplay interactions — avoids annoyance on high-frequency taps.
- **Volume map over hardcoded** — `VOLUMES: Record<SoundName, number>` allows per-sound tuning without touching play logic. Built for future expansion.
- **gameSounds default ON** — Audit caught that null init effectively disabled sounds. Fixed to match haptics pattern: treat null kvGet as enabled.
- **Close-X chrome icon over unicode** — Replaced all 15 `\u2715` characters with chrome close-x.webp. Consistent with silver icon language. Dead CloseIcon function removed from Icons.tsx.
- **Checkmate banner priority** — Must check `gameResult === 'checkmate'` BEFORE `isInCheck` because checkmate implies check. Without priority ordering, checkmate always showed "CHECK!".
- **Take Back label vs state** — `takeBackUsed` (boolean) drives the label text. `takeBackAvailable` (derived: !used && isPlayerTurn && moves >= 2) drives disabled/opacity. Separate concerns prevent "Used" showing on move 1 of a fresh game.
- **FAB glow standardization** — All 4 FABs use identical styles. Position (right: 24), size (56×56), shadow, borderRadius (28) all matched across AlarmList, Notepad, Reminder, VoiceMemoList.

### Session 24 Decisions

- **Chrome circle over glow-shadow FAB** — Session 23's glow-shadow FAB (elevation + translucent accent fill) rendered a visible hex/polygon outline on Android inside the halo, no matter how the alpha was tuned (tried 15, 35, stacked views, bare icon). Replaced with the same opaque `rgba(30, 30, 40, 0.8)` chrome fill that `BackButton`/`HomeButton` use. No elevation, no shadow, no polygon — consistent with the rest of the nav chrome.
- **No `tintColor` on plus / notepad silver icons** — The silver-metallic WebP assets are designed to render as-is. Applying `tintColor: colors.accent` flattens the metallic shading into a single-color silhouette. Natural rendering (no tint) keeps the brushed-metal look. Applies to FAB plus icon and the NoteCard empty-state notepad.
- **NoteCard silver fallback over 📝 emoji** — When a note has no user-chosen emoji, the iconCircle showed `📝`. Replaced with the silver `notepad.webp` asset at 22×22 to match the rest of the app's icon language. User expressly preferred the silver look over both emoji and accent-tinted variants.
- **Two-tier icon system split** — Formalized in Session 24 audit: **chrome icons** (silver, no faces, utility) live in `assets/app-icons/` and are used by productivity surfaces (alarms, reminders, notes, calendar, settings). **Character icons** (full-color, faces, weathered expressions) live in `assets/icons/` and are used by game surfaces only. `BackButton`/`HomeButton` are chrome; `GameNavButtons` (when wired) is character art.
- **Lock icon deferred until PIN ships** — `assets/app-icons/lock.webp` is on disk but not exported from `appIconAssets.ts`. Rationale: private reminders/alarms should show **no** visual indicator until a PIN system actually enforces privacy. Rendering a lock glyph over "secret" content is an attention-magnet for anyone looking over the user's shoulder and actively defeats the purpose. Ship lock only when taps actually require authentication.
- **`beforeRemove` guard + `savedRef` bypass** — The standard guard pattern blocks navigation until the user confirms "discard changes?". But save-then-navigate is the normal happy path and shouldn't trip the guard. Solution: a `savedRef` ref that `handleSave` flips to `true` immediately before calling `navigation.goBack()`. The guard checks the ref and lets the pop through. Cleaner than disposing the listener and re-subscribing, cleaner than a flag in state that would re-render.
- **`isDirty` via JSON.stringify diff, not boolean flip** — Tracking dirty via a `hasEdited` boolean breaks when the user edits a field then reverts it back to the original value — the form is clean again but the flag still says dirty, so the discard prompt fires unnecessarily. `JSON.stringify(current) !== JSON.stringify(initial)` catches the revert-to-clean case. Cheap enough for form-sized objects.
- **GameNavButtons as a separate component, not a variant of BackButton/HomeButton** — The game section has a different visual identity (character art, full-color, personality) from the productivity chrome. Branching inside BackButton/HomeButton with a `variant` prop would pollute the chrome component with game-specific asset imports and conditionals. A dedicated `GameNavButtons.tsx` keeps the game/app boundary explicit and the chrome component lean. *(Decision stands even though Session 24's wiring was reverted — when it ships, it'll ship as a separate component.)*
- **`autoExportBackup` must never throw** — Auto-backup runs on app open in the background. If a stale SAF URI or a dropped Drive permission throws, the app crashes on launch for users who *thought* they set up backups once and forgot about it. Background operations live under a contract: log the error, update `lastBackupError` state, return — never propagate. Foreground (manual) backup still throws so the user sees the failure in the UI.
- **`audioCompat.ts` intersection type over patching expo-audio** — expo-audio 55.x types lose `addListener`/`release` inheritance through the `SharedObject<AudioEvents>` indirection. Options considered: (1) patch-package on expo-audio, (2) `// @ts-ignore` at every call site, (3) define a local intersection type and cast at the `createAudioPlayer` call site. Chose (3) — single source of truth, survives package upgrades, no vendored code. Also prefer `player.remove()` over `player.release()` since `remove()` is declared directly on `AudioPlayer` — `release()` is only reachable through the broken SharedObject inheritance.
- **Gemini audit access restriction** — Gemini created 6 unauthorized files during a read-only audit phase (ESLint config, lint scripts, etc.) despite the prompt. Escalated warnings don't fully stop it. Gemini still earns its slot for catching things Codex misses, but **cannot be trusted with write access**. Audit prompts now run Gemini in an explicit read-only container, and any file creation during audit is treated as a prompt violation and discarded.
- **Revert of FINAL prompt over keeping partial wiring** — Session 24's FINAL prompt tried to wire GameNavButtons, add game sound entries, sweep emoji to icons in secondary screens, all in one pass. Laptop instability during that prompt left the codebase in a half-state. Rather than debugging partial fixes, reverted the FINAL commit cleanly and kept the audit work (commit `3e94a28`) intact. Stranded asset files and `GameNavButtons.tsx` remain on disk for the next wire-up pass.
