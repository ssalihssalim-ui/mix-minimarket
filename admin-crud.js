// ==================== ADMIN-CRUD.JS - E-SOLUTION ====================
// Contient : Catégories, Produits, Clients, Fournisseurs
// ✅ Police 24px sur toutes les pages d'administration
// ✅ Module Achats fournisseur avec modal 90% (écran)
// ✅ Reconnaissance par IA via Cloudflare Worker (sécurisé)
// ✅ Gestion du stock, prix boîte, date d'expiration
// 🆕 ✅ Date de production + Durée de conservation + Date d'expiration par produit
// 🆕 ✅ Durées par défaut intelligentes selon la catégorie
// 🆕 ✅ Badges colorés (production = bleu, expiration = vert/orange/rouge)
// 🆕 🎨 PAGE PRODUITS MODERNE style POS (bleu/blanc, cards)
// 🆕 📷 Bouton "Scanner" sans mention Gemini
// 🆕 ⚠️ Détection prix changé → alerte + confirmation
// 🆕 💰 Total général affiché EN BAS du formulaire d'achat
// 🆕 🔍 Barre de recherche produit dans la liste d'achat

// ====================================================
//  🔑  CONFIGURATION IA (via Cloudflare Worker)
// ====================================================
const GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';

// ========== INITIALISATION DE LA RECHERCHE PRODUIT ==========
window.productSearchQuery = window.productSearchQuery || '';

// ====================================================
//  🎨 STYLES INJECTÉS (produits modernes + achats pro)
// ====================================================
function injectAdminCrudsStyles() {
    if (document.getElementById('admin-cruds-modern-styles')) return;
    var css = `
    <style id="admin-cruds-modern-styles">
    :root {
        --ac-blue-50:#EFF6FF; --ac-blue-100:#DBEAFE; --ac-blue-200:#BFDBFE;
        --ac-blue-500:#3B82F6; --ac-blue-600:#2563EB; --ac-blue-700:#1D4ED8;
        --ac-white:#FFFFFF; --ac-gray-50:#F8FAFC; --ac-gray-100:#F1F5F9;
        --ac-gray-200:#E2E8F0; --ac-gray-400:#94A3B8; --ac-gray-500:#64748B;
        --ac-gray-700:#334155; --ac-gray-900:#0F172A;
        --ac-green:#10B981; --ac-red:#EF4444; --ac-orange:#F59E0B;
        --ac-shadow-sm:0 1px 2px rgba(0,0,0,0.04);
        --ac-shadow-md:0 4px 12px rgba(0,0,0,0.06);
        --ac-shadow-lg:0 12px 32px rgba(0,0,0,0.08);
        --ac-radius:12px; --ac-radius-lg:16px;
    }

    /* ========== PAGE PRODUITS MODERNE ========== */
    .ac-products-page {
        background: linear-gradient(180deg,#FAFBFC 0%,#F4F6F8 100%);
        min-height:100vh; padding:24px;
        font-family:'Inter',-apple-system,sans-serif;
    }
    .ac-products-header {
        background:var(--ac-white); border-radius:var(--ac-radius-lg);
        padding:24px 28px; box-shadow:var(--ac-shadow-sm);
        border:1px solid rgba(0,0,0,0.04); margin-bottom:20px;
        display:flex; justify-content:space-between; align-items:center;
        flex-wrap:wrap; gap:16px;
    }
    .ac-products-header h2 {
        font-size:24px; font-weight:800; color:var(--ac-gray-900);
        letter-spacing:-0.5px; margin:0;
        display:flex; align-items:center; gap:12px;
    }
    .ac-products-header h2 i {
        background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-700));
        color:white; padding:10px; border-radius:12px; font-size:18px;
        box-shadow:0 4px 12px rgba(59,130,246,0.3);
    }
    .ac-products-actions {
        display:flex; gap:10px; flex-wrap:wrap; align-items:center;
    }
    .ac-btn-pro {
        display:inline-flex; align-items:center; gap:8px;
        padding:11px 20px; border:none; border-radius:10px;
        font-size:14px; font-weight:600; cursor:pointer;
        transition:all 0.2s ease; font-family:'Inter',sans-serif;
        white-space:nowrap;
    }
    .ac-btn-pro:disabled { opacity:0.5; cursor:not-allowed; }
    .ac-btn-pro-primary {
        background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-600));
        color:white; box-shadow:0 2px 8px rgba(59,130,246,0.3);
    }
    .ac-btn-pro-primary:hover:not(:disabled) {
        transform:translateY(-2px); box-shadow:0 6px 16px rgba(59,130,246,0.4);
    }
    .ac-btn-pro-achat {
        background:linear-gradient(135deg,var(--ac-green),#059669);
        color:white; box-shadow:0 2px 8px rgba(16,185,129,0.3);
    }
    .ac-btn-pro-achat:hover:not(:disabled) {
        transform:translateY(-2px); box-shadow:0 6px 16px rgba(16,185,129,0.4);
    }
    .ac-btn-pro-scan {
        background:linear-gradient(135deg,#06B6D4,#0891B2);
        color:white; box-shadow:0 2px 8px rgba(6,182,212,0.3);
    }
    .ac-btn-pro-scan:hover:not(:disabled) {
        transform:translateY(-2px); box-shadow:0 6px 16px rgba(6,182,212,0.4);
    }
    .ac-btn-pro-ghost {
        background:var(--ac-gray-100); color:var(--ac-gray-700);
        border:1.5px solid var(--ac-gray-200);
    }
    .ac-btn-pro-ghost:hover:not(:disabled) {
        background:var(--ac-gray-200); border-color:var(--ac-gray-400);
    }
    .ac-search-pro {
        display:flex; align-items:center; gap:8px;
        background:var(--ac-white); border:1.5px solid var(--ac-gray-200);
        border-radius:12px; padding:4px 4px 4px 16px;
        transition:all 0.2s ease; flex:1; min-width:240px;
        box-shadow:var(--ac-shadow-sm);
    }
    .ac-search-pro:focus-within {
        border-color:var(--ac-blue-500);
        box-shadow:0 0 0 4px rgba(59,130,246,0.1);
    }
    .ac-search-pro i { color:var(--ac-gray-400); font-size:16px; }
    .ac-search-pro input {
        flex:1; border:none; background:transparent;
        padding:10px 8px; font-size:15px; outline:none;
        color:var(--ac-gray-900); font-family:'Inter',sans-serif;
    }
    .ac-search-pro input::placeholder { color:var(--ac-gray-400); }
    .ac-filter-select {
        padding:11px 14px; border:1.5px solid var(--ac-gray-200);
        border-radius:10px; font-size:14px; font-weight:500;
        font-family:'Inter',sans-serif; min-width:180px;
        background:var(--ac-white); color:var(--ac-gray-900);
        transition:all 0.2s ease; outline:none; cursor:pointer;
    }
    .ac-filter-select:focus {
        border-color:var(--ac-blue-500);
        box-shadow:0 0 0 4px rgba(59,130,246,0.1);
    }

    /* ========== GRILLE PRODUITS ========== */
    .ac-products-grid {
        display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
        gap:16px; margin-bottom:20px;
    }
    .ac-product-card {
        background:var(--ac-white); border-radius:var(--ac-radius);
        border:1px solid rgba(0,0,0,0.06); box-shadow:var(--ac-shadow-sm);
        transition:all 0.25s ease; overflow:hidden;
        display:flex; flex-direction:column; position:relative;
    }
    .ac-product-card:hover {
        transform:translateY(-4px); box-shadow:var(--ac-shadow-lg);
        border-color:var(--ac-blue-200);
    }
    .ac-product-card-image {
        width:100%; height:140px;
        background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-blue-100));
        display:flex; align-items:center; justify-content:center;
        font-size:48px; color:var(--ac-blue-500);
        position:relative; overflow:hidden;
    }
    .ac-product-card-image img {
        width:100%; height:100%; object-fit:cover;
    }
    .ac-product-badge {
        position:absolute; top:10px; right:10px;
        padding:4px 10px; border-radius:20px;
        font-size:11px; font-weight:700; text-transform:uppercase;
        letter-spacing:0.5px; background:var(--ac-blue-500); color:white;
    }
    .ac-product-badge.stock-low { background:var(--ac-orange); }
    .ac-product-badge.stock-out { background:var(--ac-red); }
    .ac-product-card-body {
        padding:16px; flex:1; display:flex; flex-direction:column; gap:6px;
    }
    .ac-product-card-title {
        font-size:15px; font-weight:700; color:var(--ac-gray-900);
        margin:0; line-height:1.3;
        display:-webkit-box; -webkit-line-clamp:2;
        -webkit-box-orient:vertical; overflow:hidden;
    }
    .ac-product-card-category {
        font-size:12px; font-weight:500; color:var(--ac-blue-600);
        background:var(--ac-blue-50); padding:2px 8px;
        border-radius:6px; align-self:flex-start;
    }
    .ac-product-card-price {
        display:flex; justify-content:space-between; align-items:center;
        margin-top:8px; padding-top:12px;
        border-top:1px solid var(--ac-gray-100);
    }
    .ac-product-price-vente {
        font-size:18px; font-weight:800; color:var(--ac-blue-600);
        letter-spacing:-0.5px;
    }
    .ac-product-price-achat {
        font-size:12px; color:var(--ac-gray-500);
    }
    .ac-product-card-stock {
        display:flex; align-items:center; gap:6px;
        font-size:12px; color:var(--ac-gray-500); margin-top:4px;
    }
    .ac-product-card-actions {
        display:flex; gap:4px; padding:12px 16px;
        background:var(--ac-gray-50); border-top:1px solid var(--ac-gray-100);
    }
    .ac-product-card-actions button {
        flex:1; padding:8px; border:none; border-radius:8px;
        font-size:12px; font-weight:600; cursor:pointer;
        transition:all 0.2s ease;
        display:flex; align-items:center; justify-content:center; gap:4px;
    }
    .ac-product-card-actions .edit {
        background:var(--ac-blue-50); color:var(--ac-blue-700);
    }
    .ac-product-card-actions .edit:hover {
        background:var(--ac-blue-500); color:white;
    }
    .ac-product-card-actions .delete {
        background:#FEF2F2; color:var(--ac-red);
    }
    .ac-product-card-actions .delete:hover {
        background:var(--ac-red); color:white;
    }
    .ac-empty-state {
        text-align:center; padding:60px 20px; color:var(--ac-gray-500);
    }
    .ac-empty-state i {
        font-size:64px; color:var(--ac-gray-200); margin-bottom:16px;
    }
    .ac-empty-state h3 {
        font-size:18px; color:var(--ac-gray-700); margin:0 0 8px 0;
    }
    .ac-empty-state p { font-size:14px; margin:0; }

    /* ========== MODAL ACHAT PRO ========== */
    .ac-achat-overlay {
        position:fixed; inset:0; background:rgba(15,23,42,0.65);
        backdrop-filter:blur(6px); z-index:9999;
        display:flex; align-items:center; justify-content:center;
        padding:20px; animation:acFadeIn 0.2s ease;
    }
    @keyframes acFadeIn { from { opacity:0; } to { opacity:1; } }
    .ac-achat-modal {
        background:var(--ac-white); border-radius:var(--ac-radius-lg);
        width:100%; max-width:1200px; height:90vh; max-height:90vh;
        display:flex; flex-direction:column;
        box-shadow:0 24px 64px rgba(0,0,0,0.25);
        animation:acSlideUp 0.3s ease; overflow:hidden;
    }
    @keyframes acSlideUp {
        from { transform:translateY(20px); opacity:0; }
        to { transform:translateY(0); opacity:1; }
    }
    .ac-achat-header {
        padding:20px 28px; border-bottom:1px solid var(--ac-gray-200);
        display:flex; justify-content:space-between; align-items:center;
        background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-white));
    }
    .ac-achat-header h3 {
        font-size:20px; font-weight:800; color:var(--ac-gray-900);
        margin:0; display:flex; align-items:center; gap:12px;
        letter-spacing:-0.3px;
    }
    .ac-achat-header h3 i {
        background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-700));
        color:white; padding:10px; border-radius:12px; font-size:18px;
        box-shadow:0 4px 12px rgba(59,130,246,0.3);
    }
    .ac-achat-close {
        width:40px; height:40px; border-radius:50%;
        border:none; background:var(--ac-gray-100);
        color:var(--ac-gray-500); font-size:18px; cursor:pointer;
        transition:all 0.2s ease;
    }
    .ac-achat-close:hover {
        background:var(--ac-gray-200); color:var(--ac-gray-900);
        transform:rotate(90deg);
    }
    .ac-achat-toolbar {
        padding:16px 28px; background:var(--ac-gray-50);
        border-bottom:1px solid var(--ac-gray-200);
        display:flex; gap:12px; flex-wrap:wrap; align-items:center;
    }
    .ac-achat-toolbar .ac-fournisseur-select {
        padding:11px 14px; border:1.5px solid var(--ac-gray-200);
        border-radius:10px; font-size:14px; font-weight:500;
        font-family:'Inter',sans-serif; min-width:280px;
        background:var(--ac-white); color:var(--ac-gray-900);
        transition:all 0.2s ease; outline:none; cursor:pointer;
    }
    .ac-achat-toolbar .ac-fournisseur-select:focus {
        border-color:var(--ac-blue-500);
        box-shadow:0 0 0 4px rgba(59,130,246,0.1);
    }
    .ac-achat-toolbar .ac-search-pro { min-width:240px; flex:1; }
    .ac-achat-body {
        flex:1; overflow-y:auto; padding:20px 28px; background:var(--ac-white);
    }
    .ac-achat-table {
        width:100%; border-collapse:separate; border-spacing:0;
        font-size:14px;
    }
    .ac-achat-table thead th {
        position:sticky; top:0; background:var(--ac-gray-50);
        padding:12px 10px; text-align:left;
        font-size:11px; font-weight:700; color:var(--ac-gray-500);
        text-transform:uppercase; letter-spacing:0.6px;
        border-bottom:2px solid var(--ac-gray-200); z-index:2;
    }
    .ac-achat-table thead th.center { text-align:center; }
    .ac-achat-table tbody td {
        padding:12px 10px; border-bottom:1px solid var(--ac-gray-100);
        vertical-align:middle; color:var(--ac-gray-700);
    }
    .ac-achat-table tbody tr { transition:background 0.15s ease; }
    .ac-achat-table tbody tr:hover td { background:var(--ac-blue-50); }
    .ac-achat-table tbody tr.has-changement td {
        background:#FEF3C7 !important;
    }
    .ac-achat-table tbody tr.has-changement:hover td {
        background:#FDE68A !important;
    }
    .ac-achat-table .ac-product-name {
        font-weight:600; color:var(--ac-gray-900); font-size:14px;
    }
    .ac-achat-table .ac-product-id {
        font-size:11px; color:var(--ac-gray-400);
        font-family:'Monaco',monospace;
    }
    .ac-achat-table input[type="number"],
    .ac-achat-table input[type="date"] {
        width:100%; padding:8px 10px;
        border:1.5px solid var(--ac-gray-200); border-radius:8px;
        font-size:14px; font-family:'Inter',sans-serif;
        color:var(--ac-gray-900); background:var(--ac-white);
        transition:all 0.2s ease; outline:none; text-align:center;
    }
    .ac-achat-table input:focus {
        border-color:var(--ac-blue-500);
        box-shadow:0 0 0 3px rgba(59,130,246,0.1);
    }
    .ac-achat-table input.changed {
        border-color:var(--ac-orange); background:#FFFBEB;
    }
    .ac-achat-table .ac-total-cell {
        font-weight:800; color:var(--ac-blue-600);
        font-size:15px; text-align:center;
    }
    .ac-achat-table .ac-price-old {
        font-size:11px; color:var(--ac-gray-400);
        text-decoration:line-through; display:block;
    }
    .ac-achat-table .ac-price-change-badge {
        display:inline-flex; align-items:center; gap:4px;
        padding:2px 8px; border-radius:6px;
        font-size:11px; font-weight:700;
        background:#FEF3C7; color:#92400E; margin-top:4px;
    }
    .ac-achat-table .ac-price-change-badge.up {
        background:#FEE2E2; color:#991B1B;
    }
    .ac-achat-table .ac-price-change-badge.down {
        background:#D1FAE5; color:#065F46;
    }
    .ac-achat-footer {
        padding:20px 28px; border-top:2px solid var(--ac-gray-200);
        background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-white));
        display:flex; justify-content:space-between; align-items:center;
        gap:16px; flex-wrap:wrap;
    }
    .ac-achat-totals {
        display:flex; gap:24px; align-items:center; flex-wrap:wrap;
    }
    .ac-achat-total-block {
        display:flex; flex-direction:column; gap:2px;
    }
    .ac-achat-total-block .label {
        font-size:11px; font-weight:700; color:var(--ac-gray-500);
        text-transform:uppercase; letter-spacing:0.5px;
    }
    .ac-achat-total-block .value {
        font-size:22px; font-weight:800; color:var(--ac-gray-900);
        letter-spacing:-0.5px;
    }
    .ac-achat-total-block .value.blue { color:var(--ac-blue-600); }
    .ac-achat-total-block .value.green { color:var(--ac-green); }
    .ac-achat-actions {
        display:flex; gap:12px; align-items:center;
    }
    .ac-scan-overlay {
        position:fixed; inset:0; background:rgba(15,23,42,0.85);
        backdrop-filter:blur(8px); z-index:10000;
        display:flex; align-items:center; justify-content:center;
        flex-direction:column; gap:20px; color:white;
    }
    .ac-scan-overlay .spinner {
        width:60px; height:60px;
        border:4px solid rgba(255,255,255,0.2);
        border-top-color:var(--ac-blue-500);
        border-radius:50%; animation:acSpin 1s linear infinite;
    }
    @keyframes acSpin { to { transform:rotate(360deg); } }
    .ac-scan-overlay p {
        font-size:18px; font-weight:600; margin:0;
    }

    @media (max-width:768px) {
        .ac-products-page { padding:12px; }
        .ac-products-header {
            padding:16px; flex-direction:column; align-items:stretch;
        }
        .ac-products-actions {
            flex-direction:column; align-items:stretch;
        }
        .ac-search-pro { min-width:0; width:100%; }
        .ac-products-grid { grid-template-columns:1fr; }
        .ac-achat-modal {
            max-width:100%; height:100vh; max-height:100vh; border-radius:0;
        }
        .ac-achat-toolbar {
            padding:12px 16px; flex-direction:column; align-items:stretch;
        }
        .ac-achat-toolbar .ac-fournisseur-select,
        .ac-achat-toolbar .ac-search-pro {
            min-width:0; width:100%;
        }
        .ac-achat-body { padding:12px; }
        .ac-achat-table { font-size:12px; }
        .ac-achat-table thead th,
        .ac-achat-table tbody td { padding:8px 4px; }
        .ac-achat-footer {
            padding:16px; flex-direction:column; align-items:stretch;
        }
        .ac-achat-totals { justify-content:space-between; }
        .ac-achat-actions { flex-direction:column; }
        .ac-achat-actions button { width:100%; }
    }
    </style>`;
    document.head.insertAdjacentHTML('beforeend', css);
}
injectAdminCrudsStyles();
window.injectAdminCrudsStyles = injectAdminCrudsStyles;

