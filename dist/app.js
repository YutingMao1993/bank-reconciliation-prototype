// Fictional transactions for an interactive design exercise. No accounting data leaves this page.
const items = [
  { id: 'b1', side: 'bank', date: 'Sep 30', name: 'ATLASSIAN CLOUD', amount: -840, ref: 'ACH 447198' },
  { id: 'l1', side: 'ledger', date: 'Sep 29', name: 'Atlassian subscription', amount: -840, ref: 'Bill payment · AP-2041' },
  { id: 'b2', side: 'bank', date: 'Sep 28', name: 'STRIPE PAYOUT 09/28', amount: 12480.75, ref: 'Transfer 884201' },
  { id: 'l2', side: 'ledger', date: 'Sep 27', name: 'September customer receipts (gross)', amount: 12770.75, ref: 'Deposit · DEP-138' },
  { id: 'b3', side: 'bank', date: 'Sep 24', name: 'AMZN AWS EMEA', amount: -3281.24, ref: 'Card ending 9910' },
  { id: 'l3', side: 'ledger', date: 'Sep 23', name: 'AWS infrastructure', amount: -3281.24, ref: 'Expense · EXP-441' },
  { id: 'b4', side: 'bank', date: 'Sep 19', name: 'GUSTO PAYROLL', amount: -42560, ref: 'ACH 992114' },
  { id: 'l4', side: 'ledger', date: 'Sep 18', name: 'September payroll', amount: -42560, ref: 'Journal · PAY-0918' },
  { id: 'b5', side: 'bank', date: 'Sep 12', name: 'NOTION LABS INC', amount: -196, ref: 'Card ending 9910' },
  { id: 'l5', side: 'ledger', date: 'Sep 11', name: 'Notion team plan', amount: -196, ref: 'Expense · EXP-415' },
  { id: 'b6', side: 'bank', date: 'Sep 30', name: 'Monthly service fee', amount: -45, ref: 'Bank fee · FEE-09', kind: 'fee' },
  { id: 'b7', side: 'bank', date: 'Sep 30', name: 'Interest earned', amount: 12.50, ref: 'Bank credit · INT-09', kind: 'interest' },
  { id: 'l6', side: 'ledger', date: 'Sep 30', name: 'Customer deposit · Meridian', amount: 1900, ref: 'Deposit · DEP-144', kind: 'deposit' },
  { id: 'l7', side: 'ledger', date: 'Sep 29', name: 'Office supplies check', amount: -860, ref: 'Check · #1048', kind: 'check' }
];

