// ==================== ADMIN-CRUD.JS - E-SOLUTION ====================
// ✅ Design unifié bleu/blanc POS minimaliste (pages + formulaires)
// ✅ Statistiques analyste en haut de chaque page
// ✅ Index de prix fournisseur + comparaison + confirmation
// ✅ Fix stock: conversion safe (Number) pour éviter [object Object]
// ✅ Formulaires modernes responsive
// ✅ Dates production / durée conservation / date expiration
// ✅ 🆕 Tri des colonnes dans le tableau d'achat (asc/desc)
// ✅ 🆕 Bouton "Commander" → WhatsApp fournisseur

const GEMINI_WORKER_URL = 'https://mon-proxy-gemini.ssalihssalim.workers.dev/';

window.productSearchQuery = window.productSearchQuery || '';
window.fournisseurSearchQuery = window.fournisseurSearchQuery || '';
window.clientSearchQuery = window.clientSearchQuery || '';
window.categorieSearchQuery = window.categorieSearchQuery || '';

// 🆕 État tri tableau achat
var achatSortCol = 'nom';
var achatSortDir = 'asc';

// ====================================================
//  🎨 STYLES INJECTÉS
// ====================================================
function injectAdminCrudsStyles() {
    if (document.getElementById('admin-cruds-modern-styles')) return;
    var css = '';
    css += '<style id="admin-cruds-modern-styles">';
    css += ':root{';
    css += '--ac-blue-50:#EFF6FF;--ac-blue-100:#DBEAFE;--ac-blue-200:#BFDBFE;';
    css += '--ac-blue-500:#3B82F6;--ac-blue-600:#2563EB;--ac-blue-700:#1D4ED8;';
    css += '--ac-white:#FFFFFF;--ac-gray-50:#F8FAFC;--ac-gray-100:#F1F5F9;';
    css += '--ac-gray-200:#E2E8F0;--ac-gray-400:#94A3B8;--ac-gray-500:#64748B;';
    css += '--ac-gray-700:#334155;--ac-gray-900:#0F172A;';
    css += '--ac-green:#10B981;--ac-red:#EF4444;--ac-orange:#F59E0B;--ac-purple:#8B5CF6;--ac-pink:#EC4899;';
    css += '--ac-shadow-sm:0 1px 2px rgba(0,0,0,0.04);';
    css += '--ac-shadow-lg:0 12px 32px rgba(0,0,0,0.08);';
    css += '--ac-radius:12px;--ac-radius-lg:16px;';
    css += '}';
    /* PAGE */
    css += '.ac-page{background:linear-gradient(180deg,#FAFBFC 0%,#F4F6F8 100%);min-height:100vh;padding:24px;font-family:Inter,-apple-system,sans-serif;}';
    css += '.ac-header{background:var(--ac-white);border-radius:var(--ac-radius-lg);padding:24px 28px;box-shadow:var(--ac-shadow-sm);border:1px solid rgba(0,0,0,0.04);margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}';
    css += '.ac-header h2{font-size:24px;font-weight:800;color:var(--ac-gray-900);letter-spacing:-0.5px;margin:0;display:flex;align-items:center;gap:12px;}';
    css += '.ac-header h2 i{background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-700));color:white;padding:10px;border-radius:12px;font-size:18px;box-shadow:0 4px 12px rgba(59,130,246,0.3);}';
    css += '.ac-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}';
    /* BTN */
    css += '.ac-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s ease;font-family:Inter,sans-serif;white-space:nowrap;}';
    css += '.ac-btn:disabled{opacity:0.5;cursor:not-allowed;}';
    css += '.ac-btn-primary{background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-600));color:white;box-shadow:0 2px 8px rgba(59,130,246,0.3);}';
    css += '.ac-btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,0.4);}';
    css += '.ac-btn-achat{background:linear-gradient(135deg,var(--ac-green),#059669);color:white;box-shadow:0 2px 8px rgba(16,185,129,0.3);}';
    css += '.ac-btn-achat:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(16,185,129,0.4);}';
    css += '.ac-btn-scan{background:linear-gradient(135deg,#06B6D4,#0891B2);color:white;box-shadow:0 2px 8px rgba(6,182,212,0.3);}';
    css += '.ac-btn-scan:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(6,182,212,0.4);}';
    css += '.ac-btn-whatsapp{background:linear-gradient(135deg,#25D366,#128C7E);color:white;box-shadow:0 2px 8px rgba(37,211,102,0.3);}';
    css += '.ac-btn-whatsapp:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(37,211,102,0.4);}';
    css += '.ac-btn-ghost{background:var(--ac-gray-100);color:var(--ac-gray-700);border:1.5px solid var(--ac-gray-200);}';
    css += '.ac-btn-ghost:hover:not(:disabled){background:var(--ac-gray-200);border-color:var(--ac-gray-400);}';
    /* SEARCH */
    css += '.ac-search{display:flex;align-items:center;gap:8px;background:var(--ac-white);border:1.5px solid var(--ac-gray-200);border-radius:12px;padding:4px 4px 4px 16px;transition:all 0.2s ease;flex:1;min-width:240px;box-shadow:var(--ac-shadow-sm);}';
    css += '.ac-search:focus-within{border-color:var(--ac-blue-500);box-shadow:0 0 0 4px rgba(59,130,246,0.1);}';
    css += '.ac-search i{color:var(--ac-gray-400);font-size:16px;}';
    css += '.ac-search input{flex:1;border:none;background:transparent;padding:10px 8px;font-size:15px;outline:none;color:var(--ac-gray-900);font-family:Inter,sans-serif;}';
    css += '.ac-search input::placeholder{color:var(--ac-gray-400);}';
    /* STATS */
    css += '.ac-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;}';
    css += '.ac-stat-card{background:var(--ac-white);border-radius:14px;padding:18px 20px;border:1px solid rgba(0,0,0,0.04);box-shadow:var(--ac-shadow-sm);transition:all 0.25s ease;position:relative;overflow:hidden;}';
    css += '.ac-stat-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--ac-blue-500);opacity:0;transition:opacity 0.25s;}';
    css += '.ac-stat-card:hover{transform:translateY(-3px);box-shadow:0 4px 8px rgba(0,0,0,0.06),0 12px 24px rgba(0,0,0,0.06);}';
    css += '.ac-stat-card:hover::before{opacity:1;}';
    css += '.ac-stat-card .ac-stat-label{font-size:11px;font-weight:700;color:var(--ac-gray-500);text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;display:flex;align-items:center;gap:6px;}';
    css += '.ac-stat-card .ac-stat-value{font-size:22px;font-weight:800;color:var(--ac-gray-900);letter-spacing:-0.5px;line-height:1.2;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
    css += '.ac-stat-card .ac-stat-sub{font-size:11px;color:var(--ac-gray-500);margin-top:4px;font-weight:500;}';
    css += '.ac-stat-card.blue::before{background:var(--ac-blue-500);}';
    css += '.ac-stat-card.blue .ac-stat-value{color:var(--ac-blue-600);}';
    css += '.ac-stat-card.green::before{background:var(--ac-green);}';
    css += '.ac-stat-card.green .ac-stat-value{color:var(--ac-green);}';
    css += '.ac-stat-card.orange::before{background:var(--ac-orange);}';
    css += '.ac-stat-card.orange .ac-stat-value{color:var(--ac-orange);}';
    css += '.ac-stat-card.red::before{background:var(--ac-red);}';
    css += '.ac-stat-card.red .ac-stat-value{color:var(--ac-red);}';
    css += '.ac-stat-card.purple::before{background:var(--ac-purple);}';
    css += '.ac-stat-card.purple .ac-stat-value{color:var(--ac-purple);}';
    css += '.ac-stat-card.pink::before{background:var(--ac-pink);}';
    css += '.ac-stat-card.pink .ac-stat-value{color:var(--ac-pink);}';
    /* GRID CARDS */
    css += '.ac-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:20px;}';
    css += '.ac-card{background:var(--ac-white);border-radius:var(--ac-radius);border:1px solid rgba(0,0,0,0.06);box-shadow:var(--ac-shadow-sm);transition:all 0.25s ease;overflow:hidden;display:flex;flex-direction:column;}';
    css += '.ac-card:hover{transform:translateY(-4px);box-shadow:var(--ac-shadow-lg);border-color:var(--ac-blue-200);}';
    css += '.ac-card-image{width:100%;height:140px;background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-blue-100));display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--ac-blue-500);position:relative;overflow:hidden;}';
    css += '.ac-card-image img{width:100%;height:100%;object-fit:cover;}';
    css += '.ac-badge{position:absolute;top:10px;right:10px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:var(--ac-blue-500);color:white;}';
    css += '.ac-badge.stock-low{background:var(--ac-orange);}';
    css += '.ac-badge.stock-out{background:var(--ac-red);}';
    css += '.ac-badge.recette-on{background:var(--ac-green);}';
    css += '.ac-card-body{padding:16px;flex:1;display:flex;flex-direction:column;gap:6px;}';
    css += '.ac-card-title{font-size:15px;font-weight:700;color:var(--ac-gray-900);margin:0;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}';
    css += '.ac-card-category{font-size:12px;font-weight:500;color:var(--ac-blue-600);background:var(--ac-blue-50);padding:2px 8px;border-radius:6px;align-self:flex-start;}';
    css += '.ac-card-price{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:12px;border-top:1px solid var(--ac-gray-100);}';
    css += '.ac-price-main{font-size:18px;font-weight:800;color:var(--ac-blue-600);letter-spacing:-0.5px;}';
    css += '.ac-price-sub{font-size:12px;color:var(--ac-gray-500);}';
    css += '.ac-card-info{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ac-gray-500);margin-top:4px;}';
    css += '.ac-card-actions{display:flex;gap:4px;padding:12px 16px;background:var(--ac-gray-50);border-top:1px solid var(--ac-gray-100);}';
    css += '.ac-card-actions button{flex:1;padding:8px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;gap:4px;}';
    css += '.ac-card-actions .edit{background:var(--ac-blue-50);color:var(--ac-blue-700);}';
    css += '.ac-card-actions .edit:hover{background:var(--ac-blue-500);color:white;}';
    css += '.ac-card-actions .delete{background:#FEF2F2;color:var(--ac-red);}';
    css += '.ac-card-actions .delete:hover{background:var(--ac-red);color:white;}';
    css += '.ac-empty{text-align:center;padding:60px 20px;color:var(--ac-gray-500);}';
    css += '.ac-empty i{font-size:64px;color:var(--ac-gray-200);margin-bottom:16px;}';
    css += '.ac-empty h3{font-size:18px;color:var(--ac-gray-700);margin:0 0 8px 0;}';
    css += '.ac-empty p{font-size:14px;margin:0;}';
    /* MODAL ACHAT */
    css += '.ac-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;}';
    css += '.ac-modal{background:var(--ac-white);border-radius:var(--ac-radius-lg);width:100%;max-width:1200px;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.25);overflow:hidden;}';
    css += '.ac-modal-header{padding:20px 28px;border-bottom:1px solid var(--ac-gray-200);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-white));}';
    css += '.ac-modal-header h3{font-size:20px;font-weight:800;color:var(--ac-gray-900);margin:0;display:flex;align-items:center;gap:12px;letter-spacing:-0.3px;}';
    css += '.ac-modal-header h3 i{background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-700));color:white;padding:10px;border-radius:12px;font-size:18px;}';
    css += '.ac-modal-close{width:40px;height:40px;border-radius:50%;border:none;background:var(--ac-gray-100);color:var(--ac-gray-500);font-size:18px;cursor:pointer;}';
    css += '.ac-modal-close:hover{background:var(--ac-gray-200);color:var(--ac-gray-900);}';
    css += '.ac-modal-toolbar{padding:16px 28px;background:var(--ac-gray-50);border-bottom:1px solid var(--ac-gray-200);display:flex;gap:12px;flex-wrap:wrap;align-items:center;}';
    css += '.ac-modal-toolbar select{padding:11px 14px;border:1.5px solid var(--ac-gray-200);border-radius:10px;font-size:14px;font-weight:500;min-width:280px;background:var(--ac-white);color:var(--ac-gray-900);outline:none;cursor:pointer;}';
    css += '.ac-modal-toolbar select:focus{border-color:var(--ac-blue-500);box-shadow:0 0 0 4px rgba(59,130,246,0.1);}';
    css += '.ac-modal-body{flex:1;overflow-y:auto;padding:20px 28px;background:var(--ac-white);}';
    css += '.ac-modal-table{width:100%;border-collapse:separate;border-spacing:0;font-size:14px;}';
    css += '.ac-modal-table thead th{position:sticky;top:0;background:var(--ac-gray-50);padding:12px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--ac-gray-500);text-transform:uppercase;letter-spacing:0.6px;border-bottom:2px solid var(--ac-gray-200);z-index:2;}';
    css += '.ac-modal-table thead th.center{text-align:center;}';
    css += '.ac-modal-table tbody td{padding:12px 10px;border-bottom:1px solid var(--ac-gray-100);vertical-align:middle;color:var(--ac-gray-700);}';
    css += '.ac-modal-table tbody tr.has-changement td{background:#FEF3C7!important;}';
    css += '.ac-modal-table .ac-product-name{font-weight:600;color:var(--ac-gray-900);font-size:14px;}';
    css += '.ac-modal-table input[type=number],.ac-modal-table input[type=date]{width:100%;padding:8px 10px;border:1.5px solid var(--ac-gray-200);border-radius:8px;font-size:14px;color:var(--ac-gray-900);background:var(--ac-white);outline:none;text-align:center;}';
    css += '.ac-modal-table input:focus{border-color:var(--ac-blue-500);box-shadow:0 0 0 3px rgba(59,130,246,0.1);}';
    css += '.ac-modal-table input.changed{border-color:var(--ac-orange);background:#FFFBEB;}';
    css += '.ac-modal-table .ac-total-cell{font-weight:800;color:var(--ac-blue-600);font-size:15px;text-align:center;}';
    css += '.ac-modal-table .ac-price-old{font-size:11px;color:var(--ac-gray-400);text-decoration:line-through;display:block;}';
    css += '.ac-modal-table .ac-price-change-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#FEF3C7;color:#92400E;margin-top:4px;}';
    css += '.ac-modal-table .ac-price-change-badge.up{background:#FEE2E2;color:#991B1B;}';
    css += '.ac-modal-table .ac-price-change-badge.down{background:#D1FAE5;color:#065F46;}';
    css += '.ac-modal-footer{padding:20px 28px;border-top:2px solid var(--ac-gray-200);background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-white));display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;}';
    css += '.ac-modal-totals{display:flex;gap:24px;align-items:center;flex-wrap:wrap;}';
    css += '.ac-total-block{display:flex;flex-direction:column;gap:2px;}';
    css += '.ac-total-block .label{font-size:11px;font-weight:700;color:var(--ac-gray-500);text-transform:uppercase;letter-spacing:0.5px;}';
    css += '.ac-total-block .value{font-size:22px;font-weight:800;color:var(--ac-gray-900);letter-spacing:-0.5px;}';
    css += '.ac-total-block .value.blue{color:var(--ac-blue-600);}';
    css += '.ac-total-block .value.green{color:var(--ac-green);}';
    css += '.ac-modal-actions{display:flex;gap:12px;align-items:center;}';
    css += '.ac-scan-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;color:white;}';
    css += '.ac-scan-overlay .spinner{width:60px;height:60px;border:4px solid rgba(255,255,255,0.2);border-top-color:var(--ac-blue-500);border-radius:50%;animation:acSpin 1s linear infinite;}';
    css += '@keyframes acSpin{to{transform:rotate(360deg);}}';
    css += '.ac-scan-overlay p{font-size:18px;font-weight:600;margin:0;}';

    /* ========== 🎨 FORMULAIRES MODERNES ========== */
    css += '.ac-form-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(6px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;animation:acFadeIn 0.2s;}';
    css += '@keyframes acFadeIn{from{opacity:0;}to{opacity:1;}}';
    css += '.ac-form-modal{background:var(--ac-white);border-radius:var(--ac-radius-lg);width:100%;max-width:820px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.25);overflow:hidden;animation:acSlideUp 0.3s;}';
    css += '@keyframes acSlideUp{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}';
    css += '.ac-form-header{padding:20px 28px;border-bottom:1px solid var(--ac-gray-200);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,var(--ac-blue-50),var(--ac-white));flex-shrink:0;}';
    css += '.ac-form-header h3{font-size:20px;font-weight:800;color:var(--ac-gray-900);margin:0;display:flex;align-items:center;gap:12px;letter-spacing:-0.3px;}';
    css += '.ac-form-header h3 i{background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-700));color:white;padding:10px;border-radius:12px;font-size:18px;box-shadow:0 4px 12px rgba(59,130,246,0.3);}';
    css += '.ac-form-close{width:40px;height:40px;border-radius:50%;border:none;background:var(--ac-gray-100);color:var(--ac-gray-500);font-size:18px;cursor:pointer;transition:all 0.2s;}';
    css += '.ac-form-close:hover{background:var(--ac-gray-200);color:var(--ac-gray-900);transform:rotate(90deg);}';
    css += '.ac-form-body{flex:1;overflow-y:auto;padding:24px 28px;background:var(--ac-gray-50);}';
    css += '.ac-form-section{background:var(--ac-white);border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid var(--ac-gray-200);}';
    css += '.ac-form-section-title{font-size:12px;font-weight:800;color:var(--ac-blue-700);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 14px 0;display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--ac-gray-100);}';
    css += '.ac-form-section-title i{color:var(--ac-blue-500);}';
    css += '.ac-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}';
    css += '.ac-form-grid.cols-1{grid-template-columns:1fr;}';
    css += '.ac-form-grid.cols-3{grid-template-columns:1fr 1fr 1fr;}';
    css += '.ac-form-group{display:flex;flex-direction:column;gap:6px;}';
    css += '.ac-form-group.full{grid-column:1/-1;}';
    css += '.ac-form-label{font-size:12px;font-weight:700;color:var(--ac-gray-700);text-transform:uppercase;letter-spacing:0.5px;}';
    css += '.ac-form-label .req{color:var(--ac-red);}';
    css += '.ac-form-input,.ac-form-select,.ac-form-textarea{width:100%;padding:11px 14px;border:1.5px solid var(--ac-gray-200);border-radius:10px;font-size:14px;font-family:Inter,sans-serif;color:var(--ac-gray-900);background:var(--ac-white);transition:all 0.2s ease;outline:none;box-sizing:border-box;}';
    css += '.ac-form-input:focus,.ac-form-select:focus,.ac-form-textarea:focus{border-color:var(--ac-blue-500);box-shadow:0 0 0 4px rgba(59,130,246,0.1);}';
    css += '.ac-form-input:read-only{background:var(--ac-gray-100);color:var(--ac-gray-500);cursor:not-allowed;}';
    css += '.ac-form-textarea{resize:vertical;min-height:70px;}';
    css += '.ac-form-select{cursor:pointer;}';
    css += '.ac-form-hint{font-size:11px;color:var(--ac-gray-500);font-style:italic;margin-top:2px;}';
    css += '.ac-form-footer{padding:16px 28px;border-top:1px solid var(--ac-gray-200);background:var(--ac-white);display:flex;justify-content:flex-end;gap:12px;flex-shrink:0;flex-wrap:wrap;}';
    css += '.ac-btn-cancel{background:var(--ac-gray-100);color:var(--ac-gray-700);padding:11px 22px;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px;transition:all 0.2s;}';
    css += '.ac-btn-cancel:hover{background:var(--ac-gray-200);}';
    css += '.ac-btn-save{background:linear-gradient(135deg,var(--ac-blue-500),var(--ac-blue-600));color:white;padding:11px 24px;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;transition:all 0.2s;box-shadow:0 2px 8px rgba(59,130,246,0.3);display:inline-flex;align-items:center;gap:8px;}';
    css += '.ac-btn-save:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,0.4);}';
    css += '.ac-index-config{background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:10px;padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;}';
    css += '.ac-index-config label{font-size:11px;font-weight:800;color:#075985;text-transform:uppercase;letter-spacing:0.5px;}';
    css += '.ac-index-config select{padding:8px 12px;border:1.5px solid #BAE6FD;border-radius:8px;font-size:13px;background:white;color:#0F172A;outline:none;}';
    css += '.ac-chip-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}';
    css += '.ac-chip{background:var(--ac-blue-500);color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;}';
    css += '.ac-chip-x{cursor:pointer;font-weight:800;font-size:14px;opacity:0.8;}';
    css += '.ac-chip-x:hover{opacity:1;}';
    css += '.ac-cat-check-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}';
    css += '.ac-cat-check{padding:8px 14px;border:1.5px solid var(--ac-gray-200);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;background:var(--ac-white);display:inline-flex;align-items:center;gap:6px;}';
    css += '.ac-cat-check input{display:none;}';
    css += '.ac-cat-check.checked{background:var(--ac-blue-500);color:white;border-color:var(--ac-blue-600);}';

    /* RESPONSIVE */
    css += '@media(max-width:768px){';
    css += '.ac-page{padding:12px;}';
    css += '.ac-header{padding:16px;flex-direction:column;align-items:stretch;}';
    css += '.ac-actions{flex-direction:column;align-items:stretch;}';
    css += '.ac-search{min-width:0;width:100%;}';
    css += '.ac-grid{grid-template-columns:1fr;}';
    css += '.ac-stats-grid{grid-template-columns:repeat(2,1fr);gap:8px;}';
    css += '.ac-stat-card{padding:12px;}';
    css += '.ac-stat-card .ac-stat-value{font-size:16px;}';
    css += '.ac-modal{max-width:100%;height:100vh;border-radius:0;}';
    css += '.ac-modal-toolbar{padding:12px 16px;flex-direction:column;align-items:stretch;}';
    css += '.ac-modal-toolbar select{min-width:0;width:100%;}';
    css += '.ac-modal-body{padding:12px;}';
    css += '.ac-modal-footer{padding:16px;flex-direction:column;align-items:stretch;}';
    css += '.ac-modal-actions{flex-direction:column;}';
    css += '.ac-modal-actions button{width:100%;}';
    css += '.ac-form-modal{max-width:100%;height:100vh;max-height:100vh;border-radius:0;}';
    css += '.ac-form-body{padding:16px;}';
    css += '.ac-form-grid{grid-template-columns:1fr;}';
    css += '.ac-form-grid.cols-3{grid-template-columns:1fr;}';
    css += '.ac-form-footer{flex-direction:column-reverse;}';
    css += '.ac-form-footer button{width:100%;}';
    css += '}';
    css += '@media(max-width:400px){';
    css += '.ac-stats-grid{grid-template-columns:1fr;}';
    css += '}';
    css += '</style>';
    document.head.insertAdjacentHTML('beforeend', css);
}
injectAdminCrudsStyles();
window.injectAdminCrudsStyles = injectAdminCrudsStyles;

