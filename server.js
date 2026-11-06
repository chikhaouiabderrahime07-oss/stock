require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const connectDB = require('./config/db');
const { performBackup } = require('./utils/backup');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust Proxy (required for Render / reverse proxy) ───────────
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ─── Compression ─────────────────────────────────────────────────
app.use(compression());

// ─── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// ─── Body Parsers (50MB limit for base64 images) ─────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Global Rate Limiter ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez plus tard.' }
});
app.use('/api/', globalLimiter);

// ─── SSE Clients for Real-Time Stock Updates ─────────────────────
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('data: {"type":"connected"}\n\n');

  const client = { id: Date.now(), res };
  sseClients.add(client);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

function broadcastSSE(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    client.res.write(`data: ${payload}\n\n`);
  }
}

app.set('broadcastSSE', broadcastSSE);

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/decharges', require('./routes/decharges'));
app.use('/api/fleet', require('./routes/fleet'));
app.use('/api/citernes', require('./routes/citernes'));
app.use('/api/bt', require('./routes/bt'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/bc', require('./routes/bc'));
app.use('/api/payments', require('./routes/payments'));

// ─── Serve Static Frontend ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message
  });
});

// ─── Start Server ────────────────────────────────────────────────
async function startServer() {
  await connectDB();
  console.log('[DB] MongoDB connected');

  // Seed default settings — ensure zones/sites/categories exist
  const Setting = require('./models/Setting');
  const existing = await Setting.findOne({ key: 'global' });
  const defaultZones = [
    { id: 'zone_a', name: 'Zone A', code: 'A', description: 'Zone A - Stock Principal', color: '#2563eb' },
    { id: 'zone_b', name: 'Zone B', code: 'B', description: 'Zone B - Pièces Lourdes & Mécanique', color: '#059669' },
    { id: 'zone_c', name: 'Zone C', code: 'C', description: 'Zone C - Électricité, Filtration & Fluides', color: '#7c3aed' },
    { id: 'zone_d', name: 'Zone D', code: 'D', description: 'Zone D - Consommables & Outillage', color: '#d97706' },
    { id: 'zone_e', name: 'Zone E', code: 'E', description: 'Zone E - Carrosserie & Divers', color: '#dc2626' }
  ];
  const defaultSites = [{
    id: 'site_default', name: 'Dépôt Central', code: 'DC', address: '',
    description: 'Site principal par défaut', color: '#2563eb', isDefault: true,
    zones: [
      { id: 'zone_a', name: 'Zone A', code: 'A', description: 'Stock Principal', color: '#2563eb' },
      { id: 'zone_b', name: 'Zone B', code: 'B', description: 'Pièces Lourdes & Mécanique', color: '#059669' },
      { id: 'zone_c', name: 'Zone C', code: 'C', description: 'Électricité & Filtration', color: '#7c3aed' },
      { id: 'zone_d', name: 'Zone D', code: 'D', description: 'Consommables & Outillage', color: '#d97706' },
      { id: 'zone_e', name: 'Zone E', code: 'E', description: 'Carrosserie & Divers', color: '#dc2626' }
    ]
  }];
  if (!existing) {
    await Setting.create({
      key: 'global',
      stockZones: defaultZones,
      stockSites: defaultSites,
      stockSections: [{ id: 'sec_unique', name: 'Section Unique' }],
      companyName: 'SPA DOUROUB ELDJAZAIR',
      materialFamilies: [
        { id: 'fam_camion', name: 'Camion', icon: 'fa-truck' },
        { id: 'fam_remorque', name: 'Remorque', icon: 'fa-trailer' },
        { id: 'fam_voiture', name: 'Voiture', icon: 'fa-car' },
        { id: 'fam_engin', name: 'Engin', icon: 'fa-tractor' }
      ],
      categoryPrefixes: {
        'Bureautique': 'BUR', 'Pièces de rechange': 'PDR', 'Consommables': 'CSM',
        'Lubrifiant': 'LUB', 'Pneus': 'PNU', 'Filtres': 'FLT', 'Divers': 'DIV'
      }
    });
    console.log('[SEED] Default settings created with zones & sites');
  } else if (!existing.stockSites || existing.stockSites.length === 0) {
    // Fix existing empty settings
    await Setting.findOneAndUpdate({ key: 'global' }, {
      stockZones: defaultZones,
      stockSites: defaultSites,
      stockSections: [{ id: 'sec_unique', name: 'Section Unique' }],
      companyName: existing.companyName || 'SPA DOUROUB ELDJAZAIR'
    });
    console.log('[SEED] Settings updated — added missing zones & sites');
  }

  // Seed default admin if no users exist
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const seedUser = process.env.ADMIN_USERNAME || 'admin';
    const seedPass = process.env.ADMIN_PASSWORD || 'admin123';
    await User.create({
      username: seedUser,
      password: seedPass,
      name: 'Administrateur',
      role: 'superadmin'
    });
    console.log('[SEED] Default admin created');
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] ERP Douroub v6 running on port ${PORT}`);
    console.log(`[ENV] ${process.env.NODE_ENV || 'development'}`);
  });

  // ─── Auto-Backup Cron: Every day at midnight ────────────────
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Starting auto-backup...');
    try {
      await performBackup('auto', 'system');
      console.log('[CRON] Auto-backup completed');
    } catch (err) {
      console.error('[CRON] Auto-backup failed:', err.message);
    }
  }, {
    timezone: 'Africa/Algiers'
  });
  console.log('[CRON] Auto-backup scheduled daily at 00:00 (Africa/Algiers)');
}

startServer().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
