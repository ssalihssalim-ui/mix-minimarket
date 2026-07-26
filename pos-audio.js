// ==================== POS-AUDIO.JS v10 – DARIJA MAROCAIN ====================
// Mixmax Minimarket – Reconnaissance vocale en darija

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

// Mots‑clés de paiement en darija
var paymentKeywords = {
    'espece': ['espèces', 'espece', 'argent', 'cash', 'comptant', 'liquide', 'flous', 'kharda', 'nagd'],
    'credit': ['crédit', 'credit', 'dette', 'dayn', 'b dyn', 'à crédit', 'bittaqa'],
    'partiel': ['partiel', 'partielle', 'acompte', 'moitié', 'ns', 'noç', 'chwiya', 'chwiya dyal flous']
};

// Chiffres en darija (reconnaissance vocale approximative)
var numberMap = {
    'wahd': 1, 'wahed': 1, 'wahad': 1, 'jouj': 2, 'jouje': 2, 'juj': 2,
    'tlata': 3, 'tleta': 3, 'rbaa': 4, 'rba3': 4, 'rab3a': 4,
    'khamsa': 5, 'khams': 5, 'stta': 6, 'setta': 6, 'seb3a': 7, 'sebaa': 7,
    'tmnya': 8, 'tamanya': 8, 'ts3oud': 9, 'ts3a': 9, 'tsaoud': 9,
    '3chra': 10, '7dach': 11, 'tna3ch': 12, 'tna3che': 12, 'tlata3ch': 13,
    'rb3a3ch': 14, 'khamsta3ch': 15, 'stta3ch': 16, 'sb3a3ch': 17,
    'tmnya3ch': 18, 'ts3a3ch': 19, '3chrin': 20, 'tlatin': 30,
    'rb3in': 40, 'khamsin': 50, 'sittin': 60, 'sb3in': 70, 'tmanin': 80,
    'ts3in': 90, 'mya': 100
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
    window._voiceTimeout = setTimeout(function() {
        el.style.display = 'none';
    }, 2000);
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
    var labels = {
        'product': 'Goul smiya dyal produit',
        'quantity': 'Ch7al kayn ?',
        'payment_mode': 'Kifash bghiti tkhalles ?',
        'payment_amount': 'Ch7al 3titih ?'
    };
    if (labels[phase]) showVoiceResult(labels[phase]);
}
function showProcessingIndicator() {}

// ========== UTILITAIRES ==========
function escapeHtml(str) { return str ? str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]) : ''; }
function checkVoiceSupport() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))
        return { supported: false, reason: 'Makaynch had lkhedma f had lehna' };
    return { supported: true };
}
async function requestMicrophonePermission() {
    if (micPermissionGranted) return true;
    try {
        if (!navigator.mediaDevices?.getUserMedia) return false;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        micPermissionGranted = true;
        return true;
    } catch (e) { return false; }
}

// ========== CONSTRUCTION INDEX CLIENT ==========
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
    return results.length ? results : window.posAllClients.filter(c => {
        const nom = (c.nom || '').toLowerCase();
        const prenom = (c.prenom || '').toLowerCase();
        return nom.includes(normalized) || prenom.includes(normalized);
    });
}

