# Bank reconciliation prototype

An interactive design exercise for a staff accountant reconciling a September operating account. The interface uses fictional data and runs as a static site.

## Try the demo

Open `dist/index.html` in a browser, or use the published URL. AI suggestions are ready immediately:

1. Review the five possible bank/ledger pairs shown on first load. Open **AI Suggestions** for the overview. **Inspect Details** opens a side-by-side comparison inside the same modal, including each record’s date, reference, account, and matching evidence. **All Suggested Pairs** returns to the list without changing your queue selection, search, or filter. Confirming or rejecting from the detail step returns to the updated suggestions with a result message. Canceling manual matching, follow-up, or fee verification returns to the inspected pair. You can also review a transaction in the main page’s detail panel.
2. Review the Stripe net deposit: the $12,770.75 gross ledger receipt differs from the $12,480.75 bank deposit by $290.00. Select **Review & Record Fee** to inspect the debit/credit preview. Recording the fee requires a supporting report reference and confirmation that the payout identity and amounts were verified. No report is bundled or fetched: use **Report Missing? Save a Follow-up** when evidence is unavailable.
3. For the $45 bank fee and $12.50 interest, select **Create Ledger Entry**. Choose a category and inspect the entry date, debit, credit, and cash impact before selecting **Create & Clear**. The preview updates when the category changes.
4. For the $1,900 deposit and $860 check, select **Mark Deposit in Transit** or **Mark as Outstanding**. Record the supporting reference and an expected clearing date after September 30 before confirming. Missing evidence can instead be saved as a follow-up. Timing resolutions create no new journal entry; their reference, clearing date, and owner appear in the resolved details, activity, and final review.
5. Once all 14 transactions are resolved, **Review Reconciliation** becomes enabled. Open the dedicated review page to inspect balances, matched pairs, adjustments, new entries, exclusions, and carry-forward items.
6. When the balance difference is $0.00, select the review confirmation checkbox and **Approve Reconciliation**. The confirmation page records the demo approval and offers **Undo Approval**. Returning to the reconciliation shows **View Approval** and the approval in Review Activity.

Each AI suggestion offers **Not a match** in both the suggestion list and transaction detail. Rejecting a suggestion keeps both transactions open. Each item can search open transactions on the opposite side for a manual match before choosing another resolution. The manual picker shows amount, date, reference, and previously rejected pairs; different amounts cannot be directly matched in this demo. Bank transactions can create a ledger entry or be excluded; ledger entries can be marked as a timing item or excluded. Exclusion requires a reason, records the decision, and does not change either balance. Undo can reverse a rejected suggestion or a resolution.

Every open item offers **Add Follow-up** for missing evidence. Save the next step, owner, and follow-up date, then find it through the **Follow-up** filter within Open. Flagging an item never changes balances or marks it resolved. Follow-ups can be edited or cleared, are logged in Review Activity, and support Undo. Resolving an item removes its flag; undoing that resolution restores it. No notifications are sent, and all records remain in the demo session only.

**Open** and **Resolved** are the top-level statuses. Open always shows every unresolved transaction when its **All** filter is selected. **AI Suggested** contains transactions with current candidate matches immediately on first load and after Reset Demo; there is no scan step. **Bank only** and **Ledger only** are filters within Open, never separate resolution states. A rejected pair stays in Open so its transactions remain visible for alternative matching or exception review. Each row has a BANK or LEDGER tag. Both the AI Suggested filter and summary card count transactions; the summary subtitle counts candidate pairs. Search narrows the current view. In Resolved, timing items are marked **Carry forward** and remain due for next-period follow-up. Notes appear in Review activity and the resolved item's detail. **Undo** reverses the most recent action, and **Reset demo** restores the starting state. The page keeps state only while it remains open.

## Reconciliation logic

The scenario begins with a $486,274.36 bank statement balance and a $487,636.86 ledger balance. Four direct pairs have identical signed amounts. The Stripe pair requires a $290.00 processing-fee adjustment. Recording that fee plus the $45 bank fee and $12.50 interest changes the ledger by −$322.50 to $487,314.36. Carrying the $1,900 deposit in transit less the $860 outstanding check adjusts the bank balance by +$1,040.00 to the same $487,314.36. The summary changes as Maya resolves each item; finishing requires all 14 transactions to be explained **and** a $0.00 difference. If a suggestion is rejected, the summary instead uses the amounts of any individual entries or timing items Maya confirms.

The initial 14 unresolved transactions comprise 10 entries that form five possible pairs, two bank-only transactions, and two ledger-only transactions. The AI summary count represents transactions; its subtitle reports candidate pairs.

