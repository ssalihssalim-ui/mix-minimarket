// ==================== STATISTIQUES.JS - E-SOLUTION POS ====================
// Version FINALE v4.0 — Filtres avancés + Analytics pro + Stats générales
// ✅ Filtres : Date début/fin, Client, Produit, Catégorie, Vendeur
// ✅ Analytics : RFM, Aging, DSO, Prévisions, Heatmap, Top vendeurs, Alertes
// ✅ Statistiques générales : vue globale all-time

var statsCharts = {};
var statsAdvancedCharts = {};

// ============================================================
// 🎛️ ÉTAT GLOBAL DES FILTRES
// ============================================================
window.statsFilters = window.statsFilters || {
    period: '7',
    dateDebut: '',
    dateFin: '',
    clientId: '',
    clientName: '',
    productName: '',
    category: '',
    vendeur: ''
};

// ============================================================
// 🏠 PAGE PRINCIPALE AVEC FILTRES
// ============================================================
function loadStatistiquesPage(c) {
    if (!window.currentUserData || window.currentUserData.userData.role !== 'admin') {
        c.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#ef4444;"><i class="fas fa-lock" style="font-size:2rem;display:block;margin-bottom:10px;"></i>Accès réservé à l\'administrateur</p></div>';
        return;
    }

    var html = `
    <div class="content-card" style="margin-bottom:15px;">
        <div class="card-header" style="flex-wrap:wrap; gap:12px;">
            <h3><i class="fas fa-chart-bar"></i> Tableau de bord - Statistiques E-SOLUTION</h3>
            <button class="btn-add" onclick="loadStatistiques()"><i class="fas fa-sync"></i> Actualiser</button>
        </div>

        <!-- 🎛️ PANNEAU DE FILTRES AVANCÉS -->
        <div style="margin-top:16px; padding:16px; background:linear-gradient(135deg,#F8FAFC,#F1F5F9); border-radius:12px; border:1px solid #E2E8F0;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <i class="fas fa-filter" style="color:#0F766E;"></i>
                <strong style="color:#0F172A; font-size:0.95rem;">Filtres avancés</strong>
                <button onclick="statsResetFilters()" style="margin-left:auto; padding:6px 14px; background:#fff; border:1.5px solid #E2E8F0; border-radius:8px; font-size:0.85rem; font-weight:600; color:#64748B; cursor:pointer;">
                    <i class="fas fa-redo"></i> Réinitialiser
                </button>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">📅 Période</label>
                    <select id="statPeriodSelect" onchange="statsApplyPeriodFilter(this.value)" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                        <option value="1">Aujourd'hui</option>
                        <option value="7" selected>7 derniers jours</option>
                        <option value="30">30 derniers jours</option>
                        <option value="90">3 mois</option>
                        <option value="365">1 an</option>
                        <option value="all">Tout</option>
                        <option value="custom">📆 Personnalisé</option>
                    </select>
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">Du</label>
                    <input type="date" id="statDateDebut" onchange="statsApplyDateRange()" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">Au</label>
                    <input type="date" id="statDateFin" onchange="statsApplyDateRange()" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">👤 Client</label>
                    <select id="statClientSelect" onchange="statsApplySimpleFilter('clientId', this.value, this.options[this.selectedIndex].text)" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                        <option value="">Tous les clients</option>
                    </select>
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">📦 Produit</label>
                    <select id="statProductSelect" onchange="statsApplySimpleFilter('productName', this.value, '')" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                        <option value="">Tous les produits</option>
                    </select>
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">🏷️ Catégorie</label>
                    <select id="statCategorySelect" onchange="statsApplySimpleFilter('category', this.value, '')" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                        <option value="">Toutes les catégories</option>
                    </select>
                </div>

                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">🧑‍💼 Vendeur</label>
                    <select id="statVendeurSelect" onchange="statsApplySimpleFilter('vendeur', this.value, '')" style="width:100%; padding:10px 12px; border:1.5px solid #E2E8F0; border-radius:10px; font-size:0.9rem; background:#fff;">
                        <option value="">Tous les vendeurs</option>
                    </select>
                </div>

            </div>

            <div id="statsActiveFilters" style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;"></div>
        </div>
    </div>

    <div id="statsContent" style="text-align:center;padding:40px;">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#A67C52;"></i>
        <p style="margin-top:10px;">Chargement des données...</p>
    </div>
    `;
    c.innerHTML = html;

    statsLoadFilterOptions().then(function() {
        loadStatistiques();
    });
}

// ============================================================
// 🔧 HELPERS DE BASE
// ============================================================
function toDate(val) {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === 'string') return new Date(val);
    if (val instanceof Date) return val;
    return null;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    return str.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

function statsSafeNum(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
}

// ============================================================
// 🔬 HELPERS DATA SCIENCE
// ============================================================
function statsLinearRegression(points) {
    if (!points || points.length < 2) return { slope: 0, intercept: 0, predict: function() { return 0; } };
    var n = points.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
        sumX += points[i].x;
        sumY += points[i].y;
        sumXY += points[i].x * points[i].y;
        sumX2 += points[i].x * points[i].x;
    }
    var denom = (n * sumX2 - sumX * sumX);
    if (denom === 0) return { slope: 0, intercept: sumY / n, predict: function() { return sumY / n; } };
    var slope = (n * sumXY - sumX * sumY) / denom;
    var intercept = (sumY - slope * sumX) / n;
    return {
        slope: slope,
        intercept: intercept,
        predict: function(x) { return slope * x + intercept; }
    };
}

function statsForecastEndOfMonth(dailySalesMap) {
    var keys = Object.keys(dailySalesMap);
    if (keys.length === 0) return { current: 0, projected: 0, daysLeft: 0, avgPerDay: 0 };
    var totalSoFar = 0;
    keys.forEach(function(k) { totalSoFar += dailySalesMap[k]; });
    var now = new Date();
    var dayOfMonth = now.getDate();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var avgPerDay = dayOfMonth > 0 ? totalSoFar / dayOfMonth : 0;
    return {
        current: totalSoFar,
        projected: avgPerDay * daysInMonth,
        avgPerDay: avgPerDay,
        daysLeft: daysInMonth - dayOfMonth,
        daysInMonth: daysInMonth,
        dayOfMonth: dayOfMonth
    };
}

