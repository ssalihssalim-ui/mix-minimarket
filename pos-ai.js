// ==================== POS-AI.JS - E-SOLUTION (v5.1 FRANÇAIS - PRODUITS UNIQUEMENT) ====================
// Module IA séparé pour le POS - Commande vocale par Gemini
// ✅ 100% FRANÇAIS (aucune référence à l'arabe/darija)
// ✅ 🎯 Ajoute UNIQUEMENT les PRODUITS (PAS de gestion client)
// ✅ Recherche PRODUIT dans : nom, description, categorie, brand, categories[]
// ✅ ⚡ Micro qui s'arrête après 1.5 SECONDE de silence
// ✅ 🔊 Synthèse vocale FRANÇAISE (voix NORMALE)
// ✅ 🎯 Suggestions intelligentes si produit non trouvé
// ✅ 🎨 Alerte stock bas automatique
// ✅ 💾 Cache des commandes récentes (réponse instantanée)

// ==================== 🔑 CONFIGURATION ====================
const POS_GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';
const POS_GEMINI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ⚡ Silence réduit à 1.5 seconde
const POS_GEMINI_SILENCE_DURATION = 1500;
const POS_GEMINI_CACHE_KEY = 'posGeminiCache';
const POS_GEMINI_CACHE_MAX_AGE = 7 * 24 * 3600000;

// 🔊 Synthèse vocale — FRANÇAIS
const POS_GEMINI_TTS_ENABLED = true;
const POS_GEMINI_TTS_LANG = 'fr-FR';

// ==================== ÉTAT GEMINI ====================
var posGeminiRecognition = null;
var posGeminiEnCours = false;
var posGeminiTranscriptFinal = '';
var posGeminiProduitsEnAttente = [];
var posGeminiSilenceTimer = null;
var posGeminiManuallyStopped = false;
var posGeminiAbortController = null;
var posGeminiCache = null;

// ==================== 🔧 HELPER : NORMALISATION ====================
function posGeminiNormaliser(texte) {
    return (texte || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ==================== 🔊 SYNTHÈSE VOCALE (FRANÇAIS - VOIX NORMALE) ====================
function posGeminiParler(texte) {
    if (!POS_GEMINI_TTS_ENABLED) return;
    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Synthèse vocale non supportée');
        return;
    }

    try { window.speechSynthesis.cancel(); } catch(e) {}

    var utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = POS_GEMINI_TTS_LANG;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    var voices = window.speechSynthesis.getVoices();
    var voixFr = voices.find(function(v) { return v.lang.startsWith('fr') && v.name.includes('Google'); })
              || voices.find(function(v) { return v.lang.startsWith('fr') && v.name.includes('Microsoft'); })
              || voices.find(function(v) { return v.lang.startsWith('fr'); });
    if (voixFr) {
        utterance.voice = voixFr;
        utterance.lang = voixFr.lang;
    }

    window.speechSynthesis.speak(utterance);
    console.log('🔊 TTS (FR) :', texte);
}

// Charger les voix dès qu'elles sont dispo
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
}

// ==================== 💾 CACHE DES COMMANDES RÉCENTES ====================
function posGeminiChargerCache() {
    if (posGeminiCache !== null) return posGeminiCache;
    try {
        var raw = localStorage.getItem(POS_GEMINI_CACHE_KEY);
        if (!raw) {
            posGeminiCache = {};
            return posGeminiCache;
        }
        var data = JSON.parse(raw);
        var now = Date.now();
        Object.keys(data).forEach(function(k) {
            if (now - (data[k].ts || 0) > POS_GEMINI_CACHE_MAX_AGE) {
                delete data[k];
            }
        });
        posGeminiCache = data;
        console.log('💾 Cache chargé :', Object.keys(posGeminiCache).length, 'entrées');
        return posGeminiCache;
    } catch(e) {
        console.warn('⚠️ Erreur chargement cache :', e);
        posGeminiCache = {};
        return posGeminiCache;
    }
}

function posGeminiSauverCache() {
    if (!posGeminiCache) return;
    try {
        localStorage.setItem(POS_GEMINI_CACHE_KEY, JSON.stringify(posGeminiCache));
    } catch(e) {
        console.warn('⚠️ Erreur sauvegarde cache :', e);
    }
}

