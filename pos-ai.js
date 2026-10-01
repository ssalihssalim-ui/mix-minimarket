// ==================== POS-AI.JS - E-SOLUTION (VERSION INTELLIGENTE v2.3 FR) ====================
// Module IA séparé pour le POS - Commande vocale par Gemini
// ✅ Comprend la DARIJA marocaine (lettres latines)
// ✅ Détecte automatiquement le CLIENT dans la phrase
// ✅ Recherche CLIENT par SCORE pondéré : nom(50) + prenom(50) + username(40) + description(40) + tel(30) + adresse(10) + email(10)
// ✅ Extraction du nom par mots-clés si Gemini échoue
// ✅ Recherche PRODUIT dans : nom, description, categorie, brand, categories[]
// ✅ Micro qui s'arrête après 3 SECONDES DE SILENCE
// ✅ 🔊 Synthèse vocale FRANÇAISE (voix NORMALE)
// ✅ 🎯 Suggestions intelligentes si produit non trouvé
// ✅ 🎨 Alerte stock bas automatique
// ✅ 💾 Cache des commandes récentes (réponse instantanée)

// ==================== 🔑 CONFIGURATION ====================
const POS_GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';
const POS_GEMINI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const POS_GEMINI_SILENCE_DURATION = 3000;
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
var posGeminiClientEnAttente = null;
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
    utterance.rate = 1.0;    // 🐢 Vitesse NORMALE
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
    console.log('👥 Clients disponibles :', (window.posAllClients || []).length, 'clients');

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
                <p style="margin:8px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Zid 3 Merindina w 2 Coca Cola »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Client Ahmed, 5 croissants w 1 café »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« L Fatima, 2 boisson gazeuse »</p>
                <p style="margin:10px 0 0;color:#7C3AED;font-size:0.8rem;font-weight:600;">⏱️ Le micro s'arrête après 3 secondes de silence</p>
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

