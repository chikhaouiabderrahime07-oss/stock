/**
 * appro-nextgen.js
 * Advanced BC & DP Folder Scanner, Multi-BC Linking Engine & Next-Gen KPI
 * SPA DOUROUB ELDJAZAIR — Suite Intégrée
 */

// ============================================================
// HIGH-INTELLIGENCE DP & BC FINANCIAL BRAIN TAXONOMY & HELPERS
// ============================================================

const LEGAL_STOPWORDS_SET = new Set([
  'sarl', 'spa', 'eurl', 'ets', 'etablissement', 'etablissements', 'snc', 'step', 'scs', 'epe',
  'de', 'du', 'la', 'le', 'les', 'des', 'et', 'pour', 'au', 'aux', 'en', 'd', 'l',
  'algerie', 'algerienne', 'dz', 'district', 'com', 'direction', 'agence', 'filiale', 'cie', 'company', 'ste', 'societe', 'entreprise'
]);

function normalizeTextForBrain(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSignificantSupplierTokens(s) {
  const norm = normalizeTextForBrain(s);
  return norm.split(' ').filter(w => w.length > 1 && !LEGAL_STOPWORDS_SET.has(w));
}

function calcSupplierSimilarity(nameA, nameB) {
  const tokA = getSignificantSupplierTokens(nameA);
  const tokB = getSignificantSupplierTokens(nameB);
  if (!tokA.length || !tokB.length) return 0;

  const setA = new Set(tokA);
  const setB = new Set(tokB);
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter++;
  }
  const union = new Set([...setA, ...setB]).size;
  const jaccard = inter / union;
  const subset = (inter === setA.size || inter === setB.size) ? 0.9 : 0;
  
  const strA = tokA.join('');
  const strB = tokB.join('');
  let strMatch = 0;
  if (strA && strB && (strA.includes(strB) || strB.includes(strA))) {
    strMatch = 0.85;
  }
  return Math.max(jaccard, subset, strMatch);
}

function findBcSubsetSumCombination(items, target, maxK = 8, tol = 2.0) {
  if (!items || items.length === 0 || target <= 0) return null;
  const valid = items.filter(b => (b.amountTTC || b.amount || 0) <= target + tol).slice(0, 15);
  valid.sort((a, b) => ((b.amountTTC || b.amount || 0) - (a.amountTTC || a.amount || 0)));

  for (const b of valid) {
    const amt = b.amountTTC || b.amount || 0;
    if (Math.abs(amt - target) <= tol) return [b];
  }
  for (let i = 0; i < valid.length; i++) {
    const a = valid[i].amountTTC || valid[i].amount || 0;
    for (let j = i + 1; j < valid.length; j++) {
      const b = valid[j].amountTTC || valid[j].amount || 0;
      if (Math.abs(a + b - target) <= tol) return [valid[i], valid[j]];
    }
  }

  let found = null;
  function search(idx, current, currentSum) {
    if (found) return;
    if (Math.abs(currentSum - target) <= tol && current.length > 0) {
      found = current;
      return;
    }
    if (currentSum > target + tol || idx >= valid.length || current.length >= maxK) return;
    search(idx + 1, [...current, valid[idx]], currentSum + (valid[idx].amountTTC || valid[idx].amount || 0));
    search(idx + 1, current, currentSum);
  }
  search(0, [], 0);
  return found;
}

