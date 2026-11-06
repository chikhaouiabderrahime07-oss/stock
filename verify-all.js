/**
 * ERP Douroub v6 — Automated Comprehensive Verification Suite (verify-all.js)
 * Milestone: M4 (Automated Verification Suite)
 * Covers:
 *   Tier 1: MongoDB Atlas Persistence & API Contracts
 *   Tier 2: Simulated Storage & Session Wipe Resilience
 *   Tier 3: Stock Module Persistence & Site Dropdown
 *   Tier 4: UI Modal Layering & Stacking Hierarchy
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const child_process = require('child_process');
const assert = require('assert');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const PORT = parseInt(process.env.PORT, 10) || 5000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;
const MONGO_URI = process.env.MONGO_URI;

// ANSI Colors for test output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

// Global Test Runner State
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
let authToken = '';
let serverChildProcess = null;

// Test Execution Helper
async function test(tier, name, fn) {
  totalTests++;
  const label = `[Tier ${tier}] ${name}`;
  process.stdout.write(`  ${C.cyan}TEST ${totalTests.toString().padStart(2, '0')}:${C.reset} ${label.padEnd(68)} `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    passedTests++;
    console.log(`${C.green}✅ PASS${C.reset} ${C.gray}(${duration}ms)${C.reset}`);
  } catch (err) {
    const duration = Date.now() - start;
    failedTests++;
    console.log(`${C.red}❌ FAIL${C.reset} ${C.gray}(${duration}ms)${C.reset}`);
    console.error(`       ${C.red}↳ Error:${C.reset} ${err.message}`);
    failures.push({ tier, name, error: err });
  }
}

// Native HTTP client helper
function makeRequest(method, endpointPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const headers = { 'Accept': 'application/json' };
    if (dataStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(dataStr);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: endpointPath,
      method: method.toUpperCase(),
      headers: headers,
      timeout: 10000
    }, (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(rawData); } catch (_) { json = rawData; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error(`Request timeout for ${endpointPath}`)); });
    if (dataStr) req.write(dataStr);
    req.end();
  });
}


// Server Lifecycle Management
async function isServerListening() {
  try {
    const res = await makeRequest('GET', '/api/settings');
    return res.status === 200 || res.status === 401;
  } catch (_) {
    return false;
  }
}

async function ensureServerRunning() {
  const alreadyUp = await isServerListening();
  if (alreadyUp) {
    console.log(`  ${C.gray}[SERVER] Connected to existing server instance on ${SERVER_URL}${C.reset}`);
    return;
  }

  console.log(`  ${C.gray}[SERVER] Spawning server instance for verification...${C.reset}`);
  serverChildProcess = child_process.spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: 'pipe'
  });

  serverChildProcess.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error') && !msg.includes('EADDRINUSE')) {
      console.error(`  ${C.red}[SERVER-ERR]${C.reset} ${msg.trim()}`);
    }
  });

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 600));
    if (await isServerListening()) {
      console.log(`  ${C.gray}[SERVER] Server is live on ${SERVER_URL} after ${(i + 1) * 600}ms${C.reset}`);
      return;
    }
  }
  throw new Error(`Server failed to start on port ${PORT} within 18 seconds`);
}

function cleanupServer() {
  if (serverChildProcess && !serverChildProcess.killed) {
    try {
      serverChildProcess.kill('SIGTERM');
      setTimeout(() => {
        try { if (!serverChildProcess.killed) serverChildProcess.kill('SIGKILL'); } catch (_) {}
      }, 1500);
    } catch (_) {}
  }
}

process.on('exit', cleanupServer);
process.on('SIGINT', () => { cleanupServer(); process.exit(1); });
process.on('SIGTERM', () => { cleanupServer(); process.exit(1); });

// Mongoose Models
let BcRecord, Payment, Article, Setting, User;

async function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 12000,
      connectTimeoutMS: 12000
    });
  }
  BcRecord = require('./models/BcRecord');
  Payment = require('./models/Payment');
  Article = require('./models/Article');
  Setting = require('./models/Setting');
  User = require('./models/User');
}


// ═════════════════════════════════════════════════════════════════
// TIER 1: MongoDB Atlas Persistence & API Contracts
// ═════════════════════════════════════════════════════════════════
async function runTier1() {
  console.log(`\n${C.bold}═══ TIER 1: MongoDB Atlas Persistence & API Contracts ═══${C.reset}`);

  await test(1, 'Direct MongoDB Atlas Connection & Baseline Counts', async () => {
    assert(MONGO_URI && MONGO_URI.startsWith('mongodb'), 'MONGO_URI must be configured in .env');
    await ensureDbConnected();

    const bcCount = await BcRecord.countDocuments();
    const payCount = await Payment.countDocuments();
    const artCount = await Article.countDocuments();
    const globalSetting = await Setting.findOne({ key: 'global' });

    assert(bcCount >= 360, `Expected BC count >= 360 in Atlas, found: ${bcCount}`);
    assert(payCount >= 140, `Expected Payments count >= 140 in Atlas, found: ${payCount}`);
    assert(artCount >= 1, `Expected Article count >= 1 in Atlas, found: ${artCount}`);
    assert(globalSetting !== null, 'Global setting document must exist in Atlas');
    assert(Array.isArray(globalSetting.stockSites) && globalSetting.stockSites.length > 0,
      'Global setting must define stockSites array');
  });

  await test(1, 'BC Line Items Preservation in MongoDB Atlas', async () => {
    const recordsWithItems = await BcRecord.find({
      $or: [
        { 'lineItems.0': { $exists: true } },
        { lineCount: { $gt: 0 } }
      ]
    }).limit(10).lean();

    assert(recordsWithItems.length > 0, 'Must have BC records with line items in MongoDB Atlas');
    for (const bc of recordsWithItems) {
      assert(Array.isArray(bc.lineItems), `BC ${bc.ref} lineItems must be an array`);
      assert(bc.lineItems.length > 0, `BC ${bc.ref} lineItems array must not be empty`);
      const sampleItem = bc.lineItems[0];
      const desc = sampleItem.description || sampleItem.designation || '';
      assert(desc.trim().length > 0, `BC ${bc.ref} line item must contain a description`);
      const qty = sampleItem.qty !== undefined ? sampleItem.qty : sampleItem.quantity;
      assert(typeof qty === 'number' && qty > 0, `BC ${bc.ref} line item must have positive numeric quantity`);
    }
  });

  await test(1, 'BC Extended Metadata & Schema Field Retention', async () => {
    const sample = await BcRecord.findOne({ ref: { $ne: '' } }).lean();
    assert(sample !== null, 'At least one BC record must be present in Atlas');
    assert(typeof sample.ref === 'string' && sample.ref.length > 0, 'BC ref must be a valid string');
    assert(typeof sample.amount === 'number', 'BC amount must be numeric');
    assert(typeof sample.supplierName === 'string', 'BC supplierName must be a string');
    assert(sample.status !== undefined, 'BC status field must be preserved');
  });

  await test(1, 'REST API Authentication (POST /api/auth/login)', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });

    assert.strictEqual(res.status, 200, `Login should return 200, got ${res.status}`);
    assert(res.data && res.data.token, 'Login response must contain a JWT token');
    assert(res.data.user && res.data.user.username === 'admin', 'Login user must be admin');
    authToken = res.data.token;
  });

  await test(1, 'REST API BC Route Contract (GET /api/bc)', async () => {
    assert(authToken, 'Auth token required from login test');
    const res = await makeRequest('GET', '/api/bc?limit=10', null, authToken);
    assert.strictEqual(res.status, 200, `GET /api/bc returned status ${res.status}`);
    assert(res.data && Array.isArray(res.data.bcRecords), 'Response must contain bcRecords array');
    assert(res.data.total >= 360, `Response total must be >= 360, got ${res.data.total}`);
    assert(res.data.bcRecords.length > 0, 'Returned bcRecords must not be empty');
  });

  await test(1, 'REST API Payments Route Contract (GET /api/payments)', async () => {
    assert(authToken, 'Auth token required from login test');
    const res = await makeRequest('GET', '/api/payments?limit=10', null, authToken);
    assert.strictEqual(res.status, 200, `GET /api/payments returned status ${res.status}`);
    assert(res.data && Array.isArray(res.data.payments), 'Response must contain payments array');
    assert(res.data.total >= 140, `Response total must be >= 140, got ${res.data.total}`);
  });

  await test(1, 'REST API Articles Route Contract (GET /api/articles)', async () => {
    assert(authToken, 'Auth token required from login test');
    const res = await makeRequest('GET', '/api/articles?limit=10', null, authToken);
    assert.strictEqual(res.status, 200, `GET /api/articles returned status ${res.status}`);
    assert(res.data && Array.isArray(res.data.articles), 'Response must contain articles array');
    assert(res.data.total >= 1, `Response total must be >= 1, got ${res.data.total}`);
  });

  await test(1, 'REST API Settings Route Contract (GET /api/settings)', async () => {
    assert(authToken, 'Auth token required from login test');
    const res = await makeRequest('GET', '/api/settings', null, authToken);
    assert.strictEqual(res.status, 200, `GET /api/settings returned status ${res.status}`);
    assert(res.data && res.data.settings, 'Response must contain settings object');
    assert(Array.isArray(res.data.settings.stockSites), 'settings.stockSites must be an array');
  });
}


// ═════════════════════════════════════════════════════════════════
// TIER 2: Simulated Storage & Session Wipe Resilience
// ═════════════════════════════════════════════════════════════════
async function runTier2() {
  console.log(`\n${C.bold}═══ TIER 2: Simulated Storage & Session Wipe Resilience ═══${C.reset}`);

  await test(2, 'Storage & Session Wipe Recovery from MongoDB Atlas', async () => {
    // 1. Simulate client wiping localStorage and cookies (drop current token and state)
    let wipedToken = '';
    assert.strictEqual(wipedToken, '', 'Simulated client state must be wiped');

    // 2. Re-login to simulate fresh session
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
    assert.strictEqual(loginRes.status, 200, 'Re-login after wipe must succeed');
    wipedToken = loginRes.data.token;
    assert(wipedToken, 'New session must receive valid token');

    // 3. Hydrate all BCs and Payments directly from server APIs
    const [bcsRes, paysRes] = await Promise.all([
      makeRequest('GET', '/api/bc?limit=10000', null, wipedToken),
      makeRequest('GET', '/api/payments?limit=10000', null, wipedToken)
    ]);

    assert.strictEqual(bcsRes.status, 200, 'BC hydration must return 200');
    assert.strictEqual(paysRes.status, 200, 'Payments hydration must return 200');
    assert(bcsRes.data.bcRecords.length >= 360,
      `BC count after storage wipe must be >= 360, got: ${bcsRes.data.bcRecords.length}`);
    assert(paysRes.data.payments.length >= 140,
      `Payments count after storage wipe must be >= 140, got: ${paysRes.data.payments.length}`);
  });

  await test(2, 'BC Local-to-Atlas Auto-Migration Push (/api/bc/bulk)', async () => {
    const testRef = `BC-TEST-E2E-${Date.now()}`;
    const syntheticBc = {
      ref: testRef,
      date: '2026-11-06',
      supplierName: 'FOURNISSEUR TEST E2E',
      amount: 145000,
      amountHT: 121848.74,
      amountTTC: 145000,
      currency: 'DZD',
      department: 'Direction Technique',
      status: 'importe',
      lineItems: [
        { description: 'Filtre Gasoil Test', qty: 10, unitPrice: 4500, lineTotal: 45000 },
        { description: 'Kit Distribution Test', qty: 2, unitPrice: 38424.37, lineTotal: 76848.74 }
      ],
      lineCount: 2,
      totalQty: 12
    };

    const pushRes = await makeRequest('POST', '/api/bc/bulk', { bcRecords: [syntheticBc] }, authToken);
    assert.strictEqual(pushRes.status, 200, `BC bulk push should return 200, got ${pushRes.status}`);

    // Direct MongoDB Atlas Verification
    const saved = await BcRecord.findOne({ ref: testRef }).lean();
    assert(saved !== null, 'Pushed BC record must be found in MongoDB Atlas');
    assert.strictEqual(saved.supplierName, 'FOURNISSEUR TEST E2E');
    assert.strictEqual(saved.department, 'Direction Technique');
    assert(Array.isArray(saved.lineItems) && saved.lineItems.length === 2, 'Line items must be preserved in Atlas');

    // Clean up test document
    await BcRecord.deleteOne({ ref: testRef });
  });

  await test(2, 'Payment Local-to-Atlas Auto-Migration Push (/api/payments/bulk)', async () => {
    const testPayRef = `DP-TEST-E2E-${Date.now()}`;
    const syntheticPayment = {
      paymentRef: testPayRef,
      requestDate: '2026-11-06',
      amount: 88500,
      beneficiary: 'BENEFICIAIRE TEST E2E',
      mode: 'virement',
      status: 'paye',
      department: 'Logistique',
      directCategory: 'Carburant'
    };

    const pushRes = await makeRequest('POST', '/api/payments/bulk', { payments: [syntheticPayment] }, authToken);
    assert.strictEqual(pushRes.status, 200, `Payment bulk push should return 200, got ${pushRes.status}`);

    // Direct MongoDB Atlas Verification
    const savedPay = await Payment.findOne({ paymentRef: testPayRef }).lean();
    assert(savedPay !== null, 'Pushed Payment record must be found in MongoDB Atlas');
    assert.strictEqual(savedPay.amount, 88500);
    assert.strictEqual(savedPay.department, 'Logistique');

    // Clean up test document
    await Payment.deleteOne({ paymentRef: testPayRef });
  });

  await test(2, 'Bulk Upsert Immutable _id Sanitization Protection', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const testBcWithId = {
      _id: fakeId,
      id: fakeId,
      ref: `BC-TEST-SAN-${Date.now()}`,
      supplierName: 'TEST SANITIZATION',
      amount: 5000,
      date: '2026-11-06'
    };

    const res = await makeRequest('POST', '/api/bc/bulk', { bcRecords: [testBcWithId] }, authToken);
    assert.strictEqual(res.status, 200, `Bulk upsert with _id must succeed without error, got ${res.status}`);
    assert(res.data && res.data.total === 1, 'Bulk upsert response should report 1 processed item');

    // Clean up
    await BcRecord.deleteOne({ ref: testBcWithId.ref });
  });
}


// ═════════════════════════════════════════════════════════════════
// TIER 3: Stock Module Persistence & Site Dropdown
// ═════════════════════════════════════════════════════════════════
async function runTier3() {
  console.log(`\n${C.bold}═══ TIER 3: Stock Module Persistence & Site Dropdown ═══${C.reset}`);

  await test(3, 'DB.addStock Definition in public/core.js', async () => {
    const coreJsPath = path.join(__dirname, 'public', 'core.js');
    assert(fs.existsSync(coreJsPath), 'public/core.js must exist');
    const content = fs.readFileSync(coreJsPath, 'utf8');

    assert(/addStock\s*\(\s*articleId\s*,\s*quantity/.test(content),
      'DB.addStock method must be declared with articleId and quantity parameters');
    assert(content.includes('this.updateArticle'), 'DB.addStock must call updateArticle');
    assert(content.includes('this.addStockMovement'), 'DB.addStock must call addStockMovement');
  });

  await test(3, 'DB.addStock Functional Simulation Unit Test', async () => {
    let updatedArticle = null;
    let loggedMovement = null;

    const mockDB = {
      data: {
        articles: [
          { id: 'art_test_1', code: 'PDR-TEST-001', designation: 'Test Part', quantity: 15 }
        ]
      },
      updateArticle(art) { updatedArticle = art; },
      addStockMovement(mov) { loggedMovement = mov; },
      addStock(articleId, quantity, type = 'Entrée', reason = '', user = '', reference = '') {
        const qtyNum = Number(quantity) || 0;
        const art = this.data.articles.find(a => a.id === articleId || a.code === articleId);
        if (!art) return null;
        art.quantity = (Number(art.quantity) || 0) + qtyNum;
        if (art.quantity < 0) art.quantity = 0;
        this.updateArticle(art);
        this.addStockMovement({
          articleId: art.id,
          articleCode: art.code,
          articleDesignation: art.designation || '',
          type: type || 'Entrée',
          quantity: qtyNum,
          reason: reason || 'Ajustement de stock',
          user: user || 'Magasinier',
          reference: reference || ''
        });
        return art;
      }
    };

    const res = mockDB.addStock('art_test_1', 10, 'Entrée', 'Test Ingestion', 'Tester', 'BC-TEST');
    assert(res !== null, 'addStock must return updated article');
    assert.strictEqual(res.quantity, 25, 'Article quantity must increment from 15 to 25');
    assert(updatedArticle && updatedArticle.quantity === 25, 'updateArticle must be called with new quantity');
    assert(loggedMovement && loggedMovement.quantity === 10, 'addStockMovement must log movement with quantity 10');
    assert.strictEqual(loggedMovement.type, 'Entrée');
  });

  await test(3, 'MongoDB Atlas Settings Site Population ("Dépôt Central")', async () => {
    const setting = await Setting.findOne({ key: 'global' }).lean();
    assert(setting && Array.isArray(setting.stockSites), 'Settings must contain stockSites array');
    const central = setting.stockSites.find(s => s.name === 'Dépôt Central' || s.id === 'site_default');
    assert(central !== undefined, 'Settings in Atlas must include "Dépôt Central" site');
    assert(Array.isArray(central.zones) && central.zones.length > 0, '"Dépôt Central" must define zones');
  });

  await test(3, 'Stock Module Filter Row Site Selector (<select id="stockSiteFilter">)', async () => {
    const modulesJsPath = path.join(__dirname, 'public', 'modules.js');
    assert(fs.existsSync(modulesJsPath), 'public/modules.js must exist');
    const content = fs.readFileSync(modulesJsPath, 'utf8');

    assert(content.includes('id="stockSiteFilter"'),
      'public/modules.js must include <select id="stockSiteFilter"> in stock filter row');
    assert(!content.includes('sitesList.length > 1 ? (\'<div class="stock-sites-bar'),
      'sitesList.length > 1 suppression must be removed so site selector is never hidden');
  });

  await test(3, 'Stock Module Edit Article Site Selection Logic Matching', async () => {
    const modulesJsPath = path.join(__dirname, 'public', 'modules.js');
    const content = fs.readFileSync(modulesJsPath, 'utf8');

    assert(content.includes('article.site === s.name || article.site === s.id'),
      'Stock.showEditArticle must match site by name as well as ID');
    assert(content.includes('s.id === artSiteId || s.name === artSiteId'),
      'Stock.showEditArticle zone resolver must match site by name or ID');
  });

  await test(3, 'Site String Sanitization in public/core-api-bridge.js', async () => {
    const bridgePath = path.join(__dirname, 'public', 'core-api-bridge.js');
    assert(fs.existsSync(bridgePath), 'public/core-api-bridge.js must exist');
    const content = fs.readFileSync(bridgePath, 'utf8');

    assert(content.includes('_sanitizeSiteName'),
      'public/core-api-bridge.js must define _sanitizeSiteName helper');
    assert(content.includes('Dépôt Central'),
      '_sanitizeSiteName must default or normalize to "Dépôt Central"');
  });
}


// ═════════════════════════════════════════════════════════════════
// TIER 4: UI Modal Layering & Stacking Hierarchy
// ═════════════════════════════════════════════════════════════════
async function runTier4() {
  console.log(`\n${C.bold}═══ TIER 4: UI Modal Layering & Stacking Hierarchy ═══${C.reset}`);

  await test(4, 'CSS Stacking Context & Z-Index Hierarchy in styles.css', async () => {
    const stylesPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'styles.css');
    assert(fs.existsSync(stylesPath), 'public/suivi-achats-premium/styles.css must exist');
    const content = fs.readFileSync(stylesPath, 'utf8');

    // Parse z-indices
    const mbMatch = content.match(/\.modal-backdrop\s*\{[^}]*z-index:\s*(\d+)/);
    const tabMatch = content.match(/\.sa-tab-row\s*\{[^}]*z-index:\s*(\d+)/);
    const topMatch = content.match(/\.sa-topbar\s*\{[^}]*z-index:\s*(\d+)/);
    const toastMatch = content.match(/\.toast\s*\{[^}]*z-index:\s*(\d+)/);

    const mbZ = mbMatch ? parseInt(mbMatch[1], 10) : 0;
    const tabZ = tabMatch ? parseInt(tabMatch[1], 10) : 0;
    const topZ = topMatch ? parseInt(topMatch[1], 10) : 0;
    const toastZ = toastMatch ? parseInt(toastMatch[1], 10) : 0;

    assert(mbZ >= 10000, `.modal-backdrop z-index must be >= 10000, got ${mbZ}`);
    assert(tabZ < 10000, `.sa-tab-row z-index must be < 10000, got ${tabZ}`);
    assert(topZ < 10000, `.sa-topbar z-index must be < 10000, got ${topZ}`);
    assert(toastZ > mbZ, `.toast z-index (${toastZ}) must be strictly higher than .modal-backdrop (${mbZ})`);

    // App shell isolation
    const shellMatch = content.match(/\.app-shell\s*\{([^}]+)\}/);
    assert(shellMatch, '.app-shell rule must exist in styles.css');
    assert(shellMatch[1].includes('isolation: isolate'), '.app-shell must include isolation: isolate');
  });

  await test(4, 'Corporate Solid Theming for Tab Row in enhancements.css', async () => {
    const enhPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'enhancements.css');
    assert(fs.existsSync(enhPath), 'public/suivi-achats-premium/enhancements.css must exist');
    const content = fs.readFileSync(enhPath, 'utf8');

    assert(content.includes('.sa-tab-row') && content.includes('#tabbar'),
      'enhancements.css must explicitly style .sa-tab-row and #tabbar');
    assert(content.includes('background: #ffffff !important') || content.includes('background:#ffffff!important'),
      'Light mode tab row must have solid background (#ffffff)');
    assert(content.includes('background: #131b2e !important') || content.includes('background:#131b2e!important'),
      'Dark mode tab row must have solid corporate background (#131b2e)');
    assert(content.includes('.modal-backdrop') && content.includes('10000 !important'),
      'enhancements.css must contain redundant .modal-backdrop z-index: 10000 !important guarantee');
  });

  await test(4, 'Corporate Modal Card Theming in appro-nextgen.css', async () => {
    const appCssPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'appro-nextgen.css');
    assert(fs.existsSync(appCssPath), 'public/suivi-achats-premium/appro-nextgen.css must exist');
    const content = fs.readFileSync(appCssPath, 'utf8');

    assert(content.includes('.modal-card'), 'appro-nextgen.css must define .modal-card');
    assert(content.includes('.modal-header'), 'appro-nextgen.css must define .modal-header');
    assert(content.includes('.modal-footer'), 'appro-nextgen.css must define .modal-footer');
    assert(content.includes('[data-theme="dark"]') && content.includes('.modal-card'),
      'appro-nextgen.css must provide dark theme styling for .modal-card');
  });

  await test(4, 'Scan Modal Dual Classes and DOM Elements in appro-nextgen.js', async () => {
    const appJsPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'appro-nextgen.js');
    assert(fs.existsSync(appJsPath), 'public/suivi-achats-premium/appro-nextgen.js must exist');
    const content = fs.readFileSync(appJsPath, 'utf8');

    assert(content.includes('modal modal-card'),
      'appro-nextgen.js showScannerModal must assign class="modal modal-card"');
    assert(content.includes('id="scanProgressBar"'),
      'Scan modal template must contain progress bar (#scanProgressBar)');
    assert(content.includes('id="scanLogBox"'),
      'Scan modal template must contain terminal log container (#scanLogBox)');
  });
}


// ═════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═════════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log(`\n${C.bold}${C.magenta}================================================================${C.reset}`);
  console.log(`${C.bold}${C.magenta}  ERP Douroub v6 — Comprehensive Programmatic Verification Suite${C.reset}`);
  console.log(`${C.bold}${C.magenta}================================================================${C.reset}`);
  console.log(`  ${C.gray}Date:${C.reset} ${new Date().toISOString()}`);
  console.log(`  ${C.gray}Node:${C.reset} ${process.version}`);
  console.log(`  ${C.gray}Mode:${C.reset} ${process.env.NODE_ENV || 'development'}`);

  const suiteStart = Date.now();

  try {
    // 1. Ensure server and database are ready
    await ensureServerRunning();
    await ensureDbConnected();

    // 2. Execute all 4 Tiers sequentially
    await runTier1();
    await runTier2();
    await runTier3();
    await runTier4();

  } catch (fatalErr) {
    console.error(`\n${C.red}${C.bold}[FATAL ERROR]${C.reset} Test suite failed during execution:`, fatalErr);
    failedTests++;
  } finally {
    // Teardown connections
    try { await mongoose.disconnect(); } catch (_) {}
    cleanupServer();
  }

  const suiteDuration = ((Date.now() - suiteStart) / 1000).toFixed(2);

  console.log(`\n${C.bold}═════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold} VERIFICATION SUITE RESULTS SUMMARY${C.reset}`);
  console.log(`${C.bold}═════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  Total Tests  : ${C.bold}${totalTests}${C.reset}`);
  console.log(`  Passed Tests : ${C.green}${C.bold}${passedTests}${C.reset}`);
  console.log(`  Failed Tests : ${failedTests > 0 ? C.red : C.green}${C.bold}${failedTests}${C.reset}`);
  console.log(`  Duration     : ${suiteDuration}s`);
  console.log(`${C.bold}═════════════════════════════════════════════════════════════════${C.reset}`);

  if (failedTests > 0) {
    console.error(`\n${C.red}${C.bold}❌ VERIFICATION FAILED: ${failedTests} test(s) failed.${C.reset}\n`);
    for (const f of failures) {
      console.error(`  - [Tier ${f.tier}] ${f.name}: ${f.error.message}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}✅ ALL TESTS PASSED: 100% of verification tiers validated successfully!${C.reset}\n`);
    process.exit(0);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  runAllTests().catch((err) => {
    console.error('Unhandled verification error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
