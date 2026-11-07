/**
 * ERP DOUROUB — GDS SMART SCANNER v7
 * Mobile-first fullscreen. Entrée/Sortie picker. Auto BSM on deduction.
 */
(function(window) {
    'use strict';

    function isUserEligibleForGdsScan() {
        var user = null;
        if (typeof window.Auth !== 'undefined') {
            if (window.Auth.getUser) user = window.Auth.getUser();
            else if (window.Auth.getCurrentUser) user = window.Auth.getCurrentUser();
            else if (window.Auth.currentUser) user = window.Auth.currentUser;
        }
        if (!user) {
            try {
                var s = localStorage.getItem('erp_currentUser') || sessionStorage.getItem('erp_currentUser');
                if (s) user = JSON.parse(s);
            } catch(e) {}
        }
        if (!user) return false;
        var role = (user.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin' || role === 'directeur' ||
               role === 'magasinier' || role === 'mag' || role === 'gds' ||
               user.canDeductStock === true || user.gdsOption === true ||
               (user.service && user.service.toLowerCase().includes('stock'));
    }
    window.isUserEligibleForGdsScan = isUserEligibleForGdsScan;

    const GdsScannerModule = {
        html5QrCode: null,
        barcodeDetector: null,
        isScanning: false,
        torchOn: false,
        currentArticle: null,
        pendingCode: '',
        scanCooldown: false,
        lastScannedCode: null,
        lastScanTime: 0,
        sessionCount: 0,

        // ─── HELPERS ───────────────────────────────────────────────────────
        getUser() {
            try {
                if (typeof window.Auth !== 'undefined') {
                    if (window.Auth.getUser) return window.Auth.getUser();
                    if (window.Auth.getCurrentUser) return window.Auth.getCurrentUser();
                }
                const s = localStorage.getItem('erp_currentUser');
                return s ? JSON.parse(s) : null;
            } catch(e) { return null; }
        },

        jwt() { return localStorage.getItem('erp_jwt_token') || ''; },

        hdrs() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.jwt() }; },

        esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },

        playBeep(type) {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                const ctx = new AC();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                if (type === 'error') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.25);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                    osc.start(); osc.stop(ctx.currentTime + 0.25);
                } else if (type === 'entry') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(660, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.18, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.start(); osc.stop(ctx.currentTime + 0.15);
                } else {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    gain.gain.setValueAtTime(0.18, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                    osc.start(); osc.stop(ctx.currentTime + 0.12);
                }
            } catch(e) {}
        },

        haptic(pattern) {
            try { navigator.vibrate && navigator.vibrate(pattern || [60]); } catch(e) {}
        },

        subtitle(txt) {
            const el = document.getElementById('gdsScannerSubtitle');
            if (el) el.textContent = txt;
        },

        updateCounter() {
            const el = document.getElementById('gdsCountLabel');
            if (el) el.textContent = this.sessionCount + ' opération(s) cette session';
        },

        // ─── OPEN / CLOSE ──────────────────────────────────────────────────
        init() {
            if ('BarcodeDetector' in window) {
                try { this.barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','code_128','code_39','upc_a','upc_e'] }); } catch(e) {}
            }
        },

        openModal() {
            const modal = document.getElementById('gdsScannerModal');
            if (!modal) return;
            modal.classList.remove('hidden');
            this.clearResult();
            this.subtitle('Prêt à scanner');
            const input = document.getElementById('gdsManualBarcodeInput');
            if (input) { input.value = ''; setTimeout(() => input.focus(), 150); }
            if (window.innerWidth <= 820 && !this.isScanning) {
                setTimeout(() => this.startCamera(), 300);
            }
        },

        closeModal() {
            const modal = document.getElementById('gdsScannerModal');
            if (modal) modal.classList.add('hidden');
            this.stopCamera();
            this.currentArticle = null;
        },

        // ─── CAMERA ────────────────────────────────────────────────────────
        toggleCamera() {
            if (this.isScanning) { this.stopCamera(); } else { this.startCamera(); }
        },

        startCamera() {
            const container = document.getElementById('gdsCameraStream');
            if (!container) return;
            if (typeof Html5Qrcode === 'undefined' && typeof window.Html5Qrcode === 'undefined') {
                this.subtitle('Librairie caméra non chargée');
                return;
            }
            const H5 = window.Html5Qrcode || Html5Qrcode;
            try {
                if (this.html5QrCode) { try { this.html5QrCode.stop().catch(()=>{}); } catch(e) {} }
                const placeholder = document.getElementById('gdsCamPlaceholder');
                if (placeholder) placeholder.style.display = 'none';
                this.html5QrCode = new H5('gdsCameraStream');
                this.html5QrCode.start(
                    { facingMode: 'environment' },
                    { fps: 12, qrbox: { width: 200, height: 200 }, aspectRatio: 1.5 },
                    (decodedText) => { this.handleCode(decodedText); },
                    () => {}
                ).then(() => {
                    this.isScanning = true;
                    const btn = document.getElementById('btnToggleGdsCamera');
                    const lbl = document.getElementById('lblGdsCamAction');
                    const laser = document.getElementById('gdsLaserLine');
                    if (btn) btn.style.borderColor = '#10b981', btn.style.color = '#10b981';
                    if (lbl) lbl.textContent = 'Arrêter Caméra';
                    if (laser) laser.style.display = 'block';
                    const torchBtn = document.getElementById('btnToggleGdsTorch');
                    if (torchBtn) torchBtn.style.display = 'flex';
                    this.subtitle('Caméra active — pointez vers le code');
                }).catch(() => { this.subtitle('Accès caméra refusé'); });
            } catch(e) { this.subtitle('Erreur caméra'); }
        },

        stopCamera() {
            try {
                if (this.html5QrCode) {
                    this.html5QrCode.stop().then(() => {
                        this.isScanning = false;
                        const btn = document.getElementById('btnToggleGdsCamera');
                        const lbl = document.getElementById('lblGdsCamAction');
                        const laser = document.getElementById('gdsLaserLine');
                        if (btn) btn.style.borderColor = '#ef4444', btn.style.color = '#ef4444';
                        if (lbl) lbl.textContent = 'Activer Caméra';
                        if (laser) laser.style.display = 'none';
                        const ph = document.getElementById('gdsCamPlaceholder');
                        if (ph) ph.style.display = 'block';
                    }).catch(() => {});
                    this.html5QrCode = null;
                }
            } catch(e) {}
        },

        toggleTorch() {
            try {
                if (this.html5QrCode && this.isScanning) {
                    this.torchOn = !this.torchOn;
                    this.html5QrCode.applyVideoConstraints({ advanced: [{ torch: this.torchOn }] });
                    const btn = document.getElementById('btnToggleGdsTorch');
                    if (btn) btn.style.color = this.torchOn ? '#fbbf24' : '#94a3b8';
                }
            } catch(e) {}
        },

        // ─── FIND ARTICLE ──────────────────────────────────────────────────
        findArticle(code) {
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data && DB.data.articles ? DB.data.articles : []);
            const q = String(code).trim().toLowerCase();
            return articles.find(a =>
                (a.barcode && a.barcode.toLowerCase() === q) ||
                (a.code && a.code.toLowerCase() === q) ||
                (a.id && a.id === code) ||
                (a._id && String(a._id) === code)
            ) || null;
        },

        // ─── COOLDOWN HANDLER ──────────────────────────────────────────────
        handleCode(rawText) {
            if (!rawText) return;
            const text = String(rawText).trim();
            if (!text) return;
            if (this.scanCooldown) return;
            if (this.lastScannedCode === text && (Date.now() - this.lastScanTime) < 1800) return;
            this.scanCooldown = true;
            this.lastScannedCode = text;
            this.lastScanTime = Date.now();
            setTimeout(() => { this.scanCooldown = false; }, 1800);

            // Check preOrders / requisition QR first
            const preOrders = (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.preOrders)) ? DB.data.preOrders : [];
            const tl = text.toLowerCase();
            const order = preOrders.find(p => (p.ref && p.ref.toLowerCase() === tl) || p.id === text);
            if (order) {
                this.playBeep('success'); this.haptic([60]);
                this.closeModal();
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.openOrderFulfillment) {
                    if (typeof App !== 'undefined' && App.loadModule) App.loadModule('barcodeScanner');
                    setTimeout(() => BarcodeScanner.openOrderFulfillment(order), 150);
                }
                return;
            }

            const article = this.findArticle(text);
            if (article) {
                this.playBeep('success'); this.haptic([60, 30, 60]);
                this.currentArticle = article;
                this.renderActionPicker(article);
            } else {
                this.playBeep('error'); this.haptic([200]);
                this.renderUnknownResult(text);
            }
        },

        clearResult() {
            const area = document.getElementById('gdsScanResultArea');
            if (area) { area.innerHTML = ''; }
            this.currentArticle = null;
        },

        // ─── ACTION PICKER (found article) ────────────────────────────────
        renderActionPicker(article) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.currentArticle = article;
            const stock = Number(article.quantity) || 0;
            const isLow = stock <= (Number(article.minThreshold) || 5);
            this.subtitle(this.esc(article.designation));
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:16px;overflow:hidden;margin-bottom:12px;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
                    <div style="background:#0f172a;padding:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                            <div style="flex:1;min-width:0;">
                                <span style="font-size:0.68rem;background:#334155;color:#94a3b8;padding:2px 8px;border-radius:4px;font-family:monospace;">${this.esc(article.code||'ART')}</span>
                                <div style="font-size:1rem;font-weight:700;color:#fff;margin-top:6px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.esc(article.designation)}</div>
                                <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">${this.esc(article.category||'Général')}</div>
                            </div>
                            <div style="text-align:center;flex-shrink:0;background:${isLow?'#78350f':'#064e3b'};border-radius:12px;padding:10px 16px;">
                                <div style="font-size:2rem;font-weight:900;color:${isLow?'#fbbf24':'#34d399'};line-height:1;">${stock}</div>
                                <div style="font-size:0.65rem;color:${isLow?'#fcd34d':'#6ee7b7'};margin-top:2px;">${this.esc(article.unit||'U')} en stock</div>
                                ${isLow?'<div style="font-size:0.6rem;color:#fbbf24;margin-top:3px;font-weight:700;">⚠ STOCK BAS</div>':''}
                            </div>
                        </div>
                    </div>
                    <div style="padding:14px 16px;">
                        <div style="font-size:0.7rem;color:#475569;margin-bottom:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Choisir une opération</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                            <button onclick="GdsScannerModule.startSortie()" style="background:#1a0a0a;border:2px solid #ef4444;border-radius:14px;color:#ef4444;padding:16px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:700;transition:all 0.15s;" onmouseover="this.style.background='#7f1d1d'" onmouseout="this.style.background='#1a0a0a'">
                                <i class="fas fa-arrow-up" style="font-size:1.3rem;"></i>
                                <span style="font-size:0.88rem;">Bon de Sortie</span>
                                <span style="font-size:0.65rem;opacity:0.7;font-weight:400;">Déduire + BSM</span>
                            </button>
                            <button onclick="GdsScannerModule.startEntree()" style="background:#0a1a0f;border:2px solid #10b981;border-radius:14px;color:#10b981;padding:16px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:700;transition:all 0.15s;" onmouseover="this.style.background='#064e3b'" onmouseout="this.style.background='#0a1a0f'">
                                <i class="fas fa-arrow-down" style="font-size:1.3rem;"></i>
                                <span style="font-size:0.88rem;">Entrée Stock</span>
                                <span style="font-size:0.65rem;opacity:0.7;font-weight:400;">Ajouter</span>
                            </button>
                        </div>
                        <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                            <i class="fas fa-redo" style="margin-right:6px;"></i>Scanner suivant
                        </button>
                    </div>
                </div>`;
        },

        // ─── SORTIE FLOW ───────────────────────────────────────────────────
        startSortie() {
            const article = this.currentArticle;
            if (!article) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const depts = this._getDepts();
            const stock = Number(article.quantity) || 0;
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:16px;overflow:hidden;margin-bottom:12px;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
                    <div style="background:#1a0a0a;padding:12px 16px;border-bottom:1px solid #3f1515;display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:#7f1d1d;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-arrow-up" style="color:#fca5a5;font-size:1rem;"></i>
                        </div>
                        <div>
                            <div style="color:#fca5a5;font-weight:700;font-size:0.9rem;">Bon de Sortie (BSM)</div>
                            <div style="color:#6b7280;font-size:0.72rem;">${this.esc(article.designation)} · Stock: <strong style="color:#f87171;">${stock} ${this.esc(article.unit||'U')}</strong></div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
                            <button onclick="GdsScannerModule._adjQty(-1)" style="width:44px;height:44px;border-radius:10px;border:2px solid #334155;background:#0f172a;color:#fff;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>
                            <input id="gdsSortieQty" type="number" min="1" value="1" style="flex:1;padding:12px;border-radius:10px;border:2px solid #ef4444;background:#0f172a;color:#fff;font-size:1.3rem;font-weight:800;text-align:center;outline:none;">
                            <button onclick="GdsScannerModule._adjQty(1)" style="width:44px;height:44px;border-radius:10px;border:2px solid #334155;background:#0f172a;color:#fff;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">+</button>
                        </div>
                        <input id="gdsBeneficiary" type="text" placeholder="✦ Destinataire / Bénéficiaire *" list="gdsBenefList"
                            style="width:100%;padding:13px 14px;border-radius:10px;border:2px solid #ef4444;background:#0f172a;color:#fff;font-size:0.95rem;outline:none;box-sizing:border-box;margin-bottom:10px;"
                            oninput="this.style.borderColor='#2563eb'">
                        <datalist id="gdsBenefList">${depts.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                        <input id="gdsServiceField" type="text" placeholder="Service / Département (optionnel)" list="gdsServiceList"
                            style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.88rem;outline:none;box-sizing:border-box;margin-bottom:10px;">
                        <datalist id="gdsServiceList">${depts.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                        <input id="gdsSortieMotif" type="text" placeholder="Motif / Notes (optionnel)"
                            style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.88rem;outline:none;box-sizing:border-box;margin-bottom:14px;">
                        <div id="gdsSortieErrBox" style="display:none;background:#7f1d1d;border:1px solid #ef4444;border-radius:10px;padding:12px;color:#fca5a5;font-size:0.85rem;margin-bottom:12px;"></div>
                        <button id="gdsSortieValBtn" onclick="GdsScannerModule.confirmSortie()"
                            style="width:100%;padding:16px;border-radius:12px;background:#ef4444;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
                            <i class="fas fa-check-circle"></i> Valider le Bon de Sortie
                        </button>
                        <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)"
                            style="width:100%;padding:11px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                            ← Retour
                        </button>
                    </div>
                </div>`;
            setTimeout(() => { const el = document.getElementById('gdsBeneficiary'); if (el) el.focus(); }, 100);
        },

        _adjQty(delta) {
            const inp = document.getElementById('gdsSortieQty') || document.getElementById('gdsEntreeQty');
            if (!inp) return;
            let v = parseInt(inp.value,10)||1;
            v = Math.max(1, v + delta);
            inp.value = v;
        },

        _getDepts() {
            try {
                const s = (typeof DB !== 'undefined' && DB.getSettings) ? DB.getSettings() : {};
                const list = [];
                if (Array.isArray(s.departments)) list.push(...s.departments);
                if (Array.isArray(s.services)) list.push(...s.services);
                if (Array.isArray(s.beneficiaries)) list.push(...s.beneficiaries);
                return [...new Set(list)];
            } catch(e) { return []; }
        },

        _showErr(boxId, msg) {
            const box = document.getElementById(boxId);
            if (box) { box.style.display = 'block'; box.textContent = '❌ ' + msg; }
        },

        _hideErr(boxId) {
            const box = document.getElementById(boxId);
            if (box) { box.style.display = 'none'; box.textContent = ''; }
        },

        async confirmSortie() {
            const article = this.currentArticle;
            if (!article) { alert('Aucun article sélectionné.'); return; }
            const beneficiary = (document.getElementById('gdsBeneficiary')||{}).value.trim();
            const service = (document.getElementById('gdsServiceField')||{}).value.trim();
            const qty = parseInt((document.getElementById('gdsSortieQty')||{}).value,10)||1;
            const motif = (document.getElementById('gdsSortieMotif')||{}).value.trim();

            this._hideErr('gdsSortieErrBox');

            if (!beneficiary) {
                const el = document.getElementById('gdsBeneficiary');
                if (el) { el.style.borderColor = '#ef4444'; el.focus(); }
                this._showErr('gdsSortieErrBox', 'Veuillez saisir le destinataire.');
                return;
            }

            const stock = Number(article.quantity)||0;
            let allowNegative = false;
            if (stock < qty) {
                const ok = confirm(`Stock actuel (${stock}) < quantité demandée (${qty}). Autoriser stock négatif ?`);
                if (!ok) return;
                allowNegative = true;
            }

            // Resolve the best identifier: prefer _id, fallback to barcode/code
            let artId = String(article._id || '');
            if (!artId || !/^[a-f0-9]{24}$/i.test(artId)) {
                artId = article.barcode || article.code || article.id || '';
            }
            if (!artId) {
                this._showErr('gdsSortieErrBox', 'Article sans identifiant — rechargez la page.');
                return;
            }

            const valBtn = document.getElementById('gdsSortieValBtn');
            if (valBtn) { valBtn.disabled = true; valBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...'; }

            const user = this.getUser();
            const authorName = user ? (user.name || user.username || 'GDS') : 'GDS';
            const now = new Date();
            const refNum = 'BSM-GDS-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getTime()).slice(-5);

            // 1. STOCK DEDUCTION FIRST — if this fails, nothing else happens
            let stockOk = false;
            let stockErr = '';
            try {
                const r = await fetch('/api/articles/' + artId + '/stock', {
                    method: 'POST',
                    headers: this.hdrs(),
                    body: JSON.stringify({ type:'Sortie', quantity: qty, reason: motif||'Sortie GDS scanner', reference: refNum, user: authorName, allowNegative })
                });
                const d = await r.json();
                if (r.ok) {
                    stockOk = true;
                    article.quantity = (d.article && typeof d.article.quantity !== 'undefined') ? d.article.quantity : (stock - qty);
                } else {
                    stockErr = d.error || ('Serveur ' + r.status);
                }
            } catch(e) { stockErr = 'Réseau: ' + e.message; }

            if (!stockOk) {
                if (valBtn) { valBtn.disabled = false; valBtn.innerHTML = '<i class="fas fa-check-circle"></i> Valider le Bon de Sortie'; }
                this._showErr('gdsSortieErrBox', 'Stock non mis à jour — ' + stockErr);
                return;
            }

            // 2. BSM creation — best effort (stock already secured)
            let bsmCreated = false;
            try {
                const r2 = await fetch('/api/decharges', {
                    method: 'POST', headers: this.hdrs(),
                    body: JSON.stringify({
                        ref: refNum, type: 'BSM', status: 'served',
                        beneficiary, department: service || '',
                        items: [{ articleId: artId, articleCode: article.code||'', designation: article.designation||'', quantity: qty, unit: article.unit||'U' }],
                        notes: motif || 'Sortie par scan GDS mobile',
                        createdBy: authorName, servedBy: authorName, servedAt: now.toISOString()
                    })
                });
                if (r2.ok) {
                    bsmCreated = true;
                    const d2 = await r2.json();
                    if (typeof DB !== 'undefined' && DB.data) {
                        if (!Array.isArray(DB.data.decharges)) DB.data.decharges = [];
                        DB.data.decharges.unshift(d2.decharge || {});
                    }
                }
            } catch(e) {}

            // 3. Local movement log
            if (typeof DB !== 'undefined') {
                const mov = { articleId: artId, articleCode: article.code||'', designation: article.designation||'', type:'Sortie', quantity: qty, date: now.toISOString(), author: authorName, user: authorName, motif: motif||('BSM — '+beneficiary), destination: beneficiary, source:'Scanner GDS' };
                if (typeof DB.addStockMovement === 'function') DB.addStockMovement(mov);
                else if (DB.data && Array.isArray(DB.data.stockMovements)) DB.data.stockMovements.push(mov);
                if (typeof DB.save === 'function') DB.save();
            }

            this.playBeep('success'); this.haptic([60,30,120]);
            this.sessionCount++;
            this.updateCounter();
            this.renderSortieSuccess(article, qty, beneficiary, refNum, bsmCreated);
        },

        renderSortieSuccess(article, qty, beneficiary, ref, bsmCreated) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.subtitle('Bon de sortie créé ✓');
            area.innerHTML = `
                <div style="background:#052e16;border:1.5px solid #16a34a;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-check" style="color:#fff;font-size:1.1rem;"></i>
                        </div>
                        <div>
                            <div style="color:#4ade80;font-weight:800;font-size:1rem;">Bon de Sortie Créé !</div>
                            <div style="color:#86efac;font-size:0.74rem;">Ref: ${this.esc(ref)}</div>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:12px;font-size:0.85rem;color:#d1fae5;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#6ee7b7;">Article</span><span style="font-weight:600;">${this.esc(article.designation)}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#6ee7b7;">Quantité sortie</span><span style="font-weight:700;color:#fbbf24;">${qty} ${this.esc(article.unit||'U')}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#6ee7b7;">Stock restant</span><span style="font-weight:600;">${article.quantity} ${this.esc(article.unit||'U')}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#6ee7b7;">Destinataire</span><span style="font-weight:600;">${this.esc(beneficiary)}</span></div>
                    </div>
                    ${bsmCreated ? '<div style="font-size:0.76rem;color:#86efac;margin-bottom:12px;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>BSM enregistré dans MongoDB</div>' : '<div style="font-size:0.76rem;color:#fbbf24;margin-bottom:12px;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>Enregistré localement — sync en attente</div>'}
                    <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;padding:13px;border-radius:11px;background:#16a34a;color:#fff;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-barcode"></i> <span>Scanner suivant <span id="gdsAutoTimerSortie">(3)</span></span>
                    </button>
                </div>`;
            // Auto-advance in 3 seconds
            let sc = 3;
            const st = setInterval(() => {
                sc--;
                const lbl = document.getElementById('gdsAutoTimerSortie');
                if (lbl) lbl.textContent = '(' + sc + ')';
                if (sc <= 0) {
                    clearInterval(st);
                    this.clearResult();
                    const inp = document.getElementById('gdsManualBarcodeInput');
                    if (inp) inp.focus();
                }
            }, 1000);
        },

        // ─── ENTRÉE FLOW ───────────────────────────────────────────────────
        startEntree() {
            const article = this.currentArticle;
            if (!article) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const stock = Number(article.quantity)||0;
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:16px;overflow:hidden;margin-bottom:12px;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
                    <div style="background:#041a12;padding:12px 16px;border-bottom:1px solid #134e3a;display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:#064e3b;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-arrow-down" style="color:#6ee7b7;font-size:1rem;"></i>
                        </div>
                        <div>
                            <div style="color:#6ee7b7;font-weight:700;font-size:0.9rem;">Entrée en Stock</div>
                            <div style="color:#6b7280;font-size:0.72rem;">${this.esc(article.designation)} · Stock actuel: <strong style="color:#34d399;">${stock} ${this.esc(article.unit||'U')}</strong></div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
                            <button onclick="GdsScannerModule._adjQty(-1)" style="width:44px;height:44px;border-radius:10px;border:2px solid #334155;background:#0f172a;color:#fff;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>
                            <input id="gdsEntreeQty" type="number" min="1" value="1" style="flex:1;padding:12px;border-radius:10px;border:2px solid #10b981;background:#0f172a;color:#fff;font-size:1.3rem;font-weight:800;text-align:center;outline:none;">
                            <button onclick="GdsScannerModule._adjQty(1)" style="width:44px;height:44px;border-radius:10px;border:2px solid #334155;background:#0f172a;color:#fff;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">+</button>
                        </div>
                        <input id="gdsEntreeRef" type="text" placeholder="Fournisseur / BL / Référence (optionnel)"
                            style="width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.88rem;outline:none;box-sizing:border-box;margin-bottom:12px;">
                        <div id="gdsEntreeErrBox" style="display:none;background:#7f1d1d;border:1px solid #ef4444;border-radius:10px;padding:12px;color:#fca5a5;font-size:0.85rem;margin-bottom:12px;"></div>
                        <button id="gdsEntreeValBtn" onclick="GdsScannerModule.confirmEntree()"
                            style="width:100%;padding:16px;border-radius:12px;background:#10b981;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
                            <i class="fas fa-check-circle"></i> Valider l'Entrée
                        </button>
                        <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)"
                            style="width:100%;padding:11px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                            ← Retour
                        </button>
                    </div>
                </div>`;
            setTimeout(() => { const el = document.getElementById('gdsEntreeQty'); if (el) { el.focus(); el.select(); } }, 100);
        },

        async confirmEntree() {
            const article = this.currentArticle;
            if (!article) { alert('Aucun article sélectionné.'); return; }

            this._hideErr('gdsEntreeErrBox');

            const qty = parseInt((document.getElementById('gdsEntreeQty')||{}).value,10)||1;
            const ref = (document.getElementById('gdsEntreeRef')||{}).value.trim();
            const user = this.getUser();
            const authorName = user ? (user.name||user.username||'GDS') : 'GDS';
            const now = new Date();

            // Resolve the best identifier: prefer _id, fallback to barcode/code
            let artId = String(article._id || '');
            if (!artId || !/^[a-f0-9]{24}$/i.test(artId)) {
                artId = article.barcode || article.code || article.id || '';
            }
            if (!artId) {
                this._showErr('gdsEntreeErrBox', 'Article sans identifiant — rechargez la page.');
                return;
            }

            const valBtn = document.getElementById('gdsEntreeValBtn');
            if (valBtn) { valBtn.disabled = true; valBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...'; }

            let apiOk = false;
            let apiErr = '';
            try {
                const r = await fetch('/api/articles/' + artId + '/stock', {
                    method: 'POST',
                    headers: this.hdrs(),
                    body: JSON.stringify({ type:'Entrée', quantity: qty, reason: ref||'Entrée GDS scanner', user: authorName })
                });
                const data = await r.json();
                if (r.ok) {
                    apiOk = true;
                    article.quantity = (data.article && typeof data.article.quantity !== 'undefined')
                        ? data.article.quantity
                        : (Number(article.quantity)||0) + qty;
                } else {
                    apiErr = data.error || ('Serveur ' + r.status);
                }
            } catch(e) { apiErr = 'Réseau: ' + e.message; }

            if (!apiOk) {
                if (valBtn) { valBtn.disabled = false; valBtn.innerHTML = '<i class="fas fa-check-circle"></i> Valider l\'Entrée'; }
                this._showErr('gdsEntreeErrBox', 'Échec mise à jour stock — ' + apiErr);
                return;
            }

            // Local movement log
            if (typeof DB !== 'undefined') {
                const mov = { articleId: artId, articleCode: article.code||'', designation: article.designation||'', type:'Entrée', quantity: qty, date: now.toISOString(), author: authorName, user: authorName, motif: ref||'Entrée GDS scanner', destination:'Stock', source: ref||'Scan GDS' };
                if (typeof DB.addStockMovement === 'function') DB.addStockMovement(mov);
                else if (DB.data && Array.isArray(DB.data.stockMovements)) DB.data.stockMovements.push(mov);
                if (typeof DB.save === 'function') DB.save();
            }

            this.playBeep('entry'); this.haptic([60,30,60]);
            this.sessionCount++;
            this.updateCounter();

            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.subtitle('Entrée enregistrée ✓');
            area.innerHTML = `
                <div style="background:#042f2e;border:2px solid #0d9488;border-radius:16px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                        <div style="width:48px;height:48px;border-radius:50%;background:#0d9488;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-check" style="color:#fff;font-size:1.3rem;"></i>
                        </div>
                        <div>
                            <div style="color:#2dd4bf;font-weight:800;font-size:1.1rem;">Entrée Enregistrée !</div>
                            <div style="color:#99f6e4;font-size:0.74rem;">Mis à jour dans MongoDB</div>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:#5eead4;font-size:0.82rem;">Article</span><span style="font-weight:600;color:#fff;font-size:0.82rem;">${this.esc(article.designation)}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:#5eead4;font-size:0.82rem;">Quantité ajoutée</span><span style="font-weight:800;color:#34d399;font-size:1rem;">+${qty} ${this.esc(article.unit||'U')}</span></div>
                        <div style="display:flex;justify-content:space-between;border-top:1px solid #134e3a;padding-top:8px;margin-top:4px;"><span style="color:#5eead4;font-size:0.82rem;">Nouveau stock</span><span style="font-weight:900;color:#fff;font-size:1.3rem;">${article.quantity} ${this.esc(article.unit||'U')}</span></div>
                    </div>
                    <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();"
                        style="width:100%;padding:14px;border-radius:12px;background:#0d9488;color:#fff;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-barcode"></i> <span>Scanner suivant <span id="gdsAutoTimer">(3)</span></span>
                    </button>
                </div>`;
            let countdown = 3;
            const timer = setInterval(() => {
                countdown--;
                const lbl = document.getElementById('gdsAutoTimer');
                if (lbl) lbl.textContent = '(' + countdown + ')';
                if (countdown <= 0) {
                    clearInterval(timer);
                    this.clearResult();
                    const inp = document.getElementById('gdsManualBarcodeInput');
                    if (inp) inp.focus();
                }
            }, 1000);
        },

        // ─── UNKNOWN ARTICLE ───────────────────────────────────────────────
        renderUnknownResult(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.pendingCode = scannedCode;
            const safe = this.esc(scannedCode);
            this.subtitle('Code non reconnu');
            area.innerHTML = `
                <div style="background:#1e1a0f;border:1.5px solid #b45309;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:#92400e;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-question" style="color:#fcd34d;font-size:1rem;"></i>
                        </div>
                        <div>
                            <div style="color:#fbbf24;font-weight:700;font-size:0.95rem;">Article non trouvé</div>
                            <div style="font-family:monospace;font-size:0.78rem;color:#d97706;background:#451a03;padding:2px 8px;border-radius:4px;margin-top:3px;display:inline-block;">${safe}</div>
                        </div>
                    </div>
                    <div style="font-size:0.8rem;color:#d97706;margin-bottom:14px;">Ce code-barres n'est associé à aucun article dans le catalogue.</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                        <button onclick="GdsScannerModule.showLinkArticleModal(GdsScannerModule.pendingCode)" style="padding:13px 8px;border-radius:11px;border:1.5px solid #b45309;background:transparent;color:#fbbf24;cursor:pointer;font-weight:700;font-size:0.82rem;display:flex;flex-direction:column;align-items:center;gap:5px;">
                            <i class="fas fa-link" style="font-size:1.1rem;"></i> Associer à existant
                        </button>
                        <button onclick="GdsScannerModule.showCreateArticleModal(GdsScannerModule.pendingCode)" style="padding:13px 8px;border-radius:11px;border:1.5px solid #15803d;background:transparent;color:#34d399;cursor:pointer;font-weight:700;font-size:0.82rem;display:flex;flex-direction:column;align-items:center;gap:5px;">
                            <i class="fas fa-plus-circle" style="font-size:1.1rem;"></i> Créer article
                        </button>
                    </div>
                    <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        <i class="fas fa-redo" style="margin-right:4px;"></i>Réessayer
                    </button>
                </div>`;
        },

        // ─── LINK TO EXISTING — inline in scanner ──────────────────────────
        showLinkArticleModal(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            // Always use raw code — store on module so button onclick can access it safely
            this.pendingCode = scannedCode;
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data ? DB.data.articles||[] : []);
            const safe = this.esc(scannedCode);
            const opts = articles.map(a => {
                const id = String(a._id || a.id || '');
                return `<option value="${id}">${this.esc(a.code||'')} — ${this.esc(a.designation||'')} (stock: ${a.quantity||0} ${a.unit||'U'})</option>`;
            }).join('');
            this.subtitle('Associer à un article');
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#1e3a5f;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-link" style="color:#60a5fa;font-size:14px;"></i>
                        </div>
                        <div>
                            <div style="color:#fff;font-weight:700;font-size:0.9rem;">Associer à un article existant</div>
                            <div style="font-family:monospace;font-size:0.72rem;color:#64748b;">${safe}</div>
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">Choisir l'article</label>
                        <select id="gdsSelectLinkArticle"
                            style="width:100%;padding:12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;box-sizing:border-box;">
                            <option value="">— Sélectionner —</option>
                            ${opts}
                        </select>
                    </div>
                    <button onclick="GdsScannerModule.commitLinkArticle(GdsScannerModule.pendingCode)"
                        style="width:100%;padding:14px;border-radius:12px;background:#2563eb;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
                        <i class="fas fa-link"></i> Associer ce code-barres
                    </button>
                    <button onclick="GdsScannerModule.renderUnknownResult(GdsScannerModule.pendingCode)"
                        style="width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        ← Retour
                    </button>
                </div>`;
        },

        async commitLinkArticle(scannedCode) {
            const sel = document.getElementById('gdsSelectLinkArticle');
            if (!sel || !sel.value) {
                if (sel) sel.style.borderColor = '#ef4444';
                return;
            }
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data ? DB.data.articles||[] : []);
            const article = articles.find(a => String(a._id || a.id || '') === sel.value);
            if (!article) {
                if (typeof Utils !== 'undefined' && Utils.showNotification) Utils.showNotification('Article introuvable', 'error');
                return;
            }
            const artId = String(article._id || article.id || '');
            const area = document.getElementById('gdsScanResultArea');
            // Show saving spinner
            const saveBtn = area ? area.querySelector('button[onclick*="commitLinkArticle"]') : null;
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Sauvegarde...'; }
            try {
                if (artId) {
                    const r = await fetch('/api/articles/' + artId, {
                        method: 'PUT',
                        headers: this.hdrs(),
                        body: JSON.stringify({ barcode: scannedCode })
                    });
                    if (!r.ok) {
                        const err = await r.json().catch(() => ({ error: 'Erreur serveur' }));
                        if (area) area.insertAdjacentHTML('beforeend', `<div style="color:#ef4444;padding:8px;text-align:center;">${err.error || 'Erreur sauvegarde'}</div>`);
                        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✅ Associer'; }
                        return;
                    }
                }
                // Update local DB
                article.barcode = scannedCode;
                if (typeof DB !== 'undefined' && DB.save) DB.save();
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification(`✅ Code-barres associé à "${article.designation}" !`, 'success');
                }
                // Reset cooldown — article is now known, go straight to action picker
                this.scanCooldown = false;
                this.lastScannedCode = '';
                this.lastScanTime = 0;
                this.currentArticle = article;
                this.renderActionPicker(article);
            } catch (e) {
                if (area) area.insertAdjacentHTML('beforeend', `<div style="color:#ef4444;padding:8px;text-align:center;">Erreur réseau: ${e.message}</div>`);
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✅ Associer'; }
            }
        },

        // ─── CREATE NEW ARTICLE — inline in scanner, no popup modal ──────
        showCreateArticleModal(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.pendingCode = scannedCode;
            const safe = this.esc(scannedCode);
            this.subtitle('Nouvel article');
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#166534;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-plus" style="color:#86efac;font-size:14px;"></i>
                        </div>
                        <div>
                            <div style="color:#fff;font-weight:700;font-size:0.9rem;">Créer un nouvel article</div>
                            <div style="font-family:monospace;font-size:0.72rem;color:#64748b;margin-top:1px;">${safe}</div>
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Désignation <span style="color:#ef4444;">*</span></label>
                        <input id="gdsNewDesig" type="text" placeholder="Nom de l'article..." autocomplete="off"
                            style="width:100%;padding:12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;"
                            oninput="this.style.borderColor='#2563eb'">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Code article</label>
                            <input id="gdsNewCode" type="text" placeholder="ART-001" autocomplete="off"
                                style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Qté initiale</label>
                            <input id="gdsNewQty" type="number" value="0" min="0"
                                style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;text-align:center;outline:none;box-sizing:border-box;">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                        <div>
                            <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Unité</label>
                            <input id="gdsNewUnit" type="text" value="U" placeholder="U, Kg, L..."
                                style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Catégorie</label>
                            <input id="gdsNewCat" type="text" placeholder="Général"
                                style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;box-sizing:border-box;">
                        </div>
                    </div>
                    <button id="gdsCreateArticleBtn" onclick="GdsScannerModule.commitCreateArticle(GdsScannerModule.pendingCode)"
                        style="width:100%;padding:14px;border-radius:12px;background:#16a34a;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
                        <i class="fas fa-save"></i> Créer et continuer
                    </button>
                    <button onclick="GdsScannerModule.renderUnknownResult(GdsScannerModule.pendingCode)"
                        style="width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        ← Retour
                    </button>
                </div>`;
            setTimeout(() => { const el = document.getElementById('gdsNewDesig'); if (el) el.focus(); }, 100);
        },

        async commitCreateArticle(scannedCode) {
            const desig = (document.getElementById('gdsNewDesig')||{}).value||'';
            if (!desig.trim()) {
                const el = document.getElementById('gdsNewDesig');
                if (el) { el.style.borderColor = '#ef4444'; el.focus(); }
                return;
            }
            const code = (document.getElementById('gdsNewCode')||{}).value.trim() || ('ART-GDS-'+Date.now().toString().slice(-6));
            const qty = parseInt((document.getElementById('gdsNewQty')||{}).value,10)||0;
            const unit = (document.getElementById('gdsNewUnit')||{}).value.trim()||'U';
            const cat = (document.getElementById('gdsNewCat')||{}).value.trim()||'Général';

            // Disable create button to prevent double-submit
            const btn = document.getElementById('gdsCreateArticleBtn');
            if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement...'; }

            // Use raw pendingCode as barcode — never the HTML-escaped version
            const rawBarcode = this.pendingCode || scannedCode;

            // POST to server FIRST — no client id — MongoDB generates _id
            const payload = { code, designation: desig.trim(), quantity: qty, unit, category: cat, barcode: rawBarcode, site: 'Dépôt Central', minThreshold: 5 };
            let savedArticle = null;
            let serverErr = null;
            try {
                const r = await fetch('/api/articles', { method:'POST', headers: this.hdrs(), body: JSON.stringify(payload) });
                const data = await r.json();
                if (r.ok) { savedArticle = data.article || data; }
                else { serverErr = data.error || ('Erreur ' + r.status); }
            } catch(e) { serverErr = 'Réseau indisponible'; }

            if (serverErr) {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Créer et continuer'; }
                const area = document.getElementById('gdsScanResultArea');
                if (area) {
                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = 'color:#fca5a5;background:#7f1d1d;padding:10px 14px;border-radius:8px;font-size:0.85rem;margin-top:8px;';
                    errDiv.textContent = '❌ ' + serverErr;
                    area.querySelector('div') && area.querySelector('div').appendChild(errDiv);
                }
                return;
            }

            // Push to local DB with real server data
            if (typeof DB !== 'undefined' && savedArticle) {
                if (typeof DB.addArticle === 'function') DB.addArticle(savedArticle);
                else if (DB.data && Array.isArray(DB.data.articles)) {
                    DB.data.articles.push(savedArticle);
                    if (typeof DB.save === 'function') DB.save();
                }
            }

            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(`✅ "${savedArticle.designation}" créé dans le catalogue !`, 'success');
            }

            // Show action picker directly — scanner stays open
            this.currentArticle = savedArticle;
            this.renderActionPicker(savedArticle);
        }
    };

    // Auto-init
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GdsScannerModule.init());
    } else if (typeof document !== 'undefined') {
        GdsScannerModule.init();
    }

    window.GdsScannerModule = GdsScannerModule;
    window.GdsScanner = GdsScannerModule;

})(window);
