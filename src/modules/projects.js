// Projects module - Full project management with cards, modals, and filters
const ProjectsModule = {
	searchQuery: "",
	currentFilter: "all",
	editingProjectId: null,

	// Status configuration for badges and labels
	statusConfig: {
		active: { badge: "badge-primary", label: "Actif", dot: "#2563eb" },
		paused: { badge: "badge-warning", label: "En pause", dot: "#f59e0b" },
		completed: {
			badge: "badge-success",
			label: "Termin\u00e9",
			dot: "#22c55e",
		},
		cancelled: {
			badge: "badge-danger",
			label: "Annul\u00e9",
			dot: "#ef4444",
		},
	},

	// Initialization

	init() {
		this.searchQuery = "";
		this.currentFilter = "all";
		this.editingProjectId = null;
		this.render();
		this.attachEventListeners();
	},

	// Data helpers

	// Return all projects filtered by search and status
	getFilteredProjects() {
		let projects = DataManager.get("projects") || [];

		// Filter by status
		if (this.currentFilter !== "all") {
			projects = projects.filter((p) => p.status === this.currentFilter);
		}

		// Filter by search query
		if (this.searchQuery) {
			const q = this.searchQuery.toLowerCase();
			projects = projects.filter(
				(p) =>
					(p.name || "").toLowerCase().includes(q) ||
					(p.description || "").toLowerCase().includes(q),
			);
		}

		return projects;
	},

	// Compute stats from all projects (unfiltered)
	getStats() {
		const projects = DataManager.get("projects") || [];
		return {
			total: projects.length,
			active: projects.filter((p) => p.status === "active").length,
			completed: projects.filter((p) => p.status === "completed").length,
			paused: projects.filter((p) => p.status === "paused").length,
		};
	},

	// Get user objects for a project's member list
	getProjectMembers(project) {
		const users = DataManager.get("users") || [];
		if (!project.members || !project.members.length) return [];
		return project.members
			.map((username) => users.find((u) => u.username === username))
			.filter(Boolean);
	},

	// Main render

	render() {
		const container = document.getElementById("projectsPage");
		if (!container) return;

		container.innerHTML = `
			<style>${this.getStyles()}</style>
			<div class="projects-page">
				${this.renderHeader()}
				${this.renderStats()}
				${this.renderControls()}
				${this.renderProjectsGrid()}
			</div>
			${this.renderFormModal()}
			${this.renderDetailModal()}
		`;
	},

	// Page header

	renderHeader() {
		const canCreate = Auth.hasPermission("create");
		return `
			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("folder", 20)}</span>
					<div class="phb-text">
						<h1>Projets</h1>
						<p class="page-description">G\u00e9rez et suivez tous vos projets en un seul endroit</p>
					</div>
				</div>
				${canCreate ? '<div class="page-header-box-actions"><button class="btn-primary" id="projectsAddBtn">Nouveau projet</button></div>' : ""}
			</div>
		`;
	},

	// Stats grid (supprimé : pas de card stats sur projets)

	renderStats() {
		return ""; // Pas de stats cards sur cette page
	},

	// Controls bar (search + filter + add button)

	renderControls() {
		return `
			<div class="projects-controls">
				<div class="projects-controls-left">
					<div class="projects-search-wrap">
						<span class="projects-search-icon">${Icons.get("search", 16)}</span>
						<input
							type="text"
							class="search-input"
							id="projectsSearch"
							placeholder="Rechercher un projet..."
							value="${this.searchQuery}"
							style="padding-left: 2.4rem; max-width: 300px;"
						/>
					</div>
					<select id="projectsStatusFilter" class="projects-filter-select">
						<option value="all"${this.currentFilter === "all" ? " selected" : ""}>Tous les statuts</option>
						<option value="active"${this.currentFilter === "active" ? " selected" : ""}>Actif</option>
						<option value="paused"${this.currentFilter === "paused" ? " selected" : ""}>En pause</option>
						<option value="completed"${this.currentFilter === "completed" ? " selected" : ""}>Termin\u00e9</option>
						<option value="cancelled"${this.currentFilter === "cancelled" ? " selected" : ""}>Annul\u00e9</option>
					</select>
				</div>
			</div>
		`;
	},

	// Project cards grid

	renderProjectsGrid() {
		const projects = this.getFilteredProjects();

		if (projects.length === 0) {
			return this.renderEmptyState();
		}

		const canCreate = Auth.hasPermission("create");
		return `
			<div class="projects-card-grid" id="projectsCardGrid">
				${projects.map((p) => this.renderProjectCard(p)).join("")}
				${canCreate ? `<button class="quick-add-card" onclick="ProjectsModule.openAddModal()"><div class="quick-add-card-icon">+</div><span>Nouveau projet</span></button>` : ""}
			</div>
		`;
	},

	// Single project card
	renderProjectCard(project) {
		const progress = project.progress || 0;
		const cfg =
			this.statusConfig[project.status] || this.statusConfig.active;
		const members = this.getProjectMembers(project);
		const deadlineStr = project.deadline
			? new Date(project.deadline).toLocaleDateString("fr-FR")
			: "Pas de deadline";

		return `
			<div class="card projects-card" data-project-id="${project.id}" data-status="${project.status || "active"}" oncontextmenu="event.preventDefault();ProjectsModule.showContextMenu(event,${project.id})">
				<div class="projects-card-clickable" onclick="ProjectsModule.openDetailModal(${project.id})">
					<div class="projects-card-top">
						<span class="projects-card-emoji">${project.emoji || "\ud83d\udcc1"}</span>
						<span class="badge ${cfg.badge}">${cfg.label}</span>
					</div>
					<h3 class="projects-card-name">${project.name}</h3>
					<p class="projects-card-desc">${project.description || "Aucune description"}</p>
					<div class="projects-card-progress">
						<div class="projects-card-progress-header">
							<span>Progression</span>
							<span>${progress}%</span>
						</div>
						<div class="projects-card-progress-bar">
							<div class="projects-card-progress-fill" style="width: ${progress}%"></div>
						</div>
					</div>
					<div class="projects-card-meta">
						<span class="projects-card-meta-item">
							${Icons.get("calendar", 14)}
							${deadlineStr}
						</span>
						<span class="projects-card-meta-item">
							${Icons.get("users", 14)}
							${members.length || 0} membre${(members.length || 0) > 1 ? "s" : ""}
						</span>
					</div>
					${
						members.length > 0
							? `
						<div class="projects-card-avatars">
							${members
								.slice(0, 5)
								.map(
									(m) => `
								<div class="projects-card-avatar" title="${m.name}">${m.avatar}</div>
							`,
								)
								.join("")}
							${members.length > 5 ? `<div class="projects-card-avatar-more">+${members.length - 5}</div>` : ""}
						</div>
					`
							: ""
					}
				</div>
				<div class="projects-card-actions">
					<button class="btn-icon" title="Modifier" data-action="edit" data-id="${project.id}">
						${Icons.get("edit", 15)}
					</button>
					
				</div>
			</div>
		`;
	},

	// Empty state when no projects exist or match filters
	renderEmptyState() {
		const hasFilters = this.searchQuery || this.currentFilter !== "all";
		return `
			<div class="card" style="margin-top: 1rem;">
				<div class="empty-state-dashed">
					<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
						${Icons.get("folder", 40)}
					</div>
					<h4>${hasFilters ? "Aucun projet trouv\u00e9" : "Aucun projet actuel"}</h4>
					<p>${
						hasFilters
							? "Modifiez vos crit\u00e8res de recherche ou de filtre."
							: "Commencez par cr\u00e9er votre premier projet."
					}</p>
					${
						!hasFilters
							? `<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="ProjectsModule.openAddModal()">
							Nouveau projet
						</button>`
							: ""
					}
				</div>
			</div>
		`;
	},

	// Add / edit modal

	renderFormModal() {
		const users = (DataManager.get("users") || []).filter((u) => u.active);

		return `
			<div class="modal-overlay" id="projectFormModal" style="display: none;">
				<div class="modal-content" style="max-width: 600px;">
					<div class="modal-header">
						<h3 id="projectFormTitle">Nouveau projet</h3>
						<button class="btn-icon" id="projectFormClose" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body">
						<input type="hidden" id="projectFormId" value="" />

						<div style="display: grid; grid-template-columns: 1fr 80px; gap: 1rem;">
							<div class="form-group">
								<label for="projectFormName">Nom du projet *</label>
								<input type="text" id="projectFormName" placeholder="Ex: Refonte site web" required />
							</div>
							<div class="form-group">
								<label for="projectFormEmoji">Emoji</label>
								<input type="text" id="projectFormEmoji" placeholder="\ud83d\udcc1" maxlength="4" style="text-align: center; font-size: 1.4rem;" />
							</div>
						</div>

						<div class="form-group">
							<label for="projectFormDescription">Description</label>
							<textarea id="projectFormDescription" rows="3" placeholder="D\u00e9crivez le projet..."></textarea>
						</div>

						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
							<div class="form-group">
								<label for="projectFormStatus">Statut *</label>
								<select id="projectFormStatus" required>
									<option value="active">Actif</option>
									<option value="paused">En pause</option>
									<option value="completed">Termin\u00e9</option>
									<option value="cancelled">Annul\u00e9</option>
								</select>
							</div>
							<div class="form-group">
								<label for="projectFormDeadline">Deadline</label>
								<input type="date" id="projectFormDeadline" />
							</div>
						</div>

						<div class="form-group">
							<label for="projectFormProgress">Progression : <span id="projectFormProgressValue">0</span>%</label>
							<input type="range" id="projectFormProgress" min="0" max="100" value="0" class="projects-slider" />
						</div>

						<div class="form-group">
							<label>Membres de l'\u00e9quipe</label>
							<div class="projects-members-checkboxes" id="projectFormMembers">
								${users
									.map(
										(u) => `
									<label class="projects-member-checkbox">
										<input type="checkbox" value="${u.username}" />
										<span class="projects-member-avatar">${u.avatar}</span>
										<span>${u.name}</span>
									</label>
								`,
									)
									.join("")}
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" id="projectFormCancel">Annuler</button>
						<button class="btn-success" id="projectFormSave">
							Enregistrer
						</button>
					</div>
				</div>
			</div>
		`;
	},

	// Detail modal (read-only project view)

	renderDetailModal() {
		return `
			<div class="modal-overlay" id="projectDetailModal" style="display: none;">
				<div class="modal-content" style="max-width: 1040px; width: 94vw;">
					<div class="modal-header">
						<h3 id="projectDetailTitle">D\u00e9tails du projet</h3>
						<button class="btn-icon" id="projectDetailClose" title="Fermer">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="modal-body" id="projectDetailBody">
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" id="projectDetailCloseBtn">Fermer</button>
						<button class="btn-primary" id="projectDetailEditBtn">
							Modifier
						</button>
					</div>
				</div>
			</div>
		`;
	},

	// Event listeners

	attachEventListeners() {
		// Search input
		const searchInput = document.getElementById("projectsSearch");
		if (searchInput) {
			searchInput.addEventListener("input", (e) => {
				this.searchQuery = e.target.value;
				this.refreshGrid();
			});
		}

		// Status filter dropdown
		const statusFilter = document.getElementById("projectsStatusFilter");
		if (statusFilter) {
			statusFilter.addEventListener("change", (e) => {
				this.currentFilter = e.target.value;
				this.refreshGrid();
			});
		}

		// Add button
		const addBtn = document.getElementById("projectsAddBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.openAddModal());
		}

		// Form modal close / cancel / save
		const formClose = document.getElementById("projectFormClose");
		const formCancel = document.getElementById("projectFormCancel");
		const formSave = document.getElementById("projectFormSave");
		if (formClose)
			formClose.addEventListener("click", () => this.closeFormModal());
		if (formCancel)
			formCancel.addEventListener("click", () => this.closeFormModal());
		if (formSave)
			formSave.addEventListener("click", () => this.saveProject());

		// Close form modal on overlay click
		const formModal = document.getElementById("projectFormModal");
		if (formModal) {
			formModal.addEventListener("click", (e) => {
				if (e.target === formModal) this.closeFormModal();
			});
		}

		// Progress slider live value display
		const progressSlider = document.getElementById("projectFormProgress");
		if (progressSlider) {
			progressSlider.addEventListener("input", (e) => {
				const label = document.getElementById(
					"projectFormProgressValue",
				);
				if (label) label.textContent = e.target.value;
			});
		}

		// Detail modal close buttons
		const detailClose = document.getElementById("projectDetailClose");
		const detailCloseBtn = document.getElementById("projectDetailCloseBtn");
		const detailEditBtn = document.getElementById("projectDetailEditBtn");
		if (detailClose)
			detailClose.addEventListener("click", () =>
				this.closeDetailModal(),
			);
		if (detailCloseBtn)
			detailCloseBtn.addEventListener("click", () =>
				this.closeDetailModal(),
			);
		if (detailEditBtn)
			detailEditBtn.addEventListener("click", () =>
				this.editFromDetail(),
			);

		// Close detail modal on overlay click
		const detailModal = document.getElementById("projectDetailModal");
		if (detailModal) {
			detailModal.addEventListener("click", (e) => {
				if (e.target === detailModal) this.closeDetailModal();
			});
		}

		// Delegated click handlers for card action buttons (edit/delete)
		const page = document.getElementById("projectsPage");
		if (page) {
			page.addEventListener("click", (e) => {
				const btn = e.target.closest("button[data-action]");
				if (!btn) return;

				e.stopPropagation();
				const action = btn.dataset.action;
				const id = parseInt(btn.dataset.id);

				if (action === "edit") this.openEditModal(id);
				if (action === "delete") this.deleteProject(id);
			});
		}

		// Escape key to close modals
		this._escHandler = (e) => {
			if (e.key === "Escape") {
				this.closeFormModal();
				this.closeDetailModal();
			}
		};
		document.addEventListener("keydown", this._escHandler);
	},

	// Partial refresh (just the cards grid)

	refreshGrid() {
		const gridContainer = document.getElementById("projectsPage");
		if (!gridContainer) return;

		const existing = gridContainer.querySelector(
			".projects-card-grid, .card:has(.empty-state)",
		);
		if (existing) {
			const temp = document.createElement("div");
			temp.innerHTML = this.renderProjectsGrid();
			existing.replaceWith(temp.firstElementChild);
		}
	},

	// Add modal

	openAddModal() {
		this.editingProjectId = null;

		const title = document.getElementById("projectFormTitle");
		if (title) title.textContent = "Nouveau projet";

		// Reset all form fields
		document.getElementById("projectFormId").value = "";
		document.getElementById("projectFormName").value = "";
		document.getElementById("projectFormEmoji").value = "";
		document.getElementById("projectFormDescription").value = "";
		document.getElementById("projectFormStatus").value = "active";
		document.getElementById("projectFormDeadline").value = "";
		document.getElementById("projectFormProgress").value = "0";

		const progressLabel = document.getElementById(
			"projectFormProgressValue",
		);
		if (progressLabel) progressLabel.textContent = "0";

		// Uncheck all member checkboxes
		const checkboxes = document.querySelectorAll(
			"#projectFormMembers input[type='checkbox']",
		);
		checkboxes.forEach((cb) => (cb.checked = false));

		// Refresh the members checkboxes in case users changed
		this.refreshMembersCheckboxes();

		const modal = document.getElementById("projectFormModal");
		if (modal) modal.style.display = "flex";

		setTimeout(
			() => document.getElementById("projectFormName")?.focus(),
			100,
		);
	},

	// Edit modal

	openEditModal(id) {
		const project = DataManager.findById("projects", id);
		if (!project) return;

		this.editingProjectId = id;

		const title = document.getElementById("projectFormTitle");
		if (title) title.textContent = "Modifier le projet";

		document.getElementById("projectFormId").value = project.id;
		document.getElementById("projectFormName").value = project.name || "";
		document.getElementById("projectFormEmoji").value = project.emoji || "";
		document.getElementById("projectFormDescription").value =
			project.description || "";
		document.getElementById("projectFormStatus").value =
			project.status || "active";
		document.getElementById("projectFormDeadline").value =
			project.deadline || "";
		document.getElementById("projectFormProgress").value =
			project.progress || 0;

		const progressLabel = document.getElementById(
			"projectFormProgressValue",
		);
		if (progressLabel) progressLabel.textContent = project.progress || 0;

		// Refresh and check the right member checkboxes
		this.refreshMembersCheckboxes(project.members || []);

		const modal = document.getElementById("projectFormModal");
		if (modal) modal.style.display = "flex";

		setTimeout(
			() => document.getElementById("projectFormName")?.focus(),
			100,
		);
	},

	// Rebuild member checkboxes (useful if users were added/removed)
	refreshMembersCheckboxes(selectedMembers) {
		const container = document.getElementById("projectFormMembers");
		if (!container) return;

		const users = (DataManager.get("users") || []).filter((u) => u.active);
		const selected = selectedMembers || [];

		container.innerHTML = users
			.map(
				(u) => `
				<label class="projects-member-checkbox">
					<input type="checkbox" value="${u.username}" ${selected.includes(u.username) ? "checked" : ""} />
					<span class="projects-member-avatar">${u.avatar}</span>
					<span>${u.name}</span>
				</label>
			`,
			)
			.join("");
	},

	closeFormModal() {
		const modal = document.getElementById("projectFormModal");
		if (modal) modal.style.display = "none";
	},

	// Save project (add or update)

	saveProject() {
		const name = document.getElementById("projectFormName").value.trim();
		if (!name) {
			showToast("Le nom du projet est requis.", "warning");
			return;
		}

		const id = document.getElementById("projectFormId").value;

		// Collect checked members
		const memberCheckboxes = document.querySelectorAll(
			"#projectFormMembers input[type='checkbox']:checked",
		);
		const members = Array.from(memberCheckboxes).map((cb) => cb.value);

		const projectData = {
			name: name,
			description: document
				.getElementById("projectFormDescription")
				.value.trim(),
			emoji:
				document.getElementById("projectFormEmoji").value.trim() ||
				"\ud83d\udcc1",
			status: document.getElementById("projectFormStatus").value,
			deadline:
				document.getElementById("projectFormDeadline").value || null,
			progress:
				parseInt(
					document.getElementById("projectFormProgress").value,
				) || 0,
			members: members,
		};

		const user = Auth.getCurrentUser();

		if (id) {
			// Update existing project — track history
			const existing = DataManager.findById("projects", parseInt(id));
			const historyEntry = {
				timestamp: new Date().toISOString(),
				userId: user.id,
				userName: user.name,
				userAvatar: user.avatar || "👤",
				changes: [],
			};
			const trackFields = {
				name: "Nom",
				status: "Statut",
				description: "Description",
				deadline: "Deadline",
				progress: "Progression",
			};
			for (const [key, label] of Object.entries(trackFields)) {
				const from = existing ? existing[key] : undefined;
				const to = projectData[key];
				if (String(from ?? "") !== String(to ?? "")) {
					historyEntry.changes.push({
						field: label,
						from: from ?? "—",
						to: to ?? "—",
					});
				}
			}
			projectData.history = [
				...((existing && existing.history) || []),
				historyEntry,
			];
			DataManager.update("projects", parseInt(id), projectData);
			DataManager.addLog(
				"Modification projet",
				`${projectData.name} modifi\u00e9`,
				user.id,
			);
			showToast("Projet modifi\u00e9 avec succ\u00e8s.", "success");
		} else {
			// Create new project
			DataManager.add("projects", projectData);
			DataManager.addLog(
				"Cr\u00e9ation projet",
				`${projectData.name} cr\u00e9\u00e9`,
				user.id,
			);
			showToast("Projet cr\u00e9\u00e9 avec succ\u00e8s.", "success");
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

	// Delete project

	showContextMenu(e, id) {
		const project = DataManager.findById("projects", id);
		if (!project) return;
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const items = [
			{ label: "Voir le détail", icon: Icons.get("eye", 14), action: () => this.openDetailModal(id) },
			...(canEdit ? [{ label: "Modifier", icon: Icons.get("edit", 14), action: () => this.openEditModal(id) }] : []),
			...(canDelete ? [{ divider: true }, { label: "Supprimer", icon: Icons.get("trash", 14), danger: true, action: () => this.deleteProject(id) }] : []),
		];
		ContextMenu.show(e, items);
	},

	async deleteProject(id) {
		const project = DataManager.findById("projects", id);
		if (!project) return;

		const confirmed = await showConfirm(
			`Supprimer le projet "${project.name}" ?`,
			"Cette action est irr\u00e9versible.",
			"danger"
		);
		if (!confirmed) return;

		const user = Auth.getCurrentUser();
		DataManager.delete("projects", id);
		DataManager.addLog(
			"Suppression projet",
			`${project.name} supprim\u00e9`,
			user.id,
		);
		showToast("Projet supprim\u00e9 avec succ\u00e8s.", "success");

		this.init();

		if (
			typeof Navigation !== "undefined" &&
			Navigation.updateDashboardStats
		) {
			Navigation.updateDashboardStats();
		}
	},

	// Detail modal

	openDetailModal(id) {
		const project = DataManager.findById("projects", id);
		if (!project) {
			showToast("Projet introuvable.", "danger");
			return;
		}

		this.editingProjectId = id;

		const cfg =
			this.statusConfig[project.status] || this.statusConfig.active;
		const members = this.getProjectMembers(project);
		const progress = this.getProjectProgress
			? this.getProjectProgress(id)
			: project.progress || 0;

		const title = document.getElementById("projectDetailTitle");
		if (title)
			title.innerHTML = `<span style="font-size:1.4rem;">${project.emoji || "\u{1F4C1}"}</span> ${project.name}`;

		const statusBadge = document.getElementById("projectDetailStatusBadge");
		if (statusBadge)
			statusBadge.innerHTML = `<span class="badge ${cfg.badge}">${cfg.label}</span>`;

		// Members
		const membersHtml =
			members.length > 0
				? `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.3rem;">${members
						.map(
							(m) =>
								`<div class="pj-member-chip" title="${m.name}">${m.avatar}</div>`,
						)
						.join("")}</div>`
				: `<span style="font-size:0.82rem;color:var(--text-muted);">Aucun membre assign\u00e9</span>`;

		// Deadline
		const deadlineDisplay = project.deadline
			? new Date(project.deadline).toLocaleDateString("fr-FR", {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
				})
			: "Non d\u00e9finie";

		// Tasks
		const allTasks = DataManager.get("tasks") || [];
		const projectTasks = allTasks.filter(
			(t) => t.projectId === id || t.project === id,
		);
		const users = DataManager.get("users") || [];

		const priorityBadge = {
			high: `<span class="badge badge-danger" style="font-size:0.7rem;padding:0.15rem 0.45rem;">Haute</span>`,
			medium: `<span class="badge badge-warning" style="font-size:0.7rem;padding:0.15rem 0.45rem;">Moyenne</span>`,
			low: `<span class="badge badge-info" style="font-size:0.7rem;padding:0.15rem 0.45rem;">Basse</span>`,
		};

		const tasksHtml =
			projectTasks.length > 0
				? projectTasks
						.map((task) => {
							const isDone =
								task.completed ||
								task.status === "completed" ||
								task.status === "done";
							return `<div class="project-task-row">
					<div class="project-task-status${isDone ? " done" : ""}">${isDone ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}</div>
					<span style="flex:1;font-size:0.88rem;${isDone ? "text-decoration:line-through;color:var(--text-muted);" : "color:var(--text);"}">${task.title || "Sans titre"}</span>
					<span class="badge ${isDone ? "badge-success" : "badge-warning"}" style="font-size:0.68rem;padding:0.1rem 0.4rem;flex-shrink:0;">${isDone ? "Terminée" : "En cours"}</span>
				</div>`;
						})
						.join("")
				: `<div class="empty-state-dashed" style="margin:0.5rem 0;">
				${Icons.get("check", 28)}
				<p style="margin-top:0.5rem;font-size:0.88rem;color:var(--text-muted);">Aucune t\u00e2che pour ce projet.</p>
			</div>`;

		const addTaskBtn = `<div style="text-align:center;margin-top:0.75rem;">
			<button class="btn-secondary btn-sm" onclick="Navigation.navigateTo('tasks')">Ajouter une t\u00e2che</button>
		</div>`;

		// History — use project.history (per-project change tracking)
		const projectHistory = [...(project.history || [])].reverse();
		const logsHtml =
			projectHistory.length > 0
				? `<div class="pj-timeline">${projectHistory
						.map((h, i) => {
							const d = new Date(h.timestamp || "");
							const displayDate = isNaN(d)
								? ""
								: d.toLocaleString("fr-FR", {
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									});
							const changesText =
								h.changes && h.changes.length > 0
									? h.changes
											.map(
												(c) =>
													`<strong>${c.field}</strong> : ${c.from} → ${c.to}`,
											)
											.join("<br>")
									: "Mise à jour";
							return `<div class="pj-timeline-item${i === projectHistory.length - 1 ? " last" : ""}">
					<div class="pj-timeline-dot"></div>
					<div class="pj-timeline-content">
						<div class="pj-timeline-header">
							<span class="pj-timeline-action">Modification</span>
							${h.userAvatar ? `<span class="pj-timeline-user">${h.userAvatar} <span>${h.userName || ""}</span></span>` : ""}
						</div>
						<p class="pj-timeline-detail">${changesText}</p>
						<span class="pj-timeline-time">${displayDate}</span>
					</div>
				</div>`;
						})
						.join("")}</div>`
				: `<div class="empty-state-dashed" style="margin:0.5rem 0;">
				${Icons.get("clock", 28)}
				<p style="margin-top:0.5rem;font-size:0.88rem;color:var(--text-muted);">Aucune activit\u00e9 enregistr\u00e9e.</p>
			</div>`;

		// Comments
		const comments = project.comments || [];
		const currentUser =
			typeof Auth !== "undefined" ? Auth.getCurrentUser() : null;
		const commentsHtml =
			comments.length > 0
				? comments
						.map(
							(c, idx) => `
				<div class="pj-comment" data-comment-idx="${idx}">
					<div class="pj-comment-avatar">${c.userAvatar || "\u{1F464}"}</div>
					<div class="pj-comment-body">
						<div class="pj-comment-meta">
							<span class="pj-comment-author">${c.userName || "Anonyme"}</span>
							<span class="pj-comment-time">${c.createdAt ? new Date(c.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
						</div>
						<p class="pj-comment-text" id="pj-comment-text-${idx}">${c.text}</p>
						<div class="pj-comment-actions">
							<button class="pj-comment-btn" onclick="ProjectsModule.editComment(${id}, ${idx})">Modifier</button>
							<button class="pj-comment-btn danger" onclick="ProjectsModule.deleteComment(${id}, ${idx})">Supprimer</button>
						</div>
					</div>
				</div>`,
						)
						.join("")
				: `<div class="empty-state-dashed" style="margin:0.5rem 0;">
				${Icons.get("messageCircle", 28)}
				<p style="margin-top:0.5rem;font-size:0.88rem;color:var(--text-muted);">Aucun commentaire encore.</p>
			</div>`;

		// Assemble
		const body = document.getElementById("projectDetailBody");
		if (body) {
			body.innerHTML = `
				<!-- Description box above columns -->
				<div class="pj-description-box" id="pjDescBox">
					<div class="pj-desc-content" id="pjDescContent">
						<p class="pj-desc-text" id="pjDescText">${project.description ? project.description.replace(/\n/g, "<br>") : '<em style="color:var(--text-muted)">Aucune description. Cliquez sur Modifier pour en ajouter une.</em>'}</p>
					</div>
				</div>

				<div class="projects-modal-cols">
					<!-- LEFT: Props (membres, statut, deadline, progression, actions) -->
					<div class="projects-modal-left">
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("users", 13)} Membres</div>
							<div class="pj-prop-value">${membersHtml}</div>
						</div>
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("activity", 13)} Statut</div>
							<div class="pj-prop-value pj-prop-editable" onclick="ProjectsModule.editProjectProp('status', ${project.id}, this)"><span class="badge ${cfg.badge}">${cfg.label}</span></div>
						</div>
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("flag", 13)} Priorité</div>
							<div class="pj-prop-value pj-prop-editable" onclick="ProjectsModule.editProjectProp('priority', ${project.id}, this)">${
								project.priority === "high"
									? '<span class="badge badge-danger">Haute</span>'
									: project.priority === "medium"
										? '<span class="badge badge-warning">Moyenne</span>'
										: project.priority === "low"
											? '<span class="badge badge-info">Basse</span>'
											: '<em style="color:var(--text-muted);font-size:0.82rem;">Non d\u00e9finie</em>'
							}</div>
						</div>
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("calendar", 13)} Deadline</div>
							<div class="pj-prop-value pj-prop-editable" style="font-weight:600;font-size:0.87rem;" onclick="ProjectsModule.editProjectProp('dueDate', ${project.id}, this)">${deadlineDisplay}</div>
						</div>
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("user", 13)} Responsable</div>
							<div class="pj-prop-value pj-prop-editable" onclick="ProjectsModule.editProjectProp('assigneeId', ${project.id}, this)">${(() => {
								const _u = users.find(
									(u) => u.id === project.assigneeId,
								);
								return _u
									? `<span style="display:inline-flex;align-items:center;gap:0.4rem;">${_u.avatar || "\u{1F464}"} <span>${_u.name}</span></span>`
									: '<em style="color:var(--text-muted);font-size:0.82rem;">Non assign\u00e9</em>';
							})()}</div>
						</div>
						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("trendingUp", 13)} Progression</div>
							<div class="pj-prop-value">
								<div class="projects-card-progress" style="margin-top:0.2rem;">
									<div class="projects-card-progress-header">
										<span>${projectTasks.length} t\u00e2che${projectTasks.length !== 1 ? "s" : ""}</span>
										<span style="font-weight:700;">${progress}%</span>
									</div>
									<div class="projects-card-progress-bar" style="height:7px;">
										<div class="projects-card-progress-fill" style="width:${progress}%;"></div>
									</div>
								</div>
							</div>
						</div>
						<div class="pj-prop-actions">
							<button class="btn-secondary btn-sm delete" onclick="ProjectsModule.closeDetailModal(); ProjectsModule.deleteProject(${id});">Supprimer</button>
						</div>
					</div>
					<!-- RIGHT: Tabs -->
					<div class="projects-modal-right">
						<div class="modal-tabs">
							<button class="modal-tab active" data-tab="tasks" onclick="ProjectsModule.switchProjectTab('tasks')">T\u00e2ches</button>
							<button class="modal-tab" data-tab="notes" onclick="ProjectsModule.switchProjectTab('notes')">Commentaires</button>
							<button class="modal-tab" data-tab="logs" onclick="ProjectsModule.switchProjectTab('logs')">Historique</button>
						</div>
						<div class="modal-tab-panel active" data-panel="tasks">
							${tasksHtml}
							${addTaskBtn}
						</div>
						<!-- Logs timeline -->
						<div class="modal-tab-panel" data-panel="logs">
							${logsHtml}
						</div>
						<div class="modal-tab-panel" data-panel="notes">
							<div class="pj-comments-wrap">
								<div class="pj-comments-list" id="pjCommentsList">${commentsHtml}</div>
								<div class="pj-comment-compose">
									<textarea id="pjCommentInput" class="pj-comment-input" rows="2" placeholder="Ajouter un commentaire… (Entrée pour envoyer)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ProjectsModule.addComment(${id});}"></textarea>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
		}

		const modal = document.getElementById("projectDetailModal");
		if (modal) modal.style.display = "flex";
	},

	closeDetailModal() {
		const modal = document.getElementById("projectDetailModal");
		if (modal) modal.style.display = "none";
	},

	switchProjectTab(tab) {
		document
			.querySelectorAll(".modal-tab")
			.forEach((b) =>
				b.classList.toggle("active", b.dataset.tab === tab),
			);
		document
			.querySelectorAll(".modal-tab-panel")
			.forEach((p) =>
				p.classList.toggle("active", p.dataset.panel === tab),
			);
	},

	editDescriptionInline(projectId) {
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const container = document.getElementById("pjDescContent");
		if (!container) return;
		container.innerHTML = `
			<textarea id="pjDescEdit" class="pj-desc-edit-area" rows="4" style="width:100%;resize:vertical;padding:0.6rem;border:1.5px solid var(--border-color);border-radius:8px;font-family:inherit;font-size:0.87rem;background:var(--card-bg);color:var(--text);">${project.description || ""}</textarea>
			<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
				<button class="btn-primary btn-sm" onclick="(function(){
					const val = document.getElementById('pjDescEdit').value;
					DataManager.update('projects', ${projectId}, { description: val });
					ProjectsModule.openDetailModal(${projectId});
				})()">Sauvegarder</button>
				<button class="btn-secondary btn-sm" onclick="ProjectsModule.openDetailModal(${projectId});">Annuler</button>
			</div>
		`;
		document.getElementById("pjDescEdit")?.focus();
	},

	addComment(projectId) {
		const input = document.getElementById("pjCommentInput");
		if (!input) return;
		const text = input.value.trim();
		if (!text) return;
		const currentUser =
			typeof Auth !== "undefined" ? Auth.getCurrentUser() : null;
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const comments = [...(project.comments || [])];
		comments.push({
			text,
			userId: currentUser ? currentUser.id : null,
			userName: currentUser ? currentUser.name : "Anonyme",
			userAvatar: currentUser
				? currentUser.avatar || "\u{1F464}"
				: "\u{1F464}",
			createdAt: new Date().toISOString(),
		});
		DataManager.update("projects", projectId, { comments });
		input.value = "";
		this.openDetailModal(projectId);
		this.switchProjectTab("notes");
	},

	deleteComment(projectId, idx) {
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const comments = [...(project.comments || [])];
		comments.splice(idx, 1);
		DataManager.update("projects", projectId, { comments });
		this.openDetailModal(projectId);
		this.switchProjectTab("notes");
	},

	editComment(projectId, idx) {
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const comment = (project.comments || [])[idx];
		if (!comment) return;
		const textEl = document.getElementById(`pj-comment-text-${idx}`);
		if (!textEl) return;
		const original = comment.text;
		const editHtml = `<textarea class="pj-comment-input" id="pj-edit-input-${idx}" rows="2" style="margin:0.3rem 0;">${original}</textarea>
			<div style="display:flex;gap:0.5rem;margin-top:0.3rem;">
				<button class="pj-comment-btn" onclick="(function(){
					const val = document.getElementById('pj-edit-input-${idx}').value.trim();
					if (!val) return;
					const p = DataManager.findById('projects', ${projectId});
					const c = [...(p.comments || [])];
					c[${idx}] = {...c[${idx}], text: val};
					DataManager.update('projects', ${projectId}, { comments: c });
					ProjectsModule.openDetailModal(${projectId});
					ProjectsModule.switchProjectTab('notes');
				})()">Sauvegarder</button>
				<button class="pj-comment-btn" onclick="ProjectsModule.openDetailModal(${projectId}); ProjectsModule.switchProjectTab('notes');">Annuler</button>
			</div>`;
		textEl.outerHTML = editHtml;
	},

	// Open edit modal from the detail modal
	editFromDetail() {
		this.closeDetailModal();
		if (this.editingProjectId) {
			this.openEditModal(this.editingProjectId);
		}
	},

	// Scoped styles

	getStyles() {
		return `
			/* Page layout */
			.projects-page {
				animation: fadeIn 0.3s ease;
			}

			/* Controls bar */
			.projects-controls {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 1rem;
				flex-wrap: wrap;
				margin-top: 0.25rem;
				margin-bottom: 1rem;
			}

			.projects-controls-left {
				display: flex;
				align-items: center;
				gap: 0.75rem;
				flex-wrap: wrap;
				flex: 1;
			}

			.projects-search-wrap {
				position: relative;
				flex: 1;
				max-width: 300px;
				min-width: 180px;
			}

			.projects-search-icon {
				position: absolute;
				left: 0.75rem;
				top: 50%;
				transform: translateY(-50%);
				color: var(--text-muted);
				display: flex;
				align-items: center;
				pointer-events: none;
			}

			.projects-filter-select {
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

			.projects-filter-select:focus {
				outline: none;
				border-color: var(--primary);
				box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
			}

			/* Cards grid */
			.projects-card-grid {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 1.25rem;
			}

			/* Single card */
			.projects-card {
				display: flex;
				flex-direction: column;
				padding: 0;
				overflow: hidden;
				transition: transform 0.2s ease, box-shadow 0.2s ease;
			}

			.projects-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
			}

			.projects-card-clickable {
				padding: 1.25rem;
				cursor: pointer;
				flex: 1;
			}

			.projects-card-top {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 0.75rem;
			}

			.projects-card-emoji {
				font-size: 1.8rem;
				line-height: 1;
			}

			.projects-card-name {
				font-size: 1rem;
				font-weight: 700;
				color: var(--text);
				margin: 0 0 0.35rem 0;
				line-height: 1.3;
			}

			.projects-card-desc {
				font-size: 0.82rem;
				color: var(--text-muted);
				margin: 0 0 1rem 0;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
				line-height: 1.5;
			}

			/* Progress bar on card */
			.projects-card-progress {
				margin-bottom: 0.85rem;
			}

			.projects-card-progress-header {
				display: flex;
				justify-content: space-between;
				font-size: 0.78rem;
				color: var(--text-muted);
				margin-bottom: 0.35rem;
				font-weight: 500;
			}

			.projects-card-progress-bar {
				width: 100%;
				height: 6px;
				background: var(--bg-alt, #e9ecef);
				border-radius: 4px;
				overflow: hidden;
			}

			.projects-card-progress-fill {
				height: 100%;
				background: linear-gradient(90deg, #bfdbfe 0%, #3b82f6 55%, #1d4ed8 100%);
				border-radius: 4px;
				transition: width 0.4s ease;
			}

			/* Card meta row */
			.projects-card-meta {
				display: flex;
				gap: 1rem;
				flex-wrap: wrap;
				margin-bottom: 0.75rem;
			}

			.projects-card-meta-item {
				display: flex;
				align-items: center;
				gap: 0.35rem;
				font-size: 0.78rem;
				color: var(--text-muted);
			}

			.projects-card-meta-item svg {
				flex-shrink: 0;
			}

			/* Member avatars on card */
			.projects-card-avatars {
				display: flex;
				align-items: center;
				gap: 0;
				margin-top: 0.25rem;
			}

			.projects-card-avatar {
				width: 30px;
				height: 30px;
				border-radius: 50%;
				background: var(--primary-light);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 0.85rem;
				margin-right: -8px;
				border: 2px solid var(--card-bg);
				position: relative;
			}

			.projects-card-avatar-more {
				width: 30px;
				height: 30px;
				border-radius: 50%;
				background: var(--bg-alt);
				color: var(--text-muted);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 0.7rem;
				font-weight: 700;
				border: 2px solid var(--card-bg);
			}

			/* Card action buttons row */
			.projects-card-actions {
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: 0.35rem;
				padding: 0.6rem 1rem;
				border-top: 1px solid var(--border-color);
				background: var(--bg-alt, #f8f9fa);
			}

			/* Detail modal */
			.projects-detail-status {
				margin-bottom: 1rem;
			}

			.projects-detail-description {
				color: var(--text-secondary);
				font-size: 0.9rem;
				line-height: 1.6;
				margin-bottom: 1.5rem;
			}

			.projects-detail-grid {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 1rem;
				margin-bottom: 1.5rem;
			}

			.projects-detail-item {
				padding: 0.85rem;
				background: var(--bg-alt);
				border-radius: var(--radius-sm);
			}

			.projects-detail-label {
				display: flex;
				align-items: center;
				gap: 0.4rem;
				font-size: 0.78rem;
				font-weight: 600;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.03em;
				margin-bottom: 0.35rem;
			}

			.projects-detail-value {
				font-size: 0.9rem;
				font-weight: 500;
				color: var(--text);
			}

			.projects-detail-section {
				margin-top: 1.5rem;
			}

			.projects-detail-team {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				margin-top: 0.5rem;
			}

			.projects-detail-team-member {
				display: flex;
				align-items: center;
				gap: 0.6rem;
				padding: 0.5rem 0.75rem;
				background: var(--bg-alt);
				border-radius: var(--radius-sm);
				font-size: 0.88rem;
				font-weight: 500;
				color: var(--text);
			}

			/* Form modal - members checkboxes */
			.projects-members-checkboxes {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				max-height: 200px;
				overflow-y: auto;
				padding: 0.5rem 0;
			}

			.projects-member-checkbox {
				display: flex;
				align-items: center;
				gap: 0.6rem;
				padding: 0.45rem 0.65rem;
				border-radius: var(--radius-sm);
				cursor: pointer;
				font-size: 0.88rem;
				color: var(--text);
				transition: background 0.15s ease;
			}

			.projects-member-checkbox:hover {
				background: var(--bg-alt);
			}

			.projects-member-checkbox input[type="checkbox"] {
				accent-color: var(--primary);
				width: 16px;
				height: 16px;
				cursor: pointer;
			}

			.projects-member-avatar {
				font-size: 1.1rem;
			}

			/* Progress slider in form */
			.projects-slider {
				width: 100%;
				height: 6px;
				-webkit-appearance: none;
				appearance: none;
				background: var(--bg-alt);
				border-radius: 4px;
				outline: none;
				cursor: pointer;
			}

			.projects-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 18px;
				height: 18px;
				background: var(--primary);
				border-radius: 50%;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
			}

			.projects-slider::-moz-range-thumb {
				width: 18px;
				height: 18px;
				background: var(--primary);
				border-radius: 50%;
				cursor: pointer;
				border: 2px solid white;
				box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
			}

			/* Responsive layout */
			@media (max-width: 1024px) {
				.projects-card-grid {
					grid-template-columns: repeat(2, 1fr);
				}
			}

			@media (max-width: 768px) {
				.projects-controls {
					flex-direction: column;
					align-items: stretch;
				}

				.projects-controls-left {
					flex-direction: column;
				}

				.projects-search-wrap {
					max-width: 100%;
				}

				.projects-filter-select {
					min-width: 100%;
				}

				.projects-card-grid {
					grid-template-columns: 1fr;
				}

				.projects-detail-grid {
					grid-template-columns: 1fr;
				}
			}

			/* ── Two-col modal layout ───────────────────────── */
			.projects-modal-cols {
				display: grid;
				grid-template-columns: 260px 1fr;
				gap: 1.5rem;
				min-height: 0;
			}
			.projects-modal-left {
				display: flex;
				flex-direction: column;
				gap: 0;
				background: var(--bg-alt, #ede9e0);
				border: 1.5px solid var(--border-color, #ddd8ce);
				border-radius: 10px;
				padding: 0 1rem;
				align-self: start;
			}
			.pj-prop {
				padding: 0.75rem 0;
				border-bottom: 1px solid var(--border-light);
			}
			.pj-prop:last-of-type { border-bottom: none; }
			.pj-prop-label {
				display: flex;
				align-items: center;
				gap: 0.35rem;
				font-size: 0.72rem;
				font-weight: 700;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.05em;
				margin-bottom: 0.35rem;
			}
			.pj-prop-value { font-size: 0.88rem; color: var(--text); }
			.pj-prop-actions {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				margin-top: auto;
				padding-top: 1rem;
			}
			.pj-description-box {
				padding: 0.85rem 1rem;
				background: var(--bg-alt, #f0ede8);
				border: 1.5px solid var(--border-color, #ddd8d0);
				border-radius: 10px;
				margin-bottom: 1rem;
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
			}
			.pj-desc-text { font-size: 0.875rem; color: var(--text-secondary, #555550); line-height: 1.7; white-space: pre-wrap; margin: 0; }
			.pj-desc-edit-btn {
				align-self: flex-start;
				padding: 0.3rem 0.75rem;
				border: 1.5px solid var(--warning, #d97706);
				border-radius: 7px;
				background: var(--warning, #d97706);
				color: #fff;
				font-size: 0.78rem;
				font-weight: 600;
				font-family: inherit;
				cursor: pointer;
				box-shadow: 2px 2px 0 0 #92400e;
				transition: all 0.12s ease;
			}
			.pj-desc-edit-btn:hover {
				background: #b45309;
				border-color: #b45309;
				transform: translate(-1px,-1px);
				box-shadow: 3px 3px 0 0 #92400e;
			}
			.pj-desc-edit-btn:active {
				transform: translate(1px,1px);
				box-shadow: 1px 1px 0 0 #92400e;
			}
			.pj-description-panel { padding: 0.5rem 0; display: flex; flex-direction: column; }
			.pj-member-chip {
				display: inline-flex;
				align-items: center;
				gap: 0;
				padding: 0.25rem 0.55rem;
				background: var(--bg-alt);
				border-radius: var(--radius-sm);
				font-size: 0.8rem;
			}
			/* ── Modal tabs ──────────────────────────────────── */
			.projects-modal-right { display: flex; flex-direction: column; min-height: 0; }
			.modal-tabs {
				display: flex;
				gap: 0.25rem;
				border-bottom: 1.5px solid var(--border-light);
				margin-bottom: 1rem;
				padding-bottom: 0;
			}
			.modal-tab {
				padding: 0.5rem 0.9rem;
				background: none;
				border: none;
				border-bottom: 2.5px solid transparent;
				margin-bottom: -1.5px;
				font-size: 0.83rem;
				font-weight: 600;
				color: var(--text-muted);
				cursor: pointer;
				transition: color 0.15s, border-color 0.15s;
				font-family: inherit;
			}
			.modal-tab:hover { color: var(--text); }
			.modal-tab.active { color: var(--text); border-bottom-color: var(--text); }
			.modal-tab-panel { display: none; flex: 1; overflow-y: auto; }
			.modal-tab-panel.active { display: flex; flex-direction: column; }
			/* ── Vertical timeline ───────────────────────────── */
			.pj-timeline { display: flex; flex-direction: column; padding: 0.25rem 0; }
			.pj-timeline-item {
				display: flex;
				gap: 0.85rem;
				position: relative;
				padding-bottom: 1.1rem;
			}
			.pj-timeline-item::before {
				content: "";
				position: absolute;
				left: 6.5px;
				top: 14px;
				bottom: 0;
				width: 1.5px;
				background: var(--border-light);
			}
			.pj-timeline-item.last::before { display: none; }
			.pj-timeline-dot {
				width: 14px;
				height: 14px;
				min-width: 14px;
				border-radius: 50%;
				background: var(--card-bg);
				border: 2px solid var(--text-muted);
				margin-top: 1px;
				z-index: 1;
				position: relative;
			}
			.pj-timeline-content { flex: 1; }
			.pj-timeline-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.2rem; }
			.pj-timeline-action { font-size: 0.85rem; font-weight: 600; color: var(--text); }
			.pj-timeline-user { display: flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
			.pj-timeline-detail { font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0.25rem; line-height: 1.5; }
			.pj-timeline-time { font-size: 0.72rem; color: var(--text-muted); }
			/* ── Comments ────────────────────────────────────── */
			.pj-comments-wrap { display: flex; flex-direction: column; height: 100%; gap: 0; }
			.pj-comments-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 0.75rem; }
			.pj-comment { display: flex; gap: 0.75rem; align-items: flex-start; }
			.pj-comment-avatar { font-size: 1.5rem; line-height: 1; flex-shrink: 0; margin-top: 0.1rem; }
			.pj-comment-body { flex: 1; background: var(--bg-alt); border-radius: var(--radius); padding: 0.6rem 0.85rem; border: 1px solid var(--border-light); }
			.pj-comment-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem; }
			.pj-comment-author { font-size: 0.82rem; font-weight: 700; color: var(--text); }
			.pj-comment-time { font-size: 0.72rem; color: var(--text-muted); }
			.pj-comment-text { font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55; }
			.pj-comment-actions { display: flex; gap: 0.5rem; margin-top: 0.4rem; }
			.pj-comment-btn {
				background: none;
				border: none;
				font-size: 0.72rem;
				color: var(--text-muted);
				cursor: pointer;
				padding: 0;
				font-family: inherit;
				transition: color 0.12s;
			}
			.pj-comment-btn:hover { color: var(--text); }
			.pj-comment-btn.danger:hover { color: var(--danger); }
			.pj-comment-input {
				width: 100%;
				padding: 0.6rem 0.85rem;
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius);
				background: var(--card-bg);
				color: var(--text);
				font-family: inherit;
				font-size: 0.88rem;
				line-height: 1.55;
				resize: vertical;
				box-sizing: border-box;
			}
			.pj-comment-input:focus { outline: none; border-color: var(--text); }
			.pj-comment-compose {
				padding-top: 0.75rem;
				border-top: 1.5px solid var(--border-light);
				display: flex;
				flexDirection: column;
				gap: 0.5rem;
			}
			.pj-comment-compose .btn-primary { align-self: flex-end; margin-top: 0.4rem; }

			/* ── Inline prop editing ─────────────────────────────── */
			.pj-prop-editable {
				cursor: pointer;
				border-radius: 6px;
				padding: 0.25rem 0.4rem;
				margin: -0.25rem -0.4rem;
				transition: background 0.12s;
			}
			.pj-prop-editable:hover {
				background: var(--bg-alt, #e8e4de);
			}
			.pj-inline-select, .pj-inline-input {
				width: 100%;
				padding: 0.3rem 0.5rem;
				border: 1.5px solid var(--border-color, #ddd8d0);
				border-radius: 8px;
				background: var(--card-bg, #fafaf8);
				color: var(--text, #191917);
				font-size: 0.85rem;
				font-family: inherit;
				outline: none;
			}
			.pj-inline-select:focus, .pj-inline-input:focus {
				border-color: var(--text, #191917);
			}
		`;
	},

	editProjectProp(field, projectId, el) {
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const data = DataManager.getData();

		// Close any existing inline dropdowns
		document
			.querySelectorAll(".pj-prop-dropdown")
			.forEach((d) => d.remove());

		// El becomes the anchor for the dropdown
		el.style.position = "relative";

		let menuHTML = "";
		const checkSVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

		if (field === "status") {
			const options = [
				{ v: "active", l: "En cours", dotClass: "active" },
				{ v: "paused", l: "En pause", dotClass: "paused" },
				{ v: "completed", l: "Termin\u00e9", dotClass: "completed" },
				{ v: "cancelled", l: "Annul\u00e9", dotClass: "cancelled" },
			];
			menuHTML = options
				.map(
					(o) => `
				<div class="filter-menu-item${project.status === o.v ? " selected" : ""}"
				     onclick="ProjectsModule.saveProjectProp('status', ${projectId}, '${o.v}'); document.querySelectorAll('.pj-prop-dropdown').forEach(d=>d.remove())">
					<span class="filter-status-dot ${o.dotClass}"></span>
					<span class="filter-menu-item-label">${o.l}</span>
					<span class="filter-check">${project.status === o.v ? checkSVG : ""}</span>
				</div>`,
				)
				.join("");
		} else if (field === "priority") {
			const options = [
				{ v: "low", l: "Basse", dotClass: "low" },
				{ v: "medium", l: "Moyenne", dotClass: "medium" },
				{ v: "high", l: "Haute", dotClass: "high" },
			];
			menuHTML = options
				.map(
					(o) => `
				<div class="filter-menu-item${project.priority === o.v ? " selected" : ""}"
				     onclick="ProjectsModule.saveProjectProp('priority', ${projectId}, '${o.v}'); document.querySelectorAll('.pj-prop-dropdown').forEach(d=>d.remove())">
					<span class="filter-priority-dot ${o.dotClass}"></span>
					<span class="filter-menu-item-label">${o.l}</span>
					<span class="filter-check">${project.priority === o.v ? checkSVG : ""}</span>
				</div>`,
				)
				.join("");
		} else if (field === "dueDate") {
			const currentVal = project.dueDate || project.deadline || "";
			const menu = document.createElement("div");
			menu.className = "pj-prop-dropdown filter-menu";
			menu.style.cssText =
				"position:absolute;z-index:9999;min-width:180px;opacity:1;visibility:visible;transform:none;top:calc(100% + 4px);left:0;padding:0.75rem;";
			menu.innerHTML = `<input type="date" class="pj-inline-input" value="${currentVal}" style="width:100%"
				onchange="ProjectsModule.saveProjectProp('dueDate', ${projectId}, this.value); document.querySelectorAll('.pj-prop-dropdown').forEach(d=>d.remove())">`;
			el.appendChild(menu);
			menu.querySelector("input")?.focus();
			setTimeout(() => {
				document.addEventListener("click", function handler(e) {
					if (!el.contains(e.target)) {
						menu.remove();
						document.removeEventListener("click", handler);
					}
				});
			}, 50);
			return;
		} else if (field === "assigneeId") {
			const activeUsers = (data.users || []).filter((u) => u.active);
			const unassigned = [
				{ id: "", name: "Non assigné", avatar: "—" },
			];
			const buildUserItem = (u) => `
			<div class="filter-menu-item${project.assigneeId === u.id || (!project.assigneeId && u.id === "") ? " selected" : ""}"
			     onclick="ProjectsModule.saveProjectProp('assigneeId', ${projectId}, ${u.id === "" ? "null" : u.id}); document.querySelectorAll('.pj-prop-dropdown').forEach(d=>d.remove())">
				<span class="filter-user-avatar" style="font-size:0.75rem;">${u.avatar || u.name?.[0] || "?"}</span>
				<span class="filter-menu-item-label">${u.name}</span>
				<span class="filter-check">${project.assigneeId === u.id || (!project.assigneeId && u.id === "") ? checkSVG : ""}</span>
			</div>`;
			menuHTML = unassigned.map(buildUserItem).join("") +
				'<div class="filter-menu-divider"></div>' +
				activeUsers.map(buildUserItem).join("");
		}

		if (!menuHTML) return;

		const menu = document.createElement("div");
		menu.className = "pj-prop-dropdown filter-menu";
		menu.style.cssText =
			"position:absolute;z-index:9999;min-width:180px;opacity:1;visibility:visible;transform:none;top:calc(100% + 4px);left:0;";
		menu.innerHTML = menuHTML;
		el.appendChild(menu);

		setTimeout(() => {
			document.addEventListener("click", function handler(e) {
				if (!el.contains(e.target)) {
					menu.remove();
					document.removeEventListener("click", handler);
				}
			});
		}, 50);
	},

	saveProjectProp(field, projectId, value) {
		const project = DataManager.findById("projects", projectId);
		if (!project) return;
		const currentUser = Auth.getCurrentUser();
		DataManager.update("projects", projectId, { [field]: value });
		if (window.DataManager && DataManager.addLog) {
			DataManager.addLog(
				"Modification projet",
				`${project.name}: ${field} modifi\u00e9`,
				currentUser?.id,
			);
		}
		this.openDetailModal(projectId);
	},
};

window.ProjectsModule = ProjectsModule;
