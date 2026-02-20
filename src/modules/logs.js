const LogsModule = {
	// State
	searchQuery: "",
	actionFilter: "",
	userFilter: "",
	selectedActions: [],
	selectedUsers: [],
	dateFrom: "",
	dateTo: "",
	pageSize: 30,
	currentPage: 1,

	// Initialization
	init() {
		if (!Auth.hasPermission("viewLogs")) {
			document.getElementById("logsPage").innerHTML = `
				<div class="empty-state">
					${Icons.get("lock", 48)}
					<h4>Acces non autorise</h4>
					<p>Vous n'avez pas les permissions necessaires pour consulter les logs.</p>
				</div>
			`;
			return;
		}

		this.currentPage = 1;
		this.render();
		this.attachEventListeners();
	},

	// Helpers

	getTimeAgo(date) {
		const seconds = Math.floor((new Date() - date) / 1000);
		if (seconds < 60) return "A l'instant";
		if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
		if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
		if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} j`;
		return date.toLocaleDateString("fr-FR");
	},

	formatTime(date) {
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	},

	formatDate(date) {
		return date.toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	},

	formatFullDate(date) {
		return date.toLocaleDateString("fr-FR", {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	},

	getDateLabel(dateStr) {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
		if (date.toDateString() === yesterday.toDateString()) return "Hier";

		const diffDays = Math.floor((today - date) / 86400000);
		if (diffDays < 7) return this.formatFullDate(date);
		return this.formatDate(date);
	},

	getActionBadge(action) {
		const a = (action || "").toLowerCase();
		if (
			a.includes("connexion") ||
			a.includes("deconnexion") ||
			a.includes("déconnexion")
		)
			return { class: "badge-info", icon: "user" };
		if (
			a.includes("ajout") ||
			a.includes("creation") ||
			a.includes("création")
		)
			return { class: "badge-success", icon: "plus" };
		if (a.includes("modification") || a.includes("ajustement"))
			return { class: "badge-warning", icon: "edit" };
		if (a.includes("suppression") || a.includes("effacement"))
			return { class: "badge-danger", icon: "trash" };
		if (a.includes("vente"))
			return { class: "badge-info", icon: "dollarSign" };
		return { class: "badge-info", icon: "activity" };
	},

	getAvatarColor(userId) {
		// Colorblind-safe palette: Blue, Green, Gold, Red, Amber, Dark Blue
		const colors = [
			{ bg: "rgba(74, 144, 226, 0.15)", text: "#4a90e2" },
			{ bg: "rgba(40, 167, 69, 0.15)", text: "#28a745" },
			{ bg: "rgba(202, 138, 4, 0.15)", text: "#ca8a04" },
			{ bg: "rgba(220, 53, 69, 0.15)", text: "#dc3545" },
			{ bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
			{ bg: "rgba(30, 64, 175, 0.15)", text: "#1e40af" },
		];
		return colors[(userId || 0) % colors.length];
	},

	getInitials(name) {
		if (!name) return "?";
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2)
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.substring(0, 2).toUpperCase();
	},

	// Filtering

	toggleLogsFilterDropdown(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const isOpen = el.classList.contains("open");
		document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
		if (!isOpen) el.classList.add("open");
	},

	selectLogAction(action) {
		if (action === "all") {
			this.selectedActions = [];
		} else {
			const idx = this.selectedActions.indexOf(action);
			if (idx > -1) this.selectedActions.splice(idx, 1);
			else this.selectedActions.push(action);
		}
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		this.render();
	},

	getLogActionLabel() {
		if (this.selectedActions.length === 0) return "Toutes";
		if (this.selectedActions.length === 1) return this.selectedActions[0];
		return this.selectedActions.length + " sélectionnées";
	},

	selectLogUser(userId) {
		if (userId === "all") {
			this.selectedUsers = [];
		} else {
			const id = parseInt(userId);
			const idx = this.selectedUsers.indexOf(id);
			if (idx > -1) this.selectedUsers.splice(idx, 1);
			else this.selectedUsers.push(id);
		}
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		this.render();
	},

	getLogUserLabel() {
		const users = DataManager.get("users") || [];
		if (this.selectedUsers.length === 0) return "Tous";
		if (this.selectedUsers.length === 1) {
			const u = users.find(u => u.id === this.selectedUsers[0]);
			return u ? u.name : "Sélectionnés";
		}
		return this.selectedUsers.length + " sélectionnés";
	},

	getFilteredLogs() {
		let logs = DataManager.get("logs") || [];
		const query = this.searchQuery.toLowerCase().trim();
		const users = DataManager.get("users") || [];

		// Search across action, details, user name
		if (query) {
			logs = logs.filter((log) => {
				const user = users.find((u) => u.id === log.userId);
				const userName = (
					user?.name ||
					log.userName ||
					""
				).toLowerCase();
				return (
					(log.action || "").toLowerCase().includes(query) ||
					(log.details || "").toLowerCase().includes(query) ||
					userName.includes(query) ||
					(log.module || "").toLowerCase().includes(query)
				);
			});
		}

		// Filter by action type
		if (this.selectedActions.length > 0) {
			logs = logs.filter((log) =>
				this.selectedActions.some(a => (log.action || "").toLowerCase().includes(a.toLowerCase()))
			);
		} else if (this.actionFilter) {
			logs = logs.filter((log) =>
				(log.action || "").toLowerCase().includes(this.actionFilter.toLowerCase()),
			);
		}

		// Filter by user
		if (this.selectedUsers.length > 0) {
			logs = logs.filter((log) => this.selectedUsers.includes(log.userId));
		} else if (this.userFilter) {
			logs = logs.filter(
				(log) => log.userId === parseInt(this.userFilter),
			);
		}

		// Filter by date range
		if (this.dateFrom) {
			const from = new Date(this.dateFrom);
			from.setHours(0, 0, 0, 0);
			logs = logs.filter((log) => new Date(log.timestamp) >= from);
		}
		if (this.dateTo) {
			const to = new Date(this.dateTo);
			to.setHours(23, 59, 59, 999);
			logs = logs.filter((log) => new Date(log.timestamp) <= to);
		}

		return logs;
	},

	// Stats

	getTodayLogsCount(logs) {
		const today = new Date().toDateString();
		return logs.filter(
			(log) => new Date(log.timestamp).toDateString() === today,
		).length;
	},

	getWeekLogsCount(logs) {
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		return logs.filter((log) => new Date(log.timestamp) >= weekAgo).length;
	},

	getUniqueUsersCount(logs) {
		const userIds = new Set(logs.map((log) => log.userId).filter(Boolean));
		return userIds.size;
	},

	// Grouping

	groupLogsByDate(logs) {
		const groups = {};
		logs.forEach((log) => {
			const dateKey = new Date(log.timestamp).toDateString();
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(log);
		});
		return groups;
	},

	// Main render

	render() {
		const allLogs = DataManager.get("logs") || [];
		const users = DataManager.get("users") || [];
		const filteredLogs = this.getFilteredLogs();

		// Collect unique action types from existing logs
		const actionTypes = [
			...new Set(allLogs.map((l) => l.action).filter(Boolean)),
		].sort();

		const html = `
			<style>
				.logs-page-header {
					display: flex;
					align-items: center;
					gap: 1rem;
					margin-bottom: 1.5rem;
				}
				.logs-page-header-icon {
					width: 48px;
					height: 48px;
					border-radius: var(--radius);
					background: var(--primary-light);
					color: var(--primary);
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
				}
				.logs-page-header-text h1 {
					font-size: 1.4rem;
					font-weight: 700;
					color: var(--text);
					margin: 0 0 0.15rem 0;
				}
				.logs-page-header-text p {
					font-size: 0.85rem;
					color: var(--text-muted);
					margin: 0;
				}
				.logs-controls {
					display: flex;
					align-items: center;
					gap: 0.75rem;
					margin-bottom: 1.5rem;
					flex-wrap: wrap;
				}
				.logs-search-wrapper {
					position: relative;
					flex: 1;
					min-width: 200px;
					max-width: 320px;
				}
				.logs-search-wrapper svg {
					position: absolute;
					left: 0.85rem;
					top: 50%;
					transform: translateY(-50%);
					color: var(--text-muted);
					pointer-events: none;
				}
				.logs-filter-select {
					padding: 0.6rem 0.85rem;
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius);
					background: var(--card-bg);
					color: var(--text);
					font-size: 0.85rem;
					font-family: inherit;
					min-width: 140px;
					cursor: pointer;
					transition: border-color 0.2s ease, box-shadow 0.2s ease;
				}
				.logs-filter-select:focus {
					outline: none;
					border-color: var(--primary);
					box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
				}
				.logs-date-input {
					padding: 0.6rem 0.85rem;
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius);
					background: var(--card-bg);
					color: var(--text);
					font-size: 0.85rem;
					font-family: inherit;
					cursor: pointer;
					min-width: 135px;
					transition: border-color 0.2s ease, box-shadow 0.2s ease;
				}
				.logs-date-input:focus {
					outline: none;
					border-color: var(--primary);
					box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
				}
				.logs-controls-right {
					margin-left: auto;
					display: flex;
					align-items: center;
					gap: 0.5rem;
				}
				.logs-table-card {
					background: var(--card-bg);
					border: 1px solid var(--border-color);
					border-radius: var(--radius);
					overflow: hidden;
				}
				.logs-date-group-header {
					display: flex;
					align-items: center;
					gap: 0.6rem;
					padding: 0.7rem 1rem;
					background: var(--bg-alt);
					border-bottom: 1px solid var(--border-color);
					font-size: 0.82rem;
					font-weight: 600;
					color: var(--text-secondary);
					text-transform: capitalize;
					position: sticky;
					top: 0;
					z-index: 2;
				}
				.logs-date-group-header svg {
					color: var(--primary);
					flex-shrink: 0;
				}
				.logs-date-group-count {
					background: var(--primary-light);
					color: var(--primary);
					font-size: 0.72rem;
					font-weight: 700;
					padding: 0.15rem 0.5rem;
					border-radius: 999px;
					margin-left: auto;
				}
				.logs-user-cell {
					display: flex;
					align-items: center;
					gap: 0.6rem;
				}
				.logs-avatar {
					width: 32px;
					height: 32px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.7rem;
					font-weight: 700;
					flex-shrink: 0;
					letter-spacing: 0.02em;
					user-select: none;
				}
				.logs-user-info {
					display: flex;
					flex-direction: column;
					gap: 0.05rem;
				}
				.logs-user-name {
					font-weight: 600;
					font-size: 0.85rem;
					color: var(--text);
				}
				.logs-user-username {
					font-size: 0.75rem;
					color: var(--text-muted);
				}
				.logs-details-text {
					max-width: 280px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					font-size: 0.85rem;
					color: var(--text-secondary);
				}
				.logs-time-cell {
					display: flex;
					flex-direction: column;
					gap: 0.1rem;
				}
				.logs-time-value {
					font-weight: 600;
					font-size: 0.85rem;
					color: var(--text);
				}
				.logs-time-ago {
					font-size: 0.75rem;
					color: var(--text-muted);
				}
				.logs-module-tag {
					display: inline-flex;
					align-items: center;
					gap: 0.3rem;
					font-size: 0.78rem;
					color: var(--text-muted);
					background: var(--bg-alt);
					padding: 0.2rem 0.6rem;
					border-radius: 999px;
					white-space: nowrap;
				}
				.logs-row-clickable {
					cursor: pointer;
				}
				.logs-row-clickable:hover {
					background: var(--hover-bg);
				}
				.logs-load-more-wrapper {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 1rem;
					padding: 1rem;
					border-top: 1px solid var(--border-color);
					background: var(--bg-alt);
				}
				.logs-results-count {
					font-size: 0.82rem;
					color: var(--text-muted);
					padding: 0.75rem 1rem;
					border-top: 1px solid var(--border-color);
					background: var(--bg-alt);
					display: flex;
					align-items: center;
					justify-content: space-between;
				}
				.logs-detail-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 1rem;
					margin-bottom: 1rem;
				}
				.logs-detail-item {
					display: flex;
					flex-direction: column;
					gap: 0.2rem;
				}
				.logs-detail-label {
					font-size: 0.78rem;
					font-weight: 600;
					color: var(--text-muted);
					text-transform: uppercase;
					letter-spacing: 0.03em;
				}
				.logs-detail-value {
					font-size: 0.9rem;
					color: var(--text);
					word-break: break-word;
				}
				.logs-detail-section {
					margin-top: 1.25rem;
				}
				.logs-detail-section-title {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					font-size: 0.88rem;
					font-weight: 600;
					color: var(--text);
					margin-bottom: 0.75rem;
				}
				.logs-detail-section-title svg {
					color: var(--primary);
				}
				.logs-detail-box {
					padding: 1rem;
					background: var(--bg-alt);
					border-radius: var(--radius-sm);
					border: 1px solid var(--border-color);
					font-size: 0.88rem;
					color: var(--text-secondary);
					line-height: 1.6;
					word-break: break-word;
				}
				.logs-detail-before-after {
					display: grid;
					grid-template-columns: 1fr auto 1fr;
					gap: 1rem;
					align-items: center;
				}
				.logs-detail-ba-card {
					padding: 1rem;
					border-radius: var(--radius-sm);
					border: 1px solid var(--border-color);
					text-align: center;
				}
				.logs-detail-ba-card.before {
					background: var(--warning-light);
					border-color: var(--warning);
				}
				.logs-detail-ba-card.after {
					background: var(--success-light);
					border-color: var(--success);
				}
				.logs-detail-ba-label {
					font-size: 0.78rem;
					font-weight: 600;
					color: var(--text-muted);
					text-transform: uppercase;
					margin-bottom: 0.35rem;
				}
				.logs-detail-ba-value {
					font-size: 1.5rem;
					font-weight: 700;
					color: var(--text);
				}
				.logs-detail-ba-unit {
					font-size: 0.78rem;
					color: var(--text-muted);
					margin-top: 0.15rem;
				}
				.logs-detail-ba-arrow {
					color: var(--primary);
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.logs-active-filters {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					margin-bottom: 1rem;
					flex-wrap: wrap;
				}
				.logs-active-filters-label {
					font-size: 0.8rem;
					color: var(--text-muted);
					font-weight: 600;
				}
				.logs-filter-chip {
					display: inline-flex;
					align-items: center;
					gap: 0.35rem;
					padding: 0.25rem 0.65rem;
					background: var(--primary-light);
					color: var(--primary);
					border-radius: 999px;
					font-size: 0.78rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.15s ease;
					border: none;
					font-family: inherit;
				}
				.logs-filter-chip:hover {
					background: var(--primary);
					color: #fff;
				}
				.logs-filter-chip svg {
					flex-shrink: 0;
				}
				.logs-clear-all-filters {
					font-size: 0.78rem;
					color: var(--text-muted);
					background: none;
					border: none;
					cursor: pointer;
					font-family: inherit;
					text-decoration: underline;
					padding: 0.25rem 0.4rem;
				}
				.logs-clear-all-filters:hover {
					color: var(--primary);
				}
			</style>

			<!-- Page Header -->
			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("logs", 18)}</span>
						<div class="phb-text">
							<h1>Journal d'activité</h1>
							<p class="page-description">Historique complet des actions effectuées dans l'application</p>
						</div>
				</div>
			</div>

			<!-- Stats Grid -->
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">
						${Icons.get("logs", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${allLogs.length}</div>
						<div class="stat-label">Total des actions</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--success-light); color: var(--success);">
						${Icons.get("check", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.getTodayLogsCount(allLogs)}</div>
						<div class="stat-label">Actions aujourd'hui</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">
						${Icons.get("users", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.getUniqueUsersCount(allLogs)}</div>
						<div class="stat-label">Utilisateurs actifs</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--info-light); color: var(--info);">
						${Icons.get("calendar", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.getWeekLogsCount(allLogs)}</div>
						<div class="stat-label">Cette semaine</div>
					</div>
				</div>
			</div>

			<!-- Controls -->
			<div class="logs-controls">
				<div class="logs-search-wrapper">
					${Icons.get("eye", 16)}
					<input
						type="text"
						id="logsSearchInput"
						class="search-input"
						placeholder="Rechercher dans les logs..."
						value="${this.searchQuery}"
						autocomplete="off"
					/>
				</div>
								<div class="filter-dropdown" id="filterLogAction">
					<button class="filter-btn ${this.selectedActions.length > 0 ? 'active' : ''}" onclick="LogsModule.toggleLogsFilterDropdown('filterLogAction')">
						<span class="filter-btn-label">Action:</span>
						<span class="filter-btn-value">${this.getLogActionLabel()}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
					</button>
					<div class="filter-menu">
					<div class="filter-menu-item ${this.selectedActions.length === 0 ? "selected" : ""}" onclick="LogsModule.selectLogAction('all')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="filter-menu-item-label">Toutes</span>
					</div>
					<div class="filter-menu-divider"></div>
					${["Connexion","Création","Modification","Suppression","Vente","Ajustement"].map(a => `
					<div class="filter-menu-item ${this.selectedActions.includes(a) ? 'selected' : ''}" onclick="LogsModule.selectLogAction('${a}')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="filter-menu-item-label">${a}</span>
					</div>`).join("")}
					</div>
				</div>
				<div class="filter-dropdown" id="filterLogUser">
					<button class="filter-btn ${this.selectedUsers.length > 0 ? 'active' : ''}" onclick="LogsModule.toggleLogsFilterDropdown('filterLogUser')">
						<span class="filter-btn-label">Utilisateur:</span>
						<span class="filter-btn-value">${this.getLogUserLabel()}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
					</button>
					<div class="filter-menu">
					<div class="filter-menu-item ${this.selectedUsers.length === 0 ? "selected" : ""}" onclick="LogsModule.selectLogUser('all')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="filter-menu-item-label">Tous</span>
					</div>
					<div class="filter-menu-divider"></div>
					${users.filter(u => u.active).map(u => `
					<div class="filter-menu-item ${this.selectedUsers.includes(u.id) ? 'selected' : ''}" onclick="LogsModule.selectLogUser(${u.id})">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<div class="filter-user-avatar">${u.avatar || "?"}</div>
						<span class="filter-menu-item-label">${u.name}</span>
					</div>`).join("")}
					</div>
				</div>
				<input
					type="date"
					id="logsDateFrom"
					class="logs-date-input"
					value="${this.dateFrom}"
					title="Date de debut"
				/>
				<input
					type="date"
					id="logsDateTo"
					class="logs-date-input"
					value="${this.dateTo}"
					title="Date de fin"
				/>
				<div class="logs-controls-right">
					<button class="btn-secondary btn-sm" id="logsExportBtn">
						Exporter
					</button>
					${
						Auth.hasPermission("manageUsers")
							? `
						<button class="btn-danger btn-sm" id="logsClearBtn">
							Vider les logs
						</button>
					`
							: ""
					}
				</div>
			</div>

			<!-- Active Filters -->
			<div id="logsActiveFilters" class="logs-active-filters" style="display: none;"></div>

			<!-- Logs Table -->
			<div class="logs-table-card">
				<div id="logsTableContent">
					${this.renderLogsTable(filteredLogs, users)}
				</div>
			</div>

			<!-- Detail Modal -->
			<div id="logDetailModal" class="modal">
				<div class="modal-content">
					<div class="modal-header">
						<h3>
							Details de l'action
						</h3>
						<button class="btn-icon" onclick="LogsModule.closeDetailModal()">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body" id="logDetailBody"></div>
					<div class="modal-footer">
						<button class="btn-secondary" onclick="LogsModule.closeDetailModal()">Fermer</button>
					</div>
				</div>
			</div>
		`;

		document.getElementById("logsPage").innerHTML = html;
		this.renderActiveFilters();
	},

	// Render logs table

	renderLogsTable(filteredLogs, users) {
		if (filteredLogs.length === 0) {
			const hasFilters =
				this.searchQuery ||
				this.actionFilter ||
				this.userFilter ||
				this.dateFrom ||
				this.dateTo;
			return `
				<div class="empty-state">
					${Icons.get("logs", 48)}
					<h4>${hasFilters ? "Aucun resultat" : "Aucune activite enregistree"}</h4>
					<p>${hasFilters ? "Essayez de modifier vos criteres de recherche." : "Les actions seront enregistrees ici automatiquement."}</p>
				</div>
			`;
		}

		// Sort reverse chronological
		const sorted = filteredLogs.slice().reverse();

		// Paginate
		const totalPages = Math.ceil(sorted.length / this.pageSize);
		const paginated = sorted.slice(0, this.currentPage * this.pageSize);
		const hasMore = this.currentPage < totalPages;

		// Group by date
		const grouped = this.groupLogsByDate(paginated);
		const dateKeys = Object.keys(grouped).sort(
			(a, b) => new Date(b) - new Date(a),
		);

		let tableHTML = "";

		dateKeys.forEach((dateKey) => {
			const dateLogs = grouped[dateKey];
			const label = this.getDateLabel(dateKey);

			tableHTML += `
				<div class="logs-date-group-header">
					${Icons.get("calendar", 14)}
					${label}
					<span class="logs-date-group-count">${dateLogs.length} action${dateLogs.length > 1 ? "s" : ""}</span>
				</div>
				<table class="data-table">
					<thead>
						<tr>
							<th style="width: 110px;">Heure</th>
							<th style="width: 180px;">Utilisateur</th>
							<th style="width: 160px;">Action</th>
							<th>Details</th>
							<th style="width: 110px;">Module</th>
							<th style="width: 50px;"></th>
						</tr>
					</thead>
					<tbody>
						${dateLogs.map((log) => this.renderLogRow(log, users)).join("")}
					</tbody>
				</table>
			`;
		});

		// Load more / results footer
		const showing = paginated.length;
		const total = filteredLogs.length;

		if (hasMore) {
			tableHTML += `
				<div class="logs-load-more-wrapper">
					<span style="font-size: 0.82rem; color: var(--text-muted);">
						${showing} sur ${total} actions affichees
					</span>
					<button class="btn-secondary btn-sm" id="logsLoadMoreBtn">
						Charger plus
					</button>
				</div>
			`;
		} else {
			if (this.hasActiveFilters()) {
				tableHTML += `
				<div class="logs-results-count">
					<span>${total} résultat${total > 1 ? "s" : ""}</span>
					<span style="font-size: 0.78rem; color: var(--text-muted);">Filtre actif</span>
				</div>
			`;
			}
		}

		return tableHTML;
	},

	// Render single row

	renderLogRow(log, users) {
		const date = new Date(log.timestamp);
		const user = users.find((u) => u.id === log.userId);
		const badge = this.getActionBadge(log.action);
		const avatarColor = this.getAvatarColor(log.userId);
		const initials =
			user?.avatar || this.getInitials(user?.name || log.userName || "?");
		const escapedLog = JSON.stringify(log).replace(/"/g, "&quot;");

		return `
			<tr class="logs-row-clickable" onclick="LogsModule.showLogDetail(${escapedLog})">
				<td>
					<div class="logs-time-cell">
						<span class="logs-time-value">${this.formatTime(date)}</span>
						<span class="logs-time-ago">${this.getTimeAgo(date)}</span>
					</div>
				</td>
				<td>
					<div class="logs-user-cell">
						<div class="logs-avatar" style="background: ${avatarColor.bg}; color: ${avatarColor.text};">
							${initials}
						</div>
						<div class="logs-user-info">
							<span class="logs-user-name">${user?.name || log.userName || "Inconnu"}</span>
							${user ? `<span class="logs-user-username">@${user.username}</span>` : ""}
						</div>
					</div>
				</td>
				<td>
					<span class="badge ${badge.class}">
						${Icons.get(badge.icon, 12)}
						${log.action || "Action"}
					</span>
				</td>
				<td>
					<span class="logs-details-text" title="${(log.details || "").replace(/"/g, "&quot;")}">${log.details || "-"}</span>
				</td>
				<td>
					${log.module ? `<span class="logs-module-tag">${log.module}</span>` : `<span class="logs-module-tag">General</span>`}
				</td>
				<td>
					<button class="btn-icon" onclick="event.stopPropagation(); LogsModule.showLogDetail(${escapedLog})" title="Voir les details">
						${Icons.get("eye", 16)}
					</button>
				</td>
			</tr>
		`;
	},

	// Active filter chips

	hasActiveFilters() {
		return (
			this.searchQuery ||
			this.actionFilter ||
			this.userFilter ||
			this.dateFrom ||
			this.dateTo
		);
	},

	renderActiveFilters() {
		const container = document.getElementById("logsActiveFilters");
		if (!container) return;

		if (!this.hasActiveFilters()) {
			container.style.display = "none";
			return;
		}

		container.style.display = "flex";
		const users = DataManager.get("users") || [];
		let chips =
			'<span class="logs-active-filters-label">Filtres actifs :</span>';

		if (this.searchQuery) {
			chips += `<button class="logs-filter-chip" onclick="LogsModule.clearFilter('search')">
				"${this.searchQuery}" ${Icons.get("x", 12)}
			</button>`;
		}
		if (this.actionFilter) {
			chips += `<button class="logs-filter-chip" onclick="LogsModule.clearFilter('action')">
				${this.actionFilter} ${Icons.get("x", 12)}
			</button>`;
		}
		if (this.userFilter) {
			const u = users.find((u) => u.id === parseInt(this.userFilter));
			chips += `<button class="logs-filter-chip" onclick="LogsModule.clearFilter('user')">
				${u?.name || "Utilisateur"} ${Icons.get("x", 12)}
			</button>`;
		}
		if (this.dateFrom) {
			chips += `<button class="logs-filter-chip" onclick="LogsModule.clearFilter('dateFrom')">
				Depuis ${this.dateFrom} ${Icons.get("x", 12)}
			</button>`;
		}
		if (this.dateTo) {
			chips += `<button class="logs-filter-chip" onclick="LogsModule.clearFilter('dateTo')">
				Jusqu'au ${this.dateTo} ${Icons.get("x", 12)}
			</button>`;
		}

		chips += `<button class="logs-clear-all-filters" onclick="LogsModule.clearAllFilters()">Tout effacer</button>`;

		container.innerHTML = chips;
	},

	clearFilter(type) {
		switch (type) {
			case "search":
				this.searchQuery = "";
				const searchInput = document.getElementById("logsSearchInput");
				if (searchInput) searchInput.value = "";
				break;
			case "action":
				this.actionFilter = "";
				const actionSelect =
					document.getElementById("logsActionFilter");
				if (actionSelect) actionSelect.value = "";
				break;
			case "user":
				this.userFilter = "";
				const userSelect = document.getElementById("logsUserFilter");
				if (userSelect) userSelect.value = "";
				break;
			case "dateFrom":
				this.dateFrom = "";
				const fromInput = document.getElementById("logsDateFrom");
				if (fromInput) fromInput.value = "";
				break;
			case "dateTo":
				this.dateTo = "";
				const toInput = document.getElementById("logsDateTo");
				if (toInput) toInput.value = "";
				break;
		}
		this.currentPage = 1;
		this.refreshTable();
	},

	clearAllFilters() {
		this.searchQuery = "";
		this.actionFilter = "";
		this.userFilter = "";
		this.dateFrom = "";
		this.dateTo = "";
		this.currentPage = 1;

		const searchInput = document.getElementById("logsSearchInput");
		const actionSelect = document.getElementById("logsActionFilter");
		const userSelect = document.getElementById("logsUserFilter");
		const fromInput = document.getElementById("logsDateFrom");
		const toInput = document.getElementById("logsDateTo");

		if (searchInput) searchInput.value = "";
		if (actionSelect) actionSelect.value = "";
		if (userSelect) userSelect.value = "";
		if (fromInput) fromInput.value = "";
		if (toInput) toInput.value = "";

		this.refreshTable();
	},

	// Refresh table

	refreshTable() {
		const filteredLogs = this.getFilteredLogs();
		const users = DataManager.get("users") || [];
		const tableContent = document.getElementById("logsTableContent");
		if (tableContent) {
			tableContent.innerHTML = this.renderLogsTable(filteredLogs, users);
			this.attachLoadMoreListener();
		}
		this.renderActiveFilters();
	},

	// Event listeners

	attachEventListeners() {
		// Search with debounce
		const searchInput = document.getElementById("logsSearchInput");
		if (searchInput) {
			let debounceTimer;
			searchInput.addEventListener("input", (e) => {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					this.searchQuery = e.target.value;
					this.currentPage = 1;
					this.refreshTable();
				}, 250);
			});
		}

		// Close filter dropdowns on outside click
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".filter-dropdown")) {
				document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
			}
		});

		// Date from
		const dateFrom = document.getElementById("logsDateFrom");
		if (dateFrom) {
			dateFrom.addEventListener("change", (e) => {
				this.dateFrom = e.target.value;
				this.currentPage = 1;
				this.refreshTable();
			});
		}

		// Date to
		const dateTo = document.getElementById("logsDateTo");
		if (dateTo) {
			dateTo.addEventListener("change", (e) => {
				this.dateTo = e.target.value;
				this.currentPage = 1;
				this.refreshTable();
			});
		}

		// Export
		const exportBtn = document.getElementById("logsExportBtn");
		if (exportBtn) {
			exportBtn.addEventListener("click", () => this.exportCSV());
		}

		// Clear
		const clearBtn = document.getElementById("logsClearBtn");
		if (clearBtn) {
			clearBtn.addEventListener("click", () => this.clearLogs());
		}

		// Load more
		this.attachLoadMoreListener();
	},

	attachLoadMoreListener() {
		const loadMoreBtn = document.getElementById("logsLoadMoreBtn");
		if (loadMoreBtn) {
			loadMoreBtn.addEventListener("click", () => {
				this.currentPage++;
				this.refreshTable();
			});
		}
	},

	// Log detail modal

	showLogDetail(log) {
		const date = new Date(log.timestamp);
		const users = DataManager.get("users") || [];
		const user = users.find((u) => u.id === log.userId);
		const badge = this.getActionBadge(log.action);
		const avatarColor = this.getAvatarColor(log.userId);
		const initials =
			user?.avatar || this.getInitials(user?.name || log.userName || "?");

		// Parse before/after for modifications
		let beforeAfterHTML = "";
		if (
			(log.action || "").includes("Modification") ||
			(log.action || "").includes("Ajustement")
		) {
			beforeAfterHTML = this.parseBeforeAfter(log);
		}

		// Sale details
		let saleHTML = "";
		if ((log.action || "").includes("Vente")) {
			saleHTML = this.parseSaleDetails(log);
		}

		const detailHTML = `
			<!-- User & Action Header -->
			<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-alt); border-radius: var(--radius-sm);">
				<div class="logs-avatar" style="width: 44px; height: 44px; font-size: 0.85rem; background: ${avatarColor.bg}; color: ${avatarColor.text};">
					${initials}
				</div>
				<div style="flex: 1;">
					<div style="font-weight: 600; font-size: 0.95rem; color: var(--text); margin-bottom: 0.25rem;">
						${user?.name || log.userName || "Utilisateur inconnu"}
					</div>
					<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
						<span class="badge ${badge.class}">
							${Icons.get(badge.icon, 12)}
							${log.action}
						</span>
						${log.module ? `<span class="logs-module-tag">${log.module}</span>` : ""}
					</div>
				</div>
			</div>

			<!-- General Info -->
			<div class="logs-detail-grid">
				<div class="logs-detail-item">
					<span class="logs-detail-label">Date</span>
					<span class="logs-detail-value">${this.formatFullDate(date)}</span>
				</div>
				<div class="logs-detail-item">
					<span class="logs-detail-label">Heure</span>
					<span class="logs-detail-value">${date.toLocaleTimeString("fr-FR")}</span>
				</div>
				<div class="logs-detail-item">
					<span class="logs-detail-label">ID d'action</span>
					<span class="logs-detail-value" style="font-family: monospace; font-size: 0.82rem;">#${(log.id || log.timestamp || "").toString().slice(-8)}</span>
				</div>
				<div class="logs-detail-item">
					<span class="logs-detail-label">Delai</span>
					<span class="logs-detail-value">${this.getTimeAgo(date)}</span>
				</div>
			</div>

			<!-- Details Section -->
			<div class="logs-detail-section">
				<div class="logs-detail-section-title">
					${Icons.get("file", 16)}
					Description
				</div>
				<div class="logs-detail-box">
					${log.details || "Aucun detail supplementaire."}
				</div>
			</div>

			${beforeAfterHTML}
			${saleHTML}
		`;

		document.getElementById("logDetailBody").innerHTML = detailHTML;
		document.getElementById("logDetailModal").classList.add("active");
	},

	parseBeforeAfter(log) {
		const details = log.details || "";

		// Pattern for stock adjustments: "Product - user: +5 (nouveau: 25)"
		const stockMatch = details.match(
			/(.+?) - (.+?): ([+-]?\d+) \(nouveau: (\d+)\)/,
		);
		if (stockMatch) {
			const [, product, userName, change, newValue] = stockMatch;
			const oldValue = parseInt(newValue) - parseInt(change);
			return `
				<div class="logs-detail-section">
					<div class="logs-detail-section-title">
						${Icons.get("trendingUp", 16)}
						Avant / Apres
					</div>
					<div class="logs-detail-before-after">
						<div class="logs-detail-ba-card before">
							<div class="logs-detail-ba-label">Avant</div>
							<div class="logs-detail-ba-value">${oldValue}</div>
							<div class="logs-detail-ba-unit">unites</div>
						</div>
						<div class="logs-detail-ba-arrow">
							${Icons.get("trendingUp", 24)}
						</div>
						<div class="logs-detail-ba-card after">
							<div class="logs-detail-ba-label">Apres</div>
							<div class="logs-detail-ba-value">${newValue}</div>
							<div class="logs-detail-ba-unit">unites</div>
						</div>
					</div>
					<div style="text-align: center; margin-top: 0.75rem; padding: 0.5rem; background: var(--bg-alt); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
						<strong>Changement :</strong> ${parseInt(change) > 0 ? "+" : ""}${change} unites
					</div>
				</div>
			`;
		}

		return "";
	},

	parseSaleDetails(log) {
		const details = log.details || "";

		// Pattern: "Name a vendu Xx Product (price)"
		const saleMatch = details.match(/(.+?) a vendu (\d+)x (.+?) \((.+?)\)/);
		if (saleMatch) {
			const [, seller, quantity, product, price] = saleMatch;
			return `
				<div class="logs-detail-section">
					<div class="logs-detail-section-title">
						${Icons.get("dollarSign", 16)}
						Details de la vente
					</div>
					<div class="logs-detail-grid">
						<div class="logs-detail-item">
							<span class="logs-detail-label">Vendeur</span>
							<span class="logs-detail-value">${seller}</span>
						</div>
						<div class="logs-detail-item">
							<span class="logs-detail-label">Produit</span>
							<span class="logs-detail-value">${product}</span>
						</div>
						<div class="logs-detail-item">
							<span class="logs-detail-label">Quantite</span>
							<span class="logs-detail-value">${quantity} unites</span>
						</div>
						<div class="logs-detail-item">
							<span class="logs-detail-label">Montant</span>
							<span class="logs-detail-value" style="color: var(--primary); font-weight: 600;">${price}</span>
						</div>
					</div>
				</div>
			`;
		}

		return "";
	},

	closeDetailModal() {
		document.getElementById("logDetailModal").classList.remove("active");
	},

	// Export CSV

	exportCSV() {
		const logs = this.getFilteredLogs();
		const users = DataManager.get("users") || [];

		if (logs.length === 0) {
			showToast("Aucun log a exporter.", "warning");
			return;
		}

		// CSV headers
		const headers = [
			"Date",
			"Heure",
			"Utilisateur",
			"Action",
			"Details",
			"Module",
			"ID",
		];
		const rows = logs
			.slice()
			.reverse()
			.map((log) => {
				const date = new Date(log.timestamp);
				const user = users.find((u) => u.id === log.userId);
				return [
					date.toLocaleDateString("fr-FR"),
					date.toLocaleTimeString("fr-FR"),
					user?.name || log.userName || "Inconnu",
					log.action || "",
					`"${(log.details || "").replace(/"/g, '""')}"`,
					log.module || "General",
					log.id || "",
				].join(";");
			});

		const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);

		const link = document.createElement("a");
		link.href = url;
		const now = new Date();
		link.download = `logs_export_${now.toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showToast(
			`${logs.length} log${logs.length > 1 ? "s" : ""} exporte${logs.length > 1 ? "s" : ""} avec succes.`,
			"success",
		);
	},

	// Clear logs

	async clearLogs() {
		const confirmed = await showConfirm(
			"Etes-vous sur de vouloir vider tous les logs ? Cette action est irreversible.",
			"danger",
		);
		if (!confirmed) return;

		const data = DataManager.getData();
		const currentUser = Auth.getCurrentUser();

		// Keep a single log entry for the clear action
		data.logs = [
			{
				id: 1,
				action: "Effacement logs",
				details: "Tous les logs ont ete effaces",
				userId: currentUser.id,
				userName: currentUser.name,
				timestamp: new Date().toISOString(),
				module: "Systeme",
			},
		];

		DataManager.saveData(data);
		showToast("Logs effaces avec succes.", "success");

		// Reset filters and re-render
		this.searchQuery = "";
		this.actionFilter = "";
		this.userFilter = "";
		this.dateFrom = "";
		this.dateTo = "";
		this.currentPage = 1;
		this.init();
	},
};

window.LogsModule = LogsModule;
