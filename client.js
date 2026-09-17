// ==================== CLIENT.JS - E-SOLUTION (VERSION RESPONSIVE COMPLÈTE) ====================
// ✅ Interface client IDENTIQUE au POS admin (responsive téléphone/PC/tablette)
// ✅ Utilise la même structure HTML : .pos-container, .pos-steps-nav, .pos-row, .pos-products-panel, .pos-cart-panel
// ✅ Fonctionne dans #clientDynamicContent
// ✅ Navigation : Commander / Historique / Paramètres

var clientCart = [];
var clientCategoriesList = [];
var clientProductsList = [];
var clientSelectedCategory = 'all';
var clientCurrentProductId = null;
var clientStep = 1;
var clientViewMode = 'categories';
var clientSelectedCategoryForView = null;
var clientSearchQuery = '';
var allStockData = [];
var clientIsRendering = false;

var clientEpicesList = ['Normal', 'Moins épicé', 'Très épicé', 'Sans épice'];
var clientSelList = ['Normal', 'Moins de sel', 'Sans sel'];

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

// ==================== UTILITAIRES ====================
function clientEscapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== PAGE COMMANDER ====================
async function loadClientCommanderPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    clientCart = [];
    clientSelectedCategory = 'all';
    clientStep = 1;
    clientViewMode = 'categories';
    clientSelectedCategoryForView = null;
    clientSearchQuery = '';

    c.innerHTML = '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#14B8A6;"></i><p style="margin-top:15px;color:#64748b;">Chargement...</p></div>';

    // Cache d'abord
    try {
        let cachedCategories = await CacheDB.getAll('categories');
        let cachedProducts = await CacheDB.getAll('products');
        if (cachedCategories.length) {
            clientCategoriesList = cachedCategories.map(function(cat) {
                return { id: cat.id, nom: cat.nom, imageBase64: cat.imageBase64, recette: cat.recette || false, ordre: cat.ordre || 0 };
            });
        }
        if (cachedProducts.length) {
            clientProductsList = cachedProducts.filter(function(p) { return p.disponible !== false; });
        }
        if (clientCategoriesList.length || clientProductsList.length) {
            renderClientPOS();
        }
    } catch(e) { console.warn('Erreur cache client:', e); }

    // Puis Firestore
    try {
        const [cs, ps] = await Promise.all([
            db.collection('categories').get(),
            db.collection('products').get()
        ]);

        clientCategoriesList = [];
        cs.forEach(function(d) {
            var dd = d.data();
            var cat = { id: d.id, nom: dd.nom, imageBase64: dd.imageBase64, recette: dd.recette || false, ordre: dd.ordre || 0 };
            clientCategoriesList.push(cat);
            CacheDB.set('categories', d.id, cat);
        });

        clientProductsList = [];
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
                clientProductsList.push(prod);
                CacheDB.set('products', d.id, prod);
            }
        });

        renderClientPOS();
    } catch(e) {
        console.error('Erreur mise à jour catalogue client', e);
        renderClientPOS();
    }
}

// ==================== AJOUT AU PANIER ====================
function clientAddToCartOrOpenOptions(pid) {
    var p = clientProductsList.find(function(x) { return x.id === pid; });
    if (!p) return;
    if (p.stock !== undefined && p.stock <= 0) { alert('Rupture de stock'); return; }

    var cat = clientCategoriesList.find(function(c) { return c.nom === p.categorie; });
    var isRecette = cat && cat.recette === true;

    if (isRecette) {
        clientCurrentProductId = pid;
        clientOpenOptionsModal(pid);
    } else {
        var existing = clientCart.find(function(x) { return x.id === pid; });
        if (existing) {
            if (p.stock !== undefined && existing.quantite >= p.stock) { alert('Stock insuffisant'); return; }
            existing.quantite += 1;
        } else {
            var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
            clientCart.push({
                id: p.id, nom: p.nom, prixUnitaire: pr,
                prixAchat: p.prixAchat || 0,
                prixPromo: p.prixPromo || 0,
                prixVente: p.prixVente || 0,
                quantite: 1, categorie: p.categorie || '',
                imageBase64: p.imageBase64 || '',
                sauces: [], interdits: [], epice: 'Normal', sel: 'Normal'
            });
        }
        clientUpdateCartOnly();
        clientUpdateGrid();
    }
}

