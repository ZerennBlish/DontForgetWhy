# Session 45 Handoff

**Date:** May 10, 2026
**Branch:** dev
**Version:** v2.0.2 (versionCode unchanged — no publish)

---

## What landed

### Dependency alignment
- **SDK 55 full sweep:** 16 packages bumped to Expo SDK 55 matrix latest via `npx expo install --check`. Includes `react-native` 0.83.4 → 0.83.6, `expo` 55.0.15 → ~55.0.23, and all Expo companion packages.
- **expo-audio re-pinned:** Bumped from `55.0.13` → `55.0.14` (exact pin, no tilde). Original Session 33 reasoning for exact pin still applies.
- **reanimated/worklets left alone:** Expo matrix doesn't require a bump. Minor version jumps carry unnecessary risk.
- **react-native-zip-archive unchanged:** Still 7.1.0, still patched via patch-package. No new upstream release.
- **Dev build created and smoke tested:** Audio (game sounds, alarm clips, tutorial clips), navigation, persistence, notifications all confirmed working on new laptop.

### Doc and tooling fixes
- **Close-out workflow reordered:** Handoff now Step 5 (before commit), flat copy now Step 8 (after push). Handoff files live in `ai-docs/Sessions/` as repo files so flat copy captures them.
- **copy-for-claude.ps1 simplified:** Now copies only `.md` files (root markdown + ai-docs recursive). Source code and config files are read live via Desktop Commander — no longer uploaded to project knowledge. Destination path updated to `C:\Users\baldy\OneDrive\Desktop\BaldGuy&CompanyGames\Dont_Forget_Why\FilesForClaude`.
- **Opus.md updated:** Session close-out section reordered to match Close-Out.md. Fixed stale `DFW-Close-Out.md` reference.

### Dice game pre-production (That One Dice Game — Yahtzee)
- **Silver chrome dice faces (1-6):** Generated, transparent PNG, staged at `OneDrive\BaldGuy&CompanyGames\Dont_Forget_Why\ThatOneDiceGame\silverDice\`
- **Toon dice faces (1-6):** Generated, staged at `OneDrive\...\ThatOneDiceGame\toonDice\`
- **Red felt background:** Generated, portrait orientation with vignette, saved as WebP at `OneDrive\...\ThatOneDiceGame\red_felt_gaming_table.webp`
- **Game not yet scoped** — assets are staged, no code written. Full game design (rules, UI layout, scoring, screen architecture) needed before implementation.

## Known state

- Force-pushed to origin/dev from laptop (clean copy). Desktop needs `git fetch origin` + `git reset --hard origin/dev` + `npm install` on next use.
- Junction `C:\DontForgetWhy` → `D:\DontForgetWhy` causes EAS fingerprint failure. Run EAS builds from `D:\` directly, or set `EAS_SKIP_AUTO_FINGERPRINT=1`.
- **BOM lesson learned:** PowerShell `Set-Content -Encoding UTF8` writes UTF-8 WITH BOM on Windows PowerShell, which breaks JSON parsers. Use `[System.IO.File]::WriteAllText()` or Desktop Commander for safe writes.
- Founding grant works correctly — Zerenn's account wasn't grandfathered because app data was cleared (wiped kv_store metadata). Matt was grandfathered successfully.

## Open priorities (ranked)

1. **That One Dice Game** — Yahtzee-style. Assets ready, needs full game design and scoping before implementation. Two dice sets available (silver chrome, toon).
2. **Tracked audit fixes** — joinGame/joinTriviaGame race condition (no transaction), missing `.exists()` guard after re-read, cloudCheckers `isCloudResponse` validation gaps, HomeScreen scrollability on small devices, missing multiplayerTrivia test file.
3. **OAuth consent screen** — unverified, needs domain with homepage.
4. **Screenshots** — not pressing.
