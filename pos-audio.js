// ==================== POS-AUDIO.JS v18 – CORRECTION FINALE ====================
// ✅ CORRECTION : Navigation "pos" depuis n'importe quelle page
// ✅ CORRECTION : Mode quantité après sélection d'un produit
// ✅ CORRECTION : Navigation vocale améliorée (crédits, ventes, dashboard, etc.)
// ✅ CORRECTION : Détection et sélection automatique des clients en étape 2
// ✅ CORRECTION : Détection des périodes (aujourd'hui, ce mois, cette année)
// ✅ CORRECTION : Détection des montants en étape 2

var voiceRecognition = null;
var isRecording = false;
var voiceMode = 'search';
var lastAddedProductId = null;
var voiceModeMessage = '🎤 Recherche vocale active';
var micPermissionGranted = false;
var posProductAddedCount = 0;

// ========== INDEX CLIENT ==========
var clientSearchIndex = {};
var clientIndexBuilt = false;

// ========== INDEX PRODUIT (RAPIDE) – POUR POS ==========
var productNameIndex = {};
var productIndexBuilt = false;

// ========== PAYMENT STATE MACHINE ==========
window.voicePaymentState = 0;

// ✅ DÉFINIR closeCreditSelection comme FALLBACK si non défini
if (typeof window.closeCreditSelection !== 'function') {
    window.closeCreditSelection = function() {
        console.log('closeCreditSelection appelé (fallback pos-audio)');
        window.creditSelectionMode = false;
        window.creditSelectedIds = [];
        if (typeof renderCreditsTablePro === 'function') {
            renderCreditsTablePro();
        }
    };
}

var paymentKeywords = {
    'espece': ['espèces', 'espece', 'argent', 'cash', 'comptant', 'liquide', 'espèce'],
    'credit': ['crédit', 'credit', 'à crédit', 'acredit', 'dette', 'avance', 'crédit'],
    'partiel': ['partiel', 'partielle', 'acompte', 'moitié', 'partial', 'part', 'partiel']
};

var numberMap = {
    'wahed': 1, 'ouais': 1, 'wad': 1, 'un': 1, 'une': 1,
    'juge': 2, 'joue': 2, 'george': 2, 'souche': 2, 'deux': 2,
    'claud': 3, 'cl': 3, 'trois': 3, 'clé': 3, 'clea': 3, 'play': 3,
    'rabah': 4, 'quatre': 4, 'arba': 4, 'abba': 4, 'rabat': 4, 'rabats': 4, 'alba': 4,
    'cinq': 5, 'hamza': 5, 'rama': 5, 'comme ça': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
    'onze': 11, 'douze': 12, 'douz': 12, 'treize': 13, 'quatorze': 14,
    'quinze': 15, 'seize': 16, 'vingt': 20, 'trente': 30, 'quarante': 40,
    'cinquante': 50, 'soixante': 60, 'cent': 100
};

// ========== FONCTIONS D'AFFICHAGE VOCAL ==========
function ensureVoiceDisplay() {
    if (!document.getElementById('voiceDisplay')) {
        var div = document.createElement('div');
        div.id = 'voiceDisplay';
        div.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; padding:10px 24px; border-radius:40px; z-index:9999; font-weight:600; display:none; white-space:nowrap;';
        document.body.appendChild(div);
    }
}

function showVoiceResult(msg) {
    ensureVoiceDisplay();
    var el = document.getElementById('voiceDisplay');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(window._voiceTimeout);
    window._voiceTimeout = setTimeout(function() { el.style.display = 'none'; }, 2500);
}

function showVoiceModeIndicator() {
    var mb = document.getElementById('posMicBtn');
    if (mb && isRecording) {
        mb.style.background = '#fee2e2';
        mb.style.borderColor = '#ef4444';
    }
}

function hideVoiceFlowIndicator() {}
function showVoiceFlowIndicator(phase) {
    var labels = { 'product': 'Dites le nom du produit', 'quantity': 'Dites la quantité', 'payment_mode': 'Mode de paiement ?', 'payment_amount': 'Montant donné ?' };
    if (labels[phase]) showVoiceResult(labels[phase]);
}
function showProcessingIndicator() {}

