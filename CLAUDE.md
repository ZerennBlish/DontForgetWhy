# CLAUDE.md — Don't Forget Why

**Project-specific Claude Code instructions.** Lives at the root of the DFW repo. Claude Code reads this automatically at session start.

---

## Project

- React Native 0.83.4 / Expo SDK 55 / TypeScript (strict mode), Android
- Package: `com.zerennblish.DontForgetWhy`
- Publisher: Bald Guy & Company Games
- Repo: `C:\DontForgetWhy` (WSL: `/mnt/c/DontForgetWhy`)
- Long prompts live in the design chat (Claude Opus) — delivered as `.md` files, read via WSL path
- Desktop Commander available for read-only repo inspection from the design chat. Claude Code is the sole file editor.

---

## Commands

`tsc` and `jest` only run when source code (`*.ts`, `*.tsx`, `*.js`) was modified this session. Skip both for doc-only, config-only, or script-only sessions — they verify nothing in those cases.

```bash
npx tsc --noEmit              # Must pass before production builds (when code changed) — 0 errors
npx jest                       # Must pass before production builds (when code changed) — all green
cd functions && npm run build  # Cloud Functions (separate Node 22 project)
```

---

## Rules — READ THESE BEFORE EVERY TASK

### Universal (apply to every session)

- **One task per prompt.** Never combine tasks. Never touch files not listed in the TASK.
- **Partial edits only.** Do not rewrite entire files unless explicitly told to.
- **Plan Mode for >3 files.** Enter Plan Mode first when a task touches more than 3 files, produce a written plan, and only proceed after the plan is reviewed. Separates exploration from execution.
- **Show your work.** After every edit, print the actual changed lines. Do not say "done" without showing the code.
- **Word-boundary grep for substring overlap.** When verification counts occurrences of a name that's a substring of a similar name (e.g., `Coins` is a substring of `LifetimeCoins`), use word-boundary grep (`grep -w` or `\bName\b`). Naive substring grep produces false positives.
- **Do not infer.** If a line isn't where the prompt says it is, STOP and report. Do not guess or pattern-match.
- **No ambiguous conditionals.** Every step must be correct as written. No "do X unless Y breaks." If uncertainty exists, the prompt author resolves it before writing — never inside the prompt.
- **Read-only when auditing.** If the prompt says "audit" or "read only," do NOT edit any files. Triple warning.
- **Cascade rule.** If a session starts cascading (each fix creating new fixes), stop and revert immediately. Do not attempt "one more fix."
- **Build only what was asked.** No extra files, no abstractions for hypothetical future needs, no flexibility added for cases not asked about. If you find yourself adding "in case we need to..." — stop.
- **Ship-bias awareness.** Never nudge toward shipping over correctness. "Ship it, the quirk is cosmetic" is the exact shortcut this project exists to avoid.
- **Zerenn is not a code reviewer.** Audits are the AI team's job (Codex, Gemini, Claude Code in audit mode). Never ask him to read a block of code and tell you if it looks right.
- **Trust his bug diagnoses.** If he says it doesn't work, he tested it. Don't ask if he ran the prompt.
- **Restart first when something stopped working.** If something worked yesterday and doesn't today (especially after sleep/wake), suggest a restart before deeper diagnostics. ~90% of weird-state bugs across all electronics resolve with a restart.
- **Verification scope matches change scope.** Run `tsc` / `jest` only if source code changed. Doc-only or config-only sessions skip them — they verify nothing in those cases. Grep counts and file checks still apply to docs.
- **Destructive operations need explicit confirmation.** Force pushes, hard resets, recursive deletes, dropping branches, amending published commits, `--no-verify` — ask first.

### Project-specific (Don't Forget Why)

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
- No `&&` in shell commands — PowerShell doesn't support it. One command per code block.
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

Six technical reference docs live at the repo root:
- `DFW-Architecture.md` — screens, UI patterns, theme system, Cloud Functions, widgets
- `DFW-Features.md` — feature descriptions (Trivia, Pro tier, calendar, etc.)
- `DFW-Data-Models.md` — storage schemas
- `DFW-Bug-History.md` — bug narratives + root causes
- `DFW-Decisions.md` — design/architecture/monetization decisions
- `DFW-Project-Setup.md` — dev environment, builds, maintenance cadence, key commands

Read relevant docs when working on related systems, not for every task.

---

## When Compacting

Preserve: list of modified files, current test status, any failing test names, and the task goal.
