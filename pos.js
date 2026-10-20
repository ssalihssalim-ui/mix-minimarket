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
// ✅ Affichage crédit client cliquable
// ✅ MULTI-PANIERS (5 max)
// ✅ BARRE CATÉGORIES SLIDE SUPPRIMÉE
// ✅ BOUTONS GEMINI + MICRO
// ✅ SUR PC : recherche + Tables + En ligne visibles automatiquement au départ
// ✅ MOBILE : recherche + Tables + En ligne VISIBLES AUSSI
// ✅ SHADOW inline sur steps Panier/Paiement
// ✅ Formulaire paiement centré (max 600px)
// ✅ Couleurs 100% bleues (aucun vert)
// ✅ Panier minimum 3 articles visibles
// ✅ Clic "Panier" → scroll vers le panier
// ✅ Responsive renforcé 320px → 4K
// ✅ BOUTONS POS AGRANDIS (panier + validation paiement)
// ✅ PANIER AGRANDI + BOUTON VALIDER TOUJOURS VISIBLE (sticky footer)
// ✅ MOBILE : outils visibles + panier 100% largeur + bouton flèche en HAUT
// ✅ DESIGN ASTRONAUTE : glassmorphism + glow + gradients + animations fluides
// ✅ BOUTON FLÈCHE DÉPLACÉ DANS <body> → au-dessus de TOUT (modales incluses)
// ✅ BORDURES RETIRÉES : design épuré, séparations par ombres/ombres intérieures uniquement

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

// ✅ MODIFIÉ : height:auto + min-height:100vh + padding-bottom pour permettre le scroll complet
function applyDynamicContentScroll() {
var container = document.getElementById('dynamicContent');
if (container) {
container.style.overflowY = 'auto';
container.style.overflowX = 'hidden';
container.style.height = 'auto';
container.style.minHeight = '100vh';
container.style.maxHeight = 'none';
container.style.paddingBottom = '120px';
container.style.position = 'relative';
}
}

async function loadClientCredits(clientId) {
    if (!clientId) return 0;
    if (clientCreditsCache[clientId] !== undefined) return clientCreditsCache[clientId];

    var total = 0;

    try {
        var ventesSnap = await db.collection('ventes')
            .where('clientId', '==', clientId)
            .get();

        ventesSnap.forEach(function(doc) {
            var d = doc.data();

            var statut = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
            var remaining = (d.remainingAmount != null) ? d.remainingAmount : (d.total || 0);

            if (d.paid === true) return;
            if (statut === 'payé') return;
            if (remaining <= 0.01) return;
            if ((d.total || 0) <= 0) return;
            if (statut !== 'crédit' && statut !== 'partiel') return;

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
html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:6px;background:#F7F8FA;border-radius:10px;">';
html += '<button onclick="retournerCategories()" style="display:flex;align-items:center;gap:6px;background:#FFFFFF;color:#1A1D1F;border:none;border-radius:10px;padding:8px 16px;font-size:0.85rem;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.06);">';
html += '<i class="fas fa-arrow-left"></i> Retour aux catégories';
html += '</button>';
if (posSelectedCategoryForView) html += '<span style="font-weight:700;font-size:0.9rem;color:#2563EB;background:#EFF6FF;padding:6px 14px;border-radius:10px;">📂 ' + escapeHtml(posSelectedCategoryForView) + '</span>';
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

var cardStyle = isMobile ?
'padding:6px 4px;min-height:145px;max-height:170px;aspect-ratio:1/1;border-radius:10px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;' :
'padding:12px 10px;min-height:190px;max-height:200px;aspect-ratio:1/1;border-radius:14px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;';

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

var cardStyle = 'min-height:' + cardMinHeight + ';max-height:' + cardMaxHeight + ';padding:8px 4px;border-radius:14px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;background:#FFFFFF;cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);gap:2px;box-shadow:0 1px 3px rgba(0,0,0,0.06);';

var imgStyle = 'width:' + imgSize + ';height:' + imgSize + ';border-radius:50%;overflow:hidden;flex-shrink:0;background:#F7F8FA;display:flex;align-items:center;justify-content:center;margin-bottom:2px;border:none;';

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
card.style.borderColor = 'transparent';
card.style.transform = 'translateY(0)';
card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
card.style.background = '#FFFFFF';
card.style.color = '#1A1D1F';
});

document.querySelectorAll('.pos-category-card').forEach(function(card) {
var nameSpan = card.querySelector('span:first-of-type');
if (nameSpan && nameSpan.textContent.trim() === catName) {
card.classList.add('active');
card.style.borderColor = 'transparent';
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
card.style.borderColor = 'transparent';
card.style.transform = 'translateY(0)';
card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
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
h += '<div onclick="posSelectClientFromDropdown(\''+c.id+'\',\''+escapeHtml(c.nom)+' '+escapeHtml(c.prenom)+'\')" style="padding:8px;cursor:pointer;border-bottom:1px solid #F1F5F9;font-size:14px;">' + escapeHtml(c.nom)+' '+escapeHtml(c.prenom) + ' <span style="color:#9A9FA5;font-size:12px;">('+(c.telephone||'')+')</span></div>';
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
h += '<label style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:none;border-radius:10px;background:#F8FAFC;cursor:' + (ing.stockDisponible <= 0 ? 'not-allowed' : 'pointer') + ';' + (ing.stockDisponible <= 0 ? 'opacity:0.5;' : '') + '">';
h += '<input type="checkbox" class="pos-interdit-check" value="' + escapeHtml(ing.nom) + '" ' + disabled + ' checked> ' + escapeHtml(ing.nom);
if (ing.unite) h += ' (' + escapeHtml(ing.unite) + ')';
h += '</label>';
});
h += '</div></div>';
});
}

h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🌶️ Épices:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
posEpicesList.forEach(function(s, idx) { h += '<label style="padding:6px 12px;border:none;border-radius:10px;background:#F8FAFC;cursor:pointer;font-size:0.85rem;"><input type="radio" name="pos-epice" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>'; });
h += '</div></div>';

h += '<div style="margin-bottom:12px;"><label style="font-weight:700;font-size:0.9rem;">🧂 Sel:</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
posSelList.forEach(function(s, idx) { h += '<label style="padding:6px 12px;border:none;border-radius:10px;background:#F8FAFC;cursor:pointer;font-size:0.85rem;"><input type="radio" name="pos-sel" value="' + s + '" ' + (idx === 0 ? 'checked' : '') + '> ' + s + '</label>'; });
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

// ==================== updateCartOnly() ====================
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

html += '<div class="pos-cart-item" style="display:flex;flex-direction:column;padding:10px 8px;border-bottom:none;gap:6px;background:#FFFFFF;border-radius:10px;margin-bottom:4px;">' +
'<div style="width:100%;font-size:'+nameSize+';font-weight:700;color:#1A1D1F;line-height:1.4;word-break:break-word;white-space:normal;">'+escapeHtml(it.nom)+opts+'</div>' +
'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">' +
'<div style="display:flex;flex-direction:column;gap:2px;min-width:60px;">' +
'<span style="font-size:'+priceSize+';color:#6F767E;font-weight:500;">'+it.prixUnitaire.toFixed(2)+' MAD</span>' +
'</div>' +
'<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:none;background:#F8FAFC;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;transition:all 0.15s;"><i class="fas fa-minus"></i></button>' +
'<input type="number" class="pos-qty-input" value="'+it.quantite+'" min="1" onchange="posUpdateQtyInput('+k+', this.value)" onkeyup="posUpdateQtyInput('+k+', this.value)" onclick="this.select()" style="font-size:'+qtySize+';font-weight:700;width:50px;text-align:center;border:none;background:#F8FAFC;border-radius:10px;padding:4px 4px;color:#1A1D1F;-moz-appearance:textfield;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:none;background:#F8FAFC;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;transition:all 0.15s;"><i class="fas fa-plus"></i></button>' +
'<button class="pos-remove-btn" onclick="posRemoveItem('+k+')" style="background:#FEF2F2;border:none;color:#FF5B5B;cursor:pointer;padding:6px;font-size:0.85rem;transition:all 0.15s;border-radius:10px;"><i class="fas fa-trash-alt"></i></button>' +
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
var isPC = window.innerWidth >= 1024;

