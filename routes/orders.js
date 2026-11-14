const router = require('express').Router();
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, department, page, limit: lim } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const pageNum = parseInt(page) || 1;
    const limit = parseInt(lim) || 100;
    const skip = (pageNum - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);

    res.json({ orders, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
router.post('/', authenticate, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdBy: req.user.name || req.user.username
    };
    const order = await Order.create(orderData);
    req.app.get('broadcastSSE')('order_created', { id: order._id, ref: order.ref });
    res.status(201).json({ order });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ce numéro de commande existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    req.app.get('broadcastSSE')('order_updated', { id: order._id, ref: order.ref, status: order.status });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    res.json({ message: 'Commande supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
