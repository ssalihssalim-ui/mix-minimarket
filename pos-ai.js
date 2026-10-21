// ==================== POS-AI.JS - E-SOLUTION (v7 - PANIER TEMPORAIRE CUMULATIF) ====================
// Module IA séparé pour le POS - Commande vocale
// ✅ 100% FRANÇAIS
// ✅ 🎯 Ajoute UNIQUEMENT les PRODUITS
// ✅ Recherche PRODUIT dans : nom, description, categorie, brand, categories[]
// ✅ ⚡ Micro qui s'arrête après 2 SECONDES de silence (v7)
// ❌ 🔊 Synthèse vocale DÉSACTIVÉE (elle bloquait le micro sur iPhone)
// ✅ 🎯 Suggestions intelligentes si produit non trouvé
// ✅ 🎨 Alerte stock bas automatique
// ✅ 💾 Cache des commandes récentes
// ✅ 📱 Détection PWA iPhone → message "Ouvrez dans Safari"
// 🆕 v7 : PANIER TEMPORAIRE sous le micro + boutons +/-/🗑 + ajout cumulatif entre dictées

// ==================== 🔑 CONFIGURATION ====================
const POS_AI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';
const POS_AI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ⚡ Silence réduit à 2 secondes (v7 : était 3s)
const POS_AI_SILENCE_DURATION = 2000;
const POS_AI_CACHE_KEY = 'posGeminiCache'; // conservé pour compatibilité du cache existant
const POS_AI_CACHE_MAX_AGE = 7 * 24 * 3600000;

// ❌ SYNTHÈSE VOCALE DÉSACTIVÉE DÉFINITIVEMENT (bloquait le micro sur iPhone)
const POS_AI_TTS_ENABLED = false;

// ==================== ÉTAT ====================
var posAiRecognition = null;
var posAiEnCours = false;
var posAiTranscriptFinal = '';
var posAiProduitsEnAttente = [];
var posAiSilenceTimer = null;
var posAiManuallyStopped = false;
var posAiAbortController = null;
var posAiCache = null;
var posAiCompteurNoSpeech = 0;

// 🆕 v7 : Panier temporaire cumulatif entre les dictées
var posAiPanierTemporaire = [];

