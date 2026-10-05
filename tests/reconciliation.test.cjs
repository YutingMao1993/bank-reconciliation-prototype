const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise accounting and undo state independently of browser rendering.
function model() {
  const elements = new Map();
  const document = { querySelectorAll: () => [], querySelector: () => ({ scrollTop: 0, before() {} }), createElement: () => ({ setAttribute() {} }), getElementById(id) {
    if (!elements.has(id)) elements.set(id, { value: '', innerHTML: '', checked: false, focus() {}, reportValidity: () => true, validity: { valid: true } });
    return elements.get(id);
  } };
  const context = vm.createContext({ document });
  const source = fs.readFileSync(path.join(__dirname, '../dist/app.js'), 'utf8');
  vm.runInContext(source.slice(0, source.indexOf("window.addEventListener('hashchange'")) + `
    render = () => {}; toast = () => {}; closeModal = () => {};
    globalThis.model = { state, items, journalLines, resolve, saveFollowUp, undoLast, balanceSnapshot, openItems, tabItems, reviewList, rejectSuggestion, computeSuggestions, showAdjustment, showOutstanding, showAISuggestionDetail, element: $ };
  `, context);
  return context.model;
}

test('outgoing fees debit expense and credit cash; incoming interest reverses the direction', () => {
  const m = model();
  for (const [amount, account] of [[-45, 'Bank fees'], [12.5, 'Interest income'], [-290, 'Payment processing fees']]) {
    const lines = m.journalLines(amount, account);
    assert.equal(lines.reduce((sum, line) => sum + line.debit - line.credit, 0), 0);
    const cash = lines.find(line => line.account.includes('4821'));
    assert.equal(cash.debit - cash.credit, amount);
    assert.equal(lines.find(line => line.account === account).debit - lines.find(line => line.account === account).credit, -amount);
  }
});

test('saving and editing evidence follow-up never resolves an item or changes cash', () => {
  const m = model();
  const before = JSON.stringify(m.balanceSnapshot());
  const item = m.items.find(item => item.id === 'b2');
  m.saveFollowUp(item, { note: 'Obtain payout report', owner: 'Maya Chen', dueDate: '2026-10-06' });
  m.saveFollowUp(item, { note: 'Ask finance for report', owner: 'Finance', dueDate: '2026-10-07' });
  assert.equal(m.openItems().length, 14);
  assert.equal(m.tabItems('follow-up').length, 1);
  assert.equal(JSON.stringify(m.balanceSnapshot()), before);
  m.undoLast();
  assert.equal(m.state.followUps.b2.owner, 'Maya Chen');
  m.undoLast();
  assert.equal(m.tabItems('follow-up').length, 0);
});

test('resolving a flagged pair clears its follow-up, and undo restores the evidence request', () => {
  const m = model();
  m.saveFollowUp(m.items[2], { note: 'Missing report', owner: 'Maya', dueDate: '2026-10-06' });
  m.resolve(['b2', 'l2'], 'adjustment', 'Fee verified', 'Manual', '', { supportingRef: 'PAYOUT-TEST', journal: m.journalLines(-290, 'Processing fees'), entryDate: 'Sep 28, 2026' });
  assert.equal(m.openItems().length, 12);
  assert.equal(m.state.followUps.b2, undefined);
  assert.equal(m.state.resolved.l2.supportingRef, 'PAYOUT-TEST');
  assert.equal(m.balanceSnapshot().adjustedLedgerCents, 48734686);
  m.undoLast();
  assert.equal(m.openItems().length, 14);
  assert.equal(m.state.followUps.b2.note, 'Missing report');
  assert.equal(m.balanceSnapshot().adjustedLedgerCents, 48763686);
});

test('rejecting a suggestion and undoing it preserves pending follow-up', () => {
  const m = model();
  m.saveFollowUp(m.items[2], { note: 'Missing report', owner: 'Maya', dueDate: '2026-10-06' });
  m.rejectSuggestion(m.computeSuggestions().find(pair => pair.bank.id === 'b2'), 'b2');
  assert.equal(m.openItems().length, 14);
  m.undoLast();
  assert.equal(m.state.followUps.b2.owner, 'Maya');
  assert.equal(m.computeSuggestions().length, 5);
});

test('carry-forward evidence survives review and contributes only to the adjusted bank balance', () => {
  const m = model();
  m.resolve(['l6'], 'timing', 'Deposit in transit', 'Maya', 'Submitted at month end', { supportingRef: '<receipt & reference>', expectedDate: '2026-10-02', owner: 'Maya Chen' });
  assert.equal(m.balanceSnapshot().adjustedBankCents, 48817436);
  assert.equal(m.balanceSnapshot().adjustedLedgerCents, 48763686);
  assert.equal(m.state.resolved.l6.journal, undefined);
  assert.ok(m.reviewList('timing').includes('&lt;receipt &amp; reference&gt;'));
  assert.ok(m.reviewList('timing').includes('2026-10-02'));
  assert.equal(m.state.activity[0].expectedDate, '2026-10-02');
});

