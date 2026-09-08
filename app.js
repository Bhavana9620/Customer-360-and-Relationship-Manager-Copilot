/* ============================================================
   DEMO-ONLY LEGACY FRONTEND
   This file is not part of the production application.
   The real app is implemented in apps/web (Angular) and
   apps/api (NestJS).
============================================================ */

const state = {
  token: null, user: null,
  view: 'login', loginUsers: [],
  customerId: null, profileTab: 'overview',
  customer: null, tabData: {},           // tabData[tab] = fetched data for current customer
  searchQuery: '', searchResults: [],
  dashboard: null, queue: [],
  audit: [], auditUserFilter: '', auditTextFilter: '',
  copilot: {}, chatByCustomer: {},
  loading: {},
  error: null,
};

const app = document.getElementById('app');

async function api(path, opts = {}) {
  const res = await fetch(window.API_BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) throw new Error((data && data.message) || res.statusText || 'Request failed');
  return data;
}

function currency(n) { const s = n < 0 ? '-' : ''; return s + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN'); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function initials(name) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }

/* ---------------- boot / login ---------------- */

async function boot() {
  try {
    state.loginUsers = await api('/auth/users');
  } catch (e) {
    state.error = "Can't reach the API at " + window.API_BASE + ". Is the mock server running? (cd mock-server && npm start)";
  }
  render();
}

async function loginAs(userId) {
  try {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { userId } });
    state.token = token; state.user = user;
    state.view = user.role === 'Manager' ? 'dashboard' : user.role === 'Auditor' ? 'audit' : user.role === 'Operations' ? 'queue' : 'search';
    if (state.view === 'search') await loadSearch();
    if (state.view === 'dashboard') await loadDashboard();
    if (state.view === 'queue') await loadQueue();
    if (state.view === 'audit') await loadAudit();
  } catch (e) { state.error = e.message; }
  render();
}
function signOut() { Object.assign(state, { token: null, user: null, view: 'login', customerId: null }); render(); boot(); }

/* ---------------- navigation ---------------- */

async function go(view, extra) {
  state.view = view;
  Object.assign(state, extra || {});
  state.error = null;
  render(); // show a loading shell immediately
  if (view === 'search') await loadSearch();
  if (view === 'dashboard') await loadDashboard();
  if (view === 'queue') await loadQueue();
  if (view === 'audit') await loadAudit();
  if (view === 'profile') await loadCustomer(state.customerId);
  render();
}

async function setProfileTab(tab) {
  state.profileTab = tab;
  render();
  await loadTab(state.customerId, tab);
  render();
}

/* ---------------- data loaders ---------------- */

async function onSearch(v) {
  state.searchQuery = v;
  if (state.view !== 'search') { state.view = 'search'; }
  await loadSearch();
  render();
  const el = document.getElementById('global-search');
  if (el) { el.focus(); el.setSelectionRange(v.length, v.length); }
}
async function loadSearch() {
  try { state.searchResults = await api('/customers?q=' + encodeURIComponent(state.searchQuery)); }
  catch (e) { state.error = e.message; }
}
async function loadCustomer(id) {
  state.tabData = {};
  try {
    state.customer = await api(`/customers/${id}`);
    await loadTab(id, state.profileTab);
  } catch (e) { state.error = e.message; }
}
async function loadTab(id, tab) {
  try {
    if (tab === 'accounts' && !state.tabData.accounts) {
      const [accounts, loans, cards] = await Promise.all([
        api(`/customers/${id}/accounts`), api(`/customers/${id}/loans`), api(`/customers/${id}/cards`),
      ]);
      state.tabData.accounts = accounts; state.tabData.loans = loans; state.tabData.cards = cards;
    }
    if (tab === 'transactions' && !state.tabData.transactions) {
      state.tabData.transactions = (await api(`/customers/${id}/transactions?pageSize=50`)).items;
    }
    if (tab === 'interactions' && !state.tabData.interactions) {
      state.tabData.interactions = await api(`/customers/${id}/interactions`);
    }
    if (tab === 'requests' && !state.tabData.requests) {
      state.tabData.requests = await api(`/customers/${id}/service-requests`);
    }
  } catch (e) { state.error = e.message; }
}
async function loadDashboard() {
  try { state.dashboard = await api('/dashboard/summary'); } catch (e) { state.error = e.message; }
}
async function loadQueue() {
  try { state.queue = await api('/service-requests'); } catch (e) { state.error = e.message; }
}
async function loadAudit() {
  try {
    const params = new URLSearchParams();
    if (state.auditUserFilter) params.set('user', state.auditUserFilter);
    if (state.auditTextFilter) params.set('action', state.auditTextFilter);
    state.audit = await api('/audit?' + params.toString());
  } catch (e) { state.error = e.message; }
}
async function updateAuditFilters() {
  state.auditUserFilter = document.getElementById('audit-user-filter').value;
  state.auditTextFilter = document.getElementById('audit-text-filter').value;
  await loadAudit();
  render();
}
function exportAudit() { window.open(window.API_BASE + '/audit/export', '_blank'); }