// ========== UTILITAIRES ==========
function escapeHtml(str) { return str ? str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]) : ''; }
function isIOSStandalone() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches); }
function checkVoiceSupport() { var i = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; if (i && isIOSStandalone()) return { supported: false, reason: 'Ouvrez dans Safari' }; if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return { supported: false, reason: 'Non supporté' }; return { supported: true }; }
async function requestMicrophonePermission() { if (micPermissionGranted) return true; try { if (!navigator.mediaDevices?.getUserMedia) return false; const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(t => t.stop()); micPermissionGranted = true; return true; } catch (e) { return false; } }

// ========== INDEX CLIENT ==========
function buildClientIndex() {
    if (clientIndexBuilt || !window.posAllClients?.length) return;
    clientSearchIndex = {};
    window.posAllClients.forEach(c => {
        if (!c?.id) return;
        const allText = (c.nom + ' ' + c.prenom + ' ' + c.telephone + ' ' + (c.description || '')).toLowerCase();
        allText.split(/[\s,;.]+/).forEach(mot => {
            mot = mot.trim();
            if (mot.length >= 1) {
                if (!clientSearchIndex[mot]) clientSearchIndex[mot] = [];
                if (!clientSearchIndex[mot].includes(c)) clientSearchIndex[mot].push(c);
            }
        });
    });
    clientIndexBuilt = true;
}

function fastFindClient(query) {
    buildClientIndex();
    const q = (query || '').toLowerCase().trim();
    if (!q) return window.posAllClients?.slice() || [];
    const normalized = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mots = normalized.split(/[\s,;.]+/);
    const seen = {}, results = [];
    mots.forEach(mot => {
        mot = mot.trim();
        if (!mot) return;
        (clientSearchIndex[mot] || []).forEach(c => { if (!seen[c.id]) { seen[c.id] = true; results.push(c); } });
    });
    return results;
}

function invalidateClientIndex() { clientIndexBuilt = false; clientSearchIndex = {}; }

// ========== INDEX PRODUIT ==========
function buildProductIndex() {
    if (productIndexBuilt || !window.posProductsList?.length) return;
    productNameIndex = {};
    window.posProductsList.forEach(function(p) {
        if (!p.nom) return;
        var nomNormalized = p.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        nomNormalized.split(/[\s,;.]+/).forEach(function(mot) {
            mot = mot.trim();
            if (mot.length < 1) return;
            if (!productNameIndex[mot]) productNameIndex[mot] = [];
            if (!productNameIndex[mot].includes(p)) productNameIndex[mot].push(p);
        });
    });
    productIndexBuilt = true;
}

function fastFindProduct(query) {
    buildProductIndex();
    if (!query) return [];
    var cleaned = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!cleaned) return [];
    var mots = cleaned.split(/[\s,;.]+/);
    var results = [], seen = {};
    mots.forEach(function(mot) {
        mot = mot.trim();
        if (mot.length < 2) return;
        (productNameIndex[mot] || []).forEach(function(p) {
            if (!seen[p.id]) { seen[p.id] = true; results.push(p); }
        });
    });
    return results;
}

// ========== COMMANDES ==========
function extractNumberFromTranscript(transcript) {
    const cleaned = transcript.toLowerCase().trim();
    const digits = cleaned.match(/\b\d+\b/);
    if (digits) return parseInt(digits[0]);
    for (const word in numberMap) { if (cleaned.includes(word)) return numberMap[word]; }
    return null;
}

