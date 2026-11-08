const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'erp-douroub-secret-key-change-me';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      service: user.service,
      canDeductStock: user.canDeductStock,
      gdsOption: user.gdsOption
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticate, authorize, generateToken, JWT_SECRET };
