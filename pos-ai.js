// ==================== POS-AI.JS - E-SOLUTION ====================
// Module IA séparé pour le POS - Commande vocale par Gemini
// ✅ Chargé indépendamment de pos.js
// ✅ Utilise la fausse image 1x1 pour satisfaire le Worker
// ✅ Comprend la DARIJA marocaine (lettres latines)
// ✅ Détecte automatiquement le CLIENT dans la phrase
// ✅ Micro qui s'arrête après 3 SECONDES DE SILENCE
// ✅ Expose : posOuvrirCommandeVocaleGemini, posConfirmerAjoutGeminiVoice, posAnnulerGeminiVoice

// ==================== 🔑 CONFIGURATION GEMINI ====================
const POS_GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';

// Image transparente 1x1 pixel - pour satisfaire le Worker qui exige une image
const POS_GEMINI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ⏱️ Durée de silence avant arrêt automatique (en millisecondes)
const POS_GEMINI_SILENCE_DURATION = 3000; // 3 secondes

// ==================== ÉTAT GEMINI ====================
var posGeminiRecognition = null;
var posGeminiEnCours = false;
var posGeminiTranscriptFinal = '';
var posGeminiProduitsEnAttente = [];
var posGeminiClientEnAttente = null;
var posGeminiSilenceTimer = null;
var posGeminiManuallyStopped = false;

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
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« L Fatima, tlata Coca Cola »</p>
                <p style="margin:10px 0 0;color:#7C3AED;font-size:0.8rem;font-weight:600;">⏱️ Le micro s'arrête après 3 secondes de silence</p>
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