/* ---------------- actions (write endpoints) ---------------- */

async function logInteraction(customerId) {
  const notes = document.getElementById('new-note').value.trim();
  const channel = document.getElementById('new-channel').value;
  if (!notes) return;
  try {
    await api(`/customers/${customerId}/interactions`, { method: 'POST', body: { channel, notes } });
    state.tabData.interactions = null;
    await loadTab(customerId, 'interactions');
  } catch (e) { state.error = e.message; }
  render();
}
async function createServiceRequest(customerId) {
  const type = document.getElementById('new-sr-type').value.trim();
  if (!type) return;
  try {
    await api(`/customers/${customerId}/service-requests`, { method: 'POST', body: { type } });
    state.tabData.requests = null;
    await loadTab(customerId, 'requests');
  } catch (e) { state.error = e.message; }
  render();
}
const SR_TRANSITIONS = { open: ['in_progress'], in_progress: ['closed', 'open'], closed: [] };
async function updateSRStatus(customerId, srId, status) {
  try {
    await api(`/service-requests/${srId}`, { method: 'PATCH', body: { status } });
    if (state.view === 'queue') await loadQueue();
    if (state.view === 'profile') { state.tabData.requests = null; await loadTab(customerId, 'requests'); }
  } catch (e) { state.error = e.message; }
  render();
}

/* ---------------- copilot (AI) ---------------- */

function cp(customerId) { return (state.copilot[customerId] = state.copilot[customerId] || {}); }

async function generateSummary(customerId) {
  cp(customerId).summaryLoading = true; render();
  try { cp(customerId).summary = await api(`/customers/${customerId}/ai/summary`, { method: 'POST' }); }
  catch (e) { state.error = e.message; }
  cp(customerId).summaryLoading = false; render();
}
async function generateNBA(customerId) {
  cp(customerId).nbaLoading = true; render();
  try { cp(customerId).nba = await api(`/customers/${customerId}/ai/next-best-action`, { method: 'POST' }); }
  catch (e) { state.error = e.message; }
  cp(customerId).nbaLoading = false; render();
}
async function decideNBA(customerId, decision) {
  const nba = cp(customerId).nba;
  try {
    await api(`/customers/${customerId}/ai/next-best-action/${nba.topAction.id}/decision`, { method: 'POST', body: { decision } });
    cp(customerId).nbaDecision = decision;
  } catch (e) { state.error = e.message; }
  render();
}
async function sendChat(customerId) {
  const input = document.getElementById('chat-input');
  const q = input.value.trim(); if (!q) return;
  const c = cp(customerId); c.chat = c.chat || [];
  c.chat.push({ role: 'user', text: q }); c.chat.push({ role: 'ai', loading: true });
  render();
  try {
    const { answer } = await api(`/customers/${customerId}/ai/chat`, { method: 'POST', body: { question: q } });
    c.chat[c.chat.length - 1] = { role: 'ai', text: answer };
  } catch (e) { c.chat[c.chat.length - 1] = { role: 'ai', text: 'Error: ' + e.message }; }
  render();
  setTimeout(() => { const box = document.querySelector('.chat-log'); if (box) box.scrollTop = box.scrollHeight; }, 30);
}
async function draftContactPlan(customerId) {
  cp(customerId).planLoading = true; render();
  try {
    const { text } = await api(`/customers/${customerId}/ai/contact-plan`, { method: 'POST' });
    cp(customerId).plan = { text, status: 'draft' };
  } catch (e) { state.error = e.message; }
  cp(customerId).planLoading = false; render();
}
function editContactPlan(customerId, val) { cp(customerId).plan.text = val; }
async function decideContactPlan(customerId, decision) {
  cp(customerId).plan.status = decision;
  try { await api(`/customers/${customerId}/ai/contact-plan`, { method: 'PATCH', body: { status: decision, text: cp(customerId).plan.text } }); }
  catch (e) { state.error = e.message; }
  render();
}