function detectPeriodFilter(transcript) {
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var periodKeywords = {
        'today': ['aujourdhui', 'aujourd hui', 'today', 'ajourdhui', 'aujourd', 'ce jour', 'jour'],
        'week': ['semaine', '7 jours', 'sept jours', 'cette semaine', 'ces jours'],
        'month': ['mois', 'ce mois', '30 jours', 'trente jours', 'mensuel'],
        'year': ['année', 'an', '365 jours', 'ce an', 'cette année', 'annee', 'cette annee'],
        'all': ['tout', 'toutes', 'all', 'tous', 'total', 'général', 'general']
    };
    for (var period in periodKeywords) {
        if (periodKeywords[period].some(function(kw) { return cleaned.includes(kw); })) {
            return period;
        }
    }
    return null;
}

// ========== PARSE VOICE COMMAND (AMÉLIORÉ) ==========
function parseVoiceCommand(transcript) {
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var currentPage = document.getElementById('pageTitle')?.textContent || '';
    var posStep = window.posStep || 1;

    console.log('🔍 Parsing commande:', cleaned);
    console.log('📄 Page actuelle:', currentPage);
    console.log('📌 PosStep:', posStep);

    // ============================================================
    // 1. NAVIGATION AVEC DÉTECTION AMÉLIORÉE
    // ============================================================
    
    var navWords = {
        'pos': ['pos', 'caisse', 'point de vente', 'vente directe', 'retour pos', 'aller pos', 'ouvrir pos', 'lancer pos', 'caissier'],
        'credits': ['credits', 'credit', 'crédit', 'impayes', 'impaye', 'dettes', 'dette', 'creance', 'creances', 'liste credits', 'liste crédits', 'voir credits'],
        'ventes': ['ventes', 'vente', 'recettes', 'recette', 'chiffre', 'liste ventes', 'voir ventes'],
        'dashboard': ['dashboard', 'accueil', 'tableau de bord', 'tableau', 'bord', 'home', 'acceuil'],
        'clients': ['clients', 'client', 'cliente', 'clientel', 'liste clients', 'voir clients'],
        'commandes': ['commandes', 'commande', 'en ligne', 'online', 'liste commandes', 'voir commandes'],
        'depenses': ['dépenses', 'depenses', 'dépense', 'charges', 'charge', 'liste depenses', 'voir depenses'],
        'statistiques': ['statistiques', 'stat', 'stats', 'analyses', 'analyse', 'voir statistiques'],
        'produits': ['produits', 'produit', 'catalogue', 'stock', 'marchandise', 'liste produits', 'voir produits'],
        'fournisseurs': ['fournisseurs', 'fournisseur', 'fournitures', 'liste fournisseurs', 'voir fournisseurs'],
        'categories': ['categories', 'categorie', 'categoriel', 'cat', 'liste categories', 'voir categories']
    };

    for (var page in navWords) {
        var keywords = navWords[page];
        for (var i = 0; i < keywords.length; i++) {
            if (cleaned.includes(keywords[i])) {
                console.log('✅ Navigation détectée vers:', page, 'depuis:', cleaned);
                return { type: 'navigate', page: page };
            }
        }
    }

    // ============================================================
    // 2. DÉTECTION DES PÉRIODES
    // ============================================================
    
    var period = detectPeriodFilter(cleaned);
    if (period !== null) {
        console.log('✅ Période détectée:', period);
        return { type: 'period_filter', period: period };
    }

    // ============================================================
    // 3. MODE QUANTITÉ
    // ============================================================
    
    if (voiceMode === 'quantity') {
        var num = extractNumberFromTranscript(cleaned);
        if (num !== null && num > 0) {
            console.log('✅ Quantité détectée:', num);
            return { type: 'number', value: num };
        }
        return { type: 'ignore' };
    }

    // ============================================================
    // 4. RECHERCHE DE PRODUITS (étape 1)
    // ============================================================
    
    if (posStep === 1 && (currentPage === 'POS' || currentPage === 'Dashboard' || currentPage === '')) {
        
        if (cleaned.includes('valide') || cleaned.includes('valider') || 
            cleaned.includes('payer') || cleaned.includes('paie')) {
            return { type: 'validate' };
        }
        
        if (cleaned.includes('annule') || cleaned.includes('annuler')) {
            return { type: 'cancel' };
        }
        
        if (cleaned.includes('vider') || cleaned.includes('efface') || 
            cleaned.includes('vide') || cleaned.includes('clear')) {
            return { type: 'clear' };
        }
        
        var products = fastFindProduct(cleaned);
        if (products.length > 0) {
            console.log('✅ Produit trouvé:', products[0].nom);
            // 🔥 Passer en mode quantité après sélection
            return { type: 'search_product', product: products[0], products: products, text: cleaned, page: 'pos' };
        }
        
        if (cleaned.length > 1) {
            return { type: 'search_text', text: cleaned, page: 'pos' };
        }
    }

    // ============================================================
    // 5. PAIEMENT (étape 2) - AVEC DÉTECTION CLIENT
    // ============================================================
    
    if ((currentPage === 'POS' || currentPage === 'Dashboard') && posStep === 2) {
        
        var clientMatch = cleaned.match(/client\s+([a-zA-Zéèêëïîôöûüç\s]+)/i);
        if (clientMatch && clientMatch[1]) {
            var clientName = clientMatch[1].trim();
            var clients = fastFindClient(clientName);
            if (clients.length > 0) {
                console.log('✅ Client trouvé via "client X":', clients[0].nom);
                return { type: 'client', client: clients[0] };
            }
        }
        
        var clients = fastFindClient(cleaned);
        if (clients.length >= 1) {
            console.log('✅ Client trouvé:', clients[0].nom);
            return { type: 'client', client: clients[0] };
        }
        
        var pm = detectPaymentMode(cleaned);
        if (pm) {
            console.log('✅ Mode paiement détecté:', pm);
            return { type: 'payment_mode', mode: pm };
        }
        
        if (cleaned.includes('valide') || cleaned.includes('finaliser') || 
            cleaned.includes('terminer') || cleaned.includes('payer')) {
            return { type: 'validate' };
        }
        
        var amount = extractNumberFromTranscript(cleaned);
        if (amount !== null && amount > 0) {
            console.log('✅ Montant détecté:', amount);
            return { type: 'number', value: amount };
        }
    }

    console.log('⚠️ Commande ignorée:', cleaned);
    return { type: 'ignore' };
}

