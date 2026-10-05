# Agent Guide

## Project

This repository is a static bank reconciliation UX prototype using fictional data. Edit `dist/index.html` for markup and CSS and `dist/app.js` for behavior. The `dist` directory is the source, not generated output. Fonts and icons are also stored there. There is no package manager setup, dependency installation, or build step.

Read [README.md](README.md) for the demo scenario and accounting arithmetic. `AI_WORK_LOG.md` records earlier work; current code and this guide describe the current experience.

## Reusable skills

Read the relevant skill before work in its area. These are reusable instructions, not separate background processes.

| Skill | When to use | Instructions |
| --- | --- | --- |
| Bank Reconciliation UX | Reviewing or changing matching, exceptions, evidence, progress, or completion | [.agents/skills/bank-reconciliation-ux/SKILL.md](.agents/skills/bank-reconciliation-ux/SKILL.md) |
| Maya Bank Reconciliation | Simulated user interviews and think-aloud usability testing as the staff accountant | [.agents/skills/maya-bank-reconciliation/SKILL.md](.agents/skills/maya-bank-reconciliation/SKILL.md) |
| Padding Alignment | Fixing unequal headers, dropdown spacing, clipping, or responsive layout | [.agents/skills/padding-alignment/SKILL.md](.agents/skills/padding-alignment/SKILL.md) |
| Repository URL Sync | Publishing mapped branches, syncing merged code, or investigating stale previews | [.agents/skills/repo-url-sync/SKILL.md](.agents/skills/repo-url-sync/SKILL.md) |

Follow the user's current task when it differs from historical guidance. Use only the relevant supporting references. These files can be read directly even when an agent does not support automatic skill discovery.

For Maya participant sessions, use supplied screens and visible interactions. Keep implementation details and the README's demo walkthrough out of Maya's simulated knowledge; they are not evidence that a participant would discover the intended flow.

## Commands and checks

Run from the repository root:

```sh
# Local preview; use another available port if needed.
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist

# JavaScript syntax check when behavior changes.
node --check dist/app.js

# Check the patch before committing.
git diff --check
```

There is no configured automated test suite. For UI changes, use available browser tooling to check the affected flow and inspect screenshots. For spacing changes, reproduce the reported width and check adjacent responsive breakpoints; the prior failures were at 768px and 320px. Check font-loaded geometry, visible labels, focus rings, and overflow. Do not add implementation-mirroring tests for simple style edits. Documentation-only changes need link/content checks, not a new browser test run.

## Product invariants

- Suggestions and evidence are ready on first load and after Reset Demo. The summary/filter is **AI Suggested**, and **AI Suggestions** opens an overview. Keep the experience free of a required scan step.
- Initial state: 14 open transactions, 10 suggested transactions representing 5 pairs, 2 bank-only items, and 2 ledger-only items. Counts of pairs and transactions must remain distinct.
- **Open** and **Resolved** are statuses. **All**, **AI Suggested**, **Bank Only**, and **Ledger Only** filter the open queue. All includes every unresolved item.
- Suggestions require user confirmation. Rejection leaves items open and supports manual matching or appropriate exception resolution. Preserve Undo and the activity record.
- AI is simulated using local rules. Preserve the demo disclosure; do not imply a real model call, bank connection, or ledger posting.
- Review Reconciliation enables when all 14 items are explained and opens a dedicated review page. Approval requires a zero adjusted balance difference and an explicit review checkbox. Preserve the confirmation page, approval activity entry, and Undo Approval. Carry-forward items remain timing exceptions, not cleared transactions.

## UI conventions

Preserve the existing palette, typography, and Title Case short headings. Prefer shared component styles over additional conflicting overrides. Peer panel headers share markup and padding. Action labels must remain readable inside narrow panels, and the top header must grow or wrap to fit its content.

Reuse the existing accessible category picker when consistent menu styling is needed. Preserve labels, keyboard operation, focus, dismissal, selected values, and action validation when changing it.

Keep application state in the existing in-memory model unless the task explicitly changes persistence. Do not introduce a framework or build system for a focused UI change.

## Branches and publication

The default branch is `main`. Preserve unrelated local files, including untracked QA output. Keep changes on the user's selected branch; use a new branch from current remote `main` when requested. Creating a pull request does not authorize merging it.

The [URL mapping reference](.agents/skills/repo-url-sync/references/known-projects.md) identifies the main and preview targets. The owner has requested publication alongside application updates to mapped branches and after authorized merges. Main and UX checklist URLs both follow `main`; feature previews retain their own branch mappings.

`.openai/hosting.json` identifies the main Site. Use each preview's own identity in an isolated publishing checkout. Preserve audiences, publish the verified source, and confirm deployment success before reporting a URL as updated. Use the available Sites hosting integration; if unavailable, report that blocker without claiming publication. Do not create a new Site merely to publish a documentation branch.

Keep credentials out of committed files. Instructions and public repository access do not grant access to the owner's hosting account or enable automatic deployment on GitHub pushes.
