/**
 * ============================================================
 * STOCK TUTORIAL MODULE — SPA DOUROUB ELDJAZAIR
 * Interactive Animated Onboarding & Guided Tour for Stock & CAD
 * ============================================================
 */

(function(window) {
    'use strict';

    const TUTORIAL_LANG = {
        current: (typeof localStorage !== 'undefined' && localStorage.getItem('tutorial_lang')) || 'fr',
        set(lang) { this.current = lang; try { localStorage.setItem('tutorial_lang', lang); } catch(e) {} },
        isFr() { return this.current !== 'ar'; },
        isAr() { return this.current === 'ar'; }
    };

    const ROLE_STEPS_NORMAL = [
        {
            id: 'dashboard',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Mon Tableau de Bord',
            titleAr: 'لوحة القيادة',
            icon: 'fas fa-gauge-high',
            color: '#0284c7',
            targetSelector: '#mainNav a[data-module="dashboard"], #topHeaderBrand, [data-module="dashboard"], .stats-grid, .stat-card',
            summary: 'Suivez vos demandes de pièces en cours.',
            summaryAr: 'تابع طلباتك الجارية للقطع.',
            bullets: [
                'Vos demandes actives et leur avancement.',
                'Statut clair : En attente, Validé ou Délivré.',
                'Raccourcis pour faire une nouvelle demande.'
            ],
            bulletsAr: [
                'طلباتك النشطة وتقدمها.',
                'حالة واضحة: قيد الانتظار، مصادق أو مسلّم.',
                'اختصارات لتقديم طلب جديد.'
            ],
            actionLabel: 'Voir mon Tableau de Bord',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('dashboard'); }
        },
        {
            id: 'stock',
            module: 'stock',
            targetModule: 'stock',
            title: 'Catalogue des Pièces',
            titleAr: 'فهرس القطع',
            icon: 'fas fa-boxes-stacked',
            color: '#0ea5e9',
            targetSelector: '#mainNav a[data-module="stock"], #stockSearch, #stockTable',
            summary: 'Cherchez et vérifiez la disponibilité des pièces.',
            summaryAr: 'ابحث وتحقق من توفر القطع.',
            bullets: [
                'Recherche par nom ou référence.',
                'Vérifiez si la pièce est disponible.',
                'Couleurs : vert = en stock, rouge = rupture.'
            ],
            bulletsAr: [
                'البحث بالاسم أو المرجع.',
                'تحقق من توفر القطعة.',
                'ألوان: أخضر = متوفر، أحمر = نفاد.'
            ],
            actionLabel: 'Voir le Catalogue',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'cart',
            module: 'cart',
            targetModule: 'cart',
            title: 'Mon Panier & Demande 🛒',
            titleAr: 'سلتي والطلب 🛒',
            icon: 'fas fa-cart-shopping',
            color: '#10b981',
            cardPosition: 'top-left',
            targetSelector: '#reqDrawer.active, #reqDrawer .drawer-content, #reqDrawer, #smartDockBtn, #mainNav a[data-module="cart"]',
            summary: 'Ajoutez des pièces et envoyez votre demande.',
            summaryAr: 'أضف القطع وأرسل طلبك.',
            bullets: [
                'Ajoutez les pièces nécessaires au panier.',
                'Choisissez le camion concerné.',
                'Validez pour recevoir votre pass de retrait.'
            ],
            bulletsAr: [
                'أضف القطع اللازمة للسلة.',
                'اختر الشاحنة المعنية.',
                'صادق للحصول على بطاقة السحب.'
            ],
            extraDetails: [
                'Le stock est vérifié automatiquement.',
                'Un pass QR est généré pour le retrait.'
            ],
            actionLabel: 'Ouvrir Mon Panier',
            onEnter: function() { if (window.Cart && Cart.openDrawer) Cart.openDrawer(); },
            onLeave: function() { if (window.Cart && Cart.closeDrawer) Cart.closeDrawer(); },
            onAction: function() { if (window.Cart && Cart.showModal) Cart.showModal(); else if (window.App && App.loadModule) App.loadModule('cart'); }
        },
        {
            id: 'planTravail',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Schéma Véhicule & Ordres BT',
            titleAr: 'مخطط المركبة وأوامر العمل',
            icon: 'fas fa-drafting-compass',
            color: '#8b5cf6',
            targetSelector: '#mainNav a[data-module="planTravail"], #btContainer, .plan-header, #btnQuickUserBt',
            summary: 'Schéma interactif du camion et création d\'ordres de réparation.',
            summaryAr: 'مخطط تفاعلي للشاحنة وإنشاء أوامر الإصلاح.',
            bullets: [
                'Schéma interactif pour localiser l\'organe défaillant.',
                'Signalez les problèmes de pneus en un clic.',
                'Créez un Bon de Travail (BT) pour l\'atelier.'
            ],
            bulletsAr: [
                'مخطط تفاعلي لتحديد العضو المعطّل.',
                'أبلغ عن مشاكل الإطارات بنقرة واحدة.',
                'أنشئ أمر عمل (BT) للورشة.'
            ],
            actionLabel: 'Voir le Schéma',
            onAction: function() { if (window.PlanTravailModule && PlanTravailModule.open3DViewerModal) PlanTravailModule.open3DViewerModal(); else if (window.App && App.loadModule) App.loadModule('planTravail'); }
        },
        {
            id: 'history',
            module: 'history',
            targetModule: 'history',
            title: 'Mes Commandes & Bons Signés',
            titleAr: 'طلباتي والوصولات الموقّعة',
            icon: 'fas fa-clock-rotate-left',
            color: '#f59e0b',
            targetSelector: '#mainNav a[data-module="history"], #historyOrdersTable, #historySearch, #historyModule',
            summary: 'Retrouvez vos anciennes commandes et téléchargez vos bons.',
            summaryAr: 'ارجع لطلباتك السابقة وحمّل وصولاتك.',
            bullets: [
                'Historique complet de vos demandes.',
                'Suivez le statut : Soumis, Validé, Délivré.',
                'Téléchargez vos bons signés en PDF.'
            ],
            bulletsAr: [
                'سجل كامل لطلباتك.',
                'تابع الحالة: مقدّم، مصادق، مسلّم.',
                'حمّل وصولاتك الموقّعة بصيغة PDF.'
            ],
            actionLabel: 'Voir mes Commandes',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('history'); }
        },
        {
            id: 'barcodeScanner',
            module: 'barcodeScanner',
            targetModule: 'barcodeScanner',
            title: 'Consultation par Scan Code-Barres',
            icon: 'fas fa-barcode',
            color: '#059669',
            targetSelector: '#btnHeaderGdsScanner, #mainNav a[data-module="barcodeScanner"], [data-module="barcodeScanner"]',
            summary: 'Scan par caméra de code-barres / QR pour vérifier la fiche et la disponibilité d\'une pièce.',
            bullets: [
                'Identification instantanée d\'une pièce mécanique via son code-barres ou QR Code.',
                'Consultation immédiate des caractéristiques techniques et du stock disponible.',
                'Recherche rapide sans saisie manuelle de référence pour vos demandes atelier.'
            ],
            actionLabel: 'Ouvrir le Scanner',
            onAction: function() { if (window.GdsScannerModule && GdsScannerModule.openModal) GdsScannerModule.openModal(); else if (window.App && App.loadModule) App.loadModule('barcodeScanner'); }
        }
    ];

    const ROLE_STEPS_MAG = [
        {
            id: 'dashboard',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Tableau de Bord Magasinier',
            titleAr: 'لوحة القيادة - أمين المخزن',
            icon: 'fas fa-warehouse',
            color: '#0284c7',
            targetSelector: '#mainNav a[data-module="dashboard"], #topHeaderBrand, [data-module="dashboard"], .stats-grid, .stat-card',
            summary: 'Alertes de rupture et demandes à traiter.',
            summaryAr: 'تنبيهات النفاد والطلبات قيد المعالجة.',
            bullets: [
                'Articles sous le seuil critique en rouge.',
                'Réceptions fournisseurs en attente.',
                'Demandes de pièces à préparer.'
            ],
            bulletsAr: [
                'المواد تحت الحد الأدنى بالأحمر.',
                'استقبالات الموردين قيد الانتظار.',
                'طلبات القطع للتحضير.'
            ],
            actionLabel: 'Tableau de Bord',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('dashboard'); }
        },
        {
            id: 'stock',
            module: 'stock',
            targetModule: 'stock',
            title: 'Gestion du Stock & Réceptions',
            titleAr: 'إدارة المخزون والاستقبالات',
            icon: 'fas fa-boxes-stacked',
            color: '#0ea5e9',
            targetSelector: '#mainNav a[data-module="stock"], #stockSearch, #stockTable',
            summary: 'Gérez les entrées, les zones et l\'inventaire.',
            summaryAr: 'أدر المداخل والمناطق والجرد.',
            bullets: [
                'Articles classés par zones A à E.',
                'Saisie rapide des entrées et ajustements.',
                'Valeur du stock mise à jour en temps réel.'
            ],
            bulletsAr: [
                'المواد مصنفة حسب المناطق أ إلى هـ.',
                'إدخال سريع للمداخل والتعديلات.',
                'قيمة المخزون محدّثة آنياً.'
            ],
            actionLabel: 'Gérer les Stocks',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'barcodeScanner',
            module: 'barcodeScanner',
            targetModule: 'barcodeScanner',
            title: 'Scanner Code-Barres & QR',
            titleAr: 'ماسح الباركود و QR',
            icon: 'fas fa-barcode',
            color: '#059669',
            targetSelector: '#btnHeaderGdsScanner, #mainNav a[data-module="barcodeScanner"], [data-module="barcodeScanner"]',
            summary: 'Scannez pour retirer du stock directement.',
            summaryAr: 'امسح لسحب من المخزون مباشرة.',
            bullets: [
                'Douchette USB ou caméra du téléphone.',
                'Retirez du stock en scannant le code.',
                'Mode hors-ligne avec synchronisation auto.'
            ],
            bulletsAr: [
                'ماسح USB أو كاميرا الهاتف.',
                'اسحب من المخزون بمسح الرمز.',
                'وضع عدم الاتصال مع مزامنة تلقائية.'
            ],
            actionLabel: 'Ouvrir le Scanner',
            onAction: function() { if (window.GdsScannerModule && GdsScannerModule.openModal) GdsScannerModule.openModal(); else if (window.App && App.loadModule) App.loadModule('barcodeScanner'); }
        },
        {
            id: 'decharges',
            module: 'decharges',
            targetModule: 'decharges',
            title: 'Décharges & Bons BSM',
            titleAr: 'التفريغات ووصولات BSM',
            icon: 'fas fa-clipboard-check',
            color: '#14b8a6',
            targetSelector: '#mainNav a[data-module="decharges"], #dechTable, #dechFilterPills',
            summary: 'Remettez les pièces et faites signer.',
            summaryAr: 'سلّم القطع واجعل المستفيد يوقّع.',
            bullets: [
                'Appelez le panier ou cherchez le bénéficiaire.',
                'Signature sur écran tactile.',
                'Le stock est mis à jour et le bon BSM créé.'
            ],
            bulletsAr: [
                'استدعِ السلة أو ابحث عن المستفيد.',
                'التوقيع على الشاشة اللمسية.',
                'يتم تحديث المخزون وإنشاء وصل BSM.'
            ],
            actionLabel: 'Voir les Décharges',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('decharges'); }
        },
        {
            id: 'cart',
            module: 'cart',
            targetModule: 'cart',
            title: 'Réquisitions & Panier',
            titleAr: 'الطلبات والسلة',
            icon: 'fas fa-cart-shopping',
            color: '#10b981',
            cardPosition: 'top-left',
            targetSelector: '#reqDrawer.active, #reqDrawer .drawer-content, #reqDrawer, #smartDockBtn, #mainNav a[data-module="cart"]',
            summary: 'Préparez les demandes de pièces des ateliers.',
            summaryAr: 'حضّر طلبات القطع من الورشات.',
            bullets: [
                'Vérifiez les demandes liées aux véhicules.',
                'Préparez les pièces avant la remise.',
                'Créez le bon de sortie directement.'
            ],
            bulletsAr: [
                'تحقق من الطلبات المتعلقة بالمركبات.',
                'حضّر القطع قبل التسليم.',
                'أنشئ وصل الخروج مباشرة.'
            ],
            actionLabel: 'Voir les Réquisitions',
            onEnter: function() { if (window.Cart && Cart.openDrawer) Cart.openDrawer(); },
            onLeave: function() { if (window.Cart && Cart.closeDrawer) Cart.closeDrawer(); },
            onAction: function() { if (window.Cart && Cart.showModal) Cart.showModal(); else if (window.App && App.loadModule) App.loadModule('cart'); }
        },
        {
            id: 'planTravail',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Ordres de Réparation & Pièces',
            titleAr: 'أوامر الإصلاح والقطع',
            icon: 'fas fa-screwdriver-wrench',
            color: '#8b5cf6',
            targetSelector: '#mainNav a[data-module="planTravail"], #btContainer, .plan-header',
            summary: 'Préparez les pièces pour les réparations.',
            summaryAr: 'حضّر القطع للإصلاحات.',
            bullets: [
                'Consultez les diagnostics des véhicules.',
                'Préparez les pièces demandées par l\'atelier.',
                'Clôturez les dotations après intervention.'
            ],
            bulletsAr: [
                'اطّلع على تشخيصات المركبات.',
                'حضّر القطع المطلوبة من الورشة.',
                'أغلق التخصيصات بعد التدخل.'
            ],
            actionLabel: 'Voir les Réparations',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('planTravail'); }
        },
        {
            id: 'history',
            module: 'history',
            targetModule: 'history',
            title: 'Historique des Sorties',
            titleAr: 'سجل المخارج',
            icon: 'fas fa-clock-rotate-left',
            color: '#f59e0b',
            targetSelector: '#mainNav a[data-module="history"], #historyOrdersTable, #historySearch, #historyModule',
            summary: 'Retrouvez toutes les sorties et réceptions.',
            summaryAr: 'ارجع لجميع المخارج والاستقبالات.',
            bullets: [
                'Historique complet des mouvements.',
                'Recherche par numéro, véhicule ou agent.',
                'Bons archivés pour les inventaires.'
            ],
            bulletsAr: [
                'سجل كامل للحركات.',
                'البحث برقم أو مركبة أو عامل.',
                'وصولات مؤرشفة للجرد.'
            ],
            actionLabel: 'Voir l\'Historique',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('history'); }
        }
    ];

    const ROLE_STEPS_CHEF = [
        {
            id: 'dashboard',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Supervision Gestion',
            titleAr: 'إشراف التسيير',
            icon: 'fas fa-chart-pie',
            color: '#0284c7',
            targetSelector: '#mainNav a[data-module="dashboard"], #topHeaderBrand, [data-module="dashboard"], .stats-grid, .stat-card',
            summary: 'Vue globale du stock, alertes et indicateurs.',
            summaryAr: 'نظرة شاملة على المخزون والتنبيهات والمؤشرات.',
            bullets: [
                'Valeur totale du stock par section.',
                'Alertes de rupture et seuils bas.',
                'Indicateurs pour les décisions logistiques.'
            ],
            bulletsAr: [
                'القيمة الإجمالية للمخزون حسب القسم.',
                'تنبيهات النفاد والحدود الدنيا.',
                'مؤشرات لاتخاذ القرارات اللوجستية.'
            ],
            actionLabel: 'Voir la Supervision',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('dashboard'); }
        },
        {
            id: 'stock',
            module: 'stock',
            targetModule: 'stock',
            title: 'Contrôle du Stock',
            titleAr: 'مراقبة المخزون',
            icon: 'fas fa-boxes-stacked',
            color: '#0ea5e9',
            targetSelector: '#mainNav a[data-module="stock"], #stockSearch, #stockTable',
            summary: 'Vérifiez les mouvements et les inventaires.',
            summaryAr: 'تحقق من الحركات والجرد.',
            bullets: [
                'Suivi des entrées et sorties en temps réel.',
                'Vérification des seuils de réappro.',
                'Conformité comptable du stock.'
            ],
            bulletsAr: [
                'متابعة المداخل والمخارج آنياً.',
                'التحقق من حدود إعادة التموين.',
                'المطابقة المحاسبية للمخزون.'
            ],
            actionLabel: 'Contrôler les Stocks',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'decharges',
            module: 'decharges',
            targetModule: 'decharges',
            title: 'Approbation des Décharges',
            titleAr: 'المصادقة على التفريغات',
            icon: 'fas fa-clipboard-check',
            color: '#10b981',
            targetSelector: '#mainNav a[data-module="decharges"], #dechTable, #dechFilterPills',
            summary: 'Validez ou refusez les demandes de pièces.',
            summaryAr: 'صادق أو ارفض طلبات القطع.',
            bullets: [
                'Examinez les demandes avant délivrance.',
                'Validez en 1 clic ou refusez avec motif.',
                'Les bons BSM sont créés après validation.'
            ],
            bulletsAr: [
                'افحص الطلبات قبل التسليم.',
                'صادق بنقرة واحدة أو ارفض مع السبب.',
                'يتم إنشاء وصولات BSM بعد المصادقة.'
            ],
            actionLabel: 'Examiner les Décharges',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('decharges'); }
        },
        {
            id: 'planTravail',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Validation des Ordres BT',
            titleAr: 'المصادقة على أوامر العمل',
            icon: 'fas fa-file-signature',
            color: '#8b5cf6',
            targetSelector: '#mainNav a[data-module="planTravail"], #btContainer, .plan-header',
            summary: 'Examinez le diagnostic et signez le Bon de Travail.',
            summaryAr: 'افحص التشخيص ووقّع أمر العمل.',
            bullets: [
                'Vérifiez le diagnostic du véhicule.',
                'Validez les pièces et le temps prévu.',
                'Signez le Bon de Travail officiel.'
            ],
            bulletsAr: [
                'تحقق من تشخيص المركبة.',
                'صادق على القطع والوقت المقدّر.',
                'وقّع أمر العمل الرسمي.'
            ],
            actionLabel: 'Valider les Ordres BT',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('planTravail'); }
        },
        {
            id: 'fleet',
            module: 'fleet',
            targetModule: 'fleet',
            title: 'Flotte & Matériel',
            titleAr: 'الحظيرة والمعدات',
            icon: 'fas fa-truck-moving',
            color: '#f59e0b',
            targetSelector: '#mainNav a[data-module="fleet"], #fleetCards, #fleetModule',
            summary: 'Suivez la disponibilité et l\'entretien des véhicules.',
            summaryAr: 'تابع توفر المركبات وصيانتها.',
            bullets: [
                'État de chaque véhicule : actif ou en panne.',
                'Coûts des pièces par véhicule.',
                'Visites techniques et vidanges prévues.'
            ],
            bulletsAr: [
                'حالة كل مركبة: نشطة أو معطّلة.',
                'تكاليف القطع حسب المركبة.',
                'الفحوصات التقنية وتغيير الزيت المبرمجة.'
            ],
            actionLabel: 'Voir la Flotte',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('fleet'); }
        },
        {
            id: 'citernes',
            module: 'citernes',
            targetModule: 'citernes',
            title: 'Citernes & Carburant',
            titleAr: 'الخزانات والوقود',
            icon: 'fas fa-gas-pump',
            color: '#ea580c',
            targetSelector: '#mainNav a[data-module="citernes"], #citernesModule, .citernes-container, #citerneSearchInput',
            summary: 'Niveaux des cuves et consommation par véhicule.',
            summaryAr: 'مستويات الخزانات واستهلاك كل مركبة.',
            bullets: [
                'Niveaux des cuves de carburant.',
                'Consommation par véhicule aux 100 km.',
                'Détection des écarts anormaux.'
            ],
            bulletsAr: [
                'مستويات خزانات الوقود.',
                'استهلاك كل مركبة لكل 100 كم.',
                'كشف الانحرافات غير العادية.'
            ],
            actionLabel: 'Voir les Citernes',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('citernes'); }
        },
        {
            id: 'history',
            module: 'history',
            targetModule: 'history',
            title: 'Historique & Journal d\'Audit',
            titleAr: 'السجل ودفتر المراجعة',
            icon: 'fas fa-shield-halved',
            color: '#6366f1',
            targetSelector: '#mainNav a[data-module="history"], #historyOrdersTable, #historySearch, #historyModule',
            summary: 'Traçabilité de tous les mouvements.',
            summaryAr: 'تتبع جميع الحركات.',
            bullets: [
                'Historique de toutes les sorties et dotations.',
                'Vérification de l\'intégrité des opérations.',
                'Exportation de rapports pour le contrôle.'
            ],
            bulletsAr: [
                'سجل جميع المخارج والتخصيصات.',
                'التحقق من سلامة العمليات.',
                'تصدير تقارير للمراقبة.'
            ],
            actionLabel: 'Voir le Journal',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('history'); }
        }
    ];

    const ROLE_STEPS_ADMIN = [
        {
            id: 'dashboard',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Tableau de Bord Direction',
            titleAr: 'لوحة القيادة - الإدارة',
            icon: 'fas fa-chart-line',
            color: '#0284c7',
            targetSelector: '#mainNav a[data-module="dashboard"], #topHeaderBrand, [data-module="dashboard"], .stats-grid, .stat-card',
            summary: 'Vue exécutive : valeur du stock, alertes et flotte.',
            summaryAr: 'نظرة تنفيذية: قيمة المخزون والتنبيهات والحظيرة.',
            bullets: [
                'Valeur totale du stock et taux de rotation.',
                'Alertes critiques en temps réel.',
                'Supervision de la logistique globale.'
            ],
            bulletsAr: [
                'القيمة الإجمالية للمخزون ومعدل الدوران.',
                'تنبيهات حرجة آنية.',
                'إشراف على اللوجستيك العام.'
            ],
            actionLabel: 'Tableau Exécutif',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('dashboard'); }
        },
        {
            id: 'stock',
            module: 'stock',
            targetModule: 'stock',
            title: 'Supervision Globale du Stock',
            titleAr: 'الإشراف العام على المخزون',
            icon: 'fas fa-boxes-stacked',
            color: '#0ea5e9',
            targetSelector: '#mainNav a[data-module="stock"], #stockSearch, #stockTable',
            summary: 'Accès complet au catalogue et aux mouvements.',
            summaryAr: 'وصول كامل للفهرس والحركات.',
            bullets: [
                'Tous les articles, références et zones.',
                'Adressage par zones logistiques A à E.',
                'Valorisation en temps réel (DZD).'
            ],
            bulletsAr: [
                'جميع المواد والمراجع والمناطق.',
                'العنونة حسب المناطق اللوجستية أ إلى هـ.',
                'التقييم آنياً (دج).'
            ],
            actionLabel: 'Superviser les Stocks',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'barcodeScanner',
            module: 'barcodeScanner',
            targetModule: 'barcodeScanner',
            title: 'Scanner QR & Code-Barres',
            titleAr: 'ماسح QR والباركود',
            icon: 'fas fa-barcode',
            color: '#059669',
            targetSelector: '#btnHeaderGdsScanner, #mainNav a[data-module="barcodeScanner"], [data-module="barcodeScanner"]',
            summary: 'Retirez du stock par scan caméra ou douchette.',
            summaryAr: 'اسحب من المخزون بمسح الكاميرا أو الماسح.',
            bullets: [
                'Scan code-barres et QR Code.',
                'Retrait immédiat du stock.',
                'Mode mobile pour inventaire rapide.'
            ],
            bulletsAr: [
                'مسح الباركود ورمز QR.',
                'سحب فوري من المخزون.',
                'وضع محمول للجرد السريع.'
            ],
            actionLabel: 'Lancer le Scanner',
            onAction: function() { if (window.GdsScannerModule && GdsScannerModule.openModal) GdsScannerModule.openModal(); else if (window.App && App.loadModule) App.loadModule('barcodeScanner'); }
        },
        {
            id: 'cart',
            module: 'cart',
            targetModule: 'cart',
            title: 'Panier & Réquisition 🛒',
            titleAr: 'السلة والطلب 🛒',
            icon: 'fas fa-cart-shopping',
            color: '#10b981',
            cardPosition: 'top-left',
            targetSelector: '#reqDrawer.active, #reqDrawer .drawer-content, #reqDrawer, #smartDockBtn, #mainNav a[data-module="cart"]',
            summary: 'Créez des demandes de pièces en 1 clic.',
            summaryAr: 'أنشئ طلبات القطع بنقرة واحدة.',
            bullets: [
                'Ajoutez des pièces avec le motif.',
                'Affectez au véhicule ou au BT.',
                'Validation immédiate sans formulaire papier.'
            ],
            bulletsAr: [
                'أضف القطع مع السبب.',
                'خصّص للمركبة أو أمر العمل.',
                'مصادقة فورية بدون استمارة ورقية.'
            ],
            actionLabel: 'Ouvrir le Panier',
            onEnter: function() { if (window.Cart && Cart.openDrawer) Cart.openDrawer(); },
            onLeave: function() { if (window.Cart && Cart.closeDrawer) Cart.closeDrawer(); },
            onAction: function() { if (window.Cart && Cart.showModal) Cart.showModal(); else if (window.App && App.loadModule) App.loadModule('cart'); }
        },
        {
            id: 'decharges',
            module: 'decharges',
            targetModule: 'decharges',
            title: 'Décharges & Bons BSM',
            titleAr: 'التفريغات ووصولات BSM',
            icon: 'fas fa-clipboard-check',
            color: '#14b8a6',
            targetSelector: '#mainNav a[data-module="decharges"], #dechTable, #dechFilterPills',
            summary: 'Gérez les sorties, signatures et bons BSM.',
            summaryAr: 'أدر المخارج والتوقيعات ووصولات BSM.',
            bullets: [
                'Remise des pièces avec signature tactile.',
                'Stock mis à jour automatiquement.',
                'Bons BSM archivés en PDF.'
            ],
            bulletsAr: [
                'تسليم القطع مع التوقيع اللمسي.',
                'تحديث المخزون تلقائياً.',
                'وصولات BSM مؤرشفة بصيغة PDF.'
            ],
            actionLabel: 'Gérer les Décharges',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('decharges'); }
        },
        {
            id: 'planTravail',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Schéma Véhicule & Ordres de Réparation',
            titleAr: 'مخطط المركبة وأوامر الإصلاح',
            icon: 'fas fa-drafting-compass',
            color: '#8b5cf6',
            targetSelector: '#mainNav a[data-module="planTravail"], #btContainer, .plan-header',
            summary: 'Schéma interactif, diagnostic et Bons de Travail.',
            summaryAr: 'مخطط تفاعلي وتشخيص وأوامر العمل.',
            bullets: [
                'Schéma 2D interactif des véhicules.',
                'Diagnostic des organes et roues.',
                'Bons de Travail officiels avec QR Code.'
            ],
            bulletsAr: [
                'مخطط ثنائي الأبعاد تفاعلي للمركبات.',
                'تشخيص الأعضاء والعجلات.',
                'أوامر عمل رسمية مع رمز QR.'
            ],
            actionLabel: 'Voir le Schéma',
            onAction: function() { if (window.PlanTravailModule && PlanTravailModule.open3DViewerModal) PlanTravailModule.open3DViewerModal(); else if (window.App && App.loadModule) App.loadModule('planTravail'); }
        },
        {
            id: 'fleet',
            module: 'fleet',
            targetModule: 'fleet',
            title: 'Parc & Flotte',
            titleAr: 'الحظيرة والأسطول',
            icon: 'fas fa-truck-moving',
            color: '#f59e0b',
            targetSelector: '#mainNav a[data-module="fleet"], #fleetCards, #fleetModule',
            summary: 'Tous les véhicules, entretiens et coûts.',
            summaryAr: 'جميع المركبات والصيانة والتكاليف.',
            bullets: [
                'Fiche de chaque camion et engin.',
                'Vidanges, visites techniques prévues.',
                'Coûts des pièces par véhicule.'
            ],
            bulletsAr: [
                'بطاقة كل شاحنة ومعدّة.',
                'تغيير الزيت والفحوصات التقنية المبرمجة.',
                'تكاليف القطع حسب المركبة.'
            ],
            actionLabel: 'Voir la Flotte',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('fleet'); }
        },
        {
            id: 'citernes',
            module: 'citernes',
            targetModule: 'citernes',
            title: 'Citernes & Carburant Naftal',
            titleAr: 'الخزانات ووقود نفطال',
            icon: 'fas fa-gas-pump',
            color: '#ea580c',
            targetSelector: '#mainNav a[data-module="citernes"], #citernesModule, .citernes-container, #citerneSearchInput',
            summary: 'Cuves, livraisons et consommation aux 100 km.',
            summaryAr: 'الخزانات والتسليمات واستهلاك كل 100 كم.',
            bullets: [
                'Jauges des cuves en direct.',
                'Bons Naftal et distribution.',
                'Consommation aux 100 km par camion.'
            ],
            bulletsAr: [
                'مقاييس الخزانات آنياً.',
                'وصولات نفطال والتوزيع.',
                'استهلاك كل 100 كم حسب الشاحنة.'
            ],
            actionLabel: 'Voir les Citernes',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('citernes'); }
        },
        {
            id: 'history',
            module: 'history',
            targetModule: 'history',
            title: 'Historique & Journal d\'Audit',
            titleAr: 'السجل ودفتر المراجعة',
            icon: 'fas fa-shield-halved',
            color: '#6366f1',
            targetSelector: '#mainNav a[data-module="history"], #historyOrdersTable, #auditTrailTable, #historyModule',
            summary: 'Traçabilité complète de tous les mouvements.',
            summaryAr: 'تتبع كامل لجميع الحركات.',
            bullets: [
                'Journal de chaque action horodatée.',
                'Vérification d\'intégrité des opérations.',
                'Recherche par agent, type ou article.'
            ],
            bulletsAr: [
                'سجل كل إجراء مؤرّخ.',
                'التحقق من سلامة العمليات.',
                'البحث حسب العامل أو النوع أو المادة.'
            ],
            actionLabel: 'Voir le Journal',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('history'); }
        },
        {
            id: 'settings',
            module: 'settings',
            targetModule: 'settings',
            title: 'Administration & Paramètres',
            titleAr: 'الإدارة والإعدادات',
            icon: 'fas fa-gears',
            color: '#dc2626',
            targetSelector: '#mainNav a[data-module="settings"], #settingsModule, .settings-tabs, #userProfileBtn',
            summary: 'Gérez les utilisateurs, rôles et sauvegardes.',
            summaryAr: 'أدر المستخدمين والأدوار والنسخ الاحتياطية.',
            bullets: [
                'Comptes utilisateurs et rôles.',
                'Permissions de scan et déstockage.',
                'Sauvegarde et restauration des données.'
            ],
            bulletsAr: [
                'حسابات المستخدمين والأدوار.',
                'صلاحيات المسح والسحب.',
                'نسخ احتياطي واستعادة البيانات.'
            ],
            actionLabel: 'Ouvrir l\'Administration',
            onAction: function() { if (window.App && App.showSettings) App.showSettings(); else if (window.App && App.loadModule) App.loadModule('settings'); }
        }
    ];

    const ALL_EXHAUSTIVE_STEPS = [
        {
            id: 'userProfile',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Mon Profil & Déconnexion',
            titleAr: 'ملفي الشخصي والخروج',
            icon: 'fas fa-arrow-right-from-bracket',
            color: '#ef4444',
            targetSelector: '#userProfileBtn, #userDropdown, #btnLogout',
            summary: 'Voir vos infos personnelles et vous déconnecter.',
            summaryAr: 'عرض معلوماتك الشخصية وتسجيل الخروج.',
            bullets: [
                'Vos initiales, rôle et service affichés en haut à droite.',
                'Cliquez sur le bouton rouge pour vous déconnecter.',
                'Votre session est fermée et vos données protégées.'
            ],
            bulletsAr: [
                'الأحرف الأولى ودورك ومصلحتك في أعلى اليمين.',
                'اضغط على الزر الأحمر لتسجيل الخروج.',
                'يتم إغلاق جلستك وحماية بياناتك.'
            ],
            extraDetails: [
                'Toutes vos données locales sont effacées à la déconnexion.',
                'Vous serez redirigé vers la page de connexion.'
            ],
            actionLabel: 'Ouvrir le Menu Profil',
            onEnter: function() {
                const profileBtn = document.getElementById('userProfileBtn');
                if (profileBtn && StockTutorialModule.isActive) {
                    StockTutorialModule.positionSpotlight(profileBtn);
                }
            },
            onLeave: function() {
                StockTutorialModule.toggleUserProfileDropdown(false);
            },
            onAction: function() {
                StockTutorialModule.toggleUserProfileDropdown();
            }
        },
        {
            id: 'themeAndClock',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Horloge & Thème Jour/Nuit',
            titleAr: 'الساعة والوضع الليلي/النهاري',
            icon: 'fas fa-circle-half-stroke',
            color: '#3b82f6',
            targetSelector: '#toggleTheme, #systemClock',
            summary: 'Changer entre le mode clair et sombre.',
            summaryAr: 'التبديل بين الوضع الفاتح والداكن.',
            bullets: [
                'Horloge en temps réel affichée dans la barre.',
                'Un clic pour passer du mode Jour au mode Nuit.',
                'Votre choix est mémorisé automatiquement.'
            ],
            bulletsAr: [
                'ساعة حقيقية معروضة في الشريط العلوي.',
                'نقرة واحدة للتبديل بين الوضع النهاري والليلي.',
                'يتم حفظ اختيارك تلقائياً.'
            ],
            actionLabel: 'Basculer le Thème',
            onAction: function() {
                const btn = document.getElementById('toggleTheme');
                if (btn) btn.click();
            }
        },
        {
            id: 'notifications',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Notifications & Alertes',
            titleAr: 'الإشعارات والتنبيهات',
            icon: 'fas fa-bell',
            color: '#f59e0b',
            targetSelector: '#btnNotifications, #notifBadge',
            summary: 'Recevez les alertes de stock bas et les nouvelles demandes.',
            summaryAr: 'استقبل تنبيهات المخزون المنخفض والطلبات الجديدة.',
            bullets: [
                'Badge rouge quand il y a des alertes à voir.',
                'Alerte si un article est en rupture de stock.',
                'Notification quand une demande est validée.'
            ],
            bulletsAr: [
                'شارة حمراء عند وجود تنبيهات.',
                'تنبيه عند نفاد مادة من المخزون.',
                'إشعار عند المصادقة على طلب.'
            ],
            actionLabel: 'Voir les Notifications',
            onAction: function() {
                const btn = document.getElementById('btnNotifications');
                if (btn) btn.click();
            }
        },
        {
            id: 'gdsScanner',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'barcodeScanner',
            targetModule: 'barcodeScanner',
            title: 'Scanner Code-Barres & QR',
            titleAr: 'ماسح الباركود و QR',
            icon: 'fas fa-barcode',
            color: '#059669',
            targetSelector: '#btnHeaderGdsScanner, #mainNav a[data-module="barcodeScanner"], [data-module="barcodeScanner"]',
            summary: 'Scannez les articles pour les identifier ou les retirer du stock.',
            summaryAr: 'امسح المواد لتعريفها أو سحبها من المخزون.',
            bullets: [
                'Utilisez une douchette USB ou la caméra du téléphone.',
                'Scannez le code-barres pour trouver l\'article.',
                'Retirez directement du stock sans saisie manuelle.'
            ],
            bulletsAr: [
                'استخدم ماسح USB أو كاميرا الهاتف.',
                'امسح الباركود لإيجاد المادة.',
                'اسحب مباشرة من المخزون بدون إدخال يدوي.'
            ],
            actionLabel: 'Ouvrir le Scanner',
            onAction: function() {
                if (window.GdsScannerModule && GdsScannerModule.openModal) GdsScannerModule.openModal();
                else if (window.App && App.loadModule) App.loadModule('barcodeScanner');
            }
        },
        {
            id: 'cartDock',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Panier Rapide (Dock Flottant)',
            titleAr: 'السلة السريعة (الشريط العائم)',
            icon: 'fas fa-cart-shopping',
            color: '#10b981',
            cardPosition: 'top-right',
            targetSelector: '#floatingRequisitionDock, #smartDockBtn, #mainNav a[data-module="cart"]',
            summary: 'Accédez rapidement à votre panier depuis n\'importe quelle page.',
            summaryAr: 'الوصول السريع لسلتك من أي صفحة.',
            bullets: [
                'Barre flottante en bas de l\'écran, toujours visible.',
                'Compteur d\'articles en temps réel.',
                'Cliquez pour ouvrir votre panier et finaliser.'
            ],
            bulletsAr: [
                'شريط عائم أسفل الشاشة، دائماً مرئي.',
                'عداد المواد في الوقت الحقيقي.',
                'اضغط لفتح سلتك وإتمام الطلب.'
            ],
            actionLabel: 'Ouvrir le Panier',
            onEnter: function() {
                const floatDock = document.getElementById('floatingRequisitionDock');
                if (floatDock) {
                    floatDock.style.display = 'flex';
                    document.body.classList.add('has-cart-dock');
                    floatDock.setAttribute('data-tutorial-forced', 'true');
                    const frdCount = document.getElementById('frdCountBadge');
                    if (frdCount && (!frdCount.textContent || frdCount.textContent === '0')) frdCount.textContent = '1';
                    const frdSummary = document.getElementById('frdSummaryText');
                    if (frdSummary && (!frdSummary.textContent || frdSummary.textContent.includes('0 article'))) {
                        frdSummary.textContent = '1 article (1 réf.) • Prêt à valider';
                    }
                }
                if (window.Cart && Cart.closeDrawer) Cart.closeDrawer();
                setTimeout(() => {
                    if (StockTutorialModule.isActive && floatDock) {
                        StockTutorialModule.positionSpotlight(floatDock);
                    }
                }, 150);
            },
            onLeave: function() {
                const floatDock = document.getElementById('floatingRequisitionDock');
                if (floatDock && floatDock.getAttribute('data-tutorial-forced') === 'true') {
                    floatDock.removeAttribute('data-tutorial-forced');
                    if (window.Cart && Cart.getCount() === 0) {
                        floatDock.style.display = 'none';
                        document.body.classList.remove('has-cart-dock');
                    }
                }
            },
            onAction: function() {
                if (window.Cart && Cart.showModal) Cart.showModal();
                else if (window.Cart && Cart.openDrawer) Cart.openDrawer();
            }
        },
        {
            id: 'bridgeAppro',
            chapterIndex: 1,
            chapterTitle: 'Chapitre 1 : En-tête & Navigation',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Lien vers les Achats & Portail',
            titleAr: 'رابط المشتريات والبوابة',
            icon: 'fas fa-network-wired',
            color: '#881337',
            targetSelector: '#linkToAppro, #linkToPortal, #udropAchatsLink',
            summary: 'Accédez aux Achats ou au Portail depuis le Stock.',
            summaryAr: 'الوصول للمشتريات أو البوابة من المخزون.',
            bullets: [
                'Lien direct vers l\'application Achats.',
                'Basculez vers le portail sans vous reconnecter.',
                'Synchronisation des commandes entre les modules.'
            ],
            bulletsAr: [
                'رابط مباشر لتطبيق المشتريات.',
                'انتقل للبوابة بدون إعادة تسجيل الدخول.',
                'مزامنة الطلبات بين الوحدات.'
            ],
            actionLabel: 'Voir la Passerelle',
            onAction: function() {
                const link = document.getElementById('udropAchatsLink') || document.getElementById('linkToAppro');
                if (link) link.click();
            }
        },
        {
            id: 'dashboard',
            chapterIndex: 2,
            chapterTitle: 'Chapitre 2 : Tableau de Bord',
            module: 'dashboard',
            targetModule: 'dashboard',
            title: 'Tableau de Bord & KPIs',
            titleAr: 'لوحة القيادة والمؤشرات',
            icon: 'fas fa-gauge-high',
            color: '#0284c7',
            targetSelector: '#mainNav a[data-module="dashboard"], #topHeaderBrand, [data-module="dashboard"], .stats-grid, .stat-card',
            summary: 'Vue d\'ensemble des stocks, réparations et activité.',
            summaryAr: 'نظرة عامة على المخزون والإصلاحات والنشاط.',
            bullets: [
                'Nombre total d\'articles et valeur du stock.',
                'Camions en réparation et ordres en cours.',
                'Fil d\'activité avec les derniers mouvements.'
            ],
            bulletsAr: [
                'العدد الإجمالي للمواد وقيمة المخزون.',
                'الشاحنات قيد الإصلاح والأوامر الجارية.',
                'سجل النشاط مع آخر الحركات.'
            ],
            actionLabel: 'Voir le Tableau de Bord',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('dashboard'); }
        },
        {
            id: 'stockCatalog',
            chapterIndex: 3,
            chapterTitle: 'Chapitre 3 : Stock & Réceptions',
            module: 'stock',
            targetModule: 'stock',
            title: 'Catalogue des Articles',
            titleAr: 'فهرس المواد',
            icon: 'fas fa-boxes-stacked',
            color: '#0ea5e9',
            targetSelector: '#mainNav a[data-module="stock"], #stockSearch, .zone-pills, .stock-zones-bar',
            summary: 'Cherchez et filtrez tous les articles du magasin.',
            summaryAr: 'ابحث عن جميع مواد المخزن وصنّفها.',
            bullets: [
                'Recherche par nom, référence ou catégorie.',
                'Filtrage par zone de stockage (A, B, C, D, E).',
                'Couleurs : vert = en stock, rouge = rupture.'
            ],
            bulletsAr: [
                'البحث بالاسم أو المرجع أو الفئة.',
                'التصفية حسب منطقة التخزين (أ، ب، ج، د، هـ).',
                'ألوان: أخضر = متوفر، أحمر = نفاد.'
            ],
            actionLabel: 'Voir le Catalogue',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'stockItemDetail',
            chapterIndex: 3,
            chapterTitle: 'Chapitre 3 : Stock & Réceptions',
            module: 'stock',
            targetModule: 'stock',
            title: 'Fiche Article & Ajustements',
            titleAr: 'بطاقة المادة والتعديلات',
            icon: 'fas fa-clipboard-list',
            color: '#0284c7',
            cardPosition: 'top-right',
            targetSelector: '#stockTable tbody tr:first-child .action-btns, #stockTable tbody tr:first-child, #stockTable',
            summary: 'Détails d\'un article : prix, seuil d\'alerte, entrées et sorties.',
            summaryAr: 'تفاصيل المادة: السعر، حد التنبيه، المداخل والمخارج.',
            bullets: [
                'Fiche avec référence, prix et quantité totale.',
                'Seuil d\'alerte configurable pour chaque article.',
                'Boutons +/- pour ajuster le stock rapidement.'
            ],
            bulletsAr: [
                'بطاقة بالمرجع والسعر والكمية الإجمالية.',
                'حد تنبيه قابل للتعديل لكل مادة.',
                'أزرار +/- لتعديل المخزون بسرعة.'
            ],
            actionLabel: 'Voir la Table Stock',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'stockBcImport',
            chapterIndex: 3,
            chapterTitle: 'Chapitre 3 : Stock & Réceptions',
            module: 'stock',
            targetModule: 'stock',
            title: 'Import BC & Export Excel',
            titleAr: 'استيراد أوامر الشراء وتصدير Excel',
            icon: 'fas fa-file-import',
            color: '#2563eb',
            cardPosition: 'top-right',
            targetSelector: '#btnStockBcImport, #btnStockExportExcel, button[onclick*="Stock.openBcImportModal"], button[onclick*="Stock.exportExcel"], #stockTable',
            summary: 'Importez les bons de commande et exportez le catalogue.',
            summaryAr: 'استيراد أوامر الشراء وتصدير الفهرس.',
            bullets: [
                'Import des BC validés depuis les Achats.',
                'Vérification des livraisons fournisseurs.',
                'Export du catalogue en Excel ou CSV.'
            ],
            bulletsAr: [
                'استيراد أوامر الشراء المصادق عليها من المشتريات.',
                'التحقق من تسليمات الموردين.',
                'تصدير الفهرس بصيغة Excel أو CSV.'
            ],
            actionLabel: 'Importer / Exporter',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('stock'); }
        },
        {
            id: 'cartDrawer',
            chapterIndex: 4,
            chapterTitle: 'Chapitre 4 : Panier & Demandes',
            module: 'cart',
            targetModule: 'cart',
            title: 'Panier & Choix du Véhicule',
            titleAr: 'السلة واختيار المركبة',
            icon: 'fas fa-truck-ramp-box',
            color: '#10b981',
            cardPosition: 'top-left',
            targetSelector: '#reqDrawer .drawer-content, #reqDrawer, #smartDockBtn',
            summary: 'Ajoutez des articles, choisissez le camion et validez.',
            summaryAr: 'أضف المواد، اختر الشاحنة وصادق.',
            bullets: [
                'Choisissez le véhicule concerné par la demande.',
                'Ajustez les quantités avec les boutons +/-.',
                'Validez pour créer le bon de sortie.'
            ],
            bulletsAr: [
                'اختر المركبة المعنية بالطلب.',
                'عدّل الكميات بأزرار +/-.',
                'صادق لإنشاء وصل الخروج.'
            ],
            actionLabel: 'Ouvrir le Panier',
            onEnter: function() { if (window.Cart && Cart.openDrawer) Cart.openDrawer(); },
            onLeave: function() { if (window.Cart && Cart.closeDrawer) Cart.closeDrawer(); },
            onAction: function() {
                if (window.Cart && Cart.toggleDrawer) Cart.toggleDrawer(true);
                else if (window.Cart && Cart.showModal) Cart.showModal();
            }
        },
        {
            id: 'cartQrPass',
            chapterIndex: 4,
            chapterTitle: 'Chapitre 4 : Panier & Demandes',
            module: 'cart',
            targetModule: 'cart',
            title: 'Pass QR pour Retrait au Comptoir',
            titleAr: 'بطاقة QR للسحب من الشباك',
            icon: 'fas fa-qrcode',
            color: '#059669',
            cardPosition: 'top-left',
            targetSelector: '#btnSubmitReqDrawer, .req-submit-btn, #reqDrawer, #smartDockBtn',
            summary: 'Recevez un QR Code pour retirer vos pièces au magasin.',
            summaryAr: 'استلم رمز QR لسحب القطع من المخزن.',
            bullets: [
                'Un pass avec QR Code est généré automatiquement.',
                'Présentez-le au magasinier pour récupérer vos pièces.',
                'Le pass est imprimable ou visible sur téléphone.'
            ],
            bulletsAr: [
                'يتم إنشاء بطاقة QR تلقائياً.',
                'قدّمها لأمين المخزن لاستلام القطع.',
                'البطاقة قابلة للطباعة أو العرض على الهاتف.'
            ],
            actionLabel: 'Voir le Pass',
            onEnter: function() {
                if (window.Cart && Cart.openDrawer) Cart.openDrawer();
            },
            onLeave: function() {
                if (window.Cart && Cart.closeDrawer) Cart.closeDrawer();
            },
            onAction: function() {
                if (window.Cart && Cart.showModal) Cart.showModal();
            }
        },
        {
            id: 'dechargesRegistry',
            chapterIndex: 5,
            chapterTitle: 'Chapitre 5 : Sorties & Bons BSM',
            module: 'decharges',
            targetModule: 'decharges',
            title: 'Registre des Sorties & Bons',
            titleAr: 'سجل المخارج والوصولات',
            icon: 'fas fa-clipboard-check',
            color: '#14b8a6',
            targetSelector: '#mainNav a[data-module="decharges"], #dechTable, #dechFilterPills, #dechargesModule',
            summary: 'Suivez tous les bons de sortie matériel.',
            summaryAr: 'تابع جميع وصولات خروج المواد.',
            bullets: [
                'Liste de tous les bons de sortie du magasin.',
                'Filtrez par statut : en attente ou délivré.',
                'Recherche par numéro de bon ou véhicule.'
            ],
            bulletsAr: [
                'قائمة جميع وصولات الخروج من المخزن.',
                'التصفية حسب الحالة: قيد الانتظار أو تم التسليم.',
                'البحث برقم الوصل أو المركبة.'
            ],
            actionLabel: 'Voir le Registre',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('decharges'); }
        },
        {
            id: 'dechargesServing',
            chapterIndex: 5,
            chapterTitle: 'Chapitre 5 : Sorties & Bons BSM',
            module: 'decharges',
            targetModule: 'decharges',
            title: 'Délivrance & Signature au Comptoir',
            titleAr: 'التسليم والتوقيع في الشباك',
            icon: 'fas fa-signature',
            color: '#0d9488',
            targetSelector: '.btn-serve-bsm, #dechSearch, #dechTable, #mainNav a[data-module="decharges"]',
            summary: 'Remettez les pièces et faites signer le bénéficiaire.',
            summaryAr: 'سلّم القطع واجعل المستفيد يوقّع.',
            bullets: [
                'Vérifiez les pièces remises au bénéficiaire.',
                'Signature tactile sur écran ou tablette.',
                'Le stock est mis à jour et le bon BSM est créé.'
            ],
            bulletsAr: [
                'تحقق من القطع المسلّمة للمستفيد.',
                'توقيع لمسي على الشاشة أو اللوحة.',
                'يتم تحديث المخزون وإنشاء وصل BSM.'
            ],
            actionLabel: 'Servir un Bon',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('decharges'); }
        },
        {
            id: 'cad3dStudio',
            chapterIndex: 6,
            chapterTitle: 'Chapitre 6 : Schéma Véhicule & Réparations (BT)',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Schéma Véhicule Interactif',
            titleAr: 'مخطط المركبة التفاعلي',
            icon: 'fas fa-drafting-compass',
            color: '#8b5cf6',
            cardPosition: 'top-right',
            targetSelector: 'button[onclick*="openNewPlanModal"], #btnOpenNewBt, .plan-header, #btContainer, #mainNav a[data-module="planTravail"]',
            summary: 'Schémas 2D interactifs de vos camions et remorques.',
            summaryAr: 'مخططات ثنائية الأبعاد تفاعلية لشاحناتكم ومقطوراتكم.',
            bullets: [
                '8 modèles de véhicules disponibles (HOWO, Tirsam, etc.).',
                'Cliquez sur un organe pour voir ses pièces.',
                'Vue schématique fidèle de chaque type de camion.'
            ],
            bulletsAr: [
                '8 نماذج مركبات متاحة (HOWO، تيرسام، إلخ).',
                'اضغط على عضو لرؤية قطعه.',
                'مخطط دقيق لكل نوع شاحنة.'
            ],
            actionLabel: 'Voir le Schéma',
            onAction: function() {
                if (window.PlanTravailModule && PlanTravailModule.open3DViewerModal) PlanTravailModule.open3DViewerModal();
                else if (window.App && App.loadModule) App.loadModule('planTravail');
            }
        },
        {
            id: 'cadDiagnostic',
            chapterIndex: 6,
            chapterTitle: 'Chapitre 6 : Schéma Véhicule & Réparations (BT)',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Diagnostic Organes & Pneumatiques',
            titleAr: 'تشخيص الأعضاء والعجلات',
            icon: 'fas fa-wrench',
            color: '#7c3aed',
            cardPosition: 'top-right',
            targetSelector: 'button[onclick*="openNewPlanModal"], #btnOpenNewBt, #btContainer, .plan-header, #mainNav a[data-module="planTravail"]',
            summary: 'Cliquez sur un organe ou une roue pour signaler un problème.',
            summaryAr: 'اضغط على عضو أو عجلة للإبلاغ عن مشكلة.',
            bullets: [
                'Cliquez sur l\'organe défaillant sur le schéma.',
                'Signalez les problèmes de pneus (crevaison, usure).',
                'Les pièces de rechange sont proposées automatiquement.'
            ],
            bulletsAr: [
                'اضغط على العضو المعطّل في المخطط.',
                'أبلغ عن مشاكل الإطارات (ثقب، تآكل).',
                'يتم اقتراح قطع الغيار تلقائياً.'
            ],
            actionLabel: 'Inspecter un Organe',
            onLeave: function() {
                if (typeof UI !== 'undefined' && UI.closeModal) UI.closeModal();
            },
            onAction: function() {
                if (window.PlanTravailModule && PlanTravailModule.open2DSchematicModal) PlanTravailModule.open2DSchematicModal();
                else if (window.App && App.loadModule) App.loadModule('planTravail');
            }
        },
        {
            id: 'workOrderPrint',
            chapterIndex: 6,
            chapterTitle: 'Chapitre 6 : Schéma Véhicule & Réparations (BT)',
            module: 'planTravail',
            targetModule: 'planTravail',
            title: 'Bon de Travail (BT) Officiel',
            titleAr: 'أمر العمل (BT) الرسمي',
            icon: 'fas fa-file-invoice',
            color: '#6d28d9',
            targetSelector: '.btn-print-bt, .btn-close-plan, #btContainer, #mainNav a[data-module="planTravail"]',
            summary: 'Créez et imprimez le bon de travail pour l\'atelier.',
            summaryAr: 'أنشئ واطبع أمر العمل للورشة.',
            bullets: [
                'Bon de travail officiel de 2 pages.',
                'QR Code de sécurité sur chaque bon.',
                'Clôturez le BT une fois la réparation terminée.'
            ],
            bulletsAr: [
                'أمر عمل رسمي من صفحتين.',
                'رمز QR أمان على كل أمر.',
                'أغلق أمر العمل بعد انتهاء الإصلاح.'
            ],
            actionLabel: 'Voir un Bon BT',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('planTravail'); }
        },
        {
            id: 'fleetManagement',
            chapterIndex: 7,
            chapterTitle: 'Chapitre 7 : Flotte, Citernes & Carburant',
            module: 'fleet',
            targetModule: 'fleet',
            title: 'Parc des Véhicules',
            titleAr: 'حظيرة المركبات',
            icon: 'fas fa-truck-moving',
            color: '#f59e0b',
            targetSelector: '#mainNav a[data-module="fleet"], #fleetCards, #fleetModule, #fleetFamilyFilter',
            summary: 'Consultez la liste de tous les véhicules du parc.',
            summaryAr: 'اطّلع على قائمة جميع مركبات الحظيرة.',
            bullets: [
                'Fiche de chaque véhicule avec son statut.',
                'Type de camion, moteur et kilométrage.',
                'Alertes pour les vidanges et contrôles techniques.'
            ],
            bulletsAr: [
                'بطاقة كل مركبة مع حالتها.',
                'نوع الشاحنة والمحرك والمسافة المقطوعة.',
                'تنبيهات لتغيير الزيت والفحص التقني.'
            ],
            actionLabel: 'Voir la Flotte',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('fleet'); }
        },
        {
            id: 'citernesFuel',
            chapterIndex: 7,
            chapterTitle: 'Chapitre 7 : Flotte, Citernes & Carburant',
            module: 'citernes',
            targetModule: 'citernes',
            title: 'Cuves Carburant & Bons Naftal',
            titleAr: 'خزانات الوقود ووصولات نفطال',
            icon: 'fas fa-gas-pump',
            color: '#ea580c',
            targetSelector: '#mainNav a[data-module="citernes"], #citernesModule, .citernes-container, #citerneSearchInput',
            summary: 'Suivez le niveau des cuves et les livraisons Naftal.',
            summaryAr: 'تابع مستوى الخزانات وتسليمات نفطال.',
            bullets: [
                'Jauges visuelles du niveau de chaque cuve.',
                'Enregistrement des bons de livraison Naftal.',
                'Alerte quand le niveau est bas.'
            ],
            bulletsAr: [
                'مقاييس مرئية لمستوى كل خزان.',
                'تسجيل وصولات تسليم نفطال.',
                'تنبيه عندما ينخفض المستوى.'
            ],
            actionLabel: 'Voir les Citernes',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('citernes'); }
        },
        {
            id: 'consumptionAnalytics',
            chapterIndex: 7,
            chapterTitle: 'Chapitre 7 : Flotte, Citernes & Carburant',
            module: 'citernes',
            targetModule: 'citernes',
            title: 'Consommation Carburant par Véhicule',
            titleAr: 'استهلاك الوقود حسب المركبة',
            icon: 'fas fa-chart-line',
            color: '#d97706',
            targetSelector: '#consoCategoryChart, #consumptionModule, #mainNav a[data-module="citernes"], #citernesModule',
            summary: 'Analysez la consommation aux 100 km de chaque camion.',
            summaryAr: 'حلّل استهلاك كل شاحنة لكل 100 كم.',
            bullets: [
                'Ratio de consommation aux 100 km par véhicule.',
                'Détection des surconsommations anormales.',
                'Comparaison entre véhicules du parc.'
            ],
            bulletsAr: [
                'نسبة الاستهلاك لكل 100 كم حسب المركبة.',
                'كشف الاستهلاك المفرط غير العادي.',
                'مقارنة بين مركبات الحظيرة.'
            ],
            actionLabel: 'Voir les Ratios',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('citernes'); }
        },
        {
            id: 'auditAndSettings',
            chapterIndex: 8,
            chapterTitle: 'Chapitre 8 : Historique & Administration',
            module: 'history',
            targetModule: 'history',
            title: 'Historique, Utilisateurs & Paramètres',
            titleAr: 'السجل والمستخدمون والإعدادات',
            icon: 'fas fa-shield-halved',
            color: '#dc2626',
            targetSelector: '#mainNav a[data-module="history"], #auditTrailTable, #historyOrdersTable, #historyModule, #settingsModule',
            summary: 'Consultez l\'historique des mouvements et gérez les comptes.',
            summaryAr: 'اطّلع على سجل الحركات وأدر الحسابات.',
            bullets: [
                'Journal de tous les mouvements de stock.',
                'Gestion des comptes utilisateurs et rôles.',
                'Sauvegarde et restauration des données.'
            ],
            bulletsAr: [
                'سجل جميع حركات المخزون.',
                'إدارة حسابات المستخدمين والأدوار.',
                'نسخ احتياطي واستعادة البيانات.'
            ],
            actionLabel: 'Voir l\'Historique',
            onAction: function() { if (window.App && App.loadModule) App.loadModule('history'); }
        }
    ];

    const ROLE_STEPS_MAP = {
        normal: ROLE_STEPS_NORMAL,
        magasinier: ROLE_STEPS_MAG,
        chef_section_gestion: ROLE_STEPS_CHEF,
        admin: ROLE_STEPS_ADMIN
    };


    const StockTutorialModule = {
        currentStep: 0,
        _lastStepIndex: -1,
        isActive: false,
        isTocOpen: false,
        tourMode: 'all',
        _activeUser: null,
        steps: [],
        ALL_EXHAUSTIVE_STEPS: ALL_EXHAUSTIVE_STEPS,
        ROLE_STEPS_MAP: ROLE_STEPS_MAP,

        getAllExhaustiveSteps: function() {
            return ALL_EXHAUSTIVE_STEPS;
        },

        toggleUserProfileDropdown: function(force) {
            const d = document.getElementById('userDropdown');
            if (!d) return;
            const isOpen = d.classList.contains('show') || d.classList.contains('open');
            const shouldOpen = (typeof force === 'boolean') ? force : !isOpen;
            if (shouldOpen) {
                d.classList.add('show');
                d.classList.add('open');
            } else {
                d.classList.remove('show');
                d.classList.remove('open');
            }
            if (this.isActive) {
                const profileBtn = document.getElementById('userProfileBtn');
                if (profileBtn) {
                    this.positionSpotlight(profileBtn);
                }
            }
            const actionBtn = document.querySelector('#tutorialCard .tutorial-btn-action');
            if (actionBtn && this.steps && this.steps[this.currentStep] && this.steps[this.currentStep].id === 'userProfile') {
                actionBtn.innerHTML = shouldOpen
                    ? '<i class="fas fa-circle-xmark me-2"></i> ' + (TUTORIAL_LANG.isAr() ? 'إغلاق القائمة' : 'Fermer le Menu Profil')
                    : '<i class="fas fa-arrow-up-right-from-square me-2"></i> ' + (TUTORIAL_LANG.isAr() ? 'فتح قائمة الملف الشخصي' : 'Ouvrir le Menu Profil');
            }
        },

        toggleStepDetails: function() {
            const detailsEl = document.getElementById('tutorialExtraDetails');
            const btn = document.getElementById('btnToggleTutorialDetails');
            if (!detailsEl) return;
            const isHidden = detailsEl.style.display === 'none' || !detailsEl.classList.contains('open');
            if (isHidden) {
                detailsEl.style.display = 'block';
                detailsEl.classList.add('open');
                if (btn) {
                    btn.classList.add('expanded');
                    btn.innerHTML = '<i class="fas fa-chevron-up me-1"></i> ' + (TUTORIAL_LANG.isAr() ? 'أقل تفاصيل' : 'Moins de détails');
                }
            } else {
                detailsEl.style.display = 'none';
                detailsEl.classList.remove('open');
                if (btn) {
                    btn.classList.remove('expanded');
                    btn.innerHTML = '<i class="fas fa-chevron-down me-1"></i> ' + (TUTORIAL_LANG.isAr() ? 'تفاصيل إضافية' : 'Plus de détails');
                }
            }
            if (this.isActive) {
                const curStep = (this.steps && this.steps[this.currentStep]) ? this.steps[this.currentStep] : null;
                if (curStep) {
                    this.positionSpotlight(curStep);
                }
            }
        },

        toggleLang: function() {
            TUTORIAL_LANG.set(TUTORIAL_LANG.isFr() ? 'ar' : 'fr');
            this.renderStep(this.currentStep);
        },

        getRoleKey: function(user) {
            const u = user || this._activeUser || (typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null);
            if (!u) return 'normal';

            const role = (typeof u === 'string' ? u : (u.role || '')).toLowerCase();
            const username = (typeof u === 'object' && u.username ? u.username : (typeof u === 'string' ? u : '')).toLowerCase();

            if (role === 'admin' || role === 'superadmin' || role === 'directeur' || username === 'admin' || username === 'achouri' || username === 'dg') {
                return 'admin';
            }
            if (role === 'chef_section_gestion' || role === 'approbateur' || role === 'chef_section') {
                return 'chef_section_gestion';
            }
            if (role === 'magasinier' || role === 'mag' || role === 'gds' || username === 'merdaci' || username === 'lekcir') {
                return 'magasinier';
            }
            return 'normal';
        },

        getRoleBadge: function(user) {
            const r = (typeof user === 'string' && ROLE_STEPS_MAP[user]) ? user : this.getRoleKey(user);
            switch (r) {
                case 'admin':
                    return 'Mode Administrateur Système / Direction';
                case 'chef_section_gestion':
                    return 'Mode Chef de Section Gestion / Approbation';
                case 'magasinier':
                    return 'Mode Magasinier / Gestionnaire de Stock';
                default:
                    return 'Mode Demandeur / Utilisateur Standard';
            }
        },

        getStepsForCurrentUser: function(user) {
            const roleKey = this.getRoleKey(user);
            return ROLE_STEPS_MAP[roleKey] || ROLE_STEPS_NORMAL;
        },

        getRoleSteps: function(user) {
            return this.getStepsForCurrentUser(user);
        },

        start: function(user, mode) {
            this._activeUser = user || (typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null);
            this.tourMode = mode || this.tourMode || 'all';
            if (this.tourMode === 'role') {
                this.steps = this.getStepsForCurrentUser(this._activeUser);
            } else {
                this.steps = this.getAllExhaustiveSteps();
            }
            this.currentStep = 0;
            this._lastStepIndex = -1;
            this.isActive = true;
            this.isTocOpen = false;
            this.dismissWelcomePrompt();

            if (typeof document !== 'undefined' && document.querySelectorAll) {
                try {
                    const activeEls = document.querySelectorAll('.tutorial-active-target');
                    if (activeEls && activeEls.forEach) {
                        activeEls.forEach(el => {
                            if (el && el.classList && el.classList.remove) {
                                el.classList.remove('tutorial-active-target');
                            }
                        });
                    }
                } catch (e) {}
            }

            const udrop = document.getElementById('userDropdown');
            if (udrop) {
                udrop.classList.remove('open');
                udrop.classList.remove('show');
            }

            this.createOverlay();
            this.renderStep(this.currentStep);
            this.bindEvents();
        },

        createOverlay: function() {
            this.injectToastStyles();
            let overlay = document.getElementById('stockTutorialOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'stockTutorialOverlay';
                overlay.className = 'stock-tutorial-overlay';
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = `
                <div class="tutorial-dim-mask" id="tutorialDimMask"></div>
                <div class="tutorial-spotlight-halo" id="tutorialSpotlightHalo">
                    <div class="tutorial-pulse-ring ring-1"></div>
                    <div class="tutorial-pulse-ring ring-2"></div>
                </div>
                <div class="tutorial-card-container" id="tutorialCardContainer">
                    <div class="tutorial-card" id="tutorialCard"></div>
                </div>
            `;
            overlay.classList.add('active');
        },

        renderStep: function(stepIndex) {
            const steps = (this.steps && this.steps.length > 0) ? this.steps : ((this.tourMode === 'role') ? this.getStepsForCurrentUser(this._activeUser) : this.getAllExhaustiveSteps());
            this.steps = steps;
            const step = steps[stepIndex];
            if (!step) return;

            // Trigger onLeave on previous step if transitioning away
            if (this._lastStepIndex >= 0 && steps[this._lastStepIndex] && this._lastStepIndex !== stepIndex) {
                const prevStep = steps[this._lastStepIndex];
                if (typeof prevStep.onLeave === 'function') {
                    try { prevStep.onLeave(); } catch (e) {}
                }
            }
            this._lastStepIndex = stepIndex;

            // Global cleanup: force-close cart drawer when leaving cart steps
            const isCartStep = (step.id === 'cart' || step.id === 'cartDock' || step.id === 'cartDrawer' || step.id === 'cartQrPass');
            if (!isCartStep && window.Cart && Cart.closeDrawer) {
                try { Cart.closeDrawer(); } catch (e) {}
            }
            // Also close the cart drawer backdrop if it exists
            if (!isCartStep) {
                try {
                    var backdrop = document.getElementById('reqDrawerBackdrop');
                    if (backdrop) backdrop.style.display = 'none';
                    var drawer = document.getElementById('reqDrawer');
                    if (drawer) {
                        drawer.classList.remove('active');
                        drawer.classList.remove('open');
                        drawer.classList.remove('show');
                    }
                } catch (e) {}
            }

            // Close any open modals/dropdowns that might overlap
            try {
                var userDrop = document.getElementById('userDropdown');
                if (userDrop && step.id !== 'userProfile') {
                    userDrop.classList.remove('open');
                    userDrop.classList.remove('show');
                }
                var notifDrop = document.getElementById('notifDropdown');
                if (notifDrop && step.id !== 'notifications') {
                    notifDrop.style.display = 'none';
                }
            } catch (e) {}

            // Trigger onEnter on incoming step
            if (typeof step.onEnter === 'function') {
                try { step.onEnter(); } catch (e) {}
            }

            const targetMod = step.targetModule || step.module;
            const currentMod = (window.App && App.currentModule) ? App.currentModule : null;

            if (targetMod && targetMod !== currentMod && window.App && typeof App.loadModule === 'function') {
                App.loadModule(targetMod);
                setTimeout(() => {
                    this._renderCardAndSpotlight(step, stepIndex, steps);
                }, 500);
            } else {
                this._renderCardAndSpotlight(step, stepIndex, steps);
            }
        },

        _renderCardAndSpotlight: function(step, stepIndex, steps) {
            const roleBadge = this.getRoleBadge(this._activeUser);
            const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

            const card = document.getElementById('tutorialCard');
            if (!card) return;

            const isAr = TUTORIAL_LANG.isAr();
            const dir = isAr ? 'rtl' : 'ltr';
            const title = isAr ? (step.titleAr || step.title) : step.title;
            const summary = isAr ? (step.summaryAr || step.summary || '') : (step.summary || '');
            const bullets = isAr ? (step.bulletsAr || step.bullets || []) : (step.bullets || []);
            const extraDet = step.extraDetails || [];
            const isAllMode = (this.tourMode === 'all');
            const modeLabel = isAllMode ? (isAr ? 'الدليل الشامل (21 خيار)' : 'Guide Intégral ERP (21 Options)') : roleBadge;
            const stepLabel = isAr ? `الخطوة ${stepIndex + 1} من ${steps.length}` : `Étape ${stepIndex + 1} sur ${steps.length}`;
            const stepCounter = isAr ? `الخطوة ${stepIndex + 1} / ${steps.length}` : `Étape ${stepIndex + 1} / ${steps.length}`;
            const tocLabel = isAr ? `الفهرس (${steps.length})` : `Sommaire (${steps.length})`;
            const prevLabel = isAr ? 'السابق' : 'Précédent';
            const nextLabel = (stepIndex === steps.length - 1) ? (isAr ? 'إنهاء' : 'Terminer') : (isAr ? 'التالي' : 'Suivant');
            const skipLabel = isAr ? 'تخطي' : 'Passer';
            const moreLabel = isAr ? 'تفاصيل إضافية' : 'Plus de détails';
            const langBtn = isAr ? '🇫🇷 Français' : '🇩🇿 العربية';

            card.setAttribute('dir', dir);
            card.innerHTML = `
                <div class="tutorial-card-arrow" id="tutorialCardArrow"></div>
                <div class="tutorial-card-header" style="border-bottom: 2px solid ${step.color || '#2563eb'}22;">
                    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="tutorial-step-chip" style="background:${step.color || '#2563eb'};">
                                ${stepLabel}
                            </span>
                            <span class="tutorial-role-chip">
                                ${modeLabel}
                            </span>
                        </div>
                        <div class="d-flex align-items-center gap-1">
                            <button type="button" class="tutorial-btn-lang" onclick="StockTutorialModule.toggleLang();" title="Changer la langue">
                                ${langBtn}
                            </button>
                            <button type="button" class="tutorial-btn-toc" onclick="StockTutorialModule.toggleToc();" title="Sommaire">
                                <i class="fas fa-book-open me-1"></i> ${tocLabel}
                            </button>
                            <button type="button" class="tutorial-close-btn" onclick="StockTutorialModule.close();" title="Fermer">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <div class="tutorial-step-icon" style="background:${step.color || '#2563eb'}20;color:${step.color || '#2563eb'};border:1px solid ${step.color || '#2563eb'}40;">
                            <i class="${step.icon}"></i>
                        </div>
                        <div>
                            ${step.chapterTitle ? `<div class="tutorial-chapter-chip">${step.chapterTitle}</div>` : ''}
                            <h4 class="tutorial-step-title mb-0">${title}</h4>
                            <p class="tutorial-step-subtitle mb-0">${summary}</p>
                        </div>
                    </div>
                </div>

                <div class="tutorial-card-main-body" id="tutorialCardMainBody">
                    <div class="tutorial-card-body">
                        <div class="tutorial-bullets-box">
                            ${bullets.map(b => `
                                <div class="tutorial-bullet-item">
                                    <div class="tutorial-bullet-dot" style="background:${step.color || '#2563eb'};"></div>
                                    <div class="tutorial-bullet-text">${b}</div>
                                </div>
                            `).join('')}
                        </div>

                        ${(extraDet.length > 0) ? `
                            <button type="button" class="tutorial-btn-details-toggle" id="btnToggleTutorialDetails" onclick="StockTutorialModule.toggleStepDetails();">
                                <i class="fas fa-chevron-down me-1"></i> ${moreLabel}
                            </button>
                            <div class="tutorial-step-extra-details" id="tutorialExtraDetails" style="display:none;">
                                <div class="tutorial-bullets-box mb-0">
                                    ${extraDet.map(d => `
                                        <div class="tutorial-bullet-item">
                                            <div class="tutorial-bullet-dot" style="background:${step.color || '#2563eb'};opacity:0.7;"></div>
                                            <div class="tutorial-bullet-text text-muted" style="font-size:12px;">${d}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${step.actionLabel ? `
                            <div class="tutorial-live-action-box">
                                <button type="button" class="tutorial-btn-action" style="background:linear-gradient(135deg, ${step.color || '#2563eb'}, #1d4ed8);" onclick="StockTutorialModule.runCurrentAction();">
                                    <i class="fas fa-arrow-up-right-from-square me-2"></i> ${step.actionLabel}
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="tutorial-card-footer">
                        <div class="tutorial-progress-meta">
                            <span class="tutorial-progress-text">${stepCounter}</span>
                        </div>
                        <div class="tutorial-progress-track">
                            <div class="tutorial-progress-bar" style="width:${progressPct}%;background:${step.color || '#2563eb'};"></div>
                        </div>
                        <div class="tutorial-footer-actions">
                            <button type="button" class="tutorial-btn-nav" id="btnTutorialPrev" onclick="StockTutorialModule.prev();" ${stepIndex === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                                <i class="fas fa-chevron-left me-1"></i> ${prevLabel}
                            </button>
                            <div class="tutorial-footer-center">
                                <span class="tutorial-step-counter-pill">${stepCounter}</span>
                                <button type="button" class="tutorial-btn-skip" onclick="StockTutorialModule.close();" title="${skipLabel}">
                                    ${skipLabel} <i class="fas fa-forward ms-1"></i>
                                </button>
                            </div>
                            <button type="button" class="tutorial-btn-nav tutorial-btn-primary" id="btnTutorialNext" style="background:${step.color || '#2563eb'};border-color:${step.color || '#2563eb'};" onclick="StockTutorialModule.next();">
                                ${nextLabel} ${(stepIndex === steps.length - 1) ? '<i class="fas fa-check ms-1"></i>' : '<i class="fas fa-chevron-right ms-1"></i>'}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="tutorial-toc-panel" id="tutorialTocPanel" style="display:none;">
                    <div class="tutorial-toc-header">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <div class="fw-bold fs-6 text-light"><i class="fas fa-list-ol me-2 text-primary"></i> Sommaire Complet de l'ERP</div>
                            <button type="button" class="tutorial-close-btn" onclick="StockTutorialModule.toggleToc(false);" title="Fermer le sommaire">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="tutorial-toc-mode-bar mb-2">
                            <button type="button" class="toc-mode-pill ${isAllMode ? 'active' : ''}" onclick="StockTutorialModule.setTourMode('all');">
                                <i class="fas fa-cubes me-1"></i> Mode Intégral (21 Options)
                            </button>
                            <button type="button" class="toc-mode-pill ${!isAllMode ? 'active' : ''}" onclick="StockTutorialModule.setTourMode('role');">
                                <i class="fas fa-user-gear me-1"></i> Mode Rôle (${roleBadge})
                            </button>
                        </div>
                        <div class="tutorial-toc-search-box">
                            <i class="fas fa-search tutorial-toc-search-icon"></i>
                            <input type="text" id="tocSearchInput" data-testid="tocSearchInput" class="tutorial-toc-search-input" placeholder="Filtrer les options (ex: déconnexion, scan, véhicule, citernes...)" oninput="StockTutorialModule.filterToc(this.value);" />
                        </div>
                    </div>
                    <div class="tutorial-toc-list" id="tutorialTocList"></div>
                </div>
            `;

            this.positionSpotlight(step);
        },

        findTargetElement: function(step) {
            if (!step) return null;

            // Direct DOM element support
            if (step.nodeType === 1 || (typeof step === 'object' && step.tagName && typeof step.getBoundingClientRect === 'function')) {
                return step;
            }

            // Tier 1: Primary target element (from targetSelector or primarySelector)
            const selStr = (typeof step === 'string') ? step : (step.targetSelector || step.primarySelector || '');
            if (selStr) {
                const parts = selStr.split(',').map(s => s.trim()).filter(Boolean);
                for (const p of parts) {
                    try {
                        const found = document.querySelector(p);
                        if (found && (found.offsetParent !== null || found.getClientRects().length > 0)) {
                            return found;
                        }
                    } catch (e) {}
                }
            }

            // Tier 2: Secondary target element in main navigation
            const targetMod = (typeof step === 'object') ? (step.targetModule || step.module) : null;
            if (targetMod) {
                const navSelectors = [
                    `#mainNav a[data-module="${targetMod}"]`,
                    `nav a[data-module="${targetMod}"]`,
                    `#mainNav [data-module="${targetMod}"]`,
                    `nav [data-module="${targetMod}"]`,
                    `[data-module="${targetMod}"]`
                ];
                for (const ns of navSelectors) {
                    try {
                        const found = document.querySelector(ns);
                        if (found && (found.offsetParent !== null || found.getClientRects().length > 0)) {
                            return found;
                        }
                    } catch (e) {}
                }
            }

            // Tier 3: Fallback container
            const fallbacks = ['#module-container', '.module-active', '#mainContent', '.content-area', '#appContainer'];
            for (const fb of fallbacks) {
                try {
                    const found = document.querySelector(fb);
                    if (found) return found;
                } catch (e) {}
            }

            return null;
        },

        positionSpotlight: function(stepOrSelector) {
            const halo = document.getElementById('tutorialSpotlightHalo');
            const cardContainer = document.getElementById('tutorialCardContainer');
            if (!halo || !cardContainer) return;

            // Remove .tutorial-active-target from any previously highlighted element
            if (typeof document !== 'undefined' && document.querySelectorAll) {
                try {
                    const activeEls = document.querySelectorAll('.tutorial-active-target');
                    if (activeEls && activeEls.forEach) {
                        activeEls.forEach(el => {
                            if (el && el.classList && el.classList.remove) {
                                el.classList.remove('tutorial-active-target');
                            }
                        });
                    }
                } catch (e) {}
            }

            const arrowEl = document.getElementById('tutorialCardArrow') || (cardContainer.querySelector ? cardContainer.querySelector('.tutorial-card-arrow') : null);

            const isDomElement = stepOrSelector && (stepOrSelector.nodeType === 1 || (typeof stepOrSelector === 'object' && stepOrSelector.tagName && typeof stepOrSelector.getBoundingClientRect === 'function'));

            let step = (!isDomElement && typeof stepOrSelector === 'object' && stepOrSelector !== null)
                ? stepOrSelector
                : (this.steps ? this.steps[this.currentStep] : null);

            let targetEl = null;
            if (isDomElement) {
                targetEl = stepOrSelector;
            } else if (typeof stepOrSelector === 'string') {
                targetEl = this.findTargetElement(stepOrSelector);
            } else if (step) {
                targetEl = this.findTargetElement(step);
            }

            const vw = (typeof window !== 'undefined' && window.innerWidth) || 1200;
            const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
            const isMobile = vw < 768;

            if (!targetEl) {
                halo.style.display = 'none';
                if (isMobile) {
                    cardContainer.style.top = '';
                    cardContainer.style.left = '';
                    cardContainer.style.right = '';
                    cardContainer.style.bottom = '';
                    cardContainer.style.transform = '';
                } else if (step && step.cardPosition === 'top-left') {
                    cardContainer.style.top = '70px';
                    cardContainer.style.left = '24px';
                    cardContainer.style.right = 'auto';
                    cardContainer.style.bottom = 'auto';
                    cardContainer.style.transform = 'none';
                    if (typeof cardContainer.setAttribute === 'function') {
                        cardContainer.setAttribute('data-placement', 'top-left');
                    }
                } else {
                    cardContainer.style.top = '70px';
                    cardContainer.style.right = '24px';
                    cardContainer.style.left = 'auto';
                    cardContainer.style.bottom = 'auto';
                    cardContainer.style.transform = 'none';
                    if (typeof cardContainer.setAttribute === 'function') {
                        cardContainer.setAttribute('data-placement', 'top-right');
                    }
                }
                if (arrowEl) {
                    arrowEl.className = 'tutorial-card-arrow';
                    arrowEl.style.display = 'none';
                }
                return;
            }

            try {
                targetEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
            } catch (e) {}

            const rect = targetEl.getBoundingClientRect();
            const isFallback = (targetEl.id === 'module-container' || targetEl.id === 'mainContent' || targetEl.id === 'appContainer' || (targetEl.classList && typeof targetEl.classList.contains === 'function' && targetEl.classList.contains('module-active')));
            const isUserProfileBtn = (targetEl.id === 'userProfileBtn' || (step && step.id === 'userProfile' && targetEl.id !== 'btnLogout'));
            const isCircular = isUserProfileBtn || (targetEl.classList && typeof targetEl.classList.contains === 'function' && targetEl.classList.contains('user-avatar-btn'));
            const haloPad = isCircular ? 4 : 8;

            if (isFallback) {
                halo.style.display = 'none';
            } else {
                try {
                    if (targetEl && targetEl.classList && typeof targetEl.classList.add === 'function') {
                        targetEl.classList.add('tutorial-active-target');
                    }
                } catch (e) {}

                halo.style.display = 'block';
                halo.style.top = Math.max(0, rect.top - haloPad) + 'px';
                halo.style.left = Math.max(0, rect.left - haloPad) + 'px';
                halo.style.width = Math.max(30, rect.width + haloPad * 2) + 'px';
                halo.style.height = Math.max(30, rect.height + haloPad * 2) + 'px';

                if (isCircular) {
                    halo.classList.add('halo-circle');
                    halo.style.borderRadius = '50%';
                } else {
                    halo.classList.remove('halo-circle');
                    halo.style.borderRadius = '12px';
                }
            }

            if (isMobile) {
                cardContainer.style.top = '';
                cardContainer.style.left = '';
                cardContainer.style.right = '';
                cardContainer.style.bottom = '';
                cardContainer.style.transform = '';
                if (arrowEl) {
                    arrowEl.className = 'tutorial-card-arrow';
                    arrowEl.style.display = 'none';
                }
                return;
            }

            const cardWidth = 560;
            const cardHeight = Math.max(cardContainer.offsetHeight || 0, 440);
            const pad = 16;

            let top = 0;
            let left = 0;
            let right = 'auto';
            let arrow = 'none';

            if (step && step.cardPosition === 'top-left') {
                top = 70;
                left = 24;
                right = 'auto';
                arrow = 'none';
            } else if (step && step.cardPosition === 'top-right') {
                top = 70;
                right = 24;
                left = 'auto';
                arrow = 'none';
            } else if (isFallback) {
                top = 70;
                right = 24;
                left = 'auto';
                arrow = 'none';
            } else if (isUserProfileBtn) {
                top = rect.bottom + 14;
                right = Math.max(16, vw - rect.right);
                left = 'auto';
                arrow = 'arrow-top-right';
            } else if (rect.left < vw * 0.4 && (rect.right + cardWidth + pad < vw)) {
                left = rect.right + pad;
                top = Math.max(pad, Math.min(rect.top, vh - cardHeight - pad));
                arrow = 'arrow-left';
            } else if (rect.right > vw * 0.6 && (rect.left - cardWidth - pad > 0)) {
                left = rect.left - cardWidth - pad;
                top = Math.max(pad, Math.min(rect.top, vh - cardHeight - pad));
                arrow = 'arrow-right';
            } else if (vh - rect.bottom > cardHeight + pad) {
                top = rect.bottom + pad;
                left = Math.max(pad, Math.min(rect.left + rect.width / 2 - cardWidth / 2, vw - cardWidth - pad));
                arrow = 'arrow-top';
            } else if (rect.top > cardHeight + pad) {
                top = rect.top - cardHeight - pad;
                left = Math.max(pad, Math.min(rect.left + rect.width / 2 - cardWidth / 2, vw - cardWidth - pad));
                arrow = 'arrow-bottom';
            } else {
                top = 70;
                right = 24;
                left = 'auto';
                arrow = 'none';
            }

            // Safe height and bounds clamping
            if (vh < 620) {
                top = 10;
            } else {
                top = Math.max(10, Math.min(top, vh - cardHeight - 12));
            }

            if (arrow === 'arrow-top-right' || (step && step.cardPosition === 'top-right')) {
                if (typeof cardContainer.setAttribute === 'function') {
                    cardContainer.setAttribute('data-placement', 'top-right');
                }
            } else if (step && step.cardPosition === 'top-left') {
                if (typeof cardContainer.setAttribute === 'function') {
                    cardContainer.setAttribute('data-placement', 'top-left');
                }
            } else {
                if (typeof cardContainer.removeAttribute === 'function') {
                    cardContainer.removeAttribute('data-placement');
                }
            }

            if (left === 'auto') {
                cardContainer.style.top = top + 'px';
                cardContainer.style.left = 'auto';
                cardContainer.style.right = (typeof right === 'number' ? right + 'px' : right);
                cardContainer.style.bottom = 'auto';
                cardContainer.style.transform = 'none';
            } else {
                cardContainer.style.top = top + 'px';
                cardContainer.style.left = left + 'px';
                cardContainer.style.right = 'auto';
                cardContainer.style.bottom = 'auto';
                cardContainer.style.transform = 'none';
            }

            if (arrowEl) {
                arrowEl.className = 'tutorial-card-arrow ' + arrow;
                arrowEl.style.display = (arrow === 'none') ? 'none' : 'block';
            }
        },

        runCurrentAction: function() {
            const step = this.steps[this.currentStep];
            if (step && typeof step.onAction === 'function') {
                step.onAction();
                if (step.id !== 'userProfile') {
                    setTimeout(() => {
                        this.positionSpotlight(step.targetSelector);
                    }, 350);
                }
            }
        },

        next: function() {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.renderStep(this.currentStep);
            } else {
                this.close();
            }
        },

        prev: function() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.renderStep(this.currentStep);
            }
        },

        goTo: function(idx) {
            if (idx >= 0 && idx < this.steps.length) {
                this.currentStep = idx;
                this.renderStep(this.currentStep);
            }
        },

        toggleToc: function(force) {
            this.isTocOpen = (typeof force === 'boolean') ? force : !this.isTocOpen;
            const panel = document.getElementById('tutorialTocPanel');
            const mainBody = document.getElementById('tutorialCardMainBody');
            if (!panel) return;
            if (this.isTocOpen) {
                panel.style.display = 'block';
                if (mainBody) mainBody.style.display = 'none';
                this.renderTocItems('');
                const input = document.getElementById('tocSearchInput') || document.getElementById('tutorialTocSearch');
                if (input) {
                    input.value = '';
                    setTimeout(() => { if (input.focus) input.focus(); }, 50);
                }
            } else {
                panel.style.display = 'none';
                if (mainBody) mainBody.style.display = 'block';
            }
        },

        filterToc: function(query) {
            this.renderTocItems(query);
        },

        jumpToStep: function(idx) {
            this.toggleToc(false);
            this.goTo(idx);
        },

        setTourMode: function(mode) {
            this.tourMode = (mode === 'role') ? 'role' : 'all';
            if (this.tourMode === 'role') {
                this.steps = this.getStepsForCurrentUser(this._activeUser);
            } else {
                this.steps = this.getAllExhaustiveSteps();
            }
            this.currentStep = 0;
            this._lastStepIndex = -1;
            this.toggleToc(false);
            this.renderStep(0);
        },

        renderTocItems: function(query) {
            const listEl = document.getElementById('tutorialTocList');
            if (!listEl) return;
            const q = (query || '').toLowerCase().trim();
            const steps = this.steps || [];

            const filtered = steps.map((step, idx) => ({ step, idx })).filter(item => {
                if (!q) return true;
                const matchTitle = (item.step.title || '').toLowerCase().includes(q);
                const matchSummary = (item.step.summary || '').toLowerCase().includes(q);
                const matchChapter = (item.step.chapterTitle || '').toLowerCase().includes(q);
                const matchBullets = (item.step.bullets || []).some(b => (b || '').toLowerCase().includes(q));
                return matchTitle || matchSummary || matchChapter || matchBullets;
            });

            if (filtered.length === 0) {
                listEl.innerHTML = `<div class="tutorial-toc-empty">Aucune option ne correspond à "${query}".</div>`;
                return;
            }

            let lastChapter = null;
            let html = '';
            filtered.forEach(({ step, idx }) => {
                if (step.chapterTitle && step.chapterTitle !== lastChapter) {
                    lastChapter = step.chapterTitle;
                    html += `<div class="tutorial-toc-chapter-header"><i class="fas fa-bookmark me-2 text-primary"></i>${lastChapter}</div>`;
                }
                const isCurrent = idx === this.currentStep;
                html += `
                    <div class="tutorial-toc-item ${isCurrent ? 'current' : ''}" onclick="StockTutorialModule.jumpToStep(${idx});">
                        <div class="tutorial-toc-num" style="background:${step.color || '#2563eb'};">#${idx + 1}</div>
                        <div class="tutorial-toc-item-icon" style="color:${step.color || '#2563eb'};">
                            <i class="${step.icon}"></i>
                        </div>
                        <div class="tutorial-toc-item-content">
                            <div class="tutorial-toc-item-title">${step.title}</div>
                            <div class="tutorial-toc-item-desc">${step.summary}</div>
                        </div>
                        <div class="tutorial-toc-item-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        },

        close: function() {
            this.isActive = false;
            this.isTocOpen = false;
            if (this._lastStepIndex >= 0 && this.steps && this.steps[this._lastStepIndex]) {
                const prevStep = this.steps[this._lastStepIndex];
                if (typeof prevStep.onLeave === 'function') {
                    try { prevStep.onLeave(); } catch (e) {}
                }
            }
            this._lastStepIndex = -1;
            const udrop = document.getElementById('userDropdown');
            if (udrop) {
                udrop.classList.remove('open');
                udrop.classList.remove('show');
            }
            // Force-close cart drawer and backdrop on tutorial close
            try {
                if (window.Cart && Cart.closeDrawer) Cart.closeDrawer();
                var backdrop = document.getElementById('reqDrawerBackdrop');
                if (backdrop) backdrop.style.display = 'none';
                var drawer = document.getElementById('reqDrawer');
                if (drawer) {
                    drawer.classList.remove('active');
                    drawer.classList.remove('open');
                    drawer.classList.remove('show');
                }
            } catch (e) {}
            this.markTourDone();
            if (typeof document !== 'undefined' && document.querySelectorAll) {
                try {
                    const activeEls = document.querySelectorAll('.tutorial-active-target');
                    if (activeEls && activeEls.forEach) {
                        activeEls.forEach(el => {
                            if (el && el.classList && el.classList.remove) {
                                el.classList.remove('tutorial-active-target');
                            }
                        });
                    }
                } catch (e) {}
            }
            const overlay = document.getElementById('stockTutorialOverlay');
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => { if (typeof overlay.remove === 'function') overlay.remove(); }, 250);
            }
        },

        cleanup: function() {
            this.close();
        },

        markTourDone: function(username) {
            const u = username || (this._activeUser && this._activeUser.username) || (typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser()?.username : 'user');
            try {
                if (u) localStorage.setItem('douroub_tour_done_' + u, 'true');
            } catch (e) {}
        },

        bindEvents: function() {
            if (typeof window.addEventListener !== 'function') return;
            const handleKeyDown = (e) => {
                if (!this.isActive) {
                    window.removeEventListener('keydown', handleKeyDown);
                    return;
                }
                if (e.key === 'ArrowRight') {
                    this.next();
                } else if (e.key === 'ArrowLeft') {
                    this.prev();
                } else if (e.key === 'Escape') {
                    this.close();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            if (!this._hasViewportListeners && typeof this._onViewportChange === 'function') {
                window.addEventListener('resize', this._onViewportChange, { passive: true });
                window.addEventListener('scroll', this._onViewportChange, { passive: true });
                this._hasViewportListeners = true;
            }
        },

        checkFirstLoginAutoPrompt: function(username) {
            const u = username || (typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser()?.username : null);
            if (!u) return;

            let isDone = false;
            try {
                isDone = localStorage.getItem('douroub_tour_done_' + u) === 'true';
            } catch (e) {}

            if (isDone) return;
            this.showWelcomeToast(u);
        },

        showWelcomeToast: function(username) {
            if (document.getElementById('douroubWelcomeTourPrompt')) return;
            this.injectToastStyles();

            const userObj = (typeof Auth !== 'undefined' && Auth.getCurrentUser) ? Auth.getCurrentUser() : { username: username };
            const roleBadge = this.getRoleBadge(userObj);

            const toast = document.createElement('div');
            toast.id = 'douroubWelcomeTourPrompt';
            toast.className = 'douroub-tour-toast';
            toast.innerHTML = `
                <div class="douroub-tour-toast-header">
                    <div class="d-flex align-items-center gap-2">
                        <div class="douroub-tour-toast-icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div>
                            <div class="douroub-tour-toast-title">Visite Guidée Stock & Atelier</div>
                            <div class="douroub-tour-toast-badge">${roleBadge}</div>
                        </div>
                    </div>
                    <button type="button" class="douroub-tour-toast-close" onclick="StockTutorialModule.dismissWelcomePrompt('${username}');" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="douroub-tour-toast-body">
                    👋 <strong>Bienvenue !</strong> Souhaitez-vous suivre la visite guidée adaptée à votre rôle ?
                </div>
                <div class="douroub-tour-toast-actions">
                    <button type="button" class="btn btn-sm btn-primary fw-bold" onclick="StockTutorialModule.startFromPrompt('${username}');">
                        <i class="fas fa-play me-1"></i> Démarrer le Guide
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="StockTutorialModule.dismissWelcomePrompt('${username}');">
                        Plus tard
                    </button>
                </div>
            `;

            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('visible'), 50);
        },

        dismissWelcomePrompt: function(username) {
            this.markTourDone(username);
            const toast = document.getElementById('douroubWelcomeTourPrompt');
            if (toast) {
                toast.classList.remove('visible');
                setTimeout(() => { if (typeof toast.remove === 'function') toast.remove(); }, 250);
            }
            const oldToast = document.getElementById('welcomeTourToast');
            if (oldToast) {
                setTimeout(() => { if (typeof oldToast.remove === 'function') oldToast.remove(); }, 250);
            }
        },

        dismissWelcome: function() {
            this.dismissWelcomePrompt();
        },

        checkWelcomePrompt: function(username) {
            this.checkFirstLoginAutoPrompt(username);
        },

        startFromPrompt: function(username) {
            this.dismissWelcomePrompt(username);
            this.start();
        },

        resetTourForUser: function(username) {
            const u = username || (typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser()?.username : 'user');
            try {
                if (u) {
                    localStorage.removeItem('douroub_tour_done_' + u);
                    localStorage.removeItem('erp_douroub_tour_prompted');
                }
            } catch (e) {}
        },

        injectToastStyles: function() {
            if (document.getElementById('douroubTourToastStyles')) return;
            const style = document.createElement('style');
            style.id = 'douroubTourToastStyles';
            style.textContent = `
                .douroub-tour-toast {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    max-width: 380px;
                    background: #1e293b;
                    color: #f8fafc;
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    border-radius: 14px;
                    padding: 16px 18px;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.2);
                    z-index: 999999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: inherit;
                }
                .douroub-tour-toast.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .douroub-tour-toast-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .douroub-tour-toast-icon {
                    width: 32px;
                    height: 32px;
                    background: rgba(56, 189, 248, 0.15);
                    color: #38bdf8;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 15px;
                }
                .douroub-tour-toast-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #ffffff;
                }
                .douroub-tour-toast-badge {
                    font-size: 10px;
                    font-weight: 600;
                    color: #38bdf8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .douroub-tour-toast-close {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 4px;
                }
                .douroub-tour-toast-close:hover { color: #f8fafc; }
                .douroub-tour-toast-body {
                    font-size: 12.5px;
                    line-height: 1.45;
                    color: #cbd5e1;
                    margin-bottom: 12px;
                }
                .douroub-tour-toast-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: flex-end;
                }
                .douroub-tour-toast-actions .btn-primary {
                    background: #0284c7;
                    border-color: #0284c7;
                    color: #ffffff;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                }
                .douroub-tour-toast-actions .btn-outline-secondary {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #cbd5e1;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                }
                .douroub-tour-toast-actions .btn-outline-secondary:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #ffffff;
                }
                .tutorial-active-target {
                    position: relative !important;
                    z-index: 100052 !important;
                    outline: 3px solid #38bdf8 !important;
                    outline-offset: 4px !important;
                    box-shadow: 0 0 25px rgba(56, 189, 248, 0.6) !important;
                    border-radius: 8px !important;
                    animation: tutorialTargetPulse 2s ease-in-out infinite !important;
                }
                .tutorial-spotlight-halo.halo-circle {
                    border-radius: 50% !important;
                }
                .tutorial-card-arrow.arrow-top-right,
                [data-placement="top-right"] .tutorial-card-arrow {
                    top: -7px;
                    right: 24px;
                    left: auto;
                    border-top: 1px solid #334155;
                    border-left: 1px solid #334155;
                    border-bottom: none !important;
                    border-right: none !important;
                    box-shadow: -2px -2px 6px rgba(0, 0, 0, 0.25);
                }
                @keyframes tutorialTargetPulse {
                    0%, 100% {
                        outline-color: #38bdf8;
                        box-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
                    }
                    50% {
                        outline-color: #0284c7;
                        box-shadow: 0 0 35px rgba(2, 132, 199, 0.85);
                    }
                }
                .tutorial-btn-toc {
                    background: rgba(56, 189, 248, 0.12);
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    color: #38bdf8;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    transition: all 0.2s ease;
                }
                .tutorial-btn-toc:hover {
                    background: rgba(56, 189, 248, 0.25);
                    color: #ffffff;
                    border-color: #38bdf8;
                }
                .tutorial-chapter-chip {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #94a3b8;
                    margin-bottom: 2px;
                }
                .tutorial-toc-panel {
                    padding: 14px 16px;
                    max-height: 380px;
                    overflow-y: auto;
                    background: rgba(15, 23, 42, 0.98);
                    border-radius: 0 0 12px 12px;
                }
                .tutorial-toc-header {
                    margin-bottom: 12px;
                }
                .tutorial-toc-mode-bar {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .toc-mode-pill {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #cbd5e1;
                    padding: 4px 9px;
                    border-radius: 6px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .toc-mode-pill.active {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #ffffff;
                    font-weight: 700;
                }
                .tutorial-toc-search-box {
                    position: relative;
                    margin-top: 6px;
                }
                .tutorial-toc-search-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #64748b;
                    font-size: 11px;
                }
                .tutorial-toc-search-input {
                    width: 100%;
                    padding: 7px 10px 7px 28px;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    color: #ffffff;
                    font-size: 11.5px;
                    outline: none;
                }
                .tutorial-toc-search-input:focus {
                    border-color: #38bdf8;
                    background: rgba(255, 255, 255, 0.1);
                }
                .tutorial-toc-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .tutorial-toc-chapter-header {
                    font-size: 11px;
                    font-weight: 700;
                    color: #38bdf8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 8px 4px 4px 4px;
                    border-bottom: 1px solid rgba(56, 189, 248, 0.2);
                    margin-top: 6px;
                }
                .tutorial-toc-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 10px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .tutorial-toc-item:hover {
                    background: rgba(56, 189, 248, 0.12);
                    border-color: rgba(56, 189, 248, 0.35);
                    transform: translateX(2px);
                }
                .tutorial-toc-item.current {
                    background: rgba(2, 132, 199, 0.25);
                    border-color: #38bdf8;
                }
                .tutorial-toc-num {
                    font-size: 10px;
                    font-weight: 700;
                    color: #ffffff;
                    padding: 2px 6px;
                    border-radius: 4px;
                    flex-shrink: 0;
                }
                .tutorial-toc-item-icon {
                    font-size: 14px;
                    width: 20px;
                    text-align: center;
                    flex-shrink: 0;
                }
                .tutorial-toc-item-content {
                    flex: 1;
                    min-width: 0;
                }
                .tutorial-toc-item-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #f1f5f9;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .tutorial-toc-item-desc {
                    font-size: 10.5px;
                    color: #94a3b8;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .tutorial-toc-item-arrow {
                    color: #64748b;
                    font-size: 11px;
                }
                .tutorial-toc-empty {
                    padding: 16px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
                }
                .tutorial-footer-actions {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    gap: 8px;
                    box-sizing: border-box;
                    padding-top: 6px;
                }
                .tutorial-footer-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .tutorial-step-counter-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    font-size: 11.5px;
                    font-weight: 700;
                    color: #94a3b8;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 6px;
                    white-space: nowrap;
                }
                #btnTutorialPrev,
                #btnTutorialNext {
                    flex-shrink: 0;
                    white-space: nowrap;
                }
            `;
            document.head.appendChild(style);
        }
    };

    window.StockTutorialModule = StockTutorialModule;

    // Viewport & Resolution Tracking for Dynamic Spotlight Recalculation (Single Global Throttled Listener)
    let _rafTrack = null;
    function _onViewportChange() {
        if (!StockTutorialModule.isActive) return;
        if (_rafTrack && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(_rafTrack);
        }
        const rafFn = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : setTimeout;
        _rafTrack = rafFn(() => {
            if (StockTutorialModule.currentStep !== null && StockTutorialModule.steps && StockTutorialModule.steps[StockTutorialModule.currentStep]) {
                const curStep = StockTutorialModule.steps[StockTutorialModule.currentStep];
                StockTutorialModule.positionSpotlight(curStep);
            }
        }, 0);
    }
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('resize', _onViewportChange, { passive: true });
        window.addEventListener('scroll', _onViewportChange, { passive: true });
    }
    StockTutorialModule._onViewportChange = _onViewportChange;
    StockTutorialModule._hasViewportListeners = true;

    // Attach to UI
    if (typeof window.UI === 'undefined') window.UI = {};
    window.UI.startStockTutorial = function() {
        StockTutorialModule.start();
    };

    // Auto-hook into Auth.login for First-Login prompt
    if (typeof window.Auth !== 'undefined' && typeof window.Auth.login === 'function') {
        const _origAuthLogin = window.Auth.login;
        window.Auth.login = function(username, password) {
            const res = _origAuthLogin.apply(this, arguments);
            if (res) {
                setTimeout(() => {
                    StockTutorialModule.checkFirstLoginAutoPrompt(username);
                }, 800);
            }
            return res;
        };
    }

    function initAutoTourPrompt() {
        setTimeout(() => {
            if (typeof window.Auth !== 'undefined' && window.Auth.isLoggedIn && window.Auth.isLoggedIn()) {
                const u = window.Auth.getCurrentUser();
                if (u && u.username) {
                    StockTutorialModule.checkFirstLoginAutoPrompt(u.username);
                }
            }
        }, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoTourPrompt);
    } else {
        initAutoTourPrompt();
    }

})(window);