// ========== FONCTIONS UTILITAIRES ==========
function updateSelectedCategories() {
    var select = document.getElementById('prodCategoriesSelect');
    var display = document.getElementById('selectedCategoriesDisplay');
    if (!select || !display) return;
    var selected = Array.from(select.selectedOptions).map(opt => opt.value);
    display.innerHTML = selected.map(function(cat) {
        return '<span style="background:#111827; color:#fff; padding:8px 14px; border-radius:24px; font-size:20px; display:inline-flex; align-items:center; gap:8px;">' +
            escapeHtml(cat) +
            '<span onclick="event.stopPropagation(); this.parentElement.remove(); deselectCategory(\'' + escapeHtml(cat.replace(/'/g, "\\'")) + '\')" style="cursor:pointer; font-weight:bold; margin-left:6px; font-size:22px;">×</span>' +
            '</span>';
    }).join('');
}

function deselectCategory(catName) {
    var select = document.getElementById('prodCategoriesSelect');
    if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === catName) {
            select.options[i].selected = false;
            break;
        }
    }
    updateSelectedCategories();
}

window.updateSelectedCategories = updateSelectedCategories;
window.deselectCategory = deselectCategory;

// ========== 🆕 DATES DE PRODUCTION / EXPIRATION ==========

// ✅ Durées de conservation par défaut selon la catégorie (en jours)
var DUREES_CONSERVATION_DEFAUT = {
    'produits laitiers': 20, 'laitier': 20, 'laitiers': 20, 'lait': 15,
    'yaourt': 21, 'fromage': 30, 'beurre': 60, 'crème': 15, 'creme': 15,
    'viande': 3, 'viandes': 3, 'poulet': 2, 'poisson': 2, 'poissons': 2, 'charcuterie': 7,
    'fruits': 7, 'légumes': 7, 'legumes': 7, 'fruits et légumes': 7,
    'pain': 3, 'viennoiserie': 2, 'pâtisserie': 3, 'patisserie': 3, 'boulangerie': 3,
    'boissons': 180, 'jus': 30, 'soda': 180, 'eau': 365,
    'épicerie': 365, 'epicerie': 365, 'sec': 365, 'pâtes': 365, 'pates': 365,
    'riz': 365, 'conserves': 730, 'conserve': 730,
    'surgelés': 180, 'surgele': 180, 'surgele': 180,
    'hygiène': 730, 'hygiene': 730, 'entretien': 730, 'cosmétique': 730, 'cosmetique': 730
};

function getDureeConservationParCategorie(categorieNom) {
    if (!categorieNom) return 0;
    var key = categorieNom.toLowerCase().trim();
    if (DUREES_CONSERVATION_DEFAUT[key] !== undefined) return DUREES_CONSERVATION_DEFAUT[key];
    for (var k in DUREES_CONSERVATION_DEFAUT) {
        if (DUREES_CONSERVATION_DEFAUT.hasOwnProperty(k)) {
            if (key.indexOf(k) !== -1) return DUREES_CONSERVATION_DEFAUT[k];
        }
    }
    return 0;
}
window.getDureeConservationParCategorie = getDureeConservationParCategorie;

function remplirDateProductionAujourdhui() {
    var input = document.getElementById('prodDateProduction');
    if (input && !input.value) {
        var today = new Date();
        var yyyy = today.getFullYear();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        input.value = yyyy + '-' + mm + '-' + dd;
    }
}
window.remplirDateProductionAujourdhui = remplirDateProductionAujourdhui;

function calculerDateExpirationAuto() {
    var productionInput = document.getElementById('prodDateProduction');
    var dureeInput = document.getElementById('prodDureeConservation');
    var dateInput = document.getElementById('prodDateExpiration');
    if (!dureeInput || !dateInput) return;

    var duree = parseInt(dureeInput.value) || 0;
    if (duree <= 0) {
        dateInput.value = '';
        return;
    }

    var base = null;
    if (productionInput && productionInput.value) {
        base = new Date(productionInput.value);
    }
    if (!base || isNaN(base.getTime())) {
        base = new Date();
    }

    var expiration = new Date(base.getTime() + duree * 86400000);
    var yyyy = expiration.getFullYear();
    var mm = String(expiration.getMonth() + 1).padStart(2, '0');
    var dd = String(expiration.getDate()).padStart(2, '0');
    dateInput.value = yyyy + '-' + mm + '-' + dd;
}
window.calculerDateExpirationAuto = calculerDateExpirationAuto;

