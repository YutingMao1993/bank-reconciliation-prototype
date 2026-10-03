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

const state = { resolved: {}, rejectedPairs: new Set(), selected: 'b1', tab: 'open', history: [], activity: [], aiScanned: false, toastTimer: null };
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

function computeSuggestions() {
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
        strength: possibleNetDeposit ? 'Needs adjustment' : score >= 90 ? 'Strong signal' : 'Review carefully' });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.gap - b.gap);
  const used = new Set();
  return candidates.filter(candidate => {
    if (used.has(candidate.bank.id) || used.has(candidate.ledger.id)) return false;
    used.add(candidate.bank.id);
    used.add(candidate.ledger.id);
    return true;
  });
}

function visibleSuggestions() { return state.aiScanned ? computeSuggestions() : []; }
function suggestionFor(item) { return visibleSuggestions().find(s => s.bank.id === item.id || s.ledger.id === item.id); }
function tabItems(tab) {
  if (tab === 'resolved') return items.filter(item => !!state.resolved[item.id]);
  const open = openItems();
  if (tab === 'suggested') {
    const suggestedIds = new Set(visibleSuggestions().flatMap(s => [s.bank.id, s.ledger.id]));
    return open.filter(item => suggestedIds.has(item.id));
  }
  if (tab === 'bank-only' || tab === 'ledger-only') {
    const suggestedIds = new Set(visibleSuggestions().flatMap(s => [s.bank.id, s.ledger.id]));
    return open.filter(item => item.side === (tab === 'bank-only' ? 'bank' : 'ledger') &&
      (item.kind || state.aiScanned && !suggestedIds.has(item.id)));
  }
  return open;
}
function selectNextInTab() {
  const next = tabItems(state.tab)[0];
  if (next) { state.selected = next.id; return; }
  if (state.tab === 'open' && !openItems().length) {
    state.tab = 'resolved';
    state.selected = tabItems('resolved')[0]?.id || null;
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
  state.history.push({ resolved: { ...state.resolved }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, selected: state.selected });
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  ids.forEach(id => state.resolved[id] = { action, label, time, origin, note });
  state.activity.unshift({ label, origin, time, actor: 'Maya Chen', note });
  selectNextInTab();
  render();
  toast(label, true);
}

function rejectSuggestion(suggestion, selectedId) {
  state.history.push({ resolved: { ...state.resolved }, rejectedPairs: new Set(state.rejectedPairs), activity: [...state.activity], tab: state.tab, selected: state.selected });
  state.rejectedPairs.add(pairKey(suggestion.bank.id, suggestion.ledger.id));
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  state.activity.unshift({ label: `Rejected suggested match: ${suggestion.bank.name} ↔ ${suggestion.ledger.name}`, origin: 'AI suggested · Maya rejected', time, actor: 'Maya Chen', note: '' });
  state.selected = selectedId;
  state.tab = items.find(item => item.id === selectedId).side === 'bank' ? 'bank-only' : 'ledger-only';
  closeModal();
  render();
  toast('Suggestion rejected. Choose a resolution for each item.', true);
}

function undoLast() {
  const previous = state.history.pop();
  if (!previous) return;
  state.resolved = previous.resolved;
  state.rejectedPairs = previous.rejectedPairs;
  state.activity = previous.activity;
  state.tab = previous.tab;
  state.selected = previous.selected;
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
  $('progressNum').textContent = `${resolved} of 14`;
  $('progressSub').textContent = resolved === 14 ? 'All transactions reviewed' : `${open.length} transaction${open.length === 1 ? '' : 's'} need attention`;
  $('progressFill').style.width = `${resolved / 14 * 100}%`;
  $('sideCount').textContent = open.length;
  $('pairCount').textContent = state.aiScanned ? suggestions.length : '—';
  $('pairSub').textContent = state.aiScanned ? (suggestions.length ? 'Review before confirming' : 'No candidates remain') : 'Scan open transactions';
  $('bankCount').textContent = tabItems('bank-only').length;
  $('ledgerCount').textContent = tabItems('ledger-only').length;
  $('openTabCount').textContent = open.length;
  $('suggestedTabCount').textContent = tabItems('suggested').length;
  $('bankOnlyTabCount').textContent = tabItems('bank-only').length;
  $('ledgerOnlyTabCount').textContent = tabItems('ledger-only').length;
  $('resolvedTabCount').textContent = resolved;
  $('aiMatchBtn').textContent = state.aiScanned ? `✦ AI Match · ${suggestions.length}` : '✦ AI Match';
  const balance = balanceSnapshot();
  $('finishBtn').disabled = resolved !== 14 || balance.differenceCents !== 0;
  $('timingTotal').textContent = signedMoney(balance.timingCents / 100);
  $('adjustedBank').textContent = money(balance.adjustedBankCents / 100);
  $('adjustedLedger').textContent = money(balance.adjustedLedgerCents / 100);
  $('balanceDifference').textContent = money(Math.abs(balance.differenceCents) / 100);
  $('balanceDifference').className = balance.differenceCents === 0 ? 'difference-clear' : 'difference-open';
  $('balanceStatus').textContent = balance.differenceCents === 0 ?
    (open.length ? `Balances agree · ${open.length} items still need review` : 'All items explained · $0.00 difference') :
    `${money(Math.abs(balance.differenceCents) / 100)} difference · ${open.length} items open`;
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === state.tab);
    tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab));
  });
  renderList();
  renderDetail();
  renderActivity();
}