/* ============================================================
   RENDERING (pure functions of `state` — no fetches in here)
============================================================ */

function render() {
  if (!state.user) { app.innerHTML = renderLogin(); return; }
  app.innerHTML = `
    <div class="shell">
      ${renderSidebar()}
      <div class="main">
        ${renderTopbar()}
        ${state.error ? `<div class="banner" style="background:var(--rust-soft);color:var(--rust);border-color:var(--rust-soft);">${state.error}</div>` : ''}
        ${renderView()}
      </div>
    </div>`;
}

function renderLogin() {
  if (state.error) return `<div class="login-wrap"><div class="login-card"><div class="login-brand">Ledger</div><div class="banner" style="background:var(--rust-soft);color:var(--rust);">${state.error}</div></div></div>`;
  return `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">Ledger</div>
      <div class="login-sub">Customer 360 &amp; Relationship Copilot — sign in to continue</div>
      ${state.loginUsers.map(u => `
        <div class="user-pick" onclick="loginAs('${u.id}')">
          <div><div class="n">${u.name}</div><div class="r">${u.role} · ${u.branch}</div></div>
          <div class="btn small">Sign in →</div>
        </div>`).join('')}
      <div class="login-foot">Frontend calling the live mock API at <span class="mono">${window.API_BASE}</span>. Swap that URL for the real backend later — this screen and everything else stays the same.</div>
    </div>
  </div>`;
}

function renderSidebar() {
  const u = state.user;
  const items = {
    RM: [['search', 'Customer search'], ['queue', 'My service requests']],
    Manager: [['dashboard', 'Portfolio dashboard'], ['search', 'Customer search']],
    Operations: [['queue', 'Service request queue'], ['search', 'Customer search']],
    Auditor: [['audit', 'Audit log'], ['search', 'Customer search']],
  }[u.role];
  return `
  <div class="sidebar">
    <div class="brand">Ledger <small>BANK COPILOT</small></div>
    <div class="sidebar-sub">Customer 360 &amp; Relationship Copilot</div>
    <div class="nav-group">
      <div class="nav-label">WORKSPACE</div>
      ${items.map(([v, label]) => `<div class="nav-item ${state.view === v ? 'active' : ''}" onclick="go('${v}')"><span class="nav-dot"></span>${label}</div>`).join('')}
    </div>
    <div class="sidebar-foot">
      <div class="who">${u.name}</div>
      <div class="who-role">${u.role} · ${u.branch}</div>
      <button class="signout" onclick="signOut()">Sign out</button>
    </div>
  </div>`;
}

