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

const state = { resolved: {}, rejectedPairs: new Set(), selected: 'b1', tab: 'open', filter: 'open', history: [], activity: [], completed: false, toastTimer: null };
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

function resolve(ids, action, label, origin = 'Manual review', note = '') {
  state.history.push({ resolved: { ...state.resolved }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, filter: state.filter, selected: state.selected, completed: state.completed });
  state.completed = false;
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  ids.forEach(id => state.resolved[id] = { action, label, time, origin, note });
  state.activity.unshift({ label, origin, time, actor: 'Maya Chen', note });
  selectNextInTab();
  render();
  toast(label, true);
}

function rejectSuggestion(suggestion, selectedId) {
  state.history.push({ resolved: { ...state.resolved }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, filter: state.filter, selected: state.selected, completed: state.completed });
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
  $('activityList').innerHTML = state.activity.length ? state.activity.map(entry => `<div class="activity-row"><div><strong>${escapeHTML(entry.label)}</strong><br><span>${escapeHTML(entry.actor)} · ${escapeHTML(entry.origin)}</span>${entry.note ? `<p class="activity-note">Note: ${escapeHTML(entry.note)}</p>` : ''}</div><span>${entry.time}</span></div>`).join('') : '<div class="empty-activity">Actions will appear here as you review items.</div>';
}

function render() {
  const open = openItems();
  const resolved = items.length - open.length;
  const suggestions = visibleSuggestions();
  const suggestedTransactions = tabItems('suggested').length;
  $('progressNum').textContent = `${resolved} of 14`;
  $('progressSub').textContent = state.completed ? 'Ready for review' : resolved === 14 ? 'All transactions reviewed' : `${open.length} transaction${open.length === 1 ? '' : 's'} need attention`;
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
  $('resolvedTabCount').textContent = resolved;
  $('aiMatchBtn').textContent = `✦ AI Suggestions · ${suggestions.length}`;
  $('aiMatchBtn').disabled = open.length === 0;
  const balance = balanceSnapshot();
  $('finishBtn').disabled = resolved !== 14 || balance.differenceCents !== 0;
  $('finishBtn').textContent = state.completed ? 'View Review Summary' : 'Review Reconciliation';
  $('timingTotal').textContent = signedMoney(balance.timingCents / 100);
  $('adjustedBank').textContent = money(balance.adjustedBankCents / 100);
  $('adjustedLedger').textContent = money(balance.adjustedLedgerCents / 100);
  $('balanceDifference').textContent = money(Math.abs(balance.differenceCents) / 100);
  $('balanceDifference').className = balance.differenceCents === 0 ? 'difference-clear' : 'difference-open';
  $('balanceStatus').textContent = state.completed ? 'Ready for review · $0.00 difference' : balance.differenceCents === 0 ?
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
}

