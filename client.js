// ==================== CLIENT.JS - E-SOLUTION (VERSION FINALE POS IDENTIQUE) ====================
// ✅ Le client voit EXACTEMENT le même POS que l'admin/caissier
// ✅ Réutilise directement pos.js : buildFullPOS, filterProductGrid, updateCartOnly, etc.
// ✅ 🆕 v4 : Historique ventes + crédits + total crédits restant / Fidélité convertible en DH
// ✅ 🆕 v5 : Validation directe du panier SANS étape paiement
// ✅ 🆕 v5 : 1 seul panier (pas de multi-paniers, pas d'étapes 1/2)
// ✅ 🆕 v5 : Vert + Blanc uniquement (pas de bleu) + balance en haut masquée
// ✅ 🆕 v6 : Historique complet = commandes + ventes + crédits
// ✅ 🆕 v7 : Crédits payés disparaissent (paid=true ou remainingAmount=0)
// ✅ Barre de recherche : bouton "Afficher tout" → affiche la barre de recherche uniquement
// ✅ SANS boutons Tables / En ligne
// ✅ Mêmes dimensions / même responsive

var clientCart = [];
var clientStep = 1;
var clientIsClientMode = true;

// 🆕 v4 : Constantes fidélité
var FIDELITE_POINTS_PAR_DH = 100;  // 100 points = 10 DH
var FIDELITE_DH_PAR_BLOC = 10;     // 10 DH par bloc de 100 points

