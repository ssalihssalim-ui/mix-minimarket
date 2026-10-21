// ==================== POS-AUDIO.JS v31 – DESCRIPTION + FUZZY + ARABE LATIN ====================
// ✅ Le texte s'écrit dans la barre SANS icône ✍️
// ✅ Recherche lancée automatiquement à chaque mot dicté (interim)
// ✅ Produit dicté → affiché dans la barre ET recherche lancée
// ✅ Après sélection d'un produit → écoute la quantité EN PRIORITÉ
// ✅ Si ce n'est pas un nombre → cherche un nouveau produit
// ✅ En étape 2, client détecté et sélectionné automatiquement
// ✅ Navigation "POS" fonctionne depuis TOUTES les pages
// ✅ Le micro affiche la barre de recherche avant de démarrer
// 🔥 CORRECTION : Navigation utilise les noms ANGLAIS (products, categories...) pour matcher admin.js
// 🔥 AJOUT : Recherche vocale sur pages Produits, Ventes, Crédits
// 🔥 CORRECTION MICRO : verrouillage window.toggleVoiceSearch pour empêcher pos.js de l'écraser
// 🔥 CORRECTION closeCreditSelection : protégé par try/catch
// 🆕 v30 : RECHERCHE FUZZY (fautes, accents) + CACHE MÉMOIRE + DEBOUNCE INTERIM
// 🆕 v31 : RECHERCHE DANS DESCRIPTION + FUZZY PAR MOT + NOMBRES ARABES LATINS

console.log('🚀 [pos-audio] Début du chargement v31...');

// 🔒 VERROUILLER window.toggleVoiceSearch DÈS LE DÉBUT pour empêcher pos.js de l'écraser plus tard
try {
    Object.defineProperty(window, 'toggleVoiceSearch', {
        value: null,
        writable: false,
        configurable: true
    });
    console.log('🔒 [pos-audio] Placeholder window.toggleVoiceSearch créé (verrouillé)');
} catch(e) {
    console.warn('⚠️ [pos-audio] Impossible de verrouiller window.toggleVoiceSearch:', e);
}

var voiceRecognition = null;
var isRecording = false;
var voiceMode = 'search';
var lastAddedProductId = null;
var voiceModeMessage = '🎤 Recherche vocale active';
var micPermissionGranted = false;
var pendingProductForQuantity = null;
var waitingForQuantity = false;

// ========== INDEX CLIENT ==========
var clientSearchIndex = {};
var clientIndexBuilt = false;

// ========== INDEX PRODUIT ==========
var productNameIndex = {};
var productIndexBuilt = false;

// ============================================================
// 🆕 v30 : CACHE MÉMOIRE DE RECHERCHE
// ============================================================
var _searchCache = {
    products: new Map(),
    clients: new Map(),
    MAX_SIZE: 200
};

function cacheGet(type, query) {
    var cache = _searchCache[type];
    if (!cache) return null;
    return cache.get(query) || null;
}

