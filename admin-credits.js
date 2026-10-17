// ==================== ADMIN-CREDITS.JS - E-SOLUTION ====================
// Version : Design PRO - Facture/Date/Client en colonnes séparées
// BOUTONS AVEC TEXTE - PAS D'ICÔNES (pour garantir l'affichage)
// Version FINALE - AVEC MODAL DÉTAILS FACTURE ET PAIEMENT CRÉDIT
// ✅ PAGINATION CORRIGÉE
// ✅ CAISSIER PEUT : MARQUER PAYÉ, MODIFIER, ENVOYER WHATSAPP
// ✅ RETOUR AU PAIEMENT DEPUIS LE POS (UNIQUEMENT SI VENU DU POS)
// ✅ PRÉ-SÉLECTION DU CLIENT AVEC RECHERCHE AUTO
// ✅ STATISTIQUES EN HAUT DE PAGE AVEC FILTRES DE DATE
// ✅ SYNCHRONISATION AVEC ADMIN VENTES : Quand un crédit est payé, la vente se met à jour
// ✅ SEUL L'ADMIN PEUT SUPPRIMER - LE CAISSIER N'A PAS LE BOUTON SUPPRIMER
// ✅ GESTION DES CRÉDITS À 0 MAD : Marqué comme payé automatiquement
// ✅ NOUVEAU : Bouton "Marquer payé" pour paiement groupé
// ✅ NOUVEAU : Création de facture de paiement + envoi WhatsApp après paiement
// ✅ NOUVEAU : Récupération du numéro client depuis Firestore + envoi WhatsApp direct
// ✅ 📱 NOUVEAU : WhatsApp DÉTAILLÉ avec toutes les factures + produits + sous-totaux + total général
// ✅ ⚠️ NOUVEAU : DIALOGUE OUI/NON pour multi-clients
// ✅ 👥 NOUVEAU : Affichage des 2 noms de clients dans la facture WhatsApp
// ✅ 🎨 NOUVEAU : Design MODERNE (cartes stats, table épurée, badges, boutons colorés)
// ✅ 🖱️ NOUVEAU : Nom du client CLIQUABLE → filtre automatique
// ✅ ↔️ NOUVEAU : SCROLL HORIZONTAL + VERTICAL sur la table (comme admin-ventes)
// ✅ 📅 NOUVEAU : Enregistrement + affichage de la date de paiement (datePaiement)
// 🔧 CORRECTION CRITIQUE : Admin-Credits lit désormais depuis la collection 'ventes' (filtrée crédit/partiel)
//    → Mêmes colonnes que Admin-Ventes (Date paiement, Options, Achat, Profit, Remise, Donné, Restant, Rendu, Statut, Vendeur, Paiement)
//    → La collection 'credits' reste mise à jour en parallèle pour compatibilité POS

// ========== VARIABLES GLOBALES ==========
window.creditsPeriod = window.creditsPeriod || 'all';
window.creditsSearch = window.creditsSearch || '';
window.creditSelectionMode = false;
window.creditSelectedIds = [];
window.allCreditsData = window.allCreditsData || [];
window.clientsDataForSearch = window.clientsDataForSearch || [];
window._posFilterClientId = null;
window._posFilterClientName = null;
window._fromPos = false;
window.creditsDateDebut = window.creditsDateDebut || '';
window.creditsDateFin = window.creditsDateFin || '';

// ✅ Filtre multi-clients
window.creditSelectedClientId = null;
window.creditSelectedClientName = null;

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