if (isPC && !window._posToolsInitialized) {
    posToolsVisible = true;
    window._posToolsInitialized = true;
}

// 🎯 SHADOW inline pour steps actifs
var stepActiveShadow = '0 4px 14px rgba(37, 99, 235, 0.4), 0 2px 4px rgba(37,99,235,0.2)';
var stepInactiveShadow = '0 1px 2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)';
var stepSize = isMobile ? '14px' : '16px';

var stepIndicator = '<div class="pos-steps-nav" style="display:flex;justify-content:center;gap:8px;padding:0;background:transparent;border:none;box-shadow:none;margin-bottom:8px;">' +
'<div class="pos-step ' + (posStep === 1 ? 'active' : '') + '" onclick="posNaviguerEtape(1)" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;cursor:pointer;font-weight:600;font-size:'+stepSize+';transition:all 0.2s ease;background:' + (posStep === 1 ? '#2563EB' : '#FFFFFF') + ';color:' + (posStep === 1 ? '#FFFFFF' : '#6F767E') + ';border:none;box-shadow:' + (posStep === 1 ? stepActiveShadow : stepInactiveShadow) + ';">' +
'<span style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:' + (posStep === 1 ? 'rgba(255,255,255,0.28)' : '#F7F8FA') + ';color:' + (posStep === 1 ? '#FFFFFF' : '#9A9FA5') + ';">1</span>' +
'<span>Panier</span></div>' +
'<div class="pos-step ' + (posStep === 2 ? 'active' : '') + '" onclick="posNaviguerEtape(2)" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;cursor:pointer;font-weight:600;font-size:'+stepSize+';transition:all 0.2s ease;background:' + (posStep === 2 ? '#2563EB' : '#FFFFFF') + ';color:' + (posStep === 2 ? '#FFFFFF' : '#6F767E') + ';border:none;box-shadow:' + (posStep === 2 ? stepActiveShadow : stepInactiveShadow) + ';">' +
'<span style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:' + (posStep === 2 ? 'rgba(255,255,255,0.28)' : '#F7F8FA') + ';color:' + (posStep === 2 ? '#FFFFFF' : '#9A9FA5') + ';">2</span>' +
'<span>Paiement</span></div></div>';

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
var borderColor = 'transparent';
var textColor = isActive ? '#2563EB' : '#1A1D1F';
var fontWeight = isActive ? '700' : '500';
multiCartBar += '<div style="display:flex;align-items:center;gap:2px;border:none;border-radius:10px;background:' + bgColor + ';padding:4px 10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">';
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
// ✅ MODIFIÉ : panier 100% largeur sur mobile (au lieu de 95%)
var mobileCartStyle = '';
if (isMobile) mobileCartStyle = 'width:100% !important;max-width:100% !important;min-width:0 !important;margin:4px 0 !important;max-height:calc(100vh - 120px) !important;min-height:280px !important;flex:1 !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;';
var gridCols = isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))';
var gridGap = isMobile ? '8px' : '14px';
var gridPadding = isMobile ? '4px' : '0';
var panelPadding = isMobile ? '8px' : '16px';

// 🎯 Bouton "Afficher tout" SEULEMENT sur PC/tablette (pas mobile)
var toggleToolsBtnHtml = isMobile
    ? ''  // pas de bouton sur mobile
    : '<div style="display:flex;justify-content:center;align-items:center;margin-bottom:4px;"><button id="posToggleToolsBtn" onclick="posToggleTools()" style="background:#FFFFFF;color:#1A1D1F;border:none;border-radius:999px;padding:8px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,0.06);">' + (posToolsVisible ? '✕ Masquer tout' : '🔍 Afficher tout') + '</button></div>';

// ✅ MODIFIÉ : Outils TOUJOURS visibles (mobile ET PC)
var toolsDisplay = 'flex';

// ✅ MODIFIÉ : Panier min 3 articles visibles (280px PC / 220px mobile)
var cartItemsMinHeight = isMobile ? '220px' : '280px';

var h='<div class="pos-container' + (posStep===2 ? ' pos-container-full' : '') + '" style="display:flex;flex-direction:column;gap:'+(isMobile?'6px':'10px')+';height:auto;padding-bottom:'+(isMobile?'60px':'30px')+';padding-left:0;padding-right:0;">' +
stepIndicator + multiCartBar +
'<div class="pos-row" style="display:flex;flex-direction:column;gap:8px;width:100%;height:auto;">' +
// ✅ MODIFIÉ : panneau produits 100% largeur sur mobile
'<div class="pos-products-panel" style="' + productPanelDisplay + ' padding:'+panelPadding+'; width:100%; max-width:100%; margin:0; background:#FFFFFF; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,0.06); border:none; display:flex; flex-direction:column; height:auto; overflow:visible; min-height:'+(isMobile?'300px':'350px')+'; max-height:'+(isMobile?'55vh':'80vh')+'; flex:8;">' +
'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px;">' +
toggleToolsBtnHtml +
// ✅ MODIFIÉ : class="visible" + display:flex !important pour forcer l'affichage sur mobile
'<div id="posToolsContainer" class="visible" style="display:flex !important;flex-direction:column;gap:8px;margin-bottom:4px;padding:'+(isMobile?'0':'8px 12px')+';background:'+(isMobile?'transparent':'#F7F8FA')+';border-radius:12px;border:none;">' +
// 🔍 Barre de recherche TOUJOURS visible
'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;">' +
'<div style="flex:1;min-width:120px;display:flex;align-items:center;background:#FFFFFF;border:none;border-radius:10px;padding:2px 12px;position:relative;height:'+(isMobile?'38px':'40px')+';box-shadow:0 1px 3px rgba(0,0,0,0.06);">' +
'<i class="fas fa-search" style="color:#9A9FA5;margin-right:6px;font-size:'+(isMobile?'13px':'15px')+';"></i>' +
'<input type="text" id="posSearchInput" placeholder="🔍 Rechercher un produit..." value="'+escapeHtml(posSearchQuery)+'" onkeyup="posSearchProducts(this.value); updateClearButtonVisibility();" oninput="updateClearButtonVisibility();" style="border:none;outline:none;padding:0;width:100%;background:transparent;font-size:'+(isMobile?'13px':'15px')+';padding-right:28px;color:#1A1D1F;">' +
'<button id="posSearchClearBtn" onclick="clearPosSearch()" style="display:'+(posSearchQuery ? 'flex' : 'none')+';position:absolute;right:8px;background:none;border:none;cursor:pointer;padding:2px;color:#9A9FA5;font-size:'+(isMobile?'14px':'16px')+';align-items:center;justify-content:center;"><i class="fas fa-times-circle"></i></button>' +
'</div>' +
'<button id="posMicBtn" title="Recherche vocale" style="background:#FFFFFF;border:none;border-radius:10px;width:'+(isMobile?'38px':'40px')+';height:'+(isMobile?'38px':'40px')+';cursor:pointer;font-size:'+(isMobile?'14px':'16px')+';display:flex;align-items:center;justify-content:center;color:#6F767E;box-shadow:0 1px 3px rgba(0,0,0,0.06);" onclick="posToggleVoiceSearch()"><i class="fas fa-microphone"></i></button>' +
'<button id="posGeminiBtn" title="Commande vocale Gemini (FR)" style="background:#8B5CF6;border:none;border-radius:10px;width:'+(isMobile?'38px':'40px')+';height:'+(isMobile?'38px':'40px')+';cursor:pointer;font-size:'+(isMobile?'14px':'16px')+';display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 8px rgba(139,92,246,0.30);" onclick="posOuvrirCommandeVocaleGemini()"><i class="fas fa-robot"></i></button>' +
'</div>' +
// ✅ MODIFIÉ : Boutons Tables/En ligne TOUJOURS visibles (mobile ET PC)
'<div style="display:flex;gap:6px;width:100%;">' +
(window.posIsClientMode ? '' :
'<button id="posTablesBtn" onclick="posAfficherCommandesTables()" style="background:#FFFFFF;border:none;border-radius:999px;padding:8px 16px;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;color:#1A1D1F;cursor:pointer;flex:1;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">🍽️ Tables <span style="background:#FF5B5B;color:#fff;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;">'+posCommandesTablesCount+'</span></button>' +
'<button id="posEnLigneBtn" onclick="navigateTo(\'commandes\')" style="background:#FFFFFF;border:none;border-radius:999px;padding:8px 16px;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;color:#1A1D1F;cursor:pointer;flex:1;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);">🌐 En ligne <span style="background:#FF5B5B;color:#fff;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;">'+posCommandesEnLigneCount+'</span></button>'
) +
'</div>' +
'</div></div>' +
'<div class="pos-products-grid" id="posProductGrid" style="grid-template-columns:'+gridCols+';gap:'+gridGap+';padding:'+gridPadding+';overflow-x:hidden;overflow-y:auto;flex-wrap:wrap;align-content:start;flex:1;contain:layout paint;content-visibility:auto;"></div>' +
'</div>' +
// ✅ MODIFIÉ : max-height calc(100vh - 140px) + overflow:hidden (au lieu de 60vh)
'<div class="pos-cart-panel" style="' + (isMobile ? mobileCartStyle : 'width:100%;background:#FFFFFF;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:none;display:flex;flex-direction:column;margin-top:4px;max-height:calc(100vh - 140px);flex:2;min-height:380px;overflow:hidden;') + '">';

