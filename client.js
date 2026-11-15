// ==================== CLIENT.JS - E-SOLUTION (VERSION FINALE POS IDENTIQUE) ====================
// ✅ Le client voit EXACTEMENT le même POS que l'admin/caissier
// ✅ Réutilise directement pos.js : buildFullPOS, filterProductGrid, updateCartOnly, etc.
// ✅ 🆕 v2 : Bannière Welcome + boutons modernes + CSS intégré
// ✅ Barre de recherche : bouton "Afficher tout" → affiche la barre de recherche uniquement
// ✅ Étape de paiement identique (Étape 1 → Étape 2)
// ✅ SANS multi-paniers
// ✅ SANS boutons Tables / En ligne
// ✅ Mêmes dimensions / même responsive

var clientCart = [];
var clientStep = 1;
var clientIsClientMode = true;

// ==================== 🆕 v2 : STYLES INTÉGRÉS CLIENT ====================
function injectClientStyles() {
    if (document.getElementById('clientModernStylesV2')) return;

    var style = document.createElement('style');
    style.id = 'clientModernStylesV2';
    style.textContent = `
    /* ============================================================
       🎨 CLIENT PAGE — Modernisation 2026
       Couleurs Teal #14B8A6 + Slate #0F172A + Blanc
       ============================================================ */

    /* ==================== LAYOUT GÉNÉRAL ==================== */
    #clientPage {
        background:
            radial-gradient(circle at 15% 15%, rgba(20,184,166,0.08) 0%, transparent 45%),
            radial-gradient(circle at 85% 85%, rgba(15,23,42,0.05) 0%, transparent 45%),
            #F8FAFC !important;
        min-height: 100vh !important;
        font-family: 'Inter', -apple-system, sans-serif !important;
    }
    #clientPage .main-content {
        background: transparent !important;
        padding: 24px !important;
    }

    /* ==================== HEADER ==================== */
    #clientPage .page-header {
        background: rgba(255, 255, 255, 0.75) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.9) !important;
        border-radius: 20px !important;
        padding: 20px 24px !important;
        margin-bottom: 24px !important;
        box-shadow:
            0 20px 40px -15px rgba(0, 0, 0, 0.12),
            0 4px 12px -4px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
    }
    #clientPage .page-header .header-title {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
    }
    #clientPage .page-header .header-title i {
        background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
        color: #FFFFFF !important;
        padding: 12px !important;
        border-radius: 14px !important;
        font-size: 20px !important;
        box-shadow:
            0 8px 20px -4px rgba(20, 184, 166, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.3) !important;
    }
    #clientPage .page-header .header-title h2 {
        font-size: 24px !important;
        font-weight: 800 !important;
        color: #0F172A !important;
        letter-spacing: -0.6px !important;
        margin: 0 !important;
    }

    /* ==================== SIDEBAR ==================== */
    #clientPage .client-sidebar {
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border-right: 1px solid rgba(226, 232, 240, 0.8) !important;
        box-shadow: 4px 0 30px -10px rgba(0, 0, 0, 0.08) !important;
    }
    #clientPage .client-sidebar .sidebar-header {
        padding: 24px 20px !important;
        border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
        background: linear-gradient(180deg, rgba(20,184,166,0.05), transparent) !important;
    }
    #clientPage .client-sidebar .sidebar-logo {
        width: 56px !important;
        height: 56px !important;
        background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
        border-radius: 16px !important;
        border: none !important;
        box-shadow: 0 8px 20px -4px rgba(20,184,166,0.4) !important;
        margin-bottom: 14px !important;
    }
    #clientPage .client-sidebar .nav-item {
        padding: 14px 18px !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        color: #475569 !important;
        margin-bottom: 4px !important;
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }
    #clientPage .client-sidebar .nav-item:hover {
        color: #14B8A6 !important;
        transform: translateX(2px);
        background: rgba(20, 184, 166, 0.08) !important;
    }
    #clientPage .client-sidebar .nav-item.active {
        background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
        color: #FFFFFF !important;
        font-weight: 700 !important;
        box-shadow:
            0 8px 20px -4px rgba(20,184,166,0.4),
            inset 0 1px 0 rgba(255,255,255,0.3) !important;
        border: none !important;
    }
    #clientPage .client-sidebar .nav-item.active i {
        color: #FFFFFF !important;
    }
    #clientPage .client-sidebar .nav-item i {
        width: 22px !important;
        font-size: 16px !important;
        color: #64748B !important;
    }

    /* ==================== CONTENT CARDS ==================== */
    #clientDynamicContent .content-card {
        background: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.95) !important;
        border-radius: 20px !important;
        padding: 28px !important;
        margin-bottom: 20px !important;
        box-shadow:
            0 20px 40px -15px rgba(0, 0, 0, 0.12),
            0 4px 12px -4px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
    }
    #clientDynamicContent .card-header {
        border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
        padding-bottom: 20px !important;
        margin-bottom: 24px !important;
    }
    #clientDynamicContent .card-header h3 {
        font-size: 20px !important;
        font-weight: 800 !important;
        color: #0F172A !important;
        letter-spacing: -0.4px !important;
    }

    /* ==================== BANNIÈRE WELCOME ==================== */
    .client-welcome-banner {
        background: linear-gradient(135deg, #14B8A6, #0D9488, #0F766E);
        border-radius: 20px;
        padding: 28px 32px;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        position: relative;
        overflow: hidden;
        box-shadow:
            0 20px 40px -15px rgba(20, 184, 166, 0.5),
            0 4px 12px -4px rgba(13, 148, 136, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        color: #FFFFFF;
        flex-wrap: wrap;
    }
    .client-welcome-banner::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
        border-radius: 50%;
        pointer-events: none;
    }
    .client-welcome-content {
        display: flex;
        align-items: center;
        gap: 20px;
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
    }
    .client-welcome-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: #FFFFFF;
        flex-shrink: 0;
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }
    .client-welcome-text h2 {
        margin: 0 0 4px;
        font-size: 24px;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: -0.5px;
        line-height: 1.2;
    }
    .client-welcome-text h2 span {
        color: #FEF3C7;
        text-shadow: 0 2px 8px rgba(254, 243, 199, 0.3);
    }
    .client-welcome-text p {
        margin: 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
    }
    .client-welcome-decoration {
        font-size: 64px;
        color: rgba(255, 255, 255, 0.15);
        position: relative;
        z-index: 0;
        flex-shrink: 0;
        animation: welcomeBob 3s ease-in-out infinite;
    }
    @keyframes welcomeBob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(5deg); }
    }

    /* ==================== 🆕 BOUTONS MODERNES ==================== */
    .btn-client-primary {
        background: linear-gradient(135deg, #14B8A6, #0D9488);
        color: #FFFFFF;
        border: none;
        border-radius: 12px;
        padding: 14px 28px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        box-shadow:
            0 8px 20px -4px rgba(20, 184, 166, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        position: relative;
        overflow: hidden;
        letter-spacing: 0.2px;
        font-family: inherit;
    }
    .btn-client-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.6s ease;
    }
    .btn-client-primary:hover::before {
        left: 100%;
    }
    .btn-client-primary:hover {
        transform: translateY(-2px);
        box-shadow:
            0 12px 28px -4px rgba(20, 184, 166, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    .btn-client-primary:active {
        transform: translateY(0);
    }

    .btn-client-secondary {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: #0F172A;
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 12px;
        padding: 14px 28px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        box-shadow:
            0 8px 20px -8px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        font-family: inherit;
    }
    .btn-client-secondary:hover {
        background: rgba(20, 184, 166, 0.1);
        border-color: #14B8A6;
        color: #0D9488;
        transform: translateY(-2px);
        box-shadow:
            0 12px 28px -8px rgba(20, 184, 166, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 1);
    }

    /* ==================== PANIER / PRODUITS ==================== */
    #clientDynamicContent .pos-cart-panel {
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(24px) !important;
        border-radius: 20px !important;
        box-shadow:
            0 20px 50px -15px rgba(0, 0, 0, 0.15),
            0 8px 16px -8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        border: 1px solid rgba(255, 255, 255, 0.9) !important;
    }
    #clientDynamicContent .pos-product-card {
        background: rgba(255, 255, 255, 0.7) !important;
        backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.9) !important;
        border-radius: 16px !important;
        box-shadow:
            0 8px 20px -8px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }
    #clientDynamicContent .pos-product-card:hover:not(.pos-out-of-stock) {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(20, 184, 166, 0.4) !important;
        transform: translateY(-4px) !important;
        box-shadow:
            0 20px 40px -10px rgba(20, 184, 166, 0.3),
            0 8px 16px -8px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
    }
    #clientDynamicContent .pos-category-card {
        background: rgba(255, 255, 255, 0.7) !important;
        backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.9) !important;
        border-radius: 18px !important;
        box-shadow:
            0 8px 20px -8px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }
    #clientDynamicContent .pos-category-card.active {
        background: linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.1)) !important;
        border-color: #14B8A6 !important;
        box-shadow:
            0 12px 30px -8px rgba(20, 184, 166, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
    }

    /* ==================== BOUTON VALIDER/COMMANDER ==================== */
    #clientDynamicContent .pos-validate-btn,
    #clientDynamicContent .pos-finalize-btn {
        background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
        color: #FFFFFF !important;
        border-radius: 14px !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        padding: 16px !important;
        box-shadow:
            0 10px 25px -5px rgba(20, 184, 166, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }
    #clientDynamicContent .pos-validate-btn:hover:not(:disabled),
    #clientDynamicContent .pos-finalize-btn:hover:not(:disabled) {
        transform: translateY(-2px) !important;
        box-shadow:
            0 15px 35px -5px rgba(20, 184, 166, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
        #clientPage .main-content { padding: 16px !important; }
        #clientPage .page-header {
            padding: 16px 18px !important;
            border-radius: 16px !important;
        }
        #clientPage .page-header .header-title h2 { font-size: 18px !important; }
        #clientDynamicContent .content-card {
            padding: 18px !important;
            border-radius: 16px !important;
        }
        .client-welcome-banner {
            padding: 20px 22px;
            border-radius: 16px;
        }
        .client-welcome-avatar {
            width: 50px;
            height: 50px;
            font-size: 24px;
        }
        .client-welcome-text h2 { font-size: 18px; }
        .client-welcome-text p { font-size: 12px; }
        .client-welcome-decoration { display: none; }
    }
    `;
    document.head.appendChild(style);
    console.log('✅ Styles client modernes injectés');
}