// ==================== MODAL OPTIONS (ingrédients) ====================
async function clientOpenOptionsModal(pid) {
    var p = clientProductsList.find(function(x) { return x.id === pid; });
    if (!p) return;
    if (p.stock !== undefined && p.stock <= 0) { alert('Rupture'); return; }

    if (typeof allStockData === 'undefined' || allStockData.length === 0) {
        try {
            const snap = await db.collection('stock').orderBy('nom').get();
            allStockData = [];
            snap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allStockData.push(dd); });
        } catch(e) { console.error(e); }
    }

    try {
        const doc = await db.collection('products').doc(pid).get();
        var productIngredients = doc.exists ? (doc.data().ingredients || []) : [];
    } catch(e) { var productIngredients = []; }

    var grouped = {};
    productIngredients.forEach(function(ing) {
        var stockItem = allStockData.find(function(s) { return s.id === ing.idStock; });
        var cat = stockItem ? (stockItem.categorie || 'Ingrédients') : 'Ingrédients';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(ing.nom);
    });

    var order = ['Sauces', 'Légumes', 'Fruits', 'Viande', 'Poulet', 'Poisson', 'Ingrédients'];
    var sortedCats = Object.keys(grouped).sort(function(a, b) {
        var ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });

    clientCurrentProductId = pid;

    var h = '<h4 style="font-size:1.2rem;margin-bottom:12px;">' + clientEscapeHtml(p.nom) + '</h4>';
    h += '<p style="color:#64748b;font-size:0.85rem;margin-bottom:12px;">Décochez les ingrédients à exclure :</p>';

    if (sortedCats.length === 0) {
        h += '<div style="color:#94a3b8;padding:12px;">Aucun ingrédient à exclure</div>';
    } else {
        sortedCats.forEach(function(cat) {
            h += '<div style="margin-bottom:14px;">';
            h += '<label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:4px;">🥫 ' + clientEscapeHtml(cat) + '</label>';
            h += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
            grouped[cat].forEach(function(ing) {
                h += '<label style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;">';
                h += '<input type="checkbox" class="client-interdit-check" value="' + clientEscapeHtml(ing) + '" checked> ' + clientEscapeHtml(ing);
                h += '</label>';
            });
            h += '</div></div>';
        });
    }

    h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🌶️ Épices:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
    clientEpicesList.forEach(function(s, idx) {
        h += '<label style="padding:6px 12px;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="client-epice" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>';
    });
    h += '</div></div>';

    h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🧂 Sel:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
    clientSelList.forEach(function(s, idx) {
        h += '<label style="padding:6px 12px;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="client-sel" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>';
    });
    h += '</div></div>';

    h += '<div style="text-align:right;margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">';
    h += '<button class="btn-cancel" onclick="closeModal()" style="font-size:0.9rem;padding:10px 20px;">Annuler</button>';
    h += '<button class="btn-save" onclick="clientConfirmOptions()" style="font-size:0.9rem;padding:10px 24px;"><i class="fas fa-check"></i> Ajouter au panier</button>';
    h += '</div>';

    openModal('Personnaliser - ' + clientEscapeHtml(p.nom), h);
}

function clientConfirmOptions() {
    var interdits = [];
    document.querySelectorAll('.client-interdit-check:checked').forEach(function(cb) { interdits.push(cb.value); });
    var epiceEl = document.querySelector('input[name="client-epice"]:checked');
    var selEl = document.querySelector('input[name="client-sel"]:checked');
    var epice = epiceEl ? epiceEl.value : 'Normal';
    var sel = selEl ? selEl.value : 'Normal';

    var p = clientProductsList.find(function(x) { return x.id === clientCurrentProductId; });
    if (!p) { closeModal(); return; }

    var ex = clientCart.find(function(x) { return x.id === clientCurrentProductId; });
    if (ex) {
        if (p.stock !== undefined && ex.quantite >= p.stock) { alert('Stock insuffisant'); closeModal(); return; }
        ex.quantite += 1;
    } else {
        var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
        clientCart.push({
            id: p.id, nom: p.nom, prixUnitaire: pr,
            prixAchat: p.prixAchat || 0,
            prixPromo: p.prixPromo || 0,
            prixVente: p.prixVente || 0,
            quantite: 1, categorie: p.categorie || '',
            imageBase64: p.imageBase64 || '',
            sauces: [], interdits: interdits, epice: epice, sel: sel
        });
    }
    closeModal();
    clientUpdateCartOnly();
    clientUpdateGrid();
}

