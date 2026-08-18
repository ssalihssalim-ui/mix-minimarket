// ==================== ADMIN-CREDITS.JS - MIXMAX MINIMARKET ====================
// Version : Statistiques dynamiques avec filtres - POLICE 24px
// ✅ STATISTIQUES EN HAUT DE PAGE - MISE À JOUR DYNAMIQUE
// ✅ POLICE 24px POUR LES STATISTIQUES
// ✅ FILTRES ET RECHERCHE EN TEMPS RÉEL
// ✅ GESTION COMPLÈTE DES CRÉDITS
// Version FINALE

// ========== VARIABLES GLOBALES ==========
window.creditsPeriod = window.creditsPeriod || 'all';
window.creditsSearch = window.creditsSearch || '';
window.creditSelectionMode = false;
window.creditSelectedIds = [];
window.allCreditsData = window.allCreditsData || [];
window.clientsDataForSearch = window.clientsDataForSearch || [];
window.creditsListener = null;
window.filteredCredits = [];
window.currentPages = window.currentPages || { credits: 1 };
window.itemsPerPage = 20;
window.sortOrders = window.sortOrders || {};
window.sortOrders.credits = window.sortOrders.credits || {};
window.sortOrders.credits.createdAt = 'desc';

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

function formatCurrency(amount) {
    return amount.toFixed(2) + ' MAD';
}

function getStatusBadge(credit) {
    if (credit.paid || (credit.remainingAmount || 0) <= 0) {
        return '<span class="status-success"><i class="fas fa-check-circle"></i> Payé</span>';
    }
    if (credit.dueDate) {
        var due = credit.dueDate.toDate ? credit.dueDate.toDate() : new Date(credit.dueDate);
        if (due < new Date()) {
            return '<span class="status-danger"><i class="fas fa-exclamation-circle"></i> En retard</span>';
        }
    }
    return '<span class="status-warning"><i class="fas fa-clock"></i> En attente</span>';
}

function getPeriodLabel(period) {
    var labels = {
        'today': "Aujourd'hui",
        'week': 'Cette semaine',
        'month': 'Ce mois',
        'year': 'Cette année',
        'all': 'Toutes'
    };
    return labels[period] || period;
}

// ========== PAGINATION ==========
function getPageData(pageKey, data) {
    var page = window.currentPages[pageKey] || 1;
    var start = (page - 1) * window.itemsPerPage;
    var end = start + window.itemsPerPage;
    return data.slice(start, end);
}