function statsCalculateRFM(ventes, credits) {
    var clientsMap = {};
    var now = Date.now();
    var MS_DAY = 86400000;

    function processDoc(doc) {
        var cid = doc.clientId || doc.clientName || null;
        if (!cid) return;
        if (!clientsMap[cid]) {
            clientsMap[cid] = {
                id: cid,
                name: doc.clientName || 'Client inconnu',
                lastPurchase: 0,
                frequency: 0,
                monetary: 0,
                firstPurchase: now
            };
        }
        var c = clientsMap[cid];
        var d = toDate(doc.createdAt);
        var ts = d ? d.getTime() : 0;
        if (ts > c.lastPurchase) c.lastPurchase = ts;
        if (ts > 0 && ts < c.firstPurchase) c.firstPurchase = ts;
        c.frequency += 1;
        c.monetary += statsSafeNum(doc.total);
    }

    ventes.forEach(processDoc);
    credits.forEach(processDoc);

    var clients = [];
    Object.keys(clientsMap).forEach(function(k) {
        var c = clientsMap[k];
        var recencyDays = c.lastPurchase > 0 ? Math.floor((now - c.lastPurchase) / MS_DAY) : 999;
        var ageDays = Math.floor((now - c.firstPurchase) / MS_DAY);

        var r = recencyDays <= 7 ? 5 : recencyDays <= 30 ? 4 : recencyDays <= 60 ? 3 : recencyDays <= 120 ? 2 : 1;
        var f = c.frequency >= 20 ? 5 : c.frequency >= 10 ? 4 : c.frequency >= 5 ? 3 : c.frequency >= 2 ? 2 : 1;
        var m = c.monetary >= 5000 ? 5 : c.monetary >= 2000 ? 4 : c.monetary >= 1000 ? 3 : c.monetary >= 500 ? 2 : 1;

        var segment = 'Perdu';
        if (r >= 4 && f >= 4 && m >= 4) segment = 'Champion';
        else if (r >= 3 && f >= 3 && m >= 3) segment = 'Loyal';
        else if (r >= 3 && f >= 2) segment = 'À risque';
        else if (r <= 2 && f >= 3) segment = 'Endormi';
        else if (r <= 1) segment = 'Perdu';
        else if (ageDays <= 30) segment = 'Nouveau';

        clients.push({
            id: c.id, name: c.name,
            recency: recencyDays, frequency: c.frequency, monetary: c.monetary,
            scoreR: r, scoreF: f, scoreM: m, segment: segment,
            lastPurchase: c.lastPurchase
        });
    });

    clients.sort(function(a, b) { return b.monetary - a.monetary; });

    var segments = { 'Champion': 0, 'Loyal': 0, 'À risque': 0, 'Endormi': 0, 'Perdu': 0, 'Nouveau': 0 };
    clients.forEach(function(c) { segments[c.segment] = (segments[c.segment] || 0) + 1; });

    return { clients: clients, segments: segments };
}

function statsCalculateAging(credits) {
    var now = Date.now();
    var MS_DAY = 86400000;
    var buckets = {
        '0-30j': { count: 0, montant: 0 },
        '31-60j': { count: 0, montant: 0 },
        '61-90j': { count: 0, montant: 0 },
        '90+j': { count: 0, montant: 0 }
    };
    var totalImpaye = 0;
    var dsoSum = 0;
    var dsoWeight = 0;

    credits.forEach(function(c) {
        if (c.paid) return;
        var reste = statsSafeNum(c.remainingAmount || c.total);
        if (reste <= 0) return;
        totalImpaye += reste;
        var created = toDate(c.createdAt);
        var age = created ? Math.floor((now - created.getTime()) / MS_DAY) : 0;
        var bucket = age <= 30 ? '0-30j' : age <= 60 ? '31-60j' : age <= 90 ? '61-90j' : '90+j';
        buckets[bucket].count += 1;
        buckets[bucket].montant += reste;
        dsoSum += age * reste;
        dsoWeight += reste;
    });

    return {
        buckets: buckets,
        totalImpaye: totalImpaye,
        dso: dsoWeight > 0 ? dsoSum / dsoWeight : 0
    };
}

function statsRecouvrement(credits) {
    var total = 0, paye = 0;
    credits.forEach(function(c) {
        total += statsSafeNum(c.total);
        paye += statsSafeNum(c.amountGiven);
    });
    return {
        total: total, paye: paye,
        taux: total > 0 ? (paye / total * 100) : 0
    };
}

function statsHeatmapHoraire(ventes) {
    var hours = {};
    for (var i = 0; i < 24; i++) hours[i] = 0;
    ventes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (d) hours[d.getHours()] += statsSafeNum(v.total);
    });
    return hours;
}

function statsTopVendeurs(ventes) {
    var map = {};
    ventes.forEach(function(v) {
        var nom = v.vendeur || 'Non attribué';
        if (!map[nom]) map[nom] = { ca: 0, count: 0 };
        map[nom].ca += statsSafeNum(v.total);
        map[nom].count += 1;
    });
    return Object.keys(map).map(function(k) {
        return { vendeur: k, ca: map[k].ca, count: map[k].count, panier: map[k].count > 0 ? map[k].ca / map[k].count : 0 };
    }).sort(function(a, b) { return b.ca - a.ca; });
}

function statsBuildAlerts(stockItems, credits, produits, ventes) {
    var alerts = [];
    var now = Date.now();
    var MS_DAY = 86400000;

    stockItems.forEach(function(s) {
        var q = statsSafeNum(s.quantite);
        if (q <= 0) {
            alerts.push({ type: 'danger', icon: '❌', title: 'Rupture stock', text: s.nom + ' (' + (s.unite || '') + ')' });
        } else if (q <= 5) {
            alerts.push({ type: 'warning', icon: '⚠️', title: 'Stock faible', text: s.nom + ' : ' + q + ' ' + (s.unite || '') });
        }
    });

    credits.forEach(function(c) {
        if (c.paid) return;
        var created = toDate(c.createdAt);
        if (!created) return;
        var age = Math.floor((now - created.getTime()) / MS_DAY);
        if (age >= 30) {
            var reste = statsSafeNum(c.remainingAmount || c.total);
            alerts.push({
                type: age >= 90 ? 'danger' : 'warning',
                icon: '💳',
                title: 'Crédit ' + age + 'j',
                text: (c.clientName || 'Client') + ' : ' + reste.toFixed(2) + ' MAD'
            });
        }
    });

    var salesMap = {};
    ventes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (!d) return;
        var age = Math.floor((now - d.getTime()) / MS_DAY);
        if (age > 30) return;
        if (v.items) v.items.forEach(function(it) {
            salesMap[it.nom] = (salesMap[it.nom] || 0) + statsSafeNum(it.quantite);
        });
    });
    produits.forEach(function(p) {
        if (!salesMap[p.nom] && statsSafeNum(p.stock) > 0) {
            alerts.push({ type: 'info', icon: '😴', title: 'Produit dormant', text: p.nom + ' : aucune vente sur 30j' });
        }
    });

    return alerts.slice(0, 15);
}

/**
 * 📊 Statistiques GÉNÉRALES all-time (vue globale sur toute la vie du commerce)
 */