// ==================== RENDU POS CLIENT (STRUCTURE IDENTIQUE À L'ADMIN) ====================
function renderClientPOS() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    if (clientProductsList.length === 0 && clientCategoriesList.length === 0) {
        c.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#14B8A6;"></i><p>Chargement...</p></div>';
        return;
    }

    var st = clientCalculateTotal();
    var t = st;
    var isMobile = window.innerWidth < 700;

    // ✅ Indicateur d'étape IDENTIQUE à l'admin
    var stepIndicator = '<div class="pos-steps-nav">' +
        '<div class="pos-step ' + (clientStep === 1 ? 'active' : '') + '" onclick="clientGoToStep(1)">' +
            '<span class="step-number">1</span><span>Panier</span>' +
        '</div>' +
        '<div class="pos-step ' + (clientStep === 2 ? 'active' : '') + '" onclick="clientGoToStep(2)">' +
            '<span class="step-number">2</span><span>Validation</span>' +
        '</div>' +
    '</div>';

    var h = '<div class="pos-container' + (clientStep === 2 ? ' pos-container-full' : '') + '">' +
        stepIndicator +
        '<div class="pos-row">';

    // ✅ PANNEAU PRODUITS (masqué en étape 2)
    if (clientStep === 1) {
        h += '<div class="pos-products-panel">';

        // Barre de recherche + catégories (simplifiée pour le client)
        h += '<div class="pos-categories-bar" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px;">';
        h += '<button class="pos-cat-btn ' + (clientSelectedCategory === 'all' ? 'active' : '') + '" onclick="clientFilterCategory(\'all\')">📋 Tous</button>';
        var sortedCategories = clientCategoriesList.slice().sort(function(a, b) {
            var oa = (a.ordre !== undefined && a.ordre !== null) ? parseInt(a.ordre) : 9999;
            var ob = (b.ordre !== undefined && b.ordre !== null) ? parseInt(b.ordre) : 9999;
            if (oa !== ob) return oa - ob;
            return (a.nom || '').localeCompare(b.nom || '');
        });
        for (var i = 0; i < sortedCategories.length; i++) {
            var ca = sortedCategories[i];
            var ac = clientSelectedCategory === ca.nom ? 'active' : '';
            var ih = ca.imageBase64 ? '<img src="' + clientEscapeHtml(ca.imageBase64) + '" style="max-width:20px;max-height:20px;border-radius:4px;">' : '<i class="fas fa-folder"></i>';
            h += '<button class="pos-cat-btn ' + ac + '" onclick="clientFilterCategory(\'' + clientEscapeHtml(ca.nom).replace(/'/g, "\\'") + '\')">' + ih + ' ' + clientEscapeHtml(ca.nom) + '</button>';
        }
        h += '</div>';

        // Grille produits
        h += '<div class="pos-products-grid" id="clientProductGrid"></div>';
        h += '</div>';
    }

    // ✅ PANNEAU PANIER (étape 1) OU VALIDATION (étape 2)
    if (clientStep === 1) {
        h += '<div class="pos-cart-panel">' +
            '<div class="pos-cart-header" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid var(--border);">' +
                '<h3 style="font-size:0.95rem;margin:0;"><i class="fas fa-shopping-cart"></i> Mon Panier <span class="pos-cart-badge" style="background:#14B8A6;color:#fff;border-radius:50%;padding:1px 8px;font-size:0.7rem;">' + clientCart.length + '</span></h3>' +
                '<button onclick="clientClearCart()" style="background:#ef4444;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:0.7rem;cursor:pointer;"><i class="fas fa-trash-alt"></i> Vider</button>' +
            '</div>' +
            '<div class="pos-cart-items" id="clientCartItems"></div>' +
            '<div class="pos-cart-footer" style="padding:4px 0;">' +
                '<div class="pos-cart-total-row" style="display:flex;justify-content:space-between;font-size:20px;font-weight:700;padding:4px 0;border-top:2px solid var(--border);">' +
                    '<span>Total</span><span id="clientCartTotal">' + t.toFixed(2) + ' MAD</span>' +
                '</div>' +
                '<button class="pos-validate-btn" onclick="clientGoToStep(2)" ' + (clientCart.length === 0 ? 'disabled' : '') + ' style="width:100%;padding:10px;background:#14B8A6;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:700;height:40px;cursor:pointer;margin-bottom:12px;"><i class="fas fa-check-circle"></i> Valider</button>' +
            '</div>' +
        '</div>';
    } else {
        // Étape 2 : validation
        h += '<div class="pos-cart-panel">' +
            '<div class="pos-cart-header" style="padding:6px 10px;border-bottom:1px solid var(--border);">' +
                '<h3 style="font-size:0.95rem;margin:0;"><i class="fas fa-clipboard-check"></i> Confirmation</h3>' +
            '</div>' +
            '<div class="pos-payment-form" style="padding:10px;">' +
                '<div style="margin-bottom:10px;padding:8px;background:#f8fafc;border-radius:8px;">' +
                    '<div style="font-size:18px;font-weight:600;">Articles: ' + clientCart.length + '</div>' +
                    '<div style="font-size:18px;font-weight:700;">Total: ' + t.toFixed(2) + ' MAD</div>' +
                '</div>' +
                '<div style="margin-bottom:10px;">' +
                    '<label style="font-size:0.8rem;font-weight:600;">Votre nom</label>' +
                    '<input type="text" id="clientOrderName" value="' + (window.currentUserData ? clientEscapeHtml(window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom) : '') + '" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:6px;font-size:1rem;">' +
                '</div>' +
                '<div style="margin-bottom:10px;">' +
                    '<label style="font-size:0.8rem;font-weight:600;">Téléphone</label>' +
                    '<input type="text" id="clientOrderPhone" value="' + (window.currentUserData ? clientEscapeHtml(window.currentUserData.userData.telephone || '') : '') + '" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:6px;font-size:1rem;">' +
                '</div>' +
                '<div style="margin-bottom:10px;">' +
                    '<label style="font-size:0.8rem;font-weight:600;">Note (optionnel)</label>' +
                    '<textarea id="clientOrderNote" rows="2" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:6px;font-size:1rem;resize:vertical;"></textarea>' +
                '</div>' +
                '<button onclick="clientValidateOrder()" style="width:100%;padding:12px;background:#14B8A6;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;margin-bottom:12px;"><i class="fas fa-paper-plane"></i> Envoyer la commande</button>' +
                '<button onclick="clientGoToStep(1)" style="width:100%;padding:10px;background:#e2e8f0;color:#333;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;"><i class="fas fa-arrow-left"></i> Retour au panier</button>' +
            '</div>' +
        '</div>';
    }

    h += '</div></div>';
    c.innerHTML = h;

    // ✅ Remplir la grille et le panier après insertion du HTML
    if (clientStep === 1) {
        clientUpdateGrid();
        clientUpdateCartOnly();
    }
}