// Injection immédiate des styles
injectClientStyles();

// ==================== NAVIGATION CLIENT ====================
function clientNavigate(page) {
    var items = document.querySelectorAll('#clientPage .nav-item');
    items.forEach(function(item) { item.classList.remove('active'); });
    if (page === 'commander' && items[0]) items[0].classList.add('active');
    else if (page === 'historique' && items[1]) items[1].classList.add('active');
    else if (items[2]) items[2].classList.add('active');

    var titleEl = document.getElementById('clientPageTitle');
    if (titleEl) titleEl.textContent = page === 'commander' ? 'Commander' : page === 'historique' ? 'Mon historique' : 'Paramètres';

    if (page === 'commander') loadClientCommanderPage();
    else if (page === 'historique') loadClientHistoriquePage();
    else loadClientParametresPage();

    if (typeof closeClientSidebar === 'function') closeClientSidebar();
}

// ==================== 🆕 v2 : BANNIÈRE WELCOME ====================
function renderClientWelcomeBanner() {
    if (!window.currentUserData) return '';
    var ud = window.currentUserData.userData;
    var prenom = ud.prenom || 'Client';
    var heure = new Date().getHours();
    var salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

    var html = '<div class="client-welcome-banner">';
    html += '  <div class="client-welcome-content">';
    html += '    <div class="client-welcome-avatar">';
    html += '      <i class="fas fa-user-circle"></i>';
    html += '    </div>';
    html += '    <div class="client-welcome-text">';
    html += '      <h2>' + salutation + ', <span>' + escapeHtml(prenom) + '</span> 👋</h2>';
    html += '      <p>Que souhaitez-vous commander aujourd\'hui ?</p>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="client-welcome-decoration">';
    html += '    <i class="fas fa-utensils"></i>';
    html += '  </div>';
    html += '</div>';

    return html;
}

