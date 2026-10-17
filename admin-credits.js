// ==================== ADMIN-VENTES.JS - E-SOLUTION ====================
// Version : Design PRO - Facture/Date/Client en colonnes séparées
// ✅ BOUTONS AVEC TEXTE - COMME ADMIN CREDITS
// ✅ SÉLECTION EN MASSE
// ✅ DÉTAILS FACTURE MODAL AVEC X POUR FERMER - FONT SIZE AGRANDI
// ✅ PAGINATION CORRIGÉE - SANS ICÔNES
// ✅ STATISTIQUES EN HAUT DE PAGE AVEC FILTRES DE DATE
// ✅ SYNCHRONISATION AVEC ADMIN CREDITS : Quand un crédit est payé, la vente devient "Payé"
// ✅ NOUVEAU CHAMP "RESTANT" DANS LES VENTES
// ✅ ARTICLES ET OPTIONS VISIBLES POUR TOUT LE MONDE (ADMIN ET CAISSIER)
// ✅ 📴 VENTES HORS-LIGNE : affichage depuis localStorage + sync auto
// ✅ 💰 NOUVEAU : Bouton "Payer tout" pour paiement groupé (comme admin credits)
// ✅ 📱 NOUVEAU : WhatsApp détaillé avec toutes les factures + produits + sous-totaux + total général
// ✅ 🎨 NOUVEAU : Design MODERNE (identique à admin-credits)
// ✅ 💰 NOUVEAU : Paiement direct dans Admin Ventes (sans redirection POS) + datePaiement
// ✅ 📅 NOUVEAU : Colonne "Date paiement" dans la liste des ventes
// ✅ 🖱️ NOUVEAU : Nom du client CLIQUABLE → filtre automatique
// ✅ ⚠️ NOUVEAU : DIALOGUE OUI/NON pour multi-clients
// 🆕 ✅ FILTRE : "Partiel" fusionné avec "Crédit" → option unique "Crédit + Partiel"
// 🆕 ✅ GRAPHIQUE : CA / Profit / Crédits qui s'adapte aux filtres (heure/jour/mois)
// 🆕 ✅ BOUTON : Afficher / Masquer le graphique (état sauvegardé)
// 🔧 CORRECTION : Suppression de .limit(2000) → charge TOUTES les ventes
// 🔧 CORRECTION FILTRE CLIENT : filtrerVentesParClient utilise maintenant clientId (cohérence avec admin-credits)

// ========== VARIABLES GLOBALES ==========
window.commandesSearch = window.commandesSearch || '';
window.commandesPeriod = window.commandesPeriod || 'all';
window.ventesSearch = window.ventesSearch || '';
window.ventesPeriod = window.ventesPeriod || 'all';
window.ventesDateDebut = window.ventesDateDebut || '';
window.ventesDateFin = window.ventesDateFin || '';
window.allVentesData = window.allVentesData || [];
window.allCommandesData = window.allCommandesData || [];
window.filteredVentes = window.filteredVentes || null;
window.filteredCommandes = window.filteredCommandes || null;
window.venteSelectionMode = window.venteSelectionMode || false;
window.venteSelectedIndex = window.venteSelectedIndex || -1;
window.clientsDataForSearch = window.clientsDataForSearch || [];

// ✅ NOUVEAU : Client verrouillé en mode sélection (pour multi-clients)
window.venteSelectedClientId = window.venteSelectedClientId || null;
window.venteSelectedClientName = window.venteSelectedClientName || null;

// ✅ INITIALISATION DE currentPages
window.currentPages = window.currentPages || {};
window.currentPages.ventes = window.currentPages.ventes || 1;
window.currentPages.commandes = window.currentPages.commandes || 1;
window.currentPages.credits = window.currentPages.credits || 1;

// 🆕 Graphique : instance globale
window._ventesChart = window._ventesChart || null;

// 🆕 Graphique : état visible/masqué (par défaut : masqué)
window._ventesChartVisible = (localStorage.getItem('ventesChartVisible') === 'true');

// ========== SELECTION EN MASSE ==========
var ventesSelectionnees = new Set();
var selectAllVentesBtnState = false;

// ✅ MODIFIÉ : Détection multi-clients avec confirmation OUI/NON
function toggleVenteSelection(id) {
    // Si déjà sélectionné → retirer simplement
    if (ventesSelectionnees.has(id)) {
        ventesSelectionnees.delete(id);
        
        if (ventesSelectionnees.size === 0) {
            window.venteSelectedClientId = null;
            window.venteSelectedClientName = null;
        }
        updateVenteSelectionUI();
        renderVentesTablePro();
        return;
    }
    
    var data = window.filteredVentes || window.allVentesData || [];
    var vente = data.find(function(v) { return v.id === id; });
    
    if (!vente) {
        updateVenteSelectionUI();
        renderVentesTablePro();
        return;
    }
    
    // 1ère sélection → mémoriser le client
    if (ventesSelectionnees.size === 0) {
        window.venteSelectedClientId = vente.clientId || vente.clientName || null;
        window.venteSelectedClientName = vente.clientName || 'Client inconnu';
        ventesSelectionnees.add(id);
        updateVenteSelectionUI();
        renderVentesTablePro();
        return;
    }
    
    // Vérifier si c'est le même client
    var currentClientId = window.venteSelectedClientId;
    var currentClientName = window.venteSelectedClientName;
    var newClientId = vente.clientId || vente.clientName || null;
    
    if (newClientId !== currentClientId) {
        var confirmer = confirm(
            '⚠️ CLIENT DIFFÉRENT DÉTECTÉ\n\n' +
            'Vous avez déjà sélectionné des ventes de :\n' +
            '👤 ' + (currentClientName || 'Client inconnu') + '\n\n' +
            'Vous voulez ajouter des ventes de :\n' +
            '👤 ' + (vente.clientName || 'Client inconnu') + '\n\n' +
            '❓ Voulez-vous AUTORISER la sélection multi-clients ?\n\n' +
            '✅ OK = Oui, autoriser les 2 clients\n' +
            '❌ Annuler = Non, refuser'
        );
        
        if (!confirmer) {
            // Refus → décocher la case
            var cb = document.querySelector('.vente-checkbox[data-id="' + id + '"]');
            if (cb) cb.checked = false;
            return;
        }
        
        window.venteSelectedClientId = 'MULTI';
        window.venteSelectedClientName = 'Plusieurs clients';
    }
    
    ventesSelectionnees.add(id);
    updateVenteSelectionUI();
    renderVentesTablePro();
}

function toggleAllVentesSelection() {
    var checkboxes = document.querySelectorAll('.vente-checkbox');
    var allChecked = true;
    checkboxes.forEach(function(cb) {
        if (!cb.checked) allChecked = false;
    });
    
    // Si on va tout cocher → vérifier multi-clients
    if (!allChecked) {
        var data = window.filteredVentes || window.allVentesData || [];
        var pageData = getPageData('ventes', data);
        
        var clientsUniques = new Set();
        pageData.forEach(function(v) {
            clientsUniques.add(v.clientId || v.clientName || 'inconnu');
        });
        
        if (clientsUniques.size > 1) {
            var confirmer = confirm(
                '⚠️ SÉLECTION MULTI-CLIENTS\n\n' +
                'Cette page contient ' + clientsUniques.size + ' clients différents.\n\n' +
                '❓ Voulez-vous AUTORISER la sélection multi-clients ?\n\n' +
                '✅ OK = Oui, sélectionner TOUTES les ventes\n' +
                '❌ Annuler = Non, annuler'
            );
            
            if (!confirmer) return;
            
            window.venteSelectedClientId = 'MULTI';
            window.venteSelectedClientName = 'Plusieurs clients';
        } else if (pageData.length > 0) {
            window.venteSelectedClientId = pageData[0].clientId || pageData[0].clientName || null;
            window.venteSelectedClientName = pageData[0].clientName || 'Client inconnu';
        }
    } else {
        window.venteSelectedClientId = null;
        window.venteSelectedClientName = null;
    }
    
    checkboxes.forEach(function(cb) {
        cb.checked = !allChecked;
        var id = cb.getAttribute('data-id');
        if (cb.checked) {
            ventesSelectionnees.add(id);
        } else {
            ventesSelectionnees.delete(id);
        }
    });
    updateVenteSelectionUI();
}

function updateVenteSelectionUI() {
    var count = ventesSelectionnees.size;
    var btn = document.getElementById('deleteSelectedVentesBtn');
    var payerBtn = document.getElementById('payerSelectedVentesBtn');
    var selectAllBtn = document.getElementById('selectAllVentesBtn');
    var countDisplay = document.getElementById('selectedVentesCount');

    if (btn) {
        btn.style.display = count > 0 ? 'inline-block' : 'none';
        btn.textContent = '🗑️ Supprimer ' + count + ' vente(s)';
    }

    if (payerBtn) {
        var data = window.filteredVentes || window.allVentesData || [];
        var ventesImpayees = 0;
        var totalImpaye = 0;
        
        data.forEach(function(v) {
            if (ventesSelectionnees.has(v.id) && !v.paid) {
                ventesImpayees++;
                totalImpaye += v.remainingAmount || v.total || 0;
            }
        });
        
        if (count > 0 && ventesImpayees > 0) {
            payerBtn.style.display = 'inline-block';
            payerBtn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Payer ' + ventesImpayees + ' (' + totalImpaye.toFixed(2) + ' MAD)';
        } else {
            payerBtn.style.display = 'none';
        }
    }

    // ✅ MODIFIÉ : Afficher aussi le nom du client sélectionné
    if (countDisplay) {
        var clientLabel = '';
        if (window.venteSelectedClientName === 'Plusieurs clients') {
            clientLabel = ' - Multi-clients';
        } else if (window.venteSelectedClientName) {
            clientLabel = ' - ' + window.venteSelectedClientName.substring(0, 20);
        }
        countDisplay.textContent = count + ' sélectionnée(s)' + clientLabel;
        countDisplay.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (selectAllBtn) {
        var checkboxes = document.querySelectorAll('.vente-checkbox');
        var allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        selectAllBtn.textContent = allChecked ? '❌ Désélectionner tout' : '✅ Tout sélectionner';
    }
}

function toggleVenteSelectionMode() {
    window.venteSelectionMode = !window.venteSelectionMode;
    window.venteSelectedIds = [];
    
    // ✅ NOUVEAU : Réinitialiser le client verrouillé
    window.venteSelectedClientId = null;
    window.venteSelectedClientName = null;
    ventesSelectionnees.clear();
    
    var selectAllBtn = document.getElementById('selectAllVentesBtn');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
        selectAllBtn.style.background = '#4f46e5';
    }
    selectAllVentesBtnState = false;

    var selectBtn = document.getElementById('toggleVenteSelectionBtn');
    var deleteBtn = document.getElementById('deleteSelectedVentesBtn');
    var payerBtn = document.getElementById('payerSelectedVentesBtn');
    if (selectBtn) {
        if (window.venteSelectionMode) {
            selectBtn.innerHTML = '<i class="fas fa-times-circle"></i> Annuler';
        } else {
            selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
        }
    }
    if (selectAllBtn) {
        selectAllBtn.style.display = window.venteSelectionMode ? 'inline-block' : 'none';
    }
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
    if (payerBtn) {
        payerBtn.style.display = 'none';
    }
    renderVentesTablePro();
}

function selectAllVisibleVentes() {
    var data = window.filteredVentes || window.allVentesData;
    var pageData = getPageData('ventes', data);
    window.venteSelectedIds = pageData.map(function(d) { return d.id; });
    window.venteSelectedIds.forEach(function(id) {
        ventesSelectionnees.add(id);
    });
    updateVenteSelectionUI();
    renderVentesTablePro();
}

function deselectAllVisibleVentes() {
    window.venteSelectedIds = [];
    var ids = Array.from(ventesSelectionnees);
    ids.forEach(function(id) {
        ventesSelectionnees.delete(id);
    });
    window.venteSelectedClientId = null;
    window.venteSelectedClientName = null;
    updateVenteSelectionUI();
    renderVentesTablePro();
}

function toggleSelectAllVisibleVentes() {
    if (selectAllVentesBtnState) {
        deselectAllVisibleVentes();
    } else {
        selectAllVisibleVentes();
    }
    selectAllVentesBtnState = !selectAllVentesBtnState;
    var btn = document.getElementById('selectAllVentesBtn');
    if (btn) {
        if (selectAllVentesBtnState) {
            btn.innerHTML = '<i class="fas fa-times"></i> Tout décocher';
            btn.style.background = '#ef4444';
        } else {
            btn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
            btn.style.background = '#4f46e5';
        }
    }
}

async function deleteSelectedVentes() {
if (ventesSelectionnees.size === 0) {
alert('Aucune vente sélectionnée.');
return;
}

var count = ventesSelectionnees.size;
if (!confirm(`⚠️ Supprimer ${count} vente(s) sélectionnée(s) ? Cette action est IRRÉVERSIBLE.`)) return;

try {
var batch = db.batch();
var batchCount = 0;
var totalDeleted = 0;
var ids = Array.from(ventesSelectionnees);

for (var id of ids) {
var ref = db.collection('ventes').doc(id);
batch.delete(ref);
batchCount++;
totalDeleted++;

if (batchCount >= 500) {
await batch.commit();
console.log(`✅ ${totalDeleted} ventes supprimées...`);
batch = db.batch();
batchCount = 0;
}
}
if (batchCount > 0) {
await batch.commit();
}

ventesSelectionnees.clear();
window.venteSelectedClientId = null;
window.venteSelectedClientName = null;
alert(`✅ ${totalDeleted} vente(s) supprimée(s) !`);
loadVentes();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('ventes');
}

} catch(e) {
console.error('❌ Erreur :', e);
alert('❌ Erreur : ' + e.message);
}
}

// ========== FONCTIONS UTILITAIRES ==========
function escapeHtml(str) {
if (!str) return '';
return str.replace(/[&<>]/g, function(m) {
if (m === '&') return '&amp;';
if (m === '<') return '&lt;';
if (m === '>') return '&gt;';
return m;
});
}

function formatDateHeure(seconds) {
if (!seconds) return { date: '-', time: '-', full: '-' };
const d = new Date(seconds * 1000);
const date = d.toLocaleDateString('fr-FR', {
day: '2-digit',
month: '2-digit',
year: 'numeric'
});
const time = d.toLocaleTimeString('fr-FR', {
hour: '2-digit',
minute: '2-digit'
});
return { date, time, full: date + ' ' + time };
}

function detectPeriodFilterVentes(text) {
var cleaned = text.toLowerCase().trim();
if (cleaned.includes("aujourd'hui") || cleaned.includes("aujourd hui") || cleaned.includes("today") || cleaned.includes("ajourdhui") || cleaned.includes("aujourd")) {
return 'today';
}
if (cleaned.includes("ce mois") || cleaned.includes("cemois") || cleaned.includes("mois en cours") || cleaned.includes("ce mois ci") || cleaned.includes("mois")) {
return 'month';
}
if (cleaned.includes("cette semaine") || cleaned.includes("cettesemaine") || cleaned.includes("semaine") || cleaned.includes("7 jours") || cleaned.includes("7j") || cleaned.includes("sept jours")) {
return 'week';
}
if (cleaned.includes("cette année") || cleaned.includes("cetteannee") || cleaned.includes("cette annee") || cleaned.includes("annee") || cleaned.includes("année") || cleaned.includes("1 an") || cleaned.includes("1an")) {
return 'year';
}
if (cleaned.includes("tout") || cleaned.includes("toutes") || cleaned.includes("all") || cleaned.includes("tous") || cleaned.includes("toute les ventes") || cleaned.includes("tout les ventes")) {
return 'all';
}
return null;
}

async function loadClientsForSearch() {
try {
const snapshot = await db.collection('clients').limit(2000).get();
window.clientsDataForSearch = [];
snapshot.forEach(doc => {
var d = doc.data();
d.id = doc.id;
window.clientsDataForSearch.push(d);
});
console.log('📋 Clients chargés pour recherche description:', window.clientsDataForSearch.length);
} catch(e) {
console.warn('Erreur chargement clients pour recherche:', e);
window.clientsDataForSearch = [];
}
}

function filterVentesBySearchWithDescription(data, query) {
if (!query || query.trim() === '') return data;

var q = query.toLowerCase().trim();
var results = [];
var clientsMap = {};

window.clientsDataForSearch.forEach(function(c) {
clientsMap[c.id] = c;
});

data.forEach(function(vente) {
var match = false;
var clientInfo = null;

if (vente.clientName && vente.clientName.toLowerCase().indexOf(q) !== -1) {
match = true;
}

if (!match && vente.items) {
for (var i = 0; i < vente.items.length; i++) {
if (vente.items[i].nom && vente.items[i].nom.toLowerCase().indexOf(q) !== -1) {
match = true;
break;
}
}
}

if (!match && vente.clientId && clientsMap[vente.clientId]) {
var client = clientsMap[vente.clientId];
var description = client.description || '';
if (description.toLowerCase().indexOf(q) !== -1) {
match = true;
clientInfo = client;
}
}

if (!match && vente.clientName && !vente.clientId) {
for (var id in clientsMap) {
var c = clientsMap[id];
var fullName = (c.nom || '') + ' ' + (c.prenom || '');
if (fullName.trim().toLowerCase() === vente.clientName.toLowerCase()) {
var desc = c.description || '';
if (desc.toLowerCase().indexOf(q) !== -1) {
match = true;
clientInfo = c;
break;
}
}
}
}

if (match) {
if (clientInfo) {
vente._clientDisplayName = (clientInfo.nom || '') + ' ' + (clientInfo.prenom || '');
} else if (vente.clientId && clientsMap[vente.clientId]) {
var c = clientsMap[vente.clientId];
vente._clientDisplayName = (c.nom || '') + ' ' + (c.prenom || '');
} else {
vente._clientDisplayName = vente.clientName || vente.table || 'Client inconnu';
}
results.push(vente);
}
});

return results;
}