if(posStep===1){
// ✅ MODIFIÉ : header sticky (reste visible en haut du panier)
h+='<div class="pos-cart-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border:none;flex-shrink:0;background:#FFFFFF;position:sticky;top:0;z-index:2;"><h3 style="font-size:'+(isMobile?'16px':'1rem')+';cursor:pointer;margin:0;display:flex;align-items:center;gap:8px;color:#1A1D1F;" onclick="scrollToCart()"><i class="fas fa-shopping-cart" style="color:#2563EB;"></i> Panier <span class="pos-cart-badge" style="background:#2563EB;color:#fff;border-radius:999px;padding:2px 10px;font-size:'+(isMobile?'12px':'0.75rem')+';font-weight:700;">'+posCart.length+'</span></h3><button class="pos-clear-btn" onclick="posResetCart()" style="font-size:'+(isMobile?'12px':'0.8rem')+';background:transparent;color:#FF5B5B;border:none;border-radius:10px;padding:6px 12px;cursor:pointer;font-weight:600;"><i class="fas fa-trash-alt"></i> Vider</button></div>' +
// ✅ MODIFIÉ : flex:1 1 auto + max-height:none (le parent gère la hauteur)
'<div class="pos-cart-items" style="flex:1 1 auto;overflow-y:auto;padding:8px 12px;min-height:'+cartItemsMinHeight+';max-height:none;">';
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
h += '<div class="pos-cart-item" style="display:flex;flex-direction:column;padding:10px 8px;border-bottom:none;gap:6px;background:#FFFFFF;border-radius:10px;margin-bottom:4px;">' +
'<div style="width:100%;font-size:'+nameSize+';font-weight:700;color:#1A1D1F;line-height:1.4;word-break:break-word;white-space:normal;">'+escapeHtml(it.nom)+opts+'</div>' +
'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;">' +
'<div style="display:flex;flex-direction:column;gap:2px;min-width:60px;"><span style="font-size:'+priceSize+';color:#6F767E;font-weight:500;">'+it.prixUnitaire.toFixed(2)+' MAD</span></div>' +
'<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:none;background:#F8FAFC;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;"><i class="fas fa-minus"></i></button>' +
'<input type="number" class="pos-qty-input" value="'+it.quantite+'" min="1" onchange="posUpdateQtyInput('+k+', this.value)" onkeyup="posUpdateQtyInput('+k+', this.value)" onclick="this.select()" style="font-size:'+qtySize+';font-weight:700;width:50px;text-align:center;border:none;background:#F8FAFC;border-radius:10px;padding:4px 4px;color:#1A1D1F;-moz-appearance:textfield;">' +
'<button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)" style="width:'+btnSize+';height:'+btnSize+';border-radius:10px;border:none;background:#F8FAFC;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:'+btnFontSize+';color:#6F767E;"><i class="fas fa-plus"></i></button>' +
'<button class="pos-remove-btn" onclick="posRemoveItem('+k+')" style="background:#FEF2F2;border:none;color:#FF5B5B;cursor:pointer;padding:6px;font-size:0.85rem;border-radius:10px;"><i class="fas fa-trash-alt"></i></button>' +
'</div>' +
'<div style="min-width:70px;text-align:right;flex-shrink:0;"><span style="font-size:'+totalSize+';font-weight:800;color:#2563EB;">'+(it.prixUnitaire*it.quantite).toFixed(2)+' MAD</span></div>' +
'</div></div>';
}
}
h+='</div>' +
'<div style="padding:8px 12px;display:flex;gap:6px;align-items:center;flex-shrink:0;border:none;background:#FFFFFF;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Remise:</label><input type="number" id="posDiscountMAD" value="'+posDiscountMAD+'" min="0" step="0.01" onchange="posUpdateDiscountMAD(this.value)" style="width:80px;padding:6px 10px;border:none;background:#F8FAFC;border-radius:10px;font-size:'+(isMobile?'13px':'0.85rem')+';color:#1A1D1F;"></div>' +
// ✅ MODIFIÉ : footer sticky (total + bouton Valider toujours visibles en bas)
'<div class="pos-cart-footer" style="padding:0 12px 12px 12px;flex-shrink:0;background:#FFFFFF;position:sticky;bottom:0;z-index:2;">' +
(posDiscountMAD>0?'<div style="display:flex;justify-content:space-between;font-size:'+(isMobile?'12px':'0.85rem')+';color:#6F767E;padding:4px 0;"><span>Sous-total</span><span>'+st.toFixed(2)+'</span></div><div style="display:flex;justify-content:space-between;color:#FF5B5B;font-size:'+(isMobile?'12px':'0.85rem')+';padding:4px 0;"><span>Remise</span><span>-'+posDiscountMAD.toFixed(2)+'</span></div>':'') +
'<div class="pos-cart-total-row" style="display:flex;justify-content:space-between;font-size:'+(isMobile?'18px':'20px')+';font-weight:800;padding:14px 18px;border:none;background:#F7F8FA;border-radius:10px;margin:8px 0 12px 0;"><span style="color:#6F767E;">Total</span><span style="color:#1A1D1F;">'+t.toFixed(2)+' MAD</span></div>' +
'<button class="pos-validate-btn" onclick="posGoToStep2()" '+(posCart.length===0?'disabled':'') + '><i class="fas fa-check-circle"></i> Valider</button>' +
// ✅ MODIFIÉ : bouton flèche ↑ avec class pour déplacement dans <body>
'<button class="pos-scroll-top-btn" onclick="document.querySelector(\'.pos-steps-nav\').scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="fas fa-arrow-up"></i></button>' +
'</div>';
} else {
var canCredit=posCurrentClient&&posCurrentClient.id;
var creditDisplay = '';
if (posCurrentClient && posCurrentClient.id) creditDisplay = '<div id="clientCreditDisplay" style="font-size:20px;font-weight:700;padding:2px 0;text-align:right;"></div>';

// 🎯 Formulaire paiement centré 600px max
h+='<div class="pos-cart-header" style="padding:14px 18px;border:none;flex-shrink:0;background:#FFFFFF;"><h3 style="font-size:'+(isMobile?'16px':'1rem')+';margin:0;display:flex;align-items:center;gap:8px;color:#1A1D1F;"><i class="fas fa-credit-card" style="color:#2563EB;"></i> Paiement</h3></div>' +
'<div class="pos-payment-form" style="padding:14px 18px;flex:1;overflow-y:auto;max-height:400px;width:100%;max-width:600px;margin:0 auto;box-sizing:border-box;">' +
'<div style="margin-bottom:8px;"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;flex-shrink:0;">Client</label>' +
'<button onclick="posAjouterNouveauClient()" style="background:#8B5CF6;color:#fff;border:none;border-radius:10px;padding:6px 12px;font-size:'+(isMobile?'11px':'0.75rem')+';font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;flex-shrink:0;"><i class="fas fa-plus" style="font-size:'+(isMobile?'10px':'0.7rem')+';"></i> Nouveau</button></div>' +
'<div style="position:relative;">' +
'<div style="display:flex;align-items:center;background:#FFFFFF;border:none;border-radius:10px;padding:4px 10px;position:relative;box-shadow:0 1px 3px rgba(0,0,0,0.06);">' +
'<input type="text" id="posClientSearchInput" placeholder="🔍 Cliquez et tapez..." onkeyup="posSearchClient(this.value)" onfocus="if(this.value)posSearchClient(this.value)" autocomplete="off" value="'+(posCurrentClient?escapeHtml(posCurrentClient.name):'')+'" style="border:none;outline:none;padding:6px 0;width:100%;background:transparent;font-size:16px !important;font-weight:700 !important;padding-right:24px;color:#1A1D1F;">' +
'<button id="posClientClearBtn" onclick="clearClientSearch()" style="display:'+((posCurrentClient && posCurrentClient.name) ? 'flex' : 'none')+';position:absolute;right:4px;background:none;border:none;cursor:pointer;padding:2px;color:#9A9FA5;font-size:1rem;"><i class="fas fa-times-circle"></i></button>' +
'</div>' +
'<div id="posClientDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:none;border-radius:0 0 10px 10px;max-height:150px;overflow-y:auto;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,0.12);"></div>' +
'</div>'+creditDisplay+'</div>' +
'<div style="margin:8px 0;font-size:0.7rem;text-align:center;color:#9A9FA5;">— OU —</div>' +
'<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Table</label><input type="text" id="posTableNum" value="'+escapeHtml(posCurrentTable)+'" onchange="posSetTable(this.value)" style="width:100%;padding:8px 10px;border:none;background:#F8FAFC;border-radius:10px;font-size:'+(isMobile?'14px':'0.9rem')+';color:#1A1D1F;"></div>' +
'<div style="margin-bottom:8px;"><div style="padding:10px 14px;background:#F7F8FA;border-radius:10px;border:none;">' +
'<div style="font-size:'+(isMobile?'16px':'18px')+';font-weight:600;color:#6F767E;">Articles: '+posCart.length+'</div>' +
(posDiscountMAD>0?'<div style="color:#FF5B5B;font-size:'+(isMobile?'14px':'16px')+';">Remise: -'+posDiscountMAD.toFixed(2)+'</div>':'') +
'<div style="font-size:'+(isMobile?'18px':'20px')+';font-weight:800;color:#1A1D1F;margin-top:4px;">Total: '+t.toFixed(2)+' MAD</div></div></div>' +
'<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Vendeur</label><input type="text" id="posVendeur" value="'+(window.currentUserData?escapeHtml(window.currentUserData.userData.prenom+' '+window.currentUserData.userData.nom):'')+'" style="width:100%;padding:8px 10px;border:none;background:#F8FAFC;border-radius:10px;font-size:'+(isMobile?'14px':'0.9rem')+';color:#1A1D1F;"></div>' +
'<div style="margin-bottom:8px;"><div style="display:flex;gap:6px;">' +
'<button class="pos-payment-btn '+(posPaymentMethod==='espece'?'active':'')+'" onclick="posSetPaymentMethod(\'espece\')" style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-money-bill-wave"></i> Espèces</button>' +
'<button class="pos-payment-btn '+(posPaymentMethod==='credit'?'active':'')+'" onclick="posSetPaymentMethod(\'credit\')" id="posCreditBtn" '+(canCredit?'':'disabled')+' style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-credit-card"></i> Crédit</button>' +
'<button class="pos-payment-btn '+(posPaymentMethod==='partiel'?'active':'')+'" onclick="posSetPaymentMethod(\'partiel\')" id="posPartielBtn" '+(canCredit?'':'disabled')+' style="font-size:'+(isMobile?'13px':'0.9rem')+' !important;font-weight:700 !important;padding:10px 14px;height:auto;min-height:40px;flex:1;"><i class="fas fa-hand-holding-usd"></i> Partiel</button>' +
'</div></div>';
if(posPaymentMethod==='espece'||posPaymentMethod==='partiel') {
h+='<div style="margin-bottom:8px;"><label style="font-size:'+(isMobile?'12px':'0.8rem')+';font-weight:600;color:#6F767E;">Montant donné</label><input type="number" id="posAmountGiven" placeholder="0.00" value="'+(posAmountGiven>0?posAmountGiven:'')+'" onkeyup="posCalculateChange()" style="width:100%;padding:10px 14px;border:none;background:#F8FAFC;border-radius:10px;font-size:22px !important;font-weight:700 !important;color:#1A1D1F;"><div id="posChangeDisplay" style="font-size:20px;font-weight:700;padding:4px 0;"></div></div>';
}
h+='<button class="pos-finalize-btn" onclick="posFinalizeSale()"><i class="fas fa-check-circle"></i> Finaliser</button>' +
// ✅ MODIFIÉ : bouton flèche ↑ avec class pour déplacement dans <body>
'<button class="pos-scroll-top-btn" onclick="document.querySelector(\'.pos-steps-nav\').scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="fas fa-arrow-up"></i></button>' +
'</div>';
}
h+='</div></div></div></div>'; c.innerHTML=h;

