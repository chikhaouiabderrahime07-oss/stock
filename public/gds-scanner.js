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
        _nativeStream: null,
        _nativeVideo: null,
        _detectTimer: null,
        _detectBusy: false,
        _audioCtx: null,
        facingMode: 'environment',
        scanMode: 'ask',
        isScanning: false,
        torchOn: false,
        currentArticle: null,
        pendingCode: '',
        scanCooldown: false,
        lastScannedCode: null,
        lastScanTime: 0,
        sessionCount: 0,
        _autoTimer: null,

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
                if (!this._audioCtx || this._audioCtx.state === 'closed') {
                    this._audioCtx = new AC();
                }
                const ctx = this._audioCtx;
                if (ctx.state === 'suspended') ctx.resume().catch(() => {});
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                if (type === 'error') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(420, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(210, ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.16, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                    osc.start(); osc.stop(ctx.currentTime + 0.2);
                } else if (type === 'entry') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(680, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(920, ctx.currentTime + 0.12);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                    osc.start(); osc.stop(ctx.currentTime + 0.12);
                } else {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(900, ctx.currentTime);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
                    osc.start(); osc.stop(ctx.currentTime + 0.09);
                }
            } catch(e) {}
        },

        haptic(pattern) {
            try { navigator.vibrate && navigator.vibrate(pattern || 35); } catch(e) {}
        },

        subtitle(txt) {
            const el = document.getElementById('gdsScannerSubtitle');
            if (el) el.textContent = txt;
        },

        updateCounter() {
            const el = document.getElementById('gdsCountLabel');
            if (el) el.textContent = this.sessionCount + ' opération(s) cette session';
        },

        // ─── OPEN / CLOSE & MODE PILLS ─────────────────────────────────────
        init() {
            if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                try {
                    this.barcodeDetector = new window.BarcodeDetector({
                        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e']
                    });
                } catch(e) {}
            }
        },

        setScanMode(mode) {
            this.scanMode = mode || 'ask';
            if (typeof document === 'undefined') return;
            const pills = document.querySelectorAll('.gds-mode-pill');
            pills.forEach(btn => {
                if (btn.getAttribute('data-gds-mode') === this.scanMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            const modeNames = {
                ask: 'Mode Consultation & Choix',
                entree: 'Mode Entrée Rapide (+Stock)',
                sortie: 'Mode Sortie Rapide (BSM)',
                labels: 'Mode Étiquettes QR & Code-Barres'
            };
            if (!this.currentArticle) {
                this.subtitle(modeNames[this.scanMode] || 'Prêt à scanner');
            } else if (this.scanMode === 'entree') {
                this.startEntree();
            } else if (this.scanMode === 'sortie') {
                this.startSortie();
            } else if (this.scanMode === 'labels') {
                this.renderLabelPreview(this.currentArticle);
            } else {
                this.renderActionPicker(this.currentArticle);
            }
        },

        open(defaultMode) {
            return this.openModal(defaultMode);
        },

        close() {
            return this.closeModal();
        },

        openModal(defaultMode) {
            if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
            this.scanCooldown = false;
            this.lastScannedCode = null;
            if (defaultMode && typeof defaultMode === 'string') {
                this.scanMode = defaultMode;
            }
            const modal = document.getElementById('gdsScannerModal');
            if (!modal) return;
            modal.classList.remove('hidden');
            const backdrop = document.getElementById('gdsScannerBackdrop');
            if (backdrop) backdrop.classList.remove('hidden');
            this.clearResult();
            this.showCameraView();
            this.setScanMode(this.scanMode || 'ask');
            this.subtitle('Prêt à scanner');
            const input = document.getElementById('gdsManualBarcodeInput');
            if (input) input.value = '';
            setTimeout(() => this.startCamera(), 60);
        },

        closeModal() {
            if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
            this.scanCooldown = false;
            this.lastScannedCode = null;
            const modal = document.getElementById('gdsScannerModal');
            if (modal) modal.classList.add('hidden');
            const backdrop = document.getElementById('gdsScannerBackdrop');
            if (backdrop) backdrop.classList.add('hidden');
            this.stopCamera();
            this.showCameraView();
            this.clearResult();
            this.currentArticle = null;
        },

        hideCameraView() {
            const wrap = document.getElementById('gdsScannerCameraWrap');
            if (wrap) wrap.style.display = 'none';
            const vf = document.getElementById('gdsViewfinderContainer');
            if (vf) vf.style.display = 'none';
            const manual = document.getElementById('gdsManualInputWrap');
            if (manual) manual.style.display = 'none';
        },

        showCameraView() {
            const wrap = document.getElementById('gdsScannerCameraWrap');
            if (wrap) wrap.style.display = 'flex';
            const vf = document.getElementById('gdsViewfinderContainer');
            if (vf) vf.style.display = 'block';
            const manual = document.getElementById('gdsManualInputWrap');
            if (manual) manual.style.display = 'flex';
            const ph = document.getElementById('gdsCamPlaceholder');
            if (ph && !this.isScanning) ph.style.display = 'flex';
        },

        startScan() {
            this.showCameraView();
            return this.startCamera();
        },

        resetToScan() {
            if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
            this.scanCooldown = false;
            this.lastScannedCode = null;
            this.clearResult();
            this.showCameraView();
            this.subtitle('Prêt à scanner');
            const input = document.getElementById('gdsManualBarcodeInput');
            if (input) input.value = '';
            return this.startCamera();
        },

        // ─── CAMERA (HARDWARE-ACCELERATED BARCODEDETECTOR + FAST FALLBACK) ──
        toggleCamera() {
            if (this.isScanning) { return this.stopCamera(); } else { return this.startCamera(); }
        },

        _setCameraUiState(active) {
            this.isScanning = !!active;
            const btn = document.getElementById('btnToggleGdsCamera');
            const lbl = document.getElementById('lblGdsCamAction');
            const laser = document.getElementById('gdsLaserLine');
            const torchBtn = document.getElementById('btnToggleGdsTorch');
            const switchBtn = document.getElementById('btnSwitchGdsCam');
            const ph = document.getElementById('gdsCamPlaceholder');
            if (active) {
                if (ph) ph.style.display = 'none';
                if (btn) {
                    btn.classList.add('cam-active');
                    btn.style.borderColor = '#10b981';
                    btn.style.color = '#10b981';
                    btn.style.background = 'rgba(16,185,129,0.14)';
                }
                if (lbl) lbl.textContent = 'Arrêter';
                if (laser) laser.style.display = 'block';
                if (torchBtn) torchBtn.style.display = 'flex';
                if (switchBtn) switchBtn.style.display = 'flex';
                this.subtitle('Caméra active — visez le QR ou code-barres');
            } else {
                if (ph) ph.style.display = 'flex';
                if (btn) {
                    btn.classList.remove('cam-active');
                    btn.style.borderColor = '#3b82f6';
                    btn.style.color = '#3b82f6';
                    btn.style.background = 'rgba(59,130,246,0.1)';
                }
                if (lbl) lbl.textContent = 'Activer Caméra';
                if (laser) laser.style.display = 'none';
                if (torchBtn) torchBtn.style.display = 'none';
                if (switchBtn) switchBtn.style.display = 'none';
            }
        },

        async startCamera() {
            const container = document.getElementById('gdsCameraStream');
            if (!container) return;
            this.showCameraView();
            if (this.isScanning || this.html5QrCode || this._nativeStream) {
                try { await this.stopCamera(); } catch(e) {}
            }
            if (!this.barcodeDetector && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                this.init();
            }

            // 1) Hardware-Accelerated Native BarcodeDetector Pipeline (<10ms decode)
            if (this.barcodeDetector && typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: { ideal: this.facingMode || 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        },
                        audio: false
                    });
                    this._nativeStream = stream;
                    container.innerHTML = '';
                    const video = document.createElement('video');
                    video.id = 'gdsNativeVideo';
                    video.setAttribute('autoplay', '');
                    video.setAttribute('playsinline', '');
                    video.setAttribute('muted', '');
                    video.muted = true;
                    video.srcObject = stream;
                    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                    container.appendChild(video);
                    this._nativeVideo = video;
                    await video.play().catch(() => {});
                    this._setCameraUiState(true);
                    this._detectBusy = false;
                    this._detectTimer = setInterval(async () => {
                        if (!this.isScanning || this._detectBusy || !this._nativeVideo || this._nativeVideo.readyState < 2) return;
                        this._detectBusy = true;
                        try {
                            const codes = await this.barcodeDetector.detect(this._nativeVideo);
                            if (codes && codes.length > 0 && codes[0].rawValue) {
                                this.handleCode(codes[0].rawValue);
                            }
                        } catch(err) {}
                        this._detectBusy = false;
                    }, 100);
                    return;
                } catch(nativeErr) {
                    if (this._nativeStream) {
                        try { this._nativeStream.getTracks().forEach(t => t.stop()); } catch(e) {}
                        this._nativeStream = null;
                    }
                }
            }
            // 2) Fast Lightweight Html5Qrcode Fallback (10 FPS, disableFlip: true)
            if (typeof Html5Qrcode === 'undefined' && typeof window.Html5Qrcode === 'undefined') {
                this.subtitle('Librairie caméra non disponible');
                return;
            }
            const H5 = window.Html5Qrcode || Html5Qrcode;
            try {
                const placeholder = document.getElementById('gdsCamPlaceholder');
                if (placeholder) placeholder.style.display = 'none';
                const scanner = new H5('gdsCameraStream');
                this.html5QrCode = scanner;
                const isMob = (typeof window !== 'undefined' && window.innerWidth <= 768);
                await scanner.start(
                    { facingMode: this.facingMode || 'environment' },
                    {
                        fps: 10,
                        qrbox: isMob ? { width: 245, height: 170 } : { width: 275, height: 195 },
                        aspectRatio: 1.333,
                        disableFlip: true,
                        videoConstraints: {
                            facingMode: { ideal: this.facingMode || 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    },
                    (decodedText) => { this.handleCode(decodedText); },
                    () => {}
                );
                if (this.html5QrCode === scanner) {
                    this._setCameraUiState(true);
                }
            } catch(e) {
                this._setCameraUiState(false);
                this.subtitle('Accès caméra refusé ou indisponible');
            }
        },

        async stopCamera() {
            if (this._detectTimer) {
                clearInterval(this._detectTimer);
                this._detectTimer = null;
            }
            this._detectBusy = false;
            this.torchOn = false;
            this._setCameraUiState(false);

            if (this._nativeStream) {
                try { this._nativeStream.getTracks().forEach(t => t.stop()); } catch(e) {}
                this._nativeStream = null;
            }
            if (this._nativeVideo) {
                try {
                    this._nativeVideo.pause();
                    this._nativeVideo.srcObject = null;
                    this._nativeVideo.remove();
                } catch(e) {}
                this._nativeVideo = null;
            }
            if (this.html5QrCode) {
                const scanner = this.html5QrCode;
                this.html5QrCode = null;
                try {
                    await scanner.stop().catch(() => {});
                    if (typeof scanner.clear === 'function') scanner.clear().catch(() => {});
                } catch(e) {}
            }
        },

        async switchCamera() {
            this.facingMode = (this.facingMode === 'environment') ? 'user' : 'environment';
            this.haptic(25);
            if (this.isScanning) {
                await this.stopCamera();
                await this.startCamera();
            }
        },

        toggleTorch() {
            try {
                if (!this.isScanning) return;
                this.torchOn = !this.torchOn;
                if (this._nativeStream) {
                    const track = this._nativeStream.getVideoTracks()[0];
                    if (track && typeof track.applyConstraints === 'function') {
                        track.applyConstraints({ advanced: [{ torch: this.torchOn }] }).catch(() => {});
                    }
                } else if (this.html5QrCode && typeof this.html5QrCode.applyVideoConstraints === 'function') {
                    this.html5QrCode.applyVideoConstraints({ advanced: [{ torch: this.torchOn }] });
                }
                const btn = document.getElementById('btnToggleGdsTorch');
                if (btn) {
                    btn.style.color = this.torchOn ? '#f59e0b' : '';
                    btn.style.borderColor = this.torchOn ? '#f59e0b' : '';
                    btn.style.background = this.torchOn ? 'rgba(245,158,11,0.18)' : '';
                }
            } catch(e) {}
        },

        triggerImageScan() {
            const inp = document.getElementById('gdsImageScanInput');
            if (inp) {
                inp.value = '';
                inp.click();
            }
        },

        async scanImageFile(inputOrFile) {
            const file = (inputOrFile && inputOrFile.files) ? inputOrFile.files[0] : inputOrFile;
            if (!file) return;
            this.subtitle('Analyse de l\'image...');
            try {
                if (this.barcodeDetector && typeof createImageBitmap === 'function') {
                    const bmp = await createImageBitmap(file);
                    const codes = await this.barcodeDetector.detect(bmp);
                    if (bmp.close) bmp.close();
                    if (codes && codes.length > 0 && codes[0].rawValue) {
                        return this.handleCode(codes[0].rawValue);
                    }
                }
                const H5 = window.Html5Qrcode || (typeof Html5Qrcode !== 'undefined' ? Html5Qrcode : null);
                if (H5) {
                    if (this.isScanning) await this.stopCamera();
                    const tmp = new H5('gdsCameraStream');
                    const decoded = await tmp.scanFile(file, false);
                    try { tmp.clear(); } catch(e) {}
                    if (decoded) return this.handleCode(decoded);
                }
                this.playBeep('error');
                this.subtitle('Aucun code détecté sur l\'image');
            } catch(e) {
                this.playBeep('error');
                this.subtitle('Aucun code détecté sur l\'image');
            }
        },

        // ─── MASTER STOCK SYNC ─────────────────────────────────────────────
        _applyStockUpdate(article, newQuantity) {
            if (!article) return null;
            const updatedQty = Number(newQuantity);
            article.quantity = updatedQty;
            if (this.currentArticle) this.currentArticle.quantity = updatedQty;

            let masterArticle = null;
            if (typeof DB !== 'undefined') {
                if (!DB.data) DB.data = {};
                if (!Array.isArray(DB.data.articles)) DB.data.articles = [];

                const targetId = String(article.id || article._id || '').trim();
                const targetMongoId = String(article._id || '').trim();
                const targetCode = String(article.code || '').trim().toLowerCase();
                const targetBarcode = String(article.barcode || '').trim().toLowerCase();

                masterArticle = DB.data.articles.find(a => {
                    const aId = String(a.id || '').trim();
                    const aMongoId = String(a._id || '').trim();
                    const aCode = String(a.code || '').trim().toLowerCase();
                    const aBarcode = String(a.barcode || '').trim().toLowerCase();

                    if (targetMongoId && aMongoId && aMongoId === targetMongoId) return true;
                    if (targetId && aId && aId === targetId) return true;
                    if (targetBarcode && aBarcode && aBarcode === targetBarcode) return true;
                    if (targetCode && aCode && aCode === targetCode) return true;
                    return false;
                });

                if (masterArticle) {
                    masterArticle.quantity = updatedQty;
                    if (article._id && !masterArticle._id) masterArticle._id = article._id;
                    if (article.barcode && !masterArticle.barcode) masterArticle.barcode = article.barcode;
                    if (!masterArticle.id && masterArticle._id) masterArticle.id = masterArticle._id;
                    if (!article.id && article._id) article.id = article._id;
                } else {
                    masterArticle = { ...article, quantity: updatedQty };
                    if (!masterArticle.id && masterArticle._id) masterArticle.id = masterArticle._id;
                    DB.data.articles.push(masterArticle);
                }

                if (typeof DB.updateArticle === 'function') {
                    try { DB.updateArticle(masterArticle); } catch(e) {}
                }

                if (typeof DB.save === 'function') {
                    try { DB.save(); } catch(e) {}
                }
            }

            try {
                const Evt = (typeof window !== 'undefined' && window.CustomEvent) ? window.CustomEvent : (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
                if (Evt && typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new Evt('stock_updated', {
                        detail: {
                            article: masterArticle || article,
                            articleId: article._id || article.id,
                            code: article.code,
                            quantity: updatedQty
                        }
                    }));
                    window.dispatchEvent(new Evt('stock_changed', {
                        detail: {
                            article: masterArticle || article,
                            id: article._id || article.id,
                            code: article.code,
                            quantity: updatedQty
                        }
                    }));
                }
            } catch(e) {}

            try {
                const appObj = (typeof window !== 'undefined' && window.App) || (typeof App !== 'undefined' ? App : null);
                if (appObj) {
                    if (appObj.currentModule === 'stock' || appObj.currentModule === 'inventory') {
                        if (typeof appObj.loadModule === 'function') {
                            appObj.loadModule(appObj.currentModule, appObj.currentTab, false);
                        }
                    } else if (typeof appObj.refreshCurrentModule === 'function') {
                        appObj.refreshCurrentModule();
                    }
                }
                if (typeof window !== 'undefined') {
                    if (typeof window.renderArticles === 'function') window.renderArticles();
                    if (typeof window.renderInventory === 'function') window.renderInventory();
                }
                if (typeof UI !== 'undefined' && typeof UI.refresh === 'function' && appObj && (appObj.currentModule === 'stock' || appObj.currentModule === 'inventory')) {
                    UI.refresh();
                }
            } catch(e) {}

            return masterArticle || article;
        },

        // ─── FIND ARTICLE ──────────────────────────────────────────────────
        findArticle(code) {
            const q = String(code || '').trim().toLowerCase();
            if (!q) return null;
            if (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.articles)) {
                const live = DB.data.articles.find(a =>
                    (a.barcode && String(a.barcode).trim().toLowerCase() === q) ||
                    (a.code && String(a.code).trim().toLowerCase() === q) ||
                    (a.id && String(a.id).trim().toLowerCase() === q) ||
                    (a._id && String(a._id).trim().toLowerCase() === q)
                );
                if (live) return live;
            }
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
            const copy = articles.find(a =>
                (a.barcode && String(a.barcode).trim().toLowerCase() === q) ||
                (a.code && String(a.code).trim().toLowerCase() === q) ||
                (a.id && String(a.id).trim().toLowerCase() === q) ||
                (a._id && String(a._id).trim().toLowerCase() === q)
            );
            if (copy) {
                if (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.articles)) {
                    const exists = DB.data.articles.find(m => (m.code && m.code.toLowerCase() === (copy.code||'').toLowerCase()) || (m.id && m.id === copy.id));
                    if (!exists) {
                        DB.data.articles.push(copy);
                        return copy;
                    }
                    return exists;
                }
                return copy;
            }
            return null;
        },

        // ─── COOLDOWN & SCAN HANDLER ───────────────────────────────────────
        async handleCode(rawText) {
            if (!rawText) return;
            const text = String(rawText).trim();
            if (!text) return;
            if (this.scanCooldown) return;
            if (this.lastScannedCode === text && (Date.now() - this.lastScanTime) < 1200) return;
            this.scanCooldown = true;
            this.lastScannedCode = text;
            this.lastScanTime = Date.now();
            setTimeout(() => { this.scanCooldown = false; }, 1200);

            // Check preOrders / requisition QR first
            const preOrders = (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.preOrders)) ? DB.data.preOrders : [];
            const tl = text.toLowerCase();
            const order = preOrders.find(p => (p.ref && p.ref.toLowerCase() === tl) || p.id === text);
            if (order) {
                this.playBeep('success'); this.haptic(35);
                this.closeModal();
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.openOrderFulfillment) {
                    if (typeof App !== 'undefined' && App.loadModule) App.loadModule('barcodeScanner');
                    setTimeout(() => BarcodeScanner.openOrderFulfillment(order), 150);
                }
                return;
            }

            // Immediately stop camera and hide viewfinder so UI is clean and full-focus
            this.stopCamera();
            this.hideCameraView();

            let article = this.findArticle(text);
            if (!article) {
                const area = document.getElementById('gdsScanResultArea');
                if (area) {
                    area.innerHTML = `
                        <div class="gds-surface-card" style="padding:20px;text-align:center;">
                            <i class="fas fa-spinner fa-spin fa-2x mb-2" style="color:var(--primary,#2563eb);"></i>
                            <div style="font-weight:700;font-size:0.95rem;color:var(--gds-text,var(--text,#0f172a));">Vérification serveur en cours...</div>
                            <div style="font-size:0.75rem;color:var(--gds-muted,var(--text-muted,#64748b));margin-top:4px;">Recherche de "${this.esc(text)}" dans MongoDB</div>
                        </div>
                    `;
                }
                try {
                    const r = await fetch('/api/articles/' + encodeURIComponent(text), { headers: this.hdrs() });
                    if (r.ok) {
                        const d = await r.json();
                        if (d && d.article) {
                            article = d.article;
                            if (article._id && !article.id) article.id = article._id;
                            if (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.articles)) {
                                const idx = DB.data.articles.findIndex(a => a.id === article.id || (article._id && a._id === article._id) || a.code === article.code || a.barcode === article.barcode);
                                if (idx >= 0) DB.data.articles[idx] = Object.assign({}, DB.data.articles[idx], article);
                                else DB.data.articles.push(article);
                            }
                        }
                    }
                } catch(e) {}
            }

            if (article) {
                this.playBeep('success'); this.haptic(35);
                this.currentArticle = article;
                this.renderActionPicker(article);
                if (this.scanMode === 'entree') {
                    this.startEntree();
                } else if (this.scanMode === 'sortie') {
                    this.startSortie();
                } else if (this.scanMode === 'labels') {
                    this.renderLabelPreview(article);
                }
            } else {
                this.playBeep('error'); this.haptic([120, 40, 120]);
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
            const isZero = stock <= 0;
            const isLow = !isZero && stock <= (Number(article.minThreshold) || 5);
            const stockColor = isZero ? '#ef4444' : (isLow ? '#f59e0b' : '#10b981');
            const stockBg = isZero ? 'rgba(239,68,68,0.12)' : (isLow ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)');
            const stockBorder = isZero ? 'rgba(239,68,68,0.3)' : (isLow ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)');
            const statusLabel = isZero ? 'Rupture de Stock' : (isLow ? 'Stock Bas' : 'En Stock');
            const priceVal = Number(article.unitPrice || article.price || 0);

            this.subtitle(article.designation || 'Article trouvé');
            area.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <!-- ARTICLE HERO CARD -->
                    <div class="gds-surface-card" style="padding:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                            <span style="font-family:monospace;font-size:0.75rem;font-weight:700;background:rgba(37,99,235,0.12);color:var(--primary,#2563eb);border:1px solid rgba(37,99,235,0.28);padding:3px 10px;border-radius:6px;">${this.esc(article.code||'ART')}</span>
                            <span class="gds-chip">${this.esc(article.category||'Général')}</span>
                        </div>
                        <div style="font-size:1.12rem;font-weight:800;color:var(--gds-text,var(--text,#0f172a));line-height:1.35;margin-bottom:10px;">${this.esc(article.designation)}</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                            ${article.zone ? `<span class="gds-chip"><i class="fas fa-map-marker-alt" style="color:var(--primary,#2563eb);margin-right:4px;"></i>${this.esc(article.zone)}</span>` : ''}
                            ${article.barcode ? `<span class="gds-chip"><i class="fas fa-barcode" style="margin-right:4px;"></i>${this.esc(article.barcode)}</span>` : ''}
                            ${priceVal > 0 ? `<span class="gds-chip"><i class="fas fa-tag" style="color:#10b981;margin-right:4px;"></i>${priceVal.toLocaleString('fr-FR')} DA</span>` : ''}
                        </div>
                        <!-- STOCK BADGE & QUICK +1 / -1 TOUCH BAR -->
                        <div style="background:${stockBg};border:1.5px solid ${stockBorder};border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                            <div>
                                <div style="font-size:0.7rem;font-weight:700;color:${stockColor};text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:5px;">
                                    <span style="width:7px;height:7px;border-radius:50%;background:${stockColor};display:inline-block;"></span> ${statusLabel}
                                </div>
                                <div style="font-size:0.72rem;color:var(--gds-muted,var(--text-muted,#64748b));margin-top:2px;">Stock disponible</div>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <button type="button" onclick="GdsScannerModule.quickAdjustStock(-1)" title="Sortie rapide -1" class="gds-quick-step-btn gds-step-minus">−1</button>
                                <div style="text-align:center;min-width:52px;">
                                    <div id="gdsLiveStockVal" style="font-size:1.85rem;font-weight:900;color:${stockColor};line-height:1;">${stock}</div>
                                    <div style="font-size:0.68rem;font-weight:600;color:var(--gds-muted,var(--text-muted,#64748b));margin-top:2px;">${this.esc(article.unit||'U')}</div>
                                </div>
                                <button type="button" onclick="GdsScannerModule.quickAdjustStock(1)" title="Entrée rapide +1" class="gds-quick-step-btn gds-step-plus">+1</button>
                            </div>
                        </div>
                    </div>

                    <!-- ACTION BUTTONS -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <button onclick="GdsScannerModule.startEntree()" style="background:linear-gradient(135deg,#059669,#10b981);border:none;border-radius:16px;color:#fff;padding:16px 12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:800;box-shadow:0 4px 16px rgba(16,185,129,0.3);transition:all 0.15s;">
                            <i class="fas fa-plus-circle" style="font-size:1.45rem;"></i>
                            <span style="font-size:0.92rem;">Entrée Stock</span>
                            <span style="font-size:0.68rem;opacity:0.88;font-weight:500;">Ajouter des unités</span>
                        </button>
                        <button onclick="GdsScannerModule.startSortie()" style="background:linear-gradient(135deg,#e11d48,#f43f5e);border:none;border-radius:16px;color:#fff;padding:16px 12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:800;box-shadow:0 4px 16px rgba(225,29,72,0.3);transition:all 0.15s;">
                            <i class="fas fa-file-invoice" style="font-size:1.45rem;"></i>
                            <span style="font-size:0.92rem;">Bon de Sortie</span>
                            <span style="font-size:0.68rem;opacity:0.88;font-weight:500;">Déduire + Bon BSM</span>
                        </button>
                    </div>

                    <!-- SECONDARY ACTIONS: LABEL & SCAN NEXT -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <button onclick="GdsScannerModule.renderLabelPreview(GdsScannerModule.currentArticle)" class="gds-secondary-btn">
                            <i class="fas fa-qrcode" style="color:#8b5cf6;"></i> Étiquette QR/Code
                        </button>
                        <button onclick="GdsScannerModule.resetToScan()" class="gds-secondary-btn">
                            <i class="fas fa-camera" style="color:var(--primary,#2563eb);"></i> Autre scan
                        </button>
                    </div>
                </div>`;
        },

        async quickAdjustStock(delta) {
            const article = this.currentArticle;
            if (!article || !delta) return;
            const currentQty = Number(article.quantity) || 0;
            if (delta < 0 && currentQty <= 0) {
                this.playBeep('error');
                this.haptic([100, 40, 100]);
                return;
            }
            const newQty = Math.max(0, currentQty + Number(delta));
            const type = delta > 0 ? 'Entrée' : 'Sortie';
            const user = this.getUser();
            const authorName = user ? (user.name || user.username || 'GDS') : 'GDS';
            let artId = String(article._id || '');
            if (!artId || !/^[a-f0-9]{24}$/i.test(artId)) {
                artId = article.barcode || article.code || article.id || '';
            }
            try {
                if (artId) {
                    const r = await fetch('/api/articles/' + encodeURIComponent(artId) + '/stock', {
                        method: 'POST',
                        headers: this.hdrs(),
                        body: JSON.stringify({ type, quantity: Math.abs(delta), reason: 'Ajustement rapide GDS (' + (delta > 0 ? '+' : '') + delta + ')', user: authorName })
                    });
                    if (r.ok) {
                        const d = await r.json().catch(() => ({}));
                        if (d && d.article && typeof d.article.quantity !== 'undefined') {
                            this._applyStockUpdate(article, Number(d.article.quantity));
                        } else {
                            this._applyStockUpdate(article, newQty);
                        }
                    } else {
                        this._applyStockUpdate(article, newQty);
                    }
                } else {
                    this._applyStockUpdate(article, newQty);
                }
            } catch(e) {
                this._applyStockUpdate(article, newQty);
            }
            this.playBeep(delta > 0 ? 'entry' : 'success');
            this.haptic(35);
            this.sessionCount++;
            this.updateCounter();
            this.renderActionPicker(this.currentArticle);
        },

        renderLabelPreview(article) {
            const target = article || this.currentArticle;
            if (!target) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const codeVal = String(target.barcode || target.code || target.id || 'ART-001').trim();
            this.subtitle('Étiquette QR & Code-Barres');
            area.innerHTML = `
                <div class="gds-surface-card" style="padding:16px;text-align:center;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--primary,#2563eb);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Étiquette Article</div>
                    <div style="font-size:1rem;font-weight:800;color:var(--gds-text,var(--text,#0f172a));margin-bottom:12px;">${this.esc(target.designation)}</div>
                    <div id="gdsLabelPrintBox" style="background:#ffffff;color:#0f172a;border:1.5px dashed #cbd5e1;border-radius:14px;padding:16px;margin-bottom:14px;display:flex;flex-direction:column;align-items:center;gap:10px;">
                        <div style="font-weight:800;font-size:0.88rem;color:#0f172a;">${this.esc(target.designation)}</div>
                        <div id="gdsLabelQrHolder" style="display:flex;justify-content:center;padding:6px;background:#fff;border-radius:8px;"></div>
                        <svg id="gdsLabelBarcodeSvg" style="max-width:100%;height:56px;"></svg>
                        <div style="font-family:monospace;font-size:0.82rem;font-weight:700;color:#334155;">${this.esc(codeVal)} ${target.zone ? ' · ' + this.esc(target.zone) : ''}</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <button type="button" onclick="window.print()" style="padding:12px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            <i class="fas fa-print"></i> Imprimer
                        </button>
                        <button type="button" onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)" class="gds-secondary-btn">
                            ← Retour
                        </button>
                    </div>
                </div>`;
            setTimeout(() => {
                try {
                    const qrBox = document.getElementById('gdsLabelQrHolder');
                    if (qrBox && typeof QRCode !== 'undefined') {
                        qrBox.innerHTML = '';
                        new QRCode(qrBox, { text: codeVal, width: 104, height: 104, correctLevel: QRCode.CorrectLevel.M });
                    }
                    const svgEl = document.getElementById('gdsLabelBarcodeSvg');
                    if (svgEl && typeof JsBarcode !== 'undefined') {
                        JsBarcode(svgEl, codeVal, { format: 'CODE128', width: 1.8, height: 42, displayValue: false, margin: 2 });
                    }
                } catch(e) {}
            }, 30);
        },

        // ─── SORTIE FLOW ───────────────────────────────────────────────────
        startSortie() {
            const article = this.currentArticle;
            if (!article) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const bens = this._getBeneficiaries();
            const depts = this._getDepts();
            const stock = Number(article.quantity) || 0;
            this.subtitle('Sortie Stock (BSM)');
            area.innerHTML = `
                <div class="gds-surface-card" style="overflow:hidden;">
                    <div style="background:linear-gradient(135deg,rgba(225,29,72,0.16),rgba(244,63,94,0.06));padding:14px 16px;border-bottom:1px solid rgba(225,29,72,0.22);display:flex;align-items:center;gap:12px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:#e11d48;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-file-invoice" style="color:#fff;font-size:1.1rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:#e11d48;font-weight:800;font-size:0.95rem;">Bon de Sortie (BSM)</div>
                            <div style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.esc(article.designation)} · Stock: <strong style="color:#ef4444;">${stock} ${this.esc(article.unit||'U')}</strong></div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <!-- STEPPER -->
                        <div style="font-size:0.72rem;font-weight:700;color:var(--gds-muted,var(--text-muted,#64748b));text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Quantité à déduire</div>
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                            <button onclick="GdsScannerModule._adjQty(-1)" class="gds-step-btn">−</button>
                            <input id="gdsSortieQty" type="number" min="1" value="1" class="gds-input" style="flex:1;padding:12px;border:2px solid #e11d48;font-size:1.45rem;font-weight:900;text-align:center;">
                            <button onclick="GdsScannerModule._adjQty(1)" class="gds-step-btn">+</button>
                        </div>
                        <!-- QUICK STEPPER CHIPS -->
                        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:14px;">
                            ${[1, 2, 5, 10].map(n => `<button type="button" onclick="document.getElementById('gdsSortieQty').value='${n}';" class="gds-chip-btn">${n}</button>`).join('')}
                        </div>
                        <label style="font-size:0.72rem;font-weight:700;color:var(--gds-muted,var(--text-muted,#64748b));text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:block;">✦ Destinataire / Bénéficiaire *</label>
                        <select id="gdsBenefSelect" onchange="GdsScannerModule._onBenefSelect(this)" class="gds-input" style="width:100%;padding:11px 14px;margin-bottom:8px;">
                            <option value="">-- Choisir une personne dans la liste (${bens.length}) --</option>
                            ${bens.map(b => `<option value="${this.esc(b)}">${this.esc(b)}</option>`).join('')}
                            <option value="__other__">✏️ Autre (saisie libre / nouveau)</option>
                        </select>
                        <input id="gdsBeneficiary" type="text" placeholder="✦ Ou taper nom du destinataire *" list="gdsBenefList"
                            class="gds-input" style="width:100%;padding:11px 14px;border:2px solid #e11d48;margin-bottom:10px;"
                            oninput="this.style.borderColor='#3b82f6'">
                        <datalist id="gdsBenefList">${bens.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                        <input id="gdsServiceField" type="text" placeholder="Service / Département (optionnel)" list="gdsServiceList"
                            class="gds-input" style="width:100%;padding:11px 14px;margin-bottom:10px;">
                        <datalist id="gdsServiceList">${depts.map(d=>`<option value="${this.esc(d)}">`).join('')}</datalist>
                        <input id="gdsSortieMotif" type="text" placeholder="Motif / Observation (optionnel)"
                            class="gds-input" style="width:100%;padding:11px 14px;margin-bottom:14px;">
                        <div id="gdsSortieErrBox" style="display:none;background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:10px;padding:12px;color:#ef4444;font-size:0.85rem;font-weight:600;margin-bottom:12px;"></div>
                        <button id="gdsSortieValBtn" onclick="GdsScannerModule.confirmSortie()"
                            style="width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;border:none;font-weight:800;font-size:0.98rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(225,29,72,0.3);margin-bottom:8px;">
                            <i class="fas fa-check-circle"></i> Valider le Bon de Sortie
                        </button>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)" class="gds-secondary-btn">
                                ← Retour
                            </button>
                            <button onclick="GdsScannerModule.resetToScan()" class="gds-secondary-btn" style="color:var(--primary,#2563eb);">
                                <i class="fas fa-camera"></i> Re-scanner
                            </button>
                        </div>
                    </div>
                </div>`;
        },

        _onBenefSelect(selectEl) {
            const val = (selectEl && selectEl.value) || '';
            const inp = document.getElementById('gdsBeneficiary');
            if (!inp) return;
            if (val === '__other__') {
                inp.value = '';
                inp.focus();
            } else if (val) {
                inp.value = val;
                inp.style.borderColor = '#10b981';
                try {
                    const decharges = (typeof DB !== 'undefined' && DB.getDecharges) ? DB.getDecharges() : [];
                    const prev = decharges.find(d => d.beneficiary && d.beneficiary.toLowerCase() === val.toLowerCase() && (d.department || d.service));
                    if (prev) {
                        const sField = document.getElementById('gdsServiceField');
                        if (sField && !sField.value) sField.value = prev.department || prev.service || '';
                    }
                } catch(e) {}
            }
        },

        _getBeneficiaries() {
            try {
                const list = [];
                const s = (typeof DB !== 'undefined' && DB.getSettings) ? DB.getSettings() : {};
                if (Array.isArray(s.beneficiaries)) list.push(...s.beneficiaries);
                if (typeof DB !== 'undefined' && DB.getUsers) {
                    try { list.push(...DB.getUsers().map(u => u.name || u.username)); } catch(e) {}
                }
                if (typeof DB !== 'undefined' && DB.data) {
                    if (Array.isArray(DB.data.users)) list.push(...DB.data.users.map(u => u.name || u.username));
                    if (Array.isArray(DB.data.beneficiaryNames)) list.push(...DB.data.beneficiaryNames);
                    if (Array.isArray(DB.data.beneficiaries)) list.push(...DB.data.beneficiaries.map(b => typeof b === 'string' ? b : (b.name || b.nom)));
                    if (Array.isArray(DB.data.decharges)) list.push(...DB.data.decharges.map(d => d.beneficiary));
                    if (Array.isArray(DB.data.employees)) list.push(...DB.data.employees.map(e => e.name || e.nom));
                    if (Array.isArray(DB.data.preOrders)) list.push(...DB.data.preOrders.map(p => p.requester || p.demandeur));
                }
                return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'fr'));
            } catch(e) { return []; }
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
            if (!article) {
                if (typeof alert !== 'undefined') alert('Aucun article sélectionné.');
                return;
            }
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
                const ok = (typeof confirm !== 'undefined') ? confirm(`Stock actuel (${stock}) < quantité demandée (${qty}). Autoriser stock négatif ?`) : true;
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

            // 1. Stock deduction (API attempt + reliable computed fallback)
            let stockOk = false;
            let newStockQty = allowNegative ? (stock - qty) : Math.max(0, stock - qty);
            try {
                const r = await fetch('/api/articles/' + encodeURIComponent(artId) + '/stock', {
                    method: 'POST',
                    headers: this.hdrs(),
                    body: JSON.stringify({ type:'Sortie', quantity: qty, reason: motif||'Sortie GDS scanner', reference: refNum, user: authorName, allowNegative })
                });
                if (r.ok) {
                    const d = await r.json();
                    stockOk = true;
                    if (d.article && typeof d.article.quantity !== 'undefined') newStockQty = Number(d.article.quantity);
                }
            } catch(e) {}

            // Master DB sync + localStorage save + UI views refresh ALWAYS
            this._applyStockUpdate(article, newStockQty);

            // 2. BSM creation — best effort (stock already secured)
            let bsmCreated = false;
            try {
                const r2 = await fetch('/api/decharges', {
                    method: 'POST', headers: this.hdrs(),
                    body: JSON.stringify({
                        ref: refNum, type: 'BSM', typeDoc: 'bsm', status: 'served',
                        date: now.toISOString(), dateDecharge: now.toISOString(),
                        servedAt: now.toISOString(), createdAt: now.toISOString(),
                        beneficiary, department: service || '', service: service || '',
                        items: [{ articleId: artId, articleCode: article.code||'', designation: article.designation||'', quantity: qty, unit: article.unit||'U' }],
                        notes: motif || 'Sortie par scan GDS mobile',
                        createdBy: authorName, servedBy: authorName
                    })
                });
                let d2 = null;
                if (r2.ok) {
                    bsmCreated = true;
                    try { d2 = await r2.json(); } catch(e) {}
                }
                if (typeof DB !== 'undefined' && DB.data) {
                    if (!Array.isArray(DB.data.decharges)) DB.data.decharges = [];
                    const dechRecord = {
                        id: (d2 && d2.decharge && (d2.decharge._id || d2.decharge.id)) || ('dech_' + Date.now()),
                        ref: refNum, type: 'BSM', typeDoc: 'bsm', status: 'served',
                        date: now.toISOString(), dateDecharge: now.toISOString(),
                        servedAt: now.toISOString(), createdAt: now.toISOString(),
                        beneficiary, department: service || '', service: service || '',
                        items: [{ articleId: artId, articleCode: article.code||'', designation: article.designation||'', quantity: qty, unit: article.unit||'U' }],
                        notes: motif || 'Sortie par scan GDS mobile',
                        createdBy: authorName, servedBy: authorName,
                        ...(d2 && d2.decharge ? d2.decharge : {})
                    };
                    dechRecord.date = dechRecord.date || now.toISOString();
                    dechRecord.typeDoc = 'bsm';
                    dechRecord.type = 'BSM';
                    DB.data.decharges.unshift(dechRecord);
                    if (typeof DB.save === 'function') DB.save();
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
            this.subtitle('Sortie enregistrée ✓');
            area.innerHTML = `
                <div class="gds-surface-card" style="overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#064e3b,#047857);padding:16px;display:flex;align-items:center;gap:12px;">
                        <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-check" style="color:#fff;font-size:1.2rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:#fff;font-weight:800;font-size:1.05rem;">Bon de Sortie Créé !</div>
                            <div style="color:#a7f3d0;font-size:0.75rem;font-family:monospace;margin-top:1px;">${this.esc(ref)}</div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div class="gds-subcard" style="padding:14px;margin-bottom:14px;">
                            <div style="font-size:0.72rem;color:var(--gds-muted,var(--text-muted,#64748b));margin-bottom:2px;">Article</div>
                            <div style="font-weight:700;color:var(--gds-text,var(--text,#0f172a));font-size:0.95rem;margin-bottom:10px;">${this.esc(article.designation)}</div>
                            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Quantité sortie</span><span style="font-weight:800;color:#ef4444;font-size:0.95rem;">-${qty} ${this.esc(article.unit||'U')}</span></div>
                            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Nouveau stock</span><span style="font-weight:900;color:#10b981;font-size:1.15rem;">${article.quantity} ${this.esc(article.unit||'U')}</span></div>
                            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Destinataire</span><span style="font-weight:600;color:var(--gds-text,var(--text,#0f172a));font-size:0.85rem;">${this.esc(beneficiary)}</span></div>
                        </div>
                        <button onclick="GdsScannerModule.resetToScan()" style="width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;font-weight:800;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(37,99,235,0.3);margin-bottom:8px;">
                            <i class="fas fa-camera"></i> <span>Scanner un autre article</span>
                        </button>
                        <button onclick="GdsScannerModule.closeModal()" class="gds-secondary-btn" style="width:100%;">
                            Fermer
                        </button>
                    </div>
                </div>`;
        },

        // ─── ENTRÉE FLOW ───────────────────────────────────────────────────
        startEntree() {
            const article = this.currentArticle;
            if (!article) return;
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            const stock = Number(article.quantity)||0;
            this.subtitle('Entrée en Stock');
            area.innerHTML = `
                <div class="gds-surface-card" style="overflow:hidden;">
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.16),rgba(5,150,105,0.06));padding:14px 16px;border-bottom:1px solid rgba(16,185,129,0.22);display:flex;align-items:center;gap:12px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-plus-circle" style="color:#fff;font-size:1.1rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:#059669;font-weight:800;font-size:0.95rem;">Entrée en Stock</div>
                            <div style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.esc(article.designation)} · Stock actuel: <strong style="color:#10b981;">${stock} ${this.esc(article.unit||'U')}</strong></div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <!-- STEPPER -->
                        <div style="font-size:0.72rem;font-weight:700;color:var(--gds-muted,var(--text-muted,#64748b));text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Quantité à ajouter</div>
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
                            <button onclick="GdsScannerModule._adjQty(-1)" class="gds-step-btn">−</button>
                            <input id="gdsEntreeQty" type="number" min="1" value="1" class="gds-input" style="flex:1;padding:12px;border:2px solid #10b981;font-size:1.45rem;font-weight:900;text-align:center;">
                            <button onclick="GdsScannerModule._adjQty(1)" class="gds-step-btn">+</button>
                        </div>
                        <!-- QUICK STEPPER CHIPS -->
                        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:14px;">
                            ${[1, 5, 10, 25, 50].map(n => `<button type="button" onclick="document.getElementById('gdsEntreeQty').value='${n}';" class="gds-chip-btn">+${n}</button>`).join('')}
                        </div>
                        <input id="gdsEntreeRef" type="text" placeholder="Fournisseur / N° BL / Référence (optionnel)"
                            class="gds-input" style="width:100%;padding:12px 14px;margin-bottom:12px;">
                        <div id="gdsEntreeErrBox" style="display:none;background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:10px;padding:12px;color:#ef4444;font-size:0.85rem;font-weight:600;margin-bottom:12px;"></div>
                        <button id="gdsEntreeValBtn" onclick="GdsScannerModule.confirmEntree()"
                            style="width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;font-weight:800;font-size:0.98rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(16,185,129,0.3);margin-bottom:8px;">
                            <i class="fas fa-check-circle"></i> Valider l'Entrée Stock
                        </button>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <button onclick="GdsScannerModule.renderActionPicker(GdsScannerModule.currentArticle)" class="gds-secondary-btn">
                                ← Retour
                            </button>
                            <button onclick="GdsScannerModule.resetToScan()" class="gds-secondary-btn" style="color:var(--primary,#2563eb);">
                                <i class="fas fa-camera"></i> Re-scanner
                            </button>
                        </div>
                    </div>
                </div>`;
        },

        async confirmEntree() {
            const article = this.currentArticle;
            if (!article) {
                if (typeof alert !== 'undefined') alert('Aucun article sélectionné.');
                return;
            }

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
            let newStockQty = (Number(article.quantity)||0) + qty;
            try {
                const r = await fetch('/api/articles/' + encodeURIComponent(artId) + '/stock', {
                    method: 'POST',
                    headers: this.hdrs(),
                    body: JSON.stringify({ type:'Entrée', quantity: qty, reason: ref||'Entrée GDS scanner', user: authorName })
                });
                if (r.ok) {
                    const data = await r.json();
                    apiOk = true;
                    if (data.article && typeof data.article.quantity !== 'undefined') {
                        newStockQty = Number(data.article.quantity);
                    }
                }
            } catch(e) {}

            // Master DB sync + localStorage save + UI views refresh ALWAYS
            this._applyStockUpdate(article, newStockQty);

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
                <div class="gds-surface-card" style="overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#064e3b,#047857);padding:16px;display:flex;align-items:center;gap:12px;">
                        <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-check" style="color:#fff;font-size:1.2rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:#fff;font-weight:800;font-size:1.05rem;">Entrée Stock Enregistrée !</div>
                            <div style="color:#a7f3d0;font-size:0.75rem;margin-top:1px;">Mis à jour dans le système & base de données</div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div class="gds-subcard" style="padding:14px;margin-bottom:14px;">
                            <div style="font-size:0.72rem;color:var(--gds-muted,var(--text-muted,#64748b));margin-bottom:2px;">Article</div>
                            <div style="font-weight:700;color:var(--gds-text,var(--text,#0f172a));font-size:0.95rem;margin-bottom:10px;">${this.esc(article.designation)}</div>
                            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Quantité ajoutée</span><span style="font-weight:800;color:#10b981;font-size:0.95rem;">+${qty} ${this.esc(article.unit||'U')}</span></div>
                            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Nouveau stock</span><span style="font-weight:900;color:#10b981;font-size:1.15rem;">${article.quantity} ${this.esc(article.unit||'U')}</span></div>
                            ${ref ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--gds-border,var(--border,#e2e8f0));"><span style="color:var(--gds-muted,var(--text-muted,#64748b));font-size:0.82rem;">Référence / BL</span><span style="font-weight:600;color:var(--gds-text,var(--text,#0f172a));font-size:0.85rem;">${this.esc(ref)}</span></div>` : ''}
                        </div>
                        <button onclick="GdsScannerModule.resetToScan()" style="width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;font-weight:800;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(37,99,235,0.3);margin-bottom:8px;">
                            <i class="fas fa-camera"></i> <span>Scanner un autre article</span>
                        </button>
                        <button onclick="GdsScannerModule.closeModal()" class="gds-secondary-btn" style="width:100%;">
                            Fermer
                        </button>
                    </div>
                </div>`;
        },

        // ─── UNKNOWN ARTICLE ───────────────────────────────────────────────
        renderUnknownResult(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.pendingCode = scannedCode;
            const safe = this.esc(scannedCode);
            this.subtitle('Code non reconnu');
            area.innerHTML = `
                <div class="gds-surface-card" style="overflow:hidden;border-color:rgba(245,158,11,0.35);">
                    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(180,83,9,0.06));padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(245,158,11,0.22);">
                        <div style="width:42px;height:42px;border-radius:12px;background:#d97706;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-question" style="color:#fff;font-size:1.2rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:var(--gds-text,var(--text,#0f172a));font-weight:800;font-size:1rem;">Article non Répertorié</div>
                            <div style="font-family:monospace;font-size:0.75rem;color:#d97706;background:rgba(245,158,11,0.15);padding:2px 8px;border-radius:6px;margin-top:3px;display:inline-block;">${safe}</div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div style="font-size:0.84rem;color:var(--gds-muted,var(--text-muted,#64748b));margin-bottom:16px;line-height:1.4;">Ce code-barres n'est pas encore lié à un article du catalogue. Choisissez une action :</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                            <button onclick="GdsScannerModule.showLinkArticleModal(GdsScannerModule.pendingCode)" style="padding:16px 10px;border-radius:14px;border:1.5px solid rgba(37,99,235,0.35);background:rgba(37,99,235,0.08);color:var(--primary,#2563eb);cursor:pointer;font-weight:700;font-size:0.85rem;display:flex;flex-direction:column;align-items:center;gap:6px;transition:0.15s;">
                                <i class="fas fa-link" style="font-size:1.3rem;"></i>
                                <span>Associer existant</span>
                                <span style="font-size:0.65rem;opacity:0.8;font-weight:500;">Lier au catalogue</span>
                            </button>
                            <button onclick="GdsScannerModule.showCreateArticleModal(GdsScannerModule.pendingCode)" style="padding:16px 10px;border-radius:14px;border:1.5px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.08);color:#10b981;cursor:pointer;font-weight:700;font-size:0.85rem;display:flex;flex-direction:column;align-items:center;gap:6px;transition:0.15s;">
                                <i class="fas fa-plus-circle" style="font-size:1.3rem;"></i>
                                <span>Créer en Stock</span>
                                <span style="font-size:0.65rem;opacity:0.8;font-weight:500;">Fiche Complète Stock</span>
                            </button>
                        </div>
                        <button onclick="GdsScannerModule.resetToScan()" class="gds-secondary-btn" style="width:100%;">
                            <i class="fas fa-camera" style="color:var(--primary,#2563eb);"></i> Scanner un autre code
                        </button>
                    </div>
                </div>`;
        },

        // ─── LINK TO EXISTING — inline in scanner ──────────────────────────
        showLinkArticleModal(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            this.pendingCode = scannedCode;
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() :
                             (typeof DB !== 'undefined' && DB.data ? DB.data.articles||[] : []);
            const safe = this.esc(scannedCode);
            const opts = articles.map(a => {
                const id = String(a._id || a.id || '');
                return `<option value="${id}">${this.esc(a.code||'')} — ${this.esc(a.designation||'')} (stock: ${a.quantity||0} ${a.unit||'U'})</option>`;
            }).join('');
            this.subtitle('Associer au catalogue');
            area.innerHTML = `
                <div class="gds-surface-card" style="overflow:hidden;">
                    <div style="background:linear-gradient(135deg,rgba(37,99,235,0.16),rgba(37,99,235,0.06));padding:14px 16px;border-bottom:1px solid rgba(37,99,235,0.22);display:flex;align-items:center;gap:12px;">
                        <div style="width:38px;height:38px;border-radius:10px;background:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-link" style="color:#fff;font-size:1.1rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:var(--gds-text,var(--text,#0f172a));font-weight:800;font-size:0.95rem;">Associer Code-Barres</div>
                            <div style="font-family:monospace;font-size:0.75rem;color:var(--primary,#2563eb);">${safe}</div>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:0.72rem;font-weight:700;color:var(--gds-muted,var(--text-muted,#64748b));margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Sélectionner l'article correspondant</label>
                            <select id="gdsSelectLinkArticle" class="gds-input" style="width:100%;padding:12px;">
                                <option value="">— Choisir un article —</option>
                                ${opts}
                            </select>
                        </div>
                        <button onclick="GdsScannerModule.commitLinkArticle(GdsScannerModule.pendingCode)"
                            style="width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;font-weight:800;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(37,99,235,0.3);margin-bottom:8px;">
                            <i class="fas fa-link"></i> Enregistrer l'association
                        </button>
                        <button onclick="GdsScannerModule.renderUnknownResult(GdsScannerModule.pendingCode)" class="gds-secondary-btn" style="width:100%;">
                            ← Retour
                        </button>
                    </div>
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
            const saveBtn = area ? area.querySelector('button[onclick*="commitLinkArticle"]') : null;
            if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }
            try {
                if (artId) {
                    const r = await fetch('/api/articles/' + encodeURIComponent(artId), {
                        method: 'PUT',
                        headers: this.hdrs(),
                        body: JSON.stringify({ barcode: scannedCode })
                    });
                    if (!r.ok) {
                        const err = await r.json().catch(() => ({ error: 'Erreur serveur' }));
                        if (area) area.insertAdjacentHTML('beforeend', `<div style="color:#ef4444;padding:8px;text-align:center;">${err.error || 'Erreur sauvegarde'}</div>`);
                        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-link"></i> Enregistrer l\'association'; }
                        return;
                    }
                }
                // Update local DB & master array
                article.barcode = scannedCode;
                if (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.articles)) {
                    const master = DB.data.articles.find(a => String(a._id || a.id || '') === artId);
                    if (master) {
                        master.barcode = scannedCode;
                        if (typeof DB.updateArticle === 'function') DB.updateArticle(master);
                    }
                    if (typeof DB.save === 'function') DB.save();
                }
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification(`✅ Code-barres associé à "${article.designation}" !`, 'success');
                }
                this.scanCooldown = false;
                this.lastScannedCode = '';
                this.lastScanTime = 0;
                this.currentArticle = article;
                this.renderActionPicker(article);
            } catch (e) {
                if (area) area.insertAdjacentHTML('beforeend', `<div style="color:#ef4444;padding:8px;text-align:center;">Erreur réseau: ${e.message}</div>`);
                if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-link"></i> Enregistrer l\'association'; }
            }
        },

        // ─── CREATE NEW ARTICLE — Opens the official Stock Article creation modal ──────
        showCreateArticleModal(scannedCode) {
            const code = scannedCode || this.pendingCode || '';
            this.closeModal();
            if (typeof App !== 'undefined' && App.currentModule !== 'stock' && App.loadModule) {
                App.loadModule('stock');
            }
            setTimeout(() => {
                if (typeof Stock !== 'undefined' && Stock.showAddArticle) {
                    Stock.showAddArticle({ barcode: code });
                }
            }, 120);
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

            if (!savedArticle) {
                savedArticle = {
                    id: (typeof Utils !== 'undefined' && Utils.generateId) ? Utils.generateId() : ('art_' + Date.now()),
                    ...payload
                };
            }

            // Push to local DB with real server data
            if (typeof DB !== 'undefined' && savedArticle) {
                if (typeof DB.addArticle === 'function') DB.addArticle(savedArticle);
                else if (DB.data && Array.isArray(DB.data.articles)) {
                    DB.data.articles.push(savedArticle);
                    if (typeof DB.save === 'function') DB.save();
                }
            }

            try {
                window.dispatchEvent(new CustomEvent('stock_updated', {
                    detail: {
                        article: savedArticle,
                        articleId: savedArticle._id || savedArticle.id,
                        code: savedArticle.code,
                        quantity: savedArticle.quantity
                    }
                }));
                if (typeof window.App !== 'undefined' && (window.App.currentModule === 'stock' || window.App.currentModule === 'inventory')) {
                    if (typeof window.App.loadModule === 'function') {
                        window.App.loadModule(window.App.currentModule, window.App.currentTab, false);
                    }
                }
            } catch(e) {}

            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(`✅ "${savedArticle.designation}" créé dans le catalogue !`, 'success');
            }

            // Show action picker directly — user can immediately do Entrée or Sortie
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
