/**
 * app-enhancements.js
 * Extended functionality loaded after app.js and data-preload.js
 */

// 1. STANDARDIZED DEPARTMENTS & AUTO-MIGRATION (6 EXCLUSIVE SERVICES)
const STANDARDIZED_DEPARTMENTS = [
  'Direction Générale',
  'Maintenance & Parc',
  'Approvisionnements',
  'Exploitation',
  'Finances & Comptabilité',
  'Magasin Central'
];
window.STANDARDIZED_DEPARTMENTS = STANDARDIZED_DEPARTMENTS;

function normalizeDepartment(dept, supplierName = '', requester = '') {
  const d = String(dept || '').trim();
  const dLower = d.toLowerCase();
  const s = String(supplierName || '').trim().toLowerCase();
  const r = String(requester || '').trim().toLowerCase();
  const combined = `${dLower} ${s} ${r}`;

  if (STANDARDIZED_DEPARTMENTS.includes(d)) return d;

  // 1. Direction Générale
  if (dLower.includes('direction') || dLower.includes('général') || dLower.includes('general') || dLower === 'dg' || combined.includes('direction générale') || combined.includes('direction generale')) {
    return 'Direction Générale';
  }
  // 2. Finances & Comptabilité
  if (dLower.includes('compta') || dLower.includes('financ') || combined.includes('banque') || combined.includes('cpa') || combined.includes('bna') || combined.includes('bea') || combined.includes('notaire') || combined.includes('commissaire')) {
    return 'Finances & Comptabilité';
  }
  // 3. Approvisionnements
  if (dLower.includes('appro') || dLower.includes('achat') || combined.includes('approvisionnement')) {
    return 'Approvisionnements';
  }
  // 4. Magasin Central
  if (dLower.includes('magasin') || dLower.includes('stock') || combined.includes('inventaire') || combined.includes('outillage')) {
    return 'Magasin Central';
  }
  // 5. Exploitation
  if (dLower.includes('operation') || dLower.includes('opération') || dLower.includes('exploit') || combined.includes('logistique') || combined.includes('manutention') || combined.includes('fret')) {
    return 'Exploitation';
  }
  // 6. Maintenance & Parc (Default for transport, fleet, parts, repair, oils, tyres, etc.)
  if (dLower.includes('transport') || dLower.includes('parc') || dLower.includes('maint') || dLower.includes('garage') || dLower.includes('atelier') ||
      combined.includes('truck') || combined.includes('oil') || combined.includes('naftal') || combined.includes('petro') ||
      combined.includes('sebouba') || combined.includes('pneu') || combined.includes('filtre') || combined.includes('reparation') ||
      combined.includes('vidange')) {
    return 'Maintenance & Parc';
  }

  return 'Maintenance & Parc';
}
window.normalizeDepartment = normalizeDepartment;