// ==================== PAGE COMMANDER ====================
async function loadClientCommanderPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    // ✅ Activer le mode client dans pos.js
    window.posIsClientMode = true;
    window.posHideMultiCarts = true;
    window.posHideTablesBtn = true;
    window.posHideEnLigneBtn = true;

    // 🆕 v2 : Bannière Welcome AVANT le chargement
    c.innerHTML = renderClientWelcomeBanner() + '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#14B8A6;"></i><p style="margin-top:15px;color:#64748b;">Chargement du menu...</p></div>';

    // ✅ Réinitialiser les variables pos.js pour le client
    posCart = clientCart.length > 0 ? clientCart.slice() : [];
    posStep = clientStep;
    posSelectedCategory = 'all';
    posViewMode = 'categories';
    posSelectedCategoryForView = null;
    posSearchQuery = '';
    posToolsVisible = false;
    posProductOffset = 0;

    // ✅ Pas de multi-paniers pour le client
    posMultiCarts = { 'client-panier': posCart };
    posCurrentCartId = 'client-panier';
    posMultiPaniersData = {
        'client-panier': {
            client: window.currentUserData ? {
                id: window.currentUserData.uid,
                name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
            } : null,
            table: '',
            paymentMethod: 'espece',
            discountMAD: 0,
            amountGiven: 0,
            step: 1
        }
    };

    // ✅ Définir le client actuel
    posCurrentClient = window.currentUserData ? {
        id: window.currentUserData.uid,
        name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
    } : null;

    // ✅ Charger les catégories et produits depuis le cache
    try {
        let cachedCategories = await CacheDB.getAll('categories');
        let cachedProducts = await CacheDB.getAll('products');

        if (cachedCategories.length) {
            posCategoriesList = cachedCategories.map(function(cat) {
                return { id: cat.id, nom: cat.nom, imageBase64: cat.imageBase64, recette: cat.recette || false, ordre: cat.ordre || 0 };
            });
        }
        if (cachedProducts.length) {
            posProductsList = cachedProducts.filter(function(p) { return p.disponible !== false; });
            productIndexBuilt = false;
        }
        if (posCategoriesList.length || posProductsList.length) {
            renderClientPOS();
        }
    } catch(e) { console.warn('Erreur cache client:', e); }

    // ✅ Puis Firestore
    try {
        const [cs, ps] = await Promise.all([
            db.collection('categories').get(),
            db.collection('products').get()
        ]);

        posCategoriesList = [];
        cs.forEach(function(d) {
            var dd = d.data();
            var cat = { id: d.id, nom: dd.nom, imageBase64: dd.imageBase64, recette: dd.recette || false, ordre: dd.ordre || 0 };
            posCategoriesList.push(cat);
            CacheDB.set('categories', d.id, cat);
        });

        posProductsList = [];
        ps.forEach(function(d) {
            var dd = d.data();
            if (dd.disponible !== false) {
                var prod = {
                    id: d.id,
                    nom: dd.nom || '',
                    description: dd.description || '',
                    prixVente: dd.prixVente || 0,
                    prixPromo: dd.prixPromo || 0,
                    prixAchat: dd.prixAchat || 0,
                    stock: dd.stock,
                    categorie: dd.categorie || '',
                    categories: dd.categories || [],
                    imageBase64: dd.imageBase64 || '',
                    favori: dd.favori || false
                };
                posProductsList.push(prod);
                CacheDB.set('products', d.id, prod);
            }
        });
        productIndexBuilt = false;

        renderClientPOS();
    } catch(e) {
        console.error('Erreur chargement catalogue:', e);
        renderClientPOS();
    }
}

