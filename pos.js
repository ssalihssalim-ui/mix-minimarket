// ==================== POS.JS - E-SOLUTION (VERSION COMPLÈTE AVEC MODE CATÉGORIES) ====================
// Point de vente complet avec mode catégories
// ✅ Nom produit peut sauter à la ligne
// ✅ Image taille fixe et conteneur agrandi
// ✅ Pas de scroll horizontal
// ✅ Panier 20% - Produits 80% en hauteur
// ✅ Espace en dessous du bouton Valider
// ✅ Clic sur "Panier" scroll vers le bas
// ✅ Bouton flèche ↑ scroll vers le haut
// ✅ Vente impossible si panier vide
// ✅ Retour automatique à l'étape 1 après finalisation
// ✅ CA et Profit client mis à jour (FORCE UPDATE)
// ✅ Bouton "Afficher tout" corrigé
// ✅ Affichage crédit client cliquable - REDIRECTION VERS PAGE CRÉDITS AVEC SAUVEGARDE D'ÉTAT
// ✅ MULTI-PANIERS : Chaque panier sauvegarde son propre client, table, paiement, remise, montant donné
// ✅ LIMITE À 5 PANIERS MAXIMUM
// ✅ AFFICHAGE CORRECT DES PRODUITS ET NAVIGATION FLUIDE ENTRE PANIERS
// ✅ SUPPRESSION IMMÉDIATE DES PANIERS AVEC RE-RENDU COMPLET
// ✅ RÉORGANISATION DES NUMÉROS DE PANIERS (1 À 5)
// ✅ BARRE CATÉGORIES SLIDE SUPPRIMÉE DÉFINITIVEMENT
// ✅ BOUTONS TABLES/EN LIGNE MASQUÉS POUR LE CLIENT
// ✅ 🤖 BOUTON GEMINI AJOUTÉ À CÔTÉ DU MICRO
// ✅ 🤖 FONCTION posAddMultipleProductsToCart AJOUTÉE (pour Gemini)
// ✅ ⌨️ CHAMP QUANTITÉ ÉDITABLE AU CLAVIER dans le panier
// ✅ 🖥️ SUR PC : Barre de recherche + Tables + En ligne DIRECTEMENT VISIBLES
// ⚡ OPTIMISATIONS : cache recherche + content-visibility + batch 30 + debounce 80ms
// 🎨 DESIGN MINIMALISTE BLEU/BLANC — cohérent avec admin-crud.js
// 🎨 AJUSTEMENTS V3 : cartes 190px + images 85px + prix 0.90rem + AUCUN gradient
// 🎨 PANIER V2 : nom produit en haut + boutons à droite + sous-total à droite
// 🆕 AJUSTEMENTS MOBILE : catégorie 65px + carte cat 90-100px + image produit 70px + carte produit 145-170px
// ✅ 💳 CRÉDIT CLIENT : loadClientCredits() reproduit EXACTEMENT le filtre d'Admin-Credits (aucune divergence)
// 🆕 RESPONSIVE RENFORCÉ : tout s'adapte de 320px à 4K

var posCart = [];
var posStep = 1;
var posCategoriesList = [];
var posProductsList = [];
var posSelectedCategory = 'all';
var posCurrentClient = null;
var posCurrentTable = '';
var posPaymentMethod = 'espece';
var posAmountGiven = 0;
var posDiscountMAD = 0;
var posAllClients = [];
var posFilteredClients = [];
var posCurrentProductId = null;
var posSearchQuery = '';
var posToolsVisible = (window.innerWidth >= 1024);

var productNameIndex = {};
var productIndexBuilt = false;
var factureCounter = parseInt(localStorage.getItem('factureCounter')) || 0;
var fideliteSettingsCache = null;

var posCommandesTables = [];
var posCommandesTablesCount = 0;
var posCommandesEnLigneCount = 0;
var posCommandesFilterText = '';
var posCommandesSortField = 'createdAt';
var posCommandesSortOrder = 'desc';

var posEpicesList = ['Normal', 'Moins épicé', 'Très épicé', 'Sans épice'];
var posSelList = ['Normal', 'Moins de sel', 'Sans sel'];
var posCurrentProductIngredients = [];
var allStockData = [];

var posIsRendering = false;
var posLastRenderTime = 0;
var isFinalizing = false;

var posProductOffset = 0;
var posProductBatchSize = 30;
var posHasMoreProducts = false;

var clientCreditsCache = {};
var clientSearchTimeout = null;

if (typeof window.posSearchCache === 'undefined') {
    window.posSearchCache = {};
}
var posSearchCache = window.posSearchCache;

var posViewMode = 'categories';
var posSelectedCategoryForView = null;

var posMultiCarts = {};
var posCurrentCartId = 'panier1';
var posMultiCartCounter = 1;

var posMultiPaniersData = {};

var MAX_PANIERS = 5;