function statsCalculateGeneral(allVentes, allCredits, allDepenses, clients, produits, stockItems, personnel) {
    var now = new Date();
    var MS_DAY = 86400000;

    // CA total all-time
    var totalCA = allVentes.reduce(function(s, v) { return s + statsSafeNum(v.total); }, 0);
    var totalProfit = allVentes.reduce(function(s, v) {
        var p = 0;
        if (v.items) v.items.forEach(function(it) {
            var pa = statsSafeNum(it.prixAchat);
            var pp = statsSafeNum(it.prixPromo);
            var pv = statsSafeNum(it.prixVente || it.prixUnitaire);
            var pvr = pp > 0 ? pp : pv;
            p += (pvr - pa) * (statsSafeNum(it.quantite) || 1);
        });
        return s + p;
    }, 0);
    var totalDepenses = allDepenses.reduce(function(s, d) { return s + statsSafeNum(d.montant); }, 0);

    // Marge %
    var margePct = totalCA > 0 ? (totalProfit / totalCA * 100) : 0;

    // CA par jour moyen (depuis 1ère vente)
    var premiereVente = null;
    allVentes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (d && (!premiereVente || d < premiereVente)) premiereVente = d;
    });
    var joursActivite = premiereVente ? Math.max(1, Math.floor((now - premiereVente) / MS_DAY)) : 1;
    var caParJour = totalCA / joursActivite;

    // Panier moyen général
    var panierMoyen = allVentes.length > 0 ? totalCA / allVentes.length : 0;

    // Coût stock / valeur
    var valeurStock = stockItems.reduce(function(s, x) {
        return s + statsSafeNum(x.prixAchat) * statsSafeNum(x.quantite);
    }, 0);

    // Salaires mensuels
    var salairesMensuels = personnel.reduce(function(s, p) { return s + statsSafeNum(p.salaire); }, 0);

    // Crédits impayés all-time
    var creditsImpayes = allCredits.filter(function(c) { return !c.paid; })
        .reduce(function(s, c) { return s + statsSafeNum(c.remainingAmount || c.total); }, 0);

    // Meilleur jour, meilleur mois
    var parJour = {};
    allVentes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (!d) return;
        var k = d.toLocaleDateString('fr-FR');
        parJour[k] = (parJour[k] || 0) + statsSafeNum(v.total);
    });
    var meilleurJour = { date: '—', ca: 0 };
    Object.keys(parJour).forEach(function(k) {
        if (parJour[k] > meilleurJour.ca) meilleurJour = { date: k, ca: parJour[k] };
    });

    var parMois = {};
    allVentes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (!d) return;
        var k = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        parMois[k] = (parMois[k] || 0) + statsSafeNum(v.total);
    });
    var meilleurMois = { mois: '—', ca: 0 };
    Object.keys(parMois).forEach(function(k) {
        if (parMois[k] > meilleurMois.ca) meilleurMois = { mois: k, ca: parMois[k] };
    });

    // Meilleur produit all-time
    var productTotals = {};
    allVentes.forEach(function(v) {
        if (!v.items) return;
        v.items.forEach(function(it) {
            var n = it.nom || 'Sans nom';
            productTotals[n] = (productTotals[n] || 0) + statsSafeNum(it.quantite);
        });
    });
    var meilleurProduit = { nom: '—', qte: 0 };
    Object.keys(productTotals).forEach(function(k) {
        if (productTotals[k] > meilleurProduit.qte) meilleurProduit = { nom: k, qte: productTotals[k] };
    });

    // Meilleur client all-time (par CA)
    var clientTotals = {};
    allVentes.forEach(function(v) {
        if (!v.clientName) return;
        clientTotals[v.clientName] = (clientTotals[v.clientName] || 0) + statsSafeNum(v.total);
    });
    var meilleurClient = { nom: '—', ca: 0 };
    Object.keys(clientTotals).forEach(function(k) {
        if (clientTotals[k] > meilleurClient.ca) meilleurClient = { nom: k, ca: clientTotals[k] };
    });

    return {
        totalCA: totalCA,
        totalProfit: totalProfit,
        totalDepenses: totalDepenses,
        margePct: margePct,
        joursActivite: joursActivite,
        caParJour: caParJour,
        panierMoyen: panierMoyen,
        valeurStock: valeurStock,
        salairesMensuels: salairesMensuels,
        creditsImpayes: creditsImpayes,
        nbVentes: allVentes.length,
        nbClients: clients.length,
        nbProduits: produits.length,
        meilleurJour: meilleurJour,
        meilleurMois: meilleurMois,
        meilleurProduit: meilleurProduit,
        meilleurClient: meilleurClient
    };
}

// ============================================================
// 🎛️ GESTION DES FILTRES
// ============================================================
async function statsLoadFilterOptions() {
    try {
        var clientsSnap = await db.collection('clients').limit(2000).get();
        var clientSelect = document.getElementById('statClientSelect');
        if (clientSelect) {
            clientsSnap.forEach(function(d) {
                var data = d.data();
                var nom = ((data.nom || '') + ' ' + (data.prenom || '')).trim() || data.username || 'Client';
                var opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = nom;
                clientSelect.appendChild(opt);
            });
        }

        var produitsSnap = await db.collection('products').limit(2000).get();
        var productSelect = document.getElementById('statProductSelect');
        if (productSelect) {
            var produits = [];
            produitsSnap.forEach(function(d) {
                var data = d.data();
                if (data.nom) produits.push(data.nom);
            });
            produits.sort();
            produits.forEach(function(nom) {
                var opt = document.createElement('option');
                opt.value = nom;
                opt.textContent = nom;
                productSelect.appendChild(opt);
            });
        }

        var catsSnap = await db.collection('categories').get();
        var catSelect = document.getElementById('statCategorySelect');
        if (catSelect) {
            var cats = [];
            catsSnap.forEach(function(d) {
                var nom = d.data().nom;
                if (nom) cats.push(nom);
            });
            cats.sort();
            cats.forEach(function(nom) {
                var opt = document.createElement('option');
                opt.value = nom;
                opt.textContent = nom;
                catSelect.appendChild(opt);
            });
        }

        var vendeurSelect = document.getElementById('statVendeurSelect');
        if (vendeurSelect) {
            var vendeurs = new Set();
            try {
                var persSnap = await db.collection('personnel').get();
                persSnap.forEach(function(d) {
                    var nom = d.data().nom;
                    if (nom) vendeurs.add(nom);
                });
            } catch(e) {}
            vendeurs.forEach(function(v) {
                var opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                vendeurSelect.appendChild(opt);
            });
        }
    } catch(e) {
        console.error('Erreur chargement options filtres:', e);
    }
}