// ==================== RENDU POS CLIENT ====================
function renderClientPOS() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    if (posProductsList.length === 0 && posCategoriesList.length === 0) {
        c.innerHTML = renderClientWelcomeBanner() + '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#14B8A6;"></i><p>Chargement...</p></div>';
        return;
    }

    // ✅ Synchroniser le panier client
    clientCart = posCart.slice();
    clientStep = posStep;

    // 🆕 v2 : Préserver la bannière Welcome
    if (typeof buildFullPOS === 'function') {
        var bannerHtml = renderClientWelcomeBanner();
        buildFullPOS(c);
        // Insérer la bannière en premier
        if (c.firstChild) {
            c.insertAdjacentHTML('afterbegin', bannerHtml);
        }
        setTimeout(masquerElementsAdminDansClient, 50);
    } else {
        c.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erreur : POS non chargé</div>';
    }
}

// ==================== MASQUER LES ÉLÉMENTS ADMIN ====================
function masquerElementsAdminDansClient() {
    var multiCartBar = document.querySelector('#clientDynamicContent .pos-multi-carts-bar');
    if (multiCartBar) multiCartBar.style.display = 'none';

    var tablesBtn = document.getElementById('posTablesBtn');
    if (tablesBtn) tablesBtn.style.display = 'none';

    var enligneBtn = document.getElementById('posEnLigneBtn');
    if (enligneBtn) enligneBtn.style.display = 'none';

    var vendeurGroup = document.getElementById('posVendeur');
    if (vendeurGroup) {
        var parent = vendeurGroup.closest('div[style*="margin-bottom"]');
        if (parent) parent.style.display = 'none';
    }

    var tableInput = document.getElementById('posTableNum');
    if (tableInput) {
        var parent = tableInput.closest('div[style*="margin-bottom"]');
        if (parent) parent.style.display = 'none';
    }

    var separator = document.querySelector('#clientDynamicContent div[style*="OU"]');
    if (separator) separator.style.display = 'none';

    var nouveauBtn = document.querySelector('#clientDynamicContent button[onclick*="posAjouterNouveauClient"]');
    if (nouveauBtn) nouveauBtn.style.display = 'none';

    var clientSearchInput = document.getElementById('posClientSearchInput');
    if (clientSearchInput) {
        var parent = clientSearchInput.closest('div[style*="position:relative"]');
        if (parent) parent.style.display = 'none';
    }

    var allLabels = document.querySelectorAll('#clientDynamicContent label');
    allLabels.forEach(function(lbl) {
        if (lbl.textContent.trim() === 'Client') {
            var parentDiv = lbl.closest('div[style*="display:flex"]');
            if (parentDiv) parentDiv.style.display = 'none';
        }
    });

    var creditBtn = document.getElementById('posCreditBtn');
    if (creditBtn) creditBtn.style.display = 'none';
    var partielBtn = document.getElementById('posPartielBtn');
    if (partielBtn) partielBtn.style.display = 'none';

    var finalizeBtn = document.querySelector('#clientDynamicContent .pos-finalize-btn');
    if (finalizeBtn) {
        finalizeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer la commande';
    }

    var paymentHeader = document.querySelector('#clientDynamicContent .pos-cart-header h3');
    if (paymentHeader && paymentHeader.textContent.indexOf('Paiement') !== -1) {
        paymentHeader.innerHTML = '<i class="fas fa-clipboard-check"></i> Confirmation';
    }
}