const state = { resolved: {}, followUps: {}, rejectedPairs: new Set(), selected: 'b1', tab: 'open', filter: 'open', history: [], activity: [], completed: false, toastTimer: null };
const $ = id => document.getElementById(id);
const money = amount => `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const listMoney = amount => amount < 0 ? `(${money(-amount)})` : `+${money(amount)}`;
const signedMoney = amount => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const openItems = () => items.filter(item => !state.resolved[item.id]);
const dateNumber = item => Number(item.date.split(' ')[1]);
const pairKey = (bankId, ledgerId) => `${bankId}:${ledgerId}`;
const rejectedFor = item => [...state.rejectedPairs].some(key => key.split(':').includes(item.id));

// An explainable local matcher for the demo. The list contains no preset pair IDs.
function nameTokens(name) {
  const aliases = { amzn: 'aws', gusto: 'payroll' };
  const stop = new Set(['cloud', 'inc', 'labs', 'team', 'september', 'subscription', 'infrastructure', 'customer', 'emea', 'plan']);
  return new Set(name.toLowerCase().match(/[a-z]+/g)?.map(word => aliases[word] || word).filter(word => !stop.has(word)) || []);
}

function computeCandidates() {
  const bank = openItems().filter(item => item.side === 'bank' && !item.kind);
  const ledger = openItems().filter(item => item.side === 'ledger' && !item.kind);
  const candidates = [];
  for (const b of bank) {
    for (const l of ledger) {
      if (state.rejectedPairs.has(pairKey(b.id, l.id))) continue;
      const gap = Math.abs(dateNumber(b) - dateNumber(l));
      if (gap > 3) continue;
      const difference = Math.round((l.amount - b.amount) * 100) / 100;
      const exact = Math.abs(difference) < 0.005;
      const possibleNetDeposit = b.amount > 0 && l.amount > b.amount && difference / l.amount < 0.05 &&
        b.name.toLowerCase().includes('stripe') && l.name.toLowerCase().includes('receipts');
      if (!exact && !possibleNetDeposit) continue;
      const shared = [...nameTokens(b.name)].filter(token => nameTokens(l.name).has(token));
      const score = possibleNetDeposit ? 72 : 75 + (gap <= 1 ? 12 : gap === 2 ? 8 : 4) + (shared.length ? 8 : 0);
      candidates.push({ bank: b, ledger: l, score, gap, shared, difference, adjustment: possibleNetDeposit,
        strength: possibleNetDeposit ? 'Needs Adjustment' : score >= 90 ? 'Strong Signal' : 'Review Carefully' });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.gap - b.gap);
  return candidates;
}
function computeSuggestions() {
  const used = new Set();
  return computeCandidates().filter(candidate => {
    if (used.has(candidate.bank.id) || used.has(candidate.ledger.id)) return false;
    used.add(candidate.bank.id);
    used.add(candidate.ledger.id);
    return true;
  });
}

function visibleSuggestions() { return computeSuggestions(); }
function suggestionFor(item) { return visibleSuggestions().find(s => s.bank.id === item.id || s.ledger.id === item.id); }
function aiFilterIds() {
  return new Set(visibleSuggestions().flatMap(s => [s.bank.id, s.ledger.id]));
}
function tabItems(tab) {
  if (tab === 'resolved') return items.filter(item => !!state.resolved[item.id]);
  const open = openItems();
  if (tab === 'follow-up') return open.filter(item => state.followUps[item.id]);
  if (tab === 'suggested') {
    const suggestedIds = aiFilterIds();
    return open.filter(item => suggestedIds.has(item.id));
  }
  if (tab === 'bank-only' || tab === 'ledger-only') {
    const suggestedIds = aiFilterIds();
    return open.filter(item => item.side === (tab === 'bank-only' ? 'bank' : 'ledger') &&
      !suggestedIds.has(item.id));
  }
  return open;
}
function viewItems() { return tabItems(state.tab === 'resolved' ? 'resolved' : state.filter); }
function displayItems() {
  const query = $('search').value.trim().toLowerCase();
  return viewItems().filter(item => `${item.name} ${item.ref} ${item.amount}`.toLowerCase().includes(query));
}
function selectNextInTab() {
  const next = displayItems()[0];
  if (next) { state.selected = next.id; return; }
  if (state.tab === 'open' && !openItems().length) {
    state.tab = 'resolved';
    state.selected = displayItems()[0]?.id || null;
  } else {
    state.selected = null;
  }
}
function evidence(s) {
  const date = `${s.gap} day${s.gap === 1 ? '' : 's'} apart`;
  if (s.adjustment) return `Gross ledger ${money(s.ledger.amount)} − net bank ${money(s.bank.amount)} = ${money(s.difference)} difference · ${date} · Possible processing fee; verify before recording`;
  return `Exact amount · ${date}${s.shared.length ? ` · Related description: ${s.shared.join(', ')}` : ' · Descriptions differ; inspect both records'}`;
}

function saveHistory() {
  state.history.push({ resolved: { ...state.resolved }, followUps: { ...state.followUps }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, filter: state.filter, selected: state.selected, completed: state.completed });
}

function resolve(ids, action, label, origin = 'Manual review', note = '', details = {}) {
  saveHistory();
  state.completed = false;
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  ids.forEach(id => {
    state.resolved[id] = { action, label, time, origin, note, ...details };
    delete state.followUps[id];
  });
  state.activity.unshift({ label, origin, time, actor: 'Maya Chen', note, ...details });
  selectNextInTab();
  render();
  toast(label, true);
}

function rejectSuggestion(suggestion, selectedId) {
  saveHistory();
  state.rejectedPairs.add(pairKey(suggestion.bank.id, suggestion.ledger.id));
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  state.activity.unshift({ label: `Rejected suggested match: ${suggestion.bank.name} ↔ ${suggestion.ledger.name}`, origin: 'AI suggested · Maya rejected', time, actor: 'Maya Chen', note: '' });
  state.selected = selectedId;
  state.tab = 'open';
  state.filter = 'open';
  $('search').value = '';
  closeModal();
  render();
  toast('Suggestion rejected. Search for another match or resolve each item.', true);
}

function undoLast() {
  const previous = state.history.pop();
  if (!previous) return;
  state.resolved = previous.resolved;
  state.followUps = previous.followUps;
  state.rejectedPairs = previous.rejectedPairs;
  state.activity = previous.activity;
  state.tab = previous.tab;
  state.filter = previous.filter;
  state.selected = previous.selected;
  state.completed = previous.completed;
  closeModal();
  render();
  toast('Last action undone');
}

function toast(message, undo = false) {
  clearTimeout(state.toastTimer);
  $('toastMount').innerHTML = `<div class="toast">${message}${undo ? '<button id="undoBtn" type="button">Undo</button>' : ''}</div>`;
  if (undo) $('undoBtn').onclick = undoLast;
  state.toastTimer = setTimeout(() => $('toastMount').innerHTML = '', 5000);
}

function balanceSnapshot() {
  const bankCents = 48627436;
  const timingCents = items.filter(item => item.side === 'ledger' && state.resolved[item.id]?.action === 'timing')
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const adjustedBankCents = bankCents + timingCents;
  const entryCents = items.filter(item => item.side === 'bank' && state.resolved[item.id]?.action === 'entry')
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const adjustmentCents = state.resolved.b2?.action === 'adjustment' ? 29000 : 0;
  const adjustedLedgerCents = 48763686 + entryCents - adjustmentCents;
  return { timingCents, adjustedBankCents, adjustedLedgerCents, differenceCents: adjustedLedgerCents - adjustedBankCents };
}

function renderActivity() {
  $('activityCount').textContent = `${state.activity.length} action${state.activity.length === 1 ? '' : 's'}`;
  $('activityList').innerHTML = state.activity.length ? state.activity.map(entry => `<div class="activity-row"><div><strong>${escapeHTML(entry.label)}</strong><br><span>${escapeHTML(entry.actor)} · ${escapeHTML(entry.origin)}</span>${entry.note ? `<p class="activity-note">Note: ${escapeHTML(entry.note)}</p>` : ''}${recordDetails(entry)}</div><span>${entry.time}</span></div>`).join('') : '<div class="empty-activity">Actions will appear here as you review items.</div>';
}

function render() {
  const open = openItems();
  const resolved = items.length - open.length;
  const suggestions = visibleSuggestions();
  const suggestedTransactions = tabItems('suggested').length;
  $('progressNum').textContent = `${resolved} of 14`;
  $('progressSub').textContent = state.completed ? 'Approved in this demo' : resolved === 14 ? 'All transactions reviewed' : `${open.length} transaction${open.length === 1 ? '' : 's'} need attention`;
  $('progressFill').style.width = `${resolved / 14 * 100}%`;
  $('sideCount').textContent = open.length;
  $('suggestedCount').textContent = suggestedTransactions;
  $('suggestedSummaryLabel').textContent = 'AI Suggested';
  $('pairSub').textContent = suggestions.length ? `${suggestions.length} pair${suggestions.length === 1 ? '' : 's'} to review · ${suggestedTransactions} transactions` : 'No suggestions remain';
  $('bankCount').textContent = tabItems('bank-only').length;
  $('ledgerCount').textContent = tabItems('ledger-only').length;
  $('bankSub').textContent = 'Find a match or create an entry';
  $('ledgerSub').textContent = 'Find a match or review timing';
  $('openTabCount').textContent = open.length;
  $('allFilterCount').textContent = open.length;
  $('suggestedTabCount').textContent = suggestedTransactions;
  $('suggestedFilterLabel').textContent = 'AI Suggested';
  $('bankOnlyTabCount').textContent = tabItems('bank-only').length;
  $('ledgerOnlyTabCount').textContent = tabItems('ledger-only').length;
  $('followUpCount').textContent = tabItems('follow-up').length;
  $('resolvedTabCount').textContent = resolved;
  $('aiMatchBtn').textContent = `✦ AI Suggestions · ${suggestions.length}`;
  $('aiMatchBtn').disabled = open.length === 0;
  const balance = balanceSnapshot();
  $('finishBtn').disabled = open.length !== 0;
  $('finishBtn').setAttribute('aria-describedby', 'finishHint');
  $('finishHint').textContent = open.length ? `Resolve all ${items.length} transactions to enable review.` : state.completed ? 'Approval recorded in this demo session.' : balance.differenceCents ? 'All transactions resolved. Review the remaining balance difference before approval.' : 'All transactions resolved and balances agree. Ready for your review.';
  $('finishBtn').textContent = state.completed ? 'View Approval' : 'Review Reconciliation';
  $('timingTotal').textContent = signedMoney(balance.timingCents / 100);
  $('adjustedBank').textContent = money(balance.adjustedBankCents / 100);
  $('adjustedLedger').textContent = money(balance.adjustedLedgerCents / 100);
  $('balanceDifference').textContent = money(Math.abs(balance.differenceCents) / 100);
  $('balanceDifference').className = balance.differenceCents === 0 ? 'difference-clear' : 'difference-open';
  $('balanceStatus').textContent = state.completed ? 'Approved in demo · $0.00 difference' : balance.differenceCents === 0 ?
    (open.length ? `Balances agree · ${open.length} items still need review` : 'All items explained · $0.00 difference') :
    `${money(Math.abs(balance.differenceCents) / 100)} difference · ${open.length} items open`;
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === state.tab);
    tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab));
  });
  $('openFilters').hidden = state.tab === 'resolved';
  document.querySelectorAll('.filter-pill').forEach(button => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderList();
  renderDetail();
  renderActivity();
  renderReviewRoute();
}

function rowBadge(item) {
  if (state.resolved[item.id]) return state.resolved[item.id].action === 'timing' ? 'Carry Forward' : state.resolved[item.id].action === 'exclude' ? 'Excluded' : 'Resolved';
  if (state.followUps[item.id]) return 'Follow-up Needed';
  const suggestion = suggestionFor(item);
  if (suggestion) return suggestion.adjustment ? 'Review Adjustment' : 'AI Suggested';
  if (item.kind) return item.side === 'bank' ? 'Create Entry' : item.amount < 0 ? 'Outstanding' : 'In Transit';
  return 'Review Options';
}

function renderList() {
  const query = $('search').value.trim();
  const shown = displayItems().sort((a, b) => a.side === b.side ? dateNumber(b) - dateNumber(a) : a.side === 'bank' ? -1 : 1);
  const label = state.tab === 'resolved' ? 'resolved' : state.filter;
  const carryCount = state.tab === 'resolved' ? shown.filter(item => state.resolved[item.id]?.action === 'timing').length : 0;
  $('transactionsVisibleCount').textContent = `${shown.length} ${label}${carryCount ? ` · ${carryCount} carry forward` : ''}`;
  $('transactionList').innerHTML = shown.length ? shown.map(item => `<button type="button" class="row combined-row ${state.selected === item.id ? 'selected' : ''} ${state.resolved[item.id] ? 'resolved' : ''}" data-id="${item.id}" aria-label="${item.side === 'bank' ? 'Bank Statement' : 'General Ledger'}: ${item.name}, ${money(item.amount)}">
    <span class="combined-main"><span class="combined-title"><span class="source-chip ${item.side}">${item.side === 'bank' ? 'BANK' : 'LEDGER'}</span><span class="row-title">${item.name}</span></span><span class="row-meta">${item.date} &nbsp; ${item.ref}</span></span>
    <span class="combined-right"><span class="amount ${item.amount < 0 ? 'negative' : 'positive'}">${listMoney(item.amount)}</span><span class="badge ${state.resolved[item.id] ? 'done' : ''}">${rowBadge(item)}</span></span>
  </button>`).join('') : `<div class="empty-list">${query ? 'No transactions match this search.' : `No transactions in ${label}.`}</div>`;
  document.querySelectorAll('.row').forEach(row => row.onclick = () => { state.selected = row.dataset.id; render(); });
}

function renderDetail() {
  closeCategoryPicker();
  const item = items.find(entry => entry.id === state.selected);
  if (!item) {
    $('detailIndex').textContent = '';
    $('detailBody').innerHTML = `<p class="small-muted">${state.tab === 'resolved' ? 'No resolved transactions yet.' : 'No transactions in this view.'}</p>`;
    return;
  }
  $('detailIndex').textContent = `Item ${items.indexOf(item) + 1} of 14`;
  const suggestion = suggestionFor(item);
  const partner = suggestion && (suggestion.bank.id === item.id ? suggestion.ledger : suggestion.bank);
  let body = `<span class="source-tag ${item.side === 'bank' ? 'bank' : ''}">${item.side === 'bank' ? 'Bank Statement' : 'General Ledger'}</span>
    <div class="detail-title">${item.name}</div><div class="detail-amount">${money(item.amount)}</div>
    <div class="facts"><div class="fact"><span>Date</span><strong>${item.date}, 2026</strong></div><div class="fact"><span>Reference</span><strong>${item.ref}</strong></div><div class="fact"><span>Account</span><strong>Operating ·•• 4821</strong></div></div><div class="rule"></div>`;
  if (state.resolved[item.id]) {
    const result = state.resolved[item.id];
    body += `<div class="resolved-card"><strong>${result.action === 'timing' ? '↗ Carry Forward' : '✓ Resolved'} · ${escapeHTML(result.label)}</strong><br>Reviewed by Maya Chen at ${result.time}. ${result.action === 'adjustment' ? 'Both sides were matched and a $290.00 processing fee was recorded in this demo.' : result.action === 'match' ? 'Both sides were cleared together.' : result.action === 'exclude' ? 'Excluded from this review with a recorded reason. No balance adjustment was made.' : item.side === 'bank' ? 'A corresponding ledger entry was added in this demo.' : 'This timing item remains open for next-period follow-up; it has not cleared the bank.'}${result.note ? `<div class="resolved-note">Note: ${escapeHTML(result.note)}</div>` : ''}${recordDetails(result)}${result.journal ? journalPreview(result.journal, result.entryDate) : ''}</div><div class="actionrow"><button class="ghost" id="undoDetail" type="button">Undo Last Action</button></div>`;
  } else if (partner && suggestion.adjustment) {
    body += `<div class="section-title">✦ AI Suggestion <span class="signal adjust" style="margin-left:7px">Needs Adjustment</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank Statement' : 'General Ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="rule"></div><div class="section-title">Review Proposed Fee Entry</div><div class="adjustment-box"><strong>Possible Net Deposit</strong><p>The $290.00 difference may be a processing fee. Verify it against the payout report before confirming.</p><div class="balance-preview"><span>Gross Ledger Receipt</span><span>$12,770.75</span></div><div class="balance-preview"><span>Proposed Processing Fee</span><span>−$290.00</span></div><div class="balance-preview"><span>Bank Deposit</span><span>$12,480.75</span></div></div>
      <p class="info">No payout report is attached. Record your supporting reference after checking the report, or add a follow-up below.</p><div class="actionrow"><button class="primary" id="adjustBtn" type="button">Review &amp; Record Fee</button><button class="ghost" id="findMatchBtn" type="button">Find Another Match</button><button class="ghost" id="notMatchBtn" type="button">Not a Match</button></div>`;
  } else if (partner) {
    body += `<div class="section-title">✦ AI Match Suggestion <span class="signal ${suggestion.score < 90 ? 'review' : ''}" style="margin-left:7px">${suggestion.strength}</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank Statement' : 'General Ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="explain">This is a suggestion, not an automatic posting. Confirm the transaction identity before matching.</div><div class="actionrow"><button class="primary" id="matchBtn" type="button">Confirm Match</button><button class="ghost" id="findMatchBtn" type="button">Find Another Match</button><button class="ghost" id="notMatchBtn" type="button">Not a Match</button></div>`;
  } else if (item.side === 'bank') {
    const account = item.kind === 'fee' ? 'Bank fees' : item.kind === 'interest' ? 'Interest income' : item.amount < 0 ? 'Operating expense' : 'Other income';
    body += `${rejectedFor(item) ? '<p class="rejected-info">AI suggestion marked “Not a match.” Search for another ledger entry before creating one.</p>' : ''}<div class="section-title resolve-kicker">Resolve This Item</div><div class="resolution-actions"><button class="resolution-button" id="findMatchBtn" type="button">Find Ledger Match</button><button class="resolution-button" id="openEntryBtn" type="button">Create Ledger Entry</button><button class="resolution-button danger" id="openExcludeBtn" type="button">Exclude</button></div><p class="info">Suggested category: ${account}. Confirm the account before creating an entry.</p>`;
  } else {
    body += `${rejectedFor(item) ? '<p class="rejected-info">AI suggestion marked “Not a match.” Search for another bank transaction before carrying this forward.</p>' : ''}<div class="section-title resolve-kicker">Resolve This Item</div><div class="resolution-actions"><button class="resolution-button" id="findMatchBtn" type="button">Find Bank Match</button><button class="resolution-button" id="openOutstandingBtn" type="button">${item.amount > 0 ? 'Mark Deposit in Transit' : 'Mark as Outstanding'}</button><button class="resolution-button danger" id="openExcludeBtn" type="button">Exclude</button></div><p class="info">This item will carry forward if marked as a timing difference.</p>`;
  }
  if (!state.resolved[item.id]) body += followUpCard(item);
  $('detailBody').innerHTML = body;
  if ($('followUpBtn')) $('followUpBtn').onclick = () => showFollowUp(item);
  if ($('clearFollowUpBtn')) $('clearFollowUpBtn').onclick = () => {
    saveHistory();
    delete state.followUps[item.id];
    state.activity.unshift({ label: `Cleared follow-up flag: ${item.name}`, origin: 'Transaction remains open', actor: 'Maya Chen', time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), note: '' });
    if (state.filter === 'follow-up') selectNextInTab();
    render();
    toast('Follow-up flag cleared. Transaction remains open.', true);
  };
  if ($('matchBtn')) $('matchBtn').onclick = () => resolve([item.id, partner.id], 'match', `Matched ${item.name} with ${partner.name}`, 'AI suggested · Maya confirmed');
  if ($('adjustBtn')) $('adjustBtn').onclick = () => showAdjustment(suggestion);
  if ($('findMatchBtn')) $('findMatchBtn').onclick = () => showManualMatch(item);
  if ($('notMatchBtn')) $('notMatchBtn').onclick = () => rejectSuggestion(suggestion, item.id);
  if ($('openEntryBtn')) $('openEntryBtn').onclick = () => showCreateEntry(item);
  if ($('openOutstandingBtn')) $('openOutstandingBtn').onclick = () => showOutstanding(item);
  if ($('openExcludeBtn')) $('openExcludeBtn').onclick = () => showExclude(item);
  if ($('undoDetail')) $('undoDetail').onclick = undoLast;
}

function closeModal() { closeDatePicker(); closeCategoryPicker(); $('modalMount').innerHTML = ''; }

function showManualMatch(item, onCancel = closeModal, onComplete = closeModal) {
  const opposite = item.side === 'bank' ? 'ledger' : 'bank';
  const candidates = openItems().filter(candidate => candidate.side === opposite && candidate.id !== item.id)
    .sort((a, b) => Math.abs(a.amount - item.amount) - Math.abs(b.amount - item.amount) || Math.abs(dateNumber(a) - dateNumber(item)) - Math.abs(dateNumber(b) - dateNumber(item)));
  let selected = null;
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal match-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Find ${opposite === 'bank' ? 'Bank' : 'Ledger'} Match</h2><p class="task-subtitle">Compare an open ${opposite === 'bank' ? 'bank transaction' : 'ledger entry'} with <strong>${escapeHTML(item.name)} · ${money(item.amount)}</strong>.</p><label class="task-field" for="matchSearch">Search Open ${opposite === 'bank' ? 'Bank Transactions' : 'Ledger Entries'}<input id="matchSearch" type="search" placeholder="Name, reference, amount or date" /></label><div class="manual-match-list" id="manualMatchList"></div><div class="manual-match-review" id="manualMatchReview" aria-live="polite">Select an exact-amount counterpart to review the match.</div><div class="task-actions"><button class="primary" id="confirmManualMatch" type="button" disabled>Confirm Manual Match</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div><p class="task-hint">Different amounts need a reviewed adjustment. This demo does not create one through manual matching.</p></div></div>`;
  const renderOptions = () => {
    const query = $('matchSearch').value.trim().toLowerCase();
    const shown = candidates.filter(candidate => `${candidate.name} ${candidate.ref} ${candidate.amount} ${candidate.date}`.toLowerCase().includes(query));
    $('manualMatchList').innerHTML = shown.length ? shown.map(candidate => {
      const bankId = item.side === 'bank' ? item.id : candidate.id;
      const ledgerId = item.side === 'ledger' ? item.id : candidate.id;
      const rejected = state.rejectedPairs.has(pairKey(bankId, ledgerId));
      const exact = Math.round(candidate.amount * 100) === Math.round(item.amount * 100);
      const plausible = computeCandidates().some(pair => pair.bank.id === bankId && pair.ledger.id === ledgerId);
      const reason = rejected ? 'Previously rejected · reconsider with care' : exact ? plausible ? 'Exact amount · related date or description' : 'Exact amount · review identity' : 'Amount differs · adjustment needed';
      return `<button class="manual-match-option ${selected?.id === candidate.id ? 'selected' : ''}" type="button" data-match-id="${candidate.id}" ${!exact ? 'disabled' : ''}><span><strong>${escapeHTML(candidate.name)}</strong><small>${candidate.date} · ${escapeHTML(candidate.ref)}<br>${reason}</small></span><b>${money(candidate.amount)}</b></button>`;
    }).join('') : '<p class="empty-list">No open counterparts match this search.</p>';
    document.querySelectorAll('[data-match-id]').forEach(button => button.onclick = () => {
      selected = candidates.find(candidate => candidate.id === button.dataset.matchId);
      $('confirmManualMatch').disabled = !selected;
      const bankId = item.side === 'bank' ? item.id : selected.id;
      const ledgerId = item.side === 'ledger' ? item.id : selected.id;
      const reconsider = state.rejectedPairs.has(pairKey(bankId, ledgerId));
      $('manualMatchReview').innerHTML = `<strong>${reconsider ? 'Previously rejected — verify why before confirming' : 'Review identity before confirming'}</strong><br>${escapeHTML(item.name)} · ${item.date} · ${escapeHTML(item.ref)} · ${money(item.amount)}<br>↔ ${escapeHTML(selected.name)} · ${selected.date} · ${escapeHTML(selected.ref)} · ${money(selected.amount)}`;
      renderOptions();
    });
  };
  $('matchSearch').oninput = () => {
    selected = null;
    $('confirmManualMatch').disabled = true;
    $('manualMatchReview').textContent = 'Select an exact-amount counterpart to review the match.';
    renderOptions();
  };
  $('confirmManualMatch').onclick = () => {
    if (!selected || !openItems().some(candidate => candidate.id === selected.id)) return;
    const bankId = item.side === 'bank' ? item.id : selected.id;
    const ledgerId = item.side === 'ledger' ? item.id : selected.id;
    resolve([item.id, selected.id], 'match', `Matched ${item.name} with ${selected.name}`, 'Manual match · Maya confirmed');
    state.rejectedPairs.delete(pairKey(bankId, ledgerId));
    render();
    onComplete();
  };
  $('cancelTaskModal').onclick = onCancel;
  renderOptions();
  $('matchSearch').focus();
}