function autoRemplirDureeParCategorie() {
    var dureeInput = document.getElementById('prodDureeConservation');
    var select = document.getElementById('prodCategoriesSelect');
    if (!dureeInput || !select) return;
    if (dureeInput.value && parseInt(dureeInput.value) > 0) return;

    var selected = Array.from(select.selectedOptions).map(opt => opt.value);
    if (selected.length === 0) return;

    var duree = getDureeConservationParCategorie(selected[0]);
    if (duree > 0) {
        dureeInput.value = duree;
        calculerDateExpirationAuto();
    }
}
window.autoRemplirDureeParCategorie = autoRemplirDureeParCategorie;

function renderDateProductionCell(dateProduction) {
    if (!dateProduction) {
        return '<span style="color:#94a3b8;font-size:18px;">—</span>';
    }
    var d = null;
    if (dateProduction.toDate) d = dateProduction.toDate();
    else if (dateProduction.seconds) d = new Date(dateProduction.seconds * 1000);
    else if (typeof dateProduction === 'string') d = new Date(dateProduction);
    else if (dateProduction instanceof Date) d = dateProduction;

    if (!d || isNaN(d.getTime())) {
        return '<span style="color:#94a3b8;font-size:18px;">—</span>';
    }

    var dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var maintenant = new Date();
    maintenant.setHours(0, 0, 0, 0);
    var prod = new Date(d);
    prod.setHours(0, 0, 0, 0);
    var joursDepuis = Math.ceil((maintenant - prod) / 86400000);

    var tooltip = joursDepuis === 0 ? 'Produit aujourd\'hui' :
                  joursDepuis > 0 ? 'Produit il y a ' + joursDepuis + ' jour(s)' :
                  'Date dans le futur';

    return '<span class="status-success" title="' + tooltip + '" style="font-size:18px; padding:4px 12px; white-space:nowrap; background:#EFF6FF; color:#2563EB; border-color:#BFDBFE;">' +
           '<i class="fas fa-industry"></i> ' + dateStr +
           '</span>';
}
window.renderDateProductionCell = renderDateProductionCell;

function renderExpirationBadge(dateExpiration) {
    if (!dateExpiration) {
        return '<span style="color:#94a3b8;font-size:18px;">—</span>';
    }
    var d = null;
    if (dateExpiration.toDate) d = dateExpiration.toDate();
    else if (dateExpiration.seconds) d = new Date(dateExpiration.seconds * 1000);
    else if (typeof dateExpiration === 'string') d = new Date(dateExpiration);
    else if (dateExpiration instanceof Date) d = dateExpiration;

    if (!d || isNaN(d.getTime())) {
        return '<span style="color:#94a3b8;font-size:18px;">—</span>';
    }

    var maintenant = new Date();
    maintenant.setHours(0, 0, 0, 0);
    var expire = new Date(d);
    expire.setHours(0, 0, 0, 0);

    var joursRestants = Math.ceil((expire - maintenant) / 86400000);
    var dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    var cls, label, icone, tooltip;
    if (joursRestants < 0) {
        cls = 'status-danger'; icone = 'fa-times-circle';
        label = dateStr + ' (expiré)';
        tooltip = 'Expiré depuis ' + Math.abs(joursRestants) + ' jour(s)';
    } else if (joursRestants === 0) {
        cls = 'status-danger'; icone = 'fa-exclamation-triangle';
        label = dateStr + " (aujourd'hui)";
        tooltip = "Expire aujourd'hui";
    } else if (joursRestants <= 3) {
        cls = 'status-danger'; icone = 'fa-exclamation-triangle';
        label = dateStr + ' (J-' + joursRestants + ')';
        tooltip = 'Expire dans ' + joursRestants + ' jour(s)';
    } else if (joursRestants <= 7) {
        cls = 'status-warning'; icone = 'fa-clock';
        label = dateStr + ' (J-' + joursRestants + ')';
        tooltip = 'Expire dans ' + joursRestants + ' jour(s)';
    } else if (joursRestants <= 30) {
        cls = 'status-warning'; icone = 'fa-clock';
        label = dateStr;
        tooltip = 'Expire dans ' + joursRestants + ' jour(s)';
    } else {
        cls = 'status-success'; icone = 'fa-calendar-check';
        label = dateStr;
        tooltip = 'Expire dans ' + joursRestants + ' jour(s)';
    }

    return '<span class="' + cls + '" title="' + tooltip + '" style="font-size:18px; padding:4px 12px; white-space:nowrap;">' +
           '<i class="fas ' + icone + '"></i> ' + label +
           '</span>';
}
window.renderExpirationBadge = renderExpirationBadge;

// ==================== CATÉGORIES ====================
function loadCategoriesPage(c) {
    c.innerHTML = '<div class="content-card">' +
        '<div class="card-header"><h3 style="font-size:28px;"><i class="fas fa-layer-group"></i> Catégories</h3><button class="btn-add" onclick="openCategoryForm()" style="font-size:24px; padding:14px 24px;"><i class="fas fa-plus"></i> Nouvelle</button></div>' +
        '<div class="table-container"><table class="data-table" id="categoriesTable" style="font-size:22px;"><thead><tr><th style="font-size:22px; padding:14px 10px;">Image</th>' +
        makeSortableHeader('categories', 'nom', 'Nom', 'loadCategories') +
        makeSortableHeader('categories', 'description', 'Description', 'loadCategories') +
        makeSortableHeader('categories', 'ordre', 'Ordre', 'loadCategories') +
        makeSortableHeader('categories', 'ca', 'CA', 'loadCategories') +
        makeSortableHeader('categories', 'profit', 'Profit', 'loadCategories') +
        '<th style="font-size:22px; padding:14px 10px;">Nb Produits</th><th style="font-size:22px; padding:14px 10px;">Recette</th><th style="font-size:22px; padding:14px 10px;">Actions</th>' +
        '</thead><tbody style="font-size:22px;"></tbody></div><div id="categoriesPagination"></div></div>';
    loadCategories();
}

async function loadCategories() {
    const cached = await CacheDB.getAll('categories');
    if (cached.length) {
        allCategoriesData = cached;
        renderCategoriesTable();
    }

    if (allCategoriesData.length === 0) {
        try {
            const snapshot = await db.collection('categories').get();
            allCategoriesData = [];
            snapshot.forEach(d => allCategoriesData.push({ id: d.id, ...d.data() }));
            for (let doc of allCategoriesData) await CacheDB.set('categories', doc.id, doc);
            renderCategoriesTable();
        } catch (e) { console.error(e); }
    }
}

async function renderCategoriesTable() {
    var tb = document.querySelector('#categoriesTable tbody');
    if (!tb) return;
    var data = applySort('categories', allCategoriesData.slice(), 'nom');
    var pageData = getPageData('categories', data);
    tb.innerHTML = '';
    if (pageData.length === 0) {
        tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;font-size:24px;">Aucune catégorie</td></tr>';
        document.getElementById('categoriesPagination').innerHTML = ''; return;
    }

    var counts = {};
    (window.allProductsData || []).forEach(function(p) {
        if (p.categorie) {
            if (!counts[p.categorie]) counts[p.categorie] = 0;
            counts[p.categorie]++;
        }
        if (p.categories) {
            p.categories.forEach(function(cat) {
                if (!counts[cat]) counts[cat] = 0;
                counts[cat]++;
            });
        }
    });

    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var pc = counts[d.nom] || 0;

        var im = d.imageBase64 ? '<img src="' + d.imageBase64 + '" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">' : '<i class="fas fa-folder fa-3x" style="color:#14B8A6;"></i>';
        var pcol = (d.profit || 0) >= 0 ? '#14B8A6' : '#dc2626';
        var recetteBadge = d.recette ? '<span class="status-success" style="font-size:20px; padding:6px 14px;">✅ Oui</span>' : '<span class="status-warning" style="font-size:20px; padding:6px 14px;">❌ Non</span>';
        tb.innerHTML += '<tr><td style="padding:14px 10px;">' + im + '</td><td style="padding:14px 10px; font-size:24px; font-weight:600;"><strong>' + escapeHtml(d.nom || '') + '</strong></td><td style="padding:14px 10px; font-size:22px;">' + escapeHtml(d.description || '-') + '</td><td style="padding:14px 10px; font-size:22px;">' + (d.ordre || 0) + '</td><td style="padding:14px 10px; font-size:22px;">' + (d.ca || 0).toFixed(2) + ' MAD</td><td style="padding:14px 10px; font-size:22px; color:' + pcol + ';">' + (d.profit || 0).toFixed(2) + ' MAD</td><td style="padding:14px 10px; font-size:22px;">' + pc + '</td><td style="padding:14px 10px;">' + recetteBadge + '</td><td style="padding:14px 10px;"><button class="btn-edit" onclick="editDocument(\'categories\',\'' + d.id + '\')" style="font-size:22px; padding:10px 16px;"><i class="fas fa-edit"></i></button> <button class="btn-delete" onclick="deleteDocument(\'categories\',\'' + d.id + '\')" style="font-size:22px; padding:10px 16px;"><i class="fas fa-trash"></i></button></td></tr>';
    }
    document.getElementById('categoriesPagination').innerHTML = getPaginationHTML('categories', data.length);
}

function openCategoryForm(data) {
    data = data || {}; editCategoryData = data;
    var recetteChecked = data.recette ? 'checked' : '';
    var h = '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Image</label><input type="file" id="catImage" onchange="previewImage(this,\'catPreview\')" style="font-size:20px; padding:10px;"><div id="catPreview">' + (data.imageBase64 ? '<img src="' + data.imageBase64 + '" style="max-width:120px;">' : '') + '</div></div></div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Nom *</label><input type="text" id="catNom" value="' + escapeHtml(data.nom || '') + '" required style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Ordre d\'affichage</label><input type="number" id="catOrdre" value="' + (data.ordre || 0) + '" min="0" step="1" placeholder="0 = fin de liste" style="font-size:22px; padding:14px;"></div></div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Description</label><textarea id="catDesc" style="font-size:22px; padding:14px;">' + escapeHtml(data.description || '') + '</textarea></div><div class="form-group"><label style="font-size:22px;">CA</label><input type="number" id="catCA" value="' + (data.ca || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div></div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Profit</label><input type="number" id="catProfit" value="' + (data.profit || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Recette</label><div style="display:flex; align-items:center; gap:12px; margin-top:6px;"><input type="checkbox" id="catRecette" ' + recetteChecked + ' style="width:28px; height:28px;"><span style="font-size:22px;">Activer la personnalisation</span></div></div></div>' +
        '<div style="display:flex; gap:12px; margin-top:20px;"><button class="btn-cancel" onclick="closeModal()" style="font-size:22px; padding:14px 28px;">Annuler</button><button class="btn-save" onclick="saveCategory()" style="font-size:22px; padding:14px 28px;">Enregistrer</button></div>';
    currentCollection = 'categories';
    openModal(editingId ? 'Modifier Catégorie' : 'Nouvelle Catégorie', h);
}

function saveCategory() {
    var n = document.getElementById('catNom').value;
    if (!n) { alert('Nom obligatoire'); return; }
    var f = document.getElementById('catImage').files[0];
    var recette = document.getElementById('catRecette').checked;
    var existingImage = (editingId && editCategoryData) ? editCategoryData.imageBase64 : null;
    var sf = function(img) {
        var d = {
            nom: n,
            description: document.getElementById('catDesc').value,
            ca: parseFloat(document.getElementById('catCA').value) || 0,
            profit: parseFloat(document.getElementById('catProfit').value) || 0,
            recette: recette,
            ordre: parseInt(document.getElementById('catOrdre').value) || 0
        };
        d.imageBase64 = img || existingImage;
        saveDocument('categories', d, function() {
            closeModal();
            refreshCurrentPage();

            if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
                CacheDB.saveCollection('categories');
            }
        });
    };
    if (f) fileToBase64(f, sf); else sf(null);
}