// ==================== SURCHARGES POS ====================
window.posFinalizeSaleOriginal = window.posFinalizeSale;
window.posFinalizeSale = async function() {
    if (window.posIsClientMode) {
        return await clientValidateOrder();
    }
    if (typeof window.posFinalizeSaleOriginal === 'function') {
        return await window.posFinalizeSaleOriginal();
    }
};

// ==================== VALIDATION COMMANDE ====================
async function clientValidateOrder() {
    if (posCart.length === 0) {
        alert('❌ Votre panier est vide. Ajoutez des articles avant de commander.');
        return;
    }

    if (!confirm('Voulez-vous envoyer votre commande ?\n\nTotal: ' + posCalculateTotal().toFixed(2) + ' MAD')) {
        return;
    }

    var total = posCalculateTotal();
    var ud = window.currentUserData ? window.currentUserData.userData : {};

    var orderData = {
        items: JSON.parse(JSON.stringify(posCart)),
        total: total,
        clientId: window.currentUserData ? window.currentUserData.uid : null,
        clientName: (ud.prenom || '') + ' ' + (ud.nom || ''),
        clientEmail: ud.email || '',
        clientTelephone: ud.telephone || '',
        statut: 'en_attente',
        source: 'client',
        paymentMethod: 'espece',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await CacheDB.write('commandes', null, orderData, 'add');
        alert('✅ Commande envoyée !\n\nTotal: ' + total.toFixed(2) + ' MAD\n\nNous vous contacterons bientôt.');

        posCart = [];
        clientCart = [];
        posStep = 1;
        clientStep = 1;
        posMultiCarts['client-panier'] = [];
        renderClientPOS();

        CacheDB.sync();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            setTimeout(function() {
                CacheDB.saveCollection('commandes');
            }, 500);
        }
    } catch(e) {
        console.error('❌ Erreur commande:', e);
        alert('❌ Erreur lors de l\'envoi: ' + e.message);
    }
}

// ==================== AUTRES SURCHARGES ====================
window.posResetCartOriginal = window.posResetCart;
window.posResetCart = function() {
    if (window.posIsClientMode) {
        posCart = [];
        clientCart = [];
        posMultiCarts['client-panier'] = [];
        posDiscountMAD = 0;
        posAmountGiven = 0;
        posCurrentClient = window.currentUserData ? {
            id: window.currentUserData.uid,
            name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
        } : null;
        posCurrentTable = '';
        posPaymentMethod = 'espece';
        if (typeof renderClientPOS === 'function') renderClientPOS();
        return;
    }
    if (typeof window.posResetCartOriginal === 'function') {
        return window.posResetCartOriginal();
    }
};

