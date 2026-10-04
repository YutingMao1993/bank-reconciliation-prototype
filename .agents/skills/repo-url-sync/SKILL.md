---
name: repo-url-sync
description: Sync selected GitHub repositories and branches to their mapped live and preview site URLs, including publishing merged changes and checking stale deployments. Use for repo-to-URL sync requests or edits to a repository with an established URL sync mapping. Creating a PR alone does not authorize merging it or redirecting a branch preview.
---

# Repository URL Sync

Make each selected URL serve the intended repository branch's current code. A GitHub push, a merged pull request, and a successful site deployment are separate events; finish the publication step before saying a URL is updated.

## Establish the mapping

Use the current request, repository instructions, existing deployment configuration, and previously confirmed mappings to identify:

- Repository owner/name and local checkout.
- Exact branch for each URL, and whether it is the main site or a branch preview.
- Hosting provider, existing project/site ID, and current audience.
- Publication mode: an agent-run snapshot or a verified ongoing deployment integration.

For this bank reconciliation repository, consult [known-projects.md](references/known-projects.md). It contains discovery hints, not proof of current remote or deployment state. For other repositories, discover their own mappings instead of borrowing this project's settings.

Apply the sync to all confirmed mappings of the selected repositories unless the user narrows the URLs or branches. Do not expand selection to unrelated repositories, old experiments, or URLs merely discovered on disk. If no mapping exists, establish one from the user's chosen repository and URL. Ask only when an unresolved ambiguity would send code to a different destination; continue preparing unambiguous targets meanwhile.

Fetch the current remote refs and inspect the repository's actual default branch. If the user says “master” and only `main` exists, use `main` and briefly state the naming difference. If both exist, respect an explicitly named branch. A feature preview stays mapped to its feature branch after a PR merges unless the user requests a new mapping.

## Select and prepare the source

1. Inspect checkout status and preserve unrelated or uncommitted work. Use an isolated publishing checkout when needed; do not reset the user's workspace or force-push history to simplify deployment.
2. For a sync request, fetch and pin the selected remote branch's full commit SHA. For requested edits, complete and verify the changes, commit/push them when authorized by the task, then pin the resulting remote SHA.
3. Check PR state when it determines the intended source. An open or mergeable PR has not updated the default branch. A merged PR requires fetching the resulting default-branch commit; do not substitute its old feature head or assume the last local `main` is current.
4. Keep each URL tied to its own pinned branch. A request to sync a repository with both a main URL and feature previews means publishing each URL's mapped source, not copying one branch to every URL.

Use connected GitHub tools or authenticated Git/CLI access as available. A connector 404 alone does not establish that a private repository is missing. Try existing authorized access before requesting a new connection. Preserve repository visibility and keep credentials out of arguments, files, logs, and reports.

## Publish every selected target

Follow the existing hosting workflow. For ChatGPT Sites, use the `sites:sites-hosting` skill and its current tools and bundled workflow when available. If the hosting integration is unavailable, finish the source work and report the publication blocker; do not invent a replacement integration. Discover the installed plugin path instead of hardcoding a plugin version in reusable commands.

- Read the target Site and open its current source before editing its publishing checkout. Preserve the selected Site ID, stable URL, and audience.
- A requested separate branch preview needs its own hosting identity and isolated checkout. Create a new Site only for a newly requested URL, not as a repair for an existing deployment.
- Do not deploy a preview to the main site just because the GitHub branch inherited the main site's `.openai/hosting.json`. In the isolated publishing checkout, keep the preview's own project ID and validate that other hosting configuration still matches the intended application.
- Sync the tracked application source from the pinned commit, accounting for deletions as well as additions. A simple overlay copy can retain stale files. Preserve hosting-owned identity/configuration deliberately; inspect differences instead of excluding the entire hosting directory from verification.
- Distinguish the GitHub source commit from the hosting source commit when the latter includes a different project ID. Verify the source files match, with each deployment-specific difference explicitly accounted for.
- Reuse successful checks and unchanged builds. Do not manufacture UI tests for a publication-only operation. Run relevant checks when source, build configuration, or conflict resolution changes.
- Save and deploy the exact prepared source and artifact. Retain version/deployment IDs so a timeout or partial failure can be resumed without creating duplicate Sites or versions. Check status before retrying an uncertain mutation.

If the currently deployed application already matches the selected commit's content, report it as verified current; a redundant deployment is unnecessary. Do not claim to have republished it when no publish occurred.

For several targets, finish each independent, authorized target. Track failures per URL rather than stopping the entire batch. Stop retrying a target when an access failure, conflicting ownership, or an unexplained source divergence needs new information. Report the exact blocker and retain prepared work.

## Verify and report

Check the publication result is successful and has the expected URL. Confirm the deployed version uses the prepared hosting commit/artifact, and that the prepared application source matches the pinned GitHub commit. Use the provider's supported verification path; respect Sites' rule against fetching a deployed URL solely to finish publishing.

Report each selected URL's branch and result: published, already current, or blocked. For multiple URLs, use a compact table. Explain any remaining difference in source or access so “both URLs match” has a precise meaning. Return the URL directly and mention whether future GitHub changes deploy automatically.

## Ongoing synchronization

Honor recorded standing publication preferences for the selected repository. When a task updates a mapped branch, include its authorized publication in the same task; follow the project reference for affected URLs. This agent-run follow-through is separate from unattended deployment.

Installing or invoking this skill does not create a background process. Automatic skill discovery helps future Codex tasks follow this workflow, but it is not a GitHub push trigger.

When the user requests continuing automatic sync, implement and verify a supported hosting integration or deployment workflow for the selected branch and URL. Verify authenticated source access, publication permissions, and a successful triggered run. Use supported secret storage; do not embed temporary Sites write credentials in GitHub workflows or treat a short publication window as permanent authorization.

If only scheduled checking is supported, clearly distinguish it from deployment on every push and establish the cadence before configuring it. Follow the hosting skill's recurring-work requirements. If automation cannot be completed with available access, still finish the current authorized snapshot sync and state the missing prerequisite. Never claim automatic updates are enabled merely because a skill, workflow file, or unverified schedule exists.
