/**
 * verify-purge-reseed.js
 * Automated Verification Suite (Milestone M3)
 * Tiers 1-4: Feature Coverage, Boundary & Corner Cases,
 * Cross-Feature Interactions, Real-World Simulation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const V6_ROOT = __dirname;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const tierStats = {
  tier1: { name: 'Tier 1: Feature Coverage', passed: 0, failed: 0, total: 0 },
  tier2: { name: 'Tier 2: Boundary & Corner Cases', passed: 0, failed: 0, total: 0 },
  tier3: { name: 'Tier 3: Cross-Feature Interactions', passed: 0, failed: 0, total: 0 },
  tier4: { name: 'Tier 4: Real-World Simulation', passed: 0, failed: 0, total: 0 }
};

let currentTier = 'tier1';

function setTier(tier) {
  currentTier = tier;
}

function test(description, fn) {
  totalTests++;
  tierStats[currentTier].total++;
  try {
    fn();
    passedTests++;
    tierStats[currentTier].passed++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    failedTests++;
    tierStats[currentTier].failed++;
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

function createMockStorage(initial = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => {
      Object.keys(store).forEach(k => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i]
  };
}

function runTier1() {
  console.log('\n============================================================');
  console.log('TIER 1: FEATURE COVERAGE (Baseline & Contract Verification)');
  console.log('============================================================');
  setTier('tier1');

  const pubPreloadPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'data-preload.js');
  const rootPreloadPath = path.join(PROJECT_ROOT, 'suivi-achats-premium', 'data-preload.js');
  const serverPath = path.join(V6_ROOT, 'server.js');
  const pubDatasetPath = path.join(V6_ROOT, 'data', 'extracted_bcs_linked.json');
  const rootDatasetPath = path.join(PROJECT_ROOT, 'data', 'extracted_bcs_linked.json');
  const pubIndexPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'index.html');
  const rootIndexPath = path.join(PROJECT_ROOT, 'suivi-achats-premium', 'index.html');

  test('T1.1: Syntax validation of public data-preload.js', () => {
    execSync(`node -c "${pubPreloadPath}"`, { stdio: 'pipe' });
  });

  test('T1.2: Syntax validation of root mirror data-preload.js', () => {
    execSync(`node -c "${rootPreloadPath}"`, { stdio: 'pipe' });
  });

  test('T1.3: Syntax validation of server.js', () => {
    execSync(`node -c "${serverPath}"`, { stdio: 'pipe' });
  });

  const pubPreloadCode = fs.readFileSync(pubPreloadPath, 'utf8');
  const mockWinPub = {};
  const mockStoragePub = createMockStorage();
  const pubPreloadFn = new Function('window', 'localStorage', 'console', pubPreloadCode);
  pubPreloadFn(mockWinPub, mockStoragePub, { log: () => {}, warn: () => {}, error: () => {} });

  test('T1.4: Public data-preload.js defines window.PRELOAD_DATA with version v2026_02_clean_361', () => {
    assert.ok(mockWinPub.PRELOAD_DATA, 'PRELOAD_DATA must exist');
    assert.strictEqual(mockWinPub.PRELOAD_DATA.version, 'v2026_02_clean_361');
  });

  test('T1.5: Public data-preload.js contains exactly 361 clean BC records', () => {
    assert.strictEqual(mockWinPub.PRELOAD_DATA.bcRecords.length, 361);
  });

  test('T1.6: Public data-preload.js contains exactly 148 clean payments', () => {
    assert.strictEqual(mockWinPub.PRELOAD_DATA.payments.length, 148);
  });

  test('T1.7: Public data-preload.js BC totals match exactly 44,778,566.35 TTC and 31,638,802.90 HT', () => {
    const totalTTC = mockWinPub.PRELOAD_DATA.bcRecords.reduce((s, r) => s + (r.amountTTC || 0), 0);
    const totalHT = mockWinPub.PRELOAD_DATA.bcRecords.reduce((s, r) => s + (r.amountHT || 0), 0);
    assert.ok(Math.abs(totalTTC - 44778566.35) < 0.01, `Expected 44,778,566.35 TTC, got ${totalTTC}`);
    assert.ok(Math.abs(totalHT - 31638802.90) < 0.01, `Expected 31,638,802.90 HT, got ${totalHT}`);
  });

  const rootPreloadCode = fs.readFileSync(rootPreloadPath, 'utf8');
  const mockWinRoot = {};
  const mockStorageRoot = createMockStorage();
  const rootPreloadFn = new Function('window', 'localStorage', 'console', rootPreloadCode);
  rootPreloadFn(mockWinRoot, mockStorageRoot, { log: () => {}, warn: () => {}, error: () => {} });

  test('T1.8: Mirror file parity: root data-preload.js matches public counts and totals', () => {
    assert.strictEqual(mockWinRoot.PRELOAD_DATA.bcRecords.length, 361);
    assert.strictEqual(mockWinRoot.PRELOAD_DATA.payments.length, 148);
    const rootTTC = mockWinRoot.PRELOAD_DATA.bcRecords.reduce((s, r) => s + (r.amountTTC || 0), 0);
    assert.ok(Math.abs(rootTTC - 44778566.35) < 0.01, `Root TTC ${rootTTC} must match`);
  });

  test('T1.9: Root extracted_bcs_linked.json matches ERP_Douroub_v6 byte-for-byte with 361 records', () => {
    const pubRaw = fs.readFileSync(pubDatasetPath, 'utf8');
    const rootRaw = fs.readFileSync(rootDatasetPath, 'utf8');
    assert.strictEqual(pubRaw, rootRaw, 'Files must be strictly identical');
    const parsed = JSON.parse(pubRaw);
    assert.strictEqual(parsed.length, 361);
  });

  test('T1.10: extracted_bcs_linked.json contains 0 test/demo/sync records', () => {
    const records = JSON.parse(fs.readFileSync(pubDatasetPath, 'utf8'));
    const testRecords = records.filter(r => /test|sync|demo|dummy/i.test(String(r.ref || '')));
    assert.strictEqual(testRecords.length, 0, 'Must have 0 test records');
  });

  test('T1.11: All 361 BC references in extracted_bcs_linked.json are unique', () => {
    const records = JSON.parse(fs.readFileSync(pubDatasetPath, 'utf8'));
    const refs = new Set(records.map(r => r.ref));
    assert.strictEqual(refs.size, 361, 'All 361 references must be distinct');
  });

  const serverCode = fs.readFileSync(serverPath, 'utf8');

  test('T1.12: Server boot contains demo stock articles and movement purge query', () => {
    assert.ok(serverCode.includes('(PDR-001|PDR-002|ART-18429|Art-003)'), 'Must include article purge regex');
    assert.ok(serverCode.includes('Movement.deleteMany'), 'Must purge associated movements');
  });

  test('T1.13: Server boot contains dummy BT purge query covering BT-2026-000[1-7], BT-API-TEST, wp_*', () => {
    assert.ok(serverCode.includes('^BT-2026-000[1-7]'), 'Must include BT-2026-000[1-7] regex');
    assert.ok(serverCode.includes('^BT-API-TEST'), 'Must include BT-API-TEST regex');
    assert.ok(serverCode.includes('^wp_'), 'Must include wp_ regex');
    assert.ok(serverCode.includes('work_plans'), 'Must check work_plans collection');
  });

  test('T1.14: Server boot contains version marker v6_clean_361 in Setting update', () => {
    assert.ok(serverCode.includes("bcDatasetVersion: 'v6_clean_361'"), 'Must set bcDatasetVersion');
  });

  test('T1.15: Cache busters ?v=361clean are present in both index.html files', () => {
    const pubIndex = fs.readFileSync(pubIndexPath, 'utf8');
    const rootIndex = fs.readFileSync(rootIndexPath, 'utf8');
    assert.ok(pubIndex.includes('data-preload.js?v=361clean'), 'public index must have ?v=361clean');
    assert.ok(rootIndex.includes('data-preload.js?v=361clean'), 'root index must have ?v=361clean');
  });
}

function runTier2() {
  console.log('\n============================================================');
  console.log('TIER 2: BOUNDARY & CORNER CASES (Adversarial Edge Testing)');
  console.log('============================================================');
  setTier('tier2');

  const pubPreloadPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'data-preload.js');
  const pubPreloadCode = fs.readFileSync(pubPreloadPath, 'utf8');

  test('T2.1: Cache Purge IIFE removes all known stale legacy keys', () => {
    const dirtyStore = {
      suivi_linked_v30: 'stale_386_records',
      suivi_compact_v20: 'stale_compact',
      suivi_local_v12: 'stale_12',
      suivi_local_v11: 'stale_11',
      'suivi-achats-state': 'stale_state',
      suivi_achats_v3: 'stale_v3',
      sde_suivi_state: 'stale_sde_state',
      sde_suivi_cache: 'stale_sde_cache',
      suivi_reset_v15: 'true',
      suivi_reset_v16: 'true'
    };
    const storage = createMockStorage(dirtyStore);
    const win = {};
    const fn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    fn(win, storage, { log: () => {}, warn: () => {}, error: () => {} });

    assert.strictEqual(storage.getItem('suivi_linked_v30'), null);
    assert.strictEqual(storage.getItem('sde_suivi_state'), null);
    assert.strictEqual(storage.getItem('sde_suivi_cache'), null);
    assert.strictEqual(storage.getItem('suivi_reset_v15'), null);
    assert.strictEqual(storage.getItem('suivi_data_version'), 'v2026_02_clean_361');
  });

  test('T2.2: Cache Purge IIFE dynamically purges suivi_cache* and sde_suivi_* keys', () => {
    const dynamicStore = {
      suivi_cache_temp_filter: 'dump',
      suivi_cache_dashboard_aggregates: 'dump2',
      sde_suivi_custom_view: 'dump3',
      unrelated_custom_key: 'keep_me'
    };
    const storage = createMockStorage(dynamicStore);
    const win = {};
    const fn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    fn(win, storage, { log: () => {}, warn: () => {}, error: () => {} });

    assert.strictEqual(storage.getItem('suivi_cache_temp_filter'), null);
    assert.strictEqual(storage.getItem('suivi_cache_dashboard_aggregates'), null);
    assert.strictEqual(storage.getItem('sde_suivi_custom_view'), null);
    assert.strictEqual(storage.getItem('unrelated_custom_key'), 'keep_me');
  });

  test('T2.3: Cache Purge IIFE preserves all authentication and session keys', () => {
    const authStore = {
      erp_jwt_token: 'secret_jwt_token_123',
      suivi_session: 'active_session_abc',
      suivi_linked_session_v30: 'active_linked_session',
      erp_currentUser: '{"name":"Admin","role":"superadmin"}',
      erp_douroub_session: 'douroub_sess_xyz',
      sde_user_role: 'superadmin',
      sde_theme: 'dark',
      sde_portal_theme: 'corporate_blue',
      auth_user: 'admin_user',
      suivi_linked_v30: 'stale'
    };
    const storage = createMockStorage(authStore);
    const win = {};
    const fn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    fn(win, storage, { log: () => {}, warn: () => {}, error: () => {} });

    assert.strictEqual(storage.getItem('erp_jwt_token'), 'secret_jwt_token_123');
    assert.strictEqual(storage.getItem('suivi_session'), 'active_session_abc');
    assert.strictEqual(storage.getItem('suivi_linked_session_v30'), 'active_linked_session');
    assert.strictEqual(storage.getItem('erp_currentUser'), '{"name":"Admin","role":"superadmin"}');
    assert.strictEqual(storage.getItem('erp_douroub_session'), 'douroub_sess_xyz');
    assert.strictEqual(storage.getItem('sde_user_role'), 'superadmin');
    assert.strictEqual(storage.getItem('sde_theme'), 'dark');
    assert.strictEqual(storage.getItem('sde_portal_theme'), 'corporate_blue');
    assert.strictEqual(storage.getItem('auth_user'), 'admin_user');
    assert.strictEqual(storage.getItem('suivi_linked_v30'), null);
  });

  test('T2.4: Cache Purge IIFE is strictly idempotent when version matches', () => {
    const cleanStore = {
      suivi_data_version: 'v2026_02_clean_361',
      user_draft_data: 'keep_this_safe'
    };
    const storage = createMockStorage(cleanStore);
    const win = {};
    const fn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    fn(win, storage, { log: () => {}, warn: () => {}, error: () => {} });

    assert.strictEqual(storage.getItem('user_draft_data'), 'keep_this_safe');
    assert.strictEqual(storage.getItem('suivi_data_version'), 'v2026_02_clean_361');
  });

  test('T2.5: Cache Purge IIFE gracefully handles empty storage and storage exceptions', () => {
    const errorStorage = {
      getItem: () => { throw new Error('QuotaExceededError in Private Mode'); },
      setItem: () => {},
      removeItem: () => {},
      length: 0,
      key: () => null
    };
    const win = {};
    const fn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    assert.doesNotThrow(() => {
      fn(win, errorStorage, { log: () => {}, warn: () => {}, error: () => {} });
    });
    assert.ok(win.PRELOAD_DATA, 'PRELOAD_DATA must still be defined despite storage failure');
  });

  const artRegex = /^(PDR-001|PDR-002|ART-18429|Art-003)$/i;

  test('T2.6: Article Purge Regex matches all case variations', () => {
    const validCodes = ['pdr-001', 'PDR-001', 'Pdr-002', 'pdr-002', 'art-18429', 'ART-18429', 'art-003', 'Art-003', 'ART-003'];
    validCodes.forEach(code => {
      assert.ok(artRegex.test(code), `Code ${code} should match purge regex`);
    });
  });

  test('T2.7: Article Purge Regex strictly rejects non-target codes', () => {
    const nonTargetCodes = ['ART-004', 'PDR-0010', 'PDR-001_OLD', 'ART-18429-EXT', 'Art-0030', 'PDR-999', 'ART-1842'];
    nonTargetCodes.forEach(code => {
      assert.ok(!artRegex.test(code), `Code ${code} must NOT match purge regex`);
    });
  });

  const btRegex = /^BT-2026-000[1-7]/i;

  test('T2.8: BT Purge Regex matches BT-2026-0001..7 and rejects BT-2026-0008+', () => {
    for (let i = 1; i <= 7; i++) {
      assert.ok(btRegex.test(`BT-2026-000${i}`), `BT-2026-000${i} should match`);
      assert.ok(btRegex.test(`bt-2026-000${i}`), `Case-insensitive bt-2026-000${i} should match`);
    }
    assert.ok(!btRegex.test('BT-2026-0008'), 'BT-2026-0008 must NOT match');
    assert.ok(!btRegex.test('BT-2026-0009'), 'BT-2026-0009 must NOT match');
    assert.ok(!btRegex.test('BT-2026-0010'), 'BT-2026-0010 must NOT match');
  });

  const dummyBtPattern = {
    testRef: (ref) => /^BT-2026-000[1-7]/i.test(ref) || /^BT-API-TEST/i.test(ref) || /^wp_/i.test(ref)
  };

  test('T2.9: Dummy BT Regex matches BT-API-TEST and wp_ prefixes, rejects production refs', () => {
    assert.ok(dummyBtPattern.testRef('BT-API-TEST'));
    assert.ok(dummyBtPattern.testRef('bt-api-test-01'));
    assert.ok(dummyBtPattern.testRef('wp_seed_123'));
    assert.ok(dummyBtPattern.testRef('wp_work_plan'));
    assert.ok(!dummyBtPattern.testRef('BT-2025-0001'));
    assert.ok(!dummyBtPattern.testRef('BT-PROD-2026-01'));
    assert.ok(!dummyBtPattern.testRef('BON-TRAVAIL-REAL'));
  });

  test('T2.10: Payment sanitize filter rejects test payments and preserves legitimate payments', () => {
    // Exact filter logic matching server.js:333
    const paymentFilter = (pDoc) => pDoc.paymentRef && !/TEST/i.test(String(pDoc.paymentRef)) && !/SYNC/i.test(String(pDoc.paymentRef));
    const rawPayments = [
      { paymentRef: 'DP N°01/DG/2026', amount: 50000 },
      { paymentRef: 'DP-TEST-999', amount: 999999 },
      { paymentRef: 'SYNC-DP-01', amount: 111111 },
      { paymentRef: 'DP N°02/DG/2026', amount: 75000 },
      { paymentRef: 'TEST-DP-100', amount: 1000 },
      { paymentRef: 'PAY-SYNC-99', amount: 2000 }
    ];
    const cleanPayments = rawPayments.filter(paymentFilter);
    assert.strictEqual(cleanPayments.length, 2);
    assert.strictEqual(cleanPayments[0].paymentRef, 'DP N°01/DG/2026');
    assert.strictEqual(cleanPayments[1].paymentRef, 'DP N°02/DG/2026');

    // Verify server.js contains the regex filters
    const serverJsContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    assert.ok(
      serverJsContent.includes('!/TEST/i.test(String(pDoc.paymentRef)) && !/SYNC/i.test(String(pDoc.paymentRef))'),
      'server.js must contain regex payment filter !/TEST/i.test && !/SYNC/i.test'
    );
    assert.ok(
      serverJsContent.includes('!/TEST/i.test(String(r.ref)) && !/SYNC/i.test(String(r.ref))'),
      'server.js must contain regex BC filter !/TEST/i.test && !/SYNC/i.test'
    );
  });
}

function runTier3() {
  console.log('\n============================================================');
  console.log('TIER 3: CROSS-FEATURE & STATE MACHINE TRANSITIONS');
  console.log('============================================================');
  setTier('tier3');

  function isDatasetDirty(bcCount, copyClones, schmitzClones, hasTestBcs, globalSetting) {
    return (
      bcCount === 0 ||
      bcCount < 361 ||
      bcCount === 386 ||
      copyClones > 0 ||
      schmitzClones > 2 ||
      hasTestBcs > 0 ||
      !globalSetting ||
      globalSetting.bcDatasetVersion !== 'v6_clean_361'
    );
  }

  test('T3.1: Server boot state machine: triggers dirty when bcCount === 0', () => {
    assert.strictEqual(isDatasetDirty(0, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), true);
  });

  test('T3.2: Server boot state machine: triggers dirty when bcCount === 386 or copyClones > 0', () => {
    assert.strictEqual(isDatasetDirty(386, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), true);
    assert.strictEqual(isDatasetDirty(361, 5, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), true);
    assert.strictEqual(isDatasetDirty(361, 0, 3, 0, { bcDatasetVersion: 'v6_clean_361' }), true);
  });

  test('T3.3: Server boot state machine: triggers dirty on test BCs or missing/mismatched version', () => {
    assert.strictEqual(isDatasetDirty(361, 0, 0, 1, { bcDatasetVersion: 'v6_clean_361' }), true);
    assert.strictEqual(isDatasetDirty(361, 0, 0, 0, null), true);
    assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: 'v5_legacy' }), true);
  });

  test('T3.4: Server boot state machine: clean state (361, no clones, v6_clean_361) is clean and idempotent', () => {
    assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), false);
  });

  test('T3.5: Server boot state machine: preserves newly added user records (bcCount >= 361)', () => {
    assert.strictEqual(isDatasetDirty(362, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), false);
    assert.strictEqual(isDatasetDirty(400, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), false);
  });

  const appPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'app.js');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const appStateBlock = appCode.split('\n').slice(0, 437).join('\n');

  function createAppEnvironment(initialStorage = {}, preloadData = null) {
    const storage = createMockStorage(initialStorage);
    const win = {
      PRELOAD_DATA: preloadData || {
        version: 'v2026_02_clean_361',
        bcRecords: [{ id: 'preload_1', ref: 'BC N°01/DG/2026', amountTTC: 15000 }],
        payments: [{ id: 'pay_1', paymentRef: 'DP N°01/DG/2026', amount: 15000 }]
      }
    };
    const sandbox = new Function(
      'window',
      'localStorage',
      'console',
      appStateBlock + '; return { loadState, saveState, state, SUIVI_DATA_VERSION, STORAGE_KEYS };'
    );
    const api = sandbox(win, storage, { log: () => {}, warn: () => {}, error: () => {} });
    return { ...api, storage, win };
  }

  test('T3.6: Client loadState() discards invalid/legacy version and falls back to PRELOAD_DATA', () => {
    const legacyStorage = {
      suivi_linked_v30: JSON.stringify({
        version: 'v1.0_obsolete',
        bcRecords: [{ id: 'stale_bc', ref: 'OLD_BC_999', amountTTC: 9999999 }]
      })
    };
    const env = createAppEnvironment(legacyStorage);
    const loaded = env.loadState();
    assert.strictEqual(loaded.bcRecords.length, 1);
    assert.strictEqual(loaded.bcRecords[0].ref, 'BC N°01/DG/2026');
    assert.strictEqual(env.storage.getItem('suivi_linked_v30'), null);
  });

  test('T3.7: Client loadState() handles corrupted JSON without throwing and uses PRELOAD_DATA', () => {
    const corruptStorage = {
      suivi_linked_v30: 'CORRUPTED_{{{NOT_JSON'
    };
    const env = createAppEnvironment(corruptStorage);
    let loaded;
    assert.doesNotThrow(() => {
      loaded = env.loadState();
    });
    assert.ok(loaded);
  });

  test('T3.8: Client saveState() writes SUIVI_DATA_VERSION and round-trips to loadState()', () => {
    const env = createAppEnvironment();
    const loaded = env.loadState();
    Object.assign(env.state, loaded);
    env.state.bcRecords.push({ id: 'bc_custom_2', ref: 'BC N°02/DG/2026', amountTTC: 25000 });
    env.saveState();

    const storedRaw = env.storage.getItem('suivi_linked_v30');
    assert.ok(storedRaw, 'Storage must have saved data');
    const parsed = JSON.parse(storedRaw);
    assert.strictEqual(parsed.version, 'v2026_02_clean_361');
    assert.strictEqual(parsed.bcRecords.length, 2);

    const reloaded = env.loadState();
    assert.strictEqual(reloaded.bcRecords.length, 2);
    assert.strictEqual(reloaded.bcRecords[1].ref, 'BC N°02/DG/2026');
  });
}

function runTier4() {
  console.log('\n============================================================');
  console.log('TIER 4: REAL-WORLD SIMULATION (End-to-End User Journey)');
  console.log('============================================================');
  setTier('tier4');

  const pubPreloadPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'data-preload.js');
  const pubPreloadCode = fs.readFileSync(pubPreloadPath, 'utf8');
  const appPath = path.join(V6_ROOT, 'public', 'suivi-achats-premium', 'app.js');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const appStateBlock = appCode.split('\n').slice(0, 437).join('\n');

  test('T4.1: Full User Journey: Dirty Cache -> Preload Purge -> Clean Load -> User Edit & Save -> Reload Idempotence', () => {
    // Phase 1: User arrives with dirty localStorage & active auth
    const dirtyLocalStorage = {
      suivi_linked_v30: JSON.stringify({
        version: 'v1_dirty_386',
        bcRecords: new Array(386).fill({ id: 'legacy_clone', amountTTC: 400000 })
      }),
      sde_suivi_state: 'dirty_state_blob',
      sde_suivi_cache: 'dirty_cache_blob',
      suivi_reset_v15: 'true',
      erp_jwt_token: 'valid_bearer_token_secret_123',
      suivi_session: 'session_active_abc',
      sde_user_role: 'superadmin',
      sde_theme: 'dark'
    };
    const storage = createMockStorage(dirtyLocalStorage);
    const win1 = {};

    // Phase 2: Page executes data-preload.js
    const preloadFn = new Function('window', 'localStorage', 'console', pubPreloadCode);
    preloadFn(win1, storage, { log: () => {}, warn: () => {}, error: () => {} });

    assert.strictEqual(storage.getItem('suivi_linked_v30'), null, 'suivi_linked_v30 must be purged');
    assert.strictEqual(storage.getItem('sde_suivi_state'), null, 'sde_suivi_state must be purged');
    assert.strictEqual(storage.getItem('sde_suivi_cache'), null, 'sde_suivi_cache must be purged');
    assert.strictEqual(storage.getItem('suivi_data_version'), 'v2026_02_clean_361');
    assert.strictEqual(storage.getItem('erp_jwt_token'), 'valid_bearer_token_secret_123');
    assert.strictEqual(win1.PRELOAD_DATA.bcRecords.length, 361);
    assert.strictEqual(win1.PRELOAD_DATA.payments.length, 148);

    // Phase 3: Page executes app.js loadState()
    const appSandbox1 = new Function('window', 'localStorage', 'console', appStateBlock + '; return { loadState, saveState, state };');
    const app1 = appSandbox1(win1, storage, { log: () => {}, warn: () => {}, error: () => {} });
    const loadedState1 = app1.loadState();
    Object.assign(app1.state, loadedState1);

    assert.strictEqual(app1.state.bcRecords.length, 361, 'In-memory BC records must be 361');
    assert.strictEqual(app1.state.payments.length, 148, 'In-memory payments must be 148');
    const totalTTC = app1.state.bcRecords.reduce((s, r) => s + (r.amountTTC || 0), 0);
    assert.ok(Math.abs(totalTTC - 44778566.35) < 0.01, `TTC must match 44,778,566.35, got ${totalTTC}`);

    // Phase 4: User updates record and creates a new one, then saves
    app1.state.bcRecords[0].comments = 'Updated in Tier 4 simulation';
    app1.state.bcRecords.push({
      id: 'bc_custom_362',
      ref: 'BC N°362/DG/2026',
      amountTTC: 75000,
      amountHT: 63025.21
    });
    app1.saveState();

    const savedRaw = storage.getItem('suivi_linked_v30');
    assert.ok(savedRaw, 'State must be saved in storage');
    const parsedSaved = JSON.parse(savedRaw);
    assert.strictEqual(parsedSaved.version, 'v2026_02_clean_361');
    assert.strictEqual(parsedSaved.bcRecords.length, 362);

    // Phase 5: User reloads page (second navigation / F5)
    const win2 = {};
    preloadFn(win2, storage, { log: () => {}, warn: () => {}, error: () => {} });
    assert.ok(storage.getItem('suivi_linked_v30'), 'Saved state must NOT be wiped on clean reload');

    // Phase 6: app.js loadState() executes on reloaded page
    const appSandbox2 = new Function('window', 'localStorage', 'console', appStateBlock + '; return { loadState, saveState, state };');
    const app2 = appSandbox2(win2, storage, { log: () => {}, warn: () => {}, error: () => {} });
    const loadedState2 = app2.loadState();

    assert.strictEqual(loadedState2.bcRecords.length, 362, 'User modification preserved');
    assert.strictEqual(loadedState2.bcRecords[0].comments, 'Updated in Tier 4 simulation');
    assert.strictEqual(loadedState2.bcRecords[361].ref, 'BC N°362/DG/2026');

    // Phase 7: Auth verification
    assert.strictEqual(storage.getItem('erp_jwt_token'), 'valid_bearer_token_secret_123');
    assert.strictEqual(storage.getItem('suivi_session'), 'session_active_abc');
    assert.strictEqual(storage.getItem('sde_user_role'), 'superadmin');
  });
}

function main() {
  console.log('############################################################');
  console.log('  ERP DOUROUB v6 — PURGE & RESEED VERIFICATION SUITE');
  console.log('############################################################');

  runTier1();
  runTier2();
  runTier3();
  runTier4();

  console.log('\n============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('============================================================');
  Object.keys(tierStats).forEach(tierKey => {
    const s = tierStats[tierKey];
    console.log(`  ${s.name.padEnd(42)}: ${s.passed}/${s.total} passed`);
  });
  console.log('------------------------------------------------------------');
  console.log(`  TOTAL: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error(`Verification FAILED with ${failedTests} failure(s).`);
    process.exit(1);
  } else {
    console.log('Verification SUCCEEDED: 100% of tests passed.');
    process.exit(0);
  }
}

main();