function getDepartmentBadge(dept) {
  const d = normalizeDepartment(dept);
  const colorMap = {
    'Direction Générale': { bg: 'rgba(136, 19, 55, 0.12)', text: '#881337', border: 'rgba(136, 19, 55, 0.28)', icon: 'fa-crown' },
    'Maintenance & Parc': { bg: 'rgba(37, 99, 235, 0.12)', text: '#1d4ed8', border: 'rgba(37, 99, 235, 0.28)', icon: 'fa-wrench' },
    'Approvisionnements': { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284c7', border: 'rgba(2, 132, 199, 0.28)', icon: 'fa-shopping-cart' },
    'Exploitation': { bg: 'rgba(79, 70, 229, 0.12)', text: '#4f46e5', border: 'rgba(79, 70, 229, 0.28)', icon: 'fa-route' },
    'Finances & Comptabilité': { bg: 'rgba(13, 148, 136, 0.12)', text: '#0d9488', border: 'rgba(13, 148, 136, 0.28)', icon: 'fa-coins' },
    'Magasin Central': { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed', border: 'rgba(124, 58, 237, 0.28)', icon: 'fa-warehouse' }
  };
  const style = colorMap[d] || { bg: 'rgba(148, 163, 184, 0.15)', text: '#475569', border: 'rgba(148, 163, 184, 0.35)', icon: 'fa-building' };
  return `<span class="dept-pill dept-badge" style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:6px;background:${style.bg};color:${style.text};border:1px solid ${style.border};white-space:nowrap;"><i class="fas ${style.icon}" style="font-size:0.7rem;"></i>${d}</span>`;
}
window.getDepartmentBadge = getDepartmentBadge;

const DEPT_MAP = {
  'MAGHREB TRUCK': 'Maintenance & Parc',
  'BPP OIL': 'Maintenance & Parc',
  'BPPOIL': 'Maintenance & Parc',
  'NAFTAL': 'Maintenance & Parc',
  'PETRO BARAKA': 'Maintenance & Parc',
  'SEBOUBA': 'Maintenance & Parc',
};

function autoDept(supplierName) {
  return normalizeDepartment('', supplierName);
}

// 2. Override normalizeBcRecord to add new fields and enforce standardized department
const _baseNormalizeBcRecord = window.normalizeBcRecord;
window.normalizeBcRecord = function(row = {}) {
  const base = _baseNormalizeBcRecord(row);
  const dept = normalizeDepartment(row.department || base.department, row.supplierName || base.supplierName, row.requester || base.requester);
  return {
    ...base,
    tva: Number(row.tva || 0) || 0,
    remise: Number(row.remise || 0) || 0,
    transport: Number(row.transport || 0) || 0,
    timbre: Number(row.timbre || 0) || 0,
    department: dept,
    requester: String(row.requester || dept).trim(),
    remarques: String(row.remarques || '').trim(),
    subfolder: String(row.subfolder || '').trim(),
  };
};

// 3. Inject PRELOAD_DATA into state if available (optional — app works without it)
(function injectPreloadData() {
  if (state.suppliers) {
    state.suppliers = state.suppliers.map(s => typeof s === "string" ? { id: "sup_" + Math.random().toString(36).substr(2, 6), name: s } : s);
  }
  if (state.requesters) {
    state.requesters = state.requesters.map(r => typeof r === "string" ? { id: "req_" + Math.random().toString(36).substr(2, 6), name: r } : r);
  }
  // Clean up legacy reset flags and ensure clean 361 records preload
  const SUIVI_DATA_VERSION = 'v2026_04_canonical_364';
  try {
    localStorage.removeItem('suivi_reset_v15');
    if (localStorage.getItem('suivi_data_version') !== SUIVI_DATA_VERSION) {
      localStorage.removeItem('suivi-achats-state');
      localStorage.removeItem('suivi_achats_v3');
      localStorage.removeItem('sde_suivi_state');
      localStorage.removeItem('sde_suivi_cache');
      localStorage.setItem('suivi_data_version', SUIVI_DATA_VERSION);
      console.log('[app-enhancements] Suivi state cache refreshed: 361 clean BCs, 148 DPs.');
    }
  } catch (e) {}

  if (!window.PRELOAD_DATA || !window.PRELOAD_DATA.bcRecords) {
    console.log('[app-enhancements] No PRELOAD_DATA found — using localStorage data only. Import JSON via Paramètres.');
    state.bcRecords.forEach(rec => {
      rec.department = normalizeDepartment(rec.department, rec.supplierName, rec.requester);
      if (!rec.requester) rec.requester = rec.department;
    });
    return;
  }
  
  const preloadRecords = window.PRELOAD_DATA.bcRecords;
  if (!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) {
    state.bcRecords = preloadRecords.map(normalizeBcRecord);
  }
  const existingRefs = new Map(state.bcRecords.map(r => [r.ref, r]));
  
  preloadRecords.forEach(preloadRec => {
    if (existingRefs.has(preloadRec.ref)) {
      const rec = existingRefs.get(preloadRec.ref);
      if (preloadRec.supplierName) rec.supplierName = preloadRec.supplierName;
      if (preloadRec.description) rec.description = preloadRec.description;
      if (preloadRec.type) rec.type = preloadRec.type;
      rec.tva = Number(preloadRec.tva || 0) || 0;
      rec.remise = Number(preloadRec.remise || 0) || 0;
      rec.transport = Number(preloadRec.transport || 0) || 0;
      rec.timbre = Number(preloadRec.timbre || 0) || 0;
      rec.department = normalizeDepartment(preloadRec.department || rec.department, rec.supplierName, rec.requester);
      if (!rec.requester) rec.requester = rec.department;
      if (preloadRec.remarques) rec.remarques = preloadRec.remarques;
      if (preloadRec.subfolder) rec.subfolder = preloadRec.subfolder;
      if (preloadRec.lineItems && preloadRec.lineItems.length > 0) rec.lineItems = preloadRec.lineItems;
      if (preloadRec.amountHT) rec.amountHT = preloadRec.amountHT;
      if (preloadRec.amountTTC) { rec.amountTTC = preloadRec.amountTTC; rec.amount = preloadRec.amountTTC; }
      if (rec.amountTTC > 100000000 || rec.amount > 100000000) {
        rec.amountTTC = Number(preloadRec.amountTTC || preloadRec.amount || 0);
        rec.amount = rec.amountTTC;
      }
      if (preloadRec.date) rec.date = preloadRec.date;
      if (preloadRec.daRef) rec.daRef = preloadRec.daRef;
      if (preloadRec.status) rec.status = preloadRec.status;
      if (preloadRec.daStatus) rec.daStatus = preloadRec.daStatus;
      if (preloadRec.daValidatedAt) rec.daValidatedAt = preloadRec.daValidatedAt;
      if (preloadRec.goodsReceivedDate !== undefined) rec.goodsReceivedDate = preloadRec.goodsReceivedDate;
      if (preloadRec.serviceDoneDate !== undefined) rec.serviceDoneDate = preloadRec.serviceDoneDate;
      if (preloadRec.requester) rec.requester = preloadRec.requester;
      if (preloadRec.comments) rec.comments = preloadRec.comments;
      if (preloadRec.notes) rec.notes = preloadRec.notes;
      if (preloadRec.paymentTerms) rec.paymentTerms = preloadRec.paymentTerms;
      if (preloadRec.promisedDate) rec.promisedDate = preloadRec.promisedDate;
    } else {
      const base = normalizeBcRecord(preloadRec);
      base.tva = Number(preloadRec.tva || 0) || 0;
      base.remise = Number(preloadRec.remise || 0) || 0;
      base.transport = Number(preloadRec.transport || 0) || 0;
      base.timbre = Number(preloadRec.timbre || 0) || 0;
      base.department = normalizeDepartment(preloadRec.department || base.department, preloadRec.supplierName, preloadRec.requester);
      if (!base.requester) base.requester = base.department;
      base.remarques = String(preloadRec.remarques || '').trim();
      base.subfolder = String(preloadRec.subfolder || '').trim();
      state.bcRecords.push(base);
      existingRefs.set(base.ref, base);
    }
  });

  // Guarantee migration on all bcRecords
  state.bcRecords.forEach(r => {
    r.department = normalizeDepartment(r.department, r.supplierName, r.requester);
    if (!r.requester) r.requester = r.department;
  });
  
  // Merge suppliers and filter out any bogus Schmitz Cargobull entry
  if (window.PRELOAD_DATA.suppliers) {
    const sSet = new Set();
    const cleanList = [];
    window.PRELOAD_DATA.suppliers.forEach(s => {
      const sName = typeof s === 'object' ? s.name : s;
      if (sName && !/schmi/i.test(sName) && !sSet.has(sName)) {
        sSet.add(sName);
        cleanList.push(typeof s === "object" ? s : { id: "sup_" + Math.random().toString(36).substr(2, 6), name: sName });
      }
    });
    state.suppliers = cleanList;
  }
  
  // Merge requesters
  if (window.PRELOAD_DATA.requesters) {
    const rSet = new Set(state.requesters.map(r => typeof r === 'object' ? r.name : r));
    window.PRELOAD_DATA.requesters.forEach(r => {
      const rName = typeof r === 'object' ? r.name : r;
      if (!rSet.has(rName)) state.requesters.push(typeof r === "object" ? r : { id: "req_" + Math.random().toString(36).substr(2, 6), name: rName });
    });
  }
  
  // Merge payments
  if (window.PRELOAD_DATA.payments) {
    const pSet = new Set(state.payments.map(p => p.id));
    window.PRELOAD_DATA.payments.forEach(p => {
      if (!pSet.has(p.id)) state.payments.push(p);
      else {
        const idx = state.payments.findIndex(x => x.id === p.id);
        if (idx !== -1) state.payments[idx] = p;
      }
    });
  }
  
  // Update sequences
  state.settings.bcSequence = Math.max(state.settings.bcSequence || 0, 307);
  state.settings.daSequence = Math.max(state.settings.daSequence || 0, 263);
  
  // Ensure all BPP OIL and MAGHREB TRUCK records are marked done from March 1st 2026 (keeping real dates if present!)
  let bppMtUpdated = 0;
  state.bcRecords.forEach(r => {
    if (/MAGHREB/i.test(r.supplierName || '')) {
      r.type = 'service';
      if (!r.status || r.status === 'importe' || r.status === 'draft') r.status = 'clos';
      r.daStatus = 'validated';
      const dStr = r.date || '2026-03-01';
      if (!r.daValidatedAt) r.daValidatedAt = dStr + 'T09:00:00.000Z';
      
      if (!r.serviceDoneDate) {
        let doneDate = '';
        if (dStr < '2026-03-01') {
          doneDate = '2026-03-01';
        } else {
          const d = new Date(dStr);
          d.setDate(d.getDate() + 1); // 1 day for service
          doneDate = d.toISOString().split('T')[0];
        }
        r.serviceDoneDate = doneDate;
        bppMtUpdated++;
      }
      r.goodsReceivedDate = '';
    } else if (/BPP/i.test(r.supplierName || '')) {
      r.type = 'achat';
      if (!r.status || r.status === 'importe' || r.status === 'draft') r.status = 'clos';
      r.daStatus = 'validated';
      const dStr = r.date || '2026-03-01';
      if (!r.daValidatedAt) r.daValidatedAt = dStr + 'T09:00:00.000Z';
      
      if (!r.goodsReceivedDate) {
        let doneDate = '';
        if (dStr < '2026-03-01') {
          doneDate = '2026-03-02';
        } else {
          const d = new Date(dStr);
          d.setDate(d.getDate() + 2); // 2 days for achat
          doneDate = d.toISOString().split('T')[0];
        }
        r.goodsReceivedDate = doneDate;
        bppMtUpdated++;
      }
      r.serviceDoneDate = '';
    }
  });
  if (bppMtUpdated > 0) {
    console.log('[app-enhancements] Ensured ' + bppMtUpdated + ' BPP OIL (achat) / MAGHREB TRUCK (service) records are completed from March 1st 2026.');
  }

  saveState();
  console.log('[app-enhancements] Loaded ' + state.bcRecords.length + ' BC records');
})();

// 4. Multi-Select Supplier & Snapshot Retention Filtering Logic
if (!Array.isArray(state.ui.selectedSuppliers)) {
  state.ui.selectedSuppliers = [];
}
state.ui.isFilteredActive = false;
state.ui.activeFilteredIds = null;

function getSelectedSuppliers() {
  if (!Array.isArray(state.ui.selectedSuppliers)) {
    state.ui.selectedSuppliers = [];
  }
  return state.ui.selectedSuppliers;
}

function updateSupplierTriggerLabel() {
  const labelEl = $('supplierMultiSelectLabel');
  if (!labelEl) return;
  const sel = getSelectedSuppliers();
  const total = state.ui.allSuppliersList ? state.ui.allSuppliersList.length : 0;
  if (!sel || sel.length === 0 || (total > 0 && sel.length === total)) {
    labelEl.textContent = 'Fournisseurs : Tous';
    labelEl.title = 'Tous les fournisseurs';
  } else if (sel.length === 1) {
    const first = sel[0];
    labelEl.textContent = first.length > 22 ? first.substring(0, 20) + '...' : first;
    labelEl.title = first;
  } else if (sel.length === 2) {
    labelEl.textContent = `${sel[0].substring(0, 10)}..., ${sel[1].substring(0, 10)}...`;
    labelEl.title = sel.join(', ');
  } else {
    labelEl.textContent = `Fournisseurs (${sel.length})`;
    labelEl.title = sel.join(', ');
  }
}

function refreshSupplierMultiSelectOptions() {
  const sups = [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  state.ui.allSuppliersList = sups;
  
  const listEl = $('supplierMultiSelectList');
  if (!listEl) return;
  
  const currentSel = getSelectedSuppliers();
  const searchVal = ($('supplierMultiSelectSearch')?.value || '').toLowerCase().trim();
  
  listEl.innerHTML = '';
  sups.forEach(s => {
    const isChecked = currentSel.includes(s);
    const isVisible = !searchVal || s.toLowerCase().includes(searchVal);
    
    const label = document.createElement('label');
    label.className = 'multi-select-item';
    if (!isVisible) label.style.display = 'none';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = s;
    cb.checked = isChecked;
    
    cb.addEventListener('change', () => {
      const sel = getSelectedSuppliers();
      if (cb.checked) {
        if (!sel.includes(s)) sel.push(s);
      } else {
        state.ui.selectedSuppliers = sel.filter(x => x !== s);
      }
      updateSupplierTriggerLabel();
    });
    
    const span = document.createElement('span');
    span.textContent = s;
    span.title = s;
    
    label.appendChild(cb);
    label.appendChild(span);
    listEl.appendChild(label);
  });
  
  updateSupplierTriggerLabel();
}

function computeFreshFilteredBcRecords() {
  const q = normalizeText($('followupSearch')?.value || '');
  const validation = $('followupValidationFilter')?.value || 'all';
  const status = $('followupStatusFilter')?.value || 'all';
  const type = $('followupTypeFilter')?.value || 'all';
  const requester = $('followupRequesterFilter')?.value || 'all';
  const dept = $('followupDeptFilter')?.value || 'all';
  const dateFrom = $('followupDateFrom')?.value || '';
  const dateTo = $('followupDateTo')?.value || '';
  const sortField = $('followupSortField')?.value || state.ui.followupSortField || 'date';
  const sortDir = $('followupSortDir')?.value || state.ui.followupSortDir || 'desc';
  state.ui.followupSortField = sortField;
  state.ui.followupSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;

  const selList = getSelectedSuppliers();
  const allSupsCount = state.ui.allSuppliersList ? state.ui.allSuppliersList.length : 0;
  const hasSupplierFilter = selList.length > 0 && (allSupsCount === 0 || selList.length < allSupsCount);

  return state.bcRecords
    .filter((row) => {
      if (validation === 'validated' && row.daStatus !== 'validated') return false;
      if (validation === 'draft' && row.daStatus === 'validated') return false;
      if (status !== 'all' && row.status !== status) return false;
      if (type !== 'all' && row.type !== type) return false;
      if (hasSupplierFilter && !selList.includes(row.supplierName)) return false;
      if (requester !== 'all' && row.requester !== requester) return false;
      if (dept !== 'all' && (row.department || '') !== dept) return false;
      if (dateFrom && String(row.date || '') < dateFrom) return false;
      if (dateTo && String(row.date || '') > dateTo) return false;
      if (!q) return true;
      const hay = normalizeText([row.ref, row.daRef, row.supplierName, row.requester, row.description, row.paymentTerms, row.comments, row.notes, row.department, row.remarques].join(' | '));
      return hay.includes(q);
    })
    .sort((a, b) => {
      const av = sortComparableBc(a, sortField);
      const bv = sortComparableBc(b, sortField);
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) return (av - bv) * dir;
      } else {
        const cmp = String(av).localeCompare(String(bv), 'fr', { numeric: true, sensitivity: 'base' });
        if (cmp) return cmp * dir;
      }
      const byDate = String(b.date || '').localeCompare(String(a.date || ''));
      if (byDate) return byDate;
      return Number(extractBcSerial(b.ref) || 0) - Number(extractBcSerial(a.ref) || 0);
    });
}

// Override filteredBcRecords: when isFilteredActive is true, keep exactly the active records!
window.filteredBcRecords = function() {
  const sortField = $('followupSortField')?.value || state.ui.followupSortField || 'date';
  const sortDir = $('followupSortDir')?.value || state.ui.followupSortDir || 'desc';
  state.ui.followupSortField = sortField;
  state.ui.followupSortDir = sortDir;
  const dir = sortDir === 'asc' ? 1 : -1;

  if (state.ui.isFilteredActive && Array.isArray(state.ui.activeFilteredIds)) {
    const idSet = new Set(state.ui.activeFilteredIds);
    return state.bcRecords
      .filter(row => idSet.has(row.id))
      .sort((a, b) => {
        const av = sortComparableBc(a, sortField);
        const bv = sortComparableBc(b, sortField);
        if (typeof av === 'number' && typeof bv === 'number') {
          if (av !== bv) return (av - bv) * dir;
        } else {
          const cmp = String(av).localeCompare(String(bv), 'fr', { numeric: true, sensitivity: 'base' });
          if (cmp) return cmp * dir;
        }
        const byDate = String(b.date || '').localeCompare(String(a.date || ''));
        if (byDate) return byDate;
        return Number(extractBcSerial(b.ref) || 0) - Number(extractBcSerial(a.ref) || 0);
      });
  }

  return computeFreshFilteredBcRecords();
};

window.applyFollowupFilter = function() {
  state.ui.isFilteredActive = false;
  state.ui.activeFilteredIds = null;
  const fresh = computeFreshFilteredBcRecords();
  state.ui.activeFilteredIds = fresh.map(r => r.id);
  state.ui.isFilteredActive = true;
  if (typeof resetFollowupPage === 'function') resetFollowupPage();
  if (typeof renderFollowupTable === 'function') renderFollowupTable();
  const count = fresh.length;
  showToast(`Filtre appliqué : ${count} bon${count > 1 ? 's' : ''} de commande affiché${count > 1 ? 's' : ''}`);
};

const _baseResetFollowupFilters = window.resetFollowupFilters;
window.resetFollowupFilters = function() {
  state.ui.isFilteredActive = false;
  state.ui.activeFilteredIds = null;
  state.ui.selectedSuppliers = [];
  
  if (typeof _baseResetFollowupFilters === 'function') {
    _baseResetFollowupFilters();
  }
  
  if ($('followupDeptFilter')) $('followupDeptFilter').value = 'all';
  
  const checkboxes = document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSupplierTriggerLabel();

  if (typeof resetFollowupPage === 'function') resetFollowupPage();
  if (typeof renderFollowupTable === 'function') renderFollowupTable();
};

// 5. Override refreshFollowupFilterOptions to also populate department filter and supplier multi-select
const _baseRefreshFollowupFilterOptions = window.refreshFollowupFilterOptions;
window.refreshFollowupFilterOptions = function() {
  _baseRefreshFollowupFilterOptions();
  
  const depts = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
  const deptSelect = $('followupDeptFilter');
  if (deptSelect) {
    const currentDept = deptSelect.value;
    deptSelect.innerHTML = '<option value="all">Toutes les structures</option>';
    depts.forEach(d => {
      deptSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
    if (depts.includes(currentDept)) deptSelect.value = currentDept;
  }
  
  const kpiDeptFilter = $('kpiDeptFilter');
  if (kpiDeptFilter) {
    const currentKpiDept = kpiDeptFilter.value;
    kpiDeptFilter.innerHTML = '<option value="all">Toutes les structures</option>';
    depts.forEach(d => {
      kpiDeptFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
    if (depts.includes(currentKpiDept)) kpiDeptFilter.value = currentKpiDept;
  }

  refreshSupplierMultiSelectOptions();
};

// 6. Override renderFollowupTable — summary cards, page-size, fixed actions
window.renderFollowupTable = function() {
  const tbody = $('followupTableBody');
  if (!tbody) return;
  
  let rows = filteredBcRecords();
  const totalRows = rows.length;
  
  // --- Summary cards above the table ---
  let summaryBar = document.getElementById('followupSummaryBar');
  if (!summaryBar) {
    summaryBar = document.createElement('div');
    summaryBar.id = 'followupSummaryBar';
    summaryBar.className = 'followup-summary-bar';
    const tableShell = tbody.closest('.table-shell') || tbody.closest('.panel');
    if (tableShell) tableShell.parentNode.insertBefore(summaryBar, tableShell);
  }
  const totalTTC = rows.reduce((s, r) => s + (Number(r.amountTTC) || 0), 0);
  const totalHT = rows.reduce((s, r) => s + (Number(r.amountHT) || 0), 0);
  const totalCreance = rows.filter(r => r.status !== 'paye' && !r.paymentPaidDate).reduce((s, r) => s + (Number(r.amountTTC || r.amount) || 0), 0);
  const achatCount = rows.filter(r => r.type === 'achat').length;
  const serviceCount = rows.filter(r => r.type === 'service').length;
  const deliveredCount = rows.filter(r => r.goodsReceivedDate || r.serviceDoneDate).length;
  const supplierCount = new Set(rows.map(r => r.supplierName).filter(Boolean)).size;
  summaryBar.innerHTML = `
    <div class="summary-card"><div class="summary-value">${totalRows}</div><div class="summary-label">BC filtrés</div></div>
    <div class="summary-card"><div class="summary-value">${formatMoney(totalTTC, 'DZD')}</div><div class="summary-label">Total TTC</div></div>
    <div class="summary-card" style="border-left:3px solid #ef4444;"><div class="summary-value" style="color:#ef4444;">${formatMoney(totalCreance, 'DZD')}</div><div class="summary-label">Créances Dues</div></div>
    <div class="summary-card"><div class="summary-value">${achatCount} / ${serviceCount}</div><div class="summary-label">Achats / Services</div></div>
    <div class="summary-card"><div class="summary-value">${deliveredCount}</div><div class="summary-label">Livrés</div></div>
    <div class="summary-card"><div class="summary-value">${supplierCount}</div><div class="summary-label">Fournisseurs</div></div>
  `;

  // --- Pagination with page-size selector ---
  const pageSize = state.ui.followupPageSize || 10;
  const usePaging = pageSize > 0;
  const totalPages = usePaging ? (Math.ceil(totalRows / pageSize) || 1) : 1;
  if (state.ui.followupPage > totalPages) state.ui.followupPage = totalPages;
  if (state.ui.followupPage < 1) state.ui.followupPage = 1;
  
  const startIndex = usePaging ? (state.ui.followupPage - 1) * pageSize : 0;
  const endIndex = usePaging ? Math.min(startIndex + pageSize, totalRows) : totalRows;
  const pageRows = rows.slice(startIndex, endIndex);
  
  // --- Top Pagination / Scroll ---
  let topPagination = document.getElementById('followupTopPagination');
  if (!topPagination) {
    topPagination = document.createElement('div');
    topPagination.id = 'followupTopPagination';
    topPagination.className = 'pagination-controls';
    topPagination.style.justifyContent = 'space-between';
    topPagination.style.marginBottom = '0.5rem';
    topPagination.style.padding = '0.2rem 0';
    summaryBar.parentNode.insertBefore(topPagination, summaryBar.nextSibling);
  }
  
  let topPagHtml = `<div style="display:flex;gap:0.4rem;align-items:center;">
    <button class="btn btn-ghost top-scroll-left" title="Défiler à gauche">← Défiler</button>
    <button class="btn btn-ghost top-scroll-right" title="Défiler à droite">Défiler →</button>
  </div>
  <div style="display:flex;gap:0.4rem;align-items:center;">
    <span class="pag-info">${usePaging && totalPages > 1 ? (startIndex+1) + '–' + endIndex + ' / ' + totalRows : totalRows + ' résultats'}</span>
    <select id="followupTopPageSize" class="page-size-select" title="Lignes par page">
      <option value="10" ${pageSize===10?'selected':''}>10</option>
      <option value="25" ${pageSize===25?'selected':''}>25</option>
      <option value="50" ${pageSize===50?'selected':''}>50</option>
      <option value="100" ${pageSize===100?'selected':''}>100</option>
      <option value="0" ${pageSize===0||pageSize>100?'selected':''}>Tout</option>
    </select>
  </div>`;
  topPagination.innerHTML = topPagHtml;
  
  const topPageSizeSelect = topPagination.querySelector('#followupTopPageSize');
  if (topPageSizeSelect) {
    topPageSizeSelect.addEventListener('change', () => {
      state.ui.followupPageSize = parseInt(topPageSizeSelect.value);
      state.ui.followupPage = 1;
      renderFollowupTable();
    });
  }
  const btnLeft = topPagination.querySelector('.top-scroll-left');
  const btnRight = topPagination.querySelector('.top-scroll-right');
  const tableShellTop = tbody.closest('.table-shell');
  if (btnLeft && tableShellTop) {
    btnLeft.addEventListener('click', () => {
      tableShellTop.scrollBy({ left: -300, behavior: 'smooth' });
    });
  }
  if (btnRight && tableShellTop) {
    btnRight.addEventListener('click', () => {
      tableShellTop.scrollBy({ left: 300, behavior: 'smooth' });
    });
  }

  tbody.innerHTML = '';
  if (pageRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:2.5rem;color:var(--muted);"><i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.5;"></i>Aucun bon de commande trouvé. Cliquez sur <strong>➕ Nouveau Bon de Commande</strong> pour en créer un.</td></tr>';
  } else {
    pageRows.forEach(row => {
      const delay = computeDelay(row);
      const actual = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate || '') : (row.goodsReceivedDate || row.serviceDoneDate || '');
      let remarquesTrunc = row.remarques || '';
      if (remarquesTrunc.length > 30) remarquesTrunc = remarquesTrunc.substring(0, 30) + '…';
      const deptHtml = getDepartmentBadge(row.department || row.requester);
      
      const isDaValidated = row.daStatus === 'validated';
      const daDateStr = row.daValidatedAt ? formatDate(row.daValidatedAt) : '';
      const daHtml = isDaValidated
        ? `<div><strong>${escapeHtml(row.daRef || 'DA validée')}</strong><span class="status-pill status-valide" style="font-size:0.68rem;padding:1px 5px;display:block;margin-top:2px;">✓ ${escapeHtml(daDateStr || 'Validée')}</span></div>`
        : `<div><span class="muted" style="font-size:0.8rem;">${escapeHtml(row.daRef || '—')}</span><span class="status-pill status-da-pending" style="font-size:0.68rem;padding:1px 5px;display:block;margin-top:2px;">En attente</span></div>`;
      
      let delayHtml = '';
      if (actual) {
        let daysDiff = '';
        if (row.date) {
          const t1 = new Date(row.date).getTime();
          const t2 = new Date(actual).getTime();
          if (!isNaN(t1) && !isNaN(t2)) {
            const d = Math.round((t2 - t1) / (1000 * 3600 * 24));
            daysDiff = d >= 0 ? `+${d}j` : `${d}j`;
          }
        }
        delayHtml = `<div><strong>${escapeHtml(formatDate(actual))}</strong>${daysDiff ? `<span style="display:inline-block;margin-left:4px;font-size:0.7rem;padding:1px 5px;border-radius:4px;background:rgba(16,185,129,0.15);color:#059669;font-weight:700;">${daysDiff}</span>` : ''}</div>`;
      } else {
        delayHtml = '<span class="muted" style="font-size:0.75rem;">Pas encore</span>';
      }

      let validateDeliverBtn = '';
      if (!isDaValidated) {
        validateDeliverBtn = `<button type="button" class="btn-open-validate-da icon-btn" data-id="${row.id}" title="Valider la DA (définir la date)" aria-label="Valider DA" style="color:#2563eb;background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.25);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span></button>`;
      } else if (!actual) {
        validateDeliverBtn = `<button type="button" class="btn-open-deliver-bc icon-btn" data-id="${row.id}" title="Enregistrer livraison / fin de service" aria-label="Enregistrer livraison" style="color:#0284c7;background:rgba(2,132,199,0.1);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span></button>`;
      } else {
        validateDeliverBtn = `<button type="button" class="btn-open-deliver-bc icon-btn" data-id="${row.id}" title="Livré le ${escapeHtml(formatDate(actual))} (Modifier date)" aria-label="Livré" style="color:#16a34a;background:rgba(22,163,74,0.1);"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="m6 9 2 2 4-4" stroke-width="2"/></svg></span></button>`;
      }

      const imp = (typeof ApproNextGen !== 'undefined' && ApproNextGen.classifyBcImportance) ? ApproNextGen.classifyBcImportance(row) : 'normal';
      const impLabel = imp === 'critical' ? '🔴 Critique' : (imp === 'high' ? '🟠 Haute' : '🔵 Standard');
      const impClass = `badge-imp-${imp}`;
      const impBadge = `<span class="badge-importance ${impClass}" style="margin-top:3px;display:inline-block;">${impLabel}</span>`;
      const stockBadge = (typeof getBcStockBadge === 'function') ? getBcStockBadge(row) : ((typeof window !== 'undefined' && typeof window.getBcStockBadge === 'function') ? window.getBcStockBadge(row) : '');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(row.ref)}</strong><div>${impBadge}</div>${stockBadge ? `<div style="margin-top:4px;">${stockBadge}</div>` : ''}</td>
        <td>${daHtml}</td>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(row.supplierName || '—')}</td>
        <td>${escapeHtml(row.requester || '—')}</td>
        <td>${deptHtml}</td>
        <td><span class="badge bg-${row.type === 'service' ? 'info' : 'secondary'} text-white" style="font-size:11px;padding:3px 6px;">${escapeHtml(row.type === 'service' ? 'Service' : 'Achat')}</span></td>
        <td class="amount-ht">${escapeHtml(formatMoney(row.amountHT || (row.amountTTC ? Math.round(row.amountTTC / 1.19) : 0), 'DZD'))}</td>
        <td class="amount-ttc"><strong>${escapeHtml(formatMoney(row.amountTTC || row.amount || 0, 'DZD'))}</strong></td>
        <td><span class="status-pill ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span></td>
        <td>${delayHtml}</td>
        <td class="remarques-cell" title="${escapeHtml(row.remarques || '')}">${escapeHtml(remarquesTrunc) || '—'}</td>
        <td class="actions-cell">
          <div class="table-actions icon-actions">
            <button type="button" class="view-bc-btn icon-btn" data-action="view-bc" data-id="${row.id}" title="Détails" aria-label="Détails"><span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/></svg></span></button>
            ${iconActionButton('edit', 'edit-bc', row.id, 'Modifier')}
            ${validateDeliverBtn}
            ${iconActionButton('pay', 'pay-bc', row.id, 'Paiements')}
            ${iconActionButton('delete', 'delete-bc', row.id, 'Supprimer')}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- Pagination with page-size ---
  const paginationEl = $('followupPagination');
  if (paginationEl) {
    let pagHtml = `<div class="pagination-controls">`;
    pagHtml += `<select id="followupPageSize" class="page-size-select" title="Lignes par page">
      <option value="10" ${pageSize===10?'selected':''}>10</option>
      <option value="25" ${pageSize===25?'selected':''}>25</option>
      <option value="50" ${pageSize===50?'selected':''}>50</option>
      <option value="100" ${pageSize===100?'selected':''}>100</option>
      <option value="0" ${pageSize===0||pageSize>100?'selected':''}>Tout</option>
    </select>`;
    if (usePaging && totalPages > 1) {
      pagHtml += `<span class="pag-info">${startIndex+1}–${endIndex} / ${totalRows}</span>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="1" ${state.ui.followupPage<=1?'disabled':''}>«</button>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${state.ui.followupPage-1}" ${state.ui.followupPage<=1?'disabled':''}>‹</button>`;
      const start = Math.max(1, state.ui.followupPage - 2);
      const end = Math.min(totalPages, state.ui.followupPage + 2);
      for (let i = start; i <= end; i++) {
        pagHtml += `<button class="btn ${i===state.ui.followupPage?'btn-primary':'btn-ghost'} pag-btn" data-page="${i}">${i}</button>`;
      }
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${state.ui.followupPage+1}" ${state.ui.followupPage>=totalPages?'disabled':''}>›</button>`;
      pagHtml += `<button class="btn btn-ghost pag-btn" data-page="${totalPages}" ${state.ui.followupPage>=totalPages?'disabled':''}>»</button>`;
    } else {
      pagHtml += `<span class="pag-info">${totalRows} résultats</span>`;
    }
    pagHtml += '</div>';
    paginationEl.innerHTML = pagHtml;
    
    // Bind page buttons
    paginationEl.querySelectorAll('.pag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.ui.followupPage = parseInt(btn.dataset.page);
        renderFollowupTable();
      });
    });
    // Bind page size
    const pageSizeSelect = $('followupPageSize');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        state.ui.followupPageSize = parseInt(pageSizeSelect.value);
        state.ui.followupPage = 1;
        renderFollowupTable();
      });
    }
  }
  
  const countEl = $('followupCount');
  if (countEl) countEl.textContent = `${totalRows} ligne${totalRows > 1 ? 's' : ''}`;
  
  if (typeof bindTableActions === 'function') bindTableActions();
  
  // Bind view-bc buttons
  document.querySelectorAll('.view-bc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) openBcDetailModal(id);
    });
  });
};

