/**
 * Navigation - Handles page routing, dashboard stats, and UI navigation
 * @namespace Navigation
 */
const Navigation = {
	/** @type {string} Currently active page */
	currentPage: "dashboard",

	// Menu split into two groups: top nav and bottom nav
	menuItemsTop: [
		{
			category: "PRINCIPAL",
			items: [
				{
					id: "dashboard",
					label: "Accueil",
					icon: "home",
					permission: null,
				},
				{
					id: "tasks",
					label: "Tâches",
					icon: "tasks",
					permission: "view",
				},
				{
					id: "projects",
					label: "Projets",
					icon: "folder",
					permission: "view",
				},
				{
					id: "calendar",
					label: "Calendrier",
					icon: "calendar",
					permission: "view",
				},
			],
		},
	],

	menuItemsBottom: [
		{
			category: "GESTION",
			items: [
				{
					id: "products",
					label: "Stock actuel",
					icon: "box",
					permission: "view",
				},
				{
					id: "sales",
					label: "Ventes",
					icon: "cart",
					permission: "view",
				},
				{
					id: "clients",
					label: "Clients",
					icon: "users",
					permission: "view",
				},
				{
					id: "accounting",
					label: "Comptabilité",
					icon: "coin",
					permission: "view",
				},
				{
					id: "analytics",
					label: "Analytics",
					icon: "chart",
					permission: "view",
				},
			],
		},
		{
			category: "ADMIN",
			items: [
				{
					id: "users",
					label: "Utilisateurs",
					icon: "user",
					permission: "manageUsers",
				},
				{
					id: "logs",
					label: "Logs",
					icon: "logs",
					permission: "viewLogs",
				},
			],
		},
	],

	// Getter for backward compatibility
	get menuItems() {
		return [...this.menuItemsTop, ...this.menuItemsBottom];
	},

	icons: {
		home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7"/><path d="M9 22V12h6v10"/></svg>`,
		box: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>`,
		cart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
		users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
		tasks: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
		folder: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
		calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
		coin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
		chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
		user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
		logs: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
		settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.18a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.18a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 1 1 4 0v.18a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.18a1.65 1.65 0 0 0-1.82.33 1.65 1.65 0 0 0-.6 1z"/></svg>`,
		moon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
		sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
		logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
	},

	init() {
		console.log("Navigation.init()");
		this.applyTheme();
		this.renderSidebar();
		this.bindEvents();
		this.navigateTo("dashboard");
	},

	renderMenuGroup(categories) {
		return categories
			.map((category) => {
				const categoryItems = category.items
					.filter(
						(item) =>
							(!item.permission ||
								Auth.hasPermission(item.permission)) &&
							Auth.canAccessPage(item.id),
					)
					.map(
						(item) => `
						<li>
							<a href="#${item.id}" class="nav-link" data-page="${item.id}">
								<span class="nav-icon">${this.icons[item.icon] || ""}</span>
								<span class="nav-label">${item.label}</span>
							</a>
						</li>
					`,
					)
					.join("");

				return categoryItems
					? `<div class="nav-category">
						<div class="nav-category-title">${category.category}</div>
						<ul class="nav-menu">${categoryItems}</ul>
					</div>`
					: "";
			})
			.join("");
	},

	renderSidebar() {
		const sidebar = document.getElementById("sidebar");
		const currentUser = Auth.getCurrentUser();

		if (!currentUser) {
			console.error("❌ Pas d'utilisateur connecté");
			return;
		}

		const topMenuHTML = this.renderMenuGroup(this.menuItemsTop);
		const bottomMenuHTML = this.renderMenuGroup(this.menuItemsBottom);

		sidebar.innerHTML = `
			<!-- Logo en haut -->
			<div class="sidebar-brand">
				<div class="sidebar-brand-icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
					</svg>
				</div>
				<span class="sidebar-brand-name">Lance Strategy</span>
			</div>

			<div class="sidebar-divider"></div>

			<!-- Navigation haut -->
			<nav class="sidebar-nav sidebar-nav-top">
				${topMenuHTML}
			</nav>

			<!-- Navigation bas -->
			<nav class="sidebar-nav sidebar-nav-bottom">
				${bottomMenuHTML}
			</nav>

			<div class="sidebar-divider"></div>

			<!-- Avatar + actions en bas -->
			<div class="user-avatar-section">
				<div class="user-avatar-compact" onclick="Navigation.showUserProfile()">
					${currentUser.avatar}
				</div>
				<div class="sidebar-quick-actions">
					<button class="quick-action-btn" data-action="settings" title="Paramètres">
						<span class="nav-icon">${this.icons.settings}</span>
					</button>
					<button class="quick-action-btn danger" data-action="logout" title="Déconnexion">
						<span class="nav-icon">${this.icons.logout}</span>
					</button>
				</div>
			</div>
		`;
	},

	bindEvents() {
		console.log("Navigation.bindEvents()");

		document.addEventListener("click", (e) => {
			const navLink = e.target.closest(".nav-link");
			if (navLink) {
				e.preventDefault();
				const page = navLink.dataset.page;
				if (page) this.navigateTo(page);
			}

			const actionBtn = e.target.closest(
				".quick-action-btn, .sidebar-action-btn",
			);
			if (actionBtn) {
				e.preventDefault();
				const action = actionBtn.dataset.action;
				if (action === "logout") Auth.logout();
				else if (action === "settings") this.showSettings();
			}

			const card = e.target.closest(".dashboard-card.clickable");
			if (card) {
				const page = card.dataset.navigate;
				if (page) this.navigateTo(page);
			}
		});
	},

	navigateTo(page) {
		// Check role access before rendering page
		if (!Auth.canAccessPage(page)) {
			const allowed = Auth.getAllowedPages(Auth.getCurrentUser()?.role);
			const fallback =
				allowed && allowed.length > 0 ? allowed[0] : "dashboard";
			console.warn(
				`⛔ Accès refusé à "${page}" pour ce rôle. Redirection → ${fallback}`,
			);
			return this.navigateTo(fallback);
		}

		console.log("🔄 Navigation vers:", page);
		this.currentPage = page;

		document.querySelectorAll(".nav-link").forEach((link) => {
			link.classList.toggle(
				"active",
				link.dataset.page === this.currentPage,
			);
		});

		document
			.querySelectorAll(".page-content")
			.forEach((p) => p.classList.remove("active"));

		const pageElement = document.getElementById(`${page}Page`);
		if (pageElement) {
			pageElement.classList.add("active");

			const moduleMap = {
				dashboard: "DashboardModule",
				products: "ProductsModule",
				sales: "SalesModule",
				tasks: "TasksModule",
				users: "UsersModule",
				clients: "ClientsModule",
				accounting: "AccountingModule",
				analytics: "AnalyticsModule",
				projects: "ProjectsModule",
				calendar: "CalendarModule",
				logs: "LogsModule",
			};

			const moduleName = moduleMap[page];
			if (moduleName && window[moduleName]) {
				try {
					window[moduleName].init();
					console.log(`✓ ${moduleName}.init()`);
					// Track page visit in dashboard session feed
					const pageLabels = {
						dashboard: "Tableau de bord", products: "Stock", sales: "Ventes",
						tasks: "Tâches", users: "Utilisateurs", clients: "Clients",
						accounting: "Comptabilité", analytics: "Analytics",
						projects: "Projets", calendar: "Calendrier", logs: "Logs",
					};
					if (page !== "dashboard" && window.DashboardModule) {
						window.DashboardModule._logSessionEvent("nav", `Page visitée : ${pageLabels[page] || page}`);
					}
				} catch (e) {
					console.error(`✗ Erreur ${moduleName}:`, e);
					pageElement.innerHTML = `<div style="padding: 2rem; color: #c00;"><strong>Erreur</strong>: ${e.message}</div>`;
				}
			}
		}
	},

	applyTheme() {
		this.restorePreferences();
		const saved = localStorage.getItem("appTheme");
		if (saved === "dark") {
			document.body.classList.add("theme-dark");
		} else {
			document.body.classList.remove("theme-dark");
		}
		console.log(`🎨 Thème appliqué: ${saved || "light"}`);
	},

	toggleTheme() {
		const isDark = document.body.classList.toggle("theme-dark");
		localStorage.setItem("appTheme", isDark ? "dark" : "light");
		console.log(`🎨 Thème basculé: ${isDark ? "dark" : "light"}`);
		if (window.showToast)
			showToast(`Mode ${isDark ? "sombre" : "clair"} activé`, "success");
	},

	// ── Settings Panel ───────────────────────────────────────────────────────
	showSettings() {
		// Toggle: dismiss if already open
		const existing = document.getElementById("settingsOverlay");
		if (existing) { existing.remove(); return; }

		const isDark = document.body.classList.contains("theme-dark");
		const currentSize = localStorage.getItem("appFontSize") || "normal";
		const currentAccent = localStorage.getItem("appAccent") || "gold";

		const accents = [
			{ key: "gold",  color: "#b8923a", label: "Or" },
			{ key: "blue",  color: "#2563eb", label: "Bleu" },
			{ key: "green", color: "#2d7a4f", label: "Vert" },
			{ key: "rose",  color: "#c0405a", label: "Rose" },
			{ key: "slate", color: "#475569", label: "Ardoise" },
		];

		const overlay = document.createElement("div");
		overlay.id = "settingsOverlay";
		overlay.className = "settings-overlay";
		overlay.innerHTML = `
			<div class="settings-backdrop" onclick="Navigation.closeSettings()"></div>
			<div class="settings-panel">
				<div class="sp-header">
					<div class="sp-header-icon">
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
					</div>
					<h3 class="sp-title">Paramètres</h3>
				</div>
				<div class="sp-body">

					<!-- Thème -->
					<div>
						<div class="sp-section-label">Thème</div>
						<div class="sp-toggle-row">
							<div class="sp-toggle-info">
								<span class="sp-toggle-name">Mode sombre</span>
								<span class="sp-toggle-desc">Interface en tons foncés</span>
							</div>
							<label class="sp-switch">
								<input type="checkbox" id="spDarkToggle" ${isDark ? "checked" : ""}
									onchange="Navigation.applyThemeSetting(this.checked)">
								<span class="sp-switch-track"></span>
							</label>
						</div>
					</div>

					<!-- Taille du texte -->
					<div>
						<div class="sp-section-label">Taille du texte</div>
						<div class="sp-size-pills">
							<button class="sp-size-pill ${currentSize === "compact" ? "active" : ""}"
								onclick="Navigation.applyFontSize('compact')">Compact</button>
							<button class="sp-size-pill ${currentSize === "normal" ? "active" : ""}"
								onclick="Navigation.applyFontSize('normal')">Normal</button>
							<button class="sp-size-pill ${currentSize === "confort" ? "active" : ""}"
								onclick="Navigation.applyFontSize('confort')">Confort</button>
						</div>
					</div>

					<!-- Couleur d'accent -->
					<div>
						<div class="sp-section-label">Couleur accent</div>
						<div class="sp-color-chips">
							${accents.map(a => `
								<div class="sp-color-chip ${currentAccent === a.key ? "active" : ""}"
									style="background:${a.color};"
									title="${a.label}"
									onclick="Navigation.applyAccent('${a.key}', '${a.color}')">
								</div>
							`).join("")}
						</div>
					</div>

				</div>
			</div>
		`;

		document.body.appendChild(overlay);
	},

	closeSettings() {
		const el = document.getElementById("settingsOverlay");
		if (el) el.remove();
	},

	applyThemeSetting(isDark) {
		if (isDark) document.body.classList.add("theme-dark");
		else document.body.classList.remove("theme-dark");
		localStorage.setItem("appTheme", isDark ? "dark" : "light");
	},

	applyFontSize(size) {
		document.body.classList.remove("fs-compact", "fs-normal", "fs-confort");
		document.body.classList.add("fs-" + size);
		localStorage.setItem("appFontSize", size);
		// Update pill UI
		document.querySelectorAll(".sp-size-pill").forEach(p => {
			p.classList.toggle("active", p.textContent.trim().toLowerCase() === size.replace("confort", "confort"));
		});
		// Re-check active by text content
		document.querySelectorAll(".sp-size-pill").forEach(p => {
			const map = { compact: "Compact", normal: "Normal", confort: "Confort" };
			p.classList.toggle("active", p.textContent.trim() === map[size]);
		});
	},

	applyAccent(key, color) {
		// Update CSS variable
		document.documentElement.style.setProperty("--accent", color);
		// Also update light/dark accent variants
		const lightAccents = {
			gold:  "#d4aa5a", blue:  "#3b82f6", green: "#4ade80",
			rose:  "#e4718a", slate: "#94a3b8",
		};
		document.documentElement.style.setProperty("--accent-gold", lightAccents[key] || color);
		localStorage.setItem("appAccent", key);
		localStorage.setItem("appAccentColor", color);
		// Update active chip
		document.querySelectorAll(".sp-color-chip").forEach(c => {
			c.classList.toggle("active", c.style.background === color);
		});
	},

	restorePreferences() {
		const theme = localStorage.getItem("appTheme");
		const size = localStorage.getItem("appFontSize");
		const accentColor = localStorage.getItem("appAccentColor");
		if (theme === "dark") document.body.classList.add("theme-dark");
		if (size) {
			document.body.classList.remove("fs-compact", "fs-normal", "fs-confort");
			document.body.classList.add("fs-" + size);
		}
		if (accentColor) {
			document.documentElement.style.setProperty("--accent", accentColor);
		}
	},

	updateDashboardStats() {
		if (window.DashboardModule) {
			try { DashboardModule.loadStats(); } catch (e) {}
		}
	},

	showUserProfile() {
		const currentUser = Auth.getCurrentUser();
		if (!currentUser) return;

		// Remove existing overlay (closes the panel)
		const existing = document.getElementById("sidebarProfileOverlay");
		if (existing) {
			existing.remove();
			return;
		}

		const data = DataManager.getData();
		const users = data.users || [];
		const user = users.find(u => u.id === currentUser.id) || currentUser;

		// --- compute stats ---
		const userSales = (data.sales || []).filter(s => s.sellerId === user.id);
		const completedSales = userSales.filter(s => (s.status || "completed") === "completed");
		const revenue = completedSales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);

		let totalStock = 0;
		(data.products || []).forEach(p => { totalStock += (p.stock && p.stock[user.username]) || 0; });

		const userTasks = (data.tasks || []).filter(t => t.assigneeId === user.id);
		const pendingTasks = userTasks.filter(t => !t.completed);
		const overdueTasks = pendingTasks.filter(t => {
			if (!t.dueDate) return false;
			const d = new Date(t.dueDate); d.setHours(0,0,0,0);
			const today = new Date(); today.setHours(0,0,0,0);
			return d < today;
		});

		// --- last logs ---
		const userLogs = (data.logs || []).filter(l => l.userId === user.id).slice(-6).reverse();

		// --- role visuals ---
		const roleLabels = { admin: "Admin", member: "\u00c9diteur", viewer: "Utilisateur", finance: "Finance" };
		const roleBadges = { admin: "badge-danger", member: "badge-warning", viewer: "badge-info", finance: "badge-success" };
		const avatarColors = [
			{ bg: "rgba(74,144,226,0.15)", text: "#4a90e2" },
			{ bg: "rgba(40,167,69,0.15)", text: "#28a745" },
			{ bg: "rgba(202,138,4,0.15)", text: "#ca8a04" },
			{ bg: "rgba(220,53,69,0.15)", text: "#dc3545" },
			{ bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
			{ bg: "rgba(30,64,175,0.15)", text: "#1e40af" },
		];
		const avatarColor = avatarColors[(user.id || 0) % avatarColors.length];

		// --- last login ---
		const loginLog = [...(data.logs || [])].reverse().find(l => l.userId === user.id && l.action === "Connexion");
		const lastLogin = loginLog ? new Date(loginLog.timestamp).toLocaleString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : null;

		// --- logs HTML ---
		const logsHtml = userLogs.length > 0
			? userLogs.map(log => {
				const d = new Date(log.timestamp || log.date || "");
				const timeStr = isNaN(d) ? "" : d.toLocaleString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
				return `<div class="sp-modal-log-item">
					<div class="sp-modal-log-dot"></div>
					<div class="sp-modal-log-content">
						<span class="sp-modal-log-action">${log.action || "Action"}</span>
						${log.details ? `<span class="sp-modal-log-detail">${log.details}</span>` : ""}
						<span class="sp-modal-log-time">${timeStr}</span>
					</div>
				</div>`;
			}).join("")
			: `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">Aucune activit\u00e9 r\u00e9cente</div>`;

		// --- tasks HTML ---
		const tasksHtml = pendingTasks.length > 0
			? pendingTasks.slice(0, 6).map(t => {
				const isOverdue = overdueTasks.includes(t);
				const proj = t.projectId ? (data.projects || []).find(p => p.id === t.projectId) : null;
				return `<div class="sp-modal-task-item${isOverdue ? " overdue" : ""}">
					<div class="sp-modal-task-dot" style="background:${isOverdue ? "var(--danger,#dc2626)" : "var(--border-dark,#c8c4bc)"}"></div>
					<div class="sp-modal-task-content">
						<span class="sp-modal-task-title">${t.title}</span>
						${proj ? `<span class="sp-modal-task-proj">${proj.emoji || "\ud83d\udcc1"} ${proj.name}</span>` : ""}
					</div>
					${isOverdue ? `<span class="badge badge-danger" style="font-size:0.65rem;padding:0.1rem 0.4rem;">Retard</span>` : ""}
				</div>`;
			}).join("")
			: `<div style="padding:0.75rem 0;text-align:center;color:var(--text-muted);font-size:0.82rem;">Aucune t\u00e2che en cours</div>`;

		// --- recent sales HTML ---
		const recentSales = ([...userSales].sort((a,b) => new Date(b.date||b.createdAt||0) - new Date(a.date||a.createdAt||0))).slice(0,8);
		const salesHtml = recentSales.length > 0
			? recentSales.map(sale => {
				const d = new Date(sale.date || sale.createdAt || "");
				const dateStr = isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
				const prod = (data.products || []).find(p => p.id === sale.productId);
				const client = (data.clients || []).find(c => c.id === sale.clientId);
				return `<div class="sp-modal-log-item">
					<div class="sp-modal-log-dot"></div>
					<div class="sp-modal-log-content">
						<span class="sp-modal-log-action">${prod?.name || "Vente"}</span>
						${client ? `<span class="sp-modal-log-detail">${client.name}</span>` : ""}
						<span class="sp-modal-log-time">${dateStr} \u2014 ${(sale.totalTTC || 0).toFixed(2)} \u20ac</span>
					</div>
				</div>`;
			}).join("")
			: `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">Aucune vente enregistr\u00e9e</div>`;

		// --- build modal ---
		const overlay = document.createElement("div");
		overlay.id = "sidebarProfileOverlay";
		overlay.className = "sp-modal-overlay";
		overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

		const panel = document.createElement("div");
		panel.id = "sidebarProfilePanel";
		panel.className = "sp-modal";
		panel.innerHTML = `
			<div class="sp-modal-header">
				<div class="sp-modal-header-left">
					<div class="sp-modal-avatar" style="background:${avatarColor.bg};color:${avatarColor.text};">${user.avatar || "?"}</div>
					<div>
						<div class="sp-modal-name">${user.name}</div>
						<div class="sp-modal-meta">
							<span class="badge ${roleBadges[user.role] || "badge-info"}">${roleLabels[user.role] || user.role}</span>
							<span class="badge ${user.active !== false ? "badge-success" : "badge-danger"}">${user.active !== false ? "Actif" : "Inactif"}</span>
						</div>
						<div class="sp-modal-username">@${user.username}</div>
						${lastLogin ? `<div class="sp-modal-lastlogin">Derni\u00e8re connexion : ${lastLogin}</div>` : ""}
					</div>
				</div>
				<button class="btn-icon sp-modal-close" onclick="document.getElementById('sidebarProfileOverlay')?.remove();">
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="sp-modal-stats">
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${completedSales.length}</div><div class="sp-modal-stat-label">Ventes</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${revenue.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} \u20ac</div><div class="sp-modal-stat-label">Chiffre d'affaires</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${pendingTasks.length}</div><div class="sp-modal-stat-label">T\u00e2ches</div></div>
				<div class="sp-modal-stat${overdueTasks.length > 0 ? " danger" : ""}"><div class="sp-modal-stat-value">${overdueTasks.length}</div><div class="sp-modal-stat-label">En retard</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${totalStock}</div><div class="sp-modal-stat-label">Stock total</div></div>
			</div>

			<div class="sp-modal-body">
				<div class="sp-modal-left">
					<div class="sp-modal-section-title">Informations</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">R\u00f4le</div>
						<div class="sp-modal-prop-value"><span class="badge ${roleBadges[user.role] || "badge-info"}">${roleLabels[user.role] || user.role}</span></div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">Statut</div>
						<div class="sp-modal-prop-value"><span class="badge ${user.active !== false ? "badge-success" : "badge-danger"}">${user.active !== false ? "Actif" : "Inactif"}</span></div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">T\u00e2ches actives</div>
						<div class="sp-modal-prop-value" style="font-weight:600;">${pendingTasks.length}</div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">En retard</div>
						<div class="sp-modal-prop-value" style="font-weight:600;${overdueTasks.length > 0 ? "color:var(--danger);" : ""}">${overdueTasks.length}</div>
					</div>
					<div class="sp-modal-section-title" style="margin-top:1.25rem;">T\u00e2ches en cours</div>
					<div class="sp-modal-tasks">${tasksHtml}</div>
				</div>

				<div class="sp-modal-right">
					<div class="modal-tabs">
						<button class="modal-tab active" data-tab="logs" onclick="Navigation._switchProfileTab('logs', this)">Activit\u00e9 r\u00e9cente</button>
						<button class="modal-tab" data-tab="sales" onclick="Navigation._switchProfileTab('sales', this)">Derni\u00e8res ventes</button>
					</div>
					<div class="modal-tab-panel active" data-panel="logs">
						${logsHtml}
					</div>
					<div class="modal-tab-panel" data-panel="sales">
						${salesHtml}
					</div>
				</div>
			</div>

			<div class="sp-modal-footer">
				<button class="btn-danger btn-sm" onclick="Auth.logout();">
					D\u00e9connexion
				</button>
			</div>
		`;

		panel.onclick = (e) => e.stopPropagation();

		overlay.appendChild(panel);
		document.body.appendChild(overlay);
	},

	_switchProfileTab(tab, btn) {
		const panel = document.getElementById("sidebarProfilePanel");
		if (!panel) return;
		panel.querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
		panel.querySelectorAll(".modal-tab-panel").forEach(p => p.classList.remove("active"));
		if (btn) btn.classList.add("active");
		const targetPanel = panel.querySelector(`.modal-tab-panel[data-panel="${tab}"]`);
		if (targetPanel) targetPanel.classList.add("active");
	},
};

window.Navigation = Navigation;