function posGeminiChercherDansCache(texte) {
    var cache = posGeminiChargerCache();
    var key = posGeminiNormaliser(texte);
    if (cache[key]) {
        console.log('⚡ Cache HIT pour :', key);
        return cache[key];
    }
    return null;
}

function posGeminiStockerDansCache(texte, resultat) {
    var cache = posGeminiChargerCache();
    var key = posGeminiNormaliser(texte);
    cache[key] = {
        ts: Date.now(),
        hits: (cache[key] ? cache[key].hits + 1 : 1),
        result: resultat
    };
    posGeminiSauverCache();
    console.log('💾 Stocké en cache :', key);
}

// ==================== FONCTION PRINCIPALE - OUVERTURE DU MODAL ====================
function posOuvrirCommandeVocaleGemini() {
    console.log('📦 Catalogue actuel :', (window.posProductsList || []).length, 'produits');

    if (posGeminiEnCours) {
        alert('⏳ Une reconnaissance est déjà en cours...');
        return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('❌ La reconnaissance vocale n\'est pas supportée par ce navigateur.\n\nUtilisez Chrome, Edge ou Safari récent.');
        return;
    }

    if (!window.posProductsList || window.posProductsList.length === 0) {
        alert('❌ Aucun produit chargé. Réessayez dans quelques secondes.');
        return;
    }

    posGeminiChargerCache();

    var html = `
        <div style="padding:10px; text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
                <i class="fas fa-robot" style="font-size:2.5rem;color:#8B5CF6;"></i>
                <h3 style="margin:0;font-size:1.3rem;color:#7C3AED;font-weight:700;">Commande vocale Gemini</h3>
            </div>

            <div style="padding:16px;background:linear-gradient(135deg,#F3E8FF,#EDE9FE);border-radius:12px;border:2px solid #8B5CF6;margin-bottom:16px;">
                <p style="margin:0;color:#5B21B6;font-size:1rem;font-weight:600;">💡 Exemples de phrases :</p>
                <p style="margin:8px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Ajouter 3 Merindina et 2 Coca Cola »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« 5 croissants et 1 café »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Deux pizzas et un jus d'orange »</p>
                <p style="margin:10px 0 0;color:#7C3AED;font-size:0.8rem;font-weight:600;">⏱️ Le micro s'arrête après 1.5 seconde de silence</p>
                <p style="margin:4px 0 0;color:#7C3AED;font-size:0.8rem;font-weight:600;">🔊 Gemini vous répond à voix haute</p>
            </div>

            <button id="posGeminiMicBtn" onclick="posDemarrerEcouteGemini()"
                style="width:140px;height:140px;border-radius:50%;border:none;cursor:pointer;
                       background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;
                       font-size:3rem;box-shadow:0 8px 24px rgba(139,92,246,0.4);
                       transition:all 0.3s;display:flex;align-items:center;justify-content:center;
                       margin:20px auto;">
                <i class="fas fa-microphone" id="posGeminiMicIcon"></i>
            </button>

            <p id="posGeminiStatus" style="color:#64748b;font-size:1rem;margin-top:8px;min-height:24px;">Appuyez pour parler</p>

            <div id="posGeminiTranscript" style="margin-top:16px;padding:12px;background:#f8fafc;
                border-radius:10px;border:1px solid #e2e8f0;min-height:50px;
                color:#1e293b;font-size:1rem;text-align:left;display:none;">
                <strong style="color:#8B5CF6;">📝 Transcription :</strong>
                <p id="posGeminiTranscriptText" style="margin:6px 0 0;font-style:italic;"></p>
            </div>

            <div id="posGeminiResult" style="margin-top:16px;display:none;"></div>
        </div>
    `;
    openModal('🎤 Commande vocale', html);
}

