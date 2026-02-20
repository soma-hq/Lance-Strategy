const UsersModule = {
	// Filter state
	searchQuery: "",
	selectedRoles: [],
	selectedStatuses: [],

	init() {
		if (!Auth.hasPermission("manageUsers")) {
			document.getElementById("usersPage").innerHTML = `
				<div class="empty-state">
					${Icons.get("lock", 48)}
					<h4>Acces non autorise</h4>
					<p>Vous n'avez pas les permissions necessaires pour gerer les utilisateurs.</p>
				</div>
			`;
			return;
		}

		this.render();
		this.attachEventListeners();
	},

	// Helpers

	getInitials(name) {
		if (!name) return "?";
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	},

	getAvatarColor(userId) {
		// Colorblind-safe palette: Blue, Green, Yellow/Gold, Red, Amber, Dark Blue
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

	getLastLogin(userId) {
		const data = DataManager.getData();
		const logs = data.logs || [];
		const loginLog = [...logs]
			.reverse()
			.find((log) => log.userId === userId && log.action === "Connexion");
		if (loginLog) {
			return new Date(loginLog.timestamp).toLocaleDateString("fr-FR", {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		}
		return null;
	},

	toggleUsersFilterDropdown(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const isOpen = el.classList.contains("open");
		document
			.querySelectorAll(".filter-dropdown")
			.forEach((d) => d.classList.remove("open"));
		if (!isOpen) el.classList.add("open");
	},

	selectUserRole(role) {
		if (role === "all") {
			this.selectedRoles = [];
		} else {
			const idx = this.selectedRoles.indexOf(role);
			if (idx > -1) this.selectedRoles.splice(idx, 1);
			else this.selectedRoles.push(role);
		}
		document
			.querySelectorAll(".filter-dropdown.open")
			.forEach((d) => d.classList.remove("open"));
		this.render();
	},

	getUserRoleLabel() {
		if (this.selectedRoles.length === 0) return "Tous";
		const labels = {
			admin: "Admin",
			member: "Éditeur",
			viewer: "Utilisateur",
			finance: "Finance",
		};
		if (this.selectedRoles.length === 1)
			return labels[this.selectedRoles[0]] || "Sélectionnés";
		return this.selectedRoles.length + " sélectionnés";
	},

	selectUserStatus(status) {
		if (status === "all") {
			this.selectedStatuses = [];
		} else {
			const idx = this.selectedStatuses.indexOf(status);
			if (idx > -1) this.selectedStatuses.splice(idx, 1);
			else this.selectedStatuses.push(status);
		}
		document
			.querySelectorAll(".filter-dropdown.open")
			.forEach((d) => d.classList.remove("open"));
		this.render();
	},

	getUserStatusLabel() {
		if (this.selectedStatuses.length === 0) return "Tous";
		if (this.selectedStatuses.length === 1)
			return this.selectedStatuses[0] === "active" ? "Actif" : "Inactif";
		return "2 sélectionnés";
	},

	getFilteredUsers() {
		let users = DataManager.get("users") || [];
		const query = this.searchQuery.toLowerCase().trim();
		if (query) {
			users = users.filter(
				(u) =>
					u.name.toLowerCase().includes(query) ||
					u.username.toLowerCase().includes(query),
			);
		}

		if (this.selectedRoles.length > 0) {
			users = users.filter((u) => this.selectedRoles.includes(u.role));
		}

		if (this.selectedStatuses.length > 0) {
			users = users.filter((u) => {
				const status = u.active ? "active" : "inactive";
				return this.selectedStatuses.includes(status);
			});
		}

		return users;
	},

	// Role and status mappings

	roleLabels: {
		admin: "Admin",
		member: "Editeur",
		viewer: "Utilisateur",
		finance: "Finance",
	},

	roleBadges: {
		admin: "badge-danger",
		member: "badge-warning",
		viewer: "badge-info",
		finance: "badge-success",
	},

	roleDescriptions: {
		admin: "Tous les droits + Gestion utilisateurs + Logs",
		member: "Voir, creer, modifier (pas de suppression)",
		viewer: "Consultation uniquement",
		finance: "Ventes, Clients, Comptabilite uniquement",
	},

	// Render

	render() {
		const page = document.getElementById("usersPage");
		if (!page) return;

		const filteredUsers = this.getFilteredUsers();
		const canCreate = Auth.hasPermission("manageUsers");
		const canEdit = canCreate;
		const canDelete = canCreate;
		const currentUser = Auth.getCurrentUser();

		const html = `
			<style>
				.users-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
					gap: 1rem;
				}
				.user-card {
					background: var(--card-bg);
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius-lg);
					box-shadow: var(--manga-shadow);
					padding: 1.25rem;
					display: flex;
					flex-direction: column;
					gap: 0.75rem;
					transition: transform 0.15s, box-shadow 0.15s;
					cursor: default;
				}
				.user-card:hover {
					transform: translate(-1px, -1px);
					box-shadow: var(--manga-shadow-hover);
				}
				.user-card:active {
					transform: translate(1px, 1px);
					box-shadow: var(--manga-shadow-active);
				}
				.user-card-add {
					border: 2px dashed var(--border-color);
					border-radius: var(--radius-lg);
					padding: 1.25rem;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 0.6rem;
					cursor: pointer;
					color: var(--text-muted);
					font-size: 0.88rem;
					font-weight: 600;
					min-height: 160px;
					transition: border-color 0.18s, color 0.18s, background 0.18s;
					background: transparent;
				}
				.user-card-add:hover {
					border-color: var(--accent, #b8923a);
					color: var(--accent, #b8923a);
					background: rgba(184, 146, 58, 0.05);
				}
				.user-add-icon {
					width: 36px; height: 36px;
					border-radius: 50%;
					border: 2px solid currentColor;
					display: flex; align-items: center; justify-content: center;
					font-size: 1.3rem; line-height: 1;
					flex-shrink: 0;
					transition: transform 0.15s;
				}
				.user-card-add:hover .user-add-icon { transform: scale(1.1); }
				.user-avatar-wrap { position: relative; flex-shrink: 0; }
				.user-status-dot {
					position: absolute;
					bottom: -2px; right: -2px;
					width: 11px; height: 11px;
					border-radius: 50%;
					border: 2px solid var(--card-bg);
				}
				.user-status-dot.active { background: #2d7a4f; }
				.user-status-dot.inactive { background: #bbb; }
				.user-card-role-desc {
					font-size: 0.73rem;
					color: var(--text-muted);
					line-height: 1.4;
					margin-top: 0.2rem;
				}
				.user-card-top {
					display: flex;
					align-items: center;
					gap: 0.75rem;
				}
				.user-avatar-lg {
					width: 44px;
					height: 44px;
					border-radius: 12px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 0.9rem;
					font-weight: 700;
					flex-shrink: 0;
					letter-spacing: 0.02em;
					border: 1.5px solid var(--border-color);
				}
				.user-card-info { flex: 1; min-width: 0; }
				.user-card-name {
					font-weight: 700;
					font-size: 0.92rem;
					color: var(--text);
					margin: 0 0 0.1rem;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.user-card-username {
					font-size: 0.78rem;
					color: var(--text-muted);
				}
				.user-card-role {
					margin-top: 0.1rem;
				}
				.user-card-lastlogin {
					font-size: 0.75rem;
					color: var(--text-muted);
					font-style: italic;
					border-top: 1px solid var(--border-light);
					padding-top: 0.6rem;
				}
				.user-card-actions {
					display: flex;
					gap: 0.5rem;
					margin-top: auto;
					padding-top: 0.5rem;
					border-top: 1px solid var(--border-light);
				}
				.user-card-current-badge {
					font-size: 0.7rem;
					padding: 0.15rem 0.5rem;
					background: var(--bg-alt);
					border-radius: 999px;
					color: var(--text-muted);
					border: 1px solid var(--border-color);
					white-space: nowrap;
				}
				.users-controls {
					display: flex;
					align-items: center;
					gap: 0.75rem;
					margin-bottom: 1.25rem;
					flex-wrap: wrap;
				}
				.users-search-wrapper {
					position: relative;
					flex: 1;
					min-width: 200px;
					max-width: 340px;
				}
				.users-search-wrapper svg {
					position: absolute;
					left: 0.85rem;
					top: 50%;
					transform: translateY(-50%);
					color: var(--text-muted);
					pointer-events: none;
				}
				.users-search-input {
					width: 100%;
					padding: 0.6rem 0.85rem 0.6rem 2.5rem;
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius);
					background: var(--card-bg);
					color: var(--text);
					font-size: 0.85rem;
					font-family: inherit;
					box-sizing: border-box;
				}
				.users-search-input:focus { outline: none; border-color: var(--text); }
				.users-role-filter {
					padding: 0.6rem 0.85rem;
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius);
					background: var(--card-bg);
					color: var(--text);
					font-size: 0.85rem;
					font-family: inherit;
					cursor: pointer;
				}
				.users-role-filter:focus { outline: none; border-color: var(--text); }
				/* Modal — form layout */
				.users-modal-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
				.users-modal-header-icon {
					width: 32px; height: 32px;
					background: var(--bg-alt);
					border: 1.5px solid var(--border-color);
					border-radius: 8px;
					display: inline-flex; align-items: center; justify-content: center;
					flex-shrink: 0;
					color: var(--text);
				}
				/* Permissions grid inside modal */
				.users-permissions-box {
					background: var(--bg-alt);
					border-radius: var(--radius);
					border: 1.5px solid var(--border-light);
					overflow: hidden;
					margin-top: 0.5rem;
				}
				.users-permissions-box-title {
					font-size: 0.72rem;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: 0.07em;
					color: var(--text-muted);
					padding: 0.6rem 1rem 0.4rem;
					border-bottom: 1px solid var(--border-light);
				}
				.users-perm-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
				}
				.users-perm-item {
					padding: 0.65rem 1rem;
					display: flex;
					flex-direction: column;
					gap: 0.2rem;
					border-bottom: 1px solid var(--border-light);
					border-right: 1px solid var(--border-light);
				}
				.users-perm-item:nth-child(2n) { border-right: none; }
				.users-perm-item:nth-last-child(-n+2) { border-bottom: none; }
				.users-perm-desc {
					font-size: 0.75rem;
					color: var(--text-muted);
					line-height: 1.4;
				}
			</style>

			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("users", 20)}</span>
					<div class="phb-text">
						<h1>Utilisateurs</h1>
						<p class="page-description">Gérez les comptes, rôles et permissions</p>
					</div>
				</div>
			</div>

			<!-- Controls -->
			<div class="users-controls">
				<div class="users-search-wrapper">
					${Icons.get("search", 16)}
					<input
						type="text"
						class="users-search-input"
						placeholder="Rechercher un utilisateur..."
						value="${this.searchQuery}"
						oninput="UsersModule.searchQuery = this.value; UsersModule.render();"
					>
				</div>
				<div class="filter-dropdown" id="filterUserRole">
					<button class="filter-btn ${this.selectedRoles.length > 0 ? "active" : ""}" onclick="UsersModule.toggleUsersFilterDropdown('filterUserRole')">
						<span class="filter-btn-label">Rôle:</span>
						<span class="filter-btn-value">${this.getUserRoleLabel()}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
					</button>
					<div class="filter-menu">
					<div class="filter-menu-item ${this.selectedRoles.length === 0 ? "selected" : ""}" onclick="UsersModule.selectUserRole('all')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="filter-menu-item-label">Tous les rôles</span>
					</div>
					<div class="filter-menu-divider"></div>
					<div class="filter-menu-item ${this.selectedRoles.includes("admin") ? "selected" : ""}" onclick="UsersModule.selectUserRole('admin')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-danger" style="font-size:0.72rem;">Admin</span>
					</div>
					<div class="filter-menu-item ${this.selectedRoles.includes("member") ? "selected" : ""}" onclick="UsersModule.selectUserRole('member')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-warning" style="font-size:0.72rem;">Éditeur</span>
					</div>
					<div class="filter-menu-item ${this.selectedRoles.includes("viewer") ? "selected" : ""}" onclick="UsersModule.selectUserRole('viewer')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-info" style="font-size:0.72rem;">Utilisateur</span>
					</div>
					<div class="filter-menu-item ${this.selectedRoles.includes("finance") ? "selected" : ""}" onclick="UsersModule.selectUserRole('finance')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-success" style="font-size:0.72rem;">Finance</span>
					</div>
					</div>
				</div>
				<div class="filter-dropdown" id="filterUserStatus">
					<button class="filter-btn ${this.selectedStatuses.length > 0 ? "active" : ""}" onclick="UsersModule.toggleUsersFilterDropdown('filterUserStatus')">
						<span class="filter-btn-label">Statut:</span>
						<span class="filter-btn-value">${this.getUserStatusLabel()}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
					</button>
					<div class="filter-menu">
					<div class="filter-menu-item ${this.selectedStatuses.length === 0 ? "selected" : ""}" onclick="UsersModule.selectUserStatus('all')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="filter-menu-item-label">Tous</span>
					</div>
					<div class="filter-menu-divider"></div>
					<div class="filter-menu-item ${this.selectedStatuses.includes("active") ? "selected" : ""}" onclick="UsersModule.selectUserStatus('active')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-success" style="font-size:0.72rem;">Actif</span>
					</div>
					<div class="filter-menu-item ${this.selectedStatuses.includes("inactive") ? "selected" : ""}" onclick="UsersModule.selectUserStatus('inactive')">
						<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
						<span class="badge badge-danger" style="font-size:0.72rem;">Inactif</span>
					</div>
					</div>
				</div>
			</div>

			<!-- User cards grid -->
			<div class="users-grid" id="usersGrid">
				${filteredUsers
					.map((user) => {
						const colors = this.getAvatarColor(user.id);
						const initials = this.getInitials(user.name);
						const lastLogin = this.getLastLogin(user.id);
						const isCurrent =
							currentUser && currentUser.id === user.id;
						const roleBadge =
							this.roleBadges[user.role] || "badge-info";
						const roleLabel =
							this.roleLabels[user.role] || user.role;
						const statusDot = user.active !== false ? "active" : "inactive";
					const roleDesc = this.roleDescriptions[user.role] || "";
					const roleAccentColors = { admin: "#dc3545", member: "#f59e0b", viewer: "#4a90e2", finance: "#28a745" };
					const roleAccent = roleAccentColors[user.role] || "var(--border-color)";
					return `
						<div class="user-card" style="border-top: 2.5px solid ${roleAccent};" onclick="UsersModule.viewUserProfile(${user.id})">
							<div class="user-card-top">
								<div class="user-avatar-wrap">
									<div class="user-avatar-lg" style="background:${colors.bg};color:${colors.text};">
										${initials}
									</div>
									<span class="user-status-dot ${statusDot}" title="${statusDot === "active" ? "Actif" : "Inactif"}"></span>
								</div>
								<div class="user-card-info">
									<div class="user-card-name">${user.name}</div>
									<div class="user-card-username">@${user.username}</div>
								</div>
								${isCurrent ? `<span class="user-card-current-badge">Vous</span>` : ""}
							</div>
							<div class="user-card-role">
								<span class="badge ${roleBadge}">${roleLabel}</span>
								${roleDesc ? `<div class="user-card-role-desc">${roleDesc}</div>` : ""}
							</div>
							<div class="user-card-lastlogin">
								${lastLogin ? `Dernière connexion : ${lastLogin}` : "Jamais connecté"}
							</div>
							${
								canEdit
									? `
								<div class="user-card-actions">
									<button class="btn-icon" onclick="event.stopPropagation(); UsersModule.editUser(${user.id})" title="Modifier">
										${Icons.get("edit", 15)}
									</button>
									${
										!isCurrent && canDelete
											? `
										<button class="btn-icon" title="Supprimer" onclick="event.stopPropagation(); UsersModule.deleteUser(${user.id})" style="color:var(--danger);">
											${Icons.get("trash", 15)}
										</button>
									`
											: ""
									}
								</div>
							`
									: ""
							}
						</div>`;
					})
					.join("")}
				${
					canCreate
						? `
					<button class="user-card-add" onclick="UsersModule.showAddModal()">
						<div class="user-add-icon">+</div>
						<span>Ajouter un utilisateur</span>
					</button>
				`
						: ""
				}
			</div>

			${this.renderModals()}
		`;

		page.innerHTML = html;
		this.attachEventListeners();
	},

	renderModals() {
		return `
			<!-- Add/Edit User Modal -->
			<div id="userModal" class="modal-overlay" style="display: none;">
				<div class="modal-content" style="max-width: 560px;">
					<div class="modal-header">
						<h3 style="display:flex;align-items:center;gap:0.55rem;">
							<span class="users-modal-header-icon">${Icons.get("user", 16)}</span>
							<span id="userModalTitle">Ajouter un utilisateur</span>
						</h3>
						<button class="btn-icon" onclick="UsersModule.closeModal()">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body">
						<form id="userForm" onsubmit="event.preventDefault(); UsersModule.saveUser();">
							<input type="hidden" id="userId" />

							<div class="users-modal-form-row">
								<div class="form-group">
									<label for="userName">Nom complet</label>
									<input type="text" id="userName" placeholder="Ex: Jean Dupont" required />
								</div>
								<div class="form-group">
									<label for="userAvatar">Initiales (Avatar)</label>
									<input type="text" id="userAvatar" maxlength="2" placeholder="Ex: JD" required style="text-transform:uppercase;letter-spacing:0.05em;font-weight:700;" />
								</div>
							</div>

							<div class="users-modal-form-row">
								<div class="form-group">
									<label for="userUsername">Nom d'utilisateur</label>
									<input type="text" id="userUsername" placeholder="Ex: jean.dupont" required autocomplete="off" />
								</div>
								<div class="form-group">
									<label for="userPassword">Mot de passe</label>
									<input type="password" id="userPassword" autocomplete="new-password" placeholder="Requis pour un nouveau compte" />
								</div>
							</div>

							<div class="form-group">
								<label for="userRole">Rôle</label>
								<select id="userRole" required>
									<option value="admin">Administrateur</option>
									<option value="member">Éditeur</option>
									<option value="viewer">Utilisateur</option>
									<option value="finance">Finance</option>
								</select>
							</div>

							<div class="users-permissions-box">
								<div class="users-permissions-box-title">Permissions par rôle</div>
								<div class="users-perm-grid">
									<div class="users-perm-item">
										<span class="badge badge-danger" style="align-self:flex-start;font-size:0.7rem;">Admin</span>
										<span class="users-perm-desc">${this.roleDescriptions.admin}</span>
									</div>
									<div class="users-perm-item">
										<span class="badge badge-warning" style="align-self:flex-start;font-size:0.7rem;">Éditeur</span>
										<span class="users-perm-desc">${this.roleDescriptions.member}</span>
									</div>
									<div class="users-perm-item">
										<span class="badge badge-info" style="align-self:flex-start;font-size:0.7rem;">Utilisateur</span>
										<span class="users-perm-desc">${this.roleDescriptions.viewer}</span>
									</div>
									<div class="users-perm-item">
										<span class="badge badge-success" style="align-self:flex-start;font-size:0.7rem;">Finance</span>
										<span class="users-perm-desc">${this.roleDescriptions.finance}</span>
									</div>
								</div>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn-secondary" onclick="UsersModule.closeModal()">Annuler</button>
						<button type="button" class="btn-success" onclick="UsersModule.saveUser()">
							Enregistrer
						</button>
					</div>
				</div>
			</div>

			<!-- User Profile Modal -->
			<div id="userProfileModal" class="modal-overlay" style="display: none;" onclick="if(event.target===this) UsersModule.closeProfileModal()">
				<div class="modal-content" style="max-width:900px;width:92vw;padding:0;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;max-height:88vh;">
					<div id="userProfileBody" style="display:contents;">
						<!-- Filled dynamically -->
					</div>
				</div>
			</div>
		`;
	},

	// Table rows

	renderTableRows(users) {
		if (!users || users.length === 0) return "";

		const currentUser = Auth.getCurrentUser();

		return users
			.map((user) => {
				const canModify = user.id !== currentUser.id;
				const avatarColor = this.getAvatarColor(user.id);
				const initials = user.avatar || this.getInitials(user.name);
				const lastLogin = this.getLastLogin(user.id);

				return `
					<tr class="clickable-row" onclick="UsersModule.viewUserProfile(${user.id})">
						<td>
							<div class="users-user-cell">
								<div class="users-avatar" style="background: ${avatarColor.bg}; color: ${avatarColor.text};">
									${initials}
								</div>
								<div class="users-user-info">
									<span class="users-user-name">${user.name}</span>
									<span class="users-user-username">@${user.username}</span>
								</div>
							</div>
						</td>
						<td>${user.username}</td>
						<td><span class="badge ${this.roleBadges[user.role]}">${this.roleLabels[user.role] || user.role}</span></td>
						<td>
							${
								lastLogin
									? `<span class="users-last-login">${lastLogin}</span>`
									: `<span class="users-last-login-never">Jamais</span>`
							}
						</td>
						<td>
							<span class="badge ${user.active ? "badge-success" : "badge-danger"}">
								${user.active ? "Actif" : "Inactif"}
							</span>
						</td>
						<td onclick="event.stopPropagation()">
							${
								canModify
									? `
								<div class="users-action-btns">
									<button class="btn-icon" onclick="UsersModule.editUser(${user.id})" title="Modifier">
										${Icons.get("edit", 16)}
									</button>
									<button class="btn-icon" onclick="UsersModule.toggleUserStatus(${user.id})" title="${user.active ? "Suspendre" : "Activer"}">
										${user.active ? Icons.get("lock", 16) : Icons.get("unlock", 16)}
									</button>
									<button class="btn-icon delete" onclick="UsersModule.deleteUser(${user.id})" title="Supprimer">
										${Icons.get("trash", 16)}
									</button>
								</div>
							`
									: `<span class="users-current-tag">Compte actuel</span>`
							}
						</td>
					</tr>
				`;
			})
			.join("");
	},

	// Event listeners

	attachEventListeners() {
		const addBtn = document.getElementById("addUserBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.showAddModal());
		}

		// Search input with debounce
		const searchInput = document.getElementById("usersSearchInput");
		if (searchInput) {
			let debounceTimer;
			searchInput.addEventListener("input", (e) => {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					this.searchQuery = e.target.value;
					this.refreshTable();
				}, 250);
			});
		}

		// Role filter
		const roleFilter = document.getElementById("usersRoleFilter");
		if (roleFilter) {
			roleFilter.addEventListener("change", (e) => {
				this.roleFilter = e.target.value;
				this.refreshTable();
			});
		}

		// Close filter dropdowns on outside click
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".filter-dropdown")) {
				document
					.querySelectorAll(".filter-dropdown")
					.forEach((d) => d.classList.remove("open"));
			}
		});

		// Overlay click-to-close for modals
		const userModal = document.getElementById("userModal");
		if (userModal) {
			userModal.addEventListener("click", (e) => {
				if (e.target === userModal) this.closeModal();
			});
		}

		const profileModal = document.getElementById("userProfileModal");
		if (profileModal) {
			profileModal.addEventListener("click", (e) => {
				if (e.target === profileModal) this.closeProfileModal();
			});
		}
	},

	refreshTable() {
		const filteredUsers = this.getFilteredUsers();
		const tbody = document.getElementById("usersTableBody");
		if (tbody) {
			tbody.innerHTML = this.renderTableRows(filteredUsers);
		}

		// Update table card (empty state + results count)
		const tableCard = document.querySelector(".users-table-card");
		if (tableCard) {
			// Remove existing empty state and results count
			const existingEmpty = tableCard.querySelector(".empty-state");
			if (existingEmpty) existingEmpty.remove();
			const existingCount = tableCard.querySelector(
				".users-results-count",
			);
			if (existingCount) existingCount.remove();

			if (filteredUsers.length === 0) {
				const emptyDiv = document.createElement("div");
				emptyDiv.className = "empty-state";
				emptyDiv.innerHTML = `
					${Icons.get("users", 48)}
					<h4>${this.searchQuery || this.roleFilter ? "Aucun resultat" : "Aucun utilisateur"}</h4>
					<p>${this.searchQuery || this.roleFilter ? "Essayez de modifier vos criteres de recherche." : "Commencez par ajouter un utilisateur."}</p>
				`;
				tableCard.appendChild(emptyDiv);
			}
		}
	},

	// Add and edit modal

	showAddModal() {
		document.getElementById("userModalTitle").textContent =
			"Ajouter un utilisateur";
		document.getElementById("userForm").reset();
		document.getElementById("userId").value = "";
		document.getElementById("userPassword").placeholder =
			"Mot de passe requis";
		document.getElementById("userPassword").required = true;
		document.getElementById("userModal").style.display = "flex";
	},

	editUser(id) {
		const user = DataManager.findById("users", id);
		if (!user) return;

		document.getElementById("userModalTitle").textContent =
			"Modifier l'utilisateur";
		document.getElementById("userId").value = user.id;
		document.getElementById("userName").value = user.name;
		document.getElementById("userUsername").value = user.username;
		document.getElementById("userPassword").value = "";
		document.getElementById("userPassword").placeholder =
			"Laisser vide pour ne pas modifier";
		document.getElementById("userPassword").required = false;
		document.getElementById("userAvatar").value = user.avatar || "";
		document.getElementById("userRole").value = user.role;
		document.getElementById("userModal").style.display = "flex";
	},

	saveUser() {
		const id = document.getElementById("userId").value;
		const password = document.getElementById("userPassword").value.trim();
		const name = document.getElementById("userName").value.trim();
		const username = document
			.getElementById("userUsername")
			.value.toLowerCase()
			.trim();
		const avatar = document
			.getElementById("userAvatar")
			.value.toUpperCase()
			.trim();
		const role = document.getElementById("userRole").value;

		// Validate required fields
		if (!name || !username || !avatar || !role) {
			showToast("Tous les champs sont requis.", "warning");
			return;
		}

		// Validate password for new users
		if (!id && !password) {
			showToast(
				"Le mot de passe est requis pour un nouvel utilisateur.",
				"warning",
			);
			return;
		}

		const userData = {
			name: name,
			username: username,
			avatar: avatar,
			role: role,
			active: true,
		};

		// Check username uniqueness
		const users = DataManager.get("users");
		const existingUser = users.find(
			(u) =>
				u.username === userData.username &&
				(!id || u.id !== parseInt(id)),
		);

		if (existingUser) {
			showToast("Ce nom d'utilisateur existe deja.", "warning");
			return;
		}

		const currentUser = Auth.getCurrentUser();
		if (id) {
			const existing = DataManager.findById("users", parseInt(id));
			userData.password = password || existing.password;
			DataManager.update("users", parseInt(id), userData);
			DataManager.addLog(
				"Modification utilisateur",
				`${userData.name} modifie`,
				currentUser.id,
			);
			showToast("Utilisateur modifie avec succes.", "success");
		} else {
			userData.password = password;
			DataManager.add("users", userData);
			DataManager.addLog(
				"Creation utilisateur",
				`${userData.name} cree`,
				currentUser.id,
			);
			showToast("Utilisateur cree avec succes.", "success");
		}

		this.closeModal();
		this.init();
		Navigation.updateDashboardStats();
	},

	// Toggle status

	async toggleUserStatus(id) {
		const user = DataManager.findById("users", id);
		if (!user) return;

		const action = user.active ? "suspendre" : "activer";
		const confirmed = await showConfirm(
			`Voulez-vous ${action} l'utilisateur "${user.name}" ?`,
			"warning",
		);
		if (!confirmed) return;

		user.active = !user.active;
		DataManager.update("users", id, user);

		const currentUser = Auth.getCurrentUser();
		DataManager.addLog(
			user.active ? "Activation utilisateur" : "Suspension utilisateur",
			user.name,
			currentUser.id,
		);
		showToast(
			user.active
				? "Utilisateur active avec succes."
				: "Utilisateur suspendu avec succes.",
			"success",
		);

		this.init();
	},

	// Delete

	async deleteUser(id) {
		const user = DataManager.findById("users", id);
		if (!user) return;

		const confirmed = await showConfirm(
			`Supprimer definitivement l'utilisateur "${user.name}" ? Cette action est irreversible.`,
			"danger",
		);
		if (!confirmed) return;

		const currentUser = Auth.getCurrentUser();
		DataManager.delete("users", id);
		DataManager.addLog(
			"Suppression utilisateur",
			`${user.name} supprime`,
			currentUser.id,
		);
		showToast("Utilisateur supprime avec succes.", "success");

		this.init();
		Navigation.updateDashboardStats();
	},

	// User profile view

	viewUserProfile(userId) {
		const user = DataManager.findById("users", userId);
		if (!user) return;

		const data = DataManager.getData();
		const avatarColor = this.getAvatarColor(user.id);
		const initials = user.avatar || this.getInitials(user.name);
		const lastLogin = this.getLastLogin(user.id);

		// Stats
		const userSales = (data.sales || []).filter(
			(s) => s.sellerId === user.id,
		);
		const completedSales = userSales.filter(
			(s) => (s.status || "completed") === "completed",
		);
		const revenue = userSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);

		let totalStock = 0;
		(data.products || []).forEach((p) => {
			totalStock += (p.stock && p.stock[user.username]) || 0;
		});

		const userTasks = (data.tasks || []).filter(
			(t) => t.assigneeId === user.id,
		);
		const pendingTasks = userTasks.filter((t) => !t.completed);
		const overdueTasks = pendingTasks.filter((t) => {
			if (!t.dueDate) return false;
			const d = new Date(t.dueDate);
			d.setHours(0, 0, 0, 0);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return d < today;
		});

		// Logs
		const userLogs = (data.logs || [])
			.filter(
				(l) =>
					l.userId === user.id ||
					(l.details && l.details.includes(user.name)),
			)
			.slice(-6)
			.reverse();

		const logsHtml =
			userLogs.length > 0
				? userLogs
						.map((log) => {
							const d = new Date(log.timestamp || log.date || "");
							const timeStr = isNaN(d)
								? ""
								: d.toLocaleString("fr-FR", {
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									});
							return `<div class="sp-modal-log-item">
					<div class="sp-modal-log-dot"></div>
					<div class="sp-modal-log-content">
						<span class="sp-modal-log-action">${log.action || "Action"}</span>
						${log.details ? `<span class="sp-modal-log-detail">${log.details}</span>` : ""}
						<span class="sp-modal-log-time">${timeStr}</span>
					</div>
				</div>`;
						})
						.join("")
				: `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">Aucune activité récente</div>`;

		// Sales
		const recentSales = [...userSales]
			.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
			.slice(0, 8);
		const salesHtml =
			recentSales.length > 0
				? recentSales
						.map((sale) => {
							const d = new Date(sale.date || "");
							const dateStr = isNaN(d)
								? ""
								: d.toLocaleDateString("fr-FR", {
										day: "2-digit",
										month: "short",
										year: "numeric",
									});
							const prod = (data.products || []).find(
								(p) => p.id === sale.productId,
							);
							const client = (data.clients || []).find(
								(c) => c.id === sale.clientId,
							);
							return `<div class="sp-modal-log-item">
					<div class="sp-modal-log-dot"></div>
					<div class="sp-modal-log-content">
						<span class="sp-modal-log-action">${prod?.name || "Vente"}</span>
						${client ? `<span class="sp-modal-log-detail">${client.name}</span>` : ""}
						<span class="sp-modal-log-time">${dateStr} — ${(sale.totalTTC || 0).toFixed(2)} €</span>
					</div>
				</div>`;
						})
						.join("")
				: `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">Aucune vente enregistrée</div>`;

		// Tasks
		const tasksHtml =
			pendingTasks.length > 0
				? pendingTasks
						.slice(0, 6)
						.map((t) => {
							const isOverdue = overdueTasks.includes(t);
							const proj = t.projectId
								? (data.projects || []).find(
										(p) => p.id === t.projectId,
									)
								: null;
							return `<div class="sp-modal-task-item${isOverdue ? " overdue" : ""}">
					<div class="sp-modal-task-dot" style="background:${isOverdue ? "var(--danger,#dc2626)" : "var(--border-dark,#c8c4bc)"}"></div>
					<div class="sp-modal-task-content">
						<span class="sp-modal-task-title">${t.title}</span>
						${proj ? `<span class="sp-modal-task-proj">${proj.emoji || "📁"} ${proj.name}</span>` : ""}
					</div>
					${isOverdue ? `<span class="badge badge-danger" style="font-size:0.65rem;padding:0.1rem 0.4rem;">Retard</span>` : ""}
				</div>`;
						})
						.join("")
				: `<div style="padding:0.75rem 0;text-align:center;color:var(--text-muted);font-size:0.82rem;">Aucune tâche en cours</div>`;

		const roleBadge = this.roleBadges[user.role] || "badge-info";
		const roleLabel = this.roleLabels[user.role] || user.role;

		const profileHTML = `
			<div class="sp-modal-header">
				<div class="sp-modal-header-left">
					<div class="sp-modal-avatar" style="background:${avatarColor.bg};color:${avatarColor.text};">${initials}</div>
					<div>
						<div class="sp-modal-name">${user.name}</div>
						<div class="sp-modal-meta">
							<span class="badge ${roleBadge}">${roleLabel}</span>
							<span class="badge ${user.active ? "badge-success" : "badge-danger"}">${user.active ? "Actif" : "Inactif"}</span>
						</div>
						<div class="sp-modal-username">@${user.username}</div>
						${lastLogin ? `<div class="sp-modal-lastlogin">Dernière connexion : ${lastLogin}</div>` : ""}
					</div>
				</div>
				<button class="btn-icon sp-modal-close" onclick="UsersModule.closeProfileModal()">
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="sp-modal-stats">
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${completedSales.length}</div><div class="sp-modal-stat-label">Ventes</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${revenue.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</div><div class="sp-modal-stat-label">Chiffre d'affaires</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${pendingTasks.length}</div><div class="sp-modal-stat-label">Tâches</div></div>
				<div class="sp-modal-stat${overdueTasks.length > 0 ? " danger" : ""}"><div class="sp-modal-stat-value">${overdueTasks.length}</div><div class="sp-modal-stat-label">En retard</div></div>
				<div class="sp-modal-stat"><div class="sp-modal-stat-value">${totalStock}</div><div class="sp-modal-stat-label">Stock total</div></div>
			</div>

			<div class="sp-modal-body">
				<div class="sp-modal-left">
					<div class="sp-modal-section-title">Informations</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">Rôle</div>
						<div class="sp-modal-prop-value"><span class="badge ${roleBadge}">${roleLabel}</span></div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">Statut</div>
						<div class="sp-modal-prop-value"><span class="badge ${user.active ? "badge-success" : "badge-danger"}">${user.active ? "Actif" : "Inactif"}</span></div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">Tâches actives</div>
						<div class="sp-modal-prop-value" style="font-weight:600;">${pendingTasks.length}</div>
					</div>
					<div class="sp-modal-prop">
						<div class="sp-modal-prop-label">En retard</div>
						<div class="sp-modal-prop-value" style="font-weight:600;${overdueTasks.length > 0 ? "color:var(--danger);" : ""}">${overdueTasks.length}</div>
					</div>
					<div class="sp-modal-section-title" style="margin-top:1.25rem;">Tâches en cours</div>
					<div class="sp-modal-tasks">${tasksHtml}</div>
				</div>

				<div class="sp-modal-right">
					<div class="modal-tabs">
						<button class="modal-tab active" data-tab="logs" onclick="UsersModule._switchProfileTab('logs', this)">Activité récente</button>
						<button class="modal-tab" data-tab="sales" onclick="UsersModule._switchProfileTab('sales', this)">Dernières ventes</button>
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
				<button class="btn-icon sp-modal-close" onclick="UsersModule.closeProfileModal()">
					Fermer
				</button>
			</div>
		`;

		const modal = document.getElementById("userProfileModal");
		if (modal) {
			modal.querySelector("#userProfileBody").innerHTML = profileHTML;
			modal.style.display = "flex";
		}
	},

	// Modal controls

	_switchProfileTab(tab, btn) {
		const modal = document.getElementById("userProfileModal");
		if (!modal) return;
		modal
			.querySelectorAll(".modal-tab")
			.forEach((t) => t.classList.remove("active"));
		modal
			.querySelectorAll(".modal-tab-panel")
			.forEach((p) => p.classList.remove("active"));
		if (btn) btn.classList.add("active");
		const targetPanel = modal.querySelector(
			`.modal-tab-panel[data-panel="${tab}"]`,
		);
		if (targetPanel) targetPanel.classList.add("active");
	},

	closeModal() {
		document.getElementById("userModal").style.display = "none";
	},

	closeProfileModal() {
		const modal = document.getElementById("userProfileModal");
		if (modal) modal.style.display = "none";
	},
};

window.UsersModule = UsersModule;
