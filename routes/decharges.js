const router = require('express').Router();
const Decharge = require('../models/Decharge');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/decharges
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, status, page, limit: lim } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const pageNum = parseInt(page) || 1;
    const limit = parseInt(lim) || 100;
    const skip = (pageNum - 1) * limit;

    const [decharges, total] = await Promise.all([
      Decharge.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Decharge.countDocuments(filter)
    ]);

    res.json({ decharges, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decharges/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const decharge = await Decharge.findById(req.params.id).lean();
    if (!decharge) return res.status(404).json({ error: 'Décharge non trouvée' });
    res.json({ decharge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/decharges
router.post('/', authenticate, async (req, res) => {
  try {
    const decharge = await Decharge.create(req.body);
    req.app.get('broadcastSSE')('decharge_created', { id: decharge._id, ref: decharge.ref });
    res.status(201).json({ decharge });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce numéro de décharge existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/decharges/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const decharge = await Decharge.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!decharge) return res.status(404).json({ error: 'Décharge non trouvée' });
    res.json({ decharge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/decharges/:id
router.delete('/:id', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const decharge = await Decharge.findByIdAndDelete(req.params.id);
    if (!decharge) return res.status(404).json({ error: 'Décharge non trouvée' });
    res.json({ message: 'Décharge supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