function normalize(str) {
return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function detectPeriodFilterCredits(text) {
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
if (cleaned.includes("tout") || cleaned.includes("toutes") || cleaned.includes("all") || cleaned.includes("tous") || cleaned.includes("toute les credits") || cleaned.includes("tout les crédits")) {
return 'all';
}
return null;
}

async function loadClientsForSearchCredits() {
try {
const snapshot = await db.collection('clients').limit(2000).get();
window.clientsDataForSearch = [];
snapshot.forEach(doc => {
var d = doc.data();
d.id = doc.id;
window.clientsDataForSearch.push(d);
});
console.log('📋 Clients chargés pour recherche description (Crédits):', window.clientsDataForSearch.length);
} catch(e) {
console.warn('Erreur chargement clients pour recherche:', e);
window.clientsDataForSearch = [];
}
}

function filterCreditsBySearchWithDescription(data, query) {
if (!query || query.trim() === '') return data;

var q = query.toLowerCase().trim();
var results = [];
var clientsMap = {};

window.clientsDataForSearch.forEach(function(c) {
clientsMap[c.id] = c;
});

data.forEach(function(credit) {
var match = false;
var clientInfo = null;

if (credit.clientName && credit.clientName.toLowerCase().indexOf(q) !== -1) {
match = true;
}

if (!match && credit.items) {
for (var i = 0; i < credit.items.length; i++) {
if (credit.items[i].nom && credit.items[i].nom.toLowerCase().indexOf(q) !== -1) {
match = true;
break;
}
}
}

if (!match && credit.clientId && clientsMap[credit.clientId]) {
var client = clientsMap[credit.clientId];
var description = client.description || '';
if (description.toLowerCase().indexOf(q) !== -1) {
match = true;
clientInfo = client;
}
}

if (!match && credit.clientName && !credit.clientId) {
for (var id in clientsMap) {
var c = clientsMap[id];
var fullName = (c.nom || '') + ' ' + (c.prenom || '');
if (fullName.trim().toLowerCase() === credit.clientName.toLowerCase()) {
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
credit._clientDisplayName = (clientInfo.nom || '') + ' ' + (clientInfo.prenom || '');
} else if (credit.clientId && clientsMap[credit.clientId]) {
var c = clientsMap[credit.clientId];
credit._clientDisplayName = (c.nom || '') + ' ' + (c.prenom || '');
} else {
credit._clientDisplayName = credit.clientName || credit.table || 'Client inconnu';
}
results.push(credit);
}
});

return results;
}

function renderCreditFactureCell(credit) {
const factureNum = credit.factureNum || credit.id?.substring(0, 8) || '---';
return `
<div class="facture-cell">
<i class="fas fa-file-invoice"></i>
<span class="facture-number">#${factureNum}</span>
</div>
`;
}

function renderCreditDateCell(credit) {
const dt = credit.createdAt ? formatDateHeure(credit.createdAt.seconds) : { date: '-', time: '-', full: '-' };
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

// ✅ Date de paiement (comme admin-ventes)
function renderCreditDatePaiementCell(credit) {
    if (credit.datePaiement && credit.datePaiement.seconds) {
        const dt = formatDateHeure(credit.datePaiement.seconds);
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
window.renderCreditDatePaiementCell = renderCreditDatePaiementCell;

// ✅ MODIFIÉ : Nom du client CLIQUABLE
function renderCreditClientCell(credit) {
    var clientName = credit._clientDisplayName || credit.clientName || credit.table || 'Client inconnu';
    var escapedName = escapeHtml(clientName).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    return `
        <div class="client-cell" onclick="filtrerParClient('${escapedName}', event)" title="Cliquer pour filtrer par ce client">
            <i class="fas fa-user-circle"></i>
            <span>${escapeHtml(clientName)}</span>
        </div>
    `;
}

// ✅ CSS MODERNE - Design PRO
function injectCreditsStyles() {
const styleId = 'credits-pro-styles-final';
if (document.getElementById(styleId)) return;

const styles = `
<style id="${styleId}">
#creditsPage,
#creditsPage * {
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* ✅ Container principal */
#creditsPage {
background: linear-gradient(180deg, #FAFBFC 0%, #F4F6F8 100%) !important;
padding: 20px !important;
border-radius: 16px !important;
}

/* ✅ Carte header avec ombre douce */
#creditsPage .card-header {
background: #FFFFFF !important;
padding: 24px !important;
border-radius: 16px !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
margin-bottom: 20px !important;
}

#creditsPage .card-header h3 {
font-size: 24px !important;
font-weight: 800 !important;
color: #0F172A !important;
letter-spacing: -0.5px !important;
display: flex !important;
align-items: center !important;
gap: 10px !important;
}

#creditsPage .card-header h3 i {
background: linear-gradient(135deg, #14B8A6, #0D9488) !important;
color: #fff !important;
padding: 8px !important;
border-radius: 10px !important;
font-size: 18px !important;
box-shadow: 0 4px 12px rgba(20,184,166,0.25) !important;
}

/* ✅ Statistiques en cartes modernes */
.credits-stats-grid {
display: grid !important;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
gap: 16px !important;
margin-bottom: 20px !important;
padding: 0 !important;
background: transparent !important;
border: none !important;
}

.credits-stat-card {
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

.credits-stat-card::before {
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

.credits-stat-card:hover {
transform: translateY(-3px) !important;
box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.06) !important;
}

.credits-stat-card:hover::before {
opacity: 1 !important;
}

.credits-stat-card .stat-value {
font-size: 24px !important;
font-weight: 800 !important;
color: #0F172A !important;
letter-spacing: -0.5px !important;
display: block !important;
line-height: 1.2 !important;
margin: 0 !important;
}

.credits-stat-card .stat-value.green { color: #10B981 !important; }
.credits-stat-card .stat-value.blue { color: #3B82F6 !important; }
.credits-stat-card .stat-value.orange { color: #F59E0B !important; }
.credits-stat-card .stat-value.red { color: #EF4444 !important; }

.credits-stat-card .stat-label {
font-size: 12px !important;
font-weight: 600 !important;
color: #64748B !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
margin: 4px 0 0 0 !important;
display: block !important;
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
#creditsPage .filter-group label {
font-size: 12px !important;
font-weight: 600 !important;
color: #64748B !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
}

#creditsPage .filter-group select {
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

#creditsPage .filter-group select:hover {
border-color: #CBD5E1 !important;
}

#creditsPage .filter-group select:focus {
border-color: #14B8A6 !important;
outline: none !important;
box-shadow: 0 0 0 4px rgba(20,184,166,0.1) !important;
}

/* ✅ Boutons modernes */
#creditsPage .btn-add {
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

#creditsPage .btn-add:hover {
transform: translateY(-2px) !important;
box-shadow: 0 4px 12px rgba(20,184,166,0.35) !important;
}

/* ✅ Table moderne avec SCROLL HORIZONTAL + VERTICAL (comme admin-ventes) */
#creditsPage .table-container {
background: #FFFFFF !important;
border-radius: 14px !important;
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03) !important;
border: 1px solid rgba(0,0,0,0.04) !important;
overflow-x: auto !important;
overflow-y: auto !important;
max-height: 75vh !important;
-webkit-overflow-scrolling: touch !important;
}

#creditsPage .data-table {
width: 100% !important;
border-collapse: separate !important;
border-spacing: 0 !important;
min-width: 1400px !important;
}

#creditsPage .data-table thead th {
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

#creditsPage .data-table thead th i {
font-size: 13px !important;
margin-right: 6px !important;
color: #94A3B8 !important;
}

#creditsPage .data-table tbody td {
padding: 16px 18px !important;
font-size: 14px !important;
vertical-align: middle !important;
background: #FFFFFF !important;
border-bottom: 1px solid #F1F5F9 !important;
color: #334155 !important;
}

#creditsPage .data-table tbody tr {
transition: background 0.15s ease !important;
}

#creditsPage .data-table tbody tr:hover td {
background: #FAFBFC !important;
}

#creditsPage .data-table tbody tr:last-child td {
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

/* ✅ ✅ ✅ Client cliquable */
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
cursor: pointer !important;
transition: all 0.2s ease !important;
user-select: none !important;
}

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

.client-cell i {
color: #14B8A6 !important;
font-size: 13px !important;
transition: color 0.2s ease !important;
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
#creditsPage .status-success,
#creditsPage .status-warning,
#creditsPage .status-danger {
font-size: 12px !important;
padding: 4px 10px !important;
border-radius: 6px !important;
font-weight: 600 !important;
display: inline-flex !important;
align-items: center !important;
gap: 4px !important;
}

/* ✅ Boutons d'action compacts */
#creditsPage .action-buttons {
display: flex !important;
align-items: center !important;
justify-content: center !important;
gap: 4px !important;
flex-wrap: nowrap !important;
min-width: 160px !important;
}

#creditsPage .action-buttons .btn-print,
#creditsPage .action-buttons .btn-whatsapp,
#creditsPage .action-buttons .btn-payer,
#creditsPage .action-buttons .btn-edit,
#creditsPage .action-buttons .btn-delete {
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
}

#creditsPage .action-buttons .btn-print {
    background: #EEF2FF !important;
    color: #4F46E5 !important;
}
#creditsPage .action-buttons .btn-print:hover {
    background: #4F46E5 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

#creditsPage .action-buttons .btn-whatsapp {
    background: #ECFDF5 !important;
    color: #059669 !important;
}
#creditsPage .action-buttons .btn-whatsapp:hover {
    background: #25D366 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

#creditsPage .action-buttons .btn-payer {
    background: #F0FDF4 !important;
    color: #16A34A !important;
}
#creditsPage .action-buttons .btn-payer:hover {
    background: #10B981 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

#creditsPage .action-buttons .btn-edit {
    background: #FFF7ED !important;
    color: #EA580C !important;
}
#creditsPage .action-buttons .btn-edit:hover {
    background: #F59E0B !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

#creditsPage .action-buttons .btn-delete {
    background: #FEF2F2 !important;
    color: #DC2626 !important;
}
#creditsPage .action-buttons .btn-delete:hover {
    background: #EF4444 !important;
    color: #fff !important;
    transform: translateY(-1px) !important;
}

/* ✅ Total impayés */
.total-row-pro {
display: flex !important;
justify-content: flex-end !important;
align-items: center !important;
gap: 16px !important;
padding: 18px 24px !important;
background: linear-gradient(135deg, #FEF2F2, #FEE2E2) !important;
border-radius: 12px !important;
margin-top: 16px !important;
border: 1px solid #FECACA !important;
}

.total-row-pro .total-label {
font-size: 13px !important;
font-weight: 700 !important;
color: #991B1B !important;
text-transform: uppercase !important;
letter-spacing: 0.5px !important;
}

.total-row-pro .total-amount {
font-size: 20px !important;
font-weight: 800 !important;
color: #DC2626 !important;
letter-spacing: -0.5px !important;
display: flex !important;
align-items: center !important;
gap: 8px !important;
}

.total-row-pro .total-amount i {
color: #EF4444 !important;
font-size: 16px !important;
}

/* ✅ Responsive */
@media(max-width:768px) {
    #creditsPage {
        padding: 12px !important;
    }
    
    #creditsPage .card-header {
        padding: 16px !important;
    }
    
    .credits-stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
    }
    
    .credits-stat-card {
        padding: 14px !important;
    }
    
    .credits-stat-card .stat-value {
        font-size: 18px !important;
    }
    
    #creditsPage .data-table thead th,
    #creditsPage .data-table tbody td {
        padding: 12px 10px !important;
        font-size: 12px !important;
    }
    
    #creditsPage .action-buttons .btn-print,
    #creditsPage .action-buttons .btn-whatsapp,
    #creditsPage .action-buttons .btn-payer,
    #creditsPage .action-buttons .btn-edit,
    #creditsPage .action-buttons .btn-delete {
        padding: 4px 8px !important;
        font-size: 10px !important;
        min-height: 24px !important;
    }
}

@media(max-width:500px) {
    .credits-stats-grid {
        grid-template-columns: 1fr !important;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);
}

// ==================== PAGE CRÉDITS ====================
async function loadCreditsPage(c) {
injectCreditsStyles();

await loadClientsForSearchCredits();

var savedClientId = localStorage.getItem('posSelectedCreditClientId');
var savedClientName = localStorage.getItem('posSelectedCreditClientName');

if (savedClientId && savedClientName) {
    window._posFilterClientId = savedClientId;
    window._posFilterClientName = savedClientName;
    window._fromPos = true;
    localStorage.removeItem('posSelectedCreditClientId');
    localStorage.removeItem('posSelectedCreditClientName');
} else {
    window._posFilterClientId = null;
    window._posFilterClientName = null;
    window._fromPos = false;
}

window.creditsPeriod = 'all';
window.creditsSearch = '';
window.creditsDateDebut = '';
window.creditsDateFin = '';
window.creditSelectionMode = false;
window.creditSelectedIds = [];
window.creditSelectedClientId = null;
window.creditSelectedClientName = null;

if (!window.sortOrders.credits) window.sortOrders.credits = {};
if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';

var searchPlaceholder = window._posFilterClientName || 'Rechercher (client, produit, description)...';

var showBackButton = window._fromPos ? '' : 'display:none;';
var filterMessage = window._posFilterClientName ? 
    `<div style="padding:8px 12px; background:#f0fdf4; border-radius:8px; margin-top:8px; border:2px solid #14B8A6; font-size:14px; font-weight:600; color:#0D9488;">
        🔍 Client filtré : <strong>${escapeHtml(window._posFilterClientName)}</strong>
    </div>` : '';

c.innerHTML = `
<div class="content-card" id="creditsPage">
<div class="card-header">
<div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
    <h3 style="margin:0;"><i class="fas fa-credit-card"></i> Crédits</h3>
    <button id="creditsBackToPosBtn" onclick="retournerAuPaiement()" 
            style="${showBackButton} background:#6366f1; color:#fff; border:none; border-radius:8px; 
                   padding:8px 20px; font-size:14px; font-weight:700; cursor:pointer; 
                   display:flex; align-items:center; gap:8px;">
        <i class="fas fa-arrow-left"></i> Retour au paiement
    </button>
</div>
${filterMessage}
<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px;">
<div class="search-bar-pro">
<i class="fas fa-search"></i>
<input type="text" id="creditsSearchInput"
placeholder="${searchPlaceholder}"
onkeyup="handleCreditsSearch(this.value);">
<button class="search-clear-btn hidden" id="creditsClearBtn" onclick="clearCreditsSearch()" title="Effacer la recherche">
<i class="fas fa-times"></i>
</button>
</div>
<input type="text" id="creditsVoiceDisplay" placeholder="🎤 Audio..." class="voice-display-field" readonly style="display:none;">
<div class="filter-group">
<label><i class="far fa-calendar-alt"></i> Période</label>
<select id="creditsPeriodSelect" onchange="window.creditsPeriod = this.value; window.currentPages.credits=1; applyCreditsFilters();">
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
<button class="btn-add" onclick="loadCredits()">
<i class="fas fa-sync-alt"></i> Actualiser
</button>
<button id="toggleSelectionBtn" class="btn-add" onclick="toggleCreditSelectionMode()" style="background:#6366f1; box-shadow:0 2px 8px rgba(99,102,241,0.25);">
<i class="fas fa-check-square"></i> Sélectionner</button>
<button id="selectAllBtn" class="btn-add" onclick="toggleSelectAllVisible()" style="display:none; background:#4f46e5;">
<i class="fas fa-check-double"></i> Tout sélectionner
</button>
<button id="deleteSelectedBtn" class="btn-delete" onclick="deleteSelectedCredits()" style="display:none; background:#ef4444; color:#fff; padding:10px 18px; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer;">
<i class="fas fa-trash"></i> Supprimer
</button>
<button id="paySelectedBtn" class="btn-save" onclick="paySelectedCredits()" style="display:none; background:#10B981; color:#fff; padding:10px 18px; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(16,185,129,0.25);">
<i class="fas fa-check-circle"></i> Marquer payé
</button>
</div>
</div>
<div class="credits-stats-grid" id="creditsStatsGrid">
<div class="credits-stat-card">
<span class="stat-value blue" id="creditsStatsTotal">0.00</span>
<span class="stat-label">💰 Total Crédits</span>
</div>
<div class="credits-stat-card">
<span class="stat-value red" id="creditsStatsImpayes">0.00</span>
<span class="stat-label">⏳ Total Impayés</span>
</div>
<div class="credits-stat-card">
<span class="stat-value orange" id="creditsStatsCount">0</span>
<span class="stat-label">📊 Nombre de crédits</span>
</div>
<div class="credits-stat-card">
<span class="stat-value green" id="creditsStatsPaye">0.00</span>
<span class="stat-label">✅ Total Payé</span>
</div>
</div>
<div id="creditsTableContainer"></div>
<div id="creditsPagination" style="margin-top:12px;"></div>
</div>
`;

loadCredits();

if (window._posFilterClientName) {
    setTimeout(function() {
        var searchInput = document.getElementById('creditsSearchInput');
        if (searchInput) {
            searchInput.value = window._posFilterClientName;
            window.creditsSearch = window._posFilterClientName;
            applyCreditsFilters();
            var clearBtn = document.getElementById('creditsClearBtn');
            if (clearBtn) clearBtn.classList.remove('hidden');
        }
    }, 300);
}
}

function appliquerFiltreDatePersonnaliseCredits() {
var debut = document.getElementById('creditsDateDebut').value;
var fin = document.getElementById('creditsDateFin').value;
window.creditsDateDebut = debut;
window.creditsDateFin = fin;
document.getElementById('creditsPeriodSelect').value = 'all';
window.creditsPeriod = 'all';
applyCreditsFilters();
}
window.appliquerFiltreDatePersonnaliseCredits = appliquerFiltreDatePersonnaliseCredits;

function reinitialiserFiltresCredits() {
document.getElementById('creditsDateDebut').value = '';
document.getElementById('creditsDateFin').value = '';
window.creditsDateDebut = '';
window.creditsDateFin = '';
document.getElementById('creditsPeriodSelect').value = 'all';
window.creditsPeriod = 'all';
document.getElementById('creditsSearchInput').value = '';
window.creditsSearch = '';
window._posFilterClientId = null;
window._posFilterClientName = null;
window._fromPos = false;
applyCreditsFilters();
loadCreditsPage(document.getElementById('dynamicContent'));
}
window.reinitialiserFiltresCredits = reinitialiserFiltresCredits;

function handleCreditsSearch(value) {
window.creditsSearch = value;
window.currentPages.credits = 1;
handleSearchInputCredits('credits');
applyCreditsFilters();
}

function clearCreditsSearch() {
var searchField = document.getElementById('creditsSearchInput');
if (searchField) {
searchField.value = '';
window.creditsSearch = '';
window._posFilterClientId = null;
window._posFilterClientName = null;
window._fromPos = false;
applyCreditsFilters();
var clearBtn = document.getElementById('creditsClearBtn');
if (clearBtn) {
clearBtn.classList.add('hidden');
}
loadCreditsPage(document.getElementById('dynamicContent'));
}
}

function processCreditsSearchFromVoice(text) {
var searchField = document.getElementById('creditsSearchInput');
var periodSelect = document.getElementById('creditsPeriodSelect');
var voiceDisplay = document.getElementById('creditsVoiceDisplay');

if (!searchField || !periodSelect) return;

var detectedFilter = detectPeriodFilterCredits(text);
if (detectedFilter) {
periodSelect.value = detectedFilter;
window.creditsPeriod = detectedFilter;
window.currentPages.credits = 1;

searchField.value = '';
window.creditsSearch = '';

if (voiceDisplay) {
var filterLabels = {
'today': '📅 Aujourd\'hui',
'week': '📅 Cette semaine',
'month': '📅 Ce mois',
'year': '📅 Cette année',
'all': '📅 Tous les crédits'
};
voiceDisplay.value = filterLabels[detectedFilter] || '📅 Filtre appliqué';
setTimeout(function() { voiceDisplay.value = ''; }, 2000);
}

applyCreditsFilters();

var clearBtn = document.getElementById('creditsClearBtn');
if (clearBtn) clearBtn.classList.add('hidden');

return true;
}

searchField.value = text;
window.creditsSearch = text;
window.currentPages.credits = 1;
applyCreditsFilters();

return false;
}

function handleSearchInputCredits(target) {
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

// 🔧 CHARGEMENT DEPUIS 'ventes' (filtré crédit / partiel) - Même source que Admin-Ventes
async function loadCredits() {
    var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
    var vendeurCaissier = '';
    if (!isAdmin && window.currentUserData) {
        vendeurCaissier = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
    }

    // 🔥 ÉTAPE 1 : Charger TOUTES les ventes depuis Firestore (SANS LIMITE)
    if (navigator.onLine) {
        try {
            const snapshot = await db.collection('ventes').orderBy('createdAt', 'desc').get();
            window.allCreditsData = [];
            snapshot.forEach(function(dc) {
                var d = dc.data();
                d.id = dc.id;
                // ✅ FILTRE : garder uniquement crédit / partiel (non payées)
                var statut = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
                var isCredit = (statut === 'crédit' || statut === 'partiel') && !d.paid;
                if (!isCredit) return;

                // ✅ Calcul achat / profit (comme admin-ventes)
                var achat = 0, profit = 0;
                if (d.items) {
                    d.items.forEach(function(it) {
                        var pa = it.prixAchat || 0, pv = it.prixVente || 0, pp = it.prixPromo || 0,
                            pvr = (pp > 0) ? pp : pv, q = it.quantite || 1;
                        achat += pa * q;
                        profit += (pvr - pa) * q;
                    });
                }
                d.achat = achat;
                d.profit = profit;
                window.allCreditsData.push(d);
            });
            console.log('📥 Total crédits/partiels chargés depuis ventes :', window.allCreditsData.length);

            // 🔥 ÉTAPE 2 : Mettre en cache
            for (let doc of window.allCreditsData) {
                await CacheDB.set('credits', doc.id, doc);
            }
            console.log('💾 Cache mis à jour avec', window.allCreditsData.length, 'crédits');
        } catch (e) {
            console.error('❌ Erreur chargement ventes Firestore:', e);
            const cached = await CacheDB.getAll('credits');
            window.allCreditsData = cached.filter(function(d) {
                var statut = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
                return (statut === 'crédit' || statut === 'partiel') && !d.paid;
            });
            console.log('📴 Fallback cache:', window.allCreditsData.length, 'crédits');
        }
    } else {
        const cached = await CacheDB.getAll('credits');
        window.allCreditsData = cached.filter(function(d) {
            var statut = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
            return (statut === 'crédit' || statut === 'partiel') && !d.paid;
        });
        console.log('📴 Hors-ligne:', window.allCreditsData.length, 'crédits depuis le cache');
    }

    // 🔥 ÉTAPE 3 : Filtre vendeur pour caissier
    if (!isAdmin && vendeurCaissier) {
        window.allCreditsData = window.allCreditsData.filter(function(d) {
            return d.vendeur === vendeurCaissier;
        });
        console.log('👤 Crédits filtrés pour le caissier :', window.allCreditsData.length);
    }

    // 🔥 ÉTAPE 4 : Tri + affichage
    if (!window.sortOrders.credits) window.sortOrders.credits = {};
    if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';

    window.currentPages.credits = 1;
    applyCreditsFilters();
}

function applyCreditsFilters() {
var filtered = filterByPeriodWithDatesCredits(window.allCreditsData, window.creditsPeriod);

if (window.creditsDateDebut && window.creditsDateFin) {
var debut = new Date(window.creditsDateDebut);
debut.setHours(0, 0, 0, 0);
var fin = new Date(window.creditsDateFin);
fin.setHours(23, 59, 59, 999);
filtered = filtered.filter(function(d) {
if (!d.createdAt) return false;
var date = new Date(d.createdAt.seconds * 1000);
return date >= debut && date <= fin;
});
}

if (window._posFilterClientId) {
    filtered = filtered.filter(function(d) {
        return d.clientId === window._posFilterClientId;
    });
}

if (window.creditsSearch && window.creditsSearch.trim() !== '') {
filtered = filterCreditsBySearchWithDescription(filtered, window.creditsSearch);
} else {
filtered.forEach(function(d) {
delete d._clientDisplayName;
});
}

if (!window.sortOrders.credits || !window.sortOrders.credits.createdAt) {
filtered.sort(function(a, b) {
var da = a.createdAt?.seconds || 0;
var db = b.createdAt?.seconds || 0;
return db - da;
});
} else {
filtered = applySort('credits', filtered, 'createdAt');
}

window.filteredCredits = filtered;

updateCreditsStats(filtered);

renderCreditsTablePro();
}

function filterByPeriodWithDatesCredits(data, period) {
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

function updateCreditsStats(data) {
var total = 0, totalImpayes = 0, totalPaye = 0;
data.forEach(function(d) {
total += d.total || 0;
if (!d.paid) {
totalImpayes += d.remainingAmount || d.total || 0;
}
totalPaye += d.amountGiven || 0;
});

document.getElementById('creditsStatsTotal').textContent = total.toFixed(2);
document.getElementById('creditsStatsImpayes').textContent = totalImpayes.toFixed(2);
document.getElementById('creditsStatsCount').textContent = data.length;
document.getElementById('creditsStatsPaye').textContent = totalPaye.toFixed(2);
}

// ==================== RENDER CREDITS TABLE PRO ====================
// ✅ Mêmes colonnes que Admin-Ventes
function renderCreditsTablePro() {
var cont = document.getElementById('creditsTableContainer');
if (!cont) return;

var data = (window.filteredCredits || window.allCreditsData).slice();

if (window.sortOrders.credits && window.sortOrders.credits.createdAt) {
data = applySort('credits', data, 'createdAt');
} else {
data.sort(function(a, b) {
var da = a.createdAt?.seconds || 0;
var db = b.createdAt?.seconds || 0;
return db - da;
});
}

var itemsPerPage = window.itemsPerPage || 15;
var currentPage = window.currentPages.credits || 1;
var start = (currentPage - 1) * itemsPerPage;
var pageData = data.slice(start, start + itemsPerPage);

if (pageData.length === 0) {
cont.innerHTML = `
<div style="text-align:center;padding:60px 20px;">
<i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
<p style="margin-top:16px;color:#6b7280;font-size:18px !important;">Aucun crédit trouvé</p>
</div>
`;
document.getElementById('creditsPagination').innerHTML = '';
return;
}

var tc = 0;
var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';

var h = `
<div class="table-container">
<table class="data-table">
<thead>
<tr>
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
${window.creditSelectionMode ? '<th style="width:40px;">☑️</th>' : ''}
</tr>
</thead>
<tbody>
`;

pageData.forEach(function(d, index) {
var reste = d.paid ? 0 : (d.remainingAmount || d.total || 0);
if (!d.paid) tc += reste;

const factureNum = d.factureNum || d.id?.substring(0, 8) || '---';
const factureHtml = `
<div class="facture-cell">
<i class="fas fa-receipt"></i>
<span class="facture-number">#${factureNum}</span>
</div>
`;
const dateHtml = renderCreditDateCell(d);
const datePaiementHtml = renderCreditDatePaiementCell(d);
const clientHtml = renderCreditClientCell(d);

var articlesHtml = '';
if (d.items && d.items.length > 0) {
articlesHtml = d.items.map(function(it) {
return '<strong>' + (it.quantite || 1) + 'x</strong> ' + escapeHtml(it.nom || '');
}).join('<br>');
} else {
articlesHtml = '-';
}

// ✅ Options (comme admin-ventes)
var opts = d.items ? d.items.map(function(it) {
var o = [];
if (it.sauces && it.sauces.length) o.push('<span style="color:#14B8A6;">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
if (it.interdits && it.interdits.length) o.push('<span style="color:#ef4444;">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
if (it.epice && it.epice !== 'Normal') o.push('<span style="color:#d97706;">🌶️' + escapeHtml(it.epice) + '</span>');
if (it.sel && it.sel !== 'Normal') o.push('<span style="color:#4f46e5;">🧂' + escapeHtml(it.sel) + '</span>');
return o.length ? o.join(' | ') : '<span style="color:#9ca3af;">Aucune option</span>';
}).join('<br>') : '-';

var paymentMethod = d.paymentMethod || 'crédit';
var amountPaid = d.amountGiven || 0;

// ✅ Statut (comme admin-ventes)
var statutPaiement = d.statutPaiement || (d.paid ? 'payé' : 'crédit');
if (d.paid && statutPaiement !== 'payé') statutPaiement = 'payé';
if (d.amountGiven > 0 && d.remainingAmount > 0 && statutPaiement !== 'partiel') statutPaiement = 'partiel';

var statutMap = {
'payé': { class: 'status-success', label: 'Payé', icon: 'fa-check-circle' },
'crédit': { class: 'status-warning', label: 'Crédit', icon: 'fa-hand-holding-usd' },
'partiel': { class: 'status-warning', label: 'Partiel', icon: 'fa-clock' },
'en_attente': { class: 'status-danger', label: 'En attente', icon: 'fa-hourglass-half' },
'impayé': { class: 'status-danger', label: 'Impayé', icon: 'fa-times-circle' }
};
var st = statutMap[statutPaiement] || { class: 'status-warning', label: statutPaiement || 'Inconnu', icon: 'fa-question-circle' };

var actions = `
<div class="action-buttons">
    <button class="btn-print" onclick="printFacture('${d.id}')" title="Imprimer / PDF">Imprimer</button>
    <button class="btn-whatsapp" onclick="sendCreditWhatsApp('${d.id}')" title="Envoyer WhatsApp">WhatsApp</button>
    `;
if (!d.paid) {
    actions += `<button class="btn-payer" onclick="openCreditPaymentModal('${d.id}')" title="Marquer payé">Payer</button>`;
}
actions += `
    <button class="btn-edit" onclick="editCredit('${d.id}')" title="Modifier">Modifier</button>
    `;
if (isAdmin) {
    actions += `<button class="btn-delete" onclick="if(confirm('Supprimer définitivement ce crédit ?')) deleteCredit('${d.id}')" title="Supprimer">Supprimer</button>`;
}
actions += `</div>`;

var isSelected = window.creditSelectedIds.includes(d.id);
var rowClass = isSelected ? ' style="background:#fef3c7; border-left:4px solid #d97706;"' : '';

h += `<tr${rowClass}>
<td onclick="openCreditFactureDetails('${d.id}', '${escapeHtml(factureNum)}')" style="cursor:pointer;">
${factureHtml}
</td>
<td>${dateHtml}</td>
<td>${datePaiementHtml}</td>
<td>${clientHtml}</td>
<td>${articlesHtml}</td>
<td>${opts}</td>
${isAdmin ? `<td>${(d.achat || 0).toFixed(2)}</td><td style="color:#14B8A6;font-weight:700;">${(d.profit || 0).toFixed(2)}</td>` : ''}
<td><span class="amount-total">${(d.total || 0).toFixed(2)} MAD</span></td>
<td>${(d.discountMAD || 0).toFixed(2)}</td>
<td><span style="font-weight:700;color:#2563eb;">${(d.amountGiven || 0).toFixed(2)}</span></td>
<td><span class="amount-remaining">${reste.toFixed(2)} MAD</span></td>
<td>${(d.change || 0).toFixed(2)}</td>
${isAdmin ? `<td>${escapeHtml(d.vendeur || '-')}</td>` : ''}
<td>${escapeHtml(paymentMethod)}</td>
<td><span class="${st.class}"><i class="fas ${st.icon}"></i> ${st.label}</span></td>
<td>${actions}</td>
${window.creditSelectionMode ? `<td style="text-align:center;"><input type="checkbox" class="credit-select-check" data-id="${d.id}" ${isSelected ? 'checked' : ''} onchange="toggleCreditSelection('${d.id}')" style="transform:scale(1.5);width:24px;height:24px;"></td>` : ''}
</tr>`;
});

h += `
</tbody>
</table>
</div>
<div class="total-row-pro">
<span class="total-label">Total Impayés</span>
<span class="total-amount"><i class="fas fa-exclamation-triangle"></i> ${tc.toFixed(2)} MAD</span>
</div>
`;

cont.innerHTML = h;
document.getElementById('creditsPagination').innerHTML = getPaginationHTML('credits', data.length);
}

// ==================== SÉLECTION CRÉDITS ====================

function toggleCreditSelectionMode() {
    window.creditSelectionMode = !window.creditSelectionMode;
    window.creditSelectedIds = [];
    window.creditSelectedClientId = null;
    window.creditSelectedClientName = null;
    var selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
        selectAllBtn.style.background = '#4f46e5';
    }
    window.selectAllBtnState = false;

    var selectBtn = document.getElementById('toggleSelectionBtn');
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    var payBtn = document.getElementById('paySelectedBtn');
    if (selectBtn) {
        if (window.creditSelectionMode) {
            selectBtn.innerHTML = '<i class="fas fa-times-circle"></i> Annuler';
        } else {
            selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
        }
    }
    if (selectAllBtn) {
        selectAllBtn.style.display = window.creditSelectionMode ? 'inline-block' : 'none';
    }
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
    if (payBtn) {
        payBtn.style.display = 'none';
    }
    renderCreditsTablePro();
}

function toggleCreditSelection(id) {
    var idx = window.creditSelectedIds.indexOf(id);

    if (idx !== -1) {
        window.creditSelectedIds.splice(idx, 1);
        if (window.creditSelectedIds.length === 0) {
            window.creditSelectedClientId = null;
            window.creditSelectedClientName = null;
        }
        updateDeleteButtonVisibility();
        renderCreditsTablePro();
        return;
    }

    var data = window.filteredCredits || window.allCreditsData || [];
    var credit = data.find(function(c) { return c.id === id; });

    if (!credit) {
        updateDeleteButtonVisibility();
        renderCreditsTablePro();
        return;
    }

    if (window.creditSelectedIds.length === 0) {
        window.creditSelectedClientId = credit.clientId || null;
        window.creditSelectedClientName = credit.clientName || 'Client inconnu';
        window.creditSelectedIds.push(id);
        updateDeleteButtonVisibility();
        renderCreditsTablePro();
        return;
    }

    var currentClientId = window.creditSelectedClientId;
    var currentClientName = window.creditSelectedClientName;

    if (credit.clientId !== currentClientId) {
        var confirmer = confirm(
            '⚠️ CLIENT DIFFÉRENT DÉTECTÉ\n\n' +
            'Vous avez déjà sélectionné des crédits de :\n' +
            '👤 ' + (currentClientName || 'Client inconnu') + '\n\n' +
            'Vous voulez ajouter des crédits de :\n' +
            '👤 ' + (credit.clientName || 'Client inconnu') + '\n\n' +
            '❓ Voulez-vous AUTORISER la sélection multi-clients ?\n\n' +
            '✅ OK = Oui, autoriser les 2 clients\n' +
            '❌ Annuler = Non, refuser'
        );

        if (!confirmer) {
            renderCreditsTablePro();
            return;
        }

        window.creditSelectedClientId = 'MULTI';
        window.creditSelectedClientName = 'Plusieurs clients';
    }

    window.creditSelectedIds.push(id);
    updateDeleteButtonVisibility();
    renderCreditsTablePro();
}

function updateDeleteButtonVisibility() {
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    var payBtn = document.getElementById('paySelectedBtn');

    if (deleteBtn) {
        if (window.creditSelectedIds.length === 0) {
            deleteBtn.style.display = 'none';
        } else {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer (' + window.creditSelectedIds.length + ')';
        }
    }

    if (payBtn) {
        if (window.creditSelectedIds.length === 0) {
            payBtn.style.display = 'none';
        } else {
            payBtn.style.display = 'inline-block';
            var clientLabel = '';
            if (window.creditSelectedClientName === 'Plusieurs clients') {
                clientLabel = ' - Multi-clients';
            } else if (window.creditSelectedClientName) {
                clientLabel = ' - ' + window.creditSelectedClientName.substring(0, 15);
            }
            payBtn.innerHTML = '<i class="fas fa-check-circle"></i> Marquer payé (' + window.creditSelectedIds.length + ')' + clientLabel;
        }
    }
}

window.selectAllBtnState = false;

function selectAllVisibleCredits() {
    var data = window.filteredCredits || window.allCreditsData;
    var pageData = getPageData('credits', data);
    
    if (pageData.length === 0) return;
    
    var firstClientId = pageData[0].clientId;
    var firstClientName = pageData[0].clientName || 'Client inconnu';
    var hasDifferentClient = pageData.some(function(c) {
        return c.clientId !== firstClientId;
    });
    
    if (hasDifferentClient) {
        var uniqueClients = new Set();
        pageData.forEach(function(c) {
            uniqueClients.add(c.clientId || 'inconnu');
        });
        
        var confirmer = confirm(
            '⚠️ SÉLECTION MULTI-CLIENTS\n\n' +
            'Cette page contient des crédits de ' + uniqueClients.size + ' clients différents.\n\n' +
            '❓ Voulez-vous AUTORISER la sélection multi-clients ?\n\n' +
            '✅ OK = Oui, sélectionner TOUS les crédits\n' +
            '❌ Annuler = Non, annuler'
        );
        
        if (!confirmer) {
            return;
        }
        
        window.creditSelectedClientId = 'MULTI';
        window.creditSelectedClientName = 'Plusieurs clients';
    } else {
        window.creditSelectedClientId = firstClientId;
        window.creditSelectedClientName = firstClientName;
    }
    
    window.creditSelectedIds = pageData.map(function(d) { return d.id; });
    updateDeleteButtonVisibility();
    renderCreditsTablePro();
}

function deselectAllVisibleCredits() {
    window.creditSelectedIds = [];
    window.creditSelectedClientId = null;
    window.creditSelectedClientName = null;
    updateDeleteButtonVisibility();
    renderCreditsTablePro();
}

function toggleSelectAllVisible() {
if (window.selectAllBtnState) {
deselectAllVisibleCredits();
} else {
selectAllVisibleCredits();
}
window.selectAllBtnState = !window.selectAllBtnState;
var btn = document.getElementById('selectAllBtn');
if (btn) {
if (window.selectAllBtnState) {
btn.innerHTML = '<i class="fas fa-times"></i> Tout décocher';
btn.style.background = '#ef4444';
} else {
btn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
btn.style.background = '#4f46e5';
}
}
}

function deleteSelectedCredits() {
if (window.creditSelectedIds.length === 0) {
alert('Aucun crédit sélectionné.');
return;
}
if (!confirm('Supprimer définitivement les ' + window.creditSelectedIds.length + ' crédits sélectionnés ?')) return;

var promises = window.creditSelectedIds.map(function(id) {
return db.collection('ventes').doc(id).delete().then(function() {
window.allCreditsData = window.allCreditsData.filter(function(c) { return c.id !== id; });
// Supprimer aussi le doc credits correspondant si présent
return db.collection('credits').doc(id).delete().catch(function() {});
});
});

Promise.all(promises).then(function() {
alert('✅ ' + window.creditSelectedIds.length + ' crédit(s) supprimé(s).');
window.creditSelectedIds = [];
window.creditSelectionMode = false;
window.creditSelectedClientId = null;
window.creditSelectedClientName = null;
var selectBtn = document.getElementById('toggleSelectionBtn');
var deleteBtn = document.getElementById('deleteSelectedBtn');
var selectAllBtn = document.getElementById('selectAllBtn');
var payBtn = document.getElementById('paySelectedBtn');
if (selectBtn) selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
if (deleteBtn) deleteBtn.style.display = 'none';
if (selectAllBtn) selectAllBtn.style.display = 'none';
if (payBtn) payBtn.style.display = 'none';
loadCredits();
CacheDB.sync();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('credits');
    CacheDB.saveCollection('ventes');
}
}).catch(function(e) {
alert('❌ Erreur: ' + e.message);
});
}

// ============================================================
// ✅ FONCTION : Marquer payés tous les crédits sélectionnés
// ============================================================
async function paySelectedCredits() {
    if (!window.creditSelectedIds || window.creditSelectedIds.length === 0) {
        alert('❌ Aucun crédit sélectionné.');
        return;
    }

    var count = window.creditSelectedIds.length;
    var alreadyPaid = 0;
    var toPay = [];
    var totalImpayes = 0;

    window.creditSelectedIds.forEach(function(id) {
        var credit = (window.allCreditsData || []).find(function(c) { return c.id === id; });
        if (!credit) return;
        if (credit.paid) {
            alreadyPaid++;
        } else {
            toPay.push(credit);
            totalImpayes += credit.remainingAmount || credit.total || 0;
        }
    });

    if (toPay.length === 0) {
        alert('⚠️ Tous les crédits sélectionnés sont déjà payés.');
        return;
    }

    var message = '💳 Marquer ' + toPay.length + ' crédit(s) comme PAYÉ(S) ?\n\n';
    message += '💰 Montant total à régulariser : ' + totalImpayes.toFixed(2) + ' MAD\n';
    if (alreadyPaid > 0) {
        message += '\n⚠️ ' + alreadyPaid + ' crédit(s) déjà payé(s) seront ignorés.\n';
    }
    message += '\nConfirmer ?';

    if (!confirm(message)) return;

    try {
        var paiements = [];
        var now = firebase.firestore.FieldValue.serverTimestamp();

        var promises = toPay.map(function(credit) {
            var restant = credit.remainingAmount || credit.total || 0;
            var nouveauPaye = (credit.amountGiven || 0) + restant;

            paiements.push({
                creditId: credit.id,
                factureNum: credit.factureNum || credit.id.substring(0, 8),
                clientId: credit.clientId,
                clientName: credit.clientName || 'Client inconnu',
                montantPaye: restant,
                totalCredit: credit.total || 0,
                items: credit.items || []
            });

            // ✅ Mise à jour VENTE (source de vérité)
            var venteUpdate = {
                amountGiven: nouveauPaye,
                remainingAmount: 0,
                paid: true,
                statutPaiement: 'payé',
                change: Math.max(0, nouveauPaye - (credit.total || 0)),
                datePaiement: now,
                paidAt: now,
                updatedAt: now,
                lastPaymentAt: now,
                lastPaymentAmount: restant
            };

            return db.collection('ventes').doc(credit.id).update(venteUpdate).catch(function() {
                console.warn('⚠️ vente doc non trouvée:', credit.id);
            }).then(function() {
                // ✅ Mise à jour CREDITS (compatibilité POS) - silencieux si absent
                return db.collection('credits').doc(credit.id).update({
                    amountGiven: nouveauPaye,
                    remainingAmount: 0,
                    paid: true,
                    datePaiement: now,
                    paidAt: now,
                    updatedAt: now
                }).catch(function() {});
            }).then(function() {
                var updatedCredit = {
                    ...credit,
                    amountGiven: nouveauPaye,
                    remainingAmount: 0,
                    paid: true,
                    statutPaiement: 'payé',
                    datePaiement: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0 }
                };
                return CacheDB.set('credits', credit.id, updatedCredit).then(function() {
                    var idx = window.allCreditsData.findIndex(function(c) { return c.id === credit.id; });
                    if (idx !== -1) window.allCreditsData[idx] = updatedCredit;

                    if (window.filteredCredits) {
                        var fidx = window.filteredCredits.findIndex(function(c) { return c.id === credit.id; });
                        if (fidx !== -1) window.filteredCredits[fidx] = updatedCredit;
                    }
                    return Promise.resolve();
                });
            });
        });

        await Promise.all(promises);

        var facturePaiement = await creerFacturePaiementCredits(paiements, totalImpayes);

        updateCreditsStats(window.filteredCredits || window.allCreditsData);
        renderCreditsTablePro();

        window.creditSelectedIds = [];
        window.creditSelectionMode = false;
        window.selectAllBtnState = false;
        window.creditSelectedClientId = null;
        window.creditSelectedClientName = null;

        var selectBtn = document.getElementById('toggleSelectionBtn');
        var selectAllBtn = document.getElementById('selectAllBtn');
        var deleteBtn = document.getElementById('deleteSelectedBtn');
        var payBtn = document.getElementById('paySelectedBtn');
        if (selectBtn) selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
        if (selectAllBtn) {
            selectAllBtn.style.display = 'none';
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
        }
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (payBtn) payBtn.style.display = 'none';

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('credits');
            CacheDB.saveCollection('ventes');
        }

        CacheDB.sync();

        // Recharger pour retirer les crédits désormais payés de la liste
        setTimeout(function() { loadCredits(); }, 400);

        await posAfficherOptionWhatsAppPaiement(facturePaiement, toPay);

    } catch (e) {
        console.error('❌ Erreur paiement groupé:', e);
        alert('❌ Erreur lors du paiement groupé : ' + e.message);
    }
}
window.paySelectedCredits = paySelectedCredits;

// ============================================================
// ✅ FONCTION : Créer une facture de paiement de crédits
// ============================================================
async function creerFacturePaiementCredits(paiements, totalPaye) {
    var factureCounter = parseInt(localStorage.getItem('factureCounter')) || 0;
    factureCounter++;
    localStorage.setItem('factureCounter', factureCounter);
    var numFacture = 'PAI-' + new Date().getFullYear() + '-' + String(factureCounter).padStart(5, '0');

    var clientIds = [...new Set(paiements.map(p => p.clientId).filter(Boolean))];
    var clientNames = [...new Set(paiements.map(p => p.clientName).filter(Boolean))];
    var clientId = clientIds.length === 1 ? clientIds[0] : null;

    var clientName = '';
    if (clientNames.length === 1) {
        clientName = clientNames[0];
    } else if (clientNames.length === 2) {
        clientName = clientNames[0] + ' & ' + clientNames[1];
    } else if (clientNames.length > 2) {
        var noms = clientNames.slice(0, 3).join(', ');
        if (clientNames.length > 3) {
            noms += ' + ' + (clientNames.length - 3) + ' autres';
        }
        clientName = noms;
    }

    var vendeur = '';
    if (window.currentUserData) {
        vendeur = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
    }

    var items = paiements.map(function(p) {
        return {
            id: p.creditId,
            nom: 'Crédit #' + p.factureNum + (p.clientName ? ' - ' + p.clientName : ''),
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
        type: 'paiement_credits',
        creditsPayes: paiements.map(p => ({
            creditId: p.creditId,
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
window.creerFacturePaiementCredits = creerFacturePaiementCredits;

// ============================================================
// 📱 AFFICHER LE MODAL WHATSAPP AVEC TOUS LES DÉTAILS
// ============================================================
async function posAfficherOptionWhatsAppPaiement(factureData, creditsDetailes) {
    try {
        var clientName = factureData.clientName || 'Client';
        var clientId = factureData.clientId;
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
                        console.log('✅ Téléphone client récupéré depuis Firestore:', clientTel);
                    }
                } catch(e) {
                    console.warn('⚠️ Erreur récupération téléphone client:', e);
                }
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

        if (creditsDetailes && creditsDetailes.length > 0) {
            for (var i = 0; i < creditsDetailes.length; i++) {
                var credit = creditsDetailes[i];
                var factureNum = credit.factureNum || credit.id.substring(0, 8);
                var sousTotal = credit.total || 0;
                var restant = credit.remainingAmount || 0;

                messageWhatsApp += '📋 *FACTURE #' + factureNum + '*\n';

                if (credit.clientName) {
                    messageWhatsApp += '   👤 ' + credit.clientName + '\n';
                }

                if (credit.createdAt && credit.createdAt.seconds) {
                    var cDate = new Date(credit.createdAt.seconds * 1000);
                    messageWhatsApp += '   📅 ' + cDate.toLocaleDateString('fr-FR') + ' ' + cDate.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) + '\n';
                }

                if (credit.items && credit.items.length > 0) {
                    messageWhatsApp += '   *Produits :*\n';
                    credit.items.forEach(function(item) {
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
        } else {
            var lignesCredits = factureData.creditsPayes.map(function(c) {
                return '• Facture #' + c.factureNum + ' → ' + c.montantPaye.toFixed(2) + ' MAD';
            }).join('\n');
            messageWhatsApp += '*CRÉDITS RÉGLÉS :*\n' + lignesCredits + '\n\n';
        }

        messageWhatsApp += '━━━━━━━━━━━━━━━━━━━━━\n';
        messageWhatsApp += '💵 *TOTAL GÉNÉRAL : ' + factureData.total.toFixed(2) + ' MAD*\n';
        messageWhatsApp += '💳 Mode : Espèces\n';
        messageWhatsApp += '📊 Nombre de factures : ' + (creditsDetailes ? creditsDetailes.length : factureData.creditsPayes.length) + '\n';
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
            : '<em style="color:#92400E;">⚠️ Aucun numéro de téléphone enregistré pour ce client</em>';

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
                        <strong>📄 Nb crédits :</strong> ${creditsDetailes ? creditsDetailes.length : factureData.creditsPayes.length}<br>
                        ${telInfo}
                    </p>
                </div>

                <p style="color:#334155;font-weight:600;margin-bottom:12px;font-size:1rem;">
                    📱 Voulez-vous envoyer le reçu détaillé par WhatsApp${telDisplay ? ' au ' + escapeHtml(clientTel) : ''} ?
                </p>

                <div style="display:flex;gap:8px;">
                    <button onclick="posFermerModalWhatsAppPaiement()"
                        style="flex:1;padding:12px;background:#e2e8f0;color:#475569;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;">
                        ❌ Non
                    </button>
                    <button onclick="posEnvoyerWhatsAppPaiement()"
                        style="flex:2;padding:12px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 14px rgba(37,211,102,0.3);">
                        <i class="fab fa-whatsapp" style="font-size:1.2rem;"></i> Envoyer WhatsApp
                    </button>
                </div>
            </div>
        `;

        openModal('🧾 Paiement validé', confirmHtml);

    } catch(e) {
        console.error('❌ Erreur posAfficherOptionWhatsAppPaiement:', e);
    }
}
window.posAfficherOptionWhatsAppPaiement = posAfficherOptionWhatsAppPaiement;

// ============================================================
// 📱 ENVOYER WHATSAPP POUR LE PAIEMENT
// ============================================================
function posEnvoyerWhatsAppPaiement() {
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
            console.log('📱 [WhatsApp Paiement] Envoi au numéro :', tel);
        } else {
            url = 'https://wa.me/?text=' + encodeURIComponent(message);
            console.log('📱 [WhatsApp Paiement] Aucun numéro — WhatsApp Web sans destinataire');
        }

        window.open(url, '_blank');

        closeModal();
        window._posWhatsAppPaiementData = null;

    } catch(e) {
        console.error('❌ Erreur posEnvoyerWhatsAppPaiement:', e);
        alert('❌ Erreur WhatsApp : ' + e.message);
    }
}
window.posEnvoyerWhatsAppPaiement = posEnvoyerWhatsAppPaiement;

function posFermerModalWhatsAppPaiement() {
    window._posWhatsAppPaiementData = null;
    closeModal();
}
window.posFermerModalWhatsAppPaiement = posFermerModalWhatsAppPaiement;

// ==================== PAIEMENT CRÉDIT (AVEC MODAL) ====================

function openCreditPaymentModal(creditId) {
    var data = window.filteredCredits || window.allCreditsData || [];
    var credit = data.find(function(c) { return c.id === creditId; });
    if (!credit) {
        alert('Crédit introuvable');
        return;
    }

    if (credit.paid) {
        alert('✅ Ce crédit est déjà entièrement payé.');
        return;
    }

    var restant = credit.remainingAmount || credit.total || 0;
    var total = credit.total || 0;
    
    if (total <= 0) {
        if (confirm('⚠️ Ce crédit a un total de 0 MAD. Voulez-vous le marquer comme payé ?')) {
            confirmerPaiementCreditZero(creditId);
        }
        return;
    }

    var currentPaye = credit.amountGiven || 0;

    var modalHtml = `
        <div style="padding:10px;">
            <h4 style="margin-bottom:16px;font-size:1.2rem;color:var(--text-primary);">
                💳 Paiement du crédit
            </h4>
            <div style="background:var(--bg-page);border-radius:var(--radius);padding:14px;margin-bottom:16px;border:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Facture</span>
                    <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(credit.factureNum || 'N/A')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Client</span>
                    <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(credit.clientName || 'N/A')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Total</span>
                    <span style="font-weight:600;color:var(--text-primary);">${total.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;">
                    <span style="color:var(--text-secondary);">Déjà payé</span>
                    <span style="font-weight:600;color:var(--success);">${currentPaye.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1.1rem;font-weight:700;border-top:1px solid var(--border);margin-top:4px;padding-top:8px;">
                    <span style="color:var(--text-secondary);">Reste à payer</span>
                    <span style="color:var(--danger);font-size:1.3rem;">${restant.toFixed(2)} MAD</span>
                </div>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
                <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                    Montant à payer (MAD)
                </label>
                <input type="number" id="creditPaymentAmount" value="${restant.toFixed(2)}" 
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
                <button onclick="confirmCreditPayment('${creditId}')" class="btn-save" style="padding:10px 24px;border-radius:var(--radius);border:none;background:var(--success);color:white;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-check"></i> Payer
                </button>
            </div>
        </div>
    `;

    openModal('💰 Paiement crédit', modalHtml);
}

async function confirmerPaiementCreditZero(creditId) {
    try {
        var data = window.filteredCredits || window.allCreditsData || [];
        var credit = data.find(function(c) { return c.id === creditId; });
        if (!credit) {
            alert('Crédit introuvable');
            return;
        }

        var now = firebase.firestore.FieldValue.serverTimestamp();

        // ✅ Mise à jour VENTE (source de vérité)
        await db.collection('ventes').doc(creditId).update({
            paid: true,
            remainingAmount: 0,
            statutPaiement: 'payé',
            datePaiement: now,
            paidAt: now,
            updatedAt: now
        }).catch(function() {});

        // ✅ Mise à jour CREDITS (compatibilité POS)
        await db.collection('credits').doc(creditId).update({
            paid: true,
            remainingAmount: 0,
            amountGiven: credit.amountGiven || 0,
            datePaiement: now,
            paidAt: now,
            updatedAt: now
        }).catch(function() {});

        var updatedCredit = {
            ...credit,
            paid: true,
            remainingAmount: 0,
            statutPaiement: 'payé',
            datePaiement: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0 }
        };
        await CacheDB.set('credits', creditId, updatedCredit);
        
        var index = window.allCreditsData.findIndex(function(c) { return c.id === creditId; });
        if (index !== -1) window.allCreditsData[index] = updatedCredit;
        
        var fIndex = (window.filteredCredits || []).findIndex(function(c) { return c.id === creditId; });
        if (fIndex !== -1) window.filteredCredits[fIndex] = updatedCredit;

        closeModal();
        updateCreditsStats(window.filteredCredits || window.allCreditsData);
        renderCreditsTablePro();
        CacheDB.sync();
        
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('credits');
            CacheDB.saveCollection('ventes');
        }
        
        alert('✅ Ce crédit a été marqué comme payé (total à 0).');
        setTimeout(function() { loadCredits(); }, 400);
        return;
    } catch(e) {
        console.error('Erreur paiement crédit à 0:', e);
        alert('❌ Erreur lors du paiement: ' + e.message);
    }
}