function rowBadge(item) {
  if (state.resolved[item.id]) return 'Resolved';
  const suggestion = suggestionFor(item);
  if (suggestion) return suggestion.adjustment ? 'Review adjustment' : 'AI suggested';
  if (item.kind) return item.side === 'bank' ? 'Create entry' : item.amount < 0 ? 'Outstanding' : 'In transit';
  if (rejectedFor(item) || state.aiScanned) return 'Needs resolution';
  return 'Scan for match';
}

function renderList() {
  const query = $('search').value.trim().toLowerCase();
  const shown = tabItems(state.tab).filter(item =>
    `${item.name} ${item.ref} ${item.amount}`.toLowerCase().includes(query)
  ).sort((a, b) => a.side === b.side ? dateNumber(b) - dateNumber(a) : a.side === 'bank' ? -1 : 1);
  const label = { open: 'open', suggested: 'suggested', 'bank-only': 'bank-only', 'ledger-only': 'ledger-only', resolved: 'resolved' }[state.tab];
  $('transactionsVisibleCount').textContent = `${shown.length} ${label}`;
  $('transactionList').innerHTML = shown.length ? shown.map(item => `<button type="button" class="row combined-row ${state.selected === item.id ? 'selected' : ''} ${state.resolved[item.id] ? 'resolved' : ''}" data-id="${item.id}" aria-label="${item.side === 'bank' ? 'Bank statement' : 'General ledger'}: ${item.name}, ${money(item.amount)}">
    <span class="combined-main"><span class="combined-title"><span class="source-chip ${item.side}">${item.side === 'bank' ? 'BANK' : 'LEDGER'}</span><span class="row-title">${item.name}</span></span><span class="row-meta">${item.date} &nbsp; ${item.ref}</span></span>
    <span class="combined-right"><span class="amount ${item.amount < 0 ? 'negative' : 'positive'}">${listMoney(item.amount)}</span><span class="badge ${state.resolved[item.id] ? 'done' : ''}">${rowBadge(item)}</span></span>
  </button>`).join('') : `<div class="empty-list">${query ? 'No transactions match this search.' : state.tab === 'suggested' && !state.aiScanned ? 'Run AI Match to see suggested transactions.' : `No transactions in ${label}.`}</div>`;
  document.querySelectorAll('.row').forEach(row => row.onclick = () => { state.selected = row.dataset.id; render(); });
}

