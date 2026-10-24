// ==================== ADMIN.JS - MIXMAX MINIMARKET (COMPLET CORRIGÉ) ====================
// Toutes les variables globales utilisent window. pour compatibilité
// ✅ 🆕 Alertes intelligentes sur le dashboard (Stock / Expiration / Prévisions ventes)
// 🎨 Dashboard minimaliste — UNE SEULE COULEUR D'ACCENT (#2563EB), aligné sur le POS
// 📱 100% responsive
// 🆕 📅 Calendrier professionnel intégré (météo 7j + fêtes marocaines + événements)

// ==================== VARIABLES GLOBALES ====================
window.editingId = window.editingId || null;
window.currentCollection = window.currentCollection || '';
window.selectedCategoryFilter = window.selectedCategoryFilter || '';
window.sortOrders = window.sortOrders || {};
window.clientSearchQuery = window.clientSearchQuery || '';
window.pendingUsersData = window.pendingUsersData || [];

window.allCategoriesData = window.allCategoriesData || [];
window.allProductsData = window.allProductsData || [];
window.allClientsData = window.allClientsData || [];
window.allFournisseursData = window.allFournisseursData || [];
window.allDepensesData = window.allDepensesData || [];
window.allCommandesData = window.allCommandesData || [];
window.allVentesData = window.allVentesData || [];
window.allCreditsData = window.allCreditsData || [];
window.allUsersData = window.allUsersData || [];

window.currentPages = window.currentPages || {
categories: 1, products: 1, clients: 1, fournisseurs: 1,
depenses: 1, commandes: 1, ventes: 1, credits: 1, users: 1
};
window.itemsPerPage = window.itemsPerPage || 15;

window.ventesPeriod = window.ventesPeriod || 'all';
window.ventesSearch = window.ventesSearch || '';
window.creditsPeriod = window.creditsPeriod || 'all';
window.creditsSearch = window.creditsSearch || '';
window.commandesPeriod = window.commandesPeriod || 'all';
window.commandesSearch = window.commandesSearch || '';
window.usersSearchQuery = window.usersSearchQuery || '';

window.fournisseurCategoriesList = ['Alimentaire', 'Boissons', 'Emballage', 'Entretien', 'Viandes', 'Légumes', 'Sauces', 'Autre'];
window.allStockData = window.allStockData || [];
window.editCategoryData = window.editCategoryData || null;
window.filteredVentes = window.filteredVentes || null;
window.filteredCredits = window.filteredCredits || null;
window.filteredCommandes = window.filteredCommandes || null;
window.filteredUsers = window.filteredUsers || null;

window.allQrCodesData = window.allQrCodesData || [];
window.qrSearchQuery = window.qrSearchQuery || '';

// ==================== FONCTIONS UTILITAIRES ====================
function escapeHtml(str) {
if (str === null || str === undefined) return '';
if (typeof str !== 'string') str = String(str);
return str.replace(/[&<>"']/g, function(m) {
if (m === '&') return '&amp;';
if (m === '<') return '&lt;';
if (m === '>') return '&gt;';
if (m === '"') return '&quot;';
if (m === "'") return '&#39;';
return m;
});
}
window.escapeHtml = escapeHtml;

function toDate(val) {
if (!val) return null;
if (val.toDate && typeof val.toDate === 'function') return val.toDate();
if (val.seconds) return new Date(val.seconds * 1000);
if (typeof val === 'string') return new Date(val);
if (val instanceof Date) return val;
return null;
}

