/* ============================================================
   CORE.JS — SPA DOUROUB ELDJAZAIR - Stock Management Core
   Database, Auth, Utils, UI, History, ScanStore, SuiviBcBridge
   ============================================================ */

if (typeof window === 'undefined') {
    if (typeof global !== 'undefined') {
        global.window = global;
    } else if (typeof globalThis !== 'undefined') {
        globalThis.window = globalThis;
    }
}

const STORAGE_KEY = 'erp_douroub_db';

const CURRENT_DATA_VERSION = 7;

// =============================================================================
// 1. DB (Database Engine) — localStorage wrapper
// =============================================================================
window.DB = {
    data: null,

    init() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { this.data = JSON.parse(raw); }
            catch(e) { console.error("DB parse error", e); this.resetAllData(); }
        } else {
            this.resetAllData();
        }
        // Ensure all collections exist
        const cols = ['users','articles','stockMovements','decharges','pvs',
                      'materials','materialFamilies','stockSections','citernes',
                      'citerneRefills','preOrders','articleImages','consumptionLog',
                      'auditLog','history','beneficiaryNames','beneficiaries','workPlans', 'cart'];
        let dirty = false;
        cols.forEach(c => { if (!this.data[c]) { this.data[c] = []; dirty = true; } });
        if (!Array.isArray(this.data.workPlans)) { this.data.workPlans = []; dirty = true; }
        if (!Array.isArray(this.data.cart)) { this.data.cart = []; dirty = true; }
        if (!this.data.custom_organ_pdr || typeof this.data.custom_organ_pdr !== 'object') { this.data.custom_organ_pdr = {}; dirty = true; }
        if (!this.data.counters) { this.data.counters = {}; dirty = true; }
        if (!this.data.counters.workPlan) { this.data.counters.workPlan = 1; dirty = true; }
        if (!this.data.counters) { this.data.counters = { decharge:1, pv:1, preorder:1, citerne:1 }; dirty = true; }
        if (!this.data.settings) { this.data.settings = this._defaultSettings(); dirty = true; }

        // Clean migration to Version 7 (Zero data clean blank state)
        if (!this.data.version || this.data.version < CURRENT_DATA_VERSION) {
            this.resetAllData();
            return;
        }

        if (this.data.users.length === 0) { this._seedUsers(); dirty = true; }
        else {
            this.data.users.forEach(u => {
                if (!u.department) {
                    u.department = 'Direction Générale';
                    dirty = true;
                }
                if (!u.qualite) {
                    u.qualite = u.role === 'admin' ? 'Administrateur' : 'Agent';
                    dirty = true;
                }
            });
        }
        if (!Array.isArray(this.data.beneficiaryNames)) {
            this.data.beneficiaryNames = [];
            dirty = true;
        }
        if (!Array.isArray(this.data.beneficiaries)) {
            this.data.beneficiaries = [];
            dirty = true;
        }
        // Enrich materials with family & immatriculation if missing
        if (this.data.materials && this.data.materials.length > 0) {
            const famMap = { 'fam_camion': 'Camion', 'fam_remorque': 'Remorque', 'fam_voiture': 'Véhicule léger', 'fam_engin': 'Engin', 'fam_autre': 'Autre' };
            this.data.materials.forEach(m => {
                if (!m.family && m.familyId) {
                    m.family = famMap[m.familyId] || 'Camion';
                    dirty = true;
                }
            });
        }
        // Ensure all articles have a default zone
        if (Array.isArray(this.data.articles)) {
            this.data.articles.forEach(a => {
                if (!a.zone) {
                    a.zone = 'Zone A';
                    dirty = true;
                }
            });
        }
        if (!this.data.settings) {
            this.data.settings = this._defaultSettings();
            dirty = true;
        } else {
            const tc = (this.data.settings.themeColor || '').toLowerCase();
            if (!this.data.settings.themeColor || tc === '#7c1d2d' || tc === '#631221' || tc === '#4d0b17' || tc === '#380710' || tc === '#991b1b' || tc === '#800020' || tc === '#800000' || tc.startsWith('#7c') || tc.startsWith('#63') || tc.startsWith('#4d') || tc.startsWith('#8') || tc.startsWith('#9')) {
                this.data.settings.themeColor = '#2563eb';
                dirty = true;
            }
            // Strict departments enforcement: only 3 requested departments
            this.data.settings.departments = ['Direction Générale', 'Approvisionnement', 'Transport'];
            // Ensure stockZones exist and are non-empty
            if (!Array.isArray(this.data.settings.stockZones) || this.data.settings.stockZones.length === 0) {
                this.data.settings.stockZones = this._defaultSettings().stockZones;
            }
            // Ensure stockSites exist — migrate from flat zones if needed
            if (!Array.isArray(this.data.settings.stockSites) || this.data.settings.stockSites.length === 0) {
                const existingZones = this.data.settings.stockZones || this._defaultSettings().stockZones;
                this.data.settings.stockSites = [{
                    id: 'site_default',
                    name: 'Dépôt Central',
                    code: 'DC',
                    address: '',
                    description: 'Site principal par défaut',
                    color: '#2563eb',
                    zones: JSON.parse(JSON.stringify(existingZones)),
                    isDefault: true,
                    createdAt: Date.now()
                }];
            }
            // Ensure all articles have a site
            if (Array.isArray(this.data.articles)) {
                const defaultSite = this.data.settings.stockSites.find(s => s.isDefault) || this.data.settings.stockSites[0];
                const defaultSiteName = defaultSite ? defaultSite.name : 'Dépôt Central';
                this.data.articles.forEach(a => {
                    if (!a.site || /d[\ufffd\?e\xC3\xA9\xE9]p[\ufffd\?o\xC3\xB4\xF4]t/i.test(a.site) || a.site === 'site_default' || a.site.includes('\ufffd')) {
                        a.site = defaultSiteName;
                        dirty = true;
                    }
                });
            }
            dirty = true;
        }
        if (dirty) this.save();
    },

    save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },

    resetAllData() {
        return this.resetToOfficialExcelData();
    },

    resetToOfficialExcelData() {
        this.data = {
            version: CURRENT_DATA_VERSION,
            users: [],
            articles: [],
            stockMovements: [],
            decharges: [],
            pvs: [],
            materials: [],
            materialFamilies: this._defaultSettings().materialFamilies,
            stockSections: this._defaultSettings().stockSections,
            stockZones: this._defaultSettings().stockZones,
            citernes: [],
            citerneRefills: [],
            preOrders: [],
            articleImages: [],
            consumptionLog: [],
            auditLog: [],
            history: [],
            beneficiaryNames: [],
            beneficiaries: [],
            workPlans: [],
            cart: [],
            counters: { decharge:1, pv:1, preorder:1, citerne:1, workPlan:1 },
            settings: this._defaultSettings()
        };
        this._seedUsers();
        this.save();
        return true;
    },

    // Ensure PDR articles & realistic vehicle stock movement history
    ensurePdrArticlesAndMovementHistory() {
        return;
    },

    loadOfficialExcelData() {
        return;
    },

    _defaultSettings() {
        return {
            companyName: 'SPA DOUROUB ELDJAZAIR',
            themeColor: '#2563eb',
            leftLogo: '',
            rightLogo: '',
            stockSections: [
                { id:'sec_unique', name:'Section Unique' }
            ],
            stockZones: [
                { id: 'zone_a', name: 'Zone A', code: 'A', description: 'Zone A - Stock Principal', color: '#2563eb' },
                { id: 'zone_b', name: 'Zone B', code: 'B', description: 'Zone B - Pièces Lourdes & Mécanique', color: '#059669' },
                { id: 'zone_c', name: 'Zone C', code: 'C', description: 'Zone C - Électricité, Filtration & Fluides', color: '#7c3aed' },
                { id: 'zone_d', name: 'Zone D', code: 'D', description: 'Zone D - Consommables & Outillage', color: '#d97706' },
                { id: 'zone_e', name: 'Zone E', code: 'E', description: 'Zone E - Carrosserie & Divers', color: '#dc2626' }
            ],
            stockSites: [
                {
                    id: 'site_default',
                    name: 'Dépôt Central',
                    code: 'DC',
                    address: '',
                    description: 'Site principal par défaut',
                    color: '#2563eb',
                    zones: [
                        { id: 'zone_a', name: 'Zone A', code: 'A', description: 'Stock Principal', color: '#2563eb' },
                        { id: 'zone_b', name: 'Zone B', code: 'B', description: 'Pièces Lourdes & Mécanique', color: '#059669' },
                        { id: 'zone_c', name: 'Zone C', code: 'C', description: 'Électricité & Filtration', color: '#7c3aed' },
                        { id: 'zone_d', name: 'Zone D', code: 'D', description: 'Consommables & Outillage', color: '#d97706' },
                        { id: 'zone_e', name: 'Zone E', code: 'E', description: 'Carrosserie & Divers', color: '#dc2626' }
                    ],
                    isDefault: true,
                    createdAt: Date.now()
                }
            ],
            materialFamilies: [
                { id:'fam_camion', name:'Camion', icon:'fa-truck' },
                { id:'fam_remorque', name:'Remorque', icon:'fa-trailer' },
                { id:'fam_voiture', name:'Voiture', icon:'fa-car' },
                { id:'fam_engin', name:'Engin', icon:'fa-tractor' }
            ],
            units: ['Pièce','Kg','Litre','Mètre','Boîte','Rouleau','Bidon','Paquet','Unité','Bloc','Lot'],
            departments: [
                'Direction Générale',
                'Approvisionnement',
                'Transport'
            ],
            articleCategories: ['Bureautique','Pièces de rechange','Consommables','Lubrifiant','Pneus','Filtres','Divers'],
            categoryPrefixes: {
                'Bureautique': 'BUR',
                'Pièces de rechange': 'PDR',
                'Consommables': 'CSM',
                'Lubrifiant': 'LUB',
                'Pneus': 'PNU',
                'Filtres': 'FLT',
                'Divers': 'DIV'
            },
            leftLogo:'', rightLogo:'',
            capital:'', rc:'', nif:'', nis:'', art:'', address:'', phone:'', fax:'', email:''
        };
    },

    _seedUsers() {
        this.data.users = [
            { id: 'u_admin', username: 'admin', password: 'admin123', role: 'admin', name: 'Administrateur', department: 'Direction Générale', qualite: 'Administrateur', active: true, createdAt: Date.now() }
        ];
        this.data.beneficiaryNames = [];
        this.data.beneficiaries = [];
    },

    // — Generic CRUD —
    getSettings() {
        if (!this.data.settings) this.data.settings = this._defaultSettings();
        if (!Array.isArray(this.data.settings.stockZones) || this.data.settings.stockZones.length === 0) {
            this.data.settings.stockZones = this._defaultSettings().stockZones;
            this.save();
        }
        return this.data.settings;
    },
    updateSettings(s) { this.data.settings = { ...this.data.settings, ...s }; this.save(); if (window.UI) UI.applyTheme(this.data.settings); },
    resetSettings() { this.data.settings = this._defaultSettings(); this.save(); },

    generateArticleCode(category) {
        const settings = this.getSettings();
        const prefixes = settings.categoryPrefixes || {};
        const prefix = prefixes[category] || category.substring(0,3).toUpperCase();
        // Find existing articles with this prefix
        const articles = this.getAll('articles');
        let maxNum = 0;
        articles.forEach(a => {
            if (a.code && a.code.startsWith(prefix + '-')) {
                const num = parseInt(a.code.split('-')[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        return prefix + '-' + String(maxNum + 1).padStart(3, '0');
    },

    getAll(col) { return this.data[col] || []; },
    getById(col, id) { return (this.data[col]||[]).find(i => i.id == id) || null; },
    where(col, fn) { return (this.data[col]||[]).filter(fn); },
    count(col, fn) { return fn ? this.where(col,fn).length : (this.data[col]||[]).length; },

    generateRef(type) {
        const yr = new Date().getFullYear();
        if (!this.data.counters[type]) this.data.counters[type] = 1;
        const n = this.data.counters[type]++;
        this.save();
        const p = { decharge:'DEC', pv:'PV', preorder:'CMD', citerne:'CIT' }[type] || 'REF';
        return `${p}/${String(n).padStart(3,'0')}/${yr}`;
    },

    insert(col, item, note='Création') {
        if (!item.id) item.id = Date.now().toString(36) + Math.random().toString(36).substr(2,5);
        if (!item.createdAt) item.createdAt = Date.now();
        const user = window.Auth ? window.Auth.getCurrentUser() : null;
        if (user && !item.createdBy) item.createdBy = user.id;
        if (user && !item.createdByName) item.createdByName = user.name;
        if (!this.data[col]) this.data[col] = [];
        this.data[col].push(item);
        this._audit('INSERT', col, item.id, item);
        if (window.History) History.log(col, item.id, 'CREATE', note, item);
        this.save();
        return item;
    },

    update(col, id, updates, note='Modification') {
        const arr = this.data[col];
        if (!arr) return null;
        const idx = arr.findIndex(i => (id != null && (i.id == id || i._id == id)));
        if (idx > -1) {
            const old = { ...arr[idx] };
            arr[idx] = { ...old, ...updates, updatedAt:Date.now() };
            this._audit('UPDATE', col, id, arr[idx]);
            if (window.History) History.log(col, id, 'UPDATE', note, { old, new: arr[idx] });
            this.save();
            return arr[idx];
        }
        return null;
    },

    delete(col, id, note='Suppression') {
        const arr = this.data[col];
        if (!arr) return false;
        const idx = arr.findIndex(i => i.id == id);
        if (idx > -1) {
            const old = arr[idx];
            arr.splice(idx, 1);
            this._audit('DELETE', col, id, null);
            if (window.History) History.log(col, id, 'DELETE', note, old);
            this.save();
            return true;
        }
        return false;
    },

    _hash(str) {
        let h = 2166136261;
        for (let i=0; i<str.length; i++) { h ^= str.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); }
        return (h>>>0).toString(16);
    },

    _audit(action, col, itemId, data) {
        if (!this.data.auditLog) this.data.auditLog = [];
        const prev = this.data.auditLog.length ? this.data.auditLog[this.data.auditLog.length-1].hash : '0';
        const user = window.Auth && Auth.getCurrentUser() ? Auth.getCurrentUser().username : 'system';
        const ts = Date.now();
        const hash = this._hash(JSON.stringify({ action,col,itemId,data,prev,user,ts }));
        this.data.auditLog.push({ timestamp:ts, user, action, col, itemId, hash, prevHash:prev });
    },

    addAuditLog(entry) {
        if (!this.data.auditLog) this.data.auditLog = [];
        const prev = this.data.auditLog.length ? (this.data.auditLog[this.data.auditLog.length-1].hash || '0') : '0';
        const user = entry.user || (window.Auth && Auth.getCurrentUser() ? Auth.getCurrentUser().name : 'Système');
        const ts = entry.timestamp || Date.now();
        const action = entry.action || 'ACTION';
        const col = entry.col || 'system';
        const itemId = entry.itemId || entry.id || '';
        const details = entry.details || entry.target || '';
        const hash = this._hash(JSON.stringify({ action, col, itemId, details, prev, user, ts }));
        this.data.auditLog.push({
            timestamp: ts,
            user,
            action,
            col,
            itemId,
            details,
            target: entry.target || '',
            hash,
            prevHash: prev
        });
        this.save();
    },

    getAuditLog() {
        return this.data.auditLog || [];
    },

    exportData() { return JSON.stringify(this.data, null, 2); },
    importData(json) {
        try {
            const d = JSON.parse(json);
            if (d && typeof d === 'object') { this.data = d; this.save(); return true; }
        } catch(e) { console.error("Import fail", e); }
        return false;
    },

    loadDemoData() {
        return this.resetToOfficialExcelData();
    },

    // =========================================================================
    // FIFO PRIORITY QUEUE LOGIC (First Come, First Served)
    // =========================================================================
    getFIFOQueue(articleId = null) {
        const preOrders = (this.data.preOrders || []).filter(p => p.status === 'En attente' || p.status === 'Partiellement servie');
        const decharges = (this.data.decharges || []).filter(d => d.status === 'En attente');
        
        const allPending = [];
        
        preOrders.forEach(p => {
            const ts = new Date(p.date || p.createdAt || 0).getTime();
            const items = p.items || [];
            items.forEach(it => {
                if (!articleId || it.articleId === articleId) {
                    allPending.push({
                        type: 'PREORDER',
                        orderId: p.id,
                        ref: p.ref,
                        beneficiary: p.beneficiary || p.createdBy,
                        department: p.department || '',
                        timestamp: ts,
                        dateFormatted: new Date(ts).toLocaleString('fr-FR'),
                        articleId: it.articleId,
                        requestedQty: Number(it.requestedQty || it.quantity) || 1,
                        servedQty: Number(it.servedQty) || 0
                    });
                }
            });
        });

        decharges.forEach(d => {
            if (d.preOrderId) return;
            const ts = new Date(d.date || d.createdAt || 0).getTime();
            const items = d.items || [];
            items.forEach(it => {
                if (!articleId || it.articleId === articleId) {
                    allPending.push({
                        type: 'DECHARGE',
                        orderId: d.id,
                        ref: d.ref,
                        beneficiary: d.beneficiary,
                        department: d.service || '',
                        timestamp: ts,
                        dateFormatted: new Date(ts).toLocaleString('fr-FR'),
                        articleId: it.articleId,
                        requestedQty: Number(it.quantity) || 1,
                        servedQty: 0
                    });
                }
            });
        });

        allPending.sort((a, b) => a.timestamp - b.timestamp);

        const articleTotals = {};
        const articlesMap = {};
        (this.data.articles || []).forEach(a => { articlesMap[a.id] = a; });

        allPending.forEach((entry, idx) => {
            entry.fifoPriority = idx + 1;
            const art = articlesMap[entry.articleId];
            const stockQty = art ? (Number(art.quantity) || 0) : 0;
            
            if (!articleTotals[entry.articleId]) articleTotals[entry.articleId] = 0;
            const priorReserved = articleTotals[entry.articleId];
            const needed = entry.requestedQty - entry.servedQty;
            
            entry.priorReservedQty = priorReserved;
            entry.availableForThisRequest = Math.max(0, stockQty - priorReserved);
            entry.canBeFullyServed = (stockQty - priorReserved) >= needed;
            entry.isPriorityOne = (idx === 0);

            articleTotals[entry.articleId] += needed;
        });

        return allPending;
    },

    getArticleStockWithFIFO(articleId) {
        const art = (this.data.articles || []).find(a => a.id === articleId);
        if (!art) return { physicalStock: 0, reservedFIFO: 0, availableNet: 0, queueCount: 0, queue: [] };
        const queue = this.getFIFOQueue(articleId);
        const reserved = queue.reduce((sum, q) => sum + Math.max(0, q.requestedQty - q.servedQty), 0);
        const physical = Number(art.quantity) || 0;
        return {
            physicalStock: physical,
            reservedFIFO: reserved,
            availableNet: Math.max(0, physical - reserved),
            queueCount: queue.length,
            queue: queue
        };
    },

    // =========================================================================
    // SHIM METHODS — called by modules.js (convenience wrappers)
    // =========================================================================
    getArticles() {
        const arts = this.getAll('articles');
        const defaultPrices = {
            'PR-001': 8500, 'PR-002': 8500, 'FL-001': 3200, 'FL-002': 4200,
            'FL-003': 3800, 'LB-001': 15500, 'LB-002': 12000, 'PN-001': 58000,
            'PN-002': 52000, 'EL-001': 34000, 'EL-002': 450, 'FO-001': 850,
            'FO-002': 30, 'CS-001': 600, 'CS-002': 2800, 'CR-001': 18500
        };
        return arts.map(a => ({
            ...a,
            zone: a.zone || 'Zone A',
            price: (a.price !== undefined && a.price !== null && a.price !== '') ? Number(a.price) : (defaultPrices[a.code] || 2500)
        }));
    },
    addArticle(a)       { return this.insert('articles', a); },
    updateArticle(a)    { return this.update('articles', a.id || a._id, a); },
    deleteArticle(id)   { return this.delete('articles', id); },
    getArticle(id)      {
        const a = (this.data && Array.isArray(this.data.articles)) ? this.data.articles.find(x => x.id === id || x._id === id || x.code === id) : this.getById('articles', id);
        return a ? { ...a, zone: a.zone || 'Zone A' } : null;
    },
    addStock(articleId, quantity, type = 'Entrée', reason = '', user = '', reference = '') {
        const qtyNum = Number(quantity) || 0;
        const articles = (this.data && Array.isArray(this.data.articles)) ? this.data.articles : [];
        const article = articles.find(a => a.id === articleId || a._id === articleId || a.code === articleId || (a.barcode && a.barcode === articleId));
        if (!article) {
            console.warn('DB.addStock: Article not found for ID/code:', articleId);
            return null;
        }
        article.quantity = (Number(article.quantity) || 0) + qtyNum;
        if (article.quantity < 0) article.quantity = 0;
        this.updateArticle(article);
        const resolvedUser = user || (window.Auth && typeof Auth.getCurrentUser === 'function' && Auth.getCurrentUser() ? Auth.getCurrentUser().name : 'Magasinier');
        this.addStockMovement({
            articleId: article.id,
            articleCode: article.code,
            articleDesignation: article.designation || '',
            type: type || 'Entrée',
            quantity: qtyNum,
            reason: reason || 'Ajustement de stock',
            user: resolvedUser,
            reference: reference || '',
            date: new Date().toISOString()
        });
        return article;
    },
    getCurrentUser() {
        return (window.Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
    },

    getZones() {
        const s = this.getSettings();
        return (s && Array.isArray(s.stockZones)) ? s.stockZones : [];
    },
    addZone(zone) {
        const settings = this.getSettings();
        if (!Array.isArray(settings.stockZones)) settings.stockZones = [];
        const rawCode = (zone.code || zone.name || 'X').trim();
        const code = (rawCode.replace(/[^A-Za-z0-9]/g, '').slice(-1) || 'X').toUpperCase();
        const id = zone.id || ('zone_' + code.toLowerCase() + '_' + Date.now().toString(36).substr(2, 4));
        const newZone = {
            id,
            name: zone.name || ('Zone ' + code),
            code: code,
            description: zone.description || ('Zone ' + code),
            color: zone.color || '#2563eb'
        };
        settings.stockZones.push(newZone);
        this.updateSettings(settings);
        this._audit('ADD_ZONE', 'settings', id, newZone);
        return newZone;
    },
    deleteZone(id) {
        const settings = this.getSettings();
        if (!Array.isArray(settings.stockZones)) return false;
        const initialLen = settings.stockZones.length;
        settings.stockZones = settings.stockZones.filter(z => z.id !== id && z.code !== id && z.name !== id);
        if (settings.stockZones.length < initialLen) {
            this.updateSettings(settings);
            this._audit('DELETE_ZONE', 'settings', id, { deletedId: id });
            return true;
        }
        return false;
    },

    // ── Sites CRUD ──
    getSites() {
        const s = this.getSettings();
        return (s && Array.isArray(s.stockSites)) ? s.stockSites : [];
    },
    getSite(siteId) {
        return this.getSites().find(s => s.id === siteId || s.name === siteId);
    },
    getDefaultSite() {
        const sites = this.getSites();
        return sites.find(s => s.isDefault) || sites[0] || null;
    },
    addSite(site) {
        const settings = this.getSettings();
        if (!Array.isArray(settings.stockSites)) settings.stockSites = [];
        const id = site.id || ('site_' + Date.now().toString(36));
        const newSite = {
            id,
            name: site.name || 'Nouveau Site',
            code: (site.code || site.name || 'NS').replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase(),
            address: site.address || '',
            description: site.description || '',
            color: site.color || '#2563eb',
            zones: site.zones || [
                { id: 'zone_a_' + id, name: 'Zone A', code: 'A', description: 'Zone par défaut', color: '#2563eb' }
            ],
            isDefault: false,
            createdAt: Date.now()
        };
        settings.stockSites.push(newSite);
        this.updateSettings(settings);
        this._audit('ADD_SITE', 'settings', id, newSite);
        return newSite;
    },
    updateSite(siteId, updates) {
        const settings = this.getSettings();
        const idx = (settings.stockSites || []).findIndex(s => s.id === siteId);
        if (idx === -1) return null;
        Object.assign(settings.stockSites[idx], updates);
        this.updateSettings(settings);
        this._audit('UPDATE_SITE', 'settings', siteId, updates);
        return settings.stockSites[idx];
    },
    deleteSite(siteId) {
        const settings = this.getSettings();
        if (!Array.isArray(settings.stockSites)) return false;
        const site = settings.stockSites.find(s => s.id === siteId);
        if (!site || site.isDefault) return false;
        settings.stockSites = settings.stockSites.filter(s => s.id !== siteId);
        this.updateSettings(settings);
        this._audit('DELETE_SITE', 'settings', siteId, { name: site.name });
        return true;
    },
    addZoneToSite(siteId, zone) {
        const settings = this.getSettings();
        const site = (settings.stockSites || []).find(s => s.id === siteId);
        if (!site) return null;
        if (!Array.isArray(site.zones)) site.zones = [];
        const zoneId = zone.id || ('zone_' + Date.now().toString(36));
        const newZone = {
            id: zoneId,
            name: zone.name || 'Nouvelle Zone',
            code: (zone.code || zone.name || 'Z').replace(/[^A-Za-z0-9]/g, '').substring(0, 2).toUpperCase(),
            description: zone.description || '',
            color: zone.color || '#2563eb'
        };
        site.zones.push(newZone);
        this.updateSettings(settings);
        this._audit('ADD_ZONE_TO_SITE', 'settings', siteId, newZone);
        return newZone;
    },
    deleteZoneFromSite(siteId, zoneId) {
        const settings = this.getSettings();
        const site = (settings.stockSites || []).find(s => s.id === siteId);
        if (!site || !Array.isArray(site.zones)) return false;
        const initialLen = site.zones.length;
        site.zones = site.zones.filter(z => z.id !== zoneId && z.name !== zoneId);
        if (site.zones.length < initialLen) {
            this.updateSettings(settings);
            this._audit('DELETE_ZONE_FROM_SITE', 'settings', siteId, { zoneId });
            return true;
        }
        return false;
    },
    getZonesForSite(siteId) {
        const site = this.getSite(siteId);
        return (site && Array.isArray(site.zones)) ? site.zones : [];
    },

    getMovements()      { return this.getAll('stockMovements'); },
    addMovement(m)      { return this.insert('stockMovements', m); },
    addStockMovement(m) { return this.addMovement(m); },

    getDecharges()      { return this.getAll('decharges'); },
    getDecharge(id)     { return this.getById('decharges', id); },
    addDecharge(d)      { return this.insert('decharges', d); },
    updateDecharge(d)   { return this.update('decharges', d.id, d); },

    getPVs()            { return this.getAll('pvs'); },
    getPV(id)           { return this.getById('pvs', id); },
    addPV(p)            { return this.insert('pvs', p); },
    updatePV(p)         { return this.update('pvs', p.id, p); },

    getFleet() {
        const list = this.getAll('materials');
        const settings = this.getSettings ? this.getSettings() : { materialFamilies: [] };
        const famMap = {};
        (settings.materialFamilies || []).forEach(fam => { famMap[fam.id] = fam.name; });
        return list.map(m => ({
            ...m,
            family: m.family || famMap[m.familyId] || 'Camion',
            immatriculation: m.immatriculation || 'Non spécifiée'
        }));
    },
    addFleet(m)         { return this.insert('materials', m); },
    updateFleet(m)      { return this.update('materials', m.id, m); },
    deleteFleet(id)     { return this.delete('materials', id); },
    getMaterial(id)     { return this.getById('materials', id); },

    getCiternes()       { return this.getAll('citernes'); },
    addCiterne(c)       { return this.insert('citernes', c); },
    updateCiterne(c)    { return this.update('citernes', c.id, c); },
    deleteCiterne(id)   { return this.delete('citernes', id); },

    getPreOrders()      { return this.getAll('preOrders'); },
    addPreOrder(p)      { return this.insert('preOrders', p); },
    updatePreOrder(p)   { return this.update('preOrders', p.id, p); },

    getUsers()          { return this.getAll('users'); },
    addUser(u)          { return this.insert('users', u); },
    deleteUser(id)      { return this.delete('users', id); },

    getRefills(citerneId) { return this.where('citerneRefills', r => r.citerneId == citerneId); },
    addRefill(r)        { return this.insert('citerneRefills', r); },

    // Extra shim for modules.js convenience patterns
    getCart() {
        if (!this.data) return [];
        if (!Array.isArray(this.data.cart)) this.data.cart = [];
        return this.data.cart;
    },
    setCart(items) {
        if (!this.data) this.data = {};
        this.data.cart = Array.isArray(items) ? items : [];
        this.save();
        return this.data.cart;
    },
    addToCart(articleId, quantity = 1) {
        const cart = this.getCart();
        const art = (this.getArticle && this.getArticle(articleId)) || (this.data.articles || []).find(a => a.id === articleId || a.code === articleId);
        if (!art) return false;
        const existing = cart.find(i => i.articleId === art.id);
        if (existing) {
            existing.quantity = Number(existing.quantity) + Number(quantity);
        } else {
            cart.push({
                articleId: art.id,
                code: art.code,
                designation: art.designation,
                unit: art.unit || 'U',
                quantity: Number(quantity),
                stock: Number(art.quantity) || 0,
                price: Number(art.price) || 0
            });
        }
        this.save();
        return cart;
    },
    clearCart() {
        if (!this.data) this.data = {};
        this.data.cart = [];
        this.save();
        return [];
    },
    createDotationDecharge(opts = {}) {
        if (!this.data) this.data = {};
        if (!Array.isArray(this.data.decharges)) this.data.decharges = [];
        if (!this.data.counters) this.data.counters = { decharge: 1, pv: 1, preorder: 1, citerne: 1 };
        
        const dechNum = (this.data.counters.decharge = (this.data.counters.decharge || 0) + 1);
        const ref = 'DCH-' + new Date().getFullYear() + '-' + String(dechNum).padStart(3, '0');
        const id = (typeof Utils !== 'undefined' && Utils.generateId) ? Utils.generateId() : ('dch_' + Date.now());
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser) ? Auth.getCurrentUser() : (this.getCurrentUser ? this.getCurrentUser() : { name: 'Magasinier' });
        
        const articlesList = this.getArticles ? this.getArticles() : (this.data.articles || []);
        const rawItems = opts.items || opts.lines || (this.data.cart || []);
        const formattedItems = rawItems.map(it => {
            const art = articlesList.find(a => a.id === it.articleId || a.code === it.articleId || a.code === it.code);
            return {
                articleId: art ? art.id : it.articleId,
                code: art ? art.code : (it.code || ''),
                designation: art ? art.designation : (it.designation || 'Article'),
                unit: art ? (art.unit || 'U') : (it.unit || 'U'),
                quantity: Number(it.quantity || it.qty || 1)
            };
        });

        const lines = formattedItems.map(it => ({
            articleId: it.articleId,
            designation: it.designation,
            unit: it.unit,
            quantity: it.quantity,
            servedQty: 0,
            inventoryCode: ''
        }));

        const decharge = {
            id: id,
            ref: ref,
            date: new Date().toISOString(),
            beneficiary: opts.beneficiary || 'Atelier & Magasin',
            service: opts.service || opts.department || 'Direction Générale',
            fromName: opts.fromName || 'Magasinier Principal',
            qualite: opts.qualite || 'Demandeur',
            materialId: '',
            immatriculation: '',
            materialName: '',
            materialFamily: '',
            workPlanId: null,
            workPlanRef: null,
            reason: opts.observation || opts.reason || opts.motif || 'Dotation matériel en stock',
            items: formattedItems.map(i => ({ articleId: i.articleId, quantity: i.quantity })),
            lines: lines,
            status: 'En attente',
            createdBy: currentUser ? currentUser.name : 'Magasinier',
            createdAt: new Date().toISOString()
        };

        this.addDecharge(decharge);
        return decharge;
    },
    getData()           { return this.data; },
    saveData(d)         { if (d) this.data = d; this.save(); },
    getCurrentUser()    { return (window.Auth && Auth.getCurrentUser()) || { id:'u_admin', username:'admin', name:'Administrateur', role:'admin' }; }
};


// =============================================================================
// 2. Auth (Authentication & Roles)
// =============================================================================
window.Auth = {
    currentUser: null,

    init() {
        if (this.currentUser && this.currentUser.username) {
            return;
        }

        let raw = null;
        try {
            raw = localStorage.getItem('erp_currentUser') ||
                  localStorage.getItem('erp_douroub_session') ||
                  localStorage.getItem('suivi_session') ||
                  localStorage.getItem('auth_user') ||
                  sessionStorage.getItem('erp_currentUser') ||
                  sessionStorage.getItem('erp_douroub_session') ||
                  sessionStorage.getItem('suivi_session') ||
                  sessionStorage.getItem('auth_user');
        } catch(e) {}

        if (raw) {
            let sessionObj = null;
            try {
                sessionObj = (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) ? JSON.parse(raw) : { username: String(raw), role: 'user' };
            } catch(e) {
                if (typeof raw === 'string' && raw.trim()) {
                    sessionObj = { username: raw.trim(), role: 'user' };
                }
            }

            if (sessionObj && (sessionObj.username || sessionObj.id || sessionObj.name)) {
                const targetUname = (sessionObj.username || sessionObj.name || '').toLowerCase();
                const targetId = sessionObj.id;
                const users = (typeof DB !== 'undefined' && DB.getAll) ? DB.getAll('users') : [];
                const match = users.find(u => (u.username && u.username.toLowerCase() === targetUname) || (targetId && u.id === targetId));

                if (match) {
                    this.currentUser = {
                        id: match.id,
                        username: match.username,
                        role: sessionObj.role || match.role,
                        name: match.name,
                        department: match.department || sessionObj.department || 'Direction Générale',
                        service: match.service || sessionObj.service || match.department || '',
                        canDeductStock: match.canDeductStock !== undefined ? match.canDeductStock : (match.role === 'admin' || match.role === 'magasinier' || match.role === 'mag' || match.role === 'gds'),
                        gdsOption: match.gdsOption !== undefined ? match.gdsOption : (match.role === 'admin' || match.role === 'magasinier' || match.role === 'mag' || match.role === 'gds'),
                        qualite: match.qualite || 'Agent'
                    };
                } else {
                    this.currentUser = {
                        id: sessionObj.id || ('u_' + (sessionObj.username || 'user')),
                        username: sessionObj.username || 'user',
                        role: sessionObj.role || 'user',
                        name: sessionObj.name || sessionObj.username || 'Utilisateur',
                        department: sessionObj.department || 'Direction Générale',
                        service: sessionObj.service || sessionObj.department || '',
                        canDeductStock: sessionObj.canDeductStock !== undefined ? sessionObj.canDeductStock : (sessionObj.role === 'admin' || sessionObj.role === 'magasinier' || sessionObj.role === 'mag' || sessionObj.role === 'gds'),
                        gdsOption: sessionObj.gdsOption !== undefined ? sessionObj.gdsOption : (sessionObj.role === 'admin' || sessionObj.role === 'magasinier' || sessionObj.role === 'mag' || sessionObj.role === 'gds'),
                        qualite: sessionObj.qualite || 'Agent'
                    };
                }

                try {
                    const serialized = JSON.stringify(this.currentUser);
                    localStorage.setItem('erp_currentUser', serialized);
                    localStorage.setItem('erp_douroub_session', serialized);
                    localStorage.setItem('sde_user_role', this.currentUser.role);
                    sessionStorage.setItem('erp_currentUser', serialized);
                    sessionStorage.setItem('erp_douroub_session', serialized);
                    sessionStorage.setItem('sde_user_role', this.currentUser.role);
                } catch(e) {}
            }
        }
    },

    login(username, password) {
        const users = DB.getAll('users');
        const match = users.find(u => u.username === username && u.password === password && u.active !== false);
        if (match) {
            this.currentUser = {
                id: match.id,
                username: match.username,
                role: match.role,
                name: match.name,
                department: match.department || 'Direction Générale',
                service: match.service || match.department || '',
                canDeductStock: match.canDeductStock !== undefined ? match.canDeductStock : (match.role === 'admin' || match.role === 'magasinier' || match.role === 'mag' || match.role === 'gds'),
                gdsOption: match.gdsOption !== undefined ? match.gdsOption : (match.role === 'admin' || match.role === 'magasinier' || match.role === 'mag' || match.role === 'gds'),
                qualite: match.qualite || 'Agent'
            };
            try {
                localStorage.setItem('erp_currentUser', JSON.stringify(this.currentUser));
                localStorage.setItem('erp_douroub_session', JSON.stringify(this.currentUser));
                localStorage.setItem('sde_user_role', this.currentUser.role);
                localStorage.setItem('suivi_session', JSON.stringify({
                    username: this.currentUser.username,
                    role: this.currentUser.role,
                    name: this.currentUser.name,
                    at: new Date().toISOString()
                }));
            } catch(e) {}
            if (typeof window.isUserEligibleForGdsScan === 'function') {
                const isEligible = window.isUserEligibleForGdsScan();
                const btnHead = document.getElementById('btnHeaderGdsScanner');
                const btnFab = document.getElementById('fabGdsScanner');
                const btnQuick = document.getElementById('btnGdsScan');
                if (btnHead) btnHead.style.display = isEligible ? 'inline-flex' : 'none';
                if (btnFab) btnFab.style.display = isEligible ? 'flex' : 'none';
                if (btnQuick) btnQuick.style.display = isEligible ? 'inline-flex' : 'none';
            }
            return true;
        }
        return false;
    },

    logout() {
        this.currentUser = null;
        try {
            localStorage.removeItem('erp_currentUser');
            localStorage.removeItem('erp_douroub_session');
            localStorage.removeItem('sde_user_role');
            localStorage.removeItem('suivi_session');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('erp_active_module');
            sessionStorage.removeItem('erp_currentUser');
            sessionStorage.removeItem('erp_douroub_session');
            sessionStorage.removeItem('sde_user_role');
            sessionStorage.removeItem('suivi_session');
            sessionStorage.removeItem('auth_user');
        } catch(e) {}
    },

    isLoggedIn() { return !!this.currentUser; },
    getCurrentUser() { return this.currentUser; },
    getUser() { return this.getCurrentUser(); },
    hasRole(r) { return this.currentUser && this.currentUser.role === r; },
    isAdmin() {
        if (!this.currentUser) return false;
        const r = (this.currentUser.role || '').toLowerCase();
        const u = (this.currentUser.username || '').toLowerCase();
        return r === 'admin' || r === 'superadmin' || r === 'directeur' || u === 'admin' || u === 'dg';
    },
    isMag() { return this.hasRole('magasinier'); },
    isMagasinier() { return this.hasRole('magasinier'); },
    isNormal() { return this.hasRole('normal') || this.hasRole('user'); },
    isChefSectionGestion() {
        if (!this.currentUser) return false;
        if (this.isAdmin()) return true;
        if (this.currentUser.username === 'lekcir') return true;
        const r = (this.currentUser.role || '').toLowerCase();
        if (r === 'chef_section_gestion' || r === 'chef_section' || r === 'approbateur') return true;
        const q = (this.currentUser.qualite || '').toLowerCase();
        return q.includes('gestion des stocks') || q.includes('chef section gestion');
    },
    isDG() {
        if (!this.currentUser) return false;
        return this.isAdmin() || (this.currentUser.username === 'admin');
    },

    canView(module) {
        if (!this.currentUser) return false;
        if (this.isAdmin()) return true;
        if (this.isMag() || this.isChefSectionGestion()) {
            // Magasinier & Chef Section Gestion: Operational warehouse management (no system settings or users administration)
            return ['dashboard','stock','stockMovements','decharges','pvs',
                    'fleet','materials','citernes','preOrders','beneficiaries',
                    'history','kpi','reports','consumption','barcodeScanner','barcodeGenerator',
                    'articles','barcodes','materialFamilies','notifications','planTravail'].includes(module);
        }
        // Normal user: Stock catalog consultation, stock requests/cart, own order tracking, scanner, plan de travail
        return ['dashboard','stock','articles','history','barcodeScanner','notifications','preOrders','cart','planTravail'].includes(module);
    },

    canCreate(mod) {
        if (this.isAdmin() || this.isMag() || this.isChefSectionGestion()) return true;
        // Normal users can only initiate stock requests (cart / preOrders) and work plans
        if (this.isNormal()) return ['cart','preOrders','planTravail'].includes(mod);
        return false;
    },

    canEdit(doc, col) {
        // STRICT RULE: Once validated/approved/active, ONLY Admin can ever modify or rectify!
        if (doc && (col === 'decharges' || col === 'pvs') && (doc.status === 'Approuvée' || doc.status === 'Validée' || doc.status === 'Partielle' || doc.status === 'Actif')) {
            return this.isAdmin();
        }
        if (this.isAdmin()) return true;
        if ((this.isMag() || this.isChefSectionGestion()) && col !== 'users' && col !== 'settings') return true;
        if (this.isNormal() && col === 'preOrders' && doc && doc.status === 'En attente' && (doc.createdBy === this.currentUser?.id || doc.userId === this.currentUser?.id)) return true;
        if (this.isNormal() && col === 'decharges' && doc && doc.status === 'En attente' && (doc.createdById === this.currentUser?.id || doc.createdBy === this.currentUser?.name)) return true;
        return false;
    },

    canDelete(doc, col) {
        if (doc && (col === 'decharges' || col === 'pvs') && (doc.status === 'Approuvée' || doc.status === 'Validée' || doc.status === 'Partielle' || doc.status === 'Actif')) {
            return this.isAdmin();
        }
        return this.isAdmin();
    },

    getRoleLabel(r) {
        return { admin:'Administrateur', magasinier:'Magasinier / Chef Section', chef_section_gestion:'Chef Section Gestion', appro:'Responsable Appro', normal:'Utilisateur', user:'Utilisateur' }[r] || r;
    }
};

window.isUserEligibleForGdsScan = function() {
    if (typeof window.Auth === 'undefined' || !window.Auth.getUser) return false;
    const user = window.Auth.getUser();
    if (!user) return false;
    // Eligible if role is admin, magasinier, gds, or has canDeductStock / gdsOption flag
    return user.role === 'admin' || 
           user.role === 'magasinier' || 
           user.role === 'mag' || 
           user.role === 'gds' || 
           user.canDeductStock === true || 
           user.gdsOption === true ||
           (user.service && user.service.toLowerCase().includes('stock'));
};


// =============================================================================
// 3. Utils — Formatters, notifications, downloads
// =============================================================================
window.Utils = {
    formatDate(ts) {
        if (!ts) return '-';
        return new Date(ts).toLocaleDateString('fr-FR');
    },
    formatDateTime(ts) {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    },
    getCurrentDate() { return new Date().toISOString().split('T')[0]; },

    formatCurrency(a, c='DA') {
        if (isNaN(a) || a === null) return '-';
        return Number(a).toLocaleString('fr-DZ', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ' + c;
    },
    formatNumber(n) {
        if (isNaN(n) || n === null) return '0';
        return Number(n).toLocaleString('fr-FR');
    },

    escapeHTML(str) {
        if (!str) return '';
        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
            try {
                const d = document.createElement('div');
                d.textContent = String(str);
                if (d.innerHTML) return d.innerHTML;
            } catch (e) {}
        }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    },

    timeAgo(ts) {
        const e = Date.now() - ts;
        if (e < 60000) return Math.round(e/1000) + 's';
        if (e < 3600000) return Math.round(e/60000) + 'min';
        if (e < 86400000) return Math.round(e/3600000) + 'h';
        return Math.round(e/86400000) + 'j';
    },

    statusBadge(status) {
        if (!status) return '<span class="badge badge-secondary">-</span>';
        const map = {
            pending:   { cls:'badge-warning', lbl:'En attente' },
            validated: { cls:'badge-success', lbl:'Validé' },
            approved:  { cls:'badge-success', lbl:'Approuvé' },
            'validée': { cls:'badge-success', lbl:'Validée' },
            rejected:  { cls:'badge-danger',  lbl:'Rejeté' },
            delivered: { cls:'badge-info',    lbl:'Livré' },
            returned:  { cls:'badge-secondary',lbl:'Retourné' },
            active:    { cls:'badge-success', lbl:'Actif' },
            inactive:  { cls:'badge-danger',  lbl:'Inactif' },
            en_panne:  { cls:'badge-danger',  lbl:'En panne' },
            maintenance:{ cls:'badge-warning',lbl:'En maintenance' }
        };
        const key = status.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const m = map[key] || map[status.toLowerCase()] || { cls:'badge-secondary', lbl:status };
        return `<span class="badge ${m.cls}">${m.lbl}</span>`;
    },

    // Toast notifications — uses the toastContainer from index.html
    showNotification(msg, type='info', duration=3500) {
        const container = document.getElementById('toastContainer') || this._createToastContainer();
        const iconMap = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle', danger:'fa-exclamation-circle' };
        const icon = iconMap[type] || iconMap.info;
        const toast = document.createElement('div');
        toast.className = `notification notification-${type}`;
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${this.escapeHTML(msg)}</span>`;
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => toast.classList.add('show'));
        } else {
            setTimeout(() => toast.classList.add('show'), 16);
        }
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (typeof toast.remove === 'function') toast.remove(); }, 300);
        }, duration);
    },

    _createToastContainer() {
        const d = document.createElement('div');
        d.id = 'toastContainer';
        d.className = 'toast-container';
        document.body.appendChild(d);
        return d;
    },

    downloadFile(filename, content, type='text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    downloadXLSX(filename, sheetsArray) {
        if (typeof XLSX === 'undefined') { this.showNotification("SheetJS non chargé","error"); return; }
        const wb = XLSX.utils.book_new();
        sheetsArray.forEach(s => {
            const ws = XLSX.utils.json_to_sheet(s.data);
            XLSX.utils.book_append_sheet(wb, ws, s.name || 'Sheet');
        });
        XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
    },

    calculatePUMP(cs, cp, aq, ap) {
        cs = parseFloat(cs)||0; cp = parseFloat(cp)||0;
        aq = parseFloat(aq)||0; ap = parseFloat(ap)||0;
        if (cs+aq === 0) return 0;
        return ((cs*cp)+(aq*ap))/(cs+aq);
    }
};


// =============================================================================
// 4. UI — Modal, Theme, Clock, Sortable tables
// =============================================================================
window.UI = {
    focusSnap: null,

    captureFocus() {
        const el = document.activeElement;
        this.focusSnap = el ? { id:el.id, val:el.value, start:el.selectionStart, end:el.selectionEnd } : null;
    },
    restoreFocus(snap) {
        const s = snap || this.focusSnap;
        if (s && s.id) {
            const el = document.getElementById(s.id);
            if (el) { el.focus(); if (el.setSelectionRange && s.start != null) el.setSelectionRange(s.start, s.end); }
        }
    },

    // === MODAL — uses the modal structure from index.html ===
    showModal(title, bodyHTML, footerHTML='', size='') {
        let opts = {};
        if (typeof title === 'object' && title !== null) {
            opts = title;
            title = opts.title || '';
            bodyHTML = opts.body || opts.bodyHTML || '';
            footerHTML = opts.footer || opts.footerHTML || '';
            size = opts.size || '';
        } else if (typeof footerHTML === 'string' && (footerHTML.startsWith('modal-') || ['lg','xl','sm','md'].includes(footerHTML))) {
            size = footerHTML;
            footerHTML = '';
        }

        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return;
        const dialog = overlay.querySelector('.modal-dialog');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        const footerEl = document.getElementById('modalFooter');
        const closeBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalConfirmBtn');

        if (titleEl) {
            if (typeof title === 'string' && (title.includes('<') || title.includes('&'))) {
                titleEl.innerHTML = title;
            } else {
                titleEl.textContent = title;
            }
        }
        if (bodyEl) {
            bodyEl.innerHTML = (bodyHTML !== undefined && bodyHTML !== null) ? bodyHTML : '';
        }

        if (footerEl) {
            if (footerHTML) {
                footerEl.innerHTML = footerHTML;
                footerEl.style.display = 'flex';
            } else if (opts.confirmText || opts.cancelText || opts.onConfirm) {
                footerEl.style.display = 'flex';
                if (cancelBtn) {
                    cancelBtn.style.display = opts.cancelText === false ? 'none' : 'inline-block';
                    cancelBtn.innerHTML = opts.cancelText || 'Annuler';
                    cancelBtn.onclick = () => {
                        if (typeof opts.onCancel === 'function') opts.onCancel();
                        UI.closeModal();
                    };
                }
                if (confirmBtn) {
                    confirmBtn.style.display = opts.confirmText === false ? 'none' : 'inline-block';
                    confirmBtn.innerHTML = opts.confirmText || 'Confirmer';
                    confirmBtn.onclick = () => {
                        if (typeof opts.onConfirm === 'function') {
                            const res = opts.onConfirm();
                            if (res !== false) UI.closeModal();
                        } else {
                            UI.closeModal();
                        }
                    };
                }
            } else {
                footerEl.style.display = 'none';
            }
        }

        // Apply size class
        if (dialog) {
            dialog.className = 'modal-dialog';
            if (size === 'lg' || size === 'modal-lg') dialog.classList.add('modal-lg');
            if (size === 'xl' || size === 'modal-xl') dialog.classList.add('modal-xl');
            if (size === 'sm' || size === 'modal-sm') dialog.classList.add('modal-sm');
            if (size === 'md' || size === 'modal-md') dialog.classList.add('modal-md');
            if (size === 'fullscreen' || size === 'modal-fullscreen') dialog.classList.add('modal-fullscreen');
            const fsBtn = document.getElementById('toggleModalFullscreenBtn');
            if (fsBtn) {
                const isFs = (dialog.classList && typeof dialog.classList.contains === 'function') ? dialog.classList.contains('modal-fullscreen') : (dialog.className || '').includes('modal-fullscreen');
                fsBtn.innerHTML = `<i class="fas fa-${isFs ? 'compress' : 'expand'}"></i>`;
                fsBtn.title = isFs ? 'Restaurer la fenêtre' : 'Plein écran (100% écran)';
            }
        }

        // Show
        overlay.classList.remove('hidden');
        overlay.classList.add('active');

        // Wire close button
        if (closeBtn) closeBtn.onclick = () => {
            if (typeof opts.onCancel === 'function') opts.onCancel();
            UI.closeModal();
        };

        // Close on backdrop click
        overlay.onclick = (e) => { 
            if (e.target === overlay) {
                if (typeof opts.onCancel === 'function') opts.onCancel();
                UI.closeModal();
            }
        };
    },

    toggleModalFullscreen() {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return;
        const dialog = overlay.querySelector('.modal-dialog');
        const fsBtn = document.getElementById('toggleModalFullscreenBtn');
        if (!dialog) return;

        const isFs = dialog.classList.toggle('modal-fullscreen');
        if (fsBtn) {
            fsBtn.innerHTML = `<i class="fas fa-${isFs ? 'compress' : 'expand'}"></i>`;
            fsBtn.title = isFs ? 'Restaurer la fenêtre' : 'Plein écran (100% écran)';
        }
    },

    closeModal() {
        if (typeof Decharges !== 'undefined' && typeof Decharges.stopServeCamera === 'function') {
            Decharges.stopServeCamera();
        }
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            const dlg = overlay.querySelector('.modal-dialog');
            if (dlg) {
                dlg.classList.remove('modal-fullscreen', 'modal-lg', 'modal-xl');
                dlg.className = 'modal-dialog';
            }
            const body = document.getElementById('modalBody');
            if (body) body.innerHTML = '';
        }
        if (typeof Vehicle3DViewer !== 'undefined' && Vehicle3DViewer.dispose) {
            try { Vehicle3DViewer.dispose(); } catch(e) {}
        }
    },

    // Alias for modules.js compatibility
    hideModal() { this.closeModal(); },

    // Alert alias — modules.js calls UI.showAlert() which should map to Utils.showNotification()
    showAlert(msg, type) { Utils.showNotification(msg, type); },

    // Refresh alias — modules.js calls UI.refresh() to reload current module
    refresh() {
        if (typeof App !== 'undefined' && App.currentModule) {
            App.loadModule(App.currentModule, App.currentTab);
        }
    },

    // Notification alias
    showNotification(msg, type) { Utils.showNotification(msg, type); },

    // === THEME ===
    applyTheme(settings) {
        settings = Object.assign({}, (typeof DB !== 'undefined' ? DB.getSettings() : {}), settings || {});
        const mode = settings.themeMode || localStorage.getItem('sde_theme') || 'light';
        try { localStorage.setItem('sde_theme', mode); } catch (e) {}
        const isDark = (mode === 'dark' || mode === 'black');
        let color = (settings && settings.themeColor) ? String(settings.themeColor).trim().toLowerCase() : '';
        if (!color || color === '#2563eb' || color === '#38bdf8' || color === '#7c1d2d' || color === '#631221' || color === '#4d0b17' || color === '#380710' || color === '#991b1b' || color === '#800020' || color === '#800000' || color.startsWith('#7') || color.startsWith('#6') || color.startsWith('#4') || color.startsWith('#3') || color.startsWith('#8') || color.startsWith('#9')) {
            color = isDark ? '#38bdf8' : '#2563eb';
        }
        const root = document.documentElement;
        root.style.setProperty('--primary', color);
        root.style.setProperty('--accent', color);
        root.style.setProperty('--gruna', isDark ? '#f87171' : '#991b1b');
        const hex = color.replace('#','');
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0,2),16);
            const g = parseInt(hex.substring(2,4),16);
            const b = parseInt(hex.substring(4,6),16);
            root.style.setProperty('--primary-rgb', `${r},${g},${b}`);
            // Compute dark and light variants
            const darken = (v,f) => Math.max(0, Math.round(v*f));
            const lighten = (v,f) => Math.min(255, Math.round(v + (255-v)*f));
            root.style.setProperty('--primary-dark', `rgb(${darken(r,0.7)},${darken(g,0.7)},${darken(b,0.7)})`);
            root.style.setProperty('--primary-hover', isDark ? `rgb(${lighten(r,0.2)},${lighten(g,0.2)},${lighten(b,0.2)})` : `rgb(${darken(r,0.8)},${darken(g,0.8)},${darken(b,0.8)})`);
            root.style.setProperty('--primary-light', `rgba(${r},${g},${b},${isDark ? 0.18 : 0.08})`);
            root.style.setProperty('--accent-light', `rgba(${r},${g},${b},${isDark ? 0.18 : 0.08})`);
            root.style.setProperty('--accent-hover', isDark ? `rgb(${lighten(r,0.2)},${lighten(g,0.2)},${lighten(b,0.2)})` : `rgb(${darken(r,0.8)},${darken(g,0.8)},${darken(b,0.8)})`);
        }
        // Theme mode — light, dark, or black
        if (isDark) {
            document.body.setAttribute('data-theme', mode);
            document.documentElement.setAttribute('data-theme', mode);
        } else {
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    },

    toggleTheme() {
        const s = DB.getSettings();
        const modes = ['light', 'dark', 'black'];
        const current = s.themeMode || 'light';
        const idx = modes.indexOf(current);
        const newMode = modes[(idx + 1) % modes.length];
        DB.updateSettings({ themeMode: newMode });
        try { localStorage.setItem('sde_theme', newMode); } catch (e) {}
        // Update icon
        const icon = document.querySelector('#toggleTheme i');
        if (icon) {
            const icons = { light: 'fas fa-moon', dark: 'fas fa-circle-half-stroke', black: 'fas fa-sun' };
            icon.className = icons[newMode] || 'fas fa-adjust';
        }
        // Show notification
        const labels = { light: '☀️ Thème Clair', dark: '🌙 Thème Sombre', black: '⬛ Thème Noir' };
        if (typeof Utils !== 'undefined') Utils.showNotification(labels[newMode] || newMode, 'info');
    },

    // === SORTABLE TABLES ===
    makeSortableTables(container) {
        if (!container) container = document;
        container.querySelectorAll('table').forEach(table => {
            const headers = table.querySelectorAll('thead th');
            headers.forEach((th, idx) => {
                if (th.dataset.sortBound) return;
                th.dataset.sortBound = '1';
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => this.sortTable(table, idx, th));
            });
        });
    },

    sortTable(table, colIdx, th) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const asc = !th.classList.contains('asc');
        table.querySelectorAll('th').forEach(h => h.classList.remove('asc','desc'));
        th.classList.add(asc ? 'asc' : 'desc');
        const dir = asc ? 1 : -1;
        rows.sort((a,b) => {
            const av = a.cells[colIdx]?.innerText.trim() || '';
            const bv = b.cells[colIdx]?.innerText.trim() || '';
            const an = parseFloat(av.replace(/[^\d.-]/g,''));
            const bn = parseFloat(bv.replace(/[^\d.-]/g,''));
            if (!isNaN(an) && !isNaN(bn)) return (an-bn)*dir;
            return av.localeCompare(bv,'fr',{numeric:true})*dir;
        });
        rows.forEach(r => tbody.appendChild(r));
    },

    // === CLOCK — uses systemClock from index.html ===
    startClock() {
        const el = document.getElementById('systemClock');
        if (!el) return;
        const tick = () => {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('fr-FR');
            el.title = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };
        tick();
        setInterval(tick, 1000);
    },

    // === SIDEBAR ===
    toggleSidebar() {
        const sb = document.getElementById('sidebar');
        if (sb) sb.classList.toggle('collapsed');
    }
};


// =============================================================================
// 5. History — Change tracking
// =============================================================================
window.History = {
    log(col, itemId, action, note, data) {
        const user = Auth ? Auth.getCurrentUser() : null;
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2,5),
            col, itemId, action, note,
            data: typeof data === 'string' ? data : JSON.stringify(data),
            userId: user ? user.id : 'system',
            userName: user ? user.name : 'System',
            timestamp: Date.now()
        };
        if (!DB.data.history) DB.data.history = [];
        DB.data.history.push(entry);
    },
    getHistory(col, itemId) {
        return DB.where('history', h => h.col === col && h.itemId == itemId).sort((a,b) => b.timestamp - a.timestamp);
    },
    getAllHistory() {
        return DB.getAll('history').sort((a,b) => b.timestamp - a.timestamp);
    },
    renderTable(col, itemId) {
        const hist = this.getHistory(col, itemId);
        if (!hist.length) return '<p class="text-muted">Aucun historique.</p>';
        let h = '<table class="table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Note</th></tr></thead><tbody>';
        hist.forEach(r => {
            const badge = r.action==='CREATE' ? 'badge-success' : r.action==='UPDATE' ? 'badge-warning' : 'badge-danger';
            h += `<tr><td>${Utils.formatDateTime(r.timestamp)}</td><td>${Utils.escapeHTML(r.userName)}</td><td><span class="badge ${badge}">${r.action}</span></td><td>${Utils.escapeHTML(r.note||'')}</td></tr>`;
        });
        return h + '</tbody></table>';
    }
};


// =============================================================================
// 6. ScanStore — IndexedDB for files/images
// =============================================================================
window.ScanStore = {
    dbName: 'ErpDouroubScans', dbVersion: 1, storeName: 'scans', db: null,
    init() {
        return new Promise((res, rej) => {
            const rq = indexedDB.open(this.dbName, this.dbVersion);
            rq.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains(this.storeName)) d.createObjectStore(this.storeName, {keyPath:'id'}); };
            rq.onsuccess = e => { this.db = e.target.result; res(); };
            rq.onerror = e => { console.error('IDB err:', e.target.error); rej(e.target.error); };
        });
    },
    saveFile(id, blob, meta={}) {
        return new Promise((res,rej) => {
            if (!this.db) return rej('no db');
            const tx = this.db.transaction([this.storeName],'readwrite');
            const rq = tx.objectStore(this.storeName).put({id, blob, ...meta, timestamp:Date.now()});
            rq.onsuccess = () => res(id);
            rq.onerror = e => rej(e.target.error);
        });
    },
    getFile(id) {
        return new Promise((res,rej) => {
            if (!this.db) return rej('no db');
            const rq = this.db.transaction([this.storeName],'readonly').objectStore(this.storeName).get(id);
            rq.onsuccess = e => res(e.target.result || null);
            rq.onerror = e => rej(e.target.error);
        });
    },
    deleteFile(id) {
        return new Promise((res,rej) => {
            if (!this.db) return rej('no db');
            const rq = this.db.transaction([this.storeName],'readwrite').objectStore(this.storeName).delete(id);
            rq.onsuccess = () => res(true);
            rq.onerror = e => rej(e.target.error);
        });
    },
    getAllFiles() {
        return new Promise((res,rej) => {
            if (!this.db) return rej('no db');
            const rq = this.db.transaction([this.storeName],'readonly').objectStore(this.storeName).getAll();
            rq.onsuccess = e => res(e.target.result);
            rq.onerror = e => rej(e.target.error);
        });
    }
};


// =============================================================================
// 7. SuiviBcBridge — Bidirectional Bridge between Suivi Achats & Stock ERP
// =============================================================================
const SuiviBcBridge = {
    _getDb() {
        if (typeof window !== 'undefined' && window.DB) return window.DB;
        if (typeof globalThis !== 'undefined' && globalThis.DB) return globalThis.DB;
        return null;
    },

    _ensureDb() {
        const db = this._getDb();
        if (db) {
            if (!db.data && typeof db.init === 'function') db.init();
            if (db.data) {
                if (!Array.isArray(db.data.articles)) db.data.articles = [];
                if (!Array.isArray(db.data.stockMovements)) db.data.stockMovements = [];
                if (!db.data.ingestedBcs || typeof db.data.ingestedBcs !== 'object') db.data.ingestedBcs = {};
                return db.data;
            }
        }
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('erp_douroub_db');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed) {
                        if (!Array.isArray(parsed.articles)) parsed.articles = [];
                        if (!Array.isArray(parsed.stockMovements)) parsed.stockMovements = [];
                        if (!parsed.ingestedBcs || typeof parsed.ingestedBcs !== 'object') parsed.ingestedBcs = {};
                        return parsed;
                    }
                } catch (e) {}
            }
        }
        return { articles: [], stockMovements: [], ingestedBcs: {} };
    },

    _saveDb(dbData) {
        const db = this._getDb();
        if (db && typeof db.save === 'function') {
            db.save();
            return;
        }
        if (typeof localStorage !== 'undefined' && dbData) {
            try {
                localStorage.setItem('erp_douroub_db', JSON.stringify(dbData));
            } catch (e) {
                console.error('Error saving erp_douroub_db to localStorage:', e);
            }
        }
    },

    _getSuiviData() {
        const keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
        let storageKey = null;
        let suiviState = null;

        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < keys.length; i++) {
                const raw = localStorage.getItem(keys[i]);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed) {
                            storageKey = keys[i];
                            suiviState = parsed;
                            break;
                        }
                    } catch (e) {}
                }
            }
        }

        let bcRecords = [];
        if (suiviState) {
            if (Array.isArray(suiviState.bcRecords) && suiviState.bcRecords.length > 0) {
                bcRecords = suiviState.bcRecords;
            } else if (Array.isArray(suiviState) && suiviState.length > 0) {
                bcRecords = suiviState;
            }
        }

        if (bcRecords.length === 0) {
            const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
            if (root && root.PRELOAD_DATA && Array.isArray(root.PRELOAD_DATA.bcRecords)) {
                bcRecords = root.PRELOAD_DATA.bcRecords;
            }
        }

        return { storageKey: storageKey || 'suivi_linked_v30', suiviState, bcRecords };
    },

    getAvailableBcsForStock() {
        const { bcRecords } = this._getSuiviData();
        const dbData = this._ensureDb();
        const ingestedBcs = dbData.ingestedBcs || {};
        const articles = dbData.articles || [];

        const ingestedRefMap = new Set();
        articles.forEach(art => {
            if (art.bcRef) ingestedRefMap.add(String(art.bcRef).trim().toLowerCase());
        });

        return bcRecords.map(bc => {
            const bcIdStr = String(bc.id || '').trim().toLowerCase();
            const bcRefStr = String(bc.ref || '').trim().toLowerCase();

            const isIngested = Boolean(
                bc.stockIngested === true ||
                (bc.id && ingestedBcs[bc.id]) ||
                (bc.ref && ingestedBcs[bc.ref]) ||
                (bcIdStr && ingestedRefMap.has(bcIdStr)) ||
                (bcRefStr && ingestedRefMap.has(bcRefStr))
            );

            let lineItems = [];
            if (Array.isArray(bc.lineItems) && bc.lineItems.length > 0) {
                lineItems = bc.lineItems.map(item => ({
                    description: item.description || item.designation || '',
                    qty: Number(item.qty || item.quantity || 1),
                    unit: item.unit || 'U',
                    unitPrice: Number(item.unitPrice || item.price || 0),
                    lineTotal: Number(item.lineTotal || (Number(item.qty || 1) * Number(item.unitPrice || 0)))
                }));
            } else {
                const fallbackAmount = Number(bc.amountHT || bc.amount || 0);
                lineItems = [{
                    description: bc.description || ('Article BC ' + (bc.ref || '')),
                    qty: 1,
                    unit: 'U',
                    unitPrice: fallbackAmount,
                    lineTotal: fallbackAmount
                }];
            }

            return {
                id: bc.id,
                ref: bc.ref || '',
                date: bc.date || '',
                supplierName: bc.supplierName || '',
                status: bc.status || '',
                isIngested: isIngested,
                lineItems: lineItems,
                stockArticleId: bc.stockArticleId || null,
                stockIngestedAt: bc.stockIngestedAt || null,
                rawBc: bc
            };
        });
    },

    checkArticleExistsInStock(designation, code) {
        const dbData = this._ensureDb();
        const articles = dbData.articles || [];
        const trimmedCode = code ? String(code).trim().toLowerCase() : '';
        const trimmedDesig = designation ? String(designation).trim().toLowerCase() : '';

        if (!trimmedCode && !trimmedDesig) return null;

        if (trimmedCode) {
            const foundByCode = articles.find(a =>
                (a.code && String(a.code).trim().toLowerCase() === trimmedCode) ||
                (a.barcode && String(a.barcode).trim().toLowerCase() === trimmedCode)
            );
            if (foundByCode) return foundByCode;
        }

        if (trimmedDesig) {
            const exactMatch = articles.find(a =>
                a.designation && String(a.designation).trim().toLowerCase() === trimmedDesig
            );
            if (exactMatch) return exactMatch;

            if (trimmedDesig.length >= 3) {
                const subMatch = articles.find(a => {
                    if (!a.designation) return false;
                    const d = String(a.designation).trim().toLowerCase();
                    return d.includes(trimmedDesig) || (d.length >= 3 && trimmedDesig.includes(d));
                });
                if (subMatch) return subMatch;
            }
        }

        return null;
    },

    ingestBcIntoStock(bcId, selectedLineIndex, options = {}) {
        const mode = options.mode || 'create_new';
        const allBcs = this.getAvailableBcsForStock();
        const found = allBcs.find(b => b.id === bcId || b.ref === bcId);
        if (!found) {
            throw new Error(`Bon de Commande introuvable: ${bcId}`);
        }
        if (found.isIngested) {
            throw new Error(`Ce Bon de Commande (${found.ref || bcId}) a déjà été réceptionné en stock.`);
        }

        const lineIdx = (typeof selectedLineIndex === 'number' && selectedLineIndex >= 0) ? selectedLineIndex : 0;
        const line = (found.lineItems && found.lineItems[lineIdx]) || found.lineItems[0];
        if (!line) {
            throw new Error('Aucun article ou ligne trouvé dans ce Bon de Commande.');
        }

        const qty = Number(line.qty) || 1;
        const unitPrice = Number(line.unitPrice) || 0;
        const description = line.description || found.rawBc?.description || ('Article BC ' + (found.ref || bcId));
        const unit = line.unit || 'U';

        const db = this._getDb();
        const dbData = this._ensureDb();
        const currentUser = (typeof Auth !== 'undefined' && Auth && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
        const username = currentUser ? (currentUser.username || currentUser.name || 'admin') : 'admin';
        const userId = currentUser ? (currentUser.id || 'admin') : 'admin';
        const nowIso = new Date().toISOString();

        let targetArticle = null;

        if (mode === 'increment_existing') {
            const targetId = options.targetArticleId;
            if (!targetId) {
                throw new Error("L'option targetArticleId est requise pour le mode increment_existing.");
            }
            targetArticle = dbData.articles.find(a => a.id === targetId || a.code === targetId);
            if (!targetArticle) {
                throw new Error(`Article introuvable en stock avec l'identifiant: ${targetId}`);
            }
            targetArticle.quantity = (Number(targetArticle.quantity) || 0) + qty;
            if (!targetArticle.price && unitPrice > 0) targetArticle.price = unitPrice;
            if (!targetArticle.bcRef) targetArticle.bcRef = found.ref || bcId;
            if (!targetArticle.supplier && found.supplierName) targetArticle.supplier = found.supplierName;
            targetArticle.updatedAt = Date.now();
        } else {
            const category = options.category || 'Pièces de Rechange (PDR)';
            const family = options.family || 'Pièces de Rechange (PDR)';
            const zone = options.zone || 'Zone A';
            const minThreshold = options.minThreshold !== undefined ? Number(options.minThreshold) : 2;

            let code = '';
            if (db && typeof db.generateArticleCode === 'function') {
                code = db.generateArticleCode(category);
            } else {
                code = 'ART-' + Date.now().toString(36).toUpperCase();
            }

            const newId = 'art_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            targetArticle = {
                id: newId,
                code: code,
                designation: description,
                category: category,
                family: family,
                quantity: qty,
                unit: unit,
                minThreshold: minThreshold,
                price: unitPrice,
                barcode: code,
                zone: zone,
                supplier: found.supplierName || '',
                bcRef: found.ref || bcId,
                createdAt: Date.now(),
                createdBy: userId,
                createdByName: username,
                notes: 'Importé depuis Suivi Achats (BC: ' + (found.ref || bcId) + ')'
            };
            dbData.articles.push(targetArticle);
        }

        const movement = {
            id: 'mov_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            articleId: targetArticle.id,
            articleCode: targetArticle.code || '',
            designation: targetArticle.designation || description,
            type: 'ENTREE',
            quantity: qty,
            reason: 'Réception Fournisseur BC #' + (found.ref || bcId),
            date: nowIso,
            user: username,
            reference: found.ref || bcId,
            bcRef: found.ref || bcId,
            supplier: found.supplierName || ''
        };
        dbData.stockMovements.push(movement);

        dbData.ingestedBcs = dbData.ingestedBcs || {};
        const ingestionStamp = {
            ingestedAt: nowIso,
            articleId: targetArticle.id,
            bcRef: found.ref || bcId,
            quantity: qty,
            lineIndex: lineIdx
        };
        if (found.id) dbData.ingestedBcs[found.id] = ingestionStamp;
        if (found.ref) dbData.ingestedBcs[found.ref] = ingestionStamp;
        if (bcId) dbData.ingestedBcs[bcId] = ingestionStamp;

        if (typeof History !== 'undefined' && History && typeof History.log === 'function') {
            History.log('articles', targetArticle.id, 'INGEST_BC', 'Réception Fournisseur BC #' + (found.ref || bcId), {
                bcId: found.id || bcId,
                bcRef: found.ref,
                qty: qty,
                mode: mode
            });
        }

        this._saveDb(dbData);
        this._stampSuiviStorage(found.id || bcId, found.ref || bcId, targetArticle.id, nowIso);

        return {
            success: true,
            article: targetArticle,
            movement: movement,
            bcRef: found.ref || bcId,
            ingestedAt: nowIso
        };
    },

    _stampSuiviStorage(bcId, bcRef, articleId, ingestedAt) {
        const updateBcRecord = (bc) => {
            if ((bc.id && bc.id === bcId) || (bc.ref && (bc.ref === bcRef || bc.ref === bcId))) {
                bc.stockIngested = true;
                bc.stockArticleId = articleId;
                bc.stockIngestedAt = ingestedAt;
                bc.status = 'receptionne';
                return true;
            }
            return false;
        };

        const keys = ['suivi_linked_v30', 'suivi_compact_v20', 'suivi_local_v12'];
        if (typeof localStorage !== 'undefined') {
            keys.forEach(key => {
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        let modified = false;
                        if (parsed && Array.isArray(parsed.bcRecords)) {
                            parsed.bcRecords.forEach(bc => {
                                if (updateBcRecord(bc)) modified = true;
                            });
                        } else if (Array.isArray(parsed)) {
                            parsed.forEach(bc => {
                                if (updateBcRecord(bc)) modified = true;
                            });
                        }
                        if (modified) {
                            localStorage.setItem(key, JSON.stringify(parsed));
                        }
                    } catch (e) {}
                }
            });
        }

        const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
        if (root) {
            if (root.PRELOAD_DATA && Array.isArray(root.PRELOAD_DATA.bcRecords)) {
                root.PRELOAD_DATA.bcRecords.forEach(updateBcRecord);
            }
            if (root.state && Array.isArray(root.state.bcRecords)) {
                root.state.bcRecords.forEach(updateBcRecord);
                if (typeof root.saveState === 'function') {
                    try { root.saveState(); } catch (e) {}
                }
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.SuiviBcBridge = SuiviBcBridge;
}
if (typeof globalThis !== 'undefined') {
    globalThis.SuiviBcBridge = SuiviBcBridge;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SuiviBcBridge, DB: typeof DB !== 'undefined' ? DB : null };
}

