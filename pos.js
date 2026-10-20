  [data-theme="dark"] .pos-category-card:hover {
        box-shadow: 0 12px 28px rgba(37,99,235,0.30) !important;
    }
    [data-theme="dark"] .pos-category-card.active {
        background: linear-gradient(135deg, #1C2333 0%, #1E293B 100%) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-item {
        background: rgba(22,27,34,0.9) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-total-row {
        background: linear-gradient(135deg, #1C2333 0%, #1E293B 100%) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-total-row span:last-child {
        color: #60A5FA !important;
    }
    [data-theme="dark"] .pos-qty-btn {
        background: #1C2333 !important;
        border: none !important;
        color: #8B949E !important;
    }
    [data-theme="dark"] .pos-qty-btn:hover {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
    }
    [data-theme="dark"] .pos-qty-input {
        background: #0D1117 !important;
        border: none !important;
        color: #F0F6FC !important;
    }
    [data-theme="dark"] .pos-product-name,
    [data-theme="dark"] .pos-category-card .category-name {
        color: #F0F6FC !important;
    }
    [data-theme="dark"] .pos-product-price {
        color: #60A5FA !important;
    }
    [data-theme="dark"] .pos-multi-carts-bar {
        background: rgba(22,27,34,0.72) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-products-panel,
    [data-theme="dark"] .pos-cart-panel {
        background: rgba(22,27,34,0.92) !important;
        border: none !important;
    }
    `;

    document.head.appendChild(styles);
    console.log('🚀 [POS] Style ASTRONAUTE injecté (glassmorphism + glow + gradients, sans bordures)');
})();

// ============================================================
// ✅ BOUTON FLÈCHE ↑ — DÉPLACÉ DANS <body> (1ère couche absolue)
// ============================================================
(function moveScrollTopToBody() {
    var STYLE = `
    .pos-scroll-top-btn {
        position: fixed !important;
        top: 8px !important;
        right: 8px !important;
        left: auto !important;
        bottom: auto !important;
        width: 52px !important;
        height: 52px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%) !important;
        color: #FFFFFF !important;
        border: 2px solid #FFFFFF !important;
        font-size: 20px !important;
        cursor: pointer !important;
        box-shadow:
            0 6px 18px rgba(37,99,235,0.55),
            0 3px 8px rgba(0,0,0,0.20),
            0 0 0 3px rgba(59,130,246,0.25) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: auto !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        isolation: auto !important;
        contain: none !important;
    }
    .pos-scroll-top-btn:hover {
        transform: translateZ(0) scale(1.10) !important;
        box-shadow:
            0 8px 24px rgba(37,99,235,0.65),
            0 4px 10px rgba(0,0,0,0.25),
            0 0 0 3px rgba(59,130,246,0.35) !important;
    }
    .pos-scroll-top-btn:active {
        transform: translateZ(0) scale(0.94) !important;
    }
    @media (max-width: 768px) {
        .pos-scroll-top-btn {
            top: 6px !important;
            right: 6px !important;
            width: 48px !important;
            height: 48px !important;
            font-size: 17px !important;
        }
    }
    @media (max-width: 380px) {
        .pos-scroll-top-btn {
            top: 4px !important;
            right: 4px !important;
            width: 44px !important;
            height: 44px !important;
            font-size: 16px !important;
        }
    }
    [data-theme="dark"] .pos-scroll-top-btn {
        border-color: #1C2333 !important;
        box-shadow:
            0 6px 18px rgba(59,130,246,0.55),
            0 3px 8px rgba(0,0,0,0.50),
            0 0 0 3px rgba(59,130,246,0.30) !important;
    }
    `;
    if (!document.getElementById('pos-scroll-top-style')) {
        var s = document.createElement('style');
        s.id = 'pos-scroll-top-style';
        s.textContent = STYLE;
        document.head.appendChild(s);
    }
    function relocate() {
        document.querySelectorAll('.pos-scroll-top-btn').forEach(function(btn) {
            if (btn.parentElement !== document.body) {
                document.body.appendChild(btn);
            }
        });
    }
    setInterval(relocate, 500);
    relocate();
})();
/////////
// ============================================================
// ✅ SUPPRESSION DU PAGE-HEADER SUR MOBILE (< 700px)
// Ajout isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function hidePageHeaderOnMobile() {
    var STYLE_ID = 'pos-hide-pageheader-mobile';
    if (document.getElementById(STYLE_ID)) return;

    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    @media (max-width: 700px) {
        .page-header,
        #pageHeader,
        header.page-header,
        .page-header-wrapper,
        #pageHeaderWrapper {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            overflow: hidden !important;
        }
        .pos-container {
            margin-top: 0 !important;
            padding-top: 6px !important;
        }
        #dynamicContent {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
        body {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
    }
    `;
    document.head.appendChild(s);
    console.log('✅ [POS] page-header supprimé sur mobile (< 700px)');
})();  
// ============================================================
// ✅ AGRANDIR LA ZONE UTILE SUR MOBILE (< 700px)
// Supprime les marges/paddings latéraux qui réduisent la largeur
// ⚠️ Bloc isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function posAgrandirZoneMobile() {
    var STYLE_ID = 'pos-agrandir-zone-mobile';
    if (document.getElementById(STYLE_ID)) return;

    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    @media (max-width: 700px) {

        /* 1) Masquer le page-header (gain vertical) */
        .page-header,
        #pageHeader,
        header.page-header,
        .page-header-wrapper,
        #pageHeaderWrapper {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }

        /* 2) Supprimer les paddings latéraux (gain horizontal) */
        .main-content {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 4px !important;
        }
        #dynamicContent {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
        .pos-container {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            gap: 4px !important;
        }
        .pos-row {
            padding-left: 0 !important;
            padding-right: 0 !important;
            gap: 4px !important;
        }

        /* 3) Panneaux produits et panier : pleine largeur, marge interne minimale */
        .pos-products-panel,
        .pos-cart-panel {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            padding-left: 3px !important;
            padding-right: 3px !important;
            border-radius: 10px !important;
        }

        /* 4) Panneau produits plus haut (plus de produits visibles) */
        .pos-products-panel {
            max-height: 65vh !important;
            min-height: 350px !important;
        }

        /* 5) Grilles : gap réduit pour gagner de la place */
        .pos-products-grid {
            gap: 5px !important;
            padding: 2px !important;
        }
        .pos-categories-grid {
            gap: 5px !important;
            padding: 2px !important;
        }

        /* 6) Panier : plus de hauteur pour les articles */
        .pos-cart-items {
            min-height: 240px !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
        }

        body {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
    }
    `;
    document.head.appendChild(s);
    console.log('✅ [POS] Zone mobile agrandie (header masqué + marges supprimées)');
})();
// ============================================================
// ⬆️ BOUTON FLÈCHE — VERSION FINALE ANTI-DOUBLON
// Un seul bouton, en BAS à droite, TEAL, TOUJOURS VISIBLE
// ⚠️ Bloc isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function posScrollBtnUnique() {
    var STYLE_ID = 'pos-scroll-btn-unique-style';
    var UNIQUE_BTN_ID = 'posUniqueScrollBtn';

    // Supprimer les anciens styles
    ['pos-scroll-top-style', 'pos-scroll-top-bottom-final', 'pos-scroll-top-always', 'pos-scroll-btn-final-override'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });

    // Supprimer l'ancien style s'il existe
    var oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();

    // Injecter le CSS
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    /* ========== BOUTON FLÈCHE UNIQUE ========== */
    #posUniqueScrollBtn {
        position: fixed !important;
        bottom: 24px !important;
        right: 20px !important;
        top: auto !important;
        left: auto !important;
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%) !important;
        color: #FFFFFF !important;
        border: 2px solid rgba(255,255,255,0.25) !important;
        font-size: 22px !important;
        cursor: pointer !important;
        box-shadow:
            0 6px 20px rgba(20,184,166,0.55),
            0 3px 8px rgba(0,0,0,0.35) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #posUniqueScrollBtn:hover {
        transform: translateY(-3px) scale(1.08) !important;
        box-shadow:
            0 10px 28px rgba(20,184,166,0.7),
            0 4px 10px rgba(0,0,0,0.4) !important;
    }

    #posUniqueScrollBtn:active {
        transform: scale(0.94) !important;
    }

    @media (max-width: 700px) {
        #posUniqueScrollBtn {
            width: 50px !important;
            height: 50px !important;
            font-size: 19px !important;
            bottom: 18px !important;
            right: 14px !important;
        }
    }

    @media (max-width: 380px) {
        #posUniqueScrollBtn {
            width: 46px !important;
            height: 46px !important;
            font-size: 17px !important;
            bottom: 14px !important;
            right: 12px !important;
        }
    }
    `;
    document.head.appendChild(s);

    // ========== FONCTION POUR SUPPRIMER LES DOUBLONS ==========
    function cleanupDuplicates() {
        // Supprimer TOUS les boutons avec les anciennes classes
        document.querySelectorAll('.pos-scroll-top-btn, button[onclick*="scrollIntoView"]').forEach(function(btn) {
            // Garder uniquement le bouton unique
            if (btn.id !== UNIQUE_BTN_ID) {
                btn.remove();
            }
        });
    }

    // ========== CRÉER LE BOUTON UNIQUE (1 SEULE FOIS) ==========
    function createUniqueButton() {
        // Si le bouton existe déjà, on ne fait rien
        if (document.getElementById(UNIQUE_BTN_ID)) {
            return;
        }

        // Nettoyer les doublons avant de créer
        cleanupDuplicates();

        var btn = document.createElement('button');
        btn.id = UNIQUE_BTN_ID;
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.title = 'Remonter en haut';
        btn.setAttribute('type', 'button');
        btn.onclick = function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            var dc = document.getElementById('dynamicContent');
            if (dc) dc.scrollTo({ top: 0, behavior: 'smooth' });
        };
        document.body.appendChild(btn);
    }

    // Créer immédiatement
    createUniqueButton();

    // ========== SURVEILLER LES DOUBLONS ==========
    // MutationObserver : dès qu'un doublon est ajouté, on le supprime
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Si c'est un bouton flèche doublon
                    if (node.classList && node.classList.contains('pos-scroll-top-btn') && node.id !== UNIQUE_BTN_ID) {
                        node.remove();
                    }
                    // Si c'est un bouton scrollIntoView doublon
                    if (node.onclick && node.onclick.toString().indexOf('scrollIntoView') !== -1 && node.id !== UNIQUE_BTN_ID) {
                        node.remove();
                    }
                    // Chercher les doublons dans les enfants ajoutés
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.pos-scroll-top-btn, button[onclick*="scrollIntoView"]').forEach(function(child) {
                            if (child.id !== UNIQUE_BTN_ID) child.remove();
                        });
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Vérifier régulièrement (sécurité supplémentaire)
    setInterval(function() {
        cleanupDuplicates();
        createUniqueButton();
    }, 1000);

    console.log('⬆️ [POS] Bouton flèche UNIQUE — BAS à droite, TEAL, anti-doublon');
})();
console.log('🚀 E-SOLUTION - POS V5 ASTRONAUTE (sans bordures)');
console.log('✅ Design glassmorphism + glow + gradients');
console.log('✅ BORDURES RETIRÉES : séparations par ombres uniquement');
console.log('✅ Recherche + Tables/En ligne visibles sur PC ET mobile');
console.log('✅ Panier 100% largeur sur mobile + marges propres');
console.log('✅ Bouton flèche ↑ DÉPLACÉ DANS <body> → 1ère couche absolue');
console.log('✅ Panier min-height 220px (3+ articles visibles)');
console.log('✅ Boutons POS AGRANDIS + hover néon');
console.log('✅ BOUTON VALIDER STICKY (toujours visible)');
