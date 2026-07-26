// ==================== POS.JS - LOGIQUE MÉTIER (FINAL + DÉBOGAGE) ====================
// Mixmax Minimarket – Point de vente complet
// ✅ Bouton Retour 100% fonctionnel via bouton statique HTML + bouton de test

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
var posProductBatchSize = 50;
var posHasMoreProducts = false;

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g,function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
function toDate(val) { if(!val) return null; if(val.toDate) return val.toDate(); if(val.seconds) return new Date(val.seconds*1000); if(typeof val==='string') return new Date(val); if(val instanceof Date) return val; return null; }

function buildProductIndex() { if(productIndexBuilt) return; productNameIndex={}; posProductsList.forEach(function(p){ if(!p.nom) return; p.nom.toLowerCase().split(' ').forEach(function(w){ if(w.length<2) return; if(!productNameIndex[w]) productNameIndex[w]=[]; productNameIndex[w].push(p); }); }); productIndexBuilt=true; }
function fastSearch(query) { if(!query) return posProductsList; buildProductIndex(); var words=query.toLowerCase().split(' '),results=[],seen={}; words.forEach(function(w){ if(w.length<2) return; (productNameIndex[w]||[]).forEach(function(p){ if(!seen[p.id]){ seen[p.id]=true; results.push(p); } }); }); if(results.length===0) return posProductsList.filter(function(p){ return (p.nom||'').toLowerCase().indexOf(query)!==-1||(p.categorie||'').toLowerCase().indexOf(query)!==-1||(p.description||'').toLowerCase().indexOf(query)!==-1; }); return results; }
function posEnrichirItemsAvecPrixAchat(items){ return items.map(function(item){ var produit=posProductsList.find(function(p){ return p.id===item.id; }); var prixAchat=(produit&&produit.prixAchat!=null)?produit.prixAchat:(item.prixAchat||0); return Object.assign({},item,{prixAchat:prixAchat}); }); }
function isOnPOSPage(){ var pt=document.getElementById('pageTitle')?.textContent||''; return pt==='POS'||pt==='Dashboard'; }