function renderTopbar() {
  const titles = {
    search: ['Customer search', 'Find a customer to open their 360° profile.'],
    profile: ['Customer profile', ''],
    dashboard: ['Portfolio dashboard', 'Team-level view — no individual customer detail.'],
    queue: [state.user.role === 'Operations' ? 'Service request queue' : 'My service requests', ''],
    audit: ['Audit log', 'Every screen view, data access, and AI interaction.'],
  };
  const [title, sub] = titles[state.view];
  return `
  <div class="topbar">
    <div class="pagehead"><div class="eyebrow">LEDGER / ${state.user.role.toUpperCase()}</div><h1>${title}</h1><p>${sub}</p></div>
    ${state.view !== 'audit' ? `
    <div class="searchbox"><span class="icon">⌕</span>
      <input type="text" id="global-search" placeholder="Search by name, ID, email or phone…" value="${state.searchQuery}" oninput="onSearch(this.value)">
    </div>` : ''}
  </div>`;
}

function renderView() {
  switch (state.view) {
    case 'search': return renderSearch();
    case 'profile': return renderProfile();
    case 'dashboard': return renderDashboard();
    case 'queue': return renderQueue();
    case 'audit': return renderAudit();
    default: return '';
  }
}

function renderSearch() {
  const list = state.searchResults;
  const full = state.user.role === 'RM';
  return `
  <div class="intro-strip"><div><div class="eyebrow">RELATIONSHIP WORKSPACE</div><h2>Start with the customer, stay with the context.</h2><p>Search your permitted view of the book, then move from signal to action.</p></div><div class="intro-mark">360<span>°</span></div></div>
  <div class="card">
    <div class="section-title">${list.length} customer${list.length !== 1 ? 's' : ''} ${full ? 'in your portfolio' : 'in view'}</div>
    ${list.length === 0 ? `<div class="empty">No customers match “${state.searchQuery}”.</div>` : `
    <table>
      <thead><tr><th>Customer</th><th>ID</th><th>Contact</th><th>Segment</th><th>Risk</th><th>Open SRs</th></tr></thead>
      <tbody>${list.map(c => `
        <tr class="row-link" onclick="go('profile',{customerId:'${c.id}', profileTab:'overview'})">
          <td>${c.name}</td><td class="mono">${c.id}</td>
          <td class="mono">${c.email}<br>${c.phone}</td>
          <td><span class="badge ${c.segment.toLowerCase()}">${c.segment}</span></td>
          <td><span class="badge ${c.riskFlag.toLowerCase()}">${c.riskFlag}</span></td>
          <td>${c.openServiceRequests}</td>
        </tr>`).join('')}</tbody>
    </table>`}
  </div>`;
}

function renderProfile() {
  const c = state.customer;
  if (!c) return `<div class="card empty">Loading…</div>`;
  const isRM = state.user.role === 'RM';
  const tabs = [['overview', 'Overview'], ['accounts', 'Accounts, loans & cards'], ['transactions', 'Transactions'], ['interactions', 'Interactions'], ['requests', 'Service requests']];
  if (isRM) tabs.push(['copilot', 'Copilot']);
  return `
  <div class="card">
    <div class="profile-head">
      <div class="avatar-block">
        <div class="avatar">${initials(c.name)}</div>
        <div><div class="profile-name">${c.name}</div><div class="profile-meta">${c.id} · ${c.email} · ${c.phone}</div></div>
      </div>
      <div class="flag-row">
        <span class="badge ${c.segment.toLowerCase()}">${c.segment}</span>
        <span class="badge ${c.riskFlag.toLowerCase()}">${c.riskFlag} risk</span>
        <span class="badge ${c.kyc.toLowerCase()}">KYC ${c.kyc}</span>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="tabs">${tabs.map(([id, label]) => `<div class="tab ${state.profileTab === id ? 'active' : ''}" onclick="setProfileTab('${id}')">${label}</div>`).join('')}</div>
    ${renderProfileTab(c, isRM)}
  </div>`;
}

