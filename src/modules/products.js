// Products (Stock actuel) module - Complete professional redesign
const ProductsModule = {
	currentFilters: { search: "", category: "", stockStatus: "" },

	// Initialization
	init() {
		this.currentFilters = { search: "", category: "", stockStatus: "" };
		this.render();
		this.attachEventListeners();
	},

	// Utilities
	formatCurrency(amount) {
		return (amount || 0).toFixed(2) + " \u20AC";
	},

	getProducts() {
		const data = DataManager.getData();
		return data.products || [];
	},

	getUsers() {
		const data = DataManager.getData();
		return (data.users || []).filter((u) => u.active);
	},

	getTotalStock(product) {
		return Object.values(product.stock || {}).reduce((s, q) => s + q, 0);
	},

	getStockStatus(product) {
		const total = this.getTotalStock(product);
		const threshold = product.alertThreshold || 10;
		if (total === 0)
			return { label: "Rupture", class: "badge-danger", level: "danger" };
		if (total <= threshold)
			return {
				label: "Stock faible",
				class: "badge-warning",
				level: "warning",
			};
		return { label: "En stock", class: "badge-success", level: "success" };
	},

	getCategories() {
		const products = this.getProducts();
		const cats = new Set();
		products.forEach((p) => {
			if (p.category) cats.add(p.category);
		});
		return Array.from(cats).sort();
	},

	getStockPercentage(product) {
		const total = this.getTotalStock(product);
		const threshold = product.alertThreshold || 10;
		// Cap at 100% when stock is at 3x threshold (considered "full")
		const max = Math.max(threshold * 3, 1);
		return Math.min(Math.round((total / max) * 100), 100);
	},

	getStockBarColor(product) {
		const status = this.getStockStatus(product);
		if (status.level === "danger") return "var(--danger)";
		if (status.level === "warning") return "var(--warning)";
		return "var(--success)";
	},

	// Main render
	render() {
		const container = document.getElementById("productsPage");
		if (!container) return;

		container.innerHTML = `
			<style>${this.getStyles()}</style>

			<div class="products-page">
				${this.renderHeader()}
				${this.renderStats()}
				${this.renderControls()}
				${this.renderTable()}
			</div>

			${this.renderAddEditModal()}
			${this.renderStockAdjustModal()}
		`;
	},

	// Page header
	renderHeader() {
		const canCreate = Auth.hasPermission("create");
		return `
			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("box", 18)}</span>
						<div class="phb-text">
							<h1>Stock actuel</h1>
							<p class="page-description">Gère ton inventaire, surveille les niveaux de stock et ajuste tes produits</p>
						</div>
				</div>
				${canCreate ? '<div class="page-header-box-actions"><button class="btn-primary" id="productsAddBtn">Ajouter un produit</button></div>' : ""}
			</div>
		`;
	},

	// Stat cards
	renderStats() {
		const products = this.getProducts();
		const totalProducts = products.length;

		const totalUnits = products.reduce(
			(sum, p) => sum + this.getTotalStock(p),
			0,
		);

		const totalValue = products.reduce((sum, p) => {
			return sum + (p.price || 0) * this.getTotalStock(p);
		}, 0);

		const outOfStock = products.filter(
			(p) => this.getTotalStock(p) === 0,
		).length;

		const lowStock = products.filter((p) => {
			const total = this.getTotalStock(p);
			return total > 0 && total <= (p.alertThreshold || 10);
		}).length;

		const alertCount = outOfStock + lowStock;

		return `
			<div class="stats-grid" style="margin-top: 0.5rem;">
				<div class="stat-card">
					<div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">
						${Icons.get("package", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${totalProducts}</div>
						<div class="stat-label">Total produits</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon" style="background: var(--info-light); color: var(--info);">
						${Icons.get("box", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${totalUnits}</div>
						<div class="stat-label">Unit\u00e9s en stock</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon" style="background: var(--success-light); color: var(--success);">
						${Icons.get("trendingUp", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${this.formatCurrency(totalValue)}</div>
						<div class="stat-label">Valeur du stock</div>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon" style="background: var(--danger-light, rgba(220,53,69,0.12)); color: var(--danger, #dc3545);">
						${Icons.get("alertTriangle", 22)}
					</div>
					<div class="stat-info">
						<div class="stat-value">${alertCount}</div>
						<div class="stat-label">Alertes stock</div>
					</div>
				</div>
			</div>
		`;
	},

	// Controls bar
	renderControls() {
		const categories = this.getCategories();
		const catValue = this.currentFilters.category;
		const catLabel = catValue || "Toutes les cat\u00e9gories";
		const stockValue = this.currentFilters.stockStatus;
		const stockLabels = { "": "Tous les statuts", instock: "En stock", low: "Stock faible", out: "Rupture de stock" };
		const stockLabel = stockLabels[stockValue] || "Tous les statuts";
		const checkSVG = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg>`;
		const chevronSVG = `<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;

		return `
			<div class="products-controls">
				<div class="products-controls-left">
					<div class="products-search-wrap">
						<span class="products-search-icon">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						</span>
						<input
							type="text"
							class="search-input"
							id="productsSearch"
							placeholder="Rechercher un produit..."
							style="padding-left: 2.4rem; max-width: 280px;"
						/>
					</div>

					<div class="filter-dropdown" id="productsFilterCategory">
						<button class="filter-btn ${catValue ? "active" : ""}" onclick="ProductsModule.toggleFilterDropdown('productsFilterCategory')">
							<span class="filter-btn-label">Cat\u00e9gorie:</span>
							<span class="filter-btn-value">${catLabel}</span>
							${chevronSVG}
						</button>
						<div class="filter-menu">
							<div class="filter-menu-item ${catValue === "" ? "selected" : ""}" onclick="ProductsModule.selectCategoryFilter('')">
								<div class="filter-check">${checkSVG}</div>
								<span class="filter-menu-item-label">Toutes les cat\u00e9gories</span>
							</div>
							<div class="filter-menu-divider"></div>
							${categories.map((c) => `
								<div class="filter-menu-item ${catValue === c ? "selected" : ""}" onclick="ProductsModule.selectCategoryFilter('${c}')">
									<div class="filter-check">${checkSVG}</div>
									<span class="filter-menu-item-label">${c}</span>
								</div>
							`).join("")}
						</div>
					</div>

					<div class="filter-dropdown" id="productsFilterStock">
						<button class="filter-btn ${stockValue ? "active" : ""}" onclick="ProductsModule.toggleFilterDropdown('productsFilterStock')">
							<span class="filter-btn-label">Stock:</span>
							<span class="filter-btn-value">${stockLabel}</span>
							${chevronSVG}
						</button>
						<div class="filter-menu">
							<div class="filter-menu-item ${stockValue === "" ? "selected" : ""}" onclick="ProductsModule.selectStockFilter('')">
								<div class="filter-check">${checkSVG}</div>
								<span class="filter-menu-item-label">Tous les statuts</span>
							</div>
							<div class="filter-menu-divider"></div>
							<div class="filter-menu-item ${stockValue === "instock" ? "selected" : ""}" onclick="ProductsModule.selectStockFilter('instock')">
								<div class="filter-check">${checkSVG}</div>
								<span class="badge badge-success" style="font-size:0.72rem;">En stock</span>
							</div>
							<div class="filter-menu-item ${stockValue === "low" ? "selected" : ""}" onclick="ProductsModule.selectStockFilter('low')">
								<div class="filter-check">${checkSVG}</div>
								<span class="badge badge-warning" style="font-size:0.72rem;">Stock faible</span>
							</div>
							<div class="filter-menu-item ${stockValue === "out" ? "selected" : ""}" onclick="ProductsModule.selectStockFilter('out')">
								<div class="filter-check">${checkSVG}</div>
								<span class="badge badge-danger" style="font-size:0.72rem;">Rupture de stock</span>
							</div>
						</div>
					</div>
				</div>

			</div>
		`;
	},

	// Products table
	renderTable() {
		const products = this.applyFilters();

		if (products.length === 0) {
			const hasFilters =
				this.currentFilters.search ||
				this.currentFilters.category ||
				this.currentFilters.stockStatus;
			return `
				<div class="card" style="margin-top: 0.5rem;">
					<div class="empty-state-dashed">
						<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
							${Icons.get("package", 40)}
						</div>
						<h4>${hasFilters ? "Aucun r\u00e9sultat" : "Aucun produit actuel"}</h4>
						<p>${hasFilters ? "Essaie de modifier tes filtres de recherche." : "Commence par ajouter ton premier produit au stock."}</p>
						${
							!hasFilters
								? `<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="ProductsModule.openAddModal()">
							Ajouter un produit
						</button>`
								: ""
						}
					</div>
				</div>
			`;
		}

		const rows = products.map((p) => this.renderTableRow(p)).join("");

		return `
			<div class="card" style="margin-top: 0.5rem; padding: 0; overflow: hidden;">
				<div style="overflow-x: auto;">
					<table class="data-table">
						<thead>
							<tr>
								<th>Produit</th>
								<th>Cat\u00e9gorie</th>
								<th style="text-align: right;">Prix unitaire</th>
								<th style="text-align: center;">Stock</th>
								<th style="text-align: right;">Valeur</th>
								<th style="text-align: center;">Statut</th>
								<th style="text-align: center;">Actions</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>
			</div>
			${Auth.hasPermission("create") ? `<button class="quick-add-box" style="margin-top:0.75rem;" onclick="ProductsModule.openAddModal()"><span class="quick-add-box-icon">+</span> Ajouter un produit</button>` : ""}
		`;
	},

	renderTableRow(product) {
		const total = this.getTotalStock(product);
		const status = this.getStockStatus(product);
		const value = (product.price || 0) * total;
		const pct = this.getStockPercentage(product);
		const barColor = this.getStockBarColor(product);
		const threshold = product.alertThreshold || 10;

		return `
			<tr oncontextmenu="event.preventDefault();ProductsModule.showContextMenu(event,${product.id})">
				<td>
					<div class="products-cell-product">
						<div class="products-product-avatar">
							${(product.name || "P").charAt(0).toUpperCase()}
						</div>
						<div>
							<div class="products-product-name">${product.name || "--"}</div>
							${product.description ? `<div class="products-product-desc">${product.description}</div>` : ""}
						</div>
					</div>
				</td>
				<td>
					${product.category ? `<span class="badge badge-info">${product.category}</span>` : '<span style="color: var(--text-muted);">--</span>'}
				</td>
				<td style="text-align: right; font-weight: 600;">
					${this.formatCurrency(product.price)}
				</td>
				<td style="text-align: center; min-width: 140px;">
					<div class="products-stock-cell">
						<span class="products-stock-number">${total}</span>
						<div class="products-stock-bar">
							<div class="products-stock-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
						</div>
						<span class="products-stock-threshold">seuil: ${threshold}</span>
					</div>
				</td>
				<td style="text-align: right; font-weight: 600;">
					${this.formatCurrency(value)}
				</td>
				<td style="text-align: center;">
					<span class="badge ${status.class}">${status.label}</span>
				</td>
				<td style="text-align: center;">
					<div class="products-actions-cell">
						<button class="btn-icon" title="Ajuster le stock" data-action="adjust" data-id="${product.id}">
							${Icons.get("package", 15)}
						</button>
						<button class="btn-icon" title="Modifier" data-action="edit" data-id="${product.id}">
							${Icons.get("edit", 15)}
						</button>
					</div>
				</td>
			</tr>
		`;
	},

	// Add/Edit modal
	renderAddEditModal() {
		const categories = this.getCategories();

		return `
			<div class="modal-overlay" id="productsFormModal" style="display: none;">
				<div class="modal-content" style="max-width: 580px;">
					<div class="modal-header">
						<h3 id="productsFormTitle">
							Ajouter un produit
						</h3>
						<button class="btn-icon" id="productsFormClose" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body">
						<input type="hidden" id="productsFormId" value="" />

						<div class="form-group">
							<label for="productsFormName">Nom du produit *</label>
							<input type="text" id="productsFormName" placeholder="Ex: Elite Trainer Box" required />
						</div>

						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
							<div class="form-group">
								<label for="productsFormCategory">Cat\u00e9gorie</label>
								<input type="text" id="productsFormCategory" placeholder="Ex: Pokemon" list="productsCategoryList" />
								<datalist id="productsCategoryList">
									${categories.map((c) => `<option value="${c}">`).join("")}
								</datalist>
							</div>
							<div class="form-group">
								<label for="productsFormSku">R\u00e9f\u00e9rence / SKU</label>
								<input type="text" id="productsFormSku" placeholder="Ex: ETB-001" />
							</div>
						</div>

						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
							<div class="form-group">
								<label for="productsFormPriceHT">Prix HT *</label>
								<div class="products-input-euro">
									<input type="number" id="productsFormPriceHT" step="0.01" min="0" placeholder="37.50" required />
									<span class="products-euro-symbol">\u20AC</span>
								</div>
							</div>
							<div class="form-group">
								<label for="productsFormPriceTTC">Prix TTC *</label>
								<div class="products-input-euro">
									<input type="number" id="productsFormPriceTTC" step="0.01" min="0" placeholder="45.00" required />
									<span class="products-euro-symbol">\u20AC</span>
								</div>
							</div>
						</div>

						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
							<div class="form-group">
								<label for="productsFormStockInit">Stock initial</label>
								<input type="number" id="productsFormStockInit" min="0" value="0" placeholder="0" />
							</div>
							<div class="form-group">
								<label for="productsFormAlertThreshold">Seuil d'alerte</label>
								<input type="number" id="productsFormAlertThreshold" min="0" value="10" placeholder="10" />
							</div>
						</div>

						<div class="form-group" id="productsFormStockDistribution" style="display: none;">
							<label>R\u00e9partition du stock par utilisateur</label>
							<div id="productsFormStockUsers" class="products-stock-users-grid">
							</div>
						</div>

						<div class="form-group">
							<label for="productsFormDescription">Description</label>
							<textarea id="productsFormDescription" rows="3" placeholder="Description du produit..."></textarea>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" id="productsFormCancel">Annuler</button>
						<button class="btn-primary" id="productsFormSave">
							Enregistrer
						</button>
					</div>
				</div>
			</div>
		`;
	},

	// Stock adjustment modal
	renderStockAdjustModal() {
		return `
			<div class="modal-overlay" id="productsAdjustModal" style="display: none;">
				<div class="modal-content" style="max-width: 480px;">
					<div class="modal-header">
						<h3>
							Ajuster le stock
						</h3>
						<button class="btn-icon" id="productsAdjustClose" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body">
						<input type="hidden" id="productsAdjustId" value="" />

						<div class="products-adjust-product-info" id="productsAdjustInfo">
						</div>

						<div class="form-group">
							<label>Type d'op\u00e9ration</label>
							<div class="products-adjust-type-group">
								<button class="products-adjust-type-btn active" data-type="add" id="productsAdjustTypeAdd">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
									Ajouter
								</button>
								<button class="products-adjust-type-btn" data-type="remove" id="productsAdjustTypeRemove">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
									Retirer
								</button>
							</div>
						</div>

						<div class="form-group">
							<label for="productsAdjustUser">Utilisateur *</label>
							<select id="productsAdjustUser" required>
								<option value="">S\u00e9lectionner un utilisateur</option>
							</select>
						</div>

						<div class="form-group">
							<label for="productsAdjustQty">Quantit\u00e9 *</label>
							<input type="number" id="productsAdjustQty" min="1" value="1" placeholder="1" required />
						</div>

						<div class="form-group">
							<label for="productsAdjustReason">Raison</label>
							<select id="productsAdjustReason">
								<option value="R\u00e9approvisionnement">R\u00e9approvisionnement</option>
								<option value="Correction d'inventaire">Correction d'inventaire</option>
								<option value="Retour client">Retour client</option>
								<option value="Produit d\u00e9fectueux">Produit d\u00e9fectueux</option>
								<option value="Autre">Autre</option>
							</select>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" id="productsAdjustCancel">Annuler</button>
						<button class="btn-primary" id="productsAdjustSave">
							Appliquer
						</button>
					</div>
				</div>
			</div>
		`;
	},

	// Filters
	applyFilters() {
		let products = this.getProducts();

		// Search filter
		if (this.currentFilters.search) {
			const term = this.currentFilters.search.toLowerCase();
			products = products.filter(
				(p) =>
					(p.name || "").toLowerCase().includes(term) ||
					(p.description || "").toLowerCase().includes(term) ||
					(p.category || "").toLowerCase().includes(term) ||
					(p.sku || "").toLowerCase().includes(term),
			);
		}

		// Category filter
		if (this.currentFilters.category) {
			products = products.filter(
				(p) => p.category === this.currentFilters.category,
			);
		}

		// Stock status filter
		if (this.currentFilters.stockStatus) {
			products = products.filter((p) => {
				const total = this.getTotalStock(p);
				const threshold = p.alertThreshold || 10;
				switch (this.currentFilters.stockStatus) {
					case "instock":
						return total > threshold;
					case "low":
						return total > 0 && total <= threshold;
					case "out":
						return total === 0;
					default:
						return true;
				}
			});
		}

		return products;
	},

	// Event listeners
	toggleFilterDropdown(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const isOpen = el.classList.contains("open");
		document.querySelectorAll(".filter-dropdown.open").forEach((d) => d.classList.remove("open"));
		if (!isOpen) el.classList.add("open");
	},

	selectCategoryFilter(value) {
		this.currentFilters.category = value;
		document.querySelectorAll(".filter-dropdown.open").forEach((d) => d.classList.remove("open"));
		this.render();
		this.attachEventListeners();
	},

	selectStockFilter(value) {
		this.currentFilters.stockStatus = value;
		document.querySelectorAll(".filter-dropdown.open").forEach((d) => d.classList.remove("open"));
		this.render();
		this.attachEventListeners();
	},

	attachEventListeners() {
		// --- Search ---
		const searchInput = document.getElementById("productsSearch");
		if (searchInput) {
			searchInput.addEventListener("input", (e) => {
				this.currentFilters.search = e.target.value;
				this.refreshTable();
			});
		}


		// --- Add product button ---
		const addBtn = document.getElementById("productsAddBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.openAddModal());
		}

		// --- Form modal actions ---
		const formClose = document.getElementById("productsFormClose");
		const formCancel = document.getElementById("productsFormCancel");
		const formSave = document.getElementById("productsFormSave");

		if (formClose)
			formClose.addEventListener("click", () => this.closeFormModal());
		if (formCancel)
			formCancel.addEventListener("click", () => this.closeFormModal());
		if (formSave)
			formSave.addEventListener("click", () => this.saveProduct());

		// Close form modal on overlay click
		const formModal = document.getElementById("productsFormModal");
		if (formModal) {
			formModal.addEventListener("click", (e) => {
				if (e.target === formModal) this.closeFormModal();
			});
		}

		// --- Price HT/TTC auto-calc ---
		const priceHT = document.getElementById("productsFormPriceHT");
		const priceTTC = document.getElementById("productsFormPriceTTC");
		if (priceHT) {
			priceHT.addEventListener("input", () => {
				const val = parseFloat(priceHT.value);
				if (!isNaN(val) && priceTTC) {
					priceTTC.value = (val * 1.2).toFixed(2);
				}
			});
		}
		if (priceTTC) {
			priceTTC.addEventListener("input", () => {
				const val = parseFloat(priceTTC.value);
				if (!isNaN(val) && priceHT) {
					priceHT.value = (val / 1.2).toFixed(2);
				}
			});
		}

		// --- Adjust modal actions ---
		const adjustClose = document.getElementById("productsAdjustClose");
		const adjustCancel = document.getElementById("productsAdjustCancel");
		const adjustSave = document.getElementById("productsAdjustSave");

		if (adjustClose)
			adjustClose.addEventListener("click", () =>
				this.closeAdjustModal(),
			);
		if (adjustCancel)
			adjustCancel.addEventListener("click", () =>
				this.closeAdjustModal(),
			);
		if (adjustSave)
			adjustSave.addEventListener("click", () => this.saveAdjustment());

		// Close adjust modal on overlay click
		const adjustModal = document.getElementById("productsAdjustModal");
		if (adjustModal) {
			adjustModal.addEventListener("click", (e) => {
				if (e.target === adjustModal) this.closeAdjustModal();
			});
		}

		// --- Adjust type toggle ---
		const typeAdd = document.getElementById("productsAdjustTypeAdd");
		const typeRemove = document.getElementById("productsAdjustTypeRemove");
		if (typeAdd) {
			typeAdd.addEventListener("click", () => {
				typeAdd.classList.add("active");
				if (typeRemove) typeRemove.classList.remove("active");
			});
		}
		if (typeRemove) {
			typeRemove.addEventListener("click", () => {
				typeRemove.classList.add("active");
				if (typeAdd) typeAdd.classList.remove("active");
			});
		}

		// --- Table action buttons (delegated) ---
		const container = document.getElementById("productsPage");
		if (container) {
			container.addEventListener("click", (e) => {
				const btn = e.target.closest("button[data-action]");
				if (!btn) return;

				const action = btn.dataset.action;
				const id = parseInt(btn.dataset.id);

				switch (action) {
					case "edit":
						this.openEditModal(id);
						break;
					case "adjust":
						this.openAdjustModal(id);
						break;
					case "delete":
						this.deleteProduct(id);
						break;
				}
			});
		}

		// --- Keyboard shortcuts ---
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.closeFormModal();
				this.closeAdjustModal();
			}
		});
	},

	// Refresh table
	refreshTable() {
		const container = document.getElementById("productsPage");
		if (!container) return;

		// Find existing table card and replace just the table portion
		const tableCard = container.querySelector(".card");
		if (tableCard) {
			const products = this.applyFilters();

			if (products.length === 0) {
				const hasFilters =
					this.currentFilters.search ||
					this.currentFilters.category ||
					this.currentFilters.stockStatus;
				tableCard.outerHTML = `
					<div class="card" style="margin-top: 0.5rem;">
						<div class="empty-state-dashed">
							<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
								${Icons.get("package", 40)}
							</div>
							<h4>${hasFilters ? "Aucun r\u00e9sultat" : "Aucun produit actuel"}</h4>
							<p>${hasFilters ? "Essaie de modifier tes filtres de recherche." : "Commence par ajouter ton premier produit au stock."}</p>
						</div>
					</div>
				`;
				return;
			}

			const rows = products.map((p) => this.renderTableRow(p)).join("");
			tableCard.outerHTML = `
				<div class="card" style="margin-top: 0.5rem; padding: 0; overflow: hidden;">
					<div style="overflow-x: auto;">
						<table class="data-table">
							<thead>
								<tr>
									<th>Produit</th>
									<th>Cat\u00e9gorie</th>
									<th style="text-align: right;">Prix unitaire</th>
									<th style="text-align: center;">Stock</th>
									<th style="text-align: right;">Valeur</th>
									<th style="text-align: center;">Statut</th>
									<th style="text-align: center;">Actions</th>
								</tr>
							</thead>
							<tbody>
								${rows}
							</tbody>
						</table>
				</div>
				</div>
			`;
		}
	},

	// Add modal
	openAddModal() {
		const modal = document.getElementById("productsFormModal");
		const title = document.getElementById("productsFormTitle");
		if (!modal) return;

		// Reset form
		document.getElementById("productsFormId").value = "";
		document.getElementById("productsFormName").value = "";
		document.getElementById("productsFormCategory").value = "";
		document.getElementById("productsFormSku").value = "";
		document.getElementById("productsFormPriceHT").value = "";
		document.getElementById("productsFormPriceTTC").value = "";
		document.getElementById("productsFormStockInit").value = "0";
		document.getElementById("productsFormAlertThreshold").value = "10";
		document.getElementById("productsFormDescription").value = "";

		// Show stock distribution for new products
		const stockDist = document.getElementById(
			"productsFormStockDistribution",
		);
		if (stockDist) stockDist.style.display = "none";

		// Show stock initial field for new products
		const stockInitInput = document.getElementById("productsFormStockInit");
		if (stockInitInput)
			stockInitInput.closest(".form-group") &&
				(stockInitInput.parentElement.parentElement.style.display = "");

		if (title) title.textContent = "Ajouter un produit";

		modal.style.display = "flex";
		setTimeout(() => {
			document.getElementById("productsFormName")?.focus();
		}, 100);
	},

	// Edit modal
	openEditModal(productId) {
		const product = DataManager.findById("products", productId);
		if (!product) return;

		const modal = document.getElementById("productsFormModal");
		const title = document.getElementById("productsFormTitle");
		if (!modal) return;

		document.getElementById("productsFormId").value = product.id;
		document.getElementById("productsFormName").value = product.name || "";
		document.getElementById("productsFormCategory").value =
			product.category || "";
		document.getElementById("productsFormSku").value = product.sku || "";
		document.getElementById("productsFormPriceHT").value =
			product.priceHT || "";
		document.getElementById("productsFormPriceTTC").value =
			product.price || "";
		document.getElementById("productsFormAlertThreshold").value =
			product.alertThreshold || 10;
		document.getElementById("productsFormDescription").value =
			product.description || "";

		// Hide stock initial for editing (use adjust instead), show distribution
		const stockInitInput = document.getElementById("productsFormStockInit");
		if (stockInitInput)
			stockInitInput.parentElement.parentElement.style.display = "none";

		// Show stock distribution per user
		const stockDist = document.getElementById(
			"productsFormStockDistribution",
		);
		const stockUsersContainer = document.getElementById(
			"productsFormStockUsers",
		);
		if (stockDist && stockUsersContainer) {
			const users = this.getUsers();
			stockDist.style.display = "block";
			stockUsersContainer.innerHTML = users
				.map((u) => {
					const qty =
						product.stock?.[u.username] ||
						product.stock?.[u.name] ||
						0;
					return `
					<div class="products-stock-user-row">
						<span class="products-stock-user-label">${u.name}</span>
						<span class="products-stock-user-qty">${qty} unit\u00e9s</span>
					</div>
				`;
				})
				.join("");
		}

		if (title) title.textContent = "Modifier le produit";

		modal.style.display = "flex";
		setTimeout(() => {
			document.getElementById("productsFormName")?.focus();
		}, 100);
	},

	closeFormModal() {
		const modal = document.getElementById("productsFormModal");
		if (modal) modal.style.display = "none";
	},

	// Save product
	saveProduct() {
		const id = document.getElementById("productsFormId").value;
		const name = document.getElementById("productsFormName").value.trim();
		const category = document
			.getElementById("productsFormCategory")
			.value.trim();
		const sku = document.getElementById("productsFormSku").value.trim();
		const priceHT = parseFloat(
			document.getElementById("productsFormPriceHT").value,
		);
		const priceTTC = parseFloat(
			document.getElementById("productsFormPriceTTC").value,
		);
		const alertThreshold =
			parseInt(
				document.getElementById("productsFormAlertThreshold").value,
			) || 10;
		const description = document
			.getElementById("productsFormDescription")
			.value.trim();

		if (!name) {
			showToast("Le nom du produit est requis.", "error");
			return;
		}
		if (isNaN(priceTTC) || priceTTC <= 0) {
			showToast("Veuillez entrer un prix TTC valide.", "error");
			return;
		}

		const user = Auth.getCurrentUser();

		if (id) {
			// --- UPDATE ---
			DataManager.update("products", parseInt(id), {
				name,
				category,
				sku,
				priceHT: isNaN(priceHT) ? priceTTC / 1.2 : priceHT,
				price: priceTTC,
				alertThreshold,
				description,
			});

			if (user) {
				DataManager.addLog(
					"Modification produit",
					`${user.name} a modifi\u00e9 le produit ${name}`,
					user.id,
				);
			}

			showToast("Produit modifi\u00e9 avec succ\u00e8s !", "success");
		} else {
			// --- CREATE ---
			const stockInit =
				parseInt(
					document.getElementById("productsFormStockInit").value,
				) || 0;
			const currentUser = user ? user.username || user.name : "default";

			const stock = {};
			if (stockInit > 0) {
				stock[currentUser] = stockInit;
			}

			const totalStock = Object.values(stock).reduce((s, q) => s + q, 0);

			const newProduct = DataManager.add("products", {
				name,
				description,
				price: priceTTC,
				priceHT: isNaN(priceHT) ? priceTTC / 1.2 : priceHT,
				sku,
				category,
				alertThreshold,
				stock,
				stockHistory: [
					{
						date: new Date().toISOString(),
						type: "entry",
						quantity: totalStock,
						stockBefore: 0,
						stockAfter: totalStock,
						userId: user ? user.id : null,
						user: user ? user.name : "Syst\u00e8me",
						reason: "Cr\u00e9ation du produit",
						reference: null,
					},
				],
			});

			if (user) {
				DataManager.addLog(
					"Cr\u00e9ation produit",
					`${user.name} a cr\u00e9\u00e9 le produit ${name}`,
					user.id,
				);
			}

			showToast("Produit ajout\u00e9 avec succ\u00e8s !", "success");
		}

		this.closeFormModal();
		this.init();
		if (
			typeof Navigation !== "undefined" &&
			Navigation.updateDashboardStats
		) {
			Navigation.updateDashboardStats();
		}
	},

	// Adjust stock modal
	openAdjustModal(productId) {
		const product = DataManager.findById("products", productId);
		if (!product) return;

		const modal = document.getElementById("productsAdjustModal");
		if (!modal) return;

		document.getElementById("productsAdjustId").value = product.id;

		// Populate product info
		const infoEl = document.getElementById("productsAdjustInfo");
		if (infoEl) {
			const total = this.getTotalStock(product);
			const status = this.getStockStatus(product);
			infoEl.innerHTML = `
				<div class="products-adjust-info-row">
					<div class="products-product-avatar" style="width: 40px; height: 40px; font-size: 1rem;">
						${(product.name || "P").charAt(0).toUpperCase()}
					</div>
					<div style="flex: 1;">
						<div style="font-weight: 600; color: var(--text);">${product.name}</div>
						<div style="font-size: 0.82rem; color: var(--text-muted);">
							Stock actuel: <strong>${total}</strong> unit\u00e9s
							<span class="badge ${status.class}" style="margin-left: 0.5rem;">${status.label}</span>
						</div>
					</div>
				</div>
			`;
		}

		// Populate users dropdown
		const userSelect = document.getElementById("productsAdjustUser");
		if (userSelect) {
			const users = this.getUsers();
			userSelect.innerHTML =
				`<option value="">S\u00e9lectionner un utilisateur</option>` +
				users
					.map(
						(u) =>
							`<option value="${u.username}">${u.name} (${product.stock?.[u.username] || product.stock?.[u.name] || 0} en stock)</option>`,
					)
					.join("");
		}

		// Reset fields
		document.getElementById("productsAdjustQty").value = "1";
		document.getElementById("productsAdjustReason").value =
			"R\u00e9approvisionnement";

		// Reset type to "add"
		const typeAdd = document.getElementById("productsAdjustTypeAdd");
		const typeRemove = document.getElementById("productsAdjustTypeRemove");
		if (typeAdd) typeAdd.classList.add("active");
		if (typeRemove) typeRemove.classList.remove("active");

		modal.style.display = "flex";
	},

	closeAdjustModal() {
		const modal = document.getElementById("productsAdjustModal");
		if (modal) modal.style.display = "none";
	},

	// Save stock adjustment
	saveAdjustment() {
		const productId = parseInt(
			document.getElementById("productsAdjustId").value,
		);
		const userName = document.getElementById("productsAdjustUser").value;
		const quantity = parseInt(
			document.getElementById("productsAdjustQty").value,
		);
		const reason = document.getElementById("productsAdjustReason").value;
		const isRemove = document
			.getElementById("productsAdjustTypeRemove")
			?.classList.contains("active");

		if (!userName) {
			showToast("Veuillez s\u00e9lectionner un utilisateur.", "error");
			return;
		}
		if (!quantity || quantity <= 0) {
			showToast("Veuillez entrer une quantit\u00e9 valide.", "error");
			return;
		}

		const product = DataManager.findById("products", productId);
		if (!product) return;

		if (!product.stock) product.stock = {};
		const currentQty = product.stock[userName] || 0;

		let newQty;
		if (isRemove) {
			newQty = Math.max(0, currentQty - quantity);
		} else {
			newQty = currentQty + quantity;
		}

		product.stock[userName] = newQty;

		// Build stock history entry
		const user = Auth.getCurrentUser();
		const totalBefore = this.getTotalStock(product) - newQty + currentQty;
		const totalAfter = this.getTotalStock(product);

		const historyEntry = {
			date: new Date().toISOString(),
			type: isRemove ? "exit" : "entry",
			quantity: quantity,
			stockBefore: totalBefore,
			stockAfter: totalAfter,
			userId: user ? user.id : null,
			user: user ? user.name : "Syst\u00e8me",
			reason: reason + (isRemove ? " (retrait)" : " (ajout)"),
			reference: null,
		};

		if (!product.stockHistory) product.stockHistory = [];
		product.stockHistory.push(historyEntry);

		DataManager.update("products", productId, {
			stock: product.stock,
			stockHistory: product.stockHistory,
		});

		if (user) {
			const actionLabel = isRemove ? "retir\u00e9" : "ajout\u00e9";
			DataManager.addLog(
				"Ajustement stock",
				`${user.name} a ${actionLabel} ${quantity} unit\u00e9(s) de ${product.name} pour ${userName} - Raison: ${reason}`,
				user.id,
			);
		}

		showToast(
			`Stock ${isRemove ? "diminu\u00e9" : "augment\u00e9"} de ${quantity} unit\u00e9(s) pour ${userName}.`,
			"success",
		);

		this.closeAdjustModal();
		this.init();
		if (
			typeof Navigation !== "undefined" &&
			Navigation.updateDashboardStats
		) {
			Navigation.updateDashboardStats();
		}
	},

	showContextMenu(e, id) {
		const product = DataManager.findById("products", id);
		if (!product) return;
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const items = [
			{ label: "Ajuster le stock", icon: Icons.get("package", 14), action: () => this.openAdjustModal(id) },
			...(canEdit ? [{ label: "Modifier", icon: Icons.get("edit", 14), action: () => this.openEditModal(id) }] : []),
			...(canDelete ? [{ divider: true }, { label: "Supprimer", icon: Icons.get("trash", 14), danger: true, action: () => this.deleteProduct(id) }] : []),
		];
		ContextMenu.show(e, items);
	},

	// Delete product
	async deleteProduct(productId) {
		const product = DataManager.findById("products", productId);
		if (!product) return;

		const confirmed = await showConfirm(
			`Supprimer le produit "${product.name}" ?`,
			"Cette action est irréversible.",
			"danger",
		);

		if (!confirmed) return;

		const user = Auth.getCurrentUser();
		DataManager.delete("products", productId);

		if (user) {
			DataManager.addLog(
				"Suppression produit",
				`${user.name} a supprim\u00e9 le produit ${product.name}`,
				user.id,
			);
		}

		showToast("Produit supprim\u00e9 avec succ\u00e8s.", "success");
		this.init();
		if (
			typeof Navigation !== "undefined" &&
			Navigation.updateDashboardStats
		) {
			Navigation.updateDashboardStats();
		}
	},

	// Scoped styles
	getStyles() {
		return `
						.products-page {
				animation: fadeIn 0.3s ease;
			}

						.products-controls {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 1rem;
				flex-wrap: wrap;
				margin-top: 0.25rem;
				margin-bottom: 0.25rem;
			}

			.products-controls-left {
				display: flex;
				align-items: center;
				gap: 0.75rem;
				flex-wrap: wrap;
				flex: 1;
			}

			.products-search-wrap {
				position: relative;
				flex: 1;
				max-width: 280px;
				min-width: 180px;
			}

			.products-search-icon {
				position: absolute;
				left: 0.75rem;
				top: 50%;
				transform: translateY(-50%);
				color: var(--text-muted);
				display: flex;
				align-items: center;
				pointer-events: none;
			}

			.products-filter-select {
				padding: 0.6rem 0.85rem;
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius);
				background: var(--card-bg);
				color: var(--text);
				font-size: 0.85rem;
				font-family: inherit;
				cursor: pointer;
				transition: border-color 0.2s ease, box-shadow 0.2s ease;
				min-width: 160px;
			}

			.products-filter-select:focus {
				outline: none;
				border-color: var(--primary);
				box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
			}

						.products-table-footer {
				padding: 0.75rem 1rem;
				border-top: 1px solid var(--border-color);
				display: flex;
				align-items: center;
				justify-content: space-between;
			}

			.products-cell-product {
				display: flex;
				align-items: center;
				gap: 0.75rem;
			}

			.products-product-avatar {
				width: 36px;
				height: 36px;
				border-radius: var(--radius-sm);
				background: var(--primary-light);
				color: var(--primary);
				display: flex;
				align-items: center;
				justify-content: center;
				font-weight: 700;
				font-size: 0.9rem;
				flex-shrink: 0;
			}

			.products-product-name {
				font-weight: 600;
				color: var(--text);
				font-size: 0.88rem;
			}

			.products-product-desc {
				color: var(--text-muted);
				font-size: 0.78rem;
				max-width: 220px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

						.products-stock-cell {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 0.2rem;
			}

			.products-stock-number {
				font-weight: 700;
				font-size: 0.95rem;
				color: var(--text);
			}

			.products-stock-bar {
				width: 100%;
				height: 5px;
				background: var(--bg-alt);
				border-radius: 3px;
				overflow: hidden;
			}

			.products-stock-bar-fill {
				height: 100%;
				border-radius: 3px;
				transition: width 0.4s ease;
			}

			.products-stock-threshold {
				font-size: 0.7rem;
				color: var(--text-muted);
			}

						.products-actions-cell {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 0.35rem;
			}

						.products-input-euro {
				position: relative;
			}

			.products-input-euro input {
				width: 100%;
				padding: 0.65rem 0.85rem;
				padding-right: 2rem;
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius-sm);
				background: var(--card-bg);
				color: var(--text);
				font-size: 0.88rem;
				font-family: inherit;
				transition: border-color 0.2s ease, box-shadow 0.2s ease;
			}

			.products-input-euro input:focus {
				outline: none;
				border-color: var(--primary);
				box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
			}

			.products-euro-symbol {
				position: absolute;
				right: 0.75rem;
				top: 50%;
				transform: translateY(-50%);
				color: var(--text-muted);
				font-weight: 600;
				font-size: 0.88rem;
				pointer-events: none;
			}

						.products-stock-users-grid {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
			}

			.products-stock-user-row {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 0.6rem 0.85rem;
				background: var(--bg-alt);
				border-radius: var(--radius-sm);
			}

			.products-stock-user-label {
				font-weight: 500;
				color: var(--text);
				font-size: 0.85rem;
			}

			.products-stock-user-qty {
				font-weight: 600;
				color: var(--primary);
				font-size: 0.85rem;
			}

						.products-adjust-product-info {
				background: var(--bg-alt);
				border-radius: var(--radius-sm);
				padding: 0.85rem;
				margin-bottom: 1.25rem;
			}

			.products-adjust-info-row {
				display: flex;
				align-items: center;
				gap: 0.75rem;
			}

			.products-adjust-type-group {
				display: flex;
				gap: 0.5rem;
			}

			.products-adjust-type-btn {
				flex: 1;
				padding: 0.6rem 1rem;
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius-sm);
				background: var(--card-bg);
				color: var(--text-secondary);
				font-size: 0.85rem;
				font-weight: 600;
				font-family: inherit;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 0.4rem;
				transition: all 0.2s ease;
			}

			.products-adjust-type-btn:hover {
				border-color: var(--primary);
				color: var(--primary);
			}

			.products-adjust-type-btn.active {
				background: var(--primary-light);
				border-color: var(--primary);
				color: var(--primary);
			}

						@media (max-width: 768px) {
				.products-controls {
					flex-direction: column;
					align-items: stretch;
				}

				.products-controls-left {
					flex-direction: column;
				}

				.products-search-wrap {
					max-width: 100%;
				}

				.products-filter-select {
					min-width: 100%;
				}

				.products-cell-product {
					min-width: 180px;
				}
			}
		`;
	},
};

window.ProductsModule = ProductsModule;
