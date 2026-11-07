/* ============================================================
   CORE-API-BRIDGE.JS — ROBUST MongoDB Sync for ERP Douroub v6
   Strategy: Bidirectional merge on login, bulk upsert on save
   NEVER replaces local data with empty server data
   ============================================================ */

(function() {
  'use strict';

  var _serverDataLoaded = false;
  var _loadingPromise = null;
  var _syncTimer = null;
  var _syncInProgress = false;

  // ─── Override DB.save() — queue FULL sync to server ──────────
  var _originalSave = DB.save.bind(DB);
  DB.save = function() {
    _originalSave();
    _queueFullSync();
  };

  // ─── Debounced FULL sync — pushes ALL articles + settings ───
  var _fullSyncTimer = null;
  function _queueFullSync() {
    if (_fullSyncTimer) clearTimeout(_fullSyncTimer);
    _fullSyncTimer = setTimeout(_performFullSync, 3000);
  }

  async function _performFullSync() {
    if (!API.getToken() || _syncInProgress) return;
    _syncInProgress = true;
    try {
      // Push ALL articles via bulk upsert
      var articles = DB.data.articles || [];
      if (articles.length > 0) {
        await _pushArticlesToServer(articles);
      }
      // Push settings
      await _syncSettings();
    } catch (e) {
      console.warn('[BRIDGE] Full sync error:', e);
    } finally {
      _syncInProgress = false;
    }
  }

  // ─── Override DB.init() — no change needed ──────────────────
  var _originalInit = DB.init.bind(DB);
  DB.init = function() {
    _originalInit();
  };

  // ─── Site Name Normalization Helper ────────────────────────
  function _sanitizeSiteName(site) {
    if (!site || typeof site !== 'string') return 'Dépôt Central';
    var s = site.trim();
    if (!s || s === 'site_default') return 'Dépôt Central';
    if (/d(?:[\ufffd\?e\xE9]|Ã©)p?(?:[\ufffd\?o\xF4]|Ã´)?t.*central/i.test(s) || /d[\ufffd\?]+p?[\ufffd\?]*t/i.test(s) || s.includes('Ã©') || s.includes('\ufffd') || s.includes('? Central')) {
      return 'Dépôt Central';
    }
    return s;
  }

  // ─── ROBUST Server Data Loader ─────────────────────────────
  DB.loadFromServer = async function() {
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = _doLoadFromServer();
    return _loadingPromise;
  };

  async function _doLoadFromServer() {
    try {
      console.log('[BRIDGE] Loading data from server...');

      var results = await Promise.all([
        API.articles.getAll({ limit: 10000 }).catch(function() { return { articles: [] }; }),
        API.settings.get().catch(function() { return { settings: {} }; }),
        API.fleet.getAll().catch(function() { return { vehicles: [] }; }),
        API.citernes.getAll().catch(function() { return { citernes: [] }; }),
        API.bt.getAll().catch(function() { return { bons: [] }; }),
        API.orders.getAll({ limit: 5000 }).catch(function() { return { orders: [] }; }),
        API.decharges.getAll({ limit: 5000 }).catch(function() { return { decharges: [] }; }),
        API.movements.getAll({ limit: 5000 }).catch(function() { return { movements: [] }; })
      ]);

      var articlesRes = results[0];
      var settingsRes = results[1];
      var fleetRes = results[2];
      var citernesRes = results[3];
      var bonsRes = results[4];
      var ordersRes = results[5];
      var dechargesRes = results[6];
      var movementsRes = results[7];

      var mapId = function(item) {
        if (item._id && !item.id) item.id = item._id;
        return item;
      };

      var serverArticles = Array.isArray(articlesRes.articles) ? articlesRes.articles.map(mapId) : [];
      var localArticles = DB.data.articles || [];

      // ═══ MERGE STRATEGY: Never lose data ═══
      // If server has data → merge (server wins on conflicts by code)
      // If server is empty but local has data → PUSH local to server
      // If both empty → nothing to do

      if (serverArticles.length > 0) {
        DB.data.articles = _mergeByField(localArticles, serverArticles, 'code');
        console.log('[BRIDGE] Merged articles: local=' + localArticles.length + ' server=' + serverArticles.length + ' → ' + DB.data.articles.length);
      } else if (localArticles.length > 0) {
        console.log('[BRIDGE] Server empty, keeping ' + localArticles.length + ' local articles and pushing to server...');
        DB.data.articles = localArticles;
        _pushArticlesToServer(localArticles);
      }

      // Normalize article site values: convert site IDs to site names & sanitize corrupted strings
      var allArticles = DB.data.articles || [];
      var sitesRepaired = false;
      if (allArticles.length > 0) {
        var siteSettings = (DB.data.settings && DB.data.settings.stockSites) || [];
        var siteIdToName = {};
        for (var si = 0; si < siteSettings.length; si++) {
          siteIdToName[siteSettings[si].id] = siteSettings[si].name;
        }
        for (var ai = 0; ai < allArticles.length; ai++) {
          var artSite = allArticles[ai].site;
          if (artSite && siteIdToName[artSite]) {
            artSite = siteIdToName[artSite];
          }
          var sanitized = _sanitizeSiteName(artSite);
          if (allArticles[ai].site !== sanitized) {
            allArticles[ai].site = sanitized;
            sitesRepaired = true;
          }
        }
        if (sitesRepaired && API.getToken()) {
          _queueFullSync();
        }
      }

      // Settings: merge, don't replace if server is empty
      if (settingsRes.settings && Object.keys(settingsRes.settings).length > 1) {
        var ss = settingsRes.settings;
        var ls = DB.data.settings || {};
        DB.data.settings = {
          ...ls,
          stockZones: (ss.stockZones && ss.stockZones.length > 0) ? ss.stockZones : ls.stockZones,
          stockSites: (ss.stockSites && ss.stockSites.length > 0) ? ss.stockSites : ls.stockSites,
          stockSections: (ss.stockSections && ss.stockSections.length > 0) ? ss.stockSections : ls.stockSections,
          categories: ss.articleCategories || ls.categories,
          articleCategories: ss.articleCategories || ls.articleCategories,
          families: ss.articleFamilies || ls.families,
          units: ss.units || ls.units,
          departments: ss.departments || ls.departments,
          services: ss.services || ls.services,
          materialFamilies: ss.materialFamilies || ls.materialFamilies,
          categoryPrefixes: ss.categoryPrefixes || ls.categoryPrefixes,
          companyLogoLeft: ss.companyLogoLeft || '',
          companyLogoRight: ss.companyLogoRight || '',
          logoLeft: ss.companyLogoLeft || '',
          leftLogo: ss.companyLogoLeft || '',
          logoRight: ss.companyLogoRight || '',
          rightLogo: ss.companyLogoRight || '',
          companyName: ss.companyName || ls.companyName,
          gdsEnabled: ss.gdsEnabled !== undefined ? ss.gdsEnabled : ls.gdsEnabled,
          lowStockAlertEnabled: ss.lowStockAlertEnabled !== undefined ? ss.lowStockAlertEnabled : true
        };
      }

      // Fleet, citernes, orders, etc — same merge logic
      var serverFleet = Array.isArray(fleetRes.vehicles) ? fleetRes.vehicles.map(mapId) : [];
      if (serverFleet.length > 0) {
        DB.data.materials = _mergeByField(DB.data.materials || [], serverFleet, 'id');
      }

      var serverCiternes = Array.isArray(citernesRes.citernes) ? citernesRes.citernes.map(mapId) : [];
      if (serverCiternes.length > 0) {
        DB.data.citernes = _mergeByField(DB.data.citernes || [], serverCiternes, 'id');
      }

      var serverBons = Array.isArray(bonsRes.bons) ? bonsRes.bons.map(mapId) : [];
      if (serverBons.length > 0) {
        DB.data.workPlans = _mergeByField(DB.data.workPlans || [], serverBons, 'id');
      }

      var serverOrders = Array.isArray(ordersRes.orders) ? ordersRes.orders.map(mapId) : [];
      if (serverOrders.length > 0) {
        DB.data.preOrders = _mergeByField(DB.data.preOrders || [], serverOrders, 'id');
      }

      var serverDecharges = Array.isArray(dechargesRes.decharges) ? dechargesRes.decharges.map(function(item) {
        mapId(item);
        var isBsm = Boolean((item.ref && String(item.ref).toUpperCase().startsWith('BSM')) || item.type === 'BSM' || item.typeDoc === 'bsm' || item.workPlanId || item.materialId);
        item.typeDoc = isBsm ? 'bsm' : (item.typeDoc || 'decharge');
        item.type = isBsm ? 'BSM' : (item.type || 'Décharge');
        var dVal = item.date || item.servedAt || item.createdAt || item.dateDecharge;
        if (!dVal || dVal === 'Invalid Date' || isNaN(new Date(dVal).getTime())) {
          var m = item.ref && String(item.ref).match(/(\d{4})(\d{2})(\d{2})/);
          item.date = m ? new Date(m[1] + '-' + m[2] + '-' + m[3]).toISOString() : new Date().toISOString();
        } else {
          item.date = new Date(dVal).toISOString();
        }
        return item;
      }) : [];
      if (serverDecharges.length > 0) {
        DB.data.decharges = _mergeByField(DB.data.decharges || [], serverDecharges, 'id');
      }

      var serverMovements = Array.isArray(movementsRes.movements) ? movementsRes.movements.map(mapId) : [];
      if (serverMovements.length > 0) {
        DB.data.stockMovements = _mergeByField(DB.data.stockMovements || [], serverMovements, 'id');
      }

      _originalSave();
      _serverDataLoaded = true;

      console.log('[BRIDGE] ✅ Data loaded — Articles:', DB.data.articles.length,
        '| Fleet:', (DB.data.materials || []).length,
        '| Orders:', (DB.data.preOrders || []).length);

      // FIX 3: Trigger full re-render of articles list after server data loads
      try {
        if (typeof window !== 'undefined') {
          if (typeof window.renderArticles === 'function') window.renderArticles();
          if (typeof window.renderInventory === 'function') window.renderInventory();
          if (typeof window.refreshView === 'function') window.refreshView();
          if (typeof window.App !== 'undefined' && typeof window.App.refreshCurrentModule === 'function') {
            window.App.refreshCurrentModule();
          }
          // Dispatch a custom event so modules can react
          try {
            window.dispatchEvent(new CustomEvent('erp:dataLoaded', { detail: { articles: DB.data.articles.length } }));
          } catch (e2) {}
        }
      } catch (renderErr) {
        console.warn('[BRIDGE] Re-render after load failed:', renderErr);
      }

    } catch (err) {
      console.error('[BRIDGE] ❌ Failed to load from server:', err);
    } finally {
      _loadingPromise = null;
    }
  }

  // ─── Merge two arrays by a key field (server wins) ─────────
  function _mergeByField(localArr, serverArr, keyField) {
    var map = {};
    // Local items first
    for (var i = 0; i < localArr.length; i++) {
      var lk = localArr[i][keyField] || localArr[i]._id || localArr[i].id;
      if (lk) map[lk] = localArr[i];
    }
    // Server items override
    for (var j = 0; j < serverArr.length; j++) {
      var sk = serverArr[j][keyField] || serverArr[j]._id || serverArr[j].id;
      if (sk) map[sk] = serverArr[j];
    }
    return Object.values(map);
  }

  // ─── Push local articles to server (bulk upsert) ───────────
  async function _pushArticlesToServer(articles) {
    if (!API.getToken() || articles.length === 0) return;
    try {
      var cleanArticles = articles.map(function(a) {
        var c = Object.assign({}, a);
        delete c.id;
        delete c._id;
        delete c.__v;
        c.site = _sanitizeSiteName(c.site);
        return c;
      });
      var res = await API.post('/api/articles/bulk', { articles: cleanArticles });
      console.log('[BRIDGE] Pushed ' + articles.length + ' articles to server:', res);
      if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification('✅ ' + articles.length + ' articles synchronisés avec le serveur', 'success');
      }
    } catch (e) {
      console.error('[BRIDGE] Failed to push articles:', e.message);
      if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification('⚠️ Sync articles échouée: ' + e.message, 'error');
      }
    }
  }

  // ─── Settings-only sync helper ──────────────────────────────
  async function _syncSettings() {
    if (!API.getToken()) return;
    try {
      var settings = DB.data.settings;
      if (settings) {
        await API.settings.update({
          stockZones: settings.stockZones || [],
          stockSites: settings.stockSites || [],
          stockSections: settings.stockSections || [],
          articleCategories: settings.categories || settings.articleCategories || [],
          articleFamilies: settings.families || settings.articleFamilies || [],
          units: settings.units || [],
          departments: settings.departments || [],
          services: settings.services || [],
          materialFamilies: settings.materialFamilies || [],
          categoryPrefixes: settings.categoryPrefixes || {},
          companyName: settings.companyName || '',
          companyLogoLeft: settings.companyLogoLeft || settings.leftLogo || settings.logoLeft || '',
          companyLogoRight: settings.companyLogoRight || settings.rightLogo || settings.logoRight || '',
          gdsEnabled: settings.gdsEnabled || false,
          lowStockAlertEnabled: settings.lowStockAlertEnabled !== false
        }).catch(function(e) { console.warn('[BRIDGE] Settings sync failed:', e.message); });
      }
    } catch (e) {
      console.warn('[BRIDGE] Settings sync error:', e);
    }
  }

  // ─── Override Auth.login() — use API auth ──────────────────
  var _originalLogin = Auth.login.bind(Auth);
  Auth.login = async function(username, password) {
    try {
      var data = await API.auth.login(username, password);
      if (data && data.user) {
        var u = data.user;
        this.currentUser = {
          id: u._id || u.id,
          username: u.username,
          role: u.role,
          name: u.name,
          department: u.department || 'Direction Générale',
          service: u.service || u.department || '',
          canDeductStock: u.canDeductStock !== undefined ? u.canDeductStock : true,
          gdsOption: u.gdsOption || 'none',
          qualite: u.qualite || 'Agent'
        };

        try {
          var serialized = JSON.stringify(this.currentUser);
          localStorage.setItem('erp_currentUser', serialized);
          localStorage.setItem('erp_douroub_session', serialized);
          localStorage.setItem('sde_user_role', this.currentUser.role);
          sessionStorage.setItem('erp_currentUser', serialized);
          sessionStorage.setItem('erp_douroub_session', serialized);
        } catch(e) {}

        // Update GDS scanner visibility
        _updateGdsVisibility();

        // Load data from server after successful login
        await DB.loadFromServer();
        API.sse.connect();

        return true;
      }
      return false;
    } catch (err) {
      console.error('[BRIDGE] Login failed:', err.message);
      // Propagate rate limit and auth errors
      if (err && (err.status === 429 || err.remaining !== undefined || err.status === 401)) {
        throw err;
      }
      // Fallback to local auth for offline mode
      return _originalLogin(username, password);
    }
  };

  // ─── Override Auth.logout() — clear JWT ─────────────────────
  var _originalLogout = Auth.logout.bind(Auth);
  Auth.logout = function() {
    API.clearToken();
    API.sse.disconnect();
    _serverDataLoaded = false;
    _originalLogout();
  };

  // ─── Override Auth.init() — restore from JWT ────────────────
  var _originalAuthInit = Auth.init.bind(Auth);
  Auth.init = async function() {
    var token = API.getToken();
    if (token) {
      try {
        var data = await API.auth.me();
        if (data && data.user) {
          var u = data.user;
          this.currentUser = {
            id: u._id || u.id,
            username: u.username,
            role: u.role,
            name: u.name,
            department: u.department || 'Direction Générale',
            service: u.service || u.department || '',
            canDeductStock: u.canDeductStock !== undefined ? u.canDeductStock : true,
            gdsOption: u.gdsOption || 'none',
            qualite: u.qualite || 'Agent'
          };

          try {
            var serialized = JSON.stringify(this.currentUser);
            localStorage.setItem('erp_currentUser', serialized);
            localStorage.setItem('erp_douroub_session', serialized);
          } catch(e) {}

          await DB.loadFromServer();
          API.sse.connect();
          _updateGdsVisibility();
          return;
        }
      } catch (e) {
        console.warn('[BRIDGE] JWT restore failed:', e.message);
        API.clearToken();
      }
    }
    _originalAuthInit();
  };

  // ─── GDS visibility helper ─────────────────────────────────
  function _updateGdsVisibility() {
    if (typeof window.isUserEligibleForGdsScan === 'function') {
      var isEligible = window.isUserEligibleForGdsScan();
      var ids = ['btnHeaderGdsScanner', 'fabGdsScanner', 'btnGdsScan', 'udropGdsScanLink'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.style.display = isEligible ? (ids[i] === 'fabGdsScanner' ? 'flex' : 'inline-flex') : 'none';
      }
    }
  }

  // ─── Override article CRUD to sync to server ───────────────
  var _originalInsert = DB.insert.bind(DB);
  DB.insert = function(col, item, note) {
    var result = _originalInsert(col, item, note);
    if (API.getToken()) {
      _syncCollectionItem('insert', col, result);
    }
    return result;
  };

  var _originalUpdate = DB.update.bind(DB);
  DB.update = function(col, id, updates, note) {
    var result = _originalUpdate(col, id, updates, note);
    if (API.getToken() && result) {
      _syncCollectionItem('update', col, result);
    }
    return result;
  };

  var _originalDelete = DB.delete.bind(DB);
  DB.delete = function(col, id, note) {
    var item = DB.getById(col, id);
    var serverId = item ? (item._id || item.id) : id;
    var result = _originalDelete(col, id, note);
    if (API.getToken() && result) {
      _syncCollectionItem('delete', col, { id: serverId, _id: serverId });
    }
    return result;
  };

  // ─── Sync individual collection items to server ─────────────
  async function _syncCollectionItem(action, col, item) {
    var apiMap = {
      'articles': API.articles,
      'materials': API.fleet,
      'citernes': API.citernes,
      'preOrders': API.orders,
      'decharges': API.decharges,
      'workPlans': API.bt
    };

    var api = apiMap[col];
    if (!api) return;

    var serverId = item._id || item.id;

    try {
      if (action === 'insert') {
        var cleanItem = Object.assign({}, item);
        delete cleanItem.id;
        delete cleanItem._id;
        if (col === 'articles') {
          cleanItem.site = _sanitizeSiteName(cleanItem.site);
        }
        var res = await api.create(cleanItem);
        var arr = DB.data[col];
        if (arr) {
          var idx = arr.findIndex(function(i) { return i.id === item.id; });
          if (idx > -1 && res) {
            var created = res.article || res.vehicle || res.citerne || res.order || res.decharge || res.bon;
            if (created && created._id) {
              arr[idx]._id = created._id;
              _originalSave();
            }
          }
        }
        console.log('[BRIDGE] ✅ Synced INSERT', col);
      } else if (action === 'update') {
        var cleanUp = Object.assign({}, item);
        delete cleanUp.id;
        delete cleanUp._id;
        if (col === 'articles') {
          cleanUp.site = _sanitizeSiteName(cleanUp.site);
        }
        if (serverId) {
          await api.update(serverId, cleanUp).catch(function() {});
        }
        console.log('[BRIDGE] ✅ Synced UPDATE', col);
      } else if (action === 'delete') {
        if (serverId) {
          await api.remove(serverId).catch(function() {});
        }
        console.log('[BRIDGE] ✅ Synced DELETE', col);
      }
    } catch (e) {
      console.error('[BRIDGE] ❌ Sync FAILED for', col, action, ':', e.message);
      if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification('⚠️ Sync serveur échouée (' + col + '): ' + e.message, 'error');
      }
      // If insert failed, try bulk push as fallback
      if (action === 'insert' && col === 'articles') {
        console.log('[BRIDGE] Retrying via bulk upsert...');
        _pushArticlesToServer(DB.data.articles || []);
      }
    }
  }

  // ─── SSE listener for real-time updates ─────────────────────
  API.sse.onUpdate(function(event) {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'stock_changed': {
        var d = event.data;
        if (d && d.id) {
          var articles = DB.data.articles || [];
          var idx = articles.findIndex(function(a) { return a._id === d.id || a.id === d.id; });
          if (idx > -1) {
            articles[idx].quantity = d.quantity;
            _originalSave();
            if (window.Modules && typeof Modules.refreshCurrentView === 'function') {
              Modules.refreshCurrentView();
            }
          }
        }
        break;
      }
      case 'article_created':
      case 'article_updated':
      case 'article_deleted':
      case 'order_created':
      case 'order_updated':
      case 'settings_updated': {
        if (!DB._reloadTimer) {
          DB._reloadTimer = setTimeout(async function() {
            DB._reloadTimer = null;
            await DB.loadFromServer();
            if (window.Modules && typeof Modules.refreshCurrentView === 'function') {
              Modules.refreshCurrentView();
            }
          }, 3000);
        }
        break;
      }
    }
  });

  // ─── Atomic stock adjustment ────────────────────────────────
  DB.adjustStockAtomic = async function(articleId, type, quantity, reason, reference) {
    if (!API.getToken()) {
      var article = this.getById('articles', articleId);
      if (!article) throw new Error('Article non trouvé');
      var prev = article.quantity || 0;
      var delta = type === 'Entrée' ? quantity : -quantity;
      if (prev + delta < 0) {
        throw { error: 'Stock insuffisant', currentQuantity: prev, requested: quantity };
      }
      article.quantity = prev + delta;
      this.update('articles', articleId, { quantity: article.quantity });
      return article;
    }

    var serverId = (function() {
      var a = DB.getById('articles', articleId);
      return a ? (a._id || a.id) : articleId;
    })();

    var res = await API.articles.adjustStock(serverId, type, quantity, reason, reference);

    if (res.article) {
      var articles2 = this.data.articles || [];
      var idx2 = articles2.findIndex(function(a) { return a._id === serverId || a.id === articleId; });
      if (idx2 > -1) {
        articles2[idx2].quantity = res.article.quantity;
        _originalSave();
      }
    }

    return res.article;
  };

  // ─── Image upload helper ───────────────────────────────────
  DB.uploadArticleImage = async function(articleId, fileOrBase64) {
    var serverId = (function() {
      var a = DB.getById('articles', articleId);
      return a ? (a._id || a.id) : articleId;
    })();

    var res;
    if (typeof fileOrBase64 === 'string') {
      res = await API.upload.articleImageBase64(serverId, fileOrBase64);
    } else {
      res = await API.upload.articleImage(serverId, fileOrBase64);
    }

    if (typeof fileOrBase64 === 'string') {
      var articles3 = this.data.articles || [];
      var idx3 = articles3.findIndex(function(a) { return a._id === serverId || a.id === articleId; });
      if (idx3 > -1) {
        articles3[idx3].image = fileOrBase64;
        _originalSave();
      }
    }

    return res;
  };

  // ─── Backup helpers ────────────────────────────────────────
  DB.triggerBackup = async function() { return API.backup.trigger(); };
  DB.listBackups = async function() { return API.backup.list(); };
  DB.downloadBackup = async function(id) { return API.backup.download(id); };

  // ─── Manual full sync button ───────────────────────────────
  DB.forceSyncToServer = async function() {
    if (!API.getToken()) {
      if (typeof Utils !== 'undefined') Utils.showNotification('Non connecté', 'error');
      return;
    }
    try {
      if (typeof Utils !== 'undefined') Utils.showNotification('Synchronisation en cours...', 'info');
      await _pushArticlesToServer(DB.data.articles || []);
      await _syncSettings();
      if (typeof Utils !== 'undefined') Utils.showNotification('✅ Synchronisation complète !', 'success');
    } catch (e) {
      if (typeof Utils !== 'undefined') Utils.showNotification('❌ Erreur: ' + e.message, 'error');
    }
  };

  console.log('[BRIDGE] ✅ Core API Bridge loaded — ROBUST bidirectional MongoDB sync');
})();