let closeCategoryPicker = () => {};

function bindCategoryPicker(id, onChange = () => {}) {
  const trigger = $(id + 'Trigger');
  const options = $(id + 'Options');
  const picker = trigger.parentElement;
  const choices = [...options.querySelectorAll('.category-option')];
  const onOutsideClick = event => { if (!picker.contains(event.target)) setOpen(false); };
  const setOpen = (open, focusOption = false) => {
    if (open) closeCategoryPicker();
    options.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    document.removeEventListener('click', onOutsideClick);
    if (open) {
      closeCategoryPicker = () => setOpen(false);
      document.addEventListener('click', onOutsideClick);
      if (focusOption) (choices.find(option => option.getAttribute('aria-selected') === 'true') || choices[0]).focus();
    }
  };
  trigger.onclick = () => setOpen(options.hidden, options.hidden);
  trigger.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      choices[event.key === 'ArrowDown' ? 0 : choices.length - 1].focus();
    }
  };
  choices.forEach((choice, index) => {
    choice.tabIndex = -1;
    choice.onclick = () => {
      $(id).value = choice.dataset.value;
      $(id + 'Value').textContent = choice.dataset.value;
      choices.forEach(option => option.setAttribute('aria-selected', String(option === choice)));
      onChange(choice.dataset.value);
      setOpen(false);
      trigger.focus();
    };
    choice.onkeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        trigger.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
        choices[next].focus();
      }
    };
  });
  picker.onfocusout = () => requestAnimationFrame(() => {
    if (!picker.contains(document.activeElement)) setOpen(false);
  });
}

