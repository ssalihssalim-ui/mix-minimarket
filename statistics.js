// ==================== STATISTIQUES.JS - E-SOLUTION POS ====================
// Version Premium v3.0 — KPIs avancés + RFM + Aging + Prévisions + Heatmap
// ⚠️ Structure d'origine préservée — Ajouts purement additifs

var statsCharts = {};
var statsAdvancedCharts = {};

function loadStatistiquesPage(c) {
    if (!window.currentUserData || window.currentUserData.userData.role !== 'admin') {
        c.innerHTML = '<div class="content-card"><p style="text-align:center;padding:40px;color:#ef4444;"><i class="fas fa-lock" style="font-size:2rem;display:block;margin-bottom:10px;"></i>Accès réservé à l\'administrateur</p></div>';
        return;
    }

    var html = `
    <div class="content-card" style="margin-bottom:15px;">
        <div class="card-header">
            <h3><i class="fas fa-chart-bar"></i> Tableau de bord - Statistiques E-SOLUTION</h3>
            <div style="display:flex; gap:8px; align-items:center;">
                <select id="statPeriodSelect" style="padding:8px 12px; border:2px solid #e2e8f0; border-radius:8px;" onchange="loadStatistiques()">
                    <option value="1">Aujourd'hui</option>
                    <option value="7" selected>7 derniers jours</option>
                    <option value="30">30 derniers jours</option>
                    <option value="90">3 mois</option>
                    <option value="365">1 an</option>
                    <option value="all">Tout</option>
                </select>
                <button class="btn-add" onclick="loadStatistiques()"><i class="fas fa-sync"></i> Actualiser</button>
            </div>
        </div>
    </div>
    <div id="statsContent" style="text-align:center;padding:40px;">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#A67C52;"></i>
        <p style="margin-top:10px;">Chargement des données...</p>
    </div>
    `;
    c.innerHTML = html;
    loadStatistiques();
}

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
// 🔬 HELPERS DATA SCIENCE — Régression, RFM, Aging, Prévisions
// ============================================================

/**
 * Régression linéaire simple : retourne {slope, intercept, predict(x)}
 */
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

/**
 * Prévision CA fin de mois (projection basée sur la moyenne des jours écoulés)
 */
function statsForecastEndOfMonth(dailySalesMap) {
    var keys = Object.keys(dailySalesMap);
    if (keys.length === 0) return { current: 0, projected: 0, daysLeft: 0 };
    var totalSoFar = 0;
    var nonZero = 0;
    keys.forEach(function(k) {
        totalSoFar += dailySalesMap[k];
        if (dailySalesMap[k] > 0) nonZero++;
    });
    var now = new Date();
    var dayOfMonth = now.getDate();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var avgPerDay = dayOfMonth > 0 ? totalSoFar / dayOfMonth : 0;
    var projected = avgPerDay * daysInMonth;
    return {
        current: totalSoFar,
        projected: projected,
        avgPerDay: avgPerDay,
        daysLeft: daysInMonth - dayOfMonth,
        daysInMonth: daysInMonth,
        dayOfMonth: dayOfMonth
    };
}

/**
 * Segmentation RFM clients
 * Récence (jours depuis dernier achat), Fréquence (nb achats), Montant (CA total)
 * Segments : Champions, Loyaux, À risque, Endormis, Perdus, Nouveaux
 */
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

        // Score R (1-5) : plus récent = plus élevé
        var r = recencyDays <= 7 ? 5 : recencyDays <= 30 ? 4 : recencyDays <= 60 ? 3 : recencyDays <= 120 ? 2 : 1;
        // Score F (1-5)
        var f = c.frequency >= 20 ? 5 : c.frequency >= 10 ? 4 : c.frequency >= 5 ? 3 : c.frequency >= 2 ? 2 : 1;
        // Score M (1-5) — seuils adaptables
        var m = c.monetary >= 5000 ? 5 : c.monetary >= 2000 ? 4 : c.monetary >= 1000 ? 3 : c.monetary >= 500 ? 2 : 1;

        var segment = 'Perdu';
        if (r >= 4 && f >= 4 && m >= 4) segment = 'Champion';
        else if (r >= 3 && f >= 3 && m >= 3) segment = 'Loyal';
        else if (r >= 3 && f >= 2) segment = 'À risque';
        else if (r <= 2 && f >= 3) segment = 'Endormi';
        else if (r <= 1) segment = 'Perdu';
        else if (ageDays <= 30) segment = 'Nouveau';

        clients.push({
            id: c.id,
            name: c.name,
            recency: recencyDays,
            frequency: c.frequency,
            monetary: c.monetary,
            scoreR: r,
            scoreF: f,
            scoreM: m,
            segment: segment,
            lastPurchase: c.lastPurchase
        });
    });

    clients.sort(function(a, b) { return b.monetary - a.monetary; });

    var segments = { 'Champion': 0, 'Loyal': 0, 'À risque': 0, 'Endormi': 0, 'Perdu': 0, 'Nouveau': 0 };
    clients.forEach(function(c) { segments[c.segment] = (segments[c.segment] || 0) + 1; });

    return { clients: clients, segments: segments };
}

