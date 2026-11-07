/**
 * ERP_Douroub_v6 — Adversarial Client Stress Testing Suite
 * Challenger 1: Empirical verification of client cache purge, storage edge cases,
 * auth preservation, corrupted localStorage payloads, rapid reloads, and preload integrity.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' — ' + details : ''}`);
    failCount++;
    failures.push({ testName, details });
  }
}

console.log('############################################################');
console.log('  ERP DOUROUB v6 — ADVERSARIAL CLIENT STRESS TEST SUITE');
console.log('############################################################\n');

// Load target source files
const preloadPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'data-preload.js');
const preloadSource = fs.readFileSync(preloadPath, 'utf8');

const appPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

const enhancementsPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'app-enhancements.js');
const enhancementsSource = fs.readFileSync(enhancementsPath, 'utf8');

const rootPreloadPath = path.join(__dirname, '..', 'suivi-achats-premium', 'data-preload.js');
const rootPreloadSource = fs.readFileSync(rootPreloadPath, 'utf8');

// Helper to create a fully featured MockLocalStorage
function createMockStorage(initialData = {}) {
  const store = new Map();
  for (const [k, v] of Object.entries(initialData)) {
    store.set(k, String(v));
  }
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    key(i) {
      const keys = Array.from(store.keys());
      return keys[i] !== undefined ? keys[i] : null;
    },
    get length() { return store.size; },
    _dump() { return Object.fromEntries(store); }
  };
}

// Slice app.js up to loadSession() to get state, loadState, saveState, normalizers cleanly
const appCoreSlice = appSource.slice(0, appSource.indexOf('function loadSession()'));

// Build a sandboxed runtime for app.js loadState testing
function runLoadStateInSandbox(localStorageMock, preloadObj) {
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    localStorage: localStorageMock,
    sessionStorage: createMockStorage(),
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    },
    window: { PRELOAD_DATA: preloadObj },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
  };

  vm.createContext(ctx);
  vm.runInContext(appCoreSlice, ctx);
  return vm.runInContext('loadState()', ctx);
}

// Get canonical PRELOAD_DATA by evaluating data-preload.js
function getPreloadData() {
  const ctx = {
    window: {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    localStorage: createMockStorage()
  };
  vm.createContext(ctx);
  vm.runInContext(preloadSource, ctx);
  return ctx.window.PRELOAD_DATA;
}

const canonicalPreload = getPreloadData();

// =========================================================================
// SECTION 1: CORRUPTED JSON IN LOCALSTORAGE & PAYLOAD EDGE CASES
// =========================================================================
console.log('============================================================');
console.log('SECTION 1: CORRUPTED JSON PAYLOADS & STORAGE EDGE CASES');
console.log('============================================================');

// T1.1: Truncated JSON string in suivi_linked_v30
{
  const mockStorage = createMockStorage({
    suivi_linked_v30: '{"version":"v2026_02_clean_361","bcRecords":[{"id":"bc_1","ref":'
  });
  let stateResult = null;
  let threw = false;
  try {
    stateResult = runLoadStateInSandbox(mockStorage, canonicalPreload);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'T1.1: Truncated JSON in suivi_linked_v30 does not throw fatal error');
  assert(stateResult && typeof stateResult === 'object', 'T1.1: State object returned gracefully');
}

// T1.2: Empty string in suivi_linked_v30
{
  const mockStorage = createMockStorage({ suivi_linked_v30: '' });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.2: Empty string in storage falls back to clean 361 preloaded BCs');
  assert(res.payments.length === 148, 'T1.2: Empty string in storage falls back to clean 148 preloaded payments');
}

// T1.3: Primitive number in suivi_linked_v30
{
  const mockStorage = createMockStorage({ suivi_linked_v30: '987654321' });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.3: Primitive number JSON falls back to 361 clean records');
}

// T1.4: Primitive boolean "true" in suivi_linked_v30
{
  const mockStorage = createMockStorage({ suivi_linked_v30: 'true' });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.4: Primitive boolean JSON falls back to 361 clean records');
}

// T1.5: Array JSON instead of object in suivi_linked_v30
{
  const mockStorage = createMockStorage({ suivi_linked_v30: '[{"ref":"BC TEST","amount":100}]' });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.5: Array JSON payload triggers version mismatch & falls back to 361 records');
}

// T1.6: Valid JSON version match but bcRecords is corrupted non-array
{
  const mockStorage = createMockStorage({
    suivi_linked_v30: JSON.stringify({
      version: 'v2026_02_clean_361',
      bcRecords: 'CORRUPTED_NOT_AN_ARRAY',
      payments: null
    })
  });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.6: Non-array bcRecords in matching version safely falls back to 361 records');
  assert(res.payments.length === 148, 'T1.6: Null payments in matching version safely falls back to 148 payments');
}

// T1.7: Valid JSON version match but bcRecords is empty array []
{
  const mockStorage = createMockStorage({
    suivi_linked_v30: JSON.stringify({
      version: 'v2026_02_clean_361',
      bcRecords: [],
      payments: []
    })
  });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 361, 'T1.7: Empty bcRecords array in storage falls back to 361 preloaded records');
  assert(res.payments.length === 148, 'T1.7: Empty payments array in storage falls back to 148 preloaded payments');
}

// T1.8: Malformed individual record normalization
{
  const mockStorage = createMockStorage({
    suivi_linked_v30: JSON.stringify({
      version: 'v2026_02_clean_361',
      bcRecords: [
        { id: null, ref: null, amount: 'invalid-nan', amountHT: undefined, lineItems: null },
        { id: 'ok_1', ref: 'BC N°100/DG/2026', amount: 5000 }
      ]
    })
  });
  const res = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(res.bcRecords.length === 2, 'T1.8: Malformed records normalized without throwing');
  assert(res.bcRecords[0].amount === 0, 'T1.8: NaN amount normalized to 0');
  assert(Array.isArray(res.bcRecords[0].lineItems), 'T1.8: Missing lineItems normalized to empty array');
}

// =========================================================================
// SECTION 2: MASSIVE STORAGE FLOOD & WILDCARD PURGE STRESS
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 2: MASSIVE STORAGE FLOOD & DYNAMIC WILDCARD PURGE');
console.log('============================================================');

// Helper to run the purge IIFE isolated from data-preload.js
function runPurgeIIFE(storageMock) {
  const ctx = {
    window: {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    localStorage: storageMock
  };
  vm.createContext(ctx);
  vm.runInContext(preloadSource, ctx);
  return ctx;
}

// T2.1: Flood storage with 2,000 keys and execute purge
{
  const mockStorage = createMockStorage();

  // 1. Add 500 sde_suivi_* keys
  for (let i = 0; i < 500; i++) {
    mockStorage.setItem(`sde_suivi_item_${i}`, `value_${i}`);
  }
  // 2. Add 500 suivi_cache* keys
  for (let i = 0; i < 500; i++) {
    mockStorage.setItem(`suivi_cache_token_${i}`, `cache_${i}`);
  }
  // 3. Add 10 stale legacy keys
  const staleList = [
    'suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12', 'suivi_local_v11',
    'suivi-achats-state', 'suivi_achats_v3', 'sde_suivi_state', 'sde_suivi_cache',
    'suivi_reset_v15', 'suivi_reset_v16'
  ];
  staleList.forEach(k => mockStorage.setItem(k, 'stale_legacy_data'));

  // 4. Add 9 legitimate auth & portal keys
  const authKeys = {
    'erp_jwt_token': 'jwt_secure_token_xyz',
    'suivi_session': '{"user":"appro","role":"procurement"}',
    'suivi_linked_session_v30': 'session_v30_val',
    'erp_currentUser': '{"id":"usr_01","name":"Abdou"}',
    'erp_douroub_session': 'active_session_456',
    'sde_user_role': 'admin',
    'sde_theme': 'dark',
    'sde_portal_theme': 'light',
    'auth_user': 'chikhaoui'
  };
  for (const [k, v] of Object.entries(authKeys)) {
    mockStorage.setItem(k, v);
  }

  // 5. Add 981 arbitrary external keys (e.g. portal apps, settings)
  for (let i = 0; i < 981; i++) {
    mockStorage.setItem(`custom_app_key_${i}`, `data_${i}`);
  }

  const initialCount = mockStorage.length;
  assert(initialCount === 2000, `T2.1: Storage initialized with exactly 2000 keys (got ${initialCount})`);

  const t0 = Date.now();
  runPurgeIIFE(mockStorage);
  const duration = Date.now() - t0;

  // Verify all sde_suivi_* are removed
  let remainingSdeSuivi = 0;
  let remainingSuiviCache = 0;
  for (let i = 0; i < mockStorage.length; i++) {
    const k = mockStorage.key(i);
    if (k && k.indexOf('sde_suivi_') === 0) remainingSdeSuivi++;
    if (k && k.indexOf('suivi_cache') === 0) remainingSuiviCache++;
  }
  assert(remainingSdeSuivi === 0, `T2.1: All 500 sde_suivi_* keys purged (0 remaining)`);
  assert(remainingSuiviCache === 0, `T2.1: All 500 suivi_cache* keys purged (0 remaining)`);

  // Verify stale keys are removed
  let remainingStale = 0;
  staleList.forEach(k => { if (mockStorage.getItem(k) !== null) remainingStale++; });
  assert(remainingStale === 0, `T2.1: All 10 legacy stale keys purged (0 remaining)`);

  // Verify all 9 auth keys are 100% intact
  let authPreserved = true;
  for (const [k, v] of Object.entries(authKeys)) {
    if (mockStorage.getItem(k) !== v) {
      authPreserved = false;
      break;
    }
  }
  assert(authPreserved, 'T2.1: All 9 authentication and portal keys preserved with exact values');

  // Verify arbitrary non-suivi keys remain intact
  assert(mockStorage.getItem('custom_app_key_0') === 'data_0', 'T2.1: Non-suivi custom keys preserved');
  assert(mockStorage.getItem('custom_app_key_980') === 'data_980', 'T2.1: Non-suivi custom keys preserved up to max index');

  // Verify version marker set
  assert(mockStorage.getItem('suivi_data_version') === 'v2026_02_clean_361', 'T2.1: suivi_data_version marker successfully set');
  assert(duration < 150, `T2.1: Massive purge completed swiftly (${duration}ms < 150ms)`);
}

// =========================================================================
// SECTION 3: AUTH PRESERVATION UNDER HOSTILE & ADJACENT KEY NAMES
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 3: AUTH PRESERVATION & HOSTILE KEY COLLISION');
console.log('============================================================');

// T3.1: Hostile key collision matrix
{
  const mockStorage = createMockStorage({
    // Legitimate auth keys (MUST PRESERVE)
    'erp_jwt_token': 'VALID_JWT',
    'suivi_session': 'VALID_SESSION',
    'suivi_linked_session_v30': 'VALID_LINKED_SESSION',
    'erp_currentUser': 'VALID_USER',
    'erp_douroub_session': 'VALID_DOUROUB_SESSION',
    'sde_user_role': 'VALID_ROLE',
    'sde_theme': 'dark',
    'sde_portal_theme': 'light',
    'auth_user': 'VALID_AUTH_USER',

    // Adjacent / decoy key names (NON-SUIVI -> MUST PRESERVE)
    'erp_jwt_token_backup': 'DECOY_1',
    'suivi_session_temp': 'DECOY_2',
    'fake_auth': 'DECOY_3',
    'erp_token': 'DECOY_4',

    // Hostile / decoy keys matching target prefixes (MUST PURGE)
    'sde_suivi_token_fake': 'HOSTILE_1',
    'suivi_cache_auth_dump': 'HOSTILE_2',
    'sde_suivi_session_spoof': 'HOSTILE_3',
    'suivi_cache_anything': 'HOSTILE_4'
  });

  runPurgeIIFE(mockStorage);

  // Legitimate auth keys
  assert(mockStorage.getItem('erp_jwt_token') === 'VALID_JWT', 'T3.1: erp_jwt_token preserved');
  assert(mockStorage.getItem('suivi_session') === 'VALID_SESSION', 'T3.1: suivi_session preserved');
  assert(mockStorage.getItem('sde_user_role') === 'VALID_ROLE', 'T3.1: sde_user_role preserved');
  assert(mockStorage.getItem('auth_user') === 'VALID_AUTH_USER', 'T3.1: auth_user preserved');

  // Decoy non-suivi keys
  assert(mockStorage.getItem('erp_jwt_token_backup') === 'DECOY_1', 'T3.1: erp_jwt_token_backup preserved (not matched by purge)');
  assert(mockStorage.getItem('suivi_session_temp') === 'DECOY_2', 'T3.1: suivi_session_temp preserved (not matched by purge)');
  assert(mockStorage.getItem('fake_auth') === 'DECOY_3', 'T3.1: fake_auth preserved');

  // Targeted prefixes
  assert(mockStorage.getItem('sde_suivi_token_fake') === null, 'T3.1: sde_suivi_token_fake purged via sde_suivi_ wildcard');
  assert(mockStorage.getItem('suivi_cache_auth_dump') === null, 'T3.1: suivi_cache_auth_dump purged via suivi_cache wildcard');
  assert(mockStorage.getItem('sde_suivi_session_spoof') === null, 'T3.1: sde_suivi_session_spoof purged via sde_suivi_ wildcard');
}

// =========================================================================
// SECTION 4: EXTREME RAPID RELOADS & STATE REHYDRATION
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 4: RAPID RELOADS & STATE REHYDRATION LIFECYCLE');
console.log('============================================================');

// T4.1: 5-step Lifecycle Simulation (Dirty -> Purge -> Clean Load -> Edit & Save -> Reload Idempotence)
{
  const mockStorage = createMockStorage({
    suivi_linked_v30: JSON.stringify({
      version: 'v2025_legacy_dirty',
      bcRecords: Array.from({ length: 386 }, (_, i) => ({ id: `dirty_${i}`, ref: `BC OLD ${i}` })),
      payments: []
    }),
    erp_jwt_token: 'LIVE_ACTIVE_JWT'
  });

  // Step 1: Cold start
  runPurgeIIFE(mockStorage);
  assert(mockStorage.getItem('suivi_linked_v30') === null, 'T4.1 Step 1: Dirty legacy cache purged from storage');
  assert(mockStorage.getItem('suivi_data_version') === 'v2026_02_clean_361', 'T4.1 Step 1: Clean version stamped');
  assert(mockStorage.getItem('erp_jwt_token') === 'LIVE_ACTIVE_JWT', 'T4.1 Step 1: JWT intact');

  // Step 2: app.js loads initial state
  const state1 = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(state1.bcRecords.length === 361, `T4.1 Step 2: app.js loaded clean 361 BC records (got ${state1.bcRecords.length})`);
  assert(state1.payments.length === 148, `T4.1 Step 2: app.js loaded clean 148 payments (got ${state1.payments.length})`);

  // Step 3: User adds 5 new BCs (#362 to #366) and triggers saveState()
  for (let i = 1; i <= 5; i++) {
    state1.bcRecords.push({
      id: `bc_user_new_${i}`,
      ref: `BC N°${361 + i}/DG/2026`,
      supplierName: `NOUVEAU FOURNISSEUR ${i}`,
      amount: 10000 * i,
      amountHT: 8400 * i,
      amountTTC: 10000 * i,
      status: 'en_cours',
      date: '2026-02-07',
      lineItems: []
    });
  }
  assert(state1.bcRecords.length === 366, 'T4.1 Step 3: 5 user records added to state (total 366)');

  // saveState() simulation
  mockStorage.setItem('suivi_linked_v30', JSON.stringify({
    version: 'v2026_02_clean_361',
    bcRecords: state1.bcRecords,
    payments: state1.payments,
    settings: {},
    users: []
  }));

  // Step 4: Rapid reload (page refreshed)
  // Purge runs again on reload:
  runPurgeIIFE(mockStorage);
  // Because version matches 'v2026_02_clean_361', purge must NOT remove suivi_linked_v30!
  assert(mockStorage.getItem('suivi_linked_v30') !== null, 'T4.1 Step 4: Purge skipped on warm reload with matching version');

  // Step 5: app.js loads rehydrated state
  const state2 = runLoadStateInSandbox(mockStorage, canonicalPreload);
  assert(state2.bcRecords.length === 366, `T4.1 Step 5: User-added records preserved after refresh (got ${state2.bcRecords.length} == 366)`);
  assert(state2.bcRecords[365].ref === 'BC N°366/DG/2026', 'T4.1 Step 5: 366th record reference intact');
}

// T4.2: 100 Consecutive Rapid Reloads in a Tight Loop
{
  const mockStorage = createMockStorage();
  let loopError = null;
  const tStart = Date.now();
  for (let i = 0; i < 100; i++) {
    try {
      runPurgeIIFE(mockStorage);
      const st = runLoadStateInSandbox(mockStorage, canonicalPreload);
      if (st.bcRecords.length !== 361) {
        throw new Error(`Iteration ${i}: Expected 361 records, got ${st.bcRecords.length}`);
      }
    } catch (err) {
      loopError = err;
      break;
    }
  }
  const loopDuration = Date.now() - tStart;
  assert(!loopError, `T4.2: 100 consecutive rapid boots completed without error (${loopDuration}ms)`);
}

// =========================================================================
// SECTION 5: HOSTILE BROWSER STORAGE EXCEPTIONS (QUOTA, PRIVATE BROWSING)
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 5: HOSTILE BROWSER STORAGE EXCEPTIONS');
console.log('============================================================');

// T5.1: localStorage.getItem throws SecurityError (Private browsing restricted)
{
  const throwingStorage = {
    getItem() { throw new Error('SecurityError: The operation is insecure.'); },
    setItem() { throw new Error('SecurityError: The operation is insecure.'); },
    removeItem() { throw new Error('SecurityError: The operation is insecure.'); },
    key() { throw new Error('SecurityError: The operation is insecure.'); },
    length: 0
  };
  let purgeThrew = false;
  try {
    runPurgeIIFE(throwingStorage);
  } catch (e) {
    purgeThrew = true;
  }
  assert(!purgeThrew, 'T5.1: Purge IIFE handles SecurityError without unhandled exception');
}

// T5.2: localStorage.setItem throws QuotaExceededError
{
  const quotaStorage = createMockStorage();
  quotaStorage.setItem = (k, v) => {
    throw new Error('QuotaExceededError: DOM Exception 22');
  };
  let quotaThrew = false;
  try {
    runPurgeIIFE(quotaStorage);
  } catch (e) {
    quotaThrew = true;
  }
  assert(!quotaThrew, 'T5.2: Purge IIFE handles QuotaExceededError gracefully without crash');
}

// T5.3: localStorage is completely undefined (Headless SSR environment)
{
  const ctx = {
    window: {},
    console: { log: () => {}, warn: () => {}, error: () => {} }
    // Note: no localStorage defined
  };
  vm.createContext(ctx);
  let ssrThrew = false;
  try {
    vm.runInContext(preloadSource, ctx);
  } catch (e) {
    ssrThrew = true;
  }
  assert(!ssrThrew, 'T5.3: Preload script runs cleanly when localStorage is undefined');
  assert(ctx.window.PRELOAD_DATA && ctx.window.PRELOAD_DATA.bcRecords.length === 361, 'T5.3: PRELOAD_DATA defined even without localStorage');
}

// =========================================================================
// SECTION 6: PRELOAD DATASET INTEGRITY, IMMUTABILITY & PROTOTYPE POLLUTION
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 6: PRELOAD INTEGRITY, IMMUTABILITY & DEEP POLLUTION');
console.log('============================================================');

// T6.1: Strict record count and financial totals of PRELOAD_DATA
{
  const bcs = canonicalPreload.bcRecords;
  const dps = canonicalPreload.payments;
  assert(Array.isArray(bcs) && bcs.length === 361, `T6.1: PRELOAD_DATA has exactly 361 BC records (got ${bcs.length})`);
  assert(Array.isArray(dps) && dps.length === 148, `T6.1: PRELOAD_DATA has exactly 148 payments (got ${dps.length})`);

  let totalTtc = 0;
  let totalHt = 0;
  bcs.forEach(r => {
    totalTtc += Number(r.amountTTC || r.amount || 0);
    totalHt += Number(r.amountHT || 0);
  });
  const ttcFormatted = totalTtc.toFixed(2);
  const htFormatted = totalHt.toFixed(2);

  assert(ttcFormatted === '44778566.35', `T6.1: Total TTC is exactly 44,778,566.35 (got ${ttcFormatted})`);
  assert(htFormatted === '31638802.90', `T6.1: Total HT is exactly 31,638,802.90 (got ${htFormatted})`);
}

// T6.2: 100% Unique non-empty BC references
{
  const bcs = canonicalPreload.bcRecords;
  const refs = new Set();
  let duplicates = 0;
  let emptyRefs = 0;
  bcs.forEach(r => {
    if (!r.ref || !r.ref.trim()) emptyRefs++;
    if (refs.has(r.ref)) duplicates++;
    refs.add(r.ref);
  });
  assert(emptyRefs === 0, `T6.2: 0 empty BC references found`);
  assert(duplicates === 0, `T6.2: 0 duplicate BC references (all 361 distinct)`);
}

// T6.3: Mutation isolation (app.js loadState normalization clones objects)
{
  const mockStorage = createMockStorage();
  const state = runLoadStateInSandbox(mockStorage, canonicalPreload);
  const originalAmount = canonicalPreload.bcRecords[0].amount;

  // Mutate state record
  state.bcRecords[0].amount = 999999999;
  state.bcRecords[0].ref = 'MUTATED_BC_REF';

  // Check canonicalPreload
  assert(canonicalPreload.bcRecords[0].amount === originalAmount, 'T6.3: Modifying state record does not mutate canonical PRELOAD_DATA (cloned)');
  assert(canonicalPreload.bcRecords[0].ref !== 'MUTATED_BC_REF', 'T6.3: Canonical reference remains untainted');
}

// T6.4: Prototype pollution resilience
{
  // Pollute Object prototype
  Object.prototype.injectedPollution = 'HACKED_ATTR';
  Object.prototype.version = 'v_polluted';

  const mockStorage = createMockStorage();
  const state = runLoadStateInSandbox(mockStorage, canonicalPreload);

  assert(state.bcRecords.length === 361, 'T6.4: Object prototype pollution does not prevent clean 361 records loading');

  // Clean up prototype
  delete Object.prototype.injectedPollution;
  delete Object.prototype.version;
}

// =========================================================================
// SECTION 7: MIRROR FILE BIT-LEVEL INTEGRITY (ROOT vs ERP_Douroub_v6)
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 7: ROOT vs ERP_DOUROUB_V6 MIRROR INTEGRITY');
console.log('============================================================');

// T7.1: Root mirror file defines identical version and record count
{
  const ctx = {
    window: {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    localStorage: createMockStorage()
  };
  vm.createContext(ctx);
  vm.runInContext(rootPreloadSource, ctx);
  const rootPreload = ctx.window.PRELOAD_DATA;

  assert(rootPreload.version === 'v2026_02_clean_361', 'T7.1: Root mirror version matches v2026_02_clean_361');
  assert(rootPreload.bcRecords.length === 361, `T7.1: Root mirror has 361 BC records (got ${rootPreload.bcRecords.length})`);
  assert(rootPreload.payments.length === 148, `T7.1: Root mirror has 148 payments (got ${rootPreload.payments.length})`);

  let rootTtc = 0;
  rootPreload.bcRecords.forEach(r => { rootTtc += Number(r.amountTTC || r.amount || 0); });
  assert(rootTtc.toFixed(2) === '44778566.35', `T7.1: Root mirror TTC matches 44,778,566.35 (got ${rootTtc.toFixed(2)})`);
}

// =========================================================================
// SECTION 8: FULL 3-TIER CLIENT PIPELINE ADVERSARIAL CHAIN
// =========================================================================
console.log('\n============================================================');
console.log('SECTION 8: FULL 3-TIER CLIENT PIPELINE (PRELOAD -> APP -> ENHANCEMENTS)');
console.log('============================================================');

{
  const enhancementsSlice = enhancementsSource.slice(0, enhancementsSource.indexOf('// 4. Multi-Select Supplier'));
  const fullMockStorage = createMockStorage({
    suivi_linked_v30: 'CORRUPTED_GARBAGE_PAYLOAD_{{[',
    erp_jwt_token: 'LIVE_ACTIVE_JWT'
  });

  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    localStorage: fullMockStorage,
    sessionStorage: createMockStorage(),
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    },
    window: {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
  };
  vm.createContext(ctx);

  // 1. Run data-preload.js
  vm.runInContext(preloadSource, ctx);
  // 2. Run app.js core
  vm.runInContext(appCoreSlice, ctx);
  vm.runInContext('Object.assign(state, loadState()); window.state = state; window.normalizeBcRecord = normalizeBcRecord;', ctx);
  // 3. Run app-enhancements.js preload injector
  vm.runInContext(enhancementsSlice, ctx);

  const finalState = ctx.window.state;
  assert(finalState && finalState.bcRecords.length === 361, `T8.1: Full pipeline recovered from corrupted payload to 361 records (got ${finalState ? finalState.bcRecords.length : 'null'})`);
  assert(finalState.payments.length === 148, `T8.1: Full pipeline loaded 148 payments (got ${finalState.payments.length})`);
  assert(finalState.settings.bcSequence >= 307, `T8.1: BC sequence updated to >= 307 (got ${finalState.settings.bcSequence})`);
  assert(fullMockStorage.getItem('erp_jwt_token') === 'LIVE_ACTIVE_JWT', 'T8.1: Auth JWT preserved through entire 3-tier pipeline');
  assert(fullMockStorage.getItem('suivi_data_version') === 'v2026_02_clean_361', 'T8.1: Version marker maintained through pipeline');
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n============================================================');
console.log('ADVERSARIAL STRESS TEST SUMMARY');
console.log('============================================================');
console.log(`  TOTAL TESTS : ${passCount + failCount}`);
console.log(`  PASSED      : ${passCount}`);
console.log(`  FAILED      : ${failCount}`);
console.log('============================================================');

if (failCount > 0) {
  console.error('\nFAILURES DETECTED:');
  failures.forEach(f => console.error(`  - ${f.testName}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\nALL ADVERSARIAL STRESS TESTS PASSED EMPIRICALLY!');
  process.exit(0);
}