// ==================== 🆕 v4 : STYLES INTÉGRÉS CLIENT (Vert + Blanc) ====================
function injectClientStyles() {
    if (document.getElementById('clientModernStylesV5')) return;

    var style = document.createElement('style');
    style.id = 'clientModernStylesV5';
    style.textContent = `
    /* ============================================================
       🎨 CLIENT PAGE — Vert + Blanc uniquement (v5)
       Anti-bleu : toutes les couleurs bleues écrasées par du vert
       ============================================================ */

    :root {
        --client-green: #10B981;
        --client-green-dark: #059669;
        --client-green-light: #34D399;
        --client-green-soft: #ECFDF5;
        --client-white: #FFFFFF;
        --client-gray-50: #F9FAFB;
        --client-gray-100: #F3F4F6;
        --client-gray-200: #E5E7EB;
        --client-gray-500: #6B7280;
        --client-gray-700: #374151;
        --client-text: #111827;
    }

    #clientPage {
        background: var(--client-gray-50) !important;
        min-height: 100vh !important;
        font-family: 'Inter', -apple-system, sans-serif !important;
    }
    #clientPage .main-content {
        background: var(--client-gray-50) !important;
        padding: 24px !important;
    }

    #clientPage .page-header {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 16px !important;
        padding: 20px 24px !important;
        margin-bottom: 20px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    #clientPage .page-header .header-title {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
    }
    #clientPage .page-header .header-title i {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        padding: 12px !important;
        border-radius: 12px !important;
        font-size: 18px !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
    }
    #clientPage .page-header .header-title h2 {
        font-size: 22px !important;
        font-weight: 800 !important;
        color: var(--client-text) !important;
        letter-spacing: -0.5px !important;
        margin: 0 !important;
    }

    #clientPage .client-sidebar {
        background: var(--client-white) !important;
        border-right: none !important;
        box-shadow: 2px 0 12px rgba(0,0,0,0.04) !important;
    }
    #clientPage .client-sidebar .sidebar-header {
        padding: 24px 20px !important;
        border-bottom: 1px solid var(--client-gray-100) !important;
    }
    #clientPage .client-sidebar .sidebar-logo {
        width: 56px !important;
        height: 56px !important;
        background: var(--client-green-soft) !important;
        border: none !important;
        border-radius: 16px !important;
        margin-bottom: 14px !important;
    }
    #clientPage .client-sidebar .nav-item {
        padding: 14px 18px !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        color: var(--client-gray-700) !important;
        margin-bottom: 4px !important;
        border: none !important;
        transition: all 0.2s ease !important;
    }
    #clientPage .client-sidebar .nav-item:hover {
        background: var(--client-green-soft) !important;
        color: var(--client-green-dark) !important;
        transform: translateX(2px);
    }
    #clientPage .client-sidebar .nav-item.active {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        font-weight: 700 !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
    }
    #clientPage .client-sidebar .nav-item.active i {
        color: var(--client-white) !important;
    }
    #clientPage .client-sidebar .nav-item i {
        width: 22px !important;
        font-size: 16px !important;
        color: var(--client-gray-500) !important;
    }

    #clientDynamicContent .content-card {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 16px !important;
        padding: 24px !important;
        margin-bottom: 20px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    #clientDynamicContent .card-header {
        border-bottom: 1px solid var(--client-gray-100) !important;
        padding-bottom: 16px !important;
        margin-bottom: 20px !important;
    }
    #clientDynamicContent .card-header h3 {
        font-size: 18px !important;
        font-weight: 800 !important;
        color: var(--client-text) !important;
        letter-spacing: -0.4px !important;
    }

    /* ==================== 🆕 v5 : MASQUER LA BALANCE / SOLDE EN HAUT ==================== */
    #clientDynamicContent .client-balance-bar,
    #clientDynamicContent .pos-balance-bar,
    #clientDynamicContent .balance-header,
    #clientDynamicContent .solde-header,
    #clientDynamicContent .pos-solde,
    #clientDynamicContent .client-solde-banner,
    #clientDynamicContent .pos-header-balance,
    #clientDynamicContent .pos-total-balance,
    #clientDynamicContent .client-total-solde {
        display: none !important;
    }

    /* ==================== 🆕 v5 : MASQUER LES ÉTAPES 1/2 ==================== */
    #clientDynamicContent .pos-steps,
    #clientDynamicContent .pos-step-indicator,
    #clientDynamicContent .pos-step,
    #clientDynamicContent .pos-checkout-steps,
    #clientDynamicContent .pos-stepper {
        display: none !important;
    }

    /* ==================== 🆕 v5 : MASQUER MULTI-PANIERS ==================== */
    #clientDynamicContent .pos-multi-carts-bar,
    #clientDynamicContent .pos-add-cart-btn,
    #clientDynamicContent .pos-new-cart-btn,
    #clientDynamicContent .pos-cart-tabs {
        display: none !important;
    }

    /* ==================== 🆕 v5 : ANTI-BLEU — Boutons bleus → vert ==================== */
    #clientDynamicContent button[style*="3B82F6"],
    #clientDynamicContent button[style*="2563EB"],
    #clientDynamicContent button[style*="1D4ED8"],
    #clientDynamicContent button[style*="60A5FA"],
    #clientDynamicContent .btn-primary,
    #clientDynamicContent .btn-blue,
    #clientDynamicContent .pos-btn-blue,
    #clientDynamicContent .pos-action-btn-blue {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        border: none !important;
    }
    #clientDynamicContent button[style*="3B82F6"]:hover,
    #clientDynamicContent button[style*="2563EB"]:hover,
    #clientDynamicContent .btn-primary:hover,
    #clientDynamicContent .btn-blue:hover {
        background: var(--client-green-dark) !important;
    }

    /* Liens / textes bleus → vert */
    #clientDynamicContent a[style*="3B82F6"],
    #clientDynamicContent a[style*="2563EB"],
    #clientDynamicContent span[style*="3B82F6"],
    #clientDynamicContent span[style*="2563EB"],
    #clientDynamicContent .text-blue,
    #clientDynamicContent .link-primary {
        color: var(--client-green-dark) !important;
    }

    /* Badges bleus → vert */
    #clientDynamicContent .badge-primary,
    #clientDynamicContent .badge-blue,
    #clientDynamicContent .status-info {
        background: var(--client-green-soft) !important;
        color: var(--client-green-dark) !important;
    }

    /* Bordures bleues → vert */
    #clientDynamicContent [style*="border-color: #3B82F6"],
    #clientDynamicContent [style*="border: 2px solid #3B82F6"] {
        border-color: var(--client-green) !important;
    }

    /* Inputs focus bleus → vert */
    #clientDynamicContent input:focus,
    #clientDynamicContent select:focus,
    #clientDynamicContent textarea:focus {
        outline: none !important;
        border-color: var(--client-green) !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
    }

    /* ==================== 🆕 v4 : BANNIÈRE WELCOME ==================== */
    .client-welcome-banner {
        background: linear-gradient(135deg, var(--client-green), var(--client-green-dark)) !important;
        border: none !important;
        border-radius: 20px !important;
        padding: 28px 32px !important;
        margin-bottom: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 20px !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 12px 32px -8px rgba(16,185,129,0.4) !important;
        color: var(--client-white) !important;
        flex-wrap: wrap !important;
    }
    .client-welcome-banner::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%);
        border-radius: 50%;
        pointer-events: none;
    }
    .client-welcome-content {
        display: flex !important;
        align-items: center !important;
        gap: 20px !important;
        position: relative !important;
        z-index: 1 !important;
        flex: 1 !important;
        min-width: 0 !important;
    }
    .client-welcome-avatar {
        width: 64px !important;
        height: 64px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.25) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 30px !important;
        color: var(--client-white) !important;
        flex-shrink: 0 !important;
    }
    .client-welcome-text h2 {
        margin: 0 0 4px !important;
        font-size: 24px !important;
        font-weight: 800 !important;
        color: var(--client-white) !important;
        letter-spacing: -0.5px !important;
        line-height: 1.2 !important;
    }
    .client-welcome-text h2 span {
        color: #FEF3C7 !important;
    }
    .client-welcome-text p {
        margin: 0 !important;
        font-size: 14px !important;
        color: rgba(255, 255, 255, 0.9) !important;
        font-weight: 500 !important;
    }
    .client-welcome-decoration {
        font-size: 60px !important;
        color: rgba(255, 255, 255, 0.2) !important;
        position: relative !important;
        z-index: 0 !important;
        flex-shrink: 0 !important;
    }

    /* ==================== 🆕 v4 : CARTES STATS HISTORIQUE ==================== */
    .client-stats-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
        gap: 16px !important;
        margin-bottom: 24px !important;
    }
    .client-stat-card {
        background: var(--client-white) !important;
        border-radius: 16px !important;
        padding: 20px !important;
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    .client-stat-card.credits {
        background: linear-gradient(135deg, #FEF2F2, #FEE2E2) !important;
    }
    .client-stat-card.ventes {
        background: linear-gradient(135deg, var(--client-green-soft), #D1FAE5) !important;
    }
    .client-stat-card.fidelite {
        background: linear-gradient(135deg, #FEF3C7, #FDE68A) !important;
    }
    .client-stat-icon {
        width: 52px !important;
        height: 52px !important;
        border-radius: 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 22px !important;
        flex-shrink: 0 !important;
    }
    .client-stat-card.credits .client-stat-icon {
        background: #FEE2E2 !important;
        color: #DC2626 !important;
    }
    .client-stat-card.ventes .client-stat-icon {
        background: #D1FAE5 !important;
        color: var(--client-green-dark) !important;
    }
    .client-stat-card.fidelite .client-stat-icon {
        background: #FDE68A !important;
        color: #D97706 !important;
    }
    .client-stat-info {
        flex: 1 !important;
        min-width: 0 !important;
    }
    .client-stat-label {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--client-gray-500) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        margin-bottom: 4px !important;
    }
    .client-stat-value {
        font-size: 22px !important;
        font-weight: 800 !important;
        color: var(--client-text) !important;
        letter-spacing: -0.5px !important;
    }
    .client-stat-card.credits .client-stat-value {
        color: #DC2626 !important;
    }
    .client-stat-card.ventes .client-stat-value {
        color: var(--client-green-dark) !important;
    }
    .client-stat-card.fidelite .client-stat-value {
        color: #D97706 !important;
    }

    /* ==================== 🆕 v4 : BLOC CONVERSION FIDÉLITÉ ==================== */
    .fidelite-conversion-box {
        background: linear-gradient(135deg, var(--client-green-soft), #D1FAE5) !important;
        border-radius: 16px !important;
        padding: 24px !important;
        margin-top: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }
    .fidelite-conversion-box h4 {
        margin: 0 !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        color: var(--client-green-dark) !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }
    .fidelite-conversion-info {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: var(--client-white) !important;
        padding: 14px 18px !important;
        border-radius: 12px !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
    }
    .fidelite-conversion-info span {
        font-size: 14px !important;
        color: var(--client-gray-700) !important;
        font-weight: 600 !important;
    }
    .fidelite-conversion-info strong {
        font-size: 18px !important;
        font-weight: 800 !important;
        color: var(--client-green-dark) !important;
    }
    .fidelite-convert-btn {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
        font-family: inherit !important;
    }
    .fidelite-convert-btn:hover:not(:disabled) {
        background: var(--client-green-dark) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px rgba(16,185,129,0.4) !important;
    }
    .fidelite-convert-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
        background: var(--client-gray-200) !important;
        color: var(--client-gray-500) !important;
        box-shadow: none !important;
    }

    /* ==================== 🆕 v4 : BOUTONS MODERNES ==================== */
    .btn-client-primary {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-weight: 700 !important;
        font-size: 14px !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
        font-family: inherit !important;
    }
    .btn-client-primary:hover {
        background: var(--client-green-dark) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 20px rgba(16,185,129,0.4) !important;
    }
    .btn-client-secondary {
        background: var(--client-white) !important;
        color: var(--client-green-dark) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-weight: 700 !important;
        font-size: 14px !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
        font-family: inherit !important;
    }
    .btn-client-secondary:hover {
        background: var(--client-green-soft) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.2) !important;
    }

    /* ==================== 🆕 v4 : TABLES ==================== */
    #clientDynamicContent .table-container {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 14px !important;
        overflow-x: auto !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    #clientDynamicContent .data-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 14px !important;
    }
    #clientDynamicContent .data-table thead th {
        background: var(--client-gray-50) !important;
        color: var(--client-gray-500) !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        letter-spacing: 0.6px !important;
        text-transform: uppercase !important;
        padding: 14px 16px !important;
        text-align: left !important;
        border-bottom: 1px solid var(--client-gray-100) !important;
        white-space: nowrap !important;
    }
    #clientDynamicContent .data-table tbody td {
        padding: 14px 16px !important;
        color: var(--client-gray-700) !important;
        border-bottom: 1px solid var(--client-gray-100) !important;
        vertical-align: middle !important;
    }
    #clientDynamicContent .data-table tbody tr:hover td {
        background: var(--client-gray-50) !important;
    }

    /* ==================== 🆕 v4 : STATUS BADGES ==================== */
    #clientDynamicContent .status-success {
        background: var(--client-green-soft) !important;
        color: var(--client-green-dark) !important;
        padding: 4px 12px !important;
        border-radius: 999px !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        border: none !important;
        display: inline-block !important;
    }
    #clientDynamicContent .status-warning {
        background: #FEF3C7 !important;
        color: #D97706 !important;
        padding: 4px 12px !important;
        border-radius: 999px !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        border: none !important;
        display: inline-block !important;
    }
    #clientDynamicContent .status-danger {
        background: #FEE2E2 !important;
        color: #DC2626 !important;
        padding: 4px 12px !important;
        border-radius: 999px !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        border: none !important;
        display: inline-block !important;
    }

    /* ==================== POS CLIENT (sans bordures) ==================== */
    #clientDynamicContent .pos-products-panel,
    #clientDynamicContent .pos-cart-panel {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 16px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
    }
    #clientDynamicContent .pos-product-card {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 14px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        transition: all 0.25s ease !important;
    }
    #clientDynamicContent .pos-product-card:hover:not(.pos-out-of-stock) {
        transform: translateY(-4px) !important;
        box-shadow: 0 10px 28px rgba(16, 185, 129, 0.2) !important;
    }
    #clientDynamicContent .pos-category-card {
        background: var(--client-white) !important;
        border: none !important;
        border-radius: 14px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        transition: all 0.25s ease !important;
    }
    #clientDynamicContent .pos-category-card:hover {
        transform: translateY(-3px) !important;
        box-shadow: 0 10px 28px rgba(16, 185, 129, 0.2) !important;
    }
    #clientDynamicContent .pos-category-card.active {
        background: var(--client-green-soft) !important;
        border: none !important;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3) !important;
    }
    #clientDynamicContent .pos-product-name {
        color: var(--client-text) !important;
        font-weight: 700 !important;
    }
    #clientDynamicContent .pos-product-price {
        color: var(--client-green-dark) !important;
        font-weight: 800 !important;
    }
    #clientDynamicContent .pos-cart-header {
        border-bottom: 1px solid var(--client-gray-100) !important;
    }
    #clientDynamicContent .pos-cart-badge {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
    }
    #clientDynamicContent .pos-cart-item {
        background: var(--client-gray-50) !important;
        border: none !important;
        border-radius: 10px !important;
    }
    #clientDynamicContent .pos-cart-total-row {
        background: var(--client-green-soft) !important;
        border: none !important;
        border-radius: 12px !important;
    }
    #clientDynamicContent .pos-cart-total-row span:last-child {
        color: var(--client-green-dark) !important;
    }
    #clientDynamicContent .pos-validate-btn,
    #clientDynamicContent .pos-finalize-btn {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
        border: none !important;
        border-radius: 14px !important;
        font-weight: 800 !important;
    }
    #clientDynamicContent .pos-validate-btn:hover:not(:disabled),
    #clientDynamicContent .pos-finalize-btn:hover:not(:disabled) {
        background: var(--client-green-dark) !important;
    }
    #clientDynamicContent .pos-qty-btn {
        background: var(--client-gray-100) !important;
        color: var(--client-gray-700) !important;
        border: none !important;
    }
    #clientDynamicContent .pos-qty-btn:hover {
        background: var(--client-green) !important;
        color: var(--client-white) !important;
    }
    #clientDynamicContent input[type="text"],
    #clientDynamicContent input[type="number"],
    #clientDynamicContent #posSearchInput,
    #clientDynamicContent #posAmountGiven {
        background: var(--client-gray-50) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: var(--client-text) !important;
        outline: none !important;
    }
    #clientDynamicContent input:focus {
        background: var(--client-white) !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
    }

    @media (max-width: 768px) {
        #clientPage .main-content { padding: 16px !important; }
        #clientPage .page-header { padding: 16px 18px !important; border-radius: 14px !important; }
        #clientPage .page-header .header-title h2 { font-size: 18px !important; }
        #clientDynamicContent .content-card { padding: 18px !important; border-radius: 14px !important; }
        .client-welcome-banner { padding: 20px 22px !important; border-radius: 14px !important; }
        .client-welcome-avatar { width: 50px !important; height: 50px !important; font-size: 24px !important; }
        .client-welcome-text h2 { font-size: 18px !important; }
        .client-welcome-text p { font-size: 12px !important; }
        .client-welcome-decoration { display: none !important; }
        .client-stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
        .client-stat-card { padding: 16px !important; }
        .client-stat-value { font-size: 18px !important; }
        .fidelite-conversion-box { padding: 18px !important; }
        .fidelite-convert-btn { padding: 12px 20px !important; font-size: 14px !important; }
    }
    `;
    document.head.appendChild(style);
    console.log('✅ Styles client modernes injectés (Vert + Blanc v5 — anti-bleu)');
}

