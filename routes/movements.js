const router = require('express').Router();
const Movement = require('../models/Movement');
const { authenticate } = require('../middleware/auth');

// GET /api/movements
router.get('/', authenticate, async (req, res) => {
  try {
    const { articleId, type, user, startDate, endDate, page, limit: lim } = req.query;
    const filter = {};

    if (articleId) filter.articleId = articleId;
    if (type) filter.type = type;
    if (user) filter.user = { $regex: user, $options: 'i' };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page) || 1;
    const limit = parseInt(lim) || 100;
    const skip = (pageNum - 1) * limit;

    const [movements, total] = await Promise.all([
      Movement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Movement.countDocuments(filter)
    ]);

    res.json({ movements, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
