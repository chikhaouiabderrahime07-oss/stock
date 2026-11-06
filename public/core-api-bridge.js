/* ============================================================
   CORE-API-BRIDGE.JS — Patches DB and Auth to use REST API
   Loaded AFTER core.js and api.js
   Keeps same synchronous interface via local data cache
   ============================================================ */

(function() {
  'use strict';

  // ─── Track if data has been loaded from server ──────────────
  let _serverDataLoaded = false;
  let _loadingPromise = null;
  let _syncQueue = [];
  let _syncTimer = null;

  // ─── Override DB.save() — queue sync to server ──────────────
  const _originalSave = DB.save.bind(DB);
  DB.save = function() {
    // Keep localStorage as fast cache (session only)
    _originalSave();
    // Queue API sync (debounced)
    _queueSync();
  };

  // ─── Override DB.init() — load from server on startup ───────
  const _originalInit = DB.init.bind(DB);
  DB.init = function() {
    // First, run original init to set up data structure from localStorage cache
    _originalInit();
  };

  // ─── Server data loader — called after login ───────────────
  DB.loadFromServer = async function() {
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = _doLoadFromServer();
    return _loadingPromise;
  };

  async function _doLoadFromServer() {
    try {
      console.log('[BRIDGE] Loading data from server...');

      const [
        articlesRes,
        settingsRes,
        fleetRes,
        citernesRes,
        bonsRes,
        ordersRes,
        dechargesRes,
        movementsRes
      ] = await Promise.all([
        API.articles.getAll({ limit: 10000 }).catch(e => ({ articles: [] })),
        API.settings.get().catch(e => ({ settings: {} })),
        API.fleet.getAll().catch(e => ({ vehicles: [] })),
        API.citernes.getAll().catch(e => ({ citernes: [] })),
        API.bt.getAll().catch(e => ({ bons: [] })),
        API.orders.getAll({ limit: 5000 }).catch(e => ({ orders: [] })),
        API.decharges.getAll({ limit: 5000 }).catch(e => ({ decharges: [] })),
        API.movements.getAll({ limit: 5000 }).catch(e => ({ movements: [] }))
      ]);

      // Map MongoDB _id to id for backwards compatibility
      const mapId = (item) => {
        if (item._id && !item.id) item.id = item._id;
        return item;
      };

      // Merge server data into DB.data
      if (Array.isArray(articlesRes.articles)) {
        DB.data.articles = articlesRes.articles.map(mapId);
      }

      if (settingsRes.settings && Object.keys(settingsRes.settings).length > 0) {
        const serverSettings = settingsRes.settings;
        // Map MongoDB Setting fields to local settings format
        DB.data.settings = {
          ...DB.data.settings,
          stockZones: (serverSettings.stockZones && serverSettings.stockZones.length > 0) ? serverSettings.stockZones : DB.data.settings.stockZones,
          stockSites: (serverSettings.stockSites && serverSettings.stockSites.length > 0) ? serverSettings.stockSites : DB.data.settings.stockSites,
          stockSections: (serverSettings.stockSections && serverSettings.stockSections.length > 0) ? serverSettings.stockSections : DB.data.settings.stockSections,
          categories: serverSettings.articleCategories || DB.data.settings.categories,
          articleCategories: serverSettings.articleCategories || DB.data.settings.articleCategories,
          families: serverSettings.articleFamilies || DB.data.settings.families,
          units: serverSettings.units || DB.data.settings.units,
          departments: serverSettings.departments || DB.data.settings.departments,
          services: serverSettings.services || DB.data.settings.services,
          materialFamilies: serverSettings.materialFamilies || DB.data.settings.materialFamilies,
          categoryPrefixes: serverSettings.categoryPrefixes || DB.data.settings.categoryPrefixes,
          companyLogoLeft: serverSettings.companyLogoLeft || '',
          companyLogoRight: serverSettings.companyLogoRight || '',
          logoLeft: serverSettings.companyLogoLeft || '',
          leftLogo: serverSettings.companyLogoLeft || '',
          logoRight: serverSettings.companyLogoRight || '',
          rightLogo: serverSettings.companyLogoRight || '',
          companyName: serverSettings.companyName || DB.data.settings.companyName,
          gdsEnabled: serverSettings.gdsEnabled !== undefined ? serverSettings.gdsEnabled : DB.data.settings.gdsEnabled,
          lowStockAlertEnabled: serverSettings.lowStockAlertEnabled !== undefined ? serverSettings.lowStockAlertEnabled : true
        };
      }

      if (Array.isArray(fleetRes.vehicles)) {
        DB.data.materials = fleetRes.vehicles.map(mapId);
      }

      if (Array.isArray(citernesRes.citernes)) {
        DB.data.citernes = citernesRes.citernes.map(mapId);
      }

      if (Array.isArray(bonsRes.bons)) {
        DB.data.workPlans = bonsRes.bons.map(mapId);
      }

      if (Array.isArray(ordersRes.orders)) {
        DB.data.preOrders = ordersRes.orders.map(mapId);
      }

      if (Array.isArray(dechargesRes.decharges)) {
        DB.data.decharges = dechargesRes.decharges.map(mapId);
      }

      if (Array.isArray(movementsRes.movements)) {
        DB.data.stockMovements = movementsRes.movements.map(mapId);
      }

      // Save to localStorage as cache
      _originalSave();
      _serverDataLoaded = true;
      console.log('[BRIDGE] Server data loaded successfully');
      console.log('[BRIDGE] Articles:', DB.data.articles.length,
        '| Fleet:', DB.data.materials.length,
        '| Orders:', DB.data.preOrders.length);

    } catch (err) {
      console.error('[BRIDGE] Failed to load from server:', err);
      // Fall back to localStorage cache — app still works offline
    } finally {
      _loadingPromise = null;
    }
  }

  // ─── Sync local changes to server (debounced) ──────────────
  function _queueSync() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(_performSync, 2000);
  }

  async function _performSync() {
    if (!API.getToken()) return;
    // Settings sync — always push settings changes
    try {
      const settings = DB.data.settings;
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
        }).catch(e => console.warn('[BRIDGE] Settings sync failed:', e.message));
      }
    } catch (e) {
      console.warn('[BRIDGE] Sync error:', e);
    }
  }

  // ─── Override Auth.login() — use API auth ──────────────────
  const _originalLogin = Auth.login.bind(Auth);
  Auth.login = async function(username, password) {
    try {
      const data = await API.auth.login(username, password);
      if (data && data.user) {
        const u = data.user;
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
          const serialized = JSON.stringify(this.currentUser);
          localStorage.setItem('erp_currentUser', serialized);
          localStorage.setItem('erp_douroub_session', serialized);
          localStorage.setItem('sde_user_role', this.currentUser.role);
          sessionStorage.setItem('erp_currentUser', serialized);
          sessionStorage.setItem('erp_douroub_session', serialized);
        } catch(e) {}

        // Update GDS scanner visibility
        if (typeof window.isUserEligibleForGdsScan === 'function') {
          const isEligible = window.isUserEligibleForGdsScan();
          const btnHead = document.getElementById('btnHeaderGdsScanner');
          const btnFab = document.getElementById('fabGdsScanner');
          const btnQuick = document.getElementById('btnGdsScan');
          const udropLink = document.getElementById('udropGdsScanLink');
          if (btnHead) btnHead.style.display = isEligible ? 'inline-flex' : 'none';
          if (btnFab) btnFab.style.display = isEligible ? 'flex' : 'none';
          if (btnQuick) btnQuick.style.display = isEligible ? 'inline-flex' : 'none';
          if (udropLink) udropLink.style.display = isEligible ? 'flex' : 'none';
        }

        // Load data from server after successful login
        await DB.loadFromServer();

        // Connect SSE for real-time updates
        API.sse.connect();

        return true;
      }
      return false;
    } catch (err) {
      console.error('[BRIDGE] Login failed:', err.message);
      if (err && (err.status === 429 || err.remaining !== undefined || (err.message && err.message.toLowerCase().includes('tentatives')))) {
        throw err;
      }
      if (err && err.status === 401) {
        throw err;
      }
      // Fallback to local auth for offline mode
      return _originalLogin(username, password);
    }
  };

  // ─── Override Auth.logout() — clear JWT ─────────────────────
  const _originalLogout = Auth.logout.bind(Auth);
  Auth.logout = function() {
    API.clearToken();
    API.sse.disconnect();
    _serverDataLoaded = false;
    _originalLogout();
  };

  // ─── Override Auth.init() — restore from JWT ────────────────
  const _originalAuthInit = Auth.init.bind(Auth);
  Auth.init = async function() {
    // First try JWT-based restore
    const token = API.getToken();
    if (token) {
      try {
        const data = await API.auth.me();
        if (data && data.user) {
          const u = data.user;
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
            const serialized = JSON.stringify(this.currentUser);
            localStorage.setItem('erp_currentUser', serialized);
            localStorage.setItem('erp_douroub_session', serialized);
          } catch(e) {}

          // Load data from server
          await DB.loadFromServer();
          API.sse.connect();

          // Update GDS scanner visibility on session restore
          if (typeof window.isUserEligibleForGdsScan === 'function') {
            const isEligible = window.isUserEligibleForGdsScan();
            const btnHead = document.getElementById('btnHeaderGdsScanner');
            const btnFab = document.getElementById('fabGdsScanner');
            const btnQuick = document.getElementById('btnGdsScan');
            const udropLink = document.getElementById('udropGdsScanLink');
            if (btnHead) btnHead.style.display = isEligible ? 'inline-flex' : 'none';
            if (btnFab) btnFab.style.display = isEligible ? 'flex' : 'none';
            if (btnQuick) btnQuick.style.display = isEligible ? 'inline-flex' : 'none';
            if (udropLink) udropLink.style.display = isEligible ? 'flex' : 'none';
          }

          return;
        }
      } catch (e) {
        console.warn('[BRIDGE] JWT restore failed:', e.message);
        API.clearToken();
      }
    }
    // Fallback to original localStorage-based init
    _originalAuthInit();
  };

  // ─── Override article CRUD to also sync to server ──────────
  const _originalInsert = DB.insert.bind(DB);
  DB.insert = function(col, item, note) {
    const result = _originalInsert(col, item, note);
    // Async sync to server
    if (API.getToken()) {
      _syncCollectionItem('insert', col, result);
    }
    return result;
  };

  const _originalUpdate = DB.update.bind(DB);
  DB.update = function(col, id, updates, note) {
    const result = _originalUpdate(col, id, updates, note);
    if (API.getToken() && result) {
      _syncCollectionItem('update', col, result);
    }
    return result;
  };

  const _originalDelete = DB.delete.bind(DB);
  DB.delete = function(col, id, note) {
    // Get the item's server ID before deleting
    const item = DB.getById(col, id);
    const serverId = item ? (item._id || item.id) : id;
    const result = _originalDelete(col, id, note);
    if (API.getToken() && result) {
      _syncCollectionItem('delete', col, { id: serverId, _id: serverId });
    }
    return result;
  };

  // ─── Sync individual collection items to server ─────────────
  async function _syncCollectionItem(action, col, item) {
    const apiMap = {
      'articles': API.articles,
      'materials': API.fleet,
      'citernes': API.citernes,
      'preOrders': API.orders,
      'decharges': API.decharges,
      'workPlans': API.bt
    };

    const api = apiMap[col];
    if (!api) return; // Skip collections without API endpoints

    const serverId = item._id || item.id;

    try {
      if (action === 'insert') {
        const cleanItem = { ...item };
        delete cleanItem.id;
        delete cleanItem._id;
        const res = await api.create(cleanItem);
        // Update local item with server-generated _id
        const arr = DB.data[col];
        if (arr) {
          const idx = arr.findIndex(i => i.id === item.id);
          if (idx > -1 && res) {
            const created = res.article || res.vehicle || res.citerne || res.order || res.decharge || res.bon;
            if (created && created._id) {
              arr[idx]._id = created._id;
              _originalSave();
            }
          }
        }
      } else if (action === 'update') {
        const cleanItem = { ...item };
        delete cleanItem.id;
        delete cleanItem._id;
        if (serverId) {
          await api.update(serverId, cleanItem).catch(() => {});
        }
      } else if (action === 'delete') {
        if (serverId) {
          await api.remove(serverId).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[BRIDGE] Sync failed for', col, action, ':', e.message);
      // Show visible error to user so they know sync failed
      if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification('⚠️ Sync serveur échouée: ' + (e.message || 'Erreur réseau'), 'error');
      }
    }
  }

  // ─── SSE listener for real-time stock updates ───────────────
  API.sse.onUpdate(function(event) {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'stock_changed': {
        const d = event.data;
        if (d && d.id) {
          const articles = DB.data.articles || [];
          const idx = articles.findIndex(a => (a._id === d.id || a.id === d.id));
          if (idx > -1) {
            articles[idx].quantity = d.quantity;
            _originalSave();
            // Trigger UI refresh if available
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
        // Debounced full reload
        if (!DB._reloadTimer) {
          DB._reloadTimer = setTimeout(async () => {
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

  // ─── Add stock adjustment with concurrency check ────────────
  DB.adjustStockAtomic = async function(articleId, type, quantity, reason, reference) {
    if (!API.getToken()) {
      // Fallback to local adjustment
      const article = this.getById('articles', articleId);
      if (!article) throw new Error('Article non trouvé');
      const prev = article.quantity || 0;
      const delta = type === 'Entrée' ? quantity : -quantity;
      if (prev + delta < 0) {
        throw { error: 'Stock insuffisant', currentQuantity: prev, requested: quantity };
      }
      article.quantity = prev + delta;
      this.update('articles', articleId, { quantity: article.quantity });
      return article;
    }

    const serverId = (() => {
      const a = this.getById('articles', articleId);
      return a ? (a._id || a.id) : articleId;
    })();

    const res = await API.articles.adjustStock(serverId, type, quantity, reason, reference);

    if (res.article) {
      // Update local cache
      const articles = this.data.articles || [];
      const idx = articles.findIndex(a => (a._id === serverId || a.id === articleId));
      if (idx > -1) {
        articles[idx].quantity = res.article.quantity;
        _originalSave();
      }
    }

    return res.article;
  };

  // ─── Image upload helper on DB ──────────────────────────────
  DB.uploadArticleImage = async function(articleId, fileOrBase64) {
    const serverId = (() => {
      const a = this.getById('articles', articleId);
      return a ? (a._id || a.id) : articleId;
    })();

    let res;
    if (typeof fileOrBase64 === 'string') {
      res = await API.upload.articleImageBase64(serverId, fileOrBase64);
    } else {
      res = await API.upload.articleImage(serverId, fileOrBase64);
    }

    // Update local cache with the image
    if (typeof fileOrBase64 === 'string') {
      const articles = this.data.articles || [];
      const idx = articles.findIndex(a => (a._id === serverId || a.id === articleId));
      if (idx > -1) {
        articles[idx].image = fileOrBase64;
        _originalSave();
      }
    }

    return res;
  };

  // ─── Backup helpers on DB ───────────────────────────────────
  DB.triggerBackup = async function() {
    return API.backup.trigger();
  };

  DB.listBackups = async function() {
    return API.backup.list();
  };

  DB.downloadBackup = async function(id) {
    return API.backup.download(id);
  };

  console.log('[BRIDGE] Core API Bridge loaded — DB and Auth patched for MongoDB backend');
})();
