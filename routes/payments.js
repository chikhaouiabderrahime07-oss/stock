const router = require('express').Router();
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/auth');

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
    const record = await Payment.create(req.body);
    res.status(201).json({ payment: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/bulk — upsert many
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { payments } = req.body;
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'payments array required' });
    }
    const ops = payments.map(p => ({
      updateOne: {
        filter: { paymentRef: p.paymentRef, amount: p.amount, beneficiary: p.beneficiary },
        update: { $set: p },
        upsert: true
      }
    }));
    const result = await Payment.bulkWrite(ops, { ordered: false });
    res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, total: payments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const record = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ payment: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const record = await Payment.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
