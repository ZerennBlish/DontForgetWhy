# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: Session 40 (April 21, 2026)

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | **v1.24.0 (versionCode 43)** — LIVE on Play Store. `dev` is ahead of v1.24.0 with significant cleanup work (full Pass 1 + Pass 2 dead-code sweep landed). |
| **Branch** | `dev` — `main` reset to match `dev` in Session 37. `v1.24.0` tag on `0ee7100`. |
| **Production Status** | v1.24.0 (versionCode 43) live on Play Store. |
| **Current Focus** | Multiplayer + dual-theme icon system shipped. App Check + Pro activation remaining before v2.0.0. |
| **Blocked By** | Nothing |
| **Next Action** | App Check (lock down cloud endpoints), then Pro activation + ship. |
| **EAS Credits** | ~19 remaining (1 dev build + 1 production build this session). Reset May 12. |
| **Firebase Credits** | **$300 activated — expires July 14, 2026.** Auth + Firestore + Google Calendar API all active. OAuth consent screen unverified (shows warning on write scope). |
| **ElevenLabs** | Subscription active — 84 clips shipped (68 original + 15 tutorial + Opening.mp3) |

---

## v2.0.0 LAUNCH SEQUENCE

1. ~~Backlog cleanup~~ ✅ Session 39
2. ~~Icon wire-up~~ ✅ Session 40 — Dual-theme system (Phases 0-4). 65+ assets placed, resolver + hooks + Pro-gated Settings toggle. Triple audited + fixed.
3. ~~Multiplayer~~ ✅ Session 39 (chess, checkers, trivia)
4. **App Check** — Lock down cloud endpoints before billing
5. **P7 Pro Tier activation** — Paywall live for new users
6. **Ship v2.0.0**

### Known limitations (v2.0.0)

- **Dual-theme icon system — trivia chrome set incomplete** — 5 of 8+ trivia categories have dedicated chrome art; the rest fall back to anthropomorphic (and `trivia.phone` / `trivia.puzzle` share the lightbulb glyph in mixed/toon modes). Tracked in the Visual & Theme backlog.
- **Dual-theme icon system — art refinement ongoing** — visual consistency across the three themes is still being iterated; minor divergence between mixed/chrome/anthropomorphic stroke weight + palette expected until the next art pass.

---

## PHASE STATUS

| Phase | Name | Status | Build Type |
|-------|------|--------|------------|
| 1 | Housekeeping | ✅ Done | — |
| 2 | Photos + Drawing + Backgrounds | ✅ Done | Dev + Prod |
| 3 | Voice Roasts | ✅ Done | Dev + Prod |
| 3.5 | Voice Memos | ✅ Done | Dev + Prod |
| — | v1.9.0 Home Screen | ✅ Done | Prod only |
| — | Storage Migration (SQLite) | ✅ Done | Dev + Prod |
| — | Visual Overhaul (6 themes) | ✅ Done | Prod only |
| — | Session 14 Onboarding Overhaul | ✅ Done | Prod only |
| 4 | The Vault (Backup & Restore) | ✅ Done | Dev + Prod |
| 4.5 | Stability Sprint | ✅ Done | Prod only |
| 5 | Google Calendar Sync (read) | ✅ Done | Dev + Prod |
| 5.5 | Premium Foundation | ✅ Done | Dev + Prod |
| 6 | Chess + Checkers + Blunder Roast | ✅ Done | Prod only |
| 6.5 | Voice Content Expansion | 🟡 Partial | Prod only |
| 7 | Pro Tier + Billing | 🟡 Core Done | Dev (v1.23.0 awaiting ship) |
| 8 | Firebase Online + Multiplayer | ✅ Multiplayer + Icons Done | Dev (v2.0.0 — App Check remaining) |

> **Note:** P8 was pulled forward and its Auth + Firestore foundation landed in Session 30 alongside P5, because P5 required Firebase Auth to sign the user in for Google Calendar access. Session 32 added **Cloud Checkers AI** as the first Cloud Functions deployment (public unauth endpoint — App Check deferred to pre-Pro launch). **Multiplayer chess, checkers, and trivia are the flagship v2.0.0 feature** — active pre-launch work, the major addition that justifies the version jump and gives Pro something worth paying for. Online riddles also remain pre-launch. Global leaderboards stay post-2.0.

---

## COMPLETED PHASES (SUMMARY)

- **P1 · Housekeeping** — Shipped v1.3.4. Utility extraction, test reconciliation, timer mutex.
- **P2 · Photos + Drawing + Backgrounds** — Shipped v1.6.1. Note image attachments, Skia drawing canvas, S Pen pressure, draw-on-photos, custom photo backgrounds, per-alarm fire photos.
- **P3 · Voice Roasts** — Shipped v1.7.0. 68 ElevenLabs clips, native ALARM stream playback, snooze shame escalation, timer roasts, dismiss voice toggle.
- **P3.5 · Voice Memos** — Shipped v1.8.0. VoiceRecordScreen, VoiceMemoDetailScreen, NotepadScreen integration, MicWidget, CalendarScreen dots, card unification.
- **v1.9.0 · Home Screen** — Shipped v1.9.0. Entry point with icon grid, Quick Capture, personality banner, Today section. TimerScreen + VoiceMemoListScreen extracted as standalone screens.
- **SQLite Migration** — Shipped v1.10.0. expo-sqlite, 7 entity tables + kv_store, full AsyncStorage removal, ForgetLog removed.
- **Visual Overhaul** — Shipped v1.10.1. 6 themes (Dark, Light, High Contrast, Vivid, Sunset, Ruby), GamesScreen + SettingsScreen fully themed, bgUri-aware overrides on 8 screens, VoiceMemoDetailScreen + NoteEditorModal redesign.
- **Session 14 · Onboarding** — Shipped v1.10.1. Full rewrite with sarcastic copy, View-based icons, mic/camera permission slides, theme cycling preview, watermark, skip warnings, dynamic final slide.
- **P4 · The Vault** — Shipped v1.11.0. Export/Import Memories (.dfw backup), auto-export via SAF to Google Drive/external folders, transactional restore with rollback, manifest-first architecture, strict validation, notification rescheduling, Jest tests.
- **P4.5 · Stability Sprint** — Shipped v1.12.0. NotepadScreen + AlarmListScreen decomposed into thin shells + hooks + card components, full accessibility pass, PNG→WebP compression (31.8 MB → 1.5 MB), FlatList OOM prevention, Jest resurrection (162 tests), clean package audit.
- **P5.5 · Premium Foundation** — Shipped v1.21.0 (Session 29). `expo-iap@^4.0.2` (Play Billing 8.x), Google Play product `dfw_pro_unlock` ($1.99, one-time, non-consumable) active, license testers configured. `proStatus.ts` (sync kv entitlement cache with safeParse + type guard), `useEntitlement.ts` (wraps useIAP with real restore flow + 60s timeout + cancel handling + unmount cleanup), `ProGate.tsx` (pass-through until P7). 18-test `proStatus.test.ts` suite. Ships dormant — plumbing in production before any user can be charged.
- **P6 · Chess + Checkers + Blunder Roast** — Shipped v1.13.0 (chess) + v1.14.0 (checkers + scoring overhaul). Chess: chess.js, iterative-deepening minimax, opening book, TT, killer moves, null-move pruning, tapered eval, 5 difficulties, blunder roasts. Checkers: pure JS engine, American rules, 5 difficulties, forced capture, promotion-stops-chain. Scoring: max 140 (7 games × 20), rank thresholds scaled, chess/checkers stat sections in Memory Score.
- **Session 19 · Visual Art Overhaul** — Memory Match → Memory Guy Match (22 custom cards + card back + felt bg). 10 trivia category icons + library bg. 9 rank tier images with new titles. GamesScreen + score screen emoji → custom art.
- **Session 20 · Silver Metallic Icon Set + Guess Why Art** — 25+ silver/chrome utility icons replacing View-based CSS geometry. Two-tier visual language (silver core, anthropomorphic games). Screen header icons on 7 core screens. Sound mode icons. ShareNoteModal icons. FAB plus buttons. Guess Why art. Checker pieces (4 WebP). Icons.tsx pruned. Jest webp moduleNameMapper.
- **Session 21 · Chess Overhaul + Custom Fonts (v1.16.0)** — Chess: post-game move review (FEN history, step-through board), check/checkmate indication (red king square, CHECK! banner, red board border), training mode (threatened pieces, last move highlight, toggle for difficulty 0-2), haptic tiers (light=turn, heavy=check, error=checkmate). Art: 12 anthropomorphic chess pieces (6 white cream/gold, 6 black charcoal/silver), 3 calendar empty state illustrations (hammock, beach chair, couch), calendar icon refresh. Visual: plus icon sizes increased across 8 files, color picker circles aligned in NoteEditorModal. Fonts: Satisfy (app title), Lilita One (game headers), Nunito (core UI headers). Phase 1 font rollout — headers only, body text Phase 2.
- **Session 22 · Montserrat Alternates + Hook Extractions** — Font Phase 2: Montserrat Alternates to all ~40 files, fontWeight→fontFamily pattern, systematic font size reduction. Hook extractions: useSudoku, useTimerScreen, useDailyRiddle, useSettings. NoteEditorModal cleanup: linkedText.tsx, NoteVoiceMemo.tsx, ColorPickerModal.tsx. Quick Capture simplification. Splash dark bg prep. Play Store refresh (8 screenshots, updated description). Dual audit, 11 fixes.
- **Session 23 · Game Sounds + Media Control Icons + Close-X (v1.18.0)** — Game sound effects: 11 wav files (chess place/capture/promote/pickUp, checkers move, game win/loss, card flip/flipBack, memory win, tap), gameSounds.ts service with VOLUMES map (cached toggle, fire-and-forget expo-audio), settings toggle, wired to useChess/useCheckers/MemoryMatchScreen. Tap SFX on game UI buttons across 8 screens. Media control icon replacement: 5 WebP assets (game-play character, chrome play/pause/stop/record) replacing all CSS border-triangle and emoji play/pause/stop icons. GlowIcon component with colored shadow spotlight (Android translucent fill fix). FAB + buttons: colored backgrounds removed, glow shadow added across 4 screens. Close-X chrome icon: 15 replacements across 9 files, dead CloseIcon removed from Icons.tsx. Checkmate banner (CHECK! vs CHECKMATE!). Take back label fix (fresh game shows "Take Back" not "Used"). Chess light mode card text fix. metro.config.js wav asset extension. 3 audit rounds, 6 total fixes.
- **Session 24 · Full Codebase Audit Sweep** — 8-category dual audit (Codex + Gemini): dead code, theme compliance, accessibility, performance, type safety, UI patterns, data/storage, navigation. **Dead code:** removed `alarmSounds.ts` (dead file), 26 dead icon exports, orphaned styles across 13 files, unused imports/variables across 14 files, unexported dead exports across 27 files. **Theme:** added `success` + `overlaySecondary` tokens (all 6 themes), fixed 5 light-theme broken screens, hardcoded color cleanup across 15+ files, capsule pill opacity fix. **Accessibility:** BackButton/HomeButton hitSlop + labels (foundation), AlarmFire/VoiceRecord/Timer/VoiceMemoDetail critical-screen pass, card components, modals, form screens, game screens, complex components, live regions. **Performance:** FlatList configs (removeClippedSubviews, windowSize 5, maxToRenderPerBatch 8, initialNumToRender 8), React.memo wraps, useCallback in hooks + screens. **Data safety:** restore mutex (`restoreInProgress` flag), notification cancellation timing, per-row migration error handling, `safeParse` utility, `asyncMutex` utility wired across 13 storage files, safe JSON parsing everywhere. **Navigation:** `beforeRemove` guards on CreateAlarm/CreateReminder with `savedRef` bypass, VoiceRecord confirmation dialog, game screen hardware-back intercept, HomeButton popToTop, deep-link existence checks, note pending TTL, NoteEditor widget protection. **Type safety:** migration entity types, storage validation, alarm form non-null fixes, useSudoku validation, hook return types. **UI patterns (partially reverted):** `GameNavButtons.tsx` component created but wiring + icon exports reverted (file stranded with broken `APP_ICONS.gameBack`/`gameHome` references — must be wired or deleted before ship). Emoji-chrome sweep in secondary screens also reverted. **Custom icons (assets present, exports reverted):** 8 game character icons on disk (hourglass, pencil, erase, chevron-left/right, game-back, game-home, smiley), 2 chrome icons (lock, checkmark) — all in `assets/` but not exported from `appIconAssets.ts`. **Game sounds (assets present, registry reverted):** 5 new wav files on disk (pencil, Eraser, Triva-tap, right-answer-Triva, wrong-answer-trivia) but `gameSounds.ts` SOUNDS registry has no pencil/eraser/trivia entries. **Audio compat layer:** `audioCompat.ts` created to patch expo-audio 55.x type drift (missing `addListener`/`release` inheritance), but not yet imported — `gameSounds.ts` and `soundFeedback.ts` still throw the TS errors. **Bug fixes shipped:** FAB glow styling (hex hole → chrome circle matching BackButton/HomeButton on 4 list screens), VoiceRecord navigation, autoBackup SAF error handling (never-throw contract), NoteCard/DeletedNoteCard silver notepad fallback when `note.icon` is empty, expo-audio type compatibility scaffolding. Gemini audit violation: created 6 unauthorized files during read-only audit phase (ESLint config + scripts) — deleted, read-only warnings escalated in auditor prompts. **Audit work from 3e94a28 is intact. "FINAL prompt" wiring from 3ae389f was reverted in 4820f36 after laptop instability.**
- **Session 25 · Audit Fix Redo + Sound/Icon Wiring + Nav Fixes** — Re-applied reverted Session 24 work: game sound wiring (Sudoku + Trivia), icon registry expansion, chrome icon replacements. Added DailyRiddle answer sounds (`triviaCorrect`/`triviaWrong`). Fixed timer progress notification: countdown taps navigate to TimerScreen, completion taps to AlarmFire. Background handler skips alarm sound for countdown notifications (distinguished by notification ID prefix `countdown-` vs `timer-done-`). Fixed VoiceMemoDetailScreen: Save button always visible in edit mode, removed bottom save/discard row, sarcastic no-title warning. Fixed CreateAlarmScreen/CreateReminderScreen: `savedRef` bypasses `beforeRemove` only after successful save (moved into `navigateBack` callback). Fixed quick note infinite editor reopen (`handledActionRef` not cleared in `closeEditor`). Fixed widget voice record/detail back navigation (`VoiceMemoList` in initial stack, including warm-app `Quick Record` from HomeScreen via `navigation.reset`). Fixed AlarmFireScreen KeepAwake crash (async IIFE wrapper). expo-audio type casts (`as any`) for `addListener`/`release` across `gameSounds`, `soundFeedback`, `VoiceMemoListScreen`. Silver-icon tint cleanup across CalendarScreen event cards, ReminderScreen completion checkmark, DeletedAlarmCard bell, SettingsScreen active-theme checkmark, SoundPickerModal selected-sound checkmarks, DayPickerRow calendar toggle, CalendarScreen quick-create plus capsules. DailyRiddle Got it/Nope buttons use `win`/`loss` character icons. Dual audit (Codex + Gemini) — scoped to Session 25 changes. 3 fixes applied. **Shipped as v1.18.0 (versionCode 35).**
- **Session 26 · Voice Memo Clips + Photos + Icon Overhaul** — Voice memo clips: memos are containers holding multiple audio clips. New `voice_clips` DB table with FK to voice_memos (id, memoId, uri, duration, position, label, createdAt), `VoiceClip` type, `voiceClipStorage.ts` service (`getClipsForMemo`, `getClipSummaries` batch, `addClip`, `deleteClip`, `updateClipLabel`, `getNextClipPosition`, `deleteAllClipsForMemo`). DB migration in `_initSchema` converts existing single-uri memos to clip rows. Clips have position ordering and optional labels (default shows formatted createdAt timestamp, tappable to rename in edit mode). `voice_memos.uri` and `voice_memos.duration` columns kept for backward compat, set empty/0 for new memos. Clip playback modes: Stop (single clip), Play All (auto-advance through clips), Repeat (loop current). Persisted globally via kv_store key `clipPlaybackMode`. Voice memo photos: camera capture on VoiceRecordScreen (corner button), gallery picker on VoiceMemoDetailScreen (edit mode), photo strip on detail screen with ImageLightbox view, 5-photo cap. New `voice-memo-images/` storage folder, `voiceMemoImageStorage.ts` service, `images TEXT NOT NULL DEFAULT '[]'` column on voice_memos. Added to `MEDIA_FOLDERS` in backupRestore.ts and `BackupMeta.contents.voiceMemoImages` count. Recording flow rewrite: `VoiceRecordScreen.saveAndNavigate` creates memo + first clip directly, navigates to detail with `{ memoId }`. Eliminated `isNewRecording`/`tempUri` handoff path entirely. Two modes: new memo (creates memo row + clip + photos atomically with rollback on clip failure) and add-clip (appends clip + photos to existing memo). Camera button on bottom-right corner, always visible. Icon overhaul: 7 new icons (`save`/floppy-disk, `edit`/pencil, plus the existing repeat/play-all/play-stop/skip-back/skip-forward from Session 23). Replaced text Edit/Save buttons with circle icon buttons across VoiceMemoDetailScreen, NoteEditorModal, CreateAlarmScreen, CreateReminderScreen. Timer modal redesigned with 3 circle action buttons (red cancel / accent save-only / success start). New `handleModalSaveOnly` separates Save from Start so users can save timer presets without auto-starting. Sound/bell buttons (sound mode toggle in timer + alarm) and emoji circles got tappable circle treatment. Reminder + Timer + Alarm icon-picker fallback shows silver `+` instead of default emoji. Calendar inline icons next to "Set date" restructured into proper flex `<View>` rows (was inline image-in-Text with broken Android baseline). Dual audit (Codex + Gemini) on Session 26 work — 8 findings fixed: HIGH (focus reload missed memo, non-atomic save, stale capturedPhotos closure), MEDIUM (5-photo cap ignored existing, backup meta missing voiceMemoImages, migration inserter missing images column), LOW (VoiceMemoCard accessibility label, Array.isArray validation on parsed images). Re-audit clean. `npx tsc --noEmit` 0 errors, 315 tests passing.

