// ==================== ADMIN-CREDITS.JS - MIXMAX MINIMARKET ====================
// Gestion des crédits – Complet, sans erreur

window.creditsPeriod = window.creditsPeriod || 'all';
window.creditsSearch = window.creditsSearch || '';
window.creditSelectionMode = false;
window.creditSelectedIds = [];
window.allCreditsData = window.allCreditsData || [];

// Index pour la recherche dans la description des clients
window.clientDescriptionIndex = {};
window.clientDescriptionWordIndex = {};

function normalize(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function loadCreditsPage(c) {
    window.creditsPeriod = 'all';
    window.creditsSearch = '';
    window.creditSelectionMode = false;
    window.creditSelectedIds = [];

    if (!window.sortOrders.credits) window.sortOrders.credits = {};
    if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';

    // Chargement des clients
    if (!window.posAllClients || window.posAllClients.length === 0) {
        const cachedClients = await CacheDB.getAll('clients');
        if (cachedClients.length) {
            window.posAllClients = cachedClients.map(c => ({
                id: c.id,
                nom: c.nom || '',
                prenom: c.prenom || '',
                telephone: c.telephone || '',
                description: c.description || ''
            }));
        }
        if (navigator.onLine) {
            try {
                const snap = await db.collection('clients').limit(500).get();
                window.posAllClients = [];
                snap.forEach(function(d) {
                    var data = d.data();
                    window.posAllClients.push({
                        id: d.id,
                        nom: data.nom || '',
                        prenom: data.prenom || '',
                        telephone: data.telephone || '',
                        description: data.description || ''
                    });
                });
                for (let c of window.posAllClients) {
                    await CacheDB.set('clients', c.id, c);
                }
            } catch(e) {
                console.error('Erreur chargement clients:', e);
            }
        }
    }

    buildClientDescriptionIndex();

    c.innerHTML = '<div class="content-card">' +
        '<div class="card-header">' +
        '<h3><i class="fas fa-credit-card"></i> Crédits</h3>' +
        '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
        '<div style="position:relative;">' +
        '<input type="text" id="creditsSearchInput" placeholder="🔍 Rechercher (client, description)..." style="padding:8px 12px; border:2px solid #e2e8f0; border-radius:8px; width:250px;" onkeyup="searchClientInCreditsDropdown(this.value)" onfocus="searchClientInCreditsDropdown(this.value)" autocomplete="off">' +
        '<div id="creditsClientDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #e2e8f0;border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:50;box-shadow:0 5px 15px rgba(0,0,0,0.1);"></div>' +
        '</div>' +
        '<input type="text" id="creditsVoiceDisplay" placeholder="🎤 Audio..." style="padding:8px 12px; border:2px solid #16a34a; border-radius:8px; width:180px; background:#f0fdf4; color:#14532d; font-weight:600;" readonly>' +
        '<select id="creditsPeriodSelect" style="padding:8px 12px; border:2px solid #e2e8f0; border-radius:8px;" onchange="window.creditsPeriod = this.value; window.currentPages.credits=1; applyCreditsFilters();">' + getPeriodOptions('all') + '</select>' +
        '<button class="btn-add" onclick="loadCredits()"><i class="fas fa-sync"></i> Actualiser</button>' +
        '<button id="toggleSelectionBtn" class="btn-add" onclick="toggleCreditSelectionMode()"><i class="fas fa-check-square"></i> Sélectionner</button>' +
        '<button id="selectAllBtn" class="btn-add" onclick="toggleSelectAllVisible()" style="display:none; background:#4f46e5;"><i class="fas fa-check-double"></i> Tout sélectionner</button>' +
        '<button id="deleteSelectedBtn" class="btn-delete" onclick="deleteSelectedCredits()" style="display:none; background:#fee2e2; color:#b91c1c;"><i class="fas fa-trash"></i> Supprimer sélection</button>' +
        '</div></div>' +
        '<div id="creditsTableContainer"></div>' +
        '<div id="creditsPagination" style="margin-top:10px;"></div>' +
        '</div>';

    loadCredits();
}

function buildClientDescriptionIndex() {
    window.clientDescriptionIndex = {};
    window.clientDescriptionWordIndex = {};
    if (window.posAllClients && window.posAllClients.length) {
        window.posAllClients.forEach(c => {
            if (c.id && c.description) {
                window.clientDescriptionIndex[c.id] = c.description.toLowerCase().trim();
            }
        });
        window.posAllClients.forEach(c => {
            if (c.description) {
                var desc = c.description.toLowerCase().trim();
                desc.split(/[\s,;.]+/).forEach(word => {
                    if (word.length >= 2) {
                        if (!window.clientDescriptionWordIndex[word]) {
                            window.clientDescriptionWordIndex[word] = [];
                        }
                        if (!window.clientDescriptionWordIndex[word].includes(c.id)) {
                            window.clientDescriptionWordIndex[word].push(c.id);
                        }
                    }
                });
            }
        });
    }
}

async function loadCredits() {
    var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
    var vendeurCaissier = '';
    if (!isAdmin && window.currentUserData) {
        vendeurCaissier = window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom;
    }

    // 1. Cache
    const cached = await CacheDB.getAll('credits');
    if (cached.length) {
        window.allCreditsData = cached;
        if (!isAdmin) {
            window.allCreditsData = window.allCreditsData.filter(function(d) {
                return d.vendeur === vendeurCaissier;
            });
        }
        if (!window.sortOrders.credits) window.sortOrders.credits = {};
        if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';
        window.currentPages.credits = 1;
        applyCreditsFilters();
    }

    // 2. En ligne
    if (navigator.onLine) {
        try {
            const snapshot = await db.collection('credits').orderBy('createdAt', 'desc').limit(2000).get();
            window.allCreditsData = [];
            snapshot.forEach(function(dc) {
                var d = dc.data();
                d.id = dc.id;
                window.allCreditsData.push(d);
            });

            if (!isAdmin) {
                window.allCreditsData = window.allCreditsData.filter(function(d) {
                    return d.vendeur === vendeurCaissier;
                });
            }

            for (let doc of window.allCreditsData) {
                await CacheDB.set('credits', doc.id, doc);
            }

            if (!window.sortOrders.credits) window.sortOrders.credits = {};
            if (!window.sortOrders.credits.createdAt) window.sortOrders.credits.createdAt = 'desc';
        } catch (e) {
            console.error('Erreur chargement crédits:', e);
        }
    }

    window.currentPages.credits = 1;
    applyCreditsFilters();
}

function applyCreditsFilters() {
    var filtered = filterByPeriod(window.allCreditsData, window.creditsPeriod);

    if (window.creditsSearch && window.creditsSearch.trim() !== '') {
        var q = normalize(window.creditsSearch.trim());
        filtered = filtered.filter(function(credit) {
            var creditName = normalize(credit.clientName || '');
            var creditDesc = normalize(credit.description || '');
            var creditTable = normalize(credit.table || '');
            if (creditName.indexOf(q) !== -1 || creditDesc.indexOf(q) !== -1 || creditTable.indexOf(q) !== -1) {
                return true;
            }

            var clientId = credit.clientId;
            if (clientId && window.clientDescriptionIndex && window.clientDescriptionIndex[clientId]) {
                if (normalize(window.clientDescriptionIndex[clientId]).indexOf(q) !== -1) {
                    return true;
                }
            }

            if (clientId && window.clientDescriptionWordIndex && window.clientDescriptionWordIndex[q]) {
                if (window.clientDescriptionWordIndex[q].includes(clientId)) {
                    return true;
                }
            }

            if (!clientId && credit.clientName && window.posAllClients) {
                var matchingClient = window.posAllClients.find(c => {
                    var full = (c.nom + ' ' + c.prenom).toLowerCase().trim();
                    return full === normalize(credit.clientName);
                });
                if (matchingClient && normalize(matchingClient.description || '').indexOf(q) !== -1) {
                    return true;
                }
            }

            return false;
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
    renderCreditsTable();
}

function renderCreditsTable() {
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

    var pageData = getPageData('credits', data);

    if (pageData.length === 0) {
        cont.innerHTML = '<p style="text-align:center;padding:40px;">Aucun crédit trouvé</p>';
        document.getElementById('creditsPagination').innerHTML = '';
        return;
    }

    var tc = 0;
    var h = '<div class="table-container"><table class="data-table" style="font-size:0.55rem;"><thead><tr>' +
        makeSortableHeader('credits', 'factureNum', 'Facture', 'renderCreditsTable') +
        makeSortableHeader('credits', 'createdAt', 'Date', 'renderCreditsTable') +
        makeSortableHeader('credits', 'clientName', 'Client', 'renderCreditsTable') +
        '<th>Articles</th>' +
        makeSortableHeader('credits', 'total', 'Total', 'renderCreditsTable') +
        makeSortableHeader('credits', 'amountGiven', 'Payé', 'renderCreditsTable') +
        makeSortableHeader('credits', 'remainingAmount', 'Restant', 'renderCreditsTable') +
        makeSortableHeader('credits', 'paymentMethod', 'Mode', 'renderCreditsTable') +
        makeSortableHeader('credits', 'vendeur', 'Vendeur', 'renderCreditsTable') +
        '<th>Actions</th>';

    if (window.creditSelectionMode) {
        h += '<th style="width:40px;">☑️</th>';
    }
    h += '</thead><tbody>';

    pageData.forEach(function(d, index) {
        var reste = d.remainingAmount || d.total || 0;
        if (!d.paid) tc += reste;

        var dt = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString('fr-FR') : '';
        var amountPaid = d.amountGiven || 0;
        var mode = d.paymentMethod || '-';

        var articlesHtml = '';
        if (d.items && d.items.length > 0) {
            articlesHtml = d.items.map(function(it) {
                return '<strong>' + (it.quantite || 1) + 'x</strong> ' + escapeHtml(it.nom || '');
            }).join('<br>');
        } else {
            articlesHtml = '-';
        }

        var actions = '<button class="btn-edit" onclick="printFacture(\'' + d.id + '\')"><i class="fas fa-print"></i></button> ';
        if (!d.paid) {
            actions += '<button class="btn-add" style="padding:4px 8px;font-size:0.65rem;" onclick="payerCredit(\'' + d.id + '\')">Payer</button> ';
        }

        var isAdmin = window.currentUserData && window.currentUserData.userData.role === 'admin';
        if (isAdmin) {
            actions += '<button class="btn-edit" onclick="editCredit(\'' + d.id + '\')"><i class="fas fa-edit"></i></button> ';
            if (!window.creditSelectionMode) {
                actions += '<button class="btn-delete" onclick="if(confirm(\'Supprimer définitivement ce crédit ?\')) deleteCredit(\'' + d.id + '\')"><i class="fas fa-trash"></i></button>';
            }
        }

        var isSelected = window.creditSelectedIds.includes(d.id);
        var rowClass = isSelected ? ' style="background:#fef3c7; border-left:4px solid #d97706;"' : '';

        h += '<tr' + rowClass + '>' +
            '<td>' + (d.factureNum || d.id.substring(0, 8)) + '</td>' +
            '<td>' + dt + '</td>' +
            '<td>' + escapeHtml(d.clientName || d.table || '-') + '</td>' +
            '<td><small>' + articlesHtml + '</small></td>' +
            '<td>' + d.total.toFixed(2) + '</td>' +
            '<td>' + amountPaid.toFixed(2) + '</td>' +
            '<td style="color:#ef4444;"><strong>' + reste.toFixed(2) + '</strong></td>' +
            '<td>' + mode + '</td>' +
            '<td>' + escapeHtml(d.vendeur || '-') + '</td>' +
            '<td>' + actions + '</td>';

        if (window.creditSelectionMode) {
            var checked = isSelected ? 'checked' : '';
            h += '<td><input type="checkbox" class="credit-select-check" data-id="' + d.id + '" ' + checked + ' onchange="toggleCreditSelection(\'' + d.id + '\')"></td>';
        }
        h += '</tr>';
    });

    h += '</tbody></table></div>';
    h += '<div style="margin-top:15px;padding:15px;background:#fef2f2;border-radius:12px;text-align:center;">' +
        '<strong>Impayés: ' + tc.toFixed(2) + ' MAD</strong></div>';

    cont.innerHTML = h;
    document.getElementById('creditsPagination').innerHTML = getPaginationHTML('credits', data.length);
}

// ---------- SÉLECTION MULTIPLE ----------
function toggleCreditSelectionMode() {
    window.creditSelectionMode = !window.creditSelectionMode;
    window.creditSelectedIds = [];
    var selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout sélectionner';
        selectAllBtn.style.background = '#4f46e5';
    }
    window.selectAllBtnState = false;

    var selectBtn = document.getElementById('toggleSelectionBtn');
    var deleteBtn = document.getElementById('deleteSelectedBtn');
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
    renderCreditsTable();
}

function toggleCreditSelection(id) {
    var idx = window.creditSelectedIds.indexOf(id);
    if (idx === -1) {
        window.creditSelectedIds.push(id);
    } else {
        window.creditSelectedIds.splice(idx, 1);
    }
    updateDeleteButtonVisibility();
    renderCreditsTable();
}

function updateDeleteButtonVisibility() {
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        if (window.creditSelectedIds.length === 0) {
            deleteBtn.style.display = 'none';
        } else {
            deleteBtn.style.display = 'inline-block';
        }
    }
}

// ---------- TOUT SÉLECTIONNER / DÉCOCHER ----------
window.selectAllBtnState = false;

function selectAllVisibleCredits() {
    var data = window.filteredCredits || window.allCreditsData;
    var pageData = getPageData('credits', data);
    window.creditSelectedIds = pageData.map(function(d) { return d.id; });
    updateDeleteButtonVisibility();
    renderCreditsTable();
}

function deselectAllVisibleCredits() {
    window.creditSelectedIds = [];
    updateDeleteButtonVisibility();
    renderCreditsTable();
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
        return db.collection('credits').doc(id).delete().then(function() {
            window.allCreditsData = window.allCreditsData.filter(function(c) { return c.id !== id; });
        });
    });

    Promise.all(promises).then(function() {
        alert('✅ ' + window.creditSelectedIds.length + ' crédit(s) supprimé(s).');
        window.creditSelectedIds = [];
        window.creditSelectionMode = false;
        var selectBtn = document.getElementById('toggleSelectionBtn');
        var deleteBtn = document.getElementById('deleteSelectedBtn');
        var selectAllBtn = document.getElementById('selectAllBtn');
        if (selectBtn) selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (selectAllBtn) selectAllBtn.style.display = 'none';
        loadCredits();
        CacheDB.sync();
    }).catch(function(e) {
        alert('❌ Erreur: ' + e.message);
    });
}

