// ==================== POS-AI.JS - E-SOLUTION ====================
// Module IA séparé pour le POS - Commande vocale par Gemini
// ✅ Chargé indépendamment de pos.js
// ✅ Utilise la fausse image 1x1 pour satisfaire le Worker
// ✅ Expose : posOuvrirCommandeVocaleGemini, posConfirmerAjoutGeminiVoice, posAnnulerGeminiVoice

// ==================== 🔑 CONFIGURATION GEMINI ====================
const POS_GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';

// Image transparente 1x1 pixel - pour satisfaire le Worker qui exige une image
const POS_GEMINI_FAKE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ==================== ÉTAT GEMINI ====================
var posGeminiRecognition = null;
var posGeminiEnCours = false;
var posGeminiTranscriptFinal = '';
var posGeminiProduitsEnAttente = [];

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
                <p style="margin:8px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« Ajouter 3 Merindina au panier et 2 Coca Cola »</p>
                <p style="margin:4px 0 0;color:#6D28D9;font-size:0.9rem;font-style:italic;">« 5 croissants, 1 café noir »</p>
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

// ==================== DÉMARRAGE ÉCOUTE ====================
function posDemarrerEcouteGemini() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    var micBtn = document.getElementById('posGeminiMicBtn');
    var micIcon = document.getElementById('posGeminiMicIcon');
    var status = document.getElementById('posGeminiStatus');
    var transcriptBox = document.getElementById('posGeminiTranscript');
    var transcriptText = document.getElementById('posGeminiTranscriptText');

    if (posGeminiRecognition) {
        try { posGeminiRecognition.stop(); } catch(e) {}
        posGeminiRecognition = null;
        if (micBtn) micBtn.style.background = 'linear-gradient(135deg,#8B5CF6,#7C3AED)';
        if (micIcon) micIcon.className = 'fas fa-microphone';
        if (status) status.textContent = 'Écoute arrêtée';
        return;
    }

    posGeminiTranscriptFinal = '';
    posGeminiRecognition = new SpeechRecognition();
    posGeminiRecognition.lang = 'fr-FR';
    posGeminiRecognition.continuous = false;
    posGeminiRecognition.interimResults = true;
    posGeminiRecognition.maxAlternatives = 1;

    if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg,#EF4444,#DC2626)';
        micBtn.style.animation = 'posPulse 1.5s infinite';
    }
    if (micIcon) micIcon.className = 'fas fa-stop';
    if (status) {
        status.textContent = '🎙️ Je vous écoute...';
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
    };

    posGeminiRecognition.onerror = function(event) {
        console.error('❌ Erreur reconnaissance vocale :', event.error);
        var status = document.getElementById('posGeminiStatus');
        if (status) {
            if (event.error === 'no-speech') status.textContent = '❌ Aucune parole détectée. Réessayez.';
            else if (event.error === 'not-allowed') status.textContent = '❌ Micro non autorisé. Activez-le dans le navigateur.';
            else status.textContent = '❌ Erreur : ' + event.error;
            status.style.color = '#ef4444';
        }
        posResetGeminiMicUI();
        posGeminiRecognition = null;
    };

    posGeminiRecognition.onend = function() {
        var finalText = posGeminiTranscriptFinal.trim();
        posResetGeminiMicUI();
        posGeminiRecognition = null;

        if (finalText.length < 3) {
            var status = document.getElementById('posGeminiStatus');
            if (status) {
                status.textContent = '⚠️ Rien d\'entendu. Réessayez.';
                status.style.color = '#f59e0b';
            }
            return;
        }
        posEnvoyerTexteAGemini(finalText);
    };

    try { posGeminiRecognition.start(); }
    catch(e) {
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
        // ⚠️ VÉRIFIER LE CATALOGUE (dans window.posProductsList géré par pos.js)
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

        var prompt = `Tu es un assistant de point de vente. L'utilisateur a dit une commande à voix haute.

Phrase entendue :
"${texte}"

Catalogue de produits disponibles :
[${productListStr}]

Ta mission :
1. Identifie TOUS les produits mentionnés dans la phrase qui correspondent au catalogue.
2. Pour chaque produit, extrait la quantité (chiffres ou mots : "un", "deux", "trois"...). Si aucune quantité, mets 1.
3. Retourne UNIQUEMENT un tableau JSON valide, sans texte autour, sans \`\`\`json.

Format attendu :
[
  { "nom": "Nom exact du produit", "quantite": 3 },
  { "nom": "Autre produit", "quantite": 2 }
]

Règles :
- Le "nom" doit correspondre EXACTEMENT à un nom du catalogue.
- Ignore "ajouter", "au panier", "et", "puis", "s'il te plaît".
- Si aucun produit n'est identifié, retourne [].
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

        var produitsReconnus = [];
        try {
            produitsReconnus = JSON.parse(cleaned);
            if (!Array.isArray(produitsReconnus)) throw new Error('Pas un tableau');
            console.log('✅ JSON parsé :', produitsReconnus);
        } catch(e) {
            console.warn('⚠️ Parsing JSON échoué, tentative regex...');
            var regex = /["']nom["']\s*:\s*["']([^"']+)["']\s*,\s*["']quantite["']\s*:\s*(\d+)/gi;
            var match;
            while ((match = regex.exec(cleaned)) !== null) {
                produitsReconnus.push({ nom: match[1].trim(), quantite: parseInt(match[2], 10) || 1 });
            }
        }

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

        posAfficherResultatGeminiVoice(produitsValides, resultBox);

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

// ==================== AFFICHAGE RÉSULTAT ====================
function posAfficherResultatGeminiVoice(produits, container) {
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

    posGeminiProduitsEnAttente = produits;

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

// ==================== CONFIRMATION AJOUT AU PANIER ====================
function posConfirmerAjoutGeminiVoice() {
    var produits = posGeminiProduitsEnAttente;
    if (!produits || produits.length === 0) {
        alert('❌ Aucun produit à ajouter');
        return;
    }

    // ✅ Utilise la fonction addToCartFourni par pos.js (accessible sur window)
    if (typeof window.posAddMultipleProductsToCart !== 'function') {
        alert('❌ Erreur : fonction d\'ajout au panier non disponible.');
        return;
    }

    var result = window.posAddMultipleProductsToCart(produits);

    closeModal();
    posGeminiProduitsEnAttente = [];

    if (window.isOnPOSPage && window.isOnPOSPage()) {
        if (typeof window.updateCartOnly === 'function') window.updateCartOnly();
        setTimeout(function() {
            var cartPanel = document.querySelector('.pos-cart-panel');
            if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
    }

    var msg = '✅ ' + result.ajoutCount + ' article(s) ajouté(s) au panier !';
    if (result.stockAlertes && result.stockAlertes.length > 0) {
        msg += '\n\n⚠️ Attention stock :\n• ' + result.stockAlertes.join('\n• ');
    }
    alert(msg);
}

// ==================== ANNULATION ====================
function posAnnulerGeminiVoice() {
    posGeminiProduitsEnAttente = [];
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