function cacheSet(type, query, result) {
    var cache = _searchCache[type];
    if (!cache) return;
    if (cache.size >= _searchCache.MAX_SIZE) {
        var firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(query, result);
}

function cacheClear(type) {
    if (type && _searchCache[type]) {
        _searchCache[type].clear();
    } else {
        _searchCache.products.clear();
        _searchCache.clients.clear();
    }
    console.log('🗑️ [CACHE] Vidé:', type || 'tout');
}

// ============================================================
// 🆕 v30 : DISTANCE DE LEVENSHTEIN (fuzzy matching)
// ============================================================
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    var matrix = [];
    for (var i = 0; i <= b.length; i++) matrix[i] = [i];
    for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// ============================================================
// 🆕 v30 : DEBOUNCE (anti-spam recherche vocale)
// ============================================================
function debounce(fn, delay) {
    var timer = null;
    return function() {
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
}

// ========== PAYMENT STATE MACHINE ==========
window.voicePaymentState = 0;

// ✅ DÉFINIR closeCreditSelection comme FALLBACK (protégé contre les erreurs)
try {
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
} catch(e) {
    console.warn('⚠️ pos-audio: impossible de définir closeCreditSelection:', e);
}

var paymentKeywords = {
    'espece': ['espèces', 'espece', 'argent', 'cash', 'comptant', 'liquide', 'espèce'],
    'credit': ['crédit', 'credit', 'à crédit', 'acredit', 'dette', 'avance', 'crédit'],
    'partiel': ['partiel', 'partielle', 'acompte', 'moitié', 'partial', 'part', 'partiel']
};

// ============================================================
// 🆕 numberMap ENRICHIE — Darija + Français + Anglais + ARABE EN LATIN
// Reconnaît les chiffres dictés phonétiquement
// Google Speech (fr-FR) transcrit toujours en caractères latins
// ============================================================
var numberMap = {
    // ============================================================
    // 1 — Wahid / Un / One / واحد
    // ============================================================
    'wahed': 1, 'wahd': 1, 'wahid': 1, 'wahad': 1, 'wahet': 1, 'waht': 1,
    'ouais': 1, 'wad': 1, 'wade': 1, 'watt': 1, 'what': 1, 'watt': 1,
    'whed': 1, 'wahedd': 1, 'wahada': 1,
    'un': 1, 'une': 1, 'hein': 1, 'ein': 1, 'ain': 1, 'in': 1, 'oeun': 1, 'euh': 1, 'an': 1,
    'one': 1, 'wan': 1, 'wane': 1, 'ouane': 1, 'ouann': 1,
    // 🆕 Arabe en latin
    'wahid': 1, 'wahida': 1, 'wahada': 1, 'wahd': 1, 'wahid': 1, 'wehed': 1, 'wehid': 1,
    'wahid': 1, 'wahd': 1, 'wahda': 1, 'wahda': 1, 'wahid': 1, 'wahed': 1,

    // ============================================================
    // 2 — Juj / Deux / Two / جوج
    // ============================================================
    'juje': 2, 'juge': 2, 'juj': 2, 'joudj': 2, 'jouj': 2, 'joue': 2, 'jog': 2,
    'zouj': 2, 'zuje': 2, 'zuj': 2, 'juj': 2, 'jude': 2,
    'george': 2, 'souche': 2, 'joss': 2, 'jausse': 2, 'chouj': 2, 'chouje': 2,
    'deux': 2, 'deu': 2, 'deuh': 2, 'deusse': 2, 'dœ': 2, 'doe': 2, 'dough': 2,
    'deux': 2, 'des': 2, 'dais': 2, 'dait': 2,
    'two': 2, 'tou': 2, 'too': 2, 'touh': 2, 'tou': 2,
    // 🆕 Arabe en latin
    'jouj': 2, 'jooj': 2, 'zouj': 2, 'zooj': 2, 'jooj': 2, 'jouje': 2, 'jouja': 2,
    'itnine': 2, 'etnine': 2, 'itnin': 2, 'tnin': 2, 'tnine': 2, 'tnayn': 2,

    // ============================================================
    // 3 — Tlata / Trois / Three / ثلاثة
    // ============================================================
    'tlata': 3, 'tleta': 3, 'tlate': 3, 'tlta': 3, 'talata': 3, 'talate': 3,
    'tléta': 3, 'tlatta': 3, 'tlaata': 3, 'tlatte': 3,
    'claud': 3, 'cl': 3, 'clé': 3, 'clea': 3, 'clay': 3, 'cle': 3, 'clee': 3,
    'play': 3, 'plet': 3, 'pley': 3, 'clode': 3, 'claude': 3,
    'trois': 3, 'troi': 3, 'troix': 3, 'troie': 3, 'trwa': 3, 'trwat': 3,
    'three': 3, 'tri': 3, 'thri': 3, 'sri': 3, 'sree': 3,
    // 🆕 Arabe en latin
    'talata': 3, 'talate': 3, 'thalatha': 3, 'thalata': 3, 'tleta': 3, 'tlate': 3,
    'tlata': 3, 'tlata': 3, 'tlett': 3, 'tlet': 3, 'tlet': 3,

    // ============================================================
    // 4 — Rbaa / Quatre / Four / أربعة
    // ============================================================
    'rbaa': 4, 'rba': 4, 'rebae': 4, 'rebah': 4, 'rebbah': 4, 'rabah': 4, 'rabbah': 4, 'raba': 4,
    'reb3a': 4, 'rba3a': 4, 'rebaa': 4, 'rbaa': 4, 'arabe': 4,
    'quatre': 4, 'quat': 4, 'katr': 4, 'kat': 4, 'catre': 4, 'katre': 4,
    'katra': 4, 'quatre': 4, 'katt': 4,
    'arba': 4, 'abba': 4, 'alba': 4, 'abat': 4, 'arbas': 4,
    'rabat': 4, 'rabats': 4, 'rebot': 4, 'reba': 4, 'rebat': 4, '@': 4,
    'four': 4, 'for': 4, 'fore': 4, 'forr': 4, 'fo': 4,
    // 🆕 Arabe en latin
    'arbaa': 4, 'arba3a': 4, 'arbaa': 4, 'rbaa': 4, 'reb3a': 4, 'arba3a': 4,
    'arb3a': 4, 'arbaa': 4, 'arba': 4, 'reba3a': 4,

    // ============================================================
    // 5 — Khamsa / Cinq / Five / خمسة
    // ============================================================
    'khamsa': 5, 'khemsa': 5, 'khmsa': 5, 'khamssa': 5, 'khamesa': 5,
    'kamsa': 5, 'kamsah': 5, 'khamssa': 5, 'khmissa': 5, 'khmousa': 5,
    'cinq': 5, 'sin': 5, 'sink': 5, 'seink': 5, 'sinc': 5, 'saink': 5,
    'hamza': 5, 'rama': 5, 'comme ça': 5, 'comme sa': 5, 'comsa': 5,
    'five': 5, 'faiv': 5, 'fayv': 5, 'faive': 5,
    // 🆕 Arabe en latin
    'khamsa': 5, 'khamssa': 5, 'khamse': 5, 'khemsa': 5, 'khamsa': 5, 'khamsah': 5,
    'khamsa': 5, 'khmsa': 5, 'khamsa': 5, 'khmissa': 5,

    // ============================================================
    // 6 — Sitta / Six / Six / ستة
    // ============================================================
    'sitta': 6, 'sita': 6, 'sitte': 6, 'setta': 6, 'sithe': 6,
    'settah': 6, 'sittah': 6, 'setta': 6, 'sitta': 6, 'tiens': 6, 'caio': 6,
    'six': 6, 'sis': 6, 'siss': 6, 'siks': 6, 'sick': 6, 'sik': 6,
    // 🆕 Arabe en latin
    'sitta': 6, 'sittah': 6, 'setta': 6, 'sitta': 6, 'seta': 6, 'sitta': 6,
    'sitta': 6, 'setta': 6, 'sittah': 6,

    // ============================================================
    // 7 — Sbaa / Sept / Seven / سبعة
    // ============================================================
    'sbaa': 7, 'sba': 7, 'seba': 7, 'sebaa': 7, 'sabaa': 7, 'sb3a': 7,
    'seb3a': 7, 'sab3a': 7, 'sba3a': 7, 'se barre': 7, 'ce bar': 7, 'barre': 7, 'c est barre': 7,   
    'sept': 7, 'sette': 7, 'set': 7, 'sebt': 7, 'say': 7, 'sette': 7,
    'seven': 7, 'sevn': 7, 'sevan': 7, 'seveun': 7, 'sevene': 7,
    // 🆕 Arabe en latin
    'sbaa': 7, 'sebaa': 7, 'seba': 7, 'sabaa': 7, 'sba3a': 7, 'seb3a': 7,
    'saba': 7, 'sba': 7, 'seba': 7, 'sbaa': 7,

    // ============================================================
    // 8 — Tmanya / Huit / Eight / ثمانية
    // ============================================================
    'tmanya': 8, 'tmnyia': 8, 'temenya': 8, 'tmanye': 8, 'tmenya': 8,
    'tmenea': 8, 'tmania': 8, 'tmenia': 8, 'tmnaya': 8,
    'huit': 8, 'wit': 8, 'huitte': 8, 'uit': 8, 'huite': 8, 'huitte': 8,
    'eight': 8, 'eit': 8, 'ate': 8, 'eyt': 8, 'eite': 8, 'eigth': 8,
    // 🆕 Arabe en latin
    'tmanya': 8, 'tmenea': 8, 'tmenya': 8, 'tmanya': 8, 'tmenia': 8, 'tmenya': 8,
    'tmenea': 8, 'tmanin': 8, 'tmenin': 8,

    // ============================================================
    // 9 — Tsaa / Neuf / Nine / تسعة
    // ============================================================
    'tsaa': 9, 'tsa': 9, 'tesa': 9, 'tisaa': 9, 'tisea': 9, 'tissaa': 9,
    'tis3a': 9, 'tes3a': 9, 'tsa3a': 9, 'tisaa': 9,
    'neuf': 9, 'nef': 9, 'noeuf': 9, 'neuffe': 9, 'neufe': 9,
    'nine': 9, 'nain': 9, 'nayn': 9, 'naine': 9,
    // 🆕 Arabe en latin
    'tsaa': 9, 'tisaa': 9, 'tes3a': 9, 'tis3a': 9, 'tsa3a': 9, 'tissaa': 9,
    'tsaa': 9, 'tisa': 9, 'tisaa': 9, 'tsa': 9,

    // ============================================================
    // 10 — Achra / Dix / Ten / عشرة
    // ============================================================
    'achra': 10, 'ashra': 10, 'aachra': 10, 'achara': 10, 'acharat': 10,
    'achr': 10, 'achre': 10, 'aachra': 10, 'hachra': 10,
    'dix': 10, 'diss': 10, 'dis': 10, 'dixe': 10, 'deece': 10, 'diss': 10,
    'ten': 10, 'tain': 10, 'teun': 10, 'tan': 10, 'tène': 10,
    // 🆕 Arabe en latin
    'achra': 10, 'aachra': 10, 'ashra': 10, 'achara': 10, 'achr': 10, 'achra': 10,
    'achra': 10, 'achr': 10, 'ashra': 10,

    // ============================================================
    // 11 — Hdach / Onze / Eleven / أحداش
    // ============================================================
    'hdach': 11, 'hedach': 11, 'hddach': 11, 'haddach': 11, 'ihdach': 11,
    'hdach': 11, 'hdache': 11, 'hedach': 11,
    'onze': 11, 'onz': 11, 'once': 11, 'onse': 11,
    'eleven': 11, 'ileven': 11, 'elevein': 11, 'elevn': 11,
    // 🆕 Arabe en latin
    'hdach': 11, 'hddach': 11, 'hedach': 11, 'haddach': 11, 'ihdach': 11,

    // ============================================================
    // 12 — Tnach / Douze / Twelve / طناش
    // ============================================================
    'tnach': 12, 'tnache': 12, 'tenache': 12, 'etnache': 12, 'tnach': 12,
    'tnach': 12, 'tnache': 12, 'tnash': 12, 'tnashe': 12,
    'douze': 12, 'douz': 12, 'douzze': 12, 'duz': 12, 'douze': 12,
    'twelve': 12, 'twelv': 12, 'twelf': 12, 'twelv': 12,
    // 🆕 Arabe en latin
    'tnach': 12, 'tnache': 12, 'tnash': 12, 'tnashe': 12,

    // ============================================================
    // 13 — Tlettach / Treize / Thirteen / تلطاش
    // ============================================================
    'tlettach': 13, 'tletach': 13, 'tlattach': 13, 'talatach': 13, 'tletaach': 13,
    'tlettach': 13, 'tlettache': 13, 'tletache': 13,
    'treize': 13, 'trez': 13, 'treize': 13, 'treise': 13,
    'thirteen': 13, 'thirtin': 13, 'surtin': 13, 'thirteun': 13,

    // ============================================================
    // 14 — Rbatach / Quatorze / Fourteen / ربعطاش
    // ============================================================
    'rbatach': 14, 'rebatach': 14, 'rabatach': 14, 'rbattach': 14,
    'rbatache': 14, 'rbatache': 14, 'rebatache': 14,
    'quatorze': 14, 'katorz': 14, 'katourze': 14, 'catorze': 14,
    'fourteen': 14, 'fortin': 14, 'fortine': 14, 'forteun': 14,

    // ============================================================
    // 15 — Khmestach / Quinze / Fifteen / خمستاش
    // ============================================================
    'khmestach': 15, 'khamestach': 15, 'khmostach': 15, 'khmestache': 15, 'khamstach': 15,
    'khmestache': 15, 'khamstache': 15, 'khmestach': 15,
    'quinze': 15, 'kinz': 15, 'kins': 15, 'kinze': 15, 'quinze': 15,
    'fifteen': 15, 'fiftin': 15, 'fiftine': 15, 'fifteun': 15,

    // ============================================================
    // 16 — Settach / Seize / Sixteen / ستاش
    // ============================================================
    'settach': 16, 'setach': 16, 'sittach': 16, 'settache': 16, 'settaach': 16,
    'settache': 16, 'sittache': 16, 'settach': 16,
    'seize': 16, 'sez': 16, 'seize': 16, 'seise': 16,
    'sixteen': 16, 'sixtin': 16, 'sikstin': 16, 'sixteun': 16,

    // ============================================================
    // 17 — Sbatach / Dix-sept / Seventeen / سبعتاش
    // ============================================================
    'sbatach': 17, 'sbetach': 17, 'sebatach': 17, 'sabatach': 17, 'sbattach': 17,
    'sbatache': 17, 'sebatache': 17, 'sbattach': 17,
    'dix-sept': 17, 'diset': 17, 'disett': 17, 'disette': 17, 'disset': 17,
    'seventeen': 17, 'seventin': 17, 'sevntin': 17, 'seventeun': 17,

    // ============================================================
    // 18 — Tmentach / Dix-huit / Eighteen / تمنطاش
    // ============================================================
    'tmentach': 18, 'tmantach': 18, 'tmentache': 18, 'tmantache': 18, 'temnatach': 18,
    'tmentache': 18, 'tmantache': 18, 'tmentach': 18,
    'dix-huit': 18, 'dizuit': 18, 'dizwit': 18, 'dizuite': 18, 'dizuit': 18,
    'eighteen': 18, 'eigtin': 18, 'eitine': 18, 'eighteun': 18,

    // ============================================================
    // 19 — Tseâtach / Dix-neuf / Nineteen / تسعطاش
    // ============================================================
    'tseâtach': 19, 'tsatach': 19, 'tesatach': 19, 'tisatach': 19, 'tsattach': 19,
    'tseâtache': 19, 'tsatache': 19, 'tisatache': 19,
    'dix-neuf': 19, 'diznef': 19, 'diznoeuf': 19, 'dizneufe': 19,
    'nineteen': 19, 'naintin': 19, 'nayntin': 19, 'nineteun': 19,

    // ============================================================
    // 20 — Achrin / Vingt / Twenty / عشرين
    // ============================================================
    'achrin': 20, 'achrine': 20, 'ashrin': 20, 'aachrin': 20, 'achroun': 20,
    'achrinne': 20, 'achrin': 20,
    'vingt': 20, 'vin': 20, 'vain': 20, 'vink': 20, 'ving': 20, 'vingte': 20,
    'twenty': 20, 'twenti': 20, 'twent': 20, 'twente': 20,
    // 🆕 Arabe en latin
    'achrin': 20, 'achrine': 20, 'ashrin': 20, 'aachrin': 20, 'achroun': 20,

    // ============================================================
    // 25 — Khamsa w Achrin / Vingt-cinq
    // ============================================================
    'khamsa w achrin': 25, 'khamsa w achrine': 25, 'khamsa wa achrin': 25,
    'vingt-cinq': 25, 'vinsink': 25, 'vintsin': 25, 'vingtsink': 25,
    'twenty-five': 25, 'twentyfive': 25, 'twenntifaiv': 25,

    // ============================================================
    // 30 — Tlatin / Trente / Thirty / ثلاثين
    // ============================================================
    'tlatin': 30, 'tlatine': 30, 'talatin': 30, 'talatine': 30,
    'tlatinne': 30, 'tlatine': 30,
    'trente': 30, 'trent': 30, 'trant': 30, 'trente': 30, 'trentte': 30,
    'thirty': 30, 'thirti': 30, 'surti': 30, 'thirte': 30,
    // 🆕 Arabe en latin
    'tlatin': 30, 'talatin': 30, 'tlatine': 30, 'talatine': 30,

    // ============================================================
    // 40 — Rbaâin / Quarante / Forty / أربعين
    // ============================================================
    'rbaâin': 40, 'rbain': 40, 'rbaîne': 40, 'reba3ine': 40, 'arba3in': 40,
    'rbaine': 40, 'rbaine': 40, 'rebaine': 40,
    'quarante': 40, 'karant': 40, 'karante': 40, 'quarant': 40, 'karantte': 40,
    'forty': 40, 'forti': 40, 'foti': 40, 'forte': 40,
    // 🆕 Arabe en latin
    'rbain': 40, 'rba3ine': 40, 'arba3in': 40, 'rbaine': 40,

    // ============================================================
    // 50 — Khamsin / Cinquante / Fifty / خمسين
    // ============================================================
    'khamsin': 50, 'khamsine': 50, 'khemsin': 50, 'khamssine': 50,
    'khamsinne': 50, 'khamsine': 50,
    'cinquante': 50, 'sinkant': 50, 'sinkante': 50, 'cincant': 50, 'sinkantte': 50,
    'fifty': 50, 'fifti': 50, 'fift': 50, 'fifte': 50,
    // 🆕 Arabe en latin
    'khamsin': 50, 'khamsine': 50, 'khemsin': 50, 'khamssine': 50,

    // ============================================================
    // 60 — Sittin / Soixante / Sixty / ستين
    // ============================================================
    'sittin': 60, 'sittine': 60, 'sitine': 60, 'settin': 60, 'setine': 60,
    'sittinne': 60, 'sittine': 60,
    'soixante': 60, 'soisant': 60, 'soissante': 60, 'swasant': 60, 'soixantte': 60,
    'sixty': 60, 'siksti': 60, 'sikst': 60, 'sikste': 60,
    // 🆕 Arabe en latin
    'sittin': 60, 'sittine': 60, 'sitine': 60, 'settin': 60,

    // ============================================================
    // 70 — Sbaâin / Soixante-dix / Seventy / سبعين
    // ============================================================
    'sbaâin': 70, 'sbain': 70, 'seba3ine': 70, 'sebain': 70, 'sab3in': 70,
    'sbaine': 70, 'sbainne': 70, 'sebaine': 70,
    'soixante-dix': 70, 'soisantdis': 70, 'soixantedis': 70,
    'seventy': 70, 'seventi': 70, 'sevnti': 70, 'sevente': 70,
    // 🆕 Arabe en latin
    'sbain': 70, 'sba3ine': 70, 'sebain': 70, 'sab3in': 70,

    // ============================================================
    // 80 — Tmanin / Quatre-vingts / Eighty / ثمانين
    // ============================================================
    'tmanin': 80, 'tmanine': 80, 'tmenin': 80, 'tmanyin': 80,
    'tmaninne': 80, 'tmanine': 80,
    'quatre-vingts': 80, 'katrvin': 80, 'katrvin': 80, 'catrevin': 80, 'katrvingt': 80,
    'eighty': 80, 'eiti': 80, 'eit': 80, 'eigte': 80,
    // 🆕 Arabe en latin
    'tmanin': 80, 'tmanine': 80, 'tmenin': 80, 'tmanyin': 80,

    // ============================================================
    // 90 — Tsâin / Quatre-vingt-dix / Ninety / تسعين
    // ============================================================
    'tsâin': 90, 'tsain': 90, 'tes3ine': 90, 'tissain': 90, 'tisa3ine': 90,
    'tsaine': 90, 'tsainne': 90, 'tesaine': 90,
    'quatre-vingt-dix': 90, 'katrvindis': 90, 'quatrevingtdis': 90,
    'ninety': 90, 'nainti': 90, 'naynnti': 90, 'nainte': 90,
    // 🆕 Arabe en latin
    'tsain': 90, 'tsa3ine': 90, 'tisain': 90, 'tisa3ine': 90,

    // ============================================================
    // 100 — Mïa / Cent / Hundred / مية
    // ============================================================
    'mia': 100, 'meya': 100, 'miya': 100, 'miat': 100, 'miyat': 100,
    'miaa': 100, 'meyya': 100, 'miyya': 100, 'miya': 100,
    'cent': 100, 'san': 100, 'sant': 100, 'sente': 100, 'sente': 100,
    'hundred': 100, 'handred': 100, 'hundred': 100, 'handrede': 100,
    // 🆕 Arabe en latin
    'mia': 100, 'meya': 100, 'miya': 100, 'miat': 100, 'miyat': 100,
    'miaa': 100, 'meyya': 100, 'miyya': 100, 'miya': 100,

    // ============================================================
    // 200 — Mïatayn / Deux cents / ميتين
    // ============================================================
    'miatayn': 200, 'meyatayn': 200, 'miyatayn': 200, 'miataine': 200,
    'deux cents': 200, 'deusan': 200, 'deuxsan': 200, 'deusente': 200,
    'two hundred': 200, 'touhandred': 200,
    // 🆕 Arabe en latin
    'miatayn': 200, 'meyatayn': 200, 'miyatayn': 200, 'miataine': 200,

    // ============================================================
    // 500 — Khams mïa / Cinq cents / خمسمية
    // ============================================================
    'khams mia': 500, 'khamsa mia': 500, 'khamsamiya': 500,
    'cinq cents': 500, 'sinksan': 500, 'sinksente': 500,
    'five hundred': 500, 'faivhandred': 500,
    // 🆕 Arabe en latin
    'khams mia': 500, 'khamsa mia': 500, 'khamsamiya': 500, 'khamsmiya': 500,

    // ============================================================
    // 1000 — Alf / Mille / Thousand / ألف
    // ============================================================
    'alf': 1000, 'alef': 1000, 'alffe': 1000, 'aalf': 1000,
    'alfa': 1000, 'alfe': 1000,
    'mille': 1000, 'mil': 1000, 'mille': 1000, 'mille': 1000,
    'thousand': 1000, 'tauzand': 1000, 'thauzend': 1000, 'tauzande': 1000,
    // 🆕 Arabe en latin
    'alf': 1000, 'alef': 1000, 'alffe': 1000, 'aalf': 1000, 'alfa': 1000, 'alfe': 1000,

    // ============================================================
    // Ordinaux (utiles pour dialogues)
    // ============================================================
    'premier': 1, 'première': 1, 'first': 1, 'premie': 1,
    'deuxième': 2, 'second': 2, 'seconde': 2, 'deuxieme': 2,
    'troisième': 3, 'third': 3, 'troisieme': 3,
    'quatrième': 4, 'fourth': 4, 'quatrieme': 4,
    'cinquième': 5, 'fifth': 5, 'cinquieme': 5,
    'sixième': 6, 'sixth': 6, 'sixieme': 6,
    'septième': 7, 'seventh': 7, 'septieme': 7,
    'huitième': 8, 'eighth': 8, 'huitieme': 8,
    'neuvième': 9, 'ninth': 9, 'neuvieme': 9,
    'dixième': 10, 'tenth': 10, 'dixieme': 10
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
    window._voiceTimeout = setTimeout(function() { el.style.display = 'none'; }, 3000);
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
        'product': 'Dites le nom du produit', 
        'quantity': '🔢 Dites la quantité (ex: 2, 3, 5...)', 
        'payment_mode': 'Mode de paiement ?', 
        'payment_amount': 'Montant donné ?' 
    };
    if (labels[phase]) showVoiceResult(labels[phase]);
}
function showProcessingIndicator() {}

// ========== UTILITAIRES ==========
function escapeHtml(str) { return str ? str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]) : ''; }
function isIOSStandalone() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches); }
function checkVoiceSupport() { var i = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; if (i && isIOSStandalone()) return { supported: false, reason: 'Ouvrez dans Safari' }; if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return { supported: false, reason: 'Non supporté' }; return { supported: true }; }
async function requestMicrophonePermission() { if (micPermissionGranted) return true; try { if (!navigator.mediaDevices?.getUserMedia) return false; const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(t => t.stop()); micPermissionGranted = true; return true; } catch (e) { return false; } }

