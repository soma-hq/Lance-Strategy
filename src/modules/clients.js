const ClientsModule = {
	currentFilter: "all",
	searchQuery: "",
	selectedStatuses: [],

	toggleClientFilterDropdown(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const isOpen = el.classList.contains("open");
		document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
		if (!isOpen) el.classList.add("open");
	},

	selectClientStatus(status) {
		if (status === "all") {
			this.selectedStatuses = [];
		} else {
			const idx = this.selectedStatuses.indexOf(status);
			if (idx > -1) this.selectedStatuses.splice(idx, 1);
			else this.selectedStatuses.push(status);
		}
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		this.render();
	},

	getClientStatusLabel() {
		if (this.selectedStatuses.length === 0) return "Tous";
		const labels = { recurrent: "R\u00e9current", permanent: "Permanent", oneshot: "One-shot", inactive: "Inactif" };
		if (this.selectedStatuses.length === 1) return labels[this.selectedStatuses[0]] || "S\u00e9lectionn\u00e9s";
		return this.selectedStatuses.length + " s\u00e9lectionn\u00e9s";
	},

	// Initialization
	init() {
		this.currentFilter = "all";
		this.searchQuery = "";
		this.selectedStatuses = [];
		this.render();
		this.attachEventListeners();
	},

	// Data helpers
	getFilteredClients() {
		let clients = DataManager.get("clients") || [];

		if (this.selectedStatuses.length > 0) {
			clients = clients.filter((c) => this.selectedStatuses.includes(c.status));
		}

		if (this.searchQuery) {
			const q = this.searchQuery.toLowerCase();
			clients = clients.filter(
				(c) =>
					(c.name || "").toLowerCase().includes(q) ||
					(c.email || "").toLowerCase().includes(q) ||
					(c.phone || "").toLowerCase().includes(q) ||
					(c.company || "").toLowerCase().includes(q),
			);
		}

		return clients;
	},

	escapeHtml(str) {
		if (!str) return "";
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	},

	// Get sales stats for a client
	getClientSalesStats(clientId) {
		const data = DataManager.getData();
		const allSales = (data.sales || []).filter(
			(s) => s.clientId === clientId,
		);
		const now = new Date();
		const currentYearStart = new Date(now.getFullYear(), 0, 1);
		const currentSales = allSales.filter(
			(s) => new Date(s.date) >= currentYearStart,
		);
		const totalRevenue = allSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);
		// Deposited stock = total units purchased in non-cancelled sales
		const stockQuantity = allSales
			.filter((s) => s.status !== "cancelled")
			.reduce((sum, s) => sum + (s.quantity || 0), 0);

		return {
			totalSales: allSales.length,
			currentYearSales: currentSales.length,
			totalRevenue,
			stockQuantity,
		};
	},

	// Status configuration
	statusConfig: {
		recurrent: { badge: "badge-success", label: "Récurrent" },
		permanent: { badge: "badge-info", label: "Permanent" },
		oneshot: { badge: "badge-warning", label: "One-shot" },
		inactive: { badge: "badge-danger", label: "Inactif" },
	},

	// Rendering
	render() {
		const filtered = this.getFilteredClients();
		const canCreate = Auth.hasPermission("create");
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const users = (DataManager.get("users") || []).filter((u) => u.active);

		const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

		const html = `
			<style>
				/* Client cards grid */
				.clients-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
					gap: 1rem;
					margin-bottom: 1.5rem;
				}
				.client-card {
					background: var(--card-bg);
					border: 1.5px solid var(--border-color);
					border-radius: var(--radius);
					padding: 1.25rem;
					overflow: hidden;
					cursor: pointer;
					display: flex;
					flex-direction: column;
					gap: 0.85rem;
					box-shadow: var(--manga-shadow);
					transition: transform 0.15s, box-shadow 0.15s;
				}
				.client-card:hover {
					transform: translate(-1px, -1px);
					box-shadow: var(--manga-shadow-hover);
				}
				.client-card:active {
					transform: translate(1px, 1px);
					box-shadow: var(--manga-shadow-active);
				}
				.client-card-header {
					display: flex;
					align-items: flex-start;
					gap: 0.85rem;
				}
				.client-card-avatar {
					width: 42px;
					height: 42px;
					border-radius: 50%;
					background: var(--primary-light);
					color: var(--primary);
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: 700;
					font-size: 1rem;
					flex-shrink: 0;
					letter-spacing: 0.02em;
				}
				.client-card-info {
					flex: 1;
					min-width: 0;
				}
				.client-card-name {
					font-weight: 700;
					font-size: 0.95rem;
					color: var(--text);
					margin: 0 0 0.15rem 0;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.client-card-company {
					font-size: 0.78rem;
					color: var(--text-muted);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.client-card-body {
					display: flex;
					flex-direction: column;
					gap: 0.4rem;
					border-top: 1px solid var(--border-color);
					padding-top: 0.75rem;
				}
				.client-card-contact {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					font-size: 0.8rem;
					color: var(--text-secondary);
				}
				.client-card-contact svg {
					flex-shrink: 0;
					color: var(--text-muted);
				}
				.client-card-stats {
					display: flex;
					gap: 0;
					border: 1px solid var(--border-color);
					border-radius: var(--radius-sm);
					overflow: hidden;
					margin-top: 0.4rem;
				}
				.client-stat-item {
					flex: 1;
					padding: 0.5rem 0.35rem;
					text-align: center;
					border-right: 1px solid var(--border-color);
					background: var(--bg-alt, #f8f9fa);
				}
				.client-stat-item:last-child {
					border-right: none;
				}
				.client-stat-value {
					display: block;
					font-weight: 700;
					font-size: 0.95rem;
					color: var(--text);
				}
				.client-stat-label {
					display: block;
					font-size: 0.65rem;
					color: var(--text-muted);
					text-transform: uppercase;
					letter-spacing: 0.04em;
					margin-top: 0.1rem;
				}
				.client-card-footer {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding-top: 0.75rem;
					border-top: 1px solid var(--border-color);
				}
				.client-card-actions {
					display: flex;
					gap: 0.35rem;
					opacity: 0;
					transition: opacity 0.2s ease;
				}
				.client-card:hover .client-card-actions {
					opacity: 1;
				}

				/* Client detail modal */
				.client-detail-header {
					display: flex;
					align-items: center;
					gap: 1.25rem;
					padding: 1.25rem;
					background: var(--bg-alt, #f8f9fa);
					border-radius: var(--radius);
					margin-bottom: 1.25rem;
				}
				.client-detail-avatar {
					width: 64px;
					height: 64px;
					border-radius: 50%;
					background: var(--primary-light);
					color: var(--primary);
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: 700;
					font-size: 1.5rem;
					flex-shrink: 0;
				}
				.client-detail-info {
					flex: 1;
				}
				.client-detail-info h3 {
					margin: 0 0 0.25rem 0;
					font-size: 1.2rem;
					font-weight: 700;
					color: var(--text);
				}
				.client-detail-meta {
					display: flex;
					flex-wrap: wrap;
					gap: 0.75rem;
					margin-top: 0.4rem;
					font-size: 0.82rem;
					color: var(--text-muted);
				}
				.client-detail-meta-item {
					display: flex;
					align-items: center;
					gap: 0.35rem;
				}
				.client-detail-section-title {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					font-size: 0.9rem;
					font-weight: 600;
					color: var(--text);
					margin: 1.25rem 0 0.6rem 0;
					padding-bottom: 0.4rem;
					border-bottom: 2px solid var(--primary-light);
				}
				.client-detail-section-title svg {
					color: var(--primary);
				}
				/* Stat cards dans le modal detail */
				.client-detail-stats {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 0.75rem;
					margin-bottom: 0.75rem;
				}
				.client-detail-stat-card {
					padding: 0.85rem;
					background: var(--bg-alt, #f8f9fa);
					border: 1px solid var(--border-color);
					border-radius: var(--radius-sm);
					text-align: center;
				}
				.client-detail-stat-card .stat-value {
					font-size: 1.3rem;
					font-weight: 700;
					color: var(--text);
					display: block;
				}
				.client-detail-stat-card .stat-label {
					font-size: 0.72rem;
					color: var(--text-muted);
					text-transform: uppercase;
					letter-spacing: 0.04em;
					display: block;
					margin-top: 0.15rem;
				}
				.client-sale-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 0.6rem 0.85rem;
					border: 1px solid var(--border-color);
					border-radius: var(--radius-sm);
					margin-bottom: 0.4rem;
					background: var(--card-bg);
					font-size: 0.82rem;
				}
				.client-sale-item:last-child {
					margin-bottom: 0;
				}
				.client-sale-left {
					display: flex;
					flex-direction: column;
					gap: 0.1rem;
				}
				.client-sale-name {
					font-weight: 600;
					color: var(--text);
				}
				.client-sale-date {
					color: var(--text-muted);
					font-size: 0.75rem;
				}
				.client-sale-amount {
					font-weight: 700;
					color: var(--primary);
				}
				.client-stock-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 0.6rem 0.85rem;
					border: 1px solid var(--border-color);
					border-radius: var(--radius-sm);
					margin-bottom: 0.4rem;
					background: var(--card-bg);
					font-size: 0.82rem;
				}
			</style>

			<div class="clients-module">

				<!-- Section Header -->
				<div class="page-header-box">
					<div class="phb-left">
						<span class="phb-icon">${Icons.get("users", 18)}</span>
						<div class="phb-text">
							<h1>Clients</h1>
							<p class="page-description">Gérez et suivez votre portefeuille clients</p>
						</div>
					</div>
					${canCreate ? '<div class="page-header-box-actions"><button class="btn-primary" id="addClientBtn">Ajouter un client</button></div>' : ""}
				</div>

				<!-- Toolbar -->
				<div class="products-controls" style="margin-bottom:1rem;">
					<div class="products-controls-left">
						<div class="products-search-wrap">
							<span class="products-search-icon">${searchIcon}</span>
							<input type="text" id="clientsSearch" class="search-input" placeholder="Rechercher par nom, email, téléphone…" value="${this.escapeHtml(this.searchQuery)}" style="padding-left:2.4rem;max-width:280px;">
						</div>
						<div class="filter-dropdown" id="filterClientStatus">
							<button class="filter-btn ${this.selectedStatuses.length > 0 ? 'active' : ''}" onclick="ClientsModule.toggleClientFilterDropdown('filterClientStatus')">
								<span class="filter-btn-label">Statut:</span>
								<span class="filter-btn-value">${this.getClientStatusLabel()}</span>
								<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
							</button>
							<div class="filter-menu">
								<div class="filter-menu-item ${this.selectedStatuses.length === 0 ? 'selected' : ''}" onclick="ClientsModule.selectClientStatus('all')">
									<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
									<span class="filter-menu-item-label">Tous</span>
								</div>
								<div class="filter-menu-divider"></div>
								<div class="filter-menu-item ${this.selectedStatuses.includes('recurrent') ? 'selected' : ''}" onclick="ClientsModule.selectClientStatus('recurrent')">
									<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
									<span class="badge badge-success" style="font-size:0.72rem;">Récurrent</span>
								</div>
								<div class="filter-menu-item ${this.selectedStatuses.includes('permanent') ? 'selected' : ''}" onclick="ClientsModule.selectClientStatus('permanent')">
									<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
									<span class="badge badge-info" style="font-size:0.72rem;">Permanent</span>
								</div>
								<div class="filter-menu-item ${this.selectedStatuses.includes('oneshot') ? 'selected' : ''}" onclick="ClientsModule.selectClientStatus('oneshot')">
									<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
									<span class="badge badge-warning" style="font-size:0.72rem;">One-shot</span>
								</div>
								<div class="filter-menu-item ${this.selectedStatuses.includes('inactive') ? 'selected' : ''}" onclick="ClientsModule.selectClientStatus('inactive')">
									<div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div>
									<span class="badge badge-danger" style="font-size:0.72rem;">Inactif</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Cards Grid -->
				<div id="clientsGrid">
					${this.renderCards(filtered, canEdit, canDelete)}
				</div>

			</div>

			<!-- Client Detail Modal -->
			<div id="clientDetailOverlay" class="modal-overlay" style="display: none;">
				<div class="modal-content modal-large">
					<div class="modal-header">
						<h3 id="clientDetailTitle">Détails du client</h3>
						<button class="btn-icon" onclick="ClientsModule.closeDetailModal()" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body" id="clientDetailBody">
						<!-- Filled dynamically -->
					</div>
					<div class="modal-footer" id="clientDetailFooter">
						<!-- Filled dynamically -->
					</div>
				</div>
			</div>

			<!-- Add / Edit Modal -->
			<div id="clientModalOverlay" class="modal-overlay" style="display: none;">
				<div class="modal-content">
					<div class="modal-header">
						<h3 id="clientModalTitle">
							Ajouter un client
						</h3>
						<button class="btn-icon" onclick="ClientsModule.closeModal()" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body">
						<form id="clientForm" onsubmit="return false;">
							<input type="hidden" id="clientId">

							<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem;">
								<div class="form-group">
									<label for="clientName">Nom du client *</label>
									<input type="text" id="clientName" placeholder="Nom complet" required>
								</div>
								<div class="form-group">
									<label for="clientCompany">Entreprise</label>
									<input type="text" id="clientCompany" placeholder="Nom de l'entreprise">
								</div>
							</div>

							<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem;">
								<div class="form-group">
									<label for="clientEmail">Email *</label>
									<input type="email" id="clientEmail" placeholder="email@exemple.com" required>
								</div>
								<div class="form-group">
									<label for="clientPhone">Téléphone</label>
									<input type="tel" id="clientPhone" placeholder="+33 6 00 00 00 00">
								</div>
							</div>

							<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem;">
								<div class="form-group">
									<label for="clientStatus">Statut *</label>
									<select id="clientStatus" required>
										<option value="recurrent">Récurrent</option>
										<option value="permanent">Permanent</option>
										<option value="oneshot">One-shot</option>
										<option value="inactive">Inactif</option>
									</select>
								</div>
								<div class="form-group">
									<label for="clientResponsible">Responsable</label>
									<select id="clientResponsible">
										<option value="">-- Aucun --</option>
										${users.map((u) => `<option value="${u.id}">${this.escapeHtml(u.name)}</option>`).join("")}
									</select>
								</div>
							</div>

							<div class="form-group">
								<label for="clientNotes">Notes</label>
								<textarea id="clientNotes" rows="3" placeholder="Informations complémentaires…"></textarea>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" onclick="ClientsModule.closeModal()">Annuler</button>
						<button class="btn-success" onclick="ClientsModule.saveClient()">
							Enregistrer
						</button>
					</div>
				</div>
			</div>
		`;

		document.getElementById("clientsPage").innerHTML = html;
	},

	renderCards(clients, canEdit, canDelete) {
		if (clients.length === 0) {
			const hasFilters = this.searchQuery || this.currentFilter !== "all";
			const canCreate = Auth.hasPermission("create");
			return `
				<div class="empty-state-dashed">
					<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
						${Icons.get("users", 40)}
					</div>
					<h4>${hasFilters ? "Aucun résultat" : "Aucun client actuel"}</h4>
					<p>${hasFilters ? "Modifiez vos critères de recherche ou de filtre" : "Commencez par ajouter votre premier client"}</p>
					${
						!hasFilters && canCreate
							? `<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="ClientsModule.showAddModal()">
								Ajouter un client
							</button>`
							: ""
					}
				</div>
			`;
		}

		const canCreate = Auth.hasPermission("create");
	return `<div class="clients-grid">${clients.map((c) => this.renderClientCard(c, canEdit, canDelete)).join("")}${canCreate ? `<button class="quick-add-card" onclick="ClientsModule.showAddModal()"><div class="quick-add-card-icon">+</div><span>Ajouter un client</span></button>` : ""}</div>`;
	},

	renderClientCard(client, canEdit, canDelete) {
		const cfg =
			this.statusConfig[client.status] || this.statusConfig.inactive;
		const initial = client.name ? client.name.charAt(0).toUpperCase() : "?";
		const stats = this.getClientSalesStats(client.id);

		return `
			<div class="client-card" oncontextmenu="event.preventDefault();ClientsModule.showContextMenu(event,${client.id})" onclick="ClientsModule.viewClientDetail(${client.id})">
				<div class="client-card-header">
					<div class="client-card-avatar">${initial}</div>
					<div class="client-card-info">
						<p class="client-card-name">${this.escapeHtml(client.name)}</p>
						<span class="client-card-company">${this.escapeHtml(client.company) || '<em style="color: var(--text-muted);">Sans entreprise</em>'}</span>
					</div>
					<span class="badge ${cfg.badge}">${cfg.label}</span>
				</div>

				<div class="client-card-body">
					${
						client.email
							? `
					<div class="client-card-contact">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
						<span>${this.escapeHtml(client.email)}</span>
					</div>`
							: ""
					}
					${
						client.phone
							? `
					<div class="client-card-contact">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
						<span>${this.escapeHtml(client.phone)}</span>
					</div>`
							: ""
					}

					<div class="client-card-stats">
						<div class="client-stat-item">
							<span class="client-stat-value">${stats.totalSales}</span>
							<span class="client-stat-label">Ventes</span>
						</div>
						<div class="client-stat-item">
							<span class="client-stat-value">${stats.totalRevenue > 0 ? stats.totalRevenue.toFixed(0) + "€" : "0€"}</span>
							<span class="client-stat-label">CA total</span>
						</div>
						<div class="client-stat-item">
							<span class="client-stat-value">${stats.stockQuantity}</span>
							<span class="client-stat-label">Unités</span>
						</div>
					</div>
				</div>

				<div class="client-card-footer">
					<span style="font-size: 0.72rem; color: var(--text-muted);">
						${stats.currentYearSales} vente${stats.currentYearSales !== 1 ? "s" : ""} cette année
					</span>
					<div class="client-card-actions" onclick="event.stopPropagation()">
						${canEdit ? `<button class="btn-icon" onclick="ClientsModule.editClient(${client.id})" title="Modifier">${Icons.get("edit", 14)}</button>` : ""}
					</div>
				</div>
			</div>
		`;
	},

	// Client detail modal

	viewClientDetail(clientId) {
		const client = DataManager.findById("clients", clientId);
		if (!client) return;

		const data = DataManager.getData();
		const cfg =
			this.statusConfig[client.status] || this.statusConfig.inactive;
		const initial = client.name ? client.name.charAt(0).toUpperCase() : "?";

		// Sales data
		const allClientSales = (data.sales || [])
			.filter((s) => s.clientId === clientId)
			.sort((a, b) => new Date(b.date) - new Date(a.date));

		const now = new Date();
		const currentYearStart = new Date(now.getFullYear(), 0, 1);
		const currentSales = allClientSales.filter(
			(s) => new Date(s.date) >= currentYearStart,
		);
		const pastSales = allClientSales.filter(
			(s) => new Date(s.date) < currentYearStart,
		);

		const totalRevenue = allClientSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);
		const currentRevenue = currentSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);

		// Stock per product: qty purchased in non-cancelled sales
		const stockByProduct = {};
		allClientSales
			.filter((s) => s.status !== "cancelled")
			.forEach((s) => {
				const product = (data.products || []).find(
					(p) => p.id === s.productId,
				);
				const pName = product
					? product.name
					: `Produit #${s.productId}`;
				stockByProduct[pName] =
					(stockByProduct[pName] || 0) + (s.quantity || 0);
			});

		// Responsible user
		const responsible = client.responsibleId
			? (data.users || []).find((u) => u.id === client.responsibleId)
			: null;

		const renderSaleRow = (sale) => {
			const product = (data.products || []).find(
				(p) => p.id === sale.productId,
			);
			const dateStr = new Date(sale.date).toLocaleDateString("fr-FR", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			});
			return `
				<div class="client-sale-item">
					<div class="client-sale-left">
						<span class="client-sale-name">${this.escapeHtml(product?.name || "Produit inconnu")}</span>
						<span class="client-sale-date">${dateStr} · ${sale.quantity || 0} unité${(sale.quantity || 0) !== 1 ? "s" : ""}</span>
					</div>
					<span class="client-sale-amount">${(sale.totalTTC || 0).toFixed(2)}€</span>
				</div>
			`;
		};

		const currentSalesHTML =
			currentSales.length > 0
				? currentSales.slice(0, 10).map(renderSaleRow).join("")
				: `<div style="text-align:center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">Aucune vente cette année</div>`;

		const pastSalesHTML =
			pastSales.length > 0
				? pastSales.slice(0, 10).map(renderSaleRow).join("")
				: `<div style="text-align:center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">Aucune vente passée</div>`;

		const stockHTML =
			Object.keys(stockByProduct).length > 0
				? Object.entries(stockByProduct)
						.map(
							([name, qty]) => `
							<div class="client-stock-item">
								<span style="font-weight: 600; color: var(--text);">${this.escapeHtml(name)}</span>
								<span style="font-weight: 700; color: var(--primary);">${qty} unité${qty !== 1 ? "s" : ""}</span>
							</div>
						`,
						)
						.join("")
				: `<div style="text-align:center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">Aucun stock enregistré</div>`;

		const bodyHTML = `
			<!-- Client header -->
			<div class="client-detail-header">
				<div class="client-detail-avatar">${initial}</div>
				<div class="client-detail-info">
					<h3>${this.escapeHtml(client.name)}</h3>
					<span class="badge ${cfg.badge}">${cfg.label}</span>
					<div class="client-detail-meta">
						${client.company ? `<span class="client-detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> ${this.escapeHtml(client.company)}</span>` : ""}
						${client.email ? `<span class="client-detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${this.escapeHtml(client.email)}</span>` : ""}
						${client.phone ? `<span class="client-detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${this.escapeHtml(client.phone)}</span>` : ""}
						${responsible ? `<span class="client-detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${this.escapeHtml(responsible.name)}</span>` : ""}
					</div>
				</div>
			</div>

			<!-- Stats -->
			<div class="client-detail-stats">
				<div class="client-detail-stat-card">
					<span class="stat-value">${allClientSales.length}</span>
					<span class="stat-label">Ventes totales</span>
				</div>
				<div class="client-detail-stat-card">
					<span class="stat-value">${totalRevenue.toFixed(0)}€</span>
					<span class="stat-label">CA total</span>
				</div>
				<div class="client-detail-stat-card">
					<span class="stat-value">${currentRevenue.toFixed(0)}€</span>
					<span class="stat-label">CA ${now.getFullYear()}</span>
				</div>
			</div>

			<!-- Stock déposé -->
			<div class="client-detail-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
				Stock déposé (cumulatif)
			</div>
			${stockHTML}

			<!-- Ventes actuelles (année en cours) -->
			<div class="client-detail-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
				Ventes ${now.getFullYear()} (${currentSales.length})
			</div>
			${currentSalesHTML}

			<!-- Ventes passées -->
			<div class="client-detail-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
				Historique des achats (${pastSales.length})
			</div>
			${pastSalesHTML}

			${
				client.notes
					? `
			<div class="client-detail-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
				Notes
			</div>
			<div style="padding: 0.85rem; background: var(--bg-alt, #f8f9fa); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
				${this.escapeHtml(client.notes)}
			</div>`
					: ""
			}
		`;

		const canEdit = Auth.hasPermission("edit");
		const footerHTML = `
			<button class="btn-secondary" onclick="ClientsModule.closeDetailModal()">Fermer</button>
			${canEdit ? `<button class="btn-primary" onclick="ClientsModule.closeDetailModal(); ClientsModule.editClient(${clientId});">Modifier</button>` : ""}
		`;

		document.getElementById("clientDetailTitle").textContent = client.name;
		document.getElementById("clientDetailBody").innerHTML = bodyHTML;
		document.getElementById("clientDetailFooter").innerHTML = footerHTML;
		document.getElementById("clientDetailOverlay").style.display = "flex";
	},

	closeDetailModal() {
		const overlay = document.getElementById("clientDetailOverlay");
		if (overlay) overlay.style.display = "none";
	},

	// Event handling

	attachEventListeners() {
		const addBtn = document.getElementById("addClientBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.showAddModal());
		}

		const search = document.getElementById("clientsSearch");
		if (search) {
			search.addEventListener("input", (e) => {
				this.searchQuery = e.target.value;
				this.refreshCards();
			});
		}

		// Close filter dropdowns on outside click
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".filter-dropdown")) {
				document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
			}
		});

		const overlay = document.getElementById("clientModalOverlay");
		if (overlay) {
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) this.closeModal();
			});
		}

		const detailOverlay = document.getElementById("clientDetailOverlay");
		if (detailOverlay) {
			detailOverlay.addEventListener("click", (e) => {
				if (e.target === detailOverlay) this.closeDetailModal();
			});
		}

		this._escHandler = (e) => {
			if (e.key === "Escape") {
				this.closeModal();
				this.closeDetailModal();
			}
		};
		document.addEventListener("keydown", this._escHandler);
	},

	refreshCards() {
		const filtered = this.getFilteredClients();
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");

		const grid = document.getElementById("clientsGrid");
		if (grid) {
			grid.innerHTML = this.renderCards(filtered, canEdit, canDelete);
		}
	},

	// Modal operations

	showAddModal() {
		const title = document.getElementById("clientModalTitle");
		if (title) title.textContent = "Ajouter un client";

		const form = document.getElementById("clientForm");
		if (form) form.reset();

		const idField = document.getElementById("clientId");
		if (idField) idField.value = "";

		this.populateResponsibleDropdown();

		const overlay = document.getElementById("clientModalOverlay");
		if (overlay) overlay.style.display = "flex";
	},

	editClient(id) {
		const client = DataManager.findById("clients", id);
		if (!client) return;

		const title = document.getElementById("clientModalTitle");
		if (title) title.textContent = "Modifier le client";

		document.getElementById("clientId").value = client.id;
		document.getElementById("clientName").value = client.name || "";
		document.getElementById("clientEmail").value = client.email || "";
		document.getElementById("clientPhone").value = client.phone || "";
		document.getElementById("clientCompany").value = client.company || "";
		document.getElementById("clientStatus").value =
			client.status || "recurrent";
		document.getElementById("clientNotes").value = client.notes || "";

		this.populateResponsibleDropdown(client.responsibleId);

		const overlay = document.getElementById("clientModalOverlay");
		if (overlay) overlay.style.display = "flex";
	},

	populateResponsibleDropdown(selectedId) {
		const select = document.getElementById("clientResponsible");
		if (!select) return;

		const users = (DataManager.get("users") || []).filter((u) => u.active);
		select.innerHTML =
			'<option value="">-- Aucun --</option>' +
			users
				.map(
					(u) =>
						`<option value="${u.id}"${u.id === selectedId ? " selected" : ""}>${this.escapeHtml(u.name)}</option>`,
				)
				.join("");
	},

	saveClient() {
		const name = document.getElementById("clientName").value.trim();
		const email = document.getElementById("clientEmail").value.trim();

		if (!name || !email) {
			showToast("Veuillez remplir les champs obligatoires.", "warning");
			return;
		}

		const id = document.getElementById("clientId").value;
		const responsibleValue =
			document.getElementById("clientResponsible").value;

		const clientData = {
			name: name,
			email: email,
			phone: document.getElementById("clientPhone").value.trim(),
			company: document.getElementById("clientCompany").value.trim(),
			responsibleId: responsibleValue ? parseInt(responsibleValue) : null,
			status: document.getElementById("clientStatus").value,
			notes: document.getElementById("clientNotes").value.trim(),
			lastInteraction: new Date().toISOString(),
		};

		const user = Auth.getCurrentUser();

		if (id) {
			DataManager.update("clients", parseInt(id), clientData);
			DataManager.addLog(
				"Modification client",
				`${clientData.name} modifié`,
				user.id,
			);
			showToast("Client modifié avec succès.", "success");
		} else {
			DataManager.add("clients", clientData);
			DataManager.addLog(
				"Création client",
				`${clientData.name} créé`,
				user.id,
			);
			showToast("Client créé avec succès.", "success");
		}

		this.closeModal();
		this.init();
		Navigation.updateDashboardStats();
	},

	showContextMenu(e, id) {
		const client = DataManager.findById("clients", id);
		if (!client) return;
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const items = [
			{ label: "Voir le détail", icon: Icons.get("eye", 14), action: () => this.viewClientDetail(id) },
			...(canEdit ? [{ label: "Modifier", icon: Icons.get("edit", 14), action: () => this.openEditModal(id) }] : []),
			...(canDelete ? [{ divider: true }, { label: "Supprimer", icon: Icons.get("trash", 14), danger: true, action: () => this.deleteClient(id) }] : []),
		];
		ContextMenu.show(e, items);
	},

	async deleteClient(id) {
		const client = DataManager.findById("clients", id);
		if (!client) return;
		const confirmed = await showConfirm(
			`Supprimer le client "${client.name}" ?`,
			"Cette action est irréversible.",
			"danger",
		);
		if (!confirmed) return;

		// client is already fetched above
		const user = Auth.getCurrentUser();
		DataManager.delete("clients", id);
		DataManager.addLog(
			"Suppression client",
			`${client.name} supprimé`,
			user.id,
		);
		showToast("Client supprimé avec succès.", "success");

		this.init();
		Navigation.updateDashboardStats();
	},

	closeModal() {
		const overlay = document.getElementById("clientModalOverlay");
		if (overlay) overlay.style.display = "none";
	},
};

window.ClientsModule = ClientsModule;
