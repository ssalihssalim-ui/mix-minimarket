// ==================== ADMIN-VENTES.JS - MIXMAX MINIMARKET PRO FINAL ====================
// Version : Facture/Date/Client en colonnes séparées
// Bouton X pour effacer la recherche
// Reconnaissance vocale des filtres de date

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

// ========== VARIABLES VOCALES ==========
window.voiceRecognition = null;
window.voiceIsListening = false;
window.voiceCurrentTarget = null;

// ========== FONCTIONS UTILITAIRES ==========

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

// Génère l'affichage Facture (colonne séparée)
function renderFactureCell(vente) {
    const factureNum = vente.factureNum || vente.id?.substring(0, 8) || '---';
    return `
        <div class="facture-cell">
            <i class="fas fa-receipt"></i>
            <span class="facture-number">#${factureNum}</span>
        </div>
    `;
}

// Génère l'affichage Date/Heure (colonne séparée)
function renderDateCell(vente) {
    const dt = vente.createdAt ? formatDateHeure(vente.createdAt.seconds) : { date: '-', time: '-', full: '-' };
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

// Génère l'affichage Client (colonne séparée)
function renderClientCell(vente) {
    const clientName = vente.clientName || vente.table || 'Client inconnu';
    return `
        <div class="client-cell">
            <i class="fas fa-user-circle"></i>
            <span>${escapeHtml(clientName)}</span>
        </div>
    `;
}

// Génère l'affichage Facture pour Commandes
function renderCommandeFactureCell(commande) {
    const cmdId = commande.id?.substring(0, 8) || '---';
    return `
        <div class="facture-cell">
            <i class="fas fa-shopping-basket"></i>
            <span class="facture-number">#CMD-${cmdId}</span>
        </div>
    `;
}

// ========== STYLES CSS DYNAMIQUES ==========
function injectVentesStyles() {
    const styleId = 'ventes-pro-styles-final';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        <style id="${styleId}">
            /* === POLICE GLOBALE 22px === */
            #ventesPage, #commandesPage,
            #ventesPage *, #commandesPage * {
                font-size: 22px !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
            
            /* === EXCEPTIONS === */
            #ventesPage .stat-label, #commandesPage .stat-label,
            #ventesPage .filter-group label, #commandesPage .filter-group label,
            #ventesPage .total-label, #commandesPage .total-label {
                font-size: 16px !important;
            }
            
            #ventesPage .btn-add, #commandesPage .btn-add,
            #ventesPage .btn-edit, #commandesPage .btn-edit,
            #ventesPage .btn-delete, #commandesPage .btn-delete {
                font-size: 18px !important;
            }
            
            #ventesPage .status-success, #commandesPage .status-success,
            #ventesPage .status-warning, #commandesPage .status-warning,
            #ventesPage .status-danger, #commandesPage .status-danger {
                font-size: 18px !important;
                padding: 6px 16px !important;
            }
            
            /* === COLONNES SÉPARÉES === */
            .facture-cell {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 800;
                font-size: 22px !important;
                color: var(--text-primary);
                padding: 4px 12px;
                border-radius: 8px;
                border-left: 3px solid var(--accent);
                background: var(--gray-50);
            }
            
            .facture-cell i {
                color: var(--accent);
                font-size: 20px !important;
            }
            
            .facture-cell .facture-number {
                color: var(--black);
                font-weight: 900;
                font-size: 22px !important;
                background: var(--white);
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
                color: var(--text-secondary);
                font-weight: 500;
            }
            
            .date-cell .date-line i,
            .date-cell .time-line i {
                font-size: 16px !important;
                color: var(--accent);
                opacity: 0.7;
                width: 18px;
            }
            
            .client-cell {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                font-size: 22px !important;
                color: var(--text-primary);
                background: rgba(20, 184, 166, 0.05);
                padding: 4px 12px;
                border-radius: 8px;
            }
            
            .client-cell i {
                color: var(--accent);
                font-size: 20px !important;
            }
            
            /* === TABLEAU GLOBAL === */
            #ventesPage .data-table,
            #commandesPage .data-table {
                font-size: 22px !important;
                border-collapse: separate;
                border-spacing: 0 4px;
            }
            
            #ventesPage .data-table thead th,
            #commandesPage .data-table thead th {
                font-size: 18px !important;
                padding: 14px 18px !important;
                background: var(--gray-50) !important;
                color: var(--text-secondary) !important;
                font-weight: 700 !important;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                border-bottom: 2px solid var(--border);
                position: sticky;
                top: 0;
                z-index: 2;
            }
            
            #ventesPage .data-table thead th i,
            #commandesPage .data-table thead th i {
                font-size: 16px !important;
                margin-right: 6px;
            }
            
            #ventesPage .data-table tbody td,
            #commandesPage .data-table tbody td {
                padding: 14px 16px !important;
                font-size: 22px !important;
                vertical-align: middle;
                background: var(--white);
                border-bottom: 1px solid var(--gray-100);
            }
            
            #ventesPage .data-table tbody tr:hover td,
            #commandesPage .data-table tbody tr:hover td {
                background: var(--gray-50);
            }
            
            /* === MONTANTS === */
            .amount-total {
                font-weight: 800 !important;
                font-size: 24px !important;
                color: var(--black) !important;
                letter-spacing: -0.3px;
            }
            
            /* === BARRE DE RECHERCHE AVEC BOUTON X === */
            .search-bar-pro {
                display: flex;
                align-items: center;
                gap: 6px;
                background: var(--white);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 4px 4px 4px 18px;
                transition: var(--transition);
                flex: 1;
                min-width: 220px;
                position: relative;
            }
            
            .search-bar-pro:focus-within {
                border-color: var(--black);
                box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
            }
            
            .search-bar-pro i.fa-search {
                color: var(--text-muted);
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
                color: var(--text-primary);
                min-width: 100px;
            }
            
            .search-bar-pro input::placeholder {
                color: var(--text-muted);
                font-weight: 400;
                font-size: 20px !important;
            }
            
            /* === BOUTON X POUR EFFACER === */
            .search-clear-btn {
                width: 35px !important;
                height: 35px !important;
                min-width: 35px !important;
                border-radius: 50% !important;
                border: none !important;
                background: var(--gray-200) !important;
                color: var(--text-secondary) !important;
                font-size: 18px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: var(--transition) !important;
                padding: 0 !important;
                margin: 0 2px !important;
            }
            
            .search-clear-btn:hover {
                background: var(--gray-300) !important;
                color: var(--black) !important;
                transform: scale(1.05);
            }
            
            .search-clear-btn.hidden {
                display: none !important;
            }
            
            /* === BOUTON MICRO === */
            .search-bar-pro .btn-add {
                width: 44px !important;
                height: 44px !important;
                border-radius: 10px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                font-size: 18px !important;
                background: var(--black) !important;
                color: var(--white) !important;
                border: none !important;
                cursor: pointer !important;
                transition: var(--transition) !important;
                flex-shrink: 0;
            }
            
            .search-bar-pro .btn-add:hover {
                background: var(--primary-hover) !important;
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
            }
            
            .search-bar-pro .btn-add.listening {
                background: #ef4444 !important;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            /* === BOUTONS D'ACTION === */
            #ventesPage .action-buttons,
            #commandesPage .action-buttons {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            #ventesPage .action-buttons .btn-edit,
            #ventesPage .action-buttons .btn-delete,
            #ventesPage .action-buttons .btn-add,
            #commandesPage .action-buttons .btn-edit,
            #commandesPage .action-buttons .btn-delete,
            #commandesPage .action-buttons .btn-add {
                width: 44px;
                height: 44px;
                border-radius: 10px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                font-size: 18px !important;
                transition: var(--transition);
                border: none;
                background: var(--gray-50);
                color: var(--text-secondary);
                cursor: pointer;
            }
            
            #ventesPage .action-buttons .btn-edit:hover,
            #commandesPage .action-buttons .btn-edit:hover {
                background: var(--gray-200);
                color: var(--black);
                transform: translateY(-2px);
            }
            
            #ventesPage .action-buttons .btn-delete,
            #commandesPage .action-buttons .btn-delete {
                color: var(--danger);
                background: rgba(239, 68, 68, 0.08);
            }
            
            #ventesPage .action-buttons .btn-delete:hover,
            #commandesPage .action-buttons .btn-delete:hover {
                background: rgba(239, 68, 68, 0.15);
                transform: translateY(-2px);
            }
            
            #ventesPage .action-buttons .btn-add,
            #commandesPage .action-buttons .btn-add {
                background: var(--black);
                color: var(--white);
            }
            
            #ventesPage .action-buttons .btn-add:hover,
            #commandesPage .action-buttons .btn-add:hover {
                background: var(--primary-hover);
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
            }
            
            /* === FILTRES === */
            #ventesPage .filter-group,
            #commandesPage .filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            #ventesPage .filter-group label,
            #commandesPage .filter-group label {
                font-size: 16px !important;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            #ventesPage .filter-group select,
            #commandesPage .filter-group select {
                padding: 10px 16px;
                border: 2px solid var(--border);
                border-radius: 10px;
                font-size: 20px !important;
                font-family: 'Inter', sans-serif;
                background: var(--white);
                color: var(--text-primary);
                transition: var(--transition);
                min-width: 140px;
            }
            
            #ventesPage .filter-group select:focus,
            #commandesPage .filter-group select:focus {
                border-color: var(--black);
                outline: none;
                box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
            }
            
            /* === TOTAL EN BAS === */
            #ventesPage .total-row-pro,
            #commandesPage .total-row-pro {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 32px;
                padding: 18px 24px;
                background: var(--gray-50);
                border-radius: 14px;
                margin-top: 18px;
                border: 1px solid var(--border);
                flex-wrap: wrap;
            }
            
            #ventesPage .total-row-pro .total-label,
            #commandesPage .total-row-pro .total-label {
                font-size: 16px !important;
                font-weight: 700;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            #ventesPage .total-row-pro .total-amount,
            #commandesPage .total-row-pro .total-amount {
                font-size: 28px !important;
                font-weight: 900;
                color: var(--black);
                letter-spacing: -0.5px;
            }
            
            #ventesPage .total-row-pro .total-amount i,
            #commandesPage .total-row-pro .total-amount i {
                color: var(--accent);
                font-size: 22px !important;
                margin-right: 6px;
            }
            
            /* === RESPONSIVE === */
            @media(max-width:768px) {
                #ventesPage .data-table tbody td,
                #commandesPage .data-table tbody td {
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
            }
            
            @media(max-width:500px) {
                #ventesPage .data-table tbody td,
                #commandesPage .data-table tbody td {
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
                
                #ventesPage .filter-group select,
                #commandesPage .filter-group select {
                    font-size: 16px !important;
                    padding: 8px 12px !important;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ============================================================
// RECONNAISSANCE VOCALE - AVEC FILTRES DE DATE
// ============================================================

// Mapping des mots-clés pour les filtres de date
const dateFilterKeywords = {
    'aujourd\'hui': 'today',
    'aujourd hui': 'today',
    'ajourdhui': 'today',
    'ce mois': 'month',
    'cemois': 'month',
    'ce mois-ci': 'month',
    'cette semaine': 'week',
    'cettesemaine': 'week',
    'cette année': 'year',
    'cetteannee': 'year',
    'cette annee': 'year',
    'toute les ventes': 'all',
    'toutes les ventes': 'all',
    'tout': 'all'
};

function detectDateFilter(text) {
    const lower = text.toLowerCase().trim();
    for (const [keyword, value] of Object.entries(dateFilterKeywords)) {
        if (lower.includes(keyword)) {
            return value;
        }
    }
    return null;
}

/**
 * Active/désactive la reconnaissance vocale
 * @param {string} target - 'ventes' ou 'commandes'
 */
function toggleVoiceRecognition(target) {
    window.voiceCurrentTarget = target;
    
    // Si déjà en écoute, on arrête
    if (window.voiceIsListening) {
        stopVoiceRecognition();
        return;
    }
    
    // Vérifier le support du navigateur
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('❌ La reconnaissance vocale n\'est pas supportée par votre navigateur.\n' +
              'Utilisez Chrome, Edge ou Safari sur iOS.');
        return;
    }
    
    // Créer l'instance
    window.voiceRecognition = new SpeechRecognition();
    const recognition = window.voiceRecognition;
    
    // Configuration
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Indicateur visuel
    const searchField = document.getElementById(target + 'SearchInput');
    const micBtn = document.querySelector(`#${target}Page .search-bar-pro .btn-add`);
    
    if (micBtn) {
        micBtn.classList.add('listening');
        micBtn.innerHTML = '<i class="fas fa-stop"></i>';
        micBtn.title = 'Arrêter l\'écoute';
    }
    
    window.voiceIsListening = true;
    
    // Résultats intermédiaires
    recognition.onresult = function(event) {
        let final = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }
        
        const text = final || interim;
        
        // Afficher dans le champ de recherche
        if (searchField) {
            searchField.value = text.trim();
            // Déclencher l'événement pour la recherche
            const event = new Event('keyup');
            searchField.dispatchEvent(event);
        }
        
        // Si résultat final, on traite
        if (final) {
            const cleanText = final.trim();
            
            // Vérifier si c'est un filtre de date
            const detectedFilter = detectDateFilter(cleanText);
            if (detectedFilter) {
                // Appliquer le filtre de date
                const periodSelect = document.getElementById(target + 'PeriodSelect');
                if (periodSelect) {
                    periodSelect.value = detectedFilter;
                    // Déclencher l'événement change
                    const changeEvent = new Event('change');
                    periodSelect.dispatchEvent(changeEvent);
                }
                // Effacer le texte de la barre de recherche
                if (searchField) {
                    searchField.value = '';
                    const event = new Event('keyup');
                    searchField.dispatchEvent(event);
                }
                // Afficher une notification
                const filterLabels = {
                    'today': 'Aujourd\'hui',
                    'week': 'Cette semaine',
                    'month': 'Ce mois',
                    'year': 'Cette année',
                    'all': 'Toutes les ventes'
                };
                showVoiceNotification(`📅 Filtre appliqué : ${filterLabels[detectedFilter] || detectedFilter}`);
            } else {
                // Recherche normale
                if (searchField) {
                    searchField.value = cleanText;
                    const event = new Event('keyup');
                    searchField.dispatchEvent(event);
                }
                showVoiceNotification(`🔍 Recherche : "${cleanText}"`);
            }
            
            // Effacer l'affichage vocal après 3 secondes
            setTimeout(() => {
                if (searchField && searchField.value === cleanText) {
                    // On garde le texte, l'utilisateur peut le voir
                }
            }, 100);
            
            stopVoiceRecognition();
        }
    };
    
    // Erreur
    recognition.onerror = function(event) {
        console.error('Erreur vocal:', event.error);
        let msg = '❌ Erreur: ';
        switch(event.error) {
            case 'not-allowed': msg += 'Microphone non autorisé'; break;
            case 'no-speech': msg += 'Aucun son détecté'; break;
            case 'audio-capture': msg += 'Microphone inaccessible'; break;
            case 'network': msg += 'Problème réseau'; break;
            default: msg += event.error;
        }
        showVoiceNotification(msg);
        window.voiceIsListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.title = 'Recherche vocale';
        }
    };
    
    // Fin
    recognition.onend = function() {
        window.voiceIsListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.title = 'Recherche vocale';
        }
    };
    
    // Démarrer
    try {
        recognition.start();
    } catch (e) {
        console.error('Erreur démarrage vocal:', e);
        window.voiceIsListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.title = 'Recherche vocale';
        }
        showVoiceNotification('❌ Erreur de démarrage');
    }
}

