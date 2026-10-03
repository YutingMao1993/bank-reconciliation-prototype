// Fictional transactions for an interactive design exercise. No accounting data leaves this page.
const items = [
  { id: 'b1', side: 'bank', date: 'Sep 30', name: 'ATLASSIAN CLOUD', amount: -840, ref: 'ACH 447198' },
  { id: 'l1', side: 'ledger', date: 'Sep 29', name: 'Atlassian subscription', amount: -840, ref: 'Bill payment · AP-2041' },
  { id: 'b2', side: 'bank', date: 'Sep 28', name: 'STRIPE PAYOUT 09/28', amount: 12480.75, ref: 'Transfer 884201' },
  { id: 'l2', side: 'ledger', date: 'Sep 27', name: 'September customer receipts', amount: 12480.75, ref: 'Deposit · DEP-138' },
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

const state = { resolved: {}, selected: 'b1', tab: 'open', history: [], aiScanned: false, toastTimer: null };
const $ = id => document.getElementById(id);
const money = amount => `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const openItems = () => items.filter(item => !state.resolved[item.id]);
const dateNumber = item => Number(item.date.split(' ')[1]);

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
      const gap = Math.abs(dateNumber(b) - dateNumber(l));
      if (Math.round(b.amount * 100) !== Math.round(l.amount * 100) || gap > 3) continue;
      const shared = [...nameTokens(b.name)].filter(token => nameTokens(l.name).has(token));
      const score = 75 + (gap <= 1 ? 12 : gap === 2 ? 8 : 4) + (shared.length ? 8 : 0);
      candidates.push({ bank: b, ledger: l, score, gap, shared, strength: score >= 90 ? 'Strong signal' : 'Review carefully' });
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
function evidence(s) {
  const date = `${s.gap} day${s.gap === 1 ? '' : 's'} apart`;
  return `Exact amount · ${date}${s.shared.length ? ` · Related description: ${s.shared.join(', ')}` : ' · Descriptions differ; inspect both records'}`;
}

function resolve(ids, action, label) {
  state.history.push({ ...state.resolved });
  ids.forEach(id => state.resolved[id] = { action, label, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
  state.tab = openItems().length ? 'open' : 'resolved';
  state.selected = openItems()[0]?.id || ids[0];
  render();
  toast(label, true);
}

function undoLast() {
  const previous = state.history.pop();
  if (!previous) return;
  state.resolved = previous;
  state.tab = 'open';
  state.selected = openItems()[0]?.id || state.selected;
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
  $('bankCount').textContent = open.filter(item => item.side === 'bank' && item.kind).length;
  $('ledgerCount').textContent = open.filter(item => item.side === 'ledger' && item.kind).length;
  $('openTabCount').textContent = open.length;
  $('resolvedTabCount').textContent = resolved;
  $('aiMatchBtn').textContent = state.aiScanned ? `✦ AI Match · ${suggestions.length}` : '✦ AI Match';
  $('finishBtn').disabled = resolved !== 14;
  $('adjustedLedger').textContent = money(487346.86 + (state.resolved.b6 ? -45 : 0) + (state.resolved.b7 ? 12.5 : 0));
  $('balanceStatus').textContent = resolved === 14 ? 'Balances agree · $0.00 difference' : `${open.length} items to review`;
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === state.tab);
    tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab));
  });
  renderList();
  renderDetail();
}

function rowBadge(item) {
  if (state.resolved[item.id]) return 'Resolved';
  if (suggestionFor(item)) return 'AI suggested';
  if (item.kind) return item.side === 'bank' ? 'Record entry' : 'Timing';
  return 'Scan for match';
}

function renderList() {
  const query = $('search').value.trim().toLowerCase();
  const shown = items.filter(item =>
    (state.tab === 'open' ? !state.resolved[item.id] : !!state.resolved[item.id]) &&
    `${item.name} ${item.ref} ${item.amount}`.toLowerCase().includes(query)
  );
  for (const side of ['bank', 'ledger']) {
    const rows = shown.filter(item => item.side === side);
    const label = state.tab === 'open' ? 'open' : 'resolved';
    $(`${side}VisibleCount`).textContent = `${rows.length} ${label}`;
    $(`${side}List`).innerHTML = rows.length ? rows.map(item => `<button type="button" class="row ${state.selected === item.id ? 'selected' : ''} ${state.resolved[item.id] ? 'resolved' : ''}" data-id="${item.id}" aria-label="${item.name}, ${money(item.amount)}">
      <span class="type-icon ${item.side === 'ledger' ? 'ledger' : ''}">${item.side === 'bank' ? '↘' : '▤'}</span>
      <span class="row-main"><span class="row-title">${item.name}</span><span class="row-meta">${item.date} · ${item.ref}</span></span>
      <span class="row-right"><span class="amount">${money(item.amount)}</span><br><span class="badge ${state.resolved[item.id] ? 'done' : ''}">${rowBadge(item)}</span></span>
    </button>`).join('') : `<div class="empty-list">No ${label} ${side === 'bank' ? 'bank' : 'ledger'} transactions${query ? ' match this search' : ''}.</div>`;
  }
  document.querySelectorAll('.row').forEach(row => row.onclick = () => { state.selected = row.dataset.id; render(); });
}

function renderDetail() {
  const item = items.find(entry => entry.id === state.selected);
  if (!item) {
    $('detailIndex').textContent = '';
    $('detailBody').innerHTML = `<p class="small-muted">${state.tab === 'resolved' ? 'No resolved transactions yet.' : 'Choose a transaction to review.'}</p>`;
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
    body += `<div class="resolved-card"><strong>✓ ${result.label}</strong><br>Reviewed at ${result.time}. ${result.action === 'match' ? 'Both sides were cleared together.' : item.side === 'bank' ? 'A corresponding ledger entry was added in this demo.' : 'The item remains on the next-period follow-up list.'}</div><div class="actionrow"><button class="ghost" id="undoDetail" type="button">Undo last action</button></div>`;
  } else if (partner) {
    body += `<div class="section-title">✦ AI Match suggestion <span class="signal ${suggestion.score < 90 ? 'review' : ''}" style="margin-left:7px">${suggestion.strength}</span></div>
      <div class="candidate"><div class="candidate-top"><div><strong>${partner.name}</strong><p>${partner.side === 'bank' ? 'Bank statement' : 'General ledger'} · ${partner.date} · ${partner.ref}</p></div><div class="candidate-amount">${money(partner.amount)}</div></div><div class="candidate-evidence">${evidence(suggestion)}</div></div>
      <div class="explain">This is a suggestion, not an automatic posting. Confirm the transaction identity before matching.</div><div class="actionrow"><button class="primary" id="matchBtn" type="button">Confirm match</button></div>`;
  } else if (!item.kind) {
    body += `<div class="ai-launch"><div class="section-title">Find a possible match</div><p>Compare this transaction with open entries on the other side.</p><div class="actionrow"><button class="primary" id="detailScanBtn" type="button">✦ Run AI Match</button></div></div>`;
  } else if (item.side === 'bank') {
    const account = item.kind === 'fee' ? 'Bank fees' : 'Interest income';
    body += `<div class="section-title">Record missing ledger entry</div><p class="info">This bank transaction has no ledger entry. Confirm the account below to record it in the demo ledger.</p><label class="formline">Account<select id="accountSelect"><option>${account}</option>${item.kind === 'fee' ? '<option>Other operating expense</option>' : '<option>Other income</option>'}</select></label><div class="explain">The ${item.kind === 'fee' ? 'fee reduces' : 'interest increases'} the book balance by ${money(Math.abs(item.amount))}. A real accounting system would require approval and posting controls.</div><div class="actionrow"><button class="primary" id="recordBtn" type="button">Record ${item.kind === 'fee' ? 'fee' : 'interest'}</button></div>`;
  } else {
    body += `<div class="section-title">Explain timing difference</div><p class="info">This ledger transaction is missing from the September bank statement. Keep it visible for the next statement review.</p><label class="formline">Expected to clear<select id="clearDate"><option>October 2026</option><option>Needs investigation</option></select></label><div class="explain">${item.kind === 'deposit' ? 'Deposit in transit: add $1,900.00 to the bank statement balance.' : 'Outstanding check: subtract $860.00 from the bank statement balance.'}</div><div class="actionrow"><button class="primary" id="timingBtn" type="button">Mark as timing difference</button></div>`;
  }
  $('detailBody').innerHTML = body;
  if ($('matchBtn')) $('matchBtn').onclick = () => resolve([item.id, partner.id], 'match', `Matched ${item.name} with ${partner.name}`);
  if ($('detailScanBtn')) $('detailScanBtn').onclick = runAIMatch;
  if ($('recordBtn')) $('recordBtn').onclick = () => resolve([item.id], 'entry', `Recorded ${item.kind} to ${$('accountSelect').value}`);
  if ($('timingBtn')) $('timingBtn').onclick = () => resolve([item.id], 'timing', `Marked ${item.name} as ${$('clearDate').value === 'Needs investigation' ? 'needs investigation' : 'a timing difference'}`);
  if ($('undoDetail')) $('undoDetail').onclick = undoLast;
}

function closeModal() { $('modalMount').innerHTML = ''; }

function showAIMatches() {
  const suggestions = visibleSuggestions();
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
    <div class="ai-head"><div><div class="ai-kicker">✦ AI Match · Demo</div><h2 id="aiTitle">${suggestions.length} possible ${suggestions.length === 1 ? 'match' : 'matches'}</h2><p>Exact amounts and nearby dates are checked first; descriptions help prioritize review.</p></div><button class="ai-close" id="aiClose" type="button" aria-label="Close AI Match">×</button></div>
    <div class="ai-list">${suggestions.length ? suggestions.map((s, index) => `<div class="ai-card"><div class="ai-card-head"><strong>Suggested pair ${index + 1}</strong><span class="signal ${s.score < 90 ? 'review' : ''}">${s.strength}</span></div><div class="ai-pair"><div class="ai-entry"><small>BANK · ${s.bank.date}</small><b>${s.bank.name}</b><span>${money(s.bank.amount)}</span></div><span class="ai-arrow">↔</span><div class="ai-entry"><small>LEDGER · ${s.ledger.date}</small><b>${s.ledger.name}</b><span>${money(s.ledger.amount)}</span></div></div><div class="ai-evidence">${evidence(s)}</div><div class="ai-card-actions"><button class="ghost" type="button" data-review="${s.bank.id}">Inspect details</button><button class="primary" type="button" data-confirm="${s.bank.id}">Confirm match</button></div></div>`).join('') : '<div class="empty-list">No candidate pairs remain. Review the bank-only and ledger-only items individually.</div>'}</div>
    <div class="ai-disclaimer">Demo matching logic runs in this browser. Signal labels are review priorities, not calibrated probabilities. Nothing is posted automatically.</div>
  </div></div>`;
  $('aiClose').onclick = closeModal;
  document.querySelectorAll('[data-review]').forEach(button => button.onclick = () => {
    state.selected = button.dataset.review;
    state.tab = 'open';
    closeModal();
    render();
  });
  document.querySelectorAll('[data-confirm]').forEach(button => button.onclick = () => {
    const suggestion = visibleSuggestions().find(s => s.bank.id === button.dataset.confirm);
    if (!suggestion) return;
    resolve([suggestion.bank.id, suggestion.ledger.id], 'match', `Matched ${suggestion.bank.name} with ${suggestion.ledger.name}`);
    showAIMatches();
  });
}