// 7.5 Override injectSortableHeaders to match new columns
const _baseInjectSortableHeaders = window.injectSortableHeaders;
window.injectSortableHeaders = function() {
  // First, do base for payments and stock
  if (typeof _baseInjectSortableHeaders === 'function') {
    _baseInjectSortableHeaders();
  }
  
  // Now explicitly override followup headers
  const followupHeaders = document.querySelectorAll('#page-followup thead th');
  if (followupHeaders.length) {
    const map = {
      0: ['ref', 'BC'],
      1: ['daRef', 'DA'],
      2: ['date', 'Date'],
      3: ['supplier', 'Fournisseur'],
      4: ['requester', 'Demandeur'],
      5: ['department', 'Service / Département'],
      6: ['type', 'Type'],
      7: ['amountHT', 'Montant HT'],
      8: ['amount', 'Montant TTC'],
      9: ['status', 'Statut BC'],
      10: ['goodsReceivedDate', 'Réalisation']
    };
    
    // Clear old sort buttons if any, then apply correct ones
    followupHeaders.forEach((th, idx) => {
      if (map[idx]) {
        th.innerHTML = `<button type="button" class="th-sort-btn" data-sort-group="followup" data-sort-field="${map[idx][0]}"><span>${escapeHtml(map[idx][1])}</span><span class="th-sort-indicator" aria-hidden="true">↕</span></button>`;
      } else if (idx === 11) {
        th.textContent = 'Remarques';
      } else if (idx === 12) {
        th.textContent = 'Actions';
      }
    });
  }
};

// 8. Override openBcEditModal to handle new fields
const _baseOpenBcEditModal = window.openBcEditModal;
window.openBcEditModal = function(id) {
  if (typeof _baseOpenBcEditModal === 'function') {
    _baseOpenBcEditModal(id);
  }
  const row = state.bcRecords.find(r => r.id === id);
  if (row) {
    if ($('editBcId')) $('editBcId').value = row.id || '';
    if ($('editBcRef')) $('editBcRef').value = row.ref || '';
    if ($('editBcDaRef')) $('editBcDaRef').value = row.daRef || '';
    if ($('editBcDate')) $('editBcDate').value = row.date || '';
    if ($('editBcSupplier')) $('editBcSupplier').value = row.supplierName || '';
    if ($('editBcAmount')) $('editBcAmount').value = row.amountTTC || row.amount || '';
    if ($('editBcType')) $('editBcType').value = row.type || 'achat';
    if ($('editBcStatus')) $('editBcStatus').value = row.status || 'importe';
    if ($('editBcDaStatus')) $('editBcDaStatus').value = row.daStatus || 'draft';
    if ($('editBcPromisedDate')) $('editBcPromisedDate').value = row.promisedDate || '';
    if ($('editBcGoodsDate')) $('editBcGoodsDate').value = row.goodsReceivedDate || '';
    if ($('editBcServiceDate')) $('editBcServiceDate').value = row.serviceDoneDate || '';
    if ($('editBcRequester')) $('editBcRequester').value = row.requester || '';
    if ($('editBcPaymentTerms')) $('editBcPaymentTerms').value = row.paymentTerms || '';
    if ($('editBcDescription')) $('editBcDescription').value = row.description || '';
    if ($('editBcComments')) $('editBcComments').value = row.comments || '';
    if ($('editBcNotes')) $('editBcNotes').value = row.notes || '';
    if ($('editBcAmountHT')) $('editBcAmountHT').value = row.amountHT || 0;
    if ($('editBcTVA')) $('editBcTVA').value = row.tva || 0;
    if ($('editBcDepartment')) $('editBcDepartment').value = row.department || '';
    if ($('editBcRemarques')) $('editBcRemarques').value = row.remarques || '';
    
    const modal = $('bcEditModalBackdrop');
    if (modal) {
      const titleEl = modal.querySelector('.modal-head h3');
      if (titleEl) titleEl.textContent = 'Modifier la BC';
      const subtitleEl = modal.querySelector('.modal-head p');
      if (subtitleEl) subtitleEl.textContent = row.ref + (row.supplierName ? ' · ' + row.supplierName : '');
      modal.classList.remove('hidden');
    }
  }
};