// ========== INDEX CLIENT (AVEC DESCRIPTION) ==========
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
    cacheClear('clients');
    console.log('📇 Index client construit avec ' + window.posAllClients.length + ' clients');
}

// ============================================================
// 🆕 v30 : RECHERCHE INTELLIGENTE DE CLIENTS
// ============================================================
function fastFindClient(query) {
    buildClientIndex();
    if (!query) return window.posAllClients?.slice() || [];
    
    var cached = cacheGet('clients', query);
    if (cached) {
        console.log('⚡ [CACHE] Clients trouvés instantanément:', query);
        return cached;
    }
    
    var cleaned = query.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim();
    
    if (!cleaned) return [];
    
    var mots = cleaned.split(/[\s,;.]+/).filter(function(m) { return m.length >= 2; });
    if (mots.length === 0) return [];
    
    var scores = {};
    
    (window.posAllClients || []).forEach(function(c) {
        if (!c || !c.id) return;
        var nomComplet = ((c.nom || '') + ' ' + (c.prenom || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var tel = (c.telephone || '').replace(/\D/g, '');
        var desc = (c.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var score = 0;
        
        mots.forEach(function(mot) {
            if (nomComplet.startsWith(mot)) score += 100;
            else if (new RegExp('\\b' + mot + '\\b').test(nomComplet)) score += 80;
            else if (nomComplet.indexOf(mot) !== -1) score += 50;
            else {
                var parts = nomComplet.split(/\s+/);
                parts.forEach(function(part) {
                    var d = levenshteinDistance(mot, part);
                    if (d <= 2) score += (30 - d * 10);
                });
            }
            if (/^\d+$/.test(mot) && tel.indexOf(mot) !== -1) score += 90;
            if (desc.indexOf(mot) !== -1) score += 30;
        });
        
        if (score > 0) scores[c.id] = { client: c, score: score };
    });
    
    var results = Object.values(scores)
        .sort(function(a, b) { return b.score - a.score; })
        .map(function(s) { return s.client; });
    
    cacheSet('clients', query, results);
    return results;
}

function invalidateClientIndex() {
    clientIndexBuilt = false;
    clientSearchIndex = {};
    cacheClear('clients');
}

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
    cacheClear('products');
}

// ============================================================
// 🆕 v31 : RECHERCHE INTELLIGENTE DE PRODUITS
// ✅ Recherche dans nom + description + brand + categories
// ✅ Fuzzy amélioré : compare avec CHAQUE MOT (pas juste le début)
// ============================================================
function fastFindProduct(query) {
    buildProductIndex();
    if (!query || query.length < 2) return [];
    
    var cached = cacheGet('products', query);
    if (cached) {
        console.log('⚡ [CACHE] Produits trouvés instantanément:', query);
        return cached;
    }
    
    var cleaned = query.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim();
    
    if (!cleaned) return [];
    
    var mots = cleaned.split(/[\s,;.]+/).filter(function(m) { return m.length >= 2; });
    if (mots.length === 0) return [];
    
    var scores = {};
    
    (window.posProductsList || []).forEach(function(p) {
        if (!p.nom) return;
        
        // 🆕 v31 : Préparer TOUS les champs (normalisés)
        var nomNorm = p.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var descNorm = (p.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var brandNorm = (p.brand || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var catNorm = (p.categorie || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var catsArrNorm = (p.categories || []).map(function(c) { return c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }).join(' ');
        
        // 🆕 v31 : Découper chaque champ en mots (pour fuzzy mot à mot)
        var nomMots = nomNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });
        var descMots = descNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });
        var brandMots = brandNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });
        var catMots = (catNorm + ' ' + catsArrNorm).split(/\s+/).filter(function(m) { return m.length >= 3; });
        
        var score = 0;
        
        mots.forEach(function(mot) {
            // ============ NOM (poids ×3) ============
            if (nomNorm.startsWith(mot)) score += 100;
            else if (new RegExp('\\b' + mot + '\\b').test(nomNorm)) score += 80;
            else if (nomNorm.indexOf(mot) !== -1) score += 50;
            else {
                // 🆕 v31 : Fuzzy avec CHAQUE MOT du nom
                nomMots.forEach(function(motCible) {
                    var distance = levenshteinDistance(mot, motCible);
                    var seuil = Math.max(2, Math.floor(mot.length * 0.3));
                    if (distance <= seuil) score += (30 - distance * 8);
                });
            }
            
            // ============ DESCRIPTION (poids ×2) 🆕 v31 ============
            if (descNorm.length > 0) {
                if (new RegExp('\\b' + mot + '\\b').test(descNorm)) score += 60;
                else if (descNorm.indexOf(mot) !== -1) score += 40;
                else {
                    descMots.forEach(function(motCible) {
                        var distance = levenshteinDistance(mot, motCible);
                        var seuil = Math.max(2, Math.floor(mot.length * 0.3));
                        if (distance <= seuil) score += (20 - distance * 5);
                    });
                }
            }
            
            // ============ BRAND (poids ×1.5) 🆕 v31 ============
            if (brandNorm.length > 0) {
                if (new RegExp('\\b' + mot + '\\b').test(brandNorm)) score += 45;
                else if (brandNorm.indexOf(mot) !== -1) score += 30;
                else {
                    brandMots.forEach(function(motCible) {
                        var distance = levenshteinDistance(mot, motCible);
                        if (distance <= 2) score += (15 - distance * 5);
                    });
                }
            }
            
            // ============ CATÉGORIES (poids ×1.5) 🆕 v31 ============
            if (catNorm.length > 0 || catsArrNorm.length > 0) {
                if (new RegExp('\\b' + mot + '\\b').test(catNorm + ' ' + catsArrNorm)) score += 45;
                else if ((catNorm + ' ' + catsArrNorm).indexOf(mot) !== -1) score += 30;
                else {
                    catMots.forEach(function(motCible) {
                        var distance = levenshteinDistance(mot, motCible);
                        if (distance <= 2) score += (15 - distance * 5);
                    });
                }
            }
        });
        
        // Bonus produit disponible
        if (p.disponible !== false) score += 5;
        
        // Malus si stock épuisé
        if (p.stock !== undefined && p.stock <= 0) score -= 20;
        
        if (score > 0) scores[p.id] = { product: p, score: score };
    });
    
    var results = Object.values(scores)
        .sort(function(a, b) { return b.score - a.score; })
        .map(function(s) { return s.product; });
    
    cacheSet('products', query, results);
    return results;
}