function runAIMatch() {
  state.aiScanned = true;
  render();
  showAIMatches();
}

function showFinish() {
  if (openItems().length) return;
  $('modalMount').innerHTML = `<div class="final-overlay" role="presentation"><div class="final-card" role="dialog" aria-modal="true" aria-labelledby="finishTitle"><div class="check">✓</div><h2 id="finishTitle">Reconciliation ready for review</h2><p>All 14 exceptions have been addressed. The adjusted bank and ledger balances both equal <strong>$487,314.36</strong>.</p><ul><li>5 suggested pairs matched</li><li>2 missing ledger entries recorded</li><li>2 timing differences carried forward to October</li></ul><p>This demo stops at review. A real close would require an approval, audit trail, and confirmation against the source statement.</p><div class="final-actions"><button class="primary" id="closeModal" type="button">Back to reconciliation</button><button class="ghost" id="resetModal" type="button">Restart demo</button></div></div></div>`;
  $('closeModal').onclick = closeModal;
  $('resetModal').onclick = () => $('resetBtn').click();
}

$('search').addEventListener('input', renderList);
document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => {
  state.tab = tab.dataset.tab;
  const candidates = items.filter(item => state.tab === 'open' ? !state.resolved[item.id] : !!state.resolved[item.id]);
  if (!candidates.some(item => item.id === state.selected)) state.selected = candidates[0]?.id || null;
  render();
});
$('resetBtn').onclick = () => {
  state.resolved = {};
  state.history = [];
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
