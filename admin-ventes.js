// ==================== ADMIN-VENTES.JS - MIXMAX MINIMARKET PRO ====================
// Version : Design Pro avec en-tête Facture, Date, Heure, Client
// Police : Inter (moderne)

// ========== VARIABLES GLOBALES ==========
window.commandesSearch = window.commandesSearch || '';
window.commandesPeriod = window.commandesPeriod || 'all';
window.ventesSearch = window.ventesSearch || '';
window.ventesPeriod = window.ventesPeriod || 'all';
window.allVentesData = window.allVentesData || [];
window.allCommandesData = window.allCommandesData || [];
window.filteredVentes = window.filteredVentes || null;
window.filteredCommandes = window.filteredCommandes || null;
window.venteSelectionMode = window.venteSelectionMode || false;
window.venteSelectedIndex = window.venteSelectedIndex || -1;

// ========== FONCTIONS UTILITAIRES PRO ==========

// Format date + heure en français
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

// Génère l'en-tête de cellule PRO pour Ventes
function renderVenteCellHeader(vente) {
    const dt = vente.createdAt ? formatDateHeure(vente.createdAt.seconds) : { date: '-', time: '-', full: '-' };
    const factureNum = vente.factureNum || vente.id?.substring(0, 8) || '---';
    const clientName = vente.clientName || vente.table || 'Client inconnu';
    
    return `
        <div class="vente-cell-header">
            <div class="facture-row">
                <i class="fas fa-receipt"></i>
                <span>Facture</span>
                <span class="facture-number">#${factureNum}</span>
            </div>
            <div class="meta-row">
                <span class="meta-item">
                    <i class="far fa-calendar-alt"></i> ${dt.date}
                </span>
                <span class="meta-item">
                    <i class="far fa-clock"></i> ${dt.time}
                </span>
                <span class="client-name">
                    <i class="fas fa-user-circle"></i> ${escapeHtml(clientName)}
                </span>
            </div>
        </div>
    `;
}

// Génère l'en-tête de cellule PRO pour Commandes
function renderCommandeCellHeader(commande) {
    const dt = commande.createdAt ? formatDateHeure(commande.createdAt.seconds) : { date: '-', time: '-', full: '-' };
    const cmdId = commande.id?.substring(0, 8) || '---';
    const clientName = commande.clientName || 'Client inconnu';
    
    return `
        <div class="commande-cell-header">
            <div class="facture-row">
                <i class="fas fa-shopping-basket"></i>
                <span>Commande</span>
                <span class="facture-number">#CMD-${cmdId}</span>
            </div>
            <div class="meta-row">
                <span class="meta-item">
                    <i class="far fa-calendar-alt"></i> ${dt.date}
                </span>
                <span class="meta-item">
                    <i class="far fa-clock"></i> ${dt.time}
                </span>
                <span class="client-name">
                    <i class="fas fa-user-circle"></i> ${escapeHtml(clientName)}
                </span>
            </div>
        </div>
    `;
}

