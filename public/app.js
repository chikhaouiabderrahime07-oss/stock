/* ============================================================
   APP.JS — Application Bootstrap & Router
   Gestion de Stock — DOUROUB ELDJAZAIR v5.0
   ============================================================ */

const App = {
    currentModule: null,
    currentTab: null,
    _reloadTimer: null,

    titlesMap: {
        dashboard: 'Tableau de Bord',
        stock: 'Articles & Inventaire',
        stockMovements: 'Mouvements de Stock',
        decharges: 'Sorties Magasin & Décharges',
        pvs: 'PV Mise à Disposition',
        fleet: 'Parc Matériel',
        materialFamilies: 'Familles de Matériel',
        citernes: 'Gestion des Citernes',
        preOrders: 'Demandes de Matériel',
        history: 'Historique & Traçabilité',
        kpi: 'Dashboard KPI',
        reports: 'Rapports & Statistiques',
        consumption: 'Suivi Consommation',
        barcodeScanner: 'Scanner Code-barres',
        barcodeGenerator: 'Générateur de Codes',
        users: 'Utilisateurs',
        beneficiaries: 'Personnel & Départements',
        notifications: 'Centre de Notifications',
        planTravail: 'Plans de Travail & Maintenance Flotte',
        settings: 'Paramètres'
    },

    init() {
        try {
            // Detect if running inside parent portal
            if (window.self !== window.top) {
                document.body.classList.add('in-portal');
                const sp = document.getElementById('splashScreen');
                if (sp) sp.remove();
            }

            // 1. Initialize database
            if (typeof DB !== 'undefined') DB.init();

            // 2. Initialize auth (restore session — try JWT first, then fallbacks)
            if (typeof Auth !== 'undefined') {
                const authInitResult = Auth.init();
                // Auth.init is now async (returns Promise) when JWT exists
                if (authInitResult && typeof authInitResult.then === 'function') {
                    authInitResult.then(() => {
                        this._postAuthInit();
                    }).catch(() => {
                        this._postAuthInit();
                    });
                } else {
                    this._postAuthInit();
                }
            }

            // 3. Apply theme (must come after DB.init so settings exist)
            try {
                const currentTheme = localStorage.getItem('sde_theme') || localStorage.getItem('sde_portal_theme') || 'light';
                document.documentElement.setAttribute('data-theme', currentTheme);
                document.body.setAttribute('data-theme', currentTheme);
                if (typeof DB !== 'undefined') DB.updateSettings({ themeMode: currentTheme });
                if (typeof UI !== 'undefined' && UI.applyTheme) UI.applyTheme({ themeMode: currentTheme });
            } catch (e) {
                if (typeof UI !== 'undefined' && UI.applyTheme) {
                    UI.applyTheme({ themeMode: 'light' });
                }
            }

            // Listen for unified portal theme broadcast
            window.addEventListener('message', (event) => {
                if (event.data && event.data.action === 'setTheme') {
                    const theme = event.data.theme;
                    if (typeof DB !== 'undefined') DB.updateSettings({ themeMode: theme });
                    if (typeof UI !== 'undefined' && UI.applyTheme) UI.applyTheme({ themeMode: theme });
                }
            });

            // 6. Wire events (always, even before auth resolves)
            this.wireUpEvents();

        } catch (e) {
            console.error('Erreur initialisation:', e);
        }
    },

    _postAuthInit() {
        try {
            // 4. Init ScanStore (IndexedDB)
            if (typeof ScanStore !== 'undefined') {
                ScanStore.init().catch(e => console.warn('ScanStore init failed:', e));
            }

            // 4a. Show company branding on login screen
            try {
                const settings = DB.getSettings();
                const logo = settings.rightLogo || settings.leftLogo || '';
                if (logo) {
                    const logoEl = document.getElementById('loginCompanyLogo');
                    if (logoEl) { logoEl.src = logo; logoEl.style.display = 'inline'; }
                }
                if (settings.companyName) {
                    const nameEl = document.getElementById('loginCompanyName');
                    if (nameEl) nameEl.textContent = settings.companyName;
                }
            } catch(e) {}

            // 5. Check if logged in
            if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                this.showApp(false);
            } else {
                this.showLogin();
            }
        } catch (e) {
            console.error('Post-auth init error:', e);
            this.showLogin();
        }
    },

    showLogin() {
        // Use actual IDs from index.html
        const loginEl = document.getElementById('loginScreen');
        const appEl = document.getElementById('appContainer');
        if (loginEl) loginEl.style.display = 'flex';
        if (appEl) { appEl.style.display = 'none'; appEl.classList.add('hidden'); }
    },

    showApp(isFreshLogin = false) {
        try {
            const loginEl = document.getElementById('loginScreen');
            const appEl = document.getElementById('appContainer');

            // --- MODULE GATE: Check where user should go BEFORE showing anything ---
            try {
                const currentUser = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
                if (currentUser) {
                    const role = (currentUser.role || '').toLowerCase();
                    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'directeur';
                    const defMod = currentUser.defaultModule || 'stock';
                    const hasActiveSession = Boolean((window.location.hash && window.location.hash !== '#') || localStorage.getItem('erp_active_module'));

                    // Only show fullscreen gate modal if this is an explicit fresh login AND no target module was specified
                    if (isAdmin && isFreshLogin && !hasActiveSession) {
                        if (loginEl) loginEl.style.display = 'none';
                        this.showModulePickerModal();
                        return; // Gate handles navigation
                    } else if (defMod === 'bc' && !hasActiveSession && localStorage.getItem('erp_jwt_token')) {
                        window.location.href = '/suivi-achats-premium/';
                        return;
                    }
                    // Continue directly to application
                }
            } catch (gateErr) {}

            if (loginEl) loginEl.style.display = 'none';
            if (appEl) { appEl.style.display = ''; appEl.classList.remove('hidden'); }

            // Show sync status
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                const artCount = (DB && DB.data && DB.data.articles) ? DB.data.articles.length : 0;
                Utils.showNotification('✅ Connecté — ' + artCount + ' articles chargés depuis MongoDB', 'success');
            }

            // Branding: Top company name dynamically updated from settings
            const topComp = document.getElementById('topCompanyName');
            if (topComp) {
                const s = (typeof DB !== 'undefined' && DB.getSettings) ? DB.getSettings() : {};
                topComp.textContent = s.companyName || 'SPA DOUROUB ELDJAZAIR';
            }

            // Update user info in topbar
            this.updateUserInfo();

            // Build sidebar navigation (dynamic based on role)
            this.buildSidebar();

            // Start clock
            if (typeof UI !== 'undefined' && UI.startClock) UI.startClock();

            // Initialize Notifications
            if (typeof Notify !== 'undefined') {
                Notify.init();
                Notify.updateBadge();
            }

            // Sync top stock request button badge
            if (typeof Cart !== 'undefined' && Cart.updateBadge) {
                Cart.updateBadge();
            }

            // FIX 1: Redirect to BC module if ?redirect=bc is present AND we have a JWT token
            try {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('redirect') === 'bc' && localStorage.getItem('erp_jwt_token')) {
                    window.location.href = '/suivi-achats-premium/';
                    return;
                }
            } catch (err) {}

            // Load restored module from hash, previous session, or default to stock
            const rawHash = (window.location.hash ? window.location.hash.slice(1) : '').trim();
            const hashParts = rawHash.split(':');
            const hashModule = hashParts[0] && hashParts[0] !== 'login' ? hashParts[0] : null;
            const hashTab = hashParts[1] || undefined;
            const savedModule = hashModule || localStorage.getItem('erp_active_module') || 'stock';
            let savedTab = hashTab || localStorage.getItem('erp_active_tab') || undefined;
            if (savedTab === 'new') {
                savedTab = 'kpi';
                try { localStorage.setItem('erp_active_tab', 'kpi'); } catch (e) {}
            }
            const targetMod = (typeof Auth !== 'undefined' && Auth.canView(savedModule)) ? savedModule : 'stock';
            this.loadModule(targetMod, savedTab, false);

            // Auto-open GDS Scanner if query param ?scan_gds=1 is present
            try {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('scan_gds') === '1') {
                    if (typeof window.isUserEligibleForGdsScan === 'function' && window.isUserEligibleForGdsScan()) {
                        setTimeout(() => {
                            if (window.GdsScannerModule && GdsScannerModule.openModal) {
                                GdsScannerModule.openModal();
                            } else if (window.GdsScanner && GdsScanner.openModal) {
                                GdsScanner.openModal();
                            }
                        }, 250);
                    } else {
                        alert("Accès restreint : Seul un Gestionnaire de Stock (GDS) ou Magasinier habilité peut déduire des marchandises par scan.");
                    }
                }
            } catch (err) {}

            // Subtle first-login welcome toast prompting new users for guided tour
            try {
                if (window.StockTutorialModule && StockTutorialModule.checkWelcomePrompt) {
                    setTimeout(() => StockTutorialModule.checkWelcomePrompt(), 1200);
                }
            } catch (err) {}

            // ── MOBILE UI ─────────────────────────────────────────────────────
            try {
                if (window.innerWidth <= 768) {
                    const mobileNav = document.getElementById('mobileBottomNav');
                    if (mobileNav) mobileNav.style.display = 'flex';
                    const hamburger = document.getElementById('mobileMenuBtn');
                    if (hamburger) hamburger.style.display = 'flex';
                }
                // Also update active state on bottom nav when module changes
                this._syncMobileNavActive();
            } catch (err) {}

        } catch (e) {
            console.error('Erreur showApp:', e);
        }
    },

    toggleMobileNav() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;
        nav.classList.toggle('mobile-open');
        // Close when clicking outside
        if (nav.classList.contains('mobile-open')) {
            const closeHandler = (e) => {
                if (!nav.contains(e.target) && e.target.id !== 'mobileMenuBtn') {
                    nav.classList.remove('mobile-open');
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 50);
        }
    },

    _syncMobileNavActive() {
        const btns = document.querySelectorAll('#mobileBottomNav .mob-nav-btn:not(.scan-fab-nav)');
        const moduleMap = ['dashboard', 'stock', 'decharges'];
        btns.forEach((btn, i) => {
            if (moduleMap[i] === this.currentModule) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    },

    updateUserInfo() {
        const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
        if (!user) return;
        const roleLabels = { admin: 'Administrateur', magasinier: 'Magasinier', user: 'Utilisateur', normal: 'Utilisateur' };

        // Compute initials
        const name = user.name || user.username || 'U';
        const parts = name.trim().split(/\s+/);
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();

        // Badge (navbar)
        const badge = document.getElementById('userInitialsBadge');
        if (badge) badge.textContent = initials;

        // Rich dropdown header
        const bigBadge = document.getElementById('udropAvatarLg');
        const fullName = document.getElementById('udropFullName');
        const roleEl = document.getElementById('udropRole');
        const serviceEl = document.getElementById('udropService');
        if (bigBadge) bigBadge.textContent = initials;
        if (fullName) fullName.textContent = name;
        if (roleEl) roleEl.textContent = roleLabels[user.role] || user.role || 'Utilisateur';
        if (serviceEl) serviceEl.textContent = user.service || user.department || '';

        // Suivi Achats dropdown link visibility for eligible roles
        const udropAchatsLink = document.getElementById('udropAchatsLink');
        if (udropAchatsLink) {
            const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'directeur' || user.role === 'management' || user.role === 'appro');
            udropAchatsLink.style.display = isAdmin ? 'flex' : 'none';
        }

        // General Settings link (admin only)
        const udropGenSettings = document.getElementById('udropGeneralSettingsLink');
        if (udropGenSettings) {
            const isFullAdmin = user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'directeur');
            udropGenSettings.style.display = isFullAdmin ? 'flex' : 'none';
        }

        // GDS Scanner button & FAB visibility for eligible roles
        const isEligibleGds = (typeof window.isUserEligibleForGdsScan === 'function') ? window.isUserEligibleForGdsScan() : false;
        const btnHeadGds = document.getElementById('btnHeaderGdsScanner');
        const fabGds = document.getElementById('fabGdsScanner');
        const udropGds = document.getElementById('udropGdsScanLink');
        const btnQuickGds = document.getElementById('btnGdsScan');
        if (btnHeadGds) btnHeadGds.style.display = isEligibleGds ? 'inline-flex' : 'none';
        if (fabGds) fabGds.style.display = isEligibleGds ? 'flex' : 'none';
        if (udropGds) udropGds.style.display = isEligibleGds ? 'flex' : 'none';
        if (btnQuickGds) btnQuickGds.style.display = isEligibleGds ? 'inline-flex' : 'none';

        // Stats chips
        const bsmCount = document.getElementById('udropBsmCount');
        const btCount = document.getElementById('udropBtCount');
        const alertCount = document.getElementById('udropAlertCount');
        if (typeof DB !== 'undefined' && DB.data) {
            if (bsmCount) {
                const decharges = DB.data.decharges || [];
                bsmCount.textContent = decharges.filter(d => d.status === 'En attente GDS' || d.status === 'pending').length;
            }
            if (btCount) {
                const plans = DB.data.workPlans || [];
                btCount.textContent = plans.filter(p => p.status !== 'Clôturé' && p.status !== 'closed').length;
            }
            if (alertCount) {
                const arts = DB.data.articles || [];
                alertCount.textContent = arts.filter(a => (a.quantity || 0) < (a.minThreshold || 0)).length;
            }
        }
    },

    buildSidebar() {
        const nav = document.querySelector('.main-nav') || document.querySelector('.sidebar-nav');
        if (!nav) return;

        const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
        const role = user ? user.role : 'user';
        const isAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function') ? Auth.isAdmin() : (role === 'admin' || role === 'superadmin' || role === 'directeur');
        const isMag = (typeof Auth !== 'undefined' && typeof Auth.isMag === 'function') ? Auth.isMag() : (role === 'magasinier');

        let html = '';

        // 1. Dashboard (Direct link)
        html += `<a href="#" class="nav-link active" data-module="dashboard"><i class="fas fa-th-large"></i> Accueil</a>`;

        if (isAdmin || isMag) {
            // 2. Réparations (BT) — Prominent Top Navigation Item
            const reparationItems = [
                { mod:'planTravail', tab:'kpi', icon:'fa-chart-pie', label:'Tableau de bord & Suivi KPIs' },
                { mod:'planTravail', tab:'new', icon:'fa-plus-circle', label:'Nouvel Ordre de Réparation' },
                { mod:'planTravail', tab:'history', icon:'fa-clipboard-list', label:'Historique des Bons de Réparation' }
            ];
            html += this._dropdown('Réparations (BT)', 'fa-screwdriver-wrench', reparationItems, 'planTravail', 'kpi');

            // 3. Stock & Demandes de Matériel
            const stockItems = [
                { mod:'stock', icon:'fa-boxes-stacked', label:'Consulter le stock et catalogue' },
                { mod:'stockMovements', icon:'fa-right-left', label:'Mouvements de Stock' },
                { mod:'cart', icon:'fa-clipboard-list', label:'Demande de Matériel' }
            ];
            html += this._dropdown('Stock', 'fa-boxes-stacked', stockItems, 'stock');

            // 4. Sorties Magasin & Décharges (BSM & BD)
            const dechargeItems = [
                { mod:'decharges', tab:'all', icon:'fa-list-check', label:'Registre Sorties Magasin & Décharges' },
                { mod:'decharges', tab:'bsm', icon:'fa-arrow-right-from-bracket', label:'Bons de Sortie Magasin (BSM - Consommables & Pièces)' },
                { mod:'decharges', tab:'decharges', icon:'fa-file-signature', label:'Bons de Décharge (Matériel & Outillage)' },
                { mod:'pvs', icon:'fa-stamp', label:'PV Mise à Disposition' },
                { mod:'preOrders', icon:'fa-clipboard-list', label:'Demandes de Matériel en Attente' }
            ];
            html += this._dropdown('Sorties & Décharges', 'fa-clipboard-check', dechargeItems, 'decharges', 'all');

            // 5. Flotte & Matériel
            const fleetItems = [
                { mod:'fleet', icon:'fa-truck-moving', label:'Parc Matériel & Camions' },
                { mod:'planTravail', icon:'fa-screwdriver-wrench', label:'Ordres de Réparation & Suivi Flotte' },
                { mod:'planTravail', tab:'history', icon:'fa-clock-rotate-left', label:'Historique Bons de Réparation' },
                { mod:'materialFamilies', icon:'fa-layer-group', label:'Familles de Matériel' }
            ];
            html += this._dropdown('Flotte', 'fa-truck', fleetItems, 'fleet');

            // 6. Carburant & Citernes
            const fuelItems = [
                { mod:'citernes', icon:'fa-oil-well', label:'Citernes de Carburant', tab:'tanks' },
                { mod:'citernes', icon:'fa-receipt', label:'Réceptions & Bons Naftal', tab:'deliveries' },
                { mod:'consumption', icon:'fa-chart-area', label:'Suivi Consommation Flotte' }
            ];
            html += this._dropdown('Carburant', 'fa-gas-pump', fuelItems, 'citernes', 'tanks');

            // 7. Historique & Traçabilité (Includes explicit Reparations link)
            const historyItems = [
                { mod:'planTravail', tab:'history', icon:'fa-clipboard-list', label:'📋 Historique des Réparations (BT)' },
                { mod:'history', icon:'fa-truck-pickup', label:'Historique Camions & Flotte', tab:'trucks' },
                { mod:'history', icon:'fa-users', label:'Historique Personnel & Services', tab:'persons' },
                { mod:'history', icon:'fa-clock-rotate-left', label:'Historique Demandes de Matériel', tab:'orders' }
            ];
            if (isAdmin) {
                historyItems.push({ mod:'history', icon:'fa-shield-halved', label:'Journal d\'Audit Cryptographique', tab:'audit' });
            }
            html += this._dropdown('Historique', 'fa-clock-rotate-left', historyItems, 'history', 'trucks');

            // 8. Analyses & Outils
            const toolsItems = [];
            if (isAdmin) {
                toolsItems.push({ mod:'kpi', icon:'fa-chart-column', label:'Tableau de Bord KPI' });
            }
            toolsItems.push(
                { mod:'reports', icon:'fa-file-chart-line', label:'Rapports d\'Activité' },
                { mod:'barcodeScanner', icon:'fa-camera', label:'Scanner Code-barres / QR' },
                { mod:'barcodeGenerator', icon:'fa-barcode', label:'Générateur de Codes' }
            );
            html += this._dropdown('Outils', 'fa-chart-pie', toolsItems, isAdmin ? 'kpi' : 'reports');

            // 9. Paramètres (STRICTLY Admin only!)
            if (isAdmin) {
                const settingsItems = [
                    { mod:'settings', icon:'fa-sitemap', label:'Arborescence & Base de Données', tab:'database' },
                    { mod:'settings', icon:'fa-file-csv', label:'Modèles CSV & Importations', tab:'models' },
                    { mod:'settings', icon:'fa-building', label:'Identité Entreprise & Logos', tab:'company' },
                    { mod:'users', icon:'fa-user-shield', label:'Utilisateurs & Droits d\'Accès' },
                    { mod:'settings', icon:'fa-shield-halved', label:'Sauvegarde & Maintenance', tab:'maintenance' }
                ];
                html += this._dropdown('', 'fa-cog', settingsItems, 'settings', 'database', true);
            }
        } else {
            // Normal User View: Clean, direct, dedicated to requesting stock and tracking requests
            html += `<a href="#" class="nav-link" data-module="stock"><i class="fas fa-boxes-stacked"></i> Stock</a>`;
            html += `<a href="#" class="nav-link" data-module="cart" onclick="Cart.showModal(); return false;"><i class="fas fa-cart-shopping"></i> Mon Panier <span class="nav-cart-badge" id="navCartBadge" style="display:none;">0</span></a>`;
            html += `<a href="#" class="nav-link" data-module="planTravail"><i class="fas fa-screwdriver-wrench"></i> Réparations</a>`;
            html += `<a href="#" class="nav-link" data-module="history" data-tab="orders"><i class="fas fa-clock-rotate-left"></i> Historique</a>`;
            html += `<a href="#" class="nav-link" data-module="barcodeScanner"><i class="fas fa-camera"></i> Scanner</a>`;
        }

        nav.innerHTML = html;

        // Wire click events
        nav.querySelectorAll('[data-module]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close all dropdowns
                nav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
                const mod = el.getAttribute('data-module');
                const tab = el.getAttribute('data-tab');
                this.loadModule(mod, tab, true);
            });
        });

        // Dropdown caret toggle buttons
        nav.querySelectorAll('.nav-dropdown-caret').forEach(caret => {
            caret.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const parent = caret.closest('.nav-dropdown');
                const wasOpen = parent ? parent.classList.contains('open') : false;
                nav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
                if (parent && !wasOpen) parent.classList.add('open');
            });
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                nav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
            }
        });
    },

    _dropdown(title, icon, items, primaryMod = null, primaryTab = '', isSettingsIcon = false) {
        const mod = primaryMod || (items[0] ? items[0].mod : 'dashboard');
        const tab = primaryTab || (items[0] && items[0].tab ? items[0].tab : '');
        const tabAttr = tab ? ` data-tab="${tab}"` : '';
        const itemsHtml = items.map(i => {
            const tAttr = i.tab ? ` data-tab="${i.tab}"` : '';
            return `<a href="#" class="dropdown-item" data-module="${i.mod}"${tAttr}><i class="fas ${i.icon}"></i> <span>${i.label}</span></a>`;
        }).join('');
        const titleSpan = title ? ` <span>${title}</span>` : '';
        const settingsClass = isSettingsIcon ? ' nav-settings-icon' : '';
        const iconStyle = isSettingsIcon ? ' style="color:#dc2626;"' : '';
        const tooltip = title || (isSettingsIcon ? 'Paramètres' : 'Navigation');
        return `<div class="nav-dropdown" data-nav-dropdown="${mod}">
            <div class="nav-dropdown-split${settingsClass}">
                <a href="#" class="nav-link nav-primary-link" data-module="${mod}"${tabAttr} title="${tooltip}">
                    <i class="fas ${icon}"${iconStyle}></i>${titleSpan}
                </a>
                <button type="button" class="nav-dropdown-caret" title="Menu ${tooltip}" aria-label="Menu déroulant ${tooltip}">
                    <i class="fas fa-chevron-down dd-arrow"></i>
                </button>
            </div>
            <div class="dropdown-menu">${itemsHtml}</div>
        </div>`;
    },

    loadModule(mod, tab, isUserAction = false) {
        try {
            // Intercept cart module link
            if (mod === 'cart') {
                if (typeof Cart !== 'undefined') Cart.openDrawer();
                return;
            }

            // Strict Access Control Check
            if (typeof Auth !== 'undefined' && !Auth.canView(mod)) {
                Utils.showNotification('Accès refusé : privilèges insuffisants pour accéder à ce module.', 'error');
                this.loadModule('dashboard');
                return;
            }

            // Restrict normal user inside history to 'orders' tab only
            if (mod === 'history' && typeof Auth !== 'undefined' && Auth.isNormal() && tab !== 'orders') {
                tab = 'orders';
            }

            this.currentModule = mod;
            this.currentTab = tab;
            this.updateNavActive(mod, tab);
            // Sync mobile bottom nav active state
            try { this._syncMobileNavActive(); } catch(e) {}
            // Close mobile flyout nav if open
            try {
                const nav = document.getElementById('mainNav');
                if (nav && nav.classList.contains('mobile-open')) nav.classList.remove('mobile-open');
            } catch(e) {}
            try {
                if (mod && mod !== 'cart') {
                    localStorage.setItem('erp_active_module', mod);
                    if (tab && tab !== 'new') localStorage.setItem('erp_active_tab', tab);
                    else if (tab === 'new') localStorage.setItem('erp_active_tab', 'kpi');
                    else localStorage.removeItem('erp_active_tab');

                    const targetHash = '#' + mod + (tab ? ':' + tab : '');
                    if (window.location.hash !== targetHash) {
                        history.replaceState(null, '', targetHash);
                    }
                }
            } catch (e) {}

            // Update smart dock button (Stock ↔ Demande)
            this.updateSmartDock();

            // Update breadcrumb
            this.updateBreadcrumb(mod, tab);

            // Use the actual ID from index.html
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) { console.error('mainContent element not found'); return; }

            // Render module — assign the returned HTML to innerHTML
            let html = '';
            try {
                switch (mod) {
                    case 'dashboard':       html = (typeof Dashboard !== 'undefined') ? Dashboard.render() : ''; break;
                    case 'stock':           html = (typeof Stock !== 'undefined') ? Stock.render(tab) : ''; break;
                    case 'stockMovements':  html = (typeof StockMovements !== 'undefined') ? StockMovements.render() : ''; break;
                    case 'decharges':       html = (typeof Decharges !== 'undefined') ? Decharges.render(tab) : ''; break;
                    case 'pvs':             html = (typeof PVs !== 'undefined') ? PVs.render() : ''; break;
                    case 'fleet':           html = (typeof Fleet !== 'undefined') ? Fleet.render() : ''; break;
                    case 'materialFamilies':html = (typeof MaterialFamilies !== 'undefined') ? MaterialFamilies.render() : ''; break;
                    case 'citernes':        html = (typeof Citernes !== 'undefined') ? Citernes.render(tab) : ''; break;
                    case 'preOrders':       html = (typeof PreOrders !== 'undefined') ? PreOrders.render() : ''; break;
                    case 'planTravail':
                        if (typeof PlanTravailModule !== 'undefined') {
                            if (tab === 'kpi') PlanTravailModule.activeTab = 'kpi';
                            else if (tab === 'history') PlanTravailModule.activeTab = 'history';
                            else if (tab === 'pipeline') PlanTravailModule.activeTab = 'pipeline';
                            html = PlanTravailModule.render();
                            if (tab === 'new' && isUserAction === true) {
                                setTimeout(() => {
                                    if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.openNewPlanModal) {
                                        PlanTravailModule.openNewPlanModal();
                                    }
                                }, 120);
                            }
                        } else {
                            html = '';
                        }
                        break;
                    case 'history':         html = (typeof HistoryModule !== 'undefined') ? HistoryModule.render(tab) : ''; break;
                    case 'kpi':             html = (typeof KPIDashboard !== 'undefined') ? KPIDashboard.render() : ''; break;
                    case 'reports':         html = (typeof Reports !== 'undefined') ? Reports.render() : ''; break;
                    case 'consumption':     html = (typeof Consumption !== 'undefined') ? Consumption.render() : ''; break;
                    case 'barcodeScanner':  html = (typeof BarcodeScanner !== 'undefined') ? BarcodeScanner.render() : ''; break;
                    case 'barcodeGenerator':html = (typeof BarcodeGenerator !== 'undefined') ? BarcodeGenerator.render() : ''; break;
                    case 'users':           html = (typeof Users !== 'undefined') ? Users.render() : ''; break;
                    case 'beneficiaries':   html = (typeof Beneficiaries !== 'undefined') ? Beneficiaries.render(tab) : ''; break;
                    case 'notifications':   html = (typeof NotificationsCenter !== 'undefined') ? NotificationsCenter.render() : ''; break;
                    case 'settings':        html = (typeof Settings !== 'undefined') ? Settings.render(tab) : ''; break;
                    default:                html = '<div class="card"><div class="card-body"><p>Module introuvable.</p></div></div>';
                }
            } catch (renderErr) {
                console.error(`Erreur rendu module ${mod}:`, renderErr);
                html = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Erreur: ${renderErr.message}</div>`;
            }

            mainContent.innerHTML = html || '<div class="card"><div class="card-body"><p>Contenu vide.</p></div></div>';

            // Post-render hooks
            try {
                if (typeof UI !== 'undefined' && UI.makeSortableTables) UI.makeSortableTables(mainContent);
            } catch(e) {}

            // AfterRender for charts, barcodes, etc.
            try {
                const moduleMap = {
                    kpi: 'KPIDashboard', reports: 'Reports', barcodeGenerator: 'BarcodeGenerator',
                    consumption: 'Consumption', dashboard: 'Dashboard', history: 'HistoryModule'
                };
                const modName = moduleMap[mod];
                if (modName && window[modName] && typeof window[modName].afterRender === 'function') {
                    setTimeout(() => window[modName].afterRender(), 150);
                }
            } catch(e) {}

        } catch (e) {
            console.error('loadModule error:', e);
        }
    },

    updateBreadcrumb(mod, tab) {
        const el = document.getElementById('breadcrumb');
        if (!el) return;
        if (mod === 'decharges') {
            let sub = '';
            if (tab === 'bsm') sub = ' &rsaquo; <strong>Bons de Sortie Magasin (BSM)</strong>';
            else if (tab === 'decharges') sub = ' &rsaquo; <strong>Bons de Décharge (BD)</strong>';
            el.innerHTML = `<i class="fas fa-home me-1"></i> <span>Accueil</span> &rsaquo; <span>Magasin &amp; Stocks</span> &rsaquo; <strong>Sorties Magasin &amp; Décharges</strong>${sub}`;
            return;
        }
        const title = this.titlesMap[mod] || mod;
        el.innerHTML = `<span>Principal</span> > <strong>${title}</strong>`;
    },

    updateNavActive(mod, tab = '') {
        const nav = document.getElementById('mainNav');
        if (!nav) return;
        nav.querySelectorAll('.nav-link, .dropdown-item').forEach(n => n.classList.remove('active'));
        nav.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('active'));

        let target = tab ? nav.querySelector(`[data-module="${mod}"][data-tab="${tab}"]`) : null;
        if (!target) {
            target = nav.querySelector(`[data-module="${mod}"]`);
        }
        if (target) {
            target.classList.add('active');
            const parentDropdown = target.closest('.nav-dropdown');
            if (parentDropdown) {
                parentDropdown.classList.add('active');
                const primaryLink = parentDropdown.querySelector('.nav-primary-link');
                if (primaryLink) primaryLink.classList.add('active');
            }
        }
    },

    reloadDebounced(mod, tab = null, delay = 180) {
        if (this._reloadTimer) clearTimeout(this._reloadTimer);
        this._reloadTimer = setTimeout(() => this.loadModule(mod, tab), delay);
    },

    /* ── Smart Dock: single button that switches Stock ↔ Demande ── */
    smartDockAction() {
        if (this.currentModule === 'stock') {
            // Already on stock → open Cart drawer
            if (typeof Cart !== 'undefined') Cart.toggleDrawer();
        } else {
            // Not on stock → navigate to stock
            this.loadModule('stock');
        }
    },

    updateSmartDock() {
        const btn = document.getElementById('smartDockBtn');
        const icon = document.getElementById('smartDockIcon');
        const label = document.getElementById('smartDockLabel');
        const badge = document.getElementById('topCartBadge');
        if (!btn || !icon || !label) return;

        if (this.currentModule === 'stock') {
            // Switch to Demande mode
            icon.className = 'fas fa-clipboard-list';
            label.textContent = 'Demande';
            btn.title = 'Votre Demande de Matériel';
            btn.classList.remove('dock-btn-stock');
            btn.classList.add('dock-btn-req');
            // Show badge
            if (badge) {
                const count = (typeof Cart !== 'undefined') ? Cart.getCount() : 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-flex' : '';
                if (count > 0) {
                    btn.classList.add('has-items');
                } else {
                    btn.classList.remove('has-items');
                }
            }
        } else {
            // Default: Stock mode
            icon.className = 'fas fa-boxes-stacked';
            label.textContent = 'Stock';
            btn.title = 'Consulter le Stock & Catalogue';
            btn.classList.remove('dock-btn-req', 'has-items');
            btn.classList.add('dock-btn-stock');
            // Hide badge in stock mode
            if (badge) badge.style.display = 'none';
        }
    },


    wireUpEvents() {
        // Login form — use actual ID from index.html: loginForm
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            // Create attempt counter element
            let attemptBadge = document.getElementById('loginAttemptBadge');
            if (!attemptBadge) {
                attemptBadge = document.createElement('div');
                attemptBadge.id = 'loginAttemptBadge';
                attemptBadge.style.cssText = 'display:none;text-align:center;padding:8px 12px;margin:8px 0;border-radius:8px;font-weight:600;font-size:14px;transition:all 0.3s;';
                loginForm.insertBefore(attemptBadge, loginForm.querySelector('button[type="submit"]'));
            }
            // Add shake keyframes if not already added
            if (!document.getElementById('shakeStyle')) {
                const shakeCSS = document.createElement('style');
                shakeCSS.id = 'shakeStyle';
                shakeCSS.textContent = '@keyframes shakeForm{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-6px)}20%,40%,60%,80%{transform:translateX(6px)}}.shake-animation{animation:shakeForm 0.6s ease-in-out}';
                document.head.appendChild(shakeCSS);
            }

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username')?.value;
                const password = document.getElementById('password')?.value;
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Connexion...';
                }
                try {
                    const result = await Auth.login(username, password);
                    if (result) {
                        if (attemptBadge) attemptBadge.style.display = 'none';
                        this.showApp(true);
                    } else {
                        loginForm.classList.add('shake-animation');
                        setTimeout(() => loginForm.classList.remove('shake-animation'), 700);
                        Utils.showNotification('Identifiants incorrects', 'error');
                    }
                } catch (err) {
                    // Shake the form
                    loginForm.classList.add('shake-animation');
                    setTimeout(() => loginForm.classList.remove('shake-animation'), 700);

                    if (err.status === 429) {
                        attemptBadge.style.display = 'block';
                        attemptBadge.style.background = '#dc3545';
                        attemptBadge.style.color = '#fff';
                        attemptBadge.textContent = '🔒 Compte bloqué — Réessayez dans 30 minutes';
                    } else if (err.remaining !== undefined && err.remaining !== null) {
                        attemptBadge.style.display = 'block';
                        if (err.remaining <= 1) {
                            attemptBadge.style.background = '#dc3545';
                            attemptBadge.style.color = '#fff';
                        } else if (err.remaining <= 2) {
                            attemptBadge.style.background = '#fd7e14';
                            attemptBadge.style.color = '#fff';
                        } else {
                            attemptBadge.style.background = '#ffc107';
                            attemptBadge.style.color = '#333';
                        }
                        attemptBadge.textContent = '⚠️ ' + err.remaining + ' tentative' + (err.remaining > 1 ? 's' : '') + ' restante' + (err.remaining > 1 ? 's' : '');
                    }
                    Utils.showNotification(err.message || 'Erreur de connexion', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Se connecter';
                    }
                }
            });
        }

        // Logout — ID: btnLogout
        const logoutBtn = document.getElementById('btnLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof Auth !== 'undefined') Auth.logout();
                localStorage.removeItem('sde_user_role');
                localStorage.removeItem('erp_douroub_session');
                localStorage.removeItem('erp_active_module');
                localStorage.removeItem('erp_active_tab');
                window.location.reload();
            });
        }

        // Sidebar toggle — ID: toggleSidebar
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('collapsed');
            });
        }

        // Theme toggle — ID: toggleTheme
        const themeBtn = document.getElementById('toggleTheme');
        if (themeBtn) {
            themeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof UI !== 'undefined' && UI.toggleTheme) UI.toggleTheme();
            });
        }



        // Top Header Quick Action Buttons
        const quickBtBtn = document.getElementById('btnQuickUserBt');
        if (quickBtBtn && !quickBtBtn._bound) {
            quickBtBtn._bound = true;
            quickBtBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.PlanTravailModule && PlanTravailModule.openUserWorkPlanModal) {
                    PlanTravailModule.openUserWorkPlanModal();
                } else if (typeof App !== 'undefined') {
                    App.loadModule('planTravail');
                }
            });
        }

        const repHistBtn = document.getElementById('btnReparationHistory');
        if (repHistBtn && !repHistBtn._bound) {
            repHistBtn._bound = true;
            repHistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.showReparationHistory === 'function') {
                    window.showReparationHistory();
                } else if (typeof App !== 'undefined') {
                    App.loadModule('reparations', 'history');
                }
            });
        }

        const smartDockBtn = document.getElementById('smartDockBtn');
        if (smartDockBtn && !smartDockBtn._bound) {
            smartDockBtn._bound = true;
            smartDockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                App.smartDockAction();
            });
        }

        // User profile dropdown — ID: userProfileBtn
        const profileBtn = document.getElementById('userProfileBtn');
        if (profileBtn && !profileBtn._bound) {
            profileBtn._bound = true;
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
                const dd = document.getElementById('userDropdown');
                if (dd) dd.classList.toggle('open');
                App.updateUserInfo();
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            const dd = document.getElementById('userDropdown');
            if (dd && !e.target.closest('.user-menu-wrapper')) {
                dd.classList.remove('open');
            }
        });

        // User dropdown nav links: a[href="#profil"] → showUserSettings, a[href="#parametres"] → showSettings
        document.querySelectorAll('a[href="#profil"]').forEach(a => a.addEventListener('click', (e) => {
            e.preventDefault();
            const dd = document.getElementById('userDropdown');
            if (dd) dd.classList.remove('open');
            App.showUserSettings();
        }));
        document.querySelectorAll('a[href="#parametres"]').forEach(a => a.addEventListener('click', (e) => {
            e.preventDefault();
            const dd = document.getElementById('userDropdown');
            if (dd) dd.classList.remove('open');
            App.showSettings();
        }));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const search = document.querySelector('input[type="search"], .search-input, input[placeholder*="Rechercher"]');
                if (search) search.focus();
            }
        });
    },

    // Navigation and Settings helpers
    navigate(mod, tab) {
        return this.loadModule(mod, tab);
    },

    showSettings(tab) {
        if (typeof Auth !== 'undefined' && Auth.isAdmin()) {
            return this.loadModule('settings', tab || 'database');
        }
        return this.showUserSettings();
    },

    showModulePickerModal() {
        const modal = document.getElementById('modulePickerModal');
        if (!modal) return;
        // Update greeting with user name
        try {
            const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
            const name = user ? (user.name || user.username || 'Administrateur') : 'Administrateur';
            const titleEl = document.getElementById('gateWelcomeTitle');
            if (titleEl) titleEl.textContent = 'Bienvenue, ' + name.split(' ')[0];
        } catch(e) {}
        modal.style.display = 'flex';
    },

    hideModulePickerModal() {
        const modal = document.getElementById('modulePickerModal');
        if (modal) modal.style.display = 'none';
    },

    goToModule(mod) {
        this.hideModulePickerModal();
        if (mod === 'bc') {
            window.location.href = '/suivi-achats-premium/';
        } else if (mod === 'settings') {
            window.location.href = '/general-settings.html';
        } else {
            // Load stock app
            const appEl = document.getElementById('appContainer');
            if (appEl) { appEl.style.display = ''; appEl.classList.remove('hidden'); }
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                const artCount = (DB && DB.data && DB.data.articles) ? DB.data.articles.length : 0;
                Utils.showNotification('✅ Connecté — ' + artCount + ' articles chargés', 'success');
            }
            const topComp = document.getElementById('topCompanyName');
            if (topComp) {
                const s = (typeof DB !== 'undefined' && DB.getSettings) ? DB.getSettings() : {};
                topComp.textContent = s.companyName || 'SPA DOUROUB ELDJAZAIR';
            }
            this.updateUserInfo();
            this.buildSidebar();
            if (typeof UI !== 'undefined' && UI.startClock) UI.startClock();
            if (typeof Notify !== 'undefined') { Notify.init(); Notify.updateBadge(); }
            if (typeof Cart !== 'undefined' && Cart.updateBadge) Cart.updateBadge();
            const target = (mod === 'stock') ? 'stock' : 'dashboard';
            this.loadModule(target);
        }
    },

    showUsers() {
        if (typeof Auth !== 'undefined' && Auth.isAdmin()) {
            return this.loadModule('users');
        }
        return this.showUserSettings();
    },

    showUserSettings(userId) {
        const id = userId || (typeof Auth !== 'undefined' && Auth.currentUser ? Auth.currentUser.id : null);
        if (typeof Users !== 'undefined' && typeof Users.showEdit === 'function') {
            return Users.showEdit(id);
        }
        if (typeof UI !== 'undefined' && UI.showModal) {
            UI.showModal({ title: 'Mon Profil & Paramètres', body: '<p class="text-muted">Module utilisateurs en cours de chargement...</p>' });
        }
    },

    showUserModal(userId) {
        if (userId && typeof Users !== 'undefined' && typeof Users.showEdit === 'function') {
            return Users.showEdit(userId);
        } else if (typeof Users !== 'undefined' && typeof Users.showAdd === 'function') {
            return Users.showAdd();
        }
        return this.showUserSettings(userId);
    }
};

window.showReparationHistory = function(options) {
    if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.showHistoryView) {
        return PlanTravailModule.showHistoryView(options);
    } else if (typeof App !== 'undefined' && App.navigate) {
        App.navigate('planTravail', 'history');
    }
};

window.App = App;

// Boot
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => App.init());
}