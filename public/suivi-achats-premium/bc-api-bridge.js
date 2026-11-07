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

  // Show a toast notification using the app's own toast function or fallback
  function showToast(msg, type) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type || 'success');
        return;
      }
      if (typeof window.showNotification === 'function') {
        window.showNotification(msg, type || 'success');
        return;
      }
      // Fallback: create a simple toast element
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:360px;';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
    } catch (e) {}
  }

  // Intercept window.fetch to automatically attach JWT token for /api/ endpoints
  if (typeof window !== 'undefined' && window.fetch) {
    var _nativeFetch = window.fetch;
    window.fetch = function(input, init) {
      init = init || {};
      var token = getToken();
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (token && url && url.indexOf('/api/') !== -1) {
        if (!init.headers) init.headers = {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) init.headers.set('Authorization', 'Bearer ' + token);
        } else if (Array.isArray(init.headers)) {
          var hasAuth = init.headers.some(function(h) { return h[0].toLowerCase() === 'authorization'; });
          if (!hasAuth) init.headers.push(['Authorization', 'Bearer ' + token]);
        } else if (typeof init.headers === 'object') {
          if (!init.headers['Authorization'] && !init.headers['authorization']) {
            init.headers['Authorization'] = 'Bearer ' + token;
          }
        }
      }
      return _nativeFetch.call(this, input, init);
    };
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

  // ─── Hydrate BC + Payment data from MongoDB ────────────────
  async function hydrateFromServer() {
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

      console.log('[BC-BRIDGE] Hydrated from MongoDB:', bcRecords.length, 'BCs,', payments.length, 'payments');

      // FIX 2 & FIX 5: Update in-memory state FIRST, then render
      if (typeof window !== 'undefined' && window.state) {
        window.state.bcRecords = bcRecords;
        window.state.payments = payments;

        if (typeof window.ApproNextGen !== 'undefined' && typeof window.ApproNextGen.autoLinkBcsAndDps === 'function') {
          try { window.ApproNextGen.autoLinkBcsAndDps(); } catch (e) {}
        }

        // Cache to localStorage AFTER state is fully populated
        if (typeof window.saveState === 'function') {
          try { window.saveState(); } catch (e) {}
        }

        // Render AFTER state is populated with server data
        if (typeof window.renderApp === 'function') {
          try { window.renderApp(); } catch (e) {}
        }
        if (typeof window.renderActiveTab === 'function') {
          try { window.renderActiveTab(); } catch (e) {}
        }
        if (typeof window.refreshFollowupFilterOptions === 'function') {
          try { window.refreshFollowupFilterOptions(); } catch (e) {}
        }
        if (typeof window.renderKpi === 'function') {
          try { window.renderKpi(); } catch (e) {}
        }

        // FIX 2: Show toast confirming data loaded from MongoDB
        showToast('Données chargées depuis MongoDB (' + bcRecords.length + ' BC, ' + payments.length + ' paiements)');
      }

      _bcDataLoaded = true;
      return { bcRecords: bcRecords, payments: payments };
    } catch (e) {
      console.warn('[BC-BRIDGE] Failed to hydrate from server:', e.message);
      return null;
    }
  }

  var loadBcFromServer = hydrateFromServer;

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

  // ─── Auto-migrate local storage data to MongoDB Atlas ───────
  async function migrateLocalToAtlas() {
    if (!getToken()) return { success: false, reason: 'unauthenticated' };
    try {
      var localBcs = [];
      var localPayments = [];
      var keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12', 'suivi_local_v11'];
      for (var i = 0; i < keys.length; i++) {
        try {
          var raw = localStorage.getItem(keys[i]);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.bcRecords) && parsed.bcRecords.length > localBcs.length) {
              localBcs = parsed.bcRecords;
            }
            if (parsed && Array.isArray(parsed.payments) && parsed.payments.length > localPayments.length) {
              localPayments = parsed.payments;
            }
          }
        } catch (e) {}
      }

      if (localBcs.length === 0 && localPayments.length === 0) {
        return { success: true, count: 0 };
      }

      var cleanBc = localBcs.map(function(r) {
        var d = Object.assign({}, r);
        delete d.id;
        delete d._id;
        return d;
      });

      var cleanPay = localPayments.map(function(p) {
        var d = Object.assign({}, p);
        delete d.id;
        delete d._id;
        return d;
      });

      var results = await Promise.all([
        cleanBc.length > 0 ? apiRequest('POST', '/api/bc/bulk', { bcRecords: cleanBc }).catch(function(e) { return { error: e.message }; }) : { upserted: 0 },
        cleanPay.length > 0 ? apiRequest('POST', '/api/payments/bulk', { payments: cleanPay }).catch(function(e) { return { error: e.message }; }) : { upserted: 0 }
      ]);

      console.log('[BC-BRIDGE] Auto-migration to Atlas completed:', results);
      return { success: true, migratedBcs: cleanBc.length, migratedPayments: cleanPay.length };
    } catch (err) {
      console.warn('[BC-BRIDGE] Auto-migration notice:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── On page load: auto-migrate local data then hydrate from Atlas ─
  async function initBcBridge() {
    if (!getToken()) return;
    try {
      await migrateLocalToAtlas();
      await hydrateFromServer();
    } catch (e) {
      console.warn('[BC-BRIDGE] Init error:', e.message);
    }
  }

  // Merge local + server arrays, dedup by key field
  function mergeRecords(local, server, keyField) {
    var map = {};
    for (var i = 0; i < server.length; i++) {
      var key = server[i][keyField] || server[i].id || server[i]._id;
      if (key) map[key] = server[i];
    }
    for (var j = 0; j < local.length; j++) {
      var lkey = local[j][keyField] || local[j].id;
      if (lkey && !map[lkey]) {
        map[lkey] = local[j];
      }
    }
    return Object.values(map);
  }

  // FIX 2: Wait for DOM ready, then hydrate IMMEDIATELY (no 1500ms delay)
  function bootBridge() {
    if (getToken()) {
      // Hydrate immediately — no delay
      initBcBridge();
    } else {
      // No token means init() already redirected to /?redirect=bc
      // But keep a fallback poll in case token arrives after boot
      var checkInterval = setInterval(function() {
        if (getToken()) {
          clearInterval(checkInterval);
          initBcBridge();
        }
      }, 3000);
      // Stop checking after 2 minutes
      setTimeout(function() { clearInterval(checkInterval); }, 120000);
    }
  }

  // Expose bridge globally
  var bcBridge = {
    hydrateFromServer: hydrateFromServer,
    syncBcToServer: syncBcToServer,
    migrateLocalToAtlas: migrateLocalToAtlas,
    loadBcFromServer: hydrateFromServer
  };
  if (typeof window !== 'undefined') {
    window.bcBridge = bcBridge;
    window.SuiviBcBridge = window.SuiviBcBridge || bcBridge;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBridge);
  } else {
    bootBridge();
  }

  console.log('[BC-BRIDGE] BC API Bridge loaded — will sync BC & payments to MongoDB');
})();