async function confirmCreditPayment(creditId) {
    var amountInput = document.getElementById('creditPaymentAmount');
    if (!amountInput) {
        alert('Erreur: champ de montant introuvable');
        return;
    }

    var montant = parseFloat(amountInput.value);
    if (isNaN(montant) || montant <= 0) {
        alert('❌ Veuillez entrer un montant valide');
        return;
    }

    var data = window.filteredCredits || window.allCreditsData || [];
    var credit = data.find(function(c) { return c.id === creditId; });
    if (!credit) {
        alert('Crédit introuvable');
        return;
    }

    var restant = credit.remainingAmount || credit.total || 0;
    
    if (montant > restant) {
        alert('❌ Le montant ne peut pas dépasser le reste à payer (' + restant.toFixed(2) + ' MAD)');
        return;
    }

    try {
        var nouveauPaye = (credit.amountGiven || 0) + montant;
        var nouveauRestant = Math.max(0, restant - montant);
        var estPaye = nouveauRestant <= 0.01;

        var now = firebase.firestore.FieldValue.serverTimestamp();

        // ✅ Mise à jour VENTE (source de vérité)
        var venteUpdate = {
            amountGiven: nouveauPaye,
            remainingAmount: nouveauRestant,
            paid: estPaye,
            statutPaiement: estPaye ? 'payé' : 'partiel',
            change: Math.max(0, nouveauPaye - (credit.total || 0)),
            updatedAt: now,
            lastPaymentAt: now,
            lastPaymentAmount: montant
        };
        if (estPaye) {
            venteUpdate.datePaiement = now;
            venteUpdate.paidAt = now;
        }

        await db.collection('ventes').doc(creditId).update(venteUpdate).catch(function() {
            console.warn('⚠️ vente doc non trouvée:', creditId);
        });

        // ✅ Mise à jour CREDITS (compatibilité POS)
        var creditUpdate = {
            amountGiven: nouveauPaye,
            remainingAmount: nouveauRestant,
            paid: estPaye,
            updatedAt: now,
            lastPaymentAt: now,
            lastPaymentAmount: montant
        };
        if (estPaye) {
            creditUpdate.datePaiement = now;
            creditUpdate.paidAt = now;
        }
        await db.collection('credits').doc(creditId).update(creditUpdate).catch(function() {});

        var updatedCredit = {
            ...credit,
            amountGiven: nouveauPaye,
            remainingAmount: nouveauRestant,
            paid: estPaye,
            statutPaiement: estPaye ? 'payé' : 'partiel',
            datePaiement: estPaye ? { seconds: Math.floor(Date.now()/1000), nanoseconds: 0 } : (credit.datePaiement || null)
        };
        await CacheDB.set('credits', creditId, updatedCredit);
        
        var index = window.allCreditsData.findIndex(function(c) { return c.id === creditId; });
        if (index !== -1) {
            window.allCreditsData[index] = updatedCredit;
        }
        
        var fIndex = (window.filteredCredits || []).findIndex(function(c) { return c.id === creditId; });
        if (fIndex !== -1) {
            window.filteredCredits[fIndex] = updatedCredit;
        }
        
        closeModal();
        
        updateCreditsStats(window.filteredCredits || window.allCreditsData);
        renderCreditsTablePro();
        CacheDB.sync();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('credits');
            CacheDB.saveCollection('ventes');
        }

        var paiements = [{
            creditId: creditId,
            factureNum: credit.factureNum || creditId.substring(0, 8),
            clientId: credit.clientId,
            clientName: credit.clientName || 'Client inconnu',
            montantPaye: montant,
            totalCredit: credit.total || 0,
            items: credit.items || []
        }];
        var facturePaiement = await creerFacturePaiementCredits(paiements, montant);

        // Si soldé, recharger la liste pour retirer de la vue
        if (estPaye) setTimeout(function() { loadCredits(); }, 600);

        await posAfficherOptionWhatsAppPaiement(facturePaiement, [updatedCredit]);

    } catch(e) {
        console.error('Erreur paiement crédit:', e);
        alert('❌ Erreur lors du paiement: ' + e.message);
    }
}

