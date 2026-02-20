const Auth = {
	currentUser: null,

	init() {
		console.log("Auth.init() appelé");

		// Restore session from localStorage
		const savedUser = localStorage.getItem("currentUser");
		if (savedUser) {
			try {
				this.currentUser = JSON.parse(savedUser);
				console.log("✓ Utilisateur restauré:", this.currentUser.name);
			} catch (e) {
				console.error(
					"Erreur lors de la restauration de l'utilisateur:",
					e,
				);
				localStorage.removeItem("currentUser");
			}
		}
	},

	login(username, password) {
		console.log("🔐 Tentative de connexion:", { username });
		const users = DataManager.get("users");
		console.log("Utilisateurs disponibles:", users.length);

		const user = users.find(
			(u) =>
				u.username.toLowerCase() === username.toLowerCase() &&
				u.password === password &&
				u.active,
		);

		if (user) {
			console.log("✓ Connexion réussie:", user.name);
			// Save previous login timestamp before overwriting
			const prevSession = localStorage.getItem(`lastLogin_${user.username}`);
			const now = new Date().toISOString();
			if (prevSession) {
				localStorage.setItem(`prevLogin_${user.username}`, prevSession);
			}
			localStorage.setItem(`lastLogin_${user.username}`, now);
			this.currentUser = { ...user, lastLogin: prevSession || null };
			localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
			DataManager.addLog("Connexion", `${user.name} connecté`, user.id);
			return true;
		}

		console.log("✗ Identifiants incorrects");
		return false;
	},

	logout() {
		if (this.currentUser) {
			DataManager.addLog(
				"Déconnexion",
				`${this.currentUser.name} déconnecté`,
				this.currentUser.id,
			);
			console.log("🔓 Déconnexion:", this.currentUser.name);
		}
		this.currentUser = null;
		localStorage.removeItem("currentUser");
		window.location.reload();
	},

	isAuthenticated() {
		return this.currentUser !== null;
	},

	getCurrentUser() {
		return this.currentUser;
	},

	hasPermission(permission) {
		if (!this.currentUser) return false;

		const permissions = {
			admin: [
				"view",
				"create",
				"edit",
				"delete",
				"manageUsers",
				"viewLogs",
			],
			member: ["view", "create", "edit"],
			viewer: ["view"],
			finance: ["view"],
		};

		return (
			permissions[this.currentUser.role]?.includes(permission) || false
		);
	},

	// Returns allowed pages per role (null = all pages)
	getAllowedPages(role) {
		const allowedPages = {
			finance: ["dashboard", "sales", "clients", "accounting"],
		};
		return allowedPages[role] || null; // null = full access
	},

	canAccessPage(pageId) {
		if (!this.currentUser) return false;
		const allowed = this.getAllowedPages(this.currentUser.role);
		if (allowed === null) return true;
		return allowed.includes(pageId);
	},
};

window.Auth = Auth;