window.posGoToStep2Original = window.posGoToStep2;
window.posGoToStep2 = function() {
    if (window.posIsClientMode) {
        posMultiCarts['client-panier'] = posCart.slice();
        posStep = 2;
        clientStep = 2;
        clientCart = posCart.slice();
        renderClientPOS();
        return;
    }
    if (typeof window.posGoToStep2Original === 'function') {
        return window.posGoToStep2Original();
    }
};

window.posGoToStep1Original = window.posGoToStep1;
window.posGoToStep1 = function() {
    if (window.posIsClientMode) {
        posStep = 1;
        clientStep = 1;
        posCart = posMultiCarts['client-panier'] || [];
        clientCart = posCart.slice();
        renderClientPOS();
        return;
    }
    if (typeof window.posGoToStep1Original === 'function') {
        return window.posGoToStep1Original();
    }
};

window.renderPOSOriginal = window.renderPOS;
window.renderPOS = function() {
    if (window.posIsClientMode) {
        return renderClientPOS();
    }
    if (typeof window.renderPOSOriginal === 'function') {
        return window.renderPOSOriginal();
    }
};

window.filterProductGridOriginal = window.filterProductGrid;
window.filterProductGrid = function() {
    if (window.posIsClientMode) {
        var grid = document.getElementById('posProductGrid');
        if (grid) { /* OK */ }
    }
    if (typeof window.filterProductGridOriginal === 'function') {
        return window.filterProductGridOriginal();
    }
};

window.updateCartOnlyOriginal = window.updateCartOnly;
window.updateCartOnly = function() {
    if (window.posIsClientMode) {
        clientCart = posCart.slice();
    }
    if (typeof window.updateCartOnlyOriginal === 'function') {
        return window.updateCartOnlyOriginal();
    }
};

window.posToggleToolsOriginal = window.posToggleTools;
window.posToggleTools = function() {
    if (window.posIsClientMode) {
        posToolsVisible = !posToolsVisible;
        var toolsContainer = document.getElementById('posToolsContainer');
        var toggleBtn = document.getElementById('posToggleToolsBtn');

        if (toolsContainer) {
            if (posToolsVisible) {
                toolsContainer.style.display = 'flex';
                toolsContainer.style.flexDirection = 'column';
                toolsContainer.style.gap = '8px';
                toolsContainer.style.marginBottom = '8px';
                toolsContainer.style.padding = '8px 12px';
                toolsContainer.style.background = 'var(--bg-page)';
                toolsContainer.style.borderRadius = '8px';
                toolsContainer.style.border = '1px solid var(--border)';
                toolsContainer.classList.add('visible');
            } else {
                toolsContainer.style.display = 'none';
                toolsContainer.classList.remove('visible');
            }
        }

        if (toggleBtn) {
            toggleBtn.innerHTML = posToolsVisible ? '✕ Masquer' : '🔍 Afficher tout';
            toggleBtn.style.background = posToolsVisible ? '#ef4444' : '#14B8A6';
        }

        var searchInput = document.getElementById('posSearchInput');
        if (searchInput) {
            searchInput.style.display = posToolsVisible ? 'flex' : 'none';
            if (posToolsVisible) {
                setTimeout(function() { searchInput.focus(); }, 100);
            }
        }

        var micBtn = document.getElementById('posMicBtn');
        if (micBtn) micBtn.style.display = posToolsVisible ? 'flex' : 'none';

        var tablesBtn = document.getElementById('posTablesBtn');
        if (tablesBtn) tablesBtn.style.display = 'none';
        var enligneBtn = document.getElementById('posEnLigneBtn');
        if (enligneBtn) enligneBtn.style.display = 'none';

        var categoriesBar = document.querySelector('#clientDynamicContent .pos-categories-bar');
        if (categoriesBar) categoriesBar.style.display = 'none';

        if (!posToolsVisible) {
            posViewMode = 'categories';
            posSelectedCategoryForView = null;
            posSelectedCategory = 'all';
            posSearchQuery = '';
            posProductOffset = 0;

            var searchInput2 = document.getElementById('posSearchInput');
            if (searchInput2) searchInput2.value = '';

            var clearBtn = document.getElementById('posSearchClearBtn');
            if (clearBtn) clearBtn.style.display = 'none';

            if (typeof filterProductGrid === 'function') filterProductGrid();
        }
        return;
    }
    if (typeof window.posToggleToolsOriginal === 'function') {
        return window.posToggleToolsOriginal();
    }
};

