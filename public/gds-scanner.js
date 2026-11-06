/**
 * ERP DOUROUB ELDJAZAIR — GDS SCANNER & INSTANT STOCK DEDUCTION ENGINE
 * Mobile & Desktop Barcode / QR Scanner with Role Enforcement & Hardware Douchette Support
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
        return role === 'admin' || 
               role === 'superadmin' || 
               role === 'directeur' || 
               role === 'magasinier' || 
               role === 'mag' || 
               role === 'gds' || 
               user.canDeductStock === true || 
               user.gdsOption === true ||
               (user.service && user.service.toLowerCase().includes('stock'));
    }
    window.isUserEligibleForGdsScan = isUserEligibleForGdsScan;

    const GdsScannerModule = {
        html5QrCode: null,
        barcodeDetector: null,
        isScanning: false,
        torchOn: false,
        currentArticle: null,
        autoDeduct: true, // Default ON for GDS fast scan
        scanCooldown: false,
        lastScannedCode: null,
        lastScanTime: 0,
        recentDeductions: [],

        init: function() {
            // Restore auto-deduct preference (default true)
            try {
                const saved = localStorage.getItem('gds_auto_deduct');
                if (saved !== null) {
                    this.autoDeduct = (saved === 'true');
                } else {
                    this.autoDeduct = true;
                }
            } catch (e) {
                this.autoDeduct = true;
            }

            const chk = (typeof document !== 'undefined') ? document.getElementById('chkGdsAutoDeduct') : null;
            if (chk) chk.checked = this.autoDeduct;

            // Check BarcodeDetector API support
            if ('BarcodeDetector' in window) {
                try {
                    this.barcodeDetector = new window.BarcodeDetector({
                        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
                    });
                } catch (e) {
                    this.barcodeDetector = null;
                }
            }
        },

        playBeep: function(type) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                if (type === 'error') {
                    // Error tone: 440Hz -> 220Hz downward sweep
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.25);
                    gain.gain.setValueAtTime(0.22, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.25);
                } else {
                    // Audio confirmation: clean Web Audio API beep (880Hz, 120ms)
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    gain.gain.setValueAtTime(0.20, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.12);
                }
            } catch (e) {
                // AudioContext autoplay restriction fallback
            }
        },

        triggerHaptic: function() {
            try {
                if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate([80, 40, 80]);
                } else if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
                    window.navigator.vibrate([80, 40, 80]);
                }
            } catch (e) {}
        },

        openModal: function() {
            const modal = document.getElementById('gdsScannerModal');
            if (!modal) {
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification('Module scanner non trouvé. Rechargez la page.', 'error');
                }
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('active');

            const chk = (typeof document !== 'undefined') ? document.getElementById('chkGdsAutoDeduct') : null;
            if (chk) chk.checked = this.autoDeduct;

            const input = document.getElementById('gdsManualBarcodeInput');
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 180);
            }

            // On mobile / phone viewport, auto-launch camera
            if (window.innerWidth <= 840 && !this.isScanning) {
                setTimeout(() => this.startCamera(), 200);
            }
        },

        closeModal: function() {
            const modal = document.getElementById('gdsScannerModal');
            if (modal) {
                modal.classList.remove('active');
                modal.classList.add('hidden');
            }
            this.stopCamera();
            this.currentArticle = null;
        },

        onAutoDeductChanged: function(checked) {
            this.autoDeduct = !!checked;
            try {
                localStorage.setItem('gds_auto_deduct', this.autoDeduct ? 'true' : 'false');
            } catch (e) {}
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(
                    this.autoDeduct ? 'Mode Auto-déduction GDS activé (Sortie instantanée)' : 'Mode Manuel GDS activé (Validation requise)',
                    'info'
                );
            }
        },

        toggleCamera: function() {
            if (this.isScanning) {
                this.stopCamera();
            } else {
                this.startCamera();
            }
        },

        startCamera: function() {
            const placeholder = document.getElementById('gdsCamPlaceholder');
            const laser = document.getElementById('gdsLaserLine');
            const btnAction = document.getElementById('lblGdsCamAction');
            const btnTorch = document.getElementById('btnToggleGdsTorch');

            if (typeof Html5Qrcode === 'undefined') {
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification('Librairie de scan caméra HTML5 non chargée.', 'warning');
                }
                return;
            }

            if (placeholder) placeholder.style.display = 'none';
            if (laser) laser.style.display = 'block';
            if (btnAction) btnAction.textContent = 'Arrêter Caméra';

            try {
                if (!this.html5QrCode) {
                    this.html5QrCode = new Html5Qrcode('gdsCameraStream');
                }

                const config = {
                    fps: 15,
                    qrbox: { width: 240, height: 240 },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        facingMode: { ideal: 'environment' }
                    }
                };

                // Rear camera preference: facingMode environment
                this.html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    (decodedText) => {
                        this.handleCode(decodedText);
                    },
                    () => {}
                ).then(() => {
                    this.isScanning = true;
                    if (btnTorch) btnTorch.style.display = 'inline-block';
                }).catch((err) => {
                    console.warn('Camera start error:', err);
                    this.stopCamera();
                    if (typeof Utils !== 'undefined' && Utils.showNotification) {
                        Utils.showNotification('Impossible d\'activer la caméra. Utilisez la saisie manuelle ou douchette.', 'warning');
                    }
                });
            } catch (e) {
                console.warn('Scanner error:', e);
                this.stopCamera();
            }
        },

        stopCamera: function() {
            if (this.html5QrCode && this.isScanning) {
                this.html5QrCode.stop().then(() => {
                    this.isScanning = false;
                    this.torchOn = false;
                }).catch(() => {
                    this.isScanning = false;
                });
            } else {
                this.isScanning = false;
            }

            const placeholder = document.getElementById('gdsCamPlaceholder');
            const laser = document.getElementById('gdsLaserLine');
            const btnAction = document.getElementById('lblGdsCamAction');
            const btnTorch = document.getElementById('btnToggleGdsTorch');

            if (placeholder) placeholder.style.display = 'block';
            if (laser) laser.style.display = 'none';
            if (btnAction) btnAction.textContent = 'Activer Caméra';
            if (btnTorch) btnTorch.style.display = 'none';
        },

        toggleTorch: function() {
            if (!this.isScanning || !this.html5QrCode) return;
            try {
                this.torchOn = !this.torchOn;
                this.html5QrCode.applyVideoConstraints({
                    advanced: [{ torch: this.torchOn }]
                }).catch(() => {
                    console.log('Torche non supportée sur cet appareil');
                });
            } catch (e) {
                console.warn('Torch toggle error:', e);
            }
        },

        findArticle: function(scannedCode) {
            if (!scannedCode) return null;
            let code = String(scannedCode).trim();
            if (!code) return null;

            // Try JSON QR payload extraction
            let payloadTarget = code;
            try {
                if ((code.startsWith('{') && code.endsWith('}')) || (code.startsWith('[') && code.endsWith(']'))) {
                    const j = JSON.parse(code);
                    if (j && typeof j === 'object') {
                        payloadTarget = j.barcode || j.code || j.id || j.ref || j.articleId || code;
                    }
                }
            } catch (e) {}

            const articles = (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.articles)) 
                ? DB.data.articles 
                : ((typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : []);

            const rawTarget = String(payloadTarget).trim();
            const lowerRaw = rawTarget.toLowerCase();
            const lowerCode = code.toLowerCase();

            // Match priority: barcode === scannedCode, code === scannedCode, id === scannedCode
            return articles.find(art => {
                if (!art) return false;
                const artBar = art.barcode ? String(art.barcode).trim().toLowerCase() : '';
                const artCode = art.code ? String(art.code).trim().toLowerCase() : '';
                const artId = art.id ? String(art.id).trim().toLowerCase() : '';

                return artBar === lowerRaw || artBar === lowerCode ||
                       artCode === lowerRaw || artCode === lowerCode ||
                       artId === lowerRaw || artId === lowerCode;
            }) || null;
        },

        handleCode: function(rawText) {
            if (!rawText) return;
            const text = String(rawText).trim();
            if (!text) return;

            // 1.5s delay cooldown in continuous mode to prevent multi-triggering
            if (this.scanCooldown) return;
            if (this.lastScannedCode === text && (Date.now() - (this.lastScanTime || 0)) < 1500) {
                return;
            }

            this.scanCooldown = true;
            this.lastScannedCode = text;
            this.lastScanTime = Date.now();
            setTimeout(() => { this.scanCooldown = false; }, 1500);

            // Article Lookup
            const article = this.findArticle(text);

            if (article) {
                // Audio confirmation & Haptic feedback
                this.playBeep('success');
                this.triggerHaptic();
                this.currentArticle = article;

                const deductQty = 1;
                if (this.autoDeduct) {
                    this.executeDeduction(article, deductQty, true);
                } else {
                    this.renderArticleCard(article, deductQty);
                }
                return;
            }

            // Check if Requisition QR (DEM-...) or Décharge QR (DCH-...)
            const preOrders = (typeof DB !== 'undefined' && DB.data && Array.isArray(DB.data.preOrders)) ? DB.data.preOrders : [];
            const textLower = text.toLowerCase();
            const order = preOrders.find(p => (p.ref && p.ref.toLowerCase() === textLower) || p.id === text);
            if (order) {
                this.playBeep('success');
                this.triggerHaptic();
                this.closeModal();
                if (typeof BarcodeScanner !== 'undefined' && BarcodeScanner.openOrderFulfillment) {
                    if (typeof App !== 'undefined' && App.loadModule) App.loadModule('barcodeScanner');
                    setTimeout(() => BarcodeScanner.openOrderFulfillment(order), 150);
                }
                return;
            }

            // Article NOT found
            this.playBeep('error');
            this.renderUnknownResult(text);
        },

        executeDeduction: function(article, qty, isAuto) {
            if (!article) return;
            const deductQty = Number(qty) || 1;
            const currentStock = Number(article.quantity) || 0;

            // Warning if stock drops below 0
            if (currentStock < deductQty) {
                const confirmed = confirm(
                    `Attention : Le stock actuel (${currentStock}) de "${article.designation}" est inférieur à la quantité à déduire (${deductQty}).\n\nSouhaitez-vous confirmer la sortie et autoriser un stock négatif ?`
                );
                if (!confirmed) {
                    this.playBeep('error');
                    return;
                }
            }

            // Deduct quantity
            article.quantity = currentStock - deductQty;

            // Resolve User & Role
            const user = (typeof window.Auth !== 'undefined' && window.Auth.getUser) 
                ? window.Auth.getUser() 
                : ((typeof window.Auth !== 'undefined' && window.Auth.getCurrentUser) ? window.Auth.getCurrentUser() : null);

            const authorName = (user && (user.name || user.username)) ? (user.name || user.username) : 'GDS Mobile';

            // Add stock movement log
            if (typeof DB !== 'undefined') {
                const movData = {
                    articleId: article.id,
                    articleCode: article.code || '',
                    designation: article.designation || '',
                    type: 'Sortie',
                    quantity: deductQty,
                    date: new Date().toISOString(),
                    author: authorName,
                    user: authorName,
                    motif: isAuto ? 'Sortie Express GDS (Scan QR/Code-Barres Mobile)' : 'Sortie Comptoir GDS (Validation Manuelle)',
                    destination: 'Sortie Directe GDS',
                    source: 'Scan Mobile GDS'
                };

                if (typeof DB.addStockMovement === 'function') {
                    DB.addStockMovement(movData);
                } else if (typeof DB.addMovement === 'function') {
                    DB.addMovement(movData);
                } else if (DB.data && Array.isArray(DB.data.stockMovements)) {
                    DB.data.stockMovements.push(movData);
                }

                // Save to localStorage
                if (typeof DB.save === 'function') {
                    DB.save();
                }
            }

            // Refresh Stock table / badge
            if (typeof window.Stock !== 'undefined' && typeof window.Stock.render === 'function') {
                window.Stock.render();
            }

            // Audio & Haptic confirmation
            this.playBeep('success');
            this.triggerHaptic();

            // Track recent deduction
            this.recentDeductions.unshift({
                articleId: article.id,
                code: article.code,
                designation: article.designation,
                quantity: deductQty,
                unit: article.unit || 'U',
                remaining: article.quantity,
                timestamp: new Date()
            });
            if (this.recentDeductions.length > 8) this.recentDeductions.pop();

            // Display instant visual notification in scanner modal
            const area = document.getElementById('gdsScanResultArea');
            if (area) {
                area.style.display = 'block';
                area.innerHTML = `
                    <div class="alert alert-success border-success p-3 my-2 animate__animated animate__fadeIn" style="background:#ecfdf5;border-left:5px solid #059669;">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size:12px;">
                                <i class="fas fa-check-circle me-1"></i> DÉDUCTION EFFECTUÉE
                            </span>
                            <small class="text-muted">${new Date().toLocaleTimeString('fr-FR')}</small>
                        </div>
                        <h6 class="fw-bold mb-1 text-dark" style="font-size:14px;">
                            ✅ DÉDUIT : ${Utils.escapeHTML(article.designation)}
                        </h6>
                        <div class="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-success-subtle">
                            <span class="small text-muted">Réf: <code>${Utils.escapeHTML(article.code || '-')}</code></span>
                            <span class="fw-bold text-success fs-6">
                                Stock restant : ${article.quantity} ${Utils.escapeHTML(article.unit || 'U')} (-${deductQty})
                            </span>
                        </div>
                    </div>
                `;
            }

            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(`✅ DÉDUIT : ${article.designation} — Stock restant : ${article.quantity} ${article.unit || 'U'} (-${deductQty})`, 'success');
            }

            // In continuous mode, prepare scanner for next scan after 1.5s delay
            if (isAuto) {
                setTimeout(() => {
                    const input = document.getElementById('gdsManualBarcodeInput');
                    if (input) {
                        input.value = '';
                        input.focus();
                    }
                }, 1500);
            }
        },

        renderArticleCard: function(article, defaultQty) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            area.style.display = 'block';

            const stockQty = Number(article.quantity) || 0;
            const isLow = stockQty <= (Number(article.minThreshold) || 5);

            area.innerHTML = `
                <div class="card p-3 border mb-2 bg-white shadow-sm animate__animated animate__fadeIn">
                    <div class="d-flex align-items-start gap-3 mb-2">
                        <div style="width:48px;height:48px;border-radius:8px;background:rgba(225,29,72,0.1);color:#be123c;display:flex;align-items:center;justify-content:center;font-size:22px;">
                            <i class="fas fa-box-archive"></i>
                        </div>
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-danger font-monospace">${Utils.escapeHTML(article.code || 'ART')}</span>
                                <span class="badge bg-${isLow ? 'warning text-dark' : 'success'}">${isLow ? 'Stock Bas' : 'Disponible'}</span>
                            </div>
                            <h5 class="fw-bold mb-0 text-truncate text-dark mt-1" title="${Utils.escapeHTML(article.designation)}">
                                ${Utils.escapeHTML(article.designation)}
                            </h5>
                            <small class="text-muted">Catégorie: ${Utils.escapeHTML(article.category || 'Général')} | Stock actuel : <strong class="text-danger">${stockQty}</strong> ${Utils.escapeHTML(article.unit || 'U')}</small>
                        </div>
                    </div>

                    <div class="p-2 bg-light rounded border d-flex justify-content-between align-items-center mb-3">
                        <span class="small fw-bold text-dark"><i class="fas fa-cubes-stacked me-1"></i> Quantité à déduire :</span>
                        <div class="d-flex align-items-center gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary px-2" onclick="GdsScannerModule.adjustQty(-1)"><i class="fas fa-minus"></i></button>
                            <input type="number" id="gdsDeductQty" class="form-control form-control-sm text-center fw-bold" style="width:65px;" value="${defaultQty || 1}" min="1">
                            <button type="button" class="btn btn-sm btn-outline-secondary px-2" onclick="GdsScannerModule.adjustQty(1)"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-danger flex-grow-1 fw-bold py-2" onclick="GdsScannerModule.confirmManualDeduction()">
                            <i class="fas fa-check-circle me-1"></i> Valider la Déduction (-1)
                        </button>
                        <button type="button" class="btn btn-outline-secondary py-2" onclick="GdsScannerModule.resetResultArea()">
                            <i class="fas fa-redo me-1"></i> Continuer
                        </button>
                    </div>
                </div>
            `;
        },

        adjustQty: function(delta) {
            const input = document.getElementById('gdsDeductQty');
            if (!input) return;
            let val = parseInt(input.value, 10) || 1;
            val += delta;
            if (val < 1) val = 1;
            input.value = val;
        },

        confirmManualDeduction: function() {
            if (!this.currentArticle) return;
            const input = document.getElementById('gdsDeductQty');
            const qty = input ? (parseInt(input.value, 10) || 1) : 1;
            this.executeDeduction(this.currentArticle, qty, false);
        },

        resetResultArea: function() {
            const area = document.getElementById('gdsScanResultArea');
            if (area) {
                area.innerHTML = '';
                area.style.display = 'none';
            }
            this.currentArticle = null;
            const input = document.getElementById('gdsManualBarcodeInput');
            if (input) {
                input.value = '';
                input.focus();
            }
        },

        renderUnknownResult: function(scannedCode) {
            const area = document.getElementById('gdsScanResultArea');
            if (!area) return;
            area.style.display = 'block';

            const safeCode = (typeof Utils !== 'undefined' && Utils.escapeHTML) ? Utils.escapeHTML(scannedCode) : scannedCode;

            area.innerHTML = `
                <div class="alert alert-danger border-danger p-3 my-2 animate__animated animate__shakeX">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="fas fa-triangle-exclamation fa-2x text-danger"></i>
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">Article non trouvé pour le code : <code>${safeCode}</code></h6>
                            <small class="text-muted">Aucune pièce ne correspond à ce code-barres ou QR dans le catalogue.</small>
                        </div>
                    </div>
                    <div class="d-flex gap-2 pt-2 border-top border-danger-subtle">
                        <button type="button" class="btn btn-sm btn-outline-danger fw-bold" onclick="GdsScannerModule.showLinkArticleModal('${safeCode}')">
                            <i class="fas fa-link me-1"></i> Associer à un article existant
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="GdsScannerModule.resetResultArea()">
                            <i class="fas fa-redo me-1"></i> Réessayer
                        </button>
                    </div>
                </div>
            `;
        },

        showLinkArticleModal: function(scannedCode) {
            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
            const options = articles.map(a => `<option value="${a.id}">${Utils.escapeHTML(a.code)} — ${Utils.escapeHTML(a.designation)} (${a.quantity} ${a.unit || 'U'})</option>`).join('');

            const html = `
                <div class="p-2">
                    <p class="small text-muted mb-3">
                        Voulez-vous affecter définitivement le code-barres <strong>${Utils.escapeHTML(scannedCode)}</strong> à un article de votre stock ?
                    </p>
                    <div class="mb-3">
                        <label class="form-label fw-bold small">Sélectionner l'article du catalogue :</label>
                        <select id="gdsSelectLinkArticle" class="form-select">${options}</select>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.UI && UI.closeModal) UI.closeModal();">Annuler</button>
                        <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="GdsScannerModule.commitLinkArticle('${scannedCode}')">
                            <i class="fas fa-save me-1"></i> Associer et Sauvegarder
                        </button>
                    </div>
                </div>
            `;

            if (typeof UI !== 'undefined' && UI.showModal) {
                UI.showModal('Associer Code-Barres', html);
            }
        },

        commitLinkArticle: function(scannedCode) {
            const sel = document.getElementById('gdsSelectLinkArticle');
            if (!sel || !sel.value) return;
            const articleId = sel.value;

            const articles = (typeof DB !== 'undefined' && DB.getArticles) ? DB.getArticles() : [];
            const article = articles.find(a => a.id === articleId);
            if (article) {
                article.barcode = scannedCode;
                if (typeof DB !== 'undefined' && DB.save) DB.save();
                if (typeof UI !== 'undefined' && UI.closeModal) UI.closeModal();
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification(`Code-barres associé avec succès à "${article.designation}" !`, 'success');
                }
                this.handleCode(scannedCode);
            }
        }
    };

    // Auto-init on DOM ready
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GdsScannerModule.init());
    } else if (typeof document !== 'undefined') {
        GdsScannerModule.init();
    }

    // Export both alias identifiers
    window.GdsScannerModule = GdsScannerModule;
    window.GdsScanner = GdsScannerModule;

})(window);