// ====================================================
//  🧮 HELPERS
// ====================================================
function acNum(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') { var n = parseFloat(v.replace(',', '.')); return isFinite(n) ? n : 0; }
    if (typeof v === 'object') {
        if (typeof v.value === 'number') return v.value;
        if (typeof v.integerValue === 'number') return v.integerValue;
        if (typeof v.doubleValue === 'number') return v.doubleValue;
    }
    return 0;
}
function acFormatMAD(n) { return acNum(n).toFixed(2) + ' MAD'; }
function acFormatPct(n) { return acNum(n).toFixed(1) + ' %'; }
function acStatCard(label, value, sub, colorClass, icon) {
    var html = '<div class="ac-stat-card ' + (colorClass || 'blue') + '">';
    html += '<p class="ac-stat-label"><i class="fas ' + (icon || 'fa-chart-line') + '"></i> ' + label + '</p>';
    html += '<p class="ac-stat-value">' + value + '</p>';
    if (sub) html += '<p class="ac-stat-sub">' + sub + '</p>';
    html += '</div>';
    return html;
}

// ====================================================
//  🎨 HELPER FORMULAIRE MODERNE
// ====================================================
function openModernForm(opts) {
    var old = document.getElementById('acModernFormOverlay');
    if (old) old.remove();

    var html = '';
    html += '<div id="acModernFormOverlay" class="ac-form-overlay">';
    html += '  <div class="ac-form-modal">';
    html += '    <div class="ac-form-header">';
    html += '      <h3><i class="fas ' + (opts.icon || 'fa-edit') + '"></i> ' + escapeHtml(opts.title || '') + '</h3>';
    html += '      <button class="ac-form-close" onclick="closeModernForm()" title="Fermer"><i class="fas fa-times"></i></button>';
    html += '    </div>';
    html += '    <div class="ac-form-body">' + (opts.body || '') + '</div>';
    html += '    <div class="ac-form-footer">';
    html += '      <button class="ac-btn-cancel" onclick="closeModernForm()">Annuler</button>';
    html += '      <button class="ac-btn-save" onclick="' + (opts.onSave || '') + '"><i class="fas fa-check"></i> Enregistrer</button>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
}
function closeModernForm() {
    var el = document.getElementById('acModernFormOverlay');
    if (el) el.remove();
}
window.openModernForm = openModernForm;
window.closeModernForm = closeModernForm;