// Injection immédiate des styles
injectClientStyles();

// ==================== NAVIGATION CLIENT ====================
function clientNavigate(page) {
    var items = document.querySelectorAll('#clientPage .nav-item');
    items.forEach(function(item) { item.classList.remove('active'); });
    if (page === 'commander' && items[0]) items[0].classList.add('active');
    else if (page === 'historique' && items[1]) items[1].classList.add('active');
    else if (items[2]) items[2].classList.add('active');

    var titleEl = document.getElementById('clientPageTitle');
    if (titleEl) titleEl.textContent = page === 'commander' ? 'Commander' : page === 'historique' ? 'Mon historique' : 'Paramètres';

    if (page === 'commander') loadClientCommanderPage();
    else if (page === 'historique') loadClientHistoriquePage();
    else loadClientParametresPage();

    if (typeof closeClientSidebar === 'function') closeClientSidebar();
}

// ==================== BANNIÈRE WELCOME ====================
function renderClientWelcomeBanner() {
    if (!window.currentUserData) return '';
    var ud = window.currentUserData.userData;
    var prenom = ud.prenom || 'Client';
    var heure = new Date().getHours();
    var salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

    var html = '<div class="client-welcome-banner">';
    html += '  <div class="client-welcome-content">';
    html += '    <div class="client-welcome-avatar">';
    html += '      <i class="fas fa-user-circle"></i>';
    html += '    </div>';
    html += '    <div class="client-welcome-text">';
    html += '      <h2>' + salutation + ', <span>' + escapeHtml(prenom) + '</span> 👋</h2>';
    html += '      <p>Que souhaitez-vous commander aujourd\'hui ?</p>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="client-welcome-decoration">';
    html += '    <i class="fas fa-utensils"></i>';
    html += '  </div>';
    html += '</div>';

    return html;
}

// ==================== PAGE COMMANDER ====================
async function loadClientCommanderPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posIsClientMode = true;
    window.posHideMultiCarts = true;
    window.posHideTablesBtn = true;
    window.posHideEnLigneBtn = true;

    c.innerHTML = renderClientWelcomeBanner() + '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#10B981;"></i><p style="margin-top:15px;color:#6B7280;">Chargement du menu...</p></div>';

    posCart = clientCart.length > 0 ? clientCart.slice() : [];
    posStep = 1; // 🆕 v5 : toujours étape 1 (pas de paiement)
    posSelectedCategory = 'all';
    posViewMode = 'categories';
    posSelectedCategoryForView = null;
    posSearchQuery = '';
    posToolsVisible = false;
    posProductOffset = 0;

    // 🆕 v5 : UN SEUL panier pour le client
    posMultiCarts = { 'client-panier': posCart };
    posCurrentCartId = 'client-panier';
    posMultiPaniersData = {
        'client-panier': {
            client: window.currentUserData ? {
                id: window.currentUserData.uid,
                name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
            } : null,
            table: '',
            paymentMethod: 'espece',
            discountMAD: 0,
            amountGiven: 0,
            step: 1
        }
    };

    posCurrentClient = window.currentUserData ? {
        id: window.currentUserData.uid,
        name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
    } : null;

    try {
        let cachedCategories = await CacheDB.getAll('categories');
        let cachedProducts = await CacheDB.getAll('products');

        if (cachedCategories.length) {
            posCategoriesList = cachedCategories.map(function(cat) {
                return { id: cat.id, nom: cat.nom, imageBase64: cat.imageBase64, recette: cat.recette || false, ordre: cat.ordre || 0 };
            });
        }
        if (cachedProducts.length) {
            posProductsList = cachedProducts.filter(function(p) { return p.disponible !== false; });
            productIndexBuilt = false;
        }
        if (posCategoriesList.length || posProductsList.length) {
            renderClientPOS();
        }
    } catch(e) { console.warn('Erreur cache client:', e); }

    try {
        const [cs, ps] = await Promise.all([
            db.collection('categories').get(),
            db.collection('products').get()
        ]);

        posCategoriesList = [];
        cs.forEach(function(d) {
            var dd = d.data();
            var cat = { id: d.id, nom: dd.nom, imageBase64: dd.imageBase64, recette: dd.recette || false, ordre: dd.ordre || 0 };
            posCategoriesList.push(cat);
            CacheDB.set('categories', d.id, cat);
        });

        posProductsList = [];
        ps.forEach(function(d) {
            var dd = d.data();
            if (dd.disponible !== false) {
                var prod = {
                    id: d.id,
                    nom: dd.nom || '',
                    description: dd.description || '',
                    prixVente: dd.prixVente || 0,
                    prixPromo: dd.prixPromo || 0,
                    prixAchat: dd.prixAchat || 0,
                    stock: dd.stock,
                    categorie: dd.categorie || '',
                    categories: dd.categories || [],
                    imageBase64: dd.imageBase64 || '',
                    favori: dd.favori || false
                };
                posProductsList.push(prod);
                CacheDB.set('products', d.id, prod);
            }
        });
        productIndexBuilt = false;

        renderClientPOS();
    } catch(e) {
        console.error('Erreur chargement catalogue:', e);
        renderClientPOS();
    }
}