// ==================== PRODUITS ====================
async function loadStockForProductForm() {
    if (typeof allStockData === 'undefined' || allStockData.length === 0) {
        try { const snap = await db.collection('stock').orderBy('nom').get(); allStockData = []; snap.forEach(d => { let dd = d.data(); dd.id = d.id; allStockData.push(dd); }); } catch (e) { console.error(e); }
    }
}

async function loadFournisseursForForm() {
    let fournisseurs = [];
    try {
        const cached = await CacheDB.getAll('fournisseurs');
        if (cached.length) {
            fournisseurs = cached;
        } else {
            const snapshot = await db.collection('fournisseurs').orderBy('nom').get();
            snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; fournisseurs.push(dd); });
            for (let doc of fournisseurs) await CacheDB.set('fournisseurs', doc.id, doc);
        }
    } catch (e) { console.error(e); }
    return fournisseurs;
}

function renderIngredientRow(index, ing) {
    ing = ing || {};
    var stockOptions = '<option value="">-- Choisir --</option>';
    if (typeof allStockData !== 'undefined') { allStockData.forEach(function(s) { var selected = (ing.idStock === s.id) ? 'selected' : ''; stockOptions += '<option value="' + s.id + '" ' + selected + '>' + escapeHtml(s.nom) + ' (' + (s.unite || '') + ')</option>'; }); }
    return '<div class="ingredient-row" style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">' +
        '<select class="ingredient-select" style="flex:1; padding:14px; border:2px solid #e2e8f0; border-radius:8px; font-size:20px;" onchange="updateIngredientUnit(this)">' + stockOptions + '</select>' +
        '<input type="number" class="ingredient-qty" placeholder="Qté" value="' + (ing.quantite || '') + '" step="any" style="width:120px; padding:14px; border:2px solid #e2e8f0; border-radius:8px; font-size:20px;">' +
        '<span class="ingredient-unit" style="min-width:80px; text-align:center; font-size:20px;">' + (ing.unite || '') + '</span>' +
        '<button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="font-size:22px; padding:12px 16px;"><i class="fas fa-times"></i></button></div>';
}

function addIngredientRow() { var container = document.getElementById('productIngredientsList'); if (container) { container.insertAdjacentHTML('beforeend', renderIngredientRow(container.children.length, {})); } }

function updateIngredientUnit(selectEl) {
    var row = selectEl.closest('.ingredient-row'); var unitSpan = row.querySelector('.ingredient-unit');
    var selectedId = selectEl.value; var stockItem = allStockData.find(function(s) { return s.id === selectedId; });
    if (stockItem) { unitSpan.textContent = stockItem.unite || ''; } else { unitSpan.textContent = ''; }
}

function calculatePrixAchat() {
    var boxPrice = parseFloat(document.getElementById('prodBoxPrice').value) || 0;
    var boxUnit = parseFloat(document.getElementById('prodBoxUnit').value) || 1;
    if (boxUnit <= 0) boxUnit = 1;
    var prixAchat = boxPrice / boxUnit;
    document.getElementById('prodPA').value = prixAchat.toFixed(2);
}

// ==================== 🎨 PAGE PRODUITS MODERNE ====================
function loadProductsPage(c) {
    injectAdminCrudsStyles();
    c.innerHTML = `
    <div class="ac-products-page">
        <div class="ac-products-header">
            <h2><i class="fas fa-box"></i> Produits</h2>
            <div class="ac-products-actions">
                <div class="ac-search-pro">
                    <i class="fas fa-search"></i>
                    <input type="text" id="productSearchInput"
                        placeholder="Rechercher un produit..."
                        value="${escapeHtml(window.productSearchQuery || '')}"
                        oninput="window.productSearchQuery = this.value.trim().toLowerCase(); window.currentPages.products=1; renderProductsTable();">
                </div>
                <select id="categoryFilter" class="ac-filter-select" onchange="filterProducts()">
                    <option value="">Toutes catégories</option>
                </select>
                <button class="ac-btn-pro ac-btn-pro-primary" onclick="openProductForm()">
                    <i class="fas fa-plus"></i> Nouveau
                </button>
                <button class="ac-btn-pro ac-btn-pro-achat" onclick="openAchatModal()">
                    <i class="fas fa-shopping-cart"></i> Effectuer des achats
                </button>
            </div>
        </div>
        <div id="productsGridContainer"></div>
        <div id="productsPagination" style="margin-top:12px;"></div>
    </div>`;
    loadCategoriesInFilter();
    loadProducts();
}

async function loadCategoriesInFilter() {
    var s = document.getElementById('categoryFilter');
    if (!s) return;
    try {
        var sn = await db.collection('categories').get();
        s.innerHTML = '<option value="">Toutes catégories</option>';
        sn.forEach(function(d) {
            s.innerHTML += '<option value="' + escapeHtml(d.data().nom) + '">' + escapeHtml(d.data().nom) + '</option>';
        });
    } catch (e) { }
}

function filterProducts() {
    selectedCategoryFilter = document.getElementById('categoryFilter').value;
    currentPages.products = 1;
    renderProductsTable();
}

async function loadProducts() {
    const cached = await CacheDB.getAll('products');
    if (cached.length) {
        window.allProductsData = cached;
        renderProductsTable();
    }

    try {
        const snapshot = await db.collection('products').get();
        window.allProductsData = [];
        snapshot.forEach(d => {
            let dd = d.data();
            dd.id = d.id;
            let prix = (dd.prixPromo && dd.prixPromo > 0) ? dd.prixPromo : (dd.prixVente || 0);
            dd.profit = (prix - (dd.prixAchat || 0));
            dd.dateProduction = dd.dateProduction || '';
            dd.dureeConservation = dd.dureeConservation || 0;
            dd.dateExpiration = dd.dateExpiration || '';
            window.allProductsData.push(dd);
        });
        for (let doc of window.allProductsData) await CacheDB.set('products', doc.id, doc);
        renderProductsTable();
    } catch (e) { console.error(e); }
}

