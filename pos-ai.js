// ==================== POS-AI.JS - E-SOLUTION (v6.3.4 - FIX BOUCLE 2E CLIC MICRO) ====================
// Module IA séparé pour le POS - Commande vocale
// ✅ 100% FRANÇAIS
// ✅ 🎯 Ajoute UNIQUEMENT les PRODUITS
// ✅ Recherche PRODUIT dans : nom, description, categorie, brand, categories[]
// ✅ ⚡ Micro qui s'arrête après 2 SECONDES de silence
// ❌ 🔊 Synthèse vocale DÉSACTIVÉE (elle bloquait le micro sur iPhone)
// ✅ 🎯 Suggestions intelligentes si produit non trouvé
// ✅ 🎨 Alerte stock bas automatique
// ✅ 💾 Cache des commandes récentes
// ✅ 📱 Détection PWA iPhone → message "Ouvrez dans Safari"
// ✅ Panier temporaire minimal (boutons +/-/🗑) + ajout cumulatif
// 🆕 v6.3.1 : la DESCRIPTION est envoyée à Gemini — cherchée exactement comme le nom
// 🆕 v6.3.2 : FIX fond du modal → blanc opaque (fin de la transparence)
// 🆕 v6.3.3 : FIX conflit micro — arrêt automatique de POS-AUDIO au démarrage
// 🆕 v6.3.4 : FIX boucle 2ᵉ clic micro — destruction propre + garde anti-double-clic

// ==================== 🔑 CONFIGURATION ====================
const POS_AI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';
const POS_AI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ⚡ Silence 2 secondes
const POS_AI_SILENCE_DURATION = 2000;
const POS_AI_CACHE_KEY = 'posGeminiCache';
const POS_AI_CACHE_MAX_AGE = 7 * 24 * 3600000;

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

// Panier temporaire cumulatif
var posAiPanierTemporaire = [];

// ==================== 🆕 v6.3.2 : FIX FOND BLANC MODAL ====================
(function injecterFixFondModal() {
    if (document.getElementById('posAiFixFondModal')) return;
    var style = document.createElement('style');
    style.id = 'posAiFixFondModal';
    style.textContent = `
        .modal-content,
        .ac-modal,
        .ac-form-modal,
        .ac-modal-overlay > .ac-modal,
        .ac-form-overlay > .ac-form-modal,
        div[role="dialog"],
        .modal > div,
        .modal-content > div {
            background-color: #FFFFFF !important;
            background-image: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            opacity: 1 !important;
        }
        .modal-overlay,
        .ac-modal-overlay,
        .ac-form-overlay,
        .modal-overlay.active {
            background-color: rgba(15, 23, 42, 0.65) !important;
        }
        .ac-modal-header,
        .ac-form-header,
        .ac-modal-body,
        .ac-form-body,
        .ac-modal-footer,
        .ac-form-footer {
            background-color: #FFFFFF !important;
        }
        .ac-modal-body {
            background-color: #FFFFFF !important;
        }
        .ac-form-body {
            background-color: #FAFBFC !important;
        }
    `;
    document.head.appendChild(style);
    console.log('🎨 [pos-ai] Fix fond blanc modal injecté');
})();

// ==================== 🆕 v6.3.3 : FIX CONFLIT MICRO (arrêter POS-AUDIO) ====================
function posAiArreterAudioSiActif() {
    try {
        console.log('🔍 [pos-ai] Vérification de POS-AUDIO avant démarrage...');
        
        if (typeof window.posStopVoiceSearch === 'function') {
            console.log('🛑 [pos-ai] Arrêt de posStopVoiceSearch()');
            window.posStopVoiceSearch();
        }
        
        if (typeof voiceRecognition !== 'undefined' && voiceRecognition) {
            console.log('🛑 [pos-ai] Arrêt de voiceRecognition (pos-audio)');
            try { voiceRecognition.abort(); } catch(e) { console.warn(e); }
            try { voiceRecognition.stop(); } catch(e) { console.warn(e); }
            voiceRecognition = null;
        }
        
        if (typeof isRecording !== 'undefined' && isRecording) {
            console.log('🛑 [pos-ai] isRecording = false');
            isRecording = false;
        }
        
        if (typeof window.hideVoiceFlowIndicator === 'function') {
            try { window.hideVoiceFlowIndicator(); } catch(e) {}
        }
        
        var micBtnAudio = document.getElementById('posMicBtn');
        if (micBtnAudio) {
            micBtnAudio.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtnAudio.style.background = '#dcfce7';
            micBtnAudio.style.borderColor = '#16a34a';
        }
        
        var voiceDisplay = document.getElementById('voiceDisplay');
        if (voiceDisplay) voiceDisplay.style.display = 'none';
        
        console.log('✅ [pos-ai] POS-AUDIO arrêté avec succès');
    } catch(e) {
        console.warn('⚠️ [pos-ai] Erreur arrêt POS-AUDIO:', e);
    }
}

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

    posAiArreterAudioSiActif();

    if (posAiEnCours) {
        alert('⏳ Une reconnaissance est déjà en cours...');
        return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert(
            '🔒 Connexion non sécurisée détectée\n\n' +
            '⚠️ La reconnaissance vocale EXIGE une connexion HTTPS.\n\n' +
            '✅ Solution : utilisez https:// au lieu de http://'
        );
        return;
    }

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
        <div style="padding:10px; text-align:center; background:#FFFFFF;">
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

    setTimeout(function() {
        var modals = document.querySelectorAll('.ac-modal, .modal-content, [role="dialog"]');
        modals.forEach(function(m) {
            m.style.background = '#FFFFFF';
            m.style.backgroundColor = '#FFFFFF';
        });
    }, 50);

    posAiRafraichirPanier();
}