function statsApplyPeriodFilter(value) {
    window.statsFilters.period = value;
    if (value !== 'custom') {
        window.statsFilters.dateDebut = '';
        window.statsFilters.dateFin = '';
        var dd = document.getElementById('statDateDebut');
        var df = document.getElementById('statDateFin');
        if (dd) dd.value = '';
        if (df) df.value = '';
    }
    loadStatistiques();
}

function statsApplyDateRange() {
    var dd = document.getElementById('statDateDebut');
    var df = document.getElementById('statDateFin');
    window.statsFilters.dateDebut = dd ? dd.value : '';
    window.statsFilters.dateFin = df ? df.value : '';
    if (window.statsFilters.dateDebut || window.statsFilters.dateFin) {
        window.statsFilters.period = 'custom';
        var sel = document.getElementById('statPeriodSelect');
        if (sel) sel.value = 'custom';
    }
    loadStatistiques();
}

function statsApplySimpleFilter(key, value, label) {
    window.statsFilters[key] = value;
    if (key === 'clientId') {
        window.statsFilters.clientName = label && label !== 'Tous les clients' ? label : '';
    }
    loadStatistiques();
}

function statsResetFilters() {
    window.statsFilters = {
        period: '7', dateDebut: '', dateFin: '',
        clientId: '', clientName: '', productName: '', category: '', vendeur: ''
    };
    var ids = ['statPeriodSelect', 'statDateDebut', 'statDateFin', 'statClientSelect', 'statProductSelect', 'statCategorySelect', 'statVendeurSelect'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });
    var ps = document.getElementById('statPeriodSelect');
    if (ps) ps.value = '7';
    loadStatistiques();
}

function statsRenderActiveFilters() {
    var container = document.getElementById('statsActiveFilters');
    if (!container) return;
    var f = window.statsFilters || {};
    var badges = [];

    if (f.period && f.period !== '7' && f.period !== 'custom') {
        var labels = { '1':'Aujourd\'hui', '30':'30j', '90':'3 mois', '365':'1 an', 'all':'Tout' };
        badges.push('📅 ' + (labels[f.period] || f.period));
    }
    if (f.period === 'custom' && (f.dateDebut || f.dateFin)) {
        badges.push('📆 ' + (f.dateDebut || '...') + ' → ' + (f.dateFin || '...'));
    }
    if (f.clientName) badges.push('👤 ' + f.clientName);
    if (f.productName) badges.push('📦 ' + f.productName);
    if (f.category) badges.push('🏷️ ' + f.category);
    if (f.vendeur) badges.push('🧑‍💼 ' + f.vendeur);

    if (badges.length === 0) {
        container.innerHTML = '<span style="font-size:0.85rem; color:#94A3B8; font-style:italic;">Aucun filtre actif — affichage 7 derniers jours</span>';
        return;
    }

    container.innerHTML = badges.map(function(b) {
        return '<span style="padding:5px 12px; background:#0F766E15; color:#0F766E; border:1px solid #0F766E40; border-radius:20px; font-size:0.8rem; font-weight:600;">' + escapeHtml(b) + '</span>';
    }).join('');
}

