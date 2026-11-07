const router = require('express').Router();
const BonTravail = require('../models/BonTravail');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/bt
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, vehicleId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (vehicleId) filter.vehicleId = vehicleId;

    const bons = await BonTravail.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ bons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bt/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bon = await BonTravail.findById(req.params.id).lean();
    if (!bon) return res.status(404).json({ error: 'Bon de travail non trouvé' });
    res.json({ bon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bt
router.post('/', authenticate, async (req, res) => {
  try {
    const bonData = {
      ...req.body,
      createdBy: req.user.name || req.user.username
    };
    const bon = await BonTravail.create(bonData);
    res.status(201).json({ bon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce numéro de bon existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bt/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const bon = await BonTravail.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!bon) return res.status(404).json({ error: 'Bon de travail non trouvé' });
    res.json({ bon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bt/:id/close
router.put('/:id/close', authenticate, async (req, res) => {
  try {
    const bon = await BonTravail.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        closedAt: new Date(),
        closedBy: req.user.name || req.user.username,
        ...req.body
      },
      { new: true }
    );
    if (!bon) return res.status(404).json({ error: 'Bon de travail non trouvé' });
    res.json({ bon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bt/all — Wipe all BT history
router.delete('/all', async (req, res) => {
  try {
    const result = await BonTravail.deleteMany({});
    res.json({ message: 'Historique des bons de travail vidé avec succès', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bt/:id
router.delete('/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    let bon = null;
    if (targetId.match(/^[0-9a-fA-F]{24}$/)) {
      bon = await BonTravail.findByIdAndDelete(targetId);
    }
    if (!bon) {
      bon = await BonTravail.findOneAndDelete({ $or: [{ ref: targetId }, { id: targetId }] });
    }
    if (!bon) return res.status(404).json({ error: 'Bon de travail non trouvé' });
    res.json({ message: 'Bon de travail supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
