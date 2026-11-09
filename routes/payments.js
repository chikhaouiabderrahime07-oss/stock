const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const BcRecord = require('../models/BcRecord');
const { authenticate, authorize } = require('../middleware/auth');

function isValidObjectId24(val) {
  return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val) && mongoose.Types.ObjectId.isValid(val);
}

function normalizePaymentRef(val) {
  return String(val || '').replace(/\s+/g, '').toLowerCase();
}

// Canonical DP identity: "DP N° 0156 / 2026", "156-2026", "156/26" => "156/2026"
function canonicalDpRef(ref, fallbackDate) {
  const s = String(ref || '').toUpperCase()
    .replace(/DEMANDE\s*DE\s*PAIEMENT/g, ' ')
    .replace(/PAIEMENT|\bDP\b|N\s*[°º]|\bNO\b\.?/g, ' ');
  const m = s.match(/(\d{1,5})\s*[\/\-_.\s]\s*(\d{2,4})(?!\d)/);
  if (m) {
    let y = m[2];
    if (y.length === 2) y = '20' + y;
    const yn = parseInt(y, 10);
    if (y.length === 4 && yn >= 2000 && yn <= 2100) return `${parseInt(m[1], 10)}/${y}`;
  }
  const m2 = s.match(/^\s*(\d{1,5})\s*$/);
  if (m2) {
    const fy = String(fallbackDate || '').slice(0, 4);
    return `${parseInt(m2[1], 10)}/${/^\d{4}$/.test(fy) ? fy : '2026'}`;
  }
  return '';
}

function formatCleanDpRef(canon) {
  if (!canon) return '';
  const parts = String(canon).split('/');
  if (parts.length !== 2) return String(canon);
  return `${parts[0].padStart(2, '0')}/${parts[1]}`;
}

function getDpIdentityKey(d) {
  if (!d) return '';
  const c = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
  if (c) return 'dp:' + c;
  const ben = String(d.beneficiary || d.supplier || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const amt = Math.round(Number(d.amount) || 0);
  if (ben && amt > 0) return `x:${ben}|${amt}|${String(d.requestDate || '').slice(0, 10)}`;
  return '';
}

const SPECIAL_CASE_RE = /\b(special\s*case|cas\s*sp[eé]cial|hors\s*calcul|exclu)\b/i;

function sanitizePaymentPayload(raw) {
  const doc = { ...(raw || {}) };
  delete doc._id;
  delete doc.__v;
  if (typeof doc.id === 'string' && doc.id.trim()) {
    doc.id = doc.id.trim();
  } else if (typeof doc.id === 'number') {
    doc.id = String(doc.id);
  } else {
    delete doc.id;
  }
  if (typeof doc.paymentRef === 'string') {
    doc.paymentRef = doc.paymentRef.trim();
  }
  const canon = canonicalDpRef(doc.paymentRef || doc.canonicalRef, doc.requestDate || doc.paidDate);
  if (canon) {
    doc.canonicalRef = canon;
    doc.paymentRef = formatCleanDpRef(canon);
  }
  if (raw && raw.excluded === false) {
    doc.excluded = false;
    doc.isSpecialCase = Boolean(raw.isSpecialCase);
  } else {
    const textBlob = [doc.notes, doc.natureExpense, doc.description, doc.objet, doc.excludedReason]
      .filter(Boolean)
      .join(' ');
    if (Boolean(raw && (raw.excluded === true || raw.isSpecialCase === true)) || SPECIAL_CASE_RE.test(textBlob)) {
      doc.excluded = true;
      doc.isSpecialCase = true;
    }
  }
  for (const arrField of ['linkedBcIds', 'linkedBcRefs', 'ignoredBcIds']) {
    if (Array.isArray(doc[arrField])) {
      doc[arrField] = Array.from(new Set(doc[arrField].map(x => String(x || '').trim()).filter(Boolean)));
    }
  }
  return doc;
}

function buildPaymentLookup(docs) {
  const byMongoId = new Map();
  const byClientId = new Map();
  const byNormRef = new Map();
  for (const d of docs) {
    if (!d) continue;
    if (d._id) byMongoId.set(String(d._id), d);
    if (d.id && String(d.id).trim()) byClientId.set(String(d.id).trim(), d);
    const norm = getDpIdentityKey(d);
    if (norm && !byNormRef.has(norm)) byNormRef.set(norm, d);
  }
  return { byMongoId, byClientId, byNormRef };
}

function findMatchingPayment(doc, rawInput, lookup) {
  if (rawInput && rawInput._id && isValidObjectId24(String(rawInput._id))) {
    const byOid = lookup.byMongoId.get(String(rawInput._id));
    if (byOid) return byOid;
  }
  // Canonical DP number wins over client ids (scanned files carry random ids)
  const norm = getDpIdentityKey(doc);
  if (norm && lookup.byNormRef.has(norm)) {
    return lookup.byNormRef.get(norm);
  }
  if (doc.id && lookup.byClientId.has(doc.id)) {
    return lookup.byClientId.get(doc.id);
  }
  return null;
}

function mergeIntraBatchPayments(prevItem, nextItem) {
  const a = prevItem.doc;
  const b = nextItem.doc;
  const merged = { ...a, ...b };
  for (const [k, v] of Object.entries(a)) {
    if ((merged[k] === '' || merged[k] === null || merged[k] === undefined) && v !== '' && v !== null && v !== undefined) {
      merged[k] = v;
    }
  }
  for (const arrField of ['linkedBcIds', 'linkedBcRefs', 'ignoredBcIds']) {
    if (Array.isArray(a[arrField]) || Array.isArray(b[arrField])) {
      const combined = [...(Array.isArray(a[arrField]) ? a[arrField] : []), ...(Array.isArray(b[arrField]) ? b[arrField] : [])];
      merged[arrField] = Array.from(new Set(combined.map(x => String(x || '').trim()).filter(Boolean)));
    }
  }
  const bDefaultUnpaid = (!b.status || b.status === 'en_attente' || b.status === 'programme') && !b.paidDate;
  if (a.status === 'paye' && bDefaultUnpaid) {
    merged.status = 'paye';
    if (!merged.paidDate && a.paidDate) merged.paidDate = a.paidDate;
  }
  const rawWithOid = (nextItem.raw && isValidObjectId24(String(nextItem.raw._id || ''))) ? nextItem.raw : prevItem.raw;
  return { raw: rawWithOid, doc: merged };
}

let _payCache = null;
let _payCacheTime = 0;
let _payCacheVersion = 1;
function invalidatePaymentsCache() {
  _payCache = null;
  _payCacheTime = 0;
  _payCacheVersion++;
}
router.invalidatePaymentsCache = invalidatePaymentsCache;
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    invalidatePaymentsCache();
    try {
      const bcRouter = require('./bc');
      if (bcRouter && typeof bcRouter.invalidateBcCache === 'function') bcRouter.invalidateBcCache();
    } catch (_) {}
  }
  next();
});

