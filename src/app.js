document.addEventListener("DOMContentLoaded", () => {
	console.log("=== 🚀 Application Lance Strategy - Démarrage ===");

	try {
		// Init DataManager first
		DataManager.init();
		console.log("✓ DataManager initialisé");

		// Init auth
		Auth.init();
		console.log("✓ Auth initialisé");

		// Check if user is authenticated
		if (!Auth.isAuthenticated()) {
			console.log("→ Affichage du formulaire de connexion");
			showLoginForm();
		} else {
			console.log(
				"→ Application chargée pour:",
				Auth.getCurrentUser().name,
			);
			showApp();
		}
	} catch (error) {
		console.error("❌ Erreur lors du démarrage:", error);
		document.body.innerHTML = `
			<div style="padding: 2rem; background: #ffe6e6; color: #c00; font-family: monospace; white-space: pre-wrap;">
				ERREUR: ${error.message}
				${error.stack}
			</div>
		`;
	}
});

function showLoginForm() {
	document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2" style="margin-bottom: 1rem;">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <h1 style="color: #4a90e2; margin: 0; font-size: 1.75rem;">Lance Strategy</h1>
                    <p style="color: #6c757d; margin-top: 0.5rem; font-size: 0.95rem;">Gestion de Stock & Ventes</p>
                </div>
                
                <form id="loginForm" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #212529; font-size: 0.95rem;">
                            Nom d'utilisateur
                        </label>
                        <input 
                            type="text" 
                            id="username" 
                            required 
                            autocomplete="username"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #dee2e6; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;"
                        >
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #212529; font-size: 0.95rem;">
                            Mot de passe
                        </label>
                        <input 
                            type="password" 
                            id="password" 
                            required 
                            autocomplete="current-password"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #dee2e6; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;"
                        >
                    </div>

                    <div id="loginError" style="display: none; padding: 0.75rem; background: rgba(220, 53, 69, 0.1); color: #dc3545; border-radius: 8px; font-size: 0.9rem; text-align: center;">
                    </div>

                    <button 
                        type="submit" 
                        style="width: 100%; padding: 0.875rem; background: #4a90e2; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease;"
                        onmouseover="this.style.background='#357abd'; this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.background='#4a90e2'; this.style.transform='translateY(0)'"
                    >
                        Se connecter
                    </button>
                </form>

                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 0.85rem; text-align: center; margin-bottom: 0.75rem;">
                        <strong>Comptes de test :</strong>
                    </p>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; font-size: 0.85rem;">
                        <p style="margin: 0.25rem 0;"><strong>Admin :</strong> fabien / admin123</p>
                        <p style="margin: 0.25rem 0;"><strong>Membre :</strong> gino / gino123</p>
                    </div>
                </div>
            </div>
        </div>
    `;

	document.getElementById("loginForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const username = document.getElementById("username").value.trim();
		const password = document.getElementById("password").value.trim();
		const errorDiv = document.getElementById("loginError");

		console.log("🔐 Tentative:", username);

		if (Auth.login(username, password)) {
			console.log("✓ Connexion réussie");
			showApp();
		} else {
			console.log("✗ Échec connexion");
			errorDiv.textContent = "❌ Identifiants incorrects";
			errorDiv.style.display = "block";

			setTimeout(() => {
				errorDiv.style.display = "none";
			}, 3000);
		}
	});
}

function showApp() {
	console.log("→ Construction de l'application");
	document.body.innerHTML = `
        <div class="app-container">
            <aside id="sidebar" class="sidebar"></aside>
            <main class="main-content">
                <div class="content-wrapper">
                    <div id="dashboardPage" class="page-content"></div>
                    <div id="productsPage" class="page-content"></div>
                    <div id="salesPage" class="page-content"></div>
                    <div id="tasksPage" class="page-content"></div>
                    <div id="usersPage" class="page-content"></div>
                    <div id="clientsPage" class="page-content"></div>
                    <div id="accountingPage" class="page-content"></div>
                    <div id="analyticsPage" class="page-content"></div>
                    <div id="projectsPage" class="page-content"></div>
                    <div id="calendarPage" class="page-content"></div>
                    <div id="logsPage" class="page-content"></div>
                </div>
            </main>
        </div>
        <div id="toastContainer" class="toast-container"></div>
        <div id="confirmModal" class="modal">
            <div class="modal-content modal-sm">
                <div class="modal-body">
                    <div class="confirm-icon" id="confirmIcon"></div>
                    <p id="confirmMessage"></p>
                </div>
                <div class="modal-footer">
                    <button id="confirmCancel" class="btn-secondary">Annuler</button>
                    <button id="confirmOk" class="btn-primary">Confirmer</button>
                </div>
            </div>
        </div>
    `;

	Navigation.init();
	console.log("✓ Application chargée");
}