// ==================== AFFICHAGE DU PANIER ====================
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

// ==================== CHANGER QUANTITÉ ====================
function posAiChangerQuantite(index, delta) {
    if (!posAiPanierTemporaire || !posAiPanierTemporaire[index]) return;
    var item = posAiPanierTemporaire[index];
    var nouvelleQte = (item.quantite || 1) + delta;

    if (nouvelleQte < 1) {
        posAiSupprimerDuPanier(index);
        return;
    }

    var produit = item.produit;
    if (produit && produit.stock !== undefined && nouvelleQte > produit.stock) {
        alert('⚠️ Stock insuffisant (max : ' + produit.stock + ')');
        return;
    }

    item.quantite = nouvelleQte;
    posAiRafraichirPanier();
}

// ==================== SUPPRIMER DU PANIER ====================
function posAiSupprimerDuPanier(index) {
    if (!posAiPanierTemporaire || !posAiPanierTemporaire[index]) return;
    posAiPanierTemporaire.splice(index, 1);
    posAiRafraichirPanier();
}

// ==================== DÉMARRAGE ÉCOUTE (silence 2s) ====================
function posDemarrerEcouteAi() {
    // 🆕 v6.3.3 : ARRÊTER POS-AUDIO AVANT TOUT
    posAiArreterAudioSiActif();

    // 🆕 v6.3.4 : GARDE ANTI DOUBLE-CLIC (si analyse en cours)
    if (posAiEnCours) {
        console.log('⏳ [pos-ai] Analyse en cours, ignorer le clic');
        return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    var micBtn = document.getElementById('posAiMicBtn');
    var micIcon = document.getElementById('posAiMicIcon');
    var status = document.getElementById('posAiStatus');
    var transcriptBox = document.getElementById('posAiTranscript');
    var transcriptText = document.getElementById('posAiTranscriptText');

    // 🆕 v6.3.4 : DÉTRUIRE L'ANCIEN OBJET PROPREMENT (plus de ghost)
    if (posAiRecognition) {
        console.log('🛑 [pos-ai] Destruction propre de l\'ancien SpeechRecognition');
        posAiManuallyStopped = true;
        if (posAiSilenceTimer) {
            clearTimeout(posAiSilenceTimer);
            posAiSilenceTimer = null;
        }
        try { posAiRecognition.abort(); } catch(e) {}
        try { posAiRecognition.stop(); } catch(e) {}
        // Nettoyer TOUS les handlers pour empêcher les callbacks fantômes
        try { posAiRecognition.onresult = null; } catch(e) {}
        try { posAiRecognition.onerror = null; } catch(e) {}
        try { posAiRecognition.onend = null; } catch(e) {}
        try { posAiRecognition.onstart = null; } catch(e) {}
        posAiRecognition = null;
        posResetAiMicUI();
        if (status) status.textContent = 'Écoute arrêtée';
        return;
    }

    posAiTranscriptFinal = '';
    posAiManuallyStopped = false;
    posAiCompteurNoSpeech = 0;

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
    };

    posAiRecognition.onresult = function(event) {
        // 🆕 v6.3.4 : GARDE — ignorer si reconnaissance détruite entre temps
        if (!posAiRecognition) {
            console.log('⏭️ [pos-ai] onresult ignoré : reconnaissance déjà détruite');
            return;
        }

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
        // 🆕 v6.3.4 : GARDE — ignorer si reconnaissance détruite entre temps
        if (!posAiRecognition) {
            console.log('⏭️ [pos-ai] onerror ignoré : reconnaissance déjà détruite');
            return;
        }

        console.error('❌ Erreur reconnaissance vocale :', event.error);

        if (event.error === 'no-speech' && posAiTranscriptFinal.trim().length > 0) {
            return;
        }

        // 🆕 v6.3.4 : SUPPRESSION DE LA RELANCE AUTO (cause de boucle au 2ᵉ clic)
        if (event.error === 'no-speech') {
            console.log('🎙️ [pos-ai] no-speech : arrêt définitif (pas de relance auto)');
            var status = document.getElementById('posAiStatus');
            if (status) {
                status.textContent = '🎙️ Aucune parole détectée. Réessayez.';
                status.style.color = '#f59e0b';
            }
            if (posAiSilenceTimer) {
                clearTimeout(posAiSilenceTimer);
                posAiSilenceTimer = null;
            }
            posResetAiMicUI();
            posAiRecognition = null;
            return;
        }

        var status = document.getElementById('posAiStatus');
        if (status) {
            if (event.error === 'not-allowed') {
                status.textContent = '🔒 Micro bloqué.';
            } else if (event.error === 'aborted') {
                status.textContent = '⏹️ Écoute arrêtée';
            } else if (event.error === 'audio-capture') {
                status.textContent = '🎤 Micro indisponible.';
            } else if (event.error === 'network') {
                status.textContent = '🌐 Problème réseau.';
            } else {
                status.textContent = '⚠️ Problème micro (' + event.error + ').';
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
        // 🆕 v6.3.4 : GARDE — ignorer si reconnaissance détruite entre temps
        if (!posAiRecognition) {
            console.log('⏭️ [pos-ai] onend ignoré : reconnaissance déjà détruite');
            return;
        }

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
                status.textContent = '🎙️ Aucune parole captée.';
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
        posAiRecognition = null;
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
            console.log('⚡ Utilisation du cache');
            parsed = cachedResult.result;
            if (status) status.textContent = '⚡ Réponse du cache';
        } else {
            if (window.posProductsList.length === 0) throw new Error('Aucun produit valide');

            var productListStr = window.posProductsList.slice(0, 300).map(function(p) {
                var nom = (p.nom || '').replace(/"/g, '\\"');
                var desc = (p.description || '').substring(0, 50).replace(/"/g, '\\"');
                if (desc) {
                    return '"' + nom + ' | ' + desc + '"';
                }
                return '"' + nom + '"';
            }).join(', ');

            var prompt = `Tu es un assistant de point de vente. Analyse la commande dictée en FRANÇAIS.

PHRASE DITE :
"${texte}"

CATALOGUE DE PRODUITS DISPONIBLES (format "Nom | Description") :
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

🆕 RÈGLE IMPORTANTE — LE NOM ET LA DESCRIPTION SONT ÉGAUX :
- Chaque produit est présenté au format "Nom | Description".
- Si l'utilisateur dit un mot qui est dans le NOM → match (comme avant)
- Si l'utilisateur dit un mot qui est dans la DESCRIPTION → match AUSSI (nouveau)
- Les deux sont traités EXACTEMENT PAREIL.
- Ex : "Chocolat | mini dia 100g" — si l'utilisateur dit "mini dia" → retourner "Chocolat"
- Ex : "Pepsi 33cl | boisson gazeuse" — si l'utilisateur dit "gazeuse" → retourner "Pepsi 33cl"
- Ex : "Coca-Cola Zéro | sans sucre" — si l'utilisateur dit "sans sucre" → retourner "Coca-Cola Zéro"

⚠️ IGNORE COMPLÈTEMENT tout nom de personne ou de client mentionné (ex: "client Ahmed", "pour Fatima", "au nom de Youssef"). Ne retourne QUE les produits.

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

Ex 8 : "3 mini dia et 2 sans sucre"
→ [{"nom": "Chocolat", "quantite": 3}, {"nom": "Coca-Cola Zéro", "quantite": 2}]
(match sur la description — exactement comme sur le nom)

═══════════════════════════════════════════════════════
📤 FORMAT DE SORTIE (JSON ARRAY UNIQUEMENT) :
═══════════════════════════════════════════════════════

[
  { "nom": "Nom EXACT du produit du catalogue (SANS la description après le |)", "quantite": 3 }
]

═══════════════════════════════════════════════════════
⚠️ RÈGLES STRICTES :
═══════════════════════════════════════════════════════

- Le "nom" DOIT être une COPIE EXACTE du NOM (partie avant le "|", sans la description).
- Si tu vois "Chocolat | mini dia 100g" et que l'utilisateur dit "mini dia", retourne "Chocolat".
- Si tu vois "Pepsi 33cl | boisson gazeuse" et que l'utilisateur dit "gazeuse", retourne "Pepsi 33cl".
- Le NOM et la DESCRIPTION sont cherchés EXACTEMENT PAREIL. Aucune différence de priorité.
- Ne change JAMAIS la casse, les accents, ou la ponctuation du nom du catalogue.
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

        var produitsValides = [];
        var produitsNonTrouves = [];

        produitsReconnus.forEach(function(rec) {
            var recNom = (rec.nom || '').trim();
            if (!recNom) return;

            var recNomNorm = posAiNormaliser(recNom);
            var motsRecherche = recNomNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });

            var produit = null;
            var matchType = '';

            produit = window.posProductsList.find(function(p) {
                return posAiNormaliser(p.nom) === recNomNorm
                    || posAiNormaliser(p.description) === recNomNorm
                    || posAiNormaliser(p.brand) === recNomNorm
                    || posAiNormaliser(p.categorie) === recNomNorm;
            });
            if (produit) matchType = 'exact (nom/desc/brand/cat)';

            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pNom = posAiNormaliser(p.nom);
                    var pDesc = posAiNormaliser(p.description);
                    var pBrand = posAiNormaliser(p.brand);
                    var pCat = posAiNormaliser(p.categorie);
                    return pNom.includes(recNomNorm) || recNomNorm.includes(pNom)
                        || pDesc.includes(recNomNorm) || recNomNorm.includes(pDesc)
                        || pBrand.includes(recNomNorm)
                        || pCat.includes(recNomNorm);
                });
                if (produit) matchType = 'partiel (nom/desc/brand/cat)';
            }

            if (!produit) {
                var candidats = [];
                window.posProductsList.forEach(function(p) {
                    var pNom = posAiNormaliser(p.nom);
                    var pDesc = posAiNormaliser(p.description);
                    var pCat = posAiNormaliser(p.categorie);
                    var pBrand = posAiNormaliser(p.brand);
                    var pCats = (p.categories || []).map(posAiNormaliser).join(' ');

                    var score = 0;

                    motsRecherche.forEach(function(mot) {
                        if (pNom.includes(mot)) { score += mot.length * 3; }
                        else if (pDesc.includes(mot)) { score += mot.length * 2; }
                        else if (pCat.includes(mot) || pCats.includes(mot)) { score += mot.length * 1.5; }
                        else if (pBrand.includes(mot)) { score += mot.length * 1.5; }
                    });

                    if (pDesc.includes(recNomNorm)) score += 50;

                    if (score > 0) {
                        candidats.push({ produit: p, score: score });
                    }
                });

                candidats.sort(function(a, b) { return b.score - a.score; });

                if (candidats.length > 0) {
                    if (candidats[0].score >= 20) {
                        produit = candidats[0].produit;
                        matchType = 'mots-clés (score ' + candidats[0].score + ')';
                    } else {
                        produitsNonTrouves.push({
                            nomOriginal: recNom,
                            suggestions: candidats.slice(0, 3).map(function(c) { return c.produit; })
                        });
                        return;
                    }
                }
            }

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
                produitsValides.push({
                    produit: produit,
                    quantite: Math.max(1, parseInt(rec.quantite, 10) || 1),
                    nomOriginal: recNom,
                    matchType: matchType
                });
            } else {
                produitsNonTrouves.push({ nomOriginal: recNom, suggestions: [] });
            }
        });

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

// ==================== AJOUTER AU PANIER (cumul) ====================
function posAiAjouterAuPanierTemporaire(produitsValides, produitsNonTrouves) {
    produitsNonTrouves = produitsNonTrouves || [];

    if (!produitsValides || produitsValides.length === 0) {
        var resultBox = document.getElementById('posAiResult');
        if (resultBox) {
            if (produitsNonTrouves.length > 0) {
                posAfficherResultatAiVoice([], resultBox, produitsNonTrouves);
            } else {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;font-size:0.95rem;text-align:left;">
                    ⚠️ <strong>Aucun produit reconnu.</strong>
                </div>`;
            }
        }
        return;
    }

    produitsValides.forEach(function(nouveau) {
        var existant = posAiPanierTemporaire.find(function(item) {
            return item.produit && item.produit.id === nouveau.produit.id;
        });

        if (existant) {
            existant.quantite = (existant.quantite || 1) + (nouveau.quantite || 1);
        } else {
            posAiPanierTemporaire.push(nouveau);
        }
    });

    posAiRafraichirPanier();

    var resultBox = document.getElementById('posAiResult');
    if (resultBox && produitsNonTrouves.length > 0) {
        posAfficherResultatAiVoice(posAiPanierTemporaire, resultBox, produitsNonTrouves);
    } else if (resultBox) {
        resultBox.style.display = 'none';
    }

    var status = document.getElementById('posAiStatus');
    if (status) {
        status.textContent = '✅ ' + produitsValides.length + ' produit(s) ajouté(s) — cliquez sur 🎤 pour en ajouter d\'autres';
        status.style.color = '#10B981';
    }
}

// ==================== AFFICHAGE RÉSULTAT (SUGGESTIONS + ALERTES STOCK) ====================
function posAfficherResultatAiVoice(produits, container, produitsNonTrouves) {
    if (!container) container = document.getElementById('posAiResult');
    if (!container) return;

    produitsNonTrouves = produitsNonTrouves || [];

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

    if (!suggestionsHtml && !stockHtml) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = suggestionsHtml + stockHtml;
}

// ==================== CHOISIR UNE SUGGESTION ====================
function posAiChoisirSuggestion(nomProduit) {
    var produit = window.posProductsList.find(function(p) {
        return posAiNormaliser(p.nom) === posAiNormaliser(nomProduit);
    });
    if (!produit) {
        alert('❌ Produit introuvable');
        return;
    }

    posAiAjouterAuPanierTemporaire([{
        produit: produit,
        quantite: 1,
        nomOriginal: nomProduit
    }], []);
}

// ==================== CONFIRMATION AJOUT AU PANIER ====================
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
    posAiPanierTemporaire = [];
    posAiProduitsEnAttente = [];

    if (posAiSilenceTimer) {
        clearTimeout(posAiSilenceTimer);
        posAiSilenceTimer = null;
    }

    if (posAiRecognition) {
        posAiManuallyStopped = true;
        try { posAiRecognition.abort(); } catch(e) {}
        try { posAiRecognition.stop(); } catch(e) {}
        try { posAiRecognition.onresult = null; } catch(e) {}
        try { posAiRecognition.onerror = null; } catch(e) {}
        try { posAiRecognition.onend = null; } catch(e) {}
        try { posAiRecognition.onstart = null; } catch(e) {}
        posAiRecognition = null;
    }

    if (posAiAbortController) {
        try { posAiAbortController.abort(); } catch(e) {}
        posAiAbortController = null;
    }

    closeModal();
}

// ==================== ALIAS DE COMPATIBILITÉ ====================
window.posOuvrirCommandeVocaleGemini = posOuvrirCommandeVocaleAi;
window.posDemarrerEcouteGemini = posDemarrerEcouteAi;
window.posEnvoyerTexteAGemini = posEnvoyerTexteAAi;
window.posConfirmerAjoutGeminiVoice = posConfirmerAjoutAiVoice;
window.posAnnulerGeminiVoice = posAnnulerAiVoice;
window.posAfficherResultatGeminiVoice = posAfficherResultatAiVoice;
window.posGeminiChoisirSuggestion = posAiChoisirSuggestion;

// ==================== EXPOSITION GLOBALE ====================
window.posOuvrirCommandeVocaleAi = posOuvrirCommandeVocaleAi;
window.posDemarrerEcouteAi = posDemarrerEcouteAi;
window.posEnvoyerTexteAAi = posEnvoyerTexteAAi;
window.posConfirmerAjoutAiVoice = posConfirmerAjoutAiVoice;
window.posAnnulerAiVoice = posAnnulerAiVoice;
window.posAfficherResultatAiVoice = posAfficherResultatAiVoice;
window.posAiChoisirSuggestion = posAiChoisirSuggestion;
window.posAiParler = posAiParler;
window.posAiArreterAudioSiActif = posAiArreterAudioSiActif;

// Exposer les fonctions du panier
window.posAiChangerQuantite = posAiChangerQuantite;
window.posAiSupprimerDuPanier = posAiSupprimerDuPanier;
window.posAiRafraichirPanier = posAiRafraichirPanier;

console.log('🤖 POS-AI.js v6.3.4 chargé');
console.log('   ✅ 2s silence');
console.log('   ✅ Panier temporaire avec +/−/🗑');
console.log('   ✅ Ajout cumulatif entre dictées');
console.log('   🆕 v6.3.1 : description envoyée à Gemini — cherchée EXACTEMENT comme le nom');
console.log('   🆕 v6.3.2 : fix fond blanc modal (fini la transparence)');
console.log('   🆕 v6.3.3 : fix conflit micro — arrêt auto de POS-AUDIO au démarrage');
console.log('   🆕 v6.3.4 : fix boucle 2ᵉ clic micro — destruction propre + garde anti-double-clic');