// ========== COMMANDES ==========
// ============================================================
// 🆕 v31 : EXTRACTION NOMBRE — Support arabe-latin + arabe natif + harakat
// ============================================================
function extractNumberFromTranscript(transcript) {
    var cleaned = transcript.toLowerCase().trim();
    
    // 🆕 v31 : Convertir les chiffres arabes (٠١٢٣٤٥٦٧٨٩) en chiffres latins
    var ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    cleaned = cleaned.replace(/[٠-٩]/g, function(d) {
        var idx = ARABIC_DIGITS.indexOf(d);
        return idx >= 0 ? idx.toString() : d;
    });
    
    // 🆕 v31 : Retirer les harakat arabes (accents) : ً ٌ ٍ َ ُ ِ ّ ْ
    cleaned = cleaned.replace(/[\u064B-\u065F\u0670]/g, '');
    
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Chercher les chiffres 0-9 (après conversion arabe)
    const digits = cleaned.match(/\b\d+\b/);
    if (digits) return parseInt(digits[0]);
    
    const sortedKeys = Object.keys(numberMap).sort(function(a, b) { return b.length - a.length; });
    const words = cleaned.split(/[\s,;.!?]+/).filter(function(w) { return w.length > 0; });
    for (let w = 0; w < words.length; w++) {
        const mot = words[w];
        for (let i = 0; i < sortedKeys.length; i++) {
            if (mot === sortedKeys[i]) {
                return numberMap[sortedKeys[i]];
            }
        }
    }
    for (let i = 0; i < sortedKeys.length; i++) {
        const word = sortedKeys[i];
        const regex = new RegExp('(^|[\\s,;.!?])' + word + '($|[\\s,;.!?])', 'i');
        if (regex.test(cleaned)) {
            return numberMap[word];
        }
    }
    return null;
}