// ==================== FONCTIONS POUR LE MODAL DÉTAILS FACTURE CRÉDIT ====================

var currentCreditId = null;

function openCreditFactureDetails(creditId, factureNum) {
    var modal = document.getElementById('creditFactureDetailsModal');
    if (!modal) {
        var modalHTML = `
            <div id="creditFactureDetailsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;padding:20px;">
                <div style="background:var(--bg-card);border-radius:var(--radius-xl);width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);border:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:2px solid var(--border);flex-shrink:0;">
                        <h3 id="creditFactureDetailsTitle" style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-file-invoice" style="color:var(--accent);font-size:1.4rem;"></i>
                            📄 Détails du crédit
                        </h3>
                        <button onclick="closeCreditFactureDetails()" style="background:none;border:none;font-size:2rem;cursor:pointer;color:var(--text-muted);padding:0 14px;border-radius:8px;transition:var(--transition);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="creditFactureDetailsBody" style="flex:1;overflow-y:auto;padding:24px;padding-top:16px;">
                        <div style="text-align:center;padding:40px;">
                            <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:var(--accent);"></i>
                            <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Chargement...</p>
                        </div>
                    </div>
                    <div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                        <button onclick="closeCreditFactureDetails()" style="padding:12px 28px;border-radius:var(--radius);border:none;background:var(--gray-100);color:var(--text-secondary);font-weight:600;cursor:pointer;transition:var(--transition);font-size:1rem;">
                            Fermer
                        </button>
                        <button onclick="printCreditFactureDetails()" style="padding:12px 28px;border-radius:var(--radius);border:none;background:var(--black);color:var(--white);font-weight:600;cursor:pointer;transition:var(--transition);font-size:1rem;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-print"></i> Imprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        var div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);
        
        document.getElementById('creditFactureDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeCreditFactureDetails();
            }
        });
        
        modal = document.getElementById('creditFactureDetailsModal');
    }
    
    modal.style.display = 'flex';
    document.getElementById('creditFactureDetailsTitle').textContent = '📄 Détails crédit N° ' + (factureNum || 'N/A');
    currentCreditId = creditId;
    loadCreditFactureDetails(creditId);
}

function closeCreditFactureDetails() {
    var modal = document.getElementById('creditFactureDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentCreditId = null;
}

async function loadCreditFactureDetails(creditId) {
    var body = document.getElementById('creditFactureDetailsBody');
    if (!body) return;
    
    try {
        var doc = await db.collection('ventes').doc(creditId).get();
        
        if (!doc.exists) {
            body.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);"></i>
                    <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Crédit non trouvé</p>
                </div>
            `;
            return;
        }
        
        var data = doc.data();
        renderCreditFactureDetails(data);
        
    } catch(e) {
        console.error('Erreur chargement crédit:', e);
        body.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);"></i>
                <p style="color:var(--text-secondary);margin-top:12px;font-size:1.1rem;">Erreur lors du chargement: ${e.message}</p>
            </div>
        `;
    }
}

function renderCreditFactureDetails(data) {
    var body = document.getElementById('creditFactureDetailsBody');
    if (!body) return;
    
    var date = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
    var dateStr = date.toLocaleDateString('fr-FR');
    var timeStr = date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    
    var statusBg = data.paid ? '#ECFDF5' : '#FEF3C7';
    var statusColor = data.paid ? '#065F46' : '#92400E';
    
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
                <h4 style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin:0;">Crédit N° ${data.factureNum || 'N/A'}</h4>
                <p style="color:var(--text-secondary);font-size:1.1rem;margin:6px 0 0 0;">
                    <i class="far fa-calendar-alt"></i> ${dateStr} à ${timeStr}
                </p>
            </div>
            <span style="display:inline-block;padding:6px 18px;border-radius:20px;font-size:1rem;font-weight:600;text-transform:uppercase;background:${statusBg};color:${statusColor};">
                ${data.paid ? 'Payé' : 'Impayé'}
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
                <p style="font-size:0.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:0 0 6px 0;">Vendeur / Mode</p>
                <p style="font-size:1.2rem;font-weight:600;color:var(--text-primary);margin:0;">${escapeHtml(data.vendeur || 'N/A')}</p>
                <p style="font-size:1rem;color:var(--text-secondary);margin:4px 0 0 0;">💳 ${escapeHtml(data.paymentMethod || '—')}</p>
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
    
    var restant = data.remainingAmount || data.total || 0;
    var amountGiven = data.amountGiven || 0;
    var total = data.total || 0;
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        
        <div style="display:flex;justify-content:flex-end;padding-top:16px;border-top:2px solid var(--border);">
            <div style="width:280px;">
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;color:var(--text-secondary);">
                    <span>Total</span>
                    <span>${total.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:1.1rem;color:var(--text-secondary);">
                    <span>Payé</span>
                    <span>${amountGiven.toFixed(2)} MAD</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:1.5rem;font-weight:700;color:var(--danger);border-top:2px solid var(--border);margin-top:6px;">
                    <span>Reste à payer</span>
                    <span>${restant.toFixed(2)} MAD</span>
                </div>
                ${data.discountMAD > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:1rem;color:var(--text-secondary);">
                    <span>Remise</span>
                    <span>-${data.discountMAD.toFixed(2)} MAD</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    body.innerHTML = html;
}

function printCreditFactureDetails() {
    if (currentCreditId) {
        printFacture(currentCreditId);
    } else {
        alert('Aucun crédit sélectionné');
    }
}

// ==================== ENVOYER WHATSAPP POUR UN CRÉDIT ====================
async function sendCreditWhatsApp(creditId) {
    try {
        const doc = await db.collection('ventes').doc(creditId).get();
        if (!doc.exists) {
            alert('❌ Crédit introuvable');
            return;
        }
        
        const credit = doc.data();
        let phone = '';

        if (credit.clientId) {
            const clientDoc = await db.collection('clients').doc(credit.clientId).get();
            if (clientDoc.exists) {
                const clientData = clientDoc.data();
                phone = clientData.whatsapp || clientData.telephone || '';
            }
        }
        
        phone = phone.replace(/[^\d+]/g, '').trim();
        if (phone.startsWith('0')) {
            phone = '+212' + phone.substring(1);
        } else if (!phone.startsWith('+')) {
            phone = '+' + phone;
        }

        if (!phone || phone === '+') {
            alert('❌ Aucun numéro WhatsApp trouvé pour ce client.');
            return;
        }

        var msg = '🧾 *CRÉDIT E-SOLUTION*\n';
        msg += '━━━━━━━━━━━━━━━━━━\n';
        msg += '📄 N°: ' + (credit.factureNum || creditId.substring(0, 8)) + '\n';
        msg += '📅 ' + (credit.createdAt ? new Date(credit.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : '') + '\n';
        msg += '👤 Client: ' + (credit.clientName || '-') + '\n';
        msg += '━━━━━━━━━━━━━━━━━━\n';
        
        if (credit.items && credit.items.length > 0) {
            credit.items.forEach(function(item) {
                msg += item.quantite + 'x ' + item.nom + ' → ' + (item.prixVente * item.quantite).toFixed(2) + ' MAD\n';
            });
        }
        
        msg += '━━━━━━━━━━━━━━━━━━\n';
        msg += '*💰 TOTAL: ' + (credit.total || 0).toFixed(2) + ' MAD*\n';
        msg += '💳 Déjà payé: ' + (credit.amountGiven || 0).toFixed(2) + ' MAD\n';
        msg += '⏳ Reste à payer: ' + (credit.remainingAmount || credit.total || 0).toFixed(2) + ' MAD\n';
        msg += '━━━━━━━━━━━━━━━━━━\n';
        msg += '🙏 Merci de régulariser votre crédit !\n';
        msg += '🛒 E-SOLUTION';

        var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
        
        var w = window.open(url, '_blank');
        if (!w || w.closed) {
            var modalHtml = `
                <div style="text-align:center;padding:10px;">
                    <i class="fab fa-whatsapp" style="font-size:4rem;color:#25D366;"></i>
                    <p style="margin:16px 0;font-size:1.1rem;">Cliquez sur le bouton ci-dessous pour envoyer le rappel de crédit</p>
                    <a href="${url}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 32px;background:#25D366;color:#fff;
                       border-radius:12px;font-weight:700;text-decoration:none;font-size:1.1rem;">
                        <i class="fab fa-whatsapp"></i> Envoyer sur WhatsApp
                    </a>
                </div>
            `;
            openModal('📱 Envoyer rappel WhatsApp', modalHtml);
        }

    } catch (e) {
        console.error('Erreur envoi WhatsApp crédit:', e);
        alert('❌ Erreur lors de l\'envoi WhatsApp');
    }
}

// ==================== AUTRES FONCTIONS ====================

async function payerCredit(creditId) {
    openCreditPaymentModal(creditId);
}

function printFacture(did) {
db.collection('ventes').doc(did).get().then(function(dc) {
if (dc.exists) {
imprimerFactureCredit(dc.data(), dc.id);
} else {
// Fallback credits
db.collection('credits').doc(did).get().then(function(cc) {
if (cc.exists) imprimerFactureCredit(cc.data(), cc.id);
});
}
});
}

function imprimerFactureCredit(d, id) {
var ih = '';
if (d.items) {
d.items.forEach(function(it) {
var o = '';
if (it.interdits && it.interdits.length > 0) o += ' 🚫' + it.interdits.join(',');
if (it.epice && it.epice !== 'Normal') o += ' 🌶️' + it.epice;
if (it.sel && it.sel !== 'Normal') o += ' 🧂' + it.sel;
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
.remaining{font-size:1rem;font-weight:700;text-align:right;color:#ef4444;margin-top:8px;}
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
<div><strong>Mode:</strong> ${d.paymentMethod || '-'}</div>
</div>
<table>
<tr><th>Article</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
${ih}
</table>
${d.discountMAD > 0 ? `<p><strong>Remise:</strong> -${d.discountMAD.toFixed(2)} MAD</p>` : ''}
<div class="total">Total: ${(d.total || 0).toFixed(2)} MAD</div>
<div class="remaining">💰 Restant: ${(d.remainingAmount || d.total || 0).toFixed(2)} MAD</div>
<div class="footer">Merci de votre visite ! 🌟</div>
</div>
</body></html>
`);
w.document.close();
setTimeout(function() { w.print(); }, 500);
}