// ==================== RENDU POS CLIENT ====================
function renderClientPOS() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posHideMultiCarts = true; // 🆕 v5 : forcer 1 seul panier

    if (posProductsList.length === 0 && posCategoriesList.length === 0) {
        c.innerHTML = renderClientWelcomeBanner() + '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#10B981;"></i><p style="margin-top:15px;color:#6B7280;">Chargement...</p></div>';
        return;
    }

    clientCart = posCart.slice();
    clientStep = 1; // 🆕 v5 : toujours étape 1

    if (typeof buildFullPOS === 'function') {
        var bannerHtml = renderClientWelcomeBanner();
        buildFullPOS(c);
        if (c.firstChild) {
            c.insertAdjacentHTML('afterbegin', bannerHtml);
        }
        setTimeout(masquerElementsAdminDansClient, 50);
    } else {
        c.innerHTML = '<div style="text-align:center;padding:40px;color:#EF4444;">Erreur : POS non chargé</div>';
    }
}

// ==================== MASQUER LES ÉLÉMENTS ADMIN ====================
function masquerElementsAdminDansClient() {
    // 🆕 v5 : Barre multi-paniers
    var multiCartBar = document.querySelector('#clientDynamicContent .pos-multi-carts-bar');
    if (multiCartBar) multiCartBar.style.display = 'none';

    // 🆕 v5 : Bouton nouveau panier
    var newCartBtn = document.querySelector('#clientDynamicContent button[onclick*="posCreateNewCart"]');
    if (newCartBtn) newCartBtn.style.display = 'none';

    var addCartBtn = document.querySelector('#clientDynamicContent .pos-add-cart-btn');
    if (addCartBtn) addCartBtn.style.display = 'none';

    // 🆕 v5 : Étapes 1 - Panier / 2 - Paiement
    var posSteps = document.querySelector('#clientDynamicContent .pos-steps');
    if (posSteps) posSteps.style.display = 'none';

    var posStepIndicator = document.querySelector('#clientDynamicContent .pos-step-indicator');
    if (posStepIndicator) posStepIndicator.style.display = 'none';

    var allSteps = document.querySelectorAll('#clientDynamicContent .pos-step');
    allSteps.forEach(function(s) { s.style.display = 'none'; });

    var checkoutSteps = document.querySelector('#clientDynamicContent .pos-checkout-steps');
    if (checkoutSteps) checkoutSteps.style.display = 'none';

    var stepper = document.querySelector('#clientDynamicContent .pos-stepper');
    if (stepper) stepper.style.display = 'none';

    // 🆕 v5 : Balance / solde en DH en haut
    var balanceSelectors = [
        '.client-balance-bar', '.pos-balance-bar', '.balance-header',
        '.solde-header', '.pos-solde', '.client-solde-banner',
        '.pos-header-balance', '.pos-total-balance', '.client-total-solde'
    ];
    balanceSelectors.forEach(function(sel) {
        var el = document.querySelector('#clientDynamicContent ' + sel);
        if (el) el.style.display = 'none';
    });

    // Boutons Tables / En ligne
    var tablesBtn = document.getElementById('posTablesBtn');
    if (tablesBtn) tablesBtn.style.display = 'none';

    var enligneBtn = document.getElementById('posEnLigneBtn');
    if (enligneBtn) enligneBtn.style.display = 'none';

    // Vendeur
    var vendeurGroup = document.getElementById('posVendeur');
    if (vendeurGroup) {
        var parent = vendeurGroup.closest('div[style*="margin-bottom"]');
        if (parent) parent.style.display = 'none';
    }

    // Table
    var tableInput = document.getElementById('posTableNum');
    if (tableInput) {
        var parent = tableInput.closest('div[style*="margin-bottom"]');
        if (parent) parent.style.display = 'none';
    }

    // Séparateur "OU"
    var separator = document.querySelector('#clientDynamicContent div[style*="OU"]');
    if (separator) separator.style.display = 'none';

    // Bouton nouveau client
    var nouveauBtn = document.querySelector('#clientDynamicContent button[onclick*="posAjouterNouveauClient"]');
    if (nouveauBtn) nouveauBtn.style.display = 'none';

    // Recherche client
    var clientSearchInput = document.getElementById('posClientSearchInput');
    if (clientSearchInput) {
        var parent = clientSearchInput.closest('div[style*="position:relative"]');
        if (parent) parent.style.display = 'none';
    }

    // Labels "Client"
    var allLabels = document.querySelectorAll('#clientDynamicContent label');
    allLabels.forEach(function(lbl) {
        if (lbl.textContent.trim() === 'Client') {
            var parentDiv = lbl.closest('div[style*="display:flex"]');
            if (parentDiv) parentDiv.style.display = 'none';
        }
    });

    // Boutons crédit / partiel
    var creditBtn = document.getElementById('posCreditBtn');
    if (creditBtn) creditBtn.style.display = 'none';
    var partielBtn = document.getElementById('posPartielBtn');
    if (partielBtn) partielBtn.style.display = 'none';

    // Bouton finalize
    var finalizeBtn = document.querySelector('#clientDynamicContent .pos-finalize-btn');
    if (finalizeBtn) {
        finalizeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer la commande';
    }

    // Header "Paiement" → "Confirmation"
    var paymentHeader = document.querySelector('#clientDynamicContent .pos-cart-header h3');
    if (paymentHeader && paymentHeader.textContent.indexOf('Paiement') !== -1) {
        paymentHeader.innerHTML = '<i class="fas fa-clipboard-check"></i> Confirmation';
    }

    // 🆕 v5 : Bouton "Valider" devient "Envoyer la commande"
    var validateBtn = document.querySelector('#clientDynamicContent .pos-validate-btn');
    if (validateBtn) {
        validateBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer la commande';
    }

    // 🆕 v5 : Anti-bleu — forcer les boutons bleus en vert via JS
    var allBtns = document.querySelectorAll('#clientDynamicContent button');
    allBtns.forEach(function(btn) {
        var bg = btn.style.background || btn.style.backgroundColor || '';
        if (bg.indexOf('59, 130, 246') !== -1 || bg.indexOf('#3B82F6') !== -1 ||
            bg.indexOf('#2563EB') !== -1 || bg.indexOf('#1D4ED8') !== -1 ||
            bg.indexOf('37, 99, 235') !== -1 || bg.indexOf('29, 78, 216') !== -1) {
            btn.style.background = '#10B981';
            btn.style.color = '#FFFFFF';
        }
    });
}


// ==================== SURCHARGES POS ====================
window.posFinalizeSaleOriginal = window.posFinalizeSale;
window.posFinalizeSale = async function() {
    if (window.posIsClientMode) {
        return await clientValidateOrder();
    }
    if (typeof window.posFinalizeSaleOriginal === 'function') {
        return await window.posFinalizeSaleOriginal();
    }
};

