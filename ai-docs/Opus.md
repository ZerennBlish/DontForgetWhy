# Opus.md

**Operating manual for Opus in claude.ai chats.** This is the doc you read to understand how prompts get drafted, how audits get run, and how sessions close out for this project.

For Zerenn's persona, communication style, and universal cross-project conventions, see `ai-docs\About-Me.md`.
For project-specific Don't Forget Why code rules, see `CLAUDE.md` at the repo root.
For locked design decisions, see `DFW-Decisions.md`.

---

## How These Docs Are Organized

This project uses four documents for AI context, each with a focused audience:

| Doc | Audience | Role |
|-----|----------|------|
| `CLAUDE.md` (project root) | Claude Code | Project tech stack + DFW-specific rules. Auto-loaded by CC at session start. Lean by design. |
| `ai-docs\About-Me.md` | Both Opus and CC, all projects | Persona + universal cross-project conventions. Same content lives in DFW, Brick Headed, Legend of Zerenn — copies stay in sync. |
| `ai-docs\Opus.md` (this file) | Opus | How prompts get drafted, audits get run, sessions close. The Opus orchestration manual. |
| `DFW-Decisions.md` | Both Opus and CC | Design truth. Updated whenever locked design decisions change. Most valuable file in the repo. |

**The clear separation:** CLAUDE.md tells CC how this project works at a tech level. Opus.md tells Opus how to orchestrate work in this project. About-Me.md is universal personality and conventions both audiences reference.

When in doubt about which doc owns a rule:
- Rules about *how prompts are drafted* go in Opus.md
- Rules about *how the project's tech works* go in CLAUDE.md
- Rules about *who Zerenn is and how he wants to be talked to* go in About-Me.md

---

## Effort Levels (Opus 4.7, May 2026)

`low` / `medium` / `high` / `xhigh` / `max`. Set `/effort xhigh` once at session start as the default — Opus 4.7's intended baseline per Anthropic's April 23, 2026 post-mortem. Correct for almost everything.

Use `/effort max` only for: major architectural decisions, large multi-module changes, mission-critical bug hunts, audits (entire output is reasoning — max payoff for the latency cost), 2,000+ line file audits.

**Never use `ULTRATHINK` or `THINK HARD` keywords in individual prompts.** Documented April 2026 bug: both keywords hardcode reasoning to `high` regardless of session level — at `xhigh` or `max` they actively *downgrade*. GitHub FR is open to fix this; until then, the rule is absolute at every effort level. Persistent `/effort` is the only correct lever; per-prompt thinking keywords actively hurt.

---

## Session Management

Session hygiene matters as much as prompt structure. These commands aren't recovery tools — use them proactively. Context is the fundamental constraint; performance degrades as the window fills.

- **`/clear`** — between unrelated tasks. The "kitchen-sink session" (one task, then unrelated work, then back to the first) pollutes context with stale information and degrades performance. Clear context entirely between unrelated work.
- **`Esc`** — stops Claude mid-action without losing context. Use the moment you notice it going off track. Faster than letting a wrong path complete.
- **`Esc + Esc` or `/rewind`** — opens the rewind menu. Restore conversation only, code only, or both to any prior checkpoint. After two failed corrections on the same issue, rewind beats correcting again — the failed attempts are polluting context. **Rule of thumb: rewind > correct.**
- **`/compact <focus>`** — beats letting auto-compact fire. When the context window is filling and Claude starts making summarization choices on its own, take control: `/compact focus on the navigation refactor, drop the database test debugging`. Auto-compact triggers when Claude is at its least intelligent point (context rot).
- **Subagents for investigation.** Research and exploration tasks should run in a subagent. File reads, greps, and dead-end traces stay in the child's context; only the final summary returns to the main session. Use `"use a subagent to investigate X"` for any task that's primarily exploration. For DFW work this matters most when an audit needs to trace callers across the codebase — the audit prompt itself stays small, the exploration happens in the subagent. Anthropic's framing: "Will I need this tool output again, or just the conclusion?"

---

## Failure Patterns to Recognize

Anthropic's docs enumerate five common failure modes. Naming them helps catch them faster.

- **Kitchen-sink session.** One task, then unrelated work, then back to the first. Context fills with irrelevant files, commands, and decisions. **Fix:** `/clear` between unrelated tasks.
- **Correcting over and over.** Claude does something wrong, you correct, it's still wrong, you correct again. Context becomes polluted with failed approaches and Claude is now trying to satisfy contradictory directions. **Fix:** after two failed corrections on the same issue, `/clear` and write a more specific initial prompt incorporating what you learned. A clean session with a better prompt almost always outperforms a long session with accumulated corrections. Don't try a third correction.
- **Over-specified CLAUDE.md.** A long CLAUDE.md causes Claude to ignore half of it because important rules get lost in the noise. **Fix:** prune ruthlessly. For each line, ask *would removing this cause Claude to make mistakes?* If not, cut it.
- **Trust-then-verify gap.** Claude produces a plausible-looking implementation that doesn't handle edge cases. **Fix:** verification is non-negotiable. Tests, scripts, screenshots, expected outputs — if you can't verify it, don't ship it.
- **Infinite exploration.** Asking Claude to "investigate" without scope. Claude reads hundreds of files, fills context, returns a sprawling summary. **Fix:** scope investigations narrowly, or delegate to a subagent so the exploration doesn't pollute main context.
- **Cascade (DFW-specific addition).** Each fix creating new fixes — the original problem still there but new ones appearing. **Fix:** revert immediately. Don't attempt "one more fix." This is a stronger version of correcting-over-and-over and earned its own rule from S33.