function getPaginationHTML(pageKey, totalItems) {
    var totalPages = Math.ceil(totalItems / window.itemsPerPage);
    var currentPage = window.currentPages[pageKey] || 1;
    
    if (totalPages <= 1) return '';
    
    var html = '<div style="display:flex;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap;">';
    
    html += `<button onclick="goToPage('${pageKey}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} 
        style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button onclick="goToPage('${pageKey}', 1)" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;">1</button>`;
        if (startPage > 2) html += '<span style="padding:8px 8px;">...</span>';
    }
    
    for (var i = startPage; i <= endPage; i++) {
        var isActive = i === currentPage;
        html += `<button onclick="goToPage('${pageKey}', ${i})" 
            style="padding:8px 16px;border:1px solid ${isActive ? '#1a1a1a' : '#e2e8f0'};border-radius:8px;
            background:${isActive ? '#1a1a1a' : '#fff'};color:${isActive ? '#fff' : '#333'};
            cursor:pointer;font-size:16px;font-weight:${isActive ? '700' : '400'};">
            ${i}
        </button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span style="padding:8px 8px;">...</span>';
        html += `<button onclick="goToPage('${pageKey}', ${totalPages})" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;">${totalPages}</button>`;
    }
    
    html += `<button onclick="goToPage('${pageKey}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}
        style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    html += '</div>';
    return html;
}

function goToPage(pageKey, page) {
    var totalItems = window.filteredCredits ? window.filteredCredits.length : window.allCreditsData.length;
    var totalPages = Math.ceil(totalItems / window.itemsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    window.currentPages[pageKey] = page;
    renderCreditsTablePro();
}

// ========== TRI ==========
function applySort(pageKey, data, field) {
    if (!window.sortOrders) window.sortOrders = {};
    if (!window.sortOrders[pageKey]) window.sortOrders[pageKey] = {};
    
    var order = window.sortOrders[pageKey][field] || 'desc';
    var direction = order === 'desc' ? -1 : 1;
    
    return data.slice().sort(function(a, b) {
        var va = a[field]?.seconds || a[field] || '';
        var vb = b[field]?.seconds || b[field] || '';
        
        if (typeof va === 'string' && typeof vb === 'string') {
            return direction * va.localeCompare(vb);
        }
        return direction * (va - vb);
    });
}

function toggleSort(pageKey, field) {
    if (!window.sortOrders) window.sortOrders = {};
    if (!window.sortOrders[pageKey]) window.sortOrders[pageKey] = {};
    
    var current = window.sortOrders[pageKey][field] || 'desc';
    window.sortOrders[pageKey][field] = current === 'desc' ? 'asc' : 'desc';
    
    applyCreditsFilters();
}

// ========== DÉTECTION FILTRE PÉRIODE (pour voice) ==========
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

// ========== CHARGER LES CLIENTS POUR LA RECHERCHE ==========
async function loadClientsForSearchCredits() {
    try {
        const snapshot = await db.collection('clients').limit(2000).get();
        window.clientsDataForSearch = [];
        snapshot.forEach(doc => {
            var d = doc.data();
            d.id = doc.id;
            window.clientsDataForSearch.push(d);
        });
        console.log('📋 Clients chargés pour recherche:', window.clientsDataForSearch.length);
    } catch(e) {
        console.warn('Erreur chargement clients:', e);
        window.clientsDataForSearch = [];
    }
}

// ========== FONCTION DE RECHERCHE AVEC DESCRIPTION ==========
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

// Génère l'affichage Facture
function renderCreditFactureCell(credit) {
    const factureNum = credit.factureNum || credit.id?.substring(0, 8) || '---';
    return `
        <div class="facture-cell">
            <i class="fas fa-file-invoice"></i>
            <span class="facture-number">#${factureNum}</span>
        </div>
    `;
}

// Génère l'affichage Date/Heure
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

// Génère l'affichage Client
function renderCreditClientCell(credit) {
    var clientName = credit._clientDisplayName || credit.clientName || credit.table || 'Client inconnu';
    return `
        <div class="client-cell">
            <i class="fas fa-user-circle"></i>
            <span>${escapeHtml(clientName)}</span>
        </div>
    `;
}

// ========== STATISTIQUES DYNAMIQUES AVEC POLICE 24px ==========
function renderDynamicCreditStats(data, searchQuery, period) {
    var statsContainer = document.getElementById('creditStatsContainer');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'creditStatsContainer';
        statsContainer.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:16px; padding:14px 18px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;';
        
        var page = document.getElementById('creditsPage') || document.querySelector('.content-card');
        if (page) {
            page.insertBefore(statsContainer, page.firstChild);
        } else {
            var container = document.getElementById('creditsTableContainer');
            if (container) container.parentNode.insertBefore(statsContainer, container);
        }
    }

    var filteredData = filterDataForStats(data, searchQuery, period);

    if (!filteredData || filteredData.length === 0) {
        statsContainer.innerHTML = `
            <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #94a3b8; grid-column:1/-1; text-align:center; color:#94a3b8; font-size:24px;">
                <i class="fas fa-inbox" style="font-size:36px; display:block; margin-bottom:10px;"></i>
                Aucune donnée correspondante
                ${searchQuery ? `<br><span style="font-size:20px;">Recherche: "${escapeHtml(searchQuery)}"</span>` : ''}
                ${period && period !== 'all' ? `<br><span style="font-size:20px;">Période: ${getPeriodLabel(period)}</span>` : ''}
            </div>
        `;
        return;
    }

    var actifs = filteredData.filter(function(c) { return !c.paid && (c.remainingAmount || 0) > 0; });
    var payes = filteredData.filter(function(c) { return c.paid || (c.remainingAmount || 0) <= 0; });
    var totalRestant = actifs.reduce(function(sum, c) { return sum + (c.remainingAmount || 0); }, 0);
    var totalCredits = filteredData.reduce(function(sum, c) { return sum + (c.total || 0); }, 0);

    var clientDebts = {};
    actifs.forEach(function(c) {
        var name = c.clientName || 'Client inconnu';
        if (!clientDebts[name]) clientDebts[name] = 0;
        clientDebts[name] += (c.remainingAmount || 0);
    });
    var topClient = '';
    var topAmount = 0;
    for (var name in clientDebts) {
        if (clientDebts[name] > topAmount) {
            topAmount = clientDebts[name];
            topClient = name;
        }
    }

    var now = new Date();
    var enRetard = actifs.filter(function(c) {
        if (!c.dueDate) return false;
        var due = c.dueDate.toDate ? c.dueDate.toDate() : new Date(c.dueDate);
        return due < now;
    });

    statsContainer.innerHTML = `
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #2563eb; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">📊 Total</div>
            <div style="font-size:40px !important; font-weight:800; color:#111827;">${filteredData.length}</div>
            ${searchQuery ? `<div style="font-size:16px;color:#94a3b8;margin-top:2px;">filtre: "${escapeHtml(searchQuery)}"</div>` : ''}
            ${period && period !== 'all' ? `<div style="font-size:16px;color:#94a3b8;margin-top:2px;">${getPeriodLabel(period)}</div>` : ''}
        </div>
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #dc2626; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">💳 Impayés</div>
            <div style="font-size:40px !important; font-weight:800; color:#dc2626;">${actifs.length}</div>
            ${filteredData.length > 0 ? `<div style="font-size:16px;color:#94a3b8;margin-top:2px;">${((actifs.length / filteredData.length) * 100).toFixed(0)}%</div>` : ''}
        </div>
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #16a34a; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">✅ Payés</div>
            <div style="font-size:40px !important; font-weight:800; color:#16a34a;">${payes.length}</div>
            ${filteredData.length > 0 ? `<div style="font-size:16px;color:#94a3b8;margin-top:2px;">${((payes.length / filteredData.length) * 100).toFixed(0)}%</div>` : ''}
        </div>
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #8b5cf6; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">💰 Restant dû</div>
            <div style="font-size:40px !important; font-weight:800; color:#8b5cf6;">${totalRestant.toFixed(2)} MAD</div>
            ${actifs.length > 0 ? `<div style="font-size:16px;color:#94a3b8;margin-top:2px;">moyenne: ${(totalRestant / actifs.length).toFixed(2)} MAD</div>` : ''}
        </div>
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #f59e0b; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">⏰ En retard</div>
            <div style="font-size:40px !important; font-weight:800; color:#f59e0b;">${enRetard.length}</div>
            ${enRetard.length > 0 ? `<div style="font-size:16px;color:#ef4444;margin-top:2px;">⚠️ à régler</div>` : '<div style="font-size:16px;color:#16a34a;margin-top:2px;">✅ tout est bon</div>'}
        </div>
        <div style="background:#fff; padding:16px 20px; border-radius:10px; border-left:4px solid #ec4899; transition:transform 0.2s;">
            <div style="font-size:24px !important; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">🏆 Plus gros crédit</div>
            <div style="font-size:24px; font-weight:700; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(topClient)}">
                ${topClient ? escapeHtml(topClient) : '-'}
            </div>
            <div style="font-size:28px; font-weight:700; color:#8b5cf6;">${topAmount.toFixed(2)} MAD</div>
            ${topClient ? `<div style="font-size:14px;color:#94a3b8;margin-top:2px;">sur ${actifs.length} débiteur${actifs.length > 1 ? 's' : ''}</div>` : ''}
        </div>
    `;
}

// ========== FONCTION DE FILTRAGE POUR LES STATISTIQUES ==========
function filterDataForStats(data, searchQuery, period) {
    if (!data || data.length === 0) return [];

    var filtered = data.slice();

    if (period && period !== 'all') {
        var now = new Date();
        filtered = filtered.filter(function(c) {
            if (!c.createdAt) return false;
            var date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);

            if (period === 'today') {
                return date.toDateString() === now.toDateString();
            } else if (period === 'week') {
                var weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            } else if (period === 'month') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            } else if (period === 'year') {
                return date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    if (searchQuery && searchQuery.trim() !== '') {
        filtered = filterCreditsBySearchWithDescription(filtered, searchQuery);
    }

    return filtered;
}

// ========== RENDER TABLEAU DES CRÉDITS ==========
function renderCreditsTablePro() {
    var cont = document.getElementById('creditsTableContainer');
    if (!cont) return;

    var data = (window.filteredCredits || window.allCreditsData).slice();

    if (window.sortOrders && window.sortOrders.credits && window.sortOrders.credits.createdAt) {
        data = applySort('credits', data, 'createdAt');
    } else {
        data.sort(function(a, b) {
            var da = a.createdAt?.seconds || 0;
            var db = b.createdAt?.seconds || 0;
            return db - da;
        });
    }

    var pageData = getPageData('credits', data);

    if (pageData.length === 0) {
        cont.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-inbox" style="font-size:3rem;color:#d1d5db;"></i>
                <p style="margin-top:16px;color:#6b7280;font-size:24px !important;">Aucun crédit trouvé</p>
                <p style="color:#9ca3af;font-size:18px !important;">${window.creditsSearch ? 'Essayez de modifier votre recherche' : 'Aucun crédit enregistré pour le moment'}</p>
            </div>
        `;
        document.getElementById('creditsPagination').innerHTML = '';
        return;
    }

    var tc = 0;
    var isAdmin = window.currentUserData && window.currentUserData.userData?.role === 'admin';

    var h = `
        <div class="table-container" style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="min-width:160px;cursor:pointer;" onclick="toggleSort('credits', 'factureNum')">
                            <i class="fas fa-file-invoice"></i> Facture
                            <span class="sort-icon"><i class="fas fa-sort"></i></span>
                        </th>
                        <th style="min-width:150px;cursor:pointer;" onclick="toggleSort('credits', 'createdAt')">
                            <i class="far fa-calendar-alt"></i> Date / Heure
                            <span class="sort-icon"><i class="fas fa-sort"></i></span>
                        </th>
                        <th style="min-width:180px;cursor:pointer;" onclick="toggleSort('credits', 'clientName')">
                            <i class="fas fa-user"></i> Client
                            <span class="sort-icon"><i class="fas fa-sort"></i></span>
                        </th>
                        <th><i class="fas fa-box"></i> Articles</th>
                        <th style="cursor:pointer;" onclick="toggleSort('credits', 'total')">
                            <i class="fas fa-tag"></i> Total
                            <span class="sort-icon"><i class="fas fa-sort"></i></span>
                        </th>
                        <th><i class="fas fa-hand-holding-usd"></i> Payé</th>
                        <th style="cursor:pointer;" onclick="toggleSort('credits', 'remainingAmount')">
                            <i class="fas fa-hourglass-half"></i> Restant
                            <span class="sort-icon"><i class="fas fa-sort"></i></span>
                        </th>
                        <th><i class="fas fa-credit-card"></i> Mode</th>
                        ${isAdmin ? `<th><i class="fas fa-user-tie"></i> Vendeur</th>` : ''}
                        <th style="min-width:200px;"><i class="fas fa-tools"></i> Actions</th>
                        ${window.creditSelectionMode ? '<th style="width:40px;">☑️</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    pageData.forEach(function(d) {
        var reste = d.remainingAmount || d.total || 0;
        if (!d.paid) tc += reste;

        const factureHtml = renderCreditFactureCell(d);
        const dateHtml = renderCreditDateCell(d);
        const clientHtml = renderCreditClientCell(d);

        var articlesHtml = '';
        if (d.items && d.items.length > 0) {
            articlesHtml = d.items.slice(0, 3).map(function(it) {
                return '<strong>' + (it.quantite || 1) + 'x</strong> ' + escapeHtml(it.nom || '');
            }).join('<br>');
            if (d.items.length > 3) {
                articlesHtml += `<br><span style="color:#94a3b8;font-size:16px;">+${d.items.length - 3} autres</span>`;
            }
        } else {
            articlesHtml = '-';
        }

        var mode = d.paymentMethod || '-';
        var amountPaid = d.amountGiven || 0;

        var actions = `
            <div class="action-buttons">
                <button class="btn-edit" onclick="printFacture('${d.id}')" title="Imprimer / PDF">
                    <i class="fas fa-print"></i>
                </button>
        `;
        if (!d.paid) {
            actions += `<button class="btn-add payer-btn" onclick="payerCredit('${d.id}')" title="Payer">
                            <i class="fas fa-check"></i> Payer
                        </button>`;
        }
        if (isAdmin) {
            actions += `
                <button class="btn-edit" onclick="editCredit('${d.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="if(confirm('Supprimer définitivement ce crédit ?')) deleteCredit('${d.id}')" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
        }
        actions += `</div>`;

        var isSelected = window.creditSelectedIds.includes(d.id);
        var rowClass = isSelected ? ' selected' : '';

        h += `<tr class="${rowClass}">
            <td>${factureHtml}</td>
            <td>${dateHtml}</td>
            <td>${clientHtml}</td>
            <td>${articlesHtml}</td>
            <td><span class="amount-total">${d.total.toFixed(2)} MAD</span></td>
            <td>${amountPaid.toFixed(2)} MAD</td>
            <td><span class="amount-remaining ${d.paid ? 'paid' : ''}">${reste.toFixed(2)} MAD</span></td>
            <td>${escapeHtml(mode)}</td>
            ${isAdmin ? `<td>${escapeHtml(d.vendeur || '-')}</td>` : ''}
            <td>${actions}</td>
            ${window.creditSelectionMode ? `<td style="text-align:center;"><input type="checkbox" class="credit-select-check" data-id="${d.id}" ${isSelected ? 'checked' : ''} onchange="toggleCreditSelection('${d.id}')" style="transform:scale(1.5);width:24px;height:24px;cursor:pointer;"></td>` : ''}
        </tr>`;
    });

    h += `
                </tbody>
            </table>
        </div>
    `;

    var totalImpayes = data.filter(function(d) { return !d.paid; }).reduce(function(sum, d) {
        return sum + (d.remainingAmount || d.total || 0);
    }, 0);

    h += `
        <div class="total-row-pro">
            <span class="total-label"><i class="fas fa-exclamation-triangle"></i> Total Impayés</span>
            <span class="total-amount">${totalImpayes.toFixed(2)} MAD</span>
            <span class="total-label"><i class="fas fa-calculator"></i> Nombre total</span>
            <span class="total-amount" style="color:#2563eb;">${data.length}</span>
        </div>
    `;

    cont.innerHTML = h;
    document.getElementById('creditsPagination').innerHTML = getPaginationHTML('credits', data.length);
}

