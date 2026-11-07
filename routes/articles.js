const router = require('express').Router();
const mongoose = require('mongoose');
const Article = require('../models/Article');
const Movement = require('../models/Movement');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/articles
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, family, site, zone, section, page, limit: lim } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { designation: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (family) filter.family = family;
    if (site) filter.site = site;
    if (zone) filter.zone = zone;
    if (section) filter.section = section;

    const pageNum = parseInt(page) || 1;
    const limit = parseInt(lim) || 200;
    const skip = (pageNum - 1) * limit;

    const [articles, total] = await Promise.all([
      Article.find(filter).sort({ designation: 1 }).skip(skip).limit(limit).lean(),
      Article.countDocuments(filter)
    ]);

    res.json({ articles, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    let article;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      article = await Article.findById(req.params.id).lean();
    }
    if (!article) {
      article = await Article.findOne({
        $or: [{ barcode: req.params.id }, { code: req.params.id }]
      }).lean();
    }
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles
router.post('/', authenticate, authorize('superadmin', 'admin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const article = await Article.create(req.body);
    req.app.get('broadcastSSE')('article_created', { id: article._id, code: article.code });
    res.status(201).json({ article });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce code article existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/articles/:id
router.put('/:id', authenticate, authorize('superadmin', 'admin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    req.app.get('broadcastSSE')('article_updated', { id: article._id, code: article.code });
    res.json({ article });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce code article existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/articles/:id
// DELETE /api/articles/all — delete all (superadmin only)
router.delete('/all', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const result = await Article.deleteMany({});
    res.json({ deleted: result.deletedCount, message: 'Tous les articles supprimés' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    req.app.get('broadcastSSE')('article_deleted', { id: article._id });
    res.json({ message: 'Article supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles/bulk — Bulk UPSERT (by code)
router.post('/bulk', authenticate, authorize('superadmin', 'admin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const { articles } = req.body;
    if (!Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ error: 'Tableau d\'articles requis' });
    }
    const ops = articles.map(a => {
      const clean = { ...a };
      delete clean._id;
      delete clean.id;
      delete clean.__v;
      return {
        updateOne: {
          filter: { code: a.code },
          update: { $set: clean },
          upsert: true
        }
      };
    });
    const result = await Article.bulkWrite(ops, { ordered: false });
    res.status(201).json({
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      total: articles.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles/:id/stock — Atomic stock adjustment with concurrency check
router.post('/:id/stock', authenticate, async (req, res) => {
  try {
    const { type, quantity, reason, reference, allowNegative } = req.body;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const delta = type === 'Entrée' ? qty : -qty;
    const isSortie = delta < 0;

    // Resolve the article — accept ObjectId, barcode, or code
    let resolvedId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resolvedId)) {
      const lookup = await Article.findOne({
        $or: [
          { barcode: resolvedId },
          { code: resolvedId }
        ]
      }).lean();
      if (!lookup) {
        return res.status(404).json({ error: 'Article non trouvé (id/code/barcode: ' + resolvedId + ')' });
      }
      resolvedId = lookup._id;
    }

    // For Sortie: guard against negative stock unless allowNegative is true
    const query = { _id: resolvedId };
    if (isSortie && !allowNegative) {
      query.quantity = { $gte: qty };
    }

    const article = await Article.findOneAndUpdate(
      query,
      { $inc: { quantity: delta } },
      { new: true }
    );

    if (!article) {
      const exists = await Article.findById(resolvedId).lean();
      if (!exists) {
        return res.status(404).json({ error: 'Article non trouvé' });
      }
      return res.status(409).json({
        error: 'Stock insuffisant',
        currentQuantity: exists.quantity,
        requested: qty
      });
    }

    // Record movement
    await Movement.create({
      articleId: article._id,
      type: type || 'Ajustement',
      quantity: qty,
      previousQty: article.quantity - delta,
      newQty: article.quantity,
      reason: reason || '',
      reference: reference || '',
      user: req.user.name || req.user.username
    });

    req.app.get('broadcastSSE')('stock_changed', {
      id: article._id,
      code: article.code,
      designation: article.designation,
      quantity: article.quantity,
      type
    });

    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