---

## Claude Code Prompt Drafting

Maps to Anthropic's official Claude Code best practices (https://code.claude.com/docs/en/best-practices). These are the most important practices for prompt-writing — they take precedence over stylistic preferences when there's a conflict.

### Drafting Rules

- **Verification is the single highest-leverage practice.** Every prompt MUST include a way for CC to verify its work, not just print changed lines. Specifics for DFW: `npx tsc --noEmit` (must return 0 errors when source code changed), `npx jest <path>` (all green), and grep counts for added symbols ("confirm exactly N occurrences of FunctionName"). For doc-only or config-only sessions, skip tsc/jest — they verify nothing — and rely on grep counts and file checks. If verification fails, the prompt MUST instruct CC to STOP and report — never proceed assuming it worked. Without verification, you become the only feedback loop.
- **Anchor to grep'able strings, not line numbers.** Line numbers shift between when Opus reads a file and when CC runs the prompt. Use unique strings: `find the existing "isProUser()" call in useEntitlement` beats `at line 42`. Applies to audit prompts too. (Self-flagged S33 close-out as standing rule.)
- **Word-boundary grep for substring-overlap cases.** When a verification step counts occurrences of a name that's a substring of a similar name (e.g., `isPro` is a substring of `isProUser`), specify word-boundary grep (`grep -w` or regex `\bName\b`) in the prompt. Naive substring grep produces false positives. Self-flagged S36.
- **Pre-count expected grep occurrences carefully — code as written, not abstract intent.** Off-by-one errors happen when verification counts come from design intent rather than the actual code. Same prompt: a keyword that appears in adjacent comments will match naive grep — anticipate keyword-in-comment matches or specify "method call count" not "string count" when the keyword appears in narration.
- **Pre-trace verification narratives, not just grep counts.** Sentences like "all four keys are written via kvSet" or "the migration block writes X" are claims about runtime behavior. Derive them from a careful read of the code being shipped, not from design intent. Trace each verification sentence back to a specific line of code before writing it.
- **Reference existing patterns when adding similar code.** "Look at how AlarmCard handles its swipeable gesture; follow the same pattern" beats "implement a swipeable gesture." Reduces invented architecture and keeps the codebase consistent.
- **Use `@path/to/file.ts` (or `.tsx`) syntax for file references.** CC auto-reads `@`-prefixed paths. For DFW: `@src/services/database.ts`, `@src/hooks/useEntitlement.ts`, `@src/screens/HomeScreen.tsx`, `@__tests__/proStatus.test.ts`.
- **Address root causes, not symptoms.** When fixing a bug, prompt for root-cause analysis. "Don't catch the exception to silence it; find why it's thrown." Reinforces the never-nudge-toward-shipping rule.
- **Plan Mode for non-trivial work.** Use Plan Mode when the approach is uncertain, when modifying unfamiliar code, or when changes touch multiple files (rule of thumb: more than 3). Skip the plan when the diff can be described in one sentence — fixing a typo, renaming a variable, adjusting a literal value. Plan Mode separates exploration from execution; for tasks that don't need exploration, it's overhead.
- **One concern per prompt.** Don't bundle "fix the bug + refactor + add tests" — even if all three are appropriate, ship them as separate prompts. CC fails on mega-prompts.
- **Read current code state before drafting find/replace blocks.** A prompt that says "find `const TIMEOUT = 5000`" is useless if the actual current value is `4000`. CC stops at the find step instead of pattern-matching, but only because the verification gate catches it. Read the file via Desktop Commander (read-only) before drafting; don't trust memory or older snapshots.

### Format

Every Claude Code prompt uses this structure:

```
TASK: [one-line description of what changes and where]

FILE: @src/<path>/<filename>.ts (or .tsx)

WHAT TO DO: [numbered or bulleted steps. Be specific. No "do X if Y" conditionals.]

WHY: [design intent, locked decisions referenced, why this approach over alternatives]

CODE:

Find:
[exact text or block from current file — anchor to grep'able strings, never line numbers]

Replace with:
[exact replacement text, with all formatting preserved]

[repeat Find/Replace as needed for the same file]

VERIFICATION:
- npx tsc --noEmit must return 0 errors. (Skip for doc-only or config-only sessions.)
- npx jest <path-to-test> must pass all tests. (Skip for doc-only or config-only sessions.)
- grep -c "<symbol>" src/<path>/<file>.ts → must return N.
- [additional grep counts, expected outputs, or file-existence checks]
- If any verification fails: STOP and report counts.
```

