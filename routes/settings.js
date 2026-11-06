const router = require('express').Router();
const Setting = require('../models/Setting');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticate, async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: 'global' }).lean();
    if (!settings) {
      settings = await Setting.create({ key: 'global' });
      settings = settings.toObject();
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.key;
    delete updateData._id;

    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    req.app.get('broadcastSSE')('settings_updated', { timestamp: new Date().toISOString() });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/logo/:position — Upload company logo (left or right)
router.put('/logo/:position', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const { position } = req.params;
    if (!['left', 'right'].includes(position)) {
      return res.status(400).json({ error: 'Position doit être "left" ou "right"' });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image requise (base64)' });
    }

    const field = position === 'left' ? 'companyLogoLeft' : 'companyLogoRight';
    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      { [field]: image },
      { new: true, upsert: true }
    );

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/logo/:position
router.delete('/logo/:position', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const { position } = req.params;
    const field = position === 'left' ? 'companyLogoLeft' : 'companyLogoRight';
    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      { [field]: '' },
      { new: true }
    );
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
