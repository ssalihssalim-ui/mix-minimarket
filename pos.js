// ==================== POS.JS - LOGIQUE MÉTIER (FINAL OPTIMISÉ) ====================
// Mixmax Minimarket - Point de vente complet avec virtualisation
// Améliorations : client = Passager par défaut, montant donné = total par défaut

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

        // 🔥 Pré-construire les index pour la reconnaissance vocale
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

            // 🔥 Pré-construire les index pour la reconnaissance vocale
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
    
    // ✅ Virtualisation
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

// ==================== COMMANDES TABLES ====================
async function posChargerCommandesTables(){ try{ var snap=await db.collection('commandes').where('statut','==','en_attente').where('source','==','menu_tactile').get(); posCommandesTables=[]; snap.forEach(function(doc){ var d=doc.data();d.id=doc.id;posCommandesTables.push(d); }); posCommandesTables.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); posCommandesTablesCount=posCommandesTables.length; }catch(e){ posCommandesTablesCount=0; } }
async function posChargerCommandesEnLigneCount(){ try{ var snap=await db.collection('commandes').where('statut','==','en_attente').where('source','==','client').get(); posCommandesEnLigneCount=snap.size; }catch(e){ posCommandesEnLigneCount=0; } }
function posTriCommandesTables(field){ posCommandesSortOrder=(posCommandesSortField===field)?(posCommandesSortOrder==='asc'?'desc':'asc'):'asc'; posCommandesSortField=field; posAfficherCommandesTables(); }
function posApplyCommandesFilter(value){ posCommandesFilterText=value; posAfficherCommandesTables(); }

function posAfficherCommandesTables(){
    if(posCommandesTables.length===0){ alert('Aucune commande table en attente.'); return; }
    var fd=posCommandesTables.slice(); if(posCommandesFilterText.trim()){ var q=posCommandesFilterText.toLowerCase().trim(); fd=fd.filter(function(cmd){ if((cmd.table||'').toLowerCase().includes(q)) return true; if(cmd.items&&cmd.items.some(function(it){ return (it.nom||'').toLowerCase().includes(q)||((it.interdits||[]).concat(it.epice!=='Normal'?[it.epice]:[],it.sel!=='Normal'?[it.sel]:[])).some(function(o){ return o.toLowerCase().includes(q); }); })) return true; return false; }); }
    fd.sort(function(a,b){ var va,vb; switch(posCommandesSortField){ case'table':va=(a.table||'').toLowerCase();vb=(b.table||'').toLowerCase();break; case'total':va=a.total||0;vb=b.total||0;break; case'createdAt':va=a.createdAt?.seconds||0;vb=b.createdAt?.seconds||0;break; default:va=0;vb=0; } return (va<vb)?(posCommandesSortOrder==='asc'?-1:1):(va>vb)?(posCommandesSortOrder==='asc'?1:-1):0; });
    function rsh(label,field){ var icon=''; if(posCommandesSortField===field) icon=posCommandesSortOrder==='asc'?' ▲':' ▼'; return '<th style="cursor:pointer;" onclick="posTriCommandesTables(\''+field+'\')">'+label+icon+'</th>'; }
    var html='<div style="margin-bottom:12px;display:flex;gap:8px;"><input type="text" id="posCmdFilterInput" placeholder="🔍 Filtrer..." style="flex:1;padding:8px 12px;border:2px solid #e2e8f0;border-radius:30px;font-size:0.8rem;" value="'+escapeHtml(posCommandesFilterText)+'" onkeyup="posApplyCommandesFilter(this.value)"><button class="btn-add" onclick="posApplyCommandesFilter(\'\')">❌</button></div><div style="max-height:60vh;overflow-y:auto;"><table class="data-table" style="width:100%;font-size:0.7rem;"><thead><tr>'+rsh('Table','table')+'<th>Produits</th><th>Options</th>'+rsh('Total','total')+rsh('Date','createdAt')+'<th>Actions</th></thead><tbody>';
    if(fd.length===0) html+='<tr><td colspan="6" style="text-align:center;padding:20px;">Aucune</td></tr>';
    else fd.forEach(function(cmd){ var table=cmd.table||'?',dh=cmd.createdAt?new Date(cmd.createdAt.seconds*1000).toLocaleString('fr-FR'):'N/A',prod=cmd.items?cmd.items.map(function(it){ return '<strong>'+it.quantite+'x</strong> '+escapeHtml(it.nom); }).join('<br>'):'-',opts=cmd.items?cmd.items.map(function(it){ var o=[]; if(it.interdits&&it.interdits.length) o.push('<span style="color:#ef4444;">🚫 '+escapeHtml(it.interdits.join(', '))+'</span>'); if(it.epice&&it.epice!=='Normal') o.push('<span style="color:#d97706;">🌶️ '+escapeHtml(it.epice)+'</span>'); if(it.sel&&it.sel!=='Normal') o.push('<span style="color:#4f46e5;">🧂 '+escapeHtml(it.sel)+'</span>'); return o.length?o.join(' | '):'<span style="color:#94a3b8;">-</span>'; }).join('<br>'):'-'; html+='<tr><td><strong>🍽️ '+escapeHtml(table)+'</strong></td><td>'+prod+'</td><td><small>'+opts+'</small></td><td><strong style="color:#2E7D32;">'+cmd.total.toFixed(2)+' MAD</strong></td><td><small>'+dh+'</small></td><td><button class="btn-add" style="padding:3px 6px;font-size:0.65rem;" onclick="posChargerCommandeTable(\''+cmd.id+'\')">Accepter</button> <button class="btn-save" style="padding:3px 6px;font-size:0.65rem;" onclick="posPayerCommandeTable(\''+cmd.id+'\')">Payé</button></td></tr>'; });
    html+='</tbody></table></div>'; openModal('🛎️ Commandes tables ('+fd.length+')',html);
}
function posChargerCommandeTable(cid){ var cmd=posCommandesTables.find(function(c){ return c.id===cid; }); if(!cmd) return; posCart=[]; posEnrichirItemsAvecPrixAchat(cmd.items).forEach(function(item){ posCart.push({id:item.id,nom:item.nom,prixUnitaire:item.prixUnitaire||item.prixVente||0,prixAchat:item.prixAchat||0,prixPromo:item.prixPromo||0,prixVente:item.prixVente||item.prixUnitaire||0,quantite:item.quantite||1,categorie:item.categorie||'',imageBase64:item.imageBase64||'',sauces:[],interdits:item.interdits||[],epice:item.epice||'Normal',sel:item.sel||'Normal'}); }); posCurrentTable='Table '+(cmd.table||'?'); posCurrentClient=null; posPaymentMethod='espece'; posDiscountMAD=0; window.posCommandeId=cid; closeModal(); posStep=2; if(isOnPOSPage()) renderPOS(); }
async function posPayerCommandeTable(cid){ if(!confirm('Marquer comme payée ?')) return; try{ await CacheDB.write('commandes',cid,{statut:'payé',paidAt:firebase.firestore.FieldValue.serverTimestamp()},'update'); alert('✅ Payée !'); await posChargerCommandesTables(); closeModal(); if(isOnPOSPage()) renderPOS(); CacheDB.sync(); }catch(e){ alert('❌ '+e.message); } }