// ==================== MISE À JOUR GRILLE PRODUITS ====================
function clientUpdateGrid() {
    var grid = document.getElementById('clientProductGrid');
    if (!grid) return;

    var isMobile = window.innerWidth < 700;
    var isTablette = window.innerWidth >= 700 && window.innerWidth <= 1024;
    var isPC = window.innerWidth > 1024;

    // ✅ Grille responsive IDENTIQUE à l'admin
    if (isPC) grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(130px, 1fr))';
    else if (isTablette) grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    else grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

    var f = clientProductsList.slice();
    if (clientSelectedCategory !== 'all') {
        f = f.filter(function(p) {
            if (p.categories && p.categories.length > 0) return p.categories.includes(clientSelectedCategory);
            return p.categorie === clientSelectedCategory;
        });
    }
    f.sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });

    if (f.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-box-open" style="font-size:2.5rem;"></i><p>Aucun produit</p></div>';
        return;
    }

    var html = '';
    for (var j = 0; j < f.length; j++) {
        var p = f[j];
        var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
        var hp = p.prixPromo && p.prixPromo > 0;
        var stockTxt = '';
        if (p.stock !== undefined && p.stock <= 0) stockTxt = ' (Rupture)';
        else if (p.stock !== undefined && p.stock <= 5) stockTxt = ' (' + p.stock + ' rest.)';

        var imgContent = p.imageBase64
            ? '<img src="' + clientEscapeHtml(p.imageBase64) + '" loading="lazy" alt="">'
            : '<i class="fas fa-box" style="font-size:' + (isMobile ? '22px' : '28px') + ';color:var(--text-muted);"></i>';

        html += '<div class="pos-product-card" onclick="clientAddToCartOrOpenOptions(\'' + p.id + '\')">' +
            '<div class="pos-product-img">' + imgContent + '</div>' +
            '<div class="pos-product-info">' +
                '<span class="pos-product-name">' + clientEscapeHtml(p.nom) + stockTxt + '</span>' +
                '<span class="pos-product-price">' +
                    (hp
                        ? '<span class="pos-old-price">' + p.prixVente.toFixed(2) + '</span> <span class="pos-promo-price">' + pr.toFixed(2) + ' MAD</span>'
                        : pr.toFixed(2) + ' MAD') +
                '</span>' +
            '</div>' +
        '</div>';
    }
    grid.innerHTML = html;
}

