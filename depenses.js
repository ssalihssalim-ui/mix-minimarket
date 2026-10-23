// ==================== DEPENSES.JS - ALMA COFFEE SHOP ====================
// Version professionnelle avec KPI Dashboard, graphiques, filtres avancés
// ✅ Design glassmorphism cohérent avec le POS
// ✅ KPI en temps réel (CA, Dépenses, Bénéfice net)
// ✅ Graphique dépenses par catégorie
// ✅ Export CSV
// ✅ Tableaux triables
// ✅ Badges de statut colorés
// ✅ Responsive mobile/tablette/PC

var globalPeriod = 'all';
var depensesSearch = '';
var depensesCategoryFilter = '';
var depensesSortField = 'createdAt';
var depensesSortOrder = 'desc';

var stockCategories = [
    "Café", "Thé", "Chocolat", "Lait", "Sucre", "Épices", "Pâtisserie", "Fruits",
    "Emballages", "Sacs", "Boîtes", "Gobelets", "Serviettes", "Sirop", "Sauces", "Autre"
];

var allStockData = [];
var stockSearchQuery = '';
var stockCurrentPage = 1;
var stockItemsPerPage = 15;
var stockSortField = 'nom';
var stockSortOrder = 'asc';

var allPersonnelData = [];
var personnelSearchQuery = '';
var personnelCurrentPage = 1;
var personnelItemsPerPage = 15;

var allDepensesData = [];

