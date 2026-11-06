const router = require('express').Router();
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

// POST /api/bc/bulk — upsert many BC records at once
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { bcRecords } = req.body;
    if (!Array.isArray(bcRecords)) {
      return res.status(400).json({ error: 'bcRecords array required' });
    }
    const ops = bcRecords.map(r => ({
      updateOne: {
        filter: { ref: r.ref, date: r.date, supplierName: r.supplierName },
        update: { $set: r },
        upsert: true
      }
    }));
    const result = await BcRecord.bulkWrite(ops, { ordered: false });
    res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, total: bcRecords.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