function renderFactureCell(vente) {
const factureNum = vente.factureNum || vente.id?.substring(0, 8) || '---';
return `
<div class="facture-cell">
<i class="fas fa-receipt"></i>
<span class="facture-number">#${factureNum}</span>
</div>
`;
}

function renderDateCell(vente) {
const dt = vente.createdAt ? formatDateHeure(vente.createdAt.seconds) : { date: '-', time: '-', full: '-' };
return `
<div class="date-cell">
<div class="date-line">
<i class="far fa-calendar-alt"></i>
<span>${dt.date}</span>
</div>
<div class="time-line">
<i class="far fa-clock"></i>
<span>${dt.time}</span>
</div>
</div>
`;
}

// ✅ Affiche la date de paiement (date + heure)
function renderDatePaiementCell(vente) {
    if (vente.datePaiement && vente.datePaiement.seconds) {
        const dt = formatDateHeure(vente.datePaiement.seconds);
        return `
<div class="date-cell" style="background:#ECFDF5;border-radius:6px;padding:4px 8px;border:1px solid #99F6E4;">
<div class="date-line" style="color:#065F46;">
<i class="fas fa-calendar-check" style="color:#10B981;"></i>
<span style="font-weight:700;">${dt.date}</span>
</div>
<div class="time-line" style="color:#065F46;">
<i class="far fa-clock" style="color:#10B981;"></i>
<span style="font-weight:600;">${dt.time}</span>
</div>
</div>
`;
    }
    return `<span style="color:#9ca3af;font-size:13px;">—</span>`;
}
window.renderDatePaiementCell = renderDatePaiementCell;

// ✅ MODIFIÉ : Nom du client CLIQUABLE → filtre automatique
function renderClientCell(vente) {
    var clientName = vente._clientDisplayName || vente.clientName || vente.table || 'Client inconnu';
    var escapedName = escapeHtml(clientName).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    return `
<div class="client-cell" onclick="filtrerVentesParClient('${escapedName}', event)" title="Cliquer pour filtrer par ce client" style="cursor:pointer;transition:all 0.2s ease;">
<i class="fas fa-user-circle"></i>
<span>${escapeHtml(clientName)}</span>
</div>
`;
}

function renderCommandeFactureCell(commande) {
const cmdId = commande.id?.substring(0, 8) || '---';
return `
<div class="facture-cell">
<i class="fas fa-shopping-basket"></i>
<span class="facture-number">#CMD-${cmdId}</span>
</div>
`;
}