async function editCredit(id) {
try {
var doc = await db.collection('ventes').doc(id).get();
if (!doc.exists) {
// fallback credits
doc = await db.collection('credits').doc(id).get();
}
if (!doc.exists) {
alert('Crédit introuvable');
return;
}
var d = doc.data();
window.editingId = id;
window.currentCollection = 'ventes';

var h = `
<div class="form-row">
<div class="form-group">
<label><i class="fas fa-user"></i> Client</label>
<input type="text" id="editCreditClient" value="${escapeHtml(d.clientName || '')}" style="font-size:14px;padding:10px;">
</div>
<div class="form-group">
<label><i class="fas fa-tag"></i> Total (MAD)</label>
<input type="number" id="editCreditTotal" value="${(d.total || 0)}" step="0.01" style="font-size:14px;padding:10px;">
</div>
</div>
<div class="form-row">
<div class="form-group">
<label><i class="fas fa-hand-holding-usd"></i> Payé (MAD)</label>
<input type="number" id="editCreditPaid" value="${(d.amountGiven || 0)}" step="0.01" style="font-size:14px;padding:10px;">
</div>
<div class="form-group">
<label><i class="fas fa-hourglass-half"></i> Restant (MAD)</label>
<input type="number" id="editCreditRemaining" value="${(d.remainingAmount || 0)}" step="0.01" style="font-size:14px;padding:10px;">
</div>
</div>
<div class="form-row">
<div class="form-group">
<label><i class="fas fa-credit-card"></i> Mode de paiement</label>
<input type="text" id="editCreditMode" value="${escapeHtml(d.paymentMethod || '')}" style="font-size:14px;padding:10px;">
</div>
<div class="form-group">
<label><i class="fas fa-circle"></i> Statut</label>
<select id="editCreditStatut" style="font-size:14px;padding:10px;">
<option value="0" ${!d.paid ? 'selected' : ''}>Impayé</option>
<option value="1" ${d.paid ? 'selected' : ''}>Payé</option>
</select>
</div>
</div>
<button class="btn-cancel" onclick="closeModal()">Annuler</button>
<button class="btn-save" onclick="saveEditCredit()"><i class="fas fa-save"></i> Enregistrer</button>
`;

openModal('Modifier Crédit ' + (d.factureNum || id.substring(0, 8)), h);
} catch (e) {
console.error('Erreur editCredit:', e);
alert('Erreur lors du chargement du crédit');
}
}

