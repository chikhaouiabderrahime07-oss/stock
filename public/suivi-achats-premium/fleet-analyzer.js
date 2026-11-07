(function() {
    // 1. Set Maghreb Truck & maintenance suppliers to type 'service'
    const transportServiceSuppliers = ['MAGHREB TRUCK', 'MTC', 'SINOTRUK', 'SODIKIT'];
    if (window.state && window.state.bcRecords) {
        window.state.bcRecords.forEach(record => {
            if (record.supplierName && transportServiceSuppliers.some(s => record.supplierName.toUpperCase().includes(s))) {
                record.type = 'service';
            }
        });
    }

    // 2. Enrich departments
    const newDepartments = [
        'Structure Transport',
        'Direction Générale',
        'Direction Administrative',
        'Direction Technique',
        'Parc Roulant',
        'Magasin',
        'Laboratoire'
    ];
    if (window.state && window.state.departments) {
        newDepartments.forEach(dept => {
            if (!window.state.departments.includes(dept)) {
                window.state.departments.push(dept);
            }
        });
    }
})();

// Intelligent Fleet Parsing Function
function parseFleetRemarque(remarques) {
    if (!remarques) return null;
    const upperRem = String(remarques).toUpperCase();

    // 1. Truck ID (Matricule / Immatriculation)
    // Matches e.g. 000112-525-07, 000074-525-07, 12345 525 07
    let truckIdMatch = upperRem.match(/(\d{5,6}[-\s]\d{2,3}[-\s]\d{1,2})/);
    let truckId = truckIdMatch ? truckIdMatch[1].replace(/\s+/g, '-') : null;

    if (!truckId) {
        const altMatch = upperRem.match(/(?:TRACTEUR|CAMION|VEHICULE|FOURGON|MATRICULE|IMM|N°)\s*[:#]?\s*([0-9A-Z-]{4,15})/i);
        if (altMatch) truckId = altMatch[1].trim();
    }

    // If no truck ID found and text has no fleet indicators, return null
    const hasFleetKeyword = upperRem.includes('TRACTEUR') || upperRem.includes('CAMION') || upperRem.includes('REMORQUE') ||
                            upperRem.includes('VIDANGE') || upperRem.includes('MAN') || upperRem.includes('HOWO') ||
                            upperRem.includes('DOBLO') || upperRem.includes('ISUZU') || upperRem.includes('SINOTRUK');
    if (!truckId && !hasFleetKeyword) {
        return null;
    }

    // 2. Brand & Model Detection
    let brand = 'Autre Véhicule';
    if (upperRem.includes('MAN') || upperRem.includes('TGS')) brand = 'MAN TGS';
    else if (upperRem.includes('HOWO') || upperRem.includes('SINOTRUK')) brand = 'HOWO Sinotruk';
    else if (upperRem.includes('DOBLO') || upperRem.includes('FIAT')) brand = 'FIAT Doblo';
    else if (upperRem.includes('ISUZU') || upperRem.includes('NPR')) brand = 'ISUZU NPR';
    else if (upperRem.includes('HYUNDAI') || upperRem.includes('HD')) brand = 'Hyundai HD';
    else if (upperRem.includes('RENAULT') || upperRem.includes('KERAX')) brand = 'Renault Kerax';
    else if (upperRem.includes('ACTROS') || upperRem.includes('MERCEDES')) brand = 'Mercedes Actros';
    else if (upperRem.includes('SHACMAN')) brand = 'Shacman';

    // 3. Service Type Detection
    let serviceType = 'Entretien Général';
    if (upperRem.includes('VIDANGE')) serviceType = 'Vidange';
    else if (upperRem.includes('PLAQUETTE') || upperRem.includes('FREIN') || upperRem.includes('DISQUE') || upperRem.includes('F/P')) serviceType = 'Freinage & Plaquettes';
    else if (upperRem.includes('GARNITURE')) serviceType = 'Garnitures de frein';
    else if (upperRem.includes('FILTRE')) serviceType = 'Filtres & Huile';
    else if (upperRem.includes('PNEU') || upperRem.includes('PNEUMATIQUE')) serviceType = 'Pneumatiques';
    else if (upperRem.includes('AMORTISSEUR') || upperRem.includes('SUSPENSION')) serviceType = 'Suspension';

    // 4. KM Reading
    let kmReading = null;
    const kmMatch = upperRem.match(/(\d{1,3}(?:\.\d{3})?|\d{4,6})\s*KM/i);
    if (kmMatch) {
        kmReading = parseInt(kmMatch[1].replace(/\./g, ''), 10);
    }

    // 5. Mileage Tier
    let mileageTier = 'Non renseigné';
    let tierBadgeClass = 'bg-secondary';
    if (kmReading !== null) {
        if (kmReading < 10000) {
            mileageTier = '5 000 – 10 000 km';
            tierBadgeClass = 'bg-success';
        } else if (kmReading <= 30000) {
            mileageTier = '10 000 – 30 000 km';
            tierBadgeClass = 'bg-info text-dark';
        } else if (kmReading <= 60000) {
            mileageTier = '30 000 – 60 000 km';
            tierBadgeClass = 'bg-primary';
        } else if (kmReading <= 80000) {
            mileageTier = '60 000 – 80 000 km';
            tierBadgeClass = 'bg-warning text-dark';
        } else {
            mileageTier = '80 000+ km (Majeur)';
            tierBadgeClass = 'bg-danger text-white';
        }
    }

    // 6. Devis Ref
    let devisRef = null;
    const devisMatch = upperRem.match(/DEVIS\s*([A-Z0-9_-]+)/i);
    if (devisMatch) {
        devisRef = devisMatch[1];
    }

    return {
        serviceType,
        brand,
        kmReading,
        mileageTier,
        tierBadgeClass,
        truckId: truckId || (brand !== 'Autre Véhicule' ? brand : 'Véhicule Flotte'),
        devisRef: devisRef || 'N/A'
    };
}

// Helpers
const _formatMoney = window.formatMoney || ((val) => `${Number(val || 0).toLocaleString('fr-FR')} DZD`);
const _escapeHtml = window.escapeHtml || ((str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
});
const _formatDate = window.formatDate || ((d) => {
    if (!d) return '-';
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('fr-FR');
    } catch(e) { return String(d); }
});

// =============================================================================
// MAIN FLEET ANALYZER & SUIVI VIDANGES CONTROLLER
// =============================================================================
window.FleetAnalyzer = {
    currentTier: 'all',
    currentBrand: 'all',
    searchTerm: '',
    currentPage: 1,
    pageSize: 10,
    activeTab: 'summary', // 'summary' or 'logs'

    openModal: function() {
        this.ensureModalContainer();
        const backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.style.display = 'flex';
            this.renderModalContent();
        }
    },

    closeModal: function() {
        const backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.style.display = 'none';
        }
    },

    ensureModalContainer: function() {
        let backdrop = document.getElementById('fleetMaintenanceModalBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'fleetMaintenanceModalBackdrop';
            backdrop.className = 'modal-backdrop hidden';
            backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;';
            backdrop.innerHTML = `
                <div class="modal large-modal" style="background:#ffffff;border-radius:14px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:1200px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #cbd5e1;">
                    <div class="modal-head" style="padding:1.1rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:10px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 1px 3px rgba(37,99,235,0.2);">
                                <i class="fas fa-truck-moving"></i>
                            </div>
                            <div>
                                <h3 style="margin:0;font-size:1.18rem;font-weight:800;color:#0f172a;">Suivi Entretien & Vidanges Flotte</h3>
                                <p style="margin:0;font-size:0.82rem;color:#64748b;">Tableau de bord de maintenance camions, périodicité kilométrique, fournisseurs et BC associés</p>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button class="btn btn-sm btn-outline-success fw-bold" onclick="FleetAnalyzer.exportExcel()" title="Exporter en Excel"><i class="fas fa-file-excel me-1"></i> Exporter</button>
                            <button class="icon-btn" onclick="FleetAnalyzer.closeModal()" style="background:none;border:none;font-size:1.6rem;color:#64748b;cursor:pointer;line-height:1;padding:0 6px;">&times;</button>
                        </div>
                    </div>
                    <div id="fleetModalBody" class="modal-body" style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;background:#fafbfc;"></div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) FleetAnalyzer.closeModal();
            });
        }
    },

    getRecords: function() {
        const records = (window.state && Array.isArray(window.state.bcRecords)) ? window.state.bcRecords : [];
        const parsed = [];
        records.forEach(r => {
            const raw = r.remarques || r.comments || r.notes || '';
            const p = parseFleetRemarque(raw);
            if (p) {
                parsed.push({
                    ...r,
                    fleetData: p
                });
            }
        });
        return parsed;
    },

    getTruckSummary: function(records) {
        const trucks = {};
        records.forEach(r => {
            const tId = r.fleetData.truckId;
            if (!trucks[tId]) {
                trucks[tId] = {
                    truckId: tId,
                    brand: r.fleetData.brand,
                    lastServiceDate: r.date || '',
                    lastVidangeDate: r.fleetData.serviceType.toLowerCase().includes('vidange') ? (r.date || '') : '',
                    maxKm: r.fleetData.kmReading || 0,
                    tier: r.fleetData.mileageTier,
                    tierBadgeClass: r.fleetData.tierBadgeClass,
                    lastBcRef: r.ref || '',
                    lastBcId: r.id || '',
                    supplier: r.supplierName || 'Non spécifié',
                    totalSpend: 0,
                    serviceCount: 0,
                    vidangeCount: 0,
                    history: []
                };
            }
            const t = trucks[tId];
            t.totalSpend += Number(r.amountTTC || r.amount || 0);
            t.serviceCount++;
            if (r.fleetData.serviceType.toLowerCase().includes('vidange')) {
                t.vidangeCount++;
                if (!t.lastVidangeDate || r.date > t.lastVidangeDate) {
                    t.lastVidangeDate = r.date;
                }
            }
            if (r.fleetData.kmReading && r.fleetData.kmReading > t.maxKm) {
                t.maxKm = r.fleetData.kmReading;
                t.tier = r.fleetData.mileageTier;
                t.tierBadgeClass = r.fleetData.tierBadgeClass;
            }
            if (!t.lastServiceDate || r.date > t.lastServiceDate) {
                t.lastServiceDate = r.date;
                t.lastBcRef = r.ref || '';
                t.lastBcId = r.id || '';
                t.supplier = r.supplierName || t.supplier;
                if (r.fleetData.brand !== 'Autre Véhicule') t.brand = r.fleetData.brand;
            }
            t.history.push(r);
        });
        return Object.values(trucks).sort((a, b) => b.totalSpend - a.totalSpend);
    },

    setTierFilter: function(tier) {
        this.currentTier = tier;
        this.renderModalContent();
    },

    setBrandFilter: function(brand) {
        this.currentBrand = brand;
        this.renderModalContent();
    },

    setSearchTerm: function(val) {
        this.searchTerm = (val || '').toLowerCase().trim();
        this.renderModalContent();
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        this.renderModalContent();
    },

    renderModalContent: function() {
        const container = document.getElementById('fleetModalBody');
        if (!container) return;

        const allRecords = this.getRecords();
        const trucks = this.getTruckSummary(allRecords);

        // Filter trucks
        const filteredTrucks = trucks.filter(t => {
            if (this.currentBrand !== 'all') {
                if (!t.brand.toLowerCase().includes(this.currentBrand.toLowerCase())) return false;
            }
            if (this.currentTier !== 'all') {
                if (this.currentTier === '5k_10k' && t.maxKm >= 10000) return false;
                if (this.currentTier === '10k_30k' && (t.maxKm < 10000 || t.maxKm > 30000)) return false;
                if (this.currentTier === '30k_60k' && (t.maxKm < 30000 || t.maxKm > 60000)) return false;
                if (this.currentTier === '60k_80k' && (t.maxKm < 60000 || t.maxKm > 80000)) return false;
                if (this.currentTier === 'over_80k' && t.maxKm < 80000) return false;
            }
            if (this.searchTerm) {
                const hay = (t.truckId + ' ' + t.brand + ' ' + t.supplier + ' ' + t.lastBcRef).toLowerCase();
                if (!hay.includes(this.searchTerm)) return false;
            }
            return true;
        });

        const totalCost = allRecords.reduce((sum, r) => sum + (Number(r.amountTTC || r.amount) || 0), 0);
        const totalVidanges = allRecords.filter(r => r.fleetData.serviceType.toLowerCase().includes('vidange')).length;
        const heavyCount = trucks.filter(t => t.maxKm >= 80000).length;

        container.innerHTML = `
            <!-- Top Metrics Row -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem;margin-bottom:1.25rem;">
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-truck text-primary me-1"></i> Camions Suivis</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${trucks.length}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Véhicules avec dossier d'entretien</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #10b981;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-oil-can text-success me-1"></i> Vidanges Enregistrées</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${totalVidanges}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Bons de commande vidange / révision</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-triangle-exclamation text-warning me-1"></i> Paliers 80 000+ KM</div>
                    <div style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-top:4px;">${heavyCount}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Grosse révision / courroies requises</div>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #8b5cf6;border-radius:10px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;"><i class="fas fa-coins text-purple me-1"></i> Budget Maintenance</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#0f172a;margin-top:4px;">${_formatMoney(totalCost)}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">Dépenses totales flotte constatées</div>
                </div>
            </div>

            <!-- Interactive Filter Bar -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:1.25rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:0.6rem;align-items:center;">
                    <div style="position:relative;min-width:240px;">
                        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;"></i>
                        <input type="text" placeholder="Rechercher camion, BC, fournisseur..." value="${_escapeHtml(this.searchTerm)}" oninput="FleetAnalyzer.setSearchTerm(this.value)" style="padding:6px 10px 6px 30px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;width:100%;height:38px;">
                    </div>
                    <select onchange="FleetAnalyzer.setBrandFilter(this.value)" style="height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-weight:600;background:#ffffff;">
                        <option value="all" ${this.currentBrand === 'all' ? 'selected' : ''}>Toutes marques (MAN, HOWO, FIAT...)</option>
                        <option value="man" ${this.currentBrand === 'man' ? 'selected' : ''}>MAN TGS</option>
                        <option value="howo" ${this.currentBrand === 'howo' ? 'selected' : ''}>HOWO Sinotruk</option>
                        <option value="fiat" ${this.currentBrand === 'fiat' ? 'selected' : ''}>FIAT Doblo</option>
                        <option value="isuzu" ${this.currentBrand === 'isuzu' ? 'selected' : ''}>ISUZU NPR</option>
                        <option value="hyundai" ${this.currentBrand === 'hyundai' ? 'selected' : ''}>Hyundai HD</option>
                    </select>
                    <select onchange="FleetAnalyzer.setTierFilter(this.value)" style="height:38px;padding:0 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.85rem;font-weight:600;background:#ffffff;">
                        <option value="all" ${this.currentTier === 'all' ? 'selected' : ''}>Tous les paliers km</option>
                        <option value="5k_10k" ${this.currentTier === '5k_10k' ? 'selected' : ''}>&lt; 10 000 km (Rodage / Vidange initiale)</option>
                        <option value="10k_30k" ${this.currentTier === '10k_30k' ? 'selected' : ''}>10 000 – 30 000 km (Service standard)</option>
                        <option value="30k_60k" ${this.currentTier === '30k_60k' ? 'selected' : ''}>30 000 – 60 000 km (Intermédiaire)</option>
                        <option value="60k_80k" ${this.currentTier === '60k_80k' ? 'selected' : ''}>60 000 – 80 000 km (Approfondi)</option>
                        <option value="over_80k" ${this.currentTier === 'over_80k' ? 'selected' : ''}>&gt; 80 000 km (Grosse révision)</option>
                    </select>
                </div>
                <div style="font-size:0.82rem;font-weight:700;color:#64748b;">
                    Affichage : <span class="text-primary">${filteredTrucks.length}</span> camion(s)
                </div>
            </div>

            <!-- Table Card -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div style="overflow-x:auto;">
                    <table class="table table-hover mb-0" style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                            <tr>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Camion / Matricule</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Modèle</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Dernier KM</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Palier Relevé</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Dernière Vidange</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">N° Bon Commande</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;">Fournisseur</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;text-align:right;">Coût Total TTC</th>
                                <th style="padding:10px 12px;font-weight:700;color:#334155;text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTrucks.map(t => {
                                const isHeavy = t.maxKm >= 80000;
                                return `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:10px 12px;">
                                        <span class="badge bg-primary me-1" style="font-family:monospace;font-size:11.5px;padding:4px 8px;background:#2563eb;color:#ffffff;border-radius:4px;">
                                            <i class="fas fa-truck me-1"></i>${_escapeHtml(t.truckId)}
                                        </span>
                                    </td>
                                    <td style="padding:10px 12px;font-weight:600;color:#0f172a;">${_escapeHtml(t.brand)}</td>
                                    <td style="padding:10px 12px;font-weight:700;color:#1e293b;">
                                        ${t.maxKm > 0 ? (Number(t.maxKm).toLocaleString('fr-FR') + ' KM') : '<span class="text-muted">—</span>'}
                                    </td>
                                    <td style="padding:10px 12px;">
                                        <span class="badge ${t.tierBadgeClass}" style="font-size:11px;padding:3px 7px;border-radius:4px;">${_escapeHtml(t.tier)}</span>
                                    </td>
                                    <td style="padding:10px 12px;">
                                        ${t.lastVidangeDate ? `<span class="badge bg-light text-dark border" style="font-size:11px;"><i class="fas fa-calendar-day text-success me-1"></i>${_formatDate(t.lastVidangeDate)}</span>` : '<span class="text-muted small">Aucune vidange</span>'}
                                    </td>
                                    <td style="padding:10px 12px;">
                                        ${t.lastBcRef ? `<a href="javascript:void(0)" onclick="FleetAnalyzer.openBc('${t.lastBcId}')" class="badge bg-info text-dark" style="font-family:monospace;font-size:11px;padding:3px 7px;text-decoration:none;"><i class="fas fa-file-contract me-1"></i>${_escapeHtml(t.lastBcRef)}</a>` : '<span class="text-muted">—</span>'}
                                    </td>
                                    <td style="padding:10px 12px;color:#334155;">
                                        <strong>${_escapeHtml(t.supplier)}</strong>
                                    </td>
                                    <td style="padding:10px 12px;text-align:right;font-weight:700;color:#2563eb;">
                                        ${_formatMoney(t.totalSpend)}
                                    </td>
                                    <td style="padding:10px 12px;text-align:center;">
                                        ${t.lastBcId ? `<button class="btn btn-xs btn-outline-primary" onclick="FleetAnalyzer.openBc('${t.lastBcId}')" title="Ouvrir le Bon de Commande"><i class="fas fa-eye"></i></button>` : ''}
                                    </td>
                                </tr>`;
                            }).join('')}
                            ${filteredTrucks.length === 0 ? `
                                <tr>
                                    <td colspan="9" style="text-align:center;padding:2.5rem;color:#64748b;">
                                        <i class="fas fa-filter me-2"></i>Aucun camion ne correspond aux critères de filtre sélectionnés.
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openBc: function(id) {
        if (!id) return;
        this.closeModal();
        if (typeof openBcEditModal === 'function') {
            openBcEditModal(id);
        } else if (typeof openBcDetailModal === 'function') {
            openBcDetailModal(id);
        }
    },

    exportExcel: function() {
        const records = this.getRecords();
        const trucks = this.getTruckSummary(records);
        const rows = trucks.map(t => [
            t.truckId,
            t.brand,
            t.maxKm,
            t.tier,
            t.lastVidangeDate,
            t.lastBcRef,
            t.supplier,
            t.totalSpend,
            t.serviceCount
        ]);
        const headers = ['Camion / Matricule', 'Modèle', 'Dernier KM', 'Palier KM', 'Dernière Vidange', 'Dernier BC', 'Fournisseur', 'Total TTC', 'Nbr Interventions'];
        if (typeof exportWorkbook === 'function') {
            exportWorkbook(`suivi_entretien_flotte_${new Date().toISOString().split('T')[0]}.xlsx`, [
                { name: 'Flotte_Vidanges', headers, rows }
            ]);
            if (typeof showToast === 'function') showToast('Suivi entretien exporté en Excel.');
        } else {
            // CSV fallback
            let csv = headers.join(';') + '\r\n';
            rows.forEach(r => { csv += r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(';') + '\r\n'; });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `suivi_flotte_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }
    }
};