// ==================== DÉMARRAGE ÉCOUTE (silence 1.5s) ====================
function posDemarrerEcouteGemini() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    var micBtn = document.getElementById('posGeminiMicBtn');
    var micIcon = document.getElementById('posGeminiMicIcon');
    var status = document.getElementById('posGeminiStatus');
    var transcriptBox = document.getElementById('posGeminiTranscript');
    var transcriptText = document.getElementById('posGeminiTranscriptText');

    if (posGeminiRecognition) {
        posGeminiManuallyStopped = true;
        if (posGeminiSilenceTimer) {
            clearTimeout(posGeminiSilenceTimer);
            posGeminiSilenceTimer = null;
        }
        try { posGeminiRecognition.stop(); } catch(e) {}
        posGeminiRecognition = null;
        posResetGeminiMicUI();
        if (status) status.textContent = 'Écoute arrêtée';
        return;
    }

    posGeminiTranscriptFinal = '';
    posGeminiManuallyStopped = false;
    posGeminiRecognition = new SpeechRecognition();
    posGeminiRecognition.lang = 'fr-FR';
    posGeminiRecognition.continuous = true;
    posGeminiRecognition.interimResults = true;
    posGeminiRecognition.maxAlternatives = 1;

    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg,#EF4444,#DC2626)';
        micBtn.style.animation = 'posPulse 1.5s infinite';
    }
    if (micIcon) micIcon.className = 'fas fa-stop';
    if (status) {
        status.textContent = '🎙️ Je vous écoute... (parlez, puis attendez 1.5s)';
        status.style.color = '#8B5CF6';
        status.style.fontWeight = '700';
    }
    if (transcriptBox) transcriptBox.style.display = 'block';
    if (transcriptText) transcriptText.textContent = '...';

    if (!document.getElementById('posGeminiPulseStyle')) {
        var style = document.createElement('style');
        style.id = 'posGeminiPulseStyle';
        style.textContent = `@keyframes posPulse {
            0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
            70% { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }`;
        document.head.appendChild(style);
    }

    function demarrerTimerSilence() {
        if (posGeminiSilenceTimer) clearTimeout(posGeminiSilenceTimer);
        var statusEl = document.getElementById('posGeminiStatus');
        var fin = Date.now() + POS_GEMINI_SILENCE_DURATION;
        var intervalCompteur = setInterval(function() {
            var reste = Math.ceil((fin - Date.now()) / 1000);
            if (reste > 0 && statusEl && posGeminiRecognition) {
                statusEl.textContent = '⏳ Arrêt dans ' + reste + 's...';
            }
            if (reste <= 0) clearInterval(intervalCompteur);
        }, 100);

        posGeminiSilenceTimer = setTimeout(function() {
            clearInterval(intervalCompteur);
            console.log('⏱️ 1.5s de silence → arrêt auto');
            if (posGeminiRecognition) {
                try { posGeminiRecognition.stop(); } catch(e) {}
            }
        }, POS_GEMINI_SILENCE_DURATION);
    }

    posGeminiRecognition.onstart = function() {
        console.log('🎙️ Micro démarré');
    };

    posGeminiRecognition.onresult = function(event) {
        var interim = '';
        var finalText = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += transcript + ' ';
            else interim += transcript;
        }
        if (finalText) posGeminiTranscriptFinal += finalText;
        var displayText = (posGeminiTranscriptFinal + interim).trim();
        if (transcriptText) transcriptText.textContent = displayText || '...';
        if (displayText.length > 0) demarrerTimerSilence();
    };

    posGeminiRecognition.onerror = function(event) {
        console.error('❌ Erreur reconnaissance vocale :', event.error);
        if (event.error === 'no-speech' && posGeminiTranscriptFinal.trim().length > 0) {
            console.log('ℹ️ no-speech ignoré, on continue');
            return;
        }
        var status = document.getElementById('posGeminiStatus');
        if (status) {
            if (event.error === 'no-speech') status.textContent = '❌ Aucune parole détectée. Réessayez.';
            else if (event.error === 'not-allowed') status.textContent = '❌ Micro non autorisé. Activez-le dans le navigateur.';
            else if (event.error === 'aborted') status.textContent = '⏹️ Écoute arrêtée';
            else status.textContent = '❌ Erreur : ' + event.error;
            status.style.color = '#ef4444';
        }
        if (posGeminiSilenceTimer) {
            clearTimeout(posGeminiSilenceTimer);
            posGeminiSilenceTimer = null;
        }
        posResetGeminiMicUI();
        posGeminiRecognition = null;
    };

    posGeminiRecognition.onend = function() {
        var finalText = posGeminiTranscriptFinal.trim();
        if (posGeminiSilenceTimer) {
            clearTimeout(posGeminiSilenceTimer);
            posGeminiSilenceTimer = null;
        }
        posResetGeminiMicUI();
        posGeminiRecognition = null;

        if (posGeminiManuallyStopped) {
            posGeminiManuallyStopped = false;
            return;
        }

        if (finalText.length < 3) {
            var status = document.getElementById('posGeminiStatus');
            if (status) {
                status.textContent = '⚠️ Rien d\'entendu. Réessayez.';
                status.style.color = '#f59e0b';
            }
            posGeminiParler('Rien entendu. Essayez encore.');
            return;
        }

        var status = document.getElementById('posGeminiStatus');
        if (status) {
            status.textContent = '✅ Commande captée !';
            status.style.color = '#10B981';
        }
        posEnvoyerTexteAGemini(finalText);
    };

    try {
        posGeminiRecognition.start();
    } catch(e) {
        console.error('Impossible de démarrer la reconnaissance :', e);
        alert('❌ Erreur micro : ' + e.message);
        posResetGeminiMicUI();
    }
}

