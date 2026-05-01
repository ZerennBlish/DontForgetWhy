# DFW-Close-Out.md

**Audience:** Opus only. Claude Code does NOT auto-load this file.

This is the operations workflow Opus runs at the end of every DFW session. Lives outside `CLAUDE.md` so the workflow content doesn't compete for Claude Code's attention at session start.

---

## On the OneDrive Stash

Step 7 below copies files into a OneDrive-synced folder (`C:\Users\baldy\OneDrive\Desktop\DFW\FilesForClaude`). This is intentional and safe, even though OneDrive sync is otherwise dangerous during active development.

The risk with OneDrive is sync timing fighting file writes — editing files inside a synced folder while a build runs can cause sync to grab a half-written file. The stash avoids this entirely: it's a one-shot copy-in destination, not an edit target. Nothing modifies the staged copies after the copy completes; sync just uploads them. The stash is staging, not a development directory.

---

## Step 1 — Verify nothing is uncommitted or unpushed

```powershell
git status
git log --oneline origin/dev..HEAD
```

If `git status` shows modifications, commit them. If `git log` shows local-only commits, push them. Both must be clean before proceeding.

## Step 2 — Focused audit (if code changed this session)

Run auditors on files touched this session. Scope: only files changed, not a full codebase pass.
- **Codex** — `AGENTS.md`-aware audit prompt, read-only
- **Claude personal** — read-only audit prompt
- **Gemini** — read-only audit prompt, **triple read-only warning required or Gemini will attempt edits**

Route findings through Opus for severity triage. ~40% of findings are typically invalid. Group real fixes into A/B/C groups, one prompt per group.

Skip this step for doc-only sessions or sessions that didn't touch source code.

## Step 3 — Run tsc + jest (production builds only)

```powershell
npx tsc --noEmit
npx jest
```

Both must pass with 0 errors before any production build. Not required for every push.

## Step 4 — Update docs

Update any of these that changed this session:
- `CLAUDE.md` — if rules, structure, or workflow changed
- `AGENTS.md` — if audit rules changed
- `GEMINI.md` — if audit rules changed
- `DFW-*.md` — whichever reference docs are affected
- `ROADMAP.md` — if tasks completed or priorities shifted

## Step 5 — Commit and push

```powershell
git add <changed files>
git commit -m "Session NN: close-out docs"
git push
```

## Step 6 — Final push verification

```powershell
git status
git log --oneline origin/dev..HEAD
```

Both must return empty. If not, fix before proceeding.

## Step 7 — Flat copy to OneDrive stash

Run the flat copy script to stage files for Claude.ai project knowledge upload:

```powershell
.\copy-for-claude.ps1
```

The script copies root config files, all DFW-*.md docs, and the entire `src/` tree (flattened) to the upload staging folder. Update the script whenever files are added, removed, or renamed.

## Step 8 — Upload to Claude.ai

Drag-and-drop all files from the OneDrive stash folder into the Claude.ai project knowledge panel. Replace existing files.

## Step 9 — Session handoff

Session handoffs are written by Opus in the design chat and provided as context for the next session. Not stored as files in the repo.
