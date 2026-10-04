# Reconciliation exception cases

Use these as patterns when selecting realistic sample data or deciding which actions an item needs. Adapt names, values, dates, accounts, and counts to the current brief. They are examples, not rules for automatic posting.

| Situation | Evidence to inspect | Possible resolution |
| --- | --- | --- |
| Near match: "AWS" at the bank and "Amazon Web Services" in the ledger, equal signed amount, one day apart | Amount, merchant identity, date tolerance, reference, prior pattern | Suggest a match with reasons; accountant confirms or rejects |
| Bank fee or interest with no ledger entry | Statement source, amount, period, account category | Create a categorized ledger entry after review |
| Ledger payment absent from the bank | Check or payment status, issue date, settlement window | Mark outstanding and carry forward |
| Ledger deposit absent from the bank | Deposit date, batch details, settlement window | Mark deposit in transit and carry forward |
| Bank settlement differs from a gross ledger receipt | Processor payout report, fees, refunds, batch composition | Match with a verified adjustment or split; otherwise investigate |
| Duplicate or incorrect ledger entry | Entry IDs, posting history, source documents | Review and correct, void, or reverse through the supported workflow |
| One bank deposit relates to several ledger entries | Sum of signed amounts, batch or remittance references | Match multiple entries when supported |

Date tolerance and description similarity can surface candidates, but neither establishes that money moved for the same business event. A slightly different amount can signal a fee, refund, currency effect, or an unrelated transaction.

For a compact demo, choose a few cases that show different decisions: a well-supported match, a bank-only entry, a timing item, and an ambiguous case. Keep counts and balance arithmetic internally consistent. A completion state should show why the adjusted bank and ledger balances agree, not merely that the Open list is empty.