// ==================== MISE À JOUR PANIER SEULEMENT ====================
function clientUpdateCartOnly() {
    var ci = document.getElementById('clientCartItems');
    if (!ci) return;

    var isMobile = window.innerWidth < 700;
    var html = '';

    if (clientCart.length === 0) {
        html = '<div class="pos-cart-empty" style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-shopping-basket" style="font-size:28px;"></i><p style="font-size:0.85rem;">Panier vide</p></div>';
    } else {
        for (var k = 0; k < clientCart.length; k++) {
            var it = clientCart[k];
            var opts = '';
            if (it.interdits && it.interdits.length) opts += ' <span style="color:#ef4444;font-size:0.6rem;">🚫' + clientEscapeHtml(it.interdits.join(',')) + '</span>';
            if (it.epice && it.epice !== 'Normal') opts += ' <span style="color:#d97706;font-size:0.6rem;">🌶️' + clientEscapeHtml(it.epice) + '</span>';
            if (it.sel && it.sel !== 'Normal') opts += ' <span style="color:#4f46e5;font-size:0.6rem;">🧂' + clientEscapeHtml(it.sel) + '</span>';

            var btnSize = isMobile ? '28px' : '24px';
            var nameSize = isMobile ? '13px' : '0.75rem';

            html += '<div class="pos-cart-item" style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border);gap:4px;">' +
                '<div class="pos-cart-item-info" style="flex:1;min-width:0;">' +
                    '<span class="pos-cart-item-name" style="font-size:' + nameSize + ';font-weight:600;display:block;word-break:break-word;">' + clientEscapeHtml(it.nom) + opts + '</span>' +
                    '<span style="font-size:0.65rem;color:var(--text-secondary);">' + it.prixUnitaire.toFixed(2) + ' MAD/u</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
                    '<button onclick="clientUpdateQty(' + k + ',-1)" style="width:' + btnSize + ';height:' + btnSize + ';border-radius:50%;border:2px solid var(--border);background:#fff;cursor:pointer;"><i class="fas fa-minus"></i></button>' +
                    '<span style="font-size:0.85rem;font-weight:700;min-width:20px;text-align:center;">' + it.quantite + '</span>' +
                    '<button onclick="clientUpdateQty(' + k + ',1)" style="width:' + btnSize + ';height:' + btnSize + ';border-radius:50%;border:2px solid var(--border);background:#fff;cursor:pointer;"><i class="fas fa-plus"></i></button>' +
                    '<button onclick="clientRemoveItem(' + k + ')" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:2px;font-size:0.9rem;"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<span style="font-size:' + (isMobile ? '14px' : '0.8rem') + ';font-weight:700;min-width:55px;text-align:right;">' + (it.prixUnitaire * it.quantite).toFixed(2) + ' MAD</span>' +
            '</div>';
        }
    }
    ci.innerHTML = html;

    var badge = document.querySelector('#clientPage .pos-cart-badge');
    if (badge) badge.textContent = clientCart.length;

    var totalEl = document.getElementById('clientCartTotal');
    if (totalEl) totalEl.textContent = clientCalculateTotal().toFixed(2) + ' MAD';

    var vBtn = document.querySelector('#clientPage .pos-validate-btn');
    if (vBtn) vBtn.disabled = clientCart.length === 0;
}

