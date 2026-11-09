const SUIVI_DATA_VERSION = 'v2026_11_dp_fix';
const STORAGE_KEYS = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12', 'suivi_local_v11'];
const LEGACY_STORAGE_KEYS = ['suivi_compact_v20', 'suivi_local_v12', 'suivi_local_v11'];
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
if (typeof window !== 'undefined') {
  window.state = state;
  window.SUIVI_DATA_VERSION = SUIVI_DATA_VERSION;
  if (window.PRELOAD_DATA && !window.__SUIVI_PRELOAD__) window.__SUIVI_PRELOAD__ = window.PRELOAD_DATA;
  else if (window.__SUIVI_PRELOAD__ && !window.PRELOAD_DATA) window.PRELOAD_DATA = window.__SUIVI_PRELOAD__;
}

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
  const raw = String(value || '').trim();
  if (!raw) return '';
  const yearFirst = raw.match(/BC\s*[-/_.]?\s*(?:20\d{2}|\d{4})\s*[-/_.]\s*(\d{1,5})/i);
  if (yearFirst) return String(Number(yearFirst[1]));
  const direct = raw.match(/BC\s*(?:N\s*[°ºo.?#\uFFFD]?\s*)?[:/#._ -]*\s*(\d{1,5})/i);
  if (direct) return String(Number(direct[1]));
  const triple = raw.match(/\b(\d{1,5})\s*\/\s*[A-Z]{1,6}\s*\/\s*\d{4}\b/i);
  if (triple) return String(Number(triple[1]));
  const slashYear = raw.match(/^(\d{1,5})\s*\/\s*20\d{2}$/);
  if (slashYear) return String(Number(slashYear[1]));
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
function getBcDedupKey(ref, record = {}) {
  const r = String(ref || record.ref || '').trim();
  const serial = extractBcSerial(r) || (record.sourceFile ? extractBcSerial(record.sourceFile) : '');
  if (serial) {
    return `SERIAL_${Number(serial)}`;
  }
  if (!r) {
    if (record.supplierName && (record.amountTTC || record.amount)) {
      const s = String(record.supplierName).toLowerCase().replace(/[^a-z0-9]/g, '');
      const amt = Math.round(Number(record.amountTTC || record.amount || 0));
      return `SIG_${s}_${record.date || ''}_${amt}`;
    }
    return `RAW_${record.id || Math.random()}`;
  }
  const clean = r.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/bc/gi, '')
    .replace(/[n°º#:\/\-_.]/gi, '')
    .replace(/\s+/g, '')
    .trim();
  return clean ? `CLEAN_${clean}` : `RAW_${r}`;
}
if (typeof window !== 'undefined') window.getBcDedupKey = getBcDedupKey;
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
  const normalized = {
    ...row,
    id: String(row.id || row._id || uid('bc')),
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
  if (row._id) normalized._id = String(row._id);
  else delete normalized._id;
  return normalized;
}
function mergeBcPreservingStatus(existing = {}, incoming = {}, allowExplicitStatus = false) {
  const normIn = normalizeBcRecord(incoming);
  const merged = normalizeBcRecord({
    ...existing,
    ...normIn,
    id: existing.id || normIn.id,
    _id: existing._id || normIn._id,
    daRef: existing.daRef || normIn.daRef,
    daStatus: existing.daStatus === 'validated' ? 'validated' : (normIn.daStatus || existing.daStatus || 'draft'),
    daValidatedAt: existing.daValidatedAt || normIn.daValidatedAt || '',
    goodsReceivedDate: existing.goodsReceivedDate || normIn.goodsReceivedDate || '',
    serviceDoneDate: existing.serviceDoneDate || normIn.serviceDoneDate || '',
    paymentStatus: existing.paymentStatus || normIn.paymentStatus || '',
    paymentRef: existing.paymentRef || normIn.paymentRef || '',
    dpRef: existing.dpRef || normIn.dpRef || '',
    dpDate: existing.dpDate || normIn.dpDate || '',
    paymentPaidDate: existing.paymentPaidDate || normIn.paymentPaidDate || '',
    remarques: existing.remarques || normIn.remarques || '',
    comments: existing.comments || normIn.comments || '',
    notes: existing.notes || normIn.notes || '',
    lineItems: (Array.isArray(normIn.lineItems) && normIn.lineItems.length > 0) ? normIn.lineItems : (existing.lineItems || []),
    createdAt: existing.createdAt || normIn.createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  if (!allowExplicitStatus) {
    if (existing.status === 'clos' || existing.status === 'cloture') merged.status = 'clos';
    else if (existing.status === 'livre_paye') { merged.status = 'livre_paye'; merged.paymentStatus = 'paye'; }
    else if (existing.status && existing.status !== 'importe' && existing.status !== 'transmis' && (!normIn.status || normIn.status === 'importe' || normIn.status === 'clos')) {
      merged.status = existing.status;
    }
  }
  return merged;
}
function canonicalizeDpRef(rawRef, fallbackDate = '') {
  const s = String(rawRef || '').trim();
  if (!s) return '';
  if (/^BC\b/i.test(s)) return s;
  const cleaned = s.replace(/^(?:DEMANDE\s+DE\s+PAIEMENT|PAIEMENT|DP)?\s*(?:N\s*[°oº]?|NO\.?)?\s*[:\-]?\s*/i, '').trim();
  const slashMatch = cleaned.match(/^0*(\d{1,5})\s*[\/\-_.\s]\s*(\d{2}|20\d{2})$/);
  if (slashMatch) {
    const num = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const yr = slashMatch[2].length === 2 ? `20${slashMatch[2]}` : slashMatch[2];
    return `${num}/${yr}`;
  }
  const numOnly = cleaned.match(/^0*(\d{1,5})$/);
  if (numOnly) {
    const yearMatch = String(fallbackDate || '').match(/(20\d{2})/);
    const year = yearMatch ? yearMatch[1] : '2026';
    const num = String(parseInt(numOnly[1], 10)).padStart(2, '0');
    return `${num}/${year}`;
  }
  return cleaned;
}

function getDpDedupKey(dp) {
  if (!dp) return '';
  const cRef = canonicalizeDpRef(dp.paymentRef, dp.requestDate || dp.paidDate);
  if (cRef && !/^DP-[a-z0-9]{4}$/i.test(cRef) && !/^BC\b/i.test(cRef)) {
    return 'dp:' + cRef.toUpperCase().replace(/\s+/g, '');
  }
  const ben = String(dp.beneficiary || dp.supplierName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const amt = Math.round(Number(dp.amount || 0));
  const dt = String(dp.requestDate || dp.paidDate || '').slice(0, 10);
  if (ben && amt > 0) {
    return `ben:${ben}|${amt}|${dt}`;
  }
  return String(dp.id || dp._id || '');
}

function mergeTwoPayments(existing, incoming) {
  const a = existing || {};
  const b = incoming || {};
  const objIdRe = /^[a-f\d]{24}$/i;
  const bestMongoId = objIdRe.test(String(b._id || '')) ? String(b._id) : (objIdRe.test(String(a._id || '')) ? String(a._id) : (a._id || b._id));
  const bestId = objIdRe.test(String(a.id || '')) ? a.id : (objIdRe.test(String(b.id || '')) ? b.id : (a.id || b.id || uid('pay')));
  const isPaid = a.status === 'paye' || a.status === 'paid' || b.status === 'paye' || b.status === 'paid';
  const mergedBcIds = Array.from(new Set([...(Array.isArray(a.linkedBcIds) ? a.linkedBcIds : []), ...(Array.isArray(b.linkedBcIds) ? b.linkedBcIds : []), a.bcId, b.bcId].filter(Boolean)));
  const mergedBcRefs = Array.from(new Set([...(Array.isArray(a.linkedBcRefs) ? a.linkedBcRefs : []), ...(Array.isArray(b.linkedBcRefs) ? b.linkedBcRefs : [])].filter(Boolean)));
  const explicitExcluded = (b._rawExcluded === false && a._rawExcluded !== true)
    ? false
    : Boolean(a.excluded || b.excluded || a.isSpecialCase || b.isSpecialCase);
  const merged = {
    ...a,
    ...b,
    id: String(bestId),
    paymentRef: canonicalizeDpRef(b.paymentRef || a.paymentRef, b.requestDate || a.requestDate),
    status: isPaid ? 'paye' : (b.status || a.status || 'en_attente'),
    paidDate: (isPaid ? (b.paidDate || a.paidDate || b.requestDate || a.requestDate) : (b.paidDate || a.paidDate)) || '',
    requestDate: a.requestDate || b.requestDate || '',
    amount: Number(b.amount || a.amount || 0) || 0,
    beneficiary: b.beneficiary || a.beneficiary || '',
    notes: b.notes || a.notes || '',
    natureExpense: b.natureExpense || a.natureExpense || '',
    referenceDocs: b.referenceDocs || a.referenceDocs || '',
    transactionRef: b.transactionRef || a.transactionRef || '',
    bcId: mergedBcIds[0] || '',
    linkedBcIds: mergedBcIds,
    linkedBcRefs: mergedBcRefs,
    manualLink: Boolean(a.manualLink || b.manualLink),
    isDirect: Boolean(a.isDirect || b.isDirect),
    directCategory: b.directCategory || a.directCategory || '',
    excluded: explicitExcluded,
    isSpecialCase: explicitExcluded,
    excludedReason: String(b.excludedReason || a.excludedReason || '').trim(),
  };
  if (bestMongoId) merged._id = String(bestMongoId);
  else delete merged._id;
  return merged;
}

function deduplicatePaymentsList(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  const unkeyed = [];
  for (const raw of list) {
    if (!raw) continue;
    const norm = normalizePayment(raw);
    const key = getDpDedupKey(norm);
    if (!key) {
      unkeyed.push(norm);
      continue;
    }
    if (map.has(key)) {
      map.set(key, mergeTwoPayments(map.get(key), norm));
    } else {
      map.set(key, norm);
    }
  }
  return Array.from(map.values()).concat(unkeyed);
}

function normalizePayment(row = {}) {
  const reqDate = toYmd(row.requestDate) || '';
  const pDate = toYmd(row.paidDate) || '';
  const canonRef = canonicalizeDpRef(row.paymentRef, reqDate || pDate);
  const textForSpecial = `${row.notes || ''} ${row.natureExpense || ''} ${row.excludedReason || ''} ${row.directCategory || ''}`;
  const autoSpecial = /\b(special\s*case|cas\s*sp[eé]cial|hors\s*calcul)\b/i.test(textForSpecial);
  const isExcluded = (row.excluded === false && row.isSpecialCase !== true)
    ? false
    : Boolean(row.excluded || row.isSpecialCase || autoSpecial);
  const normalized = {
    ...row,
    id: String(row.id || row._id || uid('pay')),
    bcId: row.bcId || (Array.isArray(row.linkedBcIds) && row.linkedBcIds[0]) || '',
    paymentRef: canonRef,
    requestDate: reqDate,
    paidDate: pDate,
    amount: Number(row.amount || 0) || 0,
    mode: row.mode || row.paymentMode || 'virement',
    transactionRef: String(row.transactionRef || '').trim(),
    status: (row.status === 'paid' || row.status === 'paye') ? 'paye' : (row.status || 'en_attente'),
    notes: String(row.notes || row.objet || row.description || row.natureExpense || '').trim(),
    beneficiary: String(row.beneficiary || row.supplier || row.supplierName || '').trim(),
    department: String(row.department || '').trim(),
    natureExpense: String(row.natureExpense || row.nature || '').trim(),
    referenceDocs: String(row.referenceDocs || '').trim(),
    linkedBcRefs: Array.isArray(row.linkedBcRefs) ? row.linkedBcRefs : (row.linkedBcRef ? [row.linkedBcRef] : []),
    linkedBcIds: Array.isArray(row.linkedBcIds) ? row.linkedBcIds : (row.bcId ? [row.bcId] : []),
    excluded: isExcluded,
    isSpecialCase: isExcluded,
    excludedReason: String(row.excludedReason || (autoSpecial ? 'Cas spécial / Hors calcul' : '')).trim(),
    createdAt: row.createdAt || nowIso(),
    updatedAt: row.updatedAt || nowIso(),
  };
  if (row._id) normalized._id = String(row._id);
  else delete normalized._id;
  return normalized;
}
if (typeof window !== 'undefined') {
  window.canonicalizeDpRef = canonicalizeDpRef;
  window.getDpDedupKey = getDpDedupKey;
  window.deduplicatePaymentsList = deduplicatePaymentsList;
  window.normalizeBcRecord = normalizeBcRecord;
  window.mergeBcPreservingStatus = mergeBcPreservingStatus;
  window.normalizePayment = normalizePayment;
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
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  let raw = '';
  try {
    raw = localStorage.getItem(STORAGE_KEYS[0]) || '';
  } catch (e) {}
  const base = defaultState();
  const preload = (typeof window !== 'undefined' && (window.PRELOAD_DATA || window.__SUIVI_PRELOAD__)) ? (window.PRELOAD_DATA || window.__SUIVI_PRELOAD__) : null;
  if (!raw) {
    if (preload) {
      if (Array.isArray(preload.bcRecords) && preload.bcRecords.length > 0) {
        base.bcRecords = preload.bcRecords.map(normalizeBcRecord);
      }
      if (Array.isArray(preload.payments) && preload.payments.length > 0) {
        base.payments = deduplicatePaymentsList(preload.payments);
      }
    }
    return base;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.version && parsed.version !== SUIVI_DATA_VERSION)) {
      console.warn('[app.js] Cache version mismatch or legacy data detected. Discarding stale cache.');
      try { localStorage.removeItem(STORAGE_KEYS[0]); } catch (e) {}
      if (preload) {
        if (Array.isArray(preload.bcRecords) && preload.bcRecords.length > 0) {
          base.bcRecords = preload.bcRecords.map(normalizeBcRecord);
        }
        if (Array.isArray(preload.payments) && preload.payments.length > 0) {
          base.payments = deduplicatePaymentsList(preload.payments);
        }
      }
      return base;
    }
    let loadedBcs = Array.isArray(parsed.bcRecords) ? parsed.bcRecords.map(normalizeBcRecord) : [];
    let loadedPayments = Array.isArray(parsed.payments) ? deduplicatePaymentsList(parsed.payments) : [];

    if (loadedBcs.length === 0 && preload && Array.isArray(preload.bcRecords) && preload.bcRecords.length > 0) {
      loadedBcs = preload.bcRecords.map(normalizeBcRecord);
    }
    if (loadedPayments.length === 0 && preload && Array.isArray(preload.payments) && preload.payments.length > 0) {
      loadedPayments = deduplicatePaymentsList(preload.payments);
    }

    const safeActiveTab = (!parsed.activeTab || parsed.activeTab === 'stock' || parsed.activeTab === 'fleet') ? 'followup' : parsed.activeTab;

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
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  if (Array.isArray(state.payments) && state.payments.length > 1) {
    state.payments = deduplicatePaymentsList(state.payments);
  }
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
if (typeof window !== 'undefined') window.saveState = saveState;
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
        state.payments = deduplicatePaymentsList(window.PRELOAD_DATA.payments);
      }
    } else if (Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length > 0) {
      state.payments = deduplicatePaymentsList([...state.payments, ...window.PRELOAD_DATA.payments]);
    }
  }
  if (state.activeTab === 'stock' || !state.activeTab) {
    state.activeTab = 'followup';
  }
  if (Array.isArray(state.payments) && state.payments.length > 0) {
    state.payments = deduplicatePaymentsList(state.payments);
  }
  state.session = loadSession();
  state.settings.bcSequence = Math.max(Number(state.settings.bcSequence || 1), highestBcSequence() + 1);
  state.settings.daSequence = Math.max(Number(state.settings.daSequence || 1), highestDaSequence() + 1);
  state.ui = { followupPage: 1, followupPageSize: 10, followupSortField: 'date', followupSortDir: 'desc', ...(state.ui || {}) };
}

function setTheme(theme) {
  const safe = (theme === 'dark') ? 'dark' : 'light';
  state.settings.theme = safe;
  if (document.body) {
    if (document.body.dataset) document.body.dataset.theme = safe;
    if (document.body.classList) document.body.classList.toggle('dark-mode', safe === 'dark');
  }
  if (document.documentElement) {
    if (document.documentElement.dataset) document.documentElement.dataset.theme = safe;
    if (document.documentElement.classList) document.documentElement.classList.toggle('dark-mode', safe === 'dark');
  }
  if (typeof document !== 'undefined' && document.head) {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme && document.createElement) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    if (metaTheme) metaTheme.setAttribute('content', safe === 'dark' ? '#0f172a' : '#ffffff');
  }
  if ($('themeSelect')) $('themeSelect').value = safe;
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = safe === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    toggleBtn.title = safe === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre';
  }
  try {
    localStorage.setItem('sde_theme', safe);
    localStorage.setItem('sde_portal_theme', safe);
    localStorage.setItem('douroub_theme', safe);
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
    livre_paye: '✓ Livré & Payé',
    paye: 'Payé',
    livre: 'Livré',
    receptionne: 'Réceptionné',
    service_fait: 'Service fait',
    cloture: 'Clôturé',
    clos: 'Clôturé',
    transmis: 'Transmis',
    en_attente: 'En attente',
    en_cours: 'En cours',
    brouillon: 'Brouillon',
    importe: 'Transmis',
    programme: 'Programmé',
  }[value] || value || '—';
}
function statusClass(value) {
  if (value === 'livre_paye') return 'status-livre-paye ok';
  if (['receptionne', 'livre', 'service_fait'].includes(value)) return 'status-receptionne info';
  if (value === 'paye') return 'status-paye ok';
  if (['cloture', 'clos'].includes(value)) return 'status-cloture ok';
  if (['partiel', 'en_cours', 'programme'].includes(value)) return 'status-partiel warn';
  if (['transmis', 'en_attente', 'importe'].includes(value)) return 'status-transmis warn';
  if (value === 'brouillon') return 'status-brouillon info';
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
  if ($('bcStatus')) $('bcStatus').value = 'transmis';
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
  if (payload.status === 'livre_paye') {
    if (!payload.goodsReceivedDate && !payload.serviceDoneDate) {
      if (payload.type === 'service') payload.serviceDoneDate = payload.date || todayYmd();
      else payload.goodsReceivedDate = payload.date || todayYmd();
    }
    payload.paymentStatus = 'paye';
    if (!payload.paymentPaidDate) payload.paymentPaidDate = payload.date || todayYmd();
    if (!String(payload.remarques || '').includes('✓ Payé')) {
      payload.remarques = payload.remarques ? (payload.remarques + ' · ✓ Payé') : '✓ Payé';
    }
  }
  return payload;
}
function submitFollowupForm(e) {
  e.preventDefault();
  const mode = e.submitter?.dataset.mode || 'save';
  const existing = findBcById($('followupId').value);
  const payload = buildBcPayloadFromMain(mode, existing);
  if (!payload.ref) return showToast('Référence BC requise.');
  if (!payload.supplierName) return showToast('Fournisseur requis.');
  let index = state.bcRecords.findIndex((row) => row.id === payload.id);
  let wasMergedDuplicate = false;
  if (index < 0) {
    const dedupKey = getBcDedupKey(payload.ref, payload);
    if (dedupKey) {
      const dupIdx = state.bcRecords.findIndex((row) => getBcDedupKey(row.ref, row) === dedupKey);
      if (dupIdx >= 0) {
        const merged = mergeBcPreservingStatus(state.bcRecords[dupIdx], payload, true);
        state.bcRecords.splice(dupIdx, 1, merged);
        index = dupIdx;
        wasMergedDuplicate = true;
      }
    }
  }
  if (index >= 0 && !wasMergedDuplicate) state.bcRecords.splice(index, 1, payload);
  else if (index < 0) {
    state.bcRecords.unshift(payload);
    if (state.ui.isFilteredActive && Array.isArray(state.ui.activeFilteredIds) && !state.ui.activeFilteredIds.includes(payload.id)) {
      state.ui.activeFilteredIds.push(payload.id);
    }
  }
  bumpBcSequenceFromRef(payload.ref);
  bumpDaSequenceFromRef(payload.daRef);
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
  fillReferenceLists();
  refreshSelectOptions();
  resetFollowupForm();
  closeBcDrawer();
  renderApp();
  showToast(wasMergedDuplicate ? 'BC existante mise à jour (doublon évité).' : (mode === 'validate' ? 'BC et DA validés.' : 'Ligne BC enregistrée.'));
}
function filteredBcRecords() {
  if ((!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0) {
    state.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
  }
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
      if (status !== 'all') {
        const isPaid = !!(row.status === 'livre_paye' || row.status === 'paye' || row.paymentStatus === 'paye' || row.paymentRef || row.dpRef || row.paymentPaidDate || (row.remarques && /pay[eé]/i.test(row.remarques)));
        const isDelivered = ['livre_paye', 'livre', 'receptionne', 'service_fait', 'clos', 'cloture'].includes(row.status) || Boolean(row.goodsReceivedDate || row.serviceDoneDate);
        
        if (status === 'livre_paye' && !(isDelivered && isPaid)) return false;
        if (status === 'livre' && !isDelivered) return false;
        if (status === 'paye' && !isPaid) return false;
        if (status === 'non_paye' && isPaid) return false;
        if (status === 'non_livre' && isDelivered) return false;
        if (status === 'transmis' && (isDelivered || isPaid)) return false;
        if (status === 'clos' && row.status !== 'clos' && row.status !== 'cloture') return false;
        if (!['livre_paye', 'livre', 'paye', 'non_paye', 'non_livre', 'transmis', 'clos'].includes(status) && row.status !== status) return false;
      }
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
  const truckPlate = row.truckPlate || row.truckVin || (fleetInfo && fleetInfo.identified ? fleetInfo.truckId : null);
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

  const isPaidRow = (typeof isBcActuallyPaid === 'function')
    ? isBcActuallyPaid(row)
    : !!(row.status === 'livre_paye' || row.status === 'paye' || row.paymentStatus === 'paye' || row.paymentRef || row.dpRef || row.paymentPaidDate || (row.remarques && /pay[eé]/i.test(row.remarques)));
  const closedPaidBadge = ((row.status === 'clos' || row.status === 'cloture') && isPaidRow)
    ? `<span class="status-pill status-paye" style="font-size:10px;margin-left:4px;">✓ Payé</span>`
    : '';
  const linkedDps = (typeof getLinkedDpsForBc === 'function') ? getLinkedDpsForBc(row) : [];
  const rawDpCandidate = (linkedDps[0] && linkedDps[0].paymentRef) || (!/^BC\b/i.test(String(row.dpRef || '').trim()) ? row.dpRef : '') || (!/^BC\b/i.test(String(row.paymentRef || '').trim()) ? row.paymentRef : '') || '';
  const primaryDpRef = canonicalizeDpRef(rawDpCandidate, row.date);
  const hasUnpaidDp = linkedDps.length > 0 && !isPaidRow;
  let dpChipHtml = '';
  if (isPaidRow && primaryDpRef) {
    const extraCnt = linkedDps.length > 1 ? ` +${linkedDps.length - 1}` : '';
    dpChipHtml = `<span class="bc-dp-chip bc-dp-chip-paid bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="Règlement lié : DP ${escapeHtml(primaryDpRef)}">💳 DP ${escapeHtml(primaryDpRef)}${extraCnt}</span>`;
  } else if (hasUnpaidDp && primaryDpRef) {
    dpChipHtml = `<span class="bc-dp-chip bc-dp-chip-pending bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="DP liée en attente de règlement : ${escapeHtml(primaryDpRef)}">⏳ DP ${escapeHtml(primaryDpRef)} (En attente)</span>`;
  } else if (!isPaidRow && !primaryDpRef && typeof window !== 'undefined' && window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getLogicalDpCandidatesForBc === 'function') {
    const cands = window.LogicalMatchEngine.getLogicalDpCandidatesForBc(row);
    if (cands && cands.length > 0 && cands[0].score >= 45) {
      const top = cands[0];
      dpChipHtml = `<span class="bc-ai-suggest-chip bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="DP logique détectée : ${escapeHtml(top.dp.paymentRef || '')}">🤖 DP suggérée (${top.score}%)</span>`;
    }
  }
  const isChecked = typeof window !== 'undefined' && window.selectedFollowupBcIds && window.selectedFollowupBcIds.has(row.id);
  return `<tr>
    <td style="text-align:center;vertical-align:middle;"><input type="checkbox" class="followup-row-cb" data-id="${row.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;" /></td>
    <td><strong>${escapeHtml(row.ref)}</strong><span class="table-subline">${escapeHtml(row.importedFromBC ? (row.sourceFile || 'Import BC') : 'Saisie manuelle')}</span>${stockBadge ? `<div style="margin-top:3px;">${stockBadge}</div>` : ''}</td>
    <td><strong>${escapeHtml(row.daRef || 'DA auto')}</strong><span class="table-subline">${row.daStatus === 'validated' ? `Validé le ${escapeHtml(formatDate(row.daValidatedAt))}` : 'modifiable'}</span></td>
    <td>${escapeHtml(formatDate(row.date))}</td>
    <td>${escapeHtml(row.supplierName || '—')}</td>
    <td>${escapeHtml(row.requester || '—')}</td>
    <td><span class="badge bg-light text-dark border" style="font-size:11px;padding:3px 6px;">${escapeHtml(row.department || row.service || '—')}</span></td>
    <td><span class="badge bg-${row.type === 'service' ? 'info' : 'secondary'} text-white" style="font-size:11px;padding:3px 6px;">${escapeHtml(row.type === 'service' ? 'Service' : 'Achat')}</span></td>
    <td>${escapeHtml(formatMoney(row.amountHT || (row.amountTTC ? Math.round(row.amountTTC / 1.19) : (row.amount ? Math.round(row.amount / 1.19) : 0)), 'DZD'))}</td>
    <td><strong>${escapeHtml(formatMoney(row.amountTTC || row.amount || 0, 'DZD'))}</strong></td>
    <td><div class="bc-status-cell-stack"><div><span class="status-pill ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>${closedPaidBadge}</div><div><span class="status-pill ${validationClass(row)}" style="font-size:10px;">${escapeHtml(validationLabel(row))}</span></div>${dpChipHtml}</div></td>
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
  if ((!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0) {
    state.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
    if (typeof saveState === 'function') saveState();
  }
  const rows = filteredBcRecords();
  const pageSize = Number(state.ui.followupPageSize || 10) || 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.ui.followupPage = Math.min(Math.max(1, state.ui.followupPage || 1), totalPages);
  const startIndex = (state.ui.followupPage - 1) * pageSize;
  const visible = rows.slice(startIndex, startIndex + pageSize);
  tableBody.innerHTML = visible.length ? visible.map(renderBcRow).join('') : `<tr><td colspan="14" class="muted">Aucun bon de commande. Cliquez sur ➕ Nouveau Bon de Commande pour commencer.</td></tr>`;
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
  $('editBcStatus').value = (!row.status || row.status === 'importe') ? 'transmis' : (row.status === 'cloture' ? 'clos' : row.status);
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
  if (payload.status === 'livre_paye') {
    if (!payload.goodsReceivedDate && !payload.serviceDoneDate) {
      if (payload.type === 'service') payload.serviceDoneDate = payload.date || todayYmd();
      else payload.goodsReceivedDate = payload.date || todayYmd();
    }
    payload.paymentStatus = 'paye';
    if (!payload.paymentPaidDate) payload.paymentPaidDate = payload.date || todayYmd();
    if (!String(payload.remarques || '').includes('✓ Payé')) {
      payload.remarques = payload.remarques ? (payload.remarques + ' · ✓ Payé') : '✓ Payé';
    }
  }
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
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
  renderApp();
  showToast('BC et DA validés.');
}
function duplicateBc(id) {
  const row = findBcById(id);
  if (!row) return;
  const copyData = clone(row);
  delete copyData._id;
  const copy = normalizeBcRecord({
    ...copyData,
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
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
  renderApp();
  showToast('BC dupliquée.');
}
function deleteBc(id) {
  if (!confirm('Supprimer cette ligne BC ?')) return;
  const target = state.bcRecords.find((r) => r.id === id);
  state.bcRecords = state.bcRecords.filter((row) => row.id !== id);
  if (typeof window !== 'undefined' && window.selectedFollowupBcIds) {
    window.selectedFollowupBcIds.delete(id);
  }
  if (state.ui && Array.isArray(state.ui.activeFilteredIds)) {
    state.ui.activeFilteredIds = state.ui.activeFilteredIds.filter((x) => x !== id);
  }
  (state.payments || []).forEach((p) => {
    if (p.bcId === id) p.bcId = '';
    if (Array.isArray(p.linkedBcIds)) p.linkedBcIds = p.linkedBcIds.filter((x) => x !== id);
    if (target?.ref && Array.isArray(p.linkedBcRefs)) p.linkedBcRefs = p.linkedBcRefs.filter((r) => r !== target.ref);
  });
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
    window.bcBridge.cancelPendingSync();
  }
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
    window.bcBridge.cancelPendingSync();
  }
  if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
    const apiId = encodeURIComponent(target?._id || id);
    const apiRef = encodeURIComponent(target?.ref || '');
    fetch(`/api/bc/${apiId}?ref=${apiRef}`, { method: 'DELETE' }).catch(() => {});
  }
  renderApp();
  if (typeof updateFollowupBulkBar === 'function') updateFollowupBulkBar();
  showToast('Ligne BC supprimée.');
}
function preparePaymentForBc(id) {
  const row = findBcById(id);
  if (!row) return;
  setActiveTab('payments');
  if (typeof switchPaymentsSubview === 'function') switchPaymentsSubview('form');
  resetPaymentForm();
  if ($('paymentBcId')) $('paymentBcId').value = row.id;
  if ($('paymentBeneficiary')) $('paymentBeneficiary').value = row.supplierName || '';
  if ($('paymentAmount')) $('paymentAmount').value = row.amountTTC || row.amount || '';
  if ($('paymentNotes')) $('paymentNotes').value = row.description || row.comments || '';
  if ($('paymentRef')) $('paymentRef').focus();
}

function resetPaymentForm() {
  if ($('paymentForm')) $('paymentForm').reset();
  if ($('paymentId')) $('paymentId').value = '';
  if ($('paymentBeneficiary')) $('paymentBeneficiary').value = '';
  if ($('paymentRequestDate')) $('paymentRequestDate').value = todayYmd();
  if ($('paymentStatus')) $('paymentStatus').value = 'en_attente';
  if ($('paymentMode')) $('paymentMode').value = 'virement';
  if ($('paymentExcluded')) $('paymentExcluded').checked = false;
}
function submitPaymentForm(e) {
  e.preventDefault();
  const existing = findPaymentById($('paymentId').value);
  const chosenBcId = $('paymentBcId') ? $('paymentBcId').value : '';
  const bc = chosenBcId ? findBcById(chosenBcId) : null;
  const st = $('paymentStatus').value;
  const isPaidNow = (st === 'paye' || st === 'paid');
  const prevIds = Array.isArray(existing?.linkedBcIds) ? existing.linkedBcIds.filter(Boolean) : [];
  let nextLinkedIds = prevIds;
  if (chosenBcId) {
    nextLinkedIds = prevIds.length > 1
      ? Array.from(new Set([chosenBcId, ...prevIds]))
      : [chosenBcId];
  } else if (existing && prevIds.length <= 1) {
    nextLinkedIds = [];
  }
  const nextLinkedRefs = nextLinkedIds.map(id => findBcById(id)?.ref).filter(Boolean);
  const isExcludedNow = Boolean($('paymentExcluded')?.checked);
  const payload = normalizePayment({
    ...(existing || {}),
    id: existing?.id || $('paymentId').value || uid('pay'),
    bcId: chosenBcId || nextLinkedIds[0] || '',
    linkedBcIds: nextLinkedIds,
    linkedBcRefs: nextLinkedRefs,
    beneficiary: ($('paymentBeneficiary')?.value || '').trim() || bc?.supplierName || existing?.beneficiary || '',
    paymentRef: $('paymentRef').value.trim(),
    requestDate: $('paymentRequestDate').value || todayYmd(),
    paidDate: isPaidNow ? ($('paymentPaidDate').value || todayYmd()) : $('paymentPaidDate').value,
    amount: parseFlexibleNumber($('paymentAmount').value || bc?.amountTTC || 0),
    mode: $('paymentMode').value,
    transactionRef: $('paymentTransactionRef').value.trim(),
    status: st,
    excluded: isExcludedNow,
    isSpecialCase: isExcludedNow,
    notes: $('paymentNotes').value.trim(),
    manualLink: Boolean(chosenBcId || existing?.manualLink || (existing && !chosenBcId && prevIds.length > 0)),
    updatedAt: nowIso(),
  });
  const idx = state.payments.findIndex((row) => row.id === payload.id);
  if (idx >= 0) state.payments.splice(idx, 1, payload);
  else state.payments.unshift(payload);
  state.payments = deduplicatePaymentsList(state.payments);
  prevIds.filter(oldId => !nextLinkedIds.includes(oldId)).forEach(oldId => {
    const oldBc = findBcById(oldId);
    if (oldBc && window.ApproNextGen && typeof window.ApproNextGen._recomputeBcPaymentFromRemainingDps === 'function') {
      if (String(oldBc.dpRef || '') === String(payload.paymentRef || '')) oldBc.dpRef = '';
      if (String(oldBc.paymentRef || '') === String(payload.paymentRef || '')) oldBc.paymentRef = '';
      window.ApproNextGen._recomputeBcPaymentFromRemainingDps(oldBc);
    }
  });
  let cascadedCount = 0;
  if (payload.excluded) {
    if (window.ApproNextGen && typeof window.ApproNextGen.reconcileAfterDpRemoved === 'function') {
      window.ApproNextGen.reconcileAfterDpRemoved(payload);
    }
  } else if (window.ApproNextGen && typeof window.ApproNextGen.cascadeDpStatusToLinkedBcs === 'function') {
    const cascadedBcs = window.ApproNextGen.cascadeDpStatusToLinkedBcs(payload);
    cascadedCount = Array.isArray(cascadedBcs) ? cascadedBcs.length : Number(cascadedBcs || 0);
  }
  if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
  saveState();
  if (window.bcBridge) {
    if (typeof window.bcBridge.syncPaymentsToServer === 'function') window.bcBridge.syncPaymentsToServer();
    if (typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
  }
  resetPaymentForm();
  if (typeof switchPaymentsSubview === 'function') switchPaymentsSubview('register');
  renderApp();
  showToast(cascadedCount > 0 ? `DP enregistrée · ${cascadedCount} BC associé(s) mis à jour !` : 'Demande de paiement enregistrée.');
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
  if (typeof window !== 'undefined' && typeof window._enhancedRenderPaymentsTable === 'function') {
    return window._enhancedRenderPaymentsTable();
  }
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
  setActiveTab('payments');
  if (typeof switchPaymentsSubview === 'function') switchPaymentsSubview('form');
  const card = $('paymentFormCard');
  if (card) card.style.display = 'block';
  $('paymentId').value = row.id;
  if ($('paymentBcId')) $('paymentBcId').value = row.bcId || (row.linkedBcIds && row.linkedBcIds[0]) || '';
  if ($('paymentBeneficiary')) $('paymentBeneficiary').value = row.beneficiary || '';
  $('paymentRef').value = row.paymentRef || '';
  $('paymentRequestDate').value = row.requestDate || '';
  $('paymentPaidDate').value = row.paidDate || '';
  $('paymentAmount').value = row.amount || '';
  $('paymentMode').value = row.mode || 'virement';
  $('paymentTransactionRef').value = row.transactionRef || '';
  $('paymentStatus').value = (row.status === 'paid' || row.status === 'paye') ? 'paye' : (row.status || 'en_attente');
  $('paymentNotes').value = row.notes || row.natureExpense || '';
  if ($('paymentExcluded')) $('paymentExcluded').checked = Boolean(row.excluded || row.isSpecialCase);
  if (card) card.scrollIntoView({ behavior: 'smooth' });
}
function deletePayment(id) {
  const target = findPaymentById(id);
  if (!confirm('Supprimer cette demande de paiement ?')) return;
  state.payments = state.payments.filter((row) => row.id !== id);
  if (window.selectedPaymentIds) window.selectedPaymentIds.delete(id);
  if (target && window.ApproNextGen && typeof window.ApproNextGen.reconcileAfterDpRemoved === 'function') {
    window.ApproNextGen.reconcileAfterDpRemoved(target);
  }
  if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
  saveState();
  if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
    const apiId = encodeURIComponent(target?._id || id);
    fetch(`/api/payments/${apiId}`, { method: 'DELETE' }).catch(() => {});
  }
  if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
  renderApp();
  showToast('Demande de paiement supprimée.');
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
  const activePayments = state.payments.filter((row) => !row.excluded && row.status !== 'annule');
  const pendingPayments = activePayments.filter((row) => row.status !== 'paye').length;
  const pendingAmount = activePayments.filter((row) => row.status !== 'paye').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const financeClosed = activePayments.filter((row) => row.requestDate && row.paidDate);
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
    if (row.excluded || row.status === 'annule') continue;
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
  state.payments.filter((row) => !row.excluded && row.status !== 'annule' && row.status !== 'paye').slice(0, 4).forEach((row) => {
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
      if (parsed && Array.isArray(parsed.bcRecords)) {
        const dedupedMap = new Map();
        parsed.bcRecords.forEach((raw) => {
          const norm = normalizeBcRecord(raw);
          const key = getBcDedupKey(norm.ref, norm) || norm.id;
          if (dedupedMap.has(key)) {
            dedupedMap.set(key, mergeBcPreservingStatus(dedupedMap.get(key), norm, false));
          } else {
            dedupedMap.set(key, norm);
          }
        });
        parsed.bcRecords = Array.from(dedupedMap.values());
      }
      if (parsed && Array.isArray(parsed.payments)) {
        const payMap = new Map();
        parsed.payments.forEach((p) => {
          const normP = normalizePayment(p);
          const pk = normP.paymentRef || normP.id;
          if (!payMap.has(pk)) payMap.set(pk, normP);
        });
        parsed.payments = Array.from(payMap.values());
      }
      parsed.version = SUIVI_DATA_VERSION;
      localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(parsed));
      setupState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
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
      const payloadKey = getBcDedupKey(payload.ref, payload);
      const idx = state.bcRecords.findIndex((row) => getBcDedupKey(row.ref, row) === payloadKey);
      if (idx >= 0) {
        if (updateExisting) {
          state.bcRecords.splice(idx, 1, mergeBcPreservingStatus(state.bcRecords[idx], payload, false));
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
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
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
  let updated = 0;
  const errors = [];
  const existingByKey = new Map();
  state.bcRecords.forEach((r, idx) => {
    const k = getBcDedupKey(r.ref, r) || normalizeText(r.ref);
    if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
  });
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
    const dedupKey = getBcDedupKey(payload.ref, payload) || normalizeText(payload.ref);
    if (dedupKey && existingByKey.has(dedupKey)) {
      const targetIdx = existingByKey.get(dedupKey);
      state.bcRecords[targetIdx] = mergeBcPreservingStatus(state.bcRecords[targetIdx], payload, false);
      updated += 1;
    } else {
      state.bcRecords.unshift(payload);
      existingByKey.clear();
      state.bcRecords.forEach((r, idx) => {
        const k = getBcDedupKey(r.ref, r) || normalizeText(r.ref);
        if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
      });
      count += 1;
    }
    bumpBcSequenceFromRef(payload.ref);
    bumpDaSequenceFromRef(payload.daRef);
  });
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
  const msg = `${count} ligne(s) ajoutée(s)${updated ? `, ${updated} mise(s) à jour` : ''}.`;
  $('bulkImportResult').innerHTML = errors.length ? `${msg}<br>${errors.map(escapeHtml).join('<br>')}` : msg;
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
  if (tab === 'fleet') {
    if (typeof window !== 'undefined' && window.FleetAnalyzer && typeof window.FleetAnalyzer.openModal === 'function') {
      window.FleetAnalyzer.openModal();
    }
    return;
  }
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
  if (safeTab === 'stock' || safeTab === 'fleet' || !safeTab) {
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
if (typeof window !== 'undefined') {
  window.renderActiveTab = renderActiveTab;
  window.renderApp = renderApp;
  window.renderAll = renderApp;
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

  // User card toggle — GDS-style rich dropdown with .open class & live stats
  const userChip = document.getElementById('userChipWrap');
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = document.getElementById('userProfileCard');
      if (!card) return;
      const willOpen = !card.classList.contains('open');
      card.classList.toggle('open', willOpen);
      if (willOpen) {
        card.style.removeProperty('display');
        const u = getActiveUser() || {};
        const nameStr = u.fullName || u.name || 'Administrateur';
        const roleStr = u.role || 'Resp. Achats & Appro';
        const initials = nameStr.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD';
        if ($('ucardName')) $('ucardName').textContent = nameStr;
        if ($('ucardRole')) $('ucardRole').textContent = roleStr;
        if ($('ucardInitials')) $('ucardInitials').textContent = initials;
        if ($('userChipAvatar')) $('userChipAvatar').textContent = initials;
        if ($('udropBcCount')) $('udropBcCount').textContent = String((state.bcRecords || []).length);
        const pendingDps = (state.payments || []).filter(p => !p.excluded && p.status !== 'annule' && !(typeof isDpPaidStatus === 'function' ? isDpPaidStatus(p) : p.status === 'paye')).length;
        if ($('udropDpPendingCount')) $('udropDpPendingCount').textContent = String(pendingDps);
        const aiCount = (window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getSummaryStats === 'function')
          ? (window.LogicalMatchEngine.getSummaryStats().unpaidWithDpCount || 0)
          : 0;
        if ($('udropAiMatchCount')) $('udropAiMatchCount').textContent = String(aiCount);
      }
    });
  }
  document.addEventListener('click', (e) => {
    const card = document.getElementById('userProfileCard');
    if (card && !card.contains(e.target)) {
      card.classList.remove('open');
    }
  });

  // Smart match run button
  document.getElementById('btnRunSmartMatch')?.addEventListener('click', () => {
    if (window.SmartMatch) {
      SmartMatch.run(true);
      showToast('Rapprochement IA recalculé !');
    }
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
  $('exportFollowupCsvBtn')?.addEventListener('click', () => {
    const rows = filteredBcRecords();
    if (!rows.length) { showToast('Aucune ligne BC à exporter en CSV.'); return; }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Réf BC', 'Réf DA', 'Date BC', 'Fournisseur', 'Demandeur', 'Structure', 'Type', 'Montant HT', 'Montant TTC', 'Statut BC', 'DP Liée', 'Payé', 'Réalisation', 'Remarques'];
    const lines = [headers.map(esc).join(';')].concat(rows.map(r => [
      r.ref, r.daRef, r.date, r.supplierName, r.requester, r.department, r.type, r.amountHT || 0, r.amountTTC || r.amount || 0,
      statusLabel(r.status), r.dpRef || r.paymentRef || '', isBcActuallyPaid(r) ? 'Oui' : 'Non', r.goodsReceivedDate || r.serviceDoneDate || '', r.remarques || ''
    ].map(esc).join(';')));
    downloadBlob(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `suivi_bc_${todayYmd()}.csv`);
    showToast(`Export CSV généré (${rows.length} BC).`);
  });
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
  const triggerLiveFollowupFilter = () => {
    if (state.ui) {
      state.ui.isFilteredActive = false;
      state.ui.activeFilteredIds = null;
    }
    resetFollowupPage();
    renderFollowupTable();
  };
  ['followupStatusFilter', 'followupValidationFilter', 'followupTypeFilter', 'followupRequesterFilter', 'followupDateFrom', 'followupDateTo'].forEach((fid) => {
    const el = $(fid);
    if (el) el.addEventListener('change', triggerLiveFollowupFilter);
  });
  if ($('followupSearch')) {
    $('followupSearch').addEventListener('input', triggerLiveFollowupFilter);
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
  $('paymentSearch').addEventListener('input', () => { if (typeof window.renderPaymentsTable === 'function') window.renderPaymentsTable(); });
  $('paymentFilterStatus').addEventListener('change', () => { if (typeof window.renderPaymentsTable === 'function') window.renderPaymentsTable(); });
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
  const toolbar = $('dpFiltersBar') || $('paymentSearch')?.closest('.toolbar-row');
  if (!toolbar) return;
  toolbar.classList.add('compact-toolbar', 'filters-row', 'premium-filters-grid');
  if (!$('paymentFilterMode') && !$('paymentFilterLink')) {
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
      4: ['requester', 'Demandeur'],
      5: ['department', 'Service / Département'],
      6: ['type', 'Type'],
      7: ['amountHT', 'Montant HT'],
      8: ['amount', 'Montant TTC'],
      9: ['status', 'Statut BC'],
      10: ['goodsReceivedDate', 'Réalisation'],
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
  if ($('paymentFilterLink')) $('paymentFilterLink').value = 'all';
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
  if (typeof window !== 'undefined' && typeof window._enhancedRenderPaymentsTable === 'function') {
    return window._enhancedRenderPaymentsTable();
  }
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

  bindInputRender(['paymentSearch'], debounce(() => { if (typeof window.renderPaymentsTable === 'function') window.renderPaymentsTable(); }, 120), 'input');
  bindInputRender(['paymentFilterStatus', 'paymentFilterLink', 'paymentFilterMode', 'paymentFilterSupplier', 'paymentDateFrom', 'paymentDateTo', 'paymentSortField', 'paymentSortDir'], () => { if (typeof window.renderPaymentsTable === 'function') window.renderPaymentsTable(); });
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
    fleet: 'Flotte & Vidanges',
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
    if (existingLabel) {
      if (existingLabel.textContent.trim() !== label) existingLabel.textContent = label;
      if (!existingBadge) {
        tab.insertAdjacentHTML('afterbegin', `<span class="tab-icon-badge" aria-hidden="true">${tabIconSvg(key)}</span>`);
      }
      return;
    }
    const navCountEl = tab.querySelector('.sa-nav-badge');
    const navCountBadge = navCountEl ? (navCountEl.outerHTML || `<span class="sa-nav-badge" id="${navCountEl.id || ''}">${escapeHtml(navCountEl.textContent || '0')}</span>`) : '';
    const iconEl = tab.querySelector('i');
    const iconHtml = iconEl ? (iconEl.outerHTML || '<i class="fas"></i>') : `<span class="tab-icon-badge" aria-hidden="true">${tabIconSvg(key)}</span>`;
    tab.innerHTML = `${iconHtml}<span class="tab-label">${escapeHtml(label)}</span>${navCountBadge}`;
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
  const rawHt = $('bcAmountHT') ? parseFlexibleNumber($('bcAmountHT').value) : 0;
  const rawTva = $('bcTVA') ? parseFlexibleNumber($('bcTVA').value) : 0;
  const rawRemarques = $('bcRemarques') ? $('bcRemarques').value.trim() : '';
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
    amountHT: rawHt || existing?.amountHT || 0,
    tva: rawTva || existing?.tva || 0,
    currency: 'DZD',
    type: $('bcType').value || 'achat',
    description: $('bcDescription').value.trim(),
    status: $('bcStatus').value || 'transmis',
    promisedDate: $('bcPromisedDate').value || addBusinessDays(date, state.settings.procurementDays || 0),
    goodsReceivedDate: $('bcGoodsDate').value,
    serviceDoneDate: $('bcServiceDate').value,
    department: (typeof window.normalizeDepartment === 'function' ? window.normalizeDepartment($('bcDepartment')?.value.trim() || existing?.department, supplier?.name || $('bcSupplier').value.trim(), requester?.name || $('bcRequester').value.trim()) : ($('bcDepartment')?.value.trim() || existing?.department || 'Maintenance & Parc')),
    requester: requester?.name || $('bcRequester').value.trim() || $('bcDepartment')?.value.trim() || 'Maintenance & Parc',
    paymentTerms: $('bcPaymentTerms').value.trim(),
    comments: $('bcComments').value.trim(),
    notes: $('bcNotes').value.trim(),
    remarques: rawRemarques || existing?.remarques || '',
    importedFromBC: Boolean(existing?.importedFromBC),
    sourceFile: existing?.sourceFile || '',
    lineItems: existing?.lineItems || [],
    lineCount: existing?.lineCount || 0,
    totalQty: existing?.totalQty || 0,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  if (payload.status === 'livre_paye') {
    if (!payload.goodsReceivedDate && !payload.serviceDoneDate) {
      if (payload.type === 'service') payload.serviceDoneDate = payload.date || todayYmd();
      else payload.goodsReceivedDate = payload.date || todayYmd();
    }
    payload.paymentStatus = 'paye';
    if (!payload.paymentPaidDate) payload.paymentPaidDate = payload.date || todayYmd();
    if (!/pay[eé]/i.test(String(payload.remarques || ''))) {
      payload.remarques = payload.remarques ? (payload.remarques + ' · ✓ Payé') : '✓ Payé';
    }
  }
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
  $('editBcStatus').value = (!row.status || row.status === 'importe') ? 'transmis' : (row.status === 'cloture' ? 'clos' : row.status);
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
  if (typeof window !== 'undefined' && typeof window._enhancedSubmitBcEditForm === 'function') {
    return window._enhancedSubmitBcEditForm(e);
  }
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
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
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
  let updated = 0;
  const errors = [];
  const existingByKey = new Map();
  state.bcRecords.forEach((r, idx) => {
    const k = getBcDedupKey(r.ref, r) || normalizeText(r.ref);
    if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
  });
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
    const dedupKey = getBcDedupKey(payload.ref, payload) || normalizeText(payload.ref);
    if (dedupKey && existingByKey.has(dedupKey)) {
      const targetIdx = existingByKey.get(dedupKey);
      state.bcRecords[targetIdx] = mergeBcPreservingStatus(state.bcRecords[targetIdx], payload, false);
      updated += 1;
    } else {
      state.bcRecords.unshift(payload);
      existingByKey.clear();
      state.bcRecords.forEach((r, idx) => {
        const k = getBcDedupKey(r.ref, r) || normalizeText(r.ref);
        if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
      });
      count += 1;
    }
    bumpBcSequenceFromRef(payload.ref);
    bumpDaSequenceFromRef(payload.daRef);
  });
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
  const msg = `${count} ligne(s) ajoutée(s)${updated ? `, ${updated} mise(s) à jour` : ''}.`;
  $('bulkImportResult').innerHTML = errors.length ? `${msg}<br>${errors.map(escapeHtml).join('<br>')}` : msg;
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
window.LogicalMatchEngine = {
  _version: 1,
  _cacheKey: '',
  _cache: null,
  _ignoredKeys: null,

  invalidate() {
    this._version++;
    this._cacheKey = '';
    this._cache = null;
  },

  getIgnoredSet() {
    if (!this._ignoredKeys) {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('suivi_ignored_sm_v1') : null;
        this._ignoredKeys = new Set(raw ? JSON.parse(raw) : []);
      } catch (e) {
        this._ignoredKeys = new Set();
      }
    }
    return this._ignoredKeys;
  },

  ignoreKey(key) {
    const s = this.getIgnoredSet();
    s.add(String(key));
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('suivi_ignored_sm_v1', JSON.stringify(Array.from(s)));
    } catch (e) {}
    this.invalidate();
  },

  clearIgnored() {
    this._ignoredKeys = new Set();
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('suivi_ignored_sm_v1');
    } catch (e) {}
    this.invalidate();
  },

  normalizeEntity(raw) {
    if (!raw) return { clean: '', tokens: [], acronym: '' };
    const stopForms = new Set([
      'sarl', 'eurl', 'spa', 'snc', 'ets', 'etablissement', 'etablissements',
      'ste', 'societe', 'groupe', 'entreprise', 'ent', 'mr', 'mme', 'mlle',
      'dr', 'freres', 'fils', 'cie', 'co', 'algerie', 'dz', 'biskra'
    ]);
    const ascii = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const allWords = ascii.split(' ').filter(Boolean);
    const tokens = allWords.filter(w => w.length >= 2 && !stopForms.has(w));
    const core = tokens.length > 0 ? tokens : allWords.filter(w => w.length >= 2);
    const acronym = core.length >= 2 ? core.map(w => w[0]).join('') : '';
    return { clean: core.join(' '), compact: core.join(''), tokens: core, acronym };
  },

  levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    if (Math.abs(a.length - b.length) > 3) return 99;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + cost);
        diag = tmp;
      }
    }
    return prev[b.length];
  },

  scoreSupplier(bcSup, dpBen) {
    const a = this.normalizeEntity(bcSup);
    const b = this.normalizeEntity(dpBen);
    if (!a.compact || !b.compact) return { sim: 0, tag: '' };
    if (a.compact === b.compact) return { sim: 1.0, tag: 'Fournisseur exact' };
    if ((a.tokens.length === 1 && a.compact.length >= 2 && a.compact === b.acronym) ||
        (b.tokens.length === 1 && b.compact.length >= 2 && b.compact === a.acronym)) {
      return { sim: 0.90, tag: 'Acronyme fournisseur' };
    }
    if (a.compact.length >= 4 && b.compact.length >= 4 && (a.compact.includes(b.compact) || b.compact.includes(a.compact))) {
      return { sim: 0.92, tag: 'Fournisseur concordant' };
    }
    let matched = 0;
    for (const ta of a.tokens) {
      const hit = b.tokens.some(tb => {
        if (ta === tb) return true;
        if (ta.length >= 4 && tb.length >= 4 && (ta.startsWith(tb) || tb.startsWith(ta))) return true;
        const maxDist = Math.min(ta.length, tb.length) >= 7 ? 2 : (Math.min(ta.length, tb.length) >= 4 ? 1 : 0);
        return maxDist > 0 && this.levenshtein(ta, tb) <= maxDist;
      });
      if (hit) matched++;
    }
    const denom = Math.max(1, Math.min(a.tokens.length, b.tokens.length));
    const union = Math.max(1, new Set([...a.tokens, ...b.tokens]).size);
    const sim = (matched / denom) * 0.7 + (matched / union) * 0.3;
    return { sim: Math.min(0.95, sim), tag: sim >= 0.75 ? 'Fournisseur proche' : (sim >= 0.45 ? 'Fournisseur partiel' : '') };
  },

  extractBcNumbers(dp) {
    const raw = [
      dp.bcRef, dp.paymentRef, dp.referenceDocs, dp.natureExpense,
      dp.notes, dp.description, dp.objet, dp.sourceFile
    ].filter(Boolean).join(' | ');
    const nums = new Set();
    const listMatches = raw.matchAll(/\bB\.?C\s*(?:N[°o]?)?\s*[-:#]?\s*(\d{1,4}(?:\s*(?:\/|,|&|\+|\bet\b)\s*\d{1,4})*)/gi);
    for (const m of listMatches) {
      const chunk = m[1] || '';
      const sub = chunk.match(/\d{1,4}/g) || [];
      sub.forEach(s => {
        const n = parseInt(s, 10);
        if (n > 0 && n < 2000) nums.add(n);
      });
    }
    for (const m of raw.matchAll(/\b(\d{1,4})\s*\/\s*DG\s*\/\s*202[4-9]\b/gi)) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n < 2000) nums.add(n);
    }
    return Array.from(nums);
  },

  scoreAmountHeuristic(dpAmt, bc) {
    const ttc = Number(bc.amountTTC || bc.amount || 0);
    const ht = Number(bc.amountHT || 0);
    if (dpAmt <= 0 || (ttc <= 0 && ht <= 0)) return { pts: 0, tag: '', diff: Math.abs(dpAmt - ttc), basisAmt: ttc };
    const diffTtc = ttc > 0 ? Math.abs(dpAmt - ttc) : Infinity;
    const diffHt = ht > 0 ? Math.abs(dpAmt - ht) : Infinity;
    if (diffTtc <= 5) return { pts: 48, tag: 'Montant TTC exact', diff: diffTtc, basisAmt: ttc };
    if (diffHt <= 5) return { pts: 45, tag: 'Montant HT exact', diff: diffHt, basisAmt: ht };
    if (ht > 0) {
      const tva19 = ht * 1.19;
      const tva09 = ht * 1.09;
      if (Math.abs(dpAmt - tva19) <= Math.max(10, dpAmt * 0.003)) return { pts: 44, tag: 'HT + TVA 19%', diff: Math.abs(dpAmt - tva19), basisAmt: tva19 };
      if (Math.abs(dpAmt - tva09) <= Math.max(10, dpAmt * 0.003)) return { pts: 44, tag: 'HT + TVA 9%', diff: Math.abs(dpAmt - tva09), basisAmt: tva09 };
    }
    if (ttc > 0 && Math.abs(dpAmt - ttc * 1.01) <= Math.max(15, ttc * 0.0025)) {
      return { pts: 43, tag: 'TTC + Timbre 1%', diff: Math.abs(dpAmt - ttc * 1.01), basisAmt: ttc };
    }
    const bestBasis = diffHt < diffTtc ? ht : ttc;
    const bestDiff = Math.min(diffTtc, diffHt);
    const rel = bestBasis > 0 ? bestDiff / bestBasis : 1;
    if (rel <= 0.01) return { pts: 38, tag: 'Montant ±1%', diff: bestDiff, basisAmt: bestBasis };
    if (ttc > 0) {
      for (const r of [0.95, 0.90]) {
        if (Math.abs(dpAmt - ttc * r) <= Math.max(15, ttc * 0.005)) {
          return { pts: 35, tag: `Retenue garantie (${Math.round(r * 100)}%)`, diff: Math.abs(dpAmt - ttc * r), basisAmt: ttc };
        }
      }
      for (const r of [0.30, 0.50, 0.70, 0.80]) {
        if (Math.abs(dpAmt - ttc * r) <= Math.max(15, ttc * 0.006)) {
          return { pts: 30, tag: `Acompte / Tranche (${Math.round(r * 100)}%)`, diff: Math.abs(dpAmt - ttc * r), basisAmt: ttc };
        }
      }
    }
    if (rel <= 0.03) return { pts: 31, tag: 'Montant ±3%', diff: bestDiff, basisAmt: bestBasis };
    if (rel <= 0.08) return { pts: 22, tag: 'Montant ±8%', diff: bestDiff, basisAmt: bestBasis };
    if (rel <= 0.15) return { pts: 12, tag: 'Montant proche', diff: bestDiff, basisAmt: bestBasis };
    return { pts: 0, tag: '', diff: diffTtc === Infinity ? diffHt : diffTtc, basisAmt: bestBasis };
  },

  scoreContextAndDate(bc, dp) {
    let pts = 0;
    const tags = [];
    const bcDateStr = bc.date || bc.requestDate || '';
    const dpDateStr = dp.requestDate || dp.paidDate || '';
    if (bcDateStr && dpDateStr) {
      const diffDays = Math.round((new Date(dpDateStr) - new Date(bcDateStr)) / 86400000);
      if (!isNaN(diffDays)) {
        if (diffDays >= -2 && diffDays <= 45) { pts += 10; tags.push(`Délai ${Math.max(0, diffDays)}j`); }
        else if (diffDays >= -7 && diffDays <= 150) { pts += 5; }
        else if (diffDays < -30) { pts -= 12; }
      }
    }
    const stopCtx = new Set(['achat', 'fourniture', 'prestation', 'travaux', 'facture', 'reglement', 'paiement', 'commande', 'pour', 'dans', 'avec', 'biskra', 'douroub']);
    const bcTxt = [bc.description, bc.remarques, bc.vehicleRegistration, ...(bc.lineItems || []).map(l => l.description || '')].filter(Boolean).join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const dpTxt = [dp.natureExpense, dp.notes, dp.referenceDocs, dp.objet].filter(Boolean).join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const bcWords = new Set((bcTxt.match(/[a-z0-9]{4,}/g) || []).filter(w => !stopCtx.has(w)));
    const dpWords = (dpTxt.match(/[a-z0-9]{4,}/g) || []).filter(w => !stopCtx.has(w));
    let overlap = 0;
    dpWords.forEach(w => { if (bcWords.has(w)) overlap++; });
    if (overlap >= 2) { pts += 10; tags.push('Objet concordant'); }
    else if (overlap === 1) { pts += 5; }
    return { pts, tags };
  },

  findMultiBcCombo(pool, dpAmt, maxK = 6) {
    if (!pool || pool.length < 2 || dpAmt <= 0) return null;
    const tol = Math.max(15, dpAmt * 0.005);
    for (const mode of ['ttc', 'ht']) {
      const getVal = b => mode === 'ht'
        ? Number(b.amountHT || 0)
        : Number(b.amountTTC || b.amount || 0);
      const valid = pool.filter(b => {
        const v = getVal(b);
        return v > 0 && v < dpAmt - 1;
      }).sort((a, b) => getVal(b) - getVal(a)).slice(0, 16);
      if (valid.length < 2) continue;
      for (let i = 0; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) {
          const sum2 = getVal(valid[i]) + getVal(valid[j]);
          if (Math.abs(sum2 - dpAmt) <= tol) {
            return { bcs: [valid[i], valid[j]], totalAmt: sum2, diff: Math.abs(sum2 - dpAmt), basis: mode.toUpperCase() };
          }
        }
      }
      let best = null;
      let steps = 0;
      const dfs = (idx, chosen, sum) => {
        if (best || steps > 2800) return;
        steps++;
        if (chosen.length >= 2 && Math.abs(sum - dpAmt) <= tol) {
          best = { bcs: chosen, totalAmt: sum, diff: Math.abs(sum - dpAmt), basis: mode.toUpperCase() };
          return;
        }
        if (idx >= valid.length || chosen.length >= maxK || sum > dpAmt + tol) return;
        dfs(idx + 1, [...chosen, valid[idx]], sum + getVal(valid[idx]));
        dfs(idx + 1, chosen, sum);
      };
      dfs(0, [], 0);
      if (best) return best;
    }
    return null;
  },

  scoreSinglePair(bc, dp, dpBcNums) {
    const dpAmt = Number(dp.amount || 0);
    const bcNumMatch = String(bc.ref || '').match(/(\d{1,4})/);
    const bcNum = bcNumMatch ? parseInt(bcNumMatch[1], 10) : -1;
    const nums = dpBcNums || this.extractBcNumbers(dp);
    const hasExplicitRef = bcNum > 0 && nums.includes(bcNum);
    const sup = this.scoreSupplier(bc.supplierName, dp.beneficiary);
    const amt = this.scoreAmountHeuristic(dpAmt, bc);
    const ctx = this.scoreContextAndDate(bc, dp);

    if (!hasExplicitRef && sup.sim < 0.38 && !(amt.pts >= 45 && (!bc.supplierName || sup.sim >= 0.2))) {
      return null;
    }

    let raw = 0;
    const reasons = [];
    if (hasExplicitRef) { raw += 46; reasons.push(`Réf BC N°${bcNum} citée`); }
    if (sup.sim > 0) {
      raw += Math.round(sup.sim * 38);
      if (sup.tag) reasons.push(sup.tag);
    }
    if (amt.pts > 0) {
      raw += amt.pts;
      if (amt.tag) reasons.push(amt.tag);
    }
    raw += ctx.pts;
    ctx.tags.forEach(t => reasons.push(t));

    if (!hasExplicitRef && sup.sim < 0.38) {
      raw = Math.min(raw, 62);
      reasons.push('Fournisseur à confirmer');
    }
    const score = Math.max(0, Math.min(99, raw));
    if (score < 35) return null;
    return {
      key: `${dp.id}::${bc.id}`,
      dp,
      bc,
      bcs: [bc],
      isMulti: false,
      totalBcAmt: amt.basisAmt || Number(bc.amountTTC || bc.amount || 0),
      diff: Number.isFinite(amt.diff) ? amt.diff : Math.abs(dpAmt - Number(bc.amountTTC || bc.amount || 0)),
      score,
      reasons
    };
  },
  isPairIgnored(dp, bcs, key) {
    if (key && this.getIgnoredSet().has(key)) return true;
    const ignArr = Array.isArray(dp && dp.ignoredBcIds) ? dp.ignoredBcIds : [];
    if (!ignArr.length) return false;
    const list = Array.isArray(bcs) ? bcs : [bcs];
    return list.some(b => b && (ignArr.includes(b.id) || (b.ref && ignArr.includes(b.ref))));
  },

  _ensureCache() {
    const bcs = (typeof state !== 'undefined' && Array.isArray(state.bcRecords)) ? state.bcRecords : [];
    const dps = (typeof state !== 'undefined' && Array.isArray(state.payments)) ? state.payments : [];
    const linkedCnt = dps.reduce((s, d) => s + (d.isDirect ? 1000 : 0) + ((d.linkedBcIds && d.linkedBcIds.length) || (d.bcId ? 1 : 0)) + ((d.ignoredBcIds && d.ignoredBcIds.length) || 0), 0);
    const paidCnt = bcs.reduce((s, b) => s + (isBcActuallyPaid(b) ? 1 : 0), 0) + dps.reduce((s, d) => s + (isDpPaidStatus(d) ? 1 : 0), 0);
    const key = `${this._version}|${bcs.length}|${dps.length}|${linkedCnt}|${paidCnt}`;
    if (this._cache && this._cacheKey === key) return this._cache;

    const unlinkedBcs = bcs.filter(b => b.ref && getLinkedDpsForBc(b).length === 0 && !b.dpRef && !isBcActuallyPaid(b));
    const unlinkedDps = dps.filter(d => !d.excluded && !d.isSpecialCase && !d.isDirect && (!Array.isArray(d.linkedBcIds) || d.linkedBcIds.length === 0) && !d.bcId);

    const byBcId = new Map();
    const byDpId = new Map();
    const suggestions = [];

    const bcByNum = new Map();
    unlinkedBcs.forEach(b => {
      const m = String(b.ref || '').match(/(\d{1,4})/);
      if (m) bcByNum.set(parseInt(m[1], 10), b);
    });

    unlinkedDps.forEach(dp => {
      const dpAmt = Number(dp.amount || 0);
      const dpNums = this.extractBcNumbers(dp);
      const dpCands = [];

      if (dpNums.length >= 2) {
        const refBcs = dpNums.map(n => bcByNum.get(n)).filter(Boolean);
        if (refBcs.length >= 2) {
          const sumAmt = refBcs.reduce((s, b) => s + Number(b.amountTTC || b.amount || 0), 0);
          const mKey = `${dp.id}::${refBcs.map(b => b.id).sort().join('+')}`;
          if (!this.isPairIgnored(dp, refBcs, mKey)) {
            dpCands.push({
              key: mKey, dp, bc: refBcs[0], bcs: refBcs, isMulti: true,
              totalBcAmt: sumAmt, diff: Math.abs(dpAmt - sumAmt), score: 96,
              reasons: [`Lot réfs citées (${refBcs.length} BCs)`, 'Rapprochement multi-BC']
            });
          }
        }
      }

      if (dpAmt > 0) {
        const supPool = unlinkedBcs.filter(b => !this.isPairIgnored(dp, b, '') && this.scoreSupplier(b.supplierName, dp.beneficiary).sim >= 0.50);
        const combo = this.findMultiBcCombo(supPool, dpAmt, 6);
        if (combo && combo.bcs.length >= 2) {
          const mKey = `${dp.id}::${combo.bcs.map(b => b.id).sort().join('+')}`;
          if (!this.isPairIgnored(dp, combo.bcs, mKey) && !dpCands.some(c => c.key === mKey)) {
            dpCands.push({
              key: mKey, dp, bc: combo.bcs[0], bcs: combo.bcs, isMulti: true,
              totalBcAmt: combo.totalAmt, diff: combo.diff, score: 93,
              reasons: [`Somme ${combo.basis} exacte (${combo.bcs.length} BCs)`, 'Même fournisseur']
            });
          }
        }
      }

      unlinkedBcs.forEach(bc => {
        const cand = this.scoreSinglePair(bc, dp, dpNums);
        if (cand && !this.isPairIgnored(dp, bc, cand.key)) {
          dpCands.push(cand);
          if (!byBcId.has(bc.id)) byBcId.set(bc.id, []);
          byBcId.get(bc.id).push(cand);
        }
      });

      dpCands.filter(c => c.isMulti).forEach(mc => {
        mc.bcs.forEach(bc => {
          if (!byBcId.has(bc.id)) byBcId.set(bc.id, []);
          byBcId.get(bc.id).push(mc);
        });
      });

      dpCands.sort((a, b) => b.score - a.score || a.diff - b.diff);
      byDpId.set(dp.id, dpCands);
      if (dpCands.length > 0 && dpCands[0].score >= 45) {
        suggestions.push(dpCands[0]);
      }
    });

    byBcId.forEach(list => list.sort((a, b) => b.score - a.score || a.diff - b.diff));
    suggestions.sort((a, b) => b.score - a.score || a.diff - b.diff);

    this._cacheKey = key;
    this._cache = { suggestions, byBcId, byDpId, unlinkedBcs, unlinkedDps };
    return this._cache;
  },

  getLogicalDpCandidatesForBc(bc) {
    if (!bc) return [];
    const cache = this._ensureCache();
    const cached = cache.byBcId.get(bc.id);
    if (cached && cached.length > 0) return cached;
    const onDemand = [];
    cache.unlinkedDps.forEach(dp => {
      const c = this.scoreSinglePair(bc, dp, null);
      if (c && !this.isPairIgnored(dp, bc, c.key)) onDemand.push(c);
    });
    return onDemand.sort((a, b) => b.score - a.score || a.diff - b.diff);
  },

  getLogicalBcCandidatesForDp(dp) {
    if (!dp) return [];
    return this._ensureCache().byDpId.get(dp.id) || [];
  },

  getCandidateCountSummary() {
    return this._ensureCache().suggestions.length;
  },

  getSummaryStats() {
    const c = this._ensureCache();
    const s = c.suggestions;
    return {
      totalSuggestions: s.length,
      sureCount: s.filter(x => x.score >= 85).length,
      probableCount: s.filter(x => x.score >= 65 && x.score < 85).length,
      possibleCount: s.filter(x => x.score >= 45 && x.score < 65).length,
      multiCount: s.filter(x => x.isMulti).length,
      unlinkedBcCount: c.unlinkedBcs.length,
      unlinkedDpCount: c.unlinkedDps.length,
      bcWithoutCandCount: c.unlinkedBcs.filter(b => !(c.byBcId.get(b.id) || []).some(m => m.score >= 45)).length
    };
  }
};
window.SmartMatch = {
  _selectedKeys: new Set(),

  run(forceRecalc = false) {
    if (forceRecalc && window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    const cache = window.LogicalMatchEngine._ensureCache();
    const stats = window.LogicalMatchEngine.getSummaryStats();
    this.renderKpiStrip(stats);
    this.renderAlertBanner(cache.unlinkedBcs);
    this.renderSuggestionsView(cache);
    this.renderUnlinkedBcs(cache.unlinkedBcs);
    this.renderUnlinkedDps(cache.unlinkedDps);
    if (typeof window.updateTopNavBadges === 'function') window.updateTopNavBadges();
  },

  onFilterChange() {
    this.run(false);
  },

  resetFilters() {
    const s = document.getElementById('smSearchInput');
    const t = document.getElementById('smTierFilter');
    if (s) s.value = '';
    if (t) t.value = 'all';
    this._selectedKeys.clear();
    this.run(false);
  },

  updateSelectedCounter() {
    const el = document.getElementById('smSelectedCount');
    if (el) el.textContent = String(this._selectedKeys.size);
  },

  toggleRow(key, checked) {
    if (checked) this._selectedKeys.add(key);
    else this._selectedKeys.delete(key);
    this.updateSelectedCounter();
  },

  toggleSelectAll(checked) {
    document.querySelectorAll('.sm-row-chk').forEach(chk => {
      chk.checked = Boolean(checked);
      if (checked) this._selectedKeys.add(chk.value);
      else this._selectedKeys.delete(chk.value);
    });
    this.updateSelectedCounter();
  },

  confirmLink(dpId, bcIds, forceMarkPaid = false, skipConfirm = false) {
    const ids = Array.isArray(bcIds) ? bcIds : [bcIds];
    const dp = (state.payments || []).find(d => d.id === dpId);
    const targetBcs = (state.bcRecords || []).filter(b => ids.includes(b.id));
    if (!dp || !targetBcs.length) return;
    if (!skipConfirm) {
      const dpAmt = formatMoney(dp.amount, 'DZD');
      const bcsTotal = formatMoney(targetBcs.reduce((s, b) => s + Number(b.amountTTC || b.amount || 0), 0), 'DZD');
      if (!confirm(`Confirmer le rapprochement ?\n\nDP: ${dp.paymentRef} — ${dp.beneficiary} (${dpAmt})\nBC(s): ${targetBcs.map(b => b.ref).join(', ')} (${bcsTotal})`)) return;
    }
    if (window.ApproNextGen && typeof window.ApproNextGen.linkBcAndDpPair === 'function') {
      window.ApproNextGen.linkBcAndDpPair(dp, targetBcs, Boolean(forceMarkPaid));
    }
    this._selectedKeys.clear();
    this.run(true);
  },

  autoLinkSureMatches() {
    const cache = window.LogicalMatchEngine._ensureCache();
    const sure = cache.suggestions.filter(s => s.score >= 85);
    if (!sure.length) {
      showToast('Aucun match sûr (≥85%) en attente de liaison.');
      return;
    }
    const usedBcIds = new Set();
    let count = 0;
    sure.forEach(s => {
      if (s.bcs.some(b => usedBcIds.has(b.id))) return;
      s.bcs.forEach(b => usedBcIds.add(b.id));
      if (window.ApproNextGen && typeof window.ApproNextGen.linkBcAndDpPair === 'function') {
        window.ApproNextGen.linkBcAndDpPair(s.dp, s.bcs, false, true);
        count++;
      }
    });
    window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    renderApp();
    this.run(true);
    showToast(`⚡ ${count} rapprochement(s) sûr(s) (≥85%) validé(s) !`);
  },
  validateSelected(forceMarkPaid = false) {
    if (this._selectedKeys.size === 0) {
      showToast('Cochez au moins une suggestion IA à valider.');
      return;
    }
    const cache = window.LogicalMatchEngine._ensureCache();
    const chosen = cache.suggestions.filter(s => this._selectedKeys.has(s.key));
    if (!chosen.length) return;
    let count = 0;
    chosen.forEach(s => {
      if (window.ApproNextGen && typeof window.ApproNextGen.linkBcAndDpPair === 'function') {
        window.ApproNextGen.linkBcAndDpPair(s.dp, s.bcs, Boolean(forceMarkPaid), true);
        count++;
      }
    });
    this._selectedKeys.clear();
    window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    renderApp();
    this.run(true);
    showToast(`✓ ${count} rapprochement(s) sélectionné(s) validé(s)${forceMarkPaid ? ' et marqué(s) Payé' : ''} !`);
  },

  ignoreSuggestion(key) {
    const parts = String(key || '').split('::');
    if (parts.length === 2) {
      const dp = (state.payments || []).find(p => p.id === parts[0]);
      if (dp) {
        const bcIds = parts[1].split('+').filter(Boolean);
        const bcRefs = bcIds.map(id => (state.bcRecords || []).find(b => b.id === id)?.ref).filter(Boolean);
        dp.ignoredBcIds = Array.from(new Set([...(Array.isArray(dp.ignoredBcIds) ? dp.ignoredBcIds : []), ...bcIds, ...bcRefs]));
        dp.updatedAt = new Date().toISOString();
      }
    }
    window.LogicalMatchEngine.ignoreKey(key);
    this._selectedKeys.delete(key);
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncPaymentsToServer === 'function') window.bcBridge.syncPaymentsToServer();
    this.run(true);
    showToast('Suggestion ignorée et enregistrée.');
  },

  markDpDirect(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;
    dp.isDirect = true;
    dp.directCategory = dp.directCategory || 'Dépense directe sans BC';
    dp.linkedBcIds = [];
    dp.linkedBcRefs = [];
    dp.bcId = '';
    dp.manualLink = true;
    window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    renderApp();
    this.run(true);
    showToast(`⚡ DP ${dp.paymentRef} classée en dépense directe sans BC.`);
  },

  renderKpiStrip(stats) {
    const el = document.getElementById('smKpiStrip');
    if (!el) return;
    el.innerHTML = `
      <div class="f-summary-card"><span class="f-sum-lbl">Suggestions IA</span><strong class="f-sum-val">${stats.totalSuggestions}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #10b981;"><span class="f-sum-lbl">🟢 Matchs Sûrs (≥85%)</span><strong class="f-sum-val" style="color:#059669;">${stats.sureCount}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #2563eb;"><span class="f-sum-lbl">🔵 Probables (65–84%)</span><strong class="f-sum-val" style="color:#2563eb;">${stats.probableCount}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #7c3aed;"><span class="f-sum-lbl">📦 Lots Multi-BC</span><strong class="f-sum-val" style="color:#7c3aed;">${stats.multiCount}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #d97706;"><span class="f-sum-lbl">⚠️ BC sans DP</span><strong class="f-sum-val" style="color:#d97706;">${stats.unlinkedBcCount}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #dc2626;"><span class="f-sum-lbl">⚠️ DP sans BC</span><strong class="f-sum-val" style="color:#dc2626;">${stats.unlinkedDpCount}</strong></div>
    `;
  },

  renderAlertBanner(unlinkedBcs) {
    const el = document.getElementById('smUnlinkedBcBanner');
    if (!el) return;
    const waiting30 = unlinkedBcs.filter(b => b.date && Math.round((Date.now() - new Date(b.date)) / 86400000) > 30);
    if (waiting30.length > 0) {
      const total = waiting30.reduce((s, b) => s + Number(b.amountTTC || b.amount || 0), 0).toLocaleString('fr-DZ');
      el.style.display = 'flex';
      el.innerHTML = `<i class="fas fa-triangle-exclamation"></i>&nbsp; <strong>${waiting30.length} bon(s) de commande</strong> sans paiement lié depuis plus de 30 jours — Encours : <strong>${total} DA</strong>`;
    } else {
      el.style.display = 'none';
    }
  },
  renderSuggestionsView(cache) {
    const el = document.getElementById('smSuggestionsTable');
    const count = document.getElementById('smSuggestCount');
    if (!el) return;
    const q = String(document.getElementById('smSearchInput')?.value || '').toLowerCase().trim();
    const tier = document.getElementById('smTierFilter')?.value || 'all';

    if (tier === 'no_cand') {
      const orphans = cache.unlinkedBcs.filter(b => !(cache.byBcId.get(b.id) || []).some(m => m.score >= 45))
        .filter(b => !q || `${b.ref} ${b.supplierName} ${b.amountTTC || ''}`.toLowerCase().includes(q));
      if (count) count.textContent = `${orphans.length} BC sans candidat`;
      el.innerHTML = orphans.length === 0
        ? '<p style="padding:14px;color:var(--muted);font-size:12.5px;">✓ Tous les BC non payés disposent d\'au moins un candidat ou d\'une DP.</p>'
        : `<table><thead><tr><th>Réf BC</th><th>Date</th><th>Fournisseur</th><th>Montant TTC</th><th>Statut</th><th>Action</th></tr></thead><tbody>${
          orphans.map(b => `<tr>
            <td><strong>${escapeHtml(b.ref || '—')}</strong></td>
            <td>${escapeHtml(formatDate(b.date))}</td>
            <td>${escapeHtml(b.supplierName || '—')}</td>
            <td style="font-weight:700;">${formatMoney(b.amountTTC || b.amount, 'DZD')}</td>
            <td><span class="status-pill ${statusClass(b.status)}">${escapeHtml(statusLabel(b.status))}</span></td>
            <td><button type="button" class="btn btn-soft btn-compact" onclick="window.openBcDetailModal && window.openBcDetailModal('${b.id}')">👁️ Examiner BC</button></td>
          </tr>`).join('')
        }</tbody></table>`;
      return;
    }

    const filtered = cache.suggestions.filter(s => {
      if (tier === 'sure' && s.score < 85) return false;
      if (tier === 'probable' && (s.score < 65 || s.score >= 85)) return false;
      if (tier === 'possible' && (s.score < 45 || s.score >= 65)) return false;
      if (tier === 'multi' && !s.isMulti) return false;
      if (q) {
        const hay = `${s.dp.paymentRef} ${s.dp.beneficiary} ${s.dp.amount} ${s.dp.natureExpense || ''} ${s.bcs.map(b => `${b.ref} ${b.supplierName}`).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (count) count.textContent = `${filtered.length} suggestion${filtered.length !== 1 ? 's' : ''}`;
    this.updateSelectedCounter();
    if (!filtered.length) {
      el.innerHTML = '<p style="padding:14px;color:var(--muted);font-size:12.5px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Aucune suggestion IA correspondant aux filtres actuels.</p>';
      return;
    }

    el.innerHTML = `<table class="dense-table compact-table"><thead><tr>
      <th style="width:32px;text-align:center;"><input type="checkbox" onchange="SmartMatch.toggleSelectAll(this.checked)" /></th>
      <th>DP</th><th>Bénéficiaire DP</th><th>Montant DP</th><th>BC(s) Suggéré(s)</th><th>Base BC(s)</th><th>Indices Logiques IA</th><th>Score</th><th>Actions</th>
    </tr></thead><tbody>${
      filtered.map(s => {
        const cls = s.score >= 85 ? 'sm-score-high' : (s.score >= 65 ? 'sm-score-med' : 'sm-score-low');
        const bcHtml = s.bcs.map(b => `<a href="#" onclick="event.preventDefault();window.openBcDetailModal && window.openBcDetailModal('${b.id}');" style="font-weight:700;color:var(--primary);text-decoration:none;">${escapeHtml(b.ref)}</a> <small class="muted">(${escapeHtml((b.supplierName || '').slice(0, 22))} · ${formatMoney(b.amountTTC || b.amount, 'DZD')})</small>`).join('<br>');
        const idsJson = JSON.stringify(s.bcs.map(b => b.id)).replace(/"/g, '&quot;');
        const tagsHtml = (s.reasons || []).map(r => `<span class="sm-reason-tag">${escapeHtml(r)}</span>`).join('');
        const diffHtml = s.diff <= 5 ? '<span style="color:#059669;font-weight:700;font-size:11px;">✓ Écart 0</span>' : `<span style="color:#d97706;font-size:11px;">Δ ${formatMoney(s.diff, 'DZD')}</span>`;
        const checked = this._selectedKeys.has(s.key) ? 'checked' : '';
        return `<tr>
          <td style="text-align:center;"><input type="checkbox" class="sm-row-chk" value="${escapeHtml(s.key)}" ${checked} onchange="SmartMatch.toggleRow('${escapeHtml(s.key)}', this.checked)" /></td>
          <td><strong>${escapeHtml(s.dp.paymentRef || '—')}</strong><div style="font-size:10.5px;color:var(--muted);">${escapeHtml(formatDate(s.dp.requestDate))}</div></td>
          <td>${escapeHtml(s.dp.beneficiary || '—')}</td>
          <td style="font-weight:700;white-space:nowrap;">${formatMoney(s.dp.amount, 'DZD')}</td>
          <td>${bcHtml} ${s.isMulti ? `<span class="badge bg-primary text-white" style="font-size:10px;">Lot ${s.bcs.length} BCs</span>` : ''}</td>
          <td style="font-weight:700;white-space:nowrap;">${formatMoney(s.totalBcAmt, 'DZD')}<br>${diffHtml}</td>
          <td>${tagsHtml}</td>
          <td><span class="sm-match-score ${cls}">${s.score}%</span></td>
          <td><div style="display:flex;gap:4px;flex-wrap:nowrap;">
            <button type="button" class="btn btn-soft btn-compact" onclick="SmartMatch.confirmLink('${s.dp.id}', JSON.parse('${idsJson}'), false, true)" title="Lier DP et BC(s)">🔗 Lier</button>
            <button type="button" class="btn btn-primary btn-compact" style="background:#059669;border-color:#059669;" onclick="SmartMatch.confirmLink('${s.dp.id}', JSON.parse('${idsJson}'), true, true)" title="Lier et marquer Payé">✓ Lier &amp; Payé</button>
            <button type="button" class="btn btn-ghost btn-compact" onclick="SmartMatch.markDpDirect('${s.dp.id}')" title="Classer en dépense directe sans BC">⚡</button>
            <button type="button" class="btn btn-ghost btn-compact" style="color:#dc2626;" onclick="SmartMatch.ignoreSuggestion('${escapeHtml(s.key)}')" title="Ignorer cette suggestion">✕</button>
          </div></td>
        </tr>`;
      }).join('')
    }</tbody></table>`;
  },
  renderUnlinkedBcs(bcs) {
    const el = document.getElementById('smUnlinkedBcTable');
    if (!el) return;
    if (!bcs.length) { el.innerHTML = '<p style="padding:14px;color:var(--muted);font-size:12.5px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Aucun BC en attente de DP.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Réf. BC</th><th>Fournisseur</th><th>Montant TTC</th><th>Jours</th><th></th></tr></thead><tbody>${
      bcs.slice(0, 40).map(b => {
        const days = b.date ? Math.round((Date.now() - new Date(b.date)) / 86400000) : '-';
        const col = typeof days === 'number' && days > 30 ? '#dc2626' : typeof days === 'number' && days > 15 ? '#d97706' : 'var(--muted)';
        return `<tr><td><strong>${escapeHtml(b.ref || '-')}</strong></td><td>${escapeHtml(b.supplierName || '-')}</td><td style="font-variant-numeric:tabular-nums;">${formatMoney(b.amountTTC || b.amount, 'DZD')}</td><td style="color:${col};font-weight:700;">${days}j</td><td><button type="button" class="btn btn-ghost btn-compact" onclick="window.openBcDetailModal && window.openBcDetailModal('${b.id}')" title="Examiner BC">👁️</button></td></tr>`;
      }).join('')
    }</tbody></table>`;
  },

  renderUnlinkedDps(dps) {
    const el = document.getElementById('smUnlinkedDpTable');
    if (!el) return;
    if (!dps.length) { el.innerHTML = '<p style="padding:14px;color:var(--muted);font-size:12.5px;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Toutes les DPs sont rapprochées.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Réf. DP</th><th>Bénéficiaire</th><th>Montant</th><th></th></tr></thead><tbody>${
      dps.slice(0, 40).map(d => `<tr><td><strong>${escapeHtml(d.paymentRef || '-')}</strong></td><td>${escapeHtml(d.beneficiary || '-')}</td><td style="font-variant-numeric:tabular-nums;">${formatMoney(d.amount, 'DZD')}</td><td><button type="button" class="btn btn-ghost btn-compact" onclick="window.ApproNextGen && ApproNextGen.openLinkingModal('${d.id}')" title="Lier DP">🔗</button></td></tr>`).join('')
    }</tbody></table>`;
  },

  exportReport() {
    const cache = window.LogicalMatchEngine._ensureCache();
    const headers = ['Réf DP', 'Date DP', 'Bénéficiaire', 'Montant DP', 'BC(s) Suggéré(s)', 'Total BC(s)', 'Écart DZD', 'Score IA (%)', 'Indices'];
    const lines = [headers.join(';')];
    cache.suggestions.forEach(s => {
      const cols = [
        s.dp.paymentRef || '', s.dp.requestDate || '', s.dp.beneficiary || '', s.dp.amount || 0,
        s.bcs.map(b => b.ref).join(' + '), s.totalBcAmt || 0, Math.round(s.diff || 0), s.score, (s.reasons || []).join(' | ')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cols.join(';'));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Rapprochement_IA_DP_BC_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
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
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
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
  bc.updatedAt = nowIso();
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }
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
      const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
      if (root && root.state && Array.isArray(root.state.bcRecords)) {
        return { storageKey: 'suivi_linked_v30', suiviState: root.state, bcRecords: root.state.bcRecords };
      }
      const keys = ['suivi_linked_v30'];
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
        if (Array.isArray(suiviState.bcRecords)) {
          bcRecords = suiviState.bcRecords;
        } else if (Array.isArray(suiviState)) {
          bcRecords = suiviState;
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
          if (!bc.goodsReceivedDate && bc.type !== 'service') {
            bc.goodsReceivedDate = String(ingestedAt || '').slice(0, 10);
          }
          const isPaid = !!(bc.status === 'livre_paye' || bc.status === 'paye' || bc.paymentStatus === 'paye' || bc.paymentRef || bc.dpRef || bc.paymentPaidDate || /pay[eé]/i.test(String(bc.remarques || '')));
          if (bc.status !== 'clos' && bc.status !== 'cloture') {
            bc.status = isPaid ? 'livre_paye' : 'receptionne';
          }
          return true;
        }
        return false;
      };

      const keys = ['suivi_linked_v30'];
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


/* === APP ENHANCEMENTS (MERGED) === */

/**
 * app-enhancements.js
 * Extended functionality loaded after app.js and data-preload.js
 */

// 1. STANDARDIZED DEPARTMENTS & AUTO-MIGRATION (6 EXCLUSIVE SERVICES)
const STANDARDIZED_DEPARTMENTS = [
  'Direction Générale',
  'Maintenance & Parc',
  'Approvisionnements',
  'Exploitation',
  'Finances & Comptabilité',
  'Magasin Central'
];
window.STANDARDIZED_DEPARTMENTS = STANDARDIZED_DEPARTMENTS;

function normalizeDepartment(dept, supplierName = '', requester = '') {
  const d = String(dept || '').trim();
  const dLower = d.toLowerCase();
  const s = String(supplierName || '').trim().toLowerCase();
  const r = String(requester || '').trim().toLowerCase();
  const combined = `${dLower} ${s} ${r}`;

  if (STANDARDIZED_DEPARTMENTS.includes(d)) return d;

  // 1. Direction Générale
  if (dLower.includes('direction') || dLower.includes('général') || dLower.includes('general') || dLower === 'dg' || combined.includes('direction générale') || combined.includes('direction generale')) {
    return 'Direction Générale';
  }
  // 2. Finances & Comptabilité
  if (dLower.includes('compta') || dLower.includes('financ') || combined.includes('banque') || combined.includes('cpa') || combined.includes('bna') || combined.includes('bea') || combined.includes('notaire') || combined.includes('commissaire')) {
    return 'Finances & Comptabilité';
  }
  // 3. Approvisionnements
  if (dLower.includes('appro') || dLower.includes('achat') || combined.includes('approvisionnement')) {
    return 'Approvisionnements';
  }
  // 4. Magasin Central
  if (dLower.includes('magasin') || dLower.includes('stock') || combined.includes('inventaire') || combined.includes('outillage')) {
    return 'Magasin Central';
  }
  // 5. Exploitation
  if (dLower.includes('operation') || dLower.includes('opération') || dLower.includes('exploit') || combined.includes('logistique') || combined.includes('manutention') || combined.includes('fret')) {
    return 'Exploitation';
  }
  // 6. Maintenance & Parc (Default for transport, fleet, parts, repair, oils, tyres, etc.)
  if (dLower.includes('transport') || dLower.includes('parc') || dLower.includes('maint') || dLower.includes('garage') || dLower.includes('atelier') ||
      combined.includes('truck') || combined.includes('oil') || combined.includes('naftal') || combined.includes('petro') ||
      combined.includes('sebouba') || combined.includes('pneu') || combined.includes('filtre') || combined.includes('reparation') ||
      combined.includes('vidange')) {
    return 'Maintenance & Parc';
  }

  return 'Maintenance & Parc';
}
window.normalizeDepartment = normalizeDepartment;

function getDepartmentBadge(dept) {
  const d = normalizeDepartment(dept);
  const colorMap = {
    'Direction Générale': { bg: 'rgba(136, 19, 55, 0.12)', text: '#881337', border: 'rgba(136, 19, 55, 0.28)', icon: 'fa-crown' },
    'Maintenance & Parc': { bg: 'rgba(37, 99, 235, 0.12)', text: '#1d4ed8', border: 'rgba(37, 99, 235, 0.28)', icon: 'fa-wrench' },
    'Approvisionnements': { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284c7', border: 'rgba(2, 132, 199, 0.28)', icon: 'fa-shopping-cart' },
    'Exploitation': { bg: 'rgba(79, 70, 229, 0.12)', text: '#4f46e5', border: 'rgba(79, 70, 229, 0.28)', icon: 'fa-route' },
    'Finances & Comptabilité': { bg: 'rgba(13, 148, 136, 0.12)', text: '#0d9488', border: 'rgba(13, 148, 136, 0.28)', icon: 'fa-coins' },
    'Magasin Central': { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed', border: 'rgba(124, 58, 237, 0.28)', icon: 'fa-warehouse' }
  };
  const style = colorMap[d] || { bg: 'rgba(148, 163, 184, 0.15)', text: '#475569', border: 'rgba(148, 163, 184, 0.35)', icon: 'fa-building' };
  return `<span class="dept-pill dept-badge" style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:6px;background:${style.bg};color:${style.text};border:1px solid ${style.border};white-space:nowrap;"><i class="fas ${style.icon}" style="font-size:0.7rem;"></i>${d}</span>`;
}
window.getDepartmentBadge = getDepartmentBadge;

const DEPT_MAP = {
  'MAGHREB TRUCK': 'Maintenance & Parc',
  'BPP OIL': 'Maintenance & Parc',
  'BPPOIL': 'Maintenance & Parc',
  'NAFTAL': 'Maintenance & Parc',
  'PETRO BARAKA': 'Maintenance & Parc',
  'SEBOUBA': 'Maintenance & Parc',
};

function autoDept(supplierName) {
  return normalizeDepartment('', supplierName);
}

// 2. Override normalizeBcRecord to add new fields and enforce standardized department
const _baseNormalizeBcRecord = window.normalizeBcRecord;
window.normalizeBcRecord = function(row = {}) {
  const base = _baseNormalizeBcRecord(row);
  const dept = normalizeDepartment(row.department || base.department, row.supplierName || base.supplierName, row.requester || base.requester);
  return {
    ...base,
    tva: Number(row.tva ?? base.tva ?? 0) || 0,
    remise: Number(row.remise ?? base.remise ?? 0) || 0,
    transport: Number(row.transport ?? base.transport ?? 0) || 0,
    timbre: Number(row.timbre ?? base.timbre ?? 0) || 0,
    department: dept,
    requester: String(row.requester || base.requester || dept).trim(),
    remarques: String(row.remarques ?? base.remarques ?? '').trim(),
    subfolder: String(row.subfolder ?? base.subfolder ?? '').trim(),
  };
};

// 3. Inject PRELOAD_DATA into state if available (optional — app works without it)
(function injectPreloadData() {
  if (state.suppliers) {
    state.suppliers = state.suppliers.map(s => typeof s === "string" ? { id: "sup_" + Math.random().toString(36).substr(2, 6), name: s } : s);
  }
  if (state.requesters) {
    state.requesters = state.requesters.map(r => typeof r === "string" ? { id: "req_" + Math.random().toString(36).substr(2, 6), name: r } : r);
  }
  const SUIVI_DATA_VERSION = 'v2026_11_dp_fix';
  try {
    localStorage.removeItem('suivi_reset_v15');
    localStorage.removeItem('suivi_compact_v20');
    localStorage.removeItem('suivi_local_v12');
    localStorage.removeItem('suivi_local_v11');
    if (localStorage.getItem('suivi_data_version') !== SUIVI_DATA_VERSION) {
      localStorage.removeItem('suivi-achats-state');
      localStorage.removeItem('suivi_achats_v3');
      localStorage.removeItem('sde_suivi_state');
      localStorage.removeItem('sde_suivi_cache');
      localStorage.setItem('suivi_data_version', SUIVI_DATA_VERSION);
    }
  } catch (e) {}

  const preload = window.PRELOAD_DATA || window.__SUIVI_PRELOAD__ || null;
  if (!preload || !Array.isArray(preload.bcRecords)) {
    (state.bcRecords || []).forEach(rec => {
      rec.department = normalizeDepartment(rec.department, rec.supplierName, rec.requester);
      if (!rec.requester) rec.requester = rec.department;
    });
    return;
  }

  const preloadRecords = preload.bcRecords;
  if (!Array.isArray(state.bcRecords)) {
    state.bcRecords = [];
  }
  if (preloadRecords.length > 0) {
    const existingByKey = new Map();
    state.bcRecords.forEach((r, idx) => {
      const k = getBcDedupKey(r.ref, r) || r.id;
      if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
    });
    preloadRecords.forEach(preloadRec => {
      const normPre = window.normalizeBcRecord(preloadRec);
      const k = getBcDedupKey(normPre.ref, normPre) || normPre.id;
      if (k && existingByKey.has(k)) {
        const idx = existingByKey.get(k);
        state.bcRecords[idx] = mergeBcPreservingStatus(state.bcRecords[idx], normPre, false);
      } else {
        state.bcRecords.push(normPre);
        existingByKey.set(k, state.bcRecords.length - 1);
      }
    });
  }

  // Guarantee migration on all bcRecords
  state.bcRecords.forEach(r => {
    r.department = normalizeDepartment(r.department, r.supplierName, r.requester);
    if (!r.requester) r.requester = r.department;
  });
  
  // Merge suppliers and filter out any bogus Schmitz Cargobull entry
  if (preload.suppliers) {
    const sSet = new Set();
    const cleanList = [];
    [...(state.suppliers || []), ...preload.suppliers].forEach(s => {
      const sName = typeof s === 'object' ? s.name : s;
      if (sName && !/schmi/i.test(sName) && !sSet.has(sName)) {
        sSet.add(sName);
        cleanList.push(typeof s === "object" ? s : { id: "sup_" + Math.random().toString(36).substr(2, 6), name: sName });
      }
    });
    state.suppliers = cleanList;
  }

  // Merge requesters
  if (preload.requesters) {
    const rSet = new Set(state.requesters.map(r => typeof r === 'object' ? r.name : r));
    preload.requesters.forEach(r => {
      const rName = typeof r === 'object' ? r.name : r;
      if (!rSet.has(rName)) state.requesters.push(typeof r === "object" ? r : { id: "req_" + Math.random().toString(36).substr(2, 6), name: rName });
    });
  }

  // Merge & deduplicate payments canonically (preserving exact unique DPs)
  state.payments = deduplicatePaymentsList([
    ...(Array.isArray(state.payments) ? state.payments : []),
    ...(Array.isArray(preload.payments) ? preload.payments : []),
  ]);

  // Update sequences dynamically from existing records
  state.settings.bcSequence = Math.max(state.settings.bcSequence || 1, highestBcSequence() + 1);
  state.settings.daSequence = Math.max(state.settings.daSequence || 1, highestDaSequence() + 1);

  saveState();
  console.log('[app-enhancements] Loaded ' + state.bcRecords.length + ' BC records and ' + state.payments.length + ' DPs');
})();

// 4. Multi-Select Supplier & Snapshot Retention Filtering Logic
if (!Array.isArray(state.ui.selectedSuppliers)) {
  state.ui.selectedSuppliers = [];
}
state.ui.isFilteredActive = false;
state.ui.activeFilteredIds = null;

function getSelectedSuppliers() {
  if (!Array.isArray(state.ui.selectedSuppliers)) {
    state.ui.selectedSuppliers = [];
  }
  return state.ui.selectedSuppliers;
}

function updateSupplierTriggerLabel() {
  const labelEl = $('supplierMultiSelectLabel');
  if (!labelEl) return;
  const sel = getSelectedSuppliers();
  const total = state.ui.allSuppliersList ? state.ui.allSuppliersList.length : 0;
  if (!sel || sel.length === 0 || (total > 0 && sel.length === total)) {
    labelEl.textContent = 'Fournisseurs : Tous';
    labelEl.title = 'Tous les fournisseurs';
  } else if (sel.length === 1) {
    const first = sel[0];
    labelEl.textContent = first.length > 22 ? first.substring(0, 20) + '...' : first;
    labelEl.title = first;
  } else if (sel.length === 2) {
    labelEl.textContent = `${sel[0].substring(0, 10)}..., ${sel[1].substring(0, 10)}...`;
    labelEl.title = sel.join(', ');
  } else {
    labelEl.textContent = `Fournisseurs (${sel.length})`;
    labelEl.title = sel.join(', ');
  }
}

function refreshSupplierMultiSelectOptions() {
  const sups = [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  state.ui.allSuppliersList = sups;
  
  const listEl = $('supplierMultiSelectList');
  if (!listEl) return;
  
  const currentSel = getSelectedSuppliers();
  const searchVal = normalizeText($('supplierMultiSelectSearch')?.value || '');
  
  listEl.innerHTML = '';
  sups.forEach(s => {
    const isChecked = currentSel.includes(s);
    const isVisible = !searchVal || normalizeText(s).includes(searchVal);
    
    const label = document.createElement('label');
    label.className = 'multi-select-item';
    if (!isVisible) label.style.display = 'none';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = s;
    cb.checked = isChecked;
    
    cb.addEventListener('change', () => {
      const sel = getSelectedSuppliers();
      if (cb.checked) {
        if (!sel.includes(s)) {
          sel.push(s);
          state.ui.selectedSuppliers = sel;
        }
      } else {
        state.ui.selectedSuppliers = sel.filter(x => x !== s);
      }
      updateSupplierTriggerLabel();
      resetFollowupPage();
      renderFollowupTable();
    });
    
    const span = document.createElement('span');
    span.textContent = s;
    span.title = s;
    
    label.appendChild(cb);
    label.appendChild(span);
    listEl.appendChild(label);
  });
  
  updateSupplierTriggerLabel();
}

function isDpPaidStatus(dp) {
  if (!dp || dp.excluded) return false;
  const st = String(dp.status || '').toLowerCase();
  if (st === 'en_attente' || st === 'programme' || st === 'en_cours' || st === 'annule' || st === 'rejete') return false;
  return st === 'paye' || st === 'paid' || Boolean(dp.paidDate);
}
window.isDpPaidStatus = isDpPaidStatus;

function getLinkedDpsForBc(bc) {
  if (!bc || !Array.isArray(state.payments)) return [];
  const bcRefNorm = String(bc.ref || '').trim().toUpperCase();
  const bcDpCanonical = canonicalizeDpRef(bc.dpRef || bc.paymentRef || '', bc.date);
  return state.payments.filter(dp => {
    if (!dp || dp.isDirect || dp.excluded) return false;
    if (dp.bcId && dp.bcId === bc.id) return true;
    if (Array.isArray(dp.linkedBcIds) && dp.linkedBcIds.includes(bc.id)) return true;
    if (bcRefNorm && Array.isArray(dp.linkedBcRefs) && dp.linkedBcRefs.some(r => String(r || '').trim().toUpperCase() === bcRefNorm)) return true;
    const dpCanonical = canonicalizeDpRef(dp.paymentRef || '', dp.requestDate || dp.paidDate);
    if (bcDpCanonical && dpCanonical && bcDpCanonical === dpCanonical) return true;
    if (bc.dpRef && dp.paymentRef && String(dp.paymentRef).trim() === String(bc.dpRef).trim()) return true;
    if (bc.paymentRef && dp.paymentRef && String(dp.paymentRef).trim() === String(bc.paymentRef).trim()) return true;
    return false;
  });
}
window.getLinkedDpsForBc = getLinkedDpsForBc;

function isBcActuallyPaid(row) {
  if (!row) return false;
  if (row.status === 'livre_paye' || row.status === 'paye' || row.paymentStatus === 'paye') return true;
  const linkedDps = getLinkedDpsForBc(row);
  if (linkedDps.length > 0) {
    if (linkedDps.some(isDpPaidStatus)) return true;
    if (row.paymentStatus === 'en_attente') return false;
    return Boolean(row.paymentPaidDate) || /pay[eé]/i.test(String(row.remarques || ''));
  }
  if (row.paymentStatus === 'en_attente') return false;
  return Boolean(row.paymentPaidDate || row.paymentRef || row.dpRef || /pay[eé]/i.test(String(row.remarques || '')));
}
window.isBcActuallyPaid = isBcActuallyPaid;

function computeFreshFilteredBcRecords() {
  const q = normalizeText($('followupSearch')?.value || '');
  const validation = $('followupValidationFilter')?.value || 'all';
  const status = $('followupStatusFilter')?.value || 'all';
  const type = $('followupTypeFilter')?.value || 'all';
  const importance = $('followupImportanceFilter')?.value || 'all';
  const requester = $('followupRequesterFilter')?.value || 'all';
  const dept = $('followupDeptFilter')?.value || 'all';
  const dateFrom = $('followupDateFrom')?.value || '';
  const dateTo = $('followupDateTo')?.value || '';
  const sortField = $('followupSortField')?.value || state.ui.followupSortField || 'date';
  const sortDir = $('followupSortDir')?.value || state.ui.followupSortDir || 'desc';
  state.ui.followupSortField = sortField;
  state.ui.followupSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;

  const selList = getSelectedSuppliers();
  const allSupsCount = state.ui.allSuppliersList ? state.ui.allSuppliersList.length : 0;
  const hasSupplierFilter = selList.length > 0 && (allSupsCount === 0 || selList.length < allSupsCount);

  return state.bcRecords
    .filter((row) => {
      if (validation === 'validated' && row.daStatus !== 'validated') return false;
      if (validation === 'draft' && row.daStatus === 'validated') return false;
      if (importance !== 'all' && typeof window.ApproNextGen !== 'undefined' && window.ApproNextGen.classifyBcImportance) {
        if (window.ApproNextGen.classifyBcImportance(row) !== importance) return false;
      }
      if (status !== 'all') {
        const isPaid = isBcActuallyPaid(row);
        const isDelivered = ['livre_paye', 'livre', 'receptionne', 'service_fait', 'clos', 'cloture'].includes(row.status) || Boolean(row.goodsReceivedDate || row.serviceDoneDate);
        const linkedDps = getLinkedDpsForBc(row);
        const hasDp = linkedDps.length > 0 || Boolean(row.dpRef || row.paymentRef);

        if (status === 'livre_paye' && !(isDelivered && isPaid)) return false;
        if (status === 'livre' && !isDelivered) return false;
        if ((status === 'paye' || status === 'paye_all') && !isPaid) return false;
        if (status === 'non_paye' && isPaid) return false;
        if (status === 'avec_dp' && !hasDp) return false;
        if (status === 'sans_dp' && hasDp) return false;
        if (status === 'ia_candidat') {
          if (hasDp || isPaid) return false;
          const cands = (window.LogicalMatchEngine && window.LogicalMatchEngine.getLogicalDpCandidatesForBc) ? window.LogicalMatchEngine.getLogicalDpCandidatesForBc(row) : [];
          if (!cands.length || cands[0].score < 45) return false;
        }
        if (status === 'anomalie') {
          const amt = Number(row.amountTTC || row.amount || 0);
          const sup = String(row.supplierName || '').trim();
          if (amt > 0 && sup && sup !== '—') return false;
        }
        if (status === 'non_livre' && isDelivered) return false;
        if (status === 'transmis' && (isDelivered || isPaid)) return false;
        if (status === 'clos' && row.status !== 'clos' && row.status !== 'cloture') return false;
        if (!['livre_paye', 'livre', 'paye', 'paye_all', 'non_paye', 'avec_dp', 'sans_dp', 'ia_candidat', 'anomalie', 'non_livre', 'transmis', 'clos'].includes(status) && row.status !== status) return false;
      }
      if (type !== 'all' && row.type !== type) return false;
      if (hasSupplierFilter && !selList.includes(row.supplierName)) return false;
      if (requester !== 'all' && row.requester !== requester) return false;
      if (dept !== 'all' && (row.department || '') !== dept) return false;
      if (dateFrom && String(row.date || '') < dateFrom) return false;
      if (dateTo && String(row.date || '') > dateTo) return false;
      if (!q) return true;
      const itemsTxt = Array.isArray(row.lineItems) ? row.lineItems.map(it => it.description || it.designation || '').join(' ') : '';
      const hay = normalizeText([row.ref, row.daRef, row.dpRef, row.paymentRef, row.supplierName, row.requester, row.description, row.paymentTerms, row.comments, row.notes, row.department, row.remarques, itemsTxt].join(' | '));
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

// Override filteredBcRecords: when isFilteredActive is true, keep exactly the active records!
window.filteredBcRecords = function() {
  const sortField = $('followupSortField')?.value || state.ui.followupSortField || 'date';
  const sortDir = $('followupSortDir')?.value || state.ui.followupSortDir || 'desc';
  state.ui.followupSortField = sortField;
  state.ui.followupSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;

  if (state.ui.isFilteredActive && Array.isArray(state.ui.activeFilteredIds)) {
    const idSet = new Set(state.ui.activeFilteredIds);
    return state.bcRecords
      .filter(row => idSet.has(row.id))
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

  return computeFreshFilteredBcRecords();
};

window.applyFollowupFilter = function() {
  state.ui.isFilteredActive = false;
  state.ui.activeFilteredIds = null;
  const fresh = computeFreshFilteredBcRecords();
  state.ui.activeFilteredIds = fresh.map(r => r.id);
  state.ui.isFilteredActive = true;
  if (typeof resetFollowupPage === 'function') resetFollowupPage();
  if (typeof renderFollowupTable === 'function') renderFollowupTable();
  const count = fresh.length;
  showToast(`Filtre appliqué : ${count} bon${count > 1 ? 's' : ''} de commande affiché${count > 1 ? 's' : ''}`);
};

const _baseResetFollowupFilters = window.resetFollowupFilters;
window.resetFollowupFilters = function() {
  state.ui.isFilteredActive = false;
  state.ui.activeFilteredIds = null;
  state.ui.selectedSuppliers = [];
  
  if (typeof _baseResetFollowupFilters === 'function') {
    _baseResetFollowupFilters();
  }
  
  if ($('followupDeptFilter')) $('followupDeptFilter').value = 'all';
  
  const checkboxes = document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSupplierTriggerLabel();

  if (typeof resetFollowupPage === 'function') resetFollowupPage();
  if (typeof renderFollowupTable === 'function') renderFollowupTable();
};

// 5. Override refreshFollowupFilterOptions to also populate department filter and supplier multi-select
const _baseRefreshFollowupFilterOptions = window.refreshFollowupFilterOptions;
window.refreshFollowupFilterOptions = function() {
  _baseRefreshFollowupFilterOptions();
  
  const depts = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
  const deptSelect = $('followupDeptFilter');
  if (deptSelect) {
    const currentDept = deptSelect.value;
    deptSelect.innerHTML = '<option value="all">Toutes les structures</option>';
    depts.forEach(d => {
      deptSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
    if (depts.includes(currentDept)) deptSelect.value = currentDept;
  }
  
  const kpiDeptFilter = $('kpiDeptFilter');
  if (kpiDeptFilter) {
    const currentKpiDept = kpiDeptFilter.value;
    kpiDeptFilter.innerHTML = '<option value="all">Toutes les structures</option>';
    depts.forEach(d => {
      kpiDeptFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
    if (depts.includes(currentKpiDept)) kpiDeptFilter.value = currentKpiDept;
  }

  refreshSupplierMultiSelectOptions();
};

// 6. Override renderFollowupTable — summary cards, page-size, fixed actions
window.renderFollowupTable = function() {
  const tbody = $('followupTableBody');
  if (!tbody) return;
  if ((!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0) {
    state.bcRecords = window.PRELOAD_DATA.bcRecords.map(normalizeBcRecord);
    if (typeof saveState === 'function') saveState();
  }
  
  let rows = filteredBcRecords();
  const totalRows = rows.length;
  
  // --- Summary cards above the table ---
  let summaryBar = document.getElementById('followupSummaryBar');
  if (!summaryBar) {
    summaryBar = document.createElement('div');
    summaryBar.id = 'followupSummaryBar';
    summaryBar.className = 'followup-summary-bar';
    const tableShell = tbody.closest('.table-shell') || tbody.closest('.panel');
    if (tableShell) tableShell.parentNode.insertBefore(summaryBar, tableShell);
  }
  const totalTTC = rows.reduce((s, r) => s + (Number(r.amountTTC || r.amount) || 0), 0);
  const totalHT = rows.reduce((s, r) => s + (Number(r.amountHT) || 0), 0);
  const isRowPaid = (r) => isBcActuallyPaid(r);
  const isRowDelivered = (r) => ['livre_paye', 'livre', 'receptionne', 'service_fait', 'clos', 'cloture'].includes(r.status) || Boolean(row_deliv(r));
  function row_deliv(r) { return r.goodsReceivedDate || r.serviceDoneDate; }
  const totalCreance = rows.filter(r => !isRowPaid(r)).reduce((s, r) => s + (Number(r.amountTTC || r.amount) || 0), 0);
  const achatCount = rows.filter(r => r.type === 'achat').length;
  const serviceCount = rows.filter(r => r.type === 'service').length;
  const deliveredCount = rows.filter(isRowDelivered).length;
  const paidCount = rows.filter(isRowPaid).length;
  const supplierCount = new Set(rows.map(r => r.supplierName).filter(Boolean)).size;
  summaryBar.innerHTML = `
    <div class="summary-card" title="${totalRows} Bons de Commande"><div class="summary-value">${totalRows}</div><div class="summary-label">BC filtrés</div></div>
    <div class="summary-card" title="${formatMoney(totalTTC, 'DZD')}"><div class="summary-value">${formatMoney(totalTTC, 'DZD')}</div><div class="summary-label">Total TTC</div></div>
    <div class="summary-card" style="border-left:3px solid #ef4444;" title="${formatMoney(totalCreance, 'DZD')}"><div class="summary-value" style="color:#ef4444;">${formatMoney(totalCreance, 'DZD')}</div><div class="summary-label">Créances Dues</div></div>
    <div class="summary-card"><div class="summary-value">${achatCount} / ${serviceCount}</div><div class="summary-label">Achats / Services</div></div>
    <div class="summary-card"><div class="summary-value">${deliveredCount}</div><div class="summary-label">Livrés</div></div>
    <div class="summary-card" style="border-left:3px solid #059669;"><div class="summary-value" style="color:#059669;">${paidCount}</div><div class="summary-label">Payés</div></div>
    <div class="summary-card"><div class="summary-value">${supplierCount}</div><div class="summary-label">Fournisseurs</div></div>
  `;

  // --- Pagination with page-size selector ---
  const pageSize = state.ui.followupPageSize !== undefined ? state.ui.followupPageSize : 25;
  const usePaging = pageSize > 0;
  const totalPages = usePaging ? (Math.ceil(totalRows / pageSize) || 1) : 1;
  if (state.ui.followupPage > totalPages) state.ui.followupPage = totalPages;
  if (state.ui.followupPage < 1) state.ui.followupPage = 1;
  
  const startIndex = usePaging ? (state.ui.followupPage - 1) * pageSize : 0;
  const endIndex = usePaging ? Math.min(startIndex + pageSize, totalRows) : totalRows;
  const pageRows = rows.slice(startIndex, endIndex);
  
  // --- Top Pagination / Scroll ---
  let topPagination = document.getElementById('followupTopPagination');
  if (!topPagination) {
    topPagination = document.createElement('div');
    topPagination.id = 'followupTopPagination';
    topPagination.className = 'pagination-controls';
    topPagination.style.justifyContent = 'space-between';
    topPagination.style.marginBottom = '0.5rem';
    topPagination.style.padding = '0.2rem 0';
    summaryBar.parentNode.insertBefore(topPagination, summaryBar.nextSibling);
  }
  
  let topPagHtml = `<div style="display:flex;gap:0.4rem;align-items:center;">
    <button class="btn btn-ghost top-scroll-left" title="Défiler à gauche">← Défiler</button>
    <button class="btn btn-ghost top-scroll-right" title="Défiler à droite">Défiler →</button>
  </div>
  <div style="display:flex;gap:0.4rem;align-items:center;">
    <span class="pag-info">${usePaging && totalPages > 1 ? (startIndex+1) + '–' + endIndex + ' / ' + totalRows : totalRows + ' résultats'}</span>
    <select id="followupTopPageSize" class="page-size-select" title="Lignes par page">
      <option value="10" ${pageSize===10?'selected':''}>10</option>
      <option value="25" ${pageSize===25?'selected':''}>25</option>
      <option value="50" ${pageSize===50?'selected':''}>50</option>
      <option value="100" ${pageSize===100?'selected':''}>100</option>
      <option value="0" ${pageSize===0||pageSize>100?'selected':''}>Tout</option>
    </select>
  </div>`;
  topPagination.innerHTML = topPagHtml;
  
  const topPageSizeSelect = topPagination.querySelector('#followupTopPageSize');
  if (topPageSizeSelect) {
    topPageSizeSelect.addEventListener('change', () => {
      state.ui.followupPageSize = parseInt(topPageSizeSelect.value);
      state.ui.followupPage = 1;
      renderFollowupTable();
    });
  }
  const btnLeft = topPagination.querySelector('.top-scroll-left');
  const btnRight = topPagination.querySelector('.top-scroll-right');
  const tableShellTop = tbody.closest('.table-shell');
  if (btnLeft && tableShellTop) {
    btnLeft.addEventListener('click', () => {
      tableShellTop.scrollBy({ left: -300, behavior: 'smooth' });
    });
  }
  if (btnRight && tableShellTop) {
    btnRight.addEventListener('click', () => {
      tableShellTop.scrollBy({ left: 300, behavior: 'smooth' });
    });
  }

  tbody.innerHTML = '';
  if (pageRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:2.5rem;color:var(--muted);"><i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.5;"></i>Aucun bon de commande trouvé. Cliquez sur <strong>➕ Nouveau Bon de Commande</strong> pour en créer un.</td></tr>';
  } else {
    pageRows.forEach(row => {
      const delay = computeDelay(row);
      const actual = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate || '') : (row.goodsReceivedDate || row.serviceDoneDate || '');
      let remarquesTrunc = row.remarques || '';
      if (remarquesTrunc.length > 30) remarquesTrunc = remarquesTrunc.substring(0, 30) + '…';
      const deptHtml = getDepartmentBadge(row.department || row.requester);
      
      const isDaValidated = row.daStatus === 'validated';
      const daDateStr = row.daValidatedAt ? formatDate(row.daValidatedAt) : '';
      const daHtml = isDaValidated
        ? `<div><strong>${escapeHtml(row.daRef || 'DA validée')}</strong><span class="status-pill status-valide" style="font-size:0.68rem;padding:1px 5px;display:block;margin-top:2px;">✓ ${escapeHtml(daDateStr || 'Validée')}</span></div>`
        : `<div><span class="muted" style="font-size:0.8rem;">${escapeHtml(row.daRef || '—')}</span><span class="status-pill status-da-pending" style="font-size:0.68rem;padding:1px 5px;display:block;margin-top:2px;">En attente</span></div>`;
      
      let delayHtml = '';
      if (actual) {
        let daysDiff = '';
        if (row.date) {
          const t1 = new Date(row.date).getTime();
          const t2 = new Date(actual).getTime();
          if (!isNaN(t1) && !isNaN(t2)) {
            const d = Math.round((t2 - t1) / (1000 * 3600 * 24));
            daysDiff = d >= 0 ? `+${d}j` : `${d}j`;
          }
        }
        delayHtml = `<div><strong>${escapeHtml(formatDate(actual))}</strong>${daysDiff ? `<span style="display:inline-block;margin-left:4px;font-size:0.7rem;padding:1px 5px;border-radius:4px;background:rgba(16,185,129,0.15);color:#059669;font-weight:700;">${daysDiff}</span>` : ''}</div>`;
      } else {
        delayHtml = '<span class="muted" style="font-size:0.75rem;">Pas encore</span>';
      }

      let validateDeliverBtn = '';
      if (!isDaValidated) {
        validateDeliverBtn = `<button type="button" class="btn-open-validate-da icon-btn" data-id="${row.id}" title="Valider la DA (définir la date)" aria-label="Valider DA" style="color:#2563eb;background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.25);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span></button>`;
      } else if (!actual) {
        validateDeliverBtn = `<button type="button" class="btn-open-deliver-bc icon-btn" data-id="${row.id}" title="Enregistrer livraison / fin de service" aria-label="Enregistrer livraison" style="color:#0284c7;background:rgba(2,132,199,0.1);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span></button>`;
      } else {
        validateDeliverBtn = `<button type="button" class="btn-open-deliver-bc icon-btn" data-id="${row.id}" title="Livré le ${escapeHtml(formatDate(actual))} (Modifier date)" aria-label="Livré" style="color:#16a34a;background:rgba(22,163,74,0.1);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="m6 9 2 2 4-4" stroke-width="2"/></svg></span></button>`;
      }

      const imp = (typeof ApproNextGen !== 'undefined' && ApproNextGen.classifyBcImportance) ? ApproNextGen.classifyBcImportance(row) : 'normal';
      const impLabel = imp === 'critical' ? '🔴 Critique' : (imp === 'high' ? '🟠 Haute' : '🔵 Standard');
      const impClass = `badge-imp-${imp}`;
      const impBadge = `<span class="badge-importance ${impClass}" style="margin-top:3px;display:inline-block;">${impLabel}</span>`;
      const stockBadge = (typeof getBcStockBadge === 'function') ? getBcStockBadge(row) : ((typeof window !== 'undefined' && typeof window.getBcStockBadge === 'function') ? window.getBcStockBadge(row) : '');

      const isPaid = isBcActuallyPaid(row);
      const isDelivered = ['livre_paye', 'livre', 'receptionne', 'service_fait', 'clos', 'cloture'].includes(row.status) || Boolean(row.goodsReceivedDate || row.serviceDoneDate);
      const linkedDps = getLinkedDpsForBc(row);
      const rawDpRefCandidate = (linkedDps[0] && linkedDps[0].paymentRef) || (!/^BC\b/i.test(String(row.dpRef || '').trim()) ? row.dpRef : '') || (!/^BC\b/i.test(String(row.paymentRef || '').trim()) ? row.paymentRef : '') || '';
      const primaryDpRef = canonicalizeDpRef(rawDpRefCandidate, row.date);
      const hasUnpaidDp = linkedDps.length > 0 && !isPaid;
      let dpChipHtml = '';
      if (isPaid && primaryDpRef) {
        const extraCnt = linkedDps.length > 1 ? ` +${linkedDps.length - 1}` : '';
        dpChipHtml = `<span class="bc-dp-chip bc-dp-chip-paid bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="Règlement lié : DP ${escapeHtml(primaryDpRef)} — Cliquer pour ouvrir la revue BC">💳 DP ${escapeHtml(primaryDpRef)}${extraCnt}</span>`;
      } else if (hasUnpaidDp && primaryDpRef) {
        dpChipHtml = `<span class="bc-dp-chip bc-dp-chip-pending bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="DP liée en attente de règlement : ${escapeHtml(primaryDpRef)}">⏳ DP ${escapeHtml(primaryDpRef)} (En attente)</span>`;
      } else if (!isPaid && !primaryDpRef && window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getLogicalDpCandidatesForBc === 'function') {
        const cands = window.LogicalMatchEngine.getLogicalDpCandidatesForBc(row);
        if (cands && cands.length > 0 && cands[0].score >= 45) {
          const top = cands[0];
          dpChipHtml = `<span class="bc-ai-suggest-chip bc-dp-open-btn" data-action="view-bc" data-id="${row.id}" title="DP logique détectée : ${escapeHtml(top.dp.paymentRef || '')} (${escapeHtml(top.dp.beneficiary || '')} · ${formatMoney(top.dp.amount, 'DZD')}) — Cliquer pour vérifier &amp; lier en 1 clic">🤖 DP suggérée (${top.score}%)</span>`;
        }
      }

      let baseStatusPill = '';
      if (row.status === 'clos' || row.status === 'cloture') {
        baseStatusPill = '<span class="status-pill status-cloture" style="background:#475569;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:10.5px;"><i class="fas fa-check-circle" style="font-size:0.68rem;"></i> Clôturé</span>';
        if (isPaid) {
          baseStatusPill += '<span class="status-pill status-paye" style="background:#059669;color:#fff;font-weight:700;font-size:10.5px;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">✓ Payé</span>';
        }
      } else if (isDelivered && isPaid) {
        baseStatusPill = '<span class="status-pill status-livre-paye" style="background:#059669;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:10.5px;"><i class="fas fa-check-double" style="font-size:0.68rem;"></i> Livré &amp; Payé</span>';
      } else if (isDelivered) {
        baseStatusPill = '<span class="status-pill status-livre" style="background:#0284c7;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:10.5px;"><i class="fas fa-truck-ramp-box" style="font-size:0.68rem;"></i> Livré</span>';
      } else if (isPaid) {
        baseStatusPill = '<span class="status-pill status-paye" style="background:#10b981;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:10.5px;"><i class="fas fa-money-bill-wave" style="font-size:0.68rem;"></i> Payé</span>';
      } else {
        baseStatusPill = '<span class="status-pill status-transmis" style="background:#f59e0b;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:10.5px;"><i class="fas fa-paper-plane" style="font-size:0.68rem;"></i> Transmis</span>';
      }
      const statusHtml = `<div class="bc-status-cell-stack" style="display:inline-flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:max-content;">${baseStatusPill}${dpChipHtml}</div>`;

      const isChecked = typeof window !== 'undefined' && window.selectedFollowupBcIds && window.selectedFollowupBcIds.has(row.id);
      const remarquesDisplayHtml = `${remarquesTrunc ? `<div>${escapeHtml(remarquesTrunc)}</div>` : (!dpChipHtml ? '—' : '')}${!remarquesTrunc && dpChipHtml ? `<span style="font-size:11px;color:var(--muted);">${isPaid ? '✓ Payé' : (hasUnpaidDp ? 'DP en attente' : 'À rapprocher')}</span>` : ''}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center;vertical-align:middle;"><input type="checkbox" class="followup-row-cb" data-id="${row.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;" /></td>
        <td title="${escapeHtml(row.ref)}"><strong>${escapeHtml(row.ref)}</strong><div>${impBadge}</div>${stockBadge ? `<div style="margin-top:3px;">${stockBadge}</div>` : ''}</td>
        <td>${daHtml}</td>
        <td style="white-space:nowrap;">${escapeHtml(formatDate(row.date))}</td>
        <td title="${escapeHtml(row.supplierName || '')}">${escapeHtml(row.supplierName || '—')}</td>
        <td title="${escapeHtml(row.requester || '')}">${escapeHtml(row.requester || '—')}</td>
        <td title="${escapeHtml(row.department || row.requester || '')}">${deptHtml}</td>
        <td><span class="badge bg-${row.type === 'service' ? 'info' : 'secondary'} text-white" style="font-size:10.5px;padding:2px 6px;">${escapeHtml(row.type === 'service' ? 'Service' : 'Achat')}</span></td>
        <td class="amount-ht">${escapeHtml(formatMoney(row.amountHT || (row.amountTTC ? Math.round(row.amountTTC / 1.19) : 0), 'DZD'))}</td>
        <td class="amount-ttc"><strong>${escapeHtml(formatMoney(row.amountTTC || row.amount || 0, 'DZD'))}</strong></td>
        <td>${statusHtml}</td>
        <td style="white-space:nowrap;">${delayHtml}</td>
        <td class="remarques-cell" title="${escapeHtml(row.remarques || row.description || '')}">${remarquesDisplayHtml}</td>
        <td class="actions-cell">
          <div class="table-actions icon-actions">
            <button type="button" class="view-bc-btn icon-btn" data-action="view-bc" data-id="${row.id}" title="Revue complète BC &amp; liaison DP" aria-label="Revue complète BC"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/></svg></span></button>
            ${iconActionButton('edit', 'edit-bc', row.id, 'Modifier')}
            ${validateDeliverBtn}
            ${iconActionButton('pay', 'pay-bc', row.id, 'Paiements')}
            ${iconActionButton('delete', 'delete-bc', row.id, 'Supprimer')}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- Pagination with page-size ---
  const paginationEl = $('followupPagination');
  if (paginationEl) {
    let pagHtml = `<div class="pagination-controls">`;
    pagHtml += `<select id="followupPageSize" class="page-size-select" title="Lignes par page">
      <option value="10" ${pageSize===10?'selected':''}>10</option>
      <option value="25" ${pageSize===25?'selected':''}>25</option>
      <option value="50" ${pageSize===50?'selected':''}>50</option>
      <option value="100" ${pageSize===100?'selected':''}>100</option>
      <option value="0" ${pageSize===0||pageSize>100?'selected':''}>Tout</option>
    </select>`;
    if (usePaging && totalPages > 1) {
      pagHtml += `<span class="pag-info">${startIndex+1}–${endIndex} / ${totalRows}</span>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="1" ${state.ui.followupPage<=1?'disabled':''}>«</button>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${state.ui.followupPage-1}" ${state.ui.followupPage<=1?'disabled':''}>‹</button>`;
      const start = Math.max(1, state.ui.followupPage - 2);
      const end = Math.min(totalPages, state.ui.followupPage + 2);
      for (let i = start; i <= end; i++) {
        pagHtml += `<button class="btn ${i===state.ui.followupPage?'btn-primary':'btn-ghost'} pag-btn" data-page="${i}">${i}</button>`;
      }
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${state.ui.followupPage+1}" ${state.ui.followupPage>=totalPages?'disabled':''}>›</button>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${totalPages}" ${state.ui.followupPage>=totalPages?'disabled':''}>»</button>`;
    } else {
      pagHtml += `<span class="pag-info">${totalRows} résultats</span>`;
    }
    pagHtml += '</div>';
    paginationEl.innerHTML = pagHtml;
    
    // Bind page buttons
    paginationEl.querySelectorAll('.pag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.ui.followupPage = parseInt(btn.dataset.page);
        renderFollowupTable();
      });
    });
    // Bind page size
    const pageSizeSelect = $('followupPageSize');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        state.ui.followupPageSize = parseInt(pageSizeSelect.value);
        state.ui.followupPage = 1;
        renderFollowupTable();
      });
    }
  }
  
  const countEl = $('followupCount');
  if (countEl) countEl.textContent = `${totalRows} ligne${totalRows > 1 ? 's' : ''}`;
  
  if (typeof bindTableActions === 'function') bindTableActions();
  
  // Bind view-bc buttons and DP / AI chips
  document.querySelectorAll('.view-bc-btn, .bc-dp-open-btn, .bc-dp-chip, .bc-ai-suggest-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) openBcDetailModal(id);
    });
  });

  if (typeof updateFollowupBulkBar === 'function') updateFollowupBulkBar();
  if (typeof bindFollowupBulkEvents === 'function') bindFollowupBulkEvents();
  if (typeof setupBulkActionButtons === 'function') setupBulkActionButtons();
};

// 7.5 Override injectSortableHeaders to match new columns
const _baseInjectSortableHeaders = window.injectSortableHeaders;
window.injectSortableHeaders = function() {
  // First, do base for payments and stock
  if (typeof _baseInjectSortableHeaders === 'function') {
    _baseInjectSortableHeaders();
  }
  
  // Now explicitly override followup headers (scoped to #followupTable)
  const followupHeaders = document.querySelectorAll('#followupTable thead th');
  if (followupHeaders.length) {
    const map = {
      1: ['ref', 'BC'],
      2: ['daRef', 'DA'],
      3: ['date', 'Date'],
      4: ['supplier', 'Fournisseur'],
      5: ['requester', 'Demandeur'],
      6: ['department', 'Service / Département'],
      7: ['type', 'Type'],
      8: ['amountHT', 'Montant HT'],
      9: ['amount', 'Montant TTC'],
      10: ['status', 'Statut BC'],
      11: ['goodsReceivedDate', 'Réalisation']
    };
    
    // Clear old sort buttons if any, then apply correct ones
    followupHeaders.forEach((th, idx) => {
      if (idx === 0) {
        th.innerHTML = '<input type="checkbox" id="selectAllFollowupBcs" title="Tout sélectionner" style="cursor:pointer; width:16px; height:16px;" />';
      } else if (map[idx]) {
        th.innerHTML = `<button type="button" class="th-sort-btn" data-sort-group="followup" data-sort-field="${map[idx][0]}"><span>${escapeHtml(map[idx][1])}</span><span class="th-sort-indicator" aria-hidden="true">↕</span></button>`;
      } else if (idx === 12) {
        th.textContent = 'Remarques';
      } else if (idx === 13) {
        th.textContent = 'Actions';
      }
    });
  }
};

// 8. Override openBcEditModal to handle new fields
const _baseOpenBcEditModal = window.openBcEditModal;
window.openBcEditModal = function(id) {
  if (typeof _baseOpenBcEditModal === 'function') {
    _baseOpenBcEditModal(id);
  }
  const row = state.bcRecords.find(r => r.id === id);
  if (row) {
    if ($('editBcId')) $('editBcId').value = row.id || '';
    if ($('editBcRef')) $('editBcRef').value = row.ref || '';
    if ($('editBcDaRef')) $('editBcDaRef').value = row.daRef || '';
    if ($('editBcDate')) $('editBcDate').value = row.date || '';
    if ($('editBcSupplier')) $('editBcSupplier').value = row.supplierName || '';
    if ($('editBcAmount')) $('editBcAmount').value = row.amountTTC || row.amount || '';
    if ($('editBcType')) $('editBcType').value = row.type || 'achat';
    if ($('editBcStatus')) $('editBcStatus').value = (!row.status || row.status === 'importe') ? 'transmis' : (row.status === 'cloture' ? 'clos' : row.status);
    if ($('editBcDaStatus')) $('editBcDaStatus').value = row.daStatus || 'draft';
    if ($('editBcPromisedDate')) $('editBcPromisedDate').value = row.promisedDate || '';
    if ($('editBcGoodsDate')) $('editBcGoodsDate').value = row.goodsReceivedDate || '';
    if ($('editBcServiceDate')) $('editBcServiceDate').value = row.serviceDoneDate || '';
    if ($('editBcRequester')) $('editBcRequester').value = row.requester || '';
    if ($('editBcPaymentTerms')) $('editBcPaymentTerms').value = row.paymentTerms || '';
    if ($('editBcDescription')) $('editBcDescription').value = row.description || '';
    if ($('editBcComments')) $('editBcComments').value = row.comments || '';
    if ($('editBcNotes')) $('editBcNotes').value = row.notes || '';
    if ($('editBcAmountHT')) $('editBcAmountHT').value = row.amountHT || 0;
    if ($('editBcTVA')) $('editBcTVA').value = row.tva || 0;
    if ($('editBcDepartment')) $('editBcDepartment').value = row.department || '';
    if ($('editBcRemarques')) $('editBcRemarques').value = row.remarques || '';
    
    const modal = $('bcEditModalBackdrop');
    if (modal) {
      const titleEl = modal.querySelector('.modal-head h3');
      if (titleEl) titleEl.textContent = 'Modifier la BC';
      const subtitleEl = modal.querySelector('.modal-head p');
      if (subtitleEl) subtitleEl.textContent = row.ref + (row.supplierName ? ' · ' + row.supplierName : '');
      modal.classList.remove('hidden');
    }
  }
};

// 8. Override submitBcEditForm to save new fields, deduplicate, and sync to server
window.submitBcEditForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = $('editBcId') ? $('editBcId').value : '';
  const dateVal = $('editBcDate') ? ($('editBcDate').value || todayYmd()) : todayYmd();
  const rawRef = $('editBcRef') ? $('editBcRef').value.trim() : '';
  const effectiveRef = canonicalBcRef(rawRef || nextBcRefPreview(), '', dateVal);
  const effectiveDaRef = canonicalDaRef(($('editBcDaRef') ? $('editBcDaRef').value.trim() : '') || nextDaRefPreview(), dateVal);

  let idx = id ? state.bcRecords.findIndex(r => r.id === id) : -1;
  let mergedExisting = false;
  if (idx === -1 && effectiveRef) {
    const dedupKey = getBcDedupKey(effectiveRef);
    if (dedupKey) {
      const existingIdx = state.bcRecords.findIndex(r => getBcDedupKey(r.ref, r) === dedupKey);
      if (existingIdx !== -1) {
        idx = existingIdx;
        mergedExisting = true;
      }
    }
  } else if (idx >= 0 && effectiveRef) {
    const dedupKey = getBcDedupKey(effectiveRef);
    const conflictIdx = state.bcRecords.findIndex((r, i) => i !== idx && getBcDedupKey(r.ref, r) === dedupKey);
    if (conflictIdx !== -1) {
      showToast(`La référence ${effectiveRef} existe déjà sur un autre BC.`);
      return;
    }
  }

  let row;
  if (idx === -1) {
    row = {
      id: id || uid('bc'),
      lineItems: [],
      createdAt: new Date().toISOString()
    };
  } else {
    row = { ...state.bcRecords[idx] };
  }

  row.ref = effectiveRef;
  row.daRef = effectiveDaRef || row.daRef;
  row.date = dateVal || row.date;
  if ($('editBcRequestDate')) row.requestDate = $('editBcRequestDate').value || row.requestDate || '';
  row.supplierName = $('editBcSupplier') ? $('editBcSupplier').value.trim() : row.supplierName;
  row.requester = $('editBcRequester') ? $('editBcRequester').value.trim() : row.requester;
  row.department = $('editBcDepartment') ? $('editBcDepartment').value.trim() : row.department;
  row.type = $('editBcType') ? $('editBcType').value : row.type;
  row.amountTTC = $('editBcAmount') ? parseFlexibleNumber($('editBcAmount').value) : row.amountTTC;
  row.amount = row.amountTTC;
  row.amountHT = $('editBcAmountHT') ? parseFlexibleNumber($('editBcAmountHT').value) : row.amountHT;
  row.tva = $('editBcTVA') ? parseFlexibleNumber($('editBcTVA').value) : row.tva;
  row.remarques = $('editBcRemarques') ? $('editBcRemarques').value.trim() : row.remarques;
  row.currency = 'DZD';
  const chosenStatus = $('editBcStatus') ? $('editBcStatus').value : row.status;
  if (mergedExisting && (row.status === 'clos' || row.status === 'livre_paye') && (!chosenStatus || chosenStatus === 'transmis')) {
    // Preserve existing closed / livre_paye status when merging an accidental duplicate create
  } else {
    row.status = chosenStatus || 'transmis';
  }
  row.daStatus = $('editBcDaStatus') ? $('editBcDaStatus').value : row.daStatus;
  if (row.daStatus === 'validated' && !row.daValidatedAt) row.daValidatedAt = new Date().toISOString();
  row.promisedDate = $('editBcPromisedDate') ? ($('editBcPromisedDate').value || addBusinessDays(row.date, state.settings.procurementDays || 0)) : row.promisedDate;
  row.goodsReceivedDate = $('editBcGoodsDate') ? $('editBcGoodsDate').value : row.goodsReceivedDate;
  row.serviceDoneDate = $('editBcServiceDate') ? $('editBcServiceDate').value : row.serviceDoneDate;
  row.paymentTerms = $('editBcPaymentTerms') ? $('editBcPaymentTerms').value.trim() : row.paymentTerms;
  row.description = $('editBcDescription') ? $('editBcDescription').value.trim() : row.description;
  row.comments = $('editBcComments') ? $('editBcComments').value.trim() : row.comments;
  row.notes = $('editBcNotes') ? $('editBcNotes').value.trim() : row.notes;
  if (row.status === 'livre_paye') {
    if (!row.goodsReceivedDate && !row.serviceDoneDate) {
      if (row.type === 'service') row.serviceDoneDate = row.date || new Date().toISOString().split('T')[0];
      else row.goodsReceivedDate = row.date || new Date().toISOString().split('T')[0];
    }
    row.paymentStatus = 'paye';
    if (!row.paymentPaidDate) row.paymentPaidDate = row.date || new Date().toISOString().split('T')[0];
    if (!/pay[eé]/i.test(String(row.remarques || ''))) {
      row.remarques = row.remarques ? (row.remarques + ' · ✓ Payé') : '✓ Payé';
    }
  }
  row.updatedAt = new Date().toISOString();
  const normalized = window.normalizeBcRecord(row);

  if (idx === -1) {
    state.bcRecords.unshift(normalized);
    if (state.ui.isFilteredActive && Array.isArray(state.ui.activeFilteredIds) && !state.ui.activeFilteredIds.includes(normalized.id)) {
      state.ui.activeFilteredIds.push(normalized.id);
    }
  } else {
    state.bcRecords[idx] = normalized;
  }

  bumpBcSequenceFromRef(normalized.ref);
  bumpDaSequenceFromRef(normalized.daRef);

  if (!state.suppliers.some(s => (typeof s === 'string' ? s : s.name) === normalized.supplierName) && normalized.supplierName) {
    state.suppliers.push({ id: "sup_" + Math.random().toString(36).substr(2, 6), name: normalized.supplierName });
  }
  if (!state.requesters.some(r => (typeof r === 'string' ? r : r.name) === normalized.requester) && normalized.requester) {
    state.requesters.push({ id: "req_" + Math.random().toString(36).substr(2, 6), name: normalized.requester });
  }
  saveState();
  if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
    window.bcBridge.syncBcToServer();
  }

  const modal = $('bcEditModalBackdrop');
  if (modal) modal.classList.add('hidden');
  renderApp();
  showToast(mergedExisting ? `BC existant mis à jour (${normalized.ref}).` : 'Bon de commande enregistré avec succès');
};
window._enhancedSubmitBcEditForm = window.submitBcEditForm;

// 9. Full BC Review & DP Linking Cockpit Modal
window._currentReviewBcId = null;

window.navigateBcReviewModal = function(delta) {
  const curId = window._currentReviewBcId;
  if (!curId) return;
  let list = typeof filteredBcRecords === 'function' ? filteredBcRecords() : (state.bcRecords || []);
  let idx = list.findIndex(r => r.id === curId);
  if (idx === -1) {
    list = state.bcRecords || [];
    idx = list.findIndex(r => r.id === curId);
  }
  if (!list.length || idx === -1) return;
  const nextIdx = (idx + delta + list.length) % list.length;
  window.openBcDetailModal(list[nextIdx].id);
};

window.bcCockpitSetStatus = function(bcId, newStatus) {
  const row = (state.bcRecords || []).find(r => r.id === bcId);
  if (!row) return;
  const today = typeof todayYmd === 'function' ? todayYmd() : new Date().toISOString().split('T')[0];
  row.status = newStatus;
  if (newStatus === 'livre' || newStatus === 'livre_paye') {
    if (!row.goodsReceivedDate && !row.serviceDoneDate) {
      if (row.type === 'service') row.serviceDoneDate = row.date || today;
      else row.goodsReceivedDate = row.date || today;
    }
  }
  if (newStatus === 'paye' || newStatus === 'livre_paye') {
    row.paymentStatus = 'paye';
    row.paymentPaidDate = row.paymentPaidDate || today;
    if (!/pay[eé]/i.test(String(row.remarques || ''))) {
      row.remarques = row.remarques ? `${row.remarques} · ✓ Payé` : '✓ Payé';
    }
  }
  row.updatedAt = new Date().toISOString();
  if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
  saveState();
  if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
  renderApp();
  window.openBcDetailModal(bcId);
  showToast(`BC ${row.ref} mis à jour : ${statusLabel(newStatus)}`);
};

window.bcCockpitLinkDp = function(bcId, dpId, forceMarkPaid) {
  const bc = (state.bcRecords || []).find(r => r.id === bcId);
  const dp = (state.payments || []).find(p => p.id === dpId);
  if (!bc || !dp) return;
  if (window.ApproNextGen && typeof window.ApproNextGen.linkBcAndDpPair === 'function') {
    window.ApproNextGen.linkBcAndDpPair(dp, [bc], Boolean(forceMarkPaid));
  }
  window.openBcDetailModal(bcId);
};

window.bcCockpitUnlinkDp = function(bcId, dpId) {
  const bc = (state.bcRecords || []).find(r => r.id === bcId);
  const dp = (state.payments || []).find(p => p.id === dpId);
  if (!bc || !dp) return;
  if (window.ApproNextGen && typeof window.ApproNextGen.unlinkBcFromDp === 'function') {
    window.ApproNextGen.unlinkBcFromDp(bc, dp);
  }
  window.openBcDetailModal(bcId);
};

window.bcCockpitFilterManualDp = function(q) {
  const sel = document.getElementById('bcCockpitManualDpSelect');
  if (!sel) return;
  const term = String(q || '').toLowerCase().trim();
  Array.from(sel.options).forEach(opt => {
    if (!opt.value) return;
    opt.hidden = term ? !opt.textContent.toLowerCase().includes(term) : false;
  });
  const firstVis = Array.from(sel.options).find(o => o.value && !o.hidden);
  if (firstVis && term) sel.value = firstVis.value;
};

window.openBcDetailModal = function(id) {
  try {
    const row = state.bcRecords.find(r => r.id === id || r.ref === id);
    if (!row) {
      showToast('Détails non trouvés pour ce bon de commande.');
      return;
    }
    window._currentReviewBcId = row.id;
    const modalBackdrop = document.getElementById("bcDetailModalBackdrop");
    if (!modalBackdrop) return;

    let navList = typeof filteredBcRecords === 'function' ? filteredBcRecords() : (state.bcRecords || []);
    let navIdx = navList.findIndex(r => r.id === row.id);
    if (navIdx === -1) {
      navList = state.bcRecords || [];
      navIdx = navList.findIndex(r => r.id === row.id);
    }
    const counterEl = document.getElementById('bcReviewCounter');
    if (counterEl) counterEl.textContent = `${navIdx >= 0 ? navIdx + 1 : 1} / ${navList.length || 1}`;
    
    const titleEl = document.getElementById("bcDetailTitle");
    if (titleEl) titleEl.textContent = "Bon de Commande : " + (row.ref || id);
    
    const subtitleEl = document.getElementById("bcDetailSubtitle");
    if (subtitleEl) {
      const supName = row.supplierName || 'Fournisseur non spécifié';
      const dateStr = typeof formatDate === 'function' ? formatDate(row.date) : (row.date || '');
      subtitleEl.textContent = supName + (dateStr ? ' — ' + dateStr : '');
    }
    
    const delayInfo = typeof computeDelay === 'function' ? computeDelay(row) : { cls: 'neutral', label: '—' };
    const actualDate = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate) : (row.goodsReceivedDate || row.serviceDoneDate);
    const realDate = actualDate ? (typeof formatDate === 'function' ? formatDate(actualDate) : actualDate) : "Non réalisé";
    
    let linesHtml = "";
    if (row.lineItems && row.lineItems.length > 0) {
      const rows = row.lineItems.map(item => `
        <tr>
          <td>${escapeHtml(item.description || item.designation || "")}</td>
          <td style="text-align:right;">${item.qty || item.quantity || 0}</td>
          <td>${escapeHtml(item.unit || "U")}</td>
          <td style="text-align:right;">${typeof formatMoney === 'function' ? formatMoney(item.unitPrice || item.prixUnitaire || 0, row.currency) : (item.unitPrice || 0)}</td>
          <td style="text-align:right;"><strong>${typeof formatMoney === 'function' ? formatMoney(item.lineTotal || item.total || ((item.qty || 0) * (item.unitPrice || 0)), row.currency) : (item.lineTotal || 0)}</strong></td>
        </tr>
      `).join("");
      linesHtml = `
        <div class="detail-section" style="margin-top:1.5rem;">
          <h4 style="font-size:0.9rem; font-weight:700; color:var(--primary); margin-bottom:0.6rem;">Articles / Prestations</h4>
          <div class="table-shell tight-space">
            <table class="dense-table compact-table detail-articles-table" style="width:100%;">
              <thead>
                <tr>
                  <th style="text-align:left;">Description</th>
                  <th style="text-align:right;">Qté</th>
                  <th style="text-align:left;">Unité</th>
                  <th style="text-align:right;">Prix unit.</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }
    
    const bodyEl = document.getElementById("bcDetailBody");
    if (!bodyEl) return;
    
    const moneyHT = typeof formatMoney === 'function' ? formatMoney(row.amountHT, row.currency) : (row.amountHT || 0);
    const moneyTTC = typeof formatMoney === 'function' ? formatMoney(row.amountTTC || row.amount, row.currency) : (row.amountTTC || 0);
    const statCls = typeof statusClass === 'function' ? statusClass(row.status) : 'ok';
    const statLbl = typeof statusLabel === 'function' ? statusLabel(row.status) : (row.status || '—');
    const valCls = typeof validationClass === 'function' ? validationClass(row) : 'ok';
    const valLbl = typeof validationLabel === 'function' ? validationLabel(row) : (row.daStatus === 'validated' ? 'Validé' : 'En attente');
    const dateFormatted = typeof formatDate === 'function' ? formatDate(row.date) : (row.date || '—');
    const promisedFormatted = typeof formatDate === 'function' ? formatDate(row.promisedDate) : (row.promisedDate || '—');

    const stockInfo = (typeof getBcStockIngestionInfo === 'function')
      ? getBcStockIngestionInfo(row)
      : ((typeof window !== 'undefined' && typeof window.getBcStockIngestionInfo === 'function') ? window.getBcStockIngestionInfo(row) : null);

    let stockSectionHtml = '';
    if (stockInfo && stockInfo.ingested) {
      stockSectionHtml = `
        <div class="detail-section" style="background:#ecfdf5; border:1px solid #10b981; border-radius:8px; padding:1rem; margin-top:1rem;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:0.5rem;">
            <span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>
            <strong style="color:#065f46; font-size:0.92rem;">Intégration Stock Confirmée</strong>
          </div>
          <p style="margin:0 0 0.5rem 0; font-size:0.88rem; color:#047857; font-weight:500;">${escapeHtml(stockInfo.note || "Ce Bon de Commande a été réceptionné et intégré dans le stock")}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.83rem; color:#064e3b; background:rgba(255,255,255,0.75); padding:8px 12px; border-radius:6px;">
            <div><strong>Date de réception :</strong> ${escapeHtml(stockInfo.date ? (typeof formatDate === 'function' ? formatDate(stockInfo.date) : stockInfo.date) : 'Non précisée')}</div>
            <div><strong>Réf Article / Lot :</strong> ${escapeHtml(stockInfo.articleRef || 'Articles du bon')}</div>
          </div>
        </div>
      `;
    } else {
      const st = String(row.status || '').toLowerCase();
      if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
        stockSectionHtml = `
          <div class="detail-section" style="background:#fff1f2; border:1px solid #f43f5e; border-radius:8px; padding:0.85rem 1rem; margin-top:1rem; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>
              <span style="font-size:0.85rem; color:#9f1239; margin-left:8px; font-weight:500;">Ce bon est réceptionné/validé et en attente d'ingestion au stock magasin.</span>
            </div>
          </div>
        `;
      }
    }

    const imp = (typeof ApproNextGen !== 'undefined' && ApproNextGen.classifyBcImportance) ? ApproNextGen.classifyBcImportance(row) : 'normal';
    const impText = imp === 'critical' ? '🔴 Critique' : (imp === 'high' ? '🟠 Haute' : '🔵 Standard');
    const isPaidNow = isBcActuallyPaid(row);
    const linkedDps = getLinkedDpsForBc(row);
    const aiCands = (window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getLogicalDpCandidatesForBc === 'function')
      ? window.LogicalMatchEngine.getLogicalDpCandidatesForBc(row).slice(0, 5)
      : [];

    const quickActionsHtml = `
      <div class="detail-section" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 12px;background:var(--surface-2,#f8fafc);border:1px solid var(--line,#e2e8f0);border-radius:8px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:11.5px;font-weight:700;color:var(--muted);">Statut rapide :</span>
          <button type="button" class="btn btn-soft btn-compact" onclick="window.bcCockpitSetStatus('${row.id}','livre')">🚚 Livré</button>
          <button type="button" class="btn btn-success btn-compact" style="background:#059669;color:#fff;border:none;" onclick="window.bcCockpitSetStatus('${row.id}','livre_paye')">✓ Livré &amp; Payé</button>
          <button type="button" class="btn btn-soft btn-compact" style="color:#059669;border-color:rgba(5,150,105,0.35);" onclick="window.bcCockpitSetStatus('${row.id}','paye')">💳 Payé</button>
          <button type="button" class="btn btn-soft btn-compact" onclick="window.bcCockpitSetStatus('${row.id}','clos')">🔒 Clôturé</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="badge-importance badge-imp-${imp}">${impText}</span>
          <button type="button" class="btn btn-primary btn-compact" onclick="document.getElementById('bcDetailModalBackdrop').classList.add('hidden'); if(typeof openBcEditModal==='function') openBcEditModal('${row.id}'); else if(typeof editBcRecord==='function') editBcRecord('${row.id}');">✏️ Modifier BC</button>
        </div>
      </div>
    `;

    const linkedDpRowsHtml = linkedDps.length ? linkedDps.map(dp => {
      const dpPaid = isDpPaidStatus(dp);
      return `<div class="bc-ai-cand-card" style="border-left:4px solid ${dpPaid ? '#059669' : '#d97706'};">
        <div>
          <strong>💳 DP ${escapeHtml(dp.paymentRef || '—')}</strong> · <span style="font-weight:700;color:var(--primary);">${formatMoney(dp.amount, 'DZD')}</span>
          <span class="status-pill" style="margin-left:6px;font-size:10px;padding:2px 6px;background:${dpPaid ? '#dcfce7;color:#166534' : '#fef3c7;color:#92400e'};">${dpPaid ? '✓ Payée' : '⏳ En attente'}</span>
          <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(dp.beneficiary || '—')} · Date DP: ${formatDate(dp.requestDate)} ${dp.paidDate ? `· Payée le ${formatDate(dp.paidDate)}` : ''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${!dpPaid ? `<button type="button" class="btn btn-success btn-compact" style="background:#059669;color:#fff;border:none;" onclick="window.bcCockpitLinkDp('${row.id}','${dp.id}',true)">✓ Marquer DP &amp; BC Payés</button>` : ''}
          <button type="button" class="btn btn-ghost btn-compact" style="color:#dc2626;" onclick="window.bcCockpitUnlinkDp('${row.id}','${dp.id}')">✕ Délier</button>
        </div>
      </div>`;
    }).join('') : `<div style="font-size:12px;color:var(--muted);padding:4px 0;">Aucune DP actuellement liée à ce Bon de Commande.</div>`;

    const aiCandRowsHtml = aiCands.length ? aiCands.map(c => {
      const reasonsHtml = (c.reasons || []).map(r => `<span class="sm-reason-tag">${escapeHtml(r)}</span>`).join('');
      const diffTxt = c.diff <= 5 ? '<span style="color:#059669;font-weight:700;">Écart 0 DA</span>' : `<span style="color:#d97706;">Écart ${formatMoney(c.diff, 'DZD')}</span>`;
      return `<div class="bc-ai-cand-card">
        <div style="flex:1;min-width:220px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="sm-match-score ${c.score >= 85 ? 'sm-score-high' : (c.score >= 65 ? 'sm-score-med' : 'sm-score-low')}">🤖 ${c.score}%</span>
            <strong>DP ${escapeHtml(c.dp.paymentRef || '—')}</strong>
            <span style="font-weight:800;color:var(--primary);">${formatMoney(c.dp.amount, 'DZD')}</span>
            <span style="font-size:11px;">(${diffTxt})</span>
          </div>
          <div style="font-size:11.5px;color:var(--muted);margin:2px 0;">${escapeHtml(c.dp.beneficiary || '—')} · ${formatDate(c.dp.requestDate)} · ${escapeHtml((c.dp.notes || c.dp.natureExpense || '').slice(0, 70))}</div>
          <div>${reasonsHtml}</div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <button type="button" class="btn btn-soft btn-compact" onclick="window.bcCockpitLinkDp('${row.id}','${c.dp.id}',false)">🔗 Lier</button>
          <button type="button" class="btn btn-primary btn-compact" style="background:#059669;border-color:#059669;" onclick="window.bcCockpitLinkDp('${row.id}','${c.dp.id}',true)">✓ Lier &amp; Marquer Payé</button>
        </div>
      </div>`;
    }).join('') : `<div style="font-size:12px;color:var(--muted);padding:4px 0;">Aucune suggestion IA directe ≥ 35% trouvée — utilisez la recherche manuelle ci-dessous.</div>`;

    const allDpOpts = (state.payments || []).slice(0, 300).map(p =>
      `<option value="${escapeHtml(p.id)}">DP ${escapeHtml(p.paymentRef || '—')} — ${escapeHtml(p.beneficiary || 'Sans nom')} (${formatMoney(p.amount, 'DZD')} · ${isDpPaidStatus(p) ? 'Payée' : 'En attente'})</option>`
    ).join('');

    const dpCockpitHtml = `
      <div class="bc-dp-cockpit-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
          <h4 style="margin:0;font-size:13px;font-weight:800;color:var(--primary);"><i class="fas fa-brain me-1"></i> Liaison Demande de Paiement (DP) &amp; Suggestions Logiques IA</h4>
          <span style="font-size:11.5px;font-weight:700;color:${isPaidNow ? '#059669' : '#dc2626'};">${isPaidNow ? '✓ BC Réglé / Payé' : '⏳ BC Non Payé (Créance active)'}</span>
        </div>
        <div style="margin-bottom:8px;"><strong style="font-size:11.5px;text-transform:uppercase;color:var(--muted);">DP Liée(s) :</strong>${linkedDpRowsHtml}</div>
        <div style="margin-bottom:8px;"><strong style="font-size:11.5px;text-transform:uppercase;color:var(--muted);">Top Candidats DP Logiques (IA) :</strong>${aiCandRowsHtml}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px;border-top:1px dashed var(--line,#cbd5e1);">
          <input type="search" id="bcCockpitManualDpSearch" placeholder="Filtrer une DP (réf, bénéficiaire, montant)..." style="height:31px;font-size:12px;padding:0 8px;flex:1;min-width:180px;" oninput="window.bcCockpitFilterManualDp(this.value)" />
          <select id="bcCockpitManualDpSelect" style="height:31px;font-size:12px;padding:0 8px;flex:2;min-width:220px;"><option value="">— Choisir une DP dans la base (${(state.payments || []).length}) —</option>${allDpOpts}</select>
          <button type="button" class="btn btn-soft btn-compact" onclick="const v=document.getElementById('bcCockpitManualDpSelect').value; if(v) window.bcCockpitLinkDp('${row.id}',v,false);">🔗 Lier</button>
          <button type="button" class="btn btn-primary btn-compact" onclick="const v=document.getElementById('bcCockpitManualDpSelect').value; if(v) window.bcCockpitLinkDp('${row.id}',v,true);">✓ Lier &amp; Payé</button>
        </div>
      </div>
    `;

    bodyEl.innerHTML = `
      ${quickActionsHtml}
      <div class="detail-section">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="d-label">Référence</div>
            <div class="d-value">${escapeHtml(row.ref)}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Date BC</div>
            <div class="d-value">${dateFormatted}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Fournisseur</div>
            <div class="d-value" style="color:var(--primary); font-weight:600;">${escapeHtml(row.supplierName || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Statut BC</div>
            <div class="d-value"><span class="status-pill ${statCls}">${statLbl}</span></div>
          </div>
          <div class="detail-item">
            <div class="d-label">Réf. DA</div>
            <div class="d-value">${escapeHtml(row.daRef || "—")} <span class="status-pill ${valCls}" style="font-size:0.7rem; margin-left:4px;">${valLbl}</span></div>
          </div>
          <div class="detail-item">
            <div class="d-label">Demandeur</div>
            <div class="d-value">${escapeHtml(row.requester || "—")}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Structure</div>
            <div class="d-value">${row.department ? "<span class=\"dept-pill\">" + escapeHtml(row.department) + "</span>" : "—"}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Type</div>
            <div class="d-value">${escapeHtml(row.type === "service" ? "Service" : "Achat")}</div>
          </div>
        </div>
      </div>
      
      <div class="detail-section" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
        <div class="detail-grid" style="grid-template-columns:1fr; background:var(--surface-2); padding:1rem; border-radius:8px; gap:0.6rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700; color:var(--text);">Délais & Modalités</h4>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Date promise</div>
            <div class="d-value">${promisedFormatted}</div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Réalisation</div>
            <div class="d-value">${realDate}</div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Délai</div>
            <div class="d-value"><span class="badge ${delayInfo.cls || ''}">${delayInfo.label || '—'}</span></div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Cond. paiement</div>
            <div class="d-value">${escapeHtml(row.paymentTerms || "—")}</div>
          </div>
        </div>
        
        <div class="detail-grid" style="grid-template-columns:1fr; background:rgba(59,130,246,0.05); padding:1rem; border-radius:8px; border:1px solid rgba(59,130,246,0.2); gap:0.5rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700; color:var(--primary);">Montants financiers</h4>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Montant HT</div>
            <div class="d-value amount-ht" style="font-weight:600;">${moneyHT}</div>
          </div>
          ${row.tva ? "<div class=\"detail-item\" style=\"background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;\"><div class=\"d-label\">TVA</div><div class=\"d-value\">" + (typeof formatMoney === 'function' ? formatMoney(row.tva, row.currency) : row.tva) + "</div></div>" : ""}
          ${row.remise ? "<div class=\"detail-item\" style=\"background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;\"><div class=\"d-label\">Remise</div><div class=\"d-value\" style=\"color:#e11d48;\">-" + (typeof formatMoney === 'function' ? formatMoney(row.remise, row.currency) : row.remise) + "</div></div>" : ""}
          <div class="detail-item" style="background:none; border:none; padding:8px 0 0; margin-top:6px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label" style="font-weight:700; color:var(--text); font-size:0.85rem;">Montant TTC</div>
            <div class="d-value amount-ttc" style="font-size:1.15rem; font-weight:800; color:var(--primary);">${moneyTTC}</div>
          </div>
        </div>
      </div>
      
      ${row.remarques ? `
      <div class="detail-section" style="background:var(--surface-2, rgba(241,245,249,0.7)); padding:0.85rem 1rem; border-radius:8px; border-left:4px solid var(--primary, #2563eb); margin-top:1rem;">
        <h4 style="color:var(--text, #1e293b); margin:0 0 0.3rem 0; font-size:0.85rem; font-weight:700;">Remarques</h4>
        <p style="margin:0; font-size:0.9rem; color:var(--text-muted, #475569); white-space:pre-wrap; line-height:1.4;">${escapeHtml(row.remarques)}</p>
      </div>` : ""}
      
      ${row.description || row.comments ? `
      <div class="detail-section" style="display:flex; gap:1rem; margin-top:1rem;">
        ${row.description ? "<div style=\"flex:1; background:var(--surface-2); padding:0.85rem 1rem; border-radius:8px;\"><h4 style=\"margin:0 0 0.3rem 0; font-size:0.8rem; color:var(--muted); text-transform:uppercase;\">Description</h4><p style=\"margin:0; font-size:0.85rem; white-space:pre-wrap;\">" + escapeHtml(row.description) + "</p></div>" : ""}
        ${row.comments ? "<div style=\"flex:1; background:var(--surface-2); padding:0.85rem 1rem; border-radius:8px;\"><h4 style=\"margin:0 0 0.3rem 0; font-size:0.8rem; color:var(--muted); text-transform:uppercase;\">Commentaires</h4><p style=\"margin:0; font-size:0.85rem; white-space:pre-wrap;\">" + escapeHtml(row.comments) + "</p></div>" : ""}
      </div>` : ""}
      
      ${dpCockpitHtml}
      ${stockSectionHtml}
      ${linesHtml}
    `;
    
    modalBackdrop.classList.remove("hidden");
  } catch (err) {
    console.error("[openBcDetailModal] Error:", err);
  }
};

// Delegated listeners for opening/closing detail modal + sequential navigation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-bc-btn, [data-action="view-bc"]');
  if (btn) {
    e.preventDefault();
    const id = btn.getAttribute('data-id') || (btn.dataset ? btn.dataset.id : null);
    if (id && typeof window.openBcDetailModal === 'function') {
      window.openBcDetailModal(id);
    }
    return;
  }

  if (e.target && (e.target.id === 'bcReviewPrevBtn' || e.target.closest('#bcReviewPrevBtn'))) {
    e.preventDefault();
    window.navigateBcReviewModal(-1);
    return;
  }

  if (e.target && (e.target.id === 'bcReviewNextBtn' || e.target.closest('#bcReviewNextBtn'))) {
    e.preventDefault();
    window.navigateBcReviewModal(1);
    return;
  }
  
  if (e.target && (e.target.id === 'closeBcDetailModalBtn' || e.target.closest('#closeBcDetailModalBtn'))) {
    const backdrop = document.getElementById('bcDetailModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }
  
  if (e.target && e.target.id === 'bcDetailModalBackdrop') {
    e.target.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  const backdrop = document.getElementById('bcDetailModalBackdrop');
  if (!backdrop || backdrop.classList.contains('hidden')) return;
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === 'Escape') {
    backdrop.classList.add('hidden');
  } else if (!isTyping && e.key === 'ArrowLeft') {
    e.preventDefault();
    window.navigateBcReviewModal(-1);
  } else if (!isTyping && e.key === 'ArrowRight') {
    e.preventDefault();
    window.navigateBcReviewModal(1);
  }
});

// (resetFollowupFilters is handled above in section 4)

// 12. KPI filter functionality
window.getKpiFilteredRecords = function() {
  let records = state.bcRecords;
  
  const from = $('kpiDateFrom') ? $('kpiDateFrom').value : '';
  const to = $('kpiDateTo') ? $('kpiDateTo').value : '';
  const supplier = $('kpiSupplierFilter') ? $('kpiSupplierFilter').value : 'all';
  const dept = $('kpiDeptFilter') ? $('kpiDeptFilter').value : 'all';
  const type = $('kpiTypeFilter') ? $('kpiTypeFilter').value : 'all';
  
  if (from) {
    const fromDate = new Date(from);
    records = records.filter(r => new Date(r.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    records = records.filter(r => new Date(r.date) <= toDate);
  }
  if (supplier && supplier !== 'all') {
    const norm = String(supplier).trim().toLowerCase();
    records = records.filter(r => String(r.supplierName || '').trim().toLowerCase() === norm);
  }
  if (dept !== 'all') {
    records = records.filter(r => r.department === dept);
  }
  if (type !== 'all') {
    records = records.filter(r => (r.type || 'Achat') === type);
  }
  
  return records;
};

// Override computeKpis to use filtered records via swap pattern
const _baseComputeKpis = window.computeKpis;
window.computeKpis = function() {
  const filtered = getKpiFilteredRecords();
  const originalRecords = state.bcRecords;
  state.bcRecords = filtered;
  const result = _baseComputeKpis();
  state.bcRecords = originalRecords;
  // Add HT total to result
  result.totalAmountHT = filtered.reduce((sum, r) => sum + (Number(r.amountHT) || 0), 0);
  return result;
};

// Override renderKpi — professional colorful KPI dashboard
const _baseRenderKpi = window.renderKpi;
let _kpiRendering = false;
window.renderKpi = function() {
  if (_kpiRendering) return _baseRenderKpi();
  _kpiRendering = true;
  try {
  // Populate KPI supplier filter
  const kpiSupFilter = $('kpiSupplierFilter');
  if (kpiSupFilter && kpiSupFilter.options.length <= 1) {
    const suppliers = [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort();
    suppliers.forEach(s => {
      kpiSupFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`);
    });
  }
  // Populate KPI dept filter
  const kpiDeptFilter = $('kpiDeptFilter');
  if (kpiDeptFilter && kpiDeptFilter.options.length <= 1) {
    const depts = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
    depts.forEach(d => {
      kpiDeptFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
  }

  const records = getKpiFilteredRecords();
  const totalTTC = records.reduce((s, r) => { const n = Number(r.amountTTC || r.amount || 0); return s + (n < 1e10 ? n : 0); }, 0);
  const totalHT = records.reduce((s, r) => { const n = Number(r.amountHT || 0); return s + (n < 1e10 ? n : 0); }, 0);
  const delivered = records.filter(r => r.goodsReceivedDate || r.serviceDoneDate);
  const deliveryRate = records.length > 0 ? Math.round((delivered.length / records.length) * 100) : 0;
  const pending = records.filter(r => !r.goodsReceivedDate && !r.serviceDoneDate && r.status !== 'clos');
  const lateRecords = records.filter(r => { const d = computeDelay(r); return d.cls === 'late' || d.cls === 'warn'; });
  const lateRate = records.length > 0 ? Math.round((lateRecords.length / records.length) * 100) : 0;
  const validated = records.filter(r => r.daStatus === 'validated');
  const validationRate = records.length > 0 ? Math.round((validated.length / records.length) * 100) : 0;
  const avgAmount = records.length > 0 ? totalTTC / records.length : 0;
  const achatCount = records.filter(r => r.type === 'achat').length;
  const serviceCount = records.filter(r => r.type === 'service').length;

  // Average delivery days
  let totalDays = 0, dayCount = 0;
  delivered.forEach(r => {
    const start = new Date(r.date);
    const end = new Date(r.goodsReceivedDate || r.serviceDoneDate);
    if (!isNaN(start) && !isNaN(end)) { totalDays += Math.round((end - start) / 86400000); dayCount++; }
  });
  const avgDays = dayCount > 0 ? Math.round(totalDays / dayCount) : 0;

  // Top supplier by amount
  const supplierTotals = {};
  records.forEach(r => { if (r.supplierName) supplierTotals[r.supplierName] = (supplierTotals[r.supplierName] || 0) + (Number(r.amountTTC) || 0); });
  const topSupplier = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1])[0];

  // Top requester by count
  const requesterCounts = {};
  records.forEach(r => { if (r.requester) requesterCounts[r.requester] = (requesterCounts[r.requester] || 0) + 1; });
  const topRequester = Object.entries(requesterCounts).sort((a, b) => b[1] - a[1])[0];

  const kpiGrid = $('kpiGrid');
  if (!kpiGrid) return;

  kpiGrid.innerHTML = `
    <div class="kpi-pro-card kpi-blue">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${records.length}</div>
        <div class="kpi-pro-label">Volume de commandes</div>
        <div class="kpi-pro-sub">${achatCount} achats · ${serviceCount} services</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-indigo">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(totalHT, 'DZD')}</div>
        <div class="kpi-pro-label">Budget engagé HT</div>
        <div class="kpi-pro-sub">Hors taxes, remises incluses</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-teal">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(totalTTC, 'DZD')}</div>
        <div class="kpi-pro-label">Engagement global TTC</div>
        <div class="kpi-pro-sub">TVA + transport + timbre</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-green">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${deliveryRate}%</div>
        <div class="kpi-pro-label">Taux de réalisation</div>
        <div class="kpi-pro-sub">${delivered.length} / ${records.length} commandes livrées</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-amber">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${avgDays} j</div>
        <div class="kpi-pro-label">Délai moyen livraison</div>
        <div class="kpi-pro-sub">Jours calendaires BC → réception</div>
      </div>
    </div>
    <div class="kpi-pro-card ${lateRate > 30 ? 'kpi-red' : 'kpi-orange'}">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${lateRate}%</div>
        <div class="kpi-pro-label">Taux de retard</div>
        <div class="kpi-pro-sub">${lateRecords.length} commandes en retard / à risque</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-purple">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(avgAmount, 'DZD')}</div>
        <div class="kpi-pro-label">Montant moyen / BC</div>
        <div class="kpi-pro-sub">Panier moyen TTC par commande</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-cyan">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${validationRate}%</div>
        <div class="kpi-pro-label">Taux validation DA</div>
        <div class="kpi-pro-sub">${validated.length} DA validées sur ${records.length}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-slate">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${pending.length}</div>
        <div class="kpi-pro-label">BC en cours / en attente</div>
        <div class="kpi-pro-sub">Commandes non encore réalisées</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-rose">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18"/><path d="M18 9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 7v14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${topSupplier ? escapeHtml(topSupplier[0].length > 18 ? topSupplier[0].substring(0,18)+'…' : topSupplier[0]) : '—'}</div>
        <div class="kpi-pro-label">Top fournisseur</div>
        <div class="kpi-pro-sub">${topSupplier ? formatMoney(topSupplier[1], 'DZD') : 'Aucun'}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-emerald">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${topRequester ? escapeHtml(topRequester[0].length > 18 ? topRequester[0].substring(0,18)+'…' : topRequester[0]) : '—'}</div>
        <div class="kpi-pro-label">Plus gros demandeur</div>
        <div class="kpi-pro-sub">${topRequester ? topRequester[1] + ' commandes' : 'Aucun'}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-sky">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${new Set(records.map(r => r.supplierName).filter(Boolean)).size}</div>
        <div class="kpi-pro-label">Portefeuille fournisseurs</div>
        <div class="kpi-pro-sub">Fournisseurs actifs sur la période</div>
      </div>
    </div>
  `;

  // Save our custom cards HTML
  const customCardsHtml = kpiGrid.innerHTML;

  // Call the ORIGINAL renderKpi to render focusList, summaryList, charts
  const originalRecords = state.bcRecords;
  state.bcRecords = records;
  try { _baseRenderKpi(); } catch(e) { console.warn('[kpi] base render error:', e); }
  state.bcRecords = originalRecords;

  // Restore our custom KPI cards
  if (kpiGrid) kpiGrid.innerHTML = customCardsHtml;

  // === BUILD INTERACTIVE CHARTS ===
  const chartContainer = $('dashboardCharts');
  if (chartContainer) {
    const COLORS = ['#3b82f6','#0d9488','#6366f1','#881337','#16a34a','#e11d48','#9333ea','#0284c7','#4f46e5','#06b6d4','#64748b','#059669'];

    // --- 1. DONUT: Achats vs Services ---
    const achat = records.filter(r => r.type === 'achat');
    const service = records.filter(r => r.type === 'service');
    const achatAmt = achat.reduce((s,r) => s + (Number(r.amountTTC)||0), 0);
    const serviceAmt = service.reduce((s,r) => s + (Number(r.amountTTC)||0), 0);
    const total = achatAmt + serviceAmt || 1;
    const achatPct = Math.round((achatAmt / total) * 100);
    const servicePct = 100 - achatPct;
    const achatDeg = (achatPct / 100) * 360;

    // --- 2. TOP 10 SUPPLIERS ---
    const supTotals = {};
    records.forEach(r => { if (r.supplierName) supTotals[r.supplierName] = (supTotals[r.supplierName]||0) + (Number(r.amountTTC)||0); });
    const topSups = Object.entries(supTotals).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const maxSup = topSups[0] ? topSups[0][1] : 1;

    // --- 3. MONTHLY TREND ---
    const monthly = {};
    records.forEach(r => { if (r.date) { const m = r.date.substring(0,7); monthly[m] = (monthly[m]||0) + 1; } });
    const months = Object.keys(monthly).sort();
    const maxMonth = Math.max(...Object.values(monthly), 1);

    // --- 4. STATUS BREAKDOWN ---
    const statuses = {};
    records.forEach(r => { const s = r.status || 'importe'; statuses[s] = (statuses[s]||0) + 1; });
    const statusEntries = Object.entries(statuses).sort((a,b) => b[1]-a[1]);
    const statusColors = { importe:'#3b82f6', en_attente:'#4f46e5', en_cours:'#06b6d4', livre:'#16a34a', service_fait:'#059669', paye:'#0d9488', clos:'#64748b', programme:'#9333ea' };

    // --- 5. DEPARTMENT DISTRIBUTION ---
    const deptTotals = {};
    records.forEach(r => { const d = r.department || 'Non assigné'; deptTotals[d] = (deptTotals[d]||0) + (Number(r.amountTTC)||0); });
    const deptEntries = Object.entries(deptTotals).sort((a,b) => b[1]-a[1]);
    const maxDept = deptEntries[0] ? deptEntries[0][1] : 1;

    // --- 6. TOP REQUESTERS ---
    const reqCounts = {};
    records.forEach(r => { if (r.requester) reqCounts[r.requester] = (reqCounts[r.requester]||0) + 1; });
    const topReqs = Object.entries(reqCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const maxReq = topReqs[0] ? topReqs[0][1] : 1;

    chartContainer.innerHTML = `
      <div class="interactive-charts-grid">

        <!-- DONUT: Type Split -->
        <div class="chart-panel">
          <div class="chart-title">Répartition par type</div>
          <div class="chart-subtitle">Montants TTC — Achats vs Services</div>
          <div class="donut-wrapper">
            <div class="donut-chart" style="background: conic-gradient(#3b82f6 0deg ${achatDeg}deg, #0d9488 ${achatDeg}deg 360deg);">
              <div class="donut-hole">${records.length}<br><span>BC</span></div>
            </div>
            <div class="donut-legend">
              <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Achats <strong>${achatPct}%</strong><br><small>${formatMoney(achatAmt,'DZD')}</small></div>
              <div class="legend-item"><span class="legend-dot" style="background:#0d9488"></span>Services <strong>${servicePct}%</strong><br><small>${formatMoney(serviceAmt,'DZD')}</small></div>
            </div>
          </div>
        </div>

        <!-- BAR: Top Suppliers -->
        <div class="chart-panel chart-panel-wide">
          <div class="chart-title">Top 10 fournisseurs</div>
          <div class="chart-subtitle">Par montant total TTC engagé</div>
          <div class="hbar-chart">
            ${topSups.map((s, i) => `
              <div class="hbar-row" title="${escapeHtml(s[0])}: ${formatMoney(s[1],'DZD')}">
                <div class="hbar-label">${escapeHtml(s[0].length > 20 ? s[0].substring(0,20)+'…' : s[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((s[1]/maxSup)*100)}%;background:${COLORS[i%12]};">
                    <span class="hbar-value">${formatMoney(s[1],'DZD')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TREND: Monthly Orders -->
        <div class="chart-panel chart-panel-wide">
          <div class="chart-title">Évolution mensuelle</div>
          <div class="chart-subtitle">Nombre de commandes par mois</div>
          <div class="trend-chart">
            ${months.map((m, i) => `
              <div class="trend-bar-group" title="${m}: ${monthly[m]} commandes">
                <div class="trend-bar" style="height:${Math.round((monthly[m]/maxMonth)*100)}%;background:${COLORS[i%12]};">
                  <span class="trend-count">${monthly[m]}</span>
                </div>
                <div class="trend-label">${m.substring(5)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- STATUS: Breakdown -->
        <div class="chart-panel">
          <div class="chart-title">Répartition par statut</div>
          <div class="chart-subtitle">Ventilation des bons de commande</div>
          <div class="status-chart">
            ${statusEntries.map(([s, c]) => `
              <div class="status-row" title="${statusLabel(s)}: ${c}">
                <div class="status-label-text">${escapeHtml(statusLabel(s))}</div>
                <div class="status-track">
                  <div class="status-fill" style="width:${Math.round((c/records.length)*100)}%;background:${statusColors[s]||'#64748b'};">
                    <span class="status-count">${c}</span>
                  </div>
                </div>
                <div class="status-pct">${Math.round((c/records.length)*100)}%</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- DEPT: Distribution -->
        <div class="chart-panel">
          <div class="chart-title">Budget par département</div>
          <div class="chart-subtitle">Montant TTC par structure demandeuse</div>
          <div class="hbar-chart">
            ${deptEntries.map((d, i) => `
              <div class="hbar-row" title="${escapeHtml(d[0])}: ${formatMoney(d[1],'DZD')}">
                <div class="hbar-label">${escapeHtml(d[0].length > 18 ? d[0].substring(0,18)+'…' : d[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((d[1]/maxDept)*100)}%;background:${COLORS[(i+3)%12]};">
                    <span class="hbar-value">${formatMoney(d[1],'DZD')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- REQUESTERS: Who orders most -->
        <div class="chart-panel">
          <div class="chart-title">Top demandeurs</div>
          <div class="chart-subtitle">Qui commande le plus ?</div>
          <div class="hbar-chart">
            ${topReqs.map((r, i) => `
              <div class="hbar-row" title="${escapeHtml(r[0])}: ${r[1]} commandes">
                <div class="hbar-label">${escapeHtml(r[0].length > 18 ? r[0].substring(0,18)+'…' : r[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((r[1]/maxReq)*100)}%;background:${COLORS[(i+6)%12]};">
                    <span class="hbar-value">${r[1]} cmd</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  } finally { _kpiRendering = false; }
};

/// 15. Minimal CSS overrides (main CSS is in enhancements.css)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .followup-grid { display: none !important; }
`;
document.head.appendChild(styleSheet);

// === SETUP: Splash Screen Injection ===
(function injectSplashScreen() {
  const splashHtml = `
<div id="splashScreen" style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;background:#0f172a;">
  <div class="ai-widget ai-widget-lg" style="pointer-events:none;margin-bottom:8px">
    <div class="ai-ring3"></div>
    <div class="ai-orbit"></div>
    <div class="ai-orbit ai-orbit-2"></div>
    <div class="ai-core"></div>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:1.5rem;font-weight:800;color:#fff;letter-spacing:2px">SPA DOUROUB ELDJAZAIR</div>
    <div style="font-size:10px;letter-spacing:3px;color:#94a3b8;font-weight:600;margin-top:4px">SUIVI ACHATS & APPROVISIONNEMENT</div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06)">
    <div id="splashBar" style="height:100%;width:0;background:linear-gradient(90deg,#0d9488,#7c3aed);transition:width 1.2s ease;border-radius:0 2px 2px 0"></div>
  </div>
</div>
  `;
  document.body.insertAdjacentHTML('afterbegin', splashHtml);
  
  setTimeout(() => {
    const bar = document.getElementById('splashBar');
    if (bar) bar.style.width = '85%';
    
    setTimeout(() => {
      if (bar) bar.style.width = '100%';
      
      setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
          splash.style.transition = 'opacity 0.3s ease';
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 300);
        }
      }, 300); // 700 + 300 = 1000ms total
    }, 700);
  }, 10);
})();

// === SETUP: Inject animated AI widget + logo into topbar ===
(function injectTopbarLogo() {
  const titleGroup = document.querySelector('.topbar-title-group');
  if (!titleGroup) return;
  const badge = titleGroup.querySelector('.brand-badge');

  // Create the small animated AI widget
  const aiWidget = document.createElement('div');
  aiWidget.className = 'ai-widget ai-widget-sm';
  aiWidget.style.cssText = 'cursor:default;flex-shrink:0;';
  aiWidget.innerHTML = '<div class="ai-ring3"></div><div class="ai-orbit"></div><div class="ai-orbit ai-orbit-2"></div><div class="ai-core"></div>';

  // Check if there's a company logo
  const logoUrl = state.settings && state.settings.logoDataUrl;
  if (logoUrl && badge) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-shrink:0;';
    const img = document.createElement('img');
    img.id = 'topbarLogo';
    img.src = logoUrl;
    img.alt = 'Logo';
    wrapper.appendChild(aiWidget);
    wrapper.appendChild(img);
    badge.replaceWith(wrapper);
  } else if (badge) {
    badge.replaceWith(aiWidget);
  }

  // Update title
  const titleEl = $('appTitle');
  const subEl = $('appSubtitle');
  if (titleEl) titleEl.textContent = state.settings.title || 'SPA DOUROUB ELDJAZAIR';
  if (subEl) subEl.textContent = state.settings.subtitle || 'Suivi Achats, BC & Approvisionnement';
})();

// === SETUP: Add "Nouveau BC" button and mark actions header sticky ===
(function setupFollowupPage() {
  const filterPanel = document.querySelector('#page-followup .panel-muted');
  // The unified sub-nav bar already provides Nouveau BC / Export Excel / Export CSV: do not inject a duplicate row.
  if (filterPanel && !document.getElementById('btnOpenNewBcDrawer')) {
    const btnBar = document.createElement('div');
    btnBar.className = 'add-bc-trigger';
    btnBar.style.cssText = 'display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;margin-bottom:0.5rem;';
    btnBar.innerHTML = `
      <button class="btn" id="openAddBcModalBtn" type="button" style="background:#dc2626;color:#fff;font-weight:700;font-size:0.9rem;padding:0.6rem 1.2rem;border:none;border-radius:0.6rem;box-shadow:0 3px 10px rgba(220,38,38,.3);display:inline-flex;align-items:center;gap:0.4rem;cursor:pointer;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nouveau BC
      </button>
      <button class="btn btn-soft" id="exportExcelBtn" type="button" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:600;font-size:0.82rem;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Export Excel
      </button>
      <button class="btn btn-soft" id="exportCsvBtn" type="button" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:600;font-size:0.82rem;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>`;
    filterPanel.parentNode.insertBefore(btnBar, filterPanel);
  }

  // Excel Export
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'exportExcelBtn' || e.target.closest('#exportExcelBtn'))) {
      const records = filteredBcRecords();
      const rows = records.map(r => ({
        'Réf BC': r.ref, 'Réf DA': r.daRef||'', 'Date BC': r.date||'', 'Fournisseur': r.supplierName||'',
        'Description': r.description||'', 'Montant HT': r.amountHT||0, 'Montant TTC': r.amountTTC||0,
        'TVA': r.tva||0, 'Type': r.type||'', 'Statut BC': r.status||'', 'Statut DA': r.daStatus||'',
        'Structure': r.department||'', 'Demandeur': r.requester||'', 'Date promise': r.promisedDate||'',
        'Date réception': r.goodsReceivedDate||'', 'Remarques': r.remarques||'',
        'Conditions paiement': r.paymentTerms||'', 'Notes': r.notes||''
      }));
      if (window.XLSX) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Suivi BC');
        // Auto-size columns
        const cols = Object.keys(rows[0]||{}).map(k => ({ wch: Math.max(k.length + 2, 15) }));
        ws['!cols'] = cols;
        XLSX.writeFile(wb, 'suivi_bc_export_' + new Date().toISOString().split('T')[0] + '.xlsx');
        showToast('Export Excel téléchargé ! (' + records.length + ' lignes)');
      } else { showToast('Bibliothèque XLSX non chargée'); }
    }
  });

  // CSV Export
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'exportCsvBtn' || e.target.closest('#exportCsvBtn'))) {
      const records = filteredBcRecords();
      const headers = ['Réf BC','Réf DA','Date BC','Fournisseur','Description','Montant HT','Montant TTC','TVA','Type','Statut BC','Statut DA','Structure','Demandeur','Date promise','Date réception','Remarques'];
      const esc = (v) => '"' + String(v||'').replace(/"/g,'""') + '"';
      const lines = [headers.join(';')];
      records.forEach(r => {
        lines.push([r.ref,r.daRef,r.date,r.supplierName,r.description,r.amountHT||0,r.amountTTC||0,r.tva||0,r.type,r.status,r.daStatus,r.department,r.requester,r.promisedDate,r.goodsReceivedDate,r.remarques].map(esc).join(';'));
      });
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'suivi_bc_export_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click(); URL.revokeObjectURL(a.href);
      showToast('Export CSV téléchargé ! (' + records.length + ' lignes)');
    }
  });
  // Bind "Nouveau BC" button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#openAddBcModalBtn')) {
      const modal = $('bcEditModalBackdrop');
      if (modal) {
        const form = $('bcEditForm');
        if (form) form.reset();
        if ($('editBcId')) $('editBcId').value = '';
        if ($('editBcCurrency')) $('editBcCurrency').value = 'DZD';
        const today = new Date().toISOString().split('T')[0];
        if ($('editBcRef')) $('editBcRef').value = typeof nextBcRefPreview === 'function' ? nextBcRefPreview() : ('BC N°' + (state.settings.bcSequence || 1) + '/DG/2026');
        if ($('editBcDaRef')) $('editBcDaRef').value = typeof nextDaRefPreview === 'function' ? nextDaRefPreview() : ('DA N°' + (state.settings.daSequence || 1) + '/2026');
        if ($('editBcDate')) $('editBcDate').value = today;
        if ($('editBcPromisedDate')) $('editBcPromisedDate').value = typeof addBusinessDays === 'function' ? addBusinessDays(today, state.settings.procurementDays || 0) : today;
        if ($('editBcStatus')) $('editBcStatus').value = 'transmis';
        if ($('editBcDaStatus')) $('editBcDaStatus').value = 'draft';
        const stockAlert = $('editBcStockAlert');
        if (stockAlert) { stockAlert.innerHTML = ''; stockAlert.classList.add('hidden'); }
        const titleEl = modal.querySelector('.modal-head h3');
        if (titleEl) titleEl.textContent = 'Nouveau BC';
        const subtitleEl = modal.querySelector('.modal-head p');
        if (subtitleEl) subtitleEl.textContent = 'Remplissez les informations du bon de commande';
        modal.classList.remove('hidden');
      }
    }
  });
  // Bind "Modifier" button delegation, Cancel and Save bottom buttons
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    // Save button (bottom or top of bcEditForm)
    if (e.target.closest('#saveBcEditBottomBtn, #saveBcEditBtn')) {
      e.preventDefault();
      if (typeof window.submitBcEditForm === 'function') {
        window.submitBcEditForm(e);
      }
    }
    // Cancel button (bottom or top of bcEditForm)
    if (e.target.closest('#cancelBcEditBottomBtn, #closeBcEditModalBtn')) {
      const modal = $('bcEditModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    // Modifier action button in table
    const editBtn = e.target.closest('[data-action="edit-bc"]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if (id && typeof window.openBcEditModal === 'function') {
        window.openBcEditModal(id);
      }
    }
    // Manual Filter Button
    if (e.target.closest('#applyFollowupFiltersBtn')) {
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
    }

    // Multi-Select Supplier Dropdown Toggle
    if (e.target.closest('#supplierMultiSelectBtn')) {
      e.stopPropagation();
      const dd = $('supplierMultiSelectDropdown');
      if (dd) dd.classList.toggle('hidden');
    } else if (!e.target.closest('#supplierMultiSelectContainer')) {
      const dd = $('supplierMultiSelectDropdown');
      if (dd && !dd.classList.contains('hidden')) dd.classList.add('hidden');
    }

    // Select All Suppliers
    if (e.target.closest('#supplierSelectAllBtn')) {
      e.stopPropagation();
      const sups = state.ui.allSuppliersList || [];
      state.ui.selectedSuppliers = [...sups];
      document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]').forEach(cb => cb.checked = true);
      updateSupplierTriggerLabel();
      if (typeof resetFollowupPage === 'function') resetFollowupPage();
      if (typeof renderFollowupTable === 'function') renderFollowupTable();
    }

    // Clear All Suppliers
    if (e.target.closest('#supplierClearAllBtn')) {
      e.stopPropagation();
      state.ui.selectedSuppliers = [];
      document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateSupplierTriggerLabel();
      if (typeof resetFollowupPage === 'function') resetFollowupPage();
      if (typeof renderFollowupTable === 'function') renderFollowupTable();
    }
  });

  // Multi-Select Search Filter
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'supplierMultiSelectSearch') {
      const val = normalizeText(e.target.value || '');
      const items = document.querySelectorAll('#supplierMultiSelectList .multi-select-item');
      items.forEach(it => {
        const text = normalizeText(it.textContent || '');
        it.style.display = (!val || text.includes(val)) ? 'flex' : 'none';
      });
    }
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-validate-da');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const modal = $('validateDaModalBackdrop');
      if (!modal) return;
      $('validateDaBcId').value = row.id;
      $('validateDaBcRef').textContent = row.ref + (row.supplierName ? ' — ' + row.supplierName : '');
      $('validateDaBcSupplier').textContent = (row.department ? row.department + ' · ' : '') + (row.type === 'service' ? 'Prestation de service' : 'Achat');
      $('validateDaRefInput').value = row.daRef || (typeof nextDaRefPreview === 'function' ? nextDaRefPreview() : 'DA N°' + (state.settings.daSequence || 1) + '/2026');
      $('validateDaDateInput').value = row.daValidatedAt ? row.daValidatedAt.split('T')[0] : (row.date || new Date().toISOString().split('T')[0]);
      modal.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('#cancelValidateDaBtn, #cancelValidateDaBtn2')) {
      const modal = $('validateDaModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    if (e.target.id === 'validateDaModalBackdrop') {
      e.target.classList.add('hidden');
    }
    if (e.target.closest('#confirmValidateDaBtn')) {
      const id = $('validateDaBcId').value;
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const daRef = $('validateDaRefInput').value.trim();
      const valDate = $('validateDaDateInput').value || new Date().toISOString().split('T')[0];
      row.daRef = daRef || row.daRef || 'DA validée';
      row.daStatus = 'validated';
      row.daValidatedAt = valDate;
      if (row.status === 'importe' || row.status === 'draft') {
        row.status = 'valide';
      }
      row.updatedAt = new Date().toISOString();
      if (typeof bumpDaSequenceFromRef === 'function') bumpDaSequenceFromRef(row.daRef);
      saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
      renderApp();
      const modal = $('validateDaModalBackdrop');
      if (modal) modal.classList.add('hidden');
      showToast('DA validée avec succès pour ' + row.ref);
    }
  });

  // === Modal Enregistrement Livraison / Réalisation ===
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest('.btn-open-deliver-bc');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const modal = $('deliverBcModalBackdrop');
      if (!modal) return;
      $('deliverBcId').value = row.id;
      $('deliverBcRef').textContent = row.ref;
      $('deliverBcSupplier').textContent = row.supplierName || 'Fournisseur non spécifié';
      $('deliverBcTypeBadge').textContent = row.type === 'service' ? 'Service' : 'Achat';
      $('deliverBcDateLabel').textContent = 'Date BC : ' + (row.date ? formatDate(row.date) : 'Non renseignée');

      let defDate = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate) : (row.goodsReceivedDate || row.serviceDoneDate);
      if (!defDate) {
        if (row.date) {
          const d = new Date(row.date);
          d.setDate(d.getDate() + (row.type === 'service' ? 1 : 2));
          defDate = d.toISOString().split('T')[0];
        } else {
          defDate = new Date().toISOString().split('T')[0];
        }
      }
      $('deliverDateInput').value = defDate;
      const isPaidRow = !!(row.status === 'livre_paye' || row.status === 'paye' || row.paymentStatus === 'paye' || row.paymentRef || row.dpRef || row.paymentPaidDate || /pay[eé]/i.test(String(row.remarques || '')));
      if (row.status === 'clos' || row.status === 'cloture') {
        $('deliverBcStatusInput').value = 'clos';
      } else {
        $('deliverBcStatusInput').value = isPaidRow ? 'livre_paye' : 'livre';
      }
      $('deliverBlInput').value = '';
      modal.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('#cancelDeliverBcBtn, #cancelDeliverBcBtn2')) {
      const modal = $('deliverBcModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    if (e.target.id === 'deliverBcModalBackdrop') {
      e.target.classList.add('hidden');
    }
    if (e.target.closest('#confirmDeliverBcBtn')) {
      const id = $('deliverBcId').value;
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const realDate = $('deliverDateInput').value;
      if (!realDate) {
        showToast('Veuillez sélectionner une date de réalisation.');
        return;
      }
      const newStatus = $('deliverBcStatusInput').value || 'livre';
      const bl = $('deliverBlInput').value.trim();
      if (row.type === 'service') {
        row.serviceDoneDate = realDate;
        row.goodsReceivedDate = realDate;
      } else {
        row.goodsReceivedDate = realDate;
      }
      row.status = newStatus;
      if (newStatus === 'livre_paye') {
        row.paymentStatus = 'paye';
        if (!row.paymentPaidDate) row.paymentPaidDate = realDate;
        if (!/pay[eé]/i.test(String(row.remarques || ''))) {
          row.remarques = row.remarques ? (row.remarques + ' · ✓ Payé') : '✓ Payé';
        }
      }
      if (bl) {
        row.remarques = row.remarques ? (row.remarques + ' | BL: ' + bl) : ('BL: ' + bl);
      }
      row.updatedAt = new Date().toISOString();
      saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
      renderApp();
      const modal = $('deliverBcModalBackdrop');
      if (modal) modal.classList.add('hidden');
      showToast('Réalisation enregistrée pour ' + row.ref);
    }
  });

  // Mark last TH as sticky
  const lastTh = document.querySelector('.followup-table thead th:last-child');
  if (lastTh) lastTh.classList.add('actions-cell');


})();

// === FINAL INITIALIZATION ===
// Re-render the app now that all overrides are in place
if (state.session) {
  refreshFollowupFilterOptions();
  renderApp();
}

// === Theme-aware Tab label styling ===
(function forceFixTabLabels() {
  const fallbacks = {
    kpi: 'KPI',
    followup: 'Bons de Commande',
    payments: 'Paiements DP',
    'smart-match': 'Rapprochement IA',
    finance: 'Finances',
    reports: 'Rapports',
    fleet: 'Flotte & Vidanges',
    settings: 'Paramètres'
  };

  function updateTopNavBadges() {
    if (typeof document === 'undefined' || typeof state === 'undefined') return;
    const bcBadge = document.getElementById('navBadgeBc');
    const dpBadge = document.getElementById('navBadgeDp');
    const aiBadge = document.getElementById('navBadgeAi');
    if (bcBadge) bcBadge.textContent = String((state.bcRecords || []).length);
    if (dpBadge) dpBadge.textContent = String((state.payments || []).length);
    if (aiBadge) {
      let candCount = 0;
      if (window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getCandidateCountSummary === 'function') {
        candCount = window.LogicalMatchEngine.getCandidateCountSummary();
      }
      aiBadge.textContent = String(candCount);
    }
  }
  window.updateTopNavBadges = updateTopNavBadges;

  function fixTabs() {
    updateTopNavBadges();
    const isDark = (document.body && document.body.dataset && document.body.dataset.theme === 'dark') ||
      (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.theme === 'dark');
    document.querySelectorAll('.tabbar .tab, .sa-top-tabs .sa-top-tab, #tabbar button').forEach(tab => {
      const isActive = tab.classList.contains('active');
      const tabKey = tab.dataset.tab || 'kpi';

      tab.style.setProperty('border-radius', '8px', 'important');
      tab.style.setProperty('padding', '0 12px', 'important');
      tab.style.setProperty('height', '31px', 'important');
      tab.style.setProperty('font-size', '12px', 'important');
      tab.style.setProperty('white-space', 'nowrap', 'important');
      tab.style.setProperty('min-width', 'fit-content', 'important');
      tab.style.setProperty('font-weight', isActive ? '700' : '600', 'important');

      if (isActive) {
        tab.style.setProperty('background', '#2563eb', 'important');
        tab.style.setProperty('color', '#ffffff', 'important');
        tab.style.setProperty('border', isDark ? '1px solid #3b82f6' : '1px solid #2563eb', 'important');
        tab.style.setProperty('border-color', isDark ? '#3b82f6' : '#2563eb', 'important');
        tab.style.setProperty('box-shadow', isDark ? '0 3px 10px rgba(37, 99, 235, 0.45)' : '0 2px 8px rgba(37, 99, 235, 0.3)', 'important');
      } else {
        tab.style.setProperty('background', isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff', 'important');
        tab.style.setProperty('color', isDark ? '#e2e8f0' : '#1e293b', 'important');
        tab.style.setProperty('border', isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1', 'important');
        tab.style.setProperty('border-color', isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1', 'important');
        tab.style.setProperty('box-shadow', 'none', 'important');
      }

      let label = tab.querySelector('.tab-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'tab-label';
        tab.appendChild(label);
      }
      if (!label.textContent || !label.textContent.trim()) {
        label.textContent = fallbacks[tabKey] || 'KPI';
      }

      label.style.setProperty('color', isActive ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b'), 'important');
      label.style.setProperty('display', 'inline-block', 'important');
      label.style.setProperty('visibility', 'visible', 'important');
      label.style.setProperty('opacity', '1', 'important');
      label.style.setProperty('font-size', '12px', 'important');
      label.style.setProperty('font-weight', isActive ? '700' : '600', 'important');

      const icon = tab.querySelector('i, .tab-icon-badge');
      if (icon) {
        const iconColor = isActive ? '#ffffff' : (isDark ? '#94a3b8' : '#334155');
        icon.style.setProperty('color', iconColor, 'important');
        const iconSvg = icon.querySelector('svg');
        if (iconSvg) {
          iconSvg.style.setProperty('color', iconColor, 'important');
          iconSvg.style.setProperty('stroke', iconColor, 'important');
        }
      }

      const navBadge = tab.querySelector('.sa-nav-badge');
      if (navBadge) {
        navBadge.style.setProperty('display', 'inline-flex', 'important');
        navBadge.style.setProperty('align-items', 'center', 'important');
        navBadge.style.setProperty('justify-content', 'center', 'important');
        navBadge.style.setProperty('text-align', 'center', 'important');
        navBadge.style.setProperty('vertical-align', 'middle', 'important');
        navBadge.style.setProperty('line-height', '1', 'important');
        navBadge.style.setProperty('height', '19px', 'important');
        navBadge.style.setProperty('min-width', '22px', 'important');
        navBadge.style.setProperty('padding', '0 7px', 'important');
        navBadge.style.setProperty('font-size', '11px', 'important');
        navBadge.style.setProperty('font-weight', '800', 'important');
      }
    });
  }
  window.updateTabColors = fixTabs;
  fixTabs();
  document.querySelectorAll('.tab, .sa-top-tab').forEach(tab => {
    tab.addEventListener('click', () => setTimeout(fixTabs, 20));
  });
  const origRefreshAuth = window.refreshAuthUi;
  if (origRefreshAuth) {
    window.refreshAuthUi = function() { origRefreshAuth(); setTimeout(fixTabs, 100); };
  }
  const origRenderApp = window.renderApp;
  if (origRenderApp) {
    window.renderApp = function() { origRenderApp(); setTimeout(fixTabs, 50); };
    window.renderAll = window.renderApp;
  }
  const origSetActiveTab = window.setActiveTab;
  if (origSetActiveTab) {
    window.setActiveTab = function(t) { origSetActiveTab(t); fixTabs(); };
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
    try {
      new MutationObserver(() => fixTabs()).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (_) {}
  }
})();

// === Moving AI Mega Logo Engine (ERP_Douroub_v5 FX) ===
(function initAiMegaLogo() {
  var TOTAL_FX = 30;
  var headerFx = 1;
  setInterval(function() {
    var headerW = document.getElementById('headerAiWidget');
    if (!headerW || !headerW.offsetWidth) return;
    headerFx = (headerFx % TOTAL_FX) + 1;
    for (var i = 1; i <= TOTAL_FX; i++) headerW.classList.remove('ai-fx-' + i);
    headerW.classList.add('ai-fx-' + headerFx);
  }, 5000);
  window.triggerAiAction = function(el) {
    if (!el) return;
    var w = el.closest ? (el.closest('.ai-widget') || el) : el;
    var n = Math.floor(Math.random() * TOTAL_FX) + 1;
    for (var i = 1; i <= TOTAL_FX; i++) w.classList.remove('ai-fx-' + i);
    w.classList.add('ai-fx-' + n);
  };
})();

// Show/hide pin button based on active tab
(function watchTabForPinBtn() {
  const pinBtn = document.querySelector('.actions-pin-btn');
  if (!pinBtn) return;
  function updatePinVisibility() {
    const isFollowup = state.activeTab === 'followup';
    pinBtn.style.display = isFollowup ? 'flex' : 'none';
  }
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setTimeout(updatePinVisibility, 50));
  });
  updatePinVisibility();
})();

// Auto-fill login credentials
const loginUser = $('loginUsername');
const loginPass = $('loginPassword');
if (loginUser && !loginUser.value) loginUser.value = 'admin';
if (loginPass && !loginPass.value) loginPass.value = 'admin';

// Bind detail modal close
const closeDetailBtn = $('closeBcDetailModalBtn');
if (closeDetailBtn) {
  closeDetailBtn.addEventListener('click', () => {
    const backdrop = $('bcDetailModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  });
}
const detailBackdrop = $('bcDetailModalBackdrop');
if (detailBackdrop) {
  detailBackdrop.addEventListener('click', (e) => {
    if (e.target === detailBackdrop) detailBackdrop.classList.add('hidden');
  });
}

// Bind KPI filter events
['kpiDateFrom', 'kpiDateTo', 'kpiSupplierFilter', 'kpiDeptFilter', 'kpiTypeFilter'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('change', () => { if (state.activeTab === 'kpi') renderKpi(); });
});
const resetKpiBtn = $('resetKpiFiltersBtn');
if (resetKpiBtn) {
  resetKpiBtn.addEventListener('click', () => {
    ['kpiDateFrom', 'kpiDateTo'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    ['kpiSupplierFilter', 'kpiDeptFilter', 'kpiTypeFilter'].forEach(id => { const el = $(id); if (el) el.value = 'all'; });
    if (state.activeTab === 'kpi') renderKpi();
  });
}

// Bind followup dept filter change
const deptFilterEl = $('followupDeptFilter');
if (deptFilterEl) {
  deptFilterEl.addEventListener('change', () => {
    if (state.ui) {
      state.ui.isFilteredActive = false;
      state.ui.activeFilteredIds = null;
    }
    state.ui.followupPage = 1;
    renderFollowupTable();
  });
}

console.log('[app-enhancements] Initializing department management...');

// === DEPARTMENT MANAGEMENT ===
(function setupDepartmentManagement() {
  if (!state.departments) state.departments = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
  if (!state.supplierDeptMap) state.supplierDeptMap = { ...DEPT_MAP };

  function renderDeptManager() {
    const container = $('departmentsManager');
    if (!container) return;
    container.innerHTML = '';
    (state.departments || []).forEach(d => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${escapeHtml(d)} <button class="pill-remove" data-dept="${escapeHtml(d)}">&times;</button>`;
      container.appendChild(pill);
    });
    container.querySelectorAll('.pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        state.departments = state.departments.filter(d => d !== btn.dataset.dept);
        saveState(); renderDeptManager(); populateLinkDropdowns();
      });
    });
  }

  function renderSupplierDeptLinks() {
    const container = $('supplierDeptLinks');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(state.supplierDeptMap || {}).forEach(([sup, dept]) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${escapeHtml(sup)} → ${escapeHtml(dept)} <button class="pill-remove" data-sup="${escapeHtml(sup)}">&times;</button>`;
      container.appendChild(pill);
    });
    container.querySelectorAll('.pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        delete state.supplierDeptMap[btn.dataset.sup];
        saveState(); renderSupplierDeptLinks();
      });
    });
  }

  function populateLinkDropdowns() {
    const supSelect = $('linkSupplierSelect');
    const deptSelect = $('linkDeptSelect');
    if (supSelect) {
      supSelect.innerHTML = '<option value="">Choisir fournisseur</option>';
      [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort().forEach(s =>
        supSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      );
    }
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Choisir département</option>';
      (state.departments || []).forEach(d =>
        deptSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`)
      );
    }
  }

  const addDeptBtn = $('addDepartmentBtn');
  if (addDeptBtn) addDeptBtn.addEventListener('click', () => {
    const input = $('newDepartmentName');
    const name = input ? input.value.trim() : '';
    if (!name) return;
    if (!state.departments) state.departments = [];
    if (!state.departments.includes(name)) { state.departments.push(name); state.departments.sort(); saveState(); }
    if (input) input.value = '';
    renderDeptManager(); populateLinkDropdowns();
    const dl = $('departmentsList');
    if (dl) { dl.innerHTML = ''; state.departments.forEach(d => dl.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">`)); }
  });

  const linkBtn = $('linkSupplierDeptBtn');
  if (linkBtn) linkBtn.addEventListener('click', () => {
    const sup = $('linkSupplierSelect') ? $('linkSupplierSelect').value : '';
    const dept = $('linkDeptSelect') ? $('linkDeptSelect').value : '';
    if (!sup || !dept) { showToast('Choisissez un fournisseur ET un département'); return; }
    if (!state.supplierDeptMap) state.supplierDeptMap = {};
    state.supplierDeptMap[sup] = dept;
    DEPT_MAP[sup.toUpperCase()] = dept;
    saveState(); renderSupplierDeptLinks();
    showToast(sup + ' → ' + dept + ' lié avec succès');
  });

  const origFillSettings = window.fillSettingsScreen;
  window.fillSettingsScreen = function() {
    if (origFillSettings) origFillSettings();
    renderDeptManager(); renderSupplierDeptLinks(); populateLinkDropdowns();
    if (window.renderUsersSettingsTable) window.renderUsersSettingsTable();
  };
})();

// ================================================================
// 20. JSON IMPORT / EXPORT
// ================================================================
(function setupJsonImportExport() {
  const sp = document.getElementById('page-settings');
  if (!sp) return;
  const ioP = document.createElement('article');
  ioP.className = 'panel';
  ioP.innerHTML = `
    <div class="panel-title-row"><h3>Données JSON — Import / Export</h3></div>
    <p style="font-size:0.8rem;color:var(--muted);margin-bottom:0.75rem;">Importez un fichier JSON pour charger vos données. Exportez pour sauvegarder ou transférer.</p>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
      <button class="btn btn-primary" id="importJsonBtn" type="button">Importer JSON</button>
      <button class="btn btn-soft" id="exportJsonBtn" type="button">Exporter JSON</button>
      <input type="file" id="jsonFileInput" accept=".json" style="display:none;" />
      <span id="importStatus" style="font-size:0.75rem;color:var(--muted);"></span>
    </div>`;
  sp.appendChild(ioP);

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const d = { bcRecords: state.bcRecords, payments: state.payments||[], suppliers: state.suppliers||[], requesters: state.requesters||[], departments: state.departments||[], supplierDeptMap: state.supplierDeptMap||{}, stockItems: state.stockItems||[], stockLogs: state.stockLogs||[], holidays: state.holidays||[], settings: state.settings||{}, exportDate: new Date().toISOString(), version: 'suivi-achats-premium-v2' };
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'suivi_export_' + new Date().toISOString().split('T')[0] + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    showToast('Export JSON téléchargé !');
  });

  document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('jsonFileInput').click());
  document.getElementById('jsonFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const st = document.getElementById('importStatus'); st.textContent = 'Lecture...';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let imp = 0;
        let upd = 0;
        if (Array.isArray(data.bcRecords)) {
          const existingByKey = new Map();
          state.bcRecords.forEach((r, idx) => {
            const k = getBcDedupKey(r.ref, r) || r.id;
            if (k && !existingByKey.has(k)) existingByKey.set(k, idx);
          });
          data.bcRecords.forEach(rec => {
            const n = window.normalizeBcRecord(rec);
            const k = getBcDedupKey(n.ref, n) || n.id;
            if (k && existingByKey.has(k)) {
              const targetIdx = existingByKey.get(k);
              state.bcRecords[targetIdx] = mergeBcPreservingStatus(state.bcRecords[targetIdx], n, false);
              upd++;
            } else {
              state.bcRecords.push(n);
              if (k) existingByKey.set(k, state.bcRecords.length - 1);
              imp++;
            }
          });
        }
        if (Array.isArray(data.payments)) {
          const payKeys = new Set(state.payments.map(p => p.paymentRef || p.id).filter(Boolean));
          data.payments.forEach(p => {
            const normP = typeof normalizePayment === 'function' ? normalizePayment(p) : p;
            const pk = normP.paymentRef || normP.id;
            if (pk && !payKeys.has(pk)) {
              state.payments.push(normP);
              payKeys.add(pk);
            }
          });
        }
        if (data.suppliers) { const s = new Set(state.suppliers.map(x => typeof x==='object'?x.name:x)); data.suppliers.forEach(x => { const n=typeof x==='object'?x.name:x; if(n && !s.has(n)){ state.suppliers.push(typeof x === "object" ? x : { id: "sup_" + Math.random().toString(36).substr(2, 6), name: n }); s.add(n); } }); }
        if (data.requesters) { const r = new Set(state.requesters.map(x => typeof x==='object'?x.name:x)); data.requesters.forEach(x => { const n=typeof x==='object'?x.name:x; if(n && !r.has(n)){ state.requesters.push(typeof x === "object" ? x : { id: "req_" + Math.random().toString(36).substr(2, 6), name: n }); r.add(n); } }); }
        if (data.departments) { data.departments.forEach(d => { if (!state.departments.includes(d)) state.departments.push(d); }); }
        if (data.supplierDeptMap) { state.supplierDeptMap = Object.assign(state.supplierDeptMap||{}, data.supplierDeptMap); }
        state.settings.bcSequence = Math.max(state.settings.bcSequence || 1, highestBcSequence() + 1);
        state.settings.daSequence = Math.max(state.settings.daSequence || 1, highestDaSequence() + 1);
        saveState();
        if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
          window.bcBridge.syncBcToServer();
        }
        refreshFollowupFilterOptions();
        renderApp();
        st.textContent = '\u2713 ' + imp + ' nouveaux BC' + (upd ? ' (' + upd + ' mis à jour)' : '') + ', ' + state.bcRecords.length + ' total';
        st.style.color = '#16a34a';
        showToast('Import réussi ! ' + imp + ' nouveaux enregistrements' + (upd ? ' (' + upd + ' fusionnés)' : '') + '.');
      } catch (err) { st.textContent = '\u2717 Erreur: ' + err.message; st.style.color = '#dc2626'; }
    };
    reader.readAsText(file); e.target.value = '';
  });
})();

// ================================================================
// 21. DOUBLE-CLICK FULLSCREEN FOR CHARTS
// ================================================================
(function setupChartFullscreen() {
  const ov = document.createElement('div');
  ov.id = 'chartFullscreenOverlay';
  ov.innerHTML = '<div id="chartFullscreenContent"></div><div id="chartFullscreenClose">\u2715 Fermer (Echap)</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.id === 'chartFullscreenClose') ov.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ov.classList.remove('active'); });
  document.addEventListener('dblclick', (e) => {
    const panel = e.target.closest('.chart-panel, .fleet-card, .fleet-chart-panel');
    if (!panel) return;
    document.getElementById('chartFullscreenContent').innerHTML = panel.outerHTML;
    ov.classList.add('active');
  });
})();

console.log('[app-enhancements] Full enhancement layer loaded. Records: ' + state.bcRecords.length);

// Override fillReferenceLists to prevent localeCompare crash
window.fillReferenceLists = function() {
  const safeSort = (a, b) => {
    const nameA = String(typeof a === 'object' ? (a.name || '') : a);
    const nameB = String(typeof b === 'object' ? (b.name || '') : b);
    return nameA.localeCompare(nameB);
  };
  const formatOpt = (x) => {
    const n = typeof x === 'object' ? (x.name || '') : x;
    return '<option value="' + escapeHtml(n) + '"></option>';
  };
  const supEl = document.getElementById('suppliersList');
  if (supEl) supEl.innerHTML = (state.suppliers||[]).slice().sort(safeSort).map(formatOpt).join('');
  const reqEl = document.getElementById('requestersList');
  if (reqEl) reqEl.innerHTML = (state.requesters||[]).slice().sort(safeSort).map(formatOpt).join('');
};

const origRenderReferenceManagers = window.renderReferenceManagers;
window.renderReferenceManagers = function() {
  if (origRenderReferenceManagers) origRenderReferenceManagers();
  const supEl = document.getElementById('settingsSuppliersList');
  if (supEl) {
    supEl.innerHTML = (state.suppliers && state.suppliers.length)
      ? state.suppliers.slice().sort((a,b) => String(typeof a==='object'?a.name:a).localeCompare(String(typeof b==='object'?b.name:b))).map(s => {
          const n = typeof s === 'object' ? s.name : s;
          const id = typeof s === 'object' ? s.id : s;
          return '<li><span class="ref-name">' + escapeHtml(n) + '</span><button type="button" class="icon-btn text-danger" data-remove-supplier="' + escapeHtml(id) + '">×</button></li>';
        }).join('')
      : '<li class="muted">Aucun fournisseur.</li>';
  }
};

// ================================================================
// USER MANAGEMENT & USER SETTINGS SUITE (APPRO MODULE)
// ================================================================
window.renderUsersSettingsTable = function() {
  const tbody = document.getElementById('usersSettingsTableBody');
  if (!tbody) return;
  const users = (typeof state !== 'undefined' && Array.isArray(state.users)) ? state.users : [];
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:12px;">Aucun utilisateur configuré.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const roleBadge = u.role === 'admin' ? 'style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : (u.role === 'procurement' ? 'style="background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : (u.role === 'stock' ? 'style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : 'style="background:rgba(148,163,184,0.15);color:#64748b;font-weight:700;padding:2px 8px;border-radius:4px;"'));
    const roleLabel = {
      admin: 'Administrateur (Dual)',
      procurement: 'Acheteur / Appro',
      finance: 'Finance / Trésorerie',
      stock: 'Magasinier / Stock',
      management: 'Direction Générale'
    }[u.role] || u.role;

    return `
      <tr>
        <td><strong>👤 ${escapeHtml(u.username)}</strong></td>
        <td><span ${roleBadge}>${roleLabel}</span></td>
        <td><code>••••••••</code></td>
        <td style="text-align:right;">
          <button class="btn btn-soft" type="button" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="showUserModal('${escapeHtml(u.username)}')" title="Modifier les paramètres de cet utilisateur">⚙️ Paramètres</button>
          ${u.username !== 'admin' ? `<button class="btn btn-ghost" type="button" style="padding:0.25rem 0.4rem;font-size:0.75rem;color:#ef4444;" onclick="deleteUserFromSettings('${escapeHtml(u.username)}')" title="Supprimer cet utilisateur">🗑️</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
};

window.showUserModal = function(username) {
  const modal = document.getElementById('userEditModalBackdrop');
  if (!modal) return;
  const user = (typeof state !== 'undefined' && Array.isArray(state.users))
    ? state.users.find(u => u.username === username)
    : null;

  const origInput = document.getElementById('userModalOriginalUsername');
  const userInput = document.getElementById('userModalUsername');
  const passInput = document.getElementById('userModalPassword');
  const roleInput = document.getElementById('userModalRole');
  const titleEl = document.getElementById('userModalTitle');

  if (origInput) origInput.value = user ? user.username : '';
  if (userInput) userInput.value = user ? user.username : '';
  if (passInput) passInput.value = '';
  if (roleInput) roleInput.value = user ? user.role : 'procurement';
  if (titleEl) titleEl.textContent = user ? `Paramètres : ${user.username}` : 'Nouvel Utilisateur';
  modal.classList.remove('hidden');
};

window.closeUserModal = function() {
  const modal = document.getElementById('userEditModalBackdrop');
  if (modal) modal.classList.add('hidden');
};

window.saveUserModal = function() {
  const origInput = document.getElementById('userModalOriginalUsername');
  const userInput = document.getElementById('userModalUsername');
  const passInput = document.getElementById('userModalPassword');
  const roleInput = document.getElementById('userModalRole');

  const origUsername = origInput ? origInput.value.trim() : '';
  const newUsername = userInput ? userInput.value.trim() : '';
  const newPassword = passInput ? passInput.value.trim() : '';
  const newRole = roleInput ? roleInput.value : 'procurement';

  if (!newUsername) {
    if (typeof showToast === 'function') showToast('Identifiant requis.');
    return;
  }

  if (!Array.isArray(state.users)) state.users = [];

  if (origUsername) {
    const u = state.users.find(x => x.username === origUsername);
    if (u) {
      u.username = newUsername;
      if (newPassword) u.password = newPassword;
      u.role = newRole;
      if (state.session && state.session.username === origUsername) {
        state.session.username = newUsername;
        state.session.role = newRole;
        if (typeof refreshAuthUi === 'function') refreshAuthUi();
      }
    }
  } else {
    if (state.users.some(x => x.username === newUsername)) {
      if (typeof showToast === 'function') showToast('Cet identifiant existe déjà.');
      return;
    }
    state.users.push({
      username: newUsername,
      password: newPassword || '123456',
      role: newRole
    });
  }

  if (typeof saveState === 'function') saveState();
  closeUserModal();
  renderUsersSettingsTable();
  if (typeof showToast === 'function') showToast('Paramètres utilisateur enregistrés avec succès.');
};

window.deleteUserFromSettings = function(username) {
  if (username === 'admin') {
    if (typeof showToast === 'function') showToast('Impossible de supprimer le compte administrateur principal.');
    return;
  }
  if (confirm(`Supprimer définitivement le compte utilisateur "${username}" ?`)) {
    state.users = (state.users || []).filter(u => u.username !== username);
    if (typeof saveState === 'function') saveState();
    renderUsersSettingsTable();
    if (typeof showToast === 'function') showToast('Utilisateur supprimé.');
  }
};

// Wire user modal controls (do NOT attach showUserModal to #userChipWrap, which opens #userProfileCard GDS dropdown)
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addNewUserBtn');
  if (addBtn) addBtn.addEventListener('click', () => showUserModal());

  const closeBtn = document.getElementById('closeUserModalBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeUserModal);

  const cancelBtn = document.getElementById('cancelUserModalBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeUserModal);
});

// App Router Helpers
window.App = window.App || {};
window.App.navigate = function(tab) {
  if (typeof setActiveTab === 'function') setActiveTab(tab);
};
window.App.showSettings = function() {
  if (typeof setActiveTab === 'function') setActiveTab('settings');
};
window.App.showUserModal = function(u) {
  showUserModal(u || (typeof state !== 'undefined' && state.session ? state.session.username : 'admin'));
};
window.App.showUserSettings = function(u) {
  showUserModal(u || (typeof state !== 'undefined' && state.session ? state.session.username : 'admin'));
};

// Initialize multi-select supplier dropdown on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    refreshSupplierMultiSelectOptions();
    renderUsersSettingsTable();
  });
} else {
  refreshSupplierMultiSelectOptions();
  renderUsersSettingsTable();
}

// GDS Stock Mobile Scanner Inter-App Bridge
window.openGdsStockScanner = function() {
  window.location.href = '../ERP_Douroub_v5/index.html?scan_gds=1';
};






  // Wire Purge All BCs button for manual construction
  const purgeBtn = document.getElementById('purgeAllBcsBtn');
  if (purgeBtn && !purgeBtn._hasPurgeListener) {
    purgeBtn._hasPurgeListener = true;
    purgeBtn.addEventListener('click', async () => {
      const ok = confirm('Êtes-vous sûr de vouloir vider TOUS les Bons de Commande ?\n\nCette action efface la base de données BC et réinitialise le tableau à zéro (les 155 DP Paiements sont conservés).');
      if (!ok) return;
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
        window.bcBridge.cancelPendingSync();
      }
      if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
        try {
          await fetch('/api/bc/purge-all', { method: 'POST' }).catch(() => {});
        } catch (_) {}
      }
      state.bcRecords = [];
      if (state.ui) {
        state.ui.isFilteredActive = false;
        state.ui.activeFilteredIds = null;
      }
      if (window.selectedFollowupBcIds) window.selectedFollowupBcIds.clear();
      (state.payments || []).forEach(p => {
        p.bcId = '';
        p.linkedBcIds = [];
        p.linkedBcRefs = [];
      });
      try {
        localStorage.removeItem('suivi_achats_bcrecords');
        localStorage.removeItem('sde_suivi_state');
        localStorage.removeItem('sde_suivi_records');
        localStorage.removeItem('sde_bc_records');
        localStorage.removeItem('erp_douroub_bc_cache');
        localStorage.removeItem('suivi_compact_v20');
        localStorage.removeItem('suivi_local_v12');
        localStorage.removeItem('suivi_local_v11');
      } catch (_) {}
      if (typeof saveState === 'function') saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
        window.bcBridge.cancelPendingSync();
      }
      renderApp();
      if (typeof updateFollowupBulkBar === 'function') updateFollowupBulkBar();
      showToast('Base BC entièrement vidée. Vous pouvez commencer la création manuelle.');
    });
  }


// === BULK SELECTION & BULK ACTIONS LOGIC ===
if (typeof window !== 'undefined') {
  window.selectedFollowupBcIds = window.selectedFollowupBcIds || new Set();
}

function updateFollowupBulkBar() {
  const bar = $('followupBulkActionBar');
  const countEl = $('followupSelectedCount');
  const selectAll = $('selectAllFollowupBcs');
  const existingIdSet = new Set((state.bcRecords || []).map(r => r.id));
  if (window.selectedFollowupBcIds) {
    Array.from(window.selectedFollowupBcIds).forEach(id => {
      if (!existingIdSet.has(id)) window.selectedFollowupBcIds.delete(id);
    });
  }
  const count = (window.selectedFollowupBcIds && window.selectedFollowupBcIds.size) ? window.selectedFollowupBcIds.size : 0;
  if (countEl) countEl.textContent = count;
  if (bar) {
    bar.style.display = count > 0 ? 'flex' : 'none';
  }
  const filtered = typeof filteredBcRecords === 'function' ? filteredBcRecords() : [];
  if (selectAll && filtered.length > 0) {
    const selectedFilteredCount = filtered.filter(r => window.selectedFollowupBcIds && window.selectedFollowupBcIds.has(r.id)).length;
    selectAll.checked = selectedFilteredCount === filtered.length;
    selectAll.indeterminate = selectedFilteredCount > 0 && selectedFilteredCount < filtered.length;
  } else if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
}

function bindFollowupBulkEvents() {
  const selectAll = $('selectAllFollowupBcs');
  if (selectAll) {
    selectAll.onchange = (e) => {
      const isChecked = e.target.checked;
      const filtered = typeof filteredBcRecords === 'function' ? filteredBcRecords() : [];
      filtered.forEach(r => {
        if (!r || !r.id) return;
        if (isChecked) window.selectedFollowupBcIds.add(r.id);
        else window.selectedFollowupBcIds.delete(r.id);
      });
      document.querySelectorAll('.followup-row-cb').forEach(cb => {
        const id = cb.getAttribute('data-id');
        if (id) cb.checked = window.selectedFollowupBcIds.has(id);
      });
      updateFollowupBulkBar();
    };
  }

  document.querySelectorAll('.followup-row-cb').forEach(cb => {
    cb.onchange = (e) => {
      const id = e.target.getAttribute('data-id');
      if (id) {
        if (e.target.checked) window.selectedFollowupBcIds.add(id);
        else window.selectedFollowupBcIds.delete(id);
      }
      updateFollowupBulkBar();
    };
  });
}

function setupBulkActionButtons() {
  const isHttp = () => (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http'));

  // 1. Bulk Close BCs
  const closeBtn = $('bulkCloseBcsBtn');
  if (closeBtn && !closeBtn._bound) {
    closeBtn._bound = true;
    closeBtn.addEventListener('click', async () => {
      const ids = Array.from(window.selectedFollowupBcIds || []);
      if (!ids.length) return;
      if (!confirm('Confirmer la clôture de ' + ids.length + ' bon(s) de commande sélectionné(s) ?')) return;
      const idSet = new Set(ids);
      const today = new Date().toISOString().split('T')[0];
      let closedCount = 0;
      state.bcRecords.forEach(bc => {
        if (idSet.has(bc.id)) {
          bc.status = 'clos';
          if (!bc.goodsReceivedDate && !bc.serviceDoneDate) {
            if (bc.type === 'service') bc.serviceDoneDate = bc.date || today;
            else bc.goodsReceivedDate = bc.date || today;
          }
          bc.updatedAt = new Date().toISOString();
          closedCount++;
          if (isHttp()) {
            fetch('/api/bc/' + encodeURIComponent(bc._id || bc.id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'clos', goodsReceivedDate: bc.goodsReceivedDate, serviceDoneDate: bc.serviceDoneDate, updatedAt: bc.updatedAt })
            }).catch(() => {});
          }
        }
      });
      if (typeof saveState === 'function') saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
      window.selectedFollowupBcIds.clear();
      renderApp();
      updateFollowupBulkBar();
      if (typeof showToast === 'function') showToast('✅ ' + closedCount + ' bon(s) de commande clôturé(s) avec succès !');
    });
  }

  // 2. Bulk Mark Delivered & Paid
  const livrePayeBtn = $('bulkMarkLivrePayeBtn');
  if (livrePayeBtn && !livrePayeBtn._bound) {
    livrePayeBtn._bound = true;
    livrePayeBtn.addEventListener('click', async () => {
      const ids = Array.from(window.selectedFollowupBcIds || []);
      if (!ids.length) return;
      if (!confirm('Marquer ' + ids.length + ' bon(s) de commande comme Livré & Payé ?')) return;
      const idSet = new Set(ids);
      const today = new Date().toISOString().split('T')[0];
      let updatedCount = 0;
      state.bcRecords.forEach(bc => {
        if (idSet.has(bc.id)) {
          bc.status = 'livre_paye';
          if (!bc.goodsReceivedDate && !bc.serviceDoneDate) {
            if (bc.type === 'service') bc.serviceDoneDate = bc.date || today;
            else bc.goodsReceivedDate = bc.date || today;
          }
          bc.paymentStatus = 'paye';
          if (!bc.paymentPaidDate) bc.paymentPaidDate = bc.date || today;
          if (!/pay[eé]/i.test(String(bc.remarques || ''))) {
            bc.remarques = bc.remarques ? (bc.remarques + ' · ✓ Payé') : '✓ Payé';
          }
          bc.updatedAt = new Date().toISOString();
          updatedCount++;
          if (isHttp()) {
            fetch('/api/bc/' + encodeURIComponent(bc._id || bc.id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'livre_paye', paymentStatus: 'paye', paymentPaidDate: bc.paymentPaidDate, goodsReceivedDate: bc.goodsReceivedDate, serviceDoneDate: bc.serviceDoneDate, remarques: bc.remarques, updatedAt: bc.updatedAt })
            }).catch(() => {});
          }
        }
      });
      if (typeof saveState === 'function') saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
      window.selectedFollowupBcIds.clear();
      renderApp();
      updateFollowupBulkBar();
      if (typeof showToast === 'function') showToast('✅ ' + updatedCount + ' bon(s) de commande marqué(s) Livré & Payé !');
    });
  }

  // 3. Bulk Mark Delivered
  const livreBtn = $('bulkMarkLivreBtn');
  if (livreBtn && !livreBtn._bound) {
    livreBtn._bound = true;
    livreBtn.addEventListener('click', async () => {
      const ids = Array.from(window.selectedFollowupBcIds || []);
      if (!ids.length) return;
      if (!confirm('Marquer ' + ids.length + ' bon(s) de commande comme Livré / Réceptionné ?')) return;
      const idSet = new Set(ids);
      const today = new Date().toISOString().split('T')[0];
      let updatedCount = 0;
      state.bcRecords.forEach(bc => {
        if (idSet.has(bc.id)) {
          const alreadyPaid = !!(bc.status === 'livre_paye' || bc.status === 'paye' || bc.paymentStatus === 'paye' || bc.paymentRef || bc.dpRef || bc.paymentPaidDate || /pay[eé]/i.test(String(bc.remarques || '')));
          if (bc.status !== 'clos' && bc.status !== 'cloture') {
            bc.status = alreadyPaid ? 'livre_paye' : 'livre';
          }
          if (!bc.goodsReceivedDate && !bc.serviceDoneDate) {
            if (bc.type === 'service') bc.serviceDoneDate = bc.date || today;
            else bc.goodsReceivedDate = bc.date || today;
          }
          bc.updatedAt = new Date().toISOString();
          updatedCount++;
          if (isHttp()) {
            fetch('/api/bc/' + encodeURIComponent(bc._id || bc.id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: bc.status, goodsReceivedDate: bc.goodsReceivedDate, serviceDoneDate: bc.serviceDoneDate, updatedAt: bc.updatedAt })
            }).catch(() => {});
          }
        }
      });
      if (typeof saveState === 'function') saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
      window.selectedFollowupBcIds.clear();
      renderApp();
      updateFollowupBulkBar();
      if (typeof showToast === 'function') showToast('✅ ' + updatedCount + ' bon(s) de commande marqué(s) Livré !');
    });
  }

  // 4. Bulk Delete
  const delBtn = $('bulkDeleteBcsBtn');
  if (delBtn && !delBtn._bound) {
    delBtn._bound = true;
    delBtn.addEventListener('click', async () => {
      const ids = Array.from(window.selectedFollowupBcIds || []);
      if (!ids.length) return;
      if (!confirm('⚠️ Supprimer définitivement ces ' + ids.length + ' bon(s) de commande ?')) return;

      const idSet = new Set(ids);
      const targets = state.bcRecords.filter(bc => idSet.has(bc.id));
      const refSet = new Set(targets.map(t => t.ref).filter(Boolean));
      const allDeleteIds = Array.from(new Set([
        ...ids,
        ...targets.map(t => t._id).filter(Boolean).map(String),
        ...targets.map(t => t.id).filter(Boolean).map(String)
      ]));
      const allDeleteRefs = Array.from(refSet);

      state.bcRecords = state.bcRecords.filter(bc => !idSet.has(bc.id));
      if (state.ui && Array.isArray(state.ui.activeFilteredIds)) {
        state.ui.activeFilteredIds = state.ui.activeFilteredIds.filter(x => !idSet.has(x));
      }
      (state.payments || []).forEach(p => {
        if (p.bcId && idSet.has(p.bcId)) p.bcId = '';
        if (Array.isArray(p.linkedBcIds)) p.linkedBcIds = p.linkedBcIds.filter(x => !idSet.has(x));
        if (refSet.size && Array.isArray(p.linkedBcRefs)) p.linkedBcRefs = p.linkedBcRefs.filter(r => !refSet.has(r));
      });

      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
        window.bcBridge.cancelPendingSync();
      }
      if (typeof saveState === 'function') saveState();
      if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
        window.bcBridge.cancelPendingSync();
      }

      if (isHttp()) {
        try {
          const res = await fetch('/api/bc/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: allDeleteIds, refs: allDeleteRefs })
          });
          if (!res.ok) throw new Error('bulk-delete fallback');
        } catch (_) {
          targets.forEach(t => {
            const apiId = encodeURIComponent(t._id || t.id);
            const apiRef = encodeURIComponent(t.ref || '');
            fetch(`/api/bc/${apiId}?ref=${apiRef}`, { method: 'DELETE' }).catch(() => {});
          });
        }
      }

      window.selectedFollowupBcIds.clear();
      renderApp();
      updateFollowupBulkBar();
      if (typeof showToast === 'function') showToast('🗑️ ' + targets.length + ' bon(s) de commande supprimé(s).');
    });
  }

  // 5. Deselect All
  const deselectBtn = $('bulkDeselectAllBtn');
  if (deselectBtn && !deselectBtn._bound) {
    deselectBtn._bound = true;
    deselectBtn.addEventListener('click', () => {
      window.selectedFollowupBcIds.clear();
      renderFollowupTable();
      updateFollowupBulkBar();
    });
  }
}


/* === FLEET ANALYZER (MERGED) === */

(function() {
    // 1. Set Maghreb Truck & maintenance suppliers to type 'service'
    const transportServiceSuppliers = ['MAGHREB TRUCK', 'MTC', 'SINOTRUK', 'SODIKIT'];
    if (window.state && window.state.bcRecords) {
        window.state.bcRecords.forEach(record => {
            if (record.supplierName && transportServiceSuppliers.some(s => record.supplierName.toUpperCase().includes(s))) {
                record.type = 'service';
            }
        });
    }

    // 2. Enrich departments
    const newDepartments = [
        'Structure Transport',
        'Direction Générale',
        'Direction Administrative',
        'Direction Technique',
        'Parc Roulant',
        'Magasin',
        'Laboratoire'
    ];
    if (window.state && window.state.departments) {
        newDepartments.forEach(dept => {
            if (!window.state.departments.includes(dept)) {
                window.state.departments.push(dept);
            }
        });
    }
})();

// Intelligent Fleet Parsing Function (plates, chassis numbers, brand, services, km)
const FLEET_BRAND_RULES = [
    { label: 'MAN TGS', re: /\b(?:MAN|TGS|TGX|TGA)\b/ },
    { label: 'HOWO Sinotruk', re: /\b(?:HOWO|SINOTRUK)\b/ },
    { label: 'FIAT Doblo', re: /\b(?:DOBLO|FIAT)\b/ },
    { label: 'ISUZU NPR', re: /\b(?:ISUZU|NPR)\b/ },
    { label: 'Hyundai HD', re: /\b(?:HYUNDAI|HD\d{0,3})\b/ },
    { label: 'Renault Kerax', re: /\b(?:RENAULT|KERAX)\b/ },
    { label: 'Mercedes Actros', re: /\b(?:ACTROS|MERCEDES)\b/ },
    { label: 'Shacman', re: /\bSHACMAN\b/ }
];

// Ordered by priority: the first matching rule becomes the primary serviceType.
const FLEET_SERVICE_RULES = [
    { label: 'Vidange', re: /VIDANG|REVISION/ },
    { label: 'Freinage & Plaquettes', re: /PLAQUETTE|FREIN|DISQUE|\bF\/P\b|\bPLAQ\b/ },
    { label: 'Garnitures de frein', re: /GARNITURE/ },
    { label: 'Filtres & Huile', re: /FILTRE|\bHUILE/ },
    { label: 'Pneumatiques', re: /PNEU/ },
    { label: 'Suspension', re: /AMORTISSEUR|SUSPENSION|RESSORT/ }
];

function normalizeFleetText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

// Same plate written "112-525-07", "000112 525 07" or "000112/525/07" => one canonical "000112-525-07".
function extractFleetPlates(upper) {
    const plates = [];
    const re = /\b(\d{5,6})[-\s./](\d{2,3})[-\s./](\d{2})\b/g;
    let m;
    while ((m = re.exec(upper)) !== null) {
        const plate = m[1].padStart(6, '0') + '-' + m[2] + '-' + m[3];
        if (plates.indexOf(plate) === -1) plates.push(plate);
    }
    return plates;
}

// Chassis / VIN: either introduced by a label (CHASSIS, VIN, N° SERIE) or a bare 17-char VIN.
function extractFleetChassis(upper) {
    const found = [];
    const add = (raw) => {
        const v = String(raw || '').replace(/[^A-Z0-9]/g, '');
        if (v.length >= 6 && /\d/.test(v) && /[A-Z]/.test(v) && found.indexOf(v) === -1) found.push(v);
    };
    const labelled = /(?:CHASSIS|VIN|N\s*°?\s*SERIE|NUM(?:ERO)?\s*(?:DE\s*)?SERIE)\s*(?:N\s*°?\s*|NUM(?:ERO)?\s*)?[:#.\-]?\s*([A-Z0-9]{6,20})\b/g;
    let m;
    while ((m = labelled.exec(upper)) !== null) add(m[1]);
    const bareVin = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
    while ((m = bareVin.exec(upper)) !== null) add(m[0]);
    return found;
}

function parseFleetRemarque(remarques) {
    if (!remarques) return null;
    const upperRem = normalizeFleetText(remarques);

    // 1. Truck identity: plates first, then chassis numbers
    const plates = extractFleetPlates(upperRem);
    const chassisList = extractFleetChassis(upperRem);

    // 2. Brand & Model Detection (whole words only: "DEMANDE" must never match "MAN")
    let brand = 'Autre Véhicule';
    for (const rule of FLEET_BRAND_RULES) {
        if (rule.re.test(upperRem)) { brand = rule.label; break; }
    }

    const hasFleetKeyword = /TRACTEUR|CAMION|REMORQUE|VEHICULE|FOURGON|BENNE|CITERNE|VIDANG|PLAQUETTE|FREIN/.test(upperRem);
    if (!plates.length && !chassisList.length && brand === 'Autre Véhicule' && !hasFleetKeyword) {
        return null;
    }

    // 3. Service types (a BC can mention several: vidange + plaquettes)
    const services = FLEET_SERVICE_RULES.filter(rule => rule.re.test(upperRem)).map(rule => rule.label);
    const serviceType = services.length ? services[0] : 'Entretien Général';

    // 4. KM Reading (plates removed first so "...-07 125 000 KM" is not read as 07125000)
    let kmReading = null;
    const kmText = plates.length ? upperRem.replace(/\b\d{5,6}[-\s./]\d{2,3}[-\s./]\d{2}\b/g, ' ') : upperRem;
    const kmMatch = kmText.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})\s*KMS?\b/);
    if (kmMatch) {
        kmReading = parseInt(kmMatch[1].replace(/[.\s]/g, ''), 10);
    }

    // 5. Mileage Tier
    let mileageTier = 'Non renseigné';
    let tierBadgeClass = 'bg-secondary';
    if (kmReading !== null) {
        if (kmReading < 10000) {
            mileageTier = '5 000 – 10 000 km';
            tierBadgeClass = 'bg-success';
        } else if (kmReading <= 30000) {
            mileageTier = '10 000 – 30 000 km';
            tierBadgeClass = 'bg-info text-dark';
        } else if (kmReading <= 60000) {
            mileageTier = '30 000 – 60 000 km';
            tierBadgeClass = 'bg-primary';
        } else if (kmReading <= 80000) {
            mileageTier = '60 000 – 80 000 km';
            tierBadgeClass = 'bg-warning text-dark';
        } else {
            mileageTier = '80 000+ km (Majeur)';
            tierBadgeClass = 'bg-danger text-white';
        }
    }

    // 6. Devis Ref
    let devisRef = null;
    const devisMatch = upperRem.match(/DEVIS\s*([A-Z0-9_-]+)/i);
    if (devisMatch) {
        devisRef = devisMatch[1];
    }

    const identified = plates.length > 0 || chassisList.length > 0;
    return {
        identified,
        serviceType,
        services: services.length ? services : [serviceType],
        brand,
        kmReading,
        mileageTier,
        tierBadgeClass,
        plates,
        chassisList,
        plate: plates[0] || '',
        chassis: chassisList[0] || '',
        truckId: plates[0] || chassisList[0] || (brand !== 'Autre Véhicule' ? 'Non identifié · ' + brand : 'Non identifié'),
        devisRef: devisRef || 'N/A'
    };
}

// Helpers
const _formatMoney = window.formatMoney || ((val) => `${Number(val || 0).toLocaleString('fr-FR')} DZD`);
const _escapeHtml = window.escapeHtml || ((str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
});
const _formatDate = window.formatDate || ((d) => {
    if (!d) return '-';
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('fr-FR');
    } catch(e) { return String(d); }
});

// =============================================================================
// MAIN FLEET ANALYZER & SUIVI VIDANGES CONTROLLER
// =============================================================================
window.FleetAnalyzer = {
    currentTier: 'all',
    currentBrand: 'all',
    currentService: 'all',
    searchTerm: '',
    currentPage: 1,
    pageSize: 10,
    activeTab: 'summary', // 'summary' or 'logs'

    setServiceFilter: function(service) {
        this.currentService = service;
        this.renderModalContent();
    },

    openModal: function() {
        this.ensureModalContainer();
        const backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.style.display = 'flex';
            this.renderModalContent();
        }
    },

    closeModal: function() {
        const backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.style.display = 'none';
        }
    },

    ensureModalContainer: function() {
        let backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'fleetMaintenanceModalBackdrop';
            backdrop.className = 'modal-backdrop hidden';
            backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;';
            backdrop.innerHTML = `
                <div class="modal large-modal" style="background:#ffffff;border-radius:14px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:1200px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #cbd5e1;">
                    <div class="modal-head" style="padding:1.1rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:10px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 1px 3px rgba(37,99,235,0.2);">
                                <i class="fas fa-truck-moving"></i>
                            </div>
                            <div>
                                <h3 style="margin:0;font-size:1.18rem;font-weight:800;color:#0f172a;">Suivi Entretien & Vidanges Flotte</h3>
                                <p style="margin:0;font-size:0.82rem;color:#64748b;">Tableau de bord de maintenance camions, périodicité kilométrique, fournisseurs et BC associés</p>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button class="btn btn-sm btn-outline-success fw-bold" onclick="FleetAnalyzer.exportExcel()" title="Exporter en Excel"><i class="fas fa-file-excel me-1"></i> Exporter</button>
                            <button class="icon-btn" onclick="FleetAnalyzer.closeModal()" style="background:none;border:none;font-size:1.6rem;color:#64748b;cursor:pointer;line-height:1;padding:0 6px;">&times;</button>
                        </div>
                    </div>
                    <div id="fleetModalBody" class="modal-body" style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;background:#fafbfc;"></div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) FleetAnalyzer.closeModal();
            });
        }
    },

    fleetSourceText: function(r) {
        const parts = [r.remarques, r.comments, r.notes, r.description, r.truckPlate, r.truckVin];
        const items = Array.isArray(r.lineItems) ? r.lineItems : (Array.isArray(r.items) ? r.items : []);
        items.forEach(it => { if (it) parts.push(it.description || it.designation || it.name || it.label); });
        return parts.filter(Boolean).join(' | ');
    },

    getRecords: function() {
        const records = (window.state && Array.isArray(window.state.bcRecords)) ? window.state.bcRecords : [];
        const parsed = [];
        records.forEach(r => {
            const p = parseFleetRemarque(this.fleetSourceText(r));
            if (!p) return;
            // One entry per vehicle named in the BC, so every truck gets its own history
            const targets = p.plates.length ? p.plates : (p.chassisList.length ? p.chassisList : [null]);
            targets.forEach((target, idx) => {
                const plate = p.plates.length ? target : '';
                let chassis = '';
                if (p.plates.length) {
                    chassis = p.chassisList.length === p.plates.length
                        ? p.chassisList[idx]
                        : (p.plates.length === 1 ? (p.chassisList[0] || '') : '');
                } else if (target) {
                    chassis = target;
                }
                parsed.push({
                    ...r,
                    fleetData: { ...p, plate, chassis, truckId: plate || chassis || p.truckId, shareCount: targets.length }
                });
            });
        });
        return parsed;
    },

    getTruckSummary: function(records) {
        // A chassis written next to a plate once is the same truck everywhere it appears alone
        const chassisToPlate = {};
        records.forEach(r => {
            const fd = r.fleetData;
            if (fd.plate && fd.chassis) chassisToPlate[fd.chassis] = fd.plate;
        });
        const trucks = {};
        records.forEach(r => {
            const fd = r.fleetData;
            const tId = fd.plate || chassisToPlate[fd.chassis] || fd.chassis || fd.truckId;
            const share = Math.max(1, fd.shareCount || 1);
            const amount = Number(r.amountTTC || r.amount || 0) / share;
            const services = Array.isArray(fd.services) && fd.services.length ? fd.services : [fd.serviceType];
            const isVidange = services.includes('Vidange');
            const isBrake = services.includes('Freinage & Plaquettes') || services.includes('Garnitures de frein');
            const date = r.date || '';
            if (!trucks[tId]) {
                trucks[tId] = {
                    truckId: tId, chassis: '', brand: 'Autre Véhicule',
                    lastServiceDate: '', lastVidangeDate: '', lastBrakeDate: '',
                    maxKm: 0, tier: 'Non renseigné', tierBadgeClass: 'bg-secondary',
                    lastBcRef: '', lastBcId: '', supplier: 'Non spécifié',
                    totalSpend: 0, serviceCount: 0, vidangeCount: 0, brakeCount: 0,
                    serviceCounts: {}, serviceLastDate: {}, history: []
                };
            }
            const t = trucks[tId];
            if (!t.chassis && fd.chassis) t.chassis = fd.chassis;
            t.totalSpend += amount;
            t.serviceCount++;
            services.forEach(label => {
                t.serviceCounts[label] = (t.serviceCounts[label] || 0) + 1;
                if (!t.serviceLastDate[label] || date > t.serviceLastDate[label]) t.serviceLastDate[label] = date;
            });
            if (isVidange) {
                t.vidangeCount++;
                if (!t.lastVidangeDate || date > t.lastVidangeDate) t.lastVidangeDate = date;
            }
            if (isBrake) {
                t.brakeCount++;
                if (!t.lastBrakeDate || date > t.lastBrakeDate) t.lastBrakeDate = date;
            }
            if (fd.kmReading && fd.kmReading > t.maxKm) {
                t.maxKm = fd.kmReading;
                t.tier = fd.mileageTier;
                t.tierBadgeClass = fd.tierBadgeClass;
            }
            if (!t.lastServiceDate || date >= t.lastServiceDate) {
                t.lastServiceDate = date;
                t.lastBcRef = r.ref || '';
                t.lastBcId = r.id || '';
                t.supplier = r.supplierName || t.supplier;
            }
            if (fd.brand !== 'Autre Véhicule') t.brand = fd.brand;
            t.history.push(r);
        });
        return Object.values(trucks).sort((a, b) => b.totalSpend - a.totalSpend);
    },

    setTierFilter: function(tier) {
        this.currentTier = tier;
        this.renderModalContent();
    },

    setBrandFilter: function(brand) {
        this.currentBrand = brand;
        this.renderModalContent();
    },

    setSearchTerm: function(val) {
        this.searchTerm = (val || '').toLowerCase().trim();
        this.renderModalContent();
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        this.renderModalContent();
    },

    renderModalContent: function() {
        const container = document.getElementById('fleetModalBody');
        if (!container) return;

        const allRecords = this.getRecords();
        const trucks = this.getTruckSummary(allRecords);

        // Filter trucks
        const filteredTrucks = trucks.filter(t => {
            if (this.currentBrand !== 'all') {
                if (!t.brand.toLowerCase().includes(this.currentBrand.toLowerCase())) return false;
            }
            if (this.currentTier !== 'all') {
                if (this.currentTier === '5k_10k' && t.maxKm >= 10000) return false;
                if (this.currentTier === '10k_30k' && (t.maxKm < 10000 || t.maxKm > 30000)) return false;
                if (this.currentTier === '30k_60k' && (t.maxKm < 30000 || t.maxKm > 60000)) return false;
                if (this.currentTier === '60k_80k' && (t.maxKm < 60000 || t.maxKm > 80000)) return false;
                if (this.currentTier === 'over_80k' && t.maxKm < 80000) return false;
            }
            if (this.currentService !== 'all' && !(t.serviceCounts[this.currentService] > 0)) return false;
            if (this.searchTerm) {
                const hay = (t.truckId + ' ' + t.chassis + ' ' + t.brand + ' ' + t.supplier + ' ' + t.lastBcRef).toLowerCase();
                if (!hay.includes(this.searchTerm)) return false;
            }
            return true;
        });

        const uniqueBcs = new Map();
        allRecords.forEach(r => { if (!uniqueBcs.has(r.id || r.ref)) uniqueBcs.set(r.id || r.ref, r); });
        const totalCost = Array.from(uniqueBcs.values()).reduce((sum, r) => sum + (Number(r.amountTTC || r.amount) || 0), 0);
        const totalVidanges = Array.from(uniqueBcs.values()).filter(r => (r.fleetData.services || []).includes('Vidange')).length;
        const heavyCount = trucks.filter(t => t.maxKm >= 80000).length;

        container.innerHTML = `
            <!-- Top Metrics Row -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem;margin-bottom:1.25rem;">
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-truck text-primary me-1"></i> Camions Suivis</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${trucks.length}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Véhicules avec dossier d'entretien</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #10b981;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-oil-can text-success me-1"></i> Vidanges Enregistrées</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${totalVidanges}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Bons de commande vidange / révision</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-triangle-exclamation text-warning me-1"></i> Paliers 80 000+ KM</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${heavyCount}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Grosse révision / courroies requises</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #8b5cf6;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-coins text-purple me-1"></i> Budget Maintenance</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#0f172a;margin-top:4px;">${_formatMoney(totalCost)}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Dépenses totales flotte constatées</div>
                </div>
            </div>

            <!-- Interactive Filter Bar -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:1.25rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:0.6rem;align-items:center;">
                    <div style="position:relative;min-width:240px;">
                        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;"></i>
                        <input type="text" placeholder="Rechercher camion, BC, fournisseur..." value="${_escapeHtml(this.searchTerm)}" oninput="FleetAnalyzer.setSearchTerm(this.value)" style="padding:6px 10px 6px 30px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;width:100%;height:38px;">
                    </div>
                    <select onchange="FleetAnalyzer.setBrandFilter(this.value)" style="height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-weight:600;background:#ffffff;">
                        <option value="all" ${this.currentBrand === 'all' ? 'selected' : ''}>Toutes marques (MAN, HOWO, FIAT...)</option>
                        <option value="man" ${this.currentBrand === 'man' ? 'selected' : ''}>MAN TGS</option>
                        <option value="howo" ${this.currentBrand === 'howo' ? 'selected' : ''}>HOWO Sinotruk</option>
                        <option value="fiat" ${this.currentBrand === 'fiat' ? 'selected' : ''}>FIAT Doblo</option>
                        <option value="isuzu" ${this.currentBrand === 'isuzu' ? 'selected' : ''}>ISUZU NPR</option>
                        <option value="hyundai" ${this.currentBrand === 'hyundai' ? 'selected' : ''}>Hyundai HD</option>
                    </select>
                    <select onchange="FleetAnalyzer.setServiceFilter(this.value)" style="height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-weight:600;background:#ffffff;">
                        <option value="all" ${this.currentService === 'all' ? 'selected' : ''}>Toutes interventions</option>
                        ${FLEET_SERVICE_RULES.map(rule => `<option value="${_escapeHtml(rule.label)}" ${this.currentService === rule.label ? 'selected' : ''}>${_escapeHtml(rule.label)}</option>`).join('')}
                    </select>
                    <select onchange="FleetAnalyzer.setTierFilter(this.value)" style="height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-weight:600;background:#ffffff;">
                        <option value="all" ${this.currentTier === 'all' ? 'selected' : ''}>Tous les paliers km</option>
                        <option value="5k_10k" ${this.currentTier === '5k_10k' ? 'selected' : ''}>&lt; 10 000 km (Rodage / Vidange initiale)</option>
                        <option value="10k_30k" ${this.currentTier === '10k_30k' ? 'selected' : ''}>10 000 – 30 000 km (Service standard)</option>
                        <option value="30k_60k" ${this.currentTier === '30k_60k' ? 'selected' : ''}>30 000 – 60 000 km (Intermédiaire)</option>
                        <option value="60k_80k" ${this.currentTier === '60k_80k' ? 'selected' : ''}>60 000 – 80 000 km (Approfondi)</option>
                        <option value="over_80k" ${this.currentTier === 'over_80k' ? 'selected' : ''}>&gt; 80 000 km (Grosse révision)</option>
                    </select>
                </div>
                <div style="font-size:0.82rem;font-weight:700;color:#64748b;">
                    Affichage : <span class="text-primary">${filteredTrucks.length}</span> camion(s)
                </div>
            </div>

            <!-- Table Card -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="overflow-x:auto;">
                    <table class="table table-hover mb-0" style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                            <tr>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Camion / Matricule</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Modèle</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Dernier KM</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Palier Relevé</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Dernière Vidange</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">N° Bon Commande</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Fournisseur</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;text-align:right;">Coût Total TTC</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTrucks.map(t => {
                                const isHeavy = t.maxKm >= 80000;
                                return `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 12px;">
                                        <span class="badge bg-primary me-1" style="font-family:monospace;font-size:11.5px;padding:4px 8px;background:#2563eb;color:#ffffff;border-radius:4px;">
                                            <i class="fas fa-truck me-1"></i>${_escapeHtml(t.truckId)}
                                        </span>
                                        ${t.chassis && t.chassis !== t.truckId ? `<div style="font-family:monospace;font-size:10.5px;color:#64748b;margin-top:3px;">Châssis : ${_escapeHtml(t.chassis)}</div>` : ''}
                                    </td>
                                    <td style="padding:10px 12px;font-weight:600;color:#0f172a;">${_escapeHtml(t.brand)}</td>
                                    <td style="padding:10px 12px;font-weight:700;color:#1e293b;">
                                        ${t.maxKm > 0 ? (Number(t.maxKm).toLocaleString('fr-FR') + ' KM') : '<span class="text-muted">—</span>'}
                                    </td>
                                    <td style="padding:10px 12px;">
                                        <span class="badge ${t.tierBadgeClass}" style="font-size:11px;padding:3px 7px;border-radius:4px;">${_escapeHtml(t.tier)}</span>
                                    </td>
                                    <td style="padding:10px 12px;">
                                        ${t.lastVidangeDate ? `<span class="badge bg-light text-dark border" style="font-size:11px;"><i class="fas fa-calendar-day text-success me-1"></i>${_formatDate(t.lastVidangeDate)}</span>` : '<span class="text-muted small">Aucune vidange</span>'}
                                        ${t.lastBrakeDate ? `<div style="margin-top:3px;"><span class="badge bg-light text-dark border" style="font-size:10.5px;" title="Dernier freinage / plaquettes"><i class="fas fa-compact-disc text-warning me-1"></i>${_formatDate(t.lastBrakeDate)}</span></div>` : ''}
                                    </td>
                                    <td style="padding:10px 12px;">
                                        ${t.lastBcRef ? `<a href="javascript:void(0)" onclick="FleetAnalyzer.openBc('${t.lastBcId}')" class="badge bg-info text-dark" style="font-family:monospace;font-size:11px;padding:3px 7px;text-decoration:none;"><i class="fas fa-file-contract me-1"></i>${_escapeHtml(t.lastBcRef)}</a>` : '<span class="text-muted">—</span>'}
                                    </td>
                                    <td style="padding:10px 12px;color:#334155;">
                                        <strong>${_escapeHtml(t.supplier)}</strong>
                                    </td>
                                    <td style="padding:10px 12px;text-align:right;font-weight:700;color:#2563eb;">
                                        ${_formatMoney(t.totalSpend)}
                                    </td>
                                    <td style="padding:10px 12px;text-align:center;">
                                        ${t.lastBcId ? `<button class="btn btn-xs btn-outline-primary" onclick="FleetAnalyzer.openBc('${t.lastBcId}')" title="Ouvrir le Bon de Commande"><i class="fas fa-eye"></i></button>` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${filteredTrucks.length === 0 ? `
                                <tr>
                                    <td colspan="9" style="text-align:center;padding:2.5rem;color:#64748b;">
                                        <i class="fas fa-filter me-2"></i>Aucun camion ne correspond aux critères de filtre sélectionnés.
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openBc: function(id) {
        if (!id) return;
        this.closeModal();
        if (typeof openBcEditModal === 'function') {
            openBcEditModal(id);
        } else if (typeof openBcDetailModal === 'function') {
            openBcDetailModal(id);
        }
    },

    daysSince: function(dateStr) {
        if (!dateStr) return '';
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return '';
        return Math.max(0, Math.floor((Date.now() - t) / 86400000));
    },

    exportExcel: function() {
        const records = this.getRecords();
        const trucks = this.getTruckSummary(records);
        const VIDANGE_ALERT_DAYS = 180;

        // Sheet 1: one line per truck (plate + chassis merged), with maintenance ages for planning
        const truckHeaders = [
            'Matricule', 'N° Châssis', 'Modèle', 'Dernier KM', 'Palier KM',
            'Nb Vidanges', 'Dernière Vidange', 'Jours depuis vidange', 'Statut vidange',
            'Nb Freinage / Plaquettes', 'Dernier Freinage', 'Jours depuis freinage',
            'Nb Interventions', 'Dernier BC', 'Fournisseur', 'Total TTC (DZD)'
        ];
        const truckRows = trucks.map(t => {
            const vDays = this.daysSince(t.lastVidangeDate);
            const vStatus = !t.lastVidangeDate ? 'Aucune vidange enregistrée'
                : (vDays > VIDANGE_ALERT_DAYS ? 'À planifier (> ' + VIDANGE_ALERT_DAYS + ' j)' : 'OK');
            return [
                t.truckId, t.chassis, t.brand, t.maxKm || '', t.maxKm ? t.tier : '',
                t.vidangeCount, t.lastVidangeDate, vDays, vStatus,
                t.brakeCount, t.lastBrakeDate, this.daysSince(t.lastBrakeDate),
                t.serviceCount, t.lastBcRef, t.supplier, Math.round(t.totalSpend * 100) / 100
            ];
        });

        // Sheet 2: every intervention (one line per BC and truck), grouped by truck then newest first
        const detailHeaders = [
            'Matricule', 'N° Châssis', 'Modèle', 'Intervention(s)', 'Date BC', 'Réf BC',
            'Fournisseur', 'KM relevé', 'Montant TTC (part du camion)', 'Statut BC', 'Statut paiement', 'Remarque'
        ];
        const detailRows = [];
        trucks.forEach(t => {
            t.history.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).forEach(r => {
                const fd = r.fleetData;
                detailRows.push([
                    t.truckId, t.chassis, t.brand, (fd.services || [fd.serviceType]).join(' + '),
                    r.date || '', r.ref || '', r.supplierName || '', fd.kmReading || '',
                    Math.round((Number(r.amountTTC || r.amount || 0) / Math.max(1, fd.shareCount || 1)) * 100) / 100,
                    r.status || '', r.paymentStatus || '', r.remarques || ''
                ]);
            });
        });

        // Sheet 3: grouped by type of intervention (vidange, plaquettes, pneus...) to plan each campaign
        const typeHeaders = ['Type d\'intervention', 'Matricule', 'N° Châssis', 'Modèle', 'Nb fois', 'Dernière date', 'Jours depuis', 'Dernier KM'];
        const typeRows = [];
        FLEET_SERVICE_RULES.map(rule => rule.label).concat(['Entretien Général']).forEach(label => {
            trucks.filter(t => t.serviceCounts[label] > 0)
                .sort((a, b) => String(a.serviceLastDate[label] || '').localeCompare(String(b.serviceLastDate[label] || '')))
                .forEach(t => typeRows.push([
                    label, t.truckId, t.chassis, t.brand, t.serviceCounts[label],
                    t.serviceLastDate[label], this.daysSince(t.serviceLastDate[label]), t.maxKm || ''
                ]));
        });

        // Sheet 4: BCs that talk about a vehicle but give no plate / chassis (to complete by hand)
        const unknownHeaders = ['Réf BC', 'Date BC', 'Fournisseur', 'Intervention(s)', 'Montant TTC', 'Remarque'];
        const unknownRows = records
            .filter(r => !r.fleetData.plate && !r.fleetData.chassis)
            .map(r => [r.ref || '', r.date || '', r.supplierName || '', (r.fleetData.services || []).join(' + '),
                Number(r.amountTTC || r.amount || 0), r.remarques || r.description || '']);

        const sheets = [
            { name: 'Flotte par camion', headers: truckHeaders, rows: truckRows },
            { name: 'Interventions détail', headers: detailHeaders, rows: detailRows },
            { name: 'Par type intervention', headers: typeHeaders, rows: typeRows }
        ];
        if (unknownRows.length) sheets.push({ name: 'Camion à identifier', headers: unknownHeaders, rows: unknownRows });

        const filename = `suivi_flotte_${new Date().toISOString().split('T')[0]}.xlsx`;
        if (typeof exportWorkbook === 'function') {
            exportWorkbook(filename, sheets);
            if (typeof showToast === 'function') {
                showToast(`Export flotte : ${trucks.length} camion(s), ${detailRows.length} intervention(s)` +
                    (unknownRows.length ? `, ${unknownRows.length} BC sans matricule/châssis.` : '.'));
            }
        } else {
            // CSV fallback (truck summary only)
            let csv = truckHeaders.join(';') + '\r\n';
            truckRows.forEach(r => { csv += r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';') + '\r\n'; });
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename.replace(/\.xlsx$/, '.csv');
            link.click();
        }
    }
};

// Also expose as alias
window.renderFleetAnalyzer = function() {
    if (typeof FleetAnalyzer !== 'undefined' && FleetAnalyzer.openModal) {
        // Can also render directly into #page-reports if open
        const reportsPage = document.getElementById('page-reports');
        if (reportsPage) {
            let fleetSec = document.getElementById('fleetAnalyzerSection');
            if (!fleetSec) {
                fleetSec = document.createElement('div');
                fleetSec.id = 'fleetAnalyzerSection';
                reportsPage.appendChild(fleetSec);
            }
            fleetSec.innerHTML = `
                <div class="card p-3 mt-4" style="border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4 style="margin:0;font-weight:800;color:#0f172a;"><i class="fas fa-truck-moving text-primary me-2"></i> Suivi Entretien & Vidanges Flotte</h4>
                        <button class="btn btn-sm btn-primary fw-bold" onclick="FleetAnalyzer.openModal()"><i class="fas fa-expand me-1"></i> Ouvrir Tableau de Bord Complet</button>
                    </div>
                    <p class="text-muted small">Consultez l'historique complet des vidanges, paliers d'entretien (MAN, HOWO, FIAT, etc.) et fournisseurs associés.</p>
                </div>
            `;
        }
    }
};

// Setup DOM event listeners
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        FleetAnalyzer.ensureModalContainer();
    });
}


/* === APPRO NEXTGEN (MERGED) === */

/**
 * appro-nextgen.js
 * Advanced BC & DP Folder Scanner, Multi-BC Linking Engine & Next-Gen KPI
 * SPA DOUROUB ELDJAZAIR — Suite Intégrée
 */

// ============================================================
// HIGH-INTELLIGENCE DP & BC FINANCIAL BRAIN TAXONOMY & HELPERS
// ============================================================

const LEGAL_STOPWORDS_SET = new Set([
  'sarl', 'spa', 'eurl', 'ets', 'etablissement', 'etablissements', 'snc', 'step', 'scs', 'epe',
  'de', 'du', 'la', 'le', 'les', 'des', 'et', 'pour', 'au', 'aux', 'en', 'd', 'l',
  'algerie', 'algerienne', 'dz', 'district', 'com', 'direction', 'agence', 'filiale', 'cie', 'company', 'ste', 'societe', 'entreprise'
]);

function normalizeTextForBrain(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSignificantSupplierTokens(s) {
  const norm = normalizeTextForBrain(s);
  return norm.split(' ').filter(w => w.length > 1 && !LEGAL_STOPWORDS_SET.has(w));
}

function calcSupplierSimilarity(nameA, nameB) {
  const tokA = getSignificantSupplierTokens(nameA);
  const tokB = getSignificantSupplierTokens(nameB);
  if (!tokA.length || !tokB.length) return 0;

  const setA = new Set(tokA);
  const setB = new Set(tokB);
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter++;
  }
  const union = new Set([...setA, ...setB]).size;
  const jaccard = inter / union;
  const subset = (inter === setA.size || inter === setB.size) ? 0.9 : 0;
  
  const strA = tokA.join('');
  const strB = tokB.join('');
  let strMatch = 0;
  if (strA && strB && (strA.includes(strB) || strB.includes(strA))) {
    strMatch = 0.85;
  }
  return Math.max(jaccard, subset, strMatch);
}

function findBcSubsetSumCombination(items, target, maxK = 8, tol = 2.0) {
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
  function search(idx, current, currentSum) {
    if (found) return;
    if (Math.abs(currentSum - target) <= tol && current.length > 0) {
      found = current;
      return;
    }
    if (currentSum > target + tol || idx >= valid.length || current.length >= maxK) return;
    search(idx + 1, [...current, valid[idx]], currentSum + (valid[idx].amountTTC || valid[idx].amount || 0));
    search(idx + 1, current, currentSum);
  }
  search(0, [], 0);
  return found;
}

const DIRECT_PAYMENT_TAXONOMY = [
  { category: 'Energie & Utilités', pattern: /SONELGAZ|SONALGAZ|ELECTR[EÉI]CITE\s+ET\s+DU\s+GAZ|GAZ\s+NATUREL|SEAAL|EAU\s+POTABLE|\bWATER\b/i },
  { category: 'Carburant Étatique / Flotte', pattern: /NAFTAL/i },
  { category: 'Télécoms & Réseaux', pattern: /ALGERIE\s+TELECOM|MOBILIS|DJEZZY|OOREDOO|WATANIYA|ABONNEMENT\s+TELEPHONIQUE|CARTE\s+SIM|GUEDILA/i },
  { category: 'Fiscalité, Impôts & Taxes', pattern: /IMPOT|TAXE|G50|RECEVEUR.*IMPOTS|DGI|RECETTE\s+DES\s+IMPOTS|TRESOR|DROIT\s+DE\s+TIMBRE|ENREGISTREMENT/i },
  { category: 'Cotisations Sociales', pattern: /CNAS|CASNOS|CNR|MUTUELLE|COTISATION\s+SOCIALE/i },
  { category: 'Marchés & Contrats Cadres', pattern: /SETTOUTI|CONTRAT\s+N[°o]?\s*:\s*\d+/i },
  { category: 'Frais Juridiques & Notariés', pattern: /NOTAIRE|HUISSIER|AVOCAT|FRAIS\s+DE\s+JUSTICE|TRIBUNAL|MKIHEL/i },
  { category: 'Honoraires & Expertises', pattern: /HONORAIRES?\s+D['’]EXPERTISE|KAOUANE\s+FILALI|COMMISSAIRE\s+AUX\s+COMPTES|MOHAMMEDI\s+SLIMANE|TASSAMIM|GENIE\s+CIVIL/i },
  { category: 'Assurances & Sinistres', pattern: /ASSURANCE|CAAT|SAA|CASH\s+ASSURANCES|CIAR|GAM\s+ASSURANCES|AXA|EL\s+AMANA|SALAMA\s+ASSURANCE/i },
  { category: 'Douane, Transit & Fret', pattern: /TRANSIT\s+DERDOUR|TRANSIT\s+TAHAR|TRANSITAIRE|PORTUAIRE|PORT\s+DE\s+MOSTAGANEM|DOUANE|SKIKDA\s+CONTAINERS/i },
  { category: 'Services Bancaires & Financement', pattern: /BANQUE\s+AL\s*BARAKA|AGIOS|COMMISSION\s+BANCAIRE|FRAIS\s+BANCAIRES|CREDIT\s+BAIL|LEASING/i },
  { category: 'Frais Administratifs & Conformité', pattern: /BALADIYA|COMMUNE|TRESORIER\s+COMMUNAL|WILAYA|DAIRA|CNRC|REGISTRE\s+DU?\s+COMMERCE|LEGALISATION\s+REGISTRE|CTC|CONTROLE\s+TECHNIQUE\s+DES\s+VEHICULES/i },
  { category: 'Voyages & Déplacements', pattern: /TOURING\s+VOYAGES|KOUTOU\s+TRAVEL|BILLET.*AVION|HOTEL|OASIS\s+HOTELLERIE/i },
  { category: 'Cas Particulier / Dépense Directe', pattern: /SPECIAL\s+CASE|CAS\s+PARTICULIER/i }
];

function computePaymentDelayMetrics(bc, dp) {
  const bcDate = bc.date ? new Date(bc.date) : null;
  const daDate = bc.daValidatedAt ? new Date(bc.daValidatedAt) : bcDate;
  const dpDate = dp.requestDate ? new Date(dp.requestDate) : null;
  const paidDate = dp.paidDate ? new Date(dp.paidDate) : dpDate;

  if (bcDate && !isNaN(bcDate)) {
    if (daDate && !isNaN(daDate)) {
      bc.delayBcToDaDays = Math.max(0, Math.round((daDate - bcDate) / 86400000));
    } else {
      bc.delayBcToDaDays = 0;
    }
    if (dpDate && !isNaN(dpDate)) {
      const daRefDate = (daDate && !isNaN(daDate)) ? daDate : bcDate;
      bc.delayDaToDpDays = Math.max(0, Math.round((dpDate - daRefDate) / 86400000));
      bc.delayBcToDpDays = Math.max(0, Math.round((dpDate - bcDate) / 86400000));
    }
    if (paidDate && !isNaN(paidDate)) {
      bc.totalPaymentDelayDays = Math.max(0, Math.round((paidDate - bcDate) / 86400000));
      if (dpDate && !isNaN(dpDate)) {
        bc.delayDpToPaymentDays = Math.max(0, Math.round((paidDate - dpDate) / 86400000));
      }
    }
  }

  const totalDays = bc.totalPaymentDelayDays ?? (bc.delayBcToDpDays ?? 0);
  bc.delayStatus = totalDays < 15 ? 'rapide' : (totalDays <= 30 ? 'normal' : 'retard');
}

const ApproNextGen = window.ApproNextGen = {
  currentKpiPeriod: 'all',
  selectedComparisonSuppliers: [],
  selectedArticleFilter: '',
  spendingAmountTier: 'all',
  paymentDelayFilter: 'all',
  bcImportanceFilter: 'all',

  _dedupAndNormalizePayments(rawList) {
    if (!Array.isArray(rawList)) return [];
    if (typeof deduplicatePaymentsList === 'function') {
      return deduplicatePaymentsList(rawList);
    }
    return rawList.map(item => (typeof normalizePayment === 'function' ? normalizePayment(item) : item));
  },

  ensureDataHydrated() {
    if (typeof state === 'undefined') return;
    const preload = (typeof window !== 'undefined' && window.PRELOAD_DATA) ? window.PRELOAD_DATA : null;
    if (!preload) return;

    let changed = false;
    if (!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) {
      if (Array.isArray(preload.bcRecords) && preload.bcRecords.length > 0) {
        const clonedBcs = JSON.parse(JSON.stringify(preload.bcRecords));
        state.bcRecords = typeof normalizeBcRecord === 'function' ? clonedBcs.map(normalizeBcRecord) : clonedBcs;
        changed = true;
      }
    }
    if (!Array.isArray(state.payments) || state.payments.length === 0) {
      if (Array.isArray(preload.payments) && preload.payments.length > 0) {
        state.payments = this._dedupAndNormalizePayments(preload.payments);
        changed = true;
      }
    }
    if (changed) {
      this.autoLinkBcsAndDps();
      if (typeof saveState === 'function') saveState();
    }
  },

  init() {
    console.log('[ApproNextGen] Initializing Next-Gen Appro & KPI Suite...');
    this.checkRoleAccess();
    this.injectNavigationPills();
    this.injectScannerBanners();
    this.injectKpiAdvancedControls();
    this.injectFollowupImportanceControls();
    this.overridePaymentsTable();
    this.overrideKpiDashboard();
    this.loadScannedDataIfEmpty();
    this.listenForPortalTheme();
  },

  checkRoleAccess() {
    if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
    let role = localStorage.getItem('sde_user_role');

    // Auto-detect if user is an admin
    function detectIsAdmin() {
      if (role === 'admin' || role === 'superadmin' || role === 'directeur') return true;
      try {
        if (typeof state !== 'undefined' && state.session && (state.session.role === 'admin' || state.session.username === 'admin' || state.session.role === 'management')) return true;
        const approSess = localStorage.getItem('suivi_session');
        if (approSess) {
          const parsed = JSON.parse(approSess);
          if (parsed && (parsed.role === 'admin' || parsed.username === 'admin' || parsed.role === 'management')) return true;
        }
        const stockSess = localStorage.getItem('erp_douroub_session');
        if (stockSess) {
          const parsed = JSON.parse(stockSess);
          if (parsed && (parsed.role === 'admin' || parsed.username === 'admin')) return true;
        }
      } catch(e) {}
      return false;
    }

    const isAdmin = detectIsAdmin();
    if (isAdmin && role !== 'superadmin' && role !== 'admin') {
      role = 'admin';
      try { localStorage.setItem('sde_user_role', 'admin'); } catch(e) {}
    }

    // ONLY lock if non-admin role is admin_stock
    if (role === 'admin_stock' && !isAdmin) {
      const lockOverlay = document.createElement('div');
      lockOverlay.id = 'roleLockOverlay';
      lockOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,19,41,0.97);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;';
      lockOverlay.innerHTML = `
        <div style="background:#111e38;border:2px solid #ef4444;border-radius:16px;max-width:540px;padding:30px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);color:#fff;font-family:sans-serif;">
          <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:rgba(239,68,68,0.2);border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;font-size:28px;color:#ef4444;">
            <i class="fas fa-lock"></i>
          </div>
          <h2 style="font-size:20px;margin-bottom:8px;font-weight:800;">Accès Restreint</h2>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:20px;">
            Votre session actuelle est configurée pour le profil <strong>Magasinier (Stock & Magasin)</strong>.<br>
            Ce compte a un accès exclusif au module de Stock et n'a pas accès au module Achats & Bons de Commande.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <a href="/#stock" onclick="try{localStorage.setItem('erp_active_module','stock');}catch(e){}" style="background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
              🏢 Aller à mon module Stock
            </a>
            <a href="/#dashboard" style="background:#1e293b;border:1px solid #475569;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;" onclick="localStorage.removeItem('sde_user_role');">
              🏛️ Portail Principal
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(lockOverlay);
    }
  },

  // Navigation pills between unified portal, stock, and appro
  injectNavigationPills() {
    if (typeof document === 'undefined' || !document.querySelector || !document.createElement) return;
    if (document.getElementById('linkToStock')) return;
    const tools = document.querySelector('.topbar-tools');
    if (!tools || document.getElementById('navPillsGroup')) return;

    let role = (typeof localStorage !== 'undefined' && localStorage.getItem('sde_user_role')) || '';

    // Auto-detect if user is admin
    const isAdmin = (role === 'admin' || role === 'superadmin' || role === 'directeur') ||
      (typeof state !== 'undefined' && state.session && (state.session.role === 'admin' || state.session.username === 'admin' || state.session.role === 'management'));
    const isSuper = role === 'superadmin';
    const hasDualAccess = isAdmin || isSuper;

    const group = document.createElement('div');
    group.id = 'navPillsGroup';
    group.style.display = 'inline-flex';
    group.style.gap = '6px';
    group.style.alignItems = 'center';
    group.style.marginRight = '8px';

    group.innerHTML = `
      ${hasDualAccess ? `
        <a href="/#stock" onclick="try{localStorage.setItem('erp_active_module','stock');}catch(e){}" class="btn btn-soft" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-size:0.78rem;padding:0.4rem 0.75rem;background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.25);border-radius:6px;" title="Basculer vers Stock & Flotte">
          <i class="fas fa-boxes-stacked"></i> Stock & Flotte <!-- 🏢 Stock & Flotte -->
        </a>
      ` : ''}
    `;

    tools.insertAdjacentElement('afterbegin', group);
  },

  // 1. Auto-load pre-scanned 364 BCs & 148 DPs if state is missing them
  loadScannedDataIfEmpty() {
    this.ensureDataHydrated();
    // If running in file:/// protocol or PRELOAD_DATA is available, use preloaded dataset directly without CORS fetch
    if (typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
      if (!state.payments || state.payments.length === 0) {
        state.payments = this._dedupAndNormalizePayments(window.PRELOAD_DATA.payments);
        this.autoLinkBcsAndDps();
        if (typeof saveState === 'function') saveState();
        if (typeof renderApp === 'function') renderApp();
      }
      return;
    }

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return;
    }

    if (typeof fetch !== 'function') return;
    fetch('../data/extracted_dps_linked.json')
      .then(r => r.json())
      .then(dps => {
        if (dps && Array.isArray(dps) && dps.length > 0) {
          if (!state.payments || state.payments.length === 0) {
            state.payments = this._dedupAndNormalizePayments(dps);
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
          }
        }
      })
      .catch(() => {});
  },

  applyPaidDpToBc(b, dp) {
    if (!b || !dp) return;
    const isDpPaid = typeof isDpPaidStatus === 'function'
      ? isDpPaidStatus(dp)
      : (!dp.status || dp.status === 'paye' || dp.status === 'paid');
    b.dpRef = dp.paymentRef || b.dpRef || '';
    b.dpDate = dp.requestDate || b.dpDate || '';
    if (isDpPaid) {
      b.paymentStatus = 'paye';
      b.paymentRef = dp.paymentRef || b.paymentRef || '';
      b.paymentPaidDate = dp.paidDate || dp.requestDate || b.paymentPaidDate || '';
      const cur = String(b.status || '');
      if (cur === 'clos' || cur === 'cloture') {
        b.status = 'clos';
      } else if (['livre_paye', 'livre', 'receptionne', 'service_fait'].includes(cur) || Boolean(b.goodsReceivedDate || b.serviceDoneDate)) {
        b.status = 'livre_paye';
      } else {
        b.status = 'paye';
      }
      if (!/pay[eé]/i.test(String(b.remarques || ''))) {
        b.remarques = b.remarques ? `${b.remarques} · ✓ Payé` : '✓ Payé';
      }
    } else if (b.paymentStatus !== 'paye') {
      b.paymentStatus = 'en_attente';
    }
    b.updatedAt = new Date().toISOString();
    computePaymentDelayMetrics(b, dp);
  },

  findAssociatedBcsForDp(dp) {
    if (!dp || !Array.isArray(state.bcRecords)) return [];
    const idSet = new Set(Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []);
    if (dp.bcId) idSet.add(dp.bcId);
    const refSet = new Set((Array.isArray(dp.linkedBcRefs) ? dp.linkedBcRefs : []).map(r => String(r || '').trim().toUpperCase()).filter(Boolean));
    const pRef = String(dp.paymentRef || '').trim().toUpperCase();
    return state.bcRecords.filter(b => {
      if (idSet.has(b.id)) return true;
      const bRef = String(b.ref || '').trim().toUpperCase();
      if (bRef && refSet.has(bRef)) return true;
      if (pRef && (String(b.dpRef || '').trim().toUpperCase() === pRef || String(b.paymentRef || '').trim().toUpperCase() === pRef)) return true;
      return false;
    });
  },

  linkBcAndDpPair(dp, bcs, forceMarkPaid = false, silent = false) {
    const list = (Array.isArray(bcs) ? bcs : [bcs]).filter(Boolean);
    if (!dp || !list.length) return 0;
    const mergedIds = Array.from(new Set([...(Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []), ...list.map(b => b.id)]));
    const allLinkedBcs = state.bcRecords.filter(b => mergedIds.includes(b.id));
    dp.linkedBcIds = mergedIds;
    dp.linkedBcRefs = allLinkedBcs.map(b => b.ref).filter(Boolean);
    dp.bcId = mergedIds[0] || '';
    dp.isDirect = false;
    dp.manualLink = true;
    if (forceMarkPaid) {
      dp.status = 'paye';
      dp.paidDate = dp.paidDate || (typeof todayYmd === 'function' ? todayYmd() : new Date().toISOString().slice(0, 10));
    }
    dp.updatedAt = new Date().toISOString();
    allLinkedBcs.forEach(bc => this.applyPaidDpToBc(bc, dp));
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    if (!silent) {
      saveState();
      if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
      renderApp();
      showToast(`🔗 DP ${dp.paymentRef} liée à ${list.map(b => b.ref).join(', ')}${isDpPaidStatus(dp) ? ' (Payé ✓)' : ''}`);
    }
    return list.length;
  },

  _recomputeBcPaymentFromRemainingDps(bc) {
    if (!bc) return;
    const remDps = getLinkedDpsForBc(bc);
    const paidDp = remDps.find(isDpPaidStatus);
    if (paidDp) {
      this.applyPaidDpToBc(bc, paidDp);
      return;
    }
    bc.paymentPaidDate = '';
    bc.paymentRef = remDps[0]?.paymentRef || '';
    bc.dpRef = remDps[0]?.paymentRef || '';
    bc.paymentStatus = remDps.length > 0 ? 'en_attente' : '';
    bc.remarques = String(bc.remarques || '').replace(/\s*·?\s*✓\s*Pay[eé](\s*\([^)]*\))?/gi, '').trim();
    if (bc.status === 'livre_paye') bc.status = 'livre';
    else if (bc.status === 'paye') bc.status = (bc.goodsReceivedDate || bc.serviceDoneDate) ? 'livre' : 'transmis';
    bc.updatedAt = new Date().toISOString();
  },

  unlinkBcFromDp(bc, dp) {
    if (!bc || !dp) return;
    dp.linkedBcIds = (Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []).filter(id => id !== bc.id);
    dp.linkedBcRefs = (Array.isArray(dp.linkedBcRefs) ? dp.linkedBcRefs : []).filter(r => String(r).toUpperCase() !== String(bc.ref || '').toUpperCase());
    if (dp.bcId === bc.id) dp.bcId = dp.linkedBcIds[0] || '';
    dp.manualLink = true;
    dp.updatedAt = new Date().toISOString();
    if (String(bc.dpRef || '') === String(dp.paymentRef || '')) bc.dpRef = '';
    if (String(bc.paymentRef || '') === String(dp.paymentRef || '')) bc.paymentRef = '';
    this._recomputeBcPaymentFromRemainingDps(bc);
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    renderApp();
    showToast(`Liaison retirée entre ${bc.ref} et DP ${dp.paymentRef}.`);
  },

  cascadeDpStatusToLinkedBcs(dp) {
    if (!dp) return [];
    const assoc = this.findAssociatedBcsForDp(dp);
    if (isDpPaidStatus(dp)) {
      assoc.forEach(bc => this.applyPaidDpToBc(bc, dp));
    } else {
      assoc.forEach(bc => this._recomputeBcPaymentFromRemainingDps(bc));
    }
    return assoc;
  },

  reconcileAfterDpRemoved(dp) {
    if (!dp) return;
    const assoc = this.findAssociatedBcsForDp(dp);
    assoc.forEach(bc => {
      if (String(bc.dpRef || '') === String(dp.paymentRef || '')) bc.dpRef = '';
      if (String(bc.paymentRef || '') === String(dp.paymentRef || '')) bc.paymentRef = '';
      this._recomputeBcPaymentFromRemainingDps(bc);
    });
  },

  toggleSingleDpPaid(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;
    const target = isDpPaidStatus(dp) ? 'en_attente' : 'paye';
    this.bulkSetDpStatus([dpId], target);
  },

  bulkSetDpStatus(dpIds, targetStatus) {
    const ids = Array.from(new Set(Array.isArray(dpIds) ? dpIds : Array.from(dpIds || [])));
    if (!ids.length) return { dpCount: 0, bcCount: 0 };
    const today = typeof todayYmd === 'function' ? todayYmd() : new Date().toISOString().slice(0, 10);
    let dpCount = 0;
    const affectedBcIds = new Set();
    const affectedRefs = [];
    (state.payments || []).forEach(dp => {
      if (!ids.includes(dp.id)) return;
      dp.status = targetStatus;
      if (targetStatus === 'paye') dp.paidDate = dp.paidDate || dp.requestDate || today;
      else if (targetStatus === 'en_attente') dp.paidDate = '';
      dp.updatedAt = new Date().toISOString();
      if (dp.paymentRef) affectedRefs.push(dp.paymentRef);
      dpCount++;
      const bcs = this.cascadeDpStatusToLinkedBcs(dp);
      bcs.forEach(b => affectedBcIds.add(b.id));
    });
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge) {
      const paidDateArg = targetStatus === 'paye' ? today : '';
      if (typeof window.bcBridge.bulkUpdatePaymentStatusOnServer === 'function') {
        Promise.resolve(window.bcBridge.bulkUpdatePaymentStatusOnServer(ids, targetStatus, paidDateArg, affectedRefs))
          .finally(() => {
            if (typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
          });
      } else if (typeof window.bcBridge.syncBcToServer === 'function') {
        window.bcBridge.syncBcToServer();
      }
    }
    renderApp();
    showToast(targetStatus === 'paye'
      ? `✓ ${dpCount} DP marquée(s) Payée(s) · ${affectedBcIds.size} BC associé(s) réglé(s) !`
      : `⏳ ${dpCount} DP remise(s) en attente (${affectedBcIds.size} BC mis à jour).`);
    return { dpCount, bcCount: affectedBcIds.size };
  },

  // Cross-link BCs and DPs in browser state with High-Intelligence Multi-Strategy Brain
  autoLinkBcsAndDps() {
    if (!state.bcRecords || !state.payments) return;

    const bcById = new Map();
    const bcByRef = new Map();
    const bcByNum = new Map();

    state.bcRecords.forEach(b => {
      if (b.id) bcById.set(String(b.id), b);
      if (b._id) bcById.set(String(b._id), b);
      if (b.ref) {
        bcByRef.set(b.ref.trim().toUpperCase(), b);
        const m = b.ref.match(/(\d+)/);
        if (m) bcByNum.set(parseInt(m[1], 10), b);
      }
    });

    const resolveExistingLinkedBcs = (dp) => {
      const found = [];
      const seen = new Set();
      const pushBc = (bc) => {
        if (bc && bc.id && !seen.has(bc.id)) { seen.add(bc.id); found.push(bc); }
      };
      (Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []).forEach(id => pushBc(bcById.get(String(id))));
      if (dp.bcId) pushBc(bcById.get(String(dp.bcId)));
      (Array.isArray(dp.linkedBcRefs) ? dp.linkedBcRefs : []).forEach(r => {
        const rk = String(r || '').trim().toUpperCase();
        if (rk) pushBc(bcByRef.get(rk));
      });
      return found;
    };

    const syncDelayMetricsFromBcs = (dp, bcs) => {
      let maxTotalDelay = 0;
      let minBcToDp = 9999;
      bcs.forEach(bc => {
        this.applyPaidDpToBc(bc, dp);
        if ((bc.totalPaymentDelayDays || 0) > maxTotalDelay) maxTotalDelay = bc.totalPaymentDelayDays;
        if (bc.delayBcToDpDays != null && bc.delayBcToDpDays < minBcToDp) minBcToDp = bc.delayBcToDpDays;
      });
      dp.delayBcToDpDays = minBcToDp === 9999 ? 0 : minBcToDp;
      dp.totalPaymentDelayDays = maxTotalDelay;
      dp.delayStatus = maxTotalDelay < 15 ? 'rapide' : (maxTotalDelay <= 30 ? 'normal' : 'retard');
    };

    state.payments.forEach(dp => {
      if (dp.excluded || dp.isSpecialCase) return;
      const existingBcs = resolveExistingLinkedBcs(dp);

      // 0A. Preserve explicit manual link, manual unlink, or manual direct classification
      if (dp.manualLink || dp.isDirect) {
        if (dp.isDirect) {
          dp.linkedBcIds = [];
          dp.linkedBcRefs = [];
          dp.bcId = '';
          const reqD = dp.requestDate ? new Date(dp.requestDate) : null;
          const paidD = dp.paidDate ? new Date(dp.paidDate) : reqD;
          if (reqD && paidD && !isNaN(reqD) && !isNaN(paidD)) {
            dp.delayDpToPaymentDays = Math.max(0, Math.round((paidD - reqD) / 86400000));
            dp.totalPaymentDelayDays = dp.delayDpToPaymentDays;
            dp.delayStatus = dp.totalPaymentDelayDays < 7 ? 'rapide' : (dp.totalPaymentDelayDays <= 15 ? 'normal' : 'retard');
          }
          return;
        }
        if (existingBcs.length > 0) {
          dp.linkedBcIds = existingBcs.map(b => b.id);
          dp.linkedBcRefs = existingBcs.map(b => b.ref);
          dp.bcId = existingBcs[0].id;
          syncDelayMetricsFromBcs(dp, existingBcs);
        } else {
          dp.linkedBcIds = [];
          dp.linkedBcRefs = [];
          dp.bcId = '';
        }
        return;
      }

      // 0B. Preserve existing valid server/persisted links without heuristic overwrite
      if (existingBcs.length > 0) {
        dp.isDirect = false;
        dp.linkedBcIds = existingBcs.map(b => b.id);
        dp.linkedBcRefs = existingBcs.map(b => b.ref);
        dp.bcId = existingBcs[0].id;
        syncDelayMetricsFromBcs(dp, existingBcs);
        return;
      }

      const docs = dp.referenceDocs || '';
      const src = dp.sourceFile || '';
      const ben = dp.beneficiary || '';
      const nat = dp.natureExpense || '';
      const fullText = `${ben} ${docs} ${src} ${nat} ${dp.paymentRef || ''}`;

      let matchedBcs = [];

      const isIgnoredCand = (cand) => Boolean(
        cand && window.LogicalMatchEngine && typeof window.LogicalMatchEngine.isPairIgnored === 'function' &&
        window.LogicalMatchEngine.isPairIgnored(dp, cand, `${dp.id}::${cand.id}`)
      );

      // Strategy 1: Explicit BC regex matching (BC N°XX, BC XX, BC-XX, XX/DG/2026, BC #XX)
      const bcMatches = [
        ...fullText.matchAll(/BC\s*(?:N[°o]?)?\s*(\d+)/gi),
        ...fullText.matchAll(/BC\s*[-_#]\s*(\d+)/gi),
        ...fullText.matchAll(/(\d{1,4})\s*\/\s*DG\s*\/\s*202[56]/gi)
      ];
      for (const m of bcMatches) {
        const num = parseInt(m[1], 10);
        const cand = bcByNum.get(num);
        if (cand && !isIgnoredCand(cand) && !matchedBcs.some(b => b.id === cand.id)) {
          matchedBcs.push(cand);
        }
      }

      // Strategy 2: Ref number match with tokenized supplier verification
      if (matchedBcs.length === 0) {
        const dpNumMatch = String(dp.paymentRef || '').match(/(\d+)/);
        if (dpNumMatch) {
          const num = parseInt(dpNumMatch[1], 10);
          const cand = bcByNum.get(num);
          if (cand && !isIgnoredCand(cand)) {
            const sim = calcSupplierSimilarity(cand.supplierName, ben);
            if (sim >= 0.4) {
              matchedBcs.push(cand);
            }
          }
        }
      }

      // Strategy 3: Advanced Fuzzy Supplier Matching + Financial Concordance (Exact, Subset Sum Multi-BC, Advance Partial, Stamp Duty)
      if (matchedBcs.length === 0 && dp.amount > 0) {
        const candBcs = state.bcRecords.filter(b => !isIgnoredCand(b) && calcSupplierSimilarity(b.supplierName, ben) >= 0.4);
        if (candBcs.length > 0) {
          // 3A. Exact or Subset Sum multi-BC match
          const combo = findBcSubsetSumCombination(candBcs, dp.amount, 8, 2.0);
          if (combo && combo.length > 0) {
            matchedBcs.push(...combo);
          } else {
            // 3B. Partial advance payment (50% or 30%)
            const partial = candBcs.find(b => {
              const ttc = b.amountTTC || b.amount || 0;
              return Math.abs(ttc * 0.5 - dp.amount) < 2.0 || Math.abs(ttc * 0.3 - dp.amount) < 2.0;
            });
            if (partial) {
              matchedBcs.push(partial);
            } else {
              // 3C. Stamp duty tolerance (Timbre fiscal up to 2500 DZD or within 5%)
              const stampMatch = candBcs.find(b => {
                const ttc = b.amountTTC || b.amount || 0;
                return Math.abs(ttc - dp.amount) <= 2500 && Math.abs(ttc - dp.amount) / dp.amount < 0.05;
              });
              if (stampMatch) matchedBcs.push(stampMatch);
            }
          }
        }
      }

      // Strategy 4: If BCs matched, synchronize and compute turnaround delays
      if (matchedBcs.length > 0) {
        dp.isDirect = false;
        dp.directCategory = '';
        dp.linkedBcIds = matchedBcs.map(b => b.id);
        dp.linkedBcRefs = matchedBcs.map(b => b.ref);
        dp.bcId = matchedBcs[0].id;
        syncDelayMetricsFromBcs(dp, matchedBcs);
        return;
      }

      // Strategy 5: Direct Payment Auto-Detection & Categorization
      for (const tax of DIRECT_PAYMENT_TAXONOMY) {
        if (tax.pattern.test(fullText)) {
          dp.isDirect = true;
          dp.directCategory = tax.category;
          dp.linkedBcIds = [];
          dp.linkedBcRefs = [];

          const reqD = dp.requestDate ? new Date(dp.requestDate) : null;
          const paidD = dp.paidDate ? new Date(dp.paidDate) : reqD;
          if (reqD && paidD && !isNaN(reqD) && !isNaN(paidD)) {
            dp.delayDpToPaymentDays = Math.max(0, Math.round((paidD - reqD) / 86400000));
            dp.totalPaymentDelayDays = dp.delayDpToPaymentDays;
            dp.delayStatus = dp.totalPaymentDelayDays < 7 ? 'rapide' : (dp.totalPaymentDelayDays <= 15 ? 'normal' : 'retard');
          } else {
            dp.delayDpToPaymentDays = 0;
            dp.totalPaymentDelayDays = 0;
            dp.delayStatus = 'rapide';
          }
          return;
        }
      }

      // Default for unlinked regular expenditures
      dp.isDirect = false;
      dp.linkedBcIds = dp.linkedBcIds || [];
      dp.linkedBcRefs = dp.linkedBcRefs || [];
    });
  },

  // 2. Inject scanner banners on "Suivi BC" and "Paiements"
  injectScannerBanners() {
    const followupPage = document.getElementById('page-followup');
    if (followupPage && !document.getElementById('bcScannerBanner')) {
      const banner = document.createElement('div');
      banner.id = 'bcScannerBanner';
      banner.className = 'scanner-banner';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <h3>⚡ Scanner Dossier BC</h3>
          <p>Extraction récursive Excel (articles, HT/TTC, dates, fournisseurs).</p>
        </div>
        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
          <input type="file" id="bcDirectoryInput" webkitdirectory directory multiple style="display:none;" onchange="ApproNextGen.handleBcDirectorySelect(event)">
          <button class="btn-scanner-action" type="button" onclick="document.getElementById('bcDirectoryInput').click();">📂 Dossier BC local</button>
          <button class="btn-scanner-action" type="button" style="background:#475569;" onclick="ApproNextGen.triggerServerBcScan();">🔄 Scan serveur</button>
        </div>
      `;
      const header = followupPage.querySelector('.page-header');
      if (header) header.insertAdjacentElement('afterend', banner);
    }

    const paymentsPage = document.getElementById('page-payments');
    if (paymentsPage && !document.getElementById('dpScannerBanner')) {
      const banner = document.createElement('div');
      banner.id = 'dpScannerBanner';
      banner.className = 'scanner-banner';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <h3>⚡ Scanner Dossier DP</h3>
          <p>Extraction Word &amp; Excel (montants, bénéficiaires, réfs BC &amp; dépenses directes).</p>
        </div>
        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
          <input type="file" id="dpDirectoryInput" webkitdirectory directory multiple style="display:none;" onchange="ApproNextGen.handleDpDirectorySelect(event)">
          <button class="btn-scanner-action btn-scanner-dp" type="button" onclick="document.getElementById('dpDirectoryInput').click();">📂 Dossier DP local</button>
          <button class="btn-scanner-action btn-scanner-dp" type="button" style="background:#0f766e;" onclick="ApproNextGen.triggerServerDpScan();">🔄 Scan serveur</button>
        </div>
      `;
      const header = paymentsPage.querySelector('.page-header');
      if (header) header.insertAdjacentElement('afterend', banner);
    }
  },

  // 3. BC Folder Scanner Implementation
  handleBcDirectorySelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const bcFiles = files.filter(f => /\.(xlsx|xls|xlsm)$/i.test(f.name) && !f.name.startsWith('~'));
    if (!bcFiles.length) {
      showToast('Aucun fichier Excel (.xlsx/.xls) trouvé dans le dossier sélectionné.');
      return;
    }

    this.showScannerModal('Scan des Bons de Commande', bcFiles.length);

    let processed = 0;
    let addedCount = 0;
    let updatedCount = 0;
    let batchDupSkipped = 0;
    const recordsMap = new Map();
    (state.bcRecords || []).forEach(r => {
      const k = getBcDedupKey(r.ref, r) || r.id;
      if (k && !recordsMap.has(k)) recordsMap.set(k, r);
    });
    const scannedBatchMap = new Map();

    const mergeMissingFields = (existing, incoming) => {
      const merged = mergeBcPreservingStatus(existing, {
        ...existing,
        supplierName: existing.supplierName || incoming.supplierName,
        date: existing.date || incoming.date,
        requestDate: existing.requestDate || incoming.requestDate,
        promisedDate: existing.promisedDate || incoming.promisedDate,
        amountHT: existing.amountHT || incoming.amountHT,
        amountTTC: existing.amountTTC || incoming.amountTTC,
        amount: existing.amount || incoming.amountTTC || incoming.amount,
        description: existing.description || incoming.description,
        department: existing.department || incoming.department,
        requester: existing.requester || incoming.requester,
        paymentTerms: existing.paymentTerms || incoming.paymentTerms,
        sourceFile: existing.sourceFile || incoming.sourceFile,
        subfolder: existing.subfolder || incoming.subfolder,
        lineItems: (Array.isArray(existing.lineItems) && existing.lineItems.length > 0) ? existing.lineItems : (incoming.lineItems || []),
        lineCount: existing.lineCount || incoming.lineCount || 0,
        totalQty: existing.totalQty || incoming.totalQty || 0,
        status: existing.status || incoming.status
      }, false);
      return merged;
    };

    const processNext = (index) => {
      if (index >= bcFiles.length) {
        this.updateScanLog(`Terminé ! ${processed} fichiers traités, ${addedCount} nouveaux BCs, ${updatedCount} actualisés${batchDupSkipped ? `, ${batchDupSkipped} doublons ignorés` : ''}.`, 'success');
        this.finishScanButton(async () => {
          state.bcRecords = Array.from(recordsMap.values());
          state.settings.bcSequence = Math.max(state.settings.bcSequence || 1, highestBcSequence() + 1);
          state.settings.daSequence = Math.max(state.settings.daSequence || 1, highestDaSequence() + 1);
          this.autoLinkBcsAndDps();
          if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
            window.bcBridge.cancelPendingSync();
          }
          saveState();
          if (typeof window !== 'undefined' && window.bcBridge && typeof window.bcBridge.cancelPendingSync === 'function') {
            window.bcBridge.cancelPendingSync();
          }
          if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
            const payload = state.bcRecords.map(r => {
              const copy = { ...r };
              if (!/^[a-f\d]{24}$/i.test(String(copy._id || ''))) delete copy._id;
              return copy;
            });
            fetch('/api/bc/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bcRecords: payload, records: payload, fromFolderScan: true })
            }).catch(() => {});
          }
          renderApp();
          showToast(`Scan terminé : ${addedCount} nouveaux, ${updatedCount} actualisés (${recordsMap.size} au total) !`);
        });
        if (event && event.target) event.target.value = '';
        return;
      }

      const file = bcFiles[index];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellFormula: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          if (ws) {
            const rawParsed = this.parseBcWorksheet(ws, file.name, file.webkitRelativePath || file.name);
            if (rawParsed && rawParsed.ref) {
              const parsed = typeof window.normalizeBcRecord === 'function' ? window.normalizeBcRecord(rawParsed) : rawParsed;
              const k = getBcDedupKey(parsed.ref, parsed);
              if (scannedBatchMap.has(k)) {
                const prevScan = scannedBatchMap.get(k);
                const mergedBatch = mergeMissingFields(prevScan, parsed);
                scannedBatchMap.set(k, mergedBatch);
                recordsMap.set(k, recordsMap.has(k) ? mergeMissingFields(recordsMap.get(k), mergedBatch) : mergedBatch);
                batchDupSkipped++;
                this.updateScanLog(`[${index + 1}/${bcFiles.length}] ⚠️ Doublon dossier fusionné : ${parsed.ref}`, 'info');
              } else {
                scannedBatchMap.set(k, parsed);
                if (recordsMap.has(k)) {
                  const existing = recordsMap.get(k);
                  recordsMap.set(k, mergeMissingFields(existing, parsed));
                  updatedCount++;
                  this.updateScanLog(`[${index + 1}/${bcFiles.length}] 🔄 Actualisé : ${parsed.ref} — ${parsed.supplierName}`, 'info');
                } else {
                  recordsMap.set(k, parsed);
                  addedCount++;
                  this.updateScanLog(`[${index + 1}/${bcFiles.length}] ➕ Nouveau : ${parsed.ref} — ${parsed.supplierName} (${formatMoney(parsed.amountTTC, 'DZD')})`, 'info');
                }
              }
            }
          }
        } catch (err) {
          this.updateScanLog(`[Erreur] ${file.name}: ${err.message}`, 'warn');
        }

        processed++;
        this.updateScanProgress(processed, bcFiles.length);
        setTimeout(() => processNext(index + 1), 10);
      };
      reader.readAsArrayBuffer(file);
    };

    processNext(0);
  },

  parseBcWorksheet(ws, filename, relativePath) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const getCellVal = (r, c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v ?? '').trim() : '';
    };

    let fileNum = '';
    const fnNum = filename.match(/BC\s*(\d+)/i);
    if (fnNum) fileNum = fnNum[1];

    let bcRef = '';
    let bcDate = '';
    let supplier = '';
    let amountHT = 0;
    let amountTTC = 0;
    const lineItems = [];

    // Scan headers
    for (let r = 0; r <= Math.min(range.e.r, 25); r++) {
      for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
        const val = getCellVal(r, c);
        const valUp = val.toUpperCase();
        if (!bcRef && (valUp.includes('BC N°') || valUp.includes('BC N'))) {
          const m = val.match(/BC\s*N[°o]?\s*([0-9]+[^\s\n]*)/i);
          if (m) bcRef = `BC N°${m[1]}`;
        }
        if (!bcDate && valUp.includes('DATE')) {
          const dm = val.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
          if (dm) bcDate = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
        }
        if (!supplier && valUp.includes('FOURNISSEUR')) {
          const m = val.match(/FOURNISSEUR\s*[:]\s*(.+)/i);
          if (m && m[1].trim()) supplier = m[1].trim();
          else supplier = getCellVal(r, c + 1) || getCellVal(r + 1, c) || '';
        }
      }
    }

    if (!supplier || supplier.toUpperCase().includes('DOUROUB')) {
      const fnClean = filename.replace(/BC\s*\d+/i, '').replace(/\.xlsx?/i, '').replace(/[-_]/g, ' ').trim();
      if (fnClean.length > 2) supplier = fnClean;
    }

    if (!bcRef && fileNum) bcRef = `BC N°${fileNum}/DG/2026`;
    if (!bcDate) bcDate = '2026-02-15';

    // Scan totals
    for (let r = 20; r <= Math.min(range.e.r, 120); r++) {
      for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
        const val = getCellVal(r, c).toUpperCase();
        if (val.includes('TOTAL HT')) {
          const v = parseFloat(getCellVal(r, c + 1).replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(v) && v > 0) amountHT = v;
        }
        if (val.includes('TOTAL TTC')) {
          const v = parseFloat(getCellVal(r, c + 1).replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(v) && v > 0) amountTTC = v;
        }
      }
    }

    // Scan line items
    for (let r = 20; r <= Math.min(range.e.r, 100); r++) {
      const descCell = getCellVal(r, 3) || getCellVal(r, 2);
      if (descCell && !descCell.toUpperCase().includes('TOTAL') && !descCell.toUpperCase().includes('REMARQUE') && descCell.length > 2) {
        const qty = parseFloat(getCellVal(r, 2).replace(/\s/g, '').replace(',', '.')) || 1;
        const pu = parseFloat(getCellVal(r, 6).replace(/\s/g, '').replace(',', '.')) || 0;
        const total = parseFloat(getCellVal(r, 7).replace(/\s/g, '').replace(',', '.')) || (qty * pu);
        lineItems.push({ description: descCell, qty: qty, unit: 'U', unitPrice: pu, lineTotal: total });
      }
    }

    if (!amountTTC && amountHT) amountTTC = Math.round(amountHT * 1.19);
    if (!amountHT && amountTTC) amountHT = Math.round(amountTTC / 1.19);
    if (!amountTTC && lineItems.length > 0) {
      const sumItems = lineItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
      if (sumItems > 0) {
        amountHT = Math.round(sumItems);
        amountTTC = Math.round(sumItems * 1.19);
      }
    }

    const type = (supplier.toUpperCase().includes('MAGHREB TRUCK') || supplier.toUpperCase().includes('VOYAGE') || supplier.toUpperCase().includes('HOTEL')) ? 'service' : 'achat';

    return {
      id: `bc_scan_${fileNum || Math.random().toString(36).substr(2, 6)}`,
      ref: bcRef,
      daRef: '',
      daStatus: 'validated',
      daValidatedAt: `${bcDate}T09:00:00.000Z`,
      requestDate: bcDate,
      date: bcDate,
      supplierName: supplier,
      amount: amountTTC || amountHT || 0,
      amountHT: amountHT,
      amountTTC: amountTTC,
      currency: 'DZD',
      type: type,
      description: lineItems[0]?.description || (supplier + ' - Prestation'),
      status: 'clos',
      promisedDate: bcDate,
      goodsReceivedDate: type === 'achat' ? bcDate : '',
      serviceDoneDate: type === 'service' ? bcDate : '',
      requester: 'Service Approvisionnement',
      paymentTerms: 'CHEQUE',
      sourceFile: relativePath,
      lineItems: lineItems,
      lineCount: lineItems.length,
      totalQty: lineItems.reduce((s, i) => s + (i.qty || 1), 0),
      department: typeof autoDept === 'function' ? autoDept(supplier) : 'Structure Transport',
      subfolder: relativePath.split('/')[0] || 'BC'
    };
  },

  // 4. Demande de Paiement Folder Scanner (Word .docx + Excel)
  handleDpDirectorySelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const dpFiles = files.filter(f => (f.name.endsWith('.docx') || f.name.endsWith('.xlsx')) && !f.name.startsWith('~'));
    if (!dpFiles.length) {
      showToast('Aucun fichier Demande de Paiement trouvé.');
      return;
    }

    this.showScannerModal('Scan des Demandes de Paiement', dpFiles.length);

    let processed = 0;
    let addedCount = 0;
    let updatedCount = 0;
    const dpsMap = new Map();
    (state.payments || []).forEach(p => {
      const normP = typeof normalizePayment === 'function' ? normalizePayment(p) : p;
      const k = (typeof getDpDedupKey === 'function' ? getDpDedupKey(normP) : '') || normP.paymentRef || normP.id;
      if (k) dpsMap.set(k, normP);
    });

    const processNext = (index) => {
      if (index >= dpFiles.length) {
        this.updateScanLog(`Scan DP terminé ! ${processed} fichiers traités (${addedCount} nouvelles DP, ${updatedCount} existantes fusionnées sans doublon).`, 'success');
        this.finishScanButton(() => {
          state.payments = deduplicatePaymentsList(Array.from(dpsMap.values()));
          this.autoLinkBcsAndDps();
          saveState();
          if (window.bcBridge && typeof window.bcBridge.syncPaymentsToServer === 'function') {
            window.bcBridge.syncPaymentsToServer();
          }
          renderApp();
          showToast(`${state.payments.length} Demandes de Paiement uniques indexées (${addedCount} nouvelles, ${updatedCount} mises à jour) !`);
        });
        return;
      }

      const file = dpFiles[index];
      if (file.name.endsWith('.docx') && typeof JSZip !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => {
          JSZip.loadAsync(e.target.result)
            .then(zip => {
              const docXml = zip.file('word/document.xml');
              if (docXml) return docXml.async('text');
              return '';
            })
            .then(xml => {
              if (xml) {
                const rawParsed = this.parseDpXml(xml, file.name, file.webkitRelativePath || file.name);
                const parsed = typeof normalizePayment === 'function' ? normalizePayment(rawParsed) : rawParsed;
                if (parsed && (parsed.id || parsed.paymentRef)) {
                  const dKey = (typeof getDpDedupKey === 'function' ? getDpDedupKey(parsed) : '') || parsed.paymentRef || parsed.id;
                  if (dpsMap.has(dKey)) {
                    const merged = typeof mergeTwoPayments === 'function' ? mergeTwoPayments(dpsMap.get(dKey), parsed) : dpsMap.get(dKey);
                    dpsMap.set(dKey, merged);
                    updatedCount++;
                  } else {
                    dpsMap.set(dKey, parsed);
                    addedCount++;
                  }
                  this.updateScanLog(`[${index + 1}/${dpFiles.length}] DP ${parsed.paymentRef} — ${parsed.beneficiary} (${formatMoney(parsed.amount, 'DZD')})`, 'info');
                }
              }
            })
            .catch(err => {
              this.updateScanLog(`[Erreur] ${file.name}: ${err.message}`, 'warn');
            })
            .finally(() => {
              processed++;
              this.updateScanProgress(processed, dpFiles.length);
              setTimeout(() => processNext(index + 1), 10);
            });
        };
        reader.readAsArrayBuffer(file);
      } else {
        processed++;
        this.updateScanProgress(processed, dpFiles.length);
        setTimeout(() => processNext(index + 1), 5);
      }
    };

    processNext(0);
  },

  parseDpXml(xml, filename, relativePath) {
    // Strip XML drawing/pict binary to prevent base64 noise
    let cleanXml = xml.replace(/<w:drawing[\s\S]*?<\/w:drawing>/gi, '');
    cleanXml = cleanXml.replace(/<w:pict[\s\S]*?<\/w:pict>/gi, '');

    const text = cleanXml.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    let ref = '';
    const ref_m = text.match(/Demande de paiement N[°o]?\s*[:]?\s*([0-9]+[/\-][0-9]+|[0-9]+)/i);
    if (ref_m) ref = ref_m[1];
    if (!ref) {
      const fn_m = filename.match(/PAIEMENT\s*([0-9]+)/i);
      if (fn_m) ref = `${fn_m[1]}/2026`;
    }

    let date_str = '';
    const m_date = text.match(/Date\s*\n\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i) || text.match(/(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/);
    if (m_date) {
      const parts = m_date[1].split(/[\/\-.]/);
      if (parts.length === 3 && parseInt(parts[2]) >= 2024) {
        date_str = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let amount = 0;
    const m_amt = text.match(/Montant\s*[:]?\s*(?:\n\s*)?([0-9\s\u00a0,.]+)/i) || text.match(/Montant\s*\n\s*([^\n]+)/i);
    if (m_amt) {
      const cleanNum = m_amt[1].replace(/DA/gi, '').replace(/[\s\u00a0]/g, '').replace(',', '.');
      const num_m = cleanNum.match(/([0-9]+(\.[0-9]+)?)/);
      if (num_m) amount = parseFloat(num_m[1]) || 0;
    }

    let ben = '';
    const m_ben = text.match(/B[ée]n[ée]ficiaire\s*:\s*([^\n]+)/i);
    if (m_ben) ben = m_ben[1].trim();
    if (!ben) {
      ben = filename.replace(/DEMANDE\s*DE\s*PAIEMENT\s*[0-9]+/i, '').replace('.docx', '').replace(/[-_]/g, ' ').trim();
    }
    ben = this.cleanArabicToFrench(ben) || 'Bénéficiaire';

    let nature = '';
    const m_nat = text.match(/Nature de la d[ée]pense\s*:\s*\n?\s*([^\n]+)/i);
    if (m_nat) nature = m_nat[1].trim();
    nature = this.cleanArabicToFrench(nature) || 'Dépense d\'exploitation';

    let ref_docs = '';
    const m_doc = text.match(/Pi[èe]ces?\s*R[ée]f[ée]rence\s*:\s*\n?\s*([^\n]+)/i);
    if (m_doc) ref_docs = m_doc[1].trim();
    ref_docs = this.cleanArabicToFrench(ref_docs);

    const fullDirectSearch = `${filename} ${ben} ${nature} ${ref_docs}`;
    let isDirect = false;
    let directCategory = '';
    for (const tax of DIRECT_PAYMENT_TAXONOMY) {
      if (tax.pattern.test(fullDirectSearch)) {
        isDirect = true;
        directCategory = tax.category;
        break;
      }
    }

    const canonicalRef = canonicalizeDpRef(ref, date_str || '2026-03-01');
    return {
      id: `dp_${(canonicalRef || ref || Math.random().toString(36).substr(2, 6)).replace(/[^a-zA-Z0-9]/g, '_')}`,
      paymentRef: canonicalRef || ref || `DP-${Math.random().toString(36).substr(2, 4)}`,
      requestDate: date_str || '2026-03-01',
      paidDate: date_str || '2026-03-15',
      amount: amount,
      beneficiary: ben,
      department: 'Direction Générale',
      natureExpense: nature,
      referenceDocs: ref_docs,
      isDirect: isDirect,
      directCategory: directCategory,
      status: amount > 0 ? 'paye' : 'programme',
      mode: /CHEQUE/i.test(ref_docs) ? 'cheque' : 'virement',
      sourceFile: this.cleanArabicToFrench(relativePath),
      linkedBcIds: []
    };
  },

  cleanArabicToFrench(text) {
    if (!text) return '';
    let s = String(text);
    s = s.replace(/\u0623\u0645\u064a\u0646\s*\u062e\u0632\u064a\u0646\u0629\s*\u0628\u0644\u062f\u064a\u0629\s*\u0628\u0633\u0643\u0631\u0629/g, 'Tresorier Communal de Biskra (Baladiya)');
    s = s.replace(/\u0628\u0644\u062f\u064a\u0629\s*\u0628\u0633\u0643\u0631\u0629/g, 'Baladiya Biskra');
    s = s.replace(/\u0627\u0644\u0646\u0642\u0627\u0621/g, 'EL-NAKAA');
    s = s.replace(/\u0622NAFTAL/g, 'NAFTAL');
    s = s.replace(/[\u0600-\u06FF]+/g, '').replace(/\s+/g, ' ').trim();
    return s;
  },

  // 5. Trigger Server-side scan APIs
  triggerServerBcScan() {
    this.showScannerModal('Scan des Bons de Commande', Math.max((state.bcRecords || []).length, 100));

    const mergeIncomingList = (incomingList) => {
      const recordsMap = new Map();
      (state.bcRecords || []).forEach(r => {
        const k = getBcDedupKey(r.ref, r) || r.id;
        if (k && !recordsMap.has(k)) recordsMap.set(k, r);
      });
      (incomingList || []).forEach(raw => {
        const norm = typeof window.normalizeBcRecord === 'function' ? window.normalizeBcRecord({ ...raw, _id: raw._id ? String(raw._id) : undefined, id: String(raw._id || raw.id || uid('bc')) }) : raw;
        const k = getBcDedupKey(norm.ref, norm) || norm.id;
        if (!k) return;
        if (recordsMap.has(k)) {
          recordsMap.set(k, mergeBcPreservingStatus(recordsMap.get(k), norm, false));
        } else {
          recordsMap.set(k, norm);
        }
      });
      state.bcRecords = Array.from(recordsMap.values());
      state.settings.bcSequence = Math.max(state.settings.bcSequence || 1, highestBcSequence() + 1);
      state.settings.daSequence = Math.max(state.settings.daSequence || 1, highestDaSequence() + 1);
    };

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      const preloadBcs = (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0)
        ? window.PRELOAD_DATA.bcRecords
        : [];
      if (preloadBcs.length > 0) mergeIncomingList(preloadBcs);
      this.updateScanProgress(100, 100);
      this.updateScanLog(`Mode Hors-Ligne (file://) : ${(state.bcRecords || []).length} Bons de Commande prêts !`, 'success');
      this.finishScanButton(() => {
        if (state.bcRecords.length > 0) this.autoLinkBcsAndDps();
        saveState();
        renderApp();
        showToast(`${state.bcRecords.length} BCs prêts (Mode Hors-ligne) !`);
      });
      return;
    }

    this.updateScanLog('Connexion au serveur Node / MongoDB et lancement du scan récursif...', 'info');
    const authHeaders = { 'Content-Type': 'application/json' };
    if (typeof localStorage !== 'undefined' && localStorage.getItem('erp_jwt_token')) {
      authHeaders['Authorization'] = 'Bearer ' + localStorage.getItem('erp_jwt_token');
    }

    fetch('/api/scan/bc', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ fromFolderScan: true })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.records)) {
          mergeIncomingList(res.records);
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Scan serveur réussi : ${res.records.length} BCs analysés (${state.bcRecords.length} uniques au total) !`, 'success');
          this.finishScanButton(() => {
            if (state.bcRecords.length > 0) this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${state.bcRecords.length} BCs synchronisés depuis le serveur !`);
          });
        } else {
          return fetch('/api/bc?limit=10000', { headers: authHeaders })
            .then(r => r.json())
            .then(atlasData => {
              const atlasBcs = atlasData.bcRecords || [];
              mergeIncomingList(atlasBcs);
              this.updateScanProgress(100, 100);
              this.updateScanLog(`Synchronisé depuis MongoDB Atlas : ${state.bcRecords.length} BCs !`, 'success');
              this.finishScanButton(() => {
                if (state.bcRecords.length > 0) this.autoLinkBcsAndDps();
                saveState();
                renderApp();
                showToast(`${state.bcRecords.length} BCs synchronisés depuis MongoDB !`);
              });
            });
        }
      })
      .catch(err => {
        this.updateScanLog(`Scan serveur indisponible (${err.message}).`, 'warn');
        this.updateScanProgress(100, 100);
        this.finishScanButton(() => {
          renderApp();
        });
      });
  },

  triggerServerDpScan() {
    this.showScannerModal('Scan des Demandes de Paiement', 148);

    const mergeAndDedupeDps = (incomingList) => {
      state.payments = deduplicatePaymentsList([
        ...(Array.isArray(state.payments) ? state.payments : []),
        ...(Array.isArray(incomingList) ? incomingList : []),
      ]);
      return state.payments.length;
    };

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      const records = (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length > 0)
        ? window.PRELOAD_DATA.payments
        : (state.payments || []);
      const count = mergeAndDedupeDps(records);
      this.updateScanProgress(100, 100);
      this.updateScanLog(`Mode Hors-Ligne (file://) : ${count} Demandes de Paiement uniques chargées !`, 'success');
      this.finishScanButton(() => {
        this.autoLinkBcsAndDps();
        saveState();
        renderApp();
        showToast(`${count} Demandes de Paiement prêtes (Mode Hors-ligne) !`);
      });
      return;
    }

    this.updateScanLog('Lancement du scan récursif des Demandes de Paiement...', 'info');

    fetch('/api/scan/dp', {
      method: 'POST',
      headers: (typeof localStorage !== 'undefined' && localStorage.getItem('erp_jwt_token')) ? { 'Authorization': 'Bearer ' + localStorage.getItem('erp_jwt_token') } : {}
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.records) {
          const count = mergeAndDedupeDps(res.records);
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Scan serveur terminé : ${count} Demandes de Paiement uniques indexées !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${count} Demandes de Paiement uniques chargées !`);
          });
        } else {
          if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
            const count = mergeAndDedupeDps(window.PRELOAD_DATA.payments);
            this.updateScanProgress(100, 100);
            this.updateScanLog(`Chargé : ${count} Demandes de Paiement uniques depuis le dataset embarqué !`, 'success');
            this.finishScanButton(() => {
              this.autoLinkBcsAndDps();
              saveState();
              renderApp();
              showToast(`${count} Demandes de Paiement prêtes !`);
            });
            return;
          }
          if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') return;
          return fetch('../data/extracted_dps_linked.json')
            .then(r => r.json())
            .then(localDps => {
              const count = mergeAndDedupeDps(localDps);
              this.updateScanProgress(100, 100);
              this.updateScanLog(`Chargé : ${count} Demandes de Paiement uniques !`, 'success');
              this.finishScanButton(() => {
                this.autoLinkBcsAndDps();
                saveState();
                renderApp();
                showToast(`${count} Demandes de Paiement prêtes !`);
              });
            });
        }
      })
      .catch(() => {
        if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
          const count = mergeAndDedupeDps(window.PRELOAD_DATA.payments);
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Données pré-scannées appliquées : ${count} Demandes de Paiement uniques !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${count} Demandes de Paiement prêtes !`);
          });
        }
      });
  },

  // Modal UI Helpers
  showScannerModal(title, totalFiles) {
    let modal = document.getElementById('scannerProgressModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scannerProgressModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal modal-card" style="max-width:90vw;width:900px;min-height:60vh;">
          <div class="modal-header">
            <h3 id="scanModalTitle">Scanner</h3>
            <button class="btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">&times;</button>
          </div>
          <div class="scanner-modal-content" style="padding:1rem 1.5rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:#64748b;">
              <span id="scanStatusText">Analyse des fichiers...</span>
              <strong id="scanCountText">0 / ${totalFiles}</strong>
            </div>
            <div class="scan-progress-bar-wrap" style="margin:10px 0;">
              <div class="scan-progress-bar" id="scanProgressBar"></div>
            </div>
            <div class="scan-log-box" id="scanLogBox" style="max-height:55vh;min-height:40vh;overflow-y:auto;font-size:13px;"></div>
          </div>
          <div class="modal-footer" id="scanModalFooter" style="display:flex;justify-content:flex-end;gap:0.6rem;padding:0.75rem 1rem;">
            <button class="btn btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">Fermer</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    document.getElementById('scanModalTitle').textContent = title;
    document.getElementById('scanCountText').textContent = `0 / ${totalFiles}`;
    document.getElementById('scanProgressBar').style.width = '0%';
    document.getElementById('scanLogBox').innerHTML = '<div class="scan-log-entry info">Démarrage du processus...</div>';
    modal.classList.remove('hidden');
  },

  updateScanProgress(current, total) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const bar = document.getElementById('scanProgressBar');
    const cnt = document.getElementById('scanCountText');
    if (bar) bar.style.width = `${pct}%`;
    if (cnt) cnt.textContent = `${current} / ${total} (${pct}%)`;
  },

  updateScanLog(msg, type = 'info') {
    const box = document.getElementById('scanLogBox');
    if (!box) return;
    const entry = document.createElement('div');
    entry.className = `scan-log-entry ${type}`;
    entry.textContent = msg;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
  },

  finishScanButton(onApply) {
    const footer = document.getElementById('scanModalFooter');
    if (!footer) return;
    footer.innerHTML = `
      <button class="btn btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">Fermer</button>
      <button class="btn btn-primary" type="button" id="btnApplyScanData">Appliquer & Actualiser l'Application</button>
    `;
    document.getElementById('btnApplyScanData').onclick = () => {
      document.getElementById('scannerProgressModal').classList.add('hidden');
      if (onApply) onApply();
    };
  },

  // 6. Demande de Paiement & BC Linking System
  populateDpSupplierFilter() {
    const sel = document.getElementById('paymentFilterSupplier');
    if (!sel) return;
    const prev = sel.value || 'all';
    const names = new Set();
    (state.payments || []).forEach(p => {
      const b = String(p.beneficiary || p.supplierName || '').trim();
      if (b) names.add(b);
    });
    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
    sel.innerHTML = `<option value="all">Tous bénéficiaires (${sorted.length})</option>` +
      sorted.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n.length > 34 ? n.slice(0, 32) + '…' : n)}</option>`).join('');
    if (prev !== 'all' && names.has(prev)) sel.value = prev;
  },

  computeFilteredPayments() {
    const q = typeof normalizeText === 'function' ? normalizeText($('paymentSearch')?.value || '') : String($('paymentSearch')?.value || '').toLowerCase().trim();
    const stFilter = $('paymentFilterStatus')?.value || 'all';
    const linkFilter = $('paymentFilterLink')?.value || 'all';
    const supFilter = $('paymentFilterSupplier')?.value || 'all';
    const modeFilter = $('paymentFilterMode')?.value || 'all';
    const dateFrom = $('paymentDateFrom')?.value || '';
    const dateTo = $('paymentDateTo')?.value || '';
    const sortField = $('paymentSortField')?.value || 'requestDate';
    const sortDir = $('paymentSortDir')?.value || 'desc';
    const dir = sortDir === 'asc' ? 1 : -1;

    return (state.payments || []).filter(row => {
      const isExcluded = Boolean(row.excluded || row.isSpecialCase);
      if (stFilter === 'excluded') {
        if (!isExcluded) return false;
      } else if (stFilter === 'all') {
        if (isExcluded) return false;
      } else if (stFilter !== 'all_with_excluded') {
        if (isExcluded) return false;
        const isPaid = isDpPaidStatus(row);
        if (stFilter === 'paye' && !isPaid) return false;
        if (stFilter === 'non_paye' && (isPaid || row.status === 'annule')) return false;
        if (stFilter === 'en_cours' && row.status !== 'programme' && row.status !== 'en_cours') return false;
        if (stFilter === 'annule' && row.status !== 'annule') return false;
      }

      const assocBcs = this.findAssociatedBcsForDp(row);
      if (linkFilter === 'linked' && (row.isDirect || assocBcs.length === 0)) return false;
      if (linkFilter === 'multi_bc' && (row.isDirect || assocBcs.length < 2)) return false;
      if (linkFilter === 'unlinked' && (row.isDirect || assocBcs.length > 0)) return false;
      if (linkFilter === 'direct' && !row.isDirect) return false;
      if (linkFilter === 'ia_candidate') {
        if (row.isDirect || assocBcs.length > 0) return false;
        const cands = window.LogicalMatchEngine ? window.LogicalMatchEngine.getLogicalBcCandidatesForDp(row) : [];
        if (!cands.some(c => c.score >= 45)) return false;
      }

      if (supFilter !== 'all') {
        const ben = String(row.beneficiary || row.supplierName || '').trim();
        if (ben !== supFilter && !assocBcs.some(b => String(b.supplierName || '').trim() === supFilter)) return false;
      }
      if (modeFilter !== 'all' && String(row.mode || 'virement').toLowerCase() !== modeFilter) return false;

      const refDate = row.requestDate || row.paidDate || '';
      if (dateFrom && (!refDate || refDate < dateFrom)) return false;
      if (dateTo && (!refDate || refDate > dateTo)) return false;

      if (q) {
        const hay = [
          row.paymentRef, row.beneficiary, row.supplierName, row.natureExpense,
          row.notes, row.transactionRef, row.amount, row.directCategory,
          ...assocBcs.map(b => `${b.ref || ''} ${b.supplierName || ''}`)
        ].filter(Boolean).join(' ');
        const normHay = typeof normalizeText === 'function' ? normalizeText(hay) : hay.toLowerCase();
        if (!normHay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'amount') return ((Number(a.amount) || 0) - (Number(b.amount) || 0)) * dir;
      if (sortField === 'paidDate') return String(a.paidDate || '').localeCompare(String(b.paidDate || '')) * dir;
      if (sortField === 'supplier') return String(a.beneficiary || '').localeCompare(String(b.beneficiary || ''), 'fr') * dir;
      if (sortField === 'paymentRef') return String(a.paymentRef || '').localeCompare(String(b.paymentRef || ''), 'fr', { numeric: true }) * dir;
      if (sortField === 'delay') return ((a.totalPaymentDelayDays || 0) - (b.totalPaymentDelayDays || 0)) * dir;
      return String(a.requestDate || a.paidDate || '').localeCompare(String(b.requestDate || b.paidDate || '')) * dir;
    });
  },

  renderDpSummaryBar(rows) {
    const el = document.getElementById('dpSummaryBar');
    if (!el) return;
    const allPayments = state.payments || [];
    const activeAll = allPayments.filter(r => !r.excluded && !r.isSpecialCase);
    const excludedAll = allPayments.filter(r => r.excluded || r.isSpecialCase);
    const excludedAmt = excludedAll.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const activeRows = rows.filter(r => !r.excluded && !r.isSpecialCase);
    const totalAmt = activeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const paidRows = activeRows.filter(isDpPaidStatus);
    const unpaidRows = activeRows.filter(r => !isDpPaidStatus(r) && r.status !== 'annule');
    const linkedRows = activeRows.filter(r => !r.isDirect && this.findAssociatedBcsForDp(r).length > 0);
    const unlinkedRows = activeRows.filter(r => !r.isDirect && this.findAssociatedBcsForDp(r).length === 0);
    el.innerHTML = `
      <div class="f-summary-card" style="cursor:pointer;" onclick="if($('paymentFilterStatus')){$('paymentFilterStatus').value='all';window.renderPaymentsTable();}" title="Afficher les DP actives"><span class="f-sum-lbl">Total DP (Actives)</span><strong class="f-sum-val">${activeRows.length}${activeRows.length !== activeAll.length ? ` / ${activeAll.length}` : ''}</strong></div>
      <div class="f-summary-card"><span class="f-sum-lbl">Montant Total (Calculé)</span><strong class="f-sum-val" style="color:var(--primary);">${formatMoney(totalAmt, 'DZD')}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #10b981;cursor:pointer;" onclick="if($('paymentFilterStatus')){$('paymentFilterStatus').value='paye';window.renderPaymentsTable();}"><span class="f-sum-lbl">✓ DP Payées</span><strong class="f-sum-val" style="color:#059669;">${paidRows.length}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #d97706;cursor:pointer;" onclick="if($('paymentFilterStatus')){$('paymentFilterStatus').value='non_paye';window.renderPaymentsTable();}"><span class="f-sum-lbl">⏳ En attente</span><strong class="f-sum-val" style="color:#d97706;">${unpaidRows.length}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #2563eb;"><span class="f-sum-lbl">🔗 Liées à un BC</span><strong class="f-sum-val" style="color:#2563eb;">${linkedRows.length}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #dc2626;"><span class="f-sum-lbl">⚠️ Sans BC liée</span><strong class="f-sum-val" style="color:#dc2626;">${unlinkedRows.length}</strong></div>
      <div class="f-summary-card" style="border-left:3px solid #7c3aed;cursor:pointer;" onclick="if($('paymentFilterStatus')){$('paymentFilterStatus').value=($('paymentFilterStatus').value==='excluded'?'all':'excluded');window.renderPaymentsTable();}" title="Cliquer pour filtrer les DP Cas spécial / Hors calcul"><span class="f-sum-lbl">🚫 Cas spéciaux (Hors calcul)</span><strong class="f-sum-val" style="color:#7c3aed;">${excludedAll.length} <small style="font-size:10.5px;font-weight:600;opacity:0.85;">(${formatMoney(excludedAmt, 'DZD')})</small></strong></div>
    `;
  },

  toggleDpExcluded(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;
    dp.excluded = !Boolean(dp.excluded || dp.isSpecialCase);
    dp.isSpecialCase = dp.excluded;
    if (dp.excluded && !dp.excludedReason) dp.excludedReason = 'Cas spécial (Hors calcul)';
    dp.updatedAt = nowIso();
    if (dp.excluded && typeof this.reconcileAfterDpRemoved === 'function') {
      this.reconcileAfterDpRemoved(dp);
    } else if (!dp.excluded && typeof this.cascadeDpStatusToLinkedBcs === 'function') {
      this.cascadeDpStatusToLinkedBcs(dp);
    }
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge) {
      if (typeof window.bcBridge.syncPaymentsToServer === 'function') window.bcBridge.syncPaymentsToServer();
      if (typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    }
    renderApp();
    showToast(dp.excluded ? `🚫 DP ${dp.paymentRef || ''} marquée "Cas spécial" (exclue des calculs).` : `↩️ DP ${dp.paymentRef || ''} réintégrée dans les calculs.`);
  },

  bulkToggleDpExcluded(ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    const targets = (state.payments || []).filter(p => ids.includes(p.id));
    if (!targets.length) return;
    const allAlreadyExcluded = targets.every(p => p.excluded || p.isSpecialCase);
    const nextState = !allAlreadyExcluded;
    targets.forEach(dp => {
      dp.excluded = nextState;
      dp.isSpecialCase = nextState;
      if (nextState && !dp.excludedReason) dp.excludedReason = 'Cas spécial (Hors calcul)';
      dp.updatedAt = nowIso();
      if (nextState && typeof this.reconcileAfterDpRemoved === 'function') this.reconcileAfterDpRemoved(dp);
      else if (!nextState && typeof this.cascadeDpStatusToLinkedBcs === 'function') this.cascadeDpStatusToLinkedBcs(dp);
    });
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge) {
      if (typeof window.bcBridge.syncPaymentsToServer === 'function') window.bcBridge.syncPaymentsToServer();
      if (typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    }
    renderApp();
    showToast(nextState ? `🚫 ${targets.length} DP marquée(s) "Cas spécial (Hors calcul)".` : `↩️ ${targets.length} DP réintégrée(s) dans les calculs.`);
  },

  bulkDeleteDps(ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    if (!confirm(`Supprimer définitivement ${ids.length} Demande(s) de Paiement sélectionnée(s) ?`)) return;
    const idSet = new Set(ids);
    const removed = (state.payments || []).filter(p => idSet.has(p.id));
    state.payments = (state.payments || []).filter(p => !idSet.has(p.id));
    removed.forEach(dp => {
      if (typeof this.reconcileAfterDpRemoved === 'function') this.reconcileAfterDpRemoved(dp);
      if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
        const apiId = encodeURIComponent(dp._id || dp.id);
        fetch(`/api/payments/${apiId}`, { method: 'DELETE' }).catch(() => {});
      }
    });
    if (window.selectedPaymentIds) window.selectedPaymentIds.clear();
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    renderApp();
    showToast(`🗑️ ${removed.length} Demande(s) de Paiement supprimée(s).`);
  },

  runManualDpDedupe() {
    const before = (state.payments || []).length;
    state.payments = deduplicatePaymentsList(state.payments || []);
    const after = state.payments.length;
    const removed = Math.max(0, before - after);
    this.autoLinkBcsAndDps();
    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      fetch('/api/payments/dedupe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      if (window.bcBridge && typeof window.bcBridge.syncPaymentsToServer === 'function') window.bcBridge.syncPaymentsToServer();
    }
    renderApp();
    showToast(removed > 0 ? `🧹 ${removed} doublon(s) DP supprimé(s) (${after} DP uniques conservées) !` : `✓ Aucun doublon détecté (${after} DP uniques).`);
  },

  updateDpBulkBar(visibleRows) {
    if (typeof window === 'undefined') return;
    window.selectedPaymentIds = window.selectedPaymentIds || new Set();
    const validIds = new Set((state.payments || []).map(p => p.id));
    Array.from(window.selectedPaymentIds).forEach(id => { if (!validIds.has(id)) window.selectedPaymentIds.delete(id); });

    const bar = document.getElementById('dpBulkActionBar');
    const selDps = (state.payments || []).filter(p => window.selectedPaymentIds.has(p.id));
    if (bar) bar.style.display = selDps.length > 0 ? 'flex' : 'none';

    const cntEl = document.getElementById('dpSelectedCount');
    const amtEl = document.getElementById('dpSelectedTotalAmt');
    const bcCntEl = document.getElementById('dpSelectedLinkedBcCount');
    if (cntEl) cntEl.textContent = String(selDps.length);
    if (amtEl) amtEl.textContent = formatMoney(selDps.reduce((s, p) => s + (Number(p.amount) || 0), 0), 'DZD');
    if (bcCntEl) {
      const bcSet = new Set();
      selDps.forEach(p => this.findAssociatedBcsForDp(p).forEach(b => bcSet.add(b.id)));
      bcCntEl.textContent = String(bcSet.size);
    }

    const selectAll = document.getElementById('selectAllPayments');
    if (selectAll) {
      const vis = Array.isArray(visibleRows) ? visibleRows : this.computeFilteredPayments();
      const visSelected = vis.filter(r => window.selectedPaymentIds.has(r.id)).length;
      selectAll.checked = vis.length > 0 && visSelected === vis.length;
      selectAll.indeterminate = visSelected > 0 && visSelected < vis.length;
    }
  },

  bindDpBulkEventsOnce() {
    if (typeof document === 'undefined' || this._dpBulkBound) return;
    this._dpBulkBound = true;
    window.selectedPaymentIds = window.selectedPaymentIds || new Set();

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'selectAllPayments') {
        const checked = e.target.checked;
        const vis = this.computeFilteredPayments();
        vis.forEach(r => {
          if (checked) window.selectedPaymentIds.add(r.id);
          else window.selectedPaymentIds.delete(r.id);
        });
        window.renderPaymentsTable();
        return;
      }
      const rowChk = e.target && e.target.closest ? e.target.closest('.dp-select-checkbox') : null;
      if (rowChk) {
        const id = rowChk.getAttribute('data-id');
        if (id) {
          if (rowChk.checked) window.selectedPaymentIds.add(id);
          else window.selectedPaymentIds.delete(id);
          const tr = rowChk.closest('tr');
          if (tr) tr.classList.toggle('selected-row', rowChk.checked);
          this.updateDpBulkBar();
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target || !e.target.closest) return;
      if (e.target.closest('#bulkMarkDpPaidBtn')) {
        const ids = Array.from(window.selectedPaymentIds || []);
        if (!ids.length) return;
        this.bulkSetDpStatus(ids, 'paye');
        window.selectedPaymentIds.clear();
        this.updateDpBulkBar();
      } else if (e.target.closest('#bulkMarkDpPendingBtn')) {
        const ids = Array.from(window.selectedPaymentIds || []);
        if (!ids.length) return;
        this.bulkSetDpStatus(ids, 'en_attente');
        window.selectedPaymentIds.clear();
        this.updateDpBulkBar();
      } else if (e.target.closest('#bulkAutoLinkDpBtn')) {
        const ids = Array.from(window.selectedPaymentIds || []);
        if (!ids.length || !window.LogicalMatchEngine) return;
        let linked = 0;
        ids.forEach(dpId => {
          const dp = (state.payments || []).find(p => p.id === dpId);
          if (!dp || dp.isDirect || this.findAssociatedBcsForDp(dp).length > 0) return;
          const top = window.LogicalMatchEngine.getLogicalBcCandidatesForDp(dp)[0];
          if (top && top.score >= 45) {
            this.linkBcAndDpPair(dp, top.bcs, false, true);
            linked++;
          }
        });
        window.selectedPaymentIds.clear();
        window.LogicalMatchEngine.invalidate();
        saveState();
        if (window.bcBridge && typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
        renderApp();
        showToast(linked > 0 ? `🧠 ${linked} DP sélectionnée(s) rapprochée(s) automatiquement !` : 'Aucun candidat IA ≥45% pour les DP sélectionnées.');
      } else if (e.target.closest('#bulkExcludeDpBtn')) {
        const ids = Array.from(window.selectedPaymentIds || []);
        if (!ids.length) return;
        this.bulkToggleDpExcluded(ids);
        window.selectedPaymentIds.clear();
        this.updateDpBulkBar();
      } else if (e.target.closest('#bulkDeleteDpBtn')) {
        const ids = Array.from(window.selectedPaymentIds || []);
        if (!ids.length) return;
        this.bulkDeleteDps(ids);
      } else if (e.target.closest('#bulkClearDpSelectionBtn')) {
        window.selectedPaymentIds.clear();
        window.renderPaymentsTable();
      }
    });
  },

  overridePaymentsTable() {
    this.bindDpBulkEventsOnce();
    window.filteredPayments = () => this.computeFilteredPayments();
    window.renderPaymentsTable = () => {
      this.populateDpSupplierFilter();
      const rows = this.computeFilteredPayments();
      this.renderDpSummaryBar(rows);
      const tbody = $('paymentsTableBody');
      if (!tbody) return;
      window.selectedPaymentIds = window.selectedPaymentIds || new Set();

      tbody.innerHTML = rows.length ? rows.map(row => {
        const isExcluded = Boolean(row.excluded || row.isSpecialCase);
        const isPaid = isDpPaidStatus(row);
        const isSelected = window.selectedPaymentIds.has(row.id);
        const assocBcs = this.findAssociatedBcsForDp(row);
        const stPill = isExcluded
          ? `<span class="status-pill" style="background:rgba(124,58,237,0.14);color:#6d28d9;border:1px solid rgba(124,58,237,0.35);font-weight:700;cursor:pointer;" onclick="ApproNextGen.toggleDpExcluded('${row.id}')" title="DP exclue des calculs (Cas spécial) — Cliquer pour réintégrer">🚫 Cas spécial (Hors calcul)</span>`
          : (isPaid
            ? '<span class="status-pill ok" style="cursor:pointer;" onclick="ApproNextGen.toggleSingleDpPaid(\'' + row.id + '\')" title="Cliquer pour basculer En attente">✓ Payé</span>'
            : (row.status === 'annule'
              ? '<span class="status-pill danger">✕ Annulé</span>'
              : (row.status === 'programme'
                ? '<span class="status-pill warn" style="cursor:pointer;" onclick="ApproNextGen.toggleSingleDpPaid(\'' + row.id + '\')" title="Cliquer pour marquer Payé">📅 Programmé</span>'
                : '<span class="status-pill warn" style="cursor:pointer;" onclick="ApproNextGen.toggleSingleDpPaid(\'' + row.id + '\')" title="Cliquer pour marquer Payé">⏳ En attente</span>')));

        let linkingBadge = '';
        if (row.isDirect) {
          const catLbl = row.directCategory ? ` (${escapeHtml(row.directCategory)})` : '';
          linkingBadge = `<span class="dp-badge-direct" title="Dépense directe sans BC${catLbl}">⚡ Sans BC</span>`;
        } else if (assocBcs.length > 1) {
          const refsStr = assocBcs.map(b => b.ref).join(', ');
          linkingBadge = `<span class="dp-badge-multi" style="cursor:pointer;" onclick="ApproNextGen.openLinkingModal('${row.id}')" title="Liée à ${assocBcs.length} BCs : ${escapeHtml(refsStr)}">📦 Lot (${assocBcs.length} BCs)</span>`;
        } else if (assocBcs.length === 1) {
          linkingBadge = `<span class="dp-badge-linked" style="cursor:pointer;" onclick="window.openBcDetailModal && window.openBcDetailModal('${assocBcs[0].id}')" title="Ouvrir ${escapeHtml(assocBcs[0].ref)}">✓ ${escapeHtml(assocBcs[0].ref)}</span>`;
        } else {
          const topAi = window.LogicalMatchEngine ? window.LogicalMatchEngine.getLogicalBcCandidatesForDp(row)[0] : null;
          if (topAi && topAi.score >= 45) {
            const cRef = topAi.bcs.map(b => b.ref).join('+');
            linkingBadge = `<button type="button" class="bc-ai-suggest-chip" onclick="ApproNextGen.openLinkingModal('${row.id}')" title="Suggestion IA : ${escapeHtml(cRef)} (${topAi.score}%)">🤖 ${escapeHtml(cRef.length > 14 ? cRef.slice(0, 13) + '…' : cRef)} (${topAi.score}%)</button>`;
          } else {
            linkingBadge = `<span class="dp-badge-pending" style="cursor:pointer;" onclick="ApproNextGen.openLinkingModal('${row.id}')" title="Cliquer pour lier à un BC">⚠️ À lier</span>`;
          }
        }

        const totalCycle = row.totalPaymentDelayDays ?? (row.delayBcToDpDays ?? (row.requestDate && row.paidDate ? businessDaysBetween(row.requestDate, row.paidDate) : 0));
        const delayTone = (row.delayStatus === 'retard' || totalCycle > 30) ? 'late' : ((row.delayStatus === 'normal' || totalCycle > 15) ? 'warn' : 'ok');
        const benText = row.beneficiary || row.supplierName || '—';
        const objText = row.natureExpense || row.notes || '—';
        const modeTxt = row.mode ? (row.mode.charAt(0).toUpperCase() + row.mode.slice(1)) : 'Virement';

        return `<tr class="${isSelected ? 'selected-row' : ''}" style="${isExcluded ? 'opacity:0.72;background:rgba(124,58,237,0.04);' : ''}">
          <td style="text-align:center;"><input type="checkbox" class="dp-select-checkbox" data-id="${escapeHtml(row.id)}" ${isSelected ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;" /></td>
          <td><strong>${escapeHtml(row.paymentRef || '—')}</strong></td>
          <td>${stPill}</td>
          <td>${linkingBadge}</td>
          <td class="cell-ellipsis" style="max-width:170px;" title="${escapeHtml(benText)}">${escapeHtml(benText)}</td>
          <td class="cell-ellipsis" style="max-width:175px;" title="${escapeHtml(objText)}">${escapeHtml(objText)}</td>
          <td style="white-space:nowrap;">${escapeHtml(formatDate(row.requestDate))}</td>
          <td style="white-space:nowrap;">${row.paidDate ? escapeHtml(formatDate(row.paidDate)) : '<span class="muted">—</span>'}</td>
          <td style="white-space:nowrap;text-align:right;"><strong style="${isExcluded ? 'text-decoration:line-through;color:#64748b;' : ''}">${escapeHtml(formatMoney(row.amount, 'DZD'))}</strong></td>
          <td title="${escapeHtml(row.transactionRef || '')}"><span class="badge bg-light text-dark">${escapeHtml(modeTxt)}</span></td>
          <td><span class="delay-pill ${delayTone}">${totalCycle} j</span></td>
          <td><div class="table-actions icon-actions" style="display:flex;gap:3px;align-items:center;flex-wrap:nowrap;">
            <button class="btn btn-xs ${isPaid ? 'btn-ghost' : 'btn-success'}" type="button" style="${isPaid ? 'padding:2px 6px;' : 'background:#059669;color:#fff;border:none;padding:2px 6px;'}" onclick="ApproNextGen.toggleSingleDpPaid('${row.id}')" title="${isPaid ? 'Remettre en attente' : 'Marquer Payé (+ BC associés)'}">${isPaid ? '↺' : '✓'}</button>
            <button class="btn btn-soft btn-xs" type="button" style="padding:2px 6px;" onclick="ApproNextGen.openLinkingModal('${row.id}')" title="Lier aux Bons de Commande">🔗</button>
            <button class="btn btn-xs" type="button" style="padding:2px 6px;background:${isExcluded ? 'rgba(16,185,129,0.14)' : 'rgba(124,58,237,0.12)'};color:${isExcluded ? '#059669' : '#6d28d9'};border:1px solid ${isExcluded ? 'rgba(16,185,129,0.35)' : 'rgba(124,58,237,0.3)'};" onclick="ApproNextGen.toggleDpExcluded('${row.id}')" title="${isExcluded ? 'Réintégrer cette DP dans les calculs' : 'Cas spécial : Exclure cette DP des calculs'}">${isExcluded ? '↩️' : '🚫'}</button>
            ${typeof iconActionButton === 'function' ? `${iconActionButton('edit', 'edit-payment', row.id, 'Modifier DP')}${iconActionButton('delete', 'delete-payment', row.id, 'Supprimer DP')}` : ''}
          </div></td>
        </tr>`;
      }).join('') : `<tr><td colspan="12" class="muted">Aucune demande de paiement correspondant aux filtres.</td></tr>`;

      if (typeof bindTableActions === 'function') bindTableActions();
      if (typeof setTableCount === 'function') setTableCount('paymentsCount', rows.length);
      this.updateDpBulkBar(rows);
      if (typeof window.updateTopNavBadges === 'function') window.updateTopNavBadges();
    };
    window._enhancedRenderPaymentsTable = window.renderPaymentsTable;
  },

  openLinkingModal(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    let modal = document.getElementById('dpLinkingModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dpLinkingModal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const currentLinkedIds = new Set(dp.linkedBcIds || []);
    const matchingSupplier = (dp.beneficiary || '').toLowerCase();

    // Filter relevant BCs (sort matching supplier to top)
    const sortedBcs = [...state.bcRecords].sort((a, b) => {
      const aMatch = a.supplierName?.toLowerCase().includes(matchingSupplier);
      const bMatch = b.supplierName?.toLowerCase().includes(matchingSupplier);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    modal.innerHTML = `
      <div class="modal modal-card" style="max-width:820px;">
        <div class="modal-header">
          <h3>🔗 Liaison Demande de Paiement & Bons de Commande</h3>
          <button class="btn-ghost" type="button" onclick="document.getElementById('dpLinkingModal').classList.add('hidden')">&times;</button>
        </div>
        <div class="modal-body" style="padding:1.25rem;">
          <div class="linking-card">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <span style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:700;">Demande de Paiement</span>
                <h4 style="margin:2px 0;font-size:1.15rem;font-weight:800;color:#0f172a;">${escapeHtml(dp.paymentRef)}</h4>
                <div style="font-size:0.85rem;color:#334155;"><strong>Bénéficiaire :</strong> ${escapeHtml(dp.beneficiary)}</div>
                <div style="font-size:0.8rem;color:#64748b;"><strong>Objet :</strong> ${escapeHtml(dp.natureExpense || 'Non précisé')}</div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:700;">Montant de la DP</span>
                <div style="font-size:1.5rem;font-weight:900;color:#2563eb;">${formatMoney(dp.amount, 'DZD')}</div>
                <span style="font-size:0.8rem;color:#64748b;">Date: ${formatDate(dp.requestDate)}</span>
              </div>
            </div>
          </div>

          <!-- Checkbox for Direct DP without BC -->
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <label style="cursor:pointer;font-weight:700;color:#6b21a8;display:flex;align-items:center;gap:0.5rem;margin:0;">
                <input type="checkbox" id="dpIsDirectCheck" ${dp.isDirect ? 'checked' : ''} onchange="ApproNextGen.onToggleDirectDp(this.checked)">
                <span>Dépense directe sans Bon de Commande (ex: Sonelgaz, Impôts, Baladiya, Assurance, Notaire)</span>
              </label>
              <div style="font-size:0.75rem;color:#9333ea;margin-top:2px;">Cochez cette option si cette dépense ne fait l'objet d'aucun bon de commande.</div>
            </div>
            <button class="btn btn-soft btn-xs" type="button" onclick="ApproNextGen.autoSuggestLinks('${dp.id}')">
              🤖 Auto-Détecter
            </button>
          </div>

          <!-- Live Balance Meter -->
          <div class="linking-calc-meter" id="linkingCalcMeter">
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Montant DP</span>
              <div class="calc-meter-val">${formatMoney(dp.amount, 'DZD')}</div>
            </div>
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Total BCs Cochés</span>
              <div class="calc-meter-val" id="linkingSelectedTotal">0,00 DZD</div>
            </div>
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Écart / Différence</span>
              <div class="calc-meter-val calc-meter-diff" id="linkingDiffVal">0,00 DZD</div>
            </div>
          </div>

          <!-- BC Search & Selection Table -->
          <div style="margin-bottom:0.5rem;display:flex;gap:0.5rem;">
            <input type="search" id="linkingBcSearch" class="field" placeholder="Filtrer réf BC, fournisseur, montant..." style="margin:0;width:100%;" oninput="ApproNextGen.filterLinkingBcs(this.value)">
          </div>

          <div class="bc-selection-list" id="bcSelectionList">
            ${sortedBcs.map(bc => {
              const isChecked = currentLinkedIds.has(bc.id);
              return `
                <div class="bc-selection-row ${isChecked ? 'selected' : ''}" data-id="${bc.id}" data-amount="${bc.amountTTC || bc.amount || 0}" onclick="ApproNextGen.toggleBcSelection('${bc.id}')">
                  <input type="checkbox" class="bc-select-chk" value="${bc.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();ApproNextGen.toggleBcSelection('${bc.id}');">
                  <div style="flex-grow:1;">
                    <div style="display:flex;justify-content:space-between;font-weight:700;">
                      <span>${escapeHtml(bc.ref)} <span style="font-weight:400;color:#64748b;">(${formatDate(bc.date)})</span></span>
                      <span style="color:#0f172a;">${formatMoney(bc.amountTTC || bc.amount, 'DZD')}</span>
                    </div>
                    <div style="font-size:0.75rem;color:#475569;">
                      <strong>${escapeHtml(bc.supplierName)}</strong> · ${escapeHtml(bc.description || 'Prestation')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.6rem;padding:0.75rem 1.25rem;">
          <button class="btn btn-ghost" type="button" onclick="document.getElementById('dpLinkingModal').classList.add('hidden')">Annuler</button>
          <button class="btn btn-primary" type="button" onclick="ApproNextGen.saveLinking('${dp.id}')">
            💾 Enregistrer la Liaison
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    this.updateLinkingCalc(dp.amount);
  },

  toggleBcSelection(bcId) {
    const row = document.querySelector(`.bc-selection-row[data-id="${bcId}"]`);
    if (!row) return;
    const chk = row.querySelector('.bc-select-chk');
    chk.checked = !chk.checked;
    if (chk.checked) row.classList.add('selected');
    else row.classList.remove('selected');

    // If direct is checked, uncheck it
    const directChk = document.getElementById('dpIsDirectCheck');
    if (directChk && directChk.checked) directChk.checked = false;

    this.updateLinkingCalc();
  },

  onToggleDirectDp(checked) {
    if (checked) {
      document.querySelectorAll('.bc-select-chk').forEach(c => {
        c.checked = false;
        c.closest('.bc-selection-row')?.classList.remove('selected');
      });
      this.updateLinkingCalc();
    }
  },

  updateLinkingCalc(targetAmt) {
    const checkedRows = Array.from(document.querySelectorAll('.bc-selection-row .bc-select-chk:checked')).map(c => c.closest('.bc-selection-row'));
    const totalSelected = checkedRows.reduce((sum, r) => sum + (parseFloat(r.getAttribute('data-amount')) || 0), 0);

    const isDirect = document.getElementById('dpIsDirectCheck')?.checked;
    const dpValEl = document.querySelector('.linking-calc-meter .calc-meter-val');
    const target = targetAmt || (dpValEl ? parseFloat(dpValEl.textContent.replace(/[^0-9.]/g, '')) : 0);

    const selEl = document.getElementById('linkingSelectedTotal');
    const diffEl = document.getElementById('linkingDiffVal');

    if (selEl) selEl.textContent = isDirect ? '0,00 DZD (Sans BC)' : formatMoney(totalSelected, 'DZD');
    if (diffEl) {
      if (isDirect) {
        diffEl.textContent = 'Dépense Directe';
        diffEl.className = 'calc-meter-val calc-meter-diff ok';
      } else {
        const diff = target - totalSelected;
        diffEl.textContent = formatMoney(diff, 'DZD');
        diffEl.className = `calc-meter-val calc-meter-diff ${Math.abs(diff) < 1 ? 'ok' : 'diff'}`;
      }
    }
  },

  filterLinkingBcs(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('.bc-selection-row').forEach(row => {
      const txt = row.textContent.toLowerCase();
      row.style.display = txt.includes(q) ? 'flex' : 'none';
    });
  },

  autoSuggestLinks(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    // Reset current selections
    document.querySelectorAll('.bc-selection-row').forEach(r => {
      r.classList.remove('selected');
      const c = r.querySelector('.bc-select-chk');
      if (c) c.checked = false;
    });

    const fullText = `${dp.beneficiary || ''} ${dp.natureExpense || ''} ${dp.referenceDocs || ''} ${dp.sourceFile || ''} ${dp.paymentRef || ''}`;

    // Direct Payment Check
    for (const tax of DIRECT_PAYMENT_TAXONOMY) {
      if (tax.pattern.test(fullText)) {
        const directChk = document.getElementById('dpIsDirectCheck');
        if (directChk) directChk.checked = true;
        this.updateLinkingCalc(dp.amount);
        showToast(`Dépense directe identifiée : ${tax.category} !`);
        return;
      }
    }

    const directChk = document.getElementById('dpIsDirectCheck');
    if (directChk) directChk.checked = false;

    const matchedIds = new Set();
    if (window.LogicalMatchEngine && typeof window.LogicalMatchEngine.getLogicalBcCandidatesForDp === 'function') {
      const aiCands = window.LogicalMatchEngine.getLogicalBcCandidatesForDp(dp);
      if (aiCands.length > 0 && aiCands[0].score >= 45) {
        aiCands[0].bcs.forEach(b => matchedIds.add(b.id));
      }
    }

    if (matchedIds.size === 0) {
      const nums = window.LogicalMatchEngine ? window.LogicalMatchEngine.extractBcNumbers(dp) : [];
      nums.forEach(num => {
        const cand = state.bcRecords.find(b => {
          const bNum = (b.ref || '').match(/(\d+)/);
          return bNum && parseInt(bNum[1], 10) === num;
        });
        if (cand) matchedIds.add(cand.id);
      });
    }

    matchedIds.forEach(id => {
      const row = document.querySelector(`.bc-selection-row[data-id="${id}"]`);
      if (row) {
        row.classList.add('selected');
        const chk = row.querySelector('.bc-select-chk');
        if (chk) chk.checked = true;
      }
    });

    this.updateLinkingCalc(dp.amount);
    if (matchedIds.size > 0) {
      showToast(`${matchedIds.size} bon(s) de commande correspondant(s) détecté(s) par l'IA !`);
    } else {
      showToast("Aucune correspondance automatique trouvée. Vous pouvez cocher manuellement.");
    }
  },

  saveLinking(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    const isDirect = document.getElementById('dpIsDirectCheck')?.checked;
    const selectedBcIds = Array.from(document.querySelectorAll('.bc-selection-row .bc-select-chk:checked')).map(c => c.value);
    const prevBcIds = Array.from(new Set([
      ...(Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []),
      ...(dp.bcId ? [dp.bcId] : []),
      ...this.findAssociatedBcsForDp(dp).map(b => b.id)
    ]));

    dp.isDirect = Boolean(isDirect);
    dp.linkedBcIds = isDirect ? [] : selectedBcIds;
    dp.bcId = isDirect ? '' : (selectedBcIds[0] || '');
    dp.manualLink = true;
    dp.updatedAt = new Date().toISOString();

    prevBcIds.filter(id => !dp.linkedBcIds.includes(id)).forEach(oldId => {
      const oldBc = state.bcRecords.find(b => b.id === oldId);
      if (oldBc) {
        if (String(oldBc.dpRef || '') === String(dp.paymentRef || '')) oldBc.dpRef = '';
        if (String(oldBc.paymentRef || '') === String(dp.paymentRef || '')) oldBc.paymentRef = '';
        this._recomputeBcPaymentFromRemainingDps(oldBc);
      }
    });

    if (isDirect) {
      // Find direct category if matched
      const fullText = `${dp.beneficiary || ''} ${dp.natureExpense || ''} ${dp.referenceDocs || ''} ${dp.sourceFile || ''} ${dp.paymentRef || ''}`;
      for (const tax of DIRECT_PAYMENT_TAXONOMY) {
        if (tax.pattern.test(fullText)) {
          dp.directCategory = tax.category;
          break;
        }
      }
      dp.linkedBcRefs = [];
      const reqD = dp.requestDate ? new Date(dp.requestDate) : null;
      const paidD = dp.paidDate ? new Date(dp.paidDate) : reqD;
      if (reqD && paidD && !isNaN(reqD) && !isNaN(paidD)) {
        dp.delayDpToPaymentDays = Math.max(0, Math.round((paidD - reqD) / 86400000));
        dp.totalPaymentDelayDays = dp.delayDpToPaymentDays;
        dp.delayStatus = dp.totalPaymentDelayDays < 7 ? 'rapide' : (dp.totalPaymentDelayDays <= 15 ? 'normal' : 'retard');
      }
    } else {
      const linkedBcs = [];
      let maxTotalDelay = 0;
      let minBcToDp = 9999;

      selectedBcIds.forEach(bcId => {
        const bc = state.bcRecords.find(b => b.id === bcId);
        if (bc) {
          linkedBcs.push(bc);
          this.applyPaidDpToBc(bc, dp);

          if ((bc.totalPaymentDelayDays || 0) > maxTotalDelay) maxTotalDelay = bc.totalPaymentDelayDays;
          if (bc.delayBcToDpDays != null && bc.delayBcToDpDays < minBcToDp) minBcToDp = bc.delayBcToDpDays;
        }
      });

      dp.linkedBcRefs = linkedBcs.map(b => b.ref);
      dp.delayBcToDpDays = minBcToDp === 9999 ? 0 : minBcToDp;
      dp.totalPaymentDelayDays = maxTotalDelay;
      dp.delayStatus = maxTotalDelay < 15 ? 'rapide' : (maxTotalDelay <= 30 ? 'normal' : 'retard');
    }

    if (window.LogicalMatchEngine) window.LogicalMatchEngine.invalidate();
    saveState();
    if (typeof window !== 'undefined' && window.bcBridge) {
      if (typeof window.bcBridge.syncBcToServer === 'function') window.bcBridge.syncBcToServer();
    }
    renderApp();
    const modalEl = document.getElementById('dpLinkingModal');
    if (modalEl) modalEl.classList.add('hidden');
    showToast('Liaison et métriques de règlement synchronisées !');
  },

  // 7. Next-Gen KPI Dashboard Overhauls
  injectKpiAdvancedControls() {
    const kpiPage = document.getElementById('page-kpi');
    if (!kpiPage) return;

    // Remove any duplicate period bars if present
    const periodBars = kpiPage.querySelectorAll('.sa-period-bar-container');
    if (periodBars.length > 1) {
      for (let i = 1; i < periodBars.length; i++) {
        periodBars[i].remove();
      }
    }

    if (document.getElementById('kpiNextGenControls')) return;

    const filterRow = kpiPage.querySelector('.kpi-filter-bar');
    if (!filterRow) return;

    const advWrap = document.createElement('div');
    advWrap.id = 'kpiNextGenControls';
    advWrap.innerHTML = `
      <!-- Advanced Dual Filters: Spending Tier & Payment Delay -->
      <div id="kpiDualFilterBox" style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:1.25rem;background:#ffffff;padding:1.25rem 1.5rem;border-radius:14px;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(15,23,42,0.04);">
        <div style="flex:1;min-width:260px;">
          <label style="font-size:0.82rem;font-weight:800;color:#1e293b;text-transform:uppercase;display:flex;align-items:center;gap:6px;margin-bottom:0.45rem;letter-spacing:0.04em;">
            💳 Tranche de Montant
          </label>
          <select id="kpiSpendTierSelect" class="form-select" onchange="ApproNextGen.setSpendTier(this.value)" style="height:44px;font-size:0.92rem;font-weight:600;border-radius:10px;border:1.5px solid #cbd5e1;padding:0 12px;background-color:#ffffff;color:#0f172a;">
            <option value="all">Tous les montants</option>
            <option value="tier_under_100k">&lt; 100 000 DZD (Petits achats)</option>
            <option value="tier_100k_500k">100 000 – 500 000 DZD (Achats moyens)</option>
            <option value="tier_500k_2m">500 000 – 2 000 000 DZD (Achats majeurs)</option>
            <option value="tier_over_2m">&gt; 2 000 000 DZD (Gros investissements)</option>
          </select>
        </div>

        <div style="flex:1;min-width:260px;">
          <label style="font-size:0.82rem;font-weight:800;color:#1e293b;text-transform:uppercase;display:flex;align-items:center;gap:6px;margin-bottom:0.45rem;letter-spacing:0.04em;">
            ⏱️ Délai de Règlement (Jours)
          </label>
          <select id="kpiDelayFilterSelect" class="form-select" onchange="ApproNextGen.setDelayFilter(this.value)" style="height:44px;font-size:0.92rem;font-weight:600;border-radius:10px;border:1.5px solid #cbd5e1;padding:0 12px;background-color:#ffffff;color:#0f172a;">
            <option value="all">Tous les délais</option>
            <option value="under_15">&lt; 15 jours (Règlement rapide)</option>
            <option value="15_30">15 à 30 jours (Délai normal)</option>
            <option value="30_60">30 à 60 jours (Délai modéré)</option>
            <option value="over_60">&gt; 60 jours (Retard critique)</option>
            <option value="unpaid">Non encore réglés</option>
          </select>
        </div>

        <div style="flex:1.2;min-width:320px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
            <label style="font-size:0.82rem;font-weight:800;color:#1e293b;text-transform:uppercase;margin:0;display:flex;align-items:center;gap:6px;letter-spacing:0.04em;">
              ⚖️ Comparateur Fournisseur(s)
            </label>
            <button type="button" onclick="ApproNextGen.clearSupplierComparison()" style="background:none;border:none;color:#ef4444;font-size:0.82rem;cursor:pointer;padding:0;font-weight:700;"><i class="fas fa-trash-alt me-1"></i>Réinitialiser</button>
          </div>
          <select id="kpiMultiSupplierCompare" class="form-select" onfocus="ApproNextGen.populateSupplierCompareDropdown()" onclick="ApproNextGen.populateSupplierCompareDropdown()" onchange="ApproNextGen.addSupplierToComparison(this.value);this.value='';" style="height:44px;font-size:0.92rem;font-weight:600;border-radius:10px;border:1.5px solid #3b82f6;padding:0 12px;background-color:#ffffff;color:#0f172a;cursor:pointer;">
            <option value="">+ Ajouter un fournisseur à comparer...</option>
          </select>
          <div id="kpiSelectedSuppliersChips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;"></div>
        </div>
      </div>
    `;

    filterRow.insertAdjacentElement('beforebegin', advWrap);
    this.populateSupplierCompareDropdown();
  },

  setKpiPeriod(period) {
    this.currentKpiPeriod = period;
    document.querySelectorAll('.btn-kpi-preset').forEach(btn => {
      if (btn.getAttribute('data-period') === period) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const now = new Date();
    const fromInput = $('kpiDateFrom');
    const toInput = $('kpiDateTo');

    if (period === 'all') {
      if (fromInput) fromInput.value = '';
      if (toInput) toInput.value = '';
    } else if (period === '2026') {
      if (fromInput) fromInput.value = '2026-01-01';
      if (toInput) toInput.value = '2026-12-31';
    } else if (period === 'month') {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      if (fromInput) fromInput.value = mStr;
      if (toInput) toInput.value = '';
    } else if (period === '30d') {
      const d30 = new Date(now.getTime() - (30 * 86400000));
      if (fromInput) fromInput.value = d30.toISOString().split('T')[0];
      if (toInput) toInput.value = '';
    }

    renderKpi();
  },

  setSpendTier(tier) {
    this.spendingAmountTier = tier;
    renderKpi();
  },

  setDelayFilter(filter) {
    this.paymentDelayFilter = filter;
    renderKpi();
  },

  populateSupplierCompareDropdown() {
    const supSelect = document.getElementById('kpiMultiSupplierCompare');
    if (!supSelect) return;
    const selected = (this.selectedComparisonSuppliers || []).map(s => String(s).toLowerCase().trim());
    const rawSups = [];
    if (typeof state !== 'undefined') {
      if (Array.isArray(state.bcRecords)) {
        state.bcRecords.forEach(r => { if (r.supplierName) rawSups.push(r.supplierName); });
      }
      if (Array.isArray(state.suppliers)) {
        state.suppliers.forEach(s => {
          const name = typeof s === 'object' ? s.name : s;
          if (name) rawSups.push(name);
        });
      }
    }
    const suppliers = [...new Set(rawSups.map(s => String(s || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    const available = suppliers.filter(s => !selected.includes(s.toLowerCase()));

    supSelect.innerHTML = ['<option value="">+ Ajouter un fournisseur à comparer...</option>'].concat(
      available.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    ).join('');
    supSelect.value = '';
  },

  addSupplierToComparison(sup) {
    if (!sup) return;
    const cleanSup = String(sup).trim();
    if (!cleanSup) return;
    if (!this.selectedComparisonSuppliers) this.selectedComparisonSuppliers = [];
    if (!this.selectedComparisonSuppliers.some(s => s.toLowerCase() === cleanSup.toLowerCase())) {
      this.selectedComparisonSuppliers.push(cleanSup);
    }
    this.renderSupplierChips();
    this.populateSupplierCompareDropdown();
    if (typeof renderKpi === 'function') {
      renderKpi();
    } else {
      const records = (typeof getKpiFilteredRecords === 'function') ? getKpiFilteredRecords() : (typeof state !== 'undefined' ? (state.bcRecords || []) : []);
      this.renderMultiSupplierComparison(records);
    }
  },

  removeSupplierCompare(sup) {
    if (!this.selectedComparisonSuppliers) return;
    const cleanSup = String(sup).trim().toLowerCase();
    this.selectedComparisonSuppliers = this.selectedComparisonSuppliers.filter(s => s.toLowerCase() !== cleanSup);
    this.renderSupplierChips();
    this.populateSupplierCompareDropdown();
    if (typeof renderKpi === 'function') {
      renderKpi();
    } else {
      const records = (typeof getKpiFilteredRecords === 'function') ? getKpiFilteredRecords() : (typeof state !== 'undefined' ? (state.bcRecords || []) : []);
      this.renderMultiSupplierComparison(records);
    }
  },

  clearSupplierComparison() {
    this.selectedComparisonSuppliers = [];
    this.renderSupplierChips();
    this.populateSupplierCompareDropdown();
    if (typeof renderKpi === 'function') {
      renderKpi();
    } else {
      const records = (typeof getKpiFilteredRecords === 'function') ? getKpiFilteredRecords() : (typeof state !== 'undefined' ? (state.bcRecords || []) : []);
      this.renderMultiSupplierComparison(records);
    }
  },

  renderSupplierChips() {
    const host = document.getElementById('kpiSelectedSuppliersChips');
    if (!host) return;
    const list = this.selectedComparisonSuppliers || [];
    if (list.length === 0) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = list.map(s => `
      <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;background:#2563eb;color:#fff;font-size:0.78rem;font-weight:700;box-shadow:0 1px 3px rgba(37,99,235,0.3);letter-spacing:0.02em;">
        <i class="fas fa-building text-light" style="font-size:10px;"></i>
        ${escapeHtml(s)}
        <i class="fas fa-times" style="cursor:pointer;opacity:0.8;margin-left:2px;" data-sup="${encodeURIComponent(s)}" onclick="ApproNextGen.removeSupplierCompare(decodeURIComponent(this.getAttribute('data-sup')))" title="Retirer de la comparaison" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'"></i>
      </span>
    `).join('');
  },

  updateSupplierComparison(selectEl) {
    if (!selectEl) return;
    const val = selectEl.value;
    if (val) {
      this.addSupplierToComparison(val);
      selectEl.value = '';
    }
  },

  overrideKpiDashboard() {
    // Intercept and wrap window.getKpiFilteredRecords to apply next-gen filters
    const origGetKpiFilteredRecords = window.getKpiFilteredRecords;
    window.getKpiFilteredRecords = () => {
      let records = origGetKpiFilteredRecords ? origGetKpiFilteredRecords() : (state.bcRecords || []);

      // 1. Spending tier filter
      if (this.spendingAmountTier && this.spendingAmountTier !== 'all') {
        records = records.filter(r => {
          const amt = Number(r.amountTTC || r.amount || 0);
          switch (this.spendingAmountTier) {
            case 'tier_under_100k': return amt < 100000;
            case 'tier_100k_500k': return amt >= 100000 && amt <= 500000;
            case 'tier_500k_2m': return amt > 500000 && amt <= 2000000;
            case 'tier_over_2m': return amt > 2000000;
            default: return true;
          }
        });
      }

      // 2. Payment turnaround delay filter
      if (this.paymentDelayFilter && this.paymentDelayFilter !== 'all') {
        records = records.filter(r => {
          const isPaid = (r.status === 'paye' || Boolean(r.paymentPaidDate));
          if (this.paymentDelayFilter === 'unpaid') {
            return !isPaid;
          }
          if (!isPaid) return false;
          const days = r.totalPaymentDelayDays ?? (r.date && r.paymentPaidDate ? (typeof businessDaysBetween === 'function' ? businessDaysBetween(r.date, r.paymentPaidDate) : Math.round((new Date(r.paymentPaidDate) - new Date(r.date)) / 86400000)) : null);
          if (days == null) return false;
          switch (this.paymentDelayFilter) {
            case 'under_15': return days < 15;
            case '15_30': return days >= 15 && days <= 30;
            case '30_60': return days > 30 && days <= 60;
            case 'over_60': return days > 60;
            default: return true;
          }
        });
      }

      // 3. Multi-supplier comparison filter (if selected)
      if (this.selectedComparisonSuppliers && this.selectedComparisonSuppliers.length > 0) {
        const selNorm = this.selectedComparisonSuppliers.map(s => String(s || '').trim().toLowerCase());
        records = records.filter(r => selNorm.includes(String(r.supplierName || '').trim().toLowerCase()));
      }

      return records;
    };

    const originalRenderKpi = window.renderKpi;

    window.renderKpi = () => {
      // Execute original render
      if (originalRenderKpi) {
        try { originalRenderKpi(); } catch(e) {}
      }

      // Populate supplier compare select with all available suppliers
      const supSelect = document.getElementById('kpiMultiSupplierCompare');
      if (supSelect && typeof state !== 'undefined') {
        const rawSups = [
          ...(Array.isArray(state.bcRecords) ? state.bcRecords.map(r => r.supplierName) : []),
          ...(Array.isArray(state.suppliers) ? state.suppliers.map(s => typeof s === 'object' ? s.name : s) : [])
        ];
        const suppliers = [...new Set(rawSups.map(s => String(s || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        if (suppliers.length > 0 && (!supSelect.options || supSelect.options.length <= 1 || supSelect.options.length !== suppliers.length + 1)) {
          const curSupVal = supSelect.value || '';
          supSelect.innerHTML = ['<option value="">+ Ajouter un fournisseur à comparer...</option>'].concat(
            suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
          ).join('');
          supSelect.value = curSupVal;
        }
      }

      // Extract filtered records
      const records = (typeof getKpiFilteredRecords === 'function') ? getKpiFilteredRecords() : (state.bcRecords || []);

      // 1. Render Advanced Financial Intelligence & Supplier Analytics (Créances, Prévision, Consommation, Moyennes)
      this.renderFinancialIntelligenceSection(records);

      // 2. Render Delay Analytics
      this.renderDelayAnalyticsSection(records);

      // 3. Render Top Purchased Articles
      this.renderTopArticlesSection(records);

      // 4. Render Multi-Supplier Comparison Matrix
      this.renderMultiSupplierComparison(records);
    };
  },

  renderDelayAnalyticsSection(records) {
    let section = document.getElementById('kpiDelayAnalyticsSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiDelayAnalyticsSection';
      const charts = document.getElementById('dashboardCharts');
      if (charts) charts.insertAdjacentElement('beforebegin', section);
    }

    // Compute delay metrics
    let totalDelayDays = 0;
    let delayCount = 0;
    let under15 = 0, b15_30 = 0, b30_60 = 0, over60 = 0;
    const criticalLateList = [];

    records.forEach(r => {
      const days = r.totalPaymentDelayDays ?? (r.date && r.paymentPaidDate ? businessDaysBetween(r.date, r.paymentPaidDate) : null);
      if (days != null) {
        totalDelayDays += days;
        delayCount++;
        if (days < 15) under15++;
        else if (days <= 30) b15_30++;
        else if (days <= 60) b30_60++;
        else {
          over60++;
          criticalLateList.push({ ...r, delay: days });
        }
      }
    });

    const avgSettlementDays = delayCount > 0 ? Math.round(totalDelayDays / delayCount) : 18;

    section.innerHTML = `
      <div class="delay-analytics-grid">
        <div class="delay-card">
          <div class="delay-card-header">
            <span class="delay-card-title"><i class="fas fa-stopwatch text-primary"></i> Délai Moyen de Règlement (Jours)</span>
            <span class="badge bg-primary-subtle text-primary font-monospace">${delayCount} commandes analysées</span>
          </div>
          <div class="delay-metric-val">${avgSettlementDays} <span style="font-size:1.1rem;font-weight:600;color:#64748b;">jours</span></div>
          <div class="delay-metric-sub">Délai global moyen entre émission du bon de commande et paiement effectif</div>

          <div class="delay-buckets-row">
            <div class="delay-bucket b-green">
              <div class="b-val">${under15}</div>
              <div class="b-lbl">&lt; 15j (Rapide)</div>
            </div>
            <div class="delay-bucket b-blue">
              <div class="b-val">${b15_30}</div>
              <div class="b-lbl">15-30j (Standard)</div>
            </div>
            <div class="delay-bucket b-amber">
              <div class="b-val">${b30_60}</div>
              <div class="b-lbl">30-60j (Modéré)</div>
            </div>
            <div class="delay-bucket b-red">
              <div class="b-val">${over60}</div>
              <div class="b-lbl">&gt; 60j (Critique)</div>
            </div>
          </div>
        </div>

        <div class="delay-card">
          <div class="delay-card-header">
            <span class="delay-card-title"><i class="fas fa-triangle-exclamation text-danger"></i> Alertes Délais & Retards Critiques</span>
            <span class="badge bg-danger">${criticalLateList.length} alertes</span>
          </div>
          <div style="max-height:160px;overflow-y:auto;font-size:0.8rem;">
            ${criticalLateList.slice(0, 5).map(c => `
              <div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid #f1f5f9;">
                <div><strong>${escapeHtml(c.ref)}</strong> · ${escapeHtml(c.supplierName)}</div>
                <div><span class="badge bg-danger-subtle text-danger font-monospace">+${c.delay} jours</span></div>
              </div>
            `).join('') || '<div class="text-muted py-2">Aucun retard critique sur la période filtrée.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  renderTopArticlesSection(records) {
    let section = document.getElementById('kpiTopArticlesSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiTopArticlesSection';
      const delaySec = document.getElementById('kpiDelayAnalyticsSection');
      if (delaySec) delaySec.insertAdjacentElement('afterend', section);
    }

    // Aggregate line items
    const articleStats = {};
    records.forEach(r => {
      (r.lineItems || []).forEach(it => {
        const desc = (it.description || '').trim();
        if (desc && desc.length > 2 && !desc.toUpperCase().includes('TOTAL') && !desc.toUpperCase().includes('REMARQUE')) {
          if (!articleStats[desc]) articleStats[desc] = { name: desc, qty: 0, spend: 0, count: 0 };
          articleStats[desc].qty += (it.qty || 1);
          articleStats[desc].spend += (it.lineTotal || (it.qty * (it.unitPrice || 0)) || 0);
          articleStats[desc].count++;
        }
      });
    });

    const topArticles = Object.values(articleStats).sort((a, b) => b.spend - a.spend).slice(0, 10);
    const maxSpend = topArticles[0] ? topArticles[0].spend : 1;

    section.innerHTML = `
      <div class="top-articles-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <h4 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;">
              📦 Top 10 des Articles les Plus Achetés
            </h4>
            <small class="text-muted">Classement par volume financier engagé et quantités commandées</small>
          </div>
          <span class="badge bg-light text-muted border">${Object.keys(articleStats).length} articles au catalogue</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:1.5rem;">
          <div>
            ${topArticles.map((art, idx) => {
              const pct = Math.round((art.spend / maxSpend) * 100);
              return `
                <div class="article-rank-row">
                  <div class="article-rank-num">${idx + 1}</div>
                  <div class="article-rank-name" onclick="ApproNextGen.filterByArticle('${escapeHtml(art.name)}')" title="Cliquer pour filtrer les commandes">
                    ${escapeHtml(art.name)}
                    <div style="font-size:0.72rem;color:#64748b;font-weight:400;">${art.count} commande(s) · Quantité : ${art.qty}</div>
                  </div>
                  <div class="article-rank-meter-wrap">
                    <div class="article-rank-meter" style="width:${pct}%;"></div>
                  </div>
                  <div style="font-weight:700;font-size:0.85rem;color:#0f172a;min-width:110px;text-align:right;">
                    ${formatMoney(art.spend, 'DZD')}
                  </div>
                </div>
              `;
            }).join('') || '<div class="text-muted">Aucun article trouvé.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  filterByArticle(articleName) {
    const input = document.getElementById('followupSearch');
    if (input) {
      input.value = articleName;
      if (typeof setActiveTab === 'function') setActiveTab('followup');
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
      if (typeof showToast === 'function') showToast(`Filtré par article : "${articleName}"`);
    }
  },

  renderMultiSupplierComparison(records) {
    let section = document.getElementById('kpiSupplierComparisonSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiSupplierComparisonSection';
      const anchor = document.getElementById('kpiTopArticlesSection') || document.getElementById('kpiDelayAnalyticsSection') || document.getElementById('dashboardCharts');
      if (anchor) {
        anchor.insertAdjacentElement('afterend', section);
      } else {
        const pk = document.getElementById('page-kpi');
        if (pk) pk.appendChild(section);
      }
    }

    const selected = this.selectedComparisonSuppliers;
    if (!selected || selected.length === 0) {
      section.innerHTML = `
        <div class="comparison-container" style="background:#ffffff;text-align:center;padding:1.5rem;border-radius:12px;border:1px dashed #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <h5 style="margin:0 0 0.25rem 0;color:#0f172a;font-weight:700;">⚖️ Comparateur Fournisseurs</h5>
          <p class="text-muted small mb-0">Sélectionnez un ou plusieurs fournisseurs dans le filtre supérieur pour afficher leur analyse détaillée et les comparer côte à côte.</p>
        </div>
      `;
      return;
    }

    const basePool = (typeof state !== 'undefined' && Array.isArray(state.bcRecords) && state.bcRecords.length > 0) ? state.bcRecords : records;
    const compData = selected.map(sup => {
      const normSup = String(sup || '').trim().toLowerCase();
      const supRecords = basePool.filter(r => {
        const rName = String(r.supplierName || '').trim().toLowerCase();
        return rName === normSup || (normSup.length >= 4 && (rName.includes(normSup) || normSup.includes(rName)));
      });
      const spend = supRecords.reduce((s, r) => s + (Number(r.amountTTC || r.amount) || 0), 0);
      const avgTicket = supRecords.length > 0 ? Math.round(spend / supRecords.length) : 0;
      const delivered = supRecords.filter(r => r.goodsReceivedDate || r.serviceDoneDate).length;
      const deliveryRate = supRecords.length > 0 ? Math.round((delivered / supRecords.length) * 100) : 0;

      return {
        name: sup,
        ordersCount: supRecords.length,
        totalSpend: spend,
        avgTicket: avgTicket,
        deliveryRate: deliveryRate
      };
    });

    const isSingle = selected.length === 1;

    section.innerHTML = `
      <div class="comparison-container" style="background:#fff;border-radius:12px;padding:1.2rem;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div class="comparison-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
          <div>
            <h4 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;">
              ${isSingle ? '📊 Scorecard & Analyse Fournisseur' : `⚖️ Matrice Comparative Multi-Fournisseurs (${selected.length} sélectionnés)`}
            </h4>
            <small class="text-muted">${isSingle ? 'Indicateurs clés de performance du fournisseur sélectionné' : 'Analyse comparative des volumes, paniers moyens et taux d\'exécution'}</small>
          </div>
          <button class="btn btn-ghost btn-xs" type="button" onclick="ApproNextGen.clearSupplierComparison()" style="color:#ef4444;font-weight:600;"><i class="fas fa-trash-alt me-1"></i> Réinitialiser</button>
        </div>

        ${isSingle ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;font-size:0.8rem;color:#1e40af;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-info-circle"></i> <span>Astuce : Ajoutez un 2ème fournisseur dans le sélecteur ci-dessus pour lancer la comparaison directe côte-à-côte.</span>
          </div>
        ` : ''}

        <div class="comparison-cards-grid">
          ${compData.map(c => `
            <div class="supplier-comp-card">
              <h4>${escapeHtml(c.name)}</h4>
              <div class="comp-metric-row">
                <span>Volume d'achats TTC :</span>
                <strong>${formatMoney(c.totalSpend, 'DZD')}</strong>
              </div>
              <div class="comp-metric-row">
                <span>Nombre de commandes :</span>
                <strong>${c.ordersCount} BC(s)</strong>
              </div>
              <div class="comp-metric-row">
                <span>Panier moyen :</span>
                <strong>${formatMoney(c.avgTicket, 'DZD')}</strong>
              </div>
              <div class="comp-metric-row">
                <span>Taux de réalisation :</span>
                <span class="badge ${c.deliveryRate >= 80 ? 'bg-success' : 'bg-warning text-dark'}">${c.deliveryRate}%</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${compData.length >= 2 ? `
          <div style="margin-top:1.5rem;overflow-x:auto;">
            <table class="table table-bordered table-hover mb-0" style="font-size:0.85rem;background:#ffffff;border-radius:8px;overflow:hidden;">
              <thead style="background:#f1f5f9;">
                <tr>
                  <th style="padding:10px 12px;color:#334155;">Indicateur Clé</th>
                  ${compData.map(c => `<th style="text-align:center;padding:10px 12px;color:#0f172a;font-weight:700;">${escapeHtml(c.name)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:8px 12px;font-weight:600;"><i class="fas fa-coins text-warning me-2"></i>Volume d'achats TTC</td>
                  ${compData.map(c => `<td style="text-align:center;padding:8px 12px;font-weight:700;color:#2563eb;">${formatMoney(c.totalSpend, 'DZD')}</td>`).join('')}
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:600;"><i class="fas fa-file-invoice text-primary me-2"></i>Commandes Total</td>
                  ${compData.map(c => `<td style="text-align:center;padding:8px 12px;font-weight:600;">${c.ordersCount} BC</td>`).join('')}
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:600;"><i class="fas fa-basket-shopping text-info me-2"></i>Panier Moyen</td>
                  ${compData.map(c => `<td style="text-align:center;padding:8px 12px;">${formatMoney(c.avgTicket, 'DZD')}</td>`).join('')}
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:600;"><i class="fas fa-truck-ramp-box text-success me-2"></i>Taux d'Exécution</td>
                  ${compData.map(c => `<td style="text-align:center;padding:8px 12px;"><span class="badge ${c.deliveryRate >= 80 ? 'bg-success' : 'bg-warning text-dark'}">${c.deliveryRate}%</span></td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  },

  // Performance Cache Engine
  _memo: {},
  _getFp(recs) {
    if (!recs || !Array.isArray(recs)) return '';
    const len = recs.length;
    if (len === 0) return '0';
    const first = recs[0] || {};
    const mid = recs[Math.floor(len / 2)] || {};
    const last = recs[len - 1] || {};
    const s1 = first.id || first.ref || first.supplierName || (first.amountTTC || first.amount || '');
    const s2 = mid.id || mid.ref || mid.supplierName || (mid.amountTTC || mid.amount || '');
    const s3 = last.id || last.ref || last.supplierName || (last.amountTTC || last.amount || '');
    return `${len}_${s1}_${s2}_${s3}`;
  },
  _getMemo(key, recs) {
    if (!this._memo) this._memo = {};
    if (!recs || !Array.isArray(recs)) return null;
    const fp = this._getFp(recs);
    if (this._memo[key] && this._memo[key].fp === fp) return this._memo[key].data;
    return null;
  },
  _setMemo(key, recs, data) {
    if (!this._memo) this._memo = {};
    if (!recs || !Array.isArray(recs)) return;
    const fp = this._getFp(recs);
    this._memo[key] = { fp, data };
  },
  clearMemo() {
    this._memo = {};
  },

  // 1. Calculate Total Suppliers Créances (Dettes fournisseurs / Restant dû)
  calculateSuppliersCreances(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('creances', bcs);
    if (cached) return cached;
    const supMap = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || 'Fournisseur non spécifié').trim();
      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supplierName: sup,
          committedTTC: 0,
          committedHT: 0,
          paidAmount: 0,
          creance: 0,
          bcCount: 0,
          paidBcCount: 0,
          unpaidBcCount: 0
        });
      }
      const entry = supMap.get(sup);
      const amtTTC = Number(bc.amountTTC || bc.amount || 0);
      const amtHT = Number(bc.amountHT || amtTTC / 1.19 || 0);
      entry.committedTTC += amtTTC;
      entry.committedHT += amtHT;
      entry.bcCount += 1;

      if (bc.status === 'paye' || Boolean(bc.paymentPaidDate) || (bc.dpRef && bc.dpRef.length > 0)) {
        entry.paidAmount += amtTTC;
        entry.paidBcCount += 1;
      } else {
        entry.unpaidBcCount += 1;
      }
    });

    let totalCommittedTTC = 0;
    let totalPaidAmount = 0;
    let totalCreance = 0;
    let suppliersWithDebtCount = 0;

    const suppliersList = [];
    supMap.forEach((entry) => {
      entry.creance = Math.max(0, entry.committedTTC - entry.paidAmount);
      totalCommittedTTC += entry.committedTTC;
      totalPaidAmount += entry.paidAmount;
      totalCreance += entry.creance;
      if (entry.creance > 0) suppliersWithDebtCount++;
      suppliersList.push(entry);
    });

    suppliersList.sort((a, b) => b.creance - a.creance);

    const result = {
      totalCommittedTTC,
      totalPaidAmount,
      totalCreance,
      suppliersWithDebtCount,
      totalSuppliersCount: suppliersList.length,
      suppliers: suppliersList
    };
    this._setMemo('creances', bcs, result);
    return result;
  },

  // 2. Monthly Budget Forecasting / Cash-out Prevision per Month
  calculateMonthlyPrevision(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('prevision', bcs);
    if (cached) return cached;
    const monthLabels = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const months = [];
    const curYear = 2026;

    for (let m = 1; m <= 12; m++) {
      const mStr = `${curYear}-${String(m).padStart(2, '0')}`;
      months.push({
        key: mStr,
        label: `${monthLabels[m - 1]} ${curYear}`,
        monthNum: m,
        realizedDisbursements: 0,
        pendingCommitments: 0,
        projectedCashOut: 0,
        bcCount: 0
      });
    }

    const monthMap = new Map(months.map(m => [m.key, m]));

    bcs.forEach(bc => {
      const amt = Number(bc.amountTTC || bc.amount || 0);
      const isPaid = (bc.status === 'paye' || Boolean(bc.paymentPaidDate));
      const payDate = bc.paymentPaidDate || bc.date;

      if (isPaid && payDate) {
        const mKey = String(payDate).substring(0, 7);
        if (monthMap.has(mKey)) {
          const mObj = monthMap.get(mKey);
          mObj.realizedDisbursements += amt;
          mObj.bcCount += 1;
        }
      } else {
        let targetDate = bc.deliveryDate || bc.goodsReceivedDate || bc.date;
        let mKey = targetDate ? String(targetDate).substring(0, 7) : '2026-10';
        if (!monthMap.has(mKey)) mKey = '2026-10';
        const mObj = monthMap.get(mKey);
        if (mObj) {
          mObj.pendingCommitments += amt;
        }
      }
    });

    months.forEach(m => {
      m.projectedCashOut = m.realizedDisbursements + m.pendingCommitments;
    });

    const now = new Date();
    const currentMonthNum = (now.getFullYear() === curYear) ? (now.getMonth() + 1) : 10;
    const currentMKey = `${curYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const nextMonthNum = Math.min(12, currentMonthNum + 1);
    const nextMKey = `${curYear}-${String(nextMonthNum).padStart(2, '0')}`;
    const followingMonthNum = Math.min(12, currentMonthNum + 2);
    const followingMKey = `${curYear}-${String(followingMonthNum).padStart(2, '0')}`;

    const result = {
      months,
      currentMonth: monthMap.get(currentMKey) || months[currentMonthNum - 1] || months[0],
      nextMonth: monthMap.get(nextMKey) || months[nextMonthNum - 1] || months[1],
      followingMonth: monthMap.get(followingMKey) || months[followingMonthNum - 1] || months[2],
      totalProjectedYear: months.reduce((s, m) => s + m.projectedCashOut, 0)
    };
    this._setMemo('prevision', bcs, result);
    return result;
  },

  // 3. Monthly Consumption Trends & Volume Analysis
  calculateMonthlyConsumption(records) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('consumption', bcs);
    if (cached) return cached;
    const monthStats = {};

    bcs.forEach(bc => {
      if (!bc.date) return;
      const mKey = String(bc.date).substring(0, 7);
      if (!monthStats[mKey]) {
        monthStats[mKey] = {
          month: mKey,
          totalSpend: 0,
          ordersCount: 0,
          avgOrderValue: 0
        };
      }
      const amt = Number(bc.amountTTC || bc.amount || 0);
      monthStats[mKey].totalSpend += amt;
      monthStats[mKey].ordersCount += 1;
    });

    const sortedMonths = Object.keys(monthStats).sort().map((k, idx, arr) => {
      const obj = monthStats[k];
      obj.avgOrderValue = obj.ordersCount > 0 ? Math.round(obj.totalSpend / obj.ordersCount) : 0;
      if (idx > 0) {
        const prevSpend = monthStats[arr[idx - 1]].totalSpend;
        obj.growthMoM = prevSpend > 0 ? Math.round(((obj.totalSpend - prevSpend) / prevSpend) * 100) : 0;
      } else {
        obj.growthMoM = 0;
      }
      return obj;
    });

    const totalSpend = sortedMonths.reduce((s, m) => s + m.totalSpend, 0);
    const avgMonthlySpend = sortedMonths.length > 0 ? Math.round(totalSpend / sortedMonths.length) : 0;

    const result = {
      months: sortedMonths,
      totalSpend,
      avgMonthlySpend,
      activeMonthsCount: sortedMonths.length
    };
    this._setMemo('consumption', bcs, result);
    return result;
  },

  // 4. BC Importance & Priority Classifier
  classifyBcImportance(bc) {
    if (!bc) return 'normal';
    const amt = Number(bc.amountTTC || bc.amount || 0);
    const desc = `${bc.description || ''} ${bc.supplierName || ''} ${bc.notes || ''}`.toLowerCase();
    const days = Number(bc.totalPaymentDelayDays || 0);

    // 1. Critical: High financial volume >= 1.5M DZD, mechanical breakdown emergency, or delay > 45 days
    if (amt >= 1500000 || days > 45 || /urgence|panne|immobilis|moteur|boite|transmission|radiateur/i.test(desc)) {
      return 'critical';
    }
    // 2. High / Strategic: 500k to 1.5M DZD or strategic fleet recurring categories
    if (amt >= 500000 || /gros œuvre|carburant|gasoil|pneu|filtration|batterie|frein/i.test(desc)) {
      return 'high';
    }
    // 3. Standard
    return 'normal';
  },

  // 5. Payment Recurrence per Supplier (Frequency and Recurrence Cadence)
  calculatePaymentRecurrence(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('recurrence', bcs);
    if (cached) return cached;
    const supPayments = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || '').trim();
      if (!sup) return;
      const isPaid = (bc.status === 'paye' || Boolean(bc.paymentPaidDate));
      const payDate = bc.paymentPaidDate || (isPaid ? bc.date : null);
      if (payDate) {
        if (!supPayments.has(sup)) supPayments.set(sup, []);
        supPayments.get(sup).push(new Date(payDate).getTime());
      }
    });

    const recurrenceMap = new Map();

    supPayments.forEach((timestamps, sup) => {
      timestamps.sort((a, b) => a - b);
      if (timestamps.length < 2) {
        recurrenceMap.set(sup, {
          supplierName: sup,
          paymentCount: timestamps.length,
          avgIntervalDays: 0,
          cadenceLabel: 'Ponctuel / Occasionnel',
          lastPaymentDate: timestamps.length > 0 ? new Date(timestamps[0]).toISOString().split('T')[0] : null,
          nextProjectedPaymentDate: null
        });
        return;
      }

      let intervalSum = 0;
      for (let i = 1; i < timestamps.length; i++) {
        intervalSum += (timestamps[i] - timestamps[i - 1]) / 86400000;
      }
      const avgIntervalDays = Math.max(1, Math.round(intervalSum / (timestamps.length - 1)));
      let cadenceLabel = 'Ponctuel / Occasionnel';
      if (avgIntervalDays <= 10) cadenceLabel = 'Hebdomadaire (~7j)';
      else if (avgIntervalDays <= 20) cadenceLabel = 'Bimensuel (~15j)';
      else if (avgIntervalDays <= 45) cadenceLabel = 'Mensuel (~30j)';
      else if (avgIntervalDays <= 95) cadenceLabel = 'Trimestriel (~90j)';

      const lastTs = timestamps[timestamps.length - 1];
      const nextTs = lastTs + (avgIntervalDays * 86400000);

      recurrenceMap.set(sup, {
        supplierName: sup,
        paymentCount: timestamps.length,
        avgIntervalDays,
        cadenceLabel,
        lastPaymentDate: new Date(lastTs).toISOString().split('T')[0],
        nextProjectedPaymentDate: new Date(nextTs).toISOString().split('T')[0]
      });
    });

    this._setMemo('recurrence', bcs, recurrenceMap);
    return recurrenceMap;
  },

  // 6. Average Monthly & Transaction Consumption per Supplier
  calculateSupplierAverages(records) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('averages', bcs);
    if (cached) return cached;
    const supData = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || 'Inconnu').trim();
      if (!supData.has(sup)) {
        supData.set(sup, {
          supplierName: sup,
          totalSpend: 0,
          ordersCount: 0,
          monthsSet: new Set(),
          minAmount: Infinity,
          maxAmount: -Infinity
        });
      }
      const entry = supData.get(sup);
      const amt = Number(bc.amountTTC || bc.amount || 0);
      entry.totalSpend += amt;
      entry.ordersCount += 1;
      if (bc.date) entry.monthsSet.add(String(bc.date).substring(0, 7));
      if (amt < entry.minAmount) entry.minAmount = amt;
      if (amt > entry.maxAmount) entry.maxAmount = amt;
    });

    const result = [];
    supData.forEach((entry, sup) => {
      const activeMonths = Math.max(1, entry.monthsSet.size);
      result.push({
        supplierName: sup,
        totalSpend: entry.totalSpend,
        ordersCount: entry.ordersCount,
        activeMonths,
        avgPerTransaction: entry.ordersCount > 0 ? Math.round(entry.totalSpend / entry.ordersCount) : 0,
        avgMonthlySpend: Math.round(entry.totalSpend / activeMonths),
        minAmount: entry.minAmount === Infinity ? 0 : entry.minAmount,
        maxAmount: entry.maxAmount === -Infinity ? 0 : entry.maxAmount
      });
    });

    result.sort((a, b) => b.totalSpend - a.totalSpend);
    this._setMemo('averages', bcs, result);
    return result;
  },

  // Financial Interactive UI State
  _finSearch: '',
  _finDebtFilter: 'all',
  _finShowAll: false,
  _finDpSearch: '',
  _finDpStatusFilter: 'all',
  _finDpShowAll: false,

  onFinSearch(val, targetId) {
    this._finSearch = (val || '').trim().toLowerCase();
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  setFinDebtFilter(filter, targetId) {
    this._finDebtFilter = filter;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  toggleFinShowAll(targetId) {
    this._finShowAll = !this._finShowAll;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  onFinDpSearch(val, targetId) {
    this._finDpSearch = (val || '').trim().toLowerCase();
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  setFinDpStatusFilter(filter, targetId) {
    this._finDpStatusFilter = filter;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  toggleFinDpShowAll(targetId) {
    this._finDpShowAll = !this._finDpShowAll;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  // Build Unified Financial HTML
  buildFinancialIntelligenceHtml(records, targetId = 'kpi') {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const creancesData = this.calculateSuppliersCreances(bcs);
    const previsionData = this.calculateMonthlyPrevision(bcs);
    const consumptionData = this.calculateMonthlyConsumption(bcs);
    const recurrenceMap = this.calculatePaymentRecurrence(bcs);
    const supplierAverages = this.calculateSupplierAverages(bcs);

    // Merge averages & recurrence & creances for table
    let fullSupplierTableData = supplierAverages.map(sa => {
      const creanceInfo = creancesData.suppliers.find(s => s.supplierName === sa.supplierName) || { creance: 0, paidAmount: 0 };
      const recInfo = recurrenceMap.get(sa.supplierName) || { cadenceLabel: 'Ponctuel', nextProjectedPaymentDate: '—' };
      return {
        ...sa,
        creance: creanceInfo.creance,
        paidAmount: creanceInfo.paidAmount,
        cadenceLabel: recInfo.cadenceLabel,
        nextProjectedPaymentDate: recInfo.nextProjectedPaymentDate || '—'
      };
    });

    const totalSuppliersCount = fullSupplierTableData.length;
    const debtCount = fullSupplierTableData.filter(s => s.creance > 0).length;
    const settledCount = totalSuppliersCount - debtCount;

    // Apply debt filter
    if (this._finDebtFilter === 'debt') {
      fullSupplierTableData = fullSupplierTableData.filter(s => s.creance > 0);
    } else if (this._finDebtFilter === 'settled') {
      fullSupplierTableData = fullSupplierTableData.filter(s => s.creance <= 0);
    }

    // Apply search filter
    if (this._finSearch) {
      fullSupplierTableData = fullSupplierTableData.filter(s => (s.supplierName || '').toLowerCase().includes(this._finSearch));
    }

    const filteredCount = fullSupplierTableData.length;
    const displayList = this._finShowAll ? fullSupplierTableData : fullSupplierTableData.slice(0, 15);

    // Demandes de Paiement (DP) Register Data
    const allPayments = (typeof state !== 'undefined' && Array.isArray(state.payments) && state.payments.length > 0)
      ? state.payments
      : ((typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments))
        ? window.PRELOAD_DATA.payments
        : []);

    let dpTableData = [...allPayments];
    const totalDpsCount = dpTableData.length;
    const paidDpsCount = dpTableData.filter(p => p.status === 'paye' || Boolean(p.paidDate)).length;
    const pendingDpsCount = totalDpsCount - paidDpsCount;

    if (this._finDpStatusFilter === 'paid') {
      dpTableData = dpTableData.filter(p => p.status === 'paye' || Boolean(p.paidDate));
    } else if (this._finDpStatusFilter === 'pending') {
      dpTableData = dpTableData.filter(p => p.status !== 'paye' && !p.paidDate);
    }

    if (this._finDpSearch) {
      const q = this._finDpSearch;
      dpTableData = dpTableData.filter(p => {
        const hay = `${p.paymentRef || ''} ${p.beneficiary || ''} ${p.supplierName || ''} ${p.natureExpense || ''} ${(p.linkedBcRefs || []).join(' ')} ${p.notes || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const filteredDpsCount = dpTableData.length;
    const displayDpsList = this._finDpShowAll ? dpTableData : dpTableData.slice(0, 15);

    return `
      <!-- 4 Top Executive Financial Intelligence Cards -->
      <div class="fin-stats-grid">
        <div class="fin-stat-card creance-accent">
          <div class="fin-stat-icon" style="color:#ef4444;"><i class="fas fa-hand-holding-dollar"></i></div>
          <div class="fin-stat-num" style="color:#dc2626;">${formatMoney(creancesData.totalCreance, 'DZD')}</div>
          <div class="fin-stat-lbl">Total Créances Fournisseurs</div>
          <div class="fin-stat-sub">
            <span style="color:#ef4444;font-weight:700;">${creancesData.suppliersWithDebtCount}</span> débiteurs · 
            <span style="color:#10b981;font-weight:700;">${settledCount}</span> soldés
          </div>
        </div>

        <div class="fin-stat-card prevision-accent">
          <div class="fin-stat-icon" style="color:#3b82f6;"><i class="fas fa-calendar-check"></i></div>
          <div class="fin-stat-num" style="color:#2563eb;">${formatMoney(previsionData.nextMonth ? previsionData.nextMonth.projectedCashOut : 0, 'DZD')}</div>
          <div class="fin-stat-lbl">Prévision Décaissement (${previsionData.nextMonth ? previsionData.nextMonth.label : 'Mois Prochain'})</div>
          <div class="fin-stat-sub">Budget annuel : ${formatMoney(previsionData.totalProjectedYear, 'DZD')}</div>
        </div>

        <div class="fin-stat-card consumption-accent">
          <div class="fin-stat-icon" style="color:#10b981;"><i class="fas fa-chart-line"></i></div>
          <div class="fin-stat-num" style="color:#059669;">${formatMoney(consumptionData.avgMonthlySpend, 'DZD')}</div>
          <div class="fin-stat-lbl">Consommation Moyenne Mensuelle</div>
          <div class="fin-stat-sub">Burn-rate sur ${consumptionData.activeMonthsCount} mois analysés</div>
        </div>

        <div class="fin-stat-card recurrence-accent">
          <div class="fin-stat-icon" style="color:#8b5cf6;"><i class="fas fa-repeat"></i></div>
          <div class="fin-stat-num" style="color:#7c3aed;">${totalSuppliersCount}</div>
          <div class="fin-stat-lbl">Partenaires & Fournisseurs Actifs</div>
          <div class="fin-stat-sub">Règlement multi-cadence tracé</div>
        </div>
      </div>

      <!-- Monthly Cash-Out Prevision & Consumption Timeline Box -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              📅 Prévision de Trésorerie & Consommation Mensuelle (Exercice 2026)
            </h4>
            <small class="text-muted">Évolution des volumes engagés et projection des décaissements mensuels</small>
          </div>
          <span class="badge bg-primary-subtle text-primary font-monospace font-weight-bold">
            Budget Projeté : ${formatMoney(previsionData.totalProjectedYear, 'DZD')}
          </span>
        </div>

        <div class="timeline-grid">
          ${previsionData.months.map(m => `
            <div class="timeline-month-box">
              <div class="timeline-month-lbl">${m.label}</div>
              <div class="timeline-month-val">${formatMoney(m.projectedCashOut, 'DZD')}</div>
              <div class="timeline-month-sub">${m.bcCount} BC(s)</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Advanced Supplier Financial Table: Créances, Récurrence & Moyennes -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              🏢 Analyse Financière par Fournisseur : Créances, Récurrence & Moyennes
            </h4>
            <small class="text-muted">Détail des dettes fournisseurs, moyennes par commande, consommation mensuelle et cadence de paiement</small>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="btn btn-sm btn-ghost" type="button" onclick="ApproNextGen.exportFinancialReport()" title="Télécharger la synthèse financière Excel/CSV">
              <i class="fas fa-file-excel text-success me-1"></i> Exporter CSV
            </button>
            <span class="badge bg-light text-muted border">${filteredCount} / ${totalSuppliersCount} Fournisseurs</span>
          </div>
        </div>

        <!-- Interactive Search & Debt Filter Toolbar -->
        <div class="fin-toolbar">
          <input type="text" class="fin-search-input" placeholder="🔍 Rechercher un fournisseur..." value="${escapeHtml(this._finSearch)}" oninput="ApproNextGen.onFinSearch(this.value, '${targetId}')">
          <div class="fin-filters-group">
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'all' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('all', '${targetId}')">Tous (${totalSuppliersCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'debt' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('debt', '${targetId}')">🔴 Débiteurs (${debtCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'settled' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('settled', '${targetId}')">🟢 Soldés (${settledCount})</button>
            <button type="button" class="btn-fin-filter" onclick="ApproNextGen.toggleFinShowAll('${targetId}')">${this._finShowAll ? 'Afficher Top 15' : 'Afficher Tout (' + filteredCount + ')'}</button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="fin-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th style="text-align:right;">Volume Total TTC</th>
                <th style="text-align:right;">Total Réglé</th>
                <th style="text-align:right;">Créance Restante</th>
                <th style="text-align:center;">Commandes</th>
                <th style="text-align:right;">Moyenne / Commande</th>
                <th style="text-align:right;">Moyenne Mensuelle</th>
                <th style="text-align:center;">Cadence Paiement</th>
                <th style="text-align:center;">Prochaine Échéance</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${displayList.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted);">
                    Aucun fournisseur ne correspond aux critères de recherche.
                  </td>
                </tr>
              ` : displayList.map(s => {
                const isDebt = s.creance > 0;
                const creanceColor = isDebt ? '#dc2626' : '#10b981';
                return `
                  <tr>
                    <td><strong>${escapeHtml(s.supplierName)}</strong></td>
                    <td style="text-align:right;font-weight:700;">${formatMoney(s.totalSpend, 'DZD')}</td>
                    <td style="text-align:right;color:#059669;">${formatMoney(s.paidAmount, 'DZD')}</td>
                    <td style="text-align:right;font-weight:800;color:${creanceColor};">
                      ${formatMoney(s.creance, 'DZD')}
                      ${isDebt ? `<span class="badge bg-danger-subtle text-danger ms-1" style="font-size:0.65rem;">Dû</span>` : `<span class="badge bg-success-subtle text-success ms-1" style="font-size:0.65rem;">Soldé</span>`}
                    </td>
                    <td style="text-align:center;">${s.ordersCount} BC</td>
                    <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(s.avgPerTransaction, 'DZD')}</td>
                    <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(s.avgMonthlySpend, 'DZD')}</td>
                    <td style="text-align:center;"><span class="badge bg-light text-muted border">${escapeHtml(s.cadenceLabel)}</span></td>
                    <td style="text-align:center;font-size:0.75rem;color:#64748b;">${s.nextProjectedPaymentDate}</td>
                    <td style="text-align:center;">
                      <button class="btn btn-ghost btn-xs" type="button" onclick="ApproNextGen.filterBySupplier(decodeURIComponent('${encodeURIComponent(s.supplierName)}'))" title="Filtrer les bons de commande de ce fournisseur">
                        <i class="fas fa-search me-1"></i> BCs
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Complete Linked Demandes de Paiement (DP) Register Table -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              📋 Registre Intégré des Demandes de Paiement (DP) &amp; Règlements
            </h4>
            <small class="text-muted">Traçabilité complète des dossiers DP scannés, ordonnancements de trésorerie et rapprochement BC</small>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="btn btn-sm btn-ghost" type="button" onclick="ApproNextGen.exportDpReport()" title="Télécharger le registre DP en CSV">
              <i class="fas fa-file-excel text-success me-1"></i> Exporter DP (CSV)
            </button>
            <span class="badge bg-light text-muted border">${filteredDpsCount} / ${totalDpsCount} Demandes</span>
          </div>
        </div>

        <!-- Interactive Search & DP Status Filter Toolbar -->
        <div class="fin-toolbar">
          <input type="text" class="fin-search-input" placeholder="🔍 Rechercher une DP (Réf, Bénéficiaire, BC lié)..." value="${escapeHtml(this._finDpSearch)}" oninput="ApproNextGen.onFinDpSearch(this.value, '${targetId}')">
          <div class="fin-filters-group">
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'all' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('all', '${targetId}')">Toutes (${totalDpsCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'paid' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('paid', '${targetId}')">🟢 Payées (${paidDpsCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'pending' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('pending', '${targetId}')">🟡 En attente (${pendingDpsCount})</button>
            <button type="button" class="btn-fin-filter" onclick="ApproNextGen.toggleFinDpShowAll('${targetId}')">${this._finDpShowAll ? 'Afficher Top 15' : 'Afficher Tout (' + filteredDpsCount + ')'}</button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="fin-table">
            <thead>
              <tr>
                <th>Réf DP</th>
                <th style="text-align:center;">Date Demande</th>
                <th style="text-align:center;">Date Règlement</th>
                <th>Bénéficiaire / Fournisseur</th>
                <th>Objet / Nature Dépense</th>
                <th style="text-align:center;">BC Lié(s)</th>
                <th style="text-align:right;">Montant (DZD)</th>
                <th style="text-align:center;">Mode</th>
                <th style="text-align:center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${displayDpsList.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">
                    Aucune demande de paiement ne correspond aux critères.
                  </td>
                </tr>
              ` : displayDpsList.map(dp => {
                const isPaid = dp.status === 'paye' || Boolean(dp.paidDate);
                const reqDate = dp.requestDate || '—';
                const paidDate = dp.paidDate || '—';
                const bcs = Array.isArray(dp.linkedBcRefs) && dp.linkedBcRefs.length > 0 ? dp.linkedBcRefs : (dp.linkedBcRef ? [dp.linkedBcRef] : []);
                return `
                  <tr>
                    <td><strong>${escapeHtml(dp.paymentRef || '—')}</strong></td>
                    <td style="text-align:center;font-size:0.75rem;color:#64748b;">${escapeHtml(reqDate)}</td>
                    <td style="text-align:center;font-size:0.75rem;color:${isPaid ? '#059669' : '#64748b'};font-weight:${isPaid ? '700' : '400'};">${escapeHtml(paidDate)}</td>
                    <td><strong>${escapeHtml(dp.beneficiary || dp.supplierName || '—')}</strong></td>
                    <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(dp.natureExpense || dp.notes || '')}">
                      ${escapeHtml(dp.natureExpense || dp.notes || '—')}
                    </td>
                    <td style="text-align:center;">
                      ${bcs.length > 0 ? bcs.map(ref => `
                        <span class="badge bg-primary-subtle text-primary border" style="cursor:pointer;font-size:0.7rem;" onclick="ApproNextGen.filterBySupplier('${escapeHtml(ref)}')">
                          ${escapeHtml(ref)}
                        </span>
                      `).join(' ') : '<span style="color:#94a3b8;">—</span>'}
                    </td>
                    <td style="text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;">${formatMoney(dp.amount || 0, 'DZD')}</td>
                    <td style="text-align:center;"><span class="badge bg-light text-muted border">${escapeHtml(dp.mode || 'virement')}</span></td>
                    <td style="text-align:center;">
                      ${isPaid 
                        ? `<span class="badge bg-success-subtle text-success" style="font-weight:700;">Payé</span>` 
                        : `<span class="badge bg-warning-subtle text-warning" style="font-weight:700;">En cours</span>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // Render Full Financial Intelligence & Supplier Analytics Section (in KPI tab)
  renderFinancialIntelligenceSection(records) {
    this.ensureDataHydrated();
    let section = document.getElementById('kpiSupplierIntelligenceSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiSupplierIntelligenceSection';
      section.className = 'financial-intel-section';
      const charts = document.getElementById('dashboardCharts');
      if (charts) charts.insertAdjacentElement('beforebegin', section);
      else {
        const kpiShell = document.getElementById('tabKpi') || document.querySelector('.panel');
        if (kpiShell) kpiShell.appendChild(section);
      }
    }
    if (section) {
      section.innerHTML = this.buildFinancialIntelligenceHtml(records, 'kpi');
    }
  },

  // Render Dedicated Financial Intelligence Cockpit (in Finances & Créances tab)
  renderFinancialIntelligenceCockpit(records) {
    this.ensureDataHydrated();
    let container = document.getElementById('financialCockpitContainer');
    if (!container) {
      const pageFinance = document.getElementById('page-finance');
      if (pageFinance) {
        container = document.createElement('div');
        container.id = 'financialCockpitContainer';
        pageFinance.appendChild(container);
      }
    }
    if (container) {
      container.innerHTML = this.buildFinancialIntelligenceHtml(records, 'cockpit');
    }
  },

  // Refresh both financial views
  refreshFinancialSections(records) {
    if (document.getElementById('kpiSupplierIntelligenceSection')) {
      this.renderFinancialIntelligenceSection(records);
    }
    if (document.getElementById('financialCockpitContainer')) {
      this.renderFinancialIntelligenceCockpit(records);
    }
  },

  // Export Complete Financial CSV Report with UTF-8 BOM
  exportFinancialReport(records) {
    const bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    const creancesData = this.calculateSuppliersCreances(bcs);
    const recurrenceMap = this.calculatePaymentRecurrence(bcs);
    const supplierAverages = this.calculateSupplierAverages(bcs);

    let csv = 'Fournisseur;Volume Total TTC (DZD);Total Regle (DZD);Creance Restante (DZD);Statut;Nombre Commandes;Moyenne par Commande (DZD);Consommation Moyenne Mensuelle (DZD);Cadence de Reglement;Prochaine Echeance Estimee\n';

    supplierAverages.forEach(sa => {
      const creanceInfo = creancesData.suppliers.find(s => s.supplierName === sa.supplierName) || { creance: 0, paidAmount: 0 };
      const recInfo = recurrenceMap.get(sa.supplierName) || { cadenceLabel: 'Ponctuel', nextProjectedPaymentDate: '—' };
      const status = creanceInfo.creance > 0 ? 'Debiteur' : 'Solde';
      const row = [
        `"${sa.supplierName.replace(/"/g, '""')}"`,
        Math.round(sa.totalSpend),
        Math.round(creanceInfo.paidAmount),
        Math.round(creanceInfo.creance),
        status,
        sa.ordersCount,
        Math.round(sa.avgPerTransaction),
        Math.round(sa.avgMonthlySpend),
        `"${recInfo.cadenceLabel}"`,
        recInfo.nextProjectedPaymentDate || '—'
      ];
      csv += row.join(';') + '\n';
    });

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const nowStr = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Synthese_Financiere_Fournisseurs_${nowStr}.csv`);
        if (typeof document.body.appendChild === 'function') document.body.appendChild(link);
        if (typeof link.click === 'function') link.click();
        if (typeof document.body.removeChild === 'function') document.body.removeChild(link);
        if (typeof showToast === 'function') showToast('Export financier téléchargé avec succès');
      } catch(e) {
        console.warn('Export file download skipped:', e.message);
      }
    }
    return csv;
  },

  // Export Complete Demandes de Paiement (DP) CSV Report
  exportDpReport() {
    this.ensureDataHydrated();
    const payments = (typeof state !== 'undefined' && Array.isArray(state.payments) && state.payments.length > 0)
      ? state.payments
      : ((typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments))
        ? window.PRELOAD_DATA.payments
        : []);

    let csv = 'Ref DP;Date Demande;Date Reglement;Beneficiaire;Nature Depense;BCs Lies;Montant (DZD);Mode;Statut\n';
    payments.forEach(p => {
      const bcs = Array.isArray(p.linkedBcRefs) ? p.linkedBcRefs.join(', ') : (p.linkedBcRef || '');
      const isPaid = p.status === 'paye' || Boolean(p.paidDate);
      const row = [
        `"${(p.paymentRef || '').replace(/"/g, '""')}"`,
        p.requestDate || '',
        p.paidDate || '',
        `"${(p.beneficiary || p.supplierName || '').replace(/"/g, '""')}"`,
        `"${(p.natureExpense || p.notes || '').replace(/"/g, '""')}"`,
        `"${bcs.replace(/"/g, '""')}"`,
        Math.round(p.amount || 0),
        `"${(p.mode || 'virement').replace(/"/g, '""')}"`,
        isPaid ? 'Paye' : 'En cours'
      ];
      csv += row.join(';') + '\n';
    });

    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const nowStr = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Demandes_Paiement_DP_${nowStr}.csv`);
        if (typeof document.body.appendChild === 'function') document.body.appendChild(link);
        if (typeof link.click === 'function') link.click();
        if (typeof document.body.removeChild === 'function') document.body.removeChild(link);
        if (typeof showToast === 'function') showToast('Export DP téléchargé avec succès');
      } catch(e) {
        console.warn('Export file download skipped:', e.message);
      }
    }
    return csv;
  },

  // Filter BCs table by clicking supplier
  filterBySupplier(supplierName) {
    const input = document.getElementById('followupSearch');
    if (input) {
      input.value = supplierName;
      if (typeof setActiveTab === 'function') setActiveTab('followup');
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
      if (typeof showToast === 'function') showToast(`Filtré par fournisseur : "${supplierName}"`);
    }
  },

  // Inject Followup Importance / Priority selector controls & hooks
  injectFollowupImportanceControls() {
    if (typeof document === 'undefined' || !document.querySelector) return;
    
    // Inject Importance dropdown into toolbar
    const toolbar = document.querySelector('.toolbar-row') || document.querySelector('.table-toolbar');
    if (toolbar && !document.getElementById('followupImportanceFilter')) {
      const wrap = document.createElement('label');
      wrap.className = 'tool-inline compact';
      wrap.id = 'followupImportanceWrap';
      wrap.innerHTML = `
        <span>Priorité BC</span>
        <select id="followupImportanceFilter" class="form-select" onchange="ApproNextGen.onImportanceFilterChange(this.value)">
          <option value="all">Toutes les priorités</option>
          <option value="critical">🔴 Critique / Urgente (&gt; 1.5M DZD ou Panne)</option>
          <option value="high">🟠 Stratégique / Haute (500k – 1.5M DZD)</option>
          <option value="normal">🔵 Standard / Opérationnelle (&lt; 500k DZD)</option>
        </select>
      `;
      toolbar.appendChild(wrap);
    }

    // Intercept window.filteredBcRecords to apply importance filter
    if (typeof window.filteredBcRecords === 'function') {
      const originalFilteredBcRecords = window.filteredBcRecords;
      window.filteredBcRecords = () => {
        let rows = originalFilteredBcRecords();
        const sel = document.getElementById('followupImportanceFilter');
        const importance = (sel && sel.value) ? sel.value : (this.bcImportanceFilter || 'all');
        if (importance && importance !== 'all') {
          rows = rows.filter(r => this.classifyBcImportance(r) === importance);
        }
        return rows;
      };
    }
  },

  onImportanceFilterChange(val) {
    this.bcImportanceFilter = val;
    const sel = document.getElementById('followupImportanceFilter');
    if (sel) sel.value = val;
    if (typeof resetFollowupPage === 'function') resetFollowupPage();
    if (typeof renderFollowupTable === 'function') renderFollowupTable();
  },

  listenForPortalTheme() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'setTheme') {
          const theme = event.data.theme === 'dark' ? 'dark' : 'light';
          if (typeof setTheme === 'function') {
            setTheme(theme);
          } else if (typeof document !== 'undefined') {
            if (document.body && document.body.setAttribute) document.body.setAttribute('data-theme', theme);
            if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute('data-theme', theme);
            const sel = document.getElementById('themeSelect');
            if (sel) sel.value = theme;
          }
          if (typeof state !== 'undefined' && state.settings) {
            state.settings.theme = theme;
          }
        }
      });

      try {
        const savedTheme = (window.parent && window.parent.localStorage && window.parent.localStorage.getItem('sde_portal_theme')) ||
          (window.localStorage && (window.localStorage.getItem('sde_theme') || window.localStorage.getItem('sde_portal_theme') || window.localStorage.getItem('douroub_theme')));
        const osDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolvedTheme = savedTheme || (osDark ? 'dark' : '');
        if (resolvedTheme && typeof setTheme === 'function') {
          setTheme(resolvedTheme);
        }
        if (typeof window.matchMedia === 'function') {
          const mq = window.matchMedia('(prefers-color-scheme: dark)');
          const onMqChange = (e) => {
            if (typeof setTheme === 'function') setTheme(e.matches ? 'dark' : 'light');
          };
          if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
        }
      } catch(e) {}
    }
  }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ApproNextGen.init());
} else {
  ApproNextGen.init();
}


/* === BC API BRIDGE (MERGED) === */

/* ============================================================
   BC-API-BRIDGE.JS — Syncs suivi-achats-premium data to MongoDB
   Loaded AFTER app.js in suivi-achats-premium/index.html
   ============================================================ */
(function() {
  'use strict';

  var _bcSyncTimer = null;
  var _paySyncTimer = null;
  var _bcDataLoaded = false;
  var isHydratingFromServer = false;

  function isHttpProtocol() {
    return Boolean(typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http'));
  }

  function cancelPendingSync() {
    if (_bcSyncTimer) {
      clearTimeout(_bcSyncTimer);
      _bcSyncTimer = null;
    }
    if (_paySyncTimer) {
      clearTimeout(_paySyncTimer);
      _paySyncTimer = null;
    }
  }

  // Get JWT token from main app
  function getToken() {
    return localStorage.getItem('erp_jwt_token') || '';
  }

  // Show a toast notification using the app's own toast function or fallback
  function showToast(msg, type) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type || 'success');
        return;
      }
      if (typeof window.showNotification === 'function') {
        window.showNotification(msg, type || 'success');
        return;
      }
      // Fallback: create a simple toast element
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:360px;';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
    } catch (e) {}
  }

  // Intercept window.fetch to automatically attach JWT token for /api/ endpoints
  if (typeof window !== 'undefined' && window.fetch) {
    var _nativeFetch = window.fetch;
    window.fetch = function(input, init) {
      init = init || {};
      var token = getToken();
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (token && url && url.indexOf('/api/') !== -1) {
        if (!init.headers) init.headers = {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) init.headers.set('Authorization', 'Bearer ' + token);
        } else if (Array.isArray(init.headers)) {
          var hasAuth = init.headers.some(function(h) { return h[0].toLowerCase() === 'authorization'; });
          if (!hasAuth) init.headers.push(['Authorization', 'Bearer ' + token]);
        } else if (typeof init.headers === 'object') {
          if (!init.headers['Authorization'] && !init.headers['authorization']) {
            init.headers['Authorization'] = 'Bearer ' + token;
          }
        }
      }
      return _nativeFetch.call(this, input, init);
    };
  }

  // Generic API request
  async function apiRequest(method, path, body) {
    var headers = { 'Authorization': 'Bearer ' + getToken() };
    var config = { method: method, headers: headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
    var res = await fetch(path, config);
    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      var err = new Error(data.error || 'Erreur serveur');
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // ─── Hydrate BC + Payment data from MongoDB ────────────────
  async function hydrateFromServer() {
    if (!isHttpProtocol() || !getToken()) return null;
    cancelPendingSync();
    try {
      var results = await Promise.all([
        apiRequest('GET', '/api/bc?limit=10000'),
        apiRequest('GET', '/api/payments?limit=10000').catch(function() { return { payments: null }; })
      ]);
      var rawBcs = Array.isArray(results[0] && results[0].bcRecords) ? results[0].bcRecords : [];
      var rawPayments = results[1] && Array.isArray(results[1].payments) ? results[1].payments : null;

      isHydratingFromServer = true;
      var serverBcs = [];
      var shouldBootstrapPayments = false;
      try {
        var dedupMap = new Map();
        var rawAliasPairs = [];
        for (var i = 0; i < rawBcs.length; i++) {
          var r = rawBcs[i] || {};
          var normInput = Object.assign({}, r, {
            _id: r._id ? String(r._id) : undefined,
            id: String(r._id || r.id || '')
          });
          var norm = (typeof window.normalizeBcRecord === 'function') ? window.normalizeBcRecord(normInput) : normInput;
          var dKey = (typeof getBcDedupKey === 'function' ? getBcDedupKey(norm.ref, norm) : '') || norm.id;
          if (r.id) rawAliasPairs.push([String(r.id), dKey, norm.id]);
          if (r._id) rawAliasPairs.push([String(r._id), dKey, norm.id]);
          if (dKey && dedupMap.has(dKey)) {
            var prev = dedupMap.get(dKey);
            dedupMap.set(dKey, typeof mergeBcPreservingStatus === 'function' ? mergeBcPreservingStatus(prev, norm, false) : norm);
          } else if (dKey) {
            dedupMap.set(dKey, norm);
          } else {
            serverBcs.push(norm);
          }
        }
        serverBcs = Array.from(dedupMap.values()).concat(serverBcs);

        var bcAliasMap = new Map();
        var bcRefMap = new Map();
        serverBcs.forEach(function(b) {
          if (b.id) bcAliasMap.set(String(b.id), b.id);
          if (b._id) bcAliasMap.set(String(b._id), b.id);
          if (b.ref) bcRefMap.set(String(b.ref).trim().toUpperCase(), b.id);
        });
        rawAliasPairs.forEach(function(pair) {
          var winner = pair[1] && dedupMap.has(pair[1]) ? dedupMap.get(pair[1]).id : pair[2];
          if (pair[0] && winner) bcAliasMap.set(pair[0], winner);
        });

        if (typeof window !== 'undefined' && window.state) {
          window.state.bcRecords = serverBcs;

          if (rawPayments && rawPayments.length > 0) {
            var remappedRawPayments = rawPayments.map(function(sp) {
              var normSp = typeof window.normalizePayment === 'function'
                ? window.normalizePayment(Object.assign({}, sp, { _id: sp._id ? String(sp._id) : undefined, id: String(sp._id || sp.id || '') }))
                : Object.assign({}, sp, { id: String(sp._id || sp.id || '') });
              if (!normSp.isDirect) {
                var remappedIds = [];
                (Array.isArray(normSp.linkedBcIds) ? normSp.linkedBcIds : []).forEach(function(lid) {
                  var mapped = bcAliasMap.get(String(lid)) || String(lid);
                  if (mapped && remappedIds.indexOf(mapped) === -1) remappedIds.push(mapped);
                });
                if (normSp.bcId) {
                  var mappedSingle = bcAliasMap.get(String(normSp.bcId)) || String(normSp.bcId);
                  if (mappedSingle && remappedIds.indexOf(mappedSingle) === -1) remappedIds.unshift(mappedSingle);
                }
                if (remappedIds.length === 0 && !normSp.manualLink && Array.isArray(normSp.linkedBcRefs)) {
                  normSp.linkedBcRefs.forEach(function(lref) {
                    var byRef = bcRefMap.get(String(lref || '').trim().toUpperCase());
                    if (byRef && remappedIds.indexOf(byRef) === -1) remappedIds.push(byRef);
                  });
                }
                normSp.linkedBcIds = remappedIds;
                normSp.bcId = remappedIds[0] || '';
              }
              return normSp;
            });
            window.state.payments = typeof window.deduplicatePaymentsList === 'function'
              ? window.deduplicatePaymentsList(remappedRawPayments)
              : remappedRawPayments;
            if (rawPayments.length > window.state.payments.length) {
              apiRequest('POST', '/api/payments/dedupe', {}).catch(function() {});
            }
          } else if (rawPayments && rawPayments.length === 0 && serverBcs.length > 0 && Array.isArray(window.state.payments) && window.state.payments.length > 0) {
            if (window.ApproNextGen && typeof window.ApproNextGen._dedupAndNormalizePayments === 'function') {
              window.state.payments = window.ApproNextGen._dedupAndNormalizePayments(window.state.payments);
            }
            shouldBootstrapPayments = true;
          }

          if (serverBcs.length === 0) {
            if (window.selectedFollowupBcIds) window.selectedFollowupBcIds.clear();
            if (window.state.ui) {
              window.state.ui.isFilteredActive = false;
              window.state.ui.activeFilteredIds = null;
            }
            (window.state.payments || []).forEach(function(p) {
              p.bcId = '';
              p.linkedBcIds = [];
              p.linkedBcRefs = [];
            });
          } else if (typeof window.ApproNextGen !== 'undefined' && typeof window.ApproNextGen.autoLinkBcsAndDps === 'function') {
            try { window.ApproNextGen.autoLinkBcsAndDps(); } catch (e) {}
          }

          if (window.state.settings) {
            if (typeof highestBcSequence === 'function') window.state.settings.bcSequence = Math.max(1, highestBcSequence() + 1);
            if (typeof highestDaSequence === 'function') window.state.settings.daSequence = Math.max(1, highestDaSequence() + 1);
          }

          if (typeof window.saveState === 'function') {
            try { window.saveState(); } catch (e) {}
          }
        }
      } finally {
        isHydratingFromServer = false;
      }

      var finalPaymentsCount = (window.state && Array.isArray(window.state.payments)) ? window.state.payments.length : 0;
      console.log('[BC-BRIDGE] Hydrated from MongoDB:', serverBcs.length, 'BCs,', finalPaymentsCount, 'payments');

      if (typeof window !== 'undefined') {
        if (window.LogicalMatchEngine && typeof window.LogicalMatchEngine.invalidate === 'function') {
          window.LogicalMatchEngine.invalidate();
        }
        if (typeof window.renderAll === 'function') {
          try { window.renderAll(); } catch (e) {}
        } else if (typeof window.renderApp === 'function') {
          try { window.renderApp(); } catch (e) {}
        }
        if (typeof updateFollowupBulkBar === 'function') {
          try { updateFollowupBulkBar(); } catch (e) {}
        }
        if (shouldBootstrapPayments) {
          setTimeout(function() { syncPaymentsToServer(); }, 600);
        }
        showToast('Données chargées depuis MongoDB (' + serverBcs.length + ' BC, ' + finalPaymentsCount + ' paiements)');
      }

      _bcDataLoaded = true;
      return { bcRecords: serverBcs, payments: (window.state && window.state.payments) || [] };
    } catch (e) {
      isHydratingFromServer = false;
      console.warn('[BC-BRIDGE] Failed to hydrate from server:', e.message);
      return null;
    }
  }

  var loadBcFromServer = hydrateFromServer;

  // ─── Sync local BC data to MongoDB (bulk upsert) ───────────
  async function syncBcToServer() {
    if (isHydratingFromServer || !isHttpProtocol() || !getToken()) return;
    cancelPendingSync();
    try {
      var bcRecords = [];
      var payments = [];
      if (typeof window !== 'undefined' && window.state && Array.isArray(window.state.bcRecords)) {
        bcRecords = window.state.bcRecords;
        payments = Array.isArray(window.state.payments) ? window.state.payments : [];
      } else {
        var raw = localStorage.getItem('suivi_linked_v30');
        if (!raw) return;
        var parsed = JSON.parse(raw);
        bcRecords = parsed.bcRecords || [];
        payments = parsed.payments || [];
      }

      if (bcRecords.length === 0 && payments.length === 0) return;

      var objectIdRegex = /^[a-f\d]{24}$/i;
      var cleanBc = bcRecords.map(function(r) {
        var clean = Object.assign({}, r);
        if (!objectIdRegex.test(String(clean._id || ''))) {
          delete clean._id;
        }
        return clean;
      });

      var cleanPay = payments.map(function(p) {
        var clean = Object.assign({}, p);
        if (!objectIdRegex.test(String(clean._id || ''))) {
          delete clean._id;
        }
        return clean;
      });

      var results = await Promise.all([
        cleanBc.length > 0
          ? apiRequest('POST', '/api/bc/bulk', { bcRecords: cleanBc }).catch(function(e) { return { error: e.message }; })
          : { upserted: 0 },
        cleanPay.length > 0
          ? apiRequest('POST', '/api/payments/bulk', { payments: cleanPay }).catch(function(e) { return { error: e.message }; })
          : { upserted: 0 }
      ]);

      console.log('[BC-BRIDGE] Synced to MongoDB — BC:', JSON.stringify(results[0]), '| Pay:', JSON.stringify(results[1]));
    } catch (e) {
      console.warn('[BC-BRIDGE] Sync to server failed:', e.message);
    }
  }

  async function syncPaymentsToServer() {
    if (isHydratingFromServer || !isHttpProtocol() || !getToken()) return;
    if (_paySyncTimer) { clearTimeout(_paySyncTimer); _paySyncTimer = null; }
    try {
      var payments = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.payments))
        ? window.state.payments
        : [];
      if (!payments.length) return;
      var objectIdRegex = /^[a-f\d]{24}$/i;
      var cleanPay = payments.map(function(p) {
        var clean = Object.assign({}, p);
        if (!objectIdRegex.test(String(clean._id || ''))) delete clean._id;
        return clean;
      });
      var res = await apiRequest('POST', '/api/payments/bulk', { payments: cleanPay }).catch(function(e) { return { error: e.message }; });
      console.log('[BC-BRIDGE] Payments synced to MongoDB:', JSON.stringify(res));
      return res;
    } catch (e) {
      console.warn('[BC-BRIDGE] Payment sync failed:', e.message);
    }
  }

  function queuePaymentSync() {
    if (isHydratingFromServer || !isHttpProtocol()) return;
    if (_paySyncTimer) clearTimeout(_paySyncTimer);
    _paySyncTimer = setTimeout(syncPaymentsToServer, 600);
  }

  async function bulkUpdatePaymentStatusOnServer(ids, status, paidDate, extraRefs) {
    if (isHydratingFromServer || !isHttpProtocol() || !getToken() || !Array.isArray(ids) || !ids.length) return;
    try {
      var allIds = ids.slice();
      var allRefs = Array.isArray(extraRefs) ? extraRefs.slice() : [];
      var payments = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.payments))
        ? window.state.payments
        : [];
      payments.forEach(function(p) {
        if (!p) return;
        if (ids.indexOf(p.id) !== -1 || (p._id && ids.indexOf(String(p._id)) !== -1)) {
          if (p._id && allIds.indexOf(String(p._id)) === -1) allIds.push(String(p._id));
          if (p.paymentRef && allRefs.indexOf(p.paymentRef) === -1) allRefs.push(p.paymentRef);
        }
      });
      var res = await apiRequest('POST', '/api/payments/bulk-status', {
        ids: allIds,
        paymentIds: allIds,
        paymentRefs: allRefs,
        status: status,
        paidDate: paidDate || '',
        cascadeBc: true
      }).catch(function() { return null; });
      if (!res) await syncPaymentsToServer();
      return res;
    } catch (e) {
      console.warn('[BC-BRIDGE] Bulk status sync fallback:', e.message);
    }
  }

  // ─── Debounced sync trigger ────────────────────────────────
  function queueBcSync() {
    if (isHydratingFromServer || !isHttpProtocol()) return;
    if (_bcSyncTimer) clearTimeout(_bcSyncTimer);
    _bcSyncTimer = setTimeout(syncBcToServer, 800);
  }

  // ─── Patch saveState to also sync to MongoDB ──────────────
  var _origSetItem = localStorage.setItem.bind(localStorage);
  var storageKeys = ['suivi_linked_v30'];

  localStorage.setItem = function(key, value) {
    _origSetItem(key, value);
    if (!isHydratingFromServer && storageKeys.indexOf(key) !== -1) {
      queueBcSync();
      queuePaymentSync();
    }
  };

  // ─── Disabled legacy local-to-Atlas auto-migration (prevents resurrecting wiped BCs) ─
  async function migrateLocalToAtlas() {
    return { success: true, disabled: true, count: 0 };
  }

  // ─── On page load: hydrate authoritatively from Atlas ──────
  async function initBcBridge() {
    if (!isHttpProtocol() || !getToken()) return;
    try {
      await hydrateFromServer();
    } catch (e) {
      console.warn('[BC-BRIDGE] Init error:', e.message);
    }
  }

  // Merge local + server arrays, dedup by key field
  function mergeRecords(local, server, keyField) {
    var map = {};
    for (var i = 0; i < server.length; i++) {
      var key = server[i][keyField] || server[i].id || server[i]._id;
      if (key) map[key] = server[i];
    }
    for (var j = 0; j < local.length; j++) {
      var lkey = local[j][keyField] || local[j].id;
      if (lkey && !map[lkey]) {
        map[lkey] = local[j];
      }
    }
    return Object.values(map);
  }

  // FIX 2: Wait for DOM ready, then hydrate IMMEDIATELY (no 1500ms delay)
  function bootBridge() {
    if (getToken()) {
      // Hydrate immediately — no delay
      initBcBridge();
    } else {
      // No token means init() already redirected to /?redirect=bc
      // But keep a fallback poll in case token arrives after boot
      var checkInterval = setInterval(function() {
        if (getToken()) {
          clearInterval(checkInterval);
          initBcBridge();
        }
      }, 3000);
      // Stop checking after 2 minutes
      setTimeout(function() { clearInterval(checkInterval); }, 120000);
    }
  }

  // Expose bridge globally
  var bcBridge = {
    hydrateFromServer: hydrateFromServer,
    syncBcToServer: syncBcToServer,
    syncPaymentsToServer: syncPaymentsToServer,
    queuePaymentSync: queuePaymentSync,
    bulkUpdatePaymentStatusOnServer: bulkUpdatePaymentStatusOnServer,
    cancelPendingSync: cancelPendingSync,
    migrateLocalToAtlas: migrateLocalToAtlas,
    loadBcFromServer: hydrateFromServer
  };
  if (typeof window !== 'undefined') {
    window.bcBridge = bcBridge;
    window.SuiviBcBridge = window.SuiviBcBridge || bcBridge;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBridge);
  } else {
    bootBridge();
  }

  console.log('[BC-BRIDGE] BC API Bridge loaded — will sync BC & payments to MongoDB');
})();