// 8. Override submitBcEditForm to save new fields
window.submitBcEditForm = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = $('editBcId') ? $('editBcId').value : '';
  const idx = state.bcRecords.findIndex(r => r.id === id);
  
  let row;
  if (idx === -1) {
    row = {
      id: id || ('bc_' + Math.random().toString(36).substring(2, 15)),
      lineItems: [],
      createdAt: new Date().toISOString()
    };
    state.bcRecords.unshift(row);
    if (state.ui.isFilteredActive && Array.isArray(state.ui.activeFilteredIds)) {
      if (!state.ui.activeFilteredIds.includes(row.id)) {
        state.ui.activeFilteredIds.push(row.id);
      }
    }
  } else {
    row = state.bcRecords[idx];
  }
  
  row.ref = $('editBcRef') ? $('editBcRef').value.trim() : row.ref;
  row.daRef = $('editBcDaRef') ? $('editBcDaRef').value.trim() : row.daRef;
  row.date = $('editBcDate') ? $('editBcDate').value : row.date;
  row.supplierName = $('editBcSupplier') ? $('editBcSupplier').value.trim() : row.supplierName;
  row.requester = $('editBcRequester') ? $('editBcRequester').value.trim() : row.requester;
  row.department = $('editBcDepartment') ? $('editBcDepartment').value.trim() : row.department;
  row.type = $('editBcType') ? $('editBcType').value : row.type;
  row.amountTTC = $('editBcAmount') ? parseFlexibleNumber($('editBcAmount').value) : row.amountTTC;
  row.amount = row.amountTTC;
  row.amountHT = $('editBcAmountHT') ? parseFlexibleNumber($('editBcAmountHT').value) : row.amountHT;
  row.tva = $('editBcTVA') ? parseFlexibleNumber($('editBcTVA').value) : row.tva;
  row.remarques = $('editBcRemarques') ? $('editBcRemarques').value.trim() : row.remarques;
  row.currency = 'DZD';
  row.status = $('editBcStatus') ? $('editBcStatus').value : row.status;
  row.daStatus = $('editBcDaStatus') ? $('editBcDaStatus').value : row.daStatus;
  if (row.daStatus === 'validated' && !row.daValidatedAt) row.daValidatedAt = new Date().toISOString();
  row.promisedDate = $('editBcPromisedDate') ? $('editBcPromisedDate').value : row.promisedDate;
  row.goodsReceivedDate = $('editBcGoodsDate') ? $('editBcGoodsDate').value : row.goodsReceivedDate;
  row.serviceDoneDate = $('editBcServiceDate') ? $('editBcServiceDate').value : row.serviceDoneDate;
  row.paymentTerms = $('editBcPaymentTerms') ? $('editBcPaymentTerms').value.trim() : row.paymentTerms;
  row.description = $('editBcDescription') ? $('editBcDescription').value.trim() : row.description;
  row.comments = $('editBcComments') ? $('editBcComments').value.trim() : row.comments;
  row.notes = $('editBcNotes') ? $('editBcNotes').value.trim() : row.notes;
  row.updatedAt = new Date().toISOString();
  
  saveState();
  
  if (!state.suppliers.some(s => typeof s === 'string' ? s === row.supplierName : s.name === row.supplierName) && row.supplierName) {
    state.suppliers.push({ id: "sup_" + Math.random().toString(36).substr(2, 6), name: row.supplierName });
  }
  if (!state.requesters.some(r => typeof r === 'string' ? r === row.requester : r.name === row.requester) && row.requester) {
    state.requesters.push({ id: "req_" + Math.random().toString(36).substr(2, 6), name: row.requester });
  }
  saveState();
  
  const modal = $('bcEditModalBackdrop');
  if (modal) modal.classList.add('hidden');
  renderApp();
  showToast('Bon de commande enregistré avec succès');
};

