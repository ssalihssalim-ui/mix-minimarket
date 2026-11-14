// ==================== MENU TACTILE - E-SOLUTION ====================
// 🆕 v18 : Correctif "Welcome" qui apparaît sur page blanche
// v17 : Splash vidéo + Welcome
// v16 : PERFORMANCE MAX (cache rendu, debounce 80ms, content-visibility)
// v14 : Panier dans le flux
// v13 : Recherche fixée
// v12 : Effet 3D MOTION CSS

var menuTableNum = null;
var menuCart = [];
var menuCategories = [];
var menuProducts = [];
var menuSelectedCategory = 'all';
var menuViewMode = 'categories';
var menuSelectedCategoryName = null;
var menuSearchQuery = '';
var menuCurrentProductId = null;

var menuEpices = ['Normal', 'Moins épicé', 'Très épicé', 'Sans épice'];
var menuSel = ['Normal', 'Moins de sel', 'Sans sel'];

var allStockData = [];

var menuRenderCache = {
    categories: null,
    products: {},
    search: {}
};

var menuProductSearchIndex = null;

function buildProductSearchIndex() {
    if (menuProductSearchIndex) return;
    menuProductSearchIndex = {};
    menuProducts.forEach(function(p) {
        var words = (p.nom || '').toLowerCase().split(/\s+/);
        words.forEach(function(w) {
            if (w.length < 2) return;
            if (!menuProductSearchIndex[w]) menuProductSearchIndex[w] = [];
            menuProductSearchIndex[w].push(p.id);
        });
    });
}

// ========== UTILITAIRES ==========
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

function closeMenuTactile() {
    window.location.href = window.location.pathname;
}

function requestFullscreen() {
    var elem = document.documentElement;
    var method = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
    if (method) {
        method.call(elem).catch(function(err) { console.log(err); });
    } else {
        alert("Ajouter à l'écran d'accueil pour le plein écran.");
    }
}

// ========== 🎬 v18 : SPLASH VIDÉO + WELCOME (correctif visibility) ==========
function playMenuSplashSequence(onComplete) {
    var splash = document.getElementById('menuSplashScreen');
    var video = document.getElementById('menuSplashVideo');
    var overlay = document.getElementById('menuSplashOverlay');
    var welcome = document.getElementById('menuSplashWelcome');

    if (!splash || !video) {
        console.log('🎬 Pas de splash → menu direct');
        if (onComplete) onComplete();
        return;
    }

    if (sessionStorage.getItem('menuSplashPlayed') === '1') {
        console.log('🎬 Splash déjà joué — skip');
        splash.style.display = 'none';
        if (onComplete) onComplete();
        return;
    }

    console.log('🎬 Démarrage splash vidéo...');

    // État initial
    splash.style.display = 'flex';
    splash.style.opacity = '1';
    splash.style.background = '#000000';

    // 🔧 FIX : Cacher complètement Welcome avec visibility
    if (welcome) {
        welcome.style.opacity = '0';
        welcome.style.visibility = 'hidden';
        welcome.style.transform = 'scale(0.8)';
    }
    if (overlay) overlay.style.opacity = '0';

    try {
        video.currentTime = 0;
        video.load();
    } catch (e) { console.warn('⚠️ Erreur reset vidéo:', e); }

    var playPromise = video.play();

    if (playPromise !== undefined) {
        playPromise.catch(function(err) {
            console.warn('⚠️ Autoplay bloqué → passage direct au menu:', err);
            splash.style.display = 'none';
            if (onComplete) onComplete();
        });
    }

    var videoEnded = false;

    function handleVideoEnd() {
        if (videoEnded) return;
        videoEnded = true;

        console.log('🎬 Vidéo terminée — transition Welcome');

        splash.style.transition = 'background 1s ease';
        splash.style.background = '#FFFFFF';

        if (overlay) {
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.opacity = '1';
        }

        setTimeout(function() {
            // 🔧 FIX : Rendre Welcome VISIBLE avant l'opacité
            if (welcome) {
                welcome.style.visibility = 'visible';
                welcome.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                welcome.style.opacity = '1';
                welcome.style.transform = 'scale(1)';
            }
            console.log('🎬 Welcome affiché');

            if (onComplete) onComplete();

            setTimeout(function() {
                if (welcome) {
                    welcome.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    welcome.style.opacity = '0';
                    welcome.style.transform = 'scale(1.05)';
                }

                setTimeout(function() {
                    splash.style.transition = 'opacity 0.5s ease';
                    splash.style.opacity = '0';

                    setTimeout(function() {
                        splash.style.display = 'none';
                        splash.style.opacity = '1';
                        splash.style.background = '';
                        if (overlay) overlay.style.opacity = '0';
                        // 🔧 FIX : Cacher Welcome avec visibility aussi
                        if (welcome) {
                            welcome.style.opacity = '0';
                            welcome.style.visibility = 'hidden';
                        }

                        sessionStorage.setItem('menuSplashPlayed', '1');
                        console.log('🎬 Splash terminé — menu visible');
                    }, 500);
                }, 600);
            }, 1500);
        }, 800);
    }

    video.addEventListener('ended', handleVideoEnd, { once: true });

    setTimeout(function() {
        if (!videoEnded && splash.style.display !== 'none') {
            console.warn('⚠️ Timeout vidéo — transition forcée');
            try { video.pause(); } catch (e) {}
            handleVideoEnd();
        }
    }, 10000);
}

// ========== EFFET 3D MOTION ==========
var _motion3DRAF = null;
function initMenu3DMotion() {
    if ('ontouchstart' in window && window.innerWidth < 1024) return;

    requestAnimationFrame(function() {
        var cards = document.querySelectorAll('.menu-cat-card, .pos-product-card');
        cards.forEach(function(card) {
            if (card.dataset.motion3dBound) return;
            card.dataset.motion3dBound = '1';

            card.addEventListener('mousemove', function(e) {
                if (_motion3DRAF) cancelAnimationFrame(_motion3DRAF);
                _motion3DRAF = requestAnimationFrame(function() {
                    var rect = card.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    var rotateY = ((x / rect.width) - 0.5) * 16;
                    var rotateX = ((y / rect.height) - 0.5) * -16;
                    card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.03)';
                });
            }, { passive: true });

            card.addEventListener('mouseleave', function() {
                card.style.transform = '';
            });
        });
    });
}

