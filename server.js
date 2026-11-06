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

  // Seed default settings if none exist
  const Setting = require('./models/Setting');
  const existing = await Setting.findOne({ key: 'global' });
  if (!existing) {
    await Setting.create({ key: 'global' });
    console.log('[SEED] Default settings created');
  }

  // Seed default admin if no users exist
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({
      username: 'admin',
      password: 'admin123',
      name: 'Administrateur',
      role: 'superadmin'
    });
    console.log('[SEED] Default admin created (admin / admin123)');
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