// ========== INDEX PRODUIT ==========
function buildProductIndex() {
    if (productIndexBuilt || !window.posProductsList?.length) return;
    productNameIndex = {};
    window.posProductsList.forEach(function(p) {
        if (!p.nom) return;
        var nomNormalized = p.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        var mots = nomNormalized.split(/[\s,;.]+/);
        mots.forEach(function(mot) {
            mot = mot.trim();
            if (mot.length < 2) return;
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
    var mots = cleaned.split(/[\s,;.]+/);
    if (mots.length === 0) return [];
    var candidates = productNameIndex[mots[0]] || [];
    if (candidates.length === 0) return [];
    var filtered = candidates.filter(function(p) {
        var nom = (p.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return nom.indexOf(cleaned) !== -1;
    });
    if (filtered.length === 0) return [candidates[0]];
    return filtered.sort((a,b) => (a.nom||'').length - (b.nom||'').length);
}

// ========== COMMANDES EN DARIJA ==========
function extractNumberFromTranscript(transcript) {
    const cleaned = transcript.toLowerCase().trim();
    const digits = cleaned.match(/\b\d+\b/);
    if (digits) return parseInt(digits[0]);
    for (const word in numberMap) {
        if (cleaned.includes(word)) return numberMap[word];
    }
    return null;
}

function detectPeriodFilter(transcript) {
    var c = transcript.toLowerCase().trim();
    if (c.includes("lyoum") || c.includes("el youm") || c.includes("today")) return 'today';
    if (c.includes("had chhar") || c.includes("chhar hada") || c.includes("ce mois")) return '30';
    if (c.includes("7 ayam") || c.includes("sb3a ayam") || c.includes("simana")) return '7';
    if (c.includes("15 yom") || c.includes("khamstach yom")) return '15';
    if (c.includes("30 yom") || c.includes("tlatin yom") || c.includes("chhar")) return '30';
    if (c.includes("3 chhour") || c.includes("tlata chhour")) return '90';
    if (c.includes("6 chhour") || c.includes("stta chhour")) return '180';
    if (c.includes("3am") || c.includes("am") || c.includes("sanat") || c.includes("1 an")) return '365';
    if (c.includes("kolchi") || c.includes("kamlin") || c.includes("tout")) return 'all';
    return null;
}

// Navigation et commandes en darija
function parseVoiceCommand(transcript) {
    var cleaned = transcript.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var cp = document.getElementById('pageTitle')?.textContent || '';

    // Navigation
    if (cleaned.includes('crédit') || cleaned.includes('dette') || cleaned.includes('dayn') || cleaned.includes('impayés')) return { type: 'navigate', page: 'credits' };
    if (cleaned.includes('ventes') || cleaned.includes('mabyaat') || cleaned.includes('bai3')) return { type: 'navigate', page: 'ventes' };
    if (cleaned.includes('accueil') || cleaned.includes('sfa7a lkbira') || cleaned.includes('tableau de bord') || cleaned.includes('dashboard')) return { type: 'navigate', page: 'dashboard' };
    if (cleaned.includes('produits') || cleaned.includes('produit') || cleaned.includes('muntajat') || cleaned.includes('catalogue')) return { type: 'navigate', page: 'products' };
    if (cleaned.includes('clients') || cleaned.includes('zabayin') || cleaned.includes('zaboun')) return { type: 'navigate', page: 'clients' };
    if (cleaned.includes('commandes') || cleaned.includes('talabat')) return { type: 'navigate', page: 'commandes' };
    if (cleaned.includes('catégories') || cleaned.includes('anwaa') || cleaned.includes('categories')) return { type: 'navigate', page: 'categories' };
    if (cleaned.includes('pos') || cleaned.includes('caisse') || cleaned.includes('kissa') || cleaned.includes('point de vente')) return { type: 'navigate', page: 'pos' };
    if (cleaned.includes('dépenses') || cleaned.includes('depenses') || cleaned.includes('masarif')) return { type: 'navigate', page: 'depenses' };
    if (cleaned.includes('statistiques') || cleaned.includes('ihsae') || cleaned.includes('stats')) return { type: 'navigate', page: 'statistiques' };
    if (cleaned.includes('options') || cleaned.includes('khtiyarat') || cleaned.includes('paramètres')) return { type: 'navigate', page: 'options' };

    // Période
    var period = detectPeriodFilter(cleaned);
    if (period !== null) return { type: 'period_filter', period: period };

    // Mode quantité
    if (voiceMode === 'quantity') {
        var num = extractNumberFromTranscript(cleaned);
        if (num !== null && num > 0) return { type: 'number', value: num };
        return { type: 'ignore' };
    }

    // Mode paiement
    if (voiceMode === 'payment' || (cp === 'POS' && (window.posStep || 0) === 2)) {
        switch (window.voicePaymentState) {
            case 0:
                if (window.posAllClients) {
                    var clients = fastFindClient(cleaned);
                    if (clients.length === 1) return { type: 'client', client: clients[0] };
                    if (clients.length > 1) {
                        var best = clients.find(function(c) { return (c.nom + ' ' + c.prenom).toLowerCase().indexOf(cleaned) !== -1; }) || clients[0];
                        return { type: 'client', client: best };
                    }
                }
                var pm0 = detectPaymentMode(cleaned);
                if (pm0) return { type: 'payment_mode', mode: pm0 };
                return { type: 'ignore' };
            case 1:
                var pm = detectPaymentMode(cleaned);
                if (pm) return { type: 'payment_mode', mode: pm };
                return { type: 'ignore' };
            case 2:
                var n = extractNumberFromTranscript(cleaned);
                if (n !== null && n > 0) return { type: 'number', value: n };
                if (cleaned.includes('valide') || cleaned.includes('sahih') || cleaned.includes('confirmer') || cleaned.includes('ok')) return { type: 'validate' };
                return { type: 'ignore' };
        }
    }

    // Recherche produit (étape 1)
    if (voiceMode === 'search' && (cp === 'POS' || cp === 'Dashboard') && (window.posStep || 0) === 1) {
        var products = window.posProductsList || [];
        if (products.length) {
            var best = fastFindProduct(cleaned)[0];
            if (best) return { type: 'search_product', product: best, page: 'pos' };
        }
        if (cleaned.includes('dwez') || cleaned.includes('passer') || cleaned.includes('zid') || cleaned.includes('mzyan')) return { type: 'next' };
        if (cleaned.includes('sahih') || cleaned.includes('valide') || cleaned.includes('confirmer') || cleaned.includes('ok')) return { type: 'validate' };
        if (cleaned.includes('annuler') || cleaned.includes('rja3') || cleaned.includes('bla')) return { type: 'cancel' };
        if (cleaned.includes('msa7') || cleaned.includes('effacer') || cleaned.includes('vide')) return { type: 'clear' };
        if (cleaned.includes('sali') || cleaned.includes('terminer') || cleaned.includes('kammel')) return { type: 'finalize' };
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
        case 'period_filter':
            var period = cmd.period;
            var periodLabels = {
                'today': "Lyoum",
                '7': "7 ayam",
                '15': "15 yom",
                '30': "30 yom",
                '90': "3 chhour",
                '180': "6 chhour",
                '365': "3am",
                'all': "Kolchi"
            };
            // Appliquer selon la page
            var periodSelect = null;
            if (cp === 'Crédits') periodSelect = document.getElementById('creditsPeriodSelect');
            else if (cp === 'Ventes') periodSelect = document.getElementById('ventesPeriodSelect');
            else if (cp === 'Dépenses') periodSelect = document.getElementById('globalPeriodSelect');
            else if (cp === 'Commandes en ligne') periodSelect = document.getElementById('commandesPeriodSelect');
            else if (cp === 'Statistiques') periodSelect = document.getElementById('statPeriodSelect');
            if (periodSelect) {
                periodSelect.value = period;
                var event = new Event('change', { bubbles: true });
                periodSelect.dispatchEvent(event);
                showVoiceResult('📅 ' + (periodLabels[period] || period));
            }
            hideVoiceFlowIndicator();
            break;
        case 'search_product':
            var searchInput = document.getElementById('posSearchInput');
            if (searchInput && cmd.product) {
                searchInput.value = cmd.product.nom;
                if (cmd.product.categorie && typeof window.posFilterCategory === 'function') {
                    window.posFilterCategory(cmd.product.categorie);
                }
                showVoiceResult('🔍 ' + cmd.product.nom);
            }
            hideVoiceFlowIndicator();
            break;
        case 'number':
            if (voiceMode === 'quantity' && lastAddedProductId) {
                var qty = cmd.value;
                var it = window.posCart?.find(function(x) { return x.id === lastAddedProductId; });
                if (it) {
                    it.quantite = qty;
                    lastAddedProductId = null;
                    setVoiceMode('search', '🎤 Recherche vocale active', null);
                    if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
                    showVoiceResult('✅ Qté: ' + qty);
                }
            } else if (voiceMode === 'payment' && window.voicePaymentState === 2) {
                window.posAmountGiven = cmd.value;
                var ce = document.getElementById('posChangeDisplay');
                if (ce) {
                    var st = typeof window.posCalculateTotal === 'function' ? window.posCalculateTotal() : 0;
                    var t = st - (window.posDiscountMAD || 0);
                    var c = window.posAmountGiven - t;
                    ce.innerHTML = c >= 0 ? '<div class="pos-change-positive"><span>Rendu</span><span>' + c.toFixed(2) + ' MAD</span></div>' : '<div class="pos-change-negative"><span>Manquant</span><span>' + Math.abs(c).toFixed(2) + ' MAD</span></div>';
                }
                var ai = document.getElementById('posAmountGiven');
                if (ai) ai.value = window.posAmountGiven;
                showVoiceResult('💰 ' + window.posAmountGiven.toFixed(2) + ' DH');
            }
            hideVoiceFlowIndicator();
            break;
        case 'client':
            window.posCurrentClient = { id: cmd.client.id, name: cmd.client.nom + ' ' + cmd.client.prenom };
            window.posCurrentTable = '';
            var ci = document.getElementById('posClientSearchInput');
            if (ci) ci.value = window.posCurrentClient.name;
            window.voicePaymentState = 1;
            showVoiceResult('👤 ' + window.posCurrentClient.name);
            hideVoiceFlowIndicator();
            setTimeout(function() { showVoiceFlowIndicator('payment_mode'); }, 100);
            break;
        case 'payment_mode':
            if (typeof window.posSetPaymentMethod === 'function') {
                window.posSetPaymentMethod(cmd.mode);
                window.voicePaymentState = 2;
                showVoiceResult('💳 ' + cmd.mode);
                if (cmd.mode === 'espece') {
                    setTimeout(function() { var ai = document.getElementById('posAmountGiven'); if (ai) ai.focus(); }, 200);
                }
            }
            hideVoiceFlowIndicator();
            setTimeout(function() { showVoiceFlowIndicator('payment_amount'); }, 100);
            break;
        case 'validate': case 'finalize':
            if (window.posStep === 2 && typeof window.posFinalizeSale === 'function') window.posFinalizeSale();
            else if (window.posCart?.length > 0 && window.posStep === 1) window.posGoToStep2();
            hideVoiceFlowIndicator();
            break;
        case 'clear':
            if (typeof window.posResetCart === 'function') { window.posResetCart(); showVoiceResult('🗑️ Panier msa7'); }
            hideVoiceFlowIndicator();
            break;
        case 'next':
            if (window.posCart?.length > 0 && window.posStep === 1) window.posGoToStep2();
            hideVoiceFlowIndicator();
            break;
        case 'cancel':
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            if (typeof window.renderPOS === 'function') window.renderPOS();
            showVoiceResult('↩️ Rja3');
            hideVoiceFlowIndicator();
            break;
        case 'navigate':
            var pages = { 
                'credits': 'Crédits', 'ventes': 'Ventes', 'dashboard': 'Dashboard',
                'products': 'Produits', 'clients': 'Clients', 'commandes': 'Commandes',
                'categories': 'Catégories', 'pos': 'POS', 'depenses': 'Dépenses',
                'statistiques': 'Statistiques', 'options': 'Options'
            };
            if (typeof navigateTo === 'function') {
                navigateTo(cmd.page);
                showVoiceResult('📍 ' + (pages[cmd.page] || cmd.page));
            }
            hideVoiceFlowIndicator();
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
    if (!navigator.onLine) { alert('⚠️ Khassek internet'); return; }
    if (isRecording) { posStopVoiceSearch(); return; }
    requestMicrophonePermission().then(function(p) {
        if (!p) { alert('❌ Micro mamounch'); return; }
        posStartVoiceRecording();
    });
}

function posStartVoiceRecording() {
    var mb = document.getElementById('posMicBtn');
    if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('❌ Makaynch reconnaissance vocale'); return; }
    voiceRecognition = new SR();
    voiceRecognition.lang = 'ar-MA';                // Arabe marocain
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.maxAlternatives = 1;

    if (mb) {
        mb.classList.add('recording');
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
        var cp = document.getElementById('pageTitle')?.textContent || '';

        // Crédits
        if (cp === 'Crédits') {
            var vd = document.getElementById('creditsVoiceDisplay');
            var searchInput = document.getElementById('creditsSearchInput');
            var periodSelect = document.getElementById('creditsPeriodSelect');
            if (vd && searchInput && periodSelect) {
                if (final) {
                    var period = detectPeriodFilter(final);
                    if (period !== null) {
                        periodSelect.value = period;
                        window.creditsPeriod = period;
                        window.currentPages.credits = 1;
                        if (typeof loadCredits === 'function') loadCredits();
                        else if (typeof applyCreditsFilters === 'function') applyCreditsFilters();
                        showVoiceResult('📅 ' + final);
                    } else {
                        searchInput.value = final;
                        vd.value = final;
                        window.creditsSearch = final;
                        window.currentPages.credits = 1;
                        if (typeof loadCredits === 'function') loadCredits();
                        else if (typeof applyCreditsFilters === 'function') applyCreditsFilters();
                        showVoiceResult('👤 ' + final);
                    }
                    showProcessingIndicator();
                    var cmd = parseVoiceCommand(final);
                    if (cmd.type !== 'ignore') handleVoiceCommand(cmd);
                    hideVoiceFlowIndicator();
                } else if (interim && interim !== lastInterim) {
                    searchInput.value = interim + ' ✍️';
                    vd.value = interim + ' ✍️';
                    lastInterim = interim;
                }
            }
        }
        // Ventes
        else if (cp === 'Ventes') {
            var vd2 = document.getElementById('ventesVoiceDisplay');
            var searchInput = document.getElementById('ventesSearchInput');
            var periodSelect = document.getElementById('ventesPeriodSelect');
            if (vd2 && searchInput && periodSelect) {
                if (final) {
                    var period = detectPeriodFilter(final);
                    if (period !== null) {
                        periodSelect.value = period;
                        window.ventesPeriod = period;
                        window.currentPages.ventes = 1;
                        if (typeof loadVentes === 'function') loadVentes();
                        else if (typeof applyVentesFilters === 'function') applyVentesFilters();
                        showVoiceResult('📅 ' + final);
                    } else {
                        searchInput.value = final;
                        vd2.value = final;
                        window.ventesSearch = final;
                        window.currentPages.ventes = 1;
                        if (typeof loadVentes === 'function') loadVentes();
                        else if (typeof applyVentesFilters === 'function') applyVentesFilters();
                        showVoiceResult('👤 ' + final);
                    }
                    showProcessingIndicator();
                    var cmd = parseVoiceCommand(final);
                    if (cmd.type !== 'ignore') handleVoiceCommand(cmd);
                    hideVoiceFlowIndicator();
                } else if (interim && interim !== lastInterim) {
                    searchInput.value = interim + ' ✍️';
                    vd2.value = interim + ' ✍️';
                    lastInterim = interim;
                }
            }
        }
        // Produits (admin)
        else if (cp === 'Produits') {
            var pi = document.getElementById('productSearchInput');
            if (pi) {
                if (final) {
                    pi.value = final;
                    window.productSearchQuery = final.toLowerCase().trim();
                    if (typeof renderProductsTable === 'function') renderProductsTable();
                    var cmd = parseVoiceCommand(final);
                    if (cmd.type !== 'ignore') handleVoiceCommand(cmd);
                    hideVoiceFlowIndicator();
                    showVoiceResult('🔍 ' + final);
                } else if (interim && interim !== lastInterim) {
                    pi.value = interim + ' ✍️';
                    lastInterim = interim;
                }
            }
        }
        // POS
        else {
            var si = document.getElementById('posSearchInput');
            if (si) {
                if (final) {
                    var lowerFinal = final.toLowerCase().trim();
                    // Redirection crédits si mentionné
                    if (lowerFinal.includes('crédit') || lowerFinal.includes('dette') || lowerFinal.includes('dayn') || lowerFinal.includes('impayés')) {
                        if (typeof navigateTo === 'function') {
                            navigateTo('credits');
                        }
                        showVoiceResult('📍 Crédits');
                        lastInterim = '';
                        si.value = '';
                        return;
                    }
                    si.value = final;
                    var event = new Event('input', { bubbles: true });
                    si.dispatchEvent(event);
                    showProcessingIndicator();
                    var cmd = parseVoiceCommand(final);
                    if (cmd.type !== 'ignore') handleVoiceCommand(cmd);
                    hideVoiceFlowIndicator();
                } else if (interim && interim !== lastInterim) {
                    si.value = interim + ' ✍️';
                    lastInterim = interim;
                }
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
        if (e.error === 'network') showVoiceResult('❌ Problème réseau');
        posStopVoiceSearch();
    };

    try {
        voiceRecognition.start();
        isRecording = true;
        showVoiceModeIndicator();
        showVoiceResult('🎤 Sma3...');
        showVoiceFlowIndicator('product');
    } catch (e) {
        isRecording = false;
        if (mb) {
            mb.classList.remove('recording');
            mb.innerHTML = '<i class="fas fa-microphone"></i>';
            mb.style.background = '#dcfce7'; mb.style.borderColor = '#16a34a';
        }
    }
}

function posStopVoiceSearch() {
    if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
    isRecording = false;
    var mb = document.getElementById('posMicBtn'), si = document.getElementById('posSearchInput');
    if (mb) {
        mb.classList.remove('recording');
        mb.innerHTML = '<i class="fas fa-microphone"></i>';
        mb.style.background = '#dcfce7'; mb.style.borderColor = '#16a34a';
    }
    if (si) {
        si.placeholder = '🔍 Qelleb...';
        si.style.background = '#fff';
        si.style.borderColor = '#e2e8f0';
    }
    hideVoiceFlowIndicator();
    showVoiceResult('🎤 Micro tfi');
}

// ========== EXPORTS ==========
window.posToggleVoiceSearch = posToggleVoiceSearch;
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
    showVoiceModeIndicator();
    hideVoiceFlowIndicator();
    setTimeout(function() { showVoiceFlowIndicator('quantity'); }, 100);
};
window.buildClientIndex = buildClientIndex;
window.buildProductIndex = buildProductIndex;
window.buildProductAdminIndex = function() {}; // non utilisé en POS
window.fastFindProductAdmin = function() { return []; };

console.log('🎤 Module vocal darija – prêt');