function detectPeriodFilter(transcript) {
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var periodKeywords = {
        'today': ['aujourdhui', 'aujourd hui', 'today', 'ajourdhui', 'aujourd', 'ce jour', 'jour'],
        '7': ['semaine', '7 jours', 'sept jours', 'cette semaine', 'ces jours'],
        '30': ['mois', 'ce mois', '30 jours', 'trente jours', 'mensuel'],
        '365': ['année', 'an', '365 jours', 'ce an', 'cette année', 'annee', 'cette annee'],
        'all': ['tout', 'toutes', 'all', 'tous', 'total', 'général', 'general']
    };
    for (var period in periodKeywords) {
        if (periodKeywords[period].some(function(kw) { return cleaned.includes(kw); })) {
            return period;
        }
    }
    return null;
}

function detectCategoryFilter(transcript) {
    if (!window.allCategoriesData || !Array.isArray(window.allCategoriesData)) return null;
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var i = 0; i < window.allCategoriesData.length; i++) {
        var catName = (window.allCategoriesData[i].nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (catName && cleaned.includes(catName)) {
            return window.allCategoriesData[i].nom;
        }
    }
    return null;
}

// ========== PARSE VOICE COMMAND ==========
function parseVoiceCommand(transcript) {
    var cleaned = transcript.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var currentPage = document.getElementById('pageTitle')?.textContent || '';
    var posStep = window.posStep || 1;

    console.log('🔍 Parsing commande:', cleaned);
    console.log('📄 Page actuelle:', currentPage);
    console.log('📌 PosStep:', posStep);
    console.log('🔢 En attente de quantité:', waitingForQuantity, 'Produit:', pendingProductForQuantity);

    // ============================================================
    // 🔥 PRIORITÉ ABSOLUE : MODE QUANTITÉ
    // ============================================================
    
    if (waitingForQuantity && pendingProductForQuantity) {
        var num = extractNumberFromTranscript(cleaned);
        if (num !== null && num > 0) {
            console.log('✅ [PRIORITÉ] Quantité détectée:', num, 'pour produit:', pendingProductForQuantity);
            return { 
                type: 'quantity', 
                value: num, 
                productId: pendingProductForQuantity 
            };
        }
        
        var newProducts = fastFindProduct(cleaned);
        if (newProducts.length > 0 && newProducts[0].id !== pendingProductForQuantity) {
            console.log('🔄 [PRIORITÉ] Nouveau produit détecté, on abandonne la quantité en cours');
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
        } else if (cleaned.length > 0 && !cleaned.includes('annule') && !cleaned.includes('cancel')) {
            console.log('🔄 [PRIORITÉ] Pas un nombre ni un produit connu, on abandonne la quantité');
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
        }
    }

    // ============================================================
    // 🔥 PAGE PRODUITS - recherche produit ou filtre catégorie
    // ============================================================
    if (currentPage === 'Produits') {
        var catFilter = detectCategoryFilter(cleaned);
        if (catFilter) {
            console.log('✅ [PRODUITS] Catégorie détectée:', catFilter);
            return { type: 'filter_products_category', category: catFilter };
        }
        if (cleaned.length > 1) {
            return { type: 'search_products_page', text: cleaned };
        }
        return { type: 'ignore' };
    }

    // ============================================================
    // 🔥 PAGE VENTES - recherche client ou filtre période
    // ============================================================
    if (currentPage === 'Ventes') {
        var periodV = detectPeriodFilter(cleaned);
        if (periodV !== null) {
            console.log('✅ [VENTES] Période détectée:', periodV);
            return { type: 'period_filter_ventes', period: periodV };
        }
        if (cleaned.length > 1) {
            return { type: 'search_ventes', text: cleaned };
        }
        return { type: 'ignore' };
    }

    // ============================================================
    // 🔥 PAGE CRÉDITS - recherche client ou filtre période
    // ============================================================
    if (currentPage === 'Crédits') {
        var periodC = detectPeriodFilter(cleaned);
        if (periodC !== null) {
            console.log('✅ [CRÉDITS] Période détectée:', periodC);
            return { type: 'period_filter_credits', period: periodC };
        }
        if (cleaned.length > 1) {
            return { type: 'search_credits', text: cleaned };
        }
        return { type: 'ignore' };
    }

    // ============================================================
    // PRIORITÉ 1 : NAVIGATION (TOUTES LES PAGES)
    // ============================================================
    
    if (posStep !== 2) {
        var navWords = {
            'pos': ['pos', 'caisse', 'point de vente', 'vente directe', 'retour pos', 'aller pos', 'ouvrir pos', 'lancer pos', 'caissier'],
            'credits': ['credits', 'credit', 'crédit', 'impayes', 'impaye', 'dettes', 'dette', 'creance', 'creances', 'liste credits', 'liste crédits', 'voir credits'],
            'ventes': ['ventes', 'vente', 'recettes', 'recette', 'chiffre', 'liste ventes', 'voir ventes'],
            'dashboard': ['dashboard', 'accueil', 'tableau de bord', 'tableau', 'bord', 'home', 'acceuil'],
            'clients': ['clients', 'client', 'cliente', 'clientel', 'liste clients', 'voir clients'],
            'commandes': ['commandes', 'commande', 'en ligne', 'online', 'liste commandes', 'voir commandes'],
            'depenses': ['dépenses', 'depenses', 'dépense', 'charges', 'charge', 'liste depenses', 'voir depenses'],
            'statistiques': ['statistiques', 'stat', 'stats', 'analyses', 'analyse', 'voir statistiques'],
            'products': ['produits', 'produit', 'catalogue', 'stock', 'marchandise', 'liste produits', 'voir produits'],
            'fournisseurs': ['fournisseurs', 'fournisseur', 'fournitures', 'liste fournisseurs', 'voir fournisseurs'],
            'categories': ['categories', 'categorie', 'categoriel', 'cat', 'liste categories', 'voir categories', 'catégorie', 'catégories']
        };

        for (var page in navWords) {
            var keywords = navWords[page];
            for (var i = 0; i < keywords.length; i++) {
                if (cleaned.includes(keywords[i])) {
                    console.log('✅ Navigation détectée vers:', page);
                    waitingForQuantity = false;
                    pendingProductForQuantity = null;
                    setVoiceMode('search', '🎤 Recherche vocale active', null);
                    return { type: 'navigate', page: page };
                }
            }
        }
    }

    // ============================================================
    // PRIORITÉ 2 : DÉTECTION DES PÉRIODES (fallback général)
    // ============================================================
    
    var period = detectPeriodFilter(cleaned);
    if (period !== null) {
        console.log('✅ Période détectée:', period);
        return { type: 'period_filter', period: period };
    }

    // ============================================================
    // PRIORITÉ 4 : RECHERCHE DE PRODUITS (étape 1 POS)
    // ============================================================
    
    if (posStep === 1 && (currentPage === 'POS' || currentPage === 'Dashboard' || currentPage === '')) {
        
        if (cleaned.includes('valide') || cleaned.includes('valider') || 
            cleaned.includes('payer') || cleaned.includes('paie')) {
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            return { type: 'validate' };
        }
        
        if (cleaned.includes('annule') || cleaned.includes('annuler') || cleaned.includes('cancel')) {
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            return { type: 'cancel' };
        }
        
        if (cleaned.includes('vider') || cleaned.includes('efface') || 
            cleaned.includes('vide') || cleaned.includes('clear')) {
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            return { type: 'clear' };
        }
        
        var products = fastFindProduct(cleaned);
        if (products.length > 0) {
            console.log('✅ Produit trouvé:', products[0].nom);
            return { 
                type: 'search_product', 
                product: products[0], 
                products: products, 
                text: cleaned, 
                page: 'pos' 
            };
        }
        
        if (cleaned.length > 1) {
            return { type: 'search_text', text: cleaned, page: 'pos' };
        }
    }

    // ============================================================
    // 🔥 PRIORITÉ 5 : PAIEMENT (étape 2)
    // ============================================================
    
    if ((currentPage === 'POS' || currentPage === 'Dashboard') && posStep === 2) {
        
        var clientAlreadySelected = window.posCurrentClient && window.posCurrentClient.id;
        
        if (!clientAlreadySelected) {
            var clients = fastFindClient(cleaned);
            if (clients.length >= 1) {
                var client = clients[0];
                console.log('✅ [PAIEMENT] Client trouvé:', client.nom, client.prenom);
                return { type: 'client', client: client, searchText: cleaned };
            }
            console.log('⚠️ [PAIEMENT] Aucun client trouvé, on attend un nom de client');
            return { type: 'ignore' };
        }
        
        var pm = detectPaymentMode(cleaned);
        if (pm) {
            console.log('✅ [PAIEMENT] Mode paiement détecté:', pm);
            return { type: 'payment_mode', mode: pm };
        }
        
        if (cleaned.includes('valide') || cleaned.includes('finaliser') || 
            cleaned.includes('terminer') || cleaned.includes('payer')) {
            return { type: 'validate' };
        }
        
        var amount = extractNumberFromTranscript(cleaned);
        if (amount !== null && amount > 0) {
            console.log('✅ [PAIEMENT] Montant détecté:', amount);
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

// ========== HANDLE COMMAND ==========
function handleVoiceCommand(cmd) {
    console.log('🎯 Exécution commande:', cmd.type, cmd);

    switch (cmd.type) {
        case 'search_product':
        case 'search_text':
            var dictedText = cmd.text || (cmd.product ? cmd.product.nom : '');
            console.log('🔍 Texte dicté:', dictedText);
            
            var searchInput = document.getElementById('posSearchInput');
            if (!searchInput) {
                searchInput = document.querySelector('#posSearchInput, input[type="text"][placeholder*="Rechercher"], input[placeholder*="Rechercher"]');
            }
            
            if (searchInput && dictedText) {
                searchInput.value = dictedText;
                window.posSearchQuery = dictedText.toLowerCase().trim();
                
                try {
                    var inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                    searchInput.dispatchEvent(inputEvent);
                } catch(e) {
                    var event = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(event);
                }
                
                if (typeof window.posSearchProducts === 'function') {
                    console.log('✅ Lancement recherche pour:', dictedText);
                    window.posSearchProducts(dictedText);
                } else if (typeof window.filterProductGrid === 'function') {
                    window.filterProductGrid();
                }
                
                if (typeof window.updateClearButtonVisibility === 'function') {
                    window.updateClearButtonVisibility();
                }
                
                showVoiceResult('🔍 ' + dictedText);
                showVoiceFlowIndicator('product');
            }
            break;
            
        case 'quantity':
            var productId = cmd.productId;
            var quantity = cmd.value;
            
            console.log('🔢 Application quantité:', quantity, 'pour produit:', productId);
            console.log('📦 posCart actuel:', window.posCart);
            
            if (productId && quantity > 0) {
                var cartItem = null;
                if (window.posCart && Array.isArray(window.posCart)) {
                    cartItem = window.posCart.find(function(x) { return x.id === productId; });
                }
                
                if (cartItem) {
                    var product = window.posProductsList?.find(function(p) { return p.id === productId; });
                    if (product && product.stock !== undefined && quantity > product.stock) {
                        showVoiceResult('⚠️ Stock insuffisant (max: ' + product.stock + ')');
                        waitingForQuantity = false;
                        pendingProductForQuantity = null;
                        setVoiceMode('search', '🎤 Recherche vocale active', null);
                        return;
                    }
                    
                    cartItem.quantite = quantity;
                    console.log('✅ Quantité appliquée:', cartItem.quantite);
                    
                    if (typeof window.updateCartOnly === 'function') {
                        window.updateCartOnly();
                    }
                    if (typeof window.renderPOS === 'function') {
                        window.renderPOS();
                    }
                    if (typeof window.posSauvegarderDonneesPanier === 'function') {
                        window.posSauvegarderDonneesPanier(window.posCurrentCartId || 'panier1');
                    }
                    if (typeof window.posSaveMultiCarts === 'function') {
                        window.posSaveMultiCarts();
                    }
                    
                    showVoiceResult('✅ Quantité mise à jour: ' + quantity);
                } else {
                    console.warn('⚠️ Produit introuvable dans le panier:', productId);
                    showVoiceResult('⚠️ Produit non trouvé dans le panier');
                }
                
                waitingForQuantity = false;
                pendingProductForQuantity = null;
                setVoiceMode('search', '🎤 Recherche vocale active', null);
                
                var searchInput = document.getElementById('posSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    window.posSearchQuery = '';
                    if (typeof window.updateClearButtonVisibility === 'function') {
                        window.updateClearButtonVisibility();
                    }
                }
                if (typeof window.posViewMode !== 'undefined') {
                    window.posViewMode = 'categories';
                }
                if (typeof window.posSelectedCategoryForView !== 'undefined') {
                    window.posSelectedCategoryForView = null;
                }
                if (typeof window.retournerCategories === 'function') {
                    window.retournerCategories();
                } else if (typeof window.filterProductGrid === 'function') {
                    window.filterProductGrid();
                }
            }
            break;
            
        case 'search_products_page':
            var searchTextP = cmd.text || '';
            console.log('🔍 [PRODUITS] Recherche:', searchTextP);
            var prodInput = document.getElementById('productSearchInput');
            if (prodInput) {
                prodInput.value = searchTextP;
                if (typeof window.renderProductsTable === 'function') {
                    window.productSearchQuery = searchTextP.toLowerCase().trim();
                    window.currentPages = window.currentPages || {};
                    window.currentPages.products = 1;
                    window.renderProductsTable();
                }
                showVoiceResult('🔍 ' + searchTextP);
            } else {
                showVoiceResult('⚠️ Barre de recherche produits non trouvée');
            }
            break;
            
        case 'filter_products_category':
            var catName = cmd.category || '';
            console.log('📂 [PRODUITS] Filtre catégorie:', catName);
            var catSelect = document.getElementById('categoryFilter');
            if (catSelect) {
                catSelect.value = catName;
                if (typeof window.filterProducts === 'function') {
                    window.filterProducts();
                }
                showVoiceResult('📂 ' + catName);
            } else {
                showVoiceResult('⚠️ Sélecteur de catégorie non trouvé');
            }
            break;
            
        case 'search_ventes':
            var searchTextV = cmd.text || '';
            console.log('🔍 [VENTES] Recherche:', searchTextV);
            var ventesInput = document.getElementById('ventesSearchInput');
            if (ventesInput) {
                ventesInput.value = searchTextV;
                if (typeof window.renderVentesTable === 'function') {
                    window.ventesSearch = searchTextV;
                    window.currentPages = window.currentPages || {};
                    window.currentPages.ventes = 1;
                    window.renderVentesTable();
                }
                showVoiceResult('🔍 ' + searchTextV);
            } else {
                showVoiceResult('⚠️ Barre de recherche ventes non trouvée');
            }
            break;
            
        case 'period_filter_ventes':
            var periodV = cmd.period || 'all';
            console.log('📅 [VENTES] Filtre période:', periodV);
            var periodSelectV = document.getElementById('ventesPeriodSelect');
            if (periodSelectV) {
                periodSelectV.value = periodV;
                try {
                    var evV = new Event('change', { bubbles: true });
                    periodSelectV.dispatchEvent(evV);
                } catch(e) {
                    if (typeof periodSelectV.onchange === 'function') {
                        periodSelectV.onchange();
                    }
                }
                if (typeof window.renderVentesTable === 'function') {
                    window.ventesPeriod = periodV;
                    window.renderVentesTable();
                }
                var labelsV = {
                    'today': "📅 Aujourd'hui",
                    '7': '📅 7 jours',
                    '30': '📅 30 jours',
                    '365': '📅 1 an',
                    'all': '📅 Toutes les dates'
                };
                showVoiceResult(labelsV[periodV] || '📅 Filtre appliqué');
            } else {
                showVoiceResult('⚠️ Sélecteur période ventes non trouvé');
            }
            break;
            
        case 'period_filter_credits':
            var periodC = cmd.period || 'all';
            console.log('📅 [CRÉDITS] Filtre période:', periodC);
            var periodSelectC = document.getElementById('creditsPeriodSelect');
            if (periodSelectC) {
                periodSelectC.value = periodC;
                try {
                    var evC = new Event('change', { bubbles: true });
                    periodSelectC.dispatchEvent(evC);
                } catch(e) {
                    if (typeof periodSelectC.onchange === 'function') {
                        periodSelectC.onchange();
                    }
                }
                if (typeof window.applyCreditsFilters === 'function') {
                    window.creditsPeriod = periodC;
                    window.applyCreditsFilters();
                }
                var labelsC = {
                    'today': "📅 Aujourd'hui",
                    '7': '📅 7 jours',
                    '30': '📅 30 jours',
                    '365': '📅 1 an',
                    'all': '📅 Toutes les dates'
                };
                showVoiceResult(labelsC[periodC] || '📅 Filtre appliqué');
            } else {
                showVoiceResult('⚠️ Sélecteur période crédits non trouvé');
            }
            break;
            
        case 'search_credits':
            var searchText = cmd.text || '';
            var creditsInput = document.getElementById('creditsSearchInput');
            if (creditsInput) {
                creditsInput.value = searchText;
                window.creditsSearch = searchText;
                if (typeof window.applyCreditsFilters === 'function') {
                    window.applyCreditsFilters();
                }
                showVoiceResult('🔍 ' + searchText);
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
            
            var displayName = window.posCurrentClient.name;
            if (cmd.client.description) {
                displayName += ' (' + cmd.client.description + ')';
            }
            showVoiceResult('👤 ' + displayName);
            
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
            }
            break;
            
        case 'validate':
        case 'finalize':
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            if (window.posStep === 2 && typeof window.posFinalizeSale === 'function') {
                window.posFinalizeSale();
            } else if (window.posCart?.length > 0 && window.posStep === 1) {
                if (typeof window.posGoToStep2 === 'function') {
                    window.posGoToStep2();
                }
            }
            break;
            
        case 'clear':
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            if (typeof window.posResetCart === 'function') {
                window.posResetCart();
                showVoiceResult('🗑️ Panier vidé');
                if (typeof window.renderPOS === 'function') {
                    setTimeout(function() { window.renderPOS(); }, 200);
                }
            }
            break;
            
        case 'cancel':
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            if (typeof window.renderPOS === 'function') {
                window.renderPOS();
            }
            showVoiceResult('↩️ Annulé');
            break;
            
        case 'navigate':
            console.log('📍 Navigation vers:', cmd.page);
            waitingForQuantity = false;
            pendingProductForQuantity = null;
            setVoiceMode('search', '🎤 Recherche vocale active', null);
            
            if (cmd.page === 'pos') {
                if (typeof navigateTo === 'function') {
                    navigateTo('pos');
                    setTimeout(function() {
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
                    'products': '📦 Produits',
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
                    '7': '📅 7 jours',
                    '30': '📅 30 jours',
                    '365': '📅 1 an',
                    'all': '📅 Toutes les dates'
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
    if (productId !== undefined) {
        lastAddedProductId = productId;
        if (mode === 'quantity') {
            pendingProductForQuantity = productId;
            waitingForQuantity = true;
        }
    }
    if (mode === 'payment') {
        window.voicePaymentState = 0;
        waitingForQuantity = false;
        pendingProductForQuantity = null;
        window.waitingForQuantity = false;
        window.pendingProductForQuantity = null;
    }
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

    var toolsContainer = document.getElementById('posToolsContainer');
    var searchInput = document.getElementById('posSearchInput');
    var toggleBtn = document.getElementById('posToggleToolsBtn');
    
    if (toolsContainer && toolsContainer.style.display === 'none') {
        toolsContainer.style.display = 'flex';
        toolsContainer.style.flexDirection = 'column';
        toolsContainer.style.gap = '10px';
        toolsContainer.style.marginBottom = '10px';
        toolsContainer.style.padding = '12px 16px';
        toolsContainer.style.background = 'var(--bg-card)';
        toolsContainer.style.borderRadius = '12px';
        toolsContainer.style.border = '1px solid var(--border)';
        toolsContainer.classList.add('visible');
    }
    
    if (searchInput) {
        searchInput.style.display = 'flex';
    }
    
    var micBtn = document.getElementById('posMicBtn');
    if (micBtn) {
        micBtn.style.display = 'flex';
    }
    
    if (toggleBtn) {
        toggleBtn.innerHTML = '✕ Masquer tout';
        toggleBtn.style.background = '#ef4444';
    }
    
    if (typeof window.posToolsVisible !== 'undefined') {
        window.posToolsVisible = true;
    }

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

    var debouncedInterimSearch = debounce(function(txt, si) {
        try {
            var inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
            si.dispatchEvent(inputEvent);
        } catch(e) {
            var event = new Event('input', { bubbles: true });
            si.dispatchEvent(event);
        }
        
        if (typeof window.posSearchProducts === 'function') {
            window.posSearchProducts(txt);
        } else if (typeof window.filterProductGrid === 'function') {
            window.filterProductGrid();
        }
        
        if (typeof window.updateClearButtonVisibility === 'function') {
            window.updateClearButtonVisibility();
        }
    }, 150);

    voiceRecognition.onresult = function(e) {
        var interim = '', final = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t;
            else interim += t;
        }
        
        console.log('🎤 Résultat vocal - Interim:', interim, 'Final:', final);
        console.log('🔢 Mode quantité actif ?', waitingForQuantity, 'Produit en attente:', pendingProductForQuantity);

        if (waitingForQuantity && pendingProductForQuantity) {
            if (final && final.trim().length > 0) {
                var num = extractNumberFromTranscript(final);
                
                if (num !== null && num > 0) {
                    console.log('✅ [QUANTITÉ] Nombre détecté:', num, 'dans:', final);
                    handleVoiceCommand({ 
                        type: 'quantity', 
                        value: num, 
                        productId: pendingProductForQuantity 
                    });
                    return;
                }
                
                console.log('🔄 [QUANTITÉ] Pas un nombre, on abandonne la quantité et on cherche un produit:', final);
                waitingForQuantity = false;
                pendingProductForQuantity = null;
                setVoiceMode('search', '🎤 Recherche vocale active', null);
                
                var searchInputForce = document.getElementById('posSearchInput');
                if (searchInputForce) {
                    searchInputForce.value = final;
                    window.posSearchQuery = final.toLowerCase().trim();
                    try {
                        var inputEventForce = new InputEvent('input', { bubbles: true, cancelable: true });
                        searchInputForce.dispatchEvent(inputEventForce);
                    } catch(e) {
                        var eventForce = new Event('input', { bubbles: true });
                        searchInputForce.dispatchEvent(eventForce);
                    }
                    if (typeof window.posSearchProducts === 'function') {
                        window.posSearchProducts(final);
                    } else if (typeof window.filterProductGrid === 'function') {
                        window.filterProductGrid();
                    }
                    if (typeof window.updateClearButtonVisibility === 'function') {
                        window.updateClearButtonVisibility();
                    }
                }
                showVoiceResult('🔍 ' + final);
                return;
            } else {
                console.log('⏳ [QUANTITÉ] Interim ignoré, en attente du final. Interim:', interim);
                return;
            }
        }

        if (final && final.trim().length > 0 && final !== lastFinal) {
            lastFinal = final;
            var navCheck = parseVoiceCommand(final);
            console.log('🚦 navCheck résultat:', navCheck ? navCheck.type : 'null', navCheck);
            if (navCheck && navCheck.type !== 'ignore' && navCheck.type !== 'search_text') {
                console.log('🎯 Commande détectée dans navCheck:', navCheck.type);
                handleVoiceCommand(navCheck);
                return;
            }
        }

        var cp = document.getElementById('pageTitle')?.textContent || '';

        if (cp === 'Produits') {
            if (final && final.trim().length > 0 && final !== lastFinal) {
                lastFinal = final;
                var cmdP = parseVoiceCommand(final);
                console.log('📄 [PRODUITS] Commande:', cmdP.type);
                if (cmdP && cmdP.type !== 'ignore') {
                    handleVoiceCommand(cmdP);
                }
            }
            return;
        }

        if (cp === 'Ventes') {
            if (final && final.trim().length > 0 && final !== lastFinal) {
                lastFinal = final;
                var cmdV = parseVoiceCommand(final);
                console.log('💰 [VENTES] Commande:', cmdV.type);
                if (cmdV && cmdV.type !== 'ignore') {
                    handleVoiceCommand(cmdV);
                }
            }
            return;
        }

        if (cp === 'Crédits') {
            if (final && final.trim().length > 0 && final !== lastFinal) {
                lastFinal = final;
                var cmdC = parseVoiceCommand(final);
                console.log('💳 [CRÉDITS] Commande:', cmdC.type);
                if (cmdC && cmdC.type !== 'ignore') {
                    handleVoiceCommand(cmdC);
                }
            } else if (interim) {
                var siC = document.getElementById('creditsSearchInput');
                if (siC) siC.value = interim;
                var vdC = document.getElementById('creditsVoiceDisplay');
                if (vdC) vdC.value = interim;
            }
            return;
        }

        if (final && final.trim().length > 0 && final !== lastFinal) {
            lastFinal = final;
            console.log('✅ TEXTE FINAL DÉTECTÉ:', final);

            var cmd = parseVoiceCommand(final);
            if (cmd && cmd.type !== 'ignore') {
                var now = Date.now();
                if (now - lastCommandTime > 1500 || 
                    cmd.type === 'search_product' || 
                    cmd.type === 'search_text' ||
                    cmd.type === 'quantity' ||
                    cmd.type === 'client' ||
                    cmd.type === 'payment_mode' ||
                    cmd.type === 'number' ||
                    cmd.type === 'validate' ||
                    cmd.type === 'navigate') {
                    lastCommandTime = now;
                    handleVoiceCommand(cmd);
                }
                return;
            }

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
            if (waitingForQuantity && pendingProductForQuantity) {
                return;
            }
            
            console.log('✍️ Interim:', interim);
            var si = document.getElementById('posSearchInput');
            if (si) {
                si.value = interim;
                lastInterim = interim;
                
                window.posSearchQuery = interim.toLowerCase().trim();
                
                debouncedInterimSearch(interim, si);
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
    waitingForQuantity = false;
    pendingProductForQuantity = null;
    setVoiceMode('search', '🎤 Recherche vocale active', null);
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

try {
    Object.defineProperty(window, 'toggleVoiceSearch', {
        value: posToggleVoiceSearch,
        writable: false,
        configurable: true
    });
    console.log('🔒 [pos-audio] window.toggleVoiceSearch VERROUILLÉ avec posToggleVoiceSearch');
} catch(e) {
    window.toggleVoiceSearch = posToggleVoiceSearch;
    console.log('⚠️ [pos-audio] Fallback : window.toggleVoiceSearch assigné normalement');
}

window.showVoiceResult = showVoiceResult;
window.setVoiceMode = setVoiceMode;
window.showVoiceModeIndicator = showVoiceModeIndicator;
window.parseVoiceCommand = parseVoiceCommand;
window.handleVoiceCommand = handleVoiceCommand;
window.invalidateClientIndex = invalidateClientIndex;
window.showVoiceFlowIndicator = showVoiceFlowIndicator;
window.hideVoiceFlowIndicator = hideVoiceFlowIndicator;
window.showProcessingIndicator = showProcessingIndicator;
window.pendingProductForQuantity = pendingProductForQuantity;
window.waitingForQuantity = waitingForQuantity;
window.onProductAdded = function(pid) {
    lastAddedProductId = pid;
    pendingProductForQuantity = pid;
    waitingForQuantity = true;
    setVoiceMode('quantity', '🔢 Dites la quantité', pid);
    showVoiceResult('🔢 Dites la quantité');
};
window.buildClientIndex = buildClientIndex;
window.buildProductIndex = buildProductIndex;
window.fastFindProduct = fastFindProduct;
window.posStopVoiceSearch = posStopVoiceSearch;

window.cacheClear = cacheClear;
window.levenshteinDistance = levenshteinDistance;

window.resetVoiceQuantityMode = function() {
    waitingForQuantity = false;
    pendingProductForQuantity = null;
    window.waitingForQuantity = false;
    window.pendingProductForQuantity = null;
    console.log('🔄 Mode quantité réinitialisé');
};

try {
    if (typeof window.closeCreditSelection !== 'function') {
        window.closeCreditSelection = function() {
            window.creditSelectionMode = false;
            window.creditSelectedIds = [];
            if (typeof renderCreditsTablePro === 'function') {
                renderCreditsTablePro();
            }
        };
    }
} catch(e) {
    console.warn('⚠️ pos-audio: impossible de définir closeCreditSelection (fin):', e);
}

console.log('🎤 Module vocal v31 – DESCRIPTION + FUZZY + ARABE LATIN');
console.log('✅ Recherche vocale sur POS (produits + quantité)');
console.log('✅ Recherche vocale sur page Produits (nom + catégorie)');
console.log('✅ Recherche vocale sur page Ventes (client + période)');
console.log('✅ Recherche vocale sur page Crédits (client + période)');
console.log('✅ Navigation utilise les noms ANGLAIS pour matcher admin.js');
console.log('🔒 window.toggleVoiceSearch VERROUILLÉ — pos.js ne peut plus l\'écraser');
console.log('🆕 v30 : RECHERCHE FUZZY (cafe→Café Express) + CACHE MÉMOIRE + DEBOUNCE INTERIM');
console.log('🆕 v31 : + Recherche dans DESCRIPTION + BRAND + CATÉGORIES');
console.log('🆕 v31 : + Fuzzy par MOT (pas juste le début)');
console.log('🆕 v31 : + Nombres arabes en latin (wahid, jouj, tlata...) + arabe natif ٠-٩');
console.log('🏁 [pos-audio] FIN — toggleVoiceSearch:', typeof window.toggleVoiceSearch);