---

## PHASE 4 — THE VAULT (Backup & Restore) ✅ COMPLETE

**Shipped in:** v1.11.0 (versionCode 28)
**Branch:** `dev`
**New deps:** `react-native-zip-archive`, `expo-document-picker`
**Build cost:** 1 dev build + 1 production build

### Completed

- [x] Export Memories — zip dfw.db + voice-memos/ + note-images/ + backgrounds/ + alarm-photos/ into .dfw file, share via system sheet
- [x] Import Memories — file picker, dry-run validation, two-step overwrite warning, transactional restore with rollback
- [x] Auto-export via SAF — user picks folder (Google Drive, Downloads, etc.), silently backs up on app open based on frequency (daily/weekly/monthly)
- [x] Manifest-first architecture — backup-meta.json with appVersion, backupVersion, createdAt, content counts
- [x] Strict validation — rejects unknown versions, malformed manifests, missing DB
- [x] Transactional restore — live data moved to rollback dir, swap in restored data, rollback on failure
- [x] Notification rescheduling — cancel all, reload alarms/reminders, reschedule with new IDs
- [x] "Your Memories" Settings section — privacy text, export/import buttons, last backup date, 30-day nudge
- [x] "Back up now?" prompt on initial SAF folder selection
- [x] Jest tests for backup logic (shouldAutoBackup, getAutoBackupSettings, manifest validation)
- [x] Play Store screenshots refreshed (8 new screenshots)

### Design Decisions

- No encryption at launch — passphrase problem (forgotten = backup gone). Ship clean ZIP first.
- Manifest-first from day one — every .dfw includes backup-meta.json with schema version
- Transactional restore with rollback — never delete live data until replacement is verified
- SAF for auto-export — user controls where backups go, not us
- Privacy messaging: "We don't have servers. We don't want your data."

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 2 rounds
- [x] Round 1: P0 (non-transactional restore), P1 (SAF not implemented, weak validation), P2 (nudge, missing tests) — all fixed
- [x] Round 2: P1 (manifest field validation, test coverage gaps) — fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 4 suites, 56+ tests passing

---

## PHASE 4.5 — STABILITY SPRINT ✅ COMPLETE

**Shipped in:** v1.12.0 (versionCode 29)
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build

### Completed

- [x] **4.5.1 NotepadScreen decomposition** — 896 → 232 lines. Extracted `useNotepad` hook, `NoteCard`, `DeletedNoteCard` components
- [x] **4.5.2 AlarmListScreen decomposition** — 556 → 278 lines. Extracted `useAlarmList` hook, `DeletedAlarmCard` component
- [x] **4.5.3 Accessibility pass** — accessibilityLabel/Role/State/Hint added to all interactive elements across 10 files. Icons decorative by default via `importantForAccessibility="no-hide-descendants"`
- [x] **4.5.4 App size + storage audit** — 10 PNG backgrounds → WebP (31.8 MB → 1.5 MB, 95.4% savings). Resize to 1440px max, quality 80
- [x] **4.5.5 OOM prevention** — `removeClippedSubviews`, `windowSize={5}`, `maxToRenderPerBatch={8}`, `initialNumToRender={8}` on 5 main FlatLists
- [x] **4.5.6 Jest resurrection** — 7 suites, 162 tests (was 4 suites, 56+). Added `widgetPins.test.ts` (50 tests), `settings.test.ts` (36 tests), `timeUtils.test.ts` (14 tests)
- [x] **4.5.7 R8 deobfuscation mapping** — pending upload at build time
- [x] **4.5.8 Full abandoned package audit** — depcheck clean. All flagged deps (expo-dev-client, expo-notifications, react-native-screens, react-native-worklets) required implicitly

### Audit Gate
- [x] Dual audit (Codex + Gemini) — findings fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 7 suites, 162 tests passing
- [x] Version bump v1.11.0 → v1.12.0, versionCode 28 → 29

---

## PHASE 5 — GOOGLE CALENDAR SYNC ✅ COMPLETE

**Shipped in:** Session 30 (April 14, 2026) — code on `dev`, not yet shipped to Play Store (pending version bump).
**Branch:** `dev`
**New deps:** `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`, `@react-native-google-signin/google-signin`
**Build cost:** 2 dev builds (1 failed, 1 succeeded)