function indexPaymentItemInLookup(entry, idx, lookup) {
  const d = { ...entry.doc, _id: entry.raw && entry.raw._id, _batchIdx: idx };
  if (d._id) lookup.byMongoId.set(String(d._id), d);
  if (d.id && String(d.id).trim()) lookup.byClientId.set(String(d.id).trim(), d);
  const idKey = getDpIdentityKey(d);
  if (idKey) lookup.byIdentityKey.set(idKey, d);
  const canon = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
  if (canon) lookup.byCanonicalRef.set(canon, d);
  if (d.paymentRef) {
    const nr = normalizePaymentRef(d.paymentRef);
    if (nr) lookup.byNormRef.set(nr, d);
  }
  if (d.sourceFile && String(d.sourceFile).trim()) {
    lookup.bySourceFile.set(String(d.sourceFile).trim().toLowerCase(), d);
  }
}

function deduplicatePaymentBatch(rawRecords) {
  const items = [];
  const lookup = buildPaymentLookup([]);
  for (const raw of rawRecords) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = sanitizePaymentPayload(raw);
    const matched = findMatchingPayment(doc, raw, lookup);
    if (matched && typeof matched._batchIdx === 'number') {
      const idx = matched._batchIdx;
      items[idx] = mergeIntraBatchPayments(items[idx], { raw, doc });
      indexPaymentItemInLookup(items[idx], idx, lookup);
      continue;
    }
    const newIdx = items.length;
    const entry = { raw, doc };
    items.push(entry);
    indexPaymentItemInLookup(entry, newIdx, lookup);
  }
  return items;
}

function mergeWithExistingPayment(incomingDoc, existingDoc, fromFolderScan) {
  const merged = { ...incomingDoc };
  if (!merged.id && existingDoc.id) merged.id = existingDoc.id;
  if (fromFolderScan) {
    if ((existingDoc.status === 'paye' || existingDoc.status === 'paid') && merged.status !== 'paye') {
      merged.status = 'paye';
      if (!merged.paidDate && existingDoc.paidDate) merged.paidDate = existingDoc.paidDate;
    }
    for (const f of ['bcId', 'bcRef', 'paidDate', 'aiMatchReason', 'excludedReason']) {
      if ((!merged[f] || !String(merged[f]).trim()) && existingDoc[f]) merged[f] = existingDoc[f];
    }
    if (existingDoc.excluded === true || existingDoc.isSpecialCase === true) {
      merged.excluded = true;
      merged.isSpecialCase = true;
    } else if (merged.excluded === undefined && existingDoc.excluded !== undefined) {
      merged.excluded = existingDoc.excluded;
      merged.isSpecialCase = Boolean(existingDoc.isSpecialCase);
    }
    if (existingDoc.status && existingDoc.status !== merged.status && existingDoc.status !== 'paye') merged.status = existingDoc.status;
    for (const af of ['linkedBcIds', 'linkedBcRefs', 'ignoredBcIds']) {
      if ((!Array.isArray(merged[af]) || merged[af].length === 0) && Array.isArray(existingDoc[af]) && existingDoc[af].length > 0) {
        merged[af] = existingDoc[af];
      }
    }
    if (existingDoc.isDirect && merged.isDirect === undefined) merged.isDirect = true;
    if (existingDoc.manualLink && !merged.manualLink) merged.manualLink = true;
  }
  return merged;
}

