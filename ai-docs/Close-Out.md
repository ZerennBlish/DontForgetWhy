# Close-Out — Don't Forget Why

**Audience:** Opus only. Claude Code does NOT auto-load this file.

This is the operations workflow Opus runs at the end of every DFW session. Lives outside `CLAUDE.md` so the workflow content doesn't compete for Claude Code's attention at session start.

---

## On the OneDrive Stash

Step 8 below copies files into a OneDrive-synced folder. This is intentional and safe even though OneDrive sync is otherwise dangerous during active development.

The risk with OneDrive sync is timing collisions between sync and file writes — editing a file inside a synced folder while a build runs can cause sync to grab a half-written file. The stash avoids this entirely: it's a one-shot copy-in destination, not an edit target. Nothing modifies the staged copies after the copy completes; sync just uploads them. The stash is staging, not a development directory.

---

## Step 1 — Verify nothing is uncommitted or unpushed

```powershell
git status
```

```powershell
git log --oneline origin/dev..HEAD
```

If `git status` shows modifications, commit them. If `git log` shows local-only commits, push them. Both must be clean before proceeding. This catches the "other machine had unpushed work" trap that plagues two-computer workflows.

---

## Step 2 — Focused audit (if code changed this session)

Run all three auditors on files touched this session. Scope: only files changed, not a full codebase pass — that's a separate weekly cadence.

- **Codex** — see `AGENTS.md` for prompt template
- **Claude personal** — read-only audit prompt
- **Gemini** — see `GEMINI.md` for the simplified prompt template

Triple read-only warnings are no longer required in audit prompts. The current `GEMINI.md` and `AGENTS.md` establish read-only as agent identity, not a per-prompt constraint. A single concise audit prompt is sufficient.

Route findings through Opus for severity triage. ~40% of findings are typically invalid. Group real fixes into A/B/C groups, one prompt per group.

Skip this step for doc-only sessions, audio tuning, asset-only sessions, or any session that didn't touch source code.

---

## Step 3 — Run tsc + jest (production builds only)

```powershell
npx tsc --noEmit
```

```powershell
npx jest
```

Both must pass with 0 errors before any production build. Not required for every push — only when a production build is imminent.

---

## Step 4 — Update docs

Update any of these that changed this session:

- `CLAUDE.md` — if rules, structure, or workflow changed
- `ai-docs\About-Me.md` — only if universal cross-project rules changed (changes here propagate to Brick Headed and Legend of Zerenn)
- `ai-docs\Opus.md` — if drafting/audit/close-out rules changed
- `ai-docs\DFW-Decisions.md` — if locked design decisions changed
- `ai-docs\DFW-Architecture.md`, `DFW-Features.md`, `DFW-Data-Models.md`, `DFW-Bug-History.md`, `DFW-Project-Setup.md` — whichever reference docs are affected
- `AGENTS.md` / `GEMINI.md` — if audit rules changed
- `ROADMAP.md` — if tasks completed or priorities shifted
- `ai-docs\Close-Out.md` (this file) — if the close-out workflow itself changed

---

## Step 5 — Write session handoff

Opus writes the session handoff to `ai-docs\Sessions\Session-NN-Handoff.md`. This file captures what landed, what's open, and where the next session picks up. It lives in the repo so the flat copy (Step 8) picks it up and it makes it into project knowledge for the next session.

---

## Step 6 — Commit and push

```powershell
git add .
```

```powershell
git commit -m "Session NN: <summary>"
```

```powershell
git push
```

Separate commands — PowerShell doesn't `&&`-chain.

---

## Step 7 — Final push verification

```powershell
git status
```

```powershell
git log --oneline origin/dev..HEAD
```

Both must return empty. If not, fix before proceeding.

---

## Step 8 — Flat copy to OneDrive stash

Run the flat copy script to stage files for Claude.ai project knowledge upload:

```powershell
.\copy-for-claude.ps1
```

The script copies repo-root config files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, `ROADMAP.md`, etc.), all `ai-docs\*.md` docs, and the entire `src/` tree (flattened) to the upload staging folder. **Keep the script in sync with the actual file list** — when a doc, plugin, or script is added, removed, or renamed, update `copy-for-claude.ps1` too. Drift between disk reality and the script is the most common cause of stale project knowledge in Claude.ai.

---

## Step 9 — Upload to Claude.ai

Drag-and-drop all files from the OneDrive stash folder into the Claude.ai project knowledge panel. Replace existing files.

---

## Cross-Project Note

This Close-Out workflow is project-specific. Brick Headed uses `Docs\Close-Out.md`; Legend of Zerenn has its own variant. The structure is similar (verify-clean → audit → docs → commit → upload) but file paths and step counts differ. Do not copy this file across projects without adapting paths.