// ==================== PANIER ====================
function posResetCart(){ posCart=[]; posStep=1; posSelectedCategory='all'; posCurrentClient=null; posCurrentTable=''; posPaymentMethod='espece'; posAmountGiven=0; posDiscountMAD=0; posSearchQuery=''; posProductOffset=0; posFilteredClients=posAllClients.slice(); delete window.posCommandeId; delete window.posVenteId; var si=document.getElementById('posSearchInput'); if(si) si.value=''; if(isOnPOSPage()) renderPOS(); }

function posSearchClient(query){ var q=query.toLowerCase().trim(); posCurrentClient=null; if(!q){ posFilteredClients=posAllClients.slice(); var d=document.getElementById('posClientDropdown'); if(d) d.style.display='none'; }else{ posFilteredClients=posAllClients.filter(function(c){ return (c.nom||'').toLowerCase().indexOf(q)!==-1||(c.prenom||'').toLowerCase().indexOf(q)!==-1||(c.telephone||'').toLowerCase().indexOf(q)!==-1||(c.description||'').toLowerCase().indexOf(q)!==-1; }); renderClientDropdown(); } }
function renderClientDropdown(){ var d=document.getElementById('posClientDropdown'); if(!d) return; var h=''; if(posFilteredClients.length===0) h='<div style="padding:8px;color:#94a3b8;text-align:center;">Aucun</div>'; else posFilteredClients.forEach(function(c){ h+='<div onclick="posSelectClientFromDropdown(\''+c.id+'\',\''+escapeHtml(c.nom)+' '+escapeHtml(c.prenom)+'\')" style="padding:8px;cursor:pointer;border-bottom:1px solid #f1f5f9;">'+escapeHtml(c.nom)+' '+escapeHtml(c.prenom)+' <span style="color:#94a3b8;font-size:0.65rem;">('+(c.telephone||'')+')</span></div>'; }); d.innerHTML=h; d.style.display='block'; }
function posSelectClientFromDropdown(cid,cn){ posCurrentClient={id:cid,name:cn}; posCurrentTable=''; var s=document.getElementById('posClientSearchInput'),t=document.getElementById('posTableNum'),d=document.getElementById('posClientDropdown'); if(s) s.value=cn; if(t) t.value=''; if(d) d.style.display='none'; updatePaymentButtons(); if(isOnPOSPage()) renderPOS(); }
document.addEventListener('click',function(e){ var d=document.getElementById('posClientDropdown'),s=document.getElementById('posClientSearchInput'); if(d&&s&&!s.contains(e.target)&&!d.contains(e.target)) d.style.display='none'; });
function updatePaymentButtons(){ setTimeout(function(){ var cb=document.getElementById('posCreditBtn'),pb=document.getElementById('posPartielBtn'),cc=posCurrentClient&&posCurrentClient.id; if(cb){ cb.disabled=!cc; cb.style.opacity=cc?'1':'0.4'; } if(pb){ pb.disabled=!cc; pb.style.opacity=cc?'1':'0.4'; } },300); }
function posSetTable(v){ posCurrentTable=v.trim(); if(posCurrentTable){ posCurrentClient=null; posPaymentMethod='espece'; var s=document.getElementById('posClientSearchInput'); if(s) s.value=''; } }