// Also expose as alias
window.renderFleetAnalyzer = function() {
    if (typeof FleetAnalyzer !== 'undefined' && FleetAnalyzer.openModal) {
        // Can also render directly into #page-reports if open
        const reportsPage = document.getElementById('page-reports');
        if (reportsPage) {
            let fleetSec = document.getElementById('fleetAnalyzerSection');
            if (!fleetSec) {
                fleetSec = document.createElement('div');
                fleetSec.id = 'fleetAnalyzerSection';
                reportsPage.appendChild(fleetSec);
            }
            fleetSec.innerHTML = `
                <div class="card p-3 mt-4" style="border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4 style="margin:0;font-weight:800;color:#0f172a;"><i class="fas fa-truck-moving text-primary me-2"></i> Suivi Entretien & Vidanges Flotte</h4>
                        <button class="btn btn-sm btn-primary fw-bold" onclick="FleetAnalyzer.openModal()"><i class="fas fa-expand me-1"></i> Ouvrir Tableau de Bord Complet</button>
                    </div>
                    <p class="text-muted small">Consultez l'historique complet des vidanges, paliers d'entretien (MAN, HOWO, FIAT, etc.) et fournisseurs associés.</p>
                </div>
            `;
        }
    }
};

// Setup DOM event listeners
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        FleetAnalyzer.ensureModalContainer();
    });
}