// ==================== DÉMARRAGE ÉCOUTE (avec silence de 3 secondes) ====================
function posDemarrerEcouteGemini() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    var micBtn = document.getElementById('posGeminiMicBtn');
    var micIcon = document.getElementById('posGeminiMicIcon');
    var status = document.getElementById('posGeminiStatus');
    var transcriptBox = document.getElementById('posGeminiTranscript');
    var transcriptText = document.getElementById('posGeminiTranscriptText');

    // Si déjà en écoute → arrêt manuel
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
    posGeminiRecognition.lang = 'fr-FR'; // ✅ Accepte aussi la darija latine
    posGeminiRecognition.continuous = true;       // ✅ Ne s'arrête PAS tout seul
    posGeminiRecognition.interimResults = true;   // ✅ Résultats en temps réel
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

    // ⏱️ Fonction qui lance le timer de silence (3 secondes)
    function demarrerTimerSilence() {
        if (posGeminiSilenceTimer) {
            clearTimeout(posGeminiSilenceTimer);
        }
        // Compte à rebours visuel
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
            console.log('⏱️ 3 secondes de silence écoulées → arrêt automatique');
            if (posGeminiRecognition) {
                try { posGeminiRecognition.stop(); } catch(e) {}
            }
        }, POS_GEMINI_SILENCE_DURATION);
    }

    // ❌ SUPPRIMÉ : plus d'arrêt automatique sur no-speech (on gère avec le timer)
    posGeminiRecognition.onstart = function() {
        console.log('🎙️ Micro démarré');
        // On ne lance PAS le timer immédiatement → on attend le premier résultat
    };

    posGeminiRecognition.onresult = function(event) {
        var interim = '';
        var finalText = '';

        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalText += transcript + ' ';
            } else {
                interim += transcript;
            }
        }

        if (finalText) posGeminiTranscriptFinal += finalText;

        var displayText = (posGeminiTranscriptFinal + interim).trim();
        if (transcriptText) transcriptText.textContent = displayText || '...';

        // ✅ Relancer le timer de silence à chaque nouveau mot
        if (displayText.length > 0) {
            demarrerTimerSilence();
        }
    };

    posGeminiRecognition.onerror = function(event) {
        console.error('❌ Erreur reconnaissance vocale :', event.error);

        // ⚠️ Ignorer "no-speech" si on a déjà commencé à parler
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

        // Si arrêt manuel → ne rien faire
        if (posGeminiManuallyStopped) {
            posGeminiManuallyStopped = false;
            return;
        }

        // Si rien entendu → message d'erreur
        if (finalText.length < 3) {
            var status = document.getElementById('posGeminiStatus');
            if (status) {
                status.textContent = '⚠️ Rien d\'entendu. Réessayez.';
                status.style.color = '#f59e0b';
            }
            return;
        }

        // ✅ Envoi à Gemini
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

// ==================== ENVOI À GEMINI (avec DARIJA + CLIENT) ====================
async function posEnvoyerTexteAGemini(texte) {
    if (posGeminiEnCours) return;
    posGeminiEnCours = true;

    var status = document.getElementById('posGeminiStatus');
    var resultBox = document.getElementById('posGeminiResult');

    console.log('🎤 ====== GEMINI VOICE DEBUG ======');
    console.log('🎤 Texte entendu :', texte);
    console.log('📦 Nombre de produits dans le catalogue :', (window.posProductsList || []).length);

    if (status) {
        status.textContent = '🤖 Gemini analyse votre commande...';
        status.style.color = '#8B5CF6';
        status.style.fontWeight = '700';
    }
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="text-align:center;padding:16px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#8B5CF6;"></i><p style="color:#64748b;margin-top:8px;">Analyse en cours...</p></div>';
    }

    try {
        // ⚠️ VÉRIFIER LE CATALOGUE
        if (!window.posProductsList || window.posProductsList.length === 0) {
            throw new Error('Catalogue vide. Rechargez la page POS.');
        }

        var productNames = window.posProductsList.map(function(p) { return p.nom; }).filter(Boolean);
        console.log('📋 Exemples de produits :', productNames.slice(0, 10));

        if (productNames.length === 0) {
            throw new Error('Aucun produit valide dans le catalogue');
        }

        var productListStr = productNames.slice(0, 300).map(function(n) {
            return '"' + n.replace(/"/g, '\\"') + '"';
        }).join(', ');

        // ✅ PROMPT OPTIMISÉ DARIJA + CLIENT + QUANTITÉS
        var prompt = `Tu es un assistant de point de vente marocain. L'utilisateur a dit une commande à voix haute en FRANÇAIS ou en DARIJA marocaine (arabe marocain transcrit en lettres latines/françaises).

Phrase entendue :
"${texte}"

Catalogue de produits disponibles :
[${productListStr}]

Ta mission :
1. Identifie TOUS les produits mentionnés qui correspondent au catalogue.
2. Extrait la quantité pour chaque produit. Reconnais les chiffres (1,2,3) ET les mots darija :
   - wahed / wahd / واحد = 1
   - jouj / juj / zouj / 2 = 2
   - tlata / tlata / 3 = 3
   - rbaa / rba / 4 = 4
   - khamsa / khams / 5 = 5
   - setta / sett / 6 = 6
   - sebaa / seba / 7 = 7
   - tmania / tmen / 8 = 8
   - tseoud / tse3 / 9 = 9
   - aachra / 3achra / 10 = 10
   Si aucune quantité, mets 1.
3. Détecte si un NOM DE CLIENT est mentionné. Mots déclencheurs :
   - "client", "l-client", "pour", "li", "l", "si", "lalla", "m3a", "m3a client", "nommée", "nommé"
   Le nom qui suit est le nom du client.

Mots darija à IGNORER (ce sont des verbes/connecteurs) :
- zid, zid liya, bghit, 3tini, 3tina, dir, 3mel
- w, o, ou, puis, et
- au panier, f panier, f l-panier
- 3afak, afak, chokran, sf, sefi, safi
- ana, bghit

Retourne UNIQUEMENT un objet JSON valide, sans texte autour, sans \`\`\`json, au format EXACT :

{
  "client": "Nom du client si détecté, sinon null",
  "produits": [
    { "nom": "Nom exact du produit du catalogue", "quantite": 3 },
    { "nom": "Autre produit", "quantite": 2 }
  ]
}

Règles STRICTES :
- Le "nom" du produit doit correspondre EXACTEMENT à un nom du catalogue (copie-colle).
- Ignore les produits non trouvés dans le catalogue.
- "client" = null si aucun client n'est mentionné.
- Si aucun produit trouvé, "produits": [].
- Ne mets JAMAIS de texte avant ou après le JSON.`.trim();

        console.log('📤 Envoi au Worker (avec fausse image 1x1)...');
        console.log('🔗 URL :', POS_GEMINI_WORKER_URL);

        var response = await fetch(POS_GEMINI_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                imageBase64: POS_GEMINI_FAKE_IMAGE
            })
        });

        console.log('📥 Status HTTP :', response.status);

        if (!response.ok) {
            var errText = await response.text();
            console.error('❌ Réponse erreur :', errText);
            throw new Error('HTTP ' + response.status + ' : ' + errText.substring(0, 200));
        }

        var data = await response.json();
        console.log('✅ Réponse Gemini brute :', data);

        if (data.error) {
            throw new Error('Gemini : ' + (data.error.message || JSON.stringify(data.error)));
        }

        var rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        console.log('📝 Texte extrait :', rawText);

        if (!rawText) {
            console.error('❌ Réponse vide. Structure :', JSON.stringify(data, null, 2));
            throw new Error('Gemini n\'a rien répondu. Vérifiez le Worker.');
        }

        var cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        console.log('🧹 Texte nettoyé :', cleaned);

        // ✅ PARSING : accepte les 2 formats (objet {client, produits} OU tableau simple)
        var parsed = null;
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
                    ⚠️ <strong>Aucun produit reconnu.</strong><br><br>
                    <strong>Entendu :</strong> "${escapeHtml(texte)}"<br>
                    <strong>Réponse Gemini :</strong> "${escapeHtml(rawText.substring(0, 150))}"
                </div>`;
            }
            posGeminiEnCours = false;
            return;
        }

        // Matcher avec le catalogue
        var produitsValides = [];
        produitsReconnus.forEach(function(rec) {
            var recNom = (rec.nom || '').trim();
            if (!recNom) return;
            var recNomLower = recNom.toLowerCase();
            var recNomNorm = recNomLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            var produit = window.posProductsList.find(function(p) { return (p.nom || '').toLowerCase() === recNomLower; });
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pNomNorm = (p.nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return pNomNorm === recNomNorm;
                });
            }
            if (!produit) {
                produit = window.posProductsList.find(function(p) {
                    var pNomLower = (p.nom || '').toLowerCase();
                    return pNomLower.includes(recNomLower) || recNomLower.includes(pNomLower);
                });
            }

            if (produit) {
                produitsValides.push({
                    produit: produit,
                    quantite: Math.max(1, parseInt(rec.quantite, 10) || 1),
                    nomOriginal: recNom
                });
            } else {
                console.warn('⚠️ Non trouvé dans le catalogue :', recNom);
            }
        });

        if (produitsValides.length === 0) {
            if (resultBox) {
                resultBox.innerHTML = `<div style="padding:14px;background:#FEE2E2;border:2px solid #EF4444;border-radius:10px;color:#991B1B;font-size:0.95rem;text-align:left;">
                    ❌ <strong>Aucun produit ne correspond au catalogue.</strong><br><br>
                    Gemini a trouvé : ${produitsReconnus.map(p => '"' + escapeHtml(p.nom) + '"').join(', ')}
                </div>`;
            }
            posGeminiEnCours = false;
            return;
        }

        posAfficherResultatGeminiVoice(produitsValides, resultBox, clientDetecte);

    } catch(e) {
        console.error('❌ Erreur Gemini Voice:', e);
        if (resultBox) {
            resultBox.innerHTML = `<div style="padding:14px;background:#FEE2E2;border:2px solid #EF4444;border-radius:10px;color:#991B1B;font-size:0.9rem;text-align:left;">
                ❌ <strong>Erreur :</strong> ${escapeHtml(e.message)}
            </div>`;
        }
    } finally {
        posGeminiEnCours = false;
    }
}

// ==================== AFFICHAGE RÉSULTAT (avec CLIENT) ====================
function posAfficherResultatGeminiVoice(produits, container, clientDetecte) {
    if (!container) container = document.getElementById('posGeminiResult');
    if (!container) return;

    var totalGeneral = 0;
    var lignesHtml = produits.map(function(item) {
        var p = item.produit;
        var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
        var sousTotal = pr * item.quantite;
        totalGeneral += sousTotal;
        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 6px;font-weight:600;color:#1e293b;font-size:0.9rem;text-align:left;">
                    ${escapeHtml(p.nom)}
                </td>
                <td style="padding:8px 6px;text-align:center;color:#8B5CF6;font-weight:700;font-size:1rem;">
                    ×${item.quantite}
                </td>
                <td style="padding:8px 6px;text-align:right;color:#64748b;font-size:0.85rem;">
                    ${pr.toFixed(2)} MAD
                </td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:#7C3AED;font-size:0.9rem;">
                    ${sousTotal.toFixed(2)} MAD
                </td>
            </tr>
        `;
    }).join('');

    // Sauvegarder les données en attente
    posGeminiProduitsEnAttente = produits;
    posGeminiClientEnAttente = clientDetecte;

    // ✅ Bloc client (affiché uniquement si détecté)
    var clientHtml = '';
    if (clientDetecte && clientDetecte.trim().length > 0) {
        clientHtml = `
            <div style="padding:10px 14px;background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-user-check" style="color:#D97706;font-size:1.5rem;"></i>
                <div style="text-align:left;flex:1;">
                    <p style="margin:0;color:#92400E;font-weight:700;font-size:1rem;">
                        👤 Client détecté : <span style="color:#78350F;">${escapeHtml(clientDetecte)}</span>
                    </p>
                    <p style="margin:2px 0 0;color:#B45309;font-size:0.8rem;">
                        Sera automatiquement sélectionné lors de l'ajout au panier
                    </p>
                </div>
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
}

// ==================== CONFIRMATION AJOUT AU PANIER (avec client) ====================
function posConfirmerAjoutGeminiVoice() {
    var produits = posGeminiProduitsEnAttente;
    if (!produits || produits.length === 0) {
        alert('❌ Aucun produit à ajouter');
        return;
    }

    // ✅ 1. Sélectionner automatiquement le client si détecté
    var clientSelectionne = null;
    if (posGeminiClientEnAttente && posGeminiClientEnAttente.trim().length > 0) {
        var nomClient = posGeminiClientEnAttente.trim();
        console.log('👤 Recherche automatique du client :', nomClient);

        if (typeof window.posSearchClient === 'function') {
            var clientInput = document.getElementById('posClientSearchInput');
            if (clientInput) {
                clientInput.value = nomClient;
            }
            window.posSearchClient(nomClient);
            clientSelectionne = nomClient;
            console.log('✅ Client sélectionné automatiquement :', nomClient);
        } else {
            console.warn('⚠️ posSearchClient non disponible');
        }
    }

    // ✅ 2. Ajouter les produits au panier
    if (typeof window.posAddMultipleProductsToCart !== 'function') {
        alert('❌ Erreur : fonction d\'ajout au panier non disponible.');
        return;
    }

    var result = window.posAddMultipleProductsToCart(produits);

    closeModal();
    posGeminiProduitsEnAttente = [];
    posGeminiClientEnAttente = null;

    if (window.isOnPOSPage && window.isOnPOSPage()) {
        if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
        setTimeout(function() {
            var cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
    }

    // Message de confirmation
    var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) au panier !';
    if (clientSelectionne) {
        msg += '\n👤 Client : ' + clientSelectionne;
    }
    if (result.stockAlertes && result.stockAlertes.length > 0) {
        msg += '\n\n⚠️ Attention stock :\n• ' + result.stockAlertes.join('\n• ');
    }
    alert(msg);
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

    closeModal();
}

// ==================== EXPOSITION GLOBALE ====================
window.posOuvrirCommandeVocaleGemini = posOuvrirCommandeVocaleGemini;
window.posDemarrerEcouteGemini = posDemarrerEcouteGemini;
window.posEnvoyerTexteAGemini = posEnvoyerTexteAGemini;
window.posConfirmerAjoutGeminiVoice = posConfirmerAjoutGeminiVoice;
window.posAnnulerGeminiVoice = posAnnulerGeminiVoice;
window.posAfficherResultatGeminiVoice = posAfficherResultatGeminiVoice;

console.log('🤖 POS-AI.js chargé - Module Gemini Voice prêt');
console.log('   ✅ Darija marocaine supportée');
console.log('   ✅ Détection automatique du client');
console.log('   ✅ Silence de 3s avant arrêt du micro');