// ==================== 📱 DÉTECTION PWA IPHONE ====================
function posAiEstPwaIphone() {
    var ua = navigator.userAgent || '';
    var isIphone = /iPhone|iPad|iPod/i.test(ua);
    var isStandalone = (window.navigator.standalone === true) ||
                       (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return isIphone && isStandalone;
}

function posAiEstIphone() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

// ==================== 🔧 HELPER : NORMALISATION ====================
function posAiNormaliser(texte) {
    return (texte || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ==================== 🔊 SYNTHÈSE VOCALE — DÉSACTIVÉE ====================
function posAiParler(texte) {
    return;
}

window.posGeminiParler = posAiParler;

// ==================== 💾 CACHE DES COMMANDES RÉCENTES ====================
function posAiChargerCache() {
    if (posAiCache !== null) return posAiCache;
    try {
        var raw = localStorage.getItem(POS_AI_CACHE_KEY);
        if (!raw) {
            posAiCache = {};
            return posAiCache;
        }
        var data = JSON.parse(raw);
        var now = Date.now();
        Object.keys(data).forEach(function(k) {
            if (now - (data[k].ts || 0) > POS_AI_CACHE_MAX_AGE) {
                delete data[k];
            }
        });
        posAiCache = data;
        console.log('💾 Cache chargé :', Object.keys(posAiCache).length, 'entrées');
        return posAiCache;
    } catch(e) {
        console.warn('⚠️ Erreur chargement cache :', e);
        posAiCache = {};
        return posAiCache;
    }
}

function posAiSauverCache() {
    if (!posAiCache) return;
    try {
        localStorage.setItem(POS_AI_CACHE_KEY, JSON.stringify(posAiCache));
    } catch(e) {
        console.warn('⚠️ Erreur sauvegarde cache :', e);
    }
}

function posAiChercherDansCache(texte) {
    var cache = posAiChargerCache();
    var key = posAiNormaliser(texte);
    if (cache[key]) {
        console.log('⚡ Cache HIT pour :', key);
        return cache[key];
    }
    return null;
}

function posAiStockerDansCache(texte, resultat) {
    var cache = posAiChargerCache();
    var key = posAiNormaliser(texte);
    cache[key] = {
        ts: Date.now(),
        hits: (cache[key] ? cache[key].hits + 1 : 1),
        result: resultat
    };
    posAiSauverCache();
    console.log('💾 Stocké en cache :', key);
}

// ==================== FONCTION PRINCIPALE - OUVERTURE DU MODAL ====================
function posOuvrirCommandeVocaleAi() {
    console.log('📦 Catalogue actuel :', (window.posProductsList || []).length, 'produits');

    if (posAiEnCours) {
        alert('⏳ Une reconnaissance est déjà en cours...');
        return;
    }

    // 🔒 Vérification HTTPS (obligatoire pour le micro)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert(
            '🔒 Connexion non sécurisée détectée\n\n' +
            '⚠️ La reconnaissance vocale EXIGE une connexion HTTPS.\n\n' +
            '✅ Solution : utilisez https:// au lieu de http://'
        );
        return;
    }

    // 📱 Détection PWA iPhone
    if (posAiEstPwaIphone()) {
        alert(
            '📱 Mode PWA iPhone détecté\n\n' +
            '⚠️ La reconnaissance vocale NE FONCTIONNE PAS dans une application installée sur iPhone (limitation Apple).\n\n' +
            '✅ Solution : Ouvrez cette page dans Safari (pas depuis l\'icône de l\'écran d\'accueil).\n\n' +
            'Le micro fonctionnera alors normalement.'
        );
        return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        var msg = '❌ La reconnaissance vocale n\'est pas supportée par ce navigateur.';
        if (posAiEstIphone()) {
            msg += '\n\n📱 Sur iPhone, ouvrez la page dans Safari (pas en PWA).';
        } else {
            msg += '\n\nUtilisez Chrome, Edge ou Safari récent.';
        }
        alert(msg);
        return;
    }

    if (!window.posProductsList || window.posProductsList.length === 0) {
        alert('❌ Aucun produit chargé. Réessayez dans quelques secondes.');
        return;
    }

    posAiChargerCache();

    var html = `
        <div style="padding:10px; text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
                <i class="fas fa-robot" style="font-size:2.5rem;color:#8B5CF6;"></i>
                <h3 style="margin:0;font-size:1.3rem;color:#7C3AED;font-weight:700;">Commande vocale</h3>
            </div>

            <div style="padding:16px;background:linear-gradient(135deg,#F3E8FF,#EDE9FE);border-radius:12px;border:2px solid #8B5CF6;margin-bottom:16px;">
                <p style="margin:0;color:#5B21B6;font-size:1rem;font-weight:600;">💡 Exemples de phrases :</p>
                <p style="margin:8px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Ajouter 3 Merindina et 2 Coca Cola »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« 5 croissants et 1 café »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Deux pizzas et un jus d'orange »</p>
                <p style="margin:10px 0 0;color:#7C3AED;font-size:0.8rem;font-weight:600;">⏱️ Le micro s'arrête après 2 secondes de silence</p>
            </div>

            <button id="posAiMicBtn" onclick="posDemarrerEcouteAi()"
                style="width:140px;height:140px;border-radius:50%;border:none;cursor:pointer;
                       background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;
                       font-size:3rem;box-shadow:0 8px 24px rgba(139,92,246,0.4);
                       transition:all 0.3s;display:flex;align-items:center;justify-content:center;
                       margin:20px auto;">
                <i class="fas fa-microphone" id="posAiMicIcon"></i>
            </button>

            <p id="posAiStatus" style="color:#64748b;font-size:1rem;margin-top:8px;min-height:24px;">Appuyez pour parler</p>

            <div id="posAiTranscript" style="margin-top:16px;padding:12px;background:#f8fafc;
                border-radius:10px;border:1px solid #e2e8f0;min-height:50px;
                color:#1e293b;font-size:1rem;text-align:left;display:none;">
                <strong style="color:#8B5CF6;">📝 Transcription :</strong>
                <p id="posAiTranscriptText" style="margin:6px 0 0;font-style:italic;"></p>
            </div>

            <div id="posAiPanierContainer" style="margin-top:16px;"></div>

            <div id="posAiResult" style="margin-top:16px;display:none;"></div>
        </div>
    `;
    openModal('🎤 Commande vocale', html);
    
    // 🆕 v7 : Afficher le panier temporaire dès l'ouverture
    posAiRafraichirPanier();
}

// ==================== 🆕 v7 : AFFICHAGE DU PANIER TEMPORAIRE ====================
function posAiRafraichirPanier() {
    var container = document.getElementById('posAiPanierContainer');
    if (!container) return;

    if (!posAiPanierTemporaire || posAiPanierTemporaire.length === 0) {
        container.innerHTML = '';
        return;
    }

    var totalGeneral = 0;
    var lignesHtml = posAiPanierTemporaire.map(function(item, idx) {
        var p = item.produit;
        var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
        var sousTotal = pr * item.quantite;
        totalGeneral += sousTotal;

        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 6px;font-weight:600;color:#1e293b;font-size:0.85rem;text-align:left;">
                    ${escapeHtml(p.nom)}
                </td>
                <td style="padding:6px;text-align:center;">
                    <button onclick="posAiChangerQuantite(${idx}, -1)"
                        style="width:26px;height:26px;border-radius:50%;border:none;
                               background:#e2e8f0;color:#475569;cursor:pointer;
                               font-weight:700;font-size:1rem;">−</button>
                    <span style="display:inline-block;min-width:24px;text-align:center;
                                 font-weight:700;color:#8B5CF6;">${item.quantite}</span>
                    <button onclick="posAiChangerQuantite(${idx}, 1)"
                        style="width:26px;height:26px;border-radius:50%;border:none;
                               background:#8B5CF6;color:#fff;cursor:pointer;
                               font-weight:700;font-size:1rem;">+</button>
                </td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:#7C3AED;font-size:0.85rem;">
                    ${sousTotal.toFixed(2)} MAD
                </td>
                <td style="padding:6px;text-align:center;">
                    <button onclick="posAiSupprimerDuPanier(${idx})"
                        style="width:28px;height:28px;border-radius:6px;border:none;
                               background:#FEE2E2;color:#EF4444;cursor:pointer;
                               font-weight:700;">🗑</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="padding:12px;background:#F5F3FF;border:2px solid #8B5CF6;border-radius:12px;text-align:left;">
            <p style="margin:0 0 10px;color:#7C3AED;font-weight:700;font-size:1rem;">
                🛒 Panier (${posAiPanierTemporaire.length} produit${posAiPanierTemporaire.length > 1 ? 's' : ''})
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                    <tr style="background:#EDE9FE;">
                        <th style="padding:6px;text-align:left;color:#7C3AED;font-size:0.75rem;">Produit</th>
                        <th style="padding:6px;text-align:center;color:#7C3AED;font-size:0.75rem;">Qté</th>
                        <th style="padding:6px;text-align:right;color:#7C3AED;font-size:0.75rem;">Total</th>
                        <th style="padding:6px;text-align:center;color:#7C3AED;font-size:0.75rem;"></th>
                    </tr>
                </thead>
                <tbody>${lignesHtml}</tbody>
            </table>
            <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:2px solid #8B5CF6;">
                <span style="font-weight:700;color:#5B21B6;font-size:1rem;">Total général :</span>
                <span style="font-weight:800;color:#7C3AED;font-size:1.2rem;">${totalGeneral.toFixed(2)} MAD</span>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px;">
                <button onclick="posAnnulerAiVoice()"
                    style="flex:1;padding:12px;background:#e2e8f0;color:#475569;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    ❌ Annuler
                </button>
                <button onclick="posConfirmerAjoutAiVoice()"
                    style="flex:2;padding:12px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,0.3);">
                    ✅ Valider le panier
                </button>
            </div>
        </div>
    `;
}

// ==================== 🆕 v7 : CHANGER LA QUANTITÉ ====================
function posAiChangerQuantite(index, delta) {
    if (!posAiPanierTemporaire || !posAiPanierTemporaire[index]) return;
    var item = posAiPanierTemporaire[index];
    var nouvelleQte = (item.quantite || 1) + delta;

    // Ne pas descendre en dessous de 1
    if (nouvelleQte < 1) {
        posAiSupprimerDuPanier(index);
        return;
    }

    // Vérifier le stock
    var produit = item.produit;
    if (produit && produit.stock !== undefined && nouvelleQte > produit.stock) {
        alert('⚠️ Stock insuffisant (max : ' + produit.stock + ')');
        return;
    }

    item.quantite = nouvelleQte;
    posAiRafraichirPanier();
}

// ==================== 🆕 v7 : SUPPRIMER UN PRODUIT ====================
function posAiSupprimerDuPanier(index) {
    if (!posAiPanierTemporaire || !posAiPanierTemporaire[index]) return;
    posAiPanierTemporaire.splice(index, 1);
    posAiRafraichirPanier();
}

// ==================== DÉMARRAGE ÉCOUTE (silence 2s) ====================
function posDemarrerEcouteAi() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    var micBtn = document.getElementById('posAiMicBtn');
    var micIcon = document.getElementById('posAiMicIcon');
    var status = document.getElementById('posAiStatus');
    var transcriptBox = document.getElementById('posAiTranscript');
    var transcriptText = document.getElementById('posAiTranscriptText');

    // 🔁 Si une écoute est déjà en cours → on l'arrête proprement
    if (posAiRecognition) {
        posAiManuallyStopped = true;
        if (posAiSilenceTimer) {
            clearTimeout(posAiSilenceTimer);
            posAiSilenceTimer = null;
        }
        try { posAiRecognition.stop(); } catch(e) {}
        posAiRecognition = null;
        posResetAiMicUI();
        if (status) status.textContent = 'Écoute arrêtée';
        return;
    }

    posAiTranscriptFinal = '';
    posAiManuallyStopped = false;
    posAiCompteurNoSpeech = 0;

    // ✅ CRÉATION D'UN NOUVEL OBJET À CHAQUE FOIS (contourne le bug iOS)
    posAiRecognition = new SpeechRecognition();
    posAiRecognition.lang = 'fr-FR';
    posAiRecognition.continuous = true;
    posAiRecognition.interimResults = true;
    posAiRecognition.maxAlternatives = 1;

    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg,#EF4444,#DC2626)';
        micBtn.style.animation = 'posPulse 1.5s infinite';
    }
    if (micIcon) micIcon.className = 'fas fa-stop';
    if (status) {
        status.textContent = '🎙️ Je vous écoute... (parlez, puis attendez 2s)';
        status.style.color = '#8B5CF6';
        status.style.fontWeight = '700';
    }
    if (transcriptBox) transcriptBox.style.display = 'block';
    if (transcriptText) transcriptText.textContent = '...';

    if (!document.getElementById('posAiPulseStyle')) {
        var style = document.createElement('style');
        style.id = 'posAiPulseStyle';
        style.textContent = `@keyframes posPulse {
            0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
            70% { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }`;
        document.head.appendChild(style);
    }

    function demarrerTimerSilence() {
        if (posAiSilenceTimer) clearTimeout(posAiSilenceTimer);
        var statusEl = document.getElementById('posAiStatus');
        var fin = Date.now() + POS_AI_SILENCE_DURATION;
        var intervalCompteur = setInterval(function() {
            var reste = Math.ceil((fin - Date.now()) / 1000);
            if (reste > 0 && statusEl && posAiRecognition) {
                statusEl.textContent = '⏳ Arrêt dans ' + reste + 's...';
            }
            if (reste <= 0) clearInterval(intervalCompteur);
        }, 100);

        posAiSilenceTimer = setTimeout(function() {
            clearInterval(intervalCompteur);
            console.log('⏱️ 2s de silence → arrêt auto');
            if (posAiRecognition) {
                try { posAiRecognition.stop(); } catch(e) {}
            }
        }, POS_AI_SILENCE_DURATION);
    }

    posAiRecognition.onstart = function() {
        console.log('🎙️ Micro démarré');
        console.log('   - lang:', posAiRecognition.lang);
        console.log('   - continuous:', posAiRecognition.continuous);
        console.log('   - interimResults:', posAiRecognition.interimResults);
        console.log('   - PWA iPhone ?', posAiEstPwaIphone());
        console.log('   - HTTPS ?', location.protocol === 'https:');

        if (navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' })
                .then(function(p) { console.log('   - État micro:', p.state); })
                .catch(function(e) { console.log('   - Impossible de vérifier:', e.message); });
        }
    };

    posAiRecognition.onresult = function(event) {
        console.log('📥 onresult appelé, résultats:', event.results.length);
        var interim = '';
        var finalText = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += transcript + ' ';
            else interim += transcript;
        }
        if (finalText) posAiTranscriptFinal += finalText;
        var displayText = (posAiTranscriptFinal + interim).trim();
        if (transcriptText) transcriptText.textContent = displayText || '...';
        if (displayText.length > 0) demarrerTimerSilence();
    };

    posAiRecognition.onerror = function(event) {
        console.error('❌ Erreur reconnaissance vocale :', event.error, '| message:', event.message);

        // ⚠️ Sur iPhone, "no-speech" arrive souvent alors qu'on a déjà du texte
        if (event.error === 'no-speech' && posAiTranscriptFinal.trim().length > 0) {
            console.log('ℹ️ no-speech ignoré, on continue');
            return;
        }

        // 🔄 Relance automatique si "no-speech" (max 2 fois)
        if (event.error === 'no-speech' && posAiCompteurNoSpeech < 2) {
            posAiCompteurNoSpeech++;
            console.log('🔄 Relance auto n°' + posAiCompteurNoSpeech + ' après no-speech');
            posAiManuallyStopped = true;
            if (posAiSilenceTimer) {
                clearTimeout(posAiSilenceTimer);
                posAiSilenceTimer = null;
            }
            posResetAiMicUI();
            posAiRecognition = null;

            setTimeout(function() {
                posDemarrerEcouteAi();
            }, 500);
            return;
        }

        var status = document.getElementById('posAiStatus');
        if (status) {
            if (event.error === 'no-speech') {
                status.textContent = '🎙️ Aucune parole détectée. Vérifiez que le micro est bien autorisé et parlez plus fort.';
            } else if (event.error === 'not-allowed') {
                status.textContent = '🔒 Micro bloqué. Autorisez le micro dans les réglages du navigateur.';
            } else if (event.error === 'aborted') {
                status.textContent = '⏹️ Écoute arrêtée';
            } else if (event.error === 'audio-capture') {
                status.textContent = '🎤 Micro indisponible. Vérifiez qu\'aucune autre app ne l\'utilise.';
            } else if (event.error === 'network') {
                status.textContent = '🌐 Problème réseau. Vérifiez votre connexion.';
            } else {
                status.textContent = '⚠️ Problème micro (' + event.error + '). Réessayez.';
            }
            status.style.color = '#ef4444';
        }
        if (posAiSilenceTimer) {
            clearTimeout(posAiSilenceTimer);
            posAiSilenceTimer = null;
        }
        posResetAiMicUI();
        posAiRecognition = null;
    };

    posAiRecognition.onend = function() {
        var finalText = posAiTranscriptFinal.trim();
        if (posAiSilenceTimer) {
            clearTimeout(posAiSilenceTimer);
            posAiSilenceTimer = null;
        }
        posResetAiMicUI();
        posAiRecognition = null;

        if (posAiManuallyStopped) {
            posAiManuallyStopped = false;
            return;
        }

        if (finalText.length < 3) {
            var status = document.getElementById('posAiStatus');
            if (status) {
                status.textContent = '🎙️ Aucune parole captée. Vérifiez le micro et parlez plus fort.';
                status.style.color = '#f59e0b';
            }
            return;
        }

        var status = document.getElementById('posAiStatus');
        if (status) {
            status.textContent = '✅ Commande captée !';
            status.style.color = '#10B981';
        }
        posEnvoyerTexteAAi(finalText);
    };

    try {
        posAiRecognition.start();
    } catch(e) {
        console.error('Impossible de démarrer la reconnaissance :', e);
        alert('❌ Erreur micro : ' + e.message);
        posResetAiMicUI();
    }
}

function posResetAiMicUI() {
    var micBtn = document.getElementById('posAiMicBtn');
    var micIcon = document.getElementById('posAiMicIcon');
    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg,#8B5CF6,#7C3AED)';
        micBtn.style.animation = 'none';
    }
    if (micIcon) micIcon.className = 'fas fa-microphone';
}

// ==================== ENVOI À L'IA (PRODUITS UNIQUEMENT) ====================
async function posEnvoyerTexteAAi(texte) {
    if (posAiEnCours) return;
    posAiEnCours = true;

    var status = document.getElementById('posAiStatus');
    var resultBox = document.getElementById('posAiResult');

    console.log('🎤 Texte entendu :', texte);
    console.log('📦 Produits :', (window.posProductsList || []).length);

    if (status) {
        status.textContent = '🤖 Analyse en cours...';
        status.style.color = '#8B5CF6';
        status.style.fontWeight = '700';
    }
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="text-align:center;padding:16px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#8B5CF6;"></i><p style="color:#64748b;margin-top:8px;">Analyse en cours...</p></div>';
    }

    try {
        if (!window.posProductsList || window.posProductsList.length === 0) {
            throw new Error('Catalogue vide. Rechargez la page POS.');
        }

        var cachedResult = posAiChercherDansCache(texte);
        var parsed = null;

        if (cachedResult && cachedResult.result) {
            console.log('⚡ Utilisation du cache (réponse instantanée)');
            parsed = cachedResult.result;
            if (status) status.textContent = '⚡ Réponse du cache';
        } else {
            var productNames = window.posProductsList.map(function(p) { return p.nom; }).filter(Boolean);
            if (productNames.length === 0) throw new Error('Aucun produit valide');

            var productListStr = productNames.slice(0, 300).map(function(n) {
                return '"' + n.replace(/"/g, '\\"') + '"';
            }).join(', ');

            var prompt = `Tu es un assistant de point de vente. Analyse la commande dictée en FRANÇAIS.

PHRASE DITE :
"${texte}"

CATALOGUE DE PRODUITS DISPONIBLES :
[${productListStr}]

═══════════════════════════════════════════════════════
🎯 MISSION :
═══════════════════════════════════════════════════════

1. Identifie TOUS les produits mentionnés qui correspondent au catalogue.
2. Extrait la quantité pour chaque produit. Reconnais :
   - Chiffres : "1", "2", "3", "10"...
   - Mots français : "un"=1, "deux"=2, "trois"=3, "quatre"=4, "cinq"=5, "six"=6, "sept"=7, "huit"=8, "neuf"=9, "dix"=10
   - Mots darija en latin : "wahid"=1, "jouj"=2, "tlata"=3, "khamsa"=5, "sitta"=6, "sbaa"=7, "tmanya"=8, "tsaa"=9, "achra"=10
   Si aucune quantité n'est précisée, mets 1.

⚠️ IMPORTANT : IGNORE COMPLÈTEMENT tout nom de personne ou de client mentionné (ex: "client Ahmed", "pour Fatima", "au nom de Youssef"). Ne retourne QUE les produits.

MOTS À IGNORER : "ajouter", "au panier", "et", "puis", "avec", "s'il te plaît", "svp", "merci", "je veux", "donne-moi", "donne moi", "client", "pour", "au nom de".

═══════════════════════════════════════════════════════
📝 EXEMPLES :
═══════════════════════════════════════════════════════

Ex 1 : "Ajouter 3 Merindina et 2 Coca Cola"
→ [{"nom": "Merindina", "quantite": 3}, {"nom": "Coca Cola", "quantite": 2}]

Ex 2 : "Client Ahmed, 5 croissants et 1 café"
→ [{"nom": "Croissant", "quantite": 5}, {"nom": "Café", "quantite": 1}]
(ignore "Ahmed")

Ex 3 : "Deux pizzas et un jus d'orange"
→ [{"nom": "Pizza", "quantite": 2}, {"nom": "Jus d'orange", "quantite": 1}]

Ex 4 : "Pour Fatima, trois thés et quatre msemen"
→ [{"nom": "Thé", "quantite": 3}, {"nom": "Msemen", "quantite": 4}]
(ignore "Fatima")

Ex 5 : "Ajouter 2 Coca pour le client footballeur"
→ [{"nom": "Coca Cola", "quantite": 2}]
(ignore "footballeur")

Ex 6 : "Un croissant et deux cafés au nom de Youssef"
→ [{"nom": "Croissant", "quantite": 1}, {"nom": "Café", "quantite": 2}]
(ignore "Youssef")

Ex 7 : "Six msemen"
→ [{"nom": "Msemen", "quantite": 6}]

Ex 8 : "Khamsa coca et tlata croissants"
→ [{"nom": "Coca Cola", "quantite": 5}, {"nom": "Croissant", "quantite": 3}]

═══════════════════════════════════════════════════════
📤 FORMAT DE SORTIE (JSON ARRAY UNIQUEMENT) :
═══════════════════════════════════════════════════════

[
  { "nom": "Nom EXACT du produit du catalogue", "quantite": 3 }
]

═══════════════════════════════════════════════════════
⚠️ RÈGLES STRICTES :
═══════════════════════════════════════════════════════

- Le "nom" doit correspondre EXACTEMENT à un nom du catalogue (copie-colle).
- IGNORE COMPLÈTEMENT les noms de clients/personnes.
- Ignore les produits non trouvés dans le catalogue.
- Si aucun produit trouvé, retourne [].
- Ne mets JAMAIS de texte avant ou après le JSON.
- Pas de \`\`\`json autour du JSON.
- Retourne UNIQUEMENT un TABLEAU (array), PAS un objet.`.trim();

            console.log('📤 Envoi au Worker...');

            if (posAiAbortController) {
                try { posAiAbortController.abort(); } catch(e) {}
            }
            posAiAbortController = new AbortController();
            var timeoutId = setTimeout(function() {
                if (posAiAbortController) {
                    try { posAiAbortController.abort(); } catch(e) {}
                }
            }, 20000);

            var response = await fetch(POS_AI_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    imageBase64: POS_AI_FAKE_IMAGE
                }),
                signal: posAiAbortController.signal
            });

            clearTimeout(timeoutId);
            posAiAbortController = null;

            console.log('📥 Status HTTP :', response.status);

            if (!response.ok) {
                var errText = await response.text();
                throw new Error('HTTP ' + response.status + ' : ' + errText.substring(0, 200));
            }

            var data = await response.json();
            if (data.error) throw new Error('Erreur IA : ' + (data.error.message || JSON.stringify(data.error)));

            var rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            console.log('📝 Réponse brute :', rawText);

            if (!rawText) throw new Error('L\'IA n\'a rien répondu.');

            var cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

            try {
                parsed = JSON.parse(cleaned);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.produits) {
                    parsed = parsed.produits;
                }
                if (!Array.isArray(parsed)) {
                    throw new Error('Pas un tableau');
                }
            } catch(e) {
                console.warn('⚠️ Parsing JSON échoué, tentative regex...');
                var regex = /["']nom["']\s*:\s*["']([^"']+)["']\s*,\s*["']quantite["']\s*:\s*(\d+)/gi;
                var match;
                var fallbackProduits = [];
                while ((match = regex.exec(cleaned)) !== null) {
                    fallbackProduits.push({ nom: match[1].trim(), quantite: parseInt(match[2], 10) || 1 });
                }
                parsed = fallbackProduits;
            }

            posAiStockerDansCache(texte, parsed);
        }

        var produitsReconnus = Array.isArray(parsed) ? parsed : [];

        console.log('🛒 Produits reconnus :', produitsReconnus);

        if (produitsReconnus.length === 0) {
            if (resultBox) {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;font-size:0.95rem;text-align:left;">
                    ⚠️ <strong>Aucun produit reconnu.</strong><br>
                    <em>Essayez : « Ajouter 3 Merindina et 2 Coca Cola »</em>
                </div>`;
            }
            posAiEnCours = false;
            return;
        }

        // ============================================================
        // ✅ MATCHING INTELLIGENT DU PRODUIT
        // ============================================================
        var produitsValides = [];
        var produitsNonTrouves = [];

        produitsReconnus.forEach(function(rec) {
            var recNom = (rec.nom || '').trim();
            if (!recNom) return;

            var recNomNorm = posAiNormaliser(recNom);
            var motsRecherche = recNomNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });

            console.log('🔍 Recherche produit :', recNom, '| mots:', motsRecherche);

            var produit = null;
            var matchType = '';

            // 1️⃣ Match EXACT sur nom
            produit = window.posProductsList.find(function(p) {
                return posAiNormaliser(p.nom) === recNomNorm;
            });
            if (produit) matchType = 'nom exact';

            // 2️⃣ Match EXACT sur description/categorie/brand
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    return posAiNormaliser(p.description) === recNomNorm
                        || posAiNormaliser(p.categorie) === recNomNorm
                        || posAiNormaliser(p.brand) === recNomNorm;
                });
                if (produit) matchType = 'desc/cat/brand exact';
            }

            // 3️⃣ Match PARTIEL sur nom
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pNom = posAiNormaliser(p.nom);
                    return pNom.includes(recNomNorm) || recNomNorm.includes(pNom);
                });
                if (produit) matchType = 'nom partiel';
            }

            // 4️⃣ Match PARTIEL sur description/categorie/brand
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pDesc = posAiNormaliser(p.description);
                    var pCat = posAiNormaliser(p.categorie);
                    var pBrand = posAiNormaliser(p.brand);
                    return pDesc.includes(recNomNorm) || pCat.includes(recNomNorm) || pBrand.includes(recNomNorm);
                });
                if (produit) matchType = 'desc/cat/brand partiel';
            }

            // 5️⃣ Match par MOTS-CLÉS pondéré
            if (!produit) {
                var candidats = [];
                window.posProductsList.forEach(function(p) {
                    var pNom = posAiNormaliser(p.nom);
                    var pDesc = posAiNormaliser(p.description);
                    var pCat = posAiNormaliser(p.categorie);
                    var pBrand = posAiNormaliser(p.brand);
                    var pCats = (p.categories || []).map(posAiNormaliser).join(' ');

                    var score = 0;
                    var motsMatched = [];

                    motsRecherche.forEach(function(mot) {
                        if (pNom.includes(mot)) { score += mot.length * 3; motsMatched.push(mot + '(nom)'); }
                        else if (pDesc.includes(mot)) { score += mot.length * 2; motsMatched.push(mot + '(desc)'); }
                        else if (pCat.includes(mot) || pCats.includes(mot)) { score += mot.length * 1.5; motsMatched.push(mot + '(cat)'); }
                        else if (pBrand.includes(mot)) { score += mot.length * 1.5; motsMatched.push(mot + '(brand)'); }
                    });

                    if (pDesc.includes(recNomNorm)) score += 50;

                    if (score > 0) {
                        candidats.push({ produit: p, score: score, mots: motsMatched });
                    }
                });

                candidats.sort(function(a, b) { return b.score - a.score; });

                if (candidats.length > 0) {
                    if (candidats[0].score >= 20) {
                        produit = candidats[0].produit;
                        matchType = 'mots-clés (score ' + candidats[0].score + ')';
                        console.log('🎯 Trouvé via mots-clés :', produit.nom, '| score:', candidats[0].score);
                    } else {
                        produitsNonTrouves.push({
                            nomOriginal: recNom,
                            suggestions: candidats.slice(0, 3).map(function(c) { return c.produit; })
                        });
                        return;
                    }
                }
            }

            // 6️⃣ Recherche finale dans tous les champs
            if (!produit) {
                var candidats2 = [];
                window.posProductsList.forEach(function(p) {
                    var tousLesChamps = [
                        posAiNormaliser(p.nom),
                        posAiNormaliser(p.description),
                        posAiNormaliser(p.categorie),
                        posAiNormaliser(p.brand),
                        (p.categories || []).map(posAiNormaliser).join(' ')
                    ].join(' ');

                    var score = 0;
                    motsRecherche.forEach(function(mot) {
                        if (tousLesChamps.includes(mot)) score += mot.length;
                    });

                    if (score > 0) candidats2.push({ produit: p, score: score });
                });

                candidats2.sort(function(a, b) { return b.score - a.score; });

                if (candidats2.length > 0 && candidats2[0].score >= 10) {
                    produit = candidats2[0].produit;
                    matchType = 'tous champs (score ' + candidats2[0].score + ')';
                }
            }

            if (produit) {
                console.log('✅ Produit ajouté :', produit.nom, '| type:', matchType);
                produitsValides.push({
                    produit: produit,
                    quantite: Math.max(1, parseInt(rec.quantite, 10) || 1),
                    nomOriginal: recNom,
                    matchType: matchType
                });
            } else {
                console.log('❌ Produit NON trouvé :', recNom);
                produitsNonTrouves.push({ nomOriginal: recNom, suggestions: [] });
            }
        });

        // 🆕 v7 : AJOUTER AU PANIER TEMPORAIRE (cumul)
        posAiAjouterAuPanierTemporaire(produitsValides, produitsNonTrouves);

    } catch(e) {
        console.error('❌ Erreur Voice:', e);
        if (e.name === 'AbortError') {
            if (resultBox) resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;text-align:left;">⏱️ <strong>Délai dépassé.</strong> Réessayez.</div>`;
        } else {
            if (resultBox) resultBox.innerHTML = `<div style="padding:14px;background:#FEE2E2;border:2px solid #EF4444;border-radius:10px;color:#991B1B;text-align:left;">❌ <strong>Erreur :</strong> ${escapeHtml(e.message)}</div>`;
        }
    } finally {
        posAiEnCours = false;
    }
}

// ==================== 🆕 v7 : AJOUTER AU PANIER TEMPORAIRE (cumul) ====================
function posAiAjouterAuPanierTemporaire(produitsValides, produitsNonTrouves) {
    produitsNonTrouves = produitsNonTrouves || [];

    if (!produitsValides || produitsValides.length === 0) {
        // Aucun produit reconnu : afficher les suggestions si possible
        var resultBox = document.getElementById('posAiResult');
        if (resultBox) {
            if (produitsNonTrouves.length > 0) {
                posAfficherResultatAiVoice([], resultBox, produitsNonTrouves);
            } else {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;font-size:0.95rem;text-align:left;">
                    ⚠️ <strong>Aucun produit reconnu.</strong><br>
                    <em>Essayez : « Ajouter 3 Merindina et 2 Coca Cola »</em>
                </div>`;
            }
        }
        return;
    }

    // 🆕 v7 : Ajouter OU cumuler avec les produits déjà dans le panier temporaire
    produitsValides.forEach(function(nouveau) {
        var existant = posAiPanierTemporaire.find(function(item) {
            return item.produit && item.produit.id === nouveau.produit.id;
        });

        if (existant) {
            // Le produit existe déjà → on additionne les quantités
            existant.quantite = (existant.quantite || 1) + (nouveau.quantite || 1);
            console.log('🔄 Cumul quantité :', existant.produit.nom, '→', existant.quantite);
        } else {
            // Nouveau produit → on ajoute
            posAiPanierTemporaire.push(nouveau);
            console.log('➕ Nouveau produit ajouté au panier :', nouveau.produit.nom);
        }
    });

    // Rafraîchir le panier affiché
    posAiRafraichirPanier();

    // Afficher les suggestions / alertes stock si nécessaire
    var resultBox = document.getElementById('posAiResult');
    if (resultBox && produitsNonTrouves.length > 0) {
        posAfficherResultatAiVoice(posAiPanierTemporaire, resultBox, produitsNonTrouves);
    } else if (resultBox) {
        resultBox.style.display = 'none';
    }

    // Afficher un message de succès
    var status = document.getElementById('posAiStatus');
    if (status) {
        status.textContent = '✅ ' + produitsValides.length + ' produit(s) ajouté(s) au panier — cliquez sur 🎤 pour en ajouter d\'autres';
        status.style.color = '#10B981';
    }
}

// ==================== AFFICHAGE RÉSULTAT (SUGGESTIONS + ALERTES STOCK) ====================
function posAfficherResultatAiVoice(produits, container, produitsNonTrouves) {
    if (!container) container = document.getElementById('posAiResult');
    if (!container) return;

    produitsNonTrouves = produitsNonTrouves || [];

    // 🆕 v7 : Vérifier les alertes stock sur le panier temporaire
    var alertesStock = [];
    (posAiPanierTemporaire || []).forEach(function(item) {
        var p = item.produit;
        if (p.stock !== undefined) {
            if (p.stock <= 0) {
                alertesStock.push(p.nom + ' : rupture');
            } else if (p.stock < item.quantite) {
                alertesStock.push(p.nom + ' : seulement ' + p.stock + ' en stock (demandé ' + item.quantite + ')');
            } else if (p.stock <= 5) {
                alertesStock.push(p.nom + ' : ' + p.stock + ' restant(s)');
            }
        }
    });

    // Suggestions si produits non trouvés
    var suggestionsHtml = '';
    if (produitsNonTrouves.length > 0) {
        var suggestionsItems = produitsNonTrouves.map(function(item) {
            var suggHtml = item.suggestions.map(function(sugg) {
                return `<button onclick="posAiChoisirSuggestion('${escapeHtml(sugg.nom).replace(/'/g, "\\'")}')" 
                    style="padding:4px 10px;margin:2px;background:#E0E7FF;color:#4F46E5;border:1px solid #4F46E5;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                    ${escapeHtml(sugg.nom)}
                </button>`;
            }).join('');
            return `
                <div style="margin-bottom:8px;">
                    <span style="color:#92400E;font-size:0.85rem;">Non trouvé : <strong>"${escapeHtml(item.nomOriginal)}"</strong></span>
                    ${suggHtml ? '<div style="margin-top:4px;">' + suggHtml + '</div>' : ''}
                </div>
            `;
        }).join('');

        suggestionsHtml = `
            <div style="padding:12px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;margin-top:12px;text-align:left;">
                <p style="margin:0 0 8px;color:#92400E;font-weight:700;font-size:0.9rem;">
                    🎯 Suggestions (produits non reconnus) :
                </p>
                ${suggestionsItems}
            </div>
        `;
    }

    // Alertes stock
    var stockHtml = '';
    if (alertesStock.length > 0) {
        stockHtml = `
            <div style="padding:10px 14px;background:#FEE2E2;border:2px solid #EF4444;border-radius:10px;margin-top:12px;text-align:left;">
                <p style="margin:0;color:#991B1B;font-weight:700;font-size:0.9rem;">
                    ⚠️ Alertes stock :
                </p>
                <ul style="margin:6px 0 0;padding-left:20px;color:#991B1B;font-size:0.85rem;">
                    ${alertesStock.map(function(a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('')}
                </ul>
            </div>
        `;
    }

    // Si pas de suggestions ni d'alertes, ne rien afficher
    if (!suggestionsHtml && !stockHtml) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        ${suggestionsHtml}
        ${stockHtml}
    `;
}

// ==================== 🎯 CHOISIR UNE SUGGESTION ====================
function posAiChoisirSuggestion(nomProduit) {
    var produit = window.posProductsList.find(function(p) {
        return (p.nom || '').toLowerCase() === nomProduit.toLowerCase();
    });
    if (!produit) {
        alert('❌ Produit introuvable');
        return;
    }

    // 🆕 v7 : Ajouter au panier temporaire (cumul)
    posAiAjouterAuPanierTemporaire([{
        produit: produit,
        quantite: 1,
        nomOriginal: nomProduit
    }], []);

    console.log('🎯 Suggestion ajoutée :', nomProduit);
}

// ==================== CONFIRMATION AJOUT AU PANIER (PRODUITS UNIQUEMENT) ====================
function posConfirmerAjoutAiVoice() {
    var produits = posAiPanierTemporaire;
    if (!produits || produits.length === 0) {
        alert('❌ Aucun produit à ajouter');
        return;
    }

    if (typeof window.posAddMultipleProductsToCart !== 'function') {
        alert('❌ Erreur : fonction d\'ajout au panier non disponible.');
        return;
    }

    var result = window.posAddMultipleProductsToCart(produits);

    closeModal();

    // 🆕 v7 : Vider le panier temporaire après validation
    posAiPanierTemporaire = [];
    posAiProduitsEnAttente = [];

    if (window.isOnPOSPage && window.isOnPOSPage()) {
        if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
        setTimeout(function() {
            var cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) au panier !';
    if (result.stockAlertes && result.stockAlertes.length > 0) {
        msg += '\n\n⚠️ Stock :\n• ' + result.stockAlertes.join('\n• ');
    }
    alert(msg);
}

// ==================== ANNULATION ====================
function posAnnulerAiVoice() {
    // 🆕 v7 : Vider le panier temporaire
    posAiPanierTemporaire = [];
    posAiProduitsEnAttente = [];

    if (posAiSilenceTimer) {
        clearTimeout(posAiSilenceTimer);
        posAiSilenceTimer = null;
    }

    if (posAiRecognition) {
        posAiManuallyStopped = true;
        try { posAiRecognition.stop(); } catch(e) {}
        posAiRecognition = null;
    }

    if (posAiAbortController) {
        try { posAiAbortController.abort(); } catch(e) {}
        posAiAbortController = null;
    }

    closeModal();
}

// ==================== ALIAS DE COMPATIBILITÉ (anciens noms "Gemini") ====================
window.posOuvrirCommandeVocaleGemini = posOuvrirCommandeVocaleAi;
window.posDemarrerEcouteGemini = posDemarrerEcouteAi;
window.posEnvoyerTexteAGemini = posEnvoyerTexteAAi;
window.posConfirmerAjoutGeminiVoice = posConfirmerAjoutAiVoice;
window.posAnnulerGeminiVoice = posAnnulerAiVoice;
window.posAfficherResultatGeminiVoice = posAfficherResultatAiVoice;
window.posGeminiChoisirSuggestion = posAiChoisirSuggestion;

// ==================== EXPOSITION GLOBALE (nouveaux noms) ====================
window.posOuvrirCommandeVocaleAi = posOuvrirCommandeVocaleAi;
window.posDemarrerEcouteAi = posDemarrerEcouteAi;
window.posEnvoyerTexteAAi = posEnvoyerTexteAAi;
window.posConfirmerAjoutAiVoice = posConfirmerAjoutAiVoice;
window.posAnnulerAiVoice = posAnnulerAiVoice;
window.posAfficherResultatAiVoice = posAfficherResultatAiVoice;
window.posAiChoisirSuggestion = posAiChoisirSuggestion;
window.posAiParler = posAiParler;

// 🆕 v7 : Exposer les fonctions du panier temporaire
window.posAiChangerQuantite = posAiChangerQuantite;
window.posAiSupprimerDuPanier = posAiSupprimerDuPanier;
window.posAiRafraichirPanier = posAiRafraichirPanier;

console.log('🤖 POS-AI.js v7 chargé - PANIER TEMPORAIRE CUMULATIF');
console.log('   ✅ 🎯 PRODUITS UNIQUEMENT (PAS de gestion client)');
console.log('   ❌ 🔊 Synthèse vocale DÉSACTIVÉE (bloquait le micro iPhone)');
console.log('   📱 Détection PWA iPhone → message "Ouvrez dans Safari"');
console.log('   ⚡ Silence de 2s avant arrêt du micro');
console.log('   🔄 Relance auto après no-speech (max 2 fois)');
console.log('   🔒 Vérification HTTPS au démarrage');
console.log('   🎯 Suggestions intelligentes si produit non trouvé');
console.log('   🎨 Alertes stock bas automatiques');
console.log('   💾 Cache des commandes récentes');
console.log('   🆕 v7 : Panier temporaire sous le micro + boutons +/-/🗑');
console.log('   🆕 v7 : Ajout cumulatif entre dictées (clic micro 2ᵉ fois = ajouter)');
console.log('   🆕 v7 : Support darija en latin dans le prompt (khamsa, tlata...)');