function posResetGeminiMicUI() {
    var micBtn = document.getElementById('posGeminiMicBtn');
    var micIcon = document.getElementById('posGeminiMicIcon');
    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg,#8B5CF6,#7C3AED)';
        micBtn.style.animation = 'none';
    }
    if (micIcon) micIcon.className = 'fas fa-microphone';
}

// ==================== ENVOI À GEMINI (PRODUITS UNIQUEMENT) ====================
async function posEnvoyerTexteAGemini(texte) {
    if (posGeminiEnCours) return;
    posGeminiEnCours = true;

    var status = document.getElementById('posGeminiStatus');
    var resultBox = document.getElementById('posGeminiResult');

    console.log('🎤 Texte entendu :', texte);
    console.log('📦 Produits :', (window.posProductsList || []).length);

    if (status) {
        status.textContent = '🤖 Gemini analyse...';
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

        var cachedResult = posGeminiChercherDansCache(texte);
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

            // ✅ PROMPT 100% FRANÇAIS — PRODUITS UNIQUEMENT
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

            console.log('📤 Envoi au Worker (prompt français - produits uniquement)...');

            if (posGeminiAbortController) {
                try { posGeminiAbortController.abort(); } catch(e) {}
            }
            posGeminiAbortController = new AbortController();
            var timeoutId = setTimeout(function() {
                if (posGeminiAbortController) {
                    try { posGeminiAbortController.abort(); } catch(e) {}
                }
            }, 20000);

            var response = await fetch(POS_GEMINI_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    imageBase64: POS_GEMINI_FAKE_IMAGE
                }),
                signal: posGeminiAbortController.signal
            });

            clearTimeout(timeoutId);
            posGeminiAbortController = null;

            console.log('📥 Status HTTP :', response.status);

            if (!response.ok) {
                var errText = await response.text();
                throw new Error('HTTP ' + response.status + ' : ' + errText.substring(0, 200));
            }

            var data = await response.json();
            if (data.error) throw new Error('Gemini : ' + (data.error.message || JSON.stringify(data.error)));

            var rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            console.log('📝 Réponse brute :', rawText);

            if (!rawText) throw new Error('Gemini n\'a rien répondu.');

            var cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

            try {
                parsed = JSON.parse(cleaned);
                // Si c'est un objet {client, produits}, on prend juste produits
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

            posGeminiStockerDansCache(texte, parsed);
        }

        // S'assurer que c'est un tableau
        var produitsReconnus = Array.isArray(parsed) ? parsed : [];

        console.log('🛒 Produits reconnus :', produitsReconnus);

        if (produitsReconnus.length === 0) {
            if (resultBox) {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;font-size:0.95rem;text-align:left;">
                    ⚠️ <strong>Aucun produit reconnu.</strong><br>
                    <em>Essayez : « Ajouter 3 Merindina et 2 Coca Cola »</em>
                </div>`;
            }
            posGeminiParler('Aucun produit reconnu. Réessayez.');
            posGeminiEnCours = false;
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

            var recNomNorm = posGeminiNormaliser(recNom);
            var motsRecherche = recNomNorm.split(/\s+/).filter(function(m) { return m.length >= 3; });

            console.log('🔍 Recherche produit :', recNom, '| mots:', motsRecherche);

            var produit = null;
            var matchType = '';

            // 1️⃣ Match EXACT sur nom
            produit = window.posProductsList.find(function(p) {
                return posGeminiNormaliser(p.nom) === recNomNorm;
            });
            if (produit) matchType = 'nom exact';

            // 2️⃣ Match EXACT sur description/categorie/brand
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    return posGeminiNormaliser(p.description) === recNomNorm
                        || posGeminiNormaliser(p.categorie) === recNomNorm
                        || posGeminiNormaliser(p.brand) === recNomNorm;
                });
                if (produit) matchType = 'desc/cat/brand exact';
            }

            // 3️⃣ Match PARTIEL sur nom
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pNom = posGeminiNormaliser(p.nom);
                    return pNom.includes(recNomNorm) || recNomNorm.includes(pNom);
                });
                if (produit) matchType = 'nom partiel';
            }

            // 4️⃣ Match PARTIEL sur description/categorie/brand
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pDesc = posGeminiNormaliser(p.description);
                    var pCat = posGeminiNormaliser(p.categorie);
                    var pBrand = posGeminiNormaliser(p.brand);
                    return pDesc.includes(recNomNorm) || pCat.includes(recNomNorm) || pBrand.includes(recNomNorm);
                });
                if (produit) matchType = 'desc/cat/brand partiel';
            }

            // 5️⃣ Match par MOTS-CLÉS pondéré
            if (!produit) {
                var candidats = [];
                window.posProductsList.forEach(function(p) {
                    var pNom = posGeminiNormaliser(p.nom);
                    var pDesc = posGeminiNormaliser(p.description);
                    var pCat = posGeminiNormaliser(p.categorie);
                    var pBrand = posGeminiNormaliser(p.brand);
                    var pCats = (p.categories || []).map(posGeminiNormaliser).join(' ');

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
                        posGeminiNormaliser(p.nom),
                        posGeminiNormaliser(p.description),
                        posGeminiNormaliser(p.categorie),
                        posGeminiNormaliser(p.brand),
                        (p.categories || []).map(posGeminiNormaliser).join(' ')
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

        posAfficherResultatGeminiVoice(produitsValides, resultBox, produitsNonTrouves);

    } catch(e) {
        console.error('❌ Erreur Gemini Voice:', e);
        if (e.name === 'AbortError') {
            if (resultBox) resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;text-align:left;">⏱️ <strong>Délai dépassé.</strong> Réessayez.</div>`;
            posGeminiParler('Délai dépassé. Réessayez.');
        } else {
            if (resultBox) resultBox.innerHTML = `<div style="padding:14px;background:#FEE2E2;border:2px solid #EF4444;border-radius:10px;color:#991B1B;text-align:left;">❌ <strong>Erreur :</strong> ${escapeHtml(e.message)}</div>`;
            posGeminiParler('Erreur. Réessayez.');
        }
    } finally {
        posGeminiEnCours = false;
    }
}