async function upsertPaymentBatch(rawRecords, options = {}) {
  const uniqueItems = deduplicatePaymentBatch(rawRecords);
  if (uniqueItems.length === 0) {
    return { upserted: 0, modified: 0, matched: 0, total: 0, received: rawRecords.length, deduplicatedInBatch: rawRecords.length };
  }
  const existingDocs = await Payment.find().lean();
  const lookup = buildPaymentLookup(existingDocs);
  const fromFolderScan = Boolean(options.fromFolderScan);

  const ops = uniqueItems.map(({ raw, doc }) => {
    const existing = findMatchingPayment(doc, raw, lookup);
    if (existing) {
      const merged = mergeWithExistingPayment(doc, existing, fromFolderScan);
      return {
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: merged },
          upsert: false
        }
      };
    }
    const filter = doc.paymentRef
      ? { paymentRef: doc.paymentRef }
      : (doc.id ? { id: doc.id } : { amount: doc.amount || 0, beneficiary: doc.beneficiary || doc.supplier || '', requestDate: doc.requestDate || '' });
    return {
      updateOne: {
        filter,
        update: { $set: doc },
        upsert: true
      }
    };
  });

  const result = await Payment.bulkWrite(ops, { ordered: false });
  return {
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    total: uniqueItems.length,
    received: rawRecords.length,
    deduplicatedInBatch: rawRecords.length - uniqueItems.length
  };
}

// Merge duplicated DP documents already stored in MongoDB (same canonical DP number)
function dpWinnerScore(d) {
  let s = 0;
  if (d.status === 'paye' || d.status === 'paid') s += 100;
  if (d.manualLink) s += 40;
  if (Array.isArray(d.linkedBcIds) && d.linkedBcIds.length) s += 30;
  if (d.bcId || d.bcRef) s += 20;
  if (d.excluded === true || d.isSpecialCase === true) s += 25;
  else if (d.excluded === false) s += 10;
  if (Number(d.amount) > 0) s += 5;
  return s;
}