function detectPaymentMode(transcript) {
    var t = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var mode in paymentKeywords) {
        if (paymentKeywords[mode].some(function(kw) { return t.indexOf(kw) !== -1; })) {
            return mode;
        }
    }
    return null;
}

// ========== HANDLE COMMAND (AMÉLIORÉ) ==========
function handleVoiceCommand(cmd) {
    console.log('🎯 Exécution commande:', cmd.type, cmd);

    switch (cmd.type) {
        case 'search_product':
            // 🔥 SÉLECTIONNER LE PRODUIT ET PASSER EN MODE QUANTITÉ
            var product = cmd.product;
            console.log('🛒 Produit sélectionné:', product.nom);
            
            // Ajouter le produit au panier (1 par défaut)
            if (typeof window.posAddToCartOrOpenOptions === 'function') {
                // Si le produit a des options (recette), ouvrir le modal
                var cat = window.posCategoriesList?.find(function(c) { 
                    return c.nom === product.categorie; 
                });
                var isRecette = cat && cat.recette === true;
                
                if (isRecette) {
                    // Produit avec recette → ouvrir le modal d'options
                    window.posCurrentProductId = product.id;
                    if (typeof window.posOpenOptionsModal === 'function') {
                        window.posOpenOptionsModal(product.id);
                        showVoiceResult('📋 ' + product.nom + ' - Personnalisation');
                    } else {
                        // Fallback: ajouter directement
                        window.posAddToCartOrOpenOptions(product.id);
                        showVoiceResult('➕ ' + product.nom + ' ajouté');
                    }
                } else {
                    // Produit simple → ajouter directement
                    window.posAddToCartOrOpenOptions(product.id);
                    showVoiceResult('➕ ' + product.nom + ' ajouté');
                    
                    // 🔥 PASSER EN MODE QUANTITÉ
                    posProductAddedCount++;
                    setVoiceMode('quantity', '🔢 Dites la quantité (' + product.nom + ')', product.id);
                    showVoiceResult('🔢 Dites la quantité pour ' + product.nom);
                    showVoiceFlowIndicator('quantity');
                }
                
                // Mettre à jour le panier
                if (typeof window.updateCartOnly === 'function') {
                    setTimeout(function() { window.updateCartOnly(); }, 300);
                }
                
            } else {
                showVoiceResult('❌ Fonction produit non disponible');
            }
            break;
            
        case 'search_text':
            var searchText = cmd.text || '';
            
            var searchInput = document.getElementById('posSearchInput');
            if (!searchInput) {
                searchInput = document.querySelector('#posSearchInput, input[type="text"][placeholder*="Rechercher"], input[placeholder*="Rechercher"]');
            }
            
            if (searchInput) {
                console.log('✅ Champ trouvé:', searchInput.id || searchInput.placeholder);
                console.log('✅ ÉCRITURE DU TEXTE:', searchText);
                
                window.posSearchQuery = searchText.toLowerCase().trim();
                searchInput.value = searchText;
                
                try {
                    var inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                    searchInput.dispatchEvent(inputEvent);
                } catch(e) {
                    var event = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(event);
                }
                
                try {
                    var keyupEvent = new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' });
                    searchInput.dispatchEvent(keyupEvent);
                } catch(e) {
                    var keyupEvent2 = new Event('keyup', { bubbles: true });
                    searchInput.dispatchEvent(keyupEvent2);
                }
                
                if (typeof window.posSearchProducts === 'function') {
                    console.log('✅ Appel posSearchProducts:', searchText);
                    window.posSearchProducts(searchText);
                } else if (typeof window.filterProductGrid === 'function') {
                    window.filterProductGrid();
                }
                
                if (typeof window.updateClearButtonVisibility === 'function') {
                    window.updateClearButtonVisibility();
                }
                
                showVoiceResult('🔍 ' + searchText);
            } else {
                console.error('❌ Champ de recherche introuvable');
                showVoiceResult('❌ Champ introuvable');
            }
            break;
            
        case 'client':
            console.log('👤 Sélection client:', cmd.client);
            
            window.posCurrentClient = { 
                id: cmd.client.id, 
                name: (cmd.client.nom || '') + ' ' + (cmd.client.prenom || '')
            };
            
            var ci = document.getElementById('posClientSearchInput');
            if (ci) {
                ci.value = window.posCurrentClient.name;
                try {
                    var ev = new Event('input', { bubbles: true });
                    ci.dispatchEvent(ev);
                } catch(e) {}
            }
            
            var dropdown = document.getElementById('posClientDropdown');
            if (dropdown) dropdown.style.display = 'none';
            
            if (typeof window.updateClientCreditDisplay === 'function') {
                window.updateClientCreditDisplay(cmd.client.id);
            }
            
            if (typeof window.updatePaymentButtons === 'function') {
                window.updatePaymentButtons();
            }
            
            if (typeof window.renderPOS === 'function') {
                window.renderPOS();
            }
            
            showVoiceResult('👤 ' + window.posCurrentClient.name);
            
            if (window.posStep === 1 && typeof window.posGoToStep2 === 'function') {
                setTimeout(function() {
                    window.posGoToStep2();
                }, 300);
            }
            break;
            
        case 'payment_mode':
            if (typeof window.posSetPaymentMethod === 'function') {
                window.posSetPaymentMethod(cmd.mode);
                showVoiceResult('💳 ' + cmd.mode);
                if (typeof window.renderPOS === 'function') {
                    setTimeout(function() { window.renderPOS(); }, 200);
                }
            }
            break;
            
        case 'number':
            var ai = document.getElementById('posAmountGiven');
            if (ai) {
                ai.value = cmd.value;
                window.posAmountGiven = cmd.value;
                if (typeof window.posCalculateChange === 'function') {
                    window.posCalculateChange();
                }
                showVoiceResult('💰 ' + cmd.value + ' MAD');
            } else {
                // Si pas de champ montant, c'est peut-être une quantité
                if (window.posCart && window.posCart.length > 0) {
                    var lastItem = window.posCart[window.posCart.length - 1];
                    if (lastItem) {
                        var diff = cmd.value - lastItem.quantite;
                        if (diff > 0) {
                            if (typeof window.posUpdateQty === 'function') {
                                var idx = window.posCart.length - 1;
                                for (var i = 0; i < diff; i++) {
                                    window.posUpdateQty(idx, 1);
                                }
                                showVoiceResult('📦 ' + lastItem.nom + ' x' + cmd.value);
                            }
                        }
                    }
                }
            }
            break;
            
        case 'validate':
        case 'finalize':
            if (window.posStep === 2 && typeof window.posFinalizeSale === 'function') {
                window.posFinalizeSale();
            } else if (window.posCart?.length > 0 && window.posStep === 1) {
                if (typeof window.posGoToStep2 === 'function') {
                    window.posGoToStep2();
                }
            }
            break;
            
        case 'clear':
            if (typeof window.posResetCart === 'function') {
                window.posResetCart();
                showVoiceResult('🗑️ Panier vidé');
                if (typeof window.renderPOS === 'function') {
                    setTimeout(function() { window.renderPOS(); }, 200);
                }
            }
            break;
            
        case 'cancel':
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            if (typeof window.renderPOS === 'function') {
                window.renderPOS();
            }
            showVoiceResult('↩️ Annulé');
            break;
            
        case 'navigate':
            console.log('📍 Navigation vers:', cmd.page);
            
            // 🔥 NAVIGATION SPÉCIALE VERS POS
            if (cmd.page === 'pos') {
                console.log('🛒 Navigation vers POS demandée');
                if (typeof navigateTo === 'function') {
                    navigateTo('pos');
                    // Réinitialiser le mode vocal pour la recherche
                    setTimeout(function() {
                        setVoiceMode('search', '🎤 Recherche vocale active', null);
                        showVoiceResult('🛒 POS ouvert');
                    }, 500);
                } else {
                    showVoiceResult('❌ Navigation non disponible');
                }
            } else if (typeof navigateTo === 'function') {
                navigateTo(cmd.page);
                var pageLabels = {
                    'credits': '📋 Crédits',
                    'ventes': '💰 Ventes',
                    'dashboard': '📊 Dashboard',
                    'clients': '👤 Clients',
                    'commandes': '🛒 Commandes',
                    'depenses': '💸 Dépenses',
                    'statistiques': '📈 Statistiques',
                    'produits': '📦 Produits',
                    'fournisseurs': '🚚 Fournisseurs',
                    'categories': '📂 Catégories',
                    'pos': '🛒 POS'
                };
                showVoiceResult('📍 ' + (pageLabels[cmd.page] || cmd.page));
            } else {
                showVoiceResult('⚠️ Navigation non disponible');
            }
            break;
            
        case 'period_filter':
            console.log('📅 Filtre période:', cmd.period);
            
            var periodSelect = document.getElementById('periodSelect') || 
                               document.getElementById('globalPeriodSelect') ||
                               document.getElementById('ventesPeriodSelect') ||
                               document.getElementById('creditsPeriodSelect') ||
                               document.getElementById('commandesPeriodSelect') ||
                               document.querySelector('select[onchange*="Period"]');
            
            if (periodSelect) {
                periodSelect.value = cmd.period;
                try {
                    var changeEvent = new Event('change', { bubbles: true });
                    periodSelect.dispatchEvent(changeEvent);
                } catch(e) {
                    if (typeof periodSelect.onchange === 'function') {
                        periodSelect.onchange();
                    }
                }
                var labels = {
                    'today': "📅 Aujourd'hui",
                    'week': '📅 Cette semaine',
                    'month': '📅 Ce mois',
                    'year': '📅 Cette année',
                    'all': '📅 Toutes les périodes'
                };
                showVoiceResult(labels[cmd.period] || '📅 Filtre appliqué');
            } else {
                showVoiceResult('⚠️ Sélecteur de période non trouvé');
            }
            break;
            
        default:
            console.log('⚠️ Commande non reconnue:', cmd);
            showVoiceResult('❓ Commande non reconnue');
            break;
    }
}