// 9. Add openBcDetailModal function with bulletproof error handling
window.openBcDetailModal = function(id) {
  try {
    const row = state.bcRecords.find(r => r.id === id || r.ref === id);
    if (!row) {
      console.warn('[openBcDetailModal] Record not found for id:', id);
      showToast('Détails non trouvés pour ce bon de commande.');
      return;
    }
    const modalBackdrop = document.getElementById("bcDetailModalBackdrop");
    if (!modalBackdrop) {
      console.warn('[openBcDetailModal] Modal backdrop not found');
      return;
    }
    
    const titleEl = document.getElementById("bcDetailTitle");
    if (titleEl) titleEl.textContent = "Bon de Commande : " + (row.ref || id);
    
    const subtitleEl = document.getElementById("bcDetailSubtitle");
    if (subtitleEl) {
      const supName = row.supplierName || 'Fournisseur non spécifié';
      const dateStr = typeof formatDate === 'function' ? formatDate(row.date) : (row.date || '');
      subtitleEl.textContent = supName + (dateStr ? ' — ' + dateStr : '');
    }
    
    const delayInfo = typeof computeDelay === 'function' ? computeDelay(row) : { cls: 'neutral', label: '—' };
    const actualDate = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate) : (row.goodsReceivedDate || row.serviceDoneDate);
    const realDate = actualDate ? (typeof formatDate === 'function' ? formatDate(actualDate) : actualDate) : "Non réalisé";
    
    let linesHtml = "";
    if (row.lineItems && row.lineItems.length > 0) {
      const rows = row.lineItems.map(item => `
        <tr>
          <td>${escapeHtml(item.description || item.designation || "")}</td>
          <td style="text-align:right;">${item.qty || item.quantity || 0}</td>
          <td>${escapeHtml(item.unit || "U")}</td>
          <td style="text-align:right;">${typeof formatMoney === 'function' ? formatMoney(item.unitPrice || item.prixUnitaire || 0, row.currency) : (item.unitPrice || 0)}</td>
          <td style="text-align:right;"><strong>${typeof formatMoney === 'function' ? formatMoney(item.lineTotal || item.total || ((item.qty || 0) * (item.unitPrice || 0)), row.currency) : (item.lineTotal || 0)}</strong></td>
        </tr>
      `).join("");
      linesHtml = `
        <div class="detail-section" style="margin-top:1.5rem;">
          <h4 style="font-size:0.9rem; font-weight:700; color:var(--primary); margin-bottom:0.6rem;">Articles / Prestations</h4>
          <div class="table-shell tight-space">
            <table class="dense-table compact-table detail-articles-table" style="width:100%;">
              <thead>
                <tr>
                  <th style="text-align:left;">Description</th>
                  <th style="text-align:right;">Qté</th>
                  <th style="text-align:left;">Unité</th>
                  <th style="text-align:right;">Prix unit.</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }
    
    const bodyEl = document.getElementById("bcDetailBody");
    if (!bodyEl) return;
    
    const moneyHT = typeof formatMoney === 'function' ? formatMoney(row.amountHT, row.currency) : (row.amountHT || 0);
    const moneyTTC = typeof formatMoney === 'function' ? formatMoney(row.amountTTC || row.amount, row.currency) : (row.amountTTC || 0);
    const statCls = typeof statusClass === 'function' ? statusClass(row.status) : 'ok';
    const statLbl = typeof statusLabel === 'function' ? statusLabel(row.status) : (row.status || '—');
    const valCls = typeof validationClass === 'function' ? validationClass(row) : 'ok';
    const valLbl = typeof validationLabel === 'function' ? validationLabel(row) : (row.daStatus === 'validated' ? 'Validé' : 'En attente');
    const dateFormatted = typeof formatDate === 'function' ? formatDate(row.date) : (row.date || '—');
    const promisedFormatted = typeof formatDate === 'function' ? formatDate(row.promisedDate) : (row.promisedDate || '—');

    const stockInfo = (typeof getBcStockIngestionInfo === 'function')
      ? getBcStockIngestionInfo(row)
      : ((typeof window !== 'undefined' && typeof window.getBcStockIngestionInfo === 'function') ? window.getBcStockIngestionInfo(row) : null);

    let stockSectionHtml = '';
    if (stockInfo && stockInfo.ingested) {
      stockSectionHtml = `
        <div class="detail-section" style="background:#ecfdf5; border:1px solid #10b981; border-radius:8px; padding:1rem; margin-top:1rem;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:0.5rem;">
            <span class="badge badge-success" style="background:#059669;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;"><i class="fas fa-boxes-stacked me-1"></i> Entré en Stock</span>
            <strong style="color:#065f46; font-size:0.92rem;">Intégration Stock Confirmée</strong>
          </div>
          <p style="margin:0 0 0.5rem 0; font-size:0.88rem; color:#047857; font-weight:500;">${escapeHtml(stockInfo.note || "Ce Bon de Commande a été réceptionné et intégré dans le stock")}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.83rem; color:#064e3b; background:rgba(255,255,255,0.75); padding:8px 12px; border-radius:6px;">
            <div><strong>Date de réception :</strong> ${escapeHtml(stockInfo.date ? (typeof formatDate === 'function' ? formatDate(stockInfo.date) : stockInfo.date) : 'Non précisée')}</div>
            <div><strong>Réf Article / Lot :</strong> ${escapeHtml(stockInfo.articleRef || 'Articles du bon')}</div>
          </div>
        </div>
      `;
    } else {
      const st = String(row.status || '').toLowerCase();
      if (st === 'receptionne' || st === 'livre' || st === 'valide' || st.includes('livre') || st.includes('valide') || st.includes('reception')) {
        stockSectionHtml = `
          <div class="detail-section" style="background:#fff1f2; border:1px solid #f43f5e; border-radius:8px; padding:0.85rem 1rem; margin-top:1rem; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <span class="badge badge-soft" style="font-size:11px;color:#881337;"><i class="fas fa-clock me-1"></i> En attente Stock</span>
              <span style="font-size:0.85rem; color:#9f1239; margin-left:8px; font-weight:500;">Ce bon est réceptionné/validé et en attente d'ingestion au stock magasin.</span>
            </div>
          </div>
        `;
      }
    }

    bodyEl.innerHTML = `
      <div class="detail-section">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="d-label">Référence</div>
            <div class="d-value">${escapeHtml(row.ref)}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Date BC</div>
            <div class="d-value">${dateFormatted}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Fournisseur</div>
            <div class="d-value" style="color:var(--primary); font-weight:600;">${escapeHtml(row.supplierName || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Statut BC</div>
            <div class="d-value"><span class="status-pill ${statCls}">${statLbl}</span></div>
          </div>
          <div class="detail-item">
            <div class="d-label">Réf. DA</div>
            <div class="d-value">${escapeHtml(row.daRef || "—")} <span class="status-pill ${valCls}" style="font-size:0.7rem; margin-left:4px;">${valLbl}</span></div>
          </div>
          <div class="detail-item">
            <div class="d-label">Demandeur</div>
            <div class="d-value">${escapeHtml(row.requester || "—")}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Structure</div>
            <div class="d-value">${row.department ? "<span class=\"dept-pill\">" + escapeHtml(row.department) + "</span>" : "—"}</div>
          </div>
          <div class="detail-item">
            <div class="d-label">Type</div>
            <div class="d-value">${escapeHtml(row.type === "service" ? "Service" : "Achat")}</div>
          </div>
        </div>
      </div>
      
      <div class="detail-section" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
        <div class="detail-grid" style="grid-template-columns:1fr; background:var(--surface-2); padding:1rem; border-radius:8px; gap:0.6rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700; color:var(--text);">Délais & Modalités</h4>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Date promise</div>
            <div class="d-value">${promisedFormatted}</div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Réalisation</div>
            <div class="d-value">${realDate}</div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Délai</div>
            <div class="d-value"><span class="badge ${delayInfo.cls || ''}">${delayInfo.label || '—'}</span></div>
          </div>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Cond. paiement</div>
            <div class="d-value">${escapeHtml(row.paymentTerms || "—")}</div>
          </div>
        </div>
        
        <div class="detail-grid" style="grid-template-columns:1fr; background:rgba(59,130,246,0.05); padding:1rem; border-radius:8px; border:1px solid rgba(59,130,246,0.2); gap:0.5rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700; color:var(--primary);">Montants financiers</h4>
          <div class="detail-item" style="background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label">Montant HT</div>
            <div class="d-value amount-ht" style="font-weight:600;">${moneyHT}</div>
          </div>
          ${row.tva ? "<div class=\"detail-item\" style=\"background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;\"><div class=\"d-label\">TVA</div><div class=\"d-value\">" + (typeof formatMoney === 'function' ? formatMoney(row.tva, row.currency) : row.tva) + "</div></div>" : ""}
          ${row.remise ? "<div class=\"detail-item\" style=\"background:none; border:none; padding:0; display:flex; justify-content:space-between; align-items:center;\"><div class=\"d-label\">Remise</div><div class=\"d-value\" style=\"color:#e11d48;\">-" + (typeof formatMoney === 'function' ? formatMoney(row.remise, row.currency) : row.remise) + "</div></div>" : ""}
          <div class="detail-item" style="background:none; border:none; padding:8px 0 0; margin-top:6px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <div class="d-label" style="font-weight:700; color:var(--text); font-size:0.85rem;">Montant TTC</div>
            <div class="d-value amount-ttc" style="font-size:1.15rem; font-weight:800; color:var(--primary);">${moneyTTC}</div>
          </div>
        </div>
      </div>
      
      ${row.remarques ? `
      <div class="detail-section" style="background:var(--surface-2, rgba(241,245,249,0.7)); padding:0.85rem 1rem; border-radius:8px; border-left:4px solid var(--primary, #2563eb); margin-top:1rem;">
        <h4 style="color:var(--text, #1e293b); margin:0 0 0.3rem 0; font-size:0.85rem; font-weight:700;">Remarques</h4>
        <p style="margin:0; font-size:0.9rem; color:var(--text-muted, #475569); white-space:pre-wrap; line-height:1.4;">${escapeHtml(row.remarques)}</p>
      </div>` : ""}
      
      ${row.description || row.comments ? `
      <div class="detail-section" style="display:flex; gap:1rem; margin-top:1rem;">
        ${row.description ? "<div style=\"flex:1; background:var(--surface-2); padding:0.85rem 1rem; border-radius:8px;\"><h4 style=\"margin:0 0 0.3rem 0; font-size:0.8rem; color:var(--muted); text-transform:uppercase;\">Description</h4><p style=\"margin:0; font-size:0.85rem; white-space:pre-wrap;\">" + escapeHtml(row.description) + "</p></div>" : ""}
        ${row.comments ? "<div style=\"flex:1; background:var(--surface-2); padding:0.85rem 1rem; border-radius:8px;\"><h4 style=\"margin:0 0 0.3rem 0; font-size:0.8rem; color:var(--muted); text-transform:uppercase;\">Commentaires</h4><p style=\"margin:0; font-size:0.85rem; white-space:pre-wrap;\">" + escapeHtml(row.comments) + "</p></div>" : ""}
      </div>` : ""}
      
      ${stockSectionHtml}
      ${linesHtml}
    `;
    
    modalBackdrop.classList.remove("hidden");
  } catch (err) {
    console.error("[openBcDetailModal] Error:", err);
  }
};

// Delegated listeners for opening/closing detail modal
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-bc-btn, [data-action="view-bc"]');
  if (btn) {
    e.preventDefault();
    const id = btn.getAttribute('data-id') || (btn.dataset ? btn.dataset.id : null);
    if (id && typeof window.openBcDetailModal === 'function') {
      window.openBcDetailModal(id);
    }
  }
  
  if (e.target && (e.target.id === 'closeBcDetailModalBtn' || e.target.closest('#closeBcDetailModalBtn'))) {
    const backdrop = document.getElementById('bcDetailModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }
  
  if (e.target && e.target.id === 'bcDetailModalBackdrop') {
    e.target.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const backdrop = document.getElementById('bcDetailModalBackdrop');
    if (backdrop && !backdrop.classList.contains('hidden')) {
      backdrop.classList.add('hidden');
    }
  }
});

// (resetFollowupFilters is handled above in section 4)

// 12. KPI filter functionality
window.getKpiFilteredRecords = function() {
  let records = state.bcRecords;
  
  const from = $('kpiDateFrom') ? $('kpiDateFrom').value : '';
  const to = $('kpiDateTo') ? $('kpiDateTo').value : '';
  const supplier = $('kpiSupplierFilter') ? $('kpiSupplierFilter').value : 'all';
  const dept = $('kpiDeptFilter') ? $('kpiDeptFilter').value : 'all';
  const type = $('kpiTypeFilter') ? $('kpiTypeFilter').value : 'all';
  
  if (from) {
    const fromDate = new Date(from);
    records = records.filter(r => new Date(r.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    records = records.filter(r => new Date(r.date) <= toDate);
  }
  if (supplier && supplier !== 'all') {
    const norm = String(supplier).trim().toLowerCase();
    records = records.filter(r => String(r.supplierName || '').trim().toLowerCase() === norm);
  }
  if (dept !== 'all') {
    records = records.filter(r => r.department === dept);
  }
  if (type !== 'all') {
    records = records.filter(r => (r.type || 'Achat') === type);
  }
  
  return records;
};

// Override computeKpis to use filtered records via swap pattern
const _baseComputeKpis = window.computeKpis;
window.computeKpis = function() {
  const filtered = getKpiFilteredRecords();
  const originalRecords = state.bcRecords;
  state.bcRecords = filtered;
  const result = _baseComputeKpis();
  state.bcRecords = originalRecords;
  // Add HT total to result
  result.totalAmountHT = filtered.reduce((sum, r) => sum + (Number(r.amountHT) || 0), 0);
  return result;
};

// Override renderKpi — professional colorful KPI dashboard
const _baseRenderKpi = window.renderKpi;
let _kpiRendering = false;
window.renderKpi = function() {
  if (_kpiRendering) return _baseRenderKpi();
  _kpiRendering = true;
  try {
  // Populate KPI supplier filter
  const kpiSupFilter = $('kpiSupplierFilter');
  if (kpiSupFilter && kpiSupFilter.options.length <= 1) {
    const suppliers = [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort();
    suppliers.forEach(s => {
      kpiSupFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`);
    });
  }
  // Populate KPI dept filter
  const kpiDeptFilter = $('kpiDeptFilter');
  if (kpiDeptFilter && kpiDeptFilter.options.length <= 1) {
    const depts = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
    depts.forEach(d => {
      kpiDeptFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
    });
  }

  const records = getKpiFilteredRecords();
  const totalTTC = records.reduce((s, r) => { const n = Number(r.amountTTC || r.amount || 0); return s + (n < 1e10 ? n : 0); }, 0);
  const totalHT = records.reduce((s, r) => { const n = Number(r.amountHT || 0); return s + (n < 1e10 ? n : 0); }, 0);
  const delivered = records.filter(r => r.goodsReceivedDate || r.serviceDoneDate);
  const deliveryRate = records.length > 0 ? Math.round((delivered.length / records.length) * 100) : 0;
  const pending = records.filter(r => !r.goodsReceivedDate && !r.serviceDoneDate && r.status !== 'clos');
  const lateRecords = records.filter(r => { const d = computeDelay(r); return d.cls === 'late' || d.cls === 'warn'; });
  const lateRate = records.length > 0 ? Math.round((lateRecords.length / records.length) * 100) : 0;
  const validated = records.filter(r => r.daStatus === 'validated');
  const validationRate = records.length > 0 ? Math.round((validated.length / records.length) * 100) : 0;
  const avgAmount = records.length > 0 ? totalTTC / records.length : 0;
  const achatCount = records.filter(r => r.type === 'achat').length;
  const serviceCount = records.filter(r => r.type === 'service').length;

  // Average delivery days
  let totalDays = 0, dayCount = 0;
  delivered.forEach(r => {
    const start = new Date(r.date);
    const end = new Date(r.goodsReceivedDate || r.serviceDoneDate);
    if (!isNaN(start) && !isNaN(end)) { totalDays += Math.round((end - start) / 86400000); dayCount++; }
  });
  const avgDays = dayCount > 0 ? Math.round(totalDays / dayCount) : 0;

  // Top supplier by amount
  const supplierTotals = {};
  records.forEach(r => { if (r.supplierName) supplierTotals[r.supplierName] = (supplierTotals[r.supplierName] || 0) + (Number(r.amountTTC) || 0); });
  const topSupplier = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1])[0];

  // Top requester by count
  const requesterCounts = {};
  records.forEach(r => { if (r.requester) requesterCounts[r.requester] = (requesterCounts[r.requester] || 0) + 1; });
  const topRequester = Object.entries(requesterCounts).sort((a, b) => b[1] - a[1])[0];

  const kpiGrid = $('kpiGrid');
  if (!kpiGrid) return;

  kpiGrid.innerHTML = `
    <div class="kpi-pro-card kpi-blue">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${records.length}</div>
        <div class="kpi-pro-label">Volume de commandes</div>
        <div class="kpi-pro-sub">${achatCount} achats · ${serviceCount} services</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-indigo">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(totalHT, 'DZD')}</div>
        <div class="kpi-pro-label">Budget engagé HT</div>
        <div class="kpi-pro-sub">Hors taxes, remises incluses</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-teal">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(totalTTC, 'DZD')}</div>
        <div class="kpi-pro-label">Engagement global TTC</div>
        <div class="kpi-pro-sub">TVA + transport + timbre</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-green">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${deliveryRate}%</div>
        <div class="kpi-pro-label">Taux de réalisation</div>
        <div class="kpi-pro-sub">${delivered.length} / ${records.length} commandes livrées</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-amber">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${avgDays} j</div>
        <div class="kpi-pro-label">Délai moyen livraison</div>
        <div class="kpi-pro-sub">Jours calendaires BC → réception</div>
      </div>
    </div>
    <div class="kpi-pro-card ${lateRate > 30 ? 'kpi-red' : 'kpi-orange'}">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${lateRate}%</div>
        <div class="kpi-pro-label">Taux de retard</div>
        <div class="kpi-pro-sub">${lateRecords.length} commandes en retard / à risque</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-purple">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${formatMoney(avgAmount, 'DZD')}</div>
        <div class="kpi-pro-label">Montant moyen / BC</div>
        <div class="kpi-pro-sub">Panier moyen TTC par commande</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-cyan">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${validationRate}%</div>
        <div class="kpi-pro-label">Taux validation DA</div>
        <div class="kpi-pro-sub">${validated.length} DA validées sur ${records.length}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-slate">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${pending.length}</div>
        <div class="kpi-pro-label">BC en cours / en attente</div>
        <div class="kpi-pro-sub">Commandes non encore réalisées</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-rose">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18"/><path d="M18 9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 7v14"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${topSupplier ? escapeHtml(topSupplier[0].length > 18 ? topSupplier[0].substring(0,18)+'…' : topSupplier[0]) : '—'}</div>
        <div class="kpi-pro-label">Top fournisseur</div>
        <div class="kpi-pro-sub">${topSupplier ? formatMoney(topSupplier[1], 'DZD') : 'Aucun'}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-emerald">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${topRequester ? escapeHtml(topRequester[0].length > 18 ? topRequester[0].substring(0,18)+'…' : topRequester[0]) : '—'}</div>
        <div class="kpi-pro-label">Plus gros demandeur</div>
        <div class="kpi-pro-sub">${topRequester ? topRequester[1] + ' commandes' : 'Aucun'}</div>
      </div>
    </div>
    <div class="kpi-pro-card kpi-sky">
      <div class="kpi-pro-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
      <div class="kpi-pro-body">
        <div class="kpi-pro-value">${new Set(records.map(r => r.supplierName).filter(Boolean)).size}</div>
        <div class="kpi-pro-label">Portefeuille fournisseurs</div>
        <div class="kpi-pro-sub">Fournisseurs actifs sur la période</div>
      </div>
    </div>
  `;

  // Save our custom cards HTML
  const customCardsHtml = kpiGrid.innerHTML;

  // Call the ORIGINAL renderKpi to render focusList, summaryList, charts
  const originalRecords = state.bcRecords;
  state.bcRecords = records;
  try { _baseRenderKpi(); } catch(e) { console.warn('[kpi] base render error:', e); }
  state.bcRecords = originalRecords;

  // Restore our custom KPI cards
  if (kpiGrid) kpiGrid.innerHTML = customCardsHtml;

  // === BUILD INTERACTIVE CHARTS ===
  const chartContainer = $('dashboardCharts');
  if (chartContainer) {
    const COLORS = ['#3b82f6','#0d9488','#6366f1','#881337','#16a34a','#e11d48','#9333ea','#0284c7','#4f46e5','#06b6d4','#64748b','#059669'];

    // --- 1. DONUT: Achats vs Services ---
    const achat = records.filter(r => r.type === 'achat');
    const service = records.filter(r => r.type === 'service');
    const achatAmt = achat.reduce((s,r) => s + (Number(r.amountTTC)||0), 0);
    const serviceAmt = service.reduce((s,r) => s + (Number(r.amountTTC)||0), 0);
    const total = achatAmt + serviceAmt || 1;
    const achatPct = Math.round((achatAmt / total) * 100);
    const servicePct = 100 - achatPct;
    const achatDeg = (achatPct / 100) * 360;

    // --- 2. TOP 10 SUPPLIERS ---
    const supTotals = {};
    records.forEach(r => { if (r.supplierName) supTotals[r.supplierName] = (supTotals[r.supplierName]||0) + (Number(r.amountTTC)||0); });
    const topSups = Object.entries(supTotals).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const maxSup = topSups[0] ? topSups[0][1] : 1;

    // --- 3. MONTHLY TREND ---
    const monthly = {};
    records.forEach(r => { if (r.date) { const m = r.date.substring(0,7); monthly[m] = (monthly[m]||0) + 1; } });
    const months = Object.keys(monthly).sort();
    const maxMonth = Math.max(...Object.values(monthly), 1);

    // --- 4. STATUS BREAKDOWN ---
    const statuses = {};
    records.forEach(r => { const s = r.status || 'importe'; statuses[s] = (statuses[s]||0) + 1; });
    const statusEntries = Object.entries(statuses).sort((a,b) => b[1]-a[1]);
    const statusColors = { importe:'#3b82f6', en_attente:'#4f46e5', en_cours:'#06b6d4', livre:'#16a34a', service_fait:'#059669', paye:'#0d9488', clos:'#64748b', programme:'#9333ea' };

    // --- 5. DEPARTMENT DISTRIBUTION ---
    const deptTotals = {};
    records.forEach(r => { const d = r.department || 'Non assigné'; deptTotals[d] = (deptTotals[d]||0) + (Number(r.amountTTC)||0); });
    const deptEntries = Object.entries(deptTotals).sort((a,b) => b[1]-a[1]);
    const maxDept = deptEntries[0] ? deptEntries[0][1] : 1;

    // --- 6. TOP REQUESTERS ---
    const reqCounts = {};
    records.forEach(r => { if (r.requester) reqCounts[r.requester] = (reqCounts[r.requester]||0) + 1; });
    const topReqs = Object.entries(reqCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const maxReq = topReqs[0] ? topReqs[0][1] : 1;

    chartContainer.innerHTML = `
      <div class="interactive-charts-grid">

        <!-- DONUT: Type Split -->
        <div class="chart-panel">
          <div class="chart-title">Répartition par type</div>
          <div class="chart-subtitle">Montants TTC — Achats vs Services</div>
          <div class="donut-wrapper">
            <div class="donut-chart" style="background: conic-gradient(#3b82f6 0deg ${achatDeg}deg, #0d9488 ${achatDeg}deg 360deg);">
              <div class="donut-hole">${records.length}<br><span>BC</span></div>
            </div>
            <div class="donut-legend">
              <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Achats <strong>${achatPct}%</strong><br><small>${formatMoney(achatAmt,'DZD')}</small></div>
              <div class="legend-item"><span class="legend-dot" style="background:#0d9488"></span>Services <strong>${servicePct}%</strong><br><small>${formatMoney(serviceAmt,'DZD')}</small></div>
            </div>
          </div>
        </div>

        <!-- BAR: Top Suppliers -->
        <div class="chart-panel chart-panel-wide">
          <div class="chart-title">Top 10 fournisseurs</div>
          <div class="chart-subtitle">Par montant total TTC engagé</div>
          <div class="hbar-chart">
            ${topSups.map((s, i) => `
              <div class="hbar-row" title="${escapeHtml(s[0])}: ${formatMoney(s[1],'DZD')}">
                <div class="hbar-label">${escapeHtml(s[0].length > 20 ? s[0].substring(0,20)+'…' : s[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((s[1]/maxSup)*100)}%;background:${COLORS[i%12]};">
                    <span class="hbar-value">${formatMoney(s[1],'DZD')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TREND: Monthly Orders -->
        <div class="chart-panel chart-panel-wide">
          <div class="chart-title">Évolution mensuelle</div>
          <div class="chart-subtitle">Nombre de commandes par mois</div>
          <div class="trend-chart">
            ${months.map((m, i) => `
              <div class="trend-bar-group" title="${m}: ${monthly[m]} commandes">
                <div class="trend-bar" style="height:${Math.round((monthly[m]/maxMonth)*100)}%;background:${COLORS[i%12]};">
                  <span class="trend-count">${monthly[m]}</span>
                </div>
                <div class="trend-label">${m.substring(5)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- STATUS: Breakdown -->
        <div class="chart-panel">
          <div class="chart-title">Répartition par statut</div>
          <div class="chart-subtitle">Ventilation des bons de commande</div>
          <div class="status-chart">
            ${statusEntries.map(([s, c]) => `
              <div class="status-row" title="${statusLabel(s)}: ${c}">
                <div class="status-label-text">${escapeHtml(statusLabel(s))}</div>
                <div class="status-track">
                  <div class="status-fill" style="width:${Math.round((c/records.length)*100)}%;background:${statusColors[s]||'#64748b'};">
                    <span class="status-count">${c}</span>
                  </div>
                </div>
                <div class="status-pct">${Math.round((c/records.length)*100)}%</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- DEPT: Distribution -->
        <div class="chart-panel">
          <div class="chart-title">Budget par département</div>
          <div class="chart-subtitle">Montant TTC par structure demandeuse</div>
          <div class="hbar-chart">
            ${deptEntries.map((d, i) => `
              <div class="hbar-row" title="${escapeHtml(d[0])}: ${formatMoney(d[1],'DZD')}">
                <div class="hbar-label">${escapeHtml(d[0].length > 18 ? d[0].substring(0,18)+'…' : d[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((d[1]/maxDept)*100)}%;background:${COLORS[(i+3)%12]};">
                    <span class="hbar-value">${formatMoney(d[1],'DZD')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- REQUESTERS: Who orders most -->
        <div class="chart-panel">
          <div class="chart-title">Top demandeurs</div>
          <div class="chart-subtitle">Qui commande le plus ?</div>
          <div class="hbar-chart">
            ${topReqs.map((r, i) => `
              <div class="hbar-row" title="${escapeHtml(r[0])}: ${r[1]} commandes">
                <div class="hbar-label">${escapeHtml(r[0].length > 18 ? r[0].substring(0,18)+'…' : r[0])}</div>
                <div class="hbar-track">
                  <div class="hbar-fill" style="width:${Math.round((r[1]/maxReq)*100)}%;background:${COLORS[(i+6)%12]};">
                    <span class="hbar-value">${r[1]} cmd</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  } finally { _kpiRendering = false; }
};

/// 15. Minimal CSS overrides (main CSS is in enhancements.css)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .followup-grid { display: none !important; }
`;
document.head.appendChild(styleSheet);

// === SETUP: Splash Screen Injection ===
(function injectSplashScreen() {
  const splashHtml = `
<div id="splashScreen" style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;background:#0f172a;">
  <div class="ai-widget ai-widget-lg" style="pointer-events:none;margin-bottom:8px">
    <div class="ai-ring3"></div>
    <div class="ai-orbit"></div>
    <div class="ai-orbit ai-orbit-2"></div>
    <div class="ai-core"></div>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:1.5rem;font-weight:800;color:#fff;letter-spacing:2px">SPA DOUROUB ELDJAZAIR</div>
    <div style="font-size:10px;letter-spacing:3px;color:#94a3b8;font-weight:600;margin-top:4px">SUIVI ACHATS & APPROVISIONNEMENT</div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06)">
    <div id="splashBar" style="height:100%;width:0;background:linear-gradient(90deg,#0d9488,#7c3aed);transition:width 1.2s ease;border-radius:0 2px 2px 0"></div>
  </div>
</div>
  `;
  document.body.insertAdjacentHTML('afterbegin', splashHtml);
  
  setTimeout(() => {
    const bar = document.getElementById('splashBar');
    if (bar) bar.style.width = '85%';
    
    setTimeout(() => {
      if (bar) bar.style.width = '100%';
      
      setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
          splash.style.transition = 'opacity 0.3s ease';
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 300);
        }
      }, 300); // 700 + 300 = 1000ms total
    }, 700);
  }, 10);
})();

// === SETUP: Inject animated AI widget + logo into topbar ===
(function injectTopbarLogo() {
  const titleGroup = document.querySelector('.topbar-title-group');
  if (!titleGroup) return;
  const badge = titleGroup.querySelector('.brand-badge');

  // Create the small animated AI widget
  const aiWidget = document.createElement('div');
  aiWidget.className = 'ai-widget ai-widget-sm';
  aiWidget.style.cssText = 'cursor:default;flex-shrink:0;';
  aiWidget.innerHTML = '<div class="ai-ring3"></div><div class="ai-orbit"></div><div class="ai-orbit ai-orbit-2"></div><div class="ai-core"></div>';

  // Check if there's a company logo
  const logoUrl = state.settings && state.settings.logoDataUrl;
  if (logoUrl && badge) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-shrink:0;';
    const img = document.createElement('img');
    img.id = 'topbarLogo';
    img.src = logoUrl;
    img.alt = 'Logo';
    wrapper.appendChild(aiWidget);
    wrapper.appendChild(img);
    badge.replaceWith(wrapper);
  } else if (badge) {
    badge.replaceWith(aiWidget);
  }

  // Update title
  const titleEl = $('appTitle');
  const subEl = $('appSubtitle');
  if (titleEl) titleEl.textContent = state.settings.title || 'SPA DOUROUB ELDJAZAIR';
  if (subEl) subEl.textContent = state.settings.subtitle || 'Suivi Achats, BC & Approvisionnement';
})();

// === SETUP: Add "Nouveau BC" button and mark actions header sticky ===
(function setupFollowupPage() {
  const filterPanel = document.querySelector('#page-followup .panel-muted');
  if (filterPanel) {
    const btnBar = document.createElement('div');
    btnBar.className = 'add-bc-trigger';
    btnBar.style.cssText = 'display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;margin-bottom:0.5rem;';
    btnBar.innerHTML = `
      <button class="btn" id="openAddBcModalBtn" type="button" style="background:#dc2626;color:#fff;font-weight:700;font-size:0.9rem;padding:0.6rem 1.2rem;border:none;border-radius:0.6rem;box-shadow:0 3px 10px rgba(220,38,38,.3);display:inline-flex;align-items:center;gap:0.4rem;cursor:pointer;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nouveau BC
      </button>
      <button class="btn btn-soft" id="exportExcelBtn" type="button" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:600;font-size:0.82rem;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Export Excel
      </button>
      <button class="btn btn-soft" id="exportCsvBtn" type="button" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:600;font-size:0.82rem;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>`;
    filterPanel.parentNode.insertBefore(btnBar, filterPanel);
  }

  // Excel Export
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'exportExcelBtn' || e.target.closest('#exportExcelBtn'))) {
      const records = filteredBcRecords();
      const rows = records.map(r => ({
        'Réf BC': r.ref, 'Réf DA': r.daRef||'', 'Date BC': r.date||'', 'Fournisseur': r.supplierName||'',
        'Description': r.description||'', 'Montant HT': r.amountHT||0, 'Montant TTC': r.amountTTC||0,
        'TVA': r.tva||0, 'Type': r.type||'', 'Statut BC': r.status||'', 'Statut DA': r.daStatus||'',
        'Structure': r.department||'', 'Demandeur': r.requester||'', 'Date promise': r.promisedDate||'',
        'Date réception': r.goodsReceivedDate||'', 'Remarques': r.remarques||'',
        'Conditions paiement': r.paymentTerms||'', 'Notes': r.notes||''
      }));
      if (window.XLSX) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Suivi BC');
        // Auto-size columns
        const cols = Object.keys(rows[0]||{}).map(k => ({ wch: Math.max(k.length + 2, 15) }));
        ws['!cols'] = cols;
        XLSX.writeFile(wb, 'suivi_bc_export_' + new Date().toISOString().split('T')[0] + '.xlsx');
        showToast('Export Excel téléchargé ! (' + records.length + ' lignes)');
      } else { showToast('Bibliothèque XLSX non chargée'); }
    }
  });

  // CSV Export
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'exportCsvBtn' || e.target.closest('#exportCsvBtn'))) {
      const records = filteredBcRecords();
      const headers = ['Réf BC','Réf DA','Date BC','Fournisseur','Description','Montant HT','Montant TTC','TVA','Type','Statut BC','Statut DA','Structure','Demandeur','Date promise','Date réception','Remarques'];
      const esc = (v) => '"' + String(v||'').replace(/"/g,'""') + '"';
      const lines = [headers.join(';')];
      records.forEach(r => {
        lines.push([r.ref,r.daRef,r.date,r.supplierName,r.description,r.amountHT||0,r.amountTTC||0,r.tva||0,r.type,r.status,r.daStatus,r.department,r.requester,r.promisedDate,r.goodsReceivedDate,r.remarques].map(esc).join(';'));
      });
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'suivi_bc_export_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click(); URL.revokeObjectURL(a.href);
      showToast('Export CSV téléchargé ! (' + records.length + ' lignes)');
    }
  });
  // Bind "Nouveau BC" button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'openAddBcModalBtn') {
      const modal = $('bcEditModalBackdrop');
      if (modal) {
        const form = $('bcEditForm');
        if (form) form.reset();
        if ($('editBcId')) $('editBcId').value = '';
        if ($('editBcCurrency')) $('editBcCurrency').value = 'DZD';
        // Auto-fill next BC ref
        const nextNum = (state.settings.bcSequence || 1);
        if ($('editBcRef')) $('editBcRef').value = 'BC N°' + nextNum + '/DG/2026';
        // Set today's date
        if ($('editBcDate')) $('editBcDate').value = new Date().toISOString().split('T')[0];
        // Change title to "Nouveau BC"
        const titleEl = modal.querySelector('.modal-head h3');
        if (titleEl) titleEl.textContent = 'Nouveau BC';
        const subtitleEl = modal.querySelector('.modal-head p');
        if (subtitleEl) subtitleEl.textContent = 'Remplissez les informations du bon de commande';
        modal.classList.remove('hidden');
      }
    }
  });
  // Bind "Modifier" button delegation, Cancel and Save bottom buttons
  document.addEventListener('click', (e) => {
    // Save button (bottom or top of bcEditForm)
    if (e.target && (e.target.id === 'saveBcEditBottomBtn' || e.target.id === 'saveBcEditBtn')) {
      e.preventDefault();
      if (typeof window.submitBcEditForm === 'function') {
        window.submitBcEditForm(e);
      }
    }
    // Cancel button (bottom or top of bcEditForm)
    if (e.target && (e.target.id === 'cancelBcEditBottomBtn' || e.target.id === 'closeBcEditModalBtn')) {
      const modal = $('bcEditModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    // Modifier action button in table
    const editBtn = e.target.closest('[data-action="edit-bc"]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if (id && typeof window.openBcEditModal === 'function') {
        window.openBcEditModal(id);
      }
    }
    // Manual Filter Button
    if (e.target && (e.target.id === 'applyFollowupFiltersBtn' || e.target.closest('#applyFollowupFiltersBtn'))) {
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
    }

    // Multi-Select Supplier Dropdown Toggle
    if (e.target && (e.target.id === 'supplierMultiSelectBtn' || e.target.closest('#supplierMultiSelectBtn'))) {
      e.stopPropagation();
      const dd = $('supplierMultiSelectDropdown');
      if (dd) dd.classList.toggle('hidden');
    } else if (!e.target.closest('#supplierMultiSelectContainer')) {
      const dd = $('supplierMultiSelectDropdown');
      if (dd && !dd.classList.contains('hidden')) dd.classList.add('hidden');
    }

    // Select All Suppliers
    if (e.target && e.target.id === 'supplierSelectAllBtn') {
      e.stopPropagation();
      const sups = state.ui.allSuppliersList || [];
      state.ui.selectedSuppliers = [...sups];
      document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]').forEach(cb => cb.checked = true);
      updateSupplierTriggerLabel();
    }

    // Clear All Suppliers
    if (e.target && e.target.id === 'supplierClearAllBtn') {
      e.stopPropagation();
      state.ui.selectedSuppliers = [];
      document.querySelectorAll('#supplierMultiSelectList input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateSupplierTriggerLabel();
    }
  });

  // Multi-Select Search Filter
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'supplierMultiSelectSearch') {
      const val = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll('#supplierMultiSelectList .multi-select-item');
      items.forEach(it => {
        const text = it.textContent.toLowerCase();
        it.style.display = (!val || text.includes(val)) ? 'flex' : 'none';
      });
    }
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-validate-da');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const modal = $('validateDaModalBackdrop');
      if (!modal) return;
      $('validateDaBcId').value = row.id;
      $('validateDaBcRef').textContent = row.ref + (row.supplierName ? ' — ' + row.supplierName : '');
      $('validateDaBcSupplier').textContent = (row.department ? row.department + ' · ' : '') + (row.type === 'service' ? 'Prestation de service' : 'Achat');
      $('validateDaRefInput').value = row.daRef || (typeof nextDaRefPreview === 'function' ? nextDaRefPreview() : 'DA N°' + (state.settings.daSequence || 1) + '/2026');
      $('validateDaDateInput').value = row.daValidatedAt ? row.daValidatedAt.split('T')[0] : (row.date || new Date().toISOString().split('T')[0]);
      modal.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'cancelValidateDaBtn' || e.target.id === 'cancelValidateDaBtn2')) {
      const modal = $('validateDaModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    if (e.target && e.target.id === 'validateDaModalBackdrop') {
      e.target.classList.add('hidden');
    }
    if (e.target && e.target.id === 'confirmValidateDaBtn') {
      const id = $('validateDaBcId').value;
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const daRef = $('validateDaRefInput').value.trim();
      const valDate = $('validateDaDateInput').value || new Date().toISOString().split('T')[0];
      row.daRef = daRef || row.daRef || 'DA validée';
      row.daStatus = 'validated';
      row.daValidatedAt = valDate;
      if (row.status === 'importe' || row.status === 'draft') {
        row.status = 'valide';
      }
      row.updatedAt = new Date().toISOString();
      if (typeof bumpDaSequenceFromRef === 'function') bumpDaSequenceFromRef(row.daRef);
      saveState();
      renderApp();
      const modal = $('validateDaModalBackdrop');
      if (modal) modal.classList.add('hidden');
      showToast('DA validée avec succès pour ' + row.ref);
    }
  });

  // === Modal Enregistrement Livraison / Réalisation ===
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-deliver-bc');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const modal = $('deliverBcModalBackdrop');
      if (!modal) return;
      $('deliverBcId').value = row.id;
      $('deliverBcRef').textContent = row.ref;
      $('deliverBcSupplier').textContent = row.supplierName || 'Fournisseur non spécifié';
      $('deliverBcTypeBadge').textContent = row.type === 'service' ? 'Service' : 'Achat';
      $('deliverBcDateLabel').textContent = 'Date BC : ' + (row.date ? formatDate(row.date) : 'Non renseignée');
      
      let defDate = row.type === 'service' ? (row.serviceDoneDate || row.goodsReceivedDate) : (row.goodsReceivedDate || row.serviceDoneDate);
      if (!defDate) {
        if (row.date) {
          const d = new Date(row.date);
          d.setDate(d.getDate() + (row.type === 'service' ? 1 : 2));
          defDate = d.toISOString().split('T')[0];
        } else {
          defDate = new Date().toISOString().split('T')[0];
        }
      }
      $('deliverDateInput').value = defDate;
      $('deliverBcStatusInput').value = 'clos';
      $('deliverBlInput').value = '';
      modal.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'cancelDeliverBcBtn' || e.target.id === 'cancelDeliverBcBtn2')) {
      const modal = $('deliverBcModalBackdrop');
      if (modal) modal.classList.add('hidden');
    }
    if (e.target && e.target.id === 'deliverBcModalBackdrop') {
      e.target.classList.add('hidden');
    }
    if (e.target && e.target.id === 'confirmDeliverBcBtn') {
      const id = $('deliverBcId').value;
      const row = state.bcRecords.find(r => r.id === id);
      if (!row) return;
      const realDate = $('deliverDateInput').value;
      if (!realDate) {
        showToast('Veuillez sélectionner une date de réalisation.');
        return;
      }
      const newStatus = $('deliverBcStatusInput').value || 'clos';
      const bl = $('deliverBlInput').value.trim();
      if (row.type === 'service') {
        row.serviceDoneDate = realDate;
        row.goodsReceivedDate = realDate;
      } else {
        row.goodsReceivedDate = realDate;
      }
      row.status = newStatus;
      if (bl) {
        row.remarques = row.remarques ? (row.remarques + ' | BL: ' + bl) : ('BL: ' + bl);
      }
      row.updatedAt = new Date().toISOString();
      saveState();
      renderApp();
      const modal = $('deliverBcModalBackdrop');
      if (modal) modal.classList.add('hidden');
      showToast('Réalisation enregistrée pour ' + row.ref);
    }
  });

  // Mark last TH as sticky
  const lastTh = document.querySelector('.followup-table thead th:last-child');
  if (lastTh) lastTh.classList.add('actions-cell');


})();

// === FINAL INITIALIZATION ===
// Re-render the app now that all overrides are in place
if (state.session) {
  refreshFollowupFilterOptions();
  renderApp();
}

// === Theme-aware Tab label styling ===
(function forceFixTabLabels() {
  const fallbacks = {
    kpi: 'KPI',
    followup: 'Bons de Commande',
    payments: 'Paiements DP',
    'smart-match': 'Rapprochement IA',
    finance: 'Finances',
    reports: 'Rapports',
    settings: 'Paramètres'
  };

  function fixTabs() {
    const isDark = (document.body && document.body.dataset && document.body.dataset.theme === 'dark') ||
      (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.theme === 'dark');
    document.querySelectorAll('.tabbar .tab, .sa-top-tabs .sa-top-tab, #tabbar button').forEach(tab => {
      const isActive = tab.classList.contains('active');
      const c = isActive ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b');
      const tabKey = tab.dataset.tab || 'kpi';

      tab.style.setProperty('border-radius', '9999px', 'important');
      tab.style.setProperty('padding', '6px 16px', 'important');
      tab.style.setProperty('font-size', '13px', 'important');
      tab.style.setProperty('white-space', 'nowrap', 'important');
      tab.style.setProperty('min-width', 'fit-content', 'important');
      tab.style.setProperty('font-weight', isActive ? '700' : '600', 'important');

      if (isActive) {
        tab.style.setProperty('background', '#2563eb', 'important');
        tab.style.setProperty('color', '#ffffff', 'important');
        tab.style.setProperty('border', isDark ? '1px solid #3b82f6' : '1px solid #2563eb', 'important');
        tab.style.setProperty('border-color', isDark ? '#3b82f6' : '#2563eb', 'important');
        tab.style.setProperty('box-shadow', isDark ? '0 4px 14px rgba(37, 99, 235, 0.5)' : '0 4px 12px rgba(37, 99, 235, 0.35)', 'important');
      } else {
        tab.style.setProperty('background', isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff', 'important');
        tab.style.setProperty('color', isDark ? '#e2e8f0' : '#1e293b', 'important');
        tab.style.setProperty('border', isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #cbd5e1', 'important');
        tab.style.setProperty('border-color', isDark ? 'rgba(255, 255, 255, 0.14)' : '#cbd5e1', 'important');
        tab.style.setProperty('box-shadow', isDark ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)', 'important');
      }

      let label = tab.querySelector('.tab-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'tab-label';
        tab.appendChild(label);
      }
      if (!label.textContent || !label.textContent.trim()) {
        label.textContent = fallbacks[tabKey] || 'KPI';
      }

      label.style.setProperty('color', isActive ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b'), 'important');
      label.style.setProperty('display', 'inline-block', 'important');
      label.style.setProperty('visibility', 'visible', 'important');
      label.style.setProperty('opacity', '1', 'important');
      label.style.setProperty('font-size', '13px', 'important');
      label.style.setProperty('font-weight', isActive ? '700' : '600', 'important');

      const icon = tab.querySelector('i, .tab-icon-badge');
      if (icon) {
        const iconColor = isActive ? '#ffffff' : (isDark ? '#94a3b8' : '#334155');
        icon.style.setProperty('color', iconColor, 'important');
        const iconSvg = icon.querySelector('svg');
        if (iconSvg) {
          iconSvg.style.setProperty('color', iconColor, 'important');
          iconSvg.style.setProperty('stroke', iconColor, 'important');
        }
      }
    });
  }
  window.updateTabColors = fixTabs;
  fixTabs();
  document.querySelectorAll('.tab, .sa-top-tab').forEach(tab => {
    tab.addEventListener('click', () => setTimeout(fixTabs, 20));
  });
  const origRefreshAuth = window.refreshAuthUi;
  if (origRefreshAuth) {
    window.refreshAuthUi = function() { origRefreshAuth(); setTimeout(fixTabs, 100); };
  }
  const origRenderApp = window.renderApp;
  if (origRenderApp) {
    window.renderApp = function() { origRenderApp(); setTimeout(fixTabs, 50); };
  }
  const origSetActiveTab = window.setActiveTab;
  if (origSetActiveTab) {
    window.setActiveTab = function(t) { origSetActiveTab(t); fixTabs(); };
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
    try {
      new MutationObserver(() => fixTabs()).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (_) {}
  }
})();

// === Moving AI Mega Logo Engine (ERP_Douroub_v5 FX) ===
(function initAiMegaLogo() {
  var TOTAL_FX = 30;
  var headerFx = 1;
  setInterval(function() {
    var headerW = document.getElementById('headerAiWidget');
    if (!headerW || !headerW.offsetWidth) return;
    headerFx = (headerFx % TOTAL_FX) + 1;
    for (var i = 1; i <= TOTAL_FX; i++) headerW.classList.remove('ai-fx-' + i);
    headerW.classList.add('ai-fx-' + headerFx);
  }, 5000);
  window.triggerAiAction = function(el) {
    if (!el) return;
    var w = el.closest ? (el.closest('.ai-widget') || el) : el;
    var n = Math.floor(Math.random() * TOTAL_FX) + 1;
    for (var i = 1; i <= TOTAL_FX; i++) w.classList.remove('ai-fx-' + i);
    w.classList.add('ai-fx-' + n);
  };
})();

// Show/hide pin button based on active tab
(function watchTabForPinBtn() {
  const pinBtn = document.querySelector('.actions-pin-btn');
  if (!pinBtn) return;
  function updatePinVisibility() {
    const isFollowup = state.activeTab === 'followup';
    pinBtn.style.display = isFollowup ? 'flex' : 'none';
  }
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setTimeout(updatePinVisibility, 50));
  });
  updatePinVisibility();
})();

// Auto-fill login credentials
const loginUser = $('loginUsername');
const loginPass = $('loginPassword');
if (loginUser && !loginUser.value) loginUser.value = 'admin';
if (loginPass && !loginPass.value) loginPass.value = 'admin';

// Bind detail modal close
const closeDetailBtn = $('closeBcDetailModalBtn');
if (closeDetailBtn) {
  closeDetailBtn.addEventListener('click', () => {
    const backdrop = $('bcDetailModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
  });
}
const detailBackdrop = $('bcDetailModalBackdrop');
if (detailBackdrop) {
  detailBackdrop.addEventListener('click', (e) => {
    if (e.target === detailBackdrop) detailBackdrop.classList.add('hidden');
  });
}

// Bind KPI filter events
['kpiDateFrom', 'kpiDateTo', 'kpiSupplierFilter', 'kpiDeptFilter', 'kpiTypeFilter'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('change', () => { if (state.activeTab === 'kpi') renderKpi(); });
});
const resetKpiBtn = $('resetKpiFiltersBtn');
if (resetKpiBtn) {
  resetKpiBtn.addEventListener('click', () => {
    ['kpiDateFrom', 'kpiDateTo'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    ['kpiSupplierFilter', 'kpiDeptFilter', 'kpiTypeFilter'].forEach(id => { const el = $(id); if (el) el.value = 'all'; });
    if (state.activeTab === 'kpi') renderKpi();
  });
}

// Bind followup dept filter change
const deptFilterEl = $('followupDeptFilter');
if (deptFilterEl) {
  deptFilterEl.addEventListener('change', () => {
    state.ui.followupPage = 1;
    renderFollowupTable();
  });
}

console.log('[app-enhancements] Initializing department management...');

// === DEPARTMENT MANAGEMENT ===
(function setupDepartmentManagement() {
  if (!state.departments) state.departments = [...new Set(state.bcRecords.map(r => r.department).filter(Boolean))].sort();
  if (!state.supplierDeptMap) state.supplierDeptMap = { ...DEPT_MAP };

  function renderDeptManager() {
    const container = $('departmentsManager');
    if (!container) return;
    container.innerHTML = '';
    (state.departments || []).forEach(d => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${escapeHtml(d)} <button class="pill-remove" data-dept="${escapeHtml(d)}">&times;</button>`;
      container.appendChild(pill);
    });
    container.querySelectorAll('.pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        state.departments = state.departments.filter(d => d !== btn.dataset.dept);
        saveState(); renderDeptManager(); populateLinkDropdowns();
      });
    });
  }

  function renderSupplierDeptLinks() {
    const container = $('supplierDeptLinks');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(state.supplierDeptMap || {}).forEach(([sup, dept]) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${escapeHtml(sup)} → ${escapeHtml(dept)} <button class="pill-remove" data-sup="${escapeHtml(sup)}">&times;</button>`;
      container.appendChild(pill);
    });
    container.querySelectorAll('.pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        delete state.supplierDeptMap[btn.dataset.sup];
        saveState(); renderSupplierDeptLinks();
      });
    });
  }

  function populateLinkDropdowns() {
    const supSelect = $('linkSupplierSelect');
    const deptSelect = $('linkDeptSelect');
    if (supSelect) {
      supSelect.innerHTML = '<option value="">Choisir fournisseur</option>';
      [...new Set(state.bcRecords.map(r => r.supplierName).filter(Boolean))].sort().forEach(s =>
        supSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      );
    }
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Choisir département</option>';
      (state.departments || []).forEach(d =>
        deptSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`)
      );
    }
  }

  const addDeptBtn = $('addDepartmentBtn');
  if (addDeptBtn) addDeptBtn.addEventListener('click', () => {
    const input = $('newDepartmentName');
    const name = input ? input.value.trim() : '';
    if (!name) return;
    if (!state.departments) state.departments = [];
    if (!state.departments.includes(name)) { state.departments.push(name); state.departments.sort(); saveState(); }
    if (input) input.value = '';
    renderDeptManager(); populateLinkDropdowns();
    const dl = $('departmentsList');
    if (dl) { dl.innerHTML = ''; state.departments.forEach(d => dl.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(d)}">`)); }
  });

  const linkBtn = $('linkSupplierDeptBtn');
  if (linkBtn) linkBtn.addEventListener('click', () => {
    const sup = $('linkSupplierSelect') ? $('linkSupplierSelect').value : '';
    const dept = $('linkDeptSelect') ? $('linkDeptSelect').value : '';
    if (!sup || !dept) { showToast('Choisissez un fournisseur ET un département'); return; }
    if (!state.supplierDeptMap) state.supplierDeptMap = {};
    state.supplierDeptMap[sup] = dept;
    DEPT_MAP[sup.toUpperCase()] = dept;
    saveState(); renderSupplierDeptLinks();
    showToast(sup + ' → ' + dept + ' lié avec succès');
  });

  const origFillSettings = window.fillSettingsScreen;
  window.fillSettingsScreen = function() {
    if (origFillSettings) origFillSettings();
    renderDeptManager(); renderSupplierDeptLinks(); populateLinkDropdowns();
    if (window.renderUsersSettingsTable) window.renderUsersSettingsTable();
  };
})();