// ==================== AFFICHAGE RÉSULTAT (PRODUITS UNIQUEMENT) ====================
function posAfficherResultatGeminiVoice(produits, container, produitsNonTrouves) {
    if (!container) container = document.getElementById('posGeminiResult');
    if (!container) return;

    produitsNonTrouves = produitsNonTrouves || [];

    var totalGeneral = 0;
    var alertesStock = [];

    var lignesHtml = produits.map(function(item) {
        var p = item.produit;
        var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
        var sousTotal = pr * item.quantite;
        totalGeneral += sousTotal;

        var stockHtml = '';
        if (p.stock !== undefined) {
            if (p.stock <= 0) {
                stockHtml = '<span style="color:#EF4444;font-weight:700;font-size:0.75rem;margin-left:4px;">⛔ Rupture</span>';
                alertesStock.push(p.nom + ' : rupture');
            } else if (p.stock < item.quantite) {
                stockHtml = '<span style="color:#EF4444;font-weight:700;font-size:0.75rem;margin-left:4px;">⚠️ Stock: ' + p.stock + '</span>';
                alertesStock.push(p.nom + ' : seulement ' + p.stock + ' en stock');
            } else if (p.stock <= 5) {
                stockHtml = '<span style="color:#F59E0B;font-weight:700;font-size:0.75rem;margin-left:4px;">⚡ ' + p.stock + ' rest.</span>';
            }
        }

        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 6px;font-weight:600;color:#1e293b;font-size:0.9rem;text-align:left;">
                    ${escapeHtml(p.nom)}${stockHtml}
                </td>
                <td style="padding:8px 6px;text-align:center;color:#8B5CF6;font-weight:700;font-size:1rem;">×${item.quantite}</td>
                <td style="padding:8px 6px;text-align:right;color:#64748b;font-size:0.85rem;">${pr.toFixed(2)} MAD</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:#7C3AED;font-size:0.9rem;">${sousTotal.toFixed(2)} MAD</td>
            </tr>
        `;
    }).join('');

    posGeminiProduitsEnAttente = produits;

    var suggestionsHtml = '';
    if (produitsNonTrouves.length > 0) {
        var suggestionsItems = produitsNonTrouves.map(function(item) {
            var suggHtml = item.suggestions.map(function(sugg) {
                return `<button onclick="posGeminiChoisirSuggestion('${escapeHtml(sugg.nom).replace(/'/g, "\\'")}')" 
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

    container.innerHTML = `
        <div style="padding:14px;background:#F5F3FF;border:2px solid #8B5CF6;border-radius:12px;text-align:left;">
            <p style="margin:0 0 10px;color:#7C3AED;font-weight:700;font-size:1rem;">
                ✅ ${produits.length} produit(s) reconnu(s) :
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead>
                    <tr style="background:#EDE9FE;">
                        <th style="padding:6px;text-align:left;color:#7C3AED;font-size:0.8rem;">Produit</th>
                        <th style="padding:6px;text-align:center;color:#7C3AED;font-size:0.8rem;">Qté</th>
                        <th style="padding:6px;text-align:right;color:#7C3AED;font-size:0.8rem;">Prix</th>
                        <th style="padding:6px;text-align:right;color:#7C3AED;font-size:0.8rem;">Total</th>
                    </tr>
                </thead>
                <tbody>${lignesHtml}</tbody>
            </table>
            <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:2px solid #8B5CF6;">
                <span style="font-weight:700;color:#5B21B6;font-size:1rem;">Total général :</span>
                <span style="font-weight:800;color:#7C3AED;font-size:1.2rem;">${totalGeneral.toFixed(2)} MAD</span>
            </div>
            ${stockHtml}
            ${suggestionsHtml}
            <div style="display:flex;gap:10px;margin-top:16px;">
                <button onclick="posAnnulerGeminiVoice()"
                    style="flex:1;padding:12px;background:#e2e8f0;color:#475569;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;">
                    ❌ Annuler
                </button>
                <button onclick="posConfirmerAjoutGeminiVoice()"
                    style="flex:2;padding:12px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,0.3);">
                    ✅ Ajouter au panier
                </button>
            </div>
        </div>
    `;

    var resume = produits.length + ' produit' + (produits.length > 1 ? 's' : '') + ' reconnu' + (produits.length > 1 ? 's' : '') + '. ';
    resume += 'Total ' + totalGeneral.toFixed(0) + ' dirhams.';
    posGeminiParler(resume);
}

// ==================== 🎯 CHOISIR UNE SUGGESTION ====================
function posGeminiChoisirSuggestion(nomProduit) {
    var produit = window.posProductsList.find(function(p) {
        return (p.nom || '').toLowerCase() === nomProduit.toLowerCase();
    });
    if (!produit) {
        alert('❌ Produit introuvable');
        return;
    }

    posGeminiProduitsEnAttente.push({
        produit: produit,
        quantite: 1,
        nomOriginal: nomProduit
    });

    console.log('🎯 Suggestion ajoutée :', nomProduit);

    var resultBox = document.getElementById('posGeminiResult');
    posAfficherResultatGeminiVoice(
        posGeminiProduitsEnAttente,
        resultBox,
        []
    );

    posGeminiParler(nomProduit + ' ajouté.');
}

// ==================== CONFIRMATION AJOUT AU PANIER (PRODUITS UNIQUEMENT) ====================
function posConfirmerAjoutGeminiVoice() {
    var produits = posGeminiProduitsEnAttente;
    if (!produits || produits.length === 0) {
        alert('❌ Aucun produit à ajouter');
        return;
    }

    // ============================================================
    // ✅ Ajouter UNIQUEMENT les produits au panier
    // ⚠️ AUCUNE gestion de client
    // ============================================================
    if (typeof window.posAddMultipleProductsToCart !== 'function') {
        alert('❌ Erreur : fonction d\'ajout au panier non disponible.');
        return;
    }

    var result = window.posAddMultipleProductsToCart(produits);

    // Fermer le modal
    closeModal();

    // Vider les données en attente
    posGeminiProduitsEnAttente = [];

    // Rafraîchir l'affichage du panier
    if (window.isOnPOSPage && window.isOnPOSPage()) {
        if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
        setTimeout(function() {
            var cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    // Message de confirmation
    var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) au panier !';
    if (result.stockAlertes && result.stockAlertes.length > 0) {
        msg += '\n\n⚠️ Stock :\n• ' + result.stockAlertes.join('\n• ');
    }
    alert(msg);

    // Annonce vocale
    posGeminiParler(result.ajoutCount + ' article' + (result.ajoutCount > 1 ? 's' : '') + ' ajouté' + (result.ajoutCount > 1 ? 's' : '') + '.');
}

// ==================== ANNULATION ====================
function posAnnulerGeminiVoice() {
    posGeminiProduitsEnAttente = [];

    if (posGeminiSilenceTimer) {
        clearTimeout(posGeminiSilenceTimer);
        posGeminiSilenceTimer = null;
    }

    if (posGeminiRecognition) {
        posGeminiManuallyStopped = true;
        try { posGeminiRecognition.stop(); } catch(e) {}
        posGeminiRecognition = null;
    }

    if (posGeminiAbortController) {
        try { posGeminiAbortController.abort(); } catch(e) {}
        posGeminiAbortController = null;
    }

    try { window.speechSynthesis.cancel(); } catch(e) {}

    closeModal();
}

// ==================== EXPOSITION GLOBALE ====================
window.posOuvrirCommandeVocaleGemini = posOuvrirCommandeVocaleGemini;
window.posDemarrerEcouteGemini = posDemarrerEcouteGemini;
window.posEnvoyerTexteAGemini = posEnvoyerTexteAGemini;
window.posConfirmerAjoutGeminiVoice = posConfirmerAjoutGeminiVoice;
window.posAnnulerGeminiVoice = posAnnulerGeminiVoice;
window.posAfficherResultatGeminiVoice = posAfficherResultatGeminiVoice;
window.posGeminiChoisirSuggestion = posGeminiChoisirSuggestion;
window.posGeminiParler = posGeminiParler;

console.log('🤖 POS-AI.js v5.1 chargé - 100% FRANÇAIS + Micro 1.5s');
console.log('   ✅ 🎯 PRODUITS UNIQUEMENT (PAS de gestion client)');
console.log('   ✅ Aucune référence à l\'arabe/darija');
console.log('   ✅ Détection PRODUIT (nom + description + categorie + brand + categories[])');
console.log('   ⚡ Silence de 1.5s avant arrêt du micro (rapide)');
console.log('   🔊 Synthèse vocale FRANÇAISE');
console.log('   🎯 Suggestions intelligentes si produit non trouvé');
console.log('   🎨 Alertes stock bas automatiques');
console.log('   💾 Cache des commandes récentes');
