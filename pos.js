// ✅ AJOUT : Récupération du paiement de crédit
var creditData = localStorage.getItem('posPayerCredit');

// ... plus tard dans le code ...

// ✅ AJOUT : Paiement de crédit
if(creditData){
    try {
        var data = JSON.parse(creditData);
        localStorage.removeItem('posPayerCredit');
        
        console.log('💳 Paiement crédit:', data);
        
        // Pré-remplir le POS
        if (data.clientName) {
            posCurrentClient = { id: data.clientId, name: data.clientName };
            setTimeout(function() {
                var ci = document.getElementById('posClientSearchInput');
                if (ci) ci.value = data.clientName;
            }, 300);
        }
        // ... etc
    } catch(e) {
        console.warn('Erreur chargement crédit:', e);
    }
}