**Deferred in Session 16.** Original reason was brand conflict with "no accounts, we don't want your data." Session 30 unblocked it by reframing the brand: the app still works 100% offline always, sign-in is voluntary and local-feeling, connected features (calendar) are additive and never block the offline core.

### Completed

- [x] Firebase project `dont-forget-why` on Blaze plan ($300 credit, 90-day clock started April 14)
- [x] Android app registered with production keystore SHA-1
- [x] Google Auth provider enabled, Firestore created, rules published locking `users/{uid}` to `request.auth.uid`
- [x] Google Calendar API enabled in Google Cloud Console
- [x] `google-services.json` in project root, referenced via `android.googleServicesFile` in app.json for EAS prebuild
- [x] `@react-native-firebase/auth` Google Sign-In (voluntary, initiated from SettingsScreen Google Account card)
- [x] `firebaseAuth.ts` service — `signInWithGoogle`, `signOutGoogle`, `getCurrentUser`, `onAuthStateChanged`, `getAccessToken`, `requestCalendarScope`. Configured with `calendar.readonly` scope. Clears the calendar cache on sign-in + sign-out.
- [x] `firestore.ts` service — typed CRUD for `users` collection, `UserProfile` type, `isUserProfile` shape validation, `set({ merge: true })` with first-write-only `createdAt` guard, `firestoreTimestamp()` helper
- [x] User profile write on sign-in (fire-and-forget, never blocks the sign-in UX)
- [x] `googleCalendar.ts` service — REST API client, 5-minute in-memory cache keyed by uid + date range, all-day + timed event parsing, local-TZ-aware query window, 401 → token refresh, 403 → scope request, silent empty-array fallback on any failure
- [x] CalendarScreen integration — `sectionCalendar`-colored dots on month grid, new `google` filter capsule, event cards with "G" badge, auth-aware fetching via `onAuthStateChanged` subscription, separate `useEffect([currentMonth, authUser])` for fetch (local data loading kept on focus), legend wraps to two rows to fit 5 dot types, multi-day events deduplicated via `dateStr`-prefixed row keys
- [x] HomeScreen integration — Google events in Today section with "G" badge + "All Day" label handling, auth-aware fetching via `onAuthStateChanged` subscription, dedicated `useEffect([authUser])` for fetch
- [x] SettingsScreen Google Account card — connect button, connected state shows photo + name + email + disconnect button, no-data messaging
- [x] Jest coverage — `firebaseAuth.test.ts` (mocks google-signin + firebase-auth + firestore), `firestore.test.ts` (shape validation + set/merge + createdAt first-write-only), `googleCalendar.test.ts` (URL/auth header, TZ-robust time window assertion, cached/TTL, 401-refresh-retry, 403-scope-retry, all-day + multi-day + timed parsing, clearCalendarCache, getEventsForDate)

### Design Decisions
- **Optional sign-in philosophy confirmed.** Brand evolves from "no accounts ever" to "your data stays yours, even when you sign in." See Decisions doc Session 30 block.
- **Google Calendar via REST API, not SDK.** No extra native dependency; Bearer token from Google Sign-In is enough. Lighter, simpler, sufficient for read-only sync.
- **In-memory cache only, no local persistence for calendar events.** Aligns with "your data stays yours" — Google Calendar data never touches SQLite.
- **Cache keyed by uid + date range.** Prevents cross-account data leaks on shared devices. Cleared on sign-in AND sign-out (belt-and-suspenders).
- **401 = token refresh, 403 = scope request.** Distinguishes expired tokens (silent refresh via `clearCachedAccessToken` + `getTokens`) from missing permissions (user-facing `addScopes` consent sheet). Prevents confusing consent popups on routine hourly token expiry.
- **Firestore rules published on day one.** `users/{uid}` locked to `request.auth.uid == uid`. No test-mode window exposed to real users.
- **Auth hydration via `onAuthStateChanged` in screens.** Screens depending on auth state subscribe to auth changes instead of reading the synchronous `getCurrentUser()` — which can return null briefly on cold start while Firebase hydrates from persistence.

### Audit Gate
- [x] Triple audit (Codex + Claude + Gemini) on Session 30 scope — 2 P1 (cache leak on sign-out, Firestore test-mode rules) + 6 P2 (UTC query window, 401 token refresh, duplicate fetch regression on CalendarScreen, auth hydration race, duplicate React keys for multi-day events, dead `calendarColor` field) + several P3. **All P1 + P2 fixed.** The P1 rules concern was fixed by publishing real rules before shipping; the P1 cache leak was fixed by wiring `clearCalendarCache()` into both `signInWithGoogle` and `signOutGoogle`.
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 17 suites, 379 tests passing (adds `firebaseAuth`, `firestore`, `googleCalendar` to the suite)
- [ ] Version bump — deferred until Settings redesign lands alongside this work

---

## PHASE 5.5 — PREMIUM FOUNDATION ✅ COMPLETE

**Shipped in:** v1.21.0 (versionCode 39) — foundation dormant (no user-facing billing UI until P7).
**Branch:** `dev`
**New deps:** `expo-iap@^4.0.2`
**Build cost:** 1 production build + 1 internal testing AAB (same binary; internal track upload was the prerequisite Google requires before in-app products can be created).

### Tasks

- [x] **5.5.1 Entitlement storage** ✅ Session 29. `src/services/proStatus.ts` — synchronous service reading/writing `kv_store['pro_status']`. Exports `isProUser()`, `getProDetails()`, `setProStatus(details)`, `clearProStatus()`. Uses `safeParse` + `isValidProDetails` type guard so malformed/partial JSON can't fake entitlement. `ProDetails` shape: `{ purchased, productId, purchaseDate, purchaseToken? }`.
- [x] **5.5.2 Install expo-iap** ✅ Session 29. `expo-iap@^4.0.2` — Expo module for Google Play Billing 8.x. Native dep = requires dev build. Added to `app.json` plugins array. Google Play in-app product **`dfw_pro_unlock`** created: **$1.99, one-time (non-consumable), active.** License testing configured via Google Play Console license testers for purchase-without-charge validation. Internal testing track AAB upload (vCode 39) was a prerequisite to unlock product creation in the Play Console.
- [x] **5.5.3 ProGate component** ✅ Session 29. `src/components/ProGate.tsx` — pass-through wrapper accepting `{ feature: string, children: ReactNode }`. Renders children unconditionally. **Screen wrapping deferred to P7** — see Decisions doc for rationale (no value placing transparent wrappers across 8-10 files when the locked-state UI lives in P7).
- [x] **5.5.4 useEntitlement() hook** ✅ Session 29. `src/hooks/useEntitlement.ts` — wraps expo-iap's `useIAP`. Exposes `{ isPro, loading, error, productPrice, purchase, restore }`. Handles: local-cache init via `isProUser()`, product fetch via `fetchProducts` with `.catch()`, price extraction via `product.displayPrice`, purchase flow via `requestPurchase` with 60s timeout fallback, real restore flow via `restorePurchases` + `availablePurchases` scan with automatic `finishTransaction` acknowledgement (critical — unacknowledged Android purchases auto-refund after 3 days), AppState-less cleanup via `useRef` timeout cleared in unmount effect, user-cancel detection via both `ErrorCode.UserCancelled` (async path) and the legacy `E_USER_CANCELLED` + `message.includes('cancel')` fallback (sync path).
- [x] **5.5.5 Backup entitlement flag** ✅ Session 29 (covered for free). The .dfw backup archives the entire `kv_store` table via the existing `dfw.db` SQLite snapshot path in `backupRestore.ts`. `pro_status` is a standard kv key, so it survives backup/restore round-trips without any backup-side code changes. No manifest field addition needed.
- [x] **5.5.6 License testing setup** ✅ Session 29. Google Play Console license testers configured under the Bald Guy & Company Games account. Test purchases bypass real charges, allow full purchase + restore + refund cycles against the production `dfw_pro_unlock` SKU.
- [x] **5.5.7 Jest tests** ✅ Session 29. `__tests__/proStatus.test.ts` — 18 tests covering `isProUser` / `getProDetails` / `setProStatus` / `clearProStatus` + a full shape-validation describe block (empty object, partial object, wrong-type fields, JSON `null`, JSON string, JSON number coercion). Same `Map`-backed kv mock pattern as `settings.test.ts`. Full suite 14 suites / 338 tests passing.
- [x] **5.5.8 Emoji picker overhaul** ✅ Shipped early in Session 16. 11 categories, 105 labeled emojis.

### Audit Gate
- [x] Secondary (Claude) audit on all four P5.5 files — 1 P1 (non-functional restore) + 3 P2 (unhandled fetchProducts rejection, stuck loading timeout, unvalidated `as ProDetails` cast) + 6 P3 (import path, safeParse usage, product lookup field, test coverage, STORAGE_KEY duplication, unused prop). All findings fixed.
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 14 suites, 338 tests passing
- [x] Version bump v1.20.0 → v1.21.0, versionCode 37 → 39 (38 was the first Session 29 build before the Premium Foundation work landed)

### P5.5 Design Notes
- **Dormant by design.** Every P5.5 artifact ships but is inert until P7. `isProUser()` is never read by any screen. `useEntitlement()` is never mounted. `ProGate` renders children unconditionally. Purpose is to have the billing plumbing settled and in production before any user can be charged — so P7 is UI work, not plumbing + UI work under time pressure.
- **Non-consumable.** `isConsumable: false` in `finishTransaction()` — a lifetime unlock should never be consumed. Acknowledgement still required within 3 days or Google auto-refunds; `useEntitlement` handles this in both the new-purchase path (onPurchaseSuccess → finishTransaction) and the restore path (availablePurchases effect → finishTransaction with swallow-on-error catch).
- **Single SKU.** `'dfw_pro_unlock'` is the only product — one toggle between Free and Pro. No tiers, no subscriptions, no upgrade paths to reason about.

---

## PHASE 6 — CHESS + CHECKERS + BLUNDER ROAST ✅ COMPLETE

**Shipped in:** v1.13.0 (Chess) + v1.14.0 (Checkers + scoring overhaul)
**Branch:** `dev`
**New deps:** `chess.js` (JS only)
**Build cost:** 2 production builds

### Tasks

- [x] **6.1 Chess vs CPU** ✅ Session 16. chess.js, 5 difficulty levels, custom AI-generated Staunton piece PNGs, Memory Score integrated. Iterative-deepening minimax with alpha-beta, MVV-LVA move ordering, quiescence search, time-budgeted search (300ms → 5s per difficulty). Full hook (useChess.ts) + screen (ChessScreen.tsx). Game state persists to SQLite across app close.
- [x] **6.1.1 Chess engine upgrades** ✅ Session 17. Opening book (104 hardcoded positions, 6-10 plies of theory), transposition table (100K FEN-keyed entries with mate-score ply adjustment), killer-move heuristic, null-move pruning, min-depth + max-time difficulty model with 3× safety deadline, tapered evaluation (continuous material-phase blending), passed-pawn bonus (rank-scaled + endgame-scaled), rook on open/semi-open file. 2 audit rounds completed (6 findings, all fixed). 69 chessAI tests (232 total across the suite) passing.
- [x] **6.2 Blunder Roast (text)** ✅ Session 16. 5 severity tiers + take-back pool, 58 roast lines, analyzeMove runs depth-2 shallow check per player move, fires toast with fade in/out. Voice clips deferred to P6.5.
- [x] **6.3 Checkers vs CPU** ✅ Session 18. Pure JS engine (no external deps), 5 difficulty levels (deeper than chess — lower branching factor), American rules (forced capture, turn ends on promotion), minimax with alpha-beta + TT + killers + IDS. checkersAI.ts, checkersStorage.ts, checkersAssets.ts, useCheckers.ts, CheckersScreen.tsx. 52 tests. 2 audit rounds (Codex + Gemini), 3 bug fixes. No blunder roasts, no take-back.
- [x] **6.4 Memory Score Expansion** ✅ Sessions 16+18. Chess: 5/8/12/18/25 pts per win by difficulty, half for draw. Checkers: same point scale. Max score 140 (7 games × 20). Rank thresholds scaled. Chess + checkers breakdown bars and detailed stat sections added to MemoryScoreScreen.

