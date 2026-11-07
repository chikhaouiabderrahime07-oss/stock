const router = require('express').Router();
const User = require('../models/User');
const { authenticate, authorize, generateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives (5 max). Réessayez dans 30 minutes.', remaining: 0 }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
    if (!user) {
      const remaining = parseInt(res.getHeader('RateLimit-Remaining')) || 0;
      return res.status(401).json({ error: 'Identifiants incorrects', remaining });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const remaining = parseInt(res.getHeader('RateLimit-Remaining')) || 0;
      return res.status(401).json({ error: 'Identifiants incorrects', remaining });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: user.toPublic()
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, authorize('superadmin', 'directeur'), async (req, res) => {
  try {
    const { username, password, name, role, department, service, canDeductStock, gdsOption, defaultModule } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà' });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      name,
      role: role || 'magasinier',
      department: department || '',
      service: service || '',
      canDeductStock: canDeductStock !== undefined ? canDeductStock : true,
      gdsOption: gdsOption || false,
      defaultModule: defaultModule || 'stock'
    });

    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map(u => u.toPublic()) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authenticate, authorize('superadmin', 'admin', 'directeur'), async (req, res) => {
  try {
    const { name, role, department, service, canDeductStock, gdsOption, password, defaultModule } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (department !== undefined) user.department = department;
    if (service !== undefined) user.service = service;
    if (canDeductStock !== undefined) user.canDeductStock = canDeductStock;
    if (gdsOption !== undefined) user.gdsOption = gdsOption;
    if (defaultModule !== undefined) user.defaultModule = defaultModule;
    if (password) user.password = password;

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/auth/users/:id (superadmin only)
router.delete('/users/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