async function forceUpdateClient(clientId, total, profitTotal) {
try {
console.log('🔥 FORCE UPDATE CLIENT:', clientId);
if (!clientId) return false;
const docRef = db.collection('clients').doc(clientId);
const doc = await docRef.get();
if (!doc.exists) return false;
const data = doc.data();
const nouveauCA = (data.ca || 0) + total;
const nouveauProfit = (data.profit || 0) + profitTotal;
await docRef.update({
ca: nouveauCA,
profit: nouveauProfit,
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
const updatedData = { ...data, ca: nouveauCA, profit: nouveauProfit, updatedAt: new Date() };
await CacheDB.set('clients', clientId, updatedData);
const clientIndex = posAllClients.findIndex(c => c.id === clientId);
if (clientIndex !== -1) { posAllClients[clientIndex].ca = nouveauCA; posAllClients[clientIndex].profit = nouveauProfit; }
const filteredIndex = posFilteredClients.findIndex(c => c.id === clientId);
if (filteredIndex !== -1) { posFilteredClients[filteredIndex].ca = nouveauCA; posFilteredClients[filteredIndex].profit = nouveauProfit; }
if (posCurrentClient && posCurrentClient.id === clientId) { posCurrentClient.ca = nouveauCA; posCurrentClient.profit = nouveauProfit; }
if (window.allClientsData) {
const adminIndex = window.allClientsData.findIndex(c => c.id === clientId);
if (adminIndex !== -1) { window.allClientsData[adminIndex].ca = nouveauCA; window.allClientsData[adminIndex].profit = nouveauProfit; }
}
return true;
} catch(e) { console.error('❌ Erreur forceUpdateClient:', e); return false; }
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g,function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
function toDate(val) { if(!val) return null; if(val.toDate) return val.toDate(); if(val.seconds) return new Date(val.seconds*1000); if(typeof val==='string') return new Date(val); if(val instanceof Date) return val; return null; }

function buildProductIndex() { if(productIndexBuilt) return; productNameIndex={}; posProductsList.forEach(function(p){ if(!p.nom) return; p.nom.toLowerCase().split(' ').forEach(function(w){ if(w.length<2) return; if(!productNameIndex[w]) productNameIndex[w]=[]; productNameIndex[w].push(p); }); }); productIndexBuilt=true; }
function fastSearch(query) { if(!query) return posProductsList; buildProductIndex(); var words=query.toLowerCase().split(' '),results=[],seen={}; words.forEach(function(w){ if(w.length<2) return; (productNameIndex[w]||[]).forEach(function(p){ if(!seen[p.id]){ seen[p.id]=true; results.push(p); } }); }); if(results.length===0) return posProductsList.filter(function(p){ return (p.nom||'').toLowerCase().indexOf(query)!==-1||(p.categorie||'').toLowerCase().indexOf(query)!==-1||(p.description||'').toLowerCase().indexOf(query)!==-1; }); return results; }
function posEnrichirItemsAvecPrixAchat(items){ return items.map(function(item){ var produit=posProductsList.find(function(p){ return p.id===item.id; }); var prixAchat=(produit&&produit.prixAchat!=null)?produit.prixAchat:(item.prixAchat||0); return Object.assign({},item,{prixAchat:prixAchat}); }); }
function isOnPOSPage(){ var pt=document.getElementById('pageTitle')?.textContent||''; return pt==='POS'||pt==='Dashboard'; }

function setStaticBackButtonVisibility(visible) {
var btn = document.getElementById('posStaticBackBtn');
if (btn) { btn.style.display = visible ? 'block' : 'none'; }
}

// ==================== MULTI-PANIERS ====================

function posSauvegarderDonneesPanier(cartId) {
    posMultiPaniersData[cartId] = {
        client: posCurrentClient ? { id: posCurrentClient.id, name: posCurrentClient.name, ca: posCurrentClient.ca || 0, profit: posCurrentClient.profit || 0 } : null,
        table: posCurrentTable || '',
        paymentMethod: posPaymentMethod || 'espece',
        discountMAD: posDiscountMAD || 0,
        amountGiven: posAmountGiven || 0,
        step: posStep || 1
    };
}

function posRestaurerDonneesPanier(cartId) {
    if (posMultiPaniersData[cartId]) {
        var data = posMultiPaniersData[cartId];
        posCurrentClient = data.client || null;
        posCurrentTable = data.table || '';
        posPaymentMethod = data.paymentMethod || 'espece';
        posDiscountMAD = data.discountMAD || 0;
        posAmountGiven = data.amountGiven || 0;
        posStep = data.step || 1;
        return true;
    }
    posCurrentClient = null; posCurrentTable = ''; posPaymentMethod = 'espece';
    posDiscountMAD = 0; posAmountGiven = 0; posStep = 1;
    return false;
}

function posChargerToutesDonneesPaniers() {
    try {
        var allData = localStorage.getItem('posMultiPaniersData');
        if (allData) { posMultiPaniersData = JSON.parse(allData); }
        else { posMultiPaniersData = { 'panier1': { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 } }; }
    } catch(e) {
        posMultiPaniersData = { 'panier1': { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 } };
    }
}

function posLoadMultiCarts() {
    try {
        var saved = localStorage.getItem('posMultiCarts');
        if (saved) {
            var data = JSON.parse(saved);
            posMultiCarts = data.carts || {};
            posCurrentCartId = data.currentId || 'panier1';
            posMultiCartCounter = data.counter || 1;
            if (!posMultiCarts[posCurrentCartId]) {
                var keys = Object.keys(posMultiCarts);
                posCurrentCartId = keys.length > 0 ? keys[0] : 'panier1';
                if (!posMultiCarts['panier1']) posMultiCarts['panier1'] = [];
            }
            posChargerToutesDonneesPaniers();
            posCart = posMultiCarts[posCurrentCartId] || [];
            window.posCart = posCart;
            posRestaurerDonneesPanier(posCurrentCartId);
            return true;
        }
    } catch(e) { console.warn('⚠️ Erreur chargement multi-paniers:', e); }
    posMultiCarts = { 'panier1': [] };
    posCurrentCartId = 'panier1';
    posMultiCartCounter = 1;
    posCart = [];
    window.posCart = posCart;
    posMultiPaniersData = { 'panier1': { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 } };
    return false;
}

function posSaveMultiCarts() {
    if (posCurrentCartId && posMultiCarts[posCurrentCartId] !== undefined) {
        posMultiCarts[posCurrentCartId] = posCart.slice();
        posSauvegarderDonneesPanier(posCurrentCartId);
    }
    try {
        localStorage.setItem('posMultiCarts', JSON.stringify({ carts: posMultiCarts, currentId: posCurrentCartId, counter: posMultiCartCounter }));
        localStorage.setItem('posMultiPaniersData', JSON.stringify(posMultiPaniersData));
    } catch(e) {}
}

function posReorganiserNumerosPaniers() {
    var cartKeys = Object.keys(posMultiCarts);
    if (cartKeys.length === 0) {
        posMultiCarts = { 'panier1': [] };
        posMultiPaniersData = { 'panier1': { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 } };
        posCurrentCartId = 'panier1'; posSaveMultiCarts(); return;
    }
    cartKeys.sort(function(a, b) { return parseInt(a.replace('panier','')) - parseInt(b.replace('panier','')); });
    var newCarts = {}, newData = {}, targetIndex = 1;
    for (var i = 0; i < cartKeys.length; i++) {
        var oldKey = cartKeys[i], newKey = 'panier' + targetIndex;
        newCarts[newKey] = posMultiCarts[oldKey] || [];
        if (posMultiPaniersData[oldKey]) newData[newKey] = posMultiPaniersData[oldKey];
        if (posCurrentCartId === oldKey) posCurrentCartId = newKey;
        targetIndex++;
    }
    posMultiCarts = newCarts; posMultiPaniersData = newData;
    posMultiCartCounter = targetIndex - 1;
    posSaveMultiCarts();
}

function posCreateNewCart() {
    posMultiCarts[posCurrentCartId] = posCart.slice();
    posSauvegarderDonneesPanier(posCurrentCartId);
    var cartCount = Object.keys(posMultiCarts).length;
    if (cartCount >= MAX_PANIERS) { alert('⚠️ Vous avez atteint la limite de ' + MAX_PANIERS + ' paniers maximum.'); return null; }
    var usedNumbers = [], cartKeys = Object.keys(posMultiCarts);
    for (var k = 0; k < cartKeys.length; k++) { var num = parseInt(cartKeys[k].replace('panier', '')); if (!isNaN(num)) usedNumbers.push(num); }
    var availableNumber = 1;
    while (usedNumbers.includes(availableNumber) && availableNumber <= MAX_PANIERS) { availableNumber++; }
    if (availableNumber > MAX_PANIERS) { alert('⚠️ Tous les numéros de paniers (1 à ' + MAX_PANIERS + ') sont utilisés.'); return null; }
    var newCartId = 'panier' + availableNumber;
    posMultiCarts[newCartId] = [];
    posMultiPaniersData[newCartId] = { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 };
    posCurrentCartId = newCartId;
    posCart = []; window.posCart = posCart;
    posCurrentClient = null; posCurrentTable = ''; posPaymentMethod = 'espece';
    posDiscountMAD = 0; posAmountGiven = 0; posStep = 1;
    posSaveMultiCarts();
    if (isOnPOSPage()) renderPOS();
    return newCartId;
}

function posSwitchToCart(cartId) {
    if (!posMultiCarts[cartId]) return;
    posMultiCarts[posCurrentCartId] = posCart.slice();
    posSauvegarderDonneesPanier(posCurrentCartId);
    posCurrentCartId = cartId;
    posCart = posMultiCarts[cartId] || [];
    window.posCart = posCart;
    posRestaurerDonneesPanier(cartId);
    posSaveMultiCarts();
    if (isOnPOSPage()) {
        var c = document.getElementById('dynamicContent');
        if (c) buildFullPOS(c); else renderPOS();
        setTimeout(function() {
            if (posCurrentClient && posCurrentClient.name) { var ci = document.getElementById('posClientSearchInput'); if (ci) ci.value = posCurrentClient.name; }
            if (posCurrentTable) { var ti = document.getElementById('posTableNum'); if (ti) ti.value = posCurrentTable; }
            if (posAmountGiven > 0) { var ai = document.getElementById('posAmountGiven'); if (ai) ai.value = posAmountGiven.toFixed(2); }
            if (posCurrentClient && posCurrentClient.id) updateClientCreditDisplay(posCurrentClient.id);
            updatePaymentButtons();
            if (posStep === 2) posCalculateChange();
        }, 300);
    }
}

function posDeleteCart(cartId) {
    if (cartId === 'panier1' && Object.keys(posMultiCarts).length === 1) { alert('❌ Impossible de supprimer le dernier panier.'); return; }
    if (!posMultiCarts[cartId]) return;
    if (posCurrentCartId) { posMultiCarts[posCurrentCartId] = posCart.slice(); posSauvegarderDonneesPanier(posCurrentCartId); }
    delete posMultiCarts[cartId]; delete posMultiPaniersData[cartId];
    if (posCurrentCartId === cartId) {
        var keys = Object.keys(posMultiCarts);
        posCurrentCartId = keys.length > 0 ? keys[0] : 'panier1';
        posCart = posMultiCarts[posCurrentCartId] || [];
        window.posCart = posCart;
        posRestaurerDonneesPanier(posCurrentCartId);
    }
    posReorganiserNumerosPaniers();
    posSaveMultiCarts();
    if (isOnPOSPage()) {
        var c = document.getElementById('dynamicContent');
        if (c) buildFullPOS(c); else renderPOS();
        setTimeout(function() {
            if (posCurrentClient && posCurrentClient.name) { var ci = document.getElementById('posClientSearchInput'); if (ci) ci.value = posCurrentClient.name; }
            if (posCurrentTable) { var ti = document.getElementById('posTableNum'); if (ti) ti.value = posCurrentTable; }
            if (posAmountGiven > 0) { var ai = document.getElementById('posAmountGiven'); if (ai) ai.value = posAmountGiven.toFixed(2); }
            if (posCurrentClient && posCurrentClient.id) updateClientCreditDisplay(posCurrentClient.id);
            updatePaymentButtons();
            if (posStep === 2) posCalculateChange();
        }, 100);
    }
}

function posResetAllCarts() {
    if (!confirm('⚠️ Vider TOUS les paniers ? Cette action est irréversible.')) return;
    posMultiCarts = { 'panier1': [] };
    posMultiPaniersData = { 'panier1': { client: null, table: '', paymentMethod: 'espece', discountMAD: 0, amountGiven: 0, step: 1 } };
    posCurrentCartId = 'panier1'; posMultiCartCounter = 1;
    posCart = []; window.posCart = posCart;
    posCurrentClient = null; posCurrentTable = ''; posPaymentMethod = 'espece';
    posDiscountMAD = 0; posAmountGiven = 0; posStep = 1;
    posSaveMultiCarts();
    if (isOnPOSPage()) renderPOS();
}

function posGetTotalAllCarts() {
    var total = 0;
    for (var id in posMultiCarts) {
        if (posMultiCarts.hasOwnProperty(id)) {
            var items = posMultiCarts[id] || [];
            for (var i = 0; i < items.length; i++) total += (items[i].prixUnitaire || 0) * (items[i].quantite || 0);
        }
    }
    return total;
}

async function preloadPosData() {
if (typeof CacheDB === 'undefined') return;
try {
await Promise.allSettled([
CacheDB.getAll('categories'), CacheDB.getAll('products'),
CacheDB.getAll('clients'), CacheDB.getAll('stock')
]);
} catch(e) {}
}
preloadPosData();

function posToggleTools() {
    posToolsVisible = !posToolsVisible;
    var toolsContainer = document.getElementById('posToolsContainer');
    var toggleBtn = document.getElementById('posToggleToolsBtn');
    if (toolsContainer) {
        if (posToolsVisible) {
            toolsContainer.style.display = 'flex';
            toolsContainer.style.flexDirection = 'column';
            toolsContainer.style.gap = '10px';
            toolsContainer.style.marginBottom = '10px';
            toolsContainer.style.padding = '12px 16px';
            toolsContainer.style.background = '#FFFFFF';
            toolsContainer.style.borderRadius = '12px';
            toolsContainer.style.border = '1px solid #EAECEF';
            toolsContainer.classList.add('visible');
        } else { toolsContainer.style.display = 'none'; toolsContainer.classList.remove('visible'); }
    }
    if (toggleBtn) {
        toggleBtn.innerHTML = posToolsVisible ? '✕ Masquer tout' : '🔍 Afficher tout';
        toggleBtn.style.background = posToolsVisible ? '#FF5B5B' : '#FFFFFF';
        toggleBtn.style.color = posToolsVisible ? '#fff' : '#1A1D1F';
    }
    var searchInput = document.getElementById('posSearchInput');
    if (searchInput) { searchInput.style.display = posToolsVisible ? 'flex' : 'none'; if (posToolsVisible) setTimeout(function(){ searchInput.focus(); }, 100); }
    var micBtn = document.getElementById('posMicBtn'); if (micBtn) micBtn.style.display = posToolsVisible ? 'flex' : 'none';
    var geminiBtn = document.getElementById('posGeminiBtn'); if (geminiBtn) geminiBtn.style.display = posToolsVisible ? 'flex' : 'none';
    var tablesBtn = document.getElementById('posTablesBtn'); if (tablesBtn) tablesBtn.style.display = posToolsVisible ? 'inline-flex' : 'none';
    var enligneBtn = document.getElementById('posEnLigneBtn'); if (enligneBtn) enligneBtn.style.display = posToolsVisible ? 'inline-flex' : 'none';
    if (!posToolsVisible) {
        posViewMode = 'categories'; posSelectedCategoryForView = null;
        posSelectedCategory = 'all'; posSearchQuery = ''; posProductOffset = 0;
        var si = document.getElementById('posSearchInput'); if (si) si.value = '';
        var cb = document.getElementById('posSearchClearBtn'); if (cb) cb.style.display = 'none';
        if (isOnPOSPage()) filterProductGrid();
    }
}

function applyDynamicContentScroll() {
var container = document.getElementById('dynamicContent');
if (container) {
container.style.overflowY = 'auto';
container.style.overflowX = 'hidden';
container.style.height = '100vh';
container.style.maxHeight = '100vh';
container.style.paddingBottom = '20px';
container.style.position = 'relative';
}
}

// ✅ CORRIGÉ : Reproduit EXACTEMENT le filtre d'Admin-Credits.loadCredits()
// → Lit UNIQUEMENT les VENTES avec les mêmes conditions qu'Admin-Credits
// → Résultat strictement identique (aucune divergence de montant)
async function loadClientCredits(clientId) {
    if (!clientId) return 0;
    if (clientCreditsCache[clientId] !== undefined) return clientCreditsCache[clientId];

    var total = 0;

    // ✅ SOURCE UNIQUE : VENTES — MÊME FILTRE EXACT QUE Admin-Credits
    try {
        var ventesSnap = await db.collection('ventes')
            .where('clientId', '==', clientId)
            .get();

        ventesSnap.forEach(function(doc) {
            var d = doc.data();

            // 🔥 REPRENDRE EXACTEMENT LE FILTRE DE loadCredits() DANS admin-credits.js
            var statut = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
            var remaining = (d.remainingAmount != null) ? d.remainingAmount : (d.total || 0);

            // ❌ Mêmes exclusions qu'Admin-Credits
            if (d.paid === true) return;                              // déjà totalement payé
            if (statut === 'payé') return;                            // statut payé
            if (remaining <= 0.01) return;                            // rien à payer
            if ((d.total || 0) <= 0) return;                          // ⚠️ total = 0 (exclusion ajoutée)
            if (statut !== 'crédit' && statut !== 'partiel') return;  // autres statuts

            var reste = (d.remainingAmount != null)
                ? d.remainingAmount
                : ((d.total || 0) - (d.amountGiven || 0));

            if (reste > 0.01) {
                total += reste;
            }
        });
    } catch(e) {
        console.warn('⚠️ Erreur lecture ventes pour crédit client:', e);
    }

    clientCreditsCache[clientId] = total;
    return total;
}

async function updateClientCreditDisplay(clientId) {
var displayEl = document.getElementById('clientCreditDisplay');
if (!displayEl) return;
if (!clientId) { displayEl.textContent = ''; displayEl.style.display = 'none'; displayEl.onclick = null; return; }
var total = await loadClientCredits(clientId);
if (total > 0) {
displayEl.textContent = '💳 Crédit: ' + total.toFixed(2) + ' MAD (cliquez pour voir)';
displayEl.style.display = 'block';
displayEl.style.color = '#FF5B5B';
displayEl.style.fontWeight = '700';
displayEl.style.fontSize = '22px';
displayEl.style.cursor = 'pointer';
displayEl.style.textDecoration = 'underline';
displayEl.style.textDecorationStyle = 'dotted';
displayEl.onclick = function() {
var posState = { cart: posCart, step: posStep, client: posCurrentClient, table: posCurrentTable, paymentMethod: posPaymentMethod, discountMAD: posDiscountMAD, amountGiven: posAmountGiven, timestamp: Date.now() };
localStorage.setItem('posSavedState', JSON.stringify(posState));
var clientName = posCurrentClient ? posCurrentClient.name : '';
var clientId = posCurrentClient ? posCurrentClient.id : '';
localStorage.setItem('posSelectedCreditClientId', clientId);
localStorage.setItem('posSelectedCreditClientName', clientName);
navigateTo('credits');
};
} else {
displayEl.textContent = '✅ Aucun crédit';
displayEl.style.display = 'block';
displayEl.style.color = '#22C55E';
displayEl.style.fontWeight = '700';
displayEl.style.fontSize = '22px';
displayEl.style.cursor = 'default';
displayEl.style.textDecoration = 'none';
displayEl.onclick = null;
}
}

async function loadPosPage(c){
applyDynamicContentScroll();
posChargerToutesDonneesPaniers();
posLoadMultiCarts();

var savedState = localStorage.getItem('posSavedState');
var shouldRestore = false, restoredState = null;
if (savedState) {
try {
var state = JSON.parse(savedState);
if (state.timestamp && (Date.now() - state.timestamp) < 300000) { shouldRestore = true; restoredState = state; }
else localStorage.removeItem('posSavedState');
} catch(e) { localStorage.removeItem('posSavedState'); }
}

if (!shouldRestore) { posResetCart(); posStep = 1; }
else {
posCart = restoredState.cart || []; window.posCart = posCart;
posStep = restoredState.step || 1;
posCurrentClient = restoredState.client || null;
posCurrentTable = restoredState.table || '';
posPaymentMethod = restoredState.paymentMethod || 'espece';
posDiscountMAD = restoredState.discountMAD || 0;
posAmountGiven = restoredState.amountGiven || 0;
}

posCommandesFilterText=''; posCommandesSortField='createdAt'; posCommandesSortOrder='desc';
posSearchQuery=''; productIndexBuilt=false; posProductOffset=0;
posToolsVisible = (window.innerWidth >= 1024);
posCategoriesList=[]; posProductsList=[]; posAllClients=[]; posFilteredClients=[];
c.innerHTML='<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#2563EB;"></i><p style="margin-top:15px;color:#6F767E;">Chargement du POS...</p></div>';
setStaticBackButtonVisibility(false);

if (shouldRestore) localStorage.removeItem('posSavedState');

try {
let [cc, cp, cl] = await Promise.all([CacheDB.getAll('categories'), CacheDB.getAll('products'), CacheDB.getAll('clients')]);
if (cc.length) posCategoriesList = cc.map(x => ({ id: x.id, nom: x.nom, imageBase64: x.imageBase64, recette: x.recette || false, ordre: x.ordre || 0 }));
if (cp.length) { posProductsList = cp.filter(x => x.disponible !== false).map(x => ({ ...x, description: x.description || '' })); productIndexBuilt = false; }
if (cl.length) { posAllClients = cl.map(x => ({ id: x.id, nom: x.nom, prenom: x.prenom, telephone: x.telephone, description: x.description || '' })); posFilteredClients = [...posAllClients]; }
if (isOnPOSPage()) renderPOS();
if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
} catch(e) { console.error(e); }

setTimeout(async function(){
try{
const [cs, ps, cl] = await Promise.all([db.collection('categories').get(), db.collection('products').get(), db.collection('clients').limit(500).get()]);
posCategoriesList=[]; cs.forEach(d=>{ let cat={id:d.id,nom:d.data().nom,imageBase64:d.data().imageBase64,recette:d.data().recette||false,ordre:d.data().ordre||0}; posCategoriesList.push(cat); CacheDB.set('categories',d.id,cat); });
posProductsList=[]; ps.forEach(d=>{ let dd=d.data(); if(dd.disponible!==false){ let prod={id:d.id,nom:dd.nom||'',description:dd.description||'',prixVente:dd.prixVente||0,prixPromo:dd.prixPromo||0,prixAchat:dd.prixAchat||0,stock:dd.stock,categorie:dd.categorie||'',categories:dd.categories||[],imageBase64:dd.imageBase64||'',favori:dd.favori||false}; posProductsList.push(prod); CacheDB.set('products',d.id,prod); } }); productIndexBuilt=false;
posAllClients=[]; cl.forEach(d=>{ let data=d.data(),cli={id:d.id,nom:data.nom,prenom:data.prenom,telephone:data.telephone,description:data.description||''}; posAllClients.push(cli); CacheDB.set('clients',d.id,cli); }); posFilteredClients=[...posAllClients];
if(isOnPOSPage()) renderPOS();
if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
}catch(e){ console.error(e); }
}, 300);

await posChargerCommandesTables(); await posChargerCommandesEnLigneCount();
var cmdData=localStorage.getItem('posCommandeData'),payData=localStorage.getItem('posPayerVente');
var creditData = localStorage.getItem('posPayerCredit');
if(cmdData){ var cmd=JSON.parse(cmdData); localStorage.removeItem('posCommandeData'); posCart=[]; if(cmd.items){ posEnrichirItemsAvecPrixAchat(cmd.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||item.prixUnitaire||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||item.prixUnitaire||0,quantite:item.quantite||1,categorie:item.categorie||'',imageBase64:item.imageBase64||'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } window.posCart = posCart; if(cmd.clientId&&cmd.clientName) posCurrentClient={id:cmd.clientId,name:cmd.clientName}; posCurrentTable=cmd.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posCommandeId=cmd.commandeId; if(isOnPOSPage()) renderPOS(); return; }
if(payData){ var v=JSON.parse(payData); localStorage.removeItem('posPayerVente'); posCart=[]; if(v.items){ posEnrichirItemsAvecPrixAchat(v.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||0,quantite:item.quantite||1,categorie:'',imageBase64:'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } window.posCart = posCart; if(v.clientId&&v.clientName) posCurrentClient={id:v.clientId,name:v.clientName}; posCurrentTable=v.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posVenteId=v.venteId; if(isOnPOSPage()) renderPOS(); return; }
if(creditData){
try {
var data = JSON.parse(creditData);
localStorage.removeItem('posPayerCredit');
posCart=[]; window.posCart=posCart;
if (data.clientName) posCurrentClient = { id: data.clientId, name: data.clientName };
if (data.items && data.items.length > 0) {
data.items.forEach(function(item) { posCart.push({id: item.id || 'credit-' + Date.now(),nom: item.nom || item.name || 'Produit',prixUnitaire: item.prixVente || item.price || 0,quantite: item.quantite || 1,prixAchat: item.prixAchat || 0,prixPromo: item.prixPromo || 0,prixVente: item.prixVente || item.price || 0,categorie: item.categorie || '',imageBase64: item.imageBase64 || '',sauces: item.sauces || [],interdits: item.interdits || [],epice: item.epice || 'Normal',sel: item.sel || 'Normal'}); });
}
var total = data.total || 0;
if (total > 0) { posAmountGiven = total; posDiscountMAD = 0; }
posStep = 2; window.posStep = 2; posPaymentMethod = 'espece';
if (typeof window.setVoiceMode === 'function') window.setVoiceMode('payment', '💳 Paiement crédit', null);
} catch(e) { console.warn('❌ Erreur chargement crédit:', e); }
}
if(isOnPOSPage()) renderPOS();

if (shouldRestore && posStep === 2) {
setTimeout(function() {
var amountInput = document.getElementById('posAmountGiven');
if (amountInput && posAmountGiven > 0) { amountInput.value = posAmountGiven.toFixed(2); if (typeof posCalculateChange === 'function') posCalculateChange(); }
if (posCurrentClient && posCurrentClient.id) updateClientCreditDisplay(posCurrentClient.id);
if (posCurrentClient && posCurrentClient.name) { var ci = document.getElementById('posClientSearchInput'); if (ci) ci.value = posCurrentClient.name; }
if (typeof window.updatePaymentButtons === 'function') window.updatePaymentButtons();
}, 500);
}

if (posStep === 2 && posAmountGiven > 0) {
setTimeout(function() {
var input = document.getElementById('posAmountGiven');
if (input) { input.value = posAmountGiven.toFixed(2); if (typeof posCalculateChange === 'function') posCalculateChange(); }
if (posCurrentClient && posCurrentClient.id) updateClientCreditDisplay(posCurrentClient.id);
if (posCurrentClient && posCurrentClient.name) { var ci = document.getElementById('posClientSearchInput'); if (ci) ci.value = posCurrentClient.name; }
if (typeof window.updatePaymentButtons === 'function') window.updatePaymentButtons();
}, 500);
}
}

function posSearchProducts(query){
clearTimeout(window._searchTimeout);
window._searchTimeout = setTimeout(function(){
posProductOffset = 0;
posSearchQuery = query.toLowerCase().trim();
if (posViewMode === 'categories' && posSearchQuery.length > 0) { posViewMode = 'products'; posSelectedCategoryForView = null; }
if (posSearchQuery.length > 0 && !posSearchCache[posSearchQuery]) {
    if (typeof fastSearch === 'function') posSearchCache[posSearchQuery] = fastSearch(posSearchQuery).slice();
}
if(isOnPOSPage()) filterProductGrid();
}, 80);
}

function clearPosSearch() {
var input = document.getElementById('posSearchInput');
if (input) {
input.value = ''; posSearchQuery = ''; posProductOffset = 0;
if (isOnPOSPage()) filterProductGrid();
input.focus();
var clearBtn = document.getElementById('posSearchClearBtn');
if (clearBtn) clearBtn.style.display = 'none';
}
}

function clearClientSearch() {
var input = document.getElementById('posClientSearchInput');
if (input) {
input.value = ''; posCurrentClient = null; posCurrentTable = '';
var dropdown = document.getElementById('posClientDropdown'); if (dropdown) dropdown.style.display = 'none';
var creditDisplay = document.getElementById('clientCreditDisplay'); if (creditDisplay) creditDisplay.style.display = 'none';
updatePaymentButtons();
if (isOnPOSPage()) renderPOS();
input.focus();
var clearBtn = document.getElementById('posClientClearBtn'); if (clearBtn) clearBtn.style.display = 'none';
}
}

function loadMoreProducts(){ posProductOffset+=posProductBatchSize; filterProductGrid(); }

function filterProductGrid(){
if(!isOnPOSPage() || posStep !== 1) return;
var grid = document.getElementById('posProductGrid') || document.querySelector('.pos-products-grid');
if(!grid) return;
if (posViewMode === 'categories') { afficherCategories(grid); return; }

var f;
if (posSearchCache[posSearchQuery]) f = posSearchCache[posSearchQuery].slice();
else { f = fastSearch(posSearchQuery); posSearchCache[posSearchQuery] = f.slice(); }

if (posSelectedCategoryForView) {
f = f.filter(function(p) { if (p.categories && p.categories.length > 0) return p.categories.includes(posSelectedCategoryForView); return p.categorie === posSelectedCategoryForView; });
} else if (posSelectedCategory !== 'all') {
f = f.filter(function(p) { if (p.categories && p.categories.length > 0) return p.categories.includes(posSelectedCategory); return p.categorie === posSelectedCategory; });
}

f.sort(function(a,b){ return (a.nom||'').localeCompare(b.nom||''); });

var totalProducts = f.length;
var displayProducts = f.slice(0, posProductOffset + posProductBatchSize);
posHasMoreProducts = (posProductOffset + posProductBatchSize) < totalProducts;

var isMobile = window.innerWidth < 700;
var gridCols = isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))';
grid.style.gridTemplateColumns = gridCols;
grid.style.overflowX = 'hidden';
grid.style.overflowY = 'auto';
grid.style.flexWrap = 'wrap';
grid.style.alignContent = 'start';

var html = '';
html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:6px;background:#F7F8FA;border-radius:10px;border:1px solid #EAECEF;">';
html += '<button onclick="retournerCategories()" style="display:flex;align-items:center;gap:6px;background:#FFFFFF;color:#1A1D1F;border:1px solid #EAECEF;border-radius:10px;padding:8px 16px;font-size:0.85rem;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.04);">';
html += '<i class="fas fa-arrow-left"></i> Retour aux catégories';
html += '</button>';
if (posSelectedCategoryForView) html += '<span style="font-weight:700;font-size:0.9rem;color:#2563EB;background:#EFF6FF;padding:6px 14px;border-radius:10px;border:1px solid #BFDBFE;">📂 ' + escapeHtml(posSelectedCategoryForView) + '</span>';
html += '</div>';

if(totalProducts === 0){
html += '<div style="grid-column:1/-1;text-align:center;padding:40px 10px;"><i class="fas fa-search" style="font-size:2.5rem;color:#9A9FA5;"></i><p style="color:#9A9FA5;margin-top:10px;">Aucun produit dans cette catégorie</p></div>';
} else {
if(posSearchQuery) html += '<div style="grid-column:1/-1;padding:3px 8px;font-size:0.75rem;color:#9A9FA5;">' + totalProducts + ' résultat' + (totalProducts>1?'s':'') + '</div>';

for(var j = 0; j < displayProducts.length; j++){
var p = displayProducts[j];
var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
var hp = p.prixPromo && p.prixPromo > 0;
var sc = '', stt = '';
if(p.stock !== undefined){
if(p.stock <= 0){ sc = 'pos-out-of-stock'; stt = ' (Rupture)'; }
else if(p.stock <= 5) stt = ' (' + p.stock + ' rest.)';
}

var dn = escapeHtml(p.nom);
if(posSearchQuery) dn = dn.replace(new RegExp('(' + posSearchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','gi'), '<mark style="background:#FEF3C7;border-radius:3px;color:#111827;">$1</mark>');

var isMobile = window.innerWidth < 700;

// 🎨 Cartes adaptatives : 190px desktop / 145-170px mobile
var cardStyle = isMobile ?
'padding:6px 4px;min-height:145px;max-height:170px;aspect-ratio:1/1;border-radius:10px;border-width:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;' :
'padding:12px 10px;min-height:190px;max-height:200px;aspect-ratio:1/1;border-radius:14px;border-width:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;';

var imgStyle = isMobile ?
'height:70px;width:70px;margin-bottom:5px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#F7F8FA;display:flex;align-items:center;justify-content:center;' :
'height:85px;width:85px;margin-bottom:8px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#F7F8FA;display:flex;align-items:center;justify-content:center;';

var nameStyle = isMobile ?
'font-size:10px !important;font-weight:600 !important;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#1A1D1F;margin:1px 0;' :
'font-size:0.85rem !important;font-weight:700 !important;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#1A1D1F;margin:3px 0;';

var priceStyle = isMobile ?
'font-size:12px !important;font-weight:800 !important;color:#1A1D1F;' :
'font-size:0.90rem !important;font-weight:800 !important;color:#1A1D1F;letter-spacing:-0.3px;';

var imgContent = '';
if (p.imageBase64) imgContent = '<img src="' + escapeHtml(p.imageBase64) + '" loading="lazy" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
else imgContent = '<i class="fas fa-box" style="' + (isMobile ? 'font-size:22px;color:#9A9FA5;' : 'font-size:30px;color:#9A9FA5;') + '"></i>';

html += '<div class="pos-product-card ' + sc + '" style="' + cardStyle + 'content-visibility:auto;contain-intrinsic-size:190px 190px;" onclick="posAddToCartOrOpenOptions(\'' + p.id + '\')">' +
'<div class="pos-product-img" style="' + imgStyle + '">' + imgContent + '</div>' +
'<div class="pos-product-info" style="display:flex;flex-direction:column;align-items:center;width:100%;flex:1;justify-content:center;overflow:hidden;min-height:0;">' +
'<span class="pos-product-name" style="' + nameStyle + '">' + dn + stt + '</span>' +
'<span class="pos-product-price" style="' + priceStyle + '">' +
(hp ? '<span class="pos-old-price" style="' + (isMobile ? 'font-size:9px;' : 'font-size:0.7rem;') + 'text-decoration:line-through;color:#9A9FA5;">' + p.prixVente.toFixed(2) + '</span> <span class="pos-promo-price" style="' + (isMobile ? 'font-size:12px;color:#FF5B5B;' : 'font-size:0.90rem;color:#FF5B5B;') + '">' + pr.toFixed(2) + ' MAD</span>' : pr.toFixed(2) + ' MAD') +
'</span></div></div>';
}

if(posHasMoreProducts) html += '<div style="grid-column:1/-1;text-align:center;padding:10px;"><button class="btn-add" onclick="loadMoreProducts()" style="font-size:0.8rem;">Afficher plus (' + (totalProducts - displayProducts.length) + ' produits restants)</button></div>';
}
grid.innerHTML = html;
updateClearButtonVisibility();
}

function afficherCategories(grid) {
var isMobile = window.innerWidth < 700;
var isTablette = window.innerWidth >= 700 && window.innerWidth <= 1024;
var isPC = window.innerWidth > 1024;

var gridCols = isMobile ? 'repeat(3, 1fr)' : (isTablette ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)');
grid.style.gridTemplateColumns = gridCols;
grid.style.overflowX = 'hidden';
grid.style.overflowY = 'auto';
grid.style.flexWrap = 'wrap';
grid.style.alignContent = 'start';

var html = '';
html += '<div style="grid-column:1/-1;padding:6px 8px;font-size:0.9rem;font-weight:700;color:#1A1D1F;">📂 Choisissez une catégorie</div>';

if (posCategoriesList.length === 0) {
html += '<div style="grid-column:1/-1;text-align:center;padding:40px 10px;"><i class="fas fa-folder-open" style="font-size:2.5rem;color:#9A9FA5;"></i><p style="color:#9A9FA5;margin-top:10px;">Aucune catégorie disponible</p></div>';
} else {
var sortedCategories = posCategoriesList.slice().sort(function(a, b) {
var ordreA = (a.ordre !== undefined && a.ordre !== null) ? parseInt(a.ordre) : 9999;
var ordreB = (b.ordre !== undefined && b.ordre !== null) ? parseInt(b.ordre) : 9999;
if (ordreA !== ordreB) return ordreA - ordreB;
return (a.nom || '').localeCompare(b.nom || '');
});

var imgSize, cardMinHeight, cardMaxHeight, folderSize, nameSize, countSize;

if (isPC) { imgSize='140px'; cardMinHeight='170px'; cardMaxHeight='210px'; folderSize='65px'; nameSize='16px'; countSize='12px'; }
else if (isTablette) { imgSize='130px'; cardMinHeight='160px'; cardMaxHeight='190px'; folderSize='60px'; nameSize='13px'; countSize='10px'; }
else { imgSize='65px'; cardMinHeight='90px'; cardMaxHeight='100px'; folderSize='30px'; nameSize='8px'; countSize='7px'; }

if (window.innerWidth < 400) { imgSize='50px'; cardMinHeight='75px'; cardMaxHeight='90px'; folderSize='24px'; nameSize='7px'; countSize='6px'; }

for (var i = 0; i < sortedCategories.length; i++) {
var cat = sortedCategories[i];
var count = posProductsList.filter(function(p) { if (p.categories && p.categories.length > 0) return p.categories.includes(cat.nom); return p.categorie === cat.nom; }).length;

var imgContent = '';
if (cat.imageBase64) imgContent = '<img src="' + escapeHtml(cat.imageBase64) + '" loading="lazy" alt="' + escapeHtml(cat.nom) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
else imgContent = '<i class="fas fa-folder" style="font-size:' + folderSize + ';color:#2563EB;"></i>';

var cardStyle = 'min-height:' + cardMinHeight + ';max-height:' + cardMaxHeight + ';padding:8px 4px;border-radius:14px;border:1px solid #EAECEF;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;background:#FFFFFF;cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);gap:2px;box-shadow:0 1px 3px rgba(0,0,0,0.04);';

var imgStyle = 'width:' + imgSize + ';height:' + imgSize + ';border-radius:50%;overflow:hidden;flex-shrink:0;background:#F7F8FA;display:flex;align-items:center;justify-content:center;margin-bottom:2px;border:1px solid #EAECEF;';

var nameStyle = 'font-size:' + nameSize + ';font-weight:700;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;color:#1A1D1F;margin-top:2px;line-height:1.2;display:block;';

var countStyle = 'font-size:' + countSize + ';color:#9A9FA5;font-weight:500;display:block;margin-top:0px;';

html += '<div class="pos-category-card" data-cat-name="' + escapeHtml(cat.nom) + '" style="' + cardStyle + '" onclick="selectionnerCategorie(\'' + escapeHtml(cat.nom).replace(/'/g, "\\'") + '\')">' +
'<div style="' + imgStyle + '">' + imgContent + '</div>' +
'<span style="' + nameStyle + '">' + escapeHtml(cat.nom) + '</span>' +
'<span style="' + countStyle + '">' + count + ' produit' + (count > 1 ? 's' : '') + '</span></div>';
}
}
grid.innerHTML = html;
}

function selectionnerCategorie(catName) {
document.querySelectorAll('.pos-category-card').forEach(function(card) {
card.classList.remove('active');
card.style.borderColor = '#EAECEF';
card.style.transform = 'translateY(0)';
card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
card.style.background = '#FFFFFF';
card.style.color = '#1A1D1F';
});

document.querySelectorAll('.pos-category-card').forEach(function(card) {
var nameSpan = card.querySelector('span:first-of-type');
if (nameSpan && nameSpan.textContent.trim() === catName) {
card.classList.add('active');
card.style.borderColor = '#2563EB';
card.style.background = '#2563EB';
card.style.color = '#FFFFFF';
card.style.transform = 'translateY(-2px)';
card.style.boxShadow = '0 4px 14px rgba(37,99,235,0.25)';
}
});

posSelectedCategoryForView = catName;
posViewMode = 'products';
posProductOffset = 0;
posSearchQuery = '';
posSelectedCategory = catName;
var searchInput = document.getElementById('posSearchInput'); if (searchInput) searchInput.value = '';
if (isOnPOSPage()) filterProductGrid();
}

function retournerCategories() {
document.querySelectorAll('.pos-category-card').forEach(function(card) {
card.classList.remove('active');
card.style.borderColor = '#EAECEF';
card.style.transform = 'translateY(0)';
card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
card.style.background = '#FFFFFF';
card.style.color = '#1A1D1F';
});
posViewMode = 'categories'; posSelectedCategoryForView = null;
posSelectedCategory = 'all'; posSearchQuery = ''; posProductOffset = 0;
var searchInput = document.getElementById('posSearchInput'); if (searchInput) searchInput.value = '';
if (isOnPOSPage()) filterProductGrid();
}

function posSearchClient(query){
var q = query.toLowerCase().trim();
posCurrentClient = null;
var dropdown = document.getElementById('posClientDropdown');
var clearBtn = document.getElementById('posClientClearBtn');
if (!q) {
posFilteredClients = posAllClients.slice();
if (dropdown) dropdown.style.display = 'none';
document.getElementById('clientCreditDisplay').style.display = 'none';
if (clearBtn) clearBtn.style.display = 'none';
updatePaymentButtons();
if (isOnPOSPage()) renderPOS();
return;
}
if (clearBtn) clearBtn.style.display = 'flex';

if (typeof window.clientSearchCache === 'undefined') window.clientSearchCache = {};
if (window.clientSearchCache[q]) posFilteredClients = window.clientSearchCache[q].slice();
else {
posFilteredClients = posAllClients.filter(function(c){
return (c.nom||'').toLowerCase().indexOf(q)!==-1 || (c.prenom||'').toLowerCase().indexOf(q)!==-1 || (c.telephone||'').toLowerCase().indexOf(q)!==-1 || (c.description||'').toLowerCase().indexOf(q)!==-1;
});
var keys = Object.keys(window.clientSearchCache);
if (keys.length > 100) window.clientSearchCache = {};
window.clientSearchCache[q] = posFilteredClients.slice();
}

if (posFilteredClients.length === 1) {
var client = posFilteredClients[0];
posCurrentClient = { id: client.id, name: client.nom + ' ' + client.prenom };
var input = document.getElementById('posClientSearchInput'); if (input) input.value = posCurrentClient.name;
if (dropdown) dropdown.style.display = 'none';
if (clearBtn) clearBtn.style.display = 'flex';
updateClientCreditDisplay(client.id);
updatePaymentButtons();
if (isOnPOSPage()) renderPOS();
setTimeout(function() { if (posStep === 1 && isOnPOSPage()) posGoToStep2(); }, 300);
return;
}
if (posFilteredClients.length > 0) renderClientDropdown();
else { if (dropdown) dropdown.style.display = 'none'; }
}

function renderClientDropdown(){
var d = document.getElementById('posClientDropdown');
if (!d) return;
var h = '';
if (posFilteredClients.length === 0) h = '<div style="padding:8px;color:#9A9FA5;text-align:center;font-size:14px;">Aucun</div>';
else {
posFilteredClients.forEach(function(c){
h += '<div onclick="posSelectClientFromDropdown(\''+c.id+'\',\''+escapeHtml(c.nom)+' '+escapeHtml(c.prenom)+'\')" style="padding:8px;cursor:pointer;border-bottom:1px solid #EAECEF;font-size:14px;">' + escapeHtml(c.nom)+' '+escapeHtml(c.prenom) + ' <span style="color:#9A9FA5;font-size:12px;">('+(c.telephone||'')+')</span></div>';
});
}
d.innerHTML = h;
d.style.display = 'block';
}

function posSelectClientFromDropdown(cid,cn){
posCurrentClient={id:cid,name:cn}; posCurrentTable='';
var s=document.getElementById('posClientSearchInput'); var t=document.getElementById('posTableNum');
var d=document.getElementById('posClientDropdown'); var clearBtn=document.getElementById('posClientClearBtn');
if(s) s.value=cn; if(t) t.value=''; if(d) d.style.display='none'; if(clearBtn) clearBtn.style.display='flex';
updatePaymentButtons(); updateClientCreditDisplay(cid);
if(isOnPOSPage()) renderPOS();
setTimeout(function() { if (posStep === 1 && isOnPOSPage()) posGoToStep2(); }, 300);
}

document.addEventListener('click',function(e){
var d=document.getElementById('posClientDropdown'); var s=document.getElementById('posClientSearchInput');
if(d && s && !s.contains(e.target) && !d.contains(e.target)) {
d.style.display='none';
if (posCurrentClient && posCurrentClient.name) s.value = posCurrentClient.name;
}
});

function updatePaymentButtons(){ setTimeout(function(){ var cb=document.getElementById('posCreditBtn'),pb=document.getElementById('posPartielBtn'),cc=posCurrentClient&&posCurrentClient.id; if(cb){ cb.disabled=!cc; cb.style.opacity=cc?'1':'0.4'; } if(pb){ pb.disabled=!cc; pb.style.opacity=cc?'1':'0.4'; } },300); }
function posSetTable(v){ posCurrentTable=v.trim(); if(posCurrentTable){ posCurrentClient=null; posPaymentMethod='espece'; var s=document.getElementById('posClientSearchInput'); if(s) s.value=''; document.getElementById('clientCreditDisplay').style.display='none'; var clearBtn=document.getElementById('posClientClearBtn'); if(clearBtn) clearBtn.style.display='none'; } }

function posAddToCartOrOpenOptions(pid){ 
    var p=posProductsList.find(function(x){ return x.id===pid; }); 
    if(!p) return; 
    if(p.stock!==undefined&&p.stock<=0){ alert('Rupture'); return; } 
    var cat=posCategoriesList.find(function(c){ return c.nom===p.categorie; }),isRecette=cat&&cat.recette===true; 
    if(isRecette){ posCurrentProductId=pid; posOpenOptionsModal(pid); } 
    else { 
        var ex=posCart.find(function(x){ return x.id===pid; }); 
        if(ex){ if(p.stock!==undefined&&ex.quantite>=p.stock){ alert('Stock insuffisant'); return; } ex.quantite+=1; } 
        else { var pr=p.prixPromo&&p.prixPromo>0?p.prixPromo:p.prixVente; posCart.push({id:p.id,nom:p.nom,prixUnitaire:pr,prixAchat:p.prixAchat||0,prixPromo:p.prixPromo||0,prixVente:p.prixVente||0,quantite:1,categorie:p.categorie||'',imageBase64:p.imageBase64||'',sauces:[],interdits:[],epice:'Normal',sel:'Normal'}); } 
        window.posCart = posCart;
        if(typeof window.onProductAdded==='function') window.onProductAdded(p.id); 
        updateCartOnly(); 
    } 
    posMultiCarts[posCurrentCartId] = posCart.slice(); 
    posSauvegarderDonneesPanier(posCurrentCartId); 
    posSaveMultiCarts(); 
}

async function posOpenOptionsModal(pid) {
var p = posProductsList.find(function(x) { return x.id === pid; });
if (!p) return;
if (p.stock !== undefined && p.stock <= 0) { alert('Rupture'); return; }
try {
var doc = await db.collection('products').doc(pid).get();
if (doc.exists) posCurrentProductIngredients = doc.data().ingredients || [];
else posCurrentProductIngredients = [];
} catch(e) { posCurrentProductIngredients = []; }

if (typeof allStockData === 'undefined' || allStockData.length === 0) {
try {
const snap = await db.collection('stock').orderBy('nom').get();
allStockData = [];
snap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allStockData.push(dd); });
} catch(e) {}
}

var grouped = {};
posCurrentProductIngredients.forEach(function(ing) {
var stockItem = allStockData.find(function(s) { return s.id === ing.idStock; });
var cat = stockItem ? (stockItem.categorie || 'Ingrédients') : 'Ingrédients';
if (!grouped[cat]) grouped[cat] = [];
grouped[cat].push({nom: ing.nom, idStock: ing.idStock, quantite: ing.quantite || 1, unite: ing.unite || '', stockDisponible: stockItem ? (stockItem.quantite || 0) : 0});
});

var order = ['Sauces', 'Légumes', 'Fruits', 'Viande', 'Poulet', 'Poisson', 'Ingrédients'];
var sortedCats = Object.keys(grouped).sort(function(a, b) {
var ia = order.indexOf(a), ib = order.indexOf(b);
if (ia !== -1 && ib !== -1) return ia - ib;
if (ia !== -1) return -1;
if (ib !== -1) return 1;
return a.localeCompare(b);
});

posCurrentProductId = pid;
var h = '<h4 style="font-size:1.2rem;margin-bottom:12px;">' + escapeHtml(p.nom) + '</h4>';
h += '<p style="color:#6F767E;font-size:0.85rem;margin-bottom:12px;">Sélectionnez les ingrédients à conserver :</p>';

if (sortedCats.length === 0) h += '<div style="color:#9A9FA5;padding:12px;">Aucun ingrédient pour ce produit</div>';
else {
sortedCats.forEach(function(cat) {
h += '<div style="margin-bottom:14px;"><label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:4px;">🥫 ' + escapeHtml(cat) + '</label><div style="display:flex;flex-wrap:wrap;gap:8px;">';
grouped[cat].forEach(function(ing) {
var disabled = ing.stockDisponible <= 0 ? 'disabled' : '';
h += '<label style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #EAECEF;border-radius:10px;cursor:' + (ing.stockDisponible <= 0 ? 'not-allowed' : 'pointer') + ';' + (ing.stockDisponible <= 0 ? 'opacity:0.5;' : '') + '">';
h += '<input type="checkbox" class="pos-interdit-check" value="' + escapeHtml(ing.nom) + '" ' + disabled + ' checked> ' + escapeHtml(ing.nom);
if (ing.unite) h += ' (' + escapeHtml(ing.unite) + ')';
h += '</label>';
});
h += '</div></div>';
});
}

h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🌶️ Épices:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
posEpicesList.forEach(function(s, idx) { h += '<label style="padding:6px 12px;border:1px solid #EAECEF;border-radius:10px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="pos-epice" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>'; });
h += '</div></div>';

h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🧂 Sel:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
posSelList.forEach(function(s, idx) { h += '<label style="padding:6px 12px;border:1px solid #EAECEF;border-radius:10px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="pos-sel" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>'; });
h += '</div></div>';

h += '<div style="text-align:right;margin-top:16px;display:flex;gap:10px;justify-content:flex-end;"><button class="btn-cancel" onclick="closeModal()" style="font-size:0.9rem;padding:10px 20px;">Annuler</button><button class="btn-save" onclick="posConfirmOptions()" style="font-size:0.9rem;padding:10px 24px;"><i class="fas fa-check"></i> Ajouter au panier</button></div>';
openModal('Personnaliser - ' + escapeHtml(p.nom), h);
}

function posConfirmOptions() {
var interdits = [];
document.querySelectorAll('.pos-interdit-check:checked').forEach(function(cb) { interdits.push(cb.value); });
var epice = (document.querySelector('input[name="pos-epice"]:checked') || {}).value || 'Normal';
var sel = (document.querySelector('input[name="pos-sel"]:checked') || {}).value || 'Normal';
var p = posProductsList.find(function(x) { return x.id === posCurrentProductId; });
if (!p) { closeModal(); return; }

var ingredientsExclus = [];
document.querySelectorAll('.pos-interdit-check:checked').forEach(function(cb) { ingredientsExclus.push(cb.value.toLowerCase().trim()); });

var ex = posCart.find(function(x) { return x.id === posCurrentProductId; });
if (ex) { if (p.stock !== undefined && ex.quantite >= p.stock) { alert('Stock insuffisant'); closeModal(); return; } ex.quantite += 1; }
else {
var pr = p.prixPromo && p.prixPromo > 0 ? p.prixPromo : p.prixVente;
posCart.push({id: p.id, nom: p.nom, prixUnitaire: pr, prixAchat: p.prixAchat || 0, prixPromo: p.prixPromo || 0, prixVente: p.prixVente || 0, quantite: 1, categorie: p.categorie || '', imageBase64: p.imageBase64 || '', sauces: [], interdits: interdits, epice: epice, sel: sel, ingredientsExclus: ingredientsExclus});
}

decrementerIngredientsStock(posCurrentProductId, ingredientsExclus);
if (typeof window.onProductAdded === 'function') window.onProductAdded(p.id);
closeModal(); updateCartOnly();
posMultiCarts[posCurrentCartId] = posCart.slice();
posSauvegarderDonneesPanier(posCurrentCartId);
posSaveMultiCarts();
}

function decrementerIngredientsStock(productId, ingredientsExclus) {
db.collection('products').doc(productId).get().then(function(doc) {
if (!doc.exists) return;
var ingredients = doc.data().ingredients || [];
ingredients.forEach(function(ing) {
var isExcluded = ingredientsExclus.some(function(excl) { return excl === ing.nom.toLowerCase().trim(); });
if (!isExcluded && ing.idStock) {
var quantite = ing.quantite || 1;
db.collection('stock').doc(ing.idStock).get().then(function(stockDoc) {
if (!stockDoc.exists) return;
var nouveauStock = Math.max(0, (stockDoc.data().quantite || 0) - quantite);
db.collection('stock').doc(ing.idStock).update({ quantite: nouveauStock, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function() {
var stockItem = allStockData.find(function(s) { return s.id === ing.idStock; });
if (stockItem) { stockItem.quantite = nouveauStock; CacheDB.set('stock', ing.idStock, stockItem); }
if (typeof renderStockTable === 'function') renderStockTable();
});
});
}
});
});
}

// ==================== updateCartOnly() — PANIER V2 ====================
// ✅ Nom produit EN HAUT (peut sauter à la ligne)
// ✅ Boutons +/- et supprimer À DROITE
// ✅ Sous-total À DROITE
function updateCartOnly(){
if(!isOnPOSPage()) return;
var ci=document.querySelector('.pos-cart-items');
if(!ci) return;
var html='';
if(posCart.length===0) {
html='<div class="pos-cart-empty" style="text-align:center;padding:20px;color:#9A9FA5;"><i class="fas fa-shopping-basket" style="font-size:28px;"></i><p style="font-size:0.85rem;margin-top:8px;">Panier vide</p></div>';
} else {
var isMobile = window.innerWidth < 700;

for(var k=0;k<posCart.length;k++){
var it=posCart[k], opts='';
if(it.interdits&&it.interdits.length) opts+=' <span style="color:#FF5B5B;font-size:0.6rem;">🚫'+escapeHtml(it.interdits.join(','))+'</span>';
if(it.epice&&it.epice!=='Normal') opts+=' <span style="color:#F59E0B;font-size:0.6rem;">🌶️'+escapeHtml(it.epice)+'</span>';
if(it.sel&&it.sel!=='Normal') opts+=' <span style="color:#8B5CF6;font-size:0.6rem;">🧂'+escapeHtml(it.sel)+'</span>';

var btnSize = isMobile ? '28px' : '26px';
var btnFontSize = isMobile ? '0.7rem' : '0.65rem';
var qtySize = isMobile ? '0.85rem' : '0.75rem';
var nameSize = isMobile ? '13px' : '0.80rem';
var priceSize = isMobile ? '11px' : '0.70rem';
var totalSize = isMobile ? '14px' : '0.85rem';

html += '<div class="pos-cart-item" style="display:flex;flex-direction:column;padding:10px 8px;border-bottom:1px solid #EAECEF;gap:6px;background:#FFFFFF;border-radius:10px;margin-bottom:4px;">' +
'<div style="width:100%;font-size:'+nameSize+';font-weight:700;color:#1A1D1F;line-height:1.4;word-break:break-word;white-space:normal;">'+escapeHtml(it.nom)+opts+'</div>' +
'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">' +
'<div style="display:flex;flex-direction:column;gap:2px;min-width:60px;">' +
'<span style="font-size:'+priceSize+';color:#6F767E;font-weight:500;">'+it.prixUnitaire.toFixed(2)+' MAD</span>' +
'</div>' +
'<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:1px solid #EAECEF;background:#FFFFFF;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;transition:all 0.15s;"><i class="fas fa-minus"></i></button>' +
'<input type="number" class="pos-qty-input" value="'+it.quantite+'" min="1" onchange="posUpdateQtyInput('+k+', this.value)" onkeyup="posUpdateQtyInput('+k+', this.value)" onclick="this.select()" style="font-size:'+qtySize+';font-weight:700;width:50px;text-align:center;border:1px solid #EAECEF;border-radius:10px;padding:4px 4px;background:#FFFFFF;color:#1A1D1F;-moz-appearance:textfield;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:1px solid #EAECEF;background:#FFFFFF;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;transition:all 0.15s;"><i class="fas fa-plus"></i></button>' +
'<button class="pos-remove-btn" onclick="posRemoveItem('+k+')" style="background:transparent;border:none;color:#FF5B5B;cursor:pointer;padding:6px;font-size:0.85rem;transition:all 0.15s;border-radius:8px;"><i class="fas fa-trash-alt"></i></button>' +
'</div>' +
'<div style="min-width:70px;text-align:right;flex-shrink:0;">' +
'<span style="font-size:'+totalSize+';font-weight:800;color:#2563EB;">'+(it.prixUnitaire*it.quantite).toFixed(2)+' MAD</span>' +
'</div>' +
'</div></div>';
}
}
ci.innerHTML=html;
var badge=document.querySelector('.pos-cart-badge');
if(badge) badge.textContent=posCart.length;
var tr=document.querySelector('.pos-cart-total-row span:last-child');
if(tr){
var st=posCalculateTotal(),t=st-posDiscountMAD;
tr.textContent=t.toFixed(2)+' MAD';
}
var vb=document.querySelector('.pos-validate-btn');
if(vb) vb.disabled=posCart.length===0;
}

function getNextFactureNum(){ factureCounter=parseInt(localStorage.getItem('factureCounter'))||0; factureCounter++; localStorage.setItem('factureCounter',factureCounter); return 'FACT-'+new Date().getFullYear()+'-'+String(factureCounter).padStart(5,'0'); }

function renderPOS(){
applyDynamicContentScroll();
if(!isOnPOSPage()) return;
var now=Date.now(); if(now-posLastRenderTime<100&&posCart.length>0) return; posLastRenderTime=now;
var c=document.getElementById('dynamicContent'); if(!c) return;
if(posCart.length===0&&posStep===1){ buildFullPOS(c); return; }
if(document.querySelector('.pos-container')&&posStep===1&&posCart.length>0){
var productPanel = document.querySelector('.pos-products-panel');
if (productPanel) productPanel.style.display = 'flex';
updateCartOnly();
filterProductGrid();
var tr=document.querySelector('.pos-cart-total-row span:last-child');
if(tr){ var st=posCalculateTotal(),t=st-posDiscountMAD; tr.textContent=t.toFixed(2)+' MAD'; }
return;
}
buildFullPOS(c);
}

function buildFullPOS(c){
if(posProductsList.length===0&&posCategoriesList.length===0){ c.innerHTML='<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2563EB;"></i><p>Chargement...</p></div>'; return; }
var st=posCalculateTotal(),t=st-posDiscountMAD;
var isMobile = window.innerWidth < 700;
var productPanelStyle = posStep===2 ? ' style="display:none;"' : '';
var stepSize = isMobile ? '14px' : '16px';
var stepGap = isMobile ? '6px' : '10px';

var stepIndicator = '<div class="pos-steps-nav">' +
'<div class="pos-step ' + (posStep === 1 ? 'active' : '') + '" onclick="posNaviguerEtape(1)">' +
'<span class="step-number">1</span><span style="font-size:'+stepSize+';font-weight:600;">Panier</span></div>' +
'<div class="pos-step ' + (posStep === 2 ? 'active' : '') + '" onclick="posNaviguerEtape(2)">' +
'<span class="step-number">2</span><span style="font-size:'+stepSize+';font-weight:600;">Paiement</span></div></div>';

var multiCartBar = '<div class="pos-multi-carts-bar">';
var cartCount = Object.keys(posMultiCarts).length;
var isMax = cartCount >= MAX_PANIERS;
multiCartBar += '<button onclick="posCreateNewCart()" style="background:' + (isMax ? '#9A9FA5' : '#2563EB') + ';color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:' + (isMax ? 'not-allowed' : 'pointer') + ';display:flex;align-items:center;gap:4px;opacity:' + (isMax ? '0.6' : '1') + ';" ' + (isMax ? 'disabled' : '') + '><i class="fas fa-plus"></i> Nouveau</button>';

var cartKeys = Object.keys(posMultiCarts);
for (var k = 0; k < cartKeys.length; k++) {
var cid = cartKeys[k];
var isActive = (cid === posCurrentCartId);
var count = (posMultiCarts[cid] || []).length;
var total = 0;
var items = posMultiCarts[cid] || [];
for (var itm = 0; itm < items.length; itm++) total += (items[itm].prixUnitaire || 0) * (items[itm].quantite || 0);
var clientName = '';
if (posMultiPaniersData[cid] && posMultiPaniersData[cid].client) clientName = posMultiPaniersData[cid].client.name || '';
var displayName = clientName ? clientName.substring(0, 12) : '';
var bgColor = isActive ? '#EFF6FF' : '#FFFFFF';
var borderColor = isActive ? '#2563EB' : '#EAECEF';
var textColor = isActive ? '#2563EB' : '#1A1D1F';
var fontWeight = isActive ? '700' : '500';
multiCartBar += '<div style="display:flex;align-items:center;gap:2px;border:1px solid ' + borderColor + ';border-radius:10px;background:' + bgColor + ';padding:4px 10px;">';
multiCartBar += '<button onclick="posSwitchToCart(\'' + cid + '\')" style="background:none;border:none;cursor:pointer;font-weight:' + fontWeight + ';font-size:13px;color:' + textColor + ';padding:2px 4px;">' + cid + ' (' + count + ')</button>';
if (displayName) multiCartBar += '<span style="font-size:10px;color:#9A9FA5;max-width:50px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(displayName) + '</span>';
if (count > 0) multiCartBar += '<span style="font-size:10px;color:#9A9FA5;">' + total.toFixed(0) + ' MAD</span>';
if (cartKeys.length > 1) multiCartBar += '<button onclick="posDeleteCart(\'' + cid + '\')" style="background:none;border:none;color:#FF5B5B;cursor:pointer;font-size:13px;padding:0 4px;font-weight:700;">✕</button>';
multiCartBar += '</div>';
}

var grandTotal = posGetTotalAllCarts();
multiCartBar += '<span style="font-size:12px;color:#9A9FA5;margin-left:auto;">Total: ' + grandTotal.toFixed(2) + ' MAD</span>';
if (cartKeys.length > 1) multiCartBar += '<button onclick="posResetAllCarts()" style="background:#FF5B5B;color:#fff;border:none;border-radius:10px;padding:4px 10px;font-size:11px;cursor:pointer;">🗑️ Tout</button>';
multiCartBar += '</div>';

var productPanelDisplay = (posStep === 2) ? 'display:none;' : '';
var mobileCartStyle = '';
if (isMobile) mobileCartStyle = 'width:100% !important;max-height:35vh !important;min-height:150px !important;margin-top:4px !important;flex:1 !important;';
var gridCols = isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))';
var gridGap = isMobile ? '6px' : '14px';
var gridPadding = isMobile ? '2px' : '0';
var panelPadding = isMobile ? '8px' : '16px';

var h='<div class="pos-container' + (posStep===2 ? ' pos-container-full' : '') + '" style="display:flex;flex-direction:column;gap:6px;height:auto;padding-bottom:30px;">' +
stepIndicator + multiCartBar +
'<div class="pos-row" style="display:flex;flex-direction:column;gap:8px;width:100%;height:auto;">' +
'<div class="pos-products-panel" style="' + productPanelDisplay + ' padding:'+panelPadding+'; width:100%; background:#FFFFFF; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04); border:1px solid #EAECEF; display:flex; flex-direction:column; height:auto; overflow:visible; min-height:350px; max-height:80vh; flex:8;">' +
'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px;">' +
'<div style="display:flex;justify-content:center;align-items:center;margin-bottom:2px;">' +
'<button id="posToggleToolsBtn" onclick="posToggleTools()" style="background:#FFFFFF;color:#1A1D1F;border:1px solid #EAECEF;border-radius:999px;padding:8px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;margin:0 auto;">🔍 Afficher tout</button>' +
'</div>' +
'<div id="posToolsContainer" style="display:none;flex-direction:column;gap:4px;margin-bottom:4px;padding:8px 12px;background:#F7F8FA;border-radius:12px;border:1px solid #EAECEF;">' +
'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
'<div style="flex:1;min-width:120px;display:flex;align-items:center;background:#FFFFFF;border:1px solid #EAECEF;border-radius:10px;padding:2px 12px;position:relative;height:'+(isMobile?'34px':'40px')+';">' +
'<i class="fas fa-search" style="color:#9A9FA5;margin-right:6px;font-size:'+(isMobile?'13px':'15px')+';"></i>' +
'<input type="text" id="posSearchInput" placeholder="🔍 Rechercher un produit..." value="'+escapeHtml(posSearchQuery)+'" onkeyup="posSearchProducts(this.value); updateClearButtonVisibility();" oninput="updateClearButtonVisibility();" style="border:none;outline:none;padding:0;width:100%;background:transparent;font-size:'+(isMobile?'13px':'15px')+';padding-right:28px;color:#1A1D1F;">' +
'<button id="posSearchClearBtn" onclick="clearPosSearch()" style="display:'+(posSearchQuery ? 'flex' : 'none')+';position:absolute;right:8px;background:none;border:none;cursor:pointer;padding:2px;color:#9A9FA5;font-size:'+(isMobile?'14px':'16px')+';align-items:center;justify-content:center;"><i class="fas fa-times-circle"></i></button>' +
'</div>' +
'<button id="posMicBtn" title="Recherche vocale" style="background:#FFFFFF;border:1px solid #EAECEF;border-radius:10px;width:'+(isMobile?'36px':'40px')+';height:'+(isMobile?'36px':'40px')+';cursor:pointer;font-size:'+(isMobile?'14px':'16px')+';display:flex;align-items:center;justify-content:center;color:#6F767E;" onclick="posToggleVoiceSearch()"><i class="fas fa-microphone"></i></button>' +
'<button id="posGeminiBtn" title="Commande vocale Gemini (FR)" style="background:#8B5CF6;border:none;border-radius:10px;width:'+(isMobile?'36px':'40px')+';height:'+(isMobile?'36px':'40px')+';cursor:pointer;font-size:'+(isMobile?'14px':'16px')+';display:flex;align-items:center;justify-content:center;color:#fff;" onclick="posOuvrirCommandeVocaleGemini()"><i class="fas fa-robot"></i></button>' +
'<div style="display:flex;gap:6px;margin-left:auto;">' +
(window.posIsClientMode ? '' :
'<button id="posTablesBtn" onclick="posAfficherCommandesTables()" style="background:#FFFFFF;border:1px solid #EAECEF;border-radius:999px;padding:8px 16px;font-weight:600;font-size:'+(isMobile?'11px':'13px')+';display:flex;align-items:center;gap:6px;color:#1A1D1F;cursor:pointer;">🍽️ Tables <span style="background:#FF5B5B;color:#fff;border-radius:999px;padding:1px 8px;font-size:'+(isMobile?'9px':'11px')+';font-weight:700;">'+posCommandesTablesCount+'</span></button>' +
'<button id="posEnLigneBtn" onclick="navigateTo(\'commandes\')" style="background:#FFFFFF;border:1px solid #EAECEF;border-radius:999px;padding:8px 16px;font-weight:600;font-size:'+(isMobile?'11px':'13px')+';display:flex;align-items:center;gap:6px;color:#1A1D1F;cursor:pointer;">🌐 En ligne <span style="background:#FF5B5B;color:#fff;border-radius:999px;padding:1px 8px;font-size:'+(isMobile?'9px':'11px')+';font-weight:700;">'+posCommandesEnLigneCount+'</span></button>'
) +
'</div></div></div></div>' +
'<div class="pos-products-grid" id="posProductGrid" style="grid-template-columns:'+gridCols+';gap:'+gridGap+';padding:'+gridPadding+';overflow-x:hidden;overflow-y:auto;flex-wrap:wrap;align-content:start;flex:1;contain:layout paint;content-visibility:auto;"></div>' +
'</div>' +
'<div class="pos-cart-panel" style="' + (isMobile ? mobileCartStyle : 'width:100%;background:#FFFFFF;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #EAECEF;display:flex;flex-direction:column;margin-top:4px;max-height:35vh;flex:2;min-height:120px;') + '">';

if(posStep===1){
h+='<div class="pos-cart-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #EAECEF;flex-shrink:0;"><h3 style="font-size:'+(isMobile?'16px':'1rem')+';cursor:pointer;margin:0;display:flex;align-items:center;gap:8px;color:#1A1D1F;"><i class="fas fa-shopping-cart" style="color:#2563EB;"></i> Panier <span class="pos-cart-badge" style="background:#2563EB;color:#fff;border-radius:999px;padding:2px 10px;font-size:'+(isMobile?'12px':'0.75rem')+';font-weight:700;">'+posCart.length+'</span></h3><button class="pos-clear-btn" onclick="posResetCart()" style="font-size:'+(isMobile?'12px':'0.8rem')+';background:transparent;color:#FF5B5B;border:1px solid transparent;border-radius:10px;padding:6px 12px;cursor:pointer;font-weight:600;"><i class="fas fa-trash-alt"></i> Vider</button></div>' +
'<div class="pos-cart-items" style="flex:1;overflow-y:auto;padding:8px 12px;min-height:60px;max-height:240px;">';
if(posCart.length===0){ h+='<div class="pos-cart-empty" style="text-align:center;padding:20px;color:#9A9FA5;"><i class="fas fa-shopping-basket" style="font-size:'+(isMobile?'22px':'28px')+';"></i><p style="font-size:'+(isMobile?'12px':'0.8rem')+';margin-top:8px;">Panier vide</p></div>'; }
else{
for(var k=0;k<posCart.length;k++){
var it=posCart[k], opts='';
if(it.interdits&&it.interdits.length) opts+=' <span style="color:#FF5B5B;font-size:0.6rem;">🚫'+escapeHtml(it.interdits.join(','))+'</span>';
if(it.epice&&it.epice!=='Normal') opts+=' <span style="color:#F59E0B;font-size:0.6rem;">🌶️'+escapeHtml(it.epice)+'</span>';
if(it.sel&&it.sel!=='Normal') opts+=' <span style="color:#8B5CF6;font-size:0.6rem;">🧂'+escapeHtml(it.sel)+'</span>';
var btnSize = isMobile ? '28px' : '26px';
var btnFontSize = isMobile ? '0.7rem' : '0.65rem';
var qtySize = isMobile ? '0.85rem' : '0.75rem';
var nameSize = isMobile ? '13px' : '0.80rem';
var priceSize = isMobile ? '11px' : '0.70rem';
var totalSize = isMobile ? '14px' : '0.85rem';
h += '<div class="pos-cart-item" style="display:flex;flex-direction:column;padding:10px 8px;border-bottom:1px solid #EAECEF;gap:6px;background:#FFFFFF;border-radius:10px;margin-bottom:4px;">' +
'<div style="width:100%;font-size:'+nameSize+';font-weight:700;color:#1A1D1F;line-height:1.4;word-break:break-word;white-space:normal;">'+escapeHtml(it.nom)+opts+'</div>' +
'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">' +
'<div style="display:flex;flex-direction:column;gap:2px;min-width:60px;"><span style="font-size:'+priceSize+';color:#6F767E;font-weight:500;">'+it.prixUnitaire.toFixed(2)+' MAD</span></div>' +
'<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:1px solid #EAECEF;background:#FFFFFF;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;"><i class="fas fa-minus"></i></button>' +
'<input type="number" class="pos-qty-input" value="'+it.quantite+'" min="1" onchange="posUpdateQtyInput('+k+', this.value)" onkeyup="posUpdateQtyInput('+k+', this.value)" onclick="this.select()" style="font-size:'+qtySize+';font-weight:700;width:50px;text-align:center;border:1px solid #EAECEF;border-radius:10px;padding:4px 4px;background:#FFFFFF;color:#1A1D1F;-moz-appearance:textfield;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:1px solid #EAECEF;background:#FFFFFF;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;"><i class="fas fa-plus"></i></button>' +
'<button class="pos-remove-btn" onclick="posRemoveItem('+k+')" style="background:transparent;border:none;color:#FF5B5B;cursor:pointer;padding:6px;font-size:0.85rem;border-radius:8px;"><i class="fas fa-trash-alt"></i></button>' +
'</div>' +
'<div style="min-width:70px;text-align:right;flex-shrink:0;"><span style="font-size:'+totalSize+';font-weight:800;color:#2563EB;">'+(it.prixUnitaire*it.quantite).toFixed(2)+' MAD</span></div>' +
'</div></div>';
}
}
h+='</div>' +
'<div style="padding:8px 12px;display:flex;gap:6px;align-items:center;flex-shrink:0;border-top:1px solid #EAECEF;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Remise:</label><input type="number" id="posDiscountMAD" value="'+posDiscountMAD+'" min="0" step="0.01" onchange="posUpdateDiscountMAD(this.value)" style="width:80px;padding:6px 10px;border:1px solid #EAECEF;border-radius:10px;font-size:'+(isMobile?'13px':'0.85rem')+';background:#FFFFFF;color:#1A1D1F;"></div>' +
'<div class="pos-cart-footer" style="padding:0 12px 12px 12px;flex-shrink:0;">' +
(posDiscountMAD>0?'<div style="display:flex;justify-content:space-between;font-size:'+(isMobile?'12px':'0.85rem')+';color:#6F767E;padding:4px 0;"><span>Sous-total</span><span>'+st.toFixed(2)+'</span></div><div style="display:flex;justify-content:space-between;color:#FF5B5B;font-size:'+(isMobile?'12px':'0.85rem')+';padding:4px 0;"><span>Remise</span><span>-'+posDiscountMAD.toFixed(2)+'</span></div>':'') +
'<div class="pos-cart-total-row" style="display:flex;justify-content:space-between;font-size:'+(isMobile?'18px':'20px')+';font-weight:800;padding:14px 18px;border:1px solid #EAECEF;background:#F7F8FA;border-radius:10px;margin:8px 0 12px 0;"><span style="color:#6F767E;">Total</span><span style="color:#1A1D1F;">'+t.toFixed(2)+' MAD</span></div>' +
'<button class="pos-validate-btn" onclick="posGoToStep2()" '+(posCart.length===0?'disabled':'') + '><i class="fas fa-check-circle"></i> Valider</button>' +
'<button onclick="document.querySelector(\'.pos-steps-nav\').scrollIntoView({behavior:\'smooth\',block:\'start\'})" style="position:fixed;bottom:20px;right:20px;width:70px;height:70px;border-radius:50%;background:#2563EB;color:#fff;border:none;font-size:28px;cursor:pointer;box-shadow:0 4px 15px rgba(37,99,235,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-up"></i></button>' +
'</div>';
} else {
var canCredit=posCurrentClient&&posCurrentClient.id;
var creditDisplay = '';
if (posCurrentClient && posCurrentClient.id) creditDisplay = '<div id="clientCreditDisplay" style="font-size:20px;font-weight:700;padding:2px 0;text-align:right;"></div>';
h+='<div class="pos-cart-header" style="padding:14px 18px;border-bottom:1px solid #EAECEF;flex-shrink:0;"><h3 style="font-size:'+(isMobile?'16px':'1rem')+';margin:0;display:flex;align-items:center;gap:8px;color:#1A1D1F;"><i class="fas fa-credit-card" style="color:#2563EB;"></i> Paiement</h3></div>' +
'<div class="pos-payment-form" style="padding:14px 18px;flex:1;overflow-y:auto;max-height:400px;">' +
'<div style="margin-bottom:8px;"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;flex-shrink:0;">Client</label>' +
'<button onclick="posAjouterNouveauClient()" style="background:#8B5CF6;color:#fff;border:none;border-radius:10px;padding:6px 12px;font-size:'+(isMobile?'11px':'0.75rem')+';font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;flex-shrink:0;"><i class="fas fa-plus" style="font-size:'+(isMobile?'10px':'0.7rem')+';"></i> Nouveau</button></div>' +
'<div style="position:relative;">' +
'<div style="display:flex;align-items:center;background:#FFFFFF;border:1px solid #EAECEF;border-radius:10px;padding:4px 10px;position:relative;">' +
'<input type="text" id="posClientSearchInput" placeholder="🔍 Cliquez et tapez..." onkeyup="posSearchClient(this.value)" onfocus="if(this.value)posSearchClient(this.value)" autocomplete="off" value="'+(posCurrentClient?escapeHtml(posCurrentClient.name):'')+'" style="border:none;outline:none;padding:6px 0;width:100%;background:transparent;font-size:16px !important;font-weight:700 !important;padding-right:24px;color:#1A1D1F;">' +
'<button id="posClientClearBtn" onclick="clearClientSearch()" style="display:'+((posCurrentClient && posCurrentClient.name) ? 'flex' : 'none')+';position:absolute;right:4px;background:none;border:none;cursor:pointer;padding:2px;color:#9A9FA5;font-size:1rem;"><i class="fas fa-times-circle"></i></button>' +
'</div>' +
'<div id="posClientDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #EAECEF;border-radius:0 0 10px 10px;max-height:150px;overflow-y:auto;z-index:50;"></div>' +
'</div>'+creditDisplay+'</div>' +
'<div style="margin:8px 0;font-size:0.7rem;text-align:center;color:#9A9FA5;">— OU —</div>' +
'<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Table</label><input type="text" id="posTableNum" value="'+escapeHtml(posCurrentTable)+'" onchange="posSetTable(this.value)" style="width:100%;padding:8px 10px;border:1px solid #EAECEF;border-radius:10px;font-size:'+(isMobile?'14px':'0.9rem')+';background:#FFFFFF;color:#1A1D1F;"></div>' +
'<div style="margin-bottom:8px;"><div style="padding:10px 14px;background:#F7F8FA;border-radius:10px;border:1px solid #EAECEF;">' +
'<div style="font-size:'+(isMobile?'16px':'18px')+';font-weight:600;color:#6F767E;">Articles: '+posCart.length+'</div>' +
(posDiscountMAD>0?'<div style="color:#FF5B5B;font-size:'+(isMobile?'14px':'16px')+';">Remise: -'+posDiscountMAD.toFixed(2)+'</div>':'') +
'<div style="font-size:'+(isMobile?'18px':'20px')+';font-weight:800;color:#1A1D1F;margin-top:4px;">Total: '+t.toFixed(2)+' MAD</div></div></div>' +
'<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Vendeur</label><input type="text" id="posVendeur" value="'+(window.currentUserData?escapeHtml(window.currentUserData.userData.prenom+' '+window.currentUserData.userData.nom):'')+'" style="width:100%;padding:8px 10px;border:1px solid #EAECEF;border-radius:10px;font-size:'+(isMobile?'14px':'0.9rem')+';background:#FFFFFF;color:#1A1D1F;"></div>' +
'<div style="margin-bottom:8px;"><div style="display:flex;gap:6px;">' +
'<button class="pos-payment-btn '+(posPaymentMethod==='espece'?'active':'')+'" onclick="posSetPaymentMethod(\'espece\')" style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-money-bill-wave"></i> Espèces</button>' +
'<button class="pos-payment-btn '+(posPaymentMethod==='credit'?'active':'')+'" onclick="posSetPaymentMethod(\'credit\')" id="posCreditBtn" '+(canCredit?'':'disabled')+' style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-credit-card"></i> Crédit</button>' +
'<button class="pos-payment-btn '+(posPaymentMethod==='partiel'?'active':'')+'" onclick="posSetPaymentMethod(\'partiel\')" id="posPartielBtn" '+(canCredit?'':'disabled')+' style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-hand-holding-usd"></i> Partiel</button>' +
'</div></div>';
if(posPaymentMethod==='espece'||posPaymentMethod==='partiel') {
h+='<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Montant donné</label><input type="number" id="posAmountGiven" placeholder="0.00" value="'+(posAmountGiven>0?posAmountGiven:'')+'" onkeyup="posCalculateChange()" style="width:100%;padding:10px 14px;border:1px solid #EAECEF;border-radius:10px;font-size:22px !important;font-weight:700 !important;background:#FFFFFF;color:#1A1D1F;"><div id="posChangeDisplay" style="font-size:20px;font-weight:700;padding:4px 0;"></div></div>';
}
h+='<button class="pos-finalize-btn" onclick="posFinalizeSale()"><i class="fas fa-check-circle"></i> Finaliser</button>' +
'<button onclick="document.querySelector(\'.pos-steps-nav\').scrollIntoView({behavior:\'smooth\',block:\'start\'})" style="position:fixed;bottom:20px;right:20px;width:70px;height:70px;border-radius:50%;background:#2563EB;color:#fff;border:none;font-size:28px;cursor:pointer;box-shadow:0 4px 15px rgba(37,99,235,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-up"></i></button>' +
'</div>';
}
h+='</div></div></div></div>'; c.innerHTML=h;

setStaticBackButtonVisibility(posStep === 2);

if(posStep===1) {
posViewMode = 'categories';
posSelectedCategoryForView = null;
filterProductGrid();
if (window.innerWidth >= 1024 && !window._posToolsInitialized) { posToolsVisible = true; window._posToolsInitialized = true; }
var toolsContainer = document.getElementById('posToolsContainer');
var toggleBtn = document.getElementById('posToggleToolsBtn');
if (toolsContainer) { toolsContainer.style.display = posToolsVisible ? 'flex' : 'none'; if (posToolsVisible) toolsContainer.classList.add('visible'); }
if (toggleBtn) { toggleBtn.innerHTML = posToolsVisible ? '✕ Masquer tout' : '🔍 Afficher tout'; toggleBtn.style.background = posToolsVisible ? '#FF5B5B' : '#FFFFFF'; toggleBtn.style.color = posToolsVisible ? '#fff' : '#1A1D1F'; }
if (posToolsVisible) {
var searchInput = document.getElementById('posSearchInput'); if (searchInput) searchInput.style.display = 'flex';
var micBtn = document.getElementById('posMicBtn'); if (micBtn) micBtn.style.display = 'flex';
var geminiBtn = document.getElementById('posGeminiBtn'); if (geminiBtn) geminiBtn.style.display = 'flex';
var tablesBtn = document.getElementById('posTablesBtn'); if (tablesBtn) tablesBtn.style.display = 'inline-flex';
var enligneBtn = document.getElementById('posEnLigneBtn'); if (enligneBtn) enligneBtn.style.display = 'inline-flex';
}
}
if(posStep===2) {
setTimeout(function() {
posCalculateChange();
if (posCurrentClient && posCurrentClient.id) {
updateClientCreditDisplay(posCurrentClient.id);
var clearBtn = document.getElementById('posClientClearBtn');
if (clearBtn) clearBtn.style.display = 'flex';
}
}, 200);
}
}

function posNaviguerEtape(etape) {
if (etape === 1) posGoToStep1(); else if (etape === 2) posGoToStep2();
}
function posFilterCategory(ca){ if (ca === 'all') retournerCategories(); else selectionnerCategorie(ca); }
function posUpdateDiscountMAD(v){ posDiscountMAD=parseFloat(v)||0; if(posDiscountMAD<0) posDiscountMAD=0; if(isOnPOSPage()) renderPOS(); }
function posUpdateQty(i,ch){ var it=posCart[i]; if(!it) return; var p=posProductsList.find(function(x){ return x.id===it.id; }),nq=it.quantite+ch; if(nq<=0) posCart.splice(i,1); else{ if(p&&p.stock!==undefined&&nq>p.stock){ alert('Max: '+p.stock); return; } it.quantite=nq; } updateCartOnly(); posMultiCarts[posCurrentCartId] = posCart.slice(); posSauvegarderDonneesPanier(posCurrentCartId); posSaveMultiCarts(); }

function posUpdateQtyInput(index, value) {
    var it = posCart[index];
    if (!it) return;
    var newQty = parseInt(value, 10);
    if (isNaN(newQty) || newQty < 1) { var inputs = document.querySelectorAll('.pos-cart-items .pos-qty-input'); if (inputs[index]) inputs[index].value = it.quantite; return; }
    var p = posProductsList.find(function(x) { return x.id === it.id; });
    if (p && p.stock !== undefined && newQty > p.stock) { alert('⚠️ Stock maximum: ' + p.stock); var inputs = document.querySelectorAll('.pos-cart-items .pos-qty-input'); if (inputs[index]) inputs[index].value = it.quantite; return; }
    it.quantite = newQty;
    updateCartTotalsOnly();
    posMultiCarts[posCurrentCartId] = posCart.slice();
    posSauvegarderDonneesPanier(posCurrentCartId);
    posSaveMultiCarts();
}

function updateCartTotalsOnly() {
    var badge = document.querySelector('.pos-cart-badge');
    if (badge) badge.textContent = posCart.length;
    var tr = document.querySelector('.pos-cart-total-row span:last-child');
    if (tr) { var st = posCalculateTotal(); var t = st - posDiscountMAD; tr.textContent = t.toFixed(2) + ' MAD'; }
    var items = document.querySelectorAll('.pos-cart-items .pos-cart-item');
    for (var i = 0; i < items.length; i++) {
        var it = posCart[i]; if (!it) continue;
        var totalSpan = items[i].querySelector('span[style*="color:#2563EB"]');
        if (!totalSpan) totalSpan = items[i].querySelector('.pos-cart-item-total');
        if (totalSpan) totalSpan.textContent = (it.prixUnitaire * it.quantite).toFixed(2) + ' MAD';
    }
    var vb = document.querySelector('.pos-validate-btn');
    if (vb) vb.disabled = posCart.length === 0;
}

function posRemoveItem(i){ posCart.splice(i,1); updateCartOnly(); posMultiCarts[posCurrentCartId] = posCart.slice(); posSauvegarderDonneesPanier(posCurrentCartId); posSaveMultiCarts(); }
function posCalculateTotal(){ var t=0; for(var i=0;i<posCart.length;i++) t+=posCart[i].prixUnitaire*posCart[i].quantite; return t; }

function posGoToStep2(){
posMultiCarts[posCurrentCartId] = posCart.slice();
posSauvegarderDonneesPanier(posCurrentCartId);
posSaveMultiCarts();
posStep = 2; window.posStep = 2;
setStaticBackButtonVisibility(true);
if (posCurrentClient && posCurrentClient.id) updateClientCreditDisplay(posCurrentClient.id);
if (typeof window.resetVoiceQuantityMode === 'function') window.resetVoiceQuantityMode();
if (typeof window.setVoiceMode === 'function') { if (typeof window.lastAddedProductId !== 'undefined') window.lastAddedProductId = null; window.setVoiceMode('payment', '🎤 Mode paiement', null); }
if(isOnPOSPage()) renderPOS();
}

function posGoToStep1(){
posStep = 1; window.posStep = 1;
delete window.posCommandeId; delete window.posVenteId;
setStaticBackButtonVisibility(false);
posCart = posMultiCarts[posCurrentCartId] || [];
window.posCart = posCart;
if (typeof window.setVoiceMode === 'function') window.setVoiceMode('search', '🎤 Recherche vocale active', null);
if (typeof showVoiceResult === 'function') showVoiceResult('↩️ Retour au panier');
var c = document.getElementById('dynamicContent');
if (c && isOnPOSPage()) buildFullPOS(c);
}

function posSetPaymentMethod(m){ if((m==='credit'||m==='partiel')&&(!posCurrentClient||!posCurrentClient.id)){ alert('Client requis'); return; } posPaymentMethod=m; posAmountGiven=0; if(isOnPOSPage()) renderPOS(); }

function posCalculateChange(){
var ai=document.getElementById('posAmountGiven');
var cd=document.getElementById('posChangeDisplay');
if(!ai||!cd) return;
var st=posCalculateTotal(); var t=st-posDiscountMAD;
posAmountGiven=parseFloat(ai.value)||0;
var c=posAmountGiven-t;
if(posAmountGiven>0) {
if(c>=0) cd.innerHTML='<div style="font-size:22px;font-weight:700;color:#22C55E;display:flex;align-items:center;justify-content:flex-start;"><span>✅ Rendu</span><span style="margin-left:12px;">'+c.toFixed(2)+' MAD</span></div>';
else cd.innerHTML='<div style="font-size:22px;font-weight:700;color:#FF5B5B;display:flex;align-items:center;justify-content:flex-start;"><span>❌ Manquant</span><span style="margin-left:12px;">'+Math.abs(c).toFixed(2)+' MAD</span></div>';
} else cd.innerHTML='';
}

async function updateClientFidelityAsync(clientId, total, profitTotal) { try { return await forceUpdateClient(clientId, total, profitTotal); } catch(e) { return false; } }

async function posFinalizeSale(){
if(posCart.length === 0){ alert('❌ Le panier est vide. Ajoutez des articles avant de finaliser.'); return; }
if(isFinalizing) return;
var st=posCalculateTotal(), t=st-posDiscountMAD;
if(!posCurrentClient && !posCurrentTable){ posCurrentClient = { id: null, name: 'Passager' }; }
if(posCurrentTable && (posPaymentMethod==='credit'||posPaymentMethod==='partiel')){ alert('Table = espèces uniquement.'); return; }
if((posPaymentMethod==='credit'||posPaymentMethod==='partiel') && !posCurrentClient){ alert('Client requis pour crédit/partiel.'); return; }
if(posPaymentMethod==='espece' || posPaymentMethod==='partiel'){
var amountInput = document.getElementById('posAmountGiven');
var givenAmount = parseFloat(amountInput ? amountInput.value : 0) || 0;
if (givenAmount <= 0) { posAmountGiven = t; if (amountInput) amountInput.value = t.toFixed(2); }
else posAmountGiven = givenAmount;
if(posPaymentMethod==='espece' && posAmountGiven < t){ alert('Montant insuffisant.'); return; }
}
isFinalizing=true;
var fb=document.querySelector('.pos-finalize-btn');
if(fb){ fb.disabled=true; fb.textContent='⏳...'; }
var vendeur=document.getElementById('posVendeur').value.trim()||(window.currentUserData?window.currentUserData.userData.prenom+' '+window.currentUserData.userData.nom:'');
try{
var fn=getNextFactureNum(), remaining=0, paid=true, statutPaiement='payé', change=0;
if(posPaymentMethod==='credit'){ paid=false; remaining=t; statutPaiement='crédit'; }
else if(posPaymentMethod==='partiel'){ remaining = t - posAmountGiven; paid = false; statutPaiement='partiel'; change = Math.max(0, posAmountGiven - t); }
else change = posAmountGiven - t;
if(posCurrentTable && !posCurrentClient){ paid=false; statutPaiement='en_attente'; remaining=t; }
var profitTotal=0, itemsDetail=posCart.map(function(it){
var pa=it.prixAchat||0, pvn=it.prixVente||0, pp=it.prixPromo||0, pvr=pp>0?pp:pvn, prof=(pvr-pa)*it.quantite;
profitTotal+=prof;
return {id:it.id, nom:it.nom, quantite:it.quantite, prixVente:pvr, prixAchat:pa, prixPromo:pp, profit:prof, sauces:[], interdits:it.interdits||[], epice:it.epice||'Normal', sel:it.sel||'Normal'};
});
var sd={factureNum:fn, items:itemsDetail, subtotal:st, discountMAD:posDiscountMAD, total:t, clientId:posCurrentClient ? posCurrentClient.id : null, clientName:posCurrentClient ? posCurrentClient.name : 'Passager', table:posCurrentTable || null, vendeur:vendeur, paymentMethod:posPaymentMethod, statutPaiement:statutPaiement, amountGiven:posAmountGiven, change:change, paid:paid, remainingAmount:remaining, profitTotal:profitTotal, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
var batch=db.batch(), ventesRef=db.collection('ventes').doc();
batch.set(ventesRef,sd);
if(!paid){ var creditsRef=db.collection('credits').doc(); batch.set(creditsRef,sd); }
if(window.posCommandeId){ batch.update(db.collection('commandes').doc(window.posCommandeId), {statut:'payé', paidAt:firebase.firestore.FieldValue.serverTimestamp(), factureNum:fn}); delete window.posCommandeId; }
if(window.posVenteId){ batch.update(db.collection('ventes').doc(window.posVenteId), {paid:true, statutPaiement:'payé', remainingAmount:0, paidAt:firebase.firestore.FieldValue.serverTimestamp()}); delete window.posVenteId; }
for(var i=0;i<posCart.length;i++){ var it=posCart[i]; batch.update(db.collection('products').doc(it.id), {stock:firebase.firestore.FieldValue.increment(-it.quantite), vendues:firebase.firestore.FieldValue.increment(it.quantite), ca:firebase.firestore.FieldValue.increment(it.prixUnitaire*it.quantite)}); }
await batch.commit();

localStorage.removeItem('posSavedState');
if(posCurrentClient && posCurrentClient.id && paid) { try { await forceUpdateClient(posCurrentClient.id, t, profitTotal); } catch(e) {} }
if (posCurrentClient && posCurrentClient.id) clientCreditsCache[posCurrentClient.id] = undefined;

var venteId = ventesRef.id;
if (typeof window.sendWhatsApp === 'function') {
var originalCloseModal = window.closeModal;
window.closeModal = function() {
posResetCart(); posStep = 1; window.posStep = 1;
if(isOnPOSPage()) renderPOS();
if(navigator.onLine) setTimeout(function(){ CacheDB.sync().catch(function(){}); },500);
window.closeModal = originalCloseModal;
var o = document.getElementById('modalOverlay'); if (o) o.classList.add('hidden');
window.editingId = null;
};
var modalHtml = '<p style="text-align:center;">Voulez-vous envoyer la facture par WhatsApp ?</p><div style="display:flex;justify-content:center;gap:10px;margin-top:15px;"><button class="btn-save" id="whatsappYesBtn">✅ Oui</button><button class="btn-cancel" id="whatsappNoBtn">❌ Non</button></div>';
openModal('📱 Envoyer la facture WhatsApp', modalHtml);
setTimeout(function() {
var yesBtn = document.getElementById('whatsappYesBtn'), noBtn = document.getElementById('whatsappNoBtn');
if (yesBtn) yesBtn.addEventListener('click', function() { window.closeModal = originalCloseModal; closeModal(); if (typeof window.posStopVoiceSearch === 'function') window.posStopVoiceSearch(); window.sendWhatsApp(venteId); setTimeout(function() { posResetCart(); posStep = 1; window.posStep = 1; if(isOnPOSPage()) renderPOS(); if(navigator.onLine) setTimeout(function(){ CacheDB.sync().catch(function(){}); },500); }, 500); });
if (noBtn) noBtn.addEventListener('click', function() { window.closeModal = originalCloseModal; closeModal(); posResetCart(); posStep = 1; window.posStep = 1; if(isOnPOSPage()) renderPOS(); if(navigator.onLine) setTimeout(function(){ CacheDB.sync().catch(function(){}); },500); });
}, 100);
} else {
posResetCart(); posStep = 1; window.posStep = 1;
if(isOnPOSPage()) renderPOS();
if(navigator.onLine) setTimeout(function(){ CacheDB.sync().catch(function(){}); },500);
}
if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
setTimeout(function() { CacheDB.saveCollection('ventes'); CacheDB.saveCollection('products'); CacheDB.saveCollection('clients'); CacheDB.saveCollection('credits'); }, 500);
}
}catch(e){ alert('Erreur: '+e.message); }
finally { isFinalizing=false; if(fb){ fb.disabled=false; fb.innerHTML='<i class="fas fa-check-circle"></i> Finaliser'; } }
}

function posResetCart() {
posCart = []; window.posCart = posCart;
posMultiCarts[posCurrentCartId] = [];
posDiscountMAD = 0; posAmountGiven = 0;
posCurrentClient = null; posCurrentTable = '';
posPaymentMethod = 'espece';
delete window.posCommandeId; delete window.posVenteId;
localStorage.removeItem('posSavedState');
posSauvegarderDonneesPanier(posCurrentCartId);
posSaveMultiCarts();
if (document.getElementById('posClientSearchInput')) document.getElementById('posClientSearchInput').value = '';
if (document.getElementById('clientCreditDisplay')) document.getElementById('clientCreditDisplay').style.display = 'none';
if (isOnPOSPage()) renderPOS();
}

function posChargerCommandesTables() { posCommandesTablesCount = 0; }
function posChargerCommandesEnLigneCount() { posCommandesEnLigneCount = 0; }
function posAfficherCommandesTables() { alert('Fonction à implémenter selon votre logique'); }
function posToggleVoiceSearch() { if (typeof window.toggleVoiceSearch === 'function') window.toggleVoiceSearch(); else alert('Fonction de recherche vocale non disponible'); }

function updateClearButtonVisibility() {
var input = document.getElementById('posSearchInput');
var btn = document.getElementById('posSearchClearBtn');
if (input && btn) btn.style.display = (input.value && input.value.length > 0) ? 'flex' : 'none';
}

function goBackToPOS(){ if(window.currentUserData&&(window.currentUserData.userData.role==='caissier'||window.currentUserData.userData.role==='admin')){ if(posCart.length>0&&posStep===1){ if(!confirm('⚠️ '+posCart.length+' article(s) dans le panier. Garder ?')) posResetCart(); } navigateTo('pos'); } }

function posAjouterNouveauClient() {
    var modalHtml = '<div style="padding:10px;"><h3 style="margin-bottom:15px;font-size:1.3rem;display:flex;align-items:center;gap:10px;"><i class="fas fa-user-plus" style="color:#2563EB;"></i> Ajouter un nouveau client</h3><p style="color:#6F767E;font-size:0.9rem;margin-bottom:15px;">Remplissez les informations ci-dessous. Seuls le nom et prénom sont obligatoires.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Prénom *</label><input type="text" id="posNewClientPrenom" placeholder="Prénom" style="width:100%;padding:12px;border:1px solid #EAECEF;border-radius:10px;font-size:1rem;"></div><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Nom *</label><input type="text" id="posNewClientNom" placeholder="Nom" style="width:100%;padding:12px;border:1px solid #EAECEF;border-radius:10px;font-size:1rem;"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;"><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Téléphone</label><input type="text" id="posNewClientTelephone" placeholder="Téléphone" style="width:100%;padding:12px;border:1px solid #EAECEF;border-radius:10px;font-size:1rem;"></div><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Email</label><input type="email" id="posNewClientEmail" placeholder="Email" style="width:100%;padding:12px;border:1px solid #EAECEF;border-radius:10px;font-size:1rem;"></div></div><div style="margin-top:10px;"><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Adresse</label><input type="text" id="posNewClientAdresse" placeholder="Adresse" style="width:100%;padding:12px;border:1px solid #EAECEF;border-radius:10px;font-size:1rem;"></div><div style="display:flex;gap:12px;justify-content:flex-end;margin-top:18px;"><button class="btn-cancel" onclick="closeModal()" style="padding:12px 24px;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1rem;background:#F7F8FA;">Annuler</button><button id="posConfirmNewClientBtn" style="background:#2563EB;color:#fff;border:none;border-radius:10px;padding:12px 28px;cursor:pointer;font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px;"><i class="fas fa-check"></i> Ajouter</button></div></div>';
    openModal('➕ Nouveau client', modalHtml);
    setTimeout(function() { var prenomInput = document.getElementById('posNewClientPrenom'); if (prenomInput) prenomInput.focus(); }, 300);
    document.getElementById('posConfirmNewClientBtn').addEventListener('click', function() { posConfirmerAjoutClient(); });
    ['posNewClientPrenom', 'posNewClientNom', 'posNewClientTelephone', 'posNewClientEmail', 'posNewClientAdresse'].forEach(function(id) { var input = document.getElementById(id); if (input) input.addEventListener('keydown', function(e) { if (e.key === 'Enter') posConfirmerAjoutClient(); }); });
}

async function posConfirmerAjoutClient() {
    var prenom = document.getElementById('posNewClientPrenom');
    var nom = document.getElementById('posNewClientNom');
    var telephone = document.getElementById('posNewClientTelephone');
    var email = document.getElementById('posNewClientEmail');
    var adresse = document.getElementById('posNewClientAdresse');
    var prenomVal = prenom ? prenom.value.trim() : '';
    var nomVal = nom ? nom.value.trim() : '';
    var telephoneVal = telephone ? telephone.value.trim() : '';
    var emailVal = email ? email.value.trim() : '';
    var adresseVal = adresse ? adresse.value.trim() : '';
    if (!prenomVal || !nomVal) { alert('❌ Veuillez saisir le prénom et le nom.'); if (!prenomVal && prenom) prenom.focus(); else if (!nomVal && nom) nom.focus(); return; }
    try {
        var existing = posAllClients.find(function(c) { return (c.nom || '').toLowerCase() === nomVal.toLowerCase() && (c.prenom || '').toLowerCase() === prenomVal.toLowerCase(); });
        if (existing) {
            alert('⚠️ Ce client existe déjà : ' + prenomVal + ' ' + nomVal);
            closeModal();
            posCurrentClient = { id: existing.id, name: existing.nom + ' ' + existing.prenom };
            var input = document.getElementById('posClientSearchInput'); if (input) input.value = posCurrentClient.name;
            updateClientCreditDisplay(existing.id); updatePaymentButtons();
            if (isOnPOSPage()) renderPOS();
            return;
        }
        var newClientData = { nom: nomVal, prenom: prenomVal, telephone: telephoneVal || '', email: emailVal || '', adresse: adresseVal || '', username: '', genre: '', whatsapp: '', facebook: '', instagram: '', ca: 0, profit: 0, pointsFidelite: 0, allergies: [], aime: [], deteste: [], description: '', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
        var docRef = await db.collection('clients').add(newClientData);
        var newClient = { id: docRef.id, nom: nomVal, prenom: prenomVal, telephone: telephoneVal || '', email: emailVal || '', adresse: adresseVal || '', username: '', genre: '', whatsapp: '', facebook: '', instagram: '', ca: 0, profit: 0, pointsFidelite: 0, allergies: [], aime: [], deteste: [], description: '' };
        posAllClients.push(newClient); posFilteredClients.push(newClient);
        if (window.allClientsData) window.allClientsData.push(newClient);
        if (typeof CacheDB !== 'undefined' && CacheDB.set) CacheDB.set('clients', docRef.id, newClient);
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) setTimeout(function() { CacheDB.saveCollection('clients'); }, 500);
        posCurrentClient = { id: docRef.id, name: nomVal + ' ' + prenomVal };
        var input = document.getElementById('posClientSearchInput'); if (input) input.value = posCurrentClient.name;
        updateClientCreditDisplay(docRef.id); updatePaymentButtons();
        closeModal();
        if (isOnPOSPage()) renderPOS();
    } catch(e) { alert('❌ Erreur lors de l\'ajout du client: ' + e.message); }
}

function corrigerDispositionMobile() {
if (window.innerWidth <= 700) {
var row = document.querySelector('.pos-row');
var produits = document.querySelector('.pos-products-panel');
var panier = document.querySelector('.pos-cart-panel');
if (row && produits && panier) {
row.style.display = 'flex'; row.style.flexDirection = 'column'; row.style.flexWrap = 'nowrap';
produits.style.width = '100%'; produits.style.maxWidth = '100%'; produits.style.minWidth = '100%';
produits.style.height = 'auto'; produits.style.minHeight = '300px'; produits.style.maxHeight = '60vh'; produits.style.flex = '1';
panier.style.width = '100%'; panier.style.maxWidth = '100%'; panier.style.minWidth = '100%';
panier.style.height = 'auto'; panier.style.minHeight = '150px'; panier.style.maxHeight = '35vh';
panier.style.marginTop = '4px'; panier.style.position = 'static';
}
}
}

var ancienBuildFullPOS = window.buildFullPOS;
window.buildFullPOS = function(c) { ancienBuildFullPOS(c); setTimeout(corrigerDispositionMobile, 100); };
window.addEventListener('load', corrigerDispositionMobile);
window.addEventListener('resize', corrigerDispositionMobile);

window.posCart=posCart; window.posStep=posStep; window.posProductsList=posProductsList; window.posAllClients=posAllClients; window.posCurrentClient=posCurrentClient; window.posCurrentTable=posCurrentTable; window.posDiscountMAD=posDiscountMAD; window.posAmountGiven=posAmountGiven; window.posPaymentMethod=posPaymentMethod; window.posResetCart=posResetCart; window.posAddToCartOrOpenOptions=posAddToCartOrOpenOptions; window.posSetPaymentMethod=posSetPaymentMethod; window.posCalculateTotal=posCalculateTotal; window.posFinalizeSale=posFinalizeSale; window.posGoToStep2=posGoToStep2; window.posGoToStep1=posGoToStep1; window.posSearchProducts=posSearchProducts; window.clearPosSearch=clearPosSearch; window.clearClientSearch=clearClientSearch; window.updateClearButtonVisibility=updateClearButtonVisibility; window.updateCartOnly=updateCartOnly; window.renderPOS=renderPOS; window.updatePaymentButtons=updatePaymentButtons; window.loadMoreProducts=loadMoreProducts; window.loadClientCredits=loadClientCredits; window.updateClientCreditDisplay=updateClientCreditDisplay; window.posCalculateChange=posCalculateChange; window.onProductAdded=window.onProductAdded||function(pid){};
window.posNaviguerEtape = posNaviguerEtape;
window.buildFullPOS = buildFullPOS;
window.decrementerIngredientsStock = decrementerIngredientsStock;
window.afficherCategories = afficherCategories;
window.selectionnerCategorie = selectionnerCategorie;
window.retournerCategories = retournerCategories;
window.posFilterCategory = posFilterCategory;
window.posViewMode = posViewMode;
window.posSelectedCategoryForView = posSelectedCategoryForView;
window.posToggleTools = posToggleTools;
window.posToolsVisible = posToolsVisible;
window.applyDynamicContentScroll = applyDynamicContentScroll;
window.forceUpdateClient = forceUpdateClient;
window.corrigerDispositionMobile = corrigerDispositionMobile;
window.posMultiCarts = posMultiCarts;
window.posCurrentCartId = posCurrentCartId;
window.posMultiCartCounter = posMultiCartCounter;
window.posMultiPaniersData = posMultiPaniersData;
window.MAX_PANIERS = MAX_PANIERS;
window.posLoadMultiCarts = posLoadMultiCarts;
window.posSaveMultiCarts = posSaveMultiCarts;
window.posCreateNewCart = posCreateNewCart;
window.posSwitchToCart = posSwitchToCart;
window.posDeleteCart = posDeleteCart;
window.posResetAllCarts = posResetAllCarts;
window.posGetTotalAllCarts = posGetTotalAllCarts;
window.posSauvegarderDonneesPanier = posSauvegarderDonneesPanier;
window.posRestaurerDonneesPanier = posRestaurerDonneesPanier;
window.posChargerToutesDonneesPaniers = posChargerToutesDonneesPaniers;
window.posAjouterNouveauClient = posAjouterNouveauClient;
window.posConfirmerAjoutClient = posConfirmerAjoutClient;
window.posUpdateQtyInput = posUpdateQtyInput;
window.updateCartTotalsOnly = updateCartTotalsOnly;

function posAddMultipleProductsToCart(produitsList) {
    var ajoutCount = 0;
    var stockAlertes = [];
    if (!produitsList || produitsList.length === 0) return { ajoutCount: 0, stockAlertes: [] };
    for (var i = 0; i < produitsList.length; i++) {
        var item = produitsList[i];
        var produit = item.produit;
        var quantite = item.quantite || 1;
        if (!produit || !produit.id) continue;
        if (produit.stock !== undefined && produit.stock <= 0) { stockAlertes.push(produit.nom + ' : rupture de stock'); continue; }
        var existant = posCart.find(function(x) { return x.id === produit.id; });
        if (existant) {
            var nouvelleQte = existant.quantite + quantite;
            if (produit.stock !== undefined && nouvelleQte > produit.stock) { nouvelleQte = produit.stock; quantite = produit.stock - existant.quantite; if (quantite <= 0) continue; }
            existant.quantite = nouvelleQte;
        } else {
            if (produit.stock !== undefined && quantite > produit.stock) { quantite = produit.stock; if (quantite <= 0) continue; }
            var prix = produit.prixPromo && produit.prixPromo > 0 ? produit.prixPromo : produit.prixVente;
            posCart.push({ id: produit.id, nom: produit.nom, prixUnitaire: prix, prixAchat: produit.prixAchat || 0, prixPromo: produit.prixPromo || 0, prixVente: produit.prixVente || 0, quantite: quantite, categorie: produit.categorie || '', imageBase64: produit.imageBase64 || '', sauces: [], interdits: [], epice: 'Normal', sel: 'Normal' });
        }
        ajoutCount += quantite;
    }
    window.posCart = posCart;
    posMultiCarts[posCurrentCartId] = posCart.slice();
    posSauvegarderDonneesPanier(posCurrentCartId);
    posSaveMultiCarts();
    if (typeof updateCartOnly === 'function') updateCartOnly();
    return { ajoutCount: ajoutCount, stockAlertes: stockAlertes };
}
window.posAddMultipleProductsToCart = posAddMultipleProductsToCart;

// ============================================================
// 🎨 STYLE MINIMALISTE BLEU/BLANC
// Fond gris plat + cartes blanches + bleu #2563EB
// Cohérent avec admin-crud.js (pages Produits/Catégories/Clients/Fournisseurs)
// ============================================================
(function injectMinimalistStyle() {
    var STYLE_ID = 'pos-minimalist-styles';
    if (document.getElementById(STYLE_ID)) return;

    var ancien1 = document.getElementById('pos-modern-styles-v1');
    if (ancien1) ancien1.remove();
    var ancien2 = document.getElementById('pos-restoe-styles-v1');
    if (ancien2) ancien2.remove();
    var ancien3 = document.getElementById('pos-restoe-styles-v3');
    if (ancien3) ancien3.remove();

    var styles = document.createElement('style');
    styles.id = STYLE_ID;
    styles.textContent = `
    :root {
        --r-bg: #F7F8FA;
        --r-card: #FFFFFF;
        --r-border: #EAECEF;
        --r-border-strong: #E1E4E8;
        --r-text: #1A1D1F;
        --r-text-2: #6F767E;
        --r-text-3: #9A9FA5;
        --r-blue: #2563EB;
        --r-blue-hover: #1D4ED8;
        --r-blue-soft: #EFF6FF;
        --r-blue-border: #BFDBFE;
        --r-green: #22C55E;
        --r-red: #FF5B5B;
        --r-amber: #F59E0B;
        --r-purple: #8B5CF6;
        --r-radius: 14px;
        --r-radius-sm: 10px;
        --r-radius-pill: 999px;
        --r-shadow-card: 0 1px 2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
        --r-shadow-hover: 0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03);
        --r-shadow-blue: 0 4px 14px rgba(37, 99, 235, 0.25);
    }

    .pos-container {
        background: #F7F8FA !important;
        background-image: none !important;
        padding: 16px !important;
        border-radius: 0 !important;
        min-height: calc(100vh - 60px) !important;
        font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif !important;
        color: var(--r-text) !important;
    }

    .pos-products-panel,
    .pos-cart-panel,
    .pos-multi-carts-bar,
    .pos-steps-nav,
    .pos-cart-header,
    .pos-cart-total-row {
        background-image: none !important;
    }

    .pos-steps-nav {
        display: flex !important;
        justify-content: center !important;
        gap: 8px !important;
        padding: 6px !important;
        background: var(--r-card) !important;
        border-radius: var(--r-radius-pill) !important;
        box-shadow: var(--r-shadow-card) !important;
        border: 1px solid var(--r-border) !important;
        margin-bottom: 16px !important;
        max-width: 400px !important;
        margin-left: auto !important;
        margin-right: auto !important;
    }

    .pos-step {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 8px 16px !important;
        border-radius: var(--r-radius-pill) !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
        font-weight: 600 !important;
    }

    .pos-step.active {
        background: var(--r-blue) !important;
        color: #fff !important;
        box-shadow: var(--r-shadow-blue) !important;
    }

    .pos-step.active .step-number {
        background: rgba(255,255,255,0.25) !important;
        color: #fff !important;
    }

    .pos-step:not(.active) {
        color: var(--r-text-2) !important;
    }

    .pos-step .step-number {
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: var(--r-bg) !important;
        color: var(--r-text-3) !important;
        font-size: 12px !important;
        font-weight: 700 !important;
    }

    .pos-multi-carts-bar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        background: var(--r-card) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card) !important;
        border: 1px solid var(--r-border) !important;
        margin-bottom: 16px !important;
    }

    .pos-multi-carts-bar > div {
        border-radius: var(--r-radius-sm) !important;
        transition: all 0.15s ease !important;
        padding: 4px 10px !important;
    }

    .pos-multi-carts-bar > div:hover {
        transform: translateY(-1px) !important;
        box-shadow: var(--r-shadow-card) !important;
    }

    .pos-multi-carts-bar button[onclick*="posCreateNewCart"]:hover:not(:disabled) {
        background: var(--r-blue-hover) !important;
        transform: translateY(-1px) !important;
    }

    .pos-products-panel {
        background: var(--r-card) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card) !important;
        border: 1px solid var(--r-border) !important;
        padding: 16px !important;
    }

    .pos-products-grid {
        display: grid !important;
        gap: 14px !important;
        padding: 0 !important;
        background: transparent !important;
    }

    .pos-product-card {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card) !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        overflow: hidden !important;
        padding: 14px !important;
        min-height: 190px !important;
        max-height: 200px !important;
    }

    .pos-product-card:hover {
        transform: translateY(-2px) !important;
        border-color: var(--r-blue-border) !important;
        box-shadow: var(--r-shadow-hover) !important;
    }

    .pos-product-card.pos-out-of-stock {
        opacity: 0.45 !important;
        cursor: not-allowed !important;
    }

    .pos-product-img {
        height: 85px !important;
        width: 85px !important;
    }

    .pos-product-img img {
        border-radius: var(--r-radius-sm) !important;
    }

    .pos-product-name {
        color: var(--r-text) !important;
        font-weight: 700 !important;
        font-size: 0.85rem !important;
    }

    .pos-product-price {
        color: var(--r-text) !important;
        font-weight: 800 !important;
        font-size: 0.90rem !important;
        letter-spacing: -0.3px;
    }

    .pos-promo-price {
        color: var(--r-red) !important;
        font-weight: 800 !important;
        font-size: 0.90rem !important;
    }

    .pos-old-price {
        font-size: 0.7rem !important;
    }

    .pos-products-grid button[onclick*="retournerCategories"] {
        background: var(--r-card) !important;
        color: var(--r-text) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-sm) !important;
        padding: 8px 16px !important;
        font-weight: 600 !important;
        box-shadow: var(--r-shadow-card) !important;
    }

    .pos-products-grid button[onclick*="retournerCategories"]:hover {
        background: var(--r-bg) !important;
        border-color: var(--r-border-strong) !important;
    }

    .pos-category-card {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card) !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        min-height: 170px !important;
        max-height: 210px !important;
    }

    .pos-category-card:hover {
        transform: translateY(-2px) !important;
        border-color: var(--r-blue-border) !important;
        box-shadow: var(--r-shadow-hover) !important;
    }

    .pos-category-card.active {
        background: var(--r-blue) !important;
        border-color: var(--r-blue) !important;
        color: #fff !important;
        box-shadow: var(--r-shadow-blue) !important;
    }

    .pos-category-card.active span {
        color: #fff !important;
    }

    .pos-cart-panel {
        background: var(--r-card) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card) !important;
        border: 1px solid var(--r-border) !important;
        overflow: hidden !important;
    }

    .pos-cart-header {
        background: var(--r-card) !important;
        border-bottom: 1px solid var(--r-border) !important;
        padding: 16px 20px !important;
    }

    .pos-cart-header h3 {
        color: var(--r-text) !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 !important;
    }

    .pos-cart-header h3 i {
        color: var(--r-blue) !important;
    }

    .pos-cart-badge {
        background: var(--r-blue) !important;
        color: #fff !important;
        border-radius: var(--r-radius-pill) !important;
        padding: 2px 10px !important;
        font-size: 0.75rem !important;
        font-weight: 700 !important;
        box-shadow: none !important;
    }

    .pos-clear-btn {
        background: transparent !important;
        color: var(--r-red) !important;
        border: 1px solid transparent !important;
        border-radius: var(--r-radius-sm) !important;
        padding: 6px 12px !important;
        font-weight: 600 !important;
    }

    .pos-clear-btn:hover {
        background: rgba(255, 91, 91, 0.08) !important;
        border-color: rgba(255, 91, 91, 0.2) !important;
    }

    .pos-cart-items {
        background: var(--r-card) !important;
        padding: 8px 12px !important;
    }

    .pos-cart-item {
        background: transparent !important;
        border-bottom: 1px solid var(--r-border) !important;
        transition: background 0.15s ease !important;
        border-radius: var(--r-radius-sm) !important;
    }

    .pos-cart-item:hover {
        background: var(--r-bg) !important;
    }

    .pos-qty-btn {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        color: var(--r-text-2) !important;
        border-radius: var(--r-radius-sm) !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    .pos-qty-btn:hover {
        background: var(--r-blue) !important;
        color: #fff !important;
        border-color: var(--r-blue) !important;
        transform: scale(1.05) !important;
    }

    .pos-qty-input {
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-sm) !important;
        color: var(--r-text) !important;
        font-weight: 700 !important;
        text-align: center !important;
        background: var(--r-card) !important;
    }

    .pos-qty-input:focus {
        outline: none !important;
        border-color: var(--r-blue) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
    }

    .pos-remove-btn {
        color: var(--r-red) !important;
        background: transparent !important;
        border: none !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
    }

    .pos-remove-btn:hover {
        background: rgba(255, 91, 91, 0.08) !important;
    }

    .pos-cart-total-row {
        background: var(--r-bg) !important;
        border-radius: var(--r-radius-sm) !important;
        border: 1px solid var(--r-border) !important;
    }

    .pos-cart-total-row span:first-child {
        color: var(--r-text-2) !important;
        font-weight: 600 !important;
    }

    .pos-cart-total-row span:last-child {
        color: var(--r-text) !important;
        font-weight: 800 !important;
    }

    .pos-validate-btn {
        background: var(--r-blue) !important;
        color: #fff !important;
        border: none !important;
        border-radius: var(--r-radius-sm) !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        padding: 14px 20px !important;
        box-shadow: var(--r-shadow-blue) !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
        margin: 0 12px 16px 12px !important;
        width: calc(100% - 24px) !important;
    }

    .pos-validate-btn:hover:not(:disabled) {
        background: var(--r-blue-hover) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35) !important;
    }

    .pos-validate-btn:disabled {
        background: #E5E7EB !important;
        color: var(--r-text-3) !important;
        box-shadow: none !important;
        cursor: not-allowed !important;
    }

    .pos-finalize-btn {
        background: var(--r-blue) !important;
        color: #fff !important;
        border: none !important;
        border-radius: var(--r-radius-sm) !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        padding: 14px 20px !important;
        box-shadow: var(--r-shadow-blue) !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
        width: 100%;
        margin-top: 4px;
    }

    .pos-finalize-btn:hover:not(:disabled) {
        background: var(--r-blue-hover) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35) !important;
    }

    .pos-payment-btn {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        color: var(--r-text-2) !important;
        border-radius: var(--r-radius-sm) !important;
        padding: 12px 16px !important;
        font-weight: 600 !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
    }

    .pos-payment-btn:hover:not(:disabled) {
        background: var(--r-bg) !important;
        border-color: var(--r-border-strong) !important;
    }

    .pos-payment-btn.active {
        background: var(--r-blue) !important;
        color: #fff !important;
        border-color: var(--r-blue) !important;
        box-shadow: var(--r-shadow-blue) !important;
    }

    .pos-payment-btn:disabled {
        opacity: 0.35 !important;
        cursor: not-allowed !important;
    }

    #posCreditBtn.active {
        background: var(--r-amber) !important;
        border-color: var(--r-amber) !important;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3) !important;
    }

    #posPartielBtn.active {
        background: var(--r-purple) !important;
        border-color: var(--r-purple) !important;
        box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3) !important;
    }

    .pos-payment-form input[type="text"],
    .pos-payment-form input[type="number"],
    .pos-payment-form input[type="email"],
    .pos-payment-form select,
    .pos-payment-form textarea {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-sm) !important;
        color: var(--r-text) !important;
        font-family: inherit !important;
        transition: all 0.15s ease !important;
    }

    .pos-payment-form input:focus,
    .pos-payment-form select:focus {
        outline: none !important;
        border-color: var(--r-blue) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
    }

    .pos-payment-form label {
        color: var(--r-text-2) !important;
        font-weight: 600 !important;
    }

    .pos-payment-form button[onclick*="posAjouterNouveauClient"] {
        background: var(--r-purple) !important;
        color: #fff !important;
        border: none !important;
        border-radius: var(--r-radius-sm) !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25) !important;
        transition: all 0.15s ease !important;
    }

    .pos-payment-form button[onclick*="posAjouterNouveauClient"]:hover {
        background: #7C3AED !important;
        transform: translateY(-1px) !important;
    }

    #posMicBtn {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        color: var(--r-text-2) !important;
        border-radius: var(--r-radius-sm) !important;
        transition: all 0.15s ease !important;
    }

    #posMicBtn:hover {
        background: var(--r-blue) !important;
        color: #fff !important;
        border-color: var(--r-blue) !important;
        transform: scale(1.05) !important;
    }

    #posGeminiBtn {
        background: var(--r-purple) !important;
        border: none !important;
        color: #fff !important;
        border-radius: var(--r-radius-sm) !important;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25) !important;
        transition: all 0.15s ease !important;
    }

    #posGeminiBtn:hover {
        background: #7C3AED !important;
        transform: translateY(-1px) scale(1.05) !important;
    }

    #posTablesBtn,
    #posEnLigneBtn {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        color: var(--r-text) !important;
        border-radius: var(--r-radius-pill) !important;
        font-weight: 600 !important;
        transition: all 0.15s ease !important;
        box-shadow: var(--r-shadow-card) !important;
    }

    #posTablesBtn:hover,
    #posEnLigneBtn:hover {
        background: var(--r-bg) !important;
        border-color: var(--r-border-strong) !important;
        transform: translateY(-1px) !important;
    }

    #posTablesBtn span,
    #posEnLigneBtn span {
        background: var(--r-red) !important;
        color: #fff !important;
        border-radius: var(--r-radius-pill) !important;
        font-weight: 700 !important;
        box-shadow: none !important;
    }

    #posToolsContainer > div > div:first-child {
        background: var(--r-card) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-sm) !important;
    }

    #posToolsContainer > div > div:first-child:focus-within {
        border-color: var(--r-blue) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
    }

    #posToggleToolsBtn {
        background: var(--r-card) !important;
        color: var(--r-text) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-pill) !important;
        font-weight: 600 !important;
        box-shadow: var(--r-shadow-card) !important;
    }

    #posToggleToolsBtn:hover {
        background: var(--r-bg) !important;
        border-color: var(--r-border-strong) !important;
    }

    .pos-products-grid .btn-add {
        background: var(--r-card) !important;
        color: var(--r-text) !important;
        border: 1px solid var(--r-border) !important;
        border-radius: var(--r-radius-sm) !important;
        font-weight: 600 !important;
        box-shadow: var(--r-shadow-card) !important;
    }

    .pos-products-grid .btn-add:hover {
        background: var(--r-bg) !important;
        border-color: var(--r-border-strong) !important;
    }

    .pos-products-grid::-webkit-scrollbar,
    .pos-cart-items::-webkit-scrollbar,
    .pos-payment-form::-webkit-scrollbar,
    #posClientDropdown::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .pos-products-grid::-webkit-scrollbar-track,
    .pos-cart-items::-webkit-scrollbar-track,
    .pos-payment-form::-webkit-scrollbar-track,
    #posClientDropdown::-webkit-scrollbar-track {
        background: var(--r-bg);
        border-radius: 4px;
    }

    .pos-products-grid::-webkit-scrollbar-thumb,
    .pos-cart-items::-webkit-scrollbar-thumb,
    .pos-payment-form::-webkit-scrollbar-thumb,
    #posClientDropdown::-webkit-scrollbar-thumb {
        background: var(--r-border-strong);
        border-radius: 4px;
    }

    #posClientDropdown > div {
        transition: all 0.15s ease;
    }

    #posClientDropdown > div:hover {
        background: var(--r-blue-soft) !important;
        color: var(--r-blue) !important;
    }

    .pos-container > div > div > button[onclick*="scrollIntoView"] {
        background: var(--r-blue) !important;
        box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4) !important;
        transition: all 0.3s ease !important;
    }

    .pos-container > div > div > button[onclick*="scrollIntoView"]:hover {
        transform: scale(1.1) translateY(-2px) !important;
    }

    .pos-multi-carts-bar button[onclick*="posDeleteCart"]:hover {
        background: #FEE2E2 !important;
        border-radius: 50% !important;
    }

    @keyframes posFadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .pos-product-card,
    .pos-category-card {
        animation: posFadeUp 0.3s ease both;
    }

    .pos-cart-item {
        animation: posFadeUp 0.2s ease both;
    }

    @media (max-width: 768px) {
        .pos-container { padding: 10px !important; }
        .pos-steps-nav { padding: 6px !important; gap: 6px !important; }
        .pos-step { padding: 6px 12px !important; font-size: 0.85rem !important; }
        .pos-multi-carts-bar { padding: 8px 10px !important; gap: 6px !important; }
        .pos-cart-header { padding: 12px 14px !important; }
        .pos-cart-total-row { padding: 12px 14px !important; }
        .pos-payment-btn { padding: 10px 12px !important; font-size: 0.85rem !important; }
    }

    @media (max-width: 500px) {
        .pos-step span:not(.step-number) { font-size: 0.8rem !important; }
        .pos-cart-header h3 { font-size: 1rem !important; }
    }

    @media (max-width: 700px) {
        .pos-product-card {
            min-height: 145px !important;
            max-height: 170px !important;
        }
        .pos-product-img {
            height: 70px !important;
            width: 70px !important;
        }
        .pos-product-price,
        .pos-promo-price {
            font-size: 12px !important;
            font-weight: 800 !important;
        }
    }
    `;

    document.head.appendChild(styles);
    console.log('🎨 [POS] Style minimaliste bleu/blanc injecté');
})();

console.log('🚀 E-SOLUTION - POS chargé avec corrections');
console.log('🎨 STYLE MINIMALISTE : fond gris plat + cartes blanches + bleu #2563EB + aucun gradient');
console.log('🎨 PANIER V2 : nom en haut + boutons à droite + sous-total à droite');
console.log('🆕 RESPONSIVE : 320px → 4K, cartes adaptatives, tout s\'ajuste');
console.log('✅ 💳 CRÉDIT CLIENT : lit UNIQUEMENT VENTES avec le MÊME filtre qu\'Admin-Credits (statut!=payé, remaining>0.01, total>0) → plus de divergence entre POS et Admin-Credits');
