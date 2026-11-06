(function() {
    // 6. Set Maghreb Truck to type 'service'
    const transportServiceSuppliers = ['MAGHREB TRUCK'];
    if (window.state && window.state.bcRecords) {
        window.state.bcRecords.forEach(record => {
            if (record.supplierName && transportServiceSuppliers.some(s => record.supplierName.toUpperCase().includes(s))) {
                record.type = 'service';
            }
        });
    }

    // 7. Enrich departments
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

// Parse function
function parseFleetRemarque(remarques) {
    if (!remarques) return null;
    
    // Convert to upper case for easier matching
    const upperRem = remarques.toUpperCase();
    
    // Truck ID: Look for IMM : 000112-525-07, n°000074-525-07, etc.
    // Pattern: 6 digits - 3 digits - 2 digits (sometimes missing last digit)
    const truckIdMatch = upperRem.match(/(\d{5,6}-\d{2,3}-\d{1,2})/);
    const truckId = truckIdMatch ? truckIdMatch[1] : null;
    
    // If no truck ID found and it doesn't mention "TRACTEUR", "CAMION", "REMORQUE", skip
    if (!truckId && !upperRem.includes('TRACTEUR') && !upperRem.includes('CAMION')) {
        return null;
    }
    
    // Service Type
    let serviceType = 'Autre maintenance';
    if (upperRem.includes('VIDANGE')) serviceType = 'Vidange';
    else if (upperRem.includes('PLAQUETTE') || upperRem.includes('FREIN') || upperRem.includes('F/P')) serviceType = 'Plaquettes de frein';
    else if (upperRem.includes('GARNITURE')) serviceType = 'Garniture';
    else if (upperRem.includes('FILTRE')) serviceType = 'Filtre habitacle';
    
    // KM Reading: Look for numbers followed by KM
    let kmReading = null;
    const kmMatch = upperRem.match(/(\d{1,3}(?:\.\d{3})?|\d{4,6})\s*KM/i);
    if (kmMatch) {
        // Remove dots and convert to number
        kmReading = parseInt(kmMatch[1].replace(/\./g, ''), 10);
    }
    
    // Devis Ref: Look for DEVIS xxx
    let devisRef = null;
    const devisMatch = upperRem.match(/DEVIS\s*(\w+)/i);
    if (devisMatch) {
        devisRef = devisMatch[1];
    }
    
    return {
        serviceType,
        kmReading,
        truckId: truckId || 'Inconnu',
        devisRef: devisRef || 'N/A'
    };
}

// Ensure formatting functions exist if not provided globally
const _formatMoney = window.formatMoney || ((val, currency) => `${Number(val).toLocaleString('fr-FR')} DZD`);
const _escapeHtml = window.escapeHtml || ((str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
});
const _formatDate = window.formatDate || ((d) => d);

// State for pagination
let fleetCurrentPage = 1;
const FLEET_ITEMS_PER_PAGE = 10;
let parsedFleetRecordsCache = [];

function renderFleetAnalyzer() {
    if (!window.state || !window.state.bcRecords) return;
    
    const reportsPage = document.getElementById('page-reports');
    if (!reportsPage) return;
    
    let fleetSection = document.getElementById('fleetAnalyzerSection');
    if (!fleetSection) {
        fleetSection = document.createElement('div');
        fleetSection.id = 'fleetAnalyzerSection';
        // Insert at the end of reports page
        reportsPage.appendChild(fleetSection);
    }
    
    // Parse records
    const parsedRecords = [];
    window.state.bcRecords.forEach(record => {
        const parsed = parseFleetRemarque(record.remarques);
        if (parsed) {
            parsedRecords.push({
                ...record,
                fleetData: parsed
            });
        }
    });
    
    parsedFleetRecordsCache = parsedRecords;
    
    // Build analytics
    const totalInterventions = parsedRecords.length;
    const uniqueTrucks = new Set(parsedRecords.map(r => r.fleetData.truckId).filter(id => id !== 'Inconnu')).size;
    const totalVidanges = parsedRecords.filter(r => r.fleetData.serviceType === 'Vidange').length;
    const totalCost = parsedRecords.reduce((sum, r) => sum + (parseFloat(r.amountTTC) || 0), 0);
    
    // Service Type Breakdown
    const serviceCounts = {};
    parsedRecords.forEach(r => {
        serviceCounts[r.fleetData.serviceType] = (serviceCounts[r.fleetData.serviceType] || 0) + 1;
    });
    
    // Top Trucks
    const truckCounts = {};
    parsedRecords.forEach(r => {
        if (r.fleetData.truckId !== 'Inconnu') {
            truckCounts[r.fleetData.truckId] = (truckCounts[r.fleetData.truckId] || 0) + 1;
        }
    });
    const topTrucks = Object.entries(truckCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    // Monthly Trend
    const monthlyCounts = {};
    parsedRecords.forEach(r => {
        if (r.date) {
            const month = r.date.substring(0, 7); // YYYY-MM
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
    });
    const sortedMonths = Object.keys(monthlyCounts).sort();
    
    // KM Analysis by Truck
    const kmAnalysis = {};
    parsedRecords.forEach(r => {
        const tId = r.fleetData.truckId;
        if (tId !== 'Inconnu') {
            if (!kmAnalysis[tId]) {
                kmAnalysis[tId] = {
                    truckId: tId,
                    vidangeCount: 0,
                    lastKm: 0,
                    lastServiceDate: '',
                    totalAmount: 0
                };
            }
            if (r.fleetData.serviceType === 'Vidange') {
                kmAnalysis[tId].vidangeCount++;
            }
            if (r.fleetData.kmReading && r.fleetData.kmReading > kmAnalysis[tId].lastKm) {
                kmAnalysis[tId].lastKm = r.fleetData.kmReading;
            }
            if (!kmAnalysis[tId].lastServiceDate || r.date > kmAnalysis[tId].lastServiceDate) {
                kmAnalysis[tId].lastServiceDate = r.date;
            }
            kmAnalysis[tId].totalAmount += (parseFloat(r.amountTTC) || 0);
        }
    });
    const sortedKmAnalysis = Object.values(kmAnalysis).sort((a, b) => b.vidangeCount - a.vidangeCount);
    
    // Render HTML
    fleetSection.innerHTML = `
        <div class="fleet-analyzer-header">
            <h2 class="fleet-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                Analyse Flotte & Maintenance
            </h2>
            <p class="fleet-subtitle">Analyse intelligente des vidanges, freins et entretiens par camion</p>
        </div>
        
        <div class="fleet-grid fleet-summary-grid">
            <div class="fleet-card border-blue">
                <div class="fleet-card-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div class="fleet-card-value">${totalInterventions}</div>
                <div class="fleet-card-label">Total Interventions</div>
            </div>
            <div class="fleet-card border-purple">
                <div class="fleet-card-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                </div>
                <div class="fleet-card-value">${uniqueTrucks}</div>
                <div class="fleet-card-label">Camions Distincts</div>
            </div>
            <div class="fleet-card border-orange">
                <div class="fleet-card-icon orange">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                </div>
                <div class="fleet-card-value">${totalVidanges}</div>
                <div class="fleet-card-label">Vidanges Totales</div>
            </div>
            <div class="fleet-card border-green">
                <div class="fleet-card-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div class="fleet-card-value">${_formatMoney(totalCost)}</div>
                <div class="fleet-card-label">Coût Total Maintenance</div>
            </div>
        </div>
        
        <div class="fleet-grid fleet-charts-grid">
            <div class="fleet-card">
                <h3>Répartition par Type de Service</h3>
                <div class="fleet-hbar-container">
                    ${Object.entries(serviceCounts).sort((a,b)=>b[1]-a[1]).map(([type, count]) => `
                        <div class="fleet-hbar-row">
                            <div class="fleet-hbar-label">${_escapeHtml(type)}</div>
                            <div class="fleet-hbar-track">
                                <div class="fleet-hbar-fill" style="width: ${Math.max(5, (count/totalInterventions)*100)}%;"></div>
                            </div>
                            <div class="fleet-hbar-value">${count} (${Math.round((count/totalInterventions)*100)}%)</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="fleet-card">
                <h3>Top 10 Camions (Interventions)</h3>
                <div class="fleet-hbar-container">
                    ${topTrucks.map(([truck, count]) => `
                        <div class="fleet-hbar-row">
                            <div class="fleet-hbar-label">${_escapeHtml(truck)}</div>
                            <div class="fleet-hbar-track">
                                <div class="fleet-hbar-fill blue-fill" style="width: ${Math.max(5, (count/topTrucks[0][1])*100)}%;"></div>
                            </div>
                            <div class="fleet-hbar-value">${count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="fleet-card">
            <h3>Tendance Mensuelle de Maintenance</h3>
            <div class="fleet-trend-chart">
                ${sortedMonths.map(month => {
                    const count = monthlyCounts[month];
                    const maxCount = Math.max(...Object.values(monthlyCounts));
                    const height = Math.max(10, (count / maxCount) * 100);
                    return `
                        <div class="fleet-trend-bar-wrapper">
                            <div class="fleet-trend-val">${count}</div>
                            <div class="fleet-trend-bar" style="height: ${height}%;"></div>
                            <div class="fleet-trend-label">${month}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="fleet-card">
            <h3>Analyse Kilométrique & Vidanges par Camion</h3>
            <div class="table-responsive">
                <table class="data-table fleet-table">
                    <thead>
                        <tr>
                            <th>Camion ID</th>
                            <th>Nbr Vidanges</th>
                            <th>Dernier KM Relevé</th>
                            <th>Dernière Intervention</th>
                            <th>Montant Total Alloué</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedKmAnalysis.map(k => `
                            <tr>
                                <td><strong>${_escapeHtml(k.truckId)}</strong></td>
                                <td><span class="badge ${k.vidangeCount > 2 ? 'badge-warning' : 'badge-neutral'}">${k.vidangeCount}</span></td>
                                <td>${k.lastKm > 0 ? k.lastKm.toLocaleString('fr-FR') + ' KM' : '-'}</td>
                                <td>${_formatDate(k.lastServiceDate)}</td>
                                <td>${_formatMoney(k.totalAmount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="fleet-card">
            <h3>Historique Détaillé des Interventions</h3>
            <div class="table-responsive">
                <table class="data-table fleet-table">
                    <thead>
                        <tr>
                            <th>Réf BC</th>
                            <th>Date</th>
                            <th>Camion</th>
                            <th>Type Service</th>
                            <th>KM</th>
                            <th>Devis</th>
                            <th>Montant TTC</th>
                        </tr>
                    </thead>
                    <tbody id="fleetLogTableBody">
                    </tbody>
                </table>
            </div>
            <div class="pagination-controls" id="fleetPagination">
                <!-- Pagination injected here -->
            </div>
        </div>
    `;
    
    fleetCurrentPage = 1;
    renderFleetTablePage();
}

function renderFleetTablePage() {
    const tbody = document.getElementById('fleetLogTableBody');
    const pagination = document.getElementById('fleetPagination');
    if (!tbody || !pagination) return;
    
    // Sort records by date descending
    const sortedRecords = [...parsedFleetRecordsCache].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    const totalPages = Math.ceil(sortedRecords.length / FLEET_ITEMS_PER_PAGE);
    const startIdx = (fleetCurrentPage - 1) * FLEET_ITEMS_PER_PAGE;
    const endIdx = startIdx + FLEET_ITEMS_PER_PAGE;
    const pageRecords = sortedRecords.slice(startIdx, endIdx);
    
    tbody.innerHTML = pageRecords.map(r => `
        <tr>
            <td>${_escapeHtml(r.reference)}</td>
            <td>${_formatDate(r.date)}</td>
            <td><strong>${_escapeHtml(r.fleetData.truckId)}</strong></td>
            <td><span class="badge badge-info">${_escapeHtml(r.fleetData.serviceType)}</span></td>
            <td>${r.fleetData.kmReading ? r.fleetData.kmReading.toLocaleString('fr-FR') + ' KM' : '-'}</td>
            <td>${_escapeHtml(r.fleetData.devisRef)}</td>
            <td class="amount">${_formatMoney(r.amountTTC)}</td>
        </tr>
    `).join('');
    
    // Render pagination
    let pagHtml = `
        <button class="btn btn-sm btn-outline" ${fleetCurrentPage === 1 ? 'disabled' : ''} onclick="changeFleetPage(${fleetCurrentPage - 1})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Précédent
        </button>
        <span class="page-info">Page ${fleetCurrentPage} / ${totalPages || 1}</span>
        <button class="btn btn-sm btn-outline" ${fleetCurrentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="changeFleetPage(${fleetCurrentPage + 1})">
            Suivant <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
    `;
    pagination.innerHTML = pagHtml;
}

window.changeFleetPage = function(page) {
    fleetCurrentPage = page;
    renderFleetTablePage();
};

// Hook into app's renderActiveTab
const originalRenderActiveTab = window.renderActiveTab;
if (originalRenderActiveTab) {
    window.renderActiveTab = function() {
        originalRenderActiveTab();
        if (window.state && window.state.activeTab === 'reports') {
            console.log('[fleet-analyzer] Rendering fleet analyzer...');
            setTimeout(renderFleetAnalyzer, 100);
        }
    };
    window.fleetHooked = true;
}

// Also hook via direct tab click for reliability
document.querySelectorAll('.tab[data-tab="reports"]').forEach(tab => {
    tab.addEventListener('click', () => {
        console.log('[fleet-analyzer] Reports tab clicked');
        setTimeout(renderFleetAnalyzer, 200);
    });
});

// Trigger on initial load
setTimeout(() => {
    if (window.state && window.state.activeTab === 'reports') {
        renderFleetAnalyzer();
    }
}, 500);

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .fleet-analyzer-header {
        margin: 30px 0 20px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
    }
    .fleet-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-color);
        margin: 0 0 5px 0;
    }
    .fleet-subtitle {
        color: var(--text-muted);
        margin: 0;
        font-size: 0.9rem;
    }
    
    .fleet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    .fleet-charts-grid {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }
    
    .fleet-card {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .fleet-card.border-blue { border-left: 4px solid var(--primary-color); }
    .fleet-card.border-purple { border-left: 4px solid #8b5cf6; }
    .fleet-card.border-orange { border-left: 4px solid #f59e0b; }
    .fleet-card.border-green { border-left: 4px solid #10b981; }
    
    .fleet-card-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
    }
    .fleet-card-icon.blue { background: rgba(37, 99, 235, 0.1); color: var(--primary-color); }
    .fleet-card-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .fleet-card-icon.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .fleet-card-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    
    .fleet-card-value {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 5px;
        color: var(--text-color);
    }
    .fleet-card-label {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    
    .fleet-hbar-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 15px;
    }
    .fleet-hbar-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.85rem;
    }
    .fleet-hbar-label {
        width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .fleet-hbar-track {
        flex: 1;
        height: 8px;
        background: var(--bg-color);
        border-radius: 4px;
        overflow: hidden;
    }
    .fleet-hbar-fill {
        height: 100%;
        background: var(--primary-color);
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    .fleet-hbar-fill.blue-fill {
        background: #3b82f6;
    }
    .fleet-hbar-value {
        width: 60px;
        text-align: right;
        font-weight: 500;
    }
    
    .fleet-trend-chart {
        display: flex;
        align-items: flex-end;
        height: 200px;
        gap: 10px;
        padding-top: 20px;
        margin-top: 15px;
        overflow-x: auto;
    }
    .fleet-trend-bar-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        min-width: 40px;
        height: 100%;
        justify-content: flex-end;
    }
    .fleet-trend-bar {
        width: 100%;
        max-width: 40px;
        background: var(--primary-color);
        border-radius: 4px 4px 0 0;
        min-height: 2px;
        transition: height 0.3s ease;
    }
    .fleet-trend-val {
        font-size: 0.8rem;
        font-weight: bold;
        margin-bottom: 5px;
    }
    .fleet-trend-label {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 8px;
        transform: rotate(-45deg);
        transform-origin: left;
        white-space: nowrap;
    }
    
    .fleet-table {
        margin-top: 15px;
        width: 100%;
        border-collapse: collapse;
    }
    .fleet-table th, .fleet-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
    }
    .fleet-table th {
        font-weight: 600;
        color: var(--text-muted);
    }
    .fleet-table .amount {
        text-align: right;
    }
    .badge-info {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    .badge-warning {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    .badge-neutral {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    
    .pagination-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin-top: 20px;
    }
    .btn {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--surface-color);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);
