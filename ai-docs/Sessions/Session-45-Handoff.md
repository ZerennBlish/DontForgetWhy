# Session 45 Handoff

**Date:** May 9, 2026
**Branch:** dev
**Version:** v2.0.2 (versionCode unchanged — no publish)

---

## What landed

- **SDK 55 dependency alignment:** 16 packages bumped to Expo SDK 55 matrix latest via `npx expo install --check`. Includes `react-native` 0.83.4 → 0.83.6, `expo` 55.0.15 → ~55.0.23, and all Expo companion packages.
- **expo-audio re-pinned:** Bumped from `55.0.13` → `55.0.14` (exact pin, no tilde). Original Session 33 reasoning for exact pin still applies — patch versions have historically changed behavior.
- **reanimated/worklets left alone:** Expo matrix doesn't require a bump. Minor version jumps (4.2→4.3, 0.7→0.8) carry unnecessary risk.
- **react-native-zip-archive unchanged:** Still 7.1.0, still patched via patch-package. No new upstream release.
- **Dev build created and smoke tested:** All audio paths (game sounds, alarm voice clips, tutorial clips), navigation, persistence, notifications confirmed working.
- **Close-out workflow fixed:** Handoff now Step 5 (before commit), flat copy now Step 8 (after push). Handoff files live in `ai-docs/Sessions/` as repo files so flat copy captures them.
- **copy-for-claude.ps1 updated:** ai-docs discovery now recursive (`-Recurse` flag) so Sessions subdirectory files are included in flat copy.
- **BOM lesson learned:** PowerShell `Set-Content -Encoding UTF8` writes UTF-8 WITH BOM on Windows PowerShell, which breaks JSON parsers. Use `[System.IO.File]::WriteAllText()` or Desktop Commander for safe writes.

## Known state

- Force-pushed to origin/dev from laptop (clean copy). Desktop needs `git fetch origin` + `git reset --hard origin/dev` + `npm install` on next use.
- Junction `C:\DontForgetWhy` → `D:\DontForgetWhy` causes EAS fingerprint failure. Run EAS builds from `D:\` directly, or set `EAS_SKIP_AUTO_FINGERPRINT=1`.
- Founding grant works correctly — Zerenn's own account wasn't grandfathered because app data was cleared (no metadata = fresh install). Matt was grandfathered successfully.

## Open priorities (ranked)

1. **Dice game** — new game, not yet scoped
2. **Tracked audit fixes** — joinGame/joinTriviaGame race condition (no transaction), missing `.exists()` guard after re-read, cloudCheckers `isCloudResponse` validation gaps, HomeScreen scrollability on small devices, missing multiplayerTrivia test file
3. **OAuth consent screen** — unverified, needs domain with homepage
4. **Screenshots** — not pressing