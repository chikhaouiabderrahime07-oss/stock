const router = require('express').Router();
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
    const article = await Article.findById(req.params.id).lean();
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

// POST /api/articles/bulk
router.post('/bulk', authenticate, authorize('superadmin', 'admin', 'directeur', 'magasinier'), async (req, res) => {
  try {
    const { articles } = req.body;
    if (!Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ error: 'Tableau d\'articles requis' });
    }
    const result = await Article.insertMany(articles, { ordered: false }).catch(err => {
      return { insertedCount: err.insertedDocs ? err.insertedDocs.length : 0, errors: err.writeErrors };
    });
    res.status(201).json({ inserted: Array.isArray(result) ? result.length : result.insertedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles/:id/stock — Atomic stock adjustment with concurrency check
router.post('/:id/stock', authenticate, async (req, res) => {
  try {
    const { type, quantity, reason, reference } = req.body;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const delta = type === 'Entrée' ? qty : -qty;

    // Atomic findOneAndUpdate with $inc — first-come-first-served
    const article = await Article.findOneAndUpdate(
      {
        _id: req.params.id,
        ...(delta < 0 ? { quantity: { $gte: qty } } : {})
      },
      { $inc: { quantity: delta } },
      { new: true }
    );

    if (!article) {
      // Check if article exists to give proper error
      const exists = await Article.findById(req.params.id).lean();
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