/**
 * Aging des crédits (tranches 0-30 / 31-60 / 61-90 / 90+)
 */
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

/**
 * Taux de recouvrement (payé / total créé)
 */
function statsRecouvrement(credits) {
    var total = 0, paye = 0;
    credits.forEach(function(c) {
        total += statsSafeNum(c.total);
        paye += statsSafeNum(c.amountGiven);
    });
    return {
        total: total,
        paye: paye,
        taux: total > 0 ? (paye / total * 100) : 0
    };
}

/**
 * Heatmap horaire : répartition ventes par heure (0-23)
 */
function statsHeatmapHoraire(ventes) {
    var hours = {};
    for (var i = 0; i < 24; i++) hours[i] = 0;
    ventes.forEach(function(v) {
        var d = toDate(v.createdAt);
        if (d) hours[d.getHours()] += statsSafeNum(v.total);
    });
    return hours;
}

/**
 * Top vendeurs (par CA)
 */
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

/**
 * Alertes intelligentes
 */
function statsBuildAlerts(stockItems, credits, produits, ventes) {
    var alerts = [];
    var now = Date.now();
    var MS_DAY = 86400000;

    // 1) Ruptures stock
    stockItems.forEach(function(s) {
        var q = statsSafeNum(s.quantite);
        if (q <= 0) {
            alerts.push({ type: 'danger', icon: '❌', title: 'Rupture stock', text: s.nom + ' (' + (s.unite || '') + ')' });
        } else if (q <= 5) {
            alerts.push({ type: 'warning', icon: '⚠️', title: 'Stock faible', text: s.nom + ' : ' + q + ' ' + (s.unite || '') });
        }
    });

    // 2) Crédits > 30j
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

    // 3) Produits dormants (aucune vente sur 30j)
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

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

async function loadStatistiques() {
    Object.values(statsCharts).forEach(chart => { if (chart && chart.destroy) chart.destroy(); });
    Object.values(statsAdvancedCharts).forEach(chart => { if (chart && chart.destroy) chart.destroy(); });
    statsCharts = {};
    statsAdvancedCharts = {};

    var period = document.getElementById('statPeriodSelect')?.value || '7';
    var now = new Date();
    var startDate = null;
    if (period !== 'all') {
        var days = parseInt(period);
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
    }

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

        // ⚠️ Pour RFM/Aging, on garde TOUTES les ventes et crédits (pas filtrées)
        var allVentes = [], allCredits = [];
        ventesSnap.forEach(d => { var dd = d.data(); dd.id = d.id; allVentes.push(dd); });
        creditsSnap.forEach(d => { var dd = d.data(); dd.id = d.id; allCredits.push(dd); });

        // Filtrage par période pour les KPIs
        var ventes = [], commandes = [], depenses = [], credits = [];
        allVentes.forEach(function(dd) { var docDate = toDate(dd.createdAt); if (!startDate || (docDate && docDate >= startDate)) ventes.push(dd); });
        commandesSnap.forEach(d => { var dd = d.data(); dd.id = d.id; var docDate = toDate(dd.createdAt); if (!startDate || (docDate && docDate >= startDate)) commandes.push(dd); });
        depensesSnap.forEach(d => { var dd = d.data(); dd.id = d.id; var docDate = toDate(dd.createdAt); if (!startDate || (docDate && docDate >= startDate)) depenses.push(dd); });
        allCredits.forEach(function(dd) { var docDate = toDate(dd.createdAt); if (!startDate || (docDate && docDate >= startDate)) credits.push(dd); });

        var clients = []; clientsSnap.forEach(d => clients.push(Object.assign({ id: d.id }, d.data())));
        var produits = []; produitsSnap.forEach(d => produits.push(Object.assign({ id: d.id }, d.data())));
        var categories = []; categoriesSnap.forEach(d => categories.push(Object.assign({ id: d.id }, d.data())));
        var stockItems = []; stockSnap.forEach(d => stockItems.push(Object.assign({ id: d.id }, d.data())));
        var personnel = []; personnelSnap.forEach(d => personnel.push(Object.assign({ id: d.id }, d.data())));
        var fideliteSettings = settingsSnap.exists ? settingsSnap.data() : { active: true, pointsParVente: 1 };

        // ============ KPIs STANDARD ============
        var totalVentes = ventes.reduce((sum, v) => sum + statsSafeNum(v.total), 0);
        var totalProfit = ventes.reduce((sum, v) => {
            var profit = 0;
            if (v.items) {
                v.items.forEach(it => {
                    var pa = statsSafeNum(it.prixAchat), pv = statsSafeNum(it.prixVente), pp = statsSafeNum(it.prixPromo);
                    var pvr = (pp > 0) ? pp : pv, q = statsSafeNum(it.quantite) || 1;
                    profit += (pvr - pa) * q;
                });
            }
            return sum + profit;
        }, 0);
        var totalDepenses = depenses.reduce((sum, d) => sum + statsSafeNum(d.montant), 0);
        var totalCreditsImpayes = credits.filter(c => !c.paid).reduce((sum, c) => sum + statsSafeNum(c.remainingAmount || c.total), 0);
        var nbVentes = ventes.length;
        var panierMoyen = nbVentes > 0 ? totalVentes / nbVentes : 0;
        var nbClients = clients.length;
        var nbProduits = produits.length;
        var nbCommandes = commandes.length;
        var tauxConversion = nbCommandes > 0 ? (nbVentes / nbCommandes * 100) : 0;
        var valeurStock = stockItems.reduce((sum, s) => sum + (statsSafeNum(s.prixAchat) * statsSafeNum(s.quantite)), 0);
        var totalSalaires = personnel.reduce((sum, p) => sum + statsSafeNum(p.salaire), 0);
        var pointsTotal = fideliteSettings.active ? clients.reduce((sum, c) => sum + statsSafeNum(c.pointsFidelite), 0) : 0;

        var productSales = {};
        ventes.forEach(v => {
            if (v.items) v.items.forEach(it => {
                var nom = it.nom || 'Sans nom';
                if (!productSales[nom]) productSales[nom] = 0;
                productSales[nom] += statsSafeNum(it.quantite);
            });
        });
        var topProduits = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

        var categoryCA = {};
        ventes.forEach(v => {
            if (v.items) v.items.forEach(it => {
                var prod = produits.find(p => p.nom === it.nom);
                var cat = (prod && prod.categories && prod.categories[0]) || (prod && prod.categorie) || 'Sans catégorie';
                if (!categoryCA[cat]) categoryCA[cat] = 0;
                categoryCA[cat] += statsSafeNum(it.prixVente || it.prixUnitaire) * statsSafeNum(it.quantite);
            });
        });
        var topCategories = Object.entries(categoryCA).sort((a, b) => b[1] - a[1]).slice(0, 5);

        var paymentMethods = {};
        ventes.forEach(v => {
            var method = v.paymentMethod || 'espece';
            if (!paymentMethods[method]) paymentMethods[method] = 0;
            paymentMethods[method] += 1;
        });

        var dailySales = {};
        var daysToShow = period === 'all' ? 30 : parseInt(period);
        for (var i = daysToShow - 1; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            var key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            dailySales[key] = 0;
        }
        ventes.forEach(v => {
            var vDate = toDate(v.createdAt);
            if (vDate) {
                var dateKey = vDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                if (dailySales[dateKey] !== undefined) dailySales[dateKey] += statsSafeNum(v.total);
            }
        });

        var depensesByCat = {};
        depenses.forEach(d => {
            var cat = d.categorie || 'Autre';
            if (!depensesByCat[cat]) depensesByCat[cat] = 0;
            depensesByCat[cat] += statsSafeNum(d.montant);
        });

        var creditsImpayesParClient = {};
        credits.filter(c => !c.paid).forEach(c => {
            var client = c.clientName || 'Inconnu';
            if (!creditsImpayesParClient[client]) creditsImpayesParClient[client] = 0;
            creditsImpayesParClient[client] += statsSafeNum(c.remainingAmount || c.total);
        });

        // ============ MODULES AVANCÉS ============
        var rfm = statsCalculateRFM(allVentes, allCredits);
        var aging = statsCalculateAging(allCredits);
        var recouvrement = statsRecouvrement(allCredits);
        var forecast = statsForecastEndOfMonth(dailySales);
        var heatmap = statsHeatmapHoraire(ventes);
        var topVendeurs = statsTopVendeurs(ventes);
        var alerts = statsBuildAlerts(stockItems, allCredits, produits, allVentes);

        // ============ RENDU HTML ============
        var statsHTML = '';

        // KPIs STANDARD
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

        // ============ SECTION ANALYTICS AVANCÉS ============
        statsHTML += '<div style="margin:30px 0 15px; padding:12px 20px; background:linear-gradient(135deg,#0F766E,#14B8A6); border-radius:12px; color:#fff;">';
        statsHTML += '<h3 style="margin:0; display:flex; align-items:center; gap:10px; font-size:1.1rem;"><i class="fas fa-flask"></i> 🔬 ANALYTICS AVANCÉS</h3>';
        statsHTML += '</div>';

        // KPIs avancés
        statsHTML += '<div class="stats-grid" style="margin-bottom:20px;">';
        statsHTML += buildStatCard('DSO (jours)', aging.dso.toFixed(1) + ' j', 'fa-hourglass-half', '#fef3c7', '#d97706');
        statsHTML += buildStatCard('Taux recouvrement', recouvrement.taux.toFixed(1) + '%', 'fa-percent', '#dcfce7', '#16a34a');
        statsHTML += buildStatCard('CA/jour (moy.)', forecast.avgPerDay.toFixed(2) + ' MAD', 'fa-calendar-day', '#e0e7ff', '#4f46e5');
        statsHTML += buildStatCard('Projection fin mois', forecast.projected.toFixed(2) + ' MAD', 'fa-chart-line', '#fce7f3', '#ec4899');
        statsHTML += '</div>';

        // Alertes intelligentes
        if (alerts.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
            statsHTML += '<h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><i class="fas fa-bell" style="color:#d97706;"></i> Alertes intelligentes (' + alerts.length + ')</h4>';
            statsHTML += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:8px;">';
            alerts.forEach(function(a) {
                var colors = a.type === 'danger' ? ['#fef2f2','#dc2626','#fecaca'] : a.type === 'warning' ? ['#fffbeb','#d97706','#fde68a'] : ['#eff6ff','#2563eb','#bfdbfe'];
                statsHTML += '<div style="padding:10px 14px; border-left:4px solid ' + colors[1] + '; background:' + colors[0] + '; border-radius:8px;">';
                statsHTML += '<strong style="font-size:0.9rem;">' + a.icon + ' ' + escapeHtml(a.title) + '</strong><br>';
                statsHTML += '<span style="font-size:0.85rem; color:#64748b;">' + escapeHtml(a.text) + '</span>';
                statsHTML += '</div>';
            });
            statsHTML += '</div></div>';
        }

        // ============ AGING CRÉDITS ============
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

        // ============ RFM CLIENTS ============
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

        // Top 10 clients RFM
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

        // ============ TOP VENDEURS ============
        if (topVendeurs.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
            statsHTML += '<h4 style="margin-bottom:12px;"><i class="fas fa-user-tie" style="color:#0F766E;"></i> Top vendeurs</h4>';
            statsHTML += '<table class="data-table"><thead><tr><th>Vendeur</th><th>Nb ventes</th><th>CA (MAD)</th><th>Panier moyen</th></tr></thead><tbody>';
            topVendeurs.slice(0, 10).forEach(function(v) {
                statsHTML += '<tr><td><strong>' + escapeHtml(v.vendeur) + '</strong></td><td>' + v.count + '</td><td style="font-weight:600; color:#0F766E;">' + v.ca.toFixed(2) + '</td><td>' + v.panier.toFixed(2) + ' MAD</td></tr>';
            });
            statsHTML += '</tbody></table></div>';
        }

        // ============ GRAPHIQUES STANDARD ============
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📈 Évolution du CA</h4><canvas id="salesChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">💳 Méthodes de paiement</h4><canvas id="paymentChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📊 Top 5 Catégories (CA)</h4><canvas id="categoryChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">💸 Dépenses par catégorie</h4><canvas id="depensesChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';

        // Graphe heatmap horaire
        statsHTML += '<div class="content-card" style="margin-bottom:20px;">';
        statsHTML += '<h4 style="margin-bottom:10px;">⏰ Répartition horaire du CA</h4>';
        statsHTML += '<canvas id="heatmapChart" style="max-height:200px;"></canvas>';
        statsHTML += '</div>';

        // Graphe aging (doughnut)
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🥧 Aging crédits</h4><canvas id="agingChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🎯 Segments RFM</h4><canvas id="rfmChart" style="max-height:250px;"></canvas></div>';
        statsHTML += '</div>';

        // ============ TABLES STANDARD ============
        statsHTML += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">🏆 Top 5 Produits (quantité vendue)</h4><table class="data-table"><thead><tr><th>Produit</th><th>Qté vendue</th></tr></thead><tbody>';
        if (topProduits.length > 0) {
            topProduits.forEach(p => { statsHTML += '<tr><td>' + escapeHtml(p[0]) + '</td><td>' + escapeHtml(p[1]) + '</td></tr>'; });
        } else {
            statsHTML += '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">Aucune vente</td></tr>';
        }
        statsHTML += '</tbody></table></div>';
        statsHTML += '<div class="content-card"><h4 style="margin-bottom:10px;">📋 Crédits impayés par client</h4><table class="data-table"><thead><tr><th>Client</th><th>Montant (MAD)</th></tr></thead><tbody>';
        var creditsArray = Object.entries(creditsImpayesParClient).sort((a,b) => b[1] - a[1]);
        if (creditsArray.length > 0) {
            creditsArray.slice(0, 10).forEach(c => { statsHTML += '<tr><td>' + escapeHtml(c[0]) + '</td><td style="color:#ef4444;font-weight:600;">' + c[1].toFixed(2) + '</td></tr>'; });
        } else {
            statsHTML += '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">Aucun crédit impayé</td></tr>';
        }
        statsHTML += '</tbody></table></div>';
        statsHTML += '</div>';

        // Effectif
        if (personnel.length > 0) {
            statsHTML += '<div class="content-card" style="margin-bottom:20px;"><h4 style="margin-bottom:10px;">👥 Effectif</h4><table class="data-table"><thead><tr><th>Rôle</th><th>Effectif</th><th>Total salaires</th></tr></thead><tbody>';
            var effectifParRole = {}, salaireParRole = {};
            personnel.forEach(p => {
                var role = p.role || 'Non défini';
                effectifParRole[role] = (effectifParRole[role] || 0) + 1;
                salaireParRole[role] = (salaireParRole[role] || 0) + statsSafeNum(p.salaire);
            });
            Object.keys(effectifParRole).forEach(role => {
                statsHTML += '<tr><td>' + escapeHtml(role) + '</td><td>' + effectifParRole[role] + '</td><td>' + salaireParRole[role].toFixed(2) + ' MAD</td></tr>';
            });
            statsHTML += '</tbody></table></div>';
        }

        statsContent.innerHTML = statsHTML;

        // ============ RENDU DES GRAPHIQUES ============
        setTimeout(() => {
            if (typeof Chart === 'undefined') { console.warn('Chart.js non chargé'); return; }
            try {
                var ctx1 = document.getElementById('salesChart')?.getContext('2d');
                if (ctx1) statsCharts.sales = new Chart(ctx1, { type: 'line', data: { labels: Object.keys(dailySales), datasets: [{ label: 'CA (MAD)', data: Object.values(dailySales), borderColor: '#A67C52', backgroundColor: 'rgba(166,124,82,0.1)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#A67C52' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' MAD' } } } } });

                var ctx2 = document.getElementById('paymentChart')?.getContext('2d');
                if (ctx2) statsCharts.payment = new Chart(ctx2, { type: 'doughnut', data: { labels: Object.keys(paymentMethods), datasets: [{ data: Object.values(paymentMethods), backgroundColor: ['#A67C52', '#4f46e5', '#16a34a', '#ef4444', '#d97706'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });

                var ctx3 = document.getElementById('categoryChart')?.getContext('2d');
                if (ctx3) statsCharts.category = new Chart(ctx3, { type: 'bar', data: { labels: topCategories.map(c => c[0]), datasets: [{ label: 'CA (MAD)', data: topCategories.map(c => c[1]), backgroundColor: '#A67C52', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' MAD' } } } } });

                var ctx4 = document.getElementById('depensesChart')?.getContext('2d');
                if (ctx4) statsCharts.depenses = new Chart(ctx4, { type: 'bar', data: { labels: Object.keys(depensesByCat), datasets: [{ label: 'Dépenses (MAD)', data: Object.values(depensesByCat), backgroundColor: '#ef4444', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' MAD' } } } } });

                // Heatmap horaire
                var ctxH = document.getElementById('heatmapChart')?.getContext('2d');
                if (ctxH) {
                    var hours = Object.keys(heatmap).map(h => h + 'h');
                    var hourData = Object.values(heatmap);
                    statsAdvancedCharts.heatmap = new Chart(ctxH, {
                        type: 'bar',
                        data: {
                            labels: hours,
                            datasets: [{ label: 'CA par heure', data: hourData, backgroundColor: hourData.map(v => v > 0 ? '#0F766E' : '#e2e8f0'), borderRadius: 4 }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' MAD' } } }
                        }
                    });
                }

                // Aging doughnut
                var ctxA = document.getElementById('agingChart')?.getContext('2d');
                if (ctxA) {
                    var agingLabels = Object.keys(aging.buckets).filter(k => aging.buckets[k].montant > 0);
                    var agingData = agingLabels.map(k => aging.buckets[k].montant);
                    statsAdvancedCharts.aging = new Chart(ctxA, {
                        type: 'doughnut',
                        data: {
                            labels: agingLabels,
                            datasets: [{ data: agingData, backgroundColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626'] }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                    });
                }

                // RFM doughnut
                var ctxR = document.getElementById('rfmChart')?.getContext('2d');
                if (ctxR) {
                    var rfmLabels = Object.keys(rfm.segments).filter(k => rfm.segments[k] > 0);
                    var rfmData = rfmLabels.map(k => rfm.segments[k]);
                    var rfmColors = rfmLabels.map(k => ({
                        'Champion':'#16a34a', 'Loyal':'#0EA5E9', 'À risque':'#d97706', 'Endormi':'#6366F1', 'Perdu':'#dc2626', 'Nouveau':'#10B981'
                    })[k] || '#64748b');
                    statsAdvancedCharts.rfm = new Chart(ctxR, {
                        type: 'doughnut',
                        data: { labels: rfmLabels, datasets: [{ data: rfmData, backgroundColor: rfmColors }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                    });
                }
            } catch(chartError) { console.error('Erreur Chart.js :', chartError); }
        }, 200);

    } catch(e) {
        console.error('Erreur statistiques :', e);
        statsContent.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ef4444;"></i><p style="color:#ef4444; margin-top:10px;">Erreur lors du chargement des statistiques</p><p style="color:#64748b; font-size:0.85rem;">' + escapeHtml(e.message || e) + '</p></div>';
    }
}

function buildStatCard(label, value, icon, bgColor, iconColor) {
    var strVal = String(value);
    var isNegative = strVal.indexOf('-') !== -1;
    return '<div class="stat-card"><div class="stat-icon" style="background:' + bgColor + ';"><i class="fas ' + icon + '" style="color:' + iconColor + ';"></i></div><div class="stat-info"><span class="stat-label">' + escapeHtml(label) + '</span><span class="stat-value" style="color:' + (isNegative ? '#ef4444' : '#1e293b') + ';">' + escapeHtml(strVal) + '</span></div></div>';
}

console.log('🚀 E-SOLUTION POS — Statistiques Premium v3.0 chargé');
console.log('✅ KPIs standard + RFM + Aging + DSO + Prévisions + Heatmap + Top vendeurs + Alertes');