// ==================== PAGE HISTORIQUE ====================
async function loadClientHistoriquePage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posIsClientMode = false;

    c.innerHTML = '<div class="content-card"><div class="card-header"><h3><i class="fas fa-history"></i> Mon historique</h3></div><div id="clientOrdersList" style="text-align:center;padding:20px;">Chargement...</div></div>';

    if (!window.currentUserData) {
        var cont0 = document.getElementById('clientOrdersList');
        if (cont0) cont0.innerHTML = '<p>Non connecté</p>';
        return;
    }

    var uid = window.currentUserData.uid;

    try {
        var cmdSnap = await db.collection('commandes').where('clientId', '==', uid).get();
        var all = [];
        cmdSnap.forEach(function(d) {
            var cmd = d.data();
            all.push({ type: 'commande', data: cmd, date: cmd.createdAt });
        });
        all.sort(function(a, b) { return (b.date?.seconds || 0) - (a.date?.seconds || 0); });
        all = all.slice(0, 50);

        var cont = document.getElementById('clientOrdersList');
        if (!cont) return;

        if (all.length === 0) {
            cont.innerHTML = '<p style="padding:40px;color:#94a3b8;text-align:center;"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;"></i>Aucune commande</p>';
            return;
        }

        var h = '<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Articles</th><th>Total</th><th>Statut</th></tr></thead><tbody>';
        all.forEach(function(item) {
            var d = item.data;
            var date = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString('fr-FR') : '';
            var arts = d.items ? d.items.map(function(it) { return it.quantite + 'x ' + escapeHtml(it.nom); }).join('<br>') : '-';
            var statut = d.statut === 'valide' ? '<span class="status-success">✅ Validée</span>'
                       : d.statut === 'payé' ? '<span class="status-success">💵 Payée</span>'
                       : '<span class="status-warning">⏳ En attente</span>';
            h += '<tr><td>' + date + '</td><td>' + arts + '</td><td><strong>' + (d.total || 0).toFixed(2) + ' MAD</strong></td><td>' + statut + '</td></tr>';
        });
        h += '</tbody></table></div>';
        cont.innerHTML = h;
    } catch(e) {
        console.error('Erreur historique:', e);
        var cont2 = document.getElementById('clientOrdersList');
        if (cont2) cont2.innerHTML = '<p style="color:#ef4444;">Erreur de chargement</p>';
    }
}

// ==================== PAGE PARAMÈTRES ====================
async function loadClientParametresPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posIsClientMode = false;

    if (!window.currentUserData) { c.innerHTML = '<div class="content-card"><p>Non connecté</p></div>'; return; }

    var clientData = null, clientDocId = null;
    var userEmail = window.currentUserData.userData.email;
    try {
        var clientSnap = await db.collection('clients').where('email', '==', userEmail).get();
        if (!clientSnap.empty) { clientDocId = clientSnap.docs[0].id; clientData = clientSnap.docs[0].data(); }
    } catch(e) { console.error(e); }
    if (!clientData) clientData = window.currentUserData.userData;

    var dateCreated = clientData.createdAt ? new Date(clientData.createdAt.seconds * 1000).toLocaleString('fr-FR') : 'N/A';

    var h = '<div class="content-card"><div class="card-header"><h3><i class="fas fa-user-circle"></i> Mon Profil</h3></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:0.9rem;">';
    h += '<div><strong>Nom:</strong> ' + escapeHtml(clientData.nom || '') + '</div>';
    h += '<div><strong>Prénom:</strong> ' + escapeHtml(clientData.prenom || '') + '</div>';
    h += '<div><strong>Email:</strong> ' + escapeHtml(clientData.email || '') + '</div>';
    h += '<div><strong>Tél:</strong> ' + escapeHtml(clientData.telephone || '-') + '</div>';
    h += '<div><strong>Adresse:</strong> ' + escapeHtml(clientData.adresse || '-') + '</div>';
    h += '<div><strong>Points Fidélité:</strong> ' + (clientData.pointsFidelite || 0) + '</div>';
    h += '</div>';
    // 🆕 v2 : Boutons modernes
    h += '<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">';
    h += '<button class="btn-client-primary" onclick="clientOpenEditProfile()"><i class="fas fa-edit"></i> Modifier mon profil</button>';
    h += '<button class="btn-client-secondary" onclick="clientOpenChangePassword()"><i class="fas fa-lock"></i> Changer mot de passe</button>';
    h += '</div></div>';
    c.innerHTML = h;
    window.clientProfileData = clientData;
    window.clientProfileDocId = clientDocId;
}

