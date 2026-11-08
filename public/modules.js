// modules.js

window.Dashboard = {

    renderNormalUserDashboard: function(user, articles, preorders) {
        const myOrders = preorders.filter(p => p.userId === (user ? user.id : '') || p.userName === (user ? user.name : '') || p.beneficiary === (user ? user.name : ''));
        const pendingOrders = myOrders.filter(p => p.status === 'En attente' || p.status === 'Partiellement servie');
        const approvedOrders = myOrders.filter(p => p.status === 'Servie' || p.status === 'Approuvée');

        return `
            <!-- User Welcome Banner -->
            <div class="card p-3 mb-3" style="background:linear-gradient(135deg,#1e293b,#0f172a);color:#ffffff;border:none;border-radius:6px;">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#38bdf8;font-weight:700;">Portail Demandeur & Personnel</div>
                        <h4 class="fw-bold mb-1 text-white">Bienvenue, ${Utils.escapeHTML(user ? user.name : 'Utilisateur')}</h4>
                        <div style="font-size:12px;color:rgba(255,255,255,0.7);">
                            Service: <strong>${Utils.escapeHTML(user ? (user.department || 'Direction Générale') : '')}</strong>
                            ${user && user.qualite ? ` • Qualité: ${Utils.escapeHTML(user.qualite)}` : ''}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <button class="btn btn-warning fw-bold text-dark" onclick="if(window.UI && UI.startStockTutorial) UI.startStockTutorial();" style="box-shadow:0 2px 8px rgba(245,158,11,0.3);">
                            <i class="fas fa-graduation-cap me-1"></i> 🎓 Guide & Tutoriel Interactif
                        </button>
                        <button class="btn btn-primary" onclick="Cart.showModal()" style="font-weight:700;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
                            <i class="fas fa-clipboard-list me-2"></i> Nouvelle Demande de Matériel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Quick Action Cards (High visibility) -->
            <div class="row g-2 mb-3">
                <div class="col-md-4">
                    <div class="card h-100 p-3" style="cursor:pointer;border-left:4px solid #10b981;transition:transform .15s ease;" onclick="if(window.PlanTravailModule) PlanTravailModule.openUserWorkPlanModal();">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width:42px;height:42px;border-radius:8px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:20px;">
                                <i class="fas fa-screwdriver-wrench"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0" style="color:var(--text);">Bon de Travail Flotte</h6>
                                <small class="text-muted" style="font-size:11px;">Émettre bon de travail & décharge GDS</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card h-100 p-3" style="cursor:pointer;border-left:4px solid #2563eb;transition:transform .15s ease;" onclick="Cart.showModal()">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width:42px;height:42px;border-radius:8px;background:rgba(37,99,235,0.1);color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:20px;">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0" style="color:var(--text);">Faire une Demande</h6>
                                <small class="text-muted" style="font-size:11px;">Demander du matériel pour affectation</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card h-100 p-3" style="cursor:pointer;border-left:4px solid #10b981;transition:transform .15s ease;" onclick="App.loadModule('stock')">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width:42px;height:42px;border-radius:8px;background:rgba(16,185,129,0.1);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:20px;">
                                <i class="fas fa-boxes-stacked"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0" style="color:var(--text);">Consulter le Stock & Demander du Matériel</h6>
                                <small class="text-muted" style="font-size:11px;">${articles.length} articles disponibles en magasin</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card h-100 p-3" style="cursor:pointer;border-left:4px solid #f59e0b;transition:transform .15s ease;" onclick="App.loadModule('history', 'orders')">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width:42px;height:42px;border-radius:8px;background:rgba(245,158,11,0.1);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:20px;">
                                <i class="fas fa-clock-rotate-left"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0" style="color:var(--text);">Mes Demandes</h6>
                                <small class="text-muted" style="font-size:11px;">${pendingOrders.length} en attente • ${approvedOrders.length} servies</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- User Recent Requests Table -->
            <div class="card mb-3" style="border:1px solid var(--border);">
                <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
                    <span class="fw-bold" style="font-size:13px;color:var(--text);">
                        <i class="fas fa-receipt text-primary me-2"></i> Mes Dernières Demandes de Matériel (${myOrders.length})
                    </span>
                    <button class="btn btn-xs btn-outline-secondary" onclick="App.loadModule('history', 'orders')">
                        Voir tout l'historique <i class="fas fa-arrow-right ms-1"></i>
                    </button>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" style="font-size:12px;">
                            <thead class="table-light">
                                <tr>
                                    <th>Réf. Demande</th>
                                    <th>Date</th>
                                    <th>Véhicule / Affectation</th>
                                    <th>Articles Demandés</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${myOrders.slice(0, 5).map(o => {
                                    const items = Array.isArray(o.items) ? o.items : [];
                                    let badgeClass = 'bg-secondary';
                                    if (o.status === 'Servie' || o.status === 'Approuvée') badgeClass = 'bg-success';
                                    else if (o.status === 'En attente') badgeClass = 'bg-warning text-dark';
                                    else if (o.status === 'Rejetée') badgeClass = 'bg-danger';

                                    return `
                                    <tr>
                                        <td><strong class="font-monospace text-primary">${Utils.escapeHTML(o.ref)}</strong></td>
                                        <td>${new Date(o.date).toLocaleDateString('fr-FR')}</td>
                                        <td>${o.immatriculation ? `<span class="badge bg-dark font-monospace">${Utils.escapeHTML(o.immatriculation)}</span>` : '<span class="text-muted">-</span>'}</td>
                                        <td><strong>${items.length}</strong> article(s) (${items.map(i => Utils.escapeHTML(i.designation)).slice(0, 2).join(', ')}${items.length > 2 ? '...' : ''})</td>
                                        <td><span class="badge ${badgeClass}">${o.status}</span></td>
                                    </tr>`;
                                }).join('')}
                                ${myOrders.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">Vous n\'avez pas encore soumis de demande. Cliquez sur "Nouvelle Demande de Matériel" pour commencer.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    render: function() {
        const user = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : DB.getCurrentUser();
        const articles = DB.getArticles();
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];

        // Dedicated secure dashboard for normal users
        if (typeof Auth !== 'undefined' && Auth.isNormal()) {
            return this.renderNormalUserDashboard(user, articles, preorders);
        }
        const movements = DB.getMovements();
        const decharges = DB.getDecharges();
        const fleet = DB.getFleet();
        const citernes = DB.getCiternes();
        
        let totalQty = 0;
        let totalValue = 0;
        let alertCount = 0;
        let alertArticles = [];
        articles.forEach(a => {
            totalQty += Number(a.quantity || 0);
            totalValue += Number(a.quantity || 0) * (Number(a.price) || 0);
            if (Number(a.quantity) < Number(a.minThreshold)) {
                alertCount++;
                alertArticles.push(a);
            }
        });

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        let dechargesMois = 0;
        let dechargesAttente = 0;
        decharges.forEach(d => {
            const dDate = new Date(d.date);
            if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                dechargesMois++;
            }
            if (d.status === 'En attente') dechargesAttente++;
        });

        let preordersAttente = 0;
        preorders.forEach(p => {
            if (p.status === 'En attente') preordersAttente++;
        });

        const consumers = {};
        decharges.forEach(d => {
            if (d.status !== 'Approuvée') return;
            const b = d.beneficiary;
            if(!b) return;
            if (!consumers[b]) consumers[b] = 0;
            d.items.forEach(item => {
                consumers[b] += Number(item.quantity || 0);
            });
        });
        const topConsumers = Object.keys(consumers).map(k => ({name: k, qty: consumers[k]})).sort((a,b) => b.qty - a.qty).slice(0, 5);

        const workPlans = (DB.data && Array.isArray(DB.data.workPlans)) ? DB.data.workPlans : [];
        const totalFleetCount = Math.max((fleet ? fleet.length : 0), 28);
        const activeRepairsCount = workPlans.filter(p => p.status === 'En attente' || p.status === 'En cours' || p.status === 'Brouillon').length;
        const immobCount = new Set(workPlans.filter(p => p.status === 'En attente' || p.status === 'En cours').map(p => p.immatriculation).filter(Boolean)).size;
        const fleetAvailRate = totalFleetCount > 0 ? Math.round(((Math.max(0, totalFleetCount - immobCount)) / totalFleetCount) * 1000) / 10 : 96.4;

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:2px;font-size:1.15rem;"><i class="fas fa-th-large text-primary me-2"></i>Tableau de Bord</h2>
                    <p class="text-muted" style="margin:0;font-size:12px;">Bienvenue, <strong>${Utils.escapeHTML(user ? user.name : 'Utilisateur')}</strong> — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="d-flex align-items-center" style="gap:0.4rem;">
                    <button class="btn btn-warning btn-sm fw-bold text-dark" onclick="if(window.UI && UI.startStockTutorial) UI.startStockTutorial();" title="Lancer le Guide & Tutoriel Interactif Stock & CAD"><i class="fas fa-graduation-cap me-1"></i> 🎓 Guide & Tutoriel</button>
                    <button class="btn btn-outline-primary btn-sm" onclick="App.loadModule('planTravail', 'kpi')"><i class="fas fa-screwdriver-wrench me-1"></i> Réparations</button>
                    <button class="btn btn-primary btn-sm" onclick="App.loadModule('stock')"><i class="fas fa-boxes-stacked me-1"></i> Consulter le Stock</button>
                    <button class="btn btn-outline-info btn-sm" onclick="Cart.showModal()" title="Ouvrir le Panier Magasin"><i class="fas fa-cart-shopping me-1"></i> Mon Panier</button>
                    ${Auth.canCreate('decharges') ? '<button class="btn btn-decharge btn-sm" onclick="App.loadModule(\'decharges\')"><i class="fas fa-clipboard-check me-1"></i> Décharges</button>' : ''}
                    ${Auth.isAdmin() && articles.length === 0 ? '<button class="btn btn-warning btn-sm" onclick="if(confirm(\'Charger les données de démonstration ?\')) { DB.loadDemoData(); UI.refresh(); Utils.showNotification(\'Données démo chargées !\', \'success\'); }"><i class="fas fa-database"></i> Charger Données</button>' : ''}
                </div>
            </div>

            <!-- Quick-Access Reparations & Flotte Hero Banner -->
            <div class="card p-3 mb-3 border-0 shadow-sm" style="background:linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(6,182,212,0.12) 100%);border:1px solid rgba(56,189,248,0.25) !important;border-radius:12px;">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 14px rgba(37,99,235,0.35);flex-shrink:0;">
                            <i class="fas fa-screwdriver-wrench"></i>
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <h5 class="fw-bold mb-0" style="color:var(--text);font-size:14.5px;">🔧 Réparations & Suivi Flotte (BT)</h5>
                                <span class="badge ${fleetAvailRate >= 90 ? 'bg-success' : 'bg-warning text-dark'} text-white px-2 py-1" style="font-size:11px;">
                                    <i class="fas fa-shield-halved me-1"></i>${fleetAvailRate}% Disponibilité Flotte
                                </span>
                            </div>
                            <p class="text-muted mb-0" style="font-size:12px;margin-top:2px;">
                                Supervision technique interactive CAD 3D/2D • <strong>${workPlans.length}</strong> bons enregistrés • <strong>${activeRepairsCount}</strong> intervention(s) en atelier
                            </p>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary fw-bold" onclick="App.loadModule('planTravail', 'kpi')">
                            <i class="fas fa-chart-pie me-1"></i> Tableau de bord & KPIs
                        </button>
                        <button class="btn btn-sm btn-outline-info fw-bold" onclick="if(window.PlanTravailModule) PlanTravailModule.open3DViewerModal()">
                            <i class="fas fa-cube me-1"></i> Studio 3D CAD
                        </button>
                        <button class="btn btn-sm btn-primary fw-bold text-white" onclick="App.loadModule('planTravail', 'new')" style="box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                            <i class="fas fa-plus-circle me-1"></i> + Nouvel Ordre de Réparation
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card" style="border-top: 3px solid #2563eb;">
                    <div class="stat-icon primary"><i class="fas fa-boxes-stacked"></i></div>
                    <div class="stat-info">
                        <div class="metric-label">Articles en Stock</div>
                        <div class="metric-value">${articles.length}</div>
                        <div class="text-muted" style="font-size:12px;"><i class="fas fa-cubes me-1"></i>Qté: <strong>${Utils.formatNumber(totalQty)}</strong></div>
                    </div>
                </div>
                <div class="stat-card" style="border-top: 3px solid #10b981;">
                    <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:#10b981;"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <div class="metric-label">Valeur du Stock</div>
                        <div class="metric-value">${totalValue.toLocaleString('fr-FR')} <span style="font-size:13px;font-weight:600;color:var(--text-muted)">DA</span></div>
                        <div class="text-muted" style="font-size:12px;"><i class="fas fa-shield-alt me-1"></i>Inventaire valorisé</div>
                    </div>
                </div>
                <div class="stat-card" style="border-top: 3px solid ${alertCount > 0 ? '#ef4444' : '#10b981'};">
                    <div class="stat-icon ${alertCount > 0 ? 'danger' : 'success'}">
                        <i class="fas ${alertCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                    </div>
                    <div class="stat-info">
                        <div class="metric-label">Alertes Stock</div>
                        <div class="metric-value ${alertCount > 0 ? 'text-danger' : 'text-success'}">${alertCount}</div>
                        <div class="text-muted" style="font-size:12px;">${alertCount > 0 ? '<span class="text-danger fw-semibold">Sous seuil critique</span>' : '<span class="text-success fw-semibold">Stock conforme</span>'}</div>
                    </div>
                </div>
                <div class="stat-card" style="border-top: 3px solid #8b5cf6; cursor: pointer;" onclick="App.loadModule('decharges')" title="Cliquer pour afficher les décharges et les télécharger">
                    <div class="stat-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6;"><i class="fas fa-clipboard-check"></i></div>
                    <div class="stat-info">
                        <div class="metric-label">Décharges (Mois)</div>
                        <div class="metric-value">${dechargesMois}</div>
                        <div class="text-muted" style="font-size:12px;"><i class="fas fa-clock me-1"></i><strong class="${dechargesAttente > 0 ? 'text-warning fw-bold' : ''}">${dechargesAttente}</strong> en attente <i class="fas fa-arrow-right ms-1 text-primary"></i></div>
                    </div>
                </div>
            </div>

            ${dechargesAttente > 0 ? `
            <div class="alert alert-warning d-flex justify-content-between align-items-center mb-3 p-3 border-start border-4 border-warning shadow-sm" style="border-radius:10px;background:rgba(245,158,11,0.08);border-color:#f59e0b !important;">
                <div class="d-flex align-items-center gap-3">
                    <div style="font-size:26px;color:#d97706;"><i class="fas fa-clock-rotate-left"></i></div>
                    <div>
                        <strong style="font-size:14px;color:#92400e;"><i class="fas fa-triangle-exclamation me-1"></i> Action Requise : ${dechargesAttente} Décharge(s) en attente de validation</strong>
                        <div class="text-muted small" style="margin-top:2px;">Des sorties magasin / décharges attendent le visa pour autoriser la remise du matériel et le téléchargement des fiches.</div>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="Decharges.quickValidateFirstPending()"><i class="fas fa-check-circle me-1"></i> Valider Décharge (1-Clic)</button>
                    <button class="btn btn-sm btn-primary shadow-sm" onclick="App.loadModule('decharges')"><i class="fas fa-clipboard-check me-1"></i> Voir & Télécharger</button>
                </div>
            </div>
            ` : ''}

            <div class="row g-2 mb-2">
                <div class="col-lg-8 col-md-12">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-chart-column text-primary me-2"></i> Évolution des Décharges (6 Derniers Mois)</span>
                            <span class="badge bg-light text-muted font-monospace" style="font-size:11px;">Temps réel</span>
                        </div>
                        <div class="card-body p-3">
                            <div class="dashboard-chart-box">
                                <canvas id="chartDecharges"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 col-md-12">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-chart-pie text-info me-2"></i> Répartition par Catégorie</span>
                            <span class="badge bg-light text-muted font-monospace" style="font-size:11px;">${articles.length} articles</span>
                        </div>
                        <div class="card-body p-3 d-flex align-items-center justify-content-center">
                            <div class="dashboard-chart-box">
                                <canvas id="chartCategories"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-trophy text-warning me-2"></i> Top Consommateurs</span>
                            <span class="badge bg-light text-muted" style="font-size:11px;">Cumul sorties</span>
                        </div>
                        <ul class="list-group list-group-flush" style="max-height: 200px; overflow-y: auto;">
                            ${topConsumers.length === 0 ? '<li class="list-group-item text-muted py-3 text-center">Aucune donnée disponible.</li>' : topConsumers.map((c, i) => `
                                <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="badge rounded-pill ${i === 0 ? 'bg-warning text-dark' : 'bg-light text-dark'}" style="width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;">${i+1}</span>
                                        <span class="fw-semibold text-truncate" style="max-width:180px;">${Utils.escapeHTML(c.name)}</span>
                                    </div>
                                    <span class="badge bg-primary rounded-pill font-monospace">${c.qty} art.</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-triangle-exclamation text-danger me-2"></i> Alertes Stock Critique</span>
                            <span class="badge ${alertArticles.length > 0 ? 'bg-danger' : 'bg-success'} rounded-pill">${alertArticles.length}</span>
                        </div>
                        <ul class="list-group list-group-flush" style="max-height: 200px; overflow-y: auto;">
                            ${alertArticles.length === 0 ? '<li class="list-group-item text-success py-3 text-center"><i class="fas fa-circle-check me-1"></i> Aucun article en alerte critique</li>' : alertArticles.map(a => `
                                <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                    <div style="min-width:0;" class="me-2">
                                        <div class="fw-semibold text-truncate" style="max-width:200px;font-size:12.5px;">${Utils.escapeHTML(a.designation)}</div>
                                        <small class="text-muted font-monospace">${Utils.escapeHTML(a.code || '')} • ${Utils.escapeHTML(a.category || '')}</small>
                                    </div>
                                    <span class="badge bg-danger rounded-pill font-monospace" title="Stock actuel / Seuil">${a.quantity} / min ${a.minThreshold}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="col-lg-4 col-md-12 col-12">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-clock-rotate-left text-info me-2"></i> Dernières Sorties</span>
                            <button class="btn btn-xs btn-outline-secondary" onclick="App.loadModule('history')">Historique</button>
                        </div>
                        <ul class="list-group list-group-flush" style="max-height: 200px; overflow-y: auto;">
                            ${movements.filter(m => m.type === 'Sortie').slice(0, 8).map(m => {
                                const article = articles.find(a => a.id === m.articleId);
                                return `
                                <li class="list-group-item py-2">
                                    <div class="d-flex w-100 justify-content-between align-items-center">
                                        <span class="fw-semibold text-danger" style="font-size:12.5px;">
                                            <i class="fas fa-arrow-down me-1"></i> -${m.quantity} ${article ? Utils.escapeHTML(article.designation) : 'Article inconnu'}
                                        </span>
                                        <small class="text-muted font-monospace" style="font-size:11px;">${new Date(m.date).toLocaleDateString('fr-FR')}</small>
                                    </div>
                                    <div class="text-muted" style="font-size:11px;margin-top:2px;">
                                        Affecté à: <strong>${Utils.escapeHTML(m.user || 'Non spécifié')}</strong>
                                    </div>
                                </li>`;
                            }).join('')}
                            ${movements.filter(m => m.type === 'Sortie').length === 0 ? '<li class="list-group-item text-muted py-3 text-center">Aucune sortie récente enregistrée.</li>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    
    afterRender: function() {
        if(typeof Chart === 'undefined') return;

        const articles = DB.getArticles();
        const decharges = DB.getDecharges();

        const catCtx = document.getElementById('chartCategories');
        if(catCtx) {
            const catData = {};
            articles.forEach(a => {
                const cat = a.category || 'Non classé';
                if(!catData[cat]) catData[cat] = 0;
                catData[cat] += Number(a.quantity || 0);
            });
            const labels = Object.keys(catData);
            const data = Object.values(catData);
            
            new Chart(catCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#64748B'],
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                font: { size: 11, family: "'Inter', sans-serif" }
                            }
                        }
                    }
                }
            });
        }

        const dechCtx = document.getElementById('chartDecharges');
        if(dechCtx) {
            const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
            const dechCount = [0,0,0,0,0,0];
            const monthLabels = [];
            
            const today = new Date();
            for(let i=5; i>=0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                monthLabels.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());
                
                const count = decharges.filter(x => {
                    const xd = new Date(x.date);
                    return xd.getMonth() === d.getMonth() && xd.getFullYear() === d.getFullYear();
                }).length;
                dechCount[5-i] = count;
            }
            
            new Chart(dechCtx, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Décharges',
                        data: dechCount,
                        backgroundColor: 'rgba(37, 99, 235, 0.7)',
                        borderColor: '#2563EB',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        maxBarThickness: 46
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, precision: 0 },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }
};
// =============================================================================
// DEMANDE DE MATÉRIEL (REQUISITION MULTI-ARTICLES & SLIDE-OVER DRAWER)
// =============================================================================
window.Cart = {
    storageKey: 'erp_douroub_cart_items',

    getItems: function() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const items = JSON.parse(raw);
                if (typeof DB !== 'undefined' && DB.data) {
                    DB.data.cart = items;
                }
                return items;
            }
        } catch(e) {}
        if (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.cart)) {
            return DB.data.cart;
        }
        return [];
    },

    saveItems: function(items) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(items));
        } catch(e) {}
        if (typeof DB !== 'undefined' && DB.data) {
            DB.data.cart = items;
            if (DB.save) DB.save();
        }
        this.updateBadge();
    },

    getCount: function() {
        const items = this.getItems();
        return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    },

    updateBadge: function() {
        const count = this.getCount();

        // 1. Smart Dock Button (single Stock/Demande toggle)
        const smartBtn = document.getElementById('smartDockBtn');
        const topBadge = document.getElementById('topCartBadge');
        if (smartBtn && topBadge) {
            topBadge.textContent = count;
            // Only show badge when in stock module (dock shows "Demande")
            if (typeof App !== 'undefined' && App.currentModule === 'stock') {
                topBadge.style.display = count > 0 ? 'inline-flex' : '';
                if (count > 0) {
                    smartBtn.classList.add('has-items');
                } else {
                    smartBtn.classList.remove('has-items');
                }
            }
        }

        // 2. Floating Bottom Dock (visible everywhere when items > 0)
        const floatDock = document.getElementById('floatingRequisitionDock');
        const frdCount = document.getElementById('frdCountBadge');
        const frdSummary = document.getElementById('frdSummaryText');
        if (floatDock) {
            const items = this.getItems();
            if (count > 0) {
                floatDock.style.display = 'flex';
                document.body.classList.add('has-cart-dock');
                if (frdCount) frdCount.textContent = count;
                if (frdSummary) frdSummary.textContent = `${count} article${count > 1 ? 's' : ''} (${items.length} réf.) • Prêt à valider`;
            } else {
                floatDock.style.display = 'none';
                document.body.classList.remove('has-cart-dock');
            }
        }

        // 3. Stock header count
        const stockCount = document.getElementById('stockHeaderCartCount');
        if (stockCount) stockCount.textContent = count;

        // 4. Normal user navigation badge
        const navBadge = document.getElementById('navCartBadge');
        if (navBadge) {
            navBadge.textContent = count;
            navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
        }

        // 5. If drawer is currently open, re-render drawer contents
        const drawer = document.getElementById('reqDrawer');
        if (drawer && drawer.classList.contains('active')) {
            this.renderDrawer();
        }
    },

    openDrawer: function() {
        if (typeof UI !== 'undefined' && UI.hideModal) UI.hideModal();
        const drawer = document.getElementById('reqDrawer');
        const backdrop = document.getElementById('reqDrawerBackdrop');
        if (!drawer) {
            this.showModal();
            return;
        }
        document.body.classList.add('drawer-open');
        this.renderDrawer();
        if (backdrop) {
            backdrop.style.display = 'block';
            setTimeout(() => backdrop.classList.add('active'), 10);
        }
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
    },

    closeDrawer: function() {
        document.body.classList.remove('drawer-open');
        const drawer = document.getElementById('reqDrawer');
        const backdrop = document.getElementById('reqDrawerBackdrop');
        if (drawer) {
            drawer.classList.remove('active');
            drawer.setAttribute('aria-hidden', 'true');
        }
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                if (backdrop && !backdrop.classList.contains('active')) {
                    backdrop.style.display = 'none';
                }
            }, 260);
        }
    },

    toggleDrawer: function() {
        const drawer = document.getElementById('reqDrawer');
        if (drawer && drawer.classList.contains('active')) {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    },

    goToStockAndCloseDrawer: function() {
        this.closeDrawer();
        if (typeof App !== 'undefined') App.loadModule('stock');
    },

    goToHistoryAndCloseDrawer: function() {
        this.closeDrawer();
        if (typeof App !== 'undefined') App.loadModule('history', 'orders');
    },

    launchWorkPlanWithItems: function() {
        const items = this.getItems();
        const matSelect = document.querySelector('#drawerSubmitForm select[name="materialId"]');
        const fleetId = matSelect ? matSelect.value : '';
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const vehicle = fleet.find(f => f.id === fleetId) || {};

        this.closeDrawer();
        if (typeof PlanTravailModule !== 'undefined') {
            PlanTravailModule.openNewPlanModal({
                brand: vehicle.brand || vehicle.marque || '',
                model: vehicle.model || vehicle.modele || '',
                immatriculation: vehicle.immatriculation || '',
                vin: vehicle.serialNumber || vehicle.numero_serie || vehicle.vin || ''
            });

            // Populate the parts table with cart items
            setTimeout(() => {
                const tbody = document.getElementById('newBtPartsTbody');
                if (tbody && items.length > 0) {
                    tbody.innerHTML = '';
                    items.forEach(it => {
                        PlanTravailModule.addPartRow({
                            designation: it.designation,
                            ref: it.code,
                            qty: it.quantity,
                            obs: 'Issu de la demande de matériel'
                        });
                    });
                }
            }, 150);
        }
    },

    showModal: function() {
        if (typeof UI === 'undefined') return;
        this.closeDrawer();
        const items = this.getItems();
        const count = this.getCount();
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : { name: 'Utilisateur', role: 'normal', department: 'Direction Générale' };
        const depts = (DB.getSettings().departments && DB.getSettings().departments.length > 0) ? DB.getSettings().departments : ['Direction Générale', 'Approvisionnement', 'Transport', 'Atelier', 'Administration'];
        const bens = typeof Beneficiaries !== 'undefined' ? Beneficiaries.getBeneficiariesList() : [];
        const allArticles = DB.getArticles ? DB.getArticles() : [];
        const settings = (DB.getSettings && DB.getSettings()) || {};
        const categories = [...new Set([
            ...(settings.articleCategories || []),
            ...allArticles.map(a => a.category).filter(Boolean),
            ...allArticles.map(a => a.family).filter(Boolean)
        ])].filter(Boolean).sort();

        let modalHtml = `
            <div class="cart-modal-container">
                <!-- Top Quick Article Search & Add Bar -->
                <div class="card p-2 mb-3 bg-light border">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="form-label small fw-bold mb-0 text-dark d-flex align-items-center gap-1">
                            <i class="fas fa-search-plus text-primary"></i> Ajouter rapidement un article au panier
                        </label>
                        <span class="badge bg-white text-muted border font-monospace" style="font-size:10px;">${allArticles.length} réf. au stock</span>
                    </div>
                    <div class="d-flex gap-1 align-items-center position-relative">
                        <select id="modalCartCatFilter" class="form-select form-select-sm" style="max-width:160px;font-size:12px;font-weight:600;" onchange="Cart.onModalCatChange(this.value)">
                            <option value="">📁 Toutes catégories</option>
                            ${categories.map(c => `<option value="${Utils.escapeHTML(c)}" ${Cart._selectedCategory === c ? 'selected' : ''}>${Utils.escapeHTML(c)}</option>`).join('')}
                        </select>
                        <div class="position-relative flex-grow-1">
                            <input type="text" id="modalCartSearchInput" class="form-control form-control-sm" placeholder="Rechercher par désignation, référence, code..." autocomplete="off" value="${Utils.escapeHTML(Cart._searchQuery || '')}" onfocus="Cart.openModalCatalogDropdown()" oninput="Cart.onModalSearchInput(this.value)">
                            <button type="button" id="modalCartClearBtn" class="btn btn-xs position-absolute end-0 top-50 translate-middle-y me-1 text-muted" style="${Cart._searchQuery || Cart._selectedCategory ? '' : 'display:none;'}border:none;background:none;" onclick="Cart.clearModalSearch()" title="Effacer"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    <div id="modalCartDropdown" class="article-picker-dropdown shadow-sm" style="display:none;position:relative;margin-top:6px;max-height:160px;min-width:100%;width:100%;border:1px solid #cbd5e1;background:#fff;border-radius:6px;overflow-y:auto;z-index:100;"></div>
                </div>

                <!-- Articles in Cart Table -->
                <div class="card mb-3 border shadow-sm">
                    <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-uppercase small text-dark d-flex align-items-center gap-2">
                            <i class="fas fa-cart-shopping text-primary"></i>
                            Articles sélectionnés (${items.length} références · ${count} pièces)
                        </span>
                        ${items.length > 0 ? `
                        <button type="button" class="btn btn-xs btn-outline-danger" onclick="Cart.clear(); Cart.showModal();" title="Vider le panier">
                            <i class="fas fa-trash-can me-1"></i> Vider le panier
                        </button>
                        ` : ''}
                    </div>
                    ${items.length === 0 ? `
                    <div class="p-4 text-center text-muted">
                        <div style="font-size:36px;color:#cbd5e1;margin-bottom:8px;"><i class="fas fa-basket-shopping"></i></div>
                        <h6 class="fw-bold text-dark">Votre panier est actuellement vide</h6>
                        <p class="small mb-3">Recherchez des articles ci-dessus ou consultez le catalogue de stock pour ajouter des fournitures et pièces.</p>
                        <button type="button" class="btn btn-sm btn-primary" onclick="UI.closeModal(); App.loadModule('stock');">
                            <i class="fas fa-boxes-stacked me-1"></i> Ouvrir le Catalogue Stock
                        </button>
                    </div>
                    ` : `
                    <div class="table-responsive" style="max-height:280px;overflow-y:auto;">
                        <table class="table table-sm table-hover align-middle mb-0">
                            <thead class="table-light small">
                                <tr>
                                    <th>#</th>
                                    <th>Réf. / Code</th>
                                    <th>Désignation de l'article</th>
                                    <th class="text-center">Dispo Stock</th>
                                    <th class="text-center" style="width:130px;">Quantité</th>
                                    <th class="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((it, idx) => {
                                    const art = allArticles.find(a => a.id === it.articleId) || {};
                                    const stockQty = Number(art.quantity) || it.stock || 0;
                                    return `
                                    <tr>
                                        <td class="text-muted fw-bold small text-center">${idx + 1}</td>
                                        <td>
                                            <span class="badge bg-light text-dark border font-monospace" style="font-size:10.5px;">${Utils.escapeHTML(it.code || '-')}</span>
                                        </td>
                                        <td>
                                            <div class="fw-bold text-dark" style="font-size:12.5px;">${Utils.escapeHTML(it.designation)}</div>
                                            <small class="text-muted" style="font-size:10.5px;">${Utils.escapeHTML(art.category || art.family || 'Fourniture')}</small>
                                        </td>
                                        <td class="text-center">
                                            <span class="badge ${stockQty > 0 ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'}" style="font-size:11px;">
                                                <i class="fas ${stockQty > 0 ? 'fa-check' : 'fa-triangle-exclamation'} me-1"></i> ${stockQty} ${Utils.escapeHTML(it.unit || 'U')}
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <div class="qty-control justify-content-center" style="margin:0;">
                                                <button type="button" class="qty-btn" onclick="Cart.changeQtyBy('${it.articleId}', -1); Cart.showModal();" title="Diminuer">-</button>
                                                <input type="number" class="qty-input" min="1" step="1" value="${it.quantity}" onchange="Cart.updateQty('${it.articleId}', this.value); Cart.showModal();">
                                                <button type="button" class="qty-btn" onclick="Cart.changeQtyBy('${it.articleId}', 1); Cart.showModal();" title="Augmenter">+</button>
                                            </div>
                                        </td>
                                        <td class="text-end">
                                            <button type="button" class="btn btn-xs btn-outline-danger" onclick="Cart.removeItem('${it.articleId}'); Cart.showModal();" title="Supprimer cet article du panier">
                                                <i class="fas fa-trash-can"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    `}
                </div>

                <!-- Requisition / Discharge Issuance Form -->
                <form id="cartModalSubmitForm" onsubmit="Cart.submitModalOrder(event)">
                    <div class="card p-3 border bg-white shadow-sm mb-2">
                        <div class="fw-bold mb-2 text-dark d-flex align-items-center gap-2 small text-uppercase" style="border-bottom:1px solid #f1f5f9;padding-bottom:6px;">
                            <i class="fas fa-file-signature text-primary"></i> Informations du Bénéficiaire & Affectation
                        </div>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold mb-1">Demandeur / Bénéficiaire *</label>
                                ${Auth.isAdmin() || Auth.isMag() ? `
                                <select name="beneficiary" class="form-select form-select-sm" required>
                                    <option value="${Utils.escapeHTML(currentUser.name)}">${Utils.escapeHTML(currentUser.name)} (Moi-même)</option>
                                    ${bens.map(b => `<option value="${Utils.escapeHTML(b.name)}">${Utils.escapeHTML(b.name)} (${Utils.escapeHTML(b.department || '')})` + `</option>`).join('')}
                                </select>
                                ` : `
                                <input type="text" name="beneficiary" class="form-control form-control-sm" value="${Utils.escapeHTML(currentUser.name)}" readonly>
                                `}
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold mb-1">Département / Service *</label>
                                <select name="department" class="form-select form-select-sm" required>
                                    ${depts.map(d => `<option value="${Utils.escapeHTML(d)}" ${(currentUser.department===d)?'selected':''}>${Utils.escapeHTML(d)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold mb-1">Motif de la demande / Destination *</label>
                                <input type="text" name="reason" class="form-control form-control-sm" placeholder="Ex: Dotation fournitures de bureau, outillage magasin, consommation interne..." required>
                            </div>
                        </div>
                        <div class="p-2 mt-2 bg-light rounded border d-flex align-items-center gap-2 text-muted small" style="font-size:11.5px;">
                            <i class="fas fa-check-double text-success"></i>
                            <span>La validation génère automatiquement la <strong>Décharge Magasin</strong> officielle et le <strong>Pass de Retrait QR Code</strong>.</span>
                        </div>
                    </div>
                </form>
            </div>
        `;

        const footerHtml = items.length > 0 ? `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="small text-muted">
                    Total : <strong>${count} article(s)</strong> (${items.length} référence${items.length > 1 ? 's' : ''})
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="UI.closeModal();">Continuer les sélections</button>
                    <button type="button" class="btn btn-success btn-sm fw-bold px-3 shadow-sm" onclick="document.getElementById('cartModalSubmitForm').requestSubmit();">
                        <i class="fas fa-check-circle me-1"></i> Valider la Décharge Magasin
                    </button>
                </div>
            </div>
        ` : `
            <button type="button" class="btn btn-secondary btn-sm" onclick="UI.closeModal();">Fermer</button>
        `;

        UI.showModal({
            title: `<div class="d-flex align-items-center gap-2"><i class="fas fa-cart-shopping text-primary"></i> <span class="fw-bold">Mon Panier Magasin</span> <span class="badge bg-primary font-monospace">${count} art.</span></div>`,
            body: modalHtml,
            footer: footerHtml,
            size: 'modal-lg'
        });
    },

    submitModalOrder: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const form = document.getElementById('cartModalSubmitForm');
        if (!form) return;
        this.submitOrder({
            target: {
                beneficiary: form.querySelector('select[name="beneficiary"]') || form.querySelector('input[name="beneficiary"]'),
                department: form.querySelector('select[name="department"]'),
                materialId: { value: '' },
                reason: form.querySelector('input[name="reason"]')
            }
        });
        UI.closeModal();
    },

    onModalSearchInput: function(q) {
        this._searchQuery = q;
        this.renderModalCatalogResults();
    },

    onModalCatChange: function(cat) {
        this._selectedCategory = cat;
        this.renderModalCatalogResults();
    },

    openModalCatalogDropdown: function() {
        const dd = document.getElementById('modalCartDropdown');
        if (dd) dd.style.display = 'block';
        this.renderModalCatalogResults();
    },

    clearModalSearch: function() {
        this._searchQuery = '';
        this._selectedCategory = '';
        const inp = document.getElementById('modalCartSearchInput');
        if (inp) inp.value = '';
        const cat = document.getElementById('modalCartCatFilter');
        if (cat) cat.value = '';
        const dd = document.getElementById('modalCartDropdown');
        if (dd) dd.style.display = 'none';
        const clr = document.getElementById('modalCartClearBtn');
        if (clr) clr.style.display = 'none';
    },

    renderModalCatalogResults: function() {
        const dd = document.getElementById('modalCartDropdown');
        if (!dd) return;
        dd.style.display = 'block';
        const articles = DB.getArticles ? DB.getArticles() : [];
        const q = (this._searchQuery || '').toLowerCase().trim();
        const cat = this._selectedCategory || '';
        const currentItems = this.getItems();

        let filtered = articles;
        if (cat) filtered = filtered.filter(a => (a.category === cat || a.family === cat));
        if (q) {
            filtered = filtered.filter(a => {
                return (a.designation && a.designation.toLowerCase().includes(q)) ||
                       (a.code && a.code.toLowerCase().includes(q)) ||
                       (a.barcode && a.barcode.toLowerCase().includes(q));
            });
        }

        const clr = document.getElementById('modalCartClearBtn');
        if (clr) clr.style.display = (q || cat) ? 'inline-block' : 'none';

        if (filtered.length === 0) {
            dd.innerHTML = '<div class="p-2 text-center text-muted small">Aucun article trouvé.</div>';
            return;
        }

        dd.innerHTML = filtered.slice(0, 30).map(a => {
            const inCart = currentItems.find(i => i.articleId === a.id);
            const stockQty = Number(a.quantity) || 0;
            return `
                <div class="d-flex justify-content-between align-items-center p-2 border-bottom small hover-bg" style="cursor:default;">
                    <div>
                        <span class="badge bg-light text-dark border font-monospace me-1">${Utils.escapeHTML(a.code)}</span>
                        <strong>${Utils.escapeHTML(a.designation)}</strong>
                        <span class="text-muted ms-2">(Stock: <strong class="${stockQty > 0 ? 'text-success' : 'text-danger'}">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</strong>)</span>
                    </div>
                    <button type="button" class="btn btn-xs ${inCart ? 'btn-primary' : 'btn-outline-primary'} fw-bold" onclick="Cart.addItem('${a.id}', 1); Cart.showModal();">
                        ${inCart ? `<i class="fas fa-check me-1"></i>+1 (${inCart.quantity})` : `<i class="fas fa-plus me-1"></i>Ajouter`}
                    </button>
                </div>
            `;
        }).join('');
    },

    addItem: function(articleId, qty = 1) {
        const articles = DB.getArticles();
        const art = articles.find(a => a.id === articleId);
        if (!art) {
            Utils.showNotification('Article introuvable.', 'error');
            return;
        }

        const items = this.getItems();
        const existing = items.find(i => i.articleId === articleId);
        if (existing) {
            existing.quantity = Number(existing.quantity) + Number(qty);
        } else {
            items.push({
                articleId: art.id,
                code: art.code,
                designation: art.designation,
                unit: art.unit || 'U',
                quantity: Number(qty),
                stock: Number(art.quantity) || 0,
                price: Number(art.price) || 0
            });
        }

        this.saveItems(items);
        Utils.showNotification(`"${art.designation}" ajouté à la demande (${this.getCount()} articles).`, 'success');
        
        // Update stock row button if present
        const btn = document.getElementById(`stockReqBtn_${articleId}`);
        if (btn) {
            const currentItem = this.getItems().find(i => i.articleId === articleId);
            btn.className = 'btn btn-xs btn-primary fw-bold';
            btn.innerHTML = `<i class="fas fa-check me-1"></i> Demandé (${currentItem ? currentItem.quantity : 1}) +`;
        }
    },

    removeItem: function(articleId) {
        let items = this.getItems();
        items = items.filter(i => i.articleId !== articleId);
        this.saveItems(items);
        Utils.showNotification('Article retiré de la demande.', 'info');
        
        // Reset stock row button if present
        const btn = document.getElementById(`stockReqBtn_${articleId}`);
        if (btn) {
            btn.className = 'btn btn-xs btn-outline-primary';
            btn.innerHTML = `<i class="fas fa-plus-circle me-1"></i> Demander`;
        }
    },

    updateQty: function(articleId, newQty) {
        let items = this.getItems();
        const q = Number(newQty);
        if (q <= 0) {
            this.removeItem(articleId);
            return;
        }
        const item = items.find(i => i.articleId === articleId);
        if (item) {
            item.quantity = q;
            this.saveItems(items);
        }
    },

    changeQtyBy: function(articleId, delta) {
        const items = this.getItems();
        const item = items.find(i => i.articleId === articleId);
        if (item) {
            const next = Number(item.quantity) + delta;
            this.updateQty(articleId, next);
        }
    },

    clear: function() {
        this.saveItems([]);
        this.updateBadge();
        Utils.showNotification('La sélection d\'articles a été réinitialisée.', 'info');
        if (typeof Stock !== 'undefined' && App && App.currentModule === 'stock') {
            App.loadModule('stock');
        }
    },

    _searchQuery: '',
    _selectedCategory: '',
    _dropdownOpen: false,

    onCategoryChange: function(cat) {
        this._selectedCategory = cat;
        this._dropdownOpen = true;
        this.renderCatalogResults();
    },

    onSearchInput: function(query) {
        this._searchQuery = query;
        this._dropdownOpen = true;
        const clearBtn = document.getElementById('cartSearchClearBtn');
        if (clearBtn) clearBtn.style.display = (query || this._selectedCategory) ? 'inline-block' : 'none';
        this.renderCatalogResults();
    },

    openCatalogDropdown: function() {
        this._dropdownOpen = true;
        const dd = document.getElementById('cartCatalogDropdown');
        if (dd) dd.style.display = 'block';
        this.renderCatalogResults();
    },

    clearSearch: function() {
        this._searchQuery = '';
        this._selectedCategory = '';
        this._dropdownOpen = false;
        const input = document.getElementById('cartArticleSearchInput');
        if (input) input.value = '';
        const catSelect = document.getElementById('cartCategoryFilter');
        if (catSelect) catSelect.value = '';
        const dd = document.getElementById('cartCatalogDropdown');
        if (dd) dd.style.display = 'none';
        const clearBtn = document.getElementById('cartSearchClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';
    },

    focusSearch: function() {
        const input = document.getElementById('cartArticleSearchInput');
        if (input) {
            input.focus();
            this.openCatalogDropdown();
        }
    },

    addItemFromCatalog: function(articleId) {
        this.addItem(articleId, 1);
    },

    renderCatalogResults: function() {
        const dd = document.getElementById('cartCatalogDropdown');
        if (!dd) return;
        dd.style.display = 'block';

        const articles = DB.getArticles ? DB.getArticles() : [];
        const q = (this._searchQuery || '').toLowerCase().trim();
        const cat = this._selectedCategory || '';
        const currentItems = this.getItems();

        let filtered = articles;
        if (cat) {
            filtered = filtered.filter(a => (a.category === cat || a.family === cat));
        }
        if (q) {
            filtered = filtered.filter(a => {
                return (a.designation && a.designation.toLowerCase().includes(q)) ||
                       (a.code && a.code.toLowerCase().includes(q)) ||
                       (a.barcode && a.barcode.toLowerCase().includes(q)) ||
                       (a.family && a.family.toLowerCase().includes(q)) ||
                       (a.section && a.section.toLowerCase().includes(q));
            });
        }

        if (filtered.length === 0) {
            dd.innerHTML = `
                <div class="p-3 text-center text-muted small">
                    <i class="fas fa-search me-1"></i> Aucun article ne correspond à votre recherche.
                </div>
            `;
            return;
        }

        let headerNotice = '';
        if (cat) {
            headerNotice = `<div class="picker-notice-bar text-primary"><i class="fas fa-folder-open me-1"></i> Catégorie: ${Utils.escapeHTML(cat)} • ${filtered.length} pièces (Défilez)</div>`;
        } else if (!q) {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-boxes-stacked me-1 text-primary"></i> ${filtered.length} articles au catalogue • Défilez pour voir la suite</div>`;
        } else {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-search me-1 text-primary"></i> ${filtered.length} résultat(s) • Défilez</div>`;
        }

        dd.innerHTML = headerNotice + filtered.map(a => {
            const inCart = currentItems.find(i => i.articleId === a.id);
            const stockQty = Number(a.quantity) || 0;
            return `
                <div class="article-picker-item" style="cursor:default;">
                    <div class="item-main">
                        <div class="item-title-row">
                            <span class="badge bg-light text-dark border font-monospace" style="font-size:10px;padding:2px 5px;">${Utils.escapeHTML(a.code)}</span>
                            <span class="item-title">${Utils.escapeHTML(a.designation)}</span>
                        </div>
                        <div class="item-sub-row">
                            <span class="badge bg-secondary-subtle text-secondary" style="font-size:9.5px;padding:1px 5px;">${Utils.escapeHTML(a.category || a.family || 'Général')}</span>
                            <span>Stock: <strong class="${stockQty > 0 ? 'text-success' : 'text-danger'}">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</strong></span>
                            ${a.section ? `<span>• Sec. <strong>${Utils.escapeHTML(a.section)}</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="item-badge-col">
                        <button type="button" class="btn btn-xs ${inCart ? 'btn-primary' : 'btn-outline-primary'} fw-bold" onclick="Cart.addItemFromCatalog('${a.id}');" style="white-space:nowrap;padding:3px 10px;font-size:11px;" title="${inCart ? 'Ajouter 1 pièce de plus' : 'Ajouter à ma demande'}">
                            ${inCart ? `<i class="fas fa-check me-1"></i>+1 (${inCart.quantity})` : `<i class="fas fa-plus me-1"></i>Ajouter`}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },


    _schemaExpanded: true,
    _selectedVehicleType: 'truck_heavy_4x2',
    _selectedMaterialId: '',
    _drawerExpanded: false,

    toggleDrawerExpand: function() {
        const drawer = document.getElementById('reqDrawer');
        if (!drawer) return;
        this._drawerExpanded = !this._drawerExpanded;
        if (this._drawerExpanded) {
            drawer.classList.add('drawer-wide');
        } else {
            drawer.classList.remove('drawer-wide');
        }
        const btn = document.getElementById('btnExpandDrawer');
        if (btn) {
            btn.innerHTML = this._drawerExpanded ? '<i class="fas fa-compress me-1"></i> Mode Standard' : '<i class="fas fa-expand me-1"></i> Mode Large CAD';
        }
    },

    toggleSchemaViewer: function() {
        this._schemaExpanded = !this._schemaExpanded;
        const wrap = document.getElementById('cartInteractiveSchemaWrap');
        const icon = document.getElementById('cartSchemaToggleIcon');
        if (wrap) {
            wrap.style.display = this._schemaExpanded ? 'block' : 'none';
        }
        if (icon) {
            icon.className = this._schemaExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    },

    onVehicleSelected: function(vehicleId) {
        this._selectedMaterialId = vehicleId;
        const fleet = (typeof DB !== 'undefined' && DB.getFleet) ? DB.getFleet() : [];
        const mat = fleet.find(f => f.id === vehicleId);

        let detected = 'truck_heavy_4x2';
        if (mat) {
            if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.detectVehicleType) {
                detected = PlanTravailModule.detectVehicleType(mat);
            } else {
                const txt = ((mat.name || '') + ' ' + (mat.family || '') + ' ' + (mat.model || '')).toLowerCase();
                if (txt.includes('howo') || txt.includes('6x4') || txt.includes('tandem')) detected = 'truck_heavy_6x4';
                else if (txt.includes('remorque') || txt.includes('semi') || txt.includes('citerne') || txt.includes('benne') || txt.includes('plateau')) detected = 'semi_remorque';
                else if (txt.includes('doblo') || txt.includes('hilux') || txt.includes('partner') || txt.includes('mazot') || txt.includes('dmax')) detected = 'diesel_car';
                else if (txt.includes('tipo') || txt.includes('symbol') || txt.includes('essence') || txt.includes('accent')) detected = 'gasoline_car';
                else if (txt.includes('gpl') || txt.includes('gaz') || txt.includes('sirghaz')) detected = 'gpl_car';
                else if (txt.includes('panorama') || txt.includes('bus') || txt.includes('minibus')) detected = 'fiat_panorama';
                else if (txt.includes('isuzu') || txt.includes('daily') || txt.includes('leger') || txt.includes('hd')) detected = 'small_truck';
            }
        }
        this._selectedVehicleType = detected;
        this._schemaExpanded = true;

        if (typeof PlanTravailModule !== 'undefined') {
            PlanTravailModule.currentVehicleType = detected;
            PlanTravailModule.currentImmat = mat ? mat.immatriculation : '';
            if (typeof PlanTravailModule.switchVehicleDiagram === 'function') {
                PlanTravailModule.switchVehicleDiagram(detected);
            }
            if (mat && PlanTravailModule.updateRecurrenceCard) {
                PlanTravailModule.updateRecurrenceCard(mat.immatriculation, mat.serialNumber || mat.vin);
            }
        } else {
            const mount = document.getElementById('schemaSvgMount');
            if (mount) {
                mount.innerHTML = this.renderSchemaSvg(detected);
            }
        }

        // Also update any vehicle select inputs inside drawer
        const select = document.getElementById('drawerFleetSelect');
        if (select && select.value !== vehicleId) select.value = vehicleId;
    },

    switchVehicleType: function(type) {
        this._selectedVehicleType = type;
        if (typeof PlanTravailModule !== 'undefined') {
            PlanTravailModule.currentVehicleType = type;
            if (typeof PlanTravailModule.switchVehicleDiagram === 'function') {
                PlanTravailModule.switchVehicleDiagram(type);
            }
        } else {
            const mount = document.getElementById('schemaSvgMount');
            if (mount) mount.innerHTML = this.renderSchemaSvg(type);
        }

        // Update active class on pills
        document.querySelectorAll('.btn-vehicle-type').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            if (onclickAttr.includes("'" + type + "'") || onclickAttr.includes('"' + type + '"')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    renderSchemaSvg: function(type) {
        if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.generateVehicleSvg) {
            const recent = PlanTravailModule.getRecentlyServicedComponents ? PlanTravailModule.getRecentlyServicedComponents(PlanTravailModule.currentImmat) : {};
            return PlanTravailModule.generateVehicleSvg(
                type || this._selectedVehicleType || 'truck_heavy_4x2',
                Array.from(PlanTravailModule.selectedParts || []),
                PlanTravailModule.wheelStates || {},
                PlanTravailModule.wheelSubComponents || {},
                recent
            );
        }
        return '<div class="p-3 text-center text-muted">Schéma vectoriel en cours d\'initialisation...</div>';
    },

    addPartFromSchema: function(partLabel, code, qty = 1) {
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const labelLower = (partLabel || '').toLowerCase();
        
        // Match existing article or create requisition item
        let matched = articles.find(a => {
            const des = (a.designation || '').toLowerCase();
            return des.includes(labelLower) || (labelLower.includes('moteur') && des.includes('moteur')) ||
                   (labelLower.includes('turbo') && des.includes('turbo')) ||
                   (labelLower.includes('radiateur') && (des.includes('radiateur') || des.includes('refroidissement'))) ||
                   (labelLower.includes('boîte') && (des.includes('boite') || des.includes('embrayage'))) ||
                   (labelLower.includes('frein') && des.includes('plaquette')) ||
                   (labelLower.includes('pneu') && des.includes('pneu'));
        });

        const items = this.getItems();
        if (matched) {
            const existing = items.find(i => i.articleId === matched.id);
            if (existing) {
                existing.quantity = Number(existing.quantity) + Number(qty);
            } else {
                items.push({
                    articleId: matched.id,
                    code: matched.code,
                    designation: matched.designation,
                    unit: matched.unit || 'U',
                    quantity: Number(qty),
                    stock: Number(matched.quantity) || 0,
                    price: Number(matched.price) || 0,
                    fromSchema: true
                });
            }
        } else {
            const autoCode = code || ('REP-' + (partLabel.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6)).toUpperCase());
            const existing = items.find(i => i.code === autoCode || i.designation === partLabel);
            if (existing) {
                existing.quantity = Number(existing.quantity) + Number(qty);
            } else {
                items.push({
                    articleId: 'CUSTOM_' + autoCode,
                    code: autoCode,
                    designation: partLabel,
                    unit: 'U',
                    quantity: Number(qty),
                    stock: 1,
                    price: 0,
                    fromSchema: true
                });
            }
        }

        this.saveItems(items);
        this.renderDrawer();
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(`Pièce ${partLabel} ajoutée à votre demande de matériel.`, 'success');
        }
    },

    removePartFromSchema: function(partLabel, code) {
        let items = this.getItems();
        const autoCode = code || ('REP-' + (partLabel.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6)).toUpperCase());
        items = items.filter(i => i.code !== autoCode && i.designation !== partLabel && !i.designation.includes(partLabel));
        this.saveItems(items);
        this.renderDrawer();
    },

    addWheelFromSchema: function(wheelId, wheelLabel) {
        this.addPartFromSchema(`Roue & Station ${wheelLabel}`, 'WHL-' + wheelId.toUpperCase(), 1);
    },

    removeWheelFromSchema: function(wheelId, wheelLabel) {
        this.removePartFromSchema(`Roue & Station ${wheelLabel}`, 'WHL-' + wheelId.toUpperCase());
    },

    syncWheelSubs: function(wheelId, wheelLabel, subs, autoAdd = false) {
        if (!subs) return;
        if (subs.plaquettes) this.addPartFromSchema(`Jeu Plaquettes de Frein (${wheelLabel})`, 'BRK-PAD-01', 1);
        if (subs.pneu) this.addPartFromSchema(`Pneumatique / Pneu (${wheelLabel})`, 'PNEU-STD', 1);
        if (subs.disque) this.addPartFromSchema(`Disque de Frein (${wheelLabel})`, 'BRK-DISC-01', 1);
        if (subs.etrier) this.addPartFromSchema(`Étrier / Cylindre (${wheelLabel})`, 'BRK-CAL-01', 1);
        if (subs.roulement) this.addPartFromSchema(`Roulement de Moyeu (${wheelLabel})`, 'BRG-HUB-01', 1);
        if (subs.goujons) this.addPartFromSchema(`Goujons & Écrous (${wheelLabel})`, 'SCR-WHL-10', 4);
    },

    openWheelInspector: function(wheelId, wheelLabel) {
        if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.openWheelStationInspector) {
            PlanTravailModule.openWheelStationInspector(wheelId, wheelLabel);
        }
    },

    showOrderSchemaModal: function(orderId) {
        const preOrders = (typeof DB !== 'undefined' && DB.data && DB.data.preOrders) ? DB.data.preOrders : [];
        const order = preOrders.find(p => p.id === orderId || p.ref === orderId);
        if (!order) {
            if (typeof Utils !== 'undefined') Utils.showNotification('Demande introuvable.', 'error');
            return;
        }

        const workPlans = (typeof DB !== 'undefined' && DB.data && DB.data.workPlans) ? DB.data.workPlans : [];
        const plan = workPlans.find(w => w.preOrderId === order.id || w.ref === order.workPlanRef || (order.workPlanId && w.id === order.workPlanId)) || {};

        const vehicleType = plan.vehicleType || order.vehicleType || 'truck_heavy_4x2';
        const affectedOrgans = plan.affectedOrgans || order.affectedOrgans || [];
        const wheelStates = plan.wheelStates || order.wheelStates || {};
        const wheelSubComponents = plan.wheelSubComponents || order.wheelSubComponents || {};
        const recent = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.getRecentlyServicedComponents) ? PlanTravailModule.getRecentlyServicedComponents(order.immatriculation || plan.immatriculation) : {};

        let svgMarkup = '';
        if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.generateVehicleSvg) {
            svgMarkup = PlanTravailModule.generateVehicleSvg(vehicleType, affectedOrgans, wheelStates, wheelSubComponents, recent);
        } else {
            svgMarkup = '<div class="alert alert-info">Schéma vectoriel non disponible.</div>';
        }

        const items = Array.isArray(order.items) ? order.items : [];

        const modalHtml = `
            <div class="p-2">
                <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-primary font-monospace">${Utils.escapeHTML(order.ref)}</span>
                            ${order.workPlanRef ? `<span class="badge bg-success font-monospace"><i class="fas fa-screwdriver-wrench me-1"></i>${Utils.escapeHTML(order.workPlanRef)}</span>` : ''}
                            <span class="badge bg-${order.status === 'Servie' ? 'success' : 'warning text-dark'}">${order.status || 'En attente'}</span>
                        </div>
                        <h5 class="fw-bold mb-0 text-dark">Schéma Vectoriel Interactif & Diagnostic Pièces</h5>
                        <small class="text-muted">Véhicule : ${order.immatriculation ? `<strong class="font-monospace text-dark">${Utils.escapeHTML(order.immatriculation)}</strong> (${Utils.escapeHTML(order.materialName || 'Flotte')})` : 'Non spécifié'}</small>
                    </div>
                    <div class="text-end">
                        <small class="text-muted d-block">Demandeur : <strong>${Utils.escapeHTML(order.beneficiary || order.userName || '-')}</strong></small>
                        <small class="text-muted d-block">Département : ${Utils.escapeHTML(order.department || '-')}</small>
                    </div>
                </div>

                <!-- CAD Blueprint Box -->
                <div class="vehicle-schema-wrapper mb-3" style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-dark text-info font-monospace" style="font-size:11.5px;">
                            <i class="fas fa-microchip me-1"></i> Blue-Print CAD : ${Utils.escapeHTML(vehicleType.toUpperCase())}
                        </span>
                        <div class="small text-muted">
                            <span class="badge bg-danger me-1">${affectedOrgans.length} organe(s)</span>
                            <span class="badge bg-warning text-dark">${Object.keys(wheelStates).length} roue(s)</span>
                        </div>
                    </div>
                    <div class="schema-svg-container" style="min-height:260px;display:flex;justify-content:center;align-items:center;">
                        ${svgMarkup}
                    </div>
                </div>

                <!-- Parts Requested Table -->
                <div class="card mb-3 border">
                    <div class="card-header bg-white py-2 fw-bold small text-uppercase">
                        <i class="fas fa-boxes-stacked text-primary me-1"></i> Pièces commandées pour cette intervention (${items.length} références)
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Réf / Code</th>
                                    <th>Désignation de la pièce</th>
                                    <th class="text-center">Demandé</th>
                                    <th class="text-center">Servi</th>
                                    <th class="text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((it, idx) => `
                                <tr>
                                    <td class="text-center text-muted fw-bold">${idx + 1}</td>
                                    <td><strong class="font-monospace text-primary">${Utils.escapeHTML(it.code || '-')}</strong></td>
                                    <td><strong>${Utils.escapeHTML(it.designation || it.articleId)}</strong></td>
                                    <td class="text-center fw-bold">${it.requestedQty || it.quantity || 1} ${Utils.escapeHTML(it.unit || 'U')}</td>
                                    <td class="text-center fw-bold text-success">${it.servedQty || 0}</td>
                                    <td class="text-center"><span class="badge bg-${it.status === 'Servie' ? 'success' : 'secondary'}">${it.status || 'En attente'}</span></td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Print Actions -->
                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <button type="button" class="btn btn-outline-secondary" onclick="UI.hideModal();">Fermer</button>
                    <div class="d-flex gap-2">
                        ${order.workPlanId ? `
                        <button type="button" class="btn btn-outline-primary" onclick="PlanTravailModule.printPlan('${order.workPlanId}')">
                            <i class="fas fa-print me-1"></i> Imprimer Volet 1 (Bon de Travail)
                        </button>
                        ` : ''}
                        ${order.workPlanId ? `
                        <button type="button" class="btn btn-outline-success" onclick="PlanTravailModule.printDechargeGds('${order.workPlanId}')">
                            <i class="fas fa-truck-ramp-box me-1"></i> Imprimer Volet 2 (Décharge GDS)
                        </button>
                        ` : ''}
                        <button type="button" class="btn btn-primary" onclick="Cart.showRequestPass('${order.id}')">
                            <i class="fas fa-qrcode me-1"></i> Voir Pass de Retrait
                        </button>
                    </div>
                </div>
            </div>
        `;

        UI.showModal({
            title: `<i class="fas fa-diagram-project text-primary me-2"></i> Schéma CAD de la Demande ${order.ref}`,
            body: modalHtml,
            size: 'modal-xl',
            cancelText: 'Fermer'
        });
    },

    renderDrawer: function() {
        const drawer = document.getElementById('reqDrawer');
        if (!drawer) return;

        if (this._drawerExpanded) {
            drawer.classList.add('drawer-wide');
        } else {
            drawer.classList.remove('drawer-wide');
        }

        const items = this.getItems();
        const count = this.getCount();
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : { name: 'Utilisateur', role: 'normal', department: 'Direction Générale' };
        const depts = (DB.getSettings().departments && DB.getSettings().departments.length > 0) ? DB.getSettings().departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const bens = typeof Beneficiaries !== 'undefined' ? Beneficiaries.getBeneficiariesList() : [];
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const allArticles = DB.getArticles ? DB.getArticles() : [];
        const settings = (DB.getSettings && DB.getSettings()) || {};
        const categories = [...new Set([
            ...(settings.articleCategories || []),
            ...allArticles.map(a => a.category).filter(Boolean),
            ...allArticles.map(a => a.family).filter(Boolean)
        ])].filter(Boolean).sort();

        const currentMatId = this._selectedMaterialId || '';
        const currentMat = fleet.find(f => f.id === currentMatId);
        const currentType = this._selectedVehicleType || 'truck_heavy_4x2';

        // 1. Items List HTML
        let itemsHtml = '';
        if (items.length === 0) {
            itemsHtml = `
                <div class="p-3 text-center border rounded bg-light mb-3">
                    <div style="font-size:24px;color:#2563eb;margin-bottom:6px;"><i class="fas fa-hand-pointer"></i></div>
                    <strong class="d-block small text-dark mb-1">Votre panier de demande est vide</strong>
                    <div class="text-muted" style="font-size:11px;">
                        Cliquez directement sur un organe ou une roue du <strong>Schéma Véhicule</strong> ci-dessus, ou utilisez la barre de <strong>recherche / menu</strong> pour ajouter des pièces.
                    </div>
                </div>
            `;
        } else {
            itemsHtml = `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-dark" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">ARTICLES SÉLECTIONNÉS (${items.length})</span>
                        <button type="button" class="btn btn-xs text-muted" onclick="Cart.clear();" title="Vider la liste"><i class="fas fa-undo me-1"></i> Réinitialiser</button>
                    </div>

                    ${items.map(item => `
                        <div class="drawer-item-card">
                            <div class="drawer-item-top">
                                <div>
                                    <div class="drawer-item-name">${Utils.escapeHTML(item.designation)}</div>
                                    <div class="drawer-item-code font-monospace">${Utils.escapeHTML(item.code || '-')} ${item.fromSchema ? '<span class="badge bg-info-subtle text-info border border-info ms-1" style="font-size:9.5px;">Schéma CAD</span>' : ''}</div>
                                </div>
                                <button type="button" class="btn btn-xs btn-outline-danger" onclick="Cart.removeItem('${item.articleId}')" title="Retirer" style="padding:2px 7px;font-size:11px;">
                                    <i class="fas fa-times me-1"></i>Retirer
                                </button>
                            </div>
                            <div class="drawer-item-bottom">
                                <span class="drawer-item-stock">
                                    <i class="fas fa-circle-check me-1"></i> Dispo : ${item.stock} ${Utils.escapeHTML(item.unit || 'U')}
                                </span>
                                <div class="qty-control" style="margin:0;">
                                    <button type="button" class="qty-btn" onclick="Cart.changeQtyBy('${item.articleId}', -1)" title="Diminuer">-</button>
                                    <input type="number" class="qty-input" min="1" step="1" value="${item.quantity}" onchange="Cart.updateQty('${item.articleId}', this.value)">
                                    <button type="button" class="qty-btn" onclick="Cart.changeQtyBy('${item.articleId}', 1)" title="Augmenter">+</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 2. Form HTML
        const formHtml = `
            <form id="drawerSubmitForm" onsubmit="Cart.submitOrder(event)">
                <div class="card p-3 mb-2" style="background:var(--surface,#ffffff);border:1px solid var(--border,#e2e8f0);border-radius:8px;">
                    <div class="fw-bold mb-2 text-dark d-flex align-items-center gap-2" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid var(--border-light,#f1f5f9);">
                        <i class="fas fa-file-signature text-primary"></i> Formulaire de Décharge Magasin
                    </div>
                    <div class="mb-2">
                        <label class="form-label small fw-bold mb-1">Bénéficiaire / Demandeur *</label>
                        ${Auth.isAdmin() || Auth.isMag() ? `
                        <select name="beneficiary" class="form-select form-select-sm" required>
                            <option value="${Utils.escapeHTML(currentUser.name)}">${Utils.escapeHTML(currentUser.name)} (Moi-même)</option>
                            ${bens.map(b => `<option value="${Utils.escapeHTML(b.name)}">${Utils.escapeHTML(b.name)} (${Utils.escapeHTML(b.department || '')})` + `</option>`).join('')}
                        </select>
                        ` : `
                        <input type="text" name="beneficiary" class="form-control form-control-sm" value="${Utils.escapeHTML(currentUser.name)}" readonly>
                        `}
                    </div>
                    <div class="mb-2">
                        <label class="form-label small fw-bold mb-1">Département / Service *</label>
                        <select name="department" class="form-select form-select-sm" required>
                            ${depts.map(d => `<option value="${Utils.escapeHTML(d)}" ${(currentUser.department===d)?'selected':''}>${Utils.escapeHTML(d)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label small fw-bold mb-1">Motif / Justification du besoin *</label>
                        <input type="text" name="reason" class="form-control form-control-sm" placeholder="Ex: Dotation fournitures bureau, outillage magasin, consommation interne..." required>
                    </div>
                                        <div class="mb-2">
                        <label class="form-label small fw-bold mb-1">Véhicule / Affectation (Optionnel — Lié au schéma CAD)</label>
                        <select name="materialId" id="drawerFleetSelect" class="form-select form-select-sm" onchange="Cart.onVehicleSelected(this.value)">
                            <option value="">-- Aucun véhicule spécifique (Dotation normale) --</option>
                            ${fleet.map(f => `<option value="${f.id}" ${currentMatId === f.id ? 'selected' : ''}>${Utils.escapeHTML(f.immatriculation)} - ${Utils.escapeHTML(f.name)} (${Utils.escapeHTML(f.family || 'Camion')})</option>`).join('')}
                        </select>
                    </div>
                    <div class="d-flex align-items-center justify-content-between p-2 mt-2 bg-light rounded border">
                        <div class="small text-muted" style="font-size:11px;">
                            <i class="fas fa-check-double text-success me-1"></i> Génère automatiquement le <strong>Bon de Décharge Magasin</strong> et le <strong>Pass de Retrait QR Code</strong>.
                        </div>
                    </div>
                </div>
            </form>
        `;

        // 3. Footer HTML
        let footerHtml = '';
        if (items.length > 0) {
            footerHtml = `
                <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                    <span class="small text-muted"><i class="fas fa-check-circle text-success me-1"></i> Récapitulatif</span>
                    <strong class="text-dark small">${items.length} référence${items.length > 1 ? 's' : ''} · ${count} pièce${count > 1 ? 's' : ''}</strong>
                </div>
                <button type="button" class="req-submit-btn" id="btnSubmitReqDrawer" onclick="document.getElementById('drawerSubmitForm').requestSubmit();">
                    <i class="fas fa-paper-plane me-1"></i>
                    <span>Transmettre la Demande (${count} pièce${count > 1 ? 's' : ''})</span>
                </button>
            `;
        } else {
            footerHtml = `
                <button type="button" class="btn btn-outline-secondary w-100" onclick="Cart.closeDrawer();">
                    Fermer le Panneau
                </button>
            `;
        }

        // 4. Vehicle CAD Vector Schematic Box HTML
        const schemaBoxHtml = `
            <div class="drawer-schema-box">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong style="color:#38bdf8;font-size:13px;">
                            <i class="fas fa-microchip me-1"></i> Schéma CAD Interactif & Diagnostic Pièces
                        </strong>
                        <small class="d-block text-muted" style="font-size:10.5px;">Cliquez directement sur un composant ou une roue pour l'ajouter à votre demande.</small>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="btn btn-xs btn-outline-light" onclick="Cart.toggleDrawerExpand()" title="Mode Large pour un affichage maximal du schéma">
                            <i class="fas fa-expand me-1"></i> Large
                        </button>
                        <button type="button" class="btn btn-xs btn-outline-secondary text-white" onclick="Cart.toggleSchemaViewer()" title="Afficher / Masquer">
                            <i class="fas ${this._schemaExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}" id="cartSchemaToggleIcon"></i>
                        </button>
                    </div>
                </div>

                <div id="cartInteractiveSchemaWrap" style="display:${this._schemaExpanded ? 'block' : 'none'};">
                    <!-- Recurrence Alert Notification Banner (Dynamic) -->
                    <div id="pastInterventionsAlertCard" style="display:none;margin-bottom:8px;"></div>

                    <!-- 8 VEHICLE CATEGORIES SELECTOR -->
                    <div class="vehicle-type-selector mb-2" id="vehicleTypeSelector" style="overflow-x:auto;padding-bottom:4px;gap:4px;">
                        <button type="button" class="btn-vehicle-type ${currentType === 'truck_heavy_4x2' ? 'active' : ''}" onclick="Cart.switchVehicleType('truck_heavy_4x2')" title="Camion Lourd Standard 4x2 (MAN, Volvo, Renault, Mercedes)">
                            <i class="fas fa-truck"></i> Camion 4x2
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'truck_heavy_6x4' ? 'active' : ''}" onclick="Cart.switchVehicleType('truck_heavy_6x4')" title="Tracteur Lourd 6x4 10 Roues (HOWO, Shacman, Tandem)">
                            <i class="fas fa-truck-monster"></i> HOWO 6x4
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'semi_remorque' ? 'active' : ''}" onclick="Cart.switchVehicleType('semi_remorque')" title="Semi-Remorque 3 Essieux (Plateau, Benne, Citerne)">
                            <i class="fas fa-trailer"></i> Remorque
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'small_truck' ? 'active' : ''}" onclick="Cart.switchVehicleType('small_truck')" title="Camion Leger (Isuzu, Hyundai HD, Daily)">
                            <i class="fas fa-truck-pickup"></i> Léger
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'diesel_car' ? 'active' : ''}" onclick="Cart.switchVehicleType('diesel_car')" title="Mazot / Pick-up (FIAT Doblo, Partner, Hilux)">
                            <i class="fas fa-van-shuttle"></i> Doblo
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'gasoline_car' ? 'active' : ''}" onclick="Cart.switchVehicleType('gasoline_car')" title="Berline Essence (FIAT Tipo, Symbol, Accent)">
                            <i class="fas fa-car-side"></i> Tipo
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'gpl_car' ? 'active' : ''}" onclick="Cart.switchVehicleType('gpl_car')" title="Vehicule Gaz / GPL (Sirghaz)">
                            <i class="fas fa-gas-pump"></i> GPL
                        </button>
                        <button type="button" class="btn-vehicle-type ${currentType === 'fiat_panorama' ? 'active' : ''}" onclick="Cart.switchVehicleType('fiat_panorama')" title="FIAT Panorama / Minibus 15 Places">
                            <i class="fas fa-bus-simple"></i> Panorama
                        </button>
                    </div>

                    <!-- SVG Mount Container -->
                    <div class="schema-svg-container" id="schemaSvgMount" style="min-height:220px;max-height:380px;display:flex;align-items:center;justify-content:center;background:#090d16;border:1px solid #1e293b;border-radius:8px;padding:6px;overflow:hidden;">
                        ${this.renderSchemaSvg(currentType)}
                    </div>

                    <!-- Selected Organs & Wheels Tray -->
                    <div class="selected-parts-tray mt-2" id="selectedPartsTray" style="background:#1e293b;padding:8px 12px;border-radius:6px;font-size:11.5px;">
                        <span class="text-muted small me-2"><i class="fas fa-triangle-exclamation text-warning me-1"></i> Organes Cibles :</span>
                        <span class="text-muted small fst-italic" id="noPartsHint">Cliquez sur un organe ou roue pour l'ajouter directement.</span>
                    </div>
                </div>
            </div>
        `;

        // 5. Build Complete Drawer Layout
        drawer.innerHTML = `
            <div class="req-drawer-header">
                <div class="d-flex align-items-center gap-2">
                    <div class="req-drawer-icon"><i class="fas fa-clipboard-list"></i></div>
                    <div>
                        <h5 class="req-drawer-title mb-0">Demande de Matériel</h5>
                        <small class="text-muted">${count} article${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}</small>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-xs btn-outline-primary" id="btnExpandDrawer" onclick="Cart.toggleDrawerExpand();" title="Agrandir le panneau pour le schéma CAD">
                        <i class="fas ${this._drawerExpanded ? 'fa-compress' : 'fa-expand'} me-1"></i> ${this._drawerExpanded ? 'Réduire' : 'Mode Large CAD'}
                    </button>
                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="Cart.goToHistoryAndCloseDrawer();" title="Voir l'historique de mes demandes">
                        <i class="fas fa-clock-rotate-left me-1"></i> Historique
                    </button>
                    <button type="button" class="req-drawer-close" onclick="Cart.closeDrawer();" title="Fermer"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Integrated Search & Menu Catalog Section -->
            <div class="drawer-catalog-search">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="form-label small fw-bold mb-0 text-dark d-flex align-items-center gap-1" style="font-size:12px;">
                        <i class="fas fa-plus-circle text-primary"></i> Ajouter un article (Recherche & Menu)
                    </label>
                    <span class="badge bg-light text-muted border font-monospace" style="font-size:10px;">${allArticles.length} réf en stock</span>
                </div>

                <div class="d-flex gap-1 align-items-center">
                    <select id="cartCategoryFilter" class="form-select form-select-sm" style="max-width:145px;font-size:12px;font-weight:600;" onchange="Cart.onCategoryChange(this.value)">
                        <option value="">📁 Tout le menu</option>
                        ${categories.map(c => `<option value="${Utils.escapeHTML(c)}" ${Cart._selectedCategory === c ? 'selected' : ''}>${Utils.escapeHTML(c)}</option>`).join('')}
                    </select>
                    <div class="position-relative flex-grow-1">
                        <input type="text" id="cartArticleSearchInput" class="form-control form-control-sm" placeholder="Rechercher nom, code, réf..." autocomplete="off" value="${Utils.escapeHTML(Cart._searchQuery || '')}" onfocus="Cart.openCatalogDropdown()" oninput="Cart.onSearchInput(this.value)">
                        <button type="button" id="cartSearchClearBtn" class="btn btn-xs position-absolute end-0 top-50 translate-middle-y me-1 text-muted" style="${Cart._searchQuery || Cart._selectedCategory ? '' : 'display:none;'}border:none;background:none;" onclick="Cart.clearSearch()" title="Effacer"><i class="fas fa-times"></i></button>
                    </div>
                </div>

                <div id="cartCatalogDropdown" class="article-picker-dropdown shadow-sm" style="display:${Cart._dropdownOpen ? 'block' : 'none'};position:relative;margin-top:6px;max-height:165px;min-width:100%;width:100%;border:1px solid #cbd5e1;"></div>
            </div>

            <div class="req-drawer-body">
                ${schemaBoxHtml}
                <!-- Dedicated ODT Shortcut Banner (Decoupled from generic cart) -->
                <div class="p-2 mb-3 rounded border d-flex align-items-center justify-content-between" style="background:rgba(56,189,248,0.06);border-color:rgba(56,189,248,0.25)!important;font-size:12px;">
                    <div>
                        <strong style="color:#38bdf8;"><i class="fas fa-truck-wrench me-1"></i> Panne Véhicule ou Intervention Mécanique ?</strong>
                        <div class="text-muted small">Utilisez l'Ordre de Travail (ODT) avec schéma CAD et historique PDR dédié</div>
                    </div>
                    <button type="button" class="btn btn-xs btn-primary fw-bold" onclick="Cart.closeDrawer(); if (typeof PlanTravailModule !== 'undefined') PlanTravailModule.openUserWorkPlanModal();">
                        <i class="fas fa-file-signature me-1"></i> Ouvrir ODT
                    </button>
                </div>

                ${itemsHtml}
                ${formHtml}
            </div>

            <div class="req-drawer-footer">
                ${footerHtml}
            </div>
        `;

        if (this._dropdownOpen) {
            this.renderCatalogResults();
        }

        // Refresh selected tray if PlanTravailModule exists
        if (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.updateSelectedTray) {
            setTimeout(() => {
                PlanTravailModule.updateSelectedTray();
                PlanTravailModule.refreshDiagramHighlights();
            }, 30);
        }
    },

    submitOrder: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const items = this.getItems();
        if (items.length === 0) {
            Utils.showNotification('Votre demande ne contient aucun article.', 'warning');
            return { success: false, reason: 'empty' };
        }

        const form = (e && e.target && (e.target.beneficiary || e.target.elements)) ? e.target : (e || {});
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : { id: 'u1', name: 'Utilisateur', qualite: 'Agent' };

        let ben = '';
        if (form.beneficiary && form.beneficiary.value !== undefined) ben = form.beneficiary.value;
        else if (e && e.beneficiary) ben = e.beneficiary;
        else if (currentUser && currentUser.name) ben = currentUser.name;
        else ben = 'Demandeur';
        ben = String(ben).trim();

        let dept = '';
        if (form.department && form.department.value !== undefined) dept = form.department.value;
        else if (form.service && form.service.value !== undefined) dept = form.service.value;
        else if (e && (e.department || e.service)) dept = e.department || e.service;
        else if (currentUser && currentUser.department) dept = currentUser.department;
        else dept = 'Direction Générale';
        dept = String(dept).trim();

        let matId = '';
        if (form.materialId && form.materialId.value !== undefined) matId = form.materialId.value;
        else if (e && e.materialId) matId = e.materialId;
        matId = matId ? String(matId).trim() : '';

        const fleet = DB.getFleet ? DB.getFleet() : [];
        const mat = matId ? fleet.find(f => f.id === matId) : null;

        let reason = '';
        if (form.reason && form.reason.value !== undefined) reason = form.reason.value;
        else if (form.observation && form.observation.value !== undefined) reason = form.observation.value;
        else if (form.motif && form.motif.value !== undefined) reason = form.motif.value;
        else if (e && (e.reason || e.observation || e.motif)) reason = e.reason || e.observation || e.motif;
        else reason = 'Dotation de matériel';
        reason = String(reason).trim();

        // Increment pre-order counter (DEM-YYYY-XXXX)
        if (!DB.data.counters) DB.data.counters = { decharge:1, pv:1, preorder:1, citerne:1 };
        const orderNum = (DB.data.counters.preorder = (DB.data.counters.preorder || 0) + 1);
        const orderRef = 'DEM-' + new Date().getFullYear() + '-' + String(orderNum).padStart(4, '0');

        const orderId = Utils.generateId();
        const orderRecord = {
            id: orderId,
            ref: orderRef,
            date: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            beneficiary: ben,
            department: dept,
            materialId: matId,
            materialName: mat ? mat.name : '',
            immatriculation: mat ? mat.immatriculation : '',
            reason: reason,
            status: 'En attente',
            items: items.map(i => ({
                articleId: i.articleId,
                code: i.code,
                designation: i.designation,
                unit: i.unit,
                requestedQty: Number(i.quantity),
                servedQty: 0,
                status: 'En attente'
            }))
        };

        // Automatically create a linked pending draft Décharge
        const dechNum = (DB.data.counters.decharge = (DB.data.counters.decharge || 0) + 1);
        const dechRef = 'DCH-' + new Date().getFullYear() + '-' + String(dechNum).padStart(3, '0');
        const dechargeId = Utils.generateId();

        const draftDecharge = {
            id: dechargeId,
            ref: dechRef,
            preOrderId: orderId,
            date: new Date().toISOString(),
            beneficiary: ben,
            service: dept,
            fromName: 'Magasinier Principal',
            qualite: currentUser.qualite || 'Demandeur',
            materialId: matId,
            immatriculation: mat ? mat.immatriculation : '',
            materialName: mat ? mat.name : '',
            materialFamily: mat ? mat.family : '',
            reason: reason,
            status: 'En attente',
            createdBy: currentUser.name,
            createdById: currentUser.id,
            items: items.map(i => ({ articleId: i.articleId, quantity: Number(i.quantity) })),
            lines: items.map(i => ({
                articleId: i.articleId,
                designation: i.designation,
                unit: i.unit,
                quantity: Number(i.quantity),
                servedQty: 0,
                inventoryCode: ''
            }))
        };

        orderRecord.dechargeId = dechargeId;

        // Automatically create linked Bon de Travail (Volet 1) if vehicle or schematic parts are selected
        let planRef = '';
        let planId = '';
        const hasSchemaItems = items.some(i => i.fromSchema);
        const affectedOrgans = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.selectedParts && (matId || hasSchemaItems)) ? Array.from(PlanTravailModule.selectedParts) : [];
        const wheelStates = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.wheelStates && (matId || hasSchemaItems)) ? { ...PlanTravailModule.wheelStates } : {};
        const wheelSubComponents = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.wheelSubComponents && (matId || hasSchemaItems)) ? JSON.parse(JSON.stringify(PlanTravailModule.wheelSubComponents)) : {};
        const vehicleType = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.currentVehicleType) ? PlanTravailModule.currentVehicleType : (this._selectedVehicleType || 'truck_heavy_4x2');

        if (matId || (hasSchemaItems && (affectedOrgans.length > 0 || Object.keys(wheelStates).length > 0))) {
            const planNum = (DB.data.counters.workPlan = (DB.data.counters.workPlan || 0) + 1);
            planRef = 'BT-' + new Date().getFullYear() + '-' + String(planNum).padStart(4, '0');
            planId = Utils.generateId();

            const workPlan = {
                id: planId,
                ref: planRef,
                preOrderId: orderId,
                preOrderRef: orderRef,
                dechargeId: dechargeId,
                dechargeRef: dechRef,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                vehicleType: vehicleType,
                materialId: matId,
                immatriculation: mat ? mat.immatriculation : (typeof PlanTravailModule !== 'undefined' ? PlanTravailModule.currentImmat : ''),
                brand: mat ? (mat.brand || mat.marque || mat.name) : '',
                model: mat ? (mat.model || mat.modele || mat.name) : '',
                vin: mat ? (mat.serialNumber || mat.numero_serie || mat.vin) : '',
                driverName: ben,
                requesterName: currentUser.name,
                service: dept,
                defectDescription: reason,
                workDone: 'Remplacement et révision des organes sélectionnés sur le schéma CAD.',
                typeIntervention: 'Reparation',
                status: 'En attente',
                affectedOrgans: affectedOrgans,
                wheelStates: wheelStates,
                wheelSubComponents: wheelSubComponents,
                partsReplaced: items.map(i => ({
                    designation: i.designation,
                    ref: i.code || i.articleId,
                    qty: Number(i.quantity),
                    obs: 'Issu de la demande ' + orderRef
                }))
            };

            if (!DB.data.workPlans) DB.data.workPlans = [];
            DB.data.workPlans.unshift(workPlan);

            orderRecord.workPlanId = planId;
            orderRecord.workPlanRef = planRef;
            orderRecord.vehicleType = vehicleType;
            orderRecord.affectedOrgans = affectedOrgans;
            orderRecord.wheelStates = wheelStates;
            orderRecord.wheelSubComponents = wheelSubComponents;

            draftDecharge.workPlanId = planId;
            draftDecharge.workPlanRef = planRef;
        }

        // Persist order & decharge
        if (!DB.data.preOrders) DB.data.preOrders = [];
        DB.data.preOrders.unshift(orderRecord);
        DB.addDecharge(draftDecharge);

        // Reset schematic selection state
        if (typeof PlanTravailModule !== 'undefined') {
            if (PlanTravailModule.selectedParts && PlanTravailModule.selectedParts.clear) PlanTravailModule.selectedParts.clear();
            PlanTravailModule.wheelStates = {};
            PlanTravailModule.wheelSubComponents = {};
            if (PlanTravailModule.updateSelectedTray) PlanTravailModule.updateSelectedTray();
        }

        // Audit log
        DB.addAuditLog({
            action: 'DEMANDE_MATERIEL',
            col: 'preOrders',
            itemId: orderId,
            details: `Demande ${orderRef} (${items.length} articles) transmise par ${currentUser.name} pour ${ben}${planRef ? ' [Liée au ' + planRef + ']' : ''}`,
            user: currentUser.name
        });

        // Notify Magasinier and Admin
        if (typeof Notify !== 'undefined') {
            Notify.add({
                title: 'Nouvelle Demande de Matériel',
                message: `${currentUser.name} a transmis la demande ${orderRef} avec ${items.length} article(s).${planRef ? ' Bon de Travail ' + planRef + ' généré.' : ''} Décharge ${dechRef} en attente.`,
                category: 'decharge',
                type: 'info',
                module: 'decharges'
            });
        }

        // Empty items
        this.saveItems([]);
        this.closeDrawer();
        if (typeof UI !== 'undefined' && UI.hideModal) UI.hideModal();
        UI.refresh();
        UI.showAlert(`✅ Demande <strong>${orderRef}</strong> transmise avec succès !${planRef ? ' Bon de Travail <strong>' + planRef + '</strong> et ' : ' '}Bon de décharge provisoire <strong>${dechRef}</strong> généré. <button class="btn btn-xs btn-light ms-2 fw-bold text-dark" onclick="Cart.showRequestPass('${orderId}')"><i class="fas fa-qrcode me-1"></i> Ouvrir le Pass QR</button> <button class="btn btn-xs btn-outline-light ms-1 fw-bold" onclick="App.loadModule('history', 'orders')"><i class="fas fa-clock-rotate-left me-1"></i> Historique</button>`, 'success');
        setTimeout(() => Cart.showRequestPass(orderId), 350);
        return { success: true, orderId: orderId, dechargeId: dechargeId, orderRef: orderRef, dechargeRef: dechRef, workPlanId: planId, workPlanRef: planRef };
    },

    showRequestPass: function(orderId) {
        const preOrders = DB.data.preOrders || [];
        const order = preOrders.find(p => p.id === orderId || p.ref === orderId);
        if (!order) {
            Utils.showNotification('Demande introuvable.', 'error');
            return;
        }

        const items = Array.isArray(order.items) ? order.items : [];
        const totalQty = items.reduce((s, i) => s + (Number(i.requestedQty || i.quantity) || 1), 0);
        const settings = DB.getSettings();
        const company = settings.company || { name: 'SPA DOUROUB ELDJAZAIR', address: 'Zone Industrielle, Alger', phone: '021 00 00 00' };

        const modalHtml = `
            <div class="p-2" id="printableRequestPass">
                <!-- Pass Header -->
                <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-primary px-2 py-1"><i class="fas fa-boxes-stacked me-1"></i> BON DE RETRAIT</span>${order.workPlanRef ? `<span class="badge bg-success px-2 py-1 ms-1"><i class="fas fa-screwdriver-wrench me-1"></i> ${Utils.escapeHTML(order.workPlanRef)}</span>` : ''}
                            <span class="badge bg-light text-dark border font-monospace fw-bold">${Utils.escapeHTML(order.ref)}</span>
                            <span class="badge bg-${order.status === 'Servie' ? 'success' : order.status === 'Partiellement servie' ? 'warning text-dark' : 'info'}">${order.status || 'En attente'}</span>
                        </div>
                        <h4 class="fw-bold mb-0 text-dark">${Utils.escapeHTML(company.name || 'SPA DOUROUB ELDJAZAIR')}</h4>
                        <small class="text-muted">Système Intégré de Gestion de Stock · Pass Numérique Sécurisé</small>
                    </div>
                    <div class="text-end">
                        <small class="text-muted d-block">Émis le</small>
                        <strong class="text-dark">${new Date(order.date).toLocaleDateString('fr-FR')} ${new Date(order.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</strong>
                    </div>
                </div>

                <!-- QR & Barcode Section -->
                <div class="card p-3 mb-3 bg-light border text-center">
                    <div class="row align-items-center">
                        <div class="col-md-5 d-flex flex-column align-items-center justify-content-center border-end">
                            <div id="passQrCodeContainer" class="p-2 bg-white border rounded shadow-sm mb-2" style="width:160px;height:160px;display:flex;align-items:center;justify-content:center;"></div>
                            <span class="badge bg-dark text-white font-monospace" style="font-size:11px;">SCANNER QR (SMARTPHONE)</span>
                        </div>
                        <div class="col-md-7 d-flex flex-column align-items-center justify-content-center">
                            <div class="bg-white p-2 border rounded shadow-sm w-100 mb-2" style="overflow-x:auto;display:flex;justify-content:center;">
                                <svg id="passBarcodeSvg"></svg>
                            </div>
                            <span class="badge bg-secondary font-monospace" style="font-size:11px;">CODE-BARRES 1D (DOUCHETTE LASER)</span>
                            <small class="text-muted mt-2" style="font-size:11px;">
                                <i class="fas fa-info-circle text-primary me-1"></i> Présentez ce pass au magasinier pour retrait immédiat
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <div class="border rounded p-2 bg-white h-100">
                            <small class="text-muted d-block" style="font-size:11px;">Demandeur / Bénéficiaire</small>
                            <strong class="text-dark">${Utils.escapeHTML(order.beneficiary || order.userName || 'Demandeur')}</strong>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="border rounded p-2 bg-white h-100">
                            <small class="text-muted d-block" style="font-size:11px;">Département / Service</small>
                            <strong class="text-dark">${Utils.escapeHTML(order.department || '-')}</strong>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="border rounded p-2 bg-white h-100">
                            <small class="text-muted d-block" style="font-size:11px;">Véhicule / Affectation</small>
                            <strong class="text-dark">${order.immatriculation ? `<span class="badge bg-dark me-1">${Utils.escapeHTML(order.immatriculation)}</span> ${Utils.escapeHTML(order.materialName || '')}` : 'Général / Non spécifié'}</strong>
                        </div>
                    </div>
                </div>

                <!-- Vehicle CAD Schematic Snapshot (if vehicle/work plan linked) -->
                ${(order.workPlanRef || order.materialId || (order.affectedOrgans && order.affectedOrgans.length > 0)) ? `
                <div class="card p-2 mb-3 bg-dark text-white border" style="border-radius:8px;">
                    <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                        <span class="small fw-bold text-info"><i class="fas fa-microchip me-1"></i> Blue-Print CAD Véhicule Lié (${Utils.escapeHTML(order.immatriculation || 'Flotte')})</span>
                        ${order.workPlanRef ? `<span class="badge bg-success font-monospace">${order.workPlanRef}</span>` : ''}
                    </div>
                    <div style="max-height:165px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                        ${(typeof PlanTravailModule !== 'undefined' && PlanTravailModule.generateVehicleSvg) ? PlanTravailModule.generateVehicleSvg(order.vehicleType || 'truck_heavy_4x2', order.affectedOrgans || [], order.wheelStates || {}, order.wheelSubComponents || {}) : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Articles Checklist Table with Mini Barcodes -->
                <div class="card mb-3 border">
                    <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <strong class="small text-uppercase"><i class="fas fa-clipboard-check text-primary me-1"></i> Pièces demandées (${items.length} références · ${totalQty} pièces)</strong>
                        <span class="badge bg-secondary small">Vérification comptoir</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th width="40" class="text-center">#</th>
                                    <th>Code & Barcode</th>
                                    <th>Désignation</th>
                                    <th class="text-center">Qté Demandée</th>
                                    <th class="text-center">Qté Servie</th>
                                    <th class="text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((it, idx) => `
                                <tr>
                                    <td class="text-center text-muted fw-bold">${idx + 1}</td>
                                    <td>
                                        <div class="d-flex flex-column">
                                            <strong class="font-monospace text-primary">${Utils.escapeHTML(it.code)}</strong>
                                            <svg id="passItemBc_${idx}" style="max-height:24px;max-width:110px;margin-top:2px;"></svg>
                                        </div>
                                    </td>
                                    <td><strong>${Utils.escapeHTML(it.designation)}</strong></td>
                                    <td class="text-center"><span class="badge bg-light text-dark border px-2 py-1 fs-6">${it.requestedQty || it.quantity || 1} ${Utils.escapeHTML(it.unit || 'U')}</span></td>
                                    <td class="text-center"><strong class="text-success">${it.servedQty || 0}</strong></td>
                                    <td class="text-center">
                                        <span class="badge bg-${it.status === 'Servie' ? 'success' : it.servedQty > 0 ? 'warning text-dark' : 'secondary'}">
                                            ${it.status || 'En attente'}
                                        </span>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Signatures Preview (For Print) -->
                <div class="d-none d-print-flex justify-content-between pt-4 mt-3 border-top">
                    <div class="text-center" style="width:200px;">
                        <small class="fw-bold">Signature Demandeur</small>
                        <div style="height:60px;border-bottom:1px dashed #999;"></div>
                    </div>
                    <div class="text-center" style="width:200px;">
                        <small class="fw-bold">Visa Magasinier / Sortie</small>
                        <div style="height:60px;border-bottom:1px dashed #999;"></div>
                    </div>
                </div>

                <!-- Footer Buttons -->
                <div class="d-flex justify-content-between align-items-center pt-2">
                    <button type="button" class="btn btn-outline-secondary" onclick="UI.hideModal();">Fermer</button>
                    <div class="d-flex gap-2 flex-wrap">
                        <button type="button" class="btn btn-outline-info" onclick="Cart.showOrderSchemaModal('${order.id}')" title="Voir le schéma CAD interactif">
                            <i class="fas fa-microchip me-1"></i> Schéma CAD
                        </button>
                        ${order.workPlanId ? `
                        <button type="button" class="btn btn-outline-success" onclick="PlanTravailModule.printPlan('${order.workPlanId}')" title="Imprimer le Bon de Travail">
                            <i class="fas fa-print me-1"></i> Volet 1 (Bon de Travail)
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="PlanTravailModule.printDechargeGds('${order.workPlanId}')" title="Imprimer le Bon de Décharge Magasin">
                            <i class="fas fa-truck-ramp-box me-1"></i> Volet 2 (Décharge GDS)
                        </button>
                        ` : ''}
                        <button type="button" class="btn btn-primary" onclick="Cart.printPassSlip('${order.id}')">
                            <i class="fas fa-print me-1"></i> Imprimer le Pass
                        </button>
                        ${(Auth.isAdmin() || Auth.isMag()) ? `
                        <button type="button" class="btn btn-success" onclick="UI.hideModal(); BarcodeScanner.openOrderFulfillment(DB.data.preOrders.find(p=>p.id==='${order.id}')); App.loadModule('barcodeScanner');">
                            <i class="fas fa-barcode me-1"></i> Flasher au Comptoir
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        UI.showModal(`Pass de Retrait Magasin — ${order.ref}`, modalHtml, 'modal-lg');

        // Render Barcodes & QR
        setTimeout(() => {
            // 1. QR Code
            const qrContainer = document.getElementById('passQrCodeContainer');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(qrContainer, {
                            text: order.ref,
                            width: 144,
                            height: 144,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.M : 0
                        });
                    } catch(e) {
                        qrContainer.innerHTML = `<img loading="lazy" src="https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(order.ref)}" alt="QR" style="width:144px;height:144px;">`;
                    }
                } else {
                    qrContainer.innerHTML = `<img loading="lazy" src="https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(order.ref)}" alt="QR" style="width:144px;height:144px;">`;
                }
            }

            // 2. Main Order Barcode (Code128)
            const mainBc = document.getElementById('passBarcodeSvg');
            if (mainBc && typeof JsBarcode !== 'undefined') {
                try {
                    JsBarcode(mainBc, order.ref, {
                        format: "CODE128",
                        width: 2,
                        height: 48,
                        displayValue: true,
                        fontSize: 13,
                        lineColor: "#0f172a"
                    });
                } catch(e) { console.warn(e); }
            }

            // 3. Mini Item Barcodes
            if (typeof JsBarcode !== 'undefined') {
                items.forEach((it, idx) => {
                    const el = document.getElementById(`passItemBc_${idx}`);
                    if (el && it.code) {
                        try {
                            JsBarcode(el, it.code, {
                                format: "CODE128",
                                width: 1.2,
                                height: 22,
                                displayValue: false,
                                margin: 0
                            });
                        } catch(e) { /* ignore */ }
                    }
                });
            }
        }, 120);
    },

    printPassSlip: function(orderId) {
        const order = (DB.data.preOrders || []).find(p => p.id === orderId || p.ref === orderId);
        if (!order) return;
        const printContent = document.getElementById('printableRequestPass');
        if (!printContent) return;

        const w = window.open('', '_blank', 'width=780,height=900');
        w.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bon de Retrait ${order.ref}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1e293b; }
                    @media print { .btn { display: none !important; } }
                </style>
            </head>
            <body onload="setTimeout(()=>{ window.print(); window.close(); }, 400)">
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        w.document.close();
    }
};

window.Stock = {
    _activeZoneFilter: '',
    _activeSiteFilter: '',
    render: function() {
        const articles = DB.getArticles();
        const settings = DB.getSettings();
        
        // Dynamic Stock Sites
        const sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : (settings.stockSites || []);
        const sitesList = sites.map(s => typeof s === 'object' ? (s.name || s.id) : s);
        const activeSite = Stock._activeSiteFilter || '';

        // Dynamic Stock Zones (filtered by active site)
        let rawZones;
        if (activeSite && typeof DB !== 'undefined' && DB.getSite) {
            const siteObj = DB.getSite(activeSite);
            rawZones = (siteObj && Array.isArray(siteObj.zones)) ? siteObj.zones : [];
        } else {
            rawZones = (typeof DB !== 'undefined' && DB.getZones) ? DB.getZones() : (settings.stockZones || []);
        }
        const zonesList = rawZones.map(z => typeof z === 'object' ? (z.name || z.id) : z);
        const activeZone = Stock._activeZoneFilter || '';

        // Filter articles by active site
        const siteFilteredArticles = activeSite
            ? articles.filter(a => (a.site || 'Dépôt Central') === activeSite)
            : articles;

        // Calculate count per zone (from site-filtered articles)
        const zoneCounts = {};
        zonesList.forEach(z => { zoneCounts[z] = 0; });
        siteFilteredArticles.forEach(a => {
            const az = a.zone || 'Zone A';
            zoneCounts[az] = (zoneCounts[az] || 0) + 1;
        });

        const getZoneDotClass = (z) => {
            const clean = String(z).toLowerCase();
            if (clean.includes('a')) return 'zone-dot-a';
            if (clean.includes('b')) return 'zone-dot-b';
            if (clean.includes('c')) return 'zone-dot-c';
            if (clean.includes('d')) return 'zone-dot-d';
            if (clean.includes('e')) return 'zone-dot-e';
            return 'zone-dot-default';
        };

        const getZoneBadgeClass = (z) => {
            const slug = String(z || 'Zone A').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            return `zone-badge zone-badge-${slug}`;
        };

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-boxes-stacked text-primary me-2"></i> Gestion du Stock</h2>
                    <p class="text-muted" style="margin:0;">Catalogue des articles, consultation en direct, demande de dotation et inventaire</p>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <button class="btn btn-sm btn-outline-success fw-bold" onclick="if(window.GdsScannerModule) GdsScannerModule.openModal();" title="Scanner GDS et Déduction Express"><i class="fas fa-qrcode me-1"></i> Scan GDS</button>
                    <button class="btn btn-sm btn-warning fw-bold text-dark" onclick="if(window.UI && UI.startStockTutorial) UI.startStockTutorial();" title="Lancer le Guide & Tutoriel Interactif Stock & CAD"><i class="fas fa-graduation-cap me-1"></i> 🎓 Guide & Tutoriel</button>
                    <button class="btn btn-sm btn-outline-success" id="btnStockExportExcel" onclick="Stock.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-sm ${Cart.getCount() > 0 ? 'btn-primary' : 'btn-outline-primary'}" onclick="Cart.openDrawer()"><i class="fas fa-clipboard-list me-1"></i> Ma Demande (<span id="stockHeaderCartCount">${Cart.getCount()}</span>)</button>
                    ${(Auth.isAdmin() || Auth.isMag()) ? `
                    <button class="btn btn-sm btn-outline-danger" id="btnStockBcImport" onclick="Stock.openBcImportModal()" title="Réceptionner un Bon de Commande en Stock"><i class="fas fa-boxes-packing me-1"></i> Réception BC</button>
                    <button class="btn btn-sm btn-outline-success" onclick="Stock.showImportExcel()"><i class="fas fa-file-import me-1"></i> Importer</button>
                    <button class="btn btn-sm btn-primary" id="btnStockAddArticle" onclick="Stock.showAddArticle()"><i class="fas fa-plus me-1"></i> Nouvel Article</button>
                    ` : ''}
                </div>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <!-- Site Filter Bar -->
                    ${('<div class="stock-sites-bar d-flex align-items-center flex-wrap gap-2 mb-2">'
                        + '<span class="fw-bold small text-muted me-1"><i class="fas fa-building me-1"></i>Site :</span>'
                        + '<button type="button" class="btn btn-sm site-pill ' + (!activeSite ? 'active' : '') + '" onclick="Stock.filterBySite(\'\')">'
                        + '<i class="fas fa-globe me-1"></i> Tous les Sites <span class="badge rounded-pill bg-light text-dark ms-1">' + articles.length + '</span>'
                        + '</button>'
                        + sitesList.map(function(sn) {
                            var isAct = (activeSite === sn);
                            var siteCount = articles.filter(function(a) { return (a.site || 'Dépôt Central') === sn; }).length;
                            var siteObj = sites.find(function(s) { return (s.name || s.id) === sn; });
                            var siteColor = (siteObj && siteObj.color) || '#2563eb';
                            return '<button type="button" class="btn btn-sm site-pill ' + (isAct ? 'active' : '') + '" style="' + (isAct ? 'background:'+siteColor+';color:#fff;border-color:'+siteColor : '') + '" onclick="Stock.filterBySite(\'' + Utils.escapeHTML(sn) + '\')">'
                                + '<i class="fas fa-warehouse me-1"></i> ' + Utils.escapeHTML(sn) + ' <span class="badge rounded-pill ' + (isAct ? 'bg-light text-dark' : 'bg-secondary') + ' ms-1">' + siteCount + '</span>'
                                + '</button>';
                        }).join('')
                        + ((Auth.isAdmin() || Auth.isMag()) ? '<button type="button" class="btn btn-sm btn-outline-info ms-auto" onclick="Stock.showManageSitesModal()" title="Gérer les Sites &amp; Zones"><i class="fas fa-sitemap me-1"></i> Gérer les Sites</button>' : '')
                        + '</div>')}
                    <!-- Interactive Zone Filter Bar -->
                    <div class="stock-zones-bar d-flex align-items-center flex-wrap gap-2 mb-3">
                        <button type="button" class="btn btn-sm zone-pill ${!activeZone ? 'active' : ''}" data-zone="" onclick="Stock.filterByZone('')">
                            <i class="fas fa-boxes-stacked me-1"></i> Toutes les Zones <span class="badge rounded-pill bg-light text-dark ms-1">${siteFilteredArticles.length}</span>
                        </button>
                        ${zonesList.map(z => {
                            const isAct = (activeZone === z);
                            const count = zoneCounts[z] || 0;
                            const dotClass = getZoneDotClass(z);
                            return `
                            <button type="button" class="btn btn-sm zone-pill ${isAct ? 'active' : ''}" data-zone="${Utils.escapeHTML(z)}" onclick="Stock.filterByZone('${Utils.escapeHTML(z)}')">
                                <span class="zone-dot ${dotClass}"></span> ${Utils.escapeHTML(z)} <span class="badge rounded-pill ${isAct ? 'bg-light text-dark' : 'bg-secondary'} ms-1">${count}</span>
                            </button>`;
                        }).join('')}
                        <button type="button" class="btn btn-sm btn-outline-primary ms-auto" onclick="Stock.showManageSitesModal()" title="Gérer les Sites & Zones">
                            <i class="fas fa-sitemap me-1"></i> Sites & Zones
                        </button>
                    </div>

                    <div class="row mb-3 g-2">
                        <div class="col-md-3">
                            <input type="text" id="stockSearch" class="form-control form-control-sm" placeholder="Rechercher (Code, Désignation...)" onkeyup="Stock.filterTable()">
                        </div>
                        <div class="col-md-2">
                            <select id="stockSiteFilter" class="form-select form-select-sm" onchange="Stock._activeSiteFilter = this.value; Stock.filterTable();">
                                <option value="">Tous les sites</option>
                                ${sitesList.map(s => `<option value="${Utils.escapeHTML(s)}"${(activeSite === s) ? ' selected' : ''}>${Utils.escapeHTML(s)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select id="stockZoneFilter" class="form-select" onchange="Stock.filterTable()">
                                <option value="">Toutes les Zones</option>
                                ${zonesList.map(z => `<option value="${Utils.escapeHTML(z)}" ${(activeZone === z) ? 'selected' : ''}>${Utils.escapeHTML(z)} (${zoneCounts[z] || 0})</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select id="stockCategoryFilter" class="form-select" onchange="Stock.filterTable()">
                                <option value="">Toutes les catégories</option>
                                ${settings.articleCategories.map(c => `<option value="${Utils.escapeHTML(c)}">${Utils.escapeHTML(c)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select id="stockSectionFilter" class="form-select" onchange="Stock.filterTable()">
                                <option value="">Toutes les sections</option>
                                ${settings.stockSections.map(s => `<option value="${Utils.escapeHTML(s.name)}">${Utils.escapeHTML(s.name)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-hover table-bordered align-middle" id="stockTable">
                            <thead class="table-light">
                                <tr>
                                    <th width="40"><input type="checkbox" id="selectAllStock" onchange="Stock.toggleAllSelection()"></th>
                                    <th>Code</th>
                                    <th>Désignation</th>
                                    <th>Catégorie</th>
                                    <th>Site</th>
                                    <th>Section</th>
                                    <th>Zone</th>
                                    <th>Qté</th>
                                    <th>Unité</th>
                                    <th>PU (DA)</th>
                                    <th>Total (DA)</th>
                                    <th>Seuil</th>
                                    <th>Statut</th>
                                    <th width="160">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${articles.map(a => {
                                    const isAlert = Number(a.quantity) < Number(a.minThreshold);
                                    const prixU = Number(a.price) || 0;
                                    const totalVal = Number(a.quantity) * prixU;
                                    return `
                                    <tr data-category="${Utils.escapeHTML(a.category || '')}" data-section="${Utils.escapeHTML(a.section || '')}" data-zone="${Utils.escapeHTML(a.zone || 'Zone A')}" data-site="${Utils.escapeHTML(a.site || 'Dépôt Central')}">
                                        <td><input type="checkbox" class="stock-select-cb" value="${a.id}"></td>
                                        <td><strong class="font-monospace">${Utils.escapeHTML(a.code)}</strong></td>
                                        <td>${Utils.escapeHTML(a.designation)}</td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(a.category)}</span></td>
                                        <td><span class="badge badge-site" style="background:#1d4ed8 !important; color:#ffffff !important; border:1px solid #1e40af !important; font-size:11px; font-weight:600; padding:4px 8px; display:inline-flex; align-items:center;"><i class="fas fa-warehouse me-1" style="color:#ffffff;"></i>${Utils.escapeHTML(a.site || 'Dépôt Central')}</span></td>
                                        <td>${Utils.escapeHTML(a.section || '-')}</td>
                                        <td><span class="${getZoneBadgeClass(a.zone || 'Zone A')}"><i class="fas fa-layer-group me-1"></i>${Utils.escapeHTML(a.zone || 'Zone A')}</span></td>
                                        <td><strong style="font-size:14px;color:${isAlert ? 'var(--danger,#dc2626)' : 'inherit'};">${a.quantity}</strong></td>
                                        <td><small class="text-muted">${Utils.escapeHTML(a.unit)}</small></td>
                                        <td>${prixU.toFixed(2)}</td>
                                        <td>${totalVal.toFixed(2)}</td>
                                        <td>${a.minThreshold}</td>
                                        <td><span class="badge bg-${isAlert ? 'danger' : 'success'}">${isAlert ? 'Alerte' : 'OK'}</span></td>
                                        <td>
                                            <div class="action-btns d-flex gap-1">
                                                <button class="act-btn act-view" onclick="Stock.showArticleDetail('${a.id}')" title="Détails"><i class="fas fa-eye"></i></button>
                                                ${(() => {
                                                    const inCart = (typeof Cart !== 'undefined') ? Cart.getItems().find(i => i.articleId === a.id) : null;
                                                    return inCart
                                                        ? `<button id="stockReqBtn_${a.id}" class="btn btn-xs btn-primary fw-bold" onclick="Cart.addItem('${a.id}')" title="Déjà dans votre demande (+1)"><i class="fas fa-check me-1"></i> Demandé (${inCart.quantity}) +</button>`
                                                        : `<button id="stockReqBtn_${a.id}" class="btn btn-xs btn-outline-primary" onclick="Cart.addItem('${a.id}')" title="Ajouter à la Demande"><i class="fas fa-plus-circle me-1"></i> Demander</button>`;
                                                })()}
                                                ${(Auth.isAdmin() || Auth.isMag()) ? `
                                                <button class="act-btn act-add btn-add-stock" onclick="Stock.addStock('${a.id}')" title="Entrée"><i class="fas fa-plus"></i></button>
                                                <button class="act-btn act-remove btn-remove-stock" onclick="Stock.removeStock('${a.id}')" title="Sortie"><i class="fas fa-minus"></i></button>
                                                <button class="act-btn" style="color:#6366f1;" onclick="Stock.showAdjustQuantity('${a.id}')" title="Ajuster Quantité (Justification Obligatoire)"><i class="fas fa-sliders-h"></i></button>
                                                <button class="act-btn act-edit" onclick="Stock.showEditArticle('${a.id}')" title="Modifier"><i class="fas fa-pen"></i></button>
                                                <button class="act-btn act-delete" onclick="Stock.deleteArticle('${a.id}')" title="Supprimer"><i class="fas fa-trash-can"></i></button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div id="batchActions" class="mt-3 p-2 bg-light border rounded d-flex align-items-center gap-2 flex-wrap" style="display:none;">
                        <button class="btn btn-sm btn-secondary" onclick="Stock.generateBatchBarcodes()"><i class="fas fa-barcode me-1"></i> Générer Code-barres (Sélection)</button>
                        <div class="d-inline-flex align-items-center gap-2 ms-2">
                            <select id="batchZoneSelect" class="form-select form-select-sm" style="width:150px;">
                                ${zonesList.map(z => `<option value="${Utils.escapeHTML(z)}">${Utils.escapeHTML(z)}</option>`).join('')}
                            </select>
                            <button class="btn btn-sm btn-outline-primary fw-semibold" onclick="Stock.batchSetZone(document.getElementById('batchZoneSelect').value)"><i class="fas fa-arrows-turn-to-dots me-1"></i> Déplacer vers Zone</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    filterTable: function() {
        var search = (document.getElementById('stockSearch') ? document.getElementById('stockSearch').value : '').toLowerCase();
        var cat = document.getElementById('stockCategoryFilter') ? document.getElementById('stockCategoryFilter').value : '';
        var sec = document.getElementById('stockSectionFilter') ? document.getElementById('stockSectionFilter').value : '';
        var zoneEl = document.getElementById('stockZoneFilter');
        var zone = (zoneEl ? zoneEl.value : (Stock._activeZoneFilter || ''));
        var siteEl = document.getElementById('stockSiteFilter');
        var site = siteEl ? siteEl.value : (Stock._activeSiteFilter || '');

        var rows = document.querySelectorAll('#stockTable tbody tr');
        rows.forEach(function(row) {
            var text = row.innerText.toLowerCase();
            var rCat = row.getAttribute('data-category') || '';
            var rSec = row.getAttribute('data-section') || '';
            var rZone = row.getAttribute('data-zone') || 'Zone A';
            var rSite = row.getAttribute('data-site') || 'Dépôt Central';

            var matchSearch = !search || text.includes(search);
            var matchCat = cat === "" || rCat === cat;
            var matchSec = sec === "" || rSec === sec;
            var matchZone = zone === "" || rZone === zone;
            var matchSite = site === "" || rSite === site;

            row.style.display = (matchSearch && matchCat && matchSec && matchZone && matchSite) ? '' : 'none';
        });
    },
    filterBySite: function(siteName) {
        Stock._activeSiteFilter = siteName || '';
        Stock._activeZoneFilter = '';
        var siteSelect = document.getElementById('stockSiteFilter');
        if (siteSelect) siteSelect.value = Stock._activeSiteFilter;
        if (window.App && App.loadModule) App.loadModule('stock');
    },
    filterByZone: function(zoneName) {
        Stock._activeZoneFilter = zoneName || '';
        const select = document.getElementById('stockZoneFilter');
        if (select) {
            select.value = Stock._activeZoneFilter;
        }
        document.querySelectorAll('.zone-pill').forEach(btn => {
            const bz = btn.getAttribute('data-zone') || '';
            if (bz === Stock._activeZoneFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        Stock.filterTable();
    },
    batchSetZone: function(targetZone) {
        if (!targetZone) {
            const select = document.getElementById('batchZoneSelect');
            targetZone = select ? select.value : '';
        }
        if (!targetZone) {
            UI.showAlert('Veuillez sélectionner une zone cible.', 'warning');
            return;
        }
        let checked = Array.from(document.querySelectorAll('.stock-select-cb:checked')).map(cb => cb.value);
        if (checked.length === 0 && Stock.selectedArticles && Stock.selectedArticles.size > 0) {
            checked = Array.from(Stock.selectedArticles);
        }
        if (checked.length === 0) {
            UI.showAlert('Aucun article sélectionné.', 'warning');
            return;
        }
        const articles = DB.getArticles();
        let updatedCount = 0;
        checked.forEach(id => {
            const art = articles.find(a => a.id === id);
            if (art) {
                art.zone = targetZone;
                if (DB.updateArticle) DB.updateArticle(art);
                updatedCount++;
            }
        });
        if (DB.save) DB.save();
        UI.showAlert(`${updatedCount} article(s) déplacé(s) vers ${targetZone} avec succès.`, 'success');
        App.loadModule('stock');
    },
    showManageSitesModal: function() {
        var sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : [];
        var articles = DB.getArticles ? DB.getArticles() : [];

        var sitesHtml = sites.map(function(site) {
            var zones = Array.isArray(site.zones) ? site.zones : [];
            var siteArticleCount = articles.filter(function(a) { return (a.site || 'Dépôt Central') === site.name; }).length;
            var zonesRows = zones.map(function(z) {
                var zCount = articles.filter(function(a) { return (a.site || 'Dépôt Central') === site.name && (a.zone || 'Zone A') === z.name; }).length;
                return '<tr>'
                    + '<td><span class="badge" style="background:' + (z.color || '#2563eb') + ';color:#fff;font-size:11px;"><i class="fas fa-layer-group me-1"></i>' + Utils.escapeHTML(z.name) + '</span></td>'
                    + '<td><strong>' + zCount + '</strong> article(s)</td>'
                    + '<td>' + Utils.escapeHTML(z.description || '-') + '</td>'
                    + '<td>' + (site.isDefault && zones.length <= 1 ? '' : '<button class="btn btn-xs btn-outline-danger" onclick="Stock.removeZoneFromSite(\'' + site.id + '\', \'' + z.id + '\')"><i class="fas fa-trash-alt"></i></button>') + '</td>'
                    + '</tr>';
            }).join('');

            return '<div class="card mb-3 border-' + (site.isDefault ? 'primary' : 'secondary') + '">'
                + '<div class="card-header d-flex align-items-center justify-content-between py-2" style="background:' + (site.color || '#2563eb') + '11;">'
                + '<div><i class="fas fa-warehouse me-2" style="color:' + (site.color || '#2563eb') + '"></i><strong>' + Utils.escapeHTML(site.name) + '</strong>'
                + ' <span class="badge bg-light text-dark ms-2">' + siteArticleCount + ' articles</span>'
                + (site.isDefault ? ' <span class="badge bg-primary ms-1">Par défaut</span>' : '') + '</div>'
                + '<div class="d-flex gap-1">'
                + (!site.isDefault ? '<button class="btn btn-xs btn-outline-danger" onclick="Stock.deleteSiteAction(\'' + site.id + '\')"><i class="fas fa-trash-alt me-1"></i>Supprimer</button>' : '') + '</div>'
                + '</div>'
                + '<div class="card-body p-2">'
                + '<table class="table table-sm table-hover align-middle mb-2"><thead class="table-light"><tr><th>Zone</th><th>Articles</th><th>Description</th><th width="60"></th></tr></thead><tbody>'
                + zonesRows
                + '</tbody></table>'
                + '<form onsubmit="Stock.addZoneToSiteAction(event, \'' + site.id + '\')" class="d-flex gap-2 align-items-center">'
                + '<input type="text" class="form-control form-control-sm" placeholder="Nom de la zone (ex: Zone F, Hangar 2...)" required style="max-width:250px;" id="newZoneInput_' + site.id + '">'
                + '<input type="text" class="form-control form-control-sm" placeholder="Description (optionnel)" style="max-width:250px;" id="newZoneDesc_' + site.id + '">'
                + '<button class="btn btn-sm btn-primary" type="submit"><i class="fas fa-plus me-1"></i>Zone</button>'
                + '</form></div></div>';
        }).join('');

        var html = '<div class="mb-3">'
            + '<p class="text-muted small mb-3">Chaque site représente un emplacement physique (dépôt, magasin, entrepôt). Chaque site contient ses propres zones de rangement.</p>'
            + sitesHtml
            + '<hr><h6 class="fw-bold"><i class="fas fa-plus-circle me-1 text-success"></i> Ajouter un nouveau Site</h6>'
            + '<form onsubmit="Stock.addNewSiteAction(event)" class="row g-2 align-items-end">'
            + '<div class="col-md-3"><label class="form-label small fw-bold">Nom du Site</label><input type="text" id="newSiteNameInput" class="form-control form-control-sm" placeholder="Ex: Magasin Nord" required></div>'
            + '<div class="col-md-2"><label class="form-label small fw-bold">Code</label><input type="text" id="newSiteCodeInput" class="form-control form-control-sm" placeholder="Ex: MN" maxlength="4"></div>'
            + '<div class="col-md-3"><label class="form-label small fw-bold">Adresse</label><input type="text" id="newSiteAddressInput" class="form-control form-control-sm" placeholder="Optionnel"></div>'
            + '<div class="col-md-2"><label class="form-label small fw-bold">Couleur</label><input type="color" id="newSiteColorInput" class="form-control form-control-sm form-control-color" value="#059669"></div>'
            + '<div class="col-md-2"><button class="btn btn-sm btn-success w-100" type="submit"><i class="fas fa-plus me-1"></i>Créer le Site</button></div>'
            + '</form></div>';

        UI.showModal('Configuration des Sites & Zones', html, '', 'lg');
    },
    addNewSiteAction: function(e) {
        e.preventDefault();
        var name = (document.getElementById('newSiteNameInput') ? document.getElementById('newSiteNameInput').value : '').trim();
        var code = (document.getElementById('newSiteCodeInput') ? document.getElementById('newSiteCodeInput').value : '').trim();
        var address = (document.getElementById('newSiteAddressInput') ? document.getElementById('newSiteAddressInput').value : '').trim();
        var color = (document.getElementById('newSiteColorInput') ? document.getElementById('newSiteColorInput').value : '#2563eb');
        if (!name) return;
        if (DB.addSite) {
            DB.addSite({ name: name, code: code, address: address, color: color });
            UI.showAlert('Site "' + name + '" créé avec succès.', 'success');
            Stock.showManageSitesModal();
            if (window.App && App.loadModule) App.loadModule('stock');
        }
    },
    deleteSiteAction: function(siteId) {
        if (!confirm('Supprimer ce site ? Tous ses articles seront réaffectés au site par défaut.')) return;
        var defaultSite = DB.getDefaultSite ? DB.getDefaultSite() : null;
        var defaultName = defaultSite ? defaultSite.name : 'Dépôt Central';
        var site = DB.getSite ? DB.getSite(siteId) : null;
        if (site && DB.deleteSite) {
            var articles = DB.getArticles ? DB.getArticles() : [];
            articles.forEach(function(a) {
                if (a.site === site.name) {
                    a.site = defaultName;
                    a.zone = 'Zone A';
                    if (DB.updateArticle) DB.updateArticle(a);
                }
            });
            DB.deleteSite(siteId);
            if (DB.save) DB.save();
            UI.showAlert('Site supprimé. Articles réaffectés à "' + defaultName + '".', 'success');
            Stock.showManageSitesModal();
            if (window.App && App.loadModule) App.loadModule('stock');
        }
    },
    addZoneToSiteAction: function(e, siteId) {
        e.preventDefault();
        var input = document.getElementById('newZoneInput_' + siteId);
        var descInput = document.getElementById('newZoneDesc_' + siteId);
        var name = (input ? input.value : '').trim();
        var desc = (descInput ? descInput.value : '').trim();
        if (!name) return;
        if (DB.addZoneToSite) {
            DB.addZoneToSite(siteId, { name: name, description: desc });
            UI.showAlert('Zone "' + name + '" ajoutée.', 'success');
            Stock.showManageSitesModal();
            if (window.App && App.loadModule) App.loadModule('stock');
        }
    },
    removeZoneFromSite: function(siteId, zoneId) {
        if (!confirm('Supprimer cette zone ? Les articles seront réaffectés à Zone A.')) return;
        var site = DB.getSite ? DB.getSite(siteId) : null;
        if (site && DB.deleteZoneFromSite) {
            var zone = (site.zones || []).find(function(z) { return z.id === zoneId; });
            var zoneName = zone ? zone.name : '';
            var articles = DB.getArticles ? DB.getArticles() : [];
            articles.forEach(function(a) {
                if (a.site === site.name && a.zone === zoneName) {
                    a.zone = 'Zone A';
                    if (DB.updateArticle) DB.updateArticle(a);
                }
            });
            DB.deleteZoneFromSite(siteId, zoneId);
            if (DB.save) DB.save();
            UI.showAlert('Zone supprimée.', 'success');
            Stock.showManageSitesModal();
            if (window.App && App.loadModule) App.loadModule('stock');
        }
    },
    showManageZonesModal: function() {
        const settings = DB.getSettings ? DB.getSettings() : {};
        const rawZones = (typeof DB !== 'undefined' && DB.getZones) ? DB.getZones() : (settings.stockZones || ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
        const zonesList = rawZones.map(z => typeof z === 'object' ? (z.name || z.id) : z);
        const articles = DB.getArticles ? DB.getArticles() : [];
        
        let html = `
            <div class="mb-3">
                <p class="text-muted small">Les zones permettent de compartimenter l'entrepôt (rayonnages, hangars, zones sécurisées, pièces lourdes, etc.).</p>
                <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Zone</th>
                                <th>Articles affectés</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${zonesList.map(z => {
                                const count = articles.filter(a => (a.zone || 'Zone A') === z).length;
                                const slug = z.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                                return `
                                <tr>
                                    <td><span class="zone-badge zone-badge-${slug}"><i class="fas fa-layer-group me-1"></i>${Utils.escapeHTML(z)}</span></td>
                                    <td><strong>${count}</strong> article(s)</td>
                                    <td>
                                        <button class="btn btn-xs btn-outline-primary" onclick="UI.hideModal(); Stock.filterByZone('${Utils.escapeHTML(z)}');" title="Filtrer sur cette zone"><i class="fas fa-filter me-1"></i> Filtrer</button>
                                        ${!['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'].includes(z) ? `
                                        <button class="btn btn-xs btn-outline-danger ms-1" onclick="Stock.deleteZone('${Utils.escapeHTML(z)}')" title="Supprimer la zone"><i class="fas fa-trash-alt"></i></button>
                                        ` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <form onsubmit="Stock.addNewZone(event)" class="mt-3 p-3 bg-light border rounded">
                    <label class="form-label fw-bold small"><i class="fas fa-plus-circle me-1 text-primary"></i> Ajouter une nouvelle Zone</label>
                    <div class="input-group input-group-sm">
                        <input type="text" id="newZoneNameInput" class="form-control" placeholder="Ex: Zone F, Hangar 2, Magasin Central..." required>
                        <button class="btn btn-primary" type="submit"><i class="fas fa-plus"></i> Créer la Zone</button>
                    </div>
                </form>
            </div>
        `;
        UI.showModal('Configuration des Zones de Stock', html, '', 'md');
    },
    addNewZone: function(e) {
        e.preventDefault();
        const input = document.getElementById('newZoneNameInput');
        const val = (input?.value || '').trim();
        if (!val) return;
        const settings = DB.getSettings ? DB.getSettings() : {};
        if (!settings.stockZones) {
            settings.stockZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
        }
        if (DB.addZone) {
            DB.addZone({ name: val, code: val.replace(/[^A-Za-z0-9]/g, '').slice(-1) || 'X', description: val });
            UI.showAlert(`Zone "${val}" ajoutée avec succès.`, 'success');
            Stock.showManageZonesModal();
            if (window.App && App.loadModule) App.loadModule('stock');
        } else if (!settings.stockZones.includes(val)) {
            settings.stockZones.push(val);
            if (DB.updateSettings) DB.updateSettings({ stockZones: settings.stockZones });
            else if (DB.save) DB.save();
            UI.showAlert(`Zone "${val}" ajoutée avec succès.`, 'success');
            Stock.showManageZonesModal();
        } else {
            UI.showAlert(`La zone "${val}" existe déjà.`, 'warning');
        }
    },
    deleteZone: function(zoneName) {
        if (!confirm(`Supprimer la zone "${zoneName}" ? Les articles existants seront réaffectés à la Zone A.`)) return;
        if (DB.deleteZone) {
            DB.deleteZone(zoneName);
        }
        const settings = DB.getSettings ? DB.getSettings() : {};
        if (Array.isArray(settings.stockZones)) {
            settings.stockZones = settings.stockZones.filter(z => (typeof z === 'object' ? z.name : z) !== zoneName && (typeof z === 'object' ? z.id : z) !== zoneName);
            if (DB.updateSettings) DB.updateSettings({ stockZones: settings.stockZones });
        }
        // Reassign affected articles to Zone A
        const articles = DB.getArticles ? DB.getArticles() : [];
        articles.forEach(a => {
            if (a.zone === zoneName) {
                a.zone = 'Zone A';
                if (DB.updateArticle) DB.updateArticle(a);
            }
        });
        if (DB.save) DB.save();
        UI.showAlert(`Zone "${zoneName}" supprimée.`, 'success');
        Stock.showManageZonesModal();
        if (window.App && App.loadModule) App.loadModule('stock');
    },
    toggleAllSelection: function() {
        const selectAll = document.getElementById('selectAllStock').checked;
        const checkboxes = document.querySelectorAll('.stock-select-cb');
        checkboxes.forEach(cb => cb.checked = selectAll);
        Stock.checkBatchActions();
    },
    checkBatchActions: function() {
        const selected = document.querySelectorAll('.stock-select-cb:checked').length;
        document.getElementById('batchActions').style.display = selected > 0 ? 'block' : 'none';
        
        // Add event listeners to checkboxes dynamically if not already added to trigger this function
        document.querySelectorAll('.stock-select-cb').forEach(cb => {
            cb.onchange = Stock.checkBatchActions;
        });
    },
    showAddArticle: function(prefill = null) {
        const settings = DB.getSettings();
        const rawZones = (typeof DB !== 'undefined' && DB.getZones) ? DB.getZones() : (settings.stockZones || ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
        const zonesList = (rawZones && rawZones.length > 0) ? rawZones : ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
        const firstCat = (prefill && prefill.category) ? prefill.category : (settings.articleCategories[0] || 'Pièces de rechange');
        const firstFam = (prefill && prefill.family) ? prefill.family : '';
        const initCode = (prefill && prefill.code) ? prefill.code : DB.generateArticleCode(firstCat, firstFam);
        const existingFamilies = [...new Set((DB.getArticles ? DB.getArticles() : []).map(a => a.family).filter(Boolean))];
        const defaultFamilies = ['Filtration', 'Freinage', 'Suspension', 'Moteur', 'Transmission', 'Electricité', 'Carrosserie', 'Pneumatique', 'Climatisation', 'Outillage', 'Consommables', 'Fournitures bureau'];
        const allFamilies = [...new Set([...existingFamilies, ...defaultFamilies])].sort((a,b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        const html = `
            <form id="addArticleForm" onsubmit="Stock.saveArticle(event)">
                ${(prefill && (prefill.bcId || prefill.sourceBcId)) ? `<input type="hidden" name="sourceBcId" value="${Utils.escapeHTML(prefill.bcId || prefill.sourceBcId)}">` : ''}
                ${(prefill && prefill.bcRef) ? `<input type="hidden" name="sourceBcRef" value="${Utils.escapeHTML(prefill.bcRef)}">` : ''}
                <div class="mb-3 p-3 rounded" style="background: linear-gradient(135deg, rgba(136,19,55,0.06), rgba(37,99,235,0.06)); border: 1px dashed rgba(136,19,55,0.25);">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                            <strong style="color:var(--gruna, #881337);"><i class="fas fa-file-invoice-dollar me-2"></i>Entrée depuis un Bon de Commande (BC)</strong>
                            <div class="small text-muted">Pré-remplir l'article ou réceptionner la marchandise directement depuis Approvisionnement</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-primary" onclick="Stock.openBcImportModal()" style="background:var(--gruna, #881337);border-color:var(--gruna, #881337);font-weight:600;">
                            <i class="fas fa-file-import me-1"></i> 📥 Importer depuis un BC
                        </button>
                    </div>
                </div>
                ${(prefill && prefill.bcRef) ? `
                <div class="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between" style="font-size:13px;">
                    <span><i class="fas fa-link me-1"></i> Données importées depuis le BC <strong>${Utils.escapeHTML(prefill.bcRef)}</strong> ${prefill.supplier ? `&bull; Fournisseur: ${Utils.escapeHTML(prefill.supplier)}` : ''}</span>
                    <span class="badge bg-primary">Source: Bon de Commande</span>
                </div>` : ''}
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>Catégorie *</label>
                        <select name="category" class="form-select" required id="articleCategorySelect" onchange="Stock.autoGenerateCode(this.value, document.getElementById('articleFamilyInput')?.value)">
                            ${settings.articleCategories.map(c => `<option value="${Utils.escapeHTML(c)}" ${(prefill && prefill.category === c) ? 'selected' : ''}>${Utils.escapeHTML(c)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Code / Référence * <small class="text-muted">(auto-généré)</small></label>
                        <div class="d-flex" style="gap:0.5rem;">
                            <input type="text" name="code" id="articleCodeInput" class="form-control" required value="${initCode}">
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="Stock.autoGenerateCode()" title="Regénérer le code" style="white-space:nowrap;">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label>Désignation *</label>
                        <input type="text" name="designation" class="form-control" required placeholder="Nom de l'article" value="${(prefill && prefill.designation) ? Utils.escapeHTML(prefill.designation) : ''}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Famille</label>
                        <input type="text" name="family" id="articleFamilyInput" list="articleFamiliesDatalist" class="form-control" placeholder="Ex: Filtration, Freinage, Moteur, Pneumatique..." value="${(prefill && prefill.family) ? Utils.escapeHTML(prefill.family) : ''}" oninput="Stock.autoGenerateCode(document.getElementById('articleCategorySelect')?.value, this.value)">
                        <datalist id="articleFamiliesDatalist">
                            ${allFamilies.map(f => `<option value="${Utils.escapeHTML(f)}">`).join('')}
                        </datalist>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Prix Unitaire (DA)</label>
                        <input type="number" name="price" class="form-control" min="0" step="0.01" placeholder="0.00" value="${(prefill && prefill.price !== undefined) ? prefill.price : ''}">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label>Quantité Initiale *</label>
                        <input type="number" name="quantity" class="form-control" required min="0" step="0.01" value="${(prefill && prefill.quantity !== undefined) ? prefill.quantity : ''}">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label>Unité *</label>
                        <select name="unit" class="form-select" required>
                            ${settings.units.map(u => `<option value="${Utils.escapeHTML(u)}" ${(prefill && prefill.unit === u) ? 'selected' : ''}>${Utils.escapeHTML(u)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label style="color:var(--color-warning,#ED6C02);font-weight:700;">⚠️ Seuil d'alerte *</label>
                        <input type="number" name="minThreshold" class="form-control" required min="0" step="0.01" placeholder="Qté min avant alerte" style="border-color:var(--color-warning,#ED6C02);">
                        <small class="text-muted">Alerte quand le stock descend sous cette valeur</small>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="fw-bold"><i class="fas fa-building text-info me-1"></i> Site *</label>
                        <select name="site" id="addArticleSiteSelect" class="form-select" required onchange="Stock.onSiteChangeForZone(this.value)">
                            ${(typeof DB !== 'undefined' && DB.getSites ? DB.getSites() : []).map(function(s) {
                                var sel = s.isDefault ? ' selected' : '';
                                return '<option value="' + Utils.escapeHTML(s.name) + '"' + sel + '>' + Utils.escapeHTML(s.name) + '</option>';
                            }).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="fw-bold"><i class="fas fa-layer-group text-primary me-1"></i> Zone de Stockage *</label>
                        <select name="zone" id="addArticleZoneSelect" class="form-select" required>
                            ${(function() {
                                var sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : [];
                                var defSite = sites.find(function(s) { return s.isDefault; }) || sites[0];
                                var zones = defSite ? (defSite.zones || []) : zonesList;
                                return zones.map(function(z) {
                                    var zName = typeof z === 'object' ? (z.name || z.id) : z;
                                    var zDesc = typeof z === 'object' && z.description ? ' (' + z.description + ')' : '';
                                    return '<option value="' + Utils.escapeHTML(zName) + '">' + Utils.escapeHTML(zName) + Utils.escapeHTML(zDesc) + '</option>';
                                }).join('');
                            })()}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Section (Emplacement)</label>
                        <select name="section" class="form-select">
                            <option value="">Aucune</option>
                            ${settings.stockSections.map(s => `<option value="${Utils.escapeHTML(s.name)}">${Utils.escapeHTML(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label><i class="fas fa-barcode"></i> Code-barres / QR Code</label>
                        <div class="d-flex" style="gap:0.5rem;">
                            <input type="text" name="barcode" id="articleBarcodeInput" class="form-control font-monospace" placeholder="Scannez ou tapez le code" value="${(prefill && prefill.barcode) ? Utils.escapeHTML(prefill.barcode) : ''}">
                            <button type="button" class="btn btn-outline-primary" onclick="Stock.scanBarcode()" title="Scanner avec la caméra" style="white-space:nowrap;">
                                <i class="fas fa-camera"></i> Caméra
                            </button>
                            <label class="btn btn-outline-secondary" title="Charger une image de code-barres depuis le PC" style="white-space:nowrap;margin:0;cursor:pointer;">
                                <i class="fas fa-image"></i> Image
                                <input type="file" accept="image/*" style="display:none;" onchange="Stock.scanBarcodeFromFile(event)">
                            </label>
                        </div>
                        <div id="articleScannerContainer" style="display:none;margin-top:8px;">
                            <div id="articleScannerReader" style="width:100%;min-height:250px;"></div>
                            <button type="button" class="btn btn-sm btn-danger mt-1" onclick="Stock.stopScanBarcode()"><i class="fas fa-times"></i> Fermer le scanner</button>
                        </div>
                    </div>
                    <div class="col-12 mb-3">
                        <label><i class="fas fa-image"></i> Photo de l'article</label>
                        <input type="file" accept="image/*" capture="environment" class="form-control" onchange="Stock.handleImageUpload(event)">
                        <input type="hidden" name="image" id="articleImageData">
                        <div id="articleImagePreview" style="margin-top:8px;"></div>
                    </div>
                    <div class="col-12 mb-3">
                        <label>Notes</label>
                        <textarea name="notes" class="form-control" rows="2">${(prefill && prefill.notes) ? Utils.escapeHTML(prefill.notes) : ''}</textarea>
                    </div>
                </div>
                <div class="text-end">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
                </div>
            </form>
        `;
        UI.showModal('Ajouter un Article', html, '', 'lg');
    },
    onSiteChangeForZone: function(siteId) {
        var zoneSelect = document.getElementById('addArticleZoneSelect');
        if (!zoneSelect) return;
        var sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : [];
        var site = sites.find(function(s) { return s.id === siteId || s.name === siteId; });
        var zones = site ? (site.zones || []) : [];
        var opts = '';
        for (var i = 0; i < zones.length; i++) {
            var z = zones[i];
            var zName = typeof z === 'object' ? (z.name || z.id) : z;
            var zDesc = typeof z === 'object' && z.description ? ' (' + z.description + ')' : '';
            opts += '<option value="' + Utils.escapeHTML(zName) + '">' + Utils.escapeHTML(zName) + Utils.escapeHTML(zDesc) + '</option>';
        }
        zoneSelect.innerHTML = opts;
    },
    saveArticle: function(e, id = null) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const sourceBcId = formData.get('sourceBcId');
        const sourceBcRef = formData.get('sourceBcRef');
        const article = {
            code: formData.get('code'),
            designation: formData.get('designation'),
            category: formData.get('category'),
            family: formData.get('family'),
            quantity: Number(formData.get('quantity')),
            unit: formData.get('unit'),
            minThreshold: Number(formData.get('minThreshold')),
            zone: formData.get('zone') || (id ? (DB.getArticles().find(a => a.id === id)?.zone || 'Zone A') : 'Zone A'),
            site: formData.get('site') || (id ? ((DB.getArticles().find(function(a) { return a.id === id; }) || {}).site || '') : ''),
            section: formData.get('section'),
            barcode: formData.get('barcode'),
            image: formData.get('image'),
            notes: formData.get('notes'),
            price: Number(formData.get('price')) || 0
        };
        
        let oldQty = 0;
        if (id) {
            article.id = id;
            const existing = DB.getArticles().find(a => a.id === id);
            oldQty = existing ? existing.quantity : 0;
            DB.updateArticle(article);
        } else {
            // Check for duplicate designation
            const allArticles = DB.getArticles();
            const lowerDesig = article.designation.toLowerCase().trim();
            const duplicate = allArticles.find(a => a.designation.toLowerCase().trim() === lowerDesig);
            
            if (duplicate) {
                if (confirm(`L'article "${duplicate.designation}" existe déjà en stock avec une quantité de ${duplicate.quantity} ${duplicate.unit}. Voulez-vous simplement ajouter la nouvelle quantité (${article.quantity}) à cet article existant ?`)) {
                    if (article.quantity > 0) {
                        DB.addStock(duplicate.id, article.quantity, 'Entrée', sourceBcRef ? ('Réception ' + sourceBcRef) : 'Stock ajouté (fusion auto)', DB.getCurrentUser().name, sourceBcRef || 'AJOUT');
                        if (sourceBcId) {
                            if (window.SuiviBcBridge && typeof window.SuiviBcBridge.ingestBcIntoStock === 'function') {
                                try {
                                    window.SuiviBcBridge.ingestBcIntoStock(sourceBcId, null, {
                                        mode: 'increment_existing',
                                        targetArticleId: duplicate.id,
                                        quantity: article.quantity
                                    });
                                } catch(e) {}
                            }
                            if (typeof Stock._markBcIngested === 'function') Stock._markBcIngested(sourceBcId);
                        }
                        UI.hideModal();
                        UI.refresh();
                        UI.showAlert('Stock ajouté à l\'article existant avec succès.' + (sourceBcRef ? ' (Depuis ' + sourceBcRef + ')' : ''), 'success');
                    } else {
                        UI.hideModal();
                    }
                    return;
                }
            }

            article.id = Utils.generateId();
            DB.addArticle(article);
            if (article.quantity > 0) {
                DB.addMovement({
                    id: Utils.generateId(),
                    articleId: article.id,
                    type: 'Entrée',
                    quantity: article.quantity,
                    date: new Date().toISOString(),
                    remarks: sourceBcRef ? ('Réception ' + sourceBcRef) : 'Stock initial',
                    user: DB.getCurrentUser().name,
                    reference: sourceBcRef || 'INIT'
                });
            }
            if (sourceBcId) {
                if (window.SuiviBcBridge && typeof window.SuiviBcBridge.ingestBcIntoStock === 'function') {
                    try {
                        window.SuiviBcBridge.ingestBcIntoStock(sourceBcId, null, {
                            mode: 'create_new',
                            targetArticleId: article.id,
                            articleCode: article.code,
                            designation: article.designation,
                            quantity: article.quantity
                        });
                    } catch(e) {}
                }
                if (typeof Stock._markBcIngested === 'function') Stock._markBcIngested(sourceBcId);
            }
        }
        
        UI.hideModal();
        UI.refresh();
        UI.showAlert(sourceBcRef ? ('Article créé et réceptionné avec succès depuis ' + sourceBcRef + '.') : 'Article enregistré avec succès.', 'success');
    },
    _articleScanner: null,
    scanBarcode: function() {
        const container = document.getElementById('articleScannerContainer');
        if (!container) return;
        container.style.display = 'block';

        if (typeof Html5Qrcode === 'undefined') {
            container.innerHTML = '<div class="alert alert-danger">Scanner non disponible. Vérifiez que la librairie html5-qrcode est chargée.</div>';
            return;
        }

        if (Stock._articleScanner) {
            try { Stock._articleScanner.stop(); } catch(e) {}
        }

        Stock._articleScanner = new Html5Qrcode('articleScannerReader');
        Stock._articleScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            function(decodedText) {
                // Success — fill the barcode field
                const input = document.getElementById('articleBarcodeInput');
                if (input) input.value = decodedText;
                Utils.showNotification('Code scanné: ' + decodedText, 'success');
                Stock.stopScanBarcode();
            },
            function(error) { /* ignore scan errors */ }
        ).catch(function(err) {
            console.error('Scanner error:', err);
            container.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Impossible d\'accéder à la caméra. Vérifiez les permissions ou utilisez HTTPS.</div>';
        });
    },
    stopScanBarcode: function() {
        if (Stock._articleScanner) {
            try { Stock._articleScanner.stop(); } catch(e) {}
            Stock._articleScanner = null;
        }
        const container = document.getElementById('articleScannerContainer');
        if (container) {
            container.style.display = 'none';
            container.querySelector('#articleScannerReader').innerHTML = '';
        }
    },
    scanBarcodeFromFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (typeof Html5Qrcode === 'undefined') {
            Utils.showNotification('Librairie scanner non disponible', 'error');
            return;
        }

        const html5qr = new Html5Qrcode('articleScannerReader');
        html5qr.scanFileV2(file, true)
            .then(function(result) {
                const code = result.decodedText;
                const input = document.getElementById('articleBarcodeInput');
                if (input) input.value = code;
                Utils.showNotification('✅ Code détecté: ' + code, 'success');
                html5qr.clear();
            })
            .catch(function(err) {
                Utils.showNotification('❌ Aucun code-barres détecté dans l\'image. Essayez une image plus nette.', 'warning');
                console.warn('Scan file error:', err);
                try { html5qr.clear(); } catch(ex) {}
            });

        // Reset the file input so the same file can be selected again
        e.target.value = '';
    },
    autoGenerateCode: function(category, family) {
        const form = document.getElementById('addArticleForm') || document;
        const cat = category || (form.querySelector('[name=category]') || {}).value || '';
        const fam = (family !== undefined && family !== null) ? family : ((form.querySelector('[name=family]') || {}).value || '');
        const code = DB.generateArticleCode(cat, fam);
        const input = document.getElementById('articleCodeInput');
        if (input) input.value = code;
        return code;
    },
    handleImageUpload: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            Utils.showNotification('Image trop grande (max 2 MB)', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(ev) {
            const base64 = ev.target.result;
            const hidden = document.getElementById('articleImageData');
            if (hidden) hidden.value = base64;
            const preview = document.getElementById('articleImagePreview');
            if (preview) preview.innerHTML = '<img loading="lazy" src="' + base64 + '" style="max-height:80px;border-radius:4px;border:1px solid #ddd;">';
        };
        reader.readAsDataURL(file);
    },
    showEditArticle: function(id) {
        const article = DB.getArticles().find(a => a.id === id);
        if(!article) return;
        const settings = DB.getSettings();
        const rawZones = (typeof DB !== 'undefined' && DB.getZones) ? DB.getZones() : (settings.stockZones || ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
        const zonesList = [...((rawZones && rawZones.length > 0) ? rawZones : ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'])];
        const articleZone = article.zone || 'Zone A';
        if (!zonesList.includes(articleZone)) zonesList.push(articleZone);
        const html = `
            <form id="editArticleForm" onsubmit="Stock.saveArticle(event, '${id}')">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>Code / Référence *</label>
                        <input type="text" name="code" class="form-control" required value="${Utils.escapeHTML(article.code)}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Désignation *</label>
                        <input type="text" name="designation" class="form-control" required value="${Utils.escapeHTML(article.designation)}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Catégorie *</label>
                        <select name="category" class="form-select" required>
                            ${settings.articleCategories.map(c => `<option value="${Utils.escapeHTML(c)}" ${article.category === c ? 'selected' : ''}>${Utils.escapeHTML(c)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Famille</label>
                        <input type="text" name="family" class="form-control" value="${Utils.escapeHTML(article.family || '')}">
                    </div>
                    <div class="col-md-12 mb-3">
                        <label>Prix Unitaire (DA)</label>
                        <input type="number" name="price" class="form-control" min="0" step="0.01" value="${article.price || ''}">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label>Quantité *</label>
                        <input type="number" name="quantity" class="form-control" required min="0" step="0.01" value="${article.quantity}" readonly title="Utilisez les boutons Entrée/Sortie pour modifier le stock">
                        <small class="text-muted">En lecture seule</small>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label>Unité *</label>
                        <select name="unit" class="form-select" required>
                            ${settings.units.map(u => `<option value="${Utils.escapeHTML(u)}" ${article.unit === u ? 'selected' : ''}>${Utils.escapeHTML(u)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label style="color:var(--color-warning,#ED6C02);font-weight:700;">⚠️ Seuil d'alerte *</label>
                        <input type="number" name="minThreshold" class="form-control" required min="0" step="0.01" value="${article.minThreshold}" style="border-color:var(--color-warning,#ED6C02);">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="fw-bold"><i class="fas fa-building text-info me-1"></i> Site *</label>
                        <select name="site" id="addArticleSiteSelect" class="form-select" required onchange="Stock.onSiteChangeForZone(this.value)">
                            ${(typeof DB !== 'undefined' && DB.getSites ? DB.getSites() : []).map(function(s) {
                                var sel = (article.site === s.name || article.site === s.id || (!article.site && s.isDefault)) ? ' selected' : '';
                                return '<option value="' + Utils.escapeHTML(s.name) + '"' + sel + '>' + Utils.escapeHTML(s.name) + '</option>';
                            }).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="fw-bold"><i class="fas fa-layer-group text-primary me-1"></i> Zone de Stockage *</label>
                        <select name="zone" id="addArticleZoneSelect" class="form-select" required>
                            ${(function() {
                                var sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : [];
                                var artSiteId = article.site || '';
                                var site = artSiteId ? sites.find(function(s) { return s.id === artSiteId || s.name === artSiteId; }) : (sites.find(function(s) { return s.isDefault; }) || sites[0]);
                                var zones = site ? (site.zones || []) : zonesList;
                                return zones.map(function(z) {
                                    var zName = typeof z === 'object' ? (z.name || z.id) : z;
                                    var zDesc = typeof z === 'object' && z.description ? ' (' + z.description + ')' : '';
                                    var sel = (articleZone === zName) ? ' selected' : '';
                                    return '<option value="' + Utils.escapeHTML(zName) + '"' + sel + '>' + Utils.escapeHTML(zName) + Utils.escapeHTML(zDesc) + '</option>';
                                }).join('');
                            })()}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Section (Emplacement)</label>
                        <select name="section" class="form-select">
                            <option value="">Aucune</option>
                            ${settings.stockSections.map(s => `<option value="${Utils.escapeHTML(s.name)}" ${article.section === s.name ? 'selected' : ''}>${Utils.escapeHTML(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label><i class="fas fa-barcode"></i> Code-barres / QR Code</label>
                        <div class="d-flex" style="gap:0.5rem;">
                            <input type="text" name="barcode" id="articleBarcodeInput" class="form-control" value="${Utils.escapeHTML(article.barcode || '')}" placeholder="Scannez ou tapez">
                            <button type="button" class="btn btn-outline-primary" onclick="Stock.scanBarcode()" style="white-space:nowrap;">
                                <i class="fas fa-camera"></i> Caméra
                            </button>
                            <label class="btn btn-outline-secondary" style="white-space:nowrap;margin:0;cursor:pointer;">
                                <i class="fas fa-image"></i> Image
                                <input type="file" accept="image/*" style="display:none;" onchange="Stock.scanBarcodeFromFile(event)">
                            </label>
                        </div>
                        <div id="articleScannerContainer" style="display:none;margin-top:8px;">
                            <div id="articleScannerReader" style="width:100%;min-height:250px;"></div>
                            <button type="button" class="btn btn-sm btn-danger mt-1" onclick="Stock.stopScanBarcode()"><i class="fas fa-times"></i> Fermer</button>
                        </div>
                    </div>
                    <div class="col-12 mb-3">
                        <label><i class="fas fa-image"></i> Photo</label>
                        <input type="file" accept="image/*" capture="environment" class="form-control" onchange="Stock.handleImageUpload(event)">
                        <input type="hidden" name="image" id="articleImageData" value="${Utils.escapeHTML(article.image || '')}">
                        <div id="articleImagePreview">${article.image ? '<img loading="lazy" src="' + article.image + '" style="max-height:80px;border-radius:4px;border:1px solid #ddd;margin-top:8px;">' : ''}</div>
                    </div>
                    <div class="col-12 mb-3">
                        <label>Notes</label>
                        <textarea name="notes" class="form-control" rows="2">${Utils.escapeHTML(article.notes || '')}</textarea>
                    </div>
                </div>
                <div class="text-end">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
                </div>
            </form>
        `;
        UI.showModal('Modifier Article', html, '', 'lg');
    },
    showArticleDetail: function(id) {
        const article = DB.getArticles().find(a => a.id === id);
        if(!article) return;
        const artZone = article.zone || 'Zone A';
        const zoneSlug = String(artZone).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        
        const movements = DB.getMovements().filter(m => m.articleId === id).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        let html = `
            <div class="row">
                <div class="col-md-4">
                    ${article.image ? `<img loading="lazy" src="${Utils.escapeHTML(article.image)}" class="img-fluid mb-3 rounded" alt="Image article">` : '<div class="bg-light text-center p-5 mb-3 rounded">Pas d\'image</div>'}
                    <h4>${Utils.escapeHTML(article.designation)}</h4>
                    <p class="text-muted">Code: ${Utils.escapeHTML(article.code)}</p>
                    <ul class="list-group list-group-flush mb-3">
                        <li class="list-group-item d-flex justify-content-between"><span>Catégorie:</span> <strong>${Utils.escapeHTML(article.category)}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Zone de Stock:</span> <span class="zone-badge zone-badge-${zoneSlug}"><i class="fas fa-layer-group me-1"></i>${Utils.escapeHTML(artZone)}</span></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Site:</span> <strong><i class="fas fa-building text-info me-1"></i>${Utils.escapeHTML((function(){ var sites = (typeof DB !== 'undefined' && DB.getSites) ? DB.getSites() : []; var s = sites.find(function(x){ return x.id === article.site; }); return s ? s.name : (article.site || '-'); })())}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Stock Actuel:</span> <strong class="${article.quantity < article.minThreshold ? 'text-danger' : 'text-success'}">${article.quantity} ${Utils.escapeHTML(article.unit)}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Seuil d'alerte:</span> <strong>${article.minThreshold}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Section:</span> <strong>${Utils.escapeHTML(article.section || '-')}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Code-barres:</span> <strong>${Utils.escapeHTML(article.barcode || '-')}</strong></li>
                    </ul>
                </div>
                <div class="col-md-8">
                    <h5>Historique des mouvements</h5>
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Qté</th>
                                    <th>Réf.</th>
                                    <th>Par</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movements.map(m => `
                                <tr>
                                    <td>${Utils.formatDateTime(m.date, m.reference)}</td>
                                    <td><span class="badge bg-${m.type === 'Entrée' ? 'success' : 'danger'}">${m.type}</span></td>
                                    <td>${m.quantity}</td>
                                    <td>${Utils.escapeHTML(m.reference || '-')}</td>
                                    <td>${Utils.escapeHTML(m.user)}</td>
                                </tr>
                                `).join('')}
                                ${movements.length === 0 ? '<tr><td colspan="5" class="text-center">Aucun mouvement</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        UI.showModal('Détails Article', html, null, 'modal-lg');
    },
    deleteArticle: function(id) {
        if(confirm("Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible et peut casser les historiques liés.")) {
            DB.deleteArticle(id);
            UI.refresh();
            UI.showAlert('Article supprimé.', 'success');
        }
    },
    addStock: function(id) {
        const html = `
            <form onsubmit="Stock.submitAddStock(event, '${id}')">
                <div class="mb-3">
                    <label>Quantité à ajouter *</label>
                    <input type="number" name="quantity" class="form-control" required min="0.01" step="0.01">
                </div>
                <div class="mb-3">
                    <label>Référence / N° Bon *</label>
                    <input type="text" name="reference" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Remarques</label>
                    <textarea name="remarks" class="form-control"></textarea>
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-success">Ajouter au stock</button>
                </div>
            </form>
        `;
        UI.showModal('Entrée en stock', html);
    },
    submitAddStock: function(e, id) {
        e.preventDefault();
        const form = e.target;
        const qty = Number(form.quantity.value);
        const article = DB.getArticles().find(a => a.id === id);
        
        article.quantity += qty;
        DB.updateArticle(article);
        
        DB.addMovement({
            id: Utils.generateId(),
            articleId: id,
            type: 'Entrée',
            quantity: qty,
            reference: form.reference.value,
            remarks: form.remarks.value,
            date: new Date().toISOString(),
            user: DB.getCurrentUser().name
        });
        
        UI.hideModal();
        UI.refresh();
        UI.showAlert(`+${qty} ajouté au stock de ${article.designation}.`, 'success');
    },
    removeStock: function(id) {
        const article = DB.getArticles().find(a => a.id === id);
        const html = `
            <form onsubmit="Stock.submitRemoveStock(event, '${id}')">
                <div class="alert alert-info">Stock actuel: <strong>${article.quantity} ${Utils.escapeHTML(article.unit)}</strong></div>
                <div class="mb-3">
                    <label>Quantité à retirer *</label>
                    <input type="number" name="quantity" class="form-control" required min="0.01" max="${article.quantity}" step="0.01">
                </div>
                <div class="mb-3">
                    <label>Référence / Motif *</label>
                    <input type="text" name="reference" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Remarques</label>
                    <textarea name="remarks" class="form-control"></textarea>
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-warning">Retirer du stock</button>
                </div>
            </form>
        `;
        UI.showModal('Sortie de stock (Manuelle)', html);
    },
    submitRemoveStock: function(e, id) {
        e.preventDefault();
        const form = e.target;
        const qty = Number(form.quantity.value);
        const article = DB.getArticles().find(a => a.id === id);
        
        if (qty > article.quantity) {
            UI.showAlert('Quantité insuffisante.', 'danger');
            return;
        }
        
        article.quantity -= qty;
        DB.updateArticle(article);
        
        DB.addMovement({
            id: Utils.generateId(),
            articleId: id,
            type: 'Sortie',
            quantity: qty,
            reference: form.reference.value,
            remarks: form.remarks.value,
            date: new Date().toISOString(),
            user: DB.getCurrentUser().name
        });
        
        UI.hideModal();
        UI.refresh();
        UI.showAlert(`-${qty} retiré du stock de ${article.designation}.`, 'warning');
    },

    showAdjustQuantity: function(id) {
        if (!Auth.isAdmin() && !Auth.isMag()) {
            UI.showAlert('Accès refusé : Seul le magasinier ou l\'administrateur peut ajuster les quantités.', 'danger');
            return;
        }

        const article = DB.getArticles().find(a => a.id === id);
        if (!article) return;

        const html = `
            <form onsubmit="Stock.submitAdjustQuantity(event, '${id}')">
                <div class="alert alert-secondary d-flex align-items-center mb-3">
                    <i class="fas fa-boxes-stacked fa-2x text-primary me-3"></i>
                    <div>
                        <h6 class="mb-0 fw-bold">${Utils.escapeHTML(article.designation)}</h6>
                        <small class="text-muted">Code: ${Utils.escapeHTML(article.code)} | Emplacement: ${Utils.escapeHTML(article.section || 'N/A')}</small>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">Stock Actuel Système</label>
                        <input type="text" class="form-control" value="${article.quantity} ${Utils.escapeHTML(article.unit)}" readonly style="font-weight:700;background:var(--surface-alt,#f8fafc);">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-primary">Nouvelle Quantité Constatée *</label>
                        <input type="number" name="newQuantity" id="adjustNewQty" class="form-control border-primary" required min="0" step="0.01" value="${article.quantity}" oninput="Stock.calcAdjustDiff(${article.quantity}, this.value, '${Utils.escapeHTML(article.unit)}')">
                    </div>
                </div>

                <div id="adjustDiffBadge" class="p-2 mb-3 rounded text-center small fw-bold" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;">
                    Variation: 0 ${Utils.escapeHTML(article.unit)} (Aucun écart)
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold text-danger">⚠️ Justification Obligatoire de l'Écart *</label>
                    <textarea name="justification" class="form-control" rows="3" required minlength="5" placeholder="Indiquez impérativement la cause de la rectification (ex: Erreur de saisie précédente, Casse constatée, Inventaire tournant atelier, Déstockage exceptionnel...)..."></textarea>
                    <small class="text-muted"><i class="fas fa-shield-alt text-warning me-1"></i> Cette justification sera consignée dans le journal d'audit et transmise en alerte immédiate à l'Administrateur.</small>
                </div>

                <div class="text-end">
                    <button type="button" class="btn btn-secondary me-2" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-warning"><i class="fas fa-check-circle me-1"></i> Confirmer & Consigner l'Ajustement</button>
                </div>
            </form>
        `;
        UI.showModal('Ajustement de Quantité — ' + Utils.escapeHTML(article.designation), html);
    },

    calcAdjustDiff: function(oldQty, newQtyVal, unit) {
        const newQty = Number(newQtyVal);
        const diff = newQty - oldQty;
        const box = document.getElementById('adjustDiffBadge');
        if (!box) return;
        if (diff > 0) {
            box.style.background = '#dcfce7';
            box.style.color = '#15803d';
            box.style.borderColor = '#86efac';
            box.innerHTML = `<i class="fas fa-arrow-up"></i> Entrée de rectification : +${diff} ${unit}`;
        } else if (diff < 0) {
            box.style.background = '#fee2e2';
            box.style.color = '#b91c1c';
            box.style.borderColor = '#fca5a5';
            box.innerHTML = `<i class="fas fa-arrow-down"></i> Sortie de rectification : ${diff} ${unit}`;
        } else {
            box.style.background = '#f1f5f9';
            box.style.color = '#475569';
            box.style.borderColor = '#cbd5e1';
            box.innerHTML = `Variation: 0 ${unit} (Aucun écart)`;
        }
    },

    submitAdjustQuantity: function(e, id, directQty, directReason) {
        if (e && e.preventDefault) e.preventDefault();
        if (typeof e === 'string' && typeof id === 'number') {
            directReason = directQty;
            directQty = id;
            id = e;
            e = null;
        }

        const form = e ? e.target : null;
        const newQty = (directQty !== undefined) ? Number(directQty) : (form ? Number(form.newQuantity.value) : 0);
        const reason = (directReason !== undefined) ? String(directReason).trim() : (form ? form.justification.value.trim() : '');

        if (!reason || reason.length < 5) {
            if (window.UI) UI.showAlert('Veuillez fournir une justification détaillée (au moins 5 caractères).', 'warning');
            return { success: false, reason: 'justification_required' };
        }

        const article = (DB.getArticles ? DB.getArticles() : []).find(a => a.id === id);
        if (!article) return { success: false, reason: 'not_found' };

        const oldQty = Number(article.quantity);
        const diff = newQty - oldQty;
        const user = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Magasinier';

        article.quantity = newQty;
        if (DB.updateArticle) DB.updateArticle(article);
        else DB.update('articles', article.id, article);

        // Record stock movement
        if (DB.addMovement) {
            DB.addMovement({
                id: Utils.generateId(),
                articleId: id,
                type: diff >= 0 ? 'Entrée' : 'Sortie',
                quantity: Math.abs(diff),
                reference: 'AJUSTEMENT INVENTAIRE',
                remarks: `Rectification stock (${oldQty} -> ${newQty}). Motif: ${reason}`,
                date: new Date().toISOString(),
                user: user
            });
        }
        if (DB.addStockMovement) {
            DB.addStockMovement({
                articleId: id,
                type: diff >= 0 ? 'ENTREE' : 'SORTIE',
                quantity: Math.abs(diff),
                reason: `Ajustement stock: ${oldQty} -> ${newQty}. Motif: ${reason}`,
                author: user
            });
        }

        // Record in Audit Log
        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'AJUSTEMENT_STOCK',
                col: 'articles',
                itemId: id,
                target: `${article.designation || article.name} (${article.code})`,
                details: `Stock modifié de ${oldQty} à ${newQty} ${article.unit || 'U'} (${diff >= 0 ? '+' : ''}${diff}). Justification: "${reason}"`,
                user: user
            });
        }

        // Dispatch alert to Admin
        if (typeof Notify !== 'undefined' && Notify.sendAdminAlert) {
            Notify.sendAdminAlert(
                'Alerte Ajustement de Stock',
                `L'article "${article.designation || article.name}" a été rectifié de ${oldQty} à ${newQty} par ${user}. Motif: "${reason}"`,
                { category: 'stock', type: 'warning', module: 'stock' }
            );
        }

        if (window.UI) {
            UI.hideModal();
            UI.refresh();
            UI.showAlert(`Stock rectifié avec succès (${oldQty} → ${newQty} ${article.unit || 'U'}). Justification consignée et notifiée à l'Admin.`, 'success');
        }

        return { success: true, oldQuantity: oldQty, newQuantity: newQty, diff: diff };
    },
    showImportExcel: function() {
        const html = `
            <div class="mb-3">
                <p>Uploadez un fichier Excel (.xlsx). Colonnes attendues : Code, Désignation, Catégorie, Qté, Unité, Seuil.</p>
                <input type="file" id="excelFile" class="form-control" accept=".xlsx, .xls">
            </div>
            <div class="mb-3">
                <button class="btn btn-outline-info" onclick="Stock.showExcelTemplate()"><i class="fas fa-download"></i> Télécharger un modèle</button>
            </div>
            <div class="text-end mt-3">
                <button class="btn btn-primary" onclick="Stock.processExcel()">Prévisualiser</button>
            </div>
            <div id="excelPreviewContainer" class="mt-4" style="display:none;"></div>
        `;
        UI.showModal('Import Excel', html, null, 'modal-lg');
    },
    showExcelTemplate: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non trouvée.', 'danger');
            return;
        }
        const ws_data = [
            ["Code", "Désignation", "Catégorie", "Famille", "Qté", "Unité", "Seuil", "Zone", "Section", "CodeBarre", "Notes"],
            ["BUR-001", "Stylo noir", "Bureautique", "Bureautique", 15, "Pièce", 5, "Zone A", "Section Unique", "BUR-001", ""],
            ["BUR-002", "Stylo bleu", "Bureautique", "Bureautique", 1, "Pièce", 1, "Zone A", "Section Unique", "BUR-002", ""],
            ["BUR-011", "Boîte de trombones – petite", "Bureautique", "Bureautique", 24, "Boîte", 5, "Zone D", "Section Unique", "BUR-011", ""],
            ["BUR-016", "Agrafes", "Bureautique", "Bureautique", 103, "Boîte", 5, "Zone D", "Section Unique", "BUR-016", ""],
            ["BUR-022", "Registre 2 mains", "Bureautique", "Bureautique", 7, "Pièce", 2, "Zone A", "Section Unique", "BUR-022", ""]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        // Set column widths
        ws['!cols'] = [
            {wch:12}, {wch:30}, {wch:20}, {wch:15}, {wch:8}, {wch:10}, {wch:8}, {wch:12}, {wch:12}, {wch:15}, {wch:20}
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modele_Stock");
        XLSX.writeFile(wb, "Modele_Import_Stock_DOUROUB.xlsx");
        UI.showAlert('Modèle téléchargé ! Remplissez-le puis importez-le.', 'success');
    },
    processExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non trouvée.', 'danger');
            return;
        }
        const fileInput = document.getElementById('excelFile');
        if (!fileInput.files.length) {
            UI.showAlert('Sélectionnez un fichier.', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            Stock.previewImportData = json;
            
            const html = `
                <h5>Prévisualisation (${json.length} lignes)</h5>
                <div class="table-responsive" style="max-height:300px;">
                    <table class="table table-sm">
                        <thead><tr><th>Code</th><th>Désignation</th><th>Qté</th><th>Catégorie</th></tr></thead>
                        <tbody>
                            ${json.slice(0, 10).map(row => `
                                <tr>
                                    <td>${Utils.escapeHTML(row.Code || row.code || '')}</td>
                                    <td>${Utils.escapeHTML(row.Désignation || row.designation || '')}</td>
                                    <td>${row.Qté || row.qte || row.quantite || 0}</td>
                                    <td>${Utils.escapeHTML(row.Catégorie || row.categorie || '')}</td>
                                </tr>
                            `).join('')}
                            ${json.length > 10 ? '<tr><td colspan="4" class="text-center">... et ' + (json.length - 10) + ' autres lignes</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                <div class="text-end mt-3">
                    <button class="btn btn-success" onclick="Stock.confirmImport()">Confirmer l'importation</button>
                </div>
            `;
            const container = document.getElementById('excelPreviewContainer');
            container.innerHTML = html;
            container.style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    },
    confirmImport: function() {
        const data = Stock.previewImportData;
        if (!data || !data.length) return;
        
        let imported = 0;
        data.forEach(row => {
            const code = String(row.Code || row.code || '').trim();
            const des = String(row.Désignation || row.designation || '').trim();
            if (!code || !des) return; // skip empty
            
            // Check if exists
            let article = DB.getArticles().find(a => a.code === code);
            const isNew = !article;
            
            if (isNew) {
                article = {
                    id: Utils.generateId(),
                    code: code,
                    designation: des,
                    category: String(row.Catégorie || row.categorie || row.Category || 'Divers'),
                    family: String(row.Famille || row.famille || row.Family || ''),
                    quantity: Number(row.Qté || row.qte || row.quantite || row.Qty || 0),
                    unit: String(row.Unité || row.unite || row.Unit || 'Pièce'),
                    minThreshold: Number(row.Seuil || row.seuil || row.Threshold || 5),
                    zone: String(row.Zone || row.zone || 'Zone A'),
                    section: String(row.Section || row.section || ''),
                    barcode: String(row.CodeBarre || row.codebarre || row.Barcode || ''),
                    notes: String(row.Notes || row.notes || '')
                };
                DB.addArticle(article);
                if (article.quantity > 0) {
                    DB.addMovement({
                        id: Utils.generateId(),
                        articleId: article.id,
                        type: 'Entrée',
                        quantity: article.quantity,
                        reference: 'IMPORT EXCEL',
                        remarks: 'Import initial',
                        date: new Date().toISOString(),
                        user: DB.getCurrentUser().name
                    });
                }
            } else {
                // Update
                if (row.Zone || row.zone) {
                    article.zone = String(row.Zone || row.zone);
                }
                const addedQty = Number(row.Qté || row.qte || row.quantite || 0);
                if (addedQty > 0) {
                    article.quantity += addedQty;
                    DB.updateArticle(article);
                    DB.addMovement({
                        id: Utils.generateId(),
                        articleId: article.id,
                        type: 'Entrée',
                        quantity: addedQty,
                        reference: 'IMPORT EXCEL',
                        remarks: 'Mise à jour stock via import',
                        date: new Date().toISOString(),
                        user: DB.getCurrentUser().name
                    });
                }
            }
            imported++;
        });
        
        UI.hideModal();
        UI.refresh();
        UI.showAlert(`${imported} articles importés/mis à jour avec succès.`, 'success');
    },
    generateBatchBarcodes: function() {
        const selected = Array.from(document.querySelectorAll('.stock-select-cb:checked')).map(cb => cb.value);
        if (selected.length === 0) return;
        // Navigation vers le module BarcodeGenerator avec pre-sélection
        window.location.hash = '#barcodegenerator';
        setTimeout(() => {
            if (window.BarcodeGenerator && typeof window.BarcodeGenerator.setSelection === 'function') {
                window.BarcodeGenerator.setSelection(selected);
            }
        }, 100);
    },

    exportExcel: function() {
        const articles = DB.getArticles();
        const data = articles.map(a => ({
            'Code': a.code || '',
            'Désignation': a.designation || '',
            'Catégorie': a.category || '',
            'Zone': a.zone || 'Zone A',
            'Section': a.section || '',
            'Quantité': a.quantity || 0,
            'Unité': a.unit || '',
            'Seuil Min': a.minThreshold || 0,
            'Prix Unitaire (DA)': a.price || 0,
            'Valeur Total (DA)': (a.quantity || 0) * (a.price || 0),
            'Conditionnement': a.conditionnement || a.notes || '',
            'Statut': (a.quantity < a.minThreshold) ? 'ALERTE' : 'OK'
        }));
        Utils.downloadXLSX('Stock_Articles_' + new Date().toISOString().split('T')[0], [
            { name: 'Articles', data }
        ]);
        Utils.showNotification('Export Excel du stock généré avec succès.', 'success');
    },

    _bcImportCache: [],
    _bcImportTab: 'all',
    _bcImportSearch: '',
    _getIngestedBcIds: function() {
        try {
            const list = JSON.parse(localStorage.getItem('stock_ingested_bcs') || '[]');
            return new Set((Array.isArray(list) ? list : []).map(String));
        } catch(e) {
            return new Set();
        }
    },
    _markBcIngested: function(bcId) {
        if (!bcId) return;
        try {
            const list = JSON.parse(localStorage.getItem('stock_ingested_bcs') || '[]');
            const set = new Set((Array.isArray(list) ? list : []).map(String));
            set.add(String(bcId));
            localStorage.setItem('stock_ingested_bcs', JSON.stringify(Array.from(set)));
            const linkedRaw = localStorage.getItem('suivi_linked_v30');
            if (linkedRaw) {
                const data = JSON.parse(linkedRaw);
                if (Array.isArray(data.bcRecords)) {
                    const found = data.bcRecords.find(b => b.id === bcId || b.ref === bcId);
                    if (found) {
                        found.isIngested = true;
                        found.stockStatus = 'ingested';
                        localStorage.setItem('suivi_linked_v30', JSON.stringify(data));
                    }
                }
            }
        } catch(e) {
            console.warn('Error marking BC ingested:', e);
        }
    },
    _checkArticleExistsFallback: function(designation, code) {
        if (!designation && !code) return null;
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const cDesig = (designation || '').toLowerCase().trim();
        const cCode = (code || '').toLowerCase().trim();
        return articles.find(a => {
            const aCode = (a.code || '').toLowerCase().trim();
            const aDesig = (a.designation || '').toLowerCase().trim();
            if (cCode && aCode === cCode) return true;
            if (cDesig && aDesig === cDesig) return true;
            if (cDesig.length > 5 && (aDesig.includes(cDesig) || cDesig.includes(aDesig))) return true;
            return false;
        }) || null;
    },
    _loadFallbackBcs: function() {
        try {
            const s = localStorage.getItem('suivi_linked_v30');
            if (s) {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed.bcRecords) && parsed.bcRecords.length > 0) return parsed.bcRecords;
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        if (typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcs) && window.PRELOAD_DATA.bcs.length > 0) {
            return window.PRELOAD_DATA.bcs;
        }
        if (typeof window !== 'undefined' && window.state && Array.isArray(window.state.bcRecords) && window.state.bcRecords.length > 0) {
            return window.state.bcRecords;
        }
        return [];
    },
    openBcImportModal: function() {
        let bcs = [];
        if (window.SuiviBcBridge && typeof window.SuiviBcBridge.getAvailableBcsForStock === 'function') {
            try {
                const res = window.SuiviBcBridge.getAvailableBcsForStock();
                bcs = (res && typeof res.then === 'function') ? [] : res;
            } catch(e) {
                console.warn('Bridge error:', e);
            }
        }
        if (!Array.isArray(bcs) || bcs.length === 0) {
            bcs = Stock._loadFallbackBcs();
        }
        Stock._bcImportCache = bcs || [];
        Stock._bcImportTab = 'all';
        Stock._bcImportSearch = '';

        const html = `
            <div class="bc-import-container">
                <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div class="flex-grow-1" style="min-width:260px; max-width:420px;">
                        <div class="input-group">
                            <span class="input-group-text bg-light"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" id="bcImportSearchInput" class="form-control" placeholder="Rechercher par N° BC, Fournisseur, Contenu..." oninput="Stock.filterBcImportModal(this.value)">
                            <button class="btn btn-outline-secondary" type="button" onclick="document.getElementById('bcImportSearchInput').value=''; Stock.filterBcImportModal('');" title="Effacer"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    <div class="btn-group" role="group">
                        <button type="button" id="bcTabAll" class="btn btn-sm btn-primary active" onclick="Stock.setBcImportTab('all')">Tous les BC <span class="badge bg-light text-dark ms-1" id="bcCountAll">0</span></button>
                        <button type="button" id="bcTabAvail" class="btn btn-sm btn-outline-primary" onclick="Stock.setBcImportTab('available')">Disponibles pour Stock <span class="badge bg-success ms-1" id="bcCountAvail">0</span></button>
                        <button type="button" id="bcTabIngested" class="btn btn-sm btn-outline-primary" onclick="Stock.setBcImportTab('ingested')">Déjà entrés en stock <span class="badge bg-secondary ms-1" id="bcCountIngested">0</span></button>
                    </div>
                </div>
                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--border, #e2e8f0); border-radius: 8px;">
                    <table class="table table-hover table-striped align-middle mb-0" id="bcImportTable">
                        <thead class="table-light sticky-top" style="z-index: 10;">
                            <tr>
                                <th style="min-width:130px;">Réf BC</th>
                                <th style="min-width:100px;">Date</th>
                                <th style="min-width:160px;">Fournisseur</th>
                                <th>Contenu / Lignes</th>
                                <th style="min-width:120px;" class="text-end">Montant TTC</th>
                                <th style="min-width:150px;" class="text-center">Statut Stock</th>
                                <th style="min-width:140px;" class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="bcImportTableBody"></tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top text-muted small">
                    <div><i class="fas fa-info-circle me-1"></i> Seuls les BC non encore réceptionnés peuvent être importés en stock.</div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="UI.hideModal()">Fermer</button>
                </div>
            </div>
        `;
        UI.showModal('Réception & Entrée en Stock depuis Bon de Commande (BC)', html, '', 'lg');
        Stock._renderBcImportTable();
        
        if (window.SuiviBcBridge && typeof window.SuiviBcBridge.getAvailableBcsForStock === 'function') {
            const p = window.SuiviBcBridge.getAvailableBcsForStock();
            if (p && typeof p.then === 'function') {
                p.then(asyncRes => {
                    if (Array.isArray(asyncRes) && asyncRes.length > 0) {
                        Stock._bcImportCache = asyncRes;
                        Stock._renderBcImportTable();
                    }
                }).catch(e => console.warn(e));
            }
        }
    },

    _renderBcImportTable: function() {
        const tbody = document.getElementById('bcImportTableBody');
        if (!tbody) return;
        const bcs = Stock._bcImportCache || [];
        const search = (Stock._bcImportSearch || '').toLowerCase().trim();
        const tab = Stock._bcImportTab || 'all';
        const ingestedIds = Stock._getIngestedBcIds();

        let totalCount = bcs.length;
        let availCount = 0;
        let ingestedCount = 0;
        bcs.forEach(b => {
            const isIng = b.isIngested === true || ingestedIds.has(String(b.id)) || ingestedIds.has(String(b.ref));
            if (isIng) ingestedCount++; else availCount++;
        });

        const countAllEl = document.getElementById('bcCountAll');
        const countAvailEl = document.getElementById('bcCountAvail');
        const countIngestedEl = document.getElementById('bcCountIngested');
        if (countAllEl) countAllEl.textContent = totalCount;
        if (countAvailEl) countAvailEl.textContent = availCount;
        if (countIngestedEl) countIngestedEl.textContent = ingestedCount;

        const filtered = bcs.filter(b => {
            const isIng = b.isIngested === true || ingestedIds.has(String(b.id)) || ingestedIds.has(String(b.ref));
            if (tab === 'available' && isIng) return false;
            if (tab === 'ingested' && !isIng) return false;
            if (search) {
                const refMatch = (b.ref || '').toLowerCase().includes(search);
                const supMatch = (b.supplierName || '').toLowerCase().includes(search);
                const descMatch = (b.description || '').toLowerCase().includes(search);
                const linesMatch = (b.lineItems || []).some(li => (li.description || '').toLowerCase().includes(search));
                if (!refMatch && !supMatch && !descMatch && !linesMatch) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-2 d-block text-secondary"></i>Aucun Bon de Commande correspondant.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(b => {
            const isIng = b.isIngested === true || ingestedIds.has(String(b.id)) || ingestedIds.has(String(b.ref));
            const amount = Number(b.amountTTC || b.amount || 0);
            const formattedAmount = (typeof Utils !== 'undefined' && Utils.formatMoney) ? Utils.formatMoney(amount) : amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA';
            let contentHtml = '';
            if (b.lineItems && b.lineItems.length > 0) {
                const first = b.lineItems[0];
                const desig = first.description || 'Article';
                if (b.lineItems.length === 1) {
                    contentHtml = `<div class="fw-semibold text-truncate" style="max-width:260px;" title="${Utils.escapeHTML(desig)}">${Utils.escapeHTML(desig)}</div>
                    <small class="text-muted">Qté: <strong>${first.qty || 1} ${Utils.escapeHTML(first.unit || 'U')}</strong> &bull; PU: ${first.unitPrice || 0} DA</small>`;
                } else {
                    contentHtml = `<div class="fw-semibold text-truncate" style="max-width:260px;" title="${Utils.escapeHTML(desig)}">${Utils.escapeHTML(desig)}</div>
                    <small class="text-primary"><i class="fas fa-layer-group me-1"></i>+ ${b.lineItems.length - 1} autre(s) article(s) (${b.totalQty || b.lineItems.reduce((acc, l) => acc + (Number(l.qty)||0), 0)} u.)</small>`;
                }
            } else {
                contentHtml = `<div class="text-truncate" style="max-width:260px;" title="${Utils.escapeHTML(b.description || 'Fournitures')}">${Utils.escapeHTML(b.description || 'Fournitures')}</div>`;
            }

            const formattedDate = b.date ? b.date.slice(0, 10) : '—';
            return `
                <tr>
                    <td><span class="fw-bold" style="color:var(--gruna, #881337);">${Utils.escapeHTML(b.ref || b.id)}</span>${b.department ? `<div class="small text-muted">${Utils.escapeHTML(b.department)}</div>` : ''}</td>
                    <td class="small text-muted">${formattedDate}</td>
                    <td><div class="fw-semibold text-truncate" style="max-width:170px;" title="${Utils.escapeHTML(b.supplierName || 'Fournisseur inconnu')}">${Utils.escapeHTML(b.supplierName || 'Fournisseur inconnu')}</div></td>
                    <td>${contentHtml}</td>
                    <td class="text-end fw-bold text-nowrap">${formattedAmount}</td>
                    <td class="text-center">${isIng ? '<span class="badge bg-success" style="font-size:11px;padding:5px 8px;"><i class="fas fa-check-circle me-1"></i>✅ Déjà entré en stock</span>' : '<span class="badge bg-light text-dark border" style="font-size:11px;padding:5px 8px;"><i class="fas fa-clock text-warning me-1"></i>En attente réception</span>'}</td>
                    <td class="text-center text-nowrap">${isIng ? '<button disabled class="btn btn-xs btn-secondary" style="font-size:12px;padding:4px 10px;"><i class="fas fa-lock me-1"></i>Verrouillé</button>' : `<button type="button" class="btn btn-sm text-white" onclick="Stock.selectBcForIngestion('${Utils.escapeHTML(b.id)}')" style="background:var(--gruna, #881337);border-color:var(--gruna, #881337);font-size:12px;font-weight:600;padding:4px 10px;"><i class="fas fa-file-import me-1"></i> 📥 Sélectionner pour Stock</button>`}</td>
                </tr>
            `;
        }).join('');
    },

    setBcImportTab: function(tab) {
        Stock._bcImportTab = tab;
        ['bcTabAll', 'bcTabAvail', 'bcTabIngested'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.remove('btn-primary', 'active');
                btn.classList.add('btn-outline-primary');
            }
        });
        const activeBtn = document.getElementById(tab === 'all' ? 'bcTabAll' : (tab === 'available' ? 'bcTabAvail' : 'bcTabIngested'));
        if (activeBtn) {
            activeBtn.classList.remove('btn-outline-primary');
            activeBtn.classList.add('btn-primary', 'active');
        }
        Stock._renderBcImportTable();
    },

    filterBcImportModal: function(query) {
        Stock._bcImportSearch = query || '';
        Stock._renderBcImportTable();
    },

    selectBcForIngestion: function(bcId, lineIndex = undefined) {
        const bcs = Stock._bcImportCache || [];
        const bc = bcs.find(b => String(b.id) === String(bcId) || String(b.ref) === String(bcId));
        if (!bc) {
            UI.showAlert('Bon de Commande introuvable.', 'danger');
            return;
        }

        const ingestedIds = Stock._getIngestedBcIds();
        if (bc.isIngested === true || ingestedIds.has(String(bc.id)) || ingestedIds.has(String(bc.ref))) {
            UI.showAlert('Ce Bon de Commande a déjà été réceptionné en stock.', 'warning');
            return;
        }

        if (Array.isArray(bc.lineItems) && bc.lineItems.length > 1 && lineIndex === undefined) {
            const linesHtml = `
                <div class="p-2">
                    <p class="text-muted mb-3">Le Bon de Commande <strong>${Utils.escapeHTML(bc.ref)}</strong> (${Utils.escapeHTML(bc.supplierName || 'Fournisseur')}) contient <strong>${bc.lineItems.length} articles</strong>. Choisissez l'article à réceptionner :</p>
                    <div class="table-responsive" style="max-height:400px; overflow-y:auto;">
                        <table class="table table-hover table-bordered align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Désignation Article</th>
                                    <th>Qté</th>
                                    <th>PU (DA)</th>
                                    <th>Total (DA)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bc.lineItems.map((item, idx) => {
                                    const itemPrice = Number(item.unitPrice || 0);
                                    const itemTotal = Number(item.lineTotal || (itemPrice * (Number(item.qty) || 1)));
                                    return `
                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td><strong>${Utils.escapeHTML(item.description || 'Article ' + (idx + 1))}</strong></td>
                                            <td>${item.qty || 1} ${Utils.escapeHTML(item.unit || 'U')}</td>
                                            <td class="text-end">${itemPrice.toLocaleString('fr-FR')}</td>
                                            <td class="text-end fw-bold">${itemTotal.toLocaleString('fr-FR')}</td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-sm btn-primary text-white" onclick="Stock.selectBcForIngestion('${Utils.escapeHTML(bc.id)}', ${idx})" style="background:var(--gruna, #881337);border-color:var(--gruna, #881337);">
                                                    <i class="fas fa-file-import me-1"></i> Réceptionner
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="text-end mt-3">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="Stock.openBcImportModal()"><i class="fas fa-arrow-left me-1"></i> Retour aux BC</button>
                    </div>
                </div>
            `;
            UI.showModal('Sélection de l\'article — ' + Utils.escapeHTML(bc.ref), linesHtml, '', 'lg');
            return;
        }

        const selectedLine = (Array.isArray(bc.lineItems) && bc.lineItems.length > 0)
            ? (bc.lineItems[lineIndex !== undefined ? lineIndex : 0] || bc.lineItems[0])
            : null;

        const designation = selectedLine ? (selectedLine.description || bc.description || bc.ref) : (bc.description || bc.ref);
        const qty = selectedLine ? (Number(selectedLine.qty) || 1) : (Number(bc.totalQty) || 1);
        const price = selectedLine ? (Number(selectedLine.unitPrice) || 0) : (Number(bc.amountTTC || bc.amount) || 0);
        const unit = (selectedLine && selectedLine.unit) ? selectedLine.unit : 'U';
        const code = selectedLine?.code || '';

        let matched = null;
        if (window.SuiviBcBridge && typeof window.SuiviBcBridge.checkArticleExistsInStock === 'function') {
            try { matched = window.SuiviBcBridge.checkArticleExistsInStock(designation, code); } catch(e) {}
        }
        if (!matched) {
            matched = Stock._checkArticleExistsFallback(designation, code);
        }

        if (matched) {
            const promptHtml = `
                <div class="p-2">
                    <div class="alert alert-warning d-flex align-items-center gap-3 mb-3">
                        <i class="fas fa-triangle-exclamation fa-2x text-warning"></i>
                        <div>
                            <div class="fw-bold" style="font-size:15px;">Article existant détecté dans le Stock</div>
                            <div>L'article <strong>${Utils.escapeHTML(matched.designation)}</strong> semble déjà exister dans le stock (Qté actuelle : <strong>${matched.quantity} ${Utils.escapeHTML(matched.unit || 'U')}</strong>).</div>
                        </div>
                    </div>
                    <div class="card bg-light p-3 mb-3 border">
                        <div class="row g-2 small">
                            <div class="col-sm-6"><strong>Bon de Commande :</strong> ${Utils.escapeHTML(bc.ref)}</div>
                            <div class="col-sm-6"><strong>Fournisseur :</strong> ${Utils.escapeHTML(bc.supplierName || 'N/A')}</div>
                            <div class="col-sm-6"><strong>Désignation BC :</strong> ${Utils.escapeHTML(designation)}</div>
                            <div class="col-sm-6"><strong>Quantité commandée :</strong> <span class="text-success fw-bold">+${qty} ${Utils.escapeHTML(unit)}</span></div>
                        </div>
                    </div>
                    <p class="mb-3">Souhaitez-vous :</p>
                    <div class="d-grid gap-2">
                        <button type="button" class="btn btn-success py-2 text-start d-flex align-items-center justify-content-between" onclick="Stock.confirmIncrementExisting('${Utils.escapeHTML(bc.id)}', ${lineIndex !== undefined ? lineIndex : 'null'}, '${Utils.escapeHTML(matched.id)}', ${qty})">
                            <span><i class="fas fa-plus-circle me-2"></i><strong>Option A : Augmenter la quantité existante (+${qty})</strong></span>
                            <span class="badge bg-light text-dark">Nouveau total : ${matched.quantity + qty} ${Utils.escapeHTML(matched.unit || 'U')}</span>
                        </button>
                        <button type="button" class="btn btn-outline-primary py-2 text-start" onclick="Stock.confirmCreateNewDistinct('${Utils.escapeHTML(bc.id)}', ${lineIndex !== undefined ? lineIndex : 'null'})">
                            <i class="fas fa-file-circle-plus me-2"></i><strong>Option B : Créer un nouvel article distinct</strong>
                        </button>
                    </div>
                    <div class="text-end mt-3">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="UI.hideModal()">Annuler</button>
                    </div>
                </div>
            `;
            UI.showModal('Réception BC — Choix d\'affectation Stock', promptHtml, '', 'md');
        } else {
            Stock.confirmCreateNewDistinct(bc.id, lineIndex);
        }
    },

    confirmIncrementExisting: function(bcId, lineIndex, targetArticleId, qty) {
        const bcs = Stock._bcImportCache || [];
        const bc = bcs.find(b => String(b.id) === String(bcId) || String(b.ref) === String(bcId));
        const bcRef = bc ? bc.ref : bcId;
        const addQty = Number(qty) || 1;

        if (window.SuiviBcBridge && typeof window.SuiviBcBridge.ingestBcIntoStock === 'function') {
            try {
                window.SuiviBcBridge.ingestBcIntoStock(bcId, lineIndex, {
                    mode: 'increment_existing',
                    targetArticleId: targetArticleId,
                    quantity: addQty
                });
            } catch(e) {
                console.warn(e);
            }
        } else {
            const arts = DB.getArticles();
            const target = arts.find(a => a.id === targetArticleId);
            if (target) {
                DB.addStock(target.id, addQty, 'Entrée', 'Réception ' + bcRef + (bc?.supplierName ? ' (' + bc.supplierName + ')' : ''), DB.getCurrentUser()?.name || 'Magasinier', bcRef);
            }
        }

        Stock._markBcIngested(bcId);
        UI.hideModal();
        UI.refresh();
        UI.showAlert(`✅ Quantité (+${addQty}) ajoutée avec succès au stock depuis le Bon de Commande ${bcRef}.`, 'success');
    },

    confirmCreateNewDistinct: function(bcId, lineIndex) {
        const bcs = Stock._bcImportCache || [];
        const bc = bcs.find(b => String(b.id) === String(bcId) || String(b.ref) === String(bcId));
        if (!bc) return;

        const line = (Array.isArray(bc.lineItems) && bc.lineItems.length > 0)
            ? (bc.lineItems[lineIndex !== null && lineIndex !== undefined ? lineIndex : 0] || bc.lineItems[0])
            : null;

        const designation = line ? (line.description || bc.description || bc.ref) : (bc.description || bc.ref);
        const qty = line ? (Number(line.qty) || 1) : (Number(bc.totalQty) || 1);
        const price = line ? (Number(line.unitPrice) || 0) : (Number(bc.amountTTC || bc.amount) || 0);
        const unit = (line && line.unit) ? line.unit : 'U';

        UI.hideModal();
        Stock.showAddArticle({
            bcId: bc.id,
            bcRef: bc.ref,
            designation: designation,
            price: price,
            quantity: qty,
            unit: unit,
            supplier: bc.supplierName || '',
            notes: `Réception Bon de Commande ${bc.ref}` + (bc.supplierName ? ` — Fournisseur: ${bc.supplierName}` : '')
        });
    }
};

// Global Suivi & Stock Bridge Fallback Definition
if (typeof window !== 'undefined' && !window.SuiviBcBridge) {
    window.SuiviBcBridge = {
        getAvailableBcsForStock: function() {
            return (typeof Stock !== 'undefined' && Stock._loadFallbackBcs) ? Stock._loadFallbackBcs() : [];
        },
        checkArticleExistsInStock: function(designation, code) {
            return (typeof Stock !== 'undefined' && Stock._checkArticleExistsFallback) ? Stock._checkArticleExistsFallback(designation, code) : null;
        },
        ingestBcIntoStock: function(bcId, lineIndex, options = {}) {
            if (typeof Stock !== 'undefined' && Stock._markBcIngested) Stock._markBcIngested(bcId);
            if (options.mode === 'increment_existing' && options.targetArticleId && typeof DB !== 'undefined') {
                const qty = Number(options.quantity) || 1;
                const articles = DB.getArticles();
                const art = articles.find(a => a.id === options.targetArticleId);
                if (art) {
                    DB.addStock(art.id, qty, 'Entrée', 'Réception BC ' + bcId, (DB.getCurrentUser && DB.getCurrentUser())?.name || 'Magasinier', String(bcId));
                }
            }
            return { success: true, bcId, options };
        }
    };
}

window.StockMovements = {
    render: function() {
        const movements = DB.getMovements().sort((a,b) => new Date(b.date) - new Date(a.date));
        const articles = DB.getArticles();
        
        let html = `
            <h2>Mouvements de Stock</h2>
            <div class="card mt-3">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-3">
                            <input type="text" id="mvtSearch" class="form-control" placeholder="Recherche article, réf..." onkeyup="StockMovements.filterTable()">
                        </div>
                        <div class="col-md-3">
                            <select id="mvtTypeFilter" class="form-select" onchange="StockMovements.filterTable()">
                                <option value="">Tous les types</option>
                                <option value="Entrée">Entrées</option>
                                <option value="Sortie">Sorties</option>
                            </select>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-outline-success" onclick="StockMovements.exportExcel()"><i class="fas fa-file-excel"></i> Exporter Excel</button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped" id="mvtTable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Article</th>
                                    <th>Type</th>
                                    <th>Qté</th>
                                    <th>Référence</th>
                                    <th>Remarques</th>
                                    <th>Utilisateur</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movements.map(m => {
                                    const art = articles.find(a => a.id === m.articleId);
                                    return `
                                    <tr data-type="${m.type}">
                                        <td>${Utils.formatDateTime(m.date, m.reference)}</td>
                                        <td>${art ? Utils.escapeHTML(art.designation) + ' (' + Utils.escapeHTML(art.code) + ')' : 'Inconnu'}</td>
                                        <td><span class="badge bg-${m.type === 'Entrée' ? 'success' : 'danger'}">${m.type}</span></td>
                                        <td>${m.quantity}</td>
                                        <td>${Utils.escapeHTML(m.reference || '')}</td>
                                        <td>${Utils.escapeHTML(m.remarks || '')}</td>
                                        <td>${Utils.escapeHTML(m.user || '')}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    filterTable: function() {
        const search = document.getElementById('mvtSearch').value.toLowerCase();
        const type = document.getElementById('mvtTypeFilter').value;
        const rows = document.querySelectorAll('#mvtTable tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const rType = row.getAttribute('data-type');
            const matchSearch = text.includes(search);
            const matchType = type === "" || rType === type;
            row.style.display = (matchSearch && matchType) ? '' : 'none';
        });
    },
    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non trouvée.', 'danger');
            return;
        }
        const table = document.getElementById('mvtTable');
        const wb = XLSX.utils.table_to_book(table, {sheet: "Mouvements"});
        XLSX.writeFile(wb, "Mouvements_Stock.xlsx");
    }
};

window.Decharges = {
    currentDocFilter: 'all',
    setDocTypeFilter: function(type) {
        this.currentDocFilter = type || 'all';
        document.querySelectorAll('#dechFilterPills .doc-filter-pill').forEach(btn => {
            if (btn.getAttribute('data-doc-filter') === this.currentDocFilter) {
                btn.classList.remove('btn-outline-secondary');
                btn.classList.add('btn-primary', 'active');
            } else {
                btn.classList.remove('btn-primary', 'active');
                btn.classList.add('btn-outline-secondary');
            }
        });
        const select = document.getElementById('dechTypeDocFilter');
        if (select) {
            select.value = (type === 'all') ? '' : type;
        }
        this.filterTable();
    },
    render: function(tab) {
        const activeTab = tab || 'all';
        this.currentDocFilter = (activeTab === 'bsm') ? 'bsm' : ((activeTab === 'decharges' || activeTab === 'decharge') ? 'decharge' : 'all');
        const decharges = DB.getDecharges().sort((a,b) => new Date(b.date) - new Date(a.date));
        
        const countAll = decharges.length;
        const isBsmItem = (d) => Boolean((d.ref && String(d.ref).toUpperCase().startsWith('BSM')) || d.type === 'BSM' || d.typeDoc === 'bsm' || d.workPlanId || d.materialId);
        const countBsm = decharges.filter(d => isBsmItem(d)).length;
        const countDecharge = decharges.filter(d => !isBsmItem(d)).length;

        const allDepts = (DB.getSettings().departments && DB.getSettings().departments.length > 0) ? DB.getSettings().departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const allBens = [...new Set([...(DB.getUsers().map(u => u.name)), ...(DB.data && DB.data.beneficiaryNames ? DB.data.beneficiaryNames : []), ...(DB.getDecharges().map(d => d.beneficiary))])].filter(Boolean).sort();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-boxes-packing text-primary me-2"></i> Sorties Magasin (BSM) & Décharges</h2>
                    <p class="text-muted" style="margin:0;">Gestion des Bons de Sortie Magasin (consommables & pièces PDR) et Bons de Décharge (outillage & responsabilité)</p>
                </div>
                <div class="d-flex gap-2 flex-wrap align-items-center">
                    <button class="btn btn-sm btn-outline-success fw-bold" onclick="Decharges.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-sm btn-outline-primary fw-bold" onclick="App.loadModule('beneficiaries')"><i class="fas fa-users me-1"></i> Personnel & Services</button>
                    <button class="btn btn-sm btn-outline-info fw-bold" onclick="Decharges.showCreate('bsm')"><i class="fas fa-arrow-right-from-bracket me-1"></i> Nouveau BSM</button>
                    <button class="btn btn-sm btn-primary fw-bold" onclick="Decharges.showCreate('decharge')"><i class="fas fa-plus me-1"></i> Nouvelle Décharge</button>
                </div>
            </div>
            
            <!-- Document Type Filter Pills (BSM & Décharges) -->
            <div class="card mb-3">
                <div class="card-body py-2 px-3">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2" id="dechFilterPills">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="small fw-bold text-muted me-1"><i class="fas fa-filter me-1"></i>Type de document :</span>
                            <button type="button" class="btn btn-sm ${this.currentDocFilter === 'all' ? 'btn-primary active' : 'btn-outline-secondary'} doc-filter-pill" data-doc-filter="all" onclick="Decharges.setDocTypeFilter('all')">
                                <i class="fas fa-layer-group me-1"></i>Tous <span class="badge bg-light text-dark ms-1">${countAll}</span>
                            </button>
                            <button type="button" class="btn btn-sm ${this.currentDocFilter === 'bsm' ? 'btn-primary active' : 'btn-outline-secondary'} doc-filter-pill" data-doc-filter="bsm" onclick="Decharges.setDocTypeFilter('bsm')">
                                <i class="fas fa-arrow-right-from-bracket me-1"></i>Bons de Sortie (BSM) <span class="badge bg-light text-dark ms-1">${countBsm}</span>
                            </button>
                            <button type="button" class="btn btn-sm ${this.currentDocFilter === 'decharge' ? 'btn-primary active' : 'btn-outline-secondary'} doc-filter-pill" data-doc-filter="decharge" onclick="Decharges.setDocTypeFilter('decharge')">
                                <i class="fas fa-file-signature me-1"></i>Bons de Décharge (BD) <span class="badge bg-light text-dark ms-1">${countDecharge}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="row mb-3 g-2">
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Recherche libre</label>
                            <input type="text" id="dechSearch" class="form-control form-control-sm" placeholder="Réf, article, motif, BSM..." onkeyup="Decharges.filterTable()">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Type Document</label>
                            <select id="dechTypeDocFilter" class="form-select form-select-sm" onchange="Decharges.setDocTypeFilter(this.value)">
                                <option value="" ${this.currentDocFilter === 'all' ? 'selected' : ''}>Tous les documents</option>
                                <option value="bsm" ${this.currentDocFilter === 'bsm' ? 'selected' : ''}>Bon de Sortie Magasin (BSM)</option>
                                <option value="decharge" ${this.currentDocFilter === 'decharge' ? 'selected' : ''}>Bon de Décharge</option>
                                <option value="mixte">Mixte (BSM + Décharge)</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Département</label>
                            <select id="dechDeptFilter" class="form-select form-select-sm" onchange="Decharges.filterTable()">
                                <option value="">Tous les départements</option>
                                ${allDepts.map(d => `<option value="${Utils.escapeHTML(d)}">${Utils.escapeHTML(d)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Bénéficiaire / Demandeur</label>
                            <select id="dechBenFilter" class="form-select form-select-sm" onchange="Decharges.filterTable()">
                                <option value="">Tous les bénéficiaires</option>
                                ${allBens.map(b => `<option value="${Utils.escapeHTML(b)}">${Utils.escapeHTML(b)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Statut</label>
                            <select id="dechStatusFilter" class="form-select form-select-sm" onchange="Decharges.filterTable()">
                                <option value="">Tous les statuts</option>
                                <option value="En attente">En attente</option>
                                <option value="Validée">Validée</option>
                                <option value="Approuvée">Approuvée</option>
                                <option value="Rejetée">Rejetée</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-hover align-middle" id="dechTable">
                            <thead class="table-light">
                                <tr>
                                    <th>Réf. & Nature</th>
                                    <th>Date</th>
                                    <th>Bénéficiaire / Demandeur</th>
                                    <th>Département</th>
                                    <th>Affectation / Véhicule</th>
                                    <th>Articles</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${decharges.map(d => {
                                    let badge = 'warning';
                                    if(d.status === 'Validée') badge = 'primary';
                                    if(d.status === 'Approuvée') badge = 'success';
                                    if(d.status === 'Rejetée') badge = 'danger';
                                    
                                    const fleet = DB.getFleet();
                                    const mat = fleet.find(f => f.id === d.materialId);

                                    const isBsm = Boolean((d.ref && String(d.ref).toUpperCase().startsWith('BSM')) || d.type === 'BSM' || d.typeDoc === 'bsm' || d.workPlanId || d.materialId);
                                    const tDoc = isBsm ? 'bsm' : (d.typeDoc === 'mixte' ? 'mixte' : 'decharge');
                                    const bsmRef = d.bsmRef || (tDoc === 'bsm' ? ('BSM-' + String(d.ref || '').replace(/[^0-9]/g, '').slice(-4)) : null);
                                    let docBadge = '';
                                    if (tDoc === 'bsm') {
                                        docBadge = `<span class="badge bg-info text-dark" style="font-size:10px;"><i class="fas fa-arrow-right-from-bracket me-1"></i>BSM</span>`;
                                    } else if (tDoc === 'mixte') {
                                        docBadge = `<span class="badge bg-warning text-dark" style="font-size:10px;"><i class="fas fa-layer-group me-1"></i>Mixte</span>`;
                                    } else {
                                        docBadge = `<span class="badge text-white" style="background:#7c3aed;font-size:10px;"><i class="fas fa-hand-holding me-1"></i>Décharge</span>`;
                                    }

                                    // Compute FIFO priority badge for pending decharges
                                    let fifoBadge = '';
                                    if (d.status === 'En attente' && d.items && d.items.length > 0 && typeof DB.getArticleStockWithFIFO === 'function') {
                                        let prios = d.items.map(it => {
                                            const info = DB.getArticleStockWithFIFO(it.articleId, d.id);
                                            return info ? info.queuePriority : null;
                                        }).filter(p => p !== null && p !== undefined);
                                        if (prios.length > 0) {
                                            const minPrio = Math.min(...prios);
                                            fifoBadge = ` <span class="badge bg-primary text-white" style="font-size:10px;vertical-align:middle;" title="Priorité dans la file d'attente FIFO (Premier arrivé, premier servi)"><i class="fas fa-list-ol me-1"></i>FIFO #${minPrio}</span>`;
                                        }
                                    }
                                    
                                    const isHidden = (this.currentDocFilter && this.currentDocFilter !== 'all' && tDoc !== this.currentDocFilter) ? 'display:none;' : '';
                                    return `
                                    <tr data-status="${d.status}" data-dept="${Utils.escapeHTML(d.service || '')}" data-ben="${Utils.escapeHTML(d.beneficiary || '')}" data-typedoc="${tDoc}" style="${isHidden}">
                                        <td>
                                            <div class="d-flex align-items-center gap-1 flex-wrap">
                                                ${docBadge}
                                                <strong>${Utils.escapeHTML(d.ref)}</strong>
                                            </div>
                                            ${bsmRef ? `<small class="text-info font-monospace fw-bold d-block" style="font-size:10px;">${Utils.escapeHTML(bsmRef)}</small>` : ''}
                                        </td>
                                        <td>${Utils.formatDate(d.date || d.servedAt || d.createdAt || d.dateDecharge, d.ref || d.bsmRef)}</td>
                                        <td><strong><i class="fas fa-user-circle text-primary me-1"></i> ${Utils.escapeHTML(d.beneficiary)}</strong></td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(d.service || '-')}</span></td>
                                        <td>${mat ? Utils.escapeHTML(mat.name + ' - ' + mat.immatriculation) : (d.immatriculation ? Utils.escapeHTML((d.materialName || '') + ' - ' + d.immatriculation) : '-')}</td>
                                        <td><strong>${d.items ? d.items.length : 0}</strong> art.</td>
                                        <td><span class="badge bg-${d.status === 'served' ? 'success' : badge}">${d.status === 'served' ? 'Servi (BSM)' : d.status}</span>${fifoBadge}</td>
                                        <td>
                                            <div class="action-btns d-flex gap-1 flex-wrap">
                                                <button class="btn btn-sm btn-outline-info" onclick="Decharges.showDetail('${d.id}')" title="Détails du document"><i class="fas fa-eye"></i></button>
                                                
                                                <!-- Download / Print BSM -->
                                                <button class="btn btn-sm btn-outline-info fw-semibold" onclick="Decharges.printBSM('${d.id}')" title="Imprimer Bon de Sortie Magasin (BSM)"><i class="fas fa-arrow-right-from-bracket me-1"></i> BSM</button>

                                                <!-- Download PDF (Always Available) -->
                                                <button class="btn btn-sm btn-outline-danger fw-semibold" onclick="Decharges.exportPDF('${d.id}')" title="Télécharger & Imprimer (PDF)"><i class="fas fa-file-pdf"></i> PDF</button>

                                                <!-- Download Word Doc (Always Available) -->
                                                <button class="btn btn-sm btn-outline-primary fw-semibold" onclick="Decharges.downloadDocx('${d.id}')" title="Télécharger Décharge Word (.doc)"><i class="fas fa-file-word"></i> Word</button>

                                                <!-- 1-Click Validation for Pending -->
                                                ${d.status === 'En attente' ? `
                                                <button class="btn btn-sm btn-success fw-bold" onclick="Decharges.quickValidate('${d.id}')" title="Valider la décharge immédiatement (1-clic)"><i class="fas fa-check-circle me-1"></i> Valider</button>
                                                ${(Auth.isAdmin() || Auth.isChefSectionGestion() || (d.createdBy && Auth.getCurrentUser() && Auth.getCurrentUser().name === d.createdBy)) ? `
                                                <button class="btn btn-sm btn-outline-primary" onclick="Decharges.showEdit('${d.id}')" title="Modifier la décharge en attente"><i class="fas fa-pen"></i></button>
                                                ` : ''}
                                                ${(Auth.isAdmin() || Auth.isChefSectionGestion()) ? `
                                                <button class="btn btn-sm btn-outline-danger" onclick="Decharges.reject('${d.id}')" title="Rejeter"><i class="fas fa-times"></i></button>
                                                ` : ''}
                                                ` : ''}

                                                <!-- Counter fulfillment for Validated -->
                                                ${d.status === 'Validée' ? `
                                                ${(Auth.isAdmin() || Auth.isMag()) ? `
                                                <button class="btn btn-sm btn-primary fw-bold" onclick="Decharges.showServeModal('${d.id}')" title="Servir au comptoir magasin"><i class="fas fa-box-open me-1"></i> Servir au comptoir</button>
                                                ` : ''}
                                                ${Auth.isAdmin() ? `<button class="btn btn-sm btn-outline-warning" onclick="Decharges.showEdit('${d.id}')" title="Rectifier (Réservé DG/Admin - Verrouillé pour autres)"><i class="fas fa-user-shield me-1"></i> Rectifier (DG)</button>` : ''}
                                                ${Auth.isAdmin() ? `<button class="btn btn-sm btn-outline-danger" onclick="Decharges.delete('${d.id}')" title="Supprimer (Admin)"><i class="fas fa-trash"></i></button>` : ''}
                                                ` : ''}

                                                ${d.status === 'Approuvée' ? `
                                                ${Auth.isAdmin() ? `<button class="btn btn-sm btn-outline-warning" onclick="Decharges.showEdit('${d.id}')" title="Rectifier (Réservé DG/Admin)"><i class="fas fa-user-shield me-1"></i> Rectifier (DG)</button>` : ''}
                                                ${Auth.isAdmin() ? `<button class="btn btn-sm btn-outline-danger" onclick="Decharges.delete('${d.id}')" title="Supprimer (Admin)"><i class="fas fa-trash"></i></button>` : ''}
                                                ` : ''}

                                                ${d.status === 'Rejetée' && Auth.isAdmin() ? `
                                                <button class="btn btn-sm btn-outline-danger" onclick="Decharges.delete('${d.id}')" title="Supprimer (Admin)"><i class="fas fa-trash"></i></button>
                                                ` : ''}

                                                <!-- Linked Bon de Travail actions if applicable -->
                                                ${(d.workPlanId || d.workPlanRef) ? `
                                                <button class="btn btn-sm btn-outline-info" onclick="PlanTravailModule.viewPlanDetail('${d.workPlanId || d.workPlanRef}')" title="Voir Bon de Travail lié"><i class="fas fa-screwdriver-wrench"></i> BT</button>
                                                <button class="btn btn-sm btn-outline-dark" onclick="PlanTravailModule.downloadDocx('${d.workPlanId || d.workPlanRef}')" title="Télécharger Bon de Travail Word (.doc)"><i class="fas fa-file-lines"></i> BT Word</button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    filterTable: function() {
        const search = (document.getElementById('dechSearch')?.value || '').toLowerCase();
        const selectType = document.getElementById('dechTypeDocFilter')?.value || '';
        const typeDoc = this.currentDocFilter && this.currentDocFilter !== 'all' ? this.currentDocFilter : selectType;
        const status = document.getElementById('dechStatusFilter')?.value || '';
        const dept = document.getElementById('dechDeptFilter')?.value || '';
        const ben = document.getElementById('dechBenFilter')?.value || '';

        const rows = document.querySelectorAll('#dechTable tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const rTypeDoc = row.getAttribute('data-typedoc') || '';
            const rStat = row.getAttribute('data-status') || '';
            const rDept = row.getAttribute('data-dept') || '';
            const rBen = row.getAttribute('data-ben') || '';

            const matchSearch = !search || text.includes(search);
            const matchType = !typeDoc || typeDoc === 'all' || rTypeDoc === typeDoc || (typeDoc === 'mixte' && (rTypeDoc === 'bsm' || rTypeDoc === 'decharge'));
            const matchStatus = !status || rStat === status;
            const matchDept = !dept || rDept === dept;
            const matchBen = !ben || rBen === ben;

            row.style.display = (matchSearch && matchType && matchStatus && matchDept && matchBen) ? '' : 'none';
        });
    },
    onBeneficiaryChange: function(benName, prefix = '') {
        const benEl = document.getElementById(prefix + 'beneficiary');
        const srvEl = document.getElementById(prefix + 'service');
        const qualEl = document.getElementById(prefix + 'qualite');
        const cardEl = document.getElementById(prefix + 'beneficiaryCard');

        if (benName === '_NEW_') {
            const newName = prompt('Nom complet du nouveau bénéficiaire :');
            if (newName && newName.trim()) {
                const trimmed = newName.trim();
                if (DB.data && DB.data.beneficiaryNames && !DB.data.beneficiaryNames.includes(trimmed)) {
                    DB.data.beneficiaryNames.push(trimmed);
                    DB.save();
                }
                const opt = document.createElement('option');
                opt.value = trimmed;
                opt.text = trimmed;
                opt.selected = true;
                benEl.appendChild(opt);
                benName = trimmed;
            } else {
                benEl.selectedIndex = 0;
                if (cardEl) cardEl.innerHTML = '';
                return;
            }
        }

        if (!benName) {
            if (cardEl) cardEl.innerHTML = '';
            return;
        }

        const bens = typeof Beneficiaries !== 'undefined' ? Beneficiaries.getBeneficiariesList() : [];
        const ben = bens.find(b => b.name === benName);

        if (ben) {
            if (srvEl && ben.department && ben.department !== 'Non spécifié') {
                for (let i = 0; i < srvEl.options.length; i++) {
                    if (srvEl.options[i].value === ben.department) {
                        srvEl.selectedIndex = i;
                        break;
                    }
                }
            }
            if (qualEl && ben.qualite && !qualEl.value) {
                qualEl.value = ben.qualite;
            }
            if (cardEl) {
                cardEl.innerHTML = `
                    <div class="alert alert-info py-2 px-3 mb-3 d-flex justify-content-between align-items-center" style="background:#eef4fc;border:1px solid #bfdbfe;border-radius:6px;font-size:13px;">
                        <div>
                            <i class="fas fa-user-check text-primary me-2"></i>
                            <strong>${Utils.escapeHTML(ben.name)}</strong>
                            <span class="badge bg-primary ms-2">${Utils.escapeHTML(ben.qualite || 'Bénéficiaire')}</span>
                            <span class="badge bg-light text-dark border ms-1"><i class="fas fa-building text-muted"></i> ${Utils.escapeHTML(ben.department)}</span>
                        </div>
                        <small class="text-muted"><i class="fas fa-history"></i> ${ben.dechargesCount || 0} décharge(s) enregistrée(s)</small>
                    </div>
                `;
            }
        } else {
            if (cardEl) {
                cardEl.innerHTML = `
                    <div class="alert alert-secondary py-2 px-3 mb-3" style="font-size:13px;">
                        <i class="fas fa-user me-2"></i> Bénéficiaire sélectionné : <strong>${Utils.escapeHTML(benName)}</strong>
                    </div>
                `;
            }
        }
    },

    onDepartmentChange: function(dept, prefix = '') {
        const srvEl = document.getElementById(prefix + 'service');
        if (dept === '_NEW_') {
            const newDept = prompt('Nom du nouveau département / service :');
            if (newDept && newDept.trim()) {
                const trimmed = newDept.trim();
                const settings = DB.getSettings();
                if (!settings.departments) settings.departments = [];
                if (!settings.departments.includes(trimmed)) {
                    settings.departments.push(trimmed);
                    DB.save();
                }
                const opt = document.createElement('option');
                opt.value = trimmed;
                opt.text = trimmed;
                opt.selected = true;
                srvEl.appendChild(opt);
            } else {
                srvEl.selectedIndex = 0;
            }
        }
    },

    onMaterialChange: function(matId, prefix = '') {
        const cardEl = document.getElementById(prefix + 'materialCard');
        const hiddenId = document.getElementById(prefix + 'materialId');
        const hiddenImmat = document.getElementById(prefix + 'matImmatriculation');
        const hiddenName = document.getElementById(prefix + 'matName');
        const hiddenFamily = document.getElementById(prefix + 'matFamily');

        if (!matId) {
            if (hiddenId) hiddenId.value = '';
            if (hiddenImmat) hiddenImmat.value = '';
            if (hiddenName) hiddenName.value = '';
            if (hiddenFamily) hiddenFamily.value = '';
            if (cardEl) cardEl.innerHTML = '';
            return;
        }

        const fleet = DB.getFleet();
        const mat = fleet.find(f => f.id === matId);

        if (mat) {
            if (hiddenId) hiddenId.value = mat.id;
            if (hiddenImmat) hiddenImmat.value = mat.immatriculation;
            if (hiddenName) hiddenName.value = mat.name;
            if (hiddenFamily) hiddenFamily.value = mat.family;

            const decharges = DB.getDecharges().filter(d => d.materialId === mat.id && d.status === 'Approuvée');
            let totalPieces = 0;
            decharges.forEach(d => { (d.items || []).forEach(i => totalPieces += Number(i.quantity || 0)); });

            if (cardEl) {
                const statusBadge = mat.status === 'Actif' ? 'success' : mat.status === 'En panne' ? 'danger' : 'warning';
                cardEl.innerHTML = `
                    <div class="card mb-3" style="border:1px solid var(--border);background:var(--surface-alt);border-radius:6px;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div class="d-flex align-items-center gap-3">
                                    <div style="font-size:28px;color:var(--primary);"><i class="fas fa-truck-moving"></i></div>
                                    <div>
                                        <h6 class="mb-1 fw-bold" style="color:var(--text);font-size:15px;">${Utils.escapeHTML(mat.name)}</h6>
                                        <div class="d-flex align-items-center gap-2 flex-wrap">
                                            <span class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1px;font-size:12px;padding:4px 8px;">
                                                <i class="fas fa-id-card me-1"></i> ${Utils.escapeHTML(mat.immatriculation)}
                                            </span>
                                            <span class="badge bg-secondary">${Utils.escapeHTML(mat.family)}</span>
                                            <span class="badge bg-${statusBadge}">${mat.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <button type="button" class="btn btn-xs btn-outline-primary" onclick="UI.hideModal();Consumption.viewForTruck('${mat.id}')">
                                        <i class="fas fa-chart-pie"></i> Suivi Conso (${totalPieces} pièces)
                                    </button>
                                </div>
                            </div>
                            ${mat.notes ? `<div class="mt-2 pt-2 border-top small text-muted"><i class="fas fa-sticky-note me-1"></i> ${Utils.escapeHTML(mat.notes)}</div>` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            if (cardEl) cardEl.innerHTML = '';
        }
    },

    showCreateFor: function(benName, deptName, qualite) {
        this.showCreate();
        setTimeout(() => {
            const benEl = document.getElementById('beneficiary');
            if (benEl && benName) {
                let found = false;
                for (let i = 0; i < benEl.options.length; i++) {
                    if (benEl.options[i].value === benName || benEl.options[i].text.includes(benName)) {
                        benEl.selectedIndex = i;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    const opt = document.createElement('option');
                    opt.value = benName;
                    opt.text = benName;
                    opt.selected = true;
                    benEl.appendChild(opt);
                }
                Decharges.onBeneficiaryChange(benName);
            }

            const srvEl = document.getElementById('service');
            if (srvEl && deptName) {
                for (let i = 0; i < srvEl.options.length; i++) {
                    if (srvEl.options[i].value === deptName) {
                        srvEl.selectedIndex = i;
                        break;
                    }
                }
            }

            const qEl = document.getElementById('qualite');
            if (qEl && qualite) qEl.value = qualite;
        }, 120);
    },

    showCreateForTruck: function(truckId) {
        this.showCreate();
        setTimeout(() => {
            const fleet = DB.getFleet();
            const mat = fleet.find(f => f.id === truckId);
            if (mat) {
                Decharges.selectTruck(mat.id, mat.immatriculation, mat.name, mat.family || 'Camion', '', mat.status);
            }
        }, 120);
    },

    openTruckDropdown: function(prefix = '') {
        const dd = document.getElementById(prefix + 'truckDropdownList');
        if (dd) dd.style.display = 'block';
    },

    toggleTruckDropdown: function(prefix = '') {
        const dd = document.getElementById(prefix + 'truckDropdownList');
        if (dd) {
            dd.style.display = (dd.style.display === 'block') ? 'none' : 'block';
        }
    },

    filterTrucks: function(query, prefix = '') {
        this.openTruckDropdown(prefix);
        const q = (query || '').toLowerCase().trim();
        const container = document.getElementById(prefix + 'truckOptionsContainer');
        if (!container) return;
        const items = container.querySelectorAll('.truck-option-item');
        items.forEach(el => {
            const immat = el.getAttribute('data-immat') || '';
            const name = el.getAttribute('data-name') || '';
            const fam = el.getAttribute('data-family') || '';
            if (!q || immat.includes(q) || name.includes(q) || fam.includes(q)) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    },

    selectTruck: function(id, immat, name, family, prefix = '', status = '') {
        const input = document.getElementById(prefix + 'truckSearchInput');
        const hiddenId = document.getElementById(prefix + 'materialId');
        const hiddenImmat = document.getElementById(prefix + 'matImmatriculation');
        const hiddenName = document.getElementById(prefix + 'matName');
        const hiddenFamily = document.getElementById(prefix + 'matFamily');
        const dd = document.getElementById(prefix + 'truckDropdownList');

        if (id) {
            if (input) input.value = `[ ${immat} ] ${name}`;
            if (hiddenId) hiddenId.value = id;
            if (hiddenImmat) hiddenImmat.value = immat;
            if (hiddenName) hiddenName.value = name;
            if (hiddenFamily) hiddenFamily.value = family;
        } else {
            if (input) input.value = '';
            if (hiddenId) hiddenId.value = '';
            if (hiddenImmat) hiddenImmat.value = '';
            if (hiddenName) hiddenName.value = '';
            if (hiddenFamily) hiddenFamily.value = '';
        }

        if (dd) dd.style.display = 'none';
        this.onMaterialChange(id, prefix);
    },

    clearTruckSelection: function(prefix = '') {
        this.selectTruck('', '', '', '', prefix, '');
    },

    showCreate: function(defaultType = 'bsm') {
        const fleet = DB.getFleet();
        const articles = DB.getArticles().filter(a => a.quantity > 0);
        const depts = (DB.getSettings().departments && DB.getSettings().departments.length > 0) ? DB.getSettings().departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const bens = typeof Beneficiaries !== 'undefined' ? Beneficiaries.getBeneficiariesList() : [];
        const families = [...new Set(fleet.map(f => f.family || 'Autre'))];

        const settings = (DB.getSettings && DB.getSettings()) || {};
        const categories = [...new Set([
            ...(settings.articleCategories || []),
            ...articles.map(a => a.category).filter(Boolean),
            ...articles.map(a => a.family).filter(Boolean)
        ])].filter(Boolean).sort();

        let html = `
            <form id="createDechargeForm" onsubmit="Decharges.submitCreate(event)">
                <div class="row">
                    <div class="col-12 mb-3">
                        <label class="form-label fw-bold d-block"><i class="fas fa-file-invoice me-1 text-primary"></i> Nature & Type du Document Magasin *</label>
                        <div class="p-2 border rounded d-flex gap-3 flex-wrap" style="background:var(--surface-alt);">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="typeDoc" id="typeDocBsm" value="bsm" ${defaultType === 'bsm' ? 'checked' : ''}>
                                <label class="form-check-label fw-bold text-info" for="typeDocBsm" style="cursor:pointer;">
                                    <i class="fas fa-arrow-right-from-bracket me-1"></i> Bon de Sortie Magasin (B.S.M)
                                    <div class="small text-muted fw-normal">Consommation pièces PDR / Lubrifiants / Fournitures d'atelier (Non restituable)</div>
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="typeDoc" id="typeDocDecharge" value="decharge" ${defaultType === 'decharge' ? 'checked' : ''}>
                                <label class="form-check-label fw-bold" style="color:#a855f7;cursor:pointer;" for="typeDocDecharge">
                                    <i class="fas fa-hand-holding me-1"></i> Bon de Décharge (B.D)
                                    <div class="small text-muted fw-normal">Mise à disposition outillage durable / Équipement / EPI (Garde & responsabilité personnelle)</div>
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="typeDoc" id="typeDocMixte" value="mixte" ${defaultType === 'mixte' ? 'checked' : ''}>
                                <label class="form-check-label fw-bold text-warning" for="typeDocMixte" style="cursor:pointer;">
                                    <i class="fas fa-layer-group me-1"></i> Mixte (BSM + Décharge)
                                    <div class="small text-muted fw-normal">Sortie magasin combinée avec engagement signé de prise en charge</div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Département / Service *</label>
                        <select id="service" class="form-select" required onchange="Decharges.onDepartmentChange(this.value)">
                            <option value="">-- Sélectionner un département --</option>
                            ${depts.map(d => `<option value="${Utils.escapeHTML(d)}">${Utils.escapeHTML(d)}</option>`).join('')}
                            <option value="_NEW_">+ Ajouter un nouveau département...</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Bénéficiaire (À qui est remise la décharge) *</label>
                        <select id="beneficiary" class="form-select" required onchange="Decharges.onBeneficiaryChange(this.value)">
                            <option value="">-- Sélectionner le personnel / bénéficiaire --</option>
                            ${bens.map(b => `<option value="${Utils.escapeHTML(b.name)}">${Utils.escapeHTML(b.name)} — ${Utils.escapeHTML(b.qualite || 'Staff')} (${Utils.escapeHTML(b.department)})</option>`).join('')}
                            <option value="_NEW_">+ Ajouter un nouveau bénéficiaire...</option>
                        </select>
                    </div>

                    <div class="col-12" id="beneficiaryCard"></div>

                    <div class="col-12 mb-3">
                        <label class="form-label fw-bold d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-truck text-primary me-1"></i> Matériel / Camion / Véhicule concerné</span>
                            <small class="text-muted fw-normal">(${fleet.length} véhicules au parc — tapez ou faites défiler)</small>
                        </label>
                        
                        <div class="position-relative" id="truckSelectorWrap">
                            <div class="input-group">
                                <span class="input-group-text" style="background:var(--surface-alt);color:var(--text-muted);border-color:var(--border);"><i class="fas fa-search"></i></span>
                                <input type="text" id="truckSearchInput" class="form-control" placeholder="Rechercher par immatriculation ou nom (ex: 01234, MAN, ACTROS)..." autocomplete="off" onfocus="Decharges.openTruckDropdown('')" oninput="Decharges.filterTrucks(this.value, '')">
                                <button type="button" class="btn btn-outline-secondary" title="Effacer la sélection" onclick="Decharges.clearTruckSelection('')"><i class="fas fa-times"></i></button>
                                <button type="button" class="btn btn-outline-primary" title="Afficher tous les camions" onclick="Decharges.toggleTruckDropdown('')"><i class="fas fa-chevron-down"></i></button>
                            </div>
                            
                            <div id="truckDropdownList" class="dropdown-menu w-100 p-1 shadow-lg" style="display:none; max-height: 165px; overflow-y: auto; z-index: 1050; border: 1px solid var(--border); background: var(--surface);">
                                <div class="p-2 border-bottom text-muted small d-flex justify-content-between align-items-center">
                                    <span>${fleet.length} véhicules au parc — Cliquez pour sélectionner</span>
                                    <button type="button" class="btn btn-xs btn-outline-danger" onclick="Decharges.selectTruck('', '', '', '', '', '')">Aucun matériel</button>
                                </div>
                                <div id="truckOptionsContainer">
                                    ${fleet.map(m => `
                                        <div class="truck-option-item p-2 rounded d-flex align-items-center justify-content-between border-bottom" style="cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='transparent'" onclick="Decharges.selectTruck('${m.id}', '${Utils.escapeHTML(m.immatriculation)}', '${Utils.escapeHTML(m.name)}', '${Utils.escapeHTML(m.family || 'Camion')}', '', '${m.status}')" data-immat="${Utils.escapeHTML(m.immatriculation.toLowerCase())}" data-name="${Utils.escapeHTML(m.name.toLowerCase())}" data-family="${Utils.escapeHTML((m.family||'').toLowerCase())}">
                                            <div>
                                                <span class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1px;font-size:12px;padding:3px 7px;">${Utils.escapeHTML(m.immatriculation)}</span>
                                                <strong class="ms-2" style="font-size:13px;color:var(--text);">${Utils.escapeHTML(m.name)}</strong>
                                                <span class="badge bg-secondary ms-1" style="font-size:10px;">${Utils.escapeHTML(m.family || 'Camion')}</span>
                                            </div>
                                            <span class="badge bg-${m.status === 'Actif' ? 'success' : m.status === 'En panne' ? 'danger' : 'warning'}" style="font-size:10px;">${m.status}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <input type="hidden" id="materialId" value="">
                        <input type="hidden" id="matImmatriculation" value="">
                        <input type="hidden" id="matName" value="">
                        <input type="hidden" id="matFamily" value="">
                    </div>

                    <div class="col-12" id="materialCard"></div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label">De (Remettant) *</label>
                        <input type="text" id="fromName" class="form-control" value="${Utils.escapeHTML(DB.getCurrentUser().name)}" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Qualité / Fonction du bénéficiaire</label>
                        <input type="text" id="qualite" class="form-control" placeholder="ex: Chauffeur, Mécanicien, Chef Atelier...">
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label">Motif / Travaux / Observations</label>
                        <textarea id="reason" class="form-control" rows="2" placeholder="Ex: Entretien périodique, changement plaquettes de frein, vidange 40.000km..."></textarea>
                    </div>
                    <div class="col-12 mb-3 form-check ms-2">
                        <input type="checkbox" class="form-check-input" id="generatePV">
                        <label class="form-check-label" for="generatePV">Générer automatiquement un PV de Mise à Disposition</label>
                    </div>
                </div>
                
                <hr>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0 fw-bold"><i class="fas fa-boxes text-secondary me-1"></i> Articles déchargés du stock</h5>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-secondary me-2" onclick="Decharges.startFastScan()"><i class="fas fa-camera"></i> Scanner (Téléphone)</button>
                        <button type="button" class="btn btn-sm btn-primary" onclick="Decharges.addLineItem()"><i class="fas fa-plus"></i> Ajouter Ligne</button>
                    </div>
                </div>

                <!-- Fast Search & Category Menu Bar for Adding Lines -->
                <div class="card p-2 mb-3 bg-light border" style="border-radius:6px;">
                    <div class="d-flex gap-2 align-items-center flex-wrap">
                        <div style="min-width:180px;">
                            <select id="createDechargeCatSelect" class="form-select form-select-sm" onchange="Decharges.filterCreateArticleSearch()">
                                <option value="">📁 Tout le menu (${categories.length} catégories)</option>
                                ${categories.map(c => `<option value="${Utils.escapeHTML(c)}">${Utils.escapeHTML(c)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="position-relative flex-grow-1" style="min-width:240px;">
                            <input type="text" id="createDechargeArticleSearch" class="form-control form-control-sm" placeholder="🔍 Taper pour rechercher et ajouter un article (nom, code, réf)..." autocomplete="off" onfocus="Decharges.openCreateArticleDropdown()" oninput="Decharges.filterCreateArticleSearch()">
                            <div id="createDechargeDropdownList" class="article-picker-dropdown" style="display:none;z-index:1070;"></div>
                        </div>
                        <div>
                            <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="Decharges.addLineItem()"><i class="fas fa-plus me-1"></i> Ligne vide</button>
                        </div>
                    </div>
                </div>
                
                <table class="table table-sm" id="dechargeLinesTable">
                    <thead class="table-light">
                        <tr>
                            <th>Article & Référence</th>
                            <th width="150">Qté sortie</th>
                            <th width="80">Action</th>
                        </tr>
                    </thead>
                    <tbody id="dechargeLines">
                    </tbody>
                </table>
                
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Créer la décharge</button>
                </div>
            </form>
            
            <script>
                window.availableArticlesForDecharge = ${JSON.stringify(articles)};
                Decharges.addLineItem();
            </script>
        `;
        const modalTitle = defaultType === 'bsm' ? '<i class="fas fa-arrow-right-from-bracket text-info me-2"></i> Nouveau Bon de Sortie Magasin (B.S.M)' : '<i class="fas fa-boxes-packing text-primary me-2"></i> Nouvelle Sortie Magasin / Décharge';
        UI.showModal(modalTitle, html, null, 'modal-lg');
    },

    openCreateArticleDropdown: function() {
        this.filterCreateArticleSearch();
    },

    filterCreateArticleSearch: function() {
        const dd = document.getElementById('createDechargeDropdownList');
        if (!dd) return;

        const articles = window.availableArticlesForDecharge || (DB.getArticles ? DB.getArticles() : []);
        const q = (document.getElementById('createDechargeArticleSearch')?.value || '').toLowerCase().trim();
        const cat = document.getElementById('createDechargeCatSelect')?.value || '';

        let filtered = articles;
        if (cat) {
            filtered = filtered.filter(a => a.category === cat || a.family === cat);
        }
        if (q) {
            filtered = filtered.filter(a => {
                return (a.designation && a.designation.toLowerCase().includes(q)) ||
                       (a.code && a.code.toLowerCase().includes(q)) ||
                       (a.barcode && a.barcode.toLowerCase().includes(q)) ||
                       (a.family && a.family.toLowerCase().includes(q)) ||
                       (a.section && a.section.toLowerCase().includes(q));
            });
        }

        if (filtered.length === 0) {
            dd.innerHTML = `<div class="p-3 text-center text-muted small"><i class="fas fa-search me-1"></i> Aucun article trouvé.</div>`;
            dd.style.display = 'block';
            return;
        }

        let headerNotice = '';
        if (cat) {
            headerNotice = `<div class="picker-notice-bar text-primary"><i class="fas fa-folder-open me-1"></i> Catégorie: ${Utils.escapeHTML(cat)} • ${filtered.length} pièces (Défilez)</div>`;
        } else if (!q) {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-boxes-stacked me-1 text-primary"></i> ${filtered.length} pièces au magasin • Défilez pour voir la suite</div>`;
        } else {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-search me-1 text-primary"></i> ${filtered.length} résultat(s) • Défilez</div>`;
        }

        dd.innerHTML = headerNotice + filtered.map(a => {
            const stockQty = Number(a.quantity) || 0;
            return `
                <div class="article-picker-item" onclick="Decharges.selectCreateArticle('${a.id}')" title="Cliquer pour ajouter cette pièce à la décharge">
                    <div class="item-main">
                        <div class="item-title-row">
                            <span class="badge bg-light text-dark border font-monospace" style="font-size:10px;padding:2px 5px;">${Utils.escapeHTML(a.code)}</span>
                            <span class="item-title">${Utils.escapeHTML(a.designation)}</span>
                        </div>
                        <div class="item-sub-row">
                            <span class="badge bg-secondary-subtle text-secondary" style="font-size:9.5px;padding:1px 5px;">${Utils.escapeHTML(a.category || a.family || 'Général')}</span>
                            <span>Stock: <strong class="${stockQty > 0 ? 'text-success' : 'text-danger'}">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</strong></span>
                            ${a.section ? `<span>• Sec. <strong>${Utils.escapeHTML(a.section)}</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="item-badge-col">
                        <span class="badge ${stockQty > 0 ? 'bg-success' : 'bg-danger'} px-2 py-1" style="font-size:11px;font-weight:700;">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</span>
                        <div class="small text-primary mt-1" style="font-size:10px;"><i class="fas fa-plus-circle me-1"></i>Ajouter</div>
                    </div>
                </div>
            `;
        }).join('');
        dd.style.display = 'block';
    },

    selectCreateArticle: function(articleId) {
        this.addLineItem(articleId, 1);
        const searchInput = document.getElementById('createDechargeArticleSearch');
        if (searchInput) searchInput.value = '';
        const dd = document.getElementById('createDechargeDropdownList');
        if (dd) dd.style.display = 'none';
        Utils.showNotification('Article ajouté à la décharge.', 'info');
    },

    addLineItem: function(articleId = null, qty = 1) {
        const tbody = document.getElementById('dechargeLines');
        if (!tbody) return;
        const tr = document.createElement('tr');
        
        const articles = window.availableArticlesForDecharge || (DB.getArticles ? DB.getArticles() : []);
        const byCat = {};
        articles.forEach(a => {
            const cat = a.category || a.family || 'Autres';
            if (!byCat[cat]) byCat[cat] = [];
            byCat[cat].push(a);
        });

        let options = '<option value="">-- Sélectionner article --</option>';
        Object.keys(byCat).sort().forEach(cat => {
            options += `<optgroup label="📁 ${Utils.escapeHTML(cat)}">`;
            byCat[cat].forEach(a => {
                const selected = a.id === articleId ? 'selected' : '';
                options += `<option value="${a.id}" ${selected}>${Utils.escapeHTML(a.code + ' - ' + a.designation)} (Stock: ${a.quantity} ${Utils.escapeHTML(a.unit || 'U')})</option>`;
            });
            options += `</optgroup>`;
        });
        
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm article-select" required>
                    ${options}
                </select>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm qty-input" value="${qty}" min="0.01" step="0.01" required>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    startFastScan: function() {
        let scannerHtml = `
            <div id="cameraScannerContainer" style="width:100%;max-width:500px;margin:0 auto;">
                <div class="alert alert-info py-2" style="font-size:12px;">
                    <i class="fas fa-camera"></i> Dirigez l'appareil photo vers le code-barres de l'article pour l'ajouter automatiquement à la décharge.
                </div>
                <div id="dechargeReader" style="width:100%;min-height:260px;background:#000;border-radius:8px;overflow:hidden;"></div>
                <div class="mt-3 text-center">
                    <button class="btn btn-sm btn-secondary" onclick="Decharges.stopCameraScanner()"><i class="fas fa-stop"></i> Fermer Caméra</button>
                </div>
            </div>
        `;
        
        let container = document.getElementById('dechargeScannerDiv');
        if(!container) {
            container = document.createElement('div');
            container.id = 'dechargeScannerDiv';
            container.className = 'my-3 p-3 bg-light border rounded';
            const table = document.getElementById('dechargeLinesTable');
            table.parentNode.insertBefore(container, table);
        }
        container.innerHTML = scannerHtml;
        
        if (typeof Html5Qrcode === 'undefined') {
            container.innerHTML = '<div class="alert alert-danger">Librairie scanner introuvable. Utilisez la douchette USB ou la saisie manuelle.</div>';
            return;
        }

        Decharges._scanner = new Html5Qrcode("dechargeReader");
        Decharges._scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 280, height: 180 } },
            function(decodedText) {
                const txt = (decodedText || '').trim().toLowerCase();
                const article = DB.getArticles().find(a => 
                    (a.barcode && a.barcode.trim().toLowerCase() === txt) ||
                    (a.code && a.code.trim().toLowerCase() === txt) ||
                    (a.designation && a.designation.trim().toLowerCase() === txt)
                );
                if (article) {
                    Decharges.addLineItem(article.id);
                    Utils.showNotification('Article ajouté : ' + article.designation, 'success');
                } else {
                    Utils.showNotification('Code inconnu : ' + decodedText, 'warning');
                }
            },
            function(error) { /* ignore */ }
        ).catch(function(err) {
            console.error(err);
            container.innerHTML = '<div class="alert alert-danger">Impossible d\'accéder à la caméra. Vérifiez les permissions de votre navigateur.</div>';
        });
    },

    stopCameraScanner: function() {
        if(Decharges._scanner) {
            Decharges._scanner.stop().then(() => {
                const div = document.getElementById('dechargeScannerDiv');
                if(div) div.innerHTML = '';
            }).catch(e => console.error(e));
        }
    },

    submitCreate: function(e) {
        e.preventDefault();
        const trs = document.querySelectorAll('#dechargeLines tr');
        if(trs.length === 0) {
            UI.showAlert('Ajoutez au moins un article.', 'warning');
            return;
        }
        
        const items = [];
        let valid = true;
        trs.forEach(tr => {
            const artId = tr.querySelector('.article-select').value;
            const qty = Number(tr.querySelector('.qty-input').value);
            if(!artId || qty <= 0) valid = false;
            items.push({ articleId: artId, quantity: qty });
        });
        
        if(!valid) {
            UI.showAlert('Veuillez remplir correctement toutes les lignes.', 'warning');
            return;
        }
        
        const articlesList = DB.getArticles();
        const lines = items.map(item => {
            const art = articlesList.find(a => a.id === item.articleId);
            return {
                articleId: item.articleId,
                designation: art ? art.designation : 'Article',
                unit: art ? (art.unit || 'U') : 'U',
                quantity: item.quantity,
                inventoryCode: ''
            };
        });

        const benVal = (document.getElementById('beneficiary').value || '').trim();
        if (benVal && DB.data && DB.data.beneficiaryNames && !DB.data.beneficiaryNames.includes(benVal)) {
            DB.data.beneficiaryNames.push(benVal);
            DB.save();
        }

        const matId = document.getElementById('materialId')?.value || '';
        const fleet = DB.getFleet();
        const mat = fleet.find(f => f.id === matId);

        const dechargeId = Utils.generateId();
        const ref = 'DCH-' + Date.now().toString().slice(-6);
        const typeDocInput = document.querySelector('input[name="typeDoc"]:checked');
        const typeDoc = typeDocInput ? typeDocInput.value : (matId ? 'bsm' : 'decharge');
        const bsmRef = 'BSM-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4);

        const decharge = {
            id: dechargeId,
            ref: ref,
            typeDoc: typeDoc,
            bsmRef: (typeDoc === 'bsm' || typeDoc === 'mixte') ? bsmRef : null,
            date: new Date().toISOString(),
            beneficiary: benVal,
            service: document.getElementById('service').value,
            fromName: document.getElementById('fromName').value,
            qualite: document.getElementById('qualite').value,
            materialId: matId,
            immatriculation: mat ? mat.immatriculation : (document.getElementById('matImmatriculation')?.value || ''),
            materialName: mat ? mat.name : (document.getElementById('matName')?.value || ''),
            materialFamily: mat ? mat.family : (document.getElementById('matFamily')?.value || ''),
            reason: document.getElementById('reason').value,
            items: items,
            lines: lines,
            status: 'En attente',
            createdBy: DB.getCurrentUser().name,
            createdAt: new Date().toISOString(),
            generatePV: document.getElementById('generatePV').checked,
            pvId: null
        };
        
        DB.addDecharge(decharge);

        if (typeof Notify !== 'undefined') {
            const notifTitle = typeDoc === 'bsm' ? ('Nouveau BSM ' + bsmRef) : ('Nouvelle Décharge ' + ref);
            Notify.add({
                title: notifTitle,
                message: `Créé pour ${benVal} (${lines.length} article(s))`,
                category: 'decharge',
                type: 'info',
                module: 'decharges'
            });
        }

        UI.hideModal();
        UI.refresh();
        const alertMsg = (typeDoc === 'bsm' ? `Bon de Sortie Magasin (${bsmRef})` : `Décharge (${ref})`) + ' créé(e) avec succès (En attente).';
        UI.showAlert(alertMsg, 'success');
    },

    showEdit: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if(!d) return;

        // STRICT SECURITY RULE: Once approved/validated, ONLY Admin can modify or rectify!
        if ((d.status === 'Validée' || d.status === 'Approuvée') && !Auth.isAdmin()) {
            UI.showAlert('Accès strictement refusé : Seul un Administrateur peut modifier ou rectifier une décharge validée.', 'danger');
            return;
        }

        const fleet = DB.getFleet();
        const articles = DB.getArticles();
        const depts = (DB.getSettings().departments && DB.getSettings().departments.length > 0) ? DB.getSettings().departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const bens = typeof Beneficiaries !== 'undefined' ? Beneficiaries.getBeneficiariesList() : [];
        const families = [...new Set(fleet.map(f => f.family || 'Autre'))];

        let html = `
            <form id="editDechargeForm" onsubmit="Decharges.submitEdit(event, '${d.id}')">
                ${(d.status === 'Validée' || d.status === 'Approuvée') ? `
                <div class="alert alert-warning d-flex align-items-center mb-3">
                    <i class="fas fa-shield-alt fa-2x text-warning me-3"></i>
                    <div>
                        <strong>Mode Rectification Administrateur :</strong> Cette décharge est déjà <strong>Approuvée</strong>.
                        <div class="small text-muted">Toute modification sera consignée dans le journal d'audit avec votre nom (Admin).</div>
                    </div>
                </div>
                ` : ''}
                <div class="row">
                    <div class="col-12 mb-3">
                        <label class="form-label fw-bold d-block"><i class="fas fa-file-invoice me-1 text-primary"></i> Nature & Type du Document *</label>
                        <div class="p-2 border rounded d-flex gap-3 flex-wrap" style="background:var(--surface-alt);">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="edit_typeDoc" id="edit_typeDocBsm" value="bsm" ${(d.typeDoc==='bsm'||(!d.typeDoc&&(d.workPlanId||d.materialId)))?'checked':''}>
                                <label class="form-check-label fw-bold text-info" for="edit_typeDocBsm" style="cursor:pointer;">
                                    <i class="fas fa-arrow-right-from-bracket me-1"></i> Bon de Sortie Magasin (B.S.M)
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="edit_typeDoc" id="edit_typeDocDecharge" value="decharge" ${(d.typeDoc==='decharge'||(!d.typeDoc&&!d.workPlanId&&!d.materialId))?'checked':''}>
                                <label class="form-check-label fw-bold" style="color:#a855f7;cursor:pointer;" for="edit_typeDocDecharge">
                                    <i class="fas fa-hand-holding me-1"></i> Bon de Décharge (B.D)
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="edit_typeDoc" id="edit_typeDocMixte" value="mixte" ${d.typeDoc==='mixte'?'checked':''}>
                                <label class="form-check-label fw-bold text-warning" for="edit_typeDocMixte" style="cursor:pointer;">
                                    <i class="fas fa-layer-group me-1"></i> Mixte (BSM + Décharge)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Département / Service *</label>
                        <select id="edit_service" class="form-select" required onchange="Decharges.onDepartmentChange(this.value, 'edit_')">
                            <option value="">-- Sélectionner un département --</option>
                            ${depts.map(dep => `<option value="${Utils.escapeHTML(dep)}" ${d.service===dep?'selected':''}>${Utils.escapeHTML(dep)}</option>`).join('')}
                            <option value="_NEW_">+ Ajouter un nouveau département...</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Bénéficiaire (À) *</label>
                        <select id="edit_beneficiary" class="form-select" required onchange="Decharges.onBeneficiaryChange(this.value, 'edit_')">
                            <option value="">-- Sélectionner un bénéficiaire --</option>
                            ${bens.map(b => `<option value="${Utils.escapeHTML(b.name)}" ${d.beneficiary===b.name?'selected':''}>${Utils.escapeHTML(b.name)} — ${Utils.escapeHTML(b.qualite || 'Staff')} (${Utils.escapeHTML(b.department)})</option>`).join('')}
                            <option value="_NEW_">+ Ajouter un nouveau bénéficiaire...</option>
                        </select>
                    </div>

                    <div class="col-12" id="edit_beneficiaryCard"></div>

                    <div class="col-12 mb-3">
                        <label class="form-label fw-bold d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-truck text-primary me-1"></i> Matériel / Camion / Véhicule concerné</span>
                            <small class="text-muted fw-normal">(${fleet.length} véhicules au parc — tapez ou faites défiler)</small>
                        </label>
                        
                        <div class="position-relative" id="edit_truckSelectorWrap">
                            <div class="input-group">
                                <span class="input-group-text" style="background:var(--surface-alt);color:var(--text-muted);border-color:var(--border);"><i class="fas fa-search"></i></span>
                                <input type="text" id="edit_truckSearchInput" class="form-control" value="${d.immatriculation ? `[ ${Utils.escapeHTML(d.immatriculation)} ] ${Utils.escapeHTML(d.materialName || '')}` : ''}" placeholder="Rechercher par immatriculation ou nom (ex: 01234, MAN, ACTROS)..." autocomplete="off" onfocus="Decharges.openTruckDropdown('edit_')" oninput="Decharges.filterTrucks(this.value, 'edit_')">
                                <button type="button" class="btn btn-outline-secondary" title="Effacer la sélection" onclick="Decharges.clearTruckSelection('edit_')"><i class="fas fa-times"></i></button>
                                <button type="button" class="btn btn-outline-primary" title="Afficher tous les camions" onclick="Decharges.toggleTruckDropdown('edit_')"><i class="fas fa-chevron-down"></i></button>
                            </div>
                            
                            <div id="edit_truckDropdownList" class="dropdown-menu w-100 p-1 shadow-lg" style="display:none; max-height: 165px; overflow-y: auto; z-index: 1050; border: 1px solid var(--border); background: var(--surface);">
                                <div class="p-2 border-bottom text-muted small d-flex justify-content-between align-items-center">
                                    <span>${fleet.length} véhicules au parc — Cliquez pour sélectionner</span>
                                    <button type="button" class="btn btn-xs btn-outline-danger" onclick="Decharges.selectTruck('', '', '', '', 'edit_', '')">Aucun matériel</button>
                                </div>
                                <div id="edit_truckOptionsContainer">
                                    ${fleet.map(m => `
                                        <div class="truck-option-item p-2 rounded d-flex align-items-center justify-content-between border-bottom" style="cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='transparent'" onclick="Decharges.selectTruck('${m.id}', '${Utils.escapeHTML(m.immatriculation)}', '${Utils.escapeHTML(m.name)}', '${Utils.escapeHTML(m.family || 'Camion')}', 'edit_', '${m.status}')" data-immat="${Utils.escapeHTML(m.immatriculation.toLowerCase())}" data-name="${Utils.escapeHTML(m.name.toLowerCase())}" data-family="${Utils.escapeHTML((m.family||'').toLowerCase())}">
                                            <div>
                                                <span class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1px;font-size:12px;padding:3px 7px;">${Utils.escapeHTML(m.immatriculation)}</span>
                                                <strong class="ms-2" style="font-size:13px;color:var(--text);">${Utils.escapeHTML(m.name)}</strong>
                                                <span class="badge bg-secondary ms-1" style="font-size:10px;">${Utils.escapeHTML(m.family || 'Camion')}</span>
                                            </div>
                                            <span class="badge bg-${m.status === 'Actif' ? 'success' : m.status === 'En panne' ? 'danger' : 'warning'}" style="font-size:10px;">${m.status}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <input type="hidden" id="edit_materialId" value="${Utils.escapeHTML(d.materialId || '')}">
                        <input type="hidden" id="edit_matImmatriculation" value="${Utils.escapeHTML(d.immatriculation || '')}">
                        <input type="hidden" id="edit_matName" value="${Utils.escapeHTML(d.materialName || '')}">
                        <input type="hidden" id="edit_matFamily" value="${Utils.escapeHTML(d.materialFamily || '')}">
                    </div>

                    <div class="col-12" id="edit_materialCard"></div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label">De (Remettant) *</label>
                        <input type="text" id="edit_fromName" class="form-control" value="${Utils.escapeHTML(d.fromName || '')}" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Qualité du bénéficiaire</label>
                        <input type="text" id="edit_qualite" class="form-control" value="${Utils.escapeHTML(d.qualite || '')}">
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label">Motif / Observations</label>
                        <textarea id="edit_reason" class="form-control" rows="2">${Utils.escapeHTML(d.reason || '')}</textarea>
                    </div>
                </div>
                
                <hr>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0 fw-bold"><i class="fas fa-boxes text-secondary me-1"></i> Articles de la décharge</h5>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-secondary me-2" onclick="Decharges.startFastScan()"><i class="fas fa-camera"></i> Scanner (Téléphone)</button>
                        <button type="button" class="btn btn-sm btn-primary" onclick="Decharges.addLineItem()"><i class="fas fa-plus"></i> Ajouter Ligne</button>
                    </div>
                </div>
                
                <table class="table table-sm" id="dechargeLinesTable">
                    <thead class="table-light">
                        <tr>
                            <th>Article & Référence</th>
                            <th width="150">Qté</th>
                            <th width="80">Action</th>
                        </tr>
                    </thead>
                    <tbody id="dechargeLines">
                        ${d.items.map(item => {
                            const art = articles.find(a => a.id === item.articleId);
                            if(!art) return '';
                            return `
                            <tr>
                                <td>
                                    <select class="form-select form-select-sm article-select" required>
                                        <option value="${art.id}">${Utils.escapeHTML(art.code + ' - ' + art.designation)} (Stock: ${art.quantity})</option>
                                    </select>
                                </td>
                                <td><input type="number" class="form-control form-control-sm qty-input" min="0.01" step="0.01" value="${item.quantity}" required></td>
                                <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Sauvegarder modifications</button>
                </div>
            </form>
        `;
        
        UI.showModal('Modifier Décharge ' + d.ref, html, null, 'modal-lg');
        setTimeout(() => {
            if (d.beneficiary) Decharges.onBeneficiaryChange(d.beneficiary, 'edit_');
            if (d.materialId) Decharges.onMaterialChange(d.materialId, 'edit_');
        }, 120);
    },

    submitEdit: function(e, id) {
        e.preventDefault();
        const d = DB.getDecharges().find(x => x.id === id);
        if(!d) return;

        // STRICT SECURITY RULE: Once approved or validated by Chef Section, ONLY Admin/DG can modify!
        if ((d.status === 'Validée' || d.status === 'Approuvée') && !Auth.isAdmin()) {
            UI.showAlert('Accès strictement refusé : Seul le DG (Administrateur) peut modifier une décharge déjà validée.', 'danger');
            return;
        }

        const trs = document.querySelectorAll('#dechargeLines tr');
        if(trs.length === 0) {
            UI.showAlert('Ajoutez au moins un article.', 'warning');
            return;
        }
        
        const items = [];
        let valid = true;
        trs.forEach(tr => {
            const artId = tr.querySelector('.article-select').value;
            const qty = Number(tr.querySelector('.qty-input').value);
            if(!artId || qty <= 0) valid = false;
            items.push({ articleId: artId, quantity: qty });
        });
        
        if(!valid) {
            UI.showAlert('Veuillez remplir correctement toutes les lignes.', 'warning');
            return;
        }
        
        const articlesListEdit = DB.getArticles();
        const lines = items.map(item => {
            const art = articlesListEdit.find(a => a.id === item.articleId);
            return {
                articleId: item.articleId,
                designation: art ? art.designation : 'Article',
                unit: art ? (art.unit || 'U') : 'U',
                quantity: item.quantity,
                inventoryCode: ''
            };
        });

        const benEditVal = (document.getElementById('edit_beneficiary').value || '').trim();
        if (benEditVal && DB.data && DB.data.beneficiaryNames && !DB.data.beneficiaryNames.includes(benEditVal)) {
            DB.data.beneficiaryNames.push(benEditVal);
            DB.save();
        }

        const matId = document.getElementById('edit_materialId')?.value || '';
        const fleet = DB.getFleet();
        const mat = fleet.find(f => f.id === matId);

        const editTypeDocInput = document.querySelector('input[name="edit_typeDoc"]:checked');
        if (editTypeDocInput) {
            d.typeDoc = editTypeDocInput.value;
            if ((d.typeDoc === 'bsm' || d.typeDoc === 'mixte') && !d.bsmRef) {
                d.bsmRef = 'BSM-' + new Date().getFullYear() + '-' + String(d.ref || '').replace(/[^0-9]/g, '').slice(-4);
            }
        }

        d.beneficiary = benEditVal;
        d.service = document.getElementById('edit_service').value;
        d.fromName = document.getElementById('edit_fromName').value;
        d.qualite = document.getElementById('edit_qualite').value;
        d.materialId = matId;
        d.immatriculation = mat ? mat.immatriculation : (document.getElementById('edit_matImmatriculation')?.value || '');
        d.materialName = mat ? mat.name : (document.getElementById('edit_matName')?.value || '');
        d.materialFamily = mat ? mat.family : (document.getElementById('edit_matFamily')?.value || '');
        d.reason = document.getElementById('edit_reason').value;
        d.items = items;
        d.lines = lines;
        d.lastModifiedBy = DB.getCurrentUser().name;
        d.lastModifiedAt = new Date().toISOString();
        
        DB.updateDecharge(d);

        // Record in audit log
        if (DB.data && DB.data.auditLog) {
            DB.data.auditLog.push({
                action: 'UPDATE',
                col: 'decharges',
                id: d.id,
                user: d.lastModifiedBy,
                date: d.lastModifiedAt,
                details: `Décharge ${d.ref} rectifiée pour ${d.beneficiary}`
            });
            DB.save();
        }

        if (typeof Notify !== 'undefined') {
            Notify.add({
                title: 'Décharge Rectifiée',
                message: `Décharge ${d.ref} modifiée par ${d.lastModifiedBy}`,
                category: 'decharge',
                type: 'warning',
                module: 'decharges'
            });
        }

        UI.hideModal();
        UI.refresh();
        UI.showAlert('Décharge modifiée et tracée dans l\'audit avec succès.', 'success');
    },

    showDetail: function(id) {
        const decharge = DB.getDecharges().find(d => d.id === id);
        if(!decharge) return;
        const articles = DB.getArticles();
        const fleet = DB.getFleet();
        
        let mat = null;
        if (decharge.materialId) {
            mat = fleet.find(f => f.id === decharge.materialId);
        }
        const matName = mat ? mat.name : (decharge.materialName || '');
        const matImmat = mat ? mat.immatriculation : (decharge.immatriculation || '');
        const matFamily = mat ? mat.family : (decharge.materialFamily || '');
        
        const tDoc = decharge.typeDoc || (decharge.workPlanId || decharge.materialId ? 'bsm' : 'decharge');
        const bsmRef = decharge.bsmRef || (tDoc === 'bsm' ? ('BSM-' + String(decharge.ref || '').replace(/[^0-9]/g, '').slice(-4)) : null);
        let docTypeBadge = '';
        if (tDoc === 'bsm') docTypeBadge = '<span class="badge bg-info text-dark ms-2"><i class="fas fa-arrow-right-from-bracket me-1"></i>Bon de Sortie Magasin (B.S.M)</span>';
        else if (tDoc === 'mixte') docTypeBadge = '<span class="badge bg-warning text-dark ms-2"><i class="fas fa-layer-group me-1"></i>Mixte (BSM + Décharge)</span>';
        else docTypeBadge = '<span class="badge text-white ms-2" style="background:#7c3aed;"><i class="fas fa-hand-holding me-1"></i>Bon de Décharge (B.D)</span>';

        const html = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h4 class="mb-0 fw-bold d-inline-block">${Utils.escapeHTML(decharge.ref)}</h4>
                    ${bsmRef ? `<span class="badge bg-dark text-info font-monospace ms-2" style="font-size:12px;">${Utils.escapeHTML(bsmRef)}</span>` : ''}
                    ${docTypeBadge}
                </div>
                <span class="badge bg-${decharge.status === 'Validée' || decharge.status === 'Approuvée' ? 'success' : decharge.status === 'Rejetée' ? 'danger' : 'warning'} fs-6">${decharge.status}</span>
            </div>
            
            <!-- Audit & Traçabilité Box -->
            <div class="card mb-3" style="background:var(--surface-alt);border:1px solid var(--border);">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <span class="text-muted"><i class="fas fa-user-plus"></i> Créée par:</span> <strong>${Utils.escapeHTML(decharge.createdBy || '-')}</strong>
                            <small class="text-muted ms-2">${Utils.formatDateTime(decharge.date || decharge.createdAt || decharge.servedAt, decharge.ref || bsmRef)}</small>
                        </div>
                        <div>
                            ${decharge.validatedBy ? `
                                <span class="badge bg-success p-2" style="font-size:11px;"><i class="fas fa-check-double"></i> Validée par: <strong>${Utils.escapeHTML(decharge.validatedBy)}</strong> le ${Utils.formatDateTime(decharge.validatedAt, decharge.ref || bsmRef)}</span>
                            ` : ''}
                            ${decharge.lastModifiedBy ? `
                                <span class="badge bg-warning text-dark p-2" style="font-size:11px;"><i class="fas fa-pen"></i> Rectifiée par: <strong>${Utils.escapeHTML(decharge.lastModifiedBy)}</strong> le ${Utils.formatDateTime(decharge.lastModifiedAt, decharge.ref || bsmRef)}</span>
                            ` : (!decharge.validatedBy ? `<span class="badge bg-secondary p-2" style="font-size:11px;"><i class="fas fa-check"></i> Document initial (Non modifié)</span>` : '')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vehicle Card if assigned -->
            ${(mat || matImmat) ? `
                <div class="card mb-3" style="border:1px solid var(--border);background:var(--surface-alt);border-radius:6px;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-3">
                                <div style="font-size:26px;color:var(--primary);"><i class="fas fa-truck-moving"></i></div>
                                <div>
                                    <h6 class="mb-1 fw-bold" style="color:var(--text);font-size:14px;">${Utils.escapeHTML(matName || 'Véhicule')}</h6>
                                    <div>
                                        <span class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1px;font-size:12px;padding:3px 8px;">
                                            <i class="fas fa-id-card me-1"></i> ${Utils.escapeHTML(matImmat)}
                                        </span>
                                        ${matFamily ? `<span class="badge bg-secondary ms-1">${Utils.escapeHTML(matFamily)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="UI.hideModal();Consumption.viewForTruck('${decharge.materialId || ''}')">
                                    <i class="fas fa-chart-pie"></i> Voir Analyse & Consommation Camion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="row mb-4">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Date d'émission:</strong> ${new Date(decharge.date).toLocaleString('fr-FR')}</p>
                    <p class="mb-1"><strong>De (Remettant):</strong> ${Utils.escapeHTML(decharge.fromName || '-')}</p>
                    <p class="mb-1"><strong>Affectation Matériel:</strong> ${mat ? Utils.escapeHTML(mat.name + ' (' + mat.immatriculation + ')') : (matImmat ? Utils.escapeHTML(matName + ' (' + matImmat + ')') : 'Aucune (Sortie générale)')}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Bénéficiaire (À):</strong> <strong>${Utils.escapeHTML(decharge.beneficiary)}</strong></p>
                    <p class="mb-1"><strong>Département / Service:</strong> <span class="badge bg-light text-dark border">${Utils.escapeHTML(decharge.service || '-')}</span></p>
                    <p class="mb-1"><strong>Qualité / Fonction:</strong> ${Utils.escapeHTML(decharge.qualite || '-')}</p>
                </div>
                <div class="col-12 mt-2">
                    <p class="mb-0"><strong>Motif / Observations:</strong> ${Utils.escapeHTML(decharge.reason || '-')}</p>
                </div>
            </div>
            
            <h5>Articles déchargés</h5>
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th width="40">N°</th>
                        <th>Code</th>
                        <th>Désignation</th>
                        <th>Quantité</th>
                    </tr>
                </thead>
                <tbody>
                    ${decharge.items.map((item, idx) => {
                        const art = articles.find(a => a.id === item.articleId);
                        return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><code>${art ? Utils.escapeHTML(art.code) : '?'}</code></td>
                            <td>${art ? Utils.escapeHTML(art.designation) : 'Article inconnu'}</td>
                            <td><strong>${item.quantity}</strong> ${art ? Utils.escapeHTML(art.unit) : ''}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="mt-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-outline-info fw-bold" onclick="Decharges.printBSM('${decharge.id}')"><i class="fas fa-arrow-right-from-bracket me-1"></i> Imprimer BSM</button>
                    <button type="button" class="btn btn-outline-secondary" onclick="Decharges.downloadBsmDocx('${decharge.id}')" title="Télécharger BSM Word"><i class="fas fa-file-word me-1"></i> BSM Word</button>
                    <button type="button" class="btn btn-outline-primary" onclick="Decharges.exportPDF('${decharge.id}')"><i class="fas fa-file-pdf me-1"></i> PDF</button>
                    <button type="button" class="btn btn-outline-secondary" onclick="Decharges.downloadDocx('${decharge.id}')"><i class="fas fa-file-lines me-1"></i> Décharge Word</button>
                    <button type="button" class="btn btn-outline-primary" onclick="Decharges.showEdit('${decharge.id}')"><i class="fas fa-edit me-1"></i> Modifier</button>
                </div>
                <div class="d-flex gap-2">
                    ${decharge.status === 'En attente' ? `
                        <button class="btn btn-success" onclick="Decharges.approve('${decharge.id}')"><i class="fas fa-check"></i> Approuver</button>
                        <button class="btn btn-danger" onclick="Decharges.reject('${decharge.id}')"><i class="fas fa-times"></i> Rejeter</button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="UI.hideModal()">Fermer</button>
                </div>
            </div>
        `;
        UI.showModal('Détails Décharge', html, null, 'modal-lg');
    },
    showServeModal: function(id) {
        if (!Auth.isAdmin() && !Auth.isMag()) {
            UI.showAlert('Accès refusé : Seul le magasinier peut servir les décharges au comptoir.', 'danger');
            return;
        }

        const decharge = DB.getDecharges().find(d => d.id === id);
        if (!decharge) return;
        const articles = DB.getArticles();

        const allArticles = DB.getArticles ? DB.getArticles() : [];
        const settings = (DB.getSettings && DB.getSettings()) || {};
        const categories = [...new Set([
            ...(settings.articleCategories || []),
            ...allArticles.map(a => a.category).filter(Boolean),
            ...allArticles.map(a => a.family).filter(Boolean)
        ])].filter(Boolean).sort();

        const html = `
            <form id="serveDechargeForm" onsubmit="Decharges.submitServe(event, '${id}')">
                <div class="alert alert-info d-flex justify-content-between align-items-center mb-3 p-3">
                    <div class="d-flex align-items-center gap-3">
                        <i class="fas fa-store fa-2x text-primary"></i>
                        <div>
                            <strong style="font-size:15px;" class="text-dark">Validation & Sortie Comptoir — ${Utils.escapeHTML(decharge.ref)}</strong>
                            <div class="small text-muted mt-1">
                                Bénéficiaire : <strong class="text-dark">${Utils.escapeHTML(decharge.beneficiary)}</strong> · Service : <strong class="text-dark">${Utils.escapeHTML(decharge.service || 'N/A')}</strong>
                                ${decharge.materialName ? ` · Véhicule: <span class="badge bg-dark">${Utils.escapeHTML(decharge.immatriculation || '-')}</span> ${Utils.escapeHTML(decharge.materialName)}` : ''}
                            </div>
                        </div>
                    </div>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-primary bg-white fw-bold shadow-sm" onclick="Cart.showRequestPass('${decharge.preOrderId || decharge.id}')" title="Afficher le Pass Numérique QR Code">
                            <i class="fas fa-qrcode me-1"></i> Pass QR
                        </button>
                    </div>
                </div>

                <!-- Instant Barcode & QR Code Scan Station for Counter Fulfillment -->
                <div class="card p-3 mb-3 bg-light border" style="border-left: 4px solid #2563eb !important; border-radius: 8px;">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary px-2 py-1"><i class="fas fa-barcode me-1"></i> MODE SCAN PIÈCE PAR PIÈCE</span>
                            <small class="text-muted">Flashez chaque pièce sortie du rayonnage pour valider sa délivrance</small>
                        </div>
                        <div class="d-flex gap-1 flex-wrap">
                            <button type="button" class="btn btn-xs btn-outline-primary bg-white fw-bold" onclick="Decharges.fillAllServed()" title="Valider toutes les quantités demandées en 1 clic">
                                <i class="fas fa-bolt me-1"></i> Tout Pré-remplir
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-secondary bg-white" onclick="Decharges.resetAllServed()" title="Remettre à zéro pour scanner">
                                <i class="fas fa-rotate me-1"></i> Remettre à 0
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-success bg-white fw-bold" onclick="Decharges.toggleAddExtraItemBar('${id}')" title="Ajouter un article supplémentaire demandé au comptoir">
                                <i class="fas fa-plus-circle me-1"></i> + Ajouter un Article
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-dark bg-white" id="btnToggleServeCam" onclick="Decharges.toggleServeCamera('${id}')">
                                <i class="fas fa-camera me-1"></i> <span id="serveCamBtnText">Caméra</span>
                            </button>
                        </div>
                    </div>

                    <!-- Clean single-line barcode input -->
                    <div style="display:flex;align-items:stretch;gap:0;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#fff;">
                        <span style="display:flex;align-items:center;padding:0 14px;background:#f8fafc;border-right:1px solid #cbd5e1;color:#2563eb;">
                            <i class="fas fa-barcode fa-lg"></i>
                        </span>
                        <input type="text" id="serveModalBarcodeInput" style="flex:1;height:42px;border:none;padding:0 14px;font-size:14px;outline:none;" placeholder="Flashez le code-barres / QR d'une pièce prélevée dans le rayon (ex: PR-001)..." autofocus onkeydown="if(event.key==='Enter'){ event.preventDefault(); Decharges.handleModalBarcodeScan(this.value, '${id}'); this.value=''; }">
                        <button type="button" class="btn btn-primary fw-bold" style="border-radius:0;padding:0 22px;white-space:nowrap;display:flex;align-items:center;gap:6px;" onclick="const el=document.getElementById('serveModalBarcodeInput'); Decharges.handleModalBarcodeScan(el.value, '${id}'); el.value='';">
                            <i class="fas fa-check"></i> Valider Pièce
                        </button>
                    </div>

                    <!-- Camera Reader Container -->
                    <div id="serveCameraContainer" style="display:none;margin-top:10px;text-align:center;">
                        <div id="serveModalReader" style="width:100%;max-width:340px;height:240px;margin:0 auto;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#000;"></div>
                    </div>

                    <!-- Collapsible Extra Article Addition Form with Live Search & Menu Picker -->
                    <div id="addExtraItemContainer" style="display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin-top:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                        <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-success-subtle">
                            <strong class="text-success small fw-bold d-flex align-items-center gap-2">
                                <i class="fas fa-plus-circle fa-lg"></i>
                                <span>Ajouter une pièce demandée au comptoir (Recherche ou Menu Catégorie)</span>
                            </strong>
                            <button type="button" class="btn-close btn-close-sm" onclick="document.getElementById('addExtraItemContainer').style.display='none';" title="Fermer"></button>
                        </div>

                        <div class="row g-2 align-items-center">
                            <!-- 1. Category / Menu Picker -->
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-muted mb-1 d-flex align-items-center gap-1">
                                    <i class="fas fa-bars-staggered text-primary"></i> 1. Menu Catégorie
                                </label>
                                <select id="extraArticleCategory" class="form-select form-select-sm" onchange="Decharges.filterExtraModalArticles('${id}')">
                                    <option value="">📁 Tout le menu magasin (${categories.length} catégories)</option>
                                    ${categories.map(c => `<option value="${Utils.escapeHTML(c)}">${Utils.escapeHTML(c)}</option>`).join('')}
                                </select>
                            </div>

                            <!-- 2. Live Search Input -->
                            <div class="col-md-5">
                                <label class="form-label small fw-bold text-muted mb-1 d-flex align-items-center gap-1">
                                    <i class="fas fa-magnifying-glass text-primary"></i> 2. Rechercher la pièce
                                </label>
                                <div class="position-relative">
                                    <input type="text" id="extraArticleSearchInput" class="form-control form-control-sm" placeholder="Tapez désignation, code (ex: PR-001), réf, EAN..." autocomplete="off" onfocus="Decharges.openExtraModalDropdown('${id}')" oninput="Decharges.filterExtraModalArticles('${id}')" onkeydown="if(event.key==='Enter'){event.preventDefault();}">
                                    <button type="button" id="extraArticleClearBtn" class="btn btn-xs position-absolute end-0 top-50 translate-middle-y me-1 text-muted" style="display:none;border:none;background:none;" onclick="Decharges.clearExtraArticleSearch('${id}')" title="Effacer"><i class="fas fa-times"></i></button>

                                    <!-- Floating Search & Menu Results Dropdown -->
                                    <div id="extraArticleDropdownList" class="article-picker-dropdown" style="display:none;"></div>
                                </div>
                            </div>

                            <!-- 3. Quantity Stepper -->
                            <div class="col-md-2 col-6">
                                <label class="form-label small fw-bold text-muted mb-1">3. Qté</label>
                                <div class="input-group input-group-sm">
                                    <button type="button" class="btn btn-outline-secondary" onclick="const q=document.getElementById('extraArticleQty'); if(q && q.value > 1) q.value=Number(q.value)-1;">-</button>
                                    <input type="number" id="extraArticleQty" class="form-control text-center fw-bold" value="1" min="1" step="1">
                                    <button type="button" class="btn btn-outline-secondary" onclick="const q=document.getElementById('extraArticleQty'); if(q) q.value=Number(q.value)+1;">+</button>
                                </div>
                            </div>

                            <!-- 4. Add Button -->
                            <div class="col-md-1 col-6 d-flex align-items-end">
                                <div class="w-100">
                                    <label class="form-label small fw-bold text-muted mb-1 d-none d-md-block">&nbsp;</label>
                                    <button type="button" id="extraArticleAddBtn" class="btn btn-success btn-sm w-100 fw-bold" disabled onclick="Decharges.submitExtraModalItem('${id}')" title="Ajouter cette pièce à la décharge">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Hidden input to store selected article ID -->
                        <input type="hidden" id="extraArticleSelectedId" value="">

                        <!-- Selected Article Confirmation Preview Banner -->
                        <div id="extraArticleSelectedCard" style="display:none;margin-top:10px;padding:8px 12px;background:#ffffff;border:1px solid #86efac;border-radius:6px;" class="align-items-center justify-content-between">
                            <div id="extraArticleSelectedText" class="small"></div>
                            <button type="button" class="btn btn-xs btn-outline-danger" onclick="Decharges.clearExtraArticleSelection('${id}')" title="Changer d'article">
                                <i class="fas fa-times me-1"></i> Annuler sélection
                            </button>
                        </div>
                    </div>

                    <div id="serveScanFeedback" class="small mt-2" style="min-height:22px;">
                        <span class="text-muted"><i class="fas fa-circle-info text-primary me-1"></i> Le système attend votre scan. Flashez chaque pièce pour incrémenter sa délivrance.</span>
                    </div>
                </div>

                <div class="table-responsive mb-3" style="border:1px solid var(--border);border-radius:8px;">
                    <table class="table table-hover align-middle mb-0" style="min-width:760px;">
                        <thead class="table-light">
                            <tr>
                                <th style="min-width:280px;">Article & Emplacement</th>
                                <th class="text-center" width="110">Stock Dispo</th>
                                <th class="text-center" width="100">Demandé</th>
                                <th class="text-center" width="180">Quantité Servie</th>
                                <th class="text-center" width="160">Statut Ligne</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${decharge.items.map((item, idx) => {
                                const art = articles.find(a => a.id === item.articleId);
                                const stockVal = art ? Number(art.quantity) : 0;
                                const reqQty = Number(item.quantity);
                                const defaultServed = 0; // Starts at 0, waits for what is scanned!
                                return `
                                <tr id="serveRow_${idx}">
                                    <td>
                                        <div class="fw-bold text-dark">${Utils.escapeHTML(art ? art.designation : 'Article')}</div>
                                        <div class="small text-muted d-flex align-items-center gap-1 mt-1">
                                            <span class="badge bg-light text-dark border font-monospace" style="font-size:11px;">
                                                <i class="fas fa-barcode text-secondary me-1"></i>${Utils.escapeHTML(art ? art.code : item.articleId)}
                                            </span>
                                            ${art?.barcode ? `<span class="badge bg-white text-muted border font-monospace" style="font-size:10px;">EAN: ${Utils.escapeHTML(art.barcode)}</span>` : ''}
                                            <span>— Section: <strong>${Utils.escapeHTML(art?.section || 'A')}</strong></span>
                                        </div>
                                        <input type="hidden" class="serve-article-id" value="${item.articleId}">
                                        <input type="hidden" class="serve-requested-qty" value="${reqQty}">
                                    </td>
                                    <td class="text-center">
                                        <span class="badge ${stockVal >= reqQty ? 'bg-success' : stockVal > 0 ? 'bg-warning text-dark' : 'bg-danger'} px-2 py-1">
                                            ${stockVal} ${art?.unit || 'U'}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <strong class="serve-req-display fs-6">${reqQty}</strong> <small class="text-muted">${art?.unit || 'U'}</small>
                                    </td>
                                    <td>
                                        <div class="d-flex align-items-center justify-content-center gap-1">
                                            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="const q=this.nextElementSibling; if(q && q.value > 0){ q.value=Number(q.value)-1; Decharges.updateServeLineStatus(${idx}, ${reqQty}); }" title="Diminuer">-</button>
                                            <input type="number" class="form-control form-control-sm text-center serve-qty-input fw-bold" style="width:55px;" min="0" max="${stockVal}" step="1" value="${defaultServed}" oninput="Decharges.updateServeLineStatus(${idx}, ${reqQty})">
                                            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="const q=this.previousElementSibling; if(q && q.value < ${stockVal}){ q.value=Number(q.value)+1; Decharges.updateServeLineStatus(${idx}, ${reqQty}); }" title="Augmenter">+</button>
                                            <button type="button" class="btn btn-xs btn-outline-primary ms-1 fw-bold" onclick="Decharges.handleModalBarcodeScan('${art ? art.code : item.articleId}', '${id}')" title="Flasher cette pièce">
                                                <i class="fas fa-barcode me-1"></i>Flash
                                            </button>
                                        </div>
                                    </td>
                                    <td class="text-center" id="serveLineStatus_${idx}">
                                        <span class="badge bg-secondary"><i class="fas fa-clock me-1"></i> En attente (0/${reqQty})</span>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">Observations ou motif si pièces non servies</label>
                    <textarea name="remarks" class="form-control form-control-sm" rows="2" placeholder="Ex: Reste 1 filtre non servi pour cause de rupture Naftal, commande fournisseur en cours..."></textarea>
                </div>

                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <button type="button" class="btn btn-outline-secondary" onclick="Decharges.stopServeCamera(); UI.hideModal();">Annuler</button>
                    <button type="submit" class="btn btn-success fw-bold px-4 py-2"><i class="fas fa-check-double me-2"></i> Valider la Sortie & Approuver la Décharge</button>
                </div>
            </form>
        `;

        UI.showModal('Comptoir Magasin : Servir Décharge ' + decharge.ref, html, null, 'modal-xl');
    },

    _serveScanner: null,

    toggleAddExtraItemBar: function(dechargeId) {
        const c = document.getElementById('addExtraItemContainer');
        if (!c) return;
        const isHidden = (c.style.display === 'none');
        c.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            setTimeout(() => {
                const searchInput = document.getElementById('extraArticleSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    this.filterExtraModalArticles(dechargeId);
                }
            }, 50);
        }
    },

    openExtraModalDropdown: function(dechargeId) {
        this.filterExtraModalArticles(dechargeId);
    },

    filterExtraModalArticles: function(dechargeId) {
        const dd = document.getElementById('extraArticleDropdownList');
        if (!dd) return;

        const allArticles = DB.getArticles ? DB.getArticles() : [];
        const q = (document.getElementById('extraArticleSearchInput')?.value || '').toLowerCase().trim();
        const cat = document.getElementById('extraArticleCategory')?.value || '';
        const clearBtn = document.getElementById('extraArticleClearBtn');
        if (clearBtn) clearBtn.style.display = (q || cat) ? 'inline-block' : 'none';

        let filtered = allArticles;
        if (cat) {
            filtered = filtered.filter(a => a.category === cat || a.family === cat);
        }
        if (q) {
            filtered = filtered.filter(a => {
                return (a.designation && a.designation.toLowerCase().includes(q)) ||
                       (a.code && a.code.toLowerCase().includes(q)) ||
                       (a.barcode && a.barcode.toLowerCase().includes(q)) ||
                       (a.family && a.family.toLowerCase().includes(q)) ||
                       (a.section && a.section.toLowerCase().includes(q));
            });
        }

        if (filtered.length === 0) {
            dd.innerHTML = `<div class="p-3 text-center text-muted small"><i class="fas fa-search me-1"></i> Aucun article trouvé dans le magasin.</div>`;
            dd.style.display = 'block';
            return;
        }

        let headerNotice = '';
        if (cat) {
            headerNotice = `<div class="picker-notice-bar text-primary"><i class="fas fa-folder-open me-1"></i> Catégorie: ${Utils.escapeHTML(cat)} • ${filtered.length} pièces (Défilez)</div>`;
        } else if (!q) {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-boxes-stacked me-1 text-primary"></i> ${filtered.length} pièces au magasin • Défilez pour voir la suite</div>`;
        } else {
            headerNotice = `<div class="picker-notice-bar"><i class="fas fa-search me-1 text-primary"></i> ${filtered.length} résultat(s) • Défilez</div>`;
        }

        dd.innerHTML = headerNotice + filtered.map(a => {
            const stockQty = Number(a.quantity) || 0;
            return `
                <div class="article-picker-item" onclick="Decharges.selectExtraModalArticle('${a.id}', '${dechargeId}')" title="Cliquer pour sélectionner cette pièce">
                    <div class="item-main">
                        <div class="item-title-row">
                            <span class="badge bg-light text-dark border font-monospace" style="font-size:10px;padding:2px 5px;">${Utils.escapeHTML(a.code)}</span>
                            <span class="item-title">${Utils.escapeHTML(a.designation)}</span>
                        </div>
                        <div class="item-sub-row">
                            <span class="badge bg-secondary-subtle text-secondary" style="font-size:9.5px;padding:1px 5px;">${Utils.escapeHTML(a.category || a.family || 'Général')}</span>
                            <span>Stock: <strong class="${stockQty > 0 ? 'text-success' : 'text-danger'}">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</strong></span>
                            ${a.section ? `<span>• Sec. <strong>${Utils.escapeHTML(a.section)}</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="item-badge-col">
                        <span class="badge ${stockQty > 0 ? 'bg-success' : 'bg-danger'} px-2 py-1" style="font-size:11px;font-weight:700;">${stockQty} ${Utils.escapeHTML(a.unit || 'U')}</span>
                        <div class="small text-primary mt-1" style="font-size:10px;"><i class="fas fa-hand-pointer me-1"></i>Choisir</div>
                    </div>
                </div>
            `;
        }).join('');
        dd.style.display = 'block';
    },

    selectExtraModalArticle: function(articleId, dechargeId) {
        const allArticles = DB.getArticles ? DB.getArticles() : [];
        const art = allArticles.find(a => a.id === articleId);
        if (!art) return;

        const idInput = document.getElementById('extraArticleSelectedId');
        if (idInput) idInput.value = art.id;

        const searchInput = document.getElementById('extraArticleSearchInput');
        if (searchInput) searchInput.value = `[${art.code}] ${art.designation}`;

        const dd = document.getElementById('extraArticleDropdownList');
        if (dd) dd.style.display = 'none';

        const card = document.getElementById('extraArticleSelectedCard');
        const text = document.getElementById('extraArticleSelectedText');
        if (card && text) {
            const stockQty = Number(art.quantity) || 0;
            text.innerHTML = `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="badge bg-success"><i class="fas fa-check me-1"></i> Sélectionné</span>
                    <strong>${Utils.escapeHTML(art.designation)}</strong>
                    <span class="badge bg-light text-dark border font-monospace">${Utils.escapeHTML(art.code)}</span>
                    <span class="badge ${stockQty > 0 ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'}">Stock: ${stockQty} ${Utils.escapeHTML(art.unit || 'U')}</span>
                    ${art.section ? `<span class="text-muted">Section: <strong>${Utils.escapeHTML(art.section)}</strong></span>` : ''}
                </div>
            `;
            card.style.display = 'flex';
        }

        const addBtn = document.getElementById('extraArticleAddBtn');
        if (addBtn) addBtn.disabled = false;

        const qtyInput = document.getElementById('extraArticleQty');
        if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
        }
    },

    submitExtraModalItem: function(dechargeId) {
        const idInput = document.getElementById('extraArticleSelectedId');
        const artId = idInput ? idInput.value : '';
        const qtyInput = document.getElementById('extraArticleQty');
        const qty = Number(qtyInput ? qtyInput.value : 1) || 1;

        if (!artId) {
            Utils.showNotification('Veuillez sélectionner un article dans la liste ou le menu.', 'warning');
            return;
        }

        this.addExtraItemToModal(artId, dechargeId, qty);
        this.clearExtraArticleSelection(dechargeId);
    },

    clearExtraArticleSelection: function(dechargeId) {
        const idInput = document.getElementById('extraArticleSelectedId');
        if (idInput) idInput.value = '';
        const searchInput = document.getElementById('extraArticleSearchInput');
        if (searchInput) searchInput.value = '';
        const card = document.getElementById('extraArticleSelectedCard');
        if (card) card.style.display = 'none';
        const addBtn = document.getElementById('extraArticleAddBtn');
        if (addBtn) addBtn.disabled = true;
        const dd = document.getElementById('extraArticleDropdownList');
        if (dd) dd.style.display = 'none';
        const clearBtn = document.getElementById('extraArticleClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';
    },

    clearExtraArticleSearch: function(dechargeId) {
        const searchInput = document.getElementById('extraArticleSearchInput');
        if (searchInput) searchInput.value = '';
        this.filterExtraModalArticles(dechargeId);
    },

    fillAllServed: function() {
        const rows = document.querySelectorAll('#serveDechargeForm tbody tr');
        rows.forEach((r, idx) => {
            const req = Number(r.querySelector('.serve-requested-qty').value) || 0;
            const input = r.querySelector('.serve-qty-input');
            const maxVal = Number(input.getAttribute('max')) || req;
            input.value = Math.min(req, maxVal);
            this.updateServeLineStatus(idx, req);
        });
        const feedbackEl = document.getElementById('serveScanFeedback');
        if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="text-primary fw-bold"><i class="fas fa-bolt me-1"></i> Toutes les quantités ont été pré-remplies selon le stock disponible.</span>`;
        }
    },

    resetAllServed: function() {
        const rows = document.querySelectorAll('#serveDechargeForm tbody tr');
        rows.forEach((r, idx) => {
            const req = Number(r.querySelector('.serve-requested-qty').value) || 0;
            const input = r.querySelector('.serve-qty-input');
            input.value = 0;
            this.updateServeLineStatus(idx, req);
        });
        const feedbackEl = document.getElementById('serveScanFeedback');
        if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="text-muted"><i class="fas fa-rotate me-1"></i> Quantités réinitialisées à 0. Flashez chaque pièce pour valider.</span>`;
        }
    },

    addExtraItemToModal: function(articleId, dechargeId, customQty = 1) {
        const articles = DB.getArticles ? DB.getArticles() : [];
        const art = articles.find(a => a.id === articleId || (a.code && a.code.toLowerCase() === String(articleId).toLowerCase()));
        if (!art) {
            Utils.showNotification('Article introuvable.', 'error');
            return;
        }

        const tbody = document.querySelector('#serveDechargeForm tbody');
        if (!tbody) return;

        // Check if row already exists in table
        let existingRow = null;
        let existingIdx = -1;
        tbody.querySelectorAll('tr').forEach((r, idx) => {
            const hiddenId = r.querySelector('.serve-article-id');
            if (hiddenId && hiddenId.value === art.id) {
                existingRow = r;
                existingIdx = idx;
            }
        });

        if (existingRow) {
            // Already in table, increment served
            const qtyInput = existingRow.querySelector('.serve-qty-input');
            const reqInput = existingRow.querySelector('.serve-requested-qty');
            const newQty = (Number(qtyInput.value) || 0) + customQty;
            qtyInput.value = newQty;
            reqInput.value = Math.max(Number(reqInput.value) || 0, newQty);
            const reqDisplay = existingRow.querySelector('.serve-req-display');
            if (reqDisplay) reqDisplay.textContent = reqInput.value;
            this.updateServeLineStatus(existingIdx, Number(reqInput.value));
            existingRow.style.backgroundColor = '#dcfce7';
            setTimeout(() => existingRow.style.backgroundColor = '', 1200);

            const feedbackEl = document.getElementById('serveScanFeedback');
            if (feedbackEl) {
                feedbackEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> Article "${Utils.escapeHTML(art.designation)}" incrémenté (${newQty})</span>`;
            }
            if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('success');
            return;
        }

        const newIdx = tbody.querySelectorAll('tr').length;
        const stockVal = Number(art.quantity) || 0;
        const reqQty = Number(customQty) || 1;
        const servedQty = Math.min(reqQty, stockVal);

        const newRowHtml = `
            <tr id="serveRow_${newIdx}" style="background-color:#f0fdf4;">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-warning text-dark"><i class="fas fa-plus me-1"></i> Ajout Comptoir</span>
                        <strong class="text-dark">${Utils.escapeHTML(art.designation)}</strong>
                    </div>
                    <div class="small text-muted d-flex align-items-center gap-1 mt-1">
                        <span class="badge bg-light text-dark border font-monospace" style="font-size:11px;">
                            <i class="fas fa-barcode text-secondary me-1"></i>${Utils.escapeHTML(art.code)}
                        </span>
                        ${art.barcode ? `<span class="badge bg-white text-muted border font-monospace" style="font-size:10px;">EAN: ${Utils.escapeHTML(art.barcode)}</span>` : ''}
                        <span>— Section: <strong>${Utils.escapeHTML(art.section || 'A')}</strong></span>
                    </div>
                    <input type="hidden" class="serve-article-id" value="${art.id}">
                    <input type="hidden" class="serve-requested-qty" value="${reqQty}">
                </td>
                <td class="text-center">
                    <span class="badge ${stockVal >= reqQty ? 'bg-success' : stockVal > 0 ? 'bg-warning text-dark' : 'bg-danger'} px-2 py-1">
                        ${stockVal} ${art.unit || 'U'}
                    </span>
                </td>
                <td class="text-center">
                    <strong class="serve-req-display fs-6">${reqQty}</strong> <small class="text-muted">${art.unit || 'U'}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center justify-content-center gap-1">
                        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="const q=this.nextElementSibling; if(q && q.value > 0){ q.value=Number(q.value)-1; Decharges.updateServeLineStatus(${newIdx}, ${reqQty}); }" title="Diminuer">-</button>
                        <input type="number" class="form-control form-control-sm text-center serve-qty-input fw-bold" style="width:55px;" min="0" max="${stockVal}" step="1" value="${servedQty}" oninput="Decharges.updateServeLineStatus(${newIdx}, ${reqQty})">
                        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="const q=this.previousElementSibling; if(q && q.value < ${stockVal}){ q.value=Number(q.value)+1; Decharges.updateServeLineStatus(${newIdx}, ${reqQty}); }" title="Augmenter">+</button>
                        <button type="button" class="btn btn-xs btn-outline-primary ms-1 fw-bold" onclick="Decharges.handleModalBarcodeScan('${art.code}', '${dechargeId}')" title="Flasher"><i class="fas fa-barcode me-1"></i>Flash</button>
                    </div>
                </td>
                <td class="text-center" id="serveLineStatus_${newIdx}">
                    <span class="badge bg-success"><i class="fas fa-check me-1"></i> Complet</span>
                </td>
            </tr>
        `;

        tbody.insertAdjacentHTML('beforeend', newRowHtml);

        const feedbackEl = document.getElementById('serveScanFeedback');
        if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-circle-check me-1"></i> Article supplémentaire "${Utils.escapeHTML(art.designation)}" ajouté à la décharge (+${servedQty})</span>`;
        }

        if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('success');
        Utils.showNotification(`Article supplémentaire "${art.designation}" ajouté à la décharge.`, 'success');

        const extraBar = document.getElementById('addExtraItemContainer');
        if (extraBar) extraBar.style.display = 'none';
    },

    handleModalBarcodeScan: function(rawCode, dechargeId) {
        if (!rawCode) return;
        const code = String(rawCode).trim().toLowerCase();
        if (!code) return;

        const decharge = DB.getDecharges().find(d => d.id === dechargeId);
        if (!decharge) return;
        const articles = DB.getArticles();

        // 1. Check if matching any item in the current table
        let matchedIdx = -1;
        let matchedItem = null;
        let matchedArt = null;

        const rows = document.querySelectorAll('#serveDechargeForm tbody tr');
        rows.forEach((r, idx) => {
            if (matchedIdx !== -1) return;
            const hiddenId = r.querySelector('.serve-article-id').value;
            const art = articles.find(a => a.id === hiddenId);
            if (hiddenId.toLowerCase() === code) {
                matchedIdx = idx; matchedArt = art;
            } else if (art && art.code && art.code.toLowerCase() === code) {
                matchedIdx = idx; matchedArt = art;
            } else if (art && art.barcode && art.barcode.toLowerCase() === code) {
                matchedIdx = idx; matchedArt = art;
            } else if (art && art.designation && art.designation.toLowerCase() === code) {
                matchedIdx = idx; matchedArt = art;
            }
        });

        const feedbackEl = document.getElementById('serveScanFeedback');

        if (matchedIdx === -1) {
            // Check if this code matches an article in warehouse catalogue (Unexpected item!)
            const unexpectedArt = articles.find(a => (a.barcode && a.barcode.toLowerCase() === code) || (a.code && a.code.toLowerCase() === code) || a.id.toLowerCase() === code || a.designation.toLowerCase() === code);

            if (unexpectedArt) {
                // Found in warehouse! Prompt user to add it on the spot!
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('error');
                if (feedbackEl) {
                    feedbackEl.innerHTML = `
                        <div class="alert alert-warning py-2 px-3 mt-2 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2 border shadow-sm">
                            <div>
                                <i class="fas fa-triangle-exclamation text-warning me-2"></i>
                                <strong>Article hors-demande :</strong> <strong>${Utils.escapeHTML(unexpectedArt.designation)}</strong> (<code>${Utils.escapeHTML(unexpectedArt.code)}</code>)
                                <span class="badge bg-light text-dark border ms-2">Stock: ${unexpectedArt.quantity} ${unexpectedArt.unit}</span>
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-primary fw-bold" onclick="Decharges.addExtraItemToModal('${unexpectedArt.id}', '${dechargeId}')">
                                    <i class="fas fa-plus-circle me-1"></i> Ajouter cette pièce à la Décharge (+1)
                                </button>
                            </div>
                        </div>
                    `;
                }
                Utils.showNotification(`"${unexpectedArt.designation}" ne figurait pas dans la demande. Cliquez pour l'ajouter !`, 'warning');
                return;
            } else {
                // Not found anywhere
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('error');
                if (feedbackEl) {
                    feedbackEl.innerHTML = `<span class="text-danger fw-bold"><i class="fas fa-triangle-exclamation me-1"></i> Code "${Utils.escapeHTML(rawCode)}" inconnu dans le magasin !</span>`;
                }
                Utils.showNotification(`Code "${rawCode}" non reconnu dans le catalogue magasin.`, 'danger');
                return;
            }
        }

        // Matched existing row!
        const row = document.getElementById('serveRow_' + matchedIdx);
        if (!row) return;

        const qtyInput = row.querySelector('.serve-qty-input');
        const reqInput = row.querySelector('.serve-requested-qty');
        const reqQty = Number(reqInput.value) || 1;
        const stockVal = matchedArt ? (Number(matchedArt.quantity) || 0) : 0;
        const currentServed = Number(qtyInput.value) || 0;

        if (currentServed >= reqQty) {
            // Already full! Ask if they want to serve more than requested!
            if (currentServed + 1 > stockVal) {
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('error');
                if (feedbackEl) {
                    feedbackEl.innerHTML = `<span class="text-danger fw-bold"><i class="fas fa-ban me-1"></i> Stock insuffisant (${stockVal} dispo) pour servir davantage de "${Utils.escapeHTML(matchedArt.designation)}" !</span>`;
                }
                Utils.showNotification(`Stock magasin insuffisant.`, 'danger');
                return;
            }

            // Allowed to add extra quantity beyond request
            const newServed = currentServed + 1;
            qtyInput.value = newServed;
            reqInput.value = newServed; // increase requested so it is accounted for
            const reqDisplay = row.querySelector('.serve-req-display');
            if (reqDisplay) reqDisplay.textContent = newServed;
            this.updateServeLineStatus(matchedIdx, newServed);

            if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('success');
            row.style.transition = 'background-color 300ms ease';
            row.style.backgroundColor = '#dcfce7';
            setTimeout(() => { row.style.backgroundColor = ''; }, 1200);

            if (feedbackEl) {
                feedbackEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> Quantité supplémentaire validée pour "${Utils.escapeHTML(matchedArt.designation)}" (${newServed} servies)</span>`;
            }
            Utils.showNotification(`✓ ${matchedArt.designation} : +1 supplémentaire servi (${newServed})`, 'success');
            return;
        }

        if (currentServed + 1 > stockVal) {
            if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('error');
            if (feedbackEl) {
                feedbackEl.innerHTML = `<span class="text-danger fw-bold"><i class="fas fa-ban me-1"></i> Stock insuffisant en magasin (${stockVal} dispo) pour servir une pièce de plus !</span>`;
            }
            Utils.showNotification(`Stock magasin insuffisant (${stockVal} dispo).`, 'danger');
            return;
        }

        // Standard increment: 0 -> 1 -> 2 ...
        const newServed = currentServed + 1;
        qtyInput.value = newServed;
        this.updateServeLineStatus(matchedIdx, reqQty);

        if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.playBeep) BarcodeScanner.playBeep('success');

        row.style.transition = 'background-color 300ms ease';
        row.style.backgroundColor = '#dcfce7';
        setTimeout(() => { row.style.backgroundColor = ''; }, 1200);

        if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> "${Utils.escapeHTML(matchedArt ? matchedArt.designation : 'Article')}" validé par scan (${newServed}/${reqQty})</span>`;
        }
        Utils.showNotification(`✓ ${matchedArt ? matchedArt.designation : 'Article'} scanné (${newServed}/${reqQty})`, 'success');
    },

    toggleServeCamera: function(dechargeId) {
        const container = document.getElementById('serveCameraContainer');
        const btnText = document.getElementById('serveCamBtnText');
        if (!container) return;

        if (this._serveScanner) {
            this.stopServeCamera();
            container.style.display = 'none';
            if (btnText) btnText.textContent = 'Caméra';
            return;
        }

        container.style.display = 'block';
        if (btnText) btnText.textContent = 'Arrêter';

        if (typeof Html5Qrcode === 'undefined') {
            container.innerHTML = '<div class="alert alert-warning small p-2 mb-0">Caméra non supportée sur ce navigateur. Utilisez la douchette USB ou la saisie manuelle.</div>';
            return;
        }

        try {
            this._serveScanner = new Html5Qrcode("serveModalReader");
            this._serveScanner.start(
                { facingMode: "environment" },
                { fps: 12, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    this.handleModalBarcodeScan(decodedText, dechargeId);
                },
                (err) => {}
            ).catch(err => {
                console.warn('Camera start error:', err);
                container.innerHTML = '<div class="alert alert-warning small p-2 mb-0">Accès caméra indisponible. Saisissez ou flashez au pistolet USB.</div>';
            });
        } catch(e) {
            console.warn(e);
        }
    },

    stopServeCamera: function() {
        if (this._serveScanner) {
            try {
                this._serveScanner.stop().then(() => {
                    this._serveScanner.clear();
                    this._serveScanner = null;
                }).catch(() => {
                    this._serveScanner = null;
                });
            } catch(e) {
                this._serveScanner = null;
            }
        }
    },

    updateServeLineStatus: function(idx, reqQty) {
        const row = document.getElementById('serveRow_' + idx);
        const statusTd = document.getElementById('serveLineStatus_' + idx);
        if (!row || !statusTd) return;
        const served = Number(row.querySelector('.serve-qty-input').value) || 0;
        if (served >= reqQty) {
            statusTd.innerHTML = `<span class="badge bg-success"><i class="fas fa-check me-1"></i> Complet (${served}/${reqQty})</span>`;
        } else if (served > 0) {
            statusTd.innerHTML = `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i> Partiel (${served}/${reqQty})</span>`;
        } else {
            statusTd.innerHTML = `<span class="badge bg-secondary"><i class="fas fa-barcode me-1"></i> En attente (0/${reqQty})</span>`;
        }
    },

    submitServe: function(e, id, directLinesData) {
        if (e && e.preventDefault) e.preventDefault();
        if (typeof e === 'string') {
            directLinesData = id;
            id = e;
            e = null;
        }
        const decharge = DB.getDecharges().find(d => d.id === id);
        if (!decharge || (decharge.status !== 'En attente' && decharge.status !== 'Brouillon' && decharge.status !== 'Validée')) return { success: false, reason: 'invalid_status' };

        const form = e ? e.target : null;
        const remarks = (form && form.remarks) ? form.remarks.value.trim() : '';
        const articles = DB.getArticles();

        const shortages = [];
        const finalLines = [];
        const finalItems = [];

        if (directLinesData && Array.isArray(directLinesData)) {
            // Programmatic serving
            directLinesData.forEach(item => {
                const art = articles.find(a => a.id === item.articleId);
                const reqQty = Number(item.requestedQty || 0);
                const servedQty = Number(item.servedQty || 0);
                const isShortage = servedQty < reqQty;
                const shortageQty = Math.max(0, reqQty - servedQty);
                if (isShortage) {
                    shortages.push({
                        article: art ? (art.name || art.designation) : item.articleId,
                        code: art ? art.code : '',
                        unit: art ? art.unit : 'U',
                        requested: reqQty,
                        served: servedQty,
                        missing: shortageQty
                    });
                }
                if (servedQty > 0 && art) {
                    art.quantity = Math.max(0, (Number(art.quantity) || 0) - servedQty);
                    DB.update('articles', art.id, art);
                    DB.addStockMovement({
                        articleId: art.id,
                        type: 'SORTIE',
                        quantity: servedQty,
                        reason: 'Service décharge ' + decharge.ref,
                        author: (Auth.getCurrentUser() || {}).username || 'Magasinier'
                    });
                }
                finalLines.push({
                    articleId: item.articleId,
                    designation: art ? (art.name || art.designation) : '',
                    unit: art ? art.unit : 'Pièce',
                    quantity: reqQty,
                    servedQty: servedQty,
                    missingQty: shortageQty,
                    shortage: isShortage,
                    shortageReason: item.shortageReason || (isShortage ? 'Non servi / Rupture' : ''),
                    status: servedQty >= reqQty ? 'Servi' : servedQty > 0 ? 'Partiel' : 'Non servi / Rupture',
                    inventoryCode: ''
                });
                finalItems.push({
                    articleId: item.articleId,
                    quantity: servedQty,
                    shortage: isShortage
                });
            });
        } else {
            const rows = document.querySelectorAll('#serveDechargeForm tbody tr');
            rows.forEach(r => {
                const artId = r.querySelector('.serve-article-id').value;
                const reqQty = Number(r.querySelector('.serve-requested-qty').value);
                const servedQty = Number(r.querySelector('.serve-qty-input').value);
                const art = articles.find(a => a.id === artId);

                const isShortage = servedQty < reqQty;
                const shortageQty = reqQty - servedQty;
                if (isShortage) {
                    shortages.push({
                        article: art ? (art.name || art.designation) : artId,
                        code: art ? art.code : '',
                        unit: art ? art.unit : 'U',
                        requested: reqQty,
                        served: servedQty,
                        missing: shortageQty
                    });
                }

                // Deduct stock for served quantity
                if (servedQty > 0 && art) {
                    art.quantity = Math.max(0, Number(art.quantity) - servedQty);
                    DB.update('articles', art.id, art);
                    DB.addStockMovement({
                        articleId: art.id,
                        type: 'SORTIE',
                        quantity: servedQty,
                        reason: 'Service comptoir vers ' + decharge.beneficiary + (remarks ? ' (' + remarks + ')' : ''),
                        author: (Auth.getCurrentUser() || {}).username || 'Magasinier'
                    });
                }

                finalItems.push({
                    articleId: artId,
                    quantity: servedQty
                });

                finalLines.push({
                    articleId: artId,
                    designation: art ? (art.name || art.designation) : 'Article',
                    unit: art ? art.unit : 'U',
                    quantity: reqQty,
                    servedQty: servedQty,
                    missingQty: shortageQty,
                    shortage: isShortage,
                    shortageReason: isShortage ? 'Non servi / Rupture' : '',
                    status: servedQty >= reqQty ? 'Servi' : servedQty > 0 ? 'Partiel' : 'Non servi / Rupture',
                    inventoryCode: ''
                });
            });
        }

        // Update decharge status
        const hasAnyServed = finalLines.some(l => (l.servedQty || l.quantity) > 0);
        const hasAnyShortage = shortages.length > 0;
        decharge.status = hasAnyShortage ? (hasAnyServed ? 'Partielle' : 'Rejetée') : 'Approuvée';
        decharge.items = finalItems;
        decharge.lines = finalLines;
        decharge.servedBy = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Magasinier';
        decharge.servedAt = new Date().toISOString();
        if (remarks) decharge.serveRemarks = remarks;

        // If shortage occurred, alert Admin
        if (shortages.length > 0) {
            decharge.hasShortage = true;
            const shortageSummary = shortages.map(s => `${s.missing}x ${s.article} (demandé: ${s.requested}, servi: ${s.served})`).join('; ');
            if (typeof Notify !== 'undefined' && Notify.sendAdminAlert) {
                Notify.sendAdminAlert(
                    '⚠️ Rupture de Stock au Comptoir',
                    `Décharge ${decharge.ref} pour ${decharge.beneficiary} : Articles non servis : ${shortageSummary}.`,
                    { category: 'stock', type: 'warning', module: 'stock' }
                );
            }
            if (DB.addAuditLog) {
                DB.addAuditLog({
                    action: 'RUPTURE_COMPTOIR',
                    col: 'decharges',
                    itemId: decharge.id,
                    details: `Rupture constatée lors de la délivrance ${decharge.ref} vers ${decharge.beneficiary} : ${shortageSummary}`,
                    user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Magasinier'
                });
            }
        }

        // If linked to preOrder, update that preOrder
        if (decharge.preOrderId && DB.data.preOrders) {
            const pre = DB.data.preOrders.find(p => p.id === decharge.preOrderId);
            if (pre) {
                pre.status = shortages.length === 0 ? 'Servie' : shortages.length === finalLines.length ? 'Non servie' : 'Partiellement servie';
                pre.servedAt = decharge.servedAt;
                pre.servedBy = decharge.servedBy;
                if (pre.items) {
                    pre.items.forEach(pi => {
                        const matchedLine = finalLines.find(l => l.articleId === pi.articleId);
                        if (matchedLine) {
                            pi.servedQty = matchedLine.servedQty;
                            pi.status = matchedLine.status;
                        }
                    });
                }
            }
        }

        // Generate PV if requested
        if (decharge.generatePV && DB.addPV) {
            const pvId = Utils.generateId();
            const pvRef = 'PV-' + Date.now().toString().slice(-6);
            DB.addPV({
                id: pvId,
                ref: pvRef,
                dechargeId: decharge.id,
                date: new Date().toISOString(),
                status: 'Actif',
                items: decharge.items.map(i => ({...i, inventoryCode: ''}))
            });
            decharge.pvId = pvId;
        }

        if (DB.updateDecharge) DB.updateDecharge(decharge);
        else DB.update('decharges', decharge.id, decharge);

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'APPROBATION_DECHARGE',
                col: 'decharges',
                itemId: decharge.id,
                details: `Décharge ${decharge.ref} servie et validée au comptoir pour ${decharge.beneficiary}`,
                user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Magasinier'
            });
        }

        if (window.UI) {
            UI.hideModal();
            UI.refresh();
            UI.showAlert(`✅ Décharge ${decharge.ref} validée et stock déduit. ${shortages.length > 0 ? '⚠️ ' + shortages.length + ' article(s) en rupture signalés à l\'administrateur.' : ''}`, shortages.length > 0 ? 'warning' : 'success');
        }

        return { success: true, status: decharge.status, decharge: decharge, shortages: shortages };
    },

    validateChefSection: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if(!d) return;
        if(d.status !== 'En attente') {
            UI.showAlert('Seule une décharge en attente peut être validée par le Chef Section.', 'warning');
            return;
        }
        if (!Auth.isAdmin() && !Auth.isChefSectionGestion()) {
            UI.showAlert('Accès refusé : Seul le Chef Section Gestion des Stocks (LEKCIR YASSINE) ou le DG peut valider.', 'danger');
            return;
        }
        if(!confirm(`Confirmer la validation de la décharge ${d.ref} par le Chef Section Gestion des Stocks ?\n\nATTENTION : Une fois validée, la décharge sera VERROUILLÉE et seul le DG (Admin) pourra la modifier. Le magasinier pourra ensuite la servir au comptoir.`)) return;

        d.status = 'Validée';
        const u = Auth.getCurrentUser();
        d.validatedByChefSection = u ? u.name : 'LEKCIR YASSINE';
        d.validatedBy = d.validatedByChefSection;
        d.validatedAt = new Date().toISOString();
        
        DB.updateDecharge(d);

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'VALIDATION_CHEF_SECTION',
                col: 'decharges',
                itemId: d.id,
                details: `Décharge ${d.ref} validée par Chef Section Gestion (${d.validatedByChefSection}). Dossier verrouillé.`,
                user: d.validatedByChefSection
            });
        }

        UI.refresh();
        UI.showAlert(`✅ Décharge ${d.ref} validée avec succès par le Chef Section Gestion (${d.validatedByChefSection}). Elle est verrouillée et prête à être servie au comptoir.`, 'success');
    },

    validate: function(id) {
        return this.validateChefSection(id);
    },

    delete: function(id) {
        if (!Auth.isAdmin()) {
            UI.showAlert('Accès strictement refusé : Seul un Administrateur peut supprimer une décharge.', 'danger');
            return;
        }
        const d = DB.getDecharges().find(x => x.id === id);
        if (!d) return;
        if (!confirm(`Supprimer définitivement la décharge ${d.ref} ? Cette action sera tracée dans le journal d'audit.`)) return;

        DB.deleteDecharge(id);
        DB.addAuditLog({
            action: 'SUPPRESSION_DECHARGE',
            col: 'decharges',
            itemId: id,
            details: `Décharge ${d.ref} (${d.beneficiary}) supprimée définitivement par l'administrateur ${Auth.getCurrentUser().name}`,
            user: Auth.getCurrentUser().name
        });
        UI.refresh();
        UI.showAlert(`Décharge ${d.ref} supprimée.`, 'info');
    },
    reject: function(id) {
        if(!confirm("Rejeter cette décharge ?")) return;
        const decharge = DB.getDecharges().find(d => d.id === id);
        if(!decharge || decharge.status !== 'En attente') return;
        
        decharge.status = 'Rejetée';
        DB.updateDecharge(decharge);
        
        if (document.getElementById('dechargeModal')) UI.hideModal();
        UI.refresh();
        UI.showAlert('Décharge rejetée.', 'info');
    },
    quickValidate: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if (!d) return;
        d.status = 'Validée';
        const u = (typeof Auth !== 'undefined' && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
        d.validatedByChefSection = u ? u.name : 'LEKCIR YASSINE (Chef Section Gestion)';
        d.validatedBy = d.validatedByChefSection;
        d.validatedAt = new Date().toISOString();
        DB.updateDecharge(d);

        // Also update linked Work Plan if present
        if (d.workPlanId || d.workPlanRef) {
            const plans = DB.data && DB.data.workPlans ? DB.data.workPlans : [];
            const p = plans.find(plan => plan.id === d.workPlanId || plan.ref === d.workPlanRef || plan.dechargeRef === d.ref);
            if (p) {
                p.status = 'Validé (En attente magasin)';
                if (DB.save) DB.save();
            }
        }

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'VALIDATION_RAPIDE_CHEF_SECTION',
                col: 'decharges',
                itemId: d.id,
                details: `Décharge ${d.ref} validée avec succès par Chef Section Gestion (${d.validatedByChefSection}). Prête pour délivrance et téléchargement.`,
                user: d.validatedByChefSection
            });
        }

        UI.refresh();
        Utils.showNotification(`✅ Décharge ${d.ref} validée avec succès ! Prête pour le téléchargement et la délivrance magasin.`, 'success');
    },

    quickValidateFirstPending: function() {
        const pending = DB.getDecharges().find(d => d.status === 'En attente');
        if (pending) {
            this.quickValidate(pending.id);
        } else {
            Utils.showNotification('Aucune décharge en attente trouvée.', 'info');
        }
    },

    downloadDocx: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if (!d) {
            Utils.showNotification('Décharge introuvable pour téléchargement Word.', 'warning');
            return;
        }

        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const filename = `Bon_de_Decharge_${(d.ref || 'DCH-2026').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
        const items = d.items || d.lines || [];

        const docHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${d.ref || 'Bon de Décharge'}</title>
                <!--[if gte mso 9]>
                <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    @page {
                        size: 21cm 29.7cm;
                        margin: 1.5cm 1.5cm 1.5cm 1.5cm;
                        mso-page-orientation: portrait;
                    }
                    body {
                        font-family: 'Calibri', 'Arial', sans-serif;
                        font-size: 11pt;
                        color: #000000;
                        line-height: 1.25;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 12pt;
                    }
                    th, td {
                        border: 1pt solid #000000;
                        padding: 5pt 7pt;
                        font-size: 10pt;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .header-table td {
                        border: none;
                        padding: 2pt;
                    }
                    .title-box {
                        text-align: center;
                        border: 2pt solid #000000;
                        padding: 8pt;
                        font-size: 15pt;
                        font-weight: bold;
                        letter-spacing: 1pt;
                        background-color: #f8fafc;
                        margin-bottom: 12pt;
                    }
                    .section-header {
                        background-color: #e2e8f0;
                        font-weight: bold;
                        font-size: 10.5pt;
                        padding: 4pt 8pt;
                        border: 1pt solid #000000;
                        margin-top: 10pt;
                        margin-bottom: 4pt;
                        text-transform: uppercase;
                    }
                    .sig-table td {
                        height: 75pt;
                        vertical-align: top;
                        font-size: 9.5pt;
                    }
                </style>
            </head>
            <body>
                <table class="header-table" style="width:100%;">
                    <tr>
                        <td style="width:60%;vertical-align:top;">
                            <div style="font-size:13pt;font-weight:bold;color:#0f172a;">SPA DOUROUB ELDJAZAIR</div>
                            <div style="font-size:9.5pt;color:#475569;">Direction Logistique & Gestion des Stocks</div>
                            <div style="font-size:9pt;color:#64748b;">Magasin Central GDS — Zone Industrielle</div>
                        </td>
                        <td style="width:40%;text-align:right;vertical-align:top;">
                            <div style="font-size:10.5pt;font-weight:bold;font-family:monospace;">${d.ref || 'DCH-2026-0001'}</div>
                            <div style="font-size:9pt;color:#475569;">Date d'émission : ${Utils.formatDate(d.date || d.servedAt || d.createdAt || d.dateDecharge, d.ref || d.bsmRef)}</div>
                            <div style="font-size:9pt;color:#2563eb;font-weight:bold;">Statut : ${d.status || 'Validée'}</div>
                        </td>
                    </tr>
                </table>

                <div class="title-box">
                    BON DE DÉCHARGE DE MATÉRIEL / SORTIE MAGASIN<br>
                    <span style="font-size:10pt;font-weight:normal;color:#334155;">Volet 2 — Magasin Central & Traçabilité Matériel</span>
                </div>

                <div class="section-header">1. INFORMATIONS D'AFFECTATION ET DEMANDEUR</div>
                <table>
                    <tr>
                        <td style="width:50%;"><strong>Bénéficiaire / Demandeur :</strong> ${Utils.escapeHTML(d.beneficiary || 'Non spécifié')}</td>
                        <td style="width:50%;"><strong>Département / Service :</strong> ${Utils.escapeHTML(d.service || 'Direction Générale')}</td>
                    </tr>
                    <tr>
                        <td><strong>Matériel / Véhicule :</strong> ${Utils.escapeHTML(d.materialName || d.immatriculation || 'Atelier & Magasin')}</td>
                        <td><strong>Immatriculation :</strong> <span style="font-family:monospace;font-weight:bold;">${Utils.escapeHTML(d.immatriculation || '—')}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Motif de la sortie :</strong> ${Utils.escapeHTML(d.reason || 'Délivrance matériel pour exploitation')}</td>
                        <td><strong>Bon de Travail Lié :</strong> <span style="font-family:monospace;font-weight:bold;color:#2563eb;">${Utils.escapeHTML(d.workPlanRef || '—')}</span></td>
                    </tr>
                </table>

                <div class="section-header">2. ARTICLES & MATÉRIEL DÉLIVRÉS</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:30pt;text-align:center;">N°</th>
                            <th style="width:90pt;">Code Article</th>
                            <th>Désignation de l'Article</th>
                            <th style="width:60pt;text-align:center;">Qté Servie</th>
                            <th style="width:50pt;text-align:center;">Unité</th>
                            <th style="width:120pt;">Observation Magasin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length > 0 ? items.map((it, idx) => {
                            const art = articles.find(a => a.id === it.articleId || a.code === it.articleId);
                            const code = art ? art.code : (it.articleId || 'PDR');
                            const des = it.designation || (art ? art.designation : 'Article');
                            const unit = it.unit || (art ? art.unit : 'U');
                            const qty = it.quantity || it.qty || 1;
                            const obs = it.obs || 'Délivré en bon état';
                            return `
                                <tr>
                                    <td style="text-align:center;">${idx + 1}</td>
                                    <td style="font-family:monospace;font-weight:bold;">${Utils.escapeHTML(code)}</td>
                                    <td><strong>${Utils.escapeHTML(des)}</strong></td>
                                    <td style="text-align:center;font-weight:bold;">${qty}</td>
                                    <td style="text-align:center;">${Utils.escapeHTML(unit)}</td>
                                    <td>${Utils.escapeHTML(obs)}</td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="6" style="text-align:center;padding:10pt;color:#64748b;">Aucun article renseigné pour cette décharge.</td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <div class="section-header">3. DÉCHARGE LÉGALE ET ENGAGEMENT DU BÉNÉFICIAIRE</div>
                <div style="font-size:9pt;color:#334155;border:1pt solid #000000;padding:6pt 8pt;margin-bottom:12pt;background-color:#fefce8;">
                    Je soussigné(e) bénéficiaire désigné ci-dessus, atteste avoir pris possession en parfait état d'usage et de fonctionnement du matériel et des pièces désignés sur le présent bon de décharge, et m'engage à les utiliser exclusivement aux fins de service au sein de la SPA DOUROUB ELDJAZAIR.
                </div>

                <div class="section-header">4. VISAS ET SIGNATURES REGLEMENTAIRES</div>
                <table class="sig-table">
                    <thead>
                        <tr>
                            <th style="width:33.3%;">Chef Section Gestion des Stocks</th>
                            <th style="width:33.3%;">Magasinier Délivrance</th>
                            <th style="width:33.3%;">Bénéficiaire / Réceptionnaire</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>LEKCIR YASSINE</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Visa & Approbation Sortie</span><br><br>
                                <span style="font-size:8.5pt;">Date : ${Utils.formatDate(d.validatedAt || d.date || d.servedAt || d.createdAt, d.ref || d.bsmRef)}</span>
                            </td>
                            <td>
                                <strong>Magasinier Central GDS</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Contrôle quantitatif & sortie</span><br><br>
                                <span style="font-size:8.5pt;">Date : ……/……/2026</span>
                            </td>
                            <td>
                                <strong>${Utils.escapeHTML(d.beneficiary || 'Demandeur')}</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Signature de prise en charge</span><br><br>
                                <span style="font-size:8.5pt;">Date : ……/……/2026</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align:center;font-size:8.5pt;color:#64748b;margin-top:14pt;border-top:1pt solid #cbd5e1;padding-top:4pt;">
                    SPA DOUROUB ELDJAZAIR — SYSTÈME DE TRAÇABILITÉ INTÉGRÉ — VOLET 2 : DÉCHARGE MAGASIN &bull; DOCUMENT OFFICIEL AUDITABLE
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 200);
        Utils.showNotification(`Fichier Word téléchargé : ${filename}`, 'success');
    },

    printBSM: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if (!d) {
            Utils.showNotification('Document introuvable pour impression BSM.', 'warning');
            return;
        }

        const bsmRef = d.bsmRef || ('BSM-' + new Date().getFullYear() + '-' + String(d.ref || '').replace(/[^0-9]/g, '').slice(-4) || 'BSM-2026-0001');
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const fleet = (typeof DB !== 'undefined' && DB.getFleet) ? DB.getFleet() : [];
        const mat = d.materialId ? fleet.find(f => f.id === d.materialId) : null;
        const vehLabel = mat ? `${mat.name} (${mat.immatriculation})` : (d.immatriculation ? `${d.materialName || 'Véhicule'} (${d.immatriculation})` : 'Magasin Central / Atelier');
        const items = d.items || d.lines || [];

        const barcodeSvg = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.generateBarcodeSvg) ?
            PlanTravailModule.generateBarcodeSvg(bsmRef, 210, 44) : '';
        const qrSvg = (typeof PlanTravailModule !== 'undefined' && PlanTravailModule.generateQrSvg) ?
            PlanTravailModule.generateQrSvg({ system: 'SPA DOUROUB ELDJAZAIR', doc: 'BON_DE_SORTIE_MAGASIN_BSM', ref: bsmRef, dchRef: d.ref, btRef: d.workPlanRef || '', immat: d.immatriculation || '', date: d.date }, 75) : '';

        const printWin = window.open('', '_blank', 'width=950,height=800');
        if (!printWin) {
            Utils.showNotification('Veuillez autoriser les fenêtres pop-up pour imprimer le Bon de Sortie Magasin.', 'warning');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Bon de Sortie Magasin — ${bsmRef}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 25px; color: #0f172a; background: #ffffff; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 14px; }
                    .brand { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase; }
                    .sub-brand { font-size: 10px; color: #475569; font-weight: 700; text-transform: uppercase; margin-top: 3px; }
                    .title-box { text-align: center; }
                    .title { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 1.5px; color: #0284c7; text-transform: uppercase; }
                    .doc-subtitle { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }
                    .ref { font-size: 13px; font-family: monospace; font-weight: 900; color: #0f172a; margin-top: 4px; }
                    .box { border: 1.5px solid #0f172a; margin-bottom: 12px; border-radius: 4px; overflow: hidden; }
                    .box-header { background: #f1f5f9; padding: 6px 10px; font-size: 11px; font-weight: 800; border-bottom: 1.5px solid #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
                    .box-body { padding: 10px; font-size: 11px; line-height: 1.5; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: #0f172a; color: #ffffff; border: 1px solid #0f172a; padding: 6px 8px; text-align: left; font-weight: 800; font-size: 10.5px; }
                    td { border: 1px solid #cbd5e1; padding: 6px 8px; }
                    .accounting-notice { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 4px; padding: 8px 12px; font-size: 10px; color: #166534; margin-bottom: 14px; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 20px; gap: 15px; }
                    .sig-box { flex: 1; border: 1px dashed #64748b; min-height: 90px; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; border-radius: 4px; background: #fafafa; }
                    .footer-qr { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 9.5px; color: #64748b; }
                    @media print { body { padding: 8mm; } @page { margin: 8mm; size: A4 portrait; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="max-width:320px;">
                        <div class="brand">SPA DOUROUB ELDJAZAIR</div>
                        <div class="sub-brand">Direction Exploitation & Maintenance</div>
                        <div style="font-size:10px;color:#334155;margin-top:2px;font-weight:600;">Magasin Central GDS — Pièces de Rechange</div>
                        <div style="font-size:9px;color:#64748b;margin-top:2px;">Zone Industrielle • Algérie</div>
                    </div>
                    <div class="title-box">
                        <h1 class="title">BON DE SORTIE DU MAGASIN</h1>
                        <div class="doc-subtitle">B.S.M — SORTIE COMPTABLE & PHYSIQUE DE STOCK</div>
                        <div class="ref">${bsmRef}</div>
                        <div style="font-size:10px;color:#475569;margin-top:3px;">
                            ${d.ref ? `Lié à la Décharge : <strong>${Utils.escapeHTML(d.ref)}</strong>` : ''}
                            ${d.workPlanRef ? ` | Bon de Travail : <strong>${Utils.escapeHTML(d.workPlanRef)}</strong>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        ${barcodeSvg}
                        <div style="font-size:9.5px;color:#475569;margin-top:3px;font-family:monospace;">Date : <strong>${Utils.formatDate(d.date || d.servedAt || d.createdAt || d.dateDecharge, bsmRef || d.ref)}</strong></div>
                    </div>
                </div>

                <div class="box">
                    <div class="box-header">1. IDENTIFICATION, DEMANDEUR & AFFECTATION ANALYTIQUE</div>
                    <div class="box-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
                            <div><strong>Service / Département Demandeur :</strong> <span style="text-transform:uppercase;">${Utils.escapeHTML(d.service || 'Maintenance & Flotte')}</span></div>
                            <div><strong>Magasinier Émetteur :</strong> ${Utils.escapeHTML(d.fromName || 'LEKCIR YASSINE')}</div>
                            <div><strong>Bénéficiaire / Demandeur :</strong> <strong>${Utils.escapeHTML(d.beneficiary || 'Atelier Central')}</strong> ${d.qualite ? `(${Utils.escapeHTML(d.qualite)})` : ''}</div>
                            <div><strong>Imputation Matériel / Véhicule :</strong> <strong style="color:#0284c7;">${Utils.escapeHTML(vehLabel)}</strong></div>
                            <div><strong>Motif de la Sortie :</strong> ${Utils.escapeHTML(d.reason || 'Consommation interne atelier, réparation et entretien')}</div>
                            <div><strong>Statut de Sortie :</strong> <span style="font-weight:700;color:#16a34a;">${Utils.escapeHTML(d.status || 'Délivré')}</span> (Magasin Central)</div>
                        </div>
                    </div>
                </div>

                <div class="box">
                    <div class="box-header">2. ÉTAT DES PIÈCES & CONSOMMABLES SORTIS DU MAGASIN</div>
                    <div class="box-body" style="padding:0;">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:35px;text-align:center;">N°</th>
                                    <th style="width:120px;">Code OEM / Stock</th>
                                    <th>Désignation Article / Composant</th>
                                    <th style="width:50px;text-align:center;">Unité</th>
                                    <th style="width:80px;text-align:center;">Qté Servie</th>
                                    <th style="width:110px;">Emplacement</th>
                                    <th>Observations</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.length > 0 ? items.map((it, idx) => {
                                    const art = articles.find(a => a.id === it.articleId || a.code === it.articleId);
                                    const code = art ? art.code : (it.articleId || 'PDR');
                                    const des = it.designation || (art ? art.designation : 'Pièce détachée');
                                    const unit = it.unit || (art ? art.unit : 'U');
                                    const qty = it.quantity || it.qty || 1;
                                    const obs = it.obs || 'Sortie conforme pour travaux';
                                    const loc = art ? (art.section || art.location || 'Magasin Central') : 'Magasin Central';
                                    return `
                                        <tr>
                                            <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
                                            <td style="font-family:monospace;font-weight:bold;color:#0369a1;">${Utils.escapeHTML(code)}</td>
                                            <td style="font-weight:600;">${Utils.escapeHTML(des)}</td>
                                            <td style="text-align:center;">${Utils.escapeHTML(unit)}</td>
                                            <td style="text-align:center;font-weight:900;font-size:12px;color:#0f172a;">${qty}</td>
                                            <td style="font-size:10px;color:#475569;">${Utils.escapeHTML(loc)}</td>
                                            <td style="font-size:10px;color:#334155;">${Utils.escapeHTML(obs)}</td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="7" style="text-align:center;padding:12px;color:#64748b;">Aucun article renseigné pour ce Bon de Sortie.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="accounting-notice">
                    <strong><i class="fas fa-file-invoice-dollar"></i> Imputation Comptable (SCF Algérie) & Décharge de Stock :</strong><br>
                    Les matières et pièces de rechange détaillées ci-dessus sont sorties définitivement du magasin central pour consommation immédiate et intégration au véhicule / atelier désigné.
                    Opération comptabilisée en : <strong>Débit Compte 60 (Achats consommés) / Crédit Compte 31/32 (Stocks matières & fournitures)</strong>.
                </div>

                <div class="signatures">
                    <div class="sig-box">
                        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;color:#475569;">1. Le Magasinier Émetteur</div>
                        <div style="font-size:10px;color:#0f172a;font-weight:700;">${Utils.escapeHTML(d.fromName || 'LEKCIR YASSINE')}</div>
                        <div style="font-size:9px;color:#94a3b8;border-top:1px dashed #cbd5e1;padding-top:4px;">Signature & Date</div>
                    </div>
                    <div class="sig-box">
                        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;color:#475569;">2. Chef Section Gestion des Stocks</div>
                        <div style="font-size:10px;color:#0f172a;font-weight:700;">LEKCIR YASSINE</div>
                        <div style="font-size:9px;color:#94a3b8;border-top:1px dashed #cbd5e1;padding-top:4px;">Visa & Cachet Magasin</div>
                    </div>
                    <div class="sig-box">
                        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;color:#475569;">3. Le Réceptionnaire / Bénéficiaire</div>
                        <div style="font-size:10px;color:#0f172a;font-weight:700;">${Utils.escapeHTML(d.beneficiary || 'Demandeur Atelier')}</div>
                        <div style="font-size:9px;color:#94a3b8;border-top:1px dashed #cbd5e1;padding-top:4px;">Signature de réception conforme</div>
                    </div>
                </div>

                <div class="footer-qr">
                    <div>
                        <strong>SPA DOUROUB ELDJAZAIR — SYSTÈME INTÉGRÉ GDS & MAINTENANCE</strong><br>
                        Document officiel de mouvement de stock • Traçabilité auditable conforme aux procédures internes
                    </div>
                    <div>
                        ${qrSvg}
                    </div>
                </div>
            </body>
            </html>
        `;

        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => {
            printWin.focus();
            printWin.print();
        }, 350);
    },

    downloadBsmDocx: function(id) {
        const d = DB.getDecharges().find(x => x.id === id);
        if (!d) {
            Utils.showNotification('Document introuvable pour téléchargement Word BSM.', 'warning');
            return;
        }

        const bsmRef = d.bsmRef || ('BSM-' + new Date().getFullYear() + '-' + String(d.ref || '').replace(/[^0-9]/g, '').slice(-4) || 'BSM-2026-0001');
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const filename = `Bon_de_Sortie_Magasin_${bsmRef.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
        const items = d.items || d.lines || [];

        const docHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${bsmRef}</title>
                <!--[if gte mso 9]>
                <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    @page { size: 21cm 29.7cm; margin: 1.5cm; mso-page-orientation: portrait; }
                    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #000000; line-height: 1.25; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
                    th, td { border: 1pt solid #000000; padding: 5pt 7pt; font-size: 10pt; }
                    th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
                    .header-table td { border: none; padding: 2pt; }
                    .title-box { text-align: center; border: 2pt solid #000000; padding: 8pt; font-size: 15pt; font-weight: bold; letter-spacing: 1pt; background-color: #f8fafc; margin-bottom: 12pt; }
                    .section-header { background-color: #e2e8f0; font-weight: bold; font-size: 10.5pt; padding: 4pt 8pt; border: 1pt solid #000000; margin-top: 10pt; margin-bottom: 4pt; text-transform: uppercase; }
                    .sig-table td { height: 75pt; vertical-align: top; font-size: 9.5pt; }
                </style>
            </head>
            <body>
                <table class="header-table" style="width:100%;">
                    <tr>
                        <td style="width:60%;vertical-align:top;">
                            <div style="font-size:13pt;font-weight:bold;color:#0f172a;">SPA DOUROUB ELDJAZAIR</div>
                            <div style="font-size:9.5pt;color:#475569;">Direction Exploitation & Maintenance</div>
                            <div style="font-size:9pt;color:#64748b;">Magasin Central GDS — Pièces de Rechange</div>
                        </td>
                        <td style="width:40%;text-align:right;vertical-align:top;">
                            <div style="font-size:12pt;font-weight:bold;font-family:monospace;color:#0284c7;">${bsmRef}</div>
                            <div style="font-size:9pt;color:#475569;">Date : ${Utils.formatDate(d.date || d.servedAt || d.createdAt || d.dateDecharge, bsmRef || d.ref)}</div>
                            <div style="font-size:9pt;color:#16a34a;font-weight:bold;">Statut : ${d.status || 'Délivré'}</div>
                        </td>
                    </tr>
                </table>

                <div class="title-box">
                    BON DE SORTIE DU MAGASIN (B.S.M)<br>
                    <span style="font-size:10pt;font-weight:normal;color:#334155;">Document officiel de délivrance et d'imputation comptable de stock (SCF 60 / 31-32)</span>
                </div>

                <div class="section-header">1. INFORMATIONS D'AFFECTATION ET DEMANDEUR</div>
                <table>
                    <tr>
                        <td style="width:50%;"><strong>Service / Département :</strong> ${Utils.escapeHTML(d.service || 'Maintenance & Flotte')}</td>
                        <td style="width:50%;"><strong>Bénéficiaire / Demandeur :</strong> ${Utils.escapeHTML(d.beneficiary || 'Atelier Central')}</td>
                    </tr>
                    <tr>
                        <td><strong>Imputation Véhicule :</strong> ${Utils.escapeHTML(d.materialName || d.immatriculation || 'Atelier')}</td>
                        <td><strong>Immatriculation :</strong> <span style="font-family:monospace;font-weight:bold;">${Utils.escapeHTML(d.immatriculation || '—')}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Motif de la Sortie :</strong> ${Utils.escapeHTML(d.reason || 'Consommation interne atelier')}</td>
                        <td><strong>Ordre de Réparation Lié :</strong> <span style="font-family:monospace;font-weight:bold;color:#0284c7;">${Utils.escapeHTML(d.workPlanRef || '—')}</span></td>
                    </tr>
                </table>

                <div class="section-header">2. PIÈCES ET FOURNITURES SORTIES DU MAGASIN</div>
                <table>
                    <thead>
                        <tr style="background-color:#0f172a;color:#ffffff;">
                            <th style="width:30pt;text-align:center;">N°</th>
                            <th style="width:90pt;">Code OEM</th>
                            <th>Désignation Article</th>
                            <th style="width:50pt;text-align:center;">Qté</th>
                            <th style="width:50pt;text-align:center;">Unité</th>
                            <th style="width:120pt;">Observations</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length > 0 ? items.map((it, idx) => {
                            const art = articles.find(a => a.id === it.articleId || a.code === it.articleId);
                            const code = art ? art.code : (it.articleId || 'PDR');
                            const des = it.designation || (art ? art.designation : 'Article');
                            const unit = it.unit || (art ? art.unit : 'U');
                            const qty = it.quantity || it.qty || 1;
                            const obs = it.obs || 'Délivré en bon état';
                            return `
                                <tr>
                                    <td style="text-align:center;">${idx + 1}</td>
                                    <td style="font-family:monospace;font-weight:bold;">${Utils.escapeHTML(code)}</td>
                                    <td><strong>${Utils.escapeHTML(des)}</strong></td>
                                    <td style="text-align:center;font-weight:bold;">${qty}</td>
                                    <td style="text-align:center;">${Utils.escapeHTML(unit)}</td>
                                    <td>${Utils.escapeHTML(obs)}</td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr><td colspan="6" style="text-align:center;padding:10pt;">Aucun article renseigné.</td></tr>
                        `}
                    </tbody>
                </table>

                <div style="font-size:9pt;color:#166534;background-color:#f0fdf4;border:1pt solid #86efac;padding:6pt 8pt;margin-bottom:12pt;">
                    <strong>Imputation Comptable (Système Comptable Financier - SCF Algérie) :</strong> Les articles ci-dessus énumérés sont sortis définitivement du stock magasin pour consommation immédiate. Débit compte de charge 60 / Crédit compte de stocks 31-32.
                </div>

                <div class="section-header">3. VISAS ET SIGNATURES REGLEMENTAIRES</div>
                <table class="sig-table">
                    <thead>
                        <tr style="background-color:#f1f5f9;color:#000000;">
                            <th style="width:33.3%;">1. Le Magasinier Émetteur</th>
                            <th style="width:33.3%;">2. Chef Section Gestion des Stocks</th>
                            <th style="width:33.3%;">3. Le Réceptionnaire / Demandeur</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>LEKCIR YASSINE</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Visa Délivrance Pièces</span><br><br>
                                <span style="font-size:8.5pt;">Date : ${Utils.formatDate(d.date || d.servedAt || d.createdAt || d.dateDecharge, bsmRef || d.ref)}</span>
                            </td>
                            <td>
                                <strong>Chef Section GDS</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Contrôle quantitatif & sortie</span><br><br>
                                <span style="font-size:8.5pt;">Date : ……/……/2026</span>
                            </td>
                            <td>
                                <strong>${Utils.escapeHTML(d.beneficiary || 'Demandeur')}</strong><br>
                                <span style="font-size:8.5pt;color:#64748b;">Signature de prise en charge</span><br><br>
                                <span style="font-size:8.5pt;">Date : ……/……/2026</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align:center;font-size:8.5pt;color:#64748b;margin-top:14pt;border-top:1pt solid #cbd5e1;padding-top:4pt;">
                    SPA DOUROUB ELDJAZAIR — SYSTÈME DE GESTION DE STOCKS (GDS) • BON DE SORTIE DU MAGASIN (B.S.M)
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 200);
        Utils.showNotification(`Fichier Word BSM téléchargé : ${filename}`, 'success');
    },

    exportPDF: function(id) {
        const d = (typeof DB !== 'undefined' && DB.getDecharges)
            ? DB.getDecharges().find(x => x.id === id || x._id === id || x.ref === id)
            : null;
        if (!d) {
            Utils.showNotification('Document introuvable pour export PDF.', 'error');
            return;
        }

        const isBsm = (d.typeDoc === 'bsm') || (d.type === 'BSM') || (d.ref && String(d.ref).startsWith('BSM')) || Boolean(d.workPlanId || d.materialId);

        if (typeof PDFGen !== 'undefined' && typeof PDFGen.export === 'function') {
            PDFGen.export(isBsm ? 'bsm' : 'decharge', d.id || d._id || id);
        } else {
            this.printBSM(d.id || d._id || id);
        }
    },

    exportExcel: function() {
        const decharges = DB.getDecharges().sort((a,b) => new Date(b.date) - new Date(a.date));
        const articles = DB.getArticles();
        // One row per décharge
        const data = decharges.map(d => ({
            'Référence': d.ref || '',
            'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
            'Bénéficiaire': d.beneficiary || '',
            'Service / Département': d.service || '',
            'Matériel / Véhicule': d.materialName || d.immatriculation || '',
            'Immatriculation': d.immatriculation || '',
            'Motif': d.reason || '',
            'Statut': d.status || '',
            'Validé par': d.validatedBy || '',
            'Date Validation': d.validatedAt ? new Date(d.validatedAt).toLocaleDateString('fr-FR') : '',
            'Nb Articles': (d.items || d.lines || []).length,
            'Créé par': d.createdByName || d.createdBy || ''
        }));

        // Second sheet: detail lines
        const lines = [];
        decharges.forEach(d => {
            (d.items || d.lines || []).forEach(item => {
                const art = articles.find(a => a.id === item.articleId);
                lines.push({
                    'Référence Décharge': d.ref || '',
                    'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
                    'Bénéficiaire': d.beneficiary || '',
                    'Code Article': art ? art.code : (item.articleId || ''),
                    'Désignation Article': item.designation || (art ? art.designation : ''),
                    'Quantité': item.quantity || 0,
                    'Unité': item.unit || (art ? art.unit : ''),
                    'Statut Décharge': d.status || ''
                });
            });
        });

        Utils.downloadXLSX('Decharges_' + new Date().toISOString().split('T')[0], [
            { name: 'Décharges', data },
            { name: 'Détail Articles', data: lines }
        ]);
        Utils.showNotification('Export Excel des décharges généré avec succès.', 'success');
    }
};

window.PVs = {
    render: function() {
        const pvs = DB.getPVs();
        const decharges = DB.getDecharges();
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-file-contract text-primary me-2"></i> PV de Mise à Disposition</h2>
                    <p class="text-muted" style="margin:0;">Procès-verbaux officiels d'affectation et de remise du matériel</p>
                </div>
                <div>
                    <button class="btn btn-outline-success btn-sm" onclick="PVs.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                </div>
            </div>
            <div class="card mt-2">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Réf. PV</th>
                                    <th>Date</th>
                                    <th>Bénéficiaire</th>
                                    <th>Décharge Liée</th>
                                    <th>Nb Articles</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pvs.map(pv => {
                                    const d = decharges.find(x => x.id === pv.dechargeId);
                                    return `
                                    <tr>
                                        <td>${Utils.escapeHTML(pv.ref)}</td>
                                        <td>${new Date(pv.date).toLocaleDateString('fr-FR')}</td>
                                        <td>${d ? Utils.escapeHTML(d.beneficiary) : '-'}</td>
                                        <td>${d ? Utils.escapeHTML(d.ref) : '-'}</td>
                                        <td>${pv.items ? pv.items.length : 0}</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-info" onclick="PVs.showDetail('${pv.id}')">Gérer / Détails</button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                                ${pvs.length === 0 ? '<tr><td colspan="6" class="text-center">Aucun PV généré</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    showDetail: function(id) {
        const pv = DB.getPVs().find(p => p.id === id);
        if(!pv) return;
        const d = DB.getDecharges().find(x => x.id === pv.dechargeId);
        const articles = DB.getArticles();
        
        const html = `
            <div class="mb-3">
                <p><strong>PV Réf:</strong> ${Utils.escapeHTML(pv.ref)}</p>
                <p><strong>Lié à:</strong> ${d ? d.ref : '-'} - Bénéficiaire: ${d ? Utils.escapeHTML(d.beneficiary) : '-'}</p>
            </div>
            
            <form id="pvForm" onsubmit="PVs.savePV(event, '${id}')">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Article</th>
                            <th>Qté</th>
                            <th>Code Inventaire (Optionnel)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pv.items.map((item, idx) => {
                            const art = articles.find(a => a.id === item.articleId);
                            return `
                            <tr>
                                <td>${art ? Utils.escapeHTML(art.designation) : ''}</td>
                                <td>${item.quantity}</td>
                                <td><input type="text" name="invCode_${idx}" class="form-control form-control-sm" value="${Utils.escapeHTML(item.inventoryCode || '')}"></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="text-end mt-3">
                    <button type="button" class="btn btn-secondary" onclick="PVs.exportPDF('${id}')"><i class="fas fa-print"></i> Imprimer PV</button>
                    <button type="submit" class="btn btn-primary">Enregistrer Codes Inventaire</button>
                </div>
            </form>
        `;
        UI.showModal('Détails PV', html, null, 'modal-lg');
    },
    savePV: function(e, id) {
        e.preventDefault();
        const pv = DB.getPVs().find(p => p.id === id);
        const form = e.target;
        
        pv.items.forEach((item, idx) => {
            item.inventoryCode = form['invCode_' + idx].value;
        });
        
        DB.updatePV(pv);
        UI.showAlert('Codes d\'inventaire sauvegardés.', 'success');
    },
    exportPDF: function(id) {
        if (typeof PDFGen !== 'undefined') {
            PDFGen.export('pv', id);
        } else {
            Utils.showNotification('Moteur PDF indisponible.', 'error');
        }
    },
    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non disponible.', 'danger');
            return;
        }
        const pvs = DB.getPVs();
        const decharges = DB.getDecharges();
        const articles = DB.getArticles();
        const data = [];
        pvs.forEach(pv => {
            const d = decharges.find(x => x.id === pv.dechargeId);
            if (pv.items && pv.items.length > 0) {
                pv.items.forEach(it => {
                    const art = articles.find(a => a.id === it.articleId);
                    data.push({
                        'Réf. PV': pv.ref || '',
                        'Date': pv.date ? new Date(pv.date).toLocaleDateString('fr-FR') : '',
                        'Réf. Décharge': d ? d.ref : '',
                        'Bénéficiaire': d ? d.beneficiary : '',
                        'Département': d ? d.service : '',
                        'Code Article': art ? art.code : it.articleId,
                        'Désignation': art ? (art.name || art.designation) : '',
                        'Quantité': it.quantity || 0,
                        'Code Inventaire': it.inventoryCode || ''
                    });
                });
            } else {
                data.push({
                    'Réf. PV': pv.ref || '',
                    'Date': pv.date ? new Date(pv.date).toLocaleDateString('fr-FR') : '',
                    'Réf. Décharge': d ? d.ref : '',
                    'Bénéficiaire': d ? d.beneficiary : '',
                    'Département': d ? d.service : '',
                    'Code Article': '-',
                    'Désignation': '-',
                    'Quantité': 0,
                    'Code Inventaire': ''
                });
            }
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PV_Mise_A_Disposition");
        XLSX.writeFile(wb, `PV_Mise_A_Disposition_${new Date().toISOString().slice(0, 10)}.xlsx`);
        UI.showAlert('Export Excel des PV généré avec succès !', 'success');
    }
};

window.Fleet = {
    render: function() {
        const fleet = DB.getFleet();
        const settings = DB.getSettings();
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Parc Matériel / Flotte</h2>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success" onclick="Fleet.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-primary" onclick="Fleet.showAddMaterial()"><i class="fas fa-plus"></i> Ajouter Matériel</button>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-4">
                    <select id="fleetFamilyFilter" class="form-select" onchange="Fleet.filterCards()">
                        <option value="">Toutes les familles</option>
                        ${settings.materialFamilies.map(f => `<option value="${Utils.escapeHTML(f.name)}">${Utils.escapeHTML(f.name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="row" id="fleetCards">
                ${fleet.map(f => {
                    let badge = 'success';
                    if(f.status === 'En panne') badge = 'danger';
                    if(f.status === 'En maintenance') badge = 'warning';
                    
                    return `
                    <div class="col-md-4 mb-4 fleet-card" data-family="${Utils.escapeHTML(f.family)}">
                        <div class="card h-100">
                            <img loading="lazy" src="${Utils.escapeHTML(f.photo || 'https://via.placeholder.com/300x150?text=Pas+de+photo')}" class="card-img-top" alt="${Utils.escapeHTML(f.name)}" style="height: 150px; object-fit: cover;">
                            <div class="card-body">
                                <h5 class="card-title">${Utils.escapeHTML(f.name)}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">${Utils.escapeHTML(f.immatriculation)}</h6>
                                <p class="card-text">
                                    <span class="badge bg-secondary">${Utils.escapeHTML(f.family)}</span>
                                    <span class="badge bg-${badge}">${f.status}</span>
                                </p>
                            </div>
                            <div class="card-footer bg-white border-top-0 d-flex justify-content-between">
                                <button class="btn btn-sm btn-outline-info" onclick="Fleet.showDetail('${f.id}')">Détails</button><button class="btn btn-sm btn-outline-success ms-1" onclick="Consumption.viewForTruck('${f.id}')" title="Analyse de Consommation"><i class="fas fa-chart-line"></i> Conso</button>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="Fleet.showEditMaterial('${f.id}')"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="Fleet.deleteMaterial('${f.id}')"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
                ${fleet.length === 0 ? '<div class="col-12"><div class="alert alert-info">Aucun matériel enregistré.</div></div>' : ''}
            </div>
        `;
        return html;
    },
    filterCards: function() {
        const family = document.getElementById('fleetFamilyFilter').value;
        document.querySelectorAll('.fleet-card').forEach(card => {
            const f = card.getAttribute('data-family');
            if(family === "" || f === family) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },
    showAddMaterial: function() {
        const settings = DB.getSettings();
        const html = `
            <form onsubmit="Fleet.saveMaterial(event)">
                <div class="mb-3">
                    <label>Désignation / Nom *</label>
                    <input type="text" name="name" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Immatriculation / N° Série *</label>
                    <input type="text" name="immatriculation" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Famille *</label>
                    <select name="family" class="form-select" required>
                        ${settings.materialFamilies.map(f => `<option value="${Utils.escapeHTML(f.name)}">${Utils.escapeHTML(f.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-3">
                    <label>Statut *</label>
                    <select name="status" class="form-select" required>
                        <option value="Actif">Actif</option>
                        <option value="En panne">En panne</option>
                        <option value="En maintenance">En maintenance</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label>Photo (URL)</label>
                    <input type="text" name="photo" class="form-control">
                </div>
                <div class="mb-3">
                    <label>Notes</label>
                    <textarea name="notes" class="form-control" rows="2"></textarea>
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `;
        UI.showModal('Ajouter Matériel', html);
    },
    showEditMaterial: function(id) {
        const mat = DB.getFleet().find(f => f.id === id);
        if(!mat) return;
        const settings = DB.getSettings();
        
        const html = `
            <form onsubmit="Fleet.saveMaterial(event, '${id}')">
                <div class="mb-3">
                    <label>Désignation / Nom *</label>
                    <input type="text" name="name" class="form-control" required value="${Utils.escapeHTML(mat.name)}">
                </div>
                <div class="mb-3">
                    <label>Immatriculation / N° Série *</label>
                    <input type="text" name="immatriculation" class="form-control" required value="${Utils.escapeHTML(mat.immatriculation)}">
                </div>
                <div class="mb-3">
                    <label>Famille *</label>
                    <select name="family" class="form-select" required>
                        ${settings.materialFamilies.map(f => `<option value="${Utils.escapeHTML(f.name)}" ${mat.family === f.name ? 'selected' : ''}>${Utils.escapeHTML(f.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-3">
                    <label>Statut *</label>
                    <select name="status" class="form-select" required>
                        <option value="Actif" ${mat.status === 'Actif' ? 'selected' : ''}>Actif</option>
                        <option value="En panne" ${mat.status === 'En panne' ? 'selected' : ''}>En panne</option>
                        <option value="En maintenance" ${mat.status === 'En maintenance' ? 'selected' : ''}>En maintenance</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label>Photo (URL)</label>
                    <input type="text" name="photo" class="form-control" value="${Utils.escapeHTML(mat.photo || '')}">
                </div>
                <div class="mb-3">
                    <label>Notes</label>
                    <textarea name="notes" class="form-control" rows="2">${Utils.escapeHTML(mat.notes || '')}</textarea>
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-primary">Mettre à jour</button>
                </div>
            </form>
        `;
        UI.showModal('Modifier Matériel', html);
    },
    saveMaterial: function(e, id = null) {
        e.preventDefault();
        const form = e.target;
        const mat = {
            name: form.name.value,
            immatriculation: form.immatriculation.value,
            family: form.family.value,
            status: form.status.value,
            photo: form.photo.value,
            notes: form.notes.value
        };
        
        if (id) {
            mat.id = id;
            DB.updateFleet(mat);
        } else {
            mat.id = Utils.generateId();
            DB.addFleet(mat);
        }
        
        UI.hideModal();
        UI.refresh();
        UI.showAlert('Matériel enregistré.', 'success');
    },
    deleteMaterial: function(id) {
        if(confirm("Supprimer ce matériel ?")) {
            DB.deleteFleet(id);
            UI.refresh();
        }
    },
    showDetail: function(id) {
        const mat = DB.getFleet().find(f => f.id === id);
        if(!mat) return;
        
        // Find consumption via decharges assigned to this materialId
        const decharges = DB.getDecharges().filter(d => d.materialId === id && d.status === 'Approuvée');
        const articles = DB.getArticles();
        
        let totalItems = 0;
        decharges.forEach(d => {
            d.items.forEach(i => totalItems += i.quantity);
        });
        
        const html = `
            <div class="row">
                <div class="col-md-4">
                    <img loading="lazy" src="${Utils.escapeHTML(mat.photo || 'https://via.placeholder.com/300x150?text=Pas+de+photo')}" class="img-fluid mb-3 rounded">
                    <h5>${Utils.escapeHTML(mat.name)}</h5>
                    <p class="text-muted">${Utils.escapeHTML(mat.immatriculation)}</p>
                    <ul class="list-group list-group-flush mb-3">
                        <li class="list-group-item d-flex justify-content-between"><span>Famille:</span> <strong>${Utils.escapeHTML(mat.family)}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Statut:</span> <strong>${mat.status}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Décharges liées:</span> <strong>${decharges.length}</strong></li>
                        <li class="list-group-item d-flex justify-content-between"><span>Total Pièces/Conso:</span> <strong>${totalItems}</strong></li>
                        <li class="list-group-item p-2"><button class="btn btn-sm btn-primary w-100" onclick="UI.hideModal();Consumption.viewForTruck('${mat.id}')"><i class="fas fa-chart-pie me-1"></i> Voir Analyse Consommation Complète</button></li>
                    </ul>
                </div>
                <div class="col-md-8">
                    <h5>Historique Consommation</h5>
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Décharge Réf.</th>
                                    <th>Article</th>
                                    <th>Qté</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${decharges.flatMap(d => d.items.map(i => {
                                    const art = articles.find(a => a.id === i.articleId);
                                    return `
                                    <tr>
                                        <td>${Utils.formatDate(d.date, d.ref)}</td>
                                        <td>${Utils.escapeHTML(d.ref)}</td>
                                        <td>${art ? Utils.escapeHTML(art.designation) : 'Inconnu'}</td>
                                        <td>${i.quantity}</td>
                                    </tr>`;
                                })).join('')}
                                ${decharges.length === 0 ? '<tr><td colspan="4" class="text-center">Aucune consommation enregistrée</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        UI.showModal('Détails Matériel', html, null, 'modal-lg');
    },

    exportExcel: function() {
        const fleet = DB.getFleet();
        const data = fleet.map(f => ({
            'Code': f.code || f.id || '',
            'Désignation': f.name || '',
            'Famille': f.family || '',
            'Marque': f.brand || f.marque || '',
            'Type': f.type || '',
            'N° de Série': f.serialNumber || f.serial || '',
            'Immatriculation': f.immatriculation || '',
            'Statut': f.status || 'Actif',
            'Notes': f.notes || ''
        }));
        Utils.downloadXLSX('Parc_Materiel_' + new Date().toISOString().split('T')[0], [
            { name: 'Flotte', data }
        ]);
        Utils.showNotification('Export Excel de la flotte généré avec succès.', 'success');
    }
};

window.MaterialFamilies = {
    render: function() {
        const settings = DB.getSettings();
        const families = settings.materialFamilies;
        const fleet = DB.getFleet();
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Familles de Matériel</h2>
                <button class="btn btn-primary" onclick="MaterialFamilies.showAdd()"><i class="fas fa-plus"></i> Nouvelle Famille</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Icône</th>
                                <th>Nom</th>
                                <th>Nb Matériels associés</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${families.map((f, idx) => {
                                const count = fleet.filter(mat => mat.family === f.name).length;
                                return `
                                <tr>
                                    <td><i class="fas ${Utils.escapeHTML(f.icon || 'fa-cog')} fs-4"></i></td>
                                    <td>${Utils.escapeHTML(f.name)}</td>
                                    <td>${count}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-danger" onclick="MaterialFamilies.delete(${idx}, ${count})"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return html;
    },
    showAdd: function() {
        const html = `
            <form onsubmit="MaterialFamilies.save(event)">
                <div class="mb-3">
                    <label>Nom de la famille *</label>
                    <input type="text" name="name" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Classe d'icône Bootstrap (ex: fa-truck)</label>
                    <input type="text" name="icon" class="form-control" value="fa-cog">
                </div>
                <div class="text-end">
                    <button type="submit" class="btn btn-primary">Ajouter</button>
                </div>
            </form>
        `;
        UI.showModal('Ajouter Famille', html);
    },
    save: function(e) {
        e.preventDefault();
        const form = e.target;
        const settings = DB.getSettings();
        settings.materialFamilies.push({
            name: form.name.value,
            icon: form.icon.value
        });
        DB.updateSettings(settings);
        UI.hideModal();
        UI.refresh();
    },
    delete: function(idx, count) {
        if (count > 0) {
            UI.showAlert('Impossible de supprimer une famille utilisée par des matériels.', 'danger');
            return;
        }
        if(confirm("Supprimer cette famille ?")) {
            const settings = DB.getSettings();
            settings.materialFamilies.splice(idx, 1);
            DB.updateSettings(settings);
            UI.refresh();
        }
    }
};

window.Citernes = {
    currentTab: 'tanks', // 'tanks', 'deliveries', 'analytics'
    viewMode: 'table',   // 'table' (High-density DB) or 'cards' (Telemetry)
    tankFilter: 'all',   // 'all', 'Gasoil', 'Essence', 'Huile', 'alert'
    tankSearch: '',
    deliveryFilter: 'all',
    deliverySearch: '',

    setTab: function(tab) {
        this.currentTab = tab;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
        if (tab === 'analytics') {
            setTimeout(() => this.initAnalyticsChart(), 60);
        }
    },

    setViewMode: function(mode) {
        this.viewMode = mode;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
    },

    setTankFilter: function(filter) {
        this.tankFilter = filter;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
    },

    setTankSearch: function(val) {
        this.tankSearch = (val || '').toLowerCase().trim();
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
        const input = document.getElementById('citerneSearchInput');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    },

    setDeliveryFilter: function(filter) {
        this.deliveryFilter = filter;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
    },

    setDeliverySearch: function(val) {
        this.deliverySearch = (val || '').toLowerCase().trim();
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
        const input = document.getElementById('deliverySearchInput');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    },

    getHistory: function() {
        if (!DB.data) return [];
        if (!DB.data.citerneHistory) DB.data.citerneHistory = [];
        return DB.data.citerneHistory.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    },

    getCiternesList: function() {
        const raw = DB.getCiternes ? DB.getCiternes() : [];
        return raw.map((c, idx) => ({
            ...c,
            code: c.code || ('CV-' + String(idx + 1).padStart(2, '0')),
            name: c.name || ('Cuve ' + (idx + 1)),
            location: c.location || 'Dépôt Principal',
            capacity: Number(c.capacity) || 0,
            currentLevel: Number(c.currentLevel) || 0,
            minAlert: Number(c.minAlert) || Math.round((Number(c.capacity) || 0) * 0.20),
            unit: c.unit || 'Litres',
            type: c.type || 'Gasoil'
        }));
    },

    autoGenCode: function() {
        const list = this.getCiternesList();
        let maxNum = 0;
        list.forEach(c => {
            const m = (c.code || '').match(/(?:CV|CT)[-_]?(\d+)/i);
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        });
        return 'CV-' + String(maxNum + 1).padStart(2, '0');
    },

    autoGenName: function(type = 'Gasoil') {
        const list = this.getCiternesList();
        const countSame = list.filter(c => (c.type || '').toLowerCase().startsWith(type.toLowerCase().slice(0, 3))).length;
        return `Citerne ${type} N° ${countSame + 1}`;
    },

    getDefaultCapacity: function(type = 'Gasoil') {
        const defaults = {
            'Gasoil': { cap: 30000, alert: 6000 },
            'Essence': { cap: 15000, alert: 3000 },
            'Essence Sans Plomb': { cap: 15000, alert: 3000 },
            'Essence Super': { cap: 15000, alert: 3000 },
            'Huile': { cap: 5000, alert: 1000 },
            'Huile Moteur 15W40': { cap: 5000, alert: 1000 },
            'Huile Transmission': { cap: 5000, alert: 1000 },
            'AdBlue': { cap: 5000, alert: 1000 },
            'Eau': { cap: 10000, alert: 2000 },
            'Eau Industrielle': { cap: 10000, alert: 2000 }
        };
        return defaults[type] || { cap: 20000, alert: 4000 };
    },

    onAddTypeChange: function(newType) {
        const nameInput = document.getElementById('newCuveName');
        const capInput = document.getElementById('newCuveCap');
        const alertInput = document.getElementById('newCuveAlert');
        const def = this.getDefaultCapacity(newType);

        if (nameInput) {
            nameInput.value = this.autoGenName(newType);
        }
        if (capInput) {
            capInput.value = def.cap;
        }
        if (alertInput) {
            alertInput.value = def.alert;
        }
    },

    setPresetCapacity: function(val) {
        const capInput = document.getElementById('newCuveCap');
        const alertInput = document.getElementById('newCuveAlert');
        if (capInput) capInput.value = val;
        if (alertInput) alertInput.value = Math.round(val * 0.2);
    },

    render: function(initialTab) {
        if (initialTab) this.currentTab = initialTab;
        const citernes = this.getCiternesList();
        const history = this.getHistory();

        const totalStock = citernes.reduce((sum, c) => sum + c.currentLevel, 0);
        const totalCap = citernes.reduce((sum, c) => sum + c.capacity, 0);
        const globalPct = totalCap > 0 ? Math.round((totalStock / totalCap) * 100) : 0;

        const alertTanks = citernes.filter(c => {
            const pct = c.capacity > 0 ? (c.currentLevel / c.capacity) * 100 : 0;
            return c.currentLevel <= c.minAlert || pct < 20;
        });

        const now = new Date();
        const thisMonthRefills = history.filter(h => {
            const d = new Date(h.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const monthLitres = thisMonthRefills.reduce((s, h) => s + (Number(h.qtyAdded) || 0), 0);
        const totalPaidAmount = history.filter(h => h.paymentStatus === 'Payé').reduce((s, h) => s + (Number(h.amount) || 0), 0);
        const totalUnpaidAmount = history.filter(h => h.paymentStatus === 'Non payé').reduce((s, h) => s + (Number(h.amount) || 0), 0);

        let html = `
            <!-- Top Command Bar: Title & Primary Actions -->
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                    <span style="font-size:16px;font-weight:800;color:var(--text);">
                        <i class="fas fa-oil-well text-primary me-1"></i> Base de Données des Cuves
                    </span>
                    <span class="badge bg-secondary font-monospace" style="font-size:10px;">${citernes.length} cuves</span>
                    ${alertTanks.length > 0 ? `<span class="badge bg-danger" style="font-size:10px;"><i class="fas fa-exclamation-triangle me-1"></i>${alertTanks.length} en réserve</span>` : ''}
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-success" onclick="Citernes.exportExcel()">
                        <i class="fas fa-file-excel me-1"></i> Exporter Excel
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="Citernes.showAddCiterne()">
                        <i class="fas fa-plus-circle me-1"></i> Nouvelle Cuve
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="Citernes.showRefill('')">
                        <i class="fas fa-truck-droplet me-1"></i> Enregistrer Dépotage
                    </button>
                </div>
            </div>

            <!-- Ultra-compact Executive Metric Strip (Replaces bulky cards, height ~44px) -->
            <div class="card p-2 mb-2" style="background:var(--surface);border:1px solid var(--border);">
                <div class="row g-2 text-center align-items-center" style="font-size:12px;">
                    <div class="col-6 col-md-3 border-end">
                        <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Stock Global Réserve</div>
                        <div class="fw-bold" style="font-size:15px;color:var(--text);">
                            ${Utils.formatNumber(totalStock)} <small class="text-muted" style="font-size:11px;">/ ${Utils.formatNumber(totalCap)} L (${globalPct}%)</small>
                        </div>
                    </div>
                    <div class="col-6 col-md-3 border-end">
                        <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Taux Remplissage</div>
                        <div class="fw-bold" style="font-size:15px;color:${globalPct < 25 ? 'var(--danger,#dc2626)' : '#10b981'};">
                            ${globalPct}% ${globalPct < 25 ? '⚠️ Réserve Basse' : '✓ Normal'}
                        </div>
                    </div>
                    <div class="col-6 col-md-3 border-end">
                        <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Dépotages Ce Mois</div>
                        <div class="fw-bold text-success" style="font-size:15px;">
                            +${Utils.formatNumber(monthLitres)} L <small class="text-muted" style="font-size:11px;">(${thisMonthRefills.length} livraisons)</small>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Règlements Fournisseurs</div>
                        <div class="fw-bold" style="font-size:12px;">
                            <span class="text-success">Payé: ${Utils.formatNumber(totalPaidAmount)} DA</span>
                            ${totalUnpaidAmount > 0 ? `<span class="text-danger ms-1">| Dû: ${Utils.formatNumber(totalUnpaidAmount)} DA</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Unified Navigation & Filter Toolbar (Compact single row) -->
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div class="btn-group btn-group-sm">
                    <button class="btn ${this.currentTab === 'tanks' ? 'btn-dark' : 'btn-outline-secondary'}" onclick="Citernes.setTab('tanks')">
                        <i class="fas fa-database me-1"></i> Cuves (${citernes.length})
                    </button>
                    <button class="btn ${this.currentTab === 'deliveries' ? 'btn-dark' : 'btn-outline-secondary'}" onclick="Citernes.setTab('deliveries')">
                        <i class="fas fa-receipt me-1"></i> Dépotages (${history.length})
                    </button>
                    <button class="btn ${this.currentTab === 'analytics' ? 'btn-dark' : 'btn-outline-secondary'}" onclick="Citernes.setTab('analytics')">
                        <i class="fas fa-chart-line me-1"></i> Analyse
                    </button>
                </div>

                ${this.currentTab === 'tanks' ? `
                <div class="d-flex align-items-center gap-1 flex-wrap ms-auto">
                    <input type="text" id="citerneSearchInput" class="form-control form-control-sm" placeholder="Filtrer..." style="width:140px;height:28px;" value="${Utils.escapeHTML(this.tankSearch)}" oninput="Citernes.setTankSearch(this.value)">
                    <button class="btn btn-xs ${this.tankFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Citernes.setTankFilter('all')">Tous</button>
                    <button class="btn btn-xs ${this.tankFilter === 'Gasoil' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Citernes.setTankFilter('Gasoil')">Gasoil</button>
                    <button class="btn btn-xs ${this.tankFilter === 'Essence' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Citernes.setTankFilter('Essence')">Essence</button>
                    <button class="btn btn-xs ${this.tankFilter === 'Huile' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Citernes.setTankFilter('Huile')">Huile</button>
                    ${alertTanks.length > 0 ? `<button class="btn btn-xs ${this.tankFilter === 'alert' ? 'btn-danger' : 'btn-outline-danger'}" onclick="Citernes.setTankFilter('alert')">⚠️ Alerte (${alertTanks.length})</button>` : ''}

                    <div class="btn-group btn-group-sm ms-2">
                        <button class="btn ${this.viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}" onclick="Citernes.setViewMode('table')" title="Vue Tableau"><i class="fas fa-table-list"></i></button>
                        <button class="btn ${this.viewMode === 'cards' ? 'btn-dark' : 'btn-outline-secondary'}" onclick="Citernes.setViewMode('cards')" title="Vue Cartes"><i class="fas fa-grip"></i></button>
                    </div>
                </div>` : ''}
            </div>
        `;

        if (this.currentTab === 'tanks') {
            html += this.renderTanksView(citernes, history);
        } else if (this.currentTab === 'deliveries') {
            html += this.renderDeliveriesView(history, citernes);
        } else if (this.currentTab === 'analytics') {
            html += this.renderAnalyticsView(citernes, history);
        }

        return html;
    },

    renderTanksView: function(citernes, history) {
        let filtered = citernes.filter(c => {
            if (this.tankFilter === 'alert') {
                const pct = c.capacity > 0 ? (c.currentLevel / c.capacity) * 100 : 0;
                if (c.currentLevel > c.minAlert && pct >= 20) return false;
            } else if (this.tankFilter !== 'all') {
                if ((c.type || '').toLowerCase() !== this.tankFilter.toLowerCase()) return false;
            }
            if (this.tankSearch) {
                const q = this.tankSearch;
                const match = (c.code || '').toLowerCase().includes(q) ||
                              (c.name || '').toLowerCase().includes(q) ||
                              (c.location || '').toLowerCase().includes(q) ||
                              (c.type || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });

        const typeStyles = {
            'Gasoil': { color: '#b45309', bg: '#fef3c7', icon: 'fa-gas-pump' },
            'Essence': { color: '#b91c1c', bg: '#fee2e2', icon: 'fa-fire' },
            'Essence Sans Plomb': { color: '#b91c1c', bg: '#fee2e2', icon: 'fa-fire' },
            'Essence Super': { color: '#b91c1c', bg: '#fee2e2', icon: 'fa-fire' },
            'Huile': { color: '#047857', bg: '#d1fae5', icon: 'fa-oil-can' },
            'Huile Moteur 15W40': { color: '#047857', bg: '#d1fae5', icon: 'fa-oil-can' },
            'Huile Transmission': { color: '#047857', bg: '#d1fae5', icon: 'fa-oil-can' },
            'AdBlue': { color: '#0369a1', bg: '#e0f2fe', icon: 'fa-droplet' },
            'Eau': { color: '#1d4ed8', bg: '#dbeafe', icon: 'fa-tint' },
            'Eau Industrielle': { color: '#1d4ed8', bg: '#dbeafe', icon: 'fa-tint' }
        };

        return this.viewMode === 'table' ? this.renderTableView(filtered, history, typeStyles) : this.renderCardsView(filtered, history, typeStyles);
    },

    renderTableView: function(citernes, history, typeStyles) {
        return `
            <div class="card p-0" style="border:1px solid var(--border);border-radius:4px;overflow:hidden;">
                <div class="table-responsive" style="margin:0;">
                    <table class="table table-hover table-striped align-middle mb-0 table-compact" style="width:100%;">
                        <thead class="table-light">
                            <tr>
                                <th style="width:30%;">Cuve & Carburant</th>
                                <th style="width:24%;">Stock Actuel & Jauge</th>
                                <th style="width:18%;">Capacité & Seuil</th>
                                <th style="width:12%;">Statut</th>
                                <th style="width:16%;text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${citernes.map(c => {
                                const pct = c.capacity > 0 ? Math.round((c.currentLevel / c.capacity) * 100) : 0;
                                const cHistory = history.filter(h => h.citerneId === c.id);
                                const lastRefill = cHistory.length > 0 ? cHistory[0] : null;

                                let barColor = '#10B981';
                                let statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:10px;"><i class="fas fa-check-circle me-1"></i>Optimal</span>';
                                if (pct < 10) {
                                    barColor = '#EF4444';
                                    statusBadge = '<span class="badge bg-danger text-white" style="font-size:10px;"><i class="fas fa-triangle-exclamation me-1"></i>Critique</span>';
                                } else if (pct < 25 || c.currentLevel <= c.minAlert) {
                                    barColor = '#F59E0B';
                                    statusBadge = '<span class="badge bg-warning-subtle text-warning border border-warning-subtle" style="font-size:10px;"><i class="fas fa-exclamation-triangle me-1"></i>Réserve</span>';
                                } else if (pct < 45) {
                                    barColor = '#2563EB';
                                    statusBadge = '<span class="badge bg-info-subtle text-info border border-info-subtle" style="font-size:10px;"><i class="fas fa-check me-1"></i>Normal</span>';
                                }

                                const st = typeStyles[c.type] || { color: '#2563EB', bg: '#dbeafe', icon: 'fa-oil-well' };

                                return `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="badge bg-secondary font-monospace" style="font-size:11px;">${Utils.escapeHTML(c.code)}</span>
                                            <div>
                                                <strong style="color:var(--text);font-size:13px;">${Utils.escapeHTML(c.name)}</strong>
                                                <div class="small text-muted" style="font-size:11px;">
                                                    <i class="fas fa-location-dot me-1 text-secondary"></i>${Utils.escapeHTML(c.location)}
                                                    <span class="badge ms-1" style="background:${st.bg};color:${st.color};font-size:9px;padding:2px 5px;">
                                                        <i class="fas ${st.icon} me-1"></i>${Utils.escapeHTML(c.type)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="d-flex align-items-baseline gap-2">
                                            <strong style="font-size:13px;color:var(--text);">${Utils.formatNumber(c.currentLevel)} L</strong>
                                            <span class="fw-bold small" style="color:${barColor};font-size:11px;">(${pct}%)</span>
                                        </div>
                                        <div class="citerne-mini-bar" style="width:100%;max-width:140px;height:6px;background:var(--surface-alt);border:1px solid var(--border);border-radius:3px;overflow:hidden;margin-top:2px;">
                                            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:2px;"></div>
                                        </div>
                                    </td>
                                    <td>
                                        <div><strong>${Utils.formatNumber(c.capacity)} L</strong></div>
                                        <small class="text-muted" style="font-size:11px;">Seuil: ${Utils.formatNumber(c.minAlert)} L</small>
                                    </td>
                                    <td>
                                        ${statusBadge}
                                    </td>
                                    <td class="text-end text-nowrap">
                                        <button class="btn btn-xs btn-primary" onclick="Citernes.showRefill('${c.id}')" title="Approvisionner / Jauger">
                                            <i class="fas fa-fill-drip me-1"></i> Jauger
                                        </button>
                                        <button class="btn btn-xs btn-outline-secondary" onclick="Citernes.showHistory('${c.id}')" title="Historique">
                                            <i class="fas fa-history"></i>
                                        </button>
                                        <button class="btn btn-xs btn-outline-secondary" onclick="Citernes.showEditCiterne('${c.id}')" title="Modifier">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${Auth.isAdmin() ? `
                                        <button class="btn btn-xs btn-outline-danger" onclick="Citernes.deleteCiterne('${c.id}')" title="Supprimer">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                        ` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${citernes.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">Aucune cuve enregistrée.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCardsView: function(citernes, history, typeStyles) {
        return `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.75rem;">
                ${citernes.map(c => {
                    const pct = c.capacity > 0 ? Math.round((c.currentLevel / c.capacity) * 100) : 0;
                    const cHistory = history.filter(h => h.citerneId === c.id);
                    const lastRefill = cHistory.length > 0 ? cHistory[0] : null;

                    let barColor = '#10B981';
                    let statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size:10px;"><i class="fas fa-check-circle me-1"></i>Optimal</span>';
                    if (pct < 10) {
                        barColor = '#EF4444';
                        statusBadge = '<span class="badge bg-danger text-white" style="font-size:10px;"><i class="fas fa-triangle-exclamation me-1"></i>Critique</span>';
                    } else if (pct < 25 || c.currentLevel <= c.minAlert) {
                        barColor = '#F59E0B';
                        statusBadge = '<span class="badge bg-warning-subtle text-warning border border-warning-subtle" style="font-size:10px;"><i class="fas fa-exclamation-triangle me-1"></i>Réserve</span>';
                    } else if (pct < 45) {
                        barColor = '#2563EB';
                        statusBadge = '<span class="badge bg-info-subtle text-info border border-info-subtle" style="font-size:10px;"><i class="fas fa-check me-1"></i>Normal</span>';
                    }

                    const st = typeStyles[c.type] || { color: '#2563EB', bg: '#dbeafe', icon: 'fa-oil-well' };
                    const availableSpace = Math.max(0, c.capacity - c.currentLevel);

                    return `
                    <div class="citerne-card" style="border-left: 3px solid ${st.color};padding:12px;">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <div class="d-flex align-items-center gap-1 mb-1">
                                    <span class="badge bg-secondary font-monospace" style="font-size:10px;">${Utils.escapeHTML(c.code)}</span>
                                    <span class="badge" style="background:${st.bg};color:${st.color};font-size:9px;">
                                        <i class="fas ${st.icon} me-1"></i>${Utils.escapeHTML(c.type)}
                                    </span>
                                </div>
                                <h6 class="fw-bold mb-0" style="font-size:13px;color:var(--text);">${Utils.escapeHTML(c.name)}</h6>
                                <div class="small text-muted" style="font-size:11px;"><i class="fas fa-location-dot me-1 text-secondary"></i>${Utils.escapeHTML(c.location)}</div>
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        <div class="p-2 mb-2 rounded" style="background:var(--surface-alt);border:1px solid var(--border);">
                            <div class="d-flex justify-content-between align-items-baseline mb-1">
                                <div>
                                    <span style="font-size:18px;font-weight:800;color:var(--text);">${Utils.formatNumber(c.currentLevel)}</span>
                                    <small class="text-muted ms-1">L</small>
                                </div>
                                <div class="text-end">
                                    <span class="fw-bold" style="color:${barColor};font-size:13px;">${pct}%</span>
                                    <small class="text-muted d-block" style="font-size:10px;">Max: ${Utils.formatNumber(c.capacity)} L</small>
                                </div>
                            </div>

                            <div class="citerne-track" style="height:8px;background:#e2e8f0;border-radius:3px;position:relative;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:2px;"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-1 text-muted" style="font-size:9px;">
                                <span>Disponible: <strong>${Utils.formatNumber(availableSpace)} L</strong></span>
                                <span>Alerte: ${Utils.formatNumber(c.minAlert)} L</span>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center pt-1 border-top">
                            <div class="small text-muted text-truncate" style="font-size:10px;max-width:140px;">
                                ${lastRefill ? `+${Utils.formatNumber(lastRefill.qtyAdded)} L (${new Date(lastRefill.date).toLocaleDateString('fr-FR')})` : 'Aucune livraison'}
                            </div>
                            <div class="d-flex gap-1">
                                <button class="btn btn-xs btn-primary" onclick="Citernes.showRefill('${c.id}')"><i class="fas fa-fill-drip me-1"></i> Jauger</button>
                                <button class="btn btn-xs btn-outline-secondary" onclick="Citernes.showHistory('${c.id}')" title="Historique"><i class="fas fa-history"></i></button>
                                <button class="btn btn-xs btn-outline-secondary" onclick="Citernes.showEditCiterne('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                                ${Auth.isAdmin() ? `
                                <button class="btn btn-xs btn-outline-danger" onclick="Citernes.deleteCiterne('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                                ` : ''}
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    },

    renderDeliveriesView: function(history, citernes) {
        let filtered = history.filter(h => {
            if (this.deliveryFilter === 'Payé' && h.paymentStatus !== 'Payé') return false;
            if (this.deliveryFilter === 'Non payé' && h.paymentStatus === 'Payé') return false;
            if (this.deliverySearch) {
                const q = this.deliverySearch;
                const match = (h.driver || '').toLowerCase().includes(q) ||
                              (h.supplier || '').toLowerCase().includes(q) ||
                              (h.citerneName || '').toLowerCase().includes(q) ||
                              (h.notes || '').toLowerCase().includes(q) ||
                              (Array.isArray(h.attachments) && h.attachments.some(a => (a.ref || '').toLowerCase().includes(q)));
                if (!match) return false;
            }
            return true;
        });

        const totalVol = filtered.reduce((s, h) => s + (Number(h.qtyAdded) || 0), 0);
        const totalAmount = filtered.reduce((s, h) => s + (Number(h.amount) || 0), 0);

        return `
            <div class="card p-2 mb-2" style="background:var(--surface);border:1px solid var(--border);">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-1">
                        <input type="text" id="deliverySearchInput" class="form-control form-control-sm" placeholder="Rechercher dépotage..." style="width:160px;height:28px;" value="${Utils.escapeHTML(this.deliverySearch)}" oninput="Citernes.setDeliverySearch(this.value)">
                        <button class="btn btn-xs ${this.deliveryFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Citernes.setDeliveryFilter('all')">Tous (${history.length})</button>
                        <button class="btn btn-xs ${this.deliveryFilter === 'Payé' ? 'btn-success' : 'btn-outline-success'}" onclick="Citernes.setDeliveryFilter('Payé')">Payés</button>
                        <button class="btn btn-xs ${this.deliveryFilter === 'Non payé' ? 'btn-danger' : 'btn-outline-danger'}" onclick="Citernes.setDeliveryFilter('Non payé')">Non payés</button>
                    </div>

                    <div class="d-flex gap-3 small text-muted">
                        <span>Volume: <strong class="text-success">+${Utils.formatNumber(totalVol)} L</strong></span>
                        <span>Montant: <strong class="text-dark">${Utils.formatNumber(totalAmount)} DA</strong></span>
                        <button class="btn btn-xs btn-primary ms-2" onclick="Citernes.showRefill('')"><i class="fas fa-plus me-1"></i> Nouveau</button>
                    </div>
                </div>
            </div>

            <div class="card p-0" style="border:1px solid var(--border);border-radius:4px;overflow:hidden;">
                <div class="table-responsive" style="margin:0;">
                    <table class="table table-hover table-striped align-middle mb-0 table-compact" style="width:100%;">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Cuve Cible</th>
                                <th>Volume Livré</th>
                                <th>Jauge Avant/Après</th>
                                <th>Chauffeur & Fournisseur</th>
                                <th>Règlement</th>
                                <th>Montant</th>
                                <th>Documents</th>
                                <th width="60" class="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(h => {
                                const cit = citernes.find(c => c.id === h.citerneId);
                                const citName = cit ? (cit.code ? cit.code + ' - ' + cit.name : cit.name) : (h.citerneName || 'Cuve');
                                const isPaid = h.paymentStatus === 'Payé';
                                const attachments = Array.isArray(h.attachments) ? h.attachments : [];

                                return `
                                <tr>
                                    <td>
                                        <strong>${new Date(h.date).toLocaleDateString('fr-FR')}</strong>
                                    </td>
                                    <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(citName)}</span></td>
                                    <td><strong class="text-success" style="font-size:13px;">+${Utils.formatNumber(h.qtyAdded)} L</strong></td>
                                    <td>
                                        <div class="small text-muted">${Utils.formatNumber(h.levelBefore)} ➔ ${Utils.formatNumber(h.levelAfter)} L</div>
                                    </td>
                                    <td>
                                        <div><strong>${Utils.escapeHTML(h.supplier || 'NAFTAL')}</strong></div>
                                        ${h.driver ? `<small class="text-muted">${Utils.escapeHTML(h.driver)}</small>` : ''}
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-xs ${isPaid ? 'btn-success' : 'btn-outline-danger'}" onclick="Citernes.togglePayment('${h.id}')">
                                            ${isPaid ? 'Payé' : 'Non payé'}
                                        </button>
                                    </td>
                                    <td><strong>${h.amount ? Utils.formatNumber(h.amount) + ' DA' : '-'}</strong></td>
                                    <td>
                                        <div class="d-flex flex-wrap gap-1">
                                            ${attachments.map(att => `
                                                <span class="badge bg-light text-dark border" style="font-size:10px;">
                                                    ${Utils.escapeHTML(att.type)}: ${Utils.escapeHTML(att.ref)}
                                                </span>
                                            `).join('')}
                                            ${attachments.length === 0 ? '<span class="text-muted small">-</span>' : ''}
                                        </div>
                                    </td>
                                    <td class="text-end">
                                        ${Auth.isAdmin() ? `
                                        <button class="btn btn-xs btn-outline-danger" onclick="Citernes.deleteRefill('${h.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                                        ` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${filtered.length === 0 ? '<tr><td colspan="9" class="text-center py-4 text-muted">Aucun dépotage enregistré.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderAnalyticsView: function(citernes, history) {
        return `
            <div class="row g-2">
                <div class="col-md-6">
                    <div class="card h-100 p-2" style="border:1px solid var(--border);">
                        <div class="fw-bold small mb-2"><i class="fas fa-chart-pie text-primary me-1"></i> Répartition des Capacités & Stocks par Cuve</div>
                        <div style="position:relative;height:240px;width:100%;">
                            <canvas id="citerneStockChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100 p-2" style="border:1px solid var(--border);">
                        <div class="fw-bold small mb-2"><i class="fas fa-chart-column text-primary me-1"></i> Volumes Dépotés par Mois (Litres)</div>
                        <div style="position:relative;height:240px;width:100%;">
                            <canvas id="citerneRefillChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    initAnalyticsChart: function() {
        const citernes = this.getCiternesList();
        const history = this.getHistory();

        const pieCanvas = document.getElementById('citerneStockChart');
        if (pieCanvas && typeof Chart !== 'undefined') {
            const labels = citernes.map(c => (c.code ? c.code + ' - ' : '') + c.name);
            const data = citernes.map(c => Number(c.currentLevel) || 0);
            new Chart(pieCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } }
                    }
                }
            });
        }

        const barCanvas = document.getElementById('citerneRefillChart');
        if (barCanvas && typeof Chart !== 'undefined') {
            const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
            const monthLabels = [];
            const monthTotals = [0, 0, 0, 0, 0, 0];
            const now = new Date();

            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthLabels.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());

                const total = history.filter(h => {
                    const hd = new Date(h.date);
                    return hd.getMonth() === d.getMonth() && hd.getFullYear() === d.getFullYear();
                }).reduce((s, h) => s + (Number(h.qtyAdded) || 0), 0);

                monthTotals[5 - i] = total;
            }

            new Chart(barCanvas, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Volume Dépoté (Litres)',
                        data: monthTotals,
                        backgroundColor: 'rgba(37, 99, 235, 0.75)',
                        borderColor: '#2563EB',
                        borderWidth: 1,
                        borderRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    togglePayment: function(historyId) {
        const data = DB.data;
        if (!data || !data.citerneHistory) return;
        const item = data.citerneHistory.find(h => h.id === historyId);
        if (!item) return;

        item.paymentStatus = (item.paymentStatus === 'Payé') ? 'Non payé' : 'Payé';
        DB.save();
        Utils.showNotification(`Statut de règlement mis à jour : ${item.paymentStatus}`, 'success');
        this.setTab('deliveries');
    },

    deleteRefill: function(historyId) {
        if (!Auth.isAdmin()) {
            UI.showAlert("Action réservée à l'administrateur.", 'danger');
            return;
        }
        if (!confirm('Supprimer cette entrée de livraison ?')) return;

        if (DB.data && DB.data.citerneHistory) {
            DB.data.citerneHistory = DB.data.citerneHistory.filter(h => h.id !== historyId);
            DB.save();
            Utils.showNotification('Entrée de livraison supprimée.', 'info');
            this.setTab('deliveries');
        }
    },

    // Point 1: Auto-generated cuve fields! Code Cuve, Désignation, Capacité, Seuil...
    showAddCiterne: function() {
        const autoCode = this.autoGenCode();
        const autoName = this.autoGenName('Gasoil');
        const def = this.getDefaultCapacity('Gasoil');

        const html = `
            <form onsubmit="Citernes.saveCiterne(event)">
                <div class="row g-2 mb-2">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Code Cuve * <small class="text-success">(Auto-généré)</small></label>
                        <div class="input-group input-group-sm">
                            <input type="text" name="code" id="newCuveCode" class="form-control font-monospace fw-bold" required value="${autoCode}">
                            <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('newCuveCode').value = Citernes.autoGenCode()" title="Regénérer">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <label class="form-label small fw-bold">Désignation / Nom * <small class="text-success">(Auto-suggéré)</small></label>
                        <input type="text" name="name" id="newCuveName" class="form-control form-control-sm fw-bold" required value="${autoName}">
                    </div>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">Type de Fluide / Carburant *</label>
                        <select name="type" id="newCuveType" class="form-select form-select-sm" required onchange="Citernes.onAddTypeChange(this.value)">
                            <option value="Gasoil" selected>Gasoil</option>
                            <option value="Essence Sans Plomb">Essence Sans Plomb</option>
                            <option value="Essence Super">Essence Super</option>
                            <option value="Huile Moteur 15W40">Huile Moteur 15W40</option>
                            <option value="Huile Transmission">Huile Transmission</option>
                            <option value="AdBlue">AdBlue</option>
                            <option value="Eau Industrielle">Eau Industrielle</option>
                            <option value="Autre">Autre Fluide</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">Emplacement / Site *</label>
                        <input type="text" name="location" class="form-control form-control-sm" required value="Dépôt Principal">
                    </div>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Capacité Totale (Litres) *</label>
                        <input type="number" name="capacity" id="newCuveCap" class="form-control form-control-sm" required min="1" step="1" value="${def.cap}">
                        <div class="d-flex gap-1 mt-1">
                            <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="Citernes.setPresetCapacity(10000)">10K</button>
                            <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="Citernes.setPresetCapacity(20000)">20K</button>
                            <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="Citernes.setPresetCapacity(30000)">30K</button>
                            <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="Citernes.setPresetCapacity(50000)">50K</button>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Niveau Réel Initial (L)</label>
                        <input type="number" name="currentLevel" class="form-control form-control-sm" min="0" step="0.1" value="0">
                        <small class="text-muted" style="font-size:10px;">0 si cuve vide au départ</small>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold text-warning">Seuil Réserve / Alerte (L)</label>
                        <input type="number" name="minAlert" id="newCuveAlert" class="form-control form-control-sm" min="0" step="1" value="${def.alert}">
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Unité</label>
                        <input type="text" name="unit" class="form-control form-control-sm" value="Litres" required>
                    </div>
                    <div class="col-md-8">
                        <label class="form-label small fw-bold">Observations / Notes</label>
                        <input type="text" name="notes" class="form-control form-control-sm" placeholder="Spécifications cuve...">
                    </div>
                </div>

                <div class="d-flex justify-content-between pt-2 border-top">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-check-circle me-1"></i> Enregistrer dans la Base</button>
                </div>
            </form>
        `;
        UI.showModal('Nouvelle Cuve / Réservoir de Carburant', html, null, 'modal-md');
    },

    saveCiterne: function(e, id = null) {
        e.preventDefault();
        const form = e.target;
        const citerne = {
            code: form.code ? form.code.value.trim().toUpperCase() : '',
            name: form.name.value.trim(),
            type: form.type.value,
            location: form.location ? form.location.value.trim() : 'Dépôt Principal',
            capacity: Number(form.capacity.value),
            currentLevel: Number(form.currentLevel.value) || 0,
            minAlert: Number(form.minAlert ? form.minAlert.value : 0) || Math.round(Number(form.capacity.value) * 0.20),
            unit: form.unit.value.trim() || 'Litres',
            notes: form.notes ? form.notes.value.trim() : ''
        };

        if (id) {
            citerne.id = id;
            DB.updateCiterne(citerne);
            DB.addAuditLog({
                action: 'MODIF_CITERNE',
                col: 'citernes',
                itemId: id,
                details: `Mise à jour réservoir ${citerne.code} - ${citerne.name} (Capacité: ${citerne.capacity} L)`,
                user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Admin'
            });
            UI.showAlert(`✅ Réservoir ${citerne.name} mis à jour avec succès.`, 'success');
        } else {
            citerne.id = 'ct_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
            DB.addCiterne(citerne);
            DB.addAuditLog({
                action: 'CREATION_CITERNE',
                col: 'citernes',
                itemId: citerne.id,
                details: `Ajout nouveau réservoir ${citerne.code} - ${citerne.name} (${citerne.type}, ${citerne.capacity} L)`,
                user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Admin'
            });
            UI.showAlert(`✅ Réservoir ${citerne.name} ajouté à la base de données.`, 'success');
        }

        UI.hideModal();
        UI.refresh();
    },

    showEditCiterne: function(id) {
        const cit = this.getCiternesList().find(x => x.id === id);
        if (!cit) return;

        const html = `
            <form onsubmit="Citernes.saveCiterne(event, '${id}')">
                <div class="row g-2 mb-2">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Code Cuve *</label>
                        <input type="text" name="code" class="form-control form-control-sm font-monospace" required value="${Utils.escapeHTML(cit.code)}">
                    </div>
                    <div class="col-md-8">
                        <label class="form-label small fw-bold">Désignation / Nom *</label>
                        <input type="text" name="name" class="form-control form-control-sm" required value="${Utils.escapeHTML(cit.name)}">
                    </div>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">Type de Fluide *</label>
                        <select name="type" class="form-select form-select-sm" required>
                            <option value="Gasoil" ${cit.type === 'Gasoil' ? 'selected' : ''}>Gasoil</option>
                            <option value="Essence Sans Plomb" ${cit.type === 'Essence Sans Plomb' ? 'selected' : ''}>Essence Sans Plomb</option>
                            <option value="Essence Super" ${cit.type === 'Essence Super' ? 'selected' : ''}>Essence Super</option>
                            <option value="Huile Moteur 15W40" ${cit.type === 'Huile Moteur 15W40' ? 'selected' : ''}>Huile Moteur 15W40</option>
                            <option value="Huile Transmission" ${cit.type === 'Huile Transmission' ? 'selected' : ''}>Huile Transmission</option>
                            <option value="AdBlue" ${cit.type === 'AdBlue' ? 'selected' : ''}>AdBlue</option>
                            <option value="Eau Industrielle" ${cit.type === 'Eau Industrielle' ? 'selected' : ''}>Eau Industrielle</option>
                            <option value="Eau" ${cit.type === 'Eau' ? 'selected' : ''}>Eau</option>
                            <option value="Autre" ${cit.type === 'Autre' ? 'selected' : ''}>Autre Fluide</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">Emplacement / Site *</label>
                        <input type="text" name="location" class="form-control form-control-sm" required value="${Utils.escapeHTML(cit.location)}">
                    </div>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Capacité Totale (Litres) *</label>
                        <input type="number" name="capacity" class="form-control form-control-sm" required min="1" step="1" value="${cit.capacity}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Niveau Actuel Réel (Litres) *</label>
                        <input type="number" name="currentLevel" class="form-control form-control-sm" required min="0" step="0.1" value="${cit.currentLevel}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold text-warning">Seuil Réserve (Litres)</label>
                        <input type="number" name="minAlert" class="form-control form-control-sm" min="0" step="1" value="${cit.minAlert}">
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Unité</label>
                        <input type="text" name="unit" class="form-control form-control-sm" required value="${Utils.escapeHTML(cit.unit)}">
                    </div>
                    <div class="col-md-8">
                        <label class="form-label small fw-bold">Notes</label>
                        <input type="text" name="notes" class="form-control form-control-sm" value="${Utils.escapeHTML(cit.notes || '')}">
                    </div>
                </div>

                <div class="d-flex justify-content-between pt-2 border-top">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-save me-1"></i> Mettre à Jour</button>
                </div>
            </form>
        `;
        UI.showModal(`Modifier la Cuve — ${Utils.escapeHTML(cit.name)}`, html, null, 'modal-md');
    },

    deleteCiterne: function(id) {
        if (!Auth.isAdmin()) {
            UI.showAlert("Action réservée à l'administrateur.", 'danger');
            return;
        }
        const cit = this.getCiternesList().find(x => x.id === id);
        const name = cit ? cit.name : 'cette cuve';
        if (confirm(`Supprimer la cuve "${name}" de la base de données ?`)) {
            DB.deleteCiterne(id);
            DB.addAuditLog({
                action: 'SUPPRESSION_CITERNE',
                col: 'citernes',
                itemId: id,
                details: `Suppression réservoir ${name}`,
                user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Admin'
            });
            UI.refresh();
            UI.showAlert('Cuve supprimée avec succès.', 'info');
        }
    },

    showRefill: function(id = '') {
        const citernes = this.getCiternesList();
        if (citernes.length === 0) {
            UI.showAlert("Veuillez d'abord ajouter au moins une cuve dans la base de données.", 'warning');
            return;
        }

        const selectedCiterne = id ? citernes.find(x => x.id === id) : citernes[0];
        const defaultDate = new Date().toISOString().split('T')[0];

        const html = `
            <form id="citerneRefillForm" onsubmit="Citernes.submitRefill(event)">
                <div class="card p-2 mb-2" style="background:var(--surface-alt);border:1px solid var(--border);">
                    <div class="row g-2">
                        <div class="col-md-7">
                            <label class="form-label small fw-bold">Cuve réceptrice *</label>
                            <select name="citerneId" id="refillCiterneSelect" class="form-select form-select-sm" required onchange="Citernes.onRefillCiterneChange(this.value)">
                                ${citernes.map(c => `
                                    <option value="${c.id}" ${selectedCiterne && c.id === selectedCiterne.id ? 'selected' : ''} data-level="${c.currentLevel}" data-cap="${c.capacity}" data-unit="${Utils.escapeHTML(c.unit)}" data-name="${Utils.escapeHTML(c.name)}">
                                        ${Utils.escapeHTML(c.code)} - ${Utils.escapeHTML(c.name)} (${c.type})
                                    </option>
                                `).join('')}
                            </select>
                            <div id="citerneInfoBadge" class="mt-1 small text-muted">
                                Stock enregistré: <strong id="citerneInfoLevel">${selectedCiterne ? selectedCiterne.currentLevel : 0}</strong> L / Cap: <strong id="citerneInfoCap">${selectedCiterne ? selectedCiterne.capacity : 0}</strong> L
                                <button type="button" class="btn btn-link btn-xs p-0 ms-2 text-decoration-none" onclick="Citernes.applyTheoreticalLevel()">[Copier dans le jaugeage]</button>
                            </div>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label small fw-bold">Date Réception *</label>
                            <input type="date" name="date" class="form-control form-control-sm" value="${defaultDate}" required>
                        </div>
                    </div>
                </div>

                <div class="row g-2 mb-2">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">1. Jaugeage réel avant dépotage (L) *</label>
                        <input type="number" name="levelBefore" id="refillLevelBefore" class="form-control form-control-sm" required min="0" step="0.1" value="${selectedCiterne ? selectedCiterne.currentLevel : 0}" oninput="Citernes.calcConsommation()">
                        <small id="consommationText" class="d-block mt-1 small text-muted">Relevé physique au réglet.</small>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-success">2. Quantité Livrée (L) *</label>
                        <input type="number" name="qtyAdded" id="refillQtyAdded" class="form-control form-control-sm border-success fw-bold" required min="0.01" step="0.01" placeholder="Ex: 10000" oninput="Citernes.calcNewLevel()">
                        <small id="newLevelPreview" class="d-block mt-1 small text-success fw-bold"></small>
                    </div>
                </div>

                <div class="card p-2 mb-2" style="background:var(--surface-alt);border:1px solid var(--border);">
                    <div class="row g-2">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Fournisseur</label>
                            <input type="text" name="supplier" id="refillSupplier" class="form-control form-control-sm" value="NAFTAL">
                            <div class="d-flex gap-1 mt-1">
                                <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="document.getElementById('refillSupplier').value='NAFTAL'">+ NAFTAL</button>
                                <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="document.getElementById('refillSupplier').value='PETROSER'">+ PETROSER</button>
                                <button type="button" class="btn btn-xs btn-outline-secondary py-0" style="font-size:9px;" onclick="document.getElementById('refillSupplier').value='SONATRACH'">+ SONATRACH</button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Chauffeur & Matricule</label>
                            <input type="text" name="driver" class="form-control form-control-sm" placeholder="Chauffeur / Matricule citerne">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Règlement *</label>
                            <select name="paymentStatus" class="form-select form-select-sm" required>
                                <option value="Non payé">Non payé (À terme)</option>
                                <option value="Payé">Payé (Réglé)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Montant Total (DA)</label>
                            <input type="number" name="amount" class="form-control form-control-sm" min="0" step="0.01" placeholder="Ex: 290000.00">
                        </div>
                    </div>
                </div>

                <div class="card p-2 mb-2" style="border:1px dashed var(--border);">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="form-label small fw-bold mb-0">
                            <i class="fas fa-paperclip text-secondary me-1"></i> Pièces Justificatives (Bons Naftal, BL...)
                        </label>
                        <button type="button" class="btn btn-xs btn-outline-primary" onclick="Citernes.addAttachmentRow()">
                            <i class="fas fa-plus me-1"></i> Ajouter document
                        </button>
                    </div>
                    <div id="attachmentsContainer" class="d-flex flex-column gap-1">
                        <div class="attachment-row d-flex gap-2 align-items-center">
                            <select class="form-select form-select-sm att-type" style="width:140px;">
                                <option value="BL Naftal">BL Naftal</option>
                                <option value="FV / BL">FV / BL</option>
                                <option value="Bon de Caisse">Bon de Caisse</option>
                                <option value="Facture">Facture</option>
                                <option value="Autre">Autre</option>
                            </select>
                            <input type="text" class="form-control form-control-sm att-ref flex-grow-1" placeholder="N° / Référence exacte...">
                            <button type="button" class="btn btn-xs text-danger" onclick="this.closest('.attachment-row').remove()"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>

                <div class="mb-2">
                    <label class="form-label small fw-bold">Remarques</label>
                    <input type="text" name="notes" class="form-control form-control-sm" placeholder="Remarques libres, état des scellés...">
                </div>

                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success btn-sm"><i class="fas fa-check-circle me-1"></i> Valider Dépotage</button>
                </div>
            </form>
        `;
        UI.showModal('Réception & Dépotage de Carburant', html, null, 'modal-md');
    },

    onRefillCiterneChange: function(citerneId) {
        const select = document.getElementById('refillCiterneSelect');
        if (!select || select.selectedIndex < 0) return;
        const opt = select.options[select.selectedIndex];
        const level = opt.getAttribute('data-level');
        const cap = opt.getAttribute('data-cap');

        const badge = document.getElementById('citerneInfoBadge');
        const levelEl = document.getElementById('citerneInfoLevel');
        const capEl = document.getElementById('citerneInfoCap');

        if (badge && level !== null && cap !== null) {
            badge.style.display = 'block';
            if (levelEl) levelEl.innerText = Utils.formatNumber(level);
            if (capEl) capEl.innerText = Utils.formatNumber(cap);
        }
        this.calcConsommation();
        this.calcNewLevel();
    },

    applyTheoreticalLevel: function() {
        const select = document.getElementById('refillCiterneSelect');
        if (!select || select.selectedIndex < 0) return;
        const opt = select.options[select.selectedIndex];
        const level = opt.getAttribute('data-level');
        const input = document.getElementById('refillLevelBefore');
        if (input && level !== null) {
            input.value = level;
            this.calcConsommation();
            this.calcNewLevel();
        }
    },

    calcConsommation: function() {
        const select = document.getElementById('refillCiterneSelect');
        if (!select || select.selectedIndex < 0) return;
        const opt = select.options[select.selectedIndex];
        const theoretical = Number(opt.getAttribute('data-level') || 0);
        const input = document.getElementById('refillLevelBefore');
        const el = document.getElementById('consommationText');
        if (!input || input.value === '') {
            if (el) {
                el.innerText = 'Relevé physique au réglet.';
                el.className = 'd-block mt-1 small text-muted';
            }
            return;
        }
        const realLevel = Number(input.value);
        const diff = theoretical - realLevel;
        if (el) {
            if (diff > 0) {
                el.innerText = `📉 Conso constatée: -${Utils.formatNumber(diff)} L`;
                el.className = 'd-block mt-1 small text-danger fw-bold';
            } else if (diff < 0) {
                el.innerText = `📈 Excédent: +${Utils.formatNumber(Math.abs(diff))} L`;
                el.className = 'd-block mt-1 small text-warning fw-bold';
            } else {
                el.innerText = '✅ Niveau conforme au stock système';
                el.className = 'd-block mt-1 small text-success fw-bold';
            }
        }
        this.calcNewLevel();
    },

    calcNewLevel: function() {
        const select = document.getElementById('refillCiterneSelect');
        if (!select || select.selectedIndex < 0) return;
        const opt = select.options[select.selectedIndex];
        const cap = Number(opt.getAttribute('data-cap') || 0);
        const levelBefore = Number(document.getElementById('refillLevelBefore')?.value || 0);
        const qtyAdded = Number(document.getElementById('refillQtyAdded')?.value || 0);
        const newLevel = levelBefore + qtyAdded;
        const preview = document.getElementById('newLevelPreview');

        if (!preview) return;
        if (qtyAdded > 0) {
            const pct = cap > 0 ? Math.round((newLevel / cap) * 100) : 0;
            if (cap > 0 && newLevel > cap) {
                preview.innerHTML = `⚠️ Dépassement: ${Utils.formatNumber(newLevel)} L / ${Utils.formatNumber(cap)} L (+${Utils.formatNumber(newLevel - cap)} L!)`;
                preview.className = 'd-block mt-1 small text-danger fw-bold';
            } else {
                preview.innerHTML = `Nouveau niveau: ${Utils.formatNumber(newLevel)} L (${pct}%)`;
                preview.className = 'd-block mt-1 small text-success fw-bold';
            }
        } else {
            preview.innerHTML = '';
        }
    },

    addAttachmentRow: function(type = 'BL Naftal', ref = '') {
        const container = document.getElementById('attachmentsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'attachment-row d-flex gap-2 align-items-center';
        div.innerHTML = `
            <select class="form-select form-select-sm att-type" style="width:140px;">
                <option value="BL Naftal" ${type === 'BL Naftal' ? 'selected' : ''}>BL Naftal</option>
                <option value="FV / BL" ${type === 'FV / BL' ? 'selected' : ''}>FV / BL</option>
                <option value="Bon de Caisse" ${type === 'Bon de Caisse' ? 'selected' : ''}>Bon de Caisse</option>
                <option value="Facture" ${type === 'Facture' ? 'selected' : ''}>Facture</option>
                <option value="Autre" ${type === 'Autre' ? 'selected' : ''}>Autre</option>
            </select>
            <input type="text" class="form-control form-control-sm att-ref flex-grow-1" placeholder="Numéro / Référence..." value="${Utils.escapeHTML(ref)}">
            <button type="button" class="btn btn-xs text-danger" onclick="this.closest('.attachment-row').remove()"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    },

    submitRefill: function(e) {
        e.preventDefault();
        const form = e.target;
        const citerneId = form.citerneId.value;
        const citernes = this.getCiternesList();
        const c = citernes.find(x => x.id === citerneId);
        if (!c) {
            UI.showAlert('Veuillez sélectionner une cuve valide.', 'warning');
            return;
        }

        const levelBefore = Number(form.levelBefore.value);
        const qtyAdded = Number(form.qtyAdded.value);
        const consumption = c.currentLevel - levelBefore;
        const newLevel = levelBefore + qtyAdded;

        if (c.capacity > 0 && newLevel > c.capacity) {
            if (!confirm(`Attention: Le nouveau niveau (${Utils.formatNumber(newLevel)} L) dépasse la capacité de la cuve (${Utils.formatNumber(c.capacity)} L). Continuer ?`)) {
                return;
            }
        }

        const attachments = [];
        const rows = form.querySelectorAll('.attachment-row');
        rows.forEach(r => {
            const type = r.querySelector('.att-type')?.value;
            const ref = r.querySelector('.att-ref')?.value?.trim();
            if (ref) attachments.push({ type, ref });
        });

        const historyId = Utils.generateId();
        const refillRecord = {
            id: historyId,
            citerneId: citerneId,
            citerneCode: c.code,
            citerneName: c.name,
            date: form.date.value ? new Date(form.date.value).toISOString() : new Date().toISOString(),
            levelBefore: levelBefore,
            qtyAdded: qtyAdded,
            levelAfter: newLevel,
            consumption: consumption,
            driver: form.driver.value.trim(),
            supplier: form.supplier.value.trim() || 'NAFTAL',
            paymentStatus: form.paymentStatus.value,
            amount: Number(form.amount.value) || 0,
            attachments: attachments,
            notes: form.notes.value.trim(),
            user: (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser().name : 'Magasinier'
        };

        if (!DB.data.citerneHistory) DB.data.citerneHistory = [];
        DB.data.citerneHistory.unshift(refillRecord);

        const realTank = DB.getCiternes().find(x => x.id === citerneId);
        if (realTank) {
            realTank.currentLevel = newLevel;
            realTank.lastRefillDate = refillRecord.date;
            realTank.lastRefillQty = qtyAdded;
            DB.updateCiterne(realTank);
        }

        DB.addAuditLog({
            action: 'RECEPTION_CARBURANT',
            col: 'citernes',
            itemId: citerneId,
            details: `Réception de ${Utils.formatNumber(qtyAdded)} L dans ${c.code} - ${c.name} (${refillRecord.supplier})`,
            user: refillRecord.user
        });

        UI.hideModal();
        UI.refresh();
        UI.showAlert(`✅ Réception de ${Utils.formatNumber(qtyAdded)} L enregistrée.`, 'success');
    },

    showHistory: function(id) {
        const c = this.getCiternesList().find(x => x.id === id);
        if (!c) return;

        const history = this.getHistory().filter(h => h.citerneId === id);

        const html = `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 rounded" style="background:var(--surface-alt);border:1px solid var(--border);">
                <div>
                    <h6 class="mb-0 fw-bold">${Utils.escapeHTML(c.code)} — ${Utils.escapeHTML(c.name)}</h6>
                    <small class="text-muted">${c.type} • Capacité: ${Utils.formatNumber(c.capacity)} L • Stock actuel: <strong>${Utils.formatNumber(c.currentLevel)} L</strong></small>
                </div>
                <button class="btn btn-xs btn-primary" onclick="Citernes.showRefill('${c.id}')">
                    <i class="fas fa-fill-drip me-1"></i> Nouveau Dépotage
                </button>
            </div>

            <div class="table-responsive">
                <table class="table table-sm table-striped align-middle table-compact" style="font-size:12px;">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Avant</th>
                            <th>Conso</th>
                            <th>Volume Reçu</th>
                            <th>Après</th>
                            <th>Fournisseur</th>
                            <th>Documents</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(h => {
                            const atts = Array.isArray(h.attachments) ? h.attachments : [];
                            return `
                            <tr>
                                <td><strong>${new Date(h.date).toLocaleDateString('fr-FR')}</strong></td>
                                <td>${Utils.formatNumber(h.levelBefore)} L</td>
                                <td>${h.consumption > 0 ? `<span class="badge bg-danger-subtle text-danger">-${Utils.formatNumber(h.consumption)} L</span>` : '<span class="text-muted">0 L</span>'}</td>
                                <td><strong class="text-success">+${Utils.formatNumber(h.qtyAdded)} L</strong></td>
                                <td><strong>${Utils.formatNumber(h.levelAfter)} L</strong></td>
                                <td>${Utils.escapeHTML(h.supplier || 'NAFTAL')}</td>
                                <td>
                                    ${atts.map(a => `<span class="badge bg-light text-dark border me-1" style="font-size:9px;">${Utils.escapeHTML(a.type)}: ${Utils.escapeHTML(a.ref)}</span>`).join('')}
                                    ${atts.length === 0 ? '<span class="text-muted">-</span>' : ''}
                                </td>
                            </tr>`;
                        }).join('')}
                        ${history.length === 0 ? '<tr><td colspan="7" class="text-center py-3 text-muted">Aucun historique de livraison.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        UI.showModal(`Historique des Jaugeages — ${Utils.escapeHTML(c.name)}`, html, null, 'modal-md');
    },

    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non disponible.', 'danger');
            return;
        }
        const citernes = this.getCiternesList();
        const history = this.getHistory();

        const tanksData = citernes.map(c => ({
            'Code Cuve': c.code,
            'Nom / Désignation': c.name,
            'Type Carburant': c.type,
            'Emplacement': c.location,
            'Capacité (L)': c.capacity,
            'Stock Actuel (L)': c.currentLevel,
            'Seuil Alerte (L)': c.minAlert,
            'Taux Remplissage (%)': c.capacity > 0 ? Math.round((c.currentLevel / c.capacity) * 100) : 0,
            'Unité': c.unit || 'Litres'
        }));

        const historyData = history.map(h => {
            const c = citernes.find(x => x.id === h.citerneId);
            return {
                'Date Dépotage': h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '',
                'Cuve': c ? `${c.code} - ${c.name}` : (h.citerneId || ''),
                'N° Bon Livraison (BL)': h.blNumber || h.ref || '',
                'Fournisseur': h.supplier || 'NAFTAL',
                'Niveau Avant (L)': h.levelBefore || 0,
                'Volume Livré / Ajouté (L)': h.qtyAdded || 0,
                'Niveau Après (L)': h.levelAfter || 0,
                'Prix Unitaire (DA/L)': h.unitPrice || 0,
                'Montant Total (DA)': h.amount || 0,
                'Statut Paiement': h.paymentStatus || 'Payé',
                'Opérateur / Réceptionnaire': h.author || ''
            };
        });

        const wb = XLSX.utils.book_new();
        const wsTanks = XLSX.utils.json_to_sheet(tanksData);
        const wsHist = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(wb, wsTanks, "Cuves_Carburant");
        XLSX.utils.book_append_sheet(wb, wsHist, "Historique_Depotages");
        XLSX.writeFile(wb, `Citernes_Carburant_${new Date().toISOString().slice(0, 10)}.xlsx`);
        UI.showAlert('Export Excel des citernes et dépotages généré avec succès !', 'success');
    }
};

window.PreOrders = {
    render: function() {
        const user = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : DB.getCurrentUser();
        let allPreorders = DB.getPreOrders ? DB.getPreOrders() : [];

        // FCFS: pending orders oldest-first (queue), completed orders newest-first
        const pendingOrders = allPreorders.filter(p => p.status === 'En attente').sort((a,b) => new Date(a.date) - new Date(b.date));
        const otherOrders = allPreorders.filter(p => p.status !== 'En attente').sort((a,b) => new Date(b.date) - new Date(a.date));
        // Assign FCFS queue position to pending orders
        pendingOrders.forEach((p, idx) => { p._queuePos = idx + 1; });

        let preorders = [...pendingOrders, ...otherOrders];
        if (typeof Auth !== 'undefined' && Auth.isNormal() && user) {
            preorders = preorders.filter(p => p.userId === user.id || p.userName === user.name || p.requester === user.name || p.beneficiary === user.name);
        }
        const articles = DB.getArticles();
        
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);font-size:18px;margin-bottom:2px;"><i class="fas fa-clipboard-list text-primary me-2"></i> Demandes de Matériel</h2>
                    <p class="text-muted" style="margin:0;font-size:12px;">Gestion et préparation des demandes de dotation et pièces de rechange.</p>
                </div>
                <div class="d-flex gap-2">
                    ${(Auth.isAdmin() || Auth.isMag()) ? `<button class="btn btn-outline-success btn-sm" onclick="PreOrders.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>` : ''}
                    <button class="btn btn-primary btn-sm" onclick="Cart.showModal()"><i class="fas fa-plus-circle me-1"></i> Nouvelle Demande</button>
                </div>
            </div>
            
            <div class="card p-0" style="border:1px solid var(--border);">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" style="font-size:12.5px;">
                        <thead class="table-light">
                            <tr>
                                <th title="Position dans la file d'attente FCFS">#</th>
                                <th>Réf. Demande</th>
                                <th>Date Demande</th>
                                <th>Demandeur</th>
                                <th>Articles Demandés</th>
                                <th>Statut</th>
                                <th class="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(Auth.isAdmin() || Auth.isMag()) && pendingOrders && pendingOrders.length > 0 ? `<tr class="table-info"><td colspan="7"><i class="fas fa-list-ol me-1"></i><strong>File d'attente FCFS</strong> — Les demandes "En attente" sont servies dans l'ordre d'arrivée. <strong>${pendingOrders.length}</strong> demande(s) en attente.</td></tr>` : ''}
                            ${preorders.map(p => {
                                const items = Array.isArray(p.items) ? p.items : (p.articleId ? [{ designation: p.articleId, requestedQty: p.quantity }] : []);
                                let badge = 'secondary';
                                if(p.status === 'Approuvée' || p.status === 'Servie') badge = 'success';
                                else if(p.status === 'En attente') badge = 'warning text-dark';
                                else if(p.status === 'Rejetée') badge = 'danger';
                                else if(p.status === 'Partiellement servie') badge = 'warning text-dark';
                                
                                return `
                                <tr${p.status === 'En attente' && p._queuePos === 1 ? ' class="table-warning"' : ''}>
                                    <td>${p._queuePos ? `<span class="badge bg-primary rounded-pill" title="Position dans la file FCFS">#${p._queuePos}</span>` : '<span class="text-muted">—</span>'}</td>
                                    <td><strong class="font-monospace text-primary">${Utils.escapeHTML(p.ref)}</strong></td>
                                    <td>${new Date(p.date).toLocaleDateString('fr-FR')} <small class="text-muted">${new Date(p.date).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</small></td>
                                    <td><strong>${Utils.escapeHTML(p.userName || p.beneficiary || p.requester || 'Utilisateur')}</strong></td>
                                    <td><strong>${items.length}</strong> article(s) (${items.map(i => Utils.escapeHTML(i.designation)).slice(0, 2).join(', ')}${items.length > 2 ? '...' : ''})</td>
                                    <td><span class="badge bg-${badge}">${p.status}</span></td>
                                    <td class="text-end">
                                        <div class="d-inline-flex gap-1 align-items-center">
                                            <button class="btn btn-xs btn-outline-info" onclick="Cart.showOrderSchemaModal('${p.id}')" title="Afficher le Schéma CAD Véhicule"><i class="fas fa-microchip"></i></button>
                                            <button class="btn btn-xs btn-outline-secondary" onclick="Cart.showRequestPass('${p.id}')" title="Afficher le Pass QR"><i class="fas fa-qrcode"></i></button>
                                            ${p.status === 'En attente' && (Auth.isAdmin() || Auth.isMag()) ? `
                                            <button class="btn btn-xs btn-outline-success" onclick="PreOrders.updateStatus('${p.id}', 'Approuvée')" title="Approuver"><i class="fas fa-check"></i></button>
                                            <button class="btn btn-xs btn-outline-danger" onclick="PreOrders.updateStatus('${p.id}', 'Rejetée')" title="Rejeter"><i class="fas fa-times"></i></button>
                                            ` : ''}
                                            ${(p.status === 'En attente' || p.status === 'Approuvée') && (Auth.isAdmin() || Auth.isMag()) ? `
                                            <button class="btn btn-xs btn-primary" onclick="PreOrders.deliver('${p.id}')"><i class="fas fa-file-signature me-1"></i> Servir / Décharge</button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${preorders.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">Aucune demande de dotation enregistrée.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return html;
    },

    updateStatus: function(id, status) {
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];
        const p = preorders.find(x => x.id === id);
        if(p) {
            p.status = status;
            DB.save();
            UI.refresh();
            Utils.showNotification(`Statut mis à jour : ${status}`, 'success');
        }
    },

    deliver: function(id) {
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];
        const p = preorders.find(x => x.id === id);
        if(!p) return;
        
        Decharges.showCreate();
        setTimeout(() => {
            const benInput = document.getElementById('dechargeBeneficiary');
            if(benInput && (p.userName || p.beneficiary || p.requester)) benInput.value = p.userName || p.beneficiary || p.requester;
        }, 100);
    }
};

window.HistoryModule = {
    currentTab: 'trucks', // 'trucks', 'persons', 'orders', 'audit'
    selectedTruckId: '',
    selectedPerson: '',
    auditSearch: '',

    setTab: function(tab) {
        this.currentTab = tab;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.render();
    },

    render: function(initialTab) {
        if (initialTab) this.currentTab = initialTab;
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : { name: 'Utilisateur', role: 'normal' };
        if (!this.selectedPerson && currentUser) {
            this.selectedPerson = currentUser.name;
        }

        // Normal user is strictly locked to 'orders' tab
        if (typeof Auth !== 'undefined' && Auth.isNormal()) {
            this.currentTab = 'orders';
        }

        const fleet = DB.getFleet ? DB.getFleet() : [];
        const decharges = DB.getDecharges ? DB.getDecharges() : [];
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];
        const auditLog = (DB.data && DB.data.auditLog) ? DB.data.auditLog : [];

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;">
                        <i class="fas fa-clock-rotate-left text-primary me-2"></i> ${(typeof Auth !== 'undefined' && Auth.isNormal()) ? 'Mes Demandes de Matériel' : 'Historique & Traçabilité'}
                    </h2>
                    <p class="text-muted mb-0" style="font-size:13px;">
                        ${(typeof Auth !== 'undefined' && Auth.isNormal()) ? 'Suivi en direct de l\'avancement de vos demandes d\'articles' : 'Consommation par véhicule, dotations du personnel, historique des demandes de dotation et journal d\'audit'}
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success btn-sm" onclick="HistoryModule.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-primary btn-sm" onclick="Cart.showModal()"><i class="fas fa-clipboard-list me-1"></i> Demande de Stock</button>
                </div>
            </div>

            <!-- Tabs Navigation -->
            ${(!Auth || !Auth.isNormal()) ? `
            <div class="d-flex gap-2 mb-3 border-bottom pb-2 flex-wrap">
                <button class="btn btn-sm ${this.currentTab === 'trucks' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistoryModule.setTab('trucks')">
                    <i class="fas fa-truck-moving me-1"></i> Flotte & Matériels (${fleet.length})
                </button>
                <button class="btn btn-sm ${this.currentTab === 'persons' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistoryModule.setTab('persons')">
                    <i class="fas fa-user-clock me-1"></i> Personnel & Bénéficiaires
                </button>
                <button class="btn btn-sm ${this.currentTab === 'orders' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistoryModule.setTab('orders')">
                    <i class="fas fa-clipboard-list me-1"></i> Demandes de Matériel (${preorders.length})
                </button>
                ${(Auth && Auth.isAdmin()) ? `
                <button class="btn btn-sm ${this.currentTab === 'audit' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistoryModule.setTab('audit')">
                    <i class="fas fa-shield-alt me-1"></i> Journal d'Audit Système (${auditLog.length})
                </button>
                ` : ''}
            </div>
            ` : ''}
        `;

        if (this.currentTab === 'trucks') {
            html += this.renderTrucksHistory(fleet, decharges);
        } else if (this.currentTab === 'persons') {
            html += this.renderPersonsHistory(decharges, currentUser);
        } else if (this.currentTab === 'orders') {
            html += this.renderOrdersHistory(preorders);
        } else if (this.currentTab === 'audit') {
            html += this.renderAuditHistory(auditLog);
        }

        return html;
    },

    renderTrucksHistory: function(fleet, decharges) {
        const selectedMat = fleet.find(f => f.id === this.selectedTruckId);
        const filteredDecharges = this.selectedTruckId
            ? decharges.filter(d => d.materialId === this.selectedTruckId)
            : decharges.filter(d => d.materialId || d.immatriculation);

        const totalSorties = filteredDecharges.length;
        const totalItemsDelivered = filteredDecharges.reduce((sum, d) => sum + (d.items ? d.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : 0), 0);

        return `
            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="form-label small fw-bold"><i class="fas fa-filter text-primary me-1"></i> Sélectionner un véhicule / camion</label>
                    <select class="form-select form-select-sm" onchange="HistoryModule.selectedTruckId = this.value; HistoryModule.setTab('trucks');">
                        <option value="">-- Tous les matériels (${fleet.length} véhicules) --</option>
                        ${fleet.map(m => `<option value="${m.id}" ${this.selectedTruckId === m.id ? 'selected' : ''}>[ ${Utils.escapeHTML(m.immatriculation)} ] ${Utils.escapeHTML(m.name)} (${Utils.escapeHTML(m.family || 'Camion')})</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <div class="card p-2 bg-light text-center h-100 justify-content-center">
                        <div class="small text-muted fw-bold">Total Bons de Décharge</div>
                        <div class="fs-5 fw-bold text-primary">${totalSorties}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-2 bg-light text-center h-100 justify-content-center">
                        <div class="small text-muted fw-bold">Pièces / Consommables</div>
                        <div class="fs-5 fw-bold text-success">${totalItemsDelivered}</div>
                    </div>
                </div>
            </div>

            ${selectedMat ? `
            <div class="card mb-3 p-3" style="background:var(--surface-alt,#f8fafc);border-left:4px solid #2563EB;">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h5 class="mb-0 fw-bold"><span class="badge bg-dark me-2 font-monospace">${Utils.escapeHTML(selectedMat.immatriculation)}</span> ${Utils.escapeHTML(selectedMat.name)}</h5>
                        <small class="text-muted">Famille: ${Utils.escapeHTML(selectedMat.family || 'Camion')} | Marque: ${Utils.escapeHTML(selectedMat.brand || '-')} | Service: ${Utils.escapeHTML(selectedMat.department || 'Exploitation')}</small>
                    </div>
                    <span class="badge bg-${selectedMat.status === 'Actif' ? 'success' : selectedMat.status === 'En panne' ? 'danger' : 'warning'} px-3 py-2">
                        ${selectedMat.status || 'Actif'}
                    </span>
                </div>
            </div>
            ` : ''}

            <div class="card">
                <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-list text-primary me-2"></i> Historique des sorties et pièces détachées affectées</span>
                    <span class="badge bg-secondary">${filteredDecharges.length} bons</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Réf Décharge</th>
                                    <th>Bénéficiaire (Chauffeur / Mécanicien)</th>
                                    <th>Véhicule</th>
                                    <th>Pièces Sorties (Articles & Qtés)</th>
                                    <th>Motif</th>
                                    <th>Statut</th>
                                    <th width="100">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredDecharges.map(d => {
                                    const lines = d.lines || (d.items || []).map(i => ({ designation: i.articleId, quantity: i.quantity }));
                                    return `
                                    <tr>
                                        <td><strong>${Utils.formatDate(d.date, d.ref)}</strong></td>
                                        <td><span class="badge bg-light text-dark border font-monospace">${Utils.escapeHTML(d.ref)}</span></td>
                                        <td><strong>${Utils.escapeHTML(d.beneficiary)}</strong><div class="small text-muted">${Utils.escapeHTML(d.service || '-')}</div></td>
                                        <td>
                                            ${d.immatriculation ? `<span class="badge bg-dark font-monospace">${Utils.escapeHTML(d.immatriculation)}</span> ${Utils.escapeHTML(d.materialName || '')}` : '-'}
                                        </td>
                                        <td>
                                            <ul class="list-unstyled mb-0 small">
                                                ${lines.map(l => `
                                                    <li><i class="fas fa-caret-right text-primary me-1"></i><strong>${l.quantity}x</strong> ${Utils.escapeHTML(l.designation)}</li>
                                                `).join('')}
                                            </ul>
                                        </td>
                                        <td><small class="text-muted">${Utils.escapeHTML(d.reason || '-')}</small></td>
                                        <td><span class="badge bg-${d.status==='Approuvée'?'success':d.status==='Rejetée'?'danger':'warning'}">${d.status}</span></td>
                                        <td>
                                            <button class="btn btn-xs btn-outline-info" onclick="Decharges.showDetail('${d.id}')" title="Voir Décharge"><i class="fas fa-eye"></i></button>
                                            <button class="btn btn-xs btn-outline-secondary" onclick="Decharges.exportPDF('${d.id}')" title="Télécharger PDF"><i class="fas fa-file-pdf"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                                ${filteredDecharges.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">Aucune sortie de pièce enregistrée pour ce matériel.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderPersonsHistory: function(decharges, currentUser) {
        const allBens = [...new Set([
            currentUser.name,
            ...(DB.getUsers().map(u => u.name)),
            ...(DB.data && DB.data.beneficiaryNames ? DB.data.beneficiaryNames : []),
            ...(decharges.map(d => d.beneficiary))
        ])].filter(Boolean).sort();

        const selected = this.selectedPerson || currentUser.name;
        const userDecharges = decharges.filter(d => (d.beneficiary && d.beneficiary.toLowerCase() === selected.toLowerCase()) || (d.createdBy && d.createdBy.toLowerCase() === selected.toLowerCase()));
        const totalItems = userDecharges.reduce((sum, d) => sum + (d.items ? d.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : 0), 0);

        return `
            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="form-label small fw-bold"><i class="fas fa-user-check text-primary me-1"></i> Sélectionner le collaborateur / bénéficiaire</label>
                    <select class="form-select form-select-sm" onchange="HistoryModule.selectedPerson = this.value; HistoryModule.setTab('persons');">
                        ${allBens.map(b => `<option value="${Utils.escapeHTML(b)}" ${b.toLowerCase() === selected.toLowerCase() ? 'selected' : ''}>${Utils.escapeHTML(b)} ${b === currentUser.name ? '(Moi-même)' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <div class="card p-2 bg-light text-center h-100 justify-content-center">
                        <div class="small text-muted fw-bold">Décharges / Comptoir</div>
                        <div class="fs-5 fw-bold text-primary">${userDecharges.length}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-2 bg-light text-center h-100 justify-content-center">
                        <div class="small text-muted fw-bold">Total Articles Récupérés</div>
                        <div class="fs-5 fw-bold text-success">${totalItems}</div>
                    </div>
                </div>
            </div>

            <div class="card mb-3 p-3" style="background:var(--surface-alt,#f8fafc);border-left:4px solid #10B981;">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h5 class="mb-0 fw-bold"><i class="fas fa-id-badge text-success me-2"></i> ${Utils.escapeHTML(selected)}</h5>
                        <small class="text-muted">Dotations directes au comptoir magasin et demandes validées en décharge</small>
                    </div>
                    ${userDecharges.some(d => d.hasShortage) ? `
                    <span class="badge bg-warning text-dark"><i class="fas fa-exclamation-triangle me-1"></i> Ruptures constatées lors de livraisons passées</span>
                    ` : ''}
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-white fw-bold">
                    <i class="fas fa-history text-primary me-2"></i> Toutes les dotations & décharges reçues par ${Utils.escapeHTML(selected)}
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Réf Décharge</th>
                                    <th>Service / Département</th>
                                    <th>Véhicule Concerné</th>
                                    <th>Articles & Quantités Servies</th>
                                    <th>Délivré Par</th>
                                    <th>Statut</th>
                                    <th width="100">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userDecharges.map(d => {
                                    const lines = d.lines || (d.items || []).map(i => ({ designation: i.articleId, quantity: i.quantity, servedQty: i.quantity }));
                                    return `
                                    <tr>
                                        <td><strong>${Utils.formatDate(d.date, d.ref)}</strong></td>
                                        <td><span class="badge bg-light text-dark border font-monospace">${Utils.escapeHTML(d.ref)}</span></td>
                                        <td>${Utils.escapeHTML(d.service || '-')}</td>
                                        <td>${d.immatriculation ? `<span class="badge bg-dark font-monospace">${Utils.escapeHTML(d.immatriculation)}</span> ${Utils.escapeHTML(d.materialName || '')}` : '<span class="text-muted">Matériel général</span>'}</td>
                                        <td>
                                            <ul class="list-unstyled mb-0 small">
                                                ${lines.map(l => `
                                                    <li>
                                                        <strong>${l.servedQty !== undefined ? l.servedQty : l.quantity}x</strong> ${Utils.escapeHTML(l.designation)}
                                                        ${l.missingQty > 0 ? `<span class="badge bg-danger ms-1">Manque: ${l.missingQty}</span>` : ''}
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        </td>
                                        <td><small class="text-muted">${Utils.escapeHTML(d.servedBy || d.fromName || 'Magasinier')}</small></td>
                                        <td><span class="badge bg-${d.status==='Approuvée'?'success':d.status==='Rejetée'?'danger':'warning'}">${d.status}</span></td>
                                        <td>
                                            <button class="btn btn-xs btn-outline-info" onclick="Decharges.showDetail('${d.id}')" title="Détails"><i class="fas fa-eye"></i></button>
                                            <button class="btn btn-xs btn-outline-secondary" onclick="Decharges.exportPDF('${d.id}')" title="PDF"><i class="fas fa-file-pdf"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                                ${userDecharges.length === 0 ? '<tr><td colspan="8" class="text-center py-4 text-muted">Aucune décharge enregistrée pour cette personne.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderOrdersHistory: function(preorders) {
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : null;
        if (typeof Auth !== 'undefined' && Auth.isNormal() && currentUser) {
            preorders = preorders.filter(p => p.userId === currentUser.id || p.userName === currentUser.name || p.beneficiary === currentUser.name || p.requester === currentUser.name);
        }
        return `
            <div class="card">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold"><i class="fas fa-clipboard-list text-primary me-2"></i> Historique des Demandes de Matériel</h5>
                    <button class="btn btn-sm btn-warning" onclick="Cart.showModal()"><i class="fas fa-plus-circle me-1"></i> Nouvelle Demande</button>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th width="40"></th>
                                    <th>Réf. Demande</th>
                                    <th>Date</th>
                                    <th>Demandeur</th>
                                    <th>Département</th>
                                    <th>Matériel</th>
                                    <th>Articles Demandés</th>
                                    <th>Statut Global</th>
                                    <th width="160">Actions & Pass QR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${preorders.map((p, idx) => {
                                    const items = Array.isArray(p.items) ? p.items : (p.articleId ? [{ designation: p.articleId, requestedQty: p.quantity, servedQty: (p.status === 'Livrée' ? p.quantity : 0), status: p.status }] : []);
                                    const hasShortage = items.some(i => i.status === 'Partiel' || i.status === 'Non servi / Rupture' || (i.requestedQty > i.servedQty && p.status === 'Partiellement servie'));
                                    
                                    return `
                                    <tr style="cursor:pointer;" onclick="HistoryModule.toggleOrderDetail(${idx})">
                                        <td class="text-center"><i class="fas fa-chevron-right text-muted" id="orderArrow_${idx}"></i></td>
                                        <td><strong class="font-monospace text-primary">${Utils.escapeHTML(p.ref)}</strong></td>
                                        <td>${new Date(p.date).toLocaleDateString('fr-FR')} <small class="text-muted">${new Date(p.date).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</small></td>
                                        <td><strong>${Utils.escapeHTML(p.userName || p.beneficiary || p.requester || 'Utilisateur')}</strong></td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(p.department || '-')}</span></td>
                                        <td>${p.immatriculation ? `<span class="badge bg-dark font-monospace">${Utils.escapeHTML(p.immatriculation)}</span>` : '<span class="text-muted">-</span>'}</td>
                                        <td><strong>${items.length}</strong> article(s)</td>
                                        <td>
                                            <span class="badge bg-${p.status === 'Servie' || p.status === 'Approuvée' ? 'success' : p.status === 'Partiellement servie' ? 'warning text-dark' : p.status === 'Rejetée' ? 'danger' : 'secondary'}">
                                                ${p.status}
                                            </span>
                                            ${hasShortage ? `<span class="badge bg-danger ms-1" title="Rupture partielle constatée au comptoir">⚠️ Rupture</span>` : ''}
                                        </td>
                                        <td>
                                            <div class="d-flex gap-1 flex-wrap" onclick="event.stopPropagation();">
                                                <button class="btn btn-xs btn-primary fw-bold" onclick="Cart.showRequestPass('${p.id}')" title="Afficher le Pass QR & Bon de Retrait">
                                                    <i class="fas fa-qrcode me-1"></i> Pass QR
                                                </button>
                                                <button class="btn btn-xs btn-outline-info fw-bold" onclick="Cart.showOrderSchemaModal('${p.id}')" title="Afficher le Schéma CAD Véhicule">
                                                    <i class="fas fa-microchip me-1"></i> Schéma CAD
                                                </button>
                                                ${p.workPlanId ? `
                                                <button class="btn btn-xs btn-outline-success fw-bold" onclick="PlanTravailModule.viewPlanDetail('${p.workPlanId}')" title="Consulter Bon de Travail (${p.workPlanRef})">
                                                    <i class="fas fa-screwdriver-wrench me-1"></i> ${p.workPlanRef}
                                                </button>
                                                ` : ''}
                                                ${p.dechargeId ? `
                                                <button class="btn btn-xs btn-outline-secondary" onclick="Decharges.showDetail('${p.dechargeId}')" title="Consulter la Décharge">
                                                    <i class="fas fa-file-signature"></i>
                                                </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr id="orderDetailRow_${idx}" style="display:none;background:#f8fafc;">
                                        <td colspan="9" class="p-3">
                                            <div class="card p-3 shadow-sm border">
                                                <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                                    <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-boxes text-secondary me-2"></i> Détail des ${items.length} articles demandés :</h6>
                                                    <div class="d-flex align-items-center gap-2">
                                                        <small class="text-muted">Motif : ${Utils.escapeHTML(p.reason || 'Demande stock standard')}</small>
                                                        <button class="btn btn-xs btn-outline-primary fw-bold ms-2" onclick="Cart.showRequestPass('${p.id}')"><i class="fas fa-qrcode me-1"></i> Pass & Bon de Retrait</button>
                                                    </div>
                                                </div>
                                                <table class="table table-sm table-bordered bg-white mb-0">
                                                    <thead class="table-light">
                                                        <tr>
                                                            <th>Article / Désignation</th>
                                                            <th>Réf / Code</th>
                                                            <th class="text-center" width="120">Qté Demandée</th>
                                                            <th class="text-center" width="120">Qté Servie</th>
                                                            <th class="text-center" width="140">Statut Comptoir</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${items.map(it => `
                                                        <tr>
                                                            <td><strong>${Utils.escapeHTML(it.designation || it.articleId)}</strong></td>
                                                            <td class="font-monospace small text-muted">${Utils.escapeHTML(it.code || '-')}</td>
                                                            <td class="text-center fw-bold">${it.requestedQty || it.quantity} ${it.unit || ''}</td>
                                                            <td class="text-center fw-bold ${it.servedQty < it.requestedQty ? 'text-danger' : 'text-success'}">
                                                                ${it.servedQty !== undefined ? it.servedQty : (p.status === 'Servie' ? it.requestedQty : 0)} ${it.unit || ''}
                                                            </td>
                                                            <td class="text-center">
                                                                ${it.servedQty >= it.requestedQty ? '<span class="badge bg-success">Délivré</span>' : it.servedQty > 0 ? `<span class="badge bg-warning text-dark">Partiel (-${it.requestedQty - it.servedQty})</span>` : p.status === 'En attente' ? '<span class="badge bg-secondary">En attente</span>' : '<span class="badge bg-danger">Non servi / Rupture</span>'}
                                                            </td>
                                                        </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                                ${preorders.length === 0 ? '<tr><td colspan="9" class="text-center py-4 text-muted">Aucune demande de dotation enregistrée.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    toggleOrderDetail: function(idx) {
        const row = document.getElementById('orderDetailRow_' + idx);
        const arrow = document.getElementById('orderArrow_' + idx);
        if (!row) return;
        const isHidden = row.style.display === 'none';
        row.style.display = isHidden ? 'table-row' : 'none';
        if (arrow) {
            arrow.className = isHidden ? 'fas fa-chevron-down text-primary' : 'fas fa-chevron-right text-muted';
        }
    },

    renderAuditHistory: function(auditLog) {
        const sorted = [...auditLog].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        const filtered = this.auditSearch
            ? sorted.filter(a => JSON.stringify(a).toLowerCase().includes(this.auditSearch.toLowerCase()))
            : sorted;

        return `
            <div class="card mb-3">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-md-6">
                            <input type="text" class="form-control form-control-sm" placeholder="Rechercher dans l'audit (utilisateur, article, action, motif...)" value="${Utils.escapeHTML(this.auditSearch)}" oninput="HistoryModule.auditSearch = this.value; HistoryModule.setTab('audit');">
                        </div>
                        <div class="col-md-6 text-end">
                            <span class="badge bg-dark-subtle text-dark border p-2"><i class="fas fa-fingerprint me-1"></i> Intégrité cryptographique SHA / Traçabilité immuable</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-shield-alt text-primary me-2"></i> Journal des Événements & Rectifications Administrateur</span>
                    <span class="badge bg-secondary">${filtered.length} entrées</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-striped align-middle mb-0 font-monospace" style="font-size:12px;">
                            <thead class="table-light font-sans-serif" style="font-family:'Inter', sans-serif;">
                                <tr>
                                    <th>Horodatage</th>
                                    <th>Utilisateur</th>
                                    <th>Action</th>
                                    <th>Cible / Entité</th>
                                    <th>Détails & Justification Obligatoire</th>
                                    <th>Hash Audit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(entry => {
                                    let badgeColor = 'secondary';
                                    if (entry.action.includes('AJUSTEMENT') || entry.action.includes('RUPTURE')) badgeColor = 'warning text-dark';
                                    if (entry.action.includes('SUPPRESSION')) badgeColor = 'danger';
                                    if (entry.action.includes('APPROBATION')) badgeColor = 'success';
                                    if (entry.action.includes('UPDATE')) badgeColor = 'info';

                                    return `
                                    <tr>
                                        <td>${new Date(entry.timestamp || Date.now()).toLocaleString('fr-FR')}</td>
                                        <td><strong class="text-primary font-sans-serif">${Utils.escapeHTML(entry.user || 'Système')}</strong></td>
                                        <td><span class="badge bg-${badgeColor}">${Utils.escapeHTML(entry.action)}</span></td>
                                        <td><strong>${Utils.escapeHTML(entry.target || entry.col || '-')}</strong></td>
                                        <td class="font-sans-serif" style="max-width:380px;">${Utils.escapeHTML(entry.details || '-')}</td>
                                        <td><code class="small text-muted">${(entry.hash || '').substring(0, 10)}...</code></td>
                                    </tr>`;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">Aucune entrée d\'audit trouvée.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    exportExcel: function() {
        const preorders = DB.getPreOrders ? DB.getPreOrders().sort((a,b) => new Date(b.date) - new Date(a.date)) : [];
        const articles = DB.getArticles();
        const data = preorders.map(p => {
            const items = Array.isArray(p.items) ? p.items : (p.articleId ? [{ articleId: p.articleId, requestedQty: p.quantity }] : []);
            const itemList = items.map(i => {
                const art = articles.find(a => a.id === i.articleId);
                return `${art ? art.designation : i.articleId || i.designation || ''} (x${i.requestedQty || i.quantity || 1})`;
            }).join('; ');
            return {
                'Référence': p.ref || '',
                'Date Demande': p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '',
                'Demandeur': p.userName || p.beneficiary || p.requester || '',
                'Département': p.department || p.service || '',
                'Articles': itemList,
                'Statut': p.status || '',
                'Notes': p.notes || ''
            };
        });
        Utils.downloadXLSX('Demandes_' + new Date().toISOString().split('T')[0], [
            { name: 'Demandes', data }
        ]);
        Utils.showNotification('Export Excel des demandes généré.', 'success');
    }
};

window.KPIDashboard = {
    render: function() {
        let html = `
            <h2>Tableau de Bord Analytique (KPI)</h2>
            <div class="row mb-4">
                <div class="col-md-4 mb-3">
                    <div class="card bg-primary text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Valeur Totale du Stock</h5>
                            <h3 id="kpiTotalValue">...</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="card bg-success text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Consommation Mensuelle</h5>
                            <h3 id="kpiMonthlyCons">...</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="card bg-info text-white h-100">
                        <div class="card-body">
                            <h5 class="card-title">Top Consommateur (Personne)</h5>
                            <h4 id="kpiTopPerson">...</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5>Évolution du Stock</h5>
                            <div class="dashboard-chart-box">
                                <canvas id="chartStockEvol"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5>Top 10 Articles Consommés</h5>
                            <div class="dashboard-chart-box">
                                <canvas id="chartTopArticles"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5>Consommation par Matériel</h5>
                            <div class="dashboard-chart-box">
                                <canvas id="chartConsByMaterial"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5>Mouvements Mensuels</h5>
                            <div class="dashboard-chart-box">
                                <canvas id="chartMonthlyMvts"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return html;
    },
    afterRender: function() {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js not loaded.");
            return;
        }
        const articles = DB.getArticles();
        const decharges = DB.getDecharges().filter(d => d.status === 'Approuvée');
        const movements = DB.getMovements();
        const fleet = DB.getFleet();
        
        // Value computation (mocked as qty * 1 for simplicity if no price is stored)
        let totalVal = articles.reduce((acc, a) => acc + (a.quantity * (a.price || 100)), 0);
        document.getElementById('kpiTotalValue').innerText = totalVal.toLocaleString() + ' DZD';
        
        const thisMonth = new Date().getMonth();
        let monthCons = decharges.filter(d => new Date(d.date).getMonth() === thisMonth).reduce((acc, d) => acc + d.items.reduce((s, i) => s + i.quantity, 0), 0);
        document.getElementById('kpiMonthlyCons').innerText = monthCons + ' articles';
        
        const personCons = {};
        decharges.forEach(d => {
            personCons[d.beneficiary] = (personCons[d.beneficiary] || 0) + d.items.reduce((s, i) => s + i.quantity, 0);
        });
        const topPerson = Object.keys(personCons).sort((a,b) => personCons[b] - personCons[a])[0];
        document.getElementById('kpiTopPerson').innerText = topPerson ? topPerson : 'N/A';

        // Charts
        const canvasStock = document.getElementById('chartStockEvol');
        if (canvasStock) {
            new Chart(canvasStock.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                    datasets: [{
                        label: 'Valeur Stock (DA)',
                        data: [12000, 19000, 15000, 22000, 18000, totalVal],
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#2563EB',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 12, font: { family: "'Inter', sans-serif", size: 11, weight: '500' } }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Top 10 articles
        const artCons = {};
        decharges.forEach(d => d.items.forEach(i => {
            artCons[i.articleId] = (artCons[i.articleId] || 0) + i.quantity;
        }));
        const top10 = Object.keys(artCons).sort((a,b) => artCons[b] - artCons[a]).slice(0, 10);
        
        const canvasTop = document.getElementById('chartTopArticles');
        if (canvasTop) {
            new Chart(canvasTop.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: top10.map(id => {
                        const a = articles.find(x => x.id === id);
                        return a ? a.designation.substring(0,18) : id;
                    }),
                    datasets: [{
                        label: 'Quantité consommée',
                        data: top10.map(id => artCons[id]),
                        backgroundColor: 'rgba(59, 130, 246, 0.75)',
                        borderColor: '#2563EB',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 12, font: { family: "'Inter', sans-serif", size: 11 } }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        const matCons = {};
        decharges.forEach(d => {
            if(d.materialId) matCons[d.materialId] = (matCons[d.materialId] || 0) + d.items.reduce((s, i) => s + i.quantity, 0);
        });
        const canvasMat = document.getElementById('chartConsByMaterial');
        if (canvasMat) {
            new Chart(canvasMat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(matCons).map(id => {
                        const m = fleet.find(x => x.id === id);
                        return m ? (m.immatriculation ? `[${m.immatriculation}] ${m.name}` : m.name) : id;
                    }),
                    datasets: [{
                        data: Object.values(matCons),
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 10, font: { family: "'Inter', sans-serif", size: 11 } }
                        }
                    }
                }
            });
        }

        const canvasMvts = document.getElementById('chartMonthlyMvts');
        if (canvasMvts) {
            new Chart(canvasMvts.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Mois -2', 'Mois -1', 'Ce Mois'],
                    datasets: [
                        { label: 'Entrées Stock', data: [15, 20, 10], backgroundColor: 'rgba(16, 185, 129, 0.75)', borderColor: '#10B981', borderWidth: 1, borderRadius: 4 },
                        { label: 'Sorties Stock', data: [10, 18, 12], backgroundColor: 'rgba(239, 68, 68, 0.75)', borderColor: '#EF4444', borderWidth: 1, borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 12, font: { family: "'Inter', sans-serif", size: 11, weight: '500' } }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non disponible.', 'danger');
            return;
        }
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const decharges = DB.getDecharges ? DB.getDecharges() : [];
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];
        const auditLog = (DB.data && DB.data.auditLog) ? DB.data.auditLog : [];
        const articles = DB.getArticles ? DB.getArticles() : [];

        // Sheet 1: Consommation Véhicules
        const fleetData = [];
        decharges.filter(d => d.materialId || d.immatriculation).forEach(d => {
            const mat = fleet.find(f => f.id === d.materialId);
            (d.items || []).forEach(it => {
                const art = articles.find(a => a.id === it.articleId);
                fleetData.push({
                    'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
                    'Immatriculation': d.immatriculation || (mat ? mat.immatriculation : ''),
                    'Nom Véhicule': d.materialName || (mat ? mat.name : ''),
                    'Famille': d.materialFamily || (mat ? mat.family : ''),
                    'Réf Décharge': d.ref,
                    'Bénéficiaire': d.beneficiary,
                    'Article': art ? (art.name || art.designation) : it.articleId,
                    'Quantité': it.quantity || 0,
                    'Statut': d.status
                });
            });
        });

        // Sheet 2: Dotations Personnel
        const personData = [];
        decharges.forEach(d => {
            (d.items || []).forEach(it => {
                const art = articles.find(a => a.id === it.articleId);
                personData.push({
                    'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
                    'Bénéficiaire': d.beneficiary,
                    'Département': d.service,
                    'Réf Décharge': d.ref,
                    'Article': art ? (art.name || art.designation) : it.articleId,
                    'Quantité': it.quantity || 0,
                    'Véhicule Lié': d.immatriculation || '-',
                    'Statut': d.status
                });
            });
        });

        // Sheet 3: Demandes d'articles
        const ordersData = preorders.map(p => ({
            'Réf Demande': p.ref,
            'Date': p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '',
            'Demandeur': p.requester || p.beneficiary || p.userName || '',
            'Département': p.department || '',
            'Statut': p.status,
            'Nb Articles': (p.items || []).length,
            'Motif / Notes': p.notes || p.reason || ''
        }));

        const wb = XLSX.utils.book_new();
        if (fleetData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fleetData), "Consommation_Flotte");
        if (personData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(personData), "Dotations_Personnel");
        if (ordersData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), "Demandes_Materiel");

        if (Auth.isAdmin() && auditLog.length > 0) {
            const auditData = auditLog.map(a => ({
                'Date & Heure': a.date || a.timestamp || '',
                'Action': a.action || '',
                'Utilisateur': a.user || '',
                'Détails': a.details || ''
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditData), "Journal_Audit");
        }

        XLSX.writeFile(wb, `Tracabilite_Historique_${new Date().toISOString().slice(0, 10)}.xlsx`);
        UI.showAlert('Export Excel de l\'historique et traçabilité généré avec succès !', 'success');
    }
};

window.Reports = {
    render: function() {
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const decharges = (typeof DB !== 'undefined' && DB.getDecharges) ? DB.getDecharges() : [];
        const fleet = (typeof DB !== 'undefined' && DB.getFleet) ? DB.getFleet() : [];
        const totalValue = articles.reduce((s, a) => s + ((a.quantity || a.stock_actuel || 0) * (a.pmp || a.unitPrice || 0)), 0);
        const alertCount = articles.filter(a => (a.quantity || a.stock_actuel || 0) <= (a.stockMin || a.seuil_min || 0)).length;

        return `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;font-size:1.15rem;">
                        <i class="fas fa-chart-bar text-primary me-2"></i>Rapports & Statistiques
                    </h2>
                    <p class="text-muted" style="margin:0;font-size:12px;">Synthèses, analyses et exports de données pour la direction</p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-success" onclick="window.print()"><i class="fas fa-print me-1"></i> Imprimer</button>
                </div>
            </div>

            <!-- KPI Cards Row -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm" style="border-top:3px solid #2563eb !important;">
                        <div class="card-body p-3 d-flex align-items-center gap-3">
                            <div style="width:44px;height:44px;border-radius:10px;background:rgba(37,99,235,0.1);color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                                <i class="fas fa-boxes-stacked"></i>
                            </div>
                            <div>
                                <div style="font-size:1.3rem;font-weight:800;color:var(--text);">${articles.length}</div>
                                <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Références Stock</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm" style="border-top:3px solid #10b981 !important;">
                        <div class="card-body p-3 d-flex align-items-center gap-3">
                            <div style="width:44px;height:44px;border-radius:10px;background:rgba(16,185,129,0.1);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div>
                                <div style="font-size:1.1rem;font-weight:800;color:var(--text);">${totalValue.toLocaleString('fr-FR')} <span style="font-size:11px;color:var(--text-muted);">DA</span></div>
                                <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Valorisation</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm" style="border-top:3px solid ${alertCount > 0 ? '#ef4444' : '#10b981'} !important;">
                        <div class="card-body p-3 d-flex align-items-center gap-3">
                            <div style="width:44px;height:44px;border-radius:10px;background:${alertCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'};color:${alertCount > 0 ? '#ef4444' : '#10b981'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                                <i class="fas ${alertCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                            </div>
                            <div>
                                <div style="font-size:1.3rem;font-weight:800;color:${alertCount > 0 ? '#ef4444' : '#10b981'};">${alertCount}</div>
                                <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Alertes Stock</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm" style="border-top:3px solid #8b5cf6 !important;">
                        <div class="card-body p-3 d-flex align-items-center gap-3">
                            <div style="width:44px;height:44px;border-radius:10px;background:rgba(139,92,246,0.1);color:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div>
                                <div style="font-size:1.3rem;font-weight:800;color:var(--text);">${fleet.length}</div>
                                <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Véhicules Flotte</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Report Generator -->
            <div class="card mb-4 shadow-sm border-0">
                <div class="card-header bg-transparent border-bottom py-3">
                    <h6 class="mb-0 fw-bold"><i class="fas fa-sliders text-primary me-2"></i>Générer un Rapport</h6>
                </div>
                <div class="card-body">
                    <form class="row align-items-end g-3" onsubmit="Reports.generate(event)">
                        <div class="col-md-3">
                            <label class="form-label fw-semibold small">Période</label>
                            <select name="period" class="form-select">
                                <option value="this_month">Ce mois</option>
                                <option value="3_months">3 derniers mois</option>
                                <option value="6_months">6 derniers mois</option>
                                <option value="1_year">1 an</option>
                                <option value="all">Tout</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-semibold small">Type de rapport</label>
                            <select name="type" class="form-select">
                                <option value="stock_summary">Synthèse du stock</option>
                                <option value="movement_summary">Mouvements par article</option>
                                <option value="decharge_recap">Récapitulatif des décharges</option>
                                <option value="vehicle_cons">Consommation par véhicule</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button type="submit" class="btn btn-primary w-100 fw-bold"><i class="fas fa-chart-line me-1"></i> Générer Rapport</button>
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-outline-success w-100" onclick="window.print()"><i class="fas fa-file-pdf me-1"></i> Exporter</button>
                        </div>
                    </form>
                </div>
            </div>
            <div id="reportResult" class="card shadow-sm border-0">
                <div class="card-body text-center py-5" style="color:var(--text-muted);">
                    <i class="fas fa-chart-pie fa-3x mb-3" style="opacity:0.2;"></i>
                    <p class="mb-0">Sélectionnez les critères ci-dessus et cliquez sur <strong>Générer</strong> pour afficher le rapport.</p>
                </div>
            </div>
        `;
    },
    generate: function(e) {
        e.preventDefault();
        const type = e.target.type.value;
        const resultDiv = document.getElementById('reportResult');
        
        let html = '';
        if (type === 'stock_summary') {
            const articles = DB.getArticles();
            html = `<table class="table table-striped"><thead><tr><th>Code</th><th>Désignation</th><th>Catégorie</th><th>Stock</th></tr></thead><tbody>
                ${articles.map(a => `<tr><td>${a.code}</td><td>${a.designation}</td><td>${a.category}</td><td>${a.quantity}</td></tr>`).join('')}
            </tbody></table>`;
        } else if (type === 'decharge_recap') {
            const decharges = DB.getDecharges();
            html = `<table class="table table-striped"><thead><tr><th>Réf</th><th>Date</th><th>Bénéficiaire</th><th>Statut</th></tr></thead><tbody>
                ${decharges.map(d => `<tr><td>${d.ref}</td><td>${Utils.formatDate(d.date, d.ref)}</td><td>${d.beneficiary}</td><td>${d.status}</td></tr>`).join('')}
            </tbody></table>`;
        } else {
            html = `<p class="text-center my-5">Rapport de type <strong>${type}</strong> généré (Données simulées pour l'exemple).</p>`;
        }
        
        resultDiv.innerHTML = `<div class="card-body"><h5>Résultats du Rapport</h5><div class="table-responsive">${html}</div></div>`;
    }
};

window.Consumption = {
    selectedTruckId: '',
    selectedPeriod: 'all', // 'all', 'this_month', 'last_month', 'this_quarter', 'this_year', 'custom'
    customDateFrom: '',
    customDateTo: '',
    selectedCategory: '',
    searchQuery: '',
    chartCategory: null,
    chartMonthly: null,

    viewForTruck: function(truckId, period = 'all') {
        this.selectedTruckId = truckId || '';
        this.selectedPeriod = period || 'all';
        App.loadModule('consumption');
    },

    setPeriod: function(p) {
        this.selectedPeriod = p;
        this.refreshView();
    },

    onTruckChange: function(id) {
        this.selectedTruckId = id;
        this.refreshView();
    },

    onCategoryChange: function(cat) {
        this.selectedCategory = cat;
        this.refreshView();
    },

    onSearchInput: function(q) {
        this.searchQuery = (q || '').toLowerCase();
        this.filterTableRows();
    },

    onCustomDatesChange: function() {
        this.customDateFrom = document.getElementById('consoDateFrom')?.value || '';
        this.customDateTo = document.getElementById('consoDateTo')?.value || '';
        this.refreshView();
    },

    refreshView: function() {
        const content = document.getElementById('mainContent');
        if (content && App.currentModule === 'consumption') {
            content.innerHTML = this.render();
            setTimeout(() => this.afterRender(), 60);
        }
    },

    getDateRange: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        let start = null;
        let end = null;
        
        switch (this.selectedPeriod) {
            case 'this_month':
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(year, month - 1, 1);
                end = new Date(year, month, 0, 23, 59, 59, 999);
                break;
            case 'this_quarter': {
                const qStartMonth = Math.floor(month / 3) * 3;
                start = new Date(year, qStartMonth, 1);
                end = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
                break;
            }
            case 'this_year':
                start = new Date(year, 0, 1);
                end = new Date(year, 11, 31, 23, 59, 59, 999);
                break;
            case 'custom':
                if (this.customDateFrom) start = new Date(this.customDateFrom + 'T00:00:00');
                if (this.customDateTo) end = new Date(this.customDateTo + 'T23:59:59');
                break;
            case 'all':
            default:
                break;
        }
        return { start, end };
    },

    getPeriodLabel: function() {
        switch(this.selectedPeriod) {
            case 'this_month': return 'Ce mois-ci';
            case 'last_month': return 'Le mois dernier';
            case 'this_quarter': return 'Ce trimestre';
            case 'this_year': return 'Cette année (' + (new Date().getFullYear()) + ')';
            case 'custom': return `Du ${this.customDateFrom || '...'} au ${this.customDateTo || '...'}`;
            case 'all':
            default: return 'Tout l\'historique';
        }
    },

    getFilteredData: function() {
        const { start, end } = this.getDateRange();
        const allDecharges = DB.getDecharges ? DB.getDecharges() : [];
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const articles = DB.getArticles ? DB.getArticles() : [];

        const artMap = {};
        articles.forEach(a => { artMap[a.id] = a; });

        const validDecharges = allDecharges.filter(d => {
            if (d.status !== 'Approuvée') return false;
            if (this.selectedTruckId && d.materialId !== this.selectedTruckId) return false;
            if (start || end) {
                const dDate = new Date(d.date);
                if (start && dDate < start) return false;
                if (end && dDate > end) return false;
            }
            return true;
        });

        const records = [];
        validDecharges.forEach(d => {
            const mat = fleet.find(f => f.id === d.materialId);
            const matName = mat ? mat.name : (d.materialName || 'Matériel non assigné');
            const matImmat = mat ? mat.immatriculation : (d.immatriculation || '-');
            const matFamily = mat ? mat.family : (d.materialFamily || '-');

            const items = d.lines && d.lines.length ? d.lines : (d.items || []);
            items.forEach(item => {
                const art = artMap[item.articleId] || {};
                const designation = item.designation || art.designation || 'Article';
                const category = art.family || art.category || 'Général';
                const unit = item.unit || art.unit || 'U';
                const qty = Number(item.quantity || 0);
                const unitPrice = Number(art.price || 0);
                const totalAmount = qty * unitPrice;

                if (this.selectedCategory && category !== this.selectedCategory) return;

                records.push({
                    dechargeId: d.id,
                    dechargeRef: d.ref,
                    date: d.date,
                    beneficiary: d.beneficiary || '-',
                    service: d.service || '-',
                    materialId: d.materialId,
                    materialName: matName,
                    immatriculation: matImmat,
                    materialFamily: matFamily,
                    reason: d.reason || 'Maintenance / Sortie',
                    articleId: item.articleId,
                    articleCode: art.code || '-',
                    designation: designation,
                    category: category,
                    unit: unit,
                    quantity: qty,
                    unitPrice: unitPrice,
                    totalAmount: totalAmount
                });
            });
        });

        const articleAgg = {};
        records.forEach(r => {
            const key = r.articleId || r.designation;
            if (!articleAgg[key]) {
                articleAgg[key] = {
                    code: r.articleCode,
                    designation: r.designation,
                    category: r.category,
                    unit: r.unit,
                    totalQty: 0,
                    unitPrice: r.unitPrice,
                    totalAmount: 0,
                    decharges: new Set()
                };
            }
            articleAgg[key].totalQty += r.quantity;
            articleAgg[key].totalAmount += r.totalAmount;
            articleAgg[key].decharges.add(r.dechargeId);
        });

        const articleList = Object.values(articleAgg).map(a => ({
            ...a,
            dechargeCount: a.decharges.size
        })).sort((a,b) => b.totalAmount - a.totalAmount);

        const totalQty = records.reduce((s, r) => s + r.quantity, 0);
        const totalCost = records.reduce((s, r) => s + r.totalAmount, 0);
        const uniqueDechargesCount = new Set(records.map(r => r.dechargeId)).size;
        const avgPerOperation = uniqueDechargesCount > 0 ? (totalCost / uniqueDechargesCount) : 0;

        return {
            records: records.sort((a,b) => new Date(b.date) - new Date(a.date)),
            articleList: articleList,
            totalQty: totalQty,
            totalCost: totalCost,
            operationsCount: uniqueDechargesCount,
            avgPerOperation: avgPerOperation
        };
    },

    render: function() {
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const articles = DB.getArticles ? DB.getArticles() : [];
        const categories = [...new Set(articles.map(a => a.family || a.category).filter(Boolean))].sort();
        const data = this.getFilteredData();
        const selectedMat = fleet.find(f => f.id === this.selectedTruckId);

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;">
                        <i class="fas fa-chart-line text-primary me-2"></i> Suivi & Analyse de Consommation par Camion
                    </h2>
                    <p class="text-muted mb-0" style="font-size:13px;">
                        Analyse détaillée des pièces consommées, quantités et valorisation financière (DA) par camion et par période
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success btn-sm" onclick="Consumption.exportExcel()">
                        <i class="fas fa-file-excel me-1"></i> Exporter Excel
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="Consumption.printReport()">
                        <i class="fas fa-print me-1"></i> Imprimer Rapport
                    </button>
                    ${selectedMat ? `
                        <button class="btn btn-primary btn-sm" onclick="Decharges.showCreateForTruck('${selectedMat.id}')">
                            <i class="fas fa-plus me-1"></i> + Décharge pour ce camion
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- FILTERS BAR CARD -->
            <div class="card mb-4 shadow-sm border">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold mb-1 text-muted">
                                <i class="fas fa-truck text-primary me-1"></i> Camion / Matériel
                            </label>
                            <select id="consoTruckSelect" class="form-select form-select-sm" onchange="Consumption.onTruckChange(this.value)">
                                <option value="">-- Tout le Parc (Vue Globale) --</option>
                                ${fleet.map(f => `
                                    <option value="${f.id}" ${this.selectedTruckId === f.id ? 'selected' : ''}>
                                        [ ${Utils.escapeHTML(f.immatriculation)} ] ${Utils.escapeHTML(f.name)} (${f.status})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold mb-1 text-muted">
                                <i class="fas fa-calendar-alt text-primary me-1"></i> Période
                            </label>
                            <select id="consoPeriodSelect" class="form-select form-select-sm" onchange="Consumption.setPeriod(this.value)">
                                <option value="all" ${this.selectedPeriod === 'all' ? 'selected' : ''}>Tout l'historique</option>
                                <option value="this_month" ${this.selectedPeriod === 'this_month' ? 'selected' : ''}>Ce mois-ci</option>
                                <option value="last_month" ${this.selectedPeriod === 'last_month' ? 'selected' : ''}>Le mois dernier</option>
                                <option value="this_quarter" ${this.selectedPeriod === 'this_quarter' ? 'selected' : ''}>Ce trimestre</option>
                                <option value="this_year" ${this.selectedPeriod === 'this_year' ? 'selected' : ''}>Cette année (${new Date().getFullYear()})</option>
                                <option value="custom" ${this.selectedPeriod === 'custom' ? 'selected' : ''}>Période personnalisée...</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold mb-1 text-muted">
                                <i class="fas fa-tags text-primary me-1"></i> Catégorie de pièce
                            </label>
                            <select id="consoCategorySelect" class="form-select form-select-sm" onchange="Consumption.onCategoryChange(this.value)">
                                <option value="">Toutes les catégories</option>
                                ${categories.map(c => `<option value="${Utils.escapeHTML(c)}" ${this.selectedCategory === c ? 'selected' : ''}>${Utils.escapeHTML(c)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold mb-1 text-muted">Recherche</label>
                            <input type="text" id="consoSearchInput" class="form-control form-control-sm" placeholder="Réf, article..." value="${Utils.escapeHTML(this.searchQuery)}" onkeyup="Consumption.onSearchInput(this.value)">
                        </div>

                        ${this.selectedPeriod === 'custom' ? `
                            <div class="col-12 pt-2 border-top mt-2">
                                <div class="row g-2 align-items-center">
                                    <div class="col-md-3">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text">Du</span>
                                            <input type="date" id="consoDateFrom" class="form-control" value="${this.customDateFrom}" onchange="Consumption.onCustomDatesChange()">
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text">Au</span>
                                            <input type="date" id="consoDateTo" class="form-control" value="${this.customDateTo}" onchange="Consumption.onCustomDatesChange()">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- SELECTED TRUCK BANNER (IF SPECIFIC TRUCK SELECTED) -->
            ${selectedMat ? `
                <div class="card mb-4" style="background:var(--surface-alt);border:1px solid var(--border);border-left:5px solid var(--primary);">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div class="d-flex align-items-center gap-3">
                                <div style="font-size:36px;color:var(--primary);"><i class="fas fa-truck-moving"></i></div>
                                <div>
                                    <h4 class="mb-1 fw-bold" style="color:var(--text);">${Utils.escapeHTML(selectedMat.name)}</h4>
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <span class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1.5px;font-size:13px;padding:5px 10px;">
                                            <i class="fas fa-id-card me-1"></i> ${Utils.escapeHTML(selectedMat.immatriculation)}
                                        </span>
                                        <span class="badge bg-secondary">${Utils.escapeHTML(selectedMat.family)}</span>
                                        <span class="badge bg-${selectedMat.status==='Actif'?'success':selectedMat.status==='En panne'?'danger':'warning'}">${selectedMat.status}</span>
                                        ${selectedMat.notes ? `<small class="text-muted ms-2"><i class="fas fa-info-circle"></i> ${Utils.escapeHTML(selectedMat.notes)}</small>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-light text-dark border p-2 mb-1 d-block" style="font-size:12px;">
                                    Période : <strong>${this.getPeriodLabel()}</strong>
                                </span>
                                <button class="btn btn-outline-primary btn-sm" onclick="Consumption.viewForTruck('')">
                                    <i class="fas fa-layer-group me-1"></i> Voir tout le parc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- KPI SUMMARY CARDS -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="card h-100 border shadow-sm" style="border-top:3px solid var(--primary) !important;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-muted small text-uppercase fw-bold">Total Pièces / Qté</div>
                                    <div class="fs-4 fw-bold mt-1" style="color:var(--text);">${Utils.formatNumber(data.totalQty)} <small style="font-size:14px;color:var(--text-muted);">U/L</small></div>
                                </div>
                                <div class="rounded-circle p-3" style="background:rgba(37,99,235,0.12);color:var(--primary);font-size:20px;">
                                    <i class="fas fa-boxes"></i>
                                </div>
                            </div>
                            <div class="small text-muted mt-2">Volume consommé sur la période</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card h-100 border shadow-sm" style="border-top:3px solid var(--success) !important;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-muted small text-uppercase fw-bold">Coût Consommation</div>
                                    <div class="fs-4 fw-bold mt-1" style="color:var(--success);">${Utils.formatNumber(data.totalCost)} <small style="font-size:14px;">DA</small></div>
                                </div>
                                <div class="rounded-circle p-3" style="background:rgba(16,185,129,0.12);color:var(--success);font-size:20px;">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                            </div>
                            <div class="small text-muted mt-2">Valorisation financière totale</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card h-100 border shadow-sm" style="border-top:3px solid var(--warning) !important;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-muted small text-uppercase fw-bold">Bons de Décharge</div>
                                    <div class="fs-4 fw-bold mt-1" style="color:var(--text);">${data.operationsCount} <small style="font-size:14px;color:var(--text-muted);">sorties</small></div>
                                </div>
                                <div class="rounded-circle p-3" style="background:rgba(245,158,11,0.12);color:var(--warning);font-size:20px;">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                            </div>
                            <div class="small text-muted mt-2">Interventions approuvées</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card h-100 border shadow-sm" style="border-top:3px solid #8B5CF6 !important;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-muted small text-uppercase fw-bold">Moyenne / Sortie</div>
                                    <div class="fs-4 fw-bold mt-1" style="color:#8B5CF6;">${Utils.formatNumber(data.avgPerOperation)} <small style="font-size:14px;">DA</small></div>
                                </div>
                                <div class="rounded-circle p-3" style="background:#f5f3ff;color:#8B5CF6;font-size:20px;">
                                    <i class="fas fa-calculator"></i>
                                </div>
                            </div>
                            <div class="small text-muted mt-2">Dépense moyenne par intervention</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VISUAL CHARTS -->
            <div class="row g-3 mb-4">
                <div class="col-md-5">
                    <div class="card h-100 border shadow-sm">
                        <div class="card-header py-2 fw-bold d-flex justify-content-between align-items-center" style="background:var(--surface-alt);color:var(--text);">
                            <span><i class="fas fa-chart-pie text-primary me-2"></i> Répartition des Dépenses par Catégorie</span>
                        </div>
                        <div class="card-body p-3">
                            <div style="height:240px;position:relative;">
                                <canvas id="consoCategoryChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-7">
                    <div class="card h-100 border shadow-sm">
                        <div class="card-header py-2 fw-bold d-flex justify-content-between align-items-center" style="background:var(--surface-alt);color:var(--text);">
                            <span><i class="fas fa-chart-bar text-primary me-2"></i> Évolution Mensuelle (Qté & Coût DA)</span>
                        </div>
                        <div class="card-body p-3">
                            <div style="height:240px;position:relative;">
                                <canvas id="consoMonthlyChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLE 1: SYNTHÈSE PAR ARTICLE -->
            <div class="card mb-4 border shadow-sm">
                <div class="card-header py-2 d-flex justify-content-between align-items-center" style="background:var(--surface-alt);">
                    <h5 class="mb-0 fw-bold" style="font-size:15px;color:var(--text);">
                        <i class="fas fa-cubes text-primary me-2"></i> 1. Synthèse par Article Consommé (${data.articleList.length} articles)
                    </h5>
                    <span class="badge bg-light text-dark border">Trié par coût décroissant</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-striped mb-0" id="consoArticleTable">
                            <thead class="table-light">
                                <tr>
                                    <th>Code Article</th>
                                    <th>Désignation Article</th>
                                    <th>Catégorie / Famille</th>
                                    <th class="text-center">Qté Totale</th>
                                    <th class="text-center">Unité</th>
                                    <th class="text-end">Prix Unit. (DA)</th>
                                    <th class="text-end">Montant Total (DA)</th>
                                    <th class="text-center">Part (%)</th>
                                    <th class="text-center">Sorties</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.articleList.map(a => {
                                    const pct = data.totalCost > 0 ? ((a.totalAmount / data.totalCost) * 100).toFixed(1) : 0;
                                    return `
                                    <tr>
                                        <td><code>${Utils.escapeHTML(a.code)}</code></td>
                                        <td><strong>${Utils.escapeHTML(a.designation)}</strong></td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(a.category)}</span></td>
                                        <td class="text-center fw-bold fs-6" style="color:var(--primary);">${a.totalQty}</td>
                                        <td class="text-center text-muted">${Utils.escapeHTML(a.unit)}</td>
                                        <td class="text-end">${Utils.formatNumber(a.unitPrice)} DA</td>
                                        <td class="text-end fw-bold" style="color:var(--success);">${Utils.formatNumber(a.totalAmount)} DA</td>
                                        <td class="text-center">
                                            <div class="d-flex align-items-center justify-content-center gap-1">
                                                <div class="progress" style="width:45px;height:6px;">
                                                    <div class="progress-bar bg-primary" style="width:${pct}%;"></div>
                                                </div>
                                                <small class="text-muted">${pct}%</small>
                                            </div>
                                        </td>
                                        <td class="text-center">
                                            <span class="badge bg-secondary rounded-pill">${a.dechargeCount} fois</span>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                                ${data.articleList.length === 0 ? '<tr><td colspan="9" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x d-block mb-2"></i>Aucune pièce consommée pour ces filtres</td></tr>' : ''}
                            </tbody>
                            <tfoot class="table-light fw-bold">
                                <tr>
                                    <td colspan="3">TOTAL GÉNÉRAL</td>
                                    <td class="text-center fs-6 text-primary">${Utils.formatNumber(data.totalQty)}</td>
                                    <td></td>
                                    <td></td>
                                    <td class="text-end fs-6 text-success">${Utils.formatNumber(data.totalCost)} DA</td>
                                    <td class="text-center">100%</td>
                                    <td class="text-center">${data.operationsCount} sorties</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TABLE 2: JOURNAL DÉTAILLÉ DES DÉCHARGES -->
            <div class="card mb-4 border shadow-sm">
                <div class="card-header py-2 d-flex justify-content-between align-items-center" style="background:var(--surface-alt);">
                    <h5 class="mb-0 fw-bold" style="font-size:15px;color:var(--text);">
                        <i class="fas fa-list-alt text-primary me-2"></i> 2. Journal Détaillé des Sorties & Décharges (${data.records.length} lignes)
                    </h5>
                    <span class="badge bg-light text-dark border">Traçabilité complète</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" id="consoDetailTable">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>N° Décharge</th>
                                    <th>Véhicule / Immatriculation</th>
                                    <th>Bénéficiaire & Service</th>
                                    <th>Article</th>
                                    <th class="text-center">Qté</th>
                                    <th class="text-end">Montant (DA)</th>
                                    <th>Motif / Intervention</th>
                                    <th class="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.records.map(r => `
                                    <tr class="conso-row">
                                        <td>${new Date(r.date).toLocaleDateString('fr-FR')}</td>
                                        <td>
                                            <a href="javascript:void(0)" onclick="Decharges.showDetail('${r.dechargeId}')" class="fw-bold text-primary">
                                                <i class="fas fa-file-alt me-1"></i> ${Utils.escapeHTML(r.dechargeRef)}
                                            </a>
                                        </td>
                                        <td>
                                            <strong>${Utils.escapeHTML(r.materialName)}</strong>
                                            ${r.immatriculation && r.immatriculation !== '-' ? `
                                                <div class="badge" style="background:#1e293b;color:#38bdf8;font-family:monospace;letter-spacing:1px;font-size:11px;">
                                                    ${Utils.escapeHTML(r.immatriculation)}
                                                </div>
                                            ` : ''}
                                        </td>
                                        <td>
                                            <strong>${Utils.escapeHTML(r.beneficiary)}</strong>
                                            <div class="text-muted small">${Utils.escapeHTML(r.service)}</div>
                                        </td>
                                        <td>
                                            <div><strong>${Utils.escapeHTML(r.designation)}</strong></div>
                                            <small class="text-muted"><code>${Utils.escapeHTML(r.articleCode)}</code> • ${Utils.escapeHTML(r.category)}</small>
                                        </td>
                                        <td class="text-center"><strong>${r.quantity}</strong> ${Utils.escapeHTML(r.unit)}</td>
                                        <td class="text-end fw-bold">${Utils.formatNumber(r.totalAmount)} DA</td>
                                        <td><small>${Utils.escapeHTML(r.reason)}</small></td>
                                        <td class="text-end">
                                            <button class="btn btn-xs btn-outline-info" onclick="Decharges.showDetail('${r.dechargeId}')" title="Voir Bon de Décharge">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-xs btn-outline-secondary" onclick="Decharges.exportPDF('${r.dechargeId}')" title="PDF">
                                                <i class="fas fa-file-pdf"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${data.records.length === 0 ? '<tr><td colspan="9" class="text-center py-4 text-muted"><i class="fas fa-folder-open fa-2x d-block mb-2"></i>Aucun enregistrement de décharge pour cette sélection</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        return html;
    },

    filterTableRows: function() {
        const q = this.searchQuery;
        const rows = document.querySelectorAll('.conso-row');
        rows.forEach(r => {
            const txt = r.innerText.toLowerCase();
            r.style.display = (!q || txt.includes(q)) ? '' : 'none';
        });
    },

    afterRender: function() {
        if (typeof Chart === 'undefined') return;
        const data = this.getFilteredData();
        
        // 1. Category Doughnut Chart
        const catMap = {};
        data.records.forEach(r => {
            catMap[r.category] = (catMap[r.category] || 0) + r.totalAmount;
        });
        const catLabels = Object.keys(catMap);
        const catValues = Object.values(catMap);

        const ctxCat = document.getElementById('consoCategoryChart');
        if (ctxCat && catLabels.length > 0) {
            if (this.chartCategory) {
                try { this.chartCategory.destroy(); } catch(e){}
            }
            this.chartCategory = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{
                        data: catValues,
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B', '#F97316']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ' ' + context.label + ': ' + Utils.formatNumber(context.raw) + ' DA';
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. Monthly Trend Bar Chart
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const monthlyCost = Array(12).fill(0);
        const monthlyQty = Array(12).fill(0);
        data.records.forEach(r => {
            const m = new Date(r.date).getMonth();
            monthlyCost[m] += r.totalAmount;
            monthlyQty[m] += r.quantity;
        });

        const ctxMonthly = document.getElementById('consoMonthlyChart');
        if (ctxMonthly) {
            if (this.chartMonthly) {
                try { this.chartMonthly.destroy(); } catch(e){}
            }
            this.chartMonthly = new Chart(ctxMonthly, {
                type: 'bar',
                data: {
                    labels: monthNames,
                    datasets: [
                        {
                            label: 'Coût (DA)',
                            data: monthlyCost,
                            backgroundColor: '#2563EB',
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Qté Pièces',
                            data: monthlyQty,
                            backgroundColor: '#10B981',
                            borderRadius: 4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            ticks: { callback: v => (v >= 1000 ? (v/1000)+'k DA' : v+' DA') }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { callback: v => v + ' U' }
                        }
                    },
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }
                    }
                }
            });
        }
    },

    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Librairie XLSX introuvable', 'danger');
            return;
        }
        const data = this.getFilteredData();
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const selectedMat = fleet.find(f => f.id === this.selectedTruckId);
        const truckTitle = selectedMat ? `${selectedMat.name} (${selectedMat.immatriculation})` : 'Tout le Parc';

        const syntheseRows = [
            ['RAPPORT DE CONSOMMATION MATÉRIEL - SPA DOUROUB ELDJAZAIR'],
            ['Véhicule / Camion :', truckTitle],
            ['Période :', this.getPeriodLabel()],
            ['Date d\'extraction :', new Date().toLocaleString('fr-FR')],
            ['Total Pièces :', data.totalQty],
            ['Coût Total (DA) :', data.totalCost],
            [],
            ['Code Article', 'Désignation', 'Catégorie', 'Unité', 'Quantité Totale', 'Prix Unitaire Moyen (DA)', 'Montant Total (DA)', 'Nb Interventions']
        ];
        data.articleList.forEach(a => {
            syntheseRows.push([
                a.code, a.designation, a.category, a.unit, a.totalQty, a.unitPrice, a.totalAmount, a.dechargeCount
            ]);
        });

        const detailRows = [
            ['Date', 'N° Décharge', 'Véhicule', 'Immatriculation', 'Bénéficiaire', 'Service', 'Code Article', 'Désignation', 'Catégorie', 'Qté', 'PU (DA)', 'Total (DA)', 'Motif']
        ];
        data.records.forEach(r => {
            detailRows.push([
                new Date(r.date).toLocaleDateString('fr-FR'),
                r.dechargeRef,
                r.materialName,
                r.immatriculation,
                r.beneficiary,
                r.service,
                r.articleCode,
                r.designation,
                r.category,
                r.quantity,
                r.unitPrice,
                r.totalAmount,
                r.reason
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.aoa_to_sheet(syntheseRows);
        const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Synthèse Articles');
        XLSX.utils.book_append_sheet(wb, ws2, 'Journal Décharges');

        const fileName = selectedMat 
            ? `Consommation_${selectedMat.immatriculation.replace(/[^a-zA-Z0-9]/g, '_')}_${this.selectedPeriod}.xlsx`
            : `Consommation_Parc_Global_${this.selectedPeriod}.xlsx`;

        XLSX.writeFile(wb, fileName);
        Utils.showNotification('Rapport Excel téléchargé avec succès.', 'success');
    },

    printReport: function() {
        const data = this.getFilteredData();
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const selectedMat = fleet.find(f => f.id === this.selectedTruckId);
        const truckTitle = selectedMat ? `${selectedMat.name} (${selectedMat.immatriculation})` : 'Parc Global (Tous les camions)';
        const settings = DB.getSettings ? DB.getSettings() : { companyName: 'SPA DOUROUB ELDJAZAIR' };

        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (!printWin) {
            UI.showAlert('Veuillez autoriser les fenêtres pop-up pour imprimer.', 'warning');
            return;
        }

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fiche de Consommation - ${truckTitle}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a202c; padding: 20px; }
                    .header { border-bottom: 2px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
                    .title { font-size: 18px; font-weight: bold; color: #1B2A4A; }
                    .subtitle { font-size: 13px; color: #4a5568; }
                    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; background: #edf2f7; padding: 10px; border-radius: 6px; }
                    .meta-item { font-size: 11px; }
                    .meta-item strong { display: block; font-size: 14px; color: #2b6cb0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                    th, td { border: 1px solid #cbd5e0; padding: 6px 8px; text-align: left; }
                    th { background: #edf2f7; font-weight: bold; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    tfoot td { font-weight: bold; background: #f7fafc; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">${settings.companyName || 'SPA DOUROUB ELDJAZAIR'}</div>
                        <div class="subtitle">FICHE D'ANALYSE & DE CONSOMMATION MATÉRIEL</div>
                    </div>
                    <div style="text-align:right;">
                        <div>Date d'édition : ${new Date().toLocaleDateString('fr-FR')}</div>
                        <div>Période : <strong>${this.getPeriodLabel()}</strong></div>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item">Véhicule / Camion : <strong>${truckTitle}</strong></div>
                    <div class="meta-item">Pièces consommées : <strong>${data.totalQty} U/L</strong></div>
                    <div class="meta-item">Coût Consommation : <strong>${Utils.formatNumber(data.totalCost)} DA</strong></div>
                    <div class="meta-item">Interventions : <strong>${data.operationsCount}</strong></div>
                </div>

                <h4>1. Synthèse par Article Consommé</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Désignation</th>
                            <th>Catégorie</th>
                            <th class="text-center">Qté</th>
                            <th class="text-center">Unité</th>
                            <th class="text-end">Prix Unit. (DA)</th>
                            <th class="text-end">Montant Total (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.articleList.map(a => `
                            <tr>
                                <td>${a.code}</td>
                                <td>${a.designation}</td>
                                <td>${a.category}</td>
                                <td class="text-center"><strong>${a.totalQty}</strong></td>
                                <td class="text-center">${a.unit}</td>
                                <td class="text-end">${Utils.formatNumber(a.unitPrice)}</td>
                                <td class="text-end"><strong>${Utils.formatNumber(a.totalAmount)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3">TOTAL GÉNÉRAL</td>
                            <td class="text-center">${data.totalQty}</td>
                            <td></td>
                            <td></td>
                            <td class="text-end">${Utils.formatNumber(data.totalCost)} DA</td>
                        </tr>
                    </tfoot>
                </table>

                <h4 style="margin-top:24px;">2. Détail des Sorties (Bons de Décharge)</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>N° Décharge</th>
                            <th>Bénéficiaire</th>
                            <th>Article</th>
                            <th class="text-center">Qté</th>
                            <th class="text-end">Total DA</th>
                            <th>Motif</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.records.map(r => `
                            <tr>
                                <td>${new Date(r.date).toLocaleDateString('fr-FR')}</td>
                                <td>${r.dechargeRef}</td>
                                <td>${r.beneficiary}</td>
                                <td>${r.designation}</td>
                                <td class="text-center">${r.quantity} ${r.unit}</td>
                                <td class="text-end">${Utils.formatNumber(r.totalAmount)}</td>
                                <td>${r.reason}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top:40px; display:flex; justify-content:space-between;">
                    <div>Le Responsable Parc / Matériel</div>
                    <div>Le Magasinier Principal</div>
                    <div>Direction Logistique</div>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
};

window.BarcodeScanner = {
    scanner: null,
    activeOrder: null,
    scannedItems: {},

    playBeep: function(type = 'success') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'success') {
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                osc.start();
                osc.stop(ctx.currentTime + 0.12);
            } else {
                osc.frequency.setValueAtTime(320, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc.start();
                osc.stop(ctx.currentTime + 0.25);
            }
        } catch(e) { /* ignore audio failure */ }
    },

    render: function() {
        const isAdminOrMag = (typeof Auth !== 'undefined') ? (Auth.isAdmin() || Auth.isMag()) : true;
        return `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;">
                        <i class="fas fa-barcode text-primary me-2"></i> Scanner & Détection Comptoir
                    </h2>
                    <p class="text-muted mb-0" style="font-size:13px;">
                        ${isAdminOrMag ? 'Lecture des Pass de retrait (QR code), validation des pièces délivrées et consultation rapide de stock' : 'Scannez le code-barres d\'un article pour vérifier sa disponibilité et l\'ajouter à votre demande'}
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success fw-bold" onclick="if(window.GdsScannerModule) GdsScannerModule.openModal();"><i class="fas fa-qrcode me-1"></i> Scan Sortie GDS</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="App.loadModule('stock')"><i class="fas fa-boxes-stacked me-1"></i> Catalogue Stock</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="App.loadModule('history', 'orders')"><i class="fas fa-clock-rotate-left me-1"></i> Historique Demandes</button>
                </div>
            </div>

            <!-- Hardware Barcode Gun & Manual Entry Bar -->
            <div class="card p-3 mb-3 bg-white border" style="box-shadow:var(--shadow-sm);">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="badge bg-dark"><i class="fas fa-keyboard me-1"></i> DOUCHETTE USB / LECTEUR LASER</span>
                    <small class="text-muted">Compatible avec tous les pistolets code-barres USB et lecteurs sans fil sans pilote requis</small>
                </div>
                <div class="input-group">
                    <span class="input-group-text bg-light border-end-0"><i class="fas fa-qrcode text-primary"></i></span>
                    <input type="text" id="manualBarcodeInput" class="form-control" placeholder="Flashez un QR de demande (DEM-...) ou un code article (PR-...) et appuyez sur Entrée..." autofocus onkeydown="if(event.key==='Enter'){ BarcodeScanner.onScanSuccess(this.value); this.value=''; }">
                    <button class="btn btn-primary px-3 fw-bold" onclick="const el=document.getElementById('manualBarcodeInput'); BarcodeScanner.onScanSuccess(el.value); el.value='';">
                        <i class="fas fa-search me-1"></i> Traiter
                    </button>
                </div>
            </div>

            <div class="row g-3">
                <!-- Left: Camera Scanner Interface -->
                <div class="col-lg-5">
                    <div class="card h-100 border">
                        <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                            <span class="fw-bold small text-uppercase"><i class="fas fa-camera text-primary me-2"></i> Scanner Caméra / Mobile</span>
                            <span class="badge bg-light text-dark border small" id="camStatusBadge">Prêt</span>
                        </div>
                        <div class="card-body d-flex flex-column align-items-center justify-content-center p-3">
                            <div id="reader" style="width:100%;max-width:380px;min-height:280px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;" class="mb-3">
                                <div class="text-center p-3 text-muted" id="readerPlaceholder">
                                    <i class="fas fa-camera fa-3x mb-2 text-secondary"></i>
                                    <p class="small mb-0">Caméra en pause.<br>Cliquez ci-dessous pour démarrer la numérisation.</p>
                                </div>
                            </div>
                            <div class="d-flex gap-2 w-100 justify-content-center">
                                <button class="btn btn-primary btn-sm px-3 fw-bold" id="btnStartScan" onclick="BarcodeScanner.startScanner()">
                                    <i class="fas fa-video me-1"></i> Activer Caméra
                                </button>
                                <button class="btn btn-outline-danger btn-sm px-3" id="btnStopScan" onclick="BarcodeScanner.stopScanner()" style="display:none;">
                                    <i class="fas fa-stop me-1"></i> Arrêter Caméra
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Scan Result / Order Fulfillment Console -->
                <div class="col-lg-7">
                    <div class="card h-100 border" id="scanConsoleCard">
                        <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                            <span class="fw-bold small text-uppercase" id="scanConsoleTitle">
                                <i class="fas fa-circle-info text-primary me-2"></i> Console de Validation
                            </span>
                            <span class="badge bg-secondary small" id="scanConsoleBadge">En attente de scan</span>
                        </div>
                        <div class="card-body p-3" id="scanResult">
                            <div class="text-center py-5 text-muted">
                                <div style="width:64px;height:64px;border-radius:50%;background:#eff6ff;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">
                                    <i class="fas fa-barcode"></i>
                                </div>
                                <h6 class="fw-bold text-dark mb-1">Aucun code scanné pour le moment</h6>
                                <p class="small text-muted" style="max-width:360px;margin:0 auto;">
                                    Présentez un <strong>Pass de Retrait QR</strong> (DEM-...) au comptoir, ou scannez directement le <strong>code-barres d'une pièce</strong> dans le rayon.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    startScanner: function() {
        if (typeof Html5QrcodeScanner === 'undefined' && typeof Html5Qrcode === 'undefined') {
            UI.showAlert('Librairie scanner HTML5 non disponible.', 'danger');
            return;
        }

        const placeholder = document.getElementById('readerPlaceholder');
        if (placeholder) placeholder.style.display = 'none';

        const btnStart = document.getElementById('btnStartScan');
        const btnStop = document.getElementById('btnStopScan');
        const badge = document.getElementById('camStatusBadge');
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'inline-block';
        if (badge) { badge.className = 'badge bg-success'; badge.textContent = 'En direct'; }

        try {
            if (!this.scanner) {
                this.scanner = new Html5QrcodeScanner("reader", {
                    fps: 15,
                    qrbox: { width: 260, height: 260 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true
                }, false);
            }
            this.scanner.render((text) => this.onScanSuccess(text), (err) => {});
        } catch(e) {
            console.warn('Scanner init error:', e);
            if (badge) { badge.className = 'badge bg-warning text-dark'; badge.textContent = 'Erreur caméra'; }
        }
    },

    stopScanner: function() {
        if (this.scanner) {
            try {
                this.scanner.clear();
            } catch(e) { console.warn(e); }
            this.scanner = null;
        }
        const btnStart = document.getElementById('btnStartScan');
        const btnStop = document.getElementById('btnStopScan');
        const badge = document.getElementById('camStatusBadge');
        const placeholder = document.getElementById('readerPlaceholder');
        if (btnStart) btnStart.style.display = 'inline-block';
        if (btnStop) btnStop.style.display = 'none';
        if (badge) { badge.className = 'badge bg-light text-dark border'; badge.textContent = 'En pause'; }
        if (placeholder) placeholder.style.display = 'block';
    },

    onScanSuccess: function(rawText) {
        if (!rawText) return;
        const text = String(rawText).trim();
        if (!text) return;

        this.playBeep('success');

        // Parse structured JSON QR payload if present
        let searchTarget = text;
        let payloadObj = null;
        try {
            if (text.startsWith('{') && text.endsWith('}')) {
                payloadObj = JSON.parse(text);
                searchTarget = payloadObj.ref || payloadObj.code || payloadObj.immat || payloadObj.immatriculation || text;
            }
        } catch(e) {}

        const targetLower = searchTarget.toLowerCase();
        const textLower = text.toLowerCase();

        // 1. If currently in order fulfillment mode, check if the scanned text matches one of the items!
        if (this.activeOrder) {
            this.handleFulfillmentScan(searchTarget || text);
            return;
        }

        // 2. Check if text matches a Requisition (DEM-YYYY-XXXX) or Décharge (DCH-YYYY-XXX)
        const preOrders = DB.data.preOrders || [];
        const decharges = DB.getDecharges ? DB.getDecharges() : [];

        const order = preOrders.find(p => p.ref.toLowerCase() === textLower || p.ref.toLowerCase() === targetLower || p.id === text || p.id === searchTarget);
        if (order) {
            this.openOrderFulfillment(order);
            return;
        }

        const dech = decharges.find(d => d.ref.toLowerCase() === textLower || d.ref.toLowerCase() === targetLower || d.id === text || d.id === searchTarget);
        if (dech) {
            const linked = preOrders.find(p => p.id === dech.preOrderId || p.dechargeId === dech.id);
            if (linked) {
                this.openOrderFulfillment(linked);
            } else {
                this.openDechargeFulfillment(dech);
            }
            return;
        }

        // 3. Check if text matches a Fleet vehicle / equipment (163 items in database)
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const vehicle = fleet.find(f => 
            (f.immatriculation && (f.immatriculation.toLowerCase() === textLower || f.immatriculation.toLowerCase() === targetLower)) ||
            (f.code && (f.code.toLowerCase() === textLower || f.code.toLowerCase() === targetLower)) ||
            f.id === text || f.id === searchTarget
        );
        if (vehicle) {
            this.showFleetResult(vehicle);
            return;
        }

        // 4. Check if text matches an Article (Code, Barcode, or ID)
        const articles = DB.getArticles();
        const article = articles.find(a => 
            (a.barcode && (a.barcode.toLowerCase() === textLower || a.barcode.toLowerCase() === targetLower)) || 
            (a.code && (a.code.toLowerCase() === textLower || a.code.toLowerCase() === targetLower)) || 
            a.id === text || a.id === searchTarget
        );
        if (article) {
            this.showArticleResult(article);
            return;
        }

        // 5. Code not recognized
        this.showUnknownResult(text);
    },

    openOrderFulfillment: function(order) {
        this.activeOrder = order;
        this.scannedItems = {};
        
        // Initialize scanned items with already served count if any
        (order.items || []).forEach(it => {
            this.scannedItems[it.articleId] = Number(it.servedQty) || 0;
        });

        this.renderFulfillmentView();
    },

    renderFulfillmentView: function() {
        const order = this.activeOrder;
        if (!order) return;

        const resDiv = document.getElementById('scanResult');
        const badge = document.getElementById('scanConsoleBadge');
        const title = document.getElementById('scanConsoleTitle');
        if (badge) { badge.className = 'badge bg-primary'; badge.textContent = 'Préparation Commande'; }
        if (title) { title.innerHTML = `<i class="fas fa-boxes-packing text-primary me-2"></i> Remise Comptoir : <strong>${Utils.escapeHTML(order.ref)}</strong>`; }
        if (!resDiv) return;

        const items = Array.isArray(order.items) ? order.items : [];
        const totalReq = items.reduce((s, i) => s + (Number(i.requestedQty || i.quantity) || 1), 0);
        const totalScanned = items.reduce((s, i) => s + (this.scannedItems[i.articleId] || 0), 0);
        const allCompleted = items.every(i => (this.scannedItems[i.articleId] || 0) >= (Number(i.requestedQty || i.quantity) || 1));

        resDiv.innerHTML = `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-primary">${Utils.escapeHTML(order.ref)}</span>
                            <span class="badge bg-${order.status === 'Servie' ? 'success' : order.status === 'Partiellement servie' ? 'warning text-dark' : 'info'}">${order.status || 'En attente'}</span>
                            <span class="small text-muted"><i class="fas fa-calendar-day me-1"></i> ${new Date(order.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <h6 class="fw-bold mb-0 text-dark">Demandeur : ${Utils.escapeHTML(order.beneficiary || order.userName || 'Demandeur')} (${Utils.escapeHTML(order.department || '-')})</h6>
                        ${order.immatriculation ? `<small class="text-muted">Affectation : Véhicule ${Utils.escapeHTML(order.immatriculation)} - ${Utils.escapeHTML(order.materialName || '')}</small>` : ''}
                    </div>
                    <button class="btn btn-xs btn-outline-secondary" onclick="BarcodeScanner.cancelFulfillment()">
                        <i class="fas fa-times me-1"></i> Fermer
                    </button>
                </div>

                <!-- Piece-by-piece scanner input -->
                <div class="p-2 mb-3 bg-light border rounded">
                    <label class="form-label small fw-bold mb-1 text-primary">
                        <i class="fas fa-barcode me-1"></i> Flasher maintenant chaque article prélevé du rayon :
                    </label>
                    <div class="input-group input-group-sm">
                        <input type="text" id="fulfillmentPieceInput" class="form-control" placeholder="Flashez le code-barres de la pièce (ex: PR-001)..." autofocus onkeydown="if(event.key==='Enter'){ BarcodeScanner.handleFulfillmentScan(this.value); this.value=''; }">
                        <button class="btn btn-success fw-bold" onclick="const el=document.getElementById('fulfillmentPieceInput'); BarcodeScanner.handleFulfillmentScan(el.value); el.value='';">
                            <i class="fas fa-check me-1"></i> Valider Pièce
                        </button>
                    </div>
                </div>

                <!-- Checklist of items -->
                <div class="table-responsive mb-3">
                    <table class="table table-sm table-hover align-middle mb-0 border">
                        <thead class="table-light">
                            <tr>
                                <th>Article & Code</th>
                                <th class="text-center">Demandé</th>
                                <th class="text-center" width="130">Scanné / Validé</th>
                                <th class="text-center">État</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => {
                                const req = Number(it.requestedQty || it.quantity) || 1;
                                const scanned = Number(this.scannedItems[it.articleId]) || 0;
                                const isDone = scanned >= req;
                                return `
                                <tr class="${isDone ? 'table-success' : ''}">
                                    <td>
                                        <div class="fw-bold">${Utils.escapeHTML(it.designation)}</div>
                                        <small class="text-muted font-monospace">${Utils.escapeHTML(it.code)}</small>
                                    </td>
                                    <td class="text-center fw-bold">${req} ${Utils.escapeHTML(it.unit || 'U')}</td>
                                    <td class="text-center">
                                        <div class="d-flex align-items-center justify-content-center gap-1">
                                            <button class="btn btn-xs btn-outline-secondary" onclick="BarcodeScanner.decrementItemManual('${it.articleId}')">-</button>
                                            <span class="badge ${isDone ? 'bg-success' : 'bg-primary'} px-2 py-1 fs-6">${scanned} / ${req}</span>
                                            <button class="btn btn-xs btn-outline-primary" onclick="BarcodeScanner.incrementItemManual('${it.articleId}')">+</button>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        ${isDone 
                                            ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i> Complet</span>'
                                            : `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i> Manque ${req - scanned}</span>`
                                        }
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Fulfillment completion action -->
                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <div>
                        <strong class="text-dark">${totalScanned} / ${totalReq} pièces validées</strong>
                        ${allCompleted ? '<span class="badge bg-success ms-2">Prêt pour sortie</span>' : '<span class="badge bg-secondary ms-2">Préparation partielle</span>'}
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="Cart.showRequestPass('${order.id}')">
                            <i class="fas fa-qrcode me-1"></i> Voir Pass
                        </button>
                        <button class="btn ${allCompleted ? 'btn-success' : 'btn-primary'} btn-sm fw-bold px-3" onclick="BarcodeScanner.completeOrderFulfillment()">
                            <i class="fas fa-truck-ramp-box me-1"></i> Valider Délivrance & Sortie de Stock
                        </button>
                    </div>
                </div>
            </div>
        `;

        const pieceInput = document.getElementById('fulfillmentPieceInput');
        if (pieceInput) setTimeout(() => pieceInput.focus(), 80);
    },

    handleFulfillmentScan: function(rawCode) {
        if (!this.activeOrder) return;
        const code = String(rawCode).trim().toLowerCase();
        const items = this.activeOrder.items || [];
        const articles = DB.getArticles();

        // Match item by code, barcode, designation, or ID
        const matchedItem = items.find(it => {
            if (it.code && it.code.toLowerCase() === code) return true;
            if (it.articleId && it.articleId === rawCode) return true;
            const fullArt = articles.find(a => a.id === it.articleId);
            if (fullArt && fullArt.barcode && fullArt.barcode.toLowerCase() === code) return true;
            return false;
        });

        if (matchedItem) {
            const req = Number(matchedItem.requestedQty || matchedItem.quantity) || 1;
            const current = Number(this.scannedItems[matchedItem.articleId]) || 0;
            if (current >= req) {
                Utils.showNotification(`"${matchedItem.designation}" a déjà atteint sa quantité demandée (${req}/${req}).`, 'warning');
            } else {
                this.scannedItems[matchedItem.articleId] = current + 1;
                this.playBeep('success');
                Utils.showNotification(`✓ "${matchedItem.designation}" scanné (${this.scannedItems[matchedItem.articleId]}/${req}).`, 'success');
            }
            this.renderFulfillmentView();
        } else {
            this.playBeep('error');
            Utils.showNotification(`⚠️ La pièce flashee "${rawCode}" ne figure pas dans cette demande !`, 'danger');
        }
    },

    incrementItemManual: function(articleId) {
        const current = Number(this.scannedItems[articleId]) || 0;
        this.scannedItems[articleId] = current + 1;
        this.renderFulfillmentView();
    },

    decrementItemManual: function(articleId) {
        const current = Number(this.scannedItems[articleId]) || 0;
        if (current > 0) {
            this.scannedItems[articleId] = current - 1;
            this.renderFulfillmentView();
        }
    },

    completeOrderFulfillment: function() {
        const order = this.activeOrder;
        if (!order) return;

        const items = order.items || [];
        const articles = DB.getArticles();
        const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) ? Auth.getCurrentUser() : { name: 'Magasinier' };

        let totalDelivered = 0;
        let anyShortage = false;

        // Decrement warehouse stock
        items.forEach(it => {
            const qtyServed = Number(this.scannedItems[it.articleId]) || 0;
            it.servedQty = qtyServed;
            it.status = (qtyServed >= (it.requestedQty || it.quantity)) ? 'Servie' : (qtyServed > 0 ? 'Partiellement servie' : 'Non servie');
            totalDelivered += qtyServed;
            if (qtyServed < (it.requestedQty || it.quantity)) anyShortage = true;

            const art = articles.find(a => a.id === it.articleId);
            if (art && qtyServed > 0) {
                art.quantity = Math.max(0, (Number(art.quantity) || 0) - qtyServed);
            }
        });

        order.status = (totalDelivered === 0) ? 'En attente' : (anyShortage ? 'Partiellement servie' : 'Servie');
        order.deliveredDate = new Date().toISOString();
        order.deliveredBy = currentUser.name;

        // If linked to a Décharge, approve and finalize it
        if (order.dechargeId && DB.data.decharges) {
            const dech = DB.data.decharges.find(d => d.id === order.dechargeId);
            if (dech) {
                dech.status = 'Approuvée';
                dech.servedBy = currentUser.name;
                dech.servedDate = new Date().toISOString();
                dech.hasShortage = anyShortage;
                dech.lines = items.map(i => ({
                    articleId: i.articleId,
                    designation: i.designation,
                    unit: i.unit,
                    quantity: Number(i.requestedQty || i.quantity),
                    servedQty: Number(this.scannedItems[i.articleId]) || 0,
                    missingQty: Math.max(0, (Number(i.requestedQty || i.quantity) || 1) - (Number(this.scannedItems[i.articleId]) || 0))
                }));
            }
        }

        DB.save();

        // Audit Log
        DB.addAuditLog({
            action: 'SORTIE_SCAN_COMPTOIR',
            col: 'preOrders',
            itemId: order.id,
            details: `Sortie magasin validée par scan pour la demande ${order.ref} (${totalDelivered} pièces remises à ${order.beneficiary})`,
            user: currentUser.name
        });

        Utils.showNotification(`✅ Sortie de stock validée pour la demande ${order.ref} !`, 'success');

        const savedDechargeId = order.dechargeId;
        this.cancelFulfillment();

        const resDiv = document.getElementById('scanResult');
        if (resDiv) {
            resDiv.innerHTML = `
                <div class="alert alert-success text-center py-4">
                    <i class="fas fa-circle-check fa-3x text-success mb-2"></i>
                    <h4>Délivrance de Stock Validée !</h4>
                    <p class="mb-3">La demande <strong>${Utils.escapeHTML(order.ref)}</strong> a été servie et les stocks magasin ont été décrémentés en temps réel.</p>
                    <div class="d-flex justify-content-center gap-2">
                        ${savedDechargeId ? `<button class="btn btn-primary" onclick="Decharges.showDetail('${savedDechargeId}')"><i class="fas fa-file-signature me-1"></i> Bon de Décharge Officiel</button>` : ''}
                        <button class="btn btn-outline-secondary" onclick="App.loadModule('history', 'orders')"><i class="fas fa-clock-rotate-left me-1"></i> Voir l'Historique</button>
                    </div>
                </div>
            `;
        }
    },

    cancelFulfillment: function() {
        this.activeOrder = null;
        this.scannedItems = {};
        const badge = document.getElementById('scanConsoleBadge');
        const title = document.getElementById('scanConsoleTitle');
        if (badge) { badge.className = 'badge bg-secondary'; badge.textContent = 'En attente de scan'; }
        if (title) { title.innerHTML = '<i class="fas fa-circle-info text-primary me-2"></i> Console de Validation'; }
        const resDiv = document.getElementById('scanResult');
        if (resDiv) {
            resDiv.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <div style="width:64px;height:64px;border-radius:50%;background:#eff6ff;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">
                        <i class="fas fa-barcode"></i>
                    </div>
                    <h6 class="fw-bold text-dark mb-1">Prêt pour le prochain scan</h6>
                    <p class="small text-muted">Flashez un Pass QR ou un code-barres d'article.</p>
                </div>
            `;
        }
    },

    showFleetResult: function(vehicle) {
        const resDiv = document.getElementById('scanResult');
        const badge = document.getElementById('scanConsoleBadge');
        const title = document.getElementById('scanConsoleTitle');
        if (badge) { badge.className = 'badge bg-info'; badge.textContent = 'Véhicule Détecté'; }
        if (title) { title.innerHTML = `<i class="fas fa-truck text-primary me-2"></i> Équipement Flotte : <strong>${Utils.escapeHTML(vehicle.immatriculation)}</strong>`; }
        if (!resDiv) return;

        const decharges = DB.getDecharges ? DB.getDecharges().filter(d => d.materialId === vehicle.id && (d.status === 'Validée' || d.status === 'Approuvée')) : [];
        const totalItems = decharges.reduce((sum, d) => sum + (d.items ? d.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0), 0);

        resDiv.innerHTML = `
            <div class="card p-3 border mb-3 bg-white">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="badge bg-dark font-monospace text-warning px-2 py-1 mb-1">${Utils.escapeHTML(vehicle.immatriculation)}</span>
                        <h5 class="fw-bold text-dark mb-0">${Utils.escapeHTML(vehicle.name)}</h5>
                        <small class="text-muted">Famille: <strong>${Utils.escapeHTML(vehicle.family || 'Autre')}</strong> | Code: <code>${Utils.escapeHTML(vehicle.code || '-')}</code></small>
                    </div>
                    <span class="badge bg-${vehicle.status === 'Actif' ? 'success' : 'warning'} px-2 py-1">
                        ${Utils.escapeHTML(vehicle.status || 'Actif')}
                    </span>
                </div>

                <div class="row g-2 text-center my-2">
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Kilométrage</small>
                            <strong class="fs-6 text-primary">${Utils.formatNumber(vehicle.kilometrage || 0)} KM</strong>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Bons Décharges</small>
                            <strong class="fs-6 text-dark">${decharges.length}</strong>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Pièces Consommées</small>
                            <strong class="fs-6 text-success">${totalItems} pièces</strong>
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                    <button class="btn btn-outline-primary btn-sm" onclick="App.loadModule('consumption'); setTimeout(() => Consumption.viewForTruck('${vehicle.id}'), 120);">
                        <i class="fas fa-chart-pie me-1"></i> Suivi Conso
                    </button>
                    <button class="btn btn-success btn-sm fw-bold" onclick="Decharges.showCreateForTruck('${vehicle.id}')">
                        <i class="fas fa-plus-circle me-1"></i> Créer Décharge Véhicule
                    </button>
                </div>
            </div>
        `;
    },

    showArticleResult: function(article) {
        const resDiv = document.getElementById('scanResult');
        const badge = document.getElementById('scanConsoleBadge');
        const title = document.getElementById('scanConsoleTitle');
        if (badge) { badge.className = 'badge bg-success'; badge.textContent = 'Article Détecté'; }
        if (title) { title.innerHTML = `<i class="fas fa-box text-success me-2"></i> Fiche Article : <strong>${Utils.escapeHTML(article.code)}</strong>`; }
        if (!resDiv) return;

        const isAlert = Number(article.quantity) < Number(article.minThreshold);
        const isAdminOrMag = (typeof Auth !== 'undefined') ? (Auth.isAdmin() || Auth.isMag()) : false;

        resDiv.innerHTML = `
            <div class="card p-3 border mb-3 bg-white">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="badge bg-light text-dark border font-monospace mb-1">${Utils.escapeHTML(article.code)}</span>
                        <h5 class="fw-bold text-dark mb-0">${Utils.escapeHTML(article.designation)}</h5>
                        <small class="text-muted">Catégorie: ${Utils.escapeHTML(article.category || '-')} | Section: ${Utils.escapeHTML(article.section || '-')}</small>
                    </div>
                    <span class="badge bg-${isAlert ? 'danger' : 'success'} px-2 py-1">
                        ${isAlert ? 'Stock Alerte' : 'Stock Normal'}
                    </span>
                </div>

                <div class="row g-2 text-center my-2">
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Quantité Dispo</small>
                            <strong class="fs-5 ${isAlert ? 'text-danger' : 'text-success'}">${article.quantity}</strong> <small>${Utils.escapeHTML(article.unit || 'U')}</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Seuil Min</small>
                            <strong class="fs-5 text-dark">${article.minThreshold}</strong>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 border rounded bg-light">
                            <small class="text-muted d-block" style="font-size:11px;">Prix Indicatif</small>
                            <strong class="fs-5 text-primary">${Number(article.price || 0).toFixed(2)}</strong> <small>DA</small>
                        </div>
                    </div>
                </div>

                <div class="d-flex gap-2 flex-wrap pt-2 border-top justify-content-end">
                    <button class="btn btn-primary fw-bold" onclick="Cart.addItem('${article.id}'); Cart.openDrawer();">
                        <i class="fas fa-clipboard-list me-1"></i> Ajouter à ma Demande
                    </button>
                    ${isAdminOrMag ? `
                    <button class="btn btn-outline-success" onclick="Stock.addStock('${article.id}')" title="Entrée"><i class="fas fa-plus me-1"></i> Entrée</button>
                    <button class="btn btn-outline-danger" onclick="Stock.removeStock('${article.id}')" title="Sortie"><i class="fas fa-minus me-1"></i> Sortie</button>
                    <button class="btn btn-outline-secondary" onclick="Stock.showArticleDetail('${article.id}')">Détails</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    showUnknownResult: function(text) {
        this.playBeep('error');
        const resDiv = document.getElementById('scanResult');
        const badge = document.getElementById('scanConsoleBadge');
        if (badge) { badge.className = 'badge bg-warning text-dark'; badge.textContent = 'Code Inconnu'; }
        if (!resDiv) return;

        resDiv.innerHTML = `
            <div class="alert alert-warning py-3">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <i class="fas fa-triangle-exclamation fa-2x text-warning"></i>
                    <div>
                        <h6 class="fw-bold mb-0">Code non reconnu : <code>${Utils.escapeHTML(text)}</code></h6>
                        <small>Ce code ne correspond à aucune demande (DEM-...), ni bon de décharge (DCH-...), ni référence article connue.</small>
                    </div>
                </div>
                ${(typeof Auth !== 'undefined' && (Auth.isAdmin() || Auth.isMag())) ? `
                <div class="pt-2 border-top mt-2">
                    <button class="btn btn-sm btn-success" onclick="Stock.showAddArticle()"><i class="fas fa-plus me-1"></i> Créer cet article dans le catalogue</button>
                </div>
                ` : ''}
            </div>
        `;
    }
};

window.BarcodeGenerator = {
    mode: 'barcode', // 'barcode', 'qr', or 'fleet'
    render: function() {
        const articles = DB.getArticles();
        const decharges = DB.getDecharges();
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-barcode text-primary me-2"></i> Générateur de Codes & Étiquettes</h2>
                    <p class="text-muted" style="margin:0;">Générez des codes-barres pour les articles, des QR codes pour les décharges ou les équipements du parc</p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm ${this.mode === 'barcode' ? 'btn-primary' : 'btn-outline-primary'}" onclick="BarcodeGenerator.setMode('barcode')"><i class="fas fa-barcode me-1"></i> Code-Barres Articles</button>
                    <button class="btn btn-sm ${this.mode === 'qr' ? 'btn-primary' : 'btn-outline-primary'}" onclick="BarcodeGenerator.setMode('qr')"><i class="fas fa-qrcode me-1"></i> QR Décharges (${decharges.length})</button>
                    <button class="btn btn-sm ${this.mode === 'fleet' ? 'btn-primary' : 'btn-outline-primary'}" onclick="BarcodeGenerator.setMode('fleet')"><i class="fas fa-truck-moving me-1"></i> QR Flotte & Matériels (${fleet.length})</button>
                    <button class="btn btn-sm btn-success" onclick="BarcodeGenerator.generateBatch()"><i class="fas fa-print me-1"></i> Imprimer Sélection</button>
                </div>
            </div>

            ${this.mode === 'barcode' ? `
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <strong><i class="fas fa-barcode me-1"></i> Code-Barres — Catalogue Articles (${articles.length})</strong>
                    <small class="text-muted">Le code-barres encode le code article (ex: ECR-001). Scannable en magasin.</small>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th><input type="checkbox" id="bgSelAll" onchange="BarcodeGenerator.toggleAll()"></th>
                                    <th>Code Article</th>
                                    <th>Désignation</th>
                                    <th>Catégorie</th>
                                    <th>Qté</th>
                                    <th>Code-Barres (Code128)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${articles.map(a => `
                                    <tr>
                                        <td><input type="checkbox" class="bg-cb" value="${Utils.escapeHTML(a.code)}" data-id="${a.id}" data-designation="${Utils.escapeHTML(a.designation)}"></td>
                                        <td><code class="text-primary fw-bold">${Utils.escapeHTML(a.code)}</code></td>
                                        <td>${Utils.escapeHTML(a.designation)}</td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(a.category)}</span></td>
                                        <td><strong>${a.quantity}</strong> ${Utils.escapeHTML(a.unit)}</td>
                                        <td><svg id="bc_${a.id}" style="max-width:200px;"></svg></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : this.mode === 'qr' ? `
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <strong><i class="fas fa-qrcode me-1"></i> QR Codes — Décharges & Bons de Sortie (${decharges.length})</strong>
                    <small class="text-muted">Chaque QR code encode la référence + statut + bénéficiaire de la décharge.</small>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th><input type="checkbox" id="bgSelAll" onchange="BarcodeGenerator.toggleAll()"></th>
                                    <th>Référence</th>
                                    <th>Bénéficiaire</th>
                                    <th>Date</th>
                                    <th>Statut</th>
                                    <th>QR Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${decharges.sort((a,b) => new Date(b.date) - new Date(a.date)).map(d => `
                                    <tr>
                                        <td><input type="checkbox" class="bg-cb" value="${Utils.escapeHTML(d.ref)}" data-type="qr" data-id="${d.id}" data-ref="${Utils.escapeHTML(d.ref)}" data-ben="${Utils.escapeHTML(d.beneficiary || '')}"></td>
                                        <td><code class="text-primary fw-bold">${Utils.escapeHTML(d.ref)}</code></td>
                                        <td>${Utils.escapeHTML(d.beneficiary || '—')}</td>
                                        <td>${Utils.formatDate(d.date, d.ref)}</td>
                                        <td><span class="badge bg-${d.status === 'Validée' || d.status === 'Approuvée' ? 'success' : d.status === 'En attente' ? 'warning text-dark' : 'danger'}">${d.status}</span></td>
                                        <td><div id="qr_${d.id}" style="width:80px;height:80px;display:inline-block;"></div></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : `
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <strong><i class="fas fa-truck-moving me-1"></i> QR Codes — Parc Flotte & Équipements (${fleet.length})</strong>
                    <small class="text-muted">QR code individuel pour identification de chaque véhicule (Tracteur, Remorque, VL).</small>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th><input type="checkbox" id="bgSelAll" onchange="BarcodeGenerator.toggleAll()"></th>
                                    <th>Immatriculation</th>
                                    <th>Code</th>
                                    <th>Désignation / Modèle</th>
                                    <th>Famille</th>
                                    <th>Statut</th>
                                    <th>QR Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${fleet.map(f => `
                                    <tr>
                                        <td><input type="checkbox" class="bg-cb" value="${Utils.escapeHTML(f.immatriculation)}" data-type="fleet" data-id="${f.id}" data-immat="${Utils.escapeHTML(f.immatriculation)}" data-name="${Utils.escapeHTML(f.name)}"></td>
                                        <td><code class="text-dark fw-bold px-2 py-1 bg-light border rounded">${Utils.escapeHTML(f.immatriculation)}</code></td>
                                        <td><span class="badge bg-secondary font-monospace">${Utils.escapeHTML(f.code || '-')}</span></td>
                                        <td><strong>${Utils.escapeHTML(f.name)}</strong></td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(f.family || 'Autre')}</span></td>
                                        <td><span class="badge bg-${f.status === 'Actif' ? 'success' : 'warning'}">${f.status || 'Actif'}</span></td>
                                        <td><div id="qrf_${f.id}" style="width:80px;height:80px;display:inline-block;"></div></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            `}
            <div id="printArea" style="display:none;"></div>
        `;
    },
    setMode: function(mode) {
        this.mode = mode;
        if (typeof App !== 'undefined') App.loadModule('barcodeGenerator');
    },
    afterRender: function() {
        if (this.mode === 'barcode') {
            if (typeof JsBarcode === 'undefined') {
                console.warn('JsBarcode not loaded');
                return;
            }
            const articles = DB.getArticles();
            articles.forEach(a => {
                const el = document.getElementById('bc_' + a.id);
                if (el && a.code) {
                    try {
                        JsBarcode(el, a.code, {
                            format: 'CODE128',
                            height: 35,
                            width: 1.5,
                            displayValue: true,
                            fontSize: 11,
                            margin: 4,
                            fontOptions: 'bold'
                        });
                    } catch(e) { console.warn('Barcode error for', a.code, e); }
                }
            });
        } else if (this.mode === 'qr') {
            const decharges = DB.getDecharges();
            decharges.forEach(d => {
                const container = document.getElementById('qr_' + d.id);
                if (!container) return;
                container.innerHTML = '';
                const payload = JSON.stringify({
                    ref: d.ref,
                    ben: d.beneficiary,
                    date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
                    status: d.status,
                    mat: d.immatriculation || '',
                    items: (d.items || []).length
                });
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(container, {
                            text: payload,
                            width: 80,
                            height: 80,
                            colorDark: '#000000',
                            colorLight: '#ffffff',
                            correctLevel: (typeof QRCode.CorrectLevel !== 'undefined') ? QRCode.CorrectLevel.M : 0
                        });
                    } catch(e) { console.warn('QR error', e); }
                }
            });
        } else if (this.mode === 'fleet') {
            const fleet = DB.getFleet ? DB.getFleet() : [];
            fleet.forEach(f => {
                const container = document.getElementById('qrf_' + f.id);
                if (!container) return;
                container.innerHTML = '';
                const payload = JSON.stringify({
                    immat: f.immatriculation,
                    code: f.code || '',
                    name: f.name,
                    family: f.family || '',
                    id: f.id
                });
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(container, {
                            text: payload,
                            width: 80,
                            height: 80,
                            colorDark: '#000000',
                            colorLight: '#ffffff',
                            correctLevel: (typeof QRCode.CorrectLevel !== 'undefined') ? QRCode.CorrectLevel.M : 0
                        });
                    } catch(e) { console.warn('Fleet QR error', e); }
                }
            });
        }
    },
    toggleAll: function() {
        const val = document.getElementById('bgSelAll') ? document.getElementById('bgSelAll').checked : false;
        document.querySelectorAll('.bg-cb').forEach(cb => cb.checked = val);
    },
    generateBatch: function() {
        const selected = Array.from(document.querySelectorAll('.bg-cb:checked'));
        if (selected.length === 0) {
            UI.showAlert('Sélectionnez au moins un élément', 'warning');
            return;
        }

        if (this.mode === 'barcode') {
            // Print barcode labels with article info
            const articles = DB.getArticles();
            const printWin = window.open('', '_blank');
            let html = `<html><head><title>Étiquettes Code-Barres — SPA DOUROUB ELDJAZAIR</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; }
                    .label { display: inline-block; width: 28%; margin: 1%; text-align: center; border: 1px solid #ccc; padding: 8px; border-radius: 4px; vertical-align: top; }
                    .label .designation { font-size: 9px; font-weight: bold; margin-bottom: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .label .category { font-size: 8px; color: #666; margin-bottom: 3px; }
                    @media print { .label { page-break-inside: avoid; } }
                </style></head>
                <body onload="setTimeout(() => { window.print(); }, 800)">
                <div style="text-align:center;padding:6px;background:#1d4ed8;color:#fff;font-size:11px;font-weight:bold;margin-bottom:10px;">SPA DOUROUB ELDJAZAIR — Étiquettes Stock</div>`;

            selected.forEach((cb, i) => {
                const code = cb.value;
                const art = articles.find(a => a.code === code);
                const desig = art ? art.designation.substring(0, 30) : code;
                const cat = art ? art.category : '';
                html += `<div class="label">
                    <div class="designation">${desig}</div>
                    <div class="category">${cat}</div>
                    <svg id="bc_p${i}"></svg>
                    <script>JsBarcode("#bc_p${i}", "${code}", {format:"CODE128", width:1.5, height:35, displayValue:true, fontSize:9});<\/script>
                </div>`;
            });
            html += `</body></html>`;
            printWin.document.write(html);
            printWin.document.close();
        } else {
            // Print QR labels for décharges
            const decharges = DB.getDecharges();
            const printWin = window.open('', '_blank');
            let html = `<html><head><title>QR Décharges — SPA DOUROUB ELDJAZAIR</title>
                <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
                <style>
                    body { font-family: Arial, sans-serif; margin: 10px; }
                    .label { display: inline-block; width: 28%; margin: 1%; text-align: center; border: 1px solid #ccc; padding: 8px; border-radius: 4px; vertical-align: top; }
                    .label .ref { font-size: 9px; font-weight: bold; color: #1d4ed8; }
                    .label .info { font-size: 8px; color: #666; }
                    @media print { .label { page-break-inside: avoid; } }
                </style></head><body>
                <div style="text-align:center;padding:6px;background:#1d4ed8;color:#fff;font-size:11px;font-weight:bold;margin-bottom:10px;">SPA DOUROUB ELDJAZAIR — QR Décharges</div>`;

            selected.forEach((cb, i) => {
                const ref = cb.value;
                const d = decharges.find(x => x.ref === ref);
                if (!d) return;
                const payload = JSON.stringify({ ref: d.ref, ben: d.beneficiary, date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '', status: d.status });
                html += `<div class="label">
                    <canvas id="qr_p${i}" width="80" height="80"></canvas>
                    <div class="ref">${ref}</div>
                    <div class="info">${d.beneficiary || ''}</div>
                    <div class="info">${d.date ? new Date(d.date).toLocaleDateString('fr-FR') : ''} — ${d.status}</div>
                    <script>QRCode.toCanvas(document.getElementById('qr_p${i}'), '${payload.replace(/'/g, "\\'")}', {width:80, margin:1});<\/script>
                </div>`;
            });
            html += `<script>window.onload = () => setTimeout(() => { window.print(); }, 1200);<\/script></body></html>`;
            printWin.document.write(html);
            printWin.document.close();
        }
    },
    setSelection: function(ids) {
        const articles = DB.getArticles();
        const codes = ids.map(id => articles.find(a => a.id === id)?.code).filter(c => c);
        setTimeout(() => {
            document.querySelectorAll('.bg-cb').forEach(cb => {
                if(codes.includes(cb.value)) cb.checked = true;
            });
        }, 500);
    }
};

window.Users = {
    _mongoLoaded: false,

    render: function() {
        // Async sync from MongoDB on first tab open
        if (!this._mongoLoaded) {
            this._mongoLoaded = true;
            setTimeout(function() { Users.loadFromMongo(); }, 150);
        }
        const users = DB.getUsers();
        const settings = DB.getSettings();
        const depts = (settings.departments && settings.departments.length > 0) ? settings.departments : ['Direction Générale', 'Approvisionnement', 'Transport'];

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;">
                        <i class="fas fa-users-gear text-primary me-2"></i> Gestion des Utilisateurs & Accès
                    </h2>
                    <p class="text-muted mb-0" style="font-size:13px;">
                        Créez et gérez les comptes utilisateurs en les reliant à leur département et fonction
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success" onclick="Users.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-primary" onclick="Users.showAdd()"><i class="fas fa-user-plus me-1"></i> Nouvel Utilisateur</button>
                </div>
            </div>

            <div class="card shadow-sm border">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Nom & Prénom</th>
                                    <th>Identifiant</th>
                                    <th>Département / Service</th>
                                    <th>Fonction / Qualité</th>
                                    <th>Rôle Système</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => {
                                    let roleBadge = 'secondary';
                                    let roleLabel = 'Utilisateur';
                                    if(u.role === 'admin') { roleBadge = 'danger'; roleLabel = 'Administrateur'; }
                                    else if(u.role === 'magasinier') { roleBadge = 'primary'; roleLabel = 'Magasinier'; }

                                    return `
                                    <tr>
                                        <td><strong><i class="fas fa-user-circle text-primary me-2"></i> ${Utils.escapeHTML(u.name || u.username)}</strong></td>
                                        <td><code>${Utils.escapeHTML(u.username)}</code></td>
                                        <td><span class="badge bg-light text-dark border"><i class="fas fa-building text-muted me-1"></i> ${Utils.escapeHTML(u.department || 'Direction Générale')}</span></td>
                                        <td>${Utils.escapeHTML(u.qualite || '-')}</td>
                                        <td><span class="badge bg-${roleBadge}">${roleLabel}</span></td>
                                        <td class="text-end">
                                            <button class="btn btn-sm btn-outline-primary me-1" onclick="Users.showEdit('${u.id}')" title="Modifier"><i class="fas fa-pen"></i></button>
                                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="Users.showSettings('${u.id}')" title="Paramètres Utilisateur"><i class="fas fa-cog"></i></button>
                                            ${u.username !== 'admin' ? `
                                                <button class="btn btn-sm btn-outline-danger" onclick="Users.delete('${u.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                                            ` : ''}
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        return html;
    },

    showUserModal: function(id) {
        if (id) return this.showEdit(id);
        return this.showAdd();
    },

    showSettings: function(id) {
        if (id) return this.showEdit(id);
        if (window.App && typeof App.loadModule === 'function' && typeof Auth !== 'undefined' && Auth.isAdmin()) {
            return App.loadModule('settings', 'users');
        }
        const currentId = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.id : null;
        if (currentId) return this.showEdit(currentId);
    },

    showProfile: function(id) {
        const userId = id || (typeof Auth !== 'undefined' && Auth.currentUser ? Auth.currentUser.id : null);
        if (userId) return this.showEdit(userId);
        return this.showAdd();
    },

    showAdd: function() {
        const settings = DB.getSettings();
        const depts = (settings.departments && settings.departments.length > 0) ? settings.departments : ['Direction Générale', 'Approvisionnement', 'Transport'];

        const html = `
            <form onsubmit="Users.save(event)">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Nom & Prénom *</label>
                        <input type="text" name="name" class="form-control" required placeholder="ex: Ahmed Benali">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Identifiant (Login) *</label>
                        <input type="text" name="username" class="form-control" required placeholder="ex: abenali" autocomplete="username">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Mot de passe *</label>
                        <input type="password" name="password" class="form-control" required placeholder="••••••••" autocomplete="new-password">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Département / Service *</label>
                        <select name="department" class="form-select" required>
                            <option value="">-- Sélectionner département --</option>
                            ${depts.map(d => `<option value="${Utils.escapeHTML(d)}">${Utils.escapeHTML(d)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Fonction / Qualité</label>
                        <input type="text" name="qualite" class="form-control" placeholder="ex: Chauffeur, Mécanicien, Magasinier...">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Rôle Système *</label>
                        <select name="role" class="form-select" required>
                            <option value="user">Utilisateur (Consultation & Demandes)</option>
                            <option value="magasinier">Magasinier (Stock, Décharges, Scanner)</option>
                            <option value="admin">Administrateur (Accès Total)</option>
                        </select>
                    </div>
                </div>
                <div class="text-end mt-3">
                    <button type="button" class="btn btn-secondary me-2" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-save me-1"></i> Créer Utilisateur</button>
                </div>
            </form>
        `;
        UI.showModal('Nouvel Utilisateur', html);
    },

    showEdit: function(id) {
        const users = (typeof DB !== 'undefined' && DB.getUsers) ? DB.getUsers() : [];
        const u = users.find(x => String(x.id) === String(id) || x.username === id || (id == null && typeof Auth !== 'undefined' && Auth.currentUser && x.id === Auth.currentUser.id));
        if (!u) {
            if (typeof Utils !== 'undefined' && Utils.showNotification) Utils.showNotification('Utilisateur non trouvé.', 'warning');
            return;
        }
        const settings = DB.getSettings();
        const depts = (settings.departments && settings.departments.length > 0) ? settings.departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const isUserOrNormal = (u.role === 'user' || u.role === 'normal');

        const html = `
            <form onsubmit="Users.submitEdit(event, '${u.id}')">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Nom & Prénom *</label>
                        <input type="text" name="name" class="form-control" required value="${Utils.escapeHTML(u.name || '')}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Identifiant (Login) *</label>
                        <input type="text" name="username" class="form-control" required value="${Utils.escapeHTML(u.username || '')}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Nouveau Mot de passe (laisser vide si inchangé)</label>
                        <input type="password" name="password" class="form-control" placeholder="Laisser vide pour ne pas modifier">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Département / Service *</label>
                        <select name="department" class="form-select" required>
                            <option value="">-- Sélectionner département --</option>
                            ${depts.map(d => `<option value="${Utils.escapeHTML(d)}" ${(u.department||'Direction Générale')===d?'selected':''}>${Utils.escapeHTML(d)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Fonction / Qualité</label>
                        <input type="text" name="qualite" class="form-control" value="${Utils.escapeHTML(u.qualite || '')}" placeholder="ex: Chauffeur, Mécanicien...">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Rôle Système *</label>
                        <select name="role" class="form-select" required>
                            <option value="user" ${isUserOrNormal ? 'selected' : ''}>Utilisateur (Consultation & Demandes)</option>
                            <option value="magasinier" ${u.role==='magasinier'?'selected':''}>Magasinier (Stock, Décharges, Scanner)</option>
                            <option value="admin" ${u.role==='admin'?'selected':''}>Administrateur (Accès Total)</option>
                        </select>
                    </div>
                </div>
                <div class="text-end mt-3">
                    <button type="button" class="btn btn-secondary me-2" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-save me-1"></i> Sauvegarder</button>
                </div>
            </form>
        `;
        UI.showModal('Paramètres / Modification Utilisateur', html);
    },

    save: function(e) {
        e.preventDefault();
        const f = e.target;
        const newUser = {
            id: Utils.generateId(),
            name: f.name.value.trim(),
            username: f.username.value.trim().toLowerCase(),
            password: f.password.value,
            department: f.department.value,
            qualite: f.qualite.value.trim(),
            role: f.role.value
        };

        if (DB.data && DB.data.users) {
            DB.data.users.push(newUser);
            if (newUser.name && DB.data.beneficiaryNames && !DB.data.beneficiaryNames.includes(newUser.name)) {
                DB.data.beneficiaryNames.push(newUser.name);
            }
            DB.save();
        }

        UI.hideModal();
        UI.refresh();
        Utils.showNotification('Utilisateur créé avec succès et rattaché à son département.', 'success');
    },

    submitEdit: function(e, id) {
        e.preventDefault();
        const f = e.target;
        const u = DB.getUsers().find(x => String(x.id) === String(id) || x.username === id);
        if (!u) {
            Utils.showNotification('Utilisateur non trouvé.', 'error');
            return;
        }

        u.name = f.name.value.trim();
        u.username = f.username.value.trim().toLowerCase();
        if (f.password.value.trim()) {
            u.password = f.password.value.trim();
        }
        u.department = f.department.value;
        u.qualite = f.qualite.value.trim();
        u.role = f.role.value;

        DB.save();
        UI.hideModal();
        UI.refresh();
        Utils.showNotification('Paramètres de l\'utilisateur mis à jour avec succès.', 'success');
    },

    delete: function(id) {
        if(confirm("Supprimer définitivement cet utilisateur ?")) {
            if (DB.data && DB.data.users) {
                DB.data.users = DB.data.users.filter(u => String(u.id) !== String(id) && u.username !== id);
                DB.save();
            }
            UI.refresh();
            Utils.showNotification('Utilisateur supprimé.', 'info');
        }
    },

    exportExcel: function() {
        const users = DB.getUsers();
        const data = users.map(u => ({
            'Nom & Prénom': u.name || '',
            'Identifiant': u.username || '',
            'Rôle Système': u.role || '',
            'Fonction / Qualité': u.qualite || '',
            'Département': u.department || '',
            'Statut': u.active !== false ? 'Actif' : 'Inactif'
        }));
        Utils.downloadXLSX('Utilisateurs_' + new Date().toISOString().split('T')[0], [
            { name: 'Utilisateurs', data }
        ]);
        Utils.showNotification('Export Excel des utilisateurs généré.', 'success');
    },

    // Load users from MongoDB and sync into local DB
    loadFromMongo: async function() {
        var token = localStorage.getItem('erp_jwt_token');
        if (!token) return;
        try {
            var res = await fetch('/api/auth/users', { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) return;
            var data = await res.json();
            var mongoUsers = Array.isArray(data.users) ? data.users : [];
            if (mongoUsers.length === 0) return;
            // Merge MongoDB users into local DB
            var localUsers = DB.data.users || [];
            var mergedMap = {};
            localUsers.forEach(function(u) { if (u.username) mergedMap[u.username] = u; });
            mongoUsers.forEach(function(u) {
                mergedMap[u.username] = {
                    id: u.id || u._id || u.username,
                    username: u.username,
                    name: u.name || u.username,
                    role: u.role,
                    department: u.department || '',
                    service: u.service || '',
                    _mongoId: u.id || u._id
                };
            });
            DB.data.users = Object.values(mergedMap);
            DB.save();
            // Re-render users tab if still active
            var mainContent = document.getElementById('mainContent');
            if (mainContent && mainContent.querySelector('.users-gear-icon, [data-users-tab]')) {
                if (window.App && App.loadModule) App.loadModule('settings', 'users');
            }
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(mongoUsers.length + ' utilisateurs chargés depuis MongoDB', 'success');
            }
        } catch (e) {
            console.warn('[Users] loadFromMongo error:', e);
        }
    }
};

window.Settings = {
    _activeTab: 'database',

    switchTab: function(tab) {
        this._activeTab = tab;
        if (window.App && App.loadModule) {
            App.loadModule('settings', tab);
        } else {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.innerHTML = this.render(tab);
        }
    },

    render: function(tab) {
        if (tab) this._activeTab = tab;
        const currentTab = this._activeTab || 'database';
        const s = (typeof DB !== 'undefined') ? DB.getSettings() : {};
        const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
        const fleet = (typeof DB !== 'undefined' && DB.getFleet) ? DB.getFleet() : [];
        const users = (typeof DB !== 'undefined' && DB.getAll) ? DB.getAll('users') : [];
        const beneficiaries = (typeof DB !== 'undefined' && DB.getAll) ? DB.getAll('beneficiaries') : [];

        const categories = s.articleCategories || ['Pièces de rechange', 'Filtres', 'Lubrifiant', 'Pneus', 'Electricité', 'Fournitures bureau', 'Consommables', 'Carrosserie', 'Outillage'];
        const prefixes = s.categoryPrefixes || {};
        const sections = s.stockSections || [];
        const families = s.materialFamilies || [];
        const departments = (s.departments && s.departments.length > 0) ? s.departments : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const units = s.units || ['Pièce','Kg','Litre','Mètre','Boîte','Rouleau','Bidon','Paquet','Unité'];

        const navTabs = [
            { id: 'database', icon: 'fa-sitemap', label: 'Base de Données & Arborescence' },
            { id: 'models', icon: 'fa-file-csv', label: 'Modèles & Imports Massifs' },
            { id: 'company', icon: 'fa-building', label: 'Identité SPA DOUROUB & Logos' },
            { id: 'users', icon: 'fa-user-shield', label: 'Utilisateurs & Droits' },
            { id: 'maintenance', icon: 'fa-shield-halved', label: 'Sauvegarde & Maintenance' }
        ];

        let tabContent = '';

        if (currentTab === 'database') {
            tabContent = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
                    <!-- Catégories & Abréviations -->
                    <div class="card" style="grid-column: 1 / -1;">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-tags text-primary me-2"></i> <strong>Arborescence des Catégories & Abréviations (Préfixes)</strong></span>
                            <span class="badge bg-primary">${categories.length} catégories</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-3">
                                Définissez les catégories de stock et leurs abréviations officielles (2 à 5 lettres). Le système génère automatiquement les codes d'articles en se basant sur ces préfixes (ex: <code>PNEU-001</code>, <code>FILT-015</code>).
                            </p>

                            <!-- Add Category Row -->
                            <form onsubmit="Settings.addCategory(event)" class="row g-2 align-items-end p-2 mb-3 rounded" style="background:var(--surface-alt);border:1px solid var(--border);">
                                <div class="col-md-5">
                                    <label class="form-label small fw-bold mb-1">Nom de la Catégorie *</label>
                                    <input type="text" id="newCatName" class="form-control form-control-sm" placeholder="Ex: Outillage Spécialisé" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold mb-1">Abréviation / Préfixe *</label>
                                    <input type="text" id="newCatPrefix" class="form-control form-control-sm" placeholder="Ex: OUT" maxlength="5" style="text-transform:uppercase;" required>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button type="submit" class="btn btn-sm btn-primary w-100"><i class="fas fa-plus-circle me-1"></i> Ajouter la Catégorie</button>
                                </div>
                            </form>

                            <div class="table-responsive">
                                <table class="table table-sm table-hover align-middle mb-2">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Nom de Catégorie</th>
                                            <th style="width:180px;">Abréviation / Code Préfixe</th>
                                            <th class="text-center" style="width:130px;">Articles Liés</th>
                                            <th class="text-end" style="width:100px;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${categories.map(cat => {
                                            const prefix = prefixes[cat] || cat.substring(0, 3).toUpperCase();
                                            const linkedCount = articles.filter(a => (a.category || '').toLowerCase() === cat.toLowerCase()).length;
                                            return `
                                                <tr>
                                                    <td>
                                                        <strong style="color:var(--text);">${Utils.escapeHTML(cat)}</strong>
                                                    </td>
                                                    <td>
                                                        <div class="d-flex align-items-center gap-1">
                                                            <input type="text" class="form-control form-control-sm prefix-input" data-cat="${Utils.escapeHTML(cat)}" value="${Utils.escapeHTML(prefix)}" maxlength="5" style="width:90px;text-transform:uppercase;font-family:monospace;font-weight:700;">
                                                            <span class="badge bg-secondary" style="font-size:10px;">${Utils.escapeHTML(prefix)}</span>
                                                        </div>
                                                    </td>
                                                    <td class="text-center">
                                                        <span class="badge ${linkedCount > 0 ? 'bg-info' : 'bg-light text-dark'}">${linkedCount} art.</span>
                                                    </td>
                                                    <td class="text-end">
                                                        <button class="btn btn-xs btn-outline-danger" title="Supprimer la catégorie" onclick="Settings.removeCategory('${Utils.escapeHTML(cat)}')">
                                                            <i class="fas fa-trash-alt"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted"><i class="fas fa-info-circle me-1"></i> Modifiez les abréviations directement puis cliquez sur enregistrer.</small>
                                <button class="btn btn-sm btn-success" onclick="Settings.savePrefixes()"><i class="fas fa-save me-1"></i> Enregistrer Toutes les Abréviations</button>
                            </div>
                        </div>
                    </div>

                    <!-- Départements & Services -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-building text-primary me-2"></i> <strong>Départements & Services</strong></span>
                            <span class="badge bg-secondary">${departments.length}</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-2">Structure organisationnelle pour l'affectation du personnel et des bons de décharge.</p>
                            <form onsubmit="Settings.addDepartment(event)" class="input-group mb-3">
                                <input type="text" id="newDeptInput" class="form-control form-control-sm" placeholder="Nouveau département (ex: QHSE & Sécurité)..." required>
                                <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Ajouter</button>
                            </form>
                            <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                                <table class="table table-sm table-hover align-middle">
                                    <thead class="table-light"><tr><th>Département</th><th class="text-center">Personnel</th><th class="text-end">Action</th></tr></thead>
                                    <tbody>
                                        ${departments.map(d => {
                                            const pCount = beneficiaries.filter(b => b.department === d).length + users.filter(u => u.department === d).length;
                                            return `
                                                <tr>
                                                    <td><i class="fas fa-building text-muted me-2"></i><strong>${Utils.escapeHTML(d)}</strong></td>
                                                    <td class="text-center"><span class="badge bg-light text-dark">${pCount} pers.</span></td>
                                                    <td class="text-end">
                                                        <button class="btn btn-xs btn-outline-danger" onclick="Settings.removeDepartment('${Utils.escapeHTML(d)}')"><i class="fas fa-times"></i></button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Sections & Rayons de Stock -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-cubes-stacked text-primary me-2"></i> <strong>Rayons & Zones de Stock</strong></span>
                            <span class="badge bg-secondary">${sections.length}</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-2">Zones physiques de stockage dans le magasin central.</p>
                            <form onsubmit="Settings.addSection(event)" class="input-group mb-3">
                                <input type="text" id="newSectionInput" class="form-control form-control-sm" placeholder="Nouvelle zone / rayon (ex: Rayon D - Électricité)..." required>
                                <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Ajouter</button>
                            </form>
                            <div class="d-flex flex-wrap gap-2">
                                ${sections.map(sc => `
                                    <span class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2" style="font-size:12px;">
                                        <i class="fas fa-layer-group text-primary"></i> ${Utils.escapeHTML(sc.name)}
                                        <a href="javascript:void(0)" onclick="Settings.removeSection('${sc.id}')" class="text-danger fw-bold ms-1" title="Supprimer">×</a>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Familles de Matériel & Flotte -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-truck-monster text-primary me-2"></i> <strong>Familles de Véhicules & Matériel</strong></span>
                            <span class="badge bg-secondary">${families.length}</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-2">Classification du parc roulant et des engins.</p>
                            <form onsubmit="Settings.addMaterialFamily(event)" class="row g-2 mb-3">
                                <div class="col-7">
                                    <input type="text" id="newFamName" class="form-control form-control-sm" placeholder="Nom de famille (ex: Chariot élévateur)" required>
                                </div>
                                <div class="col-3">
                                    <select id="newFamIcon" class="form-select form-select-sm">
                                        <option value="fa-truck">Camion</option>
                                        <option value="fa-trailer">Remorque</option>
                                        <option value="fa-car">Voiture</option>
                                        <option value="fa-tractor">Tracteur/Engin</option>
                                        <option value="fa-oil-well">Citerne</option>
                                    </select>
                                </div>
                                <div class="col-2">
                                    <button type="submit" class="btn btn-sm btn-primary w-100"><i class="fas fa-plus"></i></button>
                                </div>
                            </form>
                            <div class="d-flex flex-wrap gap-2">
                                ${families.map(f => `
                                    <span class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2" style="font-size:12px;">
                                        <i class="fas ${f.icon || 'fa-truck'} text-primary"></i> ${Utils.escapeHTML(f.name)}
                                        <a href="javascript:void(0)" onclick="Settings.removeMaterialFamily('${f.id}')" class="text-danger fw-bold ms-1" title="Supprimer">×</a>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Cuves & Réservoirs de Carburant -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-oil-well text-primary me-2"></i> <strong>Cuves & Réservoirs de Carburant</strong></span>
                            <span class="badge bg-secondary">${(DB.getCiternes ? DB.getCiternes().length : 0)} cuves</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-2">Structure du parc de réservoirs de stockage (Gasoil, Essence, Huiles, Eau).</p>
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                ${(DB.getCiternes ? DB.getCiternes() : []).map(c => `
                                    <span class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2" style="font-size:12px;">
                                        <i class="fas fa-gas-pump text-warning"></i> <strong>${Utils.escapeHTML(c.name)}</strong> (${Utils.escapeHTML(c.type || 'Gasoil')} - ${Utils.formatNumber(c.capacity || 0)} L)
                                    </span>
                                `).join('')}
                                ${(DB.getCiternes ? DB.getCiternes() : []).length === 0 ? '<span class="text-muted small">Aucune cuve enregistrée.</span>' : ''}
                            </div>
                            <button class="btn btn-sm btn-outline-primary" onclick="App.navigate('citernes'); Citernes.setTab('tanks');">
                                <i class="fas fa-external-link-alt me-1"></i> Ouvrir la Base des Cuves
                            </button>
                        </div>
                    </div>

                    <!-- Unités de Mesure -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-ruler-combined text-primary me-2"></i> <strong>Unités de Mesure</strong></span>
                            <span class="badge bg-secondary">${units.length}</span>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-2">Unités disponibles lors de la saisie d'articles.</p>
                            <form onsubmit="Settings.addUnit(event)" class="input-group mb-3">
                                <input type="text" id="newUnitInput" class="form-control form-control-sm" placeholder="Nouvelle unité (ex: Carton)..." required>
                                <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Ajouter</button>
                            </form>
                            <div class="d-flex flex-wrap gap-1">
                                ${units.map(u => `
                                    <span class="badge bg-light text-dark border p-1 px-2" style="font-size:12px;">
                                        ${Utils.escapeHTML(u)}
                                        <a href="javascript:void(0)" onclick="Settings.removeUnit('${Utils.escapeHTML(u)}')" class="text-danger fw-bold ms-1">×</a>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentTab === 'models') {
            tabContent = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
                    <!-- Modèles CSV à télécharger -->
                    <div class="card" style="grid-column: 1 / -1;">
                        <div class="card-header">
                            <i class="fas fa-file-excel text-success me-2"></i> <strong>Gabarits Officiels d'Importation (CSV / Excel)</strong>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-3">
                                Téléchargez les modèles standard pré-remplis avec exemples réels de l'entreprise. Vous pouvez les ouvrir dans Microsoft Excel ou LibreOffice Calc, compléter vos données, et les réimporter en 1 clic.
                            </p>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="p-3 border rounded h-100 d-flex flex-column justify-content-between" style="background:var(--surface-alt);">
                                        <div>
                                            <div class="d-flex align-items-center gap-2 mb-2">
                                                <i class="fas fa-cubes text-primary fs-4"></i>
                                                <h6 class="mb-0 fw-bold">Modèle Articles de Stock</h6>
                                            </div>
                                            <p class="text-muted small mb-2">Colonnes : <code>Code</code>, <code>Designation</code>, <code>Categorie</code>, <code>Quantite</code>, <code>Unite</code>, <code>Emplacement</code>, <code>Seuil_Alerte</code>, <code>Prix_Unitaire</code>.</p>
                                        </div>
                                        <button class="btn btn-sm btn-outline-primary w-100 mt-2" onclick="Settings.downloadModel('articles')">
                                            <i class="fas fa-download me-1"></i> Télécharger Gabarit Articles
                                        </button>
                                    </div>
                                </div>

                                <div class="col-md-4">
                                    <div class="p-3 border rounded h-100 d-flex flex-column justify-content-between" style="background:var(--surface-alt);">
                                        <div>
                                            <div class="d-flex align-items-center gap-2 mb-2">
                                                <i class="fas fa-truck text-warning fs-4"></i>
                                                <h6 class="mb-0 fw-bold">Modèle Flotte & Véhicules</h6>
                                            </div>
                                            <p class="text-muted small mb-2">Colonnes : <code>Immatriculation</code>, <code>Code</code>, <code>Marque</code>, <code>Modele</code>, <code>Famille</code>, <code>Annee</code>, <code>Kilometrage</code>, <code>Statut</code>.</p>
                                        </div>
                                        <button class="btn btn-sm btn-outline-warning w-100 mt-2" onclick="Settings.downloadModel('fleet')">
                                            <i class="fas fa-download me-1"></i> Télécharger Gabarit Flotte
                                        </button>
                                    </div>
                                </div>

                                <div class="col-md-4">
                                    <div class="p-3 border rounded h-100 d-flex flex-column justify-content-between" style="background:var(--surface-alt);">
                                        <div>
                                            <div class="d-flex align-items-center gap-2 mb-2">
                                                <i class="fas fa-users text-info fs-4"></i>
                                                <h6 class="mb-0 fw-bold">Modèle Personnel & Staff</h6>
                                            </div>
                                            <p class="text-muted small mb-2">Colonnes : <code>Matricule</code>, <code>Nom</code>, <code>Prenom</code>, <code>Departement</code>, <code>Poste</code>, <code>Telephone</code>.</p>
                                        </div>
                                        <button class="btn btn-sm btn-outline-info w-100 mt-2" onclick="Settings.downloadModel('beneficiaries')">
                                            <i class="fas fa-download me-1"></i> Télécharger Gabarit Personnel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Importateur Massif -->
                    <div class="card" style="grid-column: 1 / -1;">
                        <div class="card-header">
                            <i class="fas fa-cloud-upload-alt text-primary me-2"></i> <strong>Importation Massive de Fichiers CSV</strong>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small">1. Type de données à importer *</label>
                                    <select id="csvImportType" class="form-select">
                                        <option value="articles">Articles & Pièces de Stock</option>
                                        <option value="fleet">Véhicules & Matériel du Parc</option>
                                        <option value="beneficiaries">Personnel & Bénéficiaires</option>
                                    </select>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label fw-bold small">2. Choisir le fichier Excel (.xlsx) ou CSV *</label>
                                    <input type="file" id="csvFileInput" class="form-control" accept=".xlsx, .xls, .csv, .txt">
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary w-100" onclick="Settings.importCSV()">
                                        <i class="fas fa-upload me-1"></i> Lancer l'Importation
                                    </button>
                                </div>
                            </div>
                            <div id="csvImportLog" class="mt-3 p-3 border rounded" style="display:none;background:var(--surface-alt);max-height:200px;overflow-y:auto;font-family:monospace;font-size:12px;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentTab === 'company') {
            tabContent = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
                    <!-- Entreprise -->
                    <div class="card">
                        <div class="card-header"><i class="fas fa-building text-primary me-2"></i> <strong>Identité de l'Entreprise</strong></div>
                        <div class="card-body">
                            <form onsubmit="Settings.saveCompany(event)">
                                <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                    <div class="form-group"><label class="small fw-bold">Nom Entreprise</label><input type="text" name="companyName" class="form-control form-control-sm" value="${Utils.escapeHTML(s.companyName || 'SPA DOUROUB ELDJAZAIR')}"></div>
                                    <div class="form-group"><label class="small fw-bold">Capital Social</label><input type="text" name="capital" class="form-control form-control-sm" value="${Utils.escapeHTML(s.capital || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">NIF</label><input type="text" name="nif" class="form-control form-control-sm" value="${Utils.escapeHTML(s.nif || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">RC</label><input type="text" name="rc" class="form-control form-control-sm" value="${Utils.escapeHTML(s.rc || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">NIS</label><input type="text" name="nis" class="form-control form-control-sm" value="${Utils.escapeHTML(s.nis || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">Article d'Imposition</label><input type="text" name="art" class="form-control form-control-sm" value="${Utils.escapeHTML(s.art || '')}"></div>
                                </div>
                                <div class="form-group mt-2"><label class="small fw-bold">Adresse Complète</label><input type="text" name="address" class="form-control form-control-sm" value="${Utils.escapeHTML(s.address || '')}"></div>
                                <div class="form-row mt-2" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem;">
                                    <div class="form-group"><label class="small fw-bold">Téléphone</label><input type="text" name="phone" class="form-control form-control-sm" value="${Utils.escapeHTML(s.phone || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">Fax</label><input type="text" name="fax" class="form-control form-control-sm" value="${Utils.escapeHTML(s.fax || '')}"></div>
                                    <div class="form-group"><label class="small fw-bold">Email</label><input type="email" name="email" class="form-control form-control-sm" value="${Utils.escapeHTML(s.email || '')}"></div>
                                </div>
                                <div class="text-end mt-3"><button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-save me-1"></i> Sauvegarder Coordonnées</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Thème, Apparence & Logos -->
                    <div class="card">
                        <div class="card-header"><i class="fas fa-palette text-primary me-2"></i> <strong>Logos & Apparence Visuelle</strong></div>
                        <div class="card-body">
                            <form onsubmit="Settings.saveTheme(event)">
                                <div class="form-group mb-2">
                                    <label class="small fw-bold">Couleur d'accentuation</label>
                                    <div class="d-flex gap-2 align-items-center">
                                        <input type="color" name="themeColor" value="${s.themeColor || '#1B2A4A'}" style="width:50px;height:36px;cursor:pointer;border-radius:4px;border:1px solid var(--border);padding:2px;">
                                        <span class="text-muted small">Personnalise la couleur principale de l'interface</span>
                                    </div>
                                </div>
                                <div class="form-group mb-2"><label class="small fw-bold">Mode d'affichage</label>
                                    <select name="themeMode" class="form-select form-select-sm">
                                        <option value="light" ${s.themeMode==='light'?'selected':''}>Mode Clair (Professionnel Sage)</option>
                                        <option value="dark" ${s.themeMode==='dark'?'selected':''}>Mode Sombre (Dark Blue)</option>
                                        <option value="black" ${s.themeMode==='black'?'selected':''}>Mode Noir Intense (OLED)</option>
                                    </select>
                                </div>
                                <div class="form-group mb-2">
                                    <label class="small fw-bold">Logo Officiel SPA DOUROUB (En-tête & Documents)</label>
                                    <input type="file" class="form-control form-control-sm mb-1" accept="image/png, image/jpeg, image/svg+xml" onchange="Settings.handleLogoUpload(event, 'rightLogo')">
                                    <input type="text" name="rightLogo" id="rightLogo" class="form-control form-control-sm" value="${Utils.escapeHTML(s.rightLogo || s.leftLogo || '')}" placeholder="URL ou base64 de l'image...">
                                </div>
                                <div class="p-2 mb-2 border rounded d-flex align-items-center gap-3" style="background:var(--surface-alt);">
                                    <div id="settingsLogoPreview">
                                        ${(s.rightLogo || s.leftLogo) ? `<img loading="lazy" src="${s.rightLogo || s.leftLogo}" style="max-height:40px;border-radius:4px;" alt="Aperçu Logo">` : '<span class="badge bg-secondary">Aucun logo personnalisé</span>'}
                                    </div>
                                    <div class="small text-muted">
                                        Affiché sur le haut gauche de l'écran, la page de connexion, et les Bons de Décharge PDF imprimés.
                                    </div>
                                </div>
                                <div class="text-end mt-3"><button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-save me-1"></i> Appliquer Thème & Logos</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentTab === 'maintenance') {
            tabContent = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
                    <!-- Backup & Restauration -->
                    <div class="card">
                        <div class="card-header"><i class="fas fa-database text-primary me-2"></i> <strong>Sauvegarde & Restauration Complète</strong></div>
                        <div class="card-body">
                            <p class="text-muted small">Exportez l'intégralité de la base de données (articles, décharges, flotte, carburant, audit) dans un fichier JSON sécurisé.</p>
                            <button class="btn btn-outline-primary mb-2 w-100" onclick="Settings.exportData()">
                                <i class="fas fa-download me-1"></i> Exporter la Sauvegarde Complète (JSON)
                            </button>
                            <button class="btn btn-success mb-3 w-100" onclick="Settings.exportAllToExcel()">
                                <i class="fas fa-file-excel me-1"></i> Exporter Toute la Base en Excel (.xlsx Multi-Feuilles)
                            </button>
                            <hr>
                            <p class="text-muted small">Restaurer des données à partir d'un fichier de sauvegarde JSON antérieur.</p>
                            <label class="btn btn-outline-success w-100 mb-0">
                                <i class="fas fa-upload me-1"></i> Importer un Fichier de Sauvegarde JSON
                                <input type="file" accept=".json" style="display:none;" onchange="Settings.importData(event)">
                            </label>
                        </div>
                    </div>

                    <!-- Auto-Backup MongoDB (00:00) -->
                    <div class="card">
                        <div class="card-header"><i class="fas fa-clock text-success me-2"></i> <strong>Sauvegarde Automatique MongoDB</strong></div>
                        <div class="card-body">
                            <p class="text-muted small">Le système effectue une sauvegarde automatique de la base MongoDB chaque jour à <strong>00:00 (heure Algérie)</strong>.</p>
                            <div class="p-2 mb-3 rounded" style="background:var(--surface-alt);border:1px solid var(--border);">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span>Prochaine sauvegarde :</span>
                                    <strong class="text-success">00:00 (Africa/Algiers)</strong>
                                </div>
                                <div class="d-flex justify-content-between small">
                                    <span>Sauvegardes récentes :</span>
                                    <strong class="text-primary" id="backupCount">Chargement...</strong>
                                </div>
                            </div>
                            <button class="btn btn-outline-success mb-2 w-100" onclick="Settings.triggerManualBackup()">
                                <i class="fas fa-play me-1"></i> Lancer une Sauvegarde Maintenant
                            </button>
                            <button class="btn btn-outline-primary w-100" onclick="Settings.showBackupHistory()">
                                <i class="fas fa-history me-1"></i> Voir l'Historique des Sauvegardes
                            </button>
                            <div id="backupHistoryList" style="display:none;margin-top:10px;max-height:200px;overflow-y:auto;"></div>
                        </div>
                    </div>

                    <!-- Intégrité & Audit -->
                    <div class="card">
                        <div class="card-header"><i class="fas fa-shield-halved text-success me-2"></i> <strong>Journal d'Audit & Sécurité Cryptographique</strong></div>
                        <div class="card-body d-flex flex-column justify-content-between">
                            <div>
                                <p class="text-muted small">
                                    Toutes les actions sensibles (ajustements manuels de stock, rectifications de décharge, imports CSV) sont scellées cryptographiquement dans une chaîne d'audit inviolable.
                                </p>
                                <div class="p-2 mb-3 rounded" style="background:var(--surface-alt);border:1px solid var(--border);">
                                    <div class="d-flex justify-content-between small">
                                        <span>Entrées scellées :</span>
                                        <strong class="text-primary">${(typeof DB !== 'undefined' && DB.getAuditLog) ? DB.getAuditLog().length : 0} événements</strong>
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-outline-secondary w-100" onclick="App.loadModule('history', 'audit')">
                                <i class="fas fa-external-link-alt me-1"></i> Consulter le Journal d'Audit Détaillé
                            </button>
                        </div>
                    </div>

                    <!-- Réinitialisation Démo -->
                    <div class="card" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.4);">
                        <div class="card-header bg-danger text-white">
                            <i class="fas fa-exclamation-triangle me-2"></i> <strong>Zone de Danger — Réinitialisation Système</strong>
                        </div>
                        <div class="card-body">
                            <p class="text-danger small mb-3">
                                <strong>Attention :</strong> La réinitialisation efface toutes les décharges, réceptions, ajustements et historiques saisis. Les données de base par défaut seront rechargées.
                            </p>
                            <div class="d-flex justify-content-end gap-2 flex-wrap">
                                <button class="btn btn-warning text-dark fw-bold" onclick="Settings.resetToOfficialExcelData()">
                                    <i class="fas fa-database me-1"></i> Réinitialiser à l'État Vierge Initial (Zéro Donnée)
                                </button>
                                <button class="btn btn-danger" onclick="Settings.resetData()">
                                    <i class="fas fa-trash-alt me-1"></i> Réinitialiser Complètement les Données
                                </button>
                                <button class="btn btn-danger fw-bold" onclick="Settings.purgeServerStock()" style="background:#7f1d1d;border-color:#7f1d1d;">
                                    <i class="fas fa-server me-1"></i> Vider Stock Serveur (MongoDB)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentTab === 'users') {
            tabContent = (typeof Users !== 'undefined' && Users.render) ? Users.render() : '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-1"></i> Module Utilisateurs non disponible.</div>';
        } else {
            // Default fallback to database if tab is unknown
            tabContent = (typeof Users !== 'undefined' && currentTab.includes('user')) ? Users.render() : `
                <div class="card p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="mb-0 text-muted"><i class="fas fa-info-circle me-1"></i> Onglet <strong>${Utils.escapeHTML(currentTab)}</strong></p>
                        <button class="btn btn-sm btn-primary" onclick="Settings.switchTab('database')">Retour à l'arborescence</button>
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;">
                        <i class="fas fa-cog text-primary me-2"></i> Paramètres & Configuration Système
                    </h2>
                    <p class="text-muted mb-0" style="font-size:13px;">
                        Arborescence de données, catégories & abréviations, modèles CSV, identité SPA DOUROUB et maintenance
                    </p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-success" onclick="Settings.exportAllToExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Base Excel (.xlsx)</button>
                    <button class="btn btn-outline-primary" onclick="Settings.exportData()"><i class="fas fa-download me-1"></i> Sauvegarder JSON</button>
                    <button class="btn btn-outline-warning text-dark fw-bold" onclick="Settings.resetToOfficialExcelData()"><i class="fas fa-database me-1"></i> Réinitialiser Base Vierge</button>
                </div>
            </div>

            <!-- Subnav Tabs -->
            <div class="d-flex gap-2 border-bottom mb-4 overflow-auto pb-2">
                ${navTabs.map(t => `
                    <button class="btn btn-sm ${currentTab === t.id ? 'btn-primary' : 'btn-outline-secondary'}" onclick="Settings.switchTab('${t.id}')">
                        <i class="fas ${t.icon} me-1"></i> ${t.label}
                    </button>
                `).join('')}
            </div>

            ${tabContent}
        `

        // Auto-load backup count when maintenance tab is active
        if (currentTab === 'maintenance' && typeof Settings !== 'undefined' && Settings.loadBackupCount) {
            setTimeout(function() { Settings.loadBackupCount(); }, 300);
        }

        return html;
    },

    addCategory: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nameInput = document.getElementById('newCatName');
        const prefixInput = document.getElementById('newCatPrefix');
        const name = nameInput ? nameInput.value.trim() : '';
        const prefix = prefixInput ? prefixInput.value.trim().toUpperCase() : '';

        if (!name) {
            Utils.showNotification('Veuillez entrer un nom de catégorie.', 'warning');
            return;
        }
        if (!prefix || prefix.length < 2) {
            Utils.showNotification('Veuillez spécifier une abréviation d\'au moins 2 lettres.', 'warning');
            return;
        }

        const s = DB.getSettings();
        const cats = s.articleCategories || [];
        const prefixes = s.categoryPrefixes || {};

        if (cats.some(c => c.toLowerCase() === name.toLowerCase())) {
            Utils.showNotification('Cette catégorie existe déjà.', 'warning');
            return;
        }

        cats.push(name);
        prefixes[name] = prefix;

        DB.updateSettings({
            articleCategories: cats,
            categoryPrefixes: prefixes
        });

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_ADD_CATEGORY',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Ajout catégorie: ${name} (Abréviation: ${prefix})`
            });
        }

        Utils.showNotification(`Catégorie "${name}" (${prefix}) ajoutée avec succès.`, 'success');
        this.switchTab('database');
    },

    removeCategory: function(catName) {
        if (!confirm(`Supprimer la catégorie "${catName}" ?`)) return;

        const s = DB.getSettings();
        const cats = (s.articleCategories || []).filter(c => c !== catName);
        const prefixes = { ...(s.categoryPrefixes || {}) };
        delete prefixes[catName];

        DB.updateSettings({
            articleCategories: cats,
            categoryPrefixes: prefixes
        });

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_REMOVE_CATEGORY',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Suppression catégorie: ${catName}`
            });
        }

        Utils.showNotification(`Catégorie "${catName}" supprimée.`, 'info');
        this.switchTab('database');
    },

    savePrefixes: function() {
        const inputs = document.querySelectorAll('.prefix-input');
        const s = DB.getSettings();
        const prefixes = { ...(s.categoryPrefixes || {}) };

        inputs.forEach(inp => {
            const cat = inp.dataset.cat;
            const val = inp.value.trim().toUpperCase();
            if (cat && val) {
                prefixes[cat] = val;
            }
        });

        DB.updateSettings({ categoryPrefixes: prefixes });

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_UPDATE_PREFIXES',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Mise à jour des abréviations de catégories`
            });
        }

        Utils.showNotification('Toutes les abréviations ont été enregistrées avec succès.', 'success');
        this.switchTab('database');
    },

    addDepartment: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('newDeptInput');
        const name = input ? input.value.trim() : '';

        if (!name) {
            Utils.showNotification('Entrez le nom du département.', 'warning');
            return;
        }

        const s = DB.getSettings();
        const depts = s.departments || [];
        if (depts.some(d => d.toLowerCase() === name.toLowerCase())) {
            Utils.showNotification('Ce département existe déjà.', 'warning');
            return;
        }

        depts.push(name);
        DB.updateSettings({ departments: depts });

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_ADD_DEPARTMENT',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Ajout département: ${name}`
            });
        }

        Utils.showNotification(`Département "${name}" ajouté.`, 'success');
        this.switchTab('database');
    },

    removeDepartment: function(name) {
        if (!confirm(`Supprimer le département "${name}" ?`)) return;

        const s = DB.getSettings();
        const depts = (s.departments || []).filter(d => d !== name);
        DB.updateSettings({ departments: depts });

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_REMOVE_DEPARTMENT',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Suppression département: ${name}`
            });
        }

        Utils.showNotification(`Département "${name}" supprimé.`, 'info');
        this.switchTab('database');
    },

    addSection: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('newSectionInput');
        const name = input ? input.value.trim() : '';
        if (!name) return;

        const s = DB.getSettings();
        const sections = s.stockSections || [];
        sections.push({ id: 'sec_' + Date.now(), name: name });
        DB.updateSettings({ stockSections: sections });

        Utils.showNotification(`Rayon "${name}" ajouté.`, 'success');
        this.switchTab('database');
    },

    removeSection: function(id) {
        const s = DB.getSettings();
        const sections = (s.stockSections || []).filter(sc => sc.id !== id);
        DB.updateSettings({ stockSections: sections });
        Utils.showNotification('Rayon supprimé.', 'info');
        this.switchTab('database');
    },

    addMaterialFamily: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nameInput = document.getElementById('newFamName');
        const iconSelect = document.getElementById('newFamIcon');
        const name = nameInput ? nameInput.value.trim() : '';
        const icon = iconSelect ? iconSelect.value : 'fa-truck';
        if (!name) return;

        const s = DB.getSettings();
        const families = s.materialFamilies || [];
        families.push({ id: 'fam_' + Date.now(), name: name, icon: icon });
        DB.updateSettings({ materialFamilies: families });

        Utils.showNotification(`Famille "${name}" ajoutée.`, 'success');
        this.switchTab('database');
    },

    removeMaterialFamily: function(id) {
        const s = DB.getSettings();
        const families = (s.materialFamilies || []).filter(f => f.id !== id);
        DB.updateSettings({ materialFamilies: families });
        Utils.showNotification('Famille supprimée.', 'info');
        this.switchTab('database');
    },

    addUnit: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('newUnitInput');
        const name = input ? input.value.trim() : '';
        if (!name) return;

        const s = DB.getSettings();
        const units = s.units || [];
        if (!units.includes(name)) {
            units.push(name);
            DB.updateSettings({ units: units });
            Utils.showNotification(`Unité "${name}" ajoutée.`, 'success');
            this.switchTab('database');
        }
    },

    removeUnit: function(name) {
        const s = DB.getSettings();
        const units = (s.units || []).filter(u => u !== name);
        DB.updateSettings({ units: units });
        Utils.showNotification('Unité supprimée.', 'info');
        this.switchTab('database');
    },

    downloadModel: function(type) {
        if (typeof XLSX !== 'undefined') {
            if (type === 'beneficiaries') {
                const wb = XLSX.utils.book_new();
                const wsData = [
                    ['Matricule', 'Nom', 'Prenom', 'Departement', 'Poste', 'Telephone', 'Email', 'Role_Systeme', 'Statut'],
                    ['EMP-001', 'IGHIT', 'Djaafar', 'Direction Générale', 'Directeur Général', '0550 00 00 01', 'd.ighit@douroub.dz', 'Administrateur', 'Actif'],
                    ['EMP-002', 'ACHOURI', 'Mohamed Hamza', 'Direction Générale', 'Chef Département', '0550 00 00 02', 'h.achouri@douroub.dz', 'Administrateur', 'Actif'],
                    ['EMP-003', 'MERDACI', 'Abdeldjalil', 'Transport', 'Chef Service Exploitation', '0550 00 00 03', 'a.merdaci@douroub.dz', 'Magasinier', 'Actif'],
                    ['EMP-004', 'LEKCIR', 'Yassine', 'Approvisionnement', 'Chef Section Gestion des Stocks', '0550 00 00 04', 'y.lekcir@douroub.dz', 'Magasinier', 'Actif'],
                    ['EMP-005', 'TOUNSI', 'Ali', 'Approvisionnement', 'Chef Section Méthode', '0550 00 00 05', 'a.tounsi@douroub.dz', 'Utilisateur', 'Actif']
                ];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{wch:14},{wch:18},{wch:18},{wch:22},{wch:28},{wch:16},{wch:24},{wch:18},{wch:10}];
                XLSX.utils.book_append_sheet(wb, ws, "Personnel");

                const deptsData = [
                    ['Code', 'Departement', 'Effectif_Actuel', 'Responsable_Principal'],
                    ['DG', 'Direction Générale', 2, 'IGHIT DJAAFAR'],
                    ['APPRO', 'Approvisionnement', 2, 'LEKCIR YASSINE'],
                    ['TRP', 'Transport', 1, 'MERDACI ABDELDJALIL']
                ];
                const wsDept = XLSX.utils.aoa_to_sheet(deptsData);
                wsDept['!cols'] = [{wch:10},{wch:24},{wch:16},{wch:24}];
                XLSX.utils.book_append_sheet(wb, wsDept, "Departements");

                XLSX.writeFile(wb, "modele_import_personnel.xlsx");
                Utils.showNotification('Modèle Excel "modele_import_personnel.xlsx" téléchargé.', 'success');
                return;
            }
            if (type === 'articles') {
                const wb = XLSX.utils.book_new();
                const arts = (DB.getArticles && DB.getArticles().length > 0) ? DB.getArticles() : [];
                const wsData = [
                    ['Code', 'Designation', 'Categorie', 'Quantite', 'Unite', 'Emplacement', 'Seuil_Alerte', 'Prix_Unitaire', 'Conditionnement']
                ];
                arts.forEach(a => {
                    wsData.push([a.code, a.designation, a.category || 'Bureautique', a.quantity, a.unit, a.section || 'Section Unique', a.minThreshold, a.price || 0, a.notes || '']);
                });
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{wch:12},{wch:35},{wch:16},{wch:10},{wch:10},{wch:16},{wch:14},{wch:14},{wch:20}];
                XLSX.utils.book_append_sheet(wb, ws, "Articles");
                XLSX.writeFile(wb, "modele_import_articles.xlsx");
                Utils.showNotification('Modèle Excel "modele_import_articles.xlsx" téléchargé.', 'success');
                return;
            }
            if (type === 'fleet') {
                const wb = XLSX.utils.book_new();
                const fleet = (DB.getFleet && DB.getFleet().length > 0) ? DB.getFleet() : [];
                const wsData = [
                    ['Immatriculation', 'Code', 'Marque', 'Modele', 'Famille', 'Annee', 'Kilometrage', 'Statut', 'Numero_Serie']
                ];
                fleet.forEach(f => {
                    wsData.push([f.immatriculation, f.code, f.brand, f.model, f.family, f.year, f.kilometrage, f.status, f.serialNumber || '']);
                });
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{wch:18},{wch:10},{wch:16},{wch:20},{wch:14},{wch:8},{wch:14},{wch:10},{wch:24}];
                XLSX.utils.book_append_sheet(wb, ws, "Equipements_Flotte");
                XLSX.writeFile(wb, "modele_import_flotte.xlsx");
                Utils.showNotification('Modèle Excel "modele_import_flotte.xlsx" téléchargé.', 'success');
                return;
            }
        }

        let filename = '';
        let csvContent = '';

        if (type === 'articles') {
            filename = 'modele_import_articles.csv';
            csvContent = "Code,Designation,Categorie,Quantite,Unite,Emplacement,Seuil_Alerte,Prix_Unitaire\r\n" +
                "BUR-001,Stylo noir,Bureautique,15,Pièce,Section Unique,5,0\r\n" +
                "BUR-002,Stylo bleu,Bureautique,1,Pièce,Section Unique,1,0\r\n" +
                "BUR-011,Boîte de trombones – petite,Bureautique,24,Boîte,Section Unique,5,0\r\n" +
                "BUR-016,Agrafes,Bureautique,103,Boîte,Section Unique,5,0\r\n";
        } else if (type === 'fleet') {
            filename = 'modele_import_flotte.csv';
            csvContent = "Immatriculation,Code,Marque,Modele,Famille,Annee,Kilometrage,Statut\r\n" +
                "01234-116-16,TR-01,Renault Trucks,T480 4x2,Camion,2022,145000,Actif\r\n" +
                "05678-116-16,TR-02,Mercedes-Benz,Actros 1845,Camion,2021,210000,Actif\r\n" +
                "09101-116-16,CIT-01,Magyar,Citerne Hydrocarbure 36000L,Citerne,2020,180000,Actif\r\n" +
                "11213-116-16,REM-01,Krone,Semi-Remorque Plateau,Remorque,2021,95000,Actif\r\n";
        } else if (type === 'beneficiaries') {
            filename = 'modele_import_personnel.csv';
            csvContent = "Matricule,Nom,Prenom,Departement,Poste,Telephone\r\n" +
                "EMP-001,IGHIT,Djaafar,Direction Générale,Directeur Général,0550000001\r\n" +
                "EMP-002,ACHOURI,Mohamed Hamza,Direction Générale,Chef Département,0550000002\r\n" +
                "EMP-003,MERDACI,Abdeldjalil,Transport,Chef Service Exploitation,0550000003\r\n" +
                "EMP-004,LEKCIR,Yassine,Approvisionnement,Chef Section Gestion des Stocks,0550000004\r\n" +
                "EMP-005,TOUNSI,Ali,Approvisionnement,Chef Section Méthode,0550000005\r\n";
        }

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Utils.showNotification('Modèle "' + filename + '" téléchargé.', 'success');
    },

    importCSV: function() {
        const fileInput = document.getElementById('csvFileInput');
        const typeSelect = document.getElementById('csvImportType');
        const logBox = document.getElementById('csvImportLog');

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            Utils.showNotification('Veuillez sélectionner un fichier (CSV ou Excel .xlsx) à importer.', 'warning');
            return;
        }

        const file = fileInput.files[0];
        const type = typeSelect ? typeSelect.value : 'articles';
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        const processRows = (rawRows) => {
            let importedCount = 0;
            let logMessages = [];
            const author = (Auth.getCurrentUser() || {}).username || 'Admin';

            if (type === 'articles') {
                rawRows.forEach((row, i) => {
                    const keys = Object.keys(row);
                    const getVal = (...names) => {
                        for (let n of names) {
                            const foundKey = keys.find(k => k.trim().toLowerCase() === n.toLowerCase());
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                                return String(row[foundKey]).trim();
                            }
                        }
                        return '';
                    };

                    const code = getVal('code', 'code article', 'ref', 'référence') || ('ART-' + Date.now().toString().slice(-4) + '-' + i);
                    const designation = getVal('designation', 'désignation', 'nom', 'article', 'description') || ('Article ' + (i + 1));
                    const category = getVal('categorie', 'catégorie', 'category', 'famille') || 'Fournitures bureau';
                    const quantity = parseFloat(getVal('quantite', 'quantité', 'stock', 'stock actuel', 'qty', 'quantité en stock') || 0) || 0;
                    const unit = getVal('unite', 'unité', 'unit') || 'Pièce';
                    const location = getVal('emplacement', 'location', 'rayon') || 'Magasin Central';
                    const minThreshold = parseFloat(getVal('seuil_alerte', 'seuil', 'alerte', 'minthreshold') || 5) || 5;
                    const price = parseFloat(getVal('prix_unitaire', 'prix', 'price', 'pu') || 0) || 0;

                    if (!designation && !code) return;

                    const existing = DB.getArticles().find(a => (a.code && a.code.toUpperCase() === code.toUpperCase()) || (a.name && a.name.toLowerCase() === designation.toLowerCase()));

                    if (existing) {
                        existing.quantity = (Number(existing.quantity) || 0) + quantity;
                        if (price > 0) existing.price = price;
                        DB.update('articles', existing.id, existing);
                        logMessages.push(`Mise à jour stock: ${code} - ${designation} (+${quantity} ${unit})`);
                    } else {
                        const newArt = {
                            id: 'art_' + Date.now() + '_' + i,
                            code: code,
                            name: designation,
                            category: category,
                            quantity: quantity,
                            unit: unit,
                            location: location,
                            minThreshold: minThreshold,
                            price: price,
                            createdAt: new Date().toISOString()
                        };
                        DB.insert('articles', newArt);
                        logMessages.push(`Ajout nouvel article: ${code} - ${designation} (Stock: ${quantity})`);
                    }
                    importedCount++;
                });
            } else if (type === 'fleet') {
                rawRows.forEach((row, i) => {
                    const keys = Object.keys(row);
                    const getVal = (...names) => {
                        for (let n of names) {
                            const foundKey = keys.find(k => k.trim().toLowerCase() === n.toLowerCase());
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                                return String(row[foundKey]).trim();
                            }
                        }
                        return '';
                    };

                    const immat = getVal('immatriculation', 'immat', 'matricule', 'numéro immatriculation') || ('MAT-' + (i + 1));
                    const code = getVal('code', 'num', 'code matériel', 'tr') || ('EQ-' + (i + 1));
                    const brand = getVal('marque', 'brand') || '';
                    const model = getVal('modele', 'modèle', 'model') || '';
                    let name = getVal('nom', 'désignation', 'véhicule', 'materiel', 'matériel') || '';
                    if (!name && (brand || model)) name = `${brand} ${model}`.trim();
                    if (!name) name = `Équipement ${immat}`;

                    let family = getVal('famille', 'family', 'type', 'genre') || 'Autre';
                    if (family.toLowerCase().includes('trac') || name.toLowerCase().includes('trac')) family = 'Tracteur';
                    else if (family.toLowerCase().includes('rem') || name.toLowerCase().includes('rem')) family = 'Remorque';
                    else if (family.toLowerCase().includes('voit') || name.toLowerCase().includes('fiat') || name.toLowerCase().includes('vl')) family = 'Voiture';

                    const year = parseInt(getVal('annee', 'année', 'year') || new Date().getFullYear(), 10) || new Date().getFullYear();
                    const km = parseFloat(getVal('kilometrage', 'kilométrage', 'km') || 0) || 0;
                    const status = getVal('statut', 'status') || 'Actif';
                    const serial = getVal('n_chassis', 'chassis', 'num_chassis', 'n_serie', 'serie', 'n° de serie') || '';

                    if (!immat && !code) return;

                    const existing = (DB.getFleet ? DB.getFleet() : []).find(f => (f.immatriculation && f.immatriculation.toLowerCase() === immat.toLowerCase()) || (f.code && f.code.toLowerCase() === code.toLowerCase()));

                    if (existing) {
                        existing.kilometrage = km || existing.kilometrage;
                        existing.status = status;
                        if (serial) existing.serial = serial;
                        DB.update('materials', existing.id, existing);
                        logMessages.push(`Mise à jour véhicule: ${immat} (${name})`);
                    } else {
                        const newVeh = {
                            id: 'mat_' + Date.now() + '_' + i,
                            code: code,
                            immatriculation: immat,
                            name: name,
                            family: family,
                            year: year,
                            kilometrage: km,
                            status: status,
                            serial: serial,
                            createdAt: new Date().toISOString()
                        };
                        DB.insert('materials', newVeh);
                        logMessages.push(`Ajout véhicule: ${immat} - ${name} (${family})`);
                    }
                    importedCount++;
                });
            } else if (type === 'beneficiaries') {
                rawRows.forEach((row, i) => {
                    const keys = Object.keys(row);
                    const getVal = (...names) => {
                        for (let n of names) {
                            const foundKey = keys.find(k => k.trim().toLowerCase() === n.toLowerCase());
                            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                                return String(row[foundKey]).trim();
                            }
                        }
                        return '';
                    };

                    const nom = getVal('nom', 'nom complet', 'nom & prénom', 'name') || '';
                    const prenom = getVal('prenom', 'prénom') || '';
                    const matricule = getVal('matricule', 'id', 'code personnel', 'code') || ('EMP-' + String(i + 1).padStart(3, '0'));
                    
                    if (!nom && !prenom && !matricule) return;
                    if (nom.toLowerCase().includes('champ') || nom.toLowerCase().includes('guide') || nom.toLowerCase().includes('matricule')) return;

                    const fullName = (nom && prenom) ? `${nom} ${prenom}`.trim() : (nom || prenom || matricule);
                    if (!fullName || fullName.length < 2) return;

                    const dept = getVal('departement', 'département', 'service', 'direction') || 'Direction Générale';
                    const qualite = getVal('poste', 'qualite', 'qualité', 'fonction', 'role') || 'Collaborateur';
                    const tel = getVal('telephone', 'téléphone', 'phone', 'tel') || '';

                    if (!DB.data.beneficiaries) DB.data.beneficiaries = [];
                    const benObj = {
                        id: 'ben_' + Date.now() + '_' + i,
                        matricule: matricule,
                        name: fullName,
                        department: dept,
                        qualite: qualite,
                        phone: tel
                    };
                    const existingIdx = DB.data.beneficiaries.findIndex(b => b.name.toLowerCase() === fullName.toLowerCase() || (matricule && b.matricule === matricule));
                    if (existingIdx > -1) {
                        DB.data.beneficiaries[existingIdx] = { ...DB.data.beneficiaries[existingIdx], ...benObj };
                        logMessages.push(`Mise à jour personnel: ${fullName} (${dept})`);
                    } else {
                        DB.data.beneficiaries.push(benObj);
                        logMessages.push(`Ajout personnel: ${fullName} (${dept})`);
                    }

                    if (!DB.data.beneficiaryNames) DB.data.beneficiaryNames = [];
                    const existsName = DB.data.beneficiaryNames.some(b => {
                        const bName = typeof b === 'object' ? b.name : b;
                        return bName.toLowerCase() === fullName.toLowerCase();
                    });
                    if (!existsName) {
                        DB.data.beneficiaryNames.push({ name: fullName, department: dept, qualite: qualite });
                    }
                    DB.save();
                    importedCount++;
                });
            }

            if (logBox) {
                logBox.style.display = 'block';
                logBox.innerHTML = `
                    <div class="fw-bold text-success mb-2">✅ ${importedCount} enregistrements traités avec succès !</div>
                    ${logMessages.slice(0, 30).map(m => `<div>• ${Utils.escapeHTML(m)}</div>`).join('')}
                    ${logMessages.length > 30 ? `<div class="text-muted mt-1"><em>... et ${logMessages.length - 30} autres lignes.</em></div>` : ''}
                `;
            }

            Utils.showNotification(`Importation terminée : ${importedCount} éléments traités avec succès.`, 'success');
            fileInput.value = '';
            setTimeout(() => {
                if (typeof App !== 'undefined' && App.currentModule) {
                    if (App.currentModule === 'stock') App.loadModule('stock');
                    else if (App.currentModule === 'fleet') App.loadModule('fleet');
                    else if (App.currentModule === 'beneficiaries') App.loadModule('beneficiaries');
                }
            }, 800);
        };

        if (isExcel) {
            if (typeof XLSX === 'undefined') {
                Utils.showNotification('Bibliothèque XLSX non disponible.', 'danger');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    let allRows = [];
                    workbook.SheetNames.forEach(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];
                        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                        allRows = allRows.concat(json);
                    });
                    processRows(allRows);
                } catch(err) {
                    console.error('Excel parse error', err);
                    Utils.showNotification('Erreur de lecture du fichier Excel : ' + err.message, 'danger');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                    if (lines.length < 2) {
                        Utils.showNotification('Le fichier CSV est vide ou ne contient que des en-têtes.', 'warning');
                        return;
                    }
                    const firstLine = lines[0];
                    const delimiter = (firstLine.includes(';') && (firstLine.split(';').length >= firstLine.split(',').length)) ? ';' : ',';
                    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
                    const rows = [];
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
                        if (parts.length < 1) continue;
                        const row = {};
                        headers.forEach((h, idx) => { row[h] = parts[idx] !== undefined ? parts[idx] : ''; });
                        rows.push(row);
                    }
                    processRows(rows);
                } catch(err) {
                    console.error('CSV parse error', err);
                    Utils.showNotification('Erreur lors du traitement du fichier CSV : ' + err.message, 'error');
                }
            };
            reader.readAsText(file, 'UTF-8');
        }
    },

    saveCompany: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const f = e.target;
        const newName = f.companyName.value.trim() || 'SPA DOUROUB ELDJAZAIR';
        DB.updateSettings({
            companyName: newName,
            capital: f.capital.value,
            nif: f.nif.value,
            rc: f.rc.value,
            nis: f.nis.value,
            art: f.art.value,
            address: f.address.value,
            phone: f.phone.value,
            fax: f.fax.value,
            email: f.email.value
        });

        // Update login screen branding only (header uses compact 'SDE' label)
        const loginNameEl = document.getElementById('loginCompanyName');
        if (loginNameEl) loginNameEl.textContent = newName;

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_UPDATE_COMPANY',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Mise à jour des coordonnées de l'entreprise: ${newName}`
            });
        }

        Utils.showNotification('Coordonnées de l\'entreprise sauvegardées avec succès.', 'success');
    },

    handleLogoUpload: function(event, inputId) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const val = e.target.result;
            const input = document.getElementById(inputId);
            if (input) input.value = val;

            const preview = document.getElementById('settingsLogoPreview');
            if (preview) {
                preview.innerHTML = `<img loading="lazy" src="${val}" style="max-height:40px;border-radius:4px;" alt="Aperçu Logo">`;
            }

            // Sync to login screen live (header uses AI widget, no company logo)
            const loginLogoEl = document.getElementById('loginCompanyLogo');
            if (loginLogoEl) {
                loginLogoEl.src = val;
                loginLogoEl.style.display = 'inline-block';
            }

            Utils.showNotification('Logo chargé en mémoire. Cliquez sur "Appliquer Thème & Logos" pour enregistrer définitivement.', 'info');
        };
        reader.readAsDataURL(file);
    },

    saveTheme: function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const f = e.target;
        const logo = f.rightLogo.value || '';
        DB.updateSettings({
            themeColor: f.themeColor.value,
            themeMode: f.themeMode.value,
            leftLogo: logo,
            rightLogo: logo
        });

        // Live update login logo only (header uses AI widget, no company logo)
        const loginLogoEl = document.getElementById('loginCompanyLogo');
        if (loginLogoEl) {
            if (logo) {
                loginLogoEl.src = logo;
                loginLogoEl.style.display = 'inline-block';
            } else {
                loginLogoEl.style.display = 'none';
            }
        }

        if (window.UI && UI.applyTheme) {
            UI.applyTheme(DB.getSettings());
        }

        if (DB.addAuditLog) {
            DB.addAuditLog({
                action: 'SETTINGS_UPDATE_THEME',
                author: (Auth.getCurrentUser() || {}).username || 'Admin',
                details: `Mise à jour thème: ${f.themeMode.value} (${f.themeColor.value})`
            });
        }

        Utils.showNotification('Thème et logos appliqués avec succès.', 'success');
    },

    exportData: function() {
        const json = DB.exportData();
        Utils.downloadFile('backup_douroub_' + new Date().toISOString().split('T')[0] + '.json', json, 'application/json');
        Utils.showNotification('Sauvegarde complète exportée avec succès.', 'success');
    },

    importData: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            if (DB.importData(ev.target.result)) {
                Utils.showNotification('Données importées avec succès. Rechargement du système...', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                Utils.showNotification('Erreur lors de l\'importation des données.', 'error');
            }
        };
        reader.readAsText(file);
    },

    resetData: function() {
        if (confirm("ATTENTION : Cela va effacer TOUTES les données (articles, décharges, historique, carburant). Continuer ?")) {
            if (confirm("Êtes-vous ABSOLUMENT certain(e) ? Cette action est irréversible !")) {
                localStorage.removeItem('erp_douroub_db');
                sessionStorage.clear();
                location.reload();
            }
        }
    },

    resetToOfficialExcelData: function() {
        if (!confirm("Confirmer la réinitialisation vers l'état vierge initial (0 article, 0 véhicule, administrateur par défaut) ?")) return;
        if (typeof DB !== 'undefined' && DB.resetToOfficialExcelData) {
            DB.resetToOfficialExcelData();
            UI.showAlert("✅ Système réinitialisé à l'état vierge avec succès (0 article, 0 véhicule, administrateur par défaut).", "success");
            setTimeout(() => location.reload(), 1200);
        } else {
            localStorage.removeItem('erp_douroub_db');
            location.reload();
        }
    },

    purgeServerStock: async function() {
        if (!confirm('⚠️ ATTENTION : Cette action supprime DÉFINITIVEMENT tous les articles du stock côté serveur (MongoDB). Continuer ?')) return;
        if (!confirm('Dernière confirmation : vider complètement le stock serveur ?')) return;
        try {
            const token = typeof API !== 'undefined' && API.getToken ? API.getToken() : (localStorage.getItem('erp_jwt_token') || localStorage.getItem('erp_token') || '');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            await fetch('/api/articles/purge-demo', { method: 'POST', headers: headers }).catch(() => {});
            const res = await fetch('/api/articles/all', {
                method: 'DELETE',
                headers: headers
            });
            const data = await res.json();
            if (res.ok) {
                // Also clear local storage
                if (typeof DB !== 'undefined') { DB.data.articles = []; DB.save(); }
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification('✅ Stock serveur vidé : ' + (data.deleted || 0) + ' articles supprimés', 'success');
                } else {
                    alert('✅ Stock serveur vidé : ' + (data.deleted || 0) + ' articles supprimés');
                }
                setTimeout(function() { location.reload(); }, 1500);
            } else {
                alert('❌ Erreur : ' + (data.message || res.statusText));
            }
        } catch (e) {
            alert('❌ Erreur de connexion : ' + e.message);
        }
    },


    exportAllToExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert("Librairie XLSX non trouvée.", "danger");
            return;
        }
        const wb = XLSX.utils.book_new();

        // 1. Articles
        const articles = DB.getArticles ? DB.getArticles() : [];
        const artData = articles.map(a => ({
            'Code': a.code,
            'Désignation': a.name || a.designation,
            'Catégorie': a.category,
            'Famille': a.family || '',
            'Stock Actuel': a.quantity,
            'Unité': a.unit,
            'Emplacement': a.location,
            'Seuil Alerte': a.minThreshold,
            'Prix Unitaire (DA)': a.price || 0,
            'Valeur Totale (DA)': (Number(a.quantity) || 0) * (Number(a.price) || 0)
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(artData), "Articles_Stock");

        // 2. Mouvements Stock
        const movements = DB.getMovements ? DB.getMovements() : [];
        const mvtData = movements.map(m => {
            const art = articles.find(a => a.id === m.articleId);
            return {
                'Date': m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '',
                'Type': m.type,
                'Code Article': art ? art.code : m.articleId,
                'Désignation': art ? (art.name || art.designation) : '',
                'Quantité': m.quantity,
                'Motif / Réf': m.reason,
                'Auteur': m.author
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mvtData), "Mouvements_Stock");

        // 3. Flotte & Véhicules
        const fleet = DB.getFleet ? DB.getFleet() : [];
        const fleetData = fleet.map(f => ({
            'Immatriculation': f.immatriculation,
            'Code': f.code || '',
            'Nom / Véhicule': f.name,
            'Marque': f.brand || '',
            'Modèle': f.model || '',
            'Famille': f.family || '',
            'Année': f.year || '',
            'Kilométrage': f.kilometrage || 0,
            'Statut': f.status || 'Actif',
            'Notes': f.notes || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fleetData), "Flotte_Equipements");

        // 4. Décharges
        const decharges = DB.getDecharges ? DB.getDecharges() : [];
        const dechData = decharges.map(d => ({
            'Réf Décharge': d.ref,
            'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
            'Bénéficiaire': d.beneficiary,
            'Département': d.service,
            'Matériel Lié': d.immatriculation || d.materialName || '',
            'Nb Articles': (d.items || []).length,
            'Statut': d.status,
            'Validé Par (Chef Section)': d.validatedByChefSection || d.validatedBy || '',
            'Servi Par (Magasinier)': d.servedBy || '',
            'Motif': d.reason || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dechData), "Decharges_Sortie");

        // 5. Lignes de Décharges
        const dechLines = [];
        decharges.forEach(d => {
            (d.items || []).forEach(it => {
                const art = articles.find(a => a.id === it.articleId);
                dechLines.push({
                    'Réf Décharge': d.ref,
                    'Date': d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
                    'Bénéficiaire': d.beneficiary,
                    'Département': d.service,
                    'Véhicule': d.immatriculation || '',
                    'Code Article': art ? art.code : it.articleId,
                    'Désignation': art ? (art.name || art.designation) : '',
                    'Quantité': it.quantity || 0,
                    'Unité': art ? art.unit : 'U',
                    'Statut Décharge': d.status
                });
            });
        });
        if (dechLines.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dechLines), "Lignes_Decharges");
        }

        // 6. Demandes (PreOrders)
        const preorders = DB.getPreOrders ? DB.getPreOrders() : [];
        const preData = preorders.map(p => ({
            'Réf Demande': p.ref,
            'Date': p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '',
            'Demandeur': p.requester || p.beneficiary || p.userName || '',
            'Département': p.department || '',
            'Statut': p.status,
            'Nb Articles': (p.items || []).length,
            'Notes': p.notes || ''
        }));
        if (preData.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(preData), "Demandes_Requisitions");
        }

        // 7. Citernes
        const citernes = (typeof Citernes !== 'undefined' && Citernes.getCiternesList) ? Citernes.getCiternesList() : (DB.getCiternes ? DB.getCiternes() : []);
        const citData = citernes.map(c => ({
            'Code': c.code,
            'Nom': c.name,
            'Carburant': c.type,
            'Emplacement': c.location,
            'Capacité (L)': c.capacity,
            'Niveau Actuel (L)': c.currentLevel,
            'Seuil Alerte': c.minAlert
        }));
        if (citData.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(citData), "Cuves_Citernes");
        }

        // 8. PVs
        const pvs = DB.getPVs ? DB.getPVs() : [];
        const pvData = pvs.map(pv => {
            const d = decharges.find(x => x.id === pv.dechargeId);
            return {
                'Réf PV': pv.ref,
                'Date': pv.date ? new Date(pv.date).toLocaleDateString('fr-FR') : '',
                'Réf Décharge': d ? d.ref : '',
                'Bénéficiaire': d ? d.beneficiary : '',
                'Département': d ? d.service : '',
                'Nb Articles': (pv.items || []).length
            };
        });
        if (pvData.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pvData), "PVs_Mise_A_Disposition");
        }

        // 9. Utilisateurs
        const users = DB.getUsers ? DB.getUsers() : [];
        const uData = users.map(u => ({
            'Identifiant': u.username,
            'Nom & Prénom': u.name,
            'Rôle': u.role,
            'Qualité': u.qualite || '',
            'Département': u.department || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uData), "Utilisateurs_Systeme");

        XLSX.writeFile(wb, `ERP_Douroub_Base_Complete_${new Date().toISOString().slice(0, 10)}.xlsx`);
        UI.showAlert("Export complet de la base de données Excel (.xlsx) généré avec succès !", "success");
    },

    triggerManualBackup: async function() {
        if (typeof DB === 'undefined' || !DB.triggerBackup) {
            Utils.showNotification('Fonction de sauvegarde non disponible', 'error');
            return;
        }
        try {
            Utils.showNotification('Sauvegarde en cours...', 'info');
            const res = await DB.triggerBackup();
            Utils.showNotification('Sauvegarde MongoDB créée avec succès !', 'success');
            this.loadBackupCount();
        } catch (e) {
            Utils.showNotification('Erreur: ' + (e.message || 'Sauvegarde échouée'), 'error');
        }
    },

    showBackupHistory: async function() {
        const list = document.getElementById('backupHistoryList');
        if (!list) return;
        if (list.style.display !== 'none') { list.style.display = 'none'; return; }
        list.style.display = 'block';
        list.innerHTML = '<p class="text-muted small">Chargement...</p>';
        try {
            const res = await DB.listBackups();
            const backups = res.backups || [];
            if (backups.length === 0) {
                list.innerHTML = '<p class="text-muted small">Aucune sauvegarde trouvée.</p>';
                return;
            }
            list.innerHTML = backups.map(function(b) {
                var d = new Date(b.createdAt).toLocaleString('fr-DZ');
                var size = b.sizeKB ? (b.sizeKB + ' KB') : '';
                return '<div class="d-flex justify-content-between small p-1 border-bottom"><span>' + d + ' (' + (b.type || 'auto') + ')</span><span class="text-muted">' + size + '</span></div>';
            }).join('');
        } catch (e) {
            list.innerHTML = '<p class="text-danger small">Erreur: ' + (e.message || 'chargement') + '</p>';
        }
    },

    loadBackupCount: async function() {
        var el = document.getElementById('backupCount');
        if (!el) return;
        try {
            var res = await DB.listBackups();
            var backups = res.backups || [];
            el.textContent = backups.length + ' sauvegarde(s)';
        } catch (e) {
            el.textContent = 'Non disponible';
        }
    }
};





// =============================================================================
// NOTIFICATION SYSTEM & NOTIFICATIONS CENTER
// =============================================================================

window.Notify = {
    storageKey: 'erp_douroub_notifications_v1',
    prefsKey: 'erp_douroub_notif_prefs_v1',
    _inited: false,

    init: function() {
        if (this._inited) return;
        this._inited = true;

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const bell = document.querySelector('.notification-bell');
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown && dropdown.style.display !== 'none') {
                if (bell && !bell.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            }
        });

        this.runChecks();
        this.updateBadge();
    },

    getStore: function() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch(e) {
            return [];
        }
    },

    saveStore: function(items) {
        localStorage.setItem(this.storageKey, JSON.stringify(items));
        this.updateBadge();
        window.dispatchEvent(new CustomEvent('notification-update'));
    },

    getPrefs: function() {
        try {
            return JSON.parse(localStorage.getItem(this.prefsKey) || '{"toast":true,"sound":false}');
        } catch(e) {
            return { toast: true, sound: false };
        }
    },

    savePrefs: function(p) {
        localStorage.setItem(this.prefsKey, JSON.stringify(p));
    },

    add: function(opt) {
        const items = this.getStore();
        const key = opt.key || null;

        // Prevent duplicate unread notification with same key within 1 hour
        if (key) {
            const existing = items.find(n => n.key === key && !n.readAt);
            if (existing) return;
        }

        const notif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            key: key,
            title: opt.title || 'Notification',
            message: opt.message || '',
            category: opt.category || 'system',
            type: opt.type || 'info', // info, warning, success, error
            module: opt.module || 'dashboard',
            tab: opt.tab || null,
            createdAt: new Date().toISOString(),
            readAt: null
        };

        items.unshift(notif);
        // Keep max 100 notifications
        if (items.length > 100) items.length = 100;
        this.saveStore(items);

        // Show toast
        const prefs = this.getPrefs();
        if (prefs.toast !== false && typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(notif.title + ': ' + notif.message, notif.type);
        }

        // Sound if enabled
        if (prefs.sound) {
            this.playChime();
        }
    },

    sendAdminAlert: function(title, message, extra = {}) {
        this.add({
            title: title,
            message: message,
            category: extra.category || 'alert',
            type: extra.type || 'warning',
            module: extra.module || 'notifications',
            ...extra
        });
    },

    markRead: function(id) {
        const items = this.getStore();
        const n = items.find(x => x.id === id);
        if (n && !n.readAt) {
            n.readAt = new Date().toISOString();
            this.saveStore(items);
        }
    },

    markAllRead: function() {
        const items = this.getStore();
        const now = new Date().toISOString();
        items.forEach(n => { if (!n.readAt) n.readAt = now; });
        this.saveStore(items);
        this.renderDropdown();
    },

    clearAll: function() {
        if (!confirm('Supprimer toutes les notifications ?')) return;
        this.saveStore([]);
        this.renderDropdown();
    },

    getUnreadCount: function() {
        return this.getStore().filter(n => !n.readAt).length;
    },

    updateBadge: function() {
        const count = this.getUnreadCount();
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count > 99 ? '99+' : count;
                badge.className = 'notif-badge-count';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    toggleDropdown: function(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const dd = document.getElementById('notifDropdown');
        if (!dd) return;
        if (dd.style.display === 'none' || !dd.style.display) {
            this.renderDropdown();
            dd.style.display = 'block';
        } else {
            dd.style.display = 'none';
        }
    },

    renderDropdown: function() {
        const dd = document.getElementById('notifDropdown');
        if (!dd) return;

        const items = this.getStore();
        const unreadCount = this.getUnreadCount();
        const recent = items.slice(0, 7);

        let iconMap = {
            stock: 'fa-boxes-stacked',
            decharge: 'fa-clipboard-check',
            system: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            danger: 'fa-exclamation-circle',
            success: 'fa-check-circle'
        };

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border-light);background:var(--surface-alt);">
                <div style="font-weight:700;font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-bell" style="color:var(--accent);"></i>
                    <span>Notifications</span>
                    ${unreadCount > 0 ? `<span class="badge bg-danger rounded-pill" style="font-size:10px;">${unreadCount}</span>` : ''}
                </div>
                <div style="display:flex;gap:6px;">
                    ${unreadCount > 0 ? `<button type="button" class="btn btn-xs btn-outline-secondary" onclick="Notify.markAllRead()" title="Tout marquer comme lu"><i class="fas fa-check-double"></i></button>` : ''}
                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="App.loadModule('notifications');document.getElementById('notifDropdown').style.display='none';" title="Centre complet"><i class="fas fa-inbox"></i></button>
                </div>
            </div>
            <div style="max-height:360px;overflow-y:auto;">
        `;

        if (recent.length === 0) {
            html += `
                <div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:13px;">
                    <i class="fas fa-bell-slash" style="font-size:24px;margin-bottom:8px;opacity:0.4;display:block;"></i>
                    Aucune notification pour le moment.
                </div>
            `;
        } else {
            recent.forEach(n => {
                const unread = !n.readAt;
                const ic = iconMap[n.type] || iconMap[n.category] || 'fa-bell';
                let col = '#0078d4';
                if (n.type === 'warning') col = '#d97706';
                if (n.type === 'error' || n.type === 'danger') col = '#ef4444';
                if (n.type === 'success') col = '#10b981';

                const timeStr = Utils.timeAgo ? Utils.timeAgo(n.createdAt) : new Date(n.createdAt).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});

                html += `
                    <div style="padding:10px 14px;border-bottom:1px solid var(--border-light);cursor:pointer;background:${unread ? 'rgba(0,120,212,0.04)' : 'transparent'};display:flex;gap:10px;align-items:flex-start;transition:background 120ms;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='${unread ? 'rgba(0,120,212,0.04)' : 'transparent'}'" onclick="Notify.clickItem('${n.id}', '${n.module}', '${n.tab || ''}')">
                        <div style="width:28px;height:28px;border-radius:50%;background:${col}15;color:${col};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
                            <i class="fas ${ic}" style="font-size:12px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
                                <strong style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHTML(n.title)}</strong>
                                <span style="font-size:10px;color:var(--text-light);">${timeStr}</span>
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${Utils.escapeHTML(n.message)}</div>
                        </div>
                        ${unread ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--accent);margin-top:6px;flex-shrink:0;"></span>` : ''}
                    </div>
                `;
            });
        }

        html += `
            </div>
            <div style="padding:8px 12px;border-top:1px solid var(--border-light);background:var(--surface-alt);display:flex;justify-content:space-between;align-items:center;">
                <button type="button" class="btn btn-xs btn-outline-danger" onclick="Notify.clearAll()"><i class="fas fa-trash"></i> Vider</button>
                <button type="button" class="btn btn-xs btn-primary" onclick="App.loadModule('notifications');document.getElementById('notifDropdown').style.display='none';">Centre de notifications <i class="fas fa-arrow-right"></i></button>
            </div>
        `;

        dd.innerHTML = html;
    },

    clickItem: function(id, mod, tab) {
        this.markRead(id);
        const dd = document.getElementById('notifDropdown');
        if (dd) dd.style.display = 'none';
        if (mod && typeof App !== 'undefined') {
            App.loadModule(mod, tab || null);
        }
    },

    runChecks: function() {
        if (typeof DB === 'undefined') return;
        try {
            // 1. Stock alert checks
            const articles = DB.getArticles ? DB.getArticles() : [];
            articles.forEach(a => {
                const qty = Number(a.quantity || 0);
                const min = Number(a.minThreshold || 0);
                if (min > 0 && qty <= min) {
                    this.add({
                        key: 'stock_low_' + a.id,
                        title: 'Alerte Stock Bas',
                        message: `${a.designation} (${a.code}) : ${qty} ${a.unit || 'U'} restants (seuil: ${min})`,
                        category: 'stock',
                        type: 'warning',
                        module: 'stock'
                    });
                }
            });

            // 2. Pending decharges
            const decharges = DB.getDecharges ? DB.getDecharges() : [];
            decharges.filter(d => d.status === 'En attente').forEach(d => {
                this.add({
                    key: 'dech_pending_' + d.id,
                    title: 'Décharge en attente',
                    message: `Décharge ${d.ref} pour ${d.beneficiary || 'Bénéficiaire'} en attente de validation`,
                    category: 'decharge',
                    type: 'info',
                    module: 'decharges'
                });
            });
        } catch(e) {
            console.error('Notify.runChecks error:', e);
        }
    },

    playChime: function() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } catch(e) {}
    }
};

window.NotificationsCenter = {
    view: 'all', // 'all', 'unread', 'stock', 'decharge'
    search: '',

    render: function() {
        const items = Notify.getStore();
        const unreadCount = Notify.getUnreadCount();
        const prefs = Notify.getPrefs();

        let filtered = items;
        if (this.view === 'unread') filtered = filtered.filter(n => !n.readAt);
        if (this.view === 'stock') filtered = filtered.filter(n => n.category === 'stock');
        if (this.view === 'decharge') filtered = filtered.filter(n => n.category === 'decharge');

        if (this.search) {
            const q = this.search.toLowerCase();
            filtered = filtered.filter(n => (n.title && n.title.toLowerCase().includes(q)) || (n.message && n.message.toLowerCase().includes(q)));
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-bell text-primary me-2"></i> Centre de Notifications</h2>
                    <p class="text-muted" style="margin:0;">Consultez les alertes système, mouvements de stock et validations en attente</p>
                </div>
                <div class="d-flex" style="gap:8px;">
                    <button class="btn btn-outline-secondary btn-sm" onclick="Notify.markAllRead();NotificationsCenter.refresh();"><i class="fas fa-check-double"></i> Tout marquer lu</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="Notify.clearAll();NotificationsCenter.refresh();"><i class="fas fa-trash"></i> Vider tout</button>
                </div>
            </div>

            <!-- Preferences & Filters Row -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="row g-2 align-items-center">
                                <div class="col-md-6">
                                    <div class="btn-group w-100">
                                        <button class="btn btn-sm ${this.view==='all'?'btn-primary':'btn-outline-secondary'}" onclick="NotificationsCenter.setView('all')">Toutes (${items.length})</button>
                                        <button class="btn btn-sm ${this.view==='unread'?'btn-primary':'btn-outline-secondary'}" onclick="NotificationsCenter.setView('unread')">Non lues (${unreadCount})</button>
                                        <button class="btn btn-sm ${this.view==='stock'?'btn-primary':'btn-outline-secondary'}" onclick="NotificationsCenter.setView('stock')">Stock</button>
                                        <button class="btn btn-sm ${this.view==='decharge'?'btn-primary':'btn-outline-secondary'}" onclick="NotificationsCenter.setView('decharge')">Décharges</button>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <input type="text" class="form-control form-control-sm" placeholder="Rechercher dans les notifications..." value="${Utils.escapeHTML(this.search)}" oninput="NotificationsCenter.search=this.value;NotificationsCenter.refreshList();">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body d-flex align-items-center justify-content-around">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="prefToast" ${prefs.toast!==false?'checked':''} onchange="NotificationsCenter.togglePref('toast')">
                                <label class="form-check-label small" for="prefToast">Pop-ups (Toast)</label>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="prefSound" ${prefs.sound?'checked':''} onchange="NotificationsCenter.togglePref('sound')">
                                <label class="form-check-label small" for="prefSound">Son d'alerte</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notifications List -->
            <div class="card">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Historique des notifications (${filtered.length})</h5>
                </div>
                <div class="card-body p-0" id="notifCenterList">
                    ${this.renderListItems(filtered)}
                </div>
            </div>
        `;
        return html;
    },

    renderListItems: function(list) {
        if (!list || list.length === 0) {
            return `<div class="p-5 text-center text-muted"><i class="fas fa-bell-slash fa-2x mb-3 opacity-25"></i><p>Aucune notification trouvée.</p></div>`;
        }

        let iconMap = {
            stock: 'fa-boxes-stacked',
            decharge: 'fa-clipboard-check',
            system: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            danger: 'fa-exclamation-circle',
            success: 'fa-check-circle'
        };

        return list.map(n => {
            const unread = !n.readAt;
            const ic = iconMap[n.type] || iconMap[n.category] || 'fa-bell';
            let col = '#0078d4';
            if (n.type === 'warning') col = '#d97706';
            if (n.type === 'error' || n.type === 'danger') col = '#ef4444';
            if (n.type === 'success') col = '#10b981';

            const dateFormatted = new Date(n.createdAt).toLocaleString('fr-FR');

            return `
                <div class="d-flex align-items-center justify-content-between p-3 border-bottom" style="background:${unread ? 'rgba(0,120,212,0.03)' : '#ffffff'};">
                    <div class="d-flex align-items-start gap-3 flex-grow-1" style="cursor:pointer;" onclick="Notify.clickItem('${n.id}', '${n.module}', '${n.tab || ''}')">
                        <div style="width:36px;height:36px;border-radius:50%;background:${col}15;color:${col};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
                            <i class="fas ${ic}"></i>
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <strong style="font-size:14px;color:var(--text);">${Utils.escapeHTML(n.title)}</strong>
                                ${unread ? '<span class="badge bg-primary" style="font-size:10px;">NON LU</span>' : '<span class="badge bg-light text-muted" style="font-size:10px;">LU</span>'}
                                <span class="badge" style="background:${col}15;color:${col};font-size:10px;">${Utils.escapeHTML(n.category.toUpperCase())}</span>
                            </div>
                            <p class="text-muted mb-1" style="font-size:13px;">${Utils.escapeHTML(n.message)}</p>
                            <small class="text-muted"><i class="far fa-clock"></i> ${dateFormatted}</small>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        ${unread ? `<button class="btn btn-sm btn-outline-secondary" onclick="Notify.markRead('${n.id}');NotificationsCenter.refresh();" title="Marquer comme lu"><i class="fas fa-check"></i></button>` : ''}
                        <button class="btn btn-sm btn-primary" onclick="Notify.clickItem('${n.id}', '${n.module}', '${n.tab || ''}')">Ouvrir <i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    setView: function(v) {
        this.view = v;
        this.refresh();
    },

    togglePref: function(key) {
        const prefs = Notify.getPrefs();
        prefs[key] = !prefs[key];
        Notify.savePrefs(prefs);
        if (key === 'sound' && prefs[key]) {
            Notify.playChime();
        }
    },

    refresh: function() {
        const main = document.getElementById('mainContent');
        if (main && App.currentModule === 'notifications') {
            main.innerHTML = this.render();
        }
    },

    refreshList: function() {
        const el = document.getElementById('notifCenterList');
        if (!el) return;
        const items = Notify.getStore();
        let filtered = items;
        if (this.view === 'unread') filtered = filtered.filter(n => !n.readAt);
        if (this.view === 'stock') filtered = filtered.filter(n => n.category === 'stock');
        if (this.view === 'decharge') filtered = filtered.filter(n => n.category === 'decharge');
        if (this.search) {
            const q = this.search.toLowerCase();
            filtered = filtered.filter(n => (n.title && n.title.toLowerCase().includes(q)) || (n.message && n.message.toLowerCase().includes(q)));
        }
        el.innerHTML = this.renderListItems(filtered);
    }
};


// =============================================================================
// BENEFICIARIES & DEPARTMENTS MODULE
// =============================================================================

window.Beneficiaries = {
    currentTab: 'beneficiaries',

    getBeneficiariesList: function() {
        const users = DB.getUsers ? DB.getUsers() : [];
        const rawNames = (DB.data && DB.data.beneficiaryNames) ? DB.data.beneficiaryNames : [];
        const decharges = DB.getDecharges ? DB.getDecharges() : [];

        const map = {};

        rawNames.forEach(item => {
            let name = item;
            let dept = 'Direction Générale';
            let qualite = 'Agent';
            if (typeof item === 'object') {
                name = item.name;
                dept = item.department || dept;
                qualite = item.qualite || qualite;
            } else if (typeof item === 'string') {
                if (item.includes('Transport') || item.includes('Exploitation')) { dept = 'Transport'; qualite = 'Chef Service Exploitation'; }
                else if (item.includes('Gestion des Stocks')) { dept = 'Approvisionnement'; qualite = 'Chef Section Gestion des Stocks'; }
                else if (item.includes('Méthode')) { dept = 'Approvisionnement'; qualite = 'Chef Section Méthode'; }
                else if (item.includes('Département')) { dept = 'Direction Générale'; qualite = 'Chef Département'; }
                else if (item.includes('DG') || item.includes('Directeur')) { dept = 'Direction Générale'; qualite = 'Directeur Général'; }
                else if (item.includes('Appro')) { dept = 'Approvisionnement'; qualite = 'Approvisionnement'; }
            }
            if (name) {
                map[name] = { name: name, department: dept, qualite: qualite, dechargesCount: 0, itemsCount: 0 };
            }
        });

        users.forEach(u => {
            if (u.name && !map[u.name]) {
                map[u.name] = {
                    name: u.name,
                    department: u.department || 'Direction Générale',
                    qualite: u.qualite || (u.role === 'admin' ? 'Administrateur' : u.role === 'magasinier' ? 'Magasinier' : 'Utilisateur Standard'),
                    dechargesCount: 0,
                    itemsCount: 0
                };
            }
        });

        decharges.forEach(d => {
            const ben = d.beneficiary;
            if (!ben) return;
            if (!map[ben]) {
                map[ben] = {
                    name: ben,
                    department: d.service || 'Non spécifié',
                    qualite: d.qualite || 'Bénéficiaire',
                    dechargesCount: 0,
                    itemsCount: 0
                };
            }
            map[ben].dechargesCount++;
            (d.items || []).forEach(it => { map[ben].itemsCount += Number(it.quantity || 0); });
        });

        return Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
    },

    getDepartmentsList: function() {
        const settings = DB.getSettings ? DB.getSettings() : {};
        const allDepts = (settings.departments && settings.departments.length > 0)
            ? settings.departments
            : ['Direction Générale', 'Approvisionnement', 'Transport'];
        const bens = this.getBeneficiariesList();
        const decharges = DB.getDecharges ? DB.getDecharges() : [];

        return allDepts.map(dept => {
            const deptBens = bens.filter(b => b.department === dept);
            const deptDecharges = decharges.filter(d => d.service === dept);
            return {
                name: dept,
                staffCount: deptBens.length,
                dechargesCount: deptDecharges.length
            };
        });
    },

    render: function(tab = 'beneficiaries') {
        this.currentTab = tab || 'beneficiaries';
        const bens = this.getBeneficiariesList();
        const depts = this.getDepartmentsList();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style="font-weight:800;color:var(--text);margin-bottom:4px;"><i class="fas fa-users text-primary me-2"></i> Personnel, Bénéficiaires & Départements</h2>
                    <p class="text-muted" style="margin:0;">Sélectionnez une personne ou un service pour lui affecter directement une décharge ou gérer l'annuaire</p>
                </div>
                <div class="d-flex" style="gap:8px;">
                    <button class="btn btn-outline-success btn-sm" onclick="Beneficiaries.exportExcel()"><i class="fas fa-file-excel me-1"></i> Exporter Excel</button>
                    <button class="btn btn-outline-primary btn-sm" onclick="Beneficiaries.showAddDepartment()"><i class="fas fa-building"></i> + Nouveau Département</button>
                    <button class="btn btn-primary btn-sm" onclick="Beneficiaries.showAddBeneficiary()"><i class="fas fa-user-plus"></i> + Nouveau Bénéficiaire</button>
                </div>
            </div>

            <div class="tabs mb-4">
                <div class="tab ${this.currentTab==='beneficiaries'?'active':''}" onclick="Beneficiaries.switchTab('beneficiaries')">
                    <i class="fas fa-id-card me-1"></i> Annuaire du Personnel & Bénéficiaires (${bens.length})
                </div>
                <div class="tab ${this.currentTab==='departments'?'active':''}" onclick="Beneficiaries.switchTab('departments')">
                    <i class="fas fa-building me-1"></i> Départements & Services (${depts.length})
                </div>
            </div>

            <div id="benTabContent">
                ${this.currentTab === 'beneficiaries' ? this.renderBeneficiariesTab(bens) : this.renderDepartmentsTab(depts)}
            </div>
        `;
        return html;
    },

    renderBeneficiariesTab: function(bens) {
        const depts = this.getDepartmentsList();
        return `
            <div class="card">
                <div class="card-body">
                    <div class="row mb-3 g-2">
                        <div class="col-md-6">
                            <label class="form-label small text-muted">Rechercher par nom ou fonction</label>
                            <input type="text" id="benSearchInput" class="form-control form-control-sm" placeholder="Ex: Benali, Mécanicien, Touati..." onkeyup="Beneficiaries.filterBens()">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small text-muted">Filtrer par Département</label>
                            <select id="benDeptFilterSelect" class="form-select form-select-sm" onchange="Beneficiaries.filterBens()">
                                <option value="">Tous les départements (${bens.length} personnes)</option>
                                ${depts.map(d => `<option value="${Utils.escapeHTML(d.name)}">${Utils.escapeHTML(d.name)} (${d.staffCount} staff)</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover" id="benTable">
                            <thead class="table-light">
                                <tr>
                                    <th>Nom & Prénom</th>
                                    <th>Département / Service</th>
                                    <th>Qualité / Fonction</th>
                                    <th>Décharges Assignées</th>
                                    <th class="text-end">Action Décharge</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bens.map(b => `
                                    <tr data-dept="${Utils.escapeHTML(b.department)}">
                                        <td><strong><i class="fas fa-user-circle text-primary me-2"></i> ${Utils.escapeHTML(b.name)}</strong></td>
                                        <td><span class="badge bg-light text-dark border">${Utils.escapeHTML(b.department)}</span></td>
                                        <td>${Utils.escapeHTML(b.qualite || '-')}</td>
                                        <td>
                                            <span class="badge ${b.dechargesCount > 0 ? 'bg-primary' : 'bg-secondary'} rounded-pill">
                                                ${b.dechargesCount} décharge(s)
                                            </span>
                                            ${b.itemsCount > 0 ? `<small class="text-muted ms-1">(${b.itemsCount} pièces)</small>` : ''}
                                        </td>
                                        <td class="text-end">
                                            <button class="btn btn-sm btn-decharge" onclick="Decharges.showCreateFor('${Utils.escapeHTML(b.name)}', '${Utils.escapeHTML(b.department)}', '${Utils.escapeHTML(b.qualite)}')" title="Créer une décharge directement pour cet employé">
                                                <i class="fas fa-clipboard-check"></i> + Décharge à ce nom
                                            </button>
                                            <button class="btn btn-sm btn-outline-info ms-1" onclick="Beneficiaries.viewHistory('${Utils.escapeHTML(b.name)}')" title="Filtrer les décharges de cette personne">
                                                <i class="fas fa-history"></i> Historique
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderDepartmentsTab: function(depts) {
        return `
            <div class="row g-3">
                ${depts.map(d => `
                    <div class="col-md-4 mb-3">
                        <div class="card h-100 shadow-sm border">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h5 class="card-title mb-0" style="font-weight:700;"><i class="fas fa-building text-primary me-2"></i> ${Utils.escapeHTML(d.name)}</h5>
                                </div>
                                <div class="d-flex justify-content-between my-3 text-muted" style="font-size:13px;">
                                    <span>Personnel assigné :</span>
                                    <strong class="text-dark">${d.staffCount} employé(s)</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-3 text-muted" style="font-size:13px;">
                                    <span>Décharges attribuées :</span>
                                    <strong class="text-dark">${d.dechargesCount} décharge(s)</strong>
                                </div>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-outline-primary w-100" onclick="Beneficiaries.filterByDept('${Utils.escapeHTML(d.name)}')">
                                        <i class="fas fa-users"></i> Voir Personnel
                                    </button>
                                    <button class="btn btn-sm btn-primary w-100" onclick="Decharges.showCreateFor('', '${Utils.escapeHTML(d.name)}', '')">
                                        <i class="fas fa-clipboard-check"></i> + Décharge
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    switchTab: function(t) {
        this.currentTab = t;
        const main = document.getElementById('mainContent');
        if (main && App.currentModule === 'beneficiaries') {
            main.innerHTML = this.render(t);
        }
    },

    filterBens: function() {
        const q = (document.getElementById('benSearchInput')?.value || '').toLowerCase();
        const dept = document.getElementById('benDeptFilterSelect')?.value || '';
        const rows = document.querySelectorAll('#benTable tbody tr');
        rows.forEach(r => {
            const txt = r.innerText.toLowerCase();
            const rDept = r.getAttribute('data-dept') || '';
            const matchQ = !q || txt.includes(q);
            const matchDept = !dept || rDept === dept;
            r.style.display = (matchQ && matchDept) ? '' : 'none';
        });
    },

    filterByDept: function(dept) {
        this.switchTab('beneficiaries');
        setTimeout(() => {
            const sel = document.getElementById('benDeptFilterSelect');
            if (sel) {
                sel.value = dept;
                Beneficiaries.filterBens();
            }
        }, 50);
    },

    viewHistory: function(benName) {
        App.loadModule('decharges');
        setTimeout(() => {
            const benSel = document.getElementById('dechBenFilter');
            if (benSel) {
                benSel.value = benName;
                Decharges.filterTable();
            } else {
                const search = document.getElementById('dechSearch');
                if (search) {
                    search.value = benName;
                    Decharges.filterTable();
                }
            }
        }, 150);
    },

    showAddBeneficiary: function() {
        const depts = this.getDepartmentsList();
        const html = `
            <form onsubmit="Beneficiaries.saveBeneficiary(event)">
                <div class="mb-3">
                    <label>Nom et Prénom de l'employé / bénéficiaire *</label>
                    <input type="text" id="addBenName" class="form-control" required placeholder="Ex: Benali Ahmed, Khelif Mohamed...">
                </div>
                <div class="mb-3">
                    <label>Département / Service *</label>
                    <select id="addBenDept" class="form-select" required>
                        ${depts.map(d => `<option value="${Utils.escapeHTML(d.name)}">${Utils.escapeHTML(d.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-3">
                    <label>Qualité / Fonction</label>
                    <input type="text" id="addBenQualite" class="form-control" placeholder="Ex: Chauffeur, Mécanicien, Chef d'Atelier, Agent...">
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success">Enregistrer dans la base</button>
                </div>
            </form>
        `;
        UI.showModal('Ajouter un Bénéficiaire', html);
    },

    saveBeneficiary: function(e) {
        e.preventDefault();
        const name = (document.getElementById('addBenName')?.value || '').trim();
        const dept = document.getElementById('addBenDept')?.value || '';
        const qualite = (document.getElementById('addBenQualite')?.value || '').trim();

        if (!name) return;

        if (!DB.data.beneficiaryNames) DB.data.beneficiaryNames = [];
        const entry = `${name} (${qualite || dept})`;
        if (!DB.data.beneficiaryNames.includes(entry) && !DB.data.beneficiaryNames.includes(name)) {
            DB.data.beneficiaryNames.push(entry);
            DB.save();
        }

        UI.hideModal();
        Utils.showNotification(`Bénéficiaire "${name}" ajouté avec succès.`, 'success');
        if (App.currentModule === 'beneficiaries') {
            App.loadModule('beneficiaries', 'beneficiaries');
        }
    },

    showAddDepartment: function() {
        const html = `
            <form onsubmit="Beneficiaries.saveDepartment(event)">
                <div class="mb-3">
                    <label>Nom du nouveau département / service *</label>
                    <input type="text" id="addDeptName" class="form-control" required placeholder="Ex: Hygiène & Sécurité, Informatique...">
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="UI.hideModal()">Annuler</button>
                    <button type="submit" class="btn btn-success">Créer le département</button>
                </div>
            </form>
        `;
        UI.showModal('Ajouter un Département', html);
    },

    saveDepartment: function(e) {
        e.preventDefault();
        const deptName = (document.getElementById('addDeptName')?.value || '').trim();
        if (!deptName) return;

        const s = DB.getSettings();
        if (!s.departments) s.departments = [];
        if (!s.departments.includes(deptName)) {
            s.departments.push(deptName);
            DB.updateSettings(s);
        }

        UI.hideModal();
        Utils.showNotification(`Département "${deptName}" créé avec succès.`, 'success');
        if (App.currentModule === 'beneficiaries') {
            App.loadModule('beneficiaries', 'departments');
        }
    },

    exportExcel: function() {
        if (typeof XLSX === 'undefined') {
            UI.showAlert('Bibliothèque XLSX non disponible.', 'danger');
            return;
        }
        const bens = this.getBeneficiariesList();
        const depts = this.getDepartmentsList();

        const bensData = bens.map(b => ({
            'Nom & Prénom': b.name,
            'Département': b.department,
            'Qualité / Rôle': b.qualite || 'Bénéficiaire',
            'Nombre de Décharges': b.dechargesCount || 0,
            'Articles / Pièces Sorties': b.itemsCount || 0
        }));

        const deptsData = depts.map(d => ({
            'Département / Service': d.name,
            'Effectif Personnel': d.staffCount || 0,
            'Décharges Associées': d.dechargesCount || 0
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bensData), "Personnel_Beneficiaires");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptsData), "Departements_Services");
        XLSX.writeFile(wb, `Personnel_Departements_${new Date().toISOString().slice(0, 10)}.xlsx`);
        UI.showAlert('Export Excel du personnel et départements généré avec succès !', 'success');
    }
};

// =============================================================================
// GLOBAL OUTSIDE-CLICK HANDLER FOR ARTICLE & MENU DROPDOWNS
// =============================================================================
if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
        // Extra article in serve modal
        const extraDd = document.getElementById('extraArticleDropdownList');
        const extraInput = document.getElementById('extraArticleSearchInput');
        const extraCat = document.getElementById('extraArticleCategory');
        if (extraDd && extraDd.style.display !== 'none') {
            if (!extraDd.contains(e.target) && e.target !== extraInput && e.target !== extraCat) {
                extraDd.style.display = 'none';
            }
        }
        // Cart catalog in drawer
        const cartDd = document.getElementById('cartCatalogDropdown');
        const cartInput = document.getElementById('cartArticleSearchInput');
        const cartCat = document.getElementById('cartCategoryFilter');
        if (cartDd && cartDd.style.display !== 'none') {
            if (!cartDd.contains(e.target) && e.target !== cartInput && e.target !== cartCat && !e.target.closest('.drawer-catalog-search')) {
                cartDd.style.display = 'none';
                if (typeof Cart !== 'undefined') Cart._dropdownOpen = false;
            }
        }
        // Create decharge article search
        const createDd = document.getElementById('createDechargeDropdownList');
        const createInput = document.getElementById('createDechargeArticleSearch');
        const createCat = document.getElementById('createDechargeCatSelect');
        if (createDd && createDd.style.display !== 'none') {
            if (!createDd.contains(e.target) && e.target !== createInput && e.target !== createCat) {
                createDd.style.display = 'none';
            }
        }
    });
}

