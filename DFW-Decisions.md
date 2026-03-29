# DFW Design Decisions & Environment Knowledge
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** March 29, 2026

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

### Removed Features (With Reasons)
- **Alarm sound picker:** 6 channels all used `sound: 'default'`. Indistinguishable.
- **Game sounds:** Enhanced haptic patterns not distinct from regular haptics.
- **SwipeableRow:** Gesture conflicts with react-native-tab-view. Buttons more reliable.
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

**Text color picker removed from roadmap (Mar 25):** The dark capsule pattern (semi-transparent dark backgrounds with white text/borders) solves readability on all backgrounds without user configuration. For future photo backgrounds (P2 Pro), dark overlays or frosted-glass strips behind text regions with automatic black/white text selection based on background luminance. More reliable, zero-config, preserves visual consistency. reanimated-color-picker stays installed for custom theme builder but is NOT used for a global text color setting.

**CalendarWidget as mini month grid, not agenda list (Mar 25):** Initial design was "Today's Agenda" list widget. Switched to mini calendar with dots because: (1) month-at-a-glance is more useful than duplicating DetailedWidget's item list, (2) dots answer "do I have anything on X day?" which is the core calendar question, (3) tapping any day deep-links to CalendarScreen for details. Widget can't navigate months (click-only interaction model) — always shows current month.

**Week view locked to current week (Mar 25):** Week view previously showed whatever week contained selectedDate. Changed to always show the current week because: "What's on my plate this week?" is the useful question. Browsing other weeks is what month view is for. Tapping a date outside current week while in week mode auto-switches to day view so it doesn't feel stuck.

**Floating back buttons — selective, not global (Mar 25):** Only applied to screens with scrollable content that hides the back button: CalendarScreen, SettingsScreen, DailyRiddleScreen, NoteEditorModal, MemoryScoreScreen. Not app-wide — screens without scrolling or with fixed headers don't need it. Back button only floats (compact dark pill), title stays in scroll flow. Started with full-width FloatingHeader component, reverted — direct styles on individual screens is simpler.

**Tablet responsive — scale, don't redesign (Mar 25):** Used responsive maxWidth constants (CONTENT_MAX_WIDTH) capped at 500-600px rather than redesigning layouts. Phone experience unchanged. Tablet gets wider content that still looks intentional. Applied to: Onboarding (maxWidth 500), Sudoku (grid 540, pad 600), MemoryMatch (content 500, grid 600), MemoryScore (floating back button).

**Dismiss Voice toggle removed, double-tap is sufficient (Mar 29):** Removed the per-category "Dismiss Voice" setting toggle. Two controls is the right amount: master Voice Roasts on/off for people who want no voice ever, and double-tap to skip any individual clip. Per-category toggles create settings bloat and set a precedent for snooze toggle, timer toggle, etc. In an app where simplicity is brand, fewer options is better.

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
- react-native-worklets MUST stay at 0.5.1
- adb may not be in PATH. Full path: `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices`. Set permanent: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")`
- Download dev builds from expo.dev on phone browser to skip adb install
- JS-only changes don't require new builds — dev server hot-reloads. Only native dependency changes need new APK.

### EAS Build
- Starter plan: $19/month, ~$1/build. Credits reset on 12th.
- Can't queue new build while one running — must cancel first
- `npm ci` lock file sync: WSL package install → run `npm install` from PowerShell → commit package-lock.json
- Builds on Expo cloud — local specs don't affect build speed
- `development-emulator` profile in eas.json: `developmentClient: true`, `distribution: "internal"`, `buildType: "apk"`, env `ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64`. Used for emulator-only dev builds (x86_64 arch, separate from ARM physical device builds).
