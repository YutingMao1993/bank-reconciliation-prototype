# Bank reconciliation prototype

An interactive design exercise for a staff accountant reconciling a September operating account. The interface uses fictional data and runs as a static site.

## Try the demo

Open `dist/index.html` in a browser, or use the published URL. Start with **AI Match**:

1. Run AI Match to find five possible bank/ledger pairs. Confirm a direct pair after inspecting its evidence.
2. Review the Stripe net deposit: the $12,770.75 gross ledger receipt differs from the $12,480.75 bank deposit by $290.00. Verify the proposed processing fee and explicitly confirm **Match + record fee**.
3. For the $45 bank fee and $12.50 interest, select **Create ledger entry**. Choose a required category and optionally add a note in the confirmation dialog, then select **Create & Clear**.
4. For the $1,900 deposit and $860 check, select **Resolve this item**, then confirm **Mark Deposit in Transit** or **Mark Outstanding** in the dialog. An optional note records the expected timing.
5. Check the activity log and the $0.00 balance difference, then select **Finish reconciliation**.

Each AI suggestion offers **Not a match** in both the suggestion list and transaction detail. Rejecting a suggestion keeps both transactions open and gives each its own **Resolve this item** choices. Bank transactions can create a ledger entry or be excluded; ledger entries can be marked as a timing item or excluded. Exclusion requires a reason, records the decision, and does not change either balance. Undo can reverse a rejected suggestion or a resolution.

**Open** and **Resolved** are the top-level statuses. Open always shows every unresolved transaction when its **All** filter is selected. **AI Suggested**, **Bank only**, and **Ledger only** are filters within Open, never separate resolution states. Before AI Match runs, AI Suggested contains every open transaction with a **Run AI Match** action; Bank only and Ledger only contain the known exceptions without that action. After the scan, AI Suggested contains transactions with candidate pairs, while the remaining items appear under their source filter. A rejected pair returns to the source filters. Each row has a BANK or LEDGER tag. AI Suggested counts transactions shown in the list, while the summary card counts candidate pairs. Search narrows the current view. Notes appear in Review activity and the resolved item's detail. **Undo** reverses the most recent action, and **Reset demo** restores the starting state. The page keeps state only while it remains open.

## Reconciliation logic

The scenario begins with a $486,274.36 bank statement balance and a $487,636.86 ledger balance. Four direct pairs have identical signed amounts. The Stripe pair requires a $290.00 processing-fee adjustment. Recording that fee plus the $45 bank fee and $12.50 interest changes the ledger by −$322.50 to $487,314.36. Carrying the $1,900 deposit in transit less the $860 outstanding check adjusts the bank balance by +$1,040.00 to the same $487,314.36. The summary changes as Maya resolves each item; finishing requires all 14 transactions to be explained **and** a $0.00 difference. If a suggestion is rejected, the summary instead uses the amounts of any individual entries or timing items Maya confirms.

The initial 14 unresolved transactions comprise 10 entries that form five possible pairs, two bank-only transactions, and two ledger-only transactions. The count represents transactions, while **AI suggestions** counts candidate pairs.

AI Match is an explainable, local simulation for the exercise, not a live AI service. It generates direct pairs from open bank and ledger entries using exact signed amounts, dates within three days, and related description terms. A separate demo rule surfaces a possible Stripe net deposit with a $290.00 difference. No pair IDs are predefined in the data. Each candidate shows evidence and a review-priority signal. The difference is framed as a possible fee until Maya verifies and confirms it. Suggestions never post automatically, and the signal is not a calibrated probability.

## Design decisions

- Put Open and Resolved at the top level, with All and source or suggestion filters inside Open. The combined queue uses BANK and LEDGER tags, with transaction evidence alongside it.
- Keep AI Match suggestions as recommendations. Maya sees the evidence and can confirm or reject each pair because similar amount and date alone are insufficient evidence.
- Distinguish missing book entries from legitimate timing differences. An unmatched item is not automatically wrong.
- Treat the Stripe amount difference as a proposed adjustment that needs explicit human confirmation.
- Update adjusted balances as actions are taken and enable finishing only after every item is explained and the difference is zero.
- Show a session activity log with actor, time and action source, and preserve an undo path.

## What I would not ship

This prototype has hardcoded transactions, in-memory changes, no bank or ledger integration, no permissions or posting approval, and no durable audit log. AI Match uses local rules and a small hand-authored synonym list; it is not a production matching model. The proposed Stripe fee is illustrative and must not be inferred from a real bank deposit without supporting payout evidence. A real product also needs duplicate detection, many-to-one matching, statement import validation, period locks, review and approval controls, and a next-period queue for timing differences. The final button means ready for review in this demo, not a posted reconciliation.

## Implementation

No dependencies or build step are required. The application is HTML/CSS in `dist/index.html` and JavaScript in `dist/app.js`. The site manifest in `.openai/hosting.json` points hosting to `dist`.

The visual palette and Denim Regular/Medium font were sampled from [Campfire's public website](https://campfire.ai/) in October 2026 for this design exercise. The two font files are included locally so the prototype renders consistently.

## AI tool discussion prompt

For the interview question about code you kept but do not fully understand, inspect `computeSuggestions()`, `render()`, and `resolve()` in `dist/app.js`. Explain how candidate ranking avoids reusing an item and how a confirmed match updates the queue. If any part remains unclear after reviewing it, describe that specific part honestly and how you would verify it before shipping. Do not claim uncertainty you do not actually have.