// ====================================================
//  📊 STATS
// ====================================================
function renderCategoriesStats(data) {
    var totalCat = (data || []).length;
    var totalCA = 0, totalProfit = 0;
    var bestCat = null, bestCA = -Infinity;
    (data || []).forEach(function(c) {
        var ca = acNum(c.ca), profit = acNum(c.profit);
        totalCA += ca; totalProfit += profit;
        if (ca > bestCA) { bestCA = ca; bestCat = c.nom || '-'; }
    });
    var totalProduits = (window.allProductsData || []).length;
    var marge = totalCA > 0 ? (totalProfit / totalCA * 100) : 0;
    var html = '';
    html += acStatCard('Catégories', totalCat, 'Actives', 'blue', 'fa-layer-group');
    html += acStatCard('CA total', acFormatMAD(totalCA), 'Toutes catégories', 'green', 'fa-coins');
    html += acStatCard('Profit total', acFormatMAD(totalProfit), 'Marge: ' + acFormatPct(marge), 'purple', 'fa-chart-line');
    html += acStatCard('Produits', totalProduits, 'Toutes catégories', 'orange', 'fa-box');
    html += acStatCard('Top catégorie', bestCat || '—', bestCat ? 'CA: ' + acFormatMAD(bestCA) : '', 'pink', 'fa-trophy');
    return html;
}
function renderFournisseursStats(data) {
    var totalFour = (data || []).length;
    var totalCA = 0, avecCategories = 0;
    (data || []).forEach(function(f) {
        totalCA += acNum(f.ca);
        if (f.categories && f.categories.length > 0) avecCategories++;
    });
    var totalProduits = 0;
    (window.allProductsData || []).forEach(function(p) {
        if (p.fournisseurId) totalProduits++;
    });
    var html = '';
    html += acStatCard('Fournisseurs', totalFour, 'Enregistrés', 'blue', 'fa-truck');
    html += acStatCard('CA total', acFormatMAD(totalCA), 'Cumulé', 'green', 'fa-coins');
    html += acStatCard('Produits liés', totalProduits, 'Chez fournisseurs', 'orange', 'fa-box');
    html += acStatCard('Avec catégories', avecCategories, 'Fournisseurs typés', 'purple', 'fa-tags');
    html += acStatCard('Taux liaison', totalFour > 0 ? acFormatPct((avecCategories / totalFour) * 100) : '0 %', 'Four. → catégories', 'pink', 'fa-link');
    return html;
}
function renderClientsStats(data) {
    var totalClients = (data || []).length;
    var totalCA = 0, totalProfit = 0, points = 0;
    var bestClient = null, bestCA = -Infinity;
    (data || []).forEach(function(c) {
        var ca = acNum(c.ca); var profit = acNum(c.profit);
        totalCA += ca; totalProfit += profit;
        points += acNum(c.pointsFidelite);
        if (ca > bestCA) { bestCA = ca; bestClient = c.nom ? (c.nom + ' ' + (c.prenom || '')).trim() : '-'; }
    });
    var panierMoyen = totalClients > 0 ? (totalCA / totalClients) : 0;
    var html = '';
    html += acStatCard('Clients', totalClients, 'Enregistrés', 'blue', 'fa-users');
    html += acStatCard('CA total', acFormatMAD(totalCA), 'Cumulé clients', 'green', 'fa-coins');
    html += acStatCard('Panier moyen', acFormatMAD(panierMoyen), 'Par client', 'purple', 'fa-shopping-basket');
    html += acStatCard('Points fidélité', points, 'Total distribué', 'orange', 'fa-gem');
    html += acStatCard('Top client', bestClient || '—', bestClient ? 'CA: ' + acFormatMAD(bestCA) : '', 'pink', 'fa-crown');
    return html;
}
function renderProduitsStats(data) {
    var totalProduits = (data || []).length;
    var totalStock = 0, totalCA = 0, totalProfit = 0;
    var stockBas = 0, stockOut = 0, expirés = 0, expirantSoon = 0;
    var bestProduit = null, bestProfit = -Infinity;
    var now = new Date(); now.setHours(0,0,0,0);
    (data || []).forEach(function(p) {
        var stock = acNum(p.stock);
        var ca = acNum(p.ca);
        var profit = acNum(p.profit);
        totalStock += stock;
        totalCA += ca;
        totalProfit += profit;
        if (stock <= 0) stockOut++;
        else if (stock <= 5) stockBas++;
        if (profit > bestProfit) { bestProfit = profit; bestProduit = p.nom || '-'; }
        if (p.dateExpiration) {
            var exp = new Date(p.dateExpiration);
            if (!isNaN(exp.getTime())) {
                exp.setHours(0,0,0,0);
                var j = Math.ceil((exp - now) / 86400000);
                if (j < 0) expirés++;
                else if (j <= 7) expirantSoon++;
            }
        }
    });
    var margeGlobale = totalCA > 0 ? (totalProfit / totalCA * 100) : 0;
    var html = '';
    html += acStatCard('Produits', totalProduits, 'Au catalogue', 'blue', 'fa-box');
    html += acStatCard('Stock total', totalStock, 'Unités', 'purple', 'fa-cubes');
    html += acStatCard('CA total', acFormatMAD(totalCA), 'Cumulé', 'green', 'fa-coins');
    html += acStatCard('Marge', acFormatPct(margeGlobale), 'Profit/CA', 'orange', 'fa-chart-line');
    html += acStatCard('Stock bas', stockBas, '≤ 5 unités', 'orange', 'fa-exclamation-triangle');
    html += acStatCard('Ruptures', stockOut, 'À réapprovisionner', 'red', 'fa-times-circle');
    html += acStatCard('Expirés', expirés, 'À retirer', 'red', 'fa-calendar-times');
    html += acStatCard('Expirent ≤ 7j', expirantSoon, 'À surveiller', 'orange', 'fa-clock');
    return html;
}

// ====================================================
//  🧰 UTILITAIRES PRODUITS
// ====================================================
function updateSelectedCategories() {
    var select = document.getElementById('prodCategoriesSelect');
    var display = document.getElementById('selectedCategoriesDisplay');
    if (!select || !display) return;
    var selected = Array.from(select.selectedOptions).map(function(o) { return o.value; });
    display.innerHTML = selected.map(function(cat) {
        return '<span class="ac-chip">' + escapeHtml(cat) + '<span class="ac-chip-x" onclick="event.stopPropagation(); this.parentElement.remove(); deselectCategory(\'' + escapeHtml(cat.replace(/'/g, "\\'")) + '\')">×</span></span>';
    }).join('');
}
function deselectCategory(catName) {
    var select = document.getElementById('prodCategoriesSelect'); if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === catName) { select.options[i].selected = false; break; }
    }
    updateSelectedCategories();
}
window.updateSelectedCategories = updateSelectedCategories;
window.deselectCategory = deselectCategory;

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
        var t = new Date();
        input.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    }
}
window.remplirDateProductionAujourdhui = remplirDateProductionAujourdhui;

function calculerDateExpirationAuto() {
    var prodInput = document.getElementById('prodDateProduction');
    var dureeInput = document.getElementById('prodDureeConservation');
    var dateInput = document.getElementById('prodDateExpiration');
    if (!dureeInput || !dateInput) return;
    var duree = parseInt(dureeInput.value) || 0;
    if (duree <= 0) { dateInput.value = ''; return; }
    var base = prodInput && prodInput.value ? new Date(prodInput.value) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    var exp = new Date(base.getTime() + duree * 86400000);
    dateInput.value = exp.getFullYear() + '-' + String(exp.getMonth() + 1).padStart(2, '0') + '-' + String(exp.getDate()).padStart(2, '0');
}
window.calculerDateExpirationAuto = calculerDateExpirationAuto;

function autoRemplirDureeParCategorie() {
    var dureeInput = document.getElementById('prodDureeConservation');
    var select = document.getElementById('prodCategoriesSelect');
    if (!dureeInput || !select) return;
    if (dureeInput.value && parseInt(dureeInput.value) > 0) return;
    var selected = Array.from(select.selectedOptions).map(function(o) { return o.value; });
    if (selected.length === 0) return;
    var duree = getDureeConservationParCategorie(selected[0]);
    if (duree > 0) { dureeInput.value = duree; calculerDateExpirationAuto(); }
}
window.autoRemplirDureeParCategorie = autoRemplirDureeParCategorie;

// ====================================================
//  📦 CATÉGORIES
// ====================================================
function loadCategoriesPage(c) {
    injectAdminCrudsStyles();
    var html = '';
    html += '<div class="ac-page">';
    html += '  <div class="ac-header">';
    html += '    <h2><i class="fas fa-layer-group"></i> Catégories</h2>';
    html += '    <div class="ac-actions">';
    html += '      <div class="ac-search"><i class="fas fa-search"></i><input type="text" id="catSearchInput" placeholder="Rechercher une catégorie..." value="' + escapeHtml(window.categorieSearchQuery || '') + '" oninput="window.categorieSearchQuery=this.value.trim().toLowerCase();window.currentPages.categories=1;renderCategoriesTable();"></div>';
    html += '      <button class="ac-btn ac-btn-primary" onclick="openCategoryForm()"><i class="fas fa-plus"></i> Nouvelle</button>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="ac-stats-grid" id="categoriesStatsGrid"></div>';
    html += '  <div id="categoriesGridContainer"></div>';
    html += '  <div id="categoriesPagination" style="margin-top:12px;"></div>';
    html += '</div>';
    c.innerHTML = html;
    loadCategories();
}
async function loadCategories() {
    const cached = await CacheDB.getAll('categories');
    if (cached.length) { allCategoriesData = cached; renderCategoriesTable(); }
    try {
        const snapshot = await db.collection('categories').get();
        allCategoriesData = [];
        snapshot.forEach(d => allCategoriesData.push({ id: d.id, ...d.data() }));
        for (let doc of allCategoriesData) await CacheDB.set('categories', doc.id, doc);
        renderCategoriesTable();
    } catch (e) { console.error(e); }
}
async function renderCategoriesTable() {
    var container = document.getElementById('categoriesGridContainer');
    var statsGrid = document.getElementById('categoriesStatsGrid');
    if (!container) return;
    var data = applySort('categories', allCategoriesData.slice(), 'nom');
    if (window.categorieSearchQuery) {
        var q = window.categorieSearchQuery;
        data = data.filter(function(d) { return (d.nom || '').toLowerCase().indexOf(q) !== -1 || (d.description || '').toLowerCase().indexOf(q) !== -1; });
    }
    var pageData = getPageData('categories', data);
    if (statsGrid) statsGrid.innerHTML = renderCategoriesStats(data);
    if (pageData.length === 0) {
        container.innerHTML = '<div class="ac-empty"><i class="fas fa-folder-open"></i><h3>Aucune catégorie trouvée</h3><p>Cliquez sur "Nouvelle" pour ajouter votre première catégorie.</p></div>';
        document.getElementById('categoriesPagination').innerHTML = '';
        return;
    }
    var counts = {};
    (window.allProductsData || []).forEach(function(p) {
        if (p.categorie) { if (!counts[p.categorie]) counts[p.categorie] = 0; counts[p.categorie]++; }
        if (p.categories) p.categories.forEach(function(cat) { if (!counts[cat]) counts[cat] = 0; counts[cat]++; });
    });
    var html = '<div class="ac-grid">';
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var nb = counts[d.nom] || 0;
        var im = d.imageBase64 ? '<img src="' + d.imageBase64 + '" alt="' + escapeHtml(d.nom || '') + '">' : '<i class="fas fa-folder"></i>';
        var recetteBadge = d.recette ? '<span class="ac-badge recette-on">Recette</span>' : '';
        html += '<div class="ac-card">';
        html += '  <div class="ac-card-image">' + im + recetteBadge + '</div>';
        html += '  <div class="ac-card-body">';
        html += '    <h4 class="ac-card-title">' + escapeHtml(d.nom || 'Sans nom') + '</h4>';
        html += '    <span class="ac-card-category">' + nb + ' produit(s)</span>';
        html += '    <div class="ac-card-info"><i class="fas fa-sort-numeric-up"></i> Ordre : <strong>' + acNum(d.ordre) + '</strong></div>';
        html += '    <div class="ac-card-price">';
        html += '      <div><div class="ac-price-main">' + acFormatMAD(d.ca) + '</div><div class="ac-price-sub">CA</div></div>';
        html += '      <div style="text-align:right;"><div style="font-size:14px;font-weight:700;color:' + (acNum(d.profit) >= 0 ? 'var(--ac-green)' : 'var(--ac-red)') + ';">' + acFormatMAD(d.profit) + '</div><div class="ac-price-sub">Profit</div></div>';
        html += '    </div>';
        html += '    <div style="font-size:12px;color:var(--ac-gray-500);margin-top:6px;">' + escapeHtml(d.description || 'Aucune description') + '</div>';
        html += '  </div>';
        html += '  <div class="ac-card-actions">';
        html += '    <button class="edit" onclick="editDocument(\'categories\',\'' + d.id + '\')"><i class="fas fa-edit"></i> Modifier</button>';
        html += '    <button class="delete" onclick="deleteDocument(\'categories\',\'' + d.id + '\')"><i class="fas fa-trash"></i></button>';
        html += '  </div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('categoriesPagination').innerHTML = getPaginationHTML('categories', data.length);
}