// ==================== ACTIONS PANIER ====================
function clientFilterCategory(ca) {
    clientSelectedCategory = ca;
    clientUpdateGrid();
    // Mettre à jour l'état actif des boutons
    document.querySelectorAll('#clientPage .pos-cat-btn').forEach(function(btn) {
        btn.classList.remove('active');
        var txt = btn.textContent.trim();
        if ((ca === 'all' && txt.indexOf('Tous') !== -1) || txt.indexOf(ca) !== -1) {
            btn.classList.add('active');
        }
    });
}

function clientUpdateQty(i, ch) {
    var it = clientCart[i];
    if (!it) return;
    var p = clientProductsList.find(function(x) { return x.id === it.id; });
    var nq = it.quantite + ch;
    if (nq <= 0) clientCart.splice(i, 1);
    else {
        if (p && p.stock !== undefined && nq > p.stock) { alert('Stock max: ' + p.stock); return; }
        it.quantite = nq;
    }
    clientUpdateCartOnly();
}

function clientRemoveItem(i) { clientCart.splice(i, 1); clientUpdateCartOnly(); }
function clientCalculateTotal() { var t = 0; for (var i = 0; i < clientCart.length; i++) t += clientCart[i].prixUnitaire * clientCart[i].quantite; return t; }
function clientClearCart() { clientCart = []; clientUpdateCartOnly(); if (clientStep === 2) clientGoToStep(1); }

// ==================== NAVIGATION ÉTAPES ====================
function clientGoToStep(step) {
    if (step === 2 && clientCart.length === 0) { alert('Panier vide'); return; }
    clientStep = step;
    renderClientPOS();
    // Scroll en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== VALIDATION COMMANDE ====================
async function clientValidateOrder() {
    if (clientCart.length === 0) { alert('Votre panier est vide'); return; }

    var total = clientCalculateTotal();
    var ud = window.currentUserData ? window.currentUserData.userData : {};
    var nameEl = document.getElementById('clientOrderName');
    var phoneEl = document.getElementById('clientOrderPhone');
    var noteEl = document.getElementById('clientOrderNote');

    var orderData = {
        items: JSON.parse(JSON.stringify(clientCart)),
        total: total,
        clientId: window.currentUserData ? window.currentUserData.uid : null,
        clientName: (nameEl && nameEl.value.trim()) || (ud.prenom + ' ' + ud.nom),
        clientEmail: ud.email || '',
        clientTelephone: (phoneEl && phoneEl.value.trim()) || ud.telephone || '',
        note: noteEl ? noteEl.value.trim() : '',
        statut: 'en_attente',
        source: 'client',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await CacheDB.write('commandes', null, orderData, 'add');
        alert('✅ Commande envoyée !\nTotal: ' + total.toFixed(2) + ' MAD');
        clientCart = [];
        clientStep = 1;
        renderClientPOS();
        CacheDB.sync();
    } catch(e) {
        alert('❌ Erreur: ' + e.message);
    }
}

// ==================== PAGE HISTORIQUE ====================
async function loadClientHistoriquePage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;
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
            var arts = d.items ? d.items.map(function(it) { return it.quantite + 'x ' + clientEscapeHtml(it.nom); }).join('<br>') : '-';
            var statut = d.statut === 'valide' ? '<span class="status-success">✅ Validée</span>'
                       : d.statut === 'payé' ? '<span class="status-success">💵 Payée</span>'
                       : '<span class="status-warning">⏳ En attente</span>';
            h += '<tr><td>' + date + '</td><td>' + arts + '</td><td><strong>' + (d.total || 0).toFixed(2) + ' MAD</strong></td><td>' + statut + '</td></tr>';
        });
        h += '</tbody></table></div>';
        cont.innerHTML = h;
    } catch(e) {
        var cont2 = document.getElementById('clientOrdersList');
        if (cont2) cont2.innerHTML = '<p style="color:#ef4444;">Erreur de chargement</p>';
    }
}