// ==================== VALIDATION COMMANDE ====================
async function clientValidateOrder() {
    if (posCart.length === 0) {
        alert('❌ Votre panier est vide. Ajoutez des articles avant de commander.');
        return;
    }

    if (!confirm('Voulez-vous envoyer votre commande ?\n\nTotal: ' + posCalculateTotal().toFixed(2) + ' MAD')) {
        return;
    }

    var total = posCalculateTotal();
    var ud = window.currentUserData ? window.currentUserData.userData : {};

    var orderData = {
        items: JSON.parse(JSON.stringify(posCart)),
        total: total,
        clientId: window.currentUserData ? window.currentUserData.uid : null,
        clientName: (ud.prenom || '') + ' ' + (ud.nom || ''),
        clientEmail: ud.email || '',
        clientTelephone: ud.telephone || '',
        statut: 'en_attente',
        source: 'client',
        paymentMethod: 'espece',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await CacheDB.write('commandes', null, orderData, 'add');
        alert('✅ Commande envoyée !\n\nTotal: ' + total.toFixed(2) + ' MAD\n\nNous vous contacterons bientôt.');

        posCart = [];
        clientCart = [];
        posStep = 1;
        clientStep = 1;
        posMultiCarts['client-panier'] = [];

        // 🆕 v5 : Toujours rester à l'étape 1 (panier uniquement)
        posStep = 1;
        clientStep = 1;

        renderClientPOS();

        CacheDB.sync();

        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) {
            setTimeout(function() {
                CacheDB.saveCollection('commandes');
            }, 500);
        }
    } catch(e) {
        console.error('❌ Erreur commande:', e);
        alert('❌ Erreur lors de l\'envoi: ' + e.message);
    }
}

// ==================== AUTRES SURCHARGES ====================
window.posResetCartOriginal = window.posResetCart;
window.posResetCart = function() {
    if (window.posIsClientMode) {
        posCart = [];
        clientCart = [];
        posMultiCarts['client-panier'] = [];
        posDiscountMAD = 0;
        posAmountGiven = 0;
        posCurrentClient = window.currentUserData ? {
            id: window.currentUserData.uid,
            name: window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom
        } : null;
        posCurrentTable = '';
        posPaymentMethod = 'espece';
        if (typeof renderClientPOS === 'function') renderClientPOS();
        return;
    }
    if (typeof window.posResetCartOriginal === 'function') {
        return window.posResetCartOriginal();
    }
};

window.posGoToStep2Original = window.posGoToStep2;
window.posGoToStep2 = function() {
    if (window.posIsClientMode) {
        // 🆕 v5 : Le client envoie DIRECTEMENT sa commande (pas d'étape paiement)
        if (posCart.length === 0) {
            alert('⚠️ Votre panier est vide. Ajoutez des articles avant de commander.');
            return;
        }
        return clientValidateOrder();
    }
    if (typeof window.posGoToStep2Original === 'function') {
        return window.posGoToStep2Original();
    }
};

window.posGoToStep1Original = window.posGoToStep1;
window.posGoToStep1 = function() {
    if (window.posIsClientMode) {
        posStep = 1;
        clientStep = 1;
        posCart = posMultiCarts['client-panier'] || [];
        clientCart = posCart.slice();
        renderClientPOS();
        return;
    }
    if (typeof window.posGoToStep1Original === 'function') {
        return window.posGoToStep1Original();
    }
};

window.renderPOSOriginal = window.renderPOS;
window.renderPOS = function() {
    if (window.posIsClientMode) {
        return renderClientPOS();
    }
    if (typeof window.renderPOSOriginal === 'function') {
        return window.renderPOSOriginal();
    }
};

window.filterProductGridOriginal = window.filterProductGrid;
window.filterProductGrid = function() {
    if (window.posIsClientMode) {
        var grid = document.getElementById('posProductGrid');
        if (grid) { /* OK */ }
    }
    if (typeof window.filterProductGridOriginal === 'function') {
        return window.filterProductGridOriginal();
    }
};

window.updateCartOnlyOriginal = window.updateCartOnly;
window.updateCartOnly = function() {
    if (window.posIsClientMode) {
        clientCart = posCart.slice();
    }
    if (typeof window.updateCartOnlyOriginal === 'function') {
        return window.updateCartOnlyOriginal();
    }
};

window.posToggleToolsOriginal = window.posToggleTools;
window.posToggleTools = function() {
    if (window.posIsClientMode) {
        posToolsVisible = !posToolsVisible;
        var toolsContainer = document.getElementById('posToolsContainer');
        var toggleBtn = document.getElementById('posToggleToolsBtn');

        if (toolsContainer) {
            if (posToolsVisible) {
                toolsContainer.style.display = 'flex';
                toolsContainer.style.flexDirection = 'column';
                toolsContainer.style.gap = '8px';
                toolsContainer.style.marginBottom = '8px';
                toolsContainer.style.padding = '8px 12px';
                toolsContainer.style.background = '#F9FAFB';
                toolsContainer.style.borderRadius = '8px';
                toolsContainer.style.border = 'none';
                toolsContainer.classList.add('visible');
            } else {
                toolsContainer.style.display = 'none';
                toolsContainer.classList.remove('visible');
            }
        }

        if (toggleBtn) {
            toggleBtn.innerHTML = posToolsVisible ? '✕ Masquer' : '🔍 Afficher tout';
            toggleBtn.style.background = posToolsVisible ? '#EF4444' : '#10B981';
        }

        var searchInput = document.getElementById('posSearchInput');
        if (searchInput) {
            searchInput.style.display = posToolsVisible ? 'flex' : 'none';
            if (posToolsVisible) {
                setTimeout(function() { searchInput.focus(); }, 100);
            }
        }

        var micBtn = document.getElementById('posMicBtn');
        if (micBtn) micBtn.style.display = posToolsVisible ? 'flex' : 'none';

        var tablesBtn = document.getElementById('posTablesBtn');
        if (tablesBtn) tablesBtn.style.display = 'none';
        var enligneBtn = document.getElementById('posEnLigneBtn');
        if (enligneBtn) enligneBtn.style.display = 'none';

        var categoriesBar = document.querySelector('#clientDynamicContent .pos-categories-bar');
        if (categoriesBar) categoriesBar.style.display = 'none';

        if (!posToolsVisible) {
            posViewMode = 'categories';
            posSelectedCategoryForView = null;
            posSelectedCategory = 'all';
            posSearchQuery = '';
            posProductOffset = 0;

            var searchInput2 = document.getElementById('posSearchInput');
            if (searchInput2) searchInput2.value = '';

            var clearBtn = document.getElementById('posSearchClearBtn');
            if (clearBtn) clearBtn.style.display = 'none';

            if (typeof filterProductGrid === 'function') filterProductGrid();
        }
        return;
    }
    if (typeof window.posToggleToolsOriginal === 'function') {
        return window.posToggleToolsOriginal();
    }
};

