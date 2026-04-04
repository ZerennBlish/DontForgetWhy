# Don't Forget Why — Living Roadmap
### Source of Truth · Updated: Session 14 (April 4, 2026)

---

## DASHBOARD

| | |
|---|---|
| **Current Version** | v1.11.0 (versionCode 28) — Backup & Restore |
| **Branch** | `dev` |
| **Production Status** | ✅ v1.11.0 submitted to Google Play |
| **Current Focus** | Session 14 complete: onboarding overhaul, backup & restore, store screenshots |
| **Blocked By** | Nothing |
| **Next Action** | P4.5 Stability Sprint or P6 Chess/Checkers |
| **EAS Credits** | ~35 remaining (reset April 12) |
| **Firebase Credits** | $300 available — DO NOT activate yet (90-day clock starts on activation) |
| **ElevenLabs** | Subscription active — 68 clips shipped |

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
| 4.5 | Stability Sprint | ⬜ Waiting | Prod only |
| 5 | Google Calendar Sync | ⬜ Waiting | Dev + Prod |
| 5.5 | Premium Foundation | ⬜ Waiting | Prod only |
| 6 | Chess + Checkers + Blunder Roast | ⬜ Waiting | Prod only |
| 6.5 | Voice Content Expansion | ⬜ Waiting | Prod only |
| 7 | Pro Tier + Billing | ⬜ Waiting | Multiple |
| 8 | Firebase Online + Social | ⬜ Waiting | Prod |

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

## PHASE 4.5 — STABILITY SPRINT

**Version Target:** v1.11.1 or bundled with v1.12.0 if clean
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build only
**Why now:** NotepadScreen is 1,240 lines. AlarmListScreen is ~600. P5 adds Firebase complexity. P6 adds two new game screens. Clean house before both.

### Tasks

- [ ] **4.5.1 NotepadScreen decomposition** — ~1,240 lines, split into focused components/hooks
- [ ] **4.5.2 AlarmListScreen decomposition** — ~600 lines, extract card interactions, sort/filter
- [ ] **4.5.3 Accessibility pass** — screen reader labels on View-based icons, test with TalkBack
- [ ] **4.5.4 App size + storage audit** — measure APK, identify largest contributors
- [ ] **4.5.5 OOM prevention** — FlatList windowSize/removeClippedSubviews on image-heavy lists
- [ ] **4.5.6 Jest resurrection** — update tests for SQLite services, add backup/restore coverage
- [ ] **4.5.7 R8 deobfuscation mapping** — upload to Play Console for crash reports
- [ ] **4.5.8 Full abandoned package audit** — scan for unused dependencies

### Audit Gate
- [ ] Full dual audit (Codex + Gemini) before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 5 — GOOGLE CALENDAR SYNC

**Version Target:** v1.12.0
**Branch:** `dev`
**New deps:** `expo-auth-session` + Firebase Auth
**Build cost:** 1 dev build + 1 production build
**Firebase:** Activate Firebase here. Auth only — do NOT activate Firestore yet.

### Tasks

- [ ] Firebase project setup (Auth only)
- [ ] Google OAuth via expo-auth-session
- [ ] Pull Google Calendar events into Today section + CalendarScreen dots
- [ ] Sync settings UI in SettingsScreen
- [ ] Optional: push DFW alarms/reminders to Google Calendar

### Audit Gate
- [ ] Full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 5.5 — PREMIUM FOUNDATION

**Version Target:** v1.13.0
**Branch:** `dev`
**New deps:** None
**Build cost:** 1 production build only

### Tasks

- [ ] **5.5.1 Entitlement storage** — local entitlement in kv_store with tier, date, reason
- [ ] **5.5.2 Grandfather / founder logic** — detect existing users, grant named tier
- [ ] **5.5.3 Backup entitlement flag** — export/import entitlement with .dfw backup
- [ ] **5.5.4 Billing plumbing (hidden)** — Google Play Billing built but not user-facing
- [ ] **5.5.5 Pro feature gate scaffold** — useEntitlement() hook, apply gates

### Founding Tiers
- **Founding Tester** — closed testing participants
- **Founding User** — first 90 days of production
- **Early Supporter** — first year of production

### Audit Gate
- [ ] Full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 6 — CHESS + CHECKERS + BLUNDER ROAST

**Version Target:** v1.14.0
**Branch:** `dev`
**New deps:** `chess.js` (JS only)
**Build cost:** 1 production build only

### Tasks

- [ ] **6.1 Chess vs CPU** — chess.js, 2+ difficulty levels, Memory Score integration
- [ ] **6.2 Blunder Roast** — detect blunders, trigger sarcastic voice/text roasts
- [ ] **6.3 Checkers vs CPU** — pure JS, 2+ difficulty levels, Memory Score integration
- [ ] **6.4 Memory Score Expansion** — add Chess + Checkers scoring to 5-game system

### Audit Gate
- [ ] Full dual audit before production build
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Increment version + versionCode

---

## PHASE 6.5 — VOICE CONTENT EXPANSION

**Version Target:** v1.15.0
**Build cost:** 1 production build (--clear flag for new audio assets)

### Tasks

