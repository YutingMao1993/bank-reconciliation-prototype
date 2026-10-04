---
name: bank-reconciliation-ux
description: Design, build, or review AI-assisted bank reconciliation UX for accountants, including match evidence, exception resolution, progress, and auditability. Use for reconciliation workflows or prototypes, not general accounting advice.
---

# Bank Reconciliation UX

Help an accountant explain and resolve differences between a bank statement and the cash general ledger. Optimize for speed, confidence, and control while preserving accounting meaning.

## Model the work before drawing the interface

- Identify the bank account, reconciliation period, opening and ending balances, transaction sources, and actions the product actually supports. Inspect an existing prototype or brief before changing its logic.
- Treat bank transactions as observed cash movement and ledger entries as recorded accounting activity. An unmatched item is an exception to investigate, not automatically an error.
- Allow one-to-one, many-to-one, and one-to-many relationships when the task calls for them. Do not assume an equal date, description, or amount proves identity.
- For detailed examples of near matches, missing entries, timing items, net deposits, and duplicates, read [exception cases](references/exception-cases.md) when shaping data or resolution flows.

## Structure the review queue

- Make unresolved work easy to find. In the Campfire-style workflow developed here, **Open** and **Resolved** are statuses. **All**, **AI Suggested**, **Bank Only**, and **Ledger Only** filter Open; they are not additional resolution states. All must contain every unresolved transaction.
- A combined list can use clear Bank and Ledger source tags. Keep the selected item's evidence and actions close to the list so the accountant can compare without losing context.
- In this prototype, suggestions and evidence are available on first load and after Reset Demo. Keep the filter labeled **AI Suggested** and the overview action labeled **AI Suggestions**; do not reintroduce a required scan step.
- Distinguish a count of transactions from a count of candidate pairs. Search narrows the current view without silently changing an item's status.
- A rejected AI pair remains Open. Give each transaction its source-appropriate resolution path after **Not a match**.

## Make AI a review aid

- Have AI **find, compare, explain, and recommend**. Show the proposed counterpart, amount, date, vendor or description, reference, and the signals behind the recommendation. Use confidence only when its meaning is defensible; a prototype's heuristic score must not be presented as a calibrated probability.
- Keep confirmation with the accountant for matching, creating or adjusting an entry, excluding an item, and marking a timing difference. Do not silently post an AI suggestion.
- Support rejection, manual search, and review when evidence is weak. Explain amount differences as hypotheses until supporting records are verified.

## Offer accounting-specific resolutions

- For a bank-only transaction, support creating a categorized ledger entry when appropriate. Require the accountant to review the category; offer exclusion only with a reason.
- For a ledger-only transaction, support an outstanding payment or deposit in transit when the timing explanation fits. Carry it forward for later review rather than treating it as deleted or matched.
- Support an adjustment or split when a net settlement includes a fee, and multiple matching entries when the scope requires it. Do not force every exception into Match.
- Keep a clear audit record of who confirmed what, when, and why. Provide Undo or an equally clear recovery path for reversible prototype actions.

## Show when the work is done

- Update the reconciliation summary as actions occur: bank balance, ledger balance, recognized timing items, adjusted balances, and the remaining difference.
- Completion requires every in-scope exception to be explained **and** the adjusted difference to be zero. Legitimate outstanding items may remain unmatched to the current bank statement.
- In a prototype, label simulated AI, journal entries, and audit history as demonstrations. Do not imply a real bank or ledger was updated.

## Apply the design to an existing product

- Honor the user's latest screenshots, supplied assets, brand direction, and requested dimensions. Make focused component changes that fit surrounding typography, spacing, colors, and controls.
- For a B2B sidebar, keep the navigation usable in a short viewport; if it spans the viewport, let the middle menu scroll while the brand and account area remain accessible. Preserve the product's mobile pattern.
- Native form controls may render inconsistent system menus. If replacing one with a custom control, preserve label, focus, keyboard selection, Escape behavior, and disabled-state logic.
- Verify the changed flow in the browser at a normal and a narrow viewport. Check the accounting counts and balances when changing resolution logic.
- When the user requests a distinct preview URL, use a separate hosting identity and verify it points to the intended branch snapshot. Keep source branches and deployments distinct, and state whether later branch commits deploy automatically. Follow the project's existing publication workflow and user preferences; preserve repository visibility unless the user asks to change it.