test('all supported resolutions still reconcile to $487,314.36 with zero difference', () => {
  const m = model();
  for (const n of [1, 3, 4, 5]) m.resolve([`b${n}`, `l${n}`], 'match', 'Matched');
  m.resolve(['b2', 'l2'], 'adjustment', 'Fee verified');
  for (const id of ['b6', 'b7']) m.resolve([id], 'entry', 'Entry recorded');
  for (const id of ['l6', 'l7']) m.resolve([id], 'timing', 'Carry forward');
  assert.equal(m.openItems().length, 0);
  assert.equal(m.balanceSnapshot().differenceCents, 0);
  assert.equal(m.balanceSnapshot().adjustedBankCents, 48731436);
  assert.equal(m.balanceSnapshot().adjustedLedgerCents, 48731436);
});

test('fee confirmation requires both a nonblank report reference and explicit verification', () => {
  const m = model();
  m.showAdjustment(m.computeSuggestions().find(pair => pair.adjustment));
  const submit = () => m.element('adjustmentForm').onsubmit({ preventDefault() {} });
  submit();
  assert.equal(m.openItems().length, 14);
  m.element('payoutReference').value = '   ';
  m.element('payoutVerified').checked = true;
  m.element('payoutVerified').onchange();
  assert.equal(m.element('confirmAdjustment').disabled, true);
  submit();
  assert.equal(m.openItems().length, 14);
  m.element('payoutReference').value = 'QA-PAYOUT-0928';
  m.element('payoutVerified').checked = false;
  submit();
  assert.equal(m.openItems().length, 14);
  m.element('payoutVerified').checked = true;
  m.element('payoutVerified').onchange();
  assert.equal(m.element('confirmAdjustment').disabled, false);
  submit();
  assert.equal(m.openItems().length, 12);
  assert.equal(m.state.resolved.b2.supportingRef, 'QA-PAYOUT-0928');
});

test('timing confirmation stays disabled until reference and valid clearing date are supplied', () => {
  const m = model();
  m.showOutstanding(m.items.find(item => item.id === 'l6'));
  m.element('timingReference').value = 'QA-DEPOSIT-144';
  m.element('timingReference').oninput();
  assert.equal(m.element('confirmOutstandingBtn').disabled, true);
  m.element('timingDate').value = '2026-09-30';
  m.element('timingDate').validity.valid = false;
  m.element('timingDate').oninput();
  assert.equal(m.element('confirmOutstandingBtn').disabled, true);
  m.element('timingDate').value = '2026-10-02';
  m.element('timingDate').validity.valid = true;
  m.element('timingDate').oninput();
  assert.equal(m.element('confirmOutstandingBtn').disabled, false);
  m.element('timingForm').onsubmit({ preventDefault() {} });
  assert.equal(m.state.resolved.l6.supportingRef, 'QA-DEPOSIT-144');
  assert.equal(m.state.resolved.l6.expectedDate, '2026-10-02');
});

test('inspecting and returning from a pair preserves the underlying queue and accounting state', () => {
  const m = model();
  m.state.selected = 'b6';
  m.state.filter = 'bank-only';
  m.element('search').value = '45';
  m.showAISuggestionDetail('b1');
  m.element('aiDetailFollowUp').onclick();
  m.element('cancelTaskModal').onclick();
  m.element('aiDetailBack').onclick();
  assert.equal(m.state.selected, 'b6');
  assert.equal(m.state.filter, 'bank-only');
  assert.equal(m.element('search').value, '45');
  assert.equal(m.openItems().length, 14);
  assert.equal(m.state.activity.length, 0);
});

test('confirming from inspected details resolves only that pair and keeps the modal available', () => {
  const m = model();
  m.showAISuggestionDetail('b1');
  m.element('aiDetailConfirm').onclick();
  assert.equal(m.openItems().length, 12);
  assert.equal(m.state.resolved.b1.action, 'match');
  assert.equal(m.state.resolved.l1.action, 'match');
  assert.equal(m.computeSuggestions().length, 4);
  assert.equal(m.state.activity.length, 1);
  assert.ok(m.element('modalMount').innerHTML);
  m.undoLast();
  assert.equal(m.openItems().length, 14);
});

test('Stripe inspection keeps fee verification mandatory and canceling returns without changes', () => {
  const m = model();
  m.showAISuggestionDetail('b2');
  m.element('aiDetailConfirm').onclick();
  m.element('adjustmentForm').onsubmit({ preventDefault() {} });
  assert.equal(m.openItems().length, 14);
  m.element('cancelTaskModal').onclick();
  m.element('aiDetailReject').onclick();
  assert.equal(m.openItems().length, 14);
  assert.equal(m.state.resolved.b2, undefined);
  assert.equal(m.computeSuggestions().length, 4);
  assert.equal(m.state.rejectedPairs.has('b2:l2'), true);
});