function openCategoryForm(data) {
    data = data || {}; editCategoryData = data;
    var recetteChecked = data.recette ? 'checked' : '';
    var ip = data.imageBase64 ? '<img src="' + data.imageBase64 + '" style="max-width:100px;border-radius:8px;">' : '';
    var body = '';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-info-circle"></i> Informations générales</h4>';
    body += '  <div class="ac-form-grid cols-1">';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Image</label>';
    body += '      <input type="file" id="catImage" class="ac-form-input" onchange="previewImage(this,\'catPreview\')">';
    body += '      <div id="catPreview" style="margin-top:8px;">' + ip + '</div>';
    body += '    </div>';
    body += '  </div>';
    body += '  <div class="ac-form-grid" style="margin-top:14px;">';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Nom <span class="req">*</span></label>';
    body += '      <input type="text" id="catNom" class="ac-form-input" value="' + escapeHtml(data.nom || '') + '" placeholder="Ex: Boissons">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Ordre d\'affichage</label>';
    body += '      <input type="number" id="catOrdre" class="ac-form-input" value="' + acNum(data.ordre) + '" min="0" step="1" placeholder="0">';
    body += '    </div>';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Description</label>';
    body += '      <textarea id="catDesc" class="ac-form-textarea" placeholder="Description de la catégorie...">' + escapeHtml(data.description || '') + '</textarea>';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-chart-line"></i> Statistiques & options</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">CA</label>';
    body += '      <input type="number" id="catCA" class="ac-form-input" value="' + acNum(data.ca) + '" step="0.01">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Profit</label>';
    body += '      <input type="number" id="catProfit" class="ac-form-input" value="' + acNum(data.profit) + '" step="0.01">';
    body += '    </div>';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Recette</label>';
    body += '      <label class="ac-cat-check ' + (recetteChecked ? 'checked' : '') + '">';
    body += '        <input type="checkbox" id="catRecette" ' + recetteChecked + '> Activer la personnalisation';
    body += '      </label>';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';

    openModernForm({
        title: editingId ? 'Modifier Catégorie' : 'Nouvelle Catégorie',
        icon: 'fa-layer-group',
        body: body,
        onSave: 'saveCategory()'
    });
    setTimeout(function() {
        var cb = document.getElementById('catRecette');
        if (cb) cb.addEventListener('change', function() {
            var lbl = this.closest('.ac-cat-check');
            if (lbl) lbl.classList.toggle('checked', this.checked);
        });
    }, 30);
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
            ca: acNum(document.getElementById('catCA').value),
            profit: acNum(document.getElementById('catProfit').value),
            recette: recette,
            ordre: parseInt(document.getElementById('catOrdre').value) || 0
        };
        d.imageBase64 = img || existingImage;
        saveDocument('categories', d, function() {
            closeModernForm(); refreshCurrentPage();
            if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('categories');
        });
    };
    if (f) fileToBase64(f, sf); else sf(null);
}

// ====================================================
//  📦 PRODUITS
// ====================================================
async function loadStockForProductForm() {
    if (typeof allStockData === 'undefined' || allStockData.length === 0) {
        try { const snap = await db.collection('stock').orderBy('nom').get(); allStockData = []; snap.forEach(d => { let dd = d.data(); dd.id = d.id; allStockData.push(dd); }); } catch (e) { console.error(e); }
    }
}
async function loadFournisseursForForm() {
    let fournisseurs = [];
    try {
        const cached = await CacheDB.getAll('fournisseurs');
        if (cached.length) fournisseurs = cached;
        else {
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
    if (typeof allStockData !== 'undefined') { allStockData.forEach(function(s) { var sel = (ing.idStock === s.id) ? 'selected' : ''; stockOptions += '<option value="' + s.id + '" ' + sel + '>' + escapeHtml(s.nom) + ' (' + (s.unite || '') + ')</option>'; }); }
    return '<div class="ingredient-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">' +
        '<select class="ingredient-select ac-form-select" style="flex:2;" onchange="updateIngredientUnit(this)">' + stockOptions + '</select>' +
        '<input type="number" class="ingredient-qty ac-form-input" placeholder="Qté" value="' + (ing.quantite || '') + '" step="any" style="flex:1;">' +
        '<span class="ingredient-unit" style="min-width:50px;text-align:center;font-size:13px;color:var(--ac-gray-500);">' + (ing.unite || '') + '</span>' +
        '<button type="button" class="ac-btn-cancel" style="padding:6px 10px;" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button></div>';
}
function addIngredientRow() { var c = document.getElementById('productIngredientsList'); if (c) c.insertAdjacentHTML('beforeend', renderIngredientRow(c.children.length, {})); }
function updateIngredientUnit(selectEl) {
    var row = selectEl.closest('.ingredient-row'); var span = row.querySelector('.ingredient-unit');
    var item = allStockData.find(function(s) { return s.id === selectEl.value; });
    span.textContent = item ? (item.unite || '') : '';
}
function calculatePrixAchat() {
    var boxPrice = acNum(document.getElementById('prodBoxPrice').value);
    var boxUnit = acNum(document.getElementById('prodBoxUnit').value) || 1;
    if (boxUnit <= 0) boxUnit = 1;
    document.getElementById('prodPA').value = (boxPrice / boxUnit).toFixed(2);
}
window.calculatePrixAchat = calculatePrixAchat;
window.addIngredientRow = addIngredientRow;
window.updateIngredientUnit = updateIngredientUnit;

function loadProductsPage(c) {
    injectAdminCrudsStyles();
    var html = '';
    html += '<div class="ac-page">';
    html += '  <div class="ac-header">';
    html += '    <h2><i class="fas fa-box"></i> Produits</h2>';
    html += '    <div class="ac-actions">';
    html += '      <div class="ac-search"><i class="fas fa-search"></i><input type="text" id="productSearchInput" placeholder="Rechercher un produit..." value="' + escapeHtml(window.productSearchQuery || '') + '" oninput="window.productSearchQuery=this.value.trim().toLowerCase();window.currentPages.products=1;renderProductsTable();"></div>';
    html += '      <select id="categoryFilter" class="ac-form-select" style="padding:11px 14px;min-width:180px;cursor:pointer;" onchange="filterProducts()"><option value="">Toutes catégories</option></select>';
    html += '      <button class="ac-btn ac-btn-primary" onclick="openProductForm()"><i class="fas fa-plus"></i> Nouveau</button>';
    html += '      <button class="ac-btn ac-btn-achat" onclick="openAchatModal()"><i class="fas fa-shopping-cart"></i> Achats</button>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="ac-stats-grid" id="productsStatsGrid"></div>';
    html += '  <div id="productsGridContainer"></div>';
    html += '  <div id="productsPagination" style="margin-top:12px;"></div>';
    html += '</div>';
    c.innerHTML = html;
    loadCategoriesInFilter();
    loadProducts();
}
async function loadCategoriesInFilter() {
    var s = document.getElementById('categoryFilter'); if (!s) return;
    try {
        var sn = await db.collection('categories').get();
        s.innerHTML = '<option value="">Toutes catégories</option>';
        sn.forEach(function(d) { s.innerHTML += '<option value="' + escapeHtml(d.data().nom) + '">' + escapeHtml(d.data().nom) + '</option>'; });
    } catch (e) {}
}
function filterProducts() { selectedCategoryFilter = document.getElementById('categoryFilter').value; currentPages.products = 1; renderProductsTable(); }
async function loadProducts() {
    const cached = await CacheDB.getAll('products');
    if (cached.length) { window.allProductsData = cached; renderProductsTable(); }
    try {
        const snapshot = await db.collection('products').get();
        window.allProductsData = [];
        snapshot.forEach(d => {
            let dd = d.data(); dd.id = d.id;
            let prix = (dd.prixPromo && dd.prixPromo > 0) ? dd.prixPromo : (dd.prixVente || 0);
            dd.profit = acNum(prix) - acNum(dd.prixAchat);
            dd.dateProduction = dd.dateProduction || '';
            dd.dureeConservation = dd.dureeConservation || 0;
            dd.dateExpiration = dd.dateExpiration || '';
            window.allProductsData.push(dd);
        });
        for (let doc of window.allProductsData) await CacheDB.set('products', doc.id, doc);
        renderProductsTable();
    } catch (e) { console.error(e); }
}
function renderProductsTable() {
    var container = document.getElementById('productsGridContainer');
    var statsGrid = document.getElementById('productsStatsGrid');
    if (!container) return;
    var data = window.allProductsData.slice();
    if (typeof selectedCategoryFilter !== 'undefined' && selectedCategoryFilter) {
        data = data.filter(function(d) { if (d.categories && d.categories.length > 0) return d.categories.includes(selectedCategoryFilter); return d.categorie === selectedCategoryFilter; });
    }
    if (window.productSearchQuery) {
        var q = window.productSearchQuery;
        data = data.filter(function(d) { return (d.nom || '').toLowerCase().indexOf(q) !== -1 || (d.description || '').toLowerCase().indexOf(q) !== -1 || (d.brand || '').toLowerCase().indexOf(q) !== -1; });
    }
    data = applySort('products', data, 'nom');
    var pageData = getPageData('products', data);
    if (statsGrid) statsGrid.innerHTML = renderProduitsStats(data);
    if (pageData.length === 0) {
        container.innerHTML = '<div class="ac-empty"><i class="fas fa-box-open"></i><h3>Aucun produit trouvé</h3><p>' + (window.productSearchQuery ? 'Essayez un autre mot-clé.' : 'Cliquez sur "Nouveau" pour ajouter votre premier produit.') + '</p></div>';
        document.getElementById('productsPagination').innerHTML = '';
        return;
    }
    var html = '<div class="ac-grid">';
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var stock = acNum(d.stock);
        var imageHtml = d.imageBase64 ? '<img src="' + d.imageBase64 + '" alt="' + escapeHtml(d.nom || '') + '">' : '<i class="fas fa-box"></i>';
        var stockBadge = '';
        if (stock <= 0) stockBadge = '<span class="ac-badge stock-out">Rupture</span>';
        else if (stock <= 5) stockBadge = '<span class="ac-badge stock-low">Stock bas</span>';
        var categoriesDisplay = (d.categories && d.categories.length > 0) ? d.categories[0] : (d.categorie || 'Sans catégorie');
        var prixVente = (d.prixPromo && d.prixPromo > 0) ? acNum(d.prixPromo) : acNum(d.prixVente);
        var prixPromoHtml = (d.prixPromo && d.prixPromo > 0) ? '<span class="ac-price-sub" style="text-decoration:line-through;">' + acNum(d.prixVente).toFixed(2) + '</span>' : '';
        var brandHtml = d.brand ? '<span style="font-size:12px;color:#64748B;">' + escapeHtml(d.brand) + '</span>' : '';
        html += '<div class="ac-card">';
        html += '  <div class="ac-card-image">' + imageHtml + stockBadge + '</div>';
        html += '  <div class="ac-card-body">';
        html += '    <h4 class="ac-card-title">' + escapeHtml(d.nom || 'Sans nom') + '</h4>';
        html += '    <span class="ac-card-category">' + escapeHtml(categoriesDisplay) + '</span>';
        html += '    ' + brandHtml;
        html += '    <div class="ac-card-info"><i class="fas fa-cubes"></i> Stock : <strong>' + stock + '</strong></div>';
        html += '    <div class="ac-card-price">';
        html += '      <div><div class="ac-price-main">' + prixVente.toFixed(2) + ' MAD</div>' + prixPromoHtml + '</div>';
        html += '      <div style="text-align:right;"><div style="font-size:12px;color:var(--ac-gray-500);">Achat</div><div style="font-size:13px;font-weight:700;">' + acNum(d.prixAchat).toFixed(2) + '</div></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="ac-card-actions">';
        html += '    <button class="edit" onclick="editDocument(\'products\',\'' + d.id + '\')"><i class="fas fa-edit"></i> Modifier</button>';
        html += '    <button class="delete" onclick="deleteDocument(\'products\',\'' + d.id + '\')"><i class="fas fa-trash"></i></button>';
        html += '  </div>';
        html += '</div>';
    }
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
            selectOptions += '<option value="' + escapeHtml(catName) + '" ' + selected + '>' + escapeHtml(catName) + '</option>';
        });
    } catch (e) {}
    const fournisseurs = await loadFournisseursForForm();
    var datalistOptions = '';
    fournisseurs.forEach(function(f) {
        var label = f.nom + (f.prenom ? ' ' + f.prenom : '') + (f.societe ? ' (' + f.societe + ')' : '');
        datalistOptions += '<option value="' + escapeHtml(label) + '" data-id="' + f.id + '">';
    });
    var fournisseurValue = '';
    if (data.fournisseurNom) fournisseurValue = data.fournisseurNom;
    else if (data.fournisseurId) {
        var found = fournisseurs.find(function(f) { return f.id === data.fournisseurId; });
        if (found) fournisseurValue = found.nom + (found.prenom ? ' ' + found.prenom : '') + (found.societe ? ' (' + found.societe + ')' : '');
    }
    var ip = data.imageBase64 ? '<img src="' + data.imageBase64 + '" style="max-width:100px;border-radius:8px;">' : '';
    var dy = data.disponible !== false ? 'selected' : '', dn = data.disponible === false ? 'selected' : '';

    var body = '';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-info-circle"></i> Informations générales</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Image</label>';
    body += '      <input type="file" id="prodImage" class="ac-form-input" onchange="previewImage(this,\'prodPreview\')">';
    body += '      <div id="prodPreview" style="margin-top:8px;">' + ip + '</div>';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Nom <span class="req">*</span></label>';
    body += '      <input type="text" id="prodNom" class="ac-form-input" value="' + escapeHtml(data.nom || '') + '">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Marque</label>';
    body += '      <input type="text" id="prodBrand" class="ac-form-input" value="' + escapeHtml(data.brand || '') + '">';
    body += '    </div>';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Catégories</label>';
    body += '      <select id="prodCategoriesSelect" multiple size="5" class="ac-form-select" onchange="updateSelectedCategories(); autoRemplirDureeParCategorie();">' + selectOptions + '</select>';
    body += '      <div id="selectedCategoriesDisplay" class="ac-chip-list"></div>';
    body += '    </div>';
    body += '    <div class="ac-form-group full">';
    body += '      <label class="ac-form-label">Fournisseur</label>';
    body += '      <input list="fournisseurList" id="prodFournisseur" class="ac-form-input" placeholder="Tapez pour rechercher..." value="' + escapeHtml(fournisseurValue) + '">';
    body += '      <datalist id="fournisseurList">' + datalistOptions + '</datalist>';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-coins"></i> Prix & Stock</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Prix boîte (MAD)</label>';
    body += '      <input type="number" id="prodBoxPrice" class="ac-form-input" step="0.01" value="' + acNum(data.box_price) + '" oninput="calculatePrixAchat()">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Unités par boîte</label>';
    body += '      <input type="number" id="prodBoxUnit" class="ac-form-input" step="1" min="1" value="' + (acNum(data.box_unit) || 1) + '" oninput="calculatePrixAchat()">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Prix achat unitaire</label>';
    body += '      <input type="number" id="prodPA" class="ac-form-input" step="0.01" value="' + acNum(data.prixAchat) + '" readonly>';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Prix Vente</label>';
    body += '      <input type="number" id="prodPV" class="ac-form-input" value="' + acNum(data.prixVente) + '" step="0.01">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Prix Promo</label>';
    body += '      <input type="number" id="prodPromo" class="ac-form-input" value="' + acNum(data.prixPromo) + '" step="0.01">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Stock</label>';
    body += '      <input type="number" id="prodStock" class="ac-form-input" value="' + acNum(data.stock) + '">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Temps Prep</label>';
    body += '      <input type="text" id="prodTemps" class="ac-form-input" value="' + escapeHtml(data.tempsPrep || '') + '" placeholder="15 min">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Disponible</label>';
    body += '      <select id="prodDispo" class="ac-form-select"><option value="1" ' + dy + '>Oui</option><option value="0" ' + dn + '>Non</option></select>';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-calendar"></i> Dates & Conservation</h4>';
    body += '  <div class="ac-form-grid cols-3">';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Date production</label>';
    body += '      <input type="date" id="prodDateProduction" class="ac-form-input" value="' + (data.dateProduction || '') + '" onchange="calculerDateExpirationAuto()">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Durée conservation (j)</label>';
    body += '      <input type="number" id="prodDureeConservation" class="ac-form-input" min="0" step="1" value="' + acNum(data.dureeConservation) + '" oninput="calculerDateExpirationAuto()">';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Date expiration</label>';
    body += '      <input type="date" id="prodDateExpiration" class="ac-form-input" value="' + (data.dateExpiration || '') + '">';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-align-left"></i> Description & Recette</h4>';
    body += '  <div class="ac-form-grid cols-1">';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Description</label>';
    body += '      <textarea id="prodDesc" class="ac-form-textarea">' + escapeHtml(data.description || '') + '</textarea>';
    body += '    </div>';
    body += '    <div class="ac-form-group">';
    body += '      <label class="ac-form-label">Recette (ingrédients du stock)</label>';
    body += '      <div id="productIngredientsList" style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">';
    if (data.ingredients && data.ingredients.length > 0) { data.ingredients.forEach(function(ing, idx) { body += renderIngredientRow(idx, ing); }); }
    body += '      </div>';
    body += '      <button type="button" class="ac-btn ac-btn-ghost" onclick="addIngredientRow()" style="margin-top:10px;align-self:flex-start;"><i class="fas fa-plus"></i> Ajouter un ingrédient</button>';
    body += '    </div>';
    body += '  </div>';
    body += '</div>';

    openModernForm({
        title: editingId ? 'Modifier Produit' : 'Nouveau Produit',
        icon: 'fa-box',
        body: body,
        onSave: 'saveProduct()'
    });
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
        var sel = row.querySelector('.ingredient-select'); var qty = row.querySelector('.ingredient-qty');
        if (sel && sel.value && qty && acNum(qty.value) > 0) {
            var stockItem = allStockData.find(function(s) { return s.id === sel.value; });
            ingredients.push({ idStock: sel.value, nom: stockItem ? stockItem.nom : '', quantite: acNum(qty.value), unite: stockItem ? stockItem.unite : '' });
        }
    });
    var select = document.getElementById('prodCategoriesSelect');
    var selectedCategories = select ? Array.from(select.selectedOptions).map(function(o) { return o.value; }) : [];
    var fournisseurInput = document.getElementById('prodFournisseur');
    var fournisseurValue = fournisseurInput ? fournisseurInput.value.trim() : '';
    var fournisseurId = null;
    var fournisseurNom = fournisseurValue;
    var datalist = document.getElementById('fournisseurList');
    if (datalist && fournisseurValue) {
        for (var opt of datalist.options) {
            if (opt.value.toLowerCase() === fournisseurValue.toLowerCase()) { fournisseurId = opt.getAttribute('data-id'); break; }
        }
    }
    var prixAchat = acNum(document.getElementById('prodPA').value);
    var prixVente = acNum(document.getElementById('prodPV').value);
    var prixPromo = acNum(document.getElementById('prodPromo').value);
    var prix = (prixPromo > 0) ? prixPromo : prixVente;
    var profit = prix - prixAchat;

    var sf = function(img) {
        var d = {
            nom: n,
            brand: document.getElementById('prodBrand').value.trim(),
            box_price: acNum(document.getElementById('prodBoxPrice').value),
            box_unit: acNum(document.getElementById('prodBoxUnit').value) || 1,
            prixAchat: prixAchat, prixVente: prixVente, prixPromo: prixPromo, profit: profit,
            stock: acNum(document.getElementById('prodStock').value),
            vendues: 0, ca: 0,
            tempsPrep: document.getElementById('prodTemps').value,
            disponible: document.getElementById('prodDispo').value === '1',
            description: document.getElementById('prodDesc').value,
            categories: selectedCategories,
            categorie: selectedCategories.length > 0 ? selectedCategories[0] : '',
            dateProduction: (document.getElementById('prodDateProduction') || {}).value || '',
            dureeConservation: acNum((document.getElementById('prodDureeConservation') || {}).value),
            dateExpiration: (document.getElementById('prodDateExpiration') || {}).value || '',
            ingredients: ingredients,
            fournisseurId: fournisseurId,
            fournisseurNom: fournisseurNom
        };
        if (img) d.imageBase64 = img;
        if (editingId) {
            CacheDB.write('products', editingId, d, 'update').then(function() {
                var idx = window.allProductsData.findIndex(function(x) { return x.id === editingId; });
                if (idx !== -1) window.allProductsData[idx] = Object.assign({}, window.allProductsData[idx], d, { id: editingId });
                closeModernForm(); renderProductsTable(); CacheDB.sync();
                if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('products');
            });
        } else {
            CacheDB.write('products', null, d, 'add').then(function(newId) {
                d.id = newId; window.allProductsData.push(d);
                closeModernForm(); renderProductsTable(); CacheDB.sync();
                if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('products');
            });
        }
    };
    if (f) fileToBase64(f, sf); else sf(null);
}