// ========== CHARGEMENT ==========
async function loadMenuData() {
    console.log('📱 Chargement menu tactile E-SOLUTION...');
    var content = document.getElementById('menuTactileContent');
    if (!content) return;

    content.innerHTML = '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#14B8A6;"></i><p style="margin-top:15px;color:#64748b;">Chargement du menu...</p></div>';

    try {
        var catSnap = await db.collection('categories').get();
        menuCategories = [];
        catSnap.forEach(function(d) {
            var dd = d.data();
            menuCategories.push({
                id: d.id,
                nom: dd.nom || 'Sans nom',
                imageBase64: dd.imageBase64 || '',
                recette: dd.recette || false,
                ordre: dd.ordre || 0
            });
        });

        var prodSnap = await db.collection('products').get();
        menuProducts = [];
        prodSnap.forEach(function(d) {
            var dd = d.data();
            if (dd.disponible !== false) {
                menuProducts.push({
                    id: d.id,
                    nom: dd.nom || 'Sans nom',
                    prixVente: dd.prixVente || 0,
                    prixPromo: dd.prixPromo || 0,
                    stock: dd.stock,
                    categorie: dd.categorie || '',
                    categories: dd.categories || [],
                    imageBase64: dd.imageBase64 || ''
                });
            }
        });

        var stockSnap = await db.collection('stock').get();
        allStockData = [];
        stockSnap.forEach(function(d) {
            var dd = d.data();
            dd.id = d.id;
            allStockData.push(dd);
        });

        buildProductSearchIndex();

        menuRenderCache.categories = null;
        menuRenderCache.products = {};
        menuRenderCache.search = {};

        renderMenuTactile();
        console.log('✅ Menu chargé:', menuCategories.length, 'catégories,', menuProducts.length, 'produits');
    } catch (e) {
        console.error('❌ Erreur:', e);
        content.innerHTML = '<div style="text-align:center;padding:50px;"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:#ef4444;"></i><p>Erreur de chargement</p><button onclick="loadMenuData()" class="btn-add" style="margin-top:16px;">Réessayer</button></div>';
    }
}

