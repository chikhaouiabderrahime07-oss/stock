/* ============================================================
   BC-API-BRIDGE.JS — Syncs suivi-achats-premium data to MongoDB
   Loaded AFTER app.js in suivi-achats-premium/index.html
   ============================================================ */
(function() {
  'use strict';

  var _bcSyncTimer = null;
  var _bcDataLoaded = false;

  // Get JWT token from main app
  function getToken() {
    return localStorage.getItem('erp_jwt_token') || '';
  }

  // Generic API request
  async function apiRequest(method, path, body) {
    var headers = { 'Authorization': 'Bearer ' + getToken() };
    var config = { method: method, headers: headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
    var res = await fetch(path, config);
    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      var err = new Error(data.error || 'Erreur serveur');
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // ─── Load BC + Payment data from MongoDB ───────────────────
  async function loadBcFromServer() {
    if (!getToken()) return null;
    try {
      var results = await Promise.all([
        apiRequest('GET', '/api/bc?limit=10000').catch(function() { return { bcRecords: [] }; }),
        apiRequest('GET', '/api/payments?limit=10000').catch(function() { return { payments: [] }; })
      ]);
      var bcRecords = results[0].bcRecords || [];
      var payments = results[1].payments || [];

      // Map _id to id for compatibility
      bcRecords = bcRecords.map(function(r) {
        if (r._id && !r.id) r.id = r._id;
        return r;
      });
      payments = payments.map(function(p) {
        if (p._id && !p.id) p.id = p._id;
        return p;
      });

      console.log('[BC-BRIDGE] Loaded from MongoDB:', bcRecords.length, 'BCs,', payments.length, 'payments');
      _bcDataLoaded = true;
      return { bcRecords: bcRecords, payments: payments };
    } catch (e) {
      console.warn('[BC-BRIDGE] Failed to load from server:', e.message);
      return null;
    }
  }

  // ─── Sync local BC data to MongoDB (bulk upsert) ───────────
  async function syncBcToServer() {
    if (!getToken()) return;
    try {
      // Read current state from localStorage
      var raw = null;
      var keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
      for (var i = 0; i < keys.length; i++) {
        raw = localStorage.getItem(keys[i]);
        if (raw) break;
      }
      if (!raw) return;

      var parsed = JSON.parse(raw);
      var bcRecords = parsed.bcRecords || [];
      var payments = parsed.payments || [];

      if (bcRecords.length === 0 && payments.length === 0) return;

      // Clean records for MongoDB (remove local-only fields)
      var cleanBc = bcRecords.map(function(r) {
        var clean = Object.assign({}, r);
        delete clean.id;
        delete clean._id;
        return clean;
      });

      var cleanPay = payments.map(function(p) {
        var clean = Object.assign({}, p);
        delete clean.id;
        delete clean._id;
        return clean;
      });

      // Bulk upsert
      var results = await Promise.all([
        cleanBc.length > 0
          ? apiRequest('POST', '/api/bc/bulk', { bcRecords: cleanBc }).catch(function(e) { return { error: e.message }; })
          : { upserted: 0 },
        cleanPay.length > 0
          ? apiRequest('POST', '/api/payments/bulk', { payments: cleanPay }).catch(function(e) { return { error: e.message }; })
          : { upserted: 0 }
      ]);

      console.log('[BC-BRIDGE] Synced to MongoDB — BC:', JSON.stringify(results[0]), '| Pay:', JSON.stringify(results[1]));
    } catch (e) {
      console.warn('[BC-BRIDGE] Sync to server failed:', e.message);
    }
  }

  // ─── Debounced sync trigger ────────────────────────────────
  function queueBcSync() {
    if (_bcSyncTimer) clearTimeout(_bcSyncTimer);
    _bcSyncTimer = setTimeout(syncBcToServer, 3000);
  }

  // ─── Patch saveState to also sync to MongoDB ──────────────
  var _origSetItem = localStorage.setItem.bind(localStorage);
  var storageKeys = ['suivi_linked_v30', 'suivi_compact_v20'];

  localStorage.setItem = function(key, value) {
    _origSetItem(key, value);
    if (storageKeys.indexOf(key) !== -1) {
      queueBcSync();
    }
  };

  // ─── On page load: merge server data into local state ─────
  async function initBcBridge() {
    var serverData = await loadBcFromServer();
    if (!serverData) return;

    var serverBc = serverData.bcRecords;
    var serverPay = serverData.payments;

    if (serverBc.length === 0 && serverPay.length === 0) {
      // No server data — push local to server
      console.log('[BC-BRIDGE] No server data, pushing local data up...');
      syncBcToServer();
      return;
    }

    // Read current local state
    var raw = null;
    var keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
    var usedKey = keys[0];
    for (var i = 0; i < keys.length; i++) {
      raw = localStorage.getItem(keys[i]);
      if (raw) { usedKey = keys[i]; break; }
    }

    var parsed = raw ? JSON.parse(raw) : {};
    var localBc = parsed.bcRecords || [];
    var localPay = parsed.payments || [];

    // Merge strategy: server wins, but keep local-only records
    var mergedBc = mergeRecords(localBc, serverBc, 'ref');
    var mergedPay = mergeRecords(localPay, serverPay, 'paymentRef');

    parsed.bcRecords = mergedBc;
    parsed.payments = mergedPay;

    // Write back to localStorage (without triggering sync)
    _origSetItem(usedKey, JSON.stringify(parsed));

    console.log('[BC-BRIDGE] Merged — BC:', mergedBc.length, '| Pay:', mergedPay.length);

    // Reload UI if app is ready
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    } else if (typeof window.location !== 'undefined') {
      // Soft reload by dispatching storage event
      window.dispatchEvent(new Event('bc-bridge-loaded'));
    }
  }

  // Merge local + server arrays, dedup by key field
  function mergeRecords(local, server, keyField) {
    var map = {};
    // Server records first (they win)
    for (var i = 0; i < server.length; i++) {
      var key = server[i][keyField] || server[i].id || server[i]._id;
      if (key) map[key] = server[i];
    }
    // Add local-only records
    for (var j = 0; j < local.length; j++) {
      var lkey = local[j][keyField] || local[j].id;
      if (lkey && !map[lkey]) {
        map[lkey] = local[j];
      }
    }
    return Object.values(map);
  }

  // Wait for DOM + auth ready, then init
  function bootBridge() {
    if (getToken()) {
      setTimeout(initBcBridge, 1500);
    } else {
      // Wait for login — check every 3 seconds
      var checkInterval = setInterval(function() {
        if (getToken()) {
          clearInterval(checkInterval);
          setTimeout(initBcBridge, 1000);
        }
      }, 3000);
      // Stop checking after 2 minutes
      setTimeout(function() { clearInterval(checkInterval); }, 120000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBridge);
  } else {
    bootBridge();
  }

  console.log('[BC-BRIDGE] BC API Bridge loaded — will sync BC & payments to MongoDB');
})();