setStaticBackButtonVisibility(posStep === 2);

if(posStep===1) {
posViewMode = 'categories';
posSelectedCategoryForView = null;
filterProductGrid();
// Sur PC : forcer l'affichage des outils
if (isPC) {
    var toolsContainer = document.getElementById('posToolsContainer');
    if (toolsContainer) toolsContainer.style.display = 'flex';
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

// 🆕 Scroll vers le panier quand on clique sur le titre
function scrollToCart() {
    var cartPanel = document.querySelector('.pos-cart-panel');
    if (cartPanel) {
        cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        cartPanel.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3)';
        setTimeout(function() {
            cartPanel.style.boxShadow = '';
        }, 1200);
    }
}
window.scrollToCart = scrollToCart;

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
    var modalHtml = '<div style="padding:10px;"><h3 style="margin-bottom:15px;font-size:1.3rem;display:flex;align-items:center;gap:10px;"><i class="fas fa-user-plus" style="color:#2563EB;"></i> Ajouter un nouveau client</h3><p style="color:#6F767E;font-size:0.9rem;margin-bottom:15px;">Remplissez les informations ci-dessous. Seuls le nom et prénom sont obligatoires.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Prénom *</label><input type="text" id="posNewClientPrenom" placeholder="Prénom" style="width:100%;padding:12px;border:none;background:#F8FAFC;border-radius:10px;font-size:1rem;"></div><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Nom *</label><input type="text" id="posNewClientNom" placeholder="Nom" style="width:100%;padding:12px;border:none;background:#F8FAFC;border-radius:10px;font-size:1rem;"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;"><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Téléphone</label><input type="text" id="posNewClientTelephone" placeholder="Téléphone" style="width:100%;padding:12px;border:none;background:#F8FAFC;border-radius:10px;font-size:1rem;"></div><div><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Email</label><input type="email" id="posNewClientEmail" placeholder="Email" style="width:100%;padding:12px;border:none;background:#F8FAFC;border-radius:10px;font-size:1rem;"></div></div><div style="margin-top:10px;"><label style="font-weight:600;font-size:0.85rem;display:block;margin-bottom:4px;">Adresse</label><input type="text" id="posNewClientAdresse" placeholder="Adresse" style="width:100%;padding:12px;border:none;background:#F8FAFC;border-radius:10px;font-size:1rem;"></div><div style="display:flex;gap:12px;justify-content:flex-end;margin-top:18px;"><button class="btn-cancel" onclick="closeModal()" style="padding:12px 24px;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1rem;background:#F7F8FA;">Annuler</button><button id="posConfirmNewClientBtn" style="background:#2563EB;color:#fff;border:none;border-radius:10px;padding:12px 28px;cursor:pointer;font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px;"><i class="fas fa-check"></i> Ajouter</button></div></div>';
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

// ✅ MODIFIÉ : 100% largeur produits + panier sur mobile
function corrigerDispositionMobile() {
if (window.innerWidth <= 700) {
var row = document.querySelector('.pos-row');
var produits = document.querySelector('.pos-products-panel');
var panier = document.querySelector('.pos-cart-panel');
if (row && produits && panier) {
row.style.display = 'flex'; row.style.flexDirection = 'column'; row.style.flexWrap = 'nowrap';
row.style.padding = '0'; row.style.margin = '0';
produits.style.width = '100%'; produits.style.maxWidth = '100%'; produits.style.minWidth = '0'; produits.style.margin = '0';
produits.style.height = 'auto'; produits.style.minHeight = '300px'; produits.style.maxHeight = '55vh'; produits.style.flex = '1';
panier.style.width = '100%'; panier.style.maxWidth = '100%'; panier.style.minWidth = '0'; panier.style.margin = '4px 0';
panier.style.height = 'auto'; panier.style.minHeight = '280px'; panier.style.maxHeight = 'calc(100vh - 120px)';
panier.style.position = 'static';
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
window.scrollToCart = scrollToCart;

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
// 🎨 STYLE ASTRONAUTE MINIMALISTE (glassmorphism + glow + gradients)
// ✅ BORDURES RETIRÉES : design épuré, séparations par ombres uniquement
// ============================================================
(function injectMinimalistStyle() {
    var STYLE_ID = 'pos-astronaut-styles';
    if (document.getElementById(STYLE_ID)) return;

    var ancien1 = document.getElementById('pos-minimalist-styles');
    if (ancien1) ancien1.remove();
    var ancien2 = document.getElementById('pos-modern-styles-v1');
    if (ancien2) ancien2.remove();
    var ancien3 = document.getElementById('pos-restoe-styles-v1');
    if (ancien3) ancien3.remove();
    var ancien4 = document.getElementById('pos-restoe-styles-v3');
    if (ancien4) ancien4.remove();

    var styles = document.createElement('style');
    styles.id = STYLE_ID;
    styles.textContent = `
    :root {
        --r-bg: #F7F8FA;
        --r-card: #FFFFFF;
        --r-border: #EAECEF;
        --r-border-strong: #E1E4E8;
        --r-text: #0F172A;
        --r-text-2: #64748B;
        --r-text-3: #94A3B8;
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
        --r-shadow-hover: 0 8px 24px rgba(37,99,235,0.15), 0 2px 8px rgba(37,99,235,0.08);
        --r-shadow-blue: 0 6px 18px rgba(37, 99, 235, 0.30);
        --r-glow: 0 0 0 4px rgba(37,99,235,0.12);
    }

    /* ========== CONTAINER : fond spatial subtil ========== */
    .pos-container {
        background:
            radial-gradient(circle at 20% 10%, rgba(59,130,246,0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(139,92,246,0.04) 0%, transparent 40%),
            #F7F8FA !important;
        background-image:
            radial-gradient(circle at 20% 10%, rgba(59,130,246,0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(139,92,246,0.04) 0%, transparent 40%) !important;
        padding: 16px !important;
        border-radius: 0 !important;
        min-height: calc(100vh - 60px) !important;
        font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif !important;
        color: var(--r-text) !important;
        gap: 14px !important;
    }

    /* ========== MULTI-CARTS BAR (glassmorphism) ========== */
    .pos-multi-carts-bar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        background: rgba(255,255,255,0.72) !important;
        backdrop-filter: blur(14px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
        border-radius: var(--r-radius) !important;
        box-shadow: var(--r-shadow-card), inset 0 1px 0 rgba(255,255,255,0.6) !important;
        border: none !important;
        margin-bottom: 14px !important;
    }

    .pos-multi-carts-bar > div {
        border-radius: var(--r-radius-sm) !important;
        transition: all 0.2s ease !important;
        padding: 4px 10px !important;
        background: rgba(255,255,255,0.6) !important;
        backdrop-filter: blur(8px) !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }

    .pos-multi-carts-bar > div:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(37,99,235,0.10) !important;
        background: rgba(255,255,255,0.9) !important;
    }

    .pos-multi-carts-bar button[onclick*="posCreateNewCart"]:hover:not(:disabled) {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 16px rgba(37,99,235,0.35) !important;
    }

    /* ========== PANELS (glassmorphism subtil, sans bordure) ========== */
    .pos-products-panel {
        background: rgba(255,255,255,0.92) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border-radius: 18px !important;
        box-shadow: var(--r-shadow-card), inset 0 1px 0 rgba(255,255,255,0.8) !important;
        border: none !important;
        padding: 16px !important;
    }

    .pos-cart-panel {
        background: rgba(255,255,255,0.92) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border-radius: 18px !important;
        box-shadow: var(--r-shadow-card), inset 0 1px 0 rgba(255,255,255,0.8) !important;
        border: none !important;
        overflow: hidden !important;
        transition: box-shadow 0.3s ease !important;
    }

    /* ========== GRILLES ========== */
    .pos-products-grid {
        display: grid !important;
        gap: 12px !important;
        padding: 0 !important;
        background: transparent !important;
    }

    .pos-categories-grid {
        display: grid !important;
        gap: 12px !important;
        padding: 0 !important;
        background: transparent !important;
    }

    /* ========== CARTES PRODUITS (astronaute minimaliste, sans bordure) ========== */
    .pos-product-card {
        background: linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%) !important;
        border: none !important;
        border-radius: 14px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        overflow: hidden !important;
        padding: 12px 8px !important;
        min-height: 190px !important;
        max-height: 200px !important;
        position: relative !important;
    }

    .pos-product-card:hover {
        transform: translateY(-4px) !important;
        box-shadow:
            0 12px 28px rgba(37,99,235,0.18),
            0 4px 10px rgba(37,99,235,0.10) !important;
    }

    .pos-product-card:active {
        transform: translateY(-1px) scale(0.98) !important;
    }

    .pos-product-card.pos-out-of-stock {
        opacity: 0.45 !important;
        cursor: not-allowed !important;
        filter: grayscale(0.7) !important;
    }

    .pos-product-img {
        height: 85px !important;
        width: 85px !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%) !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.25s ease !important;
    }

    .pos-product-card:hover .pos-product-img {
        transform: scale(1.05) !important;
    }

    .pos-product-img img {
        border-radius: 9px !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }

    .pos-product-name {
        color: var(--r-text) !important;
        font-weight: 700 !important;
        font-size: 0.85rem !important;
        line-height: 1.3 !important;
        letter-spacing: -0.2px !important;
    }

    .pos-product-price {
        color: #2563EB !important;
        font-weight: 800 !important;
        font-size: 0.92rem !important;
        letter-spacing: -0.3px !important;
    }

    .pos-promo-price {
        color: var(--r-red) !important;
        font-weight: 800 !important;
        font-size: 0.92rem !important;
    }

    .pos-old-price {
        font-size: 0.70rem !important;
        color: var(--r-text-3) !important;
    }

    /* ========== CARTES CATÉGORIES (astronaute, sans bordure) ========== */
    .pos-category-card {
        background: linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%) !important;
        border: none !important;
        border-radius: 18px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        overflow: hidden !important;
    }

    .pos-category-card:hover {
        transform: translateY(-4px) !important;
        box-shadow:
            0 14px 32px rgba(37,99,235,0.18),
            0 4px 10px rgba(37,99,235,0.08) !important;
    }

    .pos-category-card.active {
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%) !important;
        border: none !important;
        color: #1D4ED8 !important;
        box-shadow:
            0 10px 28px rgba(37,99,235,0.30),
            0 0 0 4px rgba(37,99,235,0.10) !important;
    }

    .pos-category-card .category-image {
        border-radius: 50% !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        border: none !important;
        transition: transform 0.25s ease !important;
    }

    .pos-category-card:hover .category-image {
        transform: scale(1.05) !important;
    }

    .pos-category-card.active .category-image {
        box-shadow: 0 4px 16px rgba(37,99,235,0.30) !important;
    }

    .pos-category-card .category-name {
        color: var(--r-text) !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
    }

    .pos-category-card.active .category-name {
        color: #1D4ED8 !important;
    }

    .pos-category-card .category-count {
        color: var(--r-text-2) !important;
        font-weight: 600 !important;
        background: #F1F5F9 !important;
        padding: 2px 10px !important;
        border-radius: 999px !important;
        display: inline-block !important;
        margin-top: 4px !important;
        transition: background 0.2s ease !important;
    }

    .pos-category-card.active .category-count {
        background: #DBEAFE !important;
        color: #1D4ED8 !important;
    }

    /* ========== HEADER PANIER ========== */
    .pos-cart-header {
        background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%) !important;
        border: none !important;
    }

    .pos-cart-header h3 i {
        color: var(--r-blue) !important;
        filter: drop-shadow(0 2px 4px rgba(37,99,235,0.35)) !important;
    }

    .pos-cart-badge {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
        border-radius: 999px !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 8px rgba(37,99,235,0.35) !important;
    }

    /* ========== ARTICLES PANIER (glassmorphism, sans bordure) ========== */
    .pos-cart-item {
        background: rgba(255,255,255,0.9) !important;
        backdrop-filter: blur(4px) !important;
        border: none !important;
        border-radius: 12px !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
    }

    .pos-cart-item:hover {
        box-shadow: 0 4px 12px rgba(37,99,235,0.10) !important;
        background: rgba(255,255,255,1) !important;
    }

    /* ========== BOUTONS +/- QUANTITÉ (astronaute, sans bordure) ========== */
    .pos-qty-btn {
        background: #F8FAFC !important;
        border: none !important;
        color: #64748B !important;
        border-radius: var(--r-radius-sm) !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        padding: 0 !important;
    }

    .pos-qty-btn:hover {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
        transform: scale(1.08) !important;
        box-shadow: 0 4px 12px rgba(37,99,235,0.35) !important;
    }

    .pos-qty-btn:active {
        transform: scale(0.92) !important;
    }

    /* ========== INPUT QUANTITÉ (sans bordure) ========== */
    .pos-qty-input {
        border: none !important;
        border-radius: var(--r-radius-sm) !important;
        color: var(--r-text) !important;
        font-weight: 700 !important;
        text-align: center !important;
        background: #F8FAFC !important;
        width: 64px !important;
        min-width: 64px !important;
        height: 44px !important;
        font-size: 16px !important;
        padding: 6px 4px !important;
        transition: all 0.2s ease !important;
    }

    .pos-qty-input:focus {
        outline: none !important;
        background: #FFFFFF !important;
        box-shadow: var(--r-glow) !important;
    }

    /* ========== BOUTON SUPPRIMER ARTICLE (sans bordure) ========== */
    .pos-remove-btn {
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
        font-size: 16px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        background: #FEF2F2 !important;
        color: var(--r-red) !important;
        border: none !important;
        border-radius: var(--r-radius-sm) !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .pos-remove-btn:hover {
        background: var(--r-red) !important;
        color: #fff !important;
        transform: scale(1.08) !important;
        box-shadow: 0 4px 12px rgba(255,91,91,0.35) !important;
    }

    .pos-remove-btn:active {
        transform: scale(0.92) !important;
    }

    /* ========== TOTAL ROW (glow bleu, sans bordure) ========== */
    .pos-cart-total-row {
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%) !important;
        border: none !important;
        border-radius: 12px !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6) !important;
    }

    .pos-cart-total-row span:first-child {
        color: #1E40AF !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px;
    }

    .pos-cart-total-row span:last-child {
        color: #1D4ED8 !important;
        font-weight: 800 !important;
        letter-spacing: -0.5px !important;
        font-size: 1.15rem !important;
    }

    /* ========== BOUTON VALIDER / FINALISER (astronaute, sans bordure) ========== */
    .pos-validate-btn,
    .pos-finalize-btn {
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%) !important;
        color: #fff !important;
        border: none !important;
        border-radius: 14px !important;
        font-weight: 700 !important;
        box-shadow:
            0 6px 18px rgba(37,99,235,0.35),
            inset 0 1px 0 rgba(255,255,255,0.20) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        width: 100% !important;
        min-height: 60px !important;
        padding: 16px 20px !important;
        font-size: 1.15rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        letter-spacing: 0.3px !important;
        position: relative !important;
        overflow: hidden !important;
    }

    .pos-validate-btn::before,
    .pos-finalize-btn::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%) !important;
        transform: translateX(-100%) !important;
        transition: transform 0.6s ease !important;
    }

    .pos-validate-btn:hover:not(:disabled)::before,
    .pos-finalize-btn:hover:not(:disabled)::before {
        transform: translateX(100%) !important;
    }

    .pos-validate-btn:hover:not(:disabled),
    .pos-finalize-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1E40AF 100%) !important;
        transform: translateY(-2px) !important;
        box-shadow:
            0 10px 26px rgba(37,99,235,0.45),
            inset 0 1px 0 rgba(255,255,255,0.25) !important;
    }

    .pos-validate-btn:active:not(:disabled),
    .pos-finalize-btn:active:not(:disabled) {
        transform: scale(0.98) !important;
    }

    .pos-validate-btn:disabled {
        background: #E5E7EB !important;
        color: var(--r-text-3) !important;
        box-shadow: none !important;
        cursor: not-allowed !important;
    }

    /* ========== BOUTONS PAIEMENT (sans bordure) ========== */
    .pos-payment-btn {
        background: #F8FAFC !important;
        border: none !important;
        color: #64748B !important;
        border-radius: 12px !important;
        font-weight: 700 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        min-height: 56px !important;
        padding: 14px 16px !important;
        font-size: 1rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
    }

    .pos-payment-btn:hover:not(:disabled) {
        background: #F1F5F9 !important;
        color: #0F172A !important;
        transform: translateY(-1px) !important;
    }

    .pos-payment-btn.active {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
        box-shadow: 0 6px 18px rgba(37,99,235,0.30) !important;
    }

    #posCreditBtn.active {
        background: linear-gradient(135deg, #F59E0B, #D97706) !important;
        color: #fff !important;
        box-shadow: 0 6px 18px rgba(245,158,11,0.35) !important;
    }

    #posPartielBtn.active {
        background: linear-gradient(135deg, #8B5CF6, #7C3AED) !important;
        color: #fff !important;
        box-shadow: 0 6px 18px rgba(139,92,246,0.35) !important;
    }

    /* ========== BOUTON MICRO / GEMINI (sans bordure) ========== */
    #posMicBtn {
        background: #FFFFFF !important;
        border: none !important;
        color: #64748B !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
    }

    #posMicBtn:hover {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
        transform: scale(1.05) !important;
        box-shadow: 0 4px 12px rgba(37,99,235,0.30) !important;
    }

    #posGeminiBtn {
        background: linear-gradient(135deg, #8B5CF6, #7C3AED) !important;
        border: none !important;
        color: #fff !important;
        box-shadow: 0 4px 12px rgba(139,92,246,0.30) !important;
        transition: all 0.2s ease !important;
    }

    #posGeminiBtn:hover {
        background: linear-gradient(135deg, #7C3AED, #6D28D9) !important;
        transform: scale(1.05) !important;
        box-shadow: 0 6px 16px rgba(139,92,246,0.45) !important;
    }

    /* ========== BOUTONS TABLES / EN LIGNE (sans bordure) ========== */
    #posTablesBtn,
    #posEnLigneBtn {
        background: #FFFFFF !important;
        border: none !important;
        color: #0F172A !important;
        border-radius: 999px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
    }

    #posTablesBtn:hover,
    #posEnLigneBtn:hover {
        background: #EFF6FF !important;
        color: #2563EB !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(37,99,235,0.12) !important;
    }

    #posTablesBtn span,
    #posEnLigneBtn span {
        background: linear-gradient(135deg, #EF4444, #DC2626) !important;
        color: #fff !important;
        border-radius: 999px !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 3px rgba(239,68,68,0.35) !important;
    }

    /* ========== BOUTON AFFICHER TOUT (sans bordure) ========== */
    #posToggleToolsBtn {
        background: rgba(255,255,255,0.9) !important;
        color: var(--r-text) !important;
        border: none !important;
        border-radius: 999px !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        transition: all 0.2s ease !important;
    }

    #posToggleToolsBtn:hover {
        background: #F8FAFC !important;
        transform: translateY(-1px) !important;
    }

    /* ========== SCROLLBARS ========== */
    .pos-products-grid::-webkit-scrollbar,
    .pos-cart-items::-webkit-scrollbar,
    .pos-payment-form::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .pos-products-grid::-webkit-scrollbar-track,
    .pos-cart-items::-webkit-scrollbar-track,
    .pos-payment-form::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 4px;
    }

    .pos-products-grid::-webkit-scrollbar-thumb,
    .pos-cart-items::-webkit-scrollbar-thumb,
    .pos-payment-form::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #CBD5E1, #94A3B8) !important;
        border-radius: 4px;
    }

    .pos-products-grid::-webkit-scrollbar-thumb:hover,
    .pos-cart-items::-webkit-scrollbar-thumb:hover,
    .pos-payment-form::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #94A3B8, #64748B) !important;
    }

    /* ========== HAUTEUR PANIER ========== */
    .pos-cart-items {
        min-height: 280px !important;
        max-height: none !important;
    }
    @media (max-width: 700px) {
        .pos-cart-items {
            min-height: 220px !important;
            max-height: none !important;
        }
    }

    /* ========== MOBILE ========== */
    @media (max-width: 700px) {
        .pos-product-card {
            min-height: 145px !important;
            max-height: 170px !important;
            padding: 10px 6px !important;
            border-radius: 12px !important;
        }
        .pos-product-img {
            height: 70px !important;
            width: 70px !important;
            margin-bottom: 6px !important;
        }
        .pos-product-price,
        .pos-promo-price {
            font-size: 13px !important;
            font-weight: 800 !important;
        }
        .pos-product-name {
            font-size: 11px !important;
            font-weight: 600 !important;
        }
        .pos-qty-btn,
        .pos-remove-btn {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            min-height: 40px !important;
            font-size: 14px !important;
        }
        .pos-qty-input {
            width: 56px !important;
            min-width: 56px !important;
            height: 40px !important;
            font-size: 14px !important;
        }
        .pos-validate-btn,
        .pos-finalize-btn {
            min-height: 54px !important;
            font-size: 1.05rem !important;
        }
        .pos-payment-btn {
            min-height: 50px !important;
            font-size: 0.95rem !important;
        }
        .pos-products-grid { gap: 8px !important; }
        .pos-categories-grid { gap: 8px !important; }
    }

    /* ========== DARK MODE (sans bordures) ========== */
    [data-theme="dark"] .pos-product-card,
    [data-theme="dark"] .pos-category-card {
        background: linear-gradient(135deg, #0D1117 0%, #161B22 100%) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-product-card:hover,
    [data-theme="dark"] .pos-category-card:hover {
        box-shadow: 0 12px 28px rgba(37,99,235,0.30) !important;
    }
    [data-theme="dark"] .pos-category-card.active {
        background: linear-gradient(135deg, #1C2333 0%, #1E293B 100%) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-item {
        background: rgba(22,27,34,0.9) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-total-row {
        background: linear-gradient(135deg, #1C2333 0%, #1E293B 100%) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-cart-total-row span:last-child {
        color: #60A5FA !important;
    }
    [data-theme="dark"] .pos-qty-btn {
        background: #1C2333 !important;
        border: none !important;
        color: #8B949E !important;
    }
    [data-theme="dark"] .pos-qty-btn:hover {
        background: linear-gradient(135deg, #3B82F6, #2563EB) !important;
        color: #fff !important;
    }
    [data-theme="dark"] .pos-qty-input {
        background: #0D1117 !important;
        border: none !important;
        color: #F0F6FC !important;
    }
    [data-theme="dark"] .pos-product-name,
    [data-theme="dark"] .pos-category-card .category-name {
        color: #F0F6FC !important;
    }
    [data-theme="dark"] .pos-product-price {
        color: #60A5FA !important;
    }
    [data-theme="dark"] .pos-multi-carts-bar {
        background: rgba(22,27,34,0.72) !important;
        border: none !important;
    }
    [data-theme="dark"] .pos-products-panel,
    [data-theme="dark"] .pos-cart-panel {
        background: rgba(22,27,34,0.92) !important;
        border: none !important;
    }
    `;

    document.head.appendChild(styles);
    console.log('🚀 [POS] Style ASTRONAUTE injecté (glassmorphism + glow + gradients, sans bordures)');
})();

// ============================================================
// ✅ BOUTON FLÈCHE ↑ — DÉPLACÉ DANS <body> (1ère couche absolue)
// ============================================================
(function moveScrollTopToBody() {
    var STYLE = `
    .pos-scroll-top-btn {
        position: fixed !important;
        top: 8px !important;
        right: 8px !important;
        left: auto !important;
        bottom: auto !important;
        width: 52px !important;
        height: 52px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%) !important;
        color: #FFFFFF !important;
        border: 2px solid #FFFFFF !important;
        font-size: 20px !important;
        cursor: pointer !important;
        box-shadow:
            0 6px 18px rgba(37,99,235,0.55),
            0 3px 8px rgba(0,0,0,0.20),
            0 0 0 3px rgba(59,130,246,0.25) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: auto !important;
        transform: translateZ(0) !important;
        will-change: transform !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        isolation: auto !important;
        contain: none !important;
    }
    .pos-scroll-top-btn:hover {
        transform: translateZ(0) scale(1.10) !important;
        box-shadow:
            0 8px 24px rgba(37,99,235,0.65),
            0 4px 10px rgba(0,0,0,0.25),
            0 0 0 3px rgba(59,130,246,0.35) !important;
    }
    .pos-scroll-top-btn:active {
        transform: translateZ(0) scale(0.94) !important;
    }
    @media (max-width: 768px) {
        .pos-scroll-top-btn {
            top: 6px !important;
            right: 6px !important;
            width: 48px !important;
            height: 48px !important;
            font-size: 17px !important;
        }
    }
    @media (max-width: 380px) {
        .pos-scroll-top-btn {
            top: 4px !important;
            right: 4px !important;
            width: 44px !important;
            height: 44px !important;
            font-size: 16px !important;
        }
    }
    [data-theme="dark"] .pos-scroll-top-btn {
        border-color: #1C2333 !important;
        box-shadow:
            0 6px 18px rgba(59,130,246,0.55),
            0 3px 8px rgba(0,0,0,0.50),
            0 0 0 3px rgba(59,130,246,0.30) !important;
    }
    `;
    if (!document.getElementById('pos-scroll-top-style')) {
        var s = document.createElement('style');
        s.id = 'pos-scroll-top-style';
        s.textContent = STYLE;
        document.head.appendChild(s);
    }
    function relocate() {
        document.querySelectorAll('.pos-scroll-top-btn').forEach(function(btn) {
            if (btn.parentElement !== document.body) {
                document.body.appendChild(btn);
            }
        });
    }
    setInterval(relocate, 500);
    relocate();
})();
/////////
// ============================================================
// ✅ SUPPRESSION DU PAGE-HEADER SUR MOBILE (< 700px)
// Ajout isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function hidePageHeaderOnMobile() {
    var STYLE_ID = 'pos-hide-pageheader-mobile';
    if (document.getElementById(STYLE_ID)) return;

    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    @media (max-width: 700px) {
        .page-header,
        #pageHeader,
        header.page-header,
        .page-header-wrapper,
        #pageHeaderWrapper {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            overflow: hidden !important;
        }
        .pos-container {
            margin-top: 0 !important;
            padding-top: 6px !important;
        }
        #dynamicContent {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
        body {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
    }
    `;
    document.head.appendChild(s);
    console.log('✅ [POS] page-header supprimé sur mobile (< 700px)');
})();  
// ============================================================
// ✅ AGRANDIR LA ZONE UTILE SUR MOBILE (< 700px)
// Supprime les marges/paddings latéraux qui réduisent la largeur
// ⚠️ Bloc isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function posAgrandirZoneMobile() {
    var STYLE_ID = 'pos-agrandir-zone-mobile';
    if (document.getElementById(STYLE_ID)) return;

    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    @media (max-width: 700px) {

        /* 1) Masquer le page-header (gain vertical) */
        .page-header,
        #pageHeader,
        header.page-header,
        .page-header-wrapper,
        #pageHeaderWrapper {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }

        /* 2) Supprimer les paddings latéraux (gain horizontal) */
        .main-content {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 4px !important;
        }
        #dynamicContent {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
        .pos-container {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            gap: 4px !important;
        }
        .pos-row {
            padding-left: 0 !important;
            padding-right: 0 !important;
            gap: 4px !important;
        }

        /* 3) Panneaux produits et panier : pleine largeur, marge interne minimale */
        .pos-products-panel,
        .pos-cart-panel {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            padding-left: 3px !important;
            padding-right: 3px !important;
            border-radius: 10px !important;
        }

        /* 4) Panneau produits plus haut (plus de produits visibles) */
        .pos-products-panel {
            max-height: 65vh !important;
            min-height: 350px !important;
        }

        /* 5) Grilles : gap réduit pour gagner de la place */
        .pos-products-grid {
            gap: 5px !important;
            padding: 2px !important;
        }
        .pos-categories-grid {
            gap: 5px !important;
            padding: 2px !important;
        }

        /* 6) Panier : plus de hauteur pour les articles */
        .pos-cart-items {
            min-height: 240px !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
        }

        body {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }
    }
    `;
    document.head.appendChild(s);
    console.log('✅ [POS] Zone mobile agrandie (header masqué + marges supprimées)');
})();
// ============================================================
// ⬆️ BOUTON FLÈCHE — VERSION FINALE ANTI-DOUBLON
// Un seul bouton, en BAS à droite, TEAL, TOUJOURS VISIBLE
// ⚠️ Bloc isolé — ne modifie AUCUNE autre partie du code
// ============================================================
(function posScrollBtnUnique() {
    var STYLE_ID = 'pos-scroll-btn-unique-style';
    var UNIQUE_BTN_ID = 'posUniqueScrollBtn';

    // Supprimer les anciens styles
    ['pos-scroll-top-style', 'pos-scroll-top-bottom-final', 'pos-scroll-top-always', 'pos-scroll-btn-final-override'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });

    // Supprimer l'ancien style s'il existe
    var oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();

    // Injecter le CSS
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
    /* ========== BOUTON FLÈCHE UNIQUE ========== */
    #posUniqueScrollBtn {
        position: fixed !important;
        bottom: 24px !important;
        right: 20px !important;
        top: auto !important;
        left: auto !important;
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%) !important;
        color: #FFFFFF !important;
        border: 2px solid rgba(255,255,255,0.25) !important;
        font-size: 22px !important;
        cursor: pointer !important;
        box-shadow:
            0 6px 20px rgba(20,184,166,0.55),
            0 3px 8px rgba(0,0,0,0.35) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #posUniqueScrollBtn:hover {
        transform: translateY(-3px) scale(1.08) !important;
        box-shadow:
            0 10px 28px rgba(20,184,166,0.7),
            0 4px 10px rgba(0,0,0,0.4) !important;
    }

    #posUniqueScrollBtn:active {
        transform: scale(0.94) !important;
    }

    @media (max-width: 700px) {
        #posUniqueScrollBtn {
            width: 50px !important;
            height: 50px !important;
            font-size: 19px !important;
            bottom: 18px !important;
            right: 14px !important;
        }
    }

    @media (max-width: 380px) {
        #posUniqueScrollBtn {
            width: 46px !important;
            height: 46px !important;
            font-size: 17px !important;
            bottom: 14px !important;
            right: 12px !important;
        }
    }
    `;
    document.head.appendChild(s);

    // ========== FONCTION POUR SUPPRIMER LES DOUBLONS ==========
    function cleanupDuplicates() {
        // Supprimer TOUS les boutons avec les anciennes classes
        document.querySelectorAll('.pos-scroll-top-btn, button[onclick*="scrollIntoView"]').forEach(function(btn) {
            // Garder uniquement le bouton unique
            if (btn.id !== UNIQUE_BTN_ID) {
                btn.remove();
            }
        });
    }

    // ========== CRÉER LE BOUTON UNIQUE (1 SEULE FOIS) ==========
    function createUniqueButton() {
        // Si le bouton existe déjà, on ne fait rien
        if (document.getElementById(UNIQUE_BTN_ID)) {
            return;
        }

        // Nettoyer les doublons avant de créer
        cleanupDuplicates();

        var btn = document.createElement('button');
        btn.id = UNIQUE_BTN_ID;
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.title = 'Remonter en haut';
        btn.setAttribute('type', 'button');
        btn.onclick = function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            var dc = document.getElementById('dynamicContent');
            if (dc) dc.scrollTo({ top: 0, behavior: 'smooth' });
        };
        document.body.appendChild(btn);
    }

    // Créer immédiatement
    createUniqueButton();

    // ========== SURVEILLER LES DOUBLONS ==========
    // MutationObserver : dès qu'un doublon est ajouté, on le supprime
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Si c'est un bouton flèche doublon
                    if (node.classList && node.classList.contains('pos-scroll-top-btn') && node.id !== UNIQUE_BTN_ID) {
                        node.remove();
                    }
                    // Si c'est un bouton scrollIntoView doublon
                    if (node.onclick && node.onclick.toString().indexOf('scrollIntoView') !== -1 && node.id !== UNIQUE_BTN_ID) {
                        node.remove();
                    }
                    // Chercher les doublons dans les enfants ajoutés
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.pos-scroll-top-btn, button[onclick*="scrollIntoView"]').forEach(function(child) {
                            if (child.id !== UNIQUE_BTN_ID) child.remove();
                        });
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Vérifier régulièrement (sécurité supplémentaire)
    setInterval(function() {
        cleanupDuplicates();
        createUniqueButton();
    }, 1000);

    console.log('⬆️ [POS] Bouton flèche UNIQUE — BAS à droite, TEAL, anti-doublon');
})();
console.log('🚀 E-SOLUTION - POS V5 ASTRONAUTE (sans bordures)');
console.log('✅ Design glassmorphism + glow + gradients');
console.log('✅ BORDURES RETIRÉES : séparations par ombres uniquement');
console.log('✅ Recherche + Tables/En ligne visibles sur PC ET mobile');
console.log('✅ Panier 100% largeur sur mobile + marges propres');
console.log('✅ Bouton flèche ↑ DÉPLACÉ DANS <body> → 1ère couche absolue');
console.log('✅ Panier min-height 220px (3+ articles visibles)');
console.log('✅ Boutons POS AGRANDIS + hover néon');
console.log('✅ BOUTON VALIDER STICKY (toujours visible)');