### Example (abbreviated)

```
TASK: Extend useEntitlement to expose `daysRemaining` for trial countdown UI.

FILE: @src/hooks/useEntitlement.ts

WHAT TO DO:
1. Compute `daysRemaining` from the existing `trialEndsAt` timestamp using the existing dayjs import.
2. Return alongside existing fields: `{ isPro, isTrialing, trialEndsAt, daysRemaining }`.
3. Default to `null` when not in trial.

WHY: New trial countdown UI in HomeScreen needs a days-remaining display. Computing it inside the hook keeps screens thin per the DFW thin-screens / fat-hooks pattern.

CODE:
[Find/Replace blocks with grep'able anchor strings]

VERIFICATION:
- npx tsc --noEmit must return 0 errors.
- npx jest __tests__/useEntitlement.test.ts must pass all tests.
- grep -c "daysRemaining" src/hooks/useEntitlement.ts → expect 4. Report actual count.
- grep "return {" src/hooks/useEntitlement.ts → confirm the return statement includes daysRemaining.
- If any verification fails: STOP and report counts.
```

### Delivery

Chat-paste is the standard. Opus drafts the prompt inline in conversation, Zerenn copies into the CC CLI per task. A single file at `ai-docs\Prompts\<name>.md` is used only when the prompt is long enough that chat scroll-back becomes unwieldy.

---

## Audit Workflow

Multi-AI audit pattern:

- **Opus** (claude.ai chat) drafts prompts and triages findings
- **Claude Code, Codex, Gemini** run as parallel auditors (READ-ONLY)
- Claude Code is also the implementer when not auditing
- Auditors do NOT edit files; they produce findings only
- Findings route through Opus for severity triage and fix prompt drafting
- Fix prompts are GROUPED (Group A/B/C) — not one prompt per finding
- Triple READ-ONLY warnings are no longer required in audit prompts. The new identity-first `GEMINI.md` (and `AGENTS.md` if updated to match) establishes read-only as the agent's identity rather than a per-prompt constraint. A single `<task>`-level audit framing is sufficient. The simplified audit prompt template lives inside `GEMINI.md` itself.
- ~40% of audit findings are typically invalid — be precise, not speculative

Project-specific auditor docs:
- **Codex** — see `AGENTS.md` at repo root
- **Gemini** — see `GEMINI.md` at repo root

For repeated audit patterns, use the `/audit-readonly` slash command if present (lives at `.claude/commands/audit-readonly.md`).

---

## Session Close-Out

Every session ends with the same workflow. Opus runs it without being asked.

1. **Update affected docs** — `CLAUDE.md`, `DFW-Decisions.md`, `ai-docs\About-Me.md` (if universal rules changed), `ai-docs\Opus.md` (if drafting/audit/close-out rules changed) via Desktop Commander writes (announce-and-write rule).
2. **Write session handoff** to `ai-docs\Sessions\Session-NN-Handoff.md`. Must be on disk before the flat copy so it makes it into project knowledge.
3. **Commit and push everything:**
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
4. **Flat copy** — `.\copy-for-claude.ps1` stages files for upload. Runs after push so the handoff is included.
5. **Upload to Claude.ai** — see `Close-Out.md` for full workflow.

---

## Documentation Discipline

When making non-trivial changes, update the relevant doc the same session. The Decisions doc (`DFW-Decisions.md`) is the most valuable — capture rationale, not just the choice.

For Opus's own doc updates via Desktop Commander: announce first ("I'm going to update [file] to add [change], because [reason]"), then write. Strict announce-and-write rule applies to docs only — code edits go through CC, never Opus directly.

---

## Cross-Project Portability

`About-Me.md` and `Opus.md` are designed to be IDENTICAL across all of Zerenn's projects (DFW, Brick Headed, Legend of Zerenn, sciatic tracker). Same content, same structure. Only `CLAUDE.md` and the project's Decisions doc are project-specific.

The folder these live in varies per project (DFW uses `ai-docs\` because the lowercase `docs\` folder hosts the Play Store privacy policy via GitHub Pages; Brick Headed uses `Docs\`). The folder name doesn't matter — the content split does.

When setting up a new project: copy `About-Me.md` and `Opus.md` from any existing project's AI-context folder. Edit the Decisions-doc filename and folder-path references in `Opus.md` if needed (e.g., from `BrickHeaded-Decisions.md` to `DFW-Decisions.md`, from `Docs\` to `ai-docs\`). Write a new lean `CLAUDE.md` for the project's specific tech stack and gotchas.