async function dedupePaymentsInDb() {
  const all = await Payment.find().lean();
  const groups = new Map();
  for (const d of all) {
    const k = getDpIdentityKey(d);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }
  const ops = [];
  const toDelete = [];
  for (const list of groups.values()) {
    list.sort((a, b) => (dpWinnerScore(b) - dpWinnerScore(a)) ||
      (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
    const winner = list[0];
    const merged = {};
    const canon = canonicalDpRef(winner.paymentRef || winner.canonicalRef, winner.requestDate || winner.paidDate);
    if (canon) {
      const cleanRef = formatCleanDpRef(canon);
      if (winner.canonicalRef !== canon) merged.canonicalRef = canon;
      if (winner.paymentRef !== cleanRef) merged.paymentRef = cleanRef;
    }
    const winText = [winner.notes, winner.natureExpense, winner.description, winner.objet, winner.excludedReason].filter(Boolean).join(' ');
    if (winner.excluded !== false && (winner.excluded === true || winner.isSpecialCase === true || SPECIAL_CASE_RE.test(winText))) {
      if (!winner.excluded) merged.excluded = true;
      if (!winner.isSpecialCase) merged.isSpecialCase = true;
    }
    for (const loser of list.slice(1)) {
      if ((loser.status === 'paye' || loser.status === 'paid') && winner.status !== 'paye' && merged.status !== 'paye') {
        merged.status = 'paye';
      }
      if (loser.manualLink && !winner.manualLink) merged.manualLink = true;
      if ((loser.excluded === true || loser.isSpecialCase === true) && !winner.excluded) {
        merged.excluded = true;
        merged.isSpecialCase = true;
      }
      for (const [k, v] of Object.entries(loser)) {
        if (k === '_id' || k === '__v' || k === 'createdAt' || k === 'updatedAt' || k === 'paymentRef' || k === 'canonicalRef') continue;
        const cur = merged[k] !== undefined ? merged[k] : winner[k];
        if ((cur === undefined || cur === null || cur === '' || (Array.isArray(cur) && cur.length === 0)) &&
            v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
          merged[k] = v;
        }
      }
      for (const af of ['linkedBcIds', 'linkedBcRefs', 'ignoredBcIds']) {
        const base = merged[af] || winner[af] || [];
        const add = Array.isArray(loser[af]) ? loser[af] : [];
        merged[af] = Array.from(new Set([...base, ...add].map(x => String(x || '').trim()).filter(Boolean)));
      }
      toDelete.push(loser._id);
    }
    if (Object.keys(merged).length) ops.push({ updateOne: { filter: { _id: winner._id }, update: { $set: merged } } });
  }
  if (ops.length) await Payment.bulkWrite(ops, { ordered: false });
  if (toDelete.length) await Payment.deleteMany({ _id: { $in: toDelete } });
  return { before: all.length, after: all.length - toDelete.length, removed: toDelete.length, normalized: ops.length };
}

// POST /api/payments/dedupe — merge duplicate DPs stored in DB
router.post('/dedupe', authenticate, async (req, res) => {
  try {
    res.json(await dedupePaymentsInDb());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/bulk-delete — permanently delete several DPs (by _id, client id, ref, or canonical DP ref)
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const ids = (Array.isArray(req.body && req.body.ids) ? req.body.ids : []).map(x => String(x || '').trim()).filter(Boolean);
    const refs = (Array.isArray(req.body && req.body.refs) ? req.body.refs : []).map(x => String(x || '').trim()).filter(Boolean);
    if (!ids.length && !refs.length) return res.status(400).json({ error: 'ids or refs required' });
    const idSet = new Set(ids);
    const refSet = new Set([...refs, ...ids]);
    const normSet = new Set([...refs, ...ids].map(normalizePaymentRef).filter(Boolean));
    const canonSet = new Set([...refs, ...ids].map(r => canonicalDpRef(r)).filter(Boolean));
    const allDocs = await Payment.find().lean();
    for (const d of allDocs) {
      if (idSet.has(String(d._id)) || (d.id && idSet.has(String(d.id))) || (d.paymentRef && refSet.has(String(d.paymentRef)))) {
        const c = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
        if (c) canonSet.add(c);
      }
    }
    const targetOids = allDocs.filter(d => {
      const c = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
      return idSet.has(String(d._id)) ||
        (d.id && idSet.has(String(d.id))) ||
        (d.paymentRef && (refSet.has(String(d.paymentRef)) || normSet.has(normalizePaymentRef(d.paymentRef)))) ||
        (c && canonSet.has(c));
    }).map(d => d._id);
    const result = targetOids.length ? await Payment.deleteMany({ _id: { $in: targetOids } }) : { deletedCount: 0 };
    res.json({ deleted: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments — with in-memory RAM cache & instant ETag 304
router.get('/', authenticate, async (req, res) => {
  try {
    if (_payCache && (Date.now() - _payCacheTime < 60000)) {
      if (req.headers['if-none-match'] && req.headers['if-none-match'] === _payCache.etag) {
        return res.status(304).end();
      }
      res.setHeader('ETag', _payCache.etag);
      return res.json(_payCache.payload);
    }
    const records = await Payment.find().sort({ requestDate: -1 }).limit(5000).lean();
    const payload = { payments: records, total: records.length };
    const etag = `W/"pay-${_payCacheVersion}-${records.length}"`;
    _payCache = { payload, etag };
    _payCacheTime = Date.now();
    res.setHeader('ETag', etag);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments — create or deduplicate/merge single DP record
router.post('/', authenticate, async (req, res) => {
  try {
    const raw = req.body || {};
    const doc = sanitizePaymentPayload(raw);
    const existingDocs = await Payment.find().lean();
    const lookup = buildPaymentLookup(existingDocs);
    const existing = findMatchingPayment(doc, raw, lookup);
    if (existing) {
      const merged = mergeWithExistingPayment(doc, existing, false);
      const updated = await Payment.findByIdAndUpdate(existing._id, { $set: merged }, { new: true, runValidators: true });
      return res.status(200).json({ payment: updated, deduplicated: true });
    }
    const record = await Payment.create(doc);
    res.status(201).json({ payment: record, deduplicated: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Function to scan and upsert DP records
async function scanAndUpsertDps(recordsToUpsert) {
  let records = recordsToUpsert;
  if (!records || !Array.isArray(records) || records.length === 0) {
    const candidates = [
      path.join(__dirname, '..', 'data', 'extracted_dps_linked.json'),
      path.join(__dirname, '..', '..', 'data', 'extracted_dps_linked.json'),
      path.join(__dirname, '..', 'data', 'extracted_dps.json'),
      path.join(__dirname, '..', '..', 'data', 'extracted_dps.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          const list = Array.isArray(raw) ? raw : (raw.payments || []);
          if (Array.isArray(list) && list.length > 0) {
            records = list;
            break;
          }
        } catch (e) {
          console.warn('[DP-SCAN] Candidate error:', p, e.message);
        }
      }
    }
  }

  let inserted = 0;
  let updated = 0;
  if (records && Array.isArray(records) && records.length > 0) {
    const stats = await upsertPaymentBatch(records, { fromFolderScan: true });
    inserted = stats.upserted;
    updated = stats.modified;
  }

  const saved = await Payment.find().sort({ requestDate: -1 }).lean();
  return { count: saved.length, inserted, updated, records: saved };
}

// POST /api/payments/bulk — deduplicated upsert many
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const isRawArray = Array.isArray(req.body);
    const payments = isRawArray
      ? req.body
      : (req.body && (Array.isArray(req.body.payments) ? req.body.payments : req.body.records));
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'payments array required' });
    }
    if (payments.length === 0) {
      return res.json({ upserted: 0, modified: 0, matched: 0, total: 0, received: 0, deduplicatedInBatch: 0 });
    }
    const stats = await upsertPaymentBatch(payments, {
      fromFolderScan: Boolean(!isRawArray && req.body && req.body.fromFolderScan)
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function computePaidBcStatus(bc) {
  const cur = String((bc && bc.status) || '').trim().toLowerCase();
  if (cur === 'clos' || cur === 'cloture' || cur === 'clôturé' || cur === 'cloturé') {
    return 'clos';
  }
  const deliveredStatuses = new Set(['livre', 'livré', 'receptionne', 'réceptionné', 'service_fait', 'livre_paye', 'livré_payé']);
  const hasGoodsDate = Boolean(bc && String(bc.goodsReceivedDate || '').trim());
  const hasServiceDate = Boolean(bc && String(bc.serviceDoneDate || '').trim());
  if (deliveredStatuses.has(cur) || hasGoodsDate || hasServiceDate) {
    return 'livre_paye';
  }
  return 'paye';
}

async function cascadePaidStatusToBcs(matchedPayments, cleanRefs, paidDate) {
  const dpMeta = matchedPayments.map(p => {
    const pRef = String(p.paymentRef || '').trim();
    const pIds = [String(p._id || '').trim(), String(p.id || '').trim()].filter(Boolean);
    const pBcIds = [String(p.bcId || '').trim(), ...(Array.isArray(p.linkedBcIds) ? p.linkedBcIds : []).map(x => String(x || '').trim())].filter(Boolean);
    const pBcRefs = [String(p.bcRef || '').trim(), ...(Array.isArray(p.linkedBcRefs) ? p.linkedBcRefs : []).map(x => String(x || '').trim())].filter(Boolean);
    const pNormBcRefs = [...pBcRefs, ...pBcIds].map(normalizePaymentRef).filter(Boolean);
    return { p, pRef, pNormRef: normalizePaymentRef(pRef), pIds, pBcIds, pNormBcRefs };
  });
  const extraRefsByNorm = new Map();
  for (const r of cleanRefs) {
    const nr = normalizePaymentRef(r);
    if (nr) extraRefsByNorm.set(nr, r);
  }
  if (dpMeta.length === 0 && extraRefsByNorm.size === 0) return 0;

  const allBcs = await BcRecord.find().lean();
  const bcOps = [];
  for (const bc of allBcs) {
    const bcMongoId = String(bc._id || '').trim();
    const bcClientId = String(bc.id || '').trim();
    const bcNormRef = normalizePaymentRef(bc.ref);
    const bcNormDpRefs = new Set(
      [bc.dpRef, bc.paymentRef, ...(Array.isArray(bc.linkedDpRefs) ? bc.linkedDpRefs : [])]
        .map(normalizePaymentRef)
        .filter(Boolean)
    );
    const bcDpIds = new Set((Array.isArray(bc.linkedDpIds) ? bc.linkedDpIds : []).map(x => String(x || '').trim()).filter(Boolean));

    const hittingDps = dpMeta.filter(m =>
      (bcMongoId && m.pBcIds.includes(bcMongoId)) ||
      (bcClientId && m.pBcIds.includes(bcClientId)) ||
      (bcNormRef && m.pNormBcRefs.includes(bcNormRef)) ||
      (m.pNormRef && bcNormDpRefs.has(m.pNormRef)) ||
      m.pIds.some(pid => bcDpIds.has(pid))
    );
    const hittingExtraRefs = [];
    for (const [nr, origRef] of extraRefsByNorm.entries()) {
      if (bcNormDpRefs.has(nr)) hittingExtraRefs.push(origRef);
    }
    if (hittingDps.length === 0 && hittingExtraRefs.length === 0) continue;

    const resolvedRefs = Array.from(new Set([...hittingDps.map(m => m.pRef).filter(Boolean), ...hittingExtraRefs]));
    const refStr = resolvedRefs.length > 0 ? resolvedRefs.join(', ') : String(bc.paymentRef || bc.dpRef || '').trim();
    const dpRefStr = resolvedRefs.length > 0 ? resolvedRefs.join(', ') : String(bc.dpRef || bc.paymentRef || '').trim();
    const dpPaidFallback = hittingDps.map(m => String(m.p.paidDate || '').trim()).find(Boolean);
    const effectivePaidDate = (paidDate !== undefined && String(paidDate).trim())
      ? String(paidDate).trim()
      : (dpPaidFallback || String(bc.paymentPaidDate || '').trim() || new Date().toISOString().slice(0, 10));
    const mergedDpRefs = Array.from(new Set([...(Array.isArray(bc.linkedDpRefs) ? bc.linkedDpRefs : []), ...resolvedRefs].map(x => String(x || '').trim()).filter(Boolean)));
    const mergedDpIds = Array.from(new Set([...(Array.isArray(bc.linkedDpIds) ? bc.linkedDpIds : []), ...hittingDps.map(m => String(m.p.id || m.p._id || '').trim())].filter(Boolean)));

    bcOps.push({
      updateOne: {
        filter: { _id: bc._id },
        update: {
          $set: {
            status: computePaidBcStatus(bc),
            paymentStatus: 'paye',
            paymentRef: refStr,
            dpRef: dpRefStr,
            paymentPaidDate: effectivePaidDate,
            linkedDpRefs: mergedDpRefs,
            linkedDpIds: mergedDpIds
          }
        }
      }
    });
  }

  if (bcOps.length > 0) {
    await BcRecord.bulkWrite(bcOps, { ordered: false });
  }
  return bcOps.length;
}

function isDpLinkedToBcDoc(dp, bc) {
  if (!dp || !bc || dp.isDirect) return false;
  const bcMongoId = String(bc._id || '').trim();
  const bcClientId = String(bc.id || '').trim();
  const bcNormRef = normalizePaymentRef(bc.ref);
  const dpNormRef = normalizePaymentRef(dp.paymentRef);
  const pBcIds = [String(dp.bcId || '').trim(), ...(Array.isArray(dp.linkedBcIds) ? dp.linkedBcIds : []).map(x => String(x || '').trim())].filter(Boolean);
  const pNormBcRefs = [String(dp.bcRef || '').trim(), ...(Array.isArray(dp.linkedBcRefs) ? dp.linkedBcRefs : [])].map(normalizePaymentRef).filter(Boolean);
  const bcNormDpRefs = new Set([bc.dpRef, bc.paymentRef, ...(Array.isArray(bc.linkedDpRefs) ? bc.linkedDpRefs : [])].map(normalizePaymentRef).filter(Boolean));
  const bcDpIds = new Set((Array.isArray(bc.linkedDpIds) ? bc.linkedDpIds : []).map(x => String(x || '').trim()).filter(Boolean));
  return (bcMongoId && pBcIds.includes(bcMongoId)) ||
    (bcClientId && pBcIds.includes(bcClientId)) ||
    (bcNormRef && pNormBcRefs.includes(bcNormRef)) ||
    (dpNormRef && bcNormDpRefs.has(dpNormRef)) ||
    [String(dp._id || '').trim(), String(dp.id || '').trim()].filter(Boolean).some(pid => bcDpIds.has(pid));
}

async function cascadeUnpaidStatusToBcs(revertedPayments, postUpdatePayments, cleanRefs) {
  const extraNormRefs = new Set(cleanRefs.map(normalizePaymentRef).filter(Boolean));
  if (revertedPayments.length === 0 && extraNormRefs.size === 0) return 0;
  const allBcs = await BcRecord.find().lean();
  const bcOps = [];

  for (const bc of allBcs) {
    const bcNormDpRefs = new Set([bc.dpRef, bc.paymentRef, ...(Array.isArray(bc.linkedDpRefs) ? bc.linkedDpRefs : [])].map(normalizePaymentRef).filter(Boolean));
    const hitReverted = revertedPayments.some(dp => isDpLinkedToBcDoc(dp, bc)) ||
      Array.from(extraNormRefs).some(nr => bcNormDpRefs.has(nr));
    if (!hitReverted) continue;

    const allLinkedDps = postUpdatePayments.filter(dp => isDpLinkedToBcDoc(dp, bc));
    const stillPaidDp = allLinkedDps.find(dp => dp.status === 'paye' || dp.status === 'paid');
    if (stillPaidDp) continue;

    const cur = String(bc.status || '').trim().toLowerCase();
    const hasDelivery = Boolean(String(bc.goodsReceivedDate || '').trim() || String(bc.serviceDoneDate || '').trim());
    let nextStatus = bc.status;
    if (cur === 'livre_paye' || cur === 'livré_payé') nextStatus = 'livre';
    else if (cur === 'paye' || cur === 'payé') nextStatus = hasDelivery ? 'livre' : 'transmis';

    const activeDps = allLinkedDps.filter(dp => dp.status !== 'annule');
    const cleanedRemarques = String(bc.remarques || '').replace(/\s*·?\s*✓\s*Pay[eé](\s*\([^)]*\))?/gi, '').trim();
    bcOps.push({
      updateOne: {
        filter: { _id: bc._id },
        update: {
          $set: {
            status: nextStatus,
            paymentStatus: activeDps.length > 0 ? 'en_attente' : '',
            paymentPaidDate: '',
            remarques: cleanedRemarques
          }
        }
      }
    });
  }

  if (bcOps.length > 0) {
    await BcRecord.bulkWrite(bcOps, { ordered: false });
  }
  return bcOps.length;
}

// POST /api/payments/bulk-status — bulk update DP status + cascade payment to linked BCs
router.post('/bulk-status', authenticate, async (req, res) => {
  try {
    const body = req.body || {};
    const status = String(body.status || '').trim();
    if (!status && body.excluded === undefined) {
      return res.status(400).json({ error: 'status required' });
    }
    const rawIds = Array.isArray(body.ids) ? body.ids : (Array.isArray(body.paymentIds) ? body.paymentIds : []);
    const rawRefs = Array.isArray(body.paymentRefs)
      ? body.paymentRefs
      : (Array.isArray(body.dpRefs) ? body.dpRefs : (Array.isArray(body.refs) ? body.refs : []));
    const cleanIds = rawIds.map(x => String(x || '').trim()).filter(Boolean);
    const cleanRefs = rawRefs.map(x => String(x || '').trim()).filter(Boolean);
    const paidDate = body.paidDate;

    if (cleanIds.length === 0 && cleanRefs.length === 0) {
      return res.json({ ok: true, updatedPayments: 0, updatedBcs: 0 });
    }

    const oidSet = new Set(cleanIds.filter(isValidObjectId24));
    const idSet = new Set(cleanIds);
    const refSet = new Set([...cleanRefs, ...cleanIds]);
    const normRefSet = new Set([...cleanRefs, ...cleanIds].map(normalizePaymentRef).filter(Boolean));
    const canonRefSet = new Set([...cleanRefs, ...cleanIds].map(r => canonicalDpRef(r)).filter(Boolean));

    const allPayments = await Payment.find().lean();
    for (const p of allPayments) {
      if (oidSet.has(String(p._id || '')) || idSet.has(String(p.id || ''))) {
        const c = canonicalDpRef(p.paymentRef || p.canonicalRef, p.requestDate || p.paidDate);
        if (c) canonRefSet.add(c);
      }
    }
    const matchedPayments = allPayments.filter(p => {
      const mId = String(p._id || '').trim();
      const cId = String(p.id || '').trim();
      const pRef = String(p.paymentRef || '').trim();
      const pNorm = normalizePaymentRef(pRef);
      const pCanon = canonicalDpRef(pRef || p.canonicalRef, p.requestDate || p.paidDate);
      return (mId && oidSet.has(mId)) ||
        (cId && idSet.has(cId)) ||
        (pRef && refSet.has(pRef)) ||
        (pNorm && normRefSet.has(pNorm)) ||
        (pCanon && canonRefSet.has(pCanon));
    });

    const isExclusionOnly = status === 'excluded' || status === 'included' || (!status && body.excluded !== undefined);
    const paymentUpdate = {};
    if (status === 'excluded' || body.excluded === true) {
      paymentUpdate.excluded = true;
      paymentUpdate.isSpecialCase = true;
      if (body.excludedReason !== undefined) paymentUpdate.excludedReason = String(body.excludedReason || '');
    } else if (status === 'included' || body.excluded === false) {
      paymentUpdate.excluded = false;
      paymentUpdate.isSpecialCase = false;
      if (body.excludedReason !== undefined) paymentUpdate.excludedReason = String(body.excludedReason || '');
    }
    if (status && status !== 'excluded' && status !== 'included') {
      paymentUpdate.status = status;
    }
    if (paidDate !== undefined) {
      paymentUpdate.paidDate = String(paidDate || '');
    }

    let updatedPayments = 0;
    if (matchedPayments.length > 0 && Object.keys(paymentUpdate).length > 0) {
      const matchedMongoIds = matchedPayments.map(p => p._id);
      const payRes = await Payment.updateMany({ _id: { $in: matchedMongoIds } }, { $set: paymentUpdate });
      updatedPayments = payRes.matchedCount !== undefined ? payRes.matchedCount : matchedMongoIds.length;
    }

    let updatedBcs = 0;
    if (!isExclusionOnly) {
      const matchedIdStrs = new Set(matchedPayments.map(p => String(p._id)));
      if (status === 'paye' || status === 'paid') {
        const updatedPaymentSnapshots = matchedPayments.map(p => ({ ...p, ...paymentUpdate, status: 'paye' }));
        updatedBcs = await cascadePaidStatusToBcs(updatedPaymentSnapshots, cleanRefs, paidDate);
      } else {
        const revertedSnapshots = matchedPayments.map(p => ({ ...p, ...paymentUpdate }));
        const postUpdatePayments = allPayments.map(p => (matchedIdStrs.has(String(p._id)) ? { ...p, ...paymentUpdate } : p));
        updatedBcs = await cascadeUnpaidStatusToBcs(revertedSnapshots, postUpdatePayments, cleanRefs);
      }
    }

    res.json({ ok: true, updatedPayments, updatedBcs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const scanDpHandler = async (req, res) => {
  try {
    const inputRecords = req.body && (req.body.records || req.body.payments);
    const result = await scanAndUpsertDps(inputRecords);
    res.json({ success: true, count: result.count, inserted: result.inserted, updated: result.updated, records: result.records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/scan', authenticate, scanDpHandler);
router.scanDpHandler = scanDpHandler;
router.scanAndUpsertDps = scanAndUpsertDps;
router.normalizePaymentRef = normalizePaymentRef;
router.canonicalDpRef = canonicalDpRef;
router.formatCleanDpRef = formatCleanDpRef;
router.getDpIdentityKey = getDpIdentityKey;
router.dedupePaymentsInDb = dedupePaymentsInDb;
router.computePaidBcStatus = computePaidBcStatus;

// PUT /api/payments/:id — update by _id, client id, or normalized paymentRef without CastErrors
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const updateDoc = sanitizePaymentPayload(req.body);
    let record = null;
    if (isValidObjectId24(paramId)) {
      record = await Payment.findByIdAndUpdate(paramId, { $set: updateDoc }, { new: true, runValidators: true });
    }
    if (!record) {
      record = await Payment.findOneAndUpdate(
        { $or: [{ id: paramId }, { paymentRef: paramId }] },
        { $set: updateDoc },
        { new: true, runValidators: true }
      );
    }
    if (!record) {
      const existingDocs = await Payment.find().lean();
      const matched = findMatchingPayment(
        { ...updateDoc, id: updateDoc.id || paramId, paymentRef: updateDoc.paymentRef || paramId },
        req.body,
        buildPaymentLookup(existingDocs)
      );
      if (matched) {
        record = await Payment.findByIdAndUpdate(matched._id, { $set: updateDoc }, { new: true, runValidators: true });
      } else if (updateDoc.paymentRef || updateDoc.id) {
        const toCreate = { ...updateDoc };
        if (!toCreate.id && paramId && !isValidObjectId24(paramId)) toCreate.id = paramId;
        record = await Payment.create(toCreate);
      }
    }
    if (!record) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ payment: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALL /api/payments/purge-all — wipe all DP records and mark dpDatasetVersion manual_empty
router.all('/purge-all', async (req, res) => {
  try {
    const Setting = require('../models/Setting');
    const result = await Payment.deleteMany({});
    await Setting.findOneAndUpdate(
      { key: 'global' },
      { $set: { dpDatasetVersion: 'manual_empty', dpLastPurgedAt: new Date() } },
      { upsert: true, strict: false }
    );
    res.json({ deleted: result.deletedCount, message: `${result.deletedCount} DPs supprimées. Base DP vide.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/all — delete all (admin only) — MUST BE BEFORE /:id
router.delete('/all', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const result = await Payment.deleteMany({});
    res.json({ deleted: result.deletedCount, message: 'Tous les paiements supprimés' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id — delete by _id, client id, paymentRef, or canonicalDpRef without CastErrors
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const paramNorm = normalizePaymentRef(paramId);
    const canonSet = new Set();
    const directCanon = canonicalDpRef(paramId);
    if (directCanon) canonSet.add(directCanon);
    const allDocs = await Payment.find().lean();
    for (const d of allDocs) {
      if (String(d._id) === paramId || String(d.id || '') === paramId || String(d.paymentRef || '').trim() === paramId || (paramNorm && normalizePaymentRef(d.paymentRef) === paramNorm)) {
        const c = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
        if (c) canonSet.add(c);
      }
    }
    const targetOids = allDocs.filter(d => {
      const c = canonicalDpRef(d.paymentRef || d.canonicalRef, d.requestDate || d.paidDate);
      return String(d._id) === paramId ||
        String(d.id || '') === paramId ||
        String(d.paymentRef || '').trim() === paramId ||
        (paramNorm && normalizePaymentRef(d.paymentRef) === paramNorm) ||
        (c && canonSet.has(c));
    }).map(d => d._id);
    if (targetOids.length === 0) return res.status(404).json({ error: 'Paiement non trouvé' });
    const result = await Payment.deleteMany({ _id: { $in: targetOids } });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ message: 'Paiement supprimé', deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