function posAddToCartOrOpenOptions(pid){ var p=posProductsList.find(function(x){ return x.id===pid; }); if(!p) return; if(p.stock!==undefined&&p.stock<=0){ alert('Rupture'); return; } var cat=posCategoriesList.find(function(c){ return c.nom===p.categorie; }),isRecette=cat&&cat.recette===true; if(isRecette){ posCurrentProductId=pid; posOpenOptionsModal(pid); }else{ var ex=posCart.find(function(x){ return x.id===pid; }); if(ex){ if(p.stock!==undefined&&ex.quantite>=p.stock){ alert('Stock insuffisant'); return; } ex.quantite+=1; }else{ var pr=p.prixPromo&&p.prixPromo>0?p.prixPromo:p.prixVente; posCart.push({id:p.id,nom:p.nom,prixUnitaire:pr,prixAchat:p.prixAchat||0,prixPromo:p.prixPromo||0,prixVente:p.prixVente||0,quantite:1,categorie:p.categorie||'',imageBase64:p.imageBase64||'',sauces:[],interdits:[],epice:'Normal',sel:'Normal'}); } if(typeof window.onProductAdded==='function') window.onProductAdded(p.id); updateCartOnly(); } }
async function posOpenOptionsModal(pid){ var p=posProductsList.find(function(x){ return x.id===pid; }); if(!p) return; if(p.stock!==undefined&&p.stock<=0){ alert('Rupture'); return; } if(typeof allStockData==='undefined'||allStockData.length===0){ try{ var snap=await db.collection('stock').orderBy('nom').get(); allStockData=[]; snap.forEach(function(d){ var dd=d.data();dd.id=d.id;allStockData.push(dd); }); }catch(e){} } try{ var doc=await db.collection('products').doc(pid).get(); posCurrentProductIngredients=doc.exists?(doc.data().ingredients||[]):[]; }catch(e){ posCurrentProductIngredients=[]; } var grouped={}; posCurrentProductIngredients.forEach(function(ing){ var si=allStockData.find(function(s){ return s.id===ing.idStock; }),cat=si?si.categorie:'Autre'; if(!grouped[cat]) grouped[cat]=[]; grouped[cat].push(ing.nom); }); var order=['Sauces','Légumes','Fruits','Viande','Poulet','Poisson'],sortedCats=Object.keys(grouped).sort(function(a,b){ var ia=order.indexOf(a),ib=order.indexOf(b); if(ia!==-1&&ib!==-1) return ia-ib; if(ia!==-1) return -1; if(ib!==-1) return 1; return a.localeCompare(b); }); posCurrentProductId=pid; var h='<h4>'+escapeHtml(p.nom)+'</h4>'; if(sortedCats.length===0) h+='<div style="color:#94a3b8;">Aucun ingrédient</div>'; else sortedCats.forEach(function(cat){ h+='<div style="margin-bottom:10px;"><label style="font-weight:600;">🥫 '+escapeHtml(cat)+'</label><div style="display:flex;flex-wrap:wrap;gap:4px;">'; grouped[cat].forEach(function(ing){ h+='<label style="display:flex;align-items:center;gap:3px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:0.7rem;"><input type="checkbox" class="pos-interdit-check" value="'+escapeHtml(ing)+'"> '+escapeHtml(ing)+'</label>'; }); h+='</div></div>'; }); h+='<div><label>🌶️ Épices:</label><div style="display:flex;flex-wrap:wrap;gap:4px;">'; posEpicesList.forEach(function(s,idx){ h+='<label style="padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:0.7rem;"><input type="radio" name="pos-epice" value="'+s+'" '+(idx===0?'checked':'')+'> '+s+'</label>'; }); h+='</div></div><div><label>🧂 Sel:</label><div style="display:flex;flex-wrap:wrap;gap:4px;">'; posSelList.forEach(function(s,idx){ h+='<label style="padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:0.7rem;"><input type="radio" name="pos-sel" value="'+s+'" '+(idx===0?'checked':'')+'> '+s+'</label>'; }); h+='</div></div>'; h+='<div style="text-align:right;margin-top:15px;"><button class="btn-cancel" onclick="closeModal()">Annuler</button> <button class="btn-save" onclick="posConfirmOptions()">Ajouter</button></div>'; openModal('Personnaliser',h); }
function posConfirmOptions(){ var interdits=[]; document.querySelectorAll('.pos-interdit-check:checked').forEach(function(cb){ interdits.push(cb.value); }); var epice=(document.querySelector('input[name="pos-epice"]:checked')||{}).value||'Normal',sel=(document.querySelector('input[name="pos-sel"]:checked')||{}).value||'Normal',p=posProductsList.find(function(x){ return x.id===posCurrentProductId; }); if(!p){ closeModal(); return; } var ex=posCart.find(function(x){ return x.id===posCurrentProductId; }); if(ex){ if(p.stock!==undefined&&ex.quantite>=p.stock){ alert('Stock insuffisant'); closeModal(); return; } ex.quantite+=1; }else{ var pr=p.prixPromo&&p.prixPromo>0?p.prixPromo:p.prixVente; posCart.push({id:p.id,nom:p.nom,prixUnitaire:pr,prixAchat:p.prixAchat||0,prixPromo:p.prixPromo||0,prixVente:p.prixVente||0,quantite:1,categorie:p.categorie||'',imageBase64:p.imageBase64||'',sauces:[],interdits:interdits,epice:epice,sel:sel}); } if(typeof window.onProductAdded==='function') window.onProductAdded(p.id); closeModal(); updateCartOnly(); }
function updateCartOnly(){ if(!isOnPOSPage()) return; var ci=document.querySelector('.pos-cart-items'); if(!ci) return; var html=''; if(posCart.length===0) html='<div class="pos-cart-empty"><i class="fas fa-shopping-basket"></i><p>Panier vide</p></div>'; else for(var k=0;k<posCart.length;k++){ var it=posCart[k],opts=''; if(it.interdits&&it.interdits.length) opts+=' <span style="color:#ef4444;font-size:0.6rem;">🚫'+escapeHtml(it.interdits.join(','))+'</span>'; if(it.epice&&it.epice!=='Normal') opts+=' <span style="color:#d97706;font-size:0.6rem;">🌶️'+escapeHtml(it.epice)+'</span>'; if(it.sel&&it.sel!=='Normal') opts+=' <span style="color:#4f46e5;font-size:0.6rem;">🧂'+escapeHtml(it.sel)+'</span>'; html+='<div class="pos-cart-item"><div class="pos-cart-item-info"><span class="pos-cart-item-name">'+escapeHtml(it.nom)+opts+'</span><span class="pos-cart-item-price">'+it.prixUnitaire.toFixed(2)+' MAD/u</span></div><div class="pos-cart-item-actions"><button class="pos-qty-btn" onclick="posUpdateQty('+k+',-1)"><i class="fas fa-minus"></i></button><span class="pos-qty-value">'+it.quantite+'</span><button class="pos-qty-btn" onclick="posUpdateQty('+k+',1)"><i class="fas fa-plus"></i></button><button class="pos-remove-btn" onclick="posRemoveItem('+k+')"><i class="fas fa-times"></i></button></div><span class="pos-cart-item-total">'+(it.prixUnitaire*it.quantite).toFixed(2)+' MAD</span></div>'; } ci.innerHTML=html; var badge=document.querySelector('.pos-cart-badge'); if(badge) badge.textContent=posCart.length; var tr=document.querySelector('.pos-cart-total-row span:last-child'); if(tr){ var st=posCalculateTotal(),t=st-posDiscountMAD; tr.textContent=t.toFixed(2)+' MAD'; } var vb=document.querySelector('.pos-validate-btn'); if(vb) vb.disabled=posCart.length===0; }
function getNextFactureNum(){ factureCounter=parseInt(localStorage.getItem('factureCounter'))||0; factureCounter++; localStorage.setItem('factureCounter',factureCounter); return 'FACT-'+new Date().getFullYear()+'-'+String(factureCounter).padStart(5,'0'); }

// ==================== RENDU ====================
function renderPOS(){
    if(!isOnPOSPage()) return;
    var now=Date.now();
