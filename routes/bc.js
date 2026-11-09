const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const BcRecord = require('../models/BcRecord');
const Setting = require('../models/Setting');
const { authenticate, authorize } = require('../middleware/auth');

const PROTECTED_BC_STATUSES = new Set(['clos', 'livre_paye']);

function isValidObjectId24(val) {
  return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val) && mongoose.Types.ObjectId.isValid(val);
}

function extractBcSerial(val) {
  const raw = String(val || '').trim();
  if (!raw) return null;
  const yearFirst = raw.match(/BC\s*[-/_.]?\s*(?:20\d{2})\s*[-/_.]\s*(\d{1,5})/i);
  if (yearFirst) return String(Number(yearFirst[1]));
  const direct = raw.match(/BC\s*(?:N\s*[°ºo.?#\uFFFD]?\s*)?[:/#._ -]*\s*(\d{1,5})/i);
  if (direct) return String(Number(direct[1]));
  const triple = raw.match(/\b(\d{1,5})\s*\/\s*[A-Z]{1,6}\s*\/\s*20\d{2}\b/i);
  if (triple) return String(Number(triple[1]));
  const slashYear = raw.match(/^(\d{1,5})\s*\/\s*20\d{2}$/);
  if (slashYear) return String(Number(slashYear[1]));
  return null;
}

function extractBcYear(r) {
  const refStr = String((r && r.ref) || '');
  const refYear = refStr.match(/\b(20\d{2})\b/);
  if (refYear) return refYear[1];
  const dateStr = String((r && (r.date || r.requestDate)) || '');
  const dateYear = dateStr.match(/\b(20\d{2})\b/);
  if (dateYear) return dateYear[1];
  return '';
}

function getBcDedupKey(r) {
  if (!r || typeof r !== 'object') return null;
  const refRaw = String(r.ref || '').trim();
  const serial = extractBcSerial(refRaw) || (!refRaw ? extractBcSerial(r.sourceFile) : null);
  if (serial) {
    const yr = extractBcYear(r);
    return yr ? `S_${yr}_${serial}` : `S_${serial}`;
  }
  if (refRaw) {
    return 'R_' + refRaw.replace(/\s+/g, ' ').toLowerCase();
  }
  if (r.id && String(r.id).trim()) {
    return 'ID_' + String(r.id).trim();
  }
  const sup = String(r.supplierName || '').trim().toLowerCase();
  const dt = String(r.date || '').trim();
  const amt = Number(r.amountTTC || r.amount || 0);
  if (sup || dt || amt) {
    return `F_${dt}_${sup}_${amt}`;
  }
  return null;
}

function sanitizeBcPayload(raw) {
  const doc = { ...(raw || {}) };
  delete doc._id;
  delete doc.__v;
  delete doc.forceStatusUpdate;
  delete doc.fromFolderScan;
  delete doc.preserveExistingStatus;
  if (typeof doc.id === 'string' && doc.id.trim()) {
    doc.id = doc.id.trim();
  } else if (typeof doc.id === 'number') {
    doc.id = String(doc.id);
  } else {
    delete doc.id;
  }
  return doc;
}

function buildBcLookup(docs) {
  const byMongoId = new Map();
  const byClientId = new Map();
  const byDedupKey = new Map();
  const bySerialOnly = new Map();
  const byAnySerial = new Map();
  const byNormRef = new Map();

  for (const d of docs) {
    if (!d) continue;
    if (d._id) byMongoId.set(String(d._id), d);
    if (d.id && String(d.id).trim()) byClientId.set(String(d.id).trim(), d);
    const refRaw = String(d.ref || '').trim();
    if (refRaw) byNormRef.set(refRaw.replace(/\s+/g, ' ').toLowerCase(), d);
    const key = getBcDedupKey(d);
    if (key) byDedupKey.set(key, d);
    const serial = extractBcSerial(refRaw) || (!refRaw ? extractBcSerial(d.sourceFile) : null);
    if (serial) {
      byAnySerial.set(serial, d);
      if (!extractBcYear(d)) bySerialOnly.set(serial, d);
    }
  }
  return { byMongoId, byClientId, byDedupKey, bySerialOnly, byAnySerial, byNormRef };
}

function findMatchingBc(doc, rawInput, lookup) {
  if (rawInput && rawInput._id && isValidObjectId24(String(rawInput._id))) {
    const byOid = lookup.byMongoId.get(String(rawInput._id));
    if (byOid) return byOid;
  }
  if (doc.id && lookup.byClientId.has(doc.id)) return lookup.byClientId.get(doc.id);
  const key = getBcDedupKey(doc);
  if (key && lookup.byDedupKey.has(key)) return lookup.byDedupKey.get(key);
  const refRaw = String(doc.ref || '').trim();
  const serial = extractBcSerial(refRaw) || (!refRaw ? extractBcSerial(doc.sourceFile) : null);
  if (serial) {
    const yr = extractBcYear(doc);
    const fallback = yr ? lookup.bySerialOnly.get(serial) : lookup.byAnySerial.get(serial);
    if (fallback) return fallback;
  }
  if (refRaw) {
    const norm = refRaw.replace(/\s+/g, ' ').toLowerCase();
    if (lookup.byNormRef.has(norm)) return lookup.byNormRef.get(norm);
  }
  return null;
}

function mergeIntraBatchPair(prevItem, nextItem) {
  const a = prevItem.doc;
  const b = nextItem.doc;
  const aAmt = Number(a.amountTTC || a.amount || 0);
  const bAmt = Number(b.amountTTC || b.amount || 0);
  const bIsZeroCopy = bAmt === 0 && aAmt > 0 && /copy|copie/i.test(String(b.sourceFile || ''));
  const base = bIsZeroCopy ? { ...b, ...a } : { ...a, ...b };
  for (const [k, v] of Object.entries(a)) {
    if ((base[k] === '' || base[k] === null || base[k] === undefined) && v !== '' && v !== null && v !== undefined) {
      base[k] = v;
    }
  }
  if ((Number(base.amountTTC || 0) === 0) && aAmt > 0) {
    base.amountTTC = a.amountTTC;
    base.amount = a.amount || a.amountTTC;
    base.amountHT = base.amountHT || a.amountHT || 0;
  }
  if (PROTECTED_BC_STATUSES.has(a.status) && !PROTECTED_BC_STATUSES.has(b.status)) {
    base.status = a.status;
  }
  return { raw: nextItem.raw._id ? nextItem.raw : prevItem.raw, doc: base };
}

function deduplicateIncomingBatch(rawRecords) {
  const items = [];
  for (const raw of rawRecords) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = sanitizeBcPayload(raw);
    const lookup = buildBcLookup(items.map((it, i) => ({ ...it.doc, _id: it.raw && it.raw._id, _batchIdx: i })));
    const matchedDoc = findMatchingBc(doc, raw, lookup);
    if (matchedDoc && typeof matchedDoc._batchIdx === 'number') {
      items[matchedDoc._batchIdx] = mergeIntraBatchPair(items[matchedDoc._batchIdx], { raw, doc });
      continue;
    }
    items.push({ raw, doc });
  }
  return items;
}

function mergeWithExistingBc(incomingDoc, existingDoc, preserveProtected) {
  const merged = { ...incomingDoc };
  if (!merged.id && existingDoc.id) merged.id = existingDoc.id;
  if (preserveProtected) {
    if (existingDoc.status && PROTECTED_BC_STATUSES.has(existingDoc.status) && !PROTECTED_BC_STATUSES.has(merged.status)) {
      merged.status = existingDoc.status;
      if (!merged.closedAt && existingDoc.closedAt) merged.closedAt = existingDoc.closedAt;
      if (!merged.closedBy && existingDoc.closedBy) merged.closedBy = existingDoc.closedBy;
    } else if (existingDoc.status === 'paye') {
      const mStat = String(merged.status || '').trim().toLowerCase();
      if (!mStat || mStat === 'importe' || mStat === 'en_cours' || mStat === 'commande') {
        merged.status = 'paye';
      } else if (mStat === 'livre' || mStat === 'receptionne' || mStat === 'service_fait') {
        merged.status = 'livre_paye';
      }
    }
    const textFields = ['remarques', 'dpRef', 'dpDate', 'paymentRef', 'paymentStatus', 'paymentPaidDate'];
    for (const f of textFields) {
      if ((!merged[f] || !String(merged[f]).trim()) && existingDoc[f]) merged[f] = existingDoc[f];
    }
    for (const af of ['linkedDpIds', 'linkedDpRefs']) {
      if ((!Array.isArray(merged[af]) || merged[af].length === 0) && Array.isArray(existingDoc[af]) && existingDoc[af].length > 0) {
        merged[af] = existingDoc[af];
      }
    }
  }
  return merged;
}

async function setManualEmptySetting() {
  try {
    await Setting.findOneAndUpdate(
      { key: 'global' },
      { $set: { bcDatasetVersion: 'manual_empty', bcCanonicalCount: 0 } },
      { upsert: true, strict: false }
    );
  } catch (_) {}
}

// GET /api/bc — list all BC records
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit: lim, page } = req.query;
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(lim) || 5000;
    const skip = (pageNum - 1) * limit;
    const [records, total] = await Promise.all([
      BcRecord.find().sort({ date: -1 }).skip(skip).limit(limit).lean(),
      BcRecord.countDocuments()
    ]);
    res.json({ bcRecords: records, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bc — create or deduplicate/merge single BC record
router.post('/', authenticate, async (req, res) => {
  try {
    const raw = req.body || {};
    const doc = sanitizeBcPayload(raw);
    const existingDocs = await BcRecord.find().lean();
    const lookup = buildBcLookup(existingDocs);
    const existing = findMatchingBc(doc, raw, lookup);
    if (existing) {
      const preserveProtected = !raw.forceStatusUpdate && (!raw._id || String(raw._id) !== String(existing._id));
      const merged = mergeWithExistingBc(doc, existing, preserveProtected);
      const updated = await BcRecord.findByIdAndUpdate(existing._id, { $set: merged }, { new: true, runValidators: true });
      return res.status(200).json({ bcRecord: updated, deduplicated: true });
    }
    const record = await BcRecord.create(doc);
    res.status(201).json({ bcRecord: record, deduplicated: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function upsertBcBatch(rawRecords, options = {}) {
  const uniqueItems = deduplicateIncomingBatch(rawRecords);
  if (uniqueItems.length === 0) {
    return { upserted: 0, modified: 0, matched: 0, total: 0, received: rawRecords.length, deduplicatedInBatch: rawRecords.length };
  }
  const existingDocs = await BcRecord.find().lean();
  const lookup = buildBcLookup(existingDocs);
  const ops = uniqueItems.map(({ raw, doc }) => {
    const existing = findMatchingBc(doc, raw, lookup);
    if (existing) {
      const isGenericScanRow = !raw._id && raw.importedFromBC && (!doc.status || doc.status === 'importe');
      const preserveProtected = Boolean(options.fromFolderScan || options.preserveExistingStatus || isGenericScanRow);
      const merged = mergeWithExistingBc(doc, existing, preserveProtected);
      return {
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: merged },
          upsert: false
        }
      };
    }
    const filter = doc.ref
      ? { ref: doc.ref }
      : (doc.id ? { id: doc.id } : { date: doc.date || '', supplierName: doc.supplierName || '', amount: doc.amount || 0 });
    return {
      updateOne: {
        filter,
        update: { $set: doc },
        upsert: true
      }
    };
  });
  const result = await BcRecord.bulkWrite(ops, { ordered: false });
  return {
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    total: uniqueItems.length,
    received: rawRecords.length,
    deduplicatedInBatch: rawRecords.length - uniqueItems.length
  };
}

// Function to scan and upsert BC records
async function scanAndUpsertBcs(recordsToUpsert, options = {}) {
  const hasClientRecords = Array.isArray(recordsToUpsert) && recordsToUpsert.length > 0;
  let records = hasClientRecords ? recordsToUpsert : null;

  if (!hasClientRecords) {
    const globalSetting = await Setting.findOne({ key: 'global' }).lean();
    if (globalSetting && globalSetting.bcDatasetVersion === 'manual_empty') {
      return { count: 0, inserted: 0, updated: 0, records: [] };
    }
    const candidates = [
      path.join(__dirname, '..', 'data', 'extracted_bcs_linked.json'),
      path.join(__dirname, '..', 'data', 'extracted_bcs.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.bcRecords) ? raw.bcRecords : []);
          if (Array.isArray(list) && list.length > 0) {
            records = list;
            break;
          }
        } catch (e) {
          console.warn('[BC-SCAN] Candidate error:', p, e.message);
        }
      }
    }
  }

  let inserted = 0;
  let updated = 0;
  if (records && Array.isArray(records) && records.length > 0) {
    const stats = await upsertBcBatch(records, { fromFolderScan: true, ...options });
    inserted = stats.upserted;
    updated = stats.modified;
  }

  const saved = await BcRecord.find().sort({ date: -1 }).lean();
  return { count: saved.length, inserted, updated, records: saved };
}

// POST /api/bc/bulk — upsert many BC records with intra-batch + DB deduplication
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const isRawArray = Array.isArray(req.body);
    const rawList = isRawArray
      ? req.body
      : (req.body && (Array.isArray(req.body.bcRecords) ? req.body.bcRecords : req.body.records));
    if (!Array.isArray(rawList)) {
      return res.status(400).json({ error: 'bcRecords array required' });
    }
    if (rawList.length === 0) {
      return res.json({ upserted: 0, modified: 0, matched: 0, total: 0, received: 0, deduplicatedInBatch: 0 });
    }
    const stats = await upsertBcBatch(rawList, {
      fromFolderScan: Boolean(!isRawArray && req.body && req.body.fromFolderScan),
      preserveExistingStatus: Boolean(!isRawArray && req.body && req.body.preserveExistingStatus)
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const scanBcHandler = async (req, res) => {
  try {
    const inputRecords = req.body && (req.body.records || req.body.bcRecords);
    const result = await scanAndUpsertBcs(inputRecords, { fromFolderScan: true });
    res.json({
      success: true,
      count: result.count,
      inserted: result.inserted,
      updated: result.updated,
      records: result.records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/scan', authenticate, scanBcHandler);
router.scanBcHandler = scanBcHandler;
router.scanAndUpsertBcs = scanAndUpsertBcs;
router.extractBcSerial = extractBcSerial;
router.getBcDedupKey = getBcDedupKey;

// POST /api/bc/bulk-delete — delete multiple BCs atomically without CastErrors
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body && req.body.ids) ? req.body.ids : (Array.isArray(req.body && req.body.bcIds) ? req.body.bcIds : []);
    const rawRefs = Array.isArray(req.body && req.body.refs) ? req.body.refs : [];
    const cleanIds = rawIds.map(x => String(x || '').trim()).filter(Boolean);
    const cleanRefs = rawRefs.map(x => String(x || '').trim()).filter(Boolean);
    const validObjectIds = cleanIds.filter(isValidObjectId24);

    const orClauses = [];
    if (validObjectIds.length > 0) orClauses.push({ _id: { $in: validObjectIds } });
    if (cleanIds.length > 0) {
      orClauses.push({ id: { $in: cleanIds } });
      orClauses.push({ ref: { $in: cleanIds } });
    }
    if (cleanRefs.length > 0) {
      orClauses.push({ ref: { $in: cleanRefs } });
    }
    if (orClauses.length === 0) {
      return res.json({ success: true, deleted: 0, message: 'Aucun identifiant fourni' });
    }

    const result = await BcRecord.deleteMany({ $or: orClauses });
    const remaining = await BcRecord.countDocuments();
    if (remaining === 0) await setManualEmptySetting();
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALL /api/bc/purge-all — open endpoint to wipe all BC records (no auth, maintenance)
router.all('/purge-all', async (req, res) => {
  try {
    const result = await BcRecord.deleteMany({});
    await setManualEmptySetting();
    res.json({ deleted: result.deletedCount, message: `${result.deletedCount} BCs supprimés. Base vide.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALL /api/bc/reset-clean-slate — wipe Stock (Article + Movement), BC, and DP while preserving Users & Settings/Tags
router.all('/reset-clean-slate', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const Article = require('../models/Article');
    const Movement = require('../models/Movement');
    const [delBc, delDp, delArt, delMov] = await Promise.all([
      BcRecord.deleteMany({}),
      Payment.deleteMany({}),
      Article.deleteMany({}),
      Movement.deleteMany({})
    ]);
    await Setting.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          cleanResetToken: 'reset_2026_11_10_stock_bc_dp',
          bcDatasetVersion: 'manual_empty',
          dpDatasetVersion: 'manual_empty',
          stockDatasetVersion: 'manual_empty',
          cleanResetAt: new Date()
        }
      },
      { upsert: true, strict: false }
    );
    res.json({
      success: true,
      deletedBc: delBc.deletedCount || 0,
      deletedDp: delDp.deletedCount || 0,
      deletedArticles: delArt.deletedCount || 0,
      deletedMovements: delMov.deletedCount || 0,
      message: 'Stock, BC et DP réinitialisés à 0 (Utilisateurs et Tags/Paramètres conservés).'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bc/all — delete all (admin only) — MUST BE BEFORE /:id
router.delete('/all', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const result = await BcRecord.deleteMany({});
    await setManualEmptySetting();
    res.json({ deleted: result.deletedCount, message: 'Tous les BCs supprimés' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bc — delete all
router.delete('/', authenticate, async (req, res) => {
  try {
    const result = await BcRecord.deleteMany({});
    await setManualEmptySetting();
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALL /api/bc/resync — safe resync (respects manual_empty, never leaks parent JSON)
router.all('/resync', async (req, res) => {
  try {
    const clientRecords = req.body && (req.body.records || req.body.bcRecords);
    if (Array.isArray(clientRecords) && clientRecords.length > 0) {
      const stats = await upsertBcBatch(clientRecords, { fromFolderScan: Boolean(req.body.fromFolderScan) });
      const records = await BcRecord.find().sort({ date: -1 }).lean();
      return res.json({ success: true, count: records.length, inserted: stats.upserted, updated: stats.modified, records });
    }
    const globalSetting = await Setting.findOne({ key: 'global' }).lean();
    if (globalSetting && globalSetting.bcDatasetVersion === 'manual_empty') {
      return res.json({ success: true, count: 0, deleted: 0, inserted: 0, updated: 0, records: [] });
    }
    const candidates = [
      path.join(__dirname, '..', 'data', 'extracted_bcs_linked.json'),
      path.join(__dirname, '..', 'data', 'extracted_bcs.json')
    ];
    let raw = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.bcRecords) ? parsed.bcRecords : []);
        if (list.length > 0) { raw = list; break; }
      }
    }
    if (!raw || raw.length === 0) {
      const existing = await BcRecord.find().sort({ date: -1 }).lean();
      return res.json({ success: true, count: existing.length, deleted: 0, inserted: 0, updated: 0, records: existing });
    }
    const stats = await upsertBcBatch(
      raw.filter(r => r && r.ref && !/^TEST/i.test(String(r.ref)) && !/^SYNC/i.test(String(r.ref))),
      { fromFolderScan: true }
    );
    const saved = await BcRecord.find().sort({ date: -1 }).lean();
    res.json({ success: true, count: saved.length, inserted: stats.upserted, updated: stats.modified, records: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bc/:id — update by _id, client id, or ref (with upsert fallback, zero CastErrors)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const updateDoc = sanitizeBcPayload(req.body);
    let record = null;

    if (isValidObjectId24(paramId)) {
      record = await BcRecord.findByIdAndUpdate(paramId, { $set: updateDoc }, { new: true, runValidators: true });
    }
    if (!record) {
      const orClauses = [{ id: paramId }, { ref: paramId }];
      if (updateDoc.id && updateDoc.id !== paramId) orClauses.push({ id: updateDoc.id });
      if (updateDoc.ref && updateDoc.ref !== paramId) orClauses.push({ ref: updateDoc.ref });
      record = await BcRecord.findOneAndUpdate({ $or: orClauses }, { $set: updateDoc }, { new: true, runValidators: true });
    }
    if (!record && updateDoc.ref) {
      const existingDocs = await BcRecord.find().lean();
      const matched = findMatchingBc(updateDoc, req.body, buildBcLookup(existingDocs));
      if (matched) {
        record = await BcRecord.findByIdAndUpdate(matched._id, { $set: updateDoc }, { new: true, runValidators: true });
      } else {
        const toCreate = { ...updateDoc };
        if (!toCreate.id && paramId && !isValidObjectId24(paramId)) toCreate.id = paramId;
        record = await BcRecord.create(toCreate);
      }
    }
    if (!record) return res.status(404).json({ error: 'BC non trouvé' });
    res.json({ bcRecord: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bc/:id — delete by _id, client id, or ref without CastErrors
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const orClauses = [{ id: paramId }, { ref: paramId }];
    if (isValidObjectId24(paramId)) orClauses.unshift({ _id: paramId });
    if (req.query && req.query.ref) orClauses.push({ ref: String(req.query.ref).trim() });
    if (req.body && req.body.ref) orClauses.push({ ref: String(req.body.ref).trim() });

    const result = await BcRecord.deleteMany({ $or: orClauses });
    const remaining = await BcRecord.countDocuments();
    if (remaining === 0) await setManualEmptySetting();
    res.json({ success: true, deleted: result.deletedCount, message: 'BC supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
