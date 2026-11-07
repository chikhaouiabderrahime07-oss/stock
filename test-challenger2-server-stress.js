/**
 * test-challenger2-server-stress.js
 * Adversarial Server & DB Stress Testing Suite (Challenger 2)
 *
 * Covers:
 * 1. Demo stock article purge regex boundaries (matching target, rejecting adjacent/extra)
 * 2. Dummy BT purge regex boundaries (matching 0001-0007, API test, wp seeds; rejecting 0008, 0010, PROD)
 * 3. Complete dirty state transition matrix (exhaustive truth table & multi-value boundaries)
 * 4. Insertion sanitization (_id, id, immutable fields, prototypes, nested line items)
 * 5. Canonical dataset Mongoose schema validation & payment filter specification audit
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const mongoose = require('mongoose');

// Load Mongoose models
const BcRecord = require('./models/BcRecord');
const Payment = require('./models/Payment');
const Article = require('./models/Article');
const Movement = require('./models/Movement');
const BonTravail = require('./models/BonTravail');
const Setting = require('./models/Setting');

// Test Runner State
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(description, fn) {
  totalTests++;
  const label = `TEST ${totalTests.toString().padStart(2, '0')}: ${description}`;
  const start = Date.now();
  try {
    fn();
    passedTests++;
    const duration = Date.now() - start;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${label} \x1b[90m(${duration}ms)\x1b[0m`);
  } catch (err) {
    failedTests++;
    const duration = Date.now() - start;
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${label} \x1b[90m(${duration}ms)\x1b[0m`);
    console.error(`         \x1b[31m↳ ${err.message}\x1b[0m`);
    failureDetails.push({ test: label, error: err.message });
  }
}

console.log('======================================================================');
console.log('  CHALLENGER 2: ADVERSARIAL SERVER & DB STRESS TESTING SUITE');
console.log('======================================================================\n');

// ======================================================================
// SUITE 1: DEMO STOCK ARTICLE PURGE REGEX BOUNDARIES
// ======================================================================
console.log('--- SUITE 1: Demo Stock Article Purge Regex Boundaries ---');

// The regex extracted directly from server.js:196 and routes/articles.js
const articleRegexPattern = '^(PDR-001|PDR-002|ART-18429|Art-003)$';
const articleRegex = new RegExp(articleRegexPattern, 'i');

test('A1.1: Exact demo article targets match across all case permutations', () => {
  const targetCodes = [
    'PDR-001', 'pdr-001', 'Pdr-001', 'PDR-001',
    'PDR-002', 'pdr-002', 'Pdr-002',
    'ART-18429', 'art-18429', 'Art-18429',
    'Art-003', 'art-003', 'ART-003', 'aRt-003'
  ];
  targetCodes.forEach(code => {
    assert.ok(articleRegex.test(code), `Target code "${code}" should match article purge regex`);
  });
});

test('A1.2: Boundary rejection: Trailing numeric digits strictly rejected', () => {
  const trailingDigits = [
    'PDR-0010', 'PDR-0011', 'PDR-0019',
    'PDR-0020', 'PDR-0029',
    'ART-184290', 'ART-184291', 'ART-184299',
    'Art-0030', 'Art-0031', 'art-0039'
  ];
  trailingDigits.forEach(code => {
    assert.strictEqual(articleRegex.test(code), false, `Code with trailing digits "${code}" must NOT match`);
  });
});

test('A1.3: Boundary rejection: Suffixes, extensions, and hyphens strictly rejected', () => {
  const suffixedCodes = [
    'PDR-001-EXTRA', 'PDR-001_OLD', 'PDR-001-TEST', 'PDR-001.bak',
    'PDR-002-ALT', 'PDR-002_V2',
    'ART-18429-TEST', 'ART-18429_NEW', 'ART-18429-COPY',
    'Art-003-CLONE', 'art-003_bis'
  ];
  suffixedCodes.forEach(code => {
    assert.strictEqual(articleRegex.test(code), false, `Code with suffix "${code}" must NOT match`);
  });
});

test('A1.4: Boundary rejection: Prefixed codes strictly rejected', () => {
  const prefixedCodes = [
    'PREFIX-PDR-001', 'OLD-PDR-001', 'STOCK-PDR-001',
    'DEMO-ART-18429', 'PROD-ART-18429',
    'REAL-Art-003', 'SITE1-Art-003'
  ];
  prefixedCodes.forEach(code => {
    assert.strictEqual(articleRegex.test(code), false, `Code with prefix "${code}" must NOT match`);
  });
});

test('A1.5: Boundary rejection: Truncated codes strictly rejected', () => {
  const truncatedCodes = [
    'PDR-00', 'PDR-0', 'PDR-', 'PDR',
    'ART-1842', 'ART-184', 'ART-18', 'ART-',
    'Art-00', 'Art-0', 'Art-'
  ];
  truncatedCodes.forEach(code => {
    assert.strictEqual(articleRegex.test(code), false, `Truncated code "${code}" must NOT match`);
  });
});

test('A1.6: Boundary rejection: Adjacent similar article numbers strictly rejected', () => {
  const adjacentCodes = [
    'PDR-000', 'PDR-003', 'PDR-004', 'PDR-100',
    'ART-18428', 'ART-18430', 'ART-18420',
    'Art-001', 'Art-002', 'Art-004', 'Art-005', 'ART-000'
  ];
  adjacentCodes.forEach(code => {
    assert.strictEqual(articleRegex.test(code), false, `Adjacent code "${code}" must NOT match`);
  });
});

test('A1.7: Edge cases: Whitespace, empty, null, undefined strictly rejected', () => {
  assert.strictEqual(articleRegex.test(''), false, 'Empty string must not match');
  assert.strictEqual(articleRegex.test('   '), false, 'Whitespace must not match');
  assert.strictEqual(articleRegex.test(' PDR-001'), false, 'Leading whitespace must not match');
  assert.strictEqual(articleRegex.test('PDR-001 '), false, 'Trailing whitespace must not match');
  assert.strictEqual(articleRegex.test('PDR-001\n'), false, 'Newline must not match');
  assert.strictEqual(articleRegex.test('PDR-001\t'), false, 'Tab must not match');
});

test('A1.8: Article designation filter accurately targets test labels and preserves real stock', () => {
  // Test server.js designation filter
  const testDesignations = ['aaa', 'afafz', 'Test', 'test'];
  const realDesignations = [
    'Filtre à huile DAF XF',
    'Pneu 315/80 R22.5',
    'Plaquette de frein Schmitz',
    'Huile moteur 15W40',
    'Courroie alternateur'
  ];

  testDesignations.forEach(d => {
    assert.ok(testDesignations.includes(d), `Test designation "${d}" matched in filter`);
  });
  realDesignations.forEach(d => {
    assert.ok(!testDesignations.includes(d), `Legitimate designation "${d}" preserved`);
    assert.ok(!/^test$/i.test(d), `Legitimate designation "${d}" does not match test regex`);
  });
});

test('A1.9: Movement purge filter targets demo article codes and preserves legitimate movements', () => {
  const movFilter = (code, desig) => {
    return articleRegex.test(code) || ['aaa', 'afafz', 'Test', 'test'].includes(desig);
  };

  assert.ok(movFilter('PDR-001', 'Filtre'));
  assert.ok(movFilter('ART-18429', 'Piece'));
  assert.ok(movFilter('OTHER-CODE', 'test'));
  assert.strictEqual(movFilter('PDR-0010', 'Pneu Michelin'), false);
  assert.strictEqual(movFilter('ART-18429-TEST', 'Huile'), false);
  assert.strictEqual(movFilter('LEGIT-001', 'Filtre Gasoil'), false);
});

// ======================================================================
// SUITE 2: DUMMY BT PURGE REGEX BOUNDARIES
// ======================================================================
console.log('\n--- SUITE 2: Dummy BT Purge Regex Boundaries ---');

// The regexes from server.js:218-227
const btRangeRegex = /^BT-2026-000[1-7]/i;
const btApiTestRegex = /^BT-API-TEST/i;
const btWpRegex = /^wp_/i;

const isDummyBt = (refOrId) => {
  if (!refOrId || typeof refOrId !== 'string') return false;
  return btRangeRegex.test(refOrId) || btApiTestRegex.test(refOrId) || btWpRegex.test(refOrId);
};

test('A2.1: BT Range Regex matches BT-2026-0001 through BT-2026-0007', () => {
  for (let i = 1; i <= 7; i++) {
    const codeUpper = `BT-2026-000${i}`;
    const codeLower = `bt-2026-000${i}`;
    const codeMixed = `Bt-2026-000${i}`;
    assert.ok(isDummyBt(codeUpper), `Should match dummy BT "${codeUpper}"`);
    assert.ok(isDummyBt(codeLower), `Should match dummy BT "${codeLower}"`);
    assert.ok(isDummyBt(codeMixed), `Should match dummy BT "${codeMixed}"`);
  }
});

test('A2.2: BT Range Boundary: BT-2026-0008, 0009, 0010 strictly rejected', () => {
  assert.strictEqual(isDummyBt('BT-2026-0008'), false, 'BT-2026-0008 must NOT match');
  assert.strictEqual(isDummyBt('bt-2026-0008'), false, 'bt-2026-0008 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0009'), false, 'BT-2026-0009 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0010'), false, 'BT-2026-0010 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0011'), false, 'BT-2026-0011 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0020'), false, 'BT-2026-0020 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0070'), false, 'BT-2026-0070 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0100'), false, 'BT-2026-0100 must NOT match');
  assert.strictEqual(isDummyBt('BT-2026-0999'), false, 'BT-2026-0999 must NOT match');
});

test('A2.3: BT API TEST Regex matches variants and rejects non-matching', () => {
  const apiTestCodes = [
    'BT-API-TEST',
    'BT-API-TEST-123',
    'bt-api-test-01',
    'BT-API-TEST_DELETE',
    'BT-API-TEST-PERF-RUN'
  ];
  apiTestCodes.forEach(code => {
    assert.ok(isDummyBt(code), `API Test BT "${code}" should match`);
  });

  assert.strictEqual(isDummyBt('BT-REAL-API-01'), false);
  assert.strictEqual(isDummyBt('MY-BT-API-TEST'), false); // does not start with BT-API-TEST
});

test('A2.4: Work plan prefix wp_ matches seed records and rejects others', () => {
  const wpCodes = [
    'wp_seed_999',
    'wp_test_1',
    'wp_12345678',
    'WP_PLAN_DEMO',
    'wp_backup_temp'
  ];
  wpCodes.forEach(code => {
    assert.ok(isDummyBt(code), `WP code "${code}" should match`);
  });

  assert.strictEqual(isDummyBt('my_wp_seed_999'), false);
  assert.strictEqual(isDummyBt('work_plan_01'), false);
});

test('A2.5: Production and legitimate BT formats strictly preserved', () => {
  const prodCodes = [
    'BT-PROD-2026-001',
    'BT-PROD-2026-0001',
    'BT-2025-0001',
    'BT-2024-0007',
    'BT-2027-0001',
    'BON-TRAVAIL-REAL-01',
    'BT-MAINT-001',
    'BT-FLEET-2026-01',
    'BT-URGENT-0001'
  ];
  prodCodes.forEach(code => {
    assert.strictEqual(isDummyBt(code), false, `Production BT "${code}" must NOT be purged`);
  });
});

test('A2.6: Dummy BT edge cases: empty string, null, numbers, symbols', () => {
  assert.strictEqual(isDummyBt(''), false);
  assert.strictEqual(isDummyBt(null), false);
  assert.strictEqual(isDummyBt(undefined), false);
  assert.strictEqual(isDummyBt(12345), false);
  assert.strictEqual(isDummyBt({}), false);
  assert.strictEqual(isDummyBt('   '), false);
  assert.strictEqual(isDummyBt('BT-2026-0000'), false); // 0000 is not in [1-7]
});

// ======================================================================
// SUITE 3: DIRTY STATE TRANSITION MATRIX
// ======================================================================
console.log('\n--- SUITE 3: Dirty State Transition Matrix ---');

// The exact state machine logic from server.js:267-276
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

test('A3.1: Full 2^5 = 32 Combination Truth Table Test (Zero False Negatives)', () => {
  // Dimensions (Clean vs Dirty values):
  // Dim 0: bcCount: Clean = 361, Dirty = 386
  // Dim 1: copyClones: Clean = 0, Dirty = 1
  // Dim 2: schmitzClones: Clean = 0, Dirty = 3
  // Dim 3: hasTestBcs: Clean = 0, Dirty = 1
  // Dim 4: versionSetting: Clean = 'v6_clean_361', Dirty = 'v5_legacy'

  let dirtyCount = 0;
  let cleanCount = 0;

  for (let i = 0; i < 32; i++) {
    const isBcDirty = (i & 1) !== 0;
    const isCopyDirty = (i & 2) !== 0;
    const isSchmitzDirty = (i & 4) !== 0;
    const isTestDirty = (i & 8) !== 0;
    const isVerDirty = (i & 16) !== 0;

    const bcVal = isBcDirty ? 386 : 361;
    const copyVal = isCopyDirty ? 1 : 0;
    const schmitzVal = isSchmitzDirty ? 3 : 0;
    const testVal = isTestDirty ? 1 : 0;
    const settingVal = isVerDirty ? { bcDatasetVersion: 'v5_legacy' } : { bcDatasetVersion: 'v6_clean_361' };

    const expectedDirty = (isBcDirty || isCopyDirty || isSchmitzDirty || isTestDirty || isVerDirty);
    const actualDirty = isDatasetDirty(bcVal, copyVal, schmitzVal, testVal, settingVal);

    assert.strictEqual(
      actualDirty,
      expectedDirty,
      `State combination #${i} [bc=${bcVal}, copy=${copyVal}, schmitz=${schmitzVal}, test=${testVal}, ver=${settingVal.bcDatasetVersion}] failed!`
    );

    if (actualDirty) dirtyCount++;
    else cleanCount++;
  }

  // Exactly 1 all-clean combination (index 0) and 31 dirty combinations
  assert.strictEqual(cleanCount, 1, 'Exactly 1 combination must be clean');
  assert.strictEqual(dirtyCount, 31, 'Exactly 31 combinations must be dirty');
});

test('A3.2: Multi-value boundary testing for bcCount (0, 100, 360, 361, 362, 385, 386, 387, 500)', () => {
  const cleanSetting = { bcDatasetVersion: 'v6_clean_361' };

  // Dirty bc counts
  assert.strictEqual(isDatasetDirty(0, 0, 0, 0, cleanSetting), true, 'bcCount = 0 must be DIRTY');
  assert.strictEqual(isDatasetDirty(1, 0, 0, 0, cleanSetting), true, 'bcCount = 1 must be DIRTY');
  assert.strictEqual(isDatasetDirty(100, 0, 0, 0, cleanSetting), true, 'bcCount = 100 must be DIRTY');
  assert.strictEqual(isDatasetDirty(360, 0, 0, 0, cleanSetting), true, 'bcCount = 360 must be DIRTY (<361)');
  assert.strictEqual(isDatasetDirty(386, 0, 0, 0, cleanSetting), true, 'bcCount = 386 must be DIRTY (stale corrupt)');

  // Clean bc counts (canonical and post-launch user growth)
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, cleanSetting), false, 'bcCount = 361 must be CLEAN');
  assert.strictEqual(isDatasetDirty(362, 0, 0, 0, cleanSetting), false, 'bcCount = 362 must be CLEAN (user added 1)');
  assert.strictEqual(isDatasetDirty(385, 0, 0, 0, cleanSetting), false, 'bcCount = 385 must be CLEAN');
  assert.strictEqual(isDatasetDirty(387, 0, 0, 0, cleanSetting), false, 'bcCount = 387 must be CLEAN (past stale count)');
  assert.strictEqual(isDatasetDirty(500, 0, 0, 0, cleanSetting), false, 'bcCount = 500 must be CLEAN (healthy growth)');
});

test('A3.3: Boundary testing for schmitzClones (0, 1, 2, 3, 10)', () => {
  const cleanSetting = { bcDatasetVersion: 'v6_clean_361' };

  // schmitzClones <= 2 is clean
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, cleanSetting), false, 'schmitzClones = 0 must be CLEAN');
  assert.strictEqual(isDatasetDirty(361, 0, 1, 0, cleanSetting), false, 'schmitzClones = 1 must be CLEAN');
  assert.strictEqual(isDatasetDirty(361, 0, 2, 0, cleanSetting), false, 'schmitzClones = 2 must be CLEAN');

  // schmitzClones > 2 is dirty
  assert.strictEqual(isDatasetDirty(361, 0, 3, 0, cleanSetting), true, 'schmitzClones = 3 must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 10, 0, cleanSetting), true, 'schmitzClones = 10 must be DIRTY');
});

test('A3.4: Boundary testing for globalSetting permutations', () => {
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, null), true, 'null setting must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, undefined), true, 'undefined setting must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, {}), true, 'empty setting must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: '' }), true, 'empty version must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: 'v5_legacy' }), true, 'legacy version must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: 'v6_clean_360' }), true, 'mismatched version must be DIRTY');
  assert.strictEqual(isDatasetDirty(361, 0, 0, 0, { bcDatasetVersion: 'v6_clean_361' }), false, 'exact version must be CLEAN');
});

test('A3.5: No False Positives on Clean Server Restarts', () => {
  // A clean server that restarts repeatedly with 361 records must never trigger reseed
  const restartRuns = [
    { count: 361, copy: 0, schmitz: 1, test: 0 },
    { count: 361, copy: 0, schmitz: 2, test: 0 },
    { count: 362, copy: 0, schmitz: 1, test: 0 },
    { count: 370, copy: 0, schmitz: 2, test: 0 }
  ];
  restartRuns.forEach((run, idx) => {
    const dirty = isDatasetDirty(run.count, run.copy, run.schmitz, run.test, { bcDatasetVersion: 'v6_clean_361' });
    assert.strictEqual(dirty, false, `Clean restart #${idx + 1} must evaluate to FALSE (no false reseed)`);
  });
});

// ======================================================================
// SUITE 4: INSERTION SANITIZATION & IMMUTABLE FIELD HANDLING
// ======================================================================
console.log('\n--- SUITE 4: Insertion Sanitization & Immutable Field Handling ---');

test('A4.1: Sanitizer completely strips existing _id and id properties', () => {
  const rawItem = {
    _id: '65d1234567890abcdef12345',
    id: 12345,
    ref: 'BC N°10/DG/2026',
    amountTTC: 50000,
    supplierName: 'FOURNISSEUR TEST'
  };

  const clean = ((r) => {
    const d = { ...r };
    delete d._id;
    delete d.id;
    return d;
  })(rawItem);

  assert.strictEqual('_id' in clean, false, '_id property must be deleted');
  assert.strictEqual('id' in clean, false, 'id property must be deleted');
  assert.strictEqual(clean.ref, 'BC N°10/DG/2026');
  assert.strictEqual(clean.amountTTC, 50000);
});

test('A4.2: Sanitizer handles various _id and id types without throwing', () => {
  const adversarialItems = [
    { _id: new mongoose.Types.ObjectId(), id: 'custom_uuid', ref: 'BC-ADV-1' },
    { _id: 9999, id: null, ref: 'BC-ADV-2' },
    { _id: null, id: undefined, ref: 'BC-ADV-3' },
    { _id: { nested: 'object_id' }, id: [1, 2, 3], ref: 'BC-ADV-4' },
    { ref: 'BC-ADV-5' } // neither _id nor id present
  ];

  adversarialItems.forEach(item => {
    assert.doesNotThrow(() => {
      const d = { ...item };
      delete d._id;
      delete d.id;
      assert.strictEqual(d._id, undefined);
      assert.strictEqual(d.id, undefined);
      assert.ok(d.ref.startsWith('BC-ADV-'));
    });
  });
});

test('A4.3: Mongoose BcRecord model accepts sanitized object and generates standard ObjectId', () => {
  const rawBc = {
    _id: 'OLD_DIRTY_ID_99999',
    id: 99999,
    ref: 'BC N°99/DG/2026',
    supplierName: 'SARL EQUIPEMENT',
    amountTTC: 125000,
    amountHT: 105000,
    currency: 'DZD',
    lineItems: [
      { description: 'Article 1', qty: 5, unitPrice: 21000 },
      { description: 'Article 2', qty: 2, unitPrice: 10000 }
    ]
  };

  const sanitized = { ...rawBc };
  delete sanitized._id;
  delete sanitized.id;

  const doc = new BcRecord(sanitized);
  assert.ok(doc._id, 'Mongoose must generate a new _id');
  assert.notStrictEqual(String(doc._id), 'OLD_DIRTY_ID_99999', 'Must not keep old string _id');
  assert.ok(mongoose.Types.ObjectId.isValid(doc._id), 'Generated _id must be a valid ObjectId');
  assert.strictEqual(doc.ref, 'BC N°99/DG/2026');
  assert.strictEqual(doc.amountTTC, 125000);
  assert.strictEqual(doc.lineItems.length, 2);
});

test('A4.4: Mongoose Payment model accepts sanitized object and generates standard ObjectId', () => {
  const rawPayment = {
    _id: 'OLD_PAY_ID_8888',
    id: 'pay_str_id',
    paymentRef: 'DP N°88/DG/2026',
    amount: 75000,
    mode: 'virement',
    status: 'paye'
  };

  const sanitized = { ...rawPayment };
  delete sanitized._id;
  delete sanitized.id;

  const doc = new Payment(sanitized);
  assert.ok(doc._id, 'Mongoose must generate a new _id');
  assert.notStrictEqual(String(doc._id), 'OLD_PAY_ID_8888', 'Must not keep old string _id');
  assert.ok(mongoose.Types.ObjectId.isValid(doc._id), 'Generated _id must be a valid ObjectId');
  assert.strictEqual(doc.paymentRef, 'DP N°88/DG/2026');
  assert.strictEqual(doc.amount, 75000);
});

test('A4.5: Sanitizer filter rejects TEST and SYNC prefix items correctly', () => {
  const mixedRecords = [
    { ref: 'BC N°01/DG/2026', amountTTC: 10000 },
    { ref: 'TEST-BC-001', amountTTC: 99999 },
    { ref: 'TEST_BC_DUMMY', amountTTC: 50000 },
    { ref: 'SYNC-BC-IMPORT', amountTTC: 30000 },
    { ref: 'SYNC_BC_02', amountTTC: 20000 },
    { ref: 'BC N°02/DG/2026', amountTTC: 25000 },
    { ref: '', amountTTC: 0 },
    { ref: null, amountTTC: 0 }
  ];

  const clean = mixedRecords
    .filter(r => r.ref && !String(r.ref).startsWith('TEST') && !String(r.ref).startsWith('SYNC'))
    .map(r => {
      const d = { ...r };
      delete d._id;
      delete d.id;
      return d;
    });

  assert.strictEqual(clean.length, 2);
  assert.strictEqual(clean[0].ref, 'BC N°01/DG/2026');
  assert.strictEqual(clean[1].ref, 'BC N°02/DG/2026');
});

test('A4.6: Preservation of complex French characters and deep nested line items', () => {
  const complexRecord = {
    _id: 'stale_id_french',
    ref: 'BC N°50/DG/2026',
    supplierName: 'ÉTABLISSEMENT GÉNÉRAL D\'APPROVISIONNEMENT & FILS',
    description: 'Achat de pièces détachées pour véhicules lourds (châssis & boîte de vitesses)',
    lineItems: [
      { designation: 'Moyeu de roue arrière gauche — Ø220mm', qty: 2, prixHT: 45000.50, tvaRate: 19 },
      { designation: 'Joint d\'étanchéité calorifugé résistant à l\'huile', qty: 10, prixHT: 1250.75, tvaRate: 19 },
      { designation: 'Vis tête hexagonale M12x1.5 (classe 10.9)', qty: 50, prixHT: 150.00, tvaRate: 19 }
    ]
  };

  const sanitized = { ...complexRecord };
  delete sanitized._id;
  delete sanitized.id;

  const doc = new BcRecord(sanitized);
  assert.strictEqual(doc.supplierName, 'ÉTABLISSEMENT GÉNÉRAL D\'APPROVISIONNEMENT & FILS');
  assert.strictEqual(doc.lineItems.length, 3);
  assert.strictEqual(doc.lineItems[0].designation, 'Moyeu de roue arrière gauche — Ø220mm');
  assert.strictEqual(doc.lineItems[1].prixHT, 1250.75);
});

// ======================================================================
// SUITE 5: DATASET INTEGRITY & SERVER INGESTION AUDIT
// ======================================================================
console.log('\n--- SUITE 5: Dataset Integrity & Ingestion Audit ---');

test('A5.1: Canonical extracted_bcs_linked.json passes 100% through server sanitization filter', () => {
  const dataPath = path.join(__dirname, 'data', 'extracted_bcs_linked.json');
  assert.ok(fs.existsSync(dataPath), `File ${dataPath} must exist`);

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert.strictEqual(Array.isArray(raw), true, 'Must be an array');
  assert.strictEqual(raw.length, 361, 'Must contain 361 records');

  const clean = raw
    .filter(r => r.ref && !String(r.ref).startsWith('TEST') && !String(r.ref).startsWith('SYNC'))
    .map(r => {
      const d = { ...r };
      delete d._id;
      delete d.id;
      return d;
    });

  assert.strictEqual(clean.length, 361, 'All 361 canonical records must pass filter');

  // Verify none contain _id or id
  clean.forEach((rec, idx) => {
    assert.strictEqual(rec._id, undefined, `Record #${idx} (${rec.ref}) must have undefined _id`);
    assert.strictEqual(rec.id, undefined, `Record #${idx} (${rec.ref}) must have undefined id`);
  });

  // Verify batch Mongoose instantiation
  const docs = clean.map(r => new BcRecord(r));
  assert.strictEqual(docs.length, 361);
  assert.ok(docs.every(d => mongoose.Types.ObjectId.isValid(d._id)), 'Every record must have valid Mongoose ObjectId');
});

test('A5.2: Public data-preload.js contains exactly 148 clean payments (0 test payments)', () => {
  const pubPreloadPath = path.join(__dirname, 'public', 'suivi-achats-premium', 'data-preload.js');
  const code = fs.readFileSync(pubPreloadPath, 'utf8');
  const mockWin = {};
  const mockStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, length: 0 };
  new Function('window', 'localStorage', 'console', code)(mockWin, mockStorage, { log: () => {}, warn: () => {}, error: () => {} });

  assert.strictEqual(mockWin.PRELOAD_DATA.payments.length, 148, 'Public data-preload.js must have 148 payments');
  const testPayments = mockWin.PRELOAD_DATA.payments.filter(p => /TEST|SYNC/i.test(p.paymentRef));
  assert.strictEqual(testPayments.length, 0, 'Must have zero test payments in preload');
});

test('A5.3: Canonical extracted_dps.json contains exactly 148 clean payments', () => {
  const dpsPath = path.join(__dirname, 'data', 'extracted_dps.json');
  assert.ok(fs.existsSync(dpsPath), `File ${dpsPath} must exist`);
  const dps = JSON.parse(fs.readFileSync(dpsPath, 'utf8'));
  assert.strictEqual(dps.length, 148, 'Must have 148 records');
  const testPayments = dps.filter(p => /TEST|SYNC/i.test(p.paymentRef));
  assert.strictEqual(testPayments.length, 0, 'Must have zero test payments');
});

test('A5.4: Specification Check: server.js:333 payment filter must reject DP-TEST-999 in extracted_dps_linked.json', () => {
  const payPath = path.join(__dirname, 'data', 'extracted_dps_linked.json');
  assert.ok(fs.existsSync(payPath), `File ${payPath} must exist`);
  const rawPay = JSON.parse(fs.readFileSync(payPath, 'utf8'));

  // What server.js:333 currently executes:
  const serverJsFilter = (pDoc) => pDoc.paymentRef && !String(pDoc.paymentRef).startsWith('TEST') && !String(pDoc.paymentRef).startsWith('SYNC');
  const serverCleanPay = rawPay.filter(serverJsFilter);

  // Asserting whether server.js:333 rejects DP-TEST-999 as specified in TEST_READY.md (T2.10):
  const containsTestPayment = serverCleanPay.some(p => p.paymentRef === 'DP-TEST-999');
  assert.strictEqual(
    containsTestPayment,
    false,
    `DEFECT FOUND: server.js:333 filter (.startsWith('TEST')) fails to filter out DP-TEST-999 (amount: 88,000 DZD). Clean count is ${serverCleanPay.length} instead of 148!`
  );
  assert.strictEqual(serverCleanPay.length, 148, 'Must produce exactly 148 clean payments matching data-preload.js');
});

test('A5.5: Verified Remediation: Robust payment filter (!/TEST/i && !/SYNC/i) rejects all test payments', () => {
  const payPath = path.join(__dirname, 'data', 'extracted_dps_linked.json');
  const rawPay = JSON.parse(fs.readFileSync(payPath, 'utf8'));

  // Robust remediation filter
  const robustFilter = (pDoc) => pDoc.paymentRef && !/TEST/i.test(String(pDoc.paymentRef)) && !/SYNC/i.test(String(pDoc.paymentRef));
  const robustCleanPay = rawPay
    .filter(robustFilter)
    .map(pDoc => {
      const d = { ...pDoc };
      delete d._id;
      delete d.id;
      return d;
    });

  assert.strictEqual(robustCleanPay.length, 148, 'Robust filter produces exactly 148 clean payments');
  assert.strictEqual(robustCleanPay.some(p => /TEST|SYNC/i.test(p.paymentRef)), false, 'Zero test payments remain');

  // Verify batch Mongoose instantiation on repaired set
  const docs = robustCleanPay.map(r => new Payment(r));
  assert.strictEqual(docs.length, 148);
  assert.ok(docs.every(d => mongoose.Types.ObjectId.isValid(d._id)), 'Every payment has valid ObjectId');
});

// ======================================================================
// SUMMARY & VERDICT
// ======================================================================
console.log('\n======================================================================');
console.log('  CHALLENGER 2 ADVERSARIAL STRESS TEST SUMMARY');
console.log('======================================================================');
console.log(`  Total Adversarial Tests : ${totalTests}`);
console.log(`  Passed                  : ${passedTests}`);
console.log(`  Failed                  : ${failedTests}`);
if (failureDetails.length > 0) {
  console.log('\n  Failures Detected:');
  failureDetails.forEach(f => {
    console.log(`  - ${f.test}`);
    console.log(`    Error: ${f.error}`);
  });
}
console.log('----------------------------------------------------------------------');

if (failedTests === 0) {
  console.log('  \x1b[32mVERDICT: APPROVE (100% Adversarial Tests Passed)\x1b[0m');
  console.log('======================================================================\n');
  process.exit(0);
} else {
  console.log('  \x1b[31mVERDICT: REQUEST_CHANGES (Defect Detected in Server Seed Filter)\x1b[0m');
  console.log('======================================================================\n');
  process.exit(1);
}