// ==================== DÉMARRAGE ÉCOUTE (silence 3s) ====================
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
        status.textContent = '🎙️ Je vous écoute... (parlez, puis attendez 3 secondes)';
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
        var compteur = 3;
        var statusEl = document.getElementById('posGeminiStatus');
        var intervalCompteur = setInterval(function() {
            compteur--;
            if (compteur >= 0 && statusEl && posGeminiRecognition) {
                statusEl.textContent = '⏳ Arrêt dans ' + compteur + 's...';
            }
            if (compteur < 0) clearInterval(intervalCompteur);
        }, 1000);

        posGeminiSilenceTimer = setTimeout(function() {
            clearInterval(intervalCompteur);
            console.log('⏱️ 3 secondes de silence → arrêt auto');
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

// ==================== ENVOI À GEMINI ====================
async function posEnvoyerTexteAGemini(texte) {
    if (posGeminiEnCours) return;
    posGeminiEnCours = true;

    var status = document.getElementById('posGeminiStatus');
    var resultBox = document.getElementById('posGeminiResult');

    console.log('🎤 Texte entendu :', texte);
    console.log('📦 Produits :', (window.posProductsList || []).length);
    console.log('👥 Clients :', (window.posAllClients || []).length);

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

            // ✅ PROMPT "TURBO DARIJA"
            var prompt = `You are an expert in Moroccan Darija (الدارجة المغربية) and French. You help a POS system.

USER SAID (in Darija or French, written with latin letters):
"${texte}"

PRODUCT CATALOG:
[${productListStr}]

⚠️ CRITICAL: The user speaks DARIJA. Understand Darija words.

═══════════════════════════════════════════════════════
📚 DARIJA VOCABULARY:
═══════════════════════════════════════════════════════

🔢 NUMBERS:
- wahed / wahd / wa7ed / un / 1 → 1
- jouj / juj / zouj / deux / 2 → 2
- tlata / tlatha / tleta / trois / 3 → 3
- rbaa / rba / arba / quatre / 4 → 4
- khamsa / khams / cinq / 5 → 5
- setta / sett / six / 6 → 6
- sebaa / seba / sept / 7 → 7
- tmania / tmen / huit / 8 → 8
- tseoud / tse3 / neuf / 9 → 9
- aachra / achra / 3achra / dix / 10 → 10

🛒 COMMAND WORDS (to IGNORE):
- zid / zid liya / zid lia = add
- bghit / kanbghi = I want
- 3tini / 3tina / atini = give me
- dir / dir liya = do
- 3afak / afak = please
- safi / sf / sefi = that's it
- chokran / choukran = thanks
- ana = me/I
- liya / lia = for me
- w / o / ou / wa = and
- fin / wach = question words
- bzzaf = a lot

👤 CLIENT INDICATORS (return EXACT name as spoken):
- "client X" / "l-client X" → client = "X"
- "pour X" / "pour l X" → client = "X"
- "li X" / "l X" / "lli X" → client = "X"
- "si X" / "lalla X" → client = "X"
- "m3a X" / "m3a client X" → client = "X"
- Name alone at start/end → client = "Name"

═══════════════════════════════════════════════════════
📝 EXAMPLES:
═══════════════════════════════════════════════════════

Ex 1: "Zid 3 Merindina w 2 Coca Cola"
→ { "client": null, "produits": [{"nom": "Merindina", "quantite": 3}, {"nom": "Coca Cola", "quantite": 2}] }

Ex 2: "Client Ahmed, zid 3 Merindina"
→ { "client": "Ahmed", "produits": [{"nom": "Merindina", "quantite": 3}] }

Ex 3: "Bghit tlata pizza w wahed jus"
→ { "client": null, "produits": [{"nom": "Pizza", "quantite": 3}, {"nom": "Jus", "quantite": 1}] }

Ex 4: "L Fatima, jouj croissant w khamsa atay"
→ { "client": "Fatima", "produits": [{"nom": "Croissant", "quantite": 2}, {"nom": "Atay", "quantite": 5}] }

Ex 5: "3tini setta msemen, client Youssef"
→ { "client": "Youssef", "produits": [{"nom": "Msemen", "quantite": 6}] }

Ex 6: "Ahmed, zid 3 Merindina"
→ { "client": "Ahmed", "produits": [{"nom": "Merindina", "quantite": 3}] }

Ex 7: "Zid 2 Coca pour Fatima"
→ { "client": "Fatima", "produits": [{"nom": "Coca Cola", "quantite": 2}] }

Ex 8: "Pour le client footballeur, zid 3 Merindina"
→ { "client": "footballeur", "produits": [{"nom": "Merindina", "quantite": 3}] }

═══════════════════════════════════════════════════════
🎯 MISSION:
═══════════════════════════════════════════════════════

Return ONLY a JSON object (no text before/after):

{
  "client": "Name or description word" or null,
  "produits": [
    { "nom": "EXACT name from catalog", "quantite": 3 }
  ]
}

RULES:
- "nom" = exact match from catalog.
- Ignore products not in catalog.
- For "client": if the user says a NAME or DESCRIPTION WORD, return it EXACTLY as spoken (e.g., "footballeur", "Ahmed", "Fatima"). The app will search in nom, prenom, username, description.
- If no client, "client": null.
- No text around JSON.`.trim();

            console.log('📤 Envoi au Worker...');

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
            } catch(e) {
                console.warn('⚠️ Parsing JSON échoué, tentative regex...');
                var regex = /["']nom["']\s*:\s*["']([^"']+)["']\s*,\s*["']quantite["']\s*:\s*(\d+)/gi;
                var match;
                var fallbackProduits = [];
                while ((match = regex.exec(cleaned)) !== null) {
                    fallbackProduits.push({ nom: match[1].trim(), quantite: parseInt(match[2], 10) || 1 });
                }
                parsed = { client: null, produits: fallbackProduits };
            }

            posGeminiStockerDansCache(texte, parsed);
        }

        var clientDetecte = null;
        var produitsReconnus = [];

        if (Array.isArray(parsed)) {
            produitsReconnus = parsed;
        } else if (parsed && typeof parsed === 'object') {
            clientDetecte = parsed.client || null;
            produitsReconnus = Array.isArray(parsed.produits) ? parsed.produits : [];
        }

        console.log('👤 Client détecté :', clientDetecte);
        console.log('🛒 Produits reconnus :', produitsReconnus);

        if (produitsReconnus.length === 0) {
            if (resultBox) {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;color:#92400E;font-size:0.95rem;text-align:left;">
                    ⚠️ <strong>Aucun produit reconnu.</strong><br>
                    <em>Essayez : « Zid 3 Merindina w 2 Coca Cola »</em>
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

        posAfficherResultatGeminiVoice(produitsValides, resultBox, clientDetecte, produitsNonTrouves);

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

// ==================== AFFICHAGE RÉSULTAT ====================
function posAfficherResultatGeminiVoice(produits, container, clientDetecte, produitsNonTrouves) {
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
    posGeminiClientEnAttente = clientDetecte;

    var clientHtml = '';
    if (clientDetecte && clientDetecte.trim().length > 0) {
        clientHtml = `
            <div style="padding:10px 14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-user-check" style="color:#D97706;font-size:1.5rem;"></i>
                <div style="text-align:left;flex:1;">
                    <p style="margin:0;color:#92400E;font-weight:700;font-size:1rem;">
                        👤 Client détecté : <span style="color:#78350F;">${escapeHtml(clientDetecte)}</span>
                    </p>
                    <p style="margin:2px 0 0;color:#B45309;font-size:0.8rem;">Sera recherché dans la base (nom, prénom, description...)</p>
                </div>
            </div>
        `;
    }

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
            ${clientHtml}
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

    // 🔊 Annonce vocale en FRANÇAIS
    var resume = '';
    if (clientDetecte) resume += 'Client ' + clientDetecte + '. ';
    resume += produits.length + ' produit' + (produits.length > 1 ? 's' : '') + ' reconnu' + (produits.length > 1 ? 's' : '') + '. ';
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
        posGeminiClientEnAttente,
        []
    );

    posGeminiParler(nomProduit + ' ajouté.');
}

// ==================== CONFIRMATION AJOUT AU PANIER (v2.3 - SCORE PONDÉRÉ) ====================
function posConfirmerAjoutGeminiVoice() {
    var produits = posGeminiProduitsEnAttente;
    if (!produits || produits.length === 0) {
        alert('❌ Aucun produit à ajouter');
        return;
    }

    // ============================================================
    // ✅ ÉTAPE 1 : RECHERCHE CLIENT PAR SCORE PONDÉRÉ
    // ============================================================
    var nomClient = (posGeminiClientEnAttente || '').trim();
    var phraseComplete = (posGeminiTranscriptFinal || '').trim();
    var clientTrouve = null;

    if (nomClient || phraseComplete) {
        var clients = window.posAllClients || [];
        console.log('👤 Nom client Gemini :', nomClient);
        console.log('📝 Phrase complète :', phraseComplete);
        console.log('📋 Clients disponibles :', clients.length);

        // 🔧 Construire la liste des mots-clés à chercher
        var motsAChercher = [];

        if (nomClient) {
            var nomNorm = posGeminiNormaliser(nomClient);
            motsAChercher.push(nomNorm);
            nomNorm.split(/\s+/).forEach(function(m) {
                if (m.length >= 3) motsAChercher.push(m);
            });
        }

        // ✅ Extraction manuelle si Gemini n'a rien trouvé
        if (!nomClient && phraseComplete) {
            var phraseNorm = posGeminiNormaliser(phraseComplete);
            var declencheurs = ['client', 'pour', 'li', 'si', 'lalla', 'm3a'];
            var motsPhrase = phraseNorm.split(/\s+/);

            for (var i = 0; i < motsPhrase.length; i++) {
                if (declencheurs.includes(motsPhrase[i]) && i + 1 < motsPhrase.length) {
                    var cand = motsPhrase[i + 1];
                    if (cand && cand.length >= 3) {
                        motsAChercher.push(cand);
                        if (i + 2 < motsPhrase.length && motsPhrase[i + 2].length >= 3) {
                            motsAChercher.push(motsPhrase[i + 1] + ' ' + motsPhrase[i + 2]);
                        }
                    }
                }
            }

            // Ajouter tous les mots significatifs en fallback
            var stopWords = ['pour', 'client', 'avec', 'puis', 'zid', 'bghit', '3tini', 'merindina', 'coca', 'cola', 'pizza', 'cafe', 'café', 'croissant', 'atay', 'jus', 'et', 'les', 'des', 'une', 'un'];
            motsPhrase.forEach(function(m) {
                if (m.length >= 4 && !stopWords.includes(m)) {
                    motsAChercher.push(m);
                }
            });
        }

        // Dédupliquer
        motsAChercher = motsAChercher.filter(function(m, idx, arr) {
            return arr.indexOf(m) === idx && m.length >= 3;
        });

        console.log('🔍 Mots-clés à chercher :', motsAChercher);

        // ============================================================
        // 🎯 SCORE pour chaque client
        // ============================================================
        var scores = clients.map(function(c) {
            var nom = posGeminiNormaliser(c.nom);
            var prenom = posGeminiNormaliser(c.prenom);
            var username = posGeminiNormaliser(c.username);
            var description = posGeminiNormaliser(c.description);
            var adresse = posGeminiNormaliser(c.adresse);
            var email = posGeminiNormaliser(c.email);
            var tel = (c.telephone || '').replace(/\D/g, '');
            var whatsapp = (c.whatsapp || '').replace(/\D/g, '');

            var score = 0;
            var details = [];

            // 📌 Match nom complet exact
            var nomCompletGemini = posGeminiNormaliser(nomClient || '');
            var full1 = posGeminiNormaliser((c.nom || '') + ' ' + (c.prenom || ''));
            var full2 = posGeminiNormaliser((c.prenom || '') + ' ' + (c.nom || ''));
            if (nomCompletGemini && (full1 === nomCompletGemini || full2 === nomCompletGemini)) {
                score += 1000;
                details.push('nom complet exact +1000');
            }

            motsAChercher.forEach(function(mot) {
                if (!mot) return;

                // NOM : +50 exact / +30 partiel
                if (nom === mot) { score += 50; details.push('nom=' + mot + ' +50'); }
                else if (nom && mot && (nom.includes(mot) || mot.includes(nom))) { score += 30; details.push('nom~' + mot); }

                // PRENOM : +50 exact / +30 partiel
                if (prenom === mot) { score += 50; details.push('prenom=' + mot + ' +50'); }
                else if (prenom && mot && (prenom.includes(mot) || mot.includes(prenom))) { score += 30; details.push('prenom~' + mot); }

                // USERNAME : +40 exact / +20 partiel
                if (username === mot) { score += 40; details.push('username=' + mot); }
                else if (username && mot && username.includes(mot)) { score += 20; details.push('username~' + mot); }

                // ⭐ DESCRIPTION : +40 exact / +25 partiel
                if (description === mot) { score += 40; details.push('desc=' + mot); }
                else if (description && description.includes(mot)) { score += 25; details.push('desc~' + mot); }

                // TELEPHONE / WHATSAPP
                var chiffresMot = mot.replace(/\D/g, '');
                if (chiffresMot.length >= 6) {
                    if ((tel && tel.includes(chiffresMot)) || (whatsapp && whatsapp.includes(chiffresMot))) {
                        score += 30;
                        details.push('tel +30');
                    }
                }

                // ADRESSE : +10
                if (adresse && adresse.includes(mot)) { score += 10; details.push('adresse'); }

                // EMAIL : +10
                if (email && email.includes(mot)) { score += 10; details.push('email'); }
            });

            return { client: c, score: score, details: details };
        });

        scores = scores.filter(function(s) { return s.score > 0; });
        scores.sort(function(a, b) { return b.score - a.score; });

        if (scores.length > 0) {
            clientTrouve = scores[0].client;
            console.log('🏆 MEILLEUR CLIENT (score ' + scores[0].score + '):', clientTrouve.nom, clientTrouve.prenom);
            console.log('   Détails :', scores[0].details.join(', '));

            if (scores.length > 1) {
                console.log('   Autres candidats :');
                scores.slice(1, 4).forEach(function(s) {
                    console.log('   - ' + s.client.nom + ' ' + (s.client.prenom || '') + ' (score ' + s.score + ')');
                });
            }
        } else {
            console.warn('⚠️ Aucun client trouvé. Mots :', motsAChercher);
        }
    }

    // ============================================================
    // ✅ ÉTAPE 2 : Ajouter les produits au panier
    // ============================================================
    if (typeof window.posAddMultipleProductsToCart !== 'function') {
        alert('❌ Erreur : fonction d\'ajout au panier non disponible.');
        return;
    }

    var result = window.posAddMultipleProductsToCart(produits);

    // ============================================================
    // ✅ ÉTAPE 3 : APPLIQUER LE CLIENT
    // ============================================================
    if (clientTrouve) {
        closeModal();

        setTimeout(function() {
            var nomComplet = clientTrouve.nom + ' ' + (clientTrouve.prenom || '');
            var clientInput = document.getElementById('posClientSearchInput');
            if (clientInput) clientInput.value = nomComplet;

            if (typeof window.posSearchClient === 'function') {
                window.posSearchClient(nomComplet);
            }

            setTimeout(function() {
                if (window.posCurrentClient && window.posCurrentClient.id === clientTrouve.id) {
                    console.log('✅ Client déjà appliqué');
                } else if (typeof window.posSelectClientFromDropdown === 'function') {
                    window.posSelectClientFromDropdown(clientTrouve.id, nomComplet);
                    console.log('✅ Client forcé via posSelectClientFromDropdown');
                }

                if (clientInput) clientInput.value = nomComplet;

                if (typeof window.updateClientCreditDisplay === 'function') {
                    window.updateClientCreditDisplay(clientTrouve.id);
                }
                if (typeof window.updatePaymentButtons === 'function') {
                    window.updatePaymentButtons();
                }
            }, 150);
        }, 100);

        var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) !\n👤 Client : ' + clientTrouve.nom + ' ' + (clientTrouve.prenom || '');
        if (result.stockAlertes && result.stockAlertes.length > 0) {
            msg += '\n\n⚠️ Stock :\n• ' + result.stockAlertes.join('\n• ');
        }
        alert(msg);

        posGeminiParler('Client ' + clientTrouve.nom + '. ' + result.ajoutCount + ' article' + (result.ajoutCount > 1 ? 's' : '') + ' ajouté' + (result.ajoutCount > 1 ? 's' : '') + '.');

    } else {
        closeModal();

        var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) au panier !';
        if (nomClient) {
            msg += '\n\n⚠️ Le client "' + nomClient + '" n\'a PAS été trouvé dans la base.\nLes produits ont été ajoutés sans client.';
        }
        if (result.stockAlertes && result.stockAlertes.length > 0) {
            msg += '\n\n⚠️ Stock :\n• ' + result.stockAlertes.join('\n• ');
        }
        alert(msg);

        if (nomClient) {
            posGeminiParler('Produits ajoutés. Client ' + nomClient + ' non trouvé.');
        } else {
            posGeminiParler(result.ajoutCount + ' article' + (result.ajoutCount > 1 ? 's' : '') + ' ajouté' + (result.ajoutCount > 1 ? 's' : '') + '.');
        }
    }

    posGeminiProduitsEnAttente = [];
    posGeminiClientEnAttente = null;

    if (window.isOnPOSPage && window.isOnPOSPage()) {
        if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
        setTimeout(function() {
            var cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
}

// ==================== ANNULATION ====================
function posAnnulerGeminiVoice() {
    posGeminiProduitsEnAttente = [];
    posGeminiClientEnAttente = null;

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

console.log('🤖 POS-AI.js v2.3 FR chargé - Module Gemini Voice INTELLIGENT');
console.log('   ✅ Darija marocaine supportée');
console.log('   ✅ Recherche CLIENT par SCORE pondéré (nom 50 + prenom 50 + username 40 + desc 40 + tel 30 + adresse 10 + email 10)');
console.log('   ✅ Extraction du nom par mots-clés si Gemini échoue');
console.log('   ✅ Recherche PRODUIT : nom + description + categorie + brand + categories[]');
console.log('   ✅ Silence de 3s avant arrêt du micro');
console.log('   🔊 Synthèse vocale FRANÇAISE (voix NORMALE)');
console.log('   🎯 Suggestions intelligentes si produit non trouvé');
console.log('   🎨 Alertes stock bas automatiques');
console.log('   💾 Cache des commandes récentes (réponse instantanée)');