- [ ] **6.5.1 Onboarding voice intro** — Alarm Guy clip on first launch
- [ ] **6.5.2 Voice memos attachable to alarms** — hear your own voice when alarm fires
- [ ] **6.5.3 More in-app roast moments** — navigation, idle, trivia/riddle
- [ ] **6.5.4 Female voice character design pass** — concept only, not shipping yet

---

## PHASE 7 — PRO TIER + BILLING

**Version Target:** v2.0.0

### Tasks

- [ ] **7.1 Pro tier** — ~$1.99 one-time, expose billing UI from P5.5
- [ ] **7.2 Pro gates (enforce)** — voice, photos, drawing, backup, calendar, chess, checkers, online content
- [ ] **7.3 Founding user display** — named badge in Settings
- [ ] **7.4 Android compliance** — edge-to-edge (15), orientation (16)
- [ ] **7.5 Reminder fire → Guess Why** — reminders through AlarmFireScreen

---

## PHASE 8 — FIREBASE ONLINE + SOCIAL

**Version Target:** v2.1.0+
**Backend:** Firestore + Cloud Functions (Auth already active from P5)

### Tasks

- [ ] Activate Firestore
- [ ] Online trivia + riddles (unlimited for Pro)
- [ ] Global leaderboards (anonymous)
- [ ] Multiplayer (scope TBD)

---

## BACKLOG (Not Scheduled)

### Features
- Timer notification buttons: "Go Away" + "Start me?"
- Add holidays to calendar
- Theme-responsive icon colors
- Expanded alarm icon picker
- Guess Why Personal Edition
- Trivia/riddle wake-up mode
- Pin toggle inside edit/detail screens
- iOS port (P9+)
- Optional AES-256 backup encryption
- NoteEditorModal voiceMemoStyles theming
- DrawingCanvas dark rgba values

### Store / Marketing
- Play Store listing update for home screen, voice memos, backup
- Widget preview screenshots
- App size audit

### Recurring
- Home screen title centering — verify applied
- Daily Riddle scoring design review

---

## PRO vs FREE BREAKDOWN

### Free Tier — Keeps Everything Current, Forever
- All alarms, reminders, timers, notepad
- In-app calendar (day/week/month views)
- All 6 themes (Dark, Light, High Contrast, Vivid, Sunset, Ruby)
- All 5 games (Guess Why, Memory Match, Trivia offline, Sudoku, Daily Riddle)
- Memory Score tracking
- Home screen + 4 widgets
- All personality content (text quotes, roasts, snooze messages, placeholders)
- Sound picker + custom alarm sounds
- Privacy mode, Silence All mode

### Pro Tier — ~$1.99 One-Time Unlock
- Voice roasts + voice memos + voice on alarms
- Custom photo backgrounds + note images + drawing
- Backup & Restore (.dfw export/import + auto-export)
- Google Calendar sync
- Chess + Checkers + Blunder Roast
- Online trivia + riddles (unlimited)
- Leaderboards

### Founding Tiers — Automatic, Named, Permanent
- Founding Tester / Founding User / Early Supporter
- All Pro features forever, no charge
- Named badge in Settings
- Survives backup/restore

---

## CREDIT BUDGET

| Phase | Dev Builds | Prod Builds | Est. Credits |
|-------|-----------|-------------|-------------|
| P4.5 Stability | 0 | 1 | ~1 |
| P5 Calendar | 1 | 1 | ~2 |
| P5.5 Premium | 0 | 1 | ~1 |
| P6 Games | 0 | 1 | ~1 |
| P6.5 Voice | 0 | 1 | ~1 |
| P7 Pro Tier | 0 | 2 | ~2 |
| P8 Firebase | 0 | 1+ | ~1+ |
| **Total** | **1** | **8+** | **~9–11** |

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
- Four backups: desktop + laptop + GitHub + USB
- Never put repos in OneDrive

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
| Mar 19 | Document created. P1 complete. |
| Mar 20 | Production approved. App live. |
| Mar 22 | v1.4.0 — timer dismiss hotfix. |
| Mar 25 | v1.5.0 — calendar, refactors, polish. |
| Mar 26 | P2 complete — images, drawing, Skia. |
| Mar 27 | P2 complete — backgrounds, per-alarm photo. |
| Mar 28 | v1.6.0 + v1.6.1 shipped. P3 voice roasts pre-work. |
| Mar 29 | P3 complete — 68 clips, ALARM stream. |
| Mar 30 | P3.5 complete — voice memos, MicWidget. v1.8.0 shipped. |
| Mar 31 | v1.8.1 SDK 55 upgrade. |
| Apr 1 | v1.9.0 Home screen. Session 9 visual overhaul. |
| Apr 3 | Session 13 visual overhaul shipped as v1.10.1. 6 themes, 15+ screens themed. |
| Apr 3 | Session 14 onboarding overhaul. Theme cycling, mic/camera permissions, sarcastic skip warnings. |
| Apr 4 | Session 14 P4 Vault complete. Export/Import Memories, SAF auto-export, transactional restore, manifest validation. 2 audit rounds, all findings fixed. |
| Apr 4 | Roadmap restructured. P4.5 Stability Sprint, P5.5 Premium Foundation, P6.5 Voice Expansion added. Named founding tiers. Blunder Roast. |
