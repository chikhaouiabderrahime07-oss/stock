const router = require('express').Router();
const { performBackup, getBackups, deleteOldBackups } = require('../utils/backup');
const Backup = require('../models/Backup');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/backup — List backups
router.get('/', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const backups = await getBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup — Trigger manual backup
router.post('/', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const backup = await performBackup('manual', req.user.name || req.user.username);
    res.status(201).json({
      message: 'Sauvegarde effectuée avec succès',
      backup: {
        _id: backup._id,
        date: backup.date,
        type: backup.type,
        sizeBytes: backup.sizeBytes,
        status: backup.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/:id — Download a backup
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id).lean();
    if (!backup) return res.status(404).json({ error: 'Sauvegarde non trouvée' });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition',
      `attachment; filename="backup_${backup.date.toISOString().split('T')[0]}.json"`);
    res.json(backup.collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backup/:id
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const backup = await Backup.findByIdAndDelete(req.params.id);
    if (!backup) return res.status(404).json({ error: 'Sauvegarde non trouvée' });
    res.json({ message: 'Sauvegarde supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/cleanup — Delete old backups
router.post('/cleanup', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const deleted = await deleteOldBackups();
    res.json({ message: `${deleted} anciennes sauvegardes supprimées` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