// ========== RENDU PRINCIPAL ==========
function renderMenuTactile() {
    var content = document.getElementById('menuTactileContent');
    if (!content) return;

    var total = 0;
    var totalArticles = 0;
    for (var ki = 0; ki < menuCart.length; ki++) {
        total += menuCart[ki].prixUnitaire * menuCart[ki].quantite;
        totalArticles += menuCart[ki].quantite;
    }

    var html = '';

    html += '<div class="menu-header">';
    html += '  <button class="menu-close-btn" onclick="closeMenuTactile()" aria-label="Fermer">&times;</button>';
    html += '  <div class="menu-header-content">';
    html += '    <div class="menu-logo-wrapper">';
    html += '      <img src="logo.png" alt="Logo" class="menu-logo" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<i class=\\\'fas fa-store\\\'></i>\'">';
    html += '    </div>';
    html += '    <div class="menu-title-wrapper">';
    html += '      <h1>E-<span>SOLUTION</span></h1>';
    html += '      <p>🍽️ Table n° ' + escapeHtml(String(menuTableNum || '—')) + '</p>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="menu-search-wrapper">';
    html += '  <div class="menu-search-bar">';
    html += '    <i class="fas fa-search menu-search-icon"></i>';
    html += '    <input type="text" id="menuSearchInput" placeholder="🔍 Rechercher un produit..." value="' + escapeHtml(menuSearchQuery) + '" oninput="menuHandleSearch(this.value)" autocomplete="off">';
    if (menuSearchQuery) {
        html += '    <button class="menu-search-clear" onclick="menuClearSearch()"><i class="fas fa-times-circle"></i></button>';
    }
    html += '  </div>';
    html += '</div>';

    html += '<div class="menu-main-zone">';

    if (menuSearchQuery.trim()) {
        html += renderSearchResults();
    } else if (menuViewMode === 'categories') {
        html += renderCategoriesGrid();
    } else {
        html += renderProductsGrid();
    }

    html += '</div>';

    html += '<div class="menu-cart-fixed">';
    html += '  <div class="menu-cart-header">';
    html += '    <h3><i class="fas fa-shopping-cart"></i> Panier <span class="menu-cart-badge">' + totalArticles + '</span></h3>';
    html += '  </div>';

    if (menuCart.length === 0) {
        html += '  <div class="menu-cart-empty"><i class="fas fa-shopping-basket"></i><p>Panier vide</p></div>';
    } else {
        html += '  <div class="menu-cart-items">';
        for (var k = 0; k < menuCart.length; k++) {
            var it = menuCart[k];
            html += '    <div class="menu-cart-item">';
            html += '      <div class="menu-cart-item-info">';
            html += '        <span class="menu-cart-item-name">' + it.quantite + '× ' + escapeHtml(it.nom) + '</span>';
            html += '        <span class="menu-cart-item-price">' + it.prixUnitaire.toFixed(2) + ' MAD</span>';
            html += '      </div>';
            html += '      <div class="menu-cart-qty">';
            html += '        <button onclick="menuUpdateQty(' + k + ',-1)"><i class="fas fa-minus"></i></button>';
            html += '        <span>' + it.quantite + '</span>';
            html += '        <button onclick="menuUpdateQty(' + k + ',1)"><i class="fas fa-plus"></i></button>';
            html += '        <button class="menu-cart-remove" onclick="menuRemoveItem(' + k + ')"><i class="fas fa-times"></i></button>';
            html += '      </div>';
            html += '      <span class="menu-cart-item-total">' + (it.prixUnitaire * it.quantite).toFixed(2) + ' MAD</span>';
            html += '    </div>';
        }
        html += '  </div>';
        html += '  <div class="menu-cart-total"><span>Total</span><span>' + total.toFixed(2) + ' MAD</span></div>';
        html += '  <button class="menu-btn-validate" onclick="menuValiderCommande()"><i class="fas fa-check-circle"></i> Commander</button>';
        html += '  <button class="menu-btn-clear" onclick="menuClearCart()"><i class="fas fa-trash-alt"></i> Vider</button>';
    }
    html += '</div>';

    html += '<button class="menu-fullscreen-btn" onclick="requestFullscreen()" title="Plein écran"><i class="fas fa-expand"></i></button>';

    content.innerHTML = html;

    initMenu3DMotion();

    if (menuSearchQuery) {
        setTimeout(function() {
            var input = document.getElementById('menuSearchInput');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 30);
    }
}

// ========== GRILLE CATÉGORIES ==========
function renderCategoriesGrid() {
    if (menuRenderCache.categories) return menuRenderCache.categories;

    var html = '<div style="grid-column:1/-1;padding:6px 8px;font-size:0.9rem;font-weight:700;color:#0F172A;">📂 Choisissez une catégorie</div>';

    if (menuCategories.length === 0) {
        return '<div class="menu-empty-state"><i class="fas fa-folder-open"></i><p>Aucune catégorie</p></div>';
    }

    var isMobile = window.innerWidth < 700;
    var isTablette = window.innerWidth >= 700 && window.innerWidth <= 1024;
    var isPC = window.innerWidth > 1024;

    var gridCols = isMobile ? 'repeat(3, 1fr)' : (isTablette ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)');

    html += '<div class="menu-categories-grid" style="grid-template-columns:' + gridCols + ';">';

    var sorted = menuCategories.slice().sort(function(a, b) {
        var oA = a.ordre || 9999, oB = b.ordre || 9999;
        return oA - oB || (a.nom || '').localeCompare(b.nom || '');
    });

    var countMap = {};
    menuProducts.forEach(function(p) {
        if (p.categories && p.categories.length > 0) {
            p.categories.forEach(function(c) { countMap[c] = (countMap[c] || 0) + 1; });
        } else if (p.categorie) {
            countMap[p.categorie] = (countMap[p.categorie] || 0) + 1;
        }
    });

    var imgSize, cardMinHeight, cardMaxHeight, folderSize, nameSize, countSize;
    if (isPC) {
        imgSize = '160px'; cardMinHeight = '190px'; cardMaxHeight = '230px';
        folderSize = '75px'; nameSize = '18px'; countSize = '13px';
    } else if (isTablette) {
        imgSize = '150px'; cardMinHeight = '175px'; cardMaxHeight = '210px';
        folderSize = '70px'; nameSize = '15px'; countSize = '11px';
    } else {
        imgSize = '55px'; cardMinHeight = '85px'; cardMaxHeight = '105px';
        folderSize = '26px'; nameSize = '10px'; countSize = '8px';
    }

    if (window.innerWidth < 400) {
        imgSize = '45px'; cardMinHeight = '70px'; cardMaxHeight = '90px';
        folderSize = '20px'; nameSize = '9px'; countSize = '7px';
    }

    for (var i = 0; i < sorted.length; i++) {
        var cat = sorted[i];
        var count = countMap[cat.nom] || 0;

        var imgContent = cat.imageBase64
            ? '<img src="' + escapeHtml(cat.imageBase64) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
            : '<i class="fas fa-folder" style="font-size:' + folderSize + ';color:#14B8A6;"></i>';

        html += '<div class="pos-category-card menu-cat-card" data-cat-name="' + escapeHtml(cat.nom) + '" ' +
                'style="min-height:' + cardMinHeight + ';max-height:' + cardMaxHeight + ';padding:8px 4px;border-radius:10px;border:2px solid transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;background:#FFFFFF;cursor:pointer;" ' +
                'onclick="menuSelectCategory(\'' + escapeHtml(cat.nom).replace(/'/g, "\\'") + '\')" ' +
                'onmouseover="if(!this.classList.contains(\'active\')){this.style.borderColor=\'#14B8A6\';this.style.boxShadow=\'0 12px 30px rgba(20,184,166,0.2)\';}" ' +
                'onmouseout="if(!this.classList.contains(\'active\')){this.style.borderColor=\'transparent\';this.style.boxShadow=\'none\';}">' +
                '<div style="width:' + imgSize + ';height:' + imgSize + ';border-radius:50%;overflow:hidden;flex-shrink:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;margin-bottom:2px;border:2px solid #E2E8F0;">' + imgContent + '</div>' +
                '<span style="font-size:' + nameSize + ';font-weight:700;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;color:#000000;margin-top:2px;line-height:1.2;display:block;">' + escapeHtml(cat.nom) + '</span>' +
                '<span style="font-size:' + countSize + ';color:#64748B;font-weight:500;display:block;margin-top:0px;">' + count + ' produit' + (count > 1 ? 's' : '') + '</span>' +
                '</div>';
    }

    html += '</div>';

    menuRenderCache.categories = html;
    return html;
}

// ========== GRILLE PRODUITS ==========
function renderProductsGrid() {
    var cacheKey = menuSelectedCategoryName || '__all__';
    if (menuRenderCache.products[cacheKey]) return menuRenderCache.products[cacheKey];

    var html = '';

    html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:4px 6px;margin-bottom:4px;background:#F8FAFC;border-radius:8px;">';
    html += '<button onclick="menuBackToCategories()" style="display:flex;align-items:center;gap:6px;background:#0F172A;color:#FFFFFF;border:none;border-radius:8px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;"><i class="fas fa-arrow-left"></i> Retour aux catégories</button>';
    html += '<span style="font-weight:700;font-size:0.9rem;color:#000000;background:#FFFFFF;padding:4px 12px;border-radius:6px;border:1px solid #14B8A6;">📂 ' + escapeHtml(menuSelectedCategoryName || '') + '</span>';
    html += '</div>';

    var filtered = menuProducts;
    if (menuSelectedCategoryName) {
        filtered = menuProducts.filter(function(p) {
            if (p.categories && p.categories.length > 0) return p.categories.includes(menuSelectedCategoryName);
            return p.categorie === menuSelectedCategoryName;
        });
    }
    filtered.sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });

    if (filtered.length === 0) {
        var emptyHtml = html + '<div class="menu-empty-state"><i class="fas fa-box-open"></i><p>Aucun produit</p></div>';
        menuRenderCache.products[cacheKey] = emptyHtml;
        return emptyHtml;
    }

    var isMobile = window.innerWidth < 700;
    var gridCols = isMobile ? 'repeat(5, 1fr)' : 'repeat(auto-fill, minmax(110px, 1fr))';
    var gridGap = isMobile ? '4px' : '8px';

    html += '<div class="menu-products-grid" style="grid-template-columns:' + gridCols + ';gap:' + gridGap + ';">';

    var cards = [];
    for (var j = 0; j < filtered.length; j++) {
        var p = filtered[j];
        var pr = (p.prixPromo && p.prixPromo > 0) ? p.prixPromo : p.prixVente;
        var hp = p.prixPromo && p.prixPromo > 0;
        var outOfStock = p.stock !== undefined && p.stock <= 0;
        var stt = '';
        if (p.stock !== undefined) {
            if (p.stock <= 0) stt = ' (Rupture)';
            else if (p.stock <= 5) stt = ' (' + p.stock + ' rest.)';
        }

        var cardStyle = isMobile
            ? 'padding:6px 4px;min-height:130px;max-height:160px;aspect-ratio:1/1;border-radius:8px;border-width:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;content-visibility:auto;contain-intrinsic-size:130px 160px;'
            : 'padding:8px 10px;min-height:180px;max-height:220px;aspect-ratio:1/1;border-radius:10px;border-width:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;content-visibility:auto;contain-intrinsic-size:180px 220px;';

        var imgStyle = isMobile
            ? 'height:70px;width:70px;margin-bottom:6px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;'
            : 'height:95px;width:95px;margin-bottom:8px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;';

        var nameStyle = isMobile
            ? 'font-size:11px;font-weight:600;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#0F172A;margin:1px 0;'
            : 'font-size:0.88rem;font-weight:600;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#0F172A;margin:2px 0;';

        var priceStyle = isMobile
            ? 'font-size:12px;font-weight:700;color:#0F172A;'
            : 'font-size:0.95rem;font-weight:700;color:#0F172A;';

        var imgContent = p.imageBase64
            ? '<img src="' + escapeHtml(p.imageBase64) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">'
            : '<i class="fas fa-box" style="' + (isMobile ? 'font-size:24px;' : 'font-size:34px;') + 'color:#94A3B8;"></i>';

        cards.push('<div class="pos-product-card ' + (outOfStock ? 'pos-out-of-stock' : '') + '" ' +
                'style="' + cardStyle + '" ' +
                (outOfStock ? '' : 'onclick="menuAddToCartOrOpenOptions(\'' + p.id + '\')"') + '>' +
                '<div class="pos-product-img" style="' + imgStyle + '">' + imgContent + '</div>' +
                '<div class="pos-product-info" style="display:flex;flex-direction:column;align-items:center;width:100%;flex:1;justify-content:center;overflow:hidden;min-height:0;">' +
                '<span class="pos-product-name" style="' + nameStyle + '">' + escapeHtml(p.nom) + stt + '</span>' +
                '<span class="pos-product-price" style="' + priceStyle + '">' +
                (hp
                    ? '<span style="' + (isMobile ? 'font-size:8px;' : 'font-size:0.65rem;') + 'text-decoration:line-through;color:#94A3B8;">' + p.prixVente.toFixed(2) + '</span> <span style="' + (isMobile ? 'font-size:12px;' : 'font-size:0.9rem;') + 'color:#ef4444;">' + pr.toFixed(2) + ' MAD</span>'
                    : pr.toFixed(2) + ' MAD') +
                '</span></div></div>');
    }

    html += cards.join('');
    html += '</div>';

    menuRenderCache.products[cacheKey] = html;
    return html;
}