// ========== SET VOCAL MODE ==========
function setVoiceMode(mode, msg, productId) {
    voiceMode = mode;
    if (msg) voiceModeMessage = msg;
    if (productId !== undefined) lastAddedProductId = productId;
    if (mode === 'payment') window.voicePaymentState = 0;
    showVoiceModeIndicator();
    console.log('🎤 Mode vocal changé:', mode, msg);
}

// ========== MICRO ==========
function posToggleVoiceSearch() {
    console.log('🎤 posToggleVoiceSearch appelé');
    var s = checkVoiceSupport();
    if (!s.supported) { alert('⚠️ ' + s.reason); return; }
    if (!navigator.onLine) { alert('⚠️ Connexion internet requise.'); return; }
    if (isRecording) { posStopVoiceSearch(); return; }
    requestMicrophonePermission().then(function(p) {
        if (!p) { alert('❌ Micro refusé.'); return; }
        posStartVoiceRecording();
    });
}

function posStartVoiceRecording() {
    console.log('🎤 Démarrage enregistrement vocal...');
    var mb = document.getElementById('posMicBtn');
    if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('❌ Reconnaissance vocale non disponible.'); return; }
    voiceRecognition = new SR();
    voiceRecognition.lang = 'fr-FR';
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.maxAlternatives = 1;

    if (mb) {
        mb.innerHTML = '<i class="fas fa-circle" style="color:#ef4444;animation:pulse 0.5s ease-in-out infinite;"></i>';
        mb.style.background = '#fee2e2';
        mb.style.borderColor = '#ef4444';
    }

    var lastInterim = '';
    var lastFinal = '';
    var lastCommandTime = 0;

    voiceRecognition.onresult = function(e) {
        var interim = '', final = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t;
            else interim += t;
        }
        
        console.log('🎤 Résultat vocal - Interim:', interim, 'Final:', final);

        // Page Crédits
        var cp = document.getElementById('pageTitle')?.textContent || '';
        if (cp === 'Crédits') {
            var searchInput = document.getElementById('creditsSearchInput');
            var voiceDisplay = document.getElementById('creditsVoiceDisplay');
            if (final && searchInput) {
                if (typeof window.processCreditsSearchFromVoice === 'function') {
                    window.processCreditsSearchFromVoice(final);
                } else {
                    searchInput.value = final;
                    window.creditsSearch = final;
                    if (typeof window.applyCreditsFilters === 'function') window.applyCreditsFilters();
                }
                if (voiceDisplay) voiceDisplay.value = final;
            } else if (interim && searchInput) {
                searchInput.value = interim + ' ✍️';
                if (voiceDisplay) voiceDisplay.value = interim + ' ✍️';
            }
            return;
        }

        // ✅ PAGE POS
        if (final && final.trim().length > 0 && final !== lastFinal) {
            lastFinal = final;
            console.log('✅ TEXTE FINAL DÉTECTÉ:', final);

            // 🔥 Analyser la commande
            var cmd = parseVoiceCommand(final);
            if (cmd && cmd.type !== 'ignore') {
                var now = Date.now();
                if (now - lastCommandTime > 1500 || cmd.type === 'search_product' || cmd.type === 'search_text') {
                    lastCommandTime = now;
                    handleVoiceCommand(cmd);
                }
                return;
            }

            // Fallback: recherche simple
            setTimeout(function() {
                var si = document.getElementById('posSearchInput');
                if (!si) {
                    si = document.querySelector('#posSearchInput, input[type="text"][placeholder*="Rechercher"], input[placeholder*="Rechercher"]');
                }
                if (si && final.trim().length > 1) {
                    window.posSearchQuery = final.toLowerCase().trim();
                    si.value = final;
                    try {
                        var inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                        si.dispatchEvent(inputEvent);
                    } catch(e) {
                        var event = new Event('input', { bubbles: true });
                        si.dispatchEvent(event);
                    }
                    if (typeof window.posSearchProducts === 'function') {
                        window.posSearchProducts(final);
                    } else if (typeof window.filterProductGrid === 'function') {
                        window.filterProductGrid();
                    }
                    if (typeof window.updateClearButtonVisibility === 'function') {
                        window.updateClearButtonVisibility();
                    }
                    showVoiceResult('🔍 ' + final);
                }
            }, 200);
            
        } else if (interim && interim !== lastInterim) {
            console.log('✍️ Interim:', interim);
            var si = document.getElementById('posSearchInput');
            if (si) {
                si.value = interim + ' ✍️';
                lastInterim = interim;
            }
        }
    };

    voiceRecognition.onend = function() {
        console.log('🛑 Reconnaissance terminée');
        if (isRecording) {
            setTimeout(function() {
                try { voiceRecognition.start(); } catch (e) { posStopVoiceSearch(); }
            }, 8);
        }
    };
    voiceRecognition.onerror = function(e) {
        console.error('❌ Erreur reconnaissance:', e.error);
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        if (e.error === 'network') showVoiceResult('❌ Réseau');
        posStopVoiceSearch();
    };

    try {
        voiceRecognition.start();
        isRecording = true;
        showVoiceModeIndicator();
        showVoiceResult('🎤 Écoute...');
    } catch (e) {
        console.error('❌ Erreur démarrage:', e);
        isRecording = false;
        if (mb) {
            mb.innerHTML = '<i class="fas fa-microphone"></i>';
            mb.style.background = '#dcfce7';
            mb.style.borderColor = '#16a34a';
        }
    }
}