// ====================================================
//  👥 CLIENTS
// ====================================================
function loadClientsPage(c) {
    injectAdminCrudsStyles();
    var html = '';
    html += '<div class="ac-page">';
    html += '  <div class="ac-header">';
    html += '    <h2><i class="fas fa-users"></i> Clients</h2>';
    html += '    <div class="ac-actions">';
    html += '      <div class="ac-search"><i class="fas fa-search"></i><input type="text" id="clientSearchInput" placeholder="Rechercher un client..." value="' + escapeHtml(window.clientSearchQuery || '') + '" oninput="window.clientSearchQuery=this.value.trim().toLowerCase();window.currentPages.clients=1;renderClientsTable();"></div>';
    html += '      <button class="ac-btn ac-btn-primary" onclick="openClientForm()"><i class="fas fa-plus"></i> Ajouter</button>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="ac-stats-grid" id="clientsStatsGrid"></div>';
    html += '  <div id="clientsGridContainer"></div>';
    html += '  <div id="clientsPagination" style="margin-top:12px;"></div>';
    html += '</div>';
    c.innerHTML = html;
    loadClients();
}
async function loadClients() {
    const cached = await CacheDB.getAll('clients');
    if (cached.length) { allClientsData = cached; renderClientsTable(); }
    try {
        const snapshot = await db.collection('clients').get();
        allClientsData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allClientsData.push(dd); });
        for (let doc of allClientsData) await CacheDB.set('clients', doc.id, doc);
        renderClientsTable();
    } catch (e) { console.error(e); }
}
function renderClientsTable() {
    var container = document.getElementById('clientsGridContainer');
    var statsGrid = document.getElementById('clientsStatsGrid');
    if (!container) return;
    var data = allClientsData.slice();
    if (window.clientSearchQuery) {
        var q = window.clientSearchQuery;
        data = data.filter(function(d) { return (d.nom || '').toLowerCase().indexOf(q) !== -1 || (d.prenom || '').toLowerCase().indexOf(q) !== -1 || (d.username || '').toLowerCase().indexOf(q) !== -1 || (d.email || '').toLowerCase().indexOf(q) !== -1 || (d.telephone || '').toLowerCase().indexOf(q) !== -1; });
    }
    data = applySort('clients', data, 'nom');
    var pageData = getPageData('clients', data);
    if (statsGrid) statsGrid.innerHTML = renderClientsStats(data);
    if (pageData.length === 0) {
        container.innerHTML = '<div class="ac-empty"><i class="fas fa-users-slash"></i><h3>Aucun client trouvé</h3><p>Cliquez sur "Ajouter" pour créer votre premier client.</p></div>';
        document.getElementById('clientsPagination').innerHTML = '';
        return;
    }
    var html = '<div class="ac-grid">';
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var fullName = ((d.nom || '') + ' ' + (d.prenom || '')).trim() || 'Client';
        var initiale = (fullName.charAt(0) || '?').toUpperCase();
        html += '<div class="ac-card">';
        html += '  <div class="ac-card-image"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:white;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;">' + initiale + '</div></div>';
        html += '  <div class="ac-card-body">';
        html += '    <h4 class="ac-card-title">' + escapeHtml(fullName) + '</h4>';
        html += '    <span class="ac-card-category">' + acNum(d.pointsFidelite) + ' pts fidélité</span>';
        html += '    <div class="ac-card-info"><i class="fas fa-phone"></i> ' + escapeHtml(d.telephone || '—') + '</div>';
        html += '    <div class="ac-card-info"><i class="fas fa-envelope"></i> ' + escapeHtml(d.email || '—') + '</div>';
        html += '    <div class="ac-card-price">';
        html += '      <div><div class="ac-price-main">' + acFormatMAD(d.ca) + '</div><div class="ac-price-sub">CA</div></div>';
        html += '      <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:var(--ac-green);">' + acFormatMAD(d.profit) + '</div><div class="ac-price-sub">Profit</div></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="ac-card-actions">';
        html += '    <button class="edit" onclick="editClient(\'' + d.id + '\')"><i class="fas fa-edit"></i> Modifier</button>';
        html += '    <button class="delete" onclick="deleteClient(\'' + d.id + '\')"><i class="fas fa-trash"></i></button>';
        html += '  </div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('clientsPagination').innerHTML = getPaginationHTML('clients', data.length);
}