// ==================== COMMANDES EN LIGNE (PRO) ====================
function loadCommandesPage(c) {
    c.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-shopping-basket"></i> Commandes en ligne</h3>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="commandesSearchInput" 
                               placeholder="Rechercher (client, email, tél, produit)..."
                               onkeyup="window.commandesSearch = this.value; window.currentPages.commandes=1; applyCommandesFilters();">
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
            <div id="commandesPagination" style="margin-top:10px;"></div>
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
    var pageData = getPageData('commandes', data);
    if (pageData.length === 0) {
        cont.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
                <p style="margin-top:16px;color:#6b7280;font-size:1.1rem;">Aucune commande trouvée</p>
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
                        <th style="min-width:200px;">
                            <i class="fas fa-file-invoice"></i> Détails
                        </th>
                        <th><i class="fas fa-envelope"></i> Email</th>
                        <th><i class="fas fa-phone"></i> Tél</th>
                        <th><i class="fas fa-box"></i> Articles</th>
                        <th><i class="fas fa-cog"></i> Options</th>
                        ${makeSortableHeader('commandes', 'total', '💰 Total', 'renderCommandesTablePro')}
                        ${makeSortableHeader('commandes', 'statut', '📌 Statut', 'renderCommandesTablePro')}
                        <th><i class="fas fa-tools"></i> Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    pageData.forEach(function(d) {
        const headerHtml = renderCommandeCellHeader(d);
        var arts = d.items ? d.items.map(function(it) { 
            return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom); 
        }).join('<br>') : '-';
        
        var opts = d.items ? d.items.map(function(it) {
            var o = [];
            if (it.sauces && it.sauces.length) o.push('<span class="badge-option sauce">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
            if (it.interdits && it.interdits.length) o.push('<span class="badge-option interdit">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
            if (it.epice && it.epice !== 'Normal') o.push('<span class="badge-option epice">🌶️' + escapeHtml(it.epice) + '</span>');
            if (it.sel && it.sel !== 'Normal') o.push('<span class="badge-option sel">🧂' + escapeHtml(it.sel) + '</span>');
            return o.length ? o.join(' | ') : '<span style="color:#9ca3af;font-size:0.7rem;">Aucune option</span>';
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
                    <button class="btn-add" onclick="validateCommande('${d.id}')" title="Valider">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-edit" onclick="payCommande('${d.id}')" title="Payer" style="background:#10B981;color:#fff;">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                    <button class="btn-delete" onclick="cancelCommande('${d.id}')" title="Annuler">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else if (d.statut === 'valide') {
            act = `
                <div class="action-buttons">
                    <button class="btn-edit" onclick="payCommande('${d.id}')" title="Payer" style="background:#10B981;color:#fff;">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                </div>
            `;
        } else if (d.statut === 'payé') {
            act = `<span style="color:#10B981;font-weight:600;"><i class="fas fa-check-circle"></i> Payée</span>`;
        } else {
            act = `<span style="color:#9ca3af;font-size:0.7rem;">${d.statut || '-'}</span>`;
        }
        
        h += `
            <tr>
                <td>${headerHtml}</td>
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

// ==================== VENTES (PRO) ====================
function loadVentesPage(c) {
    window.ventesPeriod = 'all';
    window.ventesSearch = '';
    window.venteSelectionMode = false;
    window.venteSelectedIndex = -1;
    if (!window.sortOrders.ventes) window.sortOrders.ventes = {};
    if (!window.sortOrders.ventes.createdAt) { window.sortOrders.ventes.createdAt = 'desc'; }
    
    c.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <h3><i class="fas fa-shopping-cart"></i> Ventes</h3>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="ventesSearchInput" 
                               placeholder="Rechercher (client, produit)..."
                               onkeyup="window.ventesSearch = this.value; window.currentPages.ventes=1; applyVentesFilters();">
                        <button class="btn-add" style="border-radius:var(--radius);padding:8px 12px;" onclick="toggleVoiceRecognition('ventes')">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <div class="filter-group">
                        <label><i class="far fa-calendar-alt"></i> Période</label>
                        <select id="ventesPeriodSelect" onchange="window.ventesPeriod = this.value; window.currentPages.ventes=1; applyVentesFilters();">
                            ${getPeriodOptions('all')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-filter"></i> Statut</label>
                        <select id="ventesStatusFilter" onchange="applyVentesFilters();">
                            <option value="all">Tous</option>
                            <option value="payé">Payé</option>
                            <option value="crédit">Crédit</option>
                            <option value="partiel">Partiel</option>
                            <option value="en_attente">En attente</option>
                        </select>
                    </div>
                    <button class="btn-add" onclick="loadVentes()">
                        <i class="fas fa-sync-alt"></i> Actualiser
                    </button>
                </div>
            </div>
            <div id="ventesTableContainer"></div>
            <div id="ventesPagination" style="margin-top:10px;"></div>
        </div>
    `;
    loadVentes();
}

async function loadVentes() {
    var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
    var vendeurCaissier = '';
    if (!isAdmin && window.currentUserData) {
        vendeurCaissier = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
    }
    try {
        const snapshot = await db.collection('ventes').orderBy('createdAt', 'desc').limit(2000).get();
        window.allVentesData = [];
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
            window.allVentesData.push(d);
        });
        if (!isAdmin) {
            window.allVentesData = window.allVentesData.filter(function(d) { return d.vendeur === vendeurCaissier; });
        }
        if (!window.sortOrders.ventes) window.sortOrders.ventes = {};
        if (!window.sortOrders.ventes.createdAt) { window.sortOrders.ventes.createdAt = 'desc'; }
    } catch (e) { console.error('Erreur chargement ventes:', e); }
    window.currentPages.ventes = 1;
    applyVentesFilters();
}

function applyVentesFilters() {
    var filtered = filterByPeriod(window.allVentesData, window.ventesPeriod);
    filtered = filterBySearch(filtered, window.ventesSearch, ['clientName', 'items.nom']);
    
    // Filtre par statut
    var statusFilter = document.getElementById('ventesStatusFilter');
    if (statusFilter && statusFilter.value !== 'all') {
        filtered = filtered.filter(function(d) {
            return (d.statutPaiement || (d.paid ? 'payé' : 'impayé')) === statusFilter.value;
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
    renderVentesTablePro();
}

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
    
    var pageData = getPageData('ventes', data);
    if (pageData.length === 0) {
        cont.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
                <p style="margin-top:16px;color:#6b7280;font-size:1.1rem;">Aucune vente trouvée</p>
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
                        <th style="min-width:220px;"><i class="fas fa-file-invoice"></i> Détails</th>
                        ${isAdmin ? `<th><i class="fas fa-box"></i> Articles</th><th><i class="fas fa-cog"></i> Options</th>` : ''}
                        ${isAdmin ? `<th><i class="fas fa-coins"></i> Achat</th><th><i class="fas fa-chart-line"></i> Profit</th>` : ''}
                        <th><i class="fas fa-tag"></i> Total</th>
                        <th><i class="fas fa-percent"></i> Remise</th>
                        <th><i class="fas fa-hand-holding-usd"></i> Donné</th>
                        <th><i class="fas fa-undo-alt"></i> Rendu</th>
                        ${isAdmin ? `<th><i class="fas fa-user-tie"></i> Vendeur</th>` : ''}
                        <th><i class="fas fa-credit-card"></i> Paiement</th>
                        <th><i class="fas fa-circle"></i> Statut</th>
                        <th><i class="fas fa-tools"></i> Actions</th>
                        ${window.venteSelectionMode ? '<th style="width:40px;">✅</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;
    
    pageData.forEach(function(d, index) {
        const headerHtml = renderVenteCellHeader(d);
        var arts = d.items ? d.items.map(function(it) { 
            return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom); 
        }).join('<br>') : '-';
        
        var opts = d.items ? d.items.map(function(it) {
            var o = [];
            if (it.sauces && it.sauces.length) o.push('<span class="badge-option sauce">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
            if (it.interdits && it.interdits.length) o.push('<span class="badge-option interdit">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
            if (it.epice && it.epice !== 'Normal') o.push('<span class="badge-option epice">🌶️' + escapeHtml(it.epice) + '</span>');
            if (it.sel && it.sel !== 'Normal') o.push('<span class="badge-option sel">🧂' + escapeHtml(it.sel) + '</span>');
            return o.length ? o.join(' | ') : '<span style="color:#9ca3af;font-size:0.7rem;">Aucune option</span>';
        }).join('<br>') : '-';
        
        tv += d.total || 0;
        tProfit += d.profit || 0;
        tAchat += d.achat || 0;
        
        var statutMap = {
            'payé': { class: 'status-success', label: 'Payé', icon: 'fa-check-circle' },
            'crédit': { class: 'status-warning', label: 'Crédit', icon: 'fa-hand-holding-usd' },
            'partiel': { class: 'status-warning', label: 'Partiel', icon: 'fa-clock' },
            'en_attente': { class: 'status-danger', label: 'En attente', icon: 'fa-hourglass-half' }
        };
        var st = statutMap[d.statutPaiement] || { class: 'status-warning', label: d.statutPaiement || 'Inconnu', icon: 'fa-question-circle' };
        
        var actions = `
            <div class="action-buttons">
                <button class="btn-edit" onclick="printFacture('${d.id}')" title="Imprimer">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn-edit" onclick="sendWhatsApp('${d.id}')" title="WhatsApp" style="color:#25D366;">
                    <i class="fab fa-whatsapp"></i>
                </button>
        `;
        if (!d.paid) {
            actions += `<button class="btn-add" onclick="payerVente('${d.id}')" title="Payer" style="background:#10B981;">
                            <i class="fas fa-check"></i>
                        </button>`;
        }
        if (isAdmin) {
            actions += `
                <button class="btn-edit" onclick="editVente('${d.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteVente('${d.id}')" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        }
        actions += `</div>`;
        
        var isSelected = (window.venteSelectionMode && window.venteSelectedIndex === index);
        var rowClass = isSelected ? ' style="background:#fef3c7; border-left:4px solid #d97706;"' : '';
        
        h += `<tr${rowClass}>
            <td>${headerHtml}</td>
            ${isAdmin ? `<td>${arts}</td><td>${opts}</td>` : ''}
            ${isAdmin ? `<td>${(d.achat || 0).toFixed(2)}</td><td style="color:#2E7D32;font-weight:700;">${(d.profit || 0).toFixed(2)}</td>` : ''}
            <td><span class="amount-total">${(d.total || 0).toFixed(2)} MAD</span></td>
            <td>${(d.discountMAD || 0).toFixed(2)}</td>
            <td>${(d.amountGiven || 0).toFixed(2)}</td>
            <td>${(d.change || 0).toFixed(2)}</td>
            ${isAdmin ? `<td>${escapeHtml(d.vendeur || '-')}</td>` : ''}
            <td>${escapeHtml(d.paymentMethod || '-')}</td>
            <td><span class="${st.class}"><i class="fas ${st.icon}"></i> ${st.label}</span></td>
            <td>${actions}</td>
            ${window.venteSelectionMode ? `<td><input type="checkbox" ${isSelected ? 'checked' : ''} onclick="window.venteSelectedIndex=${index};renderVentesTablePro();"></td>` : ''}
        </tr>`;
    });
    
    h += `
                </tbody>
            </table>
        </div>
        <div class="total-row-pro">
            <div style="display:flex;gap:32px;flex-wrap:wrap;justify-content:flex-end;width:100%;">
                <div>
                    <span class="total-label">Total Ventes</span>
                    <span class="total-amount"><i class="fas fa-dollar-sign"></i> ${tv.toFixed(2)} MAD</span>
                </div>
                ${isAdmin ? `
                <div>
                    <span class="total-label">Total Achat</span>
                    <span class="total-amount" style="color:#6b7280;"><i class="fas fa-coins"></i> ${tAchat.toFixed(2)} MAD</span>
                </div>
                <div>
                    <span class="total-label">Profit Total</span>
                    <span class="total-amount" style="color:#10B981;"><i class="fas fa-chart-line"></i> ${tProfit.toFixed(2)} MAD</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    cont.innerHTML = h;
    document.getElementById('ventesPagination').innerHTML = getPaginationHTML('ventes', data.length);
}

// ==================== EDITER VENTE (PRO) ====================
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
    saveDocument('ventes', data, function() { closeModal(); loadVentes(); });
}

// ==================== AUTRES FONCTIONS (inchangées) ====================
function deleteVente(did) {
    if (confirm('Supprimer définitivement cette vente ?')) {
        CacheDB.write('ventes', did, null, 'delete').then(function() {
            alert('✅ Supprimé');
            loadVentes();
            CacheDB.sync();
        });
    }
}

async function payerVente(did) {
    if (!confirm('Payer cette vente ? Redirection vers le POS...')) return;
    var dc = await db.collection('ventes').doc(did).get();
    if (!dc.exists) { alert('Introuvable'); return; }
    var d = dc.data();
    localStorage.setItem('posPayerVente', JSON.stringify({
        venteId: did,
        clientId: d.clientId,
        clientName: d.clientName,
        items: d.items,
        total: d.total,
        table: d.table || ''
    }));
    navigateTo('pos');
}

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
        <html><head><title>Facture Mixmax Minimarket</title>
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
            <h2>🛒 Mixmax Minimarket</h2>
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

// ==================== WHATSAPP PRO ====================
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

        var msg = '🧾 *FACTURE MIXMAX MINIMARKET*\n';
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
        msg += '🛒 Mixmax Minimarket';

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

// ==================== STYLES SUPPLÉMENTAIRES (pour les badges d'options) ====================
// Ces styles peuvent être ajoutés dans votre CSS global

// ==================== EXPORTS ====================
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
window.printFacture = printFacture;
window.imprimerFacture = imprimerFacture;
window.sendWhatsApp = sendWhatsApp;
window.formatDateHeure = formatDateHeure;
window.renderVenteCellHeader = renderVenteCellHeader;
window.renderCommandeCellHeader = renderCommandeCellHeader;

console.log('🛒 Mixmax Minimarket - Admin Ventes PRO chargé ✅');