// ==================== 🎨 STYLE DASHBOARD PRO MINIMALISTE ====================
// Une seule couleur d'accent : #2563EB (bleu POS)
// Palette : blanc, gris clair (#F7F8FA, #F8FAFC, #EAECEF), texte (#1A1D1F, #6F767E)
function injectAdminStyles() {
    var styleId = 'admin-dashboard-pro';
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* ============================================================ */
        /* 🎨 DASHBOARD PRO — UNE SEULE COULEUR D'ACCENT (bleu #2563EB) */
        /* Design aligné sur le POS (cartes blanches, bordures #EAECEF) */
        /* ============================================================ */

        #dashboardPage {
            background: #F7F8FA !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            color: #1A1D1F;
        }

        /* === Bandeau de bienvenue (sobre, sans multi-couleurs) === */
        .dash-welcome {
            background: #FFFFFF;
            border-radius: 14px;
            padding: 22px 24px;
            margin-bottom: 18px;
            border: 1px solid #EAECEF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }
        .dash-welcome h1 {
            font-size: 1.35rem;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: #1A1D1F;
            margin: 0 0 4px 0;
            line-height: 1.2;
        }
        .dash-welcome p {
            margin: 0;
            font-size: 0.88rem;
            color: #6F767E;
            font-weight: 500;
        }
        .dash-welcome-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            background: #EFF6FF;
            color: #2563EB;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 700;
            white-space: nowrap;
            border: 1px solid #BFDBFE;
        }
        .dash-welcome-badge i { font-size: 0.75rem; }

        /* === KPI Cards — cartes blanches épurées (style POS) === */
        .dash-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 18px;
        }
        .dash-kpi {
            background: #FFFFFF;
            border: 1px solid #EAECEF;
            border-radius: 14px;
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            transition: all 0.2s ease;
        }
        .dash-kpi:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .dash-kpi-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.05rem;
            flex-shrink: 0;
            background: #EFF6FF;
            color: #2563EB;
        }
        .dash-kpi-label {
            font-size: 0.72rem;
            font-weight: 700;
            color: #6F767E;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin: 0;
        }
        .dash-kpi-value {
            font-size: 1.4rem;
            font-weight: 800;
            color: #1A1D1F;
            letter-spacing: -0.5px;
            line-height: 1.1;
            display: block;
            margin-top: 2px;
        }

        /* === Alertes intelligentes — même style POS === */
        .smart-alert-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 14px;
            margin-bottom: 18px;
        }
        .smart-alert-card {
            background: #FFFFFF;
            border-radius: 14px;
            padding: 18px;
            border: 1px solid #EAECEF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            transition: all 0.2s ease;
        }
        .smart-alert-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            transform: translateY(-2px);
        }
        .smart-alert-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }
        .smart-alert-header h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #1A1D1F;
            letter-spacing: -0.2px;
        }
        .smart-alert-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: #EFF6FF;
            color: #2563EB;
        }
        .smart-alert-icon i { font-size: 1rem; }

        .smart-alert-badges {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }
        .smart-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 700;
            white-space: nowrap;
            border: 1px solid #EAECEF;
            background: #F8FAFC;
            color: #64748B;
        }
        /* Seule exception de couleur : rouge discret pour alerte critique */
        .smart-badge.red { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
        .smart-badge.orange { background: #FFFBEB; color: #92400E; border-color: #FDE68A; }
        .smart-badge.yellow { background: #FEFCE8; color: #713F12; border-color: #FDE68A; }

        .smart-alert-summary {
            font-size: 0.82rem;
            color: #6F767E;
            line-height: 1.5;
            font-weight: 500;
        }
        .smart-alert-summary strong { color: #1A1D1F; font-weight: 700; }

        .smart-forecast-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 4px;
        }
        .smart-forecast-item {
            background: #F7F8FA;
            border-radius: 10px;
            padding: 10px 12px;
            border: 1px solid #EAECEF;
        }
        .smart-forecast-item .label {
            display: block;
            font-size: 0.68rem;
            color: #6F767E;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 3px;
        }
        .smart-forecast-item .value {
            display: block;
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: #1A1D1F;
        }

        /* === Sections (Accès rapide / Inscriptions) === */
        .dash-section {
            background: #FFFFFF;
            border-radius: 14px;
            border: 1px solid #EAECEF;
            padding: 20px;
            margin-bottom: 18px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .dash-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .dash-section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1rem;
            font-weight: 800;
            color: #1A1D1F;
            letter-spacing: -0.3px;
            margin: 0;
        }
        .dash-section-title i {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #EFF6FF;
            color: #2563EB;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
        }
        .dash-section-subtitle {
            font-size: 0.8rem;
            color: #6F767E;
            font-weight: 500;
            margin-top: 2px;
        }
        .dash-btn-refresh {
            background: #F8FAFC;
            color: #6F767E;
            border: 1px solid #EAECEF;
            border-radius: 8px;
            padding: 7px 14px;
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .dash-btn-refresh:hover {
            background: #2563EB;
            color: #fff;
            border-color: #2563EB;
            transform: translateY(-1px);
        }

        /* === Accès rapide — tuiles épurées (style POS) === */
        .quick-access-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
        }
        .qa-tile {
            cursor: pointer;
            background: #FFFFFF;
            border: 1px solid #EAECEF;
            border-radius: 12px;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-align: center;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .qa-tile:hover {
            transform: translateY(-3px);
            border-color: #BFDBFE;
            box-shadow: 0 4px 12px rgba(37,99,235,0.08);
        }
        .qa-tile-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            flex-shrink: 0;
            background: #EFF6FF;
            color: #2563EB;
            transition: all 0.2s ease;
        }
        .qa-tile:hover .qa-tile-icon {
            background: #2563EB;
            color: #FFFFFF;
        }
        .qa-tile-label {
            font-weight: 700;
            font-size: 0.82rem;
            color: #1A1D1F;
            line-height: 1.2;
        }
        .qa-tile-desc {
            font-size: 0.68rem;
            color: #6F767E;
            font-weight: 500;
            line-height: 1.3;
        }

        /* === Table Inscriptions en attente — style POS === */
        #dashboardPage .table-container {
            background: #FFFFFF;
            border-radius: 10px;
            overflow-x: auto;
            border: 1px solid #EAECEF;
        }
        #dashboardPage .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }
        #dashboardPage .data-table thead th {
            background: #F8FAFC !important;
            color: #64748B !important;
            font-size: 0.7rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            font-weight: 700 !important;
            padding: 12px 14px !important;
            border-bottom: 1.5px solid #EAECEF !important;
            text-align: left;
        }
        #dashboardPage .data-table tbody td {
            padding: 12px 14px !important;
            font-size: 0.85rem !important;
            color: #1A1D1F !important;
            border-bottom: 1px solid #F1F5F9 !important;
            vertical-align: middle !important;
        }
        #dashboardPage .data-table tbody tr:last-child td {
            border-bottom: none !important;
        }
        #dashboardPage .data-table tbody tr:hover td {
            background: #FAFBFC !important;
        }

        /* === Boutons actions de la table (Accepter / Refuser) === */
        #dashboardPage .btn-add {
            padding: 6px 14px !important;
            border-radius: 8px !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            background: #2563EB !important;
            color: #FFFFFF !important;
            border: none !important;
            cursor: pointer !important;
            box-shadow: 0 1px 3px rgba(37,99,235,0.2) !important;
            transition: all 0.2s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-family: inherit !important;
        }
        #dashboardPage .btn-add:hover {
            background: #1D4ED8 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 10px rgba(37,99,235,0.3) !important;
        }
        #dashboardPage .btn-delete {
            padding: 6px 14px !important;
            border-radius: 8px !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            background: #F8FAFC !important;
            color: #6F767E !important;
            border: 1px solid #EAECEF !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-family: inherit !important;
        }
        #dashboardPage .btn-delete:hover {
            background: #1A1D1F !important;
            color: #FFFFFF !important;
            border-color: #1A1D1F !important;
            transform: translateY(-1px) !important;
        }

        /* === Statut role (badge gris clair) === */
        #dashboardPage .status-warning {
            background: #F8FAFC !important;
            color: #6F767E !important;
            padding: 3px 10px !important;
            border-radius: 6px !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            border: 1px solid #EAECEF !important;
            display: inline-block !important;
            text-transform: capitalize !important;
        }

        /* === Animations (sobres) === */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .dash-welcome, .dash-kpi, .smart-alert-card, .dash-section {
            animation: fadeUp 0.35s ease both;
        }
        .dash-kpi:nth-child(1) { animation-delay: 0.03s; }
        .dash-kpi:nth-child(2) { animation-delay: 0.06s; }
        .dash-kpi:nth-child(3) { animation-delay: 0.09s; }
        .dash-kpi:nth-child(4) { animation-delay: 0.12s; }
        .dash-kpi:nth-child(5) { animation-delay: 0.15s; }
        .smart-alert-card:nth-child(1) { animation-delay: 0.18s; }
        .smart-alert-card:nth-child(2) { animation-delay: 0.21s; }
        .smart-alert-card:nth-child(3) { animation-delay: 0.24s; }
        .dash-section { animation-delay: 0.27s; }

        /* ============================================================ */
        /* 📱 RESPONSIVE                                                 */
        /* ============================================================ */

        @media (max-width: 1024px) {
            .dash-welcome { padding: 20px; }
            .dash-welcome h1 { font-size: 1.2rem; }
            .dash-kpi-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
            .quick-access-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        }

        @media (max-width: 768px) {
            #dashboardPage { padding: 0 2px; }

            .dash-welcome {
                padding: 16px;
                border-radius: 12px;
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .dash-welcome h1 { font-size: 1.1rem; }
            .dash-welcome p { font-size: 0.8rem; }
            .dash-welcome-badge { font-size: 0.72rem; padding: 6px 12px; }

            .dash-kpi-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .dash-kpi { padding: 14px; gap: 8px; }
            .dash-kpi-icon { width: 34px; height: 34px; font-size: 0.9rem; }
            .dash-kpi-label { font-size: 0.65rem; }
            .dash-kpi-value { font-size: 1.1rem; }

            .smart-alert-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            .smart-alert-card { padding: 14px; }
            .smart-alert-header h4 { font-size: 0.88rem; }
            .smart-alert-icon { width: 32px; height: 32px; }
            .smart-alert-icon i { font-size: 0.9rem; }
            .smart-alert-summary { font-size: 0.75rem; }

            .dash-section { padding: 14px; }
            .dash-section-title { font-size: 0.92rem; }
            .dash-section-title i { width: 28px; height: 28px; font-size: 0.8rem; }

            .quick-access-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            .qa-tile { padding: 12px 6px; gap: 6px; border-radius: 10px; }
            .qa-tile-icon { width: 38px; height: 38px; font-size: 1rem; border-radius: 9px; }
            .qa-tile-label { font-size: 0.72rem; }
            .qa-tile-desc { display: none; }

            #dashboardPage .data-table thead th,
            #dashboardPage .data-table tbody td {
                padding: 10px 10px !important;
                font-size: 0.75rem !important;
            }
            #dashboardPage .btn-add,
            #dashboardPage .btn-delete {
                padding: 5px 10px !important;
                font-size: 0.68rem !important;
            }
        }

        @media (max-width: 480px) {
            .dash-welcome h1 { font-size: 1rem; }
            .dash-kpi-grid { gap: 8px; }
            .dash-kpi { padding: 12px; }
            .dash-kpi-icon { width: 30px; height: 30px; font-size: 0.82rem; }
            .dash-kpi-label { font-size: 0.6rem; }
            .dash-kpi-value { font-size: 1rem; }

            .quick-access-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
            }
            .qa-tile { padding: 10px 6px; }
            .qa-tile-icon { width: 34px; height: 34px; font-size: 0.9rem; }
            .qa-tile-label { font-size: 0.68rem; }

            .smart-forecast-grid { grid-template-columns: 1fr; }

            #dashboardPage .data-table thead th,
            #dashboardPage .data-table tbody td {
                padding: 8px 8px !important;
                font-size: 0.7rem !important;
            }
        }

        @media (min-width: 1600px) {
            .dash-kpi-grid { grid-template-columns: repeat(5, 1fr); }
            .quick-access-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }

        /* ============================================================ */
        /* 📅 CALENDRIER + MÉTÉO + ÉVÉNEMENTS                            */
        /* ============================================================ */

        .dc-overlay {
            position: fixed; inset: 0; background: rgba(15,23,42,0.65);
            backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
            padding: 20px; overflow-y: auto; animation: dcFadeIn 0.2s ease;
        }
        @keyframes dcFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .dc-modal {
            background: #FFFFFF; border-radius: 20px; width: 100%; max-width: 900px;
            max-height: 92vh; display: flex; flex-direction: column;
            box-shadow: 0 24px 64px rgba(0,0,0,0.25); overflow: hidden;
            animation: dcSlideUp 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes dcSlideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .dc-header {
            padding: 20px 28px; display: flex; justify-content: space-between;
            align-items: center; background: linear-gradient(135deg, #EFF6FF, #FFFFFF);
            border-bottom: 1px solid #E2E8F0; flex-shrink: 0;
        }
        .dc-header h3 {
            font-size: 20px; font-weight: 800; color: #0F172A; margin: 0;
            display: flex; align-items: center; gap: 12px; letter-spacing: -0.3px;
        }
        .dc-header h3 i {
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            color: white; padding: 10px; border-radius: 12px; font-size: 18px;
            box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        .dc-close {
            width: 40px; height: 40px; border-radius: 50%; border: none;
            background: #F1F5F9; color: #64748B; font-size: 18px; cursor: pointer;
            transition: all 0.2s ease;
        }
        .dc-close:hover { background: #E2E8F0; color: #0F172A; transform: rotate(90deg); }

        .dc-body {
            flex: 1; overflow-y: auto; padding: 20px 28px;
            background: #F8FAFC; display: flex; flex-direction: column; gap: 20px;
        }

        .dc-weather {
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            border-radius: 16px; padding: 18px 20px; color: #FFFFFF;
            box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .dc-weather-title {
            font-size: 12px; font-weight: 800; letter-spacing: 1px;
            text-transform: uppercase; opacity: 0.9; margin-bottom: 12px;
            display: flex; align-items: center; gap: 8px;
        }
        .dc-weather-days {
            display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
        }
        .dc-weather-day {
            text-align: center; padding: 10px 6px; border-radius: 10px;
            background: rgba(255,255,255,0.12); transition: all 0.2s ease;
        }
        .dc-weather-day:hover { background: rgba(255,255,255,0.22); transform: translateY(-2px); }
        .dc-weather-day .dname {
            font-size: 10px; font-weight: 700; opacity: 0.85; text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .dc-weather-day .dicon { font-size: 22px; margin: 4px 0; }
        .dc-weather-day .dtemp { font-size: 13px; font-weight: 800; }
        .dc-weather-day .dtemp-min { font-size: 10px; opacity: 0.75; font-weight: 600; }

        .dc-calendar-section {
            background: #FFFFFF; border-radius: 16px; padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;
        }
        .dc-cal-nav {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 16px;
        }
        .dc-cal-title {
            font-size: 18px; font-weight: 800; color: #0F172A;
            text-transform: capitalize;
        }
        .dc-cal-arrows { display: flex; gap: 6px; }
        .dc-cal-arrows button {
            width: 36px; height: 36px; border-radius: 10px; border: none;
            background: #EFF6FF; color: #2563EB; cursor: pointer;
            transition: all 0.2s ease; font-size: 14px;
        }
        .dc-cal-arrows button:hover { background: #2563EB; color: white; }

        .dc-cal-grid {
            display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
        }
        .dc-cal-dow {
            text-align: center; font-size: 11px; font-weight: 800;
            color: #64748B; padding: 8px 0; text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .dc-cal-day {
            aspect-ratio: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; border-radius: 10px;
            cursor: pointer; transition: all 0.15s ease; font-size: 14px;
            font-weight: 600; color: #0F172A; position: relative;
            border: 1.5px solid transparent; user-select: none;
        }
        .dc-cal-day:hover { background: #EFF6FF; border-color: #BFDBFE; }
        .dc-cal-day.other-month { color: #CBD5E1; font-weight: 500; }
        .dc-cal-day.today {
            background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: white;
            box-shadow: 0 4px 12px rgba(37,99,235,0.35);
        }
        .dc-cal-day.selected {
            background: #DBEAFE; border-color: #2563EB; color: #1D4ED8;
        }
        .dc-cal-day.in-range {
            background: #BFDBFE; color: #1E40AF;
        }
        .dc-cal-day.holiday::after {
            content: ''; position: absolute; bottom: 4px; left: 50%;
            transform: translateX(-50%); width: 5px; height: 5px;
            border-radius: 50%; background: #EF4444;
        }
        .dc-cal-day.has-event::before {
            content: ''; position: absolute; top: 4px; right: 4px;
            width: 6px; height: 6px; border-radius: 50%; background: #10B981;
        }
        .dc-cal-day.today.holiday::after { background: #FCA5A5; }

        .dc-events-section {
            background: #FFFFFF; border-radius: 16px; padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;
        }
        .dc-events-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 14px; padding-bottom: 12px;
            border-bottom: 2px solid #F1F5F9;
        }
        .dc-events-header h4 {
            font-size: 15px; font-weight: 800; color: #0F172A; margin: 0;
            display: flex; align-items: center; gap: 8px;
        }
        .dc-events-header h4 i { color: #8B5CF6; }
        .dc-add-btn {
            background: linear-gradient(135deg, #10B981, #059669);
            color: white; border: none; border-radius: 10px; padding: 8px 16px;
            font-size: 13px; font-weight: 700; cursor: pointer;
            display: flex; align-items: center; gap: 6px;
            box-shadow: 0 2px 8px rgba(16,185,129,0.3); transition: all 0.2s ease;
        }
        .dc-add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16,185,129,0.4); }

        .dc-events-list {
            display: flex; flex-direction: column; gap: 8px;
            max-height: 260px; overflow-y: auto;
        }
        .dc-event-item {
            display: flex; align-items: center; gap: 12px; padding: 12px 14px;
            background: #F8FAFC; border-radius: 12px;
            border-left: 4px solid #8B5CF6; transition: all 0.2s ease;
        }
        .dc-event-item:hover { background: #F1F5F9; transform: translateX(4px); }
        .dc-event-item.holiday { border-left-color: #EF4444; background: #FEF2F2; }
        .dc-event-item.holiday:hover { background: #FEE2E2; }
        .dc-event-icon { font-size: 22px; flex-shrink: 0; }
        .dc-event-content { flex: 1; min-width: 0; }
        .dc-event-title {
            font-size: 14px; font-weight: 700; color: #0F172A;
            margin: 0 0 2px 0; overflow: hidden; text-overflow: ellipsis;
            white-space: nowrap;
        }
        .dc-event-date {
            font-size: 11px; color: #64748B; font-weight: 600;
            display: flex; align-items: center; gap: 4px;
        }
        .dc-event-delete {
            background: #FEF2F2; color: #EF4444; border: none;
            border-radius: 8px; padding: 6px 10px; cursor: pointer;
            font-size: 12px; transition: all 0.2s ease;
        }
        .dc-event-delete:hover { background: #EF4444; color: white; }
        .dc-empty-events {
            text-align: center; padding: 30px 20px; color: #94A3B8;
            font-size: 13px;
        }
        .dc-empty-events i { font-size: 32px; color: #CBD5E1; margin-bottom: 8px; display: block; }

        .dc-form-overlay {
            position: absolute; inset: 0; background: rgba(15,23,42,0.6);
            z-index: 10; display: flex; align-items: center; justify-content: center;
            padding: 20px; border-radius: 20px;
        }
        .dc-form {
            background: white; border-radius: 16px; padding: 24px;
            width: 100%; max-width: 440px;
            box-shadow: 0 24px 64px rgba(0,0,0,0.25);
            animation: dcSlideUp 0.3s ease;
        }
        .dc-form h4 {
            font-size: 17px; font-weight: 800; color: #0F172A;
            margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;
        }
        .dc-form h4 i {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: white; padding: 8px; border-radius: 10px; font-size: 14px;
        }
        .dc-form-group { margin-bottom: 12px; }
        .dc-form-label {
            font-size: 11px; font-weight: 800; color: #64748B;
            text-transform: uppercase; letter-spacing: 0.5px;
            display: block; margin-bottom: 6px;
        }
        .dc-form-input, .dc-form-textarea, .dc-form-select {
            width: 100%; padding: 10px 12px; border: 1.5px solid #E2E8F0;
            border-radius: 10px; font-size: 14px; font-family: inherit;
            color: #0F172A; outline: none; transition: all 0.2s ease;
            box-sizing: border-box;
        }
        .dc-form-input:focus, .dc-form-textarea:focus, .dc-form-select:focus {
            border-color: #8B5CF6; box-shadow: 0 0 0 4px rgba(139,92,246,0.1);
        }
        .dc-form-textarea { resize: vertical; min-height: 60px; }
        .dc-form-actions {
            display: flex; gap: 10px; justify-content: flex-end;
            margin-top: 18px;
        }
        .dc-form-btn-cancel {
            background: #F1F5F9; color: #64748B; border: none;
            border-radius: 10px; padding: 10px 20px; font-weight: 700;
            cursor: pointer; transition: all 0.2s ease; font-size: 13px;
        }
        .dc-form-btn-cancel:hover { background: #E2E8F0; }
        .dc-form-btn-save {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: white; border: none; border-radius: 10px;
            padding: 10px 20px; font-weight: 700; cursor: pointer;
            transition: all 0.2s ease; font-size: 13px;
            box-shadow: 0 2px 8px rgba(139,92,246,0.3);
        }
        .dc-form-btn-save:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(139,92,246,0.4); }

        @media (max-width: 640px) {
            .dc-modal { max-width: 100%; height: 100vh; max-height: 100vh; border-radius: 0; }
            .dc-weather-days { grid-template-columns: repeat(4, 1fr); }
            .dc-weather-day:nth-child(n+5) { display: none; }
            .dc-body { padding: 14px; }
            .dc-cal-dow { font-size: 9px; }
            .dc-cal-day { font-size: 12px; }
        }
    `;
    document.head.appendChild(style);
}




// ==================== 📅 CALENDRIER + MÉTÉO + ÉVÉNEMENTS ====================
const DC_WEATHER_LAT = 33.5731;
const DC_WEATHER_LON = -7.5898;
const DC_WEATHER_CITY = 'Casablanca';
const DC_COLLECTION = 'evenements_dashboard';

const DC_FETES_FIXES = [
    { month: 1, day: 1, name: 'Nouvel An', icon: '🎆' },
    { month: 1, day: 11, name: 'Manifeste de l\'Indépendance', icon: '🇲🇦' },
    { month: 5, day: 1, name: 'Fête du Travail', icon: '🛠️' },
    { month: 7, day: 30, name: 'Fête du Trône', icon: '👑' },
    { month: 8, day: 14, name: 'Allégeance Oued Eddahab', icon: '🇲🇦' },
    { month: 8, day: 20, name: 'Révolution du Roi et du Peuple', icon: '🎖️' },
    { month: 8, day: 21, name: 'Fête de la Jeunesse', icon: '🎉' },
    { month: 11, day: 6, name: 'Marche Verte', icon: '🟢' },
    { month: 11, day: 18, name: 'Fête de l\'Indépendance', icon: '🇲🇦' },
];

const DC_FETES_RELIGIEUSES = {
    2024: [
        { month: 3, day: 11, name: 'Aïd Al-Fitr', icon: '🌙' },
        { month: 6, day: 17, name: 'Aïd Al-Adha', icon: '🐑' },
        { month: 7, day: 8, name: '1er Moharram', icon: '🌙' },
        { month: 9, day: 16, name: 'Aïd Al-Mawlid', icon: '🌙' },
    ],
    2025: [
        { month: 3, day: 31, name: 'Aïd Al-Fitr', icon: '🌙' },
        { month: 6, day: 7, name: 'Aïd Al-Adha', icon: '🐑' },
        { month: 6, day: 27, name: '1er Moharram', icon: '🌙' },
        { month: 9, day: 5, name: 'Aïd Al-Mawlid', icon: '🌙' },
    ],
    2026: [
        { month: 3, day: 20, name: 'Aïd Al-Fitr', icon: '🌙' },
        { month: 5, day: 27, name: 'Aïd Al-Adha', icon: '🐑' },
        { month: 6, day: 16, name: '1er Moharram', icon: '🌙' },
        { month: 8, day: 25, name: 'Aïd Al-Mawlid', icon: '🌙' },
    ],
    2027: [
        { month: 3, day: 10, name: 'Aïd Al-Fitr', icon: '🌙' },
        { month: 5, day: 17, name: 'Aïd Al-Adha', icon: '🐑' },
        { month: 6, day: 5, name: '1er Moharram', icon: '🌙' },
        { month: 8, day: 14, name: 'Aïd Al-Mawlid', icon: '🌙' },
    ],
};

const DC_WMO_ICONS = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️',
    80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
};
const DC_WMO_NAMES = {
    0: 'Ciel dégagé', 1: 'Peu nuageux', 2: 'Partiellement nuageux', 3: 'Couvert',
    45: 'Brouillard', 48: 'Brouillard givrant',
    51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
    61: 'Pluie faible', 63: 'Pluie modérée', 65: 'Pluie forte',
    71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
    80: 'Averses faibles', 81: 'Averses modérées', 82: 'Averses violentes',
    95: 'Orage', 96: 'Orage avec grêle', 99: 'Orage violent',
};

window.dcState = window.dcState || {
    currentDate: new Date(),
    selectedDates: [],
    events: [],
    weather: null,
};

function dcGetHolidaysForYear(year) {
    const list = DC_FETES_FIXES.map(f => ({ ...f, year, isHoliday: true }));
    if (DC_FETES_RELIGIEUSES[year]) {
        DC_FETES_RELIGIEUSES[year].forEach(f => list.push({ ...f, year, isHoliday: true }));
    }
    return list;
}

function dcGetHolidayForDate(year, month, day) {
    return dcGetHolidaysForYear(year).find(h => h.month === month && h.day === day);
}

function dcFormatDateKey(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dcGetEventsForDate(dateKey) {
    return window.dcState.events.filter(e => {
        if (e.date === dateKey) return true;
        if (e.endDate && dateKey >= e.date && dateKey <= e.endDate) return true;
        return false;
    });
}

async function dcFetchWeather() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${DC_WEATHER_LAT}&longitude=${DC_WEATHER_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Africa%2FCasablanca&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather API failed');
        const data = await res.json();
        return data.daily;
    } catch (e) {
        console.warn('Météo indisponible:', e);
        return null;
    }
}

function dcRenderWeather(daily, container) {
    if (!daily || !daily.time) {
        container.innerHTML = '<div style="opacity:0.7;font-size:12px;">🌍 Météo indisponible</div>';
        return;
    }
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    let html = '<div class="dc-weather-title"><i class="fas fa-map-marker-alt"></i> Météo · ' + DC_WEATHER_CITY + ' (7 jours)</div>';
    html += '<div class="dc-weather-days">';
    for (let i = 0; i < daily.time.length; i++) {
        const d = new Date(daily.time[i]);
        const dayName = days[d.getDay()];
        const code = daily.weather_code[i];
        const tmax = Math.round(daily.temperature_2m_max[i]);
        const tmin = Math.round(daily.temperature_2m_min[i]);
        const icon = DC_WMO_ICONS[code] || '🌡️';
        const label = DC_WMO_NAMES[code] || '';
        html += '<div class="dc-weather-day" title="' + label + '">';
        html += '<div class="dname">' + dayName + '</div>';
        html += '<div class="dicon">' + icon + '</div>';
        html += '<div class="dtemp">' + tmax + '°</div>';
        html += '<div class="dtemp-min">' + tmin + '°</div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
}

async function dcLoadEvents() {
    if (typeof db !== 'undefined' && db) {
        try {
            const snap = await db.collection(DC_COLLECTION).orderBy('date', 'asc').get();
            const events = [];
            snap.forEach(d => events.push({ id: d.id, ...d.data() }));
            localStorage.setItem('dc_events_cache', JSON.stringify(events));
            return events;
        } catch (e) {
            console.warn('Firestore events indisponible, fallback localStorage', e);
        }
    }
    try {
        return JSON.parse(localStorage.getItem('dc_events_cache') || '[]');
    } catch (e) { return []; }
}

async function dcSaveEvent(ev) {
    if (typeof db !== 'undefined' && db) {
        try {
            const ref = await db.collection(DC_COLLECTION).add(ev);
            return { id: ref.id, ...ev };
        } catch (e) {
            console.warn('Save event Firestore failed, fallback localStorage', e);
        }
    }
    const all = JSON.parse(localStorage.getItem('dc_events_cache') || '[]');
    ev.id = 'local_' + Date.now();
    all.push(ev);
    localStorage.setItem('dc_events_cache', JSON.stringify(all));
    return ev;
}

async function dcDeleteEvent(id) {
    if (typeof db !== 'undefined' && db && !id.startsWith('local_')) {
        try {
            await db.collection(DC_COLLECTION).doc(id).delete();
            return true;
        } catch (e) {
            console.warn('Delete event Firestore failed', e);
        }
    }
    const all = JSON.parse(localStorage.getItem('dc_events_cache') || '[]');
    localStorage.setItem('dc_events_cache', JSON.stringify(all.filter(e => e.id !== id)));
    return true;
}

function dcRenderCalendar() {
    const st = window.dcState;
    const y = st.currentDate.getFullYear();
    const m = st.currentDate.getMonth();
    const today = new Date();
    const todayKey = dcFormatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const prevLastDay = new Date(y, m, 0).getDate();

    const monthName = st.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    let html = '';
    html += '<div class="dc-cal-nav">';
    html += '<div class="dc-cal-title">' + monthName + '</div>';
    html += '<div class="dc-cal-arrows">';
    html += '<button onclick="dcNavMonth(-1)"><i class="fas fa-chevron-left"></i></button>';
    html += '<button onclick="dcNavToday()" title="Aujourd\'hui" style="width:auto;padding:0 12px;font-size:12px;font-weight:800;">Auj.</button>';
    html += '<button onclick="dcNavMonth(1)"><i class="fas fa-chevron-right"></i></button>';
    html += '</div></div>';

    html += '<div class="dc-cal-grid">';
    ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(dow => {
        html += '<div class="dc-cal-dow">' + dow + '</div>';
    });

    for (let i = startWeekday - 1; i >= 0; i--) {
        html += '<div class="dc-cal-day other-month">' + (prevLastDay - i) + '</div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dcFormatDateKey(y, m, d);
        const isToday = dateKey === todayKey;
        const isSelected = st.selectedDates.includes(dateKey);
        const isInRange = st.selectedDates.length === 2 &&
            dateKey >= st.selectedDates[0] && dateKey <= st.selectedDates[1];
        const holiday = dcGetHolidayForDate(y, m + 1, d);
        const hasEvent = dcGetEventsForDate(dateKey).length > 0;

        let cls = 'dc-cal-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';
        else if (isInRange) cls += ' in-range';
        if (holiday) cls += ' holiday';
        if (hasEvent) cls += ' has-event';

        let title = '';
        if (holiday) title = holiday.name;
        const evs = dcGetEventsForDate(dateKey);
        if (evs.length) title += (title ? ' · ' : '') + evs.map(e => e.title).join(', ');

        html += '<div class="' + cls + '" data-date="' + dateKey + '" onclick="dcToggleDate(\'' + dateKey + '\')" title="' + title + '">' + d + '</div>';
    }

    const totalCells = startWeekday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += '<div class="dc-cal-day other-month">' + i + '</div>';
    }
    html += '</div>';
    return html;
}

function dcRenderEventsList() {
    const st = window.dcState;
    const events = [];
    const y = st.currentDate.getFullYear();
    const m = st.currentDate.getMonth();

    dcGetHolidaysForYear(y).forEach(h => {
        if (h.month === m + 1) {
            events.push({
                isHoliday: true,
                title: h.name,
                icon: h.icon,
                dateKey: dcFormatDateKey(y, m, h.day),
                dateLabel: h.day + ' ' + st.currentDate.toLocaleDateString('fr-FR', { month: 'long' }),
            });
        }
    });

    st.events.forEach(e => {
        const parts = e.date.split('-');
        const ey = Number(parts[0]), em = Number(parts[1]);
        if (ey === y && (em - 1) === m) {
            events.push({
                id: e.id,
                isHoliday: false,
                title: e.title,
                icon: e.icon || '📌',
                dateKey: e.date,
                dateLabel: new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                endDate: e.endDate,
            });
        }
    });

    events.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    let html = '';
    if (events.length === 0) {
        html += '<div class="dc-empty-events"><i class="fas fa-calendar-day"></i>Aucun événement ce mois</div>';
    } else {
        events.forEach(ev => {
            html += '<div class="dc-event-item' + (ev.isHoliday ? ' holiday' : '') + '">';
            html += '<div class="dc-event-icon">' + ev.icon + '</div>';
            html += '<div class="dc-event-content">';
            html += '<p class="dc-event-title">' + escapeHtml(ev.title) + '</p>';
            html += '<div class="dc-event-date"><i class="fas fa-calendar"></i> ' + ev.dateLabel;
            if (ev.endDate && ev.endDate !== ev.dateKey) {
                html += ' → ' + new Date(ev.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            }
            html += '</div></div>';
            if (!ev.isHoliday && ev.id) {
                html += '<button class="dc-event-delete" onclick="dcDeleteEventHandler(\'' + ev.id + '\')" title="Supprimer"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
    }
    return html;
}

function dcRefresh() {
    const calContainer = document.getElementById('dcCalendarContainer');
    const eventsContainer = document.getElementById('dcEventsContainer');
    if (calContainer) calContainer.innerHTML = dcRenderCalendar();
    if (eventsContainer) eventsContainer.innerHTML = dcRenderEventsList();
}
window.dcRefresh = dcRefresh;

window.dcNavMonth = function (delta) {
    window.dcState.currentDate.setMonth(window.dcState.currentDate.getMonth() + delta);
    dcRefresh();
};

window.dcNavToday = function () {
    window.dcState.currentDate = new Date();
    dcRefresh();
};

window.dcToggleDate = function (dateKey) {
    const st = window.dcState;
    const idx = st.selectedDates.indexOf(dateKey);
    if (idx !== -1) {
        st.selectedDates.splice(idx, 1);
    } else {
        if (st.selectedDates.length >= 2) {
            st.selectedDates = [dateKey];
        } else {
            st.selectedDates.push(dateKey);
            st.selectedDates.sort();
        }
    }
    dcRefresh();
};

window.dcDeleteEventHandler = async function (id) {
    if (!confirm('Supprimer cet événement ?')) return;
    await dcDeleteEvent(id);
    window.dcState.events = window.dcState.events.filter(e => e.id !== id);
    dcRefresh();
};

window.dcOpenAddForm = function () {
    const overlay = document.getElementById('dcFormOverlay');
    if (overlay) return;

    let defaultDate = '';
    if (window.dcState.selectedDates.length > 0) defaultDate = window.dcState.selectedDates[0];
    else {
        const t = new Date();
        defaultDate = dcFormatDateKey(t.getFullYear(), t.getMonth(), t.getDate());
    }
    const endDate = window.dcState.selectedDates.length === 2 ? window.dcState.selectedDates[1] : '';

    const formHtml = `
    <div id="dcFormOverlay" class="dc-form-overlay" onclick="if(event.target.id==='dcFormOverlay')dcCloseForm()">
        <div class="dc-form" onclick="event.stopPropagation()">
            <h4><i class="fas fa-plus"></i> Nouvel événement</h4>
            <div class="dc-form-group">
                <label class="dc-form-label">Titre *</label>
                <input type="text" id="dcEvTitle" class="dc-form-input" placeholder="Ex: Livraison fournisseur" maxlength="80">
            </div>
            <div class="dc-form-group">
                <label class="dc-form-label">Date début *</label>
                <input type="date" id="dcEvDate" class="dc-form-input" value="${defaultDate}">
            </div>
            <div class="dc-form-group">
                <label class="dc-form-label">Date fin (optionnel)</label>
                <input type="date" id="dcEvEndDate" class="dc-form-input" value="${endDate}">
            </div>
            <div class="dc-form-group">
                <label class="dc-form-label">Icône</label>
                <select id="dcEvIcon" class="dc-form-select">
                    <option value="📌">📌 Épingle</option>
                    <option value="🎉">🎉 Fête</option>
                    <option value="🚚">🚚 Livraison</option>
                    <option value="📦">📦 Stock</option>
                    <option value="💰">💰 Paiement</option>
                    <option value="📊">📊 Réunion</option>
                    <option value="⚠️">⚠️ Important</option>
                    <option value="🛒">🛒 Commande</option>
                    <option value="🎂">🎂 Anniversaire</option>
                    <option value="🏖️">🏖️ Congé</option>
                </select>
            </div>
            <div class="dc-form-group">
                <label class="dc-form-label">Description (optionnel)</label>
                <textarea id="dcEvDesc" class="dc-form-textarea" placeholder="Détails..." maxlength="300"></textarea>
            </div>
            <div class="dc-form-actions">
                <button class="dc-form-btn-cancel" onclick="dcCloseForm()">Annuler</button>
                <button class="dc-form-btn-save" onclick="dcSaveFormHandler()"><i class="fas fa-check"></i> Enregistrer</button>
            </div>
        </div>
    </div>`;
    document.querySelector('.dc-modal').insertAdjacentHTML('beforeend', formHtml);
    setTimeout(() => document.getElementById('dcEvTitle').focus(), 100);
};

window.dcCloseForm = function () {
    const overlay = document.getElementById('dcFormOverlay');
    if (overlay) overlay.remove();
};

window.dcSaveFormHandler = async function () {
    const title = document.getElementById('dcEvTitle').value.trim();
    const date = document.getElementById('dcEvDate').value;
    const endDate = document.getElementById('dcEvEndDate').value;
    const icon = document.getElementById('dcEvIcon').value;
    const description = document.getElementById('dcEvDesc').value.trim();

    if (!title) { alert('Le titre est obligatoire'); return; }
    if (!date) { alert('La date de début est obligatoire'); return; }
    if (endDate && endDate < date) { alert('La date de fin doit être après la date de début'); return; }

    const ev = {
        title,
        date,
        endDate: endDate || null,
        icon,
        description,
        createdAt: new Date().toISOString(),
    };
    const saved = await dcSaveEvent(ev);
    window.dcState.events.push(saved);
    dcCloseForm();
    window.dcState.selectedDates = [];
    dcRefresh();
};

window.dcCloseCalendar = function () {
    const el = document.getElementById('dcOverlay');
    if (el) el.remove();
};

window.openDashboardCalendar = async function () {
    const old = document.getElementById('dcOverlay');
    if (old) old.remove();

    const html = `
    <div id="dcOverlay" class="dc-overlay" onclick="if(event.target.id==='dcOverlay')dcCloseCalendar()">
        <div class="dc-modal" onclick="event.stopPropagation()">
            <div class="dc-header">
                <h3><i class="fas fa-calendar-alt"></i> Calendrier & Événements</h3>
                <button class="dc-close" onclick="dcCloseCalendar()"><i class="fas fa-times"></i></button>
            </div>
            <div class="dc-body">
                <div class="dc-weather" id="dcWeatherContainer">
                    <div class="dc-weather-title"><i class="fas fa-spinner fa-spin"></i> Chargement météo...</div>
                </div>
                <div class="dc-calendar-section">
                    <div id="dcCalendarContainer"></div>
                </div>
                <div class="dc-events-section">
                    <div class="dc-events-header">
                        <h4><i class="fas fa-star"></i> Événements & fêtes du mois</h4>
                        <button class="dc-add-btn" onclick="dcOpenAddForm()"><i class="fas fa-plus"></i> Ajouter</button>
                    </div>
                    <div class="dc-events-list" id="dcEventsContainer"></div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    window.dcState.events = await dcLoadEvents();
    dcRefresh();

    const weather = await dcFetchWeather();
    window.dcState.weather = weather;
    const wc = document.getElementById('dcWeatherContainer');
    if (wc) dcRenderWeather(weather, wc);
};

console.log('📅 Dashboard Calendar intégré');
