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
            const stock = Number(article.quantity) || 0;
            const isLow = stock <= (Number(article.minThreshold) || 5);
            this.subtitle(this.esc(article.designation));
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:14px;overflow:hidden;margin-bottom:12px;">
                    <div style="padding:14px 16px;border-bottom:1px solid #334155;">
                        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                            <div>
                                <span style="font-size:0.72rem;background:#334155;color:#94a3b8;padding:2px 8px;border-radius:4px;font-family:monospace;">${this.esc(article.code||'ART')}</span>
                                <div style="font-size:1rem;font-weight:700;color:#fff;margin-top:6px;line-height:1.3;">${this.esc(article.designation)}</div>
                                <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${this.esc(article.category||'Général')}</div>
                            </div>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:1.5rem;font-weight:800;color:${isLow?'#f59e0b':'#10b981'};">${stock}</div>
                                <div style="font-size:0.72rem;color:#64748b;">${this.esc(article.unit||'U')} en stock</div>
                                ${isLow?'<span style="font-size:0.68rem;background:#78350f;color:#fbbf24;padding:2px 6px;border-radius:4px;">STOCK BAS</span>':''}
                            </div>
                        </div>
                    </div>
                    <div style="padding:14px 16px;">
                        <div style="font-size:0.78rem;color:#64748b;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Quelle opération ?</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <button class="gds-action-btn" onclick="GdsScannerModule.startSortie()" style="border-color:#ef4444;color:#ef4444;padding:18px 10px;border-radius:12px;">
                                <i class="fas fa-arrow-right" style="font-size:1.2rem;"></i>
                                <div><div style="font-size:0.9rem;font-weight:700;">Bon de Sortie</div><div style="font-size:0.68rem;opacity:0.7;">Déduire + BSM</div></div>
                            </button>
                            <button class="gds-action-btn" onclick="GdsScannerModule.startEntree()" style="border-color:#10b981;color:#10b981;padding:18px 10px;border-radius:12px;">
                                <i class="fas fa-arrow-left" style="font-size:1.2rem;"></i>
                                <div><div style="font-size:0.9rem;font-weight:700;">Entrée Stock</div><div style="font-size:0.68rem;opacity:0.7;">Ajouter</div></div>
                            </button>
                        </div>
                        <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
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
                <div style="background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#7f1d1d;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-arrow-right" style="color:#fca5a5;font-size:14px;"></i>
                        </div>
                        <div>
                            <div style="color:#fff;font-weight:700;font-size:0.9rem;">Bon de Sortie (BSM)</div>
                            <div style="color:#64748b;font-size:0.74rem;">${this.esc(article.designation)} — Stock actuel: ${stock} ${this.esc(article.unit||'U')}</div>
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Destinataire / Bénéficiaire *</label>
                        <input id="gdsBeneficiary" type="text" placeholder="Nom du destinataire..." list="gdsBenefList" style="width:100%;padding:11px 12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;" oninput="this.style.borderColor='#2563eb'">
                        <datalist id="gdsBenefList">${depts.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Service / Département</label>
                        <input id="gdsServiceField" type="text" placeholder="Service, département..." list="gdsServiceList" style="width:100%;padding:11px 12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.9rem;outline:none;">
                        <datalist id="gdsServiceList">${depts.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Quantité à sortir</label>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button onclick="GdsScannerModule._adjQty(-1)" style="width:40px;height:40px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
                            <input id="gdsSortieQty" type="number" min="1" value="1" style="flex:1;padding:9px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.1rem;font-weight:700;text-align:center;outline:none;">
                            <button onclick="GdsScannerModule._adjQty(1)" style="width:40px;height:40px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Motif / Notes (optionnel)</label>
                        <input id="gdsSortieMotif" type="text" placeholder="Motif de sortie..." style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.88rem;outline:none;">
                    </div>
                    <button onclick="GdsScannerModule.confirmSortie()" style="width:100%;padding:14px;border-radius:12px;background:#ef4444;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-check-circle"></i> Valider le Bon de Sortie
                    </button>
                    <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        ← Retour
                    </button>
                </div>`;
            document.getElementById('gdsBeneficiary').focus();
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

        async confirmSortie() {
            const article = this.currentArticle;
            if (!article) return;
            const beneficiary = (document.getElementById('gdsBeneficiary')||{}).value.trim();
            const service = (document.getElementById('gdsServiceField')||{}).value.trim();
            const qty = parseInt((document.getElementById('gdsSortieQty')||{}).value,10)||1;
            const motif = (document.getElementById('gdsSortieMotif')||{}).value.trim();
            if (!beneficiary) {
                document.getElementById('gdsBeneficiary').style.borderColor = '#ef4444';
                document.getElementById('gdsBeneficiary').focus();
                return;
            }
            const stock = Number(article.quantity)||0;
            if (stock < qty) {
                const ok = confirm(`Stock actuel (${stock}) < quantité demandée (${qty}). Autoriser stock négatif ?`);
                if (!ok) return;
            }

            const user = this.getUser();
            const authorName = user ? (user.name || user.username || 'GDS') : 'GDS';
            const now = new Date();
            const refNum = 'BSM-GDS-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getTime()).slice(-5);

            // 1. Deduct article locally
            article.quantity = stock - qty;
            if (typeof DB !== 'undefined') {
                const mov = { articleId: article.id||article._id, articleCode: article.code||'', designation: article.designation||'', type:'Sortie', quantity: qty, date: now.toISOString(), author: authorName, user: authorName, motif: motif||('Bon de Sortie GDS — '+beneficiary), destination: beneficiary, source:'Scanner GDS' };
                if (typeof DB.addStockMovement === 'function') DB.addStockMovement(mov);
                else if (DB.data && Array.isArray(DB.data.stockMovements)) DB.data.stockMovements.push(mov);
                if (typeof DB.save === 'function') DB.save();
            }

            // 2. Create BSM via API
            const bsmPayload = {
                ref: refNum, type: 'BSM', status: 'served',
                beneficiary, department: service || '',
                items: [{ articleId: article._id||article.id||'', articleCode: article.code||'', designation: article.designation||'', quantity: qty, unit: article.unit||'U' }],
                notes: motif || 'Sortie par scan GDS mobile',
                createdBy: authorName, servedBy: authorName, servedAt: now.toISOString()
            };
            let bsmCreated = false;
            try {
                const r = await fetch('/api/decharges', { method:'POST', headers: this.hdrs(), body: JSON.stringify(bsmPayload) });
                if (r.ok) {
                    bsmCreated = true;
                    // Add to local DB too
                    if (typeof DB !== 'undefined' && DB.data) {
                        if (!Array.isArray(DB.data.decharges)) DB.data.decharges = [];
                        const d = await r.json();
                        DB.data.decharges.unshift(d.decharge || bsmPayload);
                    }
                }
            } catch(e) {}

            // 3. Sync article to server
            const artId = article._id || article.id;
            if (artId) {
                fetch('/api/articles/' + artId + '/stock', { method:'POST', headers: this.hdrs(), body: JSON.stringify({ type:'Sortie', quantity: qty, reason: motif||'Sortie GDS scanner', reference: refNum, user: authorName }) }).catch(()=>{});
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
                        <i class="fas fa-barcode"></i> Scanner suivant
                    </button>
                </div>`;
        },

        // ─── ENTRÉE FLOW ───────────────────────────────────────────────────
        startEntree() {
            const article = this.currentArticle;
            if (!article) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const stock = Number(article.quantity)||0;
            area.innerHTML = `
                <div style="background:#1e293b;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#064e3b;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-arrow-left" style="color:#6ee7b7;font-size:14px;"></i>
                        </div>
                        <div>
                            <div style="color:#fff;font-weight:700;font-size:0.9rem;">Entrée en Stock</div>
                            <div style="color:#64748b;font-size:0.74rem;">${this.esc(article.designation)} — Stock actuel: ${stock} ${this.esc(article.unit||'U')}</div>
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Quantité à ajouter</label>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button onclick="GdsScannerModule._adjQty(-1)" style="width:40px;height:40px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
                            <input id="gdsEntreeQty" type="number" min="1" value="1" style="flex:1;padding:9px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.1rem;font-weight:700;text-align:center;outline:none;">
                            <button onclick="GdsScannerModule._adjQty(1)" style="width:40px;height:40px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:0.74rem;font-weight:600;color:#94a3b8;margin-bottom:5px;text-transform:uppercase;">Fournisseur / Référence (optionnel)</label>
                        <input id="gdsEntreeRef" type="text" placeholder="Fournisseur, BL, référence..." style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid #334155;background:#0f172a;color:#fff;font-size:0.88rem;outline:none;">
                    </div>
                    <button onclick="GdsScannerModule.confirmEntree()" style="width:100%;padding:14px;border-radius:12px;background:#10b981;color:#fff;border:none;font-weight:800;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-check-circle"></i> Valider l'Entrée
                    </button>
                    <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        ← Retour
                    </button>
                </div>`;
        },

        async confirmEntree() {
            const article = this.currentArticle;
            if (!article) return;
            const qty = parseInt((document.getElementById('gdsEntreeQty')||{}).value,10)||1;
            const ref = (document.getElementById('gdsEntreeRef')||{}).value.trim();
            const user = this.getUser();
            const authorName = user ? (user.name||user.username||'GDS') : 'GDS';
            const now = new Date();

            article.quantity = (Number(article.quantity)||0) + qty;
            if (typeof DB !== 'undefined') {
                const mov = { articleId: article.id||article._id, articleCode: article.code||'', designation: article.designation||'', type:'Entrée', quantity: qty, date: now.toISOString(), author: authorName, user: authorName, motif: ref||'Entrée stock GDS scanner', destination:'Stock', source: ref||'Scan GDS' };
                if (typeof DB.addStockMovement === 'function') DB.addStockMovement(mov);
                else if (DB.data && Array.isArray(DB.data.stockMovements)) DB.data.stockMovements.push(mov);
                if (typeof DB.save === 'function') DB.save();
            }
            const artId = article._id || article.id;
            if (artId) {
                fetch('/api/articles/' + artId + '/stock', { method:'POST', headers: this.hdrs(), body: JSON.stringify({ type:'Entrée', quantity: qty, reason: ref||'Entrée GDS scanner', user: authorName }) }).catch(()=>{});
            }

            this.playBeep('entry'); this.haptic([60,30,60]);
            this.sessionCount++;
            this.updateCounter();
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.subtitle('Entrée enregistrée ✓');
            area.innerHTML = `
                <div style="background:#042f2e;border:1.5px solid #0d9488;border-radius:14px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:#0d9488;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-arrow-left" style="color:#fff;font-size:1rem;"></i>
                        </div>
                        <div>
                            <div style="color:#2dd4bf;font-weight:800;font-size:1rem;">Entrée Enregistrée !</div>
                            <div style="color:#99f6e4;font-size:0.74rem;">+${qty} ${this.esc(article.unit||'U')} ajouté(s)</div>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:12px;font-size:0.85rem;color:#ccfbf1;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#5eead4;">Article</span><span style="font-weight:600;">${this.esc(article.designation)}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#5eead4;">Entrée</span><span style="font-weight:700;color:#34d399;">+${qty} ${this.esc(article.unit||'U')}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span style="color:#5eead4;">Nouveau stock</span><span style="font-weight:700;font-size:1.1rem;">${article.quantity} ${this.esc(article.unit||'U')}</span></div>
                    </div>
                    <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;padding:13px;border-radius:11px;background:#0d9488;color:#fff;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-barcode"></i> Scanner suivant
                    </button>
                </div>`;
        },

        // ─── UNKNOWN ARTICLE ───────────────────────────────────────────────
        renderUnknownResult(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
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
                        <button onclick="GdsScannerModule.showLinkArticleModal('${safe}')" style="padding:13px 8px;border-radius:11px;border:1.5px solid #b45309;background:transparent;color:#fbbf24;cursor:pointer;font-weight:700;font-size:0.82rem;display:flex;flex-direction:column;align-items:center;gap:5px;">
                            <i class="fas fa-link" style="font-size:1.1rem;"></i> Associer à existant
                        </button>
                        <button onclick="GdsScannerModule.showCreateArticleModal('${safe}')" style="padding:13px 8px;border-radius:11px;border:1.5px solid #15803d;background:transparent;color:#34d399;cursor:pointer;font-weight:700;font-size:0.82rem;display:flex;flex-direction:column;align-items:center;gap:5px;">
                            <i class="fas fa-plus-circle" style="font-size:1.1rem;"></i> Créer article
                        </button>
                    </div>
                    <button onclick="GdsScannerModule.clearResult();document.getElementById('gdsManualBarcodeInput').focus();" style="width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:transparent;color:#64748b;cursor:pointer;font-size:0.82rem;">
                        <i class="fas fa-redo" style="margin-right:4px;"></i>Réessayer
                    </button>
                </div>`;
        },

        // ─── LINK TO EXISTING ──────────────────────────────────────────────
        showLinkArticleModal(scannedCode) {
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data ? DB.data.articles||[] : []);
            const opts = articles.map(a => `<option value="${this.esc(a.id||a._id)}">${this.esc(a.code)} — ${this.esc(a.designation)} (${a.quantity} ${a.unit||'U'})</option>`).join('');
            const html = `<div class="p-2"><p class="small text-muted mb-3">Associer définitivement le code <strong>${this.esc(scannedCode)}</strong> à un article :</p>
                <div class="mb-3"><label class="form-label fw-bold small">Sélectionner l'article :</label>
                <select id="gdsSelectLinkArticle" class="form-select">${opts}</select></div>
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="if(window.UI&&UI.closeModal)UI.closeModal();">Annuler</button>
                    <button class="btn btn-primary btn-sm fw-bold" onclick="GdsScannerModule.commitLinkArticle('${this.esc(scannedCode)}')"><i class="fas fa-save me-1"></i>Associer</button>
                </div></div>`;
            if (typeof UI !== 'undefined' && UI.showModal) UI.showModal('Associer Code-Barres', html);
        },

        commitLinkArticle(scannedCode) {
            const sel = document.getElementById('gdsSelectLinkArticle');
            if (!sel || !sel.value) return;
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data ? DB.data.articles||[] : []);
            const article = articles.find(a => (a.id||a._id) === sel.value);
            if (article) {
                article.barcode = scannedCode;
                if (typeof DB !== 'undefined' && DB.save) DB.save();
                fetch('/api/articles/' + (article._id||article.id), { method:'PUT', headers: this.hdrs(), body: JSON.stringify({ barcode: scannedCode }) }).catch(()=>{});
                if (typeof UI !== 'undefined' && UI.closeModal) UI.closeModal();
                if (typeof Utils !== 'undefined' && Utils.showNotification) Utils.showNotification(`Code-barres associé à "${article.designation}" !`, 'success');
                this.handleCode(scannedCode);
            }
        },

        // ─── CREATE NEW ARTICLE ────────────────────────────────────────────
        showCreateArticleModal(scannedCode) {
            const html = `<div class="p-2">
                <p class="small text-muted mb-3">Créer un article avec le code <strong>${this.esc(scannedCode)}</strong> pré-associé.</p>
                <div class="mb-2"><label class="form-label small fw-bold">Désignation <span class="text-danger">*</span></label>
                    <input type="text" id="gdsNewDesig" class="form-control" placeholder="Nom de l'article..."></div>
                <div class="row g-2 mb-2">
                    <div class="col-6"><label class="form-label small fw-bold">Code article</label>
                        <input type="text" id="gdsNewCode" class="form-control" placeholder="ART-001"></div>
                    <div class="col-6"><label class="form-label small fw-bold">Quantité initiale</label>
                        <input type="number" id="gdsNewQty" class="form-control" value="0" min="0"></div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6"><label class="form-label small fw-bold">Unité</label>
                        <input type="text" id="gdsNewUnit" class="form-control" value="U" placeholder="U, Kg..."></div>
                    <div class="col-6"><label class="form-label small fw-bold">Catégorie</label>
                        <input type="text" id="gdsNewCat" class="form-control" placeholder="Général"></div>
                </div>
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="if(window.UI&&UI.closeModal)UI.closeModal();">Annuler</button>
                    <button class="btn btn-success btn-sm fw-bold" onclick="GdsScannerModule.commitCreateArticle('${this.esc(scannedCode)}')"><i class="fas fa-save me-1"></i>Créer</button>
                </div></div>`;
            if (typeof UI !== 'undefined' && UI.showModal) UI.showModal('Nouvel Article', html);
        },

        async commitCreateArticle(scannedCode) {
            const desig = (document.getElementById('gdsNewDesig')||{}).value||'';
            if (!desig.trim()) { alert('La désignation est obligatoire.'); return; }
            const code = (document.getElementById('gdsNewCode')||{}).value.trim() || ('ART-'+Date.now().toString().slice(-5));
            const qty = parseInt((document.getElementById('gdsNewQty')||{}).value,10)||0;
            const unit = (document.getElementById('gdsNewUnit')||{}).value.trim()||'U';
            const cat = (document.getElementById('gdsNewCat')||{}).value.trim()||'Général';
            const newArt = { id:'art-'+Date.now(), code, designation:desig.trim(), quantity:qty, unit, category:cat, barcode:scannedCode, site:'Dépôt Central', minThreshold:5, createdAt:new Date().toISOString() };
            if (typeof DB !== 'undefined') {
                if (typeof DB.addArticle === 'function') DB.addArticle(newArt);
                else if (DB.data && Array.isArray(DB.data.articles)) { DB.data.articles.push(newArt); if (typeof DB.save === 'function') DB.save(); }
            }
            try { await fetch('/api/articles', { method:'POST', headers: this.hdrs(), body: JSON.stringify(newArt) }); } catch(e){}
            if (typeof UI !== 'undefined' && UI.closeModal) UI.closeModal();
            if (typeof Utils !== 'undefined' && Utils.showNotification) Utils.showNotification(`Article "${newArt.designation}" créé !`, 'success');
            setTimeout(() => { this.handleCode(scannedCode); }, 300);
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