function openClientForm(data) {
    data = data || {};
    var body = '';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-user"></i> Identité</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Nom <span class="req">*</span></label><input type="text" id="cliNom" class="ac-form-input" value="' + escapeHtml(data.nom || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Prénom <span class="req">*</span></label><input type="text" id="cliPrenom" class="ac-form-input" value="' + escapeHtml(data.prenom || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Username</label><input type="text" id="cliUsername" class="ac-form-input" value="' + escapeHtml(data.username || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Genre</label><select id="cliGenre" class="ac-form-select"><option value="">—</option><option value="M" ' + (data.genre === 'M' ? 'selected' : '') + '>M</option><option value="F" ' + (data.genre === 'F' ? 'selected' : '') + '>F</option></select></div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-address-book"></i> Contact</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group full"><label class="ac-form-label">Adresse</label><input type="text" id="cliAdresse" class="ac-form-input" value="' + escapeHtml(data.adresse || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Email</label><input type="email" id="cliEmail" class="ac-form-input" value="' + escapeHtml(data.email || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Téléphone</label><input type="text" id="cliTel" class="ac-form-input" value="' + escapeHtml(data.telephone || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">WhatsApp</label><input type="text" id="cliWhatsapp" class="ac-form-input" value="' + escapeHtml(data.whatsapp || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Facebook</label><input type="text" id="cliFacebook" class="ac-form-input" value="' + escapeHtml(data.facebook || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Instagram</label><input type="text" id="cliInstagram" class="ac-form-input" value="' + escapeHtml(data.instagram || '') + '"></div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-chart-line"></i> Statistiques</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group"><label class="ac-form-label">CA</label><input type="number" id="cliCA" class="ac-form-input" value="' + acNum(data.ca) + '" step="0.01"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Profit</label><input type="number" id="cliProfit" class="ac-form-input" value="' + acNum(data.profit) + '" step="0.01"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Points Fidélité</label><input type="number" id="cliPoints" class="ac-form-input" value="' + acNum(data.pointsFidelite) + '"></div>';
    body += '    <div class="ac-form-group full"><label class="ac-form-label">Description</label><textarea id="cliDesc" class="ac-form-textarea">' + escapeHtml(data.description || '') + '</textarea></div>';
    body += '    <div class="ac-form-group full"><label class="ac-form-label">Allergies (virgules)</label><input type="text" id="cliAllergies" class="ac-form-input" value="' + (data.allergies ? data.allergies.join(', ') : '') + '" placeholder="gluten, lactose"></div>';
    body += '    <div class="ac-form-group full"><label class="ac-form-label">Aime (virgules)</label><input type="text" id="cliAime" class="ac-form-input" value="' + (data.aime ? data.aime.join(', ') : '') + '" placeholder="café, thé"></div>';
    body += '  </div>';
    body += '</div>';

    currentCollection = 'clients';
    openModernForm({
        title: editingId ? 'Modifier Client' : 'Nouveau Client',
        icon: 'fa-users',
        body: body,
        onSave: 'saveClient()'
    });
}
function saveClient() {
    var n = document.getElementById('cliNom').value, p = document.getElementById('cliPrenom').value;
    if (!n || !p) { alert('Nom et Prénom obligatoires'); return; }
    var d = {
        nom: n, prenom: p,
        username: document.getElementById('cliUsername').value,
        genre: document.getElementById('cliGenre').value,
        adresse: document.getElementById('cliAdresse').value,
        email: document.getElementById('cliEmail').value,
        telephone: document.getElementById('cliTel').value,
        whatsapp: document.getElementById('cliWhatsapp').value,
        facebook: document.getElementById('cliFacebook').value,
        instagram: document.getElementById('cliInstagram').value,
        ca: acNum(document.getElementById('cliCA').value),
        profit: acNum(document.getElementById('cliProfit').value),
        pointsFidelite: acNum(document.getElementById('cliPoints').value),
        allergies: document.getElementById('cliAllergies').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        aime: document.getElementById('cliAime').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        description: document.getElementById('cliDesc').value
    };
    if (!editingId) d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    saveDocument('clients', d, function() {
        closeModernForm(); loadClients();
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('clients');
    });
}
function editClient(id) { db.collection('clients').doc(id).get().then(function(doc) { if (doc.exists) { editingId = id; currentCollection = 'clients'; openClientForm(doc.data()); } }); }
function deleteClient(id) { if (confirm('Supprimer ce client ?')) { CacheDB.write('clients', id, null, 'delete').then(function() { alert('Supprimé'); loadClients(); CacheDB.sync(); }); } }

// ====================================================
//  🚚 FOURNISSEURS
// ====================================================
function loadFournisseursPage(c) {
    injectAdminCrudsStyles();
    var html = '';
    html += '<div class="ac-page">';
    html += '  <div class="ac-header">';
    html += '    <h2><i class="fas fa-truck"></i> Fournisseurs</h2>';
    html += '    <div class="ac-actions">';
    html += '      <div class="ac-search"><i class="fas fa-search"></i><input type="text" id="fourSearchInput" placeholder="Rechercher un fournisseur..." value="' + escapeHtml(window.fournisseurSearchQuery || '') + '" oninput="window.fournisseurSearchQuery=this.value.trim().toLowerCase();window.currentPages.fournisseurs=1;renderFournisseursTable();"></div>';
    html += '      <button class="ac-btn ac-btn-primary" onclick="openFournisseurForm()"><i class="fas fa-plus"></i> Ajouter</button>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="ac-stats-grid" id="fournisseursStatsGrid"></div>';
    html += '  <div id="fournisseursGridContainer"></div>';
    html += '  <div id="fournisseursPagination" style="margin-top:12px;"></div>';
    html += '</div>';
    c.innerHTML = html;
    loadFournisseurs();
}
async function loadFournisseurs() {
    const cached = await CacheDB.getAll('fournisseurs');
    if (cached.length) { allFournisseursData = cached; renderFournisseursTable(); }
    try {
        const snapshot = await db.collection('fournisseurs').get();
        allFournisseursData = [];
        snapshot.forEach(d => { let dd = d.data(); dd.id = d.id; allFournisseursData.push(dd); });
        for (let doc of allFournisseursData) await CacheDB.set('fournisseurs', doc.id, doc);
        renderFournisseursTable();
    } catch (e) { console.error(e); }
}
function renderFournisseursTable() {
    var container = document.getElementById('fournisseursGridContainer');
    var statsGrid = document.getElementById('fournisseursStatsGrid');
    if (!container) return;
    var data = applySort('fournisseurs', allFournisseursData.slice(), 'nom');
    if (window.fournisseurSearchQuery) {
        var q = window.fournisseurSearchQuery;
        data = data.filter(function(d) { return (d.nom || '').toLowerCase().indexOf(q) !== -1 || (d.prenom || '').toLowerCase().indexOf(q) !== -1 || (d.societe || '').toLowerCase().indexOf(q) !== -1 || (d.telephone || '').toLowerCase().indexOf(q) !== -1 || (d.email || '').toLowerCase().indexOf(q) !== -1; });
    }
    var pageData = getPageData('fournisseurs', data);
    if (statsGrid) statsGrid.innerHTML = renderFournisseursStats(data);
    if (pageData.length === 0) {
        container.innerHTML = '<div class="ac-empty"><i class="fas fa-truck-loading"></i><h3>Aucun fournisseur trouvé</h3><p>Cliquez sur "Ajouter" pour créer votre premier fournisseur.</p></div>';
        document.getElementById('fournisseursPagination').innerHTML = '';
        return;
    }
    var html = '<div class="ac-grid">';
    for (var i = 0; i < pageData.length; i++) {
        var d = pageData[i];
        var fullName = ((d.nom || '') + ' ' + (d.prenom || '')).trim() || 'Fournisseur';
        var initiale = (fullName.charAt(0) || '?').toUpperCase();
        var cats = (d.categories && d.categories.length > 0) ? d.categories.join(', ') : '—';
        html += '<div class="ac-card">';
        html += '  <div class="ac-card-image"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10B981,#059669);color:white;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;">' + initiale + '</div></div>';
        html += '  <div class="ac-card-body">';
        html += '    <h4 class="ac-card-title">' + escapeHtml(fullName) + '</h4>';
        html += '    <span class="ac-card-category">' + escapeHtml(d.societe || 'Fournisseur') + '</span>';
        html += '    <div class="ac-card-info"><i class="fas fa-phone"></i> ' + escapeHtml(d.telephone || '—') + '</div>';
        html += '    <div class="ac-card-info"><i class="fas fa-envelope"></i> ' + escapeHtml(d.email || '—') + '</div>';
        html += '    <div class="ac-card-info"><i class="fas fa-tags"></i> ' + escapeHtml(cats) + '</div>';
        html += '    <div class="ac-card-price"><div><div class="ac-price-main">' + acFormatMAD(d.ca) + '</div><div class="ac-price-sub">CA</div></div></div>';
        html += '  </div>';
        html += '  <div class="ac-card-actions">';
        html += '    <button class="edit" onclick="editFournisseur(\'' + d.id + '\')"><i class="fas fa-edit"></i> Modifier</button>';
        html += '    <button class="delete" onclick="deleteFournisseur(\'' + d.id + '\')"><i class="fas fa-trash"></i></button>';
        html += '  </div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('fournisseursPagination').innerHTML = getPaginationHTML('fournisseurs', data.length);
}
function openFournisseurForm(data) {
    data = data || {};
    var selectedCategories = data.categories || [];
    var idxProduit = data.prixIndexProduit != null ? data.prixIndexProduit : 0;
    var idxQte = data.prixIndexQte != null ? data.prixIndexQte : 1;
    var idxPrix = data.prixIndexPrix != null ? data.prixIndexPrix : 2;

    var body = '';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-info-circle"></i> Identité</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Nom <span class="req">*</span></label><input type="text" id="fourNom" class="ac-form-input" value="' + escapeHtml(data.nom || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Prénom</label><input type="text" id="fourPrenom" class="ac-form-input" value="' + escapeHtml(data.prenom || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Société</label><input type="text" id="fourSociete" class="ac-form-input" value="' + escapeHtml(data.societe || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">CA</label><input type="number" id="fourCA" class="ac-form-input" value="' + acNum(data.ca) + '" step="0.01"></div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-address-book"></i> Contact</h4>';
    body += '  <div class="ac-form-grid">';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Téléphone</label><input type="text" id="fourTel" class="ac-form-input" value="' + escapeHtml(data.telephone || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">WhatsApp</label><input type="text" id="fourWhatsapp" class="ac-form-input" value="' + escapeHtml(data.whatsapp || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Email</label><input type="email" id="fourEmail" class="ac-form-input" value="' + escapeHtml(data.email || '') + '"></div>';
    body += '    <div class="ac-form-group"><label class="ac-form-label">Adresse</label><input type="text" id="fourAdresse" class="ac-form-input" value="' + escapeHtml(data.adresse || '') + '"></div>';
    body += '    <div class="ac-form-group full"><label class="ac-form-label">Description</label><textarea id="fourDesc" class="ac-form-textarea">' + escapeHtml(data.description || '') + '</textarea></div>';
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-tags"></i> Catégories</h4>';
    body += '  <div class="ac-cat-check-grid">';
    if (typeof fournisseurCategoriesList !== 'undefined') {
        fournisseurCategoriesList.forEach(function(cat) {
            var checked = selectedCategories.indexOf(cat) !== -1 ? 'checked' : '';
            body += '<label class="ac-cat-check ' + (checked ? 'checked' : '') + '"><input type="checkbox" class="four-cat-check" value="' + cat + '" ' + checked + '> ' + cat + '</label>';
        });
    }
    body += '  </div>';
    body += '</div>';
    body += '<div class="ac-form-section">';
    body += '  <h4 class="ac-form-section-title"><i class="fas fa-table-columns"></i> Index de prix sur facture</h4>';
    body += '  <div class="ac-index-config">';
    body += '    <label>Col. Produit</label><select id="fourPrixIndexProduit"><option value="0" ' + (idxProduit === 0 ? 'selected' : '') + '>0</option><option value="1" ' + (idxProduit === 1 ? 'selected' : '') + '>1</option><option value="2" ' + (idxProduit === 2 ? 'selected' : '') + '>2</option><option value="3" ' + (idxProduit === 3 ? 'selected' : '') + '>3</option></select>';
    body += '    <label>Col. Qté</label><select id="fourPrixIndexQte"><option value="0" ' + (idxQte === 0 ? 'selected' : '') + '>0</option><option value="1" ' + (idxQte === 1 ? 'selected' : '') + '>1</option><option value="2" ' + (idxQte === 2 ? 'selected' : '') + '>2</option><option value="3" ' + (idxQte === 3 ? 'selected' : '') + '>3</option></select>';
    body += '    <label>Col. Prix</label><select id="fourPrixIndexPrix"><option value="0" ' + (idxPrix === 0 ? 'selected' : '') + '>0</option><option value="1" ' + (idxPrix === 1 ? 'selected' : '') + '>1</option><option value="2" ' + (idxPrix === 2 ? 'selected' : '') + '>2</option><option value="3" ' + (idxPrix === 3 ? 'selected' : '') + '>3</option><option value="4" ' + (idxPrix === 4 ? 'selected' : '') + '>4</option></select>';
    body += '  </div>';
    body += '  <p class="ac-form-hint">📌 Indiquez la position des colonnes sur la facture fournisseur (0 = première colonne).</p>';
    body += '</div>';

    currentCollection = 'fournisseurs';
    openModernForm({
        title: editingId ? 'Modifier Fournisseur' : 'Nouveau Fournisseur',
        icon: 'fa-truck',
        body: body,
        onSave: 'saveFournisseur()'
    });
    setTimeout(function() {
        document.querySelectorAll('.ac-cat-check input').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var lbl = this.closest('.ac-cat-check');
                if (lbl) lbl.classList.toggle('checked', this.checked);
            });
        });
    }, 30);
}
function saveFournisseur() {
    var nom = document.getElementById('fourNom').value; if (!nom) { alert('Nom obligatoire'); return; }
    var categories = []; document.querySelectorAll('.four-cat-check:checked').forEach(function(cb) { categories.push(cb.value); });
    var d = {
        nom: nom,
        prenom: document.getElementById('fourPrenom').value,
        societe: document.getElementById('fourSociete').value,
        telephone: document.getElementById('fourTel').value,
        whatsapp: document.getElementById('fourWhatsapp').value,
        email: document.getElementById('fourEmail').value,
        adresse: document.getElementById('fourAdresse').value,
        ca: acNum(document.getElementById('fourCA').value),
        description: document.getElementById('fourDesc').value,
        categories: categories,
        prixIndexProduit: parseInt(document.getElementById('fourPrixIndexProduit').value) || 0,
        prixIndexQte: parseInt(document.getElementById('fourPrixIndexQte').value) || 1,
        prixIndexPrix: parseInt(document.getElementById('fourPrixIndexPrix').value) || 2
    };
    if (!editingId) d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    saveDocument('fournisseurs', d, function() {
        closeModernForm(); loadFournisseurs();
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('fournisseurs');
    });
}
function editFournisseur(id) { db.collection('fournisseurs').doc(id).get().then(function(doc) { if (doc.exists) { editingId = id; currentCollection = 'fournisseurs'; openFournisseurForm(doc.data()); } }); }
function deleteFournisseur(id) { if (confirm('Supprimer ce fournisseur ?')) { CacheDB.write('fournisseurs', id, null, 'delete').then(function() { alert('Supprimé'); loadFournisseurs(); CacheDB.sync(); }); } }