// ============================================================
// 🚀 FONCTION PRINCIPALE
// ============================================================
async function loadStatistiques() {
    Object.values(statsCharts).forEach(function(c) { if (c && c.destroy) c.destroy(); });
    Object.values(statsAdvancedCharts).forEach(function(c) { if (c && c.destroy) c.destroy(); });
    statsCharts = {};
    statsAdvancedCharts = {};

    var statsContent = document.getElementById('statsContent');
    if (!statsContent) return;

    try {
        const [
            ventesSnap, commandesSnap, depensesSnap, clientsSnap, produitsSnap, categoriesSnap,
            stockSnap, personnelSnap, creditsSnap, settingsSnap
        ] = await Promise.all([
            db.collection('ventes').orderBy('createdAt','desc').limit(2000).get(),
            db.collection('commandes').orderBy('createdAt','desc').limit(2000).get(),
            db.collection('depenses').orderBy('createdAt','desc').limit(2000).get(),
            db.collection('clients').limit(2000).get(),
            db.collection('products').limit(2000).get(),
            db.collection('categories').get(),
            db.collection('stock').get(),
            db.collection('personnel').get(),
            db.collection('credits').orderBy('createdAt','desc').limit(2000).get(),
            db.collection('settings').doc('fidelite').get()
        ]);

        // Toutes les données (non filtrées)
        var allVentes = []; ventesSnap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allVentes.push(dd); });
        var allCredits = []; creditsSnap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allCredits.push(dd); });
        var allDepenses = []; depensesSnap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allDepenses.push(dd); });
        var allCommandes = []; commandesSnap.forEach(function(d) { var dd = d.data(); dd.id = d.id; allCommandes.push(dd); });

        var clients = []; clientsSnap.forEach(function(d) { clients.push(Object.assign({ id: d.id }, d.data())); });
        var produits = []; produitsSnap.forEach(function(d) { produits.push(Object.assign({ id: d.id }, d.data())); });
        var categories = []; categoriesSnap.forEach(function(d) { categories.push(Object.assign({ id: d.id }, d.data())); });
        var stockItems = []; stockSnap.forEach(function(d) { stockItems.push(Object.assign({ id: d.id }, d.data())); });
        var personnel = []; personnelSnap.forEach(function(d) { personnel.push(Object.assign({ id: d.id }, d.data())); });
        var fideliteSettings = settingsSnap.exists ? settingsSnap.data() : { active: true, pointsParVente: 1 };

        // 📊 STATISTIQUES GÉNÉRALES (all-time, indépendantes des filtres)
        var general = statsCalculateGeneral(allVentes, allCredits, allDepenses, clients, produits, stockItems, personnel);

        // 🎛️ Application des filtres
        var f = window.statsFilters || {};
        var now = new Date();
        var startDate = null, endDate = null;

        if (f.period === 'custom') {
            if (f.dateDebut) { startDate = new Date(f.dateDebut); startDate.setHours(0, 0, 0, 0); }
            if (f.dateFin) { endDate = new Date(f.dateFin); endDate.setHours(23, 59, 59, 999); }
        } else if (f.period && f.period !== 'all') {
            var days = parseInt(f.period);
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
        }

        function inDateRange(doc) {
            if (!startDate && !endDate) return true;
            var d = toDate(doc.createdAt);
            if (!d) return false;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        }

        function matchesClient(doc) {
            if (!f.clientId) return true;
            return doc.clientId === f.clientId;
        }

        function matchesVendeur(doc) {
            if (!f.vendeur) return true;
            return doc.vendeur === f.vendeur;
        }

        function matchesProduct(doc) {
            if (!f.productName) return true;
            if (!doc.items) return false;
            return doc.items.some(function(it) { return it.nom === f.productName; });
        }

        function matchesCategory(doc) {
            if (!f.category) return true;
            if (!doc.items) return false;
            return doc.items.some(function(it) {
                var prod = produits.find(function(p) { return p.nom === it.nom; });
                if (!prod) return false;
                if (prod.categories && prod.categories.indexOf(f.category) !== -1) return true;
                return prod.categorie === f.category;
            });
        }

        var ventes = allVentes.filter(function(v) {
            return inDateRange(v) && matchesClient(v) && matchesVendeur(v) && matchesProduct(v) && matchesCategory(v);
        });

        var credits = allCredits.filter(function(c) {
            return inDateRange(c) && matchesClient(c);
        });

        var depenses = allDepenses.filter(inDateRange);

        var commandes = allCommandes.filter(inDateRange);

        statsRenderActiveFilters();

        // ============ KPIs FILTRÉS ============
        var totalVentes = ventes.reduce(function(s, v) { return s + statsSafeNum(v.total); }, 0);
        var totalProfit = ventes.reduce(function(s, v) {
            var profit = 0;
            if (v.items) v.items.forEach(function(it) {
                var pa = statsSafeNum(it.prixAchat), pv = statsSafeNum(it.prixVente), pp = statsSafeNum(it.prixPromo);
                var pvr = (pp > 0) ? pp : pv;
                var q = statsSafeNum(it.quantite) || 1;
                profit += (pvr - pa) * q;
            });
            return s + profit;
        }, 0);
        var totalDepenses = depenses.reduce(function(s, d) { return s + statsSafeNum(d.montant); }, 0);
        var totalCreditsImpayes = credits.filter(function(c) { return !c.paid; })
            .reduce(function(s, c) { return s + statsSafeNum(c.remainingAmount || c.total); }, 0);
        var nbVentes = ventes.length;
        var panierMoyen = nbVentes > 0 ? totalVentes / nbVentes : 0;
        var nbClients = clients.length;
        var nbProduits = produits.length;
        var nbCommandes = commandes.length;
        var tauxConversion = nbCommandes > 0 ? (nbVentes / nbCommandes * 100) : 0;
        var valeurStock = stockItems.reduce(function(s, x) { return s + statsSafeNum(x.prixAchat) * statsSafeNum(x.quantite); }, 0);
        var totalSalaires = personnel.reduce(function(s, p) { return s + statsSafeNum(p.salaire); }, 0);
        var pointsTotal = fideliteSettings.active ? clients.reduce(function(s, c) { return s + statsSafeNum(c.pointsFidelite); }, 0) : 0;

        // Top produits
        var productSales = {};
        ventes.forEach(function(v) {
            if (v.items) v.items.forEach(function(it) {
                var nom = it.nom || 'Sans nom';
                productSales[nom] = (productSales[nom] || 0) + statsSafeNum(it.quantite);
            });
        });
        var topProduits = Object.entries(productSales).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

        // Top catégories
        var categoryCA = {};
        ventes.forEach(function(v) {
            if (v.items) v.items.forEach(function(it) {
                var prod = produits.find(function(p) { return p.nom === it.nom; });
                var cat = (prod && prod.categories && prod.categories[0]) || (prod && prod.categorie) || 'Sans catégorie';
                categoryCA[cat] = (categoryCA[cat] || 0) + statsSafeNum(it.prixVente || it.prixUnitaire) * statsSafeNum(it.quantite);
            });
        });
        var topCategories = Object.entries(categoryCA).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

        // Paiements
        var paymentMethods = {};
        ventes.forEach(function(v) {
            var m = v.paymentMethod || 'espece';
            paymentMethods[m] = (paymentMethods[m] || 0) + 1;
        });

        // Ventes quotidiennes
        var dailySales = {};
        var daysToShow = f.period === 'all' ? 30 : (f.period === 'custom' ? 30 : (parseInt(f.period) || 7));
        for (var i = daysToShow - 1; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            var key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            dailySales[key] = 0;
        }
        ventes.forEach(function(v) {
            var vDate = toDate(v.createdAt);
            if (vDate) {
                var dateKey = vDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                if (dailySales[dateKey] !== undefined) dailySales[dateKey] += statsSafeNum(v.total);
            }
        });

        // Dépenses par catégorie
        var depensesByCat = {};
        depenses.forEach(function(d) {
            var cat = d.categorie || 'Autre';
            depensesByCat[cat] = (depensesByCat[cat] || 0) + statsSafeNum(d.montant);
        });

        // Crédits impayés par client
        var creditsImpayesParClient = {};
        credits.filter(function(c) { return !c.paid; }).forEach(function(c) {
            var client = c.clientName || 'Inconnu';
            creditsImpayesParClient[client] = (creditsImpayesParClient[client] || 0) + statsSafeNum(c.remainingAmount || c.total);
        });

        // Modules avancés (sur données filtrées si filtre client/produit actif, sinon all)
        var useForAdvanced = (f.clientId || f.productName || f.category || f.vendeur) ? ventes : allVentes;
        var useCreditsForAdvanced = f.clientId ? credits : allCredits;

        var rfm = statsCalculateRFM(useForAdvanced, useCreditsForAdvanced);
        var aging = statsCalculateAging(useCreditsForAdvanced);
        var recouvrement = statsRecouvrement(useCreditsForAdvanced);
        var forecast = statsForecastEndOfMonth(dailySales);
        var heatmap = statsHeatmapHoraire(ventes);
        var topVendeurs = statsTopVendeurs(ventes);
        var alerts = statsBuildAlerts(stockItems, allCredits, produits, allVentes);

        // ============ RENDU HTML ============
        var statsHTML = '';

        // 📊 SECTION STATISTIQUES GÉNÉRALES (toujours affichée, non filtrée)
        statsHTML += '<div style="margin-bottom:25px; padding:20px; background:linear-gradient(135deg,#0F766E,#14B8A6); border-radius:16px; color:#fff; box-shadow:0 8px 24px rgba(15,118,110,0.25);">';
        statsHTML += '<h3 style="margin:0 0 16px; display:flex; align-items:center; gap:10px; font-size:1.2rem;"><i class="fas fa-globe"></i> 🌍 STATISTIQUES GÉNÉRALES (All-time)</h3>';
        statsHTML += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">';
        
        var generalCards = [
            { label: 'CA total', value: general.totalCA.toFixed(2) + ' MAD', icon: '💰' },
            { label: 'Profit total', value: general.totalProfit.toFixed(2) + ' MAD', icon: '📈' },
            { label: 'Marge %', value: general.margePct.toFixed(1) + '%', icon: '🎯' },
            { label: 'Jours d\'activité', value: general.joursActivite, icon: '📅' },
            { label: 'CA moyen/jour', value: general.caParJour.toFixed(2) + ' MAD', icon: '📊' },
            { label: 'Panier moyen', value: general.panierMoyen.toFixed(2) + ' MAD', icon: '🛒' },
            { label: 'Nb ventes', value: general.nbVentes, icon: '🧾' },
            { label: 'Nb clients', value: general.nbClients, icon: '👥' },
            { label: 'Nb produits', value: general.nbProduits, icon: '📦' },
            { label: 'Valeur stock', value: general.valeurStock.toFixed(2) + ' MAD', icon: '🏪' },
            { label: 'Salaires/mois', value: general.salairesMensuels.toFixed(2) + ' MAD', icon: '💼' },
            { label: 'Crédits impayés', value: general.creditsImpayes.toFixed(2) + ' MAD', icon: '💳' }
        ];
        generalCards.forEach(function(g) {
            statsHTML += '<div style="padding:12px 14px; background:rgba(255,255,255,0.15); border-radius:10px; backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2);">';
            statsHTML += '<div style="font-size:0.75rem; opacity:0.85; margin-bottom:4px;">' + g.icon + ' ' + g.label + '</div>';
            statsHTML += '<div style="font-size:1.1rem; font-weight:800;">' + escapeHtml(g.value) + '</div>';
            statsHTML += '</div>';
        });
        statsHTML += '</div>';

        // Records
        statsHTML += '<div style="margin-top:16px; padding:14px; background:rgba(255,255,255,0.1); border-radius:10px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; font-size:0.9rem;">';
        statsHTML += '<div>🏆 <strong>Meilleur jour :</strong> ' + escapeHtml(general.meilleurJour.date) + ' → ' + general.meilleurJour.ca.toFixed(2) + ' MAD</div>';
        statsHTML += '<div>📅 <strong>Meilleur mois :</strong> ' + escapeHtml(general.meilleurMois.mois) + ' → ' + general.meilleurMois.ca.toFixed(2) + ' MAD</div>';
        statsHTML += '<div>📦 <strong>Top produit :</strong> ' + escapeHtml(general.meilleurProduit.nom) + ' (' + general.meilleurProduit.qte + ' vendus)</div>';
        statsHTML += '<div>👑 <strong>Top client :</strong> ' + escapeHtml(general.meilleurClient.nom) + ' → ' + general.meilleurClient.ca.toFixed(2) + ' MAD</div>';
        statsHTML += '</div>';
        statsHTML += '</div>';

        // KPIs filtrés
        statsHTML += '<div class="stats-grid" style="margin-bottom:20px;">';
        statsHTML += buildStatCard('Chiffre d\'affaires', totalVentes.toFixed(2) + ' MAD', 'fa-money-bill-wave', '#dcfce7', '#16a34a');
        statsHTML += buildStatCard('Ventes', nbVentes.toString(), 'fa-shopping-cart', '#e0e7ff', '#4f46e5');
        statsHTML += buildStatCard('Profit brut', totalProfit.toFixed(2) + ' MAD', 'fa-chart-line', '#fef3c7', '#A67C52');
        statsHTML += buildStatCard('Panier moyen', panierMoyen.toFixed(2) + ' MAD', 'fa-shopping-basket', '#fce7f3', '#ec4899');
        statsHTML += buildStatCard('Dépenses', totalDepenses.toFixed(2) + ' MAD', 'fa-coins', '#fee2e2', '#ef4444');
        statsHTML += buildStatCard('Crédits impayés', totalCreditsImpayes.toFixed(2) + ' MAD', 'fa-credit-card', '#fef3c7', '#d97706');
        statsHTML += buildStatCard('Bénéfice net', (totalProfit - totalDepenses).toFixed(2) + ' MAD', 'fa-balance-scale', '#e0e7ff', '#4f46e5');
        statsHTML += buildStatCard('Clients', nbClients.toString(), 'fa-users', '#dcfce7', '#16a34a');
        statsHTML += buildStatCard('Produits', nbProduits.toString(), 'fa-coffee', '#f0fdf4', '#16a34a');
        statsHTML += buildStatCard('Taux conversion', tauxConversion.toFixed(1) + '%', 'fa-chart-pie', '#fef3c7', '#A67C52');
        statsHTML += buildStatCard('Valeur stock', valeurStock.toFixed(2) + ' MAD', 'fa-boxes', '#e0e7ff', '#4f46e5');
        statsHTML += buildStatCard('Salaires', totalSalaires.toFixed(2) + ' MAD', 'fa-user-tie', '#fee2e2', '#ef4444');
        if (fideliteSettings.active) statsHTML += buildStatCard('Points fidélité', pointsTotal.toString(), 'fa-star', '#fef3c7', '#A67C52');
        statsHTML += '</div>';

        // Section analytics
        statsHTML += '<div style="margin:30px 0 15px; padding:12px 20px; background:linear-gradient(135deg,#6366F1,#8B5CF6); border-radius:12px; color:#fff;">';
        statsHTML += '<h3 style="margin:0; display:flex; align-items:center; gap:10px; font-size:1.1rem;"><i class="fas fa-flask"></i> 🔬 ANALYTICS AVANCÉS (période filtrée)</h3>';
        statsHTML += '</div>';

        statsHTML += '<div class="stats-grid" style="margin-bottom:20px;">';
        statsHTML += buildStatCard('DSO (jours)', aging.dso.toFixed(1) + ' j', 'fa-hourglass-half', '#fef3c7', '#d97706');
        statsHTML += buildStatCard('Taux recouvrement', recouvrement.taux.toFixed(1) + '%', 'fa-percent', '#dcfce7', '#16a34a');
        statsHTML += buildStatCard('CA/jour (moy.)', forecast.avgPerDay.toFixed(2) + ' MAD', 'fa-calendar-day', '#e0e7ff', '#4f46e5');
        statsHTML += buildStatCard('Projection fin mois', forecast.projected.toFixed(2) + ' MAD', 'fa-chart-line', '#fce7f3', '#ec4899');
        statsHTML += '</div>';

        // Alertes
        if (alerts.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
            statsHTML += '<h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><i class="fas fa-bell" style="color:#d97706;"></i> Alertes intelligentes (' + alerts.length + ')</h4>';
            statsHTML += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:8px;">';
            alerts.forEach(function(a) {
                var colors = a.type === 'danger' ? ['#fef2f2','#dc2626'] : a.type === 'warning' ? ['#fffbeb','#d97706'] : ['#eff6ff','#2563eb'];
                statsHTML += '<div style="padding:10px 14px; border-left:4px solid ' + colors[1] + '; background:' + colors[0] + '; border-radius:8px;">';
                statsHTML += '<strong style="font-size:0.9rem;">' + a.icon + ' ' + escapeHtml(a.title) + '</strong><br>';
                statsHTML += '<span style="font-size:0.85rem; color:#64748b;">' + escapeHtml(a.text) + '</span>';
                statsHTML += '</div>';
            });
            statsHTML += '</div></div>';
        }

        // Aging
        statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
        statsHTML += '<h4 style="margin-bottom:12px;"><i class="fas fa-layer-group" style="color:#6366F1;"></i> Aging des crédits impayés</h4>';
        statsHTML += '<table class="data-table"><thead><tr><th>Tranche</th><th>Nb crédits</th><th>Montant (MAD)</th><th>% du total</th></tr></thead><tbody>';
        Object.keys(aging.buckets).forEach(function(k) {
            var b = aging.buckets[k];
            var pct = aging.totalImpaye > 0 ? (b.montant / aging.totalImpaye * 100) : 0;
            var color = k === '90+j' ? '#dc2626' : k === '61-90j' ? '#ea580c' : k === '31-60j' ? '#d97706' : '#16a34a';
            statsHTML += '<tr><td><strong style="color:' + color + ';">' + k + '</strong></td><td>' + b.count + '</td><td style="font-weight:600; color:' + color + ';">' + b.montant.toFixed(2) + '</td><td>' + pct.toFixed(1) + '%</td></tr>';
        });
        statsHTML += '</tbody></table></div>';

        // RFM
        statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
        statsHTML += '<h4 style="margin-bottom:12px;"><i class="fas fa-users-cog" style="color:#EC4899;"></i> Segmentation RFM clients</h4>';
        var segmentColors = { 'Champion':'#16a34a', 'Loyal':'#0EA5E9', 'À risque':'#d97706', 'Endormi':'#6366F1', 'Perdu':'#dc2626', 'Nouveau':'#10B981' };
        statsHTML += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:15px;">';
        Object.keys(rfm.segments).forEach(function(seg) {
            if (rfm.segments[seg] === 0) return;
            var color = segmentColors[seg] || '#64748b';
            statsHTML += '<div style="padding:14px; background:' + color + '15; border:2px solid ' + color + '40; border-radius:10px; text-align:center;">';
            statsHTML += '<div style="font-size:1.8rem; font-weight:800; color:' + color + ';">' + rfm.segments[seg] + '</div>';
            statsHTML += '<div style="font-size:0.8rem; font-weight:600; color:' + color + '; text-transform:uppercase;">' + seg + '</div>';
            statsHTML += '</div>';
        });
        statsHTML += '</div>';

        statsHTML += '<table class="data-table"><thead><tr><th>#</th><th>Client</th><th>Récence</th><th>Fréq.</th><th>Montant</th><th>Score</th><th>Segment</th></tr></thead><tbody>';
        rfm.clients.slice(0, 10).forEach(function(c, i) {
            var color = segmentColors[c.segment] || '#64748b';
            statsHTML += '<tr>';
            statsHTML += '<td>' + (i + 1) + '</td>';
            statsHTML += '<td><strong>' + escapeHtml(c.name) + '</strong></td>';
            statsHTML += '<td>' + (c.recency > 500 ? '—' : c.recency + 'j') + '</td>';
            statsHTML += '<td>' + c.frequency + '</td>';
            statsHTML += '<td style="font-weight:600;">' + c.monetary.toFixed(2) + ' MAD</td>';
            statsHTML += '<td><span style="font-size:0.8rem;">' + c.scoreR + c.scoreF + c.scoreM + '</span></td>';
            statsHTML += '<td><span style="padding:3px 10px; background:' + color + '20; color:' + color + '; border-radius:12px; font-size:0.8rem; font-weight:600;">' + c.segment + '</span></td>';
            statsHTML += '</tr>';
        });
        statsHTML += '</tbody></table></div>';

        // Top vendeurs
        if (topVendeurs.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
            statsHTML += '<h4 style="margin-bottom:12px;"><i class="fas fa-user-tie" style="color:#0F766E;"></i> Top vendeurs</h4>';
            statsHTML += '<table class="data-table"><thead><tr><th>Vendeur</th><th>Nb ventes</th><th>CA (MAD)</th><th>Panier moyen</th></tr></thead><tbody>';
            topVendeurs.slice(0, 10).forEach(function(v) {
                statsHTML += '<tr><td><strong>' + escapeHtml(v.vendeur) + '</strong></td><td>' + v.count + '</td><td style="font-weight:600; color:#0F766E;">' + v.ca.toFixed(2) + '</td><td>' + v.panier.toFixed(2) + ' MAD</td></tr>';
            });
            statsHTML += '</tbody></table></div>';
        }

        // Graphiques
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📈 Évolution du CA</h4><canvas id="salesChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">💳 Méthodes de paiement</h4><canvas id="paymentChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📊 Top 5 Catégories (CA)</h4><canvas id="categoryChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">💸 Dépenses par catégorie</h4><canvas id="depensesChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';

        statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
        statsHTML += '<h4 style="margin-bottom:10px;">⏰ Répartition horaire du CA</h4>';
        statsHTML += '<canvas id="heatmapChart" style="max-height:200px;"></canvas>';
        statsHTML += '</div>';

        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🥧 Aging crédits</h4><canvas id="agingChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🎯 Segments RFM</h4><canvas id="rfmChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';

        // Tables
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🏆 Top 5 Produits (quantité vendue)</h4><table class="data-table"><thead><tr><th>Produit</th><th>Qté vendue</th></tr></thead><tbody>';
        if (topProduits.length > 0) {
            topProduits.forEach(function(p) { statsHTML += '<tr><td>' + escapeHtml(p[0]) + '</td><td>' + escapeHtml(p[1]) + '</td></tr>'; });
        } else {
            statsHTML += '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">Aucune vente</td></tr>';
        }
        statsHTML += '</tbody></table></div>';

        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📋 Crédits impayés par client</h4><table class="data-table"><thead><tr><th>Client</th><th>Montant (MAD)</th></tr></thead><tbody>';
        var creditsArray = Object.entries(creditsImpayesParClient).sort(function(a,b) { return b[1] - a[1]; });
        if (creditsArray.length > 0) {
            creditsArray.slice(0, 10).forEach(function(c) { statsHTML += '<tr><td>' + escapeHtml(c[0]) + '</td><td style="color:#ef4444;font-weight:600;">' + c[1].toFixed(2) + '</td></tr>'; });
        } else {
            statsHTML += '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">Aucun crédit impayé</td></tr>';
        }
        statsHTML += '</tbody></table></div>';
        statsHTML += '</div>';

        // Effectif
        if (personnel.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;"><h4 style="margin-bottom:10px;">👥 Effectif</h4><table class="data-table"><thead><tr><th>Rôle</th><th>Effectif</th><th>Total salaires</th></tr></thead><tbody>';
            var effectifParRole = {}, salaireParRole = {};
            personnel.forEach(function(p) {
                var role = p.role || 'Non défini';
                effectifParRole[role] = (effectifParRole[role] || 0) + 1;
                salaireParRole[role] = (salaireParRole[role] || 0) + statsSafeNum(p.salaire);
            });
            Object.keys(effectifParRole).forEach(function(role) {
                statsHTML += '<tr><td>' + escapeHtml(role) + '</td><td>' + effectifParRole[role] + '</td><td>' + salaireParRole[role].toFixed(2) + ' MAD</td></tr>';
            });
            statsHTML += '</tbody></table></div>';
        }

        statsContent.innerHTML = statsHTML;

        // ============ RENDU DES GRAPHIQUES ============
        setTimeout(function() {
            if (typeof Chart === 'undefined') { console.warn('Chart.js non chargé'); return; }
            try {
                var ctx1 = document.getElementById('salesChart')?.getContext('2d');
                if (ctx1) statsCharts.sales = new Chart(ctx1, { type: 'line', data: { labels: Object.keys(dailySales), datasets: [{ label: 'CA (MAD)', data: Object.values(dailySales), borderColor: '#A67C52', backgroundColor: 'rgba(166,124,82,0.1)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#A67C52' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return v + ' MAD'; } } } } } });

                var ctx2 = document.getElementById('paymentChart')?.getContext('2d');
                if (ctx2) statsCharts.payment = new Chart(ctx2, { type: 'doughnut', data: { labels: Object.keys(paymentMethods), datasets: [{ data: Object.values(paymentMethods), backgroundColor: ['#A67C52', '#4f46e5', '#16a34a', '#ef4444', '#d97706'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });

                var ctx3 = document.getElementById('categoryChart')?.getContext('2d');
                if (ctx3) statsCharts.category = new Chart(ctx3, { type: 'bar', data: { labels: topCategories.map(function(c) { return c[0]; }), datasets: [{ label: 'CA (MAD)', data: topCategories.map(function(c) { return c[1]; }), backgroundColor: '#A67C52', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return v + ' MAD'; } } } } } });

                var ctx4 = document.getElementById('depensesChart')?.getContext('2d');
                if (ctx4) statsCharts.depenses = new Chart(ctx4, { type: 'bar', data: { labels: Object.keys(depensesByCat), datasets: [{ label: 'Dépenses (MAD)', data: Object.values(depensesByCat), backgroundColor: '#ef4444', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return v + ' MAD'; } } } } } });

                var ctxH = document.getElementById('heatmapChart')?.getContext('2d');
                if (ctxH) {
                    var hours = Object.keys(heatmap).map(function(h) { return h + 'h'; });
                    var hourData = Object.values(heatmap);
                    statsAdvancedCharts.heatmap = new Chart(ctxH, {
                        type: 'bar',
                        data: { labels: hours, datasets: [{ label: 'CA par heure', data: hourData, backgroundColor: hourData.map(function(v) { return v > 0 ? '#0F766E' : '#e2e8f0'; }), borderRadius: 4 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return v + ' MAD'; } } } } }
                    });
                }

                var ctxA = document.getElementById('agingChart')?.getContext('2d');
                if (ctxA) {
                    var agingLabels = Object.keys(aging.buckets).filter(function(k) { return aging.buckets[k].montant > 0; });
                    var agingData = agingLabels.map(function(k) { return aging.buckets[k].montant; });
                    if (agingData.length > 0) {
                        statsAdvancedCharts.aging = new Chart(ctxA, {
                            type: 'doughnut',
                            data: { labels: agingLabels, datasets: [{ data: agingData, backgroundColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626'] }] },
                            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                        });
                    }
                }

                var ctxR = document.getElementById('rfmChart')?.getContext('2d');
                if (ctxR) {
                    var rfmLabels = Object.keys(rfm.segments).filter(function(k) { return rfm.segments[k] > 0; });
                    var rfmData = rfmLabels.map(function(k) { return rfm.segments[k]; });
                    var rfmColors = rfmLabels.map(function(k) {
                        return ({ 'Champion':'#16a34a', 'Loyal':'#0EA5E9', 'À risque':'#d97706', 'Endormi':'#6366F1', 'Perdu':'#dc2626', 'Nouveau':'#10B981' })[k] || '#64748b';
                    });
                    if (rfmData.length > 0) {
                        statsAdvancedCharts.rfm = new Chart(ctxR, {
                            type: 'doughnut',
                            data: { labels: rfmLabels, datasets: [{ data: rfmData, backgroundColor: rfmColors }] },
                            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                        });
                    }
                }
            } catch(chartError) { console.error('Erreur Chart.js :', chartError); }
        }, 200);

    } catch(e) {
        console.error('Erreur statistiques :', e);
        if (statsContent) {
            statsContent.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ef4444;"></i><p style="color:#ef4444; margin-top:10px;">Erreur lors du chargement des statistiques</p><p style="color:#64748b; font-size:0.85rem;">' + escapeHtml(e.message || e) + '</p></div>';
        }
    }
}