AI Suggestions is an explainable, local simulation for the exercise, not a live AI service. It generates direct pairs from open bank and ledger entries using exact signed amounts, dates within three days, and related description terms. A separate demo rule surfaces a possible Stripe net deposit with a $290.00 difference. No pair IDs are predefined in the data. Each candidate shows evidence and a review-priority signal. The difference is framed as a possible fee until Maya verifies and confirms it. Suggestions never post automatically, and the signal is not a calibrated probability.

## Design decisions

- Put Open and Resolved at the top level, with All and source or suggestion filters inside Open. The combined queue uses BANK and LEDGER tags, with transaction evidence alongside it.
- Use a light, grouped navigation rail inspired by Campfire's product sidebar. Reconciliation appears within an expanded Accounting section; links outside this exercise show a demo-only message.
- Keep AI Match suggestions as recommendations. Maya sees the evidence and can confirm or reject each pair because similar amount and date alone are insufficient evidence.
- Distinguish missing book entries from legitimate timing differences. An unmatched item is not automatically wrong.
- Treat the Stripe amount difference as a proposed adjustment that needs explicit human confirmation.
- Update adjusted balances as actions are taken and enable final review after every item is explained. A remaining balance difference is visible on the review page and blocks approval. Require an explicit review confirmation and a zero difference before recording demo approval.
- Show a session activity log with actor, time and action source, and preserve an undo path.

## What I would not ship

This prototype has hardcoded transactions, in-memory changes, no bank or ledger integration, no permissions or posting approval, and no durable audit log. AI Match uses local rules and a small hand-authored synonym list; it is not a production matching model. The proposed Stripe fee is illustrative and must not be inferred from a real bank deposit without supporting payout evidence. A real product also needs duplicate detection, many-to-one matching, statement import validation, period locks, review and approval controls, and a next-period queue for timing differences. The approval flow is a session-only simulation; it does not post a reconciliation or enforce production approval permissions.

## Implementation

No dependencies or build step are required. The application is HTML/CSS in `dist/index.html` and JavaScript in `dist/app.js`. The site manifest in `.openai/hosting.json` points hosting to `dist`.

Run accounting and history regression checks with `node --test tests/reconciliation.test.cjs`. These cover debit/credit direction, follow-up state, Undo, retained timing evidence, and the final reconciliation balance; browser checks are still needed for interaction and layout.

The visual palette was sampled from [Campfire's public website](https://campfire.ai/) in October 2026 for this design exercise. All interface text uses locally hosted [Inter](https://rsms.me/inter/) Regular and Medium fonts. The original weight mapping is preserved: 400 uses Regular, while 500–900 share the Medium face, matching the previous Denim setup. Its SIL Open Font License is included in `dist/fonts/Inter-LICENSE.txt`.

## AI tool discussion prompt

For the interview question about code you kept but do not fully understand, inspect `computeSuggestions()`, `render()`, and `resolve()` in `dist/app.js`. Explain how candidate ranking avoids reusing an item and how a confirmed match updates the queue. If any part remains unclear after reviewing it, describe that specific part honestly and how you would verify it before shipping. Do not claim uncertainty you do not actually have.

## Guidance for coding agents

Start with [AGENTS.md](AGENTS.md) for project commands, UX constraints, and verification guidance. The repository includes four reusable skills in [.agents/skills](.agents/skills): Bank Reconciliation UX, Maya Bank Reconciliation, Repository URL Sync, and Padding Alignment. Their instructions can be read by any coding agent; tool availability and hosting access depend on the environment.

## User interviews and usability testing with Maya

The [Maya skill](.agents/skills/maya-bank-reconciliation/SKILL.md) simulates a staff accountant at a 120-person software company, working through 14 unmatched transactions in Campfire on the third business day of month-end close.

Start a session with a screenshot or prototype:

> Use $maya-bank-reconciliation. You are Maya. I'll ask interview questions and show you screens. Answer in character and think aloud.

If your agent does not discover repository skills, ask it to read `.agents/skills/maya-bank-reconciliation/SKILL.md` and follow those instructions.

Then ask questions such as:

- “What would you do first?”
- “What does this suggested match mean to you?”
- “What would you expect after clicking ‘Mark as outstanding’?”
- “What information is missing?”

Maya stays in character and uses the evidence shown in the test. Ask “Step out of character and debrief this test” for a separate analysis. Avoid giving the participant the demo walkthrough or implementation details before testing discoverability.

These reactions are simulated hypotheses for research, not findings from real participants. The skill does not itself authorize changes to live accounting records.
