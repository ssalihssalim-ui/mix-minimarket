// ==================== POS-AUDIO.JS v12 – CORRIGÉ DÉFINITIF ====================
// Mixmax Minimarket – Reconnaissance vocale avec retour visuel intégré
// ✅ CORRECTION : Export double window.posToggleVoiceSearch ET window.posAudioToggleVoiceSearch

var voiceRecognition = null;
var isRecording = false;
var voiceMode = 'search';
var lastAddedProductId = null;
var voiceModeMessage = '🎤 Recherche vocale active';
var micPermissionGranted = false;

// ========== INDEX CLIENT ==========
var clientSearchIndex = {};
var clientIndexBuilt = false;

// ========== INDEX PRODUIT (RAPIDE) – POUR POS ==========
var productNameIndex = {};
var productIndexBuilt = false;

// ========== PAYMENT STATE MACHINE ==========
window.voicePaymentState = 0;

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
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(window._voiceTimeout);
    window._voiceTimeout = setTimeout(function() { el.style.display = 'none'; }, 2000);
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
        const fullName = (c.nom + ' ' + c.prenom).toLowerCase().trim();
        if (fullName.length >= 2) {
            if (!clientSearchIndex[fullName]) clientSearchIndex[fullName] = [];
            if (!clientSearchIndex[fullName].includes(c)) clientSearchIndex[fullName].push(c);
        }
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
    if (results.length === 0 && window.posAllClients) {
        results.push(...window.posAllClients.filter(c => {
            const nom = (c.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const prenom = (c.prenom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return nom.includes(normalized) || prenom.includes(normalized);
        }));
    }
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
    if (results.length === 0 && window.posProductsList) {
        window.posProductsList.forEach(function(p) {
            var nom = (p.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (nom.indexOf(cleaned) !== -1 && !seen[p.id]) { seen[p.id] = true; results.push(p); }
        });
    }
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
    var cleaned = transcript.toLowerCase().trim();
    if (cleaned.includes("aujourd'hui") || cleaned.includes("today")) return 'today';
    if (cleaned.includes("semaine") || cleaned.includes("7 jours")) return '7';
    if (cleaned.includes("mois") && !cleaned.includes("3 mois") && !cleaned.includes("6 mois")) return '30';
    if (cleaned.includes("3 mois")) return '90';
    if (cleaned.includes("6 mois")) return '180';
    if (cleaned.includes("an") || cleaned.includes("année")) return '365';
    if (cleaned.includes("tout") || cleaned.includes("toutes")) return 'all';
    return null;
}

function parseVoiceCommand(transcript) {
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var currentPage = document.getElementById('pageTitle')?.textContent || '';
    var posStep = window.posStep || 1;

    // Navigation
    if (cleaned.includes('crédits') || cleaned.includes('impayés') || cleaned.includes('dettes')) return { type: 'navigate', page: 'credits' };
    if (cleaned.includes('ventes') || cleaned.includes('recettes')) return { type: 'navigate', page: 'ventes' };
    if (cleaned.includes('dashboard') || cleaned.includes('accueil')) return { type: 'navigate', page: 'dashboard' };
    if (cleaned.includes('clients')) return { type: 'navigate', page: 'clients' };
    if (cleaned.includes('commandes')) return { type: 'navigate', page: 'commandes' };
    if (cleaned.includes('dépenses') || cleaned.includes('depenses')) return { type: 'navigate', page: 'depenses' };
    if (cleaned.includes('statistiques')) return { type: 'navigate', page: 'statistiques' };
    if (cleaned.includes('produits') || cleaned.includes('catalogue')) return { type: 'navigate', page: 'products' };

    // Période
    var period = detectPeriodFilter(cleaned);
    if (period !== null) return { type: 'period_filter', period: period };

    // Mode quantité
    if (voiceMode === 'quantity') {
        var num = extractNumberFromTranscript(cleaned);
        if (num !== null && num > 0) return { type: 'number', value: num };
        return { type: 'ignore' };
    }

    // ÉTAPE 1 : Recherche produit
    if ((currentPage === 'POS' || currentPage === 'Dashboard') && posStep === 1) {
        var products = fastFindProduct(cleaned);
        if (products.length > 0) {
            return { type: 'search_product', product: products[0], products: products, text: cleaned, page: 'pos' };
        }
        if (cleaned.includes('valide') || cleaned.includes('valider')) return { type: 'validate' };
        if (cleaned.includes('annule') || cleaned.includes('annuler')) return { type: 'cancel' };
        if (cleaned.includes('vider') || cleaned.includes('efface')) return { type: 'clear' };
    }

    // ÉTAPE 2 : Paiement
    if ((currentPage === 'POS' || currentPage === 'Dashboard') && posStep === 2) {
        var clients = fastFindClient(cleaned);
        if (clients.length === 1) return { type: 'client', client: clients[0] };
        if (clients.length > 1) return { type: 'client', client: clients[0] };
        var pm = detectPaymentMode(cleaned);
        if (pm) return { type: 'payment_mode', mode: pm };
        if (cleaned.includes('valide') || cleaned.includes('finaliser')) return { type: 'validate' };
    }

    return { type: 'ignore' };
}

function detectPaymentMode(transcript) {
    var t = transcript.toLowerCase().trim();
    for (var mode in paymentKeywords) {
        if (paymentKeywords[mode].some(function(kw) { return t.indexOf(kw) !== -1; })) return mode;
    }
    return null;
}

// ========== HANDLE COMMAND ==========
function handleVoiceCommand(cmd) {
    var cp = document.getElementById('pageTitle')?.textContent || '';
    switch (cmd.type) {
        case 'search_product':
            var searchInput = document.getElementById('posSearchInput');
            if (searchInput) {
                var searchText = cmd.product ? cmd.product.nom : cmd.text || '';
                window.posSearchQuery = searchText.toLowerCase().trim();
                searchInput.value = searchText;
                if (typeof window.posSearchProducts === 'function') {
                    window.posSearchProducts(searchText);
                }
                setTimeout(function() {
                    if (typeof window.filterProductGrid === 'function') {
                        window.filterProductGrid();
                    }
                }, 300);
                showVoiceResult('🔍 ' + searchText);
            }
            break;
        case 'client':
            window.posCurrentClient = { id: cmd.client.id, name: cmd.client.nom + ' ' + cmd.client.prenom };
            var ci = document.getElementById('posClientSearchInput');
            if (ci) ci.value = window.posCurrentClient.name;
            if (typeof window.updateClientCreditDisplay === 'function') window.updateClientCreditDisplay(cmd.client.id);
            if (typeof window.updatePaymentButtons === 'function') window.updatePaymentButtons();
            showVoiceResult('👤 ' + window.posCurrentClient.name);
            setTimeout(function() {
                if (window.posStep === 1 && typeof window.posGoToStep2 === 'function') window.posGoToStep2();
                if (typeof window.renderPOS === 'function') window.renderPOS();
            }, 400);
            break;
        case 'payment_mode':
            if (typeof window.posSetPaymentMethod === 'function') {
                window.posSetPaymentMethod(cmd.mode);
                showVoiceResult('💳 ' + cmd.mode);
            }
            break;
        case 'number':
            var ai = document.getElementById('posAmountGiven');
            if (ai) {
                ai.value = cmd.value;
                window.posAmountGiven = cmd.value;
                if (typeof window.posCalculateChange === 'function') window.posCalculateChange();
                showVoiceResult('💰 ' + cmd.value);
            }
            break;
        case 'validate': case 'finalize':
            if (window.posStep === 2 && typeof window.posFinalizeSale === 'function') {
                window.posFinalizeSale();
            } else if (window.posCart?.length > 0 && window.posStep === 1) {
                window.posGoToStep2();
            }
            break;
        case 'clear':
            if (typeof window.posResetCart === 'function') { window.posResetCart(); showVoiceResult('🗑️ Panier vidé'); }
            break;
        case 'cancel':
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            if (typeof window.renderPOS === 'function') window.renderPOS();
            break;
        case 'navigate':
            var pages = { 'credits': 'Crédits', 'ventes': 'Ventes', 'dashboard': 'Dashboard', 'products': 'Produits', 'clients': 'Clients', 'commandes': 'Commandes en ligne', 'depenses': 'Dépenses', 'statistiques': 'Statistiques' };
            if (typeof navigateTo === 'function') {
                navigateTo(cmd.page);
                showVoiceResult('📍 ' + pages[cmd.page]);
            }
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
}

// ========== MICRO ==========
function posToggleVoiceSearch() {
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
        mb.style.background = '#fee2e2'; mb.style.borderColor = '#ef4444';
    }

    var lastInterim = '';
    voiceRecognition.onresult = function(e) {
        var interim = '', final = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t;
            else interim += t;
        }
        var si = document.getElementById('posSearchInput');
        if (si) {
            if (final) {
                window.posSearchQuery = final.toLowerCase().trim();
                si.value = final;
                if (typeof window.posSearchProducts === 'function') {
                    window.posSearchProducts(final);
                }
                setTimeout(function() {
                    if (typeof window.filterProductGrid === 'function') {
                        window.filterProductGrid();
                    }
                }, 300);
                var cmd = parseVoiceCommand(final);
                if (cmd.type !== 'ignore') handleVoiceCommand(cmd);
            } else if (interim && interim !== lastInterim) {
                si.value = interim + ' ✍️';
                lastInterim = interim;
            }
        }
    };

    voiceRecognition.onend = function() {
        if (isRecording) {
            setTimeout(function() {
                try { voiceRecognition.start(); } catch (e) { posStopVoiceSearch(); }
            }, 8);
        }
    };
    voiceRecognition.onerror = function(e) {
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
        isRecording = false;
        if (mb) {
            mb.innerHTML = '<i class="fas fa-microphone"></i>';
            mb.style.background = '#dcfce7'; mb.style.borderColor = '#16a34a';
        }
    }
}

function posStopVoiceSearch() {
    if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
    isRecording = false;
    var mb = document.getElementById('posMicBtn');
    if (mb) {
        mb.innerHTML = '<i class="fas fa-microphone"></i>';
        mb.style.background = '#dcfce7'; mb.style.borderColor = '#16a34a';
    }
    hideVoiceFlowIndicator();
    showVoiceResult('🎤 Micro désactivé');
}

// ========== EXPORTS ==========
window.posToggleVoiceSearch = posToggleVoiceSearch;
window.posAudioToggleVoiceSearch = posToggleVoiceSearch; // ✅ CORRECTION : double export
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

console.log('🎤 Module vocal v12 – corrigé avec double export');
console.log('✅ window.posToggleVoiceSearch:', typeof window.posToggleVoiceSearch);
console.log('✅ window.posAudioToggleVoiceSearch:', typeof window.posAudioToggleVoiceSearch);