// ==================== 🆕 v6/v7 : PAGE HISTORIQUE (commandes + ventes + crédits non soldés) ====================
async function loadClientHistoriquePage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posIsClientMode = false;

    if (!window.currentUserData) {
        c.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#9CA3AF;">Non connecté</p></div>';
        return;
    }

    var uid = window.currentUserData.uid;
    var ud = window.currentUserData.userData;

    c.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#10B981;"></i><p style="margin-top:15px;color:#6B7280;">Chargement de votre historique...</p></div>';

    try {
        // ========== 1. COMMANDES (envoyées par le client, en attente de validation) ==========
        var commandes = [];
        try {
            var cmdSnap = await db.collection('commandes').where('clientId', '==', uid).get();
            cmdSnap.forEach(function(d) {
                var cmd = d.data();
                cmd.id = d.id;
                commandes.push(cmd);
            });
            commandes.sort(function(a, b) { return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); });
        } catch(e) { console.warn('Erreur chargement commandes:', e); }

        // ========== 2. VENTES (commandes validées par admin → devenues ventes) ==========
        var ventes = [];
        try {
            var ventesSnap = await db.collection('ventes').where('clientId', '==', uid).get();
            ventesSnap.forEach(function(d) {
                var v = d.data();
                v.id = d.id;
                ventes.push(v);
            });
            ventes.sort(function(a, b) { return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); });
        } catch(e) { console.warn('Erreur chargement ventes:', e); }

        // ========== 3. CRÉDITS ==========
        var credits = [];
        try {
            var creditsSnap = await db.collection('credits').where('clientId', '==', uid).get();
            creditsSnap.forEach(function(d) {
                var cr = d.data();
                cr.id = d.id;
                credits.push(cr);
            });
            credits.sort(function(a, b) { return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); });
        } catch(e) { console.warn('Erreur chargement crédits:', e); }

        // 🆕 v7 : Normaliser — si paid=true, remainingAmount doit être 0
        credits = credits.map(function(cr) {
            if (cr.paid === true) {
                cr.remainingAmount = 0;
            }
            return cr;
        });

        // ========== 4. CALCULS ==========
        var totalCreditsImpayes = 0;
        credits.forEach(function(cr) {
            if (!cr.paid && (cr.remainingAmount || 0) > 0) totalCreditsImpayes += cr.remainingAmount;
        });

        var totalVentes = 0;
        ventes.forEach(function(v) { totalVentes += v.total || 0; });

        var nbCommandesEnAttente = 0;
        commandes.forEach(function(cmd) {
            var st = (cmd.statut || '').toLowerCase();
            if (st === 'en_attente' || st === 'en attente' || st === 'pending' || st === '') nbCommandesEnAttente++;
        });

        // ========== 5. HTML ==========
        var h = '';

        // Bannière stats en haut
        h += '<div class="client-stats-grid">';
        h += '  <div class="client-stat-card ventes">';
        h += '    <div class="client-stat-icon"><i class="fas fa-clock"></i></div>';
        h += '    <div class="client-stat-info">';
        h += '      <div class="client-stat-label">Commandes en attente</div>';
        h += '      <div class="client-stat-value">' + nbCommandesEnAttente + '</div>';
        h += '    </div>';
        h += '  </div>';
        h += '  <div class="client-stat-card ventes">';
        h += '    <div class="client-stat-icon"><i class="fas fa-shopping-cart"></i></div>';
        h += '    <div class="client-stat-info">';
        h += '      <div class="client-stat-label">Total des ventes</div>';
        h += '      <div class="client-stat-value">' + totalVentes.toFixed(2) + ' MAD</div>';
        h += '    </div>';
        h += '  </div>';
        h += '  <div class="client-stat-card credits">';
        h += '    <div class="client-stat-icon"><i class="fas fa-credit-card"></i></div>';
        h += '    <div class="client-stat-info">';
        h += '      <div class="client-stat-label">Crédits restant à payer</div>';
        h += '      <div class="client-stat-value">' + totalCreditsImpayes.toFixed(2) + ' MAD</div>';
        h += '    </div>';
        h += '  </div>';
        h += '</div>';

        // ========== SECTION COMMANDES (en attente / validées) ==========
        if (commandes.length > 0) {
            h += '<div class="content-card">';
            h += '  <div class="card-header"><h3><i class="fas fa-paper-plane" style="color:#10B981;"></i> Mes commandes</h3></div>';
            h += '  <div class="table-container">';
            h += '    <table class="data-table">';
            h += '      <thead><tr><th>Date</th><th>N°</th><th>Articles</th><th>Total</th><th>Statut</th></tr></thead>';
            h += '      <tbody>';
            commandes.forEach(function(cmd) {
                var date = cmd.createdAt ? new Date(cmd.createdAt.seconds * 1000).toLocaleString('fr-FR') : '-';
                var num = cmd.factureNum || cmd.id.substring(0, 8);
                var arts = cmd.items ? cmd.items.map(function(it) { return it.quantite + 'x ' + escapeHtml(it.nom); }).join('<br>') : '-';
                var total = (cmd.total || 0).toFixed(2);
                var st = (cmd.statut || 'en_attente').toLowerCase();
                var badge;
                if (st === 'en_attente' || st === 'en attente' || st === 'pending' || st === '') {
                    badge = '<span class="status-warning"><i class="fas fa-clock"></i> En attente</span>';
                } else if (st === 'validee' || st === 'validée' || st === 'valide' || st === 'confirmed') {
                    badge = '<span class="status-success"><i class="fas fa-check-circle"></i> Validée</span>';
                } else if (st === 'annulee' || st === 'annulée' || st === 'cancelled') {
                    badge = '<span class="status-danger"><i class="fas fa-times-circle"></i> Annulée</span>';
                } else {
                    badge = '<span class="status-warning">' + escapeHtml(cmd.statut || '-') + '</span>';
                }
                h += '<tr>';
                h += '  <td>' + date + '</td>';
                h += '  <td><strong>#' + num + '</strong></td>';
                h += '  <td>' + arts + '</td>';
                h += '  <td><strong>' + total + ' MAD</strong></td>';
                h += '  <td>' + badge + '</td>';
                h += '</tr>';
            });
            h += '      </tbody>';
            h += '    </table>';
            h += '  </div>';
            h += '</div>';
        }

        // ========== SECTION VENTES (commandes validées → factures) ==========
        if (ventes.length > 0) {
            h += '<div class="content-card">';
            h += '  <div class="card-header"><h3><i class="fas fa-history" style="color:#10B981;"></i> Mes ventes</h3></div>';
            h += '  <div class="table-container">';
            h += '    <table class="data-table">';
            h += '      <thead><tr><th>Date</th><th>Facture</th><th>Articles</th><th>Total</th><th>Paiement</th><th>Statut</th></tr></thead>';
            h += '      <tbody>';
            ventes.forEach(function(v) {
                var date = v.createdAt ? new Date(v.createdAt.seconds * 1000).toLocaleString('fr-FR') : '-';
                var facture = v.factureNum || v.id.substring(0, 8);
                var arts = v.items ? v.items.map(function(it) { return it.quantite + 'x ' + escapeHtml(it.nom); }).join('<br>') : '-';
                var total = (v.total || 0).toFixed(2);
                var statutPaiement = v.statutPaiement || (v.paid ? 'payé' : 'crédit');
                var paymentMethod = v.paymentMethod || '-';
                var statut = v.paid
                    ? '<span class="status-success"><i class="fas fa-check-circle"></i> Payé</span>'
                    : statutPaiement === 'partiel'
                        ? '<span class="status-warning"><i class="fas fa-clock"></i> Partiel</span>'
                        : '<span class="status-warning"><i class="fas fa-clock"></i> Crédit</span>';
                h += '<tr>';
                h += '  <td>' + date + '</td>';
                h += '  <td><strong>#' + facture + '</strong></td>';
                h += '  <td>' + arts + '</td>';
                h += '  <td><strong>' + total + ' MAD</strong></td>';
                h += '  <td>' + escapeHtml(paymentMethod) + '</td>';
                h += '  <td>' + statut + '</td>';
                h += '</tr>';
            });
            h += '      </tbody>';
            h += '    </table>';
            h += '  </div>';
            h += '</div>';
        }

        // ========== SECTION CRÉDITS (uniquement les crédits non soldés) ==========
        var creditsActifs = credits.filter(function(cr) {
            return !cr.paid && (cr.remainingAmount || 0) > 0;
        });
        if (creditsActifs.length > 0) {
            h += '<div class="content-card">';
            h += '  <div class="card-header"><h3><i class="fas fa-credit-card" style="color:#10B981;"></i> Mes crédits</h3></div>';
            h += '  <div class="table-container">';
            h += '    <table class="data-table">';
            h += '      <thead><tr><th>Date</th><th>Facture</th><th>Total</th><th>Restant</th><th>Statut</th></tr></thead>';
            h += '      <tbody>';
            creditsActifs.forEach(function(cr) {
                var date = cr.createdAt ? new Date(cr.createdAt.seconds * 1000).toLocaleString('fr-FR') : '-';
                var facture = cr.factureNum || cr.id.substring(0, 8);
                var total = (cr.total || 0).toFixed(2);
                var restant = (cr.remainingAmount || 0).toFixed(2);
                var statut = cr.paid
                    ? '<span class="status-success"><i class="fas fa-check-circle"></i> Payé</span>'
                    : '<span class="status-warning"><i class="fas fa-clock"></i> À payer</span>';
                h += '<tr>';
                h += '  <td>' + date + '</td>';
                h += '  <td><strong>#' + facture + '</strong></td>';
                h += '  <td>' + total + ' MAD</td>';
                h += '  <td><strong style="color:' + (cr.paid ? '#10B981' : '#DC2626') + ';">' + restant + ' MAD</strong></td>';
                h += '  <td>' + statut + '</td>';
                h += '</tr>';
            });
            h += '      </tbody>';
            h += '    </table>';
            h += '  </div>';
            h += '</div>';
        }

        // Aucun historique
        if (commandes.length === 0 && ventes.length === 0 && creditsActifs.length === 0) {
            h += '<div class="content-card" style="text-align:center;padding:60px 20px;">';
            h += '  <i class="fas fa-inbox" style="font-size:3rem;color:#E5E7EB;"></i>';
            h += '  <p style="color:#9CA3AF;margin-top:16px;">Aucun historique pour le moment</p>';
            h += '</div>';
        }

        c.innerHTML = h;

    } catch(e) {
        console.error('Erreur historique:', e);
        c.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#EF4444;">Erreur de chargement: ' + e.message + '</p></div>';
    }
}