function renderDetail() {
  const item = items.find(entry => entry.id === state.selected);
  if (!item) {
    $('detailIndex').textContent = '';
    $('detailBody').innerHTML = state.tab === 'suggested' && !state.aiScanned ? '<div class="ai-launch"><div class="section-title">Find possible matches</div><p>Run AI Match to see suggested bank and ledger pairs here.</p><div class="actionrow"><button class="primary" id="detailScanBtn" type="button">✦ Run AI Match</button></div></div>' : `<p class="small-muted">${state.tab === 'resolved' ? 'No resolved transactions yet.' : 'No transactions in this view.'}</p>`;
    if ($('detailScanBtn')) $('detailScanBtn').onclick = runAIMatch;
    return;
  }
  $('detailIndex').textContent = `Item ${items.indexOf(item) + 1} of 14`;
  const suggestion = suggestionFor(item);
  const partner = suggestion && (suggestion.bank.id === item.id ? suggestion.ledger : suggestion.bank);
  let body = `<span class="source-tag ${item.side === 'bank' ? 'bank' : ''}">${item.side === 'bank' ? 'Bank statement' : 'General ledger'}</span>
    <div class="detail-title">${item.name}</div><div class="detail-amount">${money(item.amount)}</div>
    <div class="facts"><div class="fact"><span>Date</span><strong>${item.date}, 2026</strong></div><div class="fact"><span>Reference</span><strong>${item.ref}</strong></div><div class="fact"><span>Account</span><strong>Operating ·•• 4821</strong></div></div><div class="rule"></div>`;
  if (state.resolved[item.id]) {
    const result = state.resolved[item.id];
    body += `<div class="resolved-card"><strong>✓ ${escapeHTML(result.label)}</strong><br>Reviewed by Maya Chen at ${result.time}. ${result.action === 'adjustment' ? 'Both sides were matched and a $290.00 processing fee was recorded in this demo.' : result.action === 'match' ? 'Both sides were cleared together.' : result.action === 'exclude' ? 'Excluded from this review with a recorded reason. No balance adjustment was made.' : item.side === 'bank' ? 'A corresponding ledger entry was added in this demo.' : 'The item remains on the next-period follow-up list.'}${result.note ? `<div class="resolved-note">Note: ${escapeHTML(result.note)}</div>` : ''}</div><div class="actionrow"><button class="ghost" id="undoDetail" type="button">Undo last action</button></div>`;
  } else if (partner && suggestion.adjustment) {
    body += `<div class="section-title">✦ AI suggestion <span class="signal adjust" style="margin-left:7px">Needs adjustment</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank statement' : 'General ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="rule"></div><div class="section-title">Review proposed fee entry</div><div class="adjustment-box"><strong>Possible net deposit</strong><p>The $290.00 difference may be a processing fee. Verify it against the payout report before confirming.</p><div class="balance-preview"><span>Gross ledger receipt</span><span>$12,770.75</span></div><div class="balance-preview"><span>Proposed processing fee</span><span>−$290.00</span></div><div class="balance-preview"><span>Bank deposit</span><span>$12,480.75</span></div></div>
      <label class="formline">Fee account<select id="adjustmentAccount"><option>Payment processing fees</option><option>Needs further review</option></select></label><div class="actionrow"><button class="primary" id="adjustBtn" type="button">Match + record $290 fee</button><button class="ghost" id="notMatchBtn" type="button">Not a match</button></div><p class="info">Demo action only. This does not post to a real ledger.</p>`;
  } else if (partner) {
    body += `<div class="section-title">✦ AI Match suggestion <span class="signal ${suggestion.score < 90 ? 'review' : ''}" style="margin-left:7px">${suggestion.strength}</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank statement' : 'General ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="explain">This is a suggestion, not an automatic posting. Confirm the transaction identity before matching.</div><div class="actionrow"><button class="primary" id="matchBtn" type="button">Confirm match</button><button class="ghost" id="notMatchBtn" type="button">Not a match</button></div>`;
  } else if (!item.kind && !rejectedFor(item) && !state.aiScanned) {
    body += `<div class="ai-launch"><div class="section-title">Find a possible match</div><p>Compare this transaction with open entries on the other side.</p><div class="actionrow"><button class="primary" id="detailScanBtn" type="button">✦ Run AI Match</button></div></div>`;
  } else if (item.side === 'bank') {
    const account = item.kind === 'fee' ? 'Bank fees' : item.kind === 'interest' ? 'Interest income' : item.amount < 0 ? 'Operating expense' : 'Other income';
    body += `${rejectedFor(item) ? '<p class="rejected-info">AI suggestion marked “Not a match.” Review this transaction on its own.</p>' : ''}<div class="section-title resolve-kicker">Resolve this item</div><div class="resolution-actions"><div class="resolution-choice"><button class="resolution-button" id="openEntryBtn" type="button">Create ledger entry</button><p>Record this bank transaction in the ledger.</p></div><div class="resolution-choice"><button class="resolution-button danger" id="openExcludeBtn" type="button">Exclude</button><p>Remove from reconciliation scope with a note.</p></div></div><p class="info">Suggested category: ${account}. Confirm the account before creating an entry.</p>`;
  } else {
    body += `${rejectedFor(item) ? '<p class="rejected-info">AI suggestion marked “Not a match.” Review this transaction on its own.</p>' : ''}<div class="section-title resolve-kicker">Resolve this item</div><div class="resolution-actions"><div class="resolution-choice"><button class="resolution-button" id="openOutstandingBtn" type="button">${item.amount > 0 ? 'Mark deposit in transit' : 'Mark as outstanding'}</button><p>${item.amount > 0 ? 'Deposit recorded, but not yet on the bank statement.' : "Transaction hasn't cleared the bank yet."}</p></div><div class="resolution-choice"><button class="resolution-button danger" id="openExcludeBtn" type="button">Exclude</button><p>Remove from reconciliation scope with a note.</p></div></div><p class="info">This item will carry forward if marked as a timing difference.</p>`;
  }
  $('detailBody').innerHTML = body;
  if ($('matchBtn')) $('matchBtn').onclick = () => resolve([item.id, partner.id], 'match', `Matched ${item.name} with ${partner.name}`, 'AI suggested · Maya confirmed');
  if ($('adjustBtn')) $('adjustBtn').onclick = () => {
    if ($('adjustmentAccount').value === 'Needs further review') { toast('Choose a fee account before confirming'); return; }
    resolve([item.id, partner.id], 'adjustment', `Matched Stripe payout and recorded $290.00 processing fee`, 'AI suggested · Maya verified adjustment');
  };
  if ($('detailScanBtn')) $('detailScanBtn').onclick = runAIMatch;
  if ($('notMatchBtn')) $('notMatchBtn').onclick = () => rejectSuggestion(suggestion, item.id);
  if ($('openEntryBtn')) $('openEntryBtn').onclick = () => showCreateEntry(item);
  if ($('openOutstandingBtn')) $('openOutstandingBtn').onclick = () => showOutstanding(item);
  if ($('openExcludeBtn')) $('openExcludeBtn').onclick = () => showExclude(item);
  if ($('undoDetail')) $('undoDetail').onclick = undoLast;
}