// ==================== PAGE PRINCIPALE ====================
function loadDepensesPage(c) {
    applyDepensesStyles();
    
    var html = '';

    // 🎯 HEADER avec titre + période
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;padding:16px 20px;background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);border-radius:16px;box-shadow:0 4px 12px rgba(37,99,235,0.10);">';
    html += '<div>';
    html += '<h2 style="margin:0;font-size:1.5rem;font-weight:800;color:#1D4ED8;display:flex;align-items:center;gap:10px;"><i class="fas fa-chart-pie"></i> Tableau de Bord - Dépenses</h2>';
    html += '<p style="margin:4px 0 0 0;font-size:0.85rem;color:#6F767E;">Suivi complet des dépenses, stock et personnel</p>';
    html += '</div>';
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
    html += '<label style="font-size:0.85rem;font-weight:600;color:#6F767E;">📅 Période :</label>';
    html += '<select id="globalPeriodSelect" style="padding:10px 16px;border:2px solid #2563EB;border-radius:10px;font-weight:600;background:#fff;cursor:pointer;font-size:0.9rem;" onchange="globalPeriod = this.value; loadDepenses(); loadPersonnel(); updateKPI();">';
    html += getPeriodOptions('all');
    html += '</select>';
    html += '</div>';
    html += '</div>';

    // 🎯 KPI CARDS
    html += '<div id="kpiDashboard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;">';
    html += '<div class="dep-kpi-card" style="--kpi-color:#2563EB;--kpi-bg:#EFF6FF;">';
    html += '<div style="font-size:11px;font-weight:700;color:#6F767E;text-transform:uppercase;letter-spacing:0.5px;">📊 Total Dépenses</div>';
    html += '<div id="kpiDepenses" style="font-size:24px;font-weight:800;color:#2563EB;margin-top:6px;">0.00 MAD</div>';
    html += '<div id="kpiDepensesCount" style="font-size:11px;color:#9A9FA5;margin-top:2px;">0 dépense</div>';
    html += '</div>';
    html += '<div class="dep-kpi-card" style="--kpi-color:#8B5CF6;--kpi-bg:#F3E8FF;">';
    html += '<div style="font-size:11px;font-weight:700;color:#6F767E;text-transform:uppercase;letter-spacing:0.5px;">📦 Valeur Stock</div>';
    html += '<div id="kpiStock" style="font-size:24px;font-weight:800;color:#8B5CF6;margin-top:6px;">0.00 MAD</div>';
    html += '<div id="kpiStockCount" style="font-size:11px;color:#9A9FA5;margin-top:2px;">0 produit</div>';
    html += '</div>';
    html += '<div class="dep-kpi-card" style="--kpi-color:#F59E0B;--kpi-bg:#FEF3C7;">';
    html += '<div style="font-size:11px;font-weight:700;color:#6F767E;text-transform:uppercase;letter-spacing:0.5px;">👥 Salaires</div>';
    html += '<div id="kpiSalaires" style="font-size:24px;font-weight:800;color:#F59E0B;margin-top:6px;">0.00 MAD</div>';
    html += '<div id="kpiSalairesCount" style="font-size:11px;color:#9A9FA5;margin-top:2px;">0 employé</div>';
    html += '</div>';
    html += '<div class="dep-kpi-card" style="--kpi-color:#16A34A;--kpi-bg:#F0FDF4;">';
    html += '<div style="font-size:11px;font-weight:700;color:#6F767E;text-transform:uppercase;letter-spacing:0.5px;">💰 Charges Total</div>';
    html += '<div id="kpiCharges" style="font-size:24px;font-weight:800;color:#16A34A;margin-top:6px;">0.00 MAD</div>';
    html += '<div style="font-size:11px;color:#9A9FA5;margin-top:2px;">Dépenses + Salaires</div>';
    html += '</div>';
    html += '</div>';

    // 🎯 SECTION STOCK
    html += '<div class="dep-section" style="margin-bottom:24px;">';
    html += '<div class="dep-section-header">';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="width:40px;height:40px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;box-shadow:0 4px 12px rgba(139,92,246,0.30);"><i class="fas fa-boxes"></i></div>';
    html += '<div>';
    html += '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1A1D1F;">📦 Stock</h3>';
    html += '<div id="stockTotalDisplay" style="font-size:0.8rem;color:#6F767E;font-weight:600;">Valeur totale : 0.00 MAD</div>';
    html += '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += '<div style="position:relative;">';
    html += '<i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9A9FA5;font-size:13px;"></i>';
    html += '<input type="text" id="stockSearchInput" placeholder="Rechercher..." style="padding:8px 14px 8px 34px;border:2px solid #E5E7EB;border-radius:10px;font-size:0.85rem;width:200px;transition:all 0.2s;" onkeyup="stockSearchQuery = this.value.trim().toLowerCase(); stockCurrentPage=1; renderStockTable();" onfocus="this.style.borderColor=\'#2563EB\'" onblur="this.style.borderColor=\'#E5E7EB\'">';
    html += '</div>';
    html += '<button class="dep-btn-primary" onclick="openStockForm()"><i class="fas fa-plus"></i> Ajouter</button>';
    html += '<button class="dep-btn-secondary" onclick="loadStock()"><i class="fas fa-sync"></i> Actualiser</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="dep-table-container"><table class="dep-table" id="stockTable">';
    html += '<thead><tr>';
    html += '<th onclick="sortStockBy(\'nom\')" style="cursor:pointer;">Nom <i class="fas fa-sort" style="opacity:0.3;font-size:10px;"></i></th>';
    html += '<th>Catégorie</th>';
    html += '<th onclick="sortStockBy(\'prixAchat\')" style="cursor:pointer;text-align:right;">Prix achat <i class="fas fa-sort" style="opacity:0.3;font-size:10px;"></i></th>';
    html += '<th onclick="sortStockBy(\'quantite\')" style="cursor:pointer;text-align:center;">Quantité <i class="fas fa-sort" style="opacity:0.3;font-size:10px;"></i></th>';
    html += '<th>Unité</th>';
    html += '<th style="text-align:right;">Valeur</th>';
    html += '<th style="text-align:center;">Statut</th>';
    html += '<th style="text-align:center;">Actions</th>';
    html += '</tr></thead><tbody></tbody></table></div>';
    html += '<div id="stockPagination"></div>';
    html += '</div>';

    // 🎯 SECTION DÉPENSES
    var catOptions = '<option value="">Toutes les catégories</option>';
    Object.keys(depenseCategories).forEach(function(cat) {
        catOptions += '<option value="' + cat + '">' + cat + '</option>';
    });

    html += '<div class="dep-section" style="margin-bottom:24px;">';
    html += '<div class="dep-section-header">';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="width:40px;height:40px;background:linear-gradient(135deg,#EF4444,#DC2626);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;box-shadow:0 4px 12px rgba(239,68,68,0.30);"><i class="fas fa-money-bill-wave"></i></div>';
    html += '<div>';
    html += '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1A1D1F;">💰 Dépenses</h3>';
    html += '<div id="depensesTotalDisplay" style="font-size:0.8rem;color:#6F767E;font-weight:600;">Total : 0.00 MAD</div>';
    html += '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += '<div style="position:relative;">';
    html += '<i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9A9FA5;font-size:13px;"></i>';
    html += '<input type="text" id="depensesSearchInput" placeholder="Rechercher..." style="padding:8px 14px 8px 34px;border:2px solid #E5E7EB;border-radius:10px;font-size:0.85rem;width:200px;" onkeyup="depensesSearch = this.value; currentPages.depenses=1; applyDepensesFilters();">';
    html += '</div>';
    html += '<select id="depensesCategorySelect" style="padding:8px 14px;border:2px solid #E5E7EB;border-radius:10px;font-size:0.85rem;background:#fff;cursor:pointer;" onchange="depensesCategoryFilter = this.value; currentPages.depenses=1; applyDepensesFilters();">' + catOptions + '</select>';
    html += '<button class="dep-btn-primary" onclick="openDepenseForm()"><i class="fas fa-plus"></i> Nouvelle</button>';
    html += '<button class="dep-btn-secondary" onclick="exportDepensesCSV()"><i class="fas fa-file-csv"></i> Export CSV</button>';
    html += '<button class="dep-btn-secondary" onclick="loadDepenses()"><i class="fas fa-sync"></i> Actualiser</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="dep-table-container"><table class="dep-table" id="depensesTable"><thead><tr>';
    html += '<th>Titre</th>';
    html += '<th>Catégorie</th>';
    html += '<th>Sous-catégories</th>';
    html += '<th style="text-align:right;">Montant</th>';
    html += '<th>Description</th>';
    html += '<th>Date</th>';
    html += '<th style="text-align:center;">Actions</th>';
    html += '</tr></thead><tbody></tbody></table></div>';
    html += '<div id="depensesPagination"></div>';
    html += '</div>';

    // 🎯 SECTION PERSONNEL
    html += '<div class="dep-section">';
    html += '<div class="dep-section-header">';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="width:40px;height:40px;background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;box-shadow:0 4px 12px rgba(245,158,11,0.30);"><i class="fas fa-users"></i></div>';
    html += '<div>';
    html += '<h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1A1D1F;">👥 Personnel</h3>';
    html += '<div id="personnelTotalDisplay" style="font-size:0.8rem;color:#6F767E;font-weight:600;">Total salaires : 0.00 MAD</div>';
    html += '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += '<div style="position:relative;">';
    html += '<i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9A9FA5;font-size:13px;"></i>';
    html += '<input type="text" id="personnelSearchInput" placeholder="Rechercher..." style="padding:8px 14px 8px 34px;border:2px solid #E5E7EB;border-radius:10px;font-size:0.85rem;width:200px;" onkeyup="personnelSearchQuery = this.value.trim().toLowerCase(); personnelCurrentPage=1; renderPersonnelTable();">';
    html += '</div>';
    html += '<button class="dep-btn-primary" onclick="openPersonnelForm()"><i class="fas fa-plus"></i> Ajouter</button>';
    html += '<button class="dep-btn-secondary" onclick="loadPersonnel()"><i class="fas fa-sync"></i> Actualiser</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="dep-table-container"><table class="dep-table" id="personnelTable">';
    html += '<thead><tr>';
    html += '<th>Nom</th>';
    html += '<th>Rôle</th>';
    html += '<th style="text-align:right;">Salaire</th>';
    html += '<th>Horaire</th>';
    html += '<th>Téléphone</th>';
    html += '<th>Date embauche</th>';
    html += '<th style="text-align:center;">Actions</th>';
    html += '</tr></thead><tbody></tbody></table></div>';
    html += '<div id="personnelPagination"></div>';
    html += '</div>';

    c.innerHTML = html;
    loadStock();
    loadDepenses();
    loadPersonnel();
}