const DIRECT_PAYMENT_TAXONOMY = [
  { category: 'Energie & Utilités', pattern: /SONELGAZ|SONALGAZ|ELECTR[EÉI]CITE\s+ET\s+DU\s+GAZ|GAZ\s+NATUREL|SEAAL|EAU\s+POTABLE|\bWATER\b/i },
  { category: 'Carburant Étatique / Flotte', pattern: /NAFTAL/i },
  { category: 'Télécoms & Réseaux', pattern: /ALGERIE\s+TELECOM|MOBILIS|DJEZZY|OOREDOO|WATANIYA|ABONNEMENT\s+TELEPHONIQUE|CARTE\s+SIM|GUEDILA/i },
  { category: 'Fiscalité, Impôts & Taxes', pattern: /IMPOT|TAXE|G50|RECEVEUR.*IMPOTS|DGI|RECETTE\s+DES\s+IMPOTS|TRESOR|DROIT\s+DE\s+TIMBRE|ENREGISTREMENT/i },
  { category: 'Cotisations Sociales', pattern: /CNAS|CASNOS|CNR|MUTUELLE|COTISATION\s+SOCIALE/i },
  { category: 'Marchés & Contrats Cadres', pattern: /SETTOUTI|CONTRAT\s+N[°o]?\s*:\s*\d+/i },
  { category: 'Frais Juridiques & Notariés', pattern: /NOTAIRE|HUISSIER|AVOCAT|FRAIS\s+DE\s+JUSTICE|TRIBUNAL|MKIHEL/i },
  { category: 'Honoraires & Expertises', pattern: /HONORAIRES?\s+D['’]EXPERTISE|KAOUANE\s+FILALI|COMMISSAIRE\s+AUX\s+COMPTES|MOHAMMEDI\s+SLIMANE|TASSAMIM|GENIE\s+CIVIL/i },
  { category: 'Assurances & Sinistres', pattern: /ASSURANCE|CAAT|SAA|CASH\s+ASSURANCES|CIAR|GAM\s+ASSURANCES|AXA|EL\s+AMANA|SALAMA\s+ASSURANCE/i },
  { category: 'Douane, Transit & Fret', pattern: /TRANSIT\s+DERDOUR|TRANSIT\s+TAHAR|TRANSITAIRE|PORTUAIRE|PORT\s+DE\s+MOSTAGANEM|DOUANE|SKIKDA\s+CONTAINERS/i },
  { category: 'Services Bancaires & Financement', pattern: /BANQUE\s+AL\s*BARAKA|AGIOS|COMMISSION\s+BANCAIRE|FRAIS\s+BANCAIRES|CREDIT\s+BAIL|LEASING/i },
  { category: 'Frais Administratifs & Conformité', pattern: /BALADIYA|COMMUNE|TRESORIER\s+COMMUNAL|WILAYA|DAIRA|CNRC|REGISTRE\s+DU?\s+COMMERCE|LEGALISATION\s+REGISTRE|CTC|CONTROLE\s+TECHNIQUE\s+DES\s+VEHICULES/i },
  { category: 'Voyages & Déplacements', pattern: /TOURING\s+VOYAGES|KOUTOU\s+TRAVEL|BILLET.*AVION|HOTEL|OASIS\s+HOTELLERIE/i },
  { category: 'Cas Particulier / Dépense Directe', pattern: /SPECIAL\s+CASE|CAS\s+PARTICULIER/i }
];

function computePaymentDelayMetrics(bc, dp) {
  const bcDate = bc.date ? new Date(bc.date) : null;
  const daDate = bc.daValidatedAt ? new Date(bc.daValidatedAt) : bcDate;
  const dpDate = dp.requestDate ? new Date(dp.requestDate) : null;
  const paidDate = dp.paidDate ? new Date(dp.paidDate) : dpDate;

  if (bcDate && !isNaN(bcDate)) {
    if (daDate && !isNaN(daDate)) {
      bc.delayBcToDaDays = Math.max(0, Math.round((daDate - bcDate) / 86400000));
    } else {
      bc.delayBcToDaDays = 0;
    }
    if (dpDate && !isNaN(dpDate)) {
      const daRefDate = (daDate && !isNaN(daDate)) ? daDate : bcDate;
      bc.delayDaToDpDays = Math.max(0, Math.round((dpDate - daRefDate) / 86400000));
      bc.delayBcToDpDays = Math.max(0, Math.round((dpDate - bcDate) / 86400000));
    }
    if (paidDate && !isNaN(paidDate)) {
      bc.totalPaymentDelayDays = Math.max(0, Math.round((paidDate - bcDate) / 86400000));
      if (dpDate && !isNaN(dpDate)) {
        bc.delayDpToPaymentDays = Math.max(0, Math.round((paidDate - dpDate) / 86400000));
      }
    }
  }

  const totalDays = bc.totalPaymentDelayDays ?? (bc.delayBcToDpDays ?? 0);
  bc.delayStatus = totalDays < 15 ? 'rapide' : (totalDays <= 30 ? 'normal' : 'retard');
}

const ApproNextGen = window.ApproNextGen = {
  currentKpiPeriod: 'all',
  selectedComparisonSuppliers: [],
  selectedArticleFilter: '',
  spendingAmountTier: 'all',
  paymentDelayFilter: 'all',
  bcImportanceFilter: 'all',

  ensureDataHydrated() {
    if (typeof state === 'undefined') return;
    const preload = (typeof window !== 'undefined' && window.PRELOAD_DATA) ? window.PRELOAD_DATA : null;
    if (!preload) return;

    let changed = false;
    if (!Array.isArray(state.bcRecords) || state.bcRecords.length === 0) {
      if (Array.isArray(preload.bcRecords) && preload.bcRecords.length > 0) {
        state.bcRecords = Array.isArray(preload.bcRecords) ? JSON.parse(JSON.stringify(preload.bcRecords)) : [];
        changed = true;
      }
    }
    if (!Array.isArray(state.payments) || state.payments.length === 0) {
      if (Array.isArray(preload.payments) && preload.payments.length > 0) {
        state.payments = Array.isArray(preload.payments) ? JSON.parse(JSON.stringify(preload.payments)) : [];
        changed = true;
      }
    }
    if (changed) {
      this.autoLinkBcsAndDps();
      if (typeof saveState === 'function') saveState();
    }
  },

  init() {
    console.log('[ApproNextGen] Initializing Next-Gen Appro & KPI Suite...');
    this.checkRoleAccess();
    this.injectNavigationPills();
    this.injectScannerBanners();
    this.injectKpiAdvancedControls();
    this.injectFollowupImportanceControls();
    this.overridePaymentsTable();
    this.overrideKpiDashboard();
    this.loadScannedDataIfEmpty();
    this.listenForPortalTheme();
  },

  checkRoleAccess() {
    if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
    let role = localStorage.getItem('sde_user_role');

    // Auto-detect if user is an admin
    function detectIsAdmin() {
      if (role === 'admin' || role === 'superadmin' || role === 'directeur') return true;
      try {
        if (typeof state !== 'undefined' && state.session && (state.session.role === 'admin' || state.session.username === 'admin' || state.session.role === 'management')) return true;
        const approSess = localStorage.getItem('suivi_session');
        if (approSess) {
          const parsed = JSON.parse(approSess);
          if (parsed && (parsed.role === 'admin' || parsed.username === 'admin' || parsed.role === 'management')) return true;
        }
        const stockSess = localStorage.getItem('erp_douroub_session');
        if (stockSess) {
          const parsed = JSON.parse(stockSess);
          if (parsed && (parsed.role === 'admin' || parsed.username === 'admin')) return true;
        }
      } catch(e) {}
      return false;
    }

    const isAdmin = detectIsAdmin();
    if (isAdmin && role !== 'superadmin' && role !== 'admin') {
      role = 'admin';
      try { localStorage.setItem('sde_user_role', 'admin'); } catch(e) {}
    }

    // ONLY lock if non-admin role is admin_stock
    if (role === 'admin_stock' && !isAdmin) {
      const lockOverlay = document.createElement('div');
      lockOverlay.id = 'roleLockOverlay';
      lockOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,19,41,0.97);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;';
      lockOverlay.innerHTML = `
        <div style="background:#111e38;border:2px solid #ef4444;border-radius:16px;max-width:540px;padding:30px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);color:#fff;font-family:sans-serif;">
          <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:rgba(239,68,68,0.2);border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;font-size:28px;color:#ef4444;">
            <i class="fas fa-lock"></i>
          </div>
          <h2 style="font-size:20px;margin-bottom:8px;font-weight:800;">Accès Restreint</h2>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:20px;">
            Votre session actuelle est configurée pour le profil <strong>Magasinier (Stock & Magasin)</strong>.<br>
            Ce compte a un accès exclusif au module de Stock et n'a pas accès au module Achats & Bons de Commande.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <a href="/#stock" onclick="try{localStorage.setItem('erp_active_module','stock');}catch(e){}" style="background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
              🏢 Aller à mon module Stock
            </a>
            <a href="/#dashboard" style="background:#1e293b;border:1px solid #475569;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;" onclick="localStorage.removeItem('sde_user_role');">
              🏛️ Portail Principal
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(lockOverlay);
    }
  },

  // Navigation pills between unified portal, stock, and appro
  injectNavigationPills() {
    if (typeof document === 'undefined' || !document.querySelector || !document.createElement) return;
    const tools = document.querySelector('.topbar-tools');
    if (!tools || document.getElementById('navPillsGroup')) return;

    let role = (typeof localStorage !== 'undefined' && localStorage.getItem('sde_user_role')) || '';

    // Auto-detect if user is admin
    const isAdmin = (role === 'admin' || role === 'superadmin' || role === 'directeur') ||
      (typeof state !== 'undefined' && state.session && (state.session.role === 'admin' || state.session.username === 'admin' || state.session.role === 'management'));
    const isSuper = role === 'superadmin';
    const hasDualAccess = isAdmin || isSuper;

    const group = document.createElement('div');
    group.id = 'navPillsGroup';
    group.style.display = 'inline-flex';
    group.style.gap = '6px';
    group.style.alignItems = 'center';
    group.style.marginRight = '8px';

    group.innerHTML = `
      ${hasDualAccess ? `
        <a href="/#stock" onclick="try{localStorage.setItem('erp_active_module','stock');}catch(e){}" class="btn btn-soft" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-size:0.78rem;padding:0.4rem 0.75rem;background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.25);border-radius:6px;" title="Basculer vers Stock & Flotte">
          <i class="fas fa-boxes-stacked"></i> Stock & Flotte <!-- 🏢 Stock & Flotte -->
        </a>
      ` : ''}
    `;

    tools.insertAdjacentElement('afterbegin', group);
  },

  // 1. Auto-load pre-scanned 364 BCs & 148 DPs if state is missing them
  loadScannedDataIfEmpty() {
    this.ensureDataHydrated();
    // If running in file:/// protocol or PRELOAD_DATA is available, use preloaded dataset directly without CORS fetch
    if (typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
      if (!state.payments || state.payments.length <= 15) {
        state.payments = Array.isArray(window.PRELOAD_DATA.payments) ? JSON.parse(JSON.stringify(window.PRELOAD_DATA.payments)) : [];
        this.autoLinkBcsAndDps();
        if (typeof saveState === 'function') saveState();
        if (typeof renderApp === 'function') renderApp();
      }
      return;
    }

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      // In offline file:/// mode without PRELOAD_DATA, do not attempt network fetch
      return;
    }

    if (typeof fetch !== 'function') return;
    fetch('../data/extracted_dps_linked.json')
      .then(r => r.json())
      .then(dps => {
        if (dps && Array.isArray(dps) && dps.length > 0) {
          console.log(`[ApproNextGen] Loaded ${dps.length} pre-scanned Demandes de Paiement from server dataset.`);
          if (!state.payments || state.payments.length <= 15) {
            state.payments = dps;
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
          }
        }
      })
      .catch(() => {});
  },

  // Cross-link BCs and DPs in browser state with High-Intelligence Multi-Strategy Brain
  autoLinkBcsAndDps() {
    if (!state.bcRecords || !state.payments) return;

    const bcById = new Map();
    const bcByRef = new Map();
    const bcByNum = new Map();

    state.bcRecords.forEach(b => {
      if (b.id) bcById.set(b.id, b);
      if (b.ref) {
        bcByRef.set(b.ref.trim().toUpperCase(), b);
        const m = b.ref.match(/(\d+)/);
        if (m) bcByNum.set(parseInt(m[1], 10), b);
      }
    });

    state.payments.forEach(dp => {
      // Preserve manual link if already set by user
      if (dp.manualLink && Array.isArray(dp.linkedBcIds) && dp.linkedBcIds.length > 0) {
        dp.linkedBcIds.forEach(id => {
          const bc = bcById.get(id);
          if (bc) {
            bc.status = 'paye';
            bc.dpRef = dp.paymentRef;
            bc.dpDate = dp.requestDate;
            bc.paymentPaidDate = dp.paidDate || dp.requestDate;
            computePaymentDelayMetrics(bc, dp);
            dp.delayBcToDpDays = bc.delayBcToDpDays;
            dp.totalPaymentDelayDays = bc.totalPaymentDelayDays;
            dp.delayStatus = bc.delayStatus;
          }
        });
        return;
      }

      const docs = dp.referenceDocs || '';
      const src = dp.sourceFile || '';
      const ben = dp.beneficiary || '';
      const nat = dp.natureExpense || '';
      const fullText = `${ben} ${docs} ${src} ${nat} ${dp.paymentRef || ''}`;

      let matchedBcs = [];

      // Strategy 1: Explicit BC regex matching (BC N°XX, BC XX, BC-XX, XX/DG/2026, BC #XX)
      const bcMatches = [
        ...fullText.matchAll(/BC\s*(?:N[°o]?)?\s*(\d+)/gi),
        ...fullText.matchAll(/BC\s*[-_#]\s*(\d+)/gi),
        ...fullText.matchAll(/(\d{1,4})\s*\/\s*DG\s*\/\s*202[56]/gi)
      ];
      for (const m of bcMatches) {
        const num = parseInt(m[1], 10);
        const cand = bcByNum.get(num);
        if (cand && !matchedBcs.some(b => b.id === cand.id)) {
          matchedBcs.push(cand);
        }
      }

      // Strategy 2: Ref number match with tokenized supplier verification
      if (matchedBcs.length === 0) {
        const dpNumMatch = String(dp.paymentRef || '').match(/(\d+)/);
        if (dpNumMatch) {
          const num = parseInt(dpNumMatch[1], 10);
          const cand = bcByNum.get(num);
          if (cand) {
            const sim = calcSupplierSimilarity(cand.supplierName, ben);
            if (sim >= 0.4) {
              matchedBcs.push(cand);
            }
          }
        }
      }

      // Strategy 3: Advanced Fuzzy Supplier Matching + Financial Concordance (Exact, Subset Sum Multi-BC, Advance Partial, Stamp Duty)
      if (matchedBcs.length === 0 && dp.amount > 0) {
        const candBcs = state.bcRecords.filter(b => calcSupplierSimilarity(b.supplierName, ben) >= 0.4);
        if (candBcs.length > 0) {
          // 3A. Exact or Subset Sum multi-BC match
          const combo = findBcSubsetSumCombination(candBcs, dp.amount, 8, 2.0);
          if (combo && combo.length > 0) {
            matchedBcs.push(...combo);
          } else {
            // 3B. Partial advance payment (50% or 30%)
            const partial = candBcs.find(b => {
              const ttc = b.amountTTC || b.amount || 0;
              return Math.abs(ttc * 0.5 - dp.amount) < 2.0 || Math.abs(ttc * 0.3 - dp.amount) < 2.0;
            });
            if (partial) {
              matchedBcs.push(partial);
            } else {
              // 3C. Stamp duty tolerance (Timbre fiscal up to 2500 DZD or within 5%)
              const stampMatch = candBcs.find(b => {
                const ttc = b.amountTTC || b.amount || 0;
                return Math.abs(ttc - dp.amount) <= 2500 && Math.abs(ttc - dp.amount) / dp.amount < 0.05;
              });
              if (stampMatch) matchedBcs.push(stampMatch);
            }
          }
        }
      }

      // Strategy 4: If BCs matched, synchronize and compute turnaround delays
      if (matchedBcs.length > 0) {
        dp.isDirect = false;
        dp.directCategory = '';
        dp.linkedBcIds = matchedBcs.map(b => b.id);
        dp.linkedBcRefs = matchedBcs.map(b => b.ref);

        let maxTotalDelay = 0;
        let minBcToDp = 9999;
        matchedBcs.forEach(b => {
          b.status = 'paye';
          b.dpRef = dp.paymentRef;
          b.dpDate = dp.requestDate;
          b.paymentPaidDate = dp.paidDate || dp.requestDate;
          computePaymentDelayMetrics(b, dp);

          if ((b.totalPaymentDelayDays || 0) > maxTotalDelay) maxTotalDelay = b.totalPaymentDelayDays;
          if (b.delayBcToDpDays != null && b.delayBcToDpDays < minBcToDp) minBcToDp = b.delayBcToDpDays;
        });

        dp.delayBcToDpDays = minBcToDp === 9999 ? 0 : minBcToDp;
        dp.totalPaymentDelayDays = maxTotalDelay;
        dp.delayStatus = maxTotalDelay < 15 ? 'rapide' : (maxTotalDelay <= 30 ? 'normal' : 'retard');
        return;
      }

      // Strategy 5: Direct Payment Auto-Detection & Categorization
      for (const tax of DIRECT_PAYMENT_TAXONOMY) {
        if (tax.pattern.test(fullText)) {
          dp.isDirect = true;
          dp.directCategory = tax.category;
          dp.linkedBcIds = [];
          dp.linkedBcRefs = [];

          const reqD = dp.requestDate ? new Date(dp.requestDate) : null;
          const paidD = dp.paidDate ? new Date(dp.paidDate) : reqD;
          if (reqD && paidD && !isNaN(reqD) && !isNaN(paidD)) {
            dp.delayDpToPaymentDays = Math.max(0, Math.round((paidD - reqD) / 86400000));
            dp.totalPaymentDelayDays = dp.delayDpToPaymentDays;
            dp.delayStatus = dp.totalPaymentDelayDays < 7 ? 'rapide' : (dp.totalPaymentDelayDays <= 15 ? 'normal' : 'retard');
          } else {
            dp.delayDpToPaymentDays = 0;
            dp.totalPaymentDelayDays = 0;
            dp.delayStatus = 'rapide';
          }
          return;
        }
      }

      // Default for unlinked regular expenditures
      dp.isDirect = false;
      dp.linkedBcIds = dp.linkedBcIds || [];
      dp.linkedBcRefs = dp.linkedBcRefs || [];
    });
  },

  // 2. Inject scanner banners on "Suivi BC" and "Paiements"
  injectScannerBanners() {
    // A) Suivi BC Banner
    const followupPage = document.getElementById('page-followup');
    if (followupPage && !document.getElementById('bcScannerBanner')) {
      const banner = document.createElement('div');
      banner.id = 'bcScannerBanner';
      banner.className = 'scanner-banner';
      banner.innerHTML = `
        <div>
          <h3><span style="font-size:1.3rem;">⚡</span> Scanner Dossier Bons de Commande (Scan Récursif)</h3>
          <p>Scanne automatiquement tous les sous-dossiers (BC 1-50, 51-100...), extrait les articles, prix, HT/TTC, dates et fournisseurs.</p>
        </div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
          <input type="file" id="bcDirectoryInput" webkitdirectory directory multiple style="display:none;" onchange="ApproNextGen.handleBcDirectorySelect(event)">
          <button class="btn-scanner-action" type="button" onclick="document.getElementById('bcDirectoryInput').click();">
            📂 Choisir le dossier BON DE COMMANDE
          </button>
          <button class="btn-scanner-action" type="button" style="background:#475569;" onclick="ApproNextGen.triggerServerBcScan();">
            🔄 Scanner dossier serveur
          </button>
        </div>
      `;
      const header = followupPage.querySelector('.page-header');
      if (header) header.insertAdjacentElement('afterend', banner);
    }

    // B) Paiements Banner
    const paymentsPage = document.getElementById('page-payments');
    if (paymentsPage && !document.getElementById('dpScannerBanner')) {
      const banner = document.createElement('div');
      banner.id = 'dpScannerBanner';
      banner.className = 'scanner-banner';
      banner.innerHTML = `
        <div>
          <h3><span style="font-size:1.3rem;">⚡</span> Scanner Dossier Demandes de Paiement (Word & Excel)</h3>
          <p>Scanne les dossiers 2026 - DEMANDE DE PAIEMENT, extrait montants, bénéficiaires, objets, et lie aux Bons de Commande (ou dépenses directes Sonelgaz/Baladiya).</p>
        </div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
          <input type="file" id="dpDirectoryInput" webkitdirectory directory multiple style="display:none;" onchange="ApproNextGen.handleDpDirectorySelect(event)">
          <button class="btn-scanner-action btn-scanner-dp" type="button" onclick="document.getElementById('dpDirectoryInput').click();">
            📂 Choisir le dossier DEMANDE DE PAIEMENT
          </button>
          <button class="btn-scanner-action btn-scanner-dp" type="button" style="background:#0f766e;" onclick="ApproNextGen.triggerServerDpScan();">
            🔄 Scanner dossier serveur
          </button>
        </div>
      `;
      const header = paymentsPage.querySelector('.page-header');
      if (header) header.insertAdjacentElement('afterend', banner);
    }
  },

  // 3. BC Folder Scanner Implementation
  handleBcDirectorySelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const bcFiles = files.filter(f => (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) && !f.name.startsWith('~'));
    if (!bcFiles.length) {
      showToast('Aucun fichier Excel (.xlsx/.xls) trouvé dans le dossier sélectionné.');
      return;
    }

    this.showScannerModal('Scan des Bons de Commande', bcFiles.length);

    let processed = 0;
    let addedCount = 0;
    const recordsMap = new Map(state.bcRecords.map(r => [r.ref, r]));

    const processNext = (index) => {
      if (index >= bcFiles.length) {
        this.updateScanLog(`Terminé ! ${processed} fichiers traités, ${addedCount} BCs ajoutés ou actualisés.`, 'success');
        this.finishScanButton(() => {
          state.bcRecords = Array.from(recordsMap.values());
          this.autoLinkBcsAndDps();
          saveState();
          renderApp();
          showToast(`Scan terminé : ${addedCount} BCs traités !`);
        });
        return;
      }

      const file = bcFiles[index];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellFormula: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          if (ws) {
            const parsed = this.parseBcWorksheet(ws, file.name, file.webkitRelativePath || file.name);
            if (parsed && parsed.ref) {
              recordsMap.set(parsed.ref, parsed);
              addedCount++;
              this.updateScanLog(`[${index + 1}/${bcFiles.length}] ${parsed.ref} — ${parsed.supplierName} (${formatMoney(parsed.amountTTC, 'DZD')})`, 'info');
            }
          }
        } catch (err) {
          this.updateScanLog(`[Erreur] ${file.name}: ${err.message}`, 'warn');
        }

        processed++;
        this.updateScanProgress(processed, bcFiles.length);
        setTimeout(() => processNext(index + 1), 10);
      };
      reader.readAsArrayBuffer(file);
    };

    processNext(0);
  },

  parseBcWorksheet(ws, filename, relativePath) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const getCellVal = (r, c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v ?? '').trim() : '';
    };

    let fileNum = '';
    const fnNum = filename.match(/BC\s*(\d+)/i);
    if (fnNum) fileNum = fnNum[1];

    let bcRef = '';
    let bcDate = '';
    let supplier = '';
    let amountHT = 0;
    let amountTTC = 0;
    const lineItems = [];

    // Scan headers
    for (let r = 0; r <= Math.min(range.e.r, 25); r++) {
      for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
        const val = getCellVal(r, c);
        const valUp = val.toUpperCase();
        if (!bcRef && (valUp.includes('BC N°') || valUp.includes('BC N'))) {
          const m = val.match(/BC\s*N[°o]?\s*([0-9]+[^\s\n]*)/i);
          if (m) bcRef = `BC N°${m[1]}`;
        }
        if (!bcDate && valUp.includes('DATE')) {
          const dm = val.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
          if (dm) bcDate = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
        }
        if (!supplier && valUp.includes('FOURNISSEUR')) {
          const m = val.match(/FOURNISSEUR\s*[:]\s*(.+)/i);
          if (m && m[1].trim()) supplier = m[1].trim();
          else supplier = getCellVal(r, c + 1) || getCellVal(r + 1, c) || '';
        }
      }
    }

    if (!supplier || supplier.toUpperCase().includes('DOUROUB')) {
      const fnClean = filename.replace(/BC\s*\d+/i, '').replace(/\.xlsx?/i, '').replace(/[-_]/g, ' ').trim();
      if (fnClean.length > 2) supplier = fnClean;
    }

    if (!bcRef && fileNum) bcRef = `BC N°${fileNum}/DG/2026`;
    if (!bcDate) bcDate = '2026-02-15';

    // Scan totals
    for (let r = 20; r <= Math.min(range.e.r, 120); r++) {
      for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
        const val = getCellVal(r, c).toUpperCase();
        if (val.includes('TOTAL HT')) {
          const v = parseFloat(getCellVal(r, c + 1).replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(v) && v > 0) amountHT = v;
        }
        if (val.includes('TOTAL TTC')) {
          const v = parseFloat(getCellVal(r, c + 1).replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(v) && v > 0) amountTTC = v;
        }
      }
    }

    // Scan line items
    for (let r = 20; r <= Math.min(range.e.r, 100); r++) {
      const descCell = getCellVal(r, 3) || getCellVal(r, 2);
      if (descCell && !descCell.toUpperCase().includes('TOTAL') && !descCell.toUpperCase().includes('REMARQUE') && descCell.length > 2) {
        const qty = parseFloat(getCellVal(r, 2).replace(/\s/g, '').replace(',', '.')) || 1;
        const pu = parseFloat(getCellVal(r, 6).replace(/\s/g, '').replace(',', '.')) || 0;
        const total = parseFloat(getCellVal(r, 7).replace(/\s/g, '').replace(',', '.')) || (qty * pu);
        lineItems.push({ description: descCell, qty: qty, unit: 'U', unitPrice: pu, lineTotal: total });
      }
    }

    if (!amountTTC && amountHT) amountTTC = Math.round(amountHT * 1.19);
    if (!amountHT && amountTTC) amountHT = Math.round(amountTTC / 1.19);
    if (!amountTTC && lineItems.length > 0) {
      const sumItems = lineItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
      if (sumItems > 0) {
        amountHT = Math.round(sumItems);
        amountTTC = Math.round(sumItems * 1.19);
      }
    }

    const type = (supplier.toUpperCase().includes('MAGHREB TRUCK') || supplier.toUpperCase().includes('VOYAGE') || supplier.toUpperCase().includes('HOTEL')) ? 'service' : 'achat';

    return {
      id: `bc_scan_${fileNum || Math.random().toString(36).substr(2, 6)}`,
      ref: bcRef,
      daRef: '',
      daStatus: 'validated',
      daValidatedAt: `${bcDate}T09:00:00.000Z`,
      requestDate: bcDate,
      date: bcDate,
      supplierName: supplier,
      amount: amountTTC || amountHT || 0,
      amountHT: amountHT,
      amountTTC: amountTTC,
      currency: 'DZD',
      type: type,
      description: lineItems[0]?.description || (supplier + ' - Prestation'),
      status: 'clos',
      promisedDate: bcDate,
      goodsReceivedDate: type === 'achat' ? bcDate : '',
      serviceDoneDate: type === 'service' ? bcDate : '',
      requester: 'Service Approvisionnement',
      paymentTerms: 'CHEQUE',
      sourceFile: relativePath,
      lineItems: lineItems,
      lineCount: lineItems.length,
      totalQty: lineItems.reduce((s, i) => s + (i.qty || 1), 0),
      department: typeof autoDept === 'function' ? autoDept(supplier) : 'Structure Transport',
      subfolder: relativePath.split('/')[0] || 'BC'
    };
  },

  // 4. Demande de Paiement Folder Scanner (Word .docx + Excel)
  handleDpDirectorySelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const dpFiles = files.filter(f => (f.name.endsWith('.docx') || f.name.endsWith('.xlsx')) && !f.name.startsWith('~'));
    if (!dpFiles.length) {
      showToast('Aucun fichier Demande de Paiement trouvé.');
      return;
    }

    this.showScannerModal('Scan des Demandes de Paiement', dpFiles.length);

    let processed = 0;
    let addedCount = 0;
    const dpsMap = new Map((state.payments || []).map(p => [p.id || p.paymentRef, p]));

    const processNext = (index) => {
      if (index >= dpFiles.length) {
        this.updateScanLog(`Scan DP terminé ! ${processed} fichiers traités, ${addedCount} Demandes de Paiement prêtes.`, 'success');
        this.finishScanButton(() => {
          state.payments = Array.from(dpsMap.values());
          this.autoLinkBcsAndDps();
          saveState();
          renderApp();
          showToast(`${addedCount} Demandes de Paiement importées et indexées !`);
        });
        return;
      }

      const file = dpFiles[index];
      if (file.name.endsWith('.docx') && typeof JSZip !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => {
          JSZip.loadAsync(e.target.result)
            .then(zip => {
              const docXml = zip.file('word/document.xml');
              if (docXml) return docXml.async('text');
              return '';
            })
            .then(xml => {
              if (xml) {
                const parsed = this.parseDpXml(xml, file.name, file.webkitRelativePath || file.name);
                if (parsed && (parsed.id || parsed.paymentRef)) {
                  dpsMap.set(parsed.id || parsed.paymentRef, parsed);
                  addedCount++;
                  this.updateScanLog(`[${index + 1}/${dpFiles.length}] DP ${parsed.paymentRef} — ${parsed.beneficiary} (${formatMoney(parsed.amount, 'DZD')})`, 'info');
                }
              }
            })
            .catch(err => {
              this.updateScanLog(`[Erreur] ${file.name}: ${err.message}`, 'warn');
            })
            .finally(() => {
              processed++;
              this.updateScanProgress(processed, dpFiles.length);
              setTimeout(() => processNext(index + 1), 10);
            });
        };
        reader.readAsArrayBuffer(file);
      } else {
        processed++;
        this.updateScanProgress(processed, dpFiles.length);
        setTimeout(() => processNext(index + 1), 5);
      }
    };

    processNext(0);
  },

  parseDpXml(xml, filename, relativePath) {
    // Strip XML drawing/pict binary to prevent base64 noise
    let cleanXml = xml.replace(/<w:drawing[\s\S]*?<\/w:drawing>/gi, '');
    cleanXml = cleanXml.replace(/<w:pict[\s\S]*?<\/w:pict>/gi, '');

    const text = cleanXml.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    let ref = '';
    const ref_m = text.match(/Demande de paiement N[°o]?\s*[:]?\s*([0-9]+[/\-][0-9]+|[0-9]+)/i);
    if (ref_m) ref = ref_m[1];
    if (!ref) {
      const fn_m = filename.match(/PAIEMENT\s*([0-9]+)/i);
      if (fn_m) ref = `${fn_m[1]}/2026`;
    }

    let date_str = '';
    const m_date = text.match(/Date\s*\n\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i) || text.match(/(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/);
    if (m_date) {
      const parts = m_date[1].split(/[\/\-.]/);
      if (parts.length === 3 && parseInt(parts[2]) >= 2024) {
        date_str = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let amount = 0;
    const m_amt = text.match(/Montant\s*[:]?\s*(?:\n\s*)?([0-9\s\u00a0,.]+)/i) || text.match(/Montant\s*\n\s*([^\n]+)/i);
    if (m_amt) {
      const cleanNum = m_amt[1].replace(/DA/gi, '').replace(/[\s\u00a0]/g, '').replace(',', '.');
      const num_m = cleanNum.match(/([0-9]+(\.[0-9]+)?)/);
      if (num_m) amount = parseFloat(num_m[1]) || 0;
    }

    let ben = '';
    const m_ben = text.match(/B[ée]n[ée]ficiaire\s*:\s*([^\n]+)/i);
    if (m_ben) ben = m_ben[1].trim();
    if (!ben) {
      ben = filename.replace(/DEMANDE\s*DE\s*PAIEMENT\s*[0-9]+/i, '').replace('.docx', '').replace(/[-_]/g, ' ').trim();
    }
    ben = this.cleanArabicToFrench(ben) || 'Bénéficiaire';

    let nature = '';
    const m_nat = text.match(/Nature de la d[ée]pense\s*:\s*\n?\s*([^\n]+)/i);
    if (m_nat) nature = m_nat[1].trim();
    nature = this.cleanArabicToFrench(nature) || 'Dépense d\'exploitation';

    let ref_docs = '';
    const m_doc = text.match(/Pi[èe]ces?\s*R[ée]f[ée]rence\s*:\s*\n?\s*([^\n]+)/i);
    if (m_doc) ref_docs = m_doc[1].trim();
    ref_docs = this.cleanArabicToFrench(ref_docs);

    const fullDirectSearch = `${filename} ${ben} ${nature} ${ref_docs}`;
    let isDirect = false;
    let directCategory = '';
    for (const tax of DIRECT_PAYMENT_TAXONOMY) {
      if (tax.pattern.test(fullDirectSearch)) {
        isDirect = true;
        directCategory = tax.category;
        break;
      }
    }

    return {
      id: `dp_${Math.random().toString(36).substr(2, 6)}_${ref.replace(/[^a-zA-Z0-9]/g, '')}`,
      paymentRef: ref || `DP-${Math.random().toString(36).substr(2, 4)}`,
      requestDate: date_str || '2026-03-01',
      paidDate: date_str || '2026-03-15',
      amount: amount,
      beneficiary: ben,
      department: 'Direction Générale',
      natureExpense: nature,
      referenceDocs: ref_docs,
      isDirect: isDirect,
      directCategory: directCategory,
      status: amount > 0 ? 'paye' : 'programme',
      mode: /CHEQUE/i.test(ref_docs) ? 'cheque' : 'virement',
      sourceFile: this.cleanArabicToFrench(relativePath),
      linkedBcIds: []
    };
  },

  cleanArabicToFrench(text) {
    if (!text) return '';
    let s = String(text);
    s = s.replace(/\u0623\u0645\u064a\u0646\s*\u062e\u0632\u064a\u0646\u0629\s*\u0628\u0644\u062f\u064a\u0629\s*\u0628\u0633\u0643\u0631\u0629/g, 'Tresorier Communal de Biskra (Baladiya)');
    s = s.replace(/\u0628\u0644\u062f\u064a\u0629\s*\u0628\u0633\u0643\u0631\u0629/g, 'Baladiya Biskra');
    s = s.replace(/\u0627\u0644\u0646\u0642\u0627\u0621/g, 'EL-NAKAA');
    s = s.replace(/\u0622NAFTAL/g, 'NAFTAL');
    s = s.replace(/[\u0600-\u06FF]+/g, '').replace(/\s+/g, ' ').trim();
    return s;
  },

  // 5. Trigger Server-side scan APIs
  triggerServerBcScan() {
    this.showScannerModal('Scan des Bons de Commande', 364);

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      const records = (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords) && window.PRELOAD_DATA.bcRecords.length > 0)
        ? window.PRELOAD_DATA.bcRecords
        : (state.bcRecords || []);
      state.bcRecords = records;
      this.updateScanProgress(100, 100);
      this.updateScanLog(`Mode Hors-Ligne (file://) : ${records.length} Bons de Commande synchronisés depuis le dataset embarqué !`, 'success');
      this.finishScanButton(() => {
        this.autoLinkBcsAndDps();
        saveState();
        renderApp();
        showToast(`${records.length} BCs prêts (Mode Hors-ligne) !`);
      });
      return;
    }

    this.updateScanLog('Connexion au serveur Node / MongoDB et lancement du scan récursif...', 'info');

    fetch('/api/scan/bc', { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.records) {
          state.bcRecords = res.records;
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Scan serveur réussi : ${res.count} BCs analysés et enregistrés dans MongoDB !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${res.count} BCs synchronisés depuis le serveur !`);
          });
        } else {
          // Fallback to preload dataset or local data file
          if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
            state.bcRecords = window.PRELOAD_DATA.bcRecords;
            this.updateScanProgress(100, 100);
            this.updateScanLog(`Chargé depuis le dataset embarqué : ${state.bcRecords.length} BCs !`, 'success');
            this.finishScanButton(() => {
              this.autoLinkBcsAndDps();
              saveState();
              renderApp();
              showToast(`${state.bcRecords.length} BCs synchronisés !`);
            });
            return;
          }
          if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') return;
          return fetch('../data/extracted_bcs_linked.json')
            .then(r => r.json())
            .then(localBcs => {
              state.bcRecords = localBcs;
              this.updateScanProgress(100, 100);
              this.updateScanLog(`Chargé depuis les données pré-scannées : ${localBcs.length} BCs !`, 'success');
              this.finishScanButton(() => {
                this.autoLinkBcsAndDps();
                saveState();
                renderApp();
                showToast(`${localBcs.length} BCs synchronisés !`);
              });
            });
        }
      })
      .catch(err => {
        this.updateScanLog(`Scan serveur indisponible (${err.message}). Utilisation des données extraites...`, 'warn');
        if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
          state.bcRecords = window.PRELOAD_DATA.bcRecords;
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Données pré-chargées appliquées : ${state.bcRecords.length} BCs !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${state.bcRecords.length} BCs prêts !`);
          });
        }
      });
  },

  triggerServerDpScan() {
    this.showScannerModal('Scan des Demandes de Paiement', 148);

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      const records = (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments) && window.PRELOAD_DATA.payments.length > 0)
        ? window.PRELOAD_DATA.payments
        : (state.payments || []);
      state.payments = records;
      this.updateScanProgress(100, 100);
      this.updateScanLog(`Mode Hors-Ligne (file://) : ${records.length} Demandes de Paiement chargées depuis le dataset embarqué !`, 'success');
      this.finishScanButton(() => {
        this.autoLinkBcsAndDps();
        saveState();
        renderApp();
        showToast(`${records.length} Demandes de Paiement prêtes (Mode Hors-ligne) !`);
      });
      return;
    }

    this.updateScanLog('Lancement du scan récursif des Demandes de Paiement...', 'info');

    fetch('/api/scan/dp', { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.records) {
          state.payments = res.records;
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Scan serveur terminé : ${res.count} Demandes de Paiement indexées !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${res.count} Demandes de Paiement chargées !`);
          });
        } else {
          if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
            state.payments = window.PRELOAD_DATA.payments;
            this.updateScanProgress(100, 100);
            this.updateScanLog(`Chargé : ${state.payments.length} Demandes de Paiement depuis le dataset embarqué !`, 'success');
            this.finishScanButton(() => {
              this.autoLinkBcsAndDps();
              saveState();
              renderApp();
              showToast(`${state.payments.length} Demandes de Paiement prêtes !`);
            });
            return;
          }
          if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') return;
          return fetch('../data/extracted_dps_linked.json')
            .then(r => r.json())
            .then(localDps => {
              state.payments = localDps;
              this.updateScanProgress(100, 100);
              this.updateScanLog(`Chargé : ${localDps.length} Demandes de Paiement !`, 'success');
              this.finishScanButton(() => {
                this.autoLinkBcsAndDps();
                saveState();
                renderApp();
                showToast(`${localDps.length} Demandes de Paiement prêtes !`);
              });
            });
        }
      })
      .catch(() => {
        if (window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments)) {
          state.payments = window.PRELOAD_DATA.payments;
          this.updateScanProgress(100, 100);
          this.updateScanLog(`Données pré-scannées appliquées : ${state.payments.length} Demandes de Paiement !`, 'success');
          this.finishScanButton(() => {
            this.autoLinkBcsAndDps();
            saveState();
            renderApp();
            showToast(`${state.payments.length} Demandes de Paiement prêtes !`);
          });
        }
      });
  },

  // Modal UI Helpers
  showScannerModal(title, totalFiles) {
    let modal = document.getElementById('scannerProgressModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scannerProgressModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal modal-card" style="max-width:90vw;width:900px;min-height:60vh;">
          <div class="modal-header">
            <h3 id="scanModalTitle">Scanner</h3>
            <button class="btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">&times;</button>
          </div>
          <div class="scanner-modal-content" style="padding:1rem 1.5rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.95rem;color:#64748b;">
              <span id="scanStatusText">Analyse des fichiers...</span>
              <strong id="scanCountText">0 / ${totalFiles}</strong>
            </div>
            <div class="scan-progress-bar-wrap" style="margin:10px 0;">
              <div class="scan-progress-bar" id="scanProgressBar"></div>
            </div>
            <div class="scan-log-box" id="scanLogBox" style="max-height:55vh;min-height:40vh;overflow-y:auto;font-size:13px;"></div>
          </div>
          <div class="modal-footer" id="scanModalFooter" style="display:flex;justify-content:flex-end;gap:0.6rem;padding:0.75rem 1rem;">
            <button class="btn btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">Fermer</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    document.getElementById('scanModalTitle').textContent = title;
    document.getElementById('scanCountText').textContent = `0 / ${totalFiles}`;
    document.getElementById('scanProgressBar').style.width = '0%';
    document.getElementById('scanLogBox').innerHTML = '<div class="scan-log-entry info">Démarrage du processus...</div>';
    modal.classList.remove('hidden');
  },

  updateScanProgress(current, total) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const bar = document.getElementById('scanProgressBar');
    const cnt = document.getElementById('scanCountText');
    if (bar) bar.style.width = `${pct}%`;
    if (cnt) cnt.textContent = `${current} / ${total} (${pct}%)`;
  },

  updateScanLog(msg, type = 'info') {
    const box = document.getElementById('scanLogBox');
    if (!box) return;
    const entry = document.createElement('div');
    entry.className = `scan-log-entry ${type}`;
    entry.textContent = msg;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
  },

  finishScanButton(onApply) {
    const footer = document.getElementById('scanModalFooter');
    if (!footer) return;
    footer.innerHTML = `
      <button class="btn btn-ghost" type="button" onclick="document.getElementById('scannerProgressModal').classList.add('hidden')">Fermer</button>
      <button class="btn btn-primary" type="button" id="btnApplyScanData">Appliquer & Actualiser l'Application</button>
    `;
    document.getElementById('btnApplyScanData').onclick = () => {
      document.getElementById('scannerProgressModal').classList.add('hidden');
      if (onApply) onApply();
    };
  },

  // 6. Demande de Paiement & BC Linking System
  overridePaymentsTable() {
    window.renderPaymentsTable = () => {
      const rows = state.payments || [];
      const tbody = $('paymentsTableBody');
      if (!tbody) return;

      tbody.innerHTML = rows.length ? rows.map(row => {
        let linkingBadge = '';
        const linkedCount = (row.linkedBcIds && row.linkedBcIds.length) || 0;

        if (row.isDirect) {
          const catLabel = row.directCategory ? ` (${escapeHtml(row.directCategory)})` : '';
          linkingBadge = `<span class="dp-badge-direct" title="Dépense directe sans BC${catLabel}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Sans BC${catLabel}</span>`;
        } else if (linkedCount > 1) {
          const refsStr = (row.linkedBcRefs && row.linkedBcRefs.length) ? row.linkedBcRefs.join(', ') : `${linkedCount} BCs`;
          linkingBadge = `<span class="dp-badge-multi" title="Liée à ${linkedCount} bons de commande : ${escapeHtml(refsStr)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Lot (${linkedCount} BCs)</span>`;
        } else if (linkedCount === 1) {
          const matchBc = state.bcRecords.find(b => b.id === row.linkedBcIds[0]);
          linkingBadge = `<span class="dp-badge-linked" title="${matchBc?.ref || 'BC'}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${matchBc?.ref || 'BC Lié'}</span>`;
        } else {
          linkingBadge = `<span class="dp-badge-pending" title="Aucun bon de commande lié"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> À lier</span>`;
        }

        const totalCycle = row.totalPaymentDelayDays ?? (row.delayBcToDpDays ?? (row.requestDate && row.paidDate ? businessDaysBetween(row.requestDate, row.paidDate) : 0));
        let delayTone = 'ok';
        if (row.delayStatus === 'retard' || totalCycle > 30) delayTone = 'late';
        else if (row.delayStatus === 'normal' || totalCycle > 15) delayTone = 'warn';

        const delayTip = row.isDirect
          ? `Délai traitement direct: ${totalCycle} j (Demande: ${formatDate(row.requestDate)} → Règlement: ${formatDate(row.paidDate)})`
          : `Cycle global: ${totalCycle} j | BC→DP: ${row.delayBcToDpDays ?? 0} j | DP→Paiement: ${row.delayDpToPaymentDays ?? 0} j`;

        return `
          <tr>
            <td><strong>${escapeHtml(row.paymentRef || '—')}</strong></td>
            <td>${linkingBadge}</td>
            <td>${escapeHtml(row.beneficiary || row.supplierName || '—')}</td>
            <td>${escapeHtml(formatDate(row.requestDate))}</td>
            <td>${escapeHtml(formatDate(row.paidDate))}</td>
            <td><strong>${escapeHtml(formatMoney(row.amount, 'DZD'))}</strong></td>
            <td><span class="badge bg-light text-dark">${escapeHtml(row.mode || 'Virement')}</span></td>
            <td><span class="delay-pill ${delayTone}" title="${escapeHtml(delayTip)}" style="cursor:help;">${totalCycle} j</span></td>
            <td>
              <button class="btn btn-soft btn-xs" type="button" onclick="ApproNextGen.openLinkingModal('${row.id}')" title="Lier aux Bons de Commande">
                🔗 Lier BC
              </button>
            </td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="9" class="muted">Aucune demande de paiement.</td></tr>`;
    };
  },

  openLinkingModal(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    let modal = document.getElementById('dpLinkingModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dpLinkingModal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const currentLinkedIds = new Set(dp.linkedBcIds || []);
    const matchingSupplier = (dp.beneficiary || '').toLowerCase();

    // Filter relevant BCs (sort matching supplier to top)
    const sortedBcs = [...state.bcRecords].sort((a, b) => {
      const aMatch = a.supplierName?.toLowerCase().includes(matchingSupplier);
      const bMatch = b.supplierName?.toLowerCase().includes(matchingSupplier);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    modal.innerHTML = `
      <div class="modal modal-card" style="max-width:820px;">
        <div class="modal-header">
          <h3>🔗 Liaison Demande de Paiement & Bons de Commande</h3>
          <button class="btn-ghost" type="button" onclick="document.getElementById('dpLinkingModal').classList.add('hidden')">&times;</button>
        </div>
        <div class="modal-body" style="padding:1.25rem;">
          <div class="linking-card">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <span style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:700;">Demande de Paiement</span>
                <h4 style="margin:2px 0;font-size:1.15rem;font-weight:800;color:#0f172a;">${escapeHtml(dp.paymentRef)}</h4>
                <div style="font-size:0.85rem;color:#334155;"><strong>Bénéficiaire :</strong> ${escapeHtml(dp.beneficiary)}</div>
                <div style="font-size:0.8rem;color:#64748b;"><strong>Objet :</strong> ${escapeHtml(dp.natureExpense || 'Non précisé')}</div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:700;">Montant de la DP</span>
                <div style="font-size:1.5rem;font-weight:900;color:#2563eb;">${formatMoney(dp.amount, 'DZD')}</div>
                <span style="font-size:0.8rem;color:#64748b;">Date: ${formatDate(dp.requestDate)}</span>
              </div>
            </div>
          </div>

          <!-- Checkbox for Direct DP without BC -->
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <label style="cursor:pointer;font-weight:700;color:#6b21a8;display:flex;align-items:center;gap:0.5rem;margin:0;">
                <input type="checkbox" id="dpIsDirectCheck" ${dp.isDirect ? 'checked' : ''} onchange="ApproNextGen.onToggleDirectDp(this.checked)">
                <span>Dépense directe sans Bon de Commande (ex: Sonelgaz, Impôts, Baladiya, Assurance, Notaire)</span>
              </label>
              <div style="font-size:0.75rem;color:#9333ea;margin-top:2px;">Cochez cette option si cette dépense ne fait l'objet d'aucun bon de commande.</div>
            </div>
            <button class="btn btn-soft btn-xs" type="button" onclick="ApproNextGen.autoSuggestLinks('${dp.id}')">
              🤖 Auto-Détecter
            </button>
          </div>

          <!-- Live Balance Meter -->
          <div class="linking-calc-meter" id="linkingCalcMeter">
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Montant DP</span>
              <div class="calc-meter-val">${formatMoney(dp.amount, 'DZD')}</div>
            </div>
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Total BCs Cochés</span>
              <div class="calc-meter-val" id="linkingSelectedTotal">0,00 DZD</div>
            </div>
            <div>
              <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;">Écart / Différence</span>
              <div class="calc-meter-val calc-meter-diff" id="linkingDiffVal">0,00 DZD</div>
            </div>
          </div>

          <!-- BC Search & Selection Table -->
          <div style="margin-bottom:0.5rem;display:flex;gap:0.5rem;">
            <input type="search" id="linkingBcSearch" class="field" placeholder="Filtrer réf BC, fournisseur, montant..." style="margin:0;width:100%;" oninput="ApproNextGen.filterLinkingBcs(this.value)">
          </div>

          <div class="bc-selection-list" id="bcSelectionList">
            ${sortedBcs.map(bc => {
              const isChecked = currentLinkedIds.has(bc.id);
              return `
                <div class="bc-selection-row ${isChecked ? 'selected' : ''}" data-id="${bc.id}" data-amount="${bc.amountTTC || bc.amount || 0}" onclick="ApproNextGen.toggleBcSelection('${bc.id}')">
                  <input type="checkbox" class="bc-select-chk" value="${bc.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();ApproNextGen.toggleBcSelection('${bc.id}');">
                  <div style="flex-grow:1;">
                    <div style="display:flex;justify-content:space-between;font-weight:700;">
                      <span>${escapeHtml(bc.ref)} <span style="font-weight:400;color:#64748b;">(${formatDate(bc.date)})</span></span>
                      <span style="color:#0f172a;">${formatMoney(bc.amountTTC || bc.amount, 'DZD')}</span>
                    </div>
                    <div style="font-size:0.75rem;color:#475569;">
                      <strong>${escapeHtml(bc.supplierName)}</strong> · ${escapeHtml(bc.description || 'Prestation')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.6rem;padding:0.75rem 1.25rem;">
          <button class="btn btn-ghost" type="button" onclick="document.getElementById('dpLinkingModal').classList.add('hidden')">Annuler</button>
          <button class="btn btn-primary" type="button" onclick="ApproNextGen.saveLinking('${dp.id}')">
            💾 Enregistrer la Liaison
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    this.updateLinkingCalc(dp.amount);
  },

  toggleBcSelection(bcId) {
    const row = document.querySelector(`.bc-selection-row[data-id="${bcId}"]`);
    if (!row) return;
    const chk = row.querySelector('.bc-select-chk');
    chk.checked = !chk.checked;
    if (chk.checked) row.classList.add('selected');
    else row.classList.remove('selected');

    // If direct is checked, uncheck it
    const directChk = document.getElementById('dpIsDirectCheck');
    if (directChk && directChk.checked) directChk.checked = false;

    this.updateLinkingCalc();
  },

  onToggleDirectDp(checked) {
    if (checked) {
      document.querySelectorAll('.bc-select-chk').forEach(c => {
        c.checked = false;
        c.closest('.bc-selection-row')?.classList.remove('selected');
      });
      this.updateLinkingCalc();
    }
  },

  updateLinkingCalc(targetAmt) {
    const checkedRows = Array.from(document.querySelectorAll('.bc-selection-row .bc-select-chk:checked')).map(c => c.closest('.bc-selection-row'));
    const totalSelected = checkedRows.reduce((sum, r) => sum + (parseFloat(r.getAttribute('data-amount')) || 0), 0);

    const isDirect = document.getElementById('dpIsDirectCheck')?.checked;
    const dpValEl = document.querySelector('.linking-calc-meter .calc-meter-val');
    const target = targetAmt || (dpValEl ? parseFloat(dpValEl.textContent.replace(/[^0-9.]/g, '')) : 0);

    const selEl = document.getElementById('linkingSelectedTotal');
    const diffEl = document.getElementById('linkingDiffVal');

    if (selEl) selEl.textContent = isDirect ? '0,00 DZD (Sans BC)' : formatMoney(totalSelected, 'DZD');
    if (diffEl) {
      if (isDirect) {
        diffEl.textContent = 'Dépense Directe';
        diffEl.className = 'calc-meter-val calc-meter-diff ok';
      } else {
        const diff = target - totalSelected;
        diffEl.textContent = formatMoney(diff, 'DZD');
        diffEl.className = `calc-meter-val calc-meter-diff ${Math.abs(diff) < 1 ? 'ok' : 'diff'}`;
      }
    }
  },

  filterLinkingBcs(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('.bc-selection-row').forEach(row => {
      const txt = row.textContent.toLowerCase();
      row.style.display = txt.includes(q) ? 'flex' : 'none';
    });
  },

  autoSuggestLinks(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    // Reset current selections
    document.querySelectorAll('.bc-selection-row').forEach(r => {
      r.classList.remove('selected');
      const c = r.querySelector('.bc-select-chk');
      if (c) c.checked = false;
    });

    const fullText = `${dp.beneficiary || ''} ${dp.natureExpense || ''} ${dp.referenceDocs || ''} ${dp.sourceFile || ''} ${dp.paymentRef || ''}`;

    // Direct Payment Check
    for (const tax of DIRECT_PAYMENT_TAXONOMY) {
      if (tax.pattern.test(fullText)) {
        const directChk = document.getElementById('dpIsDirectCheck');
        if (directChk) directChk.checked = true;
        this.updateLinkingCalc(dp.amount);
        showToast(`Dépense directe identifiée : ${tax.category} !`);
        return;
      }
    }

    const directChk = document.getElementById('dpIsDirectCheck');
    if (directChk) directChk.checked = false;

    // Explicit BC number regex
    const bcMatches = [
      ...fullText.matchAll(/BC\s*(?:N[°o]?)?\s*(\d+)/gi),
      ...fullText.matchAll(/BC\s*[-_#]\s*(\d+)/gi),
      ...fullText.matchAll(/(\d{1,4})\s*\/\s*DG\s*\/\s*202[56]/gi)
    ];

    const matchedIds = new Set();
    for (const m of bcMatches) {
      const num = parseInt(m[1], 10);
      const cand = state.bcRecords.find(b => {
        const bNum = (b.ref || '').match(/(\d+)/);
        return bNum && parseInt(bNum[1], 10) === num;
      });
      if (cand) matchedIds.add(cand.id);
    }

    // Ref number match if supplier similarity > 0.4
    if (matchedIds.size === 0) {
      const dpNumMatch = String(dp.paymentRef || '').match(/(\d+)/);
      if (dpNumMatch) {
        const num = parseInt(dpNumMatch[1], 10);
        const cand = state.bcRecords.find(b => {
          const bNum = (b.ref || '').match(/(\d+)/);
          return bNum && parseInt(bNum[1], 10) === num;
        });
        if (cand && calcSupplierSimilarity(cand.supplierName, dp.beneficiary) >= 0.4) {
          matchedIds.add(cand.id);
        }
      }
    }

    // Supplier Similarity + Financial Concordance (Exact, Subset Sum, Partial, Stamp Duty)
    if (matchedIds.size === 0 && dp.amount > 0) {
      const candBcs = state.bcRecords.filter(b => calcSupplierSimilarity(b.supplierName, dp.beneficiary) >= 0.4);
      if (candBcs.length > 0) {
        const combo = findBcSubsetSumCombination(candBcs, dp.amount, 8, 2.0);
        if (combo && combo.length > 0) {
          combo.forEach(c => matchedIds.add(c.id));
        } else {
          const partial = candBcs.find(b => {
            const ttc = b.amountTTC || b.amount || 0;
            return Math.abs(ttc * 0.5 - dp.amount) < 2.0 || Math.abs(ttc * 0.3 - dp.amount) < 2.0;
          });
          if (partial) {
            matchedIds.add(partial.id);
          } else {
            const stampMatch = candBcs.find(b => {
              const ttc = b.amountTTC || b.amount || 0;
              return Math.abs(ttc - dp.amount) <= 2500 && Math.abs(ttc - dp.amount) / dp.amount < 0.05;
            });
            if (stampMatch) matchedIds.add(stampMatch.id);
          }
        }
      }
    }

    matchedIds.forEach(id => {
      const row = document.querySelector(`.bc-selection-row[data-id="${id}"]`);
      if (row) {
        row.classList.add('selected');
        const chk = row.querySelector('.bc-select-chk');
        if (chk) chk.checked = true;
      }
    });

    this.updateLinkingCalc(dp.amount);
    if (matchedIds.size > 0) {
      showToast(`${matchedIds.size} bon(s) de commande correspondant(s) détecté(s) par l'IA !`);
    } else {
      showToast("Aucune correspondance automatique trouvée. Vous pouvez cocher manuellement.");
    }
  },

  saveLinking(dpId) {
    const dp = (state.payments || []).find(p => p.id === dpId);
    if (!dp) return;

    const isDirect = document.getElementById('dpIsDirectCheck')?.checked;
    const selectedBcIds = Array.from(document.querySelectorAll('.bc-selection-row .bc-select-chk:checked')).map(c => c.value);

    dp.isDirect = Boolean(isDirect);
    dp.linkedBcIds = isDirect ? [] : selectedBcIds;
    dp.manualLink = true;

    if (isDirect) {
      // Find direct category if matched
      const fullText = `${dp.beneficiary || ''} ${dp.natureExpense || ''} ${dp.referenceDocs || ''} ${dp.sourceFile || ''} ${dp.paymentRef || ''}`;
      for (const tax of DIRECT_PAYMENT_TAXONOMY) {
        if (tax.pattern.test(fullText)) {
          dp.directCategory = tax.category;
          break;
        }
      }
      dp.linkedBcRefs = [];
      const reqD = dp.requestDate ? new Date(dp.requestDate) : null;
      const paidD = dp.paidDate ? new Date(dp.paidDate) : reqD;
      if (reqD && paidD && !isNaN(reqD) && !isNaN(paidD)) {
        dp.delayDpToPaymentDays = Math.max(0, Math.round((paidD - reqD) / 86400000));
        dp.totalPaymentDelayDays = dp.delayDpToPaymentDays;
        dp.delayStatus = dp.totalPaymentDelayDays < 7 ? 'rapide' : (dp.totalPaymentDelayDays <= 15 ? 'normal' : 'retard');
      }
    } else {
      const linkedBcs = [];
      let maxTotalDelay = 0;
      let minBcToDp = 9999;

      selectedBcIds.forEach(bcId => {
        const bc = state.bcRecords.find(b => b.id === bcId);
        if (bc) {
          linkedBcs.push(bc);
          bc.status = 'paye';
          bc.dpRef = dp.paymentRef;
          bc.dpDate = dp.requestDate;
          bc.paymentPaidDate = dp.paidDate || dp.requestDate;
          computePaymentDelayMetrics(bc, dp);

          if ((bc.totalPaymentDelayDays || 0) > maxTotalDelay) maxTotalDelay = bc.totalPaymentDelayDays;
          if (bc.delayBcToDpDays != null && bc.delayBcToDpDays < minBcToDp) minBcToDp = bc.delayBcToDpDays;
        }
      });

      dp.linkedBcRefs = linkedBcs.map(b => b.ref);
      dp.delayBcToDpDays = minBcToDp === 9999 ? 0 : minBcToDp;
      dp.totalPaymentDelayDays = maxTotalDelay;
      dp.delayStatus = maxTotalDelay < 15 ? 'rapide' : (maxTotalDelay <= 30 ? 'normal' : 'retard');
    }

    saveState();
    renderApp();
    const modalEl = document.getElementById('dpLinkingModal');
    if (modalEl) modalEl.classList.add('hidden');
    showToast('Liaison et métriques de règlement synchronisées !');

    // Online server synchronization with offline fallback
    if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
      fetch('/api/sync/dp-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dpId: dp.id,
          bcIds: dp.linkedBcIds,
          isDirect: dp.isDirect,
          directCategory: dp.directCategory
        })
      }).catch(() => {
        // Fallback to /api/payments
        fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dp)
        }).catch(() => {});
      });
    }
  },

  // 7. Next-Gen KPI Dashboard Overhauls
  injectKpiAdvancedControls() {
    const kpiPage = document.getElementById('page-kpi');
    if (!kpiPage || document.getElementById('kpiNextGenControls')) return;

    const filterRow = kpiPage.querySelector('.kpi-filter-bar');
    if (!filterRow) return;

    const advWrap = document.createElement('div');
    advWrap.id = 'kpiNextGenControls';
    advWrap.innerHTML = `
      <!-- Advanced Dual Filters: Spending Tier & Payment Delay -->
      <div id="kpiDualFilterBox" style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;background:#f8fafc;padding:0.75rem;border-radius:8px;border:1px solid #e2e8f0;">
        <div style="flex:1;min-width:200px;">
          <label style="font-size:0.75rem;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:0.25rem;">
            💳 Tranche de Montant
          </label>
          <select id="kpiSpendTierSelect" class="form-select form-select-sm" onchange="ApproNextGen.setSpendTier(this.value)">
            <option value="all">Tous les montants</option>
            <option value="tier_under_100k">&lt; 100 000 DZD (Petits achats)</option>
            <option value="tier_100k_500k">100 000 – 500 000 DZD (Achats moyens)</option>
            <option value="tier_500k_2m">500 000 – 2 000 000 DZD (Achats majeurs)</option>
            <option value="tier_over_2m">&gt; 2 000 000 DZD (Gros investissements)</option>
          </select>
        </div>

        <div style="flex:1;min-width:200px;">
          <label style="font-size:0.75rem;font-weight:700;color:#334155;text-transform:uppercase;display:block;margin-bottom:0.25rem;">
            ⏱️ Délai de Règlement (Jours)
          </label>
          <select id="kpiDelayFilterSelect" class="form-select form-select-sm" onchange="ApproNextGen.setDelayFilter(this.value)">
            <option value="all">Tous les délais</option>
            <option value="under_15">&lt; 15 jours (Règlement rapide)</option>
            <option value="15_30">15 à 30 jours (Délai normal)</option>
            <option value="30_60">30 à 60 jours (Délai modéré)</option>
            <option value="over_60">&gt; 60 jours (Retard critique)</option>
            <option value="unpaid">Non encore réglés</option>
          </select>
        </div>

        <div style="flex:1;min-width:260px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <label style="font-size:0.75rem;font-weight:700;color:#334155;text-transform:uppercase;margin:0;">
              ⚖️ Comparateur Fournisseur(s)
            </label>
            <button type="button" onclick="ApproNextGen.clearSupplierComparison()" style="background:none;border:none;color:#ef4444;font-size:0.72rem;cursor:pointer;padding:0;font-weight:600;">Réinitialiser</button>
          </div>
          <select id="kpiMultiSupplierCompare" class="form-select form-select-sm" onchange="ApproNextGen.addSupplierToComparison(this.value);this.value='';" style="font-size:0.85rem;font-weight:600;border-color:#3b82f6;">
            <option value="">+ Ajouter un fournisseur à comparer...</option>
          </select>
          <div id="kpiSelectedSuppliersChips" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;"></div>
        </div>
      </div>
    `;

    filterRow.insertAdjacentElement('beforebegin', advWrap);
  },

  setKpiPeriod(period) {
    this.currentKpiPeriod = period;
    document.querySelectorAll('.btn-kpi-preset').forEach(btn => {
      if (btn.getAttribute('data-period') === period) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const now = new Date();
    const fromInput = $('kpiDateFrom');
    const toInput = $('kpiDateTo');

    if (period === 'all') {
      if (fromInput) fromInput.value = '';
      if (toInput) toInput.value = '';
    } else if (period === '2026') {
      if (fromInput) fromInput.value = '2026-01-01';
      if (toInput) toInput.value = '2026-12-31';
    } else if (period === 'month') {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      if (fromInput) fromInput.value = mStr;
      if (toInput) toInput.value = '';
    } else if (period === '30d') {
      const d30 = new Date(now.getTime() - (30 * 86400000));
      if (fromInput) fromInput.value = d30.toISOString().split('T')[0];
      if (toInput) toInput.value = '';
    }

    renderKpi();
  },

  setSpendTier(tier) {
    this.spendingAmountTier = tier;
    renderKpi();
  },

  setDelayFilter(filter) {
    this.paymentDelayFilter = filter;
    renderKpi();
  },

  addSupplierToComparison(sup) {
    if (!sup) return;
    if (!this.selectedComparisonSuppliers) this.selectedComparisonSuppliers = [];
    if (!this.selectedComparisonSuppliers.includes(sup)) {
      this.selectedComparisonSuppliers.push(sup);
    }
    this.renderSupplierChips();
    renderKpi();
  },

  removeSupplierCompare(sup) {
    if (!this.selectedComparisonSuppliers) return;
    this.selectedComparisonSuppliers = this.selectedComparisonSuppliers.filter(s => s !== sup);
    this.renderSupplierChips();
    renderKpi();
  },

  renderSupplierChips() {
    const host = document.getElementById('kpiSelectedSuppliersChips');
    if (!host) return;
    const list = this.selectedComparisonSuppliers || [];
    if (list.length === 0) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = list.map(s => `
      <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;background:#2563eb;color:#fff;font-size:0.75rem;font-weight:600;box-shadow:0 1px 3px rgba(37,99,235,0.3);">
        ${escapeHtml(s)}
        <i class="fas fa-times" style="cursor:pointer;opacity:0.8;" data-sup="${encodeURIComponent(s)}" onclick="ApproNextGen.removeSupplierCompare(decodeURIComponent(this.getAttribute('data-sup')))" title="Retirer" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'"></i>
      </span>
    `).join('');
  },

  updateSupplierComparison(selectEl) {
    if (!selectEl) return;
    const val = selectEl.value;
    if (val) this.addSupplierToComparison(val);
  },

  overrideKpiDashboard() {
    // Intercept and wrap window.getKpiFilteredRecords to apply next-gen filters
    const origGetKpiFilteredRecords = window.getKpiFilteredRecords;
    window.getKpiFilteredRecords = () => {
      let records = origGetKpiFilteredRecords ? origGetKpiFilteredRecords() : (state.bcRecords || []);

      // 1. Spending tier filter
      if (this.spendingAmountTier && this.spendingAmountTier !== 'all') {
        records = records.filter(r => {
          const amt = Number(r.amountTTC || r.amount || 0);
          switch (this.spendingAmountTier) {
            case 'tier_under_100k': return amt < 100000;
            case 'tier_100k_500k': return amt >= 100000 && amt <= 500000;
            case 'tier_500k_2m': return amt > 500000 && amt <= 2000000;
            case 'tier_over_2m': return amt > 2000000;
            default: return true;
          }
        });
      }

      // 2. Payment turnaround delay filter
      if (this.paymentDelayFilter && this.paymentDelayFilter !== 'all') {
        records = records.filter(r => {
          const isPaid = (r.status === 'paye' || Boolean(r.paymentPaidDate));
          if (this.paymentDelayFilter === 'unpaid') {
            return !isPaid;
          }
          if (!isPaid) return false;
          const days = r.totalPaymentDelayDays ?? (r.date && r.paymentPaidDate ? (typeof businessDaysBetween === 'function' ? businessDaysBetween(r.date, r.paymentPaidDate) : Math.round((new Date(r.paymentPaidDate) - new Date(r.date)) / 86400000)) : null);
          if (days == null) return false;
          switch (this.paymentDelayFilter) {
            case 'under_15': return days < 15;
            case '15_30': return days >= 15 && days <= 30;
            case '30_60': return days > 30 && days <= 60;
            case 'over_60': return days > 60;
            default: return true;
          }
        });
      }

      // 3. Multi-supplier comparison filter (if selected)
      if (this.selectedComparisonSuppliers && this.selectedComparisonSuppliers.length > 0) {
        const selNorm = this.selectedComparisonSuppliers.map(s => String(s || '').trim().toLowerCase());
        records = records.filter(r => selNorm.includes(String(r.supplierName || '').trim().toLowerCase()));
      }

      return records;
    };

    const originalRenderKpi = window.renderKpi;

    window.renderKpi = () => {
      // Execute original render
      if (originalRenderKpi) {
        try { originalRenderKpi(); } catch(e) {}
      }

      // Populate supplier compare select with all available suppliers
      const supSelect = document.getElementById('kpiMultiSupplierCompare');
      if (supSelect && typeof state !== 'undefined') {
        const rawSups = [
          ...(Array.isArray(state.bcRecords) ? state.bcRecords.map(r => r.supplierName) : []),
          ...(Array.isArray(state.suppliers) ? state.suppliers.map(s => typeof s === 'object' ? s.name : s) : [])
        ];
        const suppliers = [...new Set(rawSups.map(s => String(s || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        if (suppliers.length > 0 && (!supSelect.options || supSelect.options.length <= 1 || supSelect.options.length !== suppliers.length + 1)) {
          const curSupVal = supSelect.value || '';
          supSelect.innerHTML = ['<option value="">+ Ajouter un fournisseur à comparer...</option>'].concat(
            suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
          ).join('');
          supSelect.value = curSupVal;
        }
      }

      // Extract filtered records
      const records = (typeof getKpiFilteredRecords === 'function') ? getKpiFilteredRecords() : (state.bcRecords || []);

      // 1. Render Advanced Financial Intelligence & Supplier Analytics (Créances, Prévision, Consommation, Moyennes)
      this.renderFinancialIntelligenceSection(records);

      // 2. Render Delay Analytics
      this.renderDelayAnalyticsSection(records);

      // 3. Render Top Purchased Articles
      this.renderTopArticlesSection(records);

      // 4. Render Multi-Supplier Comparison Matrix
      this.renderMultiSupplierComparison(records);
    };
  },

  renderDelayAnalyticsSection(records) {
    let section = document.getElementById('kpiDelayAnalyticsSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiDelayAnalyticsSection';
      const charts = document.getElementById('dashboardCharts');
      if (charts) charts.insertAdjacentElement('beforebegin', section);
    }

    // Compute delay metrics
    let totalDelayDays = 0;
    let delayCount = 0;
    let under15 = 0, b15_30 = 0, b30_60 = 0, over60 = 0;
    const criticalLateList = [];

    records.forEach(r => {
      const days = r.totalPaymentDelayDays ?? (r.date && r.paymentPaidDate ? businessDaysBetween(r.date, r.paymentPaidDate) : null);
      if (days != null) {
        totalDelayDays += days;
        delayCount++;
        if (days < 15) under15++;
        else if (days <= 30) b15_30++;
        else if (days <= 60) b30_60++;
        else {
          over60++;
          criticalLateList.push({ ...r, delay: days });
        }
      }
    });

    const avgSettlementDays = delayCount > 0 ? Math.round(totalDelayDays / delayCount) : 18;

    section.innerHTML = `
      <div class="delay-analytics-grid">
        <div class="delay-card">
          <div class="delay-card-header">
            <span class="delay-card-title"><i class="fas fa-stopwatch text-primary"></i> Délai Moyen de Règlement (Jours)</span>
            <span class="badge bg-primary-subtle text-primary font-monospace">${delayCount} commandes analysées</span>
          </div>
          <div class="delay-metric-val">${avgSettlementDays} <span style="font-size:1.1rem;font-weight:600;color:#64748b;">jours</span></div>
          <div class="delay-metric-sub">Délai global moyen entre émission du bon de commande et paiement effectif</div>

          <div class="delay-buckets-row">
            <div class="delay-bucket b-green">
              <div class="b-val">${under15}</div>
              <div class="b-lbl">&lt; 15j (Rapide)</div>
            </div>
            <div class="delay-bucket b-blue">
              <div class="b-val">${b15_30}</div>
              <div class="b-lbl">15-30j (Standard)</div>
            </div>
            <div class="delay-bucket b-amber">
              <div class="b-val">${b30_60}</div>
              <div class="b-lbl">30-60j (Modéré)</div>
            </div>
            <div class="delay-bucket b-red">
              <div class="b-val">${over60}</div>
              <div class="b-lbl">&gt; 60j (Critique)</div>
            </div>
          </div>
        </div>

        <div class="delay-card">
          <div class="delay-card-header">
            <span class="delay-card-title"><i class="fas fa-triangle-exclamation text-danger"></i> Alertes Délais & Retards Critiques</span>
            <span class="badge bg-danger">${criticalLateList.length} alertes</span>
          </div>
          <div style="max-height:160px;overflow-y:auto;font-size:0.8rem;">
            ${criticalLateList.slice(0, 5).map(c => `
              <div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid #f1f5f9;">
                <div><strong>${escapeHtml(c.ref)}</strong> · ${escapeHtml(c.supplierName)}</div>
                <div><span class="badge bg-danger-subtle text-danger font-monospace">+${c.delay} jours</span></div>
              </div>
            `).join('') || '<div class="text-muted py-2">Aucun retard critique sur la période filtrée.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  renderTopArticlesSection(records) {
    let section = document.getElementById('kpiTopArticlesSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiTopArticlesSection';
      const delaySec = document.getElementById('kpiDelayAnalyticsSection');
      if (delaySec) delaySec.insertAdjacentElement('afterend', section);
    }

    // Aggregate line items
    const articleStats = {};
    records.forEach(r => {
      (r.lineItems || []).forEach(it => {
        const desc = (it.description || '').trim();
        if (desc && desc.length > 2 && !desc.toUpperCase().includes('TOTAL') && !desc.toUpperCase().includes('REMARQUE')) {
          if (!articleStats[desc]) articleStats[desc] = { name: desc, qty: 0, spend: 0, count: 0 };
          articleStats[desc].qty += (it.qty || 1);
          articleStats[desc].spend += (it.lineTotal || (it.qty * (it.unitPrice || 0)) || 0);
          articleStats[desc].count++;
        }
      });
    });

    const topArticles = Object.values(articleStats).sort((a, b) => b.spend - a.spend).slice(0, 10);
    const maxSpend = topArticles[0] ? topArticles[0].spend : 1;

    section.innerHTML = `
      <div class="top-articles-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <h4 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;">
              📦 Top 10 des Articles les Plus Achetés
            </h4>
            <small class="text-muted">Classement par volume financier engagé et quantités commandées</small>
          </div>
          <span class="badge bg-light text-muted border">${Object.keys(articleStats).length} articles au catalogue</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:1.5rem;">
          <div>
            ${topArticles.map((art, idx) => {
              const pct = Math.round((art.spend / maxSpend) * 100);
              return `
                <div class="article-rank-row">
                  <div class="article-rank-num">${idx + 1}</div>
                  <div class="article-rank-name" onclick="ApproNextGen.filterByArticle('${escapeHtml(art.name)}')" title="Cliquer pour filtrer les commandes">
                    ${escapeHtml(art.name)}
                    <div style="font-size:0.72rem;color:#64748b;font-weight:400;">${art.count} commande(s) · Quantité : ${art.qty}</div>
                  </div>
                  <div class="article-rank-meter-wrap">
                    <div class="article-rank-meter" style="width:${pct}%;"></div>
                  </div>
                  <div style="font-weight:700;font-size:0.85rem;color:#0f172a;min-width:110px;text-align:right;">
                    ${formatMoney(art.spend, 'DZD')}
                  </div>
                </div>
              `;
            }).join('') || '<div class="text-muted">Aucun article trouvé.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  filterByArticle(articleName) {
    const input = document.getElementById('followupSearch');
    if (input) {
      input.value = articleName;
      if (typeof setActiveTab === 'function') setActiveTab('followup');
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
      if (typeof showToast === 'function') showToast(`Filtré par article : "${articleName}"`);
    }
  },

  renderMultiSupplierComparison(records) {
    let section = document.getElementById('kpiSupplierComparisonSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiSupplierComparisonSection';
      const anchor = document.getElementById('kpiTopArticlesSection') || document.getElementById('kpiDelayAnalyticsSection') || document.getElementById('dashboardCharts') || document.getElementById('page-kpi');
      if (anchor) anchor.insertAdjacentElement('afterend', section);
    }

    const selected = this.selectedComparisonSuppliers;
    if (!selected || selected.length === 0) {
      section.innerHTML = `
        <div class="comparison-container" style="background:#ffffff;text-align:center;padding:1.5rem;border-radius:12px;border:1px dashed #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <h5 style="margin:0 0 0.25rem 0;color:#0f172a;font-weight:700;">⚖️ Comparateur Fournisseurs</h5>
          <p class="text-muted small mb-0">Sélectionnez un ou plusieurs fournisseurs dans le filtre supérieur pour afficher leur analyse détaillée et les comparer côte à côte.</p>
        </div>
      `;
      return;
    }

    const basePool = (typeof state !== 'undefined' && Array.isArray(state.bcRecords)) ? state.bcRecords : records;
    const compData = selected.map(sup => {
      const normSup = String(sup || '').trim().toLowerCase();
      const supRecords = basePool.filter(r => String(r.supplierName || '').trim().toLowerCase() === normSup);
      const spend = supRecords.reduce((s, r) => s + (Number(r.amountTTC || r.amount) || 0), 0);
      const avgTicket = supRecords.length > 0 ? Math.round(spend / supRecords.length) : 0;
      const delivered = supRecords.filter(r => r.goodsReceivedDate || r.serviceDoneDate).length;
      const deliveryRate = supRecords.length > 0 ? Math.round((delivered / supRecords.length) * 100) : 0;

      return {
        name: sup,
        ordersCount: supRecords.length,
        totalSpend: spend,
        avgTicket: avgTicket,
        deliveryRate: deliveryRate
      };
    });

    const isSingle = selected.length === 1;

    section.innerHTML = `
      <div class="comparison-container" style="background:#fff;border-radius:12px;padding:1.2rem;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div class="comparison-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
          <div>
            <h4 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;">
              ${isSingle ? '📊 Scorecard & Analyse Fournisseur' : `⚖️ Matrice Comparative Multi-Fournisseurs (${selected.length} sélectionnés)`}
            </h4>
            <small class="text-muted">${isSingle ? 'Indicateurs clés de performance du fournisseur sélectionné' : 'Analyse comparative des volumes, paniers moyens et taux d\'exécution'}</small>
          </div>
          <button class="btn btn-ghost btn-xs" type="button" onclick="ApproNextGen.clearSupplierComparison()" style="color:#ef4444;font-weight:600;"><i class="fas fa-trash-alt me-1"></i> Réinitialiser</button>
        </div>

        ${isSingle ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;font-size:0.8rem;color:#1e40af;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-info-circle"></i> <span>Astuce : Ajoutez un 2ème fournisseur dans le sélecteur ci-dessus pour lancer la comparaison directe côte-à-côte.</span>
          </div>
        ` : ''}

        <div class="comparison-cards-grid">
          ${compData.map(c => `
            <div class="supplier-comp-card">
              <h4>${escapeHtml(c.name)}</h4>
              <div class="comp-metric-row">
                <span>Volume d'achats TTC :</span>
                <strong>${formatMoney(c.totalSpend, 'DZD')}</strong>
              </div>
              <div class="comp-metric-row">
                <span>Nombre de commandes :</span>
                <strong>${c.ordersCount} BC(s)</strong>
              </div>
              <div class="comp-metric-row">
                <span>Panier moyen :</span>
                <strong>${formatMoney(c.avgTicket, 'DZD')}</strong>
              </div>
              <div class="comp-metric-row">
                <span>Taux de réalisation :</span>
                <span class="badge ${c.deliveryRate >= 80 ? 'bg-success' : 'bg-warning text-dark'}">${c.deliveryRate}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  clearSupplierComparison() {
    this.selectedComparisonSuppliers = [];
    this.renderSupplierChips();
    renderKpi();
  },

  // Performance Cache Engine
  _memo: {},
  _getFp(recs) {
    if (!recs || !Array.isArray(recs)) return '';
    const len = recs.length;
    if (len === 0) return '0';
    const first = recs[0] || {};
    const mid = recs[Math.floor(len / 2)] || {};
    const last = recs[len - 1] || {};
    const s1 = first.id || first.ref || first.supplierName || (first.amountTTC || first.amount || '');
    const s2 = mid.id || mid.ref || mid.supplierName || (mid.amountTTC || mid.amount || '');
    const s3 = last.id || last.ref || last.supplierName || (last.amountTTC || last.amount || '');
    return `${len}_${s1}_${s2}_${s3}`;
  },
  _getMemo(key, recs) {
    if (!this._memo) this._memo = {};
    if (!recs || !Array.isArray(recs)) return null;
    const fp = this._getFp(recs);
    if (this._memo[key] && this._memo[key].fp === fp) return this._memo[key].data;
    return null;
  },
  _setMemo(key, recs, data) {
    if (!this._memo) this._memo = {};
    if (!recs || !Array.isArray(recs)) return;
    const fp = this._getFp(recs);
    this._memo[key] = { fp, data };
  },
  clearMemo() {
    this._memo = {};
  },

  // 1. Calculate Total Suppliers Créances (Dettes fournisseurs / Restant dû)
  calculateSuppliersCreances(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('creances', bcs);
    if (cached) return cached;
    const supMap = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || 'Fournisseur non spécifié').trim();
      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supplierName: sup,
          committedTTC: 0,
          committedHT: 0,
          paidAmount: 0,
          creance: 0,
          bcCount: 0,
          paidBcCount: 0,
          unpaidBcCount: 0
        });
      }
      const entry = supMap.get(sup);
      const amtTTC = Number(bc.amountTTC || bc.amount || 0);
      const amtHT = Number(bc.amountHT || amtTTC / 1.19 || 0);
      entry.committedTTC += amtTTC;
      entry.committedHT += amtHT;
      entry.bcCount += 1;

      if (bc.status === 'paye' || Boolean(bc.paymentPaidDate) || (bc.dpRef && bc.dpRef.length > 0)) {
        entry.paidAmount += amtTTC;
        entry.paidBcCount += 1;
      } else {
        entry.unpaidBcCount += 1;
      }
    });

    let totalCommittedTTC = 0;
    let totalPaidAmount = 0;
    let totalCreance = 0;
    let suppliersWithDebtCount = 0;

    const suppliersList = [];
    supMap.forEach((entry) => {
      entry.creance = Math.max(0, entry.committedTTC - entry.paidAmount);
      totalCommittedTTC += entry.committedTTC;
      totalPaidAmount += entry.paidAmount;
      totalCreance += entry.creance;
      if (entry.creance > 0) suppliersWithDebtCount++;
      suppliersList.push(entry);
    });

    suppliersList.sort((a, b) => b.creance - a.creance);

    const result = {
      totalCommittedTTC,
      totalPaidAmount,
      totalCreance,
      suppliersWithDebtCount,
      totalSuppliersCount: suppliersList.length,
      suppliers: suppliersList
    };
    this._setMemo('creances', bcs, result);
    return result;
  },

  // 2. Monthly Budget Forecasting / Cash-out Prevision per Month
  calculateMonthlyPrevision(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('prevision', bcs);
    if (cached) return cached;
    const monthLabels = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const months = [];
    const curYear = 2026;

    for (let m = 1; m <= 12; m++) {
      const mStr = `${curYear}-${String(m).padStart(2, '0')}`;
      months.push({
        key: mStr,
        label: `${monthLabels[m - 1]} ${curYear}`,
        monthNum: m,
        realizedDisbursements: 0,
        pendingCommitments: 0,
        projectedCashOut: 0,
        bcCount: 0
      });
    }

    const monthMap = new Map(months.map(m => [m.key, m]));

    bcs.forEach(bc => {
      const amt = Number(bc.amountTTC || bc.amount || 0);
      const isPaid = (bc.status === 'paye' || Boolean(bc.paymentPaidDate));
      const payDate = bc.paymentPaidDate || bc.date;

      if (isPaid && payDate) {
        const mKey = String(payDate).substring(0, 7);
        if (monthMap.has(mKey)) {
          const mObj = monthMap.get(mKey);
          mObj.realizedDisbursements += amt;
          mObj.bcCount += 1;
        }
      } else {
        let targetDate = bc.deliveryDate || bc.goodsReceivedDate || bc.date;
        let mKey = targetDate ? String(targetDate).substring(0, 7) : '2026-10';
        if (!monthMap.has(mKey)) mKey = '2026-10';
        const mObj = monthMap.get(mKey);
        if (mObj) {
          mObj.pendingCommitments += amt;
        }
      }
    });

    months.forEach(m => {
      m.projectedCashOut = m.realizedDisbursements + m.pendingCommitments;
    });

    const now = new Date();
    const currentMonthNum = (now.getFullYear() === curYear) ? (now.getMonth() + 1) : 10;
    const currentMKey = `${curYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const nextMonthNum = Math.min(12, currentMonthNum + 1);
    const nextMKey = `${curYear}-${String(nextMonthNum).padStart(2, '0')}`;
    const followingMonthNum = Math.min(12, currentMonthNum + 2);
    const followingMKey = `${curYear}-${String(followingMonthNum).padStart(2, '0')}`;

    const result = {
      months,
      currentMonth: monthMap.get(currentMKey) || months[currentMonthNum - 1] || months[0],
      nextMonth: monthMap.get(nextMKey) || months[nextMonthNum - 1] || months[1],
      followingMonth: monthMap.get(followingMKey) || months[followingMonthNum - 1] || months[2],
      totalProjectedYear: months.reduce((s, m) => s + m.projectedCashOut, 0)
    };
    this._setMemo('prevision', bcs, result);
    return result;
  },

  // 3. Monthly Consumption Trends & Volume Analysis
  calculateMonthlyConsumption(records) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('consumption', bcs);
    if (cached) return cached;
    const monthStats = {};

    bcs.forEach(bc => {
      if (!bc.date) return;
      const mKey = String(bc.date).substring(0, 7);
      if (!monthStats[mKey]) {
        monthStats[mKey] = {
          month: mKey,
          totalSpend: 0,
          ordersCount: 0,
          avgOrderValue: 0
        };
      }
      const amt = Number(bc.amountTTC || bc.amount || 0);
      monthStats[mKey].totalSpend += amt;
      monthStats[mKey].ordersCount += 1;
    });

    const sortedMonths = Object.keys(monthStats).sort().map((k, idx, arr) => {
      const obj = monthStats[k];
      obj.avgOrderValue = obj.ordersCount > 0 ? Math.round(obj.totalSpend / obj.ordersCount) : 0;
      if (idx > 0) {
        const prevSpend = monthStats[arr[idx - 1]].totalSpend;
        obj.growthMoM = prevSpend > 0 ? Math.round(((obj.totalSpend - prevSpend) / prevSpend) * 100) : 0;
      } else {
        obj.growthMoM = 0;
      }
      return obj;
    });

    const totalSpend = sortedMonths.reduce((s, m) => s + m.totalSpend, 0);
    const avgMonthlySpend = sortedMonths.length > 0 ? Math.round(totalSpend / sortedMonths.length) : 0;

    const result = {
      months: sortedMonths,
      totalSpend,
      avgMonthlySpend,
      activeMonthsCount: sortedMonths.length
    };
    this._setMemo('consumption', bcs, result);
    return result;
  },

  // 4. BC Importance & Priority Classifier
  classifyBcImportance(bc) {
    if (!bc) return 'normal';
    const amt = Number(bc.amountTTC || bc.amount || 0);
    const desc = `${bc.description || ''} ${bc.supplierName || ''} ${bc.notes || ''}`.toLowerCase();
    const days = Number(bc.totalPaymentDelayDays || 0);

    // 1. Critical: High financial volume >= 1.5M DZD, mechanical breakdown emergency, or delay > 45 days
    if (amt >= 1500000 || days > 45 || /urgence|panne|immobilis|moteur|boite|transmission|radiateur/i.test(desc)) {
      return 'critical';
    }
    // 2. High / Strategic: 500k to 1.5M DZD or strategic fleet recurring categories
    if (amt >= 500000 || /gros œuvre|carburant|gasoil|pneu|filtration|batterie|frein/i.test(desc)) {
      return 'high';
    }
    // 3. Standard
    return 'normal';
  },

  // 5. Payment Recurrence per Supplier (Frequency and Recurrence Cadence)
  calculatePaymentRecurrence(records, payments) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('recurrence', bcs);
    if (cached) return cached;
    const supPayments = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || '').trim();
      if (!sup) return;
      const isPaid = (bc.status === 'paye' || Boolean(bc.paymentPaidDate));
      const payDate = bc.paymentPaidDate || (isPaid ? bc.date : null);
      if (payDate) {
        if (!supPayments.has(sup)) supPayments.set(sup, []);
        supPayments.get(sup).push(new Date(payDate).getTime());
      }
    });

    const recurrenceMap = new Map();

    supPayments.forEach((timestamps, sup) => {
      timestamps.sort((a, b) => a - b);
      if (timestamps.length < 2) {
        recurrenceMap.set(sup, {
          supplierName: sup,
          paymentCount: timestamps.length,
          avgIntervalDays: 0,
          cadenceLabel: 'Ponctuel / Occasionnel',
          lastPaymentDate: timestamps.length > 0 ? new Date(timestamps[0]).toISOString().split('T')[0] : null,
          nextProjectedPaymentDate: null
        });
        return;
      }

      let intervalSum = 0;
      for (let i = 1; i < timestamps.length; i++) {
        intervalSum += (timestamps[i] - timestamps[i - 1]) / 86400000;
      }
      const avgIntervalDays = Math.max(1, Math.round(intervalSum / (timestamps.length - 1)));
      let cadenceLabel = 'Ponctuel / Occasionnel';
      if (avgIntervalDays <= 10) cadenceLabel = 'Hebdomadaire (~7j)';
      else if (avgIntervalDays <= 20) cadenceLabel = 'Bimensuel (~15j)';
      else if (avgIntervalDays <= 45) cadenceLabel = 'Mensuel (~30j)';
      else if (avgIntervalDays <= 95) cadenceLabel = 'Trimestriel (~90j)';

      const lastTs = timestamps[timestamps.length - 1];
      const nextTs = lastTs + (avgIntervalDays * 86400000);

      recurrenceMap.set(sup, {
        supplierName: sup,
        paymentCount: timestamps.length,
        avgIntervalDays,
        cadenceLabel,
        lastPaymentDate: new Date(lastTs).toISOString().split('T')[0],
        nextProjectedPaymentDate: new Date(nextTs).toISOString().split('T')[0]
      });
    });

    this._setMemo('recurrence', bcs, recurrenceMap);
    return recurrenceMap;
  },

  // 6. Average Monthly & Transaction Consumption per Supplier
  calculateSupplierAverages(records) {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const cached = this._getMemo('averages', bcs);
    if (cached) return cached;
    const supData = new Map();

    bcs.forEach(bc => {
      const sup = (bc.supplierName || 'Inconnu').trim();
      if (!supData.has(sup)) {
        supData.set(sup, {
          supplierName: sup,
          totalSpend: 0,
          ordersCount: 0,
          monthsSet: new Set(),
          minAmount: Infinity,
          maxAmount: -Infinity
        });
      }
      const entry = supData.get(sup);
      const amt = Number(bc.amountTTC || bc.amount || 0);
      entry.totalSpend += amt;
      entry.ordersCount += 1;
      if (bc.date) entry.monthsSet.add(String(bc.date).substring(0, 7));
      if (amt < entry.minAmount) entry.minAmount = amt;
      if (amt > entry.maxAmount) entry.maxAmount = amt;
    });

    const result = [];
    supData.forEach((entry, sup) => {
      const activeMonths = Math.max(1, entry.monthsSet.size);
      result.push({
        supplierName: sup,
        totalSpend: entry.totalSpend,
        ordersCount: entry.ordersCount,
        activeMonths,
        avgPerTransaction: entry.ordersCount > 0 ? Math.round(entry.totalSpend / entry.ordersCount) : 0,
        avgMonthlySpend: Math.round(entry.totalSpend / activeMonths),
        minAmount: entry.minAmount === Infinity ? 0 : entry.minAmount,
        maxAmount: entry.maxAmount === -Infinity ? 0 : entry.maxAmount
      });
    });

    result.sort((a, b) => b.totalSpend - a.totalSpend);
    this._setMemo('averages', bcs, result);
    return result;
  },

  // Financial Interactive UI State
  _finSearch: '',
  _finDebtFilter: 'all',
  _finShowAll: false,
  _finDpSearch: '',
  _finDpStatusFilter: 'all',
  _finDpShowAll: false,

  onFinSearch(val, targetId) {
    this._finSearch = (val || '').trim().toLowerCase();
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  setFinDebtFilter(filter, targetId) {
    this._finDebtFilter = filter;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  toggleFinShowAll(targetId) {
    this._finShowAll = !this._finShowAll;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  onFinDpSearch(val, targetId) {
    this._finDpSearch = (val || '').trim().toLowerCase();
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  setFinDpStatusFilter(filter, targetId) {
    this._finDpStatusFilter = filter;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  toggleFinDpShowAll(targetId) {
    this._finDpShowAll = !this._finDpShowAll;
    if (targetId === 'cockpit') this.renderFinancialIntelligenceCockpit();
    else this.renderFinancialIntelligenceSection();
  },

  // Build Unified Financial HTML
  buildFinancialIntelligenceHtml(records, targetId = 'kpi') {
    this.ensureDataHydrated();
    let bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    if ((!bcs || bcs.length === 0) && typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.bcRecords)) {
      bcs = window.PRELOAD_DATA.bcRecords;
    }
    const creancesData = this.calculateSuppliersCreances(bcs);
    const previsionData = this.calculateMonthlyPrevision(bcs);
    const consumptionData = this.calculateMonthlyConsumption(bcs);
    const recurrenceMap = this.calculatePaymentRecurrence(bcs);
    const supplierAverages = this.calculateSupplierAverages(bcs);

    // Merge averages & recurrence & creances for table
    let fullSupplierTableData = supplierAverages.map(sa => {
      const creanceInfo = creancesData.suppliers.find(s => s.supplierName === sa.supplierName) || { creance: 0, paidAmount: 0 };
      const recInfo = recurrenceMap.get(sa.supplierName) || { cadenceLabel: 'Ponctuel', nextProjectedPaymentDate: '—' };
      return {
        ...sa,
        creance: creanceInfo.creance,
        paidAmount: creanceInfo.paidAmount,
        cadenceLabel: recInfo.cadenceLabel,
        nextProjectedPaymentDate: recInfo.nextProjectedPaymentDate || '—'
      };
    });

    const totalSuppliersCount = fullSupplierTableData.length;
    const debtCount = fullSupplierTableData.filter(s => s.creance > 0).length;
    const settledCount = totalSuppliersCount - debtCount;

    // Apply debt filter
    if (this._finDebtFilter === 'debt') {
      fullSupplierTableData = fullSupplierTableData.filter(s => s.creance > 0);
    } else if (this._finDebtFilter === 'settled') {
      fullSupplierTableData = fullSupplierTableData.filter(s => s.creance <= 0);
    }

    // Apply search filter
    if (this._finSearch) {
      fullSupplierTableData = fullSupplierTableData.filter(s => (s.supplierName || '').toLowerCase().includes(this._finSearch));
    }

    const filteredCount = fullSupplierTableData.length;
    const displayList = this._finShowAll ? fullSupplierTableData : fullSupplierTableData.slice(0, 15);

    // Demandes de Paiement (DP) Register Data
    const allPayments = (typeof state !== 'undefined' && Array.isArray(state.payments) && state.payments.length > 0)
      ? state.payments
      : ((typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments))
        ? window.PRELOAD_DATA.payments
        : []);

    let dpTableData = [...allPayments];
    const totalDpsCount = dpTableData.length;
    const paidDpsCount = dpTableData.filter(p => p.status === 'paye' || Boolean(p.paidDate)).length;
    const pendingDpsCount = totalDpsCount - paidDpsCount;

    if (this._finDpStatusFilter === 'paid') {
      dpTableData = dpTableData.filter(p => p.status === 'paye' || Boolean(p.paidDate));
    } else if (this._finDpStatusFilter === 'pending') {
      dpTableData = dpTableData.filter(p => p.status !== 'paye' && !p.paidDate);
    }

    if (this._finDpSearch) {
      const q = this._finDpSearch;
      dpTableData = dpTableData.filter(p => {
        const hay = `${p.paymentRef || ''} ${p.beneficiary || ''} ${p.supplierName || ''} ${p.natureExpense || ''} ${(p.linkedBcRefs || []).join(' ')} ${p.notes || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const filteredDpsCount = dpTableData.length;
    const displayDpsList = this._finDpShowAll ? dpTableData : dpTableData.slice(0, 15);

    return `
      <!-- 4 Top Executive Financial Intelligence Cards -->
      <div class="fin-stats-grid">
        <div class="fin-stat-card creance-accent">
          <div class="fin-stat-icon" style="color:#ef4444;"><i class="fas fa-hand-holding-dollar"></i></div>
          <div class="fin-stat-num" style="color:#dc2626;">${formatMoney(creancesData.totalCreance, 'DZD')}</div>
          <div class="fin-stat-lbl">Total Créances Fournisseurs</div>
          <div class="fin-stat-sub">
            <span style="color:#ef4444;font-weight:700;">${creancesData.suppliersWithDebtCount}</span> débiteurs · 
            <span style="color:#10b981;font-weight:700;">${settledCount}</span> soldés
          </div>
        </div>

        <div class="fin-stat-card prevision-accent">
          <div class="fin-stat-icon" style="color:#3b82f6;"><i class="fas fa-calendar-check"></i></div>
          <div class="fin-stat-num" style="color:#2563eb;">${formatMoney(previsionData.nextMonth ? previsionData.nextMonth.projectedCashOut : 0, 'DZD')}</div>
          <div class="fin-stat-lbl">Prévision Décaissement (${previsionData.nextMonth ? previsionData.nextMonth.label : 'Mois Prochain'})</div>
          <div class="fin-stat-sub">Budget annuel : ${formatMoney(previsionData.totalProjectedYear, 'DZD')}</div>
        </div>

        <div class="fin-stat-card consumption-accent">
          <div class="fin-stat-icon" style="color:#10b981;"><i class="fas fa-chart-line"></i></div>
          <div class="fin-stat-num" style="color:#059669;">${formatMoney(consumptionData.avgMonthlySpend, 'DZD')}</div>
          <div class="fin-stat-lbl">Consommation Moyenne Mensuelle</div>
          <div class="fin-stat-sub">Burn-rate sur ${consumptionData.activeMonthsCount} mois analysés</div>
        </div>

        <div class="fin-stat-card recurrence-accent">
          <div class="fin-stat-icon" style="color:#8b5cf6;"><i class="fas fa-repeat"></i></div>
          <div class="fin-stat-num" style="color:#7c3aed;">${totalSuppliersCount}</div>
          <div class="fin-stat-lbl">Partenaires & Fournisseurs Actifs</div>
          <div class="fin-stat-sub">Règlement multi-cadence tracé</div>
        </div>
      </div>

      <!-- Monthly Cash-Out Prevision & Consumption Timeline Box -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              📅 Prévision de Trésorerie & Consommation Mensuelle (Exercice 2026)
            </h4>
            <small class="text-muted">Évolution des volumes engagés et projection des décaissements mensuels</small>
          </div>
          <span class="badge bg-primary-subtle text-primary font-monospace font-weight-bold">
            Budget Projeté : ${formatMoney(previsionData.totalProjectedYear, 'DZD')}
          </span>
        </div>

        <div class="timeline-grid">
          ${previsionData.months.map(m => `
            <div class="timeline-month-box">
              <div class="timeline-month-lbl">${m.label}</div>
              <div class="timeline-month-val">${formatMoney(m.projectedCashOut, 'DZD')}</div>
              <div class="timeline-month-sub">${m.bcCount} BC(s)</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Advanced Supplier Financial Table: Créances, Récurrence & Moyennes -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              🏢 Analyse Financière par Fournisseur : Créances, Récurrence & Moyennes
            </h4>
            <small class="text-muted">Détail des dettes fournisseurs, moyennes par commande, consommation mensuelle et cadence de paiement</small>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="btn btn-sm btn-ghost" type="button" onclick="ApproNextGen.exportFinancialReport()" title="Télécharger la synthèse financière Excel/CSV">
              <i class="fas fa-file-excel text-success me-1"></i> Exporter CSV
            </button>
            <span class="badge bg-light text-muted border">${filteredCount} / ${totalSuppliersCount} Fournisseurs</span>
          </div>
        </div>

        <!-- Interactive Search & Debt Filter Toolbar -->
        <div class="fin-toolbar">
          <input type="text" class="fin-search-input" placeholder="🔍 Rechercher un fournisseur..." value="${escapeHtml(this._finSearch)}" oninput="ApproNextGen.onFinSearch(this.value, '${targetId}')">
          <div class="fin-filters-group">
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'all' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('all', '${targetId}')">Tous (${totalSuppliersCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'debt' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('debt', '${targetId}')">🔴 Débiteurs (${debtCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDebtFilter === 'settled' ? 'active' : ''}" onclick="ApproNextGen.setFinDebtFilter('settled', '${targetId}')">🟢 Soldés (${settledCount})</button>
            <button type="button" class="btn-fin-filter" onclick="ApproNextGen.toggleFinShowAll('${targetId}')">${this._finShowAll ? 'Afficher Top 15' : 'Afficher Tout (' + filteredCount + ')'}</button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="fin-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th style="text-align:right;">Volume Total TTC</th>
                <th style="text-align:right;">Total Réglé</th>
                <th style="text-align:right;">Créance Restante</th>
                <th style="text-align:center;">Commandes</th>
                <th style="text-align:right;">Moyenne / Commande</th>
                <th style="text-align:right;">Moyenne Mensuelle</th>
                <th style="text-align:center;">Cadence Paiement</th>
                <th style="text-align:center;">Prochaine Échéance</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${displayList.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted);">
                    Aucun fournisseur ne correspond aux critères de recherche.
                  </td>
                </tr>
              ` : displayList.map(s => {
                const isDebt = s.creance > 0;
                const creanceColor = isDebt ? '#dc2626' : '#10b981';
                return `
                  <tr>
                    <td><strong>${escapeHtml(s.supplierName)}</strong></td>
                    <td style="text-align:right;font-weight:700;">${formatMoney(s.totalSpend, 'DZD')}</td>
                    <td style="text-align:right;color:#059669;">${formatMoney(s.paidAmount, 'DZD')}</td>
                    <td style="text-align:right;font-weight:800;color:${creanceColor};">
                      ${formatMoney(s.creance, 'DZD')}
                      ${isDebt ? `<span class="badge bg-danger-subtle text-danger ms-1" style="font-size:0.65rem;">Dû</span>` : `<span class="badge bg-success-subtle text-success ms-1" style="font-size:0.65rem;">Soldé</span>`}
                    </td>
                    <td style="text-align:center;">${s.ordersCount} BC</td>
                    <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(s.avgPerTransaction, 'DZD')}</td>
                    <td style="text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(s.avgMonthlySpend, 'DZD')}</td>
                    <td style="text-align:center;"><span class="badge bg-light text-muted border">${escapeHtml(s.cadenceLabel)}</span></td>
                    <td style="text-align:center;font-size:0.75rem;color:#64748b;">${s.nextProjectedPaymentDate}</td>
                    <td style="text-align:center;">
                      <button class="btn btn-ghost btn-xs" type="button" onclick="ApproNextGen.filterBySupplier(decodeURIComponent('${encodeURIComponent(s.supplierName)}'))" title="Filtrer les bons de commande de ce fournisseur">
                        <i class="fas fa-search me-1"></i> BCs
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Complete Linked Demandes de Paiement (DP) Register Table -->
      <div class="fin-table-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h4 class="fin-table-title" style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text, #0f172a);">
              📋 Registre Intégré des Demandes de Paiement (DP) &amp; Règlements
            </h4>
            <small class="text-muted">Traçabilité complète des dossiers DP scannés, ordonnancements de trésorerie et rapprochement BC</small>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="btn btn-sm btn-ghost" type="button" onclick="ApproNextGen.exportDpReport()" title="Télécharger le registre DP en CSV">
              <i class="fas fa-file-excel text-success me-1"></i> Exporter DP (CSV)
            </button>
            <span class="badge bg-light text-muted border">${filteredDpsCount} / ${totalDpsCount} Demandes</span>
          </div>
        </div>

        <!-- Interactive Search & DP Status Filter Toolbar -->
        <div class="fin-toolbar">
          <input type="text" class="fin-search-input" placeholder="🔍 Rechercher une DP (Réf, Bénéficiaire, BC lié)..." value="${escapeHtml(this._finDpSearch)}" oninput="ApproNextGen.onFinDpSearch(this.value, '${targetId}')">
          <div class="fin-filters-group">
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'all' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('all', '${targetId}')">Toutes (${totalDpsCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'paid' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('paid', '${targetId}')">🟢 Payées (${paidDpsCount})</button>
            <button type="button" class="btn-fin-filter ${this._finDpStatusFilter === 'pending' ? 'active' : ''}" onclick="ApproNextGen.setFinDpStatusFilter('pending', '${targetId}')">🟡 En attente (${pendingDpsCount})</button>
            <button type="button" class="btn-fin-filter" onclick="ApproNextGen.toggleFinDpShowAll('${targetId}')">${this._finDpShowAll ? 'Afficher Top 15' : 'Afficher Tout (' + filteredDpsCount + ')'}</button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="fin-table">
            <thead>
              <tr>
                <th>Réf DP</th>
                <th style="text-align:center;">Date Demande</th>
                <th style="text-align:center;">Date Règlement</th>
                <th>Bénéficiaire / Fournisseur</th>
                <th>Objet / Nature Dépense</th>
                <th style="text-align:center;">BC Lié(s)</th>
                <th style="text-align:right;">Montant (DZD)</th>
                <th style="text-align:center;">Mode</th>
                <th style="text-align:center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${displayDpsList.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">
                    Aucune demande de paiement ne correspond aux critères.
                  </td>
                </tr>
              ` : displayDpsList.map(dp => {
                const isPaid = dp.status === 'paye' || Boolean(dp.paidDate);
                const reqDate = dp.requestDate || '—';
                const paidDate = dp.paidDate || '—';
                const bcs = Array.isArray(dp.linkedBcRefs) && dp.linkedBcRefs.length > 0 ? dp.linkedBcRefs : (dp.linkedBcRef ? [dp.linkedBcRef] : []);
                return `
                  <tr>
                    <td><strong>${escapeHtml(dp.paymentRef || '—')}</strong></td>
                    <td style="text-align:center;font-size:0.75rem;color:#64748b;">${escapeHtml(reqDate)}</td>
                    <td style="text-align:center;font-size:0.75rem;color:${isPaid ? '#059669' : '#64748b'};font-weight:${isPaid ? '700' : '400'};">${escapeHtml(paidDate)}</td>
                    <td><strong>${escapeHtml(dp.beneficiary || dp.supplierName || '—')}</strong></td>
                    <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(dp.natureExpense || dp.notes || '')}">
                      ${escapeHtml(dp.natureExpense || dp.notes || '—')}
                    </td>
                    <td style="text-align:center;">
                      ${bcs.length > 0 ? bcs.map(ref => `
                        <span class="badge bg-primary-subtle text-primary border" style="cursor:pointer;font-size:0.7rem;" onclick="ApproNextGen.filterBySupplier('${escapeHtml(ref)}')">
                          ${escapeHtml(ref)}
                        </span>
                      `).join(' ') : '<span style="color:#94a3b8;">—</span>'}
                    </td>
                    <td style="text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;">${formatMoney(dp.amount || 0, 'DZD')}</td>
                    <td style="text-align:center;"><span class="badge bg-light text-muted border">${escapeHtml(dp.mode || 'virement')}</span></td>
                    <td style="text-align:center;">
                      ${isPaid 
                        ? `<span class="badge bg-success-subtle text-success" style="font-weight:700;">Payé</span>` 
                        : `<span class="badge bg-warning-subtle text-warning" style="font-weight:700;">En cours</span>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // Render Full Financial Intelligence & Supplier Analytics Section (in KPI tab)
  renderFinancialIntelligenceSection(records) {
    this.ensureDataHydrated();
    let section = document.getElementById('kpiSupplierIntelligenceSection');
    if (!section) {
      section = document.createElement('div');
      section.id = 'kpiSupplierIntelligenceSection';
      section.className = 'financial-intel-section';
      const charts = document.getElementById('dashboardCharts');
      if (charts) charts.insertAdjacentElement('beforebegin', section);
      else {
        const kpiShell = document.getElementById('tabKpi') || document.querySelector('.panel');
        if (kpiShell) kpiShell.appendChild(section);
      }
    }
    if (section) {
      section.innerHTML = this.buildFinancialIntelligenceHtml(records, 'kpi');
    }
  },

  // Render Dedicated Financial Intelligence Cockpit (in Finances & Créances tab)
  renderFinancialIntelligenceCockpit(records) {
    this.ensureDataHydrated();
    let container = document.getElementById('financialCockpitContainer');
    if (!container) {
      const pageFinance = document.getElementById('page-finance');
      if (pageFinance) {
        container = document.createElement('div');
        container.id = 'financialCockpitContainer';
        pageFinance.appendChild(container);
      }
    }
    if (container) {
      container.innerHTML = this.buildFinancialIntelligenceHtml(records, 'cockpit');
    }
  },

  // Refresh both financial views
  refreshFinancialSections(records) {
    if (document.getElementById('kpiSupplierIntelligenceSection')) {
      this.renderFinancialIntelligenceSection(records);
    }
    if (document.getElementById('financialCockpitContainer')) {
      this.renderFinancialIntelligenceCockpit(records);
    }
  },

  // Export Complete Financial CSV Report with UTF-8 BOM
  exportFinancialReport(records) {
    const bcs = records || (typeof state !== 'undefined' ? state.bcRecords : []) || [];
    const creancesData = this.calculateSuppliersCreances(bcs);
    const recurrenceMap = this.calculatePaymentRecurrence(bcs);
    const supplierAverages = this.calculateSupplierAverages(bcs);

    let csv = 'Fournisseur;Volume Total TTC (DZD);Total Regle (DZD);Creance Restante (DZD);Statut;Nombre Commandes;Moyenne par Commande (DZD);Consommation Moyenne Mensuelle (DZD);Cadence de Reglement;Prochaine Echeance Estimee\n';

    supplierAverages.forEach(sa => {
      const creanceInfo = creancesData.suppliers.find(s => s.supplierName === sa.supplierName) || { creance: 0, paidAmount: 0 };
      const recInfo = recurrenceMap.get(sa.supplierName) || { cadenceLabel: 'Ponctuel', nextProjectedPaymentDate: '—' };
      const status = creanceInfo.creance > 0 ? 'Debiteur' : 'Solde';
      const row = [
        `"${sa.supplierName.replace(/"/g, '""')}"`,
        Math.round(sa.totalSpend),
        Math.round(creanceInfo.paidAmount),
        Math.round(creanceInfo.creance),
        status,
        sa.ordersCount,
        Math.round(sa.avgPerTransaction),
        Math.round(sa.avgMonthlySpend),
        `"${recInfo.cadenceLabel}"`,
        recInfo.nextProjectedPaymentDate || '—'
      ];
      csv += row.join(';') + '\n';
    });

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const nowStr = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Synthese_Financiere_Fournisseurs_${nowStr}.csv`);
        if (typeof document.body.appendChild === 'function') document.body.appendChild(link);
        if (typeof link.click === 'function') link.click();
        if (typeof document.body.removeChild === 'function') document.body.removeChild(link);
        if (typeof showToast === 'function') showToast('Export financier téléchargé avec succès');
      } catch(e) {
        console.warn('Export file download skipped:', e.message);
      }
    }
    return csv;
  },

  // Export Complete Demandes de Paiement (DP) CSV Report
  exportDpReport() {
    this.ensureDataHydrated();
    const payments = (typeof state !== 'undefined' && Array.isArray(state.payments) && state.payments.length > 0)
      ? state.payments
      : ((typeof window !== 'undefined' && window.PRELOAD_DATA && Array.isArray(window.PRELOAD_DATA.payments))
        ? window.PRELOAD_DATA.payments
        : []);

    let csv = 'Ref DP;Date Demande;Date Reglement;Beneficiaire;Nature Depense;BCs Lies;Montant (DZD);Mode;Statut\n';
    payments.forEach(p => {
      const bcs = Array.isArray(p.linkedBcRefs) ? p.linkedBcRefs.join(', ') : (p.linkedBcRef || '');
      const isPaid = p.status === 'paye' || Boolean(p.paidDate);
      const row = [
        `"${(p.paymentRef || '').replace(/"/g, '""')}"`,
        p.requestDate || '',
        p.paidDate || '',
        `"${(p.beneficiary || p.supplierName || '').replace(/"/g, '""')}"`,
        `"${(p.natureExpense || p.notes || '').replace(/"/g, '""')}"`,
        `"${bcs.replace(/"/g, '""')}"`,
        Math.round(p.amount || 0),
        `"${(p.mode || 'virement').replace(/"/g, '""')}"`,
        isPaid ? 'Paye' : 'En cours'
      ];
      csv += row.join(';') + '\n';
    });

    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const nowStr = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Demandes_Paiement_DP_${nowStr}.csv`);
        if (typeof document.body.appendChild === 'function') document.body.appendChild(link);
        if (typeof link.click === 'function') link.click();
        if (typeof document.body.removeChild === 'function') document.body.removeChild(link);
        if (typeof showToast === 'function') showToast('Export DP téléchargé avec succès');
      } catch(e) {
        console.warn('Export file download skipped:', e.message);
      }
    }
    return csv;
  },

  // Filter BCs table by clicking supplier
  filterBySupplier(supplierName) {
    const input = document.getElementById('followupSearch');
    if (input) {
      input.value = supplierName;
      if (typeof setActiveTab === 'function') setActiveTab('followup');
      if (typeof window.applyFollowupFilter === 'function') {
        window.applyFollowupFilter();
      } else {
        if (typeof resetFollowupPage === 'function') resetFollowupPage();
        if (typeof renderFollowupTable === 'function') renderFollowupTable();
      }
      if (typeof showToast === 'function') showToast(`Filtré par fournisseur : "${supplierName}"`);
    }
  },

  // Inject Followup Importance / Priority selector controls & hooks
  injectFollowupImportanceControls() {
    if (typeof document === 'undefined' || !document.querySelector) return;
    
    // Inject Importance dropdown into toolbar
    const toolbar = document.querySelector('.toolbar-row') || document.querySelector('.table-toolbar');
    if (toolbar && !document.getElementById('followupImportanceFilter')) {
      const wrap = document.createElement('label');
      wrap.className = 'tool-inline compact';
      wrap.id = 'followupImportanceWrap';
      wrap.innerHTML = `
        <span>Priorité BC</span>
        <select id="followupImportanceFilter" class="form-select" onchange="ApproNextGen.onImportanceFilterChange(this.value)">
          <option value="all">Toutes les priorités</option>
          <option value="critical">🔴 Critique / Urgente (&gt; 1.5M DZD ou Panne)</option>
          <option value="high">🟠 Stratégique / Haute (500k – 1.5M DZD)</option>
          <option value="normal">🔵 Standard / Opérationnelle (&lt; 500k DZD)</option>
        </select>
      `;
      toolbar.appendChild(wrap);
    }

    // Intercept window.filteredBcRecords to apply importance filter
    if (typeof window.filteredBcRecords === 'function') {
      const originalFilteredBcRecords = window.filteredBcRecords;
      window.filteredBcRecords = () => {
        let rows = originalFilteredBcRecords();
        const sel = document.getElementById('followupImportanceFilter');
        const importance = (sel && sel.value) ? sel.value : (this.bcImportanceFilter || 'all');
        if (importance && importance !== 'all') {
          rows = rows.filter(r => this.classifyBcImportance(r) === importance);
        }
        return rows;
      };
    }
  },

  onImportanceFilterChange(val) {
    this.bcImportanceFilter = val;
    const sel = document.getElementById('followupImportanceFilter');
    if (sel) sel.value = val;
    if (typeof resetFollowupPage === 'function') resetFollowupPage();
    if (typeof renderFollowupTable === 'function') renderFollowupTable();
  },

  listenForPortalTheme() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'setTheme') {
          const theme = event.data.theme;
          if (typeof document !== 'undefined') {
            if (document.body && document.body.setAttribute) document.body.setAttribute('data-theme', theme);
            if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute('data-theme', theme);
            const sel = document.getElementById('themeSelect');
            if (sel) sel.value = theme;
          }
          if (typeof state !== 'undefined' && state.settings) {
            state.settings.theme = theme;
          }
        }
      });

      try {
        const parentTheme = window.parent && window.parent.localStorage && window.parent.localStorage.getItem('sde_portal_theme');
        if (parentTheme && typeof document !== 'undefined') {
          if (document.body && document.body.setAttribute) document.body.setAttribute('data-theme', parentTheme);
          if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute('data-theme', parentTheme);
          const sel = document.getElementById('themeSelect');
          if (sel) sel.value = parentTheme;
        }
      } catch(e) {}
    }
  }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ApproNextGen.init());
} else {
  ApproNextGen.init();
}