// ==================== 🆕 v4 : PAGE PARAMÈTRES (Profil + Fidélité convertible) ====================
async function loadClientParametresPage() {
    var c = document.getElementById('clientDynamicContent');
    if (!c) return;

    window.posIsClientMode = false;

    if (!window.currentUserData) { c.innerHTML = '<div class="content-card"><p>Non connecté</p></div>'; return; }

    var clientData = null, clientDocId = null;
    var userEmail = window.currentUserData.userData.email;
    try {
        var clientSnap = await db.collection('clients').where('email', '==', userEmail).get();
        if (!clientSnap.empty) { clientDocId = clientSnap.docs[0].id; clientData = clientSnap.docs[0].data(); }
    } catch(e) { console.error(e); }
    if (!clientData) clientData = window.currentUserData.userData;

    // Charger les crédits impayés
    var totalCredits = 0;
    try {
        var creditsSnap = await db.collection('credits')
            .where('clientId', '==', window.currentUserData.uid)
            .where('paid', '==', false)
            .get();
        creditsSnap.forEach(function(d) {
            var cr = d.data();
            // 🆕 v7 : Ne compter que si non payé ET restant > 0
            if (!cr.paid && (cr.remainingAmount || 0) > 0) {
                totalCredits += cr.remainingAmount || 0;
            }
        });
    } catch(e) { console.warn('Erreur chargement crédits:', e); }

    // Points fidélité
    var points = clientData.pointsFidelite || 0;
    var dhDisponibles = Math.floor(points / FIDELITE_POINTS_PAR_DH) * FIDELITE_DH_PAR_BLOC;
    var blocsDisponibles = Math.floor(points / FIDELITE_POINTS_PAR_DH);

    var h = '';

    // 🆕 v4 : Bannière stats en haut (Crédits + Points + DH disponibles)
    h += '<div class="client-stats-grid">';
    h += '  <div class="client-stat-card credits">';
    h += '    <div class="client-stat-icon"><i class="fas fa-credit-card"></i></div>';
    h += '    <div class="client-stat-info">';
    h += '      <div class="client-stat-label">Crédits à payer</div>';
    h += '      <div class="client-stat-value">' + totalCredits.toFixed(2) + ' MAD</div>';
    h += '    </div>';
    h += '  </div>';
    h += '  <div class="client-stat-card fidelite">';
    h += '    <div class="client-stat-icon"><i class="fas fa-star"></i></div>';
    h += '    <div class="client-stat-info">';
    h += '      <div class="client-stat-label">Points fidélité</div>';
    h += '      <div class="client-stat-value">' + points + ' pts</div>';
    h += '    </div>';
    h += '  </div>';
    h += '  <div class="client-stat-card fidelite">';
    h += '    <div class="client-stat-icon"><i class="fas fa-coins"></i></div>';
    h += '    <div class="client-stat-info">';
    h += '      <div class="client-stat-label">Équivalent en DH</div>';
    h += '      <div class="client-stat-value">' + dhDisponibles.toFixed(2) + ' DH</div>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';

    // Bloc conversion fidélité
    h += '<div class="content-card">';
    h += '  <div class="card-header"><h3><i class="fas fa-coins" style="color:#10B981;"></i> Convertir mes points</h3></div>';
    h += '  <div class="fidelite-conversion-box">';
    h += '    <h4><i class="fas fa-gift"></i> Règle de conversion</h4>';
    h += '    <div class="fidelite-conversion-info">';
    h += '      <span>100 points = 10 DH</span>';
    h += '      <strong>' + blocsDisponibles + ' bloc(s) disponible(s)</strong>';
    h += '    </div>';
    h += '    <div class="fidelite-conversion-info">';
    h += '      <span>Montant à convertir</span>';
    h += '      <strong>' + dhDisponibles.toFixed(2) + ' DH</strong>';
    h += '    </div>';
    if (blocsDisponibles > 0) {
        h += '    <button class="fidelite-convert-btn" onclick="clientConvertirPoints()"><i class="fas fa-exchange-alt"></i> Convertir ' + dhDisponibles.toFixed(0) + ' DH</button>';
    } else {
        h += '    <button class="fidelite-convert-btn" disabled><i class="fas fa-info-circle"></i> Minimum 100 points requis</button>';
    }
    h += '  </div>';
    h += '</div>';

    // Profil
    h += '<div class="content-card">';
    h += '  <div class="card-header"><h3><i class="fas fa-user-circle" style="color:#10B981;"></i> Mon Profil</h3></div>';
    h += '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:0.9rem;">';
    h += '    <div><strong>Nom:</strong> ' + escapeHtml(clientData.nom || '') + '</div>';
    h += '    <div><strong>Prénom:</strong> ' + escapeHtml(clientData.prenom || '') + '</div>';
    h += '    <div><strong>Email:</strong> ' + escapeHtml(clientData.email || '') + '</div>';
    h += '    <div><strong>Tél:</strong> ' + escapeHtml(clientData.telephone || '-') + '</div>';
    h += '    <div><strong>Adresse:</strong> ' + escapeHtml(clientData.adresse || '-') + '</div>';
    h += '    <div><strong>Points Fidélité:</strong> ' + points + ' pts</div>';
    h += '  </div>';
    h += '  <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">';
    h += '    <button class="btn-client-primary" onclick="clientOpenEditProfile()"><i class="fas fa-edit"></i> Modifier mon profil</button>';
    h += '    <button class="btn-client-secondary" onclick="clientOpenChangePassword()"><i class="fas fa-lock"></i> Changer mot de passe</button>';
    h += '  </div>';
    h += '</div>';

    c.innerHTML = h;
    window.clientProfileData = clientData;
    window.clientProfileDocId = clientDocId;
    window.clientFideliteData = { points: points, dhDisponibles: dhDisponibles, blocsDisponibles: blocsDisponibles };
}

