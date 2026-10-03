# Bank reconciliation prototype

An interactive design exercise for a staff accountant reconciling a September operating account. The interface uses fictional data and runs as a static site.

## Try the demo

Open `dist/index.html` in a browser, or use the published URL. Start with **AI Match**:

1. Run AI Match to find five possible bank/ledger pairs. Inspect the evidence and confirm a pair. This clears both rows.
2. Record the $45 bank fee and $12.50 interest as missing ledger entries.
3. Mark the $1,900 deposit in transit and $860 outstanding check as October timing differences.
4. Review the balance check, then select **Finish reconciliation**.

The top-level **Open** and **Resolved** tabs each show separate Bank statement and General ledger lists. Search narrows both lists. **Undo** reverses the most recent action, and **Reset demo** restores the starting state. The page keeps state only while it remains open.

## Reconciliation logic

The scenario begins with a $486,274.36 bank statement balance and a $487,346.86 ledger balance. Five suggested pairs each have identical amounts on both sides, so matching them does not change either balance. Recording the bank fee and interest changes the ledger by −$32.50 to $487,314.36. The $1,900 deposit in transit less the $860 outstanding check adjusts the bank balance by +$1,040.00 to the same $487,314.36.

The initial 14 unresolved transactions comprise 10 entries that form five possible pairs, two bank-only transactions, and two ledger-only transactions. The count represents transactions, while **AI suggestions** counts candidate pairs.

AI Match is an explainable, local simulation for the exercise, not a live AI service. It generates pairs from open bank and ledger entries using exact signed amounts, dates within three days, and related description terms. No pair IDs are predefined in the data. Each candidate shows the matching evidence and a review-priority signal. Suggestions never post automatically, and the signal is not a calibrated probability.

## Design decisions

- Put top-level status tabs above separate Bank statement and General ledger queues, with transaction evidence alongside them, so Maya can review context without losing her place.
- Keep AI Match suggestions as recommendations. Maya sees the evidence and confirms each pair because similar amount and date alone are insufficient evidence.
- Distinguish missing book entries from timing differences; these have different accounting treatments.
- Show adjusted balances throughout, but enable finishing only after all 14 transactions have an explicit resolution.
- Preserve an undo path for exploratory review.

## What I would not ship

This prototype has hardcoded transactions, in-memory changes, no bank or ledger integration, no permissions or posting approval, and no durable audit log. AI Match uses local rules and a small hand-authored synonym list; it is not a production matching model. A real product also needs duplicate detection, statement import validation, period locks, clear evidence for each adjustment, review and approval controls, and a next-period queue for timing differences. The final button means ready for review in this demo, not a posted reconciliation.

## Implementation

No dependencies or build step are required. The application is HTML/CSS in `dist/index.html` and JavaScript in `dist/app.js`. The site manifest in `.openai/hosting.json` points hosting to `dist`.

The visual palette and Denim Regular/Medium font were sampled from [Campfire's public website](https://campfire.ai/) in October 2026 for this design exercise. The two font files are included locally so the prototype renders consistently.

## AI tool discussion prompt

For the interview question about code you kept but do not fully understand, inspect `computeSuggestions()`, `render()`, and `resolve()` in `dist/app.js`. Explain how candidate ranking avoids reusing an item and how a confirmed match updates the queue. If any part remains unclear after reviewing it, describe that specific part honestly and how you would verify it before shipping. Do not claim uncertainty you do not actually have.