### Chess Design (shipped in Session 16)
- 5 difficulty levels: Beginner (300ms), Casual (500ms), Intermediate (1s), Advanced (2s), Expert (5s)
- Time-limited iterative deepening — AI searches as deep as it can within budget, gracefully falls back to best move from previous completed depth
- Quiescence search at depth 0 prevents horizon-effect blunders (AI no longer stops mid-capture thinking it's up material)
- Evaluation: material + PST + mobility (3cp/move) + bishop pair (50cp) + doubled/isolated pawns + king safety pawn shield
- One take-back per game, dedicated roast pool
- Player chooses color (w/b) and difficulty before each game
- Custom AI-generated Staunton piece assets (ChatGPT) — 12 PNGs, replaced with 12 anthropomorphic WebP pieces in Session 21

### Checkers Design (shipped in Session 18)
- 5 difficulty levels: Beginner (500ms/depth 4), Casual (800ms/6), Intermediate (1.5s/8), Advanced (3s/10), Expert (5s/14)
- American rules only (forced captures, turn ends on promotion). Freestyle mode built and removed (scope creep).
- Pure material + positional evaluation (no generateMoves in eval — critical perf fix from audit)
- Mate scores include ply penalty for TT consistency
- No blunder roasts, no take-back (simpler than chess)
- Checker piece PNGs (red, red-king, black, black-king) + weathered wood table background (WebP)

### Scoring System (Session 18 overhaul)
- Removed blunder penalty from chess scoring (recordChessResult lost blunderCount param)
- Score max: 140 (7 games × 20), up from 100 (5 games × 20)
- Rank thresholds in memoryRanks.ts scaled to 0–140
- Chess + checkers detailed stat sections added to MemoryScoreScreen
- Missing chess breakdown bar bug fixed

### UI Cleanup (Session 18)
- Emojis removed from SudokuScreen and DailyRiddleScreen headers
- GamesScreen reordered: Daily Riddle first (daily engagement hook), then Chess, Checkers, Trivia, Sudoku, Memory Match, Trophies
- MemoryScoreScreen breakdown bars and detail sections reordered to match

### Audit Gate
- [x] **Session 16 Audit Round 1 (Codex)** — findings fixed (see DFW-Bug-History.md)
- [x] **Session 16 Audit Round 2 (Gemini)** — findings fixed
- [x] **Session 17 Audit Round 1 (Codex + Gemini)** — 6 findings (min-depth guarantee, en-passant flag, killer scores, TT key, mate-score TT, unbounded min-depth) — all fixed
- [x] **Session 18 Checkers Audit Round 1 (Codex + Gemini)** — 3 findings (evaluateBoard perf, mate ply penalty, AI null game-over) — all fixed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 52 checkers tests + 69 chess tests + existing suites passing
- [x] v1.14.0 (versionCode 31)

---

## SESSION 21 — CHESS OVERHAUL + CUSTOM FONTS (v1.16.0)

**Shipped in:** v1.16.0 (versionCode 33)
**Branch:** `dev`
**New deps:** `expo-font`, `expo-splash-screen`, `@expo-google-fonts/satisfy`, `@expo-google-fonts/lilita-one`
**Build cost:** 1 production build

### Chess Features
- [x] Post-game move review — FEN history tracked per move, step-through with « ‹ › » controls, non-interactive review board, "Review Game" button on game-over overlay
- [x] Check/checkmate indication — red king square, pulsing "CHECK!" text, red board border, hapticHeavy on check, hapticError (notification error pattern) on checkmate
- [x] Turn indicator — pulsing "Your Move" text (accent color, fontSize 20), accent board border when player's turn
- [x] Training mode — threatened pieces highlighted red, AI's last move highlighted gold, toggle in pre-game screen for difficulty 0-2, training games don't record results
- [x] Haptic tiers — light tap on player's turn (suppressed during check), heavy impact on check, long error vibration on checkmate
- [x] hapticError() function added to haptics.ts

### Art
- [x] 12 anthropomorphic chess pieces replacing stock PNGs — cream/gold (white) + charcoal/silver (black), thick outlines, personality per piece type (tired pawn, smug knight, judgmental bishop, etc.)
- [x] 3 calendar empty state illustrations — hammock (day), beach chair (week), couch (month) replacing emoji
- [x] Calendar chrome icon refresh — grid-based calendar replacing "15" number icon
- [x] Plus icon sizes increased across 8 files (FABs 28→34, inline 18→22, etc.)
- [x] NoteEditorModal color picker + circles aligned to match sibling dot sizes

### Fonts
- [x] Satisfy — app title "Don't Forget Why" on HomeScreen
- [x] Lilita One — game screen headers (GamesScreen, Chess, Checkers, Sudoku, Trivia, MemoryMatch, GuessWhy, DailyRiddle)
- [x] Nunito — core screen headers (AlarmList, Reminders, Timer, Notes, VoiceMemos, Calendar, Settings)
- [x] Font loading with expo-font + expo-splash-screen, error fallback to system fonts
- [x] Phase 2: Montserrat Alternates applied to all body text, labels, buttons, descriptions (Session 22)

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 3 rounds
- [x] Round 1 (chess features): P1 isInCheck false on checkmate, duplicate FEN on resign, double haptic. P2 review captures, CHECK! priority. All fixed.
- [x] Round 2 (polish): accessibility on review squares, live regions on CHECK!/Your Move, "Move 0"→"Start", threatened/lastMove in labels, training data persist through game-over. All fixed.
- [x] Round 3 (production): P1 font loading hang, P2 double AI delay, P2 accessibility on color picker buttons, P3 console.log cleanup. All fixed.
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 9 suites, 283 tests passing

---

## SESSION 22 — FONT ROLLOUT + HOOK EXTRACTIONS (v1.17.0)

**Version:** v1.17.0 (versionCode 34)
**Branch:** `dev`
**New deps:** `@expo-google-fonts/montserrat-alternates` (replaced `@expo-google-fonts/nunito`)
**Build cost:** 0 (no native changes — font swap is JS-only)

### File Cleanup
- [x] NoteEditorModal extraction — linkedText.tsx (link detection), NoteVoiceMemo.tsx (recording/playback cards), ColorPickerModal.tsx (reusable color picker)
- [x] SudokuScreen → useSudoku.ts hook (1232 → 753 lines)
- [x] TimerScreen → useTimerScreen.ts hook (1270 → 728 lines)
- [x] DailyRiddleScreen → useDailyRiddle.ts hook (1201 → 983 lines)
- [x] SettingsScreen → useSettings.ts hook (1054 → 673 lines), background picker deduplicated, handleSendFeedback extracted

### Font Rollout
- [x] Phase 2 Part 1: fontFamily applied to all 25 screen files + buttonStyles.ts (fontWeight replaced with fontFamily throughout)
- [x] Phase 2 Part 2: fontFamily applied to all 16 component/modal files
- [x] Font swap: Nunito → Montserrat Alternates (wider, more premium feel)
- [x] Font size reduction pass: 28+ → -2, 16-27 → -2, 13-15 → -1, 12 and below unchanged
- [x] Three-tier font system complete: Satisfy (app title), LilitaOne (game headers), Montserrat Alternates (everything else)

### Visual / Store
- [x] HomeScreen Quick Capture: removed section title and icons, renamed to Quick Note / Quick Record / Quick Timer
- [x] Splash screen backgroundColor → #121220 (dark, eliminates white flash)
- [x] Play Store refresh: 8 new screenshots, updated description (Chess, backup section, corrected theme count to 6)

### Audit Gate
- [x] Dual audit (Codex + Gemini) — 11 findings, all fixed
- [x] Dead solutionGrid state, ColorPickerModal stale ref, dead MemoCard uri prop, fontWeight leftovers, dead styles, stale comments, unused dependency
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 9 suites, 283 tests passing

---

## SESSION 24 — FULL CODEBASE AUDIT SWEEP

**Version:** v1.18.0 (no bump — audit sits on `dev` unshipped)
**Branch:** `dev`
**Build cost:** 0 (no new native deps)
**Commits:** `3e94a28` audit work, `3ae389f` FINAL prompt (reverted by `1991813`), `4820f36` revert cleanup keeping audit intact

### Audit Categories (8)

- [x] **Dead code** — Removed `src/utils/alarmSounds.ts` (dead file), 26 dead icon exports from `Icons.tsx`, orphaned `StyleSheet.create` entries across 13 screens/components, unused imports + locals across 14 files, unexported dead exports across 27 files
- [x] **Theme compliance** — Added `success: string` and `overlaySecondary: string` tokens to `ThemeColors` interface and all 6 themes, fixed 5 light-theme broken screens (text/chrome invisible on card surfaces), hardcoded hex cleanup across 15+ files, capsule pill opacity fix
- [x] **Accessibility** — Foundation layer (`BackButton`/`HomeButton` hitSlop + accessibilityLabel/Role), critical screens (AlarmFire, VoiceRecord, Timer, VoiceMemoDetail), card components, modal dialogs, form screens, game screens, complex components, live regions (accessibilityLiveRegion="polite")
- [x] **Performance** — `removeClippedSubviews`, `windowSize={5}`, `maxToRenderPerBatch={8}`, `initialNumToRender={8}` on all FlatLists. `React.memo` wraps on `NoteCard`, `DeletedNoteCard`, `AlarmCard`, `DeletedAlarmCard`, other list items. `useCallback` stabilization in hooks and list screens to prevent memo bailout
- [x] **Data safety** — `restoreInProgress` mutex flag in backup service, notification cancellation timing fixes, per-row try/catch in migrations (bad row can't tank the whole migration), new `safeParse<T>` + `safeParseArray<T>` utility (src/utils/safeParse.ts), new `withLock` per-key async mutex (src/utils/asyncMutex.ts) wired across 13 storage files, `autoExportBackup` must never throw (background operation)
- [x] **Navigation guards** — `beforeRemove` guards on `CreateAlarmScreen` + `CreateReminderScreen` with `savedRef` bypass pattern (save-then-navigate doesn't trip the guard), `VoiceRecordScreen` confirmation dialog, game screens intercept hardware back, `HomeButton` uses `popToTop()` so guards fire, deep-link paths validate target exists before navigating, note pending TTL, NoteEditor widget protection
- [x] **Type safety** — Migration entity types, storage validation, alarm form non-null fixes, `useSudoku` validation, hook return types
- [~] **UI patterns** — `GameNavButtons.tsx` component created (game-style back/home pair using character icon set) + emoji-chrome sweep plan. **Both reverted in FINAL cleanup.** File remains on disk but references non-exported `APP_ICONS.gameBack`/`gameHome` — stranded.

### Visual Fixes (applied separately, post-audit)
- [x] **FAB chrome circle** — All 4 list screens (`AlarmListScreen`, `NotepadScreen`, `ReminderScreen`, `VoiceMemoListScreen`) now use the same chrome circle pattern as `BackButton`/`HomeButton` (theme-aware `rgba(30, 30, 40, 0.8)` dark fill + 1px white-rgba border). Elevation + shadow removed (fixed the Android hex hole bug). Plus icon renders without `tintColor` so natural silver webp shows through
- [x] **NoteCard silver fallback** — `NoteCard.tsx` + `DeletedNoteCard.tsx` now render `APP_ICONS.notepad` (22×22 natural silver) when `note.icon` is empty, instead of the `📝` emoji fallback

### Stranded Work (reverted, not yet deleted)
- [ ] **Prompt 4 deferred (Session 27)** — VoiceMemoDetailScreen layout reorder (clips-first), bottom toolbar (Attached/Camera/Gallery), share button + per-clip share, photos in attachments panel. Prompt file written and ready.
- [x] **GameNavButtons component** — ✅ Resolved (Session 25). Wired, exported from `appIconAssets.ts`, used by `DailyRiddleScreen`.
- [x] **Game icon exports** — ✅ Resolved (Session 25). All 8 character icons exported in `appIconAssets.ts` (hourglass, pencil, erase, chevronLeft, chevronRight, gameBack, gameHome, smiley).
- [x] **Chrome icon exports** — ✅ Partially resolved (Session 25). `checkmark.webp` exported. `lock.webp` intentionally held back — ships when PIN system ships (see DFW-Decisions.md).
- [x] **Trivia + Sudoku game sounds** — ✅ Resolved (Session 25). All 5 sounds registered in `gameSounds.ts` with volumes: `sudokuPencil`, `sudokuErase`, `triviaTap`, `triviaCorrect`, `triviaWrong`.
- [x] **audioCompat.ts adoption** — ✅ Resolved (Session 25). `PlayerWithEvents` imported and used in `gameSounds.ts`, `soundFeedback.ts`, `VoiceMemoListScreen.tsx`, `HomeScreen.tsx`, `TutorialOverlay.tsx`. No `as any` casts remain.
- [x] **VoiceMemoListScreen audio TS errors** — ✅ Resolved (Session 25). Uses `PlayerWithEvents` properly.

### Audit Gate
- [x] Dead code categorical pass
- [x] Theme compliance pass
- [x] Accessibility pass
- [x] Performance pass
- [x] Data safety pass
- [x] Navigation guards pass
- [x] Type safety pass
- [x] UI patterns pass — GameNavButtons wired (Session 25), stranded icon/sound exports resolved (Session 25)
- [x] `npx tsc --noEmit` — 0 errors (resolved by Session 25 wiring + audioCompat adoption)
- [x] `npx jest` — 520 tests passing as of Session 38
- [x] Version bump — resolved; shipped as part of v1.18.0 (Session 25)

---

## PHASE 6.5 — VOICE CONTENT EXPANSION 🟡 PARTIAL

**Status:** Opening.mp3 shipped in Session 29 (wired to HomeScreen first-mount with `kvGet` flag gate). Remaining clips deferred to post-Pro-tier — voice content is a premium surface and ships after the paywall is live.

**Build cost:** 1 production build (--clear flag for new audio assets)

### Tasks

- [x] **6.5.1 Opening.mp3 intro** — Alarm Guy clip plays once on first HomeScreen mount after onboarding, kv flag gate. Session 29.
- [ ] **6.5.2 Voice memos attachable to alarms** — hear your own voice when alarm fires — **deferred to post-P7**
- [ ] **6.5.3 More in-app roast moments** — navigation, idle, trivia/riddle — **deferred to post-P7**
- [ ] **6.5.4 Female voice character design pass** — concept only, not shipping yet

---

## PHASE 7 — PRO TIER + BILLING 🟡 CORE DONE (Session 31)

**Shipped in:** v1.23.0 (versionCode 41) — awaiting Play Store ship.
**Branch:** `dev`
**New deps:** None (all P5.5 plumbing reused)
**Build cost:** 0 dev builds (pure JS work on top of existing native surface)

### Completed

- [x] **7.1 Billing UI** — `ProGate.tsx` rewritten as a presentational paywall modal accepting entitlement values via props (no internal `useEntitlement()`). Each parent screen owns one hook instance and passes `{ isPro, loading, error, productPrice, onPurchase, onRestore }` down. SettingsScreen "DFW Pro" card with three render variants (founding user / Pro / free). Inline purchase + restore on the free-card; auto-close + win sound on purchase success when launched from a game.
- [x] **7.2 Pro gates** — Game trials at the GamesScreen level (`canPlayGame` check before navigation). Theme gating in the SettingsScreen theme picker (`PRO_THEMES = {vivid, sunset, ruby}` → tap shows lock icon and opens ProGate). Calendar sync gating in `syncToGoogleCalendar` (throws "Pro required" if non-Pro reaches the service layer).
- [x] **7.3 Founding user display** — `runFoundingMigration()` in `src/services/foundingStatus.ts` runs on first launch. Existing users (detected via `kvGet('onboardingComplete') === 'true'`) get auto-granted Pro with `productId: 'founding_user'` AND a `founding_status` kv entry. Settings shows a dedicated "Founding User" card with the founding badge for these users. Idempotent — `founding_check_done` flag prevents re-runs.
- [x] **7.6 Game trial system** — `gameTrialStorage.ts` — 3 free rounds per game across Chess, Checkers, Trivia, Sudoku, Memory Match. Counter incremented on game launch (only for non-Pro users), trial-remaining badge rendered on each game card. Pro users see a "PRO" badge instead. Once trials are used up, tapping the game opens the ProGate paywall modal.
- [x] **Google Calendar write-back (P5 extension)** — `calendarSync.ts` — Pro-gated manual sync that creates a dedicated "Don't Forget Why" calendar in the user's Google account, pushes active alarms + reminders as events with a stable `gcal_sync_map` (item id → event id) preventing duplicates on re-sync. Recurring alarms use `RRULE:FREQ=WEEKLY;BYDAY=...` with a stable DTSTART derived from `alarm.createdAt`. 401 → token refresh, 403 → re-request `calendar` write scope. Delete failures preserve the mapping so retries are idempotent. Sync map intentionally preserved on sign-out so re-signing the same account doesn't dupe events.

### Remaining (Deferred)

- [ ] **7.4 Android compliance** — edge-to-edge (Android 15), orientation (Android 16)
- [ ] **7.5 Reminder fire → Guess Why** — reminders through AlarmFireScreen
- [ ] **7.6.1 Master difficulty (chess)** — Pro-gated. ~15-20s think time, min-depth 8-10
- [ ] **7.7 Master difficulty (checkers)** — Pro-gated. ~10-15s think time, min-depth 10-12

### Audit Gate

- [x] Triple audit (Codex + Claude + Gemini) on Session 31 scope — **3 P1 + 13 P2** found, all fixed
  - **P1 — Double `useEntitlement()` on SettingsScreen** (Codex). ProGate originally owned its own `useEntitlement()` hook AND was rendered unconditionally inside SettingsScreen which already owned one — two IAP hook instances meant `finishTransaction()` would fire twice on purchase success. Fixed by (a) conditionally mounting ProGate (`{proGateVisible && <ProGate.../>}`) on both SettingsScreen and GamesScreen and (b) refactoring ProGate to accept entitlement values as props instead of calling `useEntitlement()` internally. Each screen now owns exactly one hook instance.
  - **P1 — `deleteEvent()` ignored HTTP failures** (Codex). The original `deleteEvent` awaited `authedFetch` but never inspected the response, then `syncItem` removed the mapping unconditionally — a 500 response would drop the mapping and the next sync would create a duplicate event. Fixed: `deleteEvent` throws on non-2xx/non-404 (404 = already gone, still success); `syncItem` only deletes the map entry on success and counts an error otherwise so retries stay idempotent.
  - **P1 — Founding badge skipped for already-Pro users** (Claude). Original migration short-circuited with `if (isProUser()) return` before writing `founding_status`, so any user who somehow already had Pro never got the founding badge. Fixed: removed the early return, restructured to always write the founding badge for any onboarded user; `setProStatus` is still gated on `!isProUser()` to avoid double-grant. Added strict `kvGet(ONBOARDING_KEY) === 'true'` check (a corrupted value like `'false'` or `'yes'` no longer grants Pro).
  - **P2 (13 total)** — context-aware ProGate headers (game vs generic), outer `TouchableWithoutFeedback` accessibility removed, `gameWin` sound gated on `game` prop, `incrementTrial` gated on `!isPro`, restore loading + result feedback on the Settings restore row, `purchaseError` rendered in the Support section (visible to Pro and founding users), `calSyncEnabled` refreshed on auth state change, `setTimeout` cleanup with `useRef` in `useSettings`, 403 handling in `authedFetch`, stable DTSTART for recurring alarms, circular dep `firebaseAuth ↔ calendarSync` broken (firebaseAuth now uses direct `kvRemove` for sync state cleanup, sync map preserved), `runFoundingMigration` in its own try/catch in `App.tsx` (success and recovery paths), strict ONBOARDING_KEY equality. All fixed.
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx jest` — 20 suites, 435 tests passing (adds `gameTrialStorage`, `foundingStatus`, `calendarSync` test suites)
- [x] Version bump v1.22.0 → v1.23.0, versionCode 40 → 41

---

## PHASE 8 — FIREBASE ONLINE + SOCIAL

**Version Target:** v2.0.0+ (Cloud Checkers shipped Session 32 — first Functions deploy)
**Backend:** Firestore + Cloud Functions (Auth already active from P5)

### Tasks

- [x] **Cloud Checkers AI** (Session 32) — Firebase Cloud Function (`checkersai-kte3lby5vq-uc.a.run.app`) runs the same TypeScript checkers engine with deeper search params (maxDepth 20, timeLimit 6s). Returns top-5 ranked moves; client picks from a difficulty-specific `cloudPickRange` band and falls back to local engine on any failure. Free for everyone (like cloud chess).
- [x] Activate Firestore (Session 30)
- [x] Online trivia via OpenTDB (Session 31) — all 8 parent categories mapped to category IDs (Session 32 expansion), free for everyone, offline bank fallback
- [ ] Online riddles (unlimited for Pro) — Bonus Riddles tab Pro-gated
- [ ] Global leaderboards (anonymous)
- [x] **Multiplayer chess** (Session 39) — `multiplayer.ts` service + `useMultiplayerChess` hook + `MultiplayerChessGame` inner component. Create/join via 6-char codes. Real-time via Firestore `onSnapshot`. Draw offer, break request, resign, DFW-personality exit guard.
- [x] **Multiplayer checkers** (Session 39) — same architecture as chess, shares `multiplayer.ts` service.
- [x] **Multiplayer trivia** (Session 39) — `multiplayerTrivia.ts` service + `useMultiplayerTrivia` hook + `MultiplayerTriviaGame` inner component. 2-4 players, lobby with host-controlled start, quiz-bowl rotation with steal mechanic, host advances questions, 15s per-question timer. Host promotion on leave so game never deadlocks.
- [x] Cloud Stockfish AI for chess (Session 31) — Lichess cloud eval API, **free for everyone** (not a Pro upgrade)
- [ ] Cloud endpoint auth (Firebase App Check) — before Pro launch. Checkers Cloud Function is currently public/unauth.

---

## BACKLOG (Not Scheduled)

Grouped by functional area so related work ships together. Within each group, items are ranked by value — highest first.

### Pre-Launch Blockers (required before Pro goes live at v2.0.0)

- **Cloud endpoint auth (Firebase App Check)** — Checkers Cloud Function at `checkersai-kte3lby5vq-uc.a.run.app` is currently public/unauth. Must be locked down before Pro launch exposes billing surfaces.
- **OAuth consent screen verification** — Required if/when Google Sign-In moves past `calendar.readonly` + `calendar` write scope combo. Currently unverified (shows warning).

### Games (Chess, Checkers, Sudoku, Trivia, Memory Match, Daily Riddle, Guess Why)

- **Online Checkers difficulty tuning** — cloudPickRange bands calibrated from chess values; retest after play data accumulates and adjust.
- **Board memoization** — Sudoku 81-cell rebuild on every render, Chess/Checkers 64-cell rebuild. Prompts written, not applied (scope + risk of breaking stable game UX).
- **DailyRiddleScreen emoji → custom art pass** — category emoji, button label emoji.
- **SudokuScreen emoji → custom art pass** — win emoji, hint button, new game button.
- **That One Dice Game** — different name, same mechanic. Post-2.0.
- **Global leaderboards (anonymous)** — post-2.0.
- **Guess Why Personal Edition** — concept only.

### Alarms, Reminders & Timer

- **Timer notification buttons** — "Go Away" + "Start me?" actions on timer notifications.
- **Trivia/riddle wake-up mode** — alarm fires a trivia question or riddle to dismiss.
- **Expanded alarm icon picker** — more icon options beyond the current emoji set.
- **PIN system** — for private alarms/reminders. Ships with `lock.webp` chrome icon (on disk, intentionally unexported until PIN is real).
- **Pin toggle inside edit/detail screens** — widget pin management from within the item editor.

### Voice & Audio

- **Voice memos attachable to alarms** (P6.5.2) — hear your own voice when alarm fires.
- **More in-app roast moments** (P6.5.3) — navigation, idle, trivia/riddle voice clips.
- **Female voice character design pass** (P6.5.4) — concept only, not shipping yet.
- **VoiceMemoDetailScreen layout rewrite** (Prompt 4, Session 24) — clips-first layout, bottom toolbar (Attached/Camera/Gallery), share button + per-clip share, photos in attachments panel. Prompt file written and ready.

### Visual & Theme

- **Theme-responsive icon colors** — icons adapt tint to active theme.
- **Timer preset emoji → icon conversion** — design decision pending (what icon language for presets?).
- **DrawingCanvas dark rgba values** — hardcoded rgba values in drawing tool.
- **Trivia chrome art completion** — 5 of 8+ parent categories have dedicated chrome assets in `assets/chrome-game/trivia/`; remaining categories fall back to anthropomorphic art under chrome mode. `trivia.phone` and `trivia.puzzle` reuse `icon-lightbulb` under mixed/toon until bespoke art is produced.
- **Dual-theme art refinement pass** — mixed/chrome/anthropomorphic assets are visually consistent enough to ship dormant, but a follow-up pass is planned to align stroke weight, palette, and glyph scale across the three registries.

### Widgets

- **Widget emoji cleanup** — needs a new ImageWidget wrapper before emoji can be fully swept from widget layouts.

### Architecture & Refactoring

- **ReminderCard extraction** — inline cards in ReminderScreen should move to a component (noted by auditors).
- **DrawingCanvas render-tick refactor** — audited, prompt written, not applied.

### Personality & Brand

- **Dual brand identity** — Personality Mode / Clean Mode — concept only.

### Calendar

- **Add holidays to calendar** — holiday data for CalendarScreen.

### Platform & Store

- **iOS port (P9+)** — future platform expansion.
- **Optional AES-256 backup encryption** — passphrase-protected .dfw files.
- **App size audit** — measure and optimize bundle size.
- **Widget preview screenshots** — Play Store marketing assets.

### Recurring

- **Daily Riddle scoring design review** — periodic review of scoring balance.

---

## PRO vs FREE BREAKDOWN

See `DFW-Features.md` §Pro Tier for the canonical tier breakdown (what's Pro-gated, what's free forever, founding user details). This roadmap no longer duplicates that content to prevent drift.

---

## CREDIT BUDGET

| Phase | Dev Builds | Prod Builds | Est. Credits |
|-------|-----------|-------------|-------------|
| ~~P4.5 Stability~~ | ~~0~~ | ~~1~~ | ✅ Done |
| P5 Calendar | 1 | 1 | ~2 |
| P5.5 Premium | 1 | 1 | ~2 |
| P6 Games | 0 | 1 | ~1 |
| P6.5 Voice | 0 | 1 | ~1 |
| P7 Pro Tier | 0 | 2 | ~2 |
| P8 Firebase | 0 | 1+ | ~1+ |
| **Total** | **2** | **8+** | **~10–12** |

---

## STANDING RULES

- `react-native-worklets` managed by Expo — no manual pinning
- `npm install` from PowerShell after every WSL package install
- `npx tsc --noEmit` before every production build — 0 errors
- `npx jest` before every production build — all tests pass
- Increment version + versionCode before every production build
- Dual audit (Codex + Gemini) before every ship
- Don't ship dead features
- Build with `--clear` when new assets added
- Always include Jest tests for new services/features
- Backups: desktop (primary) + GitHub + USB. Laptop no longer used for coding (WSL freezes) — kept as passive git backup and voice/image workstation only.
- Never put repos in OneDrive

### Git Rules

- `main` is a milestone checkpoint. Merge `dev` → `main` when a body of work is complete and stable, not every build.
- Tag releases on `dev` (version bumps + versionCode bumps live on `dev`).
- All day-to-day work happens on `dev`.

---

## 6 THEMES

| Theme | Mode | Accent | Vibe |
|-------|------|--------|------|
| Dark | dark | #5B9EE6 | Blue daily driver |
| Light | light | #2563EB | Blue-tinted ocean |
| High Contrast | dark | #00D4FF | Cyan accessibility |
| Vivid | dark | #00FF88 | Cyberpunk terminal |
| Sunset | light | #E8690A | Orange/amber warmth |
| Ruby | light | #E11D48 | Red/rose bold |

---

## CHANGE LOG

| Date | Change |
|------|--------|
| Apr 14 | Session 29: **Timer preset WebP icons + Opening.mp3 + P5.5 Premium Foundation shipped.** Timer presets: 21 built-in presets now render custom WebP art via new `timerPresetAssets.ts` registry (user-created timers still use emoji). 2 new presets added: Crying (2700s / 45min) and Revenge (14400s / 4hr). Opening.mp3 wired to HomeScreen: plays once on first mount after onboarding, gated behind a `kvGet`/`kvSet` flag so it never replays (duplicate playback from OnboardingScreen removed during wiring). 4 audit fixes: AppState background listener (pause audio when app backgrounds), dead code removal, double-lookup collapse on TimerScreen preset rendering, a11y pass on new icons. **P5.5 Premium Foundation COMPLETE** — `expo-iap@^4.0.2` installed (Play Billing 8.x, Expo-native, TypeScript-first); Google Play in-app product `dfw_pro_unlock` created ($1.99, one-time, non-consumable, active); license testers configured; `src/services/proStatus.ts` (sync kv-backed entitlement cache with safeParse + `isValidProDetails` type guard); `src/hooks/useEntitlement.ts` (wraps `useIAP`, real restore flow, 60s purchase timeout, cancel handling, unmount cleanup); `src/components/ProGate.tsx` (pass-through until P7); `__tests__/proStatus.test.ts` (18 tests, full shape validation). Foundation ships dormant — no billing UI until P7. Secondary (Claude) audit on P5.5 found 1 P1 (non-functional restore) + 3 P2 + 6 P3, all fixed. Backup entitlement covered for free (pro_status is a standard kv key, already part of dfw.db backup archive). Internal testing AAB uploaded alongside production AAB (vCode 39) — internal track upload was the prerequisite Google requires before in-app products can be created in Play Console. **v1.21.0 (versionCode 39), live on Play Store.** |
| Apr 14 | Session 30: **Firebase backend (P8 foundation) + Google Calendar sync (P5) shipped.** Firebase project `dont-forget-why` on Blaze plan ($300 credit, 90-day clock started April 14, expires July 14, 2026). Firebase Auth with Google Sign-In — connect/disconnect in SettingsScreen Google Account card, Firestore user profile on sign-in (fire-and-forget with shape validation). Firestore service layer (`firestore.ts`) with typed CRUD, `isUserProfile` type guard, `set()` with `{ merge: true }`, first-write-only `createdAt` guard. Google Calendar sync via REST API (no SDK, no extra native dep) — fetches events with Bearer token, 5-minute in-memory cache keyed by uid + date range, events render as `sectionCalendar` dots on CalendarScreen + items in HomeScreen Today section, new `google` filter type added on CalendarScreen, event cards ship with "G" badge + "All Day" label handling. CalendarScreen legend wrapped to fit 5 dot types. Google Calendar API enabled in Google Cloud Console. Triple audit (Codex + Claude + Gemini): 2 P1 (cache leak on sign-out, Firestore test-mode rules) + 6 P2 (UTC timezone query window, 401 token refresh vs 403 scope request, duplicate fetch regression on month navigation, auth hydration race on cold start, duplicate React keys for multi-day Google events, dead `calendarColor` field). All P1 + P2 fixed — cache cleared on sign-in/out, Firestore rules published locking `users/{uid}` to `request.auth.uid`, local-TZ-aware query window via `toISOString`, 401 → `clearCachedAccessToken` + refresh + retry, 403 → `addScopes` + retry, Google fetch moved to dedicated `useEffect([currentMonth, authUser])` so month nav doesn't reload local data, screens now subscribe to `onAuthStateChanged` so cold-start auth hydration refreshes Google events, row keys now include `dateStr` prefix for `googleCal` events. Project Instructions updated with Claude Code Prompt Standards (verification loops, @ references, think levels, prompt structure templates). `npx tsc --noEmit` clean, 379 tests across 17 suites passing. **No version bump this session — Session 30 code sits on `dev` until the Settings redesign session lands and a single bump ships both.** SettingsScreen redesigned: 6 grouped sections (General, Appearance, Sound & Haptics, Google Account, Data, Support) with uppercase accent-colored section headers. Theme picker moved from inline 6-circle grid to compact card + bottom-sheet modal (auto-closes on selection). All functionality unchanged. Codex audit clean (1 P2 a11y + 2 P3, all fixed). |
| Apr 15 | Session 31 Phase 2: **Chess AI redesign (cloud Stockfish for all 5 levels) + online trivia + 366 yearly riddle bank.** **Chess AI:** All 5 difficulty levels (renamed Easy/Intermediate/Hard/Expert/Master) now query the Lichess cloud eval API (`multiPv=5`) as the primary move source, picking from a difficulty-specific rank band into the top-5 Stockfish PVs. Easy picks ranks 2-4 (3rd-5th best), Intermediate 1-3, Hard 0-2, Expert 0-1, Master 0 (always best). **Difficulty is now move quality, not search depth** — every cloud move is Stockfish-strong, weaker levels just pick a deliberately worse rank. New `src/services/cloudStockfish.ts` — `getCloudMove(fen, pickRange)` + `uciToSan(game, uci)` helpers, 5s `AbortController` timeout, returns null on any failure (offline, 404, malformed, abort, illegal UCI) so the caller can cleanly fall through. Priority order in `useChess.triggerAIMove`: **opening book → cloud → local minimax**. `getBookMove(c2)` runs synchronously first so the curated 104-position book preserves opening variety across levels. If no book move, `await getCloudMove(c2.fen(), level.cloudPickRange)`; post-await re-checks `sessionIdRef.current` AND `gameRef.current === c2 && !c2.isGameOver()` so a resign/newGame during the cloud request can't apply a stale move. If the cloud returns null, falls through to the Session 16/17 local engine (`getAIMove` — iterative deepening minimax with quiescence, TT, killers, null-move, tapered eval). Cloud Stockfish is **part of the free tier** — Lichess's cloud eval endpoint is a free public API, no auth, no per-user rate limits. Pro differentiation stays "unlimited rounds," not "better AI." `DifficultyLevel` interface gained `cloudPickRange: { minRank, maxRank }`. `chessStorage.rowToGame` clamps `row.difficulty` to `[0, 4]` (primary) and `useChess` restore path clamps again (belt-and-suspenders) so legacy saves with a stale index-5 Cloud-level row resolve to Master instead of crashing the `DIFFICULTY_LEVELS` lookup. **Online trivia:** `TriviaScreen.onlineMode` defaults to true and is flipped false on mount only if `checkOnlineAvailable()` reports the device is offline (HEAD request to OpenTDB). `startRound` tries `fetchOnlineQuestions(category, count, difficulty)` first whenever `onlineMode` is on and the category has an OpenTDB mapping (food + kids stay offline-only — OpenTDB has no matching category). Online rounds don't write to `seenQuestionIds` so they don't pollute the offline seen-cycle. Online failure → silent fallback to offline bank. **366 riddle bank:** Replaced Session 22's seeded-shuffle daily riddle pipeline with a pre-assigned 366-day yearly bank at `src/data/dfw_yearly_riddles.ts`. One entry per day-of-year, 12 categories × 3 difficulties. `getDailyRiddleForDate(dateStr)` in `riddles.ts` computes `dayOfYear` via UTC (`new Date(dateStr + 'T12:00:00Z')` + `Date.UTC(year, 0, 1)` + `Math.floor(ms / 86400000) + 1`) so every device in every timezone resolves the same `YYYY-MM-DD` to the same entry. No shuffle, no seed, no DST edge case (Session 22's `new Date(dateStr + 'T00:00:00')` local-time parse gave different `dayOfYear` to users in DST-observing vs non-DST timezones on the same `dateStr`). Daily card is **strictly offline** — the Session 22 `fetchMultipleOnlineRiddles(1)` override that silently swapped the daily card on focus has been removed, along with the day-scoped `daily_riddle_{todayStr}` kv cache. "Bonus Riddles" tab (formerly offline-bank browse mode) is now Pro-gated — non-Pro users see a PRO badge on the tab, tapping opens the ProGate modal; Pro users tap through to a grid that fetches fresh riddles via `fetchMultipleOnlineRiddles(5)`. `DailyRiddleScreen.handleBonusTabPress` now uses `entitlement.isPro` (not `isProUser()`) for the gate check, matching ProGate's own source of truth. `useDailyRiddle` dead state from the removed offline-bank browse cleaned up (`selectedCategory` / `searchQuery` / `expandedRiddleId` / `filteredRiddles` / `isOnlineAvailable` / `gotIt` removed from state + exports). **Phase 2 audit:** 1 P1 + 4 P2. P1 = DST non-determinism in `getDailyRiddleIndex` (fixed by the 366-bank replacement + UTC math). P2 = dead `useDailyRiddle` state cleanup, `isProUser()`/entitlement source-of-truth inconsistency in `handleBonusTabPress`, cloud eval 5s timeout vs per-level `timeLimitMs` progress bar desync (logged as known UX mismatch — cloud is reliably fast in practice), opening book bypass when cloud had the position (fixed by inverting priority to book-first). **21 test suites / 455 tests passing**, `npx tsc --noEmit` clean. New test: `__tests__/cloudStockfish.test.ts` (17 tests covering `uciToSan` + `getCloudMove` happy path + pickRange band selection + clamping + HTTP 404 + AbortError timeout + empty/missing `pvs` + malformed JSON + illegal first-PV move). |
| Apr 15 | Session 31: **P7 Pro Tier core shipped + Google Calendar write-back.** Game trial system: `gameTrialStorage.ts` (`canPlayGame`, `incrementTrial`, `getTrialRemaining`, `TRIAL_LIMIT = 3`) gates Chess/Checkers/Trivia/Sudoku/Memory Match at the GamesScreen level — 3 free rounds per game for non-Pro users, then ProGate paywall, "PRO" badge for Pro users. `incrementTrial` only fires for non-Pro (Pro doesn't accumulate meaningless kv writes). ProGate paywall modal: rewritten as a presentational component accepting entitlement values via props (`isPro`, `loading`, `error`, `productPrice`, `onPurchase`, `onRestore`) — zero internal `useEntitlement()` instances, parent screens own exactly one each. Conditional mount on both SettingsScreen and GamesScreen. Context-aware headers (3 game-flavored vs 3 generic, randomized via lazy `useState` initializer), accent color follows context (`sectionGames` for game flow, `accent` for theme/calendar flow). Win sound + auto-close on purchase success only when launched from a game. Theme gating: `PRO_THEMES = {vivid, sunset, ruby}`, `LockIcon` rendered on locked theme circles in the SettingsScreen theme picker, tap opens ProGate. `LockIcon` added to `Icons.tsx`. Founding user migration: `foundingStatus.ts` runs `runFoundingMigration()` on first launch — existing users (detected via strict `kvGet('onboardingComplete') === 'true'` check, 'false' / 'yes' don't qualify) get auto-granted Pro with `productId: 'founding_user'` AND a `founding_status` kv entry, badge always written even for already-Pro users. Idempotent via `founding_check_done` flag. Wrapped in its own try/catch in `App.tsx` on both success + recovery paths so a founding migration throw can never trigger the DB-failed error screen. Settings DFW Pro section: founding badge card / Pro card / free-user purchase card with inline `Unlock Pro — $1.99` + Restore Purchases. Restore row in Support section now has `ActivityIndicator` + result feedback ("Purchase restored!" / "No purchases found", auto-clears after 3s, disabled while loading). `purchaseError` rendered in the Support section so it's visible to Pro and founding users (not just the free card). **Google Calendar write-back (`calendarSync.ts`)**: Pro-gated manual sync. Creates a dedicated "Don't Forget Why" calendar in the user's Google account if one doesn't already exist (or reuses an existing one by summary match), pushes active alarms + reminders as events, persists a `gcal_sync_map` (item id → event id) so re-syncs PUT existing events instead of duplicating. Recurring alarms use `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR` style rules with a stable DTSTART derived from `alarm.createdAt` (deterministic for the alarm's lifetime — re-syncs don't drift the recurrence forward). `authedFetch` handles 401 (token refresh) AND 403 (re-request `calendar` write scope). Write scope `https://www.googleapis.com/auth/calendar` requested only when sync is enabled (principle of least privilege). `deleteEvent` checks status and throws on non-2xx/non-404; `syncItem` only removes the mapping on delete success and counts an error otherwise so retries stay idempotent. Sync map intentionally preserved on sign-out (`firebaseAuth.signOutGoogle` only clears `gcal_dfw_calendar_id` + `gcal_sync_enabled` via direct `kvRemove`, NOT `gcal_sync_map`) so re-signing the same Google account doesn't dupe events. SettingsScreen Google Calendar Sync card (visible only when signed in AND Pro): toggle + Sync Now button + last-sync result text. `useSettings` adds `calSyncEnabled` / `isSyncing` / `syncResult` / `syncError` state with `setTimeout` cleanup via `useRef` and refresh on auth state change. Circular dependency `firebaseAuth ↔ calendarSync` broken: `firebaseAuth` no longer imports `clearSyncData` from `calendarSync`; uses direct `kvRemove` calls instead. **Triple audit (Codex + Claude + Gemini): 3 P1 + 13 P2 found, all fixed.** P1.1 — double `useEntitlement()` on SettingsScreen would have fired `finishTransaction()` twice on purchase success (fixed via conditional mount + ProGate props refactor). P1.2 — `deleteEvent` ignored HTTP failures and dropped the sync mapping anyway, creating duplicates on next sync (fixed via status check + throw on non-2xx/non-404). P1.3 — `runFoundingMigration` short-circuited for already-Pro users so the founding badge was never written (fixed by removing the early return + restructuring; also adds strict `=== 'true'` check on onboarding key). P2 sweep: context-aware ProGate headers, outer accessibility cleanup, `gameWin` sound gated on `game` prop, trial increment skipped for Pro, restore row loading + result feedback, `purchaseError` visible to all user states, `calSyncEnabled` refreshed on auth change, `setTimeout` cleanup with `useRef`, 403 handling in `authedFetch`, stable recurring DTSTART, sync map preserved on sign-out, `runFoundingMigration` in own try/catch on success + recovery paths, strict ONBOARDING_KEY equality. **20 test suites / 435 tests passing**, `npx tsc --noEmit` clean. New tests: `gameTrialStorage.test.ts`, `foundingStatus.test.ts`, `calendarSync.test.ts` (DELETE 500 preserves mapping, DELETE 404 removes mapping, 403 retry, recurring DTSTART stability, scope-denied path). **v1.22.0 (versionCode 40) merged to `main` and tagged.** v1.23.0 (versionCode 41) prepared on `dev` for next ship. |
| Apr 16 | Session 32: **Cloud Checkers AI + Trivia overhaul + globe indicators + IAP retry.** **Cloud Checkers:** Firebase Cloud Function deployed at `checkersai-kte3lby5vq-uc.a.run.app` running `functions/src/checkersEngine.ts` (copy of local engine with deeper search defaults — maxDepth 20, timeLimit 6s). Returns top-5 ranked moves via `getTopMoves()`. Client service `cloudCheckers.ts` mirrors the `cloudStockfish.ts` pattern: connectivity check → POST → 8s `AbortController` → validate shape → pick from `cloudPickRange` band → null on any failure. `useCheckers.triggerAIMove` becomes async, cloud-first → local fallback, with session guards before and after the `await`. Local eval improved (mobility approximation, piece support, connected formation, endgame scaling, king edge penalty). `getTopMoves()` exported from `checkersAI.ts`. `DifficultyLevel` gained `cloudPickRange`. **Trivia overhaul (full):** new type system — `TriviaParentCategory` (8 values: general, popCulture, scienceTech, historyPolitics, geography, sportsLeisure, gamingGeek, mythFiction) + `TriviaSubcategory` (19 values) + `PARENT_TO_SUBS` mapping + `SUBCATEGORY_LABELS`. **1,623 questions** across 8 `triviaBank_*.ts` files + `triviaBank.ts` barrel with query helpers (`getAllQuestions`, `getQuestionsForCategory`, `getQuestionsForSubcategory`). `SubcategoryPickerModal` for multi-sub parents with live question counts + difficulty breakdowns. TriviaScreen rewired: subcategory state, modal integration, seen-question composite keys (`category` for All, `category_subcategory` for specific sub). 11 new custom DFW-style trivia icons. All 8 categories mapped to OpenTDB (food + kids remapped to general — no dead categories). Legacy `triviaQuestions.ts` deleted; `TRIVIA_CATEGORIES` moved to `triviaBank.ts`. **Globe indicators:** GamesScreen 30s connectivity polling via `checkConnectivity`, per-card globe badges (online-capable = live `isOnline` toggle, Sudoku/Memory Match = static offline, Trophies = none). TriviaScreen same pattern with top-right absolute-positioned globe. Custom DFW assets: tired wifi globe (online) + dead X globe (offline). **IAP fix:** `useEntitlement.ts` `fetchProducts` now retries with exponential backoff (1s/2s/4s) on "Billing client not ready" errors — initial attempt + 3 retries, cancelled-flag unmount safety. **Legacy cleanup:** `triviaQuestions.ts` deleted (all consumers moved to `triviaBank.ts`). **Infra:** `metro.config.js` created (`wav` asset ext, `blockList` spreads existing excludes + `/functions\/.*/` to keep Metro from bundling the Cloud Function sub-project). `firebase.json` lint predeploy removed, build-only. `functions/` is a separate Node 20 sub-project with its own `package.json` + `tsconfig.json` (firebase-admin + firebase-functions). **Triple audit (Codex + Claude + Gemini): 1 P1 + 3 P2 found, all fixed.** P1 = stale `selectedSubcategory` on category switch corrupting seen-question keys + stats (fixed by resetting to `'all'` in `handleCategoryTap` before modal opens). P2 = IAP retry off-by-one (MAX_RETRIES 3 → 4 so the 1s/2s/4s backoff actually runs three retries), metro blockList overwrite (now spreads existing excludes), globe a11y labels on inner `<View>` ignored by parent `TouchableOpacity` grouping (merged into parent `accessibilityLabel` per card). Legacy stats migration flagged but downgraded — pre-2.0 testers only, old stats silently reset on restart. **23 test suites / 491 tests passing**, `npx tsc --noEmit` clean. New tests: `cloudCheckers.test.ts` (offline/online paths, rank clamping, HTTP error, malformed response, network error, correct request body), `triviaBank.test.ts` (≥1500 total, unique IDs, no duplicate question text, valid category/subcategory/difficulty/type, answer shape, id pattern). **dev → main merged as checkpoint, no production build. Shipping at v2.0.0 bundled with Session 31 on next build.** |
| Apr 19 | Session 37: **Branch reconciliation + dead-code audit Pass 1 + Pass 2 chunk 2 (hooks).** Discovered main had diverged from dev — merge commit `88995c9` carried stale v1.23.0-era work, `v1.24.0` tag pointed at wrong commit (`4d72c0c`, versionCode 42) instead of actual ship (`0ee7100`, versionCode 43). Fixed: `git reset --hard dev` on main, force-pushed, tag deleted + recreated on `0ee7100`. **Pass 1 (cross-file dead code):** triple audit (Codex + Claude personal + Gemini) with tightened rules after initial run produced 70%+ false positives on type-position usage. Rerun with verified-dead confidence tiers. 11 findings applied across 3 commits: orphan exports in riddles data (CATEGORY_LABELS, getDailyRiddleIndex, RIDDLE_CATEGORIES preserved as comment, TOTAL_YEARLY_RIDDLES), triviaBank (getQuestionCount, getSubcategoryCount), voiceMemoFileStorage (saveVoiceMemoFile), registry key orphans (APP_ICONS.search + search.webp, MEDIA_ICONS.record + record.webp), unused import (getAlarmById in useNotificationRouting), getTextColor consolidation (NotepadWidget local → noteColors util, picks up hex validation guard). **Pass 2 chunk 1 (screens):** Codex flagged 4 items with self-contradicting verification (each admitted usage in its own notes). Claude personal + Gemini reported zero findings. Verdict: screens clean. **Pass 2 chunk 2 (hooks):** 37+ findings across 6 commits. Form hooks: 15 unused return fields trimmed from useAlarmForm + useReminderForm (raw setters replaced by high-level handlers). useDailyRiddle: 10 browse-mode fields removed (Session 31 migration residue). Game hooks: useChess dropped exitReview + aiTimeBudget/aiThinkStart plumbing (unwired progress bar, Zerenn confirmed removal) + blunderCount partial cleanup (hook + interface + storage removed, SQLite column retained as vestigial). useCheckers dropped turn/isPlayerTurn. useSudoku dropped 4 function-form helpers replaced by cellFlags. Small hooks: calendarDays, isNavigationReady return, setSilencePickerVisible, presets/setCustomModal, useNoteEditor unused params. Timer cascade: entire unreachable edit/delete pipeline removed (handleUserTimerLongPress + save variants + editingUserTimer state + orphan updateUserTimer/deleteUserTimer storage exports). **Claude Code incident:** Codex audit wrote scripts to /tmp/ during read-only audit. Prompt rules tightened: all bash must be inline, no /tmp writes. **Pass 2 chunks 3-6 queued.** 25 test suites, 520 tests passing, tsc clean. |
| Apr 19 | Session 38: **Pass 2 dead-code audit complete (chunks 3-6) + RIDDLES migration.** Finished the full codebase sweep started in Session 37, closing out Pass 1 + Pass 2 together. **Chunk 3A (storage + cloud + types, 30 files):** 10 verified-dead removals — internal shims (`saveAlarms`, `saveReminders`), orphan helpers (`disableAlarm`, `removeActiveTimer`, `resetSeenQuestions`, `deleteAllVoiceMemoFiles`, `getDrawingJsonUri`, `getAlarmById`), deprecated type fields (`Alarm.recurring`, `VoiceMemo.clips`). **Chunk 3B (utils + game logic + audio + services, 28 files):** 4 verified-dead removals — orphan internal helpers (`resetStats`, `isVoicePlaying`, `cancelAlarm`, `getCurrentTime`). **Chunk 4 (components, 36 files):** 3 findings — dead style entry (`NoteEditorTopBar.styles.icon`), 2 cosmetic export keyword drops (`CalendarWidgetProps`, `WidgetVoiceMemo`). **Chunk 5 (data + theme + nav + assets, 37 files):** 13 findings — `cardElevated` theme token (all 6 themes), full-size `destructive`/`ghost` button variants, orphan internal helpers (`promptMessages`, `getRandomPromptMessage`, `DIFFICULTY_COLORS`), 8 cosmetic export keyword drops across data files. **Chunk 6 (functions + plugins, 4 files):** 2 cosmetic export keyword drops (`CheckersMove`, `RankedMove` in `checkersEngine.ts`). **RIDDLES migration:** switched `MemoryScoreScreen` from the legacy `RIDDLES` array to `YEARLY_RIDDLES` (read via `dfw_yearly_riddles.ts` directly), deleted ~400 lines of dead riddle data from `riddles.ts` along with the dead `Riddle` / `RiddleCategory` / `RiddleDifficulty` types. **Total Pass 2 yield:** ~30+ verified-dead removals across 6 chunks, ~5% codebase reduction, zero behavior changes. **Pass 1 + Pass 2 complete — full codebase dead-code sweep finished.** 25 test suites / 520 tests passing, `npx tsc --noEmit` clean. |
| Apr 20 | Session 39: **Multiplayer shipped — chess, checkers, trivia.** Backlog cleanup: 9 stale items cleared, backlog reorganized around v2.0.0 blockers. Supporting refactors: `ReminderCard` + `DeletedReminderCard` extracted from ReminderScreen (matches Notepad pattern); `DrawingCanvas` stroke-state migrated to `useReducer` + hardcoded rgba values consolidated via `ACCENT_SHADES` lookup; timer UX polished (`delayPressIn` scroll protection on preset cards + dismiss Alert on tap-vs-long-press). **Production build smoke test passed** (v1.24.0 versionCode 43 on Play Store stays current — no new release this session). **Multiplayer chess:** `src/services/multiplayer.ts` service (shared 2-player Firestore schema — `createGame`/`joinGame`/`makeMove`/`resign`/`offerDraw`/`respondToDraw`/`requestBreak`/`respondToBreak`/`listenToGame`/`getMyGames`/`cleanupFinishedGames`), `src/hooks/useMultiplayerChess.ts` (separate from CPU `useChess.ts`), `src/components/MultiplayerChessGame.tsx` inner component. 6-char alphanumeric game codes (unambiguous charset, no O/0/I/1/L). Firestore `games` collection keyed by code. Real-time via `onSnapshot`. Draw offer, break request, resign, DFW-personality exit guard with random title + message pool. **Multiplayer checkers:** identical architecture — `useMultiplayerCheckers` + `MultiplayerCheckersGame`, shares `multiplayer.ts` service, `hostColorToPc('w'→'r', 'b'→'b')` adapter since red moves first. **Multiplayer trivia:** dedicated `multiplayerTrivia.ts` service (lobby-based, 2-4 player quiz bowl), `useMultiplayerTrivia` hook, `MultiplayerTriviaGame` component. Host-controlled lobby + start, quiz-bowl rotation with steal mechanic on wrong answers, 15s per-question timer, host-only `advanceToNextQuestion`. **Firestore rules + indexes deployed** — `users/{uid}` locked, `games/{code}` allows create by host + update by participants (or by joiners adding themselves to `players` during waiting). `firestore.indexes.json` added with composite indexes for `getMyGames`. **Triple audit (Codex + Claude personal + Gemini):** 3 P1 + 7 P2 + 20 P3 found, all P1 + P2 fixed. **P1 fixes:** trivia host-leave deadlock (leaving host promotes `remaining[0]` so `advanceToNextQuestion` keeps working); waiting/lobby exit orphans cleaned up via `isWaitingRef`/`isLobbyRef` + unmount effect that calls `endGame`/`leaveTriviaGame` when back-button fires before opponent joins; `joinGame(code, expectedType)` validates game type so entering a checkers code on the chess join screen throws instead of corrupting state. **P2 fixes:** Firestore rules tightened (non-participants can only write a waiting game if they add themselves to `players`); composite indexes for the `(players array-contains + status in + lastMoveAt desc)` query shape; "I Quit" exit path awaits `mpResign`/`leaveTriviaGame` and shows toast (Android) / Alert (iOS) on failure; `listenToGame` gained optional `onError` callback wired to `setIsConnected(false)` in all three hooks. **P3 fixes:** dead `playerColorRef` removed from both MP hooks (CPU hooks still use it); trivia haptics added (`hapticLight` on submit, `hapticMedium`/`hapticHeavy` on own answer resolution + game end, gated on `lastAnswer.uid === myUid` so opponents get sound only); `getTriviaGames` gained `.orderBy('lastMoveAt', 'desc')` to match `getMyGames`; dead `myTurn` placeholder in `TriviaScreen`; turn pill `accessibilityLiveRegion="polite"` + opponent-name-aware `accessibilityLabel` across all three MP components; game code display gets spaced-out TTS label (`"Game code: A B C 2 3 4"`); per-square board labels on MP chess and checkers (CPU parity — `"e4, white pawn, can move here"` / `"Row 3, column 4, red king piece, selected"`). **27 test suites / 564 tests passing**, `npx tsc --noEmit` clean. New tests: `multiplayer.test.ts` (45 tests: code generation, create/join with type validation, makeMove turn enforcement, resign/draw/break, listener, getMyGames, cleanup, helpers). |