// Keep date-only values in local time, avoiding timezone shifts and overflow dates.
function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
function calendarDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function datePickerField(id, label, value = '') {
  return `<div class="task-field"><label for="${id}">${label}</label><div class="date-picker" id="${id}Picker"><div class="date-control"><input id="${id}" type="text" placeholder="YYYY-MM-DD" maxlength="10" required value="${escapeHTML(value)}" aria-describedby="${id}Hint" autocomplete="off" /><button type="button" class="date-trigger" id="${id}Trigger" aria-label="Choose ${label.toLowerCase()}" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}Calendar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg></button></div><span class="date-format" id="${id}Hint">YYYY-MM-DD</span><div class="date-calendar" id="${id}Calendar" role="dialog" aria-label="${label} calendar" hidden></div></div></div>`;
}
let closeDatePicker = () => {};
function bindDatePicker(id) {
  const input = $(id), trigger = $(id + 'Trigger'), panel = $(id + 'Calendar'), picker = $(id + 'Picker');
  const minimum = parseCalendarDate('2026-10-01');
  const today = new Date();
  let focused = parseCalendarDate(input.value) || (today < minimum ? minimum : today);
  let month = new Date(focused.getFullYear(), focused.getMonth(), 1, 12);
  const validate = () => input.setCustomValidity(!input.value || (parseCalendarDate(input.value) && input.value >= '2026-10-01') ? '' : 'Enter a valid date on or after October 1, 2026 (YYYY-MM-DD).');
  const position = () => {
    const rect = input.getBoundingClientRect();
    const width = Math.min(304, window.innerWidth - 32);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16))}px`;
    const height = panel.offsetHeight;
    const below = window.innerHeight - rect.bottom - 16;
    const top = below >= height || below >= rect.top - 16 ? rect.bottom + 8 : rect.top - height - 8;
    panel.style.top = `${Math.max(16, Math.min(top, window.innerHeight - height - 16))}px`;
  };
  const outside = event => { if (!picker.contains(event.target)) close(); };
  const close = (restore = false) => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    window.removeEventListener('resize', position);
    document.removeEventListener('scroll', position, true);
    if (restore) trigger.focus();
  };
  const select = value => {
    input.value = value;
    validate();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  };
  const renderCalendar = (focusDay = false) => {
    const title = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    first.setDate(first.getDate() - first.getDay());
    const cells = Array.from({ length: 42 }, (_, offset) => {
      const date = new Date(first); date.setDate(first.getDate() + offset);
      const value = calendarDateValue(date), selected = value === input.value;
      return `<button type="button" class="date-day${date.getMonth() !== month.getMonth() ? ' other-month' : ''}${selected ? ' selected' : ''}" data-date="${value}" tabindex="${value === calendarDateValue(focused) ? '0' : '-1'}" aria-label="${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}" aria-pressed="${selected}" ${value === calendarDateValue(today) ? 'aria-current="date"' : ''} ${date < minimum ? 'disabled' : ''}>${date.getDate()}</button>`;
    });
    panel.innerHTML = `<div class="date-calendar-head"><strong aria-live="polite">${title}</strong><div class="date-navigation"><button type="button" data-month="-1" aria-label="Previous month" ${month <= minimum ? 'disabled' : ''}>‹</button><button type="button" data-month="1" aria-label="Next month">›</button></div></div><div class="date-weekdays" aria-hidden="true">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => `<span>${day}</span>`).join('')}</div><div class="date-days" role="group" aria-label="${title}">${cells.join('')}</div><div class="date-calendar-footer"><button type="button" data-action="clear">Clear</button><button type="button" data-action="today" ${today < minimum ? 'disabled' : ''}>Today</button></div>`;
    panel.querySelectorAll('[data-date]').forEach(button => {
      button.onclick = () => select(button.dataset.date);
      button.onkeydown = event => {
        const date = parseCalendarDate(button.dataset.date);
        const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay() };
        if (event.key in offsets) date.setDate(date.getDate() + offsets[event.key]);
        else if (event.key === 'PageUp' || event.key === 'PageDown') {
          const day = date.getDate();
          date.setDate(1); date.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1));
          date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
        } else return;
        event.preventDefault();
        focused = date < minimum ? new Date(minimum) : date;
        month = new Date(focused.getFullYear(), focused.getMonth(), 1, 12);
        renderCalendar(true);
      };
    });
    panel.querySelectorAll('[data-month]').forEach(button => button.onclick = () => {
      const direction = Number(button.dataset.month);
      month.setMonth(month.getMonth() + direction); focused = new Date(month);
      renderCalendar();
      (panel.querySelector(`[data-month="${direction}"]:not(:disabled)`) || panel.querySelector('[data-month="1"]')).focus();
    });
    panel.querySelector('[data-action="clear"]').onclick = () => select('');
    panel.querySelector('[data-action="today"]').onclick = () => select(calendarDateValue(today));
    position();
    if (focusDay) panel.querySelector('[tabindex="0"]')?.focus();
  };
  const open = () => {
    closeDatePicker(); closeCategoryPicker();
    closeDatePicker = close;
    focused = parseCalendarDate(input.value) || (today < minimum ? new Date(minimum) : new Date(today));
    if (focused < minimum) focused = new Date(minimum);
    month = new Date(focused.getFullYear(), focused.getMonth(), 1, 12);
    panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    renderCalendar(true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
  };
  trigger.onclick = () => panel.hidden ? open() : close(true);
  input.addEventListener('input', validate);
  input.onkeydown = event => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); } };
  picker.onkeydown = event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(true); }
  };
  picker.onfocusout = () => requestAnimationFrame(() => { if (!picker.contains(document.activeElement)) close(); });
  validate();
}

function journalLines(amount, category) {
  const cash = 'Operating Account · 4821';
  return [
    { account: amount < 0 ? category : cash, debit: Math.abs(amount), credit: 0 },
    { account: amount < 0 ? cash : category, debit: 0, credit: Math.abs(amount) }
  ];
}

function journalPreview(lines, date) {
  return `<section class="journal-preview" aria-label="Journal Entry Preview"><h3>Journal Entry Preview</h3><p>Entry date: ${escapeHTML(date)} · USD</p><table><thead><tr><th scope="col">Account</th><th scope="col">Debit</th><th scope="col">Credit</th></tr></thead><tbody>${lines.map(line => `<tr><th scope="row">${escapeHTML(line.account)}</th><td>${line.debit ? money(line.debit) : '—'}</td><td>${line.credit ? money(line.credit) : '—'}</td></tr>`).join('')}</tbody></table></section>`;
}

function recordDetails(record) {
  return `<div class="record-details">${record.supportingRef ? `<p><strong>Supporting Reference</strong> ${escapeHTML(record.supportingRef)}</p>` : ''}${record.expectedDate ? `<p><strong>Expected Clearing Date</strong> ${escapeHTML(record.expectedDate)}</p>` : ''}${record.owner ? `<p><strong>Follow-up Owner</strong> ${escapeHTML(record.owner)}</p>` : ''}${record.dueDate ? `<p><strong>Follow-up Date</strong> ${escapeHTML(record.dueDate)}</p>` : ''}</div>`;
}

function followUpCard(item) {
  const followUp = state.followUps[item.id];
  return `<section class="evidence-card"><h3>${followUp ? 'Follow-up Needed' : 'Missing Supporting Evidence?'}</h3>${followUp ? `<p>${escapeHTML(followUp.note)}</p>${recordDetails(followUp)}` : '<p>Keep this transaction open while you obtain the records needed to explain it.</p>'}<button class="ghost" id="followUpBtn" type="button">${followUp ? 'Edit Follow-up' : 'Add Follow-up'}</button>${followUp ? '<button class="text-action" id="clearFollowUpBtn" type="button">Clear Follow-up Flag</button>' : ''}</section>`;
}

function saveFollowUp(item, details) {
  saveHistory();
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  state.followUps[item.id] = { ...details };
  state.activity.unshift({ label: `Saved follow-up: ${item.name}`, origin: 'Evidence pending · transaction remains open', time, actor: 'Maya Chen', ...details });
  closeModal();
  render();
  toast('Follow-up saved. Transaction remains open.', true);
}

function showFollowUp(item, onReturn = closeModal) {
  const current = state.followUps[item.id] || {};
  $('modalMount').innerHTML = `<div class="final-overlay"><form class="task-modal" id="followUpForm" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Follow Up on Evidence</h2><p class="task-subtitle">${escapeHTML(item.name)} · ${money(item.amount)}</p><p class="task-explanation">Record what is missing and who will follow up. This item stays in Open and continues to block final review.</p><label class="task-field" for="followUpNote">Evidence or Next Step<textarea id="followUpNote" maxlength="300" required placeholder="e.g. Obtain the payout report and verify the processing fee">${escapeHTML(current.note || '')}</textarea></label><div class="field-pair"><label class="task-field" for="followUpOwner">Owner<input id="followUpOwner" maxlength="80" required value="${escapeHTML(current.owner || 'Maya Chen')}" /></label>${datePickerField('followUpDate', 'Follow-up Date', current.dueDate || '')}</div><p class="task-hint">Saved in this demo session only. No notification is sent.</p><div class="task-actions"><button class="primary" type="submit">Save Follow-up</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></form></div>`;
  bindDatePicker('followUpDate');
  $('followUpForm').onsubmit = event => {
    event.preventDefault();
    const note = $('followUpNote').value.trim();
    const owner = $('followUpOwner').value.trim();
    if (!note || !owner || !$('followUpForm').reportValidity()) return;
    saveFollowUp(item, { note, owner, dueDate: $('followUpDate').value });
    onReturn();
  };
  $('cancelTaskModal').onclick = onReturn;
  $('followUpNote').focus();
}

function showAdjustment(suggestion, onCancel = closeModal, onComplete = closeModal) {
  const { bank, ledger, difference } = suggestion;
  const lines = journalLines(-difference, 'Payment processing fees');
  $('modalMount').innerHTML = `<div class="final-overlay"><form class="task-modal" id="adjustmentForm" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Verify &amp; Record Fee</h2><p class="task-subtitle">${escapeHTML(bank.name)} · ${money(difference)} proposed fee</p><p class="task-explanation">No payout report is attached. Obtain the report from your payment processor and verify the payout identity, gross receipts, fee, and net deposit.</p><div class="adjustment-box"><div class="balance-preview"><span>Gross Receipts</span><span>${money(ledger.amount)}</span></div><div class="balance-preview"><span>Processing Fee</span><span>${money(-difference)}</span></div><div class="balance-preview"><span>Net Deposit</span><span>${money(bank.amount)}</span></div></div><label class="task-field" for="payoutReference">Supporting Report Reference<input id="payoutReference" required maxlength="200" placeholder="Report ID, document reference, or URL" /></label>${journalPreview(lines, `${bank.date}, 2026`)}<p class="task-hint">Reduces ledger cash by ${money(difference)} and matches both transactions.</p><label class="review-confirm"><input id="payoutVerified" type="checkbox" required /> I verified the payout identity and all three amounts against the supporting report.</label><div class="task-actions"><button class="primary" id="confirmAdjustment" type="submit" disabled>Match + Record ${money(difference)} Fee</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div><button class="text-action" id="adjustmentFollowUp" type="button">Report Missing? Save a Follow-up</button><p class="task-hint">Demo entry only. A reference records your verification; this demo does not retrieve or validate documents.</p></form></div>`;
  const update = () => $('confirmAdjustment').disabled = !$('payoutReference').value.trim() || !$('payoutVerified').checked;
  $('payoutReference').oninput = update;
  $('payoutVerified').onchange = update;
  $('adjustmentForm').onsubmit = event => {
    event.preventDefault();
    const supportingRef = $('payoutReference').value.trim();
    if (!supportingRef || !$('payoutVerified').checked || !$('adjustmentForm').reportValidity()) return;
    resolve([bank.id, ledger.id], 'adjustment', `Matched Stripe payout and recorded ${money(difference)} processing fee`, 'Maya verified payout report', '', { supportingRef, journal: lines, entryDate: `${bank.date}, 2026` });
    onComplete();
  };
  $('adjustmentFollowUp').onclick = () => showFollowUp(bank, onCancel);
  $('cancelTaskModal').onclick = onCancel;
  $('payoutReference').focus();
}

function showCreateEntry(item) {
  const suggested = item.kind === 'fee' ? 'Bank fees' : item.kind === 'interest' ? 'Interest income' : item.amount < 0 ? 'Operating expense' : 'Other income';
  const other = item.amount < 0 ? 'Other operating expense' : 'Revenue';
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Create Ledger Entry</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><div class="task-field"><span id="entryCategoryLabel">Category</span><div class="category-picker"><button class="category-trigger" id="entryCategoryTrigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="entryCategoryLabel entryCategoryValue"><span id="entryCategoryValue">Select a category...</span><span class="category-chevron" aria-hidden="true"></span></button><div class="category-options" id="entryCategoryOptions" role="listbox" aria-labelledby="entryCategoryLabel" hidden><button class="category-option" type="button" role="option" aria-selected="false" data-value="${suggested}">${suggested}<span class="category-suggested">Suggested</span></button><button class="category-option" type="button" role="option" aria-selected="false" data-value="${other}">${other}</button></div><input id="entryCategory" type="hidden" value=""></div></div><div id="entryPreview" aria-live="polite"><p class="task-hint">Select a category to preview the debit and credit.</p></div><label class="task-field" for="entryNote">Note<textarea id="entryNote" maxlength="300" placeholder="Optional note"></textarea></label><p class="task-hint">Creates a matching entry in this demo. No real ledger is connected.</p><div class="task-actions"><button class="primary" id="confirmEntryBtn" type="button" disabled>Create &amp; Clear</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
  const trigger = $('entryCategoryTrigger');
  bindCategoryPicker('entryCategory', () => {
    $('confirmEntryBtn').disabled = false;
    $('entryPreview').innerHTML = journalPreview(journalLines(item.amount, $('entryCategory').value), `${item.date}, 2026`) + `<p class="task-hint">${item.amount < 0 ? 'Reduces' : 'Increases'} ledger cash by ${money(Math.abs(item.amount))} and clears this bank transaction.</p>`;
  });
  $('confirmEntryBtn').onclick = () => {
    const category = $('entryCategory').value;
    if (!category) return;
    const note = $('entryNote').value.trim();
    resolve([item.id], 'entry', `Created ledger entry in ${category}`, 'Bank statement · Maya confirmed category', note, { journal: journalLines(item.amount, category), entryDate: `${item.date}, 2026` });
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
  trigger.focus();
}

function showOutstanding(item) {
  const deposit = item.amount > 0;
  const title = deposit ? 'Mark Deposit in Transit' : 'Mark as Outstanding';
  $('modalMount').innerHTML = `<div class="final-overlay"><form class="task-modal" id="timingForm" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">${title}</h2><p class="task-subtitle">${escapeHTML(item.name)} — ${money(item.amount)}</p><p class="task-explanation">Verify ${deposit ? 'the deposit submission' : 'the payment was issued and remains uncleared'} before carrying this item into October. No new journal entry will be created.</p><label class="task-field" for="timingReference">Supporting Reference<input id="timingReference" maxlength="200" required placeholder="${deposit ? 'Deposit confirmation or receipt reference' : 'Payment confirmation or check register reference'}" /></label>${datePickerField('timingDate', 'Expected Clearing Date')}<label class="task-field" for="outstandingNote">Note (Optional)<textarea id="outstandingNote" maxlength="300" placeholder="Add context for next month's review"></textarea></label><p class="task-hint">Follow-up owner: Maya Chen. This remains a carry-forward item until it clears the bank.</p><div class="task-actions"><button class="primary" id="confirmOutstandingBtn" type="submit" disabled>${deposit ? 'Mark Deposit in Transit' : 'Mark Outstanding'}</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div><button class="text-action" id="timingFollowUp" type="button">Evidence Missing? Save a Follow-up</button></form></div>`;
  bindDatePicker('timingDate');
  const update = () => $('confirmOutstandingBtn').disabled = !$('timingReference').value.trim() || !$('timingDate').value || !$('timingDate').validity.valid;
  $('timingReference').oninput = update;
  $('timingDate').oninput = update;
  $('timingForm').onsubmit = event => {
    event.preventDefault();
    if (!$('timingForm').reportValidity() || !$('timingReference').value.trim()) return;
    const note = $('outstandingNote').value.trim();
    const details = { supportingRef: $('timingReference').value.trim(), expectedDate: $('timingDate').value, owner: 'Maya Chen' };
    resolve([item.id], 'timing', `${deposit ? 'Carried deposit in transit' : 'Carried outstanding check'} to October 2026`, 'Maya documented timing evidence', note, details);
    closeModal();
  };
  $('timingFollowUp').onclick = () => showFollowUp(item);
  $('cancelTaskModal').onclick = closeModal;
  $('timingReference').focus();
}

