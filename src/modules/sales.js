// Sales module - Complete redesign with professional UI
const SalesModule = {
	cart: [],
	selectedStatuses: [],
	selectedPlatforms: [],
	currentFilters: { search: "", status: "", dateFrom: "", dateTo: "" },

	toggleSalesFilterDropdown(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const isOpen = el.classList.contains("open");
		document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
		if (!isOpen) el.classList.add("open");
	},

	selectSaleStatus(status) {
		if (status === "all") { this.selectedStatuses = []; }
		else {
			const i = this.selectedStatuses.indexOf(status);
			if (i > -1) this.selectedStatuses.splice(i, 1); else this.selectedStatuses.push(status);
		}
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		this.applyFilters();
	},

	selectSalePlatform(platform) {
		if (platform === "all") { this.selectedPlatforms = []; }
		else {
			const i = this.selectedPlatforms.indexOf(platform);
			if (i > -1) this.selectedPlatforms.splice(i, 1); else this.selectedPlatforms.push(platform);
		}
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		this.applyFilters();
	},

	getSaleStatusLabel() {
		if (this.selectedStatuses.length === 0) return "Tous";
		const labels = { completed: "Compl\u00e9t\u00e9e", pending: "En cours", cancelled: "Annul\u00e9e" };
		if (this.selectedStatuses.length === 1) return labels[this.selectedStatuses[0]] || "S\u00e9lectionn\u00e9s";
		return this.selectedStatuses.length + " s\u00e9lectionn\u00e9s";
	},

	getSalePlatformLabel() {
		if (this.selectedPlatforms.length === 0) return "Toutes";
		const labels = { plateforme: "Plateforme", site: "Site Web", evenement: "\u00c9v\u00e8nement" };
		if (this.selectedPlatforms.length === 1) return labels[this.selectedPlatforms[0]] || "S\u00e9lectionn\u00e9es";
		return this.selectedPlatforms.length + " s\u00e9lectionn\u00e9es";
	},

		// Initialization
	init() {
		this.cart = [];
		this.currentFilters = {
			search: "",
			status: "",
			platform: "",
			dateFrom: "",
			dateTo: "",
		};
		this.selectedStatuses = [];
		this.selectedPlatforms = [];
		this.render();
		this.attachEventListeners();
	},

	// Utilities
	formatCurrency(amount) {
		return (amount || 0).toFixed(2) + " \u20AC";
	},

	formatDate(dateStr) {
		if (!dateStr) return "--";
		return new Date(dateStr).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	},

	formatDateTime(dateStr) {
		if (!dateStr) return "--";
		return new Date(dateStr).toLocaleString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	},

	getSaleNumber(id) {
		return "#" + String(id).padStart(4, "0");
	},

	getStatusLabel(status) {
		const labels = {
			completed: "Compl\u00e9t\u00e9e",
			pending: "En cours",
			cancelled: "Annul\u00e9e",
		};
		return labels[status] || labels.completed;
	},

	getStatusBadgeClass(status) {
		const classes = {
			completed: "badge-success",
			pending: "badge-warning",
			cancelled: "badge-danger",
		};
		return classes[status] || classes.completed;
	},

	getPlatformConfig(platform) {
		const configs = {
			plateforme: {
				label: "Plateforme",
				rowStyle:
					"background: rgba(74, 144, 226, 0.08); border-left: 3px solid #4a90e2;",
				badge: "badge-info",
			},
			site: {
				label: "Site Web",
				rowStyle:
					"background: rgba(220, 53, 69, 0.08); border-left: 3px solid #dc3545;",
				badge: "badge-danger",
			},
			evenement: {
				label: "Évènement",
				rowStyle:
					"background: var(--card-bg); border-left: 3px solid var(--border-color);",
				badge: "badge-light",
			},
		};
		return configs[platform] || configs.evenement;
	},

	// Statistics
	computeStats(sales) {
		const completedSales = sales.filter(
			(s) => (s.status || "completed") === "completed",
		);
		const pendingSales = sales.filter(
			(s) => (s.status || "completed") === "pending",
		);
		const totalRevenue = completedSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);
		const averageSale =
			completedSales.length > 0
				? totalRevenue / completedSales.length
				: 0;

		return {
			totalSales: sales.length,
			totalRevenue,
			averageSale,
			pendingOrders: pendingSales.length,
		};
	},

	// Filtering
	getFilteredSales() {
		let sales = DataManager.get("sales");
		const { search, status, platform, dateFrom, dateTo } =
			this.currentFilters;

		if (search) {
			const q = search.toLowerCase();
			sales = sales.filter((s) => {
				const product = DataManager.findById("products", s.productId);
				const seller = DataManager.findById("users", s.sellerId);
				const num = this.getSaleNumber(s.id);
				return (
					(product?.name || "").toLowerCase().includes(q) ||
					(s.clientName || "").toLowerCase().includes(q) ||
					(seller?.name || "").toLowerCase().includes(q) ||
					num.includes(q)
				);
			});
		}

		if (this.selectedStatuses.length > 0) {
			sales = sales.filter((s) => this.selectedStatuses.includes(s.status || "completed"));
		} else if (status) {
			sales = sales.filter((s) => (s.status || "completed") === status);
		}

		if (this.selectedPlatforms.length > 0) {
			sales = sales.filter((s) => this.selectedPlatforms.includes(s.platform || "evenement"));
		} else if (platform) {
			sales = sales.filter(
				(s) => (s.platform || "evenement") === platform,
			);
		}

		if (dateFrom) {
			const from = new Date(dateFrom);
			from.setHours(0, 0, 0, 0);
			sales = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		}

		if (dateTo) {
			const to = new Date(dateTo);
			to.setHours(23, 59, 59, 999);
			sales = sales.filter((s) => new Date(s.createdAt || s.date) <= to);
		}

		return sales;
	},

	// Main render
	render() {
		const allSales = DataManager.get("sales");
		const canCreate = Auth.hasPermission("create");
		const stats = this.computeStats(allSales);

		const searchIconSvg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';

		const html = `
			<!-- Page Header -->
			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("dollarSign", 18)}</span>
						<div class="phb-text">
							<h1>Ventes</h1>
							<p class="page-description">Gère et suis toutes tes transactions</p>
						</div>
				</div>
				${canCreate ? '<div class="page-header-box-actions"><button class="btn-primary" id="addSaleBtn">Ajouter une vente</button></div>' : ""}
			</div>

			<!-- Statistics (design identique à Logs) -->
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">
						${Icons.get("dollarSign", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${stats.totalSales}</div>
						<div class="stat-label">Total ventes</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--success-light); color: var(--success);">
						${Icons.get("trendingUp", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.formatCurrency(stats.totalRevenue)}</div>
						<div class="stat-label">Chiffre d'affaires</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--info-light); color: var(--info);">
						${Icons.get("barChart", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.formatCurrency(stats.averageSale)}</div>
						<div class="stat-label">Panier moyen</div>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">
						${Icons.get("clock", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${stats.pendingOrders}</div>
						<div class="stat-label">En cours</div>
					</div>
				</div>
			</div>

			<!-- Controls Bar -->
			<div class="products-controls" style="margin-bottom:1rem;">
				<div class="products-controls-left">
					<div class="products-search-wrap">
						<span class="products-search-icon">${searchIconSvg}</span>
						<input type="text" class="search-input" id="salesSearch" placeholder="Rechercher par client, produit, n° vente..." style="padding-left:2.4rem;max-width:280px;">
					</div>
					<input type="date" id="salesDateFrom" class="products-filter-select" style="min-width:135px;" title="Date de début">
					<input type="date" id="salesDateTo" class="products-filter-select" style="min-width:135px;" title="Date de fin">
					<div class="filter-dropdown" id="filterSaleStatus">
						<button class="filter-btn ${this.selectedStatuses.length > 0 ? 'active' : ''}" onclick="SalesModule.toggleSalesFilterDropdown('filterSaleStatus')">
							<span class="filter-btn-label">Statut:</span>
							<span class="filter-btn-value">${this.getSaleStatusLabel()}</span>
							<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
						</button>
						<div class="filter-menu">
							<div class="filter-menu-item ${this.selectedStatuses.length === 0 ? 'selected' : ''}" onclick="SalesModule.selectSaleStatus('all')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="filter-menu-item-label">Tous</span></div>
							<div class="filter-menu-divider"></div>
							<div class="filter-menu-item ${this.selectedStatuses.includes('completed') ? 'selected' : ''}" onclick="SalesModule.selectSaleStatus('completed')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="badge badge-success" style="font-size:0.72rem;">Complétée</span></div>
							<div class="filter-menu-item ${this.selectedStatuses.includes('pending') ? 'selected' : ''}" onclick="SalesModule.selectSaleStatus('pending')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="badge badge-warning" style="font-size:0.72rem;">En cours</span></div>
							<div class="filter-menu-item ${this.selectedStatuses.includes('cancelled') ? 'selected' : ''}" onclick="SalesModule.selectSaleStatus('cancelled')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="badge badge-danger" style="font-size:0.72rem;">Annulée</span></div>
						</div>
					</div>
					<div class="filter-dropdown" id="filterSalePlatform">
						<button class="filter-btn ${this.selectedPlatforms.length > 0 ? 'active' : ''}" onclick="SalesModule.toggleSalesFilterDropdown('filterSalePlatform')">
							<span class="filter-btn-label">Plateforme:</span>
							<span class="filter-btn-value">${this.getSalePlatformLabel()}</span>
							<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
						</button>
						<div class="filter-menu">
							<div class="filter-menu-item ${this.selectedPlatforms.length === 0 ? 'selected' : ''}" onclick="SalesModule.selectSalePlatform('all')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="filter-menu-item-label">Toutes</span></div>
							<div class="filter-menu-divider"></div>
							<div class="filter-menu-item ${this.selectedPlatforms.includes('plateforme') ? 'selected' : ''}" onclick="SalesModule.selectSalePlatform('plateforme')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="filter-menu-item-label">Plateforme</span></div>
							<div class="filter-menu-item ${this.selectedPlatforms.includes('site') ? 'selected' : ''}" onclick="SalesModule.selectSalePlatform('site')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="filter-menu-item-label">Site Web</span></div>
							<div class="filter-menu-item ${this.selectedPlatforms.includes('evenement') ? 'selected' : ''}" onclick="SalesModule.selectSalePlatform('evenement')"><div class="filter-check"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg></div><span class="filter-menu-item-label">Évènement</span></div>
						</div>
					</div>
				</div>
			</div>
			<!-- Sales Table -->
			<div class="card" style="padding: 0; overflow: hidden; margin-top: 1.25rem;">
				<div class="table-container" style="border: none;">
					<table class="data-table">
						<thead>
							<tr>
								<th>N\u00b0 Vente</th>
								<th>Plateforme</th>
								<th>Client</th>
								<th>Produit</th>
								<th>Montant</th>
								<th>Statut</th>
								<th>Date</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody id="salesTableBody">
							${this.renderTableRows(allSales)}
						</tbody>
					</table>
				</div>
				${
					allSales.length === 0
						? `<div class="empty-state-dashed">
						<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
							${Icons.get("dollarSign", 40)}
						</div>
						<h4>Aucune vente actuelle</h4>
						<p>Les ventes appara\u00eetront ici une fois cr\u00e9\u00e9es</p>
						${
							canCreate
								? `<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="SalesModule.showAddModal()">
								Ajouter une vente
							</button>`
								: ""
						}
					</div>`
						: ""
				}
			</div>
			${canCreate ? `<button class="quick-add-box" style="margin-top:0.75rem;" onclick="SalesModule.showAddModal()"><span class="quick-add-box-icon">+</span> Ajouter une vente</button>` : ""}

			<style id="invoice-modal-styles">
				.invoice-preview { background: var(--bg, #f0ede8); border: 1.5px solid var(--border-color, #ddd8d0); border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0; min-height: 360px; }
				.invoice-header { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-light); }
				.invoice-items { flex: 1; min-height: 130px; overflow-y: auto; }
				.invoice-footer { margin-top: auto; padding-top: 0.75rem; }
				.invoice-row { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; font-size: 0.88rem; color: var(--text-secondary); }
				.invoice-row.total { font-size: 1.05rem; font-weight: 700; color: var(--text); }
				.invoice-divider { border: none; border-top: 1.5px dashed var(--border-color); margin: 0.75rem 0; }
				.modal-content--xl { max-width: 880px; }
				#saleModal .grid-2 { grid-template-columns: 1.4fr 0.85fr; gap: 1.25rem; align-items: start; }
			</style>

			<!-- New Sale Modal -->
			<div id="saleModal" class="modal-overlay" style="display: none;">
				<div class="modal-content modal-content--xl" style="max-width: 880px; width: 95vw;">
					<div class="modal-header">
						<h2 class="modal-title">Nouvelle vente</h2>
						<button class="btn-icon" onclick="SalesModule.closeModal()">${Icons.get("x", 18)}</button>
					</div>
					<div class="modal-body">
						<div class="grid-2">
							<!-- Left: Product Selection -->
							<div>
								<h3 class="section-subtitle" style="display: flex; align-items: center; gap: 0.5rem;">
									${Icons.get("package", 18)} Ajouter des produits
								</h3>
								<form id="addProductToCartForm" onsubmit="event.preventDefault(); SalesModule.addToCart();">
									<div class="form-group">
										<label for="saleClient">Client</label>
										<select id="saleClient">
											<option value="">-- Aucun client --</option>
										</select>
									</div>
									<div class="form-group">
										<label for="salePlatform">Plateforme de vente</label>
										<select id="salePlatform">
											<option value="evenement">Évènement</option>
											<option value="plateforme">Plateforme (en ligne)</option>
											<option value="site">Site Web</option>
										</select>
									</div>
									<div class="form-group">
										<label for="saleSeller">Vendeur</label>
										<select id="saleSeller" required onchange="SalesModule.updateStockInfo()">
										</select>
									</div>
									<div class="form-group">
										<label for="saleProduct">Produit</label>
										<select id="saleProduct" required onchange="SalesModule.updateStockInfo()">
											<option value="">-- S\u00e9lectionner un produit --</option>
										</select>
									</div>
									<div class="form-group">
										<label for="saleQuantity">Quantit\u00e9</label>
										<input type="number" id="saleQuantity" min="1" placeholder="Nombre d'unit\u00e9s..." required oninput="SalesModule.checkStock()">
										<div id="stockWarning" class="stock-warning" style="display: none;">
											<strong>Stock insuffisant :</strong> <span id="stockWarningText"></span>
										</div>
										<div id="stockInfo" class="lead"></div>
									</div>
									<button type="submit" class="btn-primary w-100" id="addToCartBtn">
										Ajouter au panier
									</button>
								</form>
							</div>

							<!-- Right: Invoice Preview -->
							<div class="invoice-preview">
								<div class="invoice-header">
									${Icons.get("eye", 16)} Aperçu de la vente
								</div>
								<div class="invoice-items">
									<div id="cartPreview">
										<div class="empty-preview">
											<div class="empty-icon">${Icons.get("package", 48)}</div>
											<p>Aucun produit ajouté</p>
										</div>
									</div>
								</div>
								<div class="invoice-footer">
									<div class="invoice-row">
										<span>Sous-total HT</span>
										<span id="cartTotalHT">0.00 €</span>
									</div>
									<div class="invoice-row">
										<span>TVA (20%)</span>
										<span id="cartTVA">0.00 €</span>
									</div>
									<hr class="invoice-divider">
									<div class="invoice-row total">
										<span>Total TTC</span>
										<span id="cartTotalTTC">0.00 €</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" onclick="SalesModule.closeModal()">Annuler</button>
						<button class="btn-success" onclick="SalesModule.validateSale()" id="validateSaleBtn" disabled>
							Valider la vente
						</button>
					</div>
				</div>
			</div>

			<!-- View Sale Detail Modal -->
			<div id="saleDetailModal" class="modal-overlay" style="display: none;">
				<div class="modal-content" style="max-width: 540px;">
					<div class="modal-header">
						<h2 class="modal-title">D\u00e9tail de la vente</h2>
						<button class="btn-icon" onclick="SalesModule.closeDetailModal()">${Icons.get("x", 18)}</button>
					</div>
					<div class="modal-body" id="saleDetailBody"></div>
					<div class="modal-footer">
						<button class="btn-secondary" onclick="SalesModule.closeDetailModal()">Fermer</button>
					</div>
				</div>
			</div>
		`;

		document.getElementById("salesPage").innerHTML = html;
	},

	// Table rows
	renderTableRows(sales) {
		if (sales.length === 0) return "";

		const canDelete = Auth.hasPermission("delete");

		return sales
			.slice()
			.reverse()
			.map((sale) => {
				const product = DataManager.findById(
					"products",
					sale.productId,
				);
				const seller = DataManager.findById("users", sale.sellerId);
				const status = sale.status || "completed";
				const platformCfg = this.getPlatformConfig(
					sale.platform || "evenement",
				);

				return `
				<tr style="${platformCfg.rowStyle}" oncontextmenu="event.preventDefault();SalesModule.showContextMenu(event,${sale.id})">
					<td>
						<strong style="color: var(--primary); font-size: 0.9rem;">${this.getSaleNumber(sale.id)}</strong>
					</td>
					<td>
						<span class="badge ${platformCfg.badge}">${platformCfg.label}</span>
					</td>
					<td>
						${
							sale.clientName
								? `<span class="badge badge-info">${sale.clientName}</span>`
								: '<span style="color: var(--text-light); font-size: 0.85rem;">--</span>'
						}
					</td>
					<td>
						<div>
							<strong style="font-size: 0.88rem;">${product?.name || "Produit supprim\u00e9"}</strong>
							<div style="font-size: 0.78rem; color: var(--text-light); margin-top: 0.15rem;">
								${sale.quantity} &times; ${this.formatCurrency(sale.unitPriceTTC)}
							</div>
						</div>
					</td>
					<td>
						<strong style="font-size: 0.92rem;">${this.formatCurrency(sale.totalTTC)}</strong>
						<div style="font-size: 0.75rem; color: var(--text-light);">HT: ${this.formatCurrency(sale.totalHT)}</div>
					</td>
					<td>
						<span class="badge ${this.getStatusBadgeClass(status)}">
							${this.getStatusLabel(status)}
						</span>
					</td>
					<td>
						<div style="font-size: 0.85rem;">${this.formatDate(sale.createdAt || sale.date)}</div>
						<div style="font-size: 0.75rem; color: var(--text-light);">${seller?.name || "Inconnu"}</div>
					</td>
					<td>
						<div class="action-btns">
							<button class="btn-icon" onclick="SalesModule.showDetailModal(${sale.id})" title="Voir le d\u00e9tail">
								${Icons.get("eye", 16)}
							</button>
							${
								canDelete && status !== "cancelled"
									? `<button class="btn-icon" onclick="SalesModule.cancelSale(${sale.id})" title="Annuler la vente">
									${Icons.get("xCircle", 16)}
								</button>`
									: ""
							}
						</div>
					</td>
				</tr>
			`;
			})
			.join("");
	},

	// Filter application
	applyFilters() {
		const filtered = this.getFilteredSales();
		const tbody = document.getElementById("salesTableBody");
		if (tbody) {
			tbody.innerHTML = this.renderTableRows(filtered);
		}
	},

	// Event listeners
	attachEventListeners() {
		// Add sale button
		const addBtn = document.getElementById("addSaleBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.showAddModal());
		}

		// Search input with debounce
		const searchInput = document.getElementById("salesSearch");
		if (searchInput) {
			let debounceTimer;
			searchInput.addEventListener("input", (e) => {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					this.currentFilters.search = e.target.value;
					this.applyFilters();
				}, 200);
			});
		}

		// Close filter dropdowns on outside click
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".filter-dropdown")) {
				document.querySelectorAll(".filter-dropdown").forEach(d => d.classList.remove("open"));
			}
		});

		// Date filters
		const dateFrom = document.getElementById("salesDateFrom");
		const dateTo = document.getElementById("salesDateTo");
		if (dateFrom) {
			dateFrom.addEventListener("change", (e) => {
				this.currentFilters.dateFrom = e.target.value;
				this.applyFilters();
			});
		}
		if (dateTo) {
			dateTo.addEventListener("change", (e) => {
				this.currentFilters.dateTo = e.target.value;
				this.applyFilters();
			});
		}

		// Populate form selects
		this.populateProducts();
		this.populateClients();

		// Listen for external data changes
		window.addEventListener("dataChanged", (e) => {
			if (!e?.detail) return;
			const { collection } = e.detail;
			if (collection === "clients") this.populateClients();
			if (collection === "products") {
				this.populateProducts();
				if (
					document.getElementById("saleModal")?.style.display ===
					"flex"
				) {
					this.updateStockInfo();
				}
			}
		});
	},

	// Select population
	populateProducts() {
		const select = document.getElementById("saleProduct");
		if (!select) return;
		const current = select.value;
		select.innerHTML =
			'<option value="">-- S\u00e9lectionner un produit --</option>' +
			DataManager.get("products")
				.map(
					(p) =>
						`<option value="${p.id}">${p.name} - ${this.formatCurrency(p.price)}</option>`,
				)
				.join("");
		if (DataManager.findById("products", parseInt(current))) {
			select.value = current;
		} else {
			select.value = "";
		}
	},

	populateClients() {
		const select = document.getElementById("saleClient");
		if (!select) return;
		select.innerHTML =
			'<option value="">-- Aucun client --</option>' +
			DataManager.get("clients")
				.map((c) => `<option value="${c.id}">${c.name}</option>`)
				.join("");
	},

	populateSellers() {
		const select = document.getElementById("saleSeller");
		if (!select) return;
		select.innerHTML = DataManager.get("users")
			.filter((u) => u.active)
			.map((u) => `<option value="${u.id}">${u.name}</option>`)
			.join("");
	},

	// Add sale modal
	showAddModal() {
		this.cart = [];
		this.populateProducts();
		this.populateClients();
		this.populateSellers();
		this.updateCartPreview();

		// Reset form fields
		const productSelect = document.getElementById("saleProduct");
		const quantityInput = document.getElementById("saleQuantity");
		const clientSelect = document.getElementById("saleClient");
		if (productSelect) productSelect.value = "";
		if (quantityInput) quantityInput.value = "";
		if (clientSelect) clientSelect.value = "";

		const stockInfo = document.getElementById("stockInfo");
		const stockWarning = document.getElementById("stockWarning");
		if (stockInfo) stockInfo.innerHTML = "";
		if (stockWarning) stockWarning.style.display = "none";

		document.getElementById("saleModal").style.display = "flex";
	},

	closeModal() {
		this.cart = [];
		document.getElementById("saleModal").style.display = "none";
	},

	// Stock info and validation
	updateStockInfo() {
		const productId = parseInt(
			document.getElementById("saleProduct")?.value,
		);
		const sellerId = parseInt(document.getElementById("saleSeller")?.value);
		const stockInfo = document.getElementById("stockInfo");
		const stockWarning = document.getElementById("stockWarning");
		const addToCartBtn = document.getElementById("addToCartBtn");

		if (!productId || !sellerId) {
			if (stockInfo) stockInfo.innerHTML = "";
			if (stockWarning) stockWarning.style.display = "none";
			if (addToCartBtn) addToCartBtn.disabled = false;
			return;
		}

		const product = DataManager.findById("products", productId);
		const seller = DataManager.findById("users", sellerId);

		if (product && seller) {
			const stock = product.stock[seller.username] || 0;
			if (stock === 0) {
				stockInfo.innerHTML = `Stock pour <strong>${seller.name}</strong> : <strong style="color: var(--primary-red);">0 unit\u00e9</strong>`;
				stockWarning.style.display = "block";
				document.getElementById("stockWarningText").textContent =
					`Ce produit n'est plus disponible pour ${seller.name}.`;
				if (addToCartBtn) addToCartBtn.disabled = true;
			} else {
				stockInfo.innerHTML = `Stock pour <strong>${seller.name}</strong> : <strong style="color: var(--primary-blue);">${stock} unit\u00e9${stock > 1 ? "s" : ""}</strong>`;
				stockWarning.style.display = "none";
				if (addToCartBtn) addToCartBtn.disabled = false;
			}
		}

		// Re-check if quantity is already entered
		const quantityInput = document.getElementById("saleQuantity");
		if (quantityInput?.value) {
			this.checkStock();
		}
	},

	checkStock() {
		const productId = parseInt(
			document.getElementById("saleProduct")?.value,
		);
		const sellerId = parseInt(document.getElementById("saleSeller")?.value);
		const quantity =
			parseInt(document.getElementById("saleQuantity")?.value) || 0;
		const addToCartBtn = document.getElementById("addToCartBtn");
		const stockWarning = document.getElementById("stockWarning");
		const stockWarningText = document.getElementById("stockWarningText");

		if (!productId || !sellerId) {
			if (addToCartBtn) addToCartBtn.disabled = true;
			return;
		}

		if (!quantity) {
			if (stockWarning) stockWarning.style.display = "none";
			if (addToCartBtn) addToCartBtn.disabled = false;
			return;
		}

		const product = DataManager.findById("products", productId);
		const seller = DataManager.findById("users", sellerId);

		if (product && seller) {
			const stock = product.stock[seller.username] || 0;

			if (stock === 0) {
				stockWarning.style.display = "block";
				stockWarningText.textContent = `Ce produit n'est plus disponible pour ${seller.name}.`;
				if (addToCartBtn) addToCartBtn.disabled = true;
			} else if (quantity > stock) {
				stockWarning.style.display = "block";
				stockWarningText.textContent = `Disponible : ${stock} unit\u00e9${stock > 1 ? "s" : ""}, demand\u00e9 : ${quantity}.`;
				if (addToCartBtn) addToCartBtn.disabled = true;
			} else {
				stockWarning.style.display = "none";
				if (addToCartBtn) addToCartBtn.disabled = false;
			}
		}
	},

	// Cart operations
	addToCart() {
		const productId = parseInt(
			document.getElementById("saleProduct").value,
		);
		const sellerId = parseInt(document.getElementById("saleSeller").value);
		const quantity = parseInt(
			document.getElementById("saleQuantity").value,
		);

		const product = DataManager.findById("products", productId);
		const seller = DataManager.findById("users", sellerId);

		if (!product || !seller || !quantity) {
			showToast("Remplis tous les champs", "warning");
			return;
		}

		const stock = product.stock[seller.username] || 0;

		if (quantity > stock) {
			showToast(
				`Stock insuffisant ! Disponible : ${stock} unit\u00e9s`,
				"error",
			);
			return;
		}

		// Check if product+seller already in cart
		const existing = this.cart.find(
			(item) =>
				item.productId === productId && item.sellerId === sellerId,
		);
		if (existing) {
			if (existing.quantity + quantity > stock) {
				showToast(
					`Stock insuffisant ! Disponible : ${stock}, d\u00e9j\u00e0 dans le panier : ${existing.quantity}`,
					"error",
				);
				return;
			}
			existing.quantity += quantity;
		} else {
			this.cart.push({
				productId,
				sellerId,
				sellerName: seller.name,
				sellerUsername: seller.username,
				productName: product.name,
				quantity,
				unitPriceTTC: product.price,
				unitPriceHT: product.priceHT,
			});
		}

		// Reset product/quantity fields
		document.getElementById("saleProduct").value = "";
		document.getElementById("saleQuantity").value = "";
		document.getElementById("stockInfo").innerHTML = "";
		document.getElementById("stockWarning").style.display = "none";

		this.updateCartPreview();
		showToast("Produit ajout\u00e9 au panier !", "success");
	},

	removeFromCart(index) {
		this.cart.splice(index, 1);
		this.updateCartPreview();
		showToast("Produit retir\u00e9 du panier", "success");
	},

	updateCartPreview() {
		const preview = document.getElementById("cartPreview");
		const validateBtn = document.getElementById("validateSaleBtn");
		const cartTotalHT = document.getElementById("cartTotalHT");
		const cartTVA = document.getElementById("cartTVA");
		const cartTotalTTC = document.getElementById("cartTotalTTC");

		if (this.cart.length === 0) {
			preview.innerHTML = `
				<div class="empty-preview">
					<div class="empty-icon">${Icons.get("package", 48)}</div>
					<p>Aucun produit ajout\u00e9</p>
				</div>`;
			if (validateBtn) validateBtn.disabled = true;
			if (cartTotalHT) cartTotalHT.textContent = "0.00 \u20AC";
			if (cartTVA) cartTVA.textContent = "0.00 \u20AC";
			if (cartTotalTTC) cartTotalTTC.textContent = "0.00 \u20AC";
			return;
		}

		let totalHT = 0;
		let totalTTC = 0;

		const html =
			'<div class="preview-list">' +
			this.cart
				.map((item, index) => {
					const itemTotalHT = item.quantity * item.unitPriceHT;
					const itemTotalTTC = item.quantity * item.unitPriceTTC;
					totalHT += itemTotalHT;
					totalTTC += itemTotalTTC;

					return `
				<div class="product-item">
					<button onclick="SalesModule.removeFromCart(${index})" class="btn-remove" title="Retirer">&times;</button>
					<span class="label-strong">${item.productName}</span>
					<div class="meta-row">
						<span>${item.quantity} &times; ${this.formatCurrency(item.unitPriceTTC)}</span>
						<span>${this.formatCurrency(itemTotalTTC)}</span>
						<span>${item.sellerName}</span>
					</div>
				</div>`;
				})
				.join("") +
			"</div>";

		preview.innerHTML = html;

		const tva = totalTTC - totalHT;
		if (cartTotalHT) cartTotalHT.textContent = this.formatCurrency(totalHT);
		if (cartTVA) cartTVA.textContent = this.formatCurrency(tva);
		if (cartTotalTTC)
			cartTotalTTC.textContent = this.formatCurrency(totalTTC);

		if (validateBtn) validateBtn.disabled = false;
	},

	// Sale validation
	async validateSale() {
		if (this.cart.length === 0) {
			showToast("Ajoute au moins un produit", "warning");
			return;
		}

		const confirmed = await showConfirm(
			"Confirmer cette vente ?",
			"warning",
		);
		if (!confirmed) return;

		const currentUser = Auth.getCurrentUser();
		const clientId =
			parseInt(document.getElementById("saleClient").value) || null;
		const clientName = clientId
			? DataManager.findById("clients", clientId)?.name
			: null;
		const platform =
			document.getElementById("salePlatform")?.value || "evenement";

		// Process each cart item as a separate sale record
		for (const item of this.cart) {
			const saleData = {
				sellerId: item.sellerId,
				productId: item.productId,
				quantity: item.quantity,
				unitPriceTTC: item.unitPriceTTC,
				unitPriceHT: item.unitPriceHT,
				totalTTC: item.quantity * item.unitPriceTTC,
				totalHT: item.quantity * item.unitPriceHT,
				clientId: clientId,
				clientName: clientName,
				platform: platform,
				status: "completed",
			};

			DataManager.add("sales", saleData);

			// Update stock
			const product = DataManager.findById("products", item.productId);
			const seller = DataManager.findById("users", item.sellerId);

			if (product && seller) {
				const stockBefore = product.stock[seller.username] || 0;
				product.stock[seller.username] = Math.max(
					0,
					stockBefore - item.quantity,
				);
				const stockAfter = product.stock[seller.username];

				// Stock history entry
				if (!product.stockHistory) product.stockHistory = [];
				product.stockHistory.push({
					date: new Date().toISOString(),
					type: "sale",
					quantity: -item.quantity,
					stockBefore: stockBefore,
					stockAfter: stockAfter,
					userId: currentUser.id,
					user: currentUser.name,
					reason: "Vente",
					reference: `Sale #${saleData.id || "pending"}`,
				});

				DataManager.update("products", item.productId, product);
			}

			// Log the sale
			DataManager.addLog(
				"Vente enregistr\u00e9e",
				`${item.sellerName} a vendu ${item.quantity}x ${item.productName} (${this.formatCurrency(saleData.totalTTC)})${clientName ? " \u00e0 " + clientName : ""}`,
				currentUser.id,
			);
		}

		showToast(
			`${this.cart.length} vente(s) enregistr\u00e9e(s) !`,
			"success",
		);
		this.closeModal();
		this.init();
		Navigation.updateDashboardStats();
	},

	// Cancel sale
	async cancelSale(id) {
		const confirmed = await showConfirm(
			"Annuler cette vente ? Le stock sera restaur\u00e9.",
			"warning",
		);
		if (!confirmed) return;

		const data = DataManager.getData();
		const sale = DataManager.findById("sales", id);
		if (!sale) return;

		const product = DataManager.findById("products", sale.productId);
		const seller = DataManager.findById("users", sale.sellerId);
		const user = Auth.getCurrentUser();

		// Restore stock
		if (product && seller) {
			const stockBefore = product.stock[seller.username] || 0;
			product.stock[seller.username] = stockBefore + sale.quantity;
			const stockAfter = product.stock[seller.username];

			if (!product.stockHistory) product.stockHistory = [];
			product.stockHistory.push({
				date: new Date().toISOString(),
				type: "cancel",
				quantity: sale.quantity,
				stockBefore: stockBefore,
				stockAfter: stockAfter,
				userId: user.id,
				user: user.name,
				reason: "Annulation de vente",
				reference: `Sale #${id} cancelled`,
			});

			DataManager.update("products", product.id, product);
		}

		// Update status to cancelled (keep the record visible in the table)
		DataManager.update("sales", id, { status: "cancelled" });

		// Also keep cancelledSales array synchronized for backward compat
		if (!data.cancelledSales) data.cancelledSales = [];
		data.cancelledSales.push({
			...sale,
			status: "cancelled",
			cancelledAt: new Date().toISOString(),
			cancelledBy: user.id,
		});
		DataManager.saveData(data);

		DataManager.addLog(
			"Vente annul\u00e9e",
			`Vente ${this.getSaleNumber(id)} de ${sale.quantity}x ${product?.name || "produit"} annul\u00e9e (stock restaur\u00e9)`,
			user.id,
		);

		showToast("Vente annul\u00e9e et stock restaur\u00e9", "success");
		this.init();
		Navigation.updateDashboardStats();
	},

	showContextMenu(e, id) {
		const sale = (DataManager.get("sales") || []).find(s => s.id === id);
		if (!sale) return;
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const items = [
			{ label: "Voir le détail", icon: Icons.get("eye", 14), action: () => this.openSaleDetail(id) },
			...(canDelete ? [{ divider: true }, { label: "Supprimer", icon: Icons.get("trash", 14), danger: true, action: () => this.deleteSale(id) }] : []),
		];
		ContextMenu.show(e, items);
	},

	// Delete sale
	async deleteSale(id) {
		const confirmed = await showConfirm(
			"Supprimer cette vente ?",
			"Le stock ne sera pas restauré. Cette action est irréversible.",
			"danger",
		);
		if (!confirmed) return;

		const sale = DataManager.findById("sales", id);
		const product = DataManager.findById("products", sale?.productId);
		const user = Auth.getCurrentUser();

		DataManager.delete("sales", id);
		DataManager.addLog(
			"Suppression vente",
			`Vente ${this.getSaleNumber(id)} de ${sale?.quantity || 0}x ${product?.name || "produit"} supprim\u00e9e`,
			user.id,
		);

		showToast("Vente supprim\u00e9e", "success");
		this.init();
		Navigation.updateDashboardStats();
	},

	// Postpone sale
	async postponeSale(id) {
		const confirmed = await showConfirm(
			"Reporter cette vente ?",
			"warning",
		);
		if (!confirmed) return;

		const data = DataManager.getData();
		const sale = DataManager.findById("sales", id);
		if (!sale) return;

		const product = DataManager.findById("products", sale.productId);
		const user = Auth.getCurrentUser();

		// Update status to pending
		DataManager.update("sales", id, { status: "pending" });

		// Keep postponedSales array synchronized for backward compat
		if (!data.postponedSales) data.postponedSales = [];
		data.postponedSales.push({
			...sale,
			postponedAt: new Date().toISOString(),
			postponedBy: user.id,
		});
		DataManager.saveData(data);

		DataManager.addLog(
			"Vente report\u00e9e",
			`Vente ${this.getSaleNumber(id)} de ${sale.quantity}x ${product?.name || "produit"} report\u00e9e`,
			user.id,
		);

		showToast("Vente report\u00e9e", "success");
		this.init();
		Navigation.updateDashboardStats();
	},

	// View sale detail modal
	showDetailModal(id) {
		const sale = DataManager.findById("sales", id);
		if (!sale) return;

		const product = DataManager.findById("products", sale.productId);
		const seller = DataManager.findById("users", sale.sellerId);
		const status = sale.status || "completed";

		const body = document.getElementById("saleDetailBody");
		body.innerHTML = `
			<!-- Sale Header -->
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
				<div style="display: flex; align-items: center; gap: 0.75rem;">
					<span style="font-size: 1.3rem; font-weight: 700; color: var(--primary-blue);">${this.getSaleNumber(sale.id)}</span>
					<span class="badge ${this.getStatusBadgeClass(status)}">
						${this.getStatusLabel(status)}
					</span>
				</div>
				<span style="font-size: 0.82rem; color: var(--text-light);">
					${this.formatDateTime(sale.createdAt || sale.date)}
				</span>
			</div>

			<!-- Sale Info -->
			<div class="detail-section">
				<div class="detail-section-title">Informations</div>
				<div class="detail-row">
					<span>Client</span>
					<span class="detail-value">${sale.clientName || "Aucun"}</span>
				</div>
				<div class="detail-row">
					<span>Vendeur</span>
					<span class="detail-value">${seller?.name || "Inconnu"}</span>
				</div>
				<div class="detail-row">
					<span>Produit</span>
					<span class="detail-value">${product?.name || "Produit supprim\u00e9"}</span>
				</div>
				<div class="detail-row">
					<span>Quantit\u00e9</span>
					<span class="detail-value">${sale.quantity} unit\u00e9${sale.quantity > 1 ? "s" : ""}</span>
				</div>
				<div class="detail-row">
					<span>Prix unitaire TTC</span>
					<span class="detail-value">${this.formatCurrency(sale.unitPriceTTC)}</span>
				</div>
			</div>

			<!-- Financial Summary -->
			<div class="preview-summary" style="margin-top: 1rem;">
				<div class="summary-row">
					<span>Total HT</span>
					<span>${this.formatCurrency(sale.totalHT)}</span>
				</div>
				<div class="summary-row">
					<span>TVA</span>
					<span>${this.formatCurrency(sale.totalTTC - sale.totalHT)}</span>
				</div>
				<div class="summary-divider"></div>
				<div class="summary-row summary-total">
					<span>Total TTC</span>
					<span>${this.formatCurrency(sale.totalTTC)}</span>
				</div>
			</div>
		`;

		document.getElementById("saleDetailModal").style.display = "flex";
	},

	closeDetailModal() {
		document.getElementById("saleDetailModal").style.display = "none";
	},
};

window.SalesModule = SalesModule;
