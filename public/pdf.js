/* ============================================================
   PDF.JS — ULTIMATE DOCUMENT GENERATOR v9.1
   SPA DOUROUB ELDJAZAIR
   Native jsPDF vector rendering — NO html2canvas
   Sharp text · Searchable PDFs · Fast generation
   Documents: DA · DS · BC · BR · DP · Décharge · PV MAD
   ============================================================ */
(function (global) {
  'use strict';

  if (!global.jspdf || !global.jspdf.jsPDF) {
    console.error('PDFGen: jsPDF library not loaded.');
    return;
  }
  const { jsPDF } = global.jspdf;

  /* ── Colour palette ───────────────────────────────────────
     Default = brand teal (matches Douroub logo).
     Can be overridden from Settings.themeColor (UI + PDF).
  ────────────────────────────────────────────────────────── */
const C = {
  PRIMARY:       [0,  96, 120],    // #006078  (logo teal)
  PRIMARY_DARK:  [0,  74,  92],    // darker teal
  WHITE:         [255, 255, 255],
  BLACK:         [0, 0, 0],
  LIGHT:         [217, 239, 243],  // light teal tint
  DARK_HDR:      [30,  41,  59],   // #1e293b  DP sig header
  GRAY_TXT:      [100, 116, 139],  // #64748b
  RED:           [220,  38,  38],
  LINE:          [203, 213, 225],  // #cbd5e1
  BG_INFO:       [248, 250, 252],
};

  /* ── Page constants (mm, A4) ────────────────────────────── */
const PW = 210, PH = 297;
const ML = 8, MR = 8;           // slightly tighter margins for a more compact PDF
const CW = PW - ML - MR;        // 194 mm content width
const MT = 8;

  /* ══════════════════════════════════════════════════════════
     CORE HELPER LAYER
  ══════════════════════════════════════════════════════════ */
  const PDFGen = {

    /* ── Notification ──────────────────────────────────────── */
    _notify(msg, type = 'info') {
      if (typeof Utils !== 'undefined' && Utils.showNotification)
        Utils.showNotification(msg, type);
      else alert(msg);
    },

    /* ── Data helpers ──────────────────────────────────────── */
    _formatDate(d) {
      if (!d) return '';
      if (typeof Utils !== 'undefined' && Utils.formatDate) return Utils.formatDate(d);
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    },
    /* Safe numeric formatter — ALWAYS uses own logic, never fr-DZ locale (produces "41/241") */
    _numFmt(n, dec) {
      const num = Number(n) || 0;
      const fixed = num.toFixed(dec !== undefined ? dec : 2);
      const parts = fixed.split('.');
      // Use space (0x20) as thousands sep — universally safe in PDF text
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return dec === 0 ? parts[0] : parts[0] + ',' + parts[1];
    },
    _formatCurrency(v, currency) {
      currency = currency || 'DA';
      // NOTE: Do NOT delegate to Utils.formatCurrency — it uses fr-DZ locale which
      // renders "/" as thousands separator in some browser engines.
      return this._numFmt(v, 2) + '\u00a0' + currency;
    },
    _formatNumber(v) {
      // NOTE: Do NOT delegate to Utils.formatNumber — same fr-DZ locale issue.
      return this._numFmt(v, 0);
    },

    /* ── Barcode helpers (CODE128 via JsBarcode) ───────────────
       Used for PV + inventory labels. Falls back to text if the
       library can't be loaded.
    ────────────────────────────────────────────────────────── */
    _ensureJsBarcode(cb){
      try{
        if(typeof JsBarcode === 'function'){ cb && cb(); return; }
        const existing = document.querySelector('script[data-jsbarcode="1"]');
        if(existing){
          existing.addEventListener('load', ()=>cb && cb());
          existing.addEventListener('error', ()=>{ this._notify('Barcode indisponible (chargement échoué).', 'warning'); cb && cb(); });
          // In case it already loaded before the listener is attached
          setTimeout(()=>{ if(typeof JsBarcode === 'function') cb && cb(); }, 50);
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
        s.async = true;
        s.dataset.jsbarcode = '1';
        s.onload = ()=>cb && cb();
        s.onerror = ()=>{ this._notify('Impossible de charger la librairie Barcode (JsBarcode).', 'warning'); cb && cb(); };
        document.head.appendChild(s);
      } catch(e){
        console.error(e);
        cb && cb();
      }
    },

    _barcodePngData(value, opts = {}){
      if(typeof JsBarcode !== 'function') return null;
      const v = String(value || '').trim();
      if(!v) return null;

      const widthPx = opts.widthPx || 700;
      const heightPx = opts.heightPx || 180;

      try{
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;

        JsBarcode(canvas, v, {
          format: opts.format || 'CODE128',
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
          width: opts.barWidth || 2,
          height: opts.barHeight || Math.max(40, heightPx - 30),
        });

        return canvas.toDataURL('image/png');
      } catch(e){
        console.error(e);
        return null;
      }
    },

    // Encode BOTH the inventory code + a short designation so scanners
    // show meaningful info (as requested).
    _barcodePayload(code, designation){
      const c = String(code || '').trim();
      if(!c) return '';
      const raw = String(designation || '').replace(/\s+/g,' ').trim();
      if(!raw) return c;
      const short = raw.length > 22 ? (raw.slice(0,22) + '…') : raw;
      return `${c} | ${short}`;
    },
    _getSettings() {
      return (typeof DB !== 'undefined' && DB.getSettings) ? DB.getSettings() : {};
    },
    _getUserFullName(userId) {
      if (!userId) return '';
      const users = DB.getAll('users');
      const u = users.find(u => u.id === userId);
      return u ? u.name : '';
    },
    _amountWords(amount) {
      if (typeof Utils !== 'undefined' && Utils.numberToWordsFR)
        return Utils.numberToWordsFR(Math.floor(Number(amount) || 0));
      return '';
    },
    /* Today as DD/MM/YYYY — used as fallback when document date is empty */
    _today() {
      const d = new Date();
      return String(d.getDate()).padStart(2,'0') + '/' +
             String(d.getMonth()+1).padStart(2,'0') + '/' +
             d.getFullYear();
    },
    _autoDate(d) { return this._formatDate(d) || this._today(); },

    /* ── Theme for PDFs (based on Settings.themeColor) ─────── */
    _applyThemeFromSettings(settings) {
      settings = settings || this._getSettings();
      const raw = String(settings.themeColor || '').trim();
      const hex = raw ? (raw.startsWith('#') ? raw : ('#' + raw)) : '';
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;

      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      const mix = (a, t, p) => clamp(a * (1 - p) + t * p);

      // Mutate palette (const object is OK to mutate)
      C.PRIMARY = [r, g, b];
      C.PRIMARY_DARK = [mix(r, 0, 0.25), mix(g, 0, 0.25), mix(b, 0, 0.25)];
      C.LIGHT = [mix(r, 255, 0.85), mix(g, 255, 0.85), mix(b, 255, 0.85)];
    },

    /* ── PDF factory ───────────────────────────────────────── */
    _newDoc() {
      // Make sure the palette matches the brand/theme before drawing
      this._applyThemeFromSettings();
      return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    },
    _save(doc, filename) {
      doc.save(filename);
      this._notify('PDF généré avec succès', 'success');
    },

    /* ── Low-level drawing helpers ─────────────────────────── */
    // Robust color handling: never crash if a color is missing/invalid.
    _rgb(input, fallback) {
      const fb = (Array.isArray(fallback) && fallback.length >= 3)
        ? fallback
        : ((Array.isArray(C.BLACK) && C.BLACK.length >= 3) ? C.BLACK : [0, 0, 0]);

      try {
        if (Array.isArray(input) && input.length >= 3) {
          const r = Number(input[0]), g = Number(input[1]), b = Number(input[2]);
          if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
            return [
              Math.max(0, Math.min(255, r)),
              Math.max(0, Math.min(255, g)),
              Math.max(0, Math.min(255, b))
            ];
          }
        }

        if (input && typeof input === 'object') {
          const r = Number(input.r), g = Number(input.g), b = Number(input.b);
          if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
            return [
              Math.max(0, Math.min(255, r)),
              Math.max(0, Math.min(255, g)),
              Math.max(0, Math.min(255, b))
            ];
          }
        }

        if (typeof input === 'string') {
          const s = input.trim();
          const hex = s.startsWith('#') ? s.slice(1) : s;
          if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r, g, b];
          }
          const m = s.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
          if (m) {
            const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
            return [
              Math.max(0, Math.min(255, r)),
              Math.max(0, Math.min(255, g)),
              Math.max(0, Math.min(255, b))
            ];
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      return fb;
    },

    _fill(doc, rgb)   { const c = this._rgb(rgb, C.BLACK); doc.setFillColor(c[0], c[1], c[2]); },
    _stroke(doc, rgb) { const c = this._rgb(rgb, C.BLACK); doc.setDrawColor(c[0], c[1], c[2]); },
    _tc(doc, rgb)     { const c = this._rgb(rgb, C.BLACK); doc.setTextColor(c[0], c[1], c[2]); },

    // Robust wrapper for jsPDF-AutoTable.
    // Fixes rare crashes like: "can't access property 0, rgb is undefined"
    // by sanitizing fillColor/textColor values and retrying once.
    _autoTable(doc, opts){
      if(!doc || typeof doc.autoTable !== 'function'){
        throw new Error('AutoTable indisponible (jsPDF-AutoTable)');
      }
      try{
        doc.autoTable(opts);
      }catch(e){
        console.warn('autoTable error, retry with sanitized colors:', e);
        const clone = (o)=> (o && typeof o === 'object') ? Object.assign({}, o) : o;
        const cleaned = Object.assign({}, opts);
        cleaned.styles = clone(opts.styles);
        cleaned.headStyles = clone(opts.headStyles);
        cleaned.bodyStyles = clone(opts.bodyStyles);
        cleaned.footStyles = clone(opts.footStyles);
        cleaned.alternateRowStyles = clone(opts.alternateRowStyles);
        // columnStyles may be nested
        if(opts.columnStyles && typeof opts.columnStyles === 'object'){
          try{ cleaned.columnStyles = JSON.parse(JSON.stringify(opts.columnStyles)); }
          catch(_e){ cleaned.columnStyles = opts.columnStyles; }
        }

        const fixStyle = (s)=>{
          if(!s || typeof s !== 'object') return;
          if(s.fillColor !== undefined) s.fillColor = this._rgb(s.fillColor, C.WHITE);
          if(s.textColor !== undefined) s.textColor = this._rgb(s.textColor, C.BLACK);
          if(s.fillColor !== undefined && !Array.isArray(s.fillColor)) delete s.fillColor;
          if(s.textColor !== undefined && !Array.isArray(s.textColor)) delete s.textColor;
        };

        fixStyle(cleaned.styles);
        fixStyle(cleaned.headStyles);
        fixStyle(cleaned.bodyStyles);
        fixStyle(cleaned.footStyles);
        fixStyle(cleaned.alternateRowStyles);
        if(cleaned.columnStyles && typeof cleaned.columnStyles === 'object'){
          try{ Object.values(cleaned.columnStyles).forEach(cs=>fixStyle(cs)); }catch(_e){}
        }

        doc.autoTable(cleaned);
      }
    },

    /* Horizontal rule */
    _hline(doc, y, lw) {
      lw = lw || 0.3;
      doc.setLineWidth(lw);
      this._stroke(doc, C.LINE);
      doc.line(ML, y, ML + CW, y);
      doc.setLineWidth(0.2);
    },

    /* Diagonal line across a cell rect (for empty BC rows) */
    _diagLine(doc, x, y, w, h) {
      doc.setLineWidth(0.3);
      this._stroke(doc, C.BLACK);
      doc.line(x, y + h, x + w, y);
      doc.setLineWidth(0.2);
    },

    /* Filled rect + optional border */
    _rect(doc, x, y, w, h, fill, stroke) {
      if (fill) { this._fill(doc, fill); doc.rect(x, y, w, h, 'F'); }
      if (stroke) { this._stroke(doc, stroke); doc.rect(x, y, w, h, 'S'); }
    },

    /* Multiline text inside a bounding box */
    _mlText(doc, text, x, y, maxW, lineH) {
      lineH = lineH || 4.5;
      const lines = doc.splitTextToSize(String(text || ''), maxW);
      doc.text(lines, x, y);
      return y + lines.length * lineH;
    },

    /* ══════════════════════════════════════════════════════════
       COMPANY HEADER  (used by ALL documents)
       Returns: new Y after header
    ══════════════════════════════════════════════════════════ */
_drawCompanyHeader(doc, settings, startY) {
  let y = startY || MT;

  // ✅ Logos: same bounding box size on both sides (no async Image() — avoids 0×0 issues)
  // Slightly bigger, consistent logo slots (better balance + readability)
  const SLOT_W = 40;
  const SLOT_H = 20;

  const leftX  = ML;
  const rightX = PW - MR - SLOT_W;

  const logoL = settings.logoLeft  || settings.leftLogo  || '';
  const logoR = settings.logoRight || settings.rightLogo || '';

  const drawLogo = (src, slotX) => {
    if (!src) return;
    try {
      const fmt = src.startsWith('data:image/png') ? 'PNG'
                : src.startsWith('data:image/gif') ? 'GIF' : 'JPEG';

      // jsPDF can inspect image dimensions synchronously
      const props = (doc.getImageProperties) ? doc.getImageProperties(src) : null;
      const iw = props && props.width  ? props.width  : 1;
      const ih = props && props.height ? props.height : 1;
      const ar = iw / ih;

      // Fit inside the slot (preserve aspect ratio)
      let w = SLOT_W;
      let h = w / ar;
      if (h > SLOT_H) { h = SLOT_H; w = h * ar; }
      if (w > SLOT_W) { w = SLOT_W; h = w / ar; }

      const dx = slotX + (SLOT_W - w) / 2;
      const dy = y + (SLOT_H - h) / 2;

      doc.addImage(src, fmt, dx, dy, w, h);
    } catch (e) {
      // Fallback — logo is not critical
      try { doc.addImage(src, 'PNG', slotX, y, SLOT_W, SLOT_H); } catch (e2) { /* silent */ }
    }
  };

  drawLogo(logoL, leftX);
  drawLogo(logoR, rightX);

  // Company name (compact)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  this._tc(doc, C.PRIMARY);
  doc.text(settings.companyName || 'SPA DOUROUB ELDJAZAIR', PW / 2, y + 5.2, { align: 'center' });

  // Secondary lines (compact)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  this._tc(doc, C.BLACK);

  const secLines = [
    settings.capital || 'AU CAPITAL SOCIAL DE : 200 000 000.00 DA',
    [settings.nif, settings.rc].filter(Boolean).join('  '),
    [settings.address, settings.phone].filter(Boolean).join('  '),
    [settings.fax].filter(Boolean).join('  '),
    settings.email || ''
  ].filter(Boolean);

  let ly = y + 9.0;
  secLines.forEach(line => {
    // Prevent overflow with gentle wrapping
    const parts = doc.splitTextToSize(String(line), CW);
    parts.forEach(p => {
      doc.text(p, PW / 2, ly, { align: 'center' });
      ly += 3.0;
    });
  });

  // Ensure enough clearance for logos
  ly = Math.max(ly, y + SLOT_H + 2);

  // Header rule
  this._hline(doc, ly + 0.8, 0.4);
  this._stroke(doc, C.BLACK);

  return ly + 3;
},

    /* ══════════════════════════════════════════════════════════
       TITLE BANNER  (coloured rectangle with white text)
    ══════════════════════════════════════════════════════════ */
    _drawBanner(doc, text, y, bgColor, fontSize) {
      bgColor  = bgColor  || C.PRIMARY;
      fontSize = fontSize || 13;
      const h = 8;
      this._rect(doc, ML, y, CW, h, bgColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      this._tc(doc, C.WHITE);
      doc.text(text, PW / 2, y + 5.6, { align: 'center' });
      return y + h + 3;
    },

    /* ══════════════════════════════════════════════════════════
       PAGE FOOTER  "Page X sur Y"
    ══════════════════════════════════════════════════════════ */
    _drawFooter(doc, pageNum, totalPages) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this._tc(doc, C.GRAY_TXT);
      doc.text(`Page ${pageNum} sur ${totalPages}`, PW / 2, PH - 6, { align: 'center' });
    },

    /* ══════════════════════════════════════════════════════════
       KEY-VALUE ROW  (thin labelled strip)
    ══════════════════════════════════════════════════════════ */
    _drawInfoStrip(doc, items, y) {
      /* items = [{label, value}, …]  all on one line — compact 6mm */
      const h = 6;
      this._rect(doc, ML, y, CW, h, C.BG_INFO, C.LINE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      this._tc(doc, C.BLACK);
      const colW = CW / items.length;
      items.forEach((item, i) => {
        const x = ML + i * colW + 2;
        const txt = `${item.label} : ${item.value || '/'}`;
        doc.text(txt, x, y + 4.2);
      });
      return y + h + 1;
    },

    /* ══════════════════════════════════════════════════════════
       SIGNATURE BLOCK
       cols = [{label, value?}]
    ══════════════════════════════════════════════════════════ */
    _drawSigBlock(doc, cols, y, blockH) {
      blockH = blockH || 40;  // ✅ BIGGER for stamping (was 22mm)
      const colW = CW / cols.length;
      cols.forEach((col, i) => {
        const x = ML + i * colW;
        this._rect(doc, x, y, colW, blockH, null, C.LINE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        this._tc(doc, C.BLACK);
        doc.text(col.label, x + colW / 2, y + 6, { align: 'center' });
        if (col.value) {
          doc.setFont('helvetica', 'normal');
          doc.text(col.value, x + colW / 2, y + 14, { align: 'center' });
        }
      });
      return y + blockH + 4;
    },

    /* ══════════════════════════════════════════════════════════
       PUBLIC ROUTER
    ══════════════════════════════════════════════════════════ */
    export(type, id) {
      try {
        switch(type) {
          case 'das':      this._exportDA(id);       break;
          case 'dss':      this._exportDS(id);       break;
          case 'bc':       this._exportBC(id);       break;
          case 'br':       this._exportBR(id);       break;
          case 'dp':       this._exportDP(id);       break;
          case 'decharge': this._exportDecharge(id); break;
          case 'bsm':      this._exportBSM(id);      break;
          case 'pv':       this._exportPV(id);       break;
          case 'planTravail':
          case 'reparation': this._exportPlanTravail(id); break;
          default:         this._notify('Type PDF inconnu', 'error');
        }
      } catch(e) {
        console.error('PDF Export Error:', e);
        this._notify('Erreur PDF : ' + e.message, 'error');
      }
    },

    /* ══════════════════════════════════════════════════════════
       1.  DA — DEMANDE D'ACHAT
    ══════════════════════════════════════════════════════════ */
    _exportDA(id) {
      this._exportDemande('das', id, false);
    },

    /* ══════════════════════════════════════════════════════════
       2.  DS — DEMANDE DE SERVICE
    ══════════════════════════════════════════════════════════ */
    _exportDS(id) {
      this._exportDemande('dss', id, true);
    },

    _exportDemande(col, id, isDS) {
      const item = DB.getById(col, id);
      if (!item) { this._notify('Document introuvable', 'error'); return; }
      const settings = this._getSettings();
      const doc = this._newDoc();

      /* ── header ── */
      let y = this._drawCompanyHeader(doc, settings, MT);

      /* ── banner ── */
      y = this._drawBanner(doc, (isDS ? 'DEMANDE DE SERVICE' : "DEMANDE D'ACHAT") + (item.regularisee ? ' RÉGULARISÉE' : ''), y);

      /* ── Ref / Date ── */
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      doc.text(`Ref : ${item.ref || '......./DG/' + new Date().getFullYear()}`, ML, y);
      doc.text(`Le : ${this._autoDate(item.date)}`, PW - MR, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Veuillez trouver la commande ci-après :', ML, y);
      y += 5;

      /* ── Items table ── */
      const head = isDS
        ? [['N°', 'DÉSIGNATION', 'U', 'Qté', 'Observation']]
        : [['N°', 'DÉSIGNATION', 'U', 'Qté', 'Observation']];

      let bodyRows;
      if (isDS) {
        bodyRows = [[
          '01',
          item.description || 'Service demandé',
          'U',
          '1',
          item.prestataire ? 'Prestataire : ' + item.prestataire : (item.estimatedAmount ? 'Montant estimé : ' + this._formatCurrency(item.estimatedAmount) : '')
        ]];
      } else {
        bodyRows = (item.lines || []).map((line, i) => [
          String(i + 1).padStart(2, '0'),
          line.designation || '',
          line.unit || 'U',
          this._formatNumber(line.quantity || 0),
          line.observation || ''
        ]);
        if (!bodyRows.length) bodyRows = [['01', '', 'U', '', '']];
      }

      // Column widths MUST match CW so the table stays perfectly centered
      const colWidths = [15, 65, 12, 18, CW - (15 + 65 + 12 + 18)];
      this._autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: head,
        body: bodyRows,
        headStyles: {
          fillColor: C.PRIMARY,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8.5,
          cellPadding: 2,
        },
        bodyStyles: { fontSize: 8, cellPadding: 1.6 },
        columnStyles: {
          0: { halign: 'center', cellWidth: colWidths[0] },
          1: { halign: 'left',   cellWidth: colWidths[1] },
          2: { halign: 'center', cellWidth: colWidths[2] },
          3: { halign: 'center', cellWidth: colWidths[3] },
          4: { halign: 'left',   cellWidth: colWidths[4] }
        },
        didDrawPage: () => {}
      });
      y = doc.lastAutoTable.finalY + 6;

      /* ── Signature block — BIGGER for stamping ── */
      const validatedBy = item.validatedBy ? this._getUserFullName(item.validatedBy) : '';
      const validatedAt = item.validatedAt ? this._formatDate(item.validatedAt) : '';
      const dgContent   = item.status === 'validated'
        ? `Validé par : ${validatedBy}\nDate : ${validatedAt}`
        : '';

      const sigY = Math.max(y, PH - 70);  // Adjusted for bigger box
      const sigW = CW / 2;
      const sigH = 45;  // ✅ BIGGER (was 28mm)

      /* Left — Demandeur */
      this._rect(doc, ML, sigY, sigW - 2, sigH, null, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      doc.text('Demandeur :', ML + 2, sigY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(item.requester || '...................................', ML + 2, sigY + 11);
      doc.text(`Date : ${this._formatDate(item.date)}`, ML + 2, sigY + 18);
      doc.text('Signature : ...........................', ML + 2, sigY + 28);

      /* Right — DG */
      const rx = ML + sigW + 2;
      this._rect(doc, rx, sigY, sigW - 2, sigH, null, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.text('Avis du DG :', rx + 2, sigY + 6);
      doc.setFont('helvetica', 'normal');
      if (dgContent) {
        dgContent.split('\n').forEach((ln, i) => doc.text(ln, rx + 2, sigY + 11 + i * 6));
      } else {
        doc.text('Date : ........................................', rx + 2, sigY + 18);
      }
      doc.text('Signature : ...........................', rx + 2, sigY + 28);

      this._drawFooter(doc, 1, 1);
      this._save(doc, `${isDS ? 'DS' : 'DA'}_${item.ref || 'BROUILLON'}.pdf`);
    },

    /* ══════════════════════════════════════════════════════════
       3.  BC — BON DE COMMANDE
    ══════════════════════════════════════════════════════════ */
    _exportBC(id) {
      const bc = DB.getById('bcs', id);
      if (!bc) { this._notify('BC introuvable', 'error'); return; }

      const sup      = DB.getById('suppliers', bc.supplierId) || {};
      const settings = this._getSettings();
      const src      = (bc.sourceId && bc.sourceType) ? DB.getById(bc.sourceType, bc.sourceId) : null;

      const terms = settings.bcValidityTerms ||
        "SPA Douroub El Djazair se réserve le droit d'annuler ce bon de commande si la demande n'est pas honorée dans les délais convenus ;\n" +
        "SPA Douroub El Djazair se réserve le droit d'annuler le bon de commande dans le cas de non nécessité ;\n" +
        "Une copie du bon de commande doit être jointe avec la facture & le BL lors du dépôt (au secrétariat) ;\n" +
        "Pour les prestations de services, le prestataire doit fournir toutes les pièces requises par la SPA Douroub El Djazair ;";

      const doc = this._newDoc();

      /* ── Shared header builder (called on every page) ── */
      const buildPageHeader = (pageDoc) => {
        let y = this._drawCompanyHeader(pageDoc, settings, MT);
        y = this._drawBanner(pageDoc, 'BON DE COMMANDE' + (bc.regularisee ? ' RÉGULARISÉE' : ''), y);

        /* Date / BC N° */
        pageDoc.setFont('helvetica', 'bold');
        pageDoc.setFontSize(9);
        this._tc(pageDoc, C.BLACK);
        pageDoc.text(`DATE : ${this._autoDate(bc.date)}`, ML, y);
        pageDoc.text(`BC N° : ${bc.ref || 'BROUILLON'}`, PW - MR, y, { align: 'right' });
        y += 6;

        /* CLIENT + FOURNISSEUR boxes — 24mm height to fit all info including phone */
        const boxH = 30, boxW = (CW - 3) / 2;
        const HDR_H = 5.5;

        const _drawInfoBox = (lx, title, nameStr, addrStr, nifRc, tel, email) => {
          this._rect(pageDoc, lx, y, boxW, boxH, null, C.LINE);
          this._rect(pageDoc, lx, y, boxW, HDR_H, C.LIGHT);
          pageDoc.setFont('helvetica', 'bold');
          pageDoc.setFontSize(8);
          this._tc(pageDoc, C.PRIMARY);
          pageDoc.text(title, lx + boxW / 2, y + 3.8, { align: 'center' });
          pageDoc.setFont('helvetica', 'normal');
          this._tc(pageDoc, C.BLACK);
          pageDoc.setFontSize(7.5);
          const bLines = [nameStr, addrStr, nifRc, tel, email].filter(Boolean);
          bLines.forEach((line, i) => {
            pageDoc.text(line, lx + 2, y + HDR_H + 3.8 + i * 4, { maxWidth: boxW - 4 });
          });
        };

        _drawInfoBox(ML,
          'CLIENT',
          settings.companyName || 'SPA DOUROUB ELDJAZAIR',
          `Adresse : ${settings.address || '-'}`,
          `NIF : ${settings.nif || '-'}   RC : ${settings.rc || '-'}`,
          `Tél : ${settings.phone || '-'}`,
          settings.email ? `Email : ${settings.email}` : ''
        );
        _drawInfoBox(ML + boxW + 3,
          'FOURNISSEUR',
          sup.name || 'FOURNISSEUR',
          `Adresse : ${sup.address || '-'}`,
          `NIF : ${sup.nif || '-'}   RC : ${sup.rc || '-'}`,
          `Tél : ${sup.phone || '-'}`,
          sup.email ? `Email : ${sup.email}` : ''
        );
        y += boxH + 3;

        /* Info strip: DATE BC | DA/DS N° | LOT | CONDITIONS | MODE | DÉLAI */
        y = this._drawInfoStrip(pageDoc, [
          { label: 'DATE BC',        value: this._autoDate(bc.date) },
          { label: bc.sourceType === 'das' ? 'DA N°' : 'DS N°', value: src ? src.ref : '/' },
          { label: 'LOT',            value: bc.lot },
          { label: 'Cond. Paiement', value: bc.paymentTerms },
          { label: 'Mode',           value: bc.paymentMode },
          { label: 'Délai Livraison',value: bc.deliveryDelay },
        ], y);
        y += 1; // Extra spacing before table

        return y;
      };

      /* ── Build table rows ── */
      const lines     = bc.lines || [];
      const ROWS_PAGE = 10;  /* compact cells fit more rows */
      const totalPages = Math.max(1, Math.ceil(lines.length / ROWS_PAGE));

      /* -- Draw each page ── */
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage();

        let y = buildPageHeader(doc);

        const pageLines  = lines.slice(page * ROWS_PAGE, (page + 1) * ROWS_PAGE);
        const isLastPage = (page === totalPages - 1);

        /* Items table */
        const bodyRows = pageLines.map((line, i) => {
          const num   = String(page * ROWS_PAGE + i + 1).padStart(2, '0');
          const total = (line.quantity || 0) * (line.unitPrice || 0);
          return [
            num,
            line.designation || '',
            line.unit || 'U',
            this._formatNumber(line.quantity || 0),
            this._formatCurrency(line.unitPrice || 0, bc.currency),
            this._formatCurrency(total, bc.currency)
          ];
        });

        /* Totals rows (last page only) */
        const totalsRows = [];
        if (isLastPage) {
          const totalHT    = bc.totalHT    || 0;
          const remiseTotal= bc.remiseTotal|| 0;
          const netHT      = bc.netHT      || (totalHT - remiseTotal);
          const totalFees  = bc.totalFees  || 0;
          const tvaAmount  = bc.tvaAmount  || 0;
          const timbreAmount=bc.timbreAmount|| 0;
          const totalTTC   = bc.totalTTC   || 0;
          /* Single colSpan:4 cell with ONE diagonal — clean look */
          const mkTotalRow = (label, value, color) => {
            const spanCell = { content: '', colSpan: 4, _diagBlock: true, styles: { fillColor: [255, 255, 255], cellPadding: 0 } };
            const lCell = { content: label, styles: { halign: 'center', fontStyle: 'bold', fillColor: C.LIGHT, textColor: color || C.BLACK } };
            const vCell = { content: value, styles: { halign: 'center', fontStyle: 'bold', textColor: color || C.BLACK, fillColor: [255, 255, 255] } };
            return [spanCell, lCell, vCell];
          };

          totalsRows.push(mkTotalRow('TOTAL HT', this._formatCurrency(totalHT, bc.currency)));
          if (remiseTotal) {
            let remiseLabel = 'REMISE';
            if (Array.isArray(bc.remises) && bc.remises.length === 1) {
              const r = bc.remises[0] || {};
              const base = (r.label || 'REMISE').toString().trim();
              if (r.type === 'percent' && r.value !== undefined && r.value !== null && r.value !== '' && !isNaN(Number(r.value))) {
                remiseLabel = `${base} (${Number(r.value)}%)`;
              } else if (base) {
                remiseLabel = base;
              }
            } else if (Array.isArray(bc.remises) && bc.remises.some(rr => rr && rr.type === 'percent')) {
              remiseLabel = 'REMISE (%)';
            }
            totalsRows.push(mkTotalRow(remiseLabel, '- ' + this._formatCurrency(remiseTotal, bc.currency), C.RED));
            totalsRows.push(mkTotalRow('NET HT', this._formatCurrency(netHT, bc.currency)));
          }
          if (totalFees) {
            /* Render each fee line by name+description, or fallback to single total */
            if (bc.fees && bc.fees.length) {
              bc.fees.forEach(fee => {
                if ((fee.amount || 0) > 0) {
                  // Show description only (not type/name) — per user spec
                  const baseDesc = fee.description || fee.name || 'FRAIS SUPPL.';
                  const pctRaw = ((fee.type === 'percent' || fee.type === 'percentage') ? (fee.value ?? fee.percent ?? fee.rate) : null);
                  const pctNum = (pctRaw !== null && pctRaw !== undefined && pctRaw !== '' && !isNaN(Number(pctRaw))) ? Number(pctRaw) : null;
                  const fLabel = (pctNum !== null && !String(baseDesc).includes('%')) ? `${baseDesc} (${pctNum}%)` : baseDesc;
                  totalsRows.push(mkTotalRow(fLabel, this._formatCurrency(fee.amount, bc.currency)));
                }
              });
            } else {
              const feesLabel = bc.feesDescription || bc.extraFeesDescription || 'FRAIS SUPPL.';
              totalsRows.push(mkTotalRow(feesLabel, this._formatCurrency(totalFees, bc.currency)));
            }
          }
          if (bc.tvaRate) {
            totalsRows.push(mkTotalRow(`TVA (${bc.tvaRate}%)`, this._formatCurrency(tvaAmount, bc.currency)));
          }
          if (bc.timbreRate) {
            totalsRows.push(mkTotalRow(`TIMBRE (${bc.timbreRate}%)`, this._formatCurrency(timbreAmount, bc.currency)));
          }
          /* TTC row with full primary colour */
          const ttcSpan  = { content: '', colSpan: 4, _diagBlock: true, styles: { fillColor: [255, 255, 255], cellPadding: 0 } };
          const ttcLabel = { content: 'TOTAL TTC', styles: { halign: 'center', fontStyle: 'bold', fillColor: C.PRIMARY, textColor: C.WHITE } };
          const ttcValue = { content: this._formatCurrency(totalTTC, bc.currency), styles: { halign: 'center', fontStyle: 'bold', fillColor: C.PRIMARY, textColor: C.WHITE } };
          totalsRows.push([ttcSpan, ttcLabel, ttcValue]);

          // Mark diagonal block bounds (single clean diagonal)
          if (totalsRows.length) {
            const first = totalsRows[0][0];
            const last  = totalsRows[totalsRows.length - 1][0];
            if (first && typeof first === 'object') first._diagStart = true;
            if (last  && typeof last  === 'object') last._diagEnd   = true;
          }
        }
        const diag = { x: null, w: null, top: null, bottom: null, drawn: false };

        // Dense "no-writing" mesh in the reserved (blank) area.
        // We use a visible cross-hatch so it is VERY hard to add text by hand.
        const drawVoidDots = (x, top, w, bottom) => {
            const pad = 2; // keep inside the cell borders
            const left  = x + pad;
            const right = x + w - pad;
            const t     = top + pad;
            const b     = bottom - pad;
            if (right <= left || b <= t) return;

            // subtle background
            doc.setFillColor(250, 250, 250);
            doc.rect(left, t, right - left, b - t, 'F');

            const spacing = 0.6; // mm — ultra dense (anti-write)
            doc.setDrawColor(160, 160, 160);
            doc.setLineWidth(0.12);

            // Family 1: slope -1  (x - y = c)
            const cMin = left - b;
            const cMax = right - t;
            for (let c = cMin; c <= cMax; c += spacing) {
                const pts = [];
                const yL = left - c;   if (yL >= t && yL <= b) pts.push([left, yL]);
                const yR = right - c;  if (yR >= t && yR <= b) pts.push([right, yR]);
                const xT = c + t;      if (xT >= left && xT <= right) pts.push([xT, t]);
                const xB = c + b;      if (xB >= left && xB <= right) pts.push([xB, b]);
                if (pts.length >= 2) doc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
            }

            // Family 2: slope +1  (x + y = c)
            const cMin2 = left + t;
            const cMax2 = right + b;
            for (let c = cMin2; c <= cMax2; c += spacing) {
                const pts = [];
                const yL = c - left;   if (yL >= t && yL <= b) pts.push([left, yL]);
                const yR = c - right;  if (yR >= t && yR <= b) pts.push([right, yR]);
                const xT = c - t;      if (xT >= left && xT <= right) pts.push([xT, t]);
                const xB = c - b;      if (xB >= left && xB <= right) pts.push([xB, b]);
                if (pts.length >= 2) doc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
            }
        };

        // Column widths must ALWAYS fit CW (prevents AutoTable overflow warnings)
        let w0 = 12, w2 = 15, w3 = 18, w4 = 34, w5 = 40;
        let w1 = CW - (w0 + w2 + w3 + w4 + w5);
        const MIN_W1 = 55;
        if (w1 < MIN_W1) {
          const deficit = MIN_W1 - w1;
          const shrink = (curr, min, amount) => {
            const reducible = Math.max(0, curr - min);
            const take = Math.min(reducible, amount);
            return [curr - take, amount - take];
          };
          let rest = deficit;
          let r;
          r = shrink(w5, 30, rest); w5 = r[0]; rest = r[1];
          r = shrink(w4, 26, rest); w4 = r[0]; rest = r[1];
          r = shrink(w3, 14, rest); w3 = r[0]; rest = r[1];
          r = shrink(w2, 12, rest); w2 = r[0]; rest = r[1];
          r = shrink(w0, 10, rest); w0 = r[0]; rest = r[1];
          w1 = CW - (w0 + w2 + w3 + w4 + w5);
        }

        this._autoTable(doc, {
          startY: y,
          margin: { left: ML, right: MR },
          tableWidth: CW,
          theme: 'grid',
          head: [['N°', 'DÉSIGNATION DES FOURNITURES / SERVICES', 'UNITÉ', 'QTÉ', 'P.U. HT', 'TOTAL HT']],
          body: [...bodyRows, ...totalsRows],
          headStyles: {
            fillColor: C.PRIMARY,
            textColor: C.WHITE,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2,
          },
          bodyStyles: { fontSize: 7.6, cellPadding: 1.6, valign: 'middle' },
          columnStyles: {
            0: { halign: 'center', cellWidth: w0 },
            1: { halign: 'left',   cellWidth: w1, cellPadding: { top: 3, right: 2, bottom: 2, left: 2 } },
            2: { halign: 'center', cellWidth: w2 },
            3: { halign: 'center', cellWidth: w3 },
            4: { halign: 'center', cellWidth: w4 },
            5: { halign: 'center', cellWidth: w5 },
          },
          didDrawCell: (data) => {
            // Dot-filled void area for totals block (prevents manual additions)
            if (data.section !== 'body') return;
            if (data.column.index !== 0) return;

            const raw = (data.cell && data.cell.raw) ? data.cell.raw : null;
            if (!raw || !raw._diagBlock) return;

            // Collect block bounds (span cells)
            if (!diag.drawn) {
              if (diag.x === null) {
                diag.x = data.cell.x;
                diag.w = data.cell.width;
                diag.top = data.cell.y;
                diag.bottom = data.cell.y + data.cell.height;
              } else {
                diag.top = Math.min(diag.top, data.cell.y);
                diag.bottom = Math.max(diag.bottom, data.cell.y + data.cell.height);
              }
            }

            // Draw once at the end of the block
            if (raw._diagEnd && !diag.drawn && diag.x !== null) {
              drawVoidDots(diag.x, diag.top, diag.w, diag.bottom);
              diag.drawn = true;
            }
          }
        });
        y = doc.lastAutoTable.finalY + 3;

        /* Remarks */
        if (isLastPage && bc.bcRemarks) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          this._tc(doc, C.BLACK);
          doc.text('Remarques : ' + bc.bcRemarks, ML, y);
          y += 5;
        }

        /* Validity terms (last page) */
        if (isLastPage) {
          doc.setLineWidth(0.3);
          this._stroke(doc, C.LINE);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(ML, y, ML + CW, y);
          doc.setLineDashPattern([], 0);
          y += 3;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          this._tc(doc, C.BLACK);
          doc.text('Validité du bon de commande :', ML, y);
          y += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          terms.split('\n').forEach(line => {
            const wrapped = doc.splitTextToSize('• ' + line.trim(), CW - 4);
            wrapped.forEach(wl => { doc.text(wl, ML + 2, y); y += 3.5; });
          });
          y += 3;

          /* Signatures */
          this._drawSigBlock(doc, [
            { label: 'Le Fournisseur' },
            { label: 'Le Directeur Général' }
          ], y, 40);
        }

        this._drawFooter(doc, page + 1, totalPages);
      }

      this._save(doc, `BC_${bc.ref || 'BROUILLON'}.pdf`);
    },

    /* ══════════════════════════════════════════════════════════
       4.  BR — BON DE RÉCEPTION
    ══════════════════════════════════════════════════════════ */
    _exportBR(id) {
      const br = DB.getById('brs', id);
      if (!br) { this._notify('BR introuvable', 'error'); return; }

      const bc  = DB.getById('bcs', br.bcId) || {};
      const sup = DB.getById('suppliers', bc.supplierId) || {};
      const settings = this._getSettings();

      /* Receiver: use receiverName, or look up DA requester */
      let receiverName = br.receiverName || '';
      if (!receiverName && bc.sourceType === 'das') {
        const da = DB.getById('das', bc.sourceId);
        if (da) receiverName = da.requester || '';
      }

      const doc = this._newDoc();
      let y = this._drawCompanyHeader(doc, settings, MT);
      y = this._drawBanner(doc, `BON DE RÉCEPTION  N° ${br.ref || ''}`, y);

      /* Meta info */
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      const metaLines = [
        `${sup.name || 'Fournisseur : —'}`,
        `Bon de commande N° : ${bc.ref || '-'} du ${this._formatDate(bc.date)}`,
        `Bon de livraison N° : ${br.blReference || '-'} du ${this._formatDate(br.blDate)}`,
        `Facture N° : ${br.invoiceReference || '-'} du ${this._formatDate(br.invoiceDate)}`,
      ];
      metaLines.forEach(line => { doc.text(line, ML, y); y += 4.5; });
      y += 2;

      /* Items table */
      const bodyRows = (br.lines || []).map(line => {
        const total = (line.qtyReceived || 0) * (line.unitPrice || 0);
        return [
          line.designation || '',
          '/',
          line.unit || 'U',
          this._formatNumber(line.qtyReceived || 0),
          this._formatCurrency(line.unitPrice || 0, 'DA'),
          this._formatCurrency(total, 'DA'),
          line.conformity || '/'
        ];
      });

      this._autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: [['DÉSIGNATION', 'Famille', 'U.M', 'QTE', 'P.U.', 'MONTANT', 'Contrôle de\nconformité']],
        body: bodyRows,
        headStyles: {
          fillColor: C.PRIMARY,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8,
          cellPadding: 2,
        },
        bodyStyles: { fontSize: 7.6, cellPadding: 1.6, valign: 'middle' },
        columnStyles: {
          // Adjusted widths so sum == CW (centered)
          0: { halign: 'left',   cellWidth: 59 },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'center', cellWidth: 14 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 30 },
          5: { halign: 'center', cellWidth: 32 },
          6: { halign: 'center', cellWidth: 23 },
        }
      });
      y = doc.lastAutoTable.finalY + 5;

      /* Conformity statement */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      this._tc(doc, C.BLACK);
      doc.text(
        'Nous attestons que les fournitures réceptionnées sont conformes à la commande qualitativement et quantitativement.',
        ML, y, { maxWidth: CW }
      );
      y += 8;

      /* LA DG */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('LA DG', ML + CW / 2, y, { align: 'center' });
      y += 4;
      this._hline(doc, y);
      y += 8;

      /* Le Récepteur — BIGGER for stamping */
      const recX = ML + CW / 2;
      const recW = CW / 2;
      const recH = 40;  // ✅ BIGGER (was 22mm)
      this._rect(doc, recX, y, recW, recH, null, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      doc.text('Le Récepteur :', recX + 3, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nom et Prénom : ${receiverName || '.....................................'}`, recX + 3, y + 12);
      doc.text('Signature : ................................', recX + 3, y + recH - 8);

      this._drawFooter(doc, 1, 1);
      this._save(doc, `BR_${br.ref || 'BROUILLON'}.pdf`);
    },

    /* ══════════════════════════════════════════════════════════
       5.  DP — DEMANDE DE PAIEMENT
    ══════════════════════════════════════════════════════════ */
_exportDP(id) {
  const dp = DB.getById('dps', id);
  if (!dp) { this._notify('DP introuvable', 'error'); return; }
  const settings = this._getSettings();
  const doc = this._newDoc();

  /* Related documents (for audit trail) */
  const bc = dp.bcId ? DB.getById('bcs', dp.bcId) : null;
  const br = dp.brId ? DB.getById('brs', dp.brId) : null;
  const da = (bc && bc.sourceId && bc.sourceType) ? DB.getById(bc.sourceType, bc.sourceId) : null;

  /* Auto-fill references from BR if DP fields are empty */
  const invoiceRef  = dp.invoiceRef  || (br && br.invoiceReference) || '';
  const invoiceDate = dp.invoiceDate || (br && br.invoiceDate)      || '';
  const blRef       = dp.blRef       || (br && br.blReference)      || '';
  const blDate      = dp.blDate      || (br && br.blDate)           || '';

  /* ── Header ── */
  let y = this._drawCompanyHeader(doc, settings, MT);

  /* ── Modern blue title block (compact + professional) ── */
  const titleH = 12;
  this._fill(doc, C.PRIMARY);
  if (typeof doc.roundedRect === 'function') doc.roundedRect(ML, y, CW, titleH, 2, 2, 'F');
  else doc.rect(ML, y, CW, titleH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  this._tc(doc, C.WHITE);
  doc.text('DEMANDE DE PAIEMENT', PW / 2, y + 7.8, { align: 'center' });

  doc.setFontSize(9);
  doc.text('N° ' + (dp.ref || 'BROUILLON'), ML + CW - 2, y + 4.5, { align: 'right' });
  y += titleH + 5;

  /* ── 2-column summary cards ── */
  const gap = 4;
  const leftW = Math.round(CW * 0.62 * 10) / 10;
  const rightW = CW - leftW - gap;
  const cardH = 44;

  // LEFT CARD: Beneficiary & details
  const lx = ML;
  this._rect(doc, lx, y, leftW, cardH, C.WHITE, C.LINE);
  this._rect(doc, lx, y, leftW, 7.5, C.LIGHT, C.LINE);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  this._tc(doc, C.PRIMARY);
  doc.text('BÉNÉFICIAIRE & DÉTAILS', lx + 2.5, y + 5.2);

  // Beneficiary name (wrapped, bigger)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  this._tc(doc, C.BLACK);
  const benLines = doc.splitTextToSize(String(dp.beneficiary || ''), leftW - 5);
  doc.text(benLines, lx + 2.5, y + 13);

  let yy = y + 13 + (benLines.length - 1) * 4.2 + 6;

  const labelW = 34;
  const row = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    this._tc(doc, C.GRAY_TXT);
    doc.text(label, lx + 2.5, yy);

    doc.setFont('helvetica', 'normal');
    this._tc(doc, C.BLACK);
    const vLines = doc.splitTextToSize(String(value || '-'), leftW - labelW - 6);
    doc.text(vLines, lx + 2.5 + labelW, yy);

    yy += vLines.length * 4 + 1.2;
  };

  row('Date :', this._autoDate(dp.date));
  row('Structure :', dp.structureDem || 'Service Approvisionnement');
  row('Nature :', dp.nature || '-');
  // Contract (if linked)
  if (dp.contractId) {
    try{
      const ctr = DB.getById('contracts', dp.contractId);
      if (ctr) {
        const txt = (ctr.ref || '-') + (ctr.project ? (' • ' + ctr.project) : '');
        row('Contrat :', txt);
      }
    }catch(e){}
  }

  // External reference (avoid duplicating contract ref)
  if (dp.externalSource) {
    let ex = String(dp.externalSource || '').trim();
    if (dp.contractId) {
      try{
        const ctr2 = DB.getById('contracts', dp.contractId);
        if (ctr2 && ctr2.ref && ex === String(ctr2.ref).trim()) ex = '';
      }catch(e){}
    }
    if (ex) row('Réf. externe :', ex);
  }
  if (dp.paymentMode) row('Paiement :', dp.paymentMode);
  // NOTE: Statut intentionally omitted from PDF (requested)

  // RIGHT CARD: Amount & recap
  const rx = ML + leftW + gap;
  this._rect(doc, rx, y, rightW, cardH, C.BG_INFO, C.LINE);
  this._rect(doc, rx, y, rightW, 7.5, C.PRIMARY, C.LINE);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  this._tc(doc, C.WHITE);
  doc.text('RÉCAPITULATIF', rx + rightW / 2, y + 5.2, { align: 'center' });

  // Amount (big)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  this._tc(doc, C.PRIMARY);
  doc.text(this._formatCurrency(dp.amount || 0, 'DA') + ' TTC', rx + rightW / 2, y + 22, { align: 'center' });

  // Date & mode
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  this._tc(doc, C.GRAY_TXT);
  doc.text('Date : ' + this._autoDate(dp.date), rx + 3, y + 32);
  doc.text('Mode : ' + (dp.paymentMode || '-'), rx + 3, y + 38);

  y += cardH + 5;

  /* ── References block (auto from BR when possible) ── */
  const refH = 34;
  this._rect(doc, ML, y, CW, refH, C.LIGHT, C.LINE);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  this._tc(doc, C.PRIMARY_DARK || C.PRIMARY);
  doc.text('RÉFÉRENCES & PIÈCES JUSTIFICATIVES', ML + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  this._tc(doc, C.BLACK);

  const refs = [];
  if (da) refs.push(`• ${(bc && bc.sourceType === 'dss') ? 'DS' : 'DA'} : ${da.ref || '...'}  (${this._formatDate(da.date)})`);
  if (bc) refs.push(`• BC : ${bc.ref || '...'}  (${this._formatDate(bc.date)})`);
  if (br) refs.push(`• BR : ${br.ref || '...'}  (${this._formatDate(br.date)})`);

  refs.push(`• Facture : ${invoiceRef || '../20...'}${invoiceDate ? '  (' + this._formatDate(invoiceDate) + ')' : ''}`);
  refs.push(`• BL : ${blRef || '../20...'}${blDate ? '  (' + this._formatDate(blDate) + ')' : ''}`);

  let ry = y + 12;
  refs.forEach(line => {
    const wrapped = doc.splitTextToSize(line, CW - 6);
    doc.text(wrapped, ML + 3, ry);
    ry += wrapped.length * 4;
  });

  y += refH + 5;

  /* ── Amount in words ── */
  const words = dp.amountWords || this._amountWords(dp.amount || 0);
  const wordsBoxH = 16;
  this._rect(doc, ML, y, CW, wordsBoxH, C.BG_INFO, C.LINE);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  this._tc(doc, C.GRAY_TXT);
  doc.text('Montant en lettres :', ML + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  this._tc(doc, C.BLACK);
  const wLines = doc.splitTextToSize(String(words || ''), CW - 6);
  doc.text(wLines, ML + 3, y + 11);

  y += wordsBoxH + 4;

  /* ── Observation (optional) ── */
  if (dp.observation) {
    const obsH = 18;
    this._rect(doc, ML, y, CW, obsH, C.WHITE, C.LINE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    this._tc(doc, C.GRAY_TXT);
    doc.text('Observation :', ML + 3, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    this._tc(doc, C.BLACK);
    const oLines = doc.splitTextToSize(String(dp.observation), CW - 6);
    doc.text(oLines, ML + 3, y + 11);
    y += obsH + 4;
  }

  /* ── Signatures (bigger boxes for stamping) ── */
  const sigH = 36;
  if (y + sigH + 12 > PH) {
    doc.addPage();
    y = this._drawCompanyHeader(doc, settings, MT);
  }
  this._drawSigBlock(doc, [
    { label: 'Le Demandeur' },
    { label: 'Le Financier' },
    { label: 'D.G' }
  ], y, sigH);

  this._drawFooter(doc, 1, 1);
  this._save(doc, 'DP_' + (dp.ref || 'BROUILLON') + '.pdf');
},

    
    /* ══════════════════════════════════════════════════════════
       6.  PV — PV DE MISE À DISPOSITION
    ══════════════════════════════════════════════════════════ */
    _exportPV(id) {
      const pv = DB.getById('pvs', id);
      if (!pv) { this._notify('PV introuvable', 'error'); return; }

      const settings = this._getSettings();

      // We need JsBarcode for barcodes in PV. If it's not loaded yet,
      // load it once then continue generation automatically.
      this._ensureJsBarcode(() => {

        const doc = this._newDoc();

        let y = this._drawCompanyHeader(doc, settings, MT);
        y = this._drawBanner(doc, 'PV DE MISE À DISPOSITION', y);

        // Meta strip (compact, clean)
        y = this._drawInfoStrip(doc, [
          { label: 'Date', value: this._autoDate(pv.date) },
          { label: 'N° PV', value: pv.ref || '/' },
          { label: 'Décharge', value: pv.dechargeRef || '/' },
          { label: 'Décision', value: pv.decisionRef || '/' },
        ], y);

        // If the PV contains exactly ONE inventory code, render a big barcode on top
        const invCodes = Array.from(new Set((pv.lines || [])
          .map(l => String(l.inventoryCode || '').trim())
          .filter(c => c && c !== '-')));
        if(invCodes.length === 1){
          const code = invCodes[0];
          const firstLine = (pv.lines || []).find(l => String(l.inventoryCode||'').trim() === code) || null;
          const payload = this._barcodePayload(code, firstLine ? (firstLine.designation || '') : '');
          const img = this._barcodePngData(payload || code, { widthPx: 900, heightPx: 220 });
          if(img){
            const bcW = 95, bcH = 16;
            const bx = ML + (CW - bcW) / 2;
            doc.addImage(img, 'PNG', bx, y + 1, bcW, bcH);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            this._tc(doc, C.BLACK);
            doc.text(code, ML + CW/2, y + bcH + 7, { align: 'center' });
            y += bcH + 11;
          }
        }

        // Parties cards
        const gap = 4;
        const boxW = (CW - gap) / 2;
        const boxH = 22;
        const xL = ML;
        const xR = ML + boxW + gap;

        this._rect(doc, xL, y, boxW, boxH, C.BG_INFO, C.LINE);
        this._rect(doc, xR, y, boxW, boxH, C.BG_INFO, C.LINE);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        this._tc(doc, C.PRIMARY_DARK);
        doc.text('Émetteur', xL + 3, y + 6);
        doc.text('Bénéficiaire', xR + 3, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        this._tc(doc, C.BLACK);
        doc.text(pv.fromName || '/', xL + 3, y + 12);
        doc.text(pv.beneficiary || '/', xR + 3, y + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        this._tc(doc, C.GRAY_TXT);
        doc.text(pv.fromQualite || '', xL + 3, y + 16);
        doc.text(pv.qualite || '', xR + 3, y + 16);
        if (pv.cinBeneficiary) doc.text('CIN : ' + pv.cinBeneficiary, xR + 3, y + 20);

        y += boxH + 6;

        // Section title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        this._tc(doc, C.BLACK);
        doc.text('Liste du matériel mis à disposition', ML, y);
        y += 5;

        // Items table
        const rawPvLines = (pv.lines && pv.lines.length) ? pv.lines : (pv.items || []);
        const bodyRows = rawPvLines.map((line, i) => {
          let desig = line.designation;
          let val = line.value || ((line.quantity || 1) * (line.pump || line.price || 0)) || 0;
          if (!desig && line.articleId && typeof DB !== 'undefined') {
            const a = DB.getById ? DB.getById('articles', line.articleId) : (DB.getArticles ? DB.getArticles().find(x=>x.id===line.articleId) : null);
            if (a) { desig = a.designation; if (!val) val = (line.quantity || 1) * (a.price || 0); }
          }
          return [
            String(i + 1).padStart(2, '0'),
            desig || 'Article',
            line.ref || line.serial || '-',
            String(line.inventoryCode || '-').trim(),
            this._formatCurrency(val, 'DA'),
            line.affectation || pv.beneficiary || ''
          ];
        });
        if (!bodyRows.length) bodyRows.push(['01', 'Aucun matériel', '-', '-', this._formatCurrency(0, 'DA'), '']);

        const bcCache = Object.create(null);

        this._autoTable(doc, {
          startY: y,
          margin: { left: ML, right: MR },
          tableWidth: CW,
          theme: 'grid',
          head: [['N°', 'Désignation', 'Réf/N° série', "Code inventaire", 'Valeur (HT)', 'Affectation']],
          body: bodyRows,
          headStyles: {
            fillColor: C.PRIMARY,
            textColor: C.WHITE,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8.5,
            cellPadding: 2,
          },
          bodyStyles: { fontSize: 8, cellPadding: 2.2, minCellHeight: 12, valign: 'middle' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'left',   cellWidth: 60 },
            2: { halign: 'center', cellWidth: 36 },
            3: { halign: 'center', cellWidth: 30 },
            4: { halign: 'center', cellWidth: 28 },
            5: { halign: 'left',   cellWidth: 28 },
          },

          didParseCell: (data) => {
            if(data.section !== 'body') return;

            // Make "Réf/N° série" more visible
            if(data.column.index === 2){
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 9;
            }

            // We'll draw barcode + code text ourselves in Code inventaire column
            if(data.column.index === 3){
              data.cell.text = [''];
              data.cell.styles.minCellHeight = 14;
              data.cell.styles.cellPadding = 1.2;
            }
          },

          didDrawCell: (data) => {
            if(data.section !== 'body') return;
            if(data.column.index !== 3) return;

            const code = String(data.cell.raw || '').trim();
            const rowRaw = (data.row && data.row.raw) ? data.row.raw : null;
            const designation = rowRaw && rowRaw[1] ? String(rowRaw[1]) : '';
            const payload = this._barcodePayload(code, designation);
            const x = data.cell.x, y0 = data.cell.y, w = data.cell.width, h = data.cell.height;

            if(!code || code === '-'){
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              this._tc(doc, C.GRAY_TXT);
              doc.text('-', x + w/2, y0 + h/2 + 2, { align: 'center' });
              return;
            }

            // barcode (upper part of the cell)
            const cacheKey = payload || code;
            let img = bcCache[cacheKey];
            if(!img){
              img = this._barcodePngData(cacheKey, { widthPx: 760, heightPx: 180 });
              if(img) bcCache[cacheKey] = img;
            }
            if(img){
              const imgW = w - 2.2;
              const imgH = Math.min(9.2, h - 5.5);
              const imgX = x + (w - imgW) / 2;
              const imgY = y0 + 1.1;
              doc.addImage(img, 'PNG', imgX, imgY, imgW, imgH);
            }

            // code (bottom)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.6);
            this._tc(doc, C.BLACK);
            doc.text(code, x + w/2, y0 + h - 1.3, { align: 'center' });
          }
        });

        y = doc.lastAutoTable.finalY + 5;

        // Observations
        const obsH = 22;
        this._rect(doc, ML, y, CW, obsH, null, C.LINE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        this._tc(doc, C.BLACK);
        doc.text('Observations :', ML + 3, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        this._tc(doc, C.GRAY_TXT);
        const obsTxt = pv.observations || '';
        if (obsTxt) {
          const lines = doc.splitTextToSize(obsTxt, CW - 8);
          doc.text(lines, ML + 3, y + 11);
        } else {
          doc.text('........................................................................................................', ML + 3, y + 11);
          doc.text('........................................................................................................', ML + 3, y + 16);
        }
        y += obsH + 6;

        // Signatures near bottom (bigger, consistent)
        const sigH = 45;
        const sigY = Math.max(y, PH - sigH - 18);
        this._drawSigBlock(doc, [
          { label: 'Le bénéficiaire', value: pv.beneficiary || '' },
          { label: 'Cellule matériels et services' },
          { label: 'Le Directeur Général' }
        ], sigY, sigH);

        // Note (always above footer)
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        this._tc(doc, C.GRAY_TXT);
        doc.text("Note : ce PV est réservé pour le matériel d'investissement.", ML, PH - 12);

        this._drawFooter(doc, 1, 1);
        this._save(doc, `PV_${pv.ref || 'BROUILLON'}.pdf`);
      });
    },
/* ══════════════════════════════════════════════════════════
       7.  DÉCHARGE
    ══════════════════════════════════════════════════════════ */
    _exportDecharge(id) {
      const dec = DB.getById('decharges', id);
      if (!dec) { this._notify('Décharge introuvable', 'error'); return; }
      const settings = this._getSettings();
      const doc = this._newDoc();

      let y = this._drawCompanyHeader(doc, settings, MT);
      const bannerTitle = (dec.type === 'return' || dec.type === 'retour') ? 'BON DE RETOUR' : 'DÉCHARGE';
      y = this._drawBanner(doc, bannerTitle, y);

      // Find material / truck if assigned
      let matInfo = '';
      if (dec.materialId && typeof DB !== 'undefined') {
        const mat = DB.getFleet ? DB.getFleet().find(f => f.id === dec.materialId) : null;
        if (mat) matInfo = `${mat.name} (${mat.immatriculation})`;
      }
      if (!matInfo && dec.immatriculation) {
        matInfo = `${dec.materialName || 'Véhicule'} (${dec.immatriculation})`;
      }

      // Meta strip
      const metaItems = [
        { label: 'Date', value: this._autoDate(dec.date) },
        { label: 'N°', value: dec.ref || '/' },
        { label: 'Service', value: dec.service || '/' },
      ];
      if (matInfo) {
        metaItems.push({ label: 'Véhicule / Camion', value: matInfo });
      }
      y = this._drawInfoStrip(doc, metaItems, y);

      // Parties cards
      const gap = 4;
      const boxW = (CW - gap) / 2;
      const boxH = 24;
      const xL = ML;
      const xR = ML + boxW + gap;

      this._rect(doc, xL, y, boxW, boxH, C.BG_INFO, C.LINE);
      this._rect(doc, xR, y, boxW, boxH, C.BG_INFO, C.LINE);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('Signataire', xL + 3, y + 6);
      doc.text("Bénéficiaire", xR + 3, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this._tc(doc, C.BLACK);
      doc.text(dec.fromName || '/', xL + 3, y + 12);
      doc.text(dec.beneficiary || '/', xR + 3, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      this._tc(doc, C.GRAY_TXT);
      doc.text(dec.fromQualite || '', xL + 3, y + 16);
      doc.text(dec.qualite || '', xR + 3, y + 16);
      if (dec.cinBeneficiary) doc.text('CIN : ' + dec.cinBeneficiary, xR + 3, y + 20);

      y += boxH + 6;

      // Short statement (keeps the legal/administrative meaning, but compact)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      let stmt = `Je soussigné(e) ${dec.fromName || ''}, agissant en qualité de ${dec.fromQualite || ''}, ` +
                 `certifie avoir remis à ${dec.beneficiary || ''} (${dec.qualite || ''}) le matériel ci-dessous`;
      if (matInfo) stmt += ` pour affectation au véhicule / engin : ${matInfo}.`;
      else stmt += `.`;
      const stmtLines = doc.splitTextToSize(stmt, CW);
      doc.text(stmtLines, ML, y);
      y += stmtLines.length * 4.6 + 4;

      // Items table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this._tc(doc, C.BLACK);
      doc.text('Articles déchargés', ML, y);
      y += 5;

      const rawLines = (dec.lines && dec.lines.length) ? dec.lines : (dec.items || []);
      const rows = rawLines.map((line, i) => {
        const qty = line.quantity || 0;
        let desig = line.designation;
        let unit = line.unit || 'U';
        if (!desig && line.articleId && typeof DB !== 'undefined') {
          const a = DB.getById ? DB.getById('articles', line.articleId) : (DB.getArticles ? DB.getArticles().find(x=>x.id===line.articleId) : null);
          if (a) { desig = a.designation; unit = a.unit || 'U'; }
        }
        return [
          String(i + 1).padStart(2, '0'),
          desig || 'Article',
          unit,
          this._formatNumber(qty)
        ];
      });
      if (!rows.length) rows.push(['01', 'Aucun article', 'U', '0']);

      this._autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: [['N°', 'Désignation', 'U', 'Qté']],
        body: rows,
        headStyles: {
          fillColor: C.PRIMARY,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8.5,
          cellPadding: 2,
        },
        bodyStyles: { fontSize: 8, cellPadding: 2.2, minCellHeight: 10, valign: 'middle' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left',   cellWidth: 124 },
          2: { halign: 'center', cellWidth: 14 },
          3: { halign: 'center', cellWidth: 30 },
        }
      });
      y = doc.lastAutoTable.finalY + 6;

      // Reason (optional field if you add it later)
      const reason = dec.reason || "À titre de prêt, je m'engage à le(s) restituer conformément à notre promesse.";
      const rH = 16;
      this._rect(doc, ML, y, CW, rH, C.BG_INFO, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      this._tc(doc, C.BLACK);
      doc.text('Raison :', ML + 3, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      this._tc(doc, C.GRAY_TXT);
      const rLines = doc.splitTextToSize(reason, CW - 18);
      doc.text(rLines, ML + 18, y + 6);
      y += rH + 6;

      // Signatures
      const sigH = 45;
      const sigY = Math.max(y, PH - sigH - 18);
      this._drawSigBlock(doc, [
        { label: 'Le signataire', value: dec.fromName || '' },
        { label: "L'intéressé(e)", value: dec.beneficiary || '' }
      ], sigY, sigH);

      this._drawFooter(doc, 1, 1);
      const fname = (dec.type === 'return' || dec.type === 'retour') ? `BON_RETOUR_${dec.ref || 'BROUILLON'}.pdf` : `DECHARGE_${dec.ref || 'BROUILLON'}.pdf`;
      this._save(doc, fname);
    },

    /* ══════════════════════════════════════════════════════════
       7B. BON DE SORTIE DU MAGASIN (B.S.M)
    ══════════════════════════════════════════════════════════ */
    _exportBSM(id) {
      let dec = null;
      if (typeof DB !== 'undefined') {
        if (DB.getById) dec = DB.getById('decharges', id);
        if (!dec && DB.data && Array.isArray(DB.data.decharges)) {
          dec = DB.data.decharges.find(d => d.id === id || d.ref === id || d.bsmRef === id);
        }
      }
      if (!dec) { this._notify('Document BSM introuvable', 'error'); return; }
      const settings = this._getSettings();
      const doc = this._newDoc();

      let y = this._drawCompanyHeader(doc, settings, MT);
      const bsmRef = dec.bsmRef || ('BSM-' + new Date().getFullYear() + '-' + String(dec.ref || '').replace(/[^0-9]/g, '').slice(-4) || 'BSM-2026-0001');
      y = this._drawBanner(doc, 'BON DE SORTIE DU MAGASIN (B.S.M)', y);

      let matInfo = '';
      if (dec.materialId && typeof DB !== 'undefined') {
        const mat = DB.getFleet ? DB.getFleet().find(f => f.id === dec.materialId) : null;
        if (mat) matInfo = `${mat.name} (${mat.immatriculation})`;
      }
      if (!matInfo && dec.immatriculation) {
        matInfo = `${dec.materialName || 'Véhicule'} (${dec.immatriculation})`;
      }

      const metaItems = [
        { label: 'Date', value: this._autoDate(dec.date) },
        { label: 'N° BSM', value: bsmRef },
        { label: 'Service Demandeur', value: dec.service || 'Maintenance & Flotte' },
      ];
      if (matInfo) metaItems.push({ label: 'Véhicule / Affectation', value: matInfo });
      if (dec.workPlanRef) metaItems.push({ label: 'Ordre de Travail Lié', value: dec.workPlanRef });
      y = this._drawInfoStrip(doc, metaItems, y);

      // Parties cards
      const gap = 4;
      const boxW = (CW - gap) / 2;
      const boxH = 22;
      const xL = ML;
      const xR = ML + boxW + gap;

      this._rect(doc, xL, y, boxW, boxH, C.BG_INFO, C.LINE);
      this._rect(doc, xR, y, boxW, boxH, C.BG_INFO, C.LINE);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('Magasinier Émetteur', xL + 3, y + 5.5);
      doc.text("Bénéficiaire / Réceptionnaire", xR + 3, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      this._tc(doc, C.BLACK);
      doc.text(dec.fromName || 'LEKCIR YASSINE', xL + 3, y + 11.5);
      doc.text(dec.beneficiary || '/', xR + 3, y + 11.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this._tc(doc, C.GRAY_TXT);
      doc.text(dec.fromQualite || 'Gestionnaire de Stock', xL + 3, y + 16.5);
      doc.text(dec.qualite || 'Demandeur / Chauffeur', xR + 3, y + 16.5);

      y += boxH + 5;

      // Table of Items
      const rawLines = (dec.lines && dec.lines.length) ? dec.lines : (dec.items || []);
      const rows = rawLines.map((line, i) => {
        const qty = line.quantity || line.qty || 0;
        let desig = line.designation;
        let ref = line.code || line.ref || '';
        let unit = line.unit || 'U';
        if ((!desig || !ref) && line.articleId && typeof DB !== 'undefined') {
          const a = DB.getById ? DB.getById('articles', line.articleId) : (DB.getArticles ? DB.getArticles().find(x=>x.id===line.articleId) : null);
          if (a) { desig = desig || a.designation; ref = ref || a.code; unit = a.unit || 'U'; }
        }
        return [
          String(i + 1).padStart(2, '0'),
          ref || 'PDR',
          desig || 'Article',
          unit,
          this._formatNumber(qty),
          line.obs || 'Sortie conforme'
        ];
      });
      if (!rows.length) rows.push(['01', 'PDR', 'Kit maintenance', 'U', '1', 'Délivré']);

      this._autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: [['N°', 'Code OEM', 'Désignation Pièce / Fourniture', 'U', 'Qté', 'Observations']],
        body: rows,
        headStyles: {
          fillColor: C.PRIMARY_DARK,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8,
          cellPadding: 2,
        },
        bodyStyles: { fontSize: 7.5, cellPadding: 2, minCellHeight: 8, valign: 'middle' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 26 },
          2: { halign: 'left',   cellWidth: 84 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'left',   cellWidth: 32 },
        }
      });
      y = doc.lastAutoTable.finalY + 5;

      // Notice SCF
      const scfH = 12;
      this._rect(doc, ML, y, CW, scfH, C.BG_INFO, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('Imputation Comptable (SCF Algérie) :', ML + 3, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      this._tc(doc, C.GRAY_TXT);
      doc.text('Articles sortis définitivement du stock magasin pour consommation immédiate. Débit Cpte 60 / Crédit Cpte 31-32.', ML + 3, y + 8.5);
      y += scfH + 5;

      // Triple Signatures
      const sigH = 38;
      const sigY = Math.max(y, PH - sigH - 18);
      this._drawSigBlock(doc, [
        { label: '1. Le Magasinier Émetteur', value: dec.fromName || 'LEKCIR YASSINE' },
        { label: '2. Chef Section Stocks', value: 'LEKCIR YASSINE' },
        { label: '3. Le Réceptionnaire', value: dec.beneficiary || '' }
      ], sigY, sigH);

      this._drawFooter(doc, 1, 1);
      const fname = `${bsmRef}.pdf`;
      this._save(doc, fname);
    },

    /* ══════════════════════════════════════════════════════════
       ORDRE DE RÉPARATION / BON DE TRAVAIL & DÉCHARGE (2 PAGES)
    ══════════════════════════════════════════════════════════ */
    _exportPlanTravail(id) {
      let plan = null;
      if (typeof DB !== 'undefined') {
        if (DB.getById) plan = DB.getById('workPlans', id);
        if (!plan && DB.data && Array.isArray(DB.data.workPlans)) {
          plan = DB.data.workPlans.find(p => p.id === id || p.ref === id);
        }
        if (!plan && DB.getAll) {
          const list = DB.getAll('workPlans');
          if (Array.isArray(list)) plan = list.find(p => p.id === id || p.ref === id);
        }
      }
      if (!plan) {
        this._notify('Bon de travail introuvable', 'error');
        return;
      }

      const settings = this._getSettings();
      const doc = this._newDoc();

      // Linked Décharge record or fallback reference
      let decharge = null;
      if (typeof DB !== 'undefined') {
        const decharges = (DB.data && DB.data.decharges) || (DB.getAll ? DB.getAll('decharges') : []);
        decharge = decharges.find(d => d.id === plan.dechargeId || d.ref === plan.dechargeRef || d.workPlanId === plan.id);
      }
      const dechargeRef = plan.dechargeRef || (decharge && decharge.ref) || ('DCH-2026-' + String(plan.ref || '').replace(/\D/g, '').slice(-4));

      const immat = plan.immatriculation || plan.matricule || plan.vehicleMatricule || 'Non spécifié';
      const brand = plan.brand || plan.vehicleBrand || plan.marque || '';
      const model = plan.model || plan.vehicleModel || plan.modele || '';
      const vehName = (brand || model) ? `${brand} ${model}`.trim() : (plan.vehicleName || 'Flotte Douroub');
      const kmStr = (plan.km || plan.kilometrage || '0') + ' km';
      const driver = plan.driver || plan.chauffeur || 'Atelier Maintenance';
      const type = plan.typeIntervention || 'Corrective';
      const organs = Array.isArray(plan.affectedOrgans) ? plan.affectedOrgans.join(', ') : (plan.affectedOrgans || plan.selectedOrgans || 'Système général');
      const diagnostic = plan.defectDescription || plan.diagnostic || plan.description || plan.observations || 'Maintenance périodique et révision technique des organes.';
      const travaux = plan.workDone || plan.travaux || plan.travauxRealises || 'Démontage, remplacement des pièces défectueuses, calage, serrage et essais sur piste.';

      /* ── Page 1 (Recto) : Ordre de Réparation / Bon de Travail ── */
      let y = this._drawCompanyHeader(doc, settings, MT);
      y = this._drawBanner(doc, 'ORDRE DE RÉPARATION / BON DE TRAVAIL', y);

      // N° BT, Date, and Décharge Ref
      y = this._drawInfoStrip(doc, [
        { label: 'N° Bon de Travail', value: plan.ref || 'BT-2026' },
        { label: 'Date d\'émission', value: this._autoDate(plan.date) },
        { label: 'Réf Décharge Magasin', value: dechargeRef }
      ], y);
      y += 2;

      // Metadata Grid: Véhicule (Matricule, Marque, Modèle), Kilométrage, Chauffeur, Type d'intervention, Organes affectés
      const metaBoxH = 22;
      this._rect(doc, ML, y, CW, metaBoxH, C.BG_INFO, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('1. IDENTIFICATION DU VÉHICULE & AFFECTATION', ML + 3, y + 4.5);
      this._hline(doc, y + 6, 0.2);

      const col1X = ML + 3;
      const col2X = ML + (CW / 2) + 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.BLACK);
      doc.text('Véhicule :', col1X, y + 10.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${vehName} (${immat})`, col1X + 22, y + 10.5);

      doc.setFont('helvetica', 'bold');
      doc.text('Kilométrage :', col2X, y + 10.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${kmStr}`, col2X + 24, y + 10.5);

      doc.setFont('helvetica', 'bold');
      doc.text('Chauffeur :', col1X, y + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`${driver}`, col1X + 22, y + 15);

      doc.setFont('helvetica', 'bold');
      doc.text('Intervention :', col2X, y + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`${type}`, col2X + 24, y + 15);

      doc.setFont('helvetica', 'bold');
      doc.text('Organes :', col1X, y + 19.5);
      doc.setFont('helvetica', 'normal');
      const orgLines = doc.splitTextToSize(organs, CW - 32);
      doc.text(orgLines[0] || organs, col1X + 22, y + 19.5);

      y += metaBoxH + 3;

      // Diagnostic
      const diagH = 13;
      this._rect(doc, ML, y, CW, diagH, C.WHITE, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('2. DESCRIPTION DU DIAGNOSTIC / ANOMALIE CONSTATÉE', ML + 3, y + 4);
      this._hline(doc, y + 5.5, 0.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      this._tc(doc, C.BLACK);
      const diagLines = doc.splitTextToSize(diagnostic, CW - 6);
      doc.text(diagLines.slice(0, 2), ML + 3, y + 9);
      y += diagH + 3;

      // Travaux Réalisés
      const travH = 13;
      this._rect(doc, ML, y, CW, travH, C.WHITE, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('3. TRAVAUX ET OPÉRATIONS RÉALISÉES', ML + 3, y + 4);
      this._hline(doc, y + 5.5, 0.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      this._tc(doc, C.BLACK);
      const travLines = doc.splitTextToSize(travaux, CW - 6);
      doc.text(travLines.slice(0, 2), ML + 3, y + 9);
      y += travH + 3;

      // AutoTable for Pièces de Rechange (Désignation, Réf Stock, Qté, Observation)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('4. PIÈCES DE RECHANGE ET CONSOMMABLES UTILISÉS', ML, y + 1);
      y += 3;

      const parts = Array.isArray(plan.parts) ? plan.parts : [];
      const partRows = parts.map((p, idx) => [
        String(idx + 1).padStart(2, '0'),
        p.designation || p.name || 'Pièce détachée',
        p.refStock || p.ref || p.reference || 'PDR',
        String(p.quantity || p.qty || 1) + (p.unit ? (' ' + p.unit) : ''),
        p.observation || p.obs || 'Dotation Atelier'
      ]);
      if (!partRows.length) {
        partRows.push(['01', 'Aucune pièce consommée (main d\'œuvre seule)', '—', '0', 'R.A.S']);
      }

      this._autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: [['N°', 'Désignation Pièce de Rechange', 'Réf Stock', 'Qté', 'Observation']],
        body: partRows,
        headStyles: {
          fillColor: C.PRIMARY,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8,
          cellPadding: 1.8
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left',   cellWidth: 80 },
          2: { halign: 'center', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'left',   cellWidth: CW - 10 - 80 - 35 - 18 }
        }
      });
      y = doc.lastAutoTable.finalY + 4;

      // Signatures block with 3 operational boxes:
      // 1. Chauffeur / Demandeur
      // 2. Chef Section Méthode (TOUNSI ALI)
      // 3. Gestionnaire de Stock (LEKCIR YASSINE)
      // (CRITICAL: NO PDG / Directeur Général signature box!)
      const sigH = 32;
      const sigY = Math.max(y, PH - sigH - 12);
      this._drawSigBlock(doc, [
        { label: 'Chauffeur / Demandeur', value: driver },
        { label: 'Chef Section Méthode', value: 'TOUNSI ALI' },
        { label: 'Gestionnaire de Stock', value: 'LEKCIR YASSINE' }
      ], sigY, sigH);

      this._drawFooter(doc, 1, 2);

      /* ── Page 2 (Verso) : Bon de Décharge Magasin (Volet 2) ── */
      doc.addPage();

      let y2 = this._drawCompanyHeader(doc, settings, MT);
      y2 = this._drawBanner(doc, 'BON DE DÉCHARGE MAGASIN (VOLET 2)', y2);

      // N° Décharge, "Lié au Bon de Travail N° ...", Date
      y2 = this._drawInfoStrip(doc, [
        { label: 'N° Décharge Magasin', value: dechargeRef },
        { label: 'Lié au Bon de Travail N°', value: plan.ref || 'BT-2026' },
        { label: 'Date d\'émission', value: this._autoDate(plan.date) }
      ], y2);
      y2 += 2;

      // Metadata: Véhicule, Bénéficiaire, Service
      const metaBoxH2 = 18;
      this._rect(doc, ML, y2, CW, metaBoxH2, C.BG_INFO, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('1. AFFECTATION LOGISTIQUE & BÉNÉFICIAIRE', ML + 3, y2 + 4.5);
      this._hline(doc, y2 + 6, 0.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.BLACK);
      doc.text('Véhicule / Matériel :', col1X, y2 + 10.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${vehName} (${immat})`, col1X + 32, y2 + 10.5);

      doc.setFont('helvetica', 'bold');
      doc.text('Service :', col2X, y2 + 10.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Maintenance Flotte & Exploitation', col2X + 18, y2 + 10.5);

      doc.setFont('helvetica', 'bold');
      doc.text('Bénéficiaire :', col1X, y2 + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`${driver}`, col1X + 32, y2 + 15);

      doc.setFont('helvetica', 'bold');
      doc.text('Magasin Source :', col2X, y2 + 15);
      doc.setFont('helvetica', 'normal');
      doc.text('GDS — Magasin Central Douroub', col2X + 28, y2 + 15);

      y2 += metaBoxH2 + 3;

      // Legal statement
      const stmtH = 11;
      this._rect(doc, ML, y2, CW, stmtH, C.WHITE, C.LINE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('2. ENGAGEMENT & DÉCHARGE LÉGALE DU RÉCEPTIONNAIRE', ML + 3, y2 + 4);
      this._hline(doc, y2 + 5.2, 0.2);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      this._tc(doc, C.BLACK);
      const legalText = "Je soussigné(e) bénéficiaire, atteste avoir réceptionné en bon état et conformes les articles énumérés ci-dessous pour les travaux du véhicule désigné.";
      doc.text(legalText, ML + 3, y2 + 8.8);
      y2 += stmtH + 3;

      // AutoTable for Articles délivrés
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this._tc(doc, C.PRIMARY_DARK);
      doc.text('3. ARTICLES ET FOURNITURES DÉLIVRÉS PAR LE MAGASIN', ML, y2 + 1);
      y2 += 3;

      const dechArticles = (decharge && ((decharge.lines && decharge.lines.length) ? decharge.lines : decharge.items)) || plan.parts || [];
      const dechRows = (dechArticles.length ? dechArticles : (plan.parts || [])).map((item, idx) => {
        const qty = item.quantity || item.qty || 1;
        let desig = item.designation || item.name;
        let ref = item.refStock || item.ref || item.reference || 'PDR';
        let unit = item.unit || 'U';
        let obs = item.observation || item.obs || 'Délivré en bon état';
        return [
          String(idx + 1).padStart(2, '0'),
          desig || 'Article Magasin',
          ref,
          unit,
          this._formatNumber(qty),
          obs
        ];
      });
      if (!dechRows.length) {
        dechRows.push(['01', 'Kit maintenance standard (lubrifiants & filtres)', 'REF-STD', 'U', '1', 'Délivré conforme']);
      }

      this._autoTable(doc, {
        startY: y2,
        margin: { left: ML, right: MR },
        tableWidth: CW,
        theme: 'grid',
        head: [['N°', 'Désignation Article Magasin', 'Réf Stock', 'U', 'Qté Servie', 'Observation Magasin']],
        body: dechRows,
        headStyles: {
          fillColor: C.PRIMARY,
          textColor: C.WHITE,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8,
          cellPadding: 1.8
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left',   cellWidth: 78 },
          2: { halign: 'center', cellWidth: 32 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'left',   cellWidth: CW - 10 - 78 - 32 - 12 - 20 }
        }
      });
      y2 = doc.lastAutoTable.finalY + 4;

      // Signatures: Magasinier GDS, Bénéficiaire, Chef de Section Gestion de Stock
      const sigH2 = 32;
      const sigY2 = Math.max(y2, PH - sigH2 - 12);
      this._drawSigBlock(doc, [
        { label: 'Magasinier GDS', value: 'LEKCIR YASSINE' },
        { label: 'Bénéficiaire', value: driver },
        { label: 'Chef de Section Gestion de Stock', value: 'LEKCIR YASSINE' }
      ], sigY2, sigH2);

      this._drawFooter(doc, 2, 2);

      // Save as Ordre_Reparation_${ref}_2Pages.pdf
      const refClean = String(plan.ref || 'BT-2026').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Ordre_Reparation_${refClean}_2Pages.pdf`;
      this._save(doc, filename);
    },


    /* ══════════════════════════════════════════════════════════
       Inventory labels — print selected inventory codes
       Layout: A4 · 24 labels per page (3 × 8)
    ══════════════════════════════════════════════════════════ */
    exportInvLabels(items){
      items = Array.isArray(items) ? items : [];
      const clean = items
        .map(it => ({
          code: String(it?.code || '').trim(),
          series: String(it?.series || '').trim(),
          designation: String(it?.designation || '').replace(/\s+/g,' ').trim()
        }))
        .filter(it => it.code);

      if(!clean.length){
        this._notify('Aucun code inventaire sélectionné.', 'warning');
        return;
      }

      this._ensureJsBarcode(() => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const margin = 6;
        const cols = 3, rows = 8;
        const perPage = cols * rows;

        const labelW = (PW - margin * 2) / cols;
        const labelH = (PH - margin * 2) / rows;

        const cache = Object.create(null);
        const pages = Math.max(1, Math.ceil(clean.length / perPage));

        for(let p=0; p<pages; p++){
          if(p > 0) doc.addPage();

          // Light cutting grid
          doc.setDrawColor(...C.LINE);
          doc.setLineWidth(0.1);
          for(let r=0; r<rows; r++){
            for(let c=0; c<cols; c++){
              const x = margin + c * labelW;
              const y = margin + r * labelH;
              doc.rect(x, y, labelW, labelH);
            }
          }

          const start = p * perPage;
          const end = Math.min(start + perPage, clean.length);

          for(let i=start; i<end; i++){
            const pos = i - start;
            const r = Math.floor(pos / cols);
            const c = pos % cols;

            const x = margin + c * labelW;
            const y = margin + r * labelH;

            const code = clean[i].code;
            const series = clean[i].series;
            const des = clean[i].designation;
            const payload = this._barcodePayload(code, des);

            // Small series tag (optional)
            if(series){
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(80);
              doc.text(series, x + 2.5, y + 4);
            }

            // Optional designation line (kept short)
            if(des){
              const dTxt = des.length > 30 ? (des.slice(0,30) + '…') : des;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.2);
              doc.setTextColor(60);
              doc.text(dTxt, x + labelW/2, y + 7, { align:'center' });
            }

            // Barcode encodes: "CODE | designation" (short) so scanners show name too.
            const cacheKey = payload || code;
            let img = cache[cacheKey];
            if(img === undefined){
              img = this._barcodePngData(cacheKey, { widthPx: 900, heightPx: 220 }) || null;
              cache[cacheKey] = img;
            }
            if(img){
              const bw = labelW - 8;
              const bh = 12;
              const bx = x + (labelW - bw) / 2;
              const by = y + 10;
              doc.addImage(img, 'PNG', bx, by, bw, bh);
            }

            // Human readable code (bold)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(code, x + labelW / 2, y + labelH - 6, { align: 'center' });
          }
        }

        this._save(doc, `ETIQUETTES_INVENTAIRE_${clean.length}.pdf`);
      });
    },

    /* ── Consumption Log PDF (NQI) ── */
    generateConsumptionLog(item, logs, total) {
      const settings = this._getSettings();
      const doc = this._newDoc();
      let y = this._drawCompanyHeader(doc, settings, 15);
      y = this._drawBanner(doc, 'JOURNAL DE CONSOMMATION', y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Article : ' + (item.name || ''), 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Unite : ' + (item.unit || 'L') + '  |  Total : ' + total + ' ' + (item.unit || 'L'), 14, y);
      y += 8;
      var rows = logs.map(function(l) {
        return [l.date || '', String(l.quantity || 0) + ' ' + (item.unit || 'L'), l.reason || '', l.responsible || ''];
      });
      doc.autoTable({
        startY: y,
        head: [['Date', 'Quantite', 'Raison', 'Responsable']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 }
      });
      doc.save('consommation_' + (item.name || 'article').replace(/\s+/g, '_') + '.pdf');
    }

  }; /* end PDFGen */

  global.PDFGen = PDFGen;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));