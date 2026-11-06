const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const BcRecord = require('../models/BcRecord');
const { authenticate } = require('../middleware/auth');

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

// POST /api/bc — create one BC record
router.post('/', authenticate, async (req, res) => {
  try {
    const record = await BcRecord.create(req.body);
    res.status(201).json({ bcRecord: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Function to scan and upsert BC records
async function scanAndUpsertBcs(recordsToUpsert) {
  let records = recordsToUpsert;
  if (!records || !Array.isArray(records) || records.length === 0) {
    const candidates = [
      path.join(__dirname, '..', 'data', 'extracted_bcs_linked.json'),
      path.join(__dirname, '..', '..', 'data', 'extracted_bcs_linked.json'),
      path.join(__dirname, '..', 'data', 'extracted_bcs.json'),
      path.join(__dirname, '..', '..', 'data', 'extracted_bcs.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (Array.isArray(raw) && raw.length > 0) {
            records = raw;
            break;
          }
        } catch (e) {
          console.warn('[BC-SCAN] Candidate error:', p, e.message);
        }
      }
    }
  }

  if (records && Array.isArray(records) && records.length > 0) {
    const ops = records.map(r => {
      const doc = { ...r };
      delete doc._id;
      delete doc.id;
      const filter = doc.ref ? { ref: doc.ref } : { date: doc.date, supplierName: doc.supplierName, amount: doc.amount };
      return {
        updateOne: {
          filter,
          update: { $set: doc },
          upsert: true
        }
      };
    });
    if (ops.length > 0) {
      await BcRecord.bulkWrite(ops, { ordered: false });
    }
  }

  const saved = await BcRecord.find().sort({ date: -1 }).lean();
  return { count: saved.length, records: saved };
}

// POST /api/bc/bulk — upsert many BC records at once
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { bcRecords } = req.body;
    if (!Array.isArray(bcRecords)) {
      return res.status(400).json({ error: 'bcRecords array required' });
    }
    if (bcRecords.length === 0) {
      return res.json({ upserted: 0, modified: 0, matched: 0, total: 0 });
    }
    const ops = bcRecords.map(r => {
      const doc = { ...r };
      delete doc._id;
      delete doc.id;
      const filter = doc.ref ? { ref: doc.ref } : { date: doc.date, supplierName: doc.supplierName, amount: doc.amount };
      return {
        updateOne: {
          filter,
          update: { $set: doc },
          upsert: true
        }
      };
    });
    const result = await BcRecord.bulkWrite(ops, { ordered: false });
    res.json({
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
      total: bcRecords.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const scanBcHandler = async (req, res) => {
  try {
    const inputRecords = req.body && (req.body.records || req.body.bcRecords);
    const result = await scanAndUpsertBcs(inputRecords);
    res.json({ success: true, count: result.count, records: result.records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/scan', authenticate, scanBcHandler);
router.scanBcHandler = scanBcHandler;
router.scanAndUpsertBcs = scanAndUpsertBcs;

// PUT /api/bc/:id — update a BC record
router.put('/:id', authenticate, async (req, res) => {
  try {
    const record = await BcRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: 'BC non trouvé' });
    res.json({ bcRecord: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bc/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const record = await BcRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'BC non trouvé' });
    res.json({ message: 'BC supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bc — delete all
router.delete('/', authenticate, async (req, res) => {
  try {
    const result = await BcRecord.deleteMany({});
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
