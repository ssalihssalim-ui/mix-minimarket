// ==================== AUTH.JS - ALMA COFFEE SHOP ====================
var currentUser = null;
var currentUserData = null;

// ==================== CONNEXION RAPIDE ADMIN ====================
// 🔓 Bouton à côté du formulaire — Admin uniquement — Token permanent

var QUICK_LOGIN_KEY = 'esolution_quick_login_admin';

function saveAdminQuickLogin(uid, email, password) {
    try {
        var payload = {
            uid: uid,
            email: email,
            pwd: btoa(password),
            savedAt: Date.now()
        };
        localStorage.setItem(QUICK_LOGIN_KEY, JSON.stringify(payload));
        console.log('✅ Connexion rapide admin activée');
        refreshQuickLoginButton();
    } catch(e) { console.warn('Erreur save quick login:', e); }
}

function getAdminQuickLogin() {
    try {
        var raw = localStorage.getItem(QUICK_LOGIN_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data.uid || !data.email || !data.pwd) return null;
        return data;
    } catch(e) { return null; }
}

function revokeAdminQuickLogin() {
    try {
        localStorage.removeItem(QUICK_LOGIN_KEY);
        console.log('🚫 Connexion rapide admin révoquée');
        refreshQuickLoginButton();
    } catch(e) {}
}

function refreshQuickLoginButton() {
    var btn = document.getElementById('quickLoginBtn');
    if (!btn) return;
    var data = getAdminQuickLogin();
    if (data && data.email) {
        btn.style.display = 'flex';
        btn.title = 'Connexion rapide — ' + data.email;
        btn.innerHTML = '<i class="fas fa-unlock"></i>';
    } else {
        btn.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-unlock"></i>';
    }
}

async function tryAdminQuickLogin() {
    var data = getAdminQuickLogin();
    if (!data) { alert('❌ Aucune connexion rapide enregistrée.'); return; }

    var btn = document.getElementById('quickLoginBtn');
    var originalHTML = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        var password = atob(data.pwd);
        var uc = await auth.signInWithEmailAndPassword(data.email, password);
        var doc = await db.collection('users').doc(uc.user.uid).get();
        if (!doc.exists) { throw new Error('Compte introuvable'); }
        var userData = doc.data();
        if (userData.authorized !== 'yes') {
            auth.signOut();
            throw new Error('Compte en attente de validation');
        }
        if (userData.role !== 'admin') {
            auth.signOut();
            revokeAdminQuickLogin();
            throw new Error('Connexion rapide réservée aux administrateurs');
        }
        window.currentUserData = { uid: doc.id, userData: userData };
        await CacheDB.set('users', doc.id, window.currentUserData);
        if (typeof CacheDB !== 'undefined' && CacheDB.set) {
            await CacheDB.set('users', 'current', window.currentUserData);
        }
        showDashboard();
        console.log('🚀 Connexion rapide admin OK');
    } catch(e) {
        console.warn('Erreur connexion rapide:', e);
        alert('❌ ' + (e.message || 'Erreur de connexion rapide'));
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
    }
}

function promptActivateQuickLogin(uid, email, password) {
    var existing = getAdminQuickLogin();
    if (existing && existing.uid === uid) { refreshQuickLoginButton(); return; }

    var overlay = document.createElement('div');
    overlay.id = 'quickLoginPrompt';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
    overlay.innerHTML =
        '<div style="background:#fff;border-radius:20px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">' +
            '<div style="font-size:3rem;margin-bottom:10px;">🔓</div>' +
            '<h3 style="font-size:1.2rem;font-weight:800;color:#1A1D1F;margin:0 0 8px;">Activer la connexion rapide ?</h3>' +
            '<p style="font-size:0.9rem;color:#6F767E;margin:0 0 20px;line-height:1.5;">' +
                'À l\'avenir, vous pourrez vous reconnecter en 1 clic via le bouton <strong>🔓</strong> à côté du formulaire.<br>' +
                '<small style="color:#9A9FA5;">Réservé aux administrateurs sur cet appareil.</small>' +
            '</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
                '<button id="quickLoginNo" style="background:#F7F8FA;color:#6F767E;border:none;border-radius:10px;padding:12px 24px;font-weight:600;cursor:pointer;font-size:0.95rem;">Non merci</button>' +
                '<button id="quickLoginYes" style="background:#2563EB;color:#fff;border:none;border-radius:10px;padding:12px 24px;font-weight:700;cursor:pointer;font-size:0.95rem;">✅ Oui, activer</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    document.getElementById('quickLoginYes').onclick = function() {
        saveAdminQuickLogin(uid, email, password);
        document.body.removeChild(overlay);
        alert('✅ Connexion rapide activée !');
    };
    document.getElementById('quickLoginNo').onclick = function() {
        document.body.removeChild(overlay);
    };
}

