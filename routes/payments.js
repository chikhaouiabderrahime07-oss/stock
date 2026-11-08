const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const { authenticate, authorize } = require('../middleware/auth');

function isValidObjectId24(val) {
  return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val) && mongoose.Types.ObjectId.isValid(val);
}

// GET /api/payments
router.get('/', authenticate, async (req, res) => {
  try {
    const records = await Payment.find().sort({ requestDate: -1 }).limit(5000).lean();
    res.json({ payments: records, total: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', authenticate, async (req, res) => {
  try {
    const doc = { ...(req.body || {}) };
    if (!isValidObjectId24(String(doc._id || ''))) delete doc._id;
    const record = await Payment.create(doc);
    res.status(201).json({ payment: record });
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

  if (records && Array.isArray(records) && records.length > 0) {
    const ops = records.map(p => {
      const doc = { ...p };
      delete doc._id;
      delete doc.id;
      const filter = doc.paymentRef ? { paymentRef: doc.paymentRef } : { amount: doc.amount, beneficiary: doc.beneficiary, requestDate: doc.requestDate };
      return {
        updateOne: {
          filter,
          update: { $set: doc },
          upsert: true
        }
      };
    });
    if (ops.length > 0) {
      await Payment.bulkWrite(ops, { ordered: false });
    }
  }

  const saved = await Payment.find().sort({ requestDate: -1 }).lean();
  return { count: saved.length, records: saved };
}

// POST /api/payments/bulk — upsert many
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const payments = Array.isArray(req.body)
      ? req.body
      : (req.body && (Array.isArray(req.body.payments) ? req.body.payments : req.body.records));
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'payments array required' });
    }
    if (payments.length === 0) {
      return res.json({ upserted: 0, modified: 0, matched: 0, total: 0 });
    }
    const ops = payments.map(p => {
      const doc = { ...p };
      delete doc._id;
      delete doc.__v;
      const filter = doc.paymentRef
        ? { paymentRef: doc.paymentRef }
        : (doc.id ? { id: doc.id } : { amount: doc.amount, beneficiary: doc.beneficiary, requestDate: doc.requestDate });
      return {
        updateOne: {
          filter,
          update: { $set: doc },
          upsert: true
        }
      };
    });
    const result = await Payment.bulkWrite(ops, { ordered: false });
    res.json({
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
      total: payments.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const scanDpHandler = async (req, res) => {
  try {
    const inputRecords = req.body && (req.body.records || req.body.payments);
    const result = await scanAndUpsertDps(inputRecords);
    res.json({ success: true, count: result.count, records: result.records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/scan', authenticate, scanDpHandler);
router.scanDpHandler = scanDpHandler;
router.scanAndUpsertDps = scanAndUpsertDps;

// PUT /api/payments/:id — update by _id, client id, or paymentRef without CastErrors
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const updateDoc = { ...(req.body || {}) };
    delete updateDoc._id;
    delete updateDoc.__v;
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
    if (!record) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ payment: record });
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

// DELETE /api/payments/:id — delete by _id, client id, or paymentRef without CastErrors
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const orClauses = [{ id: paramId }, { paymentRef: paramId }];
    if (isValidObjectId24(paramId)) orClauses.unshift({ _id: paramId });
    const result = await Payment.deleteMany({ $or: orClauses });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