// ================================================================
// 20. JSON IMPORT / EXPORT
// ================================================================
(function setupJsonImportExport() {
  const sp = document.getElementById('page-settings');
  if (!sp) return;
  const ioP = document.createElement('article');
  ioP.className = 'panel';
  ioP.innerHTML = `
    <div class="panel-title-row"><h3>Données JSON — Import / Export</h3></div>
    <p style="font-size:0.8rem;color:var(--muted);margin-bottom:0.75rem;">Importez un fichier JSON pour charger vos données. Exportez pour sauvegarder ou transférer.</p>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
      <button class="btn btn-primary" id="importJsonBtn" type="button">Importer JSON</button>
      <button class="btn btn-soft" id="exportJsonBtn" type="button">Exporter JSON</button>
      <input type="file" id="jsonFileInput" accept=".json" style="display:none;" />
      <span id="importStatus" style="font-size:0.75rem;color:var(--muted);"></span>
    </div>`;
  sp.appendChild(ioP);

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const d = { bcRecords: state.bcRecords, payments: state.payments||[], suppliers: state.suppliers||[], requesters: state.requesters||[], departments: state.departments||[], supplierDeptMap: state.supplierDeptMap||{}, stockItems: state.stockItems||[], stockLogs: state.stockLogs||[], holidays: state.holidays||[], settings: state.settings||{}, exportDate: new Date().toISOString(), version: 'suivi-achats-premium-v2' };
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'suivi_export_' + new Date().toISOString().split('T')[0] + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    showToast('Export JSON téléchargé !');
  });

  document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('jsonFileInput').click());
  document.getElementById('jsonFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const st = document.getElementById('importStatus'); st.textContent = 'Lecture...';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result); let imp = 0;
        if (data.bcRecords) {
          const refs = new Set(state.bcRecords.map(r => r.ref));
          data.bcRecords.forEach(rec => {
            const n = normalizeBcRecord(rec);
            n.department = rec.department || autoDept(rec.supplierName||'');
            n.remarques = rec.remarques||''; n.lineItems = rec.lineItems||[];
            n.tva = rec.tva||0; n.remise = rec.remise||0; n.transport = rec.transport||0;
            n.timbre = rec.timbre||0; n.amountHT = rec.amountHT||0;
            if (!refs.has(n.ref)) { state.bcRecords.push(n); imp++; }
            else { const ex = state.bcRecords.find(r => r.ref === n.ref); if (ex) Object.keys(n).forEach(k => { if (n[k] && !ex[k]) ex[k] = n[k]; }); }
          });
        }
        if (data.payments) { const ids = new Set(state.payments.map(p => p.id)); data.payments.forEach(p => { if (!ids.has(p.id)) state.payments.push(p); }); }
        if (data.suppliers) { const s = new Set(state.suppliers.map(x => typeof x==='object'?x.name:x)); data.suppliers.forEach(x => { const n=typeof x==='object'?x.name:x; if(!s.has(n))state.suppliers.push(typeof x === "object" ? x : { id: "sup_" + Math.random().toString(36).substr(2, 6), name: n }); }); }
        if (data.requesters) { const r = new Set(state.requesters.map(x => typeof x==='object'?x.name:x)); data.requesters.forEach(x => { const n=typeof x==='object'?x.name:x; if(!r.has(n))state.requesters.push(typeof x === "object" ? x : { id: "req_" + Math.random().toString(36).substr(2, 6), name: n }); }); }
        if (data.departments) { data.departments.forEach(d => { if (!state.departments.includes(d)) state.departments.push(d); }); }
        if (data.supplierDeptMap) { state.supplierDeptMap = Object.assign(state.supplierDeptMap||{}, data.supplierDeptMap); }
        saveState(); refreshFollowupFilterOptions(); renderApp();
        st.textContent = '\u2713 ' + imp + ' nouveaux BC, ' + state.bcRecords.length + ' total';
        st.style.color = '#16a34a';
        showToast('Import réussi ! ' + imp + ' nouveaux enregistrements.');
      } catch (err) { st.textContent = '\u2717 Erreur: ' + err.message; st.style.color = '#dc2626'; }
    };
    reader.readAsText(file); e.target.value = '';
  });
})();

