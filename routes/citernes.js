const router = require('express').Router();
const Citerne = require('../models/Citerne');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/citernes
router.get('/', authenticate, async (req, res) => {
  try {
    const citernes = await Citerne.find().sort({ name: 1 }).lean();
    res.json({ citernes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/citernes/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const citerne = await Citerne.findById(req.params.id).lean();
    if (!citerne) return res.status(404).json({ error: 'Citerne non trouvée' });
    res.json({ citerne });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citernes
router.post('/', authenticate, authorize('superadmin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const citerne = await Citerne.create(req.body);
    res.status(201).json({ citerne });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/citernes/:id
router.put('/:id', authenticate, authorize('superadmin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const citerne = await Citerne.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!citerne) return res.status(404).json({ error: 'Citerne non trouvée' });
    res.json({ citerne });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citernes/:id/delivery — Add fuel delivery
router.post('/:id/delivery', authenticate, async (req, res) => {
  try {
    const { quantity, naftalBonRef, driver, pricePerLiter, notes } = req.body;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const citerne = await Citerne.findById(req.params.id);
    if (!citerne) return res.status(404).json({ error: 'Citerne non trouvée' });

    if (citerne.currentLevel + qty > citerne.capacity) {
      return res.status(400).json({
        error: 'Dépassement de capacité',
        currentLevel: citerne.currentLevel,
        capacity: citerne.capacity,
        maxAddable: citerne.capacity - citerne.currentLevel
      });
    }

    citerne.deliveries.push({ quantity: qty, naftalBonRef, driver, pricePerLiter, notes });
    citerne.currentLevel += qty;
    await citerne.save();

    res.json({ citerne });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citernes/:id/distribution — Record fuel distribution
router.post('/:id/distribution', authenticate, async (req, res) => {
  try {
    const { vehicleId, vehicleName, quantity, km, driver, bon, notes } = req.body;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const citerne = await Citerne.findById(req.params.id);
    if (!citerne) return res.status(404).json({ error: 'Citerne non trouvée' });

    if (citerne.currentLevel < qty) {
      return res.status(409).json({
        error: 'Niveau insuffisant',
        currentLevel: citerne.currentLevel,
        requested: qty
      });
    }

    citerne.distributions.push({ vehicleId, vehicleName, quantity: qty, km, driver, bon, notes });
    citerne.currentLevel -= qty;
    await citerne.save();

    res.json({ citerne });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/citernes/:id
router.delete('/:id', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const citerne = await Citerne.findByIdAndDelete(req.params.id);
    if (!citerne) return res.status(404).json({ error: 'Citerne non trouvée' });
    res.json({ message: 'Citerne supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