// ====================================================
//  💰 ACHATS + SCAN + WHATSAPP
// ====================================================
var fournisseurAchatSelectionne = null;
var produitsAchatList = [];
var achatLignes = [];
var achatSearchFilter = '';

function openAchatModal() {
    if (typeof allFournisseursData === 'undefined' || allFournisseursData.length === 0) {
        loadFournisseurs().then(function() { openAchatModalForm(); });
    } else openAchatModalForm();
}

function openAchatModalForm() {
    achatSearchFilter = '';
    // ✅ Reset tri à l'ouverture
    achatSortCol = 'nom';
    achatSortDir = 'asc';

    var options = '<option value="">— Choisir un fournisseur —</option>';
    allFournisseursData.forEach(function(f) {
        var label = (f.nom || '') + (f.prenom ? ' ' + f.prenom : '') + (f.societe ? ' (' + f.societe + ')' : '');
        options += '<option value="' + f.id + '">' + escapeHtml(label) + '</option>';
    });
    var html = '';
    html += '<div id="achatModalOverlay" class="ac-modal-overlay">';
    html += '  <div class="ac-modal">';
    html += '    <div class="ac-modal-header"><h3><i class="fas fa-shopping-cart"></i> Effectuer des achats</h3><button class="ac-modal-close" onclick="fermerAchatModal()"><i class="fas fa-times"></i></button></div>';
    html += '    <div class="ac-modal-toolbar">';
    html += '      <select id="achatFournisseurSelect" onchange="chargerProduitsFournisseurAchat()">' + options + '</select>';
    html += '      <div class="ac-search" style="min-width:240px;flex:1;"><i class="fas fa-search"></i><input type="text" id="achatSearchInput" placeholder="Rechercher un produit..." oninput="onAchatSearch(this.value)"></div>';
    html += '      <button class="ac-btn ac-btn-scan" onclick="ouvrirCameraFacture()" id="scanFactureBtn" disabled><i class="fas fa-camera"></i> Scanner</button>';
    html += '      <button class="ac-btn ac-btn-whatsapp" onclick="commanderWhatsAppFournisseur()" id="commanderBtn" disabled><i class="fab fa-whatsapp"></i> Commander</button>';
    html += '    </div>';
    html += '    <div class="ac-modal-body" id="achatModalBody"><div class="ac-empty"><i class="fas fa-truck"></i><h3>Sélectionnez un fournisseur</h3><p>Choisissez un fournisseur dans la liste ci-dessus pour voir ses produits.</p></div></div>';
    html += '    <div class="ac-modal-footer">';
    html += '      <div class="ac-modal-totals">';
    html += '        <div class="ac-total-block"><span class="label">Produits</span><span class="value blue" id="achatTotalProduits">0</span></div>';
    html += '        <div class="ac-total-block"><span class="label">Quantité totale</span><span class="value" id="achatTotalQte">0</span></div>';
    html += '        <div class="ac-total-block"><span class="label">Total général</span><span class="value green" id="achatTotalGeneral">0.00 MAD</span></div>';
    html += '      </div>';
    html += '      <div class="ac-modal-actions">';
    html += '        <button class="ac-btn ac-btn-ghost" onclick="fermerAchatModal()">Annuler</button>';
    html += '        <button class="ac-btn ac-btn-achat" id="achatValiderBtn" onclick="validerAchats()" disabled><i class="fas fa-check"></i> Valider les achats</button>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    var old = document.getElementById('achatModalOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function fermerAchatModal() { var o = document.getElementById('achatModalOverlay'); if (o) o.remove(); achatSearchFilter = ''; }

function chargerProduitsFournisseurAchat() {
    var select = document.getElementById('achatFournisseurSelect'); if (!select) return;
    var fid = select.value;
    var scanBtn = document.getElementById('scanFactureBtn');
    var commanderBtn = document.getElementById('commanderBtn');
    if (scanBtn) scanBtn.disabled = !fid;
    if (commanderBtn) commanderBtn.disabled = !fid;
    var body = document.getElementById('achatModalBody');
    if (!fid) {
        if (body) body.innerHTML = '<div class="ac-empty"><i class="fas fa-truck"></i><h3>Sélectionnez un fournisseur</h3><p>Choisissez un fournisseur dans la liste.</p></div>';
        fournisseurAchatSelectionne = null; produitsAchatList = []; achatLignes = []; updateAchatTotals(); return;
    }
    fournisseurAchatSelectionne = allFournisseursData.find(function(f) { return f.id === fid; });
    if (!fournisseurAchatSelectionne) return;
    var produits = window.allProductsData.filter(function(p) {
        return p.fournisseurId === fid || p.fournisseurNom === fournisseurAchatSelectionne.nom;
    });
    produitsAchatList = produits;
    achatLignes = produits.map(function(p) {
        return { id: p.id, nom: p.nom, stockActuel: acNum(p.stock), prixActuel: acNum(p.box_price), quantite: 0, nouveauPrix: acNum(p.box_price), dateExpiration: p.dateExpiration || '', total: 0, prixChange: false };
    });
    afficherProduitsAchat();
}

function onAchatSearch(value) { achatSearchFilter = (value || '').toLowerCase().trim(); afficherProduitsAchat(); }

// 🆕 Tri par clic sur l'en-tête
function achatToggleSort(col) {
    if (achatSortCol === col) {
        achatSortDir = achatSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        achatSortCol = col;
        achatSortDir = 'asc';
    }
    afficherProduitsAchat();
}
window.achatToggleSort = achatToggleSort;

function achatSortIndicator(col) {
    if (achatSortCol !== col) return '<i class="fas fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px;"></i>';
    return achatSortDir === 'asc' ? '<i class="fas fa-sort-up" style="margin-left:4px;color:#2563EB;"></i>' : '<i class="fas fa-sort-down" style="margin-left:4px;color:#2563EB;"></i>';
}
window.achatSortIndicator = achatSortIndicator;

function afficherProduitsAchat() {
    var body = document.getElementById('achatModalBody'); if (!body) return;
    if (!produitsAchatList || produitsAchatList.length === 0) {
        body.innerHTML = '<div class="ac-empty"><i class="fas fa-box-open"></i><h3>Aucun produit pour ce fournisseur</h3><p>Ajoutez des produits avec ce fournisseur d\'abord.</p></div>';
        updateAchatTotals(); return;
    }
    var lignes = achatLignes.map(function(l, realIdx) { return { ligne: l, realIdx: realIdx }; });
    if (achatSearchFilter) lignes = lignes.filter(function(o) { return (o.ligne.nom || '').toLowerCase().indexOf(achatSearchFilter) !== -1; });
    if (lignes.length === 0) { body.innerHTML = '<div class="ac-empty"><i class="fas fa-search"></i><h3>Aucun produit trouvé</h3><p>Essayez un autre mot-clé.</p></div>'; updateAchatTotals(); return; }

    // ✅ Tri
    lignes.sort(function(a, b) {
        var va, vb;
        var col = achatSortCol;
        var lA = a.ligne, lB = b.ligne;
        if (col === 'nom') { va = (lA.nom || '').toLowerCase(); vb = (lB.nom || '').toLowerCase(); }
        else if (col === 'id') { va = (lA.id || '').toLowerCase(); vb = (lB.id || '').toLowerCase(); }
        else if (col === 'stock') { va = acNum(lA.stockActuel); vb = acNum(lB.stockActuel); }
        else if (col === 'prixActuel') { va = acNum(lA.prixActuel); vb = acNum(lB.prixActuel); }
        else if (col === 'quantite') { va = acNum(lA.quantite); vb = acNum(lB.quantite); }
        else if (col === 'nouveauPrix') { va = acNum(lA.nouveauPrix); vb = acNum(lB.nouveauPrix); }
        else if (col === 'dateExpiration') { va = lA.dateExpiration || ''; vb = lB.dateExpiration || ''; }
        else if (col === 'total') { va = acNum(lA.total); vb = acNum(lB.total); }
        else { va = (lA.nom || '').toLowerCase(); vb = (lB.nom || '').toLowerCase(); }
        if (typeof va === 'string') {
            var cmp = va.localeCompare(vb);
            return achatSortDir === 'asc' ? cmp : -cmp;
        } else {
            return achatSortDir === 'asc' ? (va - vb) : (vb - va);
        }
    });

    var thStyle = 'cursor:pointer;user-select:none;';
    var html = '<table class="ac-modal-table"><thead><tr>';
    html += '<th style="' + thStyle + '" onclick="achatToggleSort(\'id\')">ID' + achatSortIndicator('id') + '</th>';
    html += '<th style="' + thStyle + '" onclick="achatToggleSort(\'nom\')">Produit' + achatSortIndicator('nom') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'stock\')">Stock' + achatSortIndicator('stock') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'prixActuel\')">Prix actuel' + achatSortIndicator('prixActuel') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'quantite\')">Qté' + achatSortIndicator('quantite') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'nouveauPrix\')">Nouveau prix' + achatSortIndicator('nouveauPrix') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'dateExpiration\')">Expiration' + achatSortIndicator('dateExpiration') + '</th>';
    html += '<th class="center" style="' + thStyle + '" onclick="achatToggleSort(\'total\')">Total' + achatSortIndicator('total') + '</th>';
    html += '</tr></thead><tbody>';
    for (var k = 0; k < lignes.length; k++) {
        var o = lignes[k]; var l = o.ligne; var i = o.realIdx;
        var priceChanged = l.nouveauPrix > 0 && Math.abs(l.nouveauPrix - l.prixActuel) > 0.001;
        var rowClass = l.prixChange ? 'has-changement' : '';
        var prixClass = priceChanged ? 'changed' : '';
        var badgeHtml = '';
        if (l.prixChange && l.nouveauPrix > 0) {
            var diff = l.nouveauPrix - l.prixActuel;
            var direction = diff > 0 ? 'up' : 'down';
            var signe = diff > 0 ? '+' : '';
            badgeHtml = '<span class="ac-price-change-badge ' + direction + '"><i class="fas fa-arrow-' + direction + '"></i> ' + signe + diff.toFixed(2) + ' MAD</span>';
        }
        html += '<tr class="' + rowClass + '">';
        html += '<td><span style="font-size:11px;color:#94A3B8;font-family:monospace;">' + (l.id || '').substring(0, 6) + '</span></td>';
        html += '<td><div class="ac-product-name">' + escapeHtml(l.nom) + '</div>' + badgeHtml + '</td>';
        html += '<td class="center">' + l.stockActuel + '</td>';
        html += '<td class="center"><span class="ac-price-old">' + l.prixActuel.toFixed(2) + ' MAD</span></td>';
        html += '<td class="center"><input type="number" min="0" step="1" value="' + (l.quantite || 0) + '" oninput="onLigneQteChange(' + i + ', this.value)" style="width:80px;"></td>';
        html += '<td class="center"><input type="number" min="0" step="0.01" class="' + prixClass + '" value="' + (l.nouveauPrix || 0) + '" oninput="onLignePrixChange(' + i + ', this.value)" style="width:100px;"></td>';
        html += '<td class="center"><input type="date" value="' + (l.dateExpiration || '') + '" onchange="onLigneDateChange(' + i + ', this.value)" style="width:140px;"></td>';
        html += '<td class="ac-total-cell" id="achatTotal_' + i + '">' + (l.total || 0).toFixed(2) + '</td>';
        html += '</tr>';
    }
    html += '</tbody></table>';
    body.innerHTML = html;
    updateAchatTotals();
}

function onLigneQteChange(index, value) {
    var l = achatLignes[index]; if (!l) return;
    l.quantite = acNum(value); l.total = l.quantite * (l.nouveauPrix || 0);
    var cell = document.getElementById('achatTotal_' + index); if (cell) cell.textContent = l.total.toFixed(2);
    updateAchatTotals();
}
function onLignePrixChange(index, value) {
    var l = achatLignes[index]; if (!l) return;
    var nouveau = acNum(value);
    l.nouveauPrix = nouveau; l.prixChange = Math.abs(nouveau - l.prixActuel) > 0.001;
    l.total = (l.quantite || 0) * nouveau;
    afficherProduitsAchat();
}
function onLigneDateChange(index, value) { var l = achatLignes[index]; if (!l) return; l.dateExpiration = value || ''; }
function updateAchatTotals() {
    var produits = 0, qteTotale = 0, totalGeneral = 0;
    achatLignes.forEach(function(l) { if (l.quantite > 0) { produits++; qteTotale += l.quantite; totalGeneral += l.total || 0; } });
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
    var prixChanges = misesAJour.filter(function(l) { return l.nouveauPrix > 0 && Math.abs(l.nouveauPrix - l.prixActuel) > 0.001; });
    var message = 'Confirmer l\'achat ?\n\n📦 ' + misesAJour.length + ' produit(s)\n💰 Total : ' + misesAJour.reduce(function(s, l) { return s + (l.quantite * l.nouveauPrix); }, 0).toFixed(2) + ' MAD\n\n';
    if (prixChanges.length > 0) {
        message += '⚠️ ATTENTION — PRIX CHANGÉS :\n\n';
        prixChanges.forEach(function(l) {
            var diff = l.nouveauPrix - l.prixActuel;
            message += '• ' + l.nom + '\n  ' + l.prixActuel.toFixed(2) + ' → ' + l.nouveauPrix.toFixed(2) + ' MAD (' + (diff > 0 ? '+' : '') + diff.toFixed(2) + ')\n';
        });
        message += '\n❓ Confirmer ces changements de prix ?';
    }
    if (!confirm(message)) return;
    var batch = db.batch();
    var aujourdhui = new Date(); var todayStr = aujourdhui.toISOString().split('T')[0];
    try {
        for (var item of misesAJour) {
            var prodRef = db.collection('products').doc(item.id);
            var produit = window.allProductsData.find(function(p) { return p.id === item.id; });
            var boxUnit = produit ? (acNum(produit.box_unit) || 1) : 1;
            var stockToAdd = item.quantite * boxUnit;
            var updateData = { stock: firebase.firestore.FieldValue.increment(stockToAdd) };
            if (item.nouveauPrix > 0) {
                updateData.box_price = item.nouveauPrix;
                var pu = item.nouveauPrix / boxUnit;
                updateData.prixAchat = pu; updateData.prixVente = pu * 1.3; updateData.profit = updateData.prixVente - pu;
                updateData.lastPrixUpdate = todayStr;
            }
            updateData.dateProduction = todayStr;
            if (produit && acNum(produit.dureeConservation) > 0) {
                var ne = new Date(aujourdhui.getTime() + acNum(produit.dureeConservation) * 86400000);
                updateData.dateExpiration = ne.toISOString().split('T')[0];
            } else if (item.dateExpiration) updateData.dateExpiration = item.dateExpiration;
            batch.update(prodRef, updateData);
        }
        await batch.commit();
        alert('✅ Stock et prix mis à jour !');
        fermerAchatModal();
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof CacheDB !== 'undefined' && CacheDB.saveCollection) CacheDB.saveCollection('products');
    } catch(e) { console.error(e); alert('❌ Erreur : ' + e.message); }
}