// ========== APPLIQUER LES FILTRES ==========
function applyCreditsFilters() {
    var filtered = window.allCreditsData.slice();

    if (window.creditsPeriod && window.creditsPeriod !== 'all') {
        var now = new Date();
        filtered = filtered.filter(function(c) {
            if (!c.createdAt) return false;
            var date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);

            if (window.creditsPeriod === 'today') {
                return date.toDateString() === now.toDateString();
            } else if (window.creditsPeriod === 'week') {
                var weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            } else if (window.creditsPeriod === 'month') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            } else if (window.creditsPeriod === 'year') {
                return date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    if (window.creditsSearch && window.creditsSearch.trim() !== '') {
        filtered = filterCreditsBySearchWithDescription(filtered, window.creditsSearch);
    }

    window.filteredCredits = filtered;
    window.currentPages.credits = 1;

    renderDynamicCreditStats(window.allCreditsData, window.creditsSearch, window.creditsPeriod);
    renderCreditsTablePro();
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type) {
    var colors = {
        success: '#16a34a',
        error: '#dc2626',
        warning: '#f59e0b',
        info: '#2563eb'
    };

    var icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    var bgColor = colors[type] || colors.info;
    var icon = icons[type] || icons.info;

    var notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${bgColor};
        color: white;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        max-width: 400px;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 12px;
    `;

    notification.innerHTML = `<i class="fas ${icon}" style="font-size:24px;"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, 3500);
}

// ========== ACTIONS CRUD ==========

function editCredit(creditId) {
    var credit = window.allCreditsData.find(function(c) { return c.id === creditId; });
    if (!credit) {
        showNotification('Crédit non trouvé', 'error');
        return;
    }
    openCreditModal(credit);
}

function payCredit(creditId) {
    if (!confirm('Confirmer le paiement de ce crédit ?')) return;

    showNotification('Traitement en cours...', 'info');

    db.collection('credits').doc(creditId).update({
        paid: true,
        remainingAmount: 0,
        paidAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        showNotification('✅ Crédit payé avec succès !', 'success');
        loadCreditsData();
    }).catch(function(error) {
        console.error('Erreur lors du paiement:', error);
        showNotification('❌ Erreur lors du paiement', 'error');
    });
}

function deleteCredit(creditId) {
    if (!confirm('⚠️ Supprimer définitivement ce crédit ? Cette action est irréversible.')) return;

    showNotification('Suppression en cours...', 'info');

    db.collection('credits').doc(creditId).delete().then(function() {
        showNotification('✅ Crédit supprimé avec succès', 'success');
        loadCreditsData();
    }).catch(function(error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('❌ Erreur lors de la suppression', 'error');
    });
}

function payerCredit(creditId) {
    var data = window.filteredCredits || window.allCreditsData || [];
    var credit = data.find(function(c) { return c.id === creditId; });
    if (!credit) {
        showNotification('Crédit introuvable', 'error');
        return;
    }

    localStorage.setItem('posPayerCredit', JSON.stringify({
        creditId: credit.id,
        clientId: credit.clientId || null,
        clientName: credit.clientName || '',
        items: credit.items || [],
        total: credit.total || 0,
        table: credit.table || '',
        amountGiven: credit.amountGiven || 0,
        remainingAmount: credit.remainingAmount || credit.total || 0,
        factureNum: credit.factureNum || ''
    }));

    if (typeof navigateTo === 'function') {
        navigateTo('pos');
    } else {
        window.location.href = '#pos';
    }
}

// ========== IMPRESSION FACTURE ==========
function printFacture(creditId) {
    db.collection('credits').doc(creditId).get().then(function(doc) {
        if (doc.exists) {
            imprimerFactureCredit(doc.data(), doc.id);
        } else {
            showNotification('Crédit non trouvé', 'error');
        }
    }).catch(function(error) {
        console.error('Erreur lors de l\'impression:', error);
        showNotification('Erreur lors de l\'impression', 'error');
    });
}

function imprimerFactureCredit(data, id) {
    var itemsHtml = '';
    if (data.items) {
        data.items.forEach(function(item) {
            var options = '';
            if (item.interdits && item.interdits.length > 0) options += ' 🚫' + item.interdits.join(',');
            if (item.epice && item.epice !== 'Normal') options += ' 🌶️' + item.epice;
            if (item.sel && item.sel !== 'Normal') options += ' 🧂' + item.sel;
            itemsHtml += `<tr>
                <td>${escapeHtml(item.nom)}${options}</td>
                <td style="text-align:center;">${item.quantite}</td>
                <td style="text-align:right;">${(item.prixVente || 0).toFixed(2)}</td>
                <td style="text-align:right;">${((item.prixVente || 0) * item.quantite).toFixed(2)}</td>
            </tr>`;
        });
    }

    var win = window.open('', '_blank', 'width=420,height=600');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Facture Mixmax Minimarket</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', Arial, sans-serif; 
                    padding: 24px; 
                    background: #f9fafb;
                }
                .invoice {
                    background: #fff;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    max-width: 400px;
                    margin: 0 auto;
                }
                h2 { 
                    text-align: center; 
                    color: #111827; 
                    font-size: 22px;
                    margin-bottom: 16px;
                }
                .header-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin: 16px 0;
                    font-size: 14px;
                    background: #f8fafc;
                    padding: 12px;
                    border-radius: 8px;
                }
                .header-info strong { color: #374151; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 16px 0;
                    font-size: 13px;
                }
                th {
                    background: #f3f4f6;
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #6b7280;
                }
                td {
                    padding: 8px 12px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                }
                .total {
                    font-size: 18px;
                    font-weight: 800;
                    text-align: right;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 2px solid #111827;
                }
                .remaining {
                    font-size: 16px;
                    font-weight: 700;
                    text-align: right;
                    color: #ef4444;
                    margin-top: 8px;
                }
                .footer {
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e7eb;
                }
                .discount {
                    text-align: right;
                    color: #ef4444;
                    font-size: 14px;
                    margin-top: 8px;
                }
                @media print {
                    body { background: #fff; padding: 0; }
                    .invoice { box-shadow: none; border: 1px solid #e5e7eb; }
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <h2>🛒 Mixmax Minimarket</h2>
                <div class="header-info">
                    <div><strong>Facture:</strong> ${data.factureNum || id.substring(0, 8)}</div>
                    <div><strong>Date:</strong> ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString('fr-FR') : ''}</div>
                    <div><strong>Client:</strong> ${data.clientName || data.table || '-'}</div>
                    <div><strong>Vendeur:</strong> ${data.vendeur || '-'}</div>
                    <div><strong>Mode:</strong> ${data.paymentMethod || '-'}</div>
                    <div><strong>Statut:</strong> ${data.paid ? '✅ Payé' : '⏳ En attente'}</div>
                </div>
                <table>
                    <tr>
                        <th>Article</th>
                        <th style="text-align:center;">Qté</th>
                        <th style="text-align:right;">Prix</th>
                        <th style="text-align:right;">Total</th>
                    </tr>
                    ${itemsHtml}
                </table>
                ${data.discountMAD > 0 ? `<div class="discount">Remise: -${data.discountMAD.toFixed(2)} MAD</div>` : ''}
                <div class="total">Total: ${data.total.toFixed(2)} MAD</div>
                <div class="remaining">💰 Restant: ${(data.remainingAmount || data.total || 0).toFixed(2)} MAD</div>
                <div class="footer">Merci de votre visite ! 🌟</div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ========== MODAL CRÉDIT ==========
function openCreditModal(creditData) {
    var isEdit = !!creditData && creditData.id;
    var modalOverlay = document.createElement('div');
    modalOverlay.className = 'credits-modal-overlay';
    modalOverlay.id = 'creditModal';

    var clientOptions = '<option value="">Sélectionner un client</option>';
    window.clientsDataForSearch.forEach(function(client) {
        var name = (client.nom || '') + ' ' + (client.prenom || '');
        var selected = creditData && creditData.clientId === client.id ? 'selected' : '';
        clientOptions += `<option value="${client.id}" ${selected}>${escapeHtml(name)}</option>`;
    });

    var modalHtml = `
        <div class="credits-modal">
            <h2>
                <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'}"></i>
                ${isEdit ? 'Modifier le crédit' : 'Nouveau crédit'}
            </h2>
            <form id="creditForm">
                <div class="form-group">
                    <label><i class="fas fa-user"></i> Client</label>
                    <select id="creditClient" required>
                        ${clientOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-file-invoice"></i> Numéro de facture</label>
                    <input type="text" id="creditFactureNum" placeholder="FACT-001" value="${isEdit ? escapeHtml(creditData.factureNum || '') : ''}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-coins"></i> Montant total</label>
                    <input type="number" id="creditTotal" step="0.01" placeholder="0.00" value="${isEdit ? (creditData.total || 0) : ''}" required>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-hand-holding-usd"></i> Montant payé</label>
                    <input type="number" id="creditPaid" step="0.01" placeholder="0.00" value="${isEdit ? (creditData.paidAmount || 0) : ''}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-calendar-alt"></i> Date d'échéance</label>
                    <input type="date" id="creditDueDate" value="${isEdit && creditData.dueDate ? (creditData.dueDate.toDate ? creditData.dueDate.toDate().toISOString().split('T')[0] : new Date(creditData.dueDate).toISOString().split('T')[0]) : ''}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-notes-medical"></i> Notes</label>
                    <textarea id="creditNotes" rows="3" placeholder="Notes supplémentaires...">${isEdit ? escapeHtml(creditData.notes || '') : ''}</textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeCreditModal()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button type="submit" class="btn-submit">
                        <i class="fas ${isEdit ? 'fa-save' : 'fa-plus'}"></i> ${isEdit ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    `;

    modalOverlay.innerHTML = modalHtml;
    document.body.appendChild(modalOverlay);

    document.getElementById('creditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCredit(creditData ? creditData.id : null);
    });

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeCreditModal();
        }
    });
}