function showExclude(item) {
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Exclude Transaction</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><p class="task-explanation">Record why this transaction is outside the reconciliation scope. Excluding it does not change the bank or ledger balance.</p><label class="task-field" for="excludeNote">Reason for Exclusion<textarea id="excludeNote" maxlength="300" placeholder="Explain why this item should be excluded" required></textarea></label><div class="task-actions"><button class="primary danger-confirm" id="confirmExcludeBtn" type="button" disabled>Exclude Item</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
  $('excludeNote').oninput = () => $('confirmExcludeBtn').disabled = !$('excludeNote').value.trim();
  $('confirmExcludeBtn').onclick = () => {
    const note = $('excludeNote').value.trim();
    if (!note) return;
    resolve([item.id], 'exclude', `Excluded ${item.name} from reconciliation`, 'Maya documented exclusion', note);
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
  $('excludeNote').focus();
}

function showAISuggestionDetail(bankId, listScroll = 0) {
  const suggestions = visibleSuggestions();
  const suggestion = suggestions.find(pair => pair.bank.id === bankId);
  if (!suggestion) { showAIMatches(); return; }
  const { bank, ledger } = suggestion;
  const back = () => showAIMatches({ focusPair: bankId, scrollTop: listScroll });
  const returnToDetail = () => showAISuggestionDetail(bankId, listScroll);
  const completed = message => showAIMatches({ scrollTop: listScroll, message });
  const record = (item, title) => `<section class="inspect-record" aria-label="${title}"><span class="source-chip ${item.side}">${title}</span><h3>${escapeHTML(item.name)}</h3><div class="inspect-amount">${money(item.amount)}</div><dl><div><dt>Date</dt><dd>${item.date}, 2026</dd></div><div><dt>Reference</dt><dd>${escapeHTML(item.ref)}</dd></div><div><dt>Account</dt><dd>Operating ·•• 4821</dd></div></dl></section>`;
  const followUp = state.followUps[bank.id] || state.followUps[ledger.id];
  $('modalMount').innerHTML = `<div class="final-overlay"><div class="ai-panel ai-inspect" role="dialog" aria-modal="true" aria-labelledby="aiDetailTitle">
    <div class="inspect-nav"><button class="text-action" id="aiDetailBack" type="button">← All Suggested Pairs</button><button class="ai-close" id="aiDetailClose" type="button" aria-label="Close AI Suggestions">×</button></div>
    <div class="ai-head"><div><div class="ai-kicker">Suggested Pair ${suggestions.indexOf(suggestion) + 1} of ${suggestions.length}</div><h2 id="aiDetailTitle" tabindex="-1">Inspect Match</h2><p>Compare the original records before deciding.</p></div><span class="signal ${suggestion.adjustment ? 'adjust' : suggestion.score < 90 ? 'review' : ''}">${suggestion.strength}</span></div>
    <div class="inspect-records">${record(bank, 'Bank Statement')}${record(ledger, 'General Ledger')}</div>
    <section class="inspect-evidence"><h3>Why This Pair Was Suggested</h3><p>${evidence(suggestion)}</p><p class="info">${suggestion.adjustment ? 'The difference is a possible processing fee. Verify the payout report before recording an adjustment.' : 'These signals support a possible match; they do not verify the transaction identity. Check the payment records if you need more evidence.'}</p></section>
    <section class="evidence-card"><h3>${followUp ? 'Follow-up Needed' : 'Supporting Evidence'}</h3>${followUp ? `<p>${escapeHTML(followUp.note)}</p>${recordDetails(followUp)}` : '<p>No supporting document is attached to this demo. You can keep the pair open and save a follow-up for missing evidence.</p>'}<button class="ghost" id="aiDetailFollowUp" type="button">${followUp ? 'Edit Follow-up' : 'Add Follow-up'}</button></section>
    <div class="inspect-footer"><p>${suggestion.adjustment ? 'Review the journal entry and supporting reference in the next step.' : 'Confirming matches both records and resolves 2 open transactions.'}</p><div class="ai-card-actions"><button class="ghost" id="aiDetailFind" type="button">Find Another Match</button><button class="ghost" id="aiDetailReject" type="button">Not a Match</button><button class="primary" id="aiDetailConfirm" type="button">${suggestion.adjustment ? 'Review &amp; Record Fee' : 'Confirm Match'}</button></div><p class="task-hint">Demo only. No real ledger is changed.</p></div>
  </div></div>`;
  $('aiDetailBack').onclick = back;
  $('aiDetailClose').onclick = () => { closeModal(); $('aiMatchBtn').focus(); };
  $('aiDetailFollowUp').onclick = () => showFollowUp(state.followUps[ledger.id] && !state.followUps[bank.id] ? ledger : bank, returnToDetail);
  $('aiDetailFind').onclick = () => showManualMatch(bank, returnToDetail, () => completed('Manual match recorded. The remaining suggestions are below.'));
  $('aiDetailReject').onclick = () => {
    rejectSuggestion(suggestion, bank.id);
    completed('Suggestion rejected. Both transactions remain open for another match or resolution.');
  };
  $('aiDetailConfirm').onclick = () => {
    if (suggestion.adjustment) {
      showAdjustment(suggestion, returnToDetail, () => completed('Payout matched and fee recorded. The remaining suggestions are below.'));
      return;
    }
    resolve([bank.id, ledger.id], 'match', `Matched ${bank.name} with ${ledger.name}`, 'AI suggested · Maya inspected and confirmed');
    completed('Match confirmed. Two transactions resolved.');
  };
  $('aiDetailTitle').focus({ preventScroll: true });
}

function showAIMatches({ focusPair = null, scrollTop = 0, message = '' } = {}) {
  const suggestions = visibleSuggestions();
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
    <div class="ai-head"><div><div class="ai-kicker">✦ AI Suggestions · Demo</div><h2 id="aiTitle">${suggestions.length} Possible ${suggestions.length === 1 ? 'Match' : 'Matches'}</h2><p>Amount, date and description signals narrow the review. A net deposit may need an adjustment.</p></div><button class="ai-close" id="aiClose" type="button" aria-label="Close AI Suggestions">×</button></div>
    <div class="ai-list">${suggestions.length ? suggestions.map((s, index) => `<div class="ai-card"><div class="ai-card-head"><strong>Suggested Pair ${index + 1}</strong><span class="signal ${s.adjustment ? 'adjust' : s.score < 90 ? 'review' : ''}">${s.strength}</span></div><div class="ai-pair"><div class="ai-entry"><small>BANK · ${s.bank.date}</small><b>${s.bank.name}</b><span>${money(s.bank.amount)}</span></div><span class="ai-arrow">↔</span><div class="ai-entry"><small>LEDGER · ${s.ledger.date}</small><b>${s.ledger.name}</b><span>${money(s.ledger.amount)}</span></div></div><div class="ai-evidence">${evidence(s)}</div><div class="ai-card-actions"><button class="ghost" type="button" data-review="${s.bank.id}">${s.adjustment ? 'Review Adjustment' : 'Inspect Details'}</button><button class="ghost" type="button" data-reject="${s.bank.id}">Not a Match</button>${s.adjustment ? '' : `<button class="primary" type="button" data-confirm="${s.bank.id}">Confirm Match</button>`}</div></div>`).join('') : '<div class="empty-list">No candidate pairs remain. Review the bank-only and ledger-only items individually.</div>'}</div>
    <div class="ai-disclaimer">Demo matching logic runs in this browser. Signal labels are review priorities, not calibrated probabilities. Nothing is posted automatically.</div>
  </div></div>`;
  if (message) {
    const notice = document.createElement('p');
    notice.className = 'ai-result-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    document.querySelector('.ai-list').before(notice);
  }
  $('aiClose').onclick = () => { closeModal(); $('aiMatchBtn').focus(); };
  document.querySelectorAll('[data-review]').forEach(button => button.onclick = () => {
    showAISuggestionDetail(button.dataset.review, document.querySelector('.ai-panel').scrollTop);
  });
  document.querySelectorAll('[data-reject]').forEach(button => button.onclick = () => {
    const suggestion = visibleSuggestions().find(s => s.bank.id === button.dataset.reject);
    if (suggestion) rejectSuggestion(suggestion, suggestion.bank.id);
  });
  document.querySelectorAll('[data-confirm]').forEach(button => button.onclick = () => {
    const suggestion = visibleSuggestions().find(s => s.bank.id === button.dataset.confirm);
    if (!suggestion || suggestion.adjustment) return;
    resolve([suggestion.bank.id, suggestion.ledger.id], 'match', `Matched ${suggestion.bank.name} with ${suggestion.ledger.name}`, 'AI suggested · Maya confirmed');
    showAIMatches();
  });
  document.querySelector('.ai-panel').scrollTop = scrollTop;
  const returnButton = [...document.querySelectorAll('[data-review]')].find(button => button.dataset.review === focusPair);
  (returnButton || $('aiClose')).focus({ preventScroll: true });
}

function showFinish() {
  if (openItems().length) return;
  closeModal();
  navigateReview(state.completed ? 'approved' : 'review');
}

function navigateReview(route) {
  if (window.location.hash === `#${route}`) renderReviewRoute(true);
  else window.location.hash = route;
}

function returnToTransactions() {
  state.tab = 'resolved';
  state.selected = tabItems('resolved')[0]?.id || null;
  $('search').value = '';
  navigateReview('transactions');
  render();
}

function reviewItems(action) {
  return items.filter(item => state.resolved[item.id]?.action === action &&
    (!['match', 'adjustment'].includes(action) || item.side === 'bank'));
}

function reviewList(action) {
  const rows = reviewItems(action);
  if (!rows.length) return '<p class="approval-empty">None in this reconciliation.</p>';
  return `<ul class="approval-list">${rows.map(item => {
    const result = state.resolved[item.id];
    const amount = action === 'adjustment' ? -290 : item.amount;
    return `<li><div><strong>${escapeHTML(item.name)}</strong><p>${escapeHTML(result.label)}</p>${result.note ? `<p class="approval-note">Note: ${escapeHTML(result.note)}</p>` : ''}${recordDetails(result)}${result.journal ? journalPreview(result.journal, result.entryDate) : ''}</div><span>${money(amount)}</span></li>`;
  }).join('')}</ul>`;
}

function reviewSteps(approved = false) {
  return `<ol class="approval-steps" aria-label="Reconciliation progress"><li class="done">✓ Resolve Transactions</li><li class="${approved ? 'done' : 'current'}" ${approved ? '' : 'aria-current="step"'}>${approved ? '✓' : '2'} Review</li><li class="${approved ? 'current' : ''}" ${approved ? 'aria-current="step"' : ''}>${approved ? '✓' : '3'} Approval</li></ol>`;
}

function renderReviewPage() {
  const balance = balanceSnapshot();
  const balanced = balance.differenceCents === 0;
  const count = action => reviewItems(action).length;
  $('reviewPage').innerHTML = `<button class="approval-back" id="reviewBack" type="button">← Back to Transactions</button>${reviewSteps()}
    <div class="approval-heading"><div class="eyebrow">Final Review</div><h1 id="reviewPageTitle" tabindex="-1">Review Reconciliation</h1><p>Operating Account · First National Bank ·•• 4821 · September 2026</p></div>
    <div class="approval-status ${balanced ? '' : 'needs-attention'}"><strong>${balanced ? '✓ All transactions resolved. Balances agree.' : 'A balance difference still needs your attention.'}</strong><p>${balanced ? 'Review the decisions below, then approve this reconciliation.' : 'You can review all resolutions, but approval stays unavailable until the difference is zero. Return to Transactions to inspect and undo any incorrect resolution.'}</p></div>
    <section class="approval-balances" aria-label="Balances to approve"><div><span>Adjusted Bank Balance</span><strong>${money(balance.adjustedBankCents / 100)}</strong></div><div><span>Adjusted Ledger Balance</span><strong>${money(balance.adjustedLedgerCents / 100)}</strong></div><div class="${balanced ? 'success' : 'difference-open'}"><span>Difference</span><strong>${money(Math.abs(balance.differenceCents) / 100)}</strong></div></section>
    <div class="review-summary"><span>${items.length} transactions resolved</span><span>${count('match')} direct pairs</span><span>${count('adjustment')} adjusted pair${count('adjustment') === 1 ? '' : 's'}</span><span>${count('entry')} new entries</span><span>${count('timing')} carry forward</span><span>${count('exclude')} excluded</span></div>
    <div class="approval-layout"><div class="approval-sections">
      <section class="approval-section"><h2>Matched Transactions <span>${count('match')} pairs</span></h2>${reviewList('match')}</section>
      <section class="approval-section"><h2>Adjustments <span>${count('adjustment')}</span></h2>${reviewList('adjustment')}</section>
      <section class="approval-section"><h2>New Ledger Entries <span>${count('entry')}</span></h2>${reviewList('entry')}</section>
      <section class="approval-section"><h2>Carry Forward <span>${count('timing')}</span></h2><p class="approval-description">These items remain outstanding for follow-up in the next period.</p>${reviewList('timing')}</section>
      <section class="approval-section"><h2>Excluded Transactions <span>${count('exclude')}</span></h2>${reviewList('exclude')}</section>
    </div><aside class="approval-decision" aria-label="Your approval"><div class="ai-kicker">Your Approval</div><h2>Ready to Sign Off?</h2><p>Review the matching decisions, recorded entries, and any items carried forward.</p><div class="approval-reviewer"><span class="avatar" aria-hidden="true">M</span><div><strong>Maya Chen</strong><span>Reviewer · Demo Session</span></div></div><label class="review-confirm"><input id="reviewCheck" type="checkbox" ${balanced ? '' : 'disabled'} /> I have reviewed the balances, adjustments, exclusions, and carry-forward items.</label><button class="primary approval-submit" id="confirmReview" type="button" disabled aria-describedby="approvalHelp">Approve Reconciliation</button><p class="task-hint" id="approvalHelp">${balanced ? 'Select the confirmation above to enable approval.' : 'Resolve the balance difference before approving.'}</p><p class="approval-demo">Demo approval only. No entries are posted to a real ledger. Changes last for this session.</p></aside></div>`;
  $('reviewBack').onclick = returnToTransactions;
  $('reviewCheck').onchange = () => {
    $('confirmReview').disabled = !$('reviewCheck').checked || balanceSnapshot().differenceCents !== 0 || openItems().length > 0;
    $('approvalHelp').textContent = $('reviewCheck').checked ? 'Your approval will be recorded in the review activity.' : 'Select the confirmation above to enable approval.';
  };
  $('confirmReview').onclick = () => {
    if (state.completed || !$('reviewCheck').checked || openItems().length || balanceSnapshot().differenceCents !== 0) return;
    saveHistory();
    state.completed = true;
    state.activity.unshift({ label: 'Approved reconciliation (demo)', origin: 'Final review · Maya approved', time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), actor: 'Maya Chen', note: '', kind: 'approval' });
    render();
    navigateReview('approved');
  };
}

