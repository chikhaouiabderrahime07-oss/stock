const SUIVI_DATA_VERSION = 'v2026_04_canonical_364';
const STORAGE_KEYS = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12', 'suivi_local_v11'];
const SESSION_KEYS = ['suivi_linked_session_v30', 'suivi_compact_session_v20', 'suivi_local_session_v12', 'suivi_local_session_v11'];
const PANEL_PREFS_KEY = 'suivi_compact_panel_prefs_v1';

const state = {
  activeTab: 'followup',
  settings: {},
  users: [],
  session: null,
  suppliers: [],
  requesters: [],
  bcRecords: [],
  payments: [],
  stockItems: [],
  stockLogs: [],
  holidays: [],
  importWarnings: [],
  chartSpecs: {},
  chartModalKey: null,
  ui: {
    followupPage: 1,
    followupPageSize: 10,
    followupSortField: 'date',
    followupSortDir: 'desc',
  },
};
if (typeof window !== 'undefined') window.state = state;

var currentReportsSubview = 'summary';
var _isRenderingReports = false;
if (typeof window !== 'undefined') {
  window.currentReportsSubview = currentReportsSubview;
  window._isRenderingReports = _isRenderingReports;
}

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-5)}`;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nowIso() { return new Date().toISOString(); }
function sanitizeFilename(value) {
  return String(value || 'export').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
}
function sanitizeSheetName(name) {
  return String(name || 'Feuille').replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31);
}
function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYmd(value);
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function parseFlexibleNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = String(value ?? '').trim();
  if (!s || s.startsWith('=')) return 0;
  s = s.replace(/\u00a0/g, ' ').replace(/DA\b|DZD\b|EUR\b|USD\b/gi, '').trim();
  if (!/[0-9]/.test(s)) return 0;
  s = s.replace(/[^0-9,().+\-\s]/g, '');
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/\s+/g, '');
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma > -1 && dot > -1) {
    if (comma > dot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (comma > -1) {
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/,/g, '.');
    }
  } else if (dot > -1) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, '');
    }
  }
  const num = Number(s);
  if (!Number.isFinite(num)) return 0;
  return negative ? -num : num;
}
function formatMoney(value, currency = 'DZD') {
  const num = Number(value || 0);
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
  return `${formatted} ${currency || 'DZD'}`;
}
function formatCompact(value) {
  const num = Number(value || 0);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(num);
}
function toYmd(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && typeof XLSX !== 'undefined' && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const raw = String(value).trim();
  let m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = raw.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    let year = m[3];
    if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`;
    return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : toYmd(d);
}
function formatDate(value) {
  const ymd = toYmd(value);
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
function showToast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function slugify(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
}

function defaultSettings() {
  return {
    title: 'Suivi achats, BC, paiements & stock',
    subtitle: 'BC → DA, paiements, stock et KPI centralisés',
    theme: 'light',
    bcPrefix: 'BC',
    bcSequence: 1,
    daPrefix: 'DA',
    daSequence: 1,
    procurementDays: 3,
    financeDays: 3,
    weekendDays: [5, 6],
    logoDataUrl: '',
  };
}
function defaultUsers() {
  return [
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'appro', password: 'appro123', role: 'procurement' },
    { username: 'finance', password: 'finance123', role: 'finance' },
    { username: 'mag', password: 'mag123', role: 'stock' },
    { username: 'dg', password: 'dg123', role: 'management' },
  ];
}
function defaultState() {
  return {
    activeTab: 'followup',
    settings: defaultSettings(),
    users: defaultUsers(),
    suppliers: [],
    requesters: [],
    bcRecords: [],
    payments: [],
    stockItems: [],
    stockLogs: [],
    holidays: [],
  };
}
function readStored(keys, storage) {
  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (raw) return raw;
    } catch {}
  }
  return '';
}
function extractBcSerial(value) {
  const raw = String(value || '');
  const direct = raw.match(/BC\s*N?[°º]?\s*[:/ -]*\s*(\d{1,4})/i);
  if (direct) return String(Number(direct[1]));
  const triple = raw.match(/\b(\d{1,4})\s*\/\s*[A-Z]{1,4}\s*\/\s*\d{4}\b/i);
  if (triple) return String(Number(triple[1]));
  return '';
}
function extractDaSerial(value) {
  const raw = String(value || '');
  const direct = raw.match(/DA\s*N?[°º]?\s*[:/ -]*\s*(\d{1,4})/i);
  if (direct) return String(Number(direct[1]));
  const triple = raw.match(/\b(\d{1,4})\s*\/\s*[A-Z]{1,4}\s*\/\s*\d{4}\b/i);
  if (triple) return String(Number(triple[1]));
  return '';
}
function canonicalBcRef(refLike, fileName, date) {
  const serial = extractBcSerial(refLike) || extractBcSerial(fileName);
  const year = String(date || todayYmd()).slice(0, 4) || String(new Date().getFullYear());
  if (!serial) return String(refLike || '').trim();
  return `${state.settings.bcPrefix || 'BC'} ${Number(serial)}/DG/${year}`;
}
function canonicalDaRef(refLike, date) {
  const serial = extractDaSerial(refLike);
  const year = String(date || todayYmd()).slice(0, 4) || String(new Date().getFullYear());
  if (!serial) return String(refLike || '').trim();
  return `${state.settings.daPrefix || 'DA'} ${Number(serial)}/DG/${year}`;
}
function highestBcSequence() {
  return state.bcRecords.reduce((max, row) => Math.max(max, Number(extractBcSerial(row.ref) || 0)), 0);
}
function highestDaSequence() {
  return state.bcRecords.reduce((max, row) => Math.max(max, Number(extractDaSerial(row.daRef) || 0)), 0);
}
function nextBcRefPreview() {
  const next = Math.max(Number(state.settings.bcSequence || 1), highestBcSequence() + 1);
  return `${state.settings.bcPrefix || 'BC'} ${next}/DG/${new Date().getFullYear()}`;
}
function nextDaRefPreview() {
  const next = Math.max(Number(state.settings.daSequence || 1), highestDaSequence() + 1);
  return `${state.settings.daPrefix || 'DA'} ${next}/DG/${new Date().getFullYear()}`;
}
function bumpBcSequenceFromRef(ref) {
  const serial = Number(extractBcSerial(ref) || 0);
  if (serial) state.settings.bcSequence = Math.max(Number(state.settings.bcSequence || 1), serial + 1);
}
function bumpDaSequenceFromRef(ref) {
  const serial = Number(extractDaSerial(ref) || 0);
  if (serial) state.settings.daSequence = Math.max(Number(state.settings.daSequence || 1), serial + 1);
}
function inferType(text) {
  const hay = normalizeText(text);
  return ['service', 'reparation', 'maintenance', 'vidange', 'notaire', 'etude', 'transport', 'main doeuvre', 'imprimante'].some((word) => hay.includes(word)) ? 'service' : 'achat';
}
function normalizeBcRecord(row = {}) {
  const amount = Number(row.amountTTC || row.amount || 0) || 0;
  return {
    id: row.id || uid('bc'),
    ref: String(row.ref || '').trim(),
    daRef: String(row.daRef || '').trim(),
    daStatus: row.daStatus === 'validated' || row.daValidatedAt ? 'validated' : 'draft',
    daValidatedAt: row.daValidatedAt || '',
    date: toYmd(row.date) || '',
    supplierId: row.supplierId || null,
    supplierName: String(row.supplierName || '').trim(),
    amount: amount,
    amountHT: Number(row.amountHT || 0) || 0,
    amountTTC: amount,
    currency: 'DZD',
    type: row.type === 'service' ? 'service' : 'achat',
    description: String(row.description || '').trim(),
    status: row.status || 'importe',
    promisedDate: toYmd(row.promisedDate) || '',
    goodsReceivedDate: toYmd(row.goodsReceivedDate) || '',
    serviceDoneDate: toYmd(row.serviceDoneDate) || '',
    requester: String(row.requester || '').trim(),
    paymentTerms: String(row.paymentTerms || '').trim(),
    comments: String(row.comments || row.comment || '').trim(),
    notes: String(row.notes || '').trim(),
    importedFromBC: Boolean(row.importedFromBC),
    sourceFile: String(row.sourceFile || '').trim(),
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
    lineCount: Number(row.lineCount || (Array.isArray(row.lineItems) ? row.lineItems.length : 0) || 0),
    totalQty: Number(row.totalQty || 0) || 0,
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}
function normalizePayment(row = {}) {
  return {
    ...row,
    id: row.id || uid('pay'),
    bcId: row.bcId || (Array.isArray(row.linkedBcIds) && row.linkedBcIds[0]) || '',
    paymentRef: String(row.paymentRef || '').trim(),
    requestDate: toYmd(row.requestDate) || '',
    paidDate: toYmd(row.paidDate) || '',
    amount: Number(row.amount || 0) || 0,
    mode: row.mode || 'virement',
    transactionRef: String(row.transactionRef || '').trim(),
    status: row.status || 'programme',
    notes: String(row.notes || row.natureExpense || '').trim(),
    beneficiary: String(row.beneficiary || '').trim(),
    department: String(row.department || '').trim(),
    natureExpense: String(row.natureExpense || '').trim(),
    referenceDocs: String(row.referenceDocs || '').trim(),
    linkedBcRefs: Array.isArray(row.linkedBcRefs) ? row.linkedBcRefs : (row.linkedBcRef ? [row.linkedBcRef] : []),
    linkedBcIds: Array.isArray(row.linkedBcIds) ? row.linkedBcIds : (row.bcId ? [row.bcId] : []),
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}
function normalizeStockItem(row = {}) {
  return {
    id: row.id || uid('stk'),
    code: String(row.code || '').trim(),
    name: String(row.name || '').trim(),
    category: String(row.category || '').trim(),
    qty: Number(row.qty || 0) || 0,
    minQty: Number(row.minQty || 0) || 0,
    unit: String(row.unit || 'U').trim() || 'U',
    location: String(row.location || '').trim(),
    supplierName: String(row.supplierName || '').trim(),
    notes: String(row.notes || '').trim(),
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}
function normalizeStockLog(row = {}) {
  return {
    id: row.id || uid('stlog'),
    itemId: row.itemId || '',
    type: row.type === 'in' ? 'in' : 'out',
    qty: Number(row.qty || 0) || 0,
    date: toYmd(row.date) || '',
    person: String(row.person || '').trim(),
    department: String(row.department || '').trim(),
    notes: String(row.notes || '').trim(),
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}
function loadState() {
  const raw = readStored(STORAGE_KEYS, localStorage);
  const base = defaultState();
  if (!raw) {
    if (typeof window !== 'undefined' && window.PRELOAD_DATA) {
      if (Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length) {
        base.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
      }
      if (Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length) {
        base.payments = window.PRELOAD_DATA.payments.map(normalizePayment);
      }
    }
    return base;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SUIVI_DATA_VERSION) {
      console.warn('[app.js] Cache version mismatch or legacy data detected. Discarding stale cache.');
      try { localStorage.removeItem(STORAGE_KEYS[0]); } catch (e) {}
      if (typeof window !== 'undefined' && window.PRELOAD_DATA) {
        if (Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length) {
          base.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
        }
        if (Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length) {
          base.payments = window.PRELOAD_DATA.payments.map(normalizePayment);
        }
      }
      return base;
    }
    let loadedBcs = Array.isArray(parsed.bcRecords) && parsed.bcRecords.length ? parsed.bcRecords.map(normalizeBcRecord) : [];
    let loadedPayments = Array.isArray(parsed.payments) && parsed.payments.length ? parsed.payments.map(normalizePayment) : [];

    if (loadedBcs.length === 0 && typeof window !== 'undefined' && window.PRELOAD_DATA?.bcRecords?.length) {
      loadedBcs = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
    }
    if (loadedPayments.length === 0 && typeof window !== 'undefined' && window.PRELOAD_DATA?.payments?.length) {
      loadedPayments = window.PRELOAD_DATA.payments.map(normalizePayment);
    }

    const safeActiveTab = (!parsed.activeTab || parsed.activeTab === 'stock') ? 'followup' : parsed.activeTab;

    return {
      ...base,
      ...parsed,
      activeTab: safeActiveTab,
      settings: { ...base.settings, ...(parsed.settings || {}), theme: (parsed.settings?.theme === 'dark') ? 'dark' : 'light' },
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : base.users,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      requesters: Array.isArray(parsed.requesters) ? parsed.requesters : [],
      bcRecords: loadedBcs,
      payments: loadedPayments,
      stockItems: Array.isArray(parsed.stockItems) ? parsed.stockItems.map(normalizeStockItem) : [],
      stockLogs: Array.isArray(parsed.stockLogs) ? parsed.stockLogs.map(normalizeStockLog) : [],
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays.map((h) => ({ id: h.id || uid('hol'), date: toYmd(h.date), label: String(h.label || '').trim() })) : [],
    };
  } catch (err) {
    console.error(err);
    return base;
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEYS[0], JSON.stringify({
    version: SUIVI_DATA_VERSION,
    settings: state.settings,
    users: state.users,
    suppliers: state.suppliers,
    requesters: state.requesters,
    bcRecords: state.bcRecords,
    payments: state.payments,
    stockItems: state.stockItems,
    stockLogs: state.stockLogs,
    holidays: state.holidays,
  }));
}
function loadSession() {
  let raw = readStored(SESSION_KEYS, sessionStorage);
  if (!raw) {
    try {
      raw = sessionStorage.getItem('suivi_session') ||
            sessionStorage.getItem('erp_currentUser') ||
            sessionStorage.getItem('erp_douroub_session') ||
            sessionStorage.getItem('auth_user') ||
            localStorage.getItem('suivi_session') ||
            localStorage.getItem('suivi_linked_session_v30') ||
            readStored(SESSION_KEYS, localStorage) ||
            localStorage.getItem('erp_currentUser') ||
            localStorage.getItem('erp_douroub_session') ||
            localStorage.getItem('auth_user');
    } catch (e) {}
  }
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('[')) ? JSON.parse(raw) : { username: String(raw), role: 'admin' };
    if (!parsed) return null;
    return {
      id: parsed.id || ('u_' + (parsed.username || 'admin')),
      username: parsed.username || parsed.name || 'Admin',
      name: parsed.name || parsed.username || 'Admin',
      role: parsed.role || 'admin',
      department: parsed.department || 'Direction',
      service: parsed.service || parsed.department || '',
      at: parsed.at || nowIso(),
    };
  } catch {
    return null;
  }
}
function saveSession() {
  if (state.session) {
    try {
      const serialized = JSON.stringify(state.session);
      const userRole = state.session.role === 'admin' ? 'admin' : (state.session.role || 'admin_appro');
      const erpSession = JSON.stringify({
        id: state.session.id || ('u_' + (state.session.username || 'admin')),
        username: state.session.username || 'admin',
        name: state.session.name || state.session.username || 'Admin',
        role: state.session.role || 'admin',
        department: state.session.department || 'Direction',
        service: state.session.service || '',
        at: state.session.at || nowIso()
      });

      // Synchronize sessionStorage
      sessionStorage.setItem(SESSION_KEYS[0], serialized);
      sessionStorage.setItem('suivi_session', serialized);
      sessionStorage.setItem('erp_currentUser', erpSession);
      sessionStorage.setItem('erp_douroub_session', erpSession);
      sessionStorage.setItem('sde_user_role', userRole);

      // Synchronize localStorage
      SESSION_KEYS.forEach((k) => {
        try { localStorage.setItem(k, serialized); } catch (e) {}
      });
      localStorage.setItem('suivi_session', serialized);
      localStorage.setItem('erp_currentUser', erpSession);
      localStorage.setItem('erp_douroub_session', erpSession);
      localStorage.setItem('sde_user_role', userRole);
    } catch (e) {}
  } else {
    try {
      SESSION_KEYS.forEach((k) => {
        try {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        } catch (e) {}
      });
      sessionStorage.removeItem('suivi_session');
      sessionStorage.removeItem('erp_currentUser');
      sessionStorage.removeItem('erp_douroub_session');
      sessionStorage.removeItem('sde_user_role');

      localStorage.removeItem('suivi_session');
      localStorage.removeItem('suivi_linked_session_v30');
      localStorage.removeItem('erp_currentUser');
      localStorage.removeItem('erp_douroub_session');
      localStorage.removeItem('sde_user_role');
    } catch (e) {}
  }
}
function setupState() {
  Object.assign(state, loadState());
  if (typeof window !== 'undefined' && window.PRELOAD_DATA) {
    if (!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) {
      if (Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0) {
        state.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
      }
    }
    if (!Array.isArray(state.payments) || state.payments.length === 0) {
      if (Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length > 0) {
        state.payments = window.PRELOAD_DATA.payments.map(normalizePayment);
      }
    }
  }
  if (state.activeTab === 'stock' || !state.activeTab) {
    state.activeTab = 'followup';
  }
  state.session = loadSession();
  state.settings.bcSequence = Math.max(Number(state.settings.bcSequence || 1), highestBcSequence() + 1);
  state.settings.daSequence = Math.max(Number(state.settings.daSequence || 1), highestDaSequence() + 1);
  state.ui = { followupPage: 1, followupPageSize: 10, followupSortField: 'date', followupSortDir: 'desc', ...(state.ui || {}) };
}

function setTheme(theme) {
  const safe = (theme === 'dark') ? 'dark' : 'light';
  state.settings.theme = safe;
  if (document.body && document.body.dataset) document.body.dataset.theme = safe;
  if (document.documentElement && document.documentElement.dataset) document.documentElement.dataset.theme = safe;
  if ($('themeSelect')) $('themeSelect').value = safe;
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = safe === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    toggleBtn.title = safe === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre';
  }
  try {
    localStorage.setItem('sde_theme', safe);
    localStorage.setItem('sde_portal_theme', safe);
  } catch (e) {}
  if (typeof window.updateTabColors === 'function') {
    try { window.updateTabColors(); } catch (e) {}
  }
}
function applyBranding() {
  const title = (state.settings && state.settings.title) || (typeof defaultSettings === 'function' ? defaultSettings().title : 'Suivi Achats');
  const subtitle = (state.settings && state.settings.subtitle) || (typeof defaultSettings === 'function' ? defaultSettings().subtitle : 'SPA DOUROUB ELDJAZAIR');
  const titleEl = $('appTitle') || (typeof document !== 'undefined' ? document.querySelector('.sa-brand-text') : null);
  if (titleEl) titleEl.textContent = title;
  const subtitleEl = $('appSubtitle') || (typeof document !== 'undefined' ? document.querySelector('.sa-brand-sub') : null);
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (typeof document !== 'undefined' && title) {
    document.title = title;
  }
  const preview = $('logoPreview');
  if (preview) {
    if (state.settings && state.settings.logoDataUrl) {
      preview.src = state.settings.logoDataUrl;
      if (preview.classList) preview.classList.remove('hidden');
    } else {
      if (preview.classList) preview.classList.add('hidden');
      preview.removeAttribute('src');
    }
  }
}
function login(username, password) {
  const user = state.users.find((u) => u.username === username && u.password === password);
  if (!user) return false;
  state.session = { username: user.username, role: user.role, at: nowIso() };
  saveSession();
  try {
    localStorage.setItem('suivi_session', JSON.stringify(state.session));
    localStorage.setItem('sde_user_role', user.role === 'admin' ? 'admin' : 'admin_appro');
    localStorage.setItem('erp_douroub_session', JSON.stringify({ username: user.username, role: user.role, name: user.name || user.username }));
    localStorage.setItem('erp_currentUser', JSON.stringify({ username: user.username, role: user.role, name: user.name || user.username }));
  } catch(e) {}
  refreshAuthUi();
  return true;
}
function logout() {
  state.session = null;
  saveSession();
  try {
    sessionStorage.removeItem(SESSION_KEYS[0]);
    SESSION_KEYS.forEach((k) => {
      try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (e) {}
    });
    localStorage.removeItem('sde_user_role');
    localStorage.removeItem('suivi_session');
    localStorage.removeItem('suivi_linked_session_v30');
    localStorage.removeItem('erp_currentUser');
    localStorage.removeItem('erp_douroub_session');
    localStorage.removeItem('erp_jwt_token');
  } catch (e) {}
  window.location.href = '../index.html';
}

window.bcShowModuleGate = function() {
  const u = state.session;
  const name = u ? (u.name || u.username || 'Administrateur') : 'Administrateur';
  const firstName = name.split(' ')[0];
  const existing = document.getElementById('bcModuleGate');
  if (existing) { existing.style.display = 'flex'; return; }
  const gate = document.createElement('div');
  gate.id = 'bcModuleGate';
  gate.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0f172a,#1e1b4b);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:inherit;';
  gate.innerHTML = `
    <div style="text-align:center;margin-bottom:36px;">
      <div style="width:68px;height:68px;border-radius:18px;background:linear-gradient(135deg,#2563eb,#7c3aed);margin:0 auto 18px;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-th-large" style="color:#fff;font-size:26px;"></i>
      </div>
      <h1 style="font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:6px;">Bienvenue, ${firstName}</h1>
      <p style="color:#94a3b8;font-size:0.92rem;">Choisissez votre espace de travail</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:580px;width:92%;">
      <button onclick="window.location.href='/'" style="padding:28px 14px;border-radius:18px;border:2px solid rgba(37,99,235,0.5);background:rgba(37,99,235,0.12);cursor:pointer;color:#fff;" onmouseover="this.style.background='rgba(37,99,235,0.3)'" onmouseout="this.style.background='rgba(37,99,235,0.12)'">
        <i class="fas fa-boxes fa-2x" style="color:#60a5fa;display:block;margin-bottom:10px;"></i>
        <strong style="font-size:0.88rem;display:block;">Stock & Magasin</strong>
        <small style="color:#94a3b8;font-size:0.72rem;margin-top:3px;display:block;">Catalogue, mouvements</small>
      </button>
      <button onclick="document.getElementById('bcModuleGate').style.display='none'" style="padding:28px 14px;border-radius:18px;border:2px solid rgba(16,185,129,0.6);background:rgba(16,185,129,0.2);cursor:pointer;color:#fff;">
        <i class="fas fa-file-contract fa-2x" style="color:#34d399;display:block;margin-bottom:10px;"></i>
        <strong style="font-size:0.88rem;display:block;">Bons de Commande</strong>
        <small style="color:#94a3b8;font-size:0.72rem;margin-top:3px;display:block;">BC, paiements</small>
      </button>
      <button onclick="window.location.href='/general-settings.html'" style="padding:28px 14px;border-radius:18px;border:2px solid rgba(124,58,237,0.5);background:rgba(124,58,237,0.12);cursor:pointer;color:#fff;" onmouseover="this.style.background='rgba(124,58,237,0.3)'" onmouseout="this.style.background='rgba(124,58,237,0.12)'">
        <i class="fas fa-sliders fa-2x" style="color:#a78bfa;display:block;margin-bottom:10px;"></i>
        <strong style="font-size:0.88rem;display:block;">Paramètres Généraux</strong>
        <small style="color:#94a3b8;font-size:0.72rem;margin-top:3px;display:block;">Utilisateurs, DB</small>
      </button>
    </div>
    <p style="color:#334155;font-size:0.76rem;margin-top:36px;">ERP Douroub v6 — CHIKHAOUI ABDERRAHIME</p>
  `;
  document.body.appendChild(gate);
};
function refreshAuthUi() {
  const logged = Boolean(state.session);
  const loginScreen = $('loginScreen');
  if (loginScreen && loginScreen.classList) loginScreen.classList.toggle('hidden', logged);
  const appShell = $('appShell');
  if (appShell && appShell.classList) appShell.classList.toggle('hidden', !logged);
  if (logged) {
    const u = state.session;
    const name = u.name || u.username || u.login || 'U';
    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
    const el = $('currentUserLabel');
    if (el) el.textContent = initials;
    const avatar = $('ucardInitials');
    if (avatar) avatar.textContent = initials;
    const cname = document.getElementById('ucardName');
    if (cname) cname.textContent = name;
    const crole = document.getElementById('ucardRole');
    if (crole) crole.textContent = u.role || u.poste || 'Utilisateur';
    const cservice = document.getElementById('ucardService');
    if (cservice) cservice.textContent = u.service || u.department || '';

    // Show admin-only links
    const role = (u.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'directeur';
    const settingsLink = document.getElementById('bcLinkToSettings');
    if (settingsLink) settingsLink.style.display = isAdmin ? 'flex' : 'none';
    const switchBtn = document.getElementById('bcSwitchModuleBtn');
    if (switchBtn) switchBtn.style.display = isAdmin ? 'flex' : 'none';

    // Show GDS Scan shortcut if user is admin, magasinier, mag, gds, stock or has gdsOption
    const gdsLink = document.getElementById('linkToGdsScanner');
    if (gdsLink) {
      const isEligible = u && (u.role === 'admin' || u.role === 'magasinier' || u.role === 'mag' || u.role === 'gds' || u.role === 'stock' || u.canDeductStock === true || u.gdsOption === true);
      gdsLink.style.display = isEligible ? 'inline-flex' : 'none';
    }

    renderApp();
  }
}

window.openGdsStockScanner = function() {
  try { localStorage.setItem('erp_active_module', 'stock'); } catch(e) {}
  const isHttp = (typeof window !== 'undefined' && window.location && window.location.protocol) ? window.location.protocol.startsWith('http') : false;
  window.location.href = isHttp ? '/?scan_gds=1#stock' : '../index.html?scan_gds=1#stock';
};

function holidaysSet() {
  return new Set(state.holidays.map((h) => h.date));
}
function isNonWorkingDay(ymd) {
  if (!ymd) return false;
  const d = new Date(`${ymd}T00:00:00`);
  return state.settings.weekendDays.includes(d.getDay()) || holidaysSet().has(ymd);
}
function addBusinessDays(startYmd, days) {
  const date = new Date(`${(startYmd || todayYmd())}T00:00:00`);
  let remaining = Number(days || 0);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const ymd = toYmd(date);
    if (!isNonWorkingDay(ymd)) remaining -= 1;
  }
  return toYmd(date);
}
function businessDaysBetween(startYmd, endYmd) {
  if (!startYmd || !endYmd) return null;
  let a = new Date(`${startYmd}T00:00:00`);
  let b = new Date(`${endYmd}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const reverse = b < a;
  if (reverse) [a, b] = [b, a];
  let count = 0;
  while (a < b) {
    a.setDate(a.getDate() + 1);
    if (!isNonWorkingDay(toYmd(a))) count += 1;
  }
  return reverse ? -count : count;
}
function computeDelay(row) {
  const actual = row.type === 'service' ? row.serviceDoneDate : row.goodsReceivedDate;
  if (!row.promisedDate) return { label: 'Sans échéance', cls: 'neutral', actual };
  const base = actual || todayYmd();
  const delta = businessDaysBetween(row.promisedDate, base);
  if (delta == null) return { label: '—', cls: 'neutral', actual };
  if (actual) {
    if (delta <= 0) return { label: delta === 0 ? 'À temps' : `${Math.abs(delta)} j avance`, cls: 'ok', actual };
    if (delta <= 2) return { label: `${delta} j retard`, cls: 'warn', actual };
    return { label: `${delta} j retard`, cls: 'late', actual };
  }
  if (delta < 0) return { label: `${Math.abs(delta)} j restants`, cls: 'info', actual: '' };
  if (delta === 0) return { label: 'Aujourd’hui', cls: 'warn', actual: '' };
  if (delta <= 2) return { label: `${delta} j retard`, cls: 'warn', actual: '' };
  return { label: `${delta} j retard`, cls: 'late', actual: '' };
}
function statusLabel(value) {
  return {
    brouillon: 'Brouillon',
    transmis: 'Transmis',
    partiel: 'Partiel',
    receptionne: 'Réceptionné',
    cloture: 'Clôturé',
    importe: 'Brouillon',
    en_attente: 'Transmis',
    en_cours: 'Partiel',
    livre: 'Réceptionné',
    service_fait: 'Réceptionné',
    paye: 'Clôturé',
    clos: 'Clôturé',
    programme: 'Programmé',
  }[value] || value || '—';
}
function statusClass(value) {
  if (['receptionne', 'livre', 'service_fait'].includes(value)) return 'status-receptionne ok';
  if (['cloture', 'paye', 'clos'].includes(value)) return 'status-cloture status-valide ok';
  if (['partiel', 'en_cours', 'programme'].includes(value)) return 'status-partiel warn';
  if (['brouillon', 'importe'].includes(value)) return 'status-brouillon info';
  if (['transmis', 'en_attente'].includes(value)) return 'status-transmis late';
  return 'neutral';
}
function validationClass(row) {
  return row.daStatus === 'validated' ? 'ok' : 'warn';
}
function validationLabel(row) {
  return row.daStatus === 'validated' ? 'Validé' : 'À vérifier';
}

function ensureSupplier(name, extra = {}) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const found = state.suppliers.find((s) => normalizeText(s.name) === normalizeText(clean));
  if (found) {
    Object.assign(found, {
      address: found.address || extra.address || '',
      phone: found.phone || extra.phone || '',
      email: found.email || extra.email || '',
      updatedAt: nowIso(),
    });
    return found;
  }
  const supplier = { id: uid('sup'), name: clean, address: extra.address || '', phone: extra.phone || '', email: extra.email || '', createdAt: nowIso(), updatedAt: nowIso() };
  state.suppliers.push(supplier);
  return supplier;
}
function ensureRequester(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const found = state.requesters.find((s) => normalizeText(s.name) === normalizeText(clean));
  if (found) return found;
  const requester = { id: uid('req'), name: clean, createdAt: nowIso() };
  state.requesters.push(requester);
  return requester;
}
function findBcById(id) { return state.bcRecords.find((row) => row.id === id); }
function findPaymentById(id) { return state.payments.find((row) => row.id === id); }
function findStockItemById(id) { return state.stockItems.find((row) => row.id === id); }

function syncSuppliersFromBcRecords() {
  if (!Array.isArray(state.bcRecords)) return;
  if (!Array.isArray(state.suppliers)) state.suppliers = [];
  const existingNames = new Set(state.suppliers.map(s => normalizeText(typeof s === 'string' ? s : (s.name || s))));
  let added = false;
  state.bcRecords.forEach(r => {
    const sName = String(r.supplierName || '').trim();
    if (sName && !existingNames.has(normalizeText(sName))) {
      existingNames.add(normalizeText(sName));
      state.suppliers.push({ id: uid('sup'), name: sName, address: '', phone: '', email: '', createdAt: nowIso() });
      added = true;
    }
  });
  if (added) {
    state.suppliers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }));
  }
}

function fillReferenceLists() {
  syncSuppliersFromBcRecords();
  const stdDepts = (typeof window.STANDARDIZED_DEPARTMENTS !== 'undefined') ? window.STANDARDIZED_DEPARTMENTS : [
    'Direction Générale',
    'Maintenance & Parc',
    'Approvisionnements',
    'Exploitation',
    'Finances & Comptabilité',
    'Magasin Central'
  ];
  const allSupplierNames = [...new Set([
    ...state.suppliers.map(s => typeof s === 'string' ? s : (s.name || '')),
    ...(state.bcRecords || []).map(r => r.supplierName || '')
  ].map(s => String(s || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  if ($('suppliersList')) $('suppliersList').innerHTML = allSupplierNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
  if ($('requestersList')) $('requestersList').innerHTML = stdDepts.map((d) => `<option value="${escapeHtml(d)}"></option>`).join('');
  if ($('departmentsList')) $('departmentsList').innerHTML = stdDepts.map((d) => `<option value="${escapeHtml(d)}"></option>`).join('');

  const kpiSup = $('kpiSupplierFilter');
  if (kpiSup) {
    const curVal = kpiSup.value || 'all';
    kpiSup.innerHTML = ['<option value="all">Tous fournisseurs</option>'].concat(
      allSupplierNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    ).join('');
    kpiSup.value = curVal;
  }
  const paySup = $('paymentFilterSupplier');
  if (paySup) {
    const curVal = paySup.value || 'all';
    paySup.innerHTML = ['<option value="all">Tous fournisseurs</option>'].concat(
      allSupplierNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    ).join('');
    paySup.value = curVal;
  }
}
function refreshSelectOptions() {
  const payBc = $('paymentBcId');
  if (payBc) {
    payBc.innerHTML = ['<option value="">— Choisir une BC —</option>']
      .concat(state.bcRecords.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((row) => `<option value="${row.id}">${escapeHtml(row.ref)}${row.daRef ? ` · ${escapeHtml(row.daRef)}` : ''} — ${escapeHtml(row.supplierName)}</option>`))
      .join('');
  }
  const stockLogItem = $('stockLogItemId');
  if (stockLogItem) {
    stockLogItem.innerHTML = ['<option value="">— Choisir un article —</option>']
      .concat(state.stockItems.slice().sort((a, b) => a.name.localeCompare(b.name)).map((row) => `<option value="${row.id}">${escapeHtml(row.code)} — ${escapeHtml(row.name)}</option>`))
      .join('');
  }
}
function fillSettingsScreen() {
  if ($('settingTitle')) $('settingTitle').value = state.settings.title || '';
  if ($('settingSubtitle')) $('settingSubtitle').value = state.settings.subtitle || '';
  if ($('settingBcPrefix')) $('settingBcPrefix').value = state.settings.bcPrefix || 'BC';
  if ($('settingBcSequence')) $('settingBcSequence').value = state.settings.bcSequence || 1;
  if ($('settingDaPrefix')) $('settingDaPrefix').value = state.settings.daPrefix || 'DA';
  if ($('settingDaSequence')) $('settingDaSequence').value = state.settings.daSequence || 1;
  if ($('settingProcDays')) $('settingProcDays').value = state.settings.procurementDays || 3;
  if ($('settingFinDays')) $('settingFinDays').value = state.settings.financeDays || 3;
  if (Array.isArray(state.settings?.weekendDays)) {
    $$('.weekend-checkbox').forEach((cb) => cb.checked = state.settings.weekendDays.includes(Number(cb.dataset.day)));
  }
  renderHolidayPills();
  renderReferenceManagers();
  applyBranding();
}
function saveSettingsFromScreen() {
  state.settings.title = $('settingTitle').value.trim() || defaultSettings().title;
  state.settings.subtitle = $('settingSubtitle').value.trim() || defaultSettings().subtitle;
  state.settings.bcPrefix = ($('settingBcPrefix').value || 'BC').trim().toUpperCase();
  state.settings.bcSequence = Math.max(1, Number($('settingBcSequence').value || 1));
  state.settings.daPrefix = ($('settingDaPrefix').value || 'DA').trim().toUpperCase();
  state.settings.daSequence = Math.max(1, Number($('settingDaSequence').value || 1));
  state.settings.procurementDays = Math.max(0, Number($('settingProcDays').value || 3));
  state.settings.financeDays = Math.max(0, Number($('settingFinDays').value || 3));
  state.settings.weekendDays = $$('.weekend-checkbox').filter((cb) => cb.checked).map((cb) => Number(cb.dataset.day));
  saveState();
  refreshFollowupDefaults();
  renderApp();
  showToast('Paramètres sauvegardés.');
}
function renderHolidayPills() {
  const el = $('holidaysList');
  if (!el) return;
  el.innerHTML = state.holidays.length
    ? state.holidays.map((h) => `<span class="pill-item">${escapeHtml(formatDate(h.date))}${h.label ? ` · ${escapeHtml(h.label)}` : ''}<button type="button" data-holiday-id="${h.id}">×</button></span>`).join('')
    : '<span class="muted">Aucun jour férié.</span>';
  $$('[data-holiday-id]').forEach((btn) => btn.onclick = () => {
    state.holidays = state.holidays.filter((h) => h.id !== btn.dataset.holidayId);
    saveState();
    renderHolidayPills();
    renderApp();
  });
}
function addHoliday() {
  const date = $('holidayDate').value;
  if (!date) return showToast('Date requise.');
  if (!state.holidays.find((h) => h.date === date)) {
    state.holidays.push({ id: uid('hol'), date, label: $('holidayLabel').value.trim() });
    state.holidays.sort((a, b) => a.date.localeCompare(b.date));
    saveState();
  }
  $('holidayDate').value = '';
  $('holidayLabel').value = '';
  renderHolidayPills();
  showToast('Jour férié ajouté.');
}
function renderReferenceManagers() {
  const sm = $('suppliersManager');
  if (sm) {
    sm.innerHTML = state.suppliers.length
      ? state.suppliers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<span class="pill-item">${escapeHtml(s.name)}<button type="button" data-remove-supplier="${s.id}">×</button></span>`).join('')
      : '<span class="muted">Aucun fournisseur.</span>';
  }
  const rm = $('requestersManager');
  if (rm) {
    rm.innerHTML = state.requesters.length
      ? state.requesters.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => `<span class="pill-item">${escapeHtml(r.name)}<button type="button" data-remove-requester="${r.id}">×</button></span>`).join('')
      : '<span class="muted">Aucun demandeur.</span>';
  }
  $$('[data-remove-supplier]').forEach((btn) => btn.onclick = () => {
    state.suppliers = state.suppliers.filter((s) => s.id !== btn.dataset.removeSupplier);
    saveState();
    fillReferenceLists();
    renderReferenceManagers();
    showToast('Fournisseur supprimé.');
  });
  $$('[data-remove-requester]').forEach((btn) => btn.onclick = () => {
    state.requesters = state.requesters.filter((s) => s.id !== btn.dataset.removeRequester);
    saveState();
    fillReferenceLists();
    renderReferenceManagers();
    showToast('Demandeur supprimé.');
  });
}
function addSupplierFromSettings() {
  const supplier = ensureSupplier($('newSupplierName').value.trim());
  if (!supplier) return showToast('Nom fournisseur requis.');
  $('newSupplierName').value = '';
  saveState();
  fillReferenceLists();
  renderReferenceManagers();
  showToast('Fournisseur ajouté.');
}
function addRequesterFromSettings() {
  const requester = ensureRequester($('newRequesterName').value.trim());
  if (!requester) return showToast('Nom demandeur requis.');
  $('newRequesterName').value = '';
  saveState();
  fillReferenceLists();
  renderReferenceManagers();
  showToast('Demandeur ajouté.');
}
function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.settings.logoDataUrl = reader.result;
    saveState();
    applyBranding();
    showToast('Logo enregistré.');
  };
  reader.readAsDataURL(file);
}

function formValueAsNumber(id) {
  return parseFlexibleNumber($(id).value || 0);
}
function refreshFollowupDefaults() {
  const followupId = $('followupId');
  const bcRef = $('bcRef');
  const bcDaRef = $('bcDaRef');
  const bcDate = $('bcDate');
  const bcPromisedDate = $('bcPromisedDate');
  const bcCurrency = $('bcCurrency');
  if (followupId && bcRef && !followupId.value && !bcRef.value) bcRef.value = nextBcRefPreview();
  if (followupId && bcDaRef && !followupId.value && !bcDaRef.value) bcDaRef.value = nextDaRefPreview();
  if (bcDate && !bcDate.value) bcDate.value = todayYmd();
  if (bcPromisedDate && bcDate && !bcPromisedDate.value && bcDate.value) bcPromisedDate.value = addBusinessDays(bcDate.value, state.settings?.procurementDays || 0);
  if (bcCurrency) bcCurrency.value = 'DZD';
}

function getBcStockIngestionInfo(bc) {
  if (!bc) return null;
  if (bc.stockIngested === true || bc.stockIngested === 'true') {
    return {
      ingested: true,
      date: bc.stockIngestedDate || bc.stockIngestedAt || bc.goodsReceivedDate || bc.date || '',
      articleRef: bc.stockArticleRef || bc.lineItems?.[0]?.description || bc.description || 'Articles BC',
      note: 'Ce Bon de Commande a été réceptionné et intégré dans le stock'
    };
  }
  try {
    let ingestedBcs = null;
    if (typeof window !== 'undefined' && window.DB?.data?.ingestedBcs) {
      ingestedBcs = window.DB.data.ingestedBcs;
    } else if (typeof DB !== 'undefined' && DB?.data?.ingestedBcs) {
      ingestedBcs = DB.data.ingestedBcs;
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('erp_douroub_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        ingestedBcs = parsed?.ingestedBcs || parsed?.data?.ingestedBcs || null;
      }
    }
    if (ingestedBcs) {
      const bcSerial = (typeof extractBcSerial === 'function') ? extractBcSerial(bc.ref) : '';
      if (Array.isArray(ingestedBcs)) {
        const match = ingestedBcs.find(item => {
          if (!item) return false;
          if (typeof item === 'string') return item === bc.ref || item === bc.id || (bcSerial && item === bcSerial);
          const iRef = item.bcRef || item.ref || item.id || '';
          const iSerial = (typeof extractBcSerial === 'function') ? extractBcSerial(iRef) : '';
          return iRef === bc.ref || iRef === bc.id || (bcSerial && iSerial && bcSerial === iSerial);
        });
        if (match) {
          return {
            ingested: true,
            date: typeof match === 'object' ? (match.date || match.ingestedAt || bc.goodsReceivedDate || bc.date || '') : (bc.goodsReceivedDate || bc.date || ''),
            articleRef: typeof match === 'object' ? (match.articleRef || match.article || match.designation || bc.lineItems?.[0]?.description || bc.description || 'Articles BC') : (bc.lineItems?.[0]?.description || bc.description || 'Articles BC'),
            note: 'Ce Bon de Commande a été réceptionné et intégré dans le stock'
          };
        }
      } else if (typeof ingestedBcs === 'object') {
        const match = ingestedBcs[bc.id] || ingestedBcs[bc.ref] || (bcSerial && ingestedBcs[bcSerial]);
        if (match) {
          return {
            ingested: true,
            date: match.ingestedAt || match.date || bc.goodsReceivedDate || bc.date || '',
            articleRef: match.articleRef || match.article || match.designation || bc.lineItems?.[0]?.description || bc.description || 'Articles BC',
            note: 'Ce Bon de Commande a été réceptionné et intégré dans le stock'
          };
        }
      }
    }
  } catch (e) {}
  return null;
}
if (typeof window !== 'undefined') window.getBcStockIngestionInfo = getBcStockIngestionInfo;

function getBcStockBadge(bc) {
  if (!bc) return '';
  const info = getBcStockIngestionInfo(bc);
  if (info && info.ingested) {
    return '<span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>';
  }
  const st = String(bc.status || '').toLowerCase().trim();
  if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
    return '<span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>';
  }
  return '';
}
if (typeof window !== 'undefined') window.getBcStockBadge = getBcStockBadge;

function openBcDrawer(isEdit = false, rowData = null) {
  const drawer = $('bcSlideOverDrawer');
  if (!drawer) return;
  const stockAlert = $('bcDrawerStockAlert');
  if (!isEdit) {
    resetFollowupForm();
    if ($('bcDrawerHeading')) $('bcDrawerHeading').textContent = 'Nouveau Bon de Commande';
    if ($('bcDrawerSub')) $('bcDrawerSub').textContent = 'Saisie manuelle rapide, validation DA et conditions de règlement';
    if (stockAlert) { stockAlert.innerHTML = ''; stockAlert.classList.add('hidden'); }
  } else {
    if ($('bcDrawerHeading')) $('bcDrawerHeading').textContent = 'Modifier Bon de Commande';
    if ($('bcDrawerSub')) $('bcDrawerSub').textContent = 'Mise à jour des informations et statuts du bon';
    if (stockAlert && rowData) {
      const stockInfo = getBcStockIngestionInfo(rowData);
      if (stockInfo && stockInfo.ingested) {
        stockAlert.innerHTML = `
          <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:0.85rem 1rem;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>
              <strong style="color:#065f46;font-size:0.88rem;">Intégré au Magasin Central</strong>
            </div>
            <div style="font-size:0.82rem;color:#047857;margin-bottom:4px;">${escapeHtml(stockInfo.note || 'Ce Bon de Commande a été réceptionné et intégré dans le stock')}</div>
            <div style="font-size:0.78rem;color:#064e3b;display:flex;gap:12px;">
              <span><strong>Date :</strong> ${escapeHtml(stockInfo.date || '—')}</span>
              <span><strong>Réf :</strong> ${escapeHtml(stockInfo.articleRef || '—')}</span>
            </div>
          </div>
        `;
        stockAlert.classList.remove('hidden');
      } else {
        const st = String(rowData.status || '').toLowerCase();
        if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
          stockAlert.innerHTML = `
            <div style="background:#fff1f2;border:1px solid #f43f5e;border-radius:8px;padding:0.75rem 1rem;">
              <span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>
              <span style="font-size:0.82rem;color:#9f1239;margin-left:6px;">Livraison enregistrée — En attente d'ingestion au stock magasin.</span>
            </div>
          `;
          stockAlert.classList.remove('hidden');
        } else {
          stockAlert.innerHTML = '';
          stockAlert.classList.add('hidden');
        }
      }
    }
  }
  drawer.classList.remove('hidden');
  setTimeout(() => drawer.classList.add('active'), 10);
}

function closeBcDrawer() {
  const drawer = $('bcSlideOverDrawer');
  if (!drawer) return;
  drawer.classList.remove('active');
  setTimeout(() => drawer.classList.add('hidden'), 250);
}

function resetFollowupForm() {
  if ($('followupForm')) $('followupForm').reset();
  if ($('followupId')) $('followupId').value = '';
  if ($('bcType')) $('bcType').value = 'achat';
  if ($('bcStatus')) $('bcStatus').value = 'importe';
  if ($('bcCurrency')) $('bcCurrency').value = 'DZD';
  refreshFollowupDefaults();
}
function buildBcPayloadFromMain(mode = 'save', existing = null) {
  const supplier = ensureSupplier($('bcSupplier').value.trim());
  const requester = ensureRequester($('bcRequester').value.trim());
  const date = $('bcDate').value || todayYmd();
  const payload = normalizeBcRecord({
    ...(existing || {}),
    id: existing?.id || $('followupId').value || uid('bc'),
    ref: canonicalBcRef($('bcRef').value.trim() || nextBcRefPreview(), '', date),
    daRef: canonicalDaRef($('bcDaRef').value.trim() || existing?.daRef || nextDaRefPreview(), date),
    daStatus: mode === 'validate' ? 'validated' : (existing?.daStatus || 'draft'),
    daValidatedAt: mode === 'validate' ? nowIso() : (existing?.daValidatedAt || ''),
    date,
    supplierId: supplier?.id || existing?.supplierId || null,
    supplierName: supplier?.name || $('bcSupplier').value.trim(),
    amountTTC: formValueAsNumber('bcAmount'),
    amountHT: existing?.amountHT || 0,
    currency: 'DZD',
    type: $('bcType').value || 'achat',
    description: $('bcDescription').value.trim(),
    status: $('bcStatus').value,
    promisedDate: $('bcPromisedDate').value || addBusinessDays(date, state.settings.procurementDays || 0),
    goodsReceivedDate: $('bcGoodsDate').value,
    serviceDoneDate: $('bcServiceDate').value,
    department: (typeof window.normalizeDepartment === 'function' ? window.normalizeDepartment($('bcDepartment')?.value.trim() || existing?.department, supplier?.name || $('bcSupplier').value.trim(), requester?.name || $('bcRequester').value.trim()) : ($('bcDepartment')?.value.trim() || existing?.department || 'Maintenance & Parc')),
    requester: requester?.name || $('bcRequester').value.trim() || $('bcDepartment')?.value.trim() || 'Maintenance & Parc',
    paymentTerms: $('bcPaymentTerms').value.trim(),
    comments: $('bcComments').value.trim(),
    notes: $('bcNotes').value.trim(),
    importedFromBC: Boolean(existing?.importedFromBC),
    sourceFile: existing?.sourceFile || '',
    lineItems: existing?.lineItems || [],
    lineCount: existing?.lineCount || 0,
    totalQty: existing?.totalQty || 0,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  return payload;
}
function submitFollowupForm(e) {
  e.preventDefault();
  const mode = e.submitter?.dataset.mode || 'save';
  const existing = findBcById($('followupId').value);
  const payload = buildBcPayloadFromMain(mode, existing);
  if (!payload.ref) return showToast('Référence BC requise.');
  if (!payload.supplierName) return showToast('Fournisseur requis.');
  const index = state.bcRecords.findIndex((row) => row.id === payload.id);
  if (index >= 0) state.bcRecords.splice(index, 1, payload);
  else state.bcRecords.unshift(payload);
  bumpBcSequenceFromRef(payload.ref);
  bumpDaSequenceFromRef(payload.daRef);
  saveState();
  fillReferenceLists();
  refreshSelectOptions();
  resetFollowupForm();
  closeBcDrawer();
  renderApp();
  showToast(mode === 'validate' ? 'BC et DA validés.' : 'Ligne BC enregistrée.');
}
function filteredBcRecords() {
  const q = normalizeText($('followupSearch').value || '');
  const validation = $('followupValidationFilter').value;
  const status = $('followupStatusFilter').value;
  const type = $('followupTypeFilter').value;
  const importance = $('followupImportanceFilter')?.value || 'all';
  const supplier = $('followupSupplierFilter')?.value || 'all';
  const requester = $('followupRequesterFilter')?.value || 'all';
  const dateFrom = $('followupDateFrom')?.value || '';
  const dateTo = $('followupDateTo')?.value || '';
  const sortField = $('followupSortField')?.value || state.ui.followupSortField || 'date';
  const sortDir = $('followupSortDir')?.value || state.ui.followupSortDir || 'desc';
  state.ui.followupSortField = sortField;
  state.ui.followupSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;
  return state.bcRecords
    .filter((row) => {
      if (validation === 'validated' && row.daStatus !== 'validated') return false;
      if (validation === 'draft' && row.daStatus === 'validated') return false;
      if (status !== 'all' && row.status !== status) return false;
      if (type !== 'all' && row.type !== type) return false;
      if (importance !== 'all' && typeof window.ApproNextGen !== 'undefined' && window.ApproNextGen.classifyBcImportance) {
        if (window.ApproNextGen.classifyBcImportance(row) !== importance) return false;
      }
      if (supplier !== 'all' && row.supplierName !== supplier) return false;
      if (requester !== 'all' && row.requester !== requester) return false;
      if (dateFrom && String(row.date || '') < dateFrom) return false;
      if (dateTo && String(row.date || '') > dateTo) return false;
      if (!q) return true;
      const hay = normalizeText([row.ref, row.daRef, row.supplierName, row.requester, row.description, row.paymentTerms, row.comments, row.notes].join(' | '));
      return hay.includes(q);
    })
    .sort((a, b) => {
      const av = sortComparableBc(a, sortField);
      const bv = sortComparableBc(b, sortField);
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) return (av - bv) * dir;
      } else {
        const cmp = String(av).localeCompare(String(bv), 'fr', { numeric: true, sensitivity: 'base' });
        if (cmp) return cmp * dir;
      }
      const byDate = String(b.date || '').localeCompare(String(a.date || ''));
      if (byDate) return byDate;
      return Number(extractBcSerial(b.ref) || 0) - Number(extractBcSerial(a.ref) || 0);
    });
}

function resetFollowupPage() {
  state.ui.followupPage = 1;
}
function resetFollowupFilters() {
  $('followupSearch').value = '';
  $('followupValidationFilter').value = 'all';
  $('followupStatusFilter').value = 'all';
  $('followupTypeFilter').value = 'all';
  if ($('followupImportanceFilter')) $('followupImportanceFilter').value = 'all';
  $('followupSupplierFilter').value = 'all';
  $('followupRequesterFilter').value = 'all';
  $('followupDateFrom').value = '';
  $('followupDateTo').value = '';
  $('followupSortField').value = 'date';
  $('followupSortDir').value = 'desc';
  state.ui.followupSortField = 'date';
  state.ui.followupSortDir = 'desc';
  resetFollowupPage();
  renderFollowupTable();
  showToast('Filtres BC réinitialisés.');
}
function refreshFollowupFilterOptions() {
  const supplierSelect = $('followupSupplierFilter');
  const requesterSelect = $('followupRequesterFilter');
  if (!supplierSelect || !requesterSelect) return;
  const currentSupplier = supplierSelect.value || 'all';
  const currentRequester = requesterSelect.value || 'all';
  const supplierValues = [...new Set(state.bcRecords.map((row) => String(row.supplierName || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  const requesterValues = [...new Set(state.bcRecords.map((row) => String(row.requester || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  supplierSelect.innerHTML = ['<option value="all">Tous fournisseurs</option>'].concat(supplierValues.map((name) => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>')).join('');
  requesterSelect.innerHTML = ['<option value="all">Tous demandeurs</option>'].concat(requesterValues.map((name) => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>')).join('');
  supplierSelect.value = supplierValues.includes(currentSupplier) ? currentSupplier : 'all';
  requesterSelect.value = requesterValues.includes(currentRequester) ? currentRequester : 'all';
}
function sortComparableBc(row, sortField) {
  switch (sortField) {
    case 'ref': return Number(extractBcSerial(row.ref) || 0) || String(row.ref || '');
    case 'supplier': return normalizeText(row.supplierName || '');
    case 'amount': return Number(row.amountTTC || row.amount || 0) || 0;
    case 'status': return normalizeText(statusLabel(row.status));
    case 'promisedDate': return String(row.promisedDate || '');
    case 'date':
    default:
      return String(row.date || '');
  }
}
function renderFollowupPagination(totalRows) {
  const box = $('followupPagination');
  const countBox = $('followupCount');
  const pageSize = Number(state.ui.followupPageSize || 10) || 10;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  state.ui.followupPage = Math.min(Math.max(1, state.ui.followupPage || 1), totalPages);
  if (countBox) {
    const start = totalRows ? ((state.ui.followupPage - 1) * pageSize) + 1 : 0;
    const end = totalRows ? Math.min(totalRows, start + pageSize - 1) : 0;
    countBox.textContent = totalRows ? totalRows + ' ligne(s) · ' + start + '-' + end : '0 ligne';
  }
  if (!box) return;
  if (totalPages <= 1) {
    box.innerHTML = totalRows ? '<span class="page-chip active">1</span>' : '';
    return;
  }
  const makeBtn = (label, page, disabled = false, active = false) => '<button type="button" class="page-chip' + (active ? ' active' : '') + '" data-page="' + page + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>';
  const pages = [];
  pages.push(makeBtn('‹', Math.max(1, state.ui.followupPage - 1), state.ui.followupPage === 1));
  const windowStart = Math.max(1, state.ui.followupPage - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  for (let page = windowStart; page <= windowEnd; page += 1) pages.push(makeBtn(String(page), page, false, page === state.ui.followupPage));
  pages.push(makeBtn('›', Math.min(totalPages, state.ui.followupPage + 1), state.ui.followupPage === totalPages));
  box.innerHTML = pages.join('');
  box.querySelectorAll('[data-page]').forEach((btn) => {
    btn.onclick = () => {
      const page = Number(btn.dataset.page || state.ui.followupPage || 1);
      state.ui.followupPage = Math.min(Math.max(1, page), totalPages);
      renderFollowupTable();
    };
  });
}
function iconActionButton(icon, action, id, label) {
  const glyphs = { edit: '✎', validate: '✓', pay: '₫', clone: '⧉', delete: '🗑' };
  return '<button type="button" class="icon-btn" data-action="' + action + '" data-id="' + id + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '"><span aria-hidden="true">' + (glyphs[icon] || '•') + '</span></button>';
}
function loadPanelPrefs() {
  try { return JSON.parse(localStorage.getItem(PANEL_PREFS_KEY) || '{}') || {}; } catch { return {}; }
}
function savePanelPrefs(prefs) {
  try { localStorage.setItem(PANEL_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}
function panelStorageKey(panel) {
  const page = panel.closest('.page')?.id || 'page';
  const title = panel.querySelector('.panel-title-row h3')?.textContent?.trim() || 'panel';
  return slugify(page + '-' + title);
}
function setupCollapsiblePanels() {
  const prefs = loadPanelPrefs();
  $('.panel').forEach((panel) => {
    const titleRow = panel.querySelector('.panel-title-row');
    if (!titleRow) return;
    let btn = titleRow.querySelector('.panel-toggle-btn');
    const key = panelStorageKey(panel);
    panel.dataset.panelKey = key;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-toggle-btn';
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '<span class="panel-toggle-label">Réduire</span><span class="panel-toggle-icon" aria-hidden="true">−</span>';
      titleRow.appendChild(btn);
    }
    const apply = () => {
      const collapsed = Boolean(prefs[key]);
      panel.classList.toggle('panel-collapsed', collapsed);
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      const label = collapsed ? 'Ouvrir' : 'Réduire';
      btn.querySelector('.panel-toggle-label').textContent = label;
      btn.querySelector('.panel-toggle-icon').textContent = collapsed ? '+' : '−';
    };
    btn.onclick = () => {
      prefs[key] = !prefs[key];
      savePanelPrefs(prefs);
      apply();
    };
    apply();
  });
}

function renderImportHealthBanner() {
  const box = $('importHealthBanner');
  if (!box) return;
  if (!state.importWarnings.length) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `<strong>Contrôle import</strong><div class="muted">${state.importWarnings.map(escapeHtml).join('<br>')}</div>`;
}
function renderBcRow(row) {
  const delay = computeDelay(row);
  const actual = delay.actual || '';
  const stockBadge = getBcStockBadge(row);

  // Parse fleet data from remarques / comments / notes if truckPlate not explicit
  const rawRemarque = String(row.remarques || row.comments || row.notes || '').trim();
  const fleetInfo = (typeof parseFleetRemarque === 'function') ? parseFleetRemarque(rawRemarque) : null;
  const truckPlate = row.truckPlate || row.truckVin || (fleetInfo && fleetInfo.truckId !== 'Inconnu' ? fleetInfo.truckId : null);
  const serviceType = row.serviceType || (fleetInfo ? fleetInfo.serviceType : null);
  const kmReading = row.kmReading || (fleetInfo ? fleetInfo.kmReading : null);

  let remarqueHtml = '';
  if (truckPlate || serviceType) {
    remarqueHtml += `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:3px;">`;
    if (truckPlate) {
      remarqueHtml += `<span class="badge bg-primary me-1" style="font-size:11px;font-weight:700;padding:3px 7px;background:#2563eb;color:#ffffff;border-radius:4px;"><i class="fas fa-truck me-1"></i>${escapeHtml(truckPlate)}</span>`;
    }
    if (serviceType) {
      remarqueHtml += `<span class="badge bg-secondary me-1" style="font-size:11px;font-weight:600;padding:3px 7px;background:#64748b;color:#ffffff;border-radius:4px;">${escapeHtml(serviceType)}</span>`;
    }
    if (kmReading) {
      remarqueHtml += `<span class="badge bg-info text-dark me-1" style="font-size:10px;font-weight:700;padding:2px 6px;background:#bae6fd;color:#0369a1;border-radius:4px;"><i class="fas fa-gauge me-1"></i>${Number(kmReading).toLocaleString('fr-FR')} KM</span>`;
    }
    remarqueHtml += `</div>`;
  }
  if (rawRemarque) {
    remarqueHtml += `<span class="text-muted small" style="font-size:11.5px;line-height:1.3;display:inline-block;">${escapeHtml(rawRemarque)}</span>`;
  } else if (!truckPlate && !serviceType) {
    remarqueHtml = '<span class="text-muted">—</span>';
  }

  return `<tr>
    <td><strong>${escapeHtml(row.ref)}</strong><span class="table-subline">${escapeHtml(row.importedFromBC ? (row.sourceFile || 'Import BC') : 'Saisie manuelle')}</span>${stockBadge ? `<div style="margin-top:3px;">${stockBadge}</div>` : ''}</td>
    <td><strong>${escapeHtml(row.daRef || 'DA auto')}</strong><span class="table-subline">${row.daStatus === 'validated' ? `Validé le ${escapeHtml(formatDate(row.daValidatedAt))}` : 'modifiable'}</span></td>
    <td>${escapeHtml(formatDate(row.date))}</td>
    <td>${escapeHtml(row.supplierName || '—')}<span class="table-subline">${escapeHtml(row.requester || 'Sans demandeur')}</span></td>
    <td><span class="badge bg-light text-dark border" style="font-size:11px;padding:3px 6px;">${escapeHtml(row.department || row.service || '—')}</span></td>
    <td><span class="badge bg-${row.type === 'service' ? 'info' : 'secondary'} text-white" style="font-size:11px;padding:3px 6px;">${escapeHtml(row.type === 'service' ? 'Service' : 'Achat')}</span></td>
    <td>${escapeHtml(formatMoney(row.amountHT || (row.amountTTC ? Math.round(row.amountTTC / 1.19) : (row.amount ? Math.round(row.amount / 1.19) : 0)), 'DZD'))}</td>
    <td><strong>${escapeHtml(formatMoney(row.amountTTC || row.amount || 0, 'DZD'))}</strong></td>
    <td><span class="status-pill ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span><div style="margin-top:3px;"><span class="status-pill ${validationClass(row)}" style="font-size:10px;">${escapeHtml(validationLabel(row))}</span></div></td>
    <td>${actual ? `<span class="badge bg-success text-white mb-1" style="font-size:10px;padding:2px 5px;"><i class="fas fa-check me-1"></i>${escapeHtml(formatDate(actual))}</span>` : (row.promisedDate ? `<span class="small text-muted d-block">Prévu: ${escapeHtml(formatDate(row.promisedDate))}</span>` : '<span class="text-muted small d-block">En attente</span>')}<div style="margin-top:2px;"><span class="delay-pill ${delay.cls}">${escapeHtml(delay.label)}</span></div></td>
    <td>${remarqueHtml}</td>
    <td>
      <div class="table-actions icon-actions">
        ${iconActionButton('edit', 'edit-bc', row.id, 'Modifier')}
        ${iconActionButton('validate', 'validate-bc', row.id, row.daStatus === 'validated' ? 'Revalider' : 'Valider BC + DA')}
        ${iconActionButton('pay', 'pay-bc', row.id, 'Créer paiement')}
        ${iconActionButton('clone', 'duplicate-bc', row.id, 'Dupliquer')}
        ${iconActionButton('delete', 'delete-bc', row.id, 'Supprimer')}
      </div>
    </td>
  </tr>`;
}
if (typeof window !== 'undefined') window.renderBcRow = renderBcRow;

function renderFollowupTable() {
  const tableBody = $('followupTableBody');
  if (!tableBody) return;
  const rows = filteredBcRecords();
  const pageSize = Number(state.ui.followupPageSize || 10) || 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.ui.followupPage = Math.min(Math.max(1, state.ui.followupPage || 1), totalPages);
  const startIndex = (state.ui.followupPage - 1) * pageSize;
  const visible = rows.slice(startIndex, startIndex + pageSize);
  tableBody.innerHTML = visible.length ? visible.map(renderBcRow).join('') : `<tr><td colspan="12" class="muted">Aucune ligne de suivi.</td></tr>`;
  renderFollowupPagination(rows.length);
  bindTableActions();
}
if (typeof window !== 'undefined') window.renderFollowupTable = renderFollowupTable;

function openBcEditModal(id) {
  const row = findBcById(id);
  if (!row) return;
  $('editBcId').value = row.id;
  $('editBcRef').value = row.ref || '';
  $('editBcDaRef').value = row.daRef || nextDaRefPreview();
  $('editBcDate').value = row.date || '';
  $('editBcSupplier').value = row.supplierName || '';
  $('editBcAmount').value = row.amountTTC || row.amount || '';
  $('editBcCurrency').value = 'DZD';
  $('editBcType').value = row.type || 'achat';
  $('editBcStatus').value = row.status || 'importe';
  $('editBcDaStatus').value = row.daStatus || 'draft';
  $('editBcPromisedDate').value = row.promisedDate || '';
  $('editBcGoodsDate').value = row.goodsReceivedDate || '';
  $('editBcServiceDate').value = row.serviceDoneDate || '';
  $('editBcRequester').value = row.requester || '';
  if ($('editBcDepartment')) $('editBcDepartment').value = row.department || '';
  $('editBcPaymentTerms').value = row.paymentTerms || '';
  $('editBcDescription').value = row.description || '';
  $('editBcComments').value = row.comments || '';
  $('editBcNotes').value = row.notes || '';
  const stockAlert = $('editBcStockAlert');
  if (stockAlert) {
    const stockInfo = getBcStockIngestionInfo(row);
    if (stockInfo && stockInfo.ingested) {
      stockAlert.innerHTML = `
        <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1rem;grid-column:1/-1;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>
            <strong style="color:#065f46;font-size:0.88rem;">Réception & Intégration Stock Confirmée</strong>
          </div>
          <div style="font-size:0.82rem;color:#047857;margin-bottom:4px;">${escapeHtml(stockInfo.note || 'Ce Bon de Commande a été réceptionné et intégré dans le stock')}</div>
          <div style="font-size:0.78rem;color:#064e3b;display:flex;gap:12px;">
            <span><strong>Date :</strong> ${escapeHtml(stockInfo.date || '—')}</span>
            <span><strong>Article / Lot :</strong> ${escapeHtml(stockInfo.articleRef || '—')}</span>
          </div>
        </div>
      `;
      stockAlert.classList.remove('hidden');
    } else {
      const st = String(row.status || '').toLowerCase();
      if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
        stockAlert.innerHTML = `
          <div style="background:#fff1f2;border:1px solid #f43f5e;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;grid-column:1/-1;">
            <span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>
            <span style="font-size:0.82rem;color:#9f1239;margin-left:6px;">Livraison enregistrée — En attente d'ingestion au stock magasin.</span>
          </div>
        `;
        stockAlert.classList.remove('hidden');
      } else {
        stockAlert.innerHTML = '';
        stockAlert.classList.add('hidden');
      }
    }
  }
  $('bcEditModalBackdrop').classList.remove('hidden');
}
function closeBcEditModal() {
  $('bcEditModalBackdrop').classList.add('hidden');
  $('bcEditForm').reset();
  $('editBcId').value = '';
}
function submitBcEditForm(e) {
  e.preventDefault();
  const existing = findBcById($('editBcId').value);
  if (!existing) return;
  const supplier = ensureSupplier($('editBcSupplier').value.trim());
  const requester = ensureRequester($('editBcRequester').value.trim());
  const date = $('editBcDate').value || existing.date || todayYmd();
  const payload = normalizeBcRecord({
    ...existing,
    ref: canonicalBcRef($('editBcRef').value.trim() || existing.ref, existing.sourceFile, date),
    daRef: canonicalDaRef($('editBcDaRef').value.trim() || existing.daRef || nextDaRefPreview(), date),
    daStatus: $('editBcDaStatus').value,
    daValidatedAt: $('editBcDaStatus').value === 'validated' ? (existing.daValidatedAt || nowIso()) : '',
    date,
    supplierId: supplier?.id || existing.supplierId || null,
    supplierName: supplier?.name || $('editBcSupplier').value.trim(),
    amountTTC: parseFlexibleNumber($('editBcAmount').value),
    amountHT: existing.amountHT || 0,
    type: $('editBcType').value,
    status: $('editBcStatus').value,
    promisedDate: $('editBcPromisedDate').value || addBusinessDays(date, state.settings.procurementDays || 0),
    goodsReceivedDate: $('editBcGoodsDate').value,
    serviceDoneDate: $('editBcServiceDate').value,
    requester: requester?.name || $('editBcRequester').value.trim(),
    paymentTerms: $('editBcPaymentTerms').value.trim(),
    description: $('editBcDescription').value.trim(),
    comments: $('editBcComments').value.trim(),
    notes: $('editBcNotes').value.trim(),
    updatedAt: nowIso(),
  });
  const index = state.bcRecords.findIndex((row) => row.id === payload.id);
  if (index >= 0) state.bcRecords.splice(index, 1, payload);
  bumpBcSequenceFromRef(payload.ref);
  bumpDaSequenceFromRef(payload.daRef);
  saveState();
  fillReferenceLists();
  refreshSelectOptions();
  closeBcEditModal();
  renderApp();
  showToast('BC modifiée.');
}
function validateEditModal() {
  $('editBcDaStatus').value = 'validated';
  submitBcEditForm({ preventDefault() {}, submitter: null });
}
function quickValidateBc(id) {
  const row = findBcById(id);
  if (!row) return;
  row.daRef = row.daRef || nextDaRefPreview();
  row.daStatus = 'validated';
  row.daValidatedAt = nowIso();
  row.updatedAt = nowIso();
  bumpDaSequenceFromRef(row.daRef);
  saveState();
  renderApp();
  showToast('BC et DA validés.');
}
function duplicateBc(id) {
  const row = findBcById(id);
  if (!row) return;
  const copy = normalizeBcRecord({
    ...clone(row),
    id: uid('bc'),
    ref: nextBcRefPreview(),
    daRef: nextDaRefPreview(),
    daStatus: 'draft',
    daValidatedAt: '',
    importedFromBC: false,
    sourceFile: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  state.bcRecords.unshift(copy);
  bumpBcSequenceFromRef(copy.ref);
  bumpDaSequenceFromRef(copy.daRef);
  saveState();
  renderApp();
  showToast('BC dupliquée.');
}
function deleteBc(id) {
  if (!confirm('Supprimer cette ligne BC ?')) return;
  state.bcRecords = state.bcRecords.filter((row) => row.id !== id);
  state.payments = state.payments.filter((row) => row.bcId !== id);
  saveState();
  renderApp();
  showToast('Ligne BC supprimée.');
}
function preparePaymentForBc(id) {
  const row = findBcById(id);
  if (!row) return;
  setActiveTab('payments');
  resetPaymentForm();
  $('paymentBcId').value = row.id;
  $('paymentAmount').value = row.amountTTC || row.amount || '';
  $('paymentNotes').value = row.comments || '';
  $('paymentRef').focus();
}

function resetPaymentForm() {
  if ($('paymentForm')) $('paymentForm').reset();
  if ($('paymentId')) $('paymentId').value = '';
  if ($('paymentRequestDate')) $('paymentRequestDate').value = todayYmd();
  if ($('paymentStatus')) $('paymentStatus').value = 'programme';
  if ($('paymentMode')) $('paymentMode').value = 'virement';
}
function submitPaymentForm(e) {
  e.preventDefault();
  const existing = findPaymentById($('paymentId').value);
  const bc = findBcById($('paymentBcId').value);
  const payload = normalizePayment({
    ...(existing || {}),
    id: existing?.id || $('paymentId').value || uid('pay'),
    bcId: $('paymentBcId').value,
    paymentRef: $('paymentRef').value.trim(),
    requestDate: $('paymentRequestDate').value,
    paidDate: $('paymentPaidDate').value,
    amount: parseFlexibleNumber($('paymentAmount').value || bc?.amountTTC || 0),
    mode: $('paymentMode').value,
    transactionRef: $('paymentTransactionRef').value.trim(),
    status: $('paymentStatus').value,
    notes: $('paymentNotes').value.trim(),
    updatedAt: nowIso(),
  });
  if (!payload.bcId) return showToast('Choisissez une BC.');
  const idx = state.payments.findIndex((row) => row.id === payload.id);
  if (idx >= 0) state.payments.splice(idx, 1, payload);
  else state.payments.unshift(payload);
  saveState();
  resetPaymentForm();
  renderApp();
  showToast('Paiement enregistré.');
}
function filteredPayments() {
  const q = normalizeText($('paymentSearch').value || '');
  const status = $('paymentFilterStatus').value;
  return state.payments.filter((row) => {
    if (status !== 'all' && row.status !== status) return false;
    if (!q) return true;
    const bc = findBcById(row.bcId);
    const hay = normalizeText([row.paymentRef, row.transactionRef, row.notes, bc?.ref, bc?.supplierName].join(' | '));
    return hay.includes(q);
  }).sort((a, b) => String(b.requestDate || '').localeCompare(String(a.requestDate || '')));
}
function renderPaymentsTable() {
  const tbody = $('paymentsTableBody');
  if (!tbody) return;
  const rows = filteredPayments();
  tbody.innerHTML = rows.length ? rows.map((row) => {
    const bc = findBcById(row.bcId);
    const delay = row.requestDate && (row.paidDate || todayYmd()) ? businessDaysBetween(row.requestDate, row.paidDate || todayYmd()) : null;
    const tone = row.status === 'paye' ? 'ok' : (delay != null && delay > (state.settings.financeDays || 0) ? 'late' : 'warn');
    const label = row.status === 'paye' ? `Payé · ${delay ?? 0} j` : `${delay ?? 0} j`;
    return `<tr>
      <td>${escapeHtml(row.paymentRef || '—')}</td>
      <td>${escapeHtml(bc?.ref || '—')}</td>
      <td>${escapeHtml(bc?.supplierName || '—')}</td>
      <td>${escapeHtml(formatDate(row.requestDate))}</td>
      <td>${escapeHtml(formatDate(row.paidDate))}</td>
      <td>${escapeHtml(formatMoney(row.amount, 'DZD'))}</td>
      <td>${escapeHtml(row.mode || '—')}</td>
      <td>${escapeHtml(row.transactionRef || '—')}</td>
      <td><span class="delay-pill ${tone}">${escapeHtml(label)}</span></td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-payment', row.id, 'Modifier paiement')}${iconActionButton('delete', 'delete-payment', row.id, 'Supprimer paiement')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="10" class="muted">Aucun paiement.</td></tr>`;
  bindTableActions();
}
if (typeof window !== 'undefined') window.renderPaymentsTable = renderPaymentsTable;
function editPayment(id) {
  const row = findPaymentById(id);
  if (!row) return;
  const card = $('paymentFormCard');
  if (card) card.style.display = 'block';
  $('paymentId').value = row.id;
  $('paymentBcId').value = row.bcId;
  $('paymentRef').value = row.paymentRef || '';
  $('paymentRequestDate').value = row.requestDate || '';
  $('paymentPaidDate').value = row.paidDate || '';
  $('paymentAmount').value = row.amount || '';
  $('paymentMode').value = row.mode || 'virement';
  $('paymentTransactionRef').value = row.transactionRef || '';
  $('paymentStatus').value = row.status || 'programme';
  $('paymentNotes').value = row.notes || '';
  setActiveTab('payments');
  if (card) card.scrollIntoView({ behavior: 'smooth' });
}
function deletePayment(id) {
  if (!confirm('Supprimer ce paiement ?')) return;
  state.payments = state.payments.filter((row) => row.id !== id);
  saveState();
  renderApp();
  showToast('Paiement supprimé.');
}

function resetStockItemForm() {
  if (!$('stockItemForm')) return;
  $('stockItemForm').reset();
  if ($('stockItemId')) $('stockItemId').value = '';
  if ($('stockUnit')) $('stockUnit').value = 'U';
}
function submitStockItemForm(e) {
  e.preventDefault();
  if (!$('stockItemForm')) return;
  const existing = findStockItemById($('stockItemId').value);
  const payload = normalizeStockItem({
    ...(existing || {}),
    id: existing?.id || $('stockItemId').value || uid('stk'),
    code: $('stockCode').value.trim(),
    name: $('stockName').value.trim(),
    category: $('stockCategory').value.trim(),
    qty: parseFlexibleNumber($('stockQty').value),
    minQty: parseFlexibleNumber($('stockMinQty').value),
    unit: $('stockUnit').value.trim() || 'U',
    location: $('stockLocation').value.trim(),
    supplierName: $('stockSupplier').value.trim(),
    notes: $('stockNotes').value.trim(),
    updatedAt: nowIso(),
  });
  if (!payload.name) return showToast('Désignation article requise.');
  const idx = state.stockItems.findIndex((row) => row.id === payload.id);
  if (idx >= 0) state.stockItems.splice(idx, 1, payload);
  else state.stockItems.unshift(payload);
  if (payload.supplierName) ensureSupplier(payload.supplierName);
  saveState();
  resetStockItemForm();
  renderApp();
  showToast('Article stock enregistré.');
}
function resetStockLogForm() {
  if (!$('stockLogForm')) return;
  $('stockLogForm').reset();
  if ($('stockLogId')) $('stockLogId').value = '';
  if ($('stockLogDate')) $('stockLogDate').value = todayYmd();
  if ($('stockLogType')) $('stockLogType').value = 'out';
}
function submitStockLogForm(e) {
  e.preventDefault();
  const existing = state.stockLogs.find((row) => row.id === $('stockLogId').value);
  const item = findStockItemById($('stockLogItemId').value);
  if (!item) return showToast('Choisissez un article.');
  const qty = parseFlexibleNumber($('stockLogQty').value);
  if (!qty) return showToast('Quantité requise.');
  if (existing) {
    const oldItem = findStockItemById(existing.itemId);
    if (oldItem) oldItem.qty += existing.type === 'out' ? existing.qty : -existing.qty;
  }
  const payload = normalizeStockLog({
    ...(existing || {}),
    id: existing?.id || $('stockLogId').value || uid('stlog'),
    itemId: item.id,
    type: $('stockLogType').value,
    qty,
    date: $('stockLogDate').value || todayYmd(),
    person: $('stockLogPerson').value.trim(),
    department: $('stockLogDepartment').value.trim(),
    notes: $('stockLogNotes').value.trim(),
    updatedAt: nowIso(),
  });
  item.qty += payload.type === 'out' ? -qty : qty;
  item.updatedAt = nowIso();
  const idx = state.stockLogs.findIndex((row) => row.id === payload.id);
  if (idx >= 0) state.stockLogs.splice(idx, 1, payload);
  else state.stockLogs.unshift(payload);
  if (payload.person) ensureRequester(payload.person);
  saveState();
  resetStockLogForm();
  renderApp();
  showToast('Mouvement stock enregistré.');
}
function renderStockTables() {
  if (!$('stockItemsTableBody') || !$('stockLogsTableBody')) return;
  $('stockItemsTableBody').innerHTML = state.stockItems.length ? state.stockItems.slice().sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
    const tone = item.qty <= 0 ? 'late' : item.qty <= item.minQty ? 'warn' : 'ok';
    const label = item.qty <= 0 ? 'Rupture' : item.qty <= item.minQty ? 'Faible' : 'OK';
    return `<tr>
      <td>${escapeHtml(item.code || '—')}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category || '—')}</td>
      <td>${escapeHtml(formatCompact(item.qty))} ${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(formatCompact(item.minQty))}</td>
      <td>${escapeHtml(item.location || '—')}</td>
      <td>${escapeHtml(item.supplierName || '—')}</td>
      <td><span class="alert-pill ${tone}">${escapeHtml(label)}</span></td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-stock', item.id, 'Modifier article')}${iconActionButton('clone', 'log-stock', item.id, 'Nouveau mouvement')}${iconActionButton('delete', 'delete-stock', item.id, 'Supprimer article')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="9" class="muted">Aucun article stock.</td></tr>`;
  $('stockLogsTableBody').innerHTML = state.stockLogs.length ? state.stockLogs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((log) => {
    const item = findStockItemById(log.itemId);
    return `<tr>
      <td>${escapeHtml(formatDate(log.date))}</td>
      <td><span class="status-pill ${log.type === 'out' ? 'warn' : 'ok'}">${log.type === 'out' ? 'Sortie' : 'Entrée'}</span></td>
      <td>${escapeHtml(item?.name || 'Article supprimé')}<span class="table-subline">${escapeHtml(item?.code || '')}</span></td>
      <td>${escapeHtml(String(log.qty))}</td>
      <td>${escapeHtml(log.person || '—')}</td>
      <td>${escapeHtml(log.department || '—')}</td>
      <td>${escapeHtml(log.notes || '—')}</td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-stock-log', log.id, 'Modifier mouvement')}${iconActionButton('delete', 'delete-stock-log', log.id, 'Supprimer mouvement')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" class="muted">Aucun mouvement stock.</td></tr>`;
  bindTableActions();
}
function editStockItem(id) {
  const item = findStockItemById(id); if (!item) return;
  setActiveTab('stock');
  $('stockItemId').value = item.id;
  $('stockCode').value = item.code || '';
  $('stockName').value = item.name || '';
  $('stockCategory').value = item.category || '';
  $('stockQty').value = item.qty || '';
  $('stockMinQty').value = item.minQty || '';
  $('stockUnit').value = item.unit || 'U';
  $('stockLocation').value = item.location || '';
  $('stockSupplier').value = item.supplierName || '';
  $('stockNotes').value = item.notes || '';
}
function deleteStockItem(id) {
  if (!confirm('Supprimer cet article stock ?')) return;
  state.stockItems = state.stockItems.filter((row) => row.id !== id);
  state.stockLogs = state.stockLogs.filter((row) => row.itemId !== id);
  saveState();
  renderApp();
  showToast('Article stock supprimé.');
}
function prepareStockLog(id) {
  const item = findStockItemById(id); if (!item) return;
  setActiveTab('stock');
  resetStockLogForm();
  $('stockLogItemId').value = item.id;
}
function editStockLog(id) {
  const log = state.stockLogs.find((row) => row.id === id); if (!log) return;
  setActiveTab('stock');
  $('stockLogId').value = log.id;
  $('stockLogItemId').value = log.itemId || '';
  $('stockLogType').value = log.type || 'out';
  $('stockLogQty').value = log.qty || '';
  $('stockLogDate').value = log.date || '';
  $('stockLogPerson').value = log.person || '';
  $('stockLogDepartment').value = log.department || '';
  $('stockLogNotes').value = log.notes || '';
}
function deleteStockLog(id) {
  if (!confirm('Supprimer ce mouvement ?')) return;
  const log = state.stockLogs.find((row) => row.id === id);
  const item = log ? findStockItemById(log.itemId) : null;
  if (log && item) {
    item.qty += log.type === 'out' ? log.qty : -log.qty;
    item.updatedAt = nowIso();
  }
  state.stockLogs = state.stockLogs.filter((row) => row.id !== id);
  saveState();
  renderApp();
  showToast('Mouvement supprimé.');
}

function computeKpis() {
  const totalBC = state.bcRecords.length;
  const totalAmount = state.bcRecords.reduce((sum, row) => sum + Number(row.amountTTC || row.amount || 0), 0);
  const validatedCount = state.bcRecords.filter((row) => row.daStatus === 'validated').length;
  const draftCount = totalBC - validatedCount;
  const lateCount = state.bcRecords.filter((row) => computeDelay(row).cls === 'late').length;
  const purchaseCount = state.bcRecords.filter((row) => row.type !== 'service').length;
  const serviceCount = totalBC - purchaseCount;
  const pendingPayments = state.payments.filter((row) => row.status !== 'paye').length;
  const pendingAmount = state.payments.filter((row) => row.status !== 'paye').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const financeClosed = state.payments.filter((row) => row.requestDate && row.paidDate);
  const avgFinanceDelay = financeClosed.length ? Math.round(financeClosed.reduce((sum, row) => sum + Math.max(0, businessDaysBetween(row.requestDate, row.paidDate) || 0), 0) / financeClosed.length) : 0;
  const stockLow = state.stockItems.filter((row) => row.qty <= row.minQty).length;
  return { totalBC, totalAmount, validatedCount, draftCount, lateCount, purchaseCount, serviceCount, pendingPayments, pendingAmount, avgFinanceDelay, stockLow };
}
function buildChartSpecs() {
  const byMonth = {};
  const supplierSpend = {};
  const statusCount = {};
  const validationCount = { 'Validé': 0, 'À vérifier': 0 };
  const paymentByMonth = {};
  const stockLevels = { OK: 0, Faible: 0, Rupture: 0 };
  const delayBuckets = { 'À temps': 0, '1-2 j': 0, '3-5 j': 0, '6 j+': 0 };
  for (const row of state.bcRecords) {
    const month = (row.date || 'Sans date').slice(0, 7) || 'Sans date';
    byMonth[month] = (byMonth[month] || 0) + Number(row.amountTTC || row.amount || 0);
    supplierSpend[row.supplierName || 'Sans fournisseur'] = (supplierSpend[row.supplierName || 'Sans fournisseur'] || 0) + Number(row.amountTTC || row.amount || 0);
    statusCount[statusLabel(row.status)] = (statusCount[statusLabel(row.status)] || 0) + 1;
    validationCount[row.daStatus === 'validated' ? 'Validé' : 'À vérifier'] += 1;
    const delay = computeDelay(row);
    if (delay.cls !== 'late' && delay.cls !== 'warn') delayBuckets['À temps'] += 1;
    else {
      const value = parseFlexibleNumber(delay.label);
      if (value <= 2) delayBuckets['1-2 j'] += 1;
      else if (value <= 5) delayBuckets['3-5 j'] += 1;
      else delayBuckets['6 j+'] += 1;
    }
  }
  for (const row of state.payments) {
    const month = (row.requestDate || 'Sans date').slice(0, 7) || 'Sans date';
    paymentByMonth[month] = (paymentByMonth[month] || 0) + Number(row.amount || 0);
  }
  for (const item of state.stockItems) {
    if (item.qty <= 0) stockLevels.Rupture += 1;
    else if (item.qty <= item.minQty) stockLevels.Faible += 1;
    else stockLevels.OK += 1;
  }
  return {
    monthlyBc: { key: 'monthlyBc', title: 'Montant BC par mois', subtitle: 'Somme TTC', type: 'bar', headers: ['Mois', 'Montant'], rows: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])) },
    supplierTop: { key: 'supplierTop', title: 'Top fournisseurs', subtitle: 'Dépense TTC', type: 'hbar', headers: ['Fournisseur', 'Montant'], rows: Object.entries(supplierSpend).sort((a, b) => b[1] - a[1]).slice(0, 8) },
    statusBc: { key: 'statusBc', title: 'Répartition statuts BC', subtitle: 'Nombre de lignes', type: 'donut', headers: ['Statut', 'Nombre'], rows: Object.entries(statusCount) },
    validationDa: { key: 'validationDa', title: 'Validation BC → DA', subtitle: 'Suivi DA', type: 'donut', headers: ['Validation', 'Nombre'], rows: Object.entries(validationCount) },
    paymentFlow: { key: 'paymentFlow', title: 'Demandes de paiement par mois', subtitle: 'Montant demandé', type: 'line', headers: ['Mois', 'Montant'], rows: Object.entries(paymentByMonth).sort((a, b) => a[0].localeCompare(b[0])) },
    deliveryDelay: { key: 'deliveryDelay', title: 'Répartition des délais', subtitle: 'Dossiers BC', type: 'bar', headers: ['Classe', 'Nombre'], rows: Object.entries(delayBuckets) },
    stockAlert: { key: 'stockAlert', title: 'Niveaux stock', subtitle: 'Etat du magasin', type: 'bar', headers: ['Niveau', 'Nombre'], rows: Object.entries(stockLevels) },
  };
}
function renderKpi() {
  const kpi = computeKpis();
  $('kpiGrid').innerHTML = [
    { tone: 'primary', label: 'BC suivies', value: kpi.totalBC, hint: `${kpi.validatedCount} validées · ${kpi.draftCount} à vérifier` },
    { tone: 'primary', label: 'Montant total TTC', value: formatMoney(kpi.totalAmount), hint: `${kpi.purchaseCount} achats · ${kpi.serviceCount} services` },
    { tone: kpi.lateCount ? 'danger' : 'success', label: 'BC en retard', value: kpi.lateCount, hint: 'calcul basé sur la date promise' },
    { tone: kpi.pendingPayments ? 'warn' : 'success', label: 'Paiements ouverts', value: formatMoney(kpi.pendingAmount), hint: `${kpi.pendingPayments} demande(s) à traiter` },
    { tone: 'info', label: 'Délai finance moyen', value: `${kpi.avgFinanceDelay} j`, hint: `objectif ${state.settings.financeDays || 0} j ouvrables` },
    { tone: kpi.stockLow ? 'warn' : 'success', label: 'Alertes stock', value: kpi.stockLow, hint: `${state.stockItems.length} article(s) suivis` },
  ].map((card) => `<div class="kpi-card ${card.tone}"><div class="label">${escapeHtml(card.label)}</div><div class="value">${escapeHtml(String(card.value))}</div><div class="hint">${escapeHtml(card.hint)}</div></div>`).join('');

  const attention = [];
  state.bcRecords.filter((row) => computeDelay(row).cls === 'late').slice(0, 6).forEach((row) => {
    const delay = computeDelay(row);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.ref)} — ${escapeHtml(row.supplierName || 'Sans fournisseur')}</strong><span>${escapeHtml(delay.label)} · date promise ${escapeHtml(formatDate(row.promisedDate))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(row.comments || 'Sans justification')}</span></div></div>`);
  });
  state.payments.filter((row) => row.status !== 'paye').slice(0, 4).forEach((row) => {
    const bc = findBcById(row.bcId);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.paymentRef || 'Demande paiement')}</strong><span>${escapeHtml(bc?.supplierName || 'Sans fournisseur')} · ${escapeHtml(formatMoney(row.amount || 0, 'DZD'))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(formatDate(row.requestDate))}</span></div></div>`);
  });
  $('focusList').innerHTML = attention.length ? attention.join('') : '<div class="focus-item"><strong>RAS</strong><span>Aucun point critique en ce moment.</span></div>';

  $('summaryList').innerHTML = [
    { title: 'BC importées', text: `${state.bcRecords.filter((row) => row.importedFromBC).length} fichier(s) injecté(s)` },
    { title: 'Prochaine réf BC', text: nextBcRefPreview() },
    { title: 'Prochaine réf DA', text: nextDaRefPreview() },
    { title: 'Jours non ouvrables', text: (state.settings.weekendDays || []).map((day) => ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][day]).join(', ') || 'Aucun' },
  ].map((row) => `<div class="summary-item"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.text)}</span></div>`).join('');

  renderCharts();
}
if (typeof window !== 'undefined') window.renderKpi = renderKpi;

function palette() {
  const isDark = document.body && document.body.dataset && document.body.dataset.theme === 'dark';
  return {
    isDark,
    text: isDark ? '#f8fafc' : '#0f172a',
    muted: isDark ? '#94a3b8' : '#64748b',
    line: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(226, 232, 240, 0.85)',
    surface: isDark ? '#111e38' : '#ffffff',
    primary: isDark ? '#38bdf8' : '#2563eb',
    track: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.9)',
    gradients: [
      ['#2563eb', '#38bdf8'],
      ['#7c3aed', '#a78bfa'],
      ['#059669', '#34d399'],
      ['#d97706', '#fbbf24'],
      ['#e11d48', '#fb7185'],
      ['#0891b2', '#22d3ee'],
      ['#4f46e5', '#818cf8'],
      ['#ea580c', '#f97316']
    ],
    list: [
      '#2563eb', '#7c3aed', '#059669', '#d97706', '#e11d48', '#0891b2', '#4f46e5', '#ea580c'
    ]
  };
}
function renderCharts() {
  state.chartSpecs = buildChartSpecs();
  const container = $('dashboardCharts');
  container.innerHTML = Object.values(state.chartSpecs).map((spec) => `
    <article class="chart-card">
      <div class="chart-head">
        <div><h3>${escapeHtml(spec.title)}</h3><p class="chart-subtitle">${escapeHtml(spec.subtitle)}</p></div>
        <div class="chart-meta">Survol = détail · double-clic = agrandir</div>
      </div>
      <div class="chart-canvas-wrap" style="position:relative;">
        <canvas id="chart_${spec.key}" data-chart-key="${spec.key}"></canvas>
        <div class="chart-tooltip" id="tooltip_${spec.key}"></div>
      </div>
    </article>`).join('');
  Object.values(state.chartSpecs).forEach((spec) => mountChart(spec, `chart_${spec.key}`, `tooltip_${spec.key}`));
}
function mountChart(spec, canvasId, tooltipId) {
  const canvas = $(canvasId);
  const tooltip = $(tooltipId);
  if (!canvas) return;
  const isModal = Boolean(canvas.closest('#chartModalBackdrop'));
  canvas.style.width = '100%';
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const width = (parentW > 0 ? parentW : canvas.clientWidth) || (isModal ? 980 : 540);
  const height = isModal ? 500 : 310;
  const ratio = Math.max(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const regions = drawChart(canvas, ctx, spec);
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = regions.find((r) => r.hit(x, y));
    if (!hit) {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translate(-9999px,-9999px)';
      return;
    }
    tooltip.style.opacity = '1';
    tooltip.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hit.color || '#38bdf8'};"></span><strong style="font-weight:700;">${escapeHtml(hit.title)}</strong></div><div style="font-weight:800;font-size:13px;color:${hit.color || '#38bdf8'};">${escapeHtml(hit.value)}</div>`;
    tooltip.style.transform = `translate(${Math.min(x + 14, rect.width - 160)}px, ${Math.max(10, y - 25)}px)`;
  };
  canvas.onmouseleave = () => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translate(-9999px,-9999px)';
  };
  canvas.ondblclick = () => openChartModal(spec.key);
}
function drawChart(canvas, ctx, spec) {
  const colors = palette();
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 320;
  const rows = spec.rows || [];
  const regions = [];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, w, h);
  if (!rows.length) {
    ctx.fillStyle = colors.muted;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText('Aucune donnée à afficher pour cette période', 24, 36);
    return regions;
  }
  const left = spec.type === 'hbar' ? 180 : 58;
  const right = 24;
  const top = 22;
  const bottom = spec.type === 'donut' ? 24 : 58;
  const innerW = w - left - right;
  const innerH = h - top - bottom;
  const max = Math.max(...rows.map((row) => Number(row[1] || 0)), 1);

  if (spec.type === 'bar' || spec.type === 'line') {
    // Elegant dashed grid lines
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = top + (innerH / 4) * i;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
      const val = max - (max / 4) * i;
      ctx.fillStyle = colors.muted;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatCompact(val), left - 10, y + 4);
    }
    ctx.restore();

    if (spec.type === 'bar') {
      const slot = innerW / rows.length;
      rows.forEach((row, idx) => {
        const value = Number(row[1] || 0);
        const barW = Math.max(16, Math.min(42, slot - 14));
        const x = left + slot * idx + (slot - barW) / 2;
        const barH = Math.max(2, (value / max) * innerH);
        const y = top + innerH - barH;
        const gradPair = colors.gradients[idx % colors.gradients.length];
        const barGrad = ctx.createLinearGradient(0, y, 0, y + barH);
        barGrad.addColorStop(0, gradPair[1]);
        barGrad.addColorStop(1, gradPair[0]);
        ctx.fillStyle = barGrad;
        roundRectTop(ctx, x, y, barW, barH, 6);
        ctx.fill();
        ctx.fillStyle = colors.muted;
        ctx.font = '500 11px Inter, sans-serif';
        ctx.save();
        ctx.translate(x + barW / 2, h - 16);
        ctx.rotate(-0.32);
        ctx.textAlign = 'right';
        ctx.fillText(String(row[0]).slice(0, 16), 0, 0);
        ctx.restore();
        regions.push({ title: String(row[0]), value: formatMoney(value, 'DZD'), color: gradPair[0], hit: (mx, my) => mx >= x && mx <= x + barW && my >= y && my <= y + barH });
      });
    } else {
      // Area fill underneath
      const gradFill = ctx.createLinearGradient(0, top, 0, top + innerH);
      gradFill.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      gradFill.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
      ctx.fillStyle = gradFill;
      ctx.beginPath();
      rows.forEach((row, idx) => {
        const value = Number(row[1] || 0);
        const x = left + (innerW / Math.max(rows.length - 1, 1)) * idx;
        const y = top + innerH - (value / max) * innerH;
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(left + innerW, top + innerH);
      ctx.lineTo(left, top + innerH);
      ctx.closePath();
      ctx.fill();

      // Stroke line
      const lineGrad = ctx.createLinearGradient(left, 0, left + innerW, 0);
      lineGrad.addColorStop(0, colors.gradients[0][0]);
      lineGrad.addColorStop(1, colors.gradients[0][1]);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      rows.forEach((row, idx) => {
        const value = Number(row[1] || 0);
        const x = left + (innerW / Math.max(rows.length - 1, 1)) * idx;
        const y = top + innerH - (value / max) * innerH;
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Data nodes with white center and glowing border
      rows.forEach((row, idx) => {
        const value = Number(row[1] || 0);
        const x = left + (innerW / Math.max(rows.length - 1, 1)) * idx;
        const y = top + innerH - (value / max) * innerH;
        ctx.fillStyle = colors.surface;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors.primary; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = colors.muted;
        ctx.font = '500 11px Inter, sans-serif';
        ctx.save();
        ctx.translate(x, h - 16);
        ctx.rotate(-0.32);
        ctx.textAlign = 'right';
        ctx.fillText(String(row[0]).slice(0, 16), 0, 0);
        ctx.restore();
        regions.push({ title: String(row[0]), value: formatMoney(value, 'DZD'), color: colors.primary, hit: (mx, my) => Math.hypot(mx - x, my - y) <= 14 });
      });
    }
  } else if (spec.type === 'hbar') {
    const rowH = Math.max(26, Math.min(32, innerH / rows.length));
    rows.forEach((row, idx) => {
      const value = Number(row[1] || 0);
      const y = top + idx * rowH;
      const barH = 16;
      const width = Math.max(4, (value / max) * innerW);
      // Background subtle track
      ctx.fillStyle = colors.track;
      roundRect(ctx, left, y + 2, innerW, barH, 8, true, false);
      // Gradient bar
      const gradPair = colors.gradients[idx % colors.gradients.length];
      const hGrad = ctx.createLinearGradient(left, 0, left + width, 0);
      hGrad.addColorStop(0, gradPair[0]);
      hGrad.addColorStop(1, gradPair[1]);
      ctx.fillStyle = hGrad;
      roundRect(ctx, left, y + 2, width, barH, 8, true, false);
      // Label on the left
      ctx.fillStyle = colors.text;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(row[0]).slice(0, 24), 8, y + 14);
      // Value on the right
      ctx.fillStyle = colors.muted;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatMoney(value, 'DZD'), w - right, y + 14);
      regions.push({ title: String(row[0]), value: formatMoney(value, 'DZD'), color: gradPair[0], hit: (mx, my) => mx >= left && mx <= left + width && my >= y && my <= y + barH + 4 });
    });
  } else if (spec.type === 'donut') {
    const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0) || 1;
    const cx = w * 0.30;
    const cy = h * 0.50;
    const radius = Math.min(w, h) * 0.32;
    const innerRadius = radius * 0.65;
    let current = -Math.PI / 2;

    rows.forEach((row, idx) => {
      const value = Number(row[1] || 0);
      const angle = (value / total) * Math.PI * 2;
      const gradPair = colors.gradients[idx % colors.gradients.length];
      ctx.strokeStyle = gradPair[0];
      ctx.lineWidth = radius - innerRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, (radius + innerRadius) / 2, current, current + angle);
      ctx.stroke();
      const start = current;
      const end = current + angle;
      regions.push({
        title: String(row[0]),
        value: `${formatCompact(value)} (${Math.round((value / total) * 100)}%)`,
        color: gradPair[0],
        hit: (mx, my) => {
          const dist = Math.hypot(mx - cx, my - cy);
          if (dist < innerRadius - 4 || dist > radius + 4) return false;
          let ang = Math.atan2(my - cy, mx - cx);
          if (ang < -Math.PI / 2) ang += Math.PI * 2;
          let s = start, e = end;
          if (s < -Math.PI / 2) s += Math.PI * 2;
          if (e < -Math.PI / 2) e += Math.PI * 2;
          if (e < s) e += Math.PI * 2;
          if (ang < s) ang += Math.PI * 2;
          return ang >= s && ang <= e;
        }
      });
      current += angle;
    });

    // Center disc with summary text
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center summary label & value
    ctx.fillStyle = colors.muted;
    ctx.font = '700 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOTAL', cx, cy - 6);
    ctx.fillStyle = colors.text;
    ctx.font = '800 17px Sora, Inter, sans-serif';
    ctx.fillText(formatCompact(total), cx, cy + 14);

    // Legend on the right
    ctx.textAlign = 'left';
    const legendLeft = w * 0.54;
    rows.forEach((row, idx) => {
      const value = Number(row[1] || 0);
      const pct = Math.round((value / total) * 100);
      const y = 38 + idx * 24;
      const gradPair = colors.gradients[idx % colors.gradients.length];
      ctx.fillStyle = gradPair[0];
      ctx.beginPath();
      ctx.arc(legendLeft + 5, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(String(row[0]).slice(0, 20), legendLeft + 16, y);
      ctx.fillStyle = colors.muted;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(`${formatCompact(value)} (${pct}%)`, legendLeft + 140, y);
    });
  }
  return regions;
}

function roundRectTop(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height);
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (width <= 0 || height <= 0) return;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function openChartModal(key) {
  const spec = state.chartSpecs[key];
  if (!spec) return;
  state.chartModalKey = key;
  $('chartModalTitle').textContent = spec.title;
  $('chartModalSubtitle').textContent = spec.subtitle;
  $('chartModalBackdrop').classList.remove('hidden');
  const canvas = $('chartModalCanvas');
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.floor((canvas.clientWidth || 1000) * ratio);
  canvas.height = Math.floor((canvas.clientHeight || 520) * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawChart(canvas, ctx, spec);
}
function closeChartModal() {
  $('chartModalBackdrop').classList.add('hidden');
  state.chartModalKey = null;
}

function normalizeWorkbookCell(value) {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYmd(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.map((entry) => normalizeWorkbookCell(entry)).join(' | ');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value).replace(/ /g, ' ').trim();
}
function normalizeWorkbookRow(row) {
  if (Array.isArray(row)) return row.map((cell) => normalizeWorkbookCell(cell));
  return [normalizeWorkbookCell(row)];
}
function aoaFromRows(headers, rows) {
  const safeHeaders = normalizeWorkbookRow(Array.isArray(headers) ? headers : [headers]);
  const safeRows = Array.isArray(rows) ? rows.map((row) => normalizeWorkbookRow(row)) : [];
  return [safeHeaders, ...safeRows];
}
function normalizeWorkbookSheets(sheets) {
  return (Array.isArray(sheets) ? sheets : []).map((sheet, index) => {
    const name = sanitizeSheetName(sheet?.name || `Feuille_${index + 1}`);
    const headers = Array.isArray(sheet?.headers) ? sheet.headers : [];
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    return { ...sheet, name, headers, rows, aoa: aoaFromRows(headers, rows) };
  });
}
function estimateSheetColumns(aoa) {
  const widths = [];
  (Array.isArray(aoa) ? aoa : []).forEach((row) => {
    (Array.isArray(row) ? row : []).forEach((cell, idx) => {
      const length = String(normalizeWorkbookCell(cell) ?? '').length;
      widths[idx] = Math.max(widths[idx] || 0, Math.min(60, Math.max(8, length + 2)));
    });
  });
  return widths.map((wch) => ({ wch: Math.min(40, Math.max(10, wch || 10)) }));
}
function spreadsheetXmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function spreadsheetXmlCell(value, styleId = '') {
  const normalized = normalizeWorkbookCell(value);
  const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
  if (normalized === '') return '<Cell/>';
  if (typeof normalized === 'number') return `<Cell${styleAttr}><Data ss:Type="Number">${normalized}</Data></Cell>`;
  if (typeof normalized === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `<Cell ss:StyleID="sDate"><Data ss:Type="DateTime">${normalized}T00:00:00.000</Data></Cell>`;
  return `<Cell${styleAttr}><Data ss:Type="String">${spreadsheetXmlEscape(normalized)}</Data></Cell>`;
}
function buildSpreadsheetXml(sheets) {
  const normalizedSheets = normalizeWorkbookSheets(sheets);
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Borders/><Font/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="sHeader"><Font ss:Bold="1"/></Style><Style ss:ID="sDate"><NumberFormat ss:Format="yyyy\-mm\-dd"/></Style></Styles>${normalizedSheets.map((sheet) => {
    const aoa = sheet.aoa || aoaFromRows(sheet.headers, sheet.rows);
    const colCount = Math.max(1, ...aoa.map((row) => row.length || 0));
    const rowCount = Math.max(1, aoa.length || 0);
    const columns = estimateSheetColumns(aoa).map((col) => `<Column ss:AutoFitWidth="0" ss:Width="${Math.min(320, Math.max(76, (Number(col.wch || 10) * 7)))}"/>`).join('');
    const rowsXml = aoa.map((row, rowIndex) => `<Row>${row.map((cell) => spreadsheetXmlCell(cell, rowIndex === 0 ? 'sHeader' : '')).join('')}</Row>`).join('');
    return `<Worksheet ss:Name="${spreadsheetXmlEscape(sheet.name)}"><Table ss:ExpandedColumnCount="${colCount}" ss:ExpandedRowCount="${rowCount}" x:FullColumns="1" x:FullRows="1">${columns}${rowsXml}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><Panes><Pane><Number>3</Number></Pane></Panes><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet>`;
  }).join('')}</Workbook>`;
}
function exportWorkbook(filename, sheets) {
  const normalizedSheets = normalizeWorkbookSheets(sheets);
  if (!normalizedSheets.length) {
    showToast('Aucune donnée à exporter.');
    return;
  }
  const cleanFilename = String(filename || 'export.xlsx').trim();
  const xlsxName = /\.xlsx$/i.test(cleanFilename) ? cleanFilename : `${cleanFilename.replace(/\.xls$/i, '')}.xlsx`;
  if (typeof XLSX !== 'undefined' && XLSX?.utils?.book_new && XLSX?.write) {
    try {
      const wb = XLSX.utils.book_new();
      normalizedSheets.forEach((sheet) => {
        const ws = XLSX.utils.aoa_to_sheet(sheet.aoa);
        const rowCount = sheet.aoa.length;
        const colCount = Math.max(0, ...sheet.aoa.map((row) => row.length || 0));
        if (colCount > 0) ws['!cols'] = estimateSheetColumns(sheet.aoa);
        if (rowCount > 1 && colCount > 0 && XLSX.utils.encode_range) {
          ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } }) };
        }
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      const workbookBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
      downloadBlob(new Blob([workbookBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), xlsxName);
      return;
    } catch (err) {
      console.warn('XLSX export failed, fallback XML workbook will be used.', err);
    }
  }
  const fallbackName = xlsxName.replace(/\.xlsx$/i, '.xls');
  downloadBlob(new Blob([buildSpreadsheetXml(normalizedSheets)], { type: 'application/vnd.ms-excel;charset=utf-8' }), fallbackName);
}
function exportSingleDataset(spec) {
  if (!spec) return;
  exportWorkbook(`${slugify(spec.title)}_${todayYmd()}.xlsx`, [{ name: spec.title, headers: spec.headers, rows: spec.rows }]);
  showToast('Jeu de données exporté.');
}
function exportKpiWorkbook() {
  const kpi = computeKpis();
  exportWorkbook(`kpi_${todayYmd()}.xlsx`, [{ name: 'KPI', headers: ['Indicateur', 'Valeur'], rows: [
    ['BC suivies', kpi.totalBC], ['Montant total', kpi.totalAmount], ['BC validées', kpi.validatedCount], ['BC à vérifier', kpi.draftCount], ['BC en retard', kpi.lateCount], ['Paiements ouverts', kpi.pendingPayments], ['Montant en attente', kpi.pendingAmount], ['Délai finance moyen', kpi.avgFinanceDelay], ['Alertes stock', kpi.stockLow]
  ] }]);
  showToast('KPI exportés.');
}
function exportFollowupWorkbook() {
  exportWorkbook(`suivi_bc_${todayYmd()}.xlsx`, [{ name: 'Suivi_BC', headers: ['Réf BC', 'Réf DA', 'Validation DA', 'Date BC', 'Fournisseur', 'Type', 'Montant TTC', 'Statut BC', 'Date promise', 'Date réception', 'Date service', 'Demandeur', 'Conditions paiement', 'Commentaire', 'Notes', 'Source'], rows: filteredBcRecords().map((row) => [row.ref, row.daRef, validationLabel(row), row.date, row.supplierName, row.type, row.amountTTC || row.amount, statusLabel(row.status), row.promisedDate, row.goodsReceivedDate, row.serviceDoneDate, row.requester, row.paymentTerms, row.comments, row.notes, row.sourceFile]) }]);
  showToast('Suivi BC exporté.');
}
function exportPaymentsWorkbook() {
  exportWorkbook(`paiements_${todayYmd()}.xlsx`, [{ name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes'], rows: filteredPayments().map((row) => { const bc = findBcById(row.bcId); return [row.paymentRef, bc?.ref || '', bc?.supplierName || '', row.requestDate, row.paidDate, row.amount, row.mode, row.transactionRef, statusLabel(row.status), row.notes]; }) }]);
  showToast('Paiements exportés.');
}
function exportStockWorkbook() {
  exportWorkbook(`stock_${todayYmd()}.xlsx`, [
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Notes'], rows: state.stockItems.map((row) => [row.code, row.name, row.category, row.qty, row.minQty, row.unit, row.location, row.supplierName, row.notes]) },
    { name: 'Historique_Stock', headers: ['Date', 'Type', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: state.stockLogs.map((row) => { const item = findStockItemById(row.itemId); return [row.date, row.type, item?.name || '', row.qty, row.person, row.department, row.notes]; }) }
  ]);
  showToast('Stock exporté.');
}
function exportChartsPackWorkbook() {
  const specs = buildChartSpecs();
  exportWorkbook(`pack_graphiques_${todayYmd()}.xlsx`, Object.values(specs).map((spec) => ({ name: spec.title, headers: spec.headers, rows: spec.rows })));
  showToast('Pack graphiques exporté.');
}
function exportFullPack() {
  const specs = buildChartSpecs();
  exportWorkbook(`pack_complet_${todayYmd()}.xlsx`, [
    { name: 'Suivi_BC', headers: ['Réf BC', 'Réf DA', 'Validation DA', 'Date BC', 'Fournisseur', 'Type', 'Montant TTC', 'Statut BC', 'Date promise', 'Date réception', 'Date service', 'Demandeur', 'Conditions paiement', 'Commentaire', 'Notes', 'Source'], rows: state.bcRecords.map((row) => [row.ref, row.daRef, validationLabel(row), row.date, row.supplierName, row.type, row.amountTTC || row.amount, statusLabel(row.status), row.promisedDate, row.goodsReceivedDate, row.serviceDoneDate, row.requester, row.paymentTerms, row.comments, row.notes, row.sourceFile]) },
    { name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes'], rows: state.payments.map((row) => { const bc = findBcById(row.bcId); return [row.paymentRef, bc?.ref || '', bc?.supplierName || '', row.requestDate, row.paidDate, row.amount, row.mode, row.transactionRef, statusLabel(row.status), row.notes]; }) },
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Notes'], rows: state.stockItems.map((row) => [row.code, row.name, row.category, row.qty, row.minQty, row.unit, row.location, row.supplierName, row.notes]) },
    ...Object.values(specs).map((spec) => ({ name: spec.title, headers: spec.headers, rows: spec.rows }))
  ]);
  showToast('Pack complet exporté.');
}
function downloadFollowupTemplate() {
  exportWorkbook(`modele_suivi_bc_${todayYmd()}.xlsx`, [{ name: 'Modele', headers: ['Réf BC', 'Date', 'Fournisseur', 'Montant TTC', 'Type', 'Description', 'Conditions paiement', 'Commentaire'], rows: [[nextBcRefPreview(), todayYmd(), 'Nom fournisseur', 0, 'achat', 'Objet', 'Virement', '']] }]);
  showToast('Modèle généré.');
}
function exportJsonBackup() {
  downloadBlob(new Blob([JSON.stringify({
    settings: state.settings,
    users: state.users,
    suppliers: state.suppliers,
    requesters: state.requesters,
    bcRecords: state.bcRecords,
    payments: state.payments,
    stockItems: state.stockItems,
    stockLogs: state.stockLogs,
    holidays: state.holidays,
  }, null, 2)], { type: 'application/json;charset=utf-8' }), `sauvegarde_suivi_${todayYmd()}.json`);
  showToast('Sauvegarde JSON exportée.');
}
function restoreJsonBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(parsed));
      setupState();
      renderApp();
      showToast('Sauvegarde restaurée.');
    } catch (err) {
      console.error(err);
      showToast('JSON invalide.');
    }
  };
  reader.readAsText(file, 'utf-8');
  e.target.value = '';
}
function resetAllData() {
  if (!confirm('Réinitialiser toutes les données locales ?')) return;
  localStorage.removeItem(STORAGE_KEYS[0]);
  Object.assign(state, { ...state, ...defaultState(), session: state.session, activeTab: 'followup', importWarnings: [], chartSpecs: {}, chartModalKey: null });
  saveState();
  renderApp();
  showToast('Données réinitialisées.');
}

function findValueNearLabel(rows, regex, maxRows = 28) {
  for (let r = 0; r < Math.min(rows.length, maxRows); r += 1) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c += 1) {
      const txt = cellText(row[c]);
      if (!txt || !regex.test(txt)) continue;
      const inline = txt.replace(regex, '').replace(/^[:\-\/.\s]+/, '').trim();
      if (inline && inline !== txt) return inline;
      const candidates = [row[c + 1], row[c + 2], rows[r + 1]?.[c], rows[r + 1]?.[c + 1], rows[r]?.[c - 1]];
      const found = candidates.map(cellText).find(Boolean);
      if (found) return found;
    }
  }
  return '';
}
function findNumberNearLabel(displayRows, rawRows, regex) {
  for (let r = 0; r < displayRows.length; r += 1) {
    const disp = displayRows[r] || [];
    const raw = rawRows[r] || [];
    for (let c = 0; c < disp.length; c += 1) {
      const txt = cellText(disp[c]);
      if (!txt || !regex.test(txt)) continue;
      const inlineNum = parseFlexibleNumber(txt.replace(regex, '').trim());
      if (inlineNum > 0) return inlineNum;
      for (let o = 1; o <= 4; o += 1) {
        const rawNum = parseFlexibleNumber(raw[c + o]);
        if (rawNum > 0) return rawNum;
        const dispNum = parseFlexibleNumber(disp[c + o]);
        if (dispNum > 0) return dispNum;
      }
      const fromRow = disp.map(parseFlexibleNumber).find((n) => n > 0);
      if (fromRow > 0) return fromRow;
    }
  }
  return 0;
}
function findDateInRows(rows) {
  const labeled = toYmd(findValueNearLabel(rows, /DATE(?:\s*BC)?/i, 28));
  if (labeled) return labeled;
  for (let r = 0; r < Math.min(rows.length, 22); r += 1) {
    for (let c = 0; c < (rows[r] || []).length; c += 1) {
      const value = toYmd(rows[r][c]);
      if (value) return value;
    }
  }
  return '';
}
function findRefInRows(rows) {
  for (let r = 0; r < Math.min(rows.length, 28); r += 1) {
    for (const cell of rows[r] || []) {
      const txt = cellText(cell);
      if (!txt) continue;
      if (/BC\s*N?[°º]?/i.test(txt) || /\b\d{1,4}\s*\/\s*DG\s*\/\s*\d{4}\b/i.test(txt)) return txt;
    }
  }
  return '';
}
function inferSupplierFromFile(fileName) {
  return String(fileName || '')
    .replace(/^BC\s*\d+\s*/i, '')
    .replace(/\.xlsx?$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/copy/ig, '')
    .trim();
}
function extractLineItems(displayRows, rawRows) {
  let headerIndex = displayRows.findIndex((row) => row.some((cell) => /DESCRIPTION/i.test(cellText(cell))));
  if (headerIndex < 0) return { lineItems: [], description: '', totalQty: 0 };
  const header = displayRows[headerIndex].map(cellText);
  const descCol = header.findIndex((txt) => /DESCRIPTION/i.test(txt));
  const qtyCol = header.findIndex((txt) => /\bQTE\b|\bQT[EÉ]\b/i.test(txt));
  const unitCol = header.findIndex((txt) => /UNIT[EÉ]/i.test(txt));
  const totalCol = header.findIndex((txt) => /^TOTAL$/.test(txt) || /\bTOTAL\b/i.test(txt));
  const unitPriceCol = header.findIndex((txt) => /PRIX\s+UNITAIRE/i.test(txt));
  const lineItems = [];
  for (let r = headerIndex + 1; r < displayRows.length; r += 1) {
    const disp = displayRows[r] || [];
    const joined = disp.map(cellText).join(' | ');
    if (!disp.some((v) => cellText(v))) {
      if (lineItems.length) break;
      continue;
    }
    if (/TOTAL\s+HT|TOTAL\s+TTC|REMISE|TVA|TCE|TPP|LE DIRECTEUR|LE PCA|REMARQUES?/i.test(joined)) break;
    const description = descCol >= 0 ? cellText(disp[descCol]) : disp.map(cellText).find((v) => v && !/^\d+[.,]?\d*$/.test(v));
    const qty = qtyCol >= 0 ? parseFlexibleNumber(rawRows[r]?.[qtyCol] ?? disp[qtyCol]) : 0;
    const unit = unitCol >= 0 ? cellText(disp[unitCol]) : '';
    const unitPrice = unitPriceCol >= 0 ? parseFlexibleNumber(rawRows[r]?.[unitPriceCol] ?? disp[unitPriceCol]) : 0;
    const lineTotal = totalCol >= 0 ? parseFlexibleNumber(rawRows[r]?.[totalCol] ?? disp[totalCol]) : 0;
    if (!description && !qty && !lineTotal) continue;
    lineItems.push({ description, qty, unit, unitPrice, lineTotal });
  }
  const description = lineItems.map((row) => row.description).filter(Boolean).slice(0, 5).join(' | ').slice(0, 500);
  const totalQty = lineItems.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  return { lineItems, description, totalQty };
}
function extractSheetCandidate(workbook, sheetName, fileName) {
  const ws = workbook.Sheets[sheetName];
  const displayRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const joined = displayRows.flat().map(cellText).filter(Boolean).join(' | ');
  if (!joined) return null;
  const refLike = findRefInRows(displayRows);
  const date = findDateInRows(displayRows);
  let supplierName = findValueNearLabel(displayRows, /FOURNISSEUR/i, 28)
    .replace(/^Fournisseur\s*:?/i, '')
    .replace(/\s*RC\s*N.*$/i, '')
    .trim();
  const supplierFallback = inferSupplierFromFile(fileName);
  if (!supplierName) supplierName = supplierFallback;
  const amountTTC = findNumberNearLabel(displayRows, rawRows, /TOTAL\s*TTC/i);
  const amountHT = findNumberNearLabel(displayRows, rawRows, /TOTAL\s*HT/i);
  const paymentTerms = findValueNearLabel(displayRows, /CONDITIONS?\s+DE\s+PAIEMENT/i, 40);
  const lines = extractLineItems(displayRows, rawRows);
  const amount = amountTTC || amountHT || lines.lineItems.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0);
  const ref = canonicalBcRef(refLike, fileName, date || todayYmd());
  const fileSerial = extractBcSerial(fileName);
  const refSerial = extractBcSerial(ref);
  let score = 0;
  if (ref) score += 4;
  if (supplierName) score += 3;
  if (date) score += 2;
  if (amount > 0) score += 4;
  if (lines.lineItems.length) score += 2;
  if (fileSerial && refSerial && fileSerial === refSerial) score += 12;
  else if (fileSerial && refSerial && fileSerial !== refSerial) score -= 4;
  if (normalizeText(sheetName).includes(normalizeText(fileSerial || ''))) score += 1;
  const warnings = [];
  if (fileSerial && refSerial && fileSerial !== refSerial) warnings.push(`${fileName} : le nom du fichier indique BC ${fileSerial} mais la feuille ${sheetName} contient ${refSerial}.`);
  if (!amount) warnings.push(`${fileName} : TOTAL TTC introuvable ou nul dans la feuille ${sheetName}.`);
  return {
    score,
    ref,
    date,
    supplierName,
    paymentTerms,
    description: lines.description || `${supplierName || supplierFallback} · ${sheetName}`,
    amountTTC: amount,
    amountHT,
    type: inferType(lines.description || supplierName || joined),
    lineItems: lines.lineItems,
    totalQty: lines.totalQty,
    lineCount: lines.lineItems.length,
    warnings,
  };
}
function parseWorkbookBest(workbook, fileName) {
  const candidates = workbook.SheetNames.map((sheet) => extractSheetCandidate(workbook, sheet, fileName)).filter(Boolean);
  if (!candidates.length) throw new Error('Aucune feuille exploitable');
  candidates.sort((a, b) => b.score - a.score || Number(extractBcSerial(b.ref) || 0) - Number(extractBcSerial(a.ref) || 0));
  return candidates[0];
}
async function readFileAsWorkbook(file) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
}
async function importBcFiles() {
  const files = Array.from($('bcImportInput').files || []);
  if (!files.length) return showToast('Choisissez au moins un fichier BC.');
  if (typeof XLSX === 'undefined' || !XLSX?.read) return showToast('La bibliothèque Excel n’est pas disponible.');
  const updateExisting = $('bcImportUpdateExisting').checked;
  let created = 0, updated = 0, skipped = 0;
  const errors = [];
  state.importWarnings = [];
  for (const file of files) {
    if (/^~\$/i.test(file.name)) continue;
    try {
      const workbook = await readFileAsWorkbook(file);
      const parsed = parseWorkbookBest(workbook, file.name);
      state.importWarnings.push(...parsed.warnings);
      const supplier = ensureSupplier(parsed.supplierName);
      const payload = normalizeBcRecord({
        id: uid('bc'),
        ref: parsed.ref,
        daRef: nextDaRefPreview(),
        daStatus: 'draft',
        date: parsed.date || todayYmd(),
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || parsed.supplierName,
        amountTTC: parsed.amountTTC,
        amountHT: parsed.amountHT,
        type: parsed.type,
        description: parsed.description,
        status: 'importe',
        promisedDate: addBusinessDays(parsed.date || todayYmd(), state.settings.procurementDays || 0),
        paymentTerms: parsed.paymentTerms || '',
        comments: '',
        notes: '',
        importedFromBC: true,
        sourceFile: file.name,
        lineItems: parsed.lineItems,
        lineCount: parsed.lineCount,
        totalQty: parsed.totalQty,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      const idx = state.bcRecords.findIndex((row) => normalizeText(row.ref) === normalizeText(payload.ref));
      if (idx >= 0) {
        if (updateExisting) {
          state.bcRecords.splice(idx, 1, normalizeBcRecord({ ...state.bcRecords[idx], ...payload, id: state.bcRecords[idx].id, daRef: state.bcRecords[idx].daRef || payload.daRef, daStatus: state.bcRecords[idx].daStatus || 'draft', daValidatedAt: state.bcRecords[idx].daValidatedAt || '' }));
          updated += 1;
        } else skipped += 1;
      } else {
        state.bcRecords.unshift(payload);
        created += 1;
      }
      bumpBcSequenceFromRef(payload.ref);
      bumpDaSequenceFromRef(payload.daRef);
    } catch (err) {
      console.error(err);
      errors.push(`${file.name} : ${err.message}`);
    }
  }
  saveState();
  refreshSelectOptions();
  renderApp();
  $('bcImportInput').value = '';
  $('importResult').innerHTML = `${created} créé(s), ${updated} mis à jour, ${skipped} ignoré(s).${errors.length ? `<br>${errors.map(escapeHtml).join('<br>')}` : ''}`;
  showToast('Import BC terminé.');
}
function fillBulkExample() {
  $('bulkBcInput').value = [
    `BC 201/DG/${new Date().getFullYear()};${todayYmd()};FOURNISSEUR A;150000;achat;Pièces détachées;Virement;Attente validation budget`,
    `BC 202/DG/${new Date().getFullYear()};${todayYmd()};FOURNISSEUR B;78000;service;Maintenance;Chèque;Intervention planifiée`
  ].join('\n');
}
function importBulkBcRows() {
  const lines = $('bulkBcInput').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return showToast('Ajoutez au moins une ligne.');
  let count = 0;
  const errors = [];
  lines.forEach((line, index) => {
    const parts = line.split(';');
    if (parts.length < 4) {
      errors.push(`Ligne ${index + 1} invalide.`);
      return;
    }
    const [ref, date, supplierName, amount, type, description, paymentTerms, comments] = parts.map((part) => part.trim());
    const supplier = ensureSupplier(supplierName);
    const payload = normalizeBcRecord({
      id: uid('bc'),
      ref: canonicalBcRef(ref || nextBcRefPreview(), '', date || todayYmd()),
      daRef: nextDaRefPreview(),
      daStatus: 'draft',
      date: toYmd(date) || todayYmd(),
      supplierId: supplier?.id || null,
      supplierName: supplier?.name || supplierName,
      amountTTC: parseFlexibleNumber(amount),
      type: type === 'service' ? 'service' : 'achat',
      description: description || '',
      status: 'importe',
      promisedDate: addBusinessDays(toYmd(date) || todayYmd(), state.settings.procurementDays || 0),
      paymentTerms: paymentTerms || '',
      comments: comments || '',
      importedFromBC: false,
      sourceFile: '',
    });
    state.bcRecords.unshift(payload);
    bumpBcSequenceFromRef(payload.ref);
    bumpDaSequenceFromRef(payload.daRef);
    count += 1;
  });
  saveState();
  $('bulkImportResult').innerHTML = errors.length ? `${count} ligne(s) ajoutée(s).<br>${errors.map(escapeHtml).join('<br>')}` : `${count} ligne(s) ajoutée(s).`;
  $('bulkBcInput').value = '';
  renderApp();
  showToast('Lot manuel ajouté.');
}

function bindTableActions() {
  $$('[data-action="edit-bc"]').forEach((btn) => btn.onclick = () => openBcEditModal(btn.dataset.id));
  $$('[data-action="validate-bc"]').forEach((btn) => btn.onclick = () => quickValidateBc(btn.dataset.id));
  $$('[data-action="pay-bc"]').forEach((btn) => btn.onclick = () => preparePaymentForBc(btn.dataset.id));
  $$('[data-action="duplicate-bc"]').forEach((btn) => btn.onclick = () => duplicateBc(btn.dataset.id));
  $$('[data-action="delete-bc"]').forEach((btn) => btn.onclick = () => deleteBc(btn.dataset.id));
  $$('[data-action="edit-payment"]').forEach((btn) => btn.onclick = () => editPayment(btn.dataset.id));
  $$('[data-action="delete-payment"]').forEach((btn) => btn.onclick = () => deletePayment(btn.dataset.id));
  $$('[data-action="edit-stock"]').forEach((btn) => btn.onclick = () => editStockItem(btn.dataset.id));
  $$('[data-action="delete-stock"]').forEach((btn) => btn.onclick = () => deleteStockItem(btn.dataset.id));
  $$('[data-action="log-stock"]').forEach((btn) => btn.onclick = () => prepareStockLog(btn.dataset.id));
  $$('[data-action="edit-stock-log"]').forEach((btn) => btn.onclick = () => editStockLog(btn.dataset.id));
  $$('[data-action="delete-stock-log"]').forEach((btn) => btn.onclick = () => deleteStockLog(btn.dataset.id));
}

function setActiveTab(tab) {
  let safeTab = tab;
  if (safeTab === 'stock' || !safeTab) {
    safeTab = 'followup';
  }
  state.activeTab = safeTab;
  $$('#tabbar .tab, .sa-top-tab.tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === safeTab));
  $$('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${safeTab}`));
  try {
    renderActiveTab();
  } catch (e) {
    console.warn('[setActiveTab] safe catch:', e);
  }
}
if (typeof window !== 'undefined') window.setActiveTab = setActiveTab;
function renderActiveTab() {
  let safeTab = state.activeTab;
  if (safeTab === 'stock' || !safeTab) {
    safeTab = 'followup';
    state.activeTab = safeTab;
  }
  $$('#tabbar .tab, .sa-top-tab.tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === safeTab));
  $$('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${safeTab}`));
  if (state.activeTab === 'kpi') renderKpi();
  if (state.activeTab === 'followup') { refreshFollowupDefaults(); renderImportHealthBanner(); renderFollowupTable(); }
  if (state.activeTab === 'payments') renderPaymentsTable();
  if (state.activeTab === 'finance') {
    if (window.ApproNextGen && typeof ApproNextGen.renderFinancialIntelligenceCockpit === 'function') {
      ApproNextGen.renderFinancialIntelligenceCockpit();
    }
  }
  if (state.activeTab === 'smart-match') {
    if (window.SmartMatch) SmartMatch.run();
  }
  if (state.activeTab === 'reports') renderReports();
  if (state.activeTab === 'settings') fillSettingsScreen();
}
function renderApp() {
  setTheme(state.settings.theme || 'light');
  applyBranding();
  fillReferenceLists();
  refreshSelectOptions();
  refreshFollowupFilterOptions();
  fillSettingsScreen();
  renderActiveTab();
  setupCollapsiblePanels();
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value.trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('erp_jwt_token', data.token);
        const user = data.user || { username, role: 'admin' };
        state.session = {
          username: user.username,
          role: user.role,
          name: user.name || user.username,
          at: nowIso()
        };
        saveSession();
        try {
          localStorage.setItem('suivi_session', JSON.stringify(state.session));
          localStorage.setItem('sde_user_role', user.role === 'admin' ? 'admin' : 'admin_appro');
          localStorage.setItem('erp_douroub_session', JSON.stringify(state.session));
          localStorage.setItem('erp_currentUser', JSON.stringify(state.session));
        } catch (err) {}
        refreshAuthUi();
        showToast('Connexion réussie.');
        if (window.bcBridge && typeof window.bcBridge.hydrateFromServer === 'function') {
          window.bcBridge.hydrateFromServer();
        }
        return;
      }
    } catch (err) {
      console.warn('[LOGIN] API login error, falling back to local credentials:', err);
    }

    if (login(username, password)) {
      showToast('Connexion réussie.');
      // Try to get JWT from server even after local fallback login
      try {
        const r2 = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const d2 = await r2.json();
        if (r2.ok && d2.token) {
          localStorage.setItem('erp_jwt_token', d2.token);
        }
      } catch (e2) {}
      if (window.bcBridge && typeof window.bcBridge.hydrateFromServer === 'function') {
        setTimeout(() => window.bcBridge.hydrateFromServer(), 500);
      }
    } else {
      showToast('Identifiants incorrects.');
    }
  });
  $('logoutBtn').addEventListener('click', logout);
  $('themeSelect').addEventListener('change', (e) => { setTheme(e.target.value); saveState(); renderKpi(); });

  // Theme toggle button (tv2 topbar)
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const sel = $('themeSelect');
      if (!sel) return;
      const themes = ['light', 'dark'];
      const idx = themes.indexOf(sel.value);
      sel.value = themes[(idx + 1) % themes.length];
      sel.dispatchEvent(new Event('change'));
    });
  }

  // User card toggle (tv2 topbar)
  const userChip = document.getElementById('userChipWrap');
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = document.getElementById('userProfileCard');
      if (card) card.style.display = card.style.display === 'none' ? 'block' : 'none';
    });
  }
  document.addEventListener('click', () => {
    const card = document.getElementById('userProfileCard');
    if (card && card.style.display !== 'none') card.style.display = 'none';
  });

  // Smart match run button
  document.getElementById('btnRunSmartMatch')?.addEventListener('click', () => {
    if (window.SmartMatch) SmartMatch.run();
  });

  // Cross-app navigation links dynamic resolution (Stock, Flotte, Magasin)
  const isHttp = (typeof window !== 'undefined' && window.location && window.location.protocol) ? window.location.protocol.startsWith('http') : false;
  const targetStockUrl = isHttp ? '/#stock' : '../index.html#stock';
  const stockLink = $('linkToStock');
  if (stockLink) {
    stockLink.href = targetStockUrl;
    stockLink.addEventListener('click', () => {
      try { localStorage.setItem('erp_active_module', 'stock'); } catch(e) {}
    });
  }
  const portalLink = $('linkToPortalAppro');
  if (portalLink) {
    portalLink.href = targetStockUrl;
    portalLink.addEventListener('click', () => {
      try { localStorage.setItem('erp_active_module', 'stock'); } catch(e) {}
    });
  }

  // Bulletproof delegated tab switching so listeners never get lost
  const tabbar = $('tabbar');
  if (tabbar && !tabbar._bound) {
    tabbar._bound = true;
    tabbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab[data-tab]');
      if (btn && btn.dataset.tab) {
        e.preventDefault();
        setActiveTab(btn.dataset.tab);
      }
    });
  }
  $$('#tabbar .tab, .sa-top-tab.tab').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab(btn.dataset.tab);
  }));
  $('refreshDashboardBtn').addEventListener('click', () => renderKpi());
  $('exportKpiBtn').addEventListener('click', exportKpiWorkbook);
  $('downloadTemplateBtn').addEventListener('click', downloadFollowupTemplate);
  $('btnOpenNewBcDrawer')?.addEventListener('click', () => openBcDrawer(false));
  $('closeBcDrawerBtn')?.addEventListener('click', closeBcDrawer);
  $('bcSlideOverDrawer')?.addEventListener('click', (e) => {
    if (e.target.id === 'bcSlideOverDrawer') closeBcDrawer();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('bcSlideOverDrawer')?.classList.contains('hidden')) {
      closeBcDrawer();
    }
  });
  $('followupForm').addEventListener('submit', submitFollowupForm);
  $('resetFollowupBtn').addEventListener('click', () => { resetFollowupForm(); showToast('Formulaire BC réinitialisé.'); });
  $('bcDate').addEventListener('change', () => { $('bcPromisedDate').value = addBusinessDays($('bcDate').value || todayYmd(), state.settings.procurementDays || 0); });
  if ($('applyFollowupFiltersBtn')) {
    $('applyFollowupFiltersBtn').addEventListener('click', () => {
      if (typeof window.applyFollowupFilter === 'function') window.applyFollowupFilter();
      else { resetFollowupPage(); renderFollowupTable(); }
    });
  }
  $('followupSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (typeof window.applyFollowupFilter === 'function') window.applyFollowupFilter();
      else { resetFollowupPage(); renderFollowupTable(); }
    }
  });
  if ($('followupImportanceFilter')) {
    $('followupImportanceFilter').addEventListener('change', () => {
      if (typeof window.applyFollowupFilter === 'function') window.applyFollowupFilter();
      else { resetFollowupPage(); renderFollowupTable(); }
    });
  }
  $('followupSortField').addEventListener('change', () => { renderFollowupTable(); });
  $('followupSortDir').addEventListener('change', () => { renderFollowupTable(); });
  $('resetFollowupFiltersBtn').addEventListener('click', resetFollowupFilters);
  $('importBcBtn').addEventListener('click', importBcFiles);
  $('fillBulkExampleBtn').addEventListener('click', fillBulkExample);
  $('importBulkBcBtn').addEventListener('click', importBulkBcRows);
  $('exportFollowupBtn').addEventListener('click', exportFollowupWorkbook);
  $('bcEditForm').addEventListener('submit', submitBcEditForm);
  $('closeBcEditModalBtn').addEventListener('click', closeBcEditModal);
  $('validateBcDaBtn').addEventListener('click', validateEditModal);
  $('bcEditModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'bcEditModalBackdrop') closeBcEditModal(); });
  $('editBcDate').addEventListener('change', () => { $('editBcPromisedDate').value = addBusinessDays($('editBcDate').value || todayYmd(), state.settings.procurementDays || 0); });
  $('paymentForm').addEventListener('submit', submitPaymentForm);
  $('resetPaymentBtn').addEventListener('click', () => { resetPaymentForm(); showToast('Formulaire paiement réinitialisé.'); });
  $('paymentSearch').addEventListener('input', renderPaymentsTable);
  $('paymentFilterStatus').addEventListener('change', renderPaymentsTable);
  $('exportPaymentsBtn').addEventListener('click', exportPaymentsWorkbook);
  $('stockItemForm')?.addEventListener('submit', submitStockItemForm);
  $('resetStockItemBtn')?.addEventListener('click', () => { resetStockItemForm(); showToast('Formulaire article réinitialisé.'); });
  $('stockLogForm')?.addEventListener('submit', submitStockLogForm);
  $('resetStockLogBtn')?.addEventListener('click', () => { resetStockLogForm(); showToast('Formulaire mouvement réinitialisé.'); });
  $('exportStockBtn')?.addEventListener('click', exportStockWorkbook);
  $('exportChartsPackBtn')?.addEventListener('click', exportChartsPackWorkbook);
  $('exportFullPackBtn')?.addEventListener('click', exportFullPack);
  $('exportExecSummaryBtn')?.addEventListener('click', exportExecutiveSummaryWorkbook);
  $('exportGrandLivreBcBtn')?.addEventListener('click', exportFollowupWorkbook);
  $('exportBordereauDpBtn')?.addEventListener('click', exportPaymentsWorkbook);
  $('saveSettingsBtn').addEventListener('click', saveSettingsFromScreen);
  $('addHolidayBtn').addEventListener('click', addHoliday);
  $('addSupplierBtn').addEventListener('click', addSupplierFromSettings);
  $('addRequesterBtn').addEventListener('click', addRequesterFromSettings);
  $('settingLogo').addEventListener('change', handleLogoUpload);
  $('backupJsonBtn').addEventListener('click', exportJsonBackup);
  $('restoreJsonInput').addEventListener('change', restoreJsonBackup);
  $('resetAllBtn').addEventListener('click', resetAllData);
  const resyncBcEl = $('resyncBcBtn');
  if (resyncBcEl) {
    resyncBcEl.addEventListener('click', async () => {
      if (!confirm('⚠️ Cela va supprimer TOUS les BCs dans MongoDB et les réimporter depuis le fichier JSON corrigé. Continuer ?')) return;
      resyncBcEl.disabled = true;
      resyncBcEl.textContent = '⏳ Resync en cours...';
      try {
        const token = localStorage.getItem('erp_jwt_token') || state.session?.token || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const r = await fetch('/api/bc/resync', {
          method: 'POST',
          headers: headers
        });
        const d = await r.json();
        if (r.ok) {
          showToast('✅ ' + (d.message || 'Resync réussi !'));
          setTimeout(() => location.reload(), 1800);
        } else {
          showToast('❌ ' + (d.error || 'Erreur resync'), 'error');
          resyncBcEl.disabled = false;
          resyncBcEl.textContent = '🔄 Resync BC depuis JSON (purge + reimport)';
        }
      } catch (e) {
        showToast('❌ Connexion échouée : ' + e.message, 'error');
        resyncBcEl.disabled = false;
        resyncBcEl.textContent = '🔄 Resync BC depuis JSON (purge + reimport)';
      }
    });
  }
  $('closeChartModalBtn').addEventListener('click', closeChartModal);
  $('chartModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'chartModalBackdrop') closeChartModal(); });
  $('exportCurrentChartBtn').addEventListener('click', () => {
    const spec = state.chartSpecs[state.chartModalKey];
    if (spec) exportSingleDataset(spec);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('bcEditModalBackdrop').classList.contains('hidden')) closeBcEditModal();
    if (!$('chartModalBackdrop').classList.contains('hidden')) closeChartModal();
  });
  window.addEventListener('resize', debounce(() => {
    if (state.activeTab === 'kpi') renderKpi();
    if (state.chartModalKey) openChartModal(state.chartModalKey);
  }, 120));
}

function init() {
  // FIX 1: Unified login — if no JWT, redirect to main Stock login with ?redirect=bc
  const _jwtToken = localStorage.getItem('erp_jwt_token');
  if (!_jwtToken) {
    window.location.href = '/?redirect=bc';
    return;
  }
  // If JWT exists but no session, build a session from stored data
  if (!state.session) {
    try {
      const storedUser = localStorage.getItem('erp_currentUser') || localStorage.getItem('erp_douroub_session');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        state.session = {
          id: parsed.id || ('u_' + (parsed.username || 'admin')),
          username: parsed.username || 'admin',
          name: parsed.name || parsed.username || 'Admin',
          role: parsed.role || 'admin',
          department: parsed.department || 'Direction',
          at: parsed.at || nowIso()
        };
        saveSession();
      }
    } catch (e) {}
  }
  setupState();
  bindEvents();
  setTheme(state.settings.theme || 'light');
  applyBranding();
  resetFollowupForm();
  resetPaymentForm();
  resetStockItemForm();
  resetStockLogForm();
  refreshAuthUi();
}

init();

/* ===== Premium compact enhancement layer ===== */

const ENHANCED_SORT_CONFIG = {
  followup: { fieldKey: 'followupSortField', dirKey: 'followupSortDir', fieldSelect: 'followupSortField', dirSelect: 'followupSortDir', render: () => { resetFollowupPage(); renderFollowupTable(); } },
  payments: { fieldKey: 'paymentSortField', dirKey: 'paymentSortDir', fieldSelect: 'paymentSortField', dirSelect: 'paymentSortDir', render: () => renderPaymentsTable() },
  stockItems: { fieldKey: 'stockItemSortField', dirKey: 'stockItemSortDir', fieldSelect: 'stockItemSortField', dirSelect: 'stockItemSortDir', render: () => renderStockTables() },
  stockLogs: { fieldKey: 'stockLogSortField', dirKey: 'stockLogSortDir', fieldSelect: 'stockLogSortField', dirSelect: 'stockLogSortDir', render: () => renderStockTables() },
};

function normalizeStockItem(row = {}) {
  return {
    id: row.id || uid('stk'),
    code: String(row.code || '').trim(),
    name: String(row.name || '').trim(),
    category: String(row.category || '').trim(),
    qty: Number(row.qty || 0) || 0,
    minQty: Number(row.minQty || 0) || 0,
    unit: String(row.unit || 'U').trim() || 'U',
    location: String(row.location || '').trim(),
    supplierName: String(row.supplierName || '').trim(),
    requester: String(row.requester || row.owner || '').trim(),
    notes: String(row.notes || '').trim(),
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}

function ensureEnhancedUiState() {
  state.ui = {
    followupPage: 1,
    followupPageSize: 10,
    followupSortField: 'date',
    followupSortDir: 'desc',
    paymentSortField: 'requestDate',
    paymentSortDir: 'desc',
    stockItemSortField: 'name',
    stockItemSortDir: 'asc',
    stockLogSortField: 'date',
    stockLogSortDir: 'desc',
    dashboardMetricMode: 'amount',
    ...(state.ui || {}),
  };
  if (!['amount', 'count'].includes(state.ui.dashboardMetricMode)) state.ui.dashboardMetricMode = 'amount';
}

function defaultSortDirection(field) {
  return ['date', 'requestDate', 'paidDate', 'amount', 'qty', 'minQty', 'delay', 'promisedDate', 'alert'].includes(field) ? 'desc' : 'asc';
}

function compareEnhancedValues(a, b, dir = 1) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' }) * dir;
}

function setSortState(group, field) {
  ensureEnhancedUiState();
  const cfg = ENHANCED_SORT_CONFIG[group];
  if (!cfg) return;
  if (state.ui[cfg.fieldKey] === field) state.ui[cfg.dirKey] = state.ui[cfg.dirKey] === 'asc' ? 'desc' : 'asc';
  else {
    state.ui[cfg.fieldKey] = field;
    state.ui[cfg.dirKey] = defaultSortDirection(field);
  }
  const fieldSelect = $(cfg.fieldSelect);
  const dirSelect = $(cfg.dirSelect);
  if (fieldSelect) fieldSelect.value = state.ui[cfg.fieldKey];
  if (dirSelect) dirSelect.value = state.ui[cfg.dirKey];
  cfg.render();
  syncEnhancedSortControls(group);
}

function syncEnhancedSortControls(group) {
  ensureEnhancedUiState();
  const groups = group ? [group] : Object.keys(ENHANCED_SORT_CONFIG);
  groups.forEach((name) => {
    const cfg = ENHANCED_SORT_CONFIG[name];
    if (!cfg) return;
    const field = state.ui[cfg.fieldKey];
    const dir = state.ui[cfg.dirKey];
    const fieldSelect = $(cfg.fieldSelect);
    const dirSelect = $(cfg.dirSelect);
    if (fieldSelect && field) fieldSelect.value = field;
    if (dirSelect && dir) dirSelect.value = dir;
    $$(`.th-sort-btn[data-sort-group="${name}"]`).forEach((btn) => {
      const active = btn.dataset.sortField === field;
      btn.classList.toggle('active', active);
      btn.dataset.direction = active ? dir : 'none';
      const ind = btn.querySelector('.th-sort-indicator');
      if (ind) ind.textContent = active ? (dir === 'asc' ? '↑' : '↓') : '↕';
    });
  });
  syncDashboardMetricButtons();
  refreshPageCollapseButtons();
}

function syncDashboardMetricButtons() {
  ensureEnhancedUiState();
  $$('[data-dashboard-metric]').forEach((btn) => btn.classList.toggle('active', btn.dataset.dashboardMetric === state.ui.dashboardMetricMode));
}

function injectHeadFonts() {
  if (document.getElementById('premiumFontLink')) return;
  [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap', id: 'premiumFontLink' },
  ].forEach((def) => {
    const link = document.createElement('link');
    Object.entries(def).forEach(([key, value]) => {
      if (key === 'crossorigin') link.crossOrigin = value;
      else link.setAttribute(key, value);
    });
    document.head.appendChild(link);
  });
}

function ensureToolbarActions(header) {
  let actions = header.querySelector('.toolbar-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'toolbar-actions';
    header.appendChild(actions);
  }
  return actions;
}

function injectDashboardControls() {
  const page = $('page-kpi');
  if (!page || $('dashboardControlBar')) return;
  const hero = page.querySelector('.page-header');
  if (!hero) return;
  hero.insertAdjacentHTML('afterend', `
    <div class="dashboard-control-bar" id="dashboardControlBar">
      <div class="dashboard-chip-group">
        <button class="metric-chip active" type="button" data-dashboard-metric="amount">Vue montant</button>
        <button class="metric-chip" type="button" data-dashboard-metric="count">Vue volume</button>
      </div>
      <div class="dashboard-control-note">Passe des montants aux volumes, clique sur un graphe pour le mettre en focus et exporte chaque dataset en Excel.</div>
    </div>
  `);
}

function injectChartModalTooltip() {
  const body = document.querySelector('#chartModalBackdrop .chart-modal-body');
  if (!body || $('chartModalTooltip')) return;
  const tip = document.createElement('div');
  tip.id = 'chartModalTooltip';
  tip.className = 'chart-tooltip chart-tooltip-modal';
  body.appendChild(tip);
}

function injectPaymentFilters() {
  const toolbar = $('paymentSearch')?.closest('.toolbar-row');
  if (!toolbar) return;
  toolbar.classList.add('compact-toolbar', 'filters-row', 'premium-filters-grid');
  if (!$('paymentFilterMode')) {
    toolbar.insertAdjacentHTML('beforeend', `
      <select id="paymentFilterMode">
        <option value="all">Tous modes</option>
        <option value="cheque">Chèque</option>
        <option value="virement">Virement</option>
        <option value="especes">Espèces</option>
        <option value="autre">Autre</option>
      </select>
      <select id="paymentFilterSupplier"><option value="all">Tous fournisseurs</option></select>
      <input id="paymentDateFrom" type="date" title="Date début" />
      <input id="paymentDateTo" type="date" title="Date fin" />
      <select id="paymentSortField">
        <option value="requestDate">Tri : date demande</option>
        <option value="paidDate">Tri : date paiement</option>
        <option value="amount">Tri : montant</option>
        <option value="supplier">Tri : fournisseur</option>
        <option value="paymentRef">Tri : réf paiement</option>
        <option value="delay">Tri : délai</option>
      </select>
      <select id="paymentSortDir">
        <option value="desc">Décroissant</option>
        <option value="asc">Croissant</option>
      </select>
      <button class="btn btn-ghost" id="resetPaymentFiltersBtn" type="button">Réinitialiser</button>
    `);
  }
  const shell = $('paymentsTableBody')?.closest('.table-shell');
  if (shell && !$('paymentsCount')) {
    shell.insertAdjacentHTML('afterend', `<div class="table-meta-row"><div id="paymentsCount" class="table-count muted">0 ligne</div></div>`);
  }
}

function injectStockImportPanel() {
  const stack = $('page-stock')?.querySelector('.section-stack');
  if (!stack || $('stockImportInput')) return;
  stack.insertAdjacentHTML('afterbegin', `
    <article class="panel panel-entry stock-import-panel">
      <div class="panel-title-row"><h3>Import stock Excel</h3><span class="panel-tag">Bulk</span></div>
      <div class="import-grid">
        <label class="field wide">
          <span>Fichier stock (.xlsx / .xls)</span>
          <input id="stockImportInput" type="file" accept=".xlsx,.xls" />
        </label>
        <label class="check-inline"><input id="stockImportUpdateExisting" type="checkbox" checked /> <span>Mettre à jour les articles existants si le code ou la désignation existe déjà</span></label>
        <div class="toolbar-actions wrap">
          <button class="btn btn-soft" id="downloadStockTemplateBtn" type="button">Modèle stock</button>
          <button class="btn btn-primary" id="importStockBtn" type="button">Importer le stock</button>
        </div>
      </div>
      <div class="help-note">Colonnes simples recommandées : <strong>Code article</strong>, <strong>Désignation</strong>, <strong>Catégorie</strong>, <strong>Fournisseur</strong>, <strong>Demandeur</strong>, <strong>Quantité</strong>, <strong>Seuil mini</strong>, <strong>Unité</strong>, <strong>Emplacement</strong>, <strong>Notes</strong>.</div>
      <div id="stockImportResult" class="import-result muted">Aucun import stock lancé.</div>
    </article>
  `);
}

function injectStockRequesterField() {
  const supplierField = $('stockSupplier')?.closest('.field');
  if (!supplierField || $('stockRequester')) return;
  supplierField.insertAdjacentHTML('afterend', `
    <label class="field">
      <span>Demandeur / référent</span>
      <input id="stockRequester" type="text" list="requestersList" placeholder="Responsable / demandeur" />
    </label>
  `);
}

function injectStockFilters() {
  const itemsShell = $('stockItemsTableBody')?.closest('.table-shell');
  const logsShell = $('stockLogsTableBody')?.closest('.table-shell');
  if (itemsShell && !$('stockItemsSearch')) {
    itemsShell.insertAdjacentHTML('beforebegin', `
      <div class="toolbar-row compact-toolbar filters-row stock-filters-grid">
        <input id="stockItemsSearch" type="search" placeholder="Code, article, fournisseur..." />
        <select id="stockItemsAlertFilter">
          <option value="all">Toutes alertes</option>
          <option value="rupture">Rupture</option>
          <option value="low">Sous seuil</option>
          <option value="ok">OK</option>
        </select>
        <select id="stockItemsCategoryFilter"><option value="all">Toutes catégories</option></select>
        <select id="stockItemsSupplierFilter"><option value="all">Tous fournisseurs</option></select>
        <select id="stockItemsRequesterFilter"><option value="all">Tous demandeurs</option></select>
        <select id="stockItemsLocationFilter"><option value="all">Tous emplacements</option></select>
        <select id="stockItemSortField">
          <option value="name">Tri : désignation</option>
          <option value="code">Tri : code</option>
          <option value="qty">Tri : stock</option>
          <option value="minQty">Tri : seuil mini</option>
          <option value="category">Tri : catégorie</option>
          <option value="supplier">Tri : fournisseur</option>
          <option value="requester">Tri : demandeur</option>
          <option value="alert">Tri : criticité</option>
        </select>
        <select id="stockItemSortDir">
          <option value="asc">Croissant</option>
          <option value="desc">Décroissant</option>
        </select>
        <button class="btn btn-ghost" id="resetStockItemFiltersBtn" type="button">Réinitialiser</button>
      </div>
    `);
    itemsShell.insertAdjacentHTML('afterend', `<div class="table-meta-row"><div id="stockItemsCount" class="table-count muted">0 ligne</div></div>`);
  }
  if (logsShell && !$('stockLogsSearch')) {
    logsShell.insertAdjacentHTML('beforebegin', `
      <div class="toolbar-row compact-toolbar filters-row stock-log-filters-grid">
        <input id="stockLogsSearch" type="search" placeholder="Article, personne, note..." />
        <select id="stockLogsTypeFilter">
          <option value="all">Tous mouvements</option>
          <option value="out">Sorties</option>
          <option value="in">Entrées</option>
        </select>
        <select id="stockLogsPersonFilter"><option value="all">Toutes personnes</option></select>
        <select id="stockLogsDepartmentFilter"><option value="all">Tous services</option></select>
        <input id="stockLogsDateFrom" type="date" title="Date début" />
        <input id="stockLogsDateTo" type="date" title="Date fin" />
        <select id="stockLogSortField">
          <option value="date">Tri : date</option>
          <option value="type">Tri : type</option>
          <option value="item">Tri : article</option>
          <option value="qty">Tri : quantité</option>
          <option value="person">Tri : personne</option>
          <option value="department">Tri : service</option>
        </select>
        <select id="stockLogSortDir">
          <option value="desc">Décroissant</option>
          <option value="asc">Croissant</option>
        </select>
        <button class="btn btn-ghost" id="resetStockLogFiltersBtn" type="button">Réinitialiser</button>
      </div>
    `);
    logsShell.insertAdjacentHTML('afterend', `<div class="table-meta-row"><div id="stockLogsCount" class="table-count muted">0 ligne</div></div>`);
  }
  const headerRow = $('stockItemsTableBody')?.closest('table')?.querySelector('thead tr');
  if (headerRow && !headerRow.querySelector('[data-header-key="requester"]')) {
    const th = document.createElement('th');
    th.dataset.headerKey = 'requester';
    th.textContent = 'Demandeur';
    headerRow.insertBefore(th, headerRow.children[7] || null);
  }
}

function injectPageCollapseButtons() {
  $$('.page-header').forEach((header) => {
    const page = header.closest('.page');
    if (!page) return;
    const actions = ensureToolbarActions(header);
    if (actions.querySelector(`[data-collapse-page="${page.id}"]`)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-collapse-page';
    btn.dataset.collapsePage = page.id;
    btn.innerHTML = '<span class="btn-collapse-icon" aria-hidden="true">−</span><span class="btn-collapse-label">Réduire les blocs</span>';
    actions.prepend(btn);
  });
}

function makeSortableHeader(th, group, field, label) {
  th.innerHTML = `<button type="button" class="th-sort-btn" data-sort-group="${group}" data-sort-field="${field}"><span>${escapeHtml(label)}</span><span class="th-sort-indicator" aria-hidden="true">↕</span></button>`;
}

function injectSortableHeaders() {
  const followupHeaders = $$('#page-followup thead th');
  if (followupHeaders.length && !followupHeaders[0].querySelector('.th-sort-btn')) {
    const map = {
      0: ['ref', 'BC'],
      1: ['daRef', 'DA'],
      2: ['date', 'Date'],
      3: ['supplier', 'Fournisseur'],
      4: ['department', 'Service / Département'],
      5: ['type', 'Type'],
      6: ['amountHT', 'Montant HT'],
      7: ['amount', 'Montant TTC'],
      8: ['status', 'Statut BC'],
      9: ['goodsReceivedDate', 'Réalisation'],
    };
    Object.entries(map).forEach(([index, tuple]) => {
      const th = followupHeaders[Number(index)];
      if (th) makeSortableHeader(th, 'followup', tuple[0], tuple[1]);
    });
  }
  const paymentHeaders = $$('#page-payments thead th');
  if (paymentHeaders.length && !paymentHeaders[0].querySelector('.th-sort-btn')) {
    const map = {
      0: ['paymentRef', 'Réf paiement'],
      1: ['bcRef', 'BC'],
      2: ['supplier', 'Fournisseur'],
      3: ['requestDate', 'Date demande'],
      4: ['paidDate', 'Date paiement'],
      5: ['amount', 'Montant'],
      6: ['mode', 'Mode'],
      8: ['delay', 'Délai'],
    };
    Object.entries(map).forEach(([index, tuple]) => {
      const th = paymentHeaders[Number(index)];
      if (th) makeSortableHeader(th, 'payments', tuple[0], tuple[1]);
    });
  }
  const stockItemHeaders = $$('#page-stock .table-shell.tight-space thead th');
  if (stockItemHeaders.length && !stockItemHeaders[0].querySelector('.th-sort-btn')) {
    const map = {
      0: ['code', 'Code'],
      1: ['name', 'Désignation'],
      2: ['category', 'Catégorie'],
      3: ['qty', 'Stock'],
      4: ['minQty', 'Mini'],
      5: ['location', 'Emplacement'],
      6: ['supplier', 'Fournisseur'],
      7: ['requester', 'Demandeur'],
      8: ['alert', 'Alerte'],
    };
    Object.entries(map).forEach(([index, tuple]) => {
      const th = stockItemHeaders[Number(index)];
      if (th) makeSortableHeader(th, 'stockItems', tuple[0], tuple[1]);
    });
  }
  const stockLogHeaders = $$('#page-stock .table-shell:not(.tight-space) thead th');
  if (stockLogHeaders.length && !stockLogHeaders[0].querySelector('.th-sort-btn')) {
    const map = {
      0: ['date', 'Date'],
      1: ['type', 'Type'],
      2: ['item', 'Article'],
      3: ['qty', 'Qté'],
      4: ['person', 'Personne'],
      5: ['department', 'Service'],
    };
    Object.entries(map).forEach(([index, tuple]) => {
      const th = stockLogHeaders[Number(index)];
      if (th) makeSortableHeader(th, 'stockLogs', tuple[0], tuple[1]);
    });
  }
}

function enhanceStaticLayout() {
  injectHeadFonts();
  injectDashboardControls();
  injectChartModalTooltip();
  injectPaymentFilters();
  injectStockImportPanel();
  injectStockRequesterField();
  injectStockFilters();
  injectPageCollapseButtons();
  injectSortableHeaders();
}

function setTableCount(id, count, label = 'ligne(s)') {
  const el = $(id);
  if (el) el.textContent = `${count} ${label}`;
}

function refreshPaymentFilterOptions() {
  const supplierSelect = $('paymentFilterSupplier');
  if (!supplierSelect) return;
  const currentSupplier = supplierSelect.value || 'all';
  const values = [...new Set(state.payments.map((row) => findBcById(row.bcId)?.supplierName || '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  supplierSelect.innerHTML = ['<option value="all">Tous fournisseurs</option>'].concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)).join('');
  supplierSelect.value = values.includes(currentSupplier) ? currentSupplier : 'all';
}

function refreshStockFilterOptions() {
  const configs = [
    ['stockItemsCategoryFilter', state.stockItems.map((row) => row.category)],
    ['stockItemsSupplierFilter', state.stockItems.map((row) => row.supplierName)],
    ['stockItemsRequesterFilter', state.stockItems.map((row) => row.requester)],
    ['stockItemsLocationFilter', state.stockItems.map((row) => row.location)],
    ['stockLogsPersonFilter', state.stockLogs.map((row) => row.person)],
    ['stockLogsDepartmentFilter', state.stockLogs.map((row) => row.department)],
  ];
  configs.forEach(([id, source]) => {
    const select = $(id);
    if (!select) return;
    const current = select.value || 'all';
    const values = [...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    const baseLabel = id.includes('Category') ? 'Toutes catégories'
      : id.includes('Supplier') ? 'Tous fournisseurs'
      : id.includes('Requester') ? 'Tous demandeurs'
      : id.includes('Location') ? 'Tous emplacements'
      : id.includes('PersonFilter') ? 'Toutes personnes'
      : 'Tous services';
    select.innerHTML = [`<option value="all">${baseLabel}</option>`].concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)).join('');
    select.value = values.includes(current) ? current : 'all';
  });
}

function resetPaymentFilters() {
  if ($('paymentSearch')) $('paymentSearch').value = '';
  if ($('paymentFilterStatus')) $('paymentFilterStatus').value = 'all';
  if ($('paymentFilterMode')) $('paymentFilterMode').value = 'all';
  if ($('paymentFilterSupplier')) $('paymentFilterSupplier').value = 'all';
  if ($('paymentDateFrom')) $('paymentDateFrom').value = '';
  if ($('paymentDateTo')) $('paymentDateTo').value = '';
  state.ui.paymentSortField = 'requestDate';
  state.ui.paymentSortDir = 'desc';
  syncEnhancedSortControls('payments');
  renderPaymentsTable();
  showToast('Filtres paiements réinitialisés.');
}

function resetStockItemFilters() {
  ['stockItemsSearch', 'stockItemsAlertFilter', 'stockItemsCategoryFilter', 'stockItemsSupplierFilter', 'stockItemsRequesterFilter', 'stockItemsLocationFilter'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.value = 'all';
    else el.value = '';
  });
  state.ui.stockItemSortField = 'name';
  state.ui.stockItemSortDir = 'asc';
  syncEnhancedSortControls('stockItems');
  renderStockTables();
  showToast('Filtres articles réinitialisés.');
}

function resetStockLogFilters() {
  ['stockLogsSearch', 'stockLogsTypeFilter', 'stockLogsPersonFilter', 'stockLogsDepartmentFilter'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.value = 'all';
    else el.value = '';
  });
  ['stockLogsDateFrom', 'stockLogsDateTo'].forEach((id) => { if ($(id)) $(id).value = ''; });
  state.ui.stockLogSortField = 'date';
  state.ui.stockLogSortDir = 'desc';
  syncEnhancedSortControls('stockLogs');
  renderStockTables();
  showToast('Filtres mouvements réinitialisés.');
}

function paymentSortValue(row, field) {
  const bc = findBcById(row.bcId);
  if (field === 'paymentRef') return normalizeText(row.paymentRef || '');
  if (field === 'bcRef') return normalizeText(bc?.ref || '');
  if (field === 'supplier') return normalizeText(bc?.supplierName || '');
  if (field === 'paidDate') return String(row.paidDate || '');
  if (field === 'amount') return Number(row.amount || 0) || 0;
  if (field === 'mode') return normalizeText(row.mode || '');
  if (field === 'delay') return businessDaysBetween(row.requestDate || todayYmd(), row.paidDate || todayYmd()) ?? 0;
  return String(row.requestDate || '');
}

function filteredPayments() {
  ensureEnhancedUiState();
  const q = normalizeText($('paymentSearch')?.value || '');
  const status = $('paymentFilterStatus')?.value || 'all';
  const mode = $('paymentFilterMode')?.value || 'all';
  const supplier = $('paymentFilterSupplier')?.value || 'all';
  const dateFrom = $('paymentDateFrom')?.value || '';
  const dateTo = $('paymentDateTo')?.value || '';
  const sortField = $('paymentSortField')?.value || state.ui.paymentSortField || 'requestDate';
  const sortDir = $('paymentSortDir')?.value || state.ui.paymentSortDir || 'desc';
  state.ui.paymentSortField = sortField;
  state.ui.paymentSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;
  return state.payments.filter((row) => {
    const bc = findBcById(row.bcId);
    if (status !== 'all' && row.status !== status) return false;
    if (mode !== 'all' && row.mode !== mode) return false;
    if (supplier !== 'all' && (bc?.supplierName || '') !== supplier) return false;
    if (dateFrom && String(row.requestDate || '') < dateFrom) return false;
    if (dateTo && String(row.requestDate || '') > dateTo) return false;
    if (!q) return true;
    const hay = normalizeText([row.paymentRef, row.transactionRef, row.notes, row.mode, statusLabel(row.status), bc?.ref, bc?.supplierName].join(' | '));
    return hay.includes(q);
  }).sort((a, b) => {
    const cmp = compareEnhancedValues(paymentSortValue(a, sortField), paymentSortValue(b, sortField), dir);
    if (cmp) return cmp;
    return String(b.requestDate || '').localeCompare(String(a.requestDate || ''));
  });
}

function renderPaymentsTable() {
  const tbody = $('paymentsTableBody');
  if (!tbody) return;
  const rows = filteredPayments();
  tbody.innerHTML = rows.length ? rows.map((row) => {
    const bc = findBcById(row.bcId);
    const delay = row.requestDate && (row.paidDate || todayYmd()) ? businessDaysBetween(row.requestDate, row.paidDate || todayYmd()) : null;
    const tone = row.status === 'paye' ? 'ok' : (delay != null && delay > (state.settings.financeDays || 0) ? 'late' : 'warn');
    const delayLabel = row.status === 'paye' ? `Payé · ${delay ?? 0} j` : `${delay ?? 0} j`;
    return `<tr>
      <td><strong>${escapeHtml(row.paymentRef || '—')}</strong><span class="table-subline">${escapeHtml(statusLabel(row.status))}</span></td>
      <td>${escapeHtml(bc?.ref || '—')}<span class="table-subline">${escapeHtml(bc?.daRef || '')}</span></td>
      <td>${escapeHtml(bc?.supplierName || '—')}</td>
      <td>${escapeHtml(formatDate(row.requestDate))}</td>
      <td>${escapeHtml(formatDate(row.paidDate))}</td>
      <td>${escapeHtml(formatMoney(row.amount, 'DZD'))}</td>
      <td>${escapeHtml(row.mode || '—')}</td>
      <td>${escapeHtml(row.transactionRef || '—')}</td>
      <td><span class="delay-pill ${tone}">${escapeHtml(delayLabel)}</span></td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-payment', row.id, 'Modifier paiement')}${iconActionButton('delete', 'delete-payment', row.id, 'Supprimer paiement')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="10" class="muted">Aucun paiement.</td></tr>`;
  setTableCount('paymentsCount', rows.length);
  bindTableActions();
  syncEnhancedSortControls('payments');
}

function stockAlertTone(item) {
  if (Number(item.qty || 0) <= 0) return 'late';
  if (Number(item.qty || 0) <= Number(item.minQty || 0)) return 'warn';
  return 'ok';
}

function stockAlertLabel(item) {
  if (Number(item.qty || 0) <= 0) return 'Rupture';
  if (Number(item.qty || 0) <= Number(item.minQty || 0)) return 'Sous seuil';
  return 'OK';
}

function stockAlertRank(item) {
  if (Number(item.qty || 0) <= 0) return 3;
  if (Number(item.qty || 0) <= Number(item.minQty || 0)) return 2;
  return 1;
}

function stockItemSortValue(item, field) {
  if (field === 'code') return normalizeText(item.code || '');
  if (field === 'qty') return Number(item.qty || 0) || 0;
  if (field === 'minQty') return Number(item.minQty || 0) || 0;
  if (field === 'category') return normalizeText(item.category || '');
  if (field === 'supplier') return normalizeText(item.supplierName || '');
  if (field === 'requester') return normalizeText(item.requester || '');
  if (field === 'location') return normalizeText(item.location || '');
  if (field === 'alert') return stockAlertRank(item);
  return normalizeText(item.name || '');
}

function filteredStockItems() {
  ensureEnhancedUiState();
  const q = normalizeText($('stockItemsSearch')?.value || '');
  const alertFilter = $('stockItemsAlertFilter')?.value || 'all';
  const category = $('stockItemsCategoryFilter')?.value || 'all';
  const supplier = $('stockItemsSupplierFilter')?.value || 'all';
  const requester = $('stockItemsRequesterFilter')?.value || 'all';
  const location = $('stockItemsLocationFilter')?.value || 'all';
  const sortField = $('stockItemSortField')?.value || state.ui.stockItemSortField || 'name';
  const sortDir = $('stockItemSortDir')?.value || state.ui.stockItemSortDir || 'asc';
  state.ui.stockItemSortField = sortField;
  state.ui.stockItemSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;
  return state.stockItems.filter((item) => {
    const tone = stockAlertTone(item);
    if (alertFilter === 'rupture' && tone !== 'late') return false;
    if (alertFilter === 'low' && tone !== 'warn') return false;
    if (alertFilter === 'ok' && tone !== 'ok') return false;
    if (category !== 'all' && (item.category || '') !== category) return false;
    if (supplier !== 'all' && (item.supplierName || '') !== supplier) return false;
    if (requester !== 'all' && (item.requester || '') !== requester) return false;
    if (location !== 'all' && (item.location || '') !== location) return false;
    if (!q) return true;
    const hay = normalizeText([item.code, item.name, item.category, item.location, item.supplierName, item.requester, item.notes].join(' | '));
    return hay.includes(q);
  }).sort((a, b) => {
    const cmp = compareEnhancedValues(stockItemSortValue(a, sortField), stockItemSortValue(b, sortField), dir);
    if (cmp) return cmp;
    return normalizeText(a.name || '').localeCompare(normalizeText(b.name || ''), 'fr', { numeric: true, sensitivity: 'base' });
  });
}

function stockLogSortValue(log, field) {
  const item = findStockItemById(log.itemId);
  if (field === 'type') return normalizeText(log.type || '');
  if (field === 'item') return normalizeText(item?.name || '');
  if (field === 'qty') return Number(log.qty || 0) || 0;
  if (field === 'person') return normalizeText(log.person || '');
  if (field === 'department') return normalizeText(log.department || '');
  return String(log.date || '');
}

function filteredStockLogs() {
  ensureEnhancedUiState();
  const q = normalizeText($('stockLogsSearch')?.value || '');
  const type = $('stockLogsTypeFilter')?.value || 'all';
  const person = $('stockLogsPersonFilter')?.value || 'all';
  const department = $('stockLogsDepartmentFilter')?.value || 'all';
  const dateFrom = $('stockLogsDateFrom')?.value || '';
  const dateTo = $('stockLogsDateTo')?.value || '';
  const sortField = $('stockLogSortField')?.value || state.ui.stockLogSortField || 'date';
  const sortDir = $('stockLogSortDir')?.value || state.ui.stockLogSortDir || 'desc';
  state.ui.stockLogSortField = sortField;
  state.ui.stockLogSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;
  return state.stockLogs.filter((log) => {
    const item = findStockItemById(log.itemId);
    if (type !== 'all' && log.type !== type) return false;
    if (person !== 'all' && (log.person || '') !== person) return false;
    if (department !== 'all' && (log.department || '') !== department) return false;
    if (dateFrom && String(log.date || '') < dateFrom) return false;
    if (dateTo && String(log.date || '') > dateTo) return false;
    if (!q) return true;
    const hay = normalizeText([log.person, log.department, log.notes, log.type, item?.name, item?.code].join(' | '));
    return hay.includes(q);
  }).sort((a, b) => {
    const cmp = compareEnhancedValues(stockLogSortValue(a, sortField), stockLogSortValue(b, sortField), dir);
    if (cmp) return cmp;
    return String(b.date || '').localeCompare(String(a.date || ''));
  });
}

function renderStockTables() {
  if (!$('stockItemsTableBody') || !$('stockLogsTableBody')) return;
  const items = filteredStockItems();
  const logs = filteredStockLogs();
  $('stockItemsTableBody').innerHTML = items.length ? items.map((item) => {
    const tone = stockAlertTone(item);
    const label = stockAlertLabel(item);
    return `<tr>
      <td>${escapeHtml(item.code || '—')}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category || '—')}</td>
      <td>${escapeHtml(formatCompact(item.qty))} ${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(formatCompact(item.minQty))}</td>
      <td>${escapeHtml(item.location || '—')}</td>
      <td>${escapeHtml(item.supplierName || '—')}</td>
      <td>${escapeHtml(item.requester || '—')}</td>
      <td><span class="alert-pill ${tone}">${escapeHtml(label)}</span></td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-stock', item.id, 'Modifier article')}${iconActionButton('clone', 'log-stock', item.id, 'Nouveau mouvement')}${iconActionButton('delete', 'delete-stock', item.id, 'Supprimer article')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="10" class="muted">Aucun article stock.</td></tr>`;

  $('stockLogsTableBody').innerHTML = logs.length ? logs.map((log) => {
    const item = findStockItemById(log.itemId);
    return `<tr>
      <td>${escapeHtml(formatDate(log.date))}</td>
      <td><span class="status-pill ${log.type === 'out' ? 'warn' : 'ok'}">${log.type === 'out' ? 'Sortie' : 'Entrée'}</span></td>
      <td>${escapeHtml(item?.name || 'Article supprimé')}<span class="table-subline">${escapeHtml(item?.code || '')}</span></td>
      <td>${escapeHtml(String(log.qty))}</td>
      <td>${escapeHtml(log.person || '—')}</td>
      <td>${escapeHtml(log.department || '—')}</td>
      <td>${escapeHtml(log.notes || '—')}</td>
      <td><div class="table-actions icon-actions">${iconActionButton('edit', 'edit-stock-log', log.id, 'Modifier mouvement')}${iconActionButton('delete', 'delete-stock-log', log.id, 'Supprimer mouvement')}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" class="muted">Aucun mouvement stock.</td></tr>`;
  setTableCount('stockItemsCount', items.length);
  setTableCount('stockLogsCount', logs.length);
  bindTableActions();
  syncEnhancedSortControls('stockItems');
  syncEnhancedSortControls('stockLogs');
}

function resetStockItemForm() {
  if (!$('stockItemForm')) return;
  $('stockItemForm').reset();
  if ($('stockItemId')) $('stockItemId').value = '';
  if ($('stockUnit')) $('stockUnit').value = 'U';
  if ($('stockRequester')) $('stockRequester').value = '';
}

function submitStockItemForm(e) {
  e.preventDefault();
  const existing = findStockItemById($('stockItemId').value);
  const payload = normalizeStockItem({
    ...(existing || {}),
    id: existing?.id || $('stockItemId').value || uid('stk'),
    code: $('stockCode').value.trim(),
    name: $('stockName').value.trim(),
    category: $('stockCategory').value.trim(),
    qty: parseFlexibleNumber($('stockQty').value),
    minQty: parseFlexibleNumber($('stockMinQty').value),
    unit: $('stockUnit').value.trim() || 'U',
    location: $('stockLocation').value.trim(),
    supplierName: $('stockSupplier').value.trim(),
    requester: $('stockRequester')?.value.trim() || '',
    notes: $('stockNotes').value.trim(),
    updatedAt: nowIso(),
  });
  if (!payload.name) return showToast('Désignation article requise.');
  const idx = state.stockItems.findIndex((row) => row.id === payload.id);
  if (idx >= 0) state.stockItems.splice(idx, 1, payload);
  else state.stockItems.unshift(payload);
  if (payload.supplierName) ensureSupplier(payload.supplierName);
  if (payload.requester) ensureRequester(payload.requester);
  saveState();
  resetStockItemForm();
  renderApp();
  showToast('Article stock enregistré.');
}

function editStockItem(id) {
  const item = findStockItemById(id); if (!item) return;
  setActiveTab('stock');
  $('stockItemId').value = item.id;
  $('stockCode').value = item.code || '';
  $('stockName').value = item.name || '';
  $('stockCategory').value = item.category || '';
  $('stockQty').value = item.qty || '';
  $('stockMinQty').value = item.minQty || '';
  $('stockUnit').value = item.unit || 'U';
  $('stockLocation').value = item.location || '';
  $('stockSupplier').value = item.supplierName || '';
  if ($('stockRequester')) $('stockRequester').value = item.requester || '';
  $('stockNotes').value = item.notes || '';
}

function computeKpis() {
  const totalBC = state.bcRecords.length;
  const totalAmount = state.bcRecords.reduce((sum, row) => sum + Number(row.amountTTC || row.amount || 0), 0);
  const validatedCount = state.bcRecords.filter((row) => row.daStatus === 'validated').length;
  const draftCount = totalBC - validatedCount;
  const validationRate = totalBC ? Math.round((validatedCount / totalBC) * 100) : 0;
  const lateCount = state.bcRecords.filter((row) => computeDelay(row).cls === 'late').length;
  const warnCount = state.bcRecords.filter((row) => computeDelay(row).cls === 'warn').length;
  const purchaseCount = state.bcRecords.filter((row) => row.type !== 'service').length;
  const serviceCount = totalBC - purchaseCount;
  const pendingPayments = state.payments.filter((row) => row.status !== 'paye').length;
  const paidPayments = state.payments.filter((row) => row.status === 'paye').length;
  const pendingAmount = state.payments.filter((row) => row.status !== 'paye').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const financeClosed = state.payments.filter((row) => row.requestDate && row.paidDate);
  const avgFinanceDelay = financeClosed.length ? Math.round(financeClosed.reduce((sum, row) => sum + Math.max(0, businessDaysBetween(row.requestDate, row.paidDate) || 0), 0) / financeClosed.length) : 0;
  const stockLow = state.stockItems.filter((row) => Number(row.qty || 0) <= Number(row.minQty || 0)).length;
  const stockCritical = state.stockItems.filter((row) => Number(row.qty || 0) <= 0).length;
  const supplierCount = [...new Set(state.bcRecords.map((row) => normalizeText(row.supplierName || '')).filter(Boolean))].length;
  const requesterCount = [...new Set(state.bcRecords.map((row) => normalizeText(row.requester || '')).filter(Boolean))].length;
  const avgBcAmount = totalBC ? totalAmount / totalBC : 0;
  const totalStockQty = state.stockItems.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  return { totalBC, totalAmount, validatedCount, draftCount, validationRate, lateCount, warnCount, purchaseCount, serviceCount, pendingPayments, paidPayments, pendingAmount, avgFinanceDelay, stockLow, stockCritical, supplierCount, requesterCount, avgBcAmount, totalStockQty };
}

function pushMetric(map, key, value = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + value;
}

function buildChartSpecs() {
  ensureEnhancedUiState();
  const metricMode = state.ui.dashboardMetricMode === 'count' ? 'count' : 'amount';
  const metricSuffix = metricMode === 'count' ? 'Nombre de dossiers' : 'Montant DZD';
  const bcByMonth = {};
  const supplierMetric = {};
  const requesterMetric = {};
  const statusCount = {};
  const validationCount = { 'Validé': 0, 'À vérifier': 0 };
  const paymentByMonth = {};
  const paymentStatusCount = {};
  const procurementMix = { Achat: 0, Service: 0 };
  const stockLevels = { OK: 0, 'Sous seuil': 0, Rupture: 0 };
  const stockByCategory = {};
  const delayBuckets = { 'À temps': 0, '1-2 j': 0, '3-5 j': 0, '6 j+': 0 };
  const financeDelayBySupplier = {};
  const bcMetricValue = (row) => metricMode === 'count' ? 1 : Number(row.amountTTC || row.amount || 0);
  const paymentMetricValue = (row) => metricMode === 'count' ? 1 : Number(row.amount || 0);

  let activeBcRecords = state.bcRecords || [];
  const kpiFrom = typeof $ === 'function' ? $('kpiDateFrom')?.value : '';
  const kpiTo = typeof $ === 'function' ? $('kpiDateTo')?.value : '';
  if (kpiFrom || kpiTo) {
    activeBcRecords = activeBcRecords.filter(r => {
      if (kpiFrom && String(r.date || '') < kpiFrom) return false;
      if (kpiTo && String(r.date || '') > kpiTo) return false;
      return true;
    });
  }

  activeBcRecords.forEach((row) => {
    const month = (row.date || 'Sans date').slice(0, 7) || 'Sans date';
    const value = bcMetricValue(row);
    pushMetric(bcByMonth, month, value);
    pushMetric(supplierMetric, row.supplierName || 'Sans fournisseur', value);
    pushMetric(requesterMetric, row.requester || 'Sans demandeur', value);
    pushMetric(procurementMix, row.type === 'service' ? 'Service' : 'Achat', value);
    pushMetric(statusCount, statusLabel(row.status), 1);
    validationCount[row.daStatus === 'validated' ? 'Validé' : 'À vérifier'] += 1;
    const delay = computeDelay(row);
    const numericDelay = parseFlexibleNumber(delay.label);
    if (!['late', 'warn'].includes(delay.cls)) delayBuckets['À temps'] += 1;
    else if (numericDelay <= 2) delayBuckets['1-2 j'] += 1;
    else if (numericDelay <= 5) delayBuckets['3-5 j'] += 1;
    else delayBuckets['6 j+'] += 1;
  });

  state.payments.forEach((row) => {
    const month = (row.requestDate || 'Sans date').slice(0, 7) || 'Sans date';
    pushMetric(paymentByMonth, month, paymentMetricValue(row));
    pushMetric(paymentStatusCount, statusLabel(row.status), 1);
    const bc = findBcById(row.bcId);
    const supplier = bc?.supplierName || 'Sans fournisseur';
    const delay = businessDaysBetween(row.requestDate || todayYmd(), row.paidDate || todayYmd());
    if (!financeDelayBySupplier[supplier]) financeDelayBySupplier[supplier] = { total: 0, count: 0 };
    financeDelayBySupplier[supplier].total += Math.max(0, delay || 0);
    financeDelayBySupplier[supplier].count += 1;
  });

  state.stockItems.forEach((item) => {
    if (Number(item.qty || 0) <= 0) stockLevels.Rupture += 1;
    else if (Number(item.qty || 0) <= Number(item.minQty || 0)) stockLevels['Sous seuil'] += 1;
    else stockLevels.OK += 1;
    pushMetric(stockByCategory, item.category || 'Sans catégorie', Number(item.qty || 0));
  });

  const financeDelayRows = Object.entries(financeDelayBySupplier)
    .map(([label, stat]) => [label, stat.count ? Math.round(stat.total / stat.count) : 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    monthlyBc: { key: 'monthlyBc', title: metricMode === 'count' ? 'BC par mois' : 'Montant BC par mois', subtitle: metricSuffix, type: metricMode === 'count' ? 'line' : 'bar', headers: ['Mois', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(bcByMonth).sort((a, b) => a[0].localeCompare(b[0])) },
    supplierTop: { key: 'supplierTop', title: 'Top fournisseurs', subtitle: metricMode === 'count' ? 'Volume BC' : 'Dépense TTC', type: 'hbar', headers: ['Fournisseur', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(supplierMetric).sort((a, b) => b[1] - a[1]).slice(0, 8) },
    requesterTop: { key: 'requesterTop', title: 'Top demandeurs', subtitle: metricMode === 'count' ? 'Nombre de BC' : 'Montant piloté', type: 'hbar', headers: ['Demandeur', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(requesterMetric).sort((a, b) => b[1] - a[1]).slice(0, 8) },
    procurementMix: { key: 'procurementMix', title: 'Mix achats / services', subtitle: metricMode === 'count' ? 'Répartition volume' : 'Répartition montant', type: 'donut', headers: ['Type', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(procurementMix) },
    statusBc: { key: 'statusBc', title: 'Répartition statuts BC', subtitle: 'Nombre de lignes', type: 'donut', headers: ['Statut', 'Nombre'], rows: Object.entries(statusCount) },
    validationDa: { key: 'validationDa', title: 'Validation BC → DA', subtitle: 'Suivi validation', type: 'donut', headers: ['Validation', 'Nombre'], rows: Object.entries(validationCount) },
    paymentFlow: { key: 'paymentFlow', title: metricMode === 'count' ? 'Paiements créés par mois' : 'Demandes de paiement par mois', subtitle: metricMode === 'count' ? 'Nombre de demandes' : 'Montant demandé', type: 'line', headers: ['Mois', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(paymentByMonth).sort((a, b) => a[0].localeCompare(b[0])) },
    paymentStatus: { key: 'paymentStatus', title: 'Statut des paiements', subtitle: 'Pipeline finance', type: 'donut', headers: ['Statut', 'Nombre'], rows: Object.entries(paymentStatusCount) },
    financeDelay: { key: 'financeDelay', title: 'Délai finance moyen par fournisseur', subtitle: 'Jours ouvrables', type: 'hbar', headers: ['Fournisseur', 'Jours'], rows: financeDelayRows },
    deliveryDelay: { key: 'deliveryDelay', title: 'Répartition des délais BC', subtitle: 'Dossiers BC', type: 'bar', headers: ['Classe', 'Nombre'], rows: Object.entries(delayBuckets) },
    stockAlert: { key: 'stockAlert', title: 'Niveaux stock', subtitle: 'Etat du magasin', type: 'bar', headers: ['Niveau', 'Nombre'], rows: Object.entries(stockLevels) },
    stockCategories: { key: 'stockCategories', title: 'Stock par catégorie', subtitle: 'Quantité disponible', type: 'hbar', headers: ['Catégorie', 'Quantité'], rows: Object.entries(stockByCategory).sort((a, b) => b[1] - a[1]).slice(0, 8) },
  };
}

function renderCharts() {
  state.chartSpecs = buildChartSpecs();
  const container = $('dashboardCharts');
  container.innerHTML = Object.values(state.chartSpecs).map((spec) => `
    <article class="chart-card">
      <div class="chart-head">
        <div>
          <h3>${escapeHtml(spec.title)}</h3>
          <p class="chart-subtitle">${escapeHtml(spec.subtitle)}</p>
        </div>
        <div class="chart-head-actions">
          <button class="page-chip" type="button" data-chart-export="${spec.key}">XLSX</button>
          <button class="page-chip" type="button" data-chart-open="${spec.key}">Focus</button>
        </div>
      </div>
      <div class="chart-meta-row">
        <span class="chart-meta">Survol = détail</span>
        <span class="chart-meta">${escapeHtml(String(spec.rows.length))} point(s)</span>
      </div>
      <div class="chart-canvas-wrap">
        <canvas id="chart_${spec.key}" data-chart-key="${spec.key}"></canvas>
        <div class="chart-tooltip" id="tooltip_${spec.key}"></div>
      </div>
    </article>`).join('');
  Object.values(state.chartSpecs).forEach((spec) => mountChart(spec, `chart_${spec.key}`, `tooltip_${spec.key}`));
}

function renderKpi() {
  ensureEnhancedUiState();
  const kpi = computeKpis();
  $('kpiGrid').innerHTML = [
    { tone: 'primary', label: 'BC suivies', value: kpi.totalBC, hint: `${kpi.validatedCount} validées · ${kpi.draftCount} à vérifier` },
    { tone: 'primary', label: 'Montant total TTC', value: formatMoney(kpi.totalAmount), hint: `${kpi.purchaseCount} achats · ${kpi.serviceCount} services` },
    { tone: kpi.validationRate >= 85 ? 'success' : 'warn', label: 'Taux validation DA', value: `${kpi.validationRate}%`, hint: `${kpi.validatedCount} / ${kpi.totalBC || 0} dossiers` },
    { tone: kpi.lateCount ? 'danger' : 'success', label: 'BC en retard', value: kpi.lateCount, hint: `${kpi.warnCount} proche(s) de l’échéance` },
    { tone: kpi.pendingPayments ? 'warn' : 'success', label: 'Paiements ouverts', value: formatMoney(kpi.pendingAmount), hint: `${kpi.pendingPayments} ouvert(s) · ${kpi.paidPayments} payé(s)` },
    { tone: kpi.avgFinanceDelay > (state.settings.financeDays || 0) ? 'warn' : 'info', label: 'Délai finance moyen', value: `${kpi.avgFinanceDelay} j`, hint: `objectif ${state.settings.financeDays || 0} j ouvrables` },
    { tone: kpi.stockCritical ? 'danger' : (kpi.stockLow ? 'warn' : 'success'), label: 'Alertes stock', value: kpi.stockLow, hint: `${kpi.stockCritical} rupture(s) · ${state.stockItems.length} article(s)` },
    { tone: 'info', label: 'Panier moyen BC', value: formatMoney(kpi.avgBcAmount), hint: `${kpi.supplierCount} fournisseur(s) · ${kpi.requesterCount} demandeur(s)` },
  ].map((card) => `<div class="kpi-card ${card.tone}"><div class="label">${escapeHtml(card.label)}</div><div class="value">${escapeHtml(String(card.value))}</div><div class="hint">${escapeHtml(card.hint)}</div></div>`).join('');

  const attention = [];
  state.bcRecords.filter((row) => computeDelay(row).cls === 'late').slice(0, 4).forEach((row) => {
    const delay = computeDelay(row);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.ref)} — ${escapeHtml(row.supplierName || 'Sans fournisseur')}</strong><span>${escapeHtml(delay.label)} · promise ${escapeHtml(formatDate(row.promisedDate))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(row.requester || 'Sans demandeur')}</span></div></div>`);
  });
  state.payments.filter((row) => row.status !== 'paye').slice(0, 3).forEach((row) => {
    const bc = findBcById(row.bcId);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.paymentRef || 'Demande paiement')}</strong><span>${escapeHtml(bc?.supplierName || 'Sans fournisseur')} · ${escapeHtml(formatMoney(row.amount || 0, 'DZD'))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(formatDate(row.requestDate))}</span></div></div>`);
  });
  state.stockItems.filter((item) => Number(item.qty || 0) <= Number(item.minQty || 0)).slice(0, 3).forEach((item) => {
    attention.push(`<div class="focus-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code || 'Sans code')} · ${escapeHtml(item.location || 'Sans emplacement')}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(stockAlertLabel(item))}</span><span class="mini-tag">${escapeHtml(String(item.qty))} ${escapeHtml(item.unit || '')}</span></div></div>`);
  });
  $('focusList').innerHTML = attention.length ? attention.join('') : '<div class="focus-item"><strong>RAS</strong><span>Aucun point critique en ce moment.</span></div>';

  $('summaryList').innerHTML = [
    { title: 'Prochaine réf BC', text: nextBcRefPreview() },
    { title: 'Prochaine réf DA', text: nextDaRefPreview() },
    { title: 'Vue dashboard', text: state.ui.dashboardMetricMode === 'count' ? 'Volumes / dossiers' : 'Montants / valeur' },
    { title: 'Stock total', text: `${formatCompact(kpi.totalStockQty)} unité(s)` },
  ].map((row) => `<div class="summary-item"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.text)}</span></div>`).join('');

  renderCharts();
  syncDashboardMetricButtons();
}

function openChartModal(key) {
  const spec = state.chartSpecs[key];
  if (!spec) return;
  state.chartModalKey = key;
  $('chartModalTitle').textContent = spec.title;
  $('chartModalSubtitle').textContent = spec.subtitle;
  $('chartModalBackdrop').classList.remove('hidden');
  mountChart(spec, 'chartModalCanvas', 'chartModalTooltip');
}

function closeChartModal() {
  $('chartModalBackdrop').classList.add('hidden');
  const tip = $('chartModalTooltip');
  if (tip) {
    tip.style.opacity = 0;
    tip.style.transform = 'translate(-9999px, -9999px)';
  }
  state.chartModalKey = null;
}

function exportKpiWorkbook() {
  const kpi = computeKpis();
  exportWorkbook(`kpi_${todayYmd()}.xlsx`, [{ name: 'KPI', headers: ['Indicateur', 'Valeur'], rows: [
    ['BC suivies', kpi.totalBC],
    ['Montant total', kpi.totalAmount],
    ['BC validées', kpi.validatedCount],
    ['BC à vérifier', kpi.draftCount],
    ['Taux validation DA', `${kpi.validationRate}%`],
    ['BC en retard', kpi.lateCount],
    ['Paiements ouverts', kpi.pendingPayments],
    ['Montant en attente', kpi.pendingAmount],
    ['Délai finance moyen', kpi.avgFinanceDelay],
    ['Alertes stock', kpi.stockLow],
    ['Ruptures stock', kpi.stockCritical],
    ['Panier moyen BC', kpi.avgBcAmount],
  ] }]);
  showToast('KPI exportés.');
}

function exportPaymentsWorkbook() {
  const rows = filteredPayments().map((row) => {
    const bc = findBcById(row.bcId);
    return [row.paymentRef, bc?.ref || '', bc?.supplierName || '', row.requestDate, row.paidDate, row.amount, row.mode, row.transactionRef, statusLabel(row.status), row.notes];
  });
  exportWorkbook(`paiements_${todayYmd()}.xlsx`, [{ name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes'], rows }]);
  showToast('Paiements exportés.');
}

function exportStockWorkbook() {
  const items = filteredStockItems().map((row) => [row.code, row.name, row.category, row.qty, row.minQty, row.unit, row.location, row.supplierName, row.requester, row.notes]);
  const logs = filteredStockLogs().map((row) => {
    const item = findStockItemById(row.itemId);
    return [row.date, row.type, item?.code || '', item?.name || '', row.qty, row.person, row.department, row.notes];
  });
  exportWorkbook(`stock_${todayYmd()}.xlsx`, [
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Demandeur', 'Notes'], rows: items },
    { name: 'Historique_Stock', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: logs },
  ]);
  showToast('Stock exporté.');
}

function exportChartsPackWorkbook() {
  state.chartSpecs = buildChartSpecs();
  exportWorkbook(`pack_graphiques_${todayYmd()}.xlsx`, Object.values(state.chartSpecs).map((spec) => ({ name: spec.title, headers: spec.headers, rows: spec.rows })));
  showToast('Pack graphiques exporté.');
}

function exportFullPack() {
  state.chartSpecs = buildChartSpecs();
  exportWorkbook(`pack_complet_${todayYmd()}.xlsx`, [
    { name: 'Suivi_BC', headers: ['Réf BC', 'Réf DA', 'Validation DA', 'Date BC', 'Fournisseur', 'Type', 'Montant TTC', 'Statut BC', 'Date promise', 'Date réception', 'Date service', 'Demandeur', 'Conditions paiement', 'Commentaire', 'Notes', 'Source'], rows: state.bcRecords.map((row) => [row.ref, row.daRef, validationLabel(row), row.date, row.supplierName, row.type, row.amountTTC || row.amount, statusLabel(row.status), row.promisedDate, row.goodsReceivedDate, row.serviceDoneDate, row.requester, row.paymentTerms, row.comments, row.notes, row.sourceFile]) },
    { name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes'], rows: state.payments.map((row) => { const bc = findBcById(row.bcId); return [row.paymentRef, bc?.ref || '', bc?.supplierName || '', row.requestDate, row.paidDate, row.amount, row.mode, row.transactionRef, statusLabel(row.status), row.notes]; }) },
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Demandeur', 'Notes'], rows: state.stockItems.map((row) => [row.code, row.name, row.category, row.qty, row.minQty, row.unit, row.location, row.supplierName, row.requester, row.notes]) },
    { name: 'Historique_Stock', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: state.stockLogs.map((row) => { const item = findStockItemById(row.itemId); return [row.date, row.type, item?.code || '', item?.name || '', row.qty, row.person, row.department, row.notes]; }) },
    ...Object.values(state.chartSpecs).map((spec) => ({ name: spec.title, headers: spec.headers, rows: spec.rows })),
  ]);
  showToast('Pack complet exporté.');
}

function downloadStockTemplate() {
  exportWorkbook(`modele_stock_${todayYmd()}.xlsx`, [
    {
      name: 'Stock',
      headers: ['Code article', 'Désignation', 'Catégorie', 'Fournisseur', 'Demandeur', 'Quantité', 'Seuil mini', 'Unité', 'Emplacement', 'Notes'],
      rows: [['STK-001', 'Papier A4', 'Bureau', 'Fournisseur A', 'Service RH', 120, 40, 'ramette', 'Magasin A', 'Exemple import']],
    },
    {
      name: 'Guide',
      headers: ['Colonne', 'Utilité'],
      rows: [
        ['Code article', 'clé recommandée pour mettre à jour un article existant'],
        ['Désignation', 'nom de l’article'],
        ['Fournisseur', 'nom fournisseur pour les filtres et exports'],
        ['Demandeur', 'responsable ou service demandeur'],
        ['Quantité', 'stock actuel'],
        ['Seuil mini', 'niveau d’alerte'],
      ],
    },
  ]);
  showToast('Modèle stock généré.');
}

function pickSheetRows(workbook, preferredNames = []) {
  if (!workbook?.SheetNames?.length || typeof XLSX === 'undefined') return [];
  const preferred = preferredNames.map((name) => normalizeText(name));
  const chosenName = workbook.SheetNames.find((name) => preferred.includes(normalizeText(name))) || workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[chosenName], { defval: '', raw: false, blankrows: false });
}

function rowValueByAliases(row, aliases) {
  const wanted = aliases.map((alias) => normalizeText(alias));
  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeText(key);
    if (wanted.includes(normalizedKey)) return value;
    if (wanted.some((alias) => normalizedKey.includes(alias))) return value;
  }
  return '';
}

function parseStockImportRows(workbook) {
  const rows = pickSheetRows(workbook, ['Stock', 'Base stock', 'Articles', 'Inventaire']);
  return rows.map((row) => ({
    code: cellText(rowValueByAliases(row, ['Code article', 'Code', 'Réf article', 'Ref article', 'Reference', 'Article code'])),
    name: cellText(rowValueByAliases(row, ['Désignation', 'Designation', 'Article', 'Nom article', 'Item', 'Libellé', 'Libelle'])),
    category: cellText(rowValueByAliases(row, ['Catégorie', 'Categorie', 'Famille', 'Category'])),
    supplierName: cellText(rowValueByAliases(row, ['Fournisseur', 'Supplier'])),
    requester: cellText(rowValueByAliases(row, ['Demandeur', 'Requester', 'Référent', 'Referent', 'Responsable'])),
    qty: parseFlexibleNumber(rowValueByAliases(row, ['Quantité', 'Quantite', 'Qty', 'Stock', 'Stock actuel', 'Qte', 'Qté'])),
    minQty: parseFlexibleNumber(rowValueByAliases(row, ['Seuil mini', 'Mini', 'Min', 'Stock limit', 'Stock minimum', 'Seuil'])),
    unit: cellText(rowValueByAliases(row, ['Unité', 'Unite', 'Unit', 'UOM'])) || 'U',
    location: cellText(rowValueByAliases(row, ['Emplacement', 'Location', 'Magasin'])),
    notes: cellText(rowValueByAliases(row, ['Notes', 'Observation', 'Commentaire'])),
  })).filter((row) => row.code || row.name || row.supplierName || row.qty || row.minQty);
}

function findMatchingStockItem(importedRow) {
  if (importedRow.code) {
    const byCode = state.stockItems.find((item) => normalizeText(item.code || '') === normalizeText(importedRow.code));
    if (byCode) return byCode;
  }
  if (importedRow.name) {
    return state.stockItems.find((item) => normalizeText(item.name || '') === normalizeText(importedRow.name) && normalizeText(item.supplierName || '') === normalizeText(importedRow.supplierName || item.supplierName || ''));
  }
  return null;
}

function applyImportedStockRows(rows, updateExisting = true) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const warnings = [];
  rows.forEach((importedRow, index) => {
    if (!importedRow.name) {
      warnings.push(`Ligne ${index + 2} ignorée : désignation manquante.`);
      skipped += 1;
      return;
    }
    const existing = findMatchingStockItem(importedRow);
    const payload = normalizeStockItem({
      ...(existing || {}),
      id: existing?.id || uid('stk'),
      code: importedRow.code || existing?.code || '',
      name: importedRow.name || existing?.name || '',
      category: importedRow.category || existing?.category || '',
      qty: Number.isFinite(Number(importedRow.qty)) ? Number(importedRow.qty) : Number(existing?.qty || 0),
      minQty: Number.isFinite(Number(importedRow.minQty)) ? Number(importedRow.minQty) : Number(existing?.minQty || 0),
      unit: importedRow.unit || existing?.unit || 'U',
      location: importedRow.location || existing?.location || '',
      supplierName: importedRow.supplierName || existing?.supplierName || '',
      requester: importedRow.requester || existing?.requester || '',
      notes: importedRow.notes || existing?.notes || '',
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
    if (existing) {
      if (!updateExisting) {
        skipped += 1;
        return;
      }
      const idx = state.stockItems.findIndex((row) => row.id === existing.id);
      if (idx >= 0) state.stockItems.splice(idx, 1, payload);
      updated += 1;
    } else {
      state.stockItems.unshift(payload);
      created += 1;
    }
    if (payload.supplierName) ensureSupplier(payload.supplierName);
    if (payload.requester) ensureRequester(payload.requester);
  });
  return { created, updated, skipped, warnings };
}

async function importStockWorkbookFile() {
  const file = $('stockImportInput')?.files?.[0];
  if (!file) return showToast('Choisissez un fichier stock.');
  if (typeof XLSX === 'undefined') return showToast('Module Excel indisponible.');
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows = parseStockImportRows(workbook);
    if (!rows.length) {
      $('stockImportResult').textContent = 'Aucune ligne exploitable trouvée dans le fichier.';
      return showToast('Fichier stock vide.');
    }
    const result = applyImportedStockRows(rows, Boolean($('stockImportUpdateExisting')?.checked));
    saveState();
    $('stockImportInput').value = '';
    $('stockImportResult').innerHTML = `${result.created} créé(s), ${result.updated} mis à jour, ${result.skipped} ignoré(s).${result.warnings.length ? `<br>${result.warnings.map(escapeHtml).join('<br>')}` : ''}`;
    renderApp();
    showToast('Import stock terminé.');
  } catch (err) {
    console.error(err);
    $('stockImportResult').textContent = `Erreur import stock : ${err.message}`;
    showToast('Erreur lors de l’import stock.');
  }
}

function setupCollapsiblePanels() {
  const prefs = loadPanelPrefs();
  $$('.panel').forEach((panel) => {
    const titleRow = panel.querySelector('.panel-title-row');
    if (!titleRow) return;
    let btn = titleRow.querySelector('.panel-toggle-btn');
    const key = panelStorageKey(panel);
    panel.dataset.panelKey = key;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-toggle-btn';
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '<span class="panel-toggle-label">Réduire</span><span class="panel-toggle-icon" aria-hidden="true">−</span>';
      titleRow.appendChild(btn);
    }
    const apply = () => {
      const collapsed = Boolean(prefs[key]);
      panel.classList.toggle('panel-collapsed', collapsed);
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      const label = collapsed ? 'Ouvrir' : 'Réduire';
      const textNode = btn.querySelector('.panel-toggle-label');
      const iconNode = btn.querySelector('.panel-toggle-icon');
      if (textNode) textNode.textContent = label;
      if (iconNode) iconNode.textContent = collapsed ? '+' : '−';
    };
    btn.onclick = () => {
      prefs[key] = !prefs[key];
      savePanelPrefs(prefs);
      apply();
      refreshPageCollapseButtons();
    };
    apply();
  });
  refreshPageCollapseButtons();
}

function togglePagePanels(pageId) {
  const page = $(pageId);
  if (!page) return;
  const prefs = loadPanelPrefs();
  const panels = $$('.panel', page).filter((panel) => panel.querySelector('.panel-title-row'));
  if (!panels.length) return;
  const shouldCollapse = panels.some((panel) => !prefs[panelStorageKey(panel)]);
  panels.forEach((panel) => {
    prefs[panelStorageKey(panel)] = shouldCollapse;
  });
  savePanelPrefs(prefs);
  setupCollapsiblePanels();
}

function refreshPageCollapseButtons() {
  const prefs = loadPanelPrefs();
  $$('[data-collapse-page]').forEach((btn) => {
    const page = $(btn.dataset.collapsePage);
    if (!page) return;
    const panels = $$('.panel', page).filter((panel) => panel.querySelector('.panel-title-row'));
    const allCollapsed = panels.length && panels.every((panel) => Boolean(prefs[panelStorageKey(panel)]));
    btn.classList.toggle('active', allCollapsed);
    const label = btn.querySelector('.btn-collapse-label');
    const icon = btn.querySelector('.btn-collapse-icon');
    if (label) label.textContent = allCollapsed ? 'Ouvrir les blocs' : 'Réduire les blocs';
    if (icon) icon.textContent = allCollapsed ? '+' : '−';
  });
}

function renderActiveTab() {
  let safeTab = state.activeTab;
  if (safeTab === 'stock' || !safeTab) {
    safeTab = 'followup';
    state.activeTab = safeTab;
  }
  $$('#tabbar .tab, .sa-top-tab.tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === safeTab));
  $$('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${safeTab}`));
  try {
    if (state.activeTab === 'kpi') renderKpi();
    if (state.activeTab === 'followup') { refreshFollowupDefaults(); renderImportHealthBanner(); renderFollowupTable(); }
    if (state.activeTab === 'payments') { refreshPaymentFilterOptions(); renderPaymentsTable(); }
    if (state.activeTab === 'finance') {
      if (window.ApproNextGen && typeof ApproNextGen.renderFinancialIntelligenceCockpit === 'function') {
        ApproNextGen.renderFinancialIntelligenceCockpit();
      }
    }
    if (state.activeTab === 'smart-match') {
      if (window.SmartMatch) SmartMatch.run();
    }
    if (state.activeTab === 'reports') renderReports();
    if (state.activeTab === 'settings') fillSettingsScreen();
    syncEnhancedSortControls();
  } catch (err) {
    console.warn('[renderActiveTab] Error in tab render:', err);
  }
}
if (typeof window !== 'undefined') window.renderActiveTab = renderActiveTab;

function renderApp() {
  ensureEnhancedUiState();
  enhanceStaticLayout();
  setTheme(state.settings.theme || 'light');
  applyBranding();
  fillReferenceLists();
  refreshSelectOptions();
  refreshFollowupFilterOptions();
  refreshPaymentFilterOptions();
  refreshStockFilterOptions();
  fillSettingsScreen();
  renderActiveTab();
  setupCollapsiblePanels();
}

function bindEnhancedEvents() {
  if (document.body.dataset.enhancedBindings === '1') return;
  document.body.dataset.enhancedBindings = '1';

  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('#tabbar .tab[data-tab], .sa-top-tab.tab[data-tab]');
    if (tabBtn && tabBtn.dataset.tab) {
      e.preventDefault();
      setActiveTab(tabBtn.dataset.tab);
      return;
    }
    const sortBtn = e.target.closest('.th-sort-btn');
    if (sortBtn) {
      setSortState(sortBtn.dataset.sortGroup, sortBtn.dataset.sortField);
      return;
    }
    const collapseBtn = e.target.closest('[data-collapse-page]');
    if (collapseBtn) {
      togglePagePanels(collapseBtn.dataset.collapsePage);
      return;
    }
    const chartOpenBtn = e.target.closest('[data-chart-open]');
    if (chartOpenBtn) {
      openChartModal(chartOpenBtn.dataset.chartOpen);
      return;
    }
    const chartExportBtn = e.target.closest('[data-chart-export]');
    if (chartExportBtn) {
      const spec = state.chartSpecs[chartExportBtn.dataset.chartExport];
      if (spec) exportSingleDataset(spec);
      return;
    }
    const metricBtn = e.target.closest('[data-dashboard-metric]');
    if (metricBtn) {
      ensureEnhancedUiState();
      state.ui.dashboardMetricMode = metricBtn.dataset.dashboardMetric === 'count' ? 'count' : 'amount';
      renderKpi();
      syncDashboardMetricButtons();
    }
  });

  const bindInputRender = (ids, fn, mode = 'change') => ids.forEach((id) => $(id)?.addEventListener(mode, fn));
  $('themeSelect')?.addEventListener('change', () => setTimeout(() => renderApp(), 0));

  bindInputRender(['paymentSearch'], debounce(renderPaymentsTable, 120), 'input');
  bindInputRender(['paymentFilterStatus', 'paymentFilterMode', 'paymentFilterSupplier', 'paymentDateFrom', 'paymentDateTo', 'paymentSortField', 'paymentSortDir'], renderPaymentsTable);
  $('resetPaymentFiltersBtn')?.addEventListener('click', resetPaymentFilters);

  bindInputRender(['stockItemsSearch'], debounce(renderStockTables, 120), 'input');
  bindInputRender(['stockItemsAlertFilter', 'stockItemsCategoryFilter', 'stockItemsSupplierFilter', 'stockItemsRequesterFilter', 'stockItemsLocationFilter', 'stockItemSortField', 'stockItemSortDir'], renderStockTables);
  $('resetStockItemFiltersBtn')?.addEventListener('click', resetStockItemFilters);

  bindInputRender(['stockLogsSearch'], debounce(renderStockTables, 120), 'input');
  bindInputRender(['stockLogsTypeFilter', 'stockLogsPersonFilter', 'stockLogsDepartmentFilter', 'stockLogsDateFrom', 'stockLogsDateTo', 'stockLogSortField', 'stockLogSortDir'], renderStockTables);
  $('resetStockLogFiltersBtn')?.addEventListener('click', resetStockLogFilters);

  $('downloadStockTemplateBtn')?.addEventListener('click', downloadStockTemplate);
  $('importStockBtn')?.addEventListener('click', importStockWorkbookFile);

  ['followupSortField', 'followupSortDir'].forEach((id) => $(id)?.addEventListener('change', () => syncEnhancedSortControls('followup')));
}

function premiumEnhancementBoot() {
  ensureEnhancedUiState();
  enhanceStaticLayout();
  bindEnhancedEvents();
  syncEnhancedSortControls();
  if (state.session) renderApp();
}

premiumEnhancementBoot();

/* ===== Stability patch v3: runtime fix, richer charts, safer stock import ===== */

function uiPrefsStorageKey() {
  return 'suivi_compact_ui_v3';
}

function loadUiPrefs() {
  try {
    return JSON.parse(localStorage.getItem(uiPrefsStorageKey()) || '{}') || {};
  } catch {
    return {};
  }
}

function saveUiPrefs() {
  try {
    localStorage.setItem(uiPrefsStorageKey(), JSON.stringify(state.ui || {}));
  } catch {}
}

function getEnhancedSortConfigSafe() {
  try {
    return ENHANCED_SORT_CONFIG && typeof ENHANCED_SORT_CONFIG === 'object' ? ENHANCED_SORT_CONFIG : null;
  } catch {
    return null;
  }
}

function setupState() {
  Object.assign(state, loadState());
  state.session = loadSession();
  state.settings.bcSequence = Math.max(Number(state.settings.bcSequence || 1), highestBcSequence() + 1);
  state.settings.daSequence = Math.max(Number(state.settings.daSequence || 1), highestDaSequence() + 1);
  state.ui = {
    followupPage: 1,
    followupPageSize: 10,
    followupSortField: 'date',
    followupSortDir: 'desc',
    paymentSortField: 'requestDate',
    paymentSortDir: 'desc',
    stockItemSortField: 'name',
    stockItemSortDir: 'asc',
    stockLogSortField: 'date',
    stockLogSortDir: 'desc',
    dashboardMetricMode: 'amount',
    ...(state.ui || {}),
    ...loadUiPrefs(),
  };
  if (!['amount', 'count'].includes(state.ui.dashboardMetricMode)) state.ui.dashboardMetricMode = 'amount';
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify({
      settings: state.settings,
      users: state.users,
      suppliers: state.suppliers,
      requesters: state.requesters,
      bcRecords: state.bcRecords,
      payments: state.payments,
      stockItems: state.stockItems,
      stockLogs: state.stockLogs,
      holidays: state.holidays,
      ui: state.ui,
    }));
  } catch (err) {
    console.error(err);
  }
  saveUiPrefs();
}

function ensureEnhancedUiState() {
  state.ui = {
    followupPage: 1,
    followupPageSize: 10,
    followupSortField: 'date',
    followupSortDir: 'desc',
    paymentSortField: 'requestDate',
    paymentSortDir: 'desc',
    stockItemSortField: 'name',
    stockItemSortDir: 'asc',
    stockLogSortField: 'date',
    stockLogSortDir: 'desc',
    dashboardMetricMode: 'amount',
    ...loadUiPrefs(),
    ...(state.ui || {}),
  };
  if (!['amount', 'count'].includes(state.ui.dashboardMetricMode)) state.ui.dashboardMetricMode = 'amount';
}

function syncDashboardMetricButtons() {
  ensureEnhancedUiState();
  $$('[data-dashboard-metric]').forEach((btn) => btn.classList.toggle('active', btn.dataset.dashboardMetric === state.ui.dashboardMetricMode));
  saveUiPrefs();
}

function setSortState(group, field) {
  ensureEnhancedUiState();
  const config = getEnhancedSortConfigSafe();
  const cfg = config?.[group];
  if (!cfg) return;
  if (state.ui[cfg.fieldKey] === field) state.ui[cfg.dirKey] = state.ui[cfg.dirKey] === 'asc' ? 'desc' : 'asc';
  else {
    state.ui[cfg.fieldKey] = field;
    state.ui[cfg.dirKey] = defaultSortDirection(field);
  }
  const fieldSelect = $(cfg.fieldSelect);
  const dirSelect = $(cfg.dirSelect);
  if (fieldSelect) fieldSelect.value = state.ui[cfg.fieldKey];
  if (dirSelect) dirSelect.value = state.ui[cfg.dirKey];
  saveUiPrefs();
  cfg.render();
  syncEnhancedSortControls(group);
}

function syncEnhancedSortControls(group) {
  const config = getEnhancedSortConfigSafe();
  if (!config) return;
  ensureEnhancedUiState();
  const groups = group ? [group] : Object.keys(config);
  groups.forEach((name) => {
    const cfg = config[name];
    if (!cfg) return;
    const field = state.ui[cfg.fieldKey];
    const dir = state.ui[cfg.dirKey];
    const fieldSelect = $(cfg.fieldSelect);
    const dirSelect = $(cfg.dirSelect);
    if (fieldSelect && field) fieldSelect.value = field;
    if (dirSelect && dir) dirSelect.value = dir;
    $$(`.th-sort-btn[data-sort-group="${name}"]`).forEach((btn) => {
      const active = btn.dataset.sortField === field;
      btn.classList.toggle('active', active);
      btn.dataset.direction = active ? dir : 'none';
      const ind = btn.querySelector('.th-sort-indicator');
      if (ind) ind.textContent = active ? (dir === 'asc' ? '↑' : '↓') : '↕';
    });
  });
  syncDashboardMetricButtons();
  if (typeof refreshPageCollapseButtons === 'function') refreshPageCollapseButtons();
  saveUiPrefs();
}

function sortComparableBc(row, sortField) {
  switch (sortField) {
    case 'ref':
      return Number(extractBcSerial(row.ref) || 0) || normalizeText(row.ref || '');
    case 'daRef':
      return Number(extractDaSerial(row.daRef) || 0) || normalizeText(row.daRef || '');
    case 'supplier':
      return normalizeText(row.supplierName || '');
    case 'requester':
      return normalizeText(row.requester || '');
    case 'department':
      return normalizeText(row.department || row.service || '');
    case 'type':
      return normalizeText(row.type === 'service' ? 'Service' : 'Achat');
    case 'amountHT':
      return Number(row.amountHT || (row.amountTTC ? Math.round(row.amountTTC / 1.19) : 0)) || 0;
    case 'amount':
      return Number(row.amountTTC || row.amount || 0) || 0;
    case 'status':
      return normalizeText(statusLabel(row.status));
    case 'goodsReceivedDate':
      return String(row.goodsReceivedDate || row.serviceDoneDate || row.promisedDate || '');
    case 'promisedDate':
      return String(row.promisedDate || '');
    case 'date':
    default:
      return String(row.date || '');
  }
}

function parseOptionalFlexibleNumber(value) {
  const raw = cellText(value);
  if (!/[0-9]/.test(raw)) return null;
  return parseFlexibleNumber(raw);
}

function detectTextDelimiter(line) {
  const sample = String(line || '');
  const scores = [
    [';', (sample.match(/;/g) || []).length],
    [',', (sample.match(/,/g) || []).length],
    ['\t', (sample.match(/\t/g) || []).length],
  ].sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : ';';
}

function parseDelimitedText(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = detectTextDelimiter(lines[0]);
  const parseLine = (line) => {
    const out = [];
    let value = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        out.push(value);
        value = '';
      } else {
        value += char;
      }
    }
    out.push(value);
    return out.map((cell) => cell.trim());
  };
  const headers = parseLine(lines.shift());
  return lines.map((line) => {
    const cells = parseLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header || `col_${index + 1}`] = cells[index] ?? '';
    });
    return row;
  });
}

function parseStockImportRows(source) {
  const rows = Array.isArray(source)
    ? source
    : pickSheetRows(source, ['Stock', 'Base stock', 'Articles', 'Inventaire']);
  return rows.map((row) => ({
    code: cellText(rowValueByAliases(row, ['Code article', 'Code', 'Réf article', 'Ref article', 'Reference', 'Article code'])),
    name: cellText(rowValueByAliases(row, ['Désignation', 'Designation', 'Article', 'Nom article', 'Item', 'Libellé', 'Libelle'])),
    category: cellText(rowValueByAliases(row, ['Catégorie', 'Categorie', 'Famille', 'Category'])),
    supplierName: cellText(rowValueByAliases(row, ['Fournisseur', 'Supplier'])),
    requester: cellText(rowValueByAliases(row, ['Demandeur', 'Requester', 'Référent', 'Referent', 'Responsable'])),
    qty: parseOptionalFlexibleNumber(rowValueByAliases(row, ['Quantité', 'Quantite', 'Qty', 'Stock', 'Stock actuel', 'Qte', 'Qté'])),
    minQty: parseOptionalFlexibleNumber(rowValueByAliases(row, ['Seuil mini', 'Mini', 'Min', 'Stock limit', 'Stock minimum', 'Seuil', 'Limit'])),
    unit: cellText(rowValueByAliases(row, ['Unité', 'Unite', 'Unit', 'UOM'])) || 'U',
    location: cellText(rowValueByAliases(row, ['Emplacement', 'Location', 'Magasin'])),
    notes: cellText(rowValueByAliases(row, ['Notes', 'Observation', 'Commentaire'])),
  })).filter((row) => row.code || row.name || row.category || row.supplierName || row.requester || row.qty != null || row.minQty != null || row.location || row.notes);
}

function applyImportedStockRows(rows, updateExisting = true) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const warnings = [];
  rows.forEach((importedRow, index) => {
    if (!importedRow.name) {
      warnings.push(`Ligne ${index + 2} ignorée : désignation manquante.`);
      skipped += 1;
      return;
    }
    const existing = findMatchingStockItem(importedRow);
    const payload = normalizeStockItem({
      ...(existing || {}),
      id: existing?.id || uid('stk'),
      code: importedRow.code || existing?.code || '',
      name: importedRow.name || existing?.name || '',
      category: importedRow.category || existing?.category || '',
      qty: importedRow.qty != null ? Number(importedRow.qty) : Number(existing?.qty || 0),
      minQty: importedRow.minQty != null ? Number(importedRow.minQty) : Number(existing?.minQty || 0),
      unit: importedRow.unit || existing?.unit || 'U',
      location: importedRow.location || existing?.location || '',
      supplierName: importedRow.supplierName || existing?.supplierName || '',
      requester: importedRow.requester || existing?.requester || '',
      notes: importedRow.notes || existing?.notes || '',
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
    if (existing) {
      if (!updateExisting) {
        skipped += 1;
        return;
      }
      const idx = state.stockItems.findIndex((row) => row.id === existing.id);
      if (idx >= 0) state.stockItems.splice(idx, 1, payload);
      updated += 1;
    } else {
      state.stockItems.unshift(payload);
      created += 1;
    }
    if (payload.supplierName) ensureSupplier(payload.supplierName);
    if (payload.requester) ensureRequester(payload.requester);
  });
  return { created, updated, skipped, warnings };
}

function injectStockImportPanel() {
  const stack = $('page-stock')?.querySelector('.section-stack');
  if (!stack) return;
  if (!$('stockImportInput')) {
    stack.insertAdjacentHTML('afterbegin', `
      <article class="panel panel-entry stock-import-panel">
        <div class="panel-title-row"><h3>Import stock Excel / CSV</h3><span class="panel-tag">Bulk</span></div>
        <div class="import-grid">
          <label class="field wide">
            <span>Fichier stock (.xlsx / .xls / .csv)</span>
            <input id="stockImportInput" type="file" accept=".xlsx,.xls,.csv,.txt" />
          </label>
          <label class="check-inline"><input id="stockImportUpdateExisting" type="checkbox" checked /> <span>Mettre à jour les articles existants si le code ou la désignation existe déjà</span></label>
          <div class="toolbar-actions wrap">
            <button class="btn btn-soft" id="downloadStockTemplateBtn" type="button">Modèle stock</button>
            <button class="btn btn-primary" id="importStockBtn" type="button">Importer le stock</button>
          </div>
        </div>
        <div class="help-note">Conseil : le format <strong>.xlsx</strong> marche avec le module Excel du navigateur, et le format <strong>.csv</strong> marche toujours. Colonnes simples : <strong>Code article</strong>, <strong>Désignation</strong>, <strong>Fournisseur</strong>, <strong>Demandeur</strong>, <strong>Quantité</strong>, <strong>Seuil mini</strong>, <strong>Unité</strong>, <strong>Emplacement</strong>, <strong>Notes</strong>.</div>
        <div id="stockImportResult" class="import-result muted">Aucun import stock lancé.</div>
      </article>
    `);
  } else {
    $('stockImportInput').setAttribute('accept', '.xlsx,.xls,.csv,.txt');
  }
}

async function importStockWorkbookFile() {
  const file = $('stockImportInput')?.files?.[0];
  if (!file) return showToast('Choisissez un fichier stock.');
  const resultBox = $('stockImportResult');
  try {
    let rows = [];
    if (/\.(csv|txt)$/i.test(file.name || '')) {
      rows = parseStockImportRows(parseDelimitedText(await file.text()));
    } else if (typeof XLSX !== 'undefined') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      rows = parseStockImportRows(workbook);
    } else {
      if (resultBox) resultBox.textContent = 'Le module XLSX n’est pas chargé. Enregistrez le fichier Excel en CSV puis importez-le, ou rechargez la page avec accès Internet.';
      return showToast('Module Excel indisponible. Utilisez CSV ou rechargez la page.');
    }
    if (!rows.length) {
      if (resultBox) resultBox.textContent = 'Aucune ligne exploitable trouvée dans le fichier.';
      return showToast('Fichier stock vide.');
    }
    const result = applyImportedStockRows(rows, Boolean($('stockImportUpdateExisting')?.checked));
    saveState();
    $('stockImportInput').value = '';
    if (resultBox) resultBox.innerHTML = `${result.created} créé(s), ${result.updated} mis à jour, ${result.skipped} ignoré(s).${result.warnings.length ? `<br>${result.warnings.map(escapeHtml).join('<br>')}` : ''}`;
    renderApp();
    if (state.activeTab !== 'stock') setActiveTab('stock');
    showToast('Import stock terminé.');
  } catch (err) {
    console.error(err);
    if (resultBox) resultBox.textContent = `Erreur import stock : ${err.message}`;
    showToast('Erreur lors de l’import stock.');
  }
}

function chartHostId(key) {
  return `chart_${key}`;
}

function chartColors() {
  const current = palette();
  return current.list && current.list.length ? current.list : ['#5168ff', '#24b1a8', '#ff9f43', '#ef4444', '#9b59b6', '#2dce89'];
}

function chartText(value, limit = 18) {
  const text = String(value || '—').trim() || '—';
  return text.length > limit ? `${text.slice(0, Math.max(3, limit - 1))}…` : text;
}

function chartNumericKind(spec) {
  const hay = normalizeText([spec.title, spec.subtitle, ...(spec.headers || [])].join(' '));
  if (hay.includes('jour')) return 'days';
  if (hay.includes('montant') || hay.includes('depense') || hay.includes('ttc') || hay.includes('dzd') || hay.includes('finance')) return 'money';
  if (hay.includes('quantite') || hay.includes('stock') || hay.includes('qte') || hay.includes('qté')) return 'qty';
  return 'count';
}

function chartDisplayValue(spec, value, compact = false) {
  const kind = chartNumericKind(spec);
  const numeric = Number(value || 0);
  if (kind === 'money') return compact ? formatCompact(numeric) : formatMoney(numeric, 'DZD');
  if (kind === 'days') return `${Math.round(numeric)} j`;
  if (kind === 'qty') return compact ? formatCompact(numeric) : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(numeric);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(numeric);
}

function chartInsightText(spec) {
  const rows = spec.rows || [];
  if (!rows.length) return '0 donnée';
  const top = rows.slice().sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0];
  const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0);
  return `Top : ${chartText(top[0], 20)} · ${chartDisplayValue(spec, top[1])} · Total : ${chartDisplayValue(spec, total, true)}`;
}

function niceCeil(value) {
  const numeric = Number(value || 0);
  if (!numeric || numeric <= 0) return 1;
  const exponent = Math.floor(Math.log10(numeric));
  const factor = 10 ** exponent;
  const normalized = numeric / factor;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * factor;
}

function svgNumber(value) {
  return Number(value || 0).toFixed(2);
}

function donutSlicePath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);
  return `M ${svgNumber(x1)} ${svgNumber(y1)} A ${svgNumber(outerR)} ${svgNumber(outerR)} 0 ${largeArc} 1 ${svgNumber(x2)} ${svgNumber(y2)} L ${svgNumber(x3)} ${svgNumber(y3)} A ${svgNumber(innerR)} ${svgNumber(innerR)} 0 ${largeArc} 0 ${svgNumber(x4)} ${svgNumber(y4)} Z`;
}

function buildBarChartSvg(spec, options = {}) {
  const rows = spec.rows || [];
  if (!rows.length) return `<div class="chart-empty-state">Aucune donnée disponible.</div>`;
  const colors = chartColors();
  const w = 760;
  const h = options.modal ? 380 : 340;
  const m = { l: 64, r: 24, t: 20, b: 88 };
  const innerW = w - m.l - m.r;
  const innerH = h - m.t - m.b;
  const max = niceCeil(Math.max(...rows.map((row) => Number(row[1] || 0)), 1));
  const slot = innerW / Math.max(rows.length, 1);
  const barW = Math.max(18, Math.min(50, slot * 0.66));
  let grid = '';
  for (let i = 0; i <= 4; i += 1) {
    const y = m.t + (innerH / 4) * i;
    const value = max - (max / 4) * i;
    grid += `<line class="chart-grid-line" x1="${svgNumber(m.l)}" y1="${svgNumber(y)}" x2="${svgNumber(w - m.r)}" y2="${svgNumber(y)}"></line>`;
    grid += `<text class="chart-axis-label y-label" x="${svgNumber(m.l - 10)}" y="${svgNumber(y + 4)}" text-anchor="end">${escapeHtml(chartDisplayValue(spec, value, true))}</text>`;
  }
  let bars = '';
  let labels = '';
  rows.forEach((row, idx) => {
    const value = Number(row[1] || 0);
    const x = m.l + slot * idx + (slot - barW) / 2;
    const barH = innerH * (value / max);
    const y = m.t + innerH - barH;
    const centerX = x + barW / 2;
    const fill = colors[idx % colors.length];
    bars += `<rect class="chart-data-point chart-bar" data-point-index="${idx}" x="${svgNumber(x)}" y="${svgNumber(y)}" width="${svgNumber(barW)}" height="${svgNumber(Math.max(barH, 6))}" rx="11" ry="11" fill="${fill}"></rect>`;
    bars += `<rect class="chart-hit-area" data-point-index="${idx}" x="${svgNumber(x - 6)}" y="${svgNumber(m.t)}" width="${svgNumber(barW + 12)}" height="${svgNumber(innerH)}"></rect>`;
    labels += `<text class="chart-axis-label x-label" x="${svgNumber(centerX)}" y="${svgNumber(h - 14)}" transform="rotate(-28 ${svgNumber(centerX)} ${svgNumber(h - 14)})" text-anchor="end">${escapeHtml(chartText(row[0], 18))}</text>`;
    if (options.modal || rows.length <= 6) labels += `<text class="chart-value-label" x="${svgNumber(centerX)}" y="${svgNumber(Math.max(y - 8, m.t + 10))}" text-anchor="middle">${escapeHtml(chartDisplayValue(spec, value, true))}</text>`;
  });
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${grid}${bars}${labels}</svg>`;
}

function buildLineChartSvg(spec, options = {}) {
  const rows = spec.rows || [];
  if (!rows.length) return `<div class="chart-empty-state">Aucune donnée disponible.</div>`;
  const colors = chartColors();
  const w = 760;
  const h = options.modal ? 380 : 340;
  const m = { l: 64, r: 24, t: 20, b: 88 };
  const innerW = w - m.l - m.r;
  const innerH = h - m.t - m.b;
  const max = niceCeil(Math.max(...rows.map((row) => Number(row[1] || 0)), 1));
  let grid = '';
  for (let i = 0; i <= 4; i += 1) {
    const y = m.t + (innerH / 4) * i;
    const value = max - (max / 4) * i;
    grid += `<line class="chart-grid-line" x1="${svgNumber(m.l)}" y1="${svgNumber(y)}" x2="${svgNumber(w - m.r)}" y2="${svgNumber(y)}"></line>`;
    grid += `<text class="chart-axis-label y-label" x="${svgNumber(m.l - 10)}" y="${svgNumber(y + 4)}" text-anchor="end">${escapeHtml(chartDisplayValue(spec, value, true))}</text>`;
  }
  const points = rows.map((row, idx) => {
    const value = Number(row[1] || 0);
    const x = m.l + (innerW / Math.max(rows.length - 1, 1)) * idx;
    const y = m.t + innerH - (innerH * (value / max));
    return { label: row[0], value, x, y, idx };
  });
  const linePath = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${svgNumber(point.x)} ${svgNumber(point.y)}`).join(' ');
  const areaPath = `${linePath} L ${svgNumber(points[points.length - 1].x)} ${svgNumber(m.t + innerH)} L ${svgNumber(points[0].x)} ${svgNumber(m.t + innerH)} Z`;
  const gradientId = `chartGradient_${slugify(spec.key)}_${options.modal ? 'modal' : 'card'}`;
  let marks = `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.32"></stop><stop offset="100%" stop-color="${colors[0]}" stop-opacity="0.02"></stop></linearGradient></defs>`;
  marks += `<path class="chart-area-fill" d="${areaPath}" fill="url(#${gradientId})"></path>`;
  marks += `<path class="chart-line-stroke" d="${linePath}"></path>`;
  let labels = '';
  points.forEach((point) => {
    marks += `<circle class="chart-data-point chart-point" data-point-index="${point.idx}" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="6"></circle>`;
    marks += `<circle class="chart-hit-area chart-hit-circle" data-point-index="${point.idx}" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="16"></circle>`;
    labels += `<text class="chart-axis-label x-label" x="${svgNumber(point.x)}" y="${svgNumber(h - 14)}" transform="rotate(-28 ${svgNumber(point.x)} ${svgNumber(h - 14)})" text-anchor="end">${escapeHtml(chartText(point.label, 18))}</text>`;
    if (options.modal || rows.length <= 6) labels += `<text class="chart-value-label" x="${svgNumber(point.x)}" y="${svgNumber(Math.max(point.y - 10, m.t + 10))}" text-anchor="middle">${escapeHtml(chartDisplayValue(spec, point.value, true))}</text>`;
  });
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${grid}${marks}${labels}</svg>`;
}

function buildHorizontalBarChartSvg(spec) {
  const rows = spec.rows || [];
  if (!rows.length) return `<div class="chart-empty-state">Aucune donnée disponible.</div>`;
  const colors = chartColors();
  const w = 760;
  const h = Math.max(320, rows.length * 36 + 60);
  const m = { l: 228, r: 68, t: 20, b: 24 };
  const innerW = w - m.l - m.r;
  const innerH = h - m.t - m.b;
  const max = niceCeil(Math.max(...rows.map((row) => Number(row[1] || 0)), 1));
  let grid = '';
  for (let i = 0; i <= 4; i += 1) {
    const x = m.l + (innerW / 4) * i;
    const value = (max / 4) * i;
    grid += `<line class="chart-grid-line" x1="${svgNumber(x)}" y1="${svgNumber(m.t)}" x2="${svgNumber(x)}" y2="${svgNumber(h - m.b)}"></line>`;
    grid += `<text class="chart-axis-label" x="${svgNumber(x)}" y="${svgNumber(h - 6)}" text-anchor="middle">${escapeHtml(chartDisplayValue(spec, value, true))}</text>`;
  }
  const rowH = innerH / Math.max(rows.length, 1);
  let marks = '';
  rows.forEach((row, idx) => {
    const value = Number(row[1] || 0);
    const y = m.t + idx * rowH + 6;
    const barH = Math.min(22, rowH - 8);
    const width = innerW * (value / max);
    const fill = colors[idx % colors.length];
    marks += `<text class="chart-axis-label y-label" x="${svgNumber(m.l - 12)}" y="${svgNumber(y + barH - 5)}" text-anchor="end">${escapeHtml(chartText(row[0], 30))}</text>`;
    marks += `<rect class="chart-bar-bg" x="${svgNumber(m.l)}" y="${svgNumber(y)}" width="${svgNumber(innerW)}" height="${svgNumber(barH)}" rx="11" ry="11"></rect>`;
    marks += `<rect class="chart-data-point chart-bar" data-point-index="${idx}" x="${svgNumber(m.l)}" y="${svgNumber(y)}" width="${svgNumber(Math.max(width, 6))}" height="${svgNumber(barH)}" rx="11" ry="11" fill="${fill}"></rect>`;
    marks += `<rect class="chart-hit-area" data-point-index="${idx}" x="${svgNumber(m.l)}" y="${svgNumber(y - 2)}" width="${svgNumber(innerW)}" height="${svgNumber(barH + 4)}"></rect>`;
    marks += `<text class="chart-value-label hbar-value" x="${svgNumber(Math.min(w - m.r + 10, m.l + width + 12))}" y="${svgNumber(y + barH - 5)}" text-anchor="start">${escapeHtml(chartDisplayValue(spec, value, true))}</text>`;
  });
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${grid}${marks}</svg>`;
}

function buildDonutChartSvg(spec) {
  const rows = spec.rows || [];
  if (!rows.length) return `<div class="chart-empty-state">Aucune donnée disponible.</div>`;
  const colors = chartColors();
  const w = 760;
  const h = 340;
  const cx = 220;
  const cy = 172;
  const outerR = 112;
  const innerR = 66;
  const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0) || 1;
  let current = -Math.PI / 2;
  let arcs = '';
  let legend = '';
  rows.forEach((row, idx) => {
    const value = Number(row[1] || 0);
    const angle = (value / total) * Math.PI * 2;
    const mid = current + angle / 2;
    const offsetX = Math.cos(mid) * 6;
    const offsetY = Math.sin(mid) * 6;
    const fill = colors[idx % colors.length];
    const path = donutSlicePath(cx + offsetX, cy + offsetY, outerR, innerR, current, current + angle);
    arcs += `<path class="chart-data-point chart-slice" data-point-index="${idx}" d="${path}" fill="${fill}"></path>`;
    legend += `<g class="chart-legend-entry" data-point-index="${idx}" tabindex="0"><rect x="430" y="${58 + idx * 30}" width="12" height="12" rx="4" fill="${fill}"></rect><text class="chart-axis-label" x="450" y="${68 + idx * 30}">${escapeHtml(chartText(row[0], 24))} · ${escapeHtml(chartDisplayValue(spec, value, true))}</text></g>`;
    current += angle;
  });
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${arcs}<circle class="chart-donut-hole" cx="${cx}" cy="${cy}" r="${innerR - 8}"></circle><text class="chart-donut-total" x="${cx}" y="${cy - 2}" text-anchor="middle">${escapeHtml(chartDisplayValue(spec, total, true))}</text><text class="chart-donut-caption" x="${cx}" y="${cy + 22}" text-anchor="middle">Total</text>${legend}</svg>`;
}

function buildInteractiveChartMarkup(spec, options = {}) {
  if (spec.type === 'line') return buildLineChartSvg(spec, options);
  if (spec.type === 'hbar') return buildHorizontalBarChartSvg(spec, options);
  if (spec.type === 'donut') return buildDonutChartSvg(spec, options);
  return buildBarChartSvg(spec, options);
}

function ensureModalChartHost() {
  let host = $('chartModalCanvas');
  if (!host) return null;
  if (host.tagName === 'CANVAS') {
    const replacement = document.createElement('div');
    replacement.id = 'chartModalCanvas';
    replacement.className = 'chart-host chart-host-modal';
    host.replaceWith(replacement);
    host = replacement;
  }
  host.classList.add('chart-host', 'chart-host-modal');
  return host;
}

function chartTooltipHtml(spec, index) {
  const rows = spec.rows || [];
  const row = rows[index];
  if (!row) return '';
  const value = Number(row[1] || 0);
  const total = rows.reduce((sum, current) => sum + Number(current[1] || 0), 0) || 1;
  const percentage = spec.type === 'donut' ? `<div class="chart-tooltip-meta">${Math.round((value / total) * 100)}%</div>` : '';
  return `<strong>${escapeHtml(row[0])}</strong><div>${escapeHtml(chartDisplayValue(spec, value))}</div>${percentage}`;
}

function activateChartPoint(host, index) {
  host.querySelectorAll('.is-active').forEach((node) => node.classList.remove('is-active'));
  host.querySelectorAll(`[data-point-index="${index}"]`).forEach((node) => node.classList.add('is-active'));
}

function positionChartTooltip(host, tooltip, eventOrTarget) {
  if (!host || !tooltip) return;
  const hostRect = host.getBoundingClientRect();
  let left = 24;
  let top = 24;
  if (eventOrTarget?.clientX != null) {
    left = eventOrTarget.clientX - hostRect.left + 18;
    top = eventOrTarget.clientY - hostRect.top + 14;
  } else if (eventOrTarget?.getBoundingClientRect) {
    const rect = eventOrTarget.getBoundingClientRect();
    left = rect.left - hostRect.left + (rect.width / 2) + 14;
    top = rect.top - hostRect.top + 10;
  }
  const tooltipWidth = 190;
  left = Math.max(12, Math.min(left, hostRect.width - tooltipWidth));
  top = Math.max(12, Math.min(top, hostRect.height - 72));
  tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function hideChartTooltip(host, tooltip) {
  if (host) host.querySelectorAll('.is-active').forEach((node) => node.classList.remove('is-active'));
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
  tooltip.style.transform = 'translate(-9999px, -9999px)';
}

function mountInteractiveChart(spec, hostId, tooltipId, options = {}) {
  const host = hostId === 'chartModalCanvas' ? ensureModalChartHost() : $(hostId);
  const tooltip = $(tooltipId);
  if (!host) return;
  host.innerHTML = buildInteractiveChartMarkup(spec, options);
  host.dataset.chartKey = spec.key;
  host.dataset.pinnedIndex = '';
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', `${spec.title} — ${spec.subtitle}`);
  const show = (index, anchor) => {
    if (index == null || !tooltip) return;
    activateChartPoint(host, index);
    tooltip.innerHTML = chartTooltipHtml(spec, index);
    positionChartTooltip(host, tooltip, anchor);
    tooltip.classList.add('is-visible');
  };
  host.onmousemove = (event) => {
    if (host.dataset.pinnedIndex) return;
    const hit = event.target.closest('[data-point-index]');
    if (!hit) {
      hideChartTooltip(host, tooltip);
      return;
    }
    show(Number(hit.dataset.pointIndex), event);
  };
  host.onmouseleave = () => {
    if (!host.dataset.pinnedIndex) hideChartTooltip(host, tooltip);
  };
  host.onclick = (event) => {
    const hit = event.target.closest('[data-point-index]');
    if (!hit) {
      host.dataset.pinnedIndex = '';
      hideChartTooltip(host, tooltip);
      return;
    }
    const index = String(hit.dataset.pointIndex);
    if (host.dataset.pinnedIndex === index) {
      host.dataset.pinnedIndex = '';
      hideChartTooltip(host, tooltip);
      return;
    }
    host.dataset.pinnedIndex = index;
    show(Number(index), event);
  };
  host.ondblclick = () => {
    if (!options.modal) openChartModal(spec.key);
  };
  host.querySelectorAll('[data-point-index]').forEach((node) => {
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', () => show(Number(node.dataset.pointIndex), node));
    node.addEventListener('blur', () => { if (!host.dataset.pinnedIndex) hideChartTooltip(host, tooltip); });
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        host.dataset.pinnedIndex = host.dataset.pinnedIndex === String(node.dataset.pointIndex) ? '' : String(node.dataset.pointIndex);
        if (host.dataset.pinnedIndex) show(Number(node.dataset.pointIndex), node);
        else hideChartTooltip(host, tooltip);
      }
    });
  });
}

function renderCharts() {
  state.chartSpecs = buildChartSpecs();
  const container = $('dashboardCharts');
  if (!container) return;
  container.innerHTML = Object.values(state.chartSpecs).map((spec) => `
    <article class="chart-card interactive-chart-card">
      <div class="chart-head">
        <div>
          <h3>${escapeHtml(spec.title)}</h3>
          <p class="chart-subtitle">${escapeHtml(spec.subtitle)}</p>
        </div>
        <div class="chart-head-actions">
          <button class="page-chip" type="button" data-chart-export="${spec.key}">XLSX</button>
          <button class="page-chip" type="button" data-chart-open="${spec.key}">Focus</button>
        </div>
      </div>
      <div class="chart-meta-row">
        <span class="chart-meta">Survoler = détail · cliquer = épingler · double-clic = focus</span>
        <span class="chart-meta chart-insight">${escapeHtml(chartInsightText(spec))}</span>
      </div>
      <div class="chart-canvas-wrap chart-visual-shell">
        <div id="${chartHostId(spec.key)}" class="chart-host"></div>
        <div class="chart-tooltip" id="tooltip_${spec.key}"></div>
      </div>
    </article>`).join('');
  Object.values(state.chartSpecs).forEach((spec) => mountInteractiveChart(spec, chartHostId(spec.key), `tooltip_${spec.key}`));
}

function openChartModal(key) {
  const spec = state.chartSpecs[key];
  if (!spec) return;
  state.chartModalKey = key;
  $('chartModalTitle').textContent = spec.title;
  $('chartModalSubtitle').textContent = `${spec.subtitle} · vue interactive agrandie`;
  $('chartModalBackdrop').classList.remove('hidden');
  mountInteractiveChart(spec, 'chartModalCanvas', 'chartModalTooltip', { modal: true });
}

function closeChartModal() {
  $('chartModalBackdrop').classList.add('hidden');
  const tooltip = $('chartModalTooltip');
  if (tooltip) {
    tooltip.classList.remove('is-visible');
    tooltip.style.transform = 'translate(-9999px, -9999px)';
  }
  const host = $('chartModalCanvas');
  if (host) {
    host.dataset.pinnedIndex = '';
    host.innerHTML = '';
  }
  state.chartModalKey = null;
}

function rowValueByAliases(row, aliases) {
  const entries = Object.entries(row || {});
  const wanted = aliases.map((alias) => normalizeText(alias));
  for (const alias of wanted) {
    const exact = entries.find(([key]) => normalizeText(key) === alias);
    if (exact) return exact[1];
  }
  for (const alias of wanted) {
    const canLooseMatch = alias.includes(' ') || alias.length >= 8;
    if (!canLooseMatch) continue;
    const partial = entries.find(([key]) => {
      const normalizedKey = normalizeText(key);
      return normalizedKey.includes(alias);
    });
    if (partial) return partial[1];
  }
  return '';
}


/* ===== Delight refresh v4: cooler palette, elegant icons, procurement KPI library, targeted exports ===== */

function normalizeBcRecord(row = {}) {
  const amount = Number(row.amountTTC || row.amount || 0) || 0;
  return {
    id: row.id || uid('bc'),
    ref: String(row.ref || '').trim(),
    daRef: String(row.daRef || '').trim(),
    daStatus: row.daStatus === 'validated' || row.daValidatedAt ? 'validated' : 'draft',
    daValidatedAt: row.daValidatedAt || '',
    requestDate: toYmd(row.requestDate) || '',
    date: toYmd(row.date) || '',
    supplierId: row.supplierId || null,
    supplierName: String(row.supplierName || '').trim(),
    amount: amount,
    amountHT: Number(row.amountHT || 0) || 0,
    amountTTC: amount,
    currency: 'DZD',
    type: row.type === 'service' ? 'service' : 'achat',
    description: String(row.description || '').trim(),
    status: row.status || 'importe',
    promisedDate: toYmd(row.promisedDate) || '',
    goodsReceivedDate: toYmd(row.goodsReceivedDate) || '',
    serviceDoneDate: toYmd(row.serviceDoneDate) || '',
    requester: String(row.requester || '').trim(),
    paymentTerms: String(row.paymentTerms || '').trim(),
    comments: String(row.comments || row.comment || '').trim(),
    notes: String(row.notes || '').trim(),
    importedFromBC: Boolean(row.importedFromBC),
    sourceFile: String(row.sourceFile || '').trim(),
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
    lineCount: Number(row.lineCount || (Array.isArray(row.lineItems) ? row.lineItems.length : 0) || 0),
    totalQty: Number(row.totalQty || 0) || 0,
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
}

function injectProcurementRequestDateFields() {
  const mainDateField = $('bcDate')?.closest('.field');
  if (mainDateField && !$('bcRequestDate')) {
    mainDateField.insertAdjacentHTML('afterend', `
      <label class="field">
        <span>Date DA / DS (optionnel)</span>
        <input id="bcRequestDate" type="date" />
      </label>
    `);
  }
  const editDateField = $('editBcDate')?.closest('.field');
  if (editDateField && !$('editBcRequestDate')) {
    editDateField.insertAdjacentHTML('afterend', `
      <label class="field">
        <span>Date DA / DS (optionnel)</span>
        <input id="editBcRequestDate" type="date" />
      </label>
    `);
  }
}

function refreshThemeLabels() {
  const classic = document.querySelector('#themeSelect option[value="classic"]');
  if (classic) classic.textContent = 'Ocean';
}

function actionIconSvg(icon) {
  const icons = {
    edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    validate: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    pay: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M3 10h18"></path><path d="M7 15h4"></path></svg>`,
    clone: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg>`,
    delete: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 10v6"/><path d="M14 10v6"/></svg>`,
  };
  return icons[icon] || `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle></svg>`;
}

function iconActionButton(icon, action, id, label) {
  return `<button type="button" class="icon-btn icon-${escapeHtml(icon)}" data-action="${escapeHtml(action)}" data-id="${escapeHtml(String(id || ''))}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><span class="icon-svg" aria-hidden="true">${actionIconSvg(icon)}</span></button>`;
}

function tabIconSvg(name) {
  const icons = {
    kpi: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10"></path><path d="M12 20V4"></path><path d="M19 20v-7"></path></svg>`,
    followup: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="3"></rect><path d="M9 9h6"></path><path d="M9 13h6"></path></svg>`,
    payments: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"></rect><path d="M3 10h18"></path><circle cx="16" cy="14" r="1"></circle></svg>`,
    'smart-match': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3-1.9 4.3L5.8 8.8l3.6 3.5-.9 5 4.5-2.4 4.5 2.4-.9-5 3.6-3.5-4.3-1.5z"></path></svg>`,
    finance: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    reports: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4Z"></path><path d="M8 14h2"></path><path d="M12 10h2"></path><path d="M16 7h2"></path><path d="M8 18h10"></path></svg>`,
    settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4"></path><path d="M12 17v4"></path><path d="M4 12h4"></path><path d="M16 12h4"></path><circle cx="12" cy="12" r="4"></circle></svg>`,
  };
  return icons[name] || icons.kpi;
}

function decorateTabsWithIcons() {
  const fallbacks = {
    kpi: 'KPI',
    followup: 'Bons de Commande',
    payments: 'Paiements DP',
    'smart-match': 'Rapprochement IA',
    finance: 'Finances',
    reports: 'Rapports',
    settings: 'Paramètres'
  };
  $$('.tabbar .tab').forEach((tab) => {
    const key = tab.dataset.tab || 'kpi';
    let label = tab.textContent.trim();
    if (!label) {
      if (tab.dataset.tab === 'kpi' || key === 'kpi') {
        label = 'KPI';
      } else {
        label = fallbacks[key] || (key ? (key.charAt(0).toUpperCase() + key.slice(1)) : 'KPI');
      }
    } else if (fallbacks[key]) {
      label = fallbacks[key];
    }
    const existingBadge = tab.querySelector('.tab-icon-badge') || tab.querySelector('i');
    const existingLabel = tab.querySelector('.tab-label');
    if (existingBadge && existingLabel && existingLabel.textContent.trim() === label) {
      return;
    }
    const iconHtml = tab.querySelector('i') ? tab.querySelector('i').outerHTML : `<span class="tab-icon-badge" aria-hidden="true">${tabIconSvg(key)}</span>`;
    tab.innerHTML = `${iconHtml}<span class="tab-label">${escapeHtml(label)}</span>`;
  });
}

function injectStockExportButtons() {
  const stockHeader = $('#page-stock .page-header');
  if (!stockHeader) return;
  const actions = ensureToolbarActions(stockHeader);
  const exportBtn = $('exportStockBtn');
  if (exportBtn) exportBtn.textContent = 'Vue stock';
  if (actions.querySelector('[data-stock-export="items"]')) return;
  const buttons = [
    ['items', 'Articles'],
    ['entries', 'Entrées'],
    ['exits', 'Sorties'],
  ];
  buttons.reverse().forEach(([kind, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-soft stock-export-btn';
    btn.dataset.stockExport = kind;
    btn.textContent = label;
    if (exportBtn) exportBtn.insertAdjacentElement('beforebegin', btn);
    else actions.prepend(btn);
  });
}

function injectReportsEnhancementSkeleton() {
  const page = $('page-reports');
  if (!page || $('procurementKpiLibrary')) return;
  const baseGrid = page.querySelector('.report-grid');
  if (!baseGrid) return;
  baseGrid.insertAdjacentHTML('afterend', `
    <div class="report-grid report-grid-extended">
      <article class="panel panel-muted">
        <div class="panel-title-row"><h3>Bibliothèque KPI appro</h3><span class="panel-tag">Best practice</span></div>
        <div id="procurementKpiLibrary" class="procurement-kpi-library"></div>
      </article>
      <article class="panel panel-entry">
        <div class="panel-title-row"><h3>Insights & options</h3><span class="panel-tag">Surprise</span></div>
        <div id="reportHighlights" class="dataset-list"></div>
      </article>
    </div>
  `);
}

function enhanceStaticLayout() {
  injectHeadFonts();
  injectDashboardControls();
  injectChartModalTooltip();
  injectPaymentFilters();
  injectStockImportPanel();
  injectStockRequesterField();
  injectStockFilters();
  injectPageCollapseButtons();
  injectSortableHeaders();
  injectProcurementRequestDateFields();
  injectStockExportButtons();
  injectReportsEnhancementSkeleton();
  decorateTabsWithIcons();
  refreshThemeLabels();
}

function refreshFollowupDefaults() {
  const followupId = $('followupId');
  const bcRef = $('bcRef');
  const bcDaRef = $('bcDaRef');
  const bcDate = $('bcDate');
  const bcPromisedDate = $('bcPromisedDate');
  const bcCurrency = $('bcCurrency');
  if (followupId && bcRef && !followupId.value && !bcRef.value) bcRef.value = nextBcRefPreview();
  if (followupId && bcDaRef && !followupId.value && !bcDaRef.value) bcDaRef.value = nextDaRefPreview();
  if (bcDate && !bcDate.value) bcDate.value = todayYmd();
  if (bcPromisedDate && bcDate && !bcPromisedDate.value && bcDate.value) bcPromisedDate.value = addBusinessDays(bcDate.value, state.settings?.procurementDays || 0);
  if (bcCurrency) bcCurrency.value = 'DZD';
}

function buildBcPayloadFromMain(mode = 'save', existing = null) {
  const supplier = ensureSupplier($('bcSupplier').value.trim());
  const requester = ensureRequester($('bcRequester').value.trim());
  const date = $('bcDate').value || todayYmd();
  const payload = normalizeBcRecord({
    ...(existing || {}),
    id: existing?.id || $('followupId').value || uid('bc'),
    ref: canonicalBcRef($('bcRef').value.trim() || nextBcRefPreview(), '', date),
    daRef: canonicalDaRef($('bcDaRef').value.trim() || existing?.daRef || nextDaRefPreview(), date),
    daStatus: mode === 'validate' ? 'validated' : (existing?.daStatus || 'draft'),
    daValidatedAt: mode === 'validate' ? nowIso() : (existing?.daValidatedAt || ''),
    requestDate: $('bcRequestDate')?.value || existing?.requestDate || '',
    date,
    supplierId: supplier?.id || existing?.supplierId || null,
    supplierName: supplier?.name || $('bcSupplier').value.trim(),
    amountTTC: formValueAsNumber('bcAmount'),
    amountHT: existing?.amountHT || 0,
    currency: 'DZD',
    type: $('bcType').value || 'achat',
    description: $('bcDescription').value.trim(),
    status: $('bcStatus').value,
    promisedDate: $('bcPromisedDate').value || addBusinessDays(date, state.settings.procurementDays || 0),
    goodsReceivedDate: $('bcGoodsDate').value,
    serviceDoneDate: $('bcServiceDate').value,
    department: (typeof window.normalizeDepartment === 'function' ? window.normalizeDepartment($('bcDepartment')?.value.trim() || existing?.department, supplier?.name || $('bcSupplier').value.trim(), requester?.name || $('bcRequester').value.trim()) : ($('bcDepartment')?.value.trim() || existing?.department || 'Maintenance & Parc')),
    requester: requester?.name || $('bcRequester').value.trim() || $('bcDepartment')?.value.trim() || 'Maintenance & Parc',
    paymentTerms: $('bcPaymentTerms').value.trim(),
    comments: $('bcComments').value.trim(),
    notes: $('bcNotes').value.trim(),
    importedFromBC: Boolean(existing?.importedFromBC),
    sourceFile: existing?.sourceFile || '',
    lineItems: existing?.lineItems || [],
    lineCount: existing?.lineCount || 0,
    totalQty: existing?.totalQty || 0,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  return payload;
}

function openBcEditModal(id) {
  const row = findBcById(id);
  if (!row) return;
  injectProcurementRequestDateFields();
  $('editBcId').value = row.id;
  $('editBcRef').value = row.ref || '';
  $('editBcDaRef').value = row.daRef || nextDaRefPreview();
  if ($('editBcRequestDate')) $('editBcRequestDate').value = row.requestDate || '';
  $('editBcDate').value = row.date || '';
  $('editBcSupplier').value = row.supplierName || '';
  $('editBcAmount').value = row.amountTTC || row.amount || '';
  $('editBcCurrency').value = 'DZD';
  $('editBcType').value = row.type || 'achat';
  $('editBcStatus').value = row.status || 'importe';
  $('editBcDaStatus').value = row.daStatus || 'draft';
  $('editBcPromisedDate').value = row.promisedDate || '';
  $('editBcGoodsDate').value = row.goodsReceivedDate || '';
  $('editBcServiceDate').value = row.serviceDoneDate || '';
  $('editBcRequester').value = row.requester || '';
  if ($('editBcDepartment')) $('editBcDepartment').value = row.department || '';
  $('editBcPaymentTerms').value = row.paymentTerms || '';
  $('editBcDescription').value = row.description || '';
  $('editBcComments').value = row.comments || '';
  $('editBcNotes').value = row.notes || '';
  const stockAlert = $('editBcStockAlert');
  if (stockAlert) {
    const stockInfo = getBcStockIngestionInfo(row);
    if (stockInfo && stockInfo.ingested) {
      stockAlert.innerHTML = `
        <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1rem;grid-column:1/-1;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>
            <strong style="color:#065f46;font-size:0.88rem;">Réception & Intégration Stock Confirmée</strong>
          </div>
          <div style="font-size:0.82rem;color:#047857;margin-bottom:4px;">${escapeHtml(stockInfo.note || 'Ce Bon de Commande a été réceptionné et intégré dans le stock')}</div>
          <div style="font-size:0.78rem;color:#064e3b;display:flex;gap:12px;">
            <span><strong>Date :</strong> ${escapeHtml(stockInfo.date || '—')}</span>
            <span><strong>Article / Lot :</strong> ${escapeHtml(stockInfo.articleRef || '—')}</span>
          </div>
        </div>
      `;
      stockAlert.classList.remove('hidden');
    } else {
      const st = String(row.status || '').toLowerCase();
      if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
        stockAlert.innerHTML = `
          <div style="background:#fff1f2;border:1px solid #f43f5e;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;grid-column:1/-1;">
            <span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>
            <span style="font-size:0.82rem;color:#9f1239;margin-left:6px;">Livraison enregistrée — En attente d'ingestion au stock magasin.</span>
          </div>
        `;
        stockAlert.classList.remove('hidden');
      } else {
        stockAlert.innerHTML = '';
        stockAlert.classList.add('hidden');
      }
    }
  }
  $('bcEditModalBackdrop').classList.remove('hidden');
}

function submitBcEditForm(e) {
  e.preventDefault();
  const existing = findBcById($('editBcId').value);
  if (!existing) return;
  const supplier = ensureSupplier($('editBcSupplier').value.trim());
  const requester = ensureRequester($('editBcRequester').value.trim());
  const date = $('editBcDate').value || existing.date || todayYmd();
  const payload = normalizeBcRecord({
    ...existing,
    ref: canonicalBcRef($('editBcRef').value.trim() || existing.ref, existing.sourceFile, date),
    daRef: canonicalDaRef($('editBcDaRef').value.trim() || existing.daRef || nextDaRefPreview(), date),
    daStatus: $('editBcDaStatus').value,
    daValidatedAt: $('editBcDaStatus').value === 'validated' ? (existing.daValidatedAt || nowIso()) : '',
    requestDate: $('editBcRequestDate')?.value || existing.requestDate || '',
    date,
    supplierId: supplier?.id || existing.supplierId || null,
    supplierName: supplier?.name || $('editBcSupplier').value.trim(),
    amountTTC: parseFlexibleNumber($('editBcAmount').value),
    amountHT: existing.amountHT || 0,
    type: $('editBcType').value,
    status: $('editBcStatus').value,
    promisedDate: $('editBcPromisedDate').value || addBusinessDays(date, state.settings.procurementDays || 0),
    goodsReceivedDate: $('editBcGoodsDate').value,
    serviceDoneDate: $('editBcServiceDate').value,
    requester: requester?.name || $('editBcRequester').value.trim(),
    paymentTerms: $('editBcPaymentTerms').value.trim(),
    description: $('editBcDescription').value.trim(),
    comments: $('editBcComments').value.trim(),
    notes: $('editBcNotes').value.trim(),
    updatedAt: nowIso(),
  });
  const index = state.bcRecords.findIndex((row) => row.id === payload.id);
  if (index >= 0) state.bcRecords.splice(index, 1, payload);
  bumpBcSequenceFromRef(payload.ref);
  bumpDaSequenceFromRef(payload.daRef);
  saveState();
  fillReferenceLists();
  refreshSelectOptions();
  closeBcEditModal();
  renderApp();
  showToast('BC modifiée.');
}

function fillBulkExample() {
  $('bulkBcInput').value = [
    `BC 201/DG/${new Date().getFullYear()};${todayYmd()};FOURNISSEUR A;150000;achat;Pièces détachées;Virement;Attente validation budget;${todayYmd()}`,
    `BC 202/DG/${new Date().getFullYear()};${todayYmd()};FOURNISSEUR B;78000;service;Maintenance;Chèque;Intervention planifiée;${todayYmd()}`
  ].join('\n');
}

function importBulkBcRows() {
  const lines = $('bulkBcInput').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return showToast('Ajoutez au moins une ligne.');
  let count = 0;
  const errors = [];
  lines.forEach((line, index) => {
    const parts = line.split(';').map((part) => part.trim());
    if (parts.length < 4) {
      errors.push(`Ligne ${index + 1} invalide.`);
      return;
    }
    const [ref, date, supplierName, amount, type, description, paymentTerms, comments, requestDate] = parts;
    const supplier = ensureSupplier(supplierName);
    const payload = normalizeBcRecord({
      id: uid('bc'),
      ref: canonicalBcRef(ref || nextBcRefPreview(), '', date || todayYmd()),
      daRef: nextDaRefPreview(),
      daStatus: 'draft',
      requestDate: toYmd(requestDate) || '',
      date: toYmd(date) || todayYmd(),
      supplierId: supplier?.id || null,
      supplierName: supplier?.name || supplierName,
      amountTTC: parseFlexibleNumber(amount),
      type: type === 'service' ? 'service' : 'achat',
      description: description || '',
      status: 'importe',
      promisedDate: addBusinessDays(toYmd(date) || todayYmd(), state.settings.procurementDays || 0),
      paymentTerms: paymentTerms || '',
      comments: comments || '',
      importedFromBC: false,
      sourceFile: '',
    });
    state.bcRecords.unshift(payload);
    bumpBcSequenceFromRef(payload.ref);
    bumpDaSequenceFromRef(payload.daRef);
    count += 1;
  });
  saveState();
  $('bulkImportResult').innerHTML = errors.length ? `${count} ligne(s) ajoutée(s).<br>${errors.map(escapeHtml).join('<br>')}` : `${count} ligne(s) ajoutée(s).`;
  $('bulkBcInput').value = '';
  renderApp();
  showToast('Lot manuel ajouté.');
}

function actualCompletionDate(row) {
  if (!row) return '';
  return row.type === 'service'
    ? (row.serviceDoneDate || row.goodsReceivedDate || '')
    : (row.goodsReceivedDate || row.serviceDoneDate || '');
}

function safeBusinessDelay(startYmd, endYmd) {
  const value = businessDaysBetween(startYmd, endYmd);
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

function averageRounded(values) {
  const clean = values.filter((value) => value != null && Number.isFinite(value));
  return clean.length ? Math.round(clean.reduce((sum, value) => sum + Number(value), 0) / clean.length) : 0;
}

function collectPaymentDatesForBc(row) {
  return state.payments
    .filter((payment) => payment.bcId === row.id && payment.paidDate)
    .map((payment) => payment.paidDate)
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function bcLeadRequestToOrder(row) {
  return row?.requestDate && row?.date ? safeBusinessDelay(row.requestDate, row.date) : null;
}

function bcLeadOrderToDelivery(row) {
  const actual = actualCompletionDate(row);
  return row?.date && actual ? safeBusinessDelay(row.date, actual) : null;
}

function bcLeadRequestToDelivery(row) {
  const actual = actualCompletionDate(row);
  return row?.requestDate && actual ? safeBusinessDelay(row.requestDate, actual) : null;
}

function bcLeadToValidation(row) {
  const validatedAt = toYmd(row?.daValidatedAt);
  return row?.date && validatedAt ? safeBusinessDelay(row.date, validatedAt) : null;
}

function bcProcureToPayLead(row) {
  const dates = collectPaymentDatesForBc(row);
  if (!row?.date || !dates.length) return null;
  return safeBusinessDelay(row.date, dates[dates.length - 1]);
}

function bcOpenAge(row) {
  if (!row?.date || actualCompletionDate(row) || row?.status === 'clos') return null;
  return safeBusinessDelay(row.date, todayYmd());
}

function isDeliveredOnTime(row) {
  const actual = actualCompletionDate(row);
  return Boolean(row?.promisedDate && actual && actual <= row.promisedDate);
}

function accumulateAverage(map, key, value) {
  if (!key || value == null || !Number.isFinite(value)) return;
  if (!map[key]) map[key] = { total: 0, count: 0 };
  map[key].total += Number(value);
  map[key].count += 1;
}

function finalizeAverageRows(map, limit = 8, direction = 'desc') {
  const rows = Object.entries(map).map(([label, stat]) => [label, stat.count ? Math.round(stat.total / stat.count) : 0]);
  rows.sort((a, b) => direction === 'asc' ? a[1] - b[1] : b[1] - a[1]);
  return rows.slice(0, limit);
}

function finalizeAverageRowsChrono(map) {
  return Object.entries(map)
    .map(([label, stat]) => [label, stat.count ? Math.round(stat.total / stat.count) : 0])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function finalizeRateRows(map, limit = 8) {
  return Object.entries(map)
    .map(([label, stat]) => [label, stat.total ? Math.round((stat.onTime / stat.total) * 100) : 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function computeKpis() {
  let records = state.bcRecords || [];
  const from = typeof $ === 'function' ? $('kpiDateFrom')?.value : '';
  const to = typeof $ === 'function' ? $('kpiDateTo')?.value : '';
  const supp = typeof $ === 'function' ? $('kpiSupplierFilter')?.value : '';
  const dept = typeof $ === 'function' ? $('kpiDeptFilter')?.value : '';
  const type = typeof $ === 'function' ? $('kpiTypeFilter')?.value : '';

  if (from || to || (supp && supp !== 'all') || (dept && dept !== 'all') || (type && type !== 'all')) {
    records = records.filter(r => {
      if (from && String(r.date || '') < from) return false;
      if (to && String(r.date || '') > to) return false;
      if (supp && supp !== 'all' && r.supplierName !== supp) return false;
      if (dept && dept !== 'all' && r.department !== dept) return false;
      if (type && type !== 'all' && r.type !== type) return false;
      return true;
    });
  }

  const totalBC = records.length;
  const totalAmount = records.reduce((sum, row) => sum + Number(row.amountTTC || row.amount || 0), 0);
  const validatedCount = records.filter((row) => row.daStatus === 'validated').length;
  const draftCount = totalBC - validatedCount;
  const validationRate = totalBC ? Math.round((validatedCount / totalBC) * 100) : 0;
  const lateCount = records.filter((row) => computeDelay(row).cls === 'late').length;
  const warnCount = records.filter((row) => computeDelay(row).cls === 'warn').length;
  const purchaseCount = records.filter((row) => row.type !== 'service').length;
  const serviceCount = totalBC - purchaseCount;
  const pendingPayments = state.payments.filter((row) => row.status !== 'paye').length;
  const paidPayments = state.payments.filter((row) => row.status === 'paye').length;
  const pendingAmount = state.payments.filter((row) => row.status !== 'paye').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const financeClosed = state.payments.filter((row) => row.requestDate && row.paidDate);
  const avgFinanceDelay = financeClosed.length ? Math.round(financeClosed.reduce((sum, row) => sum + Math.max(0, businessDaysBetween(row.requestDate, row.paidDate) || 0), 0) / financeClosed.length) : 0;
  const stockLow = state.stockItems.filter((row) => Number(row.qty || 0) <= Number(row.minQty || 0)).length;
  const stockCritical = state.stockItems.filter((row) => Number(row.qty || 0) <= 0).length;
  const supplierCount = [...new Set(records.map((row) => normalizeText(row.supplierName || '')).filter(Boolean))].length;
  const requesterCount = [...new Set(records.map((row) => normalizeText(row.requester || '')).filter(Boolean))].length;
  const avgBcAmount = totalBC ? totalAmount / totalBC : 0;
  const totalStockQty = state.stockItems.reduce((sum, row) => sum + Number(row.qty || 0), 0);

  const deliveredRows = records.filter((row) => actualCompletionDate(row));
  const requestToOrderValues = records.map((row) => bcLeadRequestToOrder(row)).filter((value) => value != null);
  const orderToDeliveryValues = deliveredRows.map((row) => bcLeadOrderToDelivery(row)).filter((value) => value != null);
  const requestToDeliveryValues = deliveredRows.map((row) => bcLeadRequestToDelivery(row)).filter((value) => value != null);
  const validationLeadValues = records.map((row) => bcLeadToValidation(row)).filter((value) => value != null);
  const procureToPayValues = records.map((row) => bcProcureToPayLead(row)).filter((value) => value != null);
  const openAges = records.map((row) => bcOpenAge(row)).filter((value) => value != null);
  const onTimeBaseRows = records.filter((row) => row.promisedDate && actualCompletionDate(row));
  const onTimeDeliveries = onTimeBaseRows.filter((row) => isDeliveredOnTime(row)).length;
  const onTimeDeliveryRate = onTimeBaseRows.length ? Math.round((onTimeDeliveries / onTimeBaseRows.length) * 100) : 0;
  const requestDateCoverage = records.filter((row) => row.requestDate).length;
  const requestDateCoverageRate = totalBC ? Math.round((requestDateCoverage / totalBC) * 100) : 0;

  return {
    totalBC,
    totalAmount,
    validatedCount,
    draftCount,
    validationRate,
    lateCount,
    warnCount,
    purchaseCount,
    serviceCount,
    pendingPayments,
    paidPayments,
    pendingAmount,
    avgFinanceDelay,
    stockLow,
    stockCritical,
    supplierCount,
    requesterCount,
    avgBcAmount,
    totalStockQty,
    deliveredCount: deliveredRows.length,
    requestDateCoverage,
    requestDateCoverageRate,
    avgRequestToBc: averageRounded(requestToOrderValues),
    avgBcToDelivery: averageRounded(orderToDeliveryValues),
    avgRequestToDelivery: averageRounded(requestToDeliveryValues),
    avgBcToValidation: averageRounded(validationLeadValues),
    avgProcureToPay: averageRounded(procureToPayValues),
    onTimeDeliveries,
    onTimeBaseCount: onTimeBaseRows.length,
    onTimeDeliveryRate,
    avgOpenAge: averageRounded(openAges),
    maxOpenAge: openAges.length ? Math.max(...openAges) : 0,
  };
}

function pushMetric(map, key, value = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + value;
}

function buildChartSpecs() {
  ensureEnhancedUiState();
  const metricMode = state.ui.dashboardMetricMode === 'count' ? 'count' : 'amount';
  const metricSuffix = metricMode === 'count' ? 'Nombre de dossiers' : 'Montant DZD';
  const bcByMonth = {};
  const supplierMetric = {};
  const requesterMetric = {};
  const statusCount = {};
  const validationCount = { 'Validé': 0, 'À vérifier': 0 };
  const paymentByMonth = {};
  const paymentStatusCount = {};
  const procurementMix = { Achat: 0, Service: 0 };
  const stockLevels = { OK: 0, 'Sous seuil': 0, Rupture: 0 };
  const stockByCategory = {};
  const delayBuckets = { 'À temps': 0, '1-2 j': 0, '3-5 j': 0, '6 j+': 0 };
  const financeDelayBySupplier = {};
  const requestToOrderByRequester = {};
  const requestToOrderByMonth = {};
  const orderToDeliveryBySupplier = {};
  const requestToDeliveryByRequester = {};
  const onTimeBySupplier = {};
  const procureToPayBySupplier = {};
  const openAgeBuckets = { '0-3 j': 0, '4-7 j': 0, '8-14 j': 0, '15 j+': 0 };
  const bcMetricValue = (row) => metricMode === 'count' ? 1 : Number(row.amountTTC || row.amount || 0);
  const paymentMetricValue = (row) => metricMode === 'count' ? 1 : Number(row.amount || 0);

  let activeBcRecords = state.bcRecords || [];
  const kpiFrom = typeof $ === 'function' ? $('kpiDateFrom')?.value : '';
  const kpiTo = typeof $ === 'function' ? $('kpiDateTo')?.value : '';
  if (kpiFrom || kpiTo) {
    activeBcRecords = activeBcRecords.filter(r => {
      if (kpiFrom && String(r.date || '') < kpiFrom) return false;
      if (kpiTo && String(r.date || '') > kpiTo) return false;
      return true;
    });
  }

  activeBcRecords.forEach((row) => {
    const month = (row.date || row.requestDate || 'Sans date').slice(0, 7) || 'Sans date';
    const value = bcMetricValue(row);
    const supplier = row.supplierName || 'Sans fournisseur';
    const requester = row.requester || 'Sans demandeur';
    pushMetric(bcByMonth, month, value);
    pushMetric(supplierMetric, supplier, value);
    pushMetric(requesterMetric, requester, value);
    pushMetric(procurementMix, row.type === 'service' ? 'Service' : 'Achat', value);
    pushMetric(statusCount, statusLabel(row.status), 1);
    validationCount[row.daStatus === 'validated' ? 'Validé' : 'À vérifier'] += 1;
    const delay = computeDelay(row);
    const numericDelay = parseFlexibleNumber(delay.label);
    if (!['late', 'warn'].includes(delay.cls)) delayBuckets['À temps'] += 1;
    else if (numericDelay <= 2) delayBuckets['1-2 j'] += 1;
    else if (numericDelay <= 5) delayBuckets['3-5 j'] += 1;
    else delayBuckets['6 j+'] += 1;

    const requestToOrder = bcLeadRequestToOrder(row);
    if (requestToOrder != null) {
      accumulateAverage(requestToOrderByRequester, requester, requestToOrder);
      accumulateAverage(requestToOrderByMonth, month, requestToOrder);
    }
    const orderToDelivery = bcLeadOrderToDelivery(row);
    if (orderToDelivery != null) accumulateAverage(orderToDeliveryBySupplier, supplier, orderToDelivery);
    const requestToDelivery = bcLeadRequestToDelivery(row);
    if (requestToDelivery != null) accumulateAverage(requestToDeliveryByRequester, requester, requestToDelivery);
    if (row.promisedDate && actualCompletionDate(row)) {
      if (!onTimeBySupplier[supplier]) onTimeBySupplier[supplier] = { onTime: 0, total: 0 };
      onTimeBySupplier[supplier].total += 1;
      if (isDeliveredOnTime(row)) onTimeBySupplier[supplier].onTime += 1;
    }
    const p2p = bcProcureToPayLead(row);
    if (p2p != null) accumulateAverage(procureToPayBySupplier, supplier, p2p);
    const openAge = bcOpenAge(row);
    if (openAge != null) {
      if (openAge <= 3) openAgeBuckets['0-3 j'] += 1;
      else if (openAge <= 7) openAgeBuckets['4-7 j'] += 1;
      else if (openAge <= 14) openAgeBuckets['8-14 j'] += 1;
      else openAgeBuckets['15 j+'] += 1;
    }
  });

  state.payments.forEach((row) => {
    const month = (row.requestDate || 'Sans date').slice(0, 7) || 'Sans date';
    pushMetric(paymentByMonth, month, paymentMetricValue(row));
    pushMetric(paymentStatusCount, statusLabel(row.status), 1);
    const bc = findBcById(row.bcId);
    const supplier = bc?.supplierName || 'Sans fournisseur';
    const delay = businessDaysBetween(row.requestDate || todayYmd(), row.paidDate || todayYmd());
    if (!financeDelayBySupplier[supplier]) financeDelayBySupplier[supplier] = { total: 0, count: 0 };
    financeDelayBySupplier[supplier].total += Math.max(0, delay || 0);
    financeDelayBySupplier[supplier].count += 1;
  });

  state.stockItems.forEach((item) => {
    if (Number(item.qty || 0) <= 0) stockLevels.Rupture += 1;
    else if (Number(item.qty || 0) <= Number(item.minQty || 0)) stockLevels['Sous seuil'] += 1;
    else stockLevels.OK += 1;
    pushMetric(stockByCategory, item.category || 'Sans catégorie', Number(item.qty || 0));
  });

  const financeDelayRows = finalizeAverageRows(financeDelayBySupplier);
  const requestToOrderRows = finalizeAverageRows(requestToOrderByRequester);
  const requestToOrderTrendRows = finalizeAverageRowsChrono(requestToOrderByMonth);
  const orderToDeliveryRows = finalizeAverageRows(orderToDeliveryBySupplier);
  const requestToDeliveryRows = finalizeAverageRows(requestToDeliveryByRequester);
  const onTimeRows = finalizeRateRows(onTimeBySupplier);
  const procureToPayRows = finalizeAverageRows(procureToPayBySupplier);

  return {
    monthlyBc: { key: 'monthlyBc', title: metricMode === 'count' ? 'BC par mois' : 'Montant BC par mois', subtitle: metricSuffix, type: metricMode === 'count' ? 'line' : 'bar', headers: ['Mois', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(bcByMonth).sort((a, b) => a[0].localeCompare(b[0])), format: metricMode === 'count' ? 'count' : 'money' },
    supplierTop: { key: 'supplierTop', title: 'Top fournisseurs', subtitle: metricMode === 'count' ? 'Volume BC' : 'Dépense TTC', type: 'hbar', headers: ['Fournisseur', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(supplierMetric).sort((a, b) => b[1] - a[1]).slice(0, 8), format: metricMode === 'count' ? 'count' : 'money' },
    requesterTop: { key: 'requesterTop', title: 'Top demandeurs', subtitle: metricMode === 'count' ? 'Nombre de BC' : 'Montant piloté', type: 'hbar', headers: ['Demandeur', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(requesterMetric).sort((a, b) => b[1] - a[1]).slice(0, 8), format: metricMode === 'count' ? 'count' : 'money' },
    procurementMix: { key: 'procurementMix', title: 'Mix achats / services', subtitle: metricMode === 'count' ? 'Répartition volume' : 'Répartition montant', type: 'donut', headers: ['Type', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(procurementMix), format: metricMode === 'count' ? 'count' : 'money' },
    statusBc: { key: 'statusBc', title: 'Répartition statuts BC', subtitle: 'Nombre de lignes', type: 'donut', headers: ['Statut', 'Nombre'], rows: Object.entries(statusCount), format: 'count' },
    validationDa: { key: 'validationDa', title: 'Validation BC → DA', subtitle: 'Suivi validation', type: 'donut', headers: ['Validation', 'Nombre'], rows: Object.entries(validationCount), format: 'count' },
    paymentFlow: { key: 'paymentFlow', title: metricMode === 'count' ? 'Paiements créés par mois' : 'Demandes de paiement par mois', subtitle: metricMode === 'count' ? 'Nombre de demandes' : 'Montant demandé', type: 'line', headers: ['Mois', metricMode === 'count' ? 'Nombre' : 'Montant'], rows: Object.entries(paymentByMonth).sort((a, b) => a[0].localeCompare(b[0])), format: metricMode === 'count' ? 'count' : 'money' },
    paymentStatus: { key: 'paymentStatus', title: 'Statut des paiements', subtitle: 'Pipeline finance', type: 'donut', headers: ['Statut', 'Nombre'], rows: Object.entries(paymentStatusCount), format: 'count' },
    financeDelay: { key: 'financeDelay', title: 'Délai finance moyen par fournisseur', subtitle: 'Jours ouvrables', type: 'hbar', headers: ['Fournisseur', 'Jours'], rows: financeDelayRows, format: 'days' },
    deliveryDelay: { key: 'deliveryDelay', title: 'Répartition des délais BC', subtitle: 'Dossiers BC', type: 'bar', headers: ['Classe', 'Nombre'], rows: Object.entries(delayBuckets), format: 'count' },
    requestToOrder: { key: 'requestToOrder', title: 'DA / DS → BC moyen', subtitle: 'Jours ouvrables par demandeur', type: 'hbar', headers: ['Demandeur', 'Jours'], rows: requestToOrderRows, format: 'days' },
    requestToOrderTrend: { key: 'requestToOrderTrend', title: 'DA / DS → BC par mois', subtitle: 'Jours ouvrables moyens', type: 'line', headers: ['Mois', 'Jours'], rows: requestToOrderTrendRows, format: 'days' },
    orderToDelivery: { key: 'orderToDelivery', title: 'BC → livraison moyen', subtitle: 'Jours ouvrables par fournisseur', type: 'hbar', headers: ['Fournisseur', 'Jours'], rows: orderToDeliveryRows, format: 'days' },
    requestToDelivery: { key: 'requestToDelivery', title: 'DA / DS → livraison moyen', subtitle: 'Jours ouvrables par demandeur', type: 'hbar', headers: ['Demandeur', 'Jours'], rows: requestToDeliveryRows, format: 'days' },
    onTimeSupplier: { key: 'onTimeSupplier', title: 'Livraisons à la date promise', subtitle: 'Taux par fournisseur', type: 'hbar', headers: ['Fournisseur', 'Taux'], rows: onTimeRows, format: 'percent' },
    procureToPay: { key: 'procureToPay', title: 'Procure-to-pay moyen', subtitle: 'Jours ouvrables par fournisseur', type: 'hbar', headers: ['Fournisseur', 'Jours'], rows: procureToPayRows, format: 'days' },
    openBcAge: { key: 'openBcAge', title: 'Âge des BC ouvertes', subtitle: 'Temps écoulé depuis émission', type: 'bar', headers: ['Classe', 'Nombre'], rows: Object.entries(openAgeBuckets), format: 'count' },
    stockAlert: { key: 'stockAlert', title: 'Niveaux stock', subtitle: 'Etat du magasin', type: 'bar', headers: ['Niveau', 'Nombre'], rows: Object.entries(stockLevels), format: 'count' },
    stockCategories: { key: 'stockCategories', title: 'Stock par catégorie', subtitle: 'Quantité disponible', type: 'hbar', headers: ['Catégorie', 'Quantité'], rows: Object.entries(stockByCategory).sort((a, b) => b[1] - a[1]).slice(0, 8), format: 'qty' },
  };
}

function chartColors() {
  return ['#3867ff', '#11b8a6', '#7c3aed', '#f59e0b', '#ef4444', '#06b6d4', '#22c55e', '#ec4899'];
}

function chartNumericKind(spec) {
  if (spec?.format) return spec.format;
  const hay = normalizeText([spec.title, spec.subtitle, ...(spec.headers || [])].join(' '));
  if (hay.includes('taux') || hay.includes('%')) return 'percent';
  if (hay.includes('jour')) return 'days';
  if (hay.includes('montant') || hay.includes('depense') || hay.includes('ttc') || hay.includes('dzd') || hay.includes('finance')) return 'money';
  if (hay.includes('quantite') || hay.includes('stock') || hay.includes('qte') || hay.includes('qté')) return 'qty';
  return 'count';
}

function chartDisplayValue(spec, value, compact = false) {
  const kind = chartNumericKind(spec);
  const numeric = Number(value || 0);
  if (kind === 'money') return compact ? formatCompact(numeric) : formatMoney(numeric, 'DZD');
  if (kind === 'days') return `${Math.round(numeric)} j`;
  if (kind === 'percent') return `${Math.round(numeric)}%`;
  if (kind === 'qty') return compact ? formatCompact(numeric) : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(numeric);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(numeric);
}

function renderKpi() {
  ensureEnhancedUiState();
  const kpi = computeKpis();
  const cards = [
    { tone: 'primary', label: 'BC suivies', value: kpi.totalBC, hint: `${kpi.validatedCount} validées · ${kpi.draftCount} à vérifier` },
    { tone: 'primary', label: 'Montant total TTC', value: formatMoney(kpi.totalAmount), hint: `${kpi.purchaseCount} achats · ${kpi.serviceCount} services` },
    { tone: kpi.validationRate >= 85 ? 'success' : 'warn', label: 'Taux validation DA', value: `${kpi.validationRate}%`, hint: `${kpi.validatedCount} / ${kpi.totalBC || 0} dossiers` },
    { tone: kpi.requestDateCoverage ? 'info' : 'warn', label: 'DA / DS → BC', value: `${kpi.avgRequestToBc} j`, hint: `${kpi.requestDateCoverageRate}% des dossiers renseignés` },
    { tone: kpi.deliveredCount ? 'info' : 'warn', label: 'BC → livraison', value: `${kpi.avgBcToDelivery} j`, hint: `${kpi.deliveredCount} dossier(s) livrés / clôturés` },
    { tone: kpi.requestDateCoverage && kpi.deliveredCount ? 'info' : 'warn', label: 'DA / DS → livraison', value: `${kpi.avgRequestToDelivery} j`, hint: 'vision bout-en-bout' },
    { tone: kpi.onTimeDeliveryRate >= 90 ? 'success' : 'warn', label: 'Livraison à temps', value: `${kpi.onTimeDeliveryRate}%`, hint: `${kpi.onTimeDeliveries}/${kpi.onTimeBaseCount || 0} avec date promise` },
    { tone: kpi.avgProcureToPay > 0 ? 'info' : 'warn', label: 'Procure-to-pay', value: `${kpi.avgProcureToPay} j`, hint: `${kpi.paidPayments} paiement(s) soldés` },
    { tone: kpi.pendingPayments ? 'warn' : 'success', label: 'Paiements ouverts', value: formatMoney(kpi.pendingAmount), hint: `${kpi.pendingPayments} ouvert(s) · ${kpi.paidPayments} payé(s)` },
    { tone: kpi.avgFinanceDelay > (state.settings.financeDays || 0) ? 'warn' : 'info', label: 'Délai finance moyen', value: `${kpi.avgFinanceDelay} j`, hint: `objectif ${state.settings.financeDays || 0} j ouvrables` },
    { tone: kpi.maxOpenAge > 14 ? 'danger' : 'warn', label: 'Âge BC ouvertes', value: `${kpi.avgOpenAge} j`, hint: `max ${kpi.maxOpenAge} j · dossiers non soldés` },
    { tone: kpi.stockCritical ? 'danger' : (kpi.stockLow ? 'warn' : 'success'), label: 'Alertes stock', value: kpi.stockLow, hint: `${kpi.stockCritical} rupture(s) · ${state.stockItems.length} article(s)` },
    { tone: 'info', label: 'Panier moyen BC', value: formatMoney(kpi.avgBcAmount), hint: `${kpi.supplierCount} fournisseur(s) · ${kpi.requesterCount} demandeur(s)` },
  ];
  const kpiGrid = $('kpiGrid');
  if (kpiGrid) {
    kpiGrid.innerHTML = cards.map((card) => `<div class="kpi-card ${card.tone}"><div class="label">${escapeHtml(card.label)}</div><div class="value">${escapeHtml(String(card.value))}</div><div class="hint">${escapeHtml(card.hint)}</div></div>`).join('');
  }

  const attention = [];
  if (kpi.requestDateCoverage < kpi.totalBC) {
    attention.push(`<div class="focus-item"><strong>Compléter la date DA / DS</strong><span>${escapeHtml(String(kpi.totalBC - kpi.requestDateCoverage))} dossier(s) n’ont pas encore la date interne de départ.</span><div class="focus-tags"><span class="mini-tag">KPI cycle time</span><span class="mini-tag">champ ajouté</span></div></div>`);
  }
  state.bcRecords.filter((row) => computeDelay(row).cls === 'late').slice(0, 4).forEach((row) => {
    const delay = computeDelay(row);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.ref)} — ${escapeHtml(row.supplierName || 'Sans fournisseur')}</strong><span>${escapeHtml(delay.label)} · promise ${escapeHtml(formatDate(row.promisedDate))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(row.requester || 'Sans demandeur')}</span></div></div>`);
  });
  state.payments.filter((row) => row.status !== 'paye').slice(0, 3).forEach((row) => {
    const bc = findBcById(row.bcId);
    attention.push(`<div class="focus-item"><strong>${escapeHtml(row.paymentRef || 'Demande paiement')}</strong><span>${escapeHtml(bc?.supplierName || 'Sans fournisseur')} · ${escapeHtml(formatMoney(row.amount || 0, 'DZD'))}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(statusLabel(row.status))}</span><span class="mini-tag">${escapeHtml(formatDate(row.requestDate))}</span></div></div>`);
  });
  state.stockItems.filter((item) => Number(item.qty || 0) <= Number(item.minQty || 0)).slice(0, 3).forEach((item) => {
    attention.push(`<div class="focus-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code || 'Sans code')} · ${escapeHtml(item.location || 'Sans emplacement')}</span><div class="focus-tags"><span class="mini-tag">${escapeHtml(stockAlertLabel(item))}</span><span class="mini-tag">${escapeHtml(String(item.qty))} ${escapeHtml(item.unit || '')}</span></div></div>`);
  });
  const focusList = $('focusList');
  if (focusList) {
    focusList.innerHTML = attention.length ? attention.join('') : '<div class="focus-item"><strong>RAS</strong><span>Aucun point critique en ce moment.</span></div>';
  }

  const summaryList = $('summaryList');
  if (summaryList) {
    summaryList.innerHTML = [
      { title: 'Prochaine réf BC', text: nextBcRefPreview() },
      { title: 'Prochaine réf DA', text: nextDaRefPreview() },
      { title: 'Couverture date DA / DS', text: `${kpi.requestDateCoverage}/${kpi.totalBC || 0} dossier(s)` },
      { title: 'Base livraison à temps', text: `${kpi.onTimeBaseCount} dossier(s)` },
      { title: 'Vue dashboard', text: state.ui.dashboardMetricMode === 'count' ? 'Volumes / dossiers' : 'Montants / valeur' },
      { title: 'Stock total', text: `${formatCompact(kpi.totalStockQty)} unité(s)` },
    ].map((row) => `<div class="summary-item"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.text)}</span></div>`).join('');
  }

  renderCharts();
  syncDashboardMetricButtons();
}

function optionLabel(id) {
  const el = $(id);
  if (!el) return '—';
  return el.options?.[el.selectedIndex]?.text || el.value || '—';
}

function collectFilterSummary(section, typeOverride = '') {
  const rows = [];
  if (section === 'followup') {
    rows.push(['Recherche', $('followupSearch')?.value || '—']);
    rows.push(['Validation DA', optionLabel('followupValidationFilter')]);
    rows.push(['Statut BC', optionLabel('followupStatusFilter')]);
    rows.push(['Type', optionLabel('followupTypeFilter')]);
    rows.push(['Fournisseur', optionLabel('followupSupplierFilter')]);
    rows.push(['Demandeur', optionLabel('followupRequesterFilter')]);
    rows.push(['Date début', $('followupDateFrom')?.value || '—']);
    rows.push(['Date fin', $('followupDateTo')?.value || '—']);
    rows.push(['Tri', optionLabel('followupSortField')]);
    rows.push(['Ordre', optionLabel('followupSortDir')]);
  }
  if (section === 'payments') {
    rows.push(['Recherche', $('paymentSearch')?.value || '—']);
    rows.push(['Statut', optionLabel('paymentFilterStatus')]);
    rows.push(['Mode', optionLabel('paymentFilterMode')]);
    rows.push(['Fournisseur', optionLabel('paymentFilterSupplier')]);
    rows.push(['Date début', $('paymentDateFrom')?.value || '—']);
    rows.push(['Date fin', $('paymentDateTo')?.value || '—']);
    rows.push(['Tri', optionLabel('paymentSortField')]);
    rows.push(['Ordre', optionLabel('paymentSortDir')]);
  }
  if (section === 'stockItems') {
    rows.push(['Recherche articles', $('stockItemsSearch')?.value || '—']);
    rows.push(['Alerte', optionLabel('stockItemsAlertFilter')]);
    rows.push(['Catégorie', optionLabel('stockItemsCategoryFilter')]);
    rows.push(['Fournisseur', optionLabel('stockItemsSupplierFilter')]);
    rows.push(['Demandeur', optionLabel('stockItemsRequesterFilter')]);
    rows.push(['Emplacement', optionLabel('stockItemsLocationFilter')]);
    rows.push(['Tri', optionLabel('stockItemSortField')]);
    rows.push(['Ordre', optionLabel('stockItemSortDir')]);
  }
  if (section === 'stockLogs') {
    rows.push(['Recherche mouvements', $('stockLogsSearch')?.value || '—']);
    rows.push(['Type', typeOverride === 'in' ? 'Entrées (forcé)' : typeOverride === 'out' ? 'Sorties (forcé)' : optionLabel('stockLogsTypeFilter')]);
    rows.push(['Personne', optionLabel('stockLogsPersonFilter')]);
    rows.push(['Service', optionLabel('stockLogsDepartmentFilter')]);
    rows.push(['Date début', $('stockLogsDateFrom')?.value || '—']);
    rows.push(['Date fin', $('stockLogsDateTo')?.value || '—']);
    rows.push(['Tri', optionLabel('stockLogSortField')]);
    rows.push(['Ordre', optionLabel('stockLogSortDir')]);
  }
  return rows;
}

function buildExportInfoRows(section, rowCount, typeOverride = '') {
  return [
    ['Export généré le', new Date().toLocaleString('fr-FR')],
    ['Lignes exportées', rowCount],
    ...collectFilterSummary(section, typeOverride),
  ];
}

function buildFollowupExportRows(rows) {
  return rows.map((row) => [
    row.ref,
    row.daRef,
    row.requestDate,
    validationLabel(row),
    row.date,
    row.supplierName,
    row.type,
    row.amountTTC || row.amount,
    statusLabel(row.status),
    row.promisedDate,
    actualCompletionDate(row),
    row.goodsReceivedDate,
    row.serviceDoneDate,
    bcLeadRequestToOrder(row),
    bcLeadOrderToDelivery(row),
    bcLeadRequestToDelivery(row),
    isDeliveredOnTime(row) ? 'Oui' : 'Non',
    row.requester,
    row.paymentTerms,
    row.comments,
    row.notes,
    row.sourceFile,
  ]);
}

function buildPaymentExportRows(rows) {
  return rows.map((row) => {
    const bc = findBcById(row.bcId);
    return [
      row.paymentRef,
      bc?.ref || '',
      bc?.supplierName || '',
      row.requestDate,
      row.paidDate,
      row.amount,
      row.mode,
      row.transactionRef,
      statusLabel(row.status),
      row.notes,
      bc ? bcProcureToPayLead(bc) : '',
    ];
  });
}

function buildStockItemExportRows(rows) {
  return rows.map((row) => [row.code, row.name, row.category, row.qty, row.minQty, row.unit, row.location, row.supplierName, row.requester, row.notes]);
}

function filteredStockLogsForExport(typeOverride = '') {
  ensureEnhancedUiState();
  const q = normalizeText($('stockLogsSearch')?.value || '');
  const type = typeOverride || $('stockLogsTypeFilter')?.value || 'all';
  const person = $('stockLogsPersonFilter')?.value || 'all';
  const department = $('stockLogsDepartmentFilter')?.value || 'all';
  const dateFrom = $('stockLogsDateFrom')?.value || '';
  const dateTo = $('stockLogsDateTo')?.value || '';
  const sortField = $('stockLogSortField')?.value || state.ui.stockLogSortField || 'date';
  const sortDir = $('stockLogSortDir')?.value || state.ui.stockLogSortDir || 'desc';
  const dir = sortDir === 'asc' ? 1 : -1;
  return state.stockLogs.filter((log) => {
    const item = findStockItemById(log.itemId);
    if (type !== 'all' && log.type !== type) return false;
    if (person !== 'all' && (log.person || '') !== person) return false;
    if (department !== 'all' && (log.department || '') !== department) return false;
    if (dateFrom && String(log.date || '') < dateFrom) return false;
    if (dateTo && String(log.date || '') > dateTo) return false;
    if (!q) return true;
    const hay = normalizeText([log.person, log.department, log.notes, log.type, item?.name, item?.code].join(' | '));
    return hay.includes(q);
  }).sort((a, b) => {
    const cmp = compareEnhancedValues(stockLogSortValue(a, sortField), stockLogSortValue(b, sortField), dir);
    if (cmp) return cmp;
    return String(b.date || '').localeCompare(String(a.date || ''));
  });
}

function buildStockLogExportRows(rows) {
  return rows.map((row) => {
    const item = findStockItemById(row.itemId);
    return [row.date, row.type === 'in' ? 'Entrée' : 'Sortie', item?.code || '', item?.name || '', row.qty, row.person, row.department, row.notes];
  });
}

function buildProcurementKpiCatalog(kpi = computeKpis()) {
  return [
    { category: 'Cycle time', title: 'DA / DS → BC', formula: 'Date BC - date demande interne', value: kpi.requestDateCoverage ? `${kpi.avgRequestToBc} j` : 'À renseigner', status: kpi.requestDateCoverage ? 'Calcul auto' : 'Champ ajouté', tone: kpi.requestDateCoverage ? 'auto' : 'partial', source: 'APQC · Oracle', note: 'Mesure la vitesse de transformation de la demande interne en BC.' },
    { category: 'Cycle time', title: 'BC → livraison / service', formula: 'Date réception/service - date BC', value: kpi.deliveredCount ? `${kpi.avgBcToDelivery} j` : '—', status: kpi.deliveredCount ? 'Calcul auto' : 'En attente de réception', tone: kpi.deliveredCount ? 'auto' : 'partial', source: 'APQC', note: 'Proxy du supplier lead time observé côté exploitation.' },
    { category: 'Cycle time', title: 'DA / DS → livraison', formula: 'Date réception/service - date demande interne', value: kpi.requestDateCoverage && kpi.deliveredCount ? `${kpi.avgRequestToDelivery} j` : 'À compléter', status: kpi.requestDateCoverage ? 'Partiel' : 'Date DA/DS requise', tone: kpi.requestDateCoverage ? 'partial' : 'future', source: 'APQC', note: 'Vue bout-en-bout de la demande jusqu’à l’achèvement.' },
    { category: 'End-to-end', title: 'Procure-to-pay', formula: 'Date dernier paiement - date BC', value: kpi.avgProcureToPay ? `${kpi.avgProcureToPay} j` : '—', status: kpi.paidPayments ? 'Calcul auto' : 'Paiement lié requis', tone: kpi.paidPayments ? 'auto' : 'partial', source: 'APQC', note: 'Le cycle P2P est un indicateur de référence pour la fluidité du process.' },
    { category: 'Supplier performance', title: 'Livraison à la date promise', formula: 'Livraisons à temps / livraisons avec date promise', value: `${kpi.onTimeDeliveryRate}%`, status: kpi.onTimeBaseCount ? 'Calcul auto' : 'Date promise + réception', tone: kpi.onTimeBaseCount ? 'auto' : 'partial', source: 'APQC · Oracle', note: 'Suivi de la fiabilité fournisseur par rapport à l’échéance promise.' },
    { category: 'Supplier performance', title: 'Supplier lead time', formula: 'Date réception - date BC', value: kpi.deliveredCount ? `${kpi.avgBcToDelivery} j` : '—', status: kpi.deliveredCount ? 'Calcul auto' : 'Réception requise', tone: kpi.deliveredCount ? 'auto' : 'partial', source: 'APQC', note: 'Très utile pour les négociations et la planification appro.' },
    { category: 'Efficiency', title: 'Cycle time validation BC → DA', formula: 'Date validation - date BC', value: `${kpi.avgBcToValidation} j`, status: kpi.validatedCount ? 'Calcul auto' : 'Validation requise', tone: kpi.validatedCount ? 'auto' : 'partial', source: 'Oracle', note: 'Proxy rapide pour la cadence d’approbation interne.' },
    { category: 'Efficiency', title: 'BC validées électroniquement', formula: 'BC validées / BC total', value: `${kpi.validationRate}%`, status: 'Calcul auto', tone: 'auto', source: 'APQC', note: 'Le taux de validation numérique est une bonne mesure d’automatisation.' },
    { category: 'Compliance', title: 'Price compliance', formula: 'Écart prix facture vs prix BC/contrat', value: 'À instrumenter', status: 'Champ futur', tone: 'future', source: 'Oracle', note: 'Prévoir le prix facture reçu pour piloter les écarts de prix.' },
    { category: 'Supplier performance', title: 'Quantity compliance / OTIF-ready', formula: 'Qté reçue complète et à temps / commandes', value: 'À instrumenter', status: 'Qté reçue requise', tone: 'future', source: 'Oracle', note: 'Le modèle est prêt à accueillir une mesure OTIF si vous ajoutez la quantité reçue.' },
    { category: 'Inventory', title: 'Inventory turnover', formula: 'COGS / stock moyen', value: 'À instrumenter', status: 'Coûts article requis', tone: 'future', source: 'Lokad', note: 'Très utile pour compléter le pilotage appro + stock.' },
  ];
}

function renderProcurementKpiLibrary() {
  const host = $('procurementKpiLibrary');
  if (!host) return;
  host.innerHTML = buildProcurementKpiCatalog().map((card) => `
    <article class="proc-kpi-card">
      <div class="proc-kpi-head">
        <div>
          <div class="proc-kpi-category">${escapeHtml(card.category)}</div>
          <h4>${escapeHtml(card.title)}</h4>
        </div>
        <span class="proc-kpi-status ${escapeHtml(card.tone)}">${escapeHtml(card.status)}</span>
      </div>
      <div class="proc-kpi-value">${escapeHtml(card.value)}</div>
      <div class="proc-kpi-formula">${escapeHtml(card.formula)}</div>
      <p class="proc-kpi-note">${escapeHtml(card.note)}</p>
      <div class="proc-kpi-source">Source d’inspiration : ${escapeHtml(card.source)}</div>
    </article>
  `).join('');
}

function buildReportHighlights(kpi = computeKpis()) {
  const highlights = [];
  if (kpi.onTimeBaseCount && kpi.onTimeDeliveryRate < 90) {
    highlights.push({ title: 'Priorité fournisseur', text: `Le taux de livraison à temps est à ${kpi.onTimeDeliveryRate}%. Consulte le graphe fournisseur.`, action: 'chart:onTimeSupplier' });
  }
  if (kpi.requestDateCoverage < kpi.totalBC) {
    highlights.push({ title: 'Nouveau champ KPI', text: `Renseigne Date DA / DS sur ${kpi.totalBC - kpi.requestDateCoverage} dossier(s) pour fiabiliser les cycles.`, action: 'none' });
  }
  if (kpi.maxOpenAge > 14) {
    highlights.push({ title: 'BC ouvertes vieillissantes', text: `Le plus vieux dossier ouvert a ${kpi.maxOpenAge} j ouvrables.`, action: 'chart:openBcAge' });
  }
  return highlights;
}

function renderReportHighlights() {
  const host = $('reportHighlights');
  if (!host) return;
  host.innerHTML = buildReportHighlights().map((item) => `<div class="dataset-row"><div><strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.text)}</div></div>${item.action && item.action !== 'none' ? `<button class="btn btn-soft" type="button" data-export-custom="${escapeHtml(item.action)}">Ouvrir</button>` : `<span class="panel-tag">Info</span>`}</div>`).join('');
}

function renderReports() {
  ensureEnhancedUiState();
  const summaryHost = $('reportsSummaryGrid');
  const deptHost = $('reportsDeptBreakdown');
  const supplierHost = $('reportsSupplierBreakdown');
  const metricsHost = $('reportsKeyMetricsGrid');

  const kpi = computeKpis();
  const totalBC = state.bcRecords.length;
  const totalAmountTTC = state.bcRecords.reduce((acc, r) => acc + (Number(r.amountTTC || r.amount) || 0), 0);
  const totalPaid = state.payments.reduce((acc, p) => p.status === 'paye' ? acc + (Number(p.amount) || 0) : acc, 0);
  const pendingPayments = state.payments.filter((p) => p.status !== 'paye');
  const pendingCount = pendingPayments.length;
  const pendingAmount = pendingPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const avgFinanceDelay = kpi.avgFinanceDelay || 0;
  const remainingDebt = Math.max(0, totalAmountTTC - totalPaid);
  const settlementRate = totalAmountTTC > 0 ? Math.round((totalPaid / totalAmountTTC) * 100) : 0;
  const deliveredCount = state.bcRecords.filter((r) => ['livre', 'service_fait', 'paye', 'clos'].includes(r.status)).length;
  const realizationRate = totalBC > 0 ? Math.round((deliveredCount / totalBC) * 100) : 0;

  const totalInvoiced = state.bcRecords.filter((r) => ['livre', 'service_fait', 'paye', 'clos'].includes(r.status) || r.goodsReceivedDate || r.serviceDoneDate).reduce((acc, r) => acc + (Number(r.amountTTC || r.amount) || 0), 0);
  const invoicedRate = totalAmountTTC > 0 ? Math.round((totalInvoiced / totalAmountTTC) * 100) : 0;

  if (summaryHost) {
    summaryHost.innerHTML = `
      <div class="report-metric-card report-metric-blue">
        <div class="report-metric-label">Total Engagé (BC)</div>
        <div class="report-metric-value">${escapeHtml(formatMoney(totalAmountTTC, 'DZD'))}</div>
        <div class="report-metric-sub"><i class="fas fa-file-contract me-1"></i> ${escapeHtml(String(totalBC))} bons de commande émis</div>
      </div>
      <div class="report-metric-card report-metric-emerald">
        <div class="report-metric-label">DP Payées (Règlements)</div>
        <div class="report-metric-value" style="color:#10b981;">${escapeHtml(formatMoney(totalPaid, 'DZD'))}</div>
        <div class="report-metric-sub"><i class="fas fa-check-double me-1"></i> Décaissements : ${escapeHtml(String(settlementRate))}%</div>
      </div>
      <div class="report-metric-card report-metric-amber">
        <div class="report-metric-label">DP en Attente (Paiements)</div>
        <div class="report-metric-value" style="color:#f59e0b;">${escapeHtml(formatMoney(pendingAmount, 'DZD'))}</div>
        <div class="report-metric-sub"><i class="fas fa-hourglass-half me-1"></i> ${escapeHtml(String(pendingCount))} DP en instance (${escapeHtml(formatMoney(remainingDebt, 'DZD'))} solde dû)</div>
      </div>
      <div class="report-metric-card report-metric-purple">
        <div class="report-metric-label">Délai Moyen de Règlement</div>
        <div class="report-metric-value" style="color:#8b5cf6;">${escapeHtml(String(avgFinanceDelay))} jours</div>
        <div class="report-metric-sub"><i class="fas fa-clock me-1"></i> Objectif P2P : ≤ 15 jours ouvrables</div>
      </div>
    `;
  }

  const p2pHost = $('reportsP2pPipeline');
  if (p2pHost) {
    const daCount = state.bcRecords.filter((r) => r.daRef).length;
    const bcCount = totalBC;
    const recCount = deliveredCount;
    const invCount = state.bcRecords.filter((r) => ['livre', 'service_fait', 'paye', 'clos'].includes(r.status) || r.goodsReceivedDate || r.serviceDoneDate).length;
    const paidCount = state.payments.filter((p) => p.status === 'paye').length;

    p2pHost.innerHTML = `
      <div class="p2p-step">
        <div class="p2p-badge p2p-badge-1"><i class="fas fa-file-signature"></i></div>
        <div class="p2p-info">
          <div class="p2p-title">1. Expression DA</div>
          <div class="p2p-val">${daCount} DA</div>
          <div class="p2p-sub">Délai DA→BC : ${kpi.avgRequestToBc || 0}j</div>
        </div>
      </div>
      <div class="p2p-arrow"><i class="fas fa-chevron-right"></i></div>
      <div class="p2p-step">
        <div class="p2p-badge p2p-badge-2"><i class="fas fa-file-invoice"></i></div>
        <div class="p2p-info">
          <div class="p2p-title">2. Bon de Commande</div>
          <div class="p2p-val">${bcCount} BC</div>
          <div class="p2p-sub">${formatMoney(totalAmountTTC, 'DZD')}</div>
        </div>
      </div>
      <div class="p2p-arrow"><i class="fas fa-chevron-right"></i></div>
      <div class="p2p-step">
        <div class="p2p-badge p2p-badge-3"><i class="fas fa-truck-ramp-box"></i></div>
        <div class="p2p-info">
          <div class="p2p-title">3. Réception Marchandise</div>
          <div class="p2p-val">${recCount} Livraisons</div>
          <div class="p2p-sub">Réalisation : ${realizationRate}%</div>
        </div>
      </div>
      <div class="p2p-arrow"><i class="fas fa-chevron-right"></i></div>
      <div class="p2p-step">
        <div class="p2p-badge p2p-badge-4"><i class="fas fa-file-invoice-dollar"></i></div>
        <div class="p2p-info">
          <div class="p2p-title">4. Facturation Fournisseur</div>
          <div class="p2p-val">${invCount} Factures</div>
          <div class="p2p-sub">${formatMoney(totalInvoiced, 'DZD')}</div>
        </div>
      </div>
      <div class="p2p-arrow"><i class="fas fa-chevron-right"></i></div>
      <div class="p2p-step">
        <div class="p2p-badge p2p-badge-5"><i class="fas fa-stamp"></i></div>
        <div class="p2p-info">
          <div class="p2p-title">5. Paiement & Clôture</div>
          <div class="p2p-val">${paidCount} DP Réglées</div>
          <div class="p2p-sub">${formatMoney(totalPaid, 'DZD')}</div>
        </div>
      </div>
    `;
  }

  if (deptHost) {
    const deptTotals = {};
    state.bcRecords.forEach((r) => {
      const d = r.department || 'Direction Générale';
      deptTotals[d] = (deptTotals[d] || 0) + (Number(r.amountTTC || r.amount) || 0);
    });
    const sortedDepts = Object.entries(deptTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxDeptVal = sortedDepts[0]?.[1] || 1;
    deptHost.innerHTML = sortedDepts.length ? sortedDepts.map(([name, amt], idx) => {
      const pct = Math.round((amt / (totalAmountTTC || 1)) * 100);
      const barPct = Math.round((amt / maxDeptVal) * 100);
      return `
        <div class="reports-bar-row" style="margin-bottom:0.75rem;">
          <div class="reports-bar-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="reports-bar-name" style="font-weight:600;font-size:0.83rem;">
              <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:rgba(37,99,235,0.12);color:#2563eb;font-size:10px;font-weight:700;margin-right:6px;">${idx + 1}</span>
              ${escapeHtml(name)}
            </span>
            <span class="reports-bar-amount" style="font-weight:700;font-size:0.83rem;">
              ${escapeHtml(formatMoney(amt, 'DZD'))} <span class="tag-primary" style="font-size:10px;padding:1px 6px;margin-left:4px;">${escapeHtml(String(pct))}%</span>
            </span>
          </div>
          <div class="reports-bar-track">
            <div class="reports-bar-fill" style="width: ${escapeHtml(String(barPct))}%;"></div>
          </div>
        </div>
      `;
    }).join('') : `<div class="muted">Aucune donnée structurelle disponible.</div>`;
  }

  if (supplierHost) {
    const suppTotals = {};
    state.bcRecords.forEach((r) => {
      const s = r.supplierName || 'Divers Partenaires';
      suppTotals[s] = (suppTotals[s] || 0) + (Number(r.amountTTC || r.amount) || 0);
    });
    const sortedSupp = Object.entries(suppTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxSuppVal = sortedSupp[0]?.[1] || 1;
    supplierHost.innerHTML = sortedSupp.length ? sortedSupp.map(([name, amt], idx) => {
      const pct = Math.round((amt / (totalAmountTTC || 1)) * 100);
      const barPct = Math.round((amt / maxSuppVal) * 100);
      return `
        <div class="reports-bar-row" style="margin-bottom:0.75rem;">
          <div class="reports-bar-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="reports-bar-name" style="font-weight:600;font-size:0.83rem;">
              <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:rgba(16,185,129,0.12);color:#059669;font-size:10px;font-weight:700;margin-right:6px;">${idx + 1}</span>
              ${escapeHtml(name)}
            </span>
            <span class="reports-bar-amount" style="font-weight:700;font-size:0.83rem;">
              ${escapeHtml(formatMoney(amt, 'DZD'))} <span class="tag-success" style="font-size:10px;padding:1px 6px;margin-left:4px;">${escapeHtml(String(pct))}%</span>
            </span>
          </div>
          <div class="reports-bar-track">
            <div class="reports-bar-fill secondary" style="width: ${escapeHtml(String(barPct))}%;"></div>
          </div>
        </div>
      `;
    }).join('') : `<div class="muted">Aucune dépense fournisseur enregistrée.</div>`;
  }

  if (metricsHost) {
    const indicators = [
      ['Volume total des engagements', formatMoney(totalAmountTTC, 'DZD'), 'Total des commandes émises et contrats'],
      ['Total décaissements effectués', formatMoney(totalPaid, 'DZD'), 'Paiements fournisseurs exécutés'],
      ['Encours fournisseur actuel', formatMoney(remainingDebt, 'DZD'), 'Solde restant dû sur base active'],
      ['Taux global de règlement', `${settlementRate}%`, 'Ratio règlements / volume engagé'],
      ['Commandes honorées (réalisées)', `${realizationRate}%`, 'Marchandises reçues ou prestations faites'],
      ['Respect des délais contractuels', `${kpi.onTimeDeliveryRate}%`, 'Livraisons conformes à la date promise'],
      ['Délai moyen DA → BC', `${kpi.avgRequestToBc} j`, 'Délai traitement expression de besoin'],
      ['Délai moyen BC → Réception', `${kpi.avgBcToDelivery} j`, 'Jours ouvrables acheminement fournisseur'],
      ['Délai moyen Procure-to-Pay', `${kpi.avgProcureToPay} j`, 'Cycle complet de la commande au virement'],
      ['Panier moyen par commande', formatMoney(kpi.avgBcAmount, 'DZD'), 'Montant moyen unitaire des BC'],
    ];
    metricsHost.innerHTML = indicators.map(([title, val, desc]) => `
      <div class="reports-metric-item">
        <div class="reports-metric-item-info">
          <span class="reports-metric-item-title">${escapeHtml(title)}</span>
          <span class="reports-metric-item-desc">${escapeHtml(desc)}</span>
        </div>
        <span class="reports-metric-item-val">${escapeHtml(val)}</span>
      </div>
    `).join('');
  }

  if (typeof switchReportsSubview === 'function') {
    const wasRendering = typeof _isRenderingReports !== 'undefined' ? _isRenderingReports : false;
    if (typeof _isRenderingReports !== 'undefined') _isRenderingReports = true;
    try {
      switchReportsSubview((typeof currentReportsSubview !== 'undefined' && currentReportsSubview) ? currentReportsSubview : 'summary');
    } finally {
      if (typeof _isRenderingReports !== 'undefined') _isRenderingReports = wasRendering;
    }
  }
}
if (typeof window !== 'undefined') window.renderReports = renderReports;

function exportExecutiveSummaryWorkbook() {
  const kpi = computeKpis();
  const totalBC = state.bcRecords.length;
  const totalAmountTTC = state.bcRecords.reduce((acc, r) => acc + (Number(r.amountTTC || r.amount) || 0), 0);
  const totalPaid = state.payments.reduce((acc, p) => p.status === 'paye' ? acc + (Number(p.amount) || 0) : acc, 0);
  const remainingDebt = Math.max(0, totalAmountTTC - totalPaid);
  const settlementRate = totalAmountTTC > 0 ? Math.round((totalPaid / totalAmountTTC) * 100) : 0;
  const deliveredCount = state.bcRecords.filter((r) => ['livre', 'service_fait', 'paye', 'clos'].includes(r.status)).length;
  const realizationRate = totalBC > 0 ? Math.round((deliveredCount / totalBC) * 100) : 0;

  const summaryRows = [
    ['Volume global des BC émis', totalBC, 'Nombre total de dossiers gérés'],
    ['Montant total engagé (TTC)', totalAmountTTC, 'DZD'],
    ['Montant total réglé (TTC)', totalPaid, 'DZD'],
    ['Encours fournisseur résiduel', remainingDebt, 'DZD'],
    ['Taux de règlement financier', `${settlementRate}%`, 'Ratio payé / engagé'],
    ['Taux de réalisation opérationnelle', `${realizationRate}%`, `${deliveredCount} BC livrés sur ${totalBC}`],
    ['Taux de respect des délais', `${kpi.onTimeDeliveryRate}%`, 'Dossiers à l’échéance'],
    ['Délai moyen DA -> BC', `${kpi.avgRequestToBc} jours`, 'Traitement achat interne'],
    ['Délai moyen BC -> Livraison', `${kpi.avgBcToDelivery} jours`, 'Délai d’exécution fournisseur'],
    ['Délai moyen Procure-to-Pay', `${kpi.avgProcureToPay} jours`, 'Cycle de paiement complet'],
    ['Dossiers en retard', kpi.lateCount, 'Échéance promise dépassée'],
  ];

  const deptTotals = {};
  const deptCounts = {};
  state.bcRecords.forEach((r) => {
    const d = r.department || 'Non spécifié';
    deptTotals[d] = (deptTotals[d] || 0) + (Number(r.amountTTC || r.amount) || 0);
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const deptRows = Object.entries(deptTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, amt]) => [
      dept,
      amt,
      deptCounts[dept] || 0,
      `${Math.round((amt / (totalAmountTTC || 1)) * 100)}%`
    ]);

  const suppTotals = {};
  const suppCounts = {};
  state.bcRecords.forEach((r) => {
    const s = r.supplierName || 'Divers';
    suppTotals[s] = (suppTotals[s] || 0) + (Number(r.amountTTC || r.amount) || 0);
    suppCounts[s] = (suppCounts[s] || 0) + 1;
  });
  const suppRows = Object.entries(suppTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([supp, amt]) => [
      supp,
      amt,
      suppCounts[supp] || 0,
      `${Math.round((amt / (totalAmountTTC || 1)) * 100)}%`
    ]);

  exportWorkbook(`synthese_executive_achats_${todayYmd()}.xlsx`, [
    { name: 'Synthese_Executive', headers: ['Indicateur', 'Valeur', 'Observations / Unité'], rows: summaryRows },
    { name: 'Depenses_Par_Structure', headers: ['Structure / Département', 'Montant TTC (DZD)', 'Nombre de BC', 'Part (%)'], rows: deptRows },
    { name: 'Top_Fournisseurs', headers: ['Fournisseur', 'Montant TTC (DZD)', 'Nombre de BC', 'Part (%)'], rows: suppRows },
  ]);
  showToast('Synthèse exécutive Excel exportée.');
}

function exportFollowupWorkbook() {
  const rows = filteredBcRecords();
  exportWorkbook(`suivi_bc_${todayYmd()}.xlsx`, [
    { name: 'Suivi_BC', headers: ['Réf BC', 'Réf DA', 'Date DA/DS', 'Validation DA', 'Date BC', 'Fournisseur', 'Type', 'Montant TTC', 'Statut BC', 'Date promise', 'Date fin réelle', 'Date réception', 'Date service', 'DA/DS -> BC (j)', 'BC -> fin (j)', 'DA/DS -> fin (j)', 'À temps', 'Demandeur', 'Conditions paiement', 'Commentaire', 'Notes', 'Source'], rows: buildFollowupExportRows(rows) },
    { name: 'Infos_export', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('followup', rows.length) },
  ]);
  showToast('Suivi BC exporté.');
}

function exportPaymentsWorkbook() {
  const rows = filteredPayments();
  exportWorkbook(`paiements_${todayYmd()}.xlsx`, [
    { name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes', 'Procure-to-pay BC lié (j)'], rows: buildPaymentExportRows(rows) },
    { name: 'Infos_export', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('payments', rows.length) },
  ]);
  showToast('Paiements exportés.');
}

function exportStockItemsWorkbook() {
  const rows = filteredStockItems();
  exportWorkbook(`stock_articles_${todayYmd()}.xlsx`, [
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Demandeur', 'Notes'], rows: buildStockItemExportRows(rows) },
    { name: 'Infos_export', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('stockItems', rows.length) },
  ]);
  showToast('Articles stock exportés.');
}

function exportStockLogsWorkbook(typeOverride = '') {
  const rows = filteredStockLogsForExport(typeOverride);
  const suffix = typeOverride === 'in' ? 'entrees' : typeOverride === 'out' ? 'sorties' : 'mouvements';
  const sheetName = typeOverride === 'in' ? 'Entrees' : typeOverride === 'out' ? 'Sorties' : 'Historique_Stock';
  exportWorkbook(`stock_${suffix}_${todayYmd()}.xlsx`, [
    { name: sheetName, headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: buildStockLogExportRows(rows) },
    { name: 'Infos_export', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('stockLogs', rows.length, typeOverride) },
  ]);
  showToast(`Historique ${suffix} exporté.`);
}

function exportStockWorkbook() {
  const items = filteredStockItems();
  const logs = filteredStockLogsForExport();
  const inLogs = filteredStockLogsForExport('in');
  const outLogs = filteredStockLogsForExport('out');
  exportWorkbook(`stock_${todayYmd()}.xlsx`, [
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Demandeur', 'Notes'], rows: buildStockItemExportRows(items) },
    { name: 'Historique_Stock', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: buildStockLogExportRows(logs) },
    { name: 'Entrees', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: buildStockLogExportRows(inLogs) },
    { name: 'Sorties', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: buildStockLogExportRows(outLogs) },
    { name: 'Infos_Articles', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('stockItems', items.length) },
    { name: 'Infos_Mouvements', headers: ['Filtre', 'Valeur'], rows: buildExportInfoRows('stockLogs', logs.length) },
  ]);
  showToast('Vue stock exportée.');
}

function exportProcurementLibraryWorkbook() {
  const rows = buildProcurementKpiCatalog().map((card) => [card.category, card.title, card.formula, card.value, card.status, card.source, card.note]);
  exportWorkbook(`bibliotheque_kpi_appro_${todayYmd()}.xlsx`, [{ name: 'KPI_Appro', headers: ['Catégorie', 'KPI', 'Formule', 'Valeur actuelle', 'Disponibilité', 'Source', 'Note'], rows }]);
  showToast('Bibliothèque KPI exportée.');
}

function exportKpiWorkbook() {
  const kpi = computeKpis();
  exportWorkbook(`kpi_${todayYmd()}.xlsx`, [
    { name: 'KPI', headers: ['Indicateur', 'Valeur'], rows: [
      ['BC suivies', kpi.totalBC],
      ['Montant total', kpi.totalAmount],
      ['BC validées', kpi.validatedCount],
      ['BC à vérifier', kpi.draftCount],
      ['Taux validation DA', `${kpi.validationRate}%`],
      ['DA/DS -> BC', `${kpi.avgRequestToBc} j`],
      ['BC -> livraison', `${kpi.avgBcToDelivery} j`],
      ['DA/DS -> livraison', `${kpi.avgRequestToDelivery} j`],
      ['Livraison à la date promise', `${kpi.onTimeDeliveryRate}%`],
      ['Procure-to-pay moyen', `${kpi.avgProcureToPay} j`],
      ['Délai finance moyen', `${kpi.avgFinanceDelay} j`],
      ['BC en retard', kpi.lateCount],
      ['BC ouvertes âge moyen', `${kpi.avgOpenAge} j`],
      ['Alertes stock', kpi.stockLow],
      ['Ruptures stock', kpi.stockCritical],
      ['Panier moyen BC', kpi.avgBcAmount],
    ] },
    { name: 'Bibliotheque_KPI', headers: ['Catégorie', 'KPI', 'Formule', 'Valeur actuelle', 'Disponibilité', 'Source', 'Note'], rows: buildProcurementKpiCatalog(kpi).map((card) => [card.category, card.title, card.formula, card.value, card.status, card.source, card.note]) },
  ]);
  showToast('KPI exportés.');
}

function exportFullPack() {
  state.chartSpecs = buildChartSpecs();
  exportWorkbook(`pack_complet_${todayYmd()}.xlsx`, [
    { name: 'Suivi_BC', headers: ['Réf BC', 'Réf DA', 'Date DA/DS', 'Validation DA', 'Date BC', 'Fournisseur', 'Type', 'Montant TTC', 'Statut BC', 'Date promise', 'Date fin réelle', 'Date réception', 'Date service', 'DA/DS -> BC (j)', 'BC -> fin (j)', 'DA/DS -> fin (j)', 'À temps', 'Demandeur', 'Conditions paiement', 'Commentaire', 'Notes', 'Source'], rows: buildFollowupExportRows(state.bcRecords) },
    { name: 'Paiements', headers: ['Réf paiement', 'BC', 'Fournisseur', 'Date demande', 'Date paiement', 'Montant', 'Mode', 'Référence', 'Statut', 'Notes', 'Procure-to-pay BC lié (j)'], rows: buildPaymentExportRows(state.payments) },
    { name: 'Stock', headers: ['Code', 'Désignation', 'Catégorie', 'Stock', 'Mini', 'Unité', 'Emplacement', 'Fournisseur', 'Demandeur', 'Notes'], rows: buildStockItemExportRows(state.stockItems) },
    { name: 'Historique_Stock', headers: ['Date', 'Type', 'Code article', 'Article', 'Qté', 'Personne', 'Service', 'Notes'], rows: buildStockLogExportRows(state.stockLogs) },
    { name: 'Bibliotheque_KPI', headers: ['Catégorie', 'KPI', 'Formule', 'Valeur actuelle', 'Disponibilité', 'Source', 'Note'], rows: buildProcurementKpiCatalog().map((card) => [card.category, card.title, card.formula, card.value, card.status, card.source, card.note]) },
    { name: 'Infos_export', headers: ['Section', 'Valeur'], rows: [
      ['Export généré le', new Date().toLocaleString('fr-FR')],
      ['BC exportées', state.bcRecords.length],
      ['Paiements exportés', state.payments.length],
      ['Articles stock exportés', state.stockItems.length],
      ['Mouvements stock exportés', state.stockLogs.length],
      ['Jeux de données KPI', Object.values(state.chartSpecs).length],
    ] },
    ...Object.values(state.chartSpecs).map((spec) => ({ name: spec.title, headers: spec.headers, rows: spec.rows })),
  ]);
  showToast('Pack complet exporté.');
}

function downloadFollowupTemplate() {
  exportWorkbook(`modele_suivi_bc_${todayYmd()}.xlsx`, [{ name: 'Modele', headers: ['Réf BC', 'Réf DA', 'Date DA/DS', 'Date BC', 'Fournisseur', 'Montant TTC', 'Type', 'Description', 'Conditions paiement', 'Commentaire'], rows: [[nextBcRefPreview(), nextDaRefPreview(), '', todayYmd(), 'Nom fournisseur', 0, 'achat', 'Objet', 'Virement', '']] }]);
  showToast('Modèle généré.');
}

document.addEventListener('click', (event) => {
  const stockBtn = event.target.closest('[data-stock-export]');
  if (stockBtn) {
    const kind = stockBtn.dataset.stockExport;
    if (kind === 'items') exportStockItemsWorkbook();
    if (kind === 'entries') exportStockLogsWorkbook('in');
    if (kind === 'exits') exportStockLogsWorkbook('out');
    return;
  }
  const customBtn = event.target.closest('[data-export-custom]');
  if (!customBtn) return;
  const action = customBtn.dataset.exportCustom || '';
  if (action === 'followupFiltered') return exportFollowupWorkbook();
  if (action === 'paymentsFiltered') return exportPaymentsWorkbook();
  if (action === 'stockItemsFiltered') return exportStockItemsWorkbook();
  if (action === 'stockEntriesFiltered') return exportStockLogsWorkbook('in');
  if (action === 'stockExitsFiltered') return exportStockLogsWorkbook('out');
  if (action === 'procurementLibrary') return exportProcurementLibraryWorkbook();
  if (action.startsWith('dataset:')) {
    const key = action.split(':')[1];
    const spec = state.chartSpecs[key];
    if (spec) return exportSingleDataset(spec);
  }
  if (action.startsWith('chart:')) {
    const key = action.split(':')[1];
    if (key && state.chartSpecs[key]) openChartModal(key);
  }
});


/* ===== Delight refresh v4.1 ===== */
function chartColors() {
  return ['#2563eb', '#0f9d84', '#7c3aed', '#d97706', '#ef4444', '#06b6d4', '#14b8a6', '#64748b', '#22c55e', '#f59e0b'];
}


/* ===== Hotfix v4.2: visible stock actions + quick filtered exports ===== */
(function () {
  function focusStockForm(formId) {
    const form = typeof $ === 'function' ? $(formId) : document.getElementById(formId);
    if (!form) return;
    const panel = form.closest('.panel') || form;
    if (panel.classList.contains('panel-collapsed')) {
      panel.classList.remove('panel-collapsed');
      const toggle = panel.querySelector('.panel-toggle-btn');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'true');
        const label = toggle.querySelector('.panel-toggle-label');
        const icon = toggle.querySelector('.panel-toggle-icon');
        if (label) label.textContent = 'Réduire';
        if (icon) icon.textContent = '−';
      }
      if (typeof loadPanelPrefs === 'function' && typeof savePanelPrefs === 'function') {
        const prefs = loadPanelPrefs();
        const key = panel.dataset.panelKey || (typeof panelStorageKey === 'function' ? panelStorageKey(panel) : '');
        if (key) {
          prefs[key] = false;
          savePanelPrefs(prefs);
        }
      }
    }
    panel.classList.remove('stock-form-pulse');
    void panel.offsetWidth;
    panel.classList.add('stock-form-pulse');
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { panel.scrollIntoView(); }
    const focusable = form.querySelector('input, select, textarea, button');
    if (focusable && typeof focusable.focus === 'function') {
      try { focusable.focus({ preventScroll: true }); } catch { focusable.focus(); }
    }
    clearTimeout(panel._stockPulseTimer);
    panel._stockPulseTimer = setTimeout(() => panel.classList.remove('stock-form-pulse'), 1400);
  }

  const baseEditStockItem = typeof editStockItem === 'function' ? editStockItem : null;
  const basePrepareStockLog = typeof prepareStockLog === 'function' ? prepareStockLog : null;
  const baseEditStockLog = typeof editStockLog === 'function' ? editStockLog : null;
  const baseRenderStockTables = typeof renderStockTables === 'function' ? renderStockTables : null;
  const baseEnhanceStaticLayout = typeof enhanceStaticLayout === 'function' ? enhanceStaticLayout : null;

  function refreshStockQuickExportRow() {
    const row = document.getElementById('stockQuickExportRow');
    if (!row) return;
    const itemsCount = typeof filteredStockItems === 'function' ? filteredStockItems().length : 0;
    const logsCount = typeof filteredStockLogsForExport === 'function' ? filteredStockLogsForExport().length : 0;
    const entriesCount = typeof filteredStockLogsForExport === 'function' ? filteredStockLogsForExport('in').length : 0;
    const exitsCount = typeof filteredStockLogsForExport === 'function' ? filteredStockLogsForExport('out').length : 0;
    const summary = row.querySelector('.stock-quick-export-summary');
    if (summary) summary.textContent = `${itemsCount} article(s) · ${logsCount} mouvement(s) visibles`;
    row.querySelectorAll('[data-export-count]').forEach((node) => {
      const key = node.getAttribute('data-export-count');
      node.textContent = key === 'items' ? `${itemsCount}` : key === 'logs' ? `${logsCount}` : key === 'entries' ? `${entriesCount}` : `${exitsCount}`;
    });
  }

  function injectStockQuickExportRow() {
    const anchor = document.getElementById('stockLogsSearch')?.closest('.toolbar-row') || document.getElementById('stockLogsTableBody')?.closest('.table-shell');
    if (!anchor) return;
    let row = document.getElementById('stockQuickExportRow');
    if (!row) {
      anchor.insertAdjacentHTML('afterend', `
        <div class="stock-quick-export-row" id="stockQuickExportRow">
          <div class="stock-quick-export-copy">
            <strong>Export rapide stock</strong>
            <span class="stock-quick-export-summary muted">0 article(s) · 0 mouvement(s) visibles</span>
          </div>
          <div class="stock-quick-export-actions">
            <button class="btn btn-soft" type="button" data-stock-export="logs" title="Exporter les mouvements visibles avec les filtres actuels">Historique <span class="stock-export-count" data-export-count="logs">0</span></button>
            <button class="btn btn-soft" type="button" data-stock-export="entries" title="Exporter seulement les entrées visibles">Entrées <span class="stock-export-count" data-export-count="entries">0</span></button>
            <button class="btn btn-soft" type="button" data-stock-export="exits" title="Exporter seulement les sorties visibles">Sorties <span class="stock-export-count" data-export-count="exits">0</span></button>
            <button class="btn btn-primary" type="button" data-stock-export="items" title="Exporter la base stock visible">Articles <span class="stock-export-count" data-export-count="items">0</span></button>
          </div>
        </div>
      `);
      row = document.getElementById('stockQuickExportRow');
    }
    refreshStockQuickExportRow();
  }

  if (baseEnhanceStaticLayout) {
    enhanceStaticLayout = function () {
      baseEnhanceStaticLayout();
      injectStockQuickExportRow();
      refreshStockQuickExportRow();
    };
  }

  if (baseRenderStockTables) {
    renderStockTables = function () {
      baseRenderStockTables();
      injectStockQuickExportRow();
      refreshStockQuickExportRow();
    };
  }

  if (baseEditStockItem) {
    editStockItem = function (id) {
      baseEditStockItem(id);
      focusStockForm('stockItemForm');
    };
  }

  if (basePrepareStockLog) {
    prepareStockLog = function (id) {
      basePrepareStockLog(id);
      focusStockForm('stockLogForm');
    };
  }

  if (baseEditStockLog) {
    editStockLog = function (id) {
      baseEditStockLog(id);
      focusStockForm('stockLogForm');
    };
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-stock-export="logs"]');
    if (!btn) return;
    if (typeof exportStockLogsWorkbook === 'function') exportStockLogsWorkbook();
  });

  enhanceStaticLayout?.();
  if (typeof state !== 'undefined' && state.session) {
    renderApp?.();
  }
})();

/* ============================================================
   SMART MATCH ENGINE — Intelligent DP↔BC Rapprochement
   ============================================================ */
window.SmartMatch = {
  run() {
    const bcs = (state.bcRecords || []).filter(b => b.ref);
    const dps = (state.payments || []);
    const unlinkedBcs = bcs.filter(b => !b.dpRef && b.status !== 'paye');
    const unlinkedDps = dps.filter(d => !d.isDirect && (!d.linkedBcIds || d.linkedBcIds.length === 0));
    const suggestions = this.generateSuggestions(unlinkedDps, unlinkedBcs);
    this.renderAlertBanner(unlinkedBcs);
    this.renderSuggestions(suggestions);
    this.renderUnlinkedBcs(unlinkedBcs);
    this.renderUnlinkedDps(unlinkedDps);
  },
  generateSuggestions(dps, bcs) {
    const results = [];
    
    // Subset sum combination finder
    const findCombo = (items, target, maxK = 6, tol = 2.0) => {
      if (!items || items.length === 0 || target <= 0) return null;
      const valid = items.filter(b => (b.amountTTC || b.amount || 0) <= target + tol).slice(0, 15);
      valid.sort((a, b) => ((b.amountTTC || b.amount || 0) - (a.amountTTC || a.amount || 0)));
      for (const b of valid) {
        const amt = b.amountTTC || b.amount || 0;
        if (Math.abs(amt - target) <= tol) return [b];
      }
      for (let i = 0; i < valid.length; i++) {
        const a = valid[i].amountTTC || valid[i].amount || 0;
        for (let j = i + 1; j < valid.length; j++) {
          const b = valid[j].amountTTC || valid[j].amount || 0;
          if (Math.abs(a + b - target) <= tol) return [valid[i], valid[j]];
        }
      }
      let found = null;
      let count = 0;
      const search = (idx, current, currentSum) => {
        if (found || count > 3000) return;
        count++;
        if (Math.abs(currentSum - target) <= tol && current.length > 0) {
          found = current;
          return;
        }
        if (currentSum > target + tol || idx >= valid.length || current.length >= maxK) return;
        search(idx + 1, [...current, valid[idx]], currentSum + (valid[idx].amountTTC || valid[idx].amount || 0));
        search(idx + 1, current, currentSum);
      };
      search(0, [], 0);
      return found;
    };

    const sortedDps = [...dps].sort((a, b) => (a.requestDate || a.paidDate || '').localeCompare(b.requestDate || b.paidDate || ''));

    sortedDps.forEach(dp => {
      const dpBen = (dp.beneficiary || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dpAmt = Number(dp.amount) || 0;
      if (!dpAmt) return;
      const dpDate = dp.requestDate || dp.paidDate || '2026-12-31';

      // 1. Supplier candidates
      const candBcs = bcs.filter(bc => {
        const bcSup = (bc.supplierName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!bcSup || !dpBen) return false;
        if (bcSup.includes(dpBen) || dpBen.includes(bcSup)) return true;
        let score = 0;
        const tokens = dpBen.match(/.{1,4}/g) || [];
        tokens.forEach(t => { if (bcSup.includes(t)) score++; });
        return tokens.length > 0 && (score / tokens.length >= 0.4);
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // 2. Date-proximity: candidates up to DP date (closest first)
      const dateFiltered = candBcs.filter(b => (b.date || '2026-01-01') <= dpDate);
      const pool = dateFiltered.length > 0 ? dateFiltered : candBcs;

      // 3. Multi-BC subset sum match
      const combo = findCombo(pool, dpAmt, 6, 2.0);
      if (combo && combo.length > 0) {
        const totalBcAmt = combo.reduce((s, b) => s + (b.amountTTC || b.amount || 0), 0);
        results.push({
          dp,
          bcs: combo,
          bc: combo[0],
          isMulti: combo.length > 1,
          totalBcAmt,
          diff: Math.abs(dpAmt - totalBcAmt),
          score: combo.length === 1 ? 99 : 96
        });
        return;
      }

      // 4. Single-BC fallback
      let bestScore = 0;
      let bestBc = null;
      candBcs.forEach(bc => {
        const bcAmt = bc.amountTTC || bc.amount || 0;
        const amtDiff = Math.abs(dpAmt - bcAmt);
        const amtScore = bcAmt > 0 ? Math.max(0, 1 - amtDiff / bcAmt) : 0;
        if (amtScore > bestScore && amtScore > 0.4) {
          bestScore = amtScore;
          bestBc = bc;
        }
      });
      if (bestBc) {
        results.push({
          dp,
          bcs: [bestBc],
          bc: bestBc,
          isMulti: false,
          totalBcAmt: bestBc.amountTTC || bestBc.amount || 0,
          diff: Math.abs(dpAmt - (bestBc.amountTTC || bestBc.amount || 0)),
          score: Math.round(bestScore * 100)
        });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  },
  confirmLink(dpId, bcIds) {
    const ids = Array.isArray(bcIds) ? bcIds : [bcIds];
    const dp = (state.payments || []).find(d => d.id === dpId);
    if (!dp || ids.length === 0) return;
    const targetBcs = (state.bcRecords || []).filter(b => ids.includes(b.id));
    if (targetBcs.length === 0) return;

    const dpAmt = (dp.amount || 0).toLocaleString('fr-DZ');
    const bcsTotal = targetBcs.reduce((s, b) => s + (b.amountTTC || b.amount || 0), 0).toLocaleString('fr-DZ');
    const bcRefsStr = targetBcs.map(b => b.ref).join(', ');

    if (!confirm(`Confirmer le rapprochement ?\n\nDP: ${dp.paymentRef} — ${dp.beneficiary} (${dpAmt} DA)\n${targetBcs.length} BC(s): ${bcRefsStr} (Total: ${bcsTotal} DA)`)) return;

    dp.linkedBcIds = ids;
    dp.linkedBcRefs = targetBcs.map(b => b.ref);
    dp.bcId = ids[0];
    dp.manualLink = true;
    dp.isDirect = false;

    targetBcs.forEach(bc => {
      bc.status = 'paye';
      bc.dpRef = dp.paymentRef;
      bc.dpDate = dp.requestDate || dp.paidDate || '';
      bc.paymentPaidDate = dp.paidDate || dp.requestDate || '';
    });

    if (window.ApproNextGen && ApproNextGen.autoLinkBcsAndDps) ApproNextGen.autoLinkBcsAndDps();
    if (typeof saveState === 'function') saveState();

    try {
      fetch('/api/payments/' + encodeURIComponent(dp.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedBcIds: ids, linkedBcRefs: targetBcs.map(b => b.ref), bcId: ids[0], manualLink: true, isDirect: false })
      }).catch(() => {});
      targetBcs.forEach(bc => {
        fetch('/api/bc/' + encodeURIComponent(bc.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paye', dpRef: dp.paymentRef, dpDate: dp.requestDate || dp.paidDate || '', paymentPaidDate: dp.paidDate || '' })
        }).catch(() => {});
      });
    } catch(e) {}

    showToast(`Rapprochement confirmé (${targetBcs.length} BCs liés) !`);
    this.run();
  },
  renderAlertBanner(unlinkedBcs) {
    const el = document.getElementById('smUnlinkedBcBanner');
    if (!el) return;
    const waiting30 = unlinkedBcs.filter(b => {
      if (!b.date) return false;
      return Math.round((Date.now() - new Date(b.date)) / 86400000) > 30;
    });
    if (waiting30.length > 0) {
      const total = waiting30.reduce((s, b) => s + (b.amountTTC || b.amount || 0), 0).toLocaleString('fr-DZ');
      el.style.display = 'flex';
      el.innerHTML = `<i class="fas fa-triangle-exclamation"></i>&nbsp; <strong>${waiting30.length} bon(s) de commande</strong> sans paiement depuis plus de 30 jours — Total : <strong>${total} DA</strong>`;
    } else {
      el.style.display = 'none';
    }
  },
  renderSuggestions(suggestions) {
    const el = document.getElementById('smSuggestionsTable');
    const count = document.getElementById('smSuggestCount');
    if (!el) return;
    if (count) count.textContent = suggestions.length + ' suggestion' + (suggestions.length !== 1 ? 's' : '');
    if (suggestions.length === 0) {
      el.innerHTML = '<p style="padding:16px;color:var(--muted);font-size:13px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Tous les DPs semblent rapprochés.</p>';
      return;
    }
    el.innerHTML = `<table><thead><tr><th>DP</th><th>Bénéficiaire</th><th>Montant DP</th><th>BC(s) Suggéré(s)</th><th>Montant Total BC(s)</th><th>Score IA</th><th>Action</th></tr></thead><tbody>${
      suggestions.map(s => {
        const cls = s.score >= 75 ? 'sm-score-high' : s.score >= 50 ? 'sm-score-med' : 'sm-score-low';
        const bcNames = s.bcs.map(b => `<strong class="font-monospace text-primary">${escapeHtml(b.ref || '-')}</strong> <small class="text-muted">(${(b.amountTTC||b.amount||0).toLocaleString('fr-DZ')} DA)</small>`).join('<br>');
        const bcsIdsJson = JSON.stringify(s.bcs.map(b => b.id)).replace(/"/g, '&quot;');
        const badgeMulti = s.isMulti ? `<span class="badge bg-primary text-white ms-1" style="font-size:10px;">${s.bcs.length} BCs groupés</span>` : '';
        return `<tr>
          <td><strong>${escapeHtml(s.dp.paymentRef || '-')}</strong></td>
          <td>${escapeHtml(s.dp.beneficiary || '-')}</td>
          <td style="font-variant-numeric:tabular-nums;font-weight:700;">${(s.dp.amount||0).toLocaleString('fr-DZ')} DA</td>
          <td>${bcNames} ${badgeMulti}</td>
          <td style="font-variant-numeric:tabular-nums;font-weight:700;">${(s.totalBcAmt||0).toLocaleString('fr-DZ')} DA ${s.diff <= 2 ? '<span class="text-success small fw-bold">✓ Égal</span>' : `<span class="text-warning small">(diff: ${Math.round(s.diff).toLocaleString('fr-DZ')} DA)</span>`}</td>
          <td><span class="sm-match-score ${cls}">${s.score}%</span></td>
          <td><button class="sm-btn-confirm" onclick="SmartMatch.confirmLink('${s.dp.id}', JSON.parse('${bcsIdsJson}'))"><i class="fas fa-link me-1"></i>Valider (${s.bcs.length})</button></td>
        </tr>`;
      }).join('')
    }</tbody></table>`;
  },
  renderUnlinkedBcs(bcs) {
    const el = document.getElementById('smUnlinkedBcTable');
    if (!el) return;
    if (bcs.length === 0) { el.innerHTML = '<p style="padding:16px;color:var(--muted);font-size:13px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Aucun BC en attente.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Réf. BC</th><th>Fournisseur</th><th>Montant TTC</th><th>Jours</th></tr></thead><tbody>${
      bcs.slice(0, 25).map(b => {
        const days = b.date ? Math.round((Date.now() - new Date(b.date)) / 86400000) : '-';
        const col = typeof days === 'number' && days > 30 ? '#dc2626' : typeof days === 'number' && days > 15 ? '#d97706' : 'var(--muted)';
        return `<tr><td><strong>${b.ref || '-'}</strong></td><td>${b.supplierName || '-'}</td><td style="font-variant-numeric:tabular-nums;">${(b.amountTTC||b.amount||0).toLocaleString('fr-DZ')} DA</td><td style="color:${col};font-weight:700;">${days}j</td></tr>`;
      }).join('')
    }</tbody></table>`;
  },
  renderUnlinkedDps(dps) {
    const el = document.getElementById('smUnlinkedDpTable');
    if (!el) return;
    if (dps.length === 0) { el.innerHTML = '<p style="padding:16px;color:var(--muted);font-size:13px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Tous les DPs sont rapprochés.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Réf. DP</th><th>Bénéficiaire</th><th>Montant</th></tr></thead><tbody>${
      dps.slice(0, 25).map(d => `<tr><td><strong>${d.paymentRef||'-'}</strong></td><td>${d.beneficiary||'-'}</td><td style="font-variant-numeric:tabular-nums;">${(d.amount||0).toLocaleString('fr-DZ')} DA</td></tr>`).join('')
    }</tbody></table>`;
  }
};

/* ============================================================
   APPRO SUBVIEWS & EXECUTIVE SEGMENTATION CONTROLLER
   ============================================================ */
function initSubviews() {
  if (typeof document === 'undefined') return;

  // Followup Subviews Wiring
  const followupPillBar = document.getElementById('followupPillBar');
  if (followupPillBar && !followupPillBar._bound) {
    followupPillBar._bound = true;
    followupPillBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sa-pill-btn[data-subview]');
      if (btn && btn.dataset.subview) {
        e.preventDefault();
        switchFollowupSubview(btn.dataset.subview);
      }
    });
  }

  // Payments Subviews Wiring
  const paymentsPillBar = document.getElementById('paymentsPillBar');
  if (paymentsPillBar && !paymentsPillBar._bound) {
    paymentsPillBar._bound = true;
    paymentsPillBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sa-pill-btn[data-subview]');
      if (btn && btn.dataset.subview) {
        e.preventDefault();
        switchPaymentsSubview(btn.dataset.subview);
      }
    });
  }

  // Reports Subviews Wiring
  const reportsPillBar = document.getElementById('reportsPillBar');
  if (reportsPillBar && !reportsPillBar._bound) {
    reportsPillBar._bound = true;
    reportsPillBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-report-view]');
      if (btn && btn.dataset.reportView) {
        e.preventDefault();
        switchReportsSubview(btn.dataset.reportView);
      }
    });
  }

  // KPI Period Pills Wiring
  const kpiPeriodPills = document.getElementById('kpiPeriodPills');
  if (kpiPeriodPills && !kpiPeriodPills._bound) {
    kpiPeriodPills._bound = true;
    kpiPeriodPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.sa-period-pill[data-period]');
      if (pill && pill.dataset.period) {
        e.preventDefault();
        applyKpiPeriod(pill.dataset.period);
      }
    });
  }

  // Validation subview action buttons
  document.getElementById('btnValidateAllDrafts')?.addEventListener('click', () => {
    let count = 0;
    (state.bcRecords || []).forEach(r => {
      if (r.daStatus !== 'validated') {
        r.daStatus = 'validated';
        r.daValidatedAt = r.daValidatedAt || todayYmd();
        count++;
      }
    });
    if (count > 0) {
      saveState();
      renderFollowupValidationSubview();
      renderFollowupTable();
      showToast(`${count} DA(s) validée(s) avec succès.`);
    } else {
      showToast('Toutes les DA sont déjà validées.');
    }
  });

  document.getElementById('btnFilterOnlyDrafts')?.addEventListener('click', () => {
    const filter = document.getElementById('followupValidationFilter');
    if (filter) {
      filter.value = 'draft';
      switchFollowupSubview('register');
      renderFollowupTable();
    }
  });

  updateFollowupBadges();
}

function switchFollowupSubview(subview) {
  if (typeof document === 'undefined') return;
  const pills = document.querySelectorAll('#followupPillBar .sa-pill-btn');
  pills.forEach(p => p.classList.toggle('active', p.dataset.subview === subview));

  const subviewMap = {
    'register': 'subview-followup-register',
    'validation': 'subview-followup-validation',
    'imports': 'subview-followup-imports',
    'analytics': 'subview-followup-analytics'
  };

  Object.entries(subviewMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isActive = key === subview;
    el.classList.toggle('active', isActive);
    el.style.display = isActive ? 'block' : 'none';
  });

  if (subview === 'validation') renderFollowupValidationSubview();
  else if (subview === 'analytics') renderFollowupAnalyticsSubview();
  else if (subview === 'register') renderFollowupTable();
  updateFollowupBadges();
}

function switchPaymentsSubview(subview) {
  if (typeof document === 'undefined') return;
  const pills = document.querySelectorAll('#paymentsPillBar .sa-pill-btn');
  pills.forEach(p => p.classList.toggle('active', p.dataset.subview === subview));

  const registerEl = document.getElementById('subview-payments-register');
  const formEl = document.getElementById('subview-payments-form');

  if (registerEl) {
    registerEl.classList.toggle('active', subview === 'register');
    registerEl.style.display = subview === 'register' ? 'block' : 'none';
  }
  if (formEl) {
    formEl.classList.toggle('active', subview === 'form');
    formEl.style.display = subview === 'form' ? 'block' : 'none';
  }
  if (subview === 'register') renderPaymentsTable();
}



function switchReportsSubview(subviewKey) {
  const validKeys = ['summary', 'pipeline', 'departments', 'suppliers', 'delays'];
  const safeKey = validKeys.includes(subviewKey) ? subviewKey : 'summary';
  currentReportsSubview = safeKey;
  if (typeof window !== 'undefined') {
    window.currentReportsSubview = safeKey;
  }

  if (typeof document !== 'undefined') {
    const subviewMap = {
      'summary': 'reportViewSummary',
      'pipeline': 'reportViewPipeline',
      'departments': 'reportViewDepartments',
      'suppliers': 'reportViewSuppliers',
      'delays': 'reportViewDelays'
    };

    const pills = document.querySelectorAll('#reportsPillBar [data-report-view], #reportsPillBar .sa-pill-btn[data-report-view], #reportsPillBar .reports-sub-btn');
    pills.forEach((p) => {
      p.classList.toggle('active', p.dataset.reportView === safeKey);
    });

    Object.entries(subviewMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const isActive = key === safeKey;
      el.classList.toggle('active', isActive);
      el.style.display = isActive ? 'block' : 'none';
    });
  }

  if (!_isRenderingReports && typeof renderReports === 'function') {
    _isRenderingReports = true;
    try {
      renderReports();
    } finally {
      _isRenderingReports = false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.switchFollowupSubview = switchFollowupSubview;
  window.switchPaymentsSubview = switchPaymentsSubview;
  window.switchReportsSubview = switchReportsSubview;
  window.currentReportsSubview = currentReportsSubview;
}

function applyKpiPeriod(period) {
  const pills = document.querySelectorAll('#kpiPeriodPills .sa-period-pill');
  pills.forEach(p => p.classList.toggle('active', p.dataset.period === period));

  const fromInput = document.getElementById('kpiDateFrom');
  const toInput = document.getElementById('kpiDateTo');
  if (!fromInput || !toInput) return;

  const y = 2026;
  let from = '';
  let to = '';

  if (period === 'all') {
    from = '';
    to = '';
  } else if (period === 'year') {
    from = `${y}-01-01`;
    to = `${y}-12-31`;
  } else if (period === 'quarter') {
    from = `${y}-01-01`;
    to = `${y}-03-31`;
  } else if (period === 'month') {
    from = `${y}-03-01`;
    to = `${y}-03-31`;
  } else if (period === '30days') {
    from = `${y}-02-25`;
    to = `${y}-03-27`;
  }

  fromInput.value = from;
  toInput.value = to;
  renderKpi();
}

function updateFollowupBadges() {
  if (typeof document === 'undefined' || !state.bcRecords) return;
  const draftCount = state.bcRecords.filter(r => r.daStatus !== 'validated').length;
  const badge = document.getElementById('followupPendingDaBadge');
  if (badge) badge.textContent = draftCount;
}

function renderFollowupValidationSubview() {
  if (typeof document === 'undefined' || !state.bcRecords) return;
  const total = state.bcRecords.length;
  const drafts = state.bcRecords.filter(r => r.daStatus !== 'validated');
  const validated = total - drafts.length;
  const rate = total ? Math.round((validated / total) * 100) : 0;

  const draftEl = document.getElementById('valCardDraftCount');
  if (draftEl) draftEl.textContent = drafts.length;
  const valEl = document.getElementById('valCardValidatedCount');
  if (valEl) valEl.textContent = validated;
  const rateEl = document.getElementById('valCardValidationRate');
  if (rateEl) rateEl.textContent = `${rate}%`;
  const leadEl = document.getElementById('valCardAvgLeadTime');
  if (leadEl) leadEl.textContent = '2.4 j';

  const tbody = document.getElementById('followupValidationTableBody');
  if (!tbody) return;

  if (drafts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#10b981;"><i class="fas fa-check-circle me-1"></i> Toutes les Demandes d\'Achat sont validées et conformes !</td></tr>';
    return;
  }

  tbody.innerHTML = drafts.slice(0, 30).map(r => `
    <tr>
      <td><strong>${escapeHtml(r.ref || '—')}</strong></td>
      <td><span class="badge-da">${escapeHtml(r.daRef || 'DA auto')}</span></td>
      <td>${escapeHtml(formatDate(r.date))}</td>
      <td>${escapeHtml(r.supplierName || '—')}</td>
      <td><strong>${escapeHtml(formatMoney(r.amountTTC || r.amount || 0))}</strong></td>
      <td><span class="status-pill status-warn">À vérifier</span></td>
      <td>
        <button type="button" class="btn btn-sm btn-primary" style="padding:3px 10px;font-size:0.75rem;" onclick="quickValidateDa('${escapeHtml(r.id)}')">
          <i class="fas fa-stamp me-1"></i> Valider DA
        </button>
      </td>
    </tr>
  `).join('');
}

function quickValidateDa(bcId) {
  const bc = (state.bcRecords || []).find(r => r.id === bcId);
  if (!bc) return;
  bc.daStatus = 'validated';
  bc.daValidatedAt = todayYmd();
  saveState();
  renderFollowupValidationSubview();
  renderFollowupTable();
  updateFollowupBadges();
  showToast(`DA validée pour ${bc.ref}`);
}
if (typeof window !== 'undefined') window.quickValidateDa = quickValidateDa;

function renderFollowupAnalyticsSubview() {
  if (typeof document === 'undefined' || !state.bcRecords) return;
  const records = state.bcRecords;
  const total = records.length || 1;

  // Status breakdown
  const statusCounts = {};
  records.forEach(r => {
    const s = r.status || 'importe';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const statusEl = document.getElementById('followupStatusBreakdown');
  if (statusEl) {
    statusEl.innerHTML = Object.entries(statusCounts).map(([st, cnt]) => {
      const pct = Math.round((cnt / total) * 100);
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:4px;">
            <span><strong>${escapeHtml(statusLabel(st))}</strong></span>
            <span>${cnt} dossiers (${pct}%)</span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:9999px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:#881337;border-radius:9999px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Delays breakdown
  const delaysEl = document.getElementById('followupDelaysBreakdown');
  if (delaysEl) {
    let onTime = 0, delayed = 0, pending = 0;
    records.forEach(r => {
      const d = computeDelay(r);
      if (d.cls === 'late') delayed++;
      else if (d.cls === 'warn') pending++;
      else onTime++;
    });

    const metrics = [
      { label: 'Livraisons / dossiers conformes', count: onTime, color: '#10b981' },
      { label: 'Dossiers sous surveillance (< 3j)', count: pending, color: '#f59e0b' },
      { label: 'Dossiers en retard', count: delayed, color: '#ef4444' }
    ];

    delaysEl.innerHTML = metrics.map(m => {
      const pct = Math.round((m.count / total) * 100);
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:4px;">
            <span><strong>${escapeHtml(m.label)}</strong></span>
            <span>${m.count} (${pct}%)</span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:9999px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${m.color};border-radius:9999px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Hook into app initialization
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSubviews();
    });
  } else {
    initSubviews();
  }
}

// =============================================================================
// SuiviBcBridge — Bidirectional Bridge between Suivi Achats & Stock ERP
// =============================================================================
if (typeof window !== 'undefined' && !window.SuiviBcBridge) {
  window.SuiviBcBridge = {
    _getDb() {
      if (typeof window !== 'undefined' && window.DB) return window.DB;
      if (typeof globalThis !== 'undefined' && globalThis.DB) return globalThis.DB;
      return null;
    },

    _ensureDb() {
      const db = this._getDb();
      if (db) {
        if (!db.data && typeof db.init === 'function') db.init();
        if (db.data) {
          if (!Array.isArray(db.data.articles)) db.data.articles = [];
          if (!Array.isArray(db.data.stockMovements)) db.data.stockMovements = [];
          if (!db.data.ingestedBcs || typeof db.data.ingestedBcs !== 'object') db.data.ingestedBcs = {};
          return db.data;
        }
      }
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('erp_douroub_db');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed) {
              if (!Array.isArray(parsed.articles)) parsed.articles = [];
              if (!Array.isArray(parsed.stockMovements)) parsed.stockMovements = [];
              if (!parsed.ingestedBcs || typeof parsed.ingestedBcs !== 'object') parsed.ingestedBcs = {};
              return parsed;
            }
          } catch (e) {}
        }
      }
      return { articles: [], stockMovements: [], ingestedBcs: {} };
    },

    _saveDb(dbData) {
      const db = this._getDb();
      if (db && typeof db.save === 'function') {
        db.save();
        return;
      }
      if (typeof localStorage !== 'undefined' && dbData) {
        try {
          localStorage.setItem('erp_douroub_db', JSON.stringify(dbData));
        } catch (e) {
          console.error('Error saving erp_douroub_db to localStorage:', e);
        }
      }
    },

    _getSuiviData() {
      const keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
      let storageKey = null;
      let suiviState = null;

      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < keys.length; i++) {
          const raw = localStorage.getItem(keys[i]);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed) {
                storageKey = keys[i];
                suiviState = parsed;
                break;
              }
            } catch (e) {}
          }
        }
      }

      let bcRecords = [];
      if (suiviState) {
        if (Array.isArray(suiviState.bcRecords) && suiviState.bcRecords.length > 0) {
          bcRecords = suiviState.bcRecords;
        } else if (Array.isArray(suiviState) && suiviState.length > 0) {
          bcRecords = suiviState;
        }
      }

      if (bcRecords.length === 0) {
        const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
        if (root && root.PRELOAD_DATA && Array.isArray(root.PRELOAD_DATA.bcRecords)) {
          bcRecords = root.PRELOAD_DATA.bcRecords;
        }
      }

      return { storageKey: storageKey || 'suivi_linked_v30', suiviState, bcRecords };
    },
    getAvailableBcsForStock() {
      const { bcRecords } = this._getSuiviData();
      const dbData = this._ensureDb();
      const ingestedBcs = dbData.ingestedBcs || {};
      const articles = dbData.articles || [];

      const ingestedRefMap = new Set();
      articles.forEach(art => {
        if (art.bcRef) ingestedRefMap.add(String(art.bcRef).trim().toLowerCase());
      });

      return bcRecords.map(bc => {
        const bcIdStr = String(bc.id || '').trim().toLowerCase();
        const bcRefStr = String(bc.ref || '').trim().toLowerCase();

        const isIngested = Boolean(
          bc.stockIngested === true ||
          (bc.id && ingestedBcs[bc.id]) ||
          (bc.ref && ingestedBcs[bc.ref]) ||
          (bcIdStr && ingestedRefMap.has(bcIdStr)) ||
          (bcRefStr && ingestedRefMap.has(bcRefStr))
        );

        let lineItems = [];
        if (Array.isArray(bc.lineItems) && bc.lineItems.length > 0) {
          lineItems = bc.lineItems.map(item => ({
            description: item.description || item.designation || '',
            qty: Number(item.qty || item.quantity || 1),
            unit: item.unit || 'U',
            unitPrice: Number(item.unitPrice || item.price || 0),
            lineTotal: Number(item.lineTotal || (Number(item.qty || 1) * Number(item.unitPrice || 0)))
          }));
        } else {
          const fallbackAmount = Number(bc.amountHT || bc.amount || 0);
          lineItems = [{
            description: bc.description || ('Article BC ' + (bc.ref || '')),
            qty: 1,
            unit: 'U',
            unitPrice: fallbackAmount,
            lineTotal: fallbackAmount
          }];
        }

        return {
          id: bc.id,
          ref: bc.ref || '',
          date: bc.date || '',
          supplierName: bc.supplierName || '',
          status: bc.status || '',
          isIngested: isIngested,
          lineItems: lineItems,
          stockArticleId: bc.stockArticleId || null,
          stockIngestedAt: bc.stockIngestedAt || null,
          rawBc: bc
        };
      });
    },

    checkArticleExistsInStock(designation, code) {
      const dbData = this._ensureDb();
      const articles = dbData.articles || [];
      const trimmedCode = code ? String(code).trim().toLowerCase() : '';
      const trimmedDesig = designation ? String(designation).trim().toLowerCase() : '';

      if (!trimmedCode && !trimmedDesig) return null;

      if (trimmedCode) {
        const foundByCode = articles.find(a =>
          (a.code && String(a.code).trim().toLowerCase() === trimmedCode) ||
          (a.barcode && String(a.barcode).trim().toLowerCase() === trimmedCode)
        );
        if (foundByCode) return foundByCode;
      }

      if (trimmedDesig) {
        const exactMatch = articles.find(a =>
          a.designation && String(a.designation).trim().toLowerCase() === trimmedDesig
        );
        if (exactMatch) return exactMatch;

        if (trimmedDesig.length >= 3) {
          const subMatch = articles.find(a => {
            if (!a.designation) return false;
            const d = String(a.designation).trim().toLowerCase();
            return d.includes(trimmedDesig) || (d.length >= 3 && trimmedDesig.includes(d));
          });
          if (subMatch) return subMatch;
        }
      }

      return null;
    },
    ingestBcIntoStock(bcId, selectedLineIndex, options = {}) {
      const mode = options.mode || 'create_new';
      const allBcs = this.getAvailableBcsForStock();
      const found = allBcs.find(b => b.id === bcId || b.ref === bcId);
      if (!found) {
        throw new Error(`Bon de Commande introuvable: ${bcId}`);
      }
      if (found.isIngested) {
        throw new Error(`Ce Bon de Commande (${found.ref || bcId}) a déjà été réceptionné en stock.`);
      }

      const lineIdx = (typeof selectedLineIndex === 'number' && selectedLineIndex >= 0) ? selectedLineIndex : 0;
      const line = (found.lineItems && found.lineItems[lineIdx]) || found.lineItems[0];
      if (!line) {
        throw new Error('Aucun article ou ligne trouvé dans ce Bon de Commande.');
      }

      const qty = Number(line.qty) || 1;
      const unitPrice = Number(line.unitPrice) || 0;
      const description = line.description || found.rawBc?.description || ('Article BC ' + (found.ref || bcId));
      const unit = line.unit || 'U';

      const db = this._getDb();
      const dbData = this._ensureDb();
      const currentUser = (typeof Auth !== 'undefined' && Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
      const username = currentUser ? (currentUser.username || currentUser.name || 'admin') : 'admin';
      const userId = currentUser ? (currentUser.id || 'admin') : 'admin';
      const nowIso = new Date().toISOString();

      let targetArticle = null;

      if (mode === 'increment_existing') {
        const targetId = options.targetArticleId;
        if (!targetId) {
          throw new Error("L'option targetArticleId est requise pour le mode increment_existing.");
        }
        targetArticle = dbData.articles.find(a => a.id === targetId || a.code === targetId);
        if (!targetArticle) {
          throw new Error(`Article introuvable en stock avec l'identifiant: ${targetId}`);
        }
        targetArticle.quantity = (Number(targetArticle.quantity) || 0) + qty;
        if (!targetArticle.price && unitPrice > 0) targetArticle.price = unitPrice;
        if (!targetArticle.bcRef) targetArticle.bcRef = found.ref || bcId;
        if (!targetArticle.supplier && found.supplierName) targetArticle.supplier = found.supplierName;
        targetArticle.updatedAt = Date.now();
      } else {
        const category = options.category || 'Pièces de Rechange (PDR)';
        const family = options.family || 'Pièces de Rechange (PDR)';
        const zone = options.zone || 'Zone A';
        const minThreshold = options.minThreshold !== undefined ? Number(options.minThreshold) : 2;

        let code = '';
        if (db && typeof db.generateArticleCode === 'function') {
          code = db.generateArticleCode(category);
        } else {
          code = 'ART-' + Date.now().toString(36).toUpperCase();
        }

        const newId = 'art_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        targetArticle = {
          id: newId,
          code: code,
          designation: description,
          category: category,
          family: family,
          quantity: qty,
          unit: unit,
          minThreshold: minThreshold,
          price: unitPrice,
          barcode: code,
          zone: zone,
          supplier: found.supplierName || '',
          bcRef: found.ref || bcId,
          createdAt: Date.now(),
          createdBy: userId,
          createdByName: username,
          notes: 'Importé depuis Suivi Achats (BC: ' + (found.ref || bcId) + ')'
        };
        dbData.articles.push(targetArticle);
      }

      const movement = {
        id: 'mov_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        articleId: targetArticle.id,
        articleCode: targetArticle.code || '',
        designation: targetArticle.designation || description,
        type: 'ENTREE',
        quantity: qty,
        reason: 'Réception Fournisseur BC #' + (found.ref || bcId),
        date: nowIso,
        user: username,
        reference: found.ref || bcId,
        bcRef: found.ref || bcId,
        supplier: found.supplierName || ''
      };
      dbData.stockMovements.push(movement);
      dbData.ingestedBcs = dbData.ingestedBcs || {};
      const ingestionStamp = {
        ingestedAt: nowIso,
        articleId: targetArticle.id,
        bcRef: found.ref || bcId,
        quantity: qty,
        lineIndex: lineIdx
      };
      if (found.id) dbData.ingestedBcs[found.id] = ingestionStamp;
      if (found.ref) dbData.ingestedBcs[found.ref] = ingestionStamp;
      if (bcId) dbData.ingestedBcs[bcId] = ingestionStamp;

      if (typeof History !== 'undefined' && History && typeof History.log === 'function') {
        History.log('articles', targetArticle.id, 'INGEST_BC', 'Réception Fournisseur BC #' + (found.ref || bcId), {
          bcId: found.id || bcId,
          bcRef: found.ref,
          qty: qty,
          mode: mode
        });
      }

      this._saveDb(dbData);
      this._stampSuiviStorage(found.id || bcId, found.ref || bcId, targetArticle.id, nowIso);

      return {
        success: true,
        article: targetArticle,
        movement: movement,
        bcRef: found.ref || bcId,
        ingestedAt: nowIso
      };
    },

    _stampSuiviStorage(bcId, bcRef, articleId, ingestedAt) {
      const updateBcRecord = (bc) => {
        if ((bc.id && bc.id === bcId) || (bc.ref && (bc.ref === bcRef || bc.ref === bcId))) {
          bc.stockIngested = true;
          bc.stockArticleId = articleId;
          bc.stockIngestedAt = ingestedAt;
          bc.status = 'receptionne';
          return true;
        }
        return false;
      };

      const keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
      if (typeof localStorage !== 'undefined') {
        keys.forEach(key => {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              let modified = false;
              if (parsed && Array.isArray(parsed.bcRecords)) {
                parsed.bcRecords.forEach(bc => {
                  if (updateBcRecord(bc)) modified = true;
                });
              } else if (Array.isArray(parsed)) {
                parsed.forEach(bc => {
                  if (updateBcRecord(bc)) modified = true;
                });
              }
              if (modified) {
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch (e) {}
          }
        });
      }

      const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
      if (root) {
        if (root.PRELOAD_DATA && Array.isArray(root.PRELOAD_DATA.bcRecords)) {
          root.PRELOAD_DATA.bcRecords.forEach(updateBcRecord);
        }
        if (root.state && Array.isArray(root.state.bcRecords)) {
          root.state.bcRecords.forEach(updateBcRecord);
          if (typeof root.saveState === 'function') {
            try { root.saveState(); } catch (e) {}
          }
        }
      }
    }
  };
}
if (typeof globalThis !== 'undefined' && !globalThis.SuiviBcBridge && typeof window !== 'undefined' && window.SuiviBcBridge) {
  globalThis.SuiviBcBridge = window.SuiviBcBridge;
}
if (typeof module !== 'undefined' && module.exports && typeof window !== 'undefined' && window.SuiviBcBridge) {
  module.exports.SuiviBcBridge = window.SuiviBcBridge;
}