async function saveEditCredit() {
var clientName = document.getElementById('editCreditClient').value.trim();
var total = parseFloat(document.getElementById('editCreditTotal').value) || 0;
var amountGiven = parseFloat(document.getElementById('editCreditPaid').value) || 0;
var remainingAmount = parseFloat(document.getElementById('editCreditRemaining').value) || 0;
var paymentMethod = document.getElementById('editCreditMode').value.trim();
var paid = document.getElementById('editCreditStatut').value === '1';

var data = {
clientName: clientName,
total: total,
amountGiven: amountGiven,
remainingAmount: paid ? 0 : remainingAmount,
paymentMethod: paymentMethod,
paid: paid,
statutPaiement: paid ? 'payé' : (amountGiven > 0 ? 'partiel' : 'crédit'),
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

if (paid) {
    data.datePaiement = firebase.firestore.FieldValue.serverTimestamp();
    data.paidAt = firebase.firestore.FieldValue.serverTimestamp();
}

try {
// ✅ Écrire dans ventes (source de vérité)
await db.collection('ventes').doc(window.editingId).update(data).catch(function() {});
// ✅ Écrire aussi dans credits (compatibilité POS)
await db.collection('credits').doc(window.editingId).update(data).catch(function() {});

// Cache local
var localData = Object.assign({}, data);
if (paid) {
    localData.datePaiement = { seconds: Math.floor(Date.now()/1000), nanoseconds: 0 };
}
await CacheDB.set('credits', window.editingId, Object.assign({id: window.editingId}, localData));

closeModal();
loadCredits();
CacheDB.sync();
alert('✅ Crédit mis à jour');

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('credits');
    CacheDB.saveCollection('ventes');
}
} catch (e) {
alert('❌ Erreur: ' + e.message);
}
}