// 🆕 COMMANDER via WhatsApp
function commanderWhatsAppFournisseur() {
    if (!fournisseurAchatSelectionne) {
        alert('Choisissez un fournisseur d\'abord.');
        return;
    }
    var lignesACommander = achatLignes.filter(function(l) { return acNum(l.quantite) > 0; });
    if (lignesACommander.length === 0) {
        alert('⚠️ Aucune quantité saisie.\n\nRemplissez la colonne "Qté" pour les produits à commander, puis cliquez sur "Commander".');
        return;
    }
    var tel = (fournisseurAchatSelectionne.whatsapp || fournisseurAchatSelectionne.telephone || '').replace(/[^\d+]/g, '').trim();
    if (!tel) {
        alert('❌ Aucun numéro WhatsApp/Téléphone enregistré pour ce fournisseur.\n\nModifiez le fournisseur pour ajouter un numéro.');
        return;
    }
    if (tel.startsWith('0')) tel = '212' + tel.substring(1);
    if (!tel.startsWith('+')) tel = '+' + tel;

    var fourNom = ((fournisseurAchatSelectionne.nom || '') + ' ' + (fournisseurAchatSelectionne.prenom || '')).trim() || 'Fournisseur';
    var societe = fournisseurAchatSelectionne.societe || '';
    var dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    var msg = '🛒 *COMMANDE DE FOURNITURE*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '📅 Date : ' + dateStr + '\n';
    msg += '👤 Fournisseur : ' + fourNom + '\n';
    if (societe) msg += '🏢 Société : ' + societe + '\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '📦 *Produits commandés :*\n\n';

    var totalQte = 0;
    lignesACommander.forEach(function(l, idx) {
        var q = acNum(l.quantite);
        totalQte += q;
        msg += (idx + 1) + '. *' + l.nom + '*\n';
        msg += '   Quantité : *' + q + '*\n\n';
    });

    msg += '━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '📊 *Total : ' + lignesACommander.length + ' produit(s)* — *' + totalQte + ' unité(s)*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '🙏 Merci de nous confirmer la disponibilité et le délai de livraison.\n';
    msg += '📞 Cordialement,\n';
    msg += 'Mixmax Minimarket';

    var url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
    console.log('📱 [WhatsApp Commander] Envoi à :', tel, '—', lignesACommander.length, 'produit(s)');
}
window.commanderWhatsAppFournisseur = commanderWhatsAppFournisseur;

function ouvrirCameraFacture() {
    if (!fournisseurAchatSelectionne) { alert('Choisissez un fournisseur d\'abord.'); return; }
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = function(e) {
        var file = e.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(event) { scannerFacture(event.target.result); };
        reader.readAsDataURL(file);
    };
    input.click();
}
async function scannerFacture(imgData) {
    var overlay = document.createElement('div');
    overlay.className = 'ac-scan-overlay';
    overlay.innerHTML = '<div class="spinner"></div><p>📷 Analyse de la facture...</p>';
    document.body.appendChild(overlay);
    try {
        var productNames = produitsAchatList.map(function(p) { return p.nom; });
        var productListStr = productNames.map(function(n) { return '"' + n.replace(/"/g, '\\"') + '"'; }).join(', ');
        var idxProduit = (fournisseurAchatSelectionne && fournisseurAchatSelectionne.prixIndexProduit != null) ? fournisseurAchatSelectionne.prixIndexProduit : 0;
        var idxQte = (fournisseurAchatSelectionne && fournisseurAchatSelectionne.prixIndexQte != null) ? fournisseurAchatSelectionne.prixIndexQte : 1;
        var idxPrix = (fournisseurAchatSelectionne && fournisseurAchatSelectionne.prixIndexPrix != null) ? fournisseurAchatSelectionne.prixIndexPrix : 2;
        var prompt = 'Voici une photo d\'une facture fournisseur. La liste des produits : [' + productListStr + ']. ' +
            'Index colonnes (0=1ère) : PRODUIT=' + idxProduit + ', QUANTITÉ=' + idxQte + ', PRIX=' + idxPrix + '. ' +
            'Retourne UNIQUEMENT un tableau JSON: [{"nom":"...","quantite":N,"prix":N}] ou [].';
        var response = await fetch(GEMINI_WORKER_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, imageBase64: imgData })
        });
        var data = await response.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        var rawText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text || '';
        var cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        var produitsReconnus = [];
        try { produitsReconnus = JSON.parse(cleaned); if (!Array.isArray(produitsReconnus)) throw new Error('Pas un tableau'); }
        catch(e) {
            var regex = /["']nom["']\s*:\s*["']([^"']+)["']\s*,\s*["']quantite["']\s*:\s*(\d+)(?:\s*,\s*["']prix["']\s*:\s*([\d.]+))?/gi;
            var m; while ((m = regex.exec(cleaned)) !== null) produitsReconnus.push({ nom: m[1].trim(), quantite: parseInt(m[2]), prix: m[3] ? parseFloat(m[3]) : null });
        }
        overlay.remove();
        if (produitsReconnus.length === 0) { alert('Aucun produit reconnu.'); return; }
        var prixChangés = [];
        produitsReconnus.forEach(function(p) {
            var ligne = achatLignes.find(function(l) { var a = (l.nom || '').toLowerCase(); var b = (p.nom || '').toLowerCase(); return a.includes(b) || b.includes(a); });
            if (!ligne) return;
            ligne.quantite = acNum(p.quantite); ligne.total = ligne.quantite * (ligne.nouveauPrix || 0);
            if (p.prix && p.prix > 0) {
                var ancien = ligne.prixActuel || 0;
                ligne.nouveauPrix = p.prix; ligne.total = ligne.quantite * p.prix;
                if (Math.abs(p.prix - ancien) > 0.001 && ancien > 0) { ligne.prixChange = true; prixChangés.push({ nom: ligne.nom, ancien: ancien, nouveau: p.prix }); }
            }
        });
        afficherProduitsAchat();
        if (prixChangés.length > 0) {
            var msg = '⚠️ PRIX CHANGÉS DÉTECTÉS :\n\n';
            prixChangés.forEach(function(pc) { msg += '• ' + pc.nom + '\n  ' + pc.ancien.toFixed(2) + ' → ' + pc.nouveau.toFixed(2) + ' MAD\n'; });
            msg += '\nVérifiez les lignes jaunes avant de valider.';
            alert(msg);
        } else { alert('✅ ' + produitsReconnus.length + ' produit(s) reconnu(s). Aucun changement de prix.'); }
    } catch(e) { if (overlay.parentNode) overlay.remove(); console.error(e); alert('❌ Erreur scan : ' + e.message); }
}

window.openAchatModal = openAchatModal;
window.fermerAchatModal = fermerAchatModal;
window.chargerProduitsFournisseurAchat = chargerProduitsFournisseurAchat;
window.validerAchats = validerAchats;
window.onLigneQteChange = onLigneQteChange;
window.onLignePrixChange = onLignePrixChange;
window.onLigneDateChange = onLigneDateChange;
window.onAchatSearch = onAchatSearch;
window.ouvrirCameraFacture = ouvrirCameraFacture;
window.scannerFacture = scannerFacture;

window.renderCategoriesTable = renderCategoriesTable;
window.renderProductsTable = renderProductsTable;
window.renderClientsTable = renderClientsTable;
window.renderFournisseursTable = renderFournisseursTable;
window.openCategoryForm = openCategoryForm;
window.openProductForm = openProductForm;
window.openClientForm = openClientForm;
window.openFournisseurForm = openFournisseurForm;

console.log('🚀 E-SOLUTION - Admin CRUD PRO v4');
console.log('✅ 🎨 Formulaires modernes (modal bleu/blanc)');
console.log('✅ 🐛 Fix stock: conversion safe → plus de [object Object]');
console.log('✅ 📱 Responsive renforcé');
console.log('✅ 📊 Stats analyste sur chaque page');
console.log('✅ 📷 Index prix + comparaison + confirmation');
console.log('✅ 🔃 Tri des colonnes dans le tableau d\'achat (asc/desc)');
console.log('✅ 📱 Bouton "Commander" → WhatsApp fournisseur');
