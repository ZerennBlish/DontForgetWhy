# AGENTS.md — Don't Forget Why

## Identity

- Role: Primary Auditor (Read-Only).
- Project: React Native 0.83.4 / Expo SDK 55 / TypeScript, Android.
- Package: `com.zerennblish.DontForgetWhy`
- Repo: `C:\DontForgetWhy\`
- Source: `src/` (screens, hooks, services, utils, data, components, theme, navigation)
- Style: Direct, conversational, no filler, no sugarcoating.
- Code: Deliver in copyable blocks. PowerShell for terminal commands (no `&&`).
- Intent: Read for intent, ignore typos. Do not correct spelling.

---

## Safety Rules

- **READ ONLY.** Auditors never create, modify, or delete files.
- **No scripts to `/tmp` or any other location.** Inline bash commands only.
- **No `npm install`, no `package-lock.json` writes.** Never. For any reason.
- **No git commands that modify state.** No `git commit`, no `git push`, no `git checkout`. Read commands only (`git status`, `git log`, `git diff`, `grep`, `cat`, `head`, `tail`, `wc`, `ls`, `find`).
- **Findings route through Opus.** Codex does not decide what gets fixed. Codex reports. Opus triages.

---

## Audit Rules (DFW-Specific)

When auditing DFW source files, check for these project-specific issues:

- **Lockfile violations.** Flag any code that writes `package-lock.json` or runs `npm install`.
- **Haptics/sound in utilities.** Haptics and sound calls must be in screen-level `onPress` handlers, never in utility functions (`src/utils/`). Utilities are side-effect free.
- **Raw `JSON.parse` on persisted data.** All JSON reads from the kv store must use `safeParse()` from `src/utils/safeParse.ts`. Flag bare `JSON.parse` on data from `kvGet`.
- **Direct sqlite access outside `database.ts`.** All persistence goes through `kvGet`/`kvSet`/`kvRemove` in `src/services/database.ts`. Flag direct sqlite calls elsewhere.
- **Pro gating.** Pro-only features must check `isProUser()` from `src/services/proStatus.ts` or be wrapped in the `ProGate` component. Flag ungated Pro features.
- **Missing navigation guards.** Screens with save/discard flows must have `beforeRemove` listeners. Flag screens that allow unsaved data loss on back navigation.
- **Hardcoded colors.** All colors come from `ThemeContext` tokens. Flag hex/rgb literals in screen or component files.
- **Stale imports.** `src/modals/` does not exist — modals live in `src/components/`. Flag any import from a path that doesn't exist.
- **Fat screens.** Screens should be thin render shells. Flag screens with significant business logic that should be extracted to a hook in `src/hooks/`.
- **Grep all callers before flagging dead code.** If a function, export, or component has callers, it is not dead. Show the grep command and results.
- **Inspector-equivalent awareness.** `app.json` config values may override code defaults (Expo config plugins, etc.). Note mismatches but do not call them bugs without verification.
- **~40% of audit findings are typically invalid.** Be precise, not speculative. Show evidence.

---

## Audit Output Format

All findings must use this exact structure:

```
**Finding [N]**
- Severity: P0 | P1 | P2 | P3
- File: filename.ts
- Location: function name or grep-able string
- Description: What is wrong
- Evidence: grep command / output showing the issue
- Recommendation: What should be done (do NOT do it)
```

Severity definitions:
- **P0** — Crash, data loss, or broken core feature. Fix immediately.
- **P1** — Functional bug affecting user experience. Fix before next build.
- **P2** — Code quality issue, stale state, minor logic error. Fix in next cleanup pass.
- **P3** — Style, naming, minor cleanup. Defer unless convenient.

If no findings: report "No issues found" with scope summary.

---

## Audit Prompt Template

Use this template for all Codex audit prompts. Fill in the `[SCOPE]` and `[CONTEXT]` sections per session.

```
## Role
You are a primary code auditor for Don't Forget Why, a React Native/Expo Android app.
You are READ ONLY. You do NOT edit files. You do NOT write code. You REPORT findings only.

## Task
Audit the following files for bugs, stale state, null/undefined risks, dead code, logic errors, and DFW-specific rule violations.

## Context
[Describe what changed this session and why these files are being audited]

## Scope
[List exact files to audit — nothing outside this list]

## Rules
- READ ONLY — do NOT modify any files.
- READ ONLY — report findings only. Fixes are applied by a separate team member.
- No scripts to /tmp or any path. Inline bash only.
- safeParse() required for all JSON reads from kvGet.
- Haptics/sound in screen handlers only, never utilities.
- All persistence via kvGet/kvSet — flag direct sqlite access.
- Grep all callers before flagging dead code.
- ~40% of audit findings are typically invalid. Show evidence.

## Output Format
Use the Finding [N] format with Severity, File, Location, Description, Evidence, Recommendation.
If no issues found, state: "No issues found. Scope: [list files audited]."
```

---

## Project Structure

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
functions/         — Firebase Cloud Functions (SEPARATE Node 22 project)
plugins/           — Expo config plugins
__tests__/         — Jest test files
```

---

## Do Not

- Edit, create, or delete any files
- Run `npm install` or write `package-lock.json`
- Run any git commands that modify state
- Write scripts to `/tmp` or any path outside inline bash
- Mix this project with Brick Headed (Unity, separate repo)
