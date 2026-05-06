# CLAUDE.md — Don't Forget Why

**Project-specific Claude Code instructions.** Lives at the root of the DFW repo. Auto-loaded by CC at session start.

For universal cross-project conventions and persona context, see `ai-docs\About-Me.md`.
For Opus orchestration rules (prompt drafting, audit workflow, session close-out), see `ai-docs\Opus.md`.
For locked design decisions, see `ai-docs\DFW-Decisions.md`.

---

## Project

- React Native 0.83.4 / Expo SDK 55 / TypeScript (strict mode), Android
- Package: `com.zerennblish.DontForgetWhy`
- Publisher: Bald Guy & Company Games
- Repo: `C:\DontForgetWhy` (WSL: `/mnt/c/DontForgetWhy`)
- Desktop Commander available for read-only repo inspection from the design chat (Opus). Claude Code is the sole file editor.

---

## Commands

`tsc` and `jest` only run when source code (`*.ts`, `*.tsx`, `*.js`) was modified this session. Skip both for doc-only, config-only, or script-only sessions — they verify nothing in those cases.

```bash
npx tsc --noEmit              # Must pass before production builds (when code changed) — 0 errors
npx jest                       # Must pass before production builds (when code changed) — all green
cd functions && npm run build  # Cloud Functions (separate Node 22 project)
```

---

## Project-Specific Code Rules

- **NEVER write `package-lock.json`.** Edit `package.json` directly for dep changes. The user regenerates the lockfile in PowerShell. WSL-generated lockfiles pass local checks but fail EAS `npm ci` due to cross-platform resolution gaps. This is non-negotiable.
- **NEVER run `npm install` from WSL.** Same reason. Only edit `package.json`.
- **`functions/` is a separate Node 22 project.** Don't install its deps from the project root. Don't mix its `package.json` with the root one.
- **`metro.config.js` blockList must stay anchored** to project-local `functions/` — unanchored regexes have broken production builds.
- **Screens are thin render shells.** State and logic live in custom hooks (`src/hooks/`). If a screen file is growing logic, extract it to a hook.
- **Haptics and sound in screen-level handlers only.** Never in utilities. Utilities are side-effect free.
- **`safeParse()` for all JSON reads** from the kv store. Never raw `JSON.parse` on persisted data.
- **Navigation guards (`beforeRemove`)** on all screens with save/discard flows.
- **6 themes, section colors via tokens only.** Never hardcode colors — use `ThemeContext`.
- **No accounts, no tracking, no ads.** This is a deliberate differentiator, not a missing feature. Don't add analytics, telemetry, or user tracking of any kind.
- **`timerPresetAssets.ts` registry pattern.** ID → `ImageSourcePropType`, lookup at render, no type changes, emoji fallback for user-created timers.
- **Founding status / Pro tier.** `foundingStatus.ts` has `TODO(v2.0.0)` tripwire comments — these are intentional guards, not stale TODOs. `isProUser()` from `proStatus.ts` for all Pro gating.
- **Voice clips are brand, not decoration.** Sarcasm, roasts, witty quotes are core features. Don't soften them.

---

## Structure

```
src/screens/       — Thin render shells (logic in hooks)
src/hooks/         — Custom hooks (useChess, useAppIcon, useEntitlement, etc.)
src/services/      — Business logic (database, proStatus, multiplayer, iconTheme)
src/utils/         — Pure utilities (iconResolver, safeParse, haptics)
src/data/          — Static data (appIconAssets, chessAssets, triviaBank)
src/components/    — Reusable components + modals (NoteCard, ProGate, EmojiPickerModal)
src/theme/         — ThemeContext, colors, fonts
src/navigation/    — types.ts (RootStackParamList)
assets/            — WebP icons, backgrounds, voice clips
functions/         — Firebase Cloud Functions (SEPARATE project, own package.json)
plugins/           — Expo config plugins (withAlarmChannel, withAlarmWake, withNotifee)
__tests__/         — Jest test files
```

---

## Patterns

- `kvGet(key)` / `kvSet(key, value)` for all persistence (expo-sqlite, in `src/services/database.ts`)
- `useAppIcon(key)` for themed icons in components, `resolveIcon(key)` in utilities
- Pro check: `isProUser()` from `src/services/proStatus.ts`
- Entitlement hook: `useEntitlement()` for React components
- Card components extracted and reusable (AlarmCard, NoteCard, ReminderCard, etc.)
- Jest tests required for new services and pure logic functions
- Mock pattern: `jest.mock('../src/services/database', ...)` backed by `new Map<string, string>()`

---

## Code Style

- TypeScript strict mode
- Prefer early returns over deep nesting
- `@path/to/file` references for file targeting in prompts

---

## Do NOT

- Write `package-lock.json` or run `npm install` (see lockfile rule above)
- Create HTML, markdown, or handoff documents unless explicitly asked
- Add `import` statements that aren't needed
- Remove or modify code outside the scope of the current task
- Trust your own confirmation — always show the actual lines you changed
- Add comments that just restate what the code does
- Reference stale paths (e.g., `src/modals/` does not exist — modals live in `src/components/`)

---

## Reference Docs

Project-specific reference docs in `ai-docs\`:
- `ai-docs\DFW-Architecture.md` — screens, UI patterns, theme system, Cloud Functions, widgets
- `ai-docs\DFW-Features.md` — feature descriptions (Trivia, Pro tier, calendar, etc.)
- `ai-docs\DFW-Data-Models.md` — storage schemas
- `ai-docs\DFW-Bug-History.md` — bug narratives + root causes
- `ai-docs\DFW-Decisions.md` — design/architecture/monetization decisions
- `ai-docs\DFW-Project-Setup.md` — dev environment, builds, maintenance cadence, key commands

Read relevant docs when working on related systems, not for every task.

For universal rules and persona context, see `ai-docs\About-Me.md`.
For Opus orchestration manual, see `ai-docs\Opus.md`.

---

## When Compacting

Preserve: list of modified files, current test status, any failing test names, and the task goal.