function renderProfileTab(c, isRM) {
  const d = state.tabData;
  switch (state.profileTab) {
    case 'overview': return `
      <div class="grid2">
        <div class="kv">
          <div class="k">Address</div><div>${c.address}</div>
          <div class="k">Segment</div><div>${c.segment}</div>
          <div class="k">KYC status</div><div>${c.kyc}</div>
          <div class="k">Risk flag</div><div>${c.riskFlag}</div>
        </div>
        <div class="kv">
          <div class="k">Marketing consent</div><div>${c.consent.marketing ? 'Given' : 'Not given'}</div>
          <div class="k">Data-sharing consent</div><div>${c.consent.dataSharing ? 'Given' : 'Not given'}</div>
          <div class="k">Consent updated</div><div>${fmtDate(c.consent.updatedOn)}</div>
          <div class="k">Portfolio owner</div><div>${c.assignedRm || '—'}</div>
        </div>
      </div>
      <div class="note">Fields above are masked server-side based on your role (${state.user.role}) — the API decided what to send, not this page.</div>`;

    case 'accounts':
      if (!d.accounts) return `<div class="empty">Loading…</div>`;
      return `
      <div class="section-title">Accounts</div>
      <table><thead><tr><th>Account</th><th>Type</th><th>Opened</th><th>Status</th><th>Balance</th></tr></thead>
      <tbody>${d.accounts.map(a => `<tr><td class="mono">${a.id}</td><td>${a.type}</td><td>${fmtDate(a.opened)}</td><td><span class="badge low">${a.status}</span></td><td class="num">${currency(a.balance)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">No accounts.</td></tr>`}</tbody></table>
      <div class="section-title" style="margin-top:22px;">Loans</div>
      <table><thead><tr><th>Loan</th><th>Type</th><th>Outstanding</th><th>EMI</th><th>Missed EMIs</th><th>Status</th></tr></thead>
      <tbody>${d.loans.map(l => `<tr><td class="mono">${l.id}</td><td>${l.type}</td><td class="num">${currency(l.outstanding)}</td><td class="num">${currency(l.emi)}</td><td>${l.missedEmis > 0 ? `<span class="badge high">${l.missedEmis}</span>` : '0'}</td><td><span class="badge low">${l.status}</span></td></tr>`).join('') || `<tr><td colspan="6" class="empty">No active loans.</td></tr>`}</tbody></table>
      <div class="section-title" style="margin-top:22px;">Cards</div>
      <table><thead><tr><th>Card</th><th>Type</th><th>Number</th><th>Limit</th><th>Used</th><th>Status</th></tr></thead>
      <tbody>${d.cards.map(cd => `<tr><td class="mono">${cd.id}</td><td>${cd.type}</td><td class="masked">${cd.maskedNumber}</td><td class="num">${currency(cd.limit)}</td><td class="num">${currency(cd.used)}</td><td><span class="badge low">${cd.status}</span></td></tr>`).join('') || `<tr><td colspan="6" class="empty">No cards.</td></tr>`}</tbody></table>`;

    case 'transactions':
      if (!d.transactions) return `<div class="empty">Loading…</div>`;
      return `<table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance after</th></tr></thead>
        <tbody>${d.transactions.map(t => `<tr><td>${fmtDate(t.date)}</td><td>${t.description}</td><td><span class="badge ${t.type === 'failed' ? 'high' : t.type === 'credit' ? 'low' : 'regular'}">${t.type}</span></td><td class="num">${t.type === 'failed' ? '—' : currency(t.amount)}</td><td class="num">${currency(t.balanceAfter)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">No transactions.</td></tr>`}</tbody></table>`;

    case 'interactions':
      if (!d.interactions) return `<div class="empty">Loading…</div>`;
      return `
      ${isRM ? `
      <div class="section-title">Log a new interaction</div>
      <div class="grid2"><div class="field"><label>Channel</label><select id="new-channel"><option>Call</option><option>Branch visit</option><option>Email</option><option>Video call</option></select></div><div></div></div>
      <div class="field"><label>Notes</label><textarea id="new-note" rows="2" placeholder="What was discussed?"></textarea></div>
      <button class="btn primary" onclick="logInteraction('${c.id}')">Save interaction</button>
      <div style="height:20px;"></div>` : ''}
      <div class="section-title">History</div>
      ${d.interactions.length === 0 ? `<div class="empty">No interactions logged yet.</div>` :
        d.interactions.map(i => `<div style="padding:10px 0;border-bottom:1px solid var(--line);"><div style="font-size:12.5px;color:var(--ink-soft);">${fmtDate(i.date)} · ${i.channel} · ${i.rm}</div><div style="font-size:13.5px;margin-top:3px;">${i.notes}</div></div>`).join('')}`;

    case 'requests':
      if (!d.requests) return `<div class="empty">Loading…</div>`;
      return `
      ${isRM ? `
      <div class="section-title">Raise a service request</div>
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <input type="text" id="new-sr-type" placeholder="e.g. Card limit increase, address update…" style="flex:1;padding:9px 10px;border:1px solid var(--line-strong);border-radius:5px;font-size:13.5px;">
        <button class="btn primary" onclick="createServiceRequest('${c.id}')">Create</button>
      </div>` : ''}
      ${d.requests.length === 0 ? `<div class="empty">No service requests for this customer.</div>` :
        d.requests.map(sr => `
          <div class="card" style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
              <div><div style="font-weight:600;font-size:14px;">${sr.type}</div><div style="font-size:12.5px;color:var(--ink-soft);">${sr.id} · assigned to ${sr.assignedTo} · created ${fmtDate(sr.createdAt)}</div></div>
              <span class="badge ${sr.status}">${sr.status.replace('_', ' ')}</span>
            </div>
            ${SR_TRANSITIONS[sr.status].length ? `<div style="margin-top:10px;display:flex;gap:8px;">${SR_TRANSITIONS[sr.status].map(s => `<button class="btn small" onclick="updateSRStatus('${c.id}','${sr.id}','${s}')">Move to ${s.replace('_', ' ')}</button>`).join('')}</div>` : ''}
            <div style="margin-top:10px;">${sr.history.map(h => `<div style="font-size:12px;color:var(--ink-soft);padding:3px 0;">${fmtDate(h.ts)} — ${h.by}: ${h.note}</div>`).join('')}</div>
          </div>`).join('')}`;

    case 'copilot': return renderCopilotTab(c);
    default: return '';
  }
}

function renderCopilotTab(c) {
  const p = cp(c.id);
  return `
  <div class="banner">Copilot suggestions are advisory only and are mocked in this milestone — the API contract is real, the intelligence behind it plugs in later. Nothing here is sent or actioned automatically.</div>

  <div class="section-title">AI customer summary</div>
  <div class="ai-panel" style="margin-bottom:22px;">
    <div class="ai-tag"><span class="dot"></span>GROUNDED IN THIS CUSTOMER'S DATA</div>
    ${!p.summary ? `<button class="btn gold" ${p.summaryLoading ? 'disabled' : ''} onclick="generateSummary('${c.id}')">${p.summaryLoading ? 'Generating…' : 'Generate summary'}</button>` :
      `<div class="ai-text">${p.summary.text}</div><div class="citation-row">Sources <span>${p.summary.groundedIn.join(' · ')}</span></div><button class="btn small" style="margin-top:10px;" onclick="generateSummary('${c.id}')">Regenerate</button>`}
  </div>

  <div class="section-title">Next-best-action</div>
  <div class="ai-panel" style="margin-bottom:22px;">
    <div class="ai-tag"><span class="dot"></span>RULE-FILTERED, THEN AI-EXPLAINED</div>
    ${!p.nba ? `<button class="btn gold" ${p.nbaLoading ? 'disabled' : ''} onclick="generateNBA('${c.id}')">${p.nbaLoading ? 'Checking…' : 'Check eligible actions'}</button>` : `
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">Eligibility rule: ${p.nba.eligibleActions[0].rule}</div>
      <div style="font-weight:600;font-size:14.5px;margin-bottom:8px;">${p.nba.topAction.label}</div>
      ${p.nba.topAction.explanation ? `<div class="ai-text" style="margin-bottom:12px;">${p.nba.topAction.explanation}</div>` : ''}
      ${p.nba.topAction.id !== 'none' ? (p.nbaDecision ?
        `<span class="badge ${p.nbaDecision === 'accept' ? 'low' : 'high'}">${p.nbaDecision === 'accept' ? 'Accepted' : 'Rejected'} by ${state.user.name}</span>` :
        `<div style="display:flex;gap:8px;"><button class="btn accept" onclick="decideNBA('${c.id}','accept')">Accept</button><button class="btn reject" onclick="decideNBA('${c.id}','reject')">Reject</button></div>`
      ) : ''}`}
  </div>

  <div class="section-title">Ask Customer 360</div>
  <div class="ai-panel" style="margin-bottom:22px;">
    <div class="ai-tag"><span class="dot"></span>ANSWERS CITE THEIR SOURCE</div>
    <div class="chat-log">
      ${!p.chat || p.chat.length === 0 ? `<div class="empty" style="padding:6px 0;">Ask something like “has he missed any payments recently?”</div>` :
        p.chat.map(m => m.role === 'user' ? `<div class="chat-msg user">${m.text}</div>` :
          m.loading ? `<div class="chat-msg ai"><span class="ai-loading"><span class="spinner"></span>Checking the record…</span></div>` :
          `<div class="chat-msg ai">${m.text}</div>`).join('')}
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Ask a question about this customer…" onkeydown="if(event.key==='Enter') sendChat('${c.id}')">
      <button class="btn primary" onclick="sendChat('${c.id}')">Ask</button>
    </div>
  </div>

  <div class="section-title">Contact plan draft</div>
  <div class="ai-panel">
    <div class="ai-tag"><span class="dot"></span>DRAFT — EDIT BEFORE USE</div>
    ${!p.plan ? `<button class="btn gold" ${p.planLoading ? 'disabled' : ''} onclick="draftContactPlan('${c.id}')">${p.planLoading ? 'Drafting…' : 'Draft outreach plan'}</button>` : `
      <div class="field"><textarea rows="5" oninput="editContactPlan('${c.id}', this.value)" ${p.plan.status !== 'draft' ? 'disabled' : ''}>${p.plan.text}</textarea></div>
      ${p.plan.status === 'draft' ? `<div style="display:flex;gap:8px;"><button class="btn accept" onclick="decideContactPlan('${c.id}','accepted')">Accept plan</button><button class="btn reject" onclick="decideContactPlan('${c.id}','rejected')">Reject</button></div>` :
        `<span class="badge ${p.plan.status === 'accepted' ? 'low' : 'high'}">${p.plan.status === 'accepted' ? 'Accepted' : 'Rejected'} by ${state.user.name}</span>`}`}
  </div>`;
}

function renderDashboard() {
  const s = state.dashboard;
  if (!s) return `<div class="card empty">Loading…</div>`;
  const total = s.serviceRequestsByStatus.open + s.serviceRequestsByStatus.in_progress + s.serviceRequestsByStatus.closed;
  return `
  <div class="grid2" style="margin-bottom:14px;">
    <div class="card stat"><div class="n">${s.customerCount}</div><div class="l">Customers in the book</div></div>
    <div class="card stat"><div class="n">${currency(s.totalBalance)}</div><div class="l">Total balances under management</div></div>
    <div class="card stat"><div class="n">${s.serviceRequestsByStatus.open + s.serviceRequestsByStatus.in_progress}</div><div class="l">Open service requests (${s.serviceRequestsByStatus.open} open, ${s.serviceRequestsByStatus.in_progress} in progress)</div></div>
    <div class="card stat"><div class="n">${s.serviceRequestsByStatus.closed}</div><div class="l">Closed this period</div></div>
  </div>
  <div class="card">
    <div class="section-title">Risk distribution</div>
    ${['Low', 'Medium', 'High'].map(r => `<div class="bar-row"><div class="bar-label">${r} risk</div><div class="bar-track"><div class="bar-fill" style="width:${(s.riskDistribution[r] / s.customerCount * 100)}%;background:${r === 'Low' ? 'var(--teal)' : r === 'Medium' ? 'var(--gold)' : 'var(--rust)'};"></div></div><div class="bar-val">${s.riskDistribution[r]}</div></div>`).join('')}
  </div>
  <div class="card">
    <div class="section-title">Service requests by status</div>
    ${[['Open', s.serviceRequestsByStatus.open, 'var(--rust)'], ['In progress', s.serviceRequestsByStatus.in_progress, 'var(--gold)'], ['Closed', s.serviceRequestsByStatus.closed, 'var(--teal)']].map(([l, v, color]) => `<div class="bar-row"><div class="bar-label">${l}</div><div class="bar-track"><div class="bar-fill" style="width:${(v / Math.max(1, total) * 100)}%;background:${color};"></div></div><div class="bar-val">${v}</div></div>`).join('')}
    <div class="note">Portfolio-level only — this endpoint (/dashboard/summary) never returns individual customer PII, enforced server-side.</div>
  </div>`;
}

function renderQueue() {
  const list = state.queue;
  return `
  <div class="card">
    ${list.length === 0 ? `<div class="empty">No open service requests.</div>` : `
    <table><thead><tr><th>Request</th><th>Customer</th><th>Status</th><th>Assigned to</th><th>Created</th><th></th></tr></thead>
    <tbody>${list.map(sr => `
      <tr>
        <td>${sr.type}<div class="mono" style="color:var(--ink-soft);">${sr.id}</div></td>
        <td class="row-link" onclick="go('profile',{customerId:'${sr.customerId}', profileTab:'requests'})">${sr.customerName}</td>
        <td><span class="badge ${sr.status}">${sr.status.replace('_', ' ')}</span></td>
        <td>${sr.assignedTo}</td><td>${fmtDate(sr.createdAt)}</td>
        <td>${SR_TRANSITIONS[sr.status].map(s => `<button class="btn small" onclick="updateSRStatus('${sr.customerId}','${sr.id}','${s}')">→ ${s.replace('_', ' ')}</button>`).join(' ')}</td>
      </tr>`).join('')}</tbody></table>`}
  </div>`;
}

function renderAudit() {
  return `
  <div class="card">
    <div class="audit-filters">
      <select id="audit-user-filter" onchange="updateAuditFilters()">
        <option value="">All users</option>
        ${state.loginUsers.map(u => `<option value="${u.name}" ${state.auditUserFilter === u.name ? 'selected' : ''}>${u.name}</option>`).join('')}
      </select>
      <input type="text" id="audit-text-filter" placeholder="Filter by action or detail…" value="${state.auditTextFilter}" oninput="updateAuditFilters()">
      <button class="btn small" onclick="exportAudit()">Export CSV</button>
    </div>
    <table><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead>
    <tbody>${state.audit.length === 0 ? `<tr><td colspan="5" class="empty">No matching entries.</td></tr>` :
      state.audit.map(r => `<tr><td class="mono">${new Date(r.ts).toLocaleTimeString('en-IN')}</td><td>${r.user}</td><td>${r.role}</td><td>${r.action}</td><td>${r.details}</td></tr>`).join('')}</tbody></table>
    <div class="note">${state.audit.length} entries returned by the API for the current filter.</div>
  </div>`;
}

/* ---------------- boot ---------------- */
boot();
