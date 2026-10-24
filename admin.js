// ==================== ADMIN.JS - MIXMAX MINIMARKET (COMPLET CORRIGÉ) ====================
// Toutes les variables globales utilisent window. pour compatibilité
// ✅ 🆕 Alertes intelligentes sur le dashboard (Stock / Expiration / Prévisions ventes)
// 🎨 Dashboard minimaliste — UNE SEULE COULEUR D'ACCENT (#2563EB), aligné sur le POS
// 📱 100% responsive
// 🆕 📅 Calendrier PRO : ville + filtres période + fêtes préétablies + saisons
// 🆕 ➕ CRUD événements personnels (ajouter / modifier / supprimer)
// 🆕 ✏️ Événements par défaut modifiables/supprimables + heure + alarme

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
function injectAdminStyles() {
    var styleId = 'admin-dashboard-pro';
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        #dashboardPage { background: #F7F8FA !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; color: #1A1D1F; }
        .dash-welcome { background: #FFFFFF; border-radius: 14px; padding: 22px 24px; margin-bottom: 18px; border: 1px solid #EAECEF; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .dash-welcome h1 { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.4px; color: #1A1D1F; margin: 0 0 4px 0; line-height: 1.2; }
        .dash-welcome p { margin: 0; font-size: 0.88rem; color: #6F767E; font-weight: 500; }
        .dash-welcome-badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: #EFF6FF; color: #2563EB; border-radius: 999px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; border: 1px solid #BFDBFE; }
        .dash-welcome-badge i { font-size: 0.75rem; }
        .dash-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .dash-kpi { background: #FFFFFF; border: 1px solid #EAECEF; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.2s ease; }
        .dash-kpi:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .dash-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; background: #EFF6FF; color: #2563EB; }
        .dash-kpi-label { font-size: 0.72rem; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin: 0; }
        .dash-kpi-value { font-size: 1.4rem; font-weight: 800; color: #1A1D1F; letter-spacing: -0.5px; line-height: 1.1; display: block; margin-top: 2px; }
        .smart-alert-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .smart-alert-card { background: #FFFFFF; border-radius: 14px; padding: 18px; border: 1px solid #EAECEF; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.2s ease; }
        .smart-alert-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .smart-alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .smart-alert-header h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #1A1D1F; letter-spacing: -0.2px; }
        .smart-alert-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #EFF6FF; color: #2563EB; }
        .smart-alert-icon i { font-size: 1rem; }
        .smart-alert-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .smart-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; white-space: nowrap; border: 1px solid #EAECEF; background: #F8FAFC; color: #64748B; }
        .smart-badge.red { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
        .smart-badge.orange { background: #FFFBEB; color: #92400E; border-color: #FDE68A; }
        .smart-badge.yellow { background: #FEFCE8; color: #713F12; border-color: #FDE68A; }
        .smart-alert-summary { font-size: 0.82rem; color: #6F767E; line-height: 1.5; font-weight: 500; }
        .smart-alert-summary strong { color: #1A1D1F; font-weight: 700; }
        .smart-forecast-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
        .smart-forecast-item { background: #F7F8FA; border-radius: 10px; padding: 10px 12px; border: 1px solid #EAECEF; }
        .smart-forecast-item .label { display: block; font-size: 0.68rem; color: #6F767E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
        .smart-forecast-item .value { display: block; font-size: 1.15rem; font-weight: 800; letter-spacing: -0.4px; color: #1A1D1F; }
        .dash-section { background: #FFFFFF; border-radius: 14px; border: 1px solid #EAECEF; padding: 20px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .dash-section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .dash-section-title { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 800; color: #1A1D1F; letter-spacing: -0.3px; margin: 0; }
        .dash-section-title i { width: 32px; height: 32px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
        .dash-section-subtitle { font-size: 0.8rem; color: #6F767E; font-weight: 500; margin-top: 2px; }
        .dash-btn-refresh { background: #F8FAFC; color: #6F767E; border: 1px solid #EAECEF; border-radius: 8px; padding: 7px 14px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; font-family: inherit; }
        .dash-btn-refresh:hover { background: #2563EB; color: #fff; border-color: #2563EB; transform: translateY(-1px); }
        .quick-access-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        .qa-tile { cursor: pointer; background: #FFFFFF; border: 1px solid #EAECEF; border-radius: 12px; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .qa-tile:hover { transform: translateY(-3px); border-color: #BFDBFE; box-shadow: 0 4px 12px rgba(37,99,235,0.08); }
        .qa-tile-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; background: #EFF6FF; color: #2563EB; transition: all 0.2s ease; }
        .qa-tile:hover .qa-tile-icon { background: #2563EB; color: #FFFFFF; }
        .qa-tile-label { font-weight: 700; font-size: 0.82rem; color: #1A1D1F; line-height: 1.2; }
        .qa-tile-desc { font-size: 0.68rem; color: #6F767E; font-weight: 500; line-height: 1.3; }
        #dashboardPage .table-container { background: #FFFFFF; border-radius: 10px; overflow-x: auto; border: 1px solid #EAECEF; }
        #dashboardPage .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        #dashboardPage .data-table thead th { background: #F8FAFC !important; color: #64748B !important; font-size: 0.7rem !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; font-weight: 700 !important; padding: 12px 14px !important; border-bottom: 1.5px solid #EAECEF !important; text-align: left; }
        #dashboardPage .data-table tbody td { padding: 12px 14px !important; font-size: 0.85rem !important; color: #1A1D1F !important; border-bottom: 1px solid #F1F5F9 !important; vertical-align: middle !important; }
        #dashboardPage .data-table tbody tr:last-child td { border-bottom: none !important; }
        #dashboardPage .data-table tbody tr:hover td { background: #FAFBFC !important; }
        #dashboardPage .btn-add { padding: 6px 14px !important; border-radius: 8px !important; font-size: 0.75rem !important; font-weight: 700 !important; background: #2563EB !important; color: #FFFFFF !important; border: none !important; cursor: pointer !important; box-shadow: 0 1px 3px rgba(37,99,235,0.2) !important; transition: all 0.2s ease !important; display: inline-flex !important; align-items: center !important; gap: 5px !important; font-family: inherit !important; }
        #dashboardPage .btn-add:hover { background: #1D4ED8 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 10px rgba(37,99,235,0.3) !important; }
        #dashboardPage .btn-delete { padding: 6px 14px !important; border-radius: 8px !important; font-size: 0.75rem !important; font-weight: 700 !important; background: #F8FAFC !important; color: #6F767E !important; border: 1px solid #EAECEF !important; cursor: pointer !important; transition: all 0.2s ease !important; display: inline-flex !important; align-items: center !important; gap: 5px !important; font-family: inherit !important; }
        #dashboardPage .btn-delete:hover { background: #1A1D1F !important; color: #FFFFFF !important; border-color: #1A1D1F !important; transform: translateY(-1px) !important; }
        #dashboardPage .status-warning { background: #F8FAFC !important; color: #6F767E !important; padding: 3px 10px !important; border-radius: 6px !important; font-size: 0.72rem !important; font-weight: 700 !important; border: 1px solid #EAECEF !important; display: inline-block !important; text-transform: capitalize !important; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .dash-welcome, .dash-kpi, .smart-alert-card, .dash-section { animation: fadeUp 0.35s ease both; }
        @media (max-width: 1024px) { .dash-welcome { padding: 20px; } .dash-welcome h1 { font-size: 1.2rem; } .dash-kpi-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); } .quick-access-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); } }
        @media (max-width: 768px) {
            #dashboardPage { padding: 0 2px; }
            .dash-welcome { padding: 16px; border-radius: 12px; flex-direction: column; align-items: flex-start; gap: 10px; }
            .dash-welcome h1 { font-size: 1.1rem; }
            .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .dash-kpi { padding: 14px; gap: 8px; }
            .dash-kpi-value { font-size: 1.1rem; }
            .smart-alert-grid { grid-template-columns: 1fr; gap: 10px; }
            .dash-section { padding: 14px; }
            .quick-access-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .qa-tile { padding: 12px 6px; gap: 6px; border-radius: 10px; }
            .qa-tile-desc { display: none; }
        }
        @media (max-width: 480px) { .dash-kpi-grid { gap: 8px; } .quick-access-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; } .smart-forecast-grid { grid-template-columns: 1fr; } }
        @media (min-width: 1600px) { .dash-kpi-grid { grid-template-columns: repeat(5, 1fr); } .quick-access-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); } }

        /* ============================================================ */
        /* 🆕 📅 CALENDRIER PRO — 90% de la page                        */
        /* ============================================================ */
        .dcp-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.7); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 5vh 5vw; }
        .dcp-modal { background: #FFFFFF; border-radius: 20px; width: 90vw; height: 90vh; max-width: 1600px; max-height: 1200px; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.35); overflow: hidden; }
        .dcp-header { padding: 20px 28px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg,#EFF6FF,#FFFFFF); flex-shrink: 0; }
        .dcp-header h2 { margin: 0; font-size: 22px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 12px; }
        .dcp-header h2 i { background: linear-gradient(135deg,#3B82F6,#1D4ED8); color: white; padding: 10px; border-radius: 12px; font-size: 18px; }
        .dcp-close { width: 42px; height: 42px; border-radius: 50%; border: none; background: #F1F5F9; color: #64748B; font-size: 18px; cursor: pointer; transition: all 0.2s; }
        .dcp-close:hover { background: #E2E8F0; color: #0F172A; }
        .dcp-toolbar { padding: 16px 28px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; flex-shrink: 0; }
        .dcp-toolbar label { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; }
        .dcp-toolbar select { padding: 9px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 14px; background: white; color: #0F172A; cursor: pointer; outline: none; min-width: 150px; font-family: inherit; }
        .dcp-toolbar select:focus { border-color: #2563EB; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
        .dcp-nav-btn { padding: 9px 14px; border: none; background: white; border-radius: 10px; font-size: 14px; font-weight: 700; color: #0F172A; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06); font-family: inherit; }
        .dcp-nav-btn:hover { background: #EFF6FF; color: #2563EB; }
        .dcp-nav-btn.primary { background: linear-gradient(135deg,#3B82F6,#2563EB); color: white; box-shadow: 0 2px 6px rgba(59,130,246,0.35); }
        .dcp-nav-btn.primary:hover { background: linear-gradient(135deg,#2563EB,#1D4ED8); }
        .dcp-body { flex: 1; overflow-y: auto; padding: 24px 28px; background: #FAFBFC; }
        .dcp-period-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .dcp-period-title h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0F172A; text-transform: capitalize; }
        .dcp-city-badge { background: #EFF6FF; color: #2563EB; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
        .dcp-weather { background: linear-gradient(135deg,#DBEAFE,#BFDBFE); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .dcp-weather-main { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .dcp-weather-icon { font-size: 48px; }
        .dcp-weather-temp { font-size: 32px; font-weight: 800; color: #0F172A; }
        .dcp-weather-desc { font-size: 14px; color: #1E40AF; font-weight: 600; }
        .dcp-weather-forecast { display: grid; grid-template-columns: repeat(auto-fit,minmax(100px,1fr)); gap: 8px; margin-top: 16px; }
        .dcp-forecast-day { background: white; border-radius: 10px; padding: 10px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #E2E8F0; }
        .dcp-forecast-day .dname { font-size: 12px; font-weight: 700; color: #64748B; }
        .dcp-forecast-day .dicon { font-size: 22px; margin: 4px 0; }
        .dcp-forecast-day .dmax { font-size: 13px; font-weight: 700; color: #0F172A; }
        .dcp-forecast-day .dmin { font-size: 11px; color: #94A3B8; }
        .dcp-events-title { margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px; }
        .dcp-events-title i { color: #F59E0B; }
        .dcp-events-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(320px,1fr)); gap: 14px; }
        .dcp-event-card { border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; border-left: 4px solid; }
        .dcp-event-card.national { background: #FEF3C7; border-left-color: #F59E0B; }
        .dcp-event-card.muslim { background: #D1FAE5; border-left-color: #10B981; }
        .dcp-event-card.saison { background: #DBEAFE; border-left-color: #3B82F6; }
        .dcp-event-card.custom { background: #FCE7F3; border-left-color: #EC4899; }
        .dcp-event-top { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
        .dcp-event-emoji { font-size: 22px; }
        .dcp-event-badge { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: white; }
        .dcp-event-badge.national { background: #F59E0B; }
        .dcp-event-badge.muslim { background: #10B981; }
        .dcp-event-badge.saison { background: #3B82F6; }
        .dcp-event-badge.custom { background: #EC4899; }
        .dcp-event-title { font-size: 14px; font-weight: 800; }
        .dcp-event-card.national .dcp-event-title, .dcp-event-card.national .dcp-event-date { color: #92400E; }
        .dcp-event-card.muslim .dcp-event-title, .dcp-event-card.muslim .dcp-event-date { color: #065F46; }
        .dcp-event-card.saison .dcp-event-title, .dcp-event-card.saison .dcp-event-date { color: #1E40AF; }
        .dcp-event-card.custom .dcp-event-title, .dcp-event-card.custom .dcp-event-date { color: #831843; }
        .dcp-event-date { font-size: 11px; font-weight: 600; opacity: 0.8; }
        .dcp-event-desc { font-size: 12px; opacity: 0.9; }
        .dcp-empty { text-align: center; padding: 40px; background: white; border-radius: 14px; border: 1px dashed #CBD5E1; color: #94A3B8; }
        .dcp-empty i { font-size: 2.5rem; display: block; margin-bottom: 10px; opacity: 0.5; }
        /* 🆕 Alarme imminente */
        .dcp-event-card.alarm-soon { box-shadow: 0 0 0 3px #F59E0B, 0 4px 12px rgba(245,158,11,0.3); animation: pulseAlarm 1.5s ease-in-out infinite; }
        @keyframes pulseAlarm { 0%,100% { box-shadow: 0 0 0 3px #F59E0B, 0 4px 12px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 0 5px #FBBF24, 0 4px 16px rgba(245,158,11,0.5); } }
        .dcp-alarm-badge { display: inline-flex; align-items: center; gap: 4px; background: #FEF3C7; color: #B45309; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; border: 1px solid #FDE68A; }
        @media (max-width: 768px) {
            .dcp-modal { width: 100vw; height: 100vh; max-width: 100%; max-height: 100vh; border-radius: 0; }
            .dcp-toolbar { padding: 12px 16px; }
            .dcp-body { padding: 14px; }
            .dcp-events-grid { grid-template-columns: 1fr; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== 🆕 📅 CALENDRIER PRO ====================
var CALENDAR_CITIES = [
    { name: 'Casablanca', lat: 33.5731, lon: -7.5898 },
    { name: 'Rabat', lat: 34.0209, lon: -6.8416 },
    { name: 'Marrakech', lat: 31.6295, lon: -7.9811 },
    { name: 'Fès', lat: 34.0181, lon: -5.0078 },
    { name: 'Tanger', lat: 35.7595, lon: -5.8340 },
    { name: 'Agadir', lat: 30.4278, lon: -9.5981 },
    { name: 'Meknès', lat: 33.8935, lon: -5.5473 },
    { name: 'Oujda', lat: 34.6814, lon: -1.9086 },
    { name: 'Kénitra', lat: 34.2610, lon: -6.5802 },
    { name: 'Tétouan', lat: 35.5785, lon: -5.3684 },
    { name: 'Safi', lat: 32.2994, lon: -9.2372 },
    { name: 'Mohammedia', lat: 33.6866, lon: -7.3830 },
    { name: 'Khouribga', lat: 32.8811, lon: -6.9063 },
    { name: 'El Jadida', lat: 33.2316, lon: -8.5007 },
    { name: 'Béni Mellal', lat: 32.3373, lon: -6.3498 },
    { name: 'Nador', lat: 35.1681, lon: -2.9287 },
    { name: 'Settat', lat: 33.0010, lon: -7.6164 },
    { name: 'Laâyoune', lat: 27.1253, lon: -13.1625 },
    { name: 'Dakhla', lat: 23.6848, lon: -15.9580 },
    { name: 'Essaouira', lat: 31.5085, lon: -9.7595 }
];

window._calendarState = window._calendarState || {
    cityIndex: 0,
    currentDate: new Date(),
    periodType: 'month'
};

// 🆕 Stockage événements personnels + overrides des événements par défaut
window._dcpCustomEvents = window._dcpCustomEvents || [];
window._dcpDefaultOverrides = window._dcpDefaultOverrides || {};

async function dcpLoadCustomEvents() {
    try {
        var doc = await db.collection('settings').doc('calendar_events').get();
        if (doc.exists) {
            var data = doc.data();
            window._dcpCustomEvents = Array.isArray(data.items) ? data.items : [];
            window._dcpDefaultOverrides = data.defaultOverrides || {};
        } else {
            window._dcpCustomEvents = [];
            window._dcpDefaultOverrides = {};
        }
    } catch(e) {
        try {
            window._dcpCustomEvents = JSON.parse(localStorage.getItem('dcp_custom_events') || '[]');
            window._dcpDefaultOverrides = JSON.parse(localStorage.getItem('dcp_default_overrides') || '{}');
        } catch(e2) {
            window._dcpCustomEvents = [];
            window._dcpDefaultOverrides = {};
        }
    }
}

async function dcpSaveCustomEvents() {
    var payload = {
        items: window._dcpCustomEvents,
        defaultOverrides: window._dcpDefaultOverrides || {}
    };
    try {
        await db.collection('settings').doc('calendar_events').set(payload, { merge: true });
        if (typeof CacheDB !== 'undefined' && CacheDB.set) CacheDB.set('settings', 'calendar_events', payload);
    } catch(e) { console.warn('⚠️ Erreur sauvegarde événements:', e); }
    try {
        localStorage.setItem('dcp_custom_events', JSON.stringify(window._dcpCustomEvents));
        localStorage.setItem('dcp_default_overrides', JSON.stringify(window._dcpDefaultOverrides || {}));
    } catch(e) {}
}

// ✅ Fêtes + saisons préétablies (avec support overrides + heure)
function dcpGetPredefinedEvents(year) {
    var events = [];
    var ov = window._dcpDefaultOverrides || {};

    // 🇲🇦 Fêtes nationales marocaines
    events.push({ key: 'nat_01_01', date: year + '-01-01', type: 'national', titre: 'Nouvel An', icon: '🎉', description: 'Jour de l\'An' });
    events.push({ key: 'nat_01_11', date: year + '-01-11', type: 'national', titre: 'Manifeste de l\'Indépendance', icon: '🇲🇦', description: 'Fête nationale' });
    events.push({ key: 'nat_01_14', date: year + '-01-14', type: 'national', titre: 'Nouvel An Amazigh', icon: '🏔️', description: 'Fête nationale amazighe' });
    events.push({ key: 'nat_05_01', date: year + '-05-01', type: 'national', titre: 'Fête du Travail', icon: '⚒️', description: 'Fête internationale des travailleurs' });
    events.push({ key: 'nat_07_30', date: year + '-07-30', type: 'national', titre: 'Fête du Trône', icon: '👑', description: 'Intronisation du Roi Mohammed VI' });
    events.push({ key: 'nat_08_14', date: year + '-08-14', type: 'national', titre: 'Allégeance Oued Eddahab', icon: '🏜️', description: 'Fête nationale' });
    events.push({ key: 'nat_08_20', date: year + '-08-20', type: 'national', titre: 'Révolution du Roi et du Peuple', icon: '🔥', description: 'Fête nationale' });
    events.push({ key: 'nat_08_21', date: year + '-08-21', type: 'national', titre: 'Fête de la Jeunesse', icon: '🎊', description: 'Anniversaire du Roi Mohammed VI' });
    events.push({ key: 'nat_11_06', date: year + '-11-06', type: 'national', titre: 'Marche Verte', icon: '💚', description: 'Fête nationale' });
    events.push({ key: 'nat_11_18', date: year + '-11-18', type: 'national', titre: 'Fête de l\'Indépendance', icon: '🇲🇦', description: 'Fête nationale' });

    // 🌸 Saisons (hémisphère Nord)
    events.push({ key: 'saison_03_20', date: year + '-03-20', type: 'saison', titre: 'Début du Printemps', icon: '🌸', description: 'Équinoxe de printemps' });
    events.push({ key: 'saison_06_21', date: year + '-06-21', type: 'saison', titre: 'Début de l\'Été', icon: '☀️', description: 'Solstice d\'été' });
    events.push({ key: 'saison_09_22', date: year + '-09-22', type: 'saison', titre: 'Début de l\'Automne', icon: '🍂', description: 'Équinoxe d\'automne' });
    events.push({ key: 'saison_12_21', date: year + '-12-21', type: 'saison', titre: 'Début de l\'Hiver', icon: '❄️', description: 'Solstice d\'hiver' });

    // 🕌 Fêtes musulmanes (dates estimées)
    var muslimDates = {
        2024: [
            { key: 'mus_ramadan_2024', date: '2024-03-11', titre: 'Début Ramadan', icon: '🌙', desc: '1er jour du mois de Ramadan' },
            { key: 'mus_fitr_2024', date: '2024-04-10', titre: 'Aïd al-Fitr', icon: '🌙', desc: 'Fête de fin du Ramadan' },
            { key: 'mus_adha_2024', date: '2024-06-16', titre: 'Aïd al-Adha', icon: '🐑', desc: 'Fête du sacrifice' },
            { key: 'mus_hijri_2024', date: '2024-07-07', titre: 'Nouvel An Hégirien', icon: '📅', desc: '1er Muharram' },
            { key: 'mus_achoura_2024', date: '2024-07-16', titre: 'Achoura', icon: '💧', desc: '10 Muharram' },
            { key: 'mus_mawlid_2024', date: '2024-09-15', titre: 'Mawlid an-Nabi', icon: '🕌', desc: 'Naissance du Prophète' }
        ],
        2025: [
            { key: 'mus_ramadan_2025', date: '2025-03-01', titre: 'Début Ramadan', icon: '🌙', desc: '1er jour du mois de Ramadan' },
            { key: 'mus_fitr_2025', date: '2025-03-30', titre: 'Aïd al-Fitr', icon: '🌙', desc: 'Fête de fin du Ramadan' },
            { key: 'mus_adha_2025', date: '2025-06-06', titre: 'Aïd al-Adha', icon: '🐑', desc: 'Fête du sacrifice' },
            { key: 'mus_hijri_2025', date: '2025-06-26', titre: 'Nouvel An Hégirien', icon: '📅', desc: '1er Muharram' },
            { key: 'mus_achoura_2025', date: '2025-07-05', titre: 'Achoura', icon: '💧', desc: '10 Muharram' },
            { key: 'mus_mawlid_2025', date: '2025-09-05', titre: 'Mawlid an-Nabi', icon: '🕌', desc: 'Naissance du Prophète' }
        ],
        2026: [
            { key: 'mus_ramadan_2026', date: '2026-02-18', titre: 'Début Ramadan', icon: '🌙', desc: '1er jour du mois de Ramadan' },
            { key: 'mus_fitr_2026', date: '2026-03-20', titre: 'Aïd al-Fitr', icon: '🌙', desc: 'Fête de fin du Ramadan' },
            { key: 'mus_adha_2026', date: '2026-05-27', titre: 'Aïd al-Adha', icon: '🐑', desc: 'Fête du sacrifice' },
            { key: 'mus_hijri_2026', date: '2026-06-16', titre: 'Nouvel An Hégirien', icon: '📅', desc: '1er Muharram' },
            { key: 'mus_achoura_2026', date: '2026-06-25', titre: 'Achoura', icon: '💧', desc: '10 Muharram' },
            { key: 'mus_mawlid_2026', date: '2026-08-25', titre: 'Mawlid an-Nabi', icon: '🕌', desc: 'Naissance du Prophète' }
        ],
        2027: [
            { key: 'mus_ramadan_2027', date: '2027-02-08', titre: 'Début Ramadan', icon: '🌙', desc: '1er jour du mois de Ramadan' },
            { key: 'mus_fitr_2027', date: '2027-03-10', titre: 'Aïd al-Fitr', icon: '🌙', desc: 'Fête de fin du Ramadan' },
            { key: 'mus_adha_2027', date: '2027-05-17', titre: 'Aïd al-Adha', icon: '🐑', desc: 'Fête du sacrifice' },
            { key: 'mus_hijri_2027', date: '2027-06-06', titre: 'Nouvel An Hégirien', icon: '📅', desc: '1er Muharram' },
            { key: 'mus_achoura_2027', date: '2027-06-15', titre: 'Achoura', icon: '💧', desc: '10 Muharram' },
            { key: 'mus_mawlid_2027', date: '2027-08-14', titre: 'Mawlid an-Nabi', icon: '🕌', desc: 'Naissance du Prophète' }
        ]
    };
    (muslimDates[year] || []).forEach(function(e) {
        events.push({ key: e.key, date: e.date, type: 'muslim', titre: e.titre, icon: e.icon, description: e.desc });
    });

    // 🆕 Appliquer les surcharges (modifs/suppressions des événements par défaut)
    events = events.map(function(ev) {
        var o = ov[ev.key];
        if (!o) return ev;
        if (o.deleted) return null;
        return {
            key: ev.key,
            date: o.date || ev.date,
            time: o.time !== undefined ? o.time : (ev.time || ''),
            type: ev.type,
            titre: o.titre !== undefined ? o.titre : ev.titre,
            icon: o.icon !== undefined ? o.icon : ev.icon,
            description: o.description !== undefined ? o.description : ev.description,
            alarm: o.alarm !== undefined ? o.alarm : ev.alarm,
            alarmMinutes: o.alarmMinutes !== undefined ? o.alarmMinutes : ev.alarmMinutes,
            isOverridden: true
        };
    }).filter(function(e) { return e !== null; });

    // ✅ Ajouter les événements personnels
    (window._dcpCustomEvents || []).forEach(function(ce) {
        events.push({
            date: ce.date,
            time: ce.time || '',
            type: 'custom',
            titre: ce.titre,
            icon: ce.icon || '📌',
            description: ce.description || '',
            id: ce.id,
            endDate: ce.endDate || null,
            alarm: ce.alarm || false,
            alarmMinutes: ce.alarmMinutes || 30
        });
    });

    return events;
}

// ✅ Filtre période
function dcpFilterByPeriod(events, centerDate, periodType) {
    var start = new Date(centerDate);
    var end = new Date(centerDate);
    if (periodType === 'day') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    else if (periodType === 'week') {
        var day = start.getDay(); var diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff); start.setHours(0,0,0,0);
        end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
    } else if (periodType === '15days') { start.setHours(0,0,0,0); end = new Date(start); end.setDate(end.getDate() + 15); end.setHours(23,59,59,999); }
    else if (periodType === 'month') { start = new Date(centerDate.getFullYear(), centerDate.getMonth(), 1); end = new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 0, 23, 59, 59, 999); }
    else if (periodType === '3months') { start.setHours(0,0,0,0); end = new Date(start); end.setMonth(end.getMonth() + 3); end.setHours(23,59,59,999); }
    else if (periodType === '6months') { start.setHours(0,0,0,0); end = new Date(start); end.setMonth(end.getMonth() + 6); end.setHours(23,59,59,999); }
    else if (periodType === 'year') { start = new Date(centerDate.getFullYear(), 0, 1); end = new Date(centerDate.getFullYear(), 11, 31, 23, 59, 59, 999); }
    return events.filter(function(e) {
        var evDate = new Date(e.date);
        return evDate >= start && evDate <= end;
    }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
}

// ✅ Météo Open-Meteo
async function dcpFetchWeather(cityIndex) {
    var city = CALENDAR_CITIES[cityIndex];
    if (!city) return null;
    try {
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
            '&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Africa/Casablanca&forecast_days=7';
        var resp = await fetch(url);
        if (!resp.ok) return null;
        return await resp.json();
    } catch(e) { console.warn('⚠️ Erreur météo:', e); return null; }
}

function dcpGetWeatherLabel(code) {
    var labels = {
        0: { txt: 'Ciel dégagé', icon: '☀️' }, 1: { txt: 'Peu nuageux', icon: '🌤️' }, 2: { txt: 'Partiellement nuageux', icon: '⛅' },
        3: { txt: 'Couvert', icon: '☁️' }, 45: { txt: 'Brouillard', icon: '🌫️' }, 48: { txt: 'Brouillard givrant', icon: '🌫️' },
        51: { txt: 'Bruine légère', icon: '🌦️' }, 53: { txt: 'Bruine modérée', icon: '🌦️' }, 55: { txt: 'Bruine dense', icon: '🌧️' },
        61: { txt: 'Pluie légère', icon: '🌧️' }, 63: { txt: 'Pluie modérée', icon: '🌧️' }, 65: { txt: 'Pluie forte', icon: '🌧️' },
        71: { txt: 'Neige légère', icon: '🌨️' }, 73: { txt: 'Neige modérée', icon: '🌨️' }, 75: { txt: 'Neige forte', icon: '❄️' },
        80: { txt: 'Averses légères', icon: '🌦️' }, 81: { txt: 'Averses modérées', icon: '🌧️' }, 82: { txt: 'Averses violentes', icon: '⛈️' },
        95: { txt: 'Orage', icon: '⛈️' }, 96: { txt: 'Orage + grêle', icon: '⛈️' }, 99: { txt: 'Orage violent', icon: '⛈️' }
    };
    return labels[code] || { txt: 'Inconnu', icon: '🌡️' };
}

function dcpGetEventTypeStyle(type) {
    var styles = {
        'national': { bg: '#FEF3C7', border: '#F59E0B', color: '#92400E', label: 'National' },
        'muslim': { bg: '#D1FAE5', border: '#10B981', color: '#065F46', label: 'Musulman' },
        'saison': { bg: '#DBEAFE', border: '#3B82F6', color: '#1E40AF', label: 'Saison' },
        'custom': { bg: '#FCE7F3', border: '#EC4899', color: '#831843', label: 'Personnel' }
    };
    return styles[type] || styles.custom;
}

function dcpGetPeriodLabel(date, periodType) {
    var d = new Date(date);
    if (periodType === 'day') return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (periodType === 'week') {
        var day = d.getDay(); var diff = day === 0 ? -6 : 1 - day;
        var start = new Date(d); start.setDate(d.getDate() + diff);
        var end = new Date(start); end.setDate(end.getDate() + 6);
        return 'Semaine du ' + start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' au ' + end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (periodType === '15days') {
        var start15 = new Date(d); start15.setHours(0,0,0,0);
        var end15 = new Date(start15); end15.setDate(end15.getDate() + 15);
        return 'Du ' + start15.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' au ' + end15.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (periodType === 'month') return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (periodType === '3months') {
        var s3 = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
        var e3 = new Date(s3.getFullYear(), s3.getMonth() + 3, 0);
        return 'T3 ' + s3.toLocaleDateString('fr-FR', { month: 'short' }) + ' → ' + e3.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    }
    if (periodType === '6months') {
        var s6 = new Date(d.getFullYear(), Math.floor(d.getMonth() / 6) * 6, 1);
        var e6 = new Date(s6.getFullYear(), s6.getMonth() + 6, 0);
        return 'S' + (s6.getMonth() < 6 ? '1' : '2') + ' ' + s6.getFullYear() + ' (' + s6.toLocaleDateString('fr-FR', { month: 'short' }) + ' → ' + e6.toLocaleDateString('fr-FR', { month: 'short' }) + ')';
    }
    if (periodType === 'year') return 'Année ' + d.getFullYear();
    return d.toLocaleDateString('fr-FR');
}

// ✅ Modale principale (90% de la page)
async function openDashboardCalendar() {
    var old = document.getElementById('modalCalendarPro');
    if (old) old.remove();
    var state = window._calendarState;

    var html = '';
    html += '<div id="modalCalendarPro" class="dcp-overlay">';
    html += '  <div class="dcp-modal">';

    // HEADER
    html += '    <div class="dcp-header">';
    html += '      <h2><i class="fas fa-calendar-alt"></i> Calendrier & Événements</h2>';
    html += '      <button onclick="dcCloseCalendar()" class="dcp-close"><i class="fas fa-times"></i></button>';
    html += '    </div>';

    // TOOLBAR
    html += '    <div class="dcp-toolbar">';
    html += '      <div style="display:flex;align-items:center;gap:8px;">';
    html += '        <label>📍 Ville</label>';
    html += '        <select id="dcpCitySelect" onchange="dcpChangeCity(this.value)">';
    CALENDAR_CITIES.forEach(function(c, i) {
        html += '<option value="' + i + '"' + (i === state.cityIndex ? ' selected' : '') + '>' + c.name + '</option>';
    });
    html += '        </select>';
    html += '      </div>';
    html += '      <div style="display:flex;align-items:center;gap:8px;flex:1;">';
    html += '        <label>📅 Période</label>';
    html += '        <select id="dcpPeriodSelect" onchange="dcpChangePeriod(this.value)">';
    html += '          <option value="day"' + (state.periodType === 'day' ? ' selected' : '') + '>Jour</option>';
    html += '          <option value="week"' + (state.periodType === 'week' ? ' selected' : '') + '>Semaine</option>';
    html += '          <option value="15days"' + (state.periodType === '15days' ? ' selected' : '') + '>15 jours</option>';
    html += '          <option value="month"' + (state.periodType === 'month' ? ' selected' : '') + '>Mois</option>';
    html += '          <option value="3months"' + (state.periodType === '3months' ? ' selected' : '') + '>3 mois</option>';
    html += '          <option value="6months"' + (state.periodType === '6months' ? ' selected' : '') + '>6 mois</option>';
    html += '          <option value="year"' + (state.periodType === 'year' ? ' selected' : '') + '>Année</option>';
    html += '        </select>';
    html += '      </div>';
    html += '      <div style="display:flex;gap:6px;">';
    html += '        <button onclick="dcpNavigate(-1)" class="dcp-nav-btn"><i class="fas fa-chevron-left"></i></button>';
    html += '        <button onclick="dcpGoToday()" class="dcp-nav-btn primary">Aujourd\'hui</button>';
    html += '        <button onclick="dcpNavigate(1)" class="dcp-nav-btn"><i class="fas fa-chevron-right"></i></button>';
    html += '        <button onclick="dcpOpenEventForm()" class="dcp-nav-btn primary" style="background:linear-gradient(135deg,#10B981,#059669);"><i class="fas fa-plus"></i> Ajouter</button>';
    html += '      </div>';
    html += '    </div>';

    // BODY
    html += '    <div class="dcp-body" id="dcpBodyContent"></div>';

    html += '  </div>';
    html += '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    await dcpLoadCustomEvents();
    await dcpRenderBody();
    // 🆕 Planifier les alarmes
    if (typeof dcpScheduleAlarms === 'function') dcpScheduleAlarms();
}

async function dcpRenderBody() {
    var body = document.getElementById('dcpBodyContent');
    if (!body) return;
    body.innerHTML = '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#2563EB;"></i><p style="color:#64748B;margin-top:12px;">Chargement…</p></div>';

    var state = window._calendarState;
    var city = CALENDAR_CITIES[state.cityIndex];
    var year = state.currentDate.getFullYear();

    var events = dcpGetPredefinedEvents(year);
    events = events.concat(dcpGetPredefinedEvents(year + 1));

    var filteredEvents = dcpFilterByPeriod(events, state.currentDate, state.periodType);
    var weather = await dcpFetchWeather(state.cityIndex);

    var html = '';

    // Titre période
    var periodLabel = dcpGetPeriodLabel(state.currentDate, state.periodType);
    html += '<div class="dcp-period-title">';
    html += '  <h3>' + periodLabel + '</h3>';
    html += '  <span class="dcp-city-badge">📍 ' + city.name + '</span>';
    html += '</div>';

    // Widget météo
    if (weather && weather.current) {
        var cur = weather.current;
        var wInfo = dcpGetWeatherLabel(cur.weather_code);
        html += '<div class="dcp-weather">';
        html += '  <div class="dcp-weather-main">';
        html += '    <div style="display:flex;align-items:center;gap:16px;">';
        html += '      <div class="dcp-weather-icon">' + wInfo.icon + '</div>';
        html += '      <div>';
        html += '        <div class="dcp-weather-temp">' + Math.round(cur.temperature_2m) + '°C</div>';
        html += '        <div class="dcp-weather-desc">' + wInfo.txt + '</div>';
        html += '      </div>';
        html += '    </div>';
        html += '    <div style="font-size:13px;color:#1E40AF;font-weight:600;">💨 Vent : ' + Math.round(cur.wind_speed_10m) + ' km/h</div>';
        html += '  </div>';
        if (weather.daily && weather.daily.time) {
            html += '  <div class="dcp-weather-forecast">';
            for (var i = 0; i < weather.daily.time.length && i < 7; i++) {
                var d = new Date(weather.daily.time[i]);
                var dayName = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
                var wd = dcpGetWeatherLabel(weather.daily.weather_code[i]);
                html += '<div class="dcp-forecast-day">';
                html += '  <div class="dname">' + dayName + '</div>';
                html += '  <div class="dicon">' + wd.icon + '</div>';
                html += '  <div class="dmax">' + Math.round(weather.daily.temperature_2m_max[i]) + '°</div>';
                html += '  <div class="dmin">' + Math.round(weather.daily.temperature_2m_min[i]) + '°</div>';
                html += '</div>';
            }
            html += '  </div>';
        }
        html += '</div>';
    }

    // Liste événements
    html += '<h4 class="dcp-events-title"><i class="fas fa-star"></i> Événements de la période (' + filteredEvents.length + ')</h4>';

    if (filteredEvents.length === 0) {
        html += '<div class="dcp-empty"><i class="fas fa-calendar-times"></i>Aucun événement sur cette période</div>';
    } else {
        html += '<div class="dcp-events-grid">';
        filteredEvents.forEach(function(e) {
            var style = dcpGetEventTypeStyle(e.type);
            var evDate = new Date(e.date + (e.time ? 'T' + e.time : ''));
            var dateLabel = evDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            if (e.time) dateLabel += ' à ' + e.time;
            var isPast = evDate < new Date(new Date().setHours(0,0,0,0));

            // 🆕 Détection alarme imminente
            var alarmSoon = false;
            if (e.alarm && e.time) {
                var now = new Date();
                var diffMin = (evDate - now) / 60000;
                if (diffMin >= 0 && diffMin <= (e.alarmMinutes || 30)) alarmSoon = true;
            }

            html += '<div class="dcp-event-card ' + e.type + (alarmSoon ? ' alarm-soon' : '') + '" style="opacity:' + (isPast ? '0.65' : '1') + ';">';
            html += '  <div class="dcp-event-top">';
            html += '    <div class="dcp-event-emoji">' + e.icon + (alarmSoon ? ' 🔔' : '') + '</div>';
            html += '    <span class="dcp-event-badge ' + e.type + '">' + style.label + (e.isOverridden ? ' ✏️' : '') + '</span>';
            html += '  </div>';
            html += '  <div class="dcp-event-title">' + escapeHtml(e.titre) + '</div>';
            html += '  <div class="dcp-event-date">📅 ' + dateLabel + '</div>';
            if (e.description) html += '  <div class="dcp-event-desc">' + escapeHtml(e.description) + '</div>';
            if (e.alarm) html += '  <div class="dcp-alarm-badge">🔔 Rappel ' + (e.alarmMinutes || 30) + ' min avant</div>';

            // ✅ Boutons Modifier/Supprimer pour TOUS les événements
            if (e.type === 'custom' && e.id) {
                html += '  <div style="display:flex;gap:6px;margin-top:8px;">';
                html += '    <button onclick="dcpOpenEventForm(\'' + e.id + '\')" style="background:#3B82F6;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="fas fa-edit"></i> Modifier</button>';
                html += '    <button onclick="dcpDeleteEvent(\'' + e.id + '\')" style="background:#EF4444;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="fas fa-trash"></i> Supprimer</button>';
                html += '  </div>';
            } else if (e.key) {
                html += '  <div style="display:flex;gap:6px;margin-top:8px;">';
                html += '    <button onclick="dcpOpenEventForm(null, \'' + e.key + '\')" style="background:#3B82F6;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="fas fa-edit"></i> Modifier</button>';
                html += '    <button onclick="dcpDeleteEvent(null, \'' + e.key + '\')" style="background:#EF4444;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="fas fa-trash"></i> Supprimer</button>';
                html += '  </div>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    body.innerHTML = html;
}

// ✅ Helpers navigation
function dcpNavigate(delta) {
    var state = window._calendarState;
    var d = new Date(state.currentDate);
    if (state.periodType === 'day') d.setDate(d.getDate() + delta);
    else if (state.periodType === 'week') d.setDate(d.getDate() + (delta * 7));
    else if (state.periodType === '15days') d.setDate(d.getDate() + (delta * 15));
    else if (state.periodType === 'month') d.setMonth(d.getMonth() + delta);
    else if (state.periodType === '3months') d.setMonth(d.getMonth() + (delta * 3));
    else if (state.periodType === '6months') d.setMonth(d.getMonth() + (delta * 6));
    else if (state.periodType === 'year') d.setFullYear(d.getFullYear() + delta);
    state.currentDate = d;
    dcpRenderBody();
}
window.dcpNavigate = dcpNavigate;

function dcpGoToday() {
    window._calendarState.currentDate = new Date();
    dcpRenderBody();
}
window.dcpGoToday = dcpGoToday;

function dcpChangeCity(idx) {
    window._calendarState.cityIndex = parseInt(idx) || 0;
    dcpRenderBody();
}
window.dcpChangeCity = dcpChangeCity;

function dcpChangePeriod(p) {
    window._calendarState.periodType = p;
    dcpRenderBody();
}
window.dcpChangePeriod = dcpChangePeriod;

function dcCloseCalendar() {
    var el = document.getElementById('modalCalendarPro');
    if (el) el.remove();
}
window.dcCloseCalendar = dcCloseCalendar;
window.openDashboardCalendar = openDashboardCalendar;

// ====================================================
//  ✏️ CRUD ÉVÉNEMENTS (personnels ET par défaut)
// ====================================================
window.dcpOpenEventForm = function(eventId, defaultKey) {
    var old = document.getElementById('dcpFormOverlay');
    if (old) old.remove();

    var isEditCustom = !!eventId;
    var isEditDefault = !!defaultKey;
    var isEdit = isEditCustom || isEditDefault;
    var ev = null;

    if (isEditCustom) {
        ev = (window._dcpCustomEvents || []).find(function(x) { return x.id === eventId; });
        if (!ev) { alert('❌ Événement introuvable'); return; }
    } else if (isEditDefault) {
        var allDefault = dcpGetPredefinedEvents(new Date().getFullYear())
            .concat(dcpGetPredefinedEvents(new Date().getFullYear() + 1));
        ev = allDefault.find(function(x) { return x.key === defaultKey; });
        if (!ev) { alert('❌ Événement par défaut introuvable'); return; }
    }

    var state = window._calendarState;
    var defaultDate = new Date(state.currentDate);
    var defaultDateStr = defaultDate.getFullYear() + '-' + String(defaultDate.getMonth() + 1).padStart(2, '0') + '-' + String(defaultDate.getDate()).padStart(2, '0');

    var html = '';
    html += '<div id="dcpFormOverlay" style="position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;">';
    html += '  <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:560px;box-shadow:0 24px 64px rgba(0,0,0,0.35);max-height:90vh;overflow-y:auto;">';
    html += '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '      <h3 style="margin:0;font-size:18px;font-weight:800;color:#0F172A;display:flex;align-items:center;gap:10px;"><i class="fas ' + (isEdit ? 'fa-edit' : 'fa-plus') + '" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:white;padding:8px;border-radius:10px;font-size:14px;"></i> ' + (isEdit ? 'Modifier l\'événement' : 'Nouvel événement') + '</h3>';
    html += '      <button onclick="dcpCloseEventForm()" style="width:36px;height:36px;border-radius:50%;border:none;background:#F1F5F9;color:#64748B;font-size:16px;cursor:pointer;"><i class="fas fa-times"></i></button>';
    html += '    </div>';

    if (isEditDefault) {
        html += '    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#92400E;font-weight:600;">⚠️ Événement par défaut — vos modifications seront sauvegardées</div>';
    }

    // Titre
    html += '    <div style="margin-bottom:14px;">';
    html += '      <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">Titre *</label>';
    html += '      <input type="text" id="dcpEvTitle" placeholder="Ex: Réunion fournisseur" maxlength="80" value="' + (ev ? escapeHtml(ev.titre) : '') + '" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">';
    html += '    </div>';

    // Date début + Heure
    html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">';
    html += '      <div>';
    html += '        <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">Date début *</label>';
    html += '        <input type="date" id="dcpEvDate" value="' + (ev ? ev.date : defaultDateStr) + '" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">';
    html += '      </div>';
    html += '      <div>';
    html += '        <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">🔔 Heure (optionnel)</label>';
    html += '        <input type="time" id="dcpEvTime" value="' + (ev && ev.time ? ev.time : '') + '" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">';
    html += '      </div>';
    html += '    </div>';

    // Date fin (seulement pour custom)
    if (!isEditDefault) {
        html += '    <div style="margin-bottom:14px;">';
        html += '      <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">Date fin (optionnel)</label>';
        html += '      <input type="date" id="dcpEvEndDate" value="' + (ev && ev.endDate ? ev.endDate : '') + '" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">';
        html += '    </div>';
    } else {
        html += '<input type="hidden" id="dcpEvEndDate" value="">';
    }

    // Icône
    html += '    <div style="margin-bottom:14px;">';
    html += '      <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">Icône</label>';
    html += '      <select id="dcpEvIcon" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;cursor:pointer;">';
    var icons = [
        { v: '📌', l: '📌 Épingle' }, { v: '🎉', l: '🎉 Fête' }, { v: '🚚', l: '🚚 Livraison' },
        { v: '📦', l: '📦 Stock' }, { v: '💰', l: '💰 Paiement' }, { v: '📊', l: '📊 Réunion' },
        { v: '⚠️', l: '⚠️ Important' }, { v: '🛒', l: '🛒 Commande' }, { v: '🎂', l: '🎂 Anniversaire' },
        { v: '🏖️', l: '🏖️ Congé' }, { v: '📞', l: '📞 Appel' }, { v: '✈️', l: '✈️ Voyage' },
        { v: '🎓', l: '🎓 Formation' }, { v: '🏥', l: '🏥 Médical' }, { v: '🔧', l: '🔧 Maintenance' },
        { v: '🌙', l: '🌙 Ramadan' }, { v: '🕌', l: '🕌 Mosquée' }, { v: '🇲🇦', l: '🇲🇦 Maroc' },
        { v: '🌸', l: '🌸 Printemps' }, { v: '☀️', l: '☀️ Été' }, { v: '🍂', l: '🍂 Automne' }, { v: '❄️', l: '❄️ Hiver' }
    ];
    icons.forEach(function(ic) {
        html += '<option value="' + ic.v + '"' + (ev && ev.icon === ic.v ? ' selected' : '') + '>' + ic.l + '</option>';
    });
    html += '      </select>';
    html += '    </div>';

    // Description
    html += '    <div style="margin-bottom:14px;">';
    html += '      <label style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;display:block;margin-bottom:6px;">Description (optionnel)</label>';
    html += '      <textarea id="dcpEvDesc" placeholder="Détails..." maxlength="300" style="width:100%;padding:11px 14px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;resize:vertical;min-height:60px;box-sizing:border-box;">' + (ev ? escapeHtml(ev.description || '') : '') + '</textarea>';
    html += '    </div>';

    // 🔔 Alarme
    html += '    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:18px;">';
    html += '      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:700;color:#0F172A;">';
    html += '        <input type="checkbox" id="dcpEvAlarm" ' + ((ev && ev.alarm) ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;">';
    html += '        <span>🔔 Activer le rappel (alarme)</span>';
    html += '      </label>';
    html += '      <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">';
    html += '        <label style="font-size:12px;color:#64748B;font-weight:600;">M\'informer :</label>';
    html += '        <select id="dcpEvAlarmMinutes" style="padding:8px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;cursor:pointer;">';
    var alarmOpts = [
        { v: 5, l: '5 minutes avant' }, { v: 15, l: '15 minutes avant' },
        { v: 30, l: '30 minutes avant' }, { v: 60, l: '1 heure avant' },
        { v: 180, l: '3 heures avant' }, { v: 1440, l: '1 jour avant' }
    ];
    var curAlarm = (ev && ev.alarmMinutes) ? ev.alarmMinutes : 30;
    alarmOpts.forEach(function(o) {
        html += '<option value="' + o.v + '"' + (curAlarm === o.v ? ' selected' : '') + '>' + o.l + '</option>';
    });
    html += '        </select>';
    html += '      </div>';
    html += '    </div>';

    // Actions
    html += '    <div style="display:flex;gap:10px;justify-content:flex-end;">';
    html += '      <button onclick="dcpCloseEventForm()" style="background:#F1F5F9;color:#64748B;border:none;border-radius:10px;padding:11px 20px;font-weight:700;cursor:pointer;font-size:13px;">Annuler</button>';
    var saveArg = isEditCustom ? ("'" + eventId + "'") : (isEditDefault ? ("null, '" + defaultKey + "'") : 'null');
    html += '      <button onclick="dcpSaveEvent(' + saveArg + ')" style="background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:white;border:none;border-radius:10px;padding:11px 20px;font-weight:700;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;"><i class="fas fa-check"></i> ' + (isEdit ? 'Enregistrer' : 'Ajouter') + '</button>';
    html += '    </div>';

    html += '  </div>';
    html += '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(function() {
        var t = document.getElementById('dcpEvTitle');
        if (t) t.focus();
    }, 100);
};

window.dcpCloseEventForm = function() {
    var el = document.getElementById('dcpFormOverlay');
    if (el) el.remove();
};

window.dcpSaveEvent = async function(eventId, defaultKey) {
    var titre = (document.getElementById('dcpEvTitle').value || '').trim();
    var date = document.getElementById('dcpEvDate').value;
    var time = (document.getElementById('dcpEvTime').value || '').trim();
    var endDateEl = document.getElementById('dcpEvEndDate');
    var endDate = endDateEl ? endDateEl.value : '';
    var icon = document.getElementById('dcpEvIcon').value;
    var description = (document.getElementById('dcpEvDesc').value || '').trim();
    var alarm = document.getElementById('dcpEvAlarm') ? document.getElementById('dcpEvAlarm').checked : false;
    var alarmMinutes = parseInt(document.getElementById('dcpEvAlarmMinutes').value) || 30;

    if (!titre) { alert('❌ Le titre est obligatoire'); return; }
    if (!date) { alert('❌ La date de début est obligatoire'); return; }
    if (endDate && endDate < date) { alert('❌ La date de fin doit être après la date de début'); return; }

    // 🆕 Modification d'un événement par défaut
    if (defaultKey) {
        if (!window._dcpDefaultOverrides) window._dcpDefaultOverrides = {};
        window._dcpDefaultOverrides[defaultKey] = {
            date: date,
            time: time,
            titre: titre,
            icon: icon,
            description: description,
            alarm: alarm,
            alarmMinutes: alarmMinutes,
            updatedAt: new Date().toISOString()
        };
        await dcpSaveCustomEvents();
        dcpCloseEventForm();
        dcpRenderBody();
        if (typeof dcpScheduleAlarms === 'function') dcpScheduleAlarms();
        alert('✅ Événement par défaut modifié !');
        return;
    }

    // Modification / création d'un événement personnel
    if (eventId) {
        var ev = window._dcpCustomEvents.find(function(x) { return x.id === eventId; });
        if (ev) {
            ev.titre = titre;
            ev.date = date;
            ev.time = time;
            ev.endDate = endDate || null;
            ev.icon = icon;
            ev.description = description;
            ev.alarm = alarm;
            ev.alarmMinutes = alarmMinutes;
            ev.updatedAt = new Date().toISOString();
        }
    } else {
        window._dcpCustomEvents.push({
            id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            titre: titre,
            date: date,
            time: time,
            endDate: endDate || null,
            icon: icon,
            description: description,
            alarm: alarm,
            alarmMinutes: alarmMinutes,
            createdAt: new Date().toISOString()
        });
    }

    await dcpSaveCustomEvents();
    dcpCloseEventForm();
    dcpRenderBody();
    if (typeof dcpScheduleAlarms === 'function') dcpScheduleAlarms();
    alert('✅ Événement ' + (eventId ? 'modifié' : 'ajouté') + ' avec succès !');
};

window.dcpDeleteEvent = async function(eventId, defaultKey) {
    // 🆕 Suppression d'un événement par défaut → on le masque
    if (defaultKey) {
        if (!confirm('Masquer cet événement par défaut ?\n\nVous pourrez le restaurer plus tard en rechargeant les événements par défaut.')) return;
        if (!window._dcpDefaultOverrides) window._dcpDefaultOverrides = {};
        window._dcpDefaultOverrides[defaultKey] = { deleted: true, updatedAt: new Date().toISOString() };
        await dcpSaveCustomEvents();
        dcpRenderBody();
        alert('🗑️ Événement par défaut masqué');
        return;
    }

    // Suppression d'un événement personnel
    var ev = window._dcpCustomEvents.find(function(x) { return x.id === eventId; });
    if (!ev) { alert('❌ Événement introuvable'); return; }
    if (!confirm('Supprimer cet événement ?\n\n"' + ev.titre + '"\n\nCette action est irréversible.')) return;
    window._dcpCustomEvents = window._dcpCustomEvents.filter(function(x) { return x.id !== eventId; });
    await dcpSaveCustomEvents();
    dcpRenderBody();
    alert('🗑️ Événement supprimé');
};

// ====================================================
//  🔔 SYSTÈME D'ALARMES (notifications)
// ====================================================
window._dcpAlarmTimers = window._dcpAlarmTimers || [];
window._dcpNotifiedEvents = window._dcpNotifiedEvents || {};

window.dcpRequestNotificationPermission = async function() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
        var perm = await Notification.requestPermission();
        return perm === 'granted';
    } catch(e) { return false; }
};

window.dcpScheduleAlarms = async function() {
    // Nettoyer les anciens timers
    (window._dcpAlarmTimers || []).forEach(function(t) { clearTimeout(t); });
    window._dcpAlarmTimers = [];

    var now = new Date();
    var year = now.getFullYear();
    var events = dcpGetPredefinedEvents(year).concat(dcpGetPredefinedEvents(year + 1));
    var hasPerm = await dcpRequestNotificationPermission();

    events.forEach(function(e) {
        if (!e.alarm || !e.time) return;
        var evDate = new Date(e.date + 'T' + e.time);
        var alarmTime = new Date(evDate.getTime() - (e.alarmMinutes || 30) * 60000);
        var delay = alarmTime.getTime() - now.getTime();

        // Déjà passé → skip
        if (delay < 0) return;

        // Éviter les doublons (événement déjà notifié)
        var evKey = (e.id || e.key || '') + '_' + e.date + '_' + e.time;
        if (window._dcpNotifiedEvents[evKey]) return;

        // Programmer (max 24h à l'avance pour éviter les dérives)
        if (delay > 24 * 3600 * 1000) return;

        var timer = setTimeout(function() {
            window._dcpNotifiedEvents[evKey] = true;
            var msg = '🔔 ' + e.titre + '\n\nDans ' + (e.alarmMinutes || 30) + ' minutes (' + e.time + ')\n' + (e.description || '');
            // Notification navigateur
            if (hasPerm && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('📅 ' + e.titre, {
                        body: 'Dans ' + (e.alarmMinutes || 30) + ' min — ' + e.time,
                        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔔</text></svg>',
                        tag: evKey,
                        requireInteraction: true
                    });
                } catch(err) { console.warn('Notification error:', err); }
            }
            // Fallback : alerte visuelle
            alert(msg);
        }, delay);

        window._dcpAlarmTimers.push(timer);
    });

    console.log('🔔 ' + window._dcpAlarmTimers.length + ' alarme(s) programmée(s)');
};
// ==================== MODAL & CRUD ====================
function openModal(t, b) {
var titleEl = document.getElementById('modalTitle');
var bodyEl = document.getElementById('modalBody');
var overlayEl = document.getElementById('modalOverlay');
if (titleEl) titleEl.textContent = t;
if (bodyEl) bodyEl.innerHTML = b;
if (overlayEl) overlayEl.classList.remove('hidden');
}

function closeModal() {
var overlay = document.getElementById('modalOverlay');
if (overlay) overlay.classList.add('hidden');
window.editingId = null;
window.currentCollection = '';
window.editCategoryData = null;
}

function fileToBase64(file, callback, maxWidth, maxHeight, quality) {
if (!file) { callback(null); return; }
maxWidth = maxWidth || 600;
maxHeight = maxHeight || 600;
quality = quality || 0.6;
if (!file.type.startsWith('image/')) {
var reader = new FileReader();
reader.onload = function(e) { callback(e.target.result); };
reader.readAsDataURL(file);
return;
}
var reader = new FileReader();
reader.onload = function(e) {
var img = new Image();
img.onload = function() {
var width = img.width, height = img.height;
if (width > maxWidth || height > maxHeight) {
var ratio = Math.min(maxWidth / width, maxHeight / height);
width = Math.floor(width * ratio);
height = Math.floor(height * ratio);
}
var canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
var ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, width, height);
var compressedBase64 = canvas.toDataURL('image/jpeg', quality);
callback(compressedBase64);
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
}

function previewImage(inp, pid) {
var p = document.getElementById(pid);
if (!p) return;
if (inp.files && inp.files[0]) {
var r = new FileReader();
r.onload = function(e) { p.innerHTML = '<img src="' + e.target.result + '" style="max-width:100px;margin-top:5px;border-radius:8px;">'; };
r.readAsDataURL(inp.files[0]);
}
}

async function saveDocument(cn, data, cb) {
try {
let resultId;
if (window.editingId) {
data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
resultId = await CacheDB.write(cn, window.editingId, data, 'update');
} else {
data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
resultId = await CacheDB.write(cn, null, data, 'add');
}
if (cb) cb(resultId);
CacheDB.sync();
} catch (err) { alert('Erreur: ' + err.message); }
}

async function deleteDocument(cn, id) {
if (confirm('Confirmer la suppression ?')) {
await CacheDB.write(cn, id, null, 'delete');
if (cn === 'categories') {
window.allCategoriesData = window.allCategoriesData.filter(function(x) { return x.id !== id; });
renderCategoriesTable();
} else if (cn === 'products') {
window.allProductsData = window.allProductsData.filter(function(x) { return x.id !== id; });
renderProductsTable();
} else if (cn === 'clients') {
window.allClientsData = window.allClientsData.filter(function(x) { return x.id !== id; });
renderClientsTable();
} else {
if (typeof refreshCurrentPage === 'function') refreshCurrentPage();
}
alert('Supprimé');
CacheDB.sync();
}
}

function refreshCurrentPage() {
var t = document.getElementById('pageTitle')?.textContent || '';
var m = { 'Catégories': 'categories', 'Produits': 'products', 'Clients': 'clients', 'Fournisseurs': 'fournisseurs', 'Dépenses': 'depenses', 'Ventes': 'ventes', 'Crédits': 'credits', 'Commandes en ligne': 'commandes' };
if (typeof navigateTo === 'function') navigateTo(m[t] || 'dashboard');
}

function editDocument(cn, id) {
db.collection(cn).doc(id).get().then(function(doc) {
if (doc.exists) { window.editingId = id; window.currentCollection = cn; openEditForm(cn, doc.data()); }
}).catch(e => console.error(e));
}

function openEditForm(cn, data) {
if (cn === 'categories') openCategoryForm(data);
else if (cn === 'products') openProductForm(data);
else if (cn === 'clients') openClientForm(data);
else if (cn === 'fournisseurs') openFournisseurForm(data);
else if (cn === 'depenses') openDepenseForm(data);
}

// ==================== SYSTÈME DE TRI ====================
function sortTableData(tableName, field, loadFn) {
if (!window.sortOrders[tableName]) window.sortOrders[tableName] = {};
if (!window.sortOrders[tableName][field]) window.sortOrders[tableName][field] = 'asc';
else window.sortOrders[tableName][field] = window.sortOrders[tableName][field] === 'asc' ? 'desc' : 'asc';
Object.keys(window.sortOrders[tableName]).forEach(function(k) { if (k !== field) window.sortOrders[tableName][k] = null; });
if (typeof loadFn === 'string') window[loadFn]();
else if (typeof loadFn === 'function') loadFn();
}

function getSortIcon(tableName, field) {
if (!window.sortOrders[tableName] || !window.sortOrders[tableName][field]) return '<i class="fas fa-sort" style="font-size:0.5rem;margin-left:2px;opacity:0.3;cursor:pointer;"></i>';
return window.sortOrders[tableName][field] === 'asc' ? '<i class="fas fa-sort-up" style="font-size:0.55rem;margin-left:2px;color:#A67C52;"></i>' : '<i class="fas fa-sort-down" style="font-size:0.55rem;margin-left:2px;color:#A67C52;"></i>';
}

function applySort(tableName, data, defaultField) {
if (!window.sortOrders[tableName]) window.sortOrders[tableName] = {};
var activeField = Object.keys(window.sortOrders[tableName]).find(function(k) { return window.sortOrders[tableName][k]; });
if (!activeField) activeField = defaultField;
var order = window.sortOrders[tableName][activeField] || 'asc';
return data.sort(function(a, b) {
var va = a[activeField], vb = b[activeField];
if (va === undefined || va === null) va = '';
if (vb === undefined || vb === null) vb = '';
if (typeof va === 'number' && typeof vb === 'number') return order === 'asc' ? va - vb : vb - va;
va = String(va).toLowerCase();
vb = String(vb).toLowerCase();
if (order === 'asc') return va > vb ? 1 : (va < vb ? -1 : 0);
else return va < vb ? 1 : (va > vb ? -1 : 0);
});
}

function makeSortableHeader(tableName, field, label, loadFnName) {
return '<th onclick="sortTableData(\'' + tableName + '\',\'' + field + '\', \'' + loadFnName + '\')" style="cursor:pointer;white-space:nowrap;">' + label + ' ' + getSortIcon(tableName, field) + '</th>';
}

// ==================== PAGINATION ====================
function getPaginationHTML(tableName, totalItems) {
var totalPages = Math.ceil(totalItems / window.itemsPerPage);
if (totalPages <= 1) return '';
var page = window.currentPages[tableName] || 1;
var html = '<div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:15px; flex-wrap:wrap;">';
html += '<button onclick="changePage(\'' + tableName + '\', ' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + ' style="padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer;">« Précédent</button>';
html += '<span style="font-weight:600;">Page ' + page + ' / ' + totalPages + '</span>';
html += '<button onclick="changePage(\'' + tableName + '\', ' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + ' style="padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer;">Suivant »</button>';
html += '</div>';
return html;
}

function changePage(tableName, newPage) {
var renderFunctions = {
categories: function() { if (typeof window.renderCategoriesTable === 'function') window.renderCategoriesTable(); },
products: function() { if (typeof window.renderProductsTable === 'function') window.renderProductsTable(); },
clients: function() { if (typeof window.renderClientsTable === 'function') window.renderClientsTable(); },
fournisseurs: function() { if (typeof window.renderFournisseursTable === 'function') window.renderFournisseursTable(); },
depenses: function() { if (typeof window.renderDepensesTable === 'function') window.renderDepensesTable(); },
commandes: function() { if (typeof window.renderCommandesTable === 'function') window.renderCommandesTable(); },
ventes: function() { if (typeof window.renderVentesTable === 'function') window.renderVentesTable(); },
credits: function() { if (typeof window.renderCreditsTable === 'function') window.renderCreditsTable(); },
users: function() { if (typeof window.renderUsersTable === 'function') window.renderUsersTable(); }
};
var dataArrays = {
categories: window.allCategoriesData, products: window.allProductsData, clients: window.allClientsData,
fournisseurs: window.allFournisseursData, depenses: window.allDepensesData,
commandes: window.filteredCommandes || window.allCommandesData,
ventes: window.filteredVentes || window.allVentesData,
credits: window.filteredCredits || window.allCreditsData,
users: window.filteredUsers || window.allUsersData
};
var totalItems = (dataArrays[tableName] || []).length;
var totalPages = Math.ceil(totalItems / window.itemsPerPage);
if (newPage < 1 || newPage > totalPages) return;
window.currentPages[tableName] = newPage;
if (renderFunctions[tableName]) renderFunctions[tableName]();
}

function getPageData(tableName, dataArray) {
var page = window.currentPages[tableName] || 1;
var start = (page - 1) * window.itemsPerPage;
return dataArray.slice(start, start + window.itemsPerPage);
}

// ==================== FILTRES ====================
function getPeriodOptions(selected) {
var periods = [
{ value: 'all', text: 'Toutes les dates' }, { value: 'today', text: 'Aujourd\'hui' },
{ value: '7', text: '7 jours' }, { value: '30', text: '30 jours' },
{ value: '90', text: '3 mois' }, { value: '365', text: '1 an' }
];
return periods.map(p => '<option value="' + p.value + '" ' + (selected == p.value ? 'selected' : '') + '>' + p.text + '</option>').join('');
}

function filterByPeriod(data, period) {
if (!period || period === 'all') return data;
var now = Date.now();
if (period === 'today') {
var today = new Date(); today.setHours(0,0,0,0);
return data.filter(function(d) { return d.createdAt && d.createdAt.seconds * 1000 >= today.getTime(); });
}
var days = parseInt(period);
if (isNaN(days)) return data;
var cutoff = now - days * 86400000;
return data.filter(function(d) { return d.createdAt && d.createdAt.seconds && d.createdAt.seconds * 1000 >= cutoff; });
}

function filterBySearch(data, query, fields) {
if (!query) return data;
var q = query.toLowerCase().trim();
return data.filter(function(d) {
for (var i = 0; i < fields.length; i++) {
var val = fields[i];
if (val.startsWith('items.')) {
var itemField = val.split('.')[1];
if (d.items && Array.isArray(d.items)) {
for (var j = 0; j < d.items.length; j++) {
if (d.items[j][itemField] && String(d.items[j][itemField]).toLowerCase().indexOf(q) !== -1) return true;
}
}
} else {
if (d[val] && String(d[val]).toLowerCase().indexOf(q) !== -1) return true;
}
}
return false;
});
}

// ==================== DASHBOARD PRO MINIMALISTE ====================
function loadDashboardPage(c) {
    injectAdminStyles();
    var userRole = (window.currentUserData && window.currentUserData.userData && window.currentUserData.userData.role) ? window.currentUserData.userData.role : 'admin';
    var userName = (window.currentUserData && window.currentUserData.userData) ? (window.currentUserData.userData.prenom || 'Utilisateur') : 'Utilisateur';

    var welcomeHTML =
        '<div class="dash-welcome">' +
            '<div>' +
                '<h1>Bonjour, ' + escapeHtml(userName) + ' 👋</h1>' +
                '<p>Voici votre tableau de bord E-SOLUTION POS</p>' +
            '</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">' +
                '<button onclick="openDashboardCalendar()" style="background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"><i class="fas fa-calendar-alt"></i> Calendrier</button>' +
                '<div class="dash-welcome-badge">' +
                    '<i class="fas fa-shield-halved"></i> ' +
                    '<span>' + (userRole === 'admin' ? 'Administrateur' : userRole === 'caissier' ? 'Caissier' : 'Client') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';

    var kpiHTML = '<div class="dash-kpi-grid">' +
        '<div class="dash-kpi">' +
            '<div class="dash-kpi-icon"><i class="fas fa-money-bill-wave"></i></div>' +
            '<span class="dash-kpi-label">CA du jour</span>' +
            '<span class="dash-kpi-value" id="kpiCaJour">0 MAD</span>' +
        '</div>' +
        '<div class="dash-kpi">' +
            '<div class="dash-kpi-icon"><i class="fas fa-shopping-cart"></i></div>' +
            '<span class="dash-kpi-label">Ventes du jour</span>' +
            '<span class="dash-kpi-value" id="kpiVentesJour">0</span>' +
        '</div>' +
        '<div class="dash-kpi">' +
            '<div class="dash-kpi-icon"><i class="fas fa-box"></i></div>' +
            '<span class="dash-kpi-label">Produits</span>' +
            '<span class="dash-kpi-value" id="productsCount">0</span>' +
        '</div>' +
        '<div class="dash-kpi">' +
            '<div class="dash-kpi-icon"><i class="fas fa-users"></i></div>' +
            '<span class="dash-kpi-label">Clients</span>' +
            '<span class="dash-kpi-value" id="clientsCount">0</span>' +
        '</div>' +
        '<div class="dash-kpi">' +
            '<div class="dash-kpi-icon"><i class="fas fa-credit-card"></i></div>' +
            '<span class="dash-kpi-label">Crédits impayés</span>' +
            '<span class="dash-kpi-value" id="kpiCreditsImpayes">0 MAD</span>' +
        '</div>' +
    '</div>';

    var alertsHTML = '<div class="smart-alert-grid">' +
        '<div class="smart-alert-card stock">' +
            '<div class="smart-alert-header">' +
                '<div class="smart-alert-icon"><i class="fas fa-box"></i></div>' +
                '<h4>Alertes Stock</h4>' +
            '</div>' +
            '<div id="alertStockContent"><i class="fas fa-spinner fa-spin" style="color:#94a3b8;"></i> Chargement...</div>' +
        '</div>' +
        '<div class="smart-alert-card expiration">' +
            '<div class="smart-alert-header">' +
                '<div class="smart-alert-icon"><i class="fas fa-calendar-check"></i></div>' +
                '<h4>Alertes Expiration</h4>' +
            '</div>' +
            '<div id="alertExpContent"><i class="fas fa-spinner fa-spin" style="color:#94a3b8;"></i> Chargement...</div>' +
        '</div>' +
        '<div class="smart-alert-card forecast">' +
            '<div class="smart-alert-header">' +
                '<div class="smart-alert-icon"><i class="fas fa-chart-line"></i></div>' +
                '<h4>Prévisions de ventes</h4>' +
            '</div>' +
            '<div id="alertPrevContent"><i class="fas fa-spinner fa-spin" style="color:#94a3b8;"></i> Chargement...</div>' +
        '</div>' +
    '</div>';

    var navItemsAdmin = [
        { page: 'pos', icon: 'fa-cash-register', label: 'POS', desc: 'Point de vente' },
        { page: 'calendrier', icon: 'fa-calendar-alt', label: 'Calendrier', desc: 'Événements & météo' },
        { page: 'statistiques', icon: 'fa-chart-bar', label: 'Statistiques', desc: 'Analyses' },
        { page: 'clients', icon: 'fa-users', label: 'Clients', desc: 'Gérer' },
        { page: 'fournisseurs', icon: 'fa-truck', label: 'Fournisseurs', desc: 'Gérer' },
        { page: 'products', icon: 'fa-box', label: 'Produits', desc: 'Gérer' },
        { page: 'categories', icon: 'fa-layer-group', label: 'Catégories', desc: 'Gérer' },
        { page: 'ventes', icon: 'fa-shopping-cart', label: 'Ventes', desc: 'Historique' },
        { page: 'credits', icon: 'fa-credit-card', label: 'Crédits', desc: 'Gérer' },
        { page: 'depenses', icon: 'fa-money-bill-wave', label: 'Dépenses', desc: 'Gérer' },
        { page: 'commandes', icon: 'fa-shopping-basket', label: 'Commandes', desc: 'En ligne' },
        { page: 'options', icon: 'fa-cog', label: 'Options', desc: 'Paramètres' }
    ];

    var navItemsCaissier = [
        { page: 'pos', icon: 'fa-cash-register', label: 'POS', desc: 'Point de vente' },
        { page: 'ventes', icon: 'fa-shopping-cart', label: 'Ventes', desc: 'Historique' },
        { page: 'credits', icon: 'fa-credit-card', label: 'Crédits', desc: 'Gérer' },
        { page: 'depenses', icon: 'fa-money-bill-wave', label: 'Dépenses', desc: 'Gérer' },
        { page: 'commandes', icon: 'fa-shopping-basket', label: 'Commandes', desc: 'En ligne' }
    ];
    var navItems = (userRole === 'caissier') ? navItemsCaissier : navItemsAdmin;

    var quickHTML = '<div class="dash-section">' +
        '<div class="dash-section-header">' +
            '<div>' +
                '<h3 class="dash-section-title"><i class="fas fa-th-large"></i> Accès rapide</h3>' +
                '<p class="dash-section-subtitle">Naviguez vers vos modules en un clic</p>' +
            '</div>' +
        '</div>' +
        '<div class="quick-access-grid">';

    navItems.forEach(function(item) {
        var clickAction = (item.page === 'calendrier') ? 'openDashboardCalendar()' : ('navigateTo(\'' + item.page + '\')');
        quickHTML += '<div class="qa-tile" onclick="' + clickAction + '">' +
            '<div class="qa-tile-icon"><i class="fas ' + item.icon + '"></i></div>' +
            '<div class="qa-tile-label">' + item.label + '</div>' +
            '<div class="qa-tile-desc">' + item.desc + '</div>' +
        '</div>';
    });

    quickHTML += '</div></div>';

    var pendingHTML = '<div class="dash-section">' +
        '<div class="dash-section-header">' +
            '<div>' +
                '<h3 class="dash-section-title"><i class="fas fa-bell"></i> Inscriptions en attente</h3>' +
                '<p class="dash-section-subtitle">Validez ou refusez les nouvelles demandes</p>' +
            '</div>' +
            '<button class="dash-btn-refresh" onclick="loadPendingRegistrations()">' +
                '<i class="fas fa-sync"></i> Actualiser' +
            '</button>' +
        '</div>' +
        '<div id="pendingRegistrations">Chargement...</div>' +
    '</div>';

    c.innerHTML = welcomeHTML + kpiHTML + alertsHTML + quickHTML + pendingHTML;

    loadDashboardStats();
    loadSmartAlerts();
    loadPendingRegistrations();

    if (typeof CacheDB !== 'undefined' && CacheDB.saveAll) {
        setTimeout(function() { CacheDB.saveAll(); }, 500);
    }
}

// ==================== 🧠 ALERTES INTELLIGENTES ====================
async function loadSmartAlerts() {
    try {
        var produits = window.allProductsData || [];
        if (produits.length === 0) {
            try {
                var snapP = await db.collection('products').get();
                produits = [];
                snapP.forEach(function(d) { var dd = d.data(); dd.id = d.id; produits.push(dd); });
            } catch(e) {}
        }

        var ventes30j = [];
        try {
            var cutoff30 = new Date(Date.now() - 30 * 86400000);
            var snapVentes = await db.collection('ventes').where('createdAt', '>=', cutoff30).get();
            snapVentes.forEach(function(d) { ventes30j.push(d.data()); });
        } catch(e) {
            try {
                var snapVAll = await db.collection('ventes').get();
                var cutoffMs = Date.now() - 30 * 86400000;
                snapVAll.forEach(function(d) {
                    var v = d.data();
                    if (v.createdAt && v.createdAt.seconds * 1000 >= cutoffMs) ventes30j.push(v);
                });
            } catch(e2) {}
        }

        var ventesParProduit = {};
        ventes30j.forEach(function(v) {
            (v.items || []).forEach(function(it) {
                var pid = it.id || it.nom;
                ventesParProduit[pid] = (ventesParProduit[pid] || 0) + (it.quantite || 0);
            });
        });

        var alertesStock = [];
        produits.forEach(function(p) {
            var vendues30 = ventesParProduit[p.id] || ventesParProduit[p.nom] || 0;
            var vitesseJour = vendues30 / 30;
            var stock = p.stock || 0;
            var jours = vitesseJour > 0 ? (stock / vitesseJour) : (stock > 0 ? Infinity : 0);

            var niveau = 'ok';
            if (stock <= 0) niveau = 'rupture';
            else if (jours <= 2) niveau = 'rouge';
            else if (jours <= 5) niveau = 'orange';
            else if (jours <= 10) niveau = 'jaune';

            if (niveau !== 'ok') {
                alertesStock.push({ nom: p.nom, stock: stock, jours: jours, niveau: niveau });
            }
        });

        var alertesExpiration = [];
        var today = new Date(); today.setHours(0,0,0,0);
        produits.forEach(function(p) {
            if (!p.dateExpiration) return;
            var d = null;
            if (typeof p.dateExpiration === 'string') d = new Date(p.dateExpiration);
            else if (p.dateExpiration.seconds) d = new Date(p.dateExpiration.seconds * 1000);
            else if (p.dateExpiration.toDate) d = p.dateExpiration.toDate();
            if (!d || isNaN(d.getTime())) return;
            d.setHours(0,0,0,0);
            var joursRestants = Math.ceil((d - today) / 86400000);

            var niveau = 'ok';
            if (joursRestants < 0) niveau = 'expire';
            else if (joursRestants <= 3) niveau = 'rouge';
            else if (joursRestants <= 7) niveau = 'orange';
            else if (joursRestants <= 30) niveau = 'jaune';

            if (niveau !== 'ok') {
                alertesExpiration.push({ nom: p.nom, dateExp: d, jours: joursRestants, niveau: niveau });
            }
        });

        var ventesParJour = {};
        try {
            var cutoff90 = new Date(Date.now() - 90 * 86400000);
            var snapV90 = await db.collection('ventes').where('createdAt', '>=', cutoff90).get();
            snapV90.forEach(function(d) {
                var v = d.data();
                if (!v.createdAt || !v.createdAt.seconds) return;
                var key = new Date(v.createdAt.seconds * 1000).toISOString().split('T')[0];
                ventesParJour[key] = (ventesParJour[key] || 0) + (v.total || 0);
            });
        } catch(e) {
            try {
                var snapVAll2 = await db.collection('ventes').get();
                var cutoffMs2 = Date.now() - 90 * 86400000;
                snapVAll2.forEach(function(d) {
                    var v = d.data();
                    if (v.createdAt && v.createdAt.seconds * 1000 >= cutoffMs2) {
                        var key = new Date(v.createdAt.seconds * 1000).toISOString().split('T')[0];
                        ventesParJour[key] = (ventesParJour[key] || 0) + (v.total || 0);
                    }
                });
            } catch(e2) {}
        }

        var total30 = 0, count30 = 0;
        for (var i = 0; i < 30; i++) {
            var d = new Date(Date.now() - i * 86400000);
            var k = d.toISOString().split('T')[0];
            total30 += (ventesParJour[k] || 0);
            count30++;
        }
        var caPrevuJour = count30 > 0 ? (total30 / count30) : 0;
        var caPrevu7j = caPrevuJour * 7;

        var stockRouge = alertesStock.filter(function(a) { return a.niveau === 'rouge' || a.niveau === 'rupture'; }).length;
        var stockOrange = alertesStock.filter(function(a) { return a.niveau === 'orange'; }).length;
        var stockJaune = alertesStock.filter(function(a) { return a.niveau === 'jaune'; }).length;

        var expRouge = alertesExpiration.filter(function(a) { return a.niveau === 'rouge' || a.niveau === 'expire'; }).length;
        var expOrange = alertesExpiration.filter(function(a) { return a.niveau === 'orange'; }).length;
        var expJaune = alertesExpiration.filter(function(a) { return a.niveau === 'jaune'; }).length;

        var elStock = document.getElementById('alertStockContent');
        if (elStock) {
            if (alertesStock.length === 0) {
                elStock.innerHTML = '<div class="smart-alert-summary" style="color:#16a34a;"><i class="fas fa-check-circle"></i> Tous les stocks sont optimaux</div>';
            } else {
                elStock.innerHTML =
                    '<div class="smart-alert-badges">' +
                        (stockRouge > 0 ? '<span class="smart-badge red"><i class="fas fa-times-circle"></i> Critique : ' + stockRouge + '</span>' : '') +
                        (stockOrange > 0 ? '<span class="smart-badge orange"><i class="fas fa-exclamation-triangle"></i> Bas : ' + stockOrange + '</span>' : '') +
                        (stockJaune > 0 ? '<span class="smart-badge yellow"><i class="fas fa-clock"></i> À surveiller : ' + stockJaune + '</span>' : '') +
                    '</div>' +
                    '<div class="smart-alert-summary"><strong>' + alertesStock.length + '</strong> produit(s) nécessitent votre attention</div>';
            }
        }

        var elExp = document.getElementById('alertExpContent');
        if (elExp) {
            if (alertesExpiration.length === 0) {
                elExp.innerHTML = '<div class="smart-alert-summary" style="color:#16a34a;"><i class="fas fa-check-circle"></i> Aucun produit n\'expire bientôt</div>';
            } else {
                elExp.innerHTML =
                    '<div class="smart-alert-badges">' +
                        (expRouge > 0 ? '<span class="smart-badge red"><i class="fas fa-times-circle"></i> Critique : ' + expRouge + '</span>' : '') +
                        (expOrange > 0 ? '<span class="smart-badge orange"><i class="fas fa-clock"></i> Bientôt : ' + expOrange + '</span>' : '') +
                        (expJaune > 0 ? '<span class="smart-badge yellow"><i class="fas fa-calendar"></i> À surveiller : ' + expJaune + '</span>' : '') +
                    '</div>' +
                    '<div class="smart-alert-summary"><strong>' + alertesExpiration.length + '</strong> lot(s) d\'expiration à surveiller</div>';
            }
        }

        var elPrev = document.getElementById('alertPrevContent');
        if (elPrev) {
            elPrev.innerHTML =
                '<div class="smart-forecast-grid">' +
                    '<div class="smart-forecast-item today">' +
                        '<span class="label">Aujourd\'hui</span>' +
                        '<span class="value">' + caPrevuJour.toFixed(2) + ' MAD</span>' +
                    '</div>' +
                    '<div class="smart-forecast-item week">' +
                        '<span class="label">7 jours</span>' +
                        '<span class="value">' + caPrevu7j.toFixed(2) + ' MAD</span>' +
                    '</div>' +
                '</div>' +
                '<div class="smart-alert-summary" style="margin-top:10px;"><i class="fas fa-info-circle"></i> Basé sur la moyenne des <strong>30 derniers jours</strong></div>';
        }

    } catch(e) {
        console.error('❌ Erreur loadSmartAlerts:', e);
    }
}
window.loadSmartAlerts = loadSmartAlerts;

function loadDashboardStats() {
    db.collection('products').get().then(function(s) { var e = document.getElementById('productsCount'); if (e) e.textContent = s.size; });
    db.collection('clients').get().then(function(s) { var e = document.getElementById('clientsCount'); if (e) e.textContent = s.size; });
    db.collection('categories').get().then(function(s) { var e = document.getElementById('categoriesCount'); if (e) e.textContent = s.size; });
    db.collection('ventes').get().then(function(s) { var e = document.getElementById('ventesCount'); if (e) e.textContent = s.size; });

    db.collection('ventes').get().then(function(snapshot) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var caJour = 0, nbVentesJour = 0;
        snapshot.forEach(function(doc) {
            var d = doc.data();
            var dateVente = null;
            if (d.createdAt && d.createdAt.seconds) dateVente = new Date(d.createdAt.seconds * 1000);
            else if (d.createdAt && d.createdAt.toDate) dateVente = d.createdAt.toDate();
            if (dateVente && dateVente >= today) {
                caJour += parseFloat(d.total) || 0;
                nbVentesJour += 1;
            }
        });
        var caEl = document.getElementById('kpiCaJour');
        if (caEl) caEl.textContent = caJour.toFixed(2) + ' MAD';
        var vEl = document.getElementById('kpiVentesJour');
        if (vEl) vEl.textContent = nbVentesJour;
    }).catch(function(e) { console.warn('Erreur stats jour:', e); });

    db.collection('credits').get().then(function(snapshot) {
        var totalImpaye = 0;
        snapshot.forEach(function(doc) {
            var d = doc.data();
            if (d.paid === false) {
                totalImpaye += parseFloat(d.remainingAmount || d.total) || 0;
            }
        });
        var el = document.getElementById('kpiCreditsImpayes');
        if (el) el.textContent = totalImpaye.toFixed(2) + ' MAD';
    }).catch(function(e) { console.warn('Erreur crédits:', e); });
}

// ==================== INSCRIPTIONS EN ATTENTE ====================
function loadPendingRegistrations() {
var d = document.getElementById('pendingRegistrations');
if (!d) return;
d.innerHTML = `
<div class="table-container">
<table class="data-table" id="pendingTable">
<thead>
<tr>
<th>Utilisateur</th>
<th>Email</th>
<th>Rôle</th>
<th>Date</th>
<th>Actions</th>
</tr>
</thead>
<tbody></tbody>
</table>
</div>
`;
db.collection('users').get().then(function(snapshot) {
window.pendingUsersData = [];
snapshot.forEach(function(dc) {
var u = dc.data();
if (u.authorized === 'no') {
window.pendingUsersData.push({
id: dc.id,
prenom: (u.prenom || '') + ' ' + (u.nom || ''),
email: u.email || '',
role: u.role || 'client',
createdAt: u.createdAt,
data: u
});
}
});
window.pendingUsersData.sort(function(a, b) {
var dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000).getTime() : 0;
var dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000).getTime() : 0;
return dateB - dateA;
});
renderPendingTable();
}).catch(function(err) {
console.error('❌ Erreur chargement pending:', err);
window.pendingUsersData = [];
renderPendingTable();
});
}

function renderPendingTable() {
var tb = document.querySelector('#pendingTable tbody');
if (!tb) return;
tb.innerHTML = '';
var data = window.pendingUsersData || [];
if (data.length === 0) {
tb.innerHTML = `
<tr>
<td colspan="5" style="text-align:center;padding:32px;color:#6F767E;font-size:0.88rem;">
<i class="fas fa-check-circle" style="color:#16a34a;margin-right:6px;"></i> Aucune inscription en attente
</td>
</tr>
`;
return;
}
for (var i = 0; i < data.length; i++) {
var x = data[i];
var dt = x.createdAt ? new Date(x.createdAt.seconds * 1000).toLocaleDateString('fr-FR') + ' ' +
new Date(x.createdAt.seconds * 1000).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : 'N/A';
tb.innerHTML += `
<tr>
<td><strong style="color:#1A1D1F;">${escapeHtml(x.prenom)}</strong></td>
<td style="color:#6F767E;">${escapeHtml(x.email)}</td>
<td><span class="status-warning">${escapeHtml(x.role)}</span></td>
<td style="color:#6F767E;">${dt}</td>
<td>
<button class="btn-add" onclick="approveUser('${x.id}')">
<i class="fas fa-check"></i> Accepter
</button>
<button class="btn-delete" style="margin-left:6px;" onclick="rejectUser('${x.id}')">
<i class="fas fa-times"></i> Refuser
</button>
</td>
</tr>
`;
}
}

// ==================== APPROVE / REJECT USER ====================
async function approveUser(uid) {
if (!confirm('Accepter cet utilisateur ?')) return;
try {
const doc = await db.collection('users').doc(uid).get();
if (!doc.exists) { alert('❌ Utilisateur introuvable'); return; }
const userData = doc.data();
await db.collection('users').doc(uid).update({ authorized: 'yes', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
const updatedUser = { ...userData, authorized: 'yes', updatedAt: new Date() };
await CacheDB.set('users', uid, { uid: uid, userData: updatedUser });
if (userData.role === 'client') {
const clientData = {
nom: userData.nom || '', prenom: userData.prenom || '', email: userData.email || '',
telephone: userData.telephone || '', username: userData.username || '', authorized: 'yes',
pointsFidelite: 0, ca: 0, profit: 0,
createdAt: firebase.firestore.FieldValue.serverTimestamp(),
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};
const clientDoc = await db.collection('clients').doc(uid).get();
if (clientDoc.exists) await db.collection('clients').doc(uid).update(clientData);
else await db.collection('clients').doc(uid).set(clientData);
await CacheDB.set('clients', uid, { id: uid, ...clientData });
}
if (window.currentUserData && window.currentUserData.uid === uid) {
window.currentUserData.userData.authorized = 'yes';
await CacheDB.set('users', 'current', window.currentUserData);
}
await CacheDB.sync();
if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('users');
    CacheDB.saveCollection('clients');
}
alert('✅ Utilisateur accepté avec succès !');
if (typeof loadPendingRegistrations === 'function') loadPendingRegistrations();
if (typeof loadUsersList === 'function') loadUsersList();
if (typeof loadClients === 'function') loadClients();
} catch (e) {
console.error('❌ Erreur approveUser:', e);
alert('❌ Erreur : ' + e.message);
}
}

async function rejectUser(uid) {
if (!confirm('Refuser et supprimer cet utilisateur ?')) return;
try {
await db.collection('users').doc(uid).delete();
await CacheDB.delete('users', uid);
const clientDoc = await db.collection('clients').doc(uid).get();
if (clientDoc.exists) {
await db.collection('clients').doc(uid).delete();
await CacheDB.delete('clients', uid);
}
await CacheDB.sync();
if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
    CacheDB.saveCollection('users');
    CacheDB.saveCollection('clients');
}
alert('✅ Utilisateur supprimé');
if (typeof loadPendingRegistrations === 'function') loadPendingRegistrations();
if (typeof loadUsersList === 'function') loadUsersList();
if (typeof loadClients === 'function') loadClients();
} catch (e) {
console.error('❌ Erreur rejectUser:', e);
alert('❌ Erreur : ' + e.message);
}
}

// ==================== OPTIONS ====================
function loadOptionsPage(c) {
if (!window.currentUserData || window.currentUserData.userData.role !== 'admin') {
c.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#ef4444;">Accès réservé à l\'administrateur</p></div>';
return;
}
c.innerHTML = '<div class="stats-grid">' +
'<div class="stat-card"><div class="stat-icon" style="background:#fef3c7;"><i class="fas fa-clock" style="color:#d97706;"></i></div><div class="stat-info"><span>En attente</span><span class="stat-value" id="pendingCount">0</span></div></div>' +
'<div class="stat-card"><div class="stat-icon" style="background:#dcfce7;"><i class="fas fa-check-circle" style="color:#16a34a;"></i></div><div class="stat-info"><span>Autorisés</span><span class="stat-value" id="authorizedCount">0</span></div></div>' +
'<div class="stat-card"><div class="stat-icon" style="background:#e0e7ff;"><i class="fas fa-users" style="color:#4f46e5;"></i></div><div class="stat-info"><span>Total</span><span class="stat-value" id="totalUsers">0</span></div></div>' +
'</div>' +
'<div class="content-card"><div class="card-header"><h3><i class="fas fa-lock"></i> Sécurité</h3><button class="btn-add" onclick="toggleChangePasswordForm()"><i class="fas fa-key"></i> Changer le mot de passe</button></div><div id="changePasswordForm" class="hidden" style="margin-top:15px;"><div class="form-row"><div class="form-group"><label>Mot de passe actuel</label><input type="password" id="currentPassword"></div></div><div class="form-row"><div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="newPassword"></div><div class="form-group"><label>Confirmer</label><input type="password" id="confirmPassword"></div></div><button class="btn-save" onclick="changeAdminPassword()">Changer le mot de passe</button></div></div>' +
'<div class="content-card"><div class="card-header"><h3><i class="fas fa-bullhorn"></i> Fidélité</h3><button class="btn-add" onclick="toggleMarketingProgram()"><i class="fas fa-cog"></i> Gérer</button></div><div id="marketingProgramContent" class="hidden" style="margin-top:15px;"><div style="display:flex;align-items:flex-end;gap:20px;"><div class="form-group"><label>Activer</label><select id="fideliteActifSelect"><option value="1">✅ Actif</option><option value="0">❌ Inactif</option></select></div><div class="form-group"><label>Points/vente</label><input type="number" id="fidelitePointsInput" value="1" min="1" style="width:80px;"></div><button class="btn-save" onclick="saveFideliteSettings()">Enregistrer</button></div></div></div>' +
'<div class="content-card">' +
    '<div class="card-header">' +
        '<h3><i class="fas fa-qrcode"></i> Générateur de QR Codes</h3>' +
        '<span style="font-size:0.8rem;color:#6F767E;">Les QR codes restent valables indéfiniment</span>' +
    '</div>' +
    '<div style="padding:16px 0;border-bottom:1px solid #EAECEF;margin-bottom:16px;">' +
        '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;">' +
            '<div><label style="font-weight:600;font-size:0.8rem;color:#6F767E;display:block;margin-bottom:4px;">Titre (optionnel)</label><input type="text" id="qrTitreInput" placeholder="Ex: Menu restaurant" style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>' +
            '<div><label style="font-weight:600;font-size:0.8rem;color:#6F767E;display:block;margin-bottom:4px;">Lien / URL *</label><input type="url" id="qrUrlInput" placeholder="https://exemple.com" style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;"></div>' +
        '</div>' +
        '<button onclick="qrAdd()" class="btn-add" style="margin-top:12px;padding:10px 24px;font-size:0.9rem;"><i class="fas fa-plus"></i> Générer et ajouter un QR Code</button>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">' +
        '<strong style="font-size:0.95rem;color:#1A1D1F;">Mes QR Codes (<span id="qrCount">0</span>)</strong>' +
        '<input type="text" id="qrSearchInput" placeholder="🔍 Rechercher..." onkeyup="window.qrSearchQuery=this.value.trim().toLowerCase();qrRender();" style="padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;width:200px;font-size:0.85rem;">' +
    '</div>' +
    '<div id="qrListContainer" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;"></div>' +
'</div>' +
'<div class="content-card"><div class="card-header"><h3><i class="fas fa-users"></i> Utilisateurs</h3><div style="display:flex;gap:10px;"><input type="text" id="usersSearchInput" placeholder="🔍 Rechercher..." style="padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;width:220px;" onkeyup="window.usersSearchQuery=this.value.trim().toLowerCase();renderUsersTable();"><button class="btn-add" onclick="loadUsersList()">Actualiser</button></div></div><div class="table-container"><table class="data-table" id="usersTable"><thead><tr><th>Username</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div>';
loadUsersList();
loadFideliteSettings();
qrLoadAll();

if (typeof CacheDB !== 'undefined' && CacheDB.saveAll) {
    setTimeout(function() { CacheDB.saveAll(); }, 500);
}
}

function loadUsersList() {
db.collection('users').get().then(function(sn) {
window.allUsersData = [];
sn.forEach(function(dc) { var d = dc.data(); d.id = dc.id; d.fullName = (d.prenom + ' ' + d.nom).toLowerCase(); window.allUsersData.push(d); });
var p = window.allUsersData.filter(function(u) { return u.authorized === 'no'; }).length;
var a = window.allUsersData.filter(function(u) { return u.authorized === 'yes'; }).length;
document.getElementById('pendingCount').textContent = p;
document.getElementById('authorizedCount').textContent = a;
document.getElementById('totalUsers').textContent = window.allUsersData.length;
renderUsersTable();
});
}

function renderUsersTable() {
var tb = document.querySelector('#usersTable tbody');
if (!tb) return;
var data = window.allUsersData.slice();
if (window.usersSearchQuery) { data = data.filter(function(u) { return (u.email || '').toLowerCase().indexOf(window.usersSearchQuery) !== -1 || (u.username || '').toLowerCase().indexOf(window.usersSearchQuery) !== -1 || (u.fullName || '').indexOf(window.usersSearchQuery) !== -1; }); }
tb.innerHTML = '';
if (data.length === 0) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Aucun</td></tr>'; return; }
data.forEach(function(u) {
var badge = u.authorized === 'yes' ? '<span class="status-success">✅ OK</span>' : '<span class="status-warning">⏳ En attente</span>';
var act = u.authorized === 'no' ?
'<button class="btn-add" style="padding:4px 8px;font-size:0.7rem;margin-right:4px;" onclick="approveUser(\'' + u.id + '\')">✔</button><button class="btn-delete" style="padding:4px 8px;font-size:0.7rem;" onclick="rejectUser(\'' + u.id + '\')">✖</button>'
: '<button style="padding:4px 8px;font-size:0.7rem;margin-right:4px;color:#d97706;border:none;background:#fef3c7;border-radius:6px;cursor:pointer;" onclick="blockUser(\'' + u.id + '\')">⛔ Bloquer</button><button class="btn-delete" style="padding:4px 8px;font-size:0.7rem;" onclick="deleteUserPermanently(\'' + u.id + '\')">🗑</button>';
tb.innerHTML += '<tr><td><strong>@' + escapeHtml(u.username || '') + '</strong></td><td>' + escapeHtml(u.prenom || '') + ' ' + escapeHtml(u.nom || '') + '</td><td>' + escapeHtml(u.email || '') + '</td><td>' + escapeHtml(u.role || '') + '</td><td>' + badge + '</td><td>' + act + '</td></tr>';
});
}

function blockUser(uid) { if (confirm('Bloquer ?')) { CacheDB.write('users', uid, { authorized: 'no' }, 'update').then(function() { loadUsersList(); loadPendingRegistrations(); CacheDB.sync(); }); } }
function deleteUserPermanently(uid) { if (confirm('Supprimer ?')) { CacheDB.write('users', uid, null, 'delete').then(function() { loadUsersList(); loadPendingRegistrations(); CacheDB.sync(); }); } }

function toggleChangePasswordForm() { document.getElementById('changePasswordForm').classList.toggle('hidden'); }

async function changeAdminPassword() {
var cp = document.getElementById('currentPassword').value.trim();
var np = document.getElementById('newPassword').value.trim();
var conf = document.getElementById('confirmPassword').value.trim();
if (!cp || !np || !conf) { alert('Tous les champs obligatoires'); return; }
if (np.length < 6) { alert('6 caractères minimum'); return; }
if (np !== conf) { alert('Ne correspondent pas'); return; }
var user = auth.currentUser;
if (!user) { alert('Non connecté'); return; }
try {
await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, cp));
await user.updatePassword(np);
alert('✅ Mot de passe changé');
document.getElementById('currentPassword').value = '';
document.getElementById('newPassword').value = '';
document.getElementById('confirmPassword').value = '';
toggleChangePasswordForm();
} catch (e) {
if (e.code === 'auth/wrong-password') alert('❌ Mot de passe actuel incorrect');
else alert('Erreur: ' + e.message);
}
}

function toggleMarketingProgram() { var d = document.getElementById('marketingProgramContent'); if (d) { d.classList.toggle('hidden'); if (!d.classList.contains('hidden')) loadFideliteSettings(); } }

async function loadFideliteSettings() {
var a = true, p = 1;
try { var doc = await db.collection('settings').doc('fidelite').get(); if (doc.exists) { a = doc.data().active === true; p = doc.data().pointsParVente || 1; } } catch (e) {}
document.getElementById('fideliteActifSelect').value = a ? '1' : '0';
document.getElementById('fidelitePointsInput').value = p;
}

async function saveFideliteSettings() {
var a = document.getElementById('fideliteActifSelect').value === '1';
var p = parseInt(document.getElementById('fidelitePointsInput').value) || 1;
try { await db.collection('settings').doc('fidelite').set({ active: a, pointsParVente: p }, { merge: true }); } catch (e) {}
localStorage.setItem('fidelite_active', a); localStorage.setItem('fidelite_points', p);
alert('✅ Enregistré');
}

// ==================== QR CODES ====================
function qrGenerateUniqueId() { return 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

async function qrLoadAll() {
    try {
        var doc = await db.collection('settings').doc('qrcodes').get();
        if (doc.exists && Array.isArray(doc.data().items)) window.allQrCodesData = doc.data().items;
        else window.allQrCodesData = [];
    } catch(e) {
        console.warn('⚠️ Erreur chargement QR:', e);
        window.allQrCodesData = [];
    }
    qrRender();
}

async function qrSaveAll() {
    try {
        await db.collection('settings').doc('qrcodes').set({ items: window.allQrCodesData }, { merge: true });
        if (typeof CacheDB !== 'undefined' && CacheDB.set) CacheDB.set('settings', 'qrcodes', { items: window.allQrCodesData });
    } catch(e) { console.warn('⚠️ Erreur sauvegarde QR:', e); }
}

function qrAdd() {
    var titreInput = document.getElementById('qrTitreInput');
    var urlInput = document.getElementById('qrUrlInput');
    if (!urlInput) return;
    var titre = (titreInput && titreInput.value) ? titreInput.value.trim() : '';
    var url = urlInput.value.trim();
    if (!url) { alert('❌ Veuillez saisir un lien / URL.'); urlInput.focus(); return; }
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) url = 'https://' + url;
    if (typeof QRCode === 'undefined') {
        alert('❌ Bibliothèque QRCode.js non chargée.');
        return;
    }
    var newQr = { id: qrGenerateUniqueId(), titre: titre || ('QR Code ' + (window.allQrCodesData.length + 1)), url: url, createdAt: new Date().toISOString() };
    window.allQrCodesData.unshift(newQr);
    qrSaveAll();
    qrRender();
    if (titreInput) titreInput.value = '';
    if (urlInput) urlInput.value = '';
    alert('✅ QR Code ajouté avec succès !');
}

function qrRender() {
    var container = document.getElementById('qrListContainer');
    if (!container) return;
    var countEl = document.getElementById('qrCount');
    var data = window.allQrCodesData || [];
    if (window.qrSearchQuery) {
        var q = window.qrSearchQuery;
        data = data.filter(function(item) {
            return (item.titre || '').toLowerCase().indexOf(q) !== -1 || (item.url || '').toLowerCase().indexOf(q) !== -1;
        });
    }
    if (countEl) countEl.textContent = (window.allQrCodesData || []).length;
    if (data.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9A9FA5;"><i class="fas fa-qrcode" style="font-size:2.5rem;display:block;margin-bottom:10px;"></i>Aucun QR code. Ajoutez-en un ci-dessus.</div>';
        return;
    }
    var html = '';
    data.forEach(function(item) {
        var dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '';
        html += '<div style="background:#FFFFFF;border:1px solid #EAECEF;border-radius:14px;padding:16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">' +
            '<div style="font-weight:700;font-size:0.95rem;color:#1A1D1F;word-break:break-word;">' + escapeHtml(item.titre) + '</div>' +
            '<div id="qr_' + item.id + '" style="display:flex;align-items:center;justify-content:center;padding:8px;background:#FFFFFF;border-radius:10px;border:1px solid #EAECEF;"></div>' +
            '<div style="font-size:0.75rem;color:#6F767E;word-break:break-all;max-width:100%;">' + escapeHtml(item.url) + '</div>' +
            '<div style="font-size:0.7rem;color:#9A9FA5;">' + dateStr + '</div>' +
            '<div style="display:flex;gap:6px;margin-top:4px;">' +
                '<button onclick="qrDownload(\'' + item.id + '\')" title="Télécharger PNG" style="background:#2563EB;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-download"></i></button>' +
                '<button onclick="qrCopy(\'' + item.id + '\')" title="Copier le lien" style="background:#8B5CF6;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-copy"></i></button>' +
                '<button onclick="qrDelete(\'' + item.id + '\')" title="Supprimer" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-trash"></i></button>' +
            '</div>' +
        '</div>';
    });
    container.innerHTML = html;
    setTimeout(function() {
        data.forEach(function(item) {
            var el = document.getElementById('qr_' + item.id);
            if (!el) return;
            el.innerHTML = '';
            try {
                new QRCode(el, {
                    text: item.url, width: 180, height: 180,
                    colorDark: '#1A1D1F', colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch(e) { console.warn('Erreur génération QR:', e); el.innerHTML = '<span style="color:#ef4444;font-size:0.75rem;">Erreur QR</span>'; }
        });
    }, 50);
}

function qrDownload(id) {
    var item = (window.allQrCodesData || []).find(function(x) { return x.id === id; });
    if (!item) return;
    var el = document.getElementById('qr_' + id);
    if (!el) return;
    var canvas = el.querySelector('canvas');
    var img = el.querySelector('img');
    var dataUrl = null;
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img) dataUrl = img.src;
    if (!dataUrl) { alert('❌ Impossible de télécharger le QR code.'); return; }
    var safeTitre = (item.titre || 'qrcode').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
    var filename = 'QR_' + safeTitre + '_' + item.id + '.png';
    var link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function qrCopy(id) {
    var item = (window.allQrCodesData || []).find(function(x) { return x.id === id; });
    if (!item) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(item.url).then(function() { alert('✅ Lien copié dans le presse-papier !'); }).catch(function() { prompt('Copiez manuellement :', item.url); });
    } else { prompt('Copiez manuellement :', item.url); }
}

async function qrDelete(id) {
    if (!confirm('Supprimer ce QR code ?')) return;
    window.allQrCodesData = (window.allQrCodesData || []).filter(function(x) { return x.id !== id; });
    await qrSaveAll();
    qrRender();
    alert('✅ QR code supprimé');
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
console.log('📍 Navigation vers:', page);
var content = document.getElementById('dynamicContent');
if (!content) return;

if (page === 'depenses' && window.currentUserData && window.currentUserData.userData.role === 'caissier') {
    content.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i></div>';
    if (typeof window.loadDepensesPage === 'function') window.loadDepensesPage(content);
    else if (typeof loadDepensesPage === 'function') loadDepensesPage(content);
    else content.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#94a3b8;">Dépenses non disponibles</p></div>';
    closeSidebar();
    return;
}

var titles = {
'dashboard': 'Dashboard', 'pos': 'POS', 'commandes': 'Commandes en ligne',
'categories': 'Catégories', 'products': 'Produits', 'clients': 'Clients',
'fournisseurs': 'Fournisseurs', 'ventes': 'Ventes', 'credits': 'Crédits',
'depenses': 'Dépenses', 'statistiques': 'Statistiques', 'options': 'Options'
};
var icons = {
'dashboard': 'fa-chart-line', 'pos': 'fa-cash-register', 'commandes': 'fa-shopping-basket',
'categories': 'fa-layer-group', 'products': 'fa-coffee', 'clients': 'fa-users',
'fournisseurs': 'fa-truck', 'ventes': 'fa-shopping-cart', 'credits': 'fa-credit-card',
'depenses': 'fa-money-bill-wave', 'statistiques': 'fa-chart-bar', 'options': 'fa-cog'
};
var titleEl = document.getElementById('pageTitle');
if (titleEl) titleEl.textContent = titles[page] || page;
var iconEl = document.querySelector('.header-title i');
if (iconEl && icons[page]) iconEl.className = 'fas ' + icons[page];

if (page === 'pos') {
if (typeof window.loadPosPage === 'function') window.loadPosPage(content);
else if (typeof loadPosPage === 'function') loadPosPage(content);
else {
content.innerHTML = `<div class="content-card"><p style="text-align:center;padding:40px;"><i class="fas fa-cash-register" style="font-size:3rem;display:block;color:#A67C52;margin-bottom:15px;"></i>Chargement du POS...</p></div>`;
setTimeout(function() { if (typeof window.loadPosPage === 'function') window.loadPosPage(content); }, 500);
}
closeSidebar();
return;
}

var pageFunctions = {
'dashboard': window.loadDashboardPage || loadDashboardPage,
'commandes': window.loadCommandesPage || loadCommandesPage,
'categories': window.loadCategoriesPage || loadCategoriesPage,
'products': window.loadProductsPage || loadProductsPage,
'clients': window.loadClientsPage || loadClientsPage,
'fournisseurs': window.loadFournisseursPage || loadFournisseursPage,
'ventes': window.loadVentesPage || loadVentesPage,
'credits': window.loadCreditsPage || loadCreditsPage,
'depenses': window.loadDepensesPage || loadDepensesPage,
'statistiques': window.loadStatistiquesPage || loadStatistiquesPage,
'options': window.loadOptionsPage || loadOptionsPage
};

var fn = pageFunctions[page];
if (fn && typeof fn === 'function') {
try { fn(content); } catch(e) {
console.error('Erreur chargement page:', e);
content.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#ef4444;">Erreur de chargement: ' + e.message + '</p></div>';
}
} else {
content.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#94a3b8;">Page en développement</p></div>';
}

closeSidebar();
}

// ==================== EXPORTS ====================
window.openModal = openModal;
window.closeModal = closeModal;
window.fileToBase64 = fileToBase64;
window.previewImage = previewImage;
window.saveDocument = saveDocument;
window.deleteDocument = deleteDocument;
window.refreshCurrentPage = refreshCurrentPage;
window.editDocument = editDocument;
window.sortTableData = sortTableData;
window.applySort = applySort;
window.makeSortableHeader = makeSortableHeader;
window.getPaginationHTML = getPaginationHTML;
window.changePage = changePage;
window.getPageData = getPageData;
window.getPeriodOptions = getPeriodOptions;
window.filterByPeriod = filterByPeriod;
window.filterBySearch = filterBySearch;
window.loadDashboardPage = loadDashboardPage;
window.loadDashboardStats = loadDashboardStats;
window.loadSmartAlerts = loadSmartAlerts;
window.injectAdminStyles = injectAdminStyles;
window.loadPendingRegistrations = loadPendingRegistrations;
window.renderPendingTable = renderPendingTable;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.loadOptionsPage = loadOptionsPage;
window.loadUsersList = loadUsersList;
window.renderUsersTable = renderUsersTable;
window.blockUser = blockUser;
window.deleteUserPermanently = deleteUserPermanently;
window.toggleChangePasswordForm = toggleChangePasswordForm;
window.changeAdminPassword = changeAdminPassword;
window.toggleMarketingProgram = toggleMarketingProgram;
window.loadFideliteSettings = loadFideliteSettings;
window.saveFideliteSettings = saveFideliteSettings;
window.navigateTo = navigateTo;

window.qrLoadAll = qrLoadAll;
window.qrAdd = qrAdd;
window.qrRender = qrRender;
window.qrDownload = qrDownload;
window.qrCopy = qrCopy;
window.qrDelete = qrDelete;
window.qrSaveAll = qrSaveAll;

window.openDashboardCalendar = openDashboardCalendar;
window.dcCloseCalendar = dcCloseCalendar;

// 🆕 CRUD événements personnels ET par défaut
window.dcpOpenEventForm = dcpOpenEventForm;
window.dcpCloseEventForm = dcpCloseEventForm;
window.dcpSaveEvent = dcpSaveEvent;
window.dcpDeleteEvent = dcpDeleteEvent;

// 🆕 Système d'alarmes
window.dcpScheduleAlarms = dcpScheduleAlarms;
window.dcpRequestNotificationPermission = dcpRequestNotificationPermission;

console.log('☕ Mixmax Minimarket - Admin JS complet (corrigé window.)');
console.log('🧠 Alertes intelligentes : Stock / Expiration / Prévisions ventes');
console.log('🎨 Dashboard PRO minimaliste : UNE SEULE couleur #2563EB (aligné POS)');
console.log('📱 100% responsive');
console.log('🆕 📅 Calendrier PRO : ville + filtres période + fêtes préétablies + saisons');
console.log('🆕 ➕ CRUD événements personnels (ajouter / modifier / supprimer)');
console.log('🆕 ✏️ Événements par défaut modifiables/supprimables (overrides Firestore)');
console.log('🆕 🔔 Heure + alarme/notification pour chaque événement');