function rowBadge(item) {
  if (state.resolved[item.id]) return state.resolved[item.id].action === 'timing' ? 'Carry Forward' : state.resolved[item.id].action === 'exclude' ? 'Excluded' : 'Resolved';
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
    body += `<div class="resolved-card"><strong>${result.action === 'timing' ? '↗ Carry Forward' : '✓ Resolved'} · ${escapeHTML(result.label)}</strong><br>Reviewed by Maya Chen at ${result.time}. ${result.action === 'adjustment' ? 'Both sides were matched and a $290.00 processing fee was recorded in this demo.' : result.action === 'match' ? 'Both sides were cleared together.' : result.action === 'exclude' ? 'Excluded from this review with a recorded reason. No balance adjustment was made.' : item.side === 'bank' ? 'A corresponding ledger entry was added in this demo.' : 'This timing item remains open for next-period follow-up; it has not cleared the bank.'}${result.note ? `<div class="resolved-note">Note: ${escapeHTML(result.note)}</div>` : ''}</div><div class="actionrow"><button class="ghost" id="undoDetail" type="button">Undo Last Action</button></div>`;
  } else if (partner && suggestion.adjustment) {
    body += `<div class="section-title">✦ AI Suggestion <span class="signal adjust" style="margin-left:7px">Needs Adjustment</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank Statement' : 'General Ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="rule"></div><div class="section-title">Review Proposed Fee Entry</div><div class="adjustment-box"><strong>Possible Net Deposit</strong><p>The $290.00 difference may be a processing fee. Verify it against the payout report before confirming.</p><div class="balance-preview"><span>Gross Ledger Receipt</span><span>$12,770.75</span></div><div class="balance-preview"><span>Proposed Processing Fee</span><span>−$290.00</span></div><div class="balance-preview"><span>Bank Deposit</span><span>$12,480.75</span></div></div>
      <div class="formline fee-account"><span id="adjustmentAccountLabel">Fee Account</span><div class="category-picker"><button class="category-trigger" id="adjustmentAccountTrigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="adjustmentAccountOptions" aria-labelledby="adjustmentAccountLabel adjustmentAccountValue"><span id="adjustmentAccountValue">Payment processing fees</span><span class="category-chevron" aria-hidden="true"></span></button><div class="category-options" id="adjustmentAccountOptions" role="listbox" aria-labelledby="adjustmentAccountLabel" hidden><button class="category-option" type="button" role="option" aria-selected="true" data-value="Payment processing fees">Payment processing fees</button><button class="category-option" type="button" role="option" aria-selected="false" data-value="Needs further review">Needs further review</button></div><input id="adjustmentAccount" type="hidden" value="Payment processing fees"></div></div><div class="actionrow"><button class="primary" id="adjustBtn" type="button">Match + Record $290 Fee</button><button class="ghost" id="findMatchBtn" type="button">Find Another Match</button><button class="ghost" id="notMatchBtn" type="button">Not a Match</button></div><p class="info">Demo action only. This does not post to a real ledger.</p>`;
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
  $('detailBody').innerHTML = body;
  if ($('matchBtn')) $('matchBtn').onclick = () => resolve([item.id, partner.id], 'match', `Matched ${item.name} with ${partner.name}`, 'AI suggested · Maya confirmed');
  if ($('adjustmentAccount')) bindCategoryPicker('adjustmentAccount');
  if ($('adjustBtn')) $('adjustBtn').onclick = () => {
    if ($('adjustmentAccount').value === 'Needs further review') { toast('Choose a fee account before confirming'); return; }
    resolve([item.id, partner.id], 'adjustment', `Matched Stripe payout and recorded $290.00 processing fee`, 'AI suggested · Maya verified adjustment');
  };
  if ($('findMatchBtn')) $('findMatchBtn').onclick = () => showManualMatch(item);
  if ($('notMatchBtn')) $('notMatchBtn').onclick = () => rejectSuggestion(suggestion, item.id);
  if ($('openEntryBtn')) $('openEntryBtn').onclick = () => showCreateEntry(item);
  if ($('openOutstandingBtn')) $('openOutstandingBtn').onclick = () => showOutstanding(item);
  if ($('openExcludeBtn')) $('openExcludeBtn').onclick = () => showExclude(item);
  if ($('undoDetail')) $('undoDetail').onclick = undoLast;
}

function closeModal() { closeCategoryPicker(); $('modalMount').innerHTML = ''; }