// ==================== LOGIN NORMAL ====================
function handleLogin(event) {
    event.preventDefault();
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var btn = document.getElementById('loginBtn');
    if (!email || !password) { showLoginError('Veuillez remplir tous les champs'); return false; }
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    hideLoginError();
    auth.signInWithEmailAndPassword(email, password)
        .then(function(uc) { return db.collection('users').doc(uc.user.uid).get(); })
        .then(async function(doc) {
            if (!doc.exists) { auth.signOut(); showLoginError('Compte introuvable'); return; }
            var userData = doc.data();
            if (userData.authorized !== 'yes') { auth.signOut(); showLoginError('Compte en attente de validation'); return; }
            window.currentUserData = { uid: doc.id, userData: userData };
            await CacheDB.set('users', doc.id, window.currentUserData);

            // 🆕 Si admin : proposer d'activer la connexion rapide
            if (userData.role === 'admin') {
                setTimeout(function() {
                    promptActivateQuickLogin(doc.id, email, password);
                }, 800);
            }

            if (userData.role === 'client') showClientPage(); else showDashboard();
        })
        .catch(function(error) {
            var msg = 'Erreur de connexion';
            if (error.code === 'auth/user-not-found') msg = 'Email introuvable';
            else if (error.code === 'auth/wrong-password') msg = 'Mot de passe incorrect';
            showLoginError(msg);
        })
        .finally(function() { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter'; });
    return false;
}

function showLoginError(msg) {
    var el = document.getElementById('loginError');
    if (!el) { el = document.createElement('div'); el.id = 'loginError'; el.style.cssText = 'background:#fee2e2;color:#991b1b;padding:12px 15px;border-radius:12px;margin-bottom:15px;font-size:0.9rem;text-align:center;border:2px solid #fecaca;'; var form = document.getElementById('loginForm'); if (form) form.parentNode.insertBefore(el, form); }
    el.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + msg; el.style.display = 'block';
}
function hideLoginError() { var e = document.getElementById('loginError'); if (e) e.style.display = 'none'; }

function handleRegister(event) {
    event.preventDefault();
    var nom = document.getElementById('regNom').value.trim(), prenom = document.getElementById('regPrenom').value.trim(), username = document.getElementById('regUsername').value.trim(), email = document.getElementById('regEmail').value.trim(), telephone = document.getElementById('regTelephone').value.trim(), role = document.getElementById('regRole').value, password = document.getElementById('regPassword').value, btn = document.getElementById('registerBtn');
    var msgBox = document.getElementById('registerMsgBox');
    if (!msgBox) { msgBox = document.createElement('div'); msgBox.id = 'registerMsgBox'; msgBox.style.cssText = 'padding:12px 15px;border-radius:12px;margin-bottom:15px;font-size:0.9rem;text-align:center;display:none;'; var container = document.querySelector('#registerContainer .register-form'); if (container) container.insertBefore(msgBox, container.firstChild); }
    msgBox.style.display = 'none';
    if (!nom || !prenom || !username || !email || !telephone || !role || !password) { msgBox.style.background = '#fee2e2'; msgBox.style.color = '#991b1b'; msgBox.style.border = '2px solid #fecaca'; msgBox.innerHTML = 'Tous les champs sont obligatoires'; msgBox.style.display = 'block'; return false; }
    if (password.length < 6) { msgBox.style.background = '#fee2e2'; msgBox.style.color = '#991b1b'; msgBox.style.border = '2px solid #fecaca'; msgBox.innerHTML = 'Mot de passe: 6 caractères minimum'; msgBox.style.display = 'block'; return false; }
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
    auth.createUserWithEmailAndPassword(email, password)
        .then(function(uc) { return db.collection('users').doc(uc.user.uid).set({ nom:nom, prenom:prenom, username:username, email:email, telephone:telephone, role:role, authorized:'no', createdAt:firebase.firestore.FieldValue.serverTimestamp() }); })
        .then(async function() {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
            msgBox.style.background = '#dcfce7'; msgBox.style.color = '#16a34a'; msgBox.style.border = '2px solid #bbf7d0';
            msgBox.innerHTML = '✅ Compte créé avec succès ! En attente de validation.'; msgBox.style.display = 'block';
            document.getElementById('registerForm').reset();
            setTimeout(function() { showLogin(); }, 2000);
        })
        .catch(function(error) {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
            var msg = 'Erreur'; if (error.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé'; else if (error.code === 'auth/weak-password') msg = 'Mot de passe trop faible';
            msgBox.style.background = '#fee2e2'; msgBox.style.color = '#991b1b'; msgBox.style.border = '2px solid #fecaca'; msgBox.innerHTML = msg; msgBox.style.display = 'block';
        });
    return false;
}

function handleLogout() { auth.signOut().then(function() { window.currentUser = null; window.currentUserData = null; showAuthPage(); }); }
function showLogin() {
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('registerContainer').classList.add('hidden');
    hideLoginError();
    // 🆕 Rafraîchir le bouton 🔓 à l'affichage du login
    setTimeout(refreshQuickLoginButton, 100);
}
function showRegister() { document.getElementById('loginContainer').classList.add('hidden'); document.getElementById('registerContainer').classList.remove('hidden'); hideLoginError(); }
function showAuthPage() {
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
    document.getElementById('clientPage').classList.add('hidden');
    // 🆕 Rafraîchir le bouton 🔓 à l'affichage de la page auth
    setTimeout(refreshQuickLoginButton, 100);
}

// 🆕 Initialisation : afficher le bouton 🔓 si un token existe déjà
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        setTimeout(refreshQuickLoginButton, 300);
    });
}

console.log('☕ Alma Coffee Shop - Auth JS OK');