// ---------- PAIEMENT REDIRIGÉ VERS LE POS ----------
async function payerCredit(creditId) {
    var data = window.filteredCredits || window.allCreditsData || [];
    var credit = data.find(function(c) { return c.id === creditId; });
    if (!credit) {
        alert('Crédit introuvable');
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
        window.location.href = '#';
    }
}

// ---------- RECHERCHE CLIENT (DROPDOWN) ----------
function searchClientInCreditsDropdown(query) {
    var q = query.toLowerCase().trim();
    var dropdown = document.getElementById('creditsClientDropdown');

    if (!q || !window.posAllClients) {
        if (dropdown) dropdown.style.display = 'none';
        window.creditsSearch = q;
        window.currentPages.credits = 1;
        applyCreditsFilters();
        return;
    }

    var normalizedQuery = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var results = window.posAllClients.filter(function(c) {
        var nom = (c.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        var prenom = (c.prenom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        var telephone = (c.telephone || '').toLowerCase();
        var description = (c.description || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return nom.indexOf(normalizedQuery) !== -1 || prenom.indexOf(normalizedQuery) !== -1 ||
               telephone.indexOf(q) !== -1 || description.indexOf(normalizedQuery) !== -1;
    });

    if (results.length === 0) {
        if (dropdown) dropdown.style.display = 'none';
        window.creditsSearch = query.trim();
        window.currentPages.credits = 1;
        applyCreditsFilters();
        return;
    }

    if (results.length === 1) {
        var nomComplet = results[0].nom + ' ' + results[0].prenom;
        selectCreditClient(nomComplet);
        return;
    }

    var h = '';
    results.forEach(function(c) {
        var clientNameSafe = (c.nom + ' ' + c.prenom).replace(/'/g, "\\'");
        h += '<div onclick="selectCreditClient(\'' + clientNameSafe + '\')" style="padding:8px;cursor:pointer;border-bottom:1px solid #f1f5f9;">' +
            '<strong>' + escapeHtml(c.nom) + ' ' + escapeHtml(c.prenom) + '</strong>' +
            '<span style="color:#94a3b8;font-size:0.65rem;display:block;">' + escapeHtml(c.description || c.telephone || '') + '</span></div>';
    });

    if (dropdown) {
        dropdown.innerHTML = h;
        dropdown.style.display = 'block';
    }
}

function selectCreditClient(clientName) {
    var searchInput = document.getElementById('creditsSearchInput');
    var dropdown = document.getElementById('creditsClientDropdown');

    if (searchInput) searchInput.value = clientName;
    if (dropdown) dropdown.style.display = 'none';

    window.creditsSearch = clientName;
    window.currentPages.credits = 1;
    applyCreditsFilters();
}

// ---------- ÉDITION ----------
async function editCredit(id) {
    try {
        var doc = await db.collection('credits').doc(id).get();
        if (!doc.exists) {
            alert('Crédit introuvable');
            return;
        }
        var d = doc.data();
        window.editingId = id;
        window.currentCollection = 'credits';

        var h = '<div class="form-row">' +
            '<div class="form-group"><label>Client</label><input type="text" id="editCreditClient" value="' + escapeHtml(d.clientName || '') + '"></div>' +
            '<div class="form-group"><label>Total (MAD)</label><input type="number" id="editCreditTotal" value="' + (d.total || 0) + '" step="0.01"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Payé (MAD)</label><input type="number" id="editCreditPaid" value="' + (d.amountGiven || 0) + '" step="0.01"></div>' +
            '<div class="form-group"><label>Restant (MAD)</label><input type="number" id="editCreditRemaining" value="' + (d.remainingAmount || 0) + '" step="0.01"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Mode de paiement</label><input type="text" id="editCreditMode" value="' + escapeHtml(d.paymentMethod || '') + '"></div>' +
            '<div class="form-group"><label>Statut</label><select id="editCreditStatut"><option value="0" ' + (!d.paid ? 'selected' : '') + '>Impayé</option><option value="1" ' + (d.paid ? 'selected' : '') + '>Payé</option></select></div>' +
            '</div>' +
            '<button class="btn-cancel" onclick="closeModal()">Annuler</button>' +
            '<button class="btn-save" onclick="saveEditCredit()">Enregistrer</button>';

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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await CacheDB.write('credits', window.editingId, data, 'update');
        closeModal();
        loadCredits();
        CacheDB.sync();
        alert('✅ Crédit mis à jour');
    } catch (e) {
        alert('❌ Erreur: ' + e.message);
    }
}

async function deleteCredit(id) {
    try {
        await db.collection('credits').doc(id).delete();
        window.allCreditsData = (window.allCreditsData || []).filter(function(c) { return c.id !== id; });
        if (typeof loadCredits === 'function') loadCredits();
    } catch (e) {
        console.error('Erreur deleteCredit:', e);
        throw e;
    }
}

function closeCreditSelection() {
    window.creditSelectionMode = false;
    window.creditSelectedIds = [];
    var selectBtn = document.getElementById('toggleSelectionBtn');
    var deleteBtn = document.getElementById('deleteSelectedBtn');
    var selectAllBtn = document.getElementById('selectAllBtn');
    if (selectBtn) selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (selectAllBtn) selectAllBtn.style.display = 'none';
    window.creditsSearch = '';
    window.currentPages.credits = 1;
    window.filteredCredits = null;
    applyCreditsFilters();
}

document.addEventListener('click', function(e) {
    var d = document.getElementById('creditsClientDropdown');
    var s = document.getElementById('creditsSearchInput');
    if (d && s && !s.contains(e.target) && !d.contains(e.target)) {
        d.style.display = 'none';
    }
});

// Exports
window.loadCreditsPage = loadCreditsPage;
window.loadCredits = loadCredits;
window.applyCreditsFilters = applyCreditsFilters;
window.renderCreditsTable = renderCreditsTable;
window.selectCreditClient = selectCreditClient;
window.searchClientInCreditsDropdown = searchClientInCreditsDropdown;
window.editCredit = editCredit;
window.deleteCredit = deleteCredit;
window.saveEditCredit = saveEditCredit;
window.normalize = normalize;

window.toggleCreditSelectionMode = toggleCreditSelectionMode;
window.toggleCreditSelection = toggleCreditSelection;
window.deleteSelectedCredits = deleteSelectedCredits;
window.updateDeleteButtonVisibility = updateDeleteButtonVisibility;
window.toggleSelectAllVisible = toggleSelectAllVisible;
window.selectAllVisibleCredits = selectAllVisibleCredits;
window.deselectAllVisibleCredits = deselectAllVisibleCredits;
window.payerCredit = payerCredit;
window.closeCreditSelection = closeCreditSelection;
window.buildClientDescriptionIndex = buildClientDescriptionIndex;

console.log('🛒 Mixmax Minimarket - Admin Credits chargé');