function closeCreditModal() {
    var modal = document.getElementById('creditModal');
    if (modal) modal.remove();
}

function saveCredit(creditId) {
    var clientId = document.getElementById('creditClient').value;
    var factureNum = document.getElementById('creditFactureNum').value.trim();
    var total = parseFloat(document.getElementById('creditTotal').value) || 0;
    var paidAmount = parseFloat(document.getElementById('creditPaid').value) || 0;
    var dueDate = document.getElementById('creditDueDate').value;
    var notes = document.getElementById('creditNotes').value.trim();

    if (!clientId) {
        showNotification('Veuillez sélectionner un client', 'warning');
        return;
    }

    if (total <= 0) {
        showNotification('Le montant total doit être supérieur à 0', 'warning');
        return;
    }

    var remainingAmount = total - paidAmount;
    var isPaid = remainingAmount <= 0;

    var client = window.clientsDataForSearch.find(function(c) { return c.id === clientId; });
    var clientName = client ? ((client.nom || '') + ' ' + (client.prenom || '')).trim() : 'Client inconnu';

    var data = {
        clientId: clientId,
        clientName: clientName,
        factureNum: factureNum || 'FACT-' + Date.now().toString().slice(-6),
        total: total,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        paid: isPaid,
        notes: notes,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (dueDate) {
        data.dueDate = new Date(dueDate);
    }

    if (!creditId) {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.items = [];

        showNotification('Création en cours...', 'info');

        db.collection('credits').add(data).then(function() {
            showNotification('✅ Crédit créé avec succès !', 'success');
            closeCreditModal();
            loadCreditsData();
        }).catch(function(error) {
            console.error('Erreur lors de la création:', error);
            showNotification('❌ Erreur lors de la création', 'error');
        });
    } else {
        showNotification('Mise à jour en cours...', 'info');

        db.collection('credits').doc(creditId).update(data).then(function() {
            showNotification('✅ Crédit mis à jour avec succès !', 'success');
            closeCreditModal();
            loadCreditsData();
        }).catch(function(error) {
            console.error('Erreur lors de la mise à jour:', error);
            showNotification('❌ Erreur lors de la mise à jour', 'error');
        });
    }
}

// ========== SÉLECTION MULTIPLE ==========
function toggleCreditSelectionMode() {
    window.creditSelectionMode = !window.creditSelectionMode;
    window.creditSelectedIds = [];
    window.selectAllBtnState = false;

    var selectBtn = document.getElementById('toggleSelectionBtn');
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    var selectAllBtn = document.getElementById('selectAllBtn');

    if (selectBtn) {
        selectBtn.innerHTML = window.creditSelectionMode ? 
            '<i class="fas fa-times-circle"></i> Annuler' : 
            '<i class="fas fa-check-square"></i> Sélectionner';
    }
    if (selectAllBtn) {
        selectAllBtn.style.display = window.creditSelectionMode ? 'inline-block' : 'none';
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
        selectAllBtn.style.background = '#4f46e5';
    }
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }

    renderCreditsTablePro();
}

