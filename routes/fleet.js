const router = require('express').Router();
const Fleet = require('../models/Fleet');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/fleet
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { matricule: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    const vehicles = await Fleet.find(filter).sort({ matricule: 1 }).lean();
    res.json({ vehicles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fleet/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Fleet.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });
    res.json({ vehicle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fleet
router.post('/', authenticate, authorize('superadmin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const vehicle = await Fleet.create(req.body);
    res.status(201).json({ vehicle });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce matricule existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fleet/:id
router.put('/:id', authenticate, authorize('superadmin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const vehicle = await Fleet.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });
    res.json({ vehicle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fleet/:id
router.delete('/:id', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const vehicle = await Fleet.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });
    res.json({ message: 'Véhicule supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
