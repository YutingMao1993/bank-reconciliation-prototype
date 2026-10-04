# Repository and URL Mappings

Use these mappings to choose the intended target; verify remote refs, Site ownership, and audience before publication. No GitHub push trigger or background schedule is configured by these files.

- Repository: `YutingMao1993/bank-reconciliation-prototype`
- GitHub: https://github.com/YutingMao1993/bank-reconciliation-prototype
- Default branch: `main`; the user's earlier “master” requests refer to it.
- Repository visibility: public, at the owner's request. Site access is separate; preserve each Site's audience.
- Discover the working checkout from the current environment and Git remote. Use isolated publishing checkouts when a Site needs different hosting metadata.

| Site URL | Intended source | Existing Site project ID | Last known audience |
| --- | --- | --- | --- |
| https://bank-reconciliation-exercise.momoqueen.chatgpt.site/ | `main`, original main site | `appgprj_6ac04c78a608819181975eb7d8b91fb1` | Public |
| https://bank-reconciliation-ux-checklist.momoqueen.chatgpt.site/ | `main`, following the user's request to sync it with the default branch after the UX PR merged | `appgprj_6ac1707b29a481919bd5bbc1faee9e49` | Owner only |
| https://bank-reconciliation-update-title.momoqueen.chatgpt.site/ | `feature/update-title`, dedicated branch preview | `appgprj_6ac18d44ac008191bb107f7e0da63f66` | Owner only |
| https://bank-reconciliation-padding-alignment.momoqueen.chatgpt.site/ | `feature/fix-padding-alignment`, dedicated branch preview | `appgprj_6ac19dd0f6ac81919b8ce8fc1529e9f0` | Owner only |
| https://bank-reconciliation-improve-ai-flow.momoqueen.chatgpt.site/ | `feature/improve-ai-flow`, dedicated branch preview | `appgprj_6ac1b22c6d64819190a66b67e02146c5` | Owner only |
| https://bank-reconciliation-ui-qa.momoqueen.chatgpt.site/ | `feature/ui-qa`, dedicated branch preview | `appgprj_6ac1bfaabf788191a9bcd9083982f441` | Owner only |

The UX checklist URL now follows `main` despite its original feature-branch name. Dedicated feature previews continue to follow their named branches after merge unless the user changes the mapping. Older experiments are outside this active set.

## Hosting identity

This is a static application. `.openai/hosting.json` declares `static.directory` as `dist` and carries the original main Site's project ID. Each preview has its own project ID in its isolated publishing checkout. Preserve the target identity and other hosting settings deliberately. Compare the application files against the selected branch; hosting commits may differ solely because of this metadata.

## Standing publication preference

Include publication when active agent work changes the application on a mapped branch, without requiring a separate sync request. After an authorized merge into `main`, fetch the actual merge commit and update both main-mapped URLs. Creating a PR does not authorize merging it.

A branch without a mapping needs a user-requested preview before creating another Site. Documentation-only changes that do not affect the deployed artifact do not need a new deployment. Honor local-only or no-publish requests.

These instructions govern active agent work. They do not install background automation or grant a contributor access to the owner's hosting account. Verify source and publication access before running unattended work. If Sites tools are unavailable, finish the code task and report that publication could not be performed.