function toggleCreditSelection(id) {
    var idx = window.creditSelectedIds.indexOf(id);
    if (idx === -1) {
        window.creditSelectedIds.push(id);
    } else {
        window.creditSelectedIds.splice(idx, 1);
    }
    updateDeleteButtonVisibility();
    renderCreditsTablePro();
}

function updateDeleteButtonVisibility() {
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.style.display = window.creditSelectedIds.length > 0 ? 'inline-block' : 'none';
        deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Supprimer (${window.creditSelectedIds.length})`;
    }
}

function toggleSelectAllVisible() {
    var data = window.filteredCredits || window.allCreditsData;
    var pageData = getPageData('credits', data);
    
    if (window.selectAllBtnState) {
        pageData.forEach(function(d) {
            var idx = window.creditSelectedIds.indexOf(d.id);
            if (idx !== -1) {
                window.creditSelectedIds.splice(idx, 1);
            }
        });
    } else {
        pageData.forEach(function(d) {
            if (!window.creditSelectedIds.includes(d.id)) {
                window.creditSelectedIds.push(d.id);
            }
        });
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
    
    updateDeleteButtonVisibility();
    renderCreditsTablePro();
}

function deleteSelectedCredits() {
    if (window.creditSelectedIds.length === 0) {
        showNotification('Aucun crédit sélectionné', 'warning');
        return;
    }
    
    if (!confirm('⚠️ Supprimer définitivement les ' + window.creditSelectedIds.length + ' crédits sélectionnés ?')) return;

    showNotification('Suppression en cours...', 'info');

    var promises = window.creditSelectedIds.map(function(id) {
        return db.collection('credits').doc(id).delete();
    });

    Promise.all(promises).then(function() {
        showNotification('✅ ' + window.creditSelectedIds.length + ' crédit(s) supprimé(s)', 'success');
        window.creditSelectedIds = [];
        window.creditSelectionMode = false;
        window.selectAllBtnState = false;
        
        var selectBtn = document.getElementById('toggleSelectionBtn');
        var deleteBtn = document.getElementById('deleteSelectedBtn');
        var selectAllBtn = document.getElementById('selectAllBtn');
        
        if (selectBtn) selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (selectAllBtn) {
            selectAllBtn.style.display = 'none';
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
            selectAllBtn.style.background = '#4f46e5';
        }
        
        loadCreditsData();
    }).catch(function(error) {
        console.error('Erreur lors de la suppression multiple:', error);
        showNotification('❌ Erreur lors de la suppression', 'error');
    });
}

// ========== FONCTIONS DE RECHERCHE ==========
function handleCreditsSearch(value) {
    window.creditsSearch = value;
    window.currentPages.credits = 1;
    
    var clearBtn = document.getElementById('creditsClearSearch');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !value);
    }
    
    applyCreditsFilters();
}

function clearCreditsSearch() {
    var searchField = document.getElementById('creditsSearchInput');
    if (searchField) {
        searchField.value = '';
        window.creditsSearch = '';
        
        var clearBtn = document.getElementById('creditsClearSearch');
        if (clearBtn) {
            clearBtn.classList.add('hidden');
        }
        
        applyCreditsFilters();
    }
}

function processCreditsSearchFromVoice(text) {
    var searchField = document.getElementById('creditsSearchInput');
    var periodSelect = document.getElementById('periodFilter');
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

        var clearBtn = document.getElementById('creditsClearSearch');
        if (clearBtn) clearBtn.classList.add('hidden');

        return;
    }

    searchField.value = text;
    window.creditsSearch = text;
    window.currentPages.credits = 1;
    applyCreditsFilters();
}

// ========== CHARGER LES DONNÉES ==========
function loadCreditsData() {
    db.collection('credits')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()
        .then(function(snapshot) {
            window.allCreditsData = [];
            snapshot.forEach(function(doc) {
                var credit = doc.data();
                credit.id = doc.id;
                window.allCreditsData.push(credit);
            });

            console.log('📋 Crédits chargés:', window.allCreditsData.length);

            renderDynamicCreditStats(window.allCreditsData, window.creditsSearch, window.creditsPeriod);
            applyCreditsFilters();
        })
        .catch(function(error) {
            console.error('Erreur lors du chargement des crédits:', error);
            showNotification('❌ Erreur lors du chargement des données', 'error');
        });
}

// ========== CHARGEMENT EN TEMPS RÉEL ==========
function setupRealtimeCredits() {
    if (window.creditsListener) {
        window.creditsListener();
        window.creditsListener = null;
    }

    window.creditsListener = db.collection('credits')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .onSnapshot(function(snapshot) {
            var data = [];
            snapshot.forEach(function(doc) {
                var credit = doc.data();
                credit.id = doc.id;
                data.push(credit);
            });

            window.allCreditsData = data;

            renderDynamicCreditStats(window.allCreditsData, window.creditsSearch, window.creditsPeriod);
            applyCreditsFilters();

            console.log('🔄 Crédits mis à jour en temps réel:', data.length);
        }, function(error) {
            console.error('Erreur du listener:', error);
        });
}

// ========== GESTIONNAIRE D'ÉVÉNEMENTS ==========
function setupCreditsEvents() {
    var periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            window.creditsPeriod = this.value;
            window.currentPages.credits = 1;
            applyCreditsFilters();
        });
    }

    var searchInput = document.getElementById('creditsSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleCreditsSearch(this.value);
        });
    }

    var clearBtn = document.getElementById('creditsClearSearch');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCreditsSearch);
    }
}

// ========== STYLES CSS ==========
function injectCreditsStyles() {
    const styleId = 'credits-pro-styles-complete';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        <style id="${styleId}">
            #creditsPage,
            #creditsPage * {
                font-size: 22px !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
            
            #creditsPage .stat-label,
            #creditsPage .filter-group label,
            #creditsPage .total-label {
                font-size: 16px !important;
            }
            
            #creditsPage .btn-add,
            #creditsPage .btn-edit,
            #creditsPage .btn-delete,
            #creditsPage .btn-save,
            #creditsPage .btn-cancel {
                font-size: 18px !important;
            }
            
            #creditsPage .status-success,
            #creditsPage .status-warning,
            #creditsPage .status-danger {
                font-size: 18px !important;
                padding: 6px 16px !important;
                border-radius: 20px !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                font-weight: 600 !important;
            }
            
            #creditsPage .status-success {
                background: #dcfce7 !important;
                color: #166534 !important;
            }
            
            #creditsPage .status-warning {
                background: #fef3c7 !important;
                color: #92400e !important;
            }
            
            #creditsPage .status-danger {
                background: #fee2e2 !important;
                color: #991b1b !important;
            }
            
            #creditStatsContainer {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 14px;
                margin-bottom: 16px;
                padding: 14px 18px;
                background: #f8fafc;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
            }
            
            #creditStatsContainer .stat-card {
                background: #fff;
                padding: 16px 20px;
                border-radius: 10px;
                border-left: 4px solid #2563eb;
                transition: transform 0.2s;
            }
            
            #creditStatsContainer .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            
            #creditStatsContainer .stat-label {
                font-size: 24px !important;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            #creditStatsContainer .stat-value {
                font-size: 40px !important;
                font-weight: 800;
                color: #111827;
            }
            
            .voice-display-field {
                padding: 8px 12px !important;
                border: 2px solid #16a34a !important;
                border-radius: 8px !important;
                width: 180px !important;
                background: #f0fdf4 !important;
                color: #14532d !important;
                font-weight: 600 !important;
                font-size: 22px !important;
                min-height: 48px !important;
            }
            
            .facture-cell {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 800;
                font-size: 22px !important;
                padding: 4px 12px;
                border-radius: 8px;
                border-left: 3px solid #2563eb;
                background: #f8fafc;
            }
            
            .facture-cell i {
                color: #2563eb;
                font-size: 20px !important;
            }
            
            .facture-cell .facture-number {
                font-weight: 900;
                font-size: 22px !important;
                background: #fff;
                padding: 0 10px;
                border-radius: 4px;
            }
            
            .date-cell {
                display: flex;
                flex-direction: column;
                gap: 2px;
                padding: 2px 0;
            }
            
            .date-cell .date-line,
            .date-cell .time-line {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 20px !important;
                color: #64748b;
                font-weight: 500;
            }
            
            .date-cell .date-line i,
            .date-cell .time-line i {
                font-size: 16px !important;
                color: #2563eb;
                opacity: 0.7;
                width: 18px;
            }
            
            .client-cell {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                font-size: 22px !important;
                background: rgba(20, 184, 166, 0.05);
                padding: 4px 12px;
                border-radius: 8px;
            }
            
            .client-cell i {
                color: #14b8a6;
                font-size: 20px !important;
            }
            
            #creditsPage .data-table {
                font-size: 22px !important;
                border-collapse: separate;
                border-spacing: 0 4px;
                width: 100%;
            }
            
            #creditsPage .data-table thead th {
                font-size: 18px !important;
                padding: 14px 18px !important;
                background: #f8fafc !important;
                color: #64748b !important;
                font-weight: 700 !important;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                border-bottom: 2px solid #e2e8f0;
                position: sticky;
                top: 0;
                z-index: 2;
                white-space: nowrap;
                cursor: pointer;
                user-select: none;
            }
            
            #creditsPage .data-table thead th:hover {
                background: #f1f5f9 !important;
            }
            
            #creditsPage .data-table thead th i {
                font-size: 16px !important;
                margin-right: 6px;
            }
            
            #creditsPage .data-table thead th .sort-icon {
                font-size: 14px !important;
                margin-left: 4px;
                opacity: 0.5;
            }
            
            #creditsPage .data-table tbody td {
                padding: 14px 16px !important;
                font-size: 22px !important;
                vertical-align: middle;
                background: #fff;
                border-bottom: 1px solid #f1f5f9;
            }
            
            #creditsPage .data-table tbody tr:hover td {
                background: #f8fafc;
            }
            
            #creditsPage .data-table tbody tr.selected td {
                background: #fef3c7 !important;
                border-left: 4px solid #d97706;
            }
            
            .amount-total {
                font-weight: 800 !important;
                font-size: 24px !important;
                color: #111827 !important;
                letter-spacing: -0.3px;
            }
            
            .amount-remaining {
                font-weight: 800 !important;
                font-size: 24px !important;
                color: #dc2626 !important;
                letter-spacing: -0.3px;
            }
            
            .amount-remaining.paid {
                color: #16a34a !important;
            }
            
            .search-bar-pro {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #fff;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 4px 4px 4px 18px;
                flex: 1;
                min-width: 220px;
                position: relative;
            }
            
            .search-bar-pro:focus-within {
                border-color: #111827;
                box-shadow: 0 0 0 4px rgba(0,0,0,0.04);
            }
            
            .search-bar-pro i.fa-search {
                color: #94a3b8;
                font-size: 20px !important;
            }
            
            .search-bar-pro input {
                flex: 1;
                border: none;
                background: transparent;
                padding: 14px 8px;
                font-size: 22px !important;
                font-family: 'Inter', sans-serif;
                outline: none;
                color: #111827;
                min-width: 100px;
            }
            
            .search-bar-pro input::placeholder {
                color: #94a3b8;
                font-weight: 400;
                font-size: 20px !important;
            }
            
            .search-clear-btn {
                width: 35px !important;
                height: 35px !important;
                min-width: 35px !important;
                border-radius: 50% !important;
                border: none !important;
                background: #e2e8f0 !important;
                color: #64748b !important;
                font-size: 18px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                margin: 0 2px !important;
            }
            
            .search-clear-btn:hover {
                background: #cbd5e1 !important;
                color: #111827 !important;
                transform: scale(1.05);
            }
            
            .search-clear-btn.hidden {
                display: none !important;
            }
            
            #creditsPage .action-buttons {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                flex-wrap: nowrap !important;
                min-width: 180px !important;
            }
            
            #creditsPage .action-buttons .btn-edit,
            #creditsPage .action-buttons .btn-delete,
            #creditsPage .action-buttons .btn-add {
                width: 44px !important;
                height: 44px !important;
                min-width: 44px !important;
                min-height: 44px !important;
                border-radius: 10px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                font-size: 18px !important;
                transition: all 0.2s ease !important;
                border: none !important;
                background: #f8fafc !important;
                color: #64748b !important;
                cursor: pointer !important;
                flex-shrink: 0 !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            }
            
            #creditsPage .action-buttons .btn-edit i,
            #creditsPage .action-buttons .btn-delete i,
            #creditsPage .action-buttons .btn-add i {
                font-size: 20px !important;
                pointer-events: none !important;
                line-height: 1 !important;
            }
            
            #creditsPage .action-buttons .btn-edit:hover {
                background: #e2e8f0 !important;
                color: #111827 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
            }
            
            #creditsPage .action-buttons .btn-delete {
                color: #ef4444 !important;
                background: rgba(239, 68, 68, 0.08) !important;
            }
            
            #creditsPage .action-buttons .btn-delete:hover {
                background: rgba(239, 68, 68, 0.15) !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
            }
            
            #creditsPage .action-buttons .btn-add {
                background: #111827 !important;
                color: #fff !important;
            }
            
            #creditsPage .action-buttons .btn-add:hover {
                background: #1f2937 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            }
            
            #creditsPage .action-buttons .btn-add.payer-btn {
                background: #10B981 !important;
                color: #fff !important;
                font-size: 14px !important;
                padding: 0 12px !important;
                width: auto !important;
                min-width: 60px !important;
                border-radius: 8px !important;
                gap: 4px !important;
            }
            
            #creditsPage .action-buttons .btn-add.payer-btn:hover {
                background: #059669 !important;
                transform: translateY(-2px) !important;
            }
            
            #creditsPage .action-buttons .btn-add.payer-btn i {
                font-size: 14px !important;
            }
            
            #creditsPage .filters-container {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
                margin-bottom: 16px;
                padding: 12px 16px;
                background: #fff;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
            }
            
            #creditsPage .filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            #creditsPage .filter-group label {
                font-size: 16px !important;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            #creditsPage .filter-group select {
                padding: 10px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 20px !important;
                font-family: 'Inter', sans-serif;
                background: #fff;
                color: #111827;
                min-width: 140px;
            }
            
            #creditsPage .filter-group select:focus {
                border-color: #111827;
                outline: none;
                box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
            }
            
            #creditsPage .btn-add-credit {
                background: #111827 !important;
                color: #fff !important;
                padding: 12px 24px !important;
                border-radius: 10px !important;
                border: none !important;
                font-size: 20px !important;
                font-weight: 700 !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                margin-left: auto !important;
            }
            
            #creditsPage .btn-add-credit:hover {
                background: #1f2937 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            }
            
            #creditsPage .btn-add-credit i {
                font-size: 22px !important;
            }
            
            #creditsPage .selection-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            #creditsPage .selection-buttons .btn-select {
                padding: 10px 16px !important;
                border-radius: 10px !important;
                border: none !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
            }
            
            #creditsPage .selection-buttons .btn-select-primary {
                background: #4f46e5 !important;
                color: #fff !important;
            }
            
            #creditsPage .selection-buttons .btn-select-primary:hover {
                background: #4338ca !important;
                transform: translateY(-2px) !important;
            }
            
            #creditsPage .selection-buttons .btn-select-danger {
                background: #fee2e2 !important;
                color: #b91c1c !important;
            }
            
            #creditsPage .selection-buttons .btn-select-danger:hover {
                background: #fecaca !important;
                transform: translateY(-2px) !important;
            }
            
            #creditsPage .total-row-pro {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 32px;
                padding: 18px 24px;
                background: #fef2f2;
                border-radius: 14px;
                margin-top: 18px;
                border: 1px solid #fecaca;
                flex-wrap: wrap;
            }
            
            #creditsPage .total-row-pro .total-label {
                font-size: 16px !important;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            #creditsPage .total-row-pro .total-amount {
                font-size: 28px !important;
                font-weight: 900;
                color: #dc2626;
                letter-spacing: -0.5px;
            }
            
            #creditsPage .total-row-pro .total-amount i {
                color: #dc2626;
                font-size: 22px !important;
                margin-right: 6px;
            }
            
            .credits-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .credits-modal {
                background: #fff;
                border-radius: 16px;
                padding: 32px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .credits-modal h2 {
                font-size: 26px !important;
                font-weight: 800;
                color: #111827;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .credits-modal h2 i {
                color: #14b8a6;
            }
            
            .credits-modal .form-group {
                margin-bottom: 16px;
            }
            
            .credits-modal .form-group label {
                display: block;
                font-size: 16px !important;
                font-weight: 600;
                color: #64748b;
                margin-bottom: 6px;
            }
            
            .credits-modal .form-group input,
            .credits-modal .form-group select,
            .credits-modal .form-group textarea {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 20px !important;
                font-family: 'Inter', sans-serif;
                background: #fff;
                color: #111827;
            }
            
            .credits-modal .form-group input:focus,
            .credits-modal .form-group select:focus,
            .credits-modal .form-group textarea:focus {
                border-color: #111827;
                outline: none;
                box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
            }
            
            .credits-modal .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
            }
            
            .credits-modal .modal-actions button {
                padding: 12px 24px;
                border-radius: 10px;
                border: none;
                font-size: 18px !important;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .credits-modal .modal-actions .btn-cancel {
                background: #f1f5f9;
                color: #64748b;
            }
            
            .credits-modal .modal-actions .btn-cancel:hover {
                background: #e2e8f0;
            }
            
            .credits-modal .modal-actions .btn-submit {
                background: #111827;
                color: #fff;
            }
            
            .credits-modal .modal-actions .btn-submit:hover {
                background: #1f2937;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            @media(max-width:1024px) {
                #creditsPage .action-buttons {
                    min-width: 140px !important;
                    gap: 4px !important;
                }
                
                #creditsPage .action-buttons .btn-edit,
                #creditsPage .action-buttons .btn-delete,
                #creditsPage .action-buttons .btn-add {
                    width: 38px !important;
                    height: 38px !important;
                    min-width: 38px !important;
                    min-height: 38px !important;
                    font-size: 16px !important;
                }
                
                #creditsPage .action-buttons .btn-add.payer-btn {
                    min-width: 50px !important;
                    font-size: 12px !important;
                    padding: 0 10px !important;
                }
                
                #creditStatsContainer {
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
                    gap: 12px !important;
                    padding: 12px 14px !important;
                }
                
                #creditStatsContainer .stat-value {
                    font-size: 32px !important;
                }
                
                #creditStatsContainer .stat-label {
                    font-size: 20px !important;
                }
            }
            
            @media(max-width:768px) {
                #creditsPage .data-table tbody td {
                    font-size: 18px !important;
                    padding: 10px 12px !important;
                }
                
                .facture-cell {
                    font-size: 18px !important;
                    padding: 2px 8px !important;
                }
                
                .facture-cell .facture-number {
                    font-size: 18px !important;
                }
                
                .date-cell .date-line,
                .date-cell .time-line {
                    font-size: 16px !important;
                }
                
                .client-cell {
                    font-size: 18px !important;
                    padding: 2px 8px !important;
                }
                
                .search-bar-pro input {
                    font-size: 18px !important;
                }
                
                .search-clear-btn {
                    width: 32px !important;
                    height: 32px !important;
                    min-width: 32px !important;
                    font-size: 16px !important;
                }
                
                .voice-display-field {
                    font-size: 18px !important;
                    width: 140px !important;
                }
                
                #creditsPage .action-buttons {
                    min-width: 120px !important;
                    gap: 4px !important;
                }
                
                #creditsPage .action-buttons .btn-edit,
                #creditsPage .action-buttons .btn-delete,
                #creditsPage .action-buttons .btn-add {
                    width: 34px !important;
                    height: 34px !important;
                    min-width: 34px !important;
                    min-height: 34px !important;
                    font-size: 14px !important;
                    border-radius: 8px !important;
                }
                
                #creditsPage .action-buttons .btn-edit i,
                #creditsPage .action-buttons .btn-delete i,
                #creditsPage .action-buttons .btn-add i {
                    font-size: 16px !important;
                }
                
                #creditStatsContainer {
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
                    gap: 10px !important;
                    padding: 10px 12px !important;
                }
                
                #creditStatsContainer .stat-value {
                    font-size: 28px !important;
                }
                
                #creditStatsContainer .stat-label {
                    font-size: 18px !important;
                }
            }
            
            @media(max-width:500px) {
                #creditsPage .data-table tbody td {
                    font-size: 15px !important;
                    padding: 8px 10px !important;
                }
                
                .facture-cell {
                    font-size: 15px !important;
                    padding: 2px 6px !important;
                }
                
                .facture-cell .facture-number {
                    font-size: 15px !important;
                }
                
                .date-cell .date-line,
                .date-cell .time-line {
                    font-size: 13px !important;
                    gap: 4px !important;
                }
                
                .date-cell .date-line i,
                .date-cell .time-line i {
                    font-size: 12px !important;
                    width: 14px !important;
                }
                
                .client-cell {
                    font-size: 15px !important;
                    padding: 2px 6px !important;
                }
                
                .search-bar-pro input {
                    font-size: 15px !important;
                    padding: 10px 6px !important;
                }
                
                .search-clear-btn {
                    width: 28px !important;
                    height: 28px !important;
                    min-width: 28px !important;
                    font-size: 14px !important;
                }
                
                #creditsPage .filter-group select {
                    font-size: 16px !important;
                    padding: 8px 12px !important;
                }
                
                .voice-display-field {
                    font-size: 15px !important;
                    width: 100px !important;
                    padding: 6px 8px !important;
                }
                
                #creditsPage .action-buttons {
                    min-width: 90px !important;
                    gap: 2px !important;
                }
                
                #creditsPage .action-buttons .btn-edit,
                #creditsPage .action-buttons .btn-delete,
                #creditsPage .action-buttons .btn-add {
                    width: 28px !important;
                    height: 28px !important;
                    min-width: 28px !important;
                    min-height: 28px !important;
                    font-size: 12px !important;
                    border-radius: 6px !important;
                }
                
                #creditsPage .action-buttons .btn-add.payer-btn {
                    min-width: 40px !important;
                    font-size: 10px !important;
                    padding: 0 6px !important;
                    height: 28px !important;
                }
                
                #creditsPage .action-buttons .btn-edit i,
                #creditsPage .action-buttons .btn-delete i,
                #creditsPage .action-buttons .btn-add i {
                    font-size: 12px !important;
                }
                
                #creditStatsContainer {
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 8px !important;
                    padding: 8px 10px !important;
                }
                
                #creditStatsContainer .stat-value {
                    font-size: 24px !important;
                }
                
                #creditStatsContainer .stat-label {
                    font-size: 16px !important;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(40px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
}

// ========== INITIALISATION DE LA PAGE ==========
function loadCreditsPage(container) {
    injectCreditsStyles();
    
    loadClientsForSearchCredits();

    window.creditsPeriod = 'all';
    window.creditsSearch = '';
    window.creditSelectionMode = false;
    window.creditSelectedIds = [];

    if (!window.sortOrders) window.sortOrders = {};
    if (!window.sortOrders.credits) window.sortOrders.credits = {};
    if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';

    container.innerHTML = `
        <div class="content-card" id="creditsPage">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                <h3 style="font-size:26px !important;"><i class="fas fa-credit-card"></i> Gestion des Crédits</h3>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="creditsSearchInput" 
                               placeholder="🔍 Rechercher un client ou un produit..." 
                               value="${window.creditsSearch || ''}">
                        <button class="search-clear-btn ${window.creditsSearch ? '' : 'hidden'}" id="creditsClearSearch" title="Effacer la recherche">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="filter-group">
                        <label><i class="far fa-calendar-alt"></i> Période</label>
                        <select id="periodFilter">
                            <option value="all">📅 Toutes</option>
                            <option value="today">📆 Aujourd'hui</option>
                            <option value="week">📊 Cette semaine</option>
                            <option value="month">📈 Ce mois</option>
                            <option value="year">📉 Cette année</option>
                        </select>
                    </div>
                    <button class="btn-add-credit" onclick="openCreditModal(null)">
                        <i class="fas fa-plus"></i> Nouveau crédit
                    </button>
                    <button id="toggleSelectionBtn" class="btn-select btn-select-primary" onclick="toggleCreditSelectionMode()">
                        <i class="fas fa-check-square"></i> Sélectionner
                    </button>
                    <button id="selectAllBtn" class="btn-select btn-select-primary" onclick="toggleSelectAllVisible()" style="display:none;">
                        <i class="fas fa-check-double"></i> Tout sélectionner
                    </button>
                    <button id="deleteSelectedBtn" class="btn-select btn-select-danger" onclick="deleteSelectedCredits()" style="display:none;">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
            <div id="creditsTableContainer"></div>
            <div id="creditsPagination" style="margin-top:12px;"></div>
        </div>
    `;

    var periodSelect = document.getElementById('periodFilter');
    if (periodSelect) {
        periodSelect.value = window.creditsPeriod || 'all';
    }

    setupCreditsEvents();
    loadCreditsData();
    setupRealtimeCredits();
}

// ========== EXPORTS ==========
window.loadCreditsPage = loadCreditsPage;
window.loadCreditsData = loadCreditsData;
window.applyCreditsFilters = applyCreditsFilters;
window.renderCreditsTablePro = renderCreditsTablePro;
window.renderDynamicCreditStats = renderDynamicCreditStats;
window.filterDataForStats = filterDataForStats;
window.handleCreditsSearch = handleCreditsSearch;
window.clearCreditsSearch = clearCreditsSearch;
window.processCreditsSearchFromVoice = processCreditsSearchFromVoice;
window.detectPeriodFilterCredits = detectPeriodFilterCredits;
window.loadClientsForSearchCredits = loadClientsForSearchCredits;
window.filterCreditsBySearchWithDescription = filterCreditsBySearchWithDescription;
window.injectCreditsStyles = injectCreditsStyles;
window.renderCreditFactureCell = renderCreditFactureCell;
window.renderCreditDateCell = renderCreditDateCell;
window.renderCreditClientCell = renderCreditClientCell;
window.openCreditModal = openCreditModal;
window.closeCreditModal = closeCreditModal;
window.saveCredit = saveCredit;
window.editCredit = editCredit;
window.deleteCredit = deleteCredit;
window.payCredit = payCredit;
window.payerCredit = payerCredit;
window.printFacture = printFacture;
window.imprimerFactureCredit = imprimerFactureCredit;
window.toggleCreditSelectionMode = toggleCreditSelectionMode;
window.toggleCreditSelection = toggleCreditSelection;
window.deleteSelectedCredits = deleteSelectedCredits;
window.updateDeleteButtonVisibility = updateDeleteButtonVisibility;
window.toggleSelectAllVisible = toggleSelectAllVisible;
window.goToPage = goToPage;
window.toggleSort = toggleSort;
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.getStatusBadge = getStatusBadge;
window.getPeriodLabel = getPeriodLabel;
window.setupCreditsEvents = setupCreditsEvents;
window.setupRealtimeCredits = setupRealtimeCredits;

console.log('🛒 Mixmax Minimarket - Admin Credits PRO (Statistiques 24px) chargé ✅');
console.log('📊 Les statistiques sont en 24px et se mettent à jour dynamiquement');