// ========== RÉSULTATS RECHERCHE ==========
function renderSearchResults() {
    var q = menuSearchQuery.toLowerCase().trim();
    if (menuRenderCache.search[q]) return menuRenderCache.search[q];

    var results = menuProducts.filter(function(p) {
        return (p.nom || '').toLowerCase().indexOf(q) !== -1 ||
               (p.categorie || '').toLowerCase().indexOf(q) !== -1;
    }).sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });

    var html = '<div style="grid-column:1/-1;padding:6px 8px;font-size:0.9rem;font-weight:700;color:#0F172A;"><i class="fas fa-search"></i> ' + results.length + ' résultat' + (results.length > 1 ? 's' : '') + ' pour "' + escapeHtml(menuSearchQuery) + '"</div>';

    if (results.length === 0) {
        var empty = html + '<div class="menu-empty-state"><i class="fas fa-search"></i><p>Aucun produit trouvé</p></div>';
        menuRenderCache.search[q] = empty;
        return empty;
    }

    var isMobile = window.innerWidth < 700;
    var gridCols = isMobile ? 'repeat(5, 1fr)' : 'repeat(auto-fill, minmax(110px, 1fr))';
    var gridGap = isMobile ? '4px' : '8px';

    html += '<div class="menu-products-grid" style="grid-template-columns:' + gridCols + ';gap:' + gridGap + ';">';

    var cards = [];
    for (var i = 0; i < results.length; i++) {
        var p = results[i];
        var pr = (p.prixPromo && p.prixPromo > 0) ? p.prixPromo : p.prixVente;
        var hp = p.prixPromo && p.prixPromo > 0;
        var outOfStock = p.stock !== undefined && p.stock <= 0;

        var cardStyle = isMobile
            ? 'padding:6px 4px;min-height:130px;max-height:160px;aspect-ratio:1/1;border-radius:8px;border-width:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;content-visibility:auto;contain-intrinsic-size:130px 160px;'
            : 'padding:8px 10px;min-height:180px;max-height:220px;aspect-ratio:1/1;border-radius:10px;border-width:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;content-visibility:auto;contain-intrinsic-size:180px 220px;';

        var imgStyle = isMobile
            ? 'height:70px;width:70px;margin-bottom:6px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;'
            : 'height:95px;width:95px;margin-bottom:8px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;';

        var nameStyle = isMobile
            ? 'font-size:11px;font-weight:600;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#0F172A;margin:1px 0;'
            : 'font-size:0.88rem;font-weight:600;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#0F172A;margin:2px 0;';

        var priceStyle = isMobile ? 'font-size:12px;font-weight:700;color:#0F172A;' : 'font-size:0.95rem;font-weight:700;color:#0F172A;';

        var imgContent = p.imageBase64
            ? '<img src="' + escapeHtml(p.imageBase64) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">'
            : '<i class="fas fa-box" style="' + (isMobile ? 'font-size:24px;' : 'font-size:34px;') + 'color:#94A3B8;"></i>';

        cards.push('<div class="pos-product-card ' + (outOfStock ? 'pos-out-of-stock' : '') + '" ' +
                'style="' + cardStyle + '" ' +
                (outOfStock ? '' : 'onclick="menuAddToCartOrOpenOptions(\'' + p.id + '\')"') + '>' +
                '<div class="pos-product-img" style="' + imgStyle + '">' + imgContent + '</div>' +
                '<div class="pos-product-info" style="display:flex;flex-direction:column;align-items:center;width:100%;flex:1;justify-content:center;overflow:hidden;min-height:0;">' +
                '<span class="pos-product-name" style="' + nameStyle + '">' + escapeHtml(p.nom) + '</span>' +
                '<span class="pos-product-price" style="' + priceStyle + '">' +
                (hp
                    ? '<span style="' + (isMobile ? 'font-size:8px;' : 'font-size:0.65rem;') + 'text-decoration:line-through;color:#94A3B8;">' + p.prixVente.toFixed(2) + '</span> <span style="' + (isMobile ? 'font-size:12px;' : 'font-size:0.9rem;') + 'color:#ef4444;">' + pr.toFixed(2) + ' MAD</span>'
                    : pr.toFixed(2) + ' MAD') +
                '</span></div></div>');
    }

    html += cards.join('');
    html += '</div>';

    menuRenderCache.search[q] = html;
    return html;
}