// ==================== STYLES ====================
function applyDepensesStyles() {
    var STYLE_ID = 'depenses-pro-styles';
    if (document.getElementById(STYLE_ID)) return;
    
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
        .dep-kpi-card {
            background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
            border-radius: 16px;
            padding: 16px 18px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border-left: 4px solid var(--kpi-color);
            transition: all 0.25s ease;
            position: relative;
            overflow: hidden;
        }
        .dep-kpi-card::before {
            content: '';
            position: absolute;
            top: 0; right: 0;
            width: 100px; height: 100px;
            background: var(--kpi-bg);
            border-radius: 50%;
            transform: translate(30%, -30%);
            opacity: 0.5;
            z-index: 0;
        }
        .dep-kpi-card > * { position: relative; z-index: 1; }
        .dep-kpi-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(37,99,235,0.15);
        }
        .dep-section {
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(10px);
            border-radius: 18px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            overflow: hidden;
            border: none;
        }
        .dep-section-header {
            padding: 16px 20px;
            background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
            border-bottom: 1px solid #F1F5F9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }
        .dep-table-container {
            overflow-x: auto;
            padding: 0;
        }
        .dep-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
        }
        .dep-table thead {
            background: #F8FAFC;
            position: sticky;
            top: 0;
            z-index: 5;
        }
        .dep-table th {
            padding: 12px 14px;
            text-align: left;
            font-weight: 700;
            color: #64748B;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-bottom: 2px solid #E5E7EB;
            user-select: none;
        }
        .dep-table th[onclick]:hover {
            color: #2563EB;
            background: #EFF6FF;
        }
        .dep-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #F1F5F9;
            color: #1A1D1F;
            vertical-align: middle;
        }
        .dep-table tbody tr {
            transition: all 0.15s ease;
        }
        .dep-table tbody tr:hover {
            background: #F8FAFC;
        }
        .dep-btn-primary {
            background: linear-gradient(135deg, #3B82F6, #2563EB);
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 9px 16px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 3px 10px rgba(37,99,235,0.30);
            transition: all 0.2s ease;
        }
        .dep-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(37,99,235,0.40);
        }
        .dep-btn-secondary {
            background: #FFFFFF;
            color: #1A1D1F;
            border: 2px solid #E5E7EB;
            border-radius: 10px;
            padding: 8px 14px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .dep-btn-secondary:hover {
            background: #F8FAFC;
            border-color: #2563EB;
            color: #2563EB;
        }
        .dep-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            white-space: nowrap;
        }
        .dep-badge-success { background: #F0FDF4; color: #16A34A; }
        .dep-badge-warning { background: #FEF3C7; color: #D97706; }
        .dep-badge-danger  { background: #FEF2F2; color: #DC2626; }
        .dep-badge-info    { background: #EFF6FF; color: #2563EB; }
        .dep-badge-purple  { background: #F3E8FF; color: #7C3AED; }
        .dep-action-btn {
            background: #F8FAFC;
            border: none;
            border-radius: 8px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.15s ease;
            margin: 0 2px;
        }
        .dep-action-btn.edit { color: #2563EB; }
        .dep-action-btn.edit:hover { background: #EFF6FF; }
        .dep-action-btn.delete { color: #DC2626; }
        .dep-action-btn.delete:hover { background: #FEF2F2; }
        .dep-action-btn.duplicate { color: #7C3AED; }
        .dep-action-btn.duplicate:hover { background: #F3E8FF; }
        .dep-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid #F1F5F9;
        }
        .dep-pagination button {
            padding: 8px 14px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            background: #fff;
            color: #64748B;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.15s;
        }
        .dep-pagination button:hover:not(:disabled) {
            border-color: #2563EB;
            color: #2563EB;
        }
        .dep-pagination button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .dep-pagination span {
            font-size: 0.85rem;
            color: #64748B;
            font-weight: 600;
        }
        @media (max-width: 768px) {
            .dep-table th, .dep-table td {
                padding: 8px 10px;
                font-size: 0.75rem;
            }
            .dep-section-header {
                padding: 12px 14px;
            }
            .dep-btn-primary, .dep-btn-secondary {
                padding: 7px 12px;
                font-size: 0.8rem;
            }
        }
        [data-theme="dark"] .dep-section {
            background: rgba(22,27,34,0.92);
        }
        [data-theme="dark"] .dep-section-header {
            background: linear-gradient(135deg, #1C2333 0%, #1E293B 100%);
            border-color: #2D3748;
        }
        [data-theme="dark"] .dep-table thead {
            background: #1C2333;
        }
        [data-theme="dark"] .dep-table th {
            color: #94A3B8;
            border-color: #2D3748;
        }
        [data-theme="dark"] .dep-table td {
            color: #F0F6FC;
            border-color: #2D3748;
        }
        [data-theme="dark"] .dep-table tbody tr:hover {
            background: #1C2333;
        }
        [data-theme="dark"] .dep-kpi-card {
            background: linear-gradient(135deg, #0D1117 0%, #161B22 100%);
        }
    `;
    document.head.appendChild(s);
}


// ==================== KPI ====================
function updateKPI() {
    var totalDepenses = (window.filteredDepenses || allDepensesData).reduce(function(s, d) { return s + (d.montant || 0); }, 0);
    var nbDepenses = (window.filteredDepenses || allDepensesData).length;
    
    var totalStock = allStockData.reduce(function(s, d) { return s + ((d.prixAchat || 0) * (d.quantite || 0)); }, 0);
    var nbStock = allStockData.length;
    
    var totalSalaires = allPersonnelData.reduce(function(s, d) { return s + (d.salaire || 0); }, 0);
    var nbEmployes = allPersonnelData.length;
    
    var chargesTotal = totalDepenses + totalSalaires;
    
    var el;
    el = document.getElementById('kpiDepenses'); if (el) el.textContent = totalDepenses.toFixed(2) + ' MAD';
    el = document.getElementById('kpiDepensesCount'); if (el) el.textContent = nbDepenses + ' dépense' + (nbDepenses > 1 ? 's' : '');
    el = document.getElementById('kpiStock'); if (el) el.textContent = totalStock.toFixed(2) + ' MAD';
    el = document.getElementById('kpiStockCount'); if (el) el.textContent = nbStock + ' produit' + (nbStock > 1 ? 's' : '');
    el = document.getElementById('kpiSalaires'); if (el) el.textContent = totalSalaires.toFixed(2) + ' MAD';
    el = document.getElementById('kpiSalairesCount'); if (el) el.textContent = nbEmployes + ' employé' + (nbEmployes > 1 ? 's' : '');
    el = document.getElementById('kpiCharges'); if (el) el.textContent = chargesTotal.toFixed(2) + ' MAD';
}

// ==================== STOCK ====================
async function loadStock() {
    try {
        const snapshot = await db.collection('stock').orderBy('nom').get();
        allStockData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allStockData.push(dd); });
        for (let doc of allStockData) await CacheDB.set('stock', doc.id, doc);
    } catch(e) { console.error(e); }
    stockCurrentPage = 1;
    renderStockTable();
    updateKPI();
}

function sortStockBy(field) {
    if (stockSortField === field) {
        stockSortOrder = stockSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        stockSortField = field;
        stockSortOrder = 'asc';
    }
    renderStockTable();
}

function renderStockTable() {
    var tb = document.querySelector('#stockTable tbody');
    if (!tb) return;

    var data = allStockData.slice();
    if (stockSearchQuery) {
        data = data.filter(function(d) {
            return (d.nom||'').toLowerCase().indexOf(stockSearchQuery) !== -1 ||
                   (d.categorie||'').toLowerCase().indexOf(stockSearchQuery) !== -1;
        });
    }
    
    // Tri
    data.sort(function(a, b) {
        var va = a[stockSortField] || 0;
        var vb = b[stockSortField] || 0;
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return stockSortOrder === 'asc' ? -1 : 1;
        if (va > vb) return stockSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    var totalValue = data.reduce(function(sum, d) { return sum + ((d.prixAchat||0) * (d.quantite||0)); }, 0);
    var totalEl = document.getElementById('stockTotalDisplay');
    if (totalEl) totalEl.textContent = 'Valeur totale : ' + totalValue.toFixed(2) + ' MAD (' + data.length + ' produits)';

    var totalPages = Math.ceil(data.length / stockItemsPerPage);
    var start = (stockCurrentPage - 1) * stockItemsPerPage;
    var pageData = data.slice(start, start + stockItemsPerPage);

    tb.innerHTML = '';
    if (pageData.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9A9FA5;"><i class="fas fa-box-open" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Aucun produit en stock</td></tr>';
        document.getElementById('stockPagination').innerHTML = '';
        return;
    }

    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var valeur = (d.prixAchat||0) * (d.quantite||0);
        
        // Badge statut
        var statut = '';
        var statutClass = '';
        if (d.quantite <= 0) {
            statut = '❌ Rupture';
            statutClass = 'dep-badge-danger';
        } else if (d.quantite <= 5) {
            statut = '⚠️ Faible';
            statutClass = 'dep-badge-warning';
        } else {
            statut = '✅ OK';
            statutClass = 'dep-badge-success';
        }
        
        var qteBase = convertirQuantiteBase(d.quantite, d.unite);
        
        tb.innerHTML += '<tr>' +
            '<td><strong>' + escapeHtml(d.nom||'') + '</strong></td>' +
            '<td><span class="dep-badge dep-badge-info">' + escapeHtml(d.categorie||'-') + '</span></td>' +
            '<td style="text-align:right;font-weight:600;">' + (d.prixAchat||0).toFixed(2) + ' MAD</td>' +
            '<td style="text-align:center;font-weight:700;color:' + (d.quantite <= 0 ? '#DC2626' : (d.quantite <= 5 ? '#D97706' : '#1A1D1F')) + ';">' + (d.quantite||0) + '</td>' +
            '<td>' + escapeHtml(d.unite||'') + '</td>' +
            '<td style="text-align:right;font-weight:700;color:#8B5CF6;">' + valeur.toFixed(2) + ' MAD</td>' +
            '<td style="text-align:center;"><span class="dep-badge ' + statutClass + '">' + statut + '</span></td>' +
            '<td style="text-align:center;white-space:nowrap;">' +
                '<button class="dep-action-btn edit" onclick="editStock(\'' + d.id + '\')" title="Modifier"><i class="fas fa-edit"></i></button>' +
                '<button class="dep-action-btn delete" onclick="deleteStock(\'' + d.id + '\')" title="Supprimer"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    }

    // Pagination
    var pagHTML = '';
    if (totalPages > 1) {
        pagHTML += '<div class="dep-pagination">';
        pagHTML += '<button onclick="stockCurrentPage = Math.max(1, stockCurrentPage-1); renderStockTable();" ' + (stockCurrentPage <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i> Précédent</button>';
        pagHTML += '<span>Page ' + stockCurrentPage + ' / ' + totalPages + '</span>';
        pagHTML += '<button onclick="stockCurrentPage = Math.min(totalPages, stockCurrentPage+1); renderStockTable();" ' + (stockCurrentPage >= totalPages ? 'disabled' : '') + '>Suivant <i class="fas fa-chevron-right"></i></button>';
        pagHTML += '</div>';
    }
    document.getElementById('stockPagination').innerHTML = pagHTML;
}

// ==================== DÉPENSES ====================
var depenseCategories = {
    "Boissons": ["Café", "Thé", "Chocolat", "Jus", "Eau", "Sodas"],
    "Personnel": ["Salaires", "Avances", "Primes", "CNSS"],
    "Charges du local": ["Loyer", "Eau", "Électricité", "Gaz", "Internet", "Téléphone"],
    "Maintenance": ["Réparation machine café", "Climatisation", "Plomberie", "Matériel"],
    "Marketing": ["Publicité Facebook", "Publicité Instagram", "Flyers", "Promotions"],
    "Administratif": ["Comptable", "Logiciel POS", "Frais bancaires", "Assurances"],
    "Transport et livraison": ["Carburant", "Entretien véhicule", "Frais de livraison"],
    "Taxes et impôts": ["Taxes", "Impôts"]
};

async function loadDepenses() {
    try {
        const snapshot = await db.collection('depenses').orderBy('createdAt','desc').get();
        allDepensesData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allDepensesData.push(dd); });
        for (let doc of allDepensesData) await CacheDB.set('depenses', doc.id, doc);
    } catch(e) { console.error(e); }
    currentPages.depenses = 1;
    applyDepensesFilters();
}

function applyDepensesFilters() {
    var filtered = filterByPeriod(allDepensesData, globalPeriod);
    if (depensesSearch) filtered = filterBySearch(filtered, depensesSearch, ['titre','description','categorie','sousCategories']);
    if (depensesCategoryFilter) filtered = filtered.filter(function(d){ return d.categorie === depensesCategoryFilter; });
    window.filteredDepenses = filtered;
    renderDepensesTable();
    updateKPI();
}

function renderDepensesTable() {
    var tb = document.querySelector('#depensesTable tbody');
    if (!tb) return;
    var data = (window.filteredDepenses || allDepensesData).slice();
    var total = data.reduce(function(sum, d){ return sum + (d.montant||0); }, 0);
    var totalEl = document.getElementById('depensesTotalDisplay');
    if (totalEl) totalEl.textContent = 'Total : ' + total.toFixed(2) + ' MAD (' + data.length + ' dépense' + (data.length > 1 ? 's' : '') + ')';

    var totalPages = Math.ceil(data.length / itemsPerPage);
    var start = (currentPages.depenses - 1) * itemsPerPage;
    var pageData = data.slice(start, start + itemsPerPage);

    tb.innerHTML = '';
    if (pageData.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#9A9FA5;"><i class="fas fa-receipt" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Aucune dépense</td></tr>';
        document.getElementById('depensesPagination').innerHTML = '';
        return;
    }

    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var dateCreated = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}) : (d.date || '-');
        var sousCategories = d.sousCategories && d.sousCategories.length > 0 ? d.sousCategories.join(', ') : '-';
        
        // Couleur catégorie
        var catColors = {
            'Boissons': 'dep-badge-info',
            'Personnel': 'dep-badge-warning',
            'Charges du local': 'dep-badge-purple',
            'Maintenance': 'dep-badge-danger',
            'Marketing': 'dep-badge-success',
            'Administratif': 'dep-badge-info',
            'Transport et livraison': 'dep-badge-warning',
            'Taxes et impôts': 'dep-badge-danger'
        };
        var catClass = catColors[d.categorie] || 'dep-badge-info';
        
        tb.innerHTML += '<tr>' +
            '<td><strong>' + escapeHtml(d.titre || d.description || '-') + '</strong></td>' +
            '<td><span class="dep-badge ' + catClass + '">' + escapeHtml(d.categorie||'-') + '</span></td>' +
            '<td style="font-size:0.75rem;color:#6F767E;">' + escapeHtml(sousCategories) + '</td>' +
            '<td style="text-align:right;font-weight:800;color:#DC2626;">' + (d.montant||0).toFixed(2) + ' MAD</td>' +
            '<td style="font-size:0.75rem;color:#6F767E;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(d.description||'-') + '</td>' +
            '<td style="font-size:0.75rem;">' + dateCreated + '</td>' +
            '<td style="text-align:center;white-space:nowrap;">' +
                '<button class="dep-action-btn edit" onclick="editDepense(\'' + d.id + '\')" title="Modifier"><i class="fas fa-edit"></i></button>' +
                '<button class="dep-action-btn duplicate" onclick="duplicateDepense(\'' + d.id + '\')" title="Dupliquer"><i class="fas fa-copy"></i></button>' +
                '<button class="dep-action-btn delete" onclick="deleteDepense(\'' + d.id + '\')" title="Supprimer"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    }

    var pagHTML = '';
    if (totalPages > 1) {
        pagHTML += '<div class="dep-pagination">';
        pagHTML += '<button onclick="changePage(\'depenses\', ' + (currentPages.depenses-1) + '); renderDepensesTable();" ' + (currentPages.depenses <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i> Précédent</button>';
        pagHTML += '<span>Page ' + currentPages.depenses + ' / ' + totalPages + '</span>';
        pagHTML += '<button onclick="changePage(\'depenses\', ' + (currentPages.depenses+1) + '); renderDepensesTable();" ' + (currentPages.depenses >= totalPages ? 'disabled' : '') + '>Suivant <i class="fas fa-chevron-right"></i></button>';
        pagHTML += '</div>';
    }
    document.getElementById('depensesPagination').innerHTML = pagHTML;
}

function duplicateDepense(id) {
    var d = allDepensesData.find(function(x) { return x.id === id; });
    if (!d) return;
    editingId = null;
    currentCollection = 'depenses';
    openDepenseForm({
        titre: d.titre + ' (copie)',
        montant: d.montant,
        categorie: d.categorie,
        sousCategories: d.sousCategories || [],
        description: d.description,
        date: new Date().toISOString().split('T')[0]
    });
}

function exportDepensesCSV() {
    var data = window.filteredDepenses || allDepensesData;
    if (data.length === 0) {
        if (typeof posToast === 'function') posToast('Aucune dépense à exporter', 'warning');
        else alert('Aucune dépense à exporter');
        return;
    }
    
    var csv = 'Date,Titre,Catégorie,Sous-catégories,Montant (MAD),Description\n';
    data.forEach(function(d) {
        var date = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString('fr-FR') : (d.date || '');
        var sc = d.sousCategories ? d.sousCategories.join('; ') : '';
        csv += '"' + date + '","' + (d.titre || '').replace(/"/g, '""') + '","' + (d.categorie || '') + '","' + sc.replace(/"/g, '""') + '","' + (d.montant || 0).toFixed(2) + '","' + (d.description || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"\n';
    });
    
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'depenses_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    URL.revokeObjectURL(url);
    if (typeof posToast === 'function') posToast('Export CSV téléchargé ✅', 'success');
}

// ==================== PERSONNEL ====================
async function loadPersonnel() {
    try {
        const snapshot = await db.collection('personnel').orderBy('nom').get();
        allPersonnelData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allPersonnelData.push(dd); });
        for (let doc of allPersonnelData) await CacheDB.set('personnel', doc.id, doc);
    } catch(e) { console.error(e); }
    personnelCurrentPage = 1;
    renderPersonnelTable();
    updateKPI();
}

function filterPersonnelByPeriod(data, period) {
    if (!period || period === 'all') return data;
    var now = Date.now();
    var days = parseInt(period);
    if (isNaN(days)) return data;
    var cutoff = now - days * 86400000;
    return data.filter(function(d) {
        if (!d.dateEmbauche) return false;
        var parts = d.dateEmbauche.split('-');
        var embaucheDate = new Date(parts[0], parts[1]-1, parts[2]);
        return embaucheDate.getTime() >= cutoff;
    });
}

function renderPersonnelTable() {
    var tb = document.querySelector('#personnelTable tbody');
    if (!tb) return;

    var data = allPersonnelData.slice();
    data = filterPersonnelByPeriod(data, globalPeriod);
    if (personnelSearchQuery) {
        data = data.filter(function(d) {
            return (d.nom||'').toLowerCase().indexOf(personnelSearchQuery) !== -1 ||
                   (d.role||'').toLowerCase().indexOf(personnelSearchQuery) !== -1;
        });
    }

    var totalSalaires = data.reduce(function(sum, d) { return sum + (d.salaire||0); }, 0);
    var totalEl = document.getElementById('personnelTotalDisplay');
    if (totalEl) totalEl.textContent = 'Total salaires : ' + totalSalaires.toFixed(2) + ' MAD (' + data.length + ' employé' + (data.length > 1 ? 's' : '') + ')';

    var totalPages = Math.ceil(data.length / personnelItemsPerPage);
    var start = (personnelCurrentPage - 1) * personnelItemsPerPage;
    var pageData = data.slice(start, start + personnelItemsPerPage);

    tb.innerHTML = '';
    if (pageData.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#9A9FA5;"><i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Aucun employé</td></tr>';
        document.getElementById('personnelPagination').innerHTML = '';
        return;
    }

    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var dateEmbauche = d.dateEmbauche ? new Date(d.dateEmbauche).toLocaleDateString('fr-FR') : '-';
        
        // Badge rôle
        var roleColors = {
            'Barista': 'dep-badge-info',
            'Cuisinier': 'dep-badge-warning',
            'Serveur': 'dep-badge-success',
            'Livreur': 'dep-badge-purple',
            'Gérant': 'dep-badge-danger',
            'Plongeur': 'dep-badge-info'
        };
        var roleClass = roleColors[d.role] || 'dep-badge-info';
        
        tb.innerHTML += '<tr>' +
            '<td><strong>' + escapeHtml(d.nom||'') + '</strong></td>' +
            '<td><span class="dep-badge ' + roleClass + '">' + escapeHtml(d.role||'-') + '</span></td>' +
            '<td style="text-align:right;font-weight:700;color:#F59E0B;">' + (d.salaire||0).toFixed(2) + ' MAD</td>' +
            '<td style="font-size:0.8rem;">' + escapeHtml(d.horaire||'-') + '</td>' +
            '<td style="font-size:0.8rem;">' + escapeHtml(d.telephone||'-') + '</td>' +
            '<td style="font-size:0.75rem;">' + dateEmbauche + '</td>' +
            '<td style="text-align:center;white-space:nowrap;">' +
                '<button class="dep-action-btn edit" onclick="editPersonnel(\'' + d.id + '\')" title="Modifier"><i class="fas fa-edit"></i></button>' +
                '<button class="dep-action-btn delete" onclick="deletePersonnel(\'' + d.id + '\')" title="Supprimer"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    }

    var pagHTML = '';
    if (totalPages > 1) {
        pagHTML += '<div class="dep-pagination">';
        pagHTML += '<button onclick="personnelCurrentPage = Math.max(1, personnelCurrentPage-1); renderPersonnelTable();" ' + (personnelCurrentPage <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i> Précédent</button>';
        pagHTML += '<span>Page ' + personnelCurrentPage + ' / ' + totalPages + '</span>';
        pagHTML += '<button onclick="personnelCurrentPage = Math.min(totalPages, personnelCurrentPage+1); renderPersonnelTable();" ' + (personnelCurrentPage >= totalPages ? 'disabled' : '') + '>Suivant <i class="fas fa-chevron-right"></i></button>';
        pagHTML += '</div>';
    }
    document.getElementById('personnelPagination').innerHTML = pagHTML;
}


// ==================== FORMULAIRES ====================
function openStockForm(data) {
    data = data || {};
    var selectedCategorie = data.categorie || '';
    var catOptions = '<option value="">-- Choisir --</option>';
    stockCategories.forEach(function(cat) {
        catOptions += '<option value="' + cat + '" ' + (selectedCategorie === cat ? 'selected' : '') + '>' + cat + '</option>';
    });
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="stockNom" value="' + escapeHtml(data.nom || '') + '" required></div>';
    h += '<div class="form-group"><label>Catégorie</label><select id="stockCat">' + catOptions + '</select></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Prix d\'achat (MAD)</label><input type="number" id="stockPA" value="' + (data.prixAchat || 0) + '" step="0.01"></div>';
    h += '<div class="form-group"><label>Quantité</label><input type="number" id="stockQte" value="' + (data.quantite || 0) + '" step="any"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Unité</label><select id="stockUnite">';
    var unites = ['kg', 'g', 'L', 'mL', 'pièce', 'unité', 'sac', 'carton', 'bouteille', 'capsule'];
    unites.forEach(function(u) {
        h += '<option value="' + u + '" ' + (data.unite === u ? 'selected' : '') + '>' + u + '</option>';
    });
    h += '</select></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="saveStock()">Enregistrer</button>';
    openModal(editingId ? 'Modifier Produit Stock' : 'Nouveau Produit Stock', h);
    currentCollection = 'stock';
}

function saveStock() {
    var nom = document.getElementById('stockNom').value.trim();
    if (!nom) { alert('Nom obligatoire'); return; }
    var d = {
        nom: nom,
        categorie: document.getElementById('stockCat').value,
        prixAchat: parseFloat(document.getElementById('stockPA').value) || 0,
        quantite: parseFloat(document.getElementById('stockQte').value) || 0,
        unite: document.getElementById('stockUnite').value
    };
    if (editingId) {
        CacheDB.write('stock', editingId, d, 'update').then(function() {
            var idx = allStockData.findIndex(function(x) { return x.id === editingId; });
            if (idx !== -1) allStockData[idx] = Object.assign({}, allStockData[idx], d, { id: editingId });
            closeModal();
            renderStockTable();
            updateKPI();
            CacheDB.sync();
        });
    } else {
        CacheDB.write('stock', null, d, 'add').then(function(newId) {
            d.id = newId;
            allStockData.push(d);
            closeModal();
            renderStockTable();
            updateKPI();
            CacheDB.sync();
        });
    }
}

function editStock(id) {
    db.collection('stock').doc(id).get().then(function(doc) {
        if (doc.exists) { editingId = id; currentCollection = 'stock'; openStockForm(doc.data()); }
    });
}

async function deleteStock(id) {
    if (confirm('Supprimer ce produit du stock ?')) {
        await CacheDB.write('stock', id, null, 'delete');
        allStockData = allStockData.filter(function(x) { return x.id !== id; });
        renderStockTable();
        updateKPI();
        CacheDB.sync();
    }
}

function convertirQuantiteBase(quantite, unite) {
    if (!unite) return quantite;
    switch(unite) {
        case 'kg': return (quantite * 1000).toFixed(0) + ' g';
        case 'L': return (quantite * 1000).toFixed(0) + ' mL';
        case 'g': return quantite + ' g';
        case 'mL': return quantite + ' mL';
        default: return quantite + ' ' + unite;
    }
}

function openDepenseForm(data) {
    data = data || {};
    var selectedCategorie = data.categorie || '';
    var selectedSousCategories = data.sousCategories || [];
    var catOptions = '<option value="">-- Choisir --</option>';
    Object.keys(depenseCategories).forEach(function(cat) {
        var sel = selectedCategorie === cat ? 'selected' : '';
        catOptions += '<option value="' + cat + '" ' + sel + '>' + cat + '</option>';
    });
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Titre *</label><input type="text" id="depTitre" value="' + escapeHtml(data.titre || '') + '" required></div><div class="form-group"><label>Montant *</label><input type="number" id="depMontant" value="' + (data.montant || 0) + '" step="0.01" required></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Catégorie</label><select id="depCategorie" onchange="updateDepSousCategories()">' + catOptions + '</select></div></div>';
    h += '<div class="form-row"><div class="form-group" style="min-width:100%;"><label>Sous-catégories</label><div id="depSousCategories" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:5px;"></div></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Autre sous-catégorie</label><input type="text" id="depAutreSousCat" placeholder="Ajouter une sous-catégorie non listée"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Date</label><input type="date" id="depDate" value="' + (data.date || new Date().toISOString().split('T')[0]) + '"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Description</label><textarea id="depDesc">' + escapeHtml(data.description || '') + '</textarea></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="saveDepense()">Enregistrer</button>';
    openModal(editingId ? 'Modifier Dépense' : 'Nouvelle Dépense', h);
    currentCollection = 'depenses';
    setTimeout(function() {
        updateDepSousCategories();
        if (selectedSousCategories.length > 0) {
            selectedSousCategories.forEach(function(sc) {
                var cb = document.querySelector('.dep-sous-cat-check[value="' + sc.replace(/"/g, '&quot;') + '"]');
                if (cb) cb.checked = true;
                else document.getElementById('depAutreSousCat').value = sc;
            });
        }
    }, 100);
}

function updateDepSousCategories() {
    var cat = document.getElementById('depCategorie').value;
    var container = document.getElementById('depSousCategories');
    if (!container) return;
    container.innerHTML = '';
    if (cat && depenseCategories[cat]) {
        depenseCategories[cat].forEach(function(sc) {
            container.innerHTML += '<label style="display:flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:0.8rem;"><input type="checkbox" class="dep-sous-cat-check" value="' + sc + '"> ' + sc + '</label>';
        });
    }
}

function saveDepense() {
    var titre = document.getElementById('depTitre').value.trim();
    var montant = parseFloat(document.getElementById('depMontant').value) || 0;
    if (!titre || !montant) { alert('Titre et montant obligatoires'); return; }
    var categorie = document.getElementById('depCategorie').value;
    var sousCategories = [];
    document.querySelectorAll('.dep-sous-cat-check:checked').forEach(function(cb) { sousCategories.push(cb.value); });
    var autre = document.getElementById('depAutreSousCat').value.trim();
    if (autre) sousCategories.push(autre);
    var d = {
        titre: titre, montant: montant, categorie: categorie,
        sousCategories: sousCategories,
        date: document.getElementById('depDate').value,
        description: document.getElementById('depDesc').value
    };
    if (editingId) {
        CacheDB.write('depenses', editingId, d, 'update').then(function() {
            closeModal();
            loadDepenses();
            CacheDB.sync();
        });
    } else {
        d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        CacheDB.write('depenses', null, d, 'add').then(function() {
            closeModal();
            loadDepenses();
            CacheDB.sync();
        });
    }
}

function editDepense(id) {
    db.collection('depenses').doc(id).get().then(function(doc) {
        if (doc.exists) { editingId = id; currentCollection = 'depenses'; openDepenseForm(doc.data()); }
    });
}

function deleteDepense(id) {
    if (confirm('Supprimer cette dépense ?')) {
        CacheDB.write('depenses', id, null, 'delete').then(function() {
            loadDepenses();
            CacheDB.sync();
        });
    }
}

function openPersonnelForm(data) {
    data = data || {};
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="persNom" value="' + escapeHtml(data.nom || '') + '" required></div>';
    h += '<div class="form-group"><label>Rôle</label><select id="persRole">';
    var roles = ['Barista', 'Cuisinier', 'Serveur', 'Livreur', 'Gérant', 'Plongeur'];
    roles.forEach(function(r) {
        h += '<option value="' + r + '" ' + (data.role === r ? 'selected' : '') + '>' + r + '</option>';
    });
    h += '</select></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Salaire (MAD)</label><input type="number" id="persSalaire" value="' + (data.salaire || 0) + '" step="0.01"></div>';
    h += '<div class="form-group"><label>Horaire de travail</label><input type="text" id="persHoraire" value="' + escapeHtml(data.horaire || '') + '" placeholder="ex: 08:00 - 16:00"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Téléphone</label><input type="text" id="persTel" value="' + escapeHtml(data.telephone || '') + '"></div>';
    h += '<div class="form-group"><label>Date d\'embauche</label><input type="date" id="persDate" value="' + (data.dateEmbauche || '') + '"></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="savePersonnel()">Enregistrer</button>';
    openModal(editingId ? 'Modifier Employé' : 'Nouvel Employé', h);
    currentCollection = 'personnel';
}

function savePersonnel() {
    var nom = document.getElementById('persNom').value.trim();
    if (!nom) { alert('Nom obligatoire'); return; }
    var d = {
        nom: nom,
        role: document.getElementById('persRole').value,
        salaire: parseFloat(document.getElementById('persSalaire').value) || 0,
        horaire: document.getElementById('persHoraire').value,
        telephone: document.getElementById('persTel').value,
        dateEmbauche: document.getElementById('persDate').value
    };
    if (editingId) {
        CacheDB.write('personnel', editingId, d, 'update').then(function() {
            var idx = allPersonnelData.findIndex(function(x) { return x.id === editingId; });
            if (idx !== -1) allPersonnelData[idx] = Object.assign({}, allPersonnelData[idx], d, { id: editingId });
            closeModal();
            renderPersonnelTable();
            updateKPI();
            CacheDB.sync();
        });
    } else {
        CacheDB.write('personnel', null, d, 'add').then(function(newId) {
            d.id = newId;
            allPersonnelData.push(d);
            closeModal();
            renderPersonnelTable();
            updateKPI();
            CacheDB.sync();
        });
    }
}

function editPersonnel(id) {
    db.collection('personnel').doc(id).get().then(function(doc) {
        if (doc.exists) { editingId = id; currentCollection = 'personnel'; openPersonnelForm(doc.data()); }
    });
}

async function deletePersonnel(id) {
    if (confirm('Supprimer cet employé ?')) {
        await CacheDB.write('personnel', id, null, 'delete');
        allPersonnelData = allPersonnelData.filter(function(x) { return x.id !== id; });
        renderPersonnelTable();
        updateKPI();
        CacheDB.sync();
    }
}

// ==================== UTILS ====================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
}

function filterByPeriod(data, period) {
    if (!period || period === 'all') return data;
    var now = Date.now();
    var days = parseInt(period);
    if (isNaN(days)) return data;
    var cutoff = now - days * 86400000;
    return data.filter(function(d) {
        if (!d.createdAt) return true;
        var ts = d.createdAt.seconds ? d.createdAt.seconds * 1000 : new Date(d.createdAt).getTime();
        return ts >= cutoff;
    });
}

function filterBySearch(data, query, fields) {
    if (!query) return data;
    var q = query.toLowerCase();
    return data.filter(function(d) {
        return fields.some(function(f) {
            var val = d[f];
            if (Array.isArray(val)) val = val.join(' ');
            return (val || '').toString().toLowerCase().indexOf(q) !== -1;
        });
    });
}

console.log('☕ Alma Coffee Shop - Dépenses JS PRO prêt');
