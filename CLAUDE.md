# CLAUDE.md

## Project

Don't Forget Why — React Native 0.83.4 / Expo SDK 55 / TypeScript Android app.

## Commands

```bash
npx tsc --noEmit              # Must pass before production builds
npx jest                       # Must pass before production builds
cd functions && npm run build  # Cloud Functions (separate Node 22 project)
```
## LAPTOP CONSTRAINT
When running on the laptop (slower machine), do NOT run `npx tsc --noEmit` or `npx jest` as verification steps. Report what needs to be verified and the user will run them manually in PowerShell after the prompt completes.
## Critical Rules

- **NEVER write package-lock.json.** Edit `package.json` directly for dep changes. The user regenerates the lockfile in PowerShell. WSL-generated lockfiles break EAS builds.
- **NEVER run npm install.** Same reason. Only edit package.json.
- `functions/` is a separate Node project. Don't install its deps from the project root.
- `metro.config.js` blockList must stay anchored to project-local `functions/` — unanchored regexes have broken production builds.
- **Audit prompts are read-only.** Auditors never create, modify, or delete files. No scripts to `/tmp` or any other location. Inline bash commands only. Report findings as text — fixes are applied by the implementer (Claude Code), not the auditor.

## Structure

```
src/screens/       — Thin render shells (logic in hooks)
src/hooks/         — Custom hooks (useChess, useAppIcon, useEntitlement, etc.)
src/services/      — Business logic (database, proStatus, multiplayer, iconTheme)
src/utils/         — Pure utilities (iconResolver, safeParse, haptics)
src/data/          — Static data (appIconAssets, chessAssets, triviaBank)
src/components/    — Reusable components (NoteCard, ProGate, BackButton)
src/theme/         — ThemeContext, colors, fonts
assets/            — WebP icons, backgrounds, voice clips
functions/         — Firebase Cloud Functions (SEPARATE project, own package.json)
__tests__/         — Jest tests
```

## Patterns

- Screens are thin — state/logic lives in custom hooks
- Haptics and sound in screen-level handlers, never utilities
- `useAppIcon(key)` for themed icons in components, `resolveIcon(key)` in utilities
- `safeParse()` for all JSON reads from kv store
- `kvGet(key)` / `kvSet(key, value)` for all persistence (expo-sqlite)
- Pro check: `isProUser()` from `src/services/proStatus.ts`
- Jest tests required for new services and pure logic functions

## When Compacting

Preserve: list of modified files, current test status, any failing test names, and the task goal.