function closeModal() { $('modalMount').innerHTML = ''; }

function showCreateEntry(item) {
  const suggested = item.kind === 'fee' ? 'Bank fees' : item.kind === 'interest' ? 'Interest income' : item.amount < 0 ? 'Operating expense' : 'Other income';
  const other = item.amount < 0 ? 'Other operating expense' : 'Revenue';
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Create Ledger Entry</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><label class="task-field" for="entryCategory">Category<select id="entryCategory" required><option value="">Select a category...</option><option value="${suggested}">${suggested} · suggested</option><option value="${other}">${other}</option></select></label><label class="task-field" for="entryNote">Note<textarea id="entryNote" maxlength="300" placeholder="Optional note"></textarea></label><p class="task-hint">Creates a matching entry in this demo. No real ledger is connected.</p><div class="task-actions"><button class="primary" id="confirmEntryBtn" type="button" disabled>Create &amp; Clear</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
  $('entryCategory').onchange = () => $('confirmEntryBtn').disabled = !$('entryCategory').value;
  $('confirmEntryBtn').onclick = () => {
    const category = $('entryCategory').value;
    if (!category) return;
    const note = $('entryNote').value.trim();
    resolve([item.id], 'entry', `Created ledger entry in ${category}`, 'Bank statement · Maya confirmed category', note);
    closeModal();
  };
  $('cancelTaskModal').onclick = closeModal;
  $('entryCategory').focus();
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
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskTitle"><h2 id="taskTitle">Exclude Transaction</h2><p class="task-subtitle">${item.name} — ${money(item.amount)}</p><p class="task-explanation">Record why this transaction is outside the reconciliation scope. Excluding it does not change the bank or ledger balance.</p><label class="task-field" for="excludeNote">Reason for exclusion<textarea id="excludeNote" maxlength="300" placeholder="Explain why this item should be excluded" required></textarea></label><div class="task-actions"><button class="primary danger-confirm" id="confirmExcludeBtn" type="button" disabled>Exclude Item</button><button class="ghost" id="cancelTaskModal" type="button">Cancel</button></div></div></div>`;
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
    <div class="ai-head"><div><div class="ai-kicker">✦ AI Match · Demo</div><h2 id="aiTitle">${suggestions.length} possible ${suggestions.length === 1 ? 'match' : 'matches'}</h2><p>Amount, date and description signals narrow the review. A net deposit may need an adjustment.</p></div><button class="ai-close" id="aiClose" type="button" aria-label="Close AI Match">×</button></div>
    <div class="ai-list">${suggestions.length ? suggestions.map((s, index) => `<div class="ai-card"><div class="ai-card-head"><strong>Suggested pair ${index + 1}</strong><span class="signal ${s.adjustment ? 'adjust' : s.score < 90 ? 'review' : ''}">${s.strength}</span></div><div class="ai-pair"><div class="ai-entry"><small>BANK · ${s.bank.date}</small><b>${s.bank.name}</b><span>${money(s.bank.amount)}</span></div><span class="ai-arrow">↔</span><div class="ai-entry"><small>LEDGER · ${s.ledger.date}</small><b>${s.ledger.name}</b><span>${money(s.ledger.amount)}</span></div></div><div class="ai-evidence">${evidence(s)}</div><div class="ai-card-actions"><button class="ghost" type="button" data-review="${s.bank.id}">${s.adjustment ? 'Review adjustment' : 'Inspect details'}</button><button class="ghost" type="button" data-reject="${s.bank.id}">Not a match</button>${s.adjustment ? '' : `<button class="primary" type="button" data-confirm="${s.bank.id}">Confirm match</button>`}</div></div>`).join('') : '<div class="empty-list">No candidate pairs remain. Review the bank-only and ledger-only items individually.</div>'}</div>
    <div class="ai-disclaimer">Demo matching logic runs in this browser. Signal labels are review priorities, not calibrated probabilities. Nothing is posted automatically.</div>
  </div></div>`;
  $('aiClose').onclick = closeModal;
  document.querySelectorAll('[data-review]').forEach(button => button.onclick = () => {
    state.selected = button.dataset.review;
    state.tab = 'suggested';
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

function runAIMatch() {
  state.aiScanned = true;
  if (!tabItems(state.tab).some(item => item.id === state.selected)) state.selected = tabItems(state.tab)[0]?.id || null;
  render();
  showAIMatches();
}

function showFinish() {
  if (openItems().length || balanceSnapshot().differenceCents !== 0) return;
  const count = action => Object.values(state.resolved).filter(result => result.action === action).length;
  const balance = money(balanceSnapshot().adjustedBankCents / 100);
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="final-card" role="dialog" aria-modal="true" aria-labelledby="finishTitle"><div class="check">✓</div><h2 id="finishTitle">Reconciliation ready for review</h2><p>All 14 items are explained. Adjusted bank and ledger balances both equal <strong>${balance}</strong>, with a <strong>$0.00 difference</strong>.</p><ul><li>${count('match') / 2} direct pairs matched</li><li>${count('adjustment') / 2} pair matched with an adjustment</li><li>${count('entry')} ledger entries created</li><li>${count('timing')} timing items carried forward</li><li>${count('exclude')} items excluded with a reason</li></ul><p>Review activity shows who confirmed each demo action. A real close would also require durable audit records, approval and source-statement verification.</p><div class="final-actions"><button class="primary" id="closeModal" type="button">Back to reconciliation</button><button class="ghost" id="resetModal" type="button">Restart demo</button></div></div></div>`;
  $('closeModal').onclick = closeModal;
  $('resetModal').onclick = () => $('resetBtn').click();
}

$('search').addEventListener('input', renderList);
document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => {
  state.tab = tab.dataset.tab;
  const candidates = tabItems(state.tab);
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
  state.aiScanned = false;
  $('search').value = '';
  closeModal();
  render();
  toast('Demo reset to 14 open transactions');
};
$('aiMatchBtn').onclick = runAIMatch;
$('finishBtn').onclick = showFinish;
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
render();