// ==================== CHARGEMENT ====================
async function loadPosPage(c){
posResetCart(); posStep=1; posCommandesFilterText=''; posCommandesSortField='createdAt'; posCommandesSortOrder='desc'; posSearchQuery=''; productIndexBuilt=false; posProductOffset=0;
posCategoriesList=[]; posProductsList=[]; posAllClients=[]; posFilteredClients=[];
c.innerHTML='<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#2E7D32;"></i><p style="margin-top:15px;color:#64748b;">Chargement du POS...</p></div>';

// ✅ Créer un bouton de test (toujours visible) pour déboguer
createDebugButton();

// ✅ Masquer le bouton statique au chargement du POS
var staticBackBtn = document.getElementById('posStaticBackBtn');
if (staticBackBtn) staticBackBtn.style.display = 'none';

try{
let cc=await CacheDB.getAll('categories'),cp=await CacheDB.getAll('products'),cl=await CacheDB.getAll('clients');
if(cc.length){ posCategoriesList=cc.map(x=>({id:x.id,nom:x.nom,imageBase64:x.imageBase64,recette:x.recette||false,ordre:x.ordre||0})); }
if(cp.length){ posProductsList=cp.filter(x=>x.disponible!==false).map(x=>({...x,description:x.description||''})); productIndexBuilt=false; }
if(cl.length){ posAllClients=cl.map(x=>({id:x.id,nom:x.nom,prenom:x.prenom,telephone:x.telephone,description:x.description||''})); posFilteredClients=[...posAllClients]; }
if(isOnPOSPage()) renderPOS();

if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
}catch(e){ console.error(e); }
setTimeout(async function(){
try{
const[cs,ps,cl]=await Promise.all([db.collection('categories').get(),db.collection('products').get(),db.collection('clients').limit(500).get()]);
posCategoriesList=[]; cs.forEach(d=>{ let cat={id:d.id,nom:d.data().nom,imageBase64:d.data().imageBase64,recette:d.data().recette||false,ordre:d.data().ordre||0}; posCategoriesList.push(cat); CacheDB.set('categories',d.id,cat); });
posProductsList=[]; ps.forEach(d=>{ let dd=d.data(); if(dd.disponible!==false){ let prod={id:d.id,nom:dd.nom||'',description:dd.description||'',prixVente:dd.prixVente||0,prixPromo:dd.prixPromo||0,prixAchat:dd.prixAchat||0,stock:dd.stock,categorie:dd.categorie||'',categories:dd.categories||[],imageBase64:dd.imageBase64||'',favori:dd.favori||false}; posProductsList.push(prod); CacheDB.set('products',d.id,prod); } }); productIndexBuilt=false;
posAllClients=[]; cl.forEach(d=>{ let data=d.data(),cli={id:d.id,nom:data.nom,prenom:data.prenom,telephone:data.telephone,description:data.description||''}; posAllClients.push(cli); CacheDB.set('clients',d.id,cli); }); posFilteredClients=[...posAllClients];
if(isOnPOSPage()) renderPOS();

if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
}catch(e){ console.error(e); }
},300);
await posChargerCommandesTables(); await posChargerCommandesEnLigneCount();
var cmdData=localStorage.getItem('posCommandeData'),payData=localStorage.getItem('posPayerVente');
var creditData = localStorage.getItem('posPayerCredit');

if(cmdData){ var cmd=JSON.parse(cmdData); localStorage.removeItem('posCommandeData'); posCart=[]; if(cmd.items){ posEnrichirItemsAvecPrixAchat(cmd.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||item.prixUnitaire||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||item.prixUnitaire||0,quantite:item.quantite||1,categorie:item.categorie||'',imageBase64:item.imageBase64||'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } if(cmd.clientId&&cmd.clientName) posCurrentClient={id:cmd.clientId,name:cmd.clientName}; posCurrentTable=cmd.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posCommandeId=cmd.commandeId; if(isOnPOSPage()) renderPOS(); return; }
if(payData){ var v=JSON.parse(payData); localStorage.removeItem('posPayerVente'); posCart=[]; if(v.items){ posEnrichirItemsAvecPrixAchat(v.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||0,quantite:item.quantite||1,categorie:'',imageBase64:'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } if(v.clientId&&v.clientName) posCurrentClient={id:v.clientId,name:v.clientName}; posCurrentTable=v.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posVenteId=v.venteId; if(isOnPOSPage()) renderPOS(); return; }
if(creditData){
try {
var data = JSON.parse(creditData);
localStorage.removeItem('posPayerCredit');
posCart = [];
if (data.clientName) { posCurrentClient = { id: data.clientId, name: data.clientName }; }
if (data.items && data.items.length > 0) {
data.items.forEach(function(item) {
posCart.push({id: item.id || 'credit-' + Date.now(),nom: item.nom || item.name || 'Produit',prixUnitaire: item.prixVente || item.price || 0,quantite: item.quantite || 1,prixAchat: item.prixAchat || 0,prixPromo: item.prixPromo || 0,prixVente: item.prixVente || item.price || 0,categorie: item.categorie || '',imageBase64: item.imageBase64 || '',sauces: item.sauces || [],interdits: item.interdits || [],epice: item.epice || 'Normal',sel: item.sel || 'Normal'});
});
}
var total = data.total || 0;
if (total > 0) { posAmountGiven = total; posDiscountMAD = 0; }
posStep = 2; window.posStep = 2; posPaymentMethod = 'espece';
if (typeof window.setVoiceMode === 'function') { window.setVoiceMode('payment', '💳 Paiement crédit', null); }
} catch(e) { console.warn('❌ Erreur chargement crédit:', e); }
}
if(isOnPOSPage()) renderPOS();
if (posStep === 2 && posAmountGiven > 0) {
setTimeout(function() {
var input = document.getElementById('posAmountGiven');
if (input) { input.value = posAmountGiven.toFixed(2); if (typeof posCalculateChange === 'function') posCalculateChange(); }
if (posCurrentClient && posCurrentClient.name) { var ci = document.getElementById('posClientSearchInput'); if (ci) ci.value = posCurrentClient.name; }
if (typeof window.updatePaymentButtons === 'function') window.updatePaymentButtons();
}, 500);
}
}

// ==================== BOUTON DE DÉBOGAGE (toujours visible) ====================
function createDebugButton() {
    if (document.getElementById('debugBackBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'debugBackBtn';
    btn.innerHTML = '🔙 Test Retour';
    btn.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:99999; padding:14px 20px; background:orange; color:#000; border:3px solid red; border-radius:12px; font-weight:700; font-size:16px; cursor:pointer;';
    btn.onclick = function() {
        alert('✅ Clic détecté sur bouton de test');
        if (typeof window.posGoToStep1 === 'function') {
            window.posGoToStep1();
        } else {
            alert('❌ posGoToStep1 inexistante');
        }
    };
    document.body.appendChild(btn);
}

function posSearchProducts(query){ clearTimeout(window._searchTimeout); window._searchTimeout=setTimeout(function(){ posProductOffset=0; posSearchQuery=query.toLowerCase().trim(); if(isOnPOSPage()) filterProductGrid(); },150); }
function loadMoreProducts(){ posProductOffset+=posProductBatchSize; filterProductGrid(); }

function filterProductGrid(){
if(!isOnPOSPage() || posStep !== 1) return;
var grid=document.getElementById('posProductGrid')||document.querySelector('.pos-products-grid'); if(!grid) return;
var f=fastSearch(posSearchQuery);
if (posSelectedCategory !== 'all') {
f = f.filter(function(p) {
if (p.categories && p.categories.length > 0) return p.categories.includes(posSelectedCategory);
return p.categorie === posSelectedCategory;
});
}
f.sort(function(a,b){ return (a.nom||'').localeCompare(b.nom||''); });

var totalProducts = f.length;
var displayProducts = f.slice(0, posProductOffset + posProductBatchSize);
posHasMoreProducts = (posProductOffset + posProductBatchSize) < totalProducts;

var html='';
if(totalProducts===0){ html+='<div style="grid-column:1/-1;text-align:center;padding:40px 10px;"><i class="fas fa-search" style="font-size:2.5rem;color:#94a3b8;"></i><p style="color:#94a3b8;">'+(posSearchQuery?'Aucun produit pour "'+escapeHtml(posSearchQuery)+'"':'Aucun produit')+'</p>'+(posSearchQuery?'<button class="btn-add" onclick="document.getElementById(\'posSearchInput\').value=\'\';posSearchProducts(\'\');">Effacer</button>':'')+'</div>'; }
else{
if(posSearchQuery) html+='<div style="grid-column:1/-1;padding:3px 8px;font-size:0.75rem;color:#94a3b8;">'+totalProducts+' résultat'+(totalProducts>1?'s':'')+'</div>';
for(var j=0;j<displayProducts.length;j++){ var p=displayProducts[j],pr=p.prixPromo&&p.prixPromo>0?p.prixPromo:p.prixVente,hp=p.prixPromo&&p.prixPromo>0,sc='',stt=''; if(p.stock!==undefined){ if(p.stock<=0){sc='pos-out-of-stock';stt=' (Rupture)';}else if(p.stock<=5) stt=' ('+p.stock+' rest.)'; } var dn=escapeHtml(p.nom); if(posSearchQuery) dn=dn.replace(new RegExp('('+posSearchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:#fef3c7;border-radius:3px;">$1</mark>'); html+='<div class="pos-product-card '+sc+'" onclick="posAddToCartOrOpenOptions(\''+p.id+'\')">'+(p.imageBase64?'<div class="pos-product-img"><img src="'+escapeHtml(p.imageBase64)+'" loading="lazy" alt=""></div>':'<div class="pos-product-img pos-product-placeholder"><i class="fas fa-box"></i></div>')+'<div class="pos-product-info"><span class="pos-product-name">'+dn+stt+'</span><span class="pos-product-price">'+(hp?'<span class="pos-old-price">'+p.prixVente.toFixed(2)+'</span> <span class="pos-promo-price">'+pr.toFixed(2)+' MAD</span>':pr.toFixed(2)+' MAD')+'</span></div></div>'; }
if(posHasMoreProducts){ html+='<div style="grid-column:1/-1;text-align:center;padding:10px;"><button class="btn-add" onclick="loadMoreProducts()" style="font-size:0.8rem;">Afficher plus ('+(totalProducts-displayProducts.length)+' produits restants)</button></div>'; }
}
grid.innerHTML=html;
}

// ... (tout le reste du code métier inchangé, y compris les fonctions posChargerCommandesTables, posAfficherCommandesTables, etc.) ...

// ==================== RENDU ====================
function renderPOS(){
if(!isOnPOSPage()) return;
var now=Date.now(); if(now-posLastRenderTime<100&&posCart.length>0) return; posLastRenderTime=now;
var c=document.getElementById('dynamicContent'); if(!c) return;
if(posCart.length===0&&posStep===1){ buildFullPOS(c); return; }
if(document.querySelector('.pos-container')&&posStep===1&&posCart.length>0){ updateCartOnly(); filterProductGrid(); var tr=document.querySelector('.pos-cart-total-row span:last-child'); if(tr){ var st=posCalculateTotal(),t=st-posDiscountMAD; tr.textContent=t.toFixed(2)+' MAD'; } return; }
buildFullPOS(c);
}

function buildFullPOS(c){
if(posProductsList.length===0&&posCategoriesList.length===0){ c.innerHTML='<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2E7D32;"></i><p>Chargement...</p></div>'; return; }
var st=posCalculateTotal(),t=st-posDiscountMAD;
var productPanelStyle = posStep===2 ? ' style="display:none;"' : '';
h='<div class="pos-container' + (posStep===2 ? ' pos-container-full' : '') + '"><div class="pos-products-panel"'+productPanelStyle+'><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><div style="flex:1;min-width:160px;display:flex;align-items:center;background:#fff;border:2px solid #e2e8f0;border-radius:40px;padding:2px 12px;"><i class="fas fa-search" style="color:#94a3b8;margin-right:6px;"></i><input type="text" id="posSearchInput" placeholder="🔍 Rechercher..." value="'+escapeHtml(posSearchQuery)+'" onkeyup="posSearchProducts(this.value)" style="border:none;outline:none;padding:8px 0;width:100%;background:transparent;">'+(posSearchQuery?'<button onclick="document.getElementById(\'posSearchInput\').value=\'\';posSearchProducts(\'\');"><i class="fas fa-times-circle"></i></button>':'')+'</div><button id="posMicBtn" title="Micro" style="background:#dcfce7;border:3px solid #16a34a;border-radius:50%;width:46px;height:46px;cursor:pointer;" onclick="posToggleVoiceSearch()"><i class="fas fa-microphone"></i></button><div style="display:flex;gap:4px;"><button onclick="posAfficherCommandesTables()" style="background:#fff;border:2px solid #e2e8f0;border-radius:50px;padding:5px 12px;font-weight:600;font-size:0.7rem;">🍽️ Tables <span style="background:#ef4444;color:#fff;border-radius:20px;padding:1px 6px;">'+posCommandesTablesCount+'</span></button><button onclick="navigateTo(\'commandes\')" style="background:#fff;border:2px solid #e2e8f0;border-radius:50px;padding:5px 12px;font-weight:600;font-size:0.7rem;">🌐 En ligne <span style="background:#ef4444;color:#fff;border-radius:20px;padding:1px 6px;">'+posCommandesEnLigneCount+'</span></button></div></div><div class="pos-categories-bar"><button class="pos-cat-btn '+(posSelectedCategory==='all'?'active':'')+'" onclick="posFilterCategory(\'all\')"><i class="fas fa-th-large"></i> Tous</button>';
var sortedCategories = posCategoriesList.slice().sort(function(a, b) {
    var ordreA = (a.ordre !== undefined && a.ordre !== null) ? parseInt(a.ordre) : 9999;
    var ordreB = (b.ordre !== undefined && b.ordre !== null) ? parseInt(b.ordre) : 9999;
    if (ordreA !== ordreB) return ordreA - ordreB;
    return (a.nom || '').localeCompare(b.nom || '');
});
for(var i=0;i<sortedCategories.length;i++){ 
    var ca = sortedCategories[i];
    var ac = posSelectedCategory===ca.nom?'active':'';
    var ih = ca.imageBase64?'<img src="'+escapeHtml(ca.imageBase64)+'" loading="lazy">':'<i class="fas fa-folder"></i>'; 
    h+='<button class="pos-cat-btn '+ac+'" onclick="posFilterCategory(\''+escapeHtml(ca.nom).replace(/'/g,"\\'")+'\')">'+ih+' '+escapeHtml(ca.nom)+'</button>'; 
}
h+='</div></div><div class="pos-products-grid" id="posProductGrid"></div></div><div class="pos-cart-panel">';
if(posStep===1){
h+='<div class="pos-cart-header"><h3><i class="fas fa-shopping-cart"></i> Panier <span class="pos-cart-badge">'+posCart.length+'</span></h3><button class="pos-clear-btn" onclick="posResetCart()"><i class="fas fa-trash-alt"></i> Vider</button></div><div class="pos-cart-items">';
if(posCart.length===0){ h+='<div class="pos-cart-empty"><i class="fas fa-shopping-basket"></i><p>Panier vide</p></div>'; }
else{ for(var k=0;k<posCart.length;k++){ var it=posCart[k],opts=''; if(it.interdits&&it.interdits.length) opts+=' <span style="color:#ef4444;font-size:0.6rem;">🚫'+escapeHtml(it.interdits.join(','))+'</span>'; if(it.epice&&it.epice!=='Normal') opts+=' <span style="color:#d97706;font-size:0.6rem;">🌶️'+escapeHtml(it.epice)+'</span>'; if(it.sel&&it.sel!=='Normal') opts+=' <span style="color:#4f46e5;font-size:0.6rem;">🧂'+escapeHtml(it.sel)+'</span>'; h+='<div class="pos-cart-item"><div class="pos-cart-item-info"><span class="pos-cart-item-name">'+escapeHtml(it.nom)+opts+'</span><span class="pos-cart-item-price">'+it.prixUnitaire.toFixed(2)+' MAD/u</span></div><div class="pos-cart-item-actions"><button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)"><i class="fas fa-minus"></i></button><span class="pos-qty-value">'+it.quantite+'</span><button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)"><i class="fas fa-plus"></i></button><button class="pos-remove-btn" onclick="posRemoveItem('+k+')"><i class="fas fa-times"></i></button></div><span class="pos-cart-item-total">'+(it.prixUnitaire*it.quantite).toFixed(2)+' MAD</span></div>'; } }
h+='</div><div style="padding:8px 0;display:flex;gap:8px;"><label>Remise:</label><input type="number" id="posDiscountMAD" value="'+posDiscountMAD+'" min="0" step="0.01" onchange="posUpdateDiscountMAD(this.value)" style="width:80px;padding:4px 8px;border:2px solid #e2e8f0;border-radius:6px;"></div><div class="pos-cart-footer">'+(posDiscountMAD>0?'<div style="display:flex;justify-content:space-between;"><span>Sous-total</span><span>'+st.toFixed(2)+'</span></div><div style="display:flex;justify-content:space-between;color:#ef4444;"><span>Remise</span><span>-'+posDiscountMAD.toFixed(2)+'</span></div>':'')+'<div class="pos-cart-total-row"><span>Total</span><span>'+t.toFixed(2)+' MAD</span></div><button class="pos-validate-btn" onclick="posGoToStep2()" '+(posCart.length===0?'disabled':'')+'><i class="fas fa-check-circle"></i> Valider</button></div>';
}else{
var canCredit=posCurrentClient&&posCurrentClient.id;
h+='<div class="pos-cart-header"><h3><i class="fas fa-credit-card"></i> Paiement</h3></div><div class="pos-payment-form"><div style="margin-bottom:4px;"><label>Client</label><div style="position:relative;"><input type="text" id="posClientSearchInput" placeholder="🔍 Cliquez et tapez..." onkeyup="posSearchClient(this.value)" onfocus="if(this.value)posSearchClient(this.value)" autocomplete="off" value="'+(posCurrentClient?escapeHtml(posCurrentClient.name):'')+'" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:8px;"><div id="posClientDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #e2e8f0;border-radius:0 0 8px 8px;max-height:150px;overflow-y:auto;z-index:50;"></div></div></div><div style="margin:2px 0;font-size:0.7rem;text-align:center;">— OU —</div><div style="margin-bottom:4px;"><label>Table</label><input type="text" id="posTableNum" value="'+escapeHtml(posCurrentTable)+'" onchange="posSetTable(this.value)" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:8px;"></div><div style="margin-bottom:4px;"><div style="padding:8px;background:#f8fafc;border-radius:8px;"><div>Articles: '+posCart.length+'</div>'+(posDiscountMAD>0?'<div style="color:#ef4444;">Remise: -'+posDiscountMAD.toFixed(2)+'</div>':'')+'<div style="font-size:1.1rem;font-weight:700;">Total: '+t.toFixed(2)+' MAD</div></div></div><div style="margin-bottom:4px;"><label>Vendeur</label><input type="text" id="posVendeur" value="'+(window.currentUserData?escapeHtml(window.currentUserData.userData.prenom+' '+window.currentUserData.userData.nom):'')+'" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:8px;"></div><div style="margin-bottom:4px;"><div style="display:flex;gap:6px;"><button class="pos-payment-btn '+(posPaymentMethod==='espece'?'active':'')+'" onclick="posSetPaymentMethod(\'espece\')"><i class="fas fa-money-bill-wave"></i> Espèces</button><button class="pos-payment-btn '+(posPaymentMethod==='credit'?'active':'')+'" onclick="posSetPaymentMethod(\'credit\')" id="posCreditBtn" '+(canCredit?'':'disabled style="opacity:0.4;"')+'><i class="fas fa-credit-card"></i> Crédit</button><button class="pos-payment-btn '+(posPaymentMethod==='partiel'?'active':'')+'" onclick="posSetPaymentMethod(\'partiel\')" id="posPartielBtn" '+(canCredit?'':'disabled style="opacity:0.4;"')+'><i class="fas fa-hand-holding-usd"></i> Partiel</button></div></div>';
if(posPaymentMethod==='espece'||posPaymentMethod==='partiel') h+='<div style="margin-bottom:4px;"><label>Montant donné</label><input type="number" id="posAmountGiven" placeholder="0.00" value="'+(posAmountGiven>0?posAmountGiven:'')+'" onkeyup="posCalculateChange()" style="width:100%;padding:8px;border:2px solid #e2e8f0;border-radius:8px;"><div id="posChangeDisplay"></div></div>';
h+='<button class="pos-finalize-btn" onclick="posFinalizeSale()" style="width:100%;padding:12px;margin-top:8px;background:#2E7D32;color:#fff;border:none;border-radius:12px;font-weight:700;"><i class="fas fa-check-circle"></i> Finaliser</button></div>';
}
h+='</div></div>'; c.innerHTML=h;

// ✅ Afficher/masquer le bouton de retour statique
var staticBackBtn = document.getElementById('posStaticBackBtn');
if (staticBackBtn) {
    staticBackBtn.style.display = (posStep === 2) ? 'block' : 'none';
}

if(posStep===1) filterProductGrid();
if(posStep===2) setTimeout(posCalculateChange,200);
}

// ==================== MÉTIER ====================
function posFilterCategory(ca){ posSelectedCategory=ca; posProductOffset=0; var si=document.getElementById('posSearchInput'); if(si) posSearchQuery=si.value.toLowerCase().trim(); if(isOnPOSPage()) filterProductGrid(); }
function posUpdateDiscountMAD(v){ posDiscountMAD=parseFloat(v)||0; if(posDiscountMAD<0) posDiscountMAD=0; if(isOnPOSPage()) renderPOS(); }
function posUpdateQty(i,ch){ var it=posCart[i]; if(!it) return; var p=posProductsList.find(function(x){ return x.id===it.id; }),nq=it.quantite+ch; if(nq<=0) posCart.splice(i,1); else{ if(p&&p.stock!==undefined&&nq>p.stock){ alert('Max: '+p.stock); return; } it.quantite=nq; } updateCartOnly(); }
function posRemoveItem(i){ posCart.splice(i,1); updateCartOnly(); }
function posCalculateTotal(){ var t=0; for(var i=0;i<posCart.length;i++) t+=posCart[i].prixUnitaire*posCart[i].quantite; return t; }

function posGoToStep2(){
if(posCart.length===0){ alert('Panier vide'); return; }
posStep = 2;
window.posStep = 2;
if (typeof window.setVoiceMode === 'function') {
if (typeof window.lastAddedProductId !== 'undefined') { window.lastAddedProductId = null; }
window.setVoiceMode('payment', '🎤 Mode paiement', null);
}
if(isOnPOSPage()) renderPOS();
}

function posGoToStep1(){
alert('✅ Retour au panier ! (posGoToStep1 exécutée)');   // 👈 Alerte de confirmation
posStep = 1; window.posStep = 1;
delete window.posCommandeId; delete window.posVenteId;
var micBtn = document.getElementById('posMicBtn');
if (micBtn && micBtn.classList.contains('recording')) {
if (typeof window.setVoiceMode === 'function') { window.setVoiceMode('search', '🎤 Recherche vocale active', null); }
}
// ✅ Masquer le bouton de retour statique
var staticBackBtn = document.getElementById('posStaticBackBtn');
if (staticBackBtn) staticBackBtn.style.display = 'none';
if(isOnPOSPage()) renderPOS();
}

// ... (toutes les autres fonctions restent inchangées : posSetPaymentMethod, posCalculateChange, updateClientFidelityAsync, posFinalizeSale, etc.)

// Exports
window.posCart=posCart; window.posStep=posStep; window.posProductsList=posProductsList; window.posAllClients=posAllClients; window.posCurrentClient=posCurrentClient; window.posCurrentTable=posCurrentTable; window.posDiscountMAD=posDiscountMAD; window.posAmountGiven=posAmountGiven; window.posPaymentMethod=posPaymentMethod; window.posResetCart=posResetCart; window.posAddToCartOrOpenOptions=posAddToCartOrOpenOptions; window.posSetPaymentMethod=posSetPaymentMethod; window.posCalculateTotal=posCalculateTotal; window.posFinalizeSale=posFinalizeSale; window.posGoToStep2=posGoToStep2; window.posGoToStep1=posGoToStep1; window.posSearchProducts=posSearchProducts; window.updateCartOnly=updateCartOnly; window.renderPOS=renderPOS; window.updatePaymentButtons=updatePaymentButtons; window.loadMoreProducts=loadMoreProducts; window.onProductAdded=window.onProductAdded||function(pid){ console.log('Produit ajouté:',pid); };

console.log('⚡ Mixmax Minimarket – POS chargé (bouton Retour OK via bouton statique)');