function buildStatCard(label, value, icon, bgColor, iconColor) {
    var strVal = String(value);
    var isNegative = strVal.indexOf('-') !== -1;
    return '<div class="stat-card"><div class="stat-icon" style="background:' + bgColor + ';"><i class="fas ' + icon + '" style="color:' + iconColor + ';"></i></div><div class="stat-info"><span class="stat-label">' + escapeHtml(label) + '</span><span class="stat-value" style="color:' + (isNegative ? '#ef4444' : '#1e293b') + ';">' + escapeHtml(strVal) + '</span></div></div>';
}

// ============================================================
// EXPOSITION GLOBALE
// ============================================================
window.statsLoadFilterOptions = statsLoadFilterOptions;
window.statsApplyPeriodFilter = statsApplyPeriodFilter;
window.statsApplyDateRange = statsApplyDateRange;
window.statsApplySimpleFilter = statsApplySimpleFilter;
window.statsResetFilters = statsResetFilters;
window.statsRenderActiveFilters = statsRenderActiveFilters;
window.statsCalculateGeneral = statsCalculateGeneral;

console.log('🚀 E-SOLUTION POS — Statistiques Premium v4.0 FINALE');
console.log('✅ Filtres : Période + Date début/fin + Client + Produit + Catégorie + Vendeur');
console.log('✅ Analytics : RFM + Aging + DSO + Prévisions + Heatmap + Top vendeurs + Alertes');
console.log('✅ Statistiques GÉNÉRALES all-time (CA, profit, marge, meilleur jour/mois/produit/client)');