// ==================== PAGE PARAMÈTRES ====================
async function loadClientParametresPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;
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
    h += '<div><strong>Nom:</strong> ' + clientEscapeHtml(clientData.nom || '') + '</div>';
    h += '<div><strong>Prénom:</strong> ' + clientEscapeHtml(clientData.prenom || '') + '</div>';
    h += '<div><strong>Email:</strong> ' + clientEscapeHtml(clientData.email || '') + '</div>';
    h += '<div><strong>Tél:</strong> ' + clientEscapeHtml(clientData.telephone || '-') + '</div>';
    h += '<div><strong>Adresse:</strong> ' + clientEscapeHtml(clientData.adresse || '-') + '</div>';
    h += '<div><strong>Points Fidélité:</strong> ' + (clientData.pointsFidelite || 0) + '</div>';
    h += '</div>';
    h += '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">';
    h += '<button class="btn-add" onclick="clientOpenEditProfile()"><i class="fas fa-edit"></i> Modifier mon profil</button>';
    h += '<button class="btn-save" onclick="clientOpenChangePassword()"><i class="fas fa-lock"></i> Changer mot de passe</button>';
    h += '</div></div>';
    c.innerHTML = h;
    window.clientProfileData = clientData;
    window.clientProfileDocId = clientDocId;
}

function clientOpenEditProfile() {
    var data = window.clientProfileData || window.currentUserData.userData;
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="clientEditNom" value="' + clientEscapeHtml(data.nom || '') + '"></div><div class="form-group"><label>Prénom *</label><input type="text" id="clientEditPrenom" value="' + clientEscapeHtml(data.prenom || '') + '"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Téléphone</label><input type="text" id="clientEditTel" value="' + clientEscapeHtml(data.telephone || '') + '"></div><div class="form-group"><label>Adresse</label><input type="text" id="clientEditAdresse" value="' + clientEscapeHtml(data.adresse || '') + '"></div></div>';
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
window.clientAddToCartOrOpenOptions = clientAddToCartOrOpenOptions;
window.clientFilterCategory = clientFilterCategory;
window.clientUpdateQty = clientUpdateQty;
window.clientRemoveItem = clientRemoveItem;
window.clientCalculateTotal = clientCalculateTotal;
window.clientClearCart = clientClearCart;
window.clientGoToStep = clientGoToStep;
window.clientValidateOrder = clientValidateOrder;
window.clientConfirmOptions = clientConfirmOptions;
window.clientOpenOptionsModal = clientOpenOptionsModal;
window.clientUpdateGrid = clientUpdateGrid;
window.clientUpdateCartOnly = clientUpdateCartOnly;
window.loadClientHistoriquePage = loadClientHistoriquePage;
window.loadClientParametresPage = loadClientParametresPage;
window.clientOpenEditProfile = clientOpenEditProfile;
window.clientSaveProfile = clientSaveProfile;
window.clientOpenChangePassword = clientOpenChangePassword;
window.clientChangePassword = clientChangePassword;

console.log('🚀 E-SOLUTION - Client JS chargé (responsive complet)');
console.log('✅ Structure POS identique à l\'admin');
console.log('✅ Responsive téléphone / tablette / PC');
console.log('✅ Navigation : Commander / Historique / Paramètres');
