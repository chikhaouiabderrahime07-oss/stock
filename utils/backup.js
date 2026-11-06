const Backup = require('../models/Backup');
const Article = require('../models/Article');
const User = require('../models/User');
const Order = require('../models/Order');
const Decharge = require('../models/Decharge');
const Movement = require('../models/Movement');
const Fleet = require('../models/Fleet');
const Citerne = require('../models/Citerne');
const BonTravail = require('../models/BonTravail');
const Setting = require('../models/Setting');

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;

async function performBackup(type = 'auto', createdBy = 'system') {
  console.log(`[BACKUP] Starting ${type} backup by ${createdBy}...`);

  const backup = new Backup({
    date: new Date(),
    type,
    status: 'in_progress',
    createdBy
  });

  try {
    const [articles, users, orders, decharges, movements, fleet, citernes, bonsTravail, settings] =
      await Promise.all([
        Article.find().lean(),
        User.find().select('-password').lean(),
        Order.find().lean(),
        Decharge.find().lean(),
        Movement.find().lean(),
        Fleet.find().lean(),
        Citerne.find().lean(),
        BonTravail.find().lean(),
        Setting.find().lean()
      ]);

    backup.collections = {
      articles,
      users,
      orders,
      decharges,
      movements,
      fleet,
      citernes,
      bonsTravail,
      settings
    };

    const jsonStr = JSON.stringify(backup.collections);
    backup.sizeBytes = Buffer.byteLength(jsonStr, 'utf8');
    backup.status = 'completed';
    await backup.save();

    console.log(
      `[BACKUP] Completed: ${(backup.sizeBytes / 1024).toFixed(1)}KB | ` +
      `Articles: ${articles.length}, Users: ${users.length}, ` +
      `Orders: ${orders.length}, Movements: ${movements.length}`
    );

    // Auto-cleanup old backups
    await deleteOldBackups();

    return backup;
  } catch (err) {
    backup.status = 'failed';
    backup.error = err.message;
    await backup.save().catch(() => {});
    console.error('[BACKUP] Failed:', err.message);
    throw err;
  }
}

async function getBackups() {
  return Backup.find()
    .select('-collections')
    .sort({ date: -1 })
    .limit(60)
    .lean();
}

async function deleteOldBackups() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const result = await Backup.deleteMany({
    date: { $lt: cutoff },
    type: 'auto'
  });

  if (result.deletedCount > 0) {
    console.log(`[BACKUP] Cleaned up ${result.deletedCount} old auto-backups (older than ${RETENTION_DAYS} days)`);
  }

  return result.deletedCount;
}

module.exports = { performBackup, getBackups, deleteOldBackups };