function clientOpenEditProfile() {
    var data = window.clientProfileData || window.currentUserData.userData;
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="clientEditNom" value="' + escapeHtml(data.nom || '') + '"></div><div class="form-group"><label>Prénom *</label><input type="text" id="clientEditPrenom" value="' + escapeHtml(data.prenom || '') + '"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Téléphone</label><input type="text" id="clientEditTel" value="' + escapeHtml(data.telephone || '') + '"></div><div class="form-group"><label>Adresse</label><input type="text" id="clientEditAdresse" value="' + escapeHtml(data.adresse || '') + '"></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="clientSaveProfile()">Enregistrer</button>';
    openModal('✏️ Modifier mon profil', h);
}

async function clientSaveProfile() {
    var nom = document.getElementById('clientEditNom').value.trim();
    var prenom = document.getElementById('clientEditPrenom').value.trim();
    if (!nom || !prenom) { alert('Nom et Prénom obligatoires'); return; }
    var updatedData = {
        nom: nom, prenom: prenom,
        telephone: document.getElementById('clientEditTel').value,
        adresse: document.getElementById('clientEditAdresse').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        var docId = window.clientProfileDocId;
        if (docId) {
            await CacheDB.write('clients', docId, updatedData, 'update');
            await CacheDB.write('users', window.currentUserData.uid, { nom: nom, prenom: prenom, telephone: updatedData.telephone }, 'update');
        } else {
            updatedData.email = window.currentUserData.userData.email;
            updatedData.username = window.currentUserData.userData.username;
            updatedData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            var newDocId = await CacheDB.write('clients', null, updatedData, 'add');
            window.clientProfileDocId = newDocId;
        }
        window.currentUserData.userData.nom = nom;
        window.currentUserData.userData.prenom = prenom;
        window.clientProfileData = updatedData;
        alert('✅ Profil mis à jour !');
        closeModal();
        loadClientParametresPage();
        CacheDB.sync();
    } catch(e) { alert('Erreur: ' + e.message); }
}

function clientOpenChangePassword() {
    var h = '<div class="form-row"><div class="form-group"><label>Mot de passe actuel</label><input type="password" id="clientOldPassword"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="clientNewPassword"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Confirmer</label><input type="password" id="clientConfirmPassword"></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="clientChangePassword()">Changer</button>';
    openModal('🔒 Changer mot de passe', h);
}

async function clientChangePassword() {
    var oldPass = document.getElementById('clientOldPassword').value;
    var newPass = document.getElementById('clientNewPassword').value;
    var confirmPass = document.getElementById('clientConfirmPassword').value;
    if (!oldPass || !newPass || !confirmPass) { alert('Tous les champs obligatoires'); return; }
    if (newPass.length < 6) { alert('6 caractères minimum'); return; }
    if (newPass !== confirmPass) { alert('Ne correspondent pas'); return; }
    var user = auth.currentUser;
    if (!user) { alert('Non connecté'); return; }
    try {
        await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, oldPass));
        await user.updatePassword(newPass);
        alert('✅ Mot de passe changé');
        closeModal();
    } catch(e) {
        if (e.code === 'auth/wrong-password') alert('❌ Mot de passe actuel incorrect');
        else alert('Erreur: ' + e.message);
    }
}

// ==================== EXPORTS GLOBAUX ====================
window.clientNavigate = clientNavigate;
window.loadClientCommanderPage = loadClientCommanderPage;
window.renderClientPOS = renderClientPOS;
window.clientValidateOrder = clientValidateOrder;
window.loadClientHistoriquePage = loadClientHistoriquePage;
window.loadClientParametresPage = loadClientParametresPage;
window.clientOpenEditProfile = clientOpenEditProfile;
window.clientSaveProfile = clientSaveProfile;
window.clientOpenChangePassword = clientOpenChangePassword;
window.clientChangePassword = clientChangePassword;
window.masquerElementsAdminDansClient = masquerElementsAdminDansClient;
window.renderClientWelcomeBanner = renderClientWelcomeBanner;
window.injectClientStyles = injectClientStyles;

console.log('🚀 E-SOLUTION - Client JS v2 chargé');
console.log('✅ Styles modernes injectés automatiquement');
console.log('✅ Bannière Welcome personnalisée');
console.log('✅ Boutons modernes (primary + secondary)');
console.log('✅ POS identique à l\'admin conservé');
console.log('✅ Couleurs Teal + Slate conservées');
