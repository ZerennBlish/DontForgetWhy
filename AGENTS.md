# AGENTS.md

## Project

Don't Forget Why — React Native / Expo SDK 55 / TypeScript Android app.
Package: `com.zerennblish.DontForgetWhy`

## Structure

```
src/screens/       — UI render shells (logic lives in hooks)
src/hooks/         — Custom hooks (useChess, useAlarmForm, useAppIcon, etc.)
src/services/      — Business logic (database, proStatus, multiplayer, iconTheme)
src/utils/         — Pure utilities (iconResolver, safeParse, haptics)
src/data/          — Static data (appIconAssets, chessAssets, triviaBank)
src/components/    — Reusable components (NoteCard, ProGate, BackButton)
src/modals/        — Modal components
src/theme/         — ThemeContext, colors, fonts
src/navigation/    — types.ts (RootStackParamList)
assets/            — WebP icons, backgrounds, voice clips
functions/         — Firebase Cloud Functions (separate Node 20 project)
__tests__/         — Jest test files
plugins/           — Expo config plugins
```

## Commands

```
npx tsc --noEmit          # TypeScript — 0 errors required
npx jest                  # All tests must pass
cd functions && npm run build   # Cloud Functions build (separate project)
firebase deploy --only functions  # Deploy Cloud Function
```

## Conventions

- All storage via expo-sqlite: `kvGet(key)` / `kvSet(key, value)` in `src/services/database.ts`
- Pro check: `isProUser()` from `src/services/proStatus.ts`
- Icons: `useAppIcon(key)` in components, `resolveIcon(key)` in utilities
- Haptics/sound in screen-level handlers only, never utilities
- `safeParse()` for all JSON reads from kv store
- Screens are thin — state and logic live in custom hooks

## Do Not

- Run `npm install` from WSL (lockfile rule — PowerShell only)
- Touch `functions/package.json` from project root
- Mix this project with Brick Headed (Unity, separate repo)