/**
 * Arrête la reconnaissance vocale
 */
function stopVoiceRecognition() {
    if (window.voiceRecognition) {
        try {
            window.voiceRecognition.stop();
        } catch (e) {}
        window.voiceRecognition = null;
    }
    window.voiceIsListening = false;
    
    const target = window.voiceCurrentTarget || 'ventes';
    const micBtn = document.querySelector(`#${target}Page .search-bar-pro .btn-add`);
    if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        micBtn.title = 'Recherche vocale';
    }
}

/**
 * Affiche une notification vocale
 */
function showVoiceNotification(message) {
    // Créer ou récupérer la notification
    let notif = document.getElementById('voiceNotification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'voiceNotification';
        notif.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--black);
            color: var(--white);
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 22px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            transition: opacity 0.3s ease;
            opacity: 0;
            pointer-events: none;
            font-family: 'Inter', sans-serif;
        `;
        document.body.appendChild(notif);
    }
    
    notif.textContent = message;
    notif.style.opacity = '1';
    
    clearTimeout(window.voiceNotifTimeout);
    window.voiceNotifTimeout = setTimeout(() => {
        notif.style.opacity = '0';
    }, 3000);
}

// Fonction pour effacer la recherche
function clearSearch(target) {
    const searchField = document.getElementById(target + 'SearchInput');
    if (searchField) {
        searchField.value = '';
        const event = new Event('keyup');
        searchField.dispatchEvent(event);
        // Masquer le bouton X
        const clearBtn = document.getElementById(target + 'ClearBtn');
        if (clearBtn) {
            clearBtn.classList.add('hidden');
        }
    }
}

// Fonction pour gérer l'affichage du bouton X
function handleSearchInput(target) {
    const searchField = document.getElementById(target + 'SearchInput');
    const clearBtn = document.getElementById(target + 'ClearBtn');
    if (searchField && clearBtn) {
        if (searchField.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
}

// ==================== COMMANDES EN LIGNE (PRO) ====================
function loadCommandesPage(c) {
    injectVentesStyles();
    
    c.innerHTML = `
        <div class="content-card" id="commandesPage">
            <div class="card-header">
                <h3 style="font-size:26px !important;"><i class="fas fa-shopping-basket"></i> Commandes en ligne</h3>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="commandesSearchInput" 
                               placeholder="Rechercher (client, email, tél, produit)..."
                               onkeyup="window.commandesSearch = this.value; window.currentPages.commandes=1; handleSearchInput('commandes'); applyCommandesFilters();">
                        <button class="search-clear-btn hidden" id="commandesClearBtn" onclick="clearSearch('commandes')" title="Effacer la recherche">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-add" onclick="toggleVoiceRecognition('commandes')" title="Recherche vocale">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <div class="filter-group">
                        <label><i class="far fa-calendar-alt"></i> Période</label>
                        <select id="commandesPeriodSelect" onchange="window.commandesPeriod = this.value; window.currentPages.commandes=1; applyCommandesFilters();">
                            ${getPeriodOptions('all')}
                        </select>
                    </div>
                    <button class="btn-add" onclick="loadCommandes()" style="font-size:20px !important;padding:10px 20px !important;">
                        <i class="fas fa-sync-alt"></i> Actualiser
                    </button>
                </div>
            </div>
            <div id="commandesTableContainer"></div>
            <div id="commandesPagination" style="margin-top:12px;"></div>
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
                <p style="margin-top:16px;color:#6b7280;font-size:24px !important;">Aucune commande trouvée</p>
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
                        <th style="min-width:160px;"><i class="fas fa-receipt"></i> Facture</th>
                        <th style="min-width:150px;"><i class="far fa-calendar-alt"></i> Date / Heure</th>
                        <th style="min-width:180px;"><i class="fas fa-user"></i> Client</th>
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
        const factureHtml = renderCommandeFactureCell(d);
        const dt = d.createdAt ? formatDateHeure(d.createdAt.seconds) : { date: '-', time: '-', full: '-' };
        const dateHtml = `
            <div class="date-cell">
                <div class="date-line"><i class="far fa-calendar-alt"></i> ${dt.date}</div>
                <div class="time-line"><i class="far fa-clock"></i> ${dt.time}</div>
            </div>
        `;
        const clientHtml = `
            <div class="client-cell">
                <i class="fas fa-user-circle"></i> ${escapeHtml(d.clientName || 'Client inconnu')}
            </div>
        `;
        var arts = d.items ? d.items.map(function(it) { 
            return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom); 
        }).join('<br>') : '-';
        
        var opts = d.items ? d.items.map(function(it) {
            var o = [];
            if (it.sauces && it.sauces.length) o.push('<span style="color:#2E7D32;">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
            if (it.interdits && it.interdits.length) o.push('<span style="color:#ef4444;">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
            if (it.epice && it.epice !== 'Normal') o.push('<span style="color:#d97706;">🌶️' + escapeHtml(it.epice) + '</span>');
            if (it.sel && it.sel !== 'Normal') o.push('<span style="color:#4f46e5;">🧂' + escapeHtml(it.sel) + '</span>');
            return o.length ? o.join(' | ') : '<span style="color:#9ca3af;">Aucune option</span>';
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
            act = `<span style="color:#10B981;font-weight:600;font-size:20px !important;"><i class="fas fa-check-circle"></i> Payée</span>`;
        } else {
            act = `<span style="color:#9ca3af;">${d.statut || '-'}</span>`;
        }
        
        h += `
            <tr>
                <td>${factureHtml}</td>
                <td>${dateHtml}</td>
                <td>${clientHtml}</td>
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

// Fonctions commandes (inchangées)
async function validateCommande(cid) {
    if (!confirm('Valider cette commande ?')) return;
    await CacheDB.write('commandes', cid, {
        statut: 'valide',
        validatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        validatedBy: window.currentUserData ? window.currentUserData.userData.prenom + ' ' + window.currentUserData.userData.nom : 'Admin'
    }, 'update');
    alert('✅ Validée !');
    loadCommandes();
    CacheDB.sync();
}

async function payCommande(cid) {
    if (!confirm('Payer cette commande ? Redirection vers le POS...')) return;
    var dc = await db.collection('commandes').doc(cid).get();
    if (!dc.exists) { alert('Introuvable'); return; }
    var cmd = dc.data();
    localStorage.setItem('posCommandeData', JSON.stringify({
        commandeId: cid,
        clientId: cmd.clientId,
        clientName: cmd.clientName,
        items: cmd.items,
        total: cmd.total,
        table: cmd.table || ''
    }));
    navigateTo('pos');
}

function cancelCommande(cid) {
    if (confirm('Annuler ?')) {
        CacheDB.write('commandes', cid, { statut: 'annule' }, 'update').then(function() {
            alert('❌ Annulée');
            loadCommandes();
            CacheDB.sync();
        });
    }
}

// ==================== VENTES (PRO) ====================
function loadVentesPage(c) {
    injectVentesStyles();
    
    window.ventesPeriod = 'all';
    window.ventesSearch = '';
    window.venteSelectionMode = false;
    window.venteSelectedIndex = -1;
    if (!window.sortOrders.ventes) window.sortOrders.ventes = {};
    if (!window.sortOrders.ventes.createdAt) { window.sortOrders.ventes.createdAt = 'desc'; }
    
    c.innerHTML = `
        <div class="content-card" id="ventesPage">
            <div class="card-header">
                <h3 style="font-size:26px !important;"><i class="fas fa-shopping-cart"></i> Ventes</h3>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar-pro">
                        <i class="fas fa-search"></i>
                        <input type="text" id="ventesSearchInput" 
                               placeholder="Rechercher (client, produit)..."
                               onkeyup="window.ventesSearch = this.value; window.currentPages.ventes=1; handleSearchInput('ventes'); applyVentesFilters();">
                        <button class="search-clear-btn hidden" id="ventesClearBtn" onclick="clearSearch('ventes')" title="Effacer la recherche">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-add" onclick="toggleVoiceRecognition('ventes')" title="Recherche vocale">
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
                    <button class="btn-add" onclick="loadVentes()" style="font-size:20px !important;padding:10px 20px !important;">
                        <i class="fas fa-sync-alt"></i> Actualiser
                    </button>
                </div>
            </div>
            <div id="ventesTableContainer"></div>
            <div id="ventesPagination" style="margin-top:12px;"></div>
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
                <p style="margin-top:16px;color:#6b7280;font-size:24px !important;">Aucune vente trouvée</p>
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
                        <th style="min-width:160px;"><i class="fas fa-receipt"></i> Facture</th>
                        <th style="min-width:150px;"><i class="far fa-calendar-alt"></i> Date / Heure</th>
                        <th style="min-width:180px;"><i class="fas fa-user"></i> Client</th>
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
        const factureHtml = renderFactureCell(d);
        const dateHtml = renderDateCell(d);
        const clientHtml = renderClientCell(d);
        
        var arts = d.items ? d.items.map(function(it) { 
            return '<strong>' + it.quantite + 'x</strong> ' + escapeHtml(it.nom); 
        }).join('<br>') : '-';
        
        var opts = d.items ? d.items.map(function(it) {
            var o = [];
            if (it.sauces && it.sauces.length) o.push('<span style="color:#2E7D32;">🥫' + escapeHtml(it.sauces.join(',')) + '</span>');
            if (it.interdits && it.interdits.length) o.push('<span style="color:#ef4444;">🚫' + escapeHtml(it.interdits.join(',')) + '</span>');
            if (it.epice && it.epice !== 'Normal') o.push('<span style="color:#d97706;">🌶️' + escapeHtml(it.epice) + '</span>');
            if (it.sel && it.sel !== 'Normal') o.push('<span style="color:#4f46e5;">🧂' + escapeHtml(it.sel) + '</span>');
            return o.length ? o.join(' | ') : '<span style="color:#9ca3af;">Aucune option</span>';
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
            <td>${factureHtml}</td>
            <td>${dateHtml}</td>
            <td>${clientHtml}</td>
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

// ==================== ÉDITER VENTE ====================
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

// ==================== WHATSAPP ====================
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
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.stopVoiceRecognition = stopVoiceRecognition;
window.clearSearch = clearSearch;
window.handleSearchInput = handleSearchInput;
window.injectVentesStyles = injectVentesStyles;
window.showVoiceNotification = showVoiceNotification;

console.log('🛒 Mixmax Minimarket - Admin Ventes PRO FINAL chargé ✅');
console.log('🎤 Reconnaissance vocale avec filtres de date activée');
console.log('❌ Bouton X pour effacer la recherche (35px)');