// ==================== 🆕 v4 : CONVERSION POINTS FIDÉLITÉ → DH ====================
async function clientConvertirPoints() {
    if (!window.clientFideliteData) {
        alert('❌ Données fidélité non chargées.');
        return;
    }

    var points = window.clientFideliteData.points;
    var dhDisponibles = window.clientFideliteData.dhDisponibles;
    var blocsDisponibles = window.clientFideliteData.blocsDisponibles;

    if (blocsDisponibles <= 0 || dhDisponibles <= 0) {
        alert('❌ Vous avez besoin d\'au moins 100 points pour convertir.');
        return;
    }

    if (!confirm('Convertir ' + dhDisponibles.toFixed(0) + ' DH ?\n\n' + (blocsDisponibles * FIDELITE_POINTS_PAR_DH) + ' points seront déduits.\nIl restera ' + (points - (blocsDisponibles * FIDELITE_POINTS_PAR_DH)) + ' points.')) {
        return;
    }

    var pointsUtilises = blocsDisponibles * FIDELITE_POINTS_PAR_DH;
    var nouveauxPoints = points - pointsUtilises;

    try {
        // 1. Récupérer le document client
        var clientId = window.clientProfileDocId;
        if (!clientId) {
            // Chercher par email
            var userEmail = window.currentUserData.userData.email;
            var clientSnap = await db.collection('clients').where('email', '==', userEmail).get();
            if (!clientSnap.empty) clientId = clientSnap.docs[0].id;
        }

        if (!clientId) {
            alert('❌ Impossible de trouver votre compte client.');
            return;
        }

        // 2. Mettre à jour les points fidélité
        var updatedData = {
            pointsFidelite: nouveauxPoints,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('clients').doc(clientId).update(updatedData);

        // 3. Mettre à jour le cache
        if (typeof CacheDB !== 'undefined' && CacheDB.set) {
            var existing = await CacheDB.get('clients', clientId);
            if (existing) {
                existing.pointsFidelite = nouveauxPoints;
                await CacheDB.set('clients', clientId, existing);
            }
        }

        // 4. Enregistrer la conversion comme crédit payé (bonus)
        try {
            await db.collection('conversions_fidelite').add({
                clientId: clientId,
                clientName: (window.currentUserData.userData.prenom || '') + ' ' + (window.currentUserData.userData.nom || ''),
                pointsUtilises: pointsUtilises,
                dhObtenus: dhDisponibles,
                pointsRestants: nouveauxPoints,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch(e) { console.warn('Erreur enregistrement conversion:', e); }

        alert('✅ Conversion réussie !\n\n' + dhDisponibles.toFixed(0) + ' DH ont été convertis.\nNouveau solde : ' + nouveauxPoints + ' points.');

        // 5. Recharger la page
        loadClientParametresPage();

        // 6. Sync cache
        if (typeof CacheDB !== 'undefined' && CacheDB.sync) {
            CacheDB.sync().catch(function() {});
        }

    } catch(e) {
        console.error('❌ Erreur conversion:', e);
        alert('❌ Erreur lors de la conversion: ' + e.message);
    }
}

// ==================== PROFIL : ÉDITER ====================
function clientOpenEditProfile() {
    var data = window.clientProfileData || window.currentUserData.userData;
    var h = '';
    h += '<div class="form-row"><div class="form-group"><label>Nom *</label><input type="text" id="clientEditNom" value="' + escapeHtml(data.nom || '') + '"></div><div class="form-group"><label>Prénom *</label><input type="text" id="clientEditPrenom" value="' + escapeHtml(data.prenom || '') + '"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Téléphone</label><input type="text" id="clientEditTel" value="' + escapeHtml(data.telephone || '') + '"></div><div class="form-group"><label>Adresse</label><input type="text" id="clientEditAdresse" value="' + escapeHtml(data.adresse || '') + '"></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="clientSaveProfile()">Enregistrer</button>';
    openModal('✏️ Modifier mon profil', h);
}

async function clientSaveProfile() {
    var nom = document.getElementById('clientEditNom').value.trim();
    var prenom = document.getElementById('clientEditPrenom').value.trim();
    if (!nom || !prenom) { alert('Nom et Prénom obligatoires'); return; }
    var updatedData = {
        nom: nom, prenom: prenom,
        telephone: document.getElementById('clientEditTel').value,
        adresse: document.getElementById('clientEditAdresse').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        var docId = window.clientProfileDocId;
        if (docId) {
            await CacheDB.write('clients', docId, updatedData, 'update');
            await CacheDB.write('users', window.currentUserData.uid, { nom: nom, prenom: prenom, telephone: updatedData.telephone }, 'update');
        } else {
            updatedData.email = window.currentUserData.userData.email;
            updatedData.username = window.currentUserData.userData.username;
            updatedData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            var newDocId = await CacheDB.write('clients', null, updatedData, 'add');
            window.clientProfileDocId = newDocId;
        }
        window.currentUserData.userData.nom = nom;
        window.currentUserData.userData.prenom = prenom;
        window.clientProfileData = updatedData;
        alert('✅ Profil mis à jour !');
        closeModal();
        loadClientParametresPage();
        CacheDB.sync();
    } catch(e) { alert('Erreur: ' + e.message); }
}

// ==================== PROFIL : CHANGER MOT DE PASSE ====================
function clientOpenChangePassword() {
    var h = '<div class="form-row"><div class="form-group"><label>Mot de passe actuel</label><input type="password" id="clientOldPassword"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="clientNewPassword"></div></div>';
    h += '<div class="form-row"><div class="form-group"><label>Confirmer</label><input type="password" id="clientConfirmPassword"></div></div>';
    h += '<button class="btn-cancel" onclick="closeModal()">Annuler</button><button class="btn-save" onclick="clientChangePassword()">Changer</button>';
    openModal('🔒 Changer mot de passe', h);
}

async function clientChangePassword() {
    var oldPass = document.getElementById('clientOldPassword').value;
    var newPass = document.getElementById('clientNewPassword').value;
    var confirmPass = document.getElementById('clientConfirmPassword').value;
    if (!oldPass || !newPass || !confirmPass) { alert('Tous les champs obligatoires'); return; }
    if (newPass.length < 6) { alert('6 caractères minimum'); return; }
    if (newPass !== confirmPass) { alert('Ne correspondent pas'); return; }
    var user = auth.currentUser;
    if (!user) { alert('Non connecté'); return; }
    try {
        await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, oldPass));
        await user.updatePassword(newPass);
        alert('✅ Mot de passe changé');
        closeModal();
    } catch(e) {
        if (e.code === 'auth/wrong-password') alert('❌ Mot de passe actuel incorrect');
        else alert('Erreur: ' + e.message);
    }
}

// ==================== EXPORTS GLOBAUX ====================
window.clientNavigate = clientNavigate;
window.loadClientCommanderPage = loadClientCommanderPage;
window.renderClientPOS = renderClientPOS;
window.clientValidateOrder = clientValidateOrder;
window.loadClientHistoriquePage = loadClientHistoriquePage;
window.loadClientParametresPage = loadClientParametresPage;
window.clientOpenEditProfile = clientOpenEditProfile;
window.clientSaveProfile = clientSaveProfile;
window.clientOpenChangePassword = clientOpenChangePassword;
window.clientChangePassword = clientChangePassword;
window.clientConvertirPoints = clientConvertirPoints;
window.masquerElementsAdminDansClient = masquerElementsAdminDansClient;
window.renderClientWelcomeBanner = renderClientWelcomeBanner;
window.injectClientStyles = injectClientStyles;

console.log('🚀 E-SOLUTION - Client JS v7 chargé');
console.log('✅ Historique complet : commandes + ventes + crédits');
console.log('✅ Crédits payés disparaissent (paid=true ou remainingAmount=0)');
console.log('✅ Profil : crédits + points fidélité + équivalent DH');
console.log('✅ Conversion 100 points = 10 DH');
console.log('✅ Validation directe sans étape paiement');
console.log('✅ 1 seul panier (pas de multi-paniers)');
console.log('✅ Vert + Blanc uniquement (anti-bleu)');
console.log('✅ Balance en haut masquée');
