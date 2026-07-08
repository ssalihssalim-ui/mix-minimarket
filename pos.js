// ==================== POS.JS - LOGIQUE MÉTIER (FINAL OPTIMISÉ) ====================
// Mixmax Minimarket - Point de vente complet avec virtualisation
// Ajout : champ date/heure de vente personnalisable

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

// ✅ Virtualisation
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
    try{
        let cc=await CacheDB.getAll('categories'),cp=await CacheDB.getAll('products'),cl=await CacheDB.getAll('clients');
        if(cc.length){ posCategoriesList=cc.map(x=>({id:x.id,nom:x.nom,imageBase64:x.imageBase64,recette:x.recette||false})); }
        if(cp.length){ posProductsList=cp.filter(x=>x.disponible!==false).map(x=>({...x,description:x.description||''})); productIndexBuilt=false; }
        if(cl.length){ posAllClients=cl.map(x=>({id:x.id,nom:x.nom,prenom:x.prenom,telephone:x.telephone,description:x.description||''})); posFilteredClients=[...posAllClients]; }
        if(isOnPOSPage()) renderPOS();

        if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
        if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
    }catch(e){ console.error(e); }
    setTimeout(async function(){
        try{
            const[cs,ps,cl]=await Promise.all([db.collection('categories').get(),db.collection('products').get(),db.collection('clients').limit(500).get()]);
            posCategoriesList=[]; cs.forEach(d=>{ let cat={id:d.id,nom:d.data().nom,imageBase64:d.data().imageBase64,recette:d.data().recette||false}; posCategoriesList.push(cat); CacheDB.set('categories',d.id,cat); });
            posProductsList=[]; ps.forEach(d=>{ let dd=d.data(); if(dd.disponible!==false){ let prod={id:d.id,nom:dd.nom||'',description:dd.description||'',prixVente:dd.prixVente||0,prixPromo:dd.prixPromo||0,prixAchat:dd.prixAchat||0,stock:dd.stock,categorie:dd.categorie||'',imageBase64:dd.imageBase64||''}; posProductsList.push(prod); CacheDB.set('products',d.id,prod); } }); productIndexBuilt=false;
            posAllClients=[]; cl.forEach(d=>{ let data=d.data(),cli={id:d.id,nom:data.nom,prenom:data.prenom,telephone:data.telephone,description:data.description||''}; posAllClients.push(cli); CacheDB.set('clients',d.id,cli); }); posFilteredClients=[...posAllClients];
            if(isOnPOSPage()) renderPOS();

            if (typeof window.buildClientIndex === 'function') window.buildClientIndex();
            if (typeof window.buildProductIndex === 'function') window.buildProductIndex();
        }catch(e){ console.error(e); }
    },300);
    await posChargerCommandesTables(); await posChargerCommandesEnLigneCount();
    var cmdData=localStorage.getItem('posCommandeData'),payData=localStorage.getItem('posPayerVente');
    if(cmdData){ var cmd=JSON.parse(cmdData); localStorage.removeItem('posCommandeData'); posCart=[]; if(cmd.items){ posEnrichirItemsAvecPrixAchat(cmd.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||item.prixUnitaire||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||item.prixUnitaire||0,quantite:item.quantite||1,categorie:item.categorie||'',imageBase64:item.imageBase64||'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } if(cmd.clientId&&cmd.clientName) posCurrentClient={id:cmd.clientId,name:cmd.clientName}; posCurrentTable=cmd.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posCommandeId=cmd.commandeId; if(isOnPOSPage()) renderPOS(); return; }
    if(payData){ var v=JSON.parse(payData); localStorage.removeItem('posPayerVente'); posCart=[]; if(v.items){ posEnrichirItemsAvecPrixAchat(v.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixVente||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||0,quantite:item.quantite||1,categorie:'',imageBase64:'',sauces:item.sauces||[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); } if(v.clientId&&v.clientName) posCurrentClient={id:v.clientId,name:v.clientName}; posCurrentTable=v.table||''; posStep=2; posDiscountMAD=0; posPaymentMethod='espece'; window.posVenteId=v.venteId; if(isOnPOSPage()) renderPOS(); return; }
    if(isOnPOSPage()) renderPOS();
}

function posSearchProducts(query){ clearTimeout(window._searchTimeout); window._searchTimeout=setTimeout(function(){ posProductOffset=0; posSearchQuery=query.toLowerCase().trim(); if(isOnPOSPage()) filterProductGrid(); },150); }

function loadMoreProducts(){ posProductOffset+=posProductBatchSize; filterProductGrid(); }

function filterProductGrid(){
    if(!isOnPOSPage()) return;
    var grid=document.getElementById('posProductGrid')||document.querySelector('.pos-products-grid'); if(!grid) return;
    var f=fastSearch(posSearchQuery); if(posSelectedCategory!=='all') f=f.filter(function(p){ return p.categorie===posSelectedCategory; }); f.sort(function(a,b){ return (a.nom||'').localeCompare(b.nom||''); });
    
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

// ... (toutes les autres fonctions jusqu'à buildFullPOS)

// Dans buildFullPOS, après le champ vendeur, ajouter le champ date/heure
function buildFullPOS(c){
    if(posProductsList.length===0&&posCategoriesList.length===0){ c.innerHTML='<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#2E7D32;"></i><p>Chargement...</p></div>'; return; }
    var st=posCalculateTotal(),t=st-posDiscountMAD,h='<div class="pos-container"><div class="pos-products-panel">...'; // début inchangé

    if(posStep===2){
        // ... formulaire de paiement
        h += '<div style="margin-bottom:4px;"><label>Date et heure de la vente</label><input type="datetime-local" id="posDateVente" value="" style="width:100%; padding:8px; border:2px solid #e2e8f0; border-radius:8px;"></div>';
        // ... reste du formulaire
    }
    // ...
}

// Finalisation modifiée
async function posFinalizeSale(){
    if(isFinalizing) return; 
    var st=posCalculateTotal(), t=st-posDiscountMAD;
    
    if(!posCurrentClient && !posCurrentTable){ 
        posCurrentClient = { id: null, name: 'Passager' };
    }
    
    if(posCurrentTable && (posPaymentMethod==='credit'||posPaymentMethod==='partiel')){ 
        alert('Table = espèces uniquement.'); return; 
    }
    if((posPaymentMethod==='credit'||posPaymentMethod==='partiel') && !posCurrentClient){ 
        alert('Client requis pour crédit/partiel.'); return; 
    }
    
    if(posPaymentMethod==='espece' || posPaymentMethod==='partiel'){ 
        var amountInput = document.getElementById('posAmountGiven');
        var givenAmount = parseFloat(amountInput ? amountInput.value : 0) || 0;
        if (givenAmount <= 0) {
            posAmountGiven = t;
            if (amountInput) amountInput.value = t.toFixed(2);
        } else {
            posAmountGiven = givenAmount;
        }
        if(posPaymentMethod==='espece' && posAmountGiven < t){ 
            alert('Montant insuffisant.'); return; 
        }
    }
    
    isFinalizing=true; 
    var fb=document.querySelector('.pos-finalize-btn'); 
    if(fb){ fb.disabled=true; fb.textContent='⏳...'; }
    
    var vendeur=document.getElementById('posVendeur').value.trim()||(window.currentUserData?window.currentUserData.userData.prenom+' '+window.currentUserData.userData.nom:'');
    
    // 🔥 Date/heure personnalisée
    var dateVenteInput = document.getElementById('posDateVente');
    var dateVente = dateVenteInput && dateVenteInput.value ? new Date(dateVenteInput.value) : new Date();
    var dateVenteTimestamp = firebase.firestore.Timestamp.fromDate(dateVente);
    
    try{
        var fn=getNextFactureNum(), remaining=0, paid=true, statutPaiement='payé', change=0;
        
        if(posPaymentMethod==='credit'){ 
            paid=false; remaining=t; statutPaiement='crédit'; 
        } else if(posPaymentMethod==='partiel'){ 
            remaining = t - posAmountGiven;
            paid = false; 
            statutPaiement='partiel'; 
            change = Math.max(0, posAmountGiven - t); 
        } else { 
            change = posAmountGiven - t; 
        }
        
        if(posCurrentTable && !posCurrentClient){ 
            paid=false; statutPaiement='en_attente'; remaining=t; 
        }
        
        var profitTotal=0, itemsDetail=posCart.map(function(it){ 
            var pa=it.prixAchat||0, pvn=it.prixVente||0, pp=it.prixPromo||0, 
                pvr=pp>0?pp:pvn, prof=(pvr-pa)*it.quantite; 
            profitTotal+=prof; 
            return {
                id:it.id, nom:it.nom, quantite:it.quantite, 
                prixVente:pvr, prixAchat:pa, prixPromo:pp, profit:prof,
                sauces:[], interdits:it.interdits||[], 
                epice:it.epice||'Normal', sel:it.sel||'Normal'
            }; 
        });
        
        var sd={
            factureNum:fn, items:itemsDetail, subtotal:st, 
            discountMAD:posDiscountMAD, total:t,
            clientId:posCurrentClient ? posCurrentClient.id : null,
            clientName:posCurrentClient ? posCurrentClient.name : 'Passager',
            table:posCurrentTable || null,
            vendeur:vendeur, paymentMethod:posPaymentMethod,
            statutPaiement:statutPaiement,
            amountGiven:posAmountGiven, change:change,
            paid:paid, remainingAmount:remaining,
            profitTotal:profitTotal,
            dateVente: dateVenteTimestamp,          // <-- ajout
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // ... batch, crédit, etc. (inchangé)
    }catch(e){ 
        alert('Erreur: '+e.message); 
    } finally { 
        isFinalizing=false; 
        if(fb){ fb.disabled=false; fb.innerHTML='<i class="fas fa-check-circle"></i> Finaliser'; } 
    }
}