// ✅ CSS MODERNE - Design PRO (identique à admin-credits)
function injectVentesStyles() {
const styleId = 'ventes-pro-styles-final';
if (document.getElementById(styleId)) return;

const styles = `
<style id="${styleId}">
#ventesPage, #commandesPage,
#ventesPage *, #commandesPage * {
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* ✅ Container principal */
#ventesPage, #commandesPage {
background: linear-gradient(180deg, #FAFBFC 0%, #F4F6F8 100%) !important;
padding: 20px !important;
border-radius: 16px !important;
}

/* ✅ Carte header */
#ventesPage .card-header,
#commandesPage .card-header {
background: #FFFFFF !important;
padding: 24px !important;
border-radius: 16px !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
margin-bottom: 20px !important;
}

#ventesPage .card-header h3,
#commandesPage .card-header h3 {
font-size: 24px !important;
font-weight: 800 !important;
color: #0F172A !important;
letter-spacing: -0.5px !important;
display: flex !important;
align-items: center !important;
gap: 10px !important;
margin: 0 !important;
}

#ventesPage .card-header h3 i,
#commandesPage .card-header h3 i {
background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
color: #fff !important;
padding: 8px !important;
border-radius: 10px !important;
font-size: 18px !important;
box-shadow: 0 4px 12px rgba(20,184,166,0.25) !important;
}

/* ✅ Statistiques en cartes modernes */
.ventes-stats-grid {
display: grid !important;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
gap: 16px !important;
margin-bottom: 20px !important;
padding: 0 !important;
background: transparent !important;
border: none !important;
}

.ventes-stat-card {
display: flex !important;
flex-direction: row !important;
align-items: center !important;
justify-content: flex-start !important;
gap: 16px !important;
padding: 20px !important;
background: #FFFFFF !important;
border-radius: 14px !important;
text-align: left !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
transition: all 0.25s ease !important;
position: relative !important;
overflow: hidden !important;
}

.ventes-stat-card::before {
content: '' !important;
position: absolute !important;
top: 0 !important;
left: 0 !important;
right: 0 !important;
height: 4px !important;
background: linear-gradient(90deg, #14B8A6, #0D9488) !important;
opacity: 0 !important;
transition: opacity 0.25s ease !important;
}

.ventes-stat-card:hover {
transform: translateY(-3px) !important;
box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.06) !important;
}

.ventes-stat-card:hover::before {
opacity: 1 !important;
}

.ventes-stat-card .stat-value {
font-size: 24px !important;
font-weight: 800 !important;
color: #0F172A !important;
letter-spacing: -0.5px !important;
display: block !important;
line-height: 1.2 !important;
margin: 0 !important;
}

.ventes-stat-card .stat-value.green { color: #10B981 !important; }
.ventes-stat-card .stat-value.blue { color: #3B82F6 !important; }
.ventes-stat-card .stat-value.orange { color: #F59E0B !important; }
.ventes-stat-card .stat-value.red { color: #EF4444 !important; }

.ventes-stat-card .stat-label {
font-size: 12px !important;
font-weight: 600 !important;
color: #64748B !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
margin: 4px 0 0 0 !important;
display: block !important;
}

/* 🆕 Graphique container */
#ventesChartContainer {
background: #FFFFFF !important;
border-radius: 14px !important;
padding: 20px !important;
margin-bottom: 20px !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
}

#ventesChartHeader {
display: flex !important;
justify-content: space-between !important;
align-items: center !important;
gap: 12px !important;
margin-bottom: 16px !important;
flex-wrap: wrap !important;
}

#ventesChartHeader h4 {
font-size: 16px !important;
font-weight: 700 !important;
color: #0F172A !important;
margin: 0 !important;
display: flex !important;
align-items: center !important;
gap: 8px !important;
}

#ventesChartHeader h4 i {
color: #14B8A6 !important;
}

#toggleVentesChartBtn {
background: #F1F5F9 !important;
color: #475569 !important;
border: 1.5px solid #E2E8F0 !important;
border-radius: 10px !important;
padding: 8px 16px !important;
font-size: 13px !important;
font-weight: 600 !important;
cursor: pointer !important;
transition: all 0.2s ease !important;
display: inline-flex !important;
align-items: center !important;
gap: 6px !important;
}

#toggleVentesChartBtn:hover {
background: #E2E8F0 !important;
border-color: #CBD5E1 !important;
transform: translateY(-1px) !important;
}

#ventesChartBody {
transition: all 0.3s ease !important;
}

#ventesChartBody.hidden {
display: none !important;
}

#ventesChartCanvas {
max-height: 320px !important;
}

/* ✅ Barre de recherche moderne */
.search-bar-pro {
display: flex !important;
align-items: center !important;
gap: 8px !important;
background: #FFFFFF !important;
border: 1.5px solid #E2E8F0 !important;
border-radius: 12px !important;
padding: 4px 4px 4px 16px !important;
transition: all 0.2s ease !important;
flex: 1 !important;
min-width: 240px !important;
position: relative !important;
box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
}

.search-bar-pro:focus-within {
border-color: #14B8A6 !important;
box-shadow: 0 0 0 4px rgba(20,184,166,0.1) !important;
}

.search-bar-pro i.fa-search {
color: #94A3B8 !important;
font-size: 16px !important;
}

.search-bar-pro input {
flex: 1 !important;
border: none !important;
background: transparent !important;
padding: 10px 8px !important;
font-size: 15px !important;
font-family: 'Inter', sans-serif !important;
outline: none !important;
color: #0F172A !important;
min-width: 100px !important;
}

.search-bar-pro input::placeholder {
color: #94A3B8 !important;
font-weight: 400 !important;
font-size: 14px !important;
}

.search-clear-btn {
width: 30px !important;
height: 30px !important;
min-width: 30px !important;
border-radius: 50% !important;
border: none !important;
background: #F1F5F9 !important;
color: #64748B !important;
font-size: 14px !important;
cursor: pointer !important;
display: flex !important;
align-items: center !important;
justify-content: center !important;
transition: all 0.2s ease !important;
padding: 0 !important;
margin: 0 2px !important;
}

.search-clear-btn:hover {
background: #E2E8F0 !important;
color: #0F172A !important;
transform: scale(1.05) !important;
}

.search-clear-btn.hidden {
display: none !important;
}

/* ✅ Filtres et select modernes */
#ventesPage .filter-group label,
#commandesPage .filter-group label {
font-size: 12px !important;
font-weight: 600 !important;
color: #64748B !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
}

#ventesPage .filter-group select,
#commandesPage .filter-group select {
padding: 10px 14px !important;
border: 1.5px solid #E2E8F0 !important;
border-radius: 10px !important;
font-size: 14px !important;
font-family: 'Inter', sans-serif !important;
background: #FFFFFF !important;
color: #0F172A !important;
transition: all 0.2s ease !important;
min-width: 140px !important;
font-weight: 500 !important;
cursor: pointer !important;
box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
}

#ventesPage .filter-group select:hover,
#commandesPage .filter-group select:hover {
border-color: #CBD5E1 !important;
}

#ventesPage .filter-group select:focus,
#commandesPage .filter-group select:focus {
border-color: #14B8A6 !important;
outline: none !important;
box-shadow: 0 0 0 4px rgba(20,184,166,0.1) !important;
}

/* ✅ Boutons principaux */
#ventesPage .btn-add,
#commandesPage .btn-add {
padding: 10px 18px !important;
border: none !important;
border-radius: 10px !important;
font-size: 14px !important;
font-weight: 600 !important;
cursor: pointer !important;
transition: all 0.2s ease !important;
background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
color: #FFFFFF !important;
box-shadow: 0 2px 8px rgba(20,184,166,0.25) !important;
display: inline-flex !important;
align-items: center !important;
gap: 6px !important;
}

#ventesPage .btn-add:hover,
#commandesPage .btn-add:hover {
transform: translateY(-2px) !important;
box-shadow: 0 4px 12px rgba(20,184,166,0.35) !important;
}

/* ✅ Table moderne */
#ventesPage .table-container,
#commandesPage .table-container {
background: #FFFFFF !important;
border-radius: 14px !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
overflow-x: auto !important;
overflow-y: auto !important;
max-height: 75vh !important;
-webkit-overflow-scrolling: touch !important;
}

#ventesPage .data-table,
#commandesPage .data-table {
width: 100% !important;
border-collapse: separate !important;
border-spacing: 0 !important;
min-width: 1400px !important;
font-size: 14px !important;
}

#ventesPage .data-table thead th,
#commandesPage .data-table thead th {
font-size: 12px !important;
padding: 16px 18px !important;
background: #F8FAFC !important;
color: #64748B !important;
font-weight: 700 !important;
text-transform: uppercase !important;
letter-spacing: 0.6px !important;
border-bottom: 1.5px solid #E2E8F0 !important;
white-space: nowrap !important;
position: sticky !important;
top: 0 !important;
z-index: 2 !important;
}

#ventesPage .data-table thead th i,
#commandesPage .data-table thead th i {
font-size: 13px !important;
margin-right: 6px !important;
color: #94A3B8 !important;
}

#ventesPage .data-table tbody td,
#commandesPage .data-table tbody td {
padding: 16px 18px !important;
font-size: 14px !important;
vertical-align: middle !important;
background: #FFFFFF !important;
border-bottom: 1px solid #F1F5F9 !important;
color: #334155 !important;
}

#ventesPage .data-table tbody tr,
#commandesPage .data-table tbody tr {
transition: background 0.15s ease !important;
}

#ventesPage .data-table tbody tr:hover td,
#commandesPage .data-table tbody tr:hover td {
background: #FAFBFC !important;
}

#ventesPage .data-table tbody tr:last-child td,
#commandesPage .data-table tbody tr:last-child td {
border-bottom: none !important;
}

/* ✅ Badge de facture */
.facture-cell {
display: inline-flex !important;
align-items: center !important;
gap: 8px !important;
font-weight: 700 !important;
font-size: 13px !important;
color: #0F172A !important;
padding: 6px 12px !important;
border-radius: 8px !important;
background: linear-gradient(135deg, #F0FDFA, #CCFBF1) !important;
border: 1px solid #99F6E4 !important;
transition: all 0.2s ease !important;
}

.facture-cell:hover {
transform: translateY(-1px) !important;
box-shadow: 0 4px 8px rgba(20,184,166,0.15) !important;
}

.facture-cell i {
color: #0D9488 !important;
font-size: 13px !important;
}

.facture-cell .facture-number {
color: #0F172A !important;
font-weight: 800 !important;
font-size: 13px !important;
}

/* ✅ Cellule date */
.date-cell {
display: flex !important;
flex-direction: column !important;
gap: 3px !important;
}

.date-cell .date-line,
.date-cell .time-line {
display: flex !important;
align-items: center !important;
gap: 6px !important;
font-size: 13px !important;
color: #64748B !important;
font-weight: 500 !important;
}

.date-cell .date-line i,
.date-cell .time-line i {
font-size: 11px !important;
color: #14B8A6 !important;
opacity: 0.8 !important;
width: 14px !important;
}

/* ✅ Cellule client */
.client-cell {
display: inline-flex !important;
align-items: center !important;
gap: 8px !important;
font-weight: 600 !important;
font-size: 13px !important;
color: #0F172A !important;
background: linear-gradient(135deg, #F8FAFC, #F1F5F9) !important;
padding: 6px 12px !important;
border-radius: 8px !important;
border: 1px solid #E2E8F0 !important;
transition: all 0.2s ease !important;
}

.client-cell i {
color: #14B8A6 !important;
font-size: 13px !important;
transition: color 0.2s ease !important;
}

/* ✅ ✅ ✅ Client cliquable - HOVER VIOLET */
.client-cell:hover {
    background: linear-gradient(135deg, #EDE9FE, #DDD6FE) !important;
    border-color: #A78BFA !important;
    color: #6D28D9 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(139,92,246,0.15) !important;
}
.client-cell:active {
    transform: translateY(0) scale(0.98) !important;
}
.client-cell:hover i {
    color: #6D28D9 !important;
}

/* ✅ Montants */
.amount-total {
font-weight: 700 !important;
font-size: 14px !important;
color: #0F172A !important;
letter-spacing: -0.2px !important;
}

.amount-remaining {
font-weight: 700 !important;
font-size: 14px !important;
color: #EF4444 !important;
letter-spacing: -0.2px !important;
}

/* ✅ Statuts */
#ventesPage .status-success,
#ventesPage .status-warning,
#ventesPage .status-danger,
#commandesPage .status-success,
#commandesPage .status-warning,
#commandesPage .status-danger {
font-size: 12px !important;
padding: 4px 10px !important;
border-radius: 6px !important;
font-weight: 600 !important;
display: inline-flex !important;
align-items: center !important;
gap: 4px !important;
}

/* ✅ Boutons d'action (design moderne identique admin-credits) */
#ventesPage .action-buttons,
#commandesPage .action-buttons {
display: flex !important;
align-items: center !important;
justify-content: center !important;
gap: 4px !important;
flex-wrap: nowrap !important;
min-width: 160px !important;
}

#ventesPage .action-buttons .btn-print,
#ventesPage .action-buttons .btn-whatsapp,
#ventesPage .action-buttons .btn-payer,
#ventesPage .action-buttons .btn-edit,
#ventesPage .action-buttons .btn-delete,
#commandesPage .action-buttons .btn-print,
#commandesPage .action-buttons .btn-whatsapp,
#commandesPage .action-buttons .btn-payer,
#commandesPage .action-buttons .btn-edit,
#commandesPage .action-buttons .btn-delete {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 10px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    border-radius: 6px !important;
    border: none !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    white-space: nowrap !important;
    visibility: visible !important;
    opacity: 1 !important;
    line-height: 1.2 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
    min-height: 26px !important;
    width: auto !important;
}

/* 🖨️ Imprimer — Indigo doux */
#ventesPage .action-buttons .btn-print,
#commandesPage .action-buttons .btn-print {
    background: #EEF2FF !important;
    color: #4F46E5 !important;
}
#ventesPage .action-buttons .btn-print:hover,
#commandesPage .action-buttons .btn-print:hover {
    background: #4F46E5 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* 📱 WhatsApp — Vert clair */
#ventesPage .action-buttons .btn-whatsapp,
#commandesPage .action-buttons .btn-whatsapp {
    background: #ECFDF5 !important;
    color: #059669 !important;
}
#ventesPage .action-buttons .btn-whatsapp:hover,
#commandesPage .action-buttons .btn-whatsapp:hover {
    background: #25D366 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* 💰 Payer — Vert doux */
#ventesPage .action-buttons .btn-payer,
#commandesPage .action-buttons .btn-payer {
    background: #F0FDF4 !important;
    color: #16A34A !important;
}
#ventesPage .action-buttons .btn-payer:hover,
#commandesPage .action-buttons .btn-payer:hover {
    background: #10B981 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* ✏️ Modifier — Orange doux */
#ventesPage .action-buttons .btn-edit,
#commandesPage .action-buttons .btn-edit {
    background: #FFF7ED !important;
    color: #EA580C !important;
}
#ventesPage .action-buttons .btn-edit:hover,
#commandesPage .action-buttons .btn-edit:hover {
    background: #F59E0B !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* 🗑️ Supprimer — Rouge doux */
#ventesPage .action-buttons .btn-delete,
#commandesPage .action-buttons .btn-delete {
    background: #FEF2F2 !important;
    color: #DC2626 !important;
}
#ventesPage .action-buttons .btn-delete:hover,
#commandesPage .action-buttons .btn-delete:hover {
    background: #EF4444 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* ✅ Boutons spéciaux commandes */
#commandesPage .action-buttons .btn-add.validate-btn {
    background: #EEF2FF !important;
    color: #4F46E5 !important;
}
#commandesPage .action-buttons .btn-add.validate-btn:hover {
    background: #4F46E5 !important;
    color: #fff !important;
}

#commandesPage .action-buttons .btn-delete.cancel-btn {
    background: #FEF2F2 !important;
    color: #DC2626 !important;
}
#commandesPage .action-buttons .btn-delete.cancel-btn:hover {
    background: #EF4444 !important;
    color: #fff !important;
}

/* ✅ Total des ventes/commandes */
#ventesPage .total-row-pro,
#commandesPage .total-row-pro {
display: flex !important;
justify-content: flex-end !important;
align-items: center !important;
gap: 16px !important;
padding: 18px 24px !important;
background: linear-gradient(135deg, #F0FDFA, #CCFBF1) !important;
border-radius: 12px !important;
margin-top: 16px !important;
border: 1px solid #99F6E4 !important;
flex-wrap: wrap !important;
}

#ventesPage .total-row-pro .total-label,
#commandesPage .total-row-pro .total-label {
font-size: 13px !important;
font-weight: 700 !important;
color: #0F766E !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
}

#ventesPage .total-row-pro .total-amount,
#commandesPage .total-row-pro .total-amount {
font-size: 20px !important;
font-weight: 800 !important;
color: #0D9488 !important;
letter-spacing: -0.5px !important;
display: flex !important;
align-items: center !important;
gap: 8px !important;
}

#ventesPage .total-row-pro .total-amount i,
#commandesPage .total-row-pro .total-amount i {
color: #14B8A6 !important;
font-size: 16px !important;
}

/* ✅ Boutons sélection en masse */
#selectedVentesCount {
font-size: 12px !important;
color: #64748b !important;
display: none;
font-weight: 600 !important;
padding: 4px 12px !important;
background: #f1f5f9 !important;
border-radius: 20px !important;
}

#selectAllVentesBtn {
font-size: 14px !important;
padding: 10px 18px !important;
background: #4f46e5 !important;
color: #fff !important;
border: none !important;
border-radius: 10px !important;
cursor: pointer !important;
display: none;
transition: all 0.2s !important;
font-weight: 600 !important;
}

#selectAllVentesBtn:hover {
background: #4338ca !important;
transform: translateY(-2px) !important;
}

#deleteSelectedVentesBtn {
font-size: 14px !important;
padding: 10px 18px !important;
background: #FEF2F2 !important;
color: #DC2626 !important;
border: none !important;
border-radius: 10px !important;
cursor: pointer !important;
display: none;
transition: all 0.2s !important;
font-weight: 600 !important;
}

#deleteSelectedVentesBtn:hover {
background: #EF4444 !important;
color: #fff !important;
transform: translateY(-2px) !important;
}

/* ✅ Filtres de date personnalisés */
.date-filter-group {
display: flex !important;
align-items: center !important;
gap: 8px !important;
flex-wrap: wrap !important;
}

.date-filter-group input[type="date"] {
padding: 10px 14px !important;
border: 1.5px solid #E2E8F0 !important;
border-radius: 10px !important;
font-size: 14px !important;
font-family: 'Inter', sans-serif !important;
background: #FFFFFF !important;
color: #0F172A !important;
min-width: 140px !important;
transition: all 0.2s ease !important;
}

.date-filter-group input[type="date"]:focus {
border-color: #14B8A6 !important;
outline: none !important;
box-shadow: 0 0 0 4px rgba(20,184,166,0.1) !important;
}

.date-filter-group .btn-filter {
padding: 10px 18px !important;
background: #3B82F6 !important;
color: #fff !important;
border: none !important;
border-radius: 10px !important;
font-size: 14px !important;
font-weight: 600 !important;
cursor: pointer !important;
transition: all 0.2s !important;
display: inline-flex !important;
align-items: center !important;
gap: 6px !important;
}

.date-filter-group .btn-filter:hover {
background: #2563EB !important;
transform: translateY(-2px) !important;
}

.date-filter-group .btn-clear-filter {
padding: 10px 18px !important;
background: #FEF2F2 !important;
color: #DC2626 !important;
border: none !important;
border-radius: 10px !important;
font-size: 14px !important;
font-weight: 600 !important;
cursor: pointer !important;
transition: all 0.2s !important;
display: inline-flex !important;
align-items: center !important;
gap: 6px !important;
}

.date-filter-group .btn-clear-filter:hover {
background: #EF4444 !important;
color: #fff !important;
transform: translateY(-2px) !important;
}

/* ✅ Champ voix */
.voice-display-field {
padding: 10px 14px !important;
border: 1.5px solid #14B8A6 !important;
border-radius: 10px !important;
width: 180px !important;
background: #f0fdf4 !important;
color: #0D9488 !important;
font-weight: 600 !important;
font-size: 14px !important;
min-height: 42px !important;
outline: none !important;
}

/* ✅ Responsive */
@media(max-width:768px) {
    #ventesPage, #commandesPage {
        padding: 12px !important;
    }
    
    #ventesPage .card-header,
    #commandesPage .card-header {
        padding: 16px !important;
    }
    
    .ventes-stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
    }
    
    .ventes-stat-card {
        padding: 14px !important;
    }
    
    .ventes-stat-card .stat-value {
        font-size: 18px !important;
    }

    #ventesChartContainer {
        padding: 14px !important;
    }
    #ventesChartCanvas {
        max-height: 250px !important;
    }
    
    #ventesPage .data-table thead th,
    #ventesPage .data-table tbody td,
    #commandesPage .data-table thead th,
    #commandesPage .data-table tbody td {
        padding: 12px 10px !important;
        font-size: 12px !important;
    }
    
    #ventesPage .action-buttons .btn-print,
    #ventesPage .action-buttons .btn-whatsapp,
    #ventesPage .action-buttons .btn-payer,
    #ventesPage .action-buttons .btn-edit,
    #ventesPage .action-buttons .btn-delete,
    #commandesPage .action-buttons .btn-print,
    #commandesPage .action-buttons .btn-whatsapp,
    #commandesPage .action-buttons .btn-payer,
    #commandesPage .action-buttons .btn-edit,
    #commandesPage .action-buttons .btn-delete {
        padding: 4px 8px !important;
        font-size: 10px !important;
        min-height: 24px !important;
    }
    
    .date-filter-group input[type="date"] {
        min-width: 100px !important;
        font-size: 13px !important;
        padding: 8px 10px !important;
    }
    
    .date-filter-group .btn-filter,
    .date-filter-group .btn-clear-filter {
        padding: 8px 14px !important;
        font-size: 13px !important;
    }
}

@media(max-width:500px) {
    .ventes-stats-grid {
        grid-template-columns: 1fr !important;
    }

    #ventesChartCanvas {
        max-height: 200px !important;
    }
    
    .date-filter-group input[type="date"] {
        min-width: 80px !important;
        font-size: 12px !important;
        padding: 6px 8px !important;
    }
    
    .date-filter-group .btn-filter,
    .date-filter-group .btn-clear-filter {
        padding: 6px 10px !important;
        font-size: 12px !important;
    }

    #ventesChartHeader {
        flex-direction: column !important;
        align-items: flex-start !important;
    }
    #toggleVentesChartBtn {
        width: 100% !important;
        justify-content: center !important;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);
}

// 🆕 ==================== GRAPHIQUE DES VENTES ====================
function renderVentesChart(data) {
    var canvas = document.getElementById('ventesChartCanvas');
    if (!canvas) return;
    
    // 🆕 Ne pas générer si masqué
    if (!window._ventesChartVisible) return;
    
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js non chargé');
        return;
    }
    
    // Détruire l'ancien graphique
    if (window._ventesChart) {
        try { window._ventesChart.destroy(); } catch(e) {}
        window._ventesChart = null;
    }
    
    // Déterminer la granularité selon la période
    var period = window.ventesPeriod || 'all';
    var dateDebut = window.ventesDateDebut;
    var dateFin = window.ventesDateFin;
    var granularity = 'day'; // hour, day, month
    
    var nbJours = 0;
    if (dateDebut && dateFin) {
        nbJours = Math.ceil((new Date(dateFin) - new Date(dateDebut)) / 86400000) + 1;
    } else if (period === 'today') {
        nbJours = 1;
    } else if (period === '3' || period === '7' || period === '15') {
        nbJours = parseInt(period);
    } else if (period === '30') {
        nbJours = 30;
    } else if (period === '90') {
        nbJours = 90;
    } else if (period === '365') {
        nbJours = 365;
    } else {
        nbJours = 30; // par défaut
    }
    
    if (nbJours <= 1) {
        granularity = 'hour';
    } else if (nbJours <= 31) {
        granularity = 'day';
    } else {
        granularity = 'month';
    }
    
    // Construire les buckets
    var buckets = {}; // key -> {ca, profit, credits, label}
    var sortedKeys = [];
    
    function getKeyAndLabel(dateObj) {
        if (granularity === 'hour') {
            var h = dateObj.getHours();
            var key = 'h' + h;
            return { key: key, label: String(h).padStart(2, '0') + 'h' };
        } else if (granularity === 'day') {
            var key = dateObj.getFullYear() + '-' + String(dateObj.getMonth()+1).padStart(2,'0') + '-' + String(dateObj.getDate()).padStart(2,'0');
            var label = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            return { key: key, label: label };
        } else {
            var key = dateObj.getFullYear() + '-' + String(dateObj.getMonth()+1).padStart(2,'0');
            var label = dateObj.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            return { key: key, label: label };
        }
    }
    
    // Initialiser les buckets (pour afficher tous les points même vides)
    var now = new Date();
    if (granularity === 'hour') {
        for (var h = 0; h < 24; h++) {
            var key = 'h' + h;
            buckets[key] = { ca: 0, profit: 0, credits: 0, label: String(h).padStart(2,'0') + 'h' };
            sortedKeys.push(key);
        }
    } else if (granularity === 'day') {
        var start, end;
        if (dateDebut && dateFin) {
            start = new Date(dateDebut); end = new Date(dateFin);
        } else if (period === 'today') {
            start = new Date(); end = new Date();
        } else {
            var days = parseInt(period) || 30;
            if (isNaN(days) || days < 1) days = 30;
            end = new Date();
            start = new Date(now.getTime() - (days - 1) * 86400000);
        }
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        var cur = new Date(start);
        while (cur <= end) {
            var kl = getKeyAndLabel(cur);
            buckets[kl.key] = { ca: 0, profit: 0, credits: 0, label: kl.label };
            sortedKeys.push(kl.key);
            cur.setDate(cur.getDate() + 1);
        }
    } else {
        var startM, endM;
        if (dateDebut && dateFin) {
            startM = new Date(dateDebut); endM = new Date(dateFin);
        } else {
            var days2 = parseInt(period) || 365;
            if (isNaN(days2) || days2 < 1) days2 = 365;
            endM = new Date();
            startM = new Date(now.getTime() - (days2 - 1) * 86400000);
        }
        var curM = new Date(startM.getFullYear(), startM.getMonth(), 1);
        var lastM = new Date(endM.getFullYear(), endM.getMonth(), 1);
        while (curM <= lastM) {
            var klm = getKeyAndLabel(curM);
            buckets[klm.key] = { ca: 0, profit: 0, credits: 0, label: klm.label };
            sortedKeys.push(klm.key);
            curM.setMonth(curM.getMonth() + 1);
        }
    }
    
    // Remplir les données
    (data || []).forEach(function(v) {
        if (!v.createdAt || !v.createdAt.seconds) return;
        var d = new Date(v.createdAt.seconds * 1000);
        var kl = getKeyAndLabel(d);
        if (!buckets[kl.key]) return;
        buckets[kl.key].ca += (v.total || 0);
        buckets[kl.key].profit += (v.profit || 0);
        if (!v.paid) {
            buckets[kl.key].credits += (v.remainingAmount || v.total || 0);
        }
    });
    
    // Préparer les séries
    var labels = sortedKeys.map(function(k) { return buckets[k].label; });
    var caData = sortedKeys.map(function(k) { return parseFloat(buckets[k].ca.toFixed(2)); });
    var profitData = sortedKeys.map(function(k) { return parseFloat(buckets[k].profit.toFixed(2)); });
    var creditsData = sortedKeys.map(function(k) { return parseFloat(buckets[k].credits.toFixed(2)); });
    
    // Créer le graphique
    var ctx = canvas.getContext('2d');
    window._ventesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '💰 CA',
                    data: caData,
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '📈 Profit',
                    data: profitData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10B981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '💳 Crédits impayés',
                    data: creditsData,
                    backgroundColor: 'rgba(239, 68, 68, 0.75)',
                    borderColor: '#EF4444',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Inter', size: 13, weight: '600' },
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleFont: { family: 'Inter', size: 13, weight: '700' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            var label = context.dataset.label || '';
                            var val = context.parsed.y || 0;
                            return label + ' : ' + val.toFixed(2) + ' MAD';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: '#64748B',
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: granularity === 'hour' ? 24 : 20
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.5)' },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: '#64748B',
                        callback: function(val) { return val + ' MAD'; }
                    }
                }
            }
        }
    });
}
window.renderVentesChart = renderVentesChart;

// 🆕 ==================== BOUTON AFFICHER/MASQUER LE GRAPHIQUE ====================
function toggleVentesChart() {
    var body = document.getElementById('ventesChartBody');
    var btn = document.getElementById('toggleVentesChartBtn');
    if (!body || !btn) return;
    
    if (window._ventesChartVisible) {
        // Masquer
        body.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-eye"></i> Afficher';
        window._ventesChartVisible = false;
        localStorage.setItem('ventesChartVisible', 'false');
    } else {
        // Afficher
        body.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Masquer';
        window._ventesChartVisible = true;
        localStorage.setItem('ventesChartVisible', 'true');
        // Regénérer le graphique à l'affichage
        setTimeout(function() {
            try { renderVentesChart(window.filteredVentes || window.allVentesData || []); } catch(e) { console.warn(e); }
        }, 50);
    }
}
window.toggleVentesChart = toggleVentesChart;

// ==================== COMMANDES EN LIGNE ====================
function loadCommandesPage(c) {
injectVentesStyles();

c.innerHTML = `
<div class="content-card" id="commandesPage">
<div class="card-header">
<h3><i class="fas fa-shopping-basket"></i> Commandes en ligne</h3>
<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px;">
<div class="search-bar-pro">
<i class="fas fa-search"></i>
<input type="text" id="commandesSearchInput"
placeholder="Rechercher (client, email, tél, produit)..."
onkeyup="window.commandesSearch = this.value; window.currentPages.commandes=1; handleSearchInput('commandes'); applyCommandesFilters();">
<button class="search-clear-btn hidden" id="commandesClearBtn" onclick="clearSearch('commandes')" title="Effacer la recherche">
<i class="fas fa-times"></i>
</button>
</div>
<div class="filter-group">
<label><i class="far fa-calendar-alt"></i> Période</label>
<select id="commandesPeriodSelect" onchange="window.commandesPeriod = this.value; window.currentPages.commandes=1; applyCommandesFilters();">
${getPeriodOptions('all')}
</select>
</div>
<button class="btn-add" onclick="loadCommandes()">
<i class="fas fa-sync-alt"></i> Actualiser
</button>
</div>
</div>
<div id="commandesTableContainer"></div>
<div id="commandesPagination" style="margin-top:12px;"></div>
</div>
`;
loadCommandes();
}

async function loadCommandes() {
try {
const snapshot = await db.collection('commandes').orderBy('createdAt', 'desc').limit(500).get();
window.allCommandesData = [];
snapshot.forEach(dc => {
var d = dc.data();
d.id = dc.id;
if (d.source === 'client') window.allCommandesData.push(d);
});
} catch (e) {
console.error('Erreur chargement commandes en ligne :', e);
const fallback = await db.collection('commandes').get();
window.allCommandesData = [];
fallback.forEach(dc => {
var d = dc.data();
if (d.source === 'client') {
d.id = dc.id;
window.allCommandesData.push(d);
}
});
window.allCommandesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
window.currentPages.commandes = 1;
applyCommandesFilters();
}

function applyCommandesFilters() {
var filtered = filterByPeriod(window.allCommandesData, window.commandesPeriod);
filtered = filterBySearch(filtered, window.commandesSearch, ['clientName', 'clientEmail', 'clientTelephone', 'items.nom']);
if (!window.sortOrders.commandes || !window.sortOrders.commandes.createdAt) {
filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
} else {
filtered = applySort('commandes', filtered, 'createdAt');
}
window.filteredCommandes = filtered;
renderCommandesTablePro();
}

function renderCommandesTablePro() {
var cont = document.getElementById('commandesTableContainer');
if (!cont) return;
var data = (window.filteredCommandes || window.allCommandesData).slice();
if (!window.sortOrders.commandes || !window.sortOrders.commandes.createdAt) {
data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
} else {
data = applySort('commandes', data, 'createdAt');
}
var itemsPerPage = window.itemsPerPage || 15;
var currentPage = window.currentPages.commandes || 1;
var start = (currentPage - 1) * itemsPerPage;
var pageData = data.slice(start, start + itemsPerPage);

if (pageData.length === 0) {
cont.innerHTML = `
<div style="text-align:center;padding:60px 20px;">
<i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
<p style="margin-top:16px;color:#6b7280;font-size:18px !important;">Aucune commande trouvée</p>
</div>
`;
document.getElementById('commandesPagination').innerHTML = '';
return;
}

var h = `
<div class="table-container">
<table class="data-table">
<thead>
<tr>
<th style="min-width:160px;"><i class="fas fa-receipt"></i> Facture</th>
<th style="min-width:150px;"><i class="far fa-calendar-alt"></i> Date / Heure</th>
<th style="min-width:180px;"><i class="fas fa-user"></i> Client</th>
<th><i class="fas fa-envelope"></i> Email</th>
<th><i class="fas fa-phone"></i> Tél</th>
<th><i class="fas fa-box"></i> Articles</th>
<th><i class="fas fa-cog"></i> Options</th>
${makeSortableHeader('commandes', 'total', '💰 Total', 'renderCommandesTablePro')}
${makeSortableHeader('commandes', 'statut', '📌 Statut', 'renderCommandesTablePro')}
<th style="min-width:200px;"><i class="fas fa-tools"></i> Actions</th>
</tr>
</thead>
<tbody>
`;

pageData.forEach(function(d) {
const factureHtml = renderCommandeFactureCell(d);
const dt = d.createdAt ? formatDateHeure(d.createdAt.seconds) : { date: '-', time: '-', full: '-' };
const dateHtml = `
<div class="date-cell">
<div class="date-line"><i class="far fa-calendar-alt"></i> ${dt.date}</div>
<div class="time-line"><i class="far fa-clock"></i> ${dt.time}</div>
</div>
`;
const clientHtml = `
<div class="client-cell">
<i class="fas fa-user-circle"></i> ${escapeHtml(d.clientName || 'Client inconnu')}
</div>
`;
var arts = d.items ? d.items.map(function(it) {
return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom);
}).join('<br>') : '-';

var opts = d.items ? d.items.map(function(it) {
var o = [];
if (it.sauces && it.sauces.length) o.push('<span style="color:#14B8A6;">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
if (it.interdits && it.interdits.length) o.push('<span style="color:#ef4444;">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
if (it.epice && it.epice !== 'Normal') o.push('<span style="color:#d97706;">🌶️' + escapeHtml(it.epice) + '</span>');
if (it.sel && it.sel !== 'Normal') o.push('<span style="color:#4f46e5;">🧂' + escapeHtml(it.sel) + '</span>');
return o.length ? o.join(' | ') : '<span style="color:#9ca3af;">Aucune option</span>';
}).join('<br>') : '-';

var statutMap = {
'payé': { class: 'status-success', label: 'Payée', icon: 'fa-check-circle' },
'valide': { class: 'status-success', label: 'Validée', icon: 'fa-check' },
'en_attente': { class: 'status-warning', label: 'En attente', icon: 'fa-clock' },
'annule': { class: 'status-danger', label: 'Annulée', icon: 'fa-times-circle' }
};
var st = statutMap[d.statut] || { class: 'status-warning', label: d.statut || 'Inconnu', icon: 'fa-question-circle' };

var act = '';
if (d.statut === 'en_attente') {
act = `
<div class="action-buttons">
<button class="btn-add validate-btn" onclick="validateCommande('${d.id}')" title="Valider">Valider</button>
<button class="btn-payer" onclick="payCommande('${d.id}')" title="Payer">Payer</button>
<button class="btn-delete cancel-btn" onclick="cancelCommande('${d.id}')" title="Annuler">Annuler</button>
</div>
`;
} else if (d.statut === 'valide') {
act = `
<div class="action-buttons">
<button class="btn-payer" onclick="payCommande('${d.id}')" title="Payer">Payer</button>
</div>
`;
} else if (d.statut === 'payé') {
act = `<span style="color:#10B981;font-weight:600;font-size:13px !important;"><i class="fas fa-check-circle"></i> Payée</span>`;
} else {
act = `<span style="color:#9ca3af;">${d.statut || '-'}</span>`;
}

h += `
<tr>
<td>${factureHtml}</td>
<td>${dateHtml}</td>
<td>${clientHtml}</td>
<td>${escapeHtml(d.clientEmail || '-')}</td>
<td>${escapeHtml(d.clientTelephone || '-')}</td>
<td>${arts}</td>
<td>${opts}</td>
<td><span class="amount-total">${d.total.toFixed(2)} MAD</span></td>
<td><span class="${st.class}"><i class="fas ${st.icon}"></i> ${st.label}</span></td>
<td>${act}</td>
</tr>
`;
});

h += `
</tbody>
</table>
</div>
<div class="total-row-pro">
<span class="total-label">Total des commandes</span>
<span class="total-amount"><i class="fas fa-dollar-sign"></i> ${data.reduce((sum, d) => sum + (d.total || 0), 0).toFixed(2)} MAD</span>
</div>
`;
cont.innerHTML = h;
document.getElementById('commandesPagination').innerHTML = getPaginationHTML('commandes', data.length);
}

async function validateCommande(cid) {
if (!confirm('Valider cette commande ?')) return;
await CacheDB.write('commandes', cid, {
statut: 'valide',
validatedAt: firebase.firestore.FieldValue.serverTimestamp(),
validatedBy: window.currentUserData ? window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom : 'Admin'
}, 'update');
alert('✅ Validée !');
loadCommandes();
CacheDB.sync();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('commandes');
}
}

async function payCommande(cid) {
if (!confirm('Payer cette commande ? Redirection vers le POS...')) return;
var dc = await db.collection('commandes').doc(cid).get();
if (!dc.exists) { alert('Introuvable'); return; }
var cmd = dc.data();
localStorage.setItem('posCommandeData', JSON.stringify({
commandeId: cid,
clientId: cmd.clientId,
clientName: cmd.clientName,
items: cmd.items,
total: cmd.total,
table: cmd.table || ''
}));
navigateTo('pos');
}

function cancelCommande(cid) {
if (confirm('Annuler ?')) {
CacheDB.write('commandes', cid, { statut: 'annule' }, 'update').then(function() {
alert('❌ Annulée');
loadCommandes();
CacheDB.sync();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('commandes');
}
});
}
}

// ==================== VENTES ====================
function loadVentesPage(c) {
injectVentesStyles();

loadClientsForSearch();

window.ventesPeriod = 'all';
window.ventesSearch = '';
window.ventesDateDebut = '';
window.ventesDateFin = '';
window.venteSelectionMode = false;
window.venteSelectedIndex = -1;
window.venteSelectedClientId = null;
window.venteSelectedClientName = null;
ventesSelectionnees.clear();
if (!window.sortOrders.ventes) window.sortOrders.ventes = {};
if (!window.sortOrders.ventes.createdAt) { window.sortOrders.ventes.createdAt = 'desc'; }

var today = new Date().toISOString().split('T')[0];

// 🆕 Récupérer l'état du graphique
var chartVisible = window._ventesChartVisible;
var chartBodyClass = chartVisible ? '' : 'hidden';
var chartBtnLabel = chartVisible ? '<i class="fas fa-eye-slash"></i> Masquer' : '<i class="fas fa-eye"></i> Afficher';

c.innerHTML = `
<div class="content-card" id="ventesPage">
<div class="card-header">
<h3><i class="fas fa-shopping-cart"></i> Ventes</h3>
<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px;">
<div class="search-bar-pro">
<i class="fas fa-search"></i>
<input type="text" id="ventesSearchInput"
placeholder="Rechercher (client, produit, description)..."
onkeyup="handleVentesSearch(this.value);">
<button class="search-clear-btn hidden" id="ventesClearBtn" onclick="clearVentesSearch()" title="Effacer la recherche">
<i class="fas fa-times"></i>
</button>
</div>
<input type="text" id="ventesVoiceDisplay" placeholder="🎤 Audio..." class="voice-display-field" readonly>
<div class="filter-group">
<label><i class="far fa-calendar-alt"></i> Période</label>
<select id="ventesPeriodSelect" onchange="window.ventesPeriod = this.value; window.currentPages.ventes=1; applyVentesFilters();">
<option value="all">Toutes les dates</option>
<option value="today">Aujourd'hui</option>
<option value="3">3 jours</option>
<option value="7">7 jours</option>
<option value="15">15 jours</option>
<option value="30">30 jours</option>
<option value="90">3 mois</option>
<option value="365">1 an</option>
</select>
</div>
<div class="date-filter-group">
<input type="date" id="ventesDateDebut" value="" placeholder="Date début" onchange="window.ventesDateDebut = this.value; applyVentesFilters();">
<span style="font-weight:600; color:#64748B;">à</span>
<input type="date" id="ventesDateFin" value="" placeholder="Date fin" onchange="window.ventesDateFin = this.value; applyVentesFilters();">
<button class="btn-filter" onclick="appliquerFiltreDatePersonnalise()"><i class="fas fa-filter"></i> Filtrer</button>
<button class="btn-clear-filter" onclick="reinitialiserFiltres()"><i class="fas fa-undo"></i> Réinitialiser</button>
</div>
<div class="filter-group">
<label><i class="fas fa-filter"></i> Statut</label>
<select id="ventesStatusFilter" onchange="applyVentesFilters();">
<option value="all">Tous</option>
<option value="payé">Payé</option>
<option value="credit_partiel">Crédit + Partiel</option>
<option value="en_attente">En attente</option>
</select>
</div>
<button class="btn-add" onclick="loadVentes()">
<i class="fas fa-sync-alt"></i> Actualiser
</button>
<button id="toggleVenteSelectionBtn" class="btn-add" onclick="toggleVenteSelectionMode()" style="background:#6366f1; box-shadow:0 2px 8px rgba(99,102,241,0.25);">
<i class="fas fa-check-square"></i> Sélectionner
</button>
<button id="selectAllVentesBtn" class="btn-add" onclick="toggleSelectAllVisibleVentes()" style="display:none; background:#4f46e5;">
<i class="fas fa-check-double"></i> Tout sélectionner
</button>
<button id="deleteSelectedVentesBtn" class="btn-delete" onclick="deleteSelectedVentes()" style="display:none; background:#FEF2F2; color:#DC2626;">
<i class="fas fa-trash"></i> Supprimer
</button>
<button id="payerSelectedVentesBtn" class="btn-save" onclick="payerVentesSelectionnees()" style="display:none; background:#10B981; color:#fff; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
<i class="fas fa-money-bill-wave"></i> Payer tout
</button>
</div>
</div>
<div id="ventesChartContainer">
<div id="ventesChartHeader">
<h4><i class="fas fa-chart-bar"></i> Aperçu graphique (CA / Profit / Crédits)</h4>
<button id="toggleVentesChartBtn" onclick="toggleVentesChart()">${chartBtnLabel}</button>
</div>
<div id="ventesChartBody" class="${chartBodyClass}">
<div style="position:relative;height:320px;">
<canvas id="ventesChartCanvas"></canvas>
</div>
</div>
</div>
<div class="ventes-stats-grid" id="ventesStatsGrid">
<div class="ventes-stat-card">
<span class="stat-value blue" id="ventesStatsTotal">0.00</span>
<span class="stat-label">💰 Total Ventes</span>
</div>
<div class="ventes-stat-card">
<span class="stat-value green" id="ventesStatsProfit">0.00</span>
<span class="stat-label">📈 Profit</span>
</div>
<div class="ventes-stat-card">
<span class="stat-value orange" id="ventesStatsCount">0</span>
<span class="stat-label">📊 Nombre de ventes</span>
</div>
<div class="ventes-stat-card">
<span class="stat-value" id="ventesStatsAchat" style="color:#6b7280;">0.00</span>
<span class="stat-label">📦 Total Achat</span>
</div>
</div>
<div id="ventesTableContainer"></div>
<div id="ventesPagination" style="margin-top:12px;"></div>
</div>
`;

loadVentes();
}

function appliquerFiltreDatePersonnalise() {
var debut = document.getElementById('ventesDateDebut').value;
var fin = document.getElementById('ventesDateFin').value;
window.ventesDateDebut = debut;
window.ventesDateFin = fin;
document.getElementById('ventesPeriodSelect').value = 'all';
window.ventesPeriod = 'all';
applyVentesFilters();
}

function reinitialiserFiltres() {
document.getElementById('ventesDateDebut').value = '';
document.getElementById('ventesDateFin').value = '';
window.ventesDateDebut = '';
window.ventesDateFin = '';
document.getElementById('ventesPeriodSelect').value = 'all';
window.ventesPeriod = 'all';
document.getElementById('ventesSearchInput').value = '';
window.ventesSearch = '';
document.getElementById('ventesStatusFilter').value = 'all';
applyVentesFilters();
}
window.appliquerFiltreDatePersonnalise = appliquerFiltreDatePersonnalise;
window.reinitialiserFiltres = reinitialiserFiltres;

function handleVentesSearch(value) {
window.ventesSearch = value;
window.currentPages.ventes = 1;
handleSearchInput('ventes');
applyVentesFilters();
}

function clearVentesSearch() {
var searchField = document.getElementById('ventesSearchInput');
if (searchField) {
searchField.value = '';
window.ventesSearch = '';
applyVentesFilters();
var clearBtn = document.getElementById('ventesClearBtn');
if (clearBtn) {
clearBtn.classList.add('hidden');
}
}
}

function processVentesSearchFromVoice(text) {
var searchField = document.getElementById('ventesSearchInput');
var periodSelect = document.getElementById('ventesPeriodSelect');
var voiceDisplay = document.getElementById('ventesVoiceDisplay');

if (!searchField || !periodSelect) return;

var detectedFilter = detectPeriodFilterVentes(text);
if (detectedFilter) {
periodSelect.value = detectedFilter;
window.ventesPeriod = detectedFilter;
window.currentPages.ventes = 1;

searchField.value = '';
window.ventesSearch = '';

if (voiceDisplay) {
var filterLabels = {
'today': '📅 Aujourd\'hui',
'week': '📅 Cette semaine',
'month': '📅 Ce mois',
'year': '📅 Cette année',
'all': '📅 Toutes les ventes'
};
voiceDisplay.value = filterLabels[detectedFilter] || '📅 Filtre appliqué';
setTimeout(function() { voiceDisplay.value = ''; }, 2000);
}

applyVentesFilters();

var clearBtn = document.getElementById('ventesClearBtn');
if (clearBtn) clearBtn.classList.add('hidden');

return true;
}

searchField.value = text;
window.ventesSearch = text;
window.currentPages.ventes = 1;
applyVentesFilters();

return false;
}

// 🔧 CORRECTION CRITIQUE : Suppression de .limit(2000) pour charger TOUTES les ventes
async function loadVentes() {
var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
var vendeurCaissier = '';
if (!isAdmin && window.currentUserData) {
    vendeurCaissier = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
}

var ventesFirestore = [];
var ventesOffline = [];

if (navigator.onLine) {
    try {
        // 🔧 CORRECTION : Suppression de .limit(2000) → charge TOUTES les ventes
        const snapshot = await db.collection('ventes').orderBy('createdAt', 'desc').get();
        snapshot.forEach(dc => {
            var d = dc.data(); d.id = dc.id;
            var achat = 0, profit = 0;
            if (d.items) {
                d.items.forEach(function(it) {
                    var pa = it.prixAchat || 0, pv = it.prixVente || 0, pp = it.prixPromo || 0,
                        pvr = (pp > 0) ? pp : pv, q = it.quantite || 1;
                    achat += pa * q;
                    profit += (pvr - pa) * q;
                });
            }
            d.achat = achat; d.profit = profit;
            ventesFirestore.push(d);
        });
        console.log('📥 Total ventes chargées depuis Firestore :', ventesFirestore.length);
    } catch (e) {
        console.warn('⚠️ Erreur Firestore ventes:', e);
    }
}

try {
    var ventesOfflineRaw = JSON.parse(localStorage.getItem('posVentesOffline') || '[]');
    ventesOfflineRaw.forEach(function(v) {
        var dejaPresente = ventesFirestore.some(function(f) { return f.factureNum === v.factureNum; });
        if (dejaPresente) return;

        var achat = 0, profit = 0;
        if (v.items) {
            v.items.forEach(function(it) {
                var pa = it.prixAchat || 0, pv = it.prixVente || 0, pp = it.prixPromo || 0,
                    pvr = (pp > 0) ? pp : pv, q = it.quantite || 1;
                achat += pa * q;
                profit += (pvr - pa) * q;
            });
        }
        v.achat = achat; v.profit = profit;
        v._isOffline = true;
        ventesOffline.push(v);
    });
    console.log('📴 Ventes hors-ligne chargées:', ventesOffline.length);
} catch(e) {
    console.warn('⚠️ Erreur localStorage ventes:', e);
}

window.allVentesData = ventesFirestore.concat(ventesOffline);

if (!isAdmin && vendeurCaissier) {
    window.allVentesData = window.allVentesData.filter(function(d) { return d.vendeur === vendeurCaissier; });
}

window.allVentesData.sort(function(a, b) {
    var da = a.createdAt?.seconds || 0;
    var db = b.createdAt?.seconds || 0;
    return db - da;
});

if (!window.sortOrders.ventes) window.sortOrders.ventes = {};
if (!window.sortOrders.ventes.createdAt) { window.sortOrders.ventes.createdAt = 'desc'; }

window.currentPages.ventes = 1;
applyVentesFilters();
}

function applyVentesFilters() {
var filtered = filterByPeriodWithDates(window.allVentesData, window.ventesPeriod);

if (window.ventesDateDebut && window.ventesDateFin) {
var debut = new Date(window.ventesDateDebut);
debut.setHours(0, 0, 0, 0);
var fin = new Date(window.ventesDateFin);
fin.setHours(23, 59, 59, 999);
filtered = filtered.filter(function(d) {
if (!d.createdAt) return false;
var date = new Date(d.createdAt.seconds * 1000);
return date >= debut && date <= fin;
});
}

if (window.ventesSearch && window.ventesSearch.trim() !== '') {
filtered = filterVentesBySearchWithDescription(filtered, window.ventesSearch);
} else {
filtered.forEach(function(d) {
delete d._clientDisplayName;
});
}

var statusFilter = document.getElementById('ventesStatusFilter');
if (statusFilter && statusFilter.value !== 'all') {
    var sv = statusFilter.value;
    filtered = filtered.filter(function(d) {
        var st = d.statutPaiement || (d.paid ? 'payé' : 'impayé');
        if (sv === 'credit_partiel') {
            return (st === 'crédit' || st === 'partiel') && !d.paid;
        }
        return st === sv;
    });
}

if (!window.sortOrders.ventes || !window.sortOrders.ventes.createdAt) {
filtered.sort(function(a, b) {
var da = a.createdAt?.seconds || 0;
var db = b.createdAt?.seconds || 0;
return db - da;
});
} else {
filtered = applySort('ventes', filtered, 'createdAt');
}
window.filteredVentes = filtered;

updateVentesStats(filtered);

// 🆕 Mise à jour du graphique (uniquement si visible)
if (window._ventesChartVisible) {
    try { renderVentesChart(filtered); } catch(e) { console.warn('Erreur graphique:', e); }
}

renderVentesTablePro();
}

function filterByPeriodWithDates(data, period) {
if (!period || period === 'all') return data;
var now = new Date(), cutoff;
if (period === 'today') {
cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
} else {
var days = parseInt(period);
if (isNaN(days)) return data;
cutoff = new Date(now.getTime() - days * 86400000);
}
return data.filter(function(d) {
var date = d.createdAt ? new Date(d.createdAt.seconds * 1000) : null;
return date && date >= cutoff;
});
}

function updateVentesStats(data) {
var total = 0, profit = 0, achat = 0;
data.forEach(function(d) {
total += d.total || 0;
profit += d.profit || 0;
achat += d.achat || 0;
});

document.getElementById('ventesStatsTotal').textContent = total.toFixed(2);
document.getElementById('ventesStatsProfit').textContent = profit.toFixed(2);
document.getElementById('ventesStatsCount').textContent = data.length;
document.getElementById('ventesStatsAchat').textContent = achat.toFixed(2);
}

async function synchroVenteDepuisCredit(creditData) {
    try {
        var factureNum = creditData.factureNum;
        if (!factureNum) return;

        var vente = window.allVentesData.find(function(v) {
            return v.factureNum === factureNum || v.id === creditData.id;
        });

        if (!vente) {
            var snapshot = await db.collection('ventes')
                .where('factureNum', '==', factureNum)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                console.log('⚠️ Aucune vente trouvée pour la facture:', factureNum);
                return;
            }
            
            snapshot.forEach(function(doc) {
                vente = doc.data();
                vente.id = doc.id;
            });
        }

        if (vente) {
            var totalVente = vente.total || 0;
            var montantPaye = creditData.amountGiven || 0;
            var restantCredit = creditData.remainingAmount || 0;
            var estPaye = creditData.paid || (restantCredit <= 0.01);
            
            var statutPaiement = 'crédit';
            if (estPaye) {
                statutPaiement = 'payé';
            } else if (montantPaye > 0 && restantCredit > 0) {
                statutPaiement = 'partiel';
            }

            var updateData = {
                paid: estPaye,
                statutPaiement: statutPaiement,
                amountGiven: montantPaye,
                remainingAmount: restantCredit,
                change: Math.max(0, montantPaye - totalVente),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (estPaye) {
                updateData.paidAt = firebase.firestore.FieldValue.serverTimestamp();
                updateData.datePaiement = firebase.firestore.FieldValue.serverTimestamp();
            }

            await db.collection('ventes').doc(vente.id).update(updateData);
            
            var updatedVente = {
                ...vente,
                ...updateData,
                paid: estPaye,
                statutPaiement: statutPaiement,
                amountGiven: montantPaye,
                remainingAmount: restantCredit
            };
            await CacheDB.set('ventes', vente.id, updatedVente);
            
            var index = window.allVentesData.findIndex(function(v) {
                return v.id === vente.id;
            });
            if (index !== -1) {
                window.allVentesData[index] = updatedVente;
            }
            
            var fIndex = (window.filteredVentes || []).findIndex(function(v) {
                return v.id === vente.id;
            });
            if (fIndex !== -1) {
                window.filteredVentes[fIndex] = updatedVente;
            }
            
            var statusLabel = statutPaiement === 'payé' ? 'Payé ✅' : 
                             statutPaiement === 'partiel' ? 'Partiel ⏳' : 'Crédit 💳';
            console.log('✅ Vente synchronisée depuis crédit:', factureNum, '→ statut:', statusLabel);
            
            updateVentesStats(window.filteredVentes || window.allVentesData);
            renderVentesTablePro();
            
            if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
                CacheDB.saveCollection('ventes');
            }
        }
    } catch(e) {
        console.error('❌ Erreur synchronisation vente depuis crédit:', e);
    }
}

window.synchroVenteDepuisCredit = synchroVenteDepuisCredit;

function renderVentesTablePro() {
var cont = document.getElementById('ventesTableContainer');
if (!cont) return;
var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
var data = (window.filteredVentes || window.allVentesData).slice();

if (window.sortOrders.ventes && window.sortOrders.ventes.createdAt) {
data = applySort('ventes', data, 'createdAt');
} else {
data.sort(function(a, b) {
var da = a.createdAt?.seconds || 0;
var db = b.createdAt?.seconds || 0;
return db - da;
});
}

var itemsPerPage = window.itemsPerPage || 15;
var currentPage = window.currentPages.ventes || 1;
var start = (currentPage - 1) * itemsPerPage;
var pageData = data.slice(start, start + itemsPerPage);

if (pageData.length === 0) {
cont.innerHTML = `
<div style="text-align:center;padding:60px 20px;">
<i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
<p style="margin-top:16px;color:#6b7280;font-size:18px !important;">Aucune vente trouvée</p>
</div>
`;
document.getElementById('ventesPagination').innerHTML = '';
return;
}

var tv = 0, tProfit = 0, tAchat = 0;

var h = `
<div class="table-container">
<table class="data-table">
<thead>
<tr>
<th style="width:40px; text-align:center;">
${window.venteSelectionMode ? '<input type="checkbox" id="ventesSelectAllCheckbox" onchange="toggleAllVentesSelection()" title="Tout sélectionner">' : ''}
</th>
<th style="min-width:160px;"><i class="fas fa-receipt"></i> Facture</th>
<th style="min-width:150px;"><i class="far fa-calendar-alt"></i> Date / Heure</th>
<th style="min-width:150px;"><i class="fas fa-calendar-check"></i> Date paiement</th>
<th style="min-width:180px;"><i class="fas fa-user"></i> Client</th>
<th><i class="fas fa-box"></i> Articles</th>
<th><i class="fas fa-cog"></i> Options</th>
${isAdmin ? `<th><i class="fas fa-coins"></i> Achat</th><th><i class="fas fa-chart-line"></i> Profit</th>` : ''}
<th><i class="fas fa-tag"></i> Total</th>
<th><i class="fas fa-percent"></i> Remise</th>
<th><i class="fas fa-hand-holding-usd"></i> Donné</th>
<th><i class="fas fa-hourglass-half"></i> Restant</th>
<th><i class="fas fa-undo-alt"></i> Rendu</th>
${isAdmin ? `<th><i class="fas fa-user-tie"></i> Vendeur</th>` : ''}
<th><i class="fas fa-credit-card"></i> Paiement</th>
<th><i class="fas fa-circle"></i> Statut</th>
<th style="min-width:200px;"><i class="fas fa-tools"></i> Actions</th>
</tr>
</thead>
<tbody>
`;

pageData.forEach(function(d, index) {
var isChecked = ventesSelectionnees.has(d.id) ? 'checked' : '';
const factureNum = d.factureNum || d.id?.substring(0, 8) || '---';
const factureHtml = `
<div class="facture-cell">
<i class="fas fa-receipt"></i>
<span class="facture-number">#${factureNum}</span>
</div>
`;
const dateHtml = renderDateCell(d);
const datePaiementHtml = renderDatePaiementCell(d);
const clientHtml = renderClientCell(d);

var arts = d.items ? d.items.map(function(it) {
return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom);
}).join('<br>') : '-';

var opts = d.items ? d.items.map(function(it) {
var o = [];
if (it.sauces && it.sauces.length) o.push('<span style="color:#14B8A6;">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
if (it.interdits && it.interdits.length) o.push('<span style="color:#ef4444;">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
if (it.epice && it.epice !== 'Normal') o.push('<span style="color:#d97706;">🌶️' + escapeHtml(it.epice) + '</span>');
if (it.sel && it.sel !== 'Normal') o.push('<span style="color:#4f46e5;">🧂' + escapeHtml(it.sel) + '</span>');
return o.length ? o.join(' | ') : '<span style="color:#9ca3af;">Aucune option</span>';
}).join('<br>') : '-';

tv += d.total || 0;
tProfit += d.profit || 0;
tAchat += d.achat || 0;

var statutPaiement = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
if (d.paid && statutPaiement !== 'payé') {
    statutPaiement = 'payé';
}
if (d.amountGiven > 0 && d.remainingAmount > 0 && statutPaiement !== 'partiel') {
    statutPaiement = 'partiel';
}

var statutMap = {
'payé': { class: 'status-success', label: 'Payé', icon: 'fa-check-circle' },
'crédit': { class: 'status-warning', label: 'Crédit', icon: 'fa-hand-holding-usd' },
'partiel': { class: 'status-warning', label: 'Partiel', icon: 'fa-clock' },
'en_attente': { class: 'status-danger', label: 'En attente', icon: 'fa-hourglass-half' },
'impayé': { class: 'status-danger', label: 'Impayé', icon: 'fa-times-circle' }
};
var st = statutMap[statutPaiement] || { class: 'status-warning', label: statutPaiement || 'Inconnu', icon: 'fa-question-circle' };

var paymentMethod = d.paymentMethod || 'crédit';

var actions = `
<div class="action-buttons">
    <button class="btn-print" onclick="printFacture('${d.id}')" title="Imprimer / PDF">Imprimer</button>
    <button class="btn-whatsapp" onclick="sendWhatsApp('${d.id}')" title="Envoyer WhatsApp">WhatsApp</button>
    `;
if (!d.paid) {
    actions += `<button class="btn-payer" onclick="payerVente('${d.id}')" title="Payer">Payer</button>`;
}
if (isAdmin) {
    actions += `
    <button class="btn-edit" onclick="editVente('${d.id}')" title="Modifier">Modifier</button>
    <button class="btn-delete" onclick="deleteVente('${d.id}')" title="Supprimer">Supprimer</button>
    `;
}
actions += `</div>`;

var restantColor = (d.remainingAmount || 0) > 0 ? '#ef4444' : '#14B8A6';

h += `
<tr>
<td style="text-align:center; vertical-align:middle;">
${window.venteSelectionMode ? '<input type="checkbox" class="vente-checkbox" data-id="' + d.id + '" ' + isChecked + ' onchange="toggleVenteSelection(\'' + d.id + '\')" style="transform:scale(1.3);width:20px;height:20px;">' : ''}
</td>
<td onclick="openFactureDetails('${d.id}', '${escapeHtml(factureNum)}')" style="cursor:pointer;">
${factureHtml}
</td>
<td>${dateHtml}</td>
<td>${datePaiementHtml}</td>
<td>${clientHtml}</td>
<td>${arts}</td>
<td>${opts}</td>
${isAdmin ? `<td>${(d.achat || 0).toFixed(2)}</td><td style="color:#14B8A6;font-weight:700;">${(d.profit || 0).toFixed(2)}</td>` : ''}
<td><span class="amount-total">${(d.total || 0).toFixed(2)} MAD</span></td>
<td>${(d.discountMAD || 0).toFixed(2)}</td>
<td><span style="font-weight:700;color:#2563eb;">${(d.amountGiven || 0).toFixed(2)}</span></td>
<td><span style="font-weight:700;color:${restantColor};">${(d.remainingAmount || 0).toFixed(2)} MAD</span></td>
<td>${(d.change || 0).toFixed(2)}</td>
${isAdmin ? `<td>${escapeHtml(d.vendeur || '-')}</td>` : ''}
<td>${escapeHtml(paymentMethod)}</td>
<td><span class="${st.class}"><i class="fas ${st.icon}"></i> ${st.label}</span></td>
<td>${actions}</td>
</tr>
`;
});

h += `
</tbody>
</table>
</div>
`;
cont.innerHTML = h;
document.getElementById('ventesPagination').innerHTML = getPaginationHTML('ventes', data.length);
updateVenteSelectionUI();
}

function editVente(did) {
db.collection('ventes').doc(did).get().then(function(doc) {
if (doc.exists) {
window.editingId = did;
window.currentCollection = 'ventes';
var d = doc.data();
var h = `
<div class="form-row">
<div class="form-group">
<label><i class="fas fa-circle"></i> Statut paiement</label>
<select id="editStatut">
<option value="payé" ${d.statutPaiement === 'payé' ? 'selected' : ''}>Payé</option>
<option value="crédit" ${d.statutPaiement === 'crédit' ? 'selected' : ''}>Crédit</option>
<option value="partiel" ${d.statutPaiement === 'partiel' ? 'selected' : ''}>Partiel</option>
<option value="en_attente" ${d.statutPaiement === 'en_attente' ? 'selected' : ''}>En attente</option>
</select>
</div>
<div class="form-group">
<label><i class="fas fa-hand-holding-usd"></i> Montant donné</label>
<input type="number" id="editAmountGiven" value="${d.amountGiven || 0}" step="0.01">
</div>
</div>
<div class="form-row">
<div class="form-group">
<label><i class="fas fa-undo-alt"></i> Montant rendu</label>
<input type="number" id="editChange" value="${d.change || 0}" step="0.01">
</div>
<div class="form-group">
<label><i class="fas fa-hourglass-half"></i> Reste à payer</label>
<input type="number" id="editRemaining" value="${d.remainingAmount || 0}" step="0.01">
</div>
</div>
<button class="btn-cancel" onclick="closeModal()">Annuler</button>
<button class="btn-save" onclick="saveEditVente()"><i class="fas fa-save"></i> Enregistrer</button>
`;
openModal('Modifier vente ' + (d.factureNum || ''), h);
}
});
}

function saveEditVente() {
var statut = document.getElementById('editStatut').value;
var amountGiven = parseFloat(document.getElementById('editAmountGiven').value) || 0;
var change = parseFloat(document.getElementById('editChange').value) || 0;
var remaining = parseFloat(document.getElementById('editRemaining').value) || 0;
var paid = (statut === 'payé');

var data = {
statutPaiement: statut,
amountGiven: amountGiven,
change: change,
remainingAmount: paid ? 0 : remaining,
paid: paid,
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

if (paid) {
    data.datePaiement = firebase.firestore.FieldValue.serverTimestamp();
    data.paidAt = firebase.firestore.FieldValue.serverTimestamp();
}

saveDocument('ventes', data, function() { 
closeModal(); 
loadVentes(); 

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('ventes');
}
});
}

function deleteVente(did) {
if (confirm('Supprimer définitivement cette vente ?')) {
CacheDB.write('ventes', did, null, 'delete').then(function() {
alert('✅ Supprimé');
loadVentes();
CacheDB.sync();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('ventes');
}
});
}
}

async function payerVente(did) {
    var dc = await db.collection('ventes').doc(did).get();
    if (!dc.exists) { alert('Vente introuvable'); return; }
    var d = dc.data();
    d.id = did;

    if (d.paid) {
        alert('✅ Cette vente est déjà payée.');
        return;
    }

    var totalVente = d.total || 0;
    var dejaPaye = d.amountGiven || 0;
    var restant = (d.remainingAmount != null) ? d.remainingAmount : (totalVente - dejaPaye);
    if (restant < 0) restant = 0;

    if (restant <= 0.01) {
        alert('✅ Cette vente est déjà entièrement payée.');
        return;
    }

    var modalHtml = `
        <div style="padding:10px;">
            <h4 style="margin-bottom:16px;font-size:1.2rem;color:var(--text-primary);">
                💰 Encaisser le paiement
            </h4>
            <div style="background:var(--bg-page);border-radius:var(--radius);padding:14px;margin-bottom:16px;border:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Facture</span>
                    <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(d.factureNum || 'N/A')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Client</span>
                    <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(d.clientName || 'Passager')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Total</span>
                    <span style="font-weight:600;color:var(--text-primary);">${totalVente.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Déjà payé</span>
                    <span style="font-weight:600;color:var(--success);">${dejaPaye.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1.1rem;font-weight:700;border-top:1px solid var(--border);margin-top:4px;padding-top:8px;">
                    <span style="color:var(--text-secondary);">Reste à payer</span>
                    <span style="color:var(--danger);font-size:1.3rem;">${restant.toFixed(2)} MAD</span>
                </div>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                    Montant à encaisser (MAD)
                </label>
                <input type="number" id="ventePaymentAmount" value="${restant.toFixed(2)}"
                    step="0.01" min="0.01" max="${restant}"
                    style="width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:var(--radius);font-size:1.3rem;font-weight:700;background:var(--bg-card);color:var(--text-primary);">
                <div style="margin-top:4px;font-size:0.8rem;color:var(--text-muted);">
                    💡 Montant maximum : ${restant.toFixed(2)} MAD
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                <button onclick="closeModal()" class="btn-cancel" style="padding:10px 24px;border-radius:var(--radius);border:none;background:var(--gray-100);color:var(--text-secondary);font-weight:600;cursor:pointer;font-size:0.9rem;">
                    Annuler
                </button>
                <button onclick="confirmVentePayment('${did}')" class="btn-save" style="padding:10px 24px;border-radius:var(--radius);border:none;background:var(--success);color:white;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-check"></i> Encaisser
                </button>
            </div>
        </div>
    `;

    openModal('💰 Encaisser le paiement', modalHtml);
}

async function confirmVentePayment(venteId) {
    var amountInput = document.getElementById('ventePaymentAmount');
    if (!amountInput) {
        alert('Erreur: champ de montant introuvable');
        return;
    }

    var montant = parseFloat(amountInput.value);
    if (isNaN(montant) || montant <= 0) {
        alert('❌ Veuillez entrer un montant valide');
        return;
    }

    var dc = await db.collection('ventes').doc(venteId).get();
    if (!dc.exists) {
        alert('Vente introuvable');
        return;
    }
    var vente = dc.data();
    vente.id = venteId;

    var totalVente = vente.total || 0;
    var ancienPaye = vente.amountGiven || 0;
    var ancienRestant = (vente.remainingAmount != null) ? vente.remainingAmount : (totalVente - ancienPaye);

    if (montant > ancienRestant + 0.01) {
        alert('❌ Le montant ne peut pas dépasser le reste à payer (' + ancienRestant.toFixed(2) + ' MAD)');
        return;
    }

    var nouveauPaye = ancienPaye + montant;
    var nouveauRestant = Math.max(0, ancienRestant - montant);
    var estPaye = nouveauRestant <= 0.01;

    var now = firebase.firestore.FieldValue.serverTimestamp();

    var updateData = {
        amountGiven: nouveauPaye,
        remainingAmount: nouveauRestant,
        paid: estPaye,
        statutPaiement: estPaye ? 'payé' : 'partiel',
        change: Math.max(0, nouveauPaye - totalVente),
        updatedAt: now
    };

    if (estPaye) {
        updateData.datePaiement = now;
        updateData.paidAt = now;
    }

    try {
        await db.collection('ventes').doc(venteId).update(updateData);
        console.log('✅ Vente mise à jour :', venteId, '→ statut:', updateData.statutPaiement);

        if (vente.factureNum) {
            var creditsSnap = await db.collection('credits')
                .where('factureNum', '==', vente.factureNum)
                .limit(5)
                .get();

            if (!creditsSnap.empty) {
                for (var i = 0; i < creditsSnap.docs.length; i++) {
                    var cDoc = creditsSnap.docs[i];
                    var cData = cDoc.data();
                    if (cData.paid) continue;

                    var creditRestant = (cData.remainingAmount != null) ? cData.remainingAmount : (cData.total || 0);
                    var creditAncienPaye = cData.amountGiven || 0;

                    var creditNouveauPaye = creditAncienPaye + montant;
                    var creditNouveauRestant = Math.max(0, creditRestant - montant);
                    var creditEstPaye = creditNouveauRestant <= 0.01;

                    var creditUpdate = {
                        amountGiven: creditNouveauPaye,
                        remainingAmount: creditNouveauRestant,
                        paid: creditEstPaye,
                        updatedAt: now
                    };
                    if (creditEstPaye) {
                        creditUpdate.datePaiement = now;
                        creditUpdate.paidAt = now;
                    }

                    await db.collection('credits').doc(cDoc.id).update(creditUpdate);
                    console.log('✅ Crédit mis à jour :', cDoc.id);

                    if (window.allCreditsData) {
                        var cIdx = window.allCreditsData.findIndex(function(c) { return c.id === cDoc.id; });
                        if (cIdx !== -1) {
                            Object.assign(window.allCreditsData[cIdx], creditUpdate);
                        }
                    }
                    if (typeof CacheDB !== 'undefined' && CacheDB.set) {
                        try {
                            var updatedCredit = Object.assign({}, cData, creditUpdate);
                            updatedCredit.id = cDoc.id;
                            await CacheDB.set('credits', cDoc.id, updatedCredit);
                        } catch(e) {}
                    }
                }
            }
        }

        if (typeof CacheDB !== 'undefined' && CacheDB.set) {
            try {
                var updatedVente = Object.assign({}, vente, updateData);
                updatedVente.id = venteId;
                await CacheDB.set('ventes', venteId, updatedVente);
            } catch(e) {}
        }

        if (window.allVentesData) {
            var idx = window.allVentesData.findIndex(function(v) { return v.id === venteId; });
            if (idx !== -1) {
                Object.assign(window.allVentesData[idx], updateData);
            }
        }

        if (window.filteredVentes) {
            var fIdx = window.filteredVentes.findIndex(function(v) { return v.id === venteId; });
            if (fIdx !== -1) {
                Object.assign(window.filteredVentes[fIdx], updateData);
            }
        }

        closeModal();

        if (typeof updateVentesStats === 'function') {
            updateVentesStats(window.filteredVentes || window.allVentesData);
        }
        if (typeof renderVentesTablePro === 'function') {
            renderVentesTablePro();
        }
        if (window._ventesChartVisible) {
            try { renderVentesChart(window.filteredVentes || window.allVentesData); } catch(e) {}
        }

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('ventes');
            CacheDB.saveCollection('credits');
        }

        if (estPaye) {
            alert('✅ Vente entièrement payée ! Date de paiement enregistrée.');
        } else {
            alert('✅ Paiement partiel enregistré. Reste à payer : ' + nouveauRestant.toFixed(2) + ' MAD');
        }

    } catch(e) {
        console.error('❌ Erreur paiement vente:', e);
        alert('❌ Erreur lors du paiement: ' + e.message);
    }
}
window.confirmVentePayment = confirmVentePayment;

function printFacture(did) {
db.collection('ventes').doc(did).get().then(function(dc) {
if (dc.exists) imprimerFacture(dc.data(), dc.id);
else {
db.collection('credits').doc(did).get().then(function(cd) {
if (cd.exists) imprimerFacture(cd.data(), cd.id);
});
}
});
}

function imprimerFacture(d, id) {
var ih = '';
if (d.items) {
d.items.forEach(function(it) {
var o = '';
if (it.interdits && it.interdits.length > 0) o += ' 🚫' + it.interdits.join(',');
if (it.permis && it.permis.length > 0) o += ' ✅' + it.permis.join(',');
if (it.epice && it.epice !== 'Normal') o += ' 🌶️' + it.epice;
ih += `<tr><td>${escapeHtml(it.nom)}${o}</td><td>${it.quantite}</td><td>${(it.prixVente || 0).toFixed(2)}</td><td>${((it.prixVente || 0) * it.quantite).toFixed(2)}</td></tr>`;
});
}
var w = window.open('', '_blank', 'width=400,height=600');
w.document.write(`
<html><head><title>Facture E-SOLUTION</title>
<style>
body{font-family:'Inter',Arial,sans-serif;padding:24px;background:#f9fafb;}
.invoice{background:#fff;padding:24px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);}
h2{text-align:center;color:#111827;}
.header-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:0.9rem;}
table{width:100%;border-collapse:collapse;margin:16px 0;}
th{background:#f3f4f6;padding:8px 12px;text-align:left;font-weight:600;font-size:0.8rem;}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;}
.total{font-size:1.2rem;font-weight:800;text-align:right;margin-top:16px;padding-top:16px;border-top:2px solid #111827;}
.footer{text-align:center;color:#6b7280;font-size:0.75rem;margin-top:20px;}
</style>
</head><body>
<div class="invoice">
<h2>🛒 E-SOLUTION</h2>
<div class="header-info">
<div><strong>Facture:</strong> ${d.factureNum || id.substring(0, 8)}</div>
<div><strong>Date:</strong> ${d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString('fr-FR') : ''}</div>
<div><strong>Client:</strong> ${d.clientName || d.table || '-'}</div>
<div><strong>Vendeur:</strong> ${d.vendeur || '-'}</div>
</div>
<table>
<tr><th>Article</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
${ih}
</table>
${d.discountMAD > 0 ? `<p><strong>Remise:</strong> -${d.discountMAD.toFixed(2)} MAD</p>` : ''}
<div class="total">Total: ${d.total.toFixed(2)} MAD</div>
<div class="footer">Merci de votre visite ! 🌟</div>
</div>
</body></html>
`);
w.document.close();
setTimeout(function() { w.print(); }, 500);
}

async function sendWhatsApp(did) {
try {
const doc = await db.collection('ventes').doc(did).get();
if (!doc.exists) { alert('Vente introuvable'); return; }
const vente = doc.data();

let phone = '';

const allClients = (window.posAllClients && window.posAllClients.length)
? window.posAllClients
: (window.allClientsData || []);
let client = null;

if (vente.clientId) {
client = allClients.find(c => c.id === vente.clientId);
} else if (vente.clientName) {
const normalized = (vente.clientName || '')
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
.toLowerCase()
.trim();
client = allClients.find(c => {
const full = ((c.nom || '') + ' ' + (c.prenom || ''))
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
.toLowerCase()
.trim();
return full === normalized;
});
}

if (client) {
phone = client.whatsapp || client.telephone || '';
}

if (!phone && vente.clientId) {
try {
const clientDoc = await db.collection('clients').doc(vente.clientId).get();
if (clientDoc.exists) {
const cdata = clientDoc.data();
phone = cdata.whatsapp || cdata.telephone || '';
}
} catch (e) {}
}

phone = phone.replace(/[^\d+]/g, '').trim();
if (phone.startsWith('0')) {
phone = '+212' + phone.substring(1);
} else if (!phone.startsWith('+')) {
phone = '+' + phone;
}

if (!phone || phone === '+') {
alert('❌ Aucun numéro WhatsApp trouvé.');
return;
}

var msg = '🧾 *FACTURE E-SOLUTION*\n';
msg += '━━━━━━━━━━━━━━━━━━\n';
msg += '📄 ' + (vente.factureNum || did.substring(0, 8)) + '\n';
msg += '📅 ' + (vente.createdAt ? new Date(vente.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : '') + '\n';
msg += '👤 ' + (vente.clientName || '-') + '\n';
msg += '━━━━━━━━━━━━━━━━━━\n';
if (vente.items) {
vente.items.forEach(function(it) {
var opt = '';
if (it.interdits && it.interdits.length) opt += ' 🚫' + it.interdits.join(',');
if (it.epice && it.epice !== 'Normal') opt += ' 🌶️' + it.epice;
if (it.sel && it.sel !== 'Normal') opt += ' 🧂' + it.sel;
msg += it.quantite + 'x ' + it.nom + opt + ' → ' + ((it.prixVente || 0) * it.quantite).toFixed(2) + ' MAD\n';
});
}
msg += '━━━━━━━━━━━━━━━━━━\n';
if (vente.discountMAD > 0) msg += 'Remise: -' + vente.discountMAD.toFixed(2) + ' MAD\n';
msg += '*💰 TOTAL: ' + vente.total.toFixed(2) + ' MAD*\n';
if (vente.paymentMethod === 'crédit') msg += '📋 Reste à payer: ' + (vente.remainingAmount || vente.total).toFixed(2) + ' MAD\n';
msg += '━━━━━━━━━━━━━━━━━━\n';
msg += '🙏 Merci de votre visite !\n';
msg += '🛒 E-SOLUTION';

var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);

var w = window.open(url, '_blank');
if (!w || w.closed) {
var modalHtml = `
<div style="text-align:center;padding:10px;">
<i class="fab fa-whatsapp" style="font-size:4rem;color:#25D366;"></i>
<p style="margin:16px 0;font-size:1.1rem;">Cliquez sur le bouton ci-dessous pour envoyer la facture</p>
<a href="${url}" target="_blank" rel="noopener noreferrer"
style="display:inline-block;padding:14px 32px;background:#25D366;color:#fff;
border-radius:12px;font-weight:700;text-decoration:none;font-size:1.1rem;">
<i class="fab fa-whatsapp"></i> Envoyer sur WhatsApp
</a>
</div>
`;
openModal('📱 Envoyer WhatsApp', modalHtml);
}

} catch (e) {
console.error('WhatsApp:', e);
alert('❌ Erreur lors de l\'envoi WhatsApp');
}
}

function clearSearch(target) {
if (target === 'ventes') {
clearVentesSearch();
} else if (target === 'commandes') {
const searchField = document.getElementById('commandesSearchInput');
if (searchField) {
searchField.value = '';
window.commandesSearch = '';
applyCommandesFilters();
const clearBtn = document.getElementById('commandesClearBtn');
if (clearBtn) clearBtn.classList.add('hidden');
}
}
}

function handleSearchInput(target) {
const searchField = document.getElementById(target + 'SearchInput');
const clearBtn = document.getElementById(target + 'ClearBtn');
if (searchField && clearBtn) {
if (searchField.value.length > 0) {
clearBtn.classList.remove('hidden');
} else {
clearBtn.classList.add('hidden');
}
}
}

// ✅ CORRIGÉ : Filtrer par clientId (clic sur le nom du client)
// 🔧 CORRECTION : Utilise clientId au lieu du nom pour cohérence avec admin-credits
// ✅ Si pas de clientId trouvé, fallback sur recherche textuelle par nom
function filtrerVentesParClient(clientName, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('🖱️ Clic sur client :', clientName);
    
    // ✅ ÉTAPE 1 : Trouver la vente correspondante pour récupérer son clientId
    var data = window.filteredVentes || window.allVentesData || [];
    var vente = data.find(function(v) {
        var vName = v._clientDisplayName || v.clientName || v.table || 'Client inconnu';
        return vName === clientName;
    });
    
    var searchInput = document.getElementById('ventesSearchInput');
    var clearBtn = document.getElementById('ventesClearBtn');
    
    // ✅ ÉTAPE 2 : Si pas de clientId trouvé → fallback recherche textuelle par nom
    if (!vente || !vente.clientId) {
        console.warn('⚠️ clientId introuvable, fallback recherche textuelle par nom');
        if (searchInput) {
            searchInput.value = clientName;
            window.ventesSearch = clientName;
            window.currentPages.ventes = 1;
            if (clearBtn) clearBtn.classList.remove('hidden');
            applyVentesFilters();
        }
        var tableContainer = document.getElementById('ventesTableContainer');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }
    
    // ✅ ÉTAPE 3 : Filtrer par clientId (cohérence avec admin-credits)
    window.ventesSearch = '';
    window.currentPages.ventes = 1;
    
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    
    // On stocke le clientId pour le filtrage
    window._posFilterClientIdVentes = vente.clientId;
    window._posFilterClientNameVentes = clientName;
    
    applyVentesFilters();
    
    var tableContainer2 = document.getElementById('ventesTableContainer');
    if (tableContainer2) {
        tableContainer2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    console.log('✅ Filtre par clientId :', vente.clientId, '(' + clientName + ')');
    
    setTimeout(function() {
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, 100);
}
window.filtrerVentesParClient = filtrerVentesParClient;

// ==================== MODAL DÉTAILS FACTURE ====================
var currentFactureId = null;

function openFactureDetails(factureId, factureNum) {
    var modal = document.getElementById('factureDetailsModal');
    if (!modal) {
        var modalHTML = `
            <div id="factureDetailsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
                <div style="background:var(--bg-card);border-radius:var(--radius-xl);width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);border:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:2px solid var(--border);flex-shrink:0;">
                        <h3 id="factureDetailsTitle" style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-file-invoice" style="color:var(--accent);font-size:1.4rem;"></i>
                            📄 Détails de la facture
                        </h3>
                        <button onclick="closeFactureDetails()" style="background:none;border:none;font-size:2rem;cursor:pointer;color:var(--text-muted);padding:0 14px;border-radius:8px;transition:var(--transition);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="factureDetailsBody" style="flex:1;overflow-y:auto;padding:24px;padding-top:16px;">
                        <div style="text-align:center;padding:40px;">
                            <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:var(--accent);"></i>
                            <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Chargement...</p>
                        </div>
                    </div>
                    <div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                        <button onclick="closeFactureDetails()" style="padding:12px 28px;border-radius:var(--radius);border:none;background:var(--gray-100);color:var(--text-secondary);font-weight:600;cursor:pointer;transition:var(--transition);font-size:1rem;">
                            Fermer
                        </button>
                        <button onclick="printFactureDetails()" style="padding:12px 28px;border-radius:var(--radius);border:none;background:var(--black);color:var(--white);font-weight:600;cursor:pointer;transition:var(--transition);font-size:1rem;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-print"></i> Imprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        var div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);
        
        document.getElementById('factureDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeFactureDetails();
            }
        });
        
        modal = document.getElementById('factureDetailsModal');
    }
    
    modal.style.display = 'flex';
    document.getElementById('factureDetailsTitle').textContent = '📄 Détails facture N° ' + (factureNum || 'N/A');
    currentFactureId = factureId;
    loadFactureDetails(factureId);
}

function closeFactureDetails() {
    var modal = document.getElementById('factureDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentFactureId = null;
}

async function loadFactureDetails(factureId) {
    var body = document.getElementById('factureDetailsBody');
    if (!body) return;
    
    try {
        var doc = await db.collection('ventes').doc(factureId).get();
        
        if (!doc.exists) {
            body.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);"></i>
                    <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Facture non trouvée</p>
                </div>
            `;
            return;
        }
        
        var data = doc.data();
        renderFactureDetails(data);
        
    } catch(e) {
        console.error('Erreur chargement facture:', e);
        body.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);"></i>
                <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Erreur lors du chargement: ${e.message}</p>
            </div>
        `;
    }
}

function renderFactureDetails(data) {
    var body = document.getElementById('factureDetailsBody');
    if (!body) return;
    
    var date = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
    var dateStr = date.toLocaleDateString('fr-FR');
    var timeStr = date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    
    var statutPaiement = data.statutPaiement || (data.paid ? 'payé' : 'crédit');
    if (data.paid && statutPaiement !== 'payé') {
        statutPaiement = 'payé';
    }
    
    var statusBg = statutPaiement === 'payé' ? '#ECFDF5' : statutPaiement === 'crédit' ? '#FEF3C7' : '#FEE2E2';
    var statusColor = statutPaiement === 'payé' ? '#065F46' : statutPaiement === 'crédit' ? '#92400E' : '#991B1B';
    
    var datePaiementHtml = '';
    if (data.datePaiement && data.datePaiement.seconds) {
        var dP = new Date(data.datePaiement.seconds * 1000);
        var dPDate = dP.toLocaleDateString('fr-FR');
        var dPTime = dP.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
        datePaiementHtml = `
            <div style="background:#ECFDF5;border-radius:var(--radius);padding:14px 18px;border:1px solid #99F6E4;margin-bottom:20px;">
                <p style="font-size:0.8rem;font-weight:600;color:#065F46;text-transform:uppercase;margin:0 0 6px 0;">✅ Date de paiement</p>
                <p style="font-size:1.2rem;font-weight:600;color:#0F172A;margin:0;">
                    <i class="far fa-calendar-check"></i> ${dPDate} à ${dPTime}
                </p>
            </div>
        `;
    }
    
    var html = `
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--border);">
            <div>
                <h4 style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin:0;">Facture N° ${data.factureNum || 'N/A'}</h4>
                <p style="color:var(--text-secondary);font-size:1.1rem;margin:6px 0 0 0;">
                    <i class="far fa-calendar-alt"></i> ${dateStr} à ${timeStr}
                </p>
            </div>
            <span style="display:inline-block;padding:6px 18px;border-radius:20px;font-size:1rem;font-weight:600;text-transform:uppercase;background:${statusBg};color:${statusColor};">
                ${statutPaiement || 'N/A'}
            </span>
        </div>
        
        ${datePaiementHtml}
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
            <div style="background:var(--bg-page);border-radius:var(--radius);padding:14px 18px;border:1px solid var(--border);">
                <p style="font-size:0.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:0 0 6px 0;">Client</p>
                <p style="font-size:1.2rem;font-weight:600;color:var(--text-primary);margin:0;">${escapeHtml(data.clientName || 'Passager')}</p>
                <p style="font-size:1rem;color:var(--text-secondary);margin:4px 0 0 0;">${data.clientId ? 'ID: ' + data.clientId : 'Client non identifié'}</p>
            </div>
            <div style="background:var(--bg-page);border-radius:var(--radius);padding:14px 18px;border:1px solid var(--border);">
                <p style="font-size:0.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:0 0 6px 0;">Table / Vendeur</p>
                <p style="font-size:1.2rem;font-weight:600;color:var(--text-primary);margin:0;">${escapeHtml(data.table || '—')}</p>
                <p style="font-size:1rem;color:var(--text-secondary);margin:4px 0 0 0;">👤 ${escapeHtml(data.vendeur || 'N/A')}</p>
            </div>
        </div>
        
        <div style="margin-bottom:18px;">
            <p style="font-size:0.9rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:0 0 10px 0;">Articles</p>
            <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:1rem;">
                    <thead>
                        <tr style="background:var(--bg-page);">
                            <th style="padding:10px 14px;text-align:left;font-weight:600;color:var(--text-secondary);border-bottom:2px solid var(--border);font-size:0.9rem;">Produit</th>
                            <th style="padding:10px 14px;text-align:center;font-weight:600;color:var(--text-secondary);border-bottom:2px solid var(--border);font-size:0.9rem;">Qté</th>
                            <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--text-secondary);border-bottom:2px solid var(--border);font-size:0.9rem;">Prix unit.</th>
                            <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--text-secondary);border-bottom:2px solid var(--border);font-size:0.9rem;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    var items = data.items || [];
    if (items.length === 0) {
        html += '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-muted);font-size:1rem;">Aucun article</td></tr>';
    } else {
        items.forEach(function(item) {
            var prix = item.prixVente || item.prixUnitaire || 0;
            var total = prix * (item.quantite || 1);
            var opts = '';
            if (item.interdits && item.interdits.length) opts += ' 🚫' + escapeHtml(item.interdits.join(','));
            if (item.epice && item.epice !== 'Normal') opts += ' 🌶️' + escapeHtml(item.epice);
            if (item.sel && item.sel !== 'Normal') opts += ' 🧂' + escapeHtml(item.sel);
            
            html += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 14px;color:var(--text-primary);font-size:1.05rem;">${escapeHtml(item.nom || 'Produit')}${opts}</td>
                    <td style="padding:10px 14px;text-align:center;color:var(--text-primary);font-size:1.05rem;">${item.quantite || 1}</td>
                    <td style="padding:10px 14px;text-align:right;color:var(--text-secondary);font-size:1.05rem;">${prix.toFixed(2)} MAD</td>
                    <td style="padding:10px 14px;text-align:right;font-weight:600;color:var(--text-primary);font-size:1.05rem;">${total.toFixed(2)} MAD</td>
                </tr>
            `;
        });
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <div style="display:flex;justify-content:flex-end;padding-top:16px;border-top:2px solid var(--border);">
            <div style="width:280px;">
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;color:var(--text-secondary);">
                    <span>Sous-total</span>
                    <span>${(data.subtotal || 0).toFixed(2)} MAD</span>
                </div>
                ${data.discountMAD > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;color:var(--danger);">
                    <span>Remise</span>
                    <span>-${data.discountMAD.toFixed(2)} MAD</span>
                </div>
                ` : ''}
                <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:1.5rem;font-weight:700;color:var(--text-primary);border-top:2px solid var(--border);margin-top:6px;">
                    <span>Total</span>
                    <span>${(data.total || 0).toFixed(2)} MAD</span>
                </div>
                ${data.amountGiven > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;color:var(--text-secondary);">
                    <span>Montant donné</span>
                    <span>${(data.amountGiven || 0).toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;font-weight:600;color:${data.change >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    <span>${data.change >= 0 ? 'Rendu' : 'Manquant'}</span>
                    <span>${Math.abs(data.change || 0).toFixed(2)} MAD</span>
                </div>
                ` : ''}
                ${data.remainingAmount > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;font-weight:600;color:var(--danger);">
                    <span>Reste à payer</span>
                    <span>${(data.remainingAmount || 0).toFixed(2)} MAD</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    body.innerHTML = html;
}

function printFactureDetails() {
    if (currentFactureId) {
        printFacture(currentFactureId);
    } else {
        alert('Aucune facture sélectionnée');
    }
}

// ============================================================
// 💰 PAIEMENT GROUPÉ DE VENTES + WHATSAPP DÉTAILLÉ
// ============================================================

async function payerVentesSelectionnees() {
    if (ventesSelectionnees.size === 0) {
        alert('⚠️ Aucune vente sélectionnée.');
        return;
    }

    var data = window.filteredVentes || window.allVentesData || [];
    var ventesAPayer = [];
    var totalGlobal = 0;

    data.forEach(function(v) {
        if (ventesSelectionnees.has(v.id) && !v.paid) {
            ventesAPayer.push(v);
            totalGlobal += v.remainingAmount || v.total || 0;
        }
    });

    if (ventesAPayer.length === 0) {
        alert('⚠️ Aucune vente impayée dans la sélection.');
        return;
    }

    var msg = '💰 CONFIRMER LE PAIEMENT GROUPÉ ?\n\n';
    msg += '📊 Nombre de ventes : ' + ventesAPayer.length + '\n';
    msg += '💵 Total à encaisser : ' + totalGlobal.toFixed(2) + ' MAD\n';
    msg += '\n⚠️ Cette action est IRRÉVERSIBLE.\n';
    msg += 'Les ventes seront marquées comme PAYÉES.';

    if (!confirm(msg)) return;

    var payerBtn = document.getElementById('payerSelectedVentesBtn');
    if (payerBtn) {
        payerBtn.disabled = true;
        payerBtn.innerHTML = '⏳ Traitement...';
    }

    try {
        var batch = db.batch();
        var batchCount = 0;
        var now = firebase.firestore.FieldValue.serverTimestamp();

        for (var i = 0; i < ventesAPayer.length; i++) {
            var vente = ventesAPayer[i];
            var ref = db.collection('ventes').doc(vente.id);

            batch.update(ref, {
                paid: true,
                statutPaiement: 'payé',
                remainingAmount: 0,
                amountGiven: vente.total || 0,
                change: 0,
                datePaiement: now,
                paidAt: now,
                paidBy: window.currentUserData
                    ? (window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom)
                    : 'Admin',
                paymentMethod: 'espece'
            });

            batchCount++;

            if (batchCount >= 450) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        for (var j = 0; j < ventesAPayer.length; j++) {
            var vente2 = ventesAPayer[j];
            try {
                var creditsSnap = await db.collection('credits')
                    .where('factureNum', '==', vente2.factureNum)
                    .where('paid', '==', false)
                    .get();

                if (!creditsSnap.empty) {
                    var batch2 = db.batch();
                    creditsSnap.forEach(function(doc) {
                        batch2.update(doc.ref, {
                            paid: true,
                            remainingAmount: 0,
                            amountGiven: doc.data().total || 0,
                            datePaiement: now,
                            paidAt: now,
                            updatedAt: now
                        });
                    });
                    await batch2.commit();
                    console.log('✅ Crédit(s) marqué(s) payé(s) pour facture:', vente2.factureNum);
                }
            } catch(e) {
                console.warn('⚠️ Erreur mise à jour crédit:', e);
            }
        }

        ventesAPayer.forEach(function(v) {
            v.paid = true;
            v.statutPaiement = 'payé';
            v.remainingAmount = 0;
            v.amountGiven = v.total || 0;
            v.change = 0;
        });

        var paiements = ventesAPayer.map(function(v) {
            return {
                venteId: v.id,
                factureNum: v.factureNum || v.id.substring(0, 8),
                clientId: v.clientId,
                clientName: v.clientName || 'Client inconnu',
                montantPaye: v.remainingAmount || v.total || 0,
                totalVente: v.total || 0,
                items: v.items || []
            };
        });

        var facturePaiement = await creerFacturePaiementVentes(paiements, totalGlobal);

        ventesSelectionnees.clear();
        window.venteSelectedIds = [];
        window.venteSelectedClientId = null;
        window.venteSelectedClientName = null;
        selectAllVentesBtnState = false;

        applyVentesFilters();
        updateVenteSelectionUI();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('ventes');
            CacheDB.saveCollection('credits');
        }

        console.log('✅ Paiement groupé terminé :', ventesAPayer.length, 'vente(s),', totalGlobal.toFixed(2), 'MAD');

        await posAfficherOptionWhatsAppPaiementVentes(facturePaiement, ventesAPayer);

    } catch(e) {
        console.error('❌ Erreur paiement groupé :', e);
        alert('❌ Erreur lors du paiement groupé : ' + e.message);
    } finally {
        if (payerBtn) {
            payerBtn.disabled = false;
        }
        updateVenteSelectionUI();
    }
}
window.payerVentesSelectionnees = payerVentesSelectionnees;

// ============================================================
// ✅ CRÉER UNE FACTURE DE PAIEMENT DE VENTES
// ============================================================
async function creerFacturePaiementVentes(paiements, totalPaye) {
    var factureCounter = parseInt(localStorage.getItem('factureCounter')) || 0;
    factureCounter++;
    localStorage.setItem('factureCounter', factureCounter);
    var numFacture = 'PAI-' + new Date().getFullYear() + '-' + String(factureCounter).padStart(5, '0');

    var clientIds = [...new Set(paiements.map(p => p.clientId).filter(Boolean))];
    var clientNames = [...new Set(paiements.map(p => p.clientName).filter(Boolean))];
    var clientId = clientIds.length === 1 ? clientIds[0] : null;
    var clientName = clientNames.length === 1 ? clientNames[0] : (clientNames.length + ' clients');

    var vendeur = '';
    if (window.currentUserData) {
        vendeur = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
    }

    var items = paiements.map(function(p) {
        return {
            id: p.venteId,
            nom: 'Vente #' + p.factureNum + (p.clientName ? ' - ' + p.clientName : ''),
            quantite: 1,
            prixVente: p.montantPaye,
            prixAchat: 0,
            prixPromo: 0,
            profit: 0
        };
    });

    var factureData = {
        factureNum: numFacture,
        items: items,
        subtotal: totalPaye,
        discountMAD: 0,
        total: totalPaye,
        clientId: clientId,
        clientName: clientName,
        table: null,
        vendeur: vendeur,
        paymentMethod: 'espece',
        statutPaiement: 'payé',
        amountGiven: totalPaye,
        change: 0,
        paid: true,
        remainingAmount: 0,
        profitTotal: 0,
        type: 'paiement_ventes',
        ventesPayees: paiements.map(p => ({
            venteId: p.venteId,
            factureNum: p.factureNum,
            montantPaye: p.montantPaye,
            clientName: p.clientName
        })),
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };

    try {
        if (navigator.onLine) {
            var sd = Object.assign({}, factureData, {
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            var docRef = await db.collection('factures_paiement').add(sd);
            factureData.id = docRef.id;

            if (typeof CacheDB !== 'undefined' && CacheDB.set) {
                await CacheDB.set('factures_paiement', docRef.id, Object.assign({id: docRef.id}, factureData));
            }
        } else {
            factureData.id = 'offline_' + Date.now();
            var facturesLS = JSON.parse(localStorage.getItem('facturesPaiementOffline') || '[]');
            facturesLS.push(factureData);
            localStorage.setItem('facturesPaiementOffline', JSON.stringify(facturesLS));
        }
    } catch(e) {
        console.warn('⚠️ Erreur sauvegarde facture paiement:', e);
    }

    return factureData;
}
window.creerFacturePaiementVentes = creerFacturePaiementVentes;

// ============================================================
// 📱 AFFICHER LE MODAL WHATSAPP AVEC TOUS LES DÉTAILS
// ============================================================
async function posAfficherOptionWhatsAppPaiementVentes(factureData, ventesDetaillees) {
    try {
        var clientName = 'Client';
        var clientId = null;

        var clientsUniques = new Set();
        ventesDetaillees.forEach(function(v) {
            if (v.clientName && v.clientName !== 'Passager' && v.clientName !== 'Client inconnu') {
                clientsUniques.add(v.clientName);
            }
        });

        if (clientsUniques.size === 1) {
            clientName = Array.from(clientsUniques)[0];
            for (var k = 0; k < ventesDetaillees.length; k++) {
                if (ventesDetaillees[k].clientName === clientName && ventesDetaillees[k].clientId) {
                    clientId = ventesDetaillees[k].clientId;
                    break;
                }
            }
        } else if (clientsUniques.size > 1) {
            clientName = clientsUniques.size + ' clients';
        }

        var clientTel = '';
        if (clientId) {
            var client = (window.clientsDataForSearch || []).find(function(c) { return c.id === clientId; });
            if (client) {
                clientTel = client.telephone || client.whatsapp || '';
            }
            if (!clientTel && navigator.onLine) {
                try {
                    var clientDoc = await db.collection('clients').doc(clientId).get();
                    if (clientDoc.exists) {
                        var cData = clientDoc.data();
                        clientTel = cData.telephone || cData.whatsapp || '';
                    }
                } catch(e) {}
            }
        }

        var telDisplay = clientTel ? clientTel.replace(/\D/g, '') : '';
        var dateStr = new Date().toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        var messageWhatsApp = '';
        messageWhatsApp += '✅ *REÇU DE PAIEMENT*\n';
        messageWhatsApp += '━━━━━━━━━━━━━━━━━━━━━\n';
        messageWhatsApp += '📄 Reçu N° : ' + factureData.factureNum + '\n';
        messageWhatsApp += '📅 Date : ' + dateStr + '\n';
        messageWhatsApp += '👤 Client : ' + clientName + '\n';
        messageWhatsApp += '━━━━━━━━━━━━━━━━━━━━━\n\n';

        for (var i = 0; i < ventesDetaillees.length; i++) {
            var vente = ventesDetaillees[i];
            var factureNum = vente.factureNum || vente.id.substring(0, 8);
            var sousTotal = vente.total || 0;
            var restant = vente.remainingAmount || 0;

            messageWhatsApp += '📋 *FACTURE #' + factureNum + '*\n';

            if (vente.createdAt && vente.createdAt.seconds) {
                var vDate = new Date(vente.createdAt.seconds * 1000);
                messageWhatsApp += '   📅 ' + vDate.toLocaleDateString('fr-FR') + ' ' + vDate.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) + '\n';
            }

            if (vente.items && vente.items.length > 0) {
                messageWhatsApp += '   *Produits :*\n';
                vente.items.forEach(function(item) {
                    var prix = item.prixVente || item.prixUnitaire || 0;
                    var qte = item.quantite || 1;
                    var totalItem = prix * qte;

                    var opts = '';
                    if (item.interdits && item.interdits.length) opts += ' 🚫' + item.interdits.join(',');
                    if (item.epice && item.epice !== 'Normal') opts += ' 🌶️' + item.epice;
                    if (item.sel && item.sel !== 'Normal') opts += ' 🧂' + item.sel;

                    messageWhatsApp += '   • ' + qte + 'x ' + item.nom + opts + ' → ' + totalItem.toFixed(2) + ' MAD\n';
                });
            }

            messageWhatsApp += '   💵 Sous-total : ' + sousTotal.toFixed(2) + ' MAD\n';

            if (restant > 0) {
                messageWhatsApp += '   ⏳ Restant payé : ' + restant.toFixed(2) + ' MAD\n';
            }

            messageWhatsApp += '\n';
        }

        messageWhatsApp += '━━━━━━━━━━━━━━━━━━━━━\n';
        messageWhatsApp += '💵 *TOTAL GÉNÉRAL : ' + factureData.total.toFixed(2) + ' MAD*\n';
        messageWhatsApp += '💳 Mode : Espèces\n';
        messageWhatsApp += '📊 Nombre de factures : ' + ventesDetaillees.length + '\n';
        messageWhatsApp += '━━━━━━━━━━━━━━━━━━━━━\n';
        messageWhatsApp += 'Merci pour votre règlement ! 🙏\n';
        messageWhatsApp += 'E-SOLUTION POS';

        window._posWhatsAppPaiementData = {
            message: messageWhatsApp,
            clientTel: clientTel,
            clientName: clientName,
            clientId: clientId,
            factureNum: factureData.factureNum
        };

        var telInfo = telDisplay
            ? '<strong>📞 Téléphone :</strong> ' + escapeHtml(clientTel) + ' <span style="color:#10B981;">✅</span>'
            : '<em style="color:#92400E;">⚠️ Aucun numéro de téléphone enregistré</em>';

        var confirmHtml = `
            <div style="padding:16px;text-align:center;">
                <div style="font-size:3rem;margin-bottom:8px;">✅</div>
                <h3 style="margin:0 0 4px;color:#10B981;font-size:1.3rem;font-weight:700;">Paiement enregistré !</h3>
                <p style="color:#64748b;margin:0 0 16px;font-size:0.95rem;">
                    Reçu <strong>${escapeHtml(factureData.factureNum)}</strong> — <strong>${factureData.total.toFixed(2)} MAD</strong>
                </p>

                <div style="padding:14px;background:#F0FDF4;border:2px solid #10B981;border-radius:10px;margin-bottom:16px;text-align:left;">
                    <p style="margin:0;font-size:0.9rem;color:#065F46;">
                        <strong>👤 Client :</strong> ${escapeHtml(clientName)}<br>
                        <strong>📄 Nb factures :</strong> ${ventesDetaillees.length}<br>
                        <strong>💰 Total :</strong> ${factureData.total.toFixed(2)} MAD<br>
                        ${telInfo}
                    </p>
                </div>

                <p style="color:#334155;font-weight:600;margin-bottom:12px;font-size:1rem;">
                    📱 Voulez-vous envoyer le reçu détaillé par WhatsApp${telDisplay ? ' au ' + escapeHtml(clientTel) : ''} ?
                </p>

                <div style="display:flex;gap:8px;">
                    <button onclick="posFermerModalWhatsAppPaiementVentes()"
                        style="flex:1;padding:12px;background:#e2e8f0;color:#475569;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;">
                        ❌ Non
                    </button>
                    <button onclick="posEnvoyerWhatsAppPaiementVentes()"
                        style="flex:2;padding:12px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 14px rgba(37,211,102,0.3);">
                        <i class="fab fa-whatsapp" style="font-size:1.2rem;"></i> Envoyer WhatsApp
                    </button>
                </div>
            </div>
        `;

        openModal('🧾 Paiement validé', confirmHtml);

    } catch(e) {
        console.error('❌ Erreur posAfficherOptionWhatsAppPaiementVentes:', e);
    }
}
window.posAfficherOptionWhatsAppPaiementVentes = posAfficherOptionWhatsAppPaiementVentes;

// ============================================================
// 📱 ENVOYER WHATSAPP POUR LE PAIEMENT
// ============================================================
function posEnvoyerWhatsAppPaiementVentes() {
    try {
        var data = window._posWhatsAppPaiementData;
        if (!data) {
            alert('❌ Aucune facture en mémoire.');
            closeModal();
            return;
        }

        var message = data.message || '';
        var tel = (data.clientTel || '').replace(/\D/g, '');

        if (tel) {
            if (tel.startsWith('0')) {
                tel = '212' + tel.substring(1);
            } else if (tel.startsWith('+')) {
                tel = tel.replace(/\D/g, '');
            }
        }

        var url;
        if (tel && tel.length >= 8) {
            url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(message);
            console.log('📱 [WhatsApp] Envoi au numéro :', tel);
        } else {
            url = 'https://wa.me/?text=' + encodeURIComponent(message);
            console.log('📱 [WhatsApp] Aucun numéro — WhatsApp Web sans destinataire');
        }

        window.open(url, '_blank');
        closeModal();
        window._posWhatsAppPaiementData = null;

    } catch(e) {
        console.error('❌ Erreur posEnvoyerWhatsAppPaiementVentes:', e);
        alert('❌ Erreur WhatsApp : ' + e.message);
    }
}
window.posEnvoyerWhatsAppPaiementVentes = posEnvoyerWhatsAppPaiementVentes;

function posFermerModalWhatsAppPaiementVentes() {
    window._posWhatsAppPaiementData = null;
    closeModal();
}
window.posFermerModalWhatsAppPaiementVentes = posFermerModalWhatsAppPaiementVentes;

// ==================== PAGINATION ====================

function getPaginationHTML(pageType, totalItems) {
    var perPage = window.itemsPerPage || 15;
    var totalPages = Math.ceil(totalItems / perPage);
    var cp = window.currentPages[pageType] || 1;
    if (totalPages <= 1) return '';
    var html = '<div style="display:flex;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap;">';
    html += '<button onclick="changePage(\'' + pageType + '\', 1)" ' + (cp <= 1 ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;">⏮</button>';
    html += '<button onclick="changePage(\'' + pageType + '\', ' + Math.max(1, cp - 1) + ')" ' + (cp <= 1 ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;">◀</button>';
    html += '<span style="padding:6px 12px;">' + cp + ' / ' + totalPages + '</span>';
    html += '<button onclick="changePage(\'' + pageType + '\', ' + Math.min(totalPages, cp + 1) + ')" ' + (cp >= totalPages ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;">▶</button>';
    html += '<button onclick="changePage(\'' + pageType + '\', ' + totalPages + ')" ' + (cp >= totalPages ? 'disabled' : '') + ' style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;">⏭</button>';
    html += '</div>';
    return html;
}

function changePage(pageType, page) {
    console.log('🔄 changePage appelé:', pageType, page);
    
    var totalItems = 0;
    if (pageType === 'ventes') {
        totalItems = window.filteredVentes ? window.filteredVentes.length : (window.allVentesData || []).length;
    } else if (pageType === 'credits') {
        totalItems = window.filteredCredits ? window.filteredCredits.length : (window.allCreditsData || []).length;
    } else if (pageType === 'commandes') {
        totalItems = window.filteredCommandes ? window.filteredCommandes.length : (window.allCommandesData || []).length;
    }
    
    var perPage = window.itemsPerPage || 15;
    var totalPages = Math.ceil(totalItems / perPage);
    if (page < 1 || page > totalPages) return;
    
    window.currentPages[pageType] = page;
    console.log('📄 Page courante:', page);
    
    if (pageType === 'ventes' && typeof window.renderVentesTablePro === 'function') {
        window.renderVentesTablePro();
    } else if (pageType === 'credits' && typeof window.renderCreditsTablePro === 'function') {
        window.renderCreditsTablePro();
    } else if (pageType === 'commandes' && typeof window.renderCommandesTablePro === 'function') {
        window.renderCommandesTablePro();
    }
}

// ==================== EXPOSITION DES FONCTIONS GLOBALES ====================

window.loadCommandesPage = loadCommandesPage;
window.loadCommandes = loadCommandes;
window.applyCommandesFilters = applyCommandesFilters;
window.renderCommandesTablePro = renderCommandesTablePro;
window.validateCommande = validateCommande;
window.payCommande = payCommande;
window.cancelCommande = cancelCommande;
window.loadVentesPage = loadVentesPage;
window.loadVentes = loadVentes;
window.applyVentesFilters = applyVentesFilters;
window.renderVentesTablePro = renderVentesTablePro;
window.editVente = editVente;
window.saveEditVente = saveEditVente;
window.deleteVente = deleteVente;
window.payerVente = payerVente;
window.confirmVentePayment = confirmVentePayment;
window.printFacture = printFacture;
window.imprimerFacture = imprimerFacture;
window.sendWhatsApp = sendWhatsApp;
window.clearSearch = clearSearch;
window.handleSearchInput = handleSearchInput;
window.injectVentesStyles = injectVentesStyles;
window.detectPeriodFilterVentes = detectPeriodFilterVentes;
window.processVentesSearchFromVoice = processVentesSearchFromVoice;
window.handleVentesSearch = handleVentesSearch;
window.clearVentesSearch = clearVentesSearch;
window.loadClientsForSearch = loadClientsForSearch;
window.filterVentesBySearchWithDescription = filterVentesBySearchWithDescription;
window.toggleVenteSelection = toggleVenteSelection;
window.toggleAllVentesSelection = toggleAllVentesSelection;
window.deleteSelectedVentes = deleteSelectedVentes;
window.updateVenteSelectionUI = updateVenteSelectionUI;
window.filterByPeriodWithDates = filterByPeriodWithDates;
window.updateVentesStats = updateVentesStats;
window.appliquerFiltreDatePersonnalise = appliquerFiltreDatePersonnalise;
window.reinitialiserFiltres = reinitialiserFiltres;

window.synchroVenteDepuisCredit = synchroVenteDepuisCredit;

window.openFactureDetails = openFactureDetails;
window.closeFactureDetails = closeFactureDetails;
window.loadFactureDetails = loadFactureDetails;
window.renderFactureDetails = renderFactureDetails;
window.printFactureDetails = printFactureDetails;

window.getPaginationHTML = window.getPaginationHTML || getPaginationHTML;
window.changePage = window.changePage || changePage;

window.renderVentesTable = window.renderVentesTablePro;
window.renderCommandesTable = window.renderCommandesTablePro;
window.renderCreditsTable = window.renderCreditsTablePro;

window.toggleVenteSelectionMode = toggleVenteSelectionMode;
window.selectAllVisibleVentes = selectAllVisibleVentes;
window.deselectAllVisibleVentes = deselectAllVisibleVentes;
window.toggleSelectAllVisibleVentes = toggleSelectAllVisibleVentes;
window.selectAllVentesBtnState = selectAllVentesBtnState;

window.payerVentesSelectionnees = payerVentesSelectionnees;
window.creerFacturePaiementVentes = creerFacturePaiementVentes;
window.posAfficherOptionWhatsAppPaiementVentes = posAfficherOptionWhatsAppPaiementVentes;
window.posEnvoyerWhatsAppPaiementVentes = posEnvoyerWhatsAppPaiementVentes;
window.posFermerModalWhatsAppPaiementVentes = posFermerModalWhatsAppPaiementVentes;

window.renderDatePaiementCell = renderDatePaiementCell;

// ✅ NOUVELLE FONCTION EXPOSÉE
window.filtrerVentesParClient = filtrerVentesParClient;

// 🆕 Graphique
window.renderVentesChart = renderVentesChart;
window.toggleVentesChart = toggleVentesChart;

console.log('🚀 E-SOLUTION - Admin Ventes PRO chargé');
console.log('✅ 📴 Ventes hors-ligne affichées (localStorage)');
console.log('✅ Détails facture modal ajouté - Font size agrandi');
console.log('✅ Pagination corrigée - Utilise window.itemsPerPage');
console.log('✅ Statistiques en haut de page avec filtres de date');
console.log('✅ Filtres rapides : Aujourd\'hui, 3j, 7j, 15j, 30j, 90j, 365j');
console.log('✅ Boutons avec texte - Style moderne comme admin credits');
console.log('✅ Synchronisation avec admin credits');
console.log('✅ Sélection en masse');
console.log('✅ Articles et Options visibles pour tout le monde');
console.log('✅ 💰 NOUVEAU : Bouton "Payer tout" pour paiement groupé');
console.log('✅ 📱 NOUVEAU : WhatsApp détaillé avec toutes les factures + produits + sous-totaux + total général');
console.log('✅ 🎨 NOUVEAU : Design MODERNE identique à admin-credits');
console.log('✅ 💰 NOUVEAU : Paiement direct dans Admin Ventes (pas de redirection POS)');
console.log('✅ 📅 NOUVEAU : Enregistrement automatique de la date de paiement (datePaiement)');
console.log('✅ 🔄 NOUVEAU : Synchronisation vente ↔ crédit (B1)');
console.log('✅ 📅 NOUVEAU : Colonne "Date paiement" dans la liste des ventes');
console.log('✅ 🖱️ NOUVEAU : Nom du client CLIQUABLE → filtre automatique');
console.log('✅ ⚠️ NOUVEAU : DIALOGUE OUI/NON pour multi-clients');
console.log('🆕 ✅ FILTRE : "Partiel" fusionné avec "Crédit" → option "Crédit + Partiel"');
console.log('🆕 ✅ GRAPHIQUE : CA / Profit / Crédits qui s\'adapte aux filtres (heure/jour/mois)');
console.log('🆕 ✅ BOUTON : Afficher / Masquer le graphique (état sauvegardé)');
console.log('🔧 CORRECTION : Suppression de .limit(2000) → charge TOUTES les ventes');
console.log('🔧 CORRECTION FILTRE CLIENT : filtrerVentesParClient utilise maintenant clientId (cohérence avec admin-credits)');