function renderApprovalPage() {
  const balance = balanceSnapshot();
  const approval = state.activity.find(entry => entry.kind === 'approval');
  const carryCount = reviewItems('timing').length;
  $('reviewPage').innerHTML = `${reviewSteps(true)}<section class="approval-success"><div class="approval-check" aria-hidden="true">✓</div><div class="eyebrow">Approval Confirmed · Demo</div><h1 id="reviewPageTitle" tabindex="-1">Reconciliation Approved</h1><p>Operating Account · September 2026</p><p class="approval-record">Approved by ${escapeHTML(approval?.actor || 'Maya Chen')}${approval ? ` at ${escapeHTML(approval.time)}` : ''}</p><div class="approval-receipt"><div><span>Transactions Resolved</span><strong>${items.length} of ${items.length}</strong></div><div><span>Reconciled Balance</span><strong>${money(balance.adjustedBankCents / 100)}</strong></div><div><span>Difference</span><strong>$0.00</strong></div></div><div class="approval-followup"><strong>${carryCount ? `${carryCount} item${carryCount === 1 ? '' : 's'} carried forward` : 'No items carried forward'}</strong><p>${carryCount ? 'Outstanding items still need follow-up in the next period. Your approval and resolution history are available in Review Activity.' : 'Your approval and resolution history are available in Review Activity.'}</p></div><div class="approval-success-actions"><button class="primary" id="approvalBack" type="button">Back to Reconciliation</button><button class="ghost" id="undoApproval" type="button">Undo Approval</button></div><p class="approval-demo">This confirms approval in the demo only. No real reconciliation is approved and no ledger entries are posted.</p></section>`;
  $('approvalBack').onclick = returnToTransactions;
  $('undoApproval').onclick = () => {
    if (!state.completed || state.activity[0]?.kind !== 'approval') return;
    undoLast();
    navigateReview('review');
  };
}