function showManualMatch(item) {
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
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
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

function showCreateEntry(item) {
  const suggested = item.kind === 'fee' ? 'Bank fees' : item.kind === 'interest' ? 'Interest income' : item.amount < 0 ? 'Operating expense' : 'Other income';
  const other = item.amount < 0 ? 'Other operating expense' : 'Revenue';
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Create Ledger Entry</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><div class="task-field"><span id="entryCategoryLabel">Category</span><div class="category-picker"><button class="category-trigger" id="entryCategoryTrigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="entryCategoryLabel entryCategoryValue"><span id="entryCategoryValue">Select a category...</span><span class="category-chevron" aria-hidden="true"></span></button><div class="category-options" id="entryCategoryOptions" role="listbox" aria-labelledby="entryCategoryLabel" hidden><button class="category-option" type="button" role="option" aria-selected="false" data-value="${suggested}">${suggested}<span class="category-suggested">Suggested</span></button><button class="category-option" type="button" role="option" aria-selected="false" data-value="${other}">${other}</button></div><input id="entryCategory" type="hidden" value=""></div></div><label class="task-field" for="entryNote">Note<textarea id="entryNote" maxlength="300" placeholder="Optional note"></textarea></label><p class="task-hint">Creates a matching entry in this demo. No real ledger is connected.</p><div class="task-actions"><button class="primary" id="confirmEntryBtn" type="button" disabled>Create &amp; Clear</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
  const trigger = $('entryCategoryTrigger');
  bindCategoryPicker('entryCategory', () => { $('confirmEntryBtn').disabled = false; });
  $('confirmEntryBtn').onclick = () => {
    const category = $('entryCategory').value;
    if (!category) return;
    const note = $('entryNote').value.trim();
    resolve([item.id], 'entry', `Created ledger entry in ${category}`, 'Bank statement · Maya confirmed category', note);
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
  trigger.focus();
}

function showOutstanding(item) {
  const deposit = item.amount > 0;
  const title = deposit ? 'Mark Deposit in Transit' : 'Mark as Outstanding';
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">${title}</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><p class="task-explanation">This entry will be carried forward to next month's reconciliation as ${deposit ? 'a deposit in transit' : 'an outstanding item'}.</p><label class="task-field" for="outstandingNote">Note<textarea id="outstandingNote" maxlength="300" placeholder="${deposit ? 'e.g. Deposit submitted Sep 30; expect to clear Oct 2' : 'e.g. Check mailed Sep 30; expect to clear Oct 5'}"></textarea></label><div class="task-actions"><button class="primary" id="confirmOutstandingBtn" type="button">${deposit ? 'Mark Deposit in Transit' : 'Mark Outstanding'}</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
  $('confirmOutstandingBtn').onclick = () => {
    const note = $('outstandingNote').value.trim();
    resolve([item.id], 'timing', `${deposit ? 'Carried deposit in transit' : 'Carried outstanding check'} to October 2026`, 'Maya explained timing difference', note);
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
  $('outstandingNote').focus();
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

function showAIMatches() {
  const suggestions = visibleSuggestions();
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
    <div class="ai-head"><div><div class="ai-kicker">✦ AI Suggestions · Demo</div><h2 id="aiTitle">${suggestions.length} Possible ${suggestions.length === 1 ? 'Match' : 'Matches'}</h2><p>Amount, date and description signals narrow the review. A net deposit may need an adjustment.</p></div><button class="ai-close" id="aiClose" type="button" aria-label="Close AI Suggestions">×</button></div>
    <div class="ai-list">${suggestions.length ? suggestions.map((s, index) => `<div class="ai-card"><div class="ai-card-head"><strong>Suggested Pair ${index + 1}</strong><span class="signal ${s.adjustment ? 'adjust' : s.score < 90 ? 'review' : ''}">${s.strength}</span></div><div class="ai-pair"><div class="ai-entry"><small>BANK · ${s.bank.date}</small><b>${s.bank.name}</b><span>${money(s.bank.amount)}</span></div><span class="ai-arrow">↔</span><div class="ai-entry"><small>LEDGER · ${s.ledger.date}</small><b>${s.ledger.name}</b><span>${money(s.ledger.amount)}</span></div></div><div class="ai-evidence">${evidence(s)}</div><div class="ai-card-actions"><button class="ghost" type="button" data-review="${s.bank.id}">${s.adjustment ? 'Review Adjustment' : 'Inspect Details'}</button><button class="ghost" type="button" data-reject="${s.bank.id}">Not a Match</button>${s.adjustment ? '' : `<button class="primary" type="button" data-confirm="${s.bank.id}">Confirm Match</button>`}</div></div>`).join('') : '<div class="empty-list">No candidate pairs remain. Review the bank-only and ledger-only items individually.</div>'}</div>
    <div class="ai-disclaimer">Demo matching logic runs in this browser. Signal labels are review priorities, not calibrated probabilities. Nothing is posted automatically.</div>
  </div></div>`;
  $('aiClose').onclick = closeModal;
  document.querySelectorAll('[data-review]').forEach(button => button.onclick = () => {
    state.selected = button.dataset.review;
    state.tab = 'open';
    state.filter = 'suggested';
    $('search').value = '';
    closeModal();
    render();
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
}

function showFinish() {
  if (openItems().length || balanceSnapshot().differenceCents !== 0) return;
  if (state.completed) { showReady(); return; }
  const count = action => Object.values(state.resolved).filter(result => result.action === action).length;
  const balance = money(balanceSnapshot().adjustedBankCents / 100);
  const reviewRows = action => items.filter(item => state.resolved[item.id]?.action === action && (action !== 'adjustment' || item.side === 'bank'))
    .map(item => `<li><strong>${escapeHTML(item.name)}</strong><span>${money(item.amount)}${state.resolved[item.id].note ? ` · ${escapeHTML(state.resolved[item.id].note)}` : ''}</span></li>`).join('');
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="final-card review-modal" role="dialog" aria-modal="true" aria-labelledby="finishTitle"><div class="ai-kicker">Final Review</div><h2 id="finishTitle">Review Before Marking Ready</h2><p>All 14 transactions are explained. Adjusted bank and ledger balances both equal <strong>${balance}</strong>, with a <strong>$0.00 difference</strong>.</p><div class="review-summary"><span>${count('match') / 2} direct pairs matched</span><span>${count('adjustment') / 2} adjusted pair</span><span>${count('entry')} new ledger entries</span><span>${count('timing')} carry forward</span><span>${count('exclude')} excluded</span></div><div class="review-section"><h3>Adjustment and New Entries</h3><ul>${reviewRows('adjustment')}${reviewRows('entry')}</ul></div><div class="review-section"><h3>Carry Forward to Next Period</h3><ul>${reviewRows('timing') || '<li>None</li>'}</ul></div><div class="review-section"><h3>Excluded from This Reconciliation</h3><ul>${reviewRows('exclude') || '<li>None</li>'}</ul></div><label class="review-confirm"><input id="reviewCheck" type="checkbox" /> I reviewed the adjustments, exclusions, and items that need next-period follow-up.</label><div class="final-actions"><button class="primary" id="confirmReview" type="button" disabled>Mark Ready for Review</button><button class="ghost" id="inspectResolved" type="button">Inspect Resolved Items</button></div><p class="task-hint">Demo only. A real close also requires durable audit records, approval, and source-statement verification.</p></div></div>`;
  $('reviewCheck').onchange = () => $('confirmReview').disabled = !$('reviewCheck').checked;
  $('inspectResolved').onclick = () => {
    closeModal();
    state.tab = 'resolved';
    state.selected = tabItems('resolved')[0]?.id || null;
    render();
  };
  $('confirmReview').onclick = () => {
    if (!$('reviewCheck').checked) return;
    state.history.push({ resolved: { ...state.resolved }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, filter: state.filter, selected: state.selected, completed: state.completed });
    state.completed = true;
    state.activity.unshift({ label: 'Marked reconciliation ready for review', origin: 'Final review · Maya confirmed', time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), actor: 'Maya Chen', note: '' });
    render();
    showReady();
  };
  $('reviewCheck').focus();
}

function showReady() {
  const balance = money(balanceSnapshot().adjustedBankCents / 100);
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="final-card" role="dialog" aria-modal="true" aria-labelledby="finishTitle"><div class="check">✓</div><h2 id="finishTitle">Ready for Review</h2><p>Maya reviewed all 14 transactions. The adjusted balances both equal <strong>${balance}</strong>, with a <strong>$0.00 difference</strong>. Timing items remain on the next-period follow-up list.</p><p>This demo does not post to a ledger or approve a real close.</p><div class="final-actions"><button class="primary" id="closeModal" type="button">Back to Reconciliation</button></div></div></div>`;
  $('closeModal').onclick = closeModal;
}

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