// ========== NAVIGATION ==========
function menuSelectCategory(catName) {
    menuSelectedCategoryName = catName;
    menuSelectedCategory = catName;
    menuViewMode = 'products';
    menuSearchQuery = '';
    renderMenuTactile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function menuBackToCategories() {
    menuViewMode = 'categories';
    menuSelectedCategoryName = null;
    menuSelectedCategory = 'all';
    menuSearchQuery = '';
    renderMenuTactile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function menuFilterCategory(cat) {
    if (cat === 'all') menuBackToCategories();
    else menuSelectCategory(cat);
}

var _searchTimeout = null;
var _searchRAF = null;
function menuHandleSearch(value) {
    clearTimeout(_searchTimeout);
    _searchTimeout = setTimeout(function() {
        menuSearchQuery = value || '';

        if (_searchRAF) cancelAnimationFrame(_searchRAF);
        _searchRAF = requestAnimationFrame(function() {
            var mainZone = document.querySelector('.menu-main-zone');
            if (mainZone) {
                if (menuSearchQuery.trim()) {
                    mainZone.innerHTML = renderSearchResults();
                } else if (menuViewMode === 'categories') {
                    mainZone.innerHTML = renderCategoriesGrid();
                } else {
                    mainZone.innerHTML = renderProductsGrid();
                }
                initMenu3DMotion();
            }

            var wrapper = document.querySelector('.menu-search-bar');
            if (wrapper) {
                var existingClear = wrapper.querySelector('.menu-search-clear');
                if (menuSearchQuery && !existingClear) {
                    var clearBtn = document.createElement('button');
                    clearBtn.className = 'menu-search-clear';
                    clearBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
                    clearBtn.onclick = menuClearSearch;
                    wrapper.appendChild(clearBtn);
                } else if (!menuSearchQuery && existingClear) {
                    existingClear.remove();
                }
            }
        });
    }, 80);
}

function menuClearSearch() {
    menuSearchQuery = '';
    var input = document.getElementById('menuSearchInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    var mainZone = document.querySelector('.menu-main-zone');
    if (mainZone) {
        if (menuViewMode === 'categories') {
            mainZone.innerHTML = renderCategoriesGrid();
        } else {
            mainZone.innerHTML = renderProductsGrid();
        }
        initMenu3DMotion();
    }
    var clearBtn = document.querySelector('.menu-search-clear');
    if (clearBtn) clearBtn.remove();
}

// ========== PANIER ==========
function menuUpdateQty(idx, delta) {
    if (!menuCart[idx]) return;
    var nq = menuCart[idx].quantite + delta;
    if (nq <= 0) menuCart.splice(idx, 1);
    else menuCart[idx].quantite = nq;
    renderMenuTactile();
}

function menuRemoveItem(idx) {
    menuCart.splice(idx, 1);
    renderMenuTactile();
}

function menuClearCart() {
    if (confirm('Vider le panier ?')) {
        menuCart = [];
        renderMenuTactile();
    }
}

function menuAddToCartOrOpenOptions(pid) {
    var p = menuProducts.find(function(x) { return x.id === pid; });
    if (!p) return;
    if (p.stock !== undefined && p.stock <= 0) {
        alert('⚠️ Rupture de stock.');
        return;
    }

    var cat = menuCategories.find(function(c) { return c.nom === p.categorie; });
    var isRecette = cat && cat.recette === true;

    if (isRecette) {
        menuCurrentProductId = pid;
        menuOpenOptions(pid);
    } else {
        var existing = menuCart.find(function(x) { return x.id === pid; });
        if (existing) {
            if (p.stock !== undefined && existing.quantite >= p.stock) {
                alert('Stock insuffisant');
                return;
            }
            existing.quantite++;
        } else {
            var price = (p.prixPromo && p.prixPromo > 0) ? p.prixPromo : p.prixVente;
            menuCart.push({
                id: p.id, nom: p.nom, prixUnitaire: price, quantite: 1,
                sauces: [], interdits: [], epice: 'Normal', sel: 'Normal'
            });
        }
        renderMenuTactile();
    }
}

// ========== OPTIONS RECETTES ==========
async function menuOpenOptions(pid) {
    var p = menuProducts.find(function(x) { return x.id === pid; });
    if (!p) return;
    if (p.stock !== undefined && p.stock <= 0) { alert('⚠️ Rupture'); return; }

    var productIngredients = [];
    try {
        var doc = await db.collection('products').doc(pid).get();
        if (doc.exists) productIngredients = doc.data().ingredients || [];
    } catch (e) { console.error(e); }

    var grouped = {};
    productIngredients.forEach(function(ing) {
        var stockItem = allStockData.find(function(s) { return s.id === ing.idStock; });
        var cat = stockItem ? (stockItem.categorie || 'Autre') : 'Autre';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(ing.nom);
    });

    var order = ['Sauces', 'Légumes', 'Fruits', 'Viande', 'Poulet', 'Poisson'];
    var sortedCats = Object.keys(grouped).sort(function(a, b) {
        var iA = order.indexOf(a), iB = order.indexOf(b);
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        return a.localeCompare(b);
    });

    menuCurrentProductId = pid;
    var h = '<h4 style="margin:0 0 16px;font-size:1.15rem;color:#0F172A;font-weight:800;">' + escapeHtml(p.nom) + '</h4>';

    if (sortedCats.length === 0) {
        h += '<p style="margin-bottom:16px;color:#94A3B8;">Aucun ingrédient à exclure</p>';
    } else {
        sortedCats.forEach(function(cat) {
            h += '<div style="margin-bottom:14px;"><label style="font-weight:700;color:#334155;display:block;margin-bottom:6px;font-size:0.85rem;">🥫 ' + escapeHtml(cat) + '</label><div style="display:flex;flex-wrap:wrap;gap:6px;">';
            grouped[cat].forEach(function(ing) {
                h += '<label style="display:flex;align-items:center;gap:5px;padding:7px 11px;border:1.5px solid #E2E8F0;border-radius:8px;cursor:pointer;font-size:0.8rem;background:#F8FAFC;"><input type="checkbox" class="menu-interdit-check" value="' + escapeHtml(ing) + '"> ' + escapeHtml(ing) + '</label>';
            });
            h += '</div></div>';
        });
    }

    h += '<div style="margin-bottom:14px;"><label style="font-weight:700;color:#334155;display:block;margin-bottom:6px;font-size:0.85rem;">🌶️ Épices</label><div style="display:flex;flex-wrap:wrap;gap:6px;">';
    menuEpices.forEach(function(s, idx) {
        h += '<label style="display:flex;align-items:center;gap:5px;padding:7px 11px;border:1.5px solid #E2E8F0;border-radius:8px;cursor:pointer;font-size:0.8rem;background:#F8FAFC;"><input type="radio" name="menu-epice" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>';
    });
    h += '</div></div>';

    h += '<div style="margin-bottom:14px;"><label style="font-weight:700;color:#334155;display:block;margin-bottom:6px;font-size:0.85rem;">🧂 Sel</label><div style="display:flex;flex-wrap:wrap;gap:6px;">';
    menuSel.forEach(function(s, idx) {
        h += '<label style="display:flex;align-items:center;gap:5px;padding:7px 11px;border:1.5px solid #E2E8F0;border-radius:8px;cursor:pointer;font-size:0.8rem;background:#F8FAFC;"><input type="radio" name="menu-sel" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>';
    });
    h += '</div></div>';

    h += '<div style="text-align:right;margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">';
    h += '<button onclick="closeModal()" style="padding:10px 22px;border:1.5px solid #E2E8F0;background:#fff;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.9rem;">Annuler</button>';
    h += '<button onclick="menuConfirmOptions()" style="padding:10px 22px;border:none;background:#14B8A6;color:#fff;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9rem;">Ajouter</button>';
    h += '</div>';

    openModal('Personnaliser — ' + escapeHtml(p.nom), h);
}

function menuConfirmOptions() {
    var interdits = Array.from(document.querySelectorAll('.menu-interdit-check:checked')).map(function(cb) { return cb.value; });
    var epice = (document.querySelector('input[name="menu-epice"]:checked') || {}).value || 'Normal';
    var sel = (document.querySelector('input[name="menu-sel"]:checked') || {}).value || 'Normal';
    var p = menuProducts.find(function(x) { return x.id === menuCurrentProductId; });
    if (!p) { closeModal(); return; }

    var existing = menuCart.find(function(x) { return x.id === p.id; });
    if (existing) {
        if (p.stock !== undefined && existing.quantite >= p.stock) { alert('Stock insuffisant'); closeModal(); return; }
        existing.quantite++;
    } else {
        var price = (p.prixPromo && p.prixPromo > 0) ? p.prixPromo : p.prixVente;
        menuCart.push({ id: p.id, nom: p.nom, prixUnitaire: price, quantite: 1, sauces: [], interdits: interdits, epice: epice, sel: sel });
    }
    closeModal();
    renderMenuTactile();
}

// ========== VALIDATION ==========
async function menuValiderCommande() {
    if (menuCart.length === 0) { alert('⚠️ Panier vide.'); return; }
    var total = menuCart.reduce(function(sum, item) { return sum + (item.prixUnitaire * item.quantite); }, 0);
    if (!confirm('📋 Confirmer la commande ?\nTable ' + menuTableNum + '\nTotal: ' + total.toFixed(2) + ' MAD')) return;

    try {
        await db.collection('commandes').add({
            items: JSON.parse(JSON.stringify(menuCart)),
            total: total,
            table: String(menuTableNum),
            clientName: 'Table ' + menuTableNum,
            statut: 'en_attente',
            source: 'menu_tactile',
            paid: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ Commande envoyée !');
        menuCart = [];
        menuViewMode = 'categories';
        menuSelectedCategoryName = null;
        menuSearchQuery = '';
        renderMenuTactile();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        alert('❌ Erreur: ' + e.message);
    }
}

// ========== INITIALISATION ==========
function initMenuTactile(tableNum) {
    console.log('🍽️ Démarrage menu tactile pour table:', tableNum);
    menuTableNum = tableNum;

    injectMenuStyles();

    var menuPage = document.getElementById('menuTactilePage');
    if (menuPage) {
        menuPage.classList.remove('hidden');
        menuPage.style.display = 'block';
    }

    var content = document.getElementById('menuTactileContent');
    if (!content) {
        content = document.createElement('div');
        content.id = 'menuTactileContent';
        if (menuPage) menuPage.appendChild(content);
    }

    playMenuSplashSequence(function() {
        console.log('🍽️ Splash terminé, chargement du menu...');
        loadMenuData();
    });
}

// ========== STYLES (v18) ==========
function injectMenuStyles() {
    if (document.getElementById('menuTactileStylesV18')) return;

    ['menuTactileStylesV17', 'menuTactileStylesV16', 'menuTactileStylesV15', 'menuTactileStylesV14',
     'menuTactileStylesV13', 'menuTactileStylesV12', 'menuTactileStylesV11',
     'menuTactileStylesV10'].forEach(function(id) {
        var old = document.getElementById(id);
        if (old) old.remove();
    });

    var style = document.createElement('style');
    style.id = 'menuTactileStylesV18';
    style.textContent = `
    /* ============================================================
       🎬 v18 : SPLASH VIDÉO + WELCOME (correctif visibility)
       ============================================================ */

    #menuSplashScreen {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        background: #000000;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        overflow: hidden;
        opacity: 1;
    }

    #menuSplashVideo {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
    }

    #menuSplashOverlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
        background: #FFFFFF;
        opacity: 0;
        z-index: 2;
        pointer-events: none;
    }

    /* 🔧 FIX : visibility hidden par défaut */
    #menuSplashWelcome {
        position: relative;
        z-index: 3;
        text-align: center;
        opacity: 0;
        visibility: hidden;
        transform: scale(0.8);
        transition: opacity 0.6s ease, transform 0.6s ease, visibility 0.6s;
    }

    #menuSplashWelcome h1 {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: clamp(2.5rem, 8vw, 5rem);
        font-weight: 800;
        color: #14B8A6;
        margin: 0;
        letter-spacing: -1px;
        text-shadow: 0 4px 20px rgba(20, 184, 166, 0.4);
        animation: welcomeFloat 2s ease-in-out infinite;
    }

    @keyframes welcomeFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
    }

    html, body {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        height: auto !important;
        min-height: 100vh !important;
        max-height: none !important;
        position: static !important;
        background: #f8fafc !important;
    }
    #menuTactilePage {
        background: radial-gradient(circle at 20% 10%, rgba(20,184,166,0.05) 0%, transparent 40%),
                    radial-gradient(circle at 80% 90%, rgba(59,130,246,0.04) 0%, transparent 40%),
                    #f8fafc !important;
        min-height: 100vh !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
        position: relative;
        display: block !important;
    }
    #menuTactileContent {
        max-width: 1400px;
        margin: 0 auto;
        padding-bottom: 24px !important;
        min-height: 100vh !important;
        height: auto !important;
        overflow: visible !important;
        position: relative;
        perspective: 1500px;
        display: flex;
        flex-direction: column;
    }
    .menu-header {
        background: linear-gradient(135deg, #0A0D12, #1a1a2e);
        color: #fff;
        border-radius: 0 0 24px 24px;
        padding: 20px 15px;
        position: sticky;
        top: 0;
        z-index: 50;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
    }
    .menu-header-content {
        display: flex;
        align-items: center;
        gap: 14px;
        justify-content: center;
        max-width: 500px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
    }
    .menu-logo-wrapper {
        width: 60px; height: 60px;
        border-radius: 50%;
        background: #14B8A6;
        display: flex; align-items: center; justify-content: center;
        border: 2px solid rgba(255,255,255,0.2);
        overflow: hidden; flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(20,184,166,0.3);
    }
    .menu-logo { width: 100%; height: 100%; object-fit: cover; }
    .menu-logo-wrapper i { color: #fff; font-size: 24px; }
    .menu-title-wrapper { text-align: left; min-width: 0; }
    .menu-title-wrapper h1 {
        margin: 0; font-size: 1.3rem; font-weight: 800;
        letter-spacing: -0.5px; line-height: 1.15;
    }
    .menu-title-wrapper h1 span { color: #14B8A6; }
    .menu-title-wrapper p { margin: 3px 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.8); }
    .menu-close-btn {
        position: absolute; top: 12px; right: 14px;
        width: 38px; height: 38px; border-radius: 50%; border: none;
        background: rgba(0,0,0,0.35); color: #fff;
        font-size: 1.5rem; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        line-height: 1; transition: all 0.2s ease; z-index: 2;
    }
    .menu-close-btn:hover { background: rgba(0,0,0,0.55); transform: rotate(90deg); }
    .menu-search-wrapper {
        padding: 12px 14px; background: #f8fafc;
        position: sticky; top: 100px; z-index: 40;
    }
    .menu-search-bar {
        display: flex; align-items: center;
        background: #FFFFFF; border: 2px solid #e2e8f0;
        border-radius: 40px; padding: 4px 14px;
        max-width: 600px; margin: 0 auto;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .menu-search-bar:focus-within {
        border-color: #14B8A6;
        box-shadow: 0 0 0 4px rgba(20,184,166,0.12), 0 4px 16px rgba(20,184,166,0.15);
    }
    .menu-search-icon { color: #94A3B8; margin-right: 10px; font-size: 15px; }
    .menu-search-bar:focus-within .menu-search-icon { color: #14B8A6; }
    .menu-search-bar input {
        flex: 1; border: none; background: transparent;
        padding: 10px 0; font-size: 16px; font-family: inherit;
        font-weight: 500; color: #0F172A; outline: none; min-width: 0;
    }
    .menu-search-bar input::placeholder { color: #94A3B8; font-weight: 400; }
    .menu-search-clear {
        background: #F1F5F9; border: none;
        width: 30px; height: 30px; border-radius: 50%;
        cursor: pointer; color: #64748B; font-size: 14px;
        transition: all 0.15s ease; flex-shrink: 0;
    }
    .menu-search-clear:hover { background: #E2E8F0; color: #0F172A; transform: scale(1.05); }
    .menu-main-zone {
        padding: 0 10px 24px;
        overflow: visible !important;
        height: auto !important;
        flex: 1;
    }
    .menu-categories-grid {
        display: grid; gap: 10px; padding: 10px;
        overflow: visible !important; height: auto !important;
        perspective: 1000px;
    }
    .menu-products-grid {
        display: grid; gap: 8px; padding: 4px;
        overflow: visible !important; height: auto !important;
        perspective: 1000px;
    }
    .menu-cat-card, .pos-product-card {
        will-change: transform;
        transition: box-shadow 0.3s ease, border-color 0.3s ease;
    }
    .pos-product-card:hover:not(.pos-out-of-stock) {
        box-shadow: 0 15px 35px rgba(20,184,166,0.25), 0 5px 15px rgba(0,0,0,0.08) !important;
        border-color: #14B8A6 !important;
    }
    .menu-empty-state {
        text-align: center; padding: 60px 20px;
        color: #94A3B8; grid-column: 1 / -1;
    }
    .menu-empty-state i { font-size: 3rem; margin-bottom: 12px; display: block; opacity: 0.5; }
    .menu-empty-state p { margin: 0; font-size: 0.95rem; }
    .menu-cart-fixed {
        position: relative !important;
        bottom: auto !important; left: auto !important; right: auto !important;
        z-index: 10 !important;
        background: #FFFFFF;
        border-radius: 16px 16px 0 0;
        padding: 14px 16px 20px;
        margin: 20px 10px 0 !important;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
        max-height: none !important; overflow-y: visible !important;
        display: flex; flex-direction: column; gap: 8px;
        border: 1px solid #E2E8F0; border-bottom: none;
    }
    .menu-cart-header { display: flex; justify-content: space-between; align-items: center; }
    .menu-cart-header h3 {
        margin: 0; font-size: 1.1rem; font-weight: 700;
        display: flex; align-items: center; gap: 8px; color: #0F172A;
    }
    .menu-cart-header h3 i { color: #14B8A6; }
    .menu-cart-badge {
        background: #14B8A6; color: #fff; border-radius: 50%;
        padding: 2px 10px; font-size: 0.8rem; font-weight: 700;
    }
    .menu-cart-empty { text-align: center; padding: 20px; color: #94A3B8; font-size: 0.9rem; }
    .menu-cart-empty i { font-size: 1.8rem; display: block; margin-bottom: 8px; color: #E2E8F0; }
    .menu-cart-items {
        max-height: none !important; overflow-y: visible !important;
        display: flex; flex-direction: column; gap: 6px;
    }
    .menu-cart-item {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 8px; border-bottom: 1px solid #F1F5F9;
    }
    .menu-cart-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .menu-cart-item-name {
        font-size: 0.95rem; font-weight: 600; color: #0F172A;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .menu-cart-item-price { font-size: 0.8rem; color: #64748B; }
    .menu-cart-qty { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .menu-cart-qty button {
        width: 32px; height: 32px; border-radius: 50%;
        border: 2px solid #e2e8f0; background: #fff; color: #0F172A;
        font-size: 0.85rem; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
    }
    .menu-cart-qty button:hover { background: #14B8A6; color: #fff; border-color: #14B8A6; transform: scale(1.1); }
    .menu-cart-qty span { font-size: 0.95rem; font-weight: 700; min-width: 24px; text-align: center; }
    .menu-cart-remove { background: none !important; border: none !important; color: #ef4444 !important; }
    .menu-cart-remove:hover { color: #dc2626 !important; }
    .menu-cart-item-total {
        font-size: 0.9rem; font-weight: 700; color: #0F172A;
        min-width: 80px; text-align: right; flex-shrink: 0;
    }
    .menu-cart-total {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 0; border-top: 2px solid #e2e8f0;
        font-size: 1.2rem; font-weight: 700; color: #0F172A;
    }
    .menu-cart-total span:last-child { color: #14B8A6; font-size: 1.4rem; }
    .menu-btn-validate {
        width: 100%; padding: 14px; border: none; border-radius: 12px;
        background: #14B8A6; color: #fff; font-size: 1.1rem; font-weight: 700;
        cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: all 0.2s; box-shadow: 0 4px 12px rgba(20,184,166,0.3);
    }
    .menu-btn-validate:hover { background: #0D9488; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(20,184,166,0.4); }
    .menu-btn-validate:disabled { opacity: 0.5; cursor: not-allowed; }
    .menu-btn-clear {
        width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px;
        background: #fff; color: #ef4444; font-size: 0.85rem; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
    }
    .menu-btn-clear:hover { background: #FEF2F2; border-color: #FCA5A5; }
    .menu-fullscreen-btn {
        position: fixed; bottom: 20px; right: 15px;
        width: 45px; height: 45px; border-radius: 50%; border: none;
        background: #14B8A6; color: #fff; font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(20,184,166,0.35);
        z-index: 54; transition: all 0.2s;
    }
    .menu-fullscreen-btn:hover { transform: scale(1.1) rotate(90deg); }
    .menu-cat-card.active { border-color: #14B8A6 !important; }
    @media (max-width: 380px) {
        .menu-title-wrapper h1 { font-size: 1rem; }
        .menu-title-wrapper p { font-size: 0.7rem; }
        .menu-logo-wrapper { width: 42px; height: 42px; }
        #menuSplashWelcome h1 { font-size: 2rem; }
    }
    @media (max-height: 500px) and (orientation: landscape) {
        .menu-header { padding: 10px 16px; }
        .menu-logo-wrapper { width: 40px; height: 40px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .menu-cat-card, .pos-product-card,
        .menu-search-bar, .menu-btn-validate,
        .menu-cart-qty button {
            animation: none !important;
            transition: none !important;
        }
        .menu-cat-card:hover, .pos-product-card:hover { transform: none !important; }
        #menuSplashWelcome h1 { animation: none !important; }
    }
    #menuTactilePage::-webkit-scrollbar,
    .menu-cart-items::-webkit-scrollbar { width: 6px; }
    #menuTactilePage::-webkit-scrollbar-track,
    .menu-cart-items::-webkit-scrollbar-track { background: transparent; }
    #menuTactilePage::-webkit-scrollbar-thumb,
    .menu-cart-items::-webkit-scrollbar-thumb {
        background: #CBD5E1; border-radius: 3px;
    }
    `;
    document.head.appendChild(style);
}

console.log('🚀 Menu tactile E-SOLUTION v18 (correctif Welcome + tout v17 conservé)');