async function deleteCredit(id) {
try {
// ✅ Supprimer dans ventes
await db.collection('ventes').doc(id).delete().catch(function() {});
// ✅ Supprimer dans credits
await db.collection('credits').doc(id).delete().catch(function() {});
window.allCreditsData = (window.allCreditsData || []).filter(function(c) { return c.id !== id; });
if (typeof loadCredits === 'function') loadCredits();
CacheDB.sync();

if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('credits');
    CacheDB.saveCollection('ventes');
}
} catch (e) {
console.error('Erreur deleteCredit:', e);
throw e;
}
}

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

function getPageData(pageType, data) {
    if (!window.currentPages) window.currentPages = {};
    var currentPage = window.currentPages[pageType] || 1;
    var itemsPerPage = window.itemsPerPage || 15;
    var start = (currentPage - 1) * itemsPerPage;
    var end = start + itemsPerPage;
    return data.slice(start, end);
}

// ==================== FONCTIONS MANQUANTES AJOUTÉES ====================

function closeCreditSelection() {
    window.creditSelectedIds = [];
    window.creditSelectionMode = false;
    window.selectAllBtnState = false;
    window.creditSelectedClientId = null;
    window.creditSelectedClientName = null;

    var paymentZone = document.getElementById('creditPaymentZone');
    if (paymentZone) paymentZone.style.display = 'none';

    var selectBtn = document.getElementById('toggleSelectionBtn');
    if (selectBtn) {
        selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
    }

    var selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.style.display = 'none';
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
    }

    var deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    var payBtn = document.getElementById('paySelectedBtn');
    if (payBtn) payBtn.style.display = 'none';

    if (typeof renderCreditsTablePro === 'function') {
        renderCreditsTablePro();
    } else if (typeof renderCreditsTable === 'function') {
        renderCreditsTable();
    }
}
window.closeCreditSelection = closeCreditSelection;