// 🎨 Rendu cards moderne
function renderProductsTable() {
    var container = document.getElementById('productsGridContainer');
    if (!container) return;

    var data = window.allProductsData.slice();
    if (selectedCategoryFilter) {
        data = data.filter(function(d) {
            if (d.categories && d.categories.length > 0) return d.categories.includes(selectedCategoryFilter);
            return d.categorie === selectedCategoryFilter;
        });
    }
    if (window.productSearchQuery) {
        var q = window.productSearchQuery;
        data = data.filter(function(d) {
            return (d.nom || '').toLowerCase().indexOf(q) !== -1 ||
                   (d.description || '').toLowerCase().indexOf(q) !== -1 ||
                   (d.brand || '').toLowerCase().indexOf(q) !== -1;
        });
    }

    data = applySort('products', data, 'nom');
    var pageData = getPageData('products', data);

    if (pageData.length === 0) {
        container.innerHTML = `
        <div class="ac-empty-state">
            <i class="fas fa-box-open"></i>
            <h3>Aucun produit trouvé</h3>
            <p>${window.productSearchQuery ? 'Essayez un autre mot-clé.' : 'Cliquez sur "Nouveau" pour ajouter votre premier produit.'}</p>
        </div>`;
        document.getElementById('productsPagination').innerHTML = '';
        return;
    }

    var html = '<div class="ac-products-grid">';
    pageData.forEach(function(d) {
        var imageHtml = d.imageBase64
            ? `<img src="${d.imageBase64}" alt="${escapeHtml(d.nom || '')}">`
            : `<i class="fas fa-box"></i>`;

        var stockBadge = '';
        if ((d.stock || 0) <= 0) {
            stockBadge = '<span class="ac-product-badge stock-out">Rupture</span>';
        } else if ((d.stock || 0) <= 5) {
            stockBadge = '<span class="ac-product-badge stock-low">Stock bas</span>';
        }

        var categoriesDisplay = (d.categories && d.categories.length > 0) ? d.categories[0] : (d.categorie || 'Sans catégorie');
        var prixVente = (d.prixPromo && d.prixPromo > 0) ? d.prixPromo : (d.prixVente || 0);
        var prixPromoHtml = (d.prixPromo && d.prixPromo > 0) ? `<span class="ac-product-price-achat" style="text-decoration:line-through;">${(d.prixVente || 0).toFixed(2)}</span>` : '';

        html += `
        <div class="ac-product-card">
            <div class="ac-product-card-image">
                ${imageHtml}
                ${stockBadge}
            </div>
            <div class="ac-product-card-body">
                <h4 class="ac-product-card-title">${escapeHtml(d.nom || 'Sans nom')}</h4>
                <span class="ac-product-card-category">${escapeHtml(categoriesDisplay)}</span>
                ${d.brand ? `<span style="font-size:12px;color:#64748B;">${escapeHtml(d.brand)}</span>` : ''}
                <div class="ac-product-card-stock">
                    <i class="fas fa-cubes"></i> Stock: <strong>${d.stock || 0}</strong>
                </div>
                <div class="ac-product-card-price">
                    <div>
                        <div class="ac-product-price-vente">${prixVente.toFixed(2)} MAD</div>
                        ${prixPromoHtml}
                    </div>
                    <div class="ac-product-price-achat">Achat: ${(d.prixAchat || 0).toFixed(2)}</div>
                </div>
            </div>
            <div class="ac-product-card-actions">
                <button class="edit" onclick="editDocument('products','${d.id}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="delete" onclick="deleteDocument('products','${d.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
    document.getElementById('productsPagination').innerHTML = getPaginationHTML('products', data.length);
}

async function openProductForm(data) {
    data = data || {}; await loadStockForProductForm();

    var selectOptions = '';
    var preselected = data.categories || (data.categorie ? [data.categorie] : []);
    try {
        var cs = await db.collection('categories').get();
        cs.forEach(function(d) {
            var catName = d.data().nom;
            var selected = preselected.includes(catName) ? 'selected' : '';
            selectOptions += '<option value="' + escapeHtml(catName) + '" ' + selected + ' style="font-size:20px; padding:10px;">' + escapeHtml(catName) + '</option>';
        });
    } catch (e) { }

    var categoriesHtml =
        '<div class="form-group" style="min-width:100%;">' +
            '<label style="font-size:22px; font-weight:600;">Catégories</label>' +
            '<select id="prodCategoriesSelect" multiple size="5" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:12px; font-size:20px; min-height:120px;" onchange="updateSelectedCategories(); autoRemplirDureeParCategorie();">' +
                selectOptions +
            '</select>' +
            '<div id="selectedCategoriesDisplay" style="margin-top:12px; display:flex; flex-wrap:wrap; gap:10px;"></div>' +
        '</div>';

    const fournisseurs = await loadFournisseursForForm();
    var datalistOptions = '';
    fournisseurs.forEach(f => {
        var label = f.nom + (f.prenom ? ' ' + f.prenom : '') + (f.societe ? ' (' + f.societe + ')' : '');
        datalistOptions += '<option value="' + escapeHtml(label) + '" data-id="' + f.id + '">';
    });

    var fournisseurValue = '';
    if (data.fournisseurNom) {
        fournisseurValue = data.fournisseurNom;
    } else if (data.fournisseurId) {
        var found = fournisseurs.find(f => f.id === data.fournisseurId);
        if (found) fournisseurValue = found.nom + (found.prenom ? ' ' + found.prenom : '') + (found.societe ? ' (' + found.societe + ')' : '');
    }

    var ip = data.imageBase64 ? '<img src="' + data.imageBase64 + '" style="max-width:120px;">' : '';
    var dy = data.disponible !== false ? 'selected' : '', dn = data.disponible === false ? 'selected' : '';

    var h = '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Image</label><input type="file" id="prodImage" onchange="previewImage(this,\'prodPreview\')" style="font-size:20px; padding:10px;"><div id="prodPreview">' + ip + '</div></div></div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Nom *</label><input type="text" id="prodNom" value="' + escapeHtml(data.nom || '') + '" required style="font-size:22px; padding:14px;"></div></div>' +
        categoriesHtml +
        '<div class="form-row">' +
            '<div class="form-group"><label style="font-size:22px;">Marque</label><input type="text" id="prodBrand" value="' + escapeHtml(data.brand || '') + '" style="font-size:22px; padding:14px;"></div>' +
            '<div class="form-group"><label style="font-size:22px;">Prix boîte (MAD)</label><input type="number" id="prodBoxPrice" step="0.01" value="' + (data.box_price || 0) + '" oninput="calculatePrixAchat()" style="font-size:22px; padding:14px;"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label style="font-size:22px;">Unités par boîte</label><input type="number" id="prodBoxUnit" step="1" min="1" value="' + (data.box_unit || 1) + '" oninput="calculatePrixAchat()" style="font-size:22px; padding:14px;"></div>' +
            '<div class="form-group"><label style="font-size:22px;">Prix d\'achat unitaire (calculé)</label><input type="number" id="prodPA" step="0.01" value="' + (data.prixAchat || 0) + '" readonly style="background:#f3f4f6; font-size:22px; padding:14px;"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group" style="min-width:100%;">' +
                '<label style="font-size:22px;">Fournisseur</label>' +
                '<input list="fournisseurList" id="prodFournisseur" class="form-control" placeholder="Tapez un nom pour rechercher..." value="' + escapeHtml(fournisseurValue) + '" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:12px; font-size:22px;">' +
                '<datalist id="fournisseurList">' + datalistOptions + '</datalist>' +
            '</div>' +
        '</div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Prix Vente</label><input type="number" id="prodPV" value="' + (data.prixVente || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Prix Promo</label><input type="number" id="prodPromo" value="' + (data.prixPromo || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div></div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Stock</label><input type="number" id="prodStock" value="' + (data.stock || 0) + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Temps Prep</label><input type="text" id="prodTemps" value="' + escapeHtml(data.tempsPrep || '') + '" placeholder="15 min" style="font-size:22px; padding:14px;"></div></div>' +
        '<div class="form-row">' +
            '<div class="form-group">' +
                '<label style="font-size:22px;"><i class="fas fa-industry"></i> Date de production</label>' +
                '<input type="date" id="prodDateProduction" value="' + (data.dateProduction || '') + '" onchange="calculerDateExpirationAuto()" style="font-size:22px; padding:14px;">' +
                '<small style="display:block; color:#64748b; font-size:16px; margin-top:4px;">Par défaut : aujourd\'hui</small>' +
            '</div>' +
            '<div class="form-group">' +
                '<label style="font-size:22px;"><i class="fas fa-calendar-check"></i> Durée de conservation (jours)</label>' +
                '<input type="number" id="prodDureeConservation" min="0" step="1" value="' + (data.dureeConservation || 0) + '" placeholder="Ex: 20 pour laitier, 365 pour sec" oninput="calculerDateExpirationAuto()" style="font-size:22px; padding:14px;">' +
                '<small style="display:block; color:#64748b; font-size:16px; margin-top:4px;">0 = pas de péremption</small>' +
            '</div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group" style="min-width:100%;">' +
                '<label style="font-size:22px;"><i class="fas fa-hourglass-half"></i> Date d\'expiration</label>' +
                '<input type="date" id="prodDateExpiration" value="' + (data.dateExpiration || '') + '" style="font-size:22px; padding:14px;">' +
                '<small style="display:block; color:#64748b; font-size:16px; margin-top:4px;">Calculée automatiquement = production + durée (modifiable)</small>' +
            '</div>' +
        '</div>' +
        '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Disponible</label><select id="prodDispo" style="font-size:22px; padding:14px;"><option value="1" ' + dy + '>Oui</option><option value="0" ' + dn + '>Non</option></select></div><div class="form-group"><label style="font-size:22px;">Description</label><textarea id="prodDesc" style="font-size:22px; padding:14px;">' + escapeHtml(data.description || '') + '</textarea></div></div>' +
        '<div class="form-row" style="flex-direction:column;"><label style="font-weight:600; font-size:22px; margin-bottom:12px;">🧾 Recette (ingrédients du stock)</label><div id="productIngredientsList" style="display:flex; flex-direction:column; gap:10px;">';
    if (data.ingredients && data.ingredients.length > 0) { data.ingredients.forEach(function(ing, idx) { h += renderIngredientRow(idx, ing); }); }
    h += '</div><button type="button" class="btn-add" onclick="addIngredientRow()" style="margin-top:12px; width:auto; font-size:20px; padding:12px 20px;"><i class="fas fa-plus"></i> Ajouter un ingrédient</button></div>' +
        '<div style="display:flex; gap:12px; margin-top:20px;"><button class="btn-cancel" onclick="closeModal()" style="font-size:22px; padding:14px 28px;">Annuler</button><button class="btn-save" onclick="saveProduct()" style="font-size:22px; padding:14px 28px;">Enregistrer</button></div>';
    currentCollection = 'products';
    openModal(editingId ? 'Modifier Produit' : 'Nouveau Produit', h);

    setTimeout(function() {
        if (typeof updateSelectedCategories === 'function') updateSelectedCategories();
        calculatePrixAchat();
        remplirDateProductionAujourdhui();
        autoRemplirDureeParCategorie();
    }, 50);
}

function saveProduct() {
    var n = document.getElementById('prodNom').value; if (!n) { alert('Nom obligatoire'); return; }
    var f = document.getElementById('prodImage').files[0]; var ingredients = [];
    var rows = document.querySelectorAll('#productIngredientsList .ingredient-row');
    rows.forEach(function(row) {
        var select = row.querySelector('.ingredient-select'); var qtyInput = row.querySelector('.ingredient-qty');
        if (select && select.value && qtyInput && parseFloat(qtyInput.value) > 0) {
            var stockId = select.value; var stockItem = allStockData.find(function(s) { return s.id === stockId; });
            ingredients.push({ idStock: stockId, nom: stockItem ? stockItem.nom : '', quantite: parseFloat(qtyInput.value), unite: stockItem ? stockItem.unite : '' });
        }
    });

    var select = document.getElementById('prodCategoriesSelect');
    var selectedCategories = select ? Array.from(select.selectedOptions).map(opt => opt.value) : [];

    var fournisseurInput = document.getElementById('prodFournisseur');
    var fournisseurValue = fournisseurInput ? fournisseurInput.value.trim() : '';
    var fournisseurId = null;
    var fournisseurNom = fournisseurValue;

    var datalist = document.getElementById('fournisseurList');
    if (datalist && fournisseurValue) {
        var options = datalist.options;
        for (var opt of options) {
            if (opt.value.toLowerCase() === fournisseurValue.toLowerCase()) {
                fournisseurId = opt.getAttribute('data-id');
                break;
            }
        }
        if (fournisseurId) {
            fournisseurNom = fournisseurValue;
        }
    }
    if (!fournisseurId && fournisseurValue) {
        fournisseurId = null;
    }

    var prixAchat = parseFloat(document.getElementById('prodPA').value) || 0;
    var prixVente = parseFloat(document.getElementById('prodPV').value) || 0;
    var prixPromo = parseFloat(document.getElementById('prodPromo').value) || 0;
    var prix = (prixPromo > 0) ? prixPromo : prixVente;
    var profit = prix - prixAchat;

    var sf = function(img) {
        var d = {
            nom: n,
            brand: document.getElementById('prodBrand').value.trim(),
            box_price: parseFloat(document.getElementById('prodBoxPrice').value) || 0,
            box_unit: parseFloat(document.getElementById('prodBoxUnit').value) || 1,
            prixAchat: prixAchat,
            prixVente: prixVente,
            prixPromo: prixPromo,
            profit: profit,
            stock: parseInt(document.getElementById('prodStock').value) || 0,
            vendues: 0,
            ca: 0,
            tempsPrep: document.getElementById('prodTemps').value,
            disponible: document.getElementById('prodDispo').value === '1',
            description: document.getElementById('prodDesc').value,
            categories: selectedCategories,
            categorie: selectedCategories.length > 0 ? selectedCategories[0] : '',
            dateProduction: document.getElementById('prodDateProduction')?.value || '',
            dureeConservation: parseInt(document.getElementById('prodDureeConservation')?.value) || 0,
            dateExpiration: document.getElementById('prodDateExpiration')?.value || '',
            ingredients: ingredients,
            fournisseurId: fournisseurId,
            fournisseurNom: fournisseurNom
        };
        if (img) d.imageBase64 = img;
        if (editingId) {
            CacheDB.write('products', editingId, d, 'update').then(function() {
                var idx = window.allProductsData.findIndex(function(x) { return x.id === editingId; });
                if (idx !== -1) window.allProductsData[idx] = Object.assign({}, window.allProductsData[idx], d, { id: editingId });
                closeModal(); renderProductsTable(); CacheDB.sync();

                if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
                    CacheDB.saveCollection('products');
                }
            });
        }
        else {
            CacheDB.write('products', null, d, 'add').then(function(newId) {
                d.id = newId;
                window.allProductsData.push(d);
                closeModal(); renderProductsTable(); CacheDB.sync();

                if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
                    CacheDB.saveCollection('products');
                }
            });
        }
    };
    if (f) fileToBase64(f, sf); else sf(null);
}

// ==================== CLIENTS ====================
function loadClientsPage(c) {
    c.innerHTML = '<div class="content-card"><div class="card-header" style="flex-wrap:wrap; gap:12px;"><h3 style="font-size:28px;"><i class="fas fa-users"></i> Clients</h3><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">' +
        '<div class="input-group" style="width:350px;min-width:250px;margin-bottom:0;background:#fff;border:2px solid var(--border);border-radius:12px;"><i class="fas fa-search" style="color:#94a3b8; font-size:22px;"></i><input type="text" id="clientSearchInput" placeholder="Rechercher..." onkeyup="clientSearch(this.value)" style="border:none;padding:14px; font-size:22px; width:100%;"></div>' +
        '<button class="btn-add" onclick="openClientForm()" style="font-size:22px; padding:14px 24px; min-height:60px;"><i class="fas fa-plus"></i> Ajouter</button></div></div>' +
        '<div class="table-container" style="overflow-x:auto;"><table class="data-table" id="clientsTable" style="font-size:20px; width:100%;"><thead><tr style="font-size:22px;">' +
        makeSortableHeader('clients', 'id', 'ID', 'loadClients') + makeSortableHeader('clients', 'nom', 'Nom', 'loadClients') +
        makeSortableHeader('clients', 'prenom', 'Prénom', 'loadClients') + makeSortableHeader('clients', 'username', 'Username', 'loadClients') +
        makeSortableHeader('clients', 'genre', 'Genre', 'loadClients') + makeSortableHeader('clients', 'adresse', 'Adresse', 'loadClients') +
        makeSortableHeader('clients', 'email', 'Email', 'loadClients') + makeSortableHeader('clients', 'telephone', 'Tél', 'loadClients') +
        makeSortableHeader('clients', 'whatsapp', 'WhatsApp', 'loadClients') + makeSortableHeader('clients', 'facebook', 'Facebook', 'loadClients') +
        makeSortableHeader('clients', 'instagram', 'Instagram', 'loadClients') + makeSortableHeader('clients', 'ca', 'CA', 'loadClients') +
        makeSortableHeader('clients', 'profit', 'Profit', 'loadClients') + makeSortableHeader('clients', 'pointsFidelite', 'Points Fid', 'loadClients') +
        makeSortableHeader('clients', 'allergies', 'Allergies', 'loadClients') + makeSortableHeader('clients', 'aime', 'Aime', 'loadClients') +
        makeSortableHeader('clients', 'deteste', 'Déteste', 'loadClients') + makeSortableHeader('clients', 'createdAt', 'Date créé', 'loadClients') +
        makeSortableHeader('clients', 'description', 'Description', 'loadClients') + '<th style="padding:14px 10px;">Actions</th></thead><tbody style="font-size:20px;"></tbody></div><div id="clientsPagination"></div></div>';
    loadClients();
}

function clientSearch(query) { clientSearchQuery = query.toLowerCase().trim(); currentPages.clients = 1; renderClientsTable(); }

async function loadClients() {
    const cached = await CacheDB.getAll('clients');
    if (cached.length) {
        allClientsData = cached;
        renderClientsTable();
    }

    try {
        const snapshot = await db.collection('clients').get();
        allClientsData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allClientsData.push(dd); });
        for (let doc of allClientsData) await CacheDB.set('clients', doc.id, doc);
        renderClientsTable();
    } catch (e) { console.error(e); }
}

function renderClientsTable() {
    var tb = document.querySelector('#clientsTable tbody'); if (!tb) return;
    var data = allClientsData.slice();
    if (clientSearchQuery) { data = data.filter(function(d) { return (d.nom || '').toLowerCase().indexOf(clientSearchQuery) !== -1 || (d.prenom || '').toLowerCase().indexOf(clientSearchQuery) !== -1 || (d.username || '').toLowerCase().indexOf(clientSearchQuery) !== -1 || (d.email || '').toLowerCase().indexOf(clientSearchQuery) !== -1 || (d.telephone || '').toLowerCase().indexOf(clientSearchQuery) !== -1 || (d.description || '').toLowerCase().indexOf(clientSearchQuery) !== -1; }); }
    data = applySort('clients', data, 'nom'); var pageData = getPageData('clients', data);
    tb.innerHTML = '';
    if (pageData.length === 0) { tb.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:40px;font-size:24px;">Aucun client</td></tr>'; document.getElementById('clientsPagination').innerHTML = ''; return; }
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var dateCreated = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('fr-FR') + ' ' + new Date(d.createdAt.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
        var row = '<tr>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + (d.id || '').substring(0, 6) + '</small></td>' +
            '<td style="padding:14px 10px; font-size:22px; font-weight:600;"><strong>' + escapeHtml(d.nom || '') + '</strong></td>' +
            '<td style="padding:14px 10px; font-size:22px;">' + escapeHtml(d.prenom || '') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">@' + escapeHtml(d.username || '') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.genre || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.adresse || '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.email || '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.telephone || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.whatsapp || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.facebook || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.instagram || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px; color:#14B8A6; font-weight:600;">' + (d.ca || 0).toFixed(2) + '</td>' +
            '<td style="padding:14px 10px; font-size:20px; color:#14B8A6;">' + (d.profit || 0).toFixed(2) + '</td>' +
            '<td style="padding:14px 10px; font-size:20px; color:#14B8A6; font-weight:600;">' + (d.pointsFidelite || 0) + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + (d.allergies ? d.allergies.join(', ') : '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + (d.aime ? d.aime.join(', ') : '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + (d.deteste ? d.deteste.join(', ') : '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + dateCreated + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.description || '-') + '</small></td>' +
            '<td style="padding:14px 10px;"><button class="btn-edit" onclick="editClient(\'' + d.id + '\')" style="font-size:20px; padding:10px 16px;"><i class="fas fa-edit"></i></button> <button class="btn-delete" onclick="deleteClient(\'' + d.id + '\')" style="font-size:20px; padding:10px 16px;"><i class="fas fa-trash"></i></button></td></tr>';
        tb.innerHTML += row;
    }
    document.getElementById('clientsPagination').innerHTML = getPaginationHTML('clients', data.length);
}

function openClientForm(data) {
    data = data || {};
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Nom *</label><input type="text" id="cliNom" value="' + escapeHtml(data.nom || '') + '" required style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Prénom *</label><input type="text" id="cliPrenom" value="' + escapeHtml(data.prenom || '') + '" required style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Username</label><input type="text" id="cliUsername" value="' + escapeHtml(data.username || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Genre</label><select id="cliGenre" style="font-size:22px; padding:14px;"><option value="">-</option><option value="M" ' + (data.genre === 'M' ? 'selected' : '') + '>M</option><option value="F" ' + (data.genre === 'F' ? 'selected' : '') + '>F</option></select></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Adresse</label><input type="text" id="cliAdresse" value="' + escapeHtml(data.adresse || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Email</label><input type="email" id="cliEmail" value="' + escapeHtml(data.email || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Téléphone</label><input type="text" id="cliTel" value="' + escapeHtml(data.telephone || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">WhatsApp</label><input type="text" id="cliWhatsapp" value="' + escapeHtml(data.whatsapp || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Facebook</label><input type="text" id="cliFacebook" value="' + escapeHtml(data.facebook || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Instagram</label><input type="text" id="cliInstagram" value="' + escapeHtml(data.instagram || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">CA</label><input type="number" id="cliCA" value="' + (data.ca || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Profit</label><input type="number" id="cliProfit" value="' + (data.profit || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Points Fidélité</label><input type="number" id="cliPoints" value="' + (data.pointsFidelite || 0) + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Description</label><textarea id="cliDesc" style="font-size:22px; padding:14px;">' + escapeHtml(data.description || '') + '</textarea></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Allergies (virgules)</label><input type="text" id="cliAllergies" value="' + (data.allergies ? data.allergies.join(', ') : '') + '" placeholder="gluten, lactose" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Aime (virgules)</label><input type="text" id="cliAime" value="' + (data.aime ? data.aime.join(', ') : '') + '" placeholder="café, thé" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Déteste (virgules)</label><input type="text" id="cliDeteste" value="' + (data.deteste ? data.deteste.join(', ') : '') + '" placeholder="sucre, lactose" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div style="display:flex; gap:12px; margin-top:20px;"><button class="btn-cancel" onclick="closeModal()" style="font-size:22px; padding:14px 28px;">Annuler</button><button class="btn-save" onclick="saveClient()" style="font-size:22px; padding:14px 28px;">Enregistrer</button></div>';
    currentCollection = 'clients'; openModal(editingId ? 'Modifier Client' : 'Nouveau Client', h);
}

function saveClient() {
    var n = document.getElementById('cliNom').value, p = document.getElementById('cliPrenom').value;
    if (!n || !p) { alert('Nom et Prénom obligatoires'); return; }
    var d = { nom: n, prenom: p, username: document.getElementById('cliUsername').value, genre: document.getElementById('cliGenre').value, adresse: document.getElementById('cliAdresse').value, email: document.getElementById('cliEmail').value, telephone: document.getElementById('cliTel').value, whatsapp: document.getElementById('cliWhatsapp').value, facebook: document.getElementById('cliFacebook').value, instagram: document.getElementById('cliInstagram').value, ca: parseFloat(document.getElementById('cliCA').value) || 0, profit: parseFloat(document.getElementById('cliProfit').value) || 0, pointsFidelite: parseInt(document.getElementById('cliPoints').value) || 0, allergies: document.getElementById('cliAllergies').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean), aime: document.getElementById('cliAime').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean), deteste: document.getElementById('cliDeteste').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean), description: document.getElementById('cliDesc').value };
    if (!editingId) d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    saveDocument('clients', d, function() {
        closeModal();
        loadClients();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('clients');
        }
    });
}

function editClient(id) { db.collection('clients').doc(id).get().then(function(doc) { if (doc.exists) { editingId = id; currentCollection = 'clients'; openClientForm(doc.data()); } }); }
function deleteClient(id) { if (confirm('Supprimer ce client ?')) { CacheDB.write('clients', id, null, 'delete').then(function() { alert('Supprimé'); loadClients(); CacheDB.sync(); }); } }

// ==================== FOURNISSEURS ====================
function loadFournisseursPage(c) {
    c.innerHTML = '<div class="content-card"><div class="card-header" style="flex-wrap:wrap; gap:12px;"><h3 style="font-size:28px;"><i class="fas fa-truck"></i> Fournisseurs</h3><button class="btn-add" onclick="openFournisseurForm()" style="font-size:22px; padding:14px 24px; min-height:60px;"><i class="fas fa-plus"></i> Ajouter</button></div>' +
        '<div class="table-container" style="overflow-x:auto;"><table class="data-table" id="fournisseursTable" style="font-size:20px; width:100%;"><thead><tr style="font-size:22px;">' +
        makeSortableHeader('fournisseurs', 'id', 'ID', 'loadFournisseurs') + makeSortableHeader('fournisseurs', 'nom', 'Nom', 'loadFournisseurs') +
        makeSortableHeader('fournisseurs', 'prenom', 'Prénom', 'loadFournisseurs') + makeSortableHeader('fournisseurs', 'societe', 'Société', 'loadFournisseurs') +
        makeSortableHeader('fournisseurs', 'telephone', 'Tél', 'loadFournisseurs') + makeSortableHeader('fournisseurs', 'whatsapp', 'WhatsApp', 'loadFournisseurs') +
        makeSortableHeader('fournisseurs', 'email', 'Email', 'loadFournisseurs') + makeSortableHeader('fournisseurs', 'adresse', 'Adresse', 'loadFournisseurs') +
        makeSortableHeader('fournisseurs', 'description', 'Description', 'loadFournisseurs') + makeSortableHeader('fournisseurs', 'ca', 'CA', 'loadFournisseurs') +
        '<th style="padding:14px 10px;">Catégories</th>' + makeSortableHeader('fournisseurs', 'createdAt', 'Date créé', 'loadFournisseurs') + '<th style="padding:14px 10px;">Actions</th></thead><tbody style="font-size:20px;"></tbody></div><div id="fournisseursPagination"></div></div>';
    loadFournisseurs();
}

async function loadFournisseurs() {
    const cached = await CacheDB.getAll('fournisseurs');
    if (cached.length) {
        allFournisseursData = cached;
        renderFournisseursTable();
    }

    try {
        const snapshot = await db.collection('fournisseurs').get();
        allFournisseursData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allFournisseursData.push(dd); });
        for (let doc of allFournisseursData) await CacheDB.set('fournisseurs', doc.id, doc);
        renderFournisseursTable();
    } catch (e) { console.error(e); }
}

function renderFournisseursTable() {
    var tb = document.querySelector('#fournisseursTable tbody'); if (!tb) return;
    var data = applySort('fournisseurs', allFournisseursData.slice(), 'nom'); var pageData = getPageData('fournisseurs', data);
    tb.innerHTML = '';
    if (pageData.length === 0) { tb.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;font-size:24px;">Aucun fournisseur</td></tr>'; document.getElementById('fournisseursPagination').innerHTML = ''; return; }
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var dateCreated = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('fr-FR') + ' ' + new Date(d.createdAt.seconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
        var categories = d.categories ? d.categories.join(', ') : '-';
        tb.innerHTML += '<tr>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + (d.id || '').substring(0, 6) + '</small></td>' +
            '<td style="padding:14px 10px; font-size:22px; font-weight:600;"><strong>' + escapeHtml(d.nom || '') + '</strong></td>' +
            '<td style="padding:14px 10px; font-size:22px;">' + escapeHtml(d.prenom || '') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.societe || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.telephone || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + escapeHtml(d.whatsapp || '-') + '</td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.email || '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.adresse || '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(d.description || '-') + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;">' + (d.ca || 0).toFixed(2) + ' MAD</td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + escapeHtml(categories) + '</small></td>' +
            '<td style="padding:14px 10px; font-size:20px;"><small>' + dateCreated + '</small></td>' +
            '<td style="padding:14px 10px;"><button class="btn-edit" onclick="editFournisseur(\'' + d.id + '\')" style="font-size:20px; padding:10px 16px;"><i class="fas fa-edit"></i></button> <button class="btn-delete" onclick="deleteFournisseur(\'' + d.id + '\')" style="font-size:20px; padding:10px 16px;"><i class="fas fa-trash"></i></button></td></tr>';
    }
    document.getElementById('fournisseursPagination').innerHTML = getPaginationHTML('fournisseurs', data.length);
}

function openFournisseurForm(data) {
    data = data || {}; var selectedCategories = data.categories || [];
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Nom *</label><input type="text" id="fourNom" value="' + escapeHtml(data.nom || '') + '" required style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Prénom</label><input type="text" id="fourPrenom" value="' + escapeHtml(data.prenom || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Société</label><input type="text" id="fourSociete" value="' + escapeHtml(data.societe || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Téléphone</label><input type="text" id="fourTel" value="' + escapeHtml(data.telephone || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">WhatsApp</label><input type="text" id="fourWhatsapp" value="' + escapeHtml(data.whatsapp || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">Email</label><input type="email" id="fourEmail" value="' + escapeHtml(data.email || '') + '" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label style="font-size:22px;">Adresse</label><input type="text" id="fourAdresse" value="' + escapeHtml(data.adresse || '') + '" style="font-size:22px; padding:14px;"></div><div class="form-group"><label style="font-size:22px;">CA</label><input type="number" id="fourCA" value="' + (data.ca || 0) + '" step="0.01" style="font-size:22px; padding:14px;"></div></div>';
    h += '<div class="form-row"><div class="form-group" style="min-width:100%;"><label style="font-size:22px;">Description</label><textarea id="fourDesc" style="font-size:22px; padding:14px;">' + escapeHtml(data.description || '') + '</textarea></div></div>';
    h += '<div class="form-row"><div class="form-group" style="min-width:100%;"><label style="font-size:22px;">Catégories</label><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;">';
    fournisseurCategoriesList.forEach(function(cat) { var checked = selectedCategories.indexOf(cat) !== -1 ? 'checked' : ''; h += '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:20px;"><input type="checkbox" class="four-cat-check" value="' + cat + '" ' + checked + ' style="width:22px; height:22px;"> ' + cat + '</label>'; });
    h += '</div></div></div>';
    var schemaStr = data.factureSchema ? JSON.stringify(data.factureSchema, null, 2) : '{\n  "type": "table",\n  "columns": [\n    { "name": "produit", "index": 0 },\n    { "name": "quantite", "index": 1 }\n  ],\n  "skipRows": 1,\n  "separator": "tab"\n}';
    h += '<div class="form-row"><div class="form-group" style="min-width:100%;"><label style="font-size:22px;">Schéma de facture (JSON)</label>' +
        '<textarea id="fourSchema" style="width:100%;padding:14px;font-size:20px;border:2px solid #e2e8f0;border-radius:8px;" rows="8">' + escapeHtml(schemaStr) + '</textarea>' +
        '<p style="font-size:16px;color:#64748b;margin-top:4px;">Définissez les colonnes et leur index (0 = première colonne). Séparateur possible : tab, comma, space.</p></div></div>';
    h += '<div style="display:flex; gap:12px; margin-top:20px;"><button class="btn-cancel" onclick="closeModal()" style="font-size:22px; padding:14px 28px;">Annuler</button><button class="btn-save" onclick="saveFournisseur()" style="font-size:22px; padding:14px 28px;">Enregistrer</button></div>';
    currentCollection = 'fournisseurs'; openModal(editingId ? 'Modifier Fournisseur' : 'Nouveau Fournisseur', h);
}

function saveFournisseur() {
    var nom = document.getElementById('fourNom').value; if (!nom) { alert('Nom obligatoire'); return; }
    var categories = []; document.querySelectorAll('.four-cat-check:checked').forEach(function(cb) { categories.push(cb.value); });
    var schemaText = document.getElementById('fourSchema').value;
    var factureSchema = null;
    try { factureSchema = JSON.parse(schemaText); } catch(e) { console.warn('Schéma JSON invalide'); }
    var d = {
        nom: nom,
        prenom: document.getElementById('fourPrenom').value,
        societe: document.getElementById('fourSociete').value,
        telephone: document.getElementById('fourTel').value,
        whatsapp: document.getElementById('fourWhatsapp').value,
        email: document.getElementById('fourEmail').value,
        adresse: document.getElementById('fourAdresse').value,
        ca: parseFloat(document.getElementById('fourCA').value) || 0,
        description: document.getElementById('fourDesc').value,
        categories: categories,
        factureSchema: factureSchema
    };
    if (!editingId) d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    saveDocument('fournisseurs', d, function() {
        closeModal();
        loadFournisseurs();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('fournisseurs');
        }
    });
}

function editFournisseur(id) { db.collection('fournisseurs').doc(id).get().then(function(doc) { if (doc.exists) { editingId = id; currentCollection = 'fournisseurs'; openFournisseurForm(doc.data()); } }); }
function deleteFournisseur(id) { if (confirm('Supprimer ce fournisseur ?')) { CacheDB.write('fournisseurs', id, null, 'delete').then(function() { alert('Supprimé'); loadFournisseurs(); CacheDB.sync(); }); } }

// ==================== MODULE ACHATS FOURNISSEURS — VERSION PRO ====================
var fournisseurAchatSelectionne = null;
var produitsAchatList = [];
var achatLignes = [];
var achatSearchFilter = '';

function openAchatModal() {
    if (typeof allFournisseursData === 'undefined' || allFournisseursData.length === 0) {
        loadFournisseurs().then(function() { openAchatModalForm(); });
    } else {
        openAchatModalForm();
    }
}

function openAchatModalForm() {
    achatSearchFilter = '';
    var options = '<option value="">— Choisir un fournisseur —</option>';
    allFournisseursData.forEach(function(f) {
        var label = (f.nom || '') + (f.prenom ? ' ' + f.prenom : '') + (f.societe ? ' (' + f.societe + ')' : '');
        options += '<option value="' + f.id + '">' + escapeHtml(label) + '</option>';
    });

    var html = `
        <div id="achatModalOverlay" class="ac-achat-overlay">
            <div class="ac-achat-modal">
                <div class="ac-achat-header">
                    <h3><i class="fas fa-shopping-cart"></i> Effectuer des achats</h3>
                    <button class="ac-achat-close" onclick="fermerAchatModal()" title="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="ac-achat-toolbar">
                    <select id="achatFournisseurSelect" class="ac-fournisseur-select" onchange="chargerProduitsFournisseurAchat()">
                        ${options}
                    </select>

                    <div class="ac-search-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="achatSearchInput" placeholder="Rechercher un produit..."
                            oninput="onAchatSearch(this.value)">
                    </div>

                    <button class="ac-btn-pro ac-btn-pro-scan" onclick="ouvrirCameraFacture()" id="scanFactureBtn" disabled
                        title="Scanner la facture">
                        <i class="fas fa-camera"></i> Scanner
                    </button>
                </div>

                <div class="ac-achat-body" id="achatModalBody">
                    <div class="ac-empty-state">
                        <i class="fas fa-truck"></i>
                        <h3>Sélectionnez un fournisseur</h3>
                        <p>Choisissez un fournisseur dans la liste ci-dessus pour voir ses produits.</p>
                    </div>
                </div>

                <div class="ac-achat-footer">
                    <div class="ac-achat-totals">
                        <div class="ac-achat-total-block">
                            <span class="label">Produits</span>
                            <span class="value blue" id="achatTotalProduits">0</span>
                        </div>
                        <div class="ac-achat-total-block">
                            <span class="label">Quantité totale</span>
                            <span class="value" id="achatTotalQte">0</span>
                        </div>
                        <div class="ac-achat-total-block">
                            <span class="label">Total général</span>
                            <span class="value green" id="achatTotalGeneral">0.00 MAD</span>
                        </div>
                    </div>
                    <div class="ac-achat-actions">
                        <button class="ac-btn-pro ac-btn-pro-ghost" onclick="fermerAchatModal()">Annuler</button>
                        <button class="ac-btn-pro ac-btn-pro-achat" id="achatValiderBtn" onclick="validerAchats()" disabled>
                            <i class="fas fa-check"></i> Valider les achats
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    var oldOverlay = document.getElementById('achatModalOverlay');
    if (oldOverlay) oldOverlay.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function fermerAchatModal() {
    var overlay = document.getElementById('achatModalOverlay');
    if (overlay) overlay.remove();
    achatSearchFilter = '';
}

function chargerProduitsFournisseurAchat() {
    var select = document.getElementById('achatFournisseurSelect');
    if (!select) return;
    var fournisseurId = select.value;

    var scanBtn = document.getElementById('scanFactureBtn');
    if (scanBtn) {
        scanBtn.disabled = !fournisseurId;
    }

    var body = document.getElementById('achatModalBody');
    if (!fournisseurId) {
        if (body) body.innerHTML = `
        <div class="ac-empty-state">
            <i class="fas fa-truck"></i>
            <h3>Sélectionnez un fournisseur</h3>
            <p>Choisissez un fournisseur dans la liste ci-dessus.</p>
        </div>`;
        fournisseurAchatSelectionne = null;
        produitsAchatList = [];
        achatLignes = [];
        updateAchatTotals();
        return;
    }

    fournisseurAchatSelectionne = allFournisseursData.find(f => f.id === fournisseurId);
    if (!fournisseurAchatSelectionne) return;

    var produits = window.allProductsData.filter(function(p) {
        return p.fournisseurId === fournisseurId || p.fournisseurNom === fournisseurAchatSelectionne.nom;
    });
    produitsAchatList = produits;

    achatLignes = produits.map(function(p) {
        return {
            id: p.id,
            nom: p.nom,
            stockActuel: p.stock || 0,
            prixActuel: p.box_price || 0,
            quantite: 0,
            nouveauPrix: p.box_price || 0,
            dateExpiration: p.dateExpiration || '',
            total: 0,
            prixChange: false
        };
    });

    afficherProduitsAchat();
}

function onAchatSearch(value) {
    achatSearchFilter = (value || '').toLowerCase().trim();
    afficherProduitsAchat();
}

function afficherProduitsAchat() {
    var body = document.getElementById('achatModalBody');
    if (!body) return;

    if (!produitsAchatList || produitsAchatList.length === 0) {
        body.innerHTML = `
        <div class="ac-empty-state">
            <i class="fas fa-box-open"></i>
            <h3>Aucun produit pour ce fournisseur</h3>
            <p>Ajoutez des produits avec ce fournisseur d'abord.</p>
        </div>`;
        updateAchatTotals();
        return;
    }

    var lignes = achatLignes.map(function(l, realIdx) { return { ligne: l, realIdx: realIdx }; });
    if (achatSearchFilter) {
        lignes = lignes.filter(function(o) {
            return (o.ligne.nom || '').toLowerCase().indexOf(achatSearchFilter) !== -1;
        });
    }

    if (lignes.length === 0) {
        body.innerHTML = `
        <div class="ac-empty-state">
            <i class="fas fa-search"></i>
            <h3>Aucun produit trouvé</h3>
            <p>Essayez un autre mot-clé.</p>
        </div>`;
        updateAchatTotals();
        return;
    }

    var html = `
    <table class="ac-achat-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Produit</th>
                <th class="center">Stock</th>
                <th class="center">Prix boîte actuel</th>
                <th class="center">Qté achetée</th>
                <th class="center">Nouveau prix</th>
                <th class="center">Expiration</th>
                <th class="center">Total</th>
            </tr>
        </thead>
        <tbody>
    `;

    lignes.forEach(function(o) {
        var l = o.ligne;
        var i = o.realIdx;
        var priceChanged = l.nouveauPrix > 0 && Math.abs(l.nouveauPrix - l.prixActuel) > 0.001;
        var rowClass = l.prixChange ? 'has-changement' : '';
        var prixClass = priceChanged ? 'changed' : '';

        var badgeHtml = '';
        if (l.prixChange && l.nouveauPrix > 0) {
            var diff = l.nouveauPrix - l.prixActuel;
            var direction = diff > 0 ? 'up' : 'down';
            var signe = diff > 0 ? '+' : '';
            badgeHtml = `<span class="ac-price-change-badge ${direction}">
                <i class="fas fa-arrow-${diff > 0 ? 'up' : 'down'}"></i>
                ${signe}${diff.toFixed(2)} MAD
            </span>`;
        }

        html += `
        <tr class="${rowClass}">
            <td><span class="ac-product-id">${(l.id || '').substring(0, 6)}</span></td>
            <td>
                <div class="ac-product-name">${escapeHtml(l.nom)}</div>
                ${badgeHtml}
            </td>
            <td class="center">${l.stockActuel}</td>
            <td class="center">
                <span class="ac-price-old">${l.prixActuel.toFixed(2)} MAD</span>
            </td>
            <td class="center">
                <input type="number" min="0" step="1"
                    value="${l.quantite || 0}"
                    oninput="onLigneQteChange(${i}, this.value)"
                    style="width:80px;">
            </td>
            <td class="center">
                <input type="number" min="0" step="0.01"
                    class="${prixClass}"
                    value="${l.nouveauPrix || 0}"
                    oninput="onLignePrixChange(${i}, this.value)"
                    style="width:100px;">
            </td>
            <td class="center">
                <input type="date"
                    value="${l.dateExpiration || ''}"
                    onchange="onLigneDateChange(${i}, this.value)"
                    style="width:140px;">
            </td>
            <td class="ac-total-cell" id="achatTotal_${i}">${(l.total || 0).toFixed(2)}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;
    updateAchatTotals();
}

function onLigneQteChange(index, value) {
    var l = achatLignes[index];
    if (!l) return;
    l.quantite = parseFloat(value) || 0;
    l.total = l.quantite * (l.nouveauPrix || 0);
    var cell = document.getElementById('achatTotal_' + index);
    if (cell) cell.textContent = l.total.toFixed(2);
    updateAchatTotals();
}

function onLignePrixChange(index, value) {
    var l = achatLignes[index];
    if (!l) return;
    var nouveau = parseFloat(value) || 0;
    l.nouveauPrix = nouveau;
    l.prixChange = Math.abs(nouveau - l.prixActuel) > 0.001;
    l.total = (l.quantite || 0) * nouveau;
    afficherProduitsAchat();
}

function onLigneDateChange(index, value) {
    var l = achatLignes[index];
    if (!l) return;
    l.dateExpiration = value || '';
}

function updateAchatTotals() {
    var produits = 0, qteTotale = 0, totalGeneral = 0;
    achatLignes.forEach(function(l) {
        if (l.quantite > 0) {
            produits++;
            qteTotale += l.quantite;
            totalGeneral += l.total || 0;
        }
    });
    var elP = document.getElementById('achatTotalProduits');
    var elQ = document.getElementById('achatTotalQte');
    var elT = document.getElementById('achatTotalGeneral');
    var btn = document.getElementById('achatValiderBtn');
    if (elP) elP.textContent = produits;
    if (elQ) elQ.textContent = qteTotale;
    if (elT) elT.textContent = totalGeneral.toFixed(2) + ' MAD';
    if (btn) btn.disabled = produits === 0;
}

async function validerAchats() {
    if (!fournisseurAchatSelectionne) { alert('Veuillez choisir un fournisseur.'); return; }

    var misesAJour = achatLignes.filter(function(l) { return l.quantite > 0; });
    if (misesAJour.length === 0) { alert('Aucune quantité saisie.'); return; }

    var prixChanges = misesAJour.filter(function(l) {
        return l.nouveauPrix > 0 && Math.abs(l.nouveauPrix - l.prixActuel) > 0.001;
    });

    var message = 'Confirmer l\'achat ?\n\n';
    message += '📦 ' + misesAJour.length + ' produit(s)\n';
    message += '💰 Total : ' + misesAJour.reduce(function(s, l) { return s + (l.quantite * l.nouveauPrix); }, 0).toFixed(2) + ' MAD\n\n';

    if (prixChanges.length > 0) {
        message += '⚠️ ATTENTION — PRIX CHANGÉS :\n\n';
        prixChanges.forEach(function(l) {
            var diff = l.nouveauPrix - l.prixActuel;
            message += '• ' + l.nom + '\n';
            message += '  ' + l.prixActuel.toFixed(2) + ' → ' + l.nouveauPrix.toFixed(2) + ' MAD (' + (diff > 0 ? '+' : '') + diff.toFixed(2) + ')\n';
        });
        message += '\n❓ Confirmer ces changements de prix ?';
    }

    if (!confirm(message)) return;

    var batch = db.batch();
    var aujourdhui = new Date();
    var todayStr = aujourdhui.toISOString().split('T')[0];

    try {
        for (var item of misesAJour) {
            var prodRef = db.collection('products').doc(item.id);
            var produit = window.allProductsData.find(function(p) { return p.id === item.id; });
            var boxUnit = produit ? (produit.box_unit || 1) : 1;
            var stockToAdd = item.quantite * boxUnit;

            var updateData = {
                stock: firebase.firestore.FieldValue.increment(stockToAdd)
            };

            if (item.nouveauPrix > 0) {
                updateData.box_price = item.nouveauPrix;
                var prixUnitaire = item.nouveauPrix / boxUnit;
                updateData.prixAchat = prixUnitaire;
                updateData.prixVente = prixUnitaire * 1.3;
                updateData.profit = updateData.prixVente - prixUnitaire;
            }

            updateData.dateProduction = todayStr;

            if (produit && produit.dureeConservation > 0) {
                var nouvelleExpiration = new Date(aujourdhui.getTime() + produit.dureeConservation * 86400000);
                updateData.dateExpiration = nouvelleExpiration.toISOString().split('T')[0];
            } else if (item.dateExpiration) {
                updateData.dateExpiration = item.dateExpiration;
            }

            batch.update(prodRef, updateData);
        }

        await batch.commit();
        alert('✅ Stock et prix mis à jour !');
        fermerAchatModal();
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            CacheDB.saveCollection('products');
        }
    } catch(e) {
        console.error(e);
        alert('❌ Erreur : ' + e.message);
    }
}

// ==================== SCAN FACTURE (sans mention Gemini) ====================
function ouvrirCameraFacture() {
    if (!fournisseurAchatSelectionne) {
        alert('Choisissez un fournisseur d\'abord.');
        return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(event) {
            var imgData = event.target.result;
            scannerFacture(imgData);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

async function scannerFacture(imgData) {
    var overlay = document.createElement('div');
    overlay.className = 'ac-scan-overlay';
    overlay.innerHTML = '<div class="spinner"></div><p>📷 Analyse de la facture en cours...</p>';
    document.body.appendChild(overlay);

    try {
        var productNames = produitsAchatList.map(function(p) { return p.nom; });
        var productListStr = productNames.map(function(n) { return '"' + n.replace(/"/g, '\\"') + '"'; }).join(', ');

        var prompt = `
            Voici une photo d'une facture fournisseur.
            La liste des produits existants pour ce fournisseur est : [${productListStr}].
            Extrais de la facture les quantités ET les prix unitaires (par boîte) achetés pour chacun de ces produits.
            Retourne UNIQUEMENT un tableau JSON où chaque objet a les propriétés :
            - "nom" : exactement le nom du produit tel que dans la liste
            - "quantite" : nombre entier
            - "prix" : prix unitaire HT ou TTC si lisible (sinon null)

            Exemple :
            [
                { "nom": "Coca-Cola 1.5L", "quantite": 5, "prix": 12.50 },
                { "nom": "Fanta Orange", "quantite": 3, "prix": 11.00 }
            ]
            Si aucun produit n'est identifié, retourne un tableau vide [].
        `;

        var response = await fetch(GEMINI_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, imageBase64: imgData })
        });

        var data = await response.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

        var rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        var cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        var produitsReconnus = [];

        try {
            produitsReconnus = JSON.parse(cleaned);
            if (!Array.isArray(produitsReconnus)) throw new Error('Pas un tableau');
        } catch(e) {
            var regex = /["']nom["']\s*:\s*["']([^"']+)["']\s*,\s*["']quantite["']\s*:\s*(\d+)(?:\s*,\s*["']prix["']\s*:\s*([\d.]+))?/gi;
            var match;
            while ((match = regex.exec(cleaned)) !== null) {
                produitsReconnus.push({
                    nom: match[1].trim(),
                    quantite: parseInt(match[2]),
                    prix: match[3] ? parseFloat(match[3]) : null
                });
            }
        }

        overlay.remove();

        if (produitsReconnus.length === 0) {
            alert('Aucun produit reconnu sur la facture.');
            return;
        }

        var prixChangés = [];
        produitsReconnus.forEach(function(p) {
            var ligne = achatLignes.find(function(l) {
                var lName = (l.nom || '').toLowerCase();
                var pName = (p.nom || '').toLowerCase();
                return lName.includes(pName) || pName.includes(lName);
            });
            if (!ligne) return;

            ligne.quantite = p.quantite || 0;
            ligne.total = ligne.quantite * (ligne.nouveauPrix || 0);

            if (p.prix && p.prix > 0) {
                var ancienPrix = ligne.prixActuel || 0;
                ligne.nouveauPrix = p.prix;
                ligne.total = ligne.quantite * p.prix;
                if (Math.abs(p.prix - ancienPrix) > 0.001 && ancienPrix > 0) {
                    ligne.prixChange = true;
                    prixChangés.push({
                        nom: ligne.nom,
                        ancien: ancienPrix,
                        nouveau: p.prix
                    });
                }
            }
        });

        afficherProduitsAchat();

        if (prixChangés.length > 0) {
            var msg = '⚠️ PRIX CHANGÉS DÉTECTÉS\n\nLa facture contient ' + prixChangés.length + ' produit(s) avec un prix différent :\n\n';
            prixChangés.forEach(function(pc) {
                msg += '• ' + pc.nom + '\n  ' + pc.ancien.toFixed(2) + ' MAD → ' + pc.nouveau.toFixed(2) + ' MAD\n';
            });
            msg += '\nLes nouveaux prix ont été pré-remplis. Vérifiez avant de valider.';
            alert(msg);
        } else {
            alert('✅ ' + produitsReconnus.length + ' produit(s) reconnu(s) et pré-rempli(s).');
        }

    } catch(e) {
        if (overlay.parentNode) overlay.remove();
        console.error(e);
        alert('❌ Erreur scan : ' + e.message);
    }
}

window.openAchatModal = openAchatModal;
window.fermerAchatModal = fermerAchatModal;
window.chargerProduitsFournisseurAchat = chargerProduitsFournisseurAchat;
window.validerAchats = validerAchats;
window.calculerTotalLigne = calculerTotalLigne;
window.ouvrirCameraFacture = ouvrirCameraFacture;
window.scannerFacture = scannerFacture;

window.renderCategoriesTable = renderCategoriesTable;
window.renderProductsTable = renderProductsTable;
window.renderClientsTable = renderClientsTable;
window.renderFournisseursTable = renderFournisseursTable;

console.log('🚀 E-SOLUTION - Admin CRUD - Version PRO');
console.log('✅ 🎨 Page produits moderne (style POS bleu/blanc)');
console.log('✅ 📷 Bouton Scanner sans mention Gemini');
console.log('✅ ⚠️ Détection prix changé → alerte + confirmation');
console.log('✅ 💰 Total général affiché en bas du formulaire d\'achat');
console.log('✅ 🔍 Barre de recherche produit dans la liste d\'achat');
console.log('✅ 🆕 Date de production + Durée de conservation + Date d\'expiration par produit');
console.log('✅ 🆕 Durées par défaut intelligentes selon la catégorie');
console.log('✅ 🆕 Badges colorés (production = bleu, expiration = vert/orange/rouge)');