function renderReviewRoute(focus = false) {
  const requested = ['#review', '#approved'].includes(window.location.hash);
  const visible = requested && openItems().length === 0;
  $('reconciliationView').hidden = visible;
  $('reviewPage').hidden = !visible;
  if (requested && !visible) history.replaceState(null, '', window.location.pathname + window.location.search);
  if (visible) {
    closeModal();
    clearTimeout(state.toastTimer);
    $('toastMount').innerHTML = '';
    if (state.completed) renderApprovalPage();
    else renderReviewPage();
  }
  document.title = visible ? `${state.completed ? 'Reconciliation Approved' : 'Review Reconciliation'} · Campfire` : 'Bank Reconciliation · Campfire';
  if (focus) {
    window.scrollTo(0, 0);
    (visible ? $('reviewPageTitle') : $('finishBtn')).focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', () => renderReviewRoute(true));

$('search').addEventListener('input', () => {
  const candidates = displayItems();
  if (!candidates.some(item => item.id === state.selected)) state.selected = candidates[0]?.id || null;
  render();
});
document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => {
  state.tab = tab.dataset.tab;
  const candidates = displayItems();
  if (!candidates.some(item => item.id === state.selected)) state.selected = candidates[0]?.id || null;
  render();
});
document.querySelectorAll('.filter-pill').forEach(button => button.onclick = () => {
  state.tab = 'open';
  state.filter = button.dataset.filter;
  const candidates = displayItems();
  if (!candidates.some(item => item.id === state.selected)) state.selected = candidates[0]?.id || null;
  render();
});
$('resetBtn').onclick = () => {
  state.resolved = {};
  state.followUps = {};
  state.rejectedPairs = new Set();
  state.history = [];
  state.activity = [];
  state.selected = 'b1';
  state.tab = 'open';
  state.filter = 'open';
  state.completed = false;
  $('search').value = '';
  closeModal();
  render();
  toast('Demo reset · AI suggestions are ready to review');
};
$('aiMatchBtn').onclick = showAIMatches;
$('finishBtn').onclick = showFinish;
document.querySelectorAll('[data-demo-nav]').forEach(button => button.onclick = () => toast('This section is outside the reconciliation demo'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
render();