function validateCreditPayment() {
    var amountInput = document.getElementById('creditPaymentAmountInput');
    if (!amountInput) {
        alert('❌ Erreur : champ de montant introuvable');
        return;
    }

    var amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert('❌ Veuillez entrer un montant valide');
        return;
    }

    if (!window.creditSelectedIds || window.creditSelectedIds.length === 0) {
        alert('❌ Aucun crédit sélectionné');
        return;
    }

    var promises = window.creditSelectedIds.map(function(id) {
        var credit = (window.allCreditsData || []).find(function(c) { return c.id === id; });
        if (!credit) return Promise.resolve();

        var total = credit.remainingAmount || credit.total || 0;
        var newPaid = total - amount;
        var isFullyPaid = newPaid <= 0.01;

        var update = {
            amountGiven: (credit.amountGiven || 0) + amount,
            remainingAmount: Math.max(0, newPaid),
            paid: isFullyPaid,
            statutPaiement: isFullyPaid ? 'payé' : 'partiel',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (isFullyPaid) {
            update.datePaiement = firebase.firestore.FieldValue.serverTimestamp();
            update.paidAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        return db.collection('ventes').doc(id).update(update).catch(function() {}).then(function() {
            return db.collection('credits').doc(id).update(update).catch(function() {});
        }).then(function() {
            var updatedCredit = {
                ...credit,
                amountGiven: (credit.amountGiven || 0) + amount,
                remainingAmount: Math.max(0, newPaid),
                paid: isFullyPaid,
                statutPaiement: isFullyPaid ? 'payé' : 'partiel'
            };
            return CacheDB.set('credits', id, updatedCredit);
        });
    });

    Promise.all(promises).then(function() {
        alert('✅ Paiement effectué avec succès !');
        closeCreditSelection();
        if (typeof loadCredits === 'function') {
            loadCredits();
        }
        CacheDB.sync();
    }).catch(function(e) {
        alert('❌ Erreur : ' + e.message);
    });
}
window.validateCreditPayment = validateCreditPayment;

function retournerAuPaiement() {
    window._posFilterClientId = null;
    window._posFilterClientName = null;
    window._fromPos = false;
    navigateTo('pos');
}
window.retournerAuPaiement = retournerAuPaiement;

window.filterByPeriodWithDatesCredits = filterByPeriodWithDatesCredits;
window.updateCreditsStats = updateCreditsStats;
window.appliquerFiltreDatePersonnaliseCredits = appliquerFiltreDatePersonnaliseCredits;
window.reinitialiserFiltresCredits = reinitialiserFiltresCredits;
window.confirmerPaiementCreditZero = confirmerPaiementCreditZero;

// ==================== ✅ FONCTION : Filtrer par client (clic sur nom) ====================
function filtrerParClient(clientName, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('🖱️ Clic sur client :', clientName);
    
    var searchInput = document.getElementById('creditsSearchInput');
    if (!searchInput) {
        console.warn('⚠️ Champ de recherche introuvable');
        return;
    }
    
    searchInput.value = clientName;
    window.creditsSearch = clientName;
    window.currentPages.credits = 1;
    
    var clearBtn = document.getElementById('creditsClearBtn');
    if (clearBtn) clearBtn.classList.remove('hidden');
    
    applyCreditsFilters();
    
    var tableContainer = document.getElementById('creditsTableContainer');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setTimeout(function() {
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, 100);
}
window.filtrerParClient = filtrerParClient;

// ==================== EXPOSITION DES FONCTIONS GLOBALES ====================

window.loadCreditsPage = loadCreditsPage;
window.loadCredits = loadCredits;
window.applyCreditsFilters = applyCreditsFilters;
window.renderCreditsTablePro = renderCreditsTablePro;
window.editCredit = editCredit;
window.deleteCredit = deleteCredit;
window.saveEditCredit = saveEditCredit;
window.payerCredit = payerCredit;
window.printFacture = printFacture;
window.imprimerFactureCredit = imprimerFactureCredit;
window.normalize = normalize;

window.toggleCreditSelectionMode = toggleCreditSelectionMode;
window.toggleCreditSelection = toggleCreditSelection;
window.deleteSelectedCredits = deleteSelectedCredits;
window.updateDeleteButtonVisibility = updateDeleteButtonVisibility;
window.toggleSelectAllVisible = toggleSelectAllVisible;
window.selectAllVisibleCredits = selectAllVisibleCredits;
window.deselectAllVisibleCredits = deselectAllVisibleCredits;
window.closeCreditSelection = closeCreditSelection;
window.clearCreditsSearch = clearCreditsSearch;
window.handleCreditsSearch = handleCreditsSearch;
window.handleSearchInputCredits = handleSearchInputCredits;
window.processCreditsSearchFromVoice = processCreditsSearchFromVoice;
window.detectPeriodFilterCredits = detectPeriodFilterCredits;
window.loadClientsForSearchCredits = loadClientsForSearchCredits;
window.filterCreditsBySearchWithDescription = filterCreditsBySearchWithDescription;
window.injectCreditsStyles = injectCreditsStyles;
window.renderCreditFactureCell = renderCreditFactureCell;
window.renderCreditDateCell = renderCreditDateCell;
window.renderCreditClientCell = renderCreditClientCell;
window.renderCreditDatePaiementCell = renderCreditDatePaiementCell;

window.openCreditFactureDetails = openCreditFactureDetails;
window.closeCreditFactureDetails = closeCreditFactureDetails;
window.loadCreditFactureDetails = loadCreditFactureDetails;
window.renderCreditFactureDetails = renderCreditFactureDetails;
window.printCreditFactureDetails = printCreditFactureDetails;

window.openCreditPaymentModal = openCreditPaymentModal;
window.confirmCreditPayment = confirmCreditPayment;
window.validateCreditPayment = validateCreditPayment;

window.sendCreditWhatsApp = sendCreditWhatsApp;

window.paySelectedCredits = paySelectedCredits;
window.creerFacturePaiementCredits = creerFacturePaiementCredits;
window.posAfficherOptionWhatsAppPaiement = posAfficherOptionWhatsAppPaiement;
window.posEnvoyerWhatsAppPaiement = posEnvoyerWhatsAppPaiement;
window.posFermerModalWhatsAppPaiement = posFermerModalWhatsAppPaiement;

window.renderCreditsTable = renderCreditsTablePro;

window.getPaginationHTML = window.getPaginationHTML || getPaginationHTML;
window.changePage = window.changePage || changePage;
window.getPageData = window.getPageData || getPageData;

console.log('🚀 E-SOLUTION - Admin Credits PRO chargé');
console.log('✅ Admin-Credits lit désormais depuis la collection VENTES (filtrée crédit/partiel)');
console.log('✅ Mêmes colonnes que Admin-Ventes : Date paiement, Options, Achat, Profit, Remise, Donné, Restant, Rendu, Statut, Vendeur, Paiement');
console.log('✅ Paiement / Édition / Suppression → mettent à jour VENTES + CREDITS (compatibilité POS)');
console.log('✅ Liste rechargée automatiquement après paiement → les crédits soldés disparaissent');
console.log('✅ Détails facture crédit modal - Font size agrandi');
console.log('✅ Pagination corrigée - Utilise window.itemsPerPage');
console.log('✅ Caissier : Marquer payé, Modifier, Envoyer WhatsApp');
console.log('✅ SEUL L\'ADMIN PEUT SUPPRIMER');
console.log('✅ Retour au paiement depuis le POS (uniquement si venu du POS)');
console.log('✅ Pré-sélection du client avec recherche auto');
console.log('✅ Statistiques en haut de page avec filtres de date');
console.log('✅ Bouton "Marquer payé" pour paiement groupé');
console.log('✅ Création facture "PAI-YYYY-XXXXX" après paiement + WhatsApp');
console.log('✅ WhatsApp DÉTAILLÉ avec toutes les factures + produits + sous-totaux + total général');
console.log('✅ DIALOGUE OUI/NON pour multi-clients');
console.log('✅ Design MODERNE (cartes stats, table épurée, badges, boutons colorés)');
console.log('✅ Nom du client CLIQUABLE → filtre automatique');
console.log('✅ SCROLL HORIZONTAL + VERTICAL sur la table');
console.log('✅ Enregistrement + affichage de la date de paiement (datePaiement)');