// ================================================================
// 21. DOUBLE-CLICK FULLSCREEN FOR CHARTS
// ================================================================
(function setupChartFullscreen() {
  const ov = document.createElement('div');
  ov.id = 'chartFullscreenOverlay';
  ov.innerHTML = '<div id="chartFullscreenContent"></div><div id="chartFullscreenClose">\u2715 Fermer (Echap)</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.id === 'chartFullscreenClose') ov.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ov.classList.remove('active'); });
  document.addEventListener('dblclick', (e) => {
    const panel = e.target.closest('.chart-panel, .fleet-card, .fleet-chart-panel');
    if (!panel) return;
    document.getElementById('chartFullscreenContent').innerHTML = panel.outerHTML;
    ov.classList.add('active');
  });
})();

console.log('[app-enhancements] Full enhancement layer loaded. Records: ' + state.bcRecords.length);

// Override fillReferenceLists to prevent localeCompare crash
window.fillReferenceLists = function() {
  const safeSort = (a, b) => {
    const nameA = String(typeof a === 'object' ? (a.name || '') : a);
    const nameB = String(typeof b === 'object' ? (b.name || '') : b);
    return nameA.localeCompare(nameB);
  };
  const formatOpt = (x) => {
    const n = typeof x === 'object' ? (x.name || '') : x;
    return '<option value="' + escapeHtml(n) + '"></option>';
  };
  const supEl = document.getElementById('suppliersList');
  if (supEl) supEl.innerHTML = (state.suppliers||[]).slice().sort(safeSort).map(formatOpt).join('');
  const reqEl = document.getElementById('requestersList');
  if (reqEl) reqEl.innerHTML = (state.requesters||[]).slice().sort(safeSort).map(formatOpt).join('');
};

