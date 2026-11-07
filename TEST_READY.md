# TEST_READY — Milestone M3 Automated Verification Suite

## Suite Overview
- **Runner Script**: `ERP_Douroub_v6/verify-purge-reseed.js`
- **Execution Command**: `node ERP_Douroub_v6/verify-purge-reseed.js`
- **Total Tests**: 34
- **Passed**: 34 (100%)
- **Failed**: 0
- **Status**: PASSED — Ready for Milestone M4 Gate Audit

---

## Tier Breakdown & Test Matrix

### Tier 1: Feature Coverage (15/15 Passed)
Covers syntax validity, strict dataset counts, financial totals, and server boot query configurations:
- **T1.1**: Syntax validation of `ERP_Douroub_v6/public/suivi-achats-premium/data-preload.js` (`node -c`).
- **T1.2**: Syntax validation of root `suivi-achats-premium/data-preload.js` (`node -c`).
- **T1.3**: Syntax validation of `ERP_Douroub_v6/server.js` (`node -c`).
- **T1.4**: Public `data-preload.js` defines `window.PRELOAD_DATA` with version `v2026_02_clean_361`.
- **T1.5**: Public `data-preload.js` contains exactly 361 clean BC records.
- **T1.6**: Public `data-preload.js` contains exactly 148 clean payments.
- **T1.7**: Public `data-preload.js` totals equal `44,778,566.35 DZD TTC` and `31,638,802.90 DZD HT`.
- **T1.8**: Root `data-preload.js` mirror matches public counts and totals identically.
- **T1.9**: Root `data/extracted_bcs_linked.json` matches `ERP_Douroub_v6` byte-for-byte with 361 records.
- **T1.10**: Canonical dataset contains 0 test/demo/sync records.
- **T1.11**: All 361 BC references in `extracted_bcs_linked.json` are 100% distinct.
- **T1.12**: `server.js` contains demo stock article purge filter and associated movement cleanup.
- **T1.13**: `server.js` contains dummy BT purge query covering `BT-2026-000[1-7]`, `BT-API-TEST`, `wp_*`.
- **T1.14**: `server.js` contains version marker `v6_clean_361` in Setting upsert.
- **T1.15**: Cache busters `?v=361clean` present on script tags in both `index.html` files.

### Tier 2: Boundary & Corner Cases (10/10 Passed)
Adversarial edge testing of regex boundaries, key preservation, dynamic wildcard purges, and storage errors:
- **T2.1**: Cache Purge IIFE removes all known stale legacy keys (`suivi_linked_v30`, `sde_suivi_state`, `sde_suivi_cache`, etc.).
- **T2.2**: Cache Purge IIFE dynamically purges arbitrary wildcard keys matching `suivi_cache*` and `sde_suivi_*`.
- **T2.3**: Cache Purge IIFE strictly preserves all 9 authentication and portal keys.
- **T2.4**: Cache Purge IIFE is strictly idempotent when version is `v2026_02_clean_361`.
- **T2.5**: Cache Purge IIFE handles storage errors (e.g. Private Browsing quota exceptions) gracefully.
- **T2.6**: Article regex `/^(PDR-001|PDR-002|ART-18429|Art-003)$/i` matches all case permutations.
- **T2.7**: Article regex strictly rejects boundary-adjacent non-target codes (`ART-004`, `PDR-0010`, etc.).
- **T2.8**: BT regex `/^BT-2026-000[1-7]/i` matches 0001 through 0007 and rejects 0008+.
- **T2.9**: Dummy BT regex matches `BT-API-TEST` and `wp_` prefixes, rejecting production BT references.
- **T2.10**: Payment sanitizer rejects test payments (`DP-TEST-999`, `SYNC-DP-01`) and preserves legitimate payments.

### Tier 3: Cross-Feature Interactions & State Machines (8/8 Passed)
Validates Atlas dirty-detection state transitions and client `loadState` / `saveState` rehydration contracts:
- **T3.1**: Server state machine triggers reseed when `bcCount === 0`.
- **T3.2**: Server state machine triggers reseed when `bcCount === 386` or copy clones are detected.
- **T3.3**: Server state machine triggers reseed on test BC presence or missing/legacy version setting.
- **T3.4**: Server state machine detects clean state (`361` count + `v6_clean_361`) as clean and skips reseed.
- **T3.5**: Server state machine preserves new user records added after initial seeding (`bcCount >= 361`).
- **T3.6**: Client `loadState()` discards invalid/legacy version cache and falls back to `window.PRELOAD_DATA`.
- **T3.7**: Client `loadState()` gracefully handles corrupted JSON in localStorage.
- **T3.8**: Client `saveState()` writes `SUIVI_DATA_VERSION = 'v2026_02_clean_361'` and round-trips to `loadState()`.

### Tier 4: Real-World Simulation (1/1 Passed)
- **T4.1**: Full End-to-End User Journey:
  1. User arrives with dirty localStorage (386 stale records, legacy flags) and valid auth token.
  2. `data-preload.js` runs: purges stale keys, retains auth token, embeds clean 361 records.
  3. `app.js` runs `loadState()`: verifies version, loads 361 records and 148 payments into state (44.78M DZD).
  4. User edits a record, creates a new BC (#362), and triggers `saveState()`.
  5. User refreshes the page: `data-preload.js` detects active version token and skips purge.
  6. `app.js` runs `loadState()`: rehydrates user changes and preserves 362 records.
  7. Auth credentials (`erp_jwt_token`, `suivi_session`, `sde_user_role`) remain intact across all phases.

---

## Execution Instructions
From the repository root or inside `ERP_Douroub_v6/`, run:
```bash
node ERP_Douroub_v6/verify-purge-reseed.js
```
Expected output: `TOTAL: 34/34 tests passed (0 failed)` with exit code `0`.