function posStopVoiceSearch() {
    if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
    isRecording = false;
    var mb = document.getElementById('posMicBtn');
    if (mb) {
        mb.innerHTML = '<i class="fas fa-microphone"></i>';
        mb.style.background = '#dcfce7';
        mb.style.borderColor = '#16a34a';
    }
    hideVoiceFlowIndicator();
    showVoiceResult('🎤 Micro désactivé');
}

// ========== EXPORTS ==========
window.posToggleVoiceSearch = posToggleVoiceSearch;
window.posAudioToggleVoiceSearch = posToggleVoiceSearch;
window.showVoiceResult = showVoiceResult;
window.setVoiceMode = setVoiceMode;
window.showVoiceModeIndicator = showVoiceModeIndicator;
window.parseVoiceCommand = parseVoiceCommand;
window.handleVoiceCommand = handleVoiceCommand;
window.invalidateClientIndex = invalidateClientIndex;
window.showVoiceFlowIndicator = showVoiceFlowIndicator;
window.hideVoiceFlowIndicator = hideVoiceFlowIndicator;
window.showProcessingIndicator = showProcessingIndicator;
window.onProductAdded = function(pid) {
    lastAddedProductId = pid;
    setVoiceMode('quantity', '🔢 Qté', pid);
};
window.buildClientIndex = buildClientIndex;
window.buildProductIndex = buildProductIndex;
window.fastFindProduct = fastFindProduct;
window.posStopVoiceSearch = posStopVoiceSearch;

// ✅ GARANTIR que closeCreditSelection existe
if (typeof window.closeCreditSelection !== 'function') {
    window.closeCreditSelection = function() {
        window.creditSelectionMode = false;
        window.creditSelectedIds = [];
        if (typeof renderCreditsTablePro === 'function') {
            renderCreditsTablePro();
        }
    };
}

console.log('🎤 Module vocal v18 – CORRECTION FINALE');
console.log('✅ Navigation "pos" depuis n\'importe quelle page');
console.log('✅ Mode quantité après sélection d\'un produit');
console.log('✅ Navigation vocale améliorée (crédits, ventes, dashboard, etc.)');
console.log('✅ Détection et sélection automatique des clients en étape 2');
console.log('✅ Détection des périodes (aujourd\'hui, ce mois, cette année)');
console.log('✅ Détection des montants en étape 2');