const origRenderReferenceManagers = window.renderReferenceManagers;
window.renderReferenceManagers = function() {
  if (origRenderReferenceManagers) origRenderReferenceManagers();
  const supEl = document.getElementById('settingsSuppliersList');
  if (supEl) {
    supEl.innerHTML = (state.suppliers && state.suppliers.length)
      ? state.suppliers.slice().sort((a,b) => String(typeof a==='object'?a.name:a).localeCompare(String(typeof b==='object'?b.name:b))).map(s => {
          const n = typeof s === 'object' ? s.name : s;
          const id = typeof s === 'object' ? s.id : s;
          return '<li><span class="ref-name">' + escapeHtml(n) + '</span><button type="button" class="icon-btn text-danger" data-remove-supplier="' + escapeHtml(id) + '">×</button></li>';
        }).join('')
      : '<li class="muted">Aucun fournisseur.</li>';
  }
};

// ================================================================
// USER MANAGEMENT & USER SETTINGS SUITE (APPRO MODULE)
// ================================================================
window.renderUsersSettingsTable = function() {
  const tbody = document.getElementById('usersSettingsTableBody');
  if (!tbody) return;
  const users = (typeof state !== 'undefined' && Array.isArray(state.users)) ? state.users : [];
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:12px;">Aucun utilisateur configuré.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const roleBadge = u.role === 'admin' ? 'style="background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : (u.role === 'procurement' ? 'style="background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : (u.role === 'stock' ? 'style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;padding:2px 8px;border-radius:4px;"'
      : 'style="background:rgba(148,163,184,0.15);color:#64748b;font-weight:700;padding:2px 8px;border-radius:4px;"'));
    const roleLabel = {
      admin: 'Administrateur (Dual)',
      procurement: 'Acheteur / Appro',
      finance: 'Finance / Trésorerie',
      stock: 'Magasinier / Stock',
      management: 'Direction Générale'
    }[u.role] || u.role;

    return `
      <tr>
        <td><strong>👤 ${escapeHtml(u.username)}</strong></td>
        <td><span ${roleBadge}>${roleLabel}</span></td>
        <td><code>••••••••</code></td>
        <td style="text-align:right;">
          <button class="btn btn-soft" type="button" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="showUserModal('${escapeHtml(u.username)}')" title="Modifier les paramètres de cet utilisateur">⚙️ Paramètres</button>
          ${u.username !== 'admin' ? `<button class="btn btn-ghost" type="button" style="padding:0.25rem 0.4rem;font-size:0.75rem;color:#ef4444;" onclick="deleteUserFromSettings('${escapeHtml(u.username)}')" title="Supprimer cet utilisateur">🗑️</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
};

window.showUserModal = function(username) {
  const modal = document.getElementById('userEditModalBackdrop');
  if (!modal) return;
  const user = (typeof state !== 'undefined' && Array.isArray(state.users))
    ? state.users.find(u => u.username === username)
    : null;

  const origInput = document.getElementById('userModalOriginalUsername');
  const userInput = document.getElementById('userModalUsername');
  const passInput = document.getElementById('userModalPassword');
  const roleInput = document.getElementById('userModalRole');
  const titleEl = document.getElementById('userModalTitle');

  if (origInput) origInput.value = user ? user.username : '';
  if (userInput) userInput.value = user ? user.username : '';
  if (passInput) passInput.value = '';
  if (roleInput) roleInput.value = user ? user.role : 'procurement';
  if (titleEl) titleEl.textContent = user ? `Paramètres : ${user.username}` : 'Nouvel Utilisateur';
  modal.classList.remove('hidden');
};

window.closeUserModal = function() {
  const modal = document.getElementById('userEditModalBackdrop');
  if (modal) modal.classList.add('hidden');
};

window.saveUserModal = function() {
  const origInput = document.getElementById('userModalOriginalUsername');
  const userInput = document.getElementById('userModalUsername');
  const passInput = document.getElementById('userModalPassword');
  const roleInput = document.getElementById('userModalRole');

  const origUsername = origInput ? origInput.value.trim() : '';
  const newUsername = userInput ? userInput.value.trim() : '';
  const newPassword = passInput ? passInput.value.trim() : '';
  const newRole = roleInput ? roleInput.value : 'procurement';

  if (!newUsername) {
    if (typeof showToast === 'function') showToast('Identifiant requis.');
    return;
  }

  if (!Array.isArray(state.users)) state.users = [];

  if (origUsername) {
    const u = state.users.find(x => x.username === origUsername);
    if (u) {
      u.username = newUsername;
      if (newPassword) u.password = newPassword;
      u.role = newRole;
      if (state.session && state.session.username === origUsername) {
        state.session.username = newUsername;
        state.session.role = newRole;
        if (typeof refreshAuthUi === 'function') refreshAuthUi();
      }
    }
  } else {
    if (state.users.some(x => x.username === newUsername)) {
      if (typeof showToast === 'function') showToast('Cet identifiant existe déjà.');
      return;
    }
    state.users.push({
      username: newUsername,
      password: newPassword || '123456',
      role: newRole
    });
  }

  if (typeof saveState === 'function') saveState();
  closeUserModal();
  renderUsersSettingsTable();
  if (typeof showToast === 'function') showToast('Paramètres utilisateur enregistrés avec succès.');
};

window.deleteUserFromSettings = function(username) {
  if (username === 'admin') {
    if (typeof showToast === 'function') showToast('Impossible de supprimer le compte administrateur principal.');
    return;
  }
  if (confirm(`Supprimer définitivement le compte utilisateur "${username}" ?`)) {
    state.users = (state.users || []).filter(u => u.username !== username);
    if (typeof saveState === 'function') saveState();
    renderUsersSettingsTable();
    if (typeof showToast === 'function') showToast('Utilisateur supprimé.');
  }
};

// Wire user modal controls & user chip
document.addEventListener('DOMContentLoaded', () => {
  const chip = document.getElementById('userChipWrap') || document.querySelector('.user-chip');
  if (chip) {
    chip.addEventListener('click', () => {
      const u = (typeof state !== 'undefined' && state.session) ? state.session.username : 'admin';
      showUserModal(u);
    });
  }

  const addBtn = document.getElementById('addNewUserBtn');
  if (addBtn) addBtn.addEventListener('click', () => showUserModal());

  const closeBtn = document.getElementById('closeUserModalBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeUserModal);

  const cancelBtn = document.getElementById('cancelUserModalBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeUserModal);
});

// App Router Helpers
window.App = window.App || {};
window.App.navigate = function(tab) {
  if (typeof setActiveTab === 'function') setActiveTab(tab);
};
window.App.showSettings = function() {
  if (typeof setActiveTab === 'function') setActiveTab('settings');
};
window.App.showUserModal = function(u) {
  showUserModal(u || (typeof state !== 'undefined' && state.session ? state.session.username : 'admin'));
};
window.App.showUserSettings = function(u) {
  showUserModal(u || (typeof state !== 'undefined' && state.session ? state.session.username : 'admin'));
};

// Initialize multi-select supplier dropdown on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    refreshSupplierMultiSelectOptions();
    renderUsersSettingsTable();
  });
} else {
  refreshSupplierMultiSelectOptions();
  renderUsersSettingsTable();
}

// GDS Stock Mobile Scanner Inter-App Bridge
window.openGdsStockScanner = function() {
  window.location.href = '../ERP_Douroub_v5/index.html?scan_gds=1';
};






  // Wire Purge All BCs button for manual construction
  const purgeBtn = document.getElementById('purgeAllBcsBtn');
  if (purgeBtn && !purgeBtn._hasPurgeListener) {
    purgeBtn._hasPurgeListener = true;
    purgeBtn.addEventListener('click', async () => {
      const ok = confirm('Êtes-vous sûr de vouloir vider TOUS les Bons de Commande ?\n\nCette action efface la base de données et réinitialise le tableau à zéro pour vous permettre de reconstruire manuellement vos données.');
      if (!ok) return;
      try {
        await fetch('/api/bc/purge-all', { method: 'POST' }).catch(() => {});
      } catch (_) {}
      state.bcRecords = [];
      try {
        localStorage.removeItem('suivi_achats_bcrecords');
        localStorage.removeItem('sde_suivi_state');
        localStorage.removeItem('sde_suivi_records');
        localStorage.removeItem('sde_bc_records');
        localStorage.removeItem('erp_douroub_bc_cache');
      } catch (_) {}
      if (typeof saveState === 'function') saveState();
      renderFollowupTable();
      showToast('Base BC entièrement vidée. Vous pouvez commencer la création manuelle.');
    });
  }
